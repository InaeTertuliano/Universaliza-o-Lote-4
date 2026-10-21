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
    $hashPayload = (Get-FileHash $fAreas, $fLinear, $fLocal | Select-Object -ExpandProperty Hash) -join ""
    $outDataJs = Join-Path $jsPath "data.js"
    $currentDataJs = if (Test-Path $outDataJs) { [System.IO.File]::ReadAllText($outDataJs, [System.Text.Encoding]::UTF8) } else { "" }

    if ($currentDataJs -notmatch "// HASH: $hashPayload") {
        $areas = [System.IO.File]::ReadAllText($fAreas, [System.Text.Encoding]::UTF8).Trim()
        $linear = [System.IO.File]::ReadAllText($fLinear, [System.Text.Encoding]::UTF8).Trim()
        $localizada = [System.IO.File]::ReadAllText($fLocal, [System.Text.Encoding]::UTF8).Trim()
        $today = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")

        $sb = [System.Text.StringBuilder]::new()
        [void]$sb.AppendLine("// WebGIS Data Package - Universalização Sabesp Lote 4 Itapetininga")
        [void]$sb.AppendLine("// HASH: $hashPayload")
        [void]$sb.AppendLine("// Atualizado em $today")
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

        [System.IO.File]::WriteAllText($outDataJs, $sb.ToString(), [System.Text.Encoding]::UTF8)
        Write-Host "   OK: js/data.js atualizado com novos dados!" -ForegroundColor Green
    } else {
        Write-Host "   OK: js/data.js já está em dia com os arquivos GeoJSON (sem alterações)." -ForegroundColor DarkGray
    }
} else {
    Write-Host "   AVISO: Arquivos GeoJSON de áreas/linear/localizada não encontrados em 'data/'." -ForegroundColor DarkYellow
}

# 2. Atualizar js/municipios_data.js
Write-Host "[2/4] Processando limites municipais..." -ForegroundColor Yellow
$fMun = Join-Path $dataPath "limite_municipios.geojson"
if (Test-Path $fMun) {
    $hashMun = (Get-FileHash $fMun).Hash
    $outMunJs = Join-Path $jsPath "municipios_data.js"
    $currentMunJs = if (Test-Path $outMunJs) { [System.IO.File]::ReadAllText($outMunJs, [System.Text.Encoding]::UTF8) } else { "" }

    if ($currentMunJs -notmatch "// HASH: $hashMun") {
        $mun = [System.IO.File]::ReadAllText($fMun, [System.Text.Encoding]::UTF8).Trim()
        $contentMun = "// Limites Municipais - Apenas delimitação territorial e nome do município`r`n// HASH: $hashMun`r`nwindow.GIS_MUNICIPIOS = $mun;`r`n"
        [System.IO.File]::WriteAllText($outMunJs, $contentMun, [System.Text.Encoding]::UTF8)
        Write-Host "   OK: js/municipios_data.js atualizado com novos dados!" -ForegroundColor Green
    } else {
        Write-Host "   OK: js/municipios_data.js já está em dia (sem alterações)." -ForegroundColor DarkGray
    }
} else {
    Write-Host "   AVISO: data/limite_municipios.geojson não encontrado." -ForegroundColor DarkYellow
}

# 3. Atualizar js/metas_data.js
Write-Host "[3/4] Processando metas e indicadores..." -ForegroundColor Yellow
$fMetas = Join-Path $dataPath "metas_economias.json"
if (Test-Path $fMetas) {
    $hashMetas = (Get-FileHash $fMetas).Hash
    $outMetasJs = Join-Path $jsPath "metas_data.js"
    $currentMetasJs = if (Test-Path $outMetasJs) { [System.IO.File]::ReadAllText($outMetasJs, [System.Text.Encoding]::UTF8) } else { "" }

    if ($currentMetasJs -notmatch "// HASH: $hashMetas") {
        $metas = [System.IO.File]::ReadAllText($fMetas, [System.Text.Encoding]::UTF8).Trim()
        $contentMetas = "// Metas e Indicadores`r`n// HASH: $hashMetas`r`nwindow.GIS_METAS = $metas;`r`n"
        [System.IO.File]::WriteAllText($outMetasJs, $contentMetas, [System.Text.Encoding]::UTF8)
        Write-Host "   OK: js/metas_data.js atualizado com novos dados!" -ForegroundColor Green
    } else {
        Write-Host "   OK: js/metas_data.js já está em dia (sem alterações)." -ForegroundColor DarkGray
    }
} else {
    Write-Host "   AVISO: data/metas_economias.json não encontrado." -ForegroundColor DarkYellow
}

