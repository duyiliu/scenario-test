#!/usr/bin/env pwsh
<#
.SYNOPSIS
    一键安装 scenario-test 到业务项目

.DESCRIPTION
    免 npm 安装：按固定 GitHub Tag 从 jsDelivr 下载发布版 dist/ 运行时文件，
    放入临时目录后由 CLI 初始化；不安装 npm 包、不改 package.json。
    指定 -Source 时改用内网运行时目录（GitLab Raw 或制品目录）。
    运行时副本落到项目 .scenario-test/ 并执行健康检查。

.PARAMETER ProjectDir
    业务项目根目录，默认为当前目录

.PARAMETER TargetDir
    场景测试目录名称，默认为 scenario-test

.PARAMETER SkipDoctor
    跳过健康检查

.PARAMETER Source
    可选的内网运行时目录（GitLab Raw 或制品目录，需包含全部 4 个运行时文件）。
    不指定时按固定 GitHub Tag 从 jsDelivr 下载发布版 dist/。
    指定后若该目录没有 release.json，安装脚本会跳过 SHA-256 校验并给出警告；
    需要强制校验时用 SCENARIO_TEST_RELEASE_JSON 指向可信清单。

.EXAMPLE
    .\install.ps1
    .\install.ps1 -ProjectDir D:\myproject -TargetDir "dev/场景测试"
    .\install.ps1 -Source "https://gitlab.example.com/group/project/-/raw/v0.13.0/dist"
    irm https://cdn.jsdelivr.net/gh/duyiliu/scenario-test@v0.13.0/scripts/install.ps1 | iex
#>

param(
    [string]$ProjectDir = ".",
    [string]$TargetDir = "scenario-test",
    [switch]$SkipDoctor,
    [string]$Source = ""
)

$ErrorActionPreference = "Stop"
$ScenarioTestVersion = "0.13.0"
$DefaultSource = "https://cdn.jsdelivr.net/gh/duyiliu/scenario-test@v$ScenarioTestVersion/dist"
$RuntimeFiles = @(
    "scenario-test-cli.cjs",
    "scenario-test.umd.js",
    "scenario-test.d.ts",
    "scenario-test-capabilities.json"
)

