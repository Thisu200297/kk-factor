@echo off
setlocal
title The KK Factor - First Time Setup
cd /d "%~dp0"

echo.
echo  ============================================================
echo      THE KK FACTOR  -  FIRST TIME SETUP
echo  ============================================================
echo.
echo    You only need to run this ONCE, the very first time.
echo    It takes about 3 to 5 minutes.
echo.
echo    Two things before you start:
echo.
echo      1. Node.js must be installed on this computer.
echo         Get it free from   https://nodejs.org
echo         (click the large LTS button, accept all defaults,
echo          then restart the computer)
echo.
echo      2. This computer needs to be connected to the internet.
echo         Your articles and music details are stored online,
echo         so the site needs a connection to reach them.
echo.
echo    There is nothing else to install. No database to set up.
echo.
echo  ------------------------------------------------------------
pause
echo.

where node >nul 2>nul
if errorlevel 1 goto NONODE

echo  [1 of 3]  Checking Node.js
node -v
echo.

echo  [2 of 3]  Installing the news server. Please wait...
echo            (a few minutes - lots of text will scroll past,
echo             that is completely normal)
cd /d "%~dp0server"
call npm install --no-audit --no-fund
if errorlevel 1 goto FAILED
echo.

echo  [3 of 3]  Installing the website. Please wait...
cd /d "%~dp0client"
call npm install --no-audit --no-fund
if errorlevel 1 goto FAILED
echo.

echo  ----  Checking your content  --------------------------------
cd /d "%~dp0server"
call npm run db:seed
if errorlevel 1 goto NOCONTENT
echo.

echo  ============================================================
echo      SETUP COMPLETE
echo  ============================================================
echo.
echo    You can close this window now.
echo.
echo    From now on, just double-click:
echo        Start The KK Factor.bat
echo.
pause
exit /b 0

:NOCONTENT
echo.
echo  ------------------------------------------------------------
echo    The site is installed, but it could not reach your
echo    content just now.
echo  ------------------------------------------------------------
echo.
echo    This is almost always the internet connection.
echo.
echo    Check you are online, then double-click
echo        Start The KK Factor.bat
echo.
echo    If the site opens but shows no articles, send this
echo    window to your developer.
echo.
pause
exit /b 0

:NONODE
echo.
echo  ------------------------------------------------------------
echo    PROBLEM:  Node.js is not installed on this computer.
echo  ------------------------------------------------------------
echo.
echo    1. Go to    https://nodejs.org
echo    2. Click the large LTS button and install it
echo       (accept all the default options)
echo    3. Restart the computer
echo    4. Run this file again
echo.
pause
exit /b 1

:FAILED
echo.
echo  ------------------------------------------------------------
echo    Something went wrong during installation.
echo  ------------------------------------------------------------
echo.
echo    The usual cause is the internet connection dropping.
echo    Check you are online and run this file again.
echo.
echo    If it keeps failing, please take a photo or screenshot
echo    of this window and send it to your developer.
echo.
pause
exit /b 1
