[CmdletBinding()]
param(
    [string]$Project = ".",
    [string]$Config = "scenario-test/scenario.config.js",
    [ValidateRange(0, 65535)]
    [int]$Port = 0,
    [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path -LiteralPath $Project).Path
$configPath = if ([System.IO.Path]::IsPathRooted($Config)) {
    $Config
} else {
    Join-Path $projectRoot $Config
}
$configDir = Split-Path -Parent $configPath

if (-not (Test-Path -LiteralPath $configPath -PathType Leaf)) {
    throw "配置文件不存在: $configPath"
}

# 未显式指定 -Port 时不再自行申请随机端口：交给 serve 复用用户级项目登记中的固定端口
# （首次自动分配），与项目内 start-scenario-test.cmd 保持一致。否则每次启动都会用
# --port 覆盖该项目的登记端口，多项目“固定端口”失效。
$serveArgs = @("serve", "--config", $configPath)
if ($Port -gt 0) { $serveArgs += @("--port", "$Port") }
if ($OpenBrowser) { $serveArgs += "--open" }

# 优先使用用户级安装方运行时（v23 起运行时去项目化，项目内不落副本）；
# 其次兼容旧版项目内 .scenario-test/ 副本，最后才回退 npx（冻结 npm 包）
$userRuntimeCli = Join-Path $env:USERPROFILE ".scenario-test\runtime\scenario-test-cli.cjs"
$legacyCli = Join-Path $configDir ".scenario-test/scenario-test-cli.cjs"
$runtimeCli = if (Test-Path -LiteralPath $userRuntimeCli -PathType Leaf) { $userRuntimeCli }
    elseif (Test-Path -LiteralPath $legacyCli -PathType Leaf) { $legacyCli }
    else { $null }
$useNpmFallback = $null -eq $runtimeCli

Push-Location $projectRoot
try {
    Write-Host "配置文件: $configPath" -ForegroundColor DarkGray
    if ($Port -gt 0) {
        Write-Host "工作台端口: $Port（会写入项目登记）" -ForegroundColor DarkGray
    } else {
        Write-Host "工作台端口: 复用项目登记（首次从默认端口起分配）" -ForegroundColor DarkGray
    }

    if ($useNpmFallback) {
        Write-Host "未找到安装方运行时（$userRuntimeCli）或旧版项目副本，回退 npm 模式启动" -ForegroundColor Yellow
        & npx.cmd --no-install "@yc_yzkj/scenario-test" @serveArgs
    } else {
        & node "$runtimeCli" @serveArgs
    }
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
} finally {
    Pop-Location
}
