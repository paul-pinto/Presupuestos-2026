from pathlib import Path

import duckdb
import pandas as pd
import plotly.express as px
import streamlit as st


DB_PATH = Path("data/warehouse/sigep_2026.duckdb")


GRUPOS_GASTO = {
    "grupo_1": "Grupo 1",
    "grupo_2": "Grupo 2",
    "grupo_3": "Grupo 3",
    "grupo_4": "Grupo 4",
    "grupo_5": "Grupo 5",
    "grupo_6": "Grupo 6",
    "grupo_7": "Grupo 7",
    "grupo_8": "Grupo 8",
    "grupo_9": "Grupo 9",
}

GROUP_COLS = list(GRUPOS_GASTO.keys())
TOLERANCIA_BS = 1.0


st.set_page_config(
    page_title="Presupuestos ETA Bolivia 2026",
    page_icon="🇧🇴",
    layout="wide",
)


# ============================================================
# FORMATO
# ============================================================

def format_int(value) -> str:
    try:
        return f"{float(value):,.0f}".replace(",", ".")
    except Exception:
        return "0"


def format_bs(value) -> str:
    try:
        return f"Bs {float(value):,.0f}".replace(",", ".")
    except Exception:
        return "Bs 0"


def format_pct(value) -> str:
    try:
        return f"{float(value):.2f}%".replace(".", ",")
    except Exception:
        return "0,00%"


def format_bs_pct(value, total) -> str:
    try:
        value = float(value)
        total = float(total)
        pct = 0 if total == 0 else (value / total) * 100
        return f"{format_bs(value)} ({format_pct(pct)})"
    except Exception:
        return "Bs 0 (0,00%)"


def add_value_label(
    df: pd.DataFrame,
    value_col: str,
    label_col: str = "valor_label",
) -> pd.DataFrame:
    out = df.copy()
    out[label_col] = out[value_col].apply(format_bs)
    return out


def force_integer_axis(fig, axis: str = "x"):
    axis_config = dict(
        tickformat=",.0f",
        exponentformat="none",
        showexponent="none",
        separatethousands=True,
    )

    if axis == "x":
        fig.update_xaxes(**axis_config)
    elif axis == "y":
        fig.update_yaxes(**axis_config)
    else:
        fig.update_xaxes(**axis_config)
        fig.update_yaxes(**axis_config)

    fig.update_layout(
        uniformtext_minsize=8,
        uniformtext_mode="hide",
        margin=dict(l=20, r=140, t=40, b=40),
    )

    return fig


def format_money_column(
    df: pd.DataFrame,
    amount_col: str,
    total_value: float,
) -> pd.DataFrame:
    out = df.copy()
    out[amount_col] = out[amount_col].apply(lambda x: format_bs_pct(x, total_value))
    return out


def format_group_cols_table(
    df: pd.DataFrame,
    total_col: str = "total",
    table_total_for_total_col: float | None = None,
) -> pd.DataFrame:
    out = df.copy()

    for col in GROUP_COLS:
        if col in out.columns:
            out[col] = out.apply(
                lambda row: format_bs_pct(row[col], row[total_col]),
                axis=1,
            )

    if total_col in out.columns:
        if table_total_for_total_col is None:
            table_total_for_total_col = pd.to_numeric(
                df[total_col],
                errors="coerce",
            ).fillna(0).sum()

        out[total_col] = df[total_col].apply(
            lambda x: format_bs_pct(x, table_total_for_total_col)
        )

    return out


# ============================================================
# DATA
# ============================================================

@st.cache_data(show_spinner=True)
def load_data():
    if not DB_PATH.exists():
        raise FileNotFoundError(f"No existe la base DuckDB: {DB_PATH}")

    con = duckdb.connect(str(DB_PATH), read_only=True)

    entidades = con.execute(
        """
        SELECT *
        FROM mart_presupuesto_entidad
        ORDER BY presupuesto_total DESC
        """
    ).fetchdf()

    programas = con.execute(
        """
        SELECT *
        FROM mart_programas
        ORDER BY total DESC
        """
    ).fetchdf()

    subprogramas = con.execute(
        """
        SELECT *
        FROM mart_subprogramas
        ORDER BY total DESC
        """
    ).fetchdf()

    recursos_entidad = con.execute(
        """
        SELECT *
        FROM mart_recursos_entidad
        ORDER BY ingresos_total DESC
        """
    ).fetchdf()

    recursos_rubro = con.execute(
        """
        SELECT *
        FROM mart_recursos_rubro_nivel1
        ORDER BY importe DESC
        """
    ).fetchdf()

    recursos_detalle = con.execute(
        """
        SELECT *
        FROM mart_recursos_detalle
        ORDER BY importe DESC
        """
    ).fetchdf()

    ingresos_vs_gastos = con.execute(
        """
        SELECT *
        FROM mart_ingresos_vs_gastos
        ORDER BY gastos_total DESC
        """
    ).fetchdf()

    objeto_entidad = con.execute(
        """
        SELECT *
        FROM mart_objeto_gasto_entidad
        ORDER BY gasto_total_objeto DESC
        """
    ).fetchdf()

    objeto_nivel1 = con.execute(
        """
        SELECT *
        FROM mart_objeto_gasto_nivel1
        ORDER BY total DESC
        """
    ).fetchdf()

    objeto_detalle = con.execute(
        """
        SELECT *
        FROM mart_objeto_gasto_detalle
        ORDER BY total DESC
        """
    ).fetchdf()

    objeto_fuente_largo = con.execute(
        """
        SELECT *
        FROM mart_objeto_fuente_largo
        ORDER BY monto DESC
        """
    ).fetchdf()

    objeto_fuente_entidad = con.execute(
        """
        SELECT *
        FROM mart_objeto_fuente_entidad
        ORDER BY monto DESC
        """
    ).fetchdf()

    validacion = con.execute(
        """
        SELECT *
        FROM mart_validacion
        ORDER BY codigo_entidad
        """
    ).fetchdf()

    validacion_integrada = con.execute(
        """
        SELECT *
        FROM mart_validacion_integrada
        ORDER BY codigo_entidad
        """
    ).fetchdf()

    con.close()

    dfs = [
        entidades,
        programas,
        subprogramas,
        recursos_entidad,
        recursos_rubro,
        recursos_detalle,
        ingresos_vs_gastos,
        objeto_entidad,
        objeto_nivel1,
        objeto_detalle,
        objeto_fuente_largo,
        objeto_fuente_entidad,
        validacion,
        validacion_integrada,
    ]

    for df in dfs:
        if "codigo_entidad" in df.columns:
            df["codigo_entidad"] = df["codigo_entidad"].astype(str)

        for col in [
            "prg",
            "actividad",
            "proyecto",
            "rubro",
            "objeto_gasto",
            "objeto_padre",
            "fuente",
            "organismo",
            "entidad_transferencia",
            "entidad_otorgante",
        ]:
            if col in df.columns:
                df[col] = df[col].astype(str)

    numeric_candidates = [
        "presupuesto_total",
        "total",
        "importe",
        "ingresos_total",
        "gastos_total",
        "ingresos_menos_gastos",
        "gasto_total_objeto",
        "monto",
        "total_detalle",
        "total_pdf",
        "total_diff",
        "gastos_categoria_grupo",
        "ingresos_recursos_rubro",
        "gastos_objeto_fuente",
        "diff_ingresos_vs_gastos",
        "diff_objeto_vs_categoria",
        *GROUP_COLS,
    ]

    for df in dfs:
        for col in numeric_candidates:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    return {
        "entidades": entidades,
        "programas": programas,
        "subprogramas": subprogramas,
        "recursos_entidad": recursos_entidad,
        "recursos_rubro": recursos_rubro,
        "recursos_detalle": recursos_detalle,
        "ingresos_vs_gastos": ingresos_vs_gastos,
        "objeto_entidad": objeto_entidad,
        "objeto_nivel1": objeto_nivel1,
        "objeto_detalle": objeto_detalle,
        "objeto_fuente_largo": objeto_fuente_largo,
        "objeto_fuente_entidad": objeto_fuente_entidad,
        "validacion": validacion,
        "validacion_integrada": validacion_integrada,
    }



