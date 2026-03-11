$regPath = "HKCU:\Software\Microsoft\Office\16.0\Wef\Developer"

# Ensure the path exists
if (!(Test-Path $regPath)) { New-Item -Path $regPath -Force | Out-Null }

# Set manifest path
New-ItemProperty -Path $regPath -Name "a1b2c3d4-e5f6-7890-abcd-ef1234567890" -Value "C:\GITHUB\ExcelHub\Excel-Hub\excel-addin\manifest.xml" -PropertyType String -Force

# Enable direct debugger (bypasses Visual Studio requirement)
New-ItemProperty -Path $regPath -Name "UseDirectDebugger" -Value 1 -PropertyType DWORD -Force
New-ItemProperty -Path $regPath -Name "UseLiveReload" -Value 0 -PropertyType DWORD -Force

Write-Host "Registry updated. Close ALL Excel windows, then reopen Excel."
Write-Host ""
Get-ItemProperty -Path $regPath | Format-List
