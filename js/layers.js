/* ==========================================================================
   WEBGIS LAYERS & STYLING ENGINE - ENGEFORM & SABESP
   ========================================================================== */

window.GIS_LAYERS = (function() {
    let map = null;
    let layerGroupMunicipios = null;
    let layerGroupAreas = null;
    let layerGroupLinear = null;
    let layerGroupLocalizada = null;
    let layerGroupBairroCentroids = null;

    let currentLegendMode = 'status'; // 'status', 'segmento', 'material'
    let currentHighlightedBairro = null;

    // Limiar de zoom:
    // - Obras Localizadas (EEE): visíveis em zoom aproximado (>= 13); ocultas em zoom distante
    // - Centróides de Bairro (Ícone + Rótulo): visíveis em zoom distante (< 13); ocultos em zoom aproximado
    const MIN_ZOOM_LOCALIZADA = 13;
    let isLocalizadaEnabled = true; // Controlado pelo checkbox da camada no painel

    // Centróides calculados das 4 Frentes de Obra / Bairros para exibição em zoom distante (< 13)
    const BAIRRO_CENTROIDS = [
        {
            id: 'PEDRAS E VITÓRIA',
            nome: 'Pedras e Vitória',
            municipio: 'Guareí',
            lat: -23.366327,
            lng: -48.144570,
            cor: '#919389',
            icone: 'fa-layer-group'
        },
        {
            id: 'SERRA DA PRATA',
            nome: 'Serra da Prata',
            municipio: 'Paranapanema',
            lat: -23.461632,
            lng: -48.865993,
            cor: '#0284c7',
            icone: 'fa-map-marker-alt'
        },
        {
            id: 'POCINHO',
            nome: 'Pocinho',
            municipio: 'São Miguel Arcanjo',
            lat: -23.854393,
            lng: -48.180873,
            cor: '#10b981',
            icone: 'fa-map-marker-alt'
        },
        {
            id: 'JARDIM AEROPORTO',
            nome: 'Jardim Aeroporto',
            municipio: 'Itapetininga',
            lat: -23.576133,
            lng: -47.982075,
            cor: '#f59e0b',
            icone: 'fa-map-marker-alt'
        },
        {
            id: 'TURVO DOS ALMEIDAS',
            nome: 'Turvo dos Almeidas',
            municipio: 'Capão Bonito',
            lat: -23.861787,
            lng: -48.197851,
            cor: '#ec4899',
            icone: 'fa-map-marker-alt'
        },
        {
            id: 'PATEO VELHO',
            nome: 'Pateo Velho',
            municipio: 'Angatuba',
            lat: -23.553913,
            lng: -48.311200,
            cor: '#8b5cf6',
            icone: 'fa-map-marker-alt'
        }
    ];

    // Color Maps
    const STATUS_COLORS = {
        'CONCLUÍDO': '#10b981',       // Emerald Green
        'INICIADO': '#0284c7',        // Sky Blue
        'NÃO INICIADO': '#f59e0b',     // Amber
        'EXECUTADA': '#10b981',
        'PARCIALMENTE EXECUTADA': '#f97316',
        'NÃO EXECUTADA': '#ef4444',
        'DEFAULT': '#919389'
    };

    const SEGMENTO_COLORS = {
        'REDE COLETORA': '#2563eb',    // Royal Blue
        'LINHA DE RECALQUE': '#dc2626',// Vermelho (Red)
        'EMISSÁRIO': '#ea580c',        // Laranja (Orange)
        'EEE': '#919389',             // Engeform Taupe
        'DEFAULT': '#64748b'
    };

    const MATERIAL_COLORS = {
        'PVC': '#0284c7',
        'PVC-O': '#06b6d4',
        'PEAD': '#10b981',
        'FOFO': '#8b5cf6',
        'DEFAULT': '#64748b'
    };

    function getStatusColor(status) {
        if (!status) return STATUS_COLORS['DEFAULT'];
        const s = status.toUpperCase();
        return STATUS_COLORS[s] || STATUS_COLORS['DEFAULT'];
    }

    function getSegmentoColor(segmento) {
        if (!segmento) return SEGMENTO_COLORS['DEFAULT'];
        const s = segmento.toUpperCase();
        return SEGMENTO_COLORS[s] || SEGMENTO_COLORS['DEFAULT'];
    }

    function getMaterialColor(material) {
        if (!material) return MATERIAL_COLORS['DEFAULT'];
        const m = material.toUpperCase();
        return MATERIAL_COLORS[m] || MATERIAL_COLORS['DEFAULT'];
    }

    function getFeatureColor(props, layerType) {
        if (currentLegendMode === 'status') {
            return getStatusColor(props.status || props.SIT_ATEND);
        } else if (currentLegendMode === 'segmento') {
            return getSegmentoColor(props.segmento);
        } else if (currentLegendMode === 'material') {
            return getMaterialColor(props.material);
        }
        return getStatusColor(props.status);
    }

    // Custom Icon for EEE Points
    function createEEEMarker(latlng, feature) {
        const props = feature.properties;
        const color = getFeatureColor(props, 'localizada');
        
        const customIcon = L.divIcon({
            className: 'pulsing-marker',
            html: `
                <div class="pulsing-marker-ring" style="background: ${color}55;"></div>
                <div class="pulsing-marker-icon" style="background: ${color};">
                    <i class="fas fa-industry"></i>
                </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        const marker = L.marker(latlng, { icon: customIcon });
        marker.bindPopup(createLocalizadaPopup(props));
        return marker;
    }

    // Styles for Áreas de Expansão (Polygons) - Uniform Non-classified Style
    function styleAreas(feature) {
        return {
            fillColor: '#919389',
            fillOpacity: 0.25,
            color: '#919389',
            weight: 2,
            dashArray: '4, 4'
        };
    }

    // Styles for Camada Linear (Lines)
    function styleLinear(feature) {
        const props = feature.properties;
        const color = getFeatureColor(props, 'linear');
        const dn = parseInt(props.dn_nominal) || 100;
        
        let weight = 3;
        if (dn >= 200) weight = 5;
        else if (dn >= 150) weight = 4;
        
        return {
            color: color,
            weight: weight,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round'
        };
    }

    // Popups HTML Builders
    function createAreasPopup(props) {
        return `
            <div class="popup-header">
                <div class="popup-category">Área de Expansão (${props.recorte || 'FORMAL'})</div>
                <div class="popup-title">${props.bairro || 'Sem Nome'}</div>
            </div>
            <div class="popup-body">
                <div class="popup-row"><span class="popup-key">ID Área:</span><span class="popup-val">${props.ae_id || '-'}</span></div>
                <div class="popup-row"><span class="popup-key">Município:</span><span class="popup-val">${props.nm_mun || '-'}</span></div>
                <div class="popup-row"><span class="popup-key">Situação Atendimento:</span><span class="popup-val"><span class="popup-badge ${(props.SIT_ATEND || '').toLowerCase().replace(/ /g, '-')}">${props.SIT_ATEND || '-'}</span></span></div>
                <div class="popup-row"><span class="popup-key">Status Obra:</span><span class="popup-val">${props.status || '-'}</span></div>
                <div class="popup-row"><span class="popup-key">Domicílios Impactados:</span><span class="popup-val" style="color:#00a8cc; font-weight:800;">${props.qtd_domici || '0'} dom.</span></div>
                <div class="popup-row"><span class="popup-key">Índice ICE / IEC:</span><span class="popup-val">${props.ice || props.iec || '-'} %</span></div>
                <div class="popup-row"><span class="popup-key">Início Previsto / Real:</span><span class="popup-val">${props.inicio_p || '-'} / ${props.inicio_r || 'Não inf.'}</span></div>
                <div class="popup-row"><span class="popup-key">Término Previsto:</span><span class="popup-val">${props.termino_p || '-'}</span></div>
                ${props.obs ? `<div class="popup-row" style="flex-direction:column; gap:4px;"><span class="popup-key">Observações:</span><span class="popup-val" style="text-align:left; font-style:italic;">${props.obs}</span></div>` : ''}
            </div>
        `;
    }

    function createLinearPopup(props) {
        const ext = parseFloat(props.ext_calcul || 0).toFixed(2);
        return `
            <div class="popup-header" style="background: linear-gradient(135deg, #383a35, #919389);">
                <div class="popup-category">${props.segmento || 'REDE COLETORA'} (${props.produto || 'ESGOTO'})</div>
                <div class="popup-title">${props.bairro || props.nm_mun || 'Trecho de Rede'}</div>
            </div>
            <div class="popup-body">
                <div class="popup-row"><span class="popup-key">FID / ID:</span><span class="popup-val">#${props.fid || '-'}</span></div>
                <div class="popup-row"><span class="popup-key">Município:</span><span class="popup-val">${props.nm_mun || '-'}</span></div>
                <div class="popup-row"><span class="popup-key">Extensão Calculada:</span><span class="popup-val" style="color:#10b981; font-weight:800;">${ext} m</span></div>
                <div class="popup-row"><span class="popup-key">Material / DN:</span><span class="popup-val">${props.material || '-'} DN ${props.dn_nominal || '-'} mm</span></div>
                <div class="popup-row"><span class="popup-key">Profundidade Média:</span><span class="popup-val">${props.prof_media || '-'} m</span></div>
                <div class="popup-row"><span class="popup-key">Método Construtivo:</span><span class="popup-val">${props.met_constr || 'VCA'}</span></div>
                <div class="popup-row"><span class="popup-key">Status Obra:</span><span class="popup-val"><span class="popup-badge ${(props.status || '').toLowerCase().replace(/ /g, '-')}">${props.status || '-'}</span></span></div>
                <div class="popup-row"><span class="popup-key">Modalidade:</span><span class="popup-val">${props.modalidade || '-'}</span></div>
                <div class="popup-row"><span class="popup-key">Datas (Início / Fim):</span><span class="popup-val">${props.inicio_p || '-'} à ${props.termino_p || '-'}</span></div>
            </div>
        `;
    }

    function createLocalizadaPopup(props) {
        return `
            <div class="popup-header" style="background: linear-gradient(135deg, #8b5cf6, #353733);">
                <div class="popup-category">Infraestrutura Localizada (${props.segmento || 'EEE'})</div>
                <div class="popup-title">${props.bairro || 'Estação Elevatória de Esgoto'}</div>
            </div>
            <div class="popup-body">
                <div class="popup-row"><span class="popup-key">AE_ID:</span><span class="popup-val">${props.ae_id || '-'}</span></div>
                <div class="popup-row"><span class="popup-key">Município:</span><span class="popup-val">${props.nm_mun || '-'}</span></div>
                <div class="popup-row"><span class="popup-key">Vazão Projetada:</span><span class="popup-val" style="color:#00a8cc; font-weight:800;">${props.q_proj || '-'} L/s</span></div>
                <div class="popup-row"><span class="popup-key">Potência Instalada:</span><span class="popup-val">${props.pot_cv || '-'} CV</span></div>
                <div class="popup-row"><span class="popup-key">Altura Manométrica:</span><span class="popup-val">${props.altura_man || '-'} mca</span></div>
                <div class="popup-row"><span class="popup-key">Energização Prevista:</span><span class="popup-val">${props.energizaca || 'SIM'}</span></div>
                <div class="popup-row"><span class="popup-key">Status Obra:</span><span class="popup-val"><span class="popup-badge ${(props.status || '').toLowerCase().replace(/ /g, '-')}">${props.status || '-'}</span></span></div>
                <div class="popup-row"><span class="popup-key">Fonte / Contrato:</span><span class="popup-val">${props.fonte || '-'}</span></div>
            </div>
        `;
    }

    // Highlight specific Bairro while KEEPING ALL OTHER FEATURES VISIBLE
    function highlightBairro(bairroTarget) {
        currentHighlightedBairro = bairroTarget;
        const normTarget = bairroTarget ? bairroTarget.toUpperCase().trim() : null;

        const isMatchingBairro = function(props) {
            if (!normTarget) return false;
            const b = (props.bairro || '').toUpperCase().trim();
            if (!b) return false;
            if (b === normTarget) return true;
            if (normTarget.startsWith("PEDRAS E VITÓRIA") && b.startsWith(normTarget)) return true;
            return false;
        };

        // Linear Layer Highlight
        if (layerGroupLinear) {
            layerGroupLinear.eachLayer(function(layer) {
                const props = layer.feature.properties;
                const isSelected = isMatchingBairro(props);

                if (!normTarget) {
                    layerGroupLinear.resetStyle(layer);
                } else if (isSelected) {
                    // Vivid Cyan Highlight with thick weight
                    layer.setStyle({
                        color: '#00ffff',
                        weight: 7,
                        opacity: 1.0,
                        lineCap: 'round',
                        lineJoin: 'round'
                    });
                    if (layer.bringToFront) layer.bringToFront();
                } else {
                    // Muted background state - STILL FULLY VISIBLE
                    layer.setStyle({
                        opacity: 0.35,
                        weight: 2
                    });
                }
            });
        }

        // Areas Layer Highlight
        if (layerGroupAreas) {
            layerGroupAreas.eachLayer(function(layer) {
                const props = layer.feature.properties;
                const isSelected = isMatchingBairro(props);

                if (!normTarget) {
                    layerGroupAreas.resetStyle(layer);
                } else if (isSelected) {
                    layer.setStyle({
                        fillColor: '#00ffff',
                        fillOpacity: 0.55,
                        color: '#00ffff',
                        weight: 4,
                        dashArray: ''
                    });
                    if (layer.bringToFront) layer.bringToFront();
                } else {
                    layer.setStyle({
                        fillOpacity: 0.12,
                        opacity: 0.25,
                        weight: 1
                    });
                }
            });
        }

        // Localizada Marker Highlight
        if (layerGroupLocalizada) {
            layerGroupLocalizada.eachLayer(function(layer) {
                const props = layer.feature ? layer.feature.properties : {};
                const isSelected = isMatchingBairro(props);
                const el = layer.getElement();
                if (el) {
                    if (!normTarget) {
                        el.style.opacity = '1.0';
                        el.style.transform = 'scale(1)';
                    } else if (isSelected) {
                        el.style.opacity = '1.0';
                        el.style.transform = 'scale(1.5)';
                        el.style.zIndex = '1000';
                    } else {
                        el.style.opacity = '0.4';
                        el.style.transform = 'scale(0.85)';
                    }
                }
            });
        }
    }

    // Legend Configurations for the 3 Styling Modes
    const LEGENDS_DATA = {
        status: {
            title: 'Status de Execução',
            icon: 'fas fa-tasks',
            items: [
                { label: 'Concluído (100% Executado)', color: '#10b981', type: 'line' },
                { label: 'Iniciado (Em Execução)', color: '#0284c7', type: 'line' },
                { label: 'Não Iniciado (A Iniciar)', color: '#f59e0b', type: 'line' }
            ]
        },
        segmento: {
            title: 'Segmento (Infraestrutura)',
            icon: 'fas fa-network-wired',
            items: [
                { label: 'Rede Coletora de Esgoto', color: '#2563eb', type: 'line' },
                { label: 'Linha de Recalque', color: '#dc2626', type: 'line' },
                { label: 'Emissário de Esgoto', color: '#ea580c', type: 'line' },
                { label: 'Estação Elevatória (EEE)', color: '#919389', type: 'circle' }
            ]
        },
        material: {
            title: 'Material do Tubo',
            icon: 'fas fa-cube',
            items: [
                { label: 'PVC (Policloreto de Vinila)', color: '#0284c7', type: 'line' },
                { label: 'PVC-O (PVC Orientado)', color: '#06b6d4', type: 'line' },
                { label: 'PEAD (Polietileno Alta Dens.)', color: '#10b981', type: 'line' },
                { label: 'FOFO (Ferro Fundido)', color: '#8b5cf6', type: 'line' }
            ]
        }
    };

    function renderLegendHTML(mode, showTitle = false) {
        const legend = LEGENDS_DATA[mode] || LEGENDS_DATA['status'];
        let html = '';
        if (showTitle) {
            html += `<div class="map-floating-legend-title"><i class="${legend.icon}"></i> ${legend.title}</div>`;
        }
        html += '<div class="legend-group">';
        legend.items.forEach(item => {
            let symbolHtml = '';
            if (item.type === 'line') {
                symbolHtml = `<div class="legend-color-line" style="background:${item.color};"></div>`;
            } else if (item.type === 'circle') {
                symbolHtml = `<div class="legend-color-circle" style="background:${item.color}; border:1px solid rgba(255,255,255,0.4);"></div>`;
            } else {
                symbolHtml = `<div class="legend-color-box" style="background:${item.color};"></div>`;
            }
            html += `
                <div class="legend-row">
                    ${symbolHtml}
                    <span>${item.label}</span>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    function updateLegends(mode) {
        // 1. Update items inside map-floating-legend-items
        const mapItemsEl = document.getElementById('map-floating-legend-items');
        if (mapItemsEl) {
            mapItemsEl.innerHTML = renderLegendHTML(mode, false);
        } else {
            const floatingEl = document.getElementById('map-floating-legend');
            if (floatingEl && !floatingEl.querySelector('#select-legend-mode')) {
                floatingEl.innerHTML = renderLegendHTML(mode, true);
            }
        }

        // 2. Keep the select element value in sync
        const selLegend = document.getElementById('select-legend-mode');
        if (selLegend && selLegend.value !== mode) {
            selLegend.value = mode;
        }

        // 3. Update linear layer legend in sidebar
        const linearEl = document.getElementById('layer-linear-legend');
        if (linearEl) {
            linearEl.innerHTML = renderLegendHTML(mode, false);
        }

        // 4. Update preview element if present
        const previewEl = document.getElementById('active-legend-preview');
        if (previewEl) {
            previewEl.innerHTML = renderLegendHTML(mode, false);
        }
    }

    function updateLocalizadaMarkers() {
        if (!layerGroupLocalizada) return;
        layerGroupLocalizada.eachLayer(function(layer) {
            if (layer.feature && layer.feature.properties) {
                const color = getFeatureColor(layer.feature.properties, 'localizada');
                const el = layer.getElement();
                if (el) {
                    const ring = el.querySelector('.pulsing-marker-ring');
                    const icon = el.querySelector('.pulsing-marker-icon');
                    if (ring) ring.style.background = color + '55';
                    if (icon) icon.style.background = color;
                }
            }
        });
    }

    // Custom Marker for Bairro Centroid & Label (Distant zoom < 13)
    function createCentroidMarker(bairro) {
        const iconHtml = `
            <div class="bairro-centroid-marker" title="Clique para focar e selecionar ${bairro.nome}">
                <div class="bairro-centroid-pin" style="background-color: ${bairro.cor}; color: ${bairro.cor};">
                    <i class="fas ${bairro.icone}" style="color: #ffffff;"></i>
                </div>
                <div class="bairro-centroid-label">
                    <div class="bairro-centroid-name">${bairro.nome}</div>
                    <div class="bairro-centroid-mun">${bairro.municipio}</div>
                </div>
            </div>
        `;

        const customIcon = L.divIcon({
            className: 'bairro-centroid-leaflet-icon',
            html: iconHtml,
            iconSize: [180, 80],
            iconAnchor: [90, 19]
        });

        const marker = L.marker([bairro.lat, bairro.lng], {
            icon: customIcon,
            zIndexOffset: 500
        });

        marker.on('click', function() {
            if (window.selectBairro) {
                window.selectBairro(bairro.id, false);
            }
        });

        return marker;
    }

    // Gerenciador de visibilidade por zoom:
    // - Obras Localizadas (EEE): só aparecem em zoom próximo (>= 13); ocultas em zoom distante
    // - Centróides de Bairro: só aparecem em zoom distante (< 13); ocultos em zoom próximo
    function updateZoomVisibility() {
        if (!map) return;
        const currentZoom = map.getZoom();

        // 1. Obras Localizadas (EEE) - Visíveis em zoom aproximado (>= 13)
        if (layerGroupLocalizada) {
            const shouldBeVisibleLocalizada = isLocalizadaEnabled && (currentZoom >= MIN_ZOOM_LOCALIZADA);
            if (shouldBeVisibleLocalizada) {
                if (!map.hasLayer(layerGroupLocalizada)) {
                    map.addLayer(layerGroupLocalizada);
                    updateLocalizadaMarkers();
                    if (currentHighlightedBairro) {
                        highlightBairro(currentHighlightedBairro);
                    }
                }
            } else {
                if (map.hasLayer(layerGroupLocalizada)) {
                    map.removeLayer(layerGroupLocalizada);
                }
            }
        }

        // 2. Centróides de Bairro (Ícone + Rótulo) - Visíveis em zoom distante (< 13)
        if (layerGroupBairroCentroids) {
            const shouldBeVisibleCentroids = (currentZoom < MIN_ZOOM_LOCALIZADA);
            if (shouldBeVisibleCentroids) {
                if (!map.hasLayer(layerGroupBairroCentroids)) {
                    map.addLayer(layerGroupBairroCentroids);
                }
            } else {
                if (map.hasLayer(layerGroupBairroCentroids)) {
                    map.removeLayer(layerGroupBairroCentroids);
                }
            }
        }
    }

    return {
        init: function(leafletMap) {
            map = leafletMap;
            
            // 0. Camada de Limites Municipais (Apenas limite territorial e nome)
            if (window.GIS_MUNICIPIOS) {
                if (!map.getPane('municipiosPane')) {
                    const mPane = map.createPane('municipiosPane');
                    mPane.style.zIndex = '350';
                }

                layerGroupMunicipios = L.geoJSON(window.GIS_MUNICIPIOS, {
                    pane: 'municipiosPane',
                    style: function() {
                        return {
                            color: '#0284c7',          // Azul delimitador nítido
                            weight: 1.8,               // Espessura equilibrada
                            dashArray: '6, 6',         // Linha tracejada administrativa
                            fillColor: '#0284c7',
                            fillOpacity: 0.03,         // Extremamente translúcido
                            opacity: 0.85
                        };
                    },
                    onEachFeature: function(feature, layer) {
                        const nome = (feature.properties && feature.properties.nm_mun) ? feature.properties.nm_mun : 'Município';
                        
                        // Tooltip suave contendo apenas o nome do município
                        layer.bindTooltip(`<strong>${nome}</strong>`, {
                            sticky: true,
                            direction: 'top',
                            className: 'municipio-hover-tooltip'
                        });

                        // Popup simples com apenas o nome do município
                        layer.bindPopup(`
                            <div class="popup-header" style="background: linear-gradient(135deg, #0284c7, #0369a1); padding: 8px 12px;">
                                <div class="popup-category" style="font-size: 0.7rem; color: #bae6fd; text-transform: uppercase;">Limite Territorial</div>
                                <div class="popup-title" style="font-size: 1rem; color: #ffffff; font-weight: 700; margin-top: 2px;">${nome}</div>
                            </div>
                        `);

                        layer.on('mouseover', function(e) {
                            e.target.setStyle({
                                weight: 2.6,
                                color: '#38bdf8',
                                fillOpacity: 0.08
                            });
                        });

                        layer.on('mouseout', function(e) {
                            if (layerGroupMunicipios) {
                                layerGroupMunicipios.resetStyle(e.target);
                            }
                        });
                    }
                }).addTo(map);
            }

            layerGroupAreas = L.geoJSON(window.GIS_DATA.areas, {
                style: styleAreas,
                onEachFeature: function(feature, layer) {
                    layer.bindPopup(createAreasPopup(feature.properties));
                    layer.on('mouseover', function(e) {
                        if (!currentHighlightedBairro) {
                            e.target.setStyle({ fillOpacity: 0.6, weight: 3 });
                        }
                    });
                    layer.on('mouseout', function(e) {
                        if (!currentHighlightedBairro) {
                            layerGroupAreas.resetStyle(e.target);
                        }
                    });
                }
            }).addTo(map);

            layerGroupLinear = L.geoJSON(window.GIS_DATA.linear, {
                style: styleLinear,
                onEachFeature: function(feature, layer) {
                    layer.bindPopup(createLinearPopup(feature.properties));
                    layer.on('mouseover', function(e) {
                        if (!currentHighlightedBairro) {
                            e.target.setStyle({ weight: (e.target.options.weight || 3) + 3, opacity: 1 });
                        }
                    });
                    layer.on('mouseout', function(e) {
                        if (!currentHighlightedBairro) {
                            layerGroupLinear.resetStyle(e.target);
                        }
                    });
                }
            }).addTo(map);

            layerGroupLocalizada = L.geoJSON(window.GIS_DATA.localizada, {
                pointToLayer: function(feature, latlng) {
                    return createEEEMarker(latlng, feature);
                }
            });

            // Criar camada de centróides dos bairros com ícone e rótulo
            layerGroupBairroCentroids = L.layerGroup();
            BAIRRO_CENTROIDS.forEach(b => {
                layerGroupBairroCentroids.addLayer(createCentroidMarker(b));
            });

            // Controle de exibição condicional por zoom:
            // Centróides em zoom distante (< 13) e Obras Localizadas em zoom próximo (>= 13)
            map.on('zoomend', updateZoomVisibility);
            updateZoomVisibility();

            // Initialize legend displays for default mode
            updateLegends(currentLegendMode);
        },

        setLayerVisibility: function(layerName, visible) {
            if (layerName === 'municipios') {
                if (layerGroupMunicipios) {
                    if (visible) map.addLayer(layerGroupMunicipios);
                    else map.removeLayer(layerGroupMunicipios);
                }
            } else if (layerName === 'areas') {
                if (visible) map.addLayer(layerGroupAreas);
                else map.removeLayer(layerGroupAreas);
            } else if (layerName === 'linear') {
                if (visible) map.addLayer(layerGroupLinear);
                else map.removeLayer(layerGroupLinear);
            } else if (layerName === 'localizada') {
                isLocalizadaEnabled = visible;
                updateZoomVisibility();
            }
        },

        setOpacity: function(layerName, opacity) {
            if (layerName === 'municipios' && layerGroupMunicipios) {
                layerGroupMunicipios.setStyle({ fillOpacity: opacity * 0.05, opacity: opacity });
            } else if (layerName === 'areas' && layerGroupAreas) {
                layerGroupAreas.setStyle({ fillOpacity: opacity * 0.5, opacity: opacity });
            } else if (layerName === 'linear' && layerGroupLinear) {
                layerGroupLinear.setStyle({ opacity: opacity });
            }
        },

        setLegendMode: function(mode) {
            currentLegendMode = mode;
            updateLegends(mode);
            updateLocalizadaMarkers();
            if (currentHighlightedBairro) {
                highlightBairro(currentHighlightedBairro);
            } else {
                if (layerGroupLinear) layerGroupLinear.setStyle(styleLinear);
                if (layerGroupAreas) layerGroupAreas.setStyle(styleAreas);
            }
        },

        filterFeatures: function(predicate) {
            if (layerGroupAreas) {
                layerGroupAreas.clearLayers();
                const filtered = window.GIS_DATA.areas.features.filter(predicate);
                layerGroupAreas.addData({ type: "FeatureCollection", features: filtered });
            }

            if (layerGroupLinear) {
                layerGroupLinear.clearLayers();
                const filtered = window.GIS_DATA.linear.features.filter(predicate);
                layerGroupLinear.addData({ type: "FeatureCollection", features: filtered });
            }

            if (layerGroupLocalizada) {
                layerGroupLocalizada.clearLayers();
                const filtered = window.GIS_DATA.localizada.features.filter(predicate);
                layerGroupLocalizada.addData({ type: "FeatureCollection", features: filtered });
            }
        },

        highlightBairro: highlightBairro,

        getLayerGroup: function(name) {
            if (name === 'municipios') return layerGroupMunicipios;
            if (name === 'areas') return layerGroupAreas;
            if (name === 'linear') return layerGroupLinear;
            if (name === 'localizada') return layerGroupLocalizada;
            if (name === 'centroids') return layerGroupBairroCentroids;
            return null;
        },

        getStatusColor: getStatusColor,
        getSegmentoColor: getSegmentoColor,
        getMaterialColor: getMaterialColor,
        getLegendsData: function() { return LEGENDS_DATA; },
        updateLegends: updateLegends,
        renderLegendHTML: renderLegendHTML,
        getMinZoomLocalizada: function() { return MIN_ZOOM_LOCALIZADA; },
        updateZoomVisibility: updateZoomVisibility,
        updateLocalizadaZoomVisibility: updateZoomVisibility,
        getBairroCentroids: function() { return BAIRRO_CENTROIDS; }
    };
})();
