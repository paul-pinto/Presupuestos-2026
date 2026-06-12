# SIGEP Presupuestos Bolivia 2026

Pipeline en Python para descargar, organizar, parsear y auditar presupuestos institucionales municipales y departamentales publicados en SIGEP Bolivia para la gestión 2026.

El proyecto trabaja con reportes PDF generados desde SIGEP, extrae información presupuestaria estructurada y valida los montos parseados contra el valor oficial de `TOTAL GENERAL`.

Deploy del Proyecto:

https://paul-pinto-presupuestos-2026-app-neflqq.streamlit.app/

---

## Objetivo

El objetivo principal de este repositorio es construir una base de datos limpia, reproducible y auditable a partir de reportes presupuestarios de entidades públicas bolivianas.

El flujo cubre cuatro etapas principales:

1. Preparar un catálogo de entidades SIGEP.
2. Descargar los PDFs presupuestarios por entidad.
3. Parsear los PDFs text-based y convertirlos a formatos tabulares.
4. Auditar avance, cobertura y consistencia de totales.

---

## Estructura del proyecto

```text
sigep_presupuestos_clean/
  config/
    entidades_sigep.csv
    batches/

  scripts/
    scrape_sigep.py
    parse_categoria.py
    make_batches.py
    audit_sigep.py

  data/
    raw/
    parsed/
    logs/
    debug/

  requirements.txt
  README.md
```

## Descripción de carpetas

| Ruta | Descripción |
|---|---|
| `config/` | Archivos de configuración e insumos manuales del proyecto. |
| `config/entidades_sigep.csv` | Catálogo principal de entidades a procesar. |
| `config/batches/` | Lotes generados automáticamente para procesar entidades en grupos. |
| `scripts/` | Scripts principales del pipeline. |
| `data/raw/` | PDFs descargados desde SIGEP. |
| `data/parsed/` | Archivos estructurados generados a partir de los PDFs. |
| `data/logs/` | Logs de ejecución, errores y auditoría. |
| `data/debug/` | Archivos auxiliares para depuración. |
| `requirements.txt` | Dependencias Python necesarias para ejecutar el proyecto. |

---

## Requisitos

Se recomienda usar Python 3.10 o superior.

Dependencias principales:

- `pandas`
- `duckdb`
- `playwright`
- `pdfplumber`
- `pyarrow`
- `openpyxl`

Todas las dependencias necesarias deben estar listadas en `requirements.txt`.

Además, el scraper usa Chromium mediante Playwright.

---

## Instalación

