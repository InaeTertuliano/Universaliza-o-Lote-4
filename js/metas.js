/* ==========================================================================
   METAS DE ECONOMIAS - UNIVERSALIZAÇÃO SABESP (LOTE 4 ITAPETININGA)
   Módulo Interativo de Acompanhamento das Metas Contratuais (Pacote O1L4)
   Planilha: metas_economias.xlsx (Acompanhamento de Obras / Projeto 01)
   ========================================================================== */

window.GIS_METAS_MODULE = (function() {
    let data = null;
    let currentMunFilter = 'all';
    let currentServiceFilter = 'all'; // 'all', 'esgoto', 'agua'
    let currentTableView = 'geral'; // 'geral', 'anos', 'recorte'

    const MUN_BAIRRO_MAP = {
        'GUAREÍ': 'PEDRAS E VITÓRIA',
        'ITAPETININGA': 'JARDIM AEROPORTO',
        'PARANAPANEMA': 'SERRA DA PRATA',
        'SÃO MIGUEL ARCANJO': 'POCINHO'
    };

    function init() {
        data = window.GIS_METAS;
        if (!data) {
            console.error("GIS_METAS data not available");
            return;
        }

        setupUI();
        updateDisplay();
        renderQuadroIndicadores();
        renderDiagramaBarras();
        setupEventListeners();
        console.log("Módulo Metas de Economias Engeform & Sabesp inicializado com sucesso!");
    }

    function setupUI() {
        // Populate Select de Municípios
        const selMun = document.getElementById('metas-select-municipio');
        if (selMun) {
            selMun.innerHTML = '<option value="all">Todos os Municípios (10 municípios - Lote 4)</option>';
            data.municipios.forEach(m => {
                const hasGis = MUN_BAIRRO_MAP[m.municipio.toUpperCase()] ? ' 📍' : '';
                const opt = document.createElement('option');
                opt.value = m.municipio;
                opt.textContent = `${m.municipio}${hasGis} (${m.total_geral.toLocaleString('pt-BR')} economias)`;
                selMun.appendChild(opt);
            });
        }
    }

    function updateDisplay() {
        const isAll = (currentMunFilter === 'all');
        const munData = isAll ? null : data.municipios.find(m => m.municipio.toUpperCase() === currentMunFilter.toUpperCase());

        // 1. Title & Scope
        const titleScope = document.getElementById('metas-scope-title');
        const badgeGis = document.getElementById('metas-gis-badge');
        
        if (titleScope) {
            titleScope.textContent = isAll ? 'Consolidado Lote 4 (10 Municípios)' : `${munData.municipio} (Cód. IBGE: ${munData.cod_municipio})`;
        }

        if (badgeGis) {
            if (!isAll && MUN_BAIRRO_MAP[munData.municipio.toUpperCase()]) {
                const bairroName = MUN_BAIRRO_MAP[munData.municipio.toUpperCase()];
                badgeGis.style.display = 'inline-flex';
                badgeGis.innerHTML = `<i class="fas fa-map-marked-alt"></i> Frente Mapeada no GIS: <strong>${bairroName}</strong> (Clique para aproximar)`;
                badgeGis.onclick = function() {
                    if (window.selectBairro) {
                        window.selectBairro(bairroName, false);
                    }
                };
            } else {
                badgeGis.style.display = 'none';
            }
        }

        // 2. Metrics Calculation
        let totalGeral, totalEsgoto, totalAgua;
        let ano2026, ano2027, ano2028;
        let formalTotal, ruralTotal;

        if (isAll) {
            totalGeral = data.totais.total_geral;
            totalEsgoto = data.totais.esgoto.total;
            totalAgua = data.totais.agua.total;
            ano2026 = data.totais.ano['2026'];
            ano2027 = data.totais.ano['2027'];
            ano2028 = data.totais.ano['2028'];
            formalTotal = data.totais.agua.formal.total + data.totais.esgoto.formal.total;
            ruralTotal = data.totais.agua.rural.total + data.totais.esgoto.rural.total;
        } else {
            totalGeral = munData.total_geral;
            totalEsgoto = munData.esgoto.total;
            totalAgua = munData.agua.total;
            ano2026 = munData.agua.total_ano['2026'] + munData.esgoto.total_ano['2026'];
            ano2027 = munData.agua.total_ano['2027'] + munData.esgoto.total_ano['2027'];
            ano2028 = munData.agua.total_ano['2028'] + munData.esgoto.total_ano['2028'];
            formalTotal = munData.agua.formal.total + munData.esgoto.formal.total;
            ruralTotal = munData.agua.rural.total + munData.esgoto.rural.total;
        }

        // Filter service adjustments if requested
        let displayedTotal = totalGeral;
        if (currentServiceFilter === 'esgoto') displayedTotal = totalEsgoto;
        else if (currentServiceFilter === 'agua') displayedTotal = totalAgua;

        // 3. Update KPI values in DOM
        const elTotalGeral = document.getElementById('metas-kpi-total-geral');
        const elTotalEsgoto = document.getElementById('metas-kpi-total-esgoto');
        const elTotalAgua = document.getElementById('metas-kpi-total-agua');
        const elPctEsgoto = document.getElementById('metas-kpi-pct-esgoto');
        const elPctAgua = document.getElementById('metas-kpi-pct-agua');

        if (elTotalGeral) elTotalGeral.textContent = displayedTotal.toLocaleString('pt-BR');
        if (elTotalEsgoto) elTotalEsgoto.textContent = totalEsgoto.toLocaleString('pt-BR');
        if (elTotalAgua) elTotalAgua.textContent = totalAgua.toLocaleString('pt-BR');

        if (elPctEsgoto && totalGeral > 0) {
            elPctEsgoto.textContent = ((totalEsgoto / totalGeral) * 100).toFixed(1) + '%';
        }
        if (elPctAgua && totalGeral > 0) {
            elPctAgua.textContent = ((totalAgua / totalGeral) * 100).toFixed(1) + '%';
        }

        // 4. Update Year Cards (2026, 2027, 2028)
        let val2026 = ano2026, val2027 = ano2027, val2028 = ano2028;
        if (currentServiceFilter === 'esgoto') {
            val2026 = isAll ? data.totais.esgoto.ano['2026'] : munData.esgoto.total_ano['2026'];
            val2027 = isAll ? data.totais.esgoto.ano['2027'] : munData.esgoto.total_ano['2027'];
            val2028 = isAll ? data.totais.esgoto.ano['2028'] : munData.esgoto.total_ano['2028'];
        } else if (currentServiceFilter === 'agua') {
            val2026 = isAll ? data.totais.agua.ano['2026'] : munData.agua.total_ano['2026'];
            val2027 = isAll ? data.totais.agua.ano['2027'] : munData.agua.total_ano['2027'];
            val2028 = isAll ? data.totais.agua.ano['2028'] : munData.agua.total_ano['2028'];
        }

        const denom = (val2026 + val2027 + val2028) || 1;

        const updateYearCard = (year, val) => {
            const elVal = document.getElementById(`metas-val-${year}`);
            const elPct = document.getElementById(`metas-pct-${year}`);
            const elBar = document.getElementById(`metas-bar-${year}`);
            const pct = ((val / denom) * 100).toFixed(1);

            if (elVal) elVal.textContent = val.toLocaleString('pt-BR');
            if (elPct) elPct.textContent = `${pct}%`;
            if (elBar) elBar.style.width = `${pct}%`;
        };

        updateYearCard('2026', val2026);
        updateYearCard('2027', val2027);
        updateYearCard('2028', val2028);

        // 5. Update Recorte (Formal x Rural)
        let rFormal = formalTotal, rRural = ruralTotal;
        if (currentServiceFilter === 'esgoto') {
            rFormal = isAll ? data.totais.esgoto.formal.total : munData.esgoto.formal.total;
            rRural = isAll ? data.totais.esgoto.rural.total : munData.esgoto.rural.total;
        } else if (currentServiceFilter === 'agua') {
            rFormal = isAll ? data.totais.agua.formal.total : munData.agua.formal.total;
            rRural = isAll ? data.totais.agua.rural.total : munData.agua.rural.total;
        }

        const rTotal = (rFormal + rRural) || 1;
        const pctFormal = ((rFormal / rTotal) * 100).toFixed(1);
        const pctRural = ((rRural / rTotal) * 100).toFixed(1);

        const elFormalVal = document.getElementById('metas-formal-val');
        const elFormalPct = document.getElementById('metas-formal-pct');
        const elFormalBar = document.getElementById('metas-formal-bar');
        const elRuralVal = document.getElementById('metas-rural-val');
        const elRuralPct = document.getElementById('metas-rural-pct');
        const elRuralBar = document.getElementById('metas-rural-bar');

        if (elFormalVal) elFormalVal.textContent = rFormal.toLocaleString('pt-BR');
        if (elFormalPct) elFormalPct.textContent = `${pctFormal}%`;
        if (elFormalBar) elFormalBar.style.width = `${pctFormal}%`;

        if (elRuralVal) elRuralVal.textContent = rRural.toLocaleString('pt-BR');
        if (elRuralPct) elRuralPct.textContent = `${pctRural}%`;
        if (elRuralBar) elRuralBar.style.width = `${pctRural}%`;

        // 6. Update Ranking List
        renderRanking();

        // 7. Update Table View
        renderTable(currentTableView);
    }

    function renderRanking() {
        const container = document.getElementById('metas-ranking-container');
        if (!container) return;

        // Sort municipalities by total
        const sorted = [...data.municipios].sort((a, b) => {
            let valA = a.total_geral;
            let valB = b.total_geral;
            if (currentServiceFilter === 'esgoto') {
                valA = a.esgoto.total;
                valB = b.esgoto.total;
            } else if (currentServiceFilter === 'agua') {
                valA = a.agua.total;
                valB = b.agua.total;
            }
            return valB - valA;
        });

        const maxVal = sorted[0] ? (currentServiceFilter === 'esgoto' ? sorted[0].esgoto.total : (currentServiceFilter === 'agua' ? sorted[0].agua.total : sorted[0].total_geral)) : 1;

        let html = '';
        sorted.forEach((m, idx) => {
            const isSelected = (currentMunFilter.toUpperCase() === m.municipio.toUpperCase());
            const hasGis = MUN_BAIRRO_MAP[m.municipio.toUpperCase()];
            let val = m.total_geral;
            if (currentServiceFilter === 'esgoto') val = m.esgoto.total;
            else if (currentServiceFilter === 'agua') val = m.agua.total;

            const pctBar = ((val / maxVal) * 100).toFixed(1);
            const pctShare = ((val / (currentServiceFilter === 'esgoto' ? data.totais.esgoto.total : (currentServiceFilter === 'agua' ? data.totais.agua.total : data.totais.total_geral))) * 100).toFixed(1);

            html += `
                <div class="metas-ranking-row ${isSelected ? 'active-row' : ''}" data-mun="${m.municipio}">
                    <div class="metas-ranking-header">
                        <div class="metas-ranking-name">
                            <span class="metas-rank-badge">#${idx + 1}</span>
                            <strong>${m.municipio}</strong>
                            ${hasGis ? '<span class="metas-gis-tag" title="Frente de obra com camada gráfica no WebGIS"><i class="fas fa-map-marker-alt"></i> GIS</span>' : ''}
                        </div>
                        <div class="metas-ranking-val">
                            <strong>${val.toLocaleString('pt-BR')}</strong> <span class="metas-val-unit">econ. (${pctShare}%)</span>
                        </div>
                    </div>
                    <div class="metas-bar-bg">
                        <div class="metas-bar-fill" style="width: ${pctBar}%;"></div>
                    </div>
                    <div class="metas-ranking-sub">
                        <span><i class="fas fa-tint" style="color:#0284c7;"></i> Água: <strong>${m.agua.total.toLocaleString('pt-BR')}</strong></span>
                        <span><i class="fas fa-water" style="color:#10b981;"></i> Esgoto: <strong>${m.esgoto.total.toLocaleString('pt-BR')}</strong></span>
                        <span><i class="fas fa-chart-line" style="color:#f59e0b;"></i> IEC: <strong>${m.iec.total.toLocaleString('pt-BR')}</strong></span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Add Click Handlers on rows
        container.querySelectorAll('.metas-ranking-row').forEach(row => {
            row.addEventListener('click', function() {
                const mun = this.dataset.mun;
                setMunicipioFilter(mun === currentMunFilter ? 'all' : mun);
            });
        });
    }

    function renderTable(view) {
        currentTableView = view;
        const container = document.getElementById('metas-table-container');
        if (!container) return;

        let theadHtml = '';
        let tbodyHtml = '';
        let tfootHtml = '';

        if (view === 'geral') {
            theadHtml = `
                <tr>
                    <th style="text-align:left;">Município</th>
                    <th>Cód. IBGE</th>
                    <th>Total Água</th>
                    <th>Total Esgoto</th>
                    <th>IEC Total</th>
                    <th>Total Geral</th>
                    <th>Ação</th>
                </tr>
            `;

            data.municipios.forEach(m => {
                const isSelected = (currentMunFilter.toUpperCase() === m.municipio.toUpperCase());
                const hasGis = MUN_BAIRRO_MAP[m.municipio.toUpperCase()];
                tbodyHtml += `
                    <tr class="${isSelected ? 'selected-tr' : ''}">
                        <td style="text-align:left; font-weight:700;">
                            ${m.municipio}
                            ${hasGis ? ' <i class="fas fa-map-marker-alt" style="color:#0284c7; font-size:10px;" title="Possui frente mapeada"></i>' : ''}
                        </td>
                        <td>${m.cod_municipio}</td>
                        <td style="color:#0284c7; font-weight:600;">${m.agua.total.toLocaleString('pt-BR')}</td>
                        <td style="color:#10b981; font-weight:600;">${m.esgoto.total.toLocaleString('pt-BR')}</td>
                        <td style="color:#f59e0b; font-weight:600;">${m.iec.total.toLocaleString('pt-BR')}</td>
                        <td style="font-weight:800; color:#f8fafc;">${m.total_geral.toLocaleString('pt-BR')}</td>
                        <td>
                            <button class="metas-btn-table-select" data-mun="${m.municipio}" title="Filtrar município">
                                <i class="fas fa-filter"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });

            tfootHtml = `
                <tr style="background: rgba(145, 147, 137, 0.25); font-weight:800;">
                    <td style="text-align:left;">TOTAL LOTE 4</td>
                    <td>10 Mun.</td>
                    <td style="color:#0284c7;">${data.totais.agua.total.toLocaleString('pt-BR')}</td>
                    <td style="color:#10b981;">${data.totais.esgoto.total.toLocaleString('pt-BR')}</td>
                    <td style="color:#f59e0b;">${data.totais.iec.total.toLocaleString('pt-BR')}</td>
                    <td style="color:#f8fafc;">${data.totais.total_geral.toLocaleString('pt-BR')}</td>
                    <td>-</td>
                </tr>
            `;
        } else if (view === 'anos') {
            theadHtml = `
                <tr>
                    <th style="text-align:left;">Município</th>
                    <th>Água 2026</th>
                    <th>Água 2027</th>
                    <th>Água 2028</th>
                    <th>Esg. 2026</th>
                    <th>Esg. 2027</th>
                    <th>Esg. 2028</th>
                    <th>Total 2026</th>
                    <th>Total 2027</th>
                    <th>Total 2028</th>
                </tr>
            `;

            data.municipios.forEach(m => {
                const tot26 = m.agua.total_ano['2026'] + m.esgoto.total_ano['2026'];
                const tot27 = m.agua.total_ano['2027'] + m.esgoto.total_ano['2027'];
                const tot28 = m.agua.total_ano['2028'] + m.esgoto.total_ano['2028'];
                tbodyHtml += `
                    <tr>
                        <td style="text-align:left; font-weight:700;">${m.municipio}</td>
                        <td>${m.agua.total_ano['2026']}</td>
                        <td>${m.agua.total_ano['2027']}</td>
                        <td>${m.agua.total_ano['2028']}</td>
                        <td>${m.esgoto.total_ano['2026']}</td>
                        <td>${m.esgoto.total_ano['2027']}</td>
                        <td>${m.esgoto.total_ano['2028']}</td>
                        <td style="font-weight:700; color:#38bdf8;">${tot26.toLocaleString('pt-BR')}</td>
                        <td style="font-weight:700; color:#10b981;">${tot27.toLocaleString('pt-BR')}</td>
                        <td style="font-weight:700; color:#f59e0b;">${tot28.toLocaleString('pt-BR')}</td>
                    </tr>
                `;
            });

            tfootHtml = `
                <tr style="background: rgba(145, 147, 137, 0.25); font-weight:800;">
                    <td style="text-align:left;">TOTAL LOTE 4</td>
                    <td>${data.totais.agua.ano['2026'].toLocaleString('pt-BR')}</td>
                    <td>${data.totais.agua.ano['2027'].toLocaleString('pt-BR')}</td>
                    <td>${data.totais.agua.ano['2028'].toLocaleString('pt-BR')}</td>
                    <td>${data.totais.esgoto.ano['2026'].toLocaleString('pt-BR')}</td>
                    <td>${data.totais.esgoto.ano['2027'].toLocaleString('pt-BR')}</td>
                    <td>${data.totais.esgoto.ano['2028'].toLocaleString('pt-BR')}</td>
                    <td style="color:#38bdf8;">${data.totais.ano['2026'].toLocaleString('pt-BR')}</td>
                    <td style="color:#10b981;">${data.totais.ano['2027'].toLocaleString('pt-BR')}</td>
                    <td style="color:#f59e0b;">${data.totais.ano['2028'].toLocaleString('pt-BR')}</td>
                </tr>
            `;
        } else if (view === 'recorte') {
            theadHtml = `
                <tr>
                    <th style="text-align:left;">Município</th>
                    <th>Água Formal</th>
                    <th>Água Rural</th>
                    <th>Esg. Formal</th>
                    <th>Esg. Rural</th>
                    <th>Total Formal</th>
                    <th>Total Rural</th>
                    <th>Total Geral</th>
                </tr>
            `;

            data.municipios.forEach(m => {
                const fTot = m.agua.formal.total + m.esgoto.formal.total;
                const rTot = m.agua.rural.total + m.esgoto.rural.total;
                tbodyHtml += `
                    <tr>
                        <td style="text-align:left; font-weight:700;">${m.municipio}</td>
                        <td>${m.agua.formal.total.toLocaleString('pt-BR')}</td>
                        <td>${m.agua.rural.total.toLocaleString('pt-BR')}</td>
                        <td>${m.esgoto.formal.total.toLocaleString('pt-BR')}</td>
                        <td>${m.esgoto.rural.total.toLocaleString('pt-BR')}</td>
                        <td style="font-weight:700; color:#38bdf8;">${fTot.toLocaleString('pt-BR')}</td>
                        <td style="font-weight:700; color:#10b981;">${rTot.toLocaleString('pt-BR')}</td>
                        <td style="font-weight:800; color:#f8fafc;">${m.total_geral.toLocaleString('pt-BR')}</td>
                    </tr>
                `;
            });

            const fTotAll = data.totais.agua.formal.total + data.totais.esgoto.formal.total;
            const rTotAll = data.totais.agua.rural.total + data.totais.esgoto.rural.total;

            tfootHtml = `
                <tr style="background: rgba(145, 147, 137, 0.25); font-weight:800;">
                    <td style="text-align:left;">TOTAL LOTE 4</td>
                    <td>${data.totais.agua.formal.total.toLocaleString('pt-BR')}</td>
                    <td>${data.totais.agua.rural.total.toLocaleString('pt-BR')}</td>
                    <td>${data.totais.esgoto.formal.total.toLocaleString('pt-BR')}</td>
                    <td>${data.totais.esgoto.rural.total.toLocaleString('pt-BR')}</td>
                    <td style="color:#38bdf8;">${fTotAll.toLocaleString('pt-BR')}</td>
                    <td style="color:#10b981;">${rTotAll.toLocaleString('pt-BR')}</td>
                    <td style="color:#f8fafc;">${data.totais.total_geral.toLocaleString('pt-BR')}</td>
                </tr>
            `;
        }

        container.innerHTML = `
            <table class="datatable">
                <thead>${theadHtml}</thead>
                <tbody>${tbodyHtml}</tbody>
                <tfoot>${tfootHtml}</tfoot>
            </table>
        `;

        // Attach Select Button Handlers
        container.querySelectorAll('.metas-btn-table-select').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const mun = this.dataset.mun;
                setMunicipioFilter(mun === currentMunFilter ? 'all' : mun);
            });
        });
    }

    function setupEventListeners() {
        // Select dropdown
        const selMun = document.getElementById('metas-select-municipio');
        if (selMun) {
            selMun.addEventListener('change', function() {
                setMunicipioFilter(this.value);
            });
        }

        // Reset Filter Button
        const btnReset = document.getElementById('btn-metas-reset-filter');
        if (btnReset) {
            btnReset.addEventListener('click', function() {
                setMunicipioFilter('all');
            });
        }

        // Service filter buttons
        const srvBtns = document.querySelectorAll('.metas-service-btn');
        srvBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                srvBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentServiceFilter = this.dataset.service;
                updateDisplay();
            });
        });

        // Table View buttons
        const tabBtns = document.querySelectorAll('.metas-tab-view-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                tabBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                renderTable(this.dataset.view);
            });
        });

        // Export CSV Button
        const btnExport = document.getElementById('btn-export-metas-csv');
        if (btnExport) {
            btnExport.addEventListener('click', exportCSV);
        }

        // Header button to open Metas tab directly
        const btnHeader = document.getElementById('btn-open-metas-header');
        if (btnHeader) {
            btnHeader.addEventListener('click', function() {
                const targetBtn = document.querySelector('.nav-tab-btn[data-tab="metas"]');
                if (targetBtn) targetBtn.click();
            });
        }

        // Quadro Indicadores Event Listeners
        const quadroSrvBtns = document.querySelectorAll('.quadro-service-btn');
        quadroSrvBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                quadroSrvBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentQuadroService = this.dataset.service;
                renderQuadroIndicadores();
            });
        });

        const searchInput = document.getElementById('quadro-search-mun');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                currentQuadroSearch = this.value.toLowerCase().trim();
                renderQuadroIndicadores();
            });
        }

        const btnExportQuadro = document.getElementById('btn-export-quadro-indicadores-csv');
        if (btnExportQuadro) {
            btnExportQuadro.addEventListener('click', exportQuadroCSV);
        }

        // Diagrama de Barras Event Listeners
        const diagBtns = document.querySelectorAll('.diag-mode-btn');
        diagBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                diagBtns.forEach(b => {
                    b.classList.remove('active');
                    b.style.background = 'transparent';
                    b.style.color = 'var(--text-muted-dark)';
                });
                this.classList.add('active');
                this.style.background = '#0284c7';
                this.style.color = 'white';
                currentDiagMode = this.dataset.mode;
                renderDiagramaBarras();
            });
        });

        const chkDiagAll = document.getElementById('chk-diag-all-mun');
        if (chkDiagAll) {
            chkDiagAll.addEventListener('change', function() {
                currentDiagAllMun = this.checked;
                renderDiagramaBarras();
            });
        }
    }

    // =========================================================================
    // QUADRO DE METAS POR ANO E RECORTE (PAINEL INDICADORES)
    // =========================================================================
    let currentQuadroService = 'all'; // 'all', 'esgoto', 'agua'
    let currentQuadroSearch = '';

    function getMunMetricsByService(m, srv) {
        let f26 = 0, f27 = 0, f28 = 0;
        let r26 = 0, r27 = 0, r28 = 0;

        if (srv === 'all' || srv === 'agua') {
            f26 += m.agua.formal['2026'];
            f27 += m.agua.formal['2027'];
            f28 += m.agua.formal['2028'];
            r26 += m.agua.rural['2026'];
            r27 += m.agua.rural['2027'];
            r28 += m.agua.rural['2028'];
        }

        if (srv === 'all' || srv === 'esgoto') {
            f26 += m.esgoto.formal['2026'];
            f27 += m.esgoto.formal['2027'];
            f28 += m.esgoto.formal['2028'];
            r26 += m.esgoto.rural['2026'];
            r27 += m.esgoto.rural['2027'];
            r28 += m.esgoto.rural['2028'];
        }

        const fTot = f26 + f27 + f28;
        const rTot = r26 + r27 + r28;
        const tot26 = f26 + r26;
        const tot27 = f27 + r27;
        const tot28 = f28 + r28;
        const grandTot = fTot + rTot;

        return { f26, f27, f28, fTot, r26, r27, r28, rTot, tot26, tot27, tot28, grandTot };
    }

    function renderQuadroIndicadores() {
        if (!data || !data.municipios) return;

        const container = document.getElementById('quadro-matriz-container');
        if (!container) return;

        // Calculate Totals across all municipalities for the selected service
        let sumF26 = 0, sumF27 = 0, sumF28 = 0, sumFTot = 0;
        let sumR26 = 0, sumR27 = 0, sumR28 = 0, sumRTot = 0;
        let sumTot26 = 0, sumTot27 = 0, sumTot28 = 0, sumGrandTot = 0;

        data.municipios.forEach(m => {
            const met = getMunMetricsByService(m, currentQuadroService);
            sumF26 += met.f26; sumF27 += met.f27; sumF28 += met.f28; sumFTot += met.fTot;
            sumR26 += met.r26; sumR27 += met.r27; sumR28 += met.r28; sumRTot += met.rTot;
            sumTot26 += met.tot26; sumTot27 += met.tot27; sumTot28 += met.tot28; sumGrandTot += met.grandTot;
        });

        // Update Top Summary KPIs in Painel Indicadores
        const elTotal = document.getElementById('quadro-total-economias');
        const elFormal = document.getElementById('quadro-kpi-formal');
        const elRural = document.getElementById('quadro-kpi-rural');
        const elF26 = document.getElementById('quadro-f26');
        const elF27 = document.getElementById('quadro-f27');
        const elF28 = document.getElementById('quadro-f28');
        const elR26 = document.getElementById('quadro-r26');
        const elR27 = document.getElementById('quadro-r27');
        const elR28 = document.getElementById('quadro-r28');

        if (elTotal) elTotal.textContent = sumGrandTot.toLocaleString('pt-BR');
        if (elFormal) elFormal.textContent = sumFTot.toLocaleString('pt-BR');
        if (elRural) elRural.textContent = sumRTot.toLocaleString('pt-BR');
        if (elF26) elF26.textContent = sumF26.toLocaleString('pt-BR');
        if (elF27) elF27.textContent = sumF27.toLocaleString('pt-BR');
        if (elF28) elF28.textContent = sumF28.toLocaleString('pt-BR');
        if (elR26) elR26.textContent = sumR26.toLocaleString('pt-BR');
        if (elR27) elR27.textContent = sumR27.toLocaleString('pt-BR');
        if (elR28) elR28.textContent = sumR28.toLocaleString('pt-BR');

        // Filter municipalities by search query
        const filtered = data.municipios.filter(m => {
            if (!currentQuadroSearch) return true;
            return m.municipio.toLowerCase().includes(currentQuadroSearch);
        });

        const elCount = document.getElementById('quadro-mun-count');
        if (elCount) elCount.textContent = `${filtered.length} de ${data.municipios.length} municípios`;

        // Build Table Matrix HTML
        let tbodyHtml = '';
        filtered.forEach(m => {
            const met = getMunMetricsByService(m, currentQuadroService);
            const hasGis = MUN_BAIRRO_MAP[m.municipio.toUpperCase()];
            const bairroName = hasGis || '';

            tbodyHtml += `
                <tr data-mun="${m.municipio}" title="${hasGis ? 'Clique para aproximar no bairro ' + bairroName : ''}">
                    <td>
                        <strong>${m.municipio}</strong>
                        ${hasGis ? '<span style="color:#0284c7; margin-left:4px; font-size:10px;"><i class="fas fa-map-marker-alt"></i> GIS</span>' : ''}
                    </td>
                    <td class="quadro-col-formal">${met.f26.toLocaleString('pt-BR')}</td>
                    <td class="quadro-col-formal">${met.f27.toLocaleString('pt-BR')}</td>
                    <td class="quadro-col-formal">${met.f28.toLocaleString('pt-BR')}</td>
                    <td class="quadro-col-formal" style="font-weight:700;">${met.fTot.toLocaleString('pt-BR')}</td>
                    
                    <td class="quadro-col-rural">${met.r26.toLocaleString('pt-BR')}</td>
                    <td class="quadro-col-rural">${met.r27.toLocaleString('pt-BR')}</td>
                    <td class="quadro-col-rural">${met.r28.toLocaleString('pt-BR')}</td>
                    <td class="quadro-col-rural" style="font-weight:700;">${met.rTot.toLocaleString('pt-BR')}</td>

                    <td class="quadro-col-total">${met.tot26.toLocaleString('pt-BR')}</td>
                    <td class="quadro-col-total">${met.tot27.toLocaleString('pt-BR')}</td>
                    <td class="quadro-col-total">${met.tot28.toLocaleString('pt-BR')}</td>

                    <td class="quadro-col-grand">${met.grandTot.toLocaleString('pt-BR')}</td>
                </tr>
            `;
        });

        const theadHtml = `
            <thead>
                <tr>
                    <th rowspan="2" style="vertical-align:middle; min-width:140px;">Município</th>
                    <th colspan="4" style="background:rgba(2, 132, 199, 0.22); color:#38bdf8; text-align:center;">RECORTE FORMAL (URBANO)</th>
                    <th colspan="4" style="background:rgba(16, 185, 129, 0.22); color:#10b981; text-align:center;">RECORTE RURAL</th>
                    <th colspan="3" style="background:rgba(245, 158, 11, 0.22); color:#f59e0b; text-align:center;">TOTAL POR ANO</th>
                    <th rowspan="2" style="background:rgba(255, 255, 255, 0.12); color:#ffffff; vertical-align:middle; min-width:85px;">TOTAL GERAL</th>
                </tr>
                <tr>
                    <th class="quadro-col-formal">2026</th>
                    <th class="quadro-col-formal">2027</th>
                    <th class="quadro-col-formal">2028</th>
                    <th class="quadro-col-formal" style="font-weight:800;">Total</th>

                    <th class="quadro-col-rural">2026</th>
                    <th class="quadro-col-rural">2027</th>
                    <th class="quadro-col-rural">2028</th>
                    <th class="quadro-col-rural" style="font-weight:800;">Total</th>

                    <th class="quadro-col-total">2026</th>
                    <th class="quadro-col-total">2027</th>
                    <th class="quadro-col-total">2028</th>
                </tr>
            </thead>
        `;

        const tfootHtml = `
            <tfoot>
                <tr style="background: rgba(145, 147, 137, 0.25); font-weight:800;">
                    <td>TOTAL LOTE 4</td>
                    <td class="quadro-col-formal">${sumF26.toLocaleString('pt-BR')}</td>
                    <td class="quadro-col-formal">${sumF27.toLocaleString('pt-BR')}</td>
                    <td class="quadro-col-formal">${sumF28.toLocaleString('pt-BR')}</td>
                    <td class="quadro-col-formal" style="font-weight:900;">${sumFTot.toLocaleString('pt-BR')}</td>

                    <td class="quadro-col-rural">${sumR26.toLocaleString('pt-BR')}</td>
                    <td class="quadro-col-rural">${sumR27.toLocaleString('pt-BR')}</td>
                    <td class="quadro-col-rural">${sumR28.toLocaleString('pt-BR')}</td>
                    <td class="quadro-col-rural" style="font-weight:900;">${sumRTot.toLocaleString('pt-BR')}</td>

                    <td class="quadro-col-total">${sumTot26.toLocaleString('pt-BR')}</td>
                    <td class="quadro-col-total">${sumTot27.toLocaleString('pt-BR')}</td>
                    <td class="quadro-col-total">${sumTot28.toLocaleString('pt-BR')}</td>

                    <td class="quadro-col-grand" style="font-weight:900; font-size:0.8rem;">${sumGrandTot.toLocaleString('pt-BR')}</td>
                </tr>
            </tfoot>
        `;

        container.innerHTML = `
            <table class="quadro-matriz-table">
                ${theadHtml}
                <tbody>${tbodyHtml}</tbody>
                ${tfootHtml}
            </table>
        `;

        // Row click handler: if it has GIS front, focus and zoom in map
        container.querySelectorAll('tbody tr').forEach(tr => {
            tr.addEventListener('click', function() {
                const mun = this.dataset.mun;
                if (!mun) return;
                const norm = mun.toUpperCase();
                if (MUN_BAIRRO_MAP[norm] && window.selectBairro) {
                    window.selectBairro(MUN_BAIRRO_MAP[norm], false);
                }
            });
        });
    }

    function exportQuadroCSV() {
        if (!data || !data.municipios) return;

        let csv = '\uFEFF';
        csv += 'Município;Formal_2026;Formal_2027;Formal_2028;Formal_Total;Rural_2026;Rural_2027;Rural_2028;Rural_Total;Total_2026;Total_2027;Total_2028;Total_Geral\n';

        data.municipios.forEach(m => {
            const met = getMunMetricsByService(m, currentQuadroService);
            const line = [
                `"${m.municipio}"`,
                met.f26, met.f27, met.f28, met.fTot,
                met.r26, met.r27, met.r28, met.rTot,
                met.tot26, met.tot27, met.tot28, met.grandTot
            ].join(';');
            csv += line + '\n';
        });

        // Totals row
        let sumF26 = 0, sumF27 = 0, sumF28 = 0, sumFTot = 0;
        let sumR26 = 0, sumR27 = 0, sumR28 = 0, sumRTot = 0;
        let sumTot26 = 0, sumTot27 = 0, sumTot28 = 0, sumGrandTot = 0;
        data.municipios.forEach(m => {
            const met = getMunMetricsByService(m, currentQuadroService);
            sumF26 += met.f26; sumF27 += met.f27; sumF28 += met.f28; sumFTot += met.fTot;
            sumR26 += met.r26; sumR27 += met.r27; sumR28 += met.r28; sumRTot += met.rTot;
            sumTot26 += met.tot26; sumTot27 += met.tot27; sumTot28 += met.tot28; sumGrandTot += met.grandTot;
        });

        csv += [
            '"TOTAL LOTE 4"',
            sumF26, sumF27, sumF28, sumFTot,
            sumR26, sumR27, sumR28, sumRTot,
            sumTot26, sumTot27, sumTot28, sumGrandTot
        ].join(';') + '\n';

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quadro_metas_ano_recorte_lote4_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function setMunicipioFilter(mun) {
        currentMunFilter = mun;
        const selMun = document.getElementById('metas-select-municipio');
        if (selMun && selMun.value !== mun) {
            selMun.value = mun;
        }

        updateDisplay();

        // If municipality has corresponding GIS bairro, highlight or offer navigation
        const norm = mun.toUpperCase();
        if (MUN_BAIRRO_MAP[norm] && window.selectBairro) {
            window.selectBairro(MUN_BAIRRO_MAP[norm], false);
        } else if (mun === 'all' && window.selectBairro) {
            window.selectBairro(null, false);
        }
    }

    function exportCSV() {
        if (!data || !data.municipios) return;

        let csv = '\uFEFF'; // UTF-8 BOM
        csv += 'Lote;Pacote;Município;Cod_IBGE;Total_Água;Total_Esgoto;IEC_Total;Total_Geral;Água_2026;Água_2027;Água_2028;Esgoto_2026;Esgoto_2027;Esgoto_2028;Formal_Água;Rural_Água;Formal_Esgoto;Rural_Esgoto\n';

        data.municipios.forEach(m => {
            const line = [
                m.lote,
                m.pacote,
                `"${m.municipio}"`,
                m.cod_municipio,
                m.agua.total,
                m.esgoto.total,
                m.iec.total,
                m.total_geral,
                m.agua.total_ano['2026'],
                m.agua.total_ano['2027'],
                m.agua.total_ano['2028'],
                m.esgoto.total_ano['2026'],
                m.esgoto.total_ano['2027'],
                m.esgoto.total_ano['2028'],
                m.agua.formal.total,
                m.agua.rural.total,
                m.esgoto.formal.total,
                m.esgoto.rural.total
            ].join(';');
            csv += line + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `metas_economias_lote4_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // =========================================================================
    // DIAGRAMA DE BARRAS: METAS VS DOMICÍLIOS EM OBRAS EM EXECUÇÃO
    // =========================================================================
    let chartMetasDom = null;
    let currentDiagMode = '2026'; // '2026', 'esgoto', 'total'
    let currentDiagAllMun = false; // false = only active fronts (4 mun), true = all 10 mun

    function getDomiciliosEmExecucao() {
        const domByMun = {};
        if (window.GIS_DATA && window.GIS_DATA.areas) {
            window.GIS_DATA.areas.features.forEach(f => {
                const p = f.properties;
                const mun = (p.nm_mun || '').toUpperCase().trim();
                const status = (p.status || '').toUpperCase().trim();
                const qtd = parseInt(p.qtd_domici) || 0;

                if (!domByMun[mun]) {
                    domByMun[mun] = { em_execucao: 0, nao_iniciado: 0, total: 0 };
                }
                if (status === 'INICIADO') {
                    domByMun[mun].em_execucao += qtd;
                } else {
                    domByMun[mun].nao_iniciado += qtd;
                }
                domByMun[mun].total += qtd;
            });
        }
        return domByMun;
    }

    function renderDiagramaBarras() {
        if (!data || !data.municipios) return;
        const canvas = document.getElementById('chart-metas-domicilios');
        if (!canvas) return;

        const domByMun = getDomiciliosEmExecucao();

        // Municipalities to compare
        let targetList = data.municipios;
        if (!currentDiagAllMun) {
            // Only municipalities with mapped active works
            const activeMunNames = ['PARANAPANEMA', 'GUAREÍ', 'SÃO MIGUEL ARCANJO', 'ITAPETININGA'];
            targetList = data.municipios.filter(m => activeMunNames.includes(m.municipio.toUpperCase()));
        }

        const labels = [];
        const dataDomExec = [];
        const dataMetas = [];

        let totalDomExec = 0;
        let totalMetaVal = 0;

        let metaLabel = 'Meta 2026 (Economias)';
        if (currentDiagMode === 'esgoto') metaLabel = 'Meta Esgoto IEC (Economias)';
        else if (currentDiagMode === 'total') metaLabel = 'Meta Total Geral (Economias)';

        targetList.forEach(m => {
            labels.push(m.municipio);
            const domInfo = domByMun[m.municipio.toUpperCase()] || { em_execucao: 0, nao_iniciado: 0, total: 0 };
            const domVal = domInfo.em_execucao;
            dataDomExec.push(domVal);
            totalDomExec += domVal;

            let mVal = 0;
            if (currentDiagMode === '2026') {
                mVal = m.agua.total_ano['2026'] + m.esgoto.total_ano['2026'];
            } else if (currentDiagMode === 'esgoto') {
                mVal = m.esgoto.total;
            } else if (currentDiagMode === 'total') {
                mVal = m.total_geral;
            }
            dataMetas.push(mVal);
            totalMetaVal += mVal;
        });

        // Update Mini KPIs
        const elDomExec = document.getElementById('diag-kpi-dom-exec');
        const elMetaVal = document.getElementById('diag-kpi-meta-val');
        const elAderencia = document.getElementById('diag-kpi-aderencia');

        if (elDomExec) elDomExec.innerHTML = `${totalDomExec.toLocaleString('pt-BR')} <span style="font-size:0.7rem;">dom.</span>`;
        if (elMetaVal) elMetaVal.innerHTML = `${totalMetaVal.toLocaleString('pt-BR')} <span style="font-size:0.7rem;">econ.</span>`;
        if (elAderencia) {
            const pct = totalMetaVal > 0 ? ((totalDomExec / totalMetaVal) * 100).toFixed(1) : 0;
            elAderencia.textContent = `${pct}%`;
        }

        // Theme colors
        const isDark = !document.body.classList.contains('light-theme');
        const textColor = isDark ? '#a1a59a' : '#5c5e57';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

        if (chartMetasDom) {
            chartMetasDom.data.labels = labels;
            chartMetasDom.data.datasets[0].data = dataDomExec;
            chartMetasDom.data.datasets[1].data = dataMetas;
            chartMetasDom.data.datasets[1].label = metaLabel;
            chartMetasDom.options.scales.x.ticks.color = textColor;
            chartMetasDom.options.scales.y.ticks.color = textColor;
            chartMetasDom.options.scales.y.grid.color = gridColor;
            chartMetasDom.options.plugins.legend.labels.color = textColor;
            chartMetasDom.update();
        } else {
            chartMetasDom = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Domicílios em Obras em Execução',
                            data: dataDomExec,
                            backgroundColor: '#10b981',
                            borderRadius: 6,
                            barPercentage: 0.75,
                            categoryPercentage: 0.75
                        },
                        {
                            label: metaLabel,
                            data: dataMetas,
                            backgroundColor: '#f59e0b',
                            borderRadius: 6,
                            barPercentage: 0.75,
                            categoryPercentage: 0.75
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                color: textColor,
                                font: { size: 10.5, weight: 'bold' },
                                boxWidth: 12,
                                padding: 10
                            }
                        },
                        tooltip: {
                            callbacks: {
                                afterBody: function(tooltipItems) {
                                    const item = tooltipItems[0];
                                    const idx = item.dataIndex;
                                    const dom = dataDomExec[idx];
                                    const meta = dataMetas[idx];
                                    const pct = meta > 0 ? ((dom / meta) * 100).toFixed(1) : 0;
                                    return `Cobertura / Aderência: ${pct}%`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: textColor, font: { size: 9.5 } },
                            grid: { display: false }
                        },
                        y: {
                            ticks: { color: textColor, font: { size: 9.5 } },
                            grid: { color: gridColor },
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }

    return {
        init: init,
        setMunicipioFilter: setMunicipioFilter,
        renderQuadroIndicadores: renderQuadroIndicadores,
        renderDiagramaBarras: renderDiagramaBarras,
        exportCSV: exportCSV,
        exportQuadroCSV: exportQuadroCSV,
        getData: function() { return data; }
    };
})();
