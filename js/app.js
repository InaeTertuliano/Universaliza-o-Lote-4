/* ==========================================================================
   WEBGIS MAIN APPLICATION INITIALIZER - ENGEFORM & SABESP THEME
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
    console.log("Initializing WebGIS Engeform & Sabesp Portal...");

    // Helper de normalização e cruzamento inteligente de nomes de bairros/frentes
    function cleanBairroKey(s) {
        if (!s) return "";
        let clean = (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
        clean = clean.replace(/[\.\,\-\/\_\(\)]+/g, ' ');
        clean = clean.replace(/\bJARDIM\b/g, 'JD');
        clean = clean.replace(/\bCHACARAS?\b/g, 'CH');
        clean = clean.replace(/\bIII\b/g, '3');
        clean = clean.replace(/\bII\b/g, '2');
        clean = clean.replace(/\bIV\b/g, '4');
        clean = clean.replace(/\bI\b/g, '1');
        const tokens = clean.split(/\s+/).filter(t => t && !['E', 'DO', 'DA', 'DOS', 'DAS', 'DE'].includes(t));
        return tokens.join(' ');
    }
    window.cleanBairroKey = cleanBairroKey;

    function isBairroMatch(targetBairro, featureBairro, targetMun = null, featureMun = null) {
        if (!targetBairro || !featureBairro) return false;

        if (targetMun && featureMun) {
            const kmt = cleanBairroKey(targetMun);
            const kmf = cleanBairroKey(featureMun);
            if (kmt && kmf && kmt !== kmf && !kmt.includes(kmf) && !kmf.includes(kmt)) {
                return false;
            }
        }

        const kt = cleanBairroKey(targetBairro);
        const kf = cleanBairroKey(featureBairro);
        if (!kt || !kf) return false;

        if (kt === kf) return true;

        if (kf.startsWith(kt + ' ') || kt.startsWith(kf + ' ')) {
            if (/\b\d+\b/.test(kf) && !/\b\d+\b/.test(kt)) return false;
            return true;
        }

        return false;
    }
    window.isBairroMatch = isBairroMatch;

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

    // =========================================================================
    // MODAL & CONTROLES: CONFRONTAÇÃO DE ESCOPO (ORIGINAL VS. CONSOLIDADO)
    // Permite confrontar apenas a frente selecionada na lista suspensa
    // =========================================================================
    const modalComparativo = document.getElementById('modal-comparativo-escopo');
    const btnConfrontarCard = document.getElementById('btn-confrontar-escopo');
    const btnOpenComparativoLegacy = document.getElementById('btn-open-comparativo-escopo');
    const btnCloseComparativo = document.getElementById('btn-close-modal-comparativo');
    const btnCloseComparativoFooter = document.getElementById('btn-close-modal-comparativo-footer');
    const selConfrontarCard = document.getElementById('select-confrontar-frente');
    const selConfrontarModal = document.getElementById('select-modal-confrontar-frente');
    const btnExportFrenteCsv = document.getElementById('btn-export-comparativo-frente-csv');
    const btnExportTodasCsv = document.getElementById('btn-export-comparativo-todas-csv');

    // Helper para recuperar lista das frentes comuns
    function getFrentesComparativoList() {
        if (window.FRENTES_COMPARATIVO_ESCOPO && Array.isArray(window.FRENTES_COMPARATIVO_ESCOPO) && window.FRENTES_COMPARATIVO_ESCOPO.length > 0) {
            return window.FRENTES_COMPARATIVO_ESCOPO;
        }
        return [];
    }

    // Enquadra a área da frente no mapa e ativa a legenda de escopo
    function enquadrarFrenteNoMapa(bairro, mun) {
        // 1. Ativa a legenda "Classificar por Escopo"
        const selLegend = document.getElementById('select-legend-mode');
        if (selLegend) selLegend.value = 'escopo';
        if (window.GIS_LAYERS && typeof window.GIS_LAYERS.setLegendMode === 'function') {
            window.GIS_LAYERS.setLegendMode('escopo');
        }

        // 2. Chama selectBairro para destacar feições
        if (window.selectBairro) {
            window.selectBairro(bairro, false, mun);
        }

        // 3. Garante ajuste preciso da câmera sobre a frente selecionada
        if (window.GIS_MAP) {
            let matchedFeats = [];
            
            if (window.GIS_DATA && window.GIS_DATA.areas && window.GIS_DATA.areas.features) {
                matchedFeats = window.GIS_DATA.areas.features.filter(f => {
                    const p = f.properties || {};
                    const name = p.frente || p.bairro || '';
                    const m = p.nm_mun || '';
                    return isBairroMatch(bairro, name, mun, m);
                });
            }
            if (matchedFeats.length === 0 && window.GIS_ESCOPO_ORIGINAL && window.GIS_ESCOPO_ORIGINAL.areas && window.GIS_ESCOPO_ORIGINAL.areas.features) {
                matchedFeats = window.GIS_ESCOPO_ORIGINAL.areas.features.filter(f => {
                    const p = f.properties || {};
                    const name = p.bairro || p.frente || '';
                    const m = p.nm_mun || '';
                    return isBairroMatch(bairro, name, mun, m);
                });
            }
            if (matchedFeats.length > 0) {
                const b = L.geoJSON({ type: "FeatureCollection", features: matchedFeats }).getBounds();
                if (b.isValid()) {
                    window.GIS_MAP.fitBounds(b, { maxZoom: 16, padding: [40, 40] });
                }
            }
        }
    }

    // Renderiza o quadro simplificado no próprio painel lateral com as informações da imagem
    function renderQuadroConfrontoLateral(frenteId) {
        const list = getFrentesComparativoList();
        if (list.length === 0) return;

        let item = list.find(f => f.id === frenteId);
        if (!item && frenteId) {
            const normTarget = normStr(frenteId);
            item = list.find(f => normStr(f.frente) === normTarget || normStr(f.id) === normTarget);
        }
        if (!item) item = list[0];

        const container = document.getElementById('quadro-confronto-lateral');
        if (!container) return;

        let statusBadgeClass = 'nao-iniciado';
        const stUpper = (item.status || '').toUpperCase();
        if (stUpper.includes('CONCLU') || stUpper.includes('EXECUTAD')) {
            statusBadgeClass = 'concluido';
        } else if (stUpper.includes('INICIADO') && !stUpper.includes('NÃO') && !stUpper.includes('NAO')) {
            statusBadgeClass = 'iniciado';
        }

        // Formatação numérica
        const origKm = (item.orig.ext_m / 1000).toFixed(2).replace('.', ',') + ' km';
        const consKm = (item.cons.ext_m / 1000).toFixed(2).replace('.', ',') + ' km';
        const origM = item.orig.ext_m.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m';
        const consM = item.cons.ext_m.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m';

        const deltaSign = item.delta.m >= 0 ? '+' : '';
        const deltaMStr = deltaSign + item.delta.m.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m';
        const deltaPctStr = item.delta.pct_str;

        let deltaColor = '#10b981'; // Verde para ampliação
        if (item.delta.tipo === 'otimizacao') {
            deltaColor = '#f59e0b'; // Âmbar para otimização
        } else if (item.delta.tipo === 'estavel') {
            deltaColor = '#38bdf8'; // Azul para estável
        }

        const origInst = `${item.orig.eees} EEE${item.orig.eees !== 1 ? 's' : ''}${item.orig.etes > 0 ? ` • ${item.orig.etes} ETE` : ''}`;
        const consInst = `${item.cons.eees} EEE${item.cons.eees !== 1 ? 's' : ''}${item.cons.etes > 0 ? ` • ${item.cons.etes} ETE` : ''}${item.cons.pocos_nos > 0 ? ` • ${item.cons.pocos_nos} PV/Nós` : ''}`;

        container.style.display = 'block';
        container.innerHTML = `
            <div style="background: rgba(0, 0, 0, 0.35); border: 1.5px solid rgba(249, 115, 22, 0.4); border-radius: 8px; padding: 10px; box-shadow: inset 0 1px 4px rgba(0,0,0,0.4);">
                <!-- Cabeçalho do Quadro Simplificado -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 6px;">
                    <div style="display: flex; align-items: center; gap: 7px;">
                        <span style="font-weight: 800; color: #fdba74; font-size: 0.92rem;">
                            <i class="fas fa-map-marker-alt" style="color: #f97316;"></i> ${item.frente}
                        </span>
                        <span style="font-size: 0.74rem; color: #94a3b8;">(${item.municipio})</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="popup-badge ${statusBadgeClass}" style="font-size: 0.68rem; padding: 2px 7px;">
                            ${item.status_label || item.status}
                        </span>
                        <button id="btn-fechar-quadro-lateral" type="button" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1.15rem; line-height: 1; padding: 0 4px;" title="Ocultar Confrontação">&times;</button>
                    </div>
                </div>

                <!-- Tabela idêntica à imagem fornecida pelo usuário -->
                <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
                    <table class="datatable" style="font-size: 0.74rem; width: 100%; border-collapse: collapse; margin: 0; min-width: 520px;">
                        <thead>
                            <tr style="background: rgba(255, 255, 255, 0.04); border-bottom: 1.5px solid rgba(255, 255, 255, 0.14);">
                                <th style="padding: 7px 8px; text-align: left; font-size: 0.75rem; color: #ffffff;">Item Confrontado</th>
                                <th style="padding: 7px 8px; text-align: left; color: #fdba74; font-size: 0.75rem; white-space: nowrap;"><i class="fas fa-history" style="color: #f97316;"></i> Escopo Original</th>
                                <th style="padding: 7px 8px; text-align: left; color: #38bdf8; font-size: 0.75rem; white-space: nowrap;"><i class="fas fa-check-circle" style="color: #0284c7;"></i> Escopo Consolidado</th>
                                <th style="padding: 7px 8px; text-align: left; color: #10b981; font-size: 0.75rem; white-space: nowrap;"><i class="fas fa-exchange-alt" style="color: #10b981;"></i> Variação / Balanço</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.07);">
                                <td style="padding: 7px 8px; font-weight: 700; color: #f8fafc; white-space: nowrap;">Extensão Total de Rede</td>
                                <td style="padding: 7px 8px; color: #f8fafc; white-space: nowrap;">${origM} (${origKm})</td>
                                <td style="padding: 7px 8px; color: #38bdf8; font-weight: 700; white-space: nowrap;">${consM} (${consKm})</td>
                                <td style="padding: 7px 8px; color: ${deltaColor}; font-weight: 700; white-space: nowrap;">${deltaMStr} (${deltaPctStr})</td>
                            </tr>
                            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.07);">
                                <td style="padding: 7px 8px; font-weight: 700; color: #f8fafc; white-space: nowrap;">Trechos Cadastrados</td>
                                <td style="padding: 7px 8px; color: #f8fafc; white-space: nowrap;">${item.orig.trechos} trechos</td>
                                <td style="padding: 7px 8px; color: #ffffff; font-weight: 700; white-space: nowrap;">${item.cons.trechos} trechos</td>
                                <td style="padding: 7px 8px; color: ${item.delta.trechos >= 0 ? '#10b981' : '#f59e0b'}; font-weight: 700; white-space: nowrap;">${item.delta.trechos >= 0 ? '+' : ''}${item.delta.trechos} trechos</td>
                            </tr>
                            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.07);">
                                <td style="padding: 7px 8px; font-weight: 700; color: #f8fafc; white-space: nowrap;">Polígonos de Área de Expansão (AE)</td>
                                <td style="padding: 7px 8px; color: #f8fafc; white-space: nowrap;">${item.orig.poligonos} polígono${item.orig.poligonos > 1 ? 's' : ''}${item.orig.area_ha > 0 ? ` (${item.orig.area_ha} ha)` : ''}</td>
                                <td style="padding: 7px 8px; color: #ffffff; font-weight: 700; white-space: nowrap;">${item.cons.poligonos} polígono${item.cons.poligonos > 1 ? 's' : ''}</td>
                                <td style="padding: 7px 8px; color: ${item.delta.poligonos >= 0 ? '#10b981' : '#94a3b8'}; font-weight: 700; white-space: nowrap;">${item.delta.poligonos >= 0 ? '+' : ''}${item.delta.poligonos} polígono${Math.abs(item.delta.poligonos) !== 1 ? 's' : ''}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.07);">
                                <td style="padding: 7px 8px; font-weight: 700; color: #f8fafc; white-space: nowrap;">Grandes Instalações (EEEs / ETEs)</td>
                                <td style="padding: 7px 8px; color: #f8fafc; white-space: nowrap;">${origInst}</td>
                                <td style="padding: 7px 8px; color: #ffffff; font-weight: 700; white-space: nowrap;">${consInst}</td>
                                <td style="padding: 7px 8px; color: ${item.delta.eees >= 0 ? '#10b981' : '#f59e0b'}; font-weight: 700; white-space: nowrap;">${item.delta.eees >= 0 ? '+' : ''}${item.delta.eees} EEE${Math.abs(item.delta.eees) !== 1 ? 's' : ''}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.07);">
                                <td style="padding: 7px 8px; font-weight: 700; color: #f8fafc; white-space: nowrap;">Elementos de Rede (Poços de Visita e Nós)</td>
                                <td style="padding: 7px 8px; color: #94a3b8; font-size: 0.71rem;">Não detalhados na concepção preliminar</td>
                                <td style="padding: 7px 8px; color: #ffffff; font-weight: 700; white-space: nowrap;">${item.cons.pocos_nos} elementos cadastrados</td>
                                <td style="padding: 7px 8px; color: #10b981; font-weight: 700; white-space: nowrap;">+${item.cons.pocos_nos} pontos detalhados</td>
                            </tr>
                            <tr>
                                <td style="padding: 7px 8px; font-weight: 700; color: #f8fafc; white-space: nowrap;">Status de Execução</td>
                                <td style="padding: 7px 8px;"><span class="popup-badge" style="background: rgba(249, 115, 22, 0.25); color: #f97316; font-size: 0.68rem; padding: 2px 7px;">ESTUDO PRELIMINAR</span></td>
                                <td style="padding: 7px 8px;"><span class="popup-badge ${statusBadgeClass}" style="font-size: 0.68rem; padding: 2px 7px;">${(item.status_label || item.status).toUpperCase()}</span></td>
                                <td style="padding: 7px 8px; color: #94a3b8; font-size: 0.72rem; white-space: nowrap;">Geopackage Integrado</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Rodapé com Ações Rápidas -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; padding-top: 6px; border-top: 1px dashed rgba(255, 255, 255, 0.1); flex-wrap: wrap; gap: 6px;">
                    <div style="display: flex; gap: 6px;">
                        <button id="btn-re-enquadrar-mapa" type="button" style="background: rgba(2, 132, 199, 0.2); border: 1px solid #0284c7; color: #38bdf8; border-radius: 5px; padding: 4px 9px; font-size: 0.72rem; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 5px;">
                            <i class="fas fa-crosshairs"></i> Enquadrar no Mapa
                        </button>
                        <button id="btn-export-lateral-csv" type="button" style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #10b981; border-radius: 5px; padding: 4px 9px; font-size: 0.72rem; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 5px;">
                            <i class="fas fa-file-csv"></i> Exportar CSV
                        </button>
                    </div>
                    <span style="font-size: 0.68rem; color: #94a3b8;">
                        <i class="fas fa-eye" style="color: #f97316;"></i> Legenda de Escopo Ativa
                    </span>
                </div>
            </div>
        `;

        // Eventos dos botões internos do quadro
        const btnFechar = document.getElementById('btn-fechar-quadro-lateral');
        if (btnFechar) {
            btnFechar.addEventListener('click', function() {
                container.style.display = 'none';
            });
        }

        const btnReEnquadrar = document.getElementById('btn-re-enquadrar-mapa');
        if (btnReEnquadrar) {
            btnReEnquadrar.addEventListener('click', function() {
                enquadrarFrenteNoMapa(item.frente, item.municipio);
            });
        }

        const btnCsv = document.getElementById('btn-export-lateral-csv');
        if (btnCsv) {
            btnCsv.addEventListener('click', function() {
                const rows = [
                    ["FRENTE", "MUNICIPIO", "STATUS_OBRA", "EXT_ORIGINAL_M", "EXT_CONSOLIDADO_M", "DELTA_EXT_M", "DELTA_EXT_KM", "DELTA_PCT", "TRECHOS_ORIGINAL", "TRECHOS_CONSOLIDADO", "DELTA_TRECHOS", "POLIGONOS_ORIGINAL", "POLIGONOS_CONSOLIDADO", "EEES_ORIGINAL", "EEES_CONSOLIDADO", "POCOS_NOS_CONSOLIDADO"],
                    [item.frente, item.municipio, item.status_label, item.orig.ext_m, item.cons.ext_m, item.delta.m, item.delta.km, item.delta.pct_str, item.orig.trechos, item.cons.trechos, item.delta.trechos, item.orig.poligonos, item.cons.poligonos, item.orig.eees, item.cons.eees, item.cons.pocos_nos]
                ];
                const csvContent = rows.map(r => r.map(c => `"${c}"`).join(";")).join("\n");
                const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Comparativo_Escopo_${item.frente.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
            });
        }
    }

    // Renderiza a confrontação no modal para APENAS A FRENTE SELECIONADA
    function renderModalComparativoFrente(frenteId) {
        const list = getFrentesComparativoList();
        if (list.length === 0) return;

        let item = list.find(f => f.id === frenteId);
        if (!item && frenteId) {
            const normTarget = normStr(frenteId);
            item = list.find(f => normStr(f.frente) === normTarget || normStr(f.id) === normTarget);
        }
        if (!item) item = list[0];

        // Atualiza os selects
        if (selConfrontarCard && selConfrontarCard.value !== item.id) {
            selConfrontarCard.value = item.id;
        }
        if (selConfrontarModal && selConfrontarModal.value !== item.id) {
            selConfrontarModal.value = item.id;
        }

        // Determina classe do status badge
        let statusBadgeClass = 'nao-iniciado';
        const stUpper = (item.status || '').toUpperCase();
        if (stUpper.includes('CONCLU') || stUpper.includes('EXECUTAD')) {
            statusBadgeClass = 'concluido';
        } else if (stUpper.includes('INICIADO') && !stUpper.includes('NÃO') && !stUpper.includes('NAO')) {
            statusBadgeClass = 'iniciado';
        }

        // Atualiza status badge na barra superior do modal
        const badgeContainer = document.getElementById('modal-frente-status-badge');
        if (badgeContainer) {
            badgeContainer.innerHTML = `
                <span class="popup-badge" style="background: rgba(2, 132, 199, 0.15); color: #38bdf8; border: 1px solid rgba(2, 132, 199, 0.35); font-size:0.75rem;">
                    <i class="fas fa-city"></i> ${item.municipio}
                </span>
                <span class="popup-badge ${statusBadgeClass}" style="font-size:0.75rem;">
                    ${item.status_label || item.status}
                </span>
            `;
        }

        const dynContainer = document.getElementById('modal-comparativo-dynamic-content');
        if (!dynContainer) return;

        // Métricas formatadas
        const origKm = (item.orig.ext_m / 1000).toFixed(2).replace('.', ',') + ' km';
        const consKm = (item.cons.ext_m / 1000).toFixed(2).replace('.', ',') + ' km';
        const origM = item.orig.ext_m.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m';
        const consM = item.cons.ext_m.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m';

        const deltaSign = item.delta.m >= 0 ? '+' : '';
        const deltaMStr = deltaSign + item.delta.m.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' m';
        const deltaKmStr = deltaSign + (item.delta.m / 1000).toFixed(2).replace('.', ',') + ' km';
        const deltaPctStr = item.delta.pct_str;

        let deltaColor = '#10b981'; // Verde para ampliação
        let deltaLabel = 'AMPLIAÇÃO LÍQUIDA REDE';
        let variacaoDesc = `Expansão de <strong>${deltaKmStr} (${deltaPctStr})</strong> de rede de esgoto após consolidação de campo no Geopackage.`;

        if (item.delta.tipo === 'otimizacao') {
            deltaColor = '#f59e0b'; // Âmbar para otimização
            deltaLabel = 'OTIMIZAÇÃO DE TRAÇADO';
            variacaoDesc = `Racionalização de traçado com foco executivo prioritário (variação líquida de <strong>${deltaKmStr}</strong>).`;
        } else if (item.delta.tipo === 'estavel') {
            deltaColor = '#38bdf8'; // Azul para estável
            deltaLabel = 'ADERÊNCIA CONCEITUAL';
            variacaoDesc = `Traçado executivo com perfeita aderência ao estudo preliminar de concepção original (<strong>${deltaMStr}</strong>).`;
        }

        const origInst = `${item.orig.eees} EEE${item.orig.eees !== 1 ? 's' : ''}${item.orig.etes > 0 ? ` • ${item.orig.etes} ETE` : ''}`;
        const consInst = `${item.cons.eees} EEE${item.cons.eees !== 1 ? 's' : ''}${item.cons.etes > 0 ? ` • ${item.cons.etes} ETE` : ''}${item.cons.pocos_nos > 0 ? ` • ${item.cons.pocos_nos} PV/Nós` : ''}`;

        dynContainer.innerHTML = `
            <!-- Card Exclusivo da Frente Selecionada -->
            <div class="widget-card" style="border: 1.5px solid rgba(249, 115, 22, 0.45); background: rgba(249, 115, 22, 0.03); margin-bottom: 0; padding: 1.1rem; border-radius: 8px;">
                <div class="widget-title" style="color: #f97316; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-dark); padding-bottom: 0.6rem;">
                    <span style="font-size: 1.05rem; display: flex; align-items: center; gap: 8px; font-weight: 700;">
                        <i class="fas fa-map-marked-alt"></i> ${item.frente} • ${item.municipio}
                    </span>
                    <span style="font-size: 0.74rem; color: var(--text-muted-dark); font-weight: normal; background: rgba(255,255,255,0.05); padding: 3px 8px; border-radius: 4px;">
                        Frente de Obra Selecionada
                    </span>
                </div>
                
                <p style="font-size:0.82rem; color:#e2e8f0; margin:0.65rem 0 1.1rem 0; line-height: 1.45;">
                    <i class="fas fa-info-circle" style="color: ${deltaColor}; margin-right: 5px;"></i>
                    ${variacaoDesc}
                </p>

                <!-- Grid de KPIs da Frente -->
                <div class="modal-kpi-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 1.25rem;">
                    <div class="modal-kpi-card" style="border-top-color: #f97316;">
                        <div class="modal-kpi-title">ESCOPO ORIGINAL</div>
                        <div class="modal-kpi-num" style="color:#f97316;">${origKm}</div>
                        <div class="modal-kpi-sub">${item.orig.trechos} trechos • ${item.orig.poligonos} polígono${item.orig.poligonos > 1 ? 's' : ''}</div>
                    </div>
                    <div class="modal-kpi-card" style="border-top-color: #0284c7;">
                        <div class="modal-kpi-title">ESCOPO ATUAL CONSOLIDADO</div>
                        <div class="modal-kpi-num" style="color:#38bdf8;">${consKm}</div>
                        <div class="modal-kpi-sub">${item.cons.trechos} trechos • ${item.cons.poligonos} polígono${item.cons.poligonos > 1 ? 's' : ''}</div>
                    </div>
                    <div class="modal-kpi-card" style="border-top-color: ${deltaColor};">
                        <div class="modal-kpi-title">${deltaLabel}</div>
                        <div class="modal-kpi-num" style="color:${deltaColor};">${deltaKmStr}</div>
                        <div class="modal-kpi-sub">${deltaPctStr} de variação</div>
                    </div>
                    <div class="modal-kpi-card" style="border-top-color: #a855f7;">
                        <div class="modal-kpi-title">ESTRUTURAS & LOCALIZADAS</div>
                        <div class="modal-kpi-num" style="color:#c084fc;">${item.cons.eees} EEE${item.cons.eees !== 1 ? 's' : ''} / ${item.cons.etes} ETE</div>
                        <div class="modal-kpi-sub">${item.cons.loc_total} obras localizadas no total</div>
                    </div>
                </div>

                <!-- Tabela Comparativa Detalhada da Frente -->
                <table class="datatable" style="font-size:0.8rem; margin-bottom: 1.1rem; width:100%;">
                    <thead>
                        <tr style="background: rgba(255,255,255,0.04);">
                            <th style="padding: 9px 12px; text-align: left;">Item Confrontado</th>
                            <th style="padding: 9px 12px; text-align: left; color:#fdba74;"><i class="fas fa-history"></i> Escopo Original</th>
                            <th style="padding: 9px 12px; text-align: left; color:#38bdf8;"><i class="fas fa-check-circle"></i> Escopo Consolidado</th>
                            <th style="padding: 9px 12px; text-align: left; color:${deltaColor};"><i class="fas fa-exchange-alt"></i> Variação / Balanço</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="padding: 8px 12px;"><strong>Extensão Total de Rede</strong></td>
                            <td style="padding: 8px 12px;">${origM} (${origKm})</td>
                            <td style="padding: 8px 12px;"><strong style="color:#38bdf8;">${consM} (${consKm})</strong></td>
                            <td style="padding: 8px 12px;"><span style="color:${deltaColor}; font-weight:700;">${deltaMStr} (${deltaPctStr})</span></td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 12px;"><strong>Trechos Cadastrados</strong></td>
                            <td style="padding: 8px 12px;">${item.orig.trechos} trechos</td>
                            <td style="padding: 8px 12px;"><strong>${item.cons.trechos} trechos</strong></td>
                            <td style="padding: 8px 12px;"><span style="color:${item.delta.trechos >= 0 ? '#10b981' : '#f59e0b'}; font-weight:700;">${item.delta.trechos >= 0 ? '+' : ''}${item.delta.trechos} trechos</span></td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 12px;"><strong>Polígonos de Área de Expansão (AE)</strong></td>
                            <td style="padding: 8px 12px;">${item.orig.poligonos} polígono${item.orig.poligonos > 1 ? 's' : ''} (${item.orig.area_ha} ha)</td>
                            <td style="padding: 8px 12px;"><strong>${item.cons.poligonos} polígono${item.cons.poligonos > 1 ? 's' : ''}</strong></td>
                            <td style="padding: 8px 12px;"><span style="color:${item.delta.poligonos >= 0 ? '#10b981' : '#94a3b8'}; font-weight:700;">${item.delta.poligonos >= 0 ? '+' : ''}${item.delta.poligonos} polígono${Math.abs(item.delta.poligonos) !== 1 ? 's' : ''}</span></td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 12px;"><strong>Grandes Instalações (EEEs / ETEs)</strong></td>
                            <td style="padding: 8px 12px;">${origInst}</td>
                            <td style="padding: 8px 12px;"><strong>${consInst}</strong></td>
                            <td style="padding: 8px 12px;"><span style="color:${item.delta.eees >= 0 ? '#10b981' : '#f59e0b'}; font-weight:700;">${item.delta.eees >= 0 ? '+' : ''}${item.delta.eees} EEE${Math.abs(item.delta.eees) !== 1 ? 's' : ''}</span></td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 12px;"><strong>Elementos de Rede (Poços de Visita e Nós)</strong></td>
                            <td style="padding: 8px 12px; color:var(--text-muted-dark);">Não detalhados na concepção preliminar</td>
                            <td style="padding: 8px 12px;"><strong>${item.cons.pocos_nos} elementos cadastrados</strong></td>
                            <td style="padding: 8px 12px;"><span style="color:#10b981; font-weight:700;">+${item.cons.pocos_nos} pontos detalhados</span></td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 12px;"><strong>Status de Execução</strong></td>
                            <td style="padding: 8px 12px;"><span class="popup-badge" style="background:rgba(249,115,22,0.2); color:#f97316;">Estudo Preliminar</span></td>
                            <td style="padding: 8px 12px;"><span class="popup-badge ${statusBadgeClass}">${item.status_label || item.status}</span></td>
                            <td style="padding: 8px 12px;"><span style="color:var(--text-muted-dark); font-weight:600;">Geopackage Integrado</span></td>
                        </tr>
                    </tbody>
                </table>

                <div style="margin-top: 14px; display:flex; justify-content: flex-end; align-items:center; gap:10px; flex-wrap: wrap;">
                    <span style="font-size:0.75rem; color:var(--text-muted-dark);">
                        Deseja visualizar o confronto simultâneo no mapa?
                    </span>
                    <button type="button" class="btn-goto-bairro" id="btn-modal-enquadrar-mapa" data-bairro="${item.frente}" data-mun="${item.municipio}" style="background:linear-gradient(135deg, #f97316, #ea580c); color:white; border:none; border-radius:6px; padding:0.55rem 1.15rem; font-size:0.82rem; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:7px; box-shadow:0 2px 8px rgba(249,115,22,0.4);">
                        <i class="fas fa-crosshairs"></i> Enquadrar e Confrontar no Mapa
                    </button>
                </div>
            </div>
        `;

        // Vincula evento ao botão Enquadrar no Mapa
        const btnGoto = document.getElementById('btn-modal-enquadrar-mapa');
        if (btnGoto) {
            btnGoto.addEventListener('click', function() {
                if (modalComparativo) modalComparativo.style.display = 'none';

                // Ativa a legenda "Classificar por Escopo"
                const selLegend = document.getElementById('select-legend-mode');
                if (selLegend) selLegend.value = 'escopo';
                if (window.GIS_LAYERS && typeof window.GIS_LAYERS.setLegendMode === 'function') {
                    window.GIS_LAYERS.setLegendMode('escopo');
                }
                if (window.selectBairro) {
                    window.selectBairro(item.frente, false, item.municipio);
                }
            });
        }
    }

    // Inicialização das opções da lista suspensa e sincronização de eventos
    function initComparativoEscopoControls() {
        const list = getFrentesComparativoList();
        if (list.length === 0) return;

        let optionsHtml = '';
        list.forEach(f => {
            optionsHtml += `<option value="${f.id}" style="background-color: #1e201d; color: #f8fafc; font-weight: 500; padding: 6px 10px;">${f.frente} (${f.municipio}) - ${f.status_label}</option>`;
        });

        if (selConfrontarCard) selConfrontarCard.innerHTML = optionsHtml;
        if (selConfrontarModal) selConfrontarModal.innerHTML = optionsHtml;

        const defaultId = list[0].id;
        if (selConfrontarCard) selConfrontarCard.value = defaultId;
        if (selConfrontarModal) selConfrontarModal.value = defaultId;

        // Ao alterar a seleção no quadro dedicado
        if (selConfrontarCard) {
            selConfrontarCard.addEventListener('change', function() {
                if (selConfrontarModal) selConfrontarModal.value = this.value;
                const lateralContainer = document.getElementById('quadro-confronto-lateral');
                if (lateralContainer && lateralContainer.style.display !== 'none') {
                    renderQuadroConfrontoLateral(this.value);
                    const item = list.find(f => f.id === this.value);
                    if (item) enquadrarFrenteNoMapa(item.frente, item.municipio);
                }
            });
        }

        // Ao alterar a seleção dentro do modal, re-renderiza imediatamente a frente escolhida
        if (selConfrontarModal) {
            selConfrontarModal.addEventListener('change', function() {
                if (selConfrontarCard) selConfrontarCard.value = this.value;
                renderModalComparativoFrente(this.value);
            });
        }

        // Botão Confrontar Escopo: exibe o quadro simplificado no próprio painel lateral e enquadra no mapa
        const handleConfrontar = function(e) {
            if (e) e.stopPropagation();
            const currentVal = (selConfrontarCard && selConfrontarCard.value) ? selConfrontarCard.value : defaultId;
            const item = list.find(f => f.id === currentVal) || list[0];
            
            // 1. Renderiza o quadro simplificado no próprio painel lateral
            renderQuadroConfrontoLateral(currentVal);

            // 2. Enquadra a área da frente na área do mapa com modo escopo ativo
            enquadrarFrenteNoMapa(item.frente, item.municipio);
        };

        if (btnConfrontarCard) btnConfrontarCard.addEventListener('click', handleConfrontar);
        if (btnOpenComparativoLegacy) btnOpenComparativoLegacy.addEventListener('click', handleConfrontar);

        // Fechamento do modal
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

        // Exportação CSV: Frente Selecionada
        if (btnExportFrenteCsv) {
            btnExportFrenteCsv.addEventListener('click', function() {
                const currentVal = (selConfrontarModal && selConfrontarModal.value) ? selConfrontarModal.value : (selConfrontarCard ? selConfrontarCard.value : defaultId);
                const item = list.find(f => f.id === currentVal) || list[0];
                const rows = [
                    ["FRENTE", "MUNICIPIO", "STATUS_OBRA", "EXT_ORIGINAL_M", "EXT_CONSOLIDADO_M", "DELTA_EXT_M", "DELTA_EXT_KM", "DELTA_PCT", "TRECHOS_ORIGINAL", "TRECHOS_CONSOLIDADO", "DELTA_TRECHOS", "POLIGONOS_ORIGINAL", "POLIGONOS_CONSOLIDADO", "EEES_ORIGINAL", "EEES_CONSOLIDADO", "POCOS_NOS_CONSOLIDADO"],
                    [item.frente, item.municipio, item.status_label, item.orig.ext_m, item.cons.ext_m, item.delta.m, item.delta.km, item.delta.pct_str, item.orig.trechos, item.cons.trechos, item.delta.trechos, item.orig.poligonos, item.cons.poligonos, item.orig.eees, item.cons.eees, item.cons.pocos_nos]
                ];
                const csvContent = rows.map(r => r.map(c => `"${c}"`).join(";")).join("\n");
                const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Comparativo_Escopo_${item.frente.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
            });
        }

        // Exportação CSV: Todas as 58 Frentes Comuns
        if (btnExportTodasCsv) {
            btnExportTodasCsv.addEventListener('click', function() {
                const rows = [
                    ["FRENTE", "MUNICIPIO", "STATUS_OBRA", "EXT_ORIGINAL_M", "EXT_CONSOLIDADO_M", "DELTA_EXT_M", "DELTA_EXT_KM", "DELTA_PCT", "TRECHOS_ORIGINAL", "TRECHOS_CONSOLIDADO", "DELTA_TRECHOS", "POLIGONOS_ORIGINAL", "POLIGONOS_CONSOLIDADO", "EEES_ORIGINAL", "EEES_CONSOLIDADO", "POCOS_NOS_CONSOLIDADO"]
                ];
                list.forEach(item => {
                    rows.push([item.frente, item.municipio, item.status_label, item.orig.ext_m, item.cons.ext_m, item.delta.m, item.delta.km, item.delta.pct_str, item.orig.trechos, item.cons.trechos, item.delta.trechos, item.orig.poligonos, item.cons.poligonos, item.orig.eees, item.cons.eees, item.cons.pocos_nos]);
                });
                const csvContent = rows.map(r => r.map(c => `"${c}"`).join(";")).join("\n");
                const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Comparativo_Escopo_Todas_58_Frentes_${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
            });
        }
    }

    // Inicializa controles de confrontação de escopo
    initComparativoEscopoControls();
    window.renderModalComparativoFrente = renderModalComparativoFrente;

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

    function normStr(str) {
        return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    }

    // 14. Dynamic Extensão por Tipo de Rede Widget Updater (Status Concluído)
    function getBairroDisplayLabel(bairroTarget, munTarget = null) {
        if (!bairroTarget) return 'Lote 4 (Geral)';
        const normTarget = normStr(bairroTarget);
        const normMun = munTarget ? normStr(munTarget) : null;
        if (window.GIS_LAYERS && typeof window.GIS_LAYERS.getBairroCentroids === 'function') {
            const centroids = window.GIS_LAYERS.getBairroCentroids();
            let found = null;
            if (normMun) {
                found = centroids.find(c => (isBairroMatch(bairroTarget, c.id, normMun, c.municipio) || isBairroMatch(bairroTarget, c.nome, normMun, c.municipio)));
            }
            if (!found) {
                found = centroids.find(c => isBairroMatch(bairroTarget, c.id) || isBairroMatch(bairroTarget, c.nome));
            }
            if (found) return `${found.nome} (${found.municipio})`;
        }
        return `${bairroTarget}${munTarget ? ` (${munTarget})` : ''}`;
    }

    function updateSegmentWidget(bairroTarget, munTarget = null) {
        const titleEl = document.getElementById('segment-widget-title');
        const container = document.getElementById('segment-dropdowns-container');
        if (!container) return;

        const normTarget = bairroTarget ? normStr(bairroTarget) : null;
        let normMun = munTarget ? normStr(munTarget) : null;
        if (normTarget && !normMun && window.GIS_LAYERS && typeof window.GIS_LAYERS.getBairroCentroids === 'function') {
            const centroids = window.GIS_LAYERS.getBairroCentroids();
            const matched = centroids.find(c => isBairroMatch(bairroTarget, c.id) || isBairroMatch(bairroTarget, c.nome));
            if (matched && matched.municipio) normMun = normStr(matched.municipio);
        }

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
        let filteredFeatures = (window.GIS_DATA && window.GIS_DATA.linear && window.GIS_DATA.linear.features) ? window.GIS_DATA.linear.features.filter(f => {
            const props = f.properties || {};
            const b = props.bairro || props.frente || '';
            if (!b) return false;
            const fMun = props.nm_mun || props.municipio || '';
            return isBairroMatch(bairroTarget, b, normMun, fMun);
        }) : [];

        // Calculate total extension and execution status metrics
        let totalExt = 0;
        let totalExtConcluido = 0;
        const segData = {};

        filteredFeatures.forEach(f => {
            const p = f.properties;
            const ext = parseFloat(p.ext_calcul || 0);
            let seg = (p.segmento || '').trim().toUpperCase();
            if (!seg) {
                const prod = (p.produto || '').trim().toUpperCase();
                if (prod.includes('AGUA') || prod.includes('ÁGUA')) {
                    seg = 'REDE DE DISTRIBUIÇÃO DE ÁGUA';
                } else {
                    seg = 'REDE COLETORA DE ESGOTO';
                }
            }
            const dn = parseInt(p.dn_nominal || 0);
            const st = (p.status || 'NÃO INICIADO').trim().toUpperCase();
            const isConcluido = (st === 'CONCLUÍDO' || st === 'EXECUTADA' || st === 'CONCLUIDO');

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
            const bLabel = getBairroDisplayLabel(bairroTarget, normMun);
            titleEl.innerHTML = `<i class="fas fa-network-wired"></i> Obras lineares — <strong style="color:#ffffff;">${bLabel}</strong> (${(totalExt/1000).toFixed(2).replace('.', ',')} km • <span style="color:#10b981;">${totalPctConcluido.replace('.', ',')}% Concluído</span>)`;
        }

        const SEG_INFO = {
            'REDE COLETORA': { name: 'Rede Coletora de Esgoto', color: '#2563eb' },
            'REDE COLETORA DE ESGOTO': { name: 'Rede Coletora de Esgoto', color: '#2563eb' },
            'LINHA DE RECALQUE': { name: 'Linha de Recalque', color: '#dc2626' },
            'EMISSÁRIO': { name: 'Emissário de Esgoto', color: '#ea580c' },
            'EMISSÁRIO DE ESGOTO': { name: 'Emissário de Esgoto', color: '#ea580c' },
            'REDE DE DISTRIBUIÇÃO DE ÁGUA': { name: 'Rede de Distribuição de Água', color: '#06b6d4' },
            'REDE DE DISTRIBUIÇÃO': { name: 'Rede de Distribuição de Água', color: '#06b6d4' },
            'ADUTORA': { name: 'Adutora de Água', color: '#8b5cf6' }
        };

        const DN_COLORS = {
            50: '#06b6d4',
            75: '#0284c7',
            90: '#10b981',
            100: '#0284c7',
            110: '#f59e0b',
            150: '#2563eb',
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
    function updateLocalizadaWidget(bairroTarget, munTarget = null) {
        const titleEl = document.getElementById('localizada-widget-title');
        const container = document.getElementById('localizada-container');
        if (!container) return;

        const normTarget = bairroTarget ? normStr(bairroTarget) : null;
        let normMun = munTarget ? normStr(munTarget) : null;
        if (normTarget && !normMun && window.GIS_LAYERS && typeof window.GIS_LAYERS.getBairroCentroids === 'function') {
            const centroids = window.GIS_LAYERS.getBairroCentroids();
            const matched = centroids.find(c => isBairroMatch(bairroTarget, c.id) || isBairroMatch(bairroTarget, c.nome));
            if (matched && matched.municipio) normMun = normStr(matched.municipio);
        }

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
                const b = p.bairro || p.frente || '';
                if (!b) return false;
                const fMun = p.nm_mun || p.municipio || '';

                if (!isBairroMatch(bairroTarget, b, normMun, fMun)) return false;

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
            const bLabel = getBairroDisplayLabel(bairroTarget, normMun);
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
    let activeMunFilter = null;
    const bairroCards = document.querySelectorAll('.bairro-card');
    const badgeFrente = document.getElementById('badge-frente-obra-quant');
    const dropdownFrente = document.getElementById('dropdown-frente-obra-quant');

    function selectBairro(bairroTarget, isToggle = false, munTarget = null) {
        const normTarget = normStr(bairroTarget);
        let normMun = munTarget ? normStr(munTarget) : null;

        // Find centroid to assist with municipality and geometry bounds
        let matchedCentroid = null;
        if (normTarget && window.GIS_LAYERS && typeof window.GIS_LAYERS.getBairroCentroids === 'function') {
            const centroids = window.GIS_LAYERS.getBairroCentroids();
            if (normMun) {
                matchedCentroid = centroids.find(c => (isBairroMatch(bairroTarget, c.id, normMun, c.municipio) || isBairroMatch(bairroTarget, c.nome, normMun, c.municipio)));
            }
            if (!matchedCentroid) {
                matchedCentroid = centroids.find(c => isBairroMatch(bairroTarget, c.id) || isBairroMatch(bairroTarget, c.nome));
            }
            if (matchedCentroid && !normMun && matchedCentroid.municipio) {
                normMun = normStr(matchedCentroid.municipio);
            }
        }

        const isSameBairro = activeBairroFilter === bairroTarget && (!normMun || !activeMunFilter || activeMunFilter === normMun);

        if (!bairroTarget || (isToggle && isSameBairro)) {
            // Deselect / Reset to Lote 4
            activeBairroFilter = null;
            activeMunFilter = null;
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
            activeMunFilter = normMun;
            // Sync with Confrontar Escopo dropdown if available
            if (window.FRENTES_COMPARATIVO_ESCOPO) {
                const matchFrente = window.FRENTES_COMPARATIVO_ESCOPO.find(f => isBairroMatch(bairroTarget, f.frente, normMun, f.municipio) || isBairroMatch(bairroTarget, f.id, normMun, f.municipio));
                if (matchFrente) {
                    const sc = document.getElementById('select-confrontar-frente');
                    const sm = document.getElementById('select-modal-confrontar-frente');
                    if (sc && sc.value !== matchFrente.id) sc.value = matchFrente.id;
                    if (sm && sm.value !== matchFrente.id) sm.value = matchFrente.id;
                }
            }


            bairroCards.forEach(c => {
                const cardB = c.dataset.bairro;
                const cardM = c.dataset.mun;
                const match = isBairroMatch(bairroTarget, cardB, normMun, cardM);
                if (match) {
                    c.classList.add('active-bairro');
                } else {
                    c.classList.remove('active-bairro');
                }
            });

            if (badgeFrente) {
                badgeFrente.innerHTML = `${bairroTarget} <i class="fas fa-chevron-down" style="font-size:0.75rem; margin-left:3px;"></i>`;
            }

            updateSegmentWidget(bairroTarget, normMun);
            updateLocalizadaWidget(bairroTarget, normMun);

            if (window.GIS_LAYERS) window.GIS_LAYERS.highlightBairro(bairroTarget);

            // Zoom map to fit matching features of the selected bairro
            const predicate = function(feature) {
                const props = feature.properties || {};
                const b = props.frente || props.bairro || '';
                if (!b) return false;
                const fMun = props.nm_mun || props.municipio || '';
                return isBairroMatch(bairroTarget, b, normMun, fMun);
            };

            const matchingLinear = (window.GIS_DATA && window.GIS_DATA.linear && window.GIS_DATA.linear.features) ? window.GIS_DATA.linear.features.filter(predicate) : [];
            const matchingAreas = (window.GIS_DATA && window.GIS_DATA.areas && window.GIS_DATA.areas.features) ? window.GIS_DATA.areas.features.filter(predicate) : [];
            const matchingLocal = (window.GIS_DATA && window.GIS_DATA.localizada && window.GIS_DATA.localizada.features) ? window.GIS_DATA.localizada.features.filter(predicate) : [];

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

            let zoomApplied = false;

            if (combined.length > 0) {
                const tempGroup = L.geoJSON({ type: "FeatureCollection", features: combined });
                const bounds = tempGroup.getBounds();
                if (bounds.isValid()) {
                    const latSpan = Math.abs(bounds.getNorth() - bounds.getSouth()) * 111;
                    const lngSpan = Math.abs(bounds.getEast() - bounds.getWest()) * 100;
                    // Only use combined features bounds if span is within a local neighborhood (< 15 km)
                    if (latSpan < 15 && lngSpan < 15) {
                        window.GIS_MAP.fitBounds(bounds, { maxZoom: 16, padding: [60, 60] });
                        zoomApplied = true;
                    }
                }
            }

            // Fallback 1: matchedCentroid.bounds (precalculated from AE polygon)
            if (!zoomApplied && matchedCentroid && matchedCentroid.bounds) {
                const b = matchedCentroid.bounds;
                const cBounds = L.latLngBounds(b[0], b[1]);
                if (cBounds.isValid()) {
                    window.GIS_MAP.fitBounds(cBounds, { maxZoom: 16, padding: [60, 60] });
                    zoomApplied = true;
                }
            }

            // Fallback 2: matchedCentroid lat/lng
            if (!zoomApplied && matchedCentroid && matchedCentroid.lat && matchedCentroid.lng) {
                window.GIS_MAP.setView([matchedCentroid.lat, matchedCentroid.lng], 15);
                zoomApplied = true;
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
    window.getActiveMun = function() {
        return activeMunFilter;
    };

    bairroCards.forEach(card => {
        card.addEventListener('click', function(e) {
            const bairroTarget = this.dataset.bairro;
            const munTarget = this.dataset.mun || null;
            if (!bairroTarget) {
                selectBairro(null, false);
            } else {
                selectBairro(bairroTarget, true, munTarget);
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

    
    // 17. Search, Municipality, Status & Modalidade Filters for 169 Frentes de Obra (Painéis Visão Geral e Visão Detalhada)
    const searchFrentesInput = document.getElementById('search-frentes-input');
    const selectMunFrentes = document.getElementById('select-mun-frentes');
    const selectStatusFrentes = document.getElementById('select-status-frentes');
    const selectModalidadeFrentes = document.getElementById('select-modalidade-frentes');
    const titleFrentesEl = document.getElementById('frentes-card-title-count');

    const searchFrentesQuantInput = document.getElementById('search-frentes-quant-input');
    const selectMunQuant = document.getElementById('select-mun-quant');
    const selectStatusQuant = document.getElementById('select-status-quant');
    const selectModalidadeQuant = document.getElementById('select-modalidade-quant');
    const badgeFrenteQuant = document.getElementById('badge-frente-obra-quant');

    let isSyncingFilters = false;

    function filterFrentesUI(source = 'geral') {
        if (isSyncingFilters) return;
        isSyncingFilters = true;

        let term, selMun, selStatus, selModalidade;

        if (source === 'quant') {
            term = (searchFrentesQuantInput ? searchFrentesQuantInput.value : '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
            selMun = (selectMunQuant ? selectMunQuant.value : '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
            selStatus = (selectStatusQuant ? selectStatusQuant.value : '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
            selModalidade = (selectModalidadeQuant ? selectModalidadeQuant.value : '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();

            // Sync with Geral
            if (searchFrentesInput) searchFrentesInput.value = searchFrentesQuantInput ? searchFrentesQuantInput.value : '';
            if (selectMunFrentes) selectMunFrentes.value = selectMunQuant ? selectMunQuant.value : '';
            if (selectStatusFrentes) selectStatusFrentes.value = selectStatusQuant ? selectStatusQuant.value : '';
            if (selectModalidadeFrentes) selectModalidadeFrentes.value = selectModalidadeQuant ? selectModalidadeQuant.value : '';
        } else {
            term = (searchFrentesInput ? searchFrentesInput.value : '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
            selMun = (selectMunFrentes ? selectMunFrentes.value : '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
            selStatus = (selectStatusFrentes ? selectStatusFrentes.value : '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
            selModalidade = (selectModalidadeFrentes ? selectModalidadeFrentes.value : '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();

            // Sync with Quant
            if (searchFrentesQuantInput) searchFrentesQuantInput.value = searchFrentesInput ? searchFrentesInput.value : '';
            if (selectMunQuant) selectMunQuant.value = selectMunFrentes ? selectMunFrentes.value : '';
            if (selectStatusQuant) selectStatusQuant.value = selectStatusFrentes ? selectStatusFrentes.value : '';
            if (selectModalidadeQuant) selectModalidadeQuant.value = selectModalidadeFrentes ? selectModalidadeFrentes.value : '';
        }

        const matchModalidadeFn = (cardMod) => {
            if (!selModalidade) return true;
            if (selModalidade === 'SEM MODALIDADE' || selModalidade === 'NAO INFORMADO') {
                return !cardMod || cardMod === 'SEM MODALIDADE' || cardMod === 'NAO INFORMADO';
            }
            return cardMod === selModalidade;
        };

        // 1. Filter Visão Geral cards (.frentes-scroll-container)
        let visibleGeral = 0;
        const cardsGeral = document.querySelectorAll('.frentes-scroll-container .bairro-card');
        cardsGeral.forEach(card => {
            const b = (card.dataset.bairro || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
            const m = (card.dataset.mun || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
            const st = (card.dataset.status || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
            const mod = (card.dataset.modalidade || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

            const matchTerm = !term || b.includes(term) || m.includes(term) || st.includes(term) || mod.includes(term);
            const matchMun = !selMun || m === selMun;
            const matchStatus = !selStatus || st === selStatus || (selStatus === 'INICIADO' && st.startsWith('INICIADO'));
            const matchMod = matchModalidadeFn(mod);

            const isVisible = matchTerm && matchMun && matchStatus && matchMod;
            card.style.display = isVisible ? '' : 'none';
            if (isVisible) visibleGeral++;
        });

        if (titleFrentesEl) {
            if (visibleGeral === cardsGeral.length) {
                titleFrentesEl.textContent = `(${cardsGeral.length} — Camada AE)`;
            } else {
                titleFrentesEl.textContent = `(${visibleGeral} de ${cardsGeral.length} — Camada AE)`;
            }
        }

        // 2. Filter Visão Detalhada cards (#dropdown-frente-obra-quant)
        let visibleQuant = 0;
        const cardsQuant = document.querySelectorAll('#dropdown-frente-obra-quant .bairro-card');
        cardsQuant.forEach(card => {
            const b = (card.dataset.bairro || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
            const m = (card.dataset.mun || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
            const st = (card.dataset.status || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
            const mod = (card.dataset.modalidade || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

            const matchTerm = !term || b.includes(term) || m.includes(term) || st.includes(term) || mod.includes(term);
            const matchMun = !selMun || m === selMun;
            const matchStatus = !selStatus || st === selStatus || (selStatus === 'INICIADO' && st.startsWith('INICIADO'));
            const matchMod = matchModalidadeFn(mod);

            const isVisible = matchTerm && matchMun && matchStatus && matchMod;
            card.style.display = isVisible ? '' : 'none';
            if (isVisible) visibleQuant++;
        });

        // Update accordion badge if no active single frente filter
        if (badgeFrenteQuant && (!window.getActiveBairro || !window.getActiveBairro())) {
            badgeFrenteQuant.innerHTML = `Ver Frentes (${visibleQuant}) <i class="fas fa-chevron-down"></i>`;
        }

        isSyncingFilters = false;
    }

    // Event listeners for Visão Geral filters
    if (searchFrentesInput) searchFrentesInput.addEventListener('input', () => filterFrentesUI('geral'));
    if (selectMunFrentes) selectMunFrentes.addEventListener('change', () => filterFrentesUI('geral'));
    if (selectStatusFrentes) selectStatusFrentes.addEventListener('change', () => filterFrentesUI('geral'));
    if (selectModalidadeFrentes) selectModalidadeFrentes.addEventListener('change', () => filterFrentesUI('geral'));

    // Event listeners for Visão Detalhada filters
    if (searchFrentesQuantInput) searchFrentesQuantInput.addEventListener('input', () => filterFrentesUI('quant'));
    if (selectMunQuant) selectMunQuant.addEventListener('change', () => filterFrentesUI('quant'));
    if (selectStatusQuant) selectStatusQuant.addEventListener('change', () => filterFrentesUI('quant'));
    if (selectModalidadeQuant) selectModalidadeQuant.addEventListener('change', () => filterFrentesUI('quant'));

    // Quick-filter clicking on legend items
    document.querySelectorAll('.quick-status-filter').forEach(item => {
        item.addEventListener('click', function() {
            const st = this.dataset.status;
            if (selectStatusFrentes) {
                if (selectStatusFrentes.value === st) {
                    selectStatusFrentes.value = ''; // Toggle off
                } else {
                    selectStatusFrentes.value = st;
                }
                filterFrentesUI('geral');
            }
        });
    });

    console.log("Portal WebGIS Engeform & Sabesp ready with Dynamic Bairro Segment & Obras Localizadas Widgets!");
});
