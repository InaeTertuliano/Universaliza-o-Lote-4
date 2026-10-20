/* ==========================================================================
   WEBGIS ATTRIBUTE EDITOR MODULE - ENGEFORM & SABESP LOTE 4
   Allows authorized editors (lote4ed) to modify layer attributes
   (status, inicio_r, termino_r) and sync directly with GitHub repository.
   ========================================================================== */

window.GIS_EDITOR = (function() {
    'use strict';

    const REPO_OWNER = 'InaeTertuliano';
    const REPO_NAME = 'Universaliza-o-Lote-4';
    const REPO_BRANCH = 'main';
    const STORAGE_TOKEN_KEY = 'sabesp_lote4_github_token';

    let activeFeature = null;
    let activeLayer = null;
    let activeLayerType = 'linear'; // 'linear', 'areas', 'localizada'

    function getToken() {
        return (localStorage.getItem(STORAGE_TOKEN_KEY) || '').trim();
    }

    function setToken(token) {
        if (token) {
            localStorage.setItem(STORAGE_TOKEN_KEY, token.trim());
        } else {
            localStorage.removeItem(STORAGE_TOKEN_KEY);
        }
        updateTokenUI();
    }

    function setActiveFeature(layerType, feature, layer) {
        activeLayerType = layerType;
        activeFeature = feature;
        activeLayer = layer;
    }

    function openModalForFeature(layerType, fid, aeId) {
        // Fallback: locate feature in GIS_DATA if activeFeature isn't set or differs
        if (window.GIS_DATA && window.GIS_DATA[layerType] && window.GIS_DATA[layerType].features) {
            const list = window.GIS_DATA[layerType].features;
            const found = list.find(f => {
                const p = f.properties || {};
                if (fid && p.fid == fid) return true;
                if (aeId && p.ae_id == aeId) return true;
                return false;
            });
            if (found) {
                activeFeature = found;
                activeLayerType = layerType;
            }
        }
        openModal();
    }

    function formatDateForInput(dateVal) {
        if (!dateVal || dateVal === 'NaT' || dateVal === '-' || dateVal === 'null') return '';
        // If YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) return dateVal;
        // If DD/MM/YYYY
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateVal)) {
            const [d, m, y] = dateVal.split('/');
            return `${y}-${m}-${d}`;
        }
        return '';
    }

    function openModal() {
        if (!window.GIS_AUTH || !window.GIS_AUTH.isEditor()) {
            alert("Acesso restrito: Apenas o usuário Editor (lote4ed) possui permissão para editar atributos.");
            return;
        }

        if (!activeFeature) {
            alert("Nenhuma feição selecionada para edição.");
            return;
        }

        const modal = document.getElementById('modal-feature-editor');
        if (!modal) return;

        const p = activeFeature.properties || {};

        // Subtitle & Info box
        const subtitle = document.getElementById('editor-feature-subtitle');
        if (subtitle) {
            const b = p.bairro || p.nm_mun || 'Trecho';
            const id = p.fid ? `FID #${p.fid}` : (p.ae_id ? `AE ${p.ae_id}` : '');
            subtitle.textContent = `${b} • ${id}`;
        }

        const infoBox = document.getElementById('editor-info-box');
        if (infoBox) {
            let detailsHtml = `
                <div><span style="color:#94a3b8;">Município:</span> <strong style="color:#ffffff;">${p.nm_mun || '-'}</strong></div>
                <div><span style="color:#94a3b8;">Frente / Bairro:</span> <strong style="color:#0284c7;">${p.bairro || '-'}</strong></div>
            `;
            if (activeLayerType === 'linear') {
                const ext = parseFloat(p.ext_calcul || 0).toFixed(2);
                detailsHtml += `
                    <div><span style="color:#94a3b8;">Extensão:</span> <strong style="color:#10b981;">${ext} m</strong></div>
                    <div><span style="color:#94a3b8;">Material / DN:</span> <strong style="color:#ffffff;">${p.material || '-'} DN ${p.dn_nominal || '-'} mm</strong></div>
                `;
            } else if (activeLayerType === 'areas') {
                detailsHtml += `
                    <div><span style="color:#94a3b8;">Domicílios:</span> <strong style="color:#10b981;">${p.qtd_domici || '0'} dom.</strong></div>
                    <div><span style="color:#94a3b8;">Código AE:</span> <strong style="color:#ffffff;">${p.ae_id || '-'}</strong></div>
                `;
            } else if (activeLayerType === 'localizada') {
                detailsHtml += `
                    <div><span style="color:#94a3b8;">Vazão:</span> <strong style="color:#10b981;">${p.q_proj || '-'} L/s</strong></div>
                    <div><span style="color:#94a3b8;">Potência:</span> <strong style="color:#ffffff;">${p.pot_cv || '-'} CV</strong></div>
                `;
            }
            infoBox.innerHTML = detailsHtml;
        }

        // Form Fields
        const statusSelect = document.getElementById('edit-status');
        if (statusSelect) {
            const currStatus = (p.status || 'NÃO INICIADO').trim().toUpperCase();
            if (currStatus === 'CONCLUÍDO' || currStatus === 'EXECUTADA') {
                statusSelect.value = 'CONCLUÍDO';
            } else if (currStatus === 'INICIADO' || currStatus === 'EM EXECUÇÃO') {
                statusSelect.value = 'INICIADO';
            } else {
                statusSelect.value = 'NÃO INICIADO';
            }
        }

        const inicioInput = document.getElementById('edit-inicio-r');
        if (inicioInput) {
            inicioInput.value = formatDateForInput(p.inicio_r);
        }

        const terminoInput = document.getElementById('edit-termino-r');
        if (terminoInput) {
            terminoInput.value = formatDateForInput(p.termino_r);
        }

        // Clear alerts
        hideAlert();
        updateTokenUI();

        // Show modal
        modal.style.display = 'flex';
    }

    function closeModal() {
        const modal = document.getElementById('modal-feature-editor');
        if (modal) {
            modal.style.display = 'none';
        }
        hideAlert();
    }

    function updateTokenUI() {
        const tokenInput = document.getElementById('edit-github-token');
        const tokenStatus = document.getElementById('editor-token-status');
        const token = getToken();

        if (tokenStatus) {
            if (token) {
                tokenStatus.innerHTML = '<span style="color:#10b981;"><i class="fas fa-check-circle"></i> Token Salvo</span>';
            } else {
                tokenStatus.innerHTML = '<span style="color:#f59e0b;"><i class="fas fa-exclamation-triangle"></i> Não configurado</span>';
            }
        }

        if (tokenInput) {
            if (token) {
                tokenInput.value = token;
            } else {
                tokenInput.value = '';
            }
        }
    }

    function showAlert(msg, isSuccess = false) {
        const alertBox = document.getElementById('editor-alert');
        if (!alertBox) return;

        alertBox.style.display = 'flex';
        if (isSuccess) {
            alertBox.style.background = 'rgba(16, 185, 129, 0.15)';
            alertBox.style.border = '1px solid #10b981';
            alertBox.style.color = '#6ee7b7';
            alertBox.innerHTML = `<i class="fas fa-check-circle" style="color:#10b981; font-size:1.1rem;"></i> <span>${msg}</span>`;
        } else {
            alertBox.style.background = 'rgba(239, 68, 68, 0.15)';
            alertBox.style.border = '1px solid #ef4444';
            alertBox.style.color = '#fca5a5';
            alertBox.innerHTML = `<i class="fas fa-exclamation-circle" style="color:#ef4444; font-size:1.1rem;"></i> <span>${msg}</span>`;
        }
    }

    function hideAlert() {
        const alertBox = document.getElementById('editor-alert');
        if (alertBox) alertBox.style.display = 'none';
    }

    function generateDataJsContent(gisData) {
        const today = new Date().toISOString().replace('T', ' ').slice(0, 19);
        const dateOnly = new Date().toISOString().slice(0, 10);
        return `// WebGIS Data Package - Universalização Sabesp Lote 4 Itapetininga\n` +
               `// Atualizado em ${today}\n` +
               `window.GIS_DATA = {\n` +
               `    areas: ${JSON.stringify(gisData.areas)},\n` +
               `    linear: ${JSON.stringify(gisData.linear)},\n` +
               `    localizada: ${JSON.stringify(gisData.localizada)},\n` +
               `    meta: {\n` +
               `        lote: "LOTE 04 - ITAPETININGA",\n` +
               `        data_atualizacao: "${dateOnly}",\n` +
               `        bounds: [[-23.859038, -48.917271], [-23.358829, -47.978981]],\n` +
               `        center: [-23.608933, -48.448126]\n` +
               `    }\n` +
               `};\n`;
    }

    async function commitToGitHub(token, layerType, gisData, commitMsg) {
        const headers = {
            'Authorization': `Bearer ${token.trim()}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };

        // 1. Get current commit on main
        const refRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/${REPO_BRANCH}`, { headers });
        if (!refRes.ok) {
            const errJson = await refRes.json().catch(() => ({}));
            throw new Error(`Erro de autenticação ou acesso ao GitHub: ${errJson.message || refRes.statusText}`);
        }
        const refData = await refRes.json();
        const latestCommitSha = refData.object.sha;

        // 2. Get tree of current commit
        const commitRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/commits/${latestCommitSha}`, { headers });
        if (!commitRes.ok) throw new Error(`Falha ao obter commit atual: ${commitRes.statusText}`);
        const commitData = await commitRes.json();
        const baseTreeSha = commitData.tree.sha;

        // Determine geojson path & content
        let geojsonPath = 'data/camada_linear.geojson';
        let geojsonContent = JSON.stringify(gisData.linear, null, 2);
        if (layerType === 'areas') {
            geojsonPath = 'data/areas_de_expansao.geojson';
            geojsonContent = JSON.stringify(gisData.areas, null, 2);
        } else if (layerType === 'localizada') {
            geojsonPath = 'data/camada_localizada.geojson';
            geojsonContent = JSON.stringify(gisData.localizada, null, 2);
        }

        const dataJsContent = generateDataJsContent(gisData);

        // 3. Create blob for GeoJSON file
        const blob1Res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/blobs`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ content: geojsonContent, encoding: 'utf-8' })
        });
        if (!blob1Res.ok) throw new Error(`Falha ao salvar blob do GeoJSON: ${blob1Res.statusText}`);
        const blob1 = await blob1Res.json();

        // 4. Create blob for js/data.js
        const blob2Res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/blobs`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ content: dataJsContent, encoding: 'utf-8' })
        });
        if (!blob2Res.ok) throw new Error(`Falha ao salvar blob de js/data.js: ${blob2Res.statusText}`);
        const blob2 = await blob2Res.json();

        // 5. Create new tree containing both updated files
        const treeRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                base_tree: baseTreeSha,
                tree: [
                    { path: geojsonPath, mode: '100644', type: 'blob', sha: blob1.sha },
                    { path: 'js/data.js', mode: '100644', type: 'blob', sha: blob2.sha }
                ]
            })
        });
        if (!treeRes.ok) throw new Error(`Falha ao criar árvore de arquivos no GitHub: ${treeRes.statusText}`);
        const newTree = await treeRes.json();

        // 6. Create commit
        const newCommitRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/commits`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                message: commitMsg,
                tree: newTree.sha,
                parents: [latestCommitSha]
            })
        });
        if (!newCommitRes.ok) throw new Error(`Falha ao gerar commit: ${newCommitRes.statusText}`);
        const newCommit = await newCommitRes.json();

        // 7. Update branch ref
        const patchRefRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/${REPO_BRANCH}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ sha: newCommit.sha, force: false })
        });
        if (!patchRefRes.ok) throw new Error(`Falha ao atualizar branch main: ${patchRefRes.statusText}`);

        return newCommit;
    }

    async function handleSave(e) {
        if (e) e.preventDefault();

        if (!activeFeature) {
            showAlert("Nenhuma feição ativa selecionada.");
            return;
        }

        const token = getToken();
        if (!token) {
            showAlert("Por favor, preencha o Token de API do GitHub e clique em 'Salvar' antes de enviar.");
            const tokenInput = document.getElementById('edit-github-token');
            if (tokenInput) tokenInput.focus();
            return;
        }

        const statusSelect = document.getElementById('edit-status');
        const inicioInput = document.getElementById('edit-inicio-r');
        const terminoInput = document.getElementById('edit-termino-r');

        const newStatus = statusSelect ? statusSelect.value : 'NÃO INICIADO';
        const newInicioR = inicioInput ? inicioInput.value.trim() : '';
        const newTerminoR = terminoInput ? terminoInput.value.trim() : '';

        // UI Loading State
        const btnSave = document.getElementById('btn-save-edit');
        const btnText = document.getElementById('btn-save-edit-text');
        const btnSpinner = document.getElementById('btn-save-edit-spinner');

        if (btnText && btnSpinner) {
            btnText.textContent = "Sincronizando com GitHub...";
            btnSpinner.style.display = 'inline-block';
        }
        if (btnSave) btnSave.disabled = true;
        hideAlert();

        try {
            const p = activeFeature.properties;
            const oldStatus = p.status;
            const bairro = p.bairro || p.nm_mun || 'Feição';

            // 1. Update in-memory feature attributes
            p.status = newStatus;
            p.inicio_r = newInicioR || null;
            p.termino_r = newTerminoR || null;

            // 2. Immediately re-style map layers
            if (window.GIS_LAYERS) {
                if (typeof window.GIS_LAYERS.refreshStyles === 'function') {
                    window.GIS_LAYERS.refreshStyles();
                } else if (typeof window.GIS_LAYERS.highlightBairro === 'function') {
                    window.GIS_LAYERS.highlightBairro(null);
                }
            }

            // 3. Update dashboard analytics charts
            if (window.GIS_CHARTS && typeof window.GIS_CHARTS.update === 'function' && window.GIS_DATA && window.GIS_DATA.linear) {
                window.GIS_CHARTS.update(window.GIS_DATA.linear.features);
            }

            // 4. Re-render open popup if layer is still open
            if (activeLayer && typeof activeLayer.getPopup === 'function' && activeLayer.isPopupOpen()) {
                activeLayer.closePopup();
                activeLayer.openPopup();
            }

            // 4. Commit to GitHub API
            const commitMsg = `update: edição de atributos (${bairro}) por lote4ed [status: ${newStatus}]`;
            await commitToGitHub(token, activeLayerType, window.GIS_DATA, commitMsg);

            // Success feedback!
            showAlert(`Alterações salvas com sucesso no GitHub! O portal foi atualizado (Status: ${newStatus}).`, true);

            if (btnText) btnText.textContent = "Salvo com sucesso!";

            setTimeout(() => {
                closeModal();
            }, 1800);

        } catch (err) {
            console.error("Erro ao salvar no GitHub:", err);
            showAlert(`Erro ao salvar no GitHub: ${err.message || 'Verifique sua conexão ou token'}`);
        } finally {
            if (btnSave) btnSave.disabled = false;
            if (btnText && btnSpinner) {
                btnSpinner.style.display = 'none';
                btnText.textContent = "Salvar no GitHub";
            }
        }
    }

    function init() {
        // Setup modal event bindings
        const btnClose = document.getElementById('btn-close-editor-modal');
        const btnCancel = document.getElementById('btn-cancel-edit');
        const form = document.getElementById('editor-form');
        const btnSaveToken = document.getElementById('btn-save-token');
        const tokenInput = document.getElementById('edit-github-token');

        if (btnClose) btnClose.addEventListener('click', closeModal);
        if (btnCancel) btnCancel.addEventListener('click', closeModal);

        if (form) {
            form.addEventListener('submit', handleSave);
        }

        if (btnSaveToken && tokenInput) {
            btnSaveToken.addEventListener('click', function() {
                const val = tokenInput.value.trim();
                if (val) {
                    setToken(val);
                    showAlert("Token do GitHub salvo com sucesso no seu navegador!", true);
                    setTimeout(hideAlert, 2500);
                } else {
                    showAlert("Informe um token válido.");
                }
            });
        }

        // Close on escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const modal = document.getElementById('modal-feature-editor');
                if (modal && modal.style.display !== 'none') {
                    closeModal();
                }
            }
        });

        // Close on overlay click
        const modal = document.getElementById('modal-feature-editor');
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    closeModal();
                }
            });
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        init: init,
        setActiveFeature: setActiveFeature,
        openModal: openModal,
        openModalForFeature: openModalForFeature,
        closeModal: closeModal,
        setToken: setToken,
        getToken: getToken
    };

})();
