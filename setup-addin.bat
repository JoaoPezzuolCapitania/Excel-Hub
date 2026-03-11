@echo off
echo ============================================
echo   ExcelHub Add-in Setup (Admin Required)
echo ============================================
echo.

REM Add loopback exemption for Edge WebView
echo Adding loopback exemption for Edge WebView...
CheckNetIsolation LoopbackExempt -a -n="Microsoft.Win32WebViewHost_cw5n1h2txyewy"
echo.

REM Create network share for the manifest folder
echo Creating network share...
net share ExcelAddin /delete >nul 2>&1
net share ExcelAddin="C:\GITHUB\ExcelHub\Excel-Hub\excel-addin" /grant:everyone,full
echo.

echo ============================================
echo   Done! Now in Excel:
echo   1. File ^> Options ^> Trust Center
echo   2. Trust Center Settings ^> Trusted Add-in Catalogs
echo   3. Add: \\%COMPUTERNAME%\ExcelAddin
echo   4. Check "Show in Menu"
echo   5. OK ^> OK ^> Restart Excel
echo   6. Insert ^> My Add-ins ^> Shared Folder tab
echo ============================================
echo.
pause
