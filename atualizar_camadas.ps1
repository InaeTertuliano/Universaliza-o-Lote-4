<#
.SYNOPSIS
    Script de Atualização e Publicação das Camadas do WebGIS Lote 4
.DESCRIPTION
    1. Lê os arquivos GeoJSON/JSON da pasta 'data/'
    2. Atualiza os arquivos JS em 'js/' (js/data.js, js/municipios_data.js, js/metas_data.js)
    3. Executa git add, git commit e git push para o GitHub Pages
#>

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "Atualizador de Camadas - WebGIS Lote 4"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   ATUALIZADOR DE DADOS E CAMADAS - WEBGIS LOTE 4" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }

$dataPath = Join-Path $root "data"
$jsPath = Join-Path $root "js"

# 1. Atualizar js/data.js
Write-Host "[1/4] Processando camadas geográficas principais..." -ForegroundColor Yellow
$fAreas = Join-Path $dataPath "areas_de_expansao.geojson"
$fLinear = Join-Path $dataPath "camada_linear.geojson"
$fLocal = Join-Path $dataPath "camada_localizada.geojson"

if ((Test-Path $fAreas) -and (Test-Path $fLinear) -and (Test-Path $fLocal)) {
    $areas = [System.IO.File]::ReadAllText($fAreas, [System.Text.Encoding]::UTF8).Trim()
    $linear = [System.IO.File]::ReadAllText($fLinear, [System.Text.Encoding]::UTF8).Trim()
    $localizada = [System.IO.File]::ReadAllText($fLocal, [System.Text.Encoding]::UTF8).Trim()
    $today = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")

    $sb = [System.Text.StringBuilder]::new()
    [void]$sb.AppendLine("// WebGIS Data Package - Universalização Sabesp Lote 4 Itapetininga")
    [void]$sb.AppendLine("// Atualizado automaticamente em $today")
    [void]$sb.AppendLine("window.GIS_DATA = {")
    [void]$sb.AppendLine("    areas: $areas,")
    [void]$sb.AppendLine("    linear: $linear,")
    [void]$sb.AppendLine("    localizada: $localizada,")
    [void]$sb.AppendLine("    meta: {")
    [void]$sb.AppendLine("        lote: `"LOTE 04 - ITAPETININGA`",")
    [void]$sb.AppendLine("        data_atualizacao: `"$((Get-Date).ToString("yyyy-MM-dd"))`",")
    [void]$sb.AppendLine("        bounds: [[-23.859038, -48.917271], [-23.358829, -47.978981]],")
    [void]$sb.AppendLine("        center: [-23.608933, -48.448126]")
    [void]$sb.AppendLine("    }")
    [void]$sb.AppendLine("};")

    $outDataJs = Join-Path $jsPath "data.js"
    [System.IO.File]::WriteAllText($outDataJs, $sb.ToString(), [System.Text.Encoding]::UTF8)
    Write-Host "   OK: js/data.js atualizado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "   AVISO: Arquivos GeoJSON de áreas/linear/localizada não encontrados em 'data/'." -ForegroundColor DarkYellow
}

# 2. Atualizar js/municipios_data.js
Write-Host "[2/4] Processando limites municipais..." -ForegroundColor Yellow
$fMun = Join-Path $dataPath "limite_municipios.geojson"
if (Test-Path $fMun) {
    $mun = [System.IO.File]::ReadAllText($fMun, [System.Text.Encoding]::UTF8).Trim()
    $outMunJs = Join-Path $jsPath "municipios_data.js"
    $contentMun = "// Limites Municipais - Apenas delimitação territorial e nome do município`r`nwindow.GIS_MUNICIPIOS = $mun;`r`n"
    [System.IO.File]::WriteAllText($outMunJs, $contentMun, [System.Text.Encoding]::UTF8)
    Write-Host "   OK: js/municipios_data.js atualizado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "   AVISO: data/limite_municipios.geojson não encontrado." -ForegroundColor DarkYellow
}

# 3. Atualizar js/metas_data.js
Write-Host "[3/4] Processando metas e indicadores..." -ForegroundColor Yellow
$fMetas = Join-Path $dataPath "metas_economias.json"
if (Test-Path $fMetas) {
    $metas = [System.IO.File]::ReadAllText($fMetas, [System.Text.Encoding]::UTF8).Trim()
    $outMetasJs = Join-Path $jsPath "metas_data.js"
    $contentMetas = "window.GIS_METAS = $metas;`r`n"
    [System.IO.File]::WriteAllText($outMetasJs, $contentMetas, [System.Text.Encoding]::UTF8)
    Write-Host "   OK: js/metas_data.js atualizado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "   AVISO: data/metas_economias.json não encontrado." -ForegroundColor DarkYellow
}

# 4. Git commit & push
Write-Host "[4/4] Verificando e enviando alterações para o GitHub..." -ForegroundColor Yellow
$changes = git status -s
if ($changes) {
    git add .
    $dataHoje = (Get-Date).ToString("dd/MM/yyyy HH:mm")
    git commit -m "update: atualizacao dos dados e camadas ($dataHoje)"
    git push origin main
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "   SUCESSO! O repositório foi atualizado." -ForegroundColor Green
    Write-Host "   O GitHub Pages atualizará o site em 1 a 2 minutos:" -ForegroundColor Cyan
    Write-Host "   https://inaetertuliano.github.io/Universaliza-o-Lote-4/" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Nenhuma alteração foi detectada nos arquivos. Tudo já está atualizado!" -ForegroundColor Green
}
