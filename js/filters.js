/* ==========================================================================
   WEBGIS FILTERS & DATATABLE ENGINE
   ========================================================================== */

window.GIS_FILTERS = (function() {
    let activeFilters = {
        municipio: 'all',
        status: 'all',
        segmento: 'all',
        material: 'all',
        recorte: 'all'
    };

    let searchIndex = [];
    let currentFilteredLinear = [];

    function buildSearchIndex() {
        searchIndex = [];
        
        // Areas
        window.GIS_DATA.areas.features.forEach(feat => {
            const p = feat.properties;
            searchIndex.push({
                type: 'Área de Expansão',
                title: `${p.ae_id || ''} - ${p.bairro || ''} (${p.nm_mun || ''})`,
                subtitle: `Status: ${p.status || ''} | Domicílios: ${p.qtd_domici || '0'}`,
                geometry: feat.geometry,
                feature: feat
            });
        });

        // Linear
        window.GIS_DATA.linear.features.forEach(feat => {
            const p = feat.properties;
            if (p.ae_id || p.bairro) {
                searchIndex.push({
                    type: 'Trecho de Rede',
                    title: `${p.segmento || 'Rede'} - ${p.bairro || p.nm_mun || ''} (#${p.fid})`,
                    subtitle: `DN ${p.dn_nominal || ''} mm ${p.material || ''} | Ext: ${(parseFloat(p.ext_calcul||0)).toFixed(1)}m`,
                    geometry: feat.geometry,
                    feature: feat
                });
            }
        });

        // Localizada
        window.GIS_DATA.localizada.features.forEach(feat => {
            const p = feat.properties;
            searchIndex.push({
                type: 'Infraestrutura (EEE)',
                title: `${p.segmento || 'EEE'} - ${p.bairro || p.nm_mun || ''} (${p.ae_id || ''})`,
                subtitle: `Vazão: ${p.q_proj || '-'} L/s | Potência: ${p.pot_cv || '-'} CV`,
                geometry: feat.geometry,
                feature: feat
            });
        });
    }

    function matchFeature(feature) {
        const p = feature.properties;

        // Municipio filter
        if (activeFilters.municipio !== 'all') {
            if (p.nm_mun !== activeFilters.municipio) return false;
        }

        // Status filter
        if (activeFilters.status !== 'all') {
            const featStatus = (p.status || p.SIT_ATEND || '').toUpperCase();
            if (featStatus !== activeFilters.status) return false;
        }

        // Segmento filter
        if (activeFilters.segmento !== 'all') {
            if (p.segmento !== activeFilters.segmento) return false;
        }

        // Material filter
        if (activeFilters.material !== 'all') {
            if (p.material !== activeFilters.material) return false;
        }

        // Recorte filter
        if (activeFilters.recorte !== 'all') {
            if (p.recorte !== activeFilters.recorte) return false;
        }

        return true;
    }

    function updateKPIs(filteredLinear, filteredAreas, filteredLocalizada) {
        let totalExtM = 0;
        let extConcluidoM = 0;

        filteredLinear.forEach(f => {
            const ext = parseFloat(f.properties.ext_calcul || 0);
            totalExtM += ext;
            if ((f.properties.status || '').toUpperCase() === 'CONCLUÍDO') {
                extConcluidoM += ext;
            }
        });

        let totalDom = 0;
        filteredAreas.forEach(f => {
            totalDom += parseInt(f.properties.qtd_domici || 0);
        });

        const totalEEE = filteredLocalizada.length;
        const pctConcluido = totalExtM > 0 ? ((extConcluidoM / totalExtM) * 100).toFixed(1) : 0;

        // Update UI KPI cards (safely check for element existence)
        const elExt = document.getElementById('kpi-ext-total');
        if (elExt) elExt.innerText = (totalExtM / 1000).toFixed(2);
        const elDom = document.getElementById('kpi-domicilios');
        if (elDom) elDom.innerText = totalDom.toLocaleString('pt-BR');
        const elEee = document.getElementById('kpi-eees');
        if (elEee) elEee.innerText = totalEEE;
        const elPct = document.getElementById('kpi-pct-concluido');
        if (elPct) elPct.innerText = pctConcluido + '%';
    }

    function renderDatatable(filteredLinear) {
        const tbody = document.getElementById('table-body');
        if (!tbody) return;

        tbody.innerHTML = '';
        const displayList = filteredLinear.slice(0, 100); // Display top 100

        displayList.forEach(f => {
            const p = f.properties;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${p.fid || '-'}</td>
                <td><strong>${p.nm_mun || '-'}</strong></td>
                <td>${p.bairro || '-'}</td>
                <td><span class="popup-badge ${(p.segmento||'').toLowerCase().replace(/ /g, '-')}">${p.segmento || '-'}</span></td>
                <td>${p.material || '-'} DN ${p.dn_nominal || '-'}</td>
                <td><strong>${(parseFloat(p.ext_calcul||0)).toFixed(1)} m</strong></td>
                <td><span class="popup-badge ${(p.status||'').toLowerCase().replace(/ /g, '-')}">${p.status || '-'}</span></td>
            `;

            tr.addEventListener('click', function() {
                if (f.geometry && f.geometry.coordinates) {
                    const coords = f.geometry.coordinates;
                    let latlng;
                    if (f.geometry.type === 'LineString') {
                        const mid = Math.floor(coords.length / 2);
                        latlng = [coords[mid][1], coords[mid][0]];
                    } else if (f.geometry.type === 'Point') {
                        latlng = [coords[1], coords[0]];
                    }
                    if (latlng) {
                        window.GIS_MAP.flyTo(latlng, 16);
                    }
                }
            });

            tbody.appendChild(tr);
        });

        document.getElementById('table-count').innerText = `${filteredLinear.length} trechos (exibindo primeiros ${displayList.length})`;
    }

    return {
        init: function() {
            buildSearchIndex();
            currentFilteredLinear = window.GIS_DATA.linear.features;

            // Search input logic
            const searchInput = document.getElementById('global-search');
            const dropdown = document.getElementById('search-dropdown');

            if (searchInput && dropdown) {
                searchInput.addEventListener('input', function(e) {
                    const query = e.target.value.toLowerCase().trim();
                    if (query.length < 2) {
                        dropdown.style.display = 'none';
                        return;
                    }

                    const results = searchIndex.filter(item => 
                        item.title.toLowerCase().includes(query) || 
                        item.subtitle.toLowerCase().includes(query)
                    ).slice(0, 8);

                    if (results.length === 0) {
                        dropdown.innerHTML = '<div class="search-result-item" style="color:#94a3b8; font-style:italic;">Nenhum elemento encontrado</div>';
                    } else {
                        dropdown.innerHTML = results.map((res, i) => `
                            <div class="search-result-item" data-index="${i}">
                                <div style="font-size:0.7rem; color:#00a8cc; font-weight:700;">${res.type}</div>
                                <div style="font-size:0.85rem; font-weight:700; color:white;">${res.title}</div>
                                <div style="font-size:0.75rem; color:#94a3b8;">${res.subtitle}</div>
                            </div>
                        `).join('');

                        dropdown.querySelectorAll('.search-result-item').forEach((el, idx) => {
                            el.addEventListener('click', function() {
                                const target = results[idx];
                                dropdown.style.display = 'none';
                                searchInput.value = '';

                                if (target.geometry) {
                                    let bounds;
                                    const layer = L.geoJSON(target.feature);
                                    bounds = layer.getBounds();
                                    if (bounds.isValid()) {
                                        window.GIS_MAP.fitBounds(bounds, { maxZoom: 17, padding: [50, 50] });
                                    }
                                }
                            });
                        });
                    }

                    dropdown.style.display = 'block';
                });

                document.addEventListener('click', function(e) {
                    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
                        dropdown.style.display = 'none';
                    }
                });
            }

            // Filter Change Handlers
            ['municipio', 'status', 'segmento', 'material', 'recorte'].forEach(filterId => {
                const el = document.getElementById(`filter-${filterId}`);
                if (el) {
                    el.addEventListener('change', function(e) {
                        activeFilters[filterId] = e.target.value;
                        GIS_FILTERS.applyFilters();
                    });
                }
            });

            // Reset filters button
            const btnReset = document.getElementById('btn-reset-filters');
            if (btnReset) {
                btnReset.addEventListener('click', function() {
                    activeFilters = { municipio: 'all', status: 'all', segmento: 'all', material: 'all', recorte: 'all' };
                    ['municipio', 'status', 'segmento', 'material', 'recorte'].forEach(filterId => {
                        const el = document.getElementById(`filter-${filterId}`);
                        if (el) el.value = 'all';
                    });
                    GIS_FILTERS.applyFilters();
                });
            }
        },

        applyFilters: function() {
            window.GIS_LAYERS.filterFeatures(matchFeature);

            const filteredLinear = window.GIS_DATA.linear.features.filter(matchFeature);
            const filteredAreas = window.GIS_DATA.areas.features.filter(matchFeature);
            const filteredLocalizada = window.GIS_DATA.localizada.features.filter(matchFeature);

            currentFilteredLinear = filteredLinear;

            updateKPIs(filteredLinear, filteredAreas, filteredLocalizada);
            window.GIS_CHARTS.update(filteredLinear);
            renderDatatable(filteredLinear);
        },

        exportCSV: function() {
            if (window.GIS_EXPORTER && typeof window.GIS_EXPORTER.openModal === 'function') {
                window.GIS_EXPORTER.openModal('linear');
                return;
            }

            if (!currentFilteredLinear || currentFilteredLinear.length === 0) {
                alert('Nenhum dado selecionado para exportar.');
                return;
            }

            const headers = ['FID', 'Município', 'Bairro', 'Segmento', 'Material', 'DN (mm)', 'Extensão (m)', 'Profundidade Média (m)', 'Status', 'Modalidade', 'Início Previsto', 'Término Previsto'];
            let csvContent = headers.join(';') + '\n';

            currentFilteredLinear.forEach(f => {
                const p = f.properties;
                const row = [
                    p.fid || '',
                    `"${p.nm_mun || ''}"`,
                    `"${p.bairro || ''}"`,
                    `"${p.segmento || ''}"`,
                    `"${p.material || ''}"`,
                    p.dn_nominal || '',
                    (parseFloat(p.ext_calcul || 0)).toFixed(2),
                    p.prof_media || '',
                    `"${p.status || ''}"`,
                    `"${p.modalidade || ''}"`,
                    p.inicio_p || '',
                    p.termino_p || ''
                ];
                csvContent += row.join(';') + '\n';
            });

            const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Acompanhamento_Obras_Sabesp_Lote4_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };
})();
