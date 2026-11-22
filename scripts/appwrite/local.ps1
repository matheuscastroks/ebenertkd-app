param([ValidateSet("up", "stop", "status")][string]$Action = "status")
$ErrorActionPreference = "Stop"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$compose = Join-Path $root ".local\appwrite\docker-compose.yml"
if (!(Test-Path -LiteralPath $compose)) { throw "Instancia local ausente. Consulte docs/development/appwrite-local.md." }
$docker = (Get-Command docker -ErrorAction SilentlyContinue).Source
if (!$docker) { $docker = Join-Path $env:LOCALAPPDATA "Programs\DockerDesktop\resources\bin\docker.exe" }
$arguments = @("compose", "--project-name", "ebenertkd-local", "--project-directory", (Split-Path $compose), "-f", $compose)
switch ($Action) {
  "up" { & $docker @arguments up -d }
  "stop" { & $docker @arguments stop }
  "status" { & $docker @arguments ps }
}
exit $LASTEXITCODE
