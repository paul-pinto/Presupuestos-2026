from pathlib import Path

import duckdb


DB_PATH = Path("data/warehouse/sigep_2026.duckdb")
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

ENTIDADES_CSV = Path("config/entidades_sigep.csv")

# Fase 1
CAT_PARQUET = Path(
    "data/parsed/sigep_2026_categoria_programatica_grupo_gasto_total_gastos.parquet"
)
CAT_TOTALES_CSV = Path(
    "data/parsed/sigep_2026_categoria_programatica_grupo_gasto_total_gastos_totales.csv"
)
CAT_VALIDACION_CSV = Path(
    "data/parsed/sigep_2026_categoria_programatica_grupo_gasto_total_gastos_validacion.csv"
)

# Fase 2
REC_PARQUET = Path("data/parsed/sigep_2026_recursos_por_rubro.parquet")
REC_TOTALES_CSV = Path("data/parsed/sigep_2026_recursos_por_rubro_totales.csv")
REC_VALIDACION_CSV = Path("data/parsed/sigep_2026_recursos_por_rubro_validacion.csv")

# Fase 3
OBJ_PARQUET = Path(
    "data/parsed/sigep_2026_objeto_gasto_fuente_total_gastos.parquet"
)
OBJ_LARGO_PARQUET = Path(
    "data/parsed/sigep_2026_objeto_gasto_fuente_total_gastos_largo.parquet"
)
OBJ_TOTALES_CSV = Path(
    "data/parsed/sigep_2026_objeto_gasto_fuente_total_gastos_totales.csv"
)
OBJ_VALIDACION_CSV = Path(
    "data/parsed/sigep_2026_objeto_gasto_fuente_total_gastos_validacion.csv"
)


def require_file(path: Path):
    if not path.exists():
        raise SystemExit(f"[ERROR] No existe: {path}")


