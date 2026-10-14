/* ==========================================================================
   WEBGIS CHARTS & DASHBOARD ANALYTICS ENGINE - ENGEFORM THEME
   ========================================================================== */

window.GIS_CHARTS = (function() {
    let chartMun = null;
    let chartStatus = null;
    let chartSegmento = null;
    let chartMaterial = null;

    function getChartThemeColors() {
        const isDark = !document.body.classList.contains('light-theme');
        return {
            textColor: isDark ? '#a1a59a' : '#5c5e57',
            gridColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'
        };
    }

    function calculateMetrics(filteredLinearFeatures) {
        const extByMun = {};
        const extByStatus = {};
        const extBySegmento = {};
        const extByMaterial = {};

        filteredLinearFeatures.forEach(feat => {
            const p = feat.properties;
            const ext = (parseFloat(p.ext_calcul) || 0) / 1000.0; // km
            const mun = p.nm_mun || 'Outros';
            const st = p.status || 'NÃO INICIADO';
            const seg = p.segmento || 'REDE COLETORA';
            const mat = p.material || 'PVC';

            extByMun[mun] = (extByMun[mun] || 0) + ext;
            extByStatus[st] = (extByStatus[st] || 0) + ext;
            extBySegmento[seg] = (extBySegmento[seg] || 0) + ext;
            extByMaterial[mat] = (extByMaterial[mat] || 0) + ext;
        });

        return { extByMun, extByStatus, extBySegmento, extByMaterial };
    }

    return {
        init: function() {
            const linearFeatures = window.GIS_DATA.linear.features;
            const metrics = calculateMetrics(linearFeatures);
            const theme = getChartThemeColors();

            // 1. Chart Extensão por Município
            const ctxMun = document.getElementById('chart-mun');
            if (ctxMun) {
                chartMun = new Chart(ctxMun, {
                    type: 'bar',
                    data: {
                        labels: Object.keys(metrics.extByMun),
                        datasets: [{
                            label: 'Extensão (km)',
                            data: Object.values(metrics.extByMun).map(v => v.toFixed(2)),
                            backgroundColor: ['#919389', '#5c5e57', '#0284c7', '#8b5cf6'],
                            borderRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            x: { ticks: { color: theme.textColor, font: { size: 10 } }, grid: { display: false } },
                            y: { ticks: { color: theme.textColor, font: { size: 10 } }, grid: { color: theme.gridColor } }
                        }
                    }
                });
            }

            // 2. Chart Status de Execução
            const ctxStatus = document.getElementById('chart-status');
            if (ctxStatus) {
                chartStatus = new Chart(ctxStatus, {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(metrics.extByStatus),
                        datasets: [{
                            data: Object.values(metrics.extByStatus).map(v => v.toFixed(2)),
                            backgroundColor: ['#f59e0b', '#10b981', '#0284c7'],
                            borderWidth: 2,
                            borderColor: 'transparent'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'bottom', labels: { color: theme.textColor, font: { size: 10 } } }
                        },
                        cutout: '70%'
                    }
                });
            }

            // 3. Chart Extensão por Segmento
            const ctxSegmento = document.getElementById('chart-segmento');
            if (ctxSegmento) {
                chartSegmento = new Chart(ctxSegmento, {
                    type: 'pie',
                    data: {
                        labels: Object.keys(metrics.extBySegmento),
                        datasets: [{
                            data: Object.values(metrics.extBySegmento).map(v => v.toFixed(2)),
                            backgroundColor: ['#2563eb', '#dc2626', '#ea580c'],
                            borderWidth: 2,
                            borderColor: 'transparent'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'bottom', labels: { color: theme.textColor, font: { size: 10 } } }
                        }
                    }
                });
            }

            // 4. Chart Material das Tubulações
            const ctxMaterial = document.getElementById('chart-material');
            if (ctxMaterial) {
                chartMaterial = new Chart(ctxMaterial, {
                    type: 'bar',
                    data: {
                        labels: Object.keys(metrics.extByMaterial),
                        datasets: [{
                            label: 'Extensão (km)',
                            data: Object.values(metrics.extByMaterial).map(v => v.toFixed(2)),
                            backgroundColor: '#919389',
                            borderRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            x: { ticks: { color: theme.textColor, font: { size: 10 } }, grid: { color: theme.gridColor } },
                            y: { ticks: { color: theme.textColor, font: { size: 10 } }, grid: { display: false } }
                        }
                    }
                });
            }
        },

        update: function(filteredLinearFeatures) {
            const metrics = calculateMetrics(filteredLinearFeatures);

            if (chartMun) {
                chartMun.data.labels = Object.keys(metrics.extByMun);
                chartMun.data.datasets[0].data = Object.values(metrics.extByMun).map(v => v.toFixed(2));
                chartMun.update();
            }

            if (chartStatus) {
                chartStatus.data.labels = Object.keys(metrics.extByStatus);
                chartStatus.data.datasets[0].data = Object.values(metrics.extByStatus).map(v => v.toFixed(2));
                chartStatus.update();
            }

            if (chartSegmento) {
                chartSegmento.data.labels = Object.keys(metrics.extBySegmento);
                chartSegmento.data.datasets[0].data = Object.values(metrics.extBySegmento).map(v => v.toFixed(2));
                chartSegmento.update();
            }

            if (chartMaterial) {
                chartMaterial.data.labels = Object.keys(metrics.extByMaterial);
                chartMaterial.data.datasets[0].data = Object.values(metrics.extByMaterial).map(v => v.toFixed(2));
                chartMaterial.update();
            }
        },

        updateTheme: function() {
            const theme = getChartThemeColors();
            [chartMun, chartStatus, chartSegmento, chartMaterial].forEach(chart => {
                if (chart) {
                    if (chart.options.scales) {
                        if (chart.options.scales.x) {
                            chart.options.scales.x.ticks.color = theme.textColor;
                            if (chart.options.scales.x.grid) chart.options.scales.x.grid.color = theme.gridColor;
                        }
                        if (chart.options.scales.y) {
                            chart.options.scales.y.ticks.color = theme.textColor;
                            if (chart.options.scales.y.grid) chart.options.scales.y.grid.color = theme.gridColor;
                        }
                    }
                    if (chart.options.plugins && chart.options.plugins.legend) {
                        chart.options.plugins.legend.labels.color = theme.textColor;
                    }
                    chart.update();
                }
            });
        }
    };
})();