# 4. Atualizar js/escopo_original_data.js
Write-Host "[4/6] Processando camadas do Escopo Original..." -ForegroundColor Yellow
$fOrigAreas = Join-Path $dataPath "escopo_original_areas.geojson"
$fOrigLinear = Join-Path $dataPath "escopo_original_linear.geojson"
$fOrigPontual = Join-Path $dataPath "escopo_original_pontual.geojson"

if ((Test-Path $fOrigAreas) -and (Test-Path $fOrigLinear) -and (Test-Path $fOrigPontual)) {
    $hashOrig = (Get-FileHash $fOrigAreas, $fOrigLinear, $fOrigPontual | Select-Object -ExpandProperty Hash) -join ""
    $outOrigJs = Join-Path $jsPath "escopo_original_data.js"
    $currentOrigJs = if (Test-Path $outOrigJs) { [System.IO.File]::ReadAllText($outOrigJs, [System.Text.Encoding]::UTF8) } else { "" }

    if ($currentOrigJs -notmatch "// HASH: $hashOrig") {
        $origA = [System.IO.File]::ReadAllText($fOrigAreas, [System.Text.Encoding]::UTF8).Trim()
        $origL = [System.IO.File]::ReadAllText($fOrigLinear, [System.Text.Encoding]::UTF8).Trim()
        $origP = [System.IO.File]::ReadAllText($fOrigPontual, [System.Text.Encoding]::UTF8).Trim()
        $today = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")

        $sbOrig = [System.Text.StringBuilder]::new()
        [void]$sbOrig.AppendLine('// WebGIS Data Package - Escopo Original (Comparativo Bairro/Frente de Obra)')
        [void]$sbOrig.AppendLine("// HASH: $hashOrig")
        [void]$sbOrig.AppendLine("// Atualizado em $today")
        [void]$sbOrig.AppendLine('window.GIS_ESCOPO_ORIGINAL = {')
        [void]$sbOrig.AppendLine("    areas: $origA,")
        [void]$sbOrig.AppendLine("    linear: $origL,")
        [void]$sbOrig.AppendLine("    pontual: $origP,")
        [void]$sbOrig.AppendLine('    meta: {')
        [void]$sbOrig.AppendLine('        grupo: "Escopo Original",')
        [void]$sbOrig.AppendLine('        bairros: ["PEDRAS E VITÓRIA", "TURVO DOS ALMEIDAS"],')
        [void]$sbOrig.AppendLine('        municipios: ["Guareí", "Capão Bonito", "Itapetininga"]')
        [void]$sbOrig.AppendLine('    }')
        [void]$sbOrig.AppendLine('};')

        [System.IO.File]::WriteAllText($outOrigJs, $sbOrig.ToString(), [System.Text.Encoding]::UTF8)
        Write-Host "   OK: js/escopo_original_data.js atualizado com novos dados!" -ForegroundColor Green
    } else {
        Write-Host "   OK: js/escopo_original_data.js já está em dia (sem alterações)." -ForegroundColor DarkGray
    }
} else {
    Write-Host "   AVISO: Arquivos GeoJSON do Escopo Original não encontrados em 'data/'." -ForegroundColor DarkYellow
}

# 5. Atualizar js/custos_data.js a partir da Planilha de Custos (PREÇO.xlsx)
Write-Host "[5/6] Processando planilha de custos e preços unitários..." -ForegroundColor Yellow
$fPrecoDesktop = "C:\Users\Administrador\Desktop\0-teste\CUSTO\PREÇO.xlsx"
$fPrecoData = Join-Path $dataPath "PRECO.xlsx"

if (Test-Path $fPrecoDesktop) {
    try {
        Copy-Item -Path $fPrecoDesktop -Destination $fPrecoData -Force -ErrorAction SilentlyContinue
    } catch {}
}

