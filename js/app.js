/* ==========================================================================
   WEBGIS MAIN APPLICATION INITIALIZER - ENGEFORM & SABESP THEME
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
    console.log("Initializing WebGIS Engeform & Sabesp Portal...");

    // 1. Initialize Leaflet Map
    const initialCenter = window.GIS_DATA.meta.center;
    const initialBounds = window.GIS_DATA.meta.bounds;

    const map = L.map('map', {
        center: initialCenter,
        zoom: 11,
        zoomControl: false
    });

    window.GIS_MAP = map;

    // Add Zoom Control to Top Right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // 2. Basemaps Configuration (Satélite e OpenStreetMap)
    const basemaps = {
        satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: '&copy; Esri World Imagery'
        }),
        osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap'
        })
    };

    let activeBasemap = basemaps.satellite;
    activeBasemap.addTo(map);

    // Fit Initial Bounds
    map.fitBounds(initialBounds, { padding: [30, 30] });

    // 3. Initialize GIS Modules
    window.GIS_LAYERS.init(map);
    window.GIS_CHARTS.init();
    window.GIS_FILTERS.init();
    if (window.GIS_METAS_MODULE) {
        window.GIS_METAS_MODULE.init();
    }

    // 4. Map Mouse Move Event - Update Status Bar Coordinates
    const coordBox = document.getElementById('status-coords');
    map.on('mousemove', function(e) {
        if (coordBox) {
            coordBox.innerText = `LAT: ${e.latlng.lat.toFixed(5)} | LON: ${e.latlng.lng.toFixed(5)} | ZOOM: ${map.getZoom()}`;
        }
    });

    // 5. Sidebar Navigation Tabs
    const tabBtns = document.querySelectorAll('.nav-tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetTab = this.dataset.tab;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            this.classList.add('active');
            const targetPane = document.getElementById(`tab-${targetTab}`);
            if (targetPane) targetPane.classList.add('active');

            if (targetTab === 'geral') {
                if (window.GIS_LAYERS && typeof window.GIS_LAYERS.setLegendMode === 'function') {
                    window.GIS_LAYERS.setLegendMode('status');
                }
            }
        });
    });

    // 6. Sidebar Collapse Toggle & Draggable Resizing Functionality
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarResizer = document.getElementById('sidebar-resizer');
    const DEFAULT_SIDEBAR_WIDTH = 620;
    const MIN_SIDEBAR_WIDTH = 340;

    function getMaxSidebarWidth() {
        return Math.min(Math.round(window.innerWidth * 0.85), window.innerWidth - 100);
    }

    // Restore saved width on desktop / tablet (> 768px)
    if (window.innerWidth > 768) {
        const savedWidth = localStorage.getItem('engeform_webgis_sidebar_width');
        if (savedWidth) {
            const parsed = parseInt(savedWidth, 10);
            if (!isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= getMaxSidebarWidth()) {
                document.documentElement.style.setProperty('--sidebar-width', `${parsed}px`);
            }
        }
    } else {
        // Mobile screen initialization: start collapsed for clean map view
        if (sidebar && !sidebar.classList.contains('collapsed')) {
            sidebar.classList.add('collapsed');
            if (sidebarToggle) {
                const icon = sidebarToggle.querySelector('i');
                if (icon) icon.className = 'fas fa-chevron-right';
            }
        }
    }

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            const icon = sidebarToggle.querySelector('i');
            if (sidebar.classList.contains('collapsed')) {
                icon.className = 'fas fa-chevron-right';
            } else {
                icon.className = 'fas fa-chevron-left';
            }
            setTimeout(() => map.invalidateSize(), 300);
        });
    }

    // Draggable Resizer with Pointer Events (Smooth 60fps tracking for Mouse, Touch, Stylus)
    if (sidebarResizer && sidebar) {
        let isDragging = false;
        let startX = 0;
        let startWidth = 0;

        const onPointerDown = (e) => {
            if (e.button !== undefined && e.button !== 0) return; // Only main button
            if (window.innerWidth <= 768) return; // Disable drag on mobile overlay
            if (sidebar.classList.contains('collapsed')) return;

            isDragging = true;
            startX = e.clientX;
            startWidth = sidebar.getBoundingClientRect().width;

            document.body.classList.add('is-resizing');
            sidebarResizer.setPointerCapture(e.pointerId);
            e.preventDefault();
        };

        const onPointerMove = (e) => {
            if (!isDragging) return;

            const deltaX = e.clientX - startX;
            let newWidth = startWidth + deltaX;

            const maxW = getMaxSidebarWidth();
            newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(newWidth, maxW));

            document.documentElement.style.setProperty('--sidebar-width', `${Math.round(newWidth)}px`);

            if (map) {
                map.invalidateSize();
            }
        };

        const onPointerUp = (e) => {
            if (!isDragging) return;

            isDragging = false;
            document.body.classList.remove('is-resizing');

            try {
                sidebarResizer.releasePointerCapture(e.pointerId);
            } catch (err) {}

            const finalWidth = Math.round(sidebar.getBoundingClientRect().width);
            localStorage.setItem('engeform_webgis_sidebar_width', finalWidth);

            if (map) {
                map.invalidateSize();
            }
        };

        sidebarResizer.addEventListener('pointerdown', onPointerDown);
        sidebarResizer.addEventListener('pointermove', onPointerMove);
        sidebarResizer.addEventListener('pointerup', onPointerUp);
        sidebarResizer.addEventListener('pointercancel', onPointerUp);

        // Double-click to reset width to default 620px
        sidebarResizer.addEventListener('dblclick', () => {
            if (window.innerWidth <= 768) return;
            document.documentElement.style.setProperty('--sidebar-width', `${DEFAULT_SIDEBAR_WIDTH}px`);
            localStorage.setItem('engeform_webgis_sidebar_width', DEFAULT_SIDEBAR_WIDTH);
            if (map) {
                setTimeout(() => map.invalidateSize(), 150);
            }
        });
    }

    // Responsive window resize event listener
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            const currentW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width'), 10);
            const maxW = getMaxSidebarWidth();
            if (!isNaN(currentW) && currentW > maxW) {
                document.documentElement.style.setProperty('--sidebar-width', `${maxW}px`);
            }
        }
        if (map) {
            map.invalidateSize();
        }
    });

    // 7. Theme Switcher (Dark / Light para Interface e Gráficos)
    const btnTheme = document.getElementById('btn-theme-toggle');
    if (btnTheme) {
        btnTheme.addEventListener('click', function() {
            document.body.classList.toggle('light-theme');
            const isLight = document.body.classList.contains('light-theme');
            btnTheme.innerHTML = isLight ? '<i class="fas fa-moon"></i> Dark Mode' : '<i class="fas fa-sun"></i> Light Mode';

            // Update Chart theme
            window.GIS_CHARTS.updateTheme();
            if (window.GIS_METAS_MODULE && window.GIS_METAS_MODULE.renderDiagramaBarras) {
                window.GIS_METAS_MODULE.renderDiagramaBarras();
            }
        });
    }

    // 8. Basemap Selector Dropdown (Satélite / OpenStreetMap)
    const selBasemap = document.getElementById('select-basemap');
    if (selBasemap) {
        selBasemap.addEventListener('change', function(e) {
            const chosen = e.target.value;
            map.removeLayer(activeBasemap);
            activeBasemap = basemaps[chosen] || basemaps.satellite;
            activeBasemap.addTo(map);
        });
    }

    // 9. Layer Checkboxes & Opacity Sliders
    ['municipios', 'areas', 'linear', 'localizada', 'orig-areas', 'orig-linear', 'orig-pontual'].forEach(layerName => {
        const chk = document.getElementById(`chk-layer-${layerName}`);
        if (chk) {
            chk.addEventListener('change', function(e) {
                window.GIS_LAYERS.setLayerVisibility(layerName, e.target.checked);
            });
        }

        const slider = document.getElementById(`slider-opacity-${layerName}`);
        if (slider) {
            slider.addEventListener('input', function(e) {
                const opacity = parseFloat(e.target.value);
                window.GIS_LAYERS.setOpacity(layerName, opacity);
            });
        }
    });

    // 10. Legend Mode Switcher (Status vs Segmento vs Material)
    const selLegendMode = document.getElementById('select-legend-mode');
    if (selLegendMode) {
        selLegendMode.addEventListener('change', function(e) {
            window.GIS_LAYERS.setLegendMode(e.target.value);
        });
    }

    // Floating Map Legend Collapse/Expand Toggle
    const btnToggleLegend = document.getElementById('btn-toggle-floating-legend');
    const floatingLegend = document.getElementById('map-floating-legend');
    if (btnToggleLegend && floatingLegend) {
        btnToggleLegend.addEventListener('click', function() {
            floatingLegend.classList.toggle('collapsed');
            const icon = btnToggleLegend.querySelector('i');
            if (icon) {
                if (floatingLegend.classList.contains('collapsed')) {
                    icon.className = 'fas fa-chevron-up';
                    btnToggleLegend.title = 'Expandir Legenda';
                } else {
                    icon.className = 'fas fa-chevron-down';
                    btnToggleLegend.title = 'Minimizar Legenda';
                }
            }
        });
    }

    // 11. Modal Quantidade de Rede Logic
    const modalQuant = document.getElementById('modal-quantitativos');
    const btnOpenQuantModal = document.getElementById('btn-open-quant-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCloseModalFooter = document.getElementById('btn-close-modal-footer');

    if (btnOpenQuantModal && modalQuant) {
        btnOpenQuantModal.addEventListener('click', function() {
            modalQuant.style.display = 'flex';
        });
    }

    if (btnCloseModal && modalQuant) {
        btnCloseModal.addEventListener('click', function() {
            modalQuant.style.display = 'none';
        });
    }

    if (btnCloseModalFooter && modalQuant) {
        btnCloseModalFooter.addEventListener('click', function() {
            modalQuant.style.display = 'none';
        });
    }

    if (modalQuant) {
        modalQuant.addEventListener('click', function(e) {
            if (e.target === modalQuant) {
                modalQuant.style.display = 'none';
            }
        });
    }

    // Modal Confrontação de Escopo: Original vs. Atual por Bairro
    const modalComparativo = document.getElementById('modal-comparativo-escopo');
    const btnOpenComparativo = document.getElementById('btn-open-comparativo-escopo');
    const btnCloseComparativo = document.getElementById('btn-close-modal-comparativo');
    const btnCloseComparativoFooter = document.getElementById('btn-close-modal-comparativo-footer');

    if (btnOpenComparativo && modalComparativo) {
        btnOpenComparativo.addEventListener('click', function() {
            modalComparativo.style.display = 'flex';
        });
    }

    if (btnCloseComparativo && modalComparativo) {
        btnCloseComparativo.addEventListener('click', function() {
            modalComparativo.style.display = 'none';
        });
    }

    if (btnCloseComparativoFooter && modalComparativo) {
        btnCloseComparativoFooter.addEventListener('click', function() {
            modalComparativo.style.display = 'none';
        });
    }

    if (modalComparativo) {
        modalComparativo.addEventListener('click', function(e) {
            if (e.target === modalComparativo) {
                modalComparativo.style.display = 'none';
            }
        });
    }

    // Botões "Enquadrar e Confrontar no Mapa" dentro do modal comparativo
    document.querySelectorAll('.btn-goto-bairro').forEach(btn => {
        btn.addEventListener('click', function() {
            const bairro = this.dataset.bairro;
            if (modalComparativo) modalComparativo.style.display = 'none';
            if (window.selectBairro) window.selectBairro(bairro, false);
        });
    });

    // Exportação CSV do Comparativo de Escopo Original vs. Atual
    const btnExportComparativoCsv = document.getElementById('btn-export-comparativo-csv');
    if (btnExportComparativoCsv) {
        btnExportComparativoCsv.addEventListener('click', function() {
            const rows = [
                ["BAIRRO", "MUNICIPIO", "STATUS_OBRA", "EXTENSAO_ORIGINAL_M", "EXTENSAO_ATUAL_M", "VARIACAO_EXTENSAO_M", "VARIACAO_EXTENSAO_KM", "TRECHOS_ORIGINAL", "TRECHOS_ATUAL", "AREAS_ORIGINAL", "AREAS_ATUAL", "EEES_ORIGINAL", "EEES_ATUAL"],
                ["Pedras e Vitoria", "Guarei", "Iniciado", "4200.00", "21542.64", "+17342.64", "+17.34 km (+412.9%)", "8", "348", "1", "2", "1", "5"],
                ["Turvo dos Almeidas", "Capao Bonito", "Nao Iniciado", "12560.00", "9037.90", "-3522.10", "-3.52 km (Otimizado)", "85", "34", "3", "3", "5 (4 EEEs + 1 ETE)", "0 (Rede Prioritaria)"]
            ];
            let csvContent = rows.map(r => r.join(";")).join("\n");
            const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Comparativo_Escopo_Original_vs_Atual_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    // 12. Quantitativos CSV Export (Includes Consolidated Bairros)
    const handleExportQuant = function() {
        const rows = [
            ["CATEGORIA", "MUNICIPIO / DESCRICAO", "BAIRRO / DIAMETRO", "EXTENSAO_METROS", "EXTENSAO_KM", "TRECHOS", "PERCENTUAL_LOTE"],
            ["BAIRRO", "Guarei", "Pedras e Vitoria (Unificado B1-B5)", "21542.65", "21.54", "348", "47.4%"],
            ["BAIRRO", "Capao Bonito", "Turvo dos Almeidas", "9037.90", "9.04", "34", "19.9%"],
            ["BAIRRO", "Paranapanema", "Serra da Prata", "6672.19", "6.67", "13", "14.7%"],
            ["BAIRRO", "Sao Miguel Arcanjo", "Pocinho", "4140.67", "4.14", "72", "9.1%"],
            ["BAIRRO", "Itapetininga", "Jardim Aeroporto", "2081.88", "2.08", "21", "4.6%"],
            ["BAIRRO", "Angatuba", "Pateo Velho", "1942.82", "1.94", "17", "4.3%"],
            ["SEGMENTO", "Geral", "Rede Coletora", "33900.57", "33.90", "490", "74.6%"],
            ["SUB_SEGMENTO_DN", "Rede Coletora", "DN 150 mm", "33900.57", "33.90", "490", "100.0% (74.6% Lote)"],
            ["SEGMENTO", "Geral", "Linha de Recalque", "10870.86", "10.87", "14", "23.9%"],
            ["SUB_SEGMENTO_DN", "Linha de Recalque", "DN 100 mm", "4899.69", "4.90", "3", "45.1% (10.8% Lote)"],
            ["SUB_SEGMENTO_DN", "Linha de Recalque", "DN 90 mm", "3007.50", "3.01", "2", "27.7% (6.6% Lote)"],
            ["SUB_SEGMENTO_DN", "Linha de Recalque", "DN 150 mm", "1733.15", "1.73", "5", "15.9% (3.8% Lote)"],
            ["SUB_SEGMENTO_DN", "Linha de Recalque", "DN 110 mm", "850.59", "0.85", "3", "7.8% (1.9% Lote)"],
            ["SUB_SEGMENTO_DN", "Linha de Recalque", "DN 200 mm", "379.93", "0.38", "1", "3.5% (0.8% Lote)"],
            ["SEGMENTO", "Geral", "Emissario de Esgoto", "646.69", "0.65", "1", "1.4%"],
            ["SUB_SEGMENTO_DN", "Emissario de Esgoto", "DN 200 mm", "646.69", "0.65", "1", "100.0% (1.4% Lote)"],
            ["MATERIAL_DN", "PVC", "DN 150 mm", "35005.26", "35.01", "491", "77.1%"],
            ["MATERIAL_DN", "FOFO (Ferro Fundido)", "DN 100 mm", "3000.31", "3.00", "1", "6.6%"],
            ["MATERIAL_DN", "PEAD", "DN 90 mm", "2068.83", "2.07", "1", "4.6%"],
            ["MATERIAL_DN", "PVC-O", "DN 100 mm", "1899.38", "1.90", "2", "4.2%"],
            ["MATERIAL_DN", "PVC-O", "DN 200 mm", "1026.63", "1.03", "2", "2.3%"],
            ["MATERIAL_DN", "PVC", "DN 90 mm", "938.67", "0.94", "1", "2.1%"],
            ["MATERIAL_DN", "PEAD", "DN 110 mm", "850.59", "0.85", "3", "1.9%"],
            ["MATERIAL_DN", "PEAD", "DN 150 mm", "623.31", "0.62", "3", "1.4%"],
            ["MATERIAL_DN", "PVC-O", "DN 150 mm", "5.14", "0.01", "1", "0.0%"]
        ];

        let csvContent = rows.map(r => r.join(";")).join("\n");
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Caderno_Quantitativos_Bairros_Engeform_Sabesp_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const btnExportQuantCsv = document.getElementById('btn-export-quant-csv');
    const btnExportGeralCsv = document.getElementById('btn-export-geral-csv');
    const btnExportQuantModal = document.getElementById('btn-export-quant-modal');
    if (btnExportQuantCsv) btnExportQuantCsv.addEventListener('click', handleExportQuant);
    if (btnExportGeralCsv) btnExportGeralCsv.addEventListener('click', handleExportQuant);
    if (btnExportQuantModal) btnExportQuantModal.addEventListener('click', handleExportQuant);

    // 13. Map Quick Tools
    const btnFit = document.getElementById('btn-tool-fit');
    if (btnFit) {
        btnFit.addEventListener('click', function() {
            window.GIS_LAYERS.highlightBairro(null);
            map.fitBounds(initialBounds, { padding: [30, 30] });
        });
    }

    const btnLocate = document.getElementById('btn-tool-locate');
    if (btnLocate) {
        btnLocate.addEventListener('click', function() {
            map.locate({ setView: true, maxZoom: 15 });
        });
    }

    const btnExportCSV = document.getElementById('btn-export-csv');
    if (btnExportCSV) {
        btnExportCSV.addEventListener('click', function() {
            window.GIS_FILTERS.exportCSV();
        });
    }

    const btnPrintMap = document.getElementById('btn-print-map');
    if (btnPrintMap) {
        btnPrintMap.addEventListener('click', function() {
            window.print();
        });
    }

    // 14. Dynamic Extensão por Tipo de Rede Widget Updater (Status Concluído)
    function updateSegmentWidget(bairroTarget) {
        const titleEl = document.getElementById('segment-widget-title');
        const container = document.getElementById('segment-dropdowns-container');
        if (!container) return;

        const normTarget = bairroTarget ? bairroTarget.toUpperCase().trim() : null;

        // Se nenhuma frente de obra estiver selecionada, manter sem informações
        if (!normTarget) {
            if (titleEl) {
                titleEl.innerHTML = `<i class="fas fa-network-wired"></i> Obras lineares`;
            }
            container.innerHTML = `
                <div class="quant-empty-state">
                    <i class="fas fa-hand-pointer"></i>
                    <span>Selecione uma frente de obra na lista suspensa acima para exibir as informações.</span>
                </div>
            `;
            return;
        }

        // Filter linear features by selected bairro if active
        let filteredFeatures = window.GIS_DATA.linear.features.filter(f => {
            const b = (f.properties.bairro || '').toUpperCase().trim();
            if (!b) return false;
            if (b === normTarget) return true;
            if (normTarget.startsWith("PEDRAS E VITÓRIA") && b.startsWith("PEDRAS E VITÓRIA")) return true;
            return false;
        });

        // Calculate total extension and execution status metrics
        let totalExt = 0;
        let totalExtConcluido = 0;
        const segData = {};

        filteredFeatures.forEach(f => {
            const p = f.properties;
            const ext = parseFloat(p.ext_calcul || 0);
            const seg = (p.segmento || 'REDE COLETORA').trim().toUpperCase();
            const dn = parseInt(p.dn_nominal || 0);
            const st = (p.status || 'NÃO INICIADO').trim().toUpperCase();
            const isConcluido = (st === 'CONCLUÍDO' || st === 'EXECUTADA');

            totalExt += ext;
            if (isConcluido) totalExtConcluido += ext;

            if (!segData[seg]) {
                segData[seg] = { 
                    ext: 0, 
                    extConcluido: 0,
                    trechos: 0, 
                    dns: {},
                    bairros: {}
                };
            }
            segData[seg].ext += ext;
            if (isConcluido) {
                segData[seg].extConcluido += ext;
            }
            segData[seg].trechos += 1;

            if (dn) {
                if (!segData[seg].dns[dn]) segData[seg].dns[dn] = { ext: 0, extConcluido: 0 };
                segData[seg].dns[dn].ext += ext;
                if (isConcluido) segData[seg].dns[dn].extConcluido += ext;
            }

            // Track individual bairro breakdown for each segment
            let bName = (p.bairro || 'OUTROS').trim().toUpperCase();
            if (bName.startsWith('PEDRAS E VITÓRIA')) bName = 'PEDRAS E VITÓRIA';
            if (!segData[seg].bairros[bName]) {
                segData[seg].bairros[bName] = { ext: 0, extConcluido: 0 };
            }
            segData[seg].bairros[bName].ext += ext;
            if (isConcluido) {
                segData[seg].bairros[bName].extConcluido += ext;
            }
        });

        // Update widget subtitle
        const totalPctConcluido = totalExt > 0 ? ((totalExtConcluido / totalExt) * 100).toFixed(1) : '0.0';
        if (titleEl) {
            const bLabel = normTarget.startsWith("PEDRAS E VITÓRIA") ? "Pedras e Vitória (Guareí)" : 
                           (normTarget === "SERRA DA PRATA" ? "Serra da Prata (Paranapanema)" :
                           (normTarget === "POCINHO" ? "Pocinho (São Miguel Arcanjo)" :
                           (normTarget === "JARDIM AEROPORTO" ? "Jardim Aeroporto (Itapetininga)" : bairroTarget)));
            titleEl.innerHTML = `<i class="fas fa-network-wired"></i> Obras lineares — <strong style="color:#ffffff;">${bLabel}</strong> (${(totalExt/1000).toFixed(2).replace('.', ',')} km • <span style="color:#10b981;">${totalPctConcluido.replace('.', ',')}% Concluído</span>)`;
        }

        const SEG_INFO = {
            'REDE COLETORA': { name: 'Rede Coletora de Esgoto', color: '#2563eb' },
            'REDE COLETORA DE ESGOTO': { name: 'Rede Coletora de Esgoto', color: '#2563eb' },
            'LINHA DE RECALQUE': { name: 'Linha de Recalque', color: '#dc2626' },
            'EMISSÁRIO': { name: 'Emissário de Esgoto', color: '#ea580c' },
            'EMISSÁRIO DE ESGOTO': { name: 'Emissário de Esgoto', color: '#ea580c' }
        };

        const DN_COLORS = {
            150: '#2563eb',
            100: '#0284c7',
            90: '#10b981',
            110: '#f59e0b',
            200: '#8b5cf6'
        };

        let html = '';
        const segKeys = Object.keys(segData).sort((a,b) => segData[b].ext - segData[a].ext);

        segKeys.forEach(segKey => {
            const data = segData[segKey];
            const info = SEG_INFO[segKey] || { name: segKey, color: '#919389' };
            const pctConcluido = data.ext > 0 ? ((data.extConcluido / data.ext) * 100).toFixed(1) : '0.0';
            const extKm = (data.ext / 1000).toFixed(2).replace('.', ',');
            const extMStr = data.ext.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m';
            const extConcMStr = data.extConcluido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m';
            const trechoText = data.trechos === 1 ? '1 trecho' : `${data.trechos} trechos`;

            // Build chips for Bairros if in Geral view (no single bairro selected)
            let bairrosListHtml = '';
            if (!normTarget) {
                const BAIRRO_DISPLAY_NAMES = {
                    'PEDRAS E VITÓRIA': 'Pedras e Vitória',
                    'SERRA DA PRATA': 'Serra da Prata',
                    'POCINHO': 'Pocinho',
                    'JARDIM AEROPORTO': 'Jd. Aeroporto'
                };
                const bKeys = Object.keys(data.bairros);
                if (bKeys.length > 0) {
                    bairrosListHtml = `<div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:0.35rem;">`;
                    bKeys.forEach(bk => {
                        const bData = data.bairros[bk];
                        const bPct = bData.ext > 0 ? ((bData.extConcluido / bData.ext) * 100).toFixed(1) : '0.0';
                        const bDisplayName = BAIRRO_DISPLAY_NAMES[bk] || bk;
                        const badgeColor = parseFloat(bPct) > 0 ? '#10b981' : '#94a3b8';
                        bairrosListHtml += `
                            <span style="font-size:0.68rem; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:4px; padding:1px 5px; color:#cbd5e1;">
                                ${bDisplayName}: <strong style="color:${badgeColor};">${bPct.replace('.', ',')}%</strong>
                            </span>
                        `;
                    });
                    bairrosListHtml += `</div>`;
                }
            }

            html += `
                <details class="quant-dropdown">
                    <summary class="quant-summary">
                        <div class="quant-summary-main">
                            <span class="quant-title-text"><i class="fas fa-circle" style="color:${info.color}; font-size:9px; margin-right:4px;"></i> ${info.name}</span>
                            <strong class="quant-value-text">${extMStr} (${extKm} km)</strong>
                        </div>
                        <div class="quant-bar-bg" title="Concluído: ${pctConcluido.replace('.', ',')}% (${extConcMStr})">
                            <div class="quant-bar-fill" style="width: ${pctConcluido}%; background: #10b981;"></div>
                        </div>
                        <div class="quant-sub-info">
                            <span>Status Concluído: <strong style="color:#10b981;">${pctConcluido.replace('.', ',')}%</strong> ${normTarget ? 'no bairro' : 'no lote'} (${extConcMStr})</span>
                            <span class="quant-toggle-badge">Ver Diâmetros <i class="fas fa-chevron-down"></i></span>
                        </div>
                        ${bairrosListHtml}
                    </summary>
                    <div class="quant-dropdown-content">
            `;

            const dnKeys = Object.keys(data.dns).sort((a,b) => data.dns[b].ext - data.dns[a].ext);
            dnKeys.forEach(dn => {
                const dnData = data.dns[dn];
                const dnExt = dnData.ext;
                const dnPct = data.ext > 0 ? ((dnExt / data.ext) * 100).toFixed(1) : '0.0';
                const dnPctConc = dnExt > 0 ? ((dnData.extConcluido / dnExt) * 100).toFixed(1) : '0.0';
                const dnMStr = dnExt.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m';
                const dnConcMStr = dnData.extConcluido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m';
                const dnColor = DN_COLORS[dn] || info.color;

                html += `
                    <div class="quant-sub-row">
                        <div class="quant-header-row">
                            <span class="quant-title-text" style="font-size:0.8rem; color:var(--engeform-light-taupe);"><i class="fas fa-ruler-horizontal"></i> Sub-DN ${dn} mm</span>
                            <strong class="quant-value-text" style="font-size:0.8rem;">${dnMStr} (${dnPct.replace('.', ',')}%)</strong>
                        </div>
                        <div class="quant-bar-bg" style="height:5px;" title="Concluído: ${dnPctConc.replace('.', ',')}%">
                            <div class="quant-bar-fill" style="width: ${dnPctConc}%; background:#10b981;"></div>
                        </div>
                        <div style="font-size:0.7rem; color:#94a3b8; display:flex; justify-content:space-between; margin-top:2px;">
                            <span>Concluído: <strong style="color:#10b981;">${dnPctConc.replace('.', ',')}%</strong> (${dnConcMStr})</span>
                            <span>${(dnExt/1000).toFixed(2).replace('.', ',')} km</span>
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                </details>
            `;
        });

        container.innerHTML = html;
    }

    // 15. Dynamic Obras Localizadas (EEE) Widget Updater
    function updateLocalizadaWidget(bairroTarget) {
        const titleEl = document.getElementById('localizada-widget-title');
        const container = document.getElementById('localizada-container');
        if (!container) return;

        const normTarget = bairroTarget ? bairroTarget.toUpperCase().trim() : null;

        // Se nenhuma frente de obra estiver selecionada, manter sem informações
        if (!normTarget) {
            if (titleEl) {
                titleEl.innerHTML = `<i class="fas fa-industry"></i> Obras Localizadas (EEE)`;
            }
            container.innerHTML = `
                <div class="quant-empty-state">
                    <i class="fas fa-hand-pointer"></i>
                    <span>Selecione uma frente de obra na lista suspensa acima para exibir as informações.</span>
                </div>
            `;
            return;
        }

        // Filter localizadas features by selected bairro if active
        let filteredFeatures = window.GIS_DATA.localizada.features.filter(f => {
            const b = (f.properties.bairro || '').toUpperCase().trim();
            if (!b) return false;
            if (b === normTarget) return true;
            if (normTarget.startsWith("PEDRAS E VITÓRIA") && b.startsWith("PEDRAS E VITÓRIA")) return true;
            return false;
        });

        const count = filteredFeatures.length;

        // Update widget title
        if (titleEl) {
            const bLabel = normTarget.startsWith("PEDRAS E VITÓRIA") ? "Pedras e Vitória (Guareí)" : 
                           (normTarget === "SERRA DA PRATA" ? "Serra da Prata (Paranapanema)" :
                           (normTarget === "POCINHO" ? "Pocinho (São Miguel Arcanjo)" :
                           (normTarget === "JARDIM AEROPORTO" ? "Jardim Aeroporto (Itapetininga)" : bairroTarget)));
            titleEl.innerHTML = `<i class="fas fa-industry"></i> Obras Localizadas (EEE) — <strong style="color:#ffffff;">${bLabel}</strong> (${count} ${count === 1 ? 'EEE' : 'EEEs'})`;
        }

        if (count === 0) {
            container.innerHTML = `<div class="quant-empty-state"><span>Nenhuma obra localizada (EEE) cadastrada nesta frente de obra.</span></div>`;
            return;
        }

        let html = '';
        filteredFeatures.forEach((f, idx) => {
            const p = f.properties;
            const q = floatVal(p.q_proj);
            const pot = floatVal(p.pot_cv);
            const alt = floatVal(p.altura_man);
            const status = p.status || 'NÃO INICIADO';
            const lat = f.geometry.coordinates[1];
            const lng = f.geometry.coordinates[0];

            html += `
                <div class="eee-unit-card" data-lat="${lat}" data-lng="${lng}" style="cursor:pointer;" title="Clique para aproximar nesta EEE no mapa">
                    <div class="eee-unit-header">
                        <span><i class="fas fa-industry" style="color:var(--engeform-light-taupe); margin-right:4px;"></i> EEE #${idx+1} — ${p.ae_id || 'EEE'}</span>
                        <span class="popup-badge nao-iniciado" style="font-size:0.7rem;">${status}</span>
                    </div>
                    <div class="eee-unit-grid">
                        <div>Vazão: <span class="eee-unit-val">${q > 0 ? q.toFixed(2).replace('.', ',') + ' L/s' : '-'}</span></div>
                        <div>Potência: <span class="eee-unit-val">${pot > 0 ? pot.toFixed(2).replace('.', ',') + ' CV' : '-'}</span></div>
                        <div>Altura Man.: <span class="eee-unit-val">${alt > 0 ? alt.toFixed(1).replace('.', ',') + ' mca' : '-'}</span></div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Clique no card da EEE para aproximar diretamente no mapa (Zoom 16) e abrir popup
        container.querySelectorAll('.eee-unit-card').forEach(card => {
            card.addEventListener('click', function() {
                const lat = parseFloat(this.dataset.lat);
                const lng = parseFloat(this.dataset.lng);
                if (!isNaN(lat) && !isNaN(lng) && window.GIS_MAP) {
                    window.GIS_MAP.flyTo([lat, lng], 16, { animate: true, duration: 1.0 });
                    setTimeout(() => {
                        const localGroup = window.GIS_LAYERS.getLayerGroup('localizada');
                        if (localGroup) {
                            localGroup.eachLayer(m => {
                                if (m.getLatLng && Math.abs(m.getLatLng().lat - lat) < 0.0001 && Math.abs(m.getLatLng().lng - lng) < 0.0001) {
                                    m.openPopup();
                                }
                            });
                        }
                    }, 1100);
                }
            });
        });
    }

    function floatVal(val) {
        if (!val) return 0;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
    }

    // Initialize widgets on load
    updateSegmentWidget(null);
    updateLocalizadaWidget(null);

    // 16. Interactive Clickable Frente de Obra Logic (Clickable Bairro Cards & Accordion)
    let activeBairroFilter = null;
    const bairroCards = document.querySelectorAll('.bairro-card');
    const badgeFrente = document.getElementById('badge-frente-obra-quant');
    const dropdownFrente = document.getElementById('dropdown-frente-obra-quant');

    function selectBairro(bairroTarget, isToggle = false) {
        if (!bairroTarget || (isToggle && activeBairroFilter === bairroTarget)) {
            // Deselect / Reset to Lote 4
            activeBairroFilter = null;
            bairroCards.forEach(c => c.classList.remove('active-bairro'));
            if (badgeFrente) badgeFrente.innerHTML = 'Ver Frentes (6) <i class="fas fa-chevron-down"></i>';

            updateSegmentWidget(null);
            updateLocalizadaWidget(null);

            if (window.GIS_LAYERS) window.GIS_LAYERS.highlightBairro(null);
            window.GIS_MAP.fitBounds(initialBounds, { padding: [30, 30] });
        } else {
            // Select new Frente de Obra
            activeBairroFilter = bairroTarget;
            bairroCards.forEach(c => {
                if (c.dataset.bairro === bairroTarget) {
                    c.classList.add('active-bairro');
                } else {
                    c.classList.remove('active-bairro');
                }
            });
            if (badgeFrente) badgeFrente.innerHTML = `${bairroTarget} <i class="fas fa-check"></i>`;

            updateSegmentWidget(bairroTarget);
            updateLocalizadaWidget(bairroTarget);

            if (window.GIS_LAYERS) window.GIS_LAYERS.highlightBairro(bairroTarget);

            // Zoom map to fit matching features of the selected bairro (both current and original scope)
            const normTarget = bairroTarget.toUpperCase().trim();
            const predicate = function(feature) {
                const b = (feature.properties.bairro || '').toUpperCase().trim();
                if (!b) return false;
                if (b === normTarget) return true;
                if (normTarget.startsWith("PEDRAS E VITÓRIA") && b.startsWith("PEDRAS E VITÓRIA")) return true;
                if (normTarget.startsWith("TURVO DOS ALMEIDAS") && b.startsWith("TURVO DOS ALMEIDAS")) return true;
                return false;
            };

            const matchingLinear = window.GIS_DATA.linear.features.filter(predicate);
            const matchingAreas = window.GIS_DATA.areas.features.filter(predicate);
            const matchingLocal = window.GIS_DATA.localizada.features.filter(predicate);

            let combined = [...matchingLinear, ...matchingAreas, ...matchingLocal];

            // Include Escopo Original features in zoom bounds
            if (window.GIS_ESCOPO_ORIGINAL) {
                if (window.GIS_ESCOPO_ORIGINAL.linear && window.GIS_ESCOPO_ORIGINAL.linear.features) {
                    combined = combined.concat(window.GIS_ESCOPO_ORIGINAL.linear.features.filter(predicate));
                }
                if (window.GIS_ESCOPO_ORIGINAL.areas && window.GIS_ESCOPO_ORIGINAL.areas.features) {
                    combined = combined.concat(window.GIS_ESCOPO_ORIGINAL.areas.features.filter(predicate));
                }
                if (window.GIS_ESCOPO_ORIGINAL.pontual && window.GIS_ESCOPO_ORIGINAL.pontual.features) {
                    combined = combined.concat(window.GIS_ESCOPO_ORIGINAL.pontual.features.filter(predicate));
                }
            }

            if (combined.length > 0) {
                const tempGroup = L.geoJSON({ type: "FeatureCollection", features: combined });
                const bounds = tempGroup.getBounds();
                if (bounds.isValid()) {
                    window.GIS_MAP.fitBounds(bounds, { maxZoom: 15, padding: [60, 60] });
                }
            }
        }
    }

    // Expose selectBairro globally for centroid markers and external integrations
    window.selectBairro = selectBairro;

    bairroCards.forEach(card => {
        card.addEventListener('click', function() {
            const bairroTarget = this.dataset.bairro;
            if (!bairroTarget) {
                selectBairro(null, false);
                return;
            }
            selectBairro(bairroTarget, true);
        });
    });

    console.log("Portal WebGIS Engeform & Sabesp ready with Dynamic Bairro Segment & Obras Localizadas Widgets!");
});