def validate_schema(data: dict[str, pd.DataFrame]) -> None:
    required = {
        "entidades": [
            "codigo_entidad",
            "nombre_entidad",
            "departamento",
            "grupo_eta",
            "tipo",
            "presupuesto_total",
            *GROUP_COLS,
        ],
        "programas": [
            "codigo_entidad",
            "nombre_entidad",
            "departamento",
            "grupo_eta",
            "tipo",
            "prg",
            "descripcion",
            "total",
            *GROUP_COLS,
        ],
        "subprogramas": [
            "codigo_entidad",
            "prg",
            "proyecto",
            "actividad",
            "descripcion",
            "total",
            *GROUP_COLS,
        ],
        "recursos_entidad": [
            "codigo_entidad",
            "nombre_entidad",
            "departamento",
            "grupo_eta",
            "tipo",
            "ingresos_total",
        ],
        "ingresos_vs_gastos": [
            "codigo_entidad",
            "ingresos_total",
            "gastos_total",
            "ingresos_menos_gastos",
        ],
        "objeto_entidad": [
            "codigo_entidad",
            "gasto_total_objeto",
        ],
        "validacion_integrada": [
            "codigo_entidad",
            "diff_ingresos_vs_gastos",
            "diff_objeto_vs_categoria",
        ],
    }

    errors = []

    for table_name, columns in required.items():
        if table_name not in data:
            errors.append(f"Falta dataset en memoria: {table_name}")
            continue

        missing = [
            col
            for col in columns
            if col not in data[table_name].columns
        ]

        if missing:
            errors.append(f"{table_name}: faltan columnas {missing}")

    if errors:
        raise ValueError("Schema inválido:\n" + "\n".join(errors))


def filter_df(
    df: pd.DataFrame,
    departamentos: list[str],
    grupos_eta: list[str],
    tipos: list[str],
) -> pd.DataFrame:
    out = df.copy()

    if departamentos and "departamento" in out.columns:
        out = out[out["departamento"].isin(departamentos)]

    if grupos_eta and "grupo_eta" in out.columns:
        out = out[out["grupo_eta"].isin(grupos_eta)]

    if tipos and "tipo" in out.columns:
        out = out[out["tipo"].isin(tipos)]

    return out


def filter_by_codes(df: pd.DataFrame, codes: set[str]) -> pd.DataFrame:
    if "codigo_entidad" not in df.columns:
        return df.copy()

    return df[df["codigo_entidad"].astype(str).isin(codes)].copy()


# ============================================================
# HELPERS
# ============================================================

def groups_from_entidades(df: pd.DataFrame) -> pd.DataFrame:
    rows = []

    for col, label in GRUPOS_GASTO.items():
        rows.append(
            {
                "grupo_gasto": col,
                "grupo_gasto_label": label,
                "monto": df[col].sum(),
            }
        )

    return pd.DataFrame(rows).sort_values("monto", ascending=False)


def groups_by_dimension(df: pd.DataFrame, dimension: str) -> pd.DataFrame:
    rows = []

    for value, sub in df.groupby(dimension, dropna=False):
        for col, label in GRUPOS_GASTO.items():
            rows.append(
                {
                    dimension: value,
                    "grupo_gasto": col,
                    "grupo_gasto_label": label,
                    "monto": sub[col].sum(),
                }
            )

    return pd.DataFrame(rows)


def make_program_entity_label(df: pd.DataFrame) -> pd.Series:
    return (
        df["codigo_entidad"].astype(str)
        + " · "
        + df["nombre_entidad"].astype(str)
        + " · PRG "
        + df["prg"].astype(str)
        + " · "
        + df["descripcion"].astype(str)
    )


def make_subprogram_entity_label(df: pd.DataFrame) -> pd.Series:
    return (
        df["codigo_entidad"].astype(str)
        + " · "
        + df["nombre_entidad"].astype(str)
        + " · PRG "
        + df["prg"].astype(str)
        + " · ACT "
        + df["actividad"].astype(str)
        + " · "
        + df["descripcion"].astype(str)
    )


def render_bar_h(
    df: pd.DataFrame,
    x: str,
    y: str,
    key: str,
    color: str | None = None,
    hover_data=None,
    title_height_base: int = 500,
):
    if df.empty:
        st.info("No hay datos para graficar.")
        return

    chart = add_value_label(df, x)

    fig = px.bar(
        chart.sort_values(x, ascending=True),
        x=x,
        y=y,
        orientation="h",
        color=color,
        text="valor_label",
        hover_data=hover_data,
    )
    fig.update_traces(textposition="outside", cliponaxis=False)
    fig.update_layout(height=max(title_height_base, 34 * len(chart)))
    force_integer_axis(fig, "x")
    st.plotly_chart(fig, use_container_width=True, key=key)


def render_bar_v(
    df: pd.DataFrame,
    x: str,
    y: str,
    key: str,
    color: str | None = None,
    hover_data=None,
):
    if df.empty:
        st.info("No hay datos para graficar.")
        return

    chart = add_value_label(df, y)

    fig = px.bar(
        chart,
        x=x,
        y=y,
        color=color,
        text="valor_label",
        hover_data=hover_data,
    )
    fig.update_traces(textposition="outside", cliponaxis=False)
    force_integer_axis(fig, "y")
    st.plotly_chart(fig, use_container_width=True, key=key)