if (Test-Path $fPrecoData) {
    $hashPreco = (Get-FileHash $fPrecoData).Hash
    $outCustosJs = Join-Path $jsPath "custos_data.js"
    $currentCustosJs = if (Test-Path $outCustosJs) { [System.IO.File]::ReadAllText($outCustosJs, [System.Text.Encoding]::UTF8) } else { "" }

    if ($currentCustosJs -notmatch "// HASH: $hashPreco") {
        try {
            $tempPreco = Join-Path $env:TEMP "preco_act_temp.xlsx"
            $fsIn = [System.IO.File]::Open($fPrecoData, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
            $fsOut = [System.IO.File]::Create($tempPreco)
            $fsIn.CopyTo($fsOut)
            $fsIn.Close()
            $fsOut.Close()

            Add-Type -AssemblyName System.IO.Compression.FileSystem
            $zip = [System.IO.Compression.ZipFile]::OpenRead($tempPreco)

            $sharedStringsEntry = $zip.GetEntry("xl/sharedStrings.xml")
            $sharedStrings = @()
            if ($sharedStringsEntry) {
                $stream = $sharedStringsEntry.Open()
                $reader = New-Object System.IO.StreamReader($stream)
                [xml]$ssXml = $reader.ReadToEnd()
                $reader.Close()
                $stream.Close()
                $sharedStrings = $ssXml.sst.si | ForEach-Object {
                    if ($_.t) { $_.t } elseif ($_.r) { ($_.r.t) -join "" } else { "" }
                }
            }

            $sheetEntry = $zip.GetEntry("xl/worksheets/sheet1.xml")
            $stream = $sheetEntry.Open()
            $reader = New-Object System.IO.StreamReader($stream)
            [xml]$sheetXml = $reader.ReadToEnd()
            $reader.Close()
            $stream.Close()
            $zip.Dispose()
            Remove-Item $tempPreco -Force -ErrorAction SilentlyContinue

            $rows = $sheetXml.worksheet.sheetData.row
            $header = @{}
            $items = @()

            foreach ($r in $rows) {
                $rowNum = [int]$r.r
                if ($rowNum -eq 1) {
                    foreach ($c in $r.c) {
                        $col = $c.r -replace '\d', ''
                        $val = if ($c.t -eq "s") { $sharedStrings[[int]$c.v] } else { $c.v }
                        $header[$col] = $val.Trim().ToUpper()
                    }
                } else {
                    $rowObj = @{}
                    foreach ($c in $r.c) {
                        $col = $c.r -replace '\d', ''
                        $val = if ($c.t -eq "s") { $sharedStrings[[int]$c.v] } else { $c.v }
                        $hName = $header[$col]
                        if ($hName) { $rowObj[$hName] = $val }
                    }
                    if ($rowObj.Count -gt 0) {
                        $segKey = $rowObj.Keys | Where-Object { $_ -like "*SEGMENTO*" } | Select-Object -First 1
                        $dnKey = $rowObj.Keys | Where-Object { $_ -like "*DI*METRO*" -or $_ -like "*DN*" } | Select-Object -First 1
                        $precoKey = $rowObj.Keys | Where-Object { $_ -like "*PRE*O*" -or $_ -like "*CUSTO*" -or $_ -like "*VALOR*" } | Select-Object -First 1

                        $seg = if ($segKey) { $rowObj[$segKey].Trim().ToUpper() } else { "REDE COLETORA" }
                        $dn = if ($dnKey) { [int]$rowObj[$dnKey] } else { 150 }
                        $preco = if ($precoKey) { [double]($rowObj[$precoKey] -replace ',', '.') } else { 600.0 }

                        $items += [PSCustomObject]@{
                            segmento = $seg
                            diametro = $dn
                            preco_metro = $preco
                            unidade = "m"
                            moeda = "BRL"
                        }
                    }
                }
            }

            $custosObj = [PSCustomObject]@{
                origem_arquivo = "PREÇO.xlsx"
                data_atualizacao = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                tabela_precos = $items
            }
            $custosJson = $custosObj | ConvertTo-Json -Depth 5
            [System.IO.File]::WriteAllText((Join-Path $dataPath "custos.json"), $custosJson, [System.Text.Encoding]::UTF8)

            $sbCustos = "// WebGIS Data Package - Tabela de Preços e Custos Unitários`r`n// HASH: $hashPreco`r`n// Fonte: PREÇO.xlsx`r`nwindow.GIS_CUSTOS = $custosJson;`r`n"
            [System.IO.File]::WriteAllText($outCustosJs, $sbCustos, [System.Text.Encoding]::UTF8)
            Write-Host "   OK: js/custos_data.js atualizado com sucesso!" -ForegroundColor Green
        } catch {
            Write-Host "   AVISO: Falha ao processar PREÇO.xlsx: $($_.Exception.Message)" -ForegroundColor DarkYellow
        }
    } else {
        Write-Host "   OK: js/custos_data.js já está em dia (sem alterações)." -ForegroundColor DarkGray
    }
} else {
    Write-Host "   AVISO: Planilha PREÇO.xlsx não encontrada." -ForegroundColor DarkYellow
}

# 6. Git commit & push
Write-Host "[6/6] Verificando e enviando alterações para o GitHub..." -ForegroundColor Yellow
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
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "   Nenhuma alteração foi detectada. Tudo já está atualizado!" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
}
