Remove-Item ".\dist\*" -Force

# rpc-table.js
Write-Output "Miniying rpc-table.js..."

Add-Type -AssemblyName System.Web
$EncodedContent = [System.Web.HttpUtility]::UrlEncode((Get-Content -Path "src\rpc-table.js" -Raw))

$Response = Invoke-RestMethod -Uri "https://www.toptal.com/developers/javascript-minifier/api/raw" `
    -Method Post `
    -Body "input=$EncodedContent" `
    -ContentType "application/x-www-form-urlencoded"
[System.IO.File]::WriteAllText("dist/rpc-table.min.js", $Response, (New-Object System.Text.UTF8Encoding $False))

Copy-Item "src\rpc-table.js" -Destination "dist\rpc-table.js"

# rpc-table.css
Write-Output "Miniying rpc-table.css..."

Add-Type -AssemblyName System.Web
$EncodedContent = [System.Web.HttpUtility]::UrlEncode((Get-Content -Path "src\rpc-table.css" -Raw))

$Response = Invoke-RestMethod -Uri "https://www.toptal.com/developers/cssminifier/api/raw" `
    -Method Post `
    -Body "input=$EncodedContent" `
    -ContentType "application/x-www-form-urlencoded"
[System.IO.File]::WriteAllText("dist/rpc-table.min.css", $Response, (New-Object System.Text.UTF8Encoding $False))

Copy-Item "src\rpc-table.css" -Destination "dist\rpc-table.css"

Write-Output "Success."