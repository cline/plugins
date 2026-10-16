@echo off
setlocal enabledelayedexpansion

set "PLUGIN_ROOT=%~dp0.."
set "ARCH=amd64"
if "%PROCESSOR_ARCHITECTURE%"=="ARM64" set "ARCH=arm64"

set "BINARY=%PLUGIN_ROOT%\bin\lumen-windows-%ARCH%.exe"

if not exist "%BINARY%" (
  set "MANIFEST=%PLUGIN_ROOT%\.release-please-manifest.json"
  if not exist "!MANIFEST!" (
    echo Error: .release-please-manifest.json not found in %PLUGIN_ROOT% >&2
    exit /b 1
  )

  for /f "tokens=*" %%i in ('findstr /r "\"[.]\"" "!MANIFEST!"') do (
    for /f "tokens=2 delims=:" %%j in ("%%i") do (
      set "VERSION=v%%~j"
      set "VERSION=!VERSION: =!"
      set "VERSION=!VERSION:,=!"
      set "VERSION=!VERSION:"=!"
    )
  )

  if "!VERSION!"=="" (
    echo Error: could not read version from !MANIFEST! >&2
    exit /b 1
  )

  set "ASSET=lumen-!VERSION:~1!-windows-!ARCH!.exe"
  set "URL=https://github.com/ory/lumen/releases/download/!VERSION!/!ASSET!"
  set "EXPECTED_SHA="
  if "!ASSET!"=="lumen-0.0.41-windows-amd64.exe" set "EXPECTED_SHA=0012c4837b2cc22fbb6124a9ff133518d963c93510178e9060b6004e299ec44d"
  if "!EXPECTED_SHA!"=="" (
    echo Error: no pinned checksum for !ASSET! >&2
    exit /b 1
  )

  echo Downloading lumen !VERSION! for windows/!ARCH!... >&2
  if not exist "%PLUGIN_ROOT%\bin" mkdir "%PLUGIN_ROOT%\bin"

  set "DOWNLOAD=%BINARY%.download"
  if exist "!DOWNLOAD!" del "!DOWNLOAD!"

  call curl -fL --max-time 300 --retry 3 --retry-delay 2 "!URL!" -o "!DOWNLOAD!"
  if errorlevel 1 (
    echo Error: could not download lumen from !URL! >&2
    exit /b 1
  )

  set "ACTUAL_SHA="
  for /f "tokens=1" %%h in ('certutil -hashfile "!DOWNLOAD!" SHA256 ^| findstr /r "^[0-9A-Fa-f][0-9A-Fa-f]"') do (
    if "!ACTUAL_SHA!"=="" set "ACTUAL_SHA=%%h"
  )
  if /i not "!ACTUAL_SHA!"=="!EXPECTED_SHA!" (
    del "!DOWNLOAD!" 2>nul
    echo Error: checksum mismatch for !ASSET! >&2
    echo Expected: !EXPECTED_SHA! >&2
    echo Actual:   !ACTUAL_SHA! >&2
    exit /b 1
  )

  move /Y "!DOWNLOAD!" "%BINARY%" >nul
  echo Installed lumen to %BINARY% >&2
)

"%BINARY%" %*
