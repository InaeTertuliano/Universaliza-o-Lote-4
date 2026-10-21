/* ==========================================================================
   WEBGIS CUSTOM EXPORTER MODULE - ENGEFORM & SABESP LOTE 4
   Allows users to select layers, record scopes, and pick specific columns/fields
   for exporting clean, UTF-8 BOM CSV files directly compatible with Microsoft Excel.
   ========================================================================== */

window.GIS_EXPORTER = (function() {
    'use strict';

    // Field dictionaries with user-friendly Portuguese labels and default selection
    const LAYER_CONFIG = {
        linear: {
            name: 'Obras Lineares (Rede Coletora / Recalque)',
            fileName: 'Obras_Lineares_Rede_Sabesp_Lote4',
            fields: [
                { key: 'fid', label: 'FID (Identificador)', default: true },
                { key: 'nm_mun', label: 'Município', default: true },
                { key: 'bairro', label: 'Frente de Obra / Bairro', default: true },
                { key: 'nome', label: 'Logradouro / Trecho', default: false },
                { key: 'segmento', label: 'Segmento (Rede / Recalque)', default: true },
                { key: 'material', label: 'Material da Tubulação', default: true },
                { key: 'dn_nominal', label: 'Diâmetro Nominal - DN (mm)', default: true },
                { key: 'ext_calcul', label: 'Extensão Calculada (m)', default: true },
                { key: 'prof_media', label: 'Profundidade Média (m)', default: true },
                { key: 'status', label: 'Status da Obra', default: true },
                { key: 'inicio_p', label: 'Data Início Previsto', default: true },
                { key: 'termino_p', label: 'Data Término Previsto', default: true },
                { key: 'inicio_r', label: 'Data Início Real', default: true },
                { key: 'termino_r', label: 'Data Término Real', default: true },
                { key: 'met_constr', label: 'Método Construtivo (VCA/MND)', default: false },
                { key: 'modalidade', label: 'Modalidade Contratual', default: true },
                { key: 'ae_id', label: 'Código AE (Área de Expansão)', default: false },
                { key: 'estaca_ini', label: 'Estaca Inicial', default: false },
                { key: 'estaca_fin', label: 'Estaca Final', default: false },
                { key: 'lote', label: 'Lote do Contrato', default: false },
                { key: 'produto', label: 'Produto (Esgoto/Água)', default: false },
                { key: 'recorte', label: 'Recorte (Formal/Informal)', default: false },
                { key: 'invest_obr', label: 'Investimento Obrigatório', default: false },
                { key: 'unitizacao', label: 'Unitização', default: false },
                { key: 'data_atual', label: 'Data de Atualização Cadastral', default: false },
                { key: 'fonte', label: 'Fonte Cadastral', default: false },
                { key: 'obs', label: 'Observações', default: false },
                { key: 'coord', label: 'Coordenação', default: false },
                { key: 'int_ambien', label: 'Interferência Ambiental', default: false },
                { key: 'int_conces', label: 'Interferência Concessionária', default: false },
                { key: 'int_domin', label: 'Interferência Dominial', default: false }
            ]
        },
        areas: {
            name: 'Áreas de Expansão (Polígonos)',
            fileName: 'Areas_de_Expansao_Sabesp_Lote4',
            fields: [
                { key: 'ae_id', label: 'Código AE (Área de Expansão)', default: true },
                { key: 'nm_mun', label: 'Município', default: true },
                { key: 'bairro', label: 'Frente de Obra / Bairro', default: true },
                { key: 'qtd_domici', label: 'Quantidade de Domicílios', default: true },
                { key: 'SIT_ATEND', label: 'Situação de Atendimento', default: true },
                { key: 'status', label: 'Status da Obra', default: true },
                { key: 'inicio_p', label: 'Data Início Previsto', default: true },
                { key: 'termino_p', label: 'Data Término Previsto', default: true },
                { key: 'inicio_r', label: 'Data Início Real', default: true },
                { key: 'termino_r', label: 'Data Término Real', default: true },
                { key: 'ice', label: 'Índice ICE (%)', default: true },
                { key: 'iec', label: 'Índice IEC (%)', default: true },
                { key: 'ica', label: 'Índice ICA (%)', default: false },
                { key: 'recorte', label: 'Recorte (Formal/Informal)', default: true },
                { key: 'modalidade', label: 'Modalidade Contratual', default: true },
                { key: 'modificada', label: 'Modificada', default: false },
                { key: 'produto', label: 'Produto', default: false },
                { key: 'produto_rv', label: 'Produto Revisado', default: false },
                { key: 'invest_obr', label: 'Investimento Obrigatório', default: false },
                { key: 'data_atual', label: 'Data de Atualização', default: false },
                { key: 'lote', label: 'Lote', default: false },
                { key: 'fonte', label: 'Fonte dos Dados', default: false },
                { key: 'obs', label: 'Observações', default: false },
                { key: 'coord', label: 'Coordenação', default: false }
            ]
        },
        localizada: {
            name: 'Obras Localizadas (Estações Elevatórias - EEE)',
            fileName: 'Obras_Localizadas_EEE_Sabesp_Lote4',
            fields: [
                { key: 'nome', label: 'Nome da Estrutura', default: true },
                { key: 'segmento', label: 'Tipo de Estrutura (EEE/ETE)', default: true },
                { key: 'nm_mun', label: 'Município', default: true },
                { key: 'bairro', label: 'Frente de Obra / Bairro', default: true },
                { key: 'status', label: 'Status da Obra', default: true },
                { key: 'q_proj', label: 'Vazão Projetada (L/s)', default: true },
                { key: 'q_atual', label: 'Vazão Atual (L/s)', default: false },
                { key: 'q_total', label: 'Vazão Total (L/s)', default: false },
                { key: 'pot_cv', label: 'Potência Instalada (CV)', default: true },
                { key: 'altura_man', label: 'Altura Manométrica (mca)', default: true },
                { key: 'altura_tor', label: 'Altura da Torre (m)', default: false },
                { key: 'vol_proj', label: 'Volume Projetado (m³)', default: false },
                { key: 'vol_atual', label: 'Volume Atual (m³)', default: false },
                { key: 'vol_total', label: 'Volume Total (m³)', default: false },
                { key: 'energizaca', label: 'Energização Prevista', default: true },
                { key: 'inicio_p', label: 'Data Início Previsto', default: true },
                { key: 'termino_p', label: 'Data Término Previsto', default: true },
                { key: 'inicio_r', label: 'Data Início Real', default: true },
                { key: 'termino_r', label: 'Data Término Real', default: true },
                { key: 'latitude', label: 'Latitude', default: true },
                { key: 'longitude', label: 'Longitude', default: true },
                { key: 'ae_id', label: 'Código AE (Área de Expansão)', default: false },
                { key: 'lote', label: 'Lote', default: false },
                { key: 'modalidade', label: 'Modalidade Contratual', default: false },
                { key: 'recorte', label: 'Recorte', default: false },
                { key: 'fonte', label: 'Fonte dos Dados', default: false },
                { key: 'obs', label: 'Observações', default: false }
            ]
        }
    };

    let currentLayerKey = 'linear';
    let currentFields = [];

    function normStr(str) {
        return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    }

    function getAllFeatures(layerKey) {
        if (!window.GIS_DATA || !window.GIS_DATA[layerKey]) return [];
        return window.GIS_DATA[layerKey].features || [];
    }

    function getFilteredFeatures(layerKey) {
        const all = getAllFeatures(layerKey);
        const activeBairro = window.getActiveBairro ? window.getActiveBairro() : null;

        return all.filter(f => {
            const p = f.properties || {};

            // 1. Check sidebar filters (Município, Status, etc.)
            const selMun = document.getElementById('filter-municipio');
            if (selMun && selMun.value !== 'all' && p.nm_mun !== selMun.value) return false;

            const selStatus = document.getElementById('filter-status');
            if (selStatus && selStatus.value !== 'all') {
                const s = (p.status || p.SIT_ATEND || '').toUpperCase();
                if (s !== selStatus.value) return false;
            }

            const selSegmento = document.getElementById('filter-segmento');
            if (selSegmento && selSegmento.value !== 'all' && p.segmento !== selSegmento.value) return false;

            const selMaterial = document.getElementById('filter-material');
            if (selMaterial && selMaterial.value !== 'all' && p.material !== selMaterial.value) return false;

            const selRecorte = document.getElementById('filter-recorte');
            if (selRecorte && selRecorte.value !== 'all' && p.recorte !== selRecorte.value) return false;

            // 2. Check active Frente de Obra / Bairro filter
            if (activeBairro) {
                const normTarget = normStr(activeBairro);
                const featBairro = normStr(p.bairro);
                if (!featBairro) return false;
                if (featBairro !== normTarget) {
                    if (normTarget.startsWith("PEDRAS E VITORIA") && featBairro.startsWith("PEDRAS E VITORIA")) return true;
                    if (normTarget.startsWith("TURVO DOS ALMEIDAS") && featBairro.startsWith("TURVO DOS ALMEIDAS")) return true;
                    return false;
                }
            }

            return true;
        });
    }

    function getLayerFieldsList(layerKey) {
        const conf = LAYER_CONFIG[layerKey] || LAYER_CONFIG.linear;
        const definedFields = [...conf.fields];
        const definedKeys = new Set(definedFields.map(f => f.key));

        // Scan actual features to include any unmapped properties dynamically
        const all = getAllFeatures(layerKey);
        if (all.length > 0) {
            const sample = all[0].properties || {};
            Object.keys(sample).forEach(key => {
                if (!definedKeys.has(key)) {
                    definedFields.push({
                        key: key,
                        label: `${key} (Propriedade)`,
                        default: false
                    });
                    definedKeys.add(key);
                }
            });
        }

        return definedFields;
    }

    function updateCounts() {
        const allCount = getAllFeatures(currentLayerKey).length;
        const filteredCount = getFilteredFeatures(currentLayerKey).length;

        const elFiltered = document.getElementById('export-count-filtered');
        const elAll = document.getElementById('export-count-all');

        if (elFiltered) elFiltered.textContent = `(${filteredCount} registros)`;
        if (elAll) elAll.textContent = `(${allCount} registros)`;
    }

    function renderFieldsGrid() {
        const grid = document.getElementById('export-fields-grid');
        if (!grid) return;

        currentFields = getLayerFieldsList(currentLayerKey);
        grid.innerHTML = '';

        currentFields.forEach(f => {
            const label = document.createElement('label');
            label.className = 'export-field-checkbox-item';
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.gap = '8px';
            label.style.padding = '6px 10px';
            label.style.background = 'rgba(255, 255, 255, 0.03)';
            label.style.border = '1px solid var(--border-dark)';
            label.style.borderRadius = '6px';
            label.style.fontSize = '0.78rem';
            label.style.cursor = 'pointer';
            label.style.transition = 'all 0.15s ease';

            label.innerHTML = `
                <input type="checkbox" class="export-field-chk" value="${f.key}" ${f.default ? 'checked' : ''} style="cursor:pointer; accent-color:#10b981; width:15px; height:15px;">
                <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${f.label} (${f.key})">
                    <strong style="color:#ffffff;">${f.label}</strong>
                    <span style="color:#94a3b8; font-size:0.7rem; margin-left:4px;">${f.key}</span>
                </span>
            `;

            grid.appendChild(label);
        });

        updateSelectedCount();
    }

    function updateSelectedCount() {
        const chks = document.querySelectorAll('.export-field-chk');
        const total = chks.length;
        const checked = Array.from(chks).filter(c => c.checked).length;

        const countBadge = document.getElementById('export-fields-selected-badge');
        if (countBadge) {
            countBadge.innerHTML = `<i class="fas fa-check-double" style="color:#10b981;"></i> <strong>${checked}</strong> de ${total} campos selecionados`;
        }
    }

    function selectAll(state) {
        const chks = document.querySelectorAll('.export-field-chk');
        chks.forEach(c => c.checked = state);
        updateSelectedCount();
    }

    function selectDefaults() {
        const conf = LAYER_CONFIG[currentLayerKey];
        if (!conf) return;
        const defaultKeys = new Set(conf.fields.filter(f => f.default).map(f => f.key));

        const chks = document.querySelectorAll('.export-field-chk');
        chks.forEach(c => {
            c.checked = defaultKeys.has(c.value);
        });
        updateSelectedCount();
    }

    function openModal(initialLayer) {
        const modal = document.getElementById('modal-export-csv');
        if (!modal) return;

        if (initialLayer && LAYER_CONFIG[initialLayer]) {
            currentLayerKey = initialLayer;
        }

        const layerSelect = document.getElementById('export-layer-select');
        if (layerSelect) {
            layerSelect.value = currentLayerKey;
        }

        updateCounts();
        renderFieldsGrid();

        modal.style.display = 'flex';
    }

    function closeModal() {
        const modal = document.getElementById('modal-export-csv');
        if (modal) modal.style.display = 'none';
    }

    function formatCsvValue(val) {
        if (val === null || val === undefined || val === 'NaT' || val === 'null') return '';
        let str = String(val).trim();
        
        // Escape quotes
        if (str.includes('"')) {
            str = str.replace(/"/g, '""');
        }
        
        // Wrap in quotes if it contains separator, quote, or newline
        if (str.includes(';') || str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
            return `"${str}"`;
        }
        return str;
    }

    function generateCSV() {
        const chks = document.querySelectorAll('.export-field-chk:checked');
        if (chks.length === 0) {
            alert('Por favor, selecione ao menos um campo para exportar.');
            return;
        }

        const selectedKeys = Array.from(chks).map(c => c.value);
        const fieldMap = {};
        currentFields.forEach(f => { fieldMap[f.key] = f.label; });

        // Determine scope
        const scopeRadio = document.querySelector('input[name="export-scope"]:checked');
        const isFilteredOnly = scopeRadio ? (scopeRadio.value === 'filtered') : true;

        const features = isFilteredOnly ? getFilteredFeatures(currentLayerKey) : getAllFeatures(currentLayerKey);

        if (features.length === 0) {
            alert('Nenhum dado encontrado para os critérios e filtros selecionados.');
            return;
        }

        // Delimiter (semicolon for Brazilian Excel compatibility)
        const delimiter = ';';

        // Headers
        const headerRow = selectedKeys.map(k => {
            const cleanLabel = fieldMap[k] || k;
            return formatCsvValue(cleanLabel);
        }).join(delimiter);

        let csvContent = headerRow + '\r\n';

        // Data rows
        features.forEach(feat => {
            const p = feat.properties || {};
            const row = selectedKeys.map(k => {
                let val = p[k];
                // Formatações amigáveis
                if (k === 'ext_calcul' && val !== null && val !== undefined) {
                    val = parseFloat(val).toFixed(2);
                }
                return formatCsvValue(val);
            });
            csvContent += row.join(delimiter) + '\r\n';
        });

        // Trigger Download with UTF-8 BOM
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = new Date().toISOString().slice(0, 10);
        const fileName = (LAYER_CONFIG[currentLayerKey] ? LAYER_CONFIG[currentLayerKey].fileName : 'Export_Sabesp_Lote4') + `_${dateStr}.csv`;

        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        closeModal();
    }

    function init() {
        const btnOpenHeader = document.getElementById('btn-export-csv');
        if (btnOpenHeader) {
            btnOpenHeader.addEventListener('click', function(e) {
                e.preventDefault();
                openModal('linear');
            });
        }

        const btnClose = document.getElementById('btn-close-export-modal');
        const btnCancel = document.getElementById('btn-cancel-export');
        if (btnClose) btnClose.addEventListener('click', closeModal);
        if (btnCancel) btnCancel.addEventListener('click', closeModal);

        const layerSelect = document.getElementById('export-layer-select');
        if (layerSelect) {
            layerSelect.addEventListener('change', function() {
                currentLayerKey = this.value;
                updateCounts();
                renderFieldsGrid();
            });
        }

        const scopeRadios = document.querySelectorAll('input[name="export-scope"]');
        scopeRadios.forEach(r => {
            r.addEventListener('change', updateCounts);
        });

        const btnSelectAll = document.getElementById('btn-export-select-all');
        const btnDeselectAll = document.getElementById('btn-export-deselect-all');
        const btnSelectDefault = document.getElementById('btn-export-select-default');

        if (btnSelectAll) btnSelectAll.addEventListener('click', () => selectAll(true));
        if (btnDeselectAll) btnDeselectAll.addEventListener('click', () => selectAll(false));
        if (btnSelectDefault) btnSelectDefault.addEventListener('click', selectDefaults);

        const grid = document.getElementById('export-fields-grid');
        if (grid) {
            grid.addEventListener('change', updateSelectedCount);
        }

        const btnDownload = document.getElementById('btn-execute-export-csv');
        if (btnDownload) {
            btnDownload.addEventListener('click', generateCSV);
        }

        // Close on ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const modal = document.getElementById('modal-export-csv');
                if (modal && modal.style.display !== 'none') {
                    closeModal();
                }
            }
        });

        // Close on overlay click
        const modal = document.getElementById('modal-export-csv');
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) closeModal();
            });
        }
    }

    // Auto initialize when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        init: init,
        openModal: openModal,
        closeModal: closeModal,
        generateCSV: generateCSV,
        getLayerConfig: () => LAYER_CONFIG
    };
})();