Desde la carpeta raíz del proyecto:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
playwright install chromium
```

Para verificar que el entorno quedó correctamente instalado:

```powershell
python --version
pip list
```

---

## Archivo de entrada

El pipeline espera un catálogo de entidades en:

```text
config/entidades_sigep.csv
```

El archivo debe tener las siguientes columnas:

```csv
codigo_entidad,nombre_entidad,tipo,departamento,sigla
1805,Gobierno Autónomo Municipal de Puerto Guayaramerín,municipal,Beni,PGU
```

## Columnas esperadas

| Columna | Descripción |
|---|---|
| `codigo_entidad` | Código SIGEP de la entidad. |
| `nombre_entidad` | Nombre oficial o normalizado de la entidad. |
| `tipo` | Tipo de entidad, por ejemplo `municipal` o `departamental`. |
| `departamento` | Departamento al que pertenece la entidad. |
| `sigla` | Sigla corta usada para identificación interna. |

Ejemplo:

```csv
codigo_entidad,nombre_entidad,tipo,departamento,sigla
1805,Gobierno Autónomo Municipal de Puerto Guayaramerín,municipal,Beni,PGU
0901,Gobierno Autónomo Departamental de La Paz,departamental,La Paz,GADLP
```

---

## Flujo general de uso

El pipeline completo se ejecuta en este orden:

```text
1. Preparar config/entidades_sigep.csv
2. Generar lotes con make_batches.py
3. Descargar PDFs con scrape_sigep.py
4. Parsear PDFs con parse_categoria.py
5. Auditar resultados con audit_sigep.py
```

---

## 1. Generar lotes de entidades

Para evitar procesar muchas entidades en una sola ejecución, el proyecto permite dividir el catálogo en lotes.

Prueba con 10 entidades:

```powershell
python scripts/make_batches.py --input config/entidades_sigep.csv --size 10 --out config/batches
```

Esto genera archivos similares a:

```text
config/batches/entidades_lote_01.csv
config/batches/entidades_lote_02.csv
...
```

Para procesamiento completo, se recomienda usar lotes de 50 entidades:

```powershell
python scripts/make_batches.py --input config/entidades_sigep.csv --size 50 --out config/batches
```

---

## 2. Descargar PDFs desde SIGEP

Una vez generados los lotes, puedes descargar los PDFs de un lote específico.

Durante pruebas se recomienda usar `--headful` para ver el navegador y detectar problemas de navegación, cambios de interfaz, sesiones, bloqueos o errores de descarga.

```powershell
python scripts/scrape_sigep.py --entities config/batches/entidades_lote_01.csv --headful
```

Cuando el flujo ya sea estable, puedes quitar `--headful`:

```powershell
python scripts/scrape_sigep.py --entities config/batches/entidades_lote_01.csv
```

Los PDFs descargados se almacenan en:

```text
data/raw/
```

---

## 3. Parsear PDFs

Después de descargar los reportes, ejecuta el parser:

```powershell
python scripts/parse_categoria.py
```

Este script lee los PDFs desde:

```text
data/raw/
```

y genera archivos estructurados en:

```text
data/parsed/
```

## Outputs generados

```text
data/parsed/sigep_2026_categoria_programatica_grupo_gasto_total_gastos.csv
data/parsed/sigep_2026_categoria_programatica_grupo_gasto_total_gastos.parquet
data/parsed/sigep_2026_categoria_programatica_grupo_gasto_total_gastos_totales.csv
```

## Descripción de outputs

| Archivo | Descripción |
|---|---|
| `*.csv` | Dataset principal en formato CSV. |
| `*.parquet` | Dataset principal en formato Parquet, recomendado para análisis eficiente. |
| `*_totales.csv` | Resumen de totales parseados y validaciones contra `TOTAL GENERAL`. |

---

## 4. Auditar avance y consistencia

Para revisar qué entidades fueron descargadas, parseadas o presentan errores:

```powershell
python scripts/audit_sigep.py --entities config/entidades_sigep.csv
```

La auditoría permite detectar:

- entidades sin PDF descargado;
- PDFs descargados pero no parseados;
- errores de parsing;
- diferencias contra `TOTAL GENERAL`;
- cobertura por departamento o tipo de entidad;
- avance general del pipeline.

---

## Regla de niveles presupuestarios

Los reportes SIGEP pueden contener filas de resumen y filas de detalle. Para evitar doble conteo, el pipeline marca explícitamente los niveles.

La regla usada es:

```text
resumen_programa = proyecto == "0" AND actividad == "000"
detalle          = todo lo demás
```

En términos prácticos:

```python
df_resumen = df[df["es_resumen_programa"]]
df_detalle = df[~df["es_resumen_programa"]]
```

Para análisis agregados de gasto, normalmente debes usar solamente `df_detalle`:

```python
df_detalle = df[~df["es_resumen_programa"]]
```

Esto evita sumar dos veces montos que ya están contenidos en niveles superiores.

---

## Validación contra TOTAL GENERAL

Una parte crítica del pipeline es validar que la suma de los montos extraídos coincida con el `TOTAL GENERAL` reportado en el PDF.

El parser genera un archivo de totales que permite revisar diferencias por entidad.

Ejemplo:

```python
import pandas as pd

