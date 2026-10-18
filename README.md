# Universalização Sabesp - Lote 4 (Itapetininga)

Portal WebGIS interativo para acompanhamento de obras do **Lote 4 - Itapetininga** (Parceria Sabesp & Engeform Engenharia).

## 🌐 Link do WebGIS (GitHub Pages)

O WebGIS está publicado e acessível publicamente através do GitHub Pages:
🔗 **[https://inaetertuliano.github.io/Universaliza-o-Lote-4/](https://inaetertuliano.github.io/Universaliza-o-Lote-4/)**

---

## 🗺️ Funcionalidades do Portal

1. **Camadas Geográficas Interativas**:
   - **Áreas de Expansão (Polígonos)**: Delimitação dos recortes e bairros contemplados com estilização translúcida e borda demarcada.
   - **Obras Lineares (Redes)**: Redes coletoras e linhas de recalque classificadas por status (*Projetado*, *Em Execução*, *Concluído*).
   - **Obras Localizadas (EEE / Estações Elevatórias)**: Marcadores dinâmicos visíveis em zoom aproximado (≥ zoom 13).
   - **Rótulos dos Bairros com Centróides**: Identificação visual e automática no centróide de cada bairro em níveis de zoom regional (< zoom 13).

2. **Painel Visão Detalhada**:
   - Informações dinâmicas de obras lineares (extensão em metros e diâmetros) e obras localizadas (vazão, potência e altura manométrica).
   - Filtragem por **Frente de Obra** selecionada na lista suspensa.

3. **Painel Metas de Economias (Indicadores)**:
   - Resumo e detalhamento das metas de domicílios/economias por **Ano (2025, 2026, 2027, etc.)** e por **Recorte/Bairro**.
   - **Diagrama de Barras Comparativo** confrontando a **Meta Total de Economias** com os **Domicílios em Obras em Execução**.

---

## 📂 Estrutura de Arquivos

```text
Universaliza-o-Lote-4/
├── index.html                   # Página principal do WebGIS
├── css/
│   ├── style.css                # Estilos visuais do portal e painéis
│   └── styles.css               # Estilos complementares
├── js/
│   ├── app.js                   # Lógica principal da aplicação e mapa Leaflet
│   ├── data.js                  # Carregamento e cache dos dados espaciais
│   ├── layers.js                # Gestão das camadas vetoriais e centróides
│   ├── filters.js               # Filtros dinâmicos (Município, Bairro, Status)
│   ├── metas.js                 # Lógica dos quadros de metas e gráficos Chart.js
│   ├── metas_data.js            # Base estruturada das metas de economias
│   └── charts.js                # Funções de renderização de gráficos
├── data/
│   ├── areas_de_expansao.geojson # Delimitação das áreas/bairros
│   ├── camada_linear.geojson     # Redes de água e esgoto
│   ├── camada_localizada.geojson # EEEs e estruturas pontuais
│   ├── metas_economias.json     # Metas em formato JSON
│   └── metas_economias.xlsx     # Planilha de metas
├── planilhas/
│   ├── metas_economias.xlsx     # Planilha de acompanhamento de metas
│   ├── qtd_linear_agua_L4.xlsx  # Quantitativos lineares água Lote 4
│   └── qtd_linear_esgoto_L4.xlsx# Quantitativos lineares esgoto Lote 4
├── camadas/                     # Bancos de dados geográficos originais (GeoPackage e Shapefile)
│   ├── Acompanhamento Obras.gpkg
│   ├── Acompanhamento Obras 24-09-26.gpkg
│   ├── PACOTE DE FASE EXECUÇÃO_.gpkg
│   ├── Capão Bonito/
│   ├── Guareí/
│   └── Pilar do Sul/
└── img/
    └── engeform_logo.png        # Logomarca oficial Engeform
```

---

## 🚀 Como Executar Localmente

Caso queira executar em sua máquina local sem conexão à internet:
```bash
python -m http.server 8000
```
Em seguida, abra o navegador em `http://localhost:8000`.
