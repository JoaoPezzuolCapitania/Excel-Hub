$regPath = "HKCU:\Software\Microsoft\Office\16.0\Wef\Developer"
if (!(Test-Path $regPath)) { New-Item -Path $regPath -Force | Out-Null }
$manifestPath = "C:\GITHUB\ExcelHub\Excel-Hub\excel-addin\manifest.xml"
New-ItemProperty -Path $regPath -Name "a1b2c3d4-e5f6-7890-abcd-ef1234567890" -Value $manifestPath -PropertyType String -Force
Write-Host "Add-in registered. Restart Excel."
