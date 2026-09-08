@echo off
setlocal
title The KK Factor - Starting
cd /d "%~dp0"

echo.
echo  ============================================================
echo      THE KK FACTOR  -  STARTING
echo  ============================================================
echo.
echo    Make sure this computer is connected to the internet.
echo    There is nothing else to open first.
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo    Node.js is not installed. Please run
  echo    "START HERE - First Time Setup.bat" first.
  echo.
  pause
  exit /b 1
)

if not exist "%~dp0server\node_modules" (
  echo    This looks like a fresh copy.
  echo    Please run "START HERE - First Time Setup.bat" first.
  echo.
  pause
  exit /b 1
)

if not exist "%~dp0client\node_modules" (
  echo    The website is not installed yet.
  echo    Please run "START HERE - First Time Setup.bat" first.
  echo.
  pause
  exit /b 1
)

echo    Starting the news server...
cd /d "%~dp0server"
start "KK Factor - NEWS SERVER  (do not close)" cmd /k npm run dev

timeout /t 7 /nobreak >nul

echo    Starting the website...
cd /d "%~dp0client"
start "KK Factor - WEBSITE  (do not close)" cmd /k npm run dev

timeout /t 12 /nobreak >nul

echo    Opening your browser...
start "" "http://localhost:5173"

echo.
echo  ------------------------------------------------------------
echo    Two black windows have opened.
echo    LEAVE THEM OPEN while you are using the site.
echo.
echo    Website:  http://localhost:5173
echo.
echo    TO STOP:  close both black windows.
echo.
echo    If the site opens but no articles appear, check your
echo    internet connection and refresh the page.
echo  ------------------------------------------------------------
echo.
timeout /t 12 >nul
exit /b 0
