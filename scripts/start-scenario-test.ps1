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

# 优先使用项目内免 npm 运行时副本（默认接入方式）；副本缺失且 npm 包可用时才回退 npx（npm 接入方式）
$runtimeCli = Join-Path $configDir ".scenario-test/scenario-test-cli.cjs"
$useNpmFallback = -not (Test-Path -LiteralPath $runtimeCli -PathType Leaf)

Push-Location $projectRoot
try {
    Write-Host "配置文件: $configPath" -ForegroundColor DarkGray
    if ($Port -gt 0) {
        Write-Host "工作台端口: $Port（会写入项目登记）" -ForegroundColor DarkGray
    } else {
        Write-Host "工作台端口: 复用项目登记（首次从默认端口起分配）" -ForegroundColor DarkGray
    }

    if ($useNpmFallback) {
        Write-Host "未找到运行时副本 $runtimeCli，回退 npm 模式启动" -ForegroundColor Yellow
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
