# Observatorio Fiscal y Presupuestario ETA Bolivia 2026

Observatorio público para explorar, comparar y auditar los presupuestos de las Entidades Territoriales Autónomas (ETA) de Bolivia para la gestión 2026.

El proyecto integra información presupuestaria SIGEP 2026, población del Censo 2024, indicadores fiscales, datos de Necesidades Básicas Insatisfechas, una estimación municipal de PIBpc 2021 y un indicador sintético de brecha bienestar-producto. Su objetivo es aportar evidencia territorial al debate sobre descentralización, autonomía fiscal, asignación de recursos y pacto fiscal en Bolivia.

## Sitio público

Producción:

```text
https://presupuestoseta.paulpinto.ia.bo/
```

Repositorio:

```text
https://github.com/paul-pinto/Presupuestos-2026
```

## Objetivo del proyecto

El objetivo principal es construir una base pública, reproducible y auditable para analizar presupuestos institucionales de las ETA bolivianas.

El observatorio permite:

- comparar presupuestos entre municipios, gobernaciones, autonomías indígena originario campesinas y entidades regionales;
- analizar gasto por programas, grupos de gasto y objeto del gasto;
- analizar ingresos por rubros, fuentes de financiamiento y organismos financiadores;
- medir dependencia fiscal, autonomía fiscal, coparticipación, IDH y regalías;
- comparar presupuesto per cápita usando población censal 2024;
- visualizar patrones territoriales mediante mapas municipales y departamentales;
- incorporar pobreza por Necesidades Básicas Insatisfechas 2024;
- incorporar PIBpc municipal estimado 2021;
- construir una lectura de brecha bienestar-producto útil para discutir pacto fiscal.

## Alcance

El proyecto trabaja con información presupuestaria institucional, no con ejecución presupuestaria.

Por tanto, los montos deben interpretarse como presupuestos registrados, aprobados o procesados desde las fuentes disponibles, no necesariamente como gasto ejecutado, devengado o pagado.

## Módulos del observatorio

| Módulo | Descripción |
|---|---|
| Resumen | Vista general de presupuestos, ingresos, gastos, programas e indicadores principales. |
| Entidades | Explorador de entidades territoriales por código, departamento, tipo y grupo ETA. |
| Gastos | Análisis de gasto por entidad, departamento, programa y grupo de gasto. |
| Ingresos | Análisis de recursos presupuestarios, rubros, fuentes y organismos financiadores. |
| Objeto del gasto | Explorador del clasificador de objeto del gasto por niveles y entidades. |
| Indicadores | Panel comparativo de indicadores fiscales, poblacionales y socioeconómicos. |
| Mapa | Atlas territorial interactivo municipal y departamental. |
| Brecha bienestar-producto | Indicador sintético entre PIBpc estimado y pobreza NBI. |
| Metodología | Documentación de fuentes, supuestos, cruces e indicadores. |
| Datos | Catálogo de archivos JSON y GeoJSON generados para el frontend. |
| Validación | Control de consistencia entre datos procesados y totales presupuestarios. |

## Fuentes principales

| Fuente | Uso dentro del proyecto |
|---|---|
| SIGEP Bolivia 2026 | Presupuesto institucional, ingresos, gastos, programas, rubros, fuentes, organismos financiadores y objeto del gasto. |
| INE Bolivia - Censo 2024 | Población municipal y datos de Necesidades Básicas Insatisfechas. |
| INE Bolivia - PIB departamental 2021 | Estructura departamental utilizada para benchmark de la estimación municipal de PIB. |
| Rossi-Hansberg y Zhang (2025) | Base espacial global de PIB local estimado en grillas. |
| WorldPop 2021 | Ponderador espacial poblacional para distribuir actividad económica entre municipios. |
| Capas geográficas municipales | Construcción de mapas municipales y agregaciones departamentales. |

## Arquitectura general

```text
SIGEP / INE / Geografía / PIB gridded / WorldPop
              ↓
        Scripts Python
              ↓
      Limpieza y homologación
              ↓
       Auditorías y validación
              ↓
      JSON / GeoJSON públicos
              ↓
       Frontend Next.js
              ↓
  Observatorio público en Vercel
```

## Estructura del proyecto

