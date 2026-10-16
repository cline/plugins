#!/usr/bin/env pwsh

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$ForgeProjectRootDirectory
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$FsrtExe = Join-Path $ScriptDir 'fsrt.exe'
$ArtifactUrl = 'https://github.com/atlassian-labs/FSRT/releases/download/forge-security-review-test/fsrt-tkallady-release-workflow-x86_64-pc-windows-msvc.zip'

function Fail {
    param([string]$Message)
    Write-Error $Message
    exit 1
}

function Ensure-DirectoryExists {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
        Fail "Error: target directory does not exist: $Path"
    }
}

function Ensure-ManifestExists {
    param([string]$Path)
    $manifestPath = Join-Path $Path 'manifest.yml'
    if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
        Fail "Error: no manifest.yml found in target directory: $Path`nHint: pass the Forge project root directory (the directory containing manifest.yml)."
    }
}

function Install-Fsrt {
    $tmpDir = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
    New-Item -ItemType Directory -Path $tmpDir | Out-Null

    try {
        $zipPath = Join-Path $tmpDir 'fsrt-artifact.zip'
        $unzippedDir = Join-Path $tmpDir 'unzipped'

        Write-Host 'fsrt.exe not found in scripts directory. Downloading artifact for this platform...'
        Write-Host "Artifact URL: $ArtifactUrl"

        Invoke-WebRequest -Uri $ArtifactUrl -OutFile $zipPath
        Expand-Archive -LiteralPath $zipPath -DestinationPath $unzippedDir -Force

        $searchRoot = $unzippedDir
        $topLevelDir = Get-ChildItem -LiteralPath $unzippedDir -Directory | Select-Object -First 1
        if ($null -ne $topLevelDir) {
            $searchRoot = $topLevelDir.FullName
        }

        $extractedFsrt = Get-ChildItem -LiteralPath $searchRoot -File -Recurse |
            Where-Object { $_.Name -ieq 'fsrt.exe' -or $_.Name -ieq 'fsrt' } |
            Select-Object -First 1

        if ($null -eq $extractedFsrt) {
            $nestedArchive = Get-ChildItem -LiteralPath $searchRoot -File -Recurse |
                Where-Object { $_.Name -match '\.(tar\.gz|tgz)$' } |
                Select-Object -First 1

            if ($null -ne $nestedArchive) {
                if (-not (Get-Command tar -ErrorAction SilentlyContinue)) {
                    Fail "Error: nested archive found ($($nestedArchive.FullName)) but 'tar' command is not available to extract it."
                }

                $tarExtractDir = Join-Path $tmpDir 'tar-extracted'
                New-Item -ItemType Directory -Path $tarExtractDir | Out-Null

                Write-Host "Found nested archive: $($nestedArchive.FullName)"
                & tar -xzf $nestedArchive.FullName -C $tarExtractDir

                $extractedFsrt = Get-ChildItem -LiteralPath $tarExtractDir -File -Recurse |
                    Where-Object { $_.Name -ieq 'fsrt.exe' -or $_.Name -ieq 'fsrt' } |
                    Select-Object -First 1
            }
        }

        if ($null -eq $extractedFsrt) {
            Fail "Error: could not find 'fsrt.exe' (or 'fsrt') in downloaded artifact."
        }

        Copy-Item -LiteralPath $extractedFsrt.FullName -Destination $FsrtExe -Force
        Write-Host "Installed fsrt to $FsrtExe"
    }
    finally {
        if (Test-Path -LiteralPath $tmpDir) {
            Remove-Item -LiteralPath $tmpDir -Recurse -Force
        }
    }
}

$targetDir = (Resolve-Path -LiteralPath $ForgeProjectRootDirectory).Path

Ensure-DirectoryExists -Path $targetDir
Ensure-ManifestExists -Path $targetDir

if (-not (Test-Path -LiteralPath $FsrtExe -PathType Leaf)) {
    Install-Fsrt
}

Write-Host "Running fsrt against $targetDir"
& $FsrtExe $targetDir
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
