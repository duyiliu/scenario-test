#!/usr/bin/env pwsh
<#
.SYNOPSIS
    一键安装 scenario-test 到业务项目

.DESCRIPTION
    免 npm 安装：按固定版本从 GitHub Release 下载整包运行时
    （scenario-test-runtime-v<版本>.tar.gz）到用户级版本目录
    %USERPROFILE%.scenario-test\runtime\<版本>\；业务项目只落场景数据
    （config/README/cmd），不安装 npm 包、不改 package.json、不留运行时副本。
    指定 -Source 时改用内网目录（需含同名 tar.gz 与 .sha256）。

.PARAMETER ProjectDir
    业务项目根目录，默认为当前目录

.PARAMETER TargetDir
    场景测试目录名称，默认为 scenario-test

.PARAMETER SkipDoctor
    跳过健康检查

.PARAMETER Source
    可选的内网制品目录，需包含 scenario-test-runtime-v<版本>.tar.gz 及同名
    .sha256。不指定时从 GitHub Release 下载。
    指定后若该目录没有 .sha256，安装脚本会跳过整包校验并给出警告（包内
    release.json 的逐文件校验仍会执行）。

.EXAMPLE
    .\install.ps1
    .\install.ps1 -ProjectDir D:\myproject -TargetDir "dev/场景测试"
    .\install.ps1 -Source "https://nexus.example.com/repository/scenario-test/v0.16.0"
    irm https://raw.githubusercontent.com/duyiliu/scenario-test/v0.16.0/scripts/install.ps1 | iex
#>

param(
    [string]$ProjectDir = ".",
    [string]$TargetDir = "scenario-test",
    [switch]$SkipDoctor,
    [string]$Source = ""
)