def main():
    required_files = [
        ENTIDADES_CSV,
        CAT_PARQUET,
        CAT_TOTALES_CSV,
        CAT_VALIDACION_CSV,
        REC_PARQUET,
        REC_TOTALES_CSV,
        REC_VALIDACION_CSV,
        OBJ_PARQUET,
        OBJ_LARGO_PARQUET,
        OBJ_TOTALES_CSV,
        OBJ_VALIDACION_CSV,
    ]

    for path in required_files:
        require_file(path)

    print(f"[+] Creando DuckDB en: {DB_PATH}")

    con = duckdb.connect(str(DB_PATH))

    # ------------------------------------------------------------
    # Limpieza idempotente
    # ------------------------------------------------------------
    views = [
        "mart_presupuesto_entidad",
        "mart_presupuesto_departamento",
        "mart_grupo_gasto_entidad",
        "mart_grupo_gasto_largo",
        "mart_top_programas",
        "mart_programas",
        "mart_subprogramas",
        "mart_validacion",
        "mart_resumen_nacional",
        "mart_recursos_entidad",
        "mart_recursos_rubro_nivel1",
        "mart_recursos_detalle",
        "mart_ingresos_vs_gastos",
        "mart_objeto_gasto_entidad",
        "mart_objeto_gasto_nivel1",
        "mart_objeto_gasto_detalle",
        "mart_objeto_fuente_largo",
        "mart_objeto_fuente_entidad",
        "mart_validacion_integrada",
    ]

    for view in views:
        con.execute(f"DROP VIEW IF EXISTS {view}")

    tables = [
        "fact_categoria_grupo",
        "dim_entidad",
        "fact_totales_pdf",
        "fact_validacion",
        "fact_recursos_rubro",
        "fact_recursos_rubro_totales",
        "fact_recursos_rubro_validacion",
        "fact_objeto_gasto_fuente",
        "fact_objeto_gasto_fuente_largo",
        "fact_objeto_gasto_fuente_totales",
        "fact_objeto_gasto_fuente_validacion",
    ]

    for table in tables:
        con.execute(f"DROP TABLE IF EXISTS {table}")

    # ------------------------------------------------------------
    # Dimensión de entidades
    # ------------------------------------------------------------
    con.execute(
        f"""
        CREATE TABLE dim_entidad AS
        SELECT
            CAST(codigo_entidad AS VARCHAR) AS codigo_entidad,
            nombre_entidad,
            sigla,
            tipo,
            grupo_eta,
            departamento,
            fuente
        FROM read_csv_auto(
            '{ENTIDADES_CSV.as_posix()}',
            all_varchar = true,
            normalize_names = false
        )
        """
    )

    # ------------------------------------------------------------
    # Fase 1: Categoría programática x grupo de gasto
    # ------------------------------------------------------------
    con.execute(
        f"""
        CREATE TABLE fact_categoria_grupo AS
        SELECT
            CAST(gestion AS INTEGER) AS gestion,
            CAST(codigo_entidad AS VARCHAR) AS codigo_entidad,
            nombre_entidad,
            CAST(prg AS VARCHAR) AS prg,
            CAST(proyecto AS VARCHAR) AS proyecto,
            CAST(actividad AS VARCHAR) AS actividad,
            nivel,
            CAST(es_resumen_programa AS BOOLEAN) AS es_resumen_programa,
            CAST(es_fila_residual AS BOOLEAN) AS es_fila_residual,
            descripcion,
            CAST(grupo_1 AS BIGINT) AS grupo_1,
            CAST(grupo_2 AS BIGINT) AS grupo_2,
            CAST(grupo_3 AS BIGINT) AS grupo_3,
            CAST(grupo_4 AS BIGINT) AS grupo_4,
            CAST(grupo_5 AS BIGINT) AS grupo_5,
            CAST(grupo_6 AS BIGINT) AS grupo_6,
            CAST(grupo_7 AS BIGINT) AS grupo_7,
            CAST(grupo_8 AS BIGINT) AS grupo_8,
            CAST(grupo_9 AS BIGINT) AS grupo_9,
            CAST(total AS BIGINT) AS total,
            CAST(total_calculado AS BIGINT) AS total_calculado,
            CAST(total_diff AS BIGINT) AS total_diff,
            file
        FROM read_parquet('{CAT_PARQUET.as_posix()}')
        """
    )

    con.execute(
        f"""
        CREATE TABLE fact_totales_pdf AS
        SELECT
            CAST(gestion AS INTEGER) AS gestion,
            file,
            CAST(codigo_entidad AS VARCHAR) AS codigo_entidad,
            nombre_entidad,
            CAST(grupo_1 AS BIGINT) AS grupo_1,
            CAST(grupo_2 AS BIGINT) AS grupo_2,
            CAST(grupo_3 AS BIGINT) AS grupo_3,
            CAST(grupo_4 AS BIGINT) AS grupo_4,
            CAST(grupo_5 AS BIGINT) AS grupo_5,
            CAST(grupo_6 AS BIGINT) AS grupo_6,
            CAST(grupo_7 AS BIGINT) AS grupo_7,
            CAST(grupo_8 AS BIGINT) AS grupo_8,
            CAST(grupo_9 AS BIGINT) AS grupo_9,
            CAST(total AS BIGINT) AS total
        FROM read_csv_auto(
            '{CAT_TOTALES_CSV.as_posix()}',
            all_varchar = false,
            normalize_names = false
        )
        """
    )

    con.execute(
        f"""
        CREATE TABLE fact_validacion AS
        SELECT *
        FROM read_csv_auto(
            '{CAT_VALIDACION_CSV.as_posix()}',
            all_varchar = false,
            normalize_names = false
        )
        """
    )

    # ------------------------------------------------------------
    # Fase 2: Recursos por rubro
    # ------------------------------------------------------------
    con.execute(
        f"""
        CREATE TABLE fact_recursos_rubro AS
        SELECT
            CAST(gestion AS INTEGER) AS gestion,
            CAST(codigo_entidad AS VARCHAR) AS codigo_entidad,
            nombre_entidad,
            CAST(rubro AS VARCHAR) AS rubro,
            CAST(rubro_padre AS VARCHAR) AS rubro_padre,
            CAST(nivel_rubro AS INTEGER) AS nivel_rubro,
            descripcion,
            CAST(entidad_otorgante AS VARCHAR) AS entidad_otorgante,
            CAST(fuente AS VARCHAR) AS fuente,
            CAST(organismo AS VARCHAR) AS organismo,
            CAST(importe AS BIGINT) AS importe,
            CAST(es_detalle AS BOOLEAN) AS es_detalle,
            CAST(es_resumen AS BOOLEAN) AS es_resumen,
            file
        FROM read_parquet('{REC_PARQUET.as_posix()}')
        """
    )

    con.execute(
        f"""
        CREATE TABLE fact_recursos_rubro_totales AS
        SELECT
            CAST(gestion AS INTEGER) AS gestion,
            CAST(codigo_entidad AS VARCHAR) AS codigo_entidad,
            nombre_entidad,
            CAST(total_general_ingresos AS BIGINT) AS total_general_ingresos,
            file
        FROM read_csv_auto(
            '{REC_TOTALES_CSV.as_posix()}',
            all_varchar = false,
            normalize_names = false
        )
        """
    )

    con.execute(
        f"""
        CREATE TABLE fact_recursos_rubro_validacion AS
        SELECT *
        FROM read_csv_auto(
            '{REC_VALIDACION_CSV.as_posix()}',
            all_varchar = false,
            normalize_names = false
        )
        """
    )

    # ------------------------------------------------------------
    # Fase 3: Objeto del gasto x fuente
    # ------------------------------------------------------------
    con.execute(
        f"""
        CREATE TABLE fact_objeto_gasto_fuente AS
        SELECT *
        FROM read_parquet('{OBJ_PARQUET.as_posix()}')
        """
    )

    con.execute(
        f"""
        CREATE TABLE fact_objeto_gasto_fuente_largo AS
        SELECT *
        FROM read_parquet('{OBJ_LARGO_PARQUET.as_posix()}')
        """
    )

    con.execute(
        f"""
        CREATE TABLE fact_objeto_gasto_fuente_totales AS
        SELECT *
        FROM read_csv_auto(
            '{OBJ_TOTALES_CSV.as_posix()}',
            all_varchar = false,
            normalize_names = false
        )
        """
    )

    con.execute(
        f"""
        CREATE TABLE fact_objeto_gasto_fuente_validacion AS
        SELECT *
        FROM read_csv_auto(
            '{OBJ_VALIDACION_CSV.as_posix()}',
            all_varchar = false,
            normalize_names = false
        )
        """
    )

    # ------------------------------------------------------------
    # Marts Fase 1
    # ------------------------------------------------------------
    con.execute(
        """
        CREATE VIEW mart_presupuesto_entidad AS
        SELECT
            f.gestion,
            f.codigo_entidad,
            COALESCE(any_value(e.nombre_entidad), any_value(f.nombre_entidad)) AS nombre_entidad,
            any_value(e.sigla) AS sigla,
            any_value(e.tipo) AS tipo,
            any_value(e.grupo_eta) AS grupo_eta,
            any_value(e.departamento) AS departamento,
            SUM(f.total) AS presupuesto_total,
            SUM(f.grupo_1) AS grupo_1,
            SUM(f.grupo_2) AS grupo_2,
            SUM(f.grupo_3) AS grupo_3,
            SUM(f.grupo_4) AS grupo_4,
            SUM(f.grupo_5) AS grupo_5,
            SUM(f.grupo_6) AS grupo_6,
            SUM(f.grupo_7) AS grupo_7,
            SUM(f.grupo_8) AS grupo_8,
            SUM(f.grupo_9) AS grupo_9,
            COUNT(*) AS filas_contables
        FROM fact_categoria_grupo f
        LEFT JOIN dim_entidad e
            ON f.codigo_entidad = e.codigo_entidad
        WHERE f.es_resumen_programa = false
        GROUP BY
            f.gestion,
            f.codigo_entidad
        """
    )

    con.execute(
        """
        CREATE VIEW mart_presupuesto_departamento AS
        SELECT
            gestion,
            departamento,
            SUM(presupuesto_total) AS presupuesto_total,
            COUNT(*) AS entidades
        FROM mart_presupuesto_entidad
        GROUP BY
            gestion,
            departamento
        """
    )

    con.execute(
        """
        CREATE VIEW mart_grupo_gasto_entidad AS
        SELECT
            gestion,
            codigo_entidad,
            nombre_entidad,
            sigla,
            tipo,
            grupo_eta,
            departamento,
            grupo_1,
            grupo_2,
            grupo_3,
            grupo_4,
            grupo_5,
            grupo_6,
            grupo_7,
            grupo_8,
            grupo_9,
            presupuesto_total AS total
        FROM mart_presupuesto_entidad
        """
    )

    con.execute(
        """
        CREATE VIEW mart_grupo_gasto_largo AS
        SELECT gestion, codigo_entidad, nombre_entidad, departamento, tipo, grupo_eta, 'grupo_1' AS grupo_gasto, grupo_1 AS monto FROM mart_presupuesto_entidad
        UNION ALL
        SELECT gestion, codigo_entidad, nombre_entidad, departamento, tipo, grupo_eta, 'grupo_2' AS grupo_gasto, grupo_2 AS monto FROM mart_presupuesto_entidad
        UNION ALL
        SELECT gestion, codigo_entidad, nombre_entidad, departamento, tipo, grupo_eta, 'grupo_3' AS grupo_gasto, grupo_3 AS monto FROM mart_presupuesto_entidad
        UNION ALL
        SELECT gestion, codigo_entidad, nombre_entidad, departamento, tipo, grupo_eta, 'grupo_4' AS grupo_gasto, grupo_4 AS monto FROM mart_presupuesto_entidad
        UNION ALL
        SELECT gestion, codigo_entidad, nombre_entidad, departamento, tipo, grupo_eta, 'grupo_5' AS grupo_gasto, grupo_5 AS monto FROM mart_presupuesto_entidad
        UNION ALL
        SELECT gestion, codigo_entidad, nombre_entidad, departamento, tipo, grupo_eta, 'grupo_6' AS grupo_gasto, grupo_6 AS monto FROM mart_presupuesto_entidad
        UNION ALL
        SELECT gestion, codigo_entidad, nombre_entidad, departamento, tipo, grupo_eta, 'grupo_7' AS grupo_gasto, grupo_7 AS monto FROM mart_presupuesto_entidad
        UNION ALL
        SELECT gestion, codigo_entidad, nombre_entidad, departamento, tipo, grupo_eta, 'grupo_8' AS grupo_gasto, grupo_8 AS monto FROM mart_presupuesto_entidad
        UNION ALL
        SELECT gestion, codigo_entidad, nombre_entidad, departamento, tipo, grupo_eta, 'grupo_9' AS grupo_gasto, grupo_9 AS monto FROM mart_presupuesto_entidad
        """
    )

    con.execute(
        """
        CREATE VIEW mart_programas AS
        SELECT
            f.gestion,
            f.codigo_entidad,
            COALESCE(e.nombre_entidad, f.nombre_entidad) AS nombre_entidad,
            e.departamento,
            e.tipo,
            e.grupo_eta,
            f.prg,
            f.proyecto,
            f.actividad,
            f.nivel,
            f.descripcion,
            f.grupo_1,
            f.grupo_2,
            f.grupo_3,
            f.grupo_4,
            f.grupo_5,
            f.grupo_6,
            f.grupo_7,
            f.grupo_8,
            f.grupo_9,
            f.total
        FROM fact_categoria_grupo f
        LEFT JOIN dim_entidad e
            ON f.codigo_entidad = e.codigo_entidad
        WHERE f.es_resumen_programa = true
        """
    )

    con.execute(
        """
        CREATE VIEW mart_top_programas AS
        SELECT *
        FROM mart_programas
        """
    )

    con.execute(
        """
        CREATE VIEW mart_subprogramas AS
        SELECT
            f.gestion,
            f.codigo_entidad,
            COALESCE(e.nombre_entidad, f.nombre_entidad) AS nombre_entidad,
            e.departamento,
            e.tipo,
            e.grupo_eta,
            f.prg,
            f.proyecto,
            f.actividad,
            f.nivel,
            f.es_fila_residual,
            f.descripcion,
            f.grupo_1,
            f.grupo_2,
            f.grupo_3,
            f.grupo_4,
            f.grupo_5,
            f.grupo_6,
            f.grupo_7,
            f.grupo_8,
            f.grupo_9,
            f.total
        FROM fact_categoria_grupo f
        LEFT JOIN dim_entidad e
            ON f.codigo_entidad = e.codigo_entidad
        WHERE f.es_resumen_programa = false
        """
    )

    con.execute(
        """
        CREATE VIEW mart_validacion AS
        SELECT *
        FROM fact_validacion
        """
    )

    con.execute(
        """
        CREATE VIEW mart_resumen_nacional AS
        SELECT
            gestion,
            COUNT(*) AS entidades,
            SUM(presupuesto_total) AS presupuesto_total,
            SUM(grupo_1) AS grupo_1,
            SUM(grupo_2) AS grupo_2,
            SUM(grupo_3) AS grupo_3,
            SUM(grupo_4) AS grupo_4,
            SUM(grupo_5) AS grupo_5,
            SUM(grupo_6) AS grupo_6,
            SUM(grupo_7) AS grupo_7,
            SUM(grupo_8) AS grupo_8,
            SUM(grupo_9) AS grupo_9
        FROM mart_presupuesto_entidad
        GROUP BY gestion
        """
    )

    # ------------------------------------------------------------
    # Marts Fase 2: Recursos / ingresos
    # ------------------------------------------------------------
    con.execute(
        """
        CREATE VIEW mart_recursos_entidad AS
        SELECT
            r.gestion,
            r.codigo_entidad,
            COALESCE(e.nombre_entidad, any_value(r.nombre_entidad)) AS nombre_entidad,
            any_value(e.sigla) AS sigla,
            any_value(e.tipo) AS tipo,
            any_value(e.grupo_eta) AS grupo_eta,
            any_value(e.departamento) AS departamento,
            SUM(r.importe) AS ingresos_total,
            COUNT(*) AS filas_detalle
        FROM fact_recursos_rubro r
        LEFT JOIN dim_entidad e
            ON r.codigo_entidad = e.codigo_entidad
        WHERE r.es_detalle = true
        GROUP BY
            r.gestion,
            r.codigo_entidad,
            e.nombre_entidad
        """
    )

    con.execute(
        """
        CREATE VIEW mart_recursos_rubro_nivel1 AS
        SELECT
            r.gestion,
            r.codigo_entidad,
            COALESCE(e.nombre_entidad, r.nombre_entidad) AS nombre_entidad,
            e.departamento,
            e.tipo,
            e.grupo_eta,
            r.rubro,
            r.descripcion,
            r.importe
        FROM fact_recursos_rubro r
        LEFT JOIN dim_entidad e
            ON r.codigo_entidad = e.codigo_entidad
        WHERE r.es_resumen = true
          AND r.nivel_rubro = 1
        """
    )

    con.execute(
        """
        CREATE VIEW mart_recursos_detalle AS
        SELECT
            r.gestion,
            r.codigo_entidad,
            COALESCE(e.nombre_entidad, r.nombre_entidad) AS nombre_entidad,
            e.departamento,
            e.tipo,
            e.grupo_eta,
            r.rubro,
            r.rubro_padre,
            r.nivel_rubro,
            r.descripcion,
            r.entidad_otorgante,
            r.fuente,
            r.organismo,
            r.importe
        FROM fact_recursos_rubro r
        LEFT JOIN dim_entidad e
            ON r.codigo_entidad = e.codigo_entidad
        WHERE r.es_detalle = true
        """
    )

    con.execute(
        """
        CREATE VIEW mart_ingresos_vs_gastos AS
        SELECT
            COALESCE(g.gestion, i.gestion) AS gestion,
            COALESCE(g.codigo_entidad, i.codigo_entidad) AS codigo_entidad,
            COALESCE(g.nombre_entidad, i.nombre_entidad) AS nombre_entidad,
            COALESCE(g.sigla, i.sigla) AS sigla,
            COALESCE(g.tipo, i.tipo) AS tipo,
            COALESCE(g.grupo_eta, i.grupo_eta) AS grupo_eta,
            COALESCE(g.departamento, i.departamento) AS departamento,
            COALESCE(g.presupuesto_total, 0) AS gastos_total,
            COALESCE(i.ingresos_total, 0) AS ingresos_total,
            COALESCE(i.ingresos_total, 0) - COALESCE(g.presupuesto_total, 0) AS ingresos_menos_gastos
        FROM mart_presupuesto_entidad g
        FULL OUTER JOIN mart_recursos_entidad i
            ON g.codigo_entidad = i.codigo_entidad
           AND g.gestion = i.gestion
        """
    )

    # ------------------------------------------------------------
    # Marts Fase 3: Objeto del gasto x fuente
    # ------------------------------------------------------------
    con.execute(
        """
        CREATE VIEW mart_objeto_gasto_entidad AS
        SELECT
            o.gestion,
            o.codigo_entidad,
            COALESCE(e.nombre_entidad, any_value(o.nombre_entidad)) AS nombre_entidad,
            any_value(e.sigla) AS sigla,
            any_value(e.tipo) AS tipo,
            any_value(e.grupo_eta) AS grupo_eta,
            any_value(e.departamento) AS departamento,
            SUM(o.total) AS gasto_total_objeto,
            COUNT(*) AS filas_detalle
        FROM fact_objeto_gasto_fuente o
        LEFT JOIN dim_entidad e
            ON CAST(o.codigo_entidad AS VARCHAR) = e.codigo_entidad
        WHERE o.es_detalle = true
        GROUP BY
            o.gestion,
            o.codigo_entidad,
            e.nombre_entidad
        """
    )

    con.execute(
        """
        CREATE VIEW mart_objeto_gasto_nivel1 AS
        SELECT
            o.gestion,
            CAST(o.codigo_entidad AS VARCHAR) AS codigo_entidad,
            COALESCE(e.nombre_entidad, o.nombre_entidad) AS nombre_entidad,
            e.departamento,
            e.tipo,
            e.grupo_eta,
            CAST(o.objeto_gasto AS VARCHAR) AS objeto_gasto,
            o.descripcion,
            CAST(o.total AS BIGINT) AS total
        FROM fact_objeto_gasto_fuente o
        LEFT JOIN dim_entidad e
            ON CAST(o.codigo_entidad AS VARCHAR) = e.codigo_entidad
        WHERE o.es_resumen = true
          AND o.nivel_objeto = 1
        """
    )

    con.execute(
        """
        CREATE VIEW mart_objeto_gasto_detalle AS
        SELECT
            o.gestion,
            CAST(o.codigo_entidad AS VARCHAR) AS codigo_entidad,
            COALESCE(e.nombre_entidad, o.nombre_entidad) AS nombre_entidad,
            e.departamento,
            e.tipo,
            e.grupo_eta,
            CAST(o.objeto_gasto AS VARCHAR) AS objeto_gasto,
            CAST(o.objeto_padre AS VARCHAR) AS objeto_padre,
            CAST(o.nivel_objeto AS INTEGER) AS nivel_objeto,
            o.descripcion,
            CAST(o.entidad_transferencia AS VARCHAR) AS entidad_transferencia,
            CAST(o.total AS BIGINT) AS total
        FROM fact_objeto_gasto_fuente o
        LEFT JOIN dim_entidad e
            ON CAST(o.codigo_entidad AS VARCHAR) = e.codigo_entidad
        WHERE o.es_detalle = true
        """
    )

    con.execute(
        """
        CREATE VIEW mart_objeto_fuente_largo AS
        SELECT
            l.gestion,
            CAST(l.codigo_entidad AS VARCHAR) AS codigo_entidad,
            COALESCE(e.nombre_entidad, l.nombre_entidad) AS nombre_entidad,
            e.departamento,
            e.tipo,
            e.grupo_eta,
            CAST(l.objeto_gasto AS VARCHAR) AS objeto_gasto,
            CAST(l.objeto_padre AS VARCHAR) AS objeto_padre,
            CAST(l.nivel_objeto AS INTEGER) AS nivel_objeto,
            l.descripcion,
            CAST(l.entidad_transferencia AS VARCHAR) AS entidad_transferencia,
            l.fuente_columna,
            CAST(l.monto AS BIGINT) AS monto
        FROM fact_objeto_gasto_fuente_largo l
        LEFT JOIN dim_entidad e
            ON CAST(l.codigo_entidad AS VARCHAR) = e.codigo_entidad
        """
    )

    con.execute(
        """
        CREATE VIEW mart_objeto_fuente_entidad AS
        SELECT
            gestion,
            codigo_entidad,
            nombre_entidad,
            departamento,
            tipo,
            grupo_eta,
            fuente_columna,
            SUM(monto) AS monto
        FROM mart_objeto_fuente_largo
        GROUP BY
            gestion,
            codigo_entidad,
            nombre_entidad,
            departamento,
            tipo,
            grupo_eta,
            fuente_columna
        """
    )

    # ------------------------------------------------------------
    # Validación integrada
    # ------------------------------------------------------------
    con.execute(
        """
        CREATE VIEW mart_validacion_integrada AS
        SELECT
            e.codigo_entidad,
            e.nombre_entidad,
            e.departamento,
            e.tipo,
            e.grupo_eta,
            COALESCE(g.presupuesto_total, 0) AS gastos_categoria_grupo,
            COALESCE(r.ingresos_total, 0) AS ingresos_recursos_rubro,
            COALESCE(o.gasto_total_objeto, 0) AS gastos_objeto_fuente,
            COALESCE(r.ingresos_total, 0) - COALESCE(g.presupuesto_total, 0) AS diff_ingresos_vs_gastos,
            COALESCE(o.gasto_total_objeto, 0) - COALESCE(g.presupuesto_total, 0) AS diff_objeto_vs_categoria
        FROM dim_entidad e
        LEFT JOIN mart_presupuesto_entidad g
            ON e.codigo_entidad = g.codigo_entidad
        LEFT JOIN mart_recursos_entidad r
            ON e.codigo_entidad = r.codigo_entidad
        LEFT JOIN mart_objeto_gasto_entidad o
            ON e.codigo_entidad = CAST(o.codigo_entidad AS VARCHAR)
        """
    )

    # ------------------------------------------------------------
    # Reporte final
    # ------------------------------------------------------------
    print("[OK] DuckDB creado:", DB_PATH)

    print("\n[+] Tablas y vistas:")
    print(con.execute("SHOW TABLES").fetchdf().to_string(index=False))

    print("\n[+] Resumen nacional gastos:")
    print(
        con.execute(
            """
            SELECT *
            FROM mart_resumen_nacional
            """
        )
        .fetchdf()
        .to_string(index=False)
    )

    print("\n[+] Ingresos vs gastos:")
    print(
        con.execute(
            """
            SELECT
                COUNT(*) AS entidades,
                SUM(gastos_total) AS gastos_total,
                SUM(ingresos_total) AS ingresos_total,
                SUM(ingresos_menos_gastos) AS diff_total
            FROM mart_ingresos_vs_gastos
            """
        )
        .fetchdf()
        .to_string(index=False)
    )

    print("\n[+] Objeto del gasto vs categoría/grupo:")
    print(
        con.execute(
            """
            SELECT
                COUNT(*) AS entidades,
                SUM(gastos_categoria_grupo) AS gastos_categoria_grupo,
                SUM(gastos_objeto_fuente) AS gastos_objeto_fuente,
                SUM(diff_objeto_vs_categoria) AS diff_total
            FROM mart_validacion_integrada
            """
        )
        .fetchdf()
        .to_string(index=False)
    )

    print("\n[+] Validación integrada - diferencias:")
    print(
        con.execute(
            """
            SELECT
                codigo_entidad,
                nombre_entidad,
                departamento,
                gastos_categoria_grupo,
                ingresos_recursos_rubro,
                gastos_objeto_fuente,
                diff_ingresos_vs_gastos,
                diff_objeto_vs_categoria
            FROM mart_validacion_integrada
            WHERE diff_ingresos_vs_gastos != 0
               OR diff_objeto_vs_categoria != 0
            ORDER BY ABS(diff_ingresos_vs_gastos) DESC, ABS(diff_objeto_vs_categoria) DESC
            LIMIT 50
            """
        )
        .fetchdf()
        .to_string(index=False)
    )

    print("\n[+] Top objeto del gasto nivel 1:")
    print(
        con.execute(
            """
            SELECT
                objeto_gasto,
                descripcion,
                SUM(total) AS total
            FROM mart_objeto_gasto_nivel1
            GROUP BY objeto_gasto, descripcion
            ORDER BY total DESC
            """
        )
        .fetchdf()
        .to_string(index=False)
    )

    print("\n[+] Top recursos rubro nivel 1:")
    print(
        con.execute(
            """
            SELECT
                rubro,
                descripcion,
                SUM(importe) AS total
            FROM mart_recursos_rubro_nivel1
            GROUP BY rubro, descripcion
            ORDER BY total DESC
            """
        )
        .fetchdf()
        .to_string(index=False)
    )

    con.close()


if __name__ == "__main__":
    main()