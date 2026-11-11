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
    // - Obras Localizadas (Grandes Instalações: EEE, EEAT, Reservatórios, ETAs, Boosters): visíveis a partir de zoom aproximado (>= 13)
    // - Detalhes de Rede (Poços de Esgoto / PVs e Nós de Rede): micro-marcadores discretos visíveis APENAS em zoom alto (>= 16)
    // - Centróides de Bairro (Ícone + Rótulo): visíveis em zoom distante (< 13); ocultos em zoom aproximado
    const MIN_ZOOM_LOCALIZADA = 13;
    const MIN_ZOOM_POCOS_NOS = 16;
    let isLocalizadaEnabled = true; // Controlado pelo checkbox da camada no painel
    let layerGroupLocalizadaMajor = null;   // Grandes instalações (EEE, EEAT, Reservatório, Booster, ETA, etc.)
    let layerGroupLocalizadaDetalhe = null; // Detalhes de rede (Poços de Esgoto e Nós de Rede)

    // Centróides calculados das 28 Frentes de Obra / Bairros para exibição em zoom distante (< 13)
    // Classificados rigorosamente por Status de Execução: Concluído (#10b981), Iniciado (#0284c7) e Não Iniciado (#f59e0b)
const BAIRRO_CENTROIDS = [
        {"id": "Banco da Areia I", "nome": "Banco da Areia I", "municipio": "Angatuba", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.464695, "lng": -48.547291, "cor": "#f59e0b", "icone": "fa-clock", "economias": 62, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.468751, -48.554166], [-23.460953, -48.53978]]},
        {"id": "Banco da Terra II", "nome": "Banco da Terra II", "municipio": "Angatuba", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.463246, "lng": -48.530051, "cor": "#f59e0b", "icone": "fa-clock", "economias": 46, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.468852, -48.533948], [-23.458701, -48.525714]]},
        {"id": "Buenos", "nome": "Buenos", "municipio": "Angatuba", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.473189, "lng": -48.388042, "cor": "#f59e0b", "icone": "fa-clock", "economias": 94, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.478087, -48.3962], [-23.467466, -48.381041]]},
        {"id": "Campina do Bom Retiro", "nome": "Campina do Bom Retiro", "municipio": "Angatuba", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.540371, "lng": -48.294136, "cor": "#f59e0b", "icone": "fa-clock", "economias": 85, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.542327, -48.297016], [-23.538168, -48.28963]]},
        {"id": "Coqueiros", "nome": "Coqueiros", "municipio": "Angatuba", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.504601, "lng": -48.421382, "cor": "#f59e0b", "icone": "fa-clock", "economias": 134, "extensao_total": 1868.54, "trechos": 41, "pontos": 32, "eees": 2, "modalidade": "NOVO", "produto": "ESGOTO", "projeto": "EXECUTIVO", "bounds": [[-23.507134, -48.4245], [-23.5015, -48.418386]]},
        {"id": "Dos Leites", "nome": "Dos Leites", "municipio": "Angatuba", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.453402, "lng": -48.323366, "cor": "#f59e0b", "icone": "fa-clock", "economias": 36, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.456394, -48.328329], [-23.449172, -48.318707]]},
        {"id": "ETE - Bom Retiro", "nome": "ETE - Bom Retiro", "municipio": "Angatuba", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.545858, "lng": -48.311508, "cor": "#f59e0b", "icone": "fa-clock", "economias": 0, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.54631, -48.311997], [-23.545407, -48.311019]]},
        {"id": "Figueira", "nome": "Figueira", "municipio": "Angatuba", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.515122, "lng": -48.385569, "cor": "#f59e0b", "icone": "fa-clock", "economias": 70, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.521716, -48.390082], [-23.508336, -48.380486]]},
        {"id": "Libaneos", "nome": "Libaneos", "municipio": "Angatuba", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.465581, "lng": -48.447882, "cor": "#f59e0b", "icone": "fa-clock", "economias": 43, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.468327, -48.450021], [-23.462144, -48.445967]]},
        {"id": "Machadinho", "nome": "Machadinho", "municipio": "Angatuba", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.536033, "lng": -48.407944, "cor": "#f59e0b", "icone": "fa-clock", "economias": 18, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.537461, -48.409396], [-23.534727, -48.406604]]},
        {"id": "Pateo Velho", "nome": "Pateo Velho", "municipio": "Angatuba", "status": "INICIADO", "statusLabel": "Iniciado", "lat": -23.553544, "lng": -48.312093, "cor": "#0284c7", "icone": "fa-spinner", "economias": 47, "extensao_total": 836.21, "trechos": 26, "pontos": 10, "eees": 1, "modalidade": "NOVO", "produto": "ESGOTO", "projeto": "EXECUTIVO", "bounds": [[-23.555035, -48.31367], [-23.552249, -48.310182]]},
        {"id": "Aleixos", "nome": "Aleixos", "municipio": "Campina do Monte Alegre", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.563597, "lng": -48.464665, "cor": "#f59e0b", "icone": "fa-clock", "economias": 44, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.566637, -48.467713], [-23.560526, -48.461497]]},
        {"id": "Barreiro", "nome": "Barreiro", "municipio": "Campina do Monte Alegre", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.551341, "lng": -48.471438, "cor": "#f59e0b", "icone": "fa-clock", "economias": 46, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.554701, -48.477064], [-23.548647, -48.465615]]},
        {"id": "Engenheiro Hermilio", "nome": "Engenheiro Hermilio", "municipio": "Campina do Monte Alegre", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.603741, "lng": -48.448057, "cor": "#f59e0b", "icone": "fa-clock", "economias": 32, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.606522, -48.450763], [-23.601563, -48.445697]]},
        {"id": "Execução das Obras do SES do Município de Campina do Monte Alegre/Engº Hermilo - Rede, Compreendendo: Rce, Ligações, Emissário e Ete.", "nome": "Execução das Obras do SES do Município de Campina do Monte Alegre/Engº Hermilo - Rede, Compreendendo: Rce, Ligações, Emissário e Ete.", "municipio": "Campina do Monte Alegre", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.594861, "lng": -48.494984, "cor": "#f59e0b", "icone": "fa-clock", "economias": 0, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.595312, -48.495474], [-23.59441, -48.494494]]},
        {"id": "Laranjal", "nome": "Laranjal", "municipio": "Campina do Monte Alegre", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.554076, "lng": -48.413639, "cor": "#f59e0b", "icone": "fa-clock", "economias": 34, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.556592, -48.417013], [-23.551749, -48.410758]]},
        {"id": "Papagaios", "nome": "Papagaios", "municipio": "Campina do Monte Alegre", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.560302, "lng": -48.478773, "cor": "#f59e0b", "icone": "fa-clock", "economias": 116, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.566409, -48.486585], [-23.553325, -48.472099]]},
        {"id": "Prainha 2", "nome": "Prainha 2", "municipio": "Campina do Monte Alegre", "status": "INICIADO", "statusLabel": "Iniciado", "lat": -23.605237, "lng": -48.491492, "cor": "#0284c7", "icone": "fa-spinner", "economias": 62, "extensao_total": 4264.67, "trechos": 130, "pontos": 126, "eees": 1, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "EXECUTIVO", "bounds": [[-23.61024, -48.496973], [-23.600313, -48.483354]]},
        {"id": "Salto", "nome": "Salto", "municipio": "Campina do Monte Alegre", "status": "INICIADO", "statusLabel": "Iniciado", "lat": -23.550173, "lng": -48.514683, "cor": "#0284c7", "icone": "fa-spinner", "economias": 241, "extensao_total": 4643.06, "trechos": 119, "pontos": 72, "eees": 4, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "EXECUTIVO", "bounds": [[-23.559856, -48.521316], [-23.541089, -48.507633]]},
        {"id": "Tapiá", "nome": "Tapiá", "municipio": "Campina do Monte Alegre", "status": "INICIADO", "statusLabel": "Iniciado", "lat": -23.558371, "lng": -48.501181, "cor": "#0284c7", "icone": "fa-spinner", "economias": 72, "extensao_total": 3182.44, "trechos": 92, "pontos": 48, "eees": 1, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "EXECUTIVO", "bounds": [[-23.562187, -48.504119], [-23.552869, -48.498847]]},
        {"id": "Capão Bonito - ETE - Ampliação de 32,27 L/S", "nome": "Capão Bonito - ETE - Ampliação de 32,27 L/S", "municipio": "Capão Bonito", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.975457, "lng": -48.349378, "cor": "#f59e0b", "icone": "fa-clock", "economias": 0, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.975909, -48.349869], [-23.975006, -48.348887]]},
        {"id": "Capão Bonito-Ampliação da Captação 23,34 L/S", "nome": "Capão Bonito-Ampliação da Captação 23,34 L/S", "municipio": "Capão Bonito", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -24.032687, "lng": -48.317895, "cor": "#f59e0b", "icone": "fa-clock", "economias": 0, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-24.033138, -48.318386], [-24.032236, -48.317404]]},
        {"id": "Dos Gomes", "nome": "Dos Gomes", "municipio": "Capão Bonito", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -24.11841, "lng": -48.448007, "cor": "#f59e0b", "icone": "fa-clock", "economias": 50, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-24.121034, -48.452342], [-24.115724, -48.443167]]},
        {"id": "Dos Lemes", "nome": "Dos Lemes", "municipio": "Capão Bonito", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -24.025985, "lng": -48.475586, "cor": "#f59e0b", "icone": "fa-clock", "economias": 82, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-24.035795, -48.487113], [-24.018378, -48.465151]]},
        {"id": "Itanguá", "nome": "Itanguá", "municipio": "Capão Bonito", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.953838, "lng": -48.461428, "cor": "#f59e0b", "icone": "fa-clock", "economias": 72, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.95797, -48.465958], [-23.950238, -48.456739]]},
        {"id": "Jd. Boa Esperança", "nome": "Jd. Boa Esperança", "municipio": "Capão Bonito", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.994219, "lng": -48.364681, "cor": "#f59e0b", "icone": "fa-clock", "economias": 170, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.996819, -48.366851], [-23.992199, -48.363102]]},
        {"id": "Querência do Turvo", "nome": "Querência do Turvo", "municipio": "Capão Bonito", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.854958, "lng": -48.226847, "cor": "#f59e0b", "icone": "fa-clock", "economias": 201, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.859628, -48.237283], [-23.84953, -48.217019]]},
        {"id": "Turvo dos Almeidas", "nome": "Turvo dos Almeidas", "municipio": "Capão Bonito", "status": "INICIADO", "statusLabel": "Iniciado", "lat": -23.859545, "lng": -48.202287, "cor": "#0284c7", "icone": "fa-spinner", "economias": 506, "extensao_total": 12567.09, "trechos": 326, "pontos": 186, "eees": 6, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "EXECUTIVO", "bounds": [[-23.868983, -48.21599], [-23.850757, -48.185636]]},
        {"id": "Capela Velha", "nome": "Capela Velha", "municipio": "Guareí", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.378086, "lng": -48.243043, "cor": "#f59e0b", "icone": "fa-clock", "economias": 22, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.381317, -48.247044], [-23.375285, -48.238335]]},
        {"id": "Cerrito", "nome": "Cerrito", "municipio": "Guareí", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.42398, "lng": -48.159613, "cor": "#f59e0b", "icone": "fa-clock", "economias": 118, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.449691, -48.169047], [-23.397099, -48.144217]]},
        {"id": "Cerro", "nome": "Cerro", "municipio": "Guareí", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.466246, "lng": -48.243202, "cor": "#f59e0b", "icone": "fa-clock", "economias": 80, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA (em andamento)", "projeto": "NÃO INICIADO", "bounds": [[-23.473225, -48.255271], [-23.461097, -48.232225]]},
        {"id": "Frente 01 - GRI", "nome": "Frente 01 - GRI", "municipio": "Guareí", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.354506, "lng": -48.173813, "cor": "#f59e0b", "icone": "fa-clock", "economias": 58, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.362287, -48.179584], [-23.349267, -48.166061]]},
        {"id": "Frente 02 - GRI", "nome": "Frente 02 - GRI", "municipio": "Guareí", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.374096, "lng": -48.162285, "cor": "#f59e0b", "icone": "fa-clock", "economias": 38, "extensao_total": 161.01, "trechos": 2, "pontos": 2, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.379029, -48.170018], [-23.369128, -48.154528]]},
        {"id": "Frente 03 - GRI", "nome": "Frente 03 - GRI", "municipio": "Guareí", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.352581, "lng": -48.187454, "cor": "#f59e0b", "icone": "fa-clock", "economias": 134, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA E ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.357513, -48.191286], [-23.345449, -48.184233]]},
        {"id": "Guaréi - Implantação  Rservatório 200m³", "nome": "Guaréi - Implantação  Rservatório 200m³", "municipio": "Guareí", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.37442, "lng": -48.187967, "cor": "#f59e0b", "icone": "fa-clock", "economias": 10, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.374871, -48.188456], [-23.373969, -48.187478]]},
        {"id": "Jacutinga", "nome": "Jacutinga", "municipio": "Guareí", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.414851, "lng": -48.193575, "cor": "#f59e0b", "icone": "fa-clock", "economias": 83, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.417496, -48.1991], [-23.411931, -48.188801]]},
        {"id": "Jardim Adelina", "nome": "Jardim Adelina", "municipio": "Guareí", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.363101, "lng": -48.201101, "cor": "#f59e0b", "icone": "fa-clock", "economias": 141, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.369071, -48.209531], [-23.355964, -48.192039]]},
        {"id": "Pedras e Vitória", "nome": "Pedras e Vitória", "municipio": "Guareí", "status": "INICIADO", "statusLabel": "Iniciado", "lat": -23.36552, "lng": -48.141569, "cor": "#0284c7", "icone": "fa-spinner", "economias": 667, "extensao_total": 21770.84, "trechos": 517, "pontos": 330, "eees": 4, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "EXECUTIVO", "bounds": [[-23.373825, -48.177388], [-23.358829, -48.111341]]},
        {"id": "Rua Benedito Tomé", "nome": "Rua Benedito Tomé", "municipio": "Guareí", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.362975, "lng": -48.186884, "cor": "#f59e0b", "icone": "fa-clock", "economias": 12, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA E ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.364498, -48.187464], [-23.360653, -48.185943]]},
        {"id": "Rua Francis Castanho de Moraes", "nome": "Rua Francis Castanho de Moraes", "municipio": "Guareí", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.36211, "lng": -48.181298, "cor": "#f59e0b", "icone": "fa-clock", "economias": 2, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA E ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.362517, -48.181718], [-23.361396, -48.180802]]},
        {"id": "Rua Tiradentes", "nome": "Rua Tiradentes", "municipio": "Guareí", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.375539, "lng": -48.180606, "cor": "#f59e0b", "icone": "fa-clock", "economias": 10, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.375857, -48.181057], [-23.375135, -48.180221]]},
        {"id": "Sarandi", "nome": "Sarandi", "municipio": "Guareí", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.342064, "lng": -48.246974, "cor": "#f59e0b", "icone": "fa-clock", "economias": 16, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.345659, -48.249155], [-23.338331, -48.244418]]},
        {"id": "Sobar", "nome": "Sobar", "municipio": "Guareí", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.346082, "lng": -48.346429, "cor": "#f59e0b", "icone": "fa-clock", "economias": 40, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.352067, -48.351703], [-23.339195, -48.340233]]},
        {"id": "Ampliação ETA Itapetininga", "nome": "Ampliação ETA Itapetininga", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.585363, "lng": -48.036675, "cor": "#f59e0b", "icone": "fa-clock", "economias": 0, "extensao_total": 0.0, "trechos": 0, "pontos": 1, "eees": 0, "modalidade": "NOVO", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.585539, -48.036915], [-23.585195, -48.036456]]},
        {"id": "Ampliação ETE Tupi (Implantação em 2026)", "nome": "Ampliação ETE Tupi (Implantação em 2026)", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.532544, "lng": -48.244481, "cor": "#f59e0b", "icone": "fa-clock", "economias": 0, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.532995, -48.24497], [-23.532093, -48.243991]]},
        {"id": "Ampliação Reservatório Conceição (Implantação em 2026)", "nome": "Ampliação Reservatório Conceição (Implantação em 2026)", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.704338, "lng": -48.104464, "cor": "#f59e0b", "icone": "fa-clock", "economias": 0, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.704789, -48.104954], [-23.703887, -48.103975]]},
        {"id": "Ampliação Reservatório Rechan (Implantação em 2026)", "nome": "Ampliação Reservatório Rechan (Implantação em 2026)", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.599351, "lng": -48.311261, "cor": "#f59e0b", "icone": "fa-clock", "economias": 0, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.599802, -48.31175], [-23.5989, -48.310771]]},
        {"id": "Areião", "nome": "Areião", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.718866, "lng": -48.288932, "cor": "#f59e0b", "icone": "fa-clock", "economias": 112, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.725353, -48.298764], [-23.712184, -48.276971]]},
        {"id": "Biscoito Duro", "nome": "Biscoito Duro", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.840948, "lng": -48.207525, "cor": "#f59e0b", "icone": "fa-clock", "economias": 404, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.849209, -48.213958], [-23.831707, -48.201511]]},
        {"id": "Campo Grande e Vatinga", "nome": "Campo Grande e Vatinga", "municipio": "Itapetininga", "status": "INICIADO", "statusLabel": "Iniciado", "lat": -23.731706, "lng": -48.004524, "cor": "#0284c7", "icone": "fa-spinner", "economias": 400, "extensao_total": 14817.98, "trechos": 75, "pontos": 75, "eees": 0, "modalidade": "NOVO", "produto": "ÁGUA/ESGOTO", "projeto": "EXECUTIVO", "bounds": [[-23.744433, -48.020554], [-23.720954, -47.980787]]},
        {"id": "Campo do Meio", "nome": "Campo do Meio", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.700873, "lng": -48.174954, "cor": "#f59e0b", "icone": "fa-clock", "economias": 78, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.706095, -48.184918], [-23.696749, -48.165079]]},
        {"id": "Canta Galo", "nome": "Canta Galo", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.773139, "lng": -48.207986, "cor": "#f59e0b", "icone": "fa-clock", "economias": 84, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.776654, -48.212067], [-23.769113, -48.20459]]},
        {"id": "Capivari", "nome": "Capivari", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.717073, "lng": -48.262894, "cor": "#f59e0b", "icone": "fa-clock", "economias": 32, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.719163, -48.268438], [-23.714575, -48.25837]]},
        {"id": "Claros", "nome": "Claros", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.810986, "lng": -48.310501, "cor": "#f59e0b", "icone": "fa-clock", "economias": 162, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.819532, -48.320475], [-23.803432, -48.297535]]},
        {"id": "Curuça I", "nome": "Curuça I", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.603657, "lng": -48.129325, "cor": "#f59e0b", "icone": "fa-clock", "economias": 32, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "", "projeto": "NÃO INICIADO", "bounds": [[-23.604643, -48.131552], [-23.602408, -48.127387]]},
        {"id": "Curuça II", "nome": "Curuça II", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.610119, "lng": -48.136449, "cor": "#f59e0b", "icone": "fa-clock", "economias": 75, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.616125, -48.142803], [-23.606533, -48.133062]]},
        {"id": "Curuça III", "nome": "Curuça III", "municipio": "Itapetininga", "status": "INICIADO", "statusLabel": "Iniciado (Água)", "lat": -23.609789, "lng": -48.15821, "cor": "#0284c7", "icone": "fa-tint", "economias": 320, "extensao_total": 3901.67, "trechos": 30, "pontos": 27, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA/ESGOTO", "projeto": "EXECUTIVO", "bounds": [[-23.61444, -48.161214], [-23.605927, -48.154143]]},
        {"id": "Distrito Gramadinho", "nome": "Distrito Gramadinho", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.774196, "lng": -48.119467, "cor": "#f59e0b", "icone": "fa-clock", "economias": 89, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.780946, -48.128549], [-23.766815, -48.110315]]},
        {"id": "Distrito de Conceição", "nome": "Distrito de Conceição", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.699906, "lng": -48.091141, "cor": "#f59e0b", "icone": "fa-clock", "economias": 790, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.705465, -48.107364], [-23.69408, -48.076565]]},
        {"id": "Distrito do Rechan (Travessa\nManoel Rodrigues)", "nome": "Distrito do Rechan (Travessa\nManoel Rodrigues)", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.597082, "lng": -48.305665, "cor": "#f59e0b", "icone": "fa-clock", "economias": 54, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.598575, -48.307347], [-23.595612, -48.303981]]},
        {"id": "ETE Compacta Itarecreio  371_ar_1847 (Implantação em 2026)", "nome": "ETE Compacta Itarecreio  371_ar_1847 (Implantação em 2026)", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.59967, "lng": -48.260864, "cor": "#f59e0b", "icone": "fa-clock", "economias": 0, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.600121, -48.261353], [-23.599219, -48.260374]]},
        {"id": "Gramadinho - Formal 2", "nome": "Gramadinho - Formal 2", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.770612, "lng": -48.133671, "cor": "#f59e0b", "icone": "fa-clock", "economias": 4, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.771848, -48.134297], [-23.769246, -48.132809]]},
        {"id": "Gramadinho Formal 1", "nome": "Gramadinho Formal 1", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.773805, "lng": -48.132683, "cor": "#f59e0b", "icone": "fa-clock", "economias": 12, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.775108, -48.133248], [-23.77245, -48.131749]]},
        {"id": "Ita Recreio", "nome": "Ita Recreio", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.586275, "lng": -48.257571, "cor": "#f59e0b", "icone": "fa-clock", "economias": 352, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.600273, -48.262283], [-23.572957, -48.251365]]},
        {"id": "Jardim Monte Santo 1", "nome": "Jardim Monte Santo 1", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.593452, "lng": -47.961252, "cor": "#f59e0b", "icone": "fa-clock", "economias": 34, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.596512, -47.967294], [-23.587527, -47.954443]]},
        {"id": "Jardim Monte Santo 2", "nome": "Jardim Monte Santo 2", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.584402, "lng": -47.972959, "cor": "#f59e0b", "icone": "fa-clock", "economias": 8, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.584975, -47.973236], [-23.583807, -47.972681]]},
        {"id": "Jd Aeroporto", "nome": "Jd Aeroporto", "municipio": "Itapetininga", "status": "INICIADO", "statusLabel": "Iniciado", "lat": -23.575335, "lng": -47.981578, "cor": "#0284c7", "icone": "fa-spinner", "economias": 50, "extensao_total": 2125.6, "trechos": 52, "pontos": 22, "eees": 1, "modalidade": "NOVO", "produto": "ESGOTO", "projeto": "EXECUTIVO", "bounds": [[-23.57894, -47.98517], [-23.573235, -47.978824]]},
        {"id": "Jurumirim", "nome": "Jurumirim", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.426422, "lng": -47.951402, "cor": "#f59e0b", "icone": "fa-clock", "economias": 502, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.434912, -47.957299], [-23.417028, -47.944003]]},
        {"id": "Mato Seco", "nome": "Mato Seco", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.533025, "lng": -47.99879, "cor": "#f59e0b", "icone": "fa-clock", "economias": 14, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.537019, -48.003141], [-23.52831, -47.994058]]},
        {"id": "Morro Vermelho", "nome": "Morro Vermelho", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.602041, "lng": -47.967565, "cor": "#f59e0b", "icone": "fa-clock", "economias": 38, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.604619, -47.971495], [-23.599713, -47.964231]]},
        {"id": "Morro do Alto", "nome": "Morro do Alto", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.482119, "lng": -47.9586, "cor": "#f59e0b", "icone": "fa-clock", "economias": 14, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.482933, -47.959283], [-23.481649, -47.957869]]},
        {"id": "Morro do Alto 1", "nome": "Morro do Alto 1", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.479661, "lng": -47.955458, "cor": "#f59e0b", "icone": "fa-clock", "economias": 17, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.480967, -47.956229], [-23.478361, -47.954764]]},
        {"id": "P4", "nome": "P4", "municipio": "Itapetininga", "status": "INICIADO", "statusLabel": "Iniciado", "lat": -23.638955, "lng": -48.011993, "cor": "#0284c7", "icone": "fa-spinner", "economias": 0, "extensao_total": 0.0, "trechos": 0, "pontos": 1, "eees": 0, "modalidade": "NOVO", "produto": "ÁGUA/ESGOTO", "projeto": "EXECUTIVO", "bounds": [[-23.639067, -48.012128], [-23.638844, -48.011852]]},
        {"id": "P5", "nome": "P5", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.626808, "lng": -48.027355, "cor": "#f59e0b", "icone": "fa-clock", "economias": 0, "extensao_total": 0.0, "trechos": 0, "pontos": 1, "eees": 0, "modalidade": "NOVO", "produto": "ÁGUA/ESGOTO", "projeto": "EXECUTIVO", "bounds": [[-23.626875, -48.027491], [-23.626744, -48.027239]]},
        {"id": "Pacaembu", "nome": "Pacaembu", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.549726, "lng": -48.055713, "cor": "#f59e0b", "icone": "fa-clock", "economias": 2000, "extensao_total": 4268.82, "trechos": 2, "pontos": 1, "eees": 0, "modalidade": "NOVO", "produto": "ÁGUA E ESGOTO", "projeto": "EXECUTIVO", "bounds": [[-23.55278, -48.059179], [-23.546913, -48.052726]]},
        {"id": "Peixoto", "nome": "Peixoto", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.514736, "lng": -48.009911, "cor": "#f59e0b", "icone": "fa-clock", "economias": 250, "extensao_total": 31698.0, "trechos": 205, "pontos": 206, "eees": 0, "modalidade": "NOVO", "produto": "ÁGUA/ESGOTO", "projeto": "EXECUTIVO", "bounds": [[-23.558456, -48.024309], [-23.480433, -47.9956]]},
        {"id": "Pescaria", "nome": "Pescaria", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.738645, "lng": -48.351389, "cor": "#f59e0b", "icone": "fa-clock", "economias": 110, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.743843, -48.355121], [-23.734282, -48.34809]]},
        {"id": "Portal da Figueira", "nome": "Portal da Figueira", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.559359, "lng": -48.00238, "cor": "#f59e0b", "icone": "fa-clock", "economias": 84, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.562386, -48.005832], [-23.556056, -47.998738]]},
        {"id": "Porto", "nome": "Porto", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.636135, "lng": -48.101893, "cor": "#f59e0b", "icone": "fa-clock", "economias": 610, "extensao_total": 8785.11, "trechos": 63, "pontos": 58, "eees": 0, "modalidade": "NOVO", "produto": "ÁGUA/ESGOTO", "projeto": "BÁSICO", "bounds": [[-23.644774, -48.123002], [-23.629098, -48.085663]]},
        {"id": "Registro/Porto Velho", "nome": "Registro/Porto Velho", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.622744, "lng": -48.105603, "cor": "#f59e0b", "icone": "fa-clock", "economias": 88, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.630156, -48.11046], [-23.616541, -48.100073]]},
        {"id": "Retiro", "nome": "Retiro", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.783002, "lng": -48.319938, "cor": "#f59e0b", "icone": "fa-clock", "economias": 257, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.789228, -48.325795], [-23.775319, -48.312404]]},
        {"id": "Rio Acima", "nome": "Rio Acima", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.736357, "lng": -47.85957, "cor": "#f59e0b", "icone": "fa-clock", "economias": 904, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.754157, -47.876435], [-23.718812, -47.840942]]},
        {"id": "Tande - Distrito do Rechan", "nome": "Tande - Distrito do Rechan", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.593927, "lng": -48.311324, "cor": "#f59e0b", "icone": "fa-clock", "economias": 2, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.595072, -48.312837], [-23.592958, -48.309215]]},
        {"id": "Tupy - EEE", "nome": "Tupy - EEE", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.543285, "lng": -48.230101, "cor": "#f59e0b", "icone": "fa-clock", "economias": 0, "extensao_total": 0.0, "trechos": 0, "pontos": 1, "eees": 1, "modalidade": "NOVO", "produto": "ESGOTO", "projeto": "EXECUTIVO", "bounds": [[-23.543302, -48.230126], [-23.543267, -48.230077]]},
        {"id": "Tupy 1", "nome": "Tupy 1", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.543722, "lng": -48.23746, "cor": "#f59e0b", "icone": "fa-clock", "economias": 19, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.544003, -48.237974], [-23.543447, -48.236948]]},
        {"id": "Tupy 2", "nome": "Tupy 2", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.539389, "lng": -48.230142, "cor": "#f59e0b", "icone": "fa-clock", "economias": 25, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.541891, -48.231472], [-23.536722, -48.228824]]},
        {"id": "Tupy 3", "nome": "Tupy 3", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.548872, "lng": -48.236589, "cor": "#f59e0b", "icone": "fa-clock", "economias": 5, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.549568, -48.238287], [-23.548263, -48.235102]]},
        {"id": "Turvo dos Rodrigues", "nome": "Turvo dos Rodrigues", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.837981, "lng": -48.257211, "cor": "#f59e0b", "icone": "fa-clock", "economias": 81, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "", "projeto": "NÃO INICIADO", "bounds": [[-23.844456, -48.261749], [-23.83203, -48.252318]]},
        {"id": "Turvo dos Rodrigues", "nome": "Turvo dos Rodrigues", "municipio": "Itapetininga", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.838631, "lng": -48.240143, "cor": "#f59e0b", "icone": "fa-clock", "economias": 118, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.841057, -48.246966], [-23.836044, -48.235007]]},
        {"id": "Avenida José Gil Plens (Entrada\nda Cidade)", "nome": "Avenida José Gil Plens (Entrada\nda Cidade)", "municipio": "Paranapanema", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.39406, "lng": -48.730847, "cor": "#f59e0b", "icone": "fa-clock", "economias": 62, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.397156, -48.735242], [-23.391071, -48.726151]]},
        {"id": "Bairro Aparecida", "nome": "Bairro Aparecida", "municipio": "Paranapanema", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.468912, "lng": -48.775497, "cor": "#f59e0b", "icone": "fa-clock", "economias": 1, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.46979, -48.776116], [-23.467954, -48.774745]]},
        {"id": "Loteamento Apiaí", "nome": "Loteamento Apiaí", "municipio": "Paranapanema", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.589198, "lng": -48.616186, "cor": "#f59e0b", "icone": "fa-clock", "economias": 138, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA E ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.594681, -48.626813], [-23.584856, -48.607951]]},
        {"id": "Mato Dentro PNP", "nome": "Mato Dentro PNP", "municipio": "Paranapanema", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.517271, "lng": -48.864443, "cor": "#f59e0b", "icone": "fa-clock", "economias": 146, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.525184, -48.880289], [-23.510698, -48.852209]]},
        {"id": "Paranapanema - Captação - Implantação de 13,59 L/S  - Ampliação da Outorga em 10,5 L/S", "nome": "Paranapanema - Captação - Implantação de 13,59 L/S  - Ampliação da Outorga em 10,5 L/S", "municipio": "Paranapanema", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.383858, "lng": -48.704432, "cor": "#f59e0b", "icone": "fa-clock", "economias": 0, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.384309, -48.704921], [-23.383407, -48.703943]]},
        {"id": "Paranapanema - ETA Sede - Ampliação de 9,11 L/S", "nome": "Paranapanema - ETA Sede - Ampliação de 9,11 L/S", "municipio": "Paranapanema", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.377045, "lng": -48.709792, "cor": "#f59e0b", "icone": "fa-clock", "economias": 0, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.377497, -48.710281], [-23.376594, -48.709303]]},
        {"id": "Ponte", "nome": "Ponte", "municipio": "Paranapanema", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.475421, "lng": -48.637197, "cor": "#f59e0b", "icone": "fa-clock", "economias": 160, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.476352, -48.640726], [-23.474228, -48.633356]]},
        {"id": "Recanto I", "nome": "Recanto I", "municipio": "Paranapanema", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.349345, "lng": -48.907853, "cor": "#f59e0b", "icone": "fa-clock", "economias": 104, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA E ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.35544, -48.915405], [-23.342093, -48.898947]]},
        {"id": "Remanso do Paranapanema", "nome": "Remanso do Paranapanema", "municipio": "Paranapanema", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.394676, "lng": -48.719641, "cor": "#f59e0b", "icone": "fa-clock", "economias": 28, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA E ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.396288, -48.721483], [-23.392732, -48.718222]]},
        {"id": "Rua Um", "nome": "Rua Um", "municipio": "Paranapanema", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.385375, "lng": -48.720292, "cor": "#f59e0b", "icone": "fa-clock", "economias": 2, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA E ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.385954, -48.72133], [-23.384798, -48.719288]]},
        {"id": "Rua das Posses", "nome": "Rua das Posses", "municipio": "Paranapanema", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.450169, "lng": -48.889133, "cor": "#f59e0b", "icone": "fa-clock", "economias": 5, "extensao_total": 340.0, "trechos": 17, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.452547, -48.890646], [-23.448069, -48.887436]]},
        {"id": "Serra da Prata", "nome": "Serra da Prata", "municipio": "Paranapanema", "status": "INICIADO", "statusLabel": "Iniciado", "lat": -23.458868, "lng": -48.821537, "cor": "#0284c7", "icone": "fa-spinner", "economias": 547, "extensao_total": 1084.43, "trechos": 36, "pontos": 2, "eees": 2, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "EXECUTIVO", "bounds": [[-23.462791, -48.827367], [-23.453646, -48.814714]]},
        {"id": "São Pedro", "nome": "São Pedro", "municipio": "Paranapanema", "status": "INICIADO", "statusLabel": "Iniciado", "lat": -23.366647, "lng": -48.720037, "cor": "#0284c7", "icone": "fa-spinner", "economias": 70, "extensao_total": 620.0, "trechos": 31, "pontos": 1, "eees": 1, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "EXECUTIVO", "bounds": [[-23.369649, -48.725961], [-23.362882, -48.71482]]},
        {"id": "São Pedro II", "nome": "São Pedro II", "municipio": "Paranapanema", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.357512, "lng": -48.72333, "cor": "#f59e0b", "icone": "fa-clock", "economias": 63, "extensao_total": 1793.51, "trechos": 32, "pontos": 33, "eees": 1, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "EXECUTIVO", "bounds": [[-23.361422, -48.731496], [-23.353498, -48.715416]]},
        {"id": "Bairro Serra Italiana", "nome": "Bairro Serra Italiana", "municipio": "Pardinho", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.150587, "lng": -48.402764, "cor": "#f59e0b", "icone": "fa-clock", "economias": 696, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.155581, -48.409844], [-23.145728, -48.395179]]},
        {"id": "Campos Eliseos", "nome": "Campos Eliseos", "municipio": "Pardinho", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.056414, "lng": -48.484076, "cor": "#f59e0b", "icone": "fa-clock", "economias": 0, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.066009, -48.498531], [-23.046468, -48.473085]]},
        {"id": "Distrito Industrial", "nome": "Distrito Industrial", "municipio": "Pardinho", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.099335, "lng": -48.389388, "cor": "#f59e0b", "icone": "fa-clock", "economias": 30, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.103319, -48.39356], [-23.095035, -48.38619]]},
        {"id": "Lot. Jd. São João", "nome": "Lot. Jd. São João", "municipio": "Pardinho", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.090593, "lng": -48.373492, "cor": "#f59e0b", "icone": "fa-clock", "economias": 10, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.091615, -48.374582], [-23.089204, -48.372075]]},
        {"id": "Maristela", "nome": "Maristela", "municipio": "Pardinho", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.141439, "lng": -48.450537, "cor": "#f59e0b", "icone": "fa-clock", "economias": 296, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA E ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.14744, -48.456355], [-23.136643, -48.443782]]},
        {"id": "Rua Nicanor Teodoro Rosa", "nome": "Rua Nicanor Teodoro Rosa", "municipio": "Pardinho", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.07729, "lng": -48.383332, "cor": "#f59e0b", "icone": "fa-clock", "economias": 7, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.077777, -48.384424], [-23.076639, -48.382597]]},
        {"id": "Bairro Ilha", "nome": "Bairro Ilha", "municipio": "Pilar do Sul", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.730548, "lng": -47.647654, "cor": "#f59e0b", "icone": "fa-clock", "economias": 219, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.755101, -47.663365], [-23.707819, -47.631309]]},
        {"id": "Chapadão", "nome": "Chapadão", "municipio": "Pilar do Sul", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.906198, "lng": -47.853806, "cor": "#f59e0b", "icone": "fa-clock", "economias": 94, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.910147, -47.860419], [-23.901672, -47.848524]]},
        {"id": "Ete_sede_ampliação_2028", "nome": "Ete_sede_ampliação_2028", "municipio": "Pilar do Sul", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.795167, "lng": -47.735155, "cor": "#f59e0b", "icone": "fa-clock", "economias": 0, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.795618, -47.735645], [-23.794717, -47.734665]]},
        {"id": "Frente 01 - PLS", "nome": "Frente 01 - PLS", "municipio": "Pilar do Sul", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.829872, "lng": -47.714408, "cor": "#f59e0b", "icone": "fa-clock", "economias": 8, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA E ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.830536, -47.715402], [-23.829277, -47.713354]]},
        {"id": "Guaçuzal", "nome": "Guaçuzal", "municipio": "Pilar do Sul", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.835085, "lng": -47.72145, "cor": "#f59e0b", "icone": "fa-clock", "economias": 94, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.839664, -47.725018], [-23.829192, -47.716394]]},
        {"id": "Jardim Panorama", "nome": "Jardim Panorama", "municipio": "Pilar do Sul", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.767457, "lng": -47.658408, "cor": "#f59e0b", "icone": "fa-clock", "economias": 316, "extensao_total": 1699.93, "trechos": 14, "pontos": 12, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.771302, -47.668496], [-23.762343, -47.651224]]},
        {"id": "Jardim Vitória Matadouro", "nome": "Jardim Vitória Matadouro", "municipio": "Pilar do Sul", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.792936, "lng": -47.746112, "cor": "#f59e0b", "icone": "fa-clock", "economias": 0, "extensao_total": 0.0, "trechos": 0, "pontos": 1, "eees": 1, "modalidade": "NOVO", "produto": "ESGOTO", "projeto": "EXECUTIVO", "bounds": [[-23.792961, -47.746146], [-23.79291, -47.746079]]},
        {"id": "Jd Cananéia e Ch. Reunidas", "nome": "Jd Cananéia e Ch. Reunidas", "municipio": "Pilar do Sul", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.781684, "lng": -47.805516, "cor": "#f59e0b", "icone": "fa-clock", "economias": 1969, "extensao_total": 67529.61, "trechos": 1152, "pontos": 1198, "eees": 45, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "BÁSICO", "bounds": [[-23.799061, -47.83527], [-23.76831, -47.777795]]},
        {"id": "Lavrinha", "nome": "Lavrinha", "municipio": "Pilar do Sul", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.843386, "lng": -47.73784, "cor": "#f59e0b", "icone": "fa-clock", "economias": 43, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.847107, -47.741744], [-23.840436, -47.734904]]},
        {"id": "Paineiras", "nome": "Paineiras", "municipio": "Pilar do Sul", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.814964, "lng": -47.605572, "cor": "#f59e0b", "icone": "fa-clock", "economias": 4, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.815748, -47.606379], [-23.81397, -47.604813]]},
        {"id": "Ribeirão", "nome": "Ribeirão", "municipio": "Pilar do Sul", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.830341, "lng": -47.690556, "cor": "#f59e0b", "icone": "fa-clock", "economias": 200, "extensao_total": 3664.88, "trechos": 23, "pontos": 23, "eees": 0, "modalidade": "NOVO", "produto": "ÁGUA/ESGOTO", "projeto": "EXECUTIVO", "bounds": [[-23.84278, -47.701094], [-23.82035, -47.678536]]},
        {"id": "Rod. Nestor Fogaça (Bairro)", "nome": "Rod. Nestor Fogaça (Bairro)", "municipio": "Pilar do Sul", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.81573, "lng": -47.708672, "cor": "#f59e0b", "icone": "fa-clock", "economias": 6, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA E ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.816676, -47.709464], [-23.814751, -47.707957]]},
        {"id": "Turvinho", "nome": "Turvinho", "municipio": "Pilar do Sul", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.807509, "lng": -47.624183, "cor": "#f59e0b", "icone": "fa-clock", "economias": 110, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.814719, -47.632281], [-23.80206, -47.611911]]},
        {"id": "Turvo dos Goes", "nome": "Turvo dos Goes", "municipio": "Pilar do Sul", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.875543, "lng": -47.60858, "cor": "#f59e0b", "icone": "fa-clock", "economias": 36, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.880214, -47.613889], [-23.871824, -47.604904]]},
        {"id": "Água Doce/Bom Retiro", "nome": "Água Doce/Bom Retiro", "municipio": "Pilar do Sul", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.777141, "lng": -47.686684, "cor": "#f59e0b", "icone": "fa-clock", "economias": 143, "extensao_total": 4868.7, "trechos": 43, "pontos": 48, "eees": 0, "modalidade": "NOVO", "produto": "ÁGUA/ESGOTO", "projeto": "EXECUTIVO", "bounds": [[-23.786512, -47.697298], [-23.767661, -47.678641]]},
        {"id": "Barreiro do Cabral", "nome": "Barreiro do Cabral", "municipio": "Ribeirão Grande", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -24.146754, "lng": -48.353918, "cor": "#f59e0b", "icone": "fa-clock", "economias": 160, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-24.149545, -48.357296], [-24.143194, -48.351019]]},
        {"id": "Barro Branco", "nome": "Barro Branco", "municipio": "Ribeirão Grande", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -24.177574, "lng": -48.360807, "cor": "#f59e0b", "icone": "fa-clock", "economias": 34, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-24.183206, -48.363913], [-24.171566, -48.354737]]},
        {"id": "Boa Vista RG", "nome": "Boa Vista RG", "municipio": "Ribeirão Grande", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -24.227894, "lng": -48.4235, "cor": "#f59e0b", "icone": "fa-clock", "economias": 230, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-24.231853, -48.428227], [-24.223399, -48.419051]]},
        {"id": "Capoeira Alta", "nome": "Capoeira Alta", "municipio": "Ribeirão Grande", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -24.128082, "lng": -48.397331, "cor": "#f59e0b", "icone": "fa-clock", "economias": 374, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-24.134155, -48.402849], [-24.120964, -48.39208]]},
        {"id": "Conchas", "nome": "Conchas", "municipio": "Ribeirão Grande", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -24.115616, "lng": -48.317627, "cor": "#f59e0b", "icone": "fa-clock", "economias": 10, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-24.116646, -48.320393], [-24.114348, -48.314851]]},
        {"id": "Cristal", "nome": "Cristal", "municipio": "Ribeirão Grande", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -24.142576, "lng": -48.379315, "cor": "#f59e0b", "icone": "fa-clock", "economias": 102, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-24.148233, -48.386304], [-24.138505, -48.368759]]},
        {"id": "Ferreira dos Matos", "nome": "Ferreira dos Matos", "municipio": "Ribeirão Grande", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -24.071843, "lng": -48.393958, "cor": "#f59e0b", "icone": "fa-clock", "economias": 592, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-24.080205, -48.405875], [-24.066293, -48.380514]]},
        {"id": "Jurubatuba", "nome": "Jurubatuba", "municipio": "Ribeirão Grande", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -24.101788, "lng": -48.385183, "cor": "#f59e0b", "icone": "fa-clock", "economias": 8, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ESGOTO", "projeto": "Não tem demanda", "bounds": [[-24.105121, -48.389848], [-24.099129, -48.380379]]},
        {"id": "Lagoa", "nome": "Lagoa", "municipio": "Ribeirão Grande", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -24.122876, "lng": -48.330846, "cor": "#f59e0b", "icone": "fa-clock", "economias": 236, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-24.127506, -48.338166], [-24.117707, -48.323484]]},
        {"id": "Machados", "nome": "Machados", "municipio": "Ribeirão Grande", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -24.081881, "lng": -48.380862, "cor": "#f59e0b", "icone": "fa-clock", "economias": 24, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-24.085491, -48.385122], [-24.077694, -48.37701]]},
        {"id": "Mato Dentro RG", "nome": "Mato Dentro RG", "municipio": "Ribeirão Grande", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -24.097792, "lng": -48.402808, "cor": "#f59e0b", "icone": "fa-clock", "economias": 244, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-24.102156, -48.406826], [-24.09436, -48.397927]]},
        {"id": "Rodrigues", "nome": "Rodrigues", "municipio": "Ribeirão Grande", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -24.074429, "lng": -48.348551, "cor": "#f59e0b", "icone": "fa-clock", "economias": 78, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-24.079086, -48.353666], [-24.069401, -48.34226]]},
        {"id": "Rua Doracina Meira e Região", "nome": "Rua Doracina Meira e Região", "municipio": "Ribeirão Grande", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -24.099153, "lng": -48.360365, "cor": "#f59e0b", "icone": "fa-clock", "economias": 82, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA E ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-24.102787, -48.361936], [-24.096692, -48.358269]]},
        {"id": "Rua Francisco Cesarino Ferreira", "nome": "Rua Francisco Cesarino Ferreira", "municipio": "Ribeirão Grande", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -24.098917, "lng": -48.373969, "cor": "#f59e0b", "icone": "fa-clock", "economias": 12, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA E ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-24.099516, -48.374876], [-24.098603, -48.372781]]},
        {"id": "Taquarianos", "nome": "Taquarianos", "municipio": "Ribeirão Grande", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -24.127131, "lng": -48.414484, "cor": "#f59e0b", "icone": "fa-clock", "economias": 110, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-24.131128, -48.419847], [-24.123354, -48.409906]]},
        {"id": "Abaitinga", "nome": "Abaitinga", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -24.043244, "lng": -48.013792, "cor": "#f59e0b", "icone": "fa-clock", "economias": 1, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-24.043365, -48.013935], [-24.043137, -48.013635]]},
        {"id": "Ampliação ETA São Miguel Arcanjo", "nome": "Ampliação ETA São Miguel Arcanjo", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.873589, "lng": -47.987319, "cor": "#f59e0b", "icone": "fa-clock", "economias": 0, "extensao_total": 0.0, "trechos": 0, "pontos": 1, "eees": 0, "modalidade": "NOVO", "produto": "ÁGUA/ESGOTO", "projeto": "PROJETO EXISTENTE", "bounds": [[-23.873788, -47.987547], [-23.87337, -47.987097]]},
        {"id": "Ampliação ETE Pocinho", "nome": "Ampliação ETE Pocinho", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.864677, "lng": -48.183684, "cor": "#f59e0b", "icone": "fa-clock", "economias": 0, "extensao_total": 80.0, "trechos": 4, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.865128, -48.184174], [-23.864226, -48.183193]]},
        {"id": "Ampliação Imediata CR Capão Rico", "nome": "Ampliação Imediata CR Capão Rico", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.888878, "lng": -48.035483, "cor": "#f59e0b", "icone": "fa-clock", "economias": 0, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.889329, -48.035973], [-23.888427, -48.034992]]},
        {"id": "Ampliação Imediata CR Gaviões", "nome": "Ampliação Imediata CR Gaviões", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -24.040075, "lng": -48.009797, "cor": "#f59e0b", "icone": "fa-clock", "economias": 12, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-24.040526, -48.010288], [-24.039624, -48.009306]]},
        {"id": "Ampliação Imediata CR Pocinho", "nome": "Ampliação Imediata CR Pocinho", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.860424, "lng": -48.167932, "cor": "#f59e0b", "icone": "fa-clock", "economias": 0, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.860875, -48.168422], [-23.859973, -48.167441]]},
        {"id": "Ampliação Imediata CR Santa Cruz de Matos", "nome": "Ampliação Imediata CR Santa Cruz de Matos", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.756717, "lng": -47.96207, "cor": "#f59e0b", "icone": "fa-clock", "economias": 0, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.757168, -47.96256], [-23.756266, -47.96158]]},
        {"id": "Bairro Laranjal", "nome": "Bairro Laranjal", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.560043, "lng": -48.437443, "cor": "#f59e0b", "icone": "fa-clock", "economias": 83, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "NOVO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.571699, -48.445363], [-23.548163, -48.427226]]},
        {"id": "Bairro Monho", "nome": "Bairro Monho", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.89212, "lng": -48.003907, "cor": "#f59e0b", "icone": "fa-clock", "economias": 42, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA E ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.894129, -48.010293], [-23.888383, -47.997288]]},
        {"id": "Boa Vista SMA", "nome": "Boa Vista SMA", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.794847, "lng": -47.905073, "cor": "#f59e0b", "icone": "fa-clock", "economias": 94, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.804246, -47.912587], [-23.787254, -47.895637]]},
        {"id": "Faxinal dos Almeidas", "nome": "Faxinal dos Almeidas", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.773328, "lng": -48.067335, "cor": "#f59e0b", "icone": "fa-clock", "economias": 86, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.775819, -48.0712], [-23.770732, -48.063957]]},
        {"id": "Ferreirada", "nome": "Ferreirada", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.936557, "lng": -47.931191, "cor": "#f59e0b", "icone": "fa-clock", "economias": 104, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.942503, -47.935824], [-23.931097, -47.925798]]},
        {"id": "Frente 01 SMA", "nome": "Frente 01 SMA", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.885043, "lng": -48.012141, "cor": "#f59e0b", "icone": "fa-clock", "economias": 98, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA E ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.888019, -48.01361], [-23.883019, -48.010543]]},
        {"id": "Gramadão", "nome": "Gramadão", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.84514, "lng": -48.176943, "cor": "#f59e0b", "icone": "fa-clock", "economias": 135, "extensao_total": 2459.75, "trechos": 71, "pontos": 39, "eees": 2, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "EXECUTIVO", "bounds": [[-23.848243, -48.181512], [-23.841709, -48.171915]]},
        {"id": "Gramadão 2", "nome": "Gramadão 2", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.843908, "lng": -48.183322, "cor": "#f59e0b", "icone": "fa-clock", "economias": 28, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA E ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.845047, -48.188367], [-23.842974, -48.180129]]},
        {"id": "Gramadão 3", "nome": "Gramadão 3", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.849792, "lng": -48.185053, "cor": "#f59e0b", "icone": "fa-clock", "economias": 13, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.850915, -48.185593], [-23.848648, -48.184476]]},
        {"id": "Gramadão 4", "nome": "Gramadão 4", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.84696, "lng": -48.189055, "cor": "#f59e0b", "icone": "fa-clock", "economias": 15, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.847425, -48.189409], [-23.846456, -48.188577]]},
        {"id": "Guararema", "nome": "Guararema", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -24.037738, "lng": -48.010854, "cor": "#f59e0b", "icone": "fa-clock", "economias": 3, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-24.037983, -48.011055], [-24.037479, -48.01065]]},
        {"id": "Jardim Colinas 1", "nome": "Jardim Colinas 1", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.846633, "lng": -47.969192, "cor": "#f59e0b", "icone": "fa-clock", "economias": 284, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.856954, -47.981015], [-23.835926, -47.954677]]},
        {"id": "Jardim Colinas 2", "nome": "Jardim Colinas 2", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -24.002548, "lng": -48.025317, "cor": "#f59e0b", "icone": "fa-clock", "economias": 448, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-24.013886, -48.03861], [-23.989077, -48.012697]]},
        {"id": "Justinada", "nome": "Justinada", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.971578, "lng": -47.920706, "cor": "#f59e0b", "icone": "fa-clock", "economias": 294, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.987212, -47.939311], [-23.95583, -47.899908]]},
        {"id": "Pocinho", "nome": "Pocinho", "municipio": "São Miguel Arcanjo", "status": "INICIADO", "statusLabel": "Iniciado", "lat": -23.85364, "lng": -48.181581, "cor": "#0284c7", "icone": "fa-spinner", "economias": 177, "extensao_total": 3714.71, "trechos": 91, "pontos": 73, "eees": 2, "modalidade": "NOVO", "produto": "ESGOTO", "projeto": "EXECUTIVO", "bounds": [[-23.856758, -48.184624], [-23.849783, -48.179459]]},
        {"id": "Pocinho 2", "nome": "Pocinho 2", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.855267, "lng": -48.162576, "cor": "#f59e0b", "icone": "fa-clock", "economias": 28, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.857461, -48.165903], [-23.853442, -48.159758]]},
        {"id": "Pocinho 3", "nome": "Pocinho 3", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.860361, "lng": -48.160378, "cor": "#f59e0b", "icone": "fa-clock", "economias": 12, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA E ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.861091, -48.161412], [-23.859598, -48.159209]]},
        {"id": "Retiro", "nome": "Retiro", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.931382, "lng": -47.93262, "cor": "#f59e0b", "icone": "fa-clock", "economias": 90, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.935324, -47.937141], [-23.927847, -47.926988]]},
        {"id": "Rio Acima", "nome": "Rio Acima", "municipio": "São Miguel Arcanjo", "status": "INICIADO", "statusLabel": "Iniciado", "lat": -23.872809, "lng": -47.96558, "cor": "#0284c7", "icone": "fa-spinner", "economias": 231, "extensao_total": 5663.94, "trechos": 166, "pontos": 90, "eees": 4, "modalidade": "NOVO", "produto": "ESGOTO", "projeto": "EXECUTIVO", "bounds": [[-23.881849, -47.974404], [-23.862859, -47.958006]]},
        {"id": "Rua Jacarandá", "nome": "Rua Jacarandá", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.887189, "lng": -47.984401, "cor": "#f59e0b", "icone": "fa-clock", "economias": 12, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "CONTRATO", "produto": "ÁGUA E ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.887687, -47.984853], [-23.886695, -47.983973]]},
        {"id": "Tozan", "nome": "Tozan", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.848142, "lng": -47.848646, "cor": "#f59e0b", "icone": "fa-clock", "economias": 8, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.852871, -47.852544], [-23.84395, -47.845067]]},
        {"id": "Turvo da Lagoa", "nome": "Turvo da Lagoa", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.957729, "lng": -48.081766, "cor": "#f59e0b", "icone": "fa-clock", "economias": 62, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.961476, -48.086553], [-23.953128, -48.075869]]},
        {"id": "Turvo dos Hilários", "nome": "Turvo dos Hilários", "municipio": "São Miguel Arcanjo", "status": "NÃO INICIADO", "statusLabel": "Não Iniciado", "lat": -23.887116, "lng": -48.152793, "cor": "#f59e0b", "icone": "fa-clock", "economias": 210, "extensao_total": 0.0, "trechos": 0, "pontos": 0, "eees": 0, "modalidade": "", "produto": "ÁGUA/ESGOTO", "projeto": "NÃO INICIADO", "bounds": [[-23.89472, -48.158502], [-23.879936, -48.144526]]},
    ];

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
        'REDE COLETORA': '#2563eb',       // Royal Blue
        'LINHA DE RECALQUE': '#dc2626',   // Vermelho (Red)
        'EMISSÁRIO': '#ea580c',           // Laranja (Orange)
        'REDE DE DISTRIBUIÇÃO': '#06b6d4',// Ciano (Cyan)
        'ADUTORA': '#8b5cf6',             // Violeta (Purple)
        'POÇO DE ESGOTO': '#10b981',      // Verde (PVs)
        'POÇO ESGOTO': '#10b981',
        'NÓ': '#94a3b8',
        'NÓS': '#94a3b8',
        'EEE': '#f59e0b',                 // Âmbar
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

    // Classificação funcional de elementos pontuais da camada localizada
    function getLocalizadaCategory(props) {
        if (!props) return 'no';
        const seg = (props.segmento || '').toString().trim().toUpperCase();
        if (seg.includes('EEE') || seg.includes('EEAT') || seg.includes('ETE') ||
            seg.includes('RESERVAT') || seg.includes('BOOSTER') || seg.includes('ETA') ||
            seg.includes('POÇO PROFUNDO') || seg.includes('POCO PROFUNDO')) {
            return 'major';
        }
        if (seg.includes('POÇO') || seg.includes('POCO') || seg.includes('PVE') || seg.includes('PV')) {
            return 'poco';
        }
        return 'no';
    }

    // Marcadores inteligentes da Camada Localizada:
    // - Grandes Instalações (EEE, EEAT, etc.): ícone de 22px com anel pulsante
    // - Poços de Esgoto (PV): micro-marcador circular 7px (Zoom >= 16)
    // - Nós de Rede: micro-marcador circular 5px (Zoom >= 16)
    function createLocalizadaMarker(latlng, feature) {
        const props = (feature && feature.properties) ? feature.properties : {};
        const cat = getLocalizadaCategory(props);
        const color = getFeatureColor(props, 'localizada');

        let customIcon;
        if (cat === 'poco') {
            const pvName = props.Name || 'PV';
            customIcon = L.divIcon({
                className: 'poco-leaflet-icon',
                html: `<div class="poco-esgoto-marker" style="background-color: ${color};" title="Poço de Esgoto: ${pvName} (${props.status || 'Não Iniciado'})"></div>`,
                iconSize: [8, 8],
                iconAnchor: [4, 4]
            });
        } else if (cat === 'no') {
            const noName = props.Name || 'Nó';
            customIcon = L.divIcon({
                className: 'no-leaflet-icon',
                html: `<div class="no-rede-marker" style="background-color: ${color};" title="Nó de Rede: ${noName}"></div>`,
                iconSize: [6, 6],
                iconAnchor: [3, 3]
            });
        } else {
            // Grandes Instalações
            let faIcon = 'fa-industry';
            const seg = (props.segmento || '').toUpperCase();
            if (seg.includes('RESERVAT')) faIcon = 'fa-water';
            else if (seg.includes('POÇO') || seg.includes('POCO')) faIcon = 'fa-droplet';
            else if (seg.includes('BOOSTER') || seg.includes('EEAT')) faIcon = 'fa-bolt';
            else if (seg.includes('ETA')) faIcon = 'fa-filter';

            customIcon = L.divIcon({
                className: 'pulsing-marker',
                html: `
                    <div class="pulsing-marker-ring" style="background: ${color}55;"></div>
                    <div class="pulsing-marker-icon" style="background: ${color};">
                        <i class="fas ${faIcon}"></i>
                    </div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });
        }

        const marker = L.marker(latlng, { icon: customIcon });
        marker.bindPopup(function() {
            if (window.GIS_EDITOR && typeof window.GIS_EDITOR.setActiveFeature === 'function') {
                window.GIS_EDITOR.setActiveFeature('localizada', feature, marker);
            }
            return createLocalizadaPopup(props);
        });
        marker.on('click', function() {
            if (window.GIS_EDITOR && typeof window.GIS_EDITOR.setActiveFeature === 'function') {
                window.GIS_EDITOR.setActiveFeature('localizada', feature, marker);
            }
        });
        return marker;
    }

    const createEEEMarker = createLocalizadaMarker; // Retrocompatibilidade

    // Styles for Áreas de Expansão (Frentes de Obra - Camada AE)
    function styleAreas(feature) {
        const props = (feature && feature.properties) ? feature.properties : {};
        if (currentLegendMode === 'escopo') {
            return {
                fillColor: '#0284c7',
                fillOpacity: 0.25,
                color: '#0284c7',
                weight: 2.2,
                dashArray: ''
            };
        }
        const st = (props.status || 'NÃO INICIADO').trim().toUpperCase();
        let color = '#f59e0b'; // Amber / Não Iniciado
        if (st.includes('CONCLU') || st.includes('EXECUTAD')) {
            color = '#10b981'; // Green / Concluído
        } else if (st.includes('INICIADO')) {
            color = '#0284c7'; // Blue / Iniciado
        }
        return {
            fillColor: color,
            fillOpacity: 0.32,
            color: color,
            weight: 2.2,
            dashArray: ''
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

    function formatPopupDate(val) {
        if (!val || val === 'NaT' || val === '-' || val === 'null') return '-';
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
            const parts = val.split('-');
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return val;
    }

    // Popups HTML Builders
    function createAreasPopup(props) {
        const isEditor = window.GIS_AUTH && typeof window.GIS_AUTH.isEditor === 'function' && window.GIS_AUTH.isEditor();
        const frente = props.frente || props.bairro || 'Frente de Obra';
        const mun = props.nm_mun || '-';
        const st = (props.status || 'NÃO INICIADO').trim().toUpperCase();
        let stClass = 'nao-iniciado';
        let stLabel = 'Não Iniciado';
        if (st.includes('CONCLU') || st.includes('EXECUTAD')) {
            stClass = 'concluido';
            stLabel = 'Concluído';
        } else if (st.includes('INICIADO')) {
            stClass = 'iniciado';
            stLabel = 'Iniciado';
        }
        const econ = props.economias ? `${props.economias} economias` : (props.qtd_domici ? `${props.qtd_domici} dom.` : 'Não informado');
        const extStr = props.ext_linear_m > 0 ? `${props.ext_linear_m.toLocaleString('pt-BR')} m (${props.trechos_linear} trechos)` : null;
        const locStr = props.pontos_local > 0 ? `${props.pontos_local} pontos (${props.eees_count} EEEs)` : null;

        return `
            <div class="popup-header" style="background: linear-gradient(135deg, #1e293b, #0f172a); border-bottom: 2px solid ${props.cor || '#0284c7'};">
                <div class="popup-category" style="color: #38bdf8;"><i class="fas fa-hard-hat"></i> Frente de Obra — Camada AE</div>
                <div class="popup-title" style="color: #ffffff; font-size: 1rem;">${frente}</div>
            </div>
            <div class="popup-body">
                <div class="popup-row"><span class="popup-key">Município:</span><span class="popup-val"><strong>${mun}</strong></span></div>
                <div class="popup-row"><span class="popup-key">Status da Frente:</span><span class="popup-val"><span class="popup-badge ${stClass}">${stLabel}</span></span></div>
                <div class="popup-row"><span class="popup-key">Economias Previstas:</span><span class="popup-val" style="color:#38bdf8; font-weight:800;">${econ}</span></div>
                ${extStr ? `<div class="popup-row"><span class="popup-key">Rede Mapeada:</span><span class="popup-val" style="color:#10b981; font-weight:800;">${extStr}</span></div>` : ''}
                ${locStr ? `<div class="popup-row"><span class="popup-key">Obras Localizadas:</span><span class="popup-val" style="color:#f59e0b; font-weight:800;">${locStr}</span></div>` : ''}
                <div class="popup-row"><span class="popup-key">Recorte:</span><span class="popup-val">${props.recorte || 'Formal'}</span></div>
                <div class="popup-row"><span class="popup-key">Produto / Projeto:</span><span class="popup-val">${props.produto || 'Esgoto'} (${props.projeto || 'Executivo'})</span></div>
                ${props.eee && props.eee !== 'NÃO' ? `<div class="popup-row"><span class="popup-key">Estação Elevatória:</span><span class="popup-val" style="color:#f59e0b; font-weight:700;"><i class="fas fa-industry"></i> Prevista (${props.eee})</span></div>` : ''}
                ${props.obs ? `<div class="popup-row" style="flex-direction:column; gap:4px;"><span class="popup-key">Observações:</span><span class="popup-val" style="text-align:left; font-style:italic; font-size:0.75rem; color:#cbd5e1;">${props.obs}</span></div>` : ''}
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-dark);">
                    <button type="button" style="width:100%; background: #0284c7; color:#fff; border:none; border-radius:6px; padding:6px 10px; font-size:0.75rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow: 0 2px 6px rgba(2,132,199,0.3);" onclick="if(window.selectBairro) window.selectBairro('${frente}', false);">
                        <i class="fas fa-crosshairs"></i> Centralizar e Filtrar Frente (${frente})
                    </button>
                </div>
                ${isEditor ? `
                <div style="margin-top: 6px;">
                    <button type="button" class="btn-popup-edit" style="width:100%; background: linear-gradient(135deg, #f59e0b, #d97706); color:#1e201d; border:none; border-radius:6px; padding:7px 10px; font-size:0.75rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow: 0 2px 8px rgba(245,158,11,0.35); transition:all 0.2s;" onclick="if(window.GIS_EDITOR) window.GIS_EDITOR.openModal();">
                        <i class="fas fa-edit"></i> Editar Atributos da Feição
                    </button>
                </div>` : ''}
            </div>
        `;
    }

    function createLinearPopup(props) {
        const ext = parseFloat(props.ext_calcul || 0).toFixed(2);
        const isEditor = window.GIS_AUTH && typeof window.GIS_AUTH.isEditor === 'function' && window.GIS_AUTH.isEditor();
        let custoRowHtml = '';
        if (window.GIS_CUSTOS_HELPER && typeof window.GIS_CUSTOS_HELPER.getPrecoMetro === 'function') {
            const preco = window.GIS_CUSTOS_HELPER.getPrecoMetro(props.segmento, props.dn_nominal);
            if (preco !== null) {
                const totalCusto = (parseFloat(props.ext_calcul || 0) * preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                custoRowHtml = `
                    <div class="popup-row"><span class="popup-key">Preço Unitário:</span><span class="popup-val" style="color:#10b981; font-weight:700;">R$ ${preco.toFixed(2)} / m</span></div>
                    <div class="popup-row"><span class="popup-key">Custo Estimado Trecho:</span><span class="popup-val" style="color:#10b981; font-weight:800;">${totalCusto}</span></div>
                `;
            }
        }
        return `
            <div class="popup-header" style="background: linear-gradient(135deg, #383a35, #919389);">
                <div class="popup-category">${props.segmento || 'REDE COLETORA'} (${props.produto || 'ESGOTO'})</div>
                <div class="popup-title">${props.bairro || props.nm_mun || 'Trecho de Rede'}</div>
            </div>
            <div class="popup-body">
                <div class="popup-row"><span class="popup-key">FID / ID:</span><span class="popup-val">#${props.fid || '-'}</span></div>
                <div class="popup-row"><span class="popup-key">Município:</span><span class="popup-val">${props.nm_mun || '-'}</span></div>
                <div class="popup-row"><span class="popup-key">Extensão Calculada:</span><span class="popup-val" style="color:#10b981; font-weight:800;">${ext} m</span></div>
                ${custoRowHtml}
                <div class="popup-row"><span class="popup-key">Material / DN:</span><span class="popup-val">${props.material || '-'} DN ${props.dn_nominal || '-'} mm</span></div>
                <div class="popup-row"><span class="popup-key">Profundidade Média:</span><span class="popup-val">${props.prof_media || '-'} m</span></div>
                <div class="popup-row"><span class="popup-key">Método Construtivo:</span><span class="popup-val">${props.met_constr || 'VCA'}</span></div>
                <div class="popup-row"><span class="popup-key">Status Obra:</span><span class="popup-val"><span class="popup-badge ${(props.status || '').toLowerCase().replace(/ /g, '-')}">${props.status || '-'}</span></span></div>
                <div class="popup-row"><span class="popup-key">Modalidade:</span><span class="popup-val">${props.modalidade || '-'}</span></div>
                <div class="popup-row"><span class="popup-key">Datas Previstas:</span><span class="popup-val">${props.inicio_p || '-'} à ${props.termino_p || '-'}</span></div>
                <div class="popup-row"><span class="popup-key">Início Real / Fim Real:</span><span class="popup-val" style="color:#38bdf8; font-weight:700;">${formatPopupDate(props.inicio_r)} à ${formatPopupDate(props.termino_r)}</span></div>
                ${props.bairro ? `
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-dark);">
                    <button type="button" style="width:100%; background: #0284c7; color:#fff; border:none; border-radius:6px; padding:6px 10px; font-size:0.75rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow: 0 2px 6px rgba(2,132,199,0.3);" onclick="if(window.selectBairro) window.selectBairro('${props.bairro}', false);">
                        <i class="fas fa-crosshairs"></i> Centralizar Frente (${props.bairro})
                    </button>
                </div>` : ''}
                ${isEditor ? `
                <div style="margin-top: 6px;">
                    <button type="button" class="btn-popup-edit" style="width:100%; background: linear-gradient(135deg, #f59e0b, #d97706); color:#1e201d; border:none; border-radius:6px; padding:7px 10px; font-size:0.75rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow: 0 2px 8px rgba(245,158,11,0.35); transition:all 0.2s;" onclick="if(window.GIS_EDITOR) window.GIS_EDITOR.openModal();">
                        <i class="fas fa-edit"></i> Editar Atributos da Feição
                    </button>
                </div>` : ''}
            </div>
        `;
    }

    function createLocalizadaPopup(props) {
        const isEditor = window.GIS_AUTH && typeof window.GIS_AUTH.isEditor === 'function' && window.GIS_AUTH.isEditor();
        const cat = getLocalizadaCategory(props);

        if (cat === 'poco') {
            const pvName = props.Name || 'Poço de Visita (PV)';
            const prof = (props.prof_poco !== null && props.prof_poco !== undefined && props.prof_poco !== '') ? `${props.prof_poco} m` : '-';
            const rim = (props.RimElevati !== null && props.RimElevati !== undefined && props.RimElevati !== '') ? `${props.RimElevati} m` : '-';
            const sump = (props.SumpElevat !== null && props.SumpElevat !== undefined && props.SumpElevat !== '') ? `${Number(props.SumpElevat).toFixed(2)} m` : '-';
            const statusBadgeClass = (props.status || 'não-iniciado').toLowerCase().replace(/ /g, '-').replace(/ã/g, 'a').replace(/õ/g, 'o');

            return `
                <div class="popup-header" style="background: linear-gradient(135deg, #059669, #064e3b);">
                    <div class="popup-category"><i class="fas fa-circle-dot"></i> Poço de Visita (PV) / Esgoto</div>
                    <div class="popup-title">${pvName}</div>
                </div>
                <div class="popup-body">
                    <div class="popup-row"><span class="popup-key">Identificação:</span><span class="popup-val" style="color:#10b981; font-weight:800;">${pvName}</span></div>
                    <div class="popup-row"><span class="popup-key">Profundidade:</span><span class="popup-val" style="color:#38bdf8; font-weight:800;">${prof}</span></div>
                    <div class="popup-row"><span class="popup-key">Cota Tampão:</span><span class="popup-val">${rim}</span></div>
                    <div class="popup-row"><span class="popup-key">Cota Fundo:</span><span class="popup-val">${sump}</span></div>
                    <div class="popup-row"><span class="popup-key">Frente / Bairro:</span><span class="popup-val">${props.bairro || '-'}</span></div>
                    <div class="popup-row"><span class="popup-key">Município:</span><span class="popup-val">${props.nm_mun || '-'}</span></div>
                    <div class="popup-row"><span class="popup-key">Status Obra:</span><span class="popup-val"><span class="popup-badge ${statusBadgeClass}">${props.status || 'NÃO INICIADO'}</span></span></div>
                    ${props.material_p ? `<div class="popup-row"><span class="popup-key">Material:</span><span class="popup-val">${props.material_p}</span></div>` : ''}
                    ${props.bairro ? `
                    <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-dark);">
                        <button type="button" style="width:100%; background: #0284c7; color:#fff; border:none; border-radius:6px; padding:6px 10px; font-size:0.75rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow: 0 2px 6px rgba(2,132,199,0.3);" onclick="if(window.selectBairro) window.selectBairro('${props.bairro}', false);">
                            <i class="fas fa-crosshairs"></i> Centralizar Frente (${props.bairro})
                        </button>
                    </div>` : ''}
                    ${isEditor ? `
                    <div style="margin-top: 6px;">
                        <button type="button" class="btn-popup-edit" style="width:100%; background: linear-gradient(135deg, #f59e0b, #d97706); color:#1e201d; border:none; border-radius:6px; padding:7px 10px; font-size:0.75rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow: 0 2px 8px rgba(245,158,11,0.35); transition:all 0.2s;" onclick="if(window.GIS_EDITOR) window.GIS_EDITOR.openModal();">
                            <i class="fas fa-edit"></i> Editar Atributos da Feição
                        </button>
                    </div>` : ''}
                </div>
            `;
        } else if (cat === 'no') {
            const noName = props.Name || 'Nó de Rede';
            const rim = (props.RimElevati !== null && props.RimElevati !== undefined && props.RimElevati !== '') ? `${props.RimElevati} m` : '-';
            const statusBadgeClass = (props.status || 'não-iniciado').toLowerCase().replace(/ /g, '-').replace(/ã/g, 'a').replace(/õ/g, 'o');

            return `
                <div class="popup-header" style="background: linear-gradient(135deg, #0284c7, #1e293b);">
                    <div class="popup-category"><i class="fas fa-share-nodes"></i> Ponto de Conexão / Nó de Rede</div>
                    <div class="popup-title">${noName}</div>
                </div>
                <div class="popup-body">
                    <div class="popup-row"><span class="popup-key">Identificação:</span><span class="popup-val" style="color:#38bdf8; font-weight:800;">${noName}</span></div>
                    <div class="popup-row"><span class="popup-key">Cota Terreno:</span><span class="popup-val">${rim}</span></div>
                    <div class="popup-row"><span class="popup-key">Produto / Sistema:</span><span class="popup-val">${props.produto || 'ESGOTO'}</span></div>
                    <div class="popup-row"><span class="popup-key">Frente / Bairro:</span><span class="popup-val">${props.bairro || '-'}</span></div>
                    <div class="popup-row"><span class="popup-key">Município:</span><span class="popup-val">${props.nm_mun || '-'}</span></div>
                    <div class="popup-row"><span class="popup-key">Status Obra:</span><span class="popup-val"><span class="popup-badge ${statusBadgeClass}">${props.status || 'NÃO INICIADO'}</span></span></div>
                    ${props.bairro ? `
                    <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-dark);">
                        <button type="button" style="width:100%; background: #0284c7; color:#fff; border:none; border-radius:6px; padding:6px 10px; font-size:0.75rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow: 0 2px 6px rgba(2,132,199,0.3);" onclick="if(window.selectBairro) window.selectBairro('${props.bairro}', false);">
                            <i class="fas fa-crosshairs"></i> Centralizar Frente (${props.bairro})
                        </button>
                    </div>` : ''}
                    ${isEditor ? `
                    <div style="margin-top: 6px;">
                        <button type="button" class="btn-popup-edit" style="width:100%; background: linear-gradient(135deg, #f59e0b, #d97706); color:#1e201d; border:none; border-radius:6px; padding:7px 10px; font-size:0.75rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow: 0 2px 8px rgba(245,158,11,0.35); transition:all 0.2s;" onclick="if(window.GIS_EDITOR) window.GIS_EDITOR.openModal();">
                            <i class="fas fa-edit"></i> Editar Atributos da Feição
                        </button>
                    </div>` : ''}
                </div>
            `;
        }

        // Instalações Principais (EEE, EEAT, Reservatórios, etc.)
        return `
            <div class="popup-header" style="background: linear-gradient(135deg, #8b5cf6, #353733);">
                <div class="popup-category">Infraestrutura Localizada (${props.segmento || 'EEE'})</div>
                <div class="popup-title">${props.nome || props.bairro || 'Estação Elevatória de Esgoto'}</div>
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
                <div class="popup-row"><span class="popup-key">Início Real / Fim Real:</span><span class="popup-val" style="color:#38bdf8; font-weight:700;">${formatPopupDate(props.inicio_r)} à ${formatPopupDate(props.termino_r)}</span></div>
                ${props.bairro ? `
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-dark);">
                    <button type="button" style="width:100%; background: #0284c7; color:#fff; border:none; border-radius:6px; padding:6px 10px; font-size:0.75rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow: 0 2px 6px rgba(2,132,199,0.3);" onclick="if(window.selectBairro) window.selectBairro('${props.bairro}', false);">
                        <i class="fas fa-crosshairs"></i> Centralizar Frente (${props.bairro})
                    </button>
                </div>` : ''}
                ${isEditor ? `
                <div style="margin-top: 6px;">
                    <button type="button" class="btn-popup-edit" style="width:100%; background: linear-gradient(135deg, #f59e0b, #d97706); color:#1e201d; border:none; border-radius:6px; padding:7px 10px; font-size:0.75rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow: 0 2px 8px rgba(245,158,11,0.35); transition:all 0.2s;" onclick="if(window.GIS_EDITOR) window.GIS_EDITOR.openModal();">
                        <i class="fas fa-edit"></i> Editar Atributos da Feição
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
                { label: 'Estação Elevatória (EEE)', color: '#919389', type: 'circle' },
                { label: 'Poço de Esgoto (PV) [Zoom ≥ 16]', color: '#10b981', type: 'poco' },
                { label: 'Nó de Rede [Zoom ≥ 16]', color: '#94a3b8', type: 'no' }
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
            } else if (item.type === 'poco') {
                symbolHtml = `<div class="poco-esgoto-marker" style="background:${item.color}; display:inline-block; vertical-align:middle; margin-right:6px;"></div>`;
            } else if (item.type === 'no') {
                symbolHtml = `<div class="no-rede-marker" style="background:${item.color}; display:inline-block; vertical-align:middle; margin-right:6px;"></div>`;
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
                const props = layer.feature.properties;
                const color = getFeatureColor(props, 'localizada');
                const el = (typeof layer.getElement === 'function') ? layer.getElement() : null;
                if (el) {
                    const ring = el.querySelector('.pulsing-marker-ring');
                    const icon = el.querySelector('.pulsing-marker-icon');
                    if (ring) ring.style.background = color + '55';
                    if (icon) icon.style.background = color;

                    const pocoEl = el.querySelector('.poco-esgoto-marker');
                    if (pocoEl) pocoEl.style.backgroundColor = color;

                    const noEl = el.querySelector('.no-rede-marker');
                    if (noEl) noEl.style.backgroundColor = color;
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
            iconSize: [90, 26],
            iconAnchor: [45, 5]
        });

        const marker = L.marker([bairro.lat, bairro.lng], {
            icon: customIcon,
            zIndexOffset: 500
        });

        marker.bindTooltip(`<strong>${bairro.nome}</strong><br><span style="font-size:0.75rem; opacity:0.85;">${bairro.municipio} • <span style="color:${bairro.cor}; font-weight:700;">${bairro.statusLabel}</span></span>`, {
            direction: 'top',
            offset: [0, -10],
            className: 'ae-frente-tooltip'
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

        // Atualizar classes responsivas de zoom no elemento do mapa para dimensionamento escalável dos ícones
        const mapEl = map.getContainer();
        if (mapEl) {
            mapEl.classList.remove('map-zoom-ultralow', 'map-zoom-low', 'map-zoom-mid', 'map-zoom-high');
            if (currentZoom <= 9) {
                mapEl.classList.add('map-zoom-ultralow');
            } else if (currentZoom <= 10) {
                mapEl.classList.add('map-zoom-low');
            } else if (currentZoom <= 12) {
                mapEl.classList.add('map-zoom-mid');
            } else {
                mapEl.classList.add('map-zoom-high');
            }
            mapEl.classList.toggle('map-zoom-ae-labels', currentZoom >= MIN_ZOOM_LOCALIZADA);
        }

        // 1. Obras Localizadas:
        // - Instalações Principais (EEE, EEAT, Reservatórios, etc.): visíveis em zoom aproximado (>= 13)
        // - Poços de Esgoto e Nós de Rede: micro-marcadores visíveis APENAS em zoom alto (>= 16)
        if (layerGroupLocalizadaMajor) {
            const shouldBeVisibleMajor = isLocalizadaEnabled && (currentZoom >= MIN_ZOOM_LOCALIZADA);
            if (shouldBeVisibleMajor) {
                if (!map.hasLayer(layerGroupLocalizadaMajor)) {
                    map.addLayer(layerGroupLocalizadaMajor);
                }
            } else {
                if (map.hasLayer(layerGroupLocalizadaMajor)) {
                    map.removeLayer(layerGroupLocalizadaMajor);
                }
            }
        }

        if (layerGroupLocalizadaDetalhe) {
            const shouldBeVisibleDetalhe = isLocalizadaEnabled && (currentZoom >= MIN_ZOOM_POCOS_NOS);
            if (shouldBeVisibleDetalhe) {
                if (!map.hasLayer(layerGroupLocalizadaDetalhe)) {
                    map.addLayer(layerGroupLocalizadaDetalhe);
                }
            } else {
                if (map.hasLayer(layerGroupLocalizadaDetalhe)) {
                    map.removeLayer(layerGroupLocalizadaDetalhe);
                }
            }
        }
        updateLocalizadaMarkers();

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
                    const p = feature.properties || {};
                    const fNome = p.frente || p.bairro || 'Frente de Obra';
                    const munNome = p.nm_mun || '';
                    const stRaw = (p.status || 'NÃO INICIADO').trim().toUpperCase();
                    let stColor = '#f59e0b';
                    let stLabel = 'Não Iniciado';
                    if (stRaw.includes('CONCLU') || stRaw.includes('EXECUTAD')) {
                        stColor = '#10b981';
                        stLabel = 'Concluído';
                    } else if (stRaw.includes('INICIADO') && !stRaw.includes('NÃO') && !stRaw.includes('NAO')) {
                        stColor = '#0284c7';
                        stLabel = 'Iniciado';
                    }

                    const labelHtml = `
                        <div class="ae-polygon-label-badge" style="border-top: 2px solid ${stColor};">
                            <span class="ae-polygon-label-name">${fNome}</span>
                            <span class="ae-polygon-label-sub">${munNome ? munNome + ' • ' : ''}<strong style="color:${stColor};">${stLabel}</strong></span>
                        </div>
                    `;

                    layer.bindTooltip(labelHtml, {
                        permanent: true,
                        direction: 'center',
                        className: 'ae-polygon-permanent-label'
                    });
                    layer.bindPopup(function() {
                        if (window.GIS_EDITOR && typeof window.GIS_EDITOR.setActiveFeature === 'function') {
                            window.GIS_EDITOR.setActiveFeature('areas', feature, layer);
                        }
                        return createAreasPopup(feature.properties);
                    });
                    layer.on('click', function(e) {
                        if (window.GIS_EDITOR && typeof window.GIS_EDITOR.setActiveFeature === 'function') {
                            window.GIS_EDITOR.setActiveFeature('areas', feature, layer);
                        }
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
                    layer.bindPopup(function() {
                        if (window.GIS_EDITOR && typeof window.GIS_EDITOR.setActiveFeature === 'function') {
                            window.GIS_EDITOR.setActiveFeature('linear', feature, layer);
                        }
                        return createLinearPopup(feature.properties);
                    });
                    layer.on('click', function(e) {
                        if (window.GIS_EDITOR && typeof window.GIS_EDITOR.setActiveFeature === 'function') {
                            window.GIS_EDITOR.setActiveFeature('linear', feature, layer);
                        }
                    });
                    layer.on('mouseover', function(e) {
                        e.target.setStyle({ weight: (e.target.options.weight || 3) + 2 });
                    });
                    layer.on('mouseout', function(e) {
                        layerGroupLinear.resetStyle(e.target);
                    });
                }
            }).addTo(map);

            // Separar camada localizada em:
            // 1. Instalações Principais (EEE, EEAT, Reservatório, ETA, Booster, Poço Profundo) - Zoom >= 13
            // 2. Detalhes de Rede (Poço de Esgoto e Nós de Rede) - Zoom >= 16 com micro-marcadores
            const majorFeatures = [];
            const detailFeatures = [];
            if (window.GIS_DATA && window.GIS_DATA.localizada && window.GIS_DATA.localizada.features) {
                window.GIS_DATA.localizada.features.forEach(f => {
                    if (getLocalizadaCategory(f.properties) === 'major') {
                        majorFeatures.push(f);
                    } else {
                        detailFeatures.push(f);
                    }
                });
            }

            layerGroupLocalizadaMajor = L.geoJSON({ type: "FeatureCollection", features: majorFeatures }, {
                pointToLayer: function(feature, latlng) {
                    return createLocalizadaMarker(latlng, feature);
                }
            });

            layerGroupLocalizadaDetalhe = L.geoJSON({ type: "FeatureCollection", features: detailFeatures }, {
                pointToLayer: function(feature, latlng) {
                    return createLocalizadaMarker(latlng, feature);
                }
            });

            // Interface unificada para manter total compatibilidade com os widgets e filtros existentes
            layerGroupLocalizada = {
                eachLayer: function(fn) {
                    if (layerGroupLocalizadaMajor) layerGroupLocalizadaMajor.eachLayer(fn);
                    if (layerGroupLocalizadaDetalhe) layerGroupLocalizadaDetalhe.eachLayer(fn);
                },
                clearLayers: function() {
                    if (layerGroupLocalizadaMajor) layerGroupLocalizadaMajor.clearLayers();
                    if (layerGroupLocalizadaDetalhe) layerGroupLocalizadaDetalhe.clearLayers();
                },
                addData: function(geojsonData) {
                    if (!geojsonData || !geojsonData.features) return;
                    const majors = [];
                    const details = [];
                    geojsonData.features.forEach(f => {
                        if (getLocalizadaCategory(f.properties) === 'major') {
                            majors.push(f);
                        } else {
                            details.push(f);
                        }
                    });
                    if (layerGroupLocalizadaMajor && majors.length > 0) {
                        layerGroupLocalizadaMajor.addData({ type: "FeatureCollection", features: majors });
                    }
                    if (layerGroupLocalizadaDetalhe && details.length > 0) {
                        layerGroupLocalizadaDetalhe.addData({ type: "FeatureCollection", features: details });
                    }
                }
            };

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
            } else if (layerName === 'localizada') {
                if (layerGroupLocalizadaMajor) {
                    layerGroupLocalizadaMajor.eachLayer(m => {
                        if (m.setOpacity) m.setOpacity(opacity);
                    });
                }
                if (layerGroupLocalizadaDetalhe) {
                    layerGroupLocalizadaDetalhe.eachLayer(m => {
                        if (m.setOpacity) m.setOpacity(opacity);
                    });
                }
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
        refreshStyles: function() {
            highlightBairro(currentHighlightedBairro);
            updateLocalizadaMarkers();
        },

        getLayerGroup: function(name) {
            if (name === 'municipios') return layerGroupMunicipios;
            if (name === 'areas') return layerGroupAreas;
            if (name === 'linear') return layerGroupLinear;
            if (name === 'localizada') return layerGroupLocalizada;
            if (name === 'localizada-major') return layerGroupLocalizadaMajor;
            if (name === 'localizada-detalhe') return layerGroupLocalizadaDetalhe;
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
        getLocalizadaCategory: getLocalizadaCategory,
        getMinZoomLocalizada: function() { return MIN_ZOOM_LOCALIZADA; },
        getMinZoomPocosNos: function() { return MIN_ZOOM_POCOS_NOS; },
        updateZoomVisibility: updateZoomVisibility,
        updateLocalizadaZoomVisibility: updateZoomVisibility,
        getBairroCentroids: function() { return BAIRRO_CENTROIDS; }
    };
})();
