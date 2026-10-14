$inDir = 'C:\Users\Administrador\Desktop\BI\CURSO WEB GIS\INSUMOS\insumos 2'
$outDir = 'c:\Users\Administrador\Desktop\ANTIGRAVITY\data'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force }

Write-Host "Creating ariquemes.js..."
$ariquemes = Get-Content (Join-Path $inDir 'ARIQUEMES GJ.geojson') -Raw -Encoding UTF8
Set-Content -Path (Join-Path $outDir 'ariquemes.js') -Value ('window.ARIQUEMES_DATA = ' + $ariquemes + ';') -Encoding UTF8

Write-Host "Creating hidro.js..."
$hidro = Get-Content (Join-Path $inDir 'HIDRO.geojson') -Raw -Encoding UTF8
Set-Content -Path (Join-Path $outDir 'hidro.js') -Value ('window.HIDRO_DATA = ' + $hidro + ';') -Encoding UTF8

Write-Host "Creating areaimovel.js..."
$areaimovel = Get-Content (Join-Path $inDir 'AREAIMOVEL.geojson') -Raw -Encoding UTF8
Set-Content -Path (Join-Path $outDir 'areaimovel.js') -Value ('window.AREAIMOVEL_DATA = ' + $areaimovel + ';') -Encoding UTF8

Write-Host "Data modules build completed successfully!"