$ErrorActionPreference = "Stop"
$ScenarioTestVersion = "0.16.0"
$ArchiveName = "scenario-test-runtime-v$ScenarioTestVersion.tar.gz"
$DefaultSource = "https://github.com/duyiliu/scenario-test/releases/download/v$ScenarioTestVersion"

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
    # v24 起发布物是整包：下载 tar.gz → 校验 sidecar → 解压到版本目录。
    # 同一份包也被 Skill 的 ensure-runtime.mjs 消费，两个入口落到同一个 <版本>/ 目录。
    $runtimeRoot = Join-Path $env:USERPROFILE ".scenario-test\runtime"
    $runtimeDir = Join-Path $runtimeRoot $ScenarioTestVersion

    $downloadSource = if ($Source) { $Source.TrimEnd('/') } else { $DefaultSource }
    $archiveUrl = "$downloadSource/$ArchiveName"
    Write-Info "下载运行时发布包：$archiveUrl ..."
    $archivePath = Join-Path $tempRoot $ArchiveName
    try {
        Invoke-WebRequest -Uri $archiveUrl -OutFile $archivePath -UseBasicParsing
    } catch {
        throw "运行时发布包下载失败: $archiveUrl`n$_`n可改用 -Source 指向内网制品目录，或手动放置该包后重试。"
    }

    # 整包完整性（#120 升级）：先核对 sidecar 里的 SHA-256。这层挡住传输损坏与
    # 伪造字节；解压后再用包内 release.json 逐文件核对（挡住包内被替换的情形）。
    $checksumUrl = "$archiveUrl.sha256"
    $expectedArchiveHash = $null
    try {
        $checksumText = (Invoke-WebRequest -Uri $checksumUrl -UseBasicParsing).Content
        if ($checksumText -is [byte[]]) { $checksumText = [Text.Encoding]::UTF8.GetString($checksumText) }
        $expectedArchiveHash = ($checksumText -split '\s+')[0].Trim().ToLower()
    } catch {
        if ($Source) {
            Write-Warning-Custom "未获取到 $ArchiveName.sha256，跳过整包校验（自定义源：$Source）"
        } else {
            throw "无法获取发布包校验文件：$checksumUrl（请检查网络后重试）"
        }
    }
    if ($expectedArchiveHash) {
        $actualArchiveHash = (Get-FileHash -Path $archivePath -Algorithm SHA256).Hash.ToLower()
        if ($actualArchiveHash -ne $expectedArchiveHash) {
            throw "运行时发布包校验失败`n期望 $expectedArchiveHash`n实际 $actualArchiveHash"
        }
        Write-Success "发布包 SHA-256 校验通过"
    }

    $stageDir = Join-Path $tempRoot "runtime"
    New-Item -ItemType Directory -Path $stageDir | Out-Null
    try {
        tar -xzf "$archivePath" -C "$stageDir"
        if ($LASTEXITCODE -ne 0) { throw "tar 解压退出码 $LASTEXITCODE" }
    } catch {
        throw "运行时发布包解压失败：$_"
    }

    # 包内 release.json 是逐文件的发布清单，与包一起签名（sidecar 覆盖整包）。
    $manifestPath = Join-Path $stageDir "release.json"
    if (-not (Test-Path $manifestPath -PathType Leaf)) {
        throw "运行时发布包缺少 release.json，拒绝安装"
    }
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    if ($manifest.version -and $manifest.version -ne $ScenarioTestVersion) {
        throw "release.json 版本不匹配: $($manifest.version) != $ScenarioTestVersion"
    }
    foreach ($fileName in @("scenario-test-cli.cjs", "scenario-test.umd.js", "scenario-test.d.ts", "scenario-test-capabilities.json", "AI_SCENARIO_PROMPT.md", "SCENARIO_PATTERNS.md")) {
        $property = $manifest.sha256.PSObject.Properties[$fileName]
        $want = if ($property) { [string]$property.Value } else { "" }
        if (-not $want) { throw "release.json 缺少 $fileName 的 SHA256" }
        if (-not (Test-Path (Join-Path $stageDir $fileName) -PathType Leaf)) {
            throw "运行时发布包缺少文件：$fileName"
        }
        $actual = (Get-FileHash -Path (Join-Path $stageDir $fileName) -Algorithm SHA256).Hash
        if ($actual.ToLower() -ne $want.ToLower()) {
            throw "运行时文件校验失败: $fileName`n期望 $want`n实际 $actual"
        }
    }
    Write-Success "包内 6 个运行时文件 SHA-256 校验通过"

    # 校验通过后才写入版本目录：失败不影响在用安装，半成品不会留在目标位置。
    if (Test-Path $runtimeDir) { Remove-Item $runtimeDir -Recurse -Force }
    New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
    Get-ChildItem $stageDir -File | Copy-Item -Destination $runtimeDir -Force
    Write-Success "运行时就绪：$runtimeDir"

    Write-Info "初始化场景测试目录：$fullTargetPath ..."
    $tempCli = Join-Path $runtimeDir "scenario-test-cli.cjs"

    # --no-input：目录已存在时按 keep（保留配置与场景），
    # 避免 install 脚本在"已存在"时进入被捕获输出吞掉的交互确认而静默卡死。
    # 实时回显 init 输出，避免长时间黑屏；stdin 喂 $null 让非交互判定稳定。
    $initOutput = Invoke-NativeCapture { node "$tempCli" init --project "$ProjectDir" --dir "$TargetDir" --no-input 2>&1 |
        ForEach-Object { Write-Host $_ -ForegroundColor Gray; $_ } }
    if ($LASTEXITCODE -ne 0) {
        throw "init 命令失败`n$initOutput"
    }
    Write-Success "初始化完成"

    # 5. 检查生成的文件（v23：项目只落场景数据，不验证 .scenario-test 副本）
    Write-Info "验证生成的文件..."
    $expectedFiles = @(
        "README.md",
        "scenario.config.js",
        "start-scenario-test.cmd"
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

    if (-not $allFilesExist) {
        throw "初始化结果验证失败"
    }

    # 6. 执行 doctor 健康检查
    if (-not $SkipDoctor) {
        Write-Info "`n执行健康检查..."

        $configPath = Join-Path $fullTargetPath "scenario.config.js"
        $doctorOutput = Invoke-NativeCapture { node (Join-Path $runtimeDir "scenario-test-cli.cjs") doctor --config "$configPath" 2>&1 }
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
$cliRelative = Join-Path $runtimeDir "scenario-test-cli.cjs"
$rulesPath = Join-Path $runtimeDir "AI_SCENARIO_PROMPT.md"

Write-Host "`n📖 接下来的步骤：`n"

Write-Host "1. 使用 AI 生成场景测试（推荐）：" -ForegroundColor Yellow
Write-Host "   复制以下内容到 AI 助手（Claude/ChatGPT）：`n" -ForegroundColor Gray
Write-Host "   请读取 $rulesPath，" -ForegroundColor Cyan
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
Write-Host "   README:   $relativeTargetDir/README.md" -ForegroundColor Cyan
Write-Host "   Browser:  start-scenario-test.cmd 双击启动" -ForegroundColor Cyan
Write-Host "   AI规则:   $rulesPath`n" -ForegroundColor Cyan

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Green
