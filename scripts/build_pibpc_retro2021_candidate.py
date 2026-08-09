import json
import math
import re
import unicodedata
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]

# Ajustá este input si tu CSV benchmarkeado tiene otro nombre.
CANDIDATE_INPUTS = [
    ROOT / "Resultados" / "PIBpc_municipios_2021_benchmark_INE.csv",
    ROOT / "Resultados" / "PIBpc_municipios_2021_benchmarked.csv",
    ROOT / "Resultados" / "PIBpc_municipios_2021.csv",
    ROOT / "data" / "manual" / "PIBpc_municipios_2021.csv",
]

POB_RETRO_XLSX = ROOT / "data" / "manual" / "Auditoria_poblacion_municipal_2021.xlsx"
POB_2024_CSV = ROOT / "data" / "manual" / "poblacion_municipal_2024.csv"

OUT_DIR = ROOT / "Resultados"
OUT_DIR.mkdir(parents=True, exist_ok=True)

OUT_CANDIDATE = OUT_DIR / "PIBpc_municipios_2021_candidato_final_retro2021.csv"
OUT_AUDIT = OUT_DIR / "audit_pibpc_retro2021_candidate.csv"
OUT_UNMATCHED = OUT_DIR / "audit_pibpc_retro2021_sin_poblacion.csv"


STOPWORDS = [
    "gobierno autonomo municipal de",
    "gobierno autonomo municipal del",
    "gobierno autonomo indigena originario campesino de",
    "gobierno autonomo indigena originario campesino del",
    "gobierno indigena autonomo del",
    "autonomia del territorio indigena originario campesino",
    "autonomia originaria",
]


ALIASES = {
    "puerto guayaramerin": "guayaramerin",
    "guayaramerin": "guayaramerin",
    "villa vaca guzman": "muyupampa",
    "muyupampa": "muyupampa",
    "huacaya": "huacaya",
    "corocoro": "coro coro",
    "coro coro": "coro coro",
    "carabuco": "carabuco",
    "pto carabuco": "carabuco",
    "puerto carabuco": "carabuco",
    "sipe sipe": "sipe sipe",
    "sipesipe": "sipe sipe",
    "sica sica": "sica sica",
    "sicasica": "sica sica",
    "toco": "toco",
    "toko": "toco",
    "cuchumuela": "cuchumuela",
    "villa gualberto villarroel": "cuchumuela",
    "choquecota": "choquecota",
    "choque cota": "choquecota",
    "salinas": "salinas",
    "salinas de garcia mendoza": "salinas",
    "chipaya": "chipaya",
    "uru chipaya": "chipaya",
    "san pedro de totora": "totora",
    "totora": "totora",
    "san pedro de buena vista": "san pedro de buena vista",
    "s p de buena vista": "san pedro de buena vista",
    "sacaca": "sacaca",
    "villa de sacaca": "sacaca",
    "villa desacaca": "sacaca",
    "san lorenzo": "san lorenzo",
    "villa san lorenzo": "san lorenzo",
    "san jose": "san jose de chiquitos",
    "san jose de chiquitos": "san jose de chiquitos",
    "san josede chiquitos": "san jose de chiquitos",
    "gutierrez": "gutierrez",
    "general agustin saavedra": "general agustin saavedra",
    "general saavedra": "general agustin saavedra",
    "gral saavedra": "general agustin saavedra",
    "ascencion de guarayos": "ascencion de guarayos",
    "ascension de guarayos": "ascencion de guarayos",
    "santa ana": "santa ana",
    "santa ana de yacuma": "santa ana",
    "puerto gonzalo moreno": "puerto gonzalo moreno",
    "puerto gonzales moreno": "puerto gonzalo moreno",
    # Equivalencias entre nombres del CSV PIB 340 y la auditoría de población retrospectiva 339.
    "charagua autonomia guarani charagua iyambae": "charagua",
    "gutierrez autonomia indigena kereimba iyaambae": "gutierrez",
    "santiago de andamarca": "andamarca",
    "andamarca": "andamarca",
    "huayllamarca": "huayllamarca",
    "santiago de huayllamarca": "huayllamarca",
    "villa ricardo mugia icla": "icla",
    "icla": "icla",
    "jesus de machaca": "jesus de machaka",
    "jesus de machaka": "jesus de machaka",
    "huacaya autonomia guarani chaqueno de huacaya": "huacaya",
    "pampa grande": "pampagrande",
    "pampagrande": "pampagrande",
    "uru chipaya nacion originaria uru chipaya": "chipaya",
    "salinas de garci mendoza": "salinas",
    "salinas de garci mendoza autonomia indigena originario campesina de salinas": "salinas",
    "tioc raqaypampa": "raqaypampa",
    "raqaypampa": "raqaypampa",
}


