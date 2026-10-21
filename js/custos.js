/* ==========================================================================
   WEBGIS CUSTOS & ORÇAMENTO DE OBRAS MODULE - ENGEFORM & SABESP LOTE 4
   Fonte de Preços: PREÇO.xlsx (C:\Users\Administrador\Desktop\0-teste\CUSTO)
   ========================================================================== */

window.GIS_CUSTOS_HELPER = (function() {
    'use strict';

    function normStr(str) {
        return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    }

    function getPrecoMetro(segmento, dn) {
        if (!window.GIS_CUSTOS || !window.GIS_CUSTOS.tabela_precos) return null;
        const segNorm = normStr(segmento);
        const dnNum = parseInt(dn, 10);
        
        const item = window.GIS_CUSTOS.tabela_precos.find(p => {
            const pSeg = normStr(p.segmento);
            const pDn = parseInt(p.diametro, 10);
            return pSeg === segNorm && pDn === dnNum;
        });

        return item ? parseFloat(item.preco_metro) : null;
    }

    function getCustoFeicao(feature) {
        if (!feature || !feature.properties) return null;
        const p = feature.properties;
        const preco = getPrecoMetro(p.segmento, p.dn_nominal);
        if (preco === null) return null;

        const ext = parseFloat(p.ext_calcul || 0);
        const custo = ext * preco;
        return {
            precoMetro: preco,
            custoTotal: custo,
            extensao: ext
        };
    }

    function formatMoeda(val) {
        if (val === null || val === undefined || isNaN(val)) return '-';
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function formatNumero(val, decimals = 2) {
        if (val === null || val === undefined || isNaN(val)) return '-';
        return val.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }

    function calcularResumo(features) {
        const linearList = features || (window.GIS_DATA && window.GIS_DATA.linear ? window.GIS_DATA.linear.features : []);
        
        let totalExt = 0;
        let extParametrizada = 0;
        let custoTotal = 0;
        let custoConcluido = 0;
        let custoIniciado = 0;
        let custoNaoIniciado = 0;

        const porBairro = {};
        const porMunicipio = {};

        linearList.forEach(f => {
            const p = f.properties || {};
            const ext = parseFloat(p.ext_calcul || 0);
            totalExt += ext;

            const cInfo = getCustoFeicao(f);
            if (cInfo) {
                extParametrizada += cInfo.extensao;
                custoTotal += cInfo.custoTotal;

                const st = normStr(p.status);
                let categoria = 'nao_iniciado';
                if (st.includes('CONCLU') || st.includes('EXECUTAD')) {
                    custoConcluido += cInfo.custoTotal;
                    categoria = 'concluido';
                } else if (st.includes('INICIAD') && !st.includes('NAO')) {
                    custoIniciado += cInfo.custoTotal;
                    categoria = 'iniciado';
                } else {
                    custoNaoIniciado += cInfo.custoTotal;
                }

                // Por Bairro
                const b = p.bairro || 'Outros';
                if (!porBairro[b]) {
                    porBairro[b] = {
                        nome: b,
                        municipio: p.nm_mun || '-',
                        extensao: 0,
                        custoTotal: 0,
                        custoConcluido: 0,
                        custoIniciado: 0,
                        custoNaoIniciado: 0,
                        trechos: 0
                    };
                }
                porBairro[b].extensao += cInfo.extensao;
                porBairro[b].custoTotal += cInfo.custoTotal;
                porBairro[b].trechos += 1;
                if (categoria === 'concluido') porBairro[b].custoConcluido += cInfo.custoTotal;
                else if (categoria === 'iniciado') porBairro[b].custoIniciado += cInfo.custoTotal;
                else porBairro[b].custoNaoIniciado += cInfo.custoTotal;

                // Por Município
                const m = p.nm_mun || 'Outros';
                if (!porMunicipio[m]) {
                    porMunicipio[m] = { nome: m, extensao: 0, custoTotal: 0, custoConcluido: 0 };
                }
                porMunicipio[m].extensao += cInfo.extensao;
                porMunicipio[m].custoTotal += cInfo.custoTotal;
                if (categoria === 'concluido') porMunicipio[m].custoConcluido += cInfo.custoTotal;
            }
        });

        const pctConcluido = custoTotal > 0 ? ((custoConcluido / custoTotal) * 100) : 0;

        return {
            totalExt,
            extParametrizada,
            custoTotal,
            custoConcluido,
            custoIniciado,
            custoNaoIniciado,
            pctConcluido,
            porBairro: Object.values(porBairro).sort((a, b) => b.custoTotal - a.custoTotal),
            porMunicipio: Object.values(porMunicipio).sort((a, b) => b.custoTotal - a.custoTotal)
        };
    }

    function openModal() {
        const modal = document.getElementById('modal-custos-orcamento');
        if (!modal) return;

        renderModalContent();
        modal.style.display = 'flex';
    }

    function closeModal() {
        const modal = document.getElementById('modal-custos-orcamento');
        if (modal) modal.style.display = 'none';
    }

    function renderModalContent() {
        const resumo = calcularResumo();

        // 1. Tabela de Preços Unitários
        const precosContainer = document.getElementById('custos-tabela-precos');
        if (precosContainer && window.GIS_CUSTOS && window.GIS_CUSTOS.tabela_precos) {
            let rowsHtml = window.GIS_CUSTOS.tabela_precos.map(p => `
                <tr>
                    <td><strong style="color:#ffffff;">${p.segmento}</strong></td>
                    <td><span class="popup-badge" style="background:rgba(2,132,199,0.2); color:#38bdf8; border:1px solid #0284c7;">DN ${p.diametro} mm</span></td>
                    <td style="color:#10b981; font-weight:800; font-size:0.95rem;">${formatMoeda(p.preco_metro)} / ${p.unidade}</td>
                    <td style="color:var(--text-muted-dark); font-size:0.75rem;">Planilha PREÇO.xlsx</td>
                </tr>
            `).join('');
            precosContainer.innerHTML = rowsHtml;
        }

        // 2. KPIs
        const elTotal = document.getElementById('custos-kpi-total');
        const elConcluido = document.getElementById('custos-kpi-concluido');
        const elNaoIniciado = document.getElementById('custos-kpi-nao-iniciado');
        const elExt = document.getElementById('custos-kpi-extensao');

        if (elTotal) elTotal.textContent = formatMoeda(resumo.custoTotal);
        if (elConcluido) elConcluido.innerHTML = `${formatMoeda(resumo.custoConcluido)} <span style="font-size:0.75rem; font-weight:600; color:#10b981;">(${formatNumero(resumo.pctConcluido, 1)}%)</span>`;
        if (elNaoIniciado) elNaoIniciado.textContent = formatMoeda(resumo.custoNaoIniciado);
        if (elExt) elExt.textContent = `${formatNumero(resumo.extParametrizada / 1000.0, 2)} km parametrizados`;

        // 3. Tabela por Frente de Obra
        const tbodyBairros = document.getElementById('custos-tabela-bairros');
        if (tbodyBairros) {
            tbodyBairros.innerHTML = resumo.porBairro.map(b => {
                const pct = b.custoTotal > 0 ? ((b.custoConcluido / b.custoTotal) * 100).toFixed(1) : '0.0';
                return `
                    <tr>
                        <td><strong style="color:#ffffff;">${b.nome}</strong></td>
                        <td>${b.municipio}</td>
                        <td style="text-align:right;">${formatNumero(b.extensao)} m</td>
                        <td style="text-align:right; color:#10b981; font-weight:700;">R$ 600,00</td>
                        <td style="text-align:right; font-weight:800; color:#38bdf8;">${formatMoeda(b.custoTotal)}</td>
                        <td style="text-align:right; color:#10b981; font-weight:700;">${formatMoeda(b.custoConcluido)}</td>
                        <td style="text-align:right; color:#f59e0b;">${formatMoeda(b.custoNaoIniciado)}</td>
                        <td style="text-align:center;">
                            <span class="popup-badge" style="background:${parseFloat(pct) >= 100 ? '#10b98133' : '#0284c733'}; color:${parseFloat(pct) >= 100 ? '#10b981' : '#38bdf8'}; border:1px solid ${parseFloat(pct) >= 100 ? '#10b981' : '#0284c7'};">
                                ${pct}%
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    function exportarRelatorioCustosCSV() {
        const resumo = calcularResumo();
        const headers = ["FRENTE_DE_OBRA", "MUNICIPIO", "EXTENSAO_RC_150_M", "PRECO_UNITARIO_M", "CUSTO_TOTAL_PREVISTO_BRL", "CUSTO_CONCLUIDO_BRL", "CUSTO_NAO_INICIADO_BRL", "PERCENTUAL_CONCLUIDO"];
        
        let csv = headers.join(";") + "\r\n";
        resumo.porBairro.forEach(b => {
            const pct = b.custoTotal > 0 ? ((b.custoConcluido / b.custoTotal) * 100).toFixed(2) : "0.00";
            const row = [
                `"${b.nome}"`,
                `"${b.municipio}"`,
                b.extensao.toFixed(2),
                "600.00",
                b.custoTotal.toFixed(2),
                b.custoConcluido.toFixed(2),
                b.custoNaoIniciado.toFixed(2),
                pct + "%"
            ];
            csv += row.join(";") + "\r\n";
        });

        const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Relatorio_Custos_Orcamento_Sabesp_Lote4_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function init() {
        const btnHeader = document.getElementById('btn-open-custos-header');
        if (btnHeader) {
            btnHeader.addEventListener('click', function(e) {
                e.preventDefault();
                openModal();
            });
        }

        const btnClose = document.getElementById('btn-close-modal-custos');
        const btnCloseFooter = document.getElementById('btn-close-modal-custos-footer');
        if (btnClose) btnClose.addEventListener('click', closeModal);
        if (btnCloseFooter) btnCloseFooter.addEventListener('click', closeModal);

        const btnExport = document.getElementById('btn-export-custos-csv');
        if (btnExport) btnExport.addEventListener('click', exportarRelatorioCustosCSV);

        // Close on ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const modal = document.getElementById('modal-custos-orcamento');
                if (modal && modal.style.display !== 'none') {
                    closeModal();
                }
            }
        });

        // Close on overlay click
        const modal = document.getElementById('modal-custos-orcamento');
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) closeModal();
            });
        }

        // Atualizar card de investimento no painel Visão Geral
        atualizarWidgetInvestimentoLateral();
    }

    function atualizarWidgetInvestimentoLateral() {
        const widgetContainer = document.getElementById('widget-investimento-lateral');
        if (!widgetContainer) return;

        const resumo = calcularResumo();
        widgetContainer.innerHTML = `
            <div class="widget-card" style="border: 1px solid rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.04); margin-bottom: 0.85rem;">
                <div class="widget-title" style="color: #6ee7b7; display: flex; justify-content: space-between; align-items: center;">
                    <span><i class="fas fa-coins" style="color: #10b981;"></i> Orçamento Estimado em Redes</span>
                    <button id="btn-ver-custos-lateral" style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #6ee7b7; border-radius: 4px; padding: 2px 8px; font-size: 0.7rem; cursor: pointer; font-weight: 700;">
                        Ver Detalhes
                    </button>
                </div>
                <div style="font-size: 1.35rem; font-weight: 900; color: #10b981; margin: 4px 0;">
                    ${formatMoeda(resumo.custoTotal)}
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted-dark); margin-bottom: 6px;">
                    Base de Cálculo: <strong>R$ 600,00 / m</strong> (Rede Coletora DN 150 - PREÇO.xlsx)
                </div>
                <div class="quant-bar-bg" style="height: 6px; margin: 6px 0;">
                    <div class="quant-bar-fill" style="width: ${resumo.pctConcluido.toFixed(1)}%; background: #10b981;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: #cbd5e1;">
                    <span>Executado: <strong style="color: #10b981;">${formatMoeda(resumo.custoConcluido)}</strong> (${resumo.pctConcluido.toFixed(1)}%)</span>
                    <span>Saldo: <strong style="color: #f59e0b;">${formatMoeda(resumo.custoNaoIniciado)}</strong></span>
                </div>
            </div>
        `;

        const btnLateral = document.getElementById('btn-ver-custos-lateral');
        if (btnLateral) {
            btnLateral.addEventListener('click', function(e) {
                e.preventDefault();
                openModal();
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        init: init,
        getPrecoMetro: getPrecoMetro,
        getCustoFeicao: getCustoFeicao,
        calcularResumo: calcularResumo,
        openModal: openModal,
        closeModal: closeModal,
        formatMoeda: formatMoeda
    };
})();