def render_group_composition_from_row(
    row: pd.Series,
    total_value: float,
    title: str,
    chart_key: str,
):
    st.markdown(f"**{title}**")

    grupo_df = pd.DataFrame(
        [
            {
                "grupo_gasto": col,
                "grupo_gasto_label": label,
                "monto": float(row[col]),
                "monto_fmt": format_bs_pct(row[col], total_value),
            }
            for col, label in GRUPOS_GASTO.items()
        ]
    ).sort_values("monto", ascending=False)

    render_bar_v(
        grupo_df,
        x="grupo_gasto_label",
        y="monto",
        key=chart_key,
        hover_data={
            "grupo_gasto": True,
            "monto": ":,.0f",
            "valor_label": False,
        },
    )

    st.dataframe(
        grupo_df[["grupo_gasto", "grupo_gasto_label", "monto_fmt"]],
        use_container_width=True,
        hide_index=True,
    )


def render_programas_cascada(
    programas_base: pd.DataFrame,
    subprogramas_base: pd.DataFrame,
    codigo_entidad: str,
    titulo: str,
    key_prefix: str,
):
    st.subheader(titulo)

    programas_view = programas_base[
        programas_base["codigo_entidad"].astype(str) == str(codigo_entidad)
    ].copy()

    subprogramas_view = subprogramas_base[
        subprogramas_base["codigo_entidad"].astype(str) == str(codigo_entidad)
    ].copy()

    if programas_view.empty:
        st.warning("No hay programas para mostrar.")
        return

    total_base = programas_view["total"].sum()
    programas_view = programas_view.sort_values("total", ascending=False)

    mostrar_cero = st.checkbox(
        "Mostrar programas con monto cero",
        value=False,
        key=f"{key_prefix}_mostrar_cero",
    )

    if not mostrar_cero:
        programas_view = programas_view[programas_view["total"] > 0].copy()

    if programas_view.empty:
        st.info("No hay programas con monto mayor a cero para los filtros seleccionados.")
        return

    max_programas = st.slider(
        "Cantidad de programas a desplegar",
        min_value=1,
        max_value=min(100, len(programas_view)),
        value=min(25, len(programas_view)),
        step=1,
        key=f"{key_prefix}_max_programas",
    )

    programas_view = programas_view.head(max_programas)

    for idx, (_, programa) in enumerate(programas_view.iterrows(), start=1):
        prg = str(programa["prg"])
        codigo = str(programa["codigo_entidad"])
        programa_total = float(programa["total"])
        programa_pct = 0 if total_base == 0 else (programa_total / total_base) * 100

        titulo_programa = (
            f"PRG {prg} · {programa['descripcion']} · "
            f"{format_bs(programa_total)} ({format_pct(programa_pct)})"
        )

        expander_key_base = f"{key_prefix}_{codigo}_{prg}_{idx}"

        with st.expander(titulo_programa, expanded=False):
            p1, p2, p3 = st.columns(3)
            p1.metric("Programa", f"PRG {prg}")
            p2.metric("Monto programa", format_bs(programa_total))
            p3.metric("% del total de programas", format_pct(programa_pct))

            render_group_composition_from_row(
                row=programa,
                total_value=programa_total,
                title="Composición del programa por grupo de gasto",
                chart_key=f"{expander_key_base}_grupo",
            )

            hijos = subprogramas_view[
                subprogramas_view["prg"].astype(str) == prg
            ].copy()

            hijos = hijos.sort_values("total", ascending=False)

            st.markdown("**Subprogramas / actividades**")

            if hijos.empty:
                st.info("Este programa no tiene subprogramas o actividades desagregadas.")
                continue

            hijos_chart = hijos.head(20).copy()
            hijos_chart["subprograma_label"] = (
                "ACT "
                + hijos_chart["actividad"].astype(str)
                + " · "
                + hijos_chart["descripcion"].astype(str)
            )

            render_bar_h(
                hijos_chart,
                x="total",
                y="subprograma_label",
                key=f"{expander_key_base}_hijos",
                hover_data={
                    "codigo_entidad": True,
                    "nombre_entidad": True,
                    "prg": True,
                    "proyecto": True,
                    "actividad": True,
                    "nivel": True,
                    "descripcion": True,
                    "total": ":,.0f",
                    "valor_label": False,
                    "subprograma_label": False,
                },
                title_height_base=450,
            )

            hijos_display = hijos.copy()

            for col in GROUP_COLS:
                hijos_display[col] = hijos_display.apply(
                    lambda row: format_bs_pct(row[col], row["total"]),
                    axis=1,
                )

            hijos_display["total"] = hijos_display["total"].apply(
                lambda x: format_bs_pct(x, programa_total)
            )

            cols_hijos = [
                "prg",
                "proyecto",
                "actividad",
                "nivel",
                "es_fila_residual",
                "descripcion",
                *GROUP_COLS,
                "total",
            ]

            st.dataframe(
                hijos_display[cols_hijos],
                use_container_width=True,
                hide_index=True,
            )


# ============================================================
# MAIN
# ============================================================