```text
Presupuestos Bolivia 2026/
  config/
    entidades_sigep.xlsx
    batches/

  data/
    raw/
    parsed/
    warehouse/
    manual/
    geografia/
    auditoria/

  Resultados/
    PIBpc_municipios_2021_benchmark_INE.csv
    PIBpc_municipios_2021_candidato_final_retro2021_340.csv
    audit_brecha_bienestar_producto.csv
    audit_pibpc_retro2021_candidate.csv

  scripts/
    scrape_sigep.py
    parse_categoria.py
    audit_sigep.py
    export_frontend_data.py
    export_frontend_detail_datasets.py
    export_indicadores_fiscales_frontend.py
    build_brecha_bienestar_producto.py
    integrar_brecha_bienestar_producto_frontend.py
    integrar_pibpc_retro2021_frontend.py

  frontend/
    src/
      app/
      components/
      lib/
    public/
      data/
      brand/
```

## Datasets públicos generados

El frontend consume principalmente archivos estáticos ubicados en:

```text
frontend/public/data/
```

Archivos principales:

| Archivo | Descripción |
|---|---|
| `summary.json` | Resumen general del observatorio. |
| `entidades.json` | Catálogo de entidades con presupuesto, población e indicadores integrados. |
| `departamentos.json` | Agregados departamentales. |
| `grupos_eta.json` | Agregados por grupo ETA. |
| `programas.json` | Programas presupuestarios completos. |
| `ingresos_vs_gastos.json` | Comparación de ingresos y gastos por entidad. |
| `recursos_detalle.json` | Detalle de ingresos por rubro. |
| `recursos_fuente_organismo.json` | Cruce de recursos por fuente y organismo financiador. |
| `objeto_gasto_detalle.json` | Detalle del objeto del gasto. |
| `objeto_gasto_catalogo.json` | Catálogo del clasificador de objeto del gasto. |
| `indicadores_fiscales.json` | Indicadores fiscales calculados por entidad. |
| `entidades_indicadores.json` | Población e indicadores territoriales integrados. |
| `nbi_municipios_2024.json` | Necesidades Básicas Insatisfechas 2024 por municipio/TIOC. |
| `pibpc_municipios_2021.json` | PIBpc municipal estimado 2021. |
| `brecha_bienestar_producto.json` | Indicador sintético de brecha bienestar-producto. |
| `municipios_presupuesto.geojson` | Capa municipal enriquecida para mapa. |
| `municipios_presupuesto_liviano.geojson` | Capa municipal optimizada para frontend. |
| `departamentos_presupuesto.geojson` | Capa departamental agregada. |
| `validacion_integrada.json` | Validación de consistencia por entidad. |

## Metodología presupuestaria

### Extracción y procesamiento SIGEP

El pipeline procesa reportes presupuestarios de SIGEP Bolivia para la gestión 2026.

El flujo general es:

```text
1. Preparar catálogo de entidades SIGEP.
2. Descargar reportes presupuestarios.
3. Parsear PDFs y tablas textuales.
4. Normalizar entidades, departamentos, rubros y clasificadores.
5. Validar montos contra totales oficiales.
6. Exportar datasets analíticos para el frontend.
```

### Validación contra totales

Una parte central del pipeline es validar que los montos procesados sean consistentes con los totales presupuestarios esperados.

El módulo de validación permite detectar:

- entidades sin información procesada;
- diferencias entre ingresos y gastos;
- errores de parsing;
- diferencias contra totales generales;
- problemas de homologación de entidad;
- cobertura por departamento, tipo y grupo ETA.

### Regla para evitar doble conteo

Los reportes presupuestarios pueden incluir filas de resumen y filas de detalle. Para evitar doble conteo, los análisis agregados utilizan niveles de detalle consistentes.

Regla operativa:

```text
resumen_programa = proyecto == "0" AND actividad == "000"
detalle          = todo lo demás
```

Para análisis agregados de gasto se priorizan filas de detalle cuando corresponde.

## Metodología de indicadores fiscales

Los indicadores fiscales se calculan sobre el total de ingresos presupuestados de cada entidad.

### Dependencia TGN

```text
Dependencia TGN = transferencias TGN / ingresos totales
```

### Coparticipación tributaria

```text
Coparticipación = coparticipación tributaria / ingresos totales
```

