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

    // Grupo Escopo Original (Comparativo Bairro / Frente de Obra)
    let layerGroupOrigAreas = null;
    let layerGroupOrigLinear = null;
    let layerGroupOrigPontual = null;
    let isOrigPontualEnabled = true;
    let isOrigAreasEnabled = true;
    let isOrigLinearEnabled = true;

    let currentLegendMode = 'status'; // 'status', 'escopo', 'segmento', 'material'
    let currentHighlightedBairro = null;

    // Limiar de zoom:
    // - Obras Localizadas (EEE): visíveis em zoom aproximado (>= 13); ocultas em zoom distante
    // - Centróides de Bairro (Ícone + Rótulo): visíveis em zoom distante (< 13); ocultos em zoom aproximado
    const MIN_ZOOM_LOCALIZADA = 13;
    let isLocalizadaEnabled = true; // Controlado pelo checkbox da camada no painel

    // Centróides calculados das 6 Frentes de Obra / Bairros para exibição em zoom distante (< 13)
    // Classificados rigorosamente por Status de Execução: Concluído (#10b981), Iniciado (#0284c7) e Não Iniciado (#f59e0b)
    const BAIRRO_CENTROIDS = [
        {
            id: 'PEDRAS E VITÓRIA',
            nome: 'Pedras e Vitória',
            municipio: 'Guareí',
            status: 'INICIADO',
            statusLabel: 'Iniciado',
            lat: -23.366327,
            lng: -48.144570,
            cor: '#0284c7',
            icone: 'fa-spinner'
        },
        {
            id: 'TURVO DOS ALMEIDAS',
            nome: 'Turvo dos Almeidas',
            municipio: 'Capão Bonito',
            status: 'NÃO INICIADO',
            statusLabel: 'Não Iniciado',
            lat: -23.861787,
            lng: -48.197851,
            cor: '#f59e0b',
            icone: 'fa-clock'
        },
        {
            id: 'SERRA DA PRATA',
            nome: 'Serra da Prata',
            municipio: 'Paranapanema',
            status: 'INICIADO',
            statusLabel: 'Iniciado',
            lat: -23.461632,
            lng: -48.865993,
            cor: '#0284c7',
            icone: 'fa-spinner'
        },
        {
            id: 'POCINHO',
            nome: 'Pocinho',
            municipio: 'São Miguel Arcanjo',
            status: 'INICIADO',
            statusLabel: 'Iniciado',
            lat: -23.854393,
            lng: -48.180873,
            cor: '#0284c7',
            icone: 'fa-spinner'
        },
        {
            id: 'JARDIM AEROPORTO',
            nome: 'Jardim Aeroporto',
            municipio: 'Itapetininga',
            status: 'INICIADO',
            statusLabel: 'Iniciado',
            lat: -23.576133,
            lng: -47.982075,
            cor: '#0284c7',
            icone: 'fa-spinner'
        },
        {
            id: 'PATEO VELHO',
            nome: 'Pateo Velho',
            municipio: 'Angatuba',
            status: 'CONCLUÍDO',
            statusLabel: 'Concluído',
            lat: -23.553913,
            lng: -48.311200,
            cor: '#10b981',
            icone: 'fa-check'
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
        if (currentLegendMode === 'escopo') {
            return '#0284c7'; // Escopo Final (Consolidado)
        } else if (currentLegendMode === 'status') {
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

    // Styles for Áreas de Expansão (Polygons) - Uniform Non-classified Style / Escopo
    function styleAreas(feature) {
        if (currentLegendMode === 'escopo') {
            return {
                fillColor: '#0284c7',
                fillOpacity: 0.22,
                color: '#0284c7',
                weight: 2.2,
                dashArray: ''
            };
        }
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
                ${props.bairro ? `
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-dark);">
                    <button type="button" style="width:100%; background: #0284c7; color:#fff; border:none; border-radius:6px; padding:6px 10px; font-size:0.75rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow: 0 2px 6px rgba(2,132,199,0.3);" onclick="if(window.selectBairro) window.selectBairro('${props.bairro}', false);">
                        <i class="fas fa-crosshairs"></i> Centralizar Frente (${props.bairro})
                    </button>
                </div>` : ''}
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
                ${props.bairro ? `
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-dark);">
                    <button type="button" style="width:100%; background: #0284c7; color:#fff; border:none; border-radius:6px; padding:6px 10px; font-size:0.75rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow: 0 2px 6px rgba(2,132,199,0.3);" onclick="if(window.selectBairro) window.selectBairro('${props.bairro}', false);">
                        <i class="fas fa-crosshairs"></i> Centralizar Frente (${props.bairro})
                    </button>
                </div>` : ''}
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
                ${props.bairro ? `
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-dark);">
                    <button type="button" style="width:100%; background: #0284c7; color:#fff; border:none; border-radius:6px; padding:6px 10px; font-size:0.75rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow: 0 2px 6px rgba(2,132,199,0.3);" onclick="if(window.selectBairro) window.selectBairro('${props.bairro}', false);">
                        <i class="fas fa-crosshairs"></i> Centralizar Frente (${props.bairro})
                    </button>
                </div>` : ''}
            </div>
        `;
    }

    // =========================================================================
    // ESCOPO ORIGINAL (Comparativo Bairro / Frente de Obra) - Styles & Popups
    // =========================================================================
    function styleOrigAreas(feature) {
        return {
            color: '#f97316',          // Laranja distintivo do Escopo Original
            fillColor: '#f97316',
            weight: 2.5,
            opacity: 0.9,
            fillOpacity: 0.15,
            dashArray: '5, 5'          // Contorno tracejado para contrastar com polígono sólido atual
        };
    }

    function styleOrigLinear(feature) {
        return {
            color: '#f97316',          // Laranja contrastante
            weight: 3.5,
            opacity: 0.9,
            dashArray: '6, 6',         // Linha tracejada para permitir sobreposição visual imediata
            lineCap: 'round',
            lineJoin: 'round'
        };
    }

    function createOrigPontualMarker(latlng, feature) {
        const props = feature.properties || {};
        const color = '#f97316';
        const iconHtml = `
            <div class="pulsing-marker-wrapper" title="[Escopo Original] ${props.nome || props.subtipo || 'Estrutura'} - ${props.bairro || ''}">
                <div class="pulsing-marker-ring" style="background: ${color}55;"></div>
                <div class="pulsing-marker-icon" style="background: ${color}; border: 2px dashed #ffffff; border-radius: 4px;">
                    <i class="fas fa-industry" style="color: #ffffff; font-size: 10px;"></i>
                </div>
            </div>
        `;

        const icon = L.divIcon({
            className: 'custom-orig-pontual-icon',
            html: iconHtml,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
            popupAnchor: [0, -10]
        });

        const marker = L.marker(latlng, { icon: icon });
        marker.bindPopup(createOrigPontualPopup(props));
        return marker;
    }

    function createOrigAreasPopup(props) {
        return `
            <div class="popup-header" style="background: linear-gradient(135deg, #c2410c, #9a3412);">
                <div class="popup-category" style="color:#fdba74;">Escopo Original • Área de Expansão</div>
                <div class="popup-title" style="color:#ffffff;">${props.bairro || props.nm_mun || 'Área Original'}</div>
            </div>
            <div class="popup-body">
                <div class="popup-row"><span class="popup-key">Bairro / Frente:</span><span class="popup-val" style="color:#f97316; font-weight:800;">${props.bairro || '-'}</span></div>
                <div class="popup-row"><span class="popup-key">Município:</span><span class="popup-val">${props.nm_mun || '-'}</span></div>
                <div class="popup-row"><span class="popup-key">Código AE:</span><span class="popup-val">${props.ae_id || '-'}</span></div>
                <div class="popup-row"><span class="popup-key">Domicílios Previstos:</span><span class="popup-val" style="color:#0284c7; font-weight:700;">${props.qtd_domici ? props.qtd_domici : 'Não informado'}</span></div>
                <div class="popup-row"><span class="popup-key">Recorte:</span><span class="popup-val">${props.recorte || 'Formal'}</span></div>
                <div class="popup-row"><span class="popup-key">Camada Base:</span><span class="popup-val"><span class="popup-badge" style="background:#f9731633; color:#f97316; border:1px solid #f9731688;">ESCOPO ORIGINAL</span></span></div>
                <div style="font-size:0.72rem; color:var(--text-muted-dark); margin-top:8px; padding-top:6px; border-top:1px dashed var(--border-dark);">
                    💡 <em>Camada do Escopo Original para confrontação territorial com o Geopackage revisado.</em>
                </div>
                ${props.bairro ? `
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-dark);">
                    <button type="button" style="width:100%; background: #f97316; color:#fff; border:none; border-radius:6px; padding:6px 10px; font-size:0.75rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow: 0 2px 6px rgba(249,115,22,0.3);" onclick="if(window.selectBairro) window.selectBairro('${props.bairro}', false);">
                        <i class="fas fa-crosshairs"></i> Centralizar Frente (${props.bairro})
                    </button>
                </div>` : ''}
            </div>
        `;
    }

    function createOrigLinearPopup(props) {
        const extStr = props.ext_calcul ? props.ext_calcul.toFixed(2) + ' m' : (props.extensao_c ? props.extensao_c + ' m' : 'Calculado no mapa');
        return `
            <div class="popup-header" style="background: linear-gradient(135deg, #c2410c, #9a3412);">
                <div class="popup-category" style="color:#fdba74;">Escopo Original • ${props.subtipo || props.tipo || 'Rede de Esgoto'}</div>
                <div class="popup-title" style="color:#ffffff;">${props.bairro || props.nm_mun || 'Trecho de Rede'}</div>
            </div>
            <div class="popup-body">
                <div class="popup-row"><span class="popup-key">Bairro / Frente:</span><span class="popup-val" style="color:#f97316; font-weight:800;">${props.bairro || '-'}</span></div>
                <div class="popup-row"><span class="popup-key">Município:</span><span class="popup-val">${props.nm_mun || '-'}</span></div>
                <div class="popup-row"><span class="popup-key">Extensão Cadastral:</span><span class="popup-val" style="color:#10b981; font-weight:800;">${extStr}</span></div>
                <div class="popup-row"><span class="popup-key">Material / DN:</span><span class="popup-val">${props.material || 'PVC'} ${props.diametro_n ? 'DN ' + props.diametro_n + ' mm' : ''}</span></div>
                <div class="popup-row"><span class="popup-key">Código Objeto / AE:</span><span class="popup-val">${props.id_objeto || props.ae_id || '-'}</span></div>
                <div class="popup-row"><span class="popup-key">Fonte Cadastral:</span><span class="popup-val">${props.fonte || 'Cadastro Base Original'}</span></div>
                <div class="popup-row"><span class="popup-key">Camada Base:</span><span class="popup-val"><span class="popup-badge" style="background:#f9731633; color:#f97316; border:1px solid #f9731688;">ESCOPO ORIGINAL</span></span></div>
                <div style="font-size:0.72rem; color:var(--text-muted-dark); margin-top:8px; padding-top:6px; border-top:1px dashed var(--border-dark);">
                    💡 <em>Traçado linear do Escopo Original para confrontação com a rede revisada.</em>
                </div>
                ${props.bairro ? `
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-dark);">
                    <button type="button" style="width:100%; background: #f97316; color:#fff; border:none; border-radius:6px; padding:6px 10px; font-size:0.75rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow: 0 2px 6px rgba(249,115,22,0.3);" onclick="if(window.selectBairro) window.selectBairro('${props.bairro}', false);">
                        <i class="fas fa-crosshairs"></i> Centralizar Frente (${props.bairro})
                    </button>
                </div>` : ''}
            </div>
        `;
    }

    function createOrigPontualPopup(props) {
        return `
            <div class="popup-header" style="background: linear-gradient(135deg, #c2410c, #9a3412);">
                <div class="popup-category" style="color:#fdba74;">Escopo Original • Obra Pontual</div>
                <div class="popup-title" style="color:#ffffff;">${props.nome || props.subtipo || 'Estrutura Pontual'}</div>
            </div>
            <div class="popup-body">
                <div class="popup-row"><span class="popup-key">Tipo / Subtipo:</span><span class="popup-val" style="color:#f97316; font-weight:800;">${props.subtipo || props.tipo || 'EEE'}</span></div>
                <div class="popup-row"><span class="popup-key">Bairro / Frente:</span><span class="popup-val" style="color:#f97316; font-weight:800;">${props.bairro || '-'}</span></div>
                <div class="popup-row"><span class="popup-key">Município:</span><span class="popup-val">${props.nm_mun || '-'}</span></div>
                ${props.vazao_proj ? `<div class="popup-row"><span class="popup-key">Vazão Projetada:</span><span class="popup-val" style="color:#0284c7; font-weight:800;">${props.vazao_proj} L/s</span></div>` : ''}
                ${props.potencia_c ? `<div class="popup-row"><span class="popup-key">Potência Instalada:</span><span class="popup-val">${props.potencia_c} CV</span></div>` : ''}
                ${props.altura_man ? `<div class="popup-row"><span class="popup-key">Altura Manométrica:</span><span class="popup-val">${props.altura_man} mca</span></div>` : ''}
                <div class="popup-row"><span class="popup-key">Camada Base:</span><span class="popup-val"><span class="popup-badge" style="background:#f9731633; color:#f97316; border:1px solid #f9731688;">ESCOPO ORIGINAL</span></span></div>
                <div style="font-size:0.72rem; color:var(--text-muted-dark); margin-top:8px; padding-top:6px; border-top:1px dashed var(--border-dark);">
                    💡 <em>Estrutura pontual do Escopo Original para confrontação com o geopackage revisado.</em>
                </div>
                ${props.bairro ? `
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-dark);">
                    <button type="button" style="width:100%; background: #f97316; color:#fff; border:none; border-radius:6px; padding:6px 10px; font-size:0.75rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow: 0 2px 6px rgba(249,115,22,0.3);" onclick="if(window.selectBairro) window.selectBairro('${props.bairro}', false);">
                        <i class="fas fa-crosshairs"></i> Centralizar Frente (${props.bairro})
                    </button>
                </div>` : ''}
            </div>
        `;
    }

    // Highlight specific Bairro while KEEPING ALL OTHER FEATURES VISIBLE
    function normStr(str) {
        return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    }

    // A função de realce que alterava as cores dos elementos no mapa foi desativada a pedido do usuário.
    // Todas as camadas mantêm estritamente suas cores e estilos da legenda ativa (apenas zoom e enquadramento ocorrem).
    function highlightBairro(bairroTarget) {
        currentHighlightedBairro = bairroTarget;
        if (layerGroupLinear) layerGroupLinear.setStyle(styleLinear);
        if (layerGroupAreas) layerGroupAreas.setStyle(styleAreas);
        if (layerGroupOrigLinear) layerGroupOrigLinear.setStyle(styleOrigLinear);
        if (layerGroupOrigAreas) layerGroupOrigAreas.setStyle(styleOrigAreas);
    }

    // Legend Configurations for the Styling Modes (Escopo, Status, Segmento, Material)
    const LEGENDS_DATA = {
        escopo: {
            title: 'Classificação por Escopo',
            icon: 'fas fa-balance-scale',
            items: [
                { label: 'Escopo Final (Projeto Consolidado)', color: '#0284c7', type: 'escopo-final' },
                { label: 'Escopo Original (Estudo Preliminar)', color: '#f97316', type: 'escopo-original' }
            ]
        },
        status: {
            title: 'Status de Execução',
            icon: 'fas fa-tasks',
            items: [
                { label: 'Concluído', color: '#10b981', icon: 'fa-check', type: 'both' },
                { label: 'Iniciado', color: '#0284c7', icon: 'fa-spinner', type: 'both' },
                { label: 'Não Iniciado', color: '#f59e0b', icon: 'fa-clock', type: 'both' }
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
            if (item.type === 'escopo-final') {
                symbolHtml = `
                    <div style="display:inline-flex; align-items:center; gap:5px; margin-right:6px;">
                        <div class="legend-color-line" style="background:${item.color}; width:20px; height:4px; border-radius:2px;" title="Rede Contínua Sólida"></div>
                        <div class="legend-color-box" style="background:rgba(2,132,199,0.3); border:1.5px solid ${item.color}; width:11px; height:11px; border-radius:2px;" title="Polígono do Escopo Final"></div>
                    </div>
                `;
            } else if (item.type === 'escopo-original') {
                symbolHtml = `
                    <div style="display:inline-flex; align-items:center; gap:5px; margin-right:6px;">
                        <div class="legend-color-line" style="background:#f97316; border-top:2px dashed #ffedd5; height:4px; width:20px;" title="Rede Tracejada Laranja"></div>
                        <div class="legend-color-box" style="background:rgba(249,115,22,0.25); border:1.5px dashed #f97316; width:11px; height:11px; border-radius:2px;" title="Polígono do Escopo Original"></div>
                    </div>
                `;
            } else if (item.type === 'both') {
                symbolHtml = `
                    <div style="display:inline-flex; align-items:center; gap:6px; margin-right:6px;">
                        <span style="display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; border-radius:50%; background:${item.color}; border:2px solid #ffffff; box-shadow:0 0 5px ${item.color}aa; font-size:8px; color:#ffffff;" title="Ícone da Frente no Mapa (Zoom Distante)">
                            <i class="fas ${item.icon || 'fa-map-marker-alt'}"></i>
                        </span>
                        <div class="legend-color-line" style="background:${item.color}; width:16px; height:4px; border-radius:2px;" title="Rede de Esgoto (Zoom Próximo)"></div>
                    </div>
                `;
            } else if (item.type === 'line') {
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
                const el = (typeof layer.getElement === 'function') ? layer.getElement() : null;
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
            <div class="bairro-centroid-marker" title="Frente de Obra: ${bairro.nome} (${bairro.municipio}) - Status: ${bairro.statusLabel}">
                <div class="bairro-centroid-pin" style="background-color: ${bairro.cor}; color: ${bairro.cor}; border-color: #ffffff; box-shadow: 0 4px 14px ${bairro.cor}88;">
                    <i class="fas ${bairro.icone}" style="color: #ffffff;"></i>
                </div>
                <div class="bairro-centroid-label">
                    <div class="bairro-centroid-name">${bairro.nome}</div>
                    <div class="bairro-centroid-mun">${bairro.municipio} • <span style="color:${bairro.cor}; font-weight:700;">${bairro.statusLabel}</span></div>
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

        // 3. Escopo Original (Visibilidade controlada por modo de legenda 'escopo' e zoom)
        updateOrigLayersVisibility();
    }

    // Gerenciador de visibilidade das camadas do Escopo Original:
    // O Escopo Original só é visível no mapa quando a legenda ativa for "Classificar por Escopo" ('escopo')
    function updateOrigLayersVisibility() {
        if (!map) return;
        const isEscopoActive = (currentLegendMode === 'escopo');
        const currentZoom = map.getZoom();

        // 1. Áreas Originais
        if (layerGroupOrigAreas) {
            const shouldBeVisible = isEscopoActive && isOrigAreasEnabled;
            if (shouldBeVisible) {
                if (!map.hasLayer(layerGroupOrigAreas)) {
                    map.addLayer(layerGroupOrigAreas);
                    layerGroupOrigAreas.setStyle(styleOrigAreas);
                    if (currentHighlightedBairro) {
                        highlightBairro(currentHighlightedBairro);
                    }
                }
            } else {
                if (map.hasLayer(layerGroupOrigAreas)) {
                    map.removeLayer(layerGroupOrigAreas);
                }
            }
        }

        // 2. Redes Lineares Originais
        if (layerGroupOrigLinear) {
            const shouldBeVisible = isEscopoActive && isOrigLinearEnabled;
            if (shouldBeVisible) {
                if (!map.hasLayer(layerGroupOrigLinear)) {
                    map.addLayer(layerGroupOrigLinear);
                    layerGroupOrigLinear.setStyle(styleOrigLinear);
                    if (currentHighlightedBairro) {
                        highlightBairro(currentHighlightedBairro);
                    }
                }
            } else {
                if (map.hasLayer(layerGroupOrigLinear)) {
                    map.removeLayer(layerGroupOrigLinear);
                }
            }
        }

        // 3. Obras Pontuais Originais (EEE/ETE) - Somente em modo escopo E zoom aproximado (>= 13)
        if (layerGroupOrigPontual) {
            const shouldBeVisible = isEscopoActive && isOrigPontualEnabled && (currentZoom >= MIN_ZOOM_LOCALIZADA);
            if (shouldBeVisible) {
                if (!map.hasLayer(layerGroupOrigPontual)) {
                    map.addLayer(layerGroupOrigPontual);
                    if (currentHighlightedBairro) {
                        highlightBairro(currentHighlightedBairro);
                    }
                }
            } else {
                if (map.hasLayer(layerGroupOrigPontual)) {
                    map.removeLayer(layerGroupOrigPontual);
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
                    layer.on('click', function(e) {
                        const b = (feature.properties && feature.properties.bairro) ? feature.properties.bairro : null;
                        if (b && window.selectBairro) {
                            window.selectBairro(b, false);
                        }
                    });
                    layer.on('mouseover', function(e) {
                        e.target.setStyle({ fillOpacity: 0.5, weight: 3 });
                    });
                    layer.on('mouseout', function(e) {
                        layerGroupAreas.resetStyle(e.target);
                    });
                }
            }).addTo(map);

            layerGroupLinear = L.geoJSON(window.GIS_DATA.linear, {
                style: styleLinear,
                onEachFeature: function(feature, layer) {
                    layer.bindPopup(createLinearPopup(feature.properties));
                    layer.on('mouseover', function(e) {
                        e.target.setStyle({ weight: (e.target.options.weight || 3) + 2 });
                    });
                    layer.on('mouseout', function(e) {
                        layerGroupLinear.resetStyle(e.target);
                    });
                }
            }).addTo(map);

            layerGroupLocalizada = L.geoJSON(window.GIS_DATA.localizada, {
                pointToLayer: function(feature, latlng) {
                    return createEEEMarker(latlng, feature);
                }
            });

            // Camadas do Escopo Original (Comparativo Bairro / Frente de Obra)
            if (window.GIS_ESCOPO_ORIGINAL) {
                if (window.GIS_ESCOPO_ORIGINAL.areas) {
                    layerGroupOrigAreas = L.geoJSON(window.GIS_ESCOPO_ORIGINAL.areas, {
                        style: styleOrigAreas,
                        onEachFeature: function(feature, layer) {
                            layer.bindPopup(createOrigAreasPopup(feature.properties));
                            layer.on('click', function(e) {
                                const b = (feature.properties && feature.properties.bairro) ? feature.properties.bairro : null;
                                if (b && window.selectBairro) {
                                    window.selectBairro(b, false);
                                }
                            });
                            layer.on('mouseover', function(e) {
                                e.target.setStyle({ fillOpacity: 0.35, weight: 3.5 });
                            });
                            layer.on('mouseout', function(e) {
                                layerGroupOrigAreas.resetStyle(e.target);
                            });
                        }
                    });
                }

                if (window.GIS_ESCOPO_ORIGINAL.linear) {
                    layerGroupOrigLinear = L.geoJSON(window.GIS_ESCOPO_ORIGINAL.linear, {
                        style: styleOrigLinear,
                        onEachFeature: function(feature, layer) {
                            layer.bindPopup(createOrigLinearPopup(feature.properties));
                            layer.on('mouseover', function(e) {
                                e.target.setStyle({ weight: 5.5 });
                            });
                            layer.on('mouseout', function(e) {
                                layerGroupOrigLinear.resetStyle(e.target);
                            });
                        }
                    });
                }

                if (window.GIS_ESCOPO_ORIGINAL.pontual) {
                    layerGroupOrigPontual = L.geoJSON(window.GIS_ESCOPO_ORIGINAL.pontual, {
                        pointToLayer: function(feature, latlng) {
                            return createOrigPontualMarker(latlng, feature);
                        }
                    });
                }
            }

            // Criar camada de centróides dos bairros com ícone e rótulo
            layerGroupBairroCentroids = L.layerGroup();
            BAIRRO_CENTROIDS.forEach(b => {
                layerGroupBairroCentroids.addLayer(createCentroidMarker(b));
            });

            // Controle de exibição condicional por zoom e modo de legenda:
            map.on('zoomend', updateZoomVisibility);
            updateZoomVisibility();
            updateOrigLayersVisibility();

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
            } else if (layerName === 'orig-areas') {
                isOrigAreasEnabled = visible;
                updateOrigLayersVisibility();
            } else if (layerName === 'orig-linear') {
                isOrigLinearEnabled = visible;
                updateOrigLayersVisibility();
            } else if (layerName === 'orig-pontual') {
                isOrigPontualEnabled = visible;
                updateOrigLayersVisibility();
            }
        },

        setOpacity: function(layerName, opacity) {
            if (layerName === 'municipios' && layerGroupMunicipios) {
                layerGroupMunicipios.setStyle({ fillOpacity: opacity * 0.05, opacity: opacity });
            } else if (layerName === 'areas' && layerGroupAreas) {
                layerGroupAreas.setStyle({ fillOpacity: opacity * 0.5, opacity: opacity });
            } else if (layerName === 'linear' && layerGroupLinear) {
                layerGroupLinear.setStyle({ opacity: opacity });
            } else if (layerName === 'orig-areas' && layerGroupOrigAreas) {
                layerGroupOrigAreas.setStyle({ fillOpacity: opacity * 0.25, opacity: opacity });
            } else if (layerName === 'orig-linear' && layerGroupOrigLinear) {
                layerGroupOrigLinear.setStyle({ opacity: opacity });
            }
        },

        setLegendMode: function(mode) {
            currentLegendMode = mode;
            updateLegends(mode);
            updateLocalizadaMarkers();
            updateOrigLayersVisibility();
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
            if (name === 'orig-areas') return layerGroupOrigAreas;
            if (name === 'orig-linear') return layerGroupOrigLinear;
            if (name === 'orig-pontual') return layerGroupOrigPontual;
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