def main():
    try:
        data = load_data()
        validate_schema(data)
    except Exception as e:
        st.error(
            "No pude cargar DuckDB. Ejecuta primero `python scripts\\build_duckdb.py`.\n\n"
            f"Detalle: {e}"
        )
        st.stop()

    entidades = data["entidades"]
    programas = data["programas"]
    subprogramas = data["subprogramas"]
    recursos_entidad = data["recursos_entidad"]
    recursos_rubro = data["recursos_rubro"]
    recursos_detalle = data["recursos_detalle"]
    ingresos_vs_gastos = data["ingresos_vs_gastos"]
    objeto_entidad = data["objeto_entidad"]
    objeto_nivel1 = data["objeto_nivel1"]
    objeto_detalle = data["objeto_detalle"]
    objeto_fuente_largo = data["objeto_fuente_largo"]
    objeto_fuente_entidad = data["objeto_fuente_entidad"]
    validacion = data["validacion"]
    validacion_integrada = data["validacion_integrada"]

    st.title("🇧🇴 Presupuestos ETA Bolivia 2026")
    st.caption(
        "Fuente: SIGEP · Presupuesto General del Estado 2026 · "
        "Categoría Programática, Recursos por Rubro y Objeto del Gasto/Fuente"
    )

    st.info(
        "Beta integrada: gasto por programa/grupo, ingresos por rubro y objeto del gasto por fuente. "
        "Dashboard experimental sobre DuckDB local."
    )

    departamentos_all = sorted(entidades["departamento"].dropna().unique().tolist())
    grupos_eta_all = sorted(entidades["grupo_eta"].dropna().unique().tolist())
    tipos_all = sorted(entidades["tipo"].dropna().unique().tolist())

    entidades_filter_options = entidades.copy()
    entidades_filter_options["label"] = (
        entidades_filter_options["codigo_entidad"].astype(str)
        + " · "
        + entidades_filter_options["nombre_entidad"].astype(str)
    )

    entidades_all = (
        entidades_filter_options.sort_values("nombre_entidad")["label"]
        .dropna()
        .unique()
        .tolist()
    )

    with st.sidebar:
        st.header("Filtros")

        departamentos = st.multiselect(
            "Departamento",
            options=departamentos_all,
            default=[],
            placeholder="Todos",
        )

        grupos_eta = st.multiselect(
            "Grupo ETA",
            options=grupos_eta_all,
            default=[],
            placeholder="Todos",
        )

        tipos = st.multiselect(
            "Tipo de entidad",
            options=tipos_all,
            default=[],
            placeholder="Todos",
        )

        entidades_selected = st.multiselect(
            "Entidad",
            options=entidades_all,
            default=[],
            placeholder="Todas",
        )

        top_n = st.slider(
            "Top a mostrar",
            min_value=5,
            max_value=50,
            value=20,
            step=5,
        )

        st.divider()
        st.caption(f"Base: `{DB_PATH}`")

        if st.button("Recargar base"):
            st.cache_data.clear()
            st.rerun()

    entidades_f = filter_df(entidades, departamentos, grupos_eta, tipos)

    if entidades_selected:
        selected_codes = {
            item.split(" · ")[0].strip()
            for item in entidades_selected
        }

        entidades_f = entidades_f[
            entidades_f["codigo_entidad"].astype(str).isin(selected_codes)
        ].copy()

    codigos_filtrados = set(entidades_f["codigo_entidad"].astype(str))

    programas_f = filter_by_codes(
        filter_df(programas, departamentos, grupos_eta, tipos),
        codigos_filtrados,
    )
    subprogramas_f = filter_by_codes(
        filter_df(subprogramas, departamentos, grupos_eta, tipos),
        codigos_filtrados,
    )

    recursos_entidad_f = filter_by_codes(
        filter_df(recursos_entidad, departamentos, grupos_eta, tipos),
        codigos_filtrados,
    )
    recursos_rubro_f = filter_by_codes(
        filter_df(recursos_rubro, departamentos, grupos_eta, tipos),
        codigos_filtrados,
    )
    recursos_detalle_f = filter_by_codes(
        filter_df(recursos_detalle, departamentos, grupos_eta, tipos),
        codigos_filtrados,
    )

    ingresos_vs_gastos_f = filter_by_codes(
        filter_df(ingresos_vs_gastos, departamentos, grupos_eta, tipos),
        codigos_filtrados,
    )

    objeto_entidad_f = filter_by_codes(
        filter_df(objeto_entidad, departamentos, grupos_eta, tipos),
        codigos_filtrados,
    )
    objeto_nivel1_f = filter_by_codes(
        filter_df(objeto_nivel1, departamentos, grupos_eta, tipos),
        codigos_filtrados,
    )
    objeto_detalle_f = filter_by_codes(
        filter_df(objeto_detalle, departamentos, grupos_eta, tipos),
        codigos_filtrados,
    )
    objeto_fuente_largo_f = filter_by_codes(
        filter_df(objeto_fuente_largo, departamentos, grupos_eta, tipos),
        codigos_filtrados,
    )
    objeto_fuente_entidad_f = filter_by_codes(
        filter_df(objeto_fuente_entidad, departamentos, grupos_eta, tipos),
        codigos_filtrados,
    )

    validacion_f = filter_by_codes(validacion, codigos_filtrados)
    validacion_integrada_f = filter_by_codes(
        filter_df(validacion_integrada, departamentos, grupos_eta, tipos),
        codigos_filtrados,
    )

    if entidades_f.empty:
        st.warning("No hay datos para los filtros seleccionados.")
        st.stop()

    total_gasto = entidades_f["presupuesto_total"].sum()
    total_ingreso = recursos_entidad_f["ingresos_total"].sum()
    total_objeto = objeto_entidad_f["gasto_total_objeto"].sum()

    k1, k2, k3, k4, k5 = st.columns(5)
    k1.metric("Gasto total", format_bs(total_gasto))
    k2.metric("Ingreso total", format_bs(total_ingreso))
    k3.metric("Objeto/Fuente total", format_bs(total_objeto))
    k4.metric("Entidades", format_int(entidades_f["codigo_entidad"].nunique()))
    k5.metric("Programas", format_int(len(programas_f)))

    st.divider()

    (
        tab_resumen,
        tab_grupos,
        tab_programas,
        tab_cascada,
        tab_recursos,
        tab_objeto,
        tab_entidad,
        tab_validacion,
    ) = st.tabs(
        [
            "Resumen",
            "Grupos de gasto",
            "Programas",
            "Cascada programa → actividad",
            "Recursos / Ingresos",
            "Objeto del gasto",
            "Entidad",
            "Validación integrada",
        ]
    )

    # ========================================================
    # RESUMEN
    # ========================================================
    with tab_resumen:
        st.subheader("Ranking de entidades por presupuesto de gasto")

        ranking = entidades_f.sort_values("presupuesto_total", ascending=False).head(top_n).copy()

        render_bar_h(
            ranking,
            x="presupuesto_total",
            y="nombre_entidad",
            key="resumen_ranking_gasto",
            hover_data={
                "codigo_entidad": True,
                "departamento": True,
                "grupo_eta": True,
                "tipo": True,
                "presupuesto_total": ":,.0f",
                "valor_label": False,
            },
        )

        c1, c2 = st.columns(2)

        with c1:
            st.subheader("Gasto agregado por departamento")

            dept = (
                entidades_f.groupby("departamento", dropna=False)
                .agg(
                    presupuesto_total=("presupuesto_total", "sum"),
                    entidades=("codigo_entidad", "nunique"),
                )
                .reset_index()
                .sort_values("presupuesto_total", ascending=False)
            )

            render_bar_h(
                dept,
                x="presupuesto_total",
                y="departamento",
                key="resumen_gasto_departamento",
                hover_data={
                    "entidades": True,
                    "presupuesto_total": ":,.0f",
                    "valor_label": False,
                },
            )

            dept_display = format_money_column(dept, "presupuesto_total", total_gasto)
            st.dataframe(dept_display, use_container_width=True, hide_index=True)

        with c2:
            st.subheader("Gasto agregado por Grupo ETA")

            eta = (
                entidades_f.groupby(["grupo_eta", "tipo"], dropna=False)
                .agg(
                    presupuesto_total=("presupuesto_total", "sum"),
                    entidades=("codigo_entidad", "nunique"),
                )
                .reset_index()
                .sort_values("presupuesto_total", ascending=False)
            )

            render_bar_h(
                eta,
                x="presupuesto_total",
                y="grupo_eta",
                color="tipo",
                key="resumen_gasto_eta",
                hover_data={
                    "entidades": True,
                    "tipo": True,
                    "presupuesto_total": ":,.0f",
                    "valor_label": False,
                },
            )

            eta_display = format_money_column(eta, "presupuesto_total", total_gasto)
            st.dataframe(eta_display, use_container_width=True, hide_index=True)

        st.subheader("Ingresos vs gastos")

        ivg = ingresos_vs_gastos_f.sort_values("gastos_total", ascending=False).copy()

        v1, v2, v3 = st.columns(3)
        v1.metric("Gastos", format_bs(ivg["gastos_total"].sum()))
        v2.metric("Ingresos", format_bs(ivg["ingresos_total"].sum()))
        v3.metric("Diferencia", format_bs(ivg["ingresos_menos_gastos"].sum()))

        ivg_display = ivg.copy()
        ivg_display["gastos_total"] = ivg_display["gastos_total"].apply(
            lambda x: format_bs_pct(x, ivg["gastos_total"].sum())
        )
        ivg_display["ingresos_total"] = ivg_display["ingresos_total"].apply(
            lambda x: format_bs_pct(x, ivg["ingresos_total"].sum())
        )
        ivg_display["ingresos_menos_gastos"] = ivg_display["ingresos_menos_gastos"].map(format_bs)

        st.dataframe(ivg_display, use_container_width=True, hide_index=True)

    # ========================================================
    # GRUPOS DE GASTO
    # ========================================================
    with tab_grupos:
        st.subheader("Grupos de gasto")

        grupos = groups_from_entidades(entidades_f)
        total_grupos = grupos["monto"].sum()

        render_bar_v(
            grupos,
            x="grupo_gasto_label",
            y="monto",
            key="grupos_total",
            hover_data={
                "grupo_gasto": True,
                "monto": ":,.0f",
                "valor_label": False,
            },
        )

        grupos_display = format_money_column(grupos, "monto", total_grupos)
        st.dataframe(grupos_display, use_container_width=True, hide_index=True)

        c1, c2 = st.columns(2)

        with c1:
            st.subheader("Por departamento")

            grupos_dept = groups_by_dimension(entidades_f, "departamento")

            render_bar_v(
                grupos_dept,
                x="departamento",
                y="monto",
                color="grupo_gasto_label",
                key="grupos_departamento",
                hover_data={
                    "grupo_gasto": True,
                    "monto": ":,.0f",
                    "valor_label": False,
                },
            )

            st.dataframe(grupos_dept, use_container_width=True, hide_index=True)

        with c2:
            st.subheader("Por Grupo ETA")

            grupos_eta = groups_by_dimension(entidades_f, "grupo_eta")

            render_bar_v(
                grupos_eta,
                x="grupo_eta",
                y="monto",
                color="grupo_gasto_label",
                key="grupos_eta",
                hover_data={
                    "grupo_gasto": True,
                    "monto": ":,.0f",
                    "valor_label": False,
                },
            )

            st.dataframe(grupos_eta, use_container_width=True, hide_index=True)

    # ========================================================
    # PROGRAMAS
    # ========================================================
    with tab_programas:
        st.subheader("Programas")

        if programas_f.empty:
            st.warning("No hay programas para los filtros seleccionados.")
        else:
            total_programas_monto = programas_f["total"].sum()

            p1, p2, p3 = st.columns(3)
            p1.metric("Programas", format_int(len(programas_f)))
            p2.metric("Monto total", format_bs(total_programas_monto))
            p3.metric("Entidades", format_int(programas_f["codigo_entidad"].nunique()))

            top_programas = programas_f.sort_values("total", ascending=False).head(top_n).copy()
            top_programas["programa_entidad"] = make_program_entity_label(top_programas)

            render_bar_h(
                top_programas,
                x="total",
                y="programa_entidad",
                color="departamento",
                key="programas_top",
                hover_data={
                    "codigo_entidad": True,
                    "nombre_entidad": True,
                    "prg": True,
                    "descripcion": True,
                    "grupo_eta": True,
                    "tipo": True,
                    "total": ":,.0f",
                    "valor_label": False,
                    "programa_entidad": False,
                },
                title_height_base=700,
            )

            c1, c2 = st.columns(2)

            with c1:
                st.subheader("Programas por departamento")

                prog_dept = (
                    programas_f.groupby("departamento", dropna=False)
                    .agg(
                        total=("total", "sum"),
                        programas=("prg", "count"),
                        entidades=("codigo_entidad", "nunique"),
                    )
                    .reset_index()
                    .sort_values("total", ascending=False)
                )

                render_bar_h(
                    prog_dept,
                    x="total",
                    y="departamento",
                    key="programas_departamento",
                    hover_data={
                        "programas": True,
                        "entidades": True,
                        "total": ":,.0f",
                        "valor_label": False,
                    },
                )

                st.dataframe(
                    format_money_column(prog_dept, "total", total_programas_monto),
                    use_container_width=True,
                    hide_index=True,
                )

            with c2:
                st.subheader("Programas por Grupo ETA")

                prog_eta = (
                    programas_f.groupby("grupo_eta", dropna=False)
                    .agg(
                        total=("total", "sum"),
                        programas=("prg", "count"),
                        entidades=("codigo_entidad", "nunique"),
                    )
                    .reset_index()
                    .sort_values("total", ascending=False)
                )

                render_bar_h(
                    prog_eta,
                    x="total",
                    y="grupo_eta",
                    key="programas_eta",
                    hover_data={
                        "programas": True,
                        "entidades": True,
                        "total": ":,.0f",
                        "valor_label": False,
                    },
                )

                st.dataframe(
                    format_money_column(prog_eta, "total", total_programas_monto),
                    use_container_width=True,
                    hide_index=True,
                )

            st.subheader("Tabla de programas")

            programas_table = format_group_cols_table(
                programas_f.sort_values("total", ascending=False),
                total_col="total",
                table_total_for_total_col=total_programas_monto,
            )
            st.dataframe(programas_table, use_container_width=True, hide_index=True)

            st.download_button(
                "Descargar programas CSV",
                data=programas_f.to_csv(index=False).encode("utf-8-sig"),
                file_name="programas_sigep_2026.csv",
                mime="text/csv",
            )

    # ========================================================
    # CASCADA
    # ========================================================
    with tab_cascada:
        st.subheader("Cascada por entidad")

        entidades_options = entidades_f.copy()
        entidades_options["label"] = (
            entidades_options["codigo_entidad"].astype(str)
            + " · "
            + entidades_options["nombre_entidad"].astype(str)
        )

        selected_cascada = st.selectbox(
            "Selecciona entidad",
            options=entidades_options.sort_values("nombre_entidad")["label"].tolist(),
            key="select_entidad_cascada",
        )

        selected_codigo_cascada = selected_cascada.split(" · ")[0].strip()

        entidad_cascada = entidades_f[
            entidades_f["codigo_entidad"].astype(str) == selected_codigo_cascada
        ].iloc[0]

        st.markdown(f"### {entidad_cascada['nombre_entidad']}")
        st.caption(
            f"Código: `{entidad_cascada['codigo_entidad']}` · "
            f"Departamento: **{entidad_cascada['departamento']}** · "
            f"Grupo ETA: **{entidad_cascada['grupo_eta']}** · "
            f"Tipo: **{entidad_cascada['tipo']}**"
        )

        render_programas_cascada(
            programas_base=programas_f,
            subprogramas_base=subprogramas_f,
            codigo_entidad=selected_codigo_cascada,
            titulo="Programas → subprogramas / actividades",
            key_prefix="tab_cascada",
        )

    # ========================================================
    # RECURSOS / INGRESOS
    # ========================================================
    with tab_recursos:
        st.subheader("Recursos / Ingresos por rubro")

        if recursos_entidad_f.empty:
            st.warning("No hay recursos para los filtros seleccionados.")
        else:
            total_recursos = recursos_entidad_f["ingresos_total"].sum()

            r1, r2, r3 = st.columns(3)
            r1.metric("Ingresos presupuestados", format_bs(total_recursos))
            r2.metric("Entidades", format_int(recursos_entidad_f["codigo_entidad"].nunique()))
            r3.metric("Filas detalle", format_int(len(recursos_detalle_f)))

            st.subheader("Ranking de ingresos por entidad")

            top_rec_ent = recursos_entidad_f.sort_values("ingresos_total", ascending=False).head(top_n)

            render_bar_h(
                top_rec_ent,
                x="ingresos_total",
                y="nombre_entidad",
                color="departamento",
                key="recursos_ranking_entidad",
                hover_data={
                    "codigo_entidad": True,
                    "departamento": True,
                    "grupo_eta": True,
                    "tipo": True,
                    "ingresos_total": ":,.0f",
                    "valor_label": False,
                },
            )

            c1, c2 = st.columns(2)

            with c1:
                st.subheader("Ingresos por rubro nivel 1")

                rubro_agg = (
                    recursos_rubro_f.groupby(["rubro", "descripcion"], dropna=False)
                    .agg(importe=("importe", "sum"))
                    .reset_index()
                    .sort_values("importe", ascending=False)
                )

                rubro_agg["rubro_label"] = (
                    rubro_agg["rubro"].astype(str)
                    + " · "
                    + rubro_agg["descripcion"].astype(str)
                )

                render_bar_h(
                    rubro_agg,
                    x="importe",
                    y="rubro_label",
                    key="recursos_rubro_nivel1",
                    hover_data={
                        "rubro": True,
                        "descripcion": True,
                        "importe": ":,.0f",
                        "valor_label": False,
                        "rubro_label": False,
                    },
                )

                st.dataframe(
                    format_money_column(
                        rubro_agg.drop(columns=["rubro_label"]),
                        "importe",
                        total_recursos,
                    ),
                    use_container_width=True,
                    hide_index=True,
                )

            with c2:
                st.subheader("Ingresos por departamento")

                rec_dept = (
                    recursos_entidad_f.groupby("departamento", dropna=False)
                    .agg(
                        ingresos_total=("ingresos_total", "sum"),
                        entidades=("codigo_entidad", "nunique"),
                    )
                    .reset_index()
                    .sort_values("ingresos_total", ascending=False)
                )

                render_bar_h(
                    rec_dept,
                    x="ingresos_total",
                    y="departamento",
                    key="recursos_departamento",
                    hover_data={
                        "entidades": True,
                        "ingresos_total": ":,.0f",
                        "valor_label": False,
                    },
                )

                st.dataframe(
                    format_money_column(rec_dept, "ingresos_total", total_recursos),
                    use_container_width=True,
                    hide_index=True,
                )

            st.subheader("Detalle de recursos por rubro / fuente / organismo")

            recursos_detalle_display = recursos_detalle_f.sort_values("importe", ascending=False).copy()
            recursos_detalle_display["importe"] = recursos_detalle_display["importe"].apply(
                lambda x: format_bs_pct(x, total_recursos)
            )

            st.dataframe(recursos_detalle_display, use_container_width=True, hide_index=True)

            st.download_button(
                "Descargar recursos detalle CSV",
                data=recursos_detalle_f.to_csv(index=False).encode("utf-8-sig"),
                file_name="recursos_detalle_sigep_2026.csv",
                mime="text/csv",
            )

    # ========================================================
    # OBJETO DEL GASTO
    # ========================================================
    with tab_objeto:
        st.subheader("Objeto del gasto / partida presupuestaria")

        if objeto_entidad_f.empty:
            st.warning("No hay datos de objeto del gasto para los filtros seleccionados.")
        else:
            total_obj = objeto_entidad_f["gasto_total_objeto"].sum()

            o1, o2, o3 = st.columns(3)
            o1.metric("Gasto por objeto/fuente", format_bs(total_obj))
            o2.metric("Entidades", format_int(objeto_entidad_f["codigo_entidad"].nunique()))
            o3.metric("Filas detalle", format_int(len(objeto_detalle_f)))

            st.subheader("Objeto del gasto nivel 1")

            obj_agg = (
                objeto_nivel1_f.groupby(["objeto_gasto", "descripcion"], dropna=False)
                .agg(total=("total", "sum"))
                .reset_index()
                .sort_values("total", ascending=False)
            )

            obj_agg["objeto_label"] = (
                obj_agg["objeto_gasto"].astype(str)
                + " · "
                + obj_agg["descripcion"].astype(str)
            )

            render_bar_h(
                obj_agg,
                x="total",
                y="objeto_label",
                key="objeto_nivel1",
                hover_data={
                    "objeto_gasto": True,
                    "descripcion": True,
                    "total": ":,.0f",
                    "valor_label": False,
                    "objeto_label": False,
                },
            )

            st.dataframe(
                format_money_column(obj_agg.drop(columns=["objeto_label"]), "total", total_obj),
                use_container_width=True,
                hide_index=True,
            )

            c1, c2 = st.columns(2)

            with c1:
                st.subheader("Objeto del gasto por departamento")

                obj_dept = (
                    objeto_entidad_f.groupby("departamento", dropna=False)
                    .agg(
                        gasto_total_objeto=("gasto_total_objeto", "sum"),
                        entidades=("codigo_entidad", "nunique"),
                    )
                    .reset_index()
                    .sort_values("gasto_total_objeto", ascending=False)
                )

                render_bar_h(
                    obj_dept,
                    x="gasto_total_objeto",
                    y="departamento",
                    key="objeto_departamento",
                    hover_data={
                        "entidades": True,
                        "gasto_total_objeto": ":,.0f",
                        "valor_label": False,
                    },
                )

                st.dataframe(
                    format_money_column(obj_dept, "gasto_total_objeto", total_obj),
                    use_container_width=True,
                    hide_index=True,
                )

            with c2:
                st.subheader("Fuentes de financiamiento en objeto del gasto")

                fuente_agg = (
                    objeto_fuente_largo_f.groupby("fuente_columna", dropna=False)
                    .agg(monto=("monto", "sum"))
                    .reset_index()
                    .sort_values("monto", ascending=False)
                )

                render_bar_h(
                    fuente_agg,
                    x="monto",
                    y="fuente_columna",
                    key="objeto_fuente_columna",
                    hover_data={
                        "monto": ":,.0f",
                        "valor_label": False,
                    },
                )

                st.dataframe(
                    format_money_column(fuente_agg, "monto", fuente_agg["monto"].sum()),
                    use_container_width=True,
                    hide_index=True,
                )

            st.subheader("Detalle por objeto del gasto")

            objeto_detalle_display = objeto_detalle_f.sort_values("total", ascending=False).copy()
            objeto_detalle_display["total"] = objeto_detalle_display["total"].apply(
                lambda x: format_bs_pct(x, total_obj)
            )

            st.dataframe(objeto_detalle_display, use_container_width=True, hide_index=True)

            st.download_button(
                "Descargar objeto del gasto detalle CSV",
                data=objeto_detalle_f.to_csv(index=False).encode("utf-8-sig"),
                file_name="objeto_gasto_detalle_sigep_2026.csv",
                mime="text/csv",
            )

            st.subheader("Objeto del gasto por fuente en formato largo")

            fuente_largo_display = objeto_fuente_largo_f.sort_values("monto", ascending=False).copy()
            fuente_largo_display["monto"] = fuente_largo_display["monto"].apply(
                lambda x: format_bs_pct(x, objeto_fuente_largo_f["monto"].sum())
            )

            st.dataframe(fuente_largo_display, use_container_width=True, hide_index=True)

    # ========================================================
    # ENTIDAD
    # ========================================================
    with tab_entidad:
        st.subheader("Ficha completa por entidad")

        entidades_options = entidades_f.copy()
        entidades_options["label"] = (
            entidades_options["codigo_entidad"].astype(str)
            + " · "
            + entidades_options["nombre_entidad"].astype(str)
        )

        selected = st.selectbox(
            "Selecciona una entidad",
            options=entidades_options.sort_values("nombre_entidad")["label"].tolist(),
            key="select_entidad_ficha",
        )

        selected_codigo = selected.split(" · ")[0].strip()

        entidad = entidades_f[entidades_f["codigo_entidad"] == selected_codigo].iloc[0]

        st.markdown(f"### {entidad['nombre_entidad']}")
        st.caption(
            f"Código: `{entidad['codigo_entidad']}` · "
            f"Departamento: **{entidad['departamento']}** · "
            f"Grupo ETA: **{entidad['grupo_eta']}** · "
            f"Tipo: **{entidad['tipo']}**"
        )

        rec_ent = recursos_entidad[
            recursos_entidad["codigo_entidad"] == selected_codigo
        ]

        obj_ent = objeto_entidad[
            objeto_entidad["codigo_entidad"] == selected_codigo
        ]

        ingreso_ent = rec_ent["ingresos_total"].sum() if not rec_ent.empty else 0
        objeto_ent = obj_ent["gasto_total_objeto"].sum() if not obj_ent.empty else 0

        e1, e2, e3, e4 = st.columns(4)
        e1.metric("Gasto categoría/grupo", format_bs(entidad["presupuesto_total"]))
        e2.metric("Ingreso por rubro", format_bs(ingreso_ent))
        e3.metric("Objeto/Fuente", format_bs(objeto_ent))
        e4.metric("Diferencia ingreso-gasto", format_bs(ingreso_ent - entidad["presupuesto_total"]))

        st.divider()

        render_programas_cascada(
            programas_base=programas,
            subprogramas_base=subprogramas,
            codigo_entidad=selected_codigo,
            titulo="Programas → subprogramas / actividades",
            key_prefix="tab_entidad_cascada",
        )

        st.divider()

        # ----------------------------------------------------
        # Recursos entidad
        # ----------------------------------------------------
        st.subheader("Recursos de la entidad")

        recursos_entidad_det = recursos_detalle[
            recursos_detalle["codigo_entidad"] == selected_codigo
        ].sort_values("importe", ascending=False)

        recursos_entidad_rubro = recursos_rubro[
            recursos_rubro["codigo_entidad"] == selected_codigo
        ].sort_values("importe", ascending=False)

        if recursos_entidad_det.empty:
            st.info("No hay recursos para esta entidad.")
        else:
            rec_total_ent = recursos_entidad_det["importe"].sum()

            rr1, rr2, rr3 = st.columns(3)
            rr1.metric("Ingresos presupuestados", format_bs(rec_total_ent))
            rr2.metric("Rubros nivel 1", format_int(len(recursos_entidad_rubro)))
            rr3.metric("Filas detalle", format_int(len(recursos_entidad_det)))

            if not recursos_entidad_rubro.empty:
                st.markdown("**Recursos por rubro nivel 1**")

                recursos_entidad_rubro_chart = recursos_entidad_rubro.copy()
                recursos_entidad_rubro_chart["rubro_label"] = (
                    recursos_entidad_rubro_chart["rubro"].astype(str)
                    + " · "
                    + recursos_entidad_rubro_chart["descripcion"].astype(str)
                )

                render_bar_h(
                    recursos_entidad_rubro_chart,
                    x="importe",
                    y="rubro_label",
                    key=f"entidad_recursos_rubro_{selected_codigo}",
                    hover_data={
                        "rubro": True,
                        "descripcion": True,
                        "importe": ":,.0f",
                        "valor_label": False,
                        "rubro_label": False,
                    },
                    title_height_base=450,
                )

                recursos_rubro_display = recursos_entidad_rubro.copy()
                recursos_rubro_display["importe"] = recursos_rubro_display["importe"].apply(
                    lambda x: format_bs_pct(x, rec_total_ent)
                )

                st.dataframe(
                    recursos_rubro_display,
                    use_container_width=True,
                    hide_index=True,
                )

            st.markdown("**Recursos por fuente / organismo**")

            fuente_recursos = (
                recursos_entidad_det.groupby(["fuente", "organismo"], dropna=False)
                .agg(importe=("importe", "sum"))
                .reset_index()
                .sort_values("importe", ascending=False)
            )

            fuente_recursos["fuente_organismo"] = (
                "FTE "
                + fuente_recursos["fuente"].astype(str)
                + " · ORG "
                + fuente_recursos["organismo"].astype(str)
            )

            render_bar_h(
                fuente_recursos.head(top_n),
                x="importe",
                y="fuente_organismo",
                key=f"entidad_recursos_fuente_organismo_{selected_codigo}",
                hover_data={
                    "fuente": True,
                    "organismo": True,
                    "importe": ":,.0f",
                    "valor_label": False,
                    "fuente_organismo": False,
                },
                title_height_base=450,
            )

            fuente_recursos_display = fuente_recursos.copy()
            fuente_recursos_display["importe"] = fuente_recursos_display["importe"].apply(
                lambda x: format_bs_pct(x, rec_total_ent)
            )

            st.dataframe(
                fuente_recursos_display,
                use_container_width=True,
                hide_index=True,
            )

            st.markdown("**Detalle de recursos por rubro**")

            rec_display = recursos_entidad_det.copy()
            rec_display["importe"] = rec_display["importe"].apply(
                lambda x: format_bs_pct(x, rec_total_ent)
            )

            st.dataframe(rec_display, use_container_width=True, hide_index=True)

        st.divider()

        # ----------------------------------------------------
        # Objeto entidad
        # ----------------------------------------------------
        st.subheader("Objeto del gasto de la entidad")

        objeto_entidad_det = objeto_detalle[
            objeto_detalle["codigo_entidad"] == selected_codigo
        ].sort_values("total", ascending=False)

        objeto_entidad_nivel1 = objeto_nivel1[
            objeto_nivel1["codigo_entidad"] == selected_codigo
        ].sort_values("total", ascending=False)

        if objeto_entidad_det.empty:
            st.info("No hay objeto del gasto para esta entidad.")
        else:
            obj_total_ent = objeto_entidad_det["total"].sum()

            oo1, oo2, oo3 = st.columns(3)
            oo1.metric("Gasto objeto/fuente", format_bs(obj_total_ent))
            oo2.metric("Objetos nivel 1", format_int(len(objeto_entidad_nivel1)))
            oo3.metric("Filas detalle", format_int(len(objeto_entidad_det)))

            if not objeto_entidad_nivel1.empty:
                st.markdown("**Objeto del gasto nivel 1**")

                objeto_nivel1_chart = objeto_entidad_nivel1.copy()
                objeto_nivel1_chart["objeto_label"] = (
                    objeto_nivel1_chart["objeto_gasto"].astype(str)
                    + " · "
                    + objeto_nivel1_chart["descripcion"].astype(str)
                )

                render_bar_h(
                    objeto_nivel1_chart,
                    x="total",
                    y="objeto_label",
                    key=f"entidad_objeto_nivel1_{selected_codigo}",
                    hover_data={
                        "objeto_gasto": True,
                        "descripcion": True,
                        "total": ":,.0f",
                        "valor_label": False,
                        "objeto_label": False,
                    },
                    title_height_base=450,
                )

                objeto_nivel1_display = objeto_entidad_nivel1.copy()
                objeto_nivel1_display["total"] = objeto_nivel1_display["total"].apply(
                    lambda x: format_bs_pct(x, obj_total_ent)
                )

                st.dataframe(
                    objeto_nivel1_display,
                    use_container_width=True,
                    hide_index=True,
                )

            st.markdown("**Top partidas / objetos detalle**")

            objeto_detalle_chart = objeto_entidad_det.head(top_n).copy()
            objeto_detalle_chart["objeto_label"] = (
                objeto_detalle_chart["objeto_gasto"].astype(str)
                + " · "
                + objeto_detalle_chart["descripcion"].astype(str)
            )

            render_bar_h(
                objeto_detalle_chart,
                x="total",
                y="objeto_label",
                key=f"entidad_objeto_detalle_top_{selected_codigo}",
                hover_data={
                    "objeto_gasto": True,
                    "objeto_padre": True,
                    "nivel_objeto": True,
                    "entidad_transferencia": True,
                    "descripcion": True,
                    "total": ":,.0f",
                    "valor_label": False,
                    "objeto_label": False,
                },
                title_height_base=600,
            )

            obj_display = objeto_entidad_det.copy()
            obj_display["total"] = obj_display["total"].apply(
                lambda x: format_bs_pct(x, obj_total_ent)
            )

            st.dataframe(obj_display, use_container_width=True, hide_index=True)

        st.divider()

        # ----------------------------------------------------
        # Objeto por fuente entidad
        # ----------------------------------------------------
        st.subheader("Objeto del gasto por fuente de la entidad")

        objeto_fuente_ent = objeto_fuente_largo[
            objeto_fuente_largo["codigo_entidad"] == selected_codigo
        ].sort_values("monto", ascending=False)

        if objeto_fuente_ent.empty:
            st.info("No hay desglose por fuente para esta entidad.")
        else:
            fuente_ent_agg = (
                objeto_fuente_ent.groupby("fuente_columna", dropna=False)
                .agg(monto=("monto", "sum"))
                .reset_index()
                .sort_values("monto", ascending=False)
            )

            render_bar_h(
                fuente_ent_agg,
                x="monto",
                y="fuente_columna",
                key=f"entidad_fuente_{selected_codigo}",
                hover_data={
                    "monto": ":,.0f",
                    "valor_label": False,
                },
                title_height_base=450,
            )

            st.dataframe(
                format_money_column(fuente_ent_agg, "monto", fuente_ent_agg["monto"].sum()),
                use_container_width=True,
                hide_index=True,
            )

            st.markdown("**Objeto del gasto × fuente en detalle**")

            fuente_detalle_display = objeto_fuente_ent.copy()
            fuente_detalle_display["monto"] = fuente_detalle_display["monto"].apply(
                lambda x: format_bs_pct(x, objeto_fuente_ent["monto"].sum())
            )

            st.dataframe(
                fuente_detalle_display,
                use_container_width=True,
                hide_index=True,
            )

    # ========================================================
    # VALIDACIÓN INTEGRADA
    # ========================================================
    with tab_validacion:
        st.subheader("Validación integrada")

        v = validacion_integrada_f.copy()

        v1, v2, v3, v4 = st.columns(4)
        v1.metric("Entidades", format_int(len(v)))
        v2.metric("Diff ingresos vs gastos", format_bs(v["diff_ingresos_vs_gastos"].sum()))
        v3.metric("Diff objeto vs categoría", format_bs(v["diff_objeto_vs_categoria"].sum()))
        v4.metric(
            "Entidades con diferencias",
            format_int(
                len(
                    v[
                        (v["diff_ingresos_vs_gastos"].abs() > TOLERANCIA_BS)
                        | (v["diff_objeto_vs_categoria"].abs() > TOLERANCIA_BS)
                    ]
                )
            ),
        )

        st.subheader("Cruce de fases")

        v_display = v.copy()
        money_cols = [
            "gastos_categoria_grupo",
            "ingresos_recursos_rubro",
            "gastos_objeto_fuente",
            "diff_ingresos_vs_gastos",
            "diff_objeto_vs_categoria",
        ]

        for col in money_cols:
            if col in v_display.columns:
                v_display[col] = v_display[col].map(format_bs)

        st.dataframe(v_display, use_container_width=True, hide_index=True)

        bad = v[
            (v["diff_ingresos_vs_gastos"].abs() > TOLERANCIA_BS)
            | (v["diff_objeto_vs_categoria"].abs() > TOLERANCIA_BS)
        ].copy()

        if bad.empty:
            st.success("Todas las entidades cuadran entre las fases integradas.")
        else:
            st.warning("Hay entidades con diferencias entre fases.")
            bad_display = bad.copy()

            for col in money_cols:
                if col in bad_display.columns:
                    bad_display[col] = bad_display[col].map(format_bs)

            st.dataframe(bad_display, use_container_width=True, hide_index=True)

        st.download_button(
            "Descargar validación integrada CSV",
            data=v.to_csv(index=False).encode("utf-8-sig"),
            file_name="validacion_integrada_sigep_2026.csv",
            mime="text/csv",
        )


if __name__ == "__main__":
    main()