### IDH

```text
IDH = ingresos por IDH / ingresos totales
```

### Regalías

```text
Regalías = regalías / ingresos totales
```

### Autonomía fiscal estricta GAM/GAIOC

Para gobiernos autónomos municipales y autonomías indígena originario campesinas, la autonomía fiscal estricta se aproxima con recursos específicos de fuente 20 y organismo 210.

```text
Autonomía fiscal estricta GAM/GAIOC =
fuente 20 organismo 210 / ingresos totales
```

### Autonomía fiscal departamental

Para gobiernos autónomos departamentales se utiliza una lectura diferenciada, basada en rubros departamentales relevantes.

```text
Autonomía fiscal departamental =
rubros 12 + 13 + 15 + 16 + 21 / ingresos totales
```

Esta aproximación busca separar la lectura departamental de la municipal, porque las estructuras de ingresos y competencias no son equivalentes.

## Población y presupuesto per cápita

Para presupuesto per cápita se utiliza la población del Censo 2024.

```text
Presupuesto per cápita =
presupuesto total de la entidad / población censal 2024
```

Este indicador no mide gasto ejecutado por persona. Mide presupuesto institucional por habitante.

## Necesidades Básicas Insatisfechas 2024

El observatorio incorpora datos de pobreza por Necesidades Básicas Insatisfechas (NBI) del Censo 2024.

Se utilizan registros municipales y TIOC totales, evitando mezclar filas urbanas y rurales en el indicador principal.

```text
Pobreza NBI =
población pobre por NBI / población total del territorio
```

El indicador de NBI mide privaciones estructurales asociadas a vivienda, servicios básicos, educación, salud y condiciones de vida. No equivale a pobreza monetaria ni a ingreso de hogares.

## Metodología del PIB municipal estimado 2021

Bolivia no cuenta con una publicación oficial de PIB municipal comparable para todos los municipios. Por ello, el observatorio incorpora una estimación propia del PIB municipal 2021 mediante una metodología espacial y de benchmark departamental.

### Referencia académica

La base económica espacial utilizada se apoya en:

```text
Rossi-Hansberg, Esteban; Zhang, Jialing.
"Local GDP Estimates Around the World".
NBER Working Paper No. 33458.
National Bureau of Economic Research, 2025.
DOI: 10.3386/w33458.
```

El trabajo desarrolla una base global de PIB local estimado en grillas de alta resolución, incluyendo resolución de 0,25 grados, con cobertura anual desde 2012 en adelante.

### Variable utilizada

En el procesamiento se utilizó la variable:

```text
predicted_GCP_const_2017_USD
```

Esta variable representa el producto bruto de celda estimado en miles de millones de dólares constantes de 2017.

Para su uso en el observatorio, el valor fue convertido a dólares constantes de 2017 y asignado espacialmente a los polígonos municipales de Bolivia.

### Construcción espacial

La geometría de cada celda se interpretó tomando sus coordenadas de longitud y latitud como esquina inferior izquierda de una grilla de 0,25 grados.

A partir de ello se construyó el polígono de celda correspondiente:

```text
celda = [lon, lat, lon + 0.25, lat + 0.25]
```

Luego se calculó la intersección entre cada celda económica y los polígonos municipales.

### Ponderación con WorldPop 2021

Para distribuir el valor económico de celdas que intersectan más de un municipio, se utilizó población espacial WorldPop 2021 como ponderador territorial.

En términos prácticos:

```text
PIB asignado al municipio =
valor de celda × peso poblacional municipal dentro de la intersección
```

La población WorldPop se usa como ponderador espacial de distribución, no como denominador final del PIBpc público.

### Benchmark departamental INE 2021

Después de obtener una distribución municipal inicial, la estimación fue ajustada para respetar la estructura departamental del PIB 2021 publicada por el INE Bolivia.

El benchmark conserva:

- la distribución relativa entre municipios dentro de cada departamento;
- el total nacional estimado en dólares constantes de 2017;
- la estructura departamental oficial como referencia de participación relativa.

No se realiza una conversión mecánica de bolivianos a dólares desde medidas encadenadas. La estructura departamental INE se utiliza para normalizar participaciones departamentales.

```text
PIB municipal benchmark =
PIB municipal base × factor de ajuste departamental
```

