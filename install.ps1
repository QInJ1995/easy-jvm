# Install sdkvm without a pre-existing Node.js.
# Usage: irm https://raw.githubusercontent.com/QInJ1995/sdkvm/main/install.ps1 | iex
# Requires a published GitHub Release with sdkvm.tgz and SHA256SUMS.
$ErrorActionPreference = 'Stop'

$RuntimeNode = if ($env:SDKVM_RUNTIME_NODE) { $env:SDKVM_RUNTIME_NODE } else { '22.20.0' }
$NodeDist = if ($env:SDKVM_NODE_DIST) { $env:SDKVM_NODE_DIST.TrimEnd('/') } else { 'https://nodejs.org/dist' }
$ReleaseBase = if ($env:SDKVM_RELEASE_BASE) { $env:SDKVM_RELEASE_BASE.TrimEnd('/') } else { 'https://github.com/QInJ1995/sdkvm/releases' }
# Align with CLI envOverride(SDKVM_HOME, JVM_HOME)
if ($env:SDKVM_HOME) {
  $Root = $env:SDKVM_HOME
} elseif ($env:JVM_HOME) {
  $Root = $env:JVM_HOME
} else {
  $Root = Join-Path $env:USERPROFILE '.sdkvm'
}
$BinDir = Join-Path $env:USERPROFILE '.local\bin'

# Prefer the machine arch under WOW64 (32-bit PowerShell on 64-bit Windows)
$procArch = $env:PROCESSOR_ARCHITECTURE
if ($env:PROCESSOR_ARCHITEW6432) { $procArch = $env:PROCESSOR_ARCHITEW6432 }
if ($procArch -eq 'ARM64') {
  $arch = 'arm64'
} elseif ($procArch -eq 'AMD64') {
  $arch = 'x64'
} else {
  throw "sdkvm: unsupported architecture $procArch"
}

$nodeName = "node-v$RuntimeNode-win-$arch"
$nodeArchive = "$nodeName.zip"
$tmpdir = Join-Path ([System.IO.Path]::GetTempPath()) ("sdkvm-install-" + [guid]::NewGuid().ToString('n'))
New-Item -ItemType Directory -Path $tmpdir | Out-Null

function Get-FileSha256([string]$path) {
  (Get-FileHash -Algorithm SHA256 -Path $path).Hash.ToLowerInvariant()
}

function Get-ExpectedHash([string]$sumsPath, [string]$fileName) {
  foreach ($line in Get-Content -Path $sumsPath) {
    if ($line -match '^([0-9a-fA-F]{64})\s+\*?(\S+)\s*$' -and $Matches[2] -eq $fileName) {
      return $Matches[1].ToLowerInvariant()
    }
  }
  return $null
}

# Remove a directory junction without following into the target (PS 5.x Remove-Item risk).
function Remove-Junction([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) { return }
  cmd.exe /c "rmdir `"$path`""
  if (Test-Path -LiteralPath $path) {
    throw "sdkvm: failed to remove junction $path"
  }
}

try {
  Write-Host "sdkvm: downloading Node.js $RuntimeNode (windows/$arch)"
  Invoke-WebRequest -Uri "$NodeDist/v$RuntimeNode/$nodeArchive" -OutFile (Join-Path $tmpdir $nodeArchive)
  Invoke-WebRequest -Uri "$NodeDist/v$RuntimeNode/SHASUMS256.txt" -OutFile (Join-Path $tmpdir 'SHASUMS256.txt')
  $expected = Get-ExpectedHash (Join-Path $tmpdir 'SHASUMS256.txt') $nodeArchive
  $actual = Get-FileSha256 (Join-Path $tmpdir $nodeArchive)
  if (-not $expected -or $expected -ne $actual) { throw 'sdkvm: Node.js checksum mismatch' }

  Write-Host 'sdkvm: downloading CLI'
  Invoke-WebRequest -Uri "$ReleaseBase/latest/download/sdkvm.tgz" -OutFile (Join-Path $tmpdir 'sdkvm.tgz')
  Invoke-WebRequest -Uri "$ReleaseBase/latest/download/SHA256SUMS" -OutFile (Join-Path $tmpdir 'SHA256SUMS')
  $expected = Get-ExpectedHash (Join-Path $tmpdir 'SHA256SUMS') 'sdkvm.tgz'
  $actual = Get-FileSha256 (Join-Path $tmpdir 'sdkvm.tgz')
  if (-not $expected -or $expected -ne $actual) { throw 'sdkvm: CLI checksum mismatch' }

  New-Item -ItemType Directory -Force -Path (Join-Path $Root 'runtime'), $BinDir | Out-Null
  $runtimeDir = Join-Path $Root 'runtime'
  if (Test-Path (Join-Path $runtimeDir $nodeName)) { Remove-Item -Recurse -Force (Join-Path $runtimeDir $nodeName) }
  tar -xf (Join-Path $tmpdir $nodeArchive) -C $runtimeDir
  $current = Join-Path $runtimeDir 'current'
  Remove-Junction $current
  New-Item -ItemType Junction -Path $current -Target (Join-Path $runtimeDir $nodeName) | Out-Null

  # Atomic CLI replace: extract + validate, then rename; restore bak on failure
  $staging = Join-Path $Root 'cli.next'
  $bak = Join-Path $Root 'cli.bak'
  $cli = Join-Path $Root 'cli'
  if (Test-Path $staging) { Remove-Item -Recurse -Force $staging }
  if (Test-Path $bak) { Remove-Item -Recurse -Force $bak }
  New-Item -ItemType Directory -Path $staging | Out-Null
  tar -xf (Join-Path $tmpdir 'sdkvm.tgz') -C $staging
  $unpacked = Join-Path $staging 'package'
  if (-not (Test-Path (Join-Path $unpacked 'package.json'))) {
    Remove-Item -Recurse -Force $staging
    throw 'sdkvm: release archive missing package/package.json'
  }
  if (Test-Path $cli) { Move-Item $cli $bak }
  try {
    Move-Item $unpacked $cli
  } catch {
    if ((Test-Path $bak) -and -not (Test-Path $cli)) { Move-Item $bak $cli }
    if (Test-Path $staging) { Remove-Item -Recurse -Force $staging }
    throw
  }
  if (Test-Path $staging) { Remove-Item -Recurse -Force $staging }
  if (Test-Path $bak) { Remove-Item -Recurse -Force $bak }

  @"
@echo off
set "ROOT=%SDKVM_HOME%"
if "%ROOT%"=="" set "ROOT=%JVM_HOME%"
if "%ROOT%"=="" set "ROOT=$Root"
"%ROOT%\runtime\current\node.exe" "%ROOT%\cli\dist\index.js" %*
"@ | Set-Content -Encoding ascii (Join-Path $BinDir 'sdkvm.cmd')

  Write-Host "sdkvm: installed to $BinDir\sdkvm.cmd"
  Write-Host "sdkvm: runtime $current (isolated from sdkvm node use)"
  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  if ($userPath -notlike "*$BinDir*") {
    Write-Host "sdkvm: add to your user PATH: $BinDir"
  }
} finally {
  Remove-Item -Recurse -Force $tmpdir -ErrorAction SilentlyContinue
}
