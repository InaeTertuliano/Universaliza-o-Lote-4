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

            // Garante que a lista suspensa de frentes na Visão Detalhada fique sempre recolhida
            const dropFrenteEl = document.getElementById('dropdown-frente-obra-quant');
            if (dropFrenteEl) {
                dropFrenteEl.open = false;
            }

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
                if (layerName.startsWith('orig-') && e.target.checked) {
                    const selLegend = document.getElementById('select-legend-mode');
                    if (selLegend && selLegend.value !== 'escopo') {
                        selLegend.value = 'escopo';
                        if (window.GIS_LAYERS && typeof window.GIS_LAYERS.setLegendMode === 'function') {
                            window.GIS_LAYERS.setLegendMode('escopo');
                        }
                    }
                }
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
            // Ativa o modo escopo para que as camadas do escopo original fiquem visíveis no mapa
            const selLegend = document.getElementById('select-legend-mode');
            if (selLegend) selLegend.value = 'escopo';
            if (window.GIS_LAYERS && typeof window.GIS_LAYERS.setLegendMode === 'function') {
                window.GIS_LAYERS.setLegendMode('escopo');
            }
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

    // 12. Quantitativos CSV Export (Dinamico a partir das camadas carregadas)
    const handleExportQuant = function() {
        const rows = [
            ["CATEGORIA", "MUNICIPIO / DESCRICAO", "BAIRRO / DIAMETRO", "EXTENSAO_METROS", "EXTENSAO_KM", "TRECHOS", "PERCENTUAL_LOTE"]
        ];

        const features = (window.GIS_DATA && window.GIS_DATA.linear && window.GIS_DATA.linear.features) ? window.GIS_DATA.linear.features : [];
        let totalExt = 0;
        const bairros = {};
        const segmentos = {};
        const subSegs = {};
        const materiais = {};

        features.forEach(f => {
            const p = f.properties || {};
            const ext = parseFloat(p.ext_calcul || 0);
            const mun = (p.nm_mun || 'OUTROS').trim();
            const b = (p.bairro || 'OUTROS').trim().toUpperCase();
            const seg = (p.segmento || 'REDE COLETORA').trim().toUpperCase();
            const dn = p.dn_nominal ? `DN ${parseInt(p.dn_nominal)} mm` : 'DN N/D';
            const mat = (p.material || 'PVC').trim().toUpperCase();

            totalExt += ext;

            if (!bairros[b]) bairros[b] = { mun: mun, ext: 0, trechos: 0 };
            bairros[b].ext += ext;
            bairros[b].trechos += 1;

            if (!segmentos[seg]) segmentos[seg] = { ext: 0, trechos: 0 };
            segmentos[seg].ext += ext;
            segmentos[seg].trechos += 1;

            const subKey = `${seg}|${dn}`;
            if (!subSegs[subKey]) subSegs[subKey] = { seg: seg, dn: dn, ext: 0, trechos: 0 };
            subSegs[subKey].ext += ext;
            subSegs[subKey].trechos += 1;

            const matKey = `${mat}|${dn}`;
            if (!materiais[matKey]) materiais[matKey] = { mat: mat, dn: dn, ext: 0, trechos: 0 };
            materiais[matKey].ext += ext;
            materiais[matKey].trechos += 1;
        });

        Object.keys(bairros).sort((a,b) => bairros[b].ext - bairros[a].ext).forEach(bKey => {
            const item = bairros[bKey];
            const pct = totalExt > 0 ? ((item.ext / totalExt) * 100).toFixed(1) + '%' : '0.0%';
            rows.push(["BAIRRO", item.mun, bKey, item.ext.toFixed(2), (item.ext/1000).toFixed(2), String(item.trechos), pct]);
        });

        Object.keys(segmentos).sort((a,b) => segmentos[b].ext - segmentos[a].ext).forEach(sKey => {
            const item = segmentos[sKey];
            const pct = totalExt > 0 ? ((item.ext / totalExt) * 100).toFixed(1) + '%' : '0.0%';
            rows.push(["SEGMENTO", "Geral", sKey, item.ext.toFixed(2), (item.ext/1000).toFixed(2), String(item.trechos), pct]);
        });

        Object.keys(subSegs).sort((a,b) => subSegs[b].ext - subSegs[a].ext).forEach(k => {
            const item = subSegs[k];
            const pct = totalExt > 0 ? ((item.ext / totalExt) * 100).toFixed(1) + '%' : '0.0%';
            rows.push(["SUB_SEGMENTO_DN", item.seg, item.dn, item.ext.toFixed(2), (item.ext/1000).toFixed(2), String(item.trechos), pct]);
        });

        Object.keys(materiais).sort((a,b) => materiais[b].ext - materiais[a].ext).forEach(k => {
            const item = materiais[k];
            const pct = totalExt > 0 ? ((item.ext / totalExt) * 100).toFixed(1) + '%' : '0.0%';
            rows.push(["MATERIAL_DN", item.mat, item.dn, item.ext.toFixed(2), (item.ext/1000).toFixed(2), String(item.trechos), pct]);
        });

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
            if (window.GIS_EXPORTER && typeof window.GIS_EXPORTER.openModal === 'function') {
                window.GIS_EXPORTER.openModal('linear');
            } else if (window.GIS_FILTERS) {
                window.GIS_FILTERS.exportCSV();
            }
        });
    }

    const btnPrintMap = document.getElementById('btn-print-map');
    if (btnPrintMap) {
        btnPrintMap.addEventListener('click', function() {
            window.print();
        });
    }

    // 14. Dynamic Extensão por Tipo de Rede Widget Updater (Status Concluído)
    function getBairroDisplayLabel(bairroTarget) {
        if (!bairroTarget) return 'Lote 4 (Geral)';
        const normTarget = (bairroTarget || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
        if (window.GIS_LAYERS && typeof window.GIS_LAYERS.getBairroCentroids === 'function') {
            const found = window.GIS_LAYERS.getBairroCentroids().find(c => {
                const nId = (c.id || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
                const nNome = (c.nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
                return nId === normTarget || nNome === normTarget;
            });
            if (found) return `${found.nome} (${found.municipio})`;
        }
        return bairroTarget;
    }

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
            const bLabel = getBairroDisplayLabel(bairroTarget);
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

        if (filteredFeatures.length === 0) {
            container.innerHTML = `
                <div class="quant-empty-state">
                    <i class="fas fa-info-circle" style="color:#38bdf8;"></i>
                    <span>Frente de Obra cadastrada na Camada AE (Planejamento / Projeto Executivo). Nenhuma rede linear lançada nesta etapa.</span>
                </div>
            `;
            return;
        }

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

    // 15. Dynamic Obras Localizadas Widget Updater (Painel Visão Detalhada)
    // REQUISITO: No quadro localizadas NÃO DEVEM APARECER poços de esgoto e nós da camada localizadas!
    // Apenas instalações de grande porte (EEE, EEAT, Reservatórios, ETAs, Boosters, Poços Profundos)
    function updateLocalizadaWidget(bairroTarget) {
        const titleEl = document.getElementById('localizada-widget-title');
        const container = document.getElementById('localizada-container');
        if (!container) return;

        const normTarget = bairroTarget ? normStr(bairroTarget) : null;

        // Se nenhuma frente de obra estiver selecionada, exibir estado vazio
        if (!normTarget) {
            if (titleEl) {
                titleEl.innerHTML = `<i class="fas fa-industry"></i> Obras Localizadas (Instalações)`;
            }
            container.innerHTML = `
                <div class="quant-empty-state">
                    <i class="fas fa-hand-pointer"></i>
                    <span>Selecione uma frente de obra na lista suspensa acima para exibir as informações.</span>
                </div>
            `;
            return;
        }

        // Filtrar feições da camada localizada pertencentes à frente selecionada
        // RESTRITO a instalações principais (major facilities) - Poços e Nós são 100% excluídos deste quadro
        let filteredFeatures = [];
        if (window.GIS_DATA && window.GIS_DATA.localizada && window.GIS_DATA.localizada.features) {
            filteredFeatures = window.GIS_DATA.localizada.features.filter(f => {
                const p = f.properties || {};
                const b = normStr(p.bairro || '');
                if (!b) return false;

                let matchesBairro = (b === normTarget);
                if (!matchesBairro && normTarget.startsWith("PEDRAS E VITORIA") && b.startsWith("PEDRAS E VITORIA")) matchesBairro = true;
                if (!matchesBairro && normTarget.startsWith("TURVO DOS ALMEIDAS") && b.startsWith("TURVO DOS ALMEIDAS")) matchesBairro = true;
                if (!matchesBairro && (normTarget.includes(b) || b.includes(normTarget))) matchesBairro = true;
                if (!matchesBairro) return false;

                // Classificação rigorosa: somente grandes instalações (EEE, EEAT, Reservatório, Booster, ETA, Poço Profundo)
                let cat = 'no';
                if (window.GIS_LAYERS && typeof window.GIS_LAYERS.getLocalizadaCategory === 'function') {
                    cat = window.GIS_LAYERS.getLocalizadaCategory(p);
                } else {
                    const seg = (p.segmento || p.nome || p.Name || '').toString().trim().toUpperCase();
                    if (seg.includes('EEE') || seg.includes('EEAT') || seg.includes('ETE') ||
                        seg.includes('RESERVAT') || seg.includes('BOOSTER') || seg.includes('ETA') ||
                        seg.includes('POÇO PROFUNDO') || seg.includes('POCO PROFUNDO')) {
                        cat = 'major';
                    }
                }

                return cat === 'major';
            });
        }

        const count = filteredFeatures.length;

        // Atualizar título do quadro com contagem de instalações
        if (titleEl) {
            const bLabel = getBairroDisplayLabel(bairroTarget);
            const countLabel = count === 1 ? '1 Instalação' : `${count} Instalações`;
            titleEl.innerHTML = `<i class="fas fa-industry"></i> Obras Localizadas — <strong style="color:#ffffff;">${bLabel}</strong> (${countLabel})`;
        }

        if (count === 0) {
            container.innerHTML = `
                <div class="quant-empty-state">
                    <i class="fas fa-info-circle" style="color:var(--text-muted-dark); font-size:1.1rem; margin-bottom:4px;"></i>
                    <span>Nenhuma instalação de grande porte (EEE/Reservatório) cadastrada nesta frente de obra.</span>
                </div>
            `;
            return;
        }

        let html = '';
        filteredFeatures.forEach((f, idx) => {
            const p = f.properties || {};
            const seg = (p.segmento || 'EEE').toUpperCase();
            const nomeInstalacao = p.nome || p.ae_id || p.Name || `${seg} #${idx+1}`;
            const status = p.status || 'NÃO INICIADO';
            const statusClass = (status || 'não-iniciado').toLowerCase().replace(/ /g, '-').replace(/ã/g, 'a').replace(/õ/g, 'o');

            // Ícone temático conforme tipo de infraestrutura
            let faIcon = 'fa-industry';
            if (seg.includes('RESERVAT')) faIcon = 'fa-water';
            else if (seg.includes('POÇO') || seg.includes('POCO')) faIcon = 'fa-droplet';
            else if (seg.includes('BOOSTER') || seg.includes('EEAT')) faIcon = 'fa-bolt';
            else if (seg.includes('ETA')) faIcon = 'fa-filter';

            const q = floatVal(p.q_proj);
            const pot = floatVal(p.pot_cv);
            const alt = floatVal(p.altura_man);
            const vol = floatVal(p.vol_proj || p.vol_total);
            const lat = f.geometry ? f.geometry.coordinates[1] : (p.latitude || 0);
            const lng = f.geometry ? f.geometry.coordinates[0] : (p.longitude || 0);

            let metricasHtml = '';
            if (vol > 0) {
                metricasHtml = `
                    <div>Tipo: <span class="eee-unit-val">${seg}</span></div>
                    <div>Volume: <span class="eee-unit-val" style="color:#38bdf8; font-weight:800;">${vol.toLocaleString('pt-BR')} m³</span></div>
                    <div>Produto: <span class="eee-unit-val">${p.produto || 'ÁGUA'}</span></div>
                `;
            } else {
                metricasHtml = `
                    <div>Vazão: <span class="eee-unit-val">${q > 0 ? q.toFixed(2).replace('.', ',') + ' L/s' : '-'}</span></div>
                    <div>Potência: <span class="eee-unit-val">${pot > 0 ? pot.toFixed(1).replace('.', ',') + ' CV' : '-'}</span></div>
                    <div>Alt. Man.: <span class="eee-unit-val">${alt > 0 ? alt.toFixed(1).replace('.', ',') + ' mca' : '-'}</span></div>
                `;
            }

            html += `
                <div class="eee-unit-card" data-lat="${lat}" data-lng="${lng}" style="cursor:pointer;" title="Clique para aproximar nesta instalação no mapa">
                    <div class="eee-unit-header">
                        <span><i class="fas ${faIcon}" style="color:var(--engeform-light-taupe); margin-right:5px;"></i> <strong>${nomeInstalacao}</strong> <span style="font-size:0.75rem; color:#94a3b8;">(${seg})</span></span>
                        <span class="popup-badge ${statusClass}" style="font-size:0.68rem;">${status}</span>
                    </div>
                    <div class="eee-unit-grid">
                        ${metricasHtml}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Clique no card para aproximar diretamente no mapa (Zoom 16) e abrir popup
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

    function normStr(str) {
        return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    }

    function selectBairro(bairroTarget, isToggle = false) {
        if (!bairroTarget || (isToggle && activeBairroFilter === bairroTarget)) {
            // Deselect / Reset to Lote 4
            activeBairroFilter = null;
            bairroCards.forEach(c => c.classList.remove('active-bairro'));
            const totalFrentes = (window.GIS_LAYERS && window.GIS_LAYERS.getBairroCentroids) ? window.GIS_LAYERS.getBairroCentroids().length : 28;
            if (badgeFrente) badgeFrente.innerHTML = `Ver Frentes (${totalFrentes}) <i class="fas fa-chevron-down"></i>`;

            updateSegmentWidget(null);
            updateLocalizadaWidget(null);

            if (window.GIS_LAYERS) window.GIS_LAYERS.highlightBairro(null);
            window.GIS_MAP.fitBounds(initialBounds, { padding: [30, 30] });
        } else {
            // Select new Frente de Obra
            activeBairroFilter = bairroTarget;
            const normTarget = normStr(bairroTarget);

            bairroCards.forEach(c => {
                if (normStr(c.dataset.bairro) === normTarget) {
                    c.classList.add('active-bairro');
                } else {
                    c.classList.remove('active-bairro');
                }
            });
            if (badgeFrente) badgeFrente.innerHTML = `${bairroTarget} <i class="fas fa-chevron-down" style="font-size:0.75rem; margin-left:3px;"></i>`;

            updateSegmentWidget(bairroTarget);
            updateLocalizadaWidget(bairroTarget);

            if (window.GIS_LAYERS) window.GIS_LAYERS.highlightBairro(bairroTarget);

            // Zoom map to fit matching features of the selected bairro (both current and original scope)
            const predicate = function(feature) {
                const props = feature.properties || {};
                const b = normStr(props.frente || props.bairro || '');
                if (!b) return false;
                if (b === normTarget) return true;
                if (normTarget.startsWith("PEDRAS E VITORIA") && b.startsWith("PEDRAS E VITORIA")) return true;
                if (normTarget.startsWith("TURVO DOS ALMEIDAS") && b.startsWith("TURVO DOS ALMEIDAS")) return true;
                if (normTarget.includes(b) || b.includes(normTarget)) return true;
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
            } else if (window.GIS_LAYERS && window.GIS_LAYERS.getBairroCentroids) {
                const centroids = window.GIS_LAYERS.getBairroCentroids();
                const matched = centroids.find(c => normStr(c.id) === normTarget || normStr(c.nome) === normTarget);
                if (matched) {
                    window.GIS_MAP.setView([matched.lat, matched.lng], 14);
                }
            }
        }

        // A lista de frentes de obra deve ficar permanentemente recolhida e fechar automaticamente após a escolha
        if (dropdownFrente) {
            dropdownFrente.open = false;
        }
    }

    // Expose selectBairro globally for centroid markers and external integrations
    window.selectBairro = selectBairro;
    window.getActiveBairro = function() {
        return activeBairroFilter;
    };

    bairroCards.forEach(card => {
        card.addEventListener('click', function(e) {
            const bairroTarget = this.dataset.bairro;
            if (!bairroTarget) {
                selectBairro(null, false);
            } else {
                selectBairro(bairroTarget, true);
            }
            if (dropdownFrente) {
                dropdownFrente.open = false;
            }
        });
    });

    // Fechar automaticamente a lista suspensa ao clicar fora dela
    document.addEventListener('click', function(e) {
        if (dropdownFrente && dropdownFrente.open && !dropdownFrente.contains(e.target)) {
            dropdownFrente.open = false;
        }
    });

    // Fechar com a tecla ESC caso esteja aberta
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && dropdownFrente && dropdownFrente.open) {
            dropdownFrente.open = false;
        }
    });

    
    // 17. Search & Municipality Filter for 169 Frentes de Obra (Camada AE)
    const searchFrentesInput = document.getElementById('search-frentes-input');
    const selectMunFrentes = document.getElementById('select-mun-frentes');

    function filterFrentesUI() {
        const term = (searchFrentesInput ? searchFrentesInput.value : '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
        const selMun = (selectMunFrentes ? selectMunFrentes.value : '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
        
        document.querySelectorAll('.frentes-scroll-container .bairro-card').forEach(card => {
            const b = (card.dataset.bairro || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
            const m = (card.dataset.mun || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
            const matchTerm = !term || b.includes(term) || m.includes(term);
            const matchMun = !selMun || m === selMun;
            card.style.display = (matchTerm && matchMun) ? '' : 'none';
        });
    }

    if (searchFrentesInput) searchFrentesInput.addEventListener('input', filterFrentesUI);
    if (selectMunFrentes) selectMunFrentes.addEventListener('change', filterFrentesUI);

    console.log("Portal WebGIS Engeform & Sabesp ready with Dynamic Bairro Segment & Obras Localizadas Widgets!");
});