### Población retrospectiva intercensal 2021

Para calcular PIBpc se evitó usar la población espacial del modelo como denominador final.

En su lugar, se construyó una población retrospectiva 2021 a partir del crecimiento intercensal entre el Censo 2012 y el Censo 2024.

```text
P2021 = P2012 × (P2024 / P2012) ^ (9 / 12)
```

La distancia temporal entre 2012 y 2024 es de doce años; 2021 se ubica nueve años después de 2012.

### PIBpc municipal estimado

El PIBpc municipal estimado se calcula como:

```text
PIBpc municipal 2021 =
PIB municipal benchmark 2021 / población retrospectiva 2021
```

El resultado se expresa en dólares constantes de 2017.

### Advertencia metodológica

El PIBpc municipal publicado por el observatorio es una estimación propia. No corresponde a un PIB municipal oficial publicado por el INE Bolivia.

Debe interpretarse como indicador exploratorio para comparación territorial, análisis espacial y discusión de pacto fiscal. No mide ingreso disponible de hogares, salarios, consumo ni bienestar directo.

## Brecha bienestar-producto

La brecha bienestar-producto es un indicador sintético diseñado para identificar tensiones entre actividad económica territorial estimada y condiciones sociales básicas.

Cruza:

```text
PIBpc municipal estimado 2021
+
Pobreza NBI 2024
```

La lectura principal es detectar territorios donde existe un producto por habitante relativamente alto, pero persisten niveles elevados de pobreza estructural.

### Score

```text
Score de brecha =
0,55 × componente NBI + 0,45 × componente PIBpc
```

El score está expresado en puntos de 0 a 100.

### Clasificación territorial

| Categoría | Interpretación |
|---|---|
| Producto alto con rezago social | PIBpc alto y NBI alto. Hay producto territorial estimado, pero bajo bienestar básico. |
| Producto medio con rezago social | PIBpc medio y NBI alto. Hay rezago social pese a actividad económica intermedia. |
| Rezago estructural | PIBpc bajo y NBI alto. Territorio con baja producción estimada y alta pobreza estructural. |
| Producto alto con mejor bienestar relativo | PIBpc alto y NBI medio/bajo. Mejor conversión relativa entre producto y condiciones sociales. |
| Bienestar relativo con producto medio | PIBpc medio y NBI bajo. Condiciones sociales relativamente mejores con producto medio. |
| Bajo producto, menor pobreza relativa | PIBpc bajo y NBI medio/bajo. Bajo producto estimado, pero menor pobreza relativa. |
| Situación intermedia | Casos sin patrón extremo. |
| Sin dato | Falta información suficiente para calcular el indicador. |

Una brecha alta no implica automáticamente error de datos. Puede reflejar economías territoriales concentradas, baja densidad poblacional, extracción de excedentes fuera del territorio, baja provisión de servicios o limitaciones propias de la estimación espacial.

## Instalación del entorno Python

Desde la raíz del proyecto:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
playwright install chromium
```

Verificación:

```powershell
python --version
pip list
```

## Instalación del frontend

```powershell
cd frontend
npm install
```

Ejecución local:

```powershell
npm run dev
```

Build de producción:

```powershell
npm run build
```

## Deploy

El frontend se despliega como aplicación Next.js en Vercel.

Dominio de producción:

```text
https://presupuestoseta.paulpinto.ia.bo/
```

Configuración esperada:

```text
Framework: Next.js
Root Directory: frontend
Build Command: npm run build
Output: Next.js default
```

## Contacto

Proyecto desarrollado por:

```text
Jhonny Paul Pinto Phillips
```

Contacto por WhatsApp:

```text
+1 585 667 0360
```

## Estado del proyecto

Versión pública inicial:

```text
v1.0.2
```

La versión 1.0.2 está orientada a publicación, consulta pública y discusión metodológica. El proyecto continuará incorporando mejoras en visualización, nuevos indicadores territoriales y módulos orientados a simulación de pacto fiscal.

## Licencia

El código fuente de este repositorio se publica bajo licencia MIT. Ver archivo `LICENSE`.

Los datos originales mantienen sus fuentes y condiciones institucionales correspondientes. Los datasets derivados deben citar este repositorio y las fuentes públicas utilizadas.
