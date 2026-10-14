$content = Get-Content 'C:\Users\Administrador\Desktop\BI\CURSO WEB GIS\INSUMOS\insumos 2\AREAIMOVEL.geojson' -Raw | ConvertFrom-Json
$years = $content.features | ForEach-Object {
    $d = $_.properties.dat_criaca
    if ($d -and $d.Length -ge 10) {
        $d.Substring(6, 4)
    }
} | Select-Object -Unique | Sort-Object
Write-Host "Years: " ($years -join ', ')
