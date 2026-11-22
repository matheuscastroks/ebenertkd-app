$ErrorActionPreference = "Stop"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $root
$destination = Join-Path $root ".local\appwrite"
New-Item -ItemType Directory -Force $destination | Out-Null
foreach ($name in @("docker-compose.yml", "clickhouse-config.xml", "clickhouse-init.sh")) {
  $target = Join-Path $destination $name
  if (!(Test-Path -LiteralPath $target)) { Copy-Item -LiteralPath (Join-Path $root "docker\appwrite\$name") -Destination $target }
}
$envPath = Join-Path $destination ".env"
if (!(Test-Path -LiteralPath $envPath)) {
  $content = [IO.File]::ReadAllText((Join-Path $root "docker\appwrite\.env.example"))
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  while ($content.Contains("__GENERATE__")) {
    $bytes = New-Object byte[] 32
    $generator.GetBytes($bytes)
    $secret = -join ($bytes | ForEach-Object { $_.ToString("x2") })
    $index = $content.IndexOf("__GENERATE__")
    $content = $content.Remove($index, 12).Insert($index, $secret)
  }
  $generator.Dispose()
  [IO.File]::WriteAllText($envPath, $content)
}
& (Join-Path $PSScriptRoot "local.ps1") up
exit $LASTEXITCODE