# 颜色输出函数
function Write-Success { param([string]$Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Error-Custom { param([string]$Message) Write-Host "✗ $Message" -ForegroundColor Red }
function Write-Info { param([string]$Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }
function Write-Warning-Custom { param([string]$Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }

# Windows PowerShell 5.1（irm | iex 的常见宿主）下，$ErrorActionPreference=Stop 时原生命令的
# stderr 经 2>&1 重定向会被包装成 ErrorRecord 并直接中断脚本（NativeCommandError）——
# node/npm 输出任何 stderr（警告、进度）都会让安装中断。捕获期间临时降为 Continue，靠 $LASTEXITCODE 判定成败。
function Invoke-NativeCapture {
    param([scriptblock]$Command)
    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try { . $Command } finally { $ErrorActionPreference = $previous }
}

Write-Host "`n=== scenario-test 一键安装 ===" -ForegroundColor Magenta
Write-Host "模式: 免 npm 下载（GitHub Tag 固定版本）`n" -ForegroundColor Magenta

# 1. 检查 Node.js 版本
Write-Info "检查 Node.js 版本..."
try {
    $nodeVersionOutput = Invoke-NativeCapture { node -v 2>&1 }
    if ($LASTEXITCODE -ne 0) {
        throw "Node.js 未安装"
    }

    if ($nodeVersionOutput -match "v(\d+)\.(\d+)\.(\d+)") {
        $major = [int]$matches[1]
        $minor = [int]$matches[2]
        $patch = [int]$matches[3]

        if ($major -lt 22) {
            Write-Error-Custom "需要 Node.js 22+，当前版本：$nodeVersionOutput"
            Write-Info "请访问 https://nodejs.org/ 安装 Node.js 22+"
            exit 1
        }
        Write-Success "Node.js 版本检查通过：$nodeVersionOutput"
    } else {
        Write-Warning-Custom "无法解析 Node.js 版本：$nodeVersionOutput（继续安装）"
    }
} catch {
    Write-Error-Custom "Node.js 未安装或不在 PATH 中"
    Write-Info "请访问 https://nodejs.org/ 安装 Node.js 22+"
    exit 1
}

# 2. 检查项目目录并进入
if (-not (Test-Path $ProjectDir -PathType Container)) {
    Write-Error-Custom "项目目录不存在：$ProjectDir"
    exit 1
}
$ProjectDir = (Resolve-Path $ProjectDir -ErrorAction Stop).Path
Write-Info "项目目录：$ProjectDir"

$fullTargetPath = Join-Path $ProjectDir $TargetDir
$tempRoot = Join-Path $env:TEMP "scenario-test-install-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $tempRoot | Out-Null

Push-Location $ProjectDir
try {
    $runtimeDir = Join-Path $tempRoot "runtime"
    New-Item -ItemType Directory -Path $runtimeDir | Out-Null

    $downloadSource = if ($Source) { $Source.TrimEnd('/') } else { $DefaultSource }
    Write-Info "免 npm 安装模式，下载源：$downloadSource ..."
    foreach ($fileName in $RuntimeFiles) {
        $fileUrl = "$downloadSource/$fileName"
        try {
            Invoke-WebRequest -Uri $fileUrl -OutFile (Join-Path $runtimeDir $fileName) -UseBasicParsing
        } catch {
            throw "运行时文件下载失败: $fileUrl`n$_"
        }
    }

    foreach ($fileName in $RuntimeFiles) {
        if (-not (Test-Path (Join-Path $runtimeDir $fileName) -PathType Leaf)) {
            throw "下载内容不完整，缺少运行时文件：$fileName"
        }
    }

    # 完整性校验（#120）：下载文件必须与发布版 release.json 的 SHA-256 一致，
    # 否则 init 写入的版本锁只能证明"文件没变"，不能证明"文件就是发布产物"。
    # 清单默认取同一 Tag 的 Skill 运行时目录；内网源可用 -ReleaseManifest 或
    # 环境变量 SCENARIO_TEST_RELEASE_JSON 覆盖。
    $manifestCandidates = @()
    if ($env:SCENARIO_TEST_RELEASE_JSON) { $manifestCandidates += $env:SCENARIO_TEST_RELEASE_JSON }
    $manifestCandidates += "https://cdn.jsdelivr.net/gh/duyiliu/scenario-test@v$ScenarioTestVersion/skills/scenario-test/runtime/release.json"
    if ($Source) { $manifestCandidates += "$downloadSource/release.json" }
    $manifest = $null
    $manifestUsed = ""
    foreach ($candidate in $manifestCandidates) {
        try {
            $manifest = Invoke-RestMethod -Uri $candidate -UseBasicParsing
            $manifestUsed = $candidate
            break
        } catch {
            $manifest = $null
        }
    }
    if ($null -ne $manifest) {
        if ($manifest.version -and $manifest.version -ne $ScenarioTestVersion) {
            throw "release.json 版本不匹配: $($manifest.version) != $ScenarioTestVersion（$manifestUsed）"
        }
        foreach ($fileName in $RuntimeFiles) {
            $property = $manifest.sha256.PSObject.Properties[$fileName]
            $want = if ($property) { [string]$property.Value } else { "" }
            if (-not $want) {
                throw "release.json 缺少 $fileName 的 SHA256（$manifestUsed）"
            }
            $actual = (Get-FileHash -Path (Join-Path $runtimeDir $fileName) -Algorithm SHA256).Hash
            if ($actual.ToLower() -ne $want.ToLower()) {
                throw "运行时文件校验失败: $fileName`n期望 $want`n实际 $actual"
            }
        }
        Write-Success "运行时文件 SHA-256 校验通过"
    } elseif ($Source) {
        Write-Warning-Custom "未获取到 release.json，跳过哈希校验（自定义源：$Source）"
    } else {
        throw "无法获取发布版 release.json（$($manifestCandidates[0])），请检查网络后重试"
    }
    Write-Success "固定版本运行时下载成功"

    Write-Info "初始化场景测试目录：$fullTargetPath ..."
    $tempCli = Join-Path $runtimeDir "scenario-test-cli.cjs"

    # --no-input：目录已存在时按 keep（保留配置与场景，仅刷新 AI 规则和运行时），
    # 避免 install 脚本在"已存在"时进入被捕获输出吞掉的交互确认而静默卡死。
    # 实时回显 init 输出，避免长时间黑屏；stdin 喂 $null 让非交互判定稳定。
    $initOutput = Invoke-NativeCapture { node "$tempCli" init --project "$ProjectDir" --dir "$TargetDir" --no-input 2>&1 |
        ForEach-Object { Write-Host $_ -ForegroundColor Gray; $_ } }
    if ($LASTEXITCODE -ne 0) {
        throw "init 命令失败`n$initOutput"
    }
    Write-Success "初始化完成"

    # 5. 检查生成的文件
    Write-Info "验证生成的文件..."
    $expectedFiles = @(
        "README.md",
        "index.html",
        "scenario.config.js"
    )

    $internalDir = Join-Path $fullTargetPath ".scenario-test"
    $expectedInternalFiles = @(
        "AI_SCENARIO_PROMPT.md",
        "SCENARIO_PATTERNS.md",
        "scenario-test-cli.cjs",
        "scenario-test.umd.js",
        "scenario-test.d.ts",
        "scenario-test-capabilities.json",
        ".scenario-test-version.json"
    )

    $allFilesExist = $true
    foreach ($file in $expectedFiles) {
        $filePath = Join-Path $fullTargetPath $file
        if (Test-Path $filePath) {
            Write-Success "  $file"
        } else {
            Write-Warning-Custom "  $file (缺失)"
            $allFilesExist = $false
        }
    }

    if (Test-Path $internalDir) {
        Write-Success "  .scenario-test/ (AI 规则与运行时副本)"
        foreach ($file in $expectedInternalFiles) {
            $filePath = Join-Path $internalDir $file
            if (Test-Path $filePath) {
                Write-Success "    $file"
            } else {
                Write-Warning-Custom "    $file (缺失)"
                $allFilesExist = $false
            }
        }
    } else {
        Write-Error-Custom "  .scenario-test/ 目录不存在，请检查 init 输出"
        $allFilesExist = $false
    }

    if (-not $allFilesExist) {
        throw "初始化结果验证失败"
    }

    # 6. 执行 doctor 健康检查
    if (-not $SkipDoctor) {
        Write-Info "`n执行健康检查..."

        $configPath = Join-Path $fullTargetPath "scenario.config.js"
        $doctorOutput = Invoke-NativeCapture { node (Join-Path $internalDir "scenario-test-cli.cjs") doctor --config "$configPath" 2>&1 }
        $doctorExitCode = $LASTEXITCODE

        Write-Host $doctorOutput -ForegroundColor Gray

        if ($doctorExitCode -ne 0) {
            Write-Error-Custom "`n健康检查发现问题（退出码：$doctorExitCode）"
            Write-Info "请查看上面的错误信息并修复后重试"
            exit 1
        }
        Write-Success "`n健康检查通过"
    } else {
        Write-Warning-Custom "跳过健康检查"
    }
} catch {
    Write-Error-Custom "安装失败：$_"
    exit 1
} finally {
    Pop-Location
    Remove-Item $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}

# 7. 输出使用指南
Write-Host "`n" -NoNewline
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Success "安装成功！"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green

$relativeTargetDir = $TargetDir -replace '\\', '/'
$configRelative = "$relativeTargetDir/scenario.config.js"
$cliRelative = "$relativeTargetDir/.scenario-test/scenario-test-cli.cjs"

Write-Host "`n📖 接下来的步骤：`n"

Write-Host "1. 使用 AI 生成场景测试（推荐）：" -ForegroundColor Yellow
Write-Host "   复制以下内容到 AI 助手（Claude/ChatGPT）：`n" -ForegroundColor Gray
Write-Host "   请读取 $relativeTargetDir/.scenario-test/AI_SCENARIO_PROMPT.md，" -ForegroundColor Cyan
Write-Host "   为 `"<业务功能名称>`" 设计场景测试。" -ForegroundColor Cyan
Write-Host "   入口：<页面、Controller、接口或已有测试路径>`n" -ForegroundColor Cyan

Write-Host "2. 启动浏览器工作台（可视化调试）：" -ForegroundColor Yellow
Write-Host "   双击 $relativeTargetDir/start-scenario-test.cmd`n" -ForegroundColor Cyan

Write-Host "3. 命令行执行场景：" -ForegroundColor Yellow
Write-Host "   # 执行所有非 manual 场景" -ForegroundColor Gray
Write-Host "   node $cliRelative run --config $configRelative --env local --all`n" -ForegroundColor Cyan
Write-Host "   # 执行指定场景" -ForegroundColor Gray
Write-Host "   node $cliRelative run --config $configRelative --env local --scenario <场景ID>`n" -ForegroundColor Cyan

Write-Host "4. 文档位置：" -ForegroundColor Yellow
Write-Host "   README:  $relativeTargetDir/README.md" -ForegroundColor Cyan
Write-Host "   Browser: $relativeTargetDir/index.html" -ForegroundColor Cyan
Write-Host "   AI规则:  $relativeTargetDir/.scenario-test/AI_SCENARIO_PROMPT.md`n" -ForegroundColor Cyan

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Green