def normalize(value: object) -> str:
    text = str(value or "").strip().lower()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.replace("ñ", "n")
    text = re.sub(r"[^a-z0-9 ]+", " ", text)

    for stopword in STOPWORDS:
        sw = unicodedata.normalize("NFKD", stopword.lower())
        sw = "".join(ch for ch in sw if not unicodedata.combining(ch))
        sw = sw.replace("ñ", "n")
        text = text.replace(sw, " ")

    text = re.sub(r"\s+", " ", text).strip()
    return ALIASES.get(text, text)


def find_input() -> Path:
    for path in CANDIDATE_INPUTS:
        if path.exists():
            return path

    matches = sorted(ROOT.rglob("*PIBpc*2021*.csv"))
    if matches:
        print("No encontré nombre esperado. Usaré este CSV encontrado:")
        print(matches[0])
        return matches[0]

    raise SystemExit("No encontré ningún CSV PIBpc 2021. Revisá la ruta del CSV benchmarkeado.")


def pick_col(df: pd.DataFrame, candidates: list[str], required=True) -> str | None:
    normalized = {normalize(col): col for col in df.columns}

    for candidate in candidates:
        key = normalize(candidate)
        if key in normalized:
            return normalized[key]

    for col in df.columns:
        col_key = normalize(col)
        for candidate in candidates:
            if normalize(candidate) in col_key:
                return col

    if required:
        raise SystemExit(
            "No encontré columna. Candidatas: "
            + ", ".join(candidates)
            + "\nColumnas disponibles:\n"
            + "\n".join(map(str, df.columns))
        )

    return None


def calc_retro_2021(p2012, p2024):
    if p2012 is None or p2024 is None:
        return None

    try:
        p2012 = float(p2012)
        p2024 = float(p2024)
    except Exception:
        return None

    if not math.isfinite(p2012) or not math.isfinite(p2024):
        return None

    if p2012 <= 0 or p2024 <= 0:
        return None

    return p2012 * ((p2024 / p2012) ** (9 / 12))