totales = pd.read_csv(
    "data/parsed/sigep_2026_categoria_programatica_grupo_gasto_total_gastos_totales.csv"
)

totales.sort_values("diferencia_abs", ascending=False).head(20)
```

Las diferencias pueden aparecer por varias razones:

- PDFs con estructura distinta;
- líneas partidas en varias páginas;
- cambios de formato en SIGEP;
- errores de extracción textual;
- entidades sin información completa;
- montos de resumen mezclados con detalle.

---

## Ejemplo de análisis con Pandas

```python
import pandas as pd

df = pd.read_parquet(
    "data/parsed/sigep_2026_categoria_programatica_grupo_gasto_total_gastos.parquet"
)

df_detalle = df[~df["es_resumen_programa"]]

gasto_por_departamento = (
    df_detalle
    .groupby("departamento", as_index=False)["monto"]
    .sum()
    .sort_values("monto", ascending=False)
)

print(gasto_por_departamento)
```

---

## Ejemplo de análisis con DuckDB

```python
import duckdb

query = """
SELECT
    departamento,
    SUM(monto) AS total_gasto
FROM 'data/parsed/sigep_2026_categoria_programatica_grupo_gasto_total_gastos.parquet'
WHERE es_resumen_programa = FALSE
GROUP BY departamento
ORDER BY total_gasto DESC
"""

df = duckdb.query(query).to_df()
print(df)
```

---

## Recomendaciones operativas

Para procesamiento estable:

1. Ejecuta primero un lote pequeño de 10 entidades.
2. Revisa manualmente algunos PDFs descargados.
3. Ejecuta el parser.
4. Revisa el archivo de totales.
5. Corrige errores de catálogo o parsing.
6. Recién después ejecuta lotes grandes.

Flujo recomendado:

```powershell
python scripts/make_batches.py --input config/entidades_sigep.csv --size 10 --out config/batches
python scripts/scrape_sigep.py --entities config/batches/entidades_lote_01.csv --headful
python scripts/parse_categoria.py
python scripts/audit_sigep.py --entities config/entidades_sigep.csv
```

---

## Problemas frecuentes

### Playwright no encuentra Chromium

Ejecuta:

```powershell
playwright install chromium
```

### El scraper abre el navegador pero no descarga nada

Posibles causas:

- cambió la interfaz de SIGEP;
- la entidad no tiene presupuesto disponible;
- hay un problema de sesión;
- la descarga está bloqueada;
- la ruta de descarga no existe;
- el lote tiene códigos incorrectos.

Ejecuta en modo visible:

```powershell
python scripts/scrape_sigep.py --entities config/batches/entidades_lote_01.csv --headful
```

### El parser no encuentra PDFs

Verifica que existan archivos en:

```text
data/raw/
```

También confirma que estás ejecutando el comando desde la raíz del proyecto.

### Diferencias contra TOTAL GENERAL

Revisa el archivo:

```text
data/parsed/sigep_2026_categoria_programatica_grupo_gasto_total_gastos_totales.csv
```

Ordena por diferencia absoluta para identificar casos problemáticos.

### Error ModuleNotFoundError

Instala dependencias:

```powershell
pip install -r requirements.txt
```

Si falta un paquete específico:

```powershell
pip install nombre_paquete
```

---

## Estado del proyecto

Este pipeline está orientado a extracción reproducible y auditable de presupuestos institucionales SIGEP 2026.

El foco está en:

- mantener trazabilidad desde PDF original hasta dataset final;
- evitar doble conteo;
- validar contra totales oficiales;
- facilitar análisis por entidad, departamento, tipo de entidad, categoría programática y grupo de gasto.

---

## Licencia

Licencia pendiente de definir.

---

## Autor

Proyecto desarrollado por Jhonny Paul Pinto Phillips para procesamiento y análisis de presupuestos institucionales SIGEP Bolivia 2026.