def main():
    input_csv = find_input()
    print("INPUT PIB:", input_csv)

    pib = pd.read_csv(input_csv, encoding="utf-8-sig")

    dept_col = pick_col(pib, ["departamento", "DEPARTAMENTO", "departamen"], required=False)
    mun_col = pick_col(
        pib,
        [
            "municipio",
            "MUNICIPIO",
            "municipio_pibpc",
            "municipio_geo",
            "nombre_municipio",
            "MUN_ALTERN",
        ],
    )

    pib_col = pick_col(
        pib,
        [
            "pib_benchmark_usd2017_2021",
            "pib_estimado_benchmark_usd2017_2021",
            "PIB_BENCHMARK_2021",
            "pib_estimado_usd2017_2021",
            "PIB_ESTIMADO_USD2017_2021",
            "PIB_2021",
            "pib",
        ],
    )

    old_pop_col = pick_col(
        pib,
        [
            "POB_ESTIMADA",
            "poblacion_estimada_pibpc_2021",
            "poblacion_estimada",
            "population",
        ],
        required=False,
    )

    if not POB_RETRO_XLSX.exists():
        raise SystemExit(f"No existe {POB_RETRO_XLSX}")

    indicadores = pd.read_excel(POB_RETRO_XLSX, sheet_name="Auditoria 339")

    ind_dept_col = pick_col(indicadores, ["Departamento"], required=False)
    ind_mun_col = pick_col(indicadores, ["Municipio (geografía 339)", "Municipio"])
    ind_p2012_col = pick_col(indicadores, ["Censo 2012"])
    ind_p2024_col = pick_col(indicadores, ["Censo 2024"])
    ind_retro_col = pick_col(indicadores, ["2021 retrospectivo"])

    pop_lookup = {}

    for _, row in indicadores.iterrows():
        # En esta auditoría el departamento puede venir vacío; usamos match por municipio.
        key_mun = normalize(row[ind_mun_col])

        if not key_mun:
            continue

        retro = row[ind_retro_col]
        if retro is None or pd.isna(retro):
            retro = calc_retro_2021(row[ind_p2012_col], row[ind_p2024_col])

        if retro is None or pd.isna(retro):
            continue

        pop_lookup[key_mun] = {
            "codigo_entidad": None,
            "poblacion_2012": row[ind_p2012_col],
            "poblacion_2024": row[ind_p2024_col],
            "pob_retro_2021": float(retro),
            "pop_match_key": key_mun,
        }

    # Raqaypampa no está separado en la auditoría 339,
    # pero sí existe en el Censo 2024 local con P2012 y P2024.
    # Se calcula con la misma fórmula retrospectiva 2012-2024.
    if POB_2024_CSV.exists():
        pob2024 = pd.read_csv(POB_2024_CSV, encoding="utf-8-sig")
        if {"municipio", "poblacion_2012", "poblacion_2024"}.issubset(pob2024.columns):
            mask = pob2024["municipio"].astype(str).map(normalize).str.contains("raqaypampa", na=False)
            if mask.any():
                r = pob2024.loc[mask].iloc[0]
                retro = calc_retro_2021(r["poblacion_2012"], r["poblacion_2024"])
                if retro is not None:
                    pop_lookup["raqaypampa"] = {
                        "codigo_entidad": "3301",
                        "poblacion_2012": r["poblacion_2012"],
                        "poblacion_2024": r["poblacion_2024"],
                        "pob_retro_2021": float(retro),
                        "pop_match_key": "raqaypampa",
                    }


    # Mantener Raqaypampa separado si existe en indicadores.
    # No lo fusionamos con Mizque ni con otra unidad.
    out_rows = []
    audit_rows = []

    for _, row in pib.iterrows():
        dept = row.get(dept_col) if dept_col else ""
        mun = row.get(mun_col)

        key = normalize(dept) + "|" + normalize(mun)
        mun_key = normalize(mun)
        pop = pop_lookup.get(mun_key)

        new_row = row.to_dict()

        pib_value = pd.to_numeric(pd.Series([row.get(pib_col)]), errors="coerce").iloc[0]

        if pop is not None and pd.notna(pib_value) and pop["pob_retro_2021"] > 0:
            pibpc = float(pib_value) / float(pop["pob_retro_2021"])
            status = "ok"
        else:
            pibpc = None
            status = "sin_poblacion_retro_2021"

        if old_pop_col and old_pop_col in new_row:
            new_row["POB_ESTIMADA_RHZ_WORLDPOP"] = new_row.get(old_pop_col)

        new_row["POB_RETRO_2021"] = None if pop is None else round(float(pop["pob_retro_2021"]), 6)
        new_row["POB_2012_INE"] = None if pop is None else pop["poblacion_2012"]
        new_row["POB_2024_CENSO"] = None if pop is None else pop["poblacion_2024"]
        new_row["PIB_MUNICIPAL_BENCHMARK_USD2017_2021"] = pib_value
        new_row["PIBpc_RETRO_2021_USD2017"] = pibpc
        new_row["PIBpc_RETRO_2021_STATUS"] = status
        new_row["PIBpc_RETRO_2021_FORMULA"] = "PIB_MUNICIPAL_BENCHMARK_USD2017_2021 / POB_RETRO_2021"

        out_rows.append(new_row)

        audit_rows.append({
            "status": status,
            "departamento": dept,
            "municipio": mun,
            "match_key": key,
            "pib_col": pib_col,
            "pib_value": pib_value,
            "old_pop_col": old_pop_col,
            "old_pop_value": None if old_pop_col is None else row.get(old_pop_col),
            "pob_2012": None if pop is None else pop["poblacion_2012"],
            "pob_2024": None if pop is None else pop["poblacion_2024"],
            "pob_retro_2021": None if pop is None else pop["pob_retro_2021"],
            "pibpc_retro_2021": pibpc,
        })

    out = pd.DataFrame(out_rows)
    audit = pd.DataFrame(audit_rows)

    out.to_csv(OUT_CANDIDATE, index=False, encoding="utf-8-sig")
    audit.to_csv(OUT_AUDIT, index=False, encoding="utf-8-sig")
    audit[audit["status"].ne("ok")].to_csv(OUT_UNMATCHED, index=False, encoding="utf-8-sig")

    print()
    print("Columnas usadas:")
    print("Departamento:", dept_col)
    print("Municipio:", mun_col)
    print("PIB:", pib_col)
    print("POB_ESTIMADA anterior:", old_pop_col)
    print()
    print("Filas PIB:", len(out))
    print(audit["status"].value_counts(dropna=False).to_string())
    print()
    print("OK candidato:", OUT_CANDIDATE)
    print("OK auditoría:", OUT_AUDIT)
    print("OK sin población:", OUT_UNMATCHED)

    print()
    print("CONTROL")
    for name in ["Guayaramerín", "Puerto Guayaramerín", "Santa Cruz de la Sierra", "El Alto", "Cochabamba", "Raqaypampa"]:
        mask = out[mun_col].astype(str).map(normalize).eq(normalize(name))
        if not mask.any():
            continue
        cols = [mun_col, "POB_RETRO_2021", "PIB_MUNICIPAL_BENCHMARK_USD2017_2021", "PIBpc_RETRO_2021_USD2017"]
        print(out.loc[mask, cols].head(5).to_string(index=False))


if __name__ == "__main__":
    main()
