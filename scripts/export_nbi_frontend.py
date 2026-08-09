
import json
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]

AUDIT_CSV = ROOT / "data" / "auditoria" / "audit_nbi_sigep_matching.csv"

FRONTEND_DATA = ROOT / "frontend" / "public" / "data"

OUT_JSON = FRONTEND_DATA / "nbi_municipios_2024.json"
ENTIDADES_JSON = FRONTEND_DATA / "entidades.json"
ENTIDADES_INDICADORES_JSON = FRONTEND_DATA / "entidades_indicadores.json"

GEOJSON_CANDIDATES = [
    FRONTEND_DATA / "municipios_presupuesto_liviano.geojson",
    FRONTEND_DATA / "municipios_presupuesto.geojson",
]


NBI_FIELDS = [
    "nbi_inadecuados_materiales_vivienda",
    "nbi_insuficientes_espacios_vivienda",
    "nbi_inadecuados_agua_saneamiento",
    "nbi_inadecuados_insumos_energeticos",
    "nbi_insuficiencia_educacion",
    "nbi_inadecuada_atencion_salud",
    "nbi_no_pobre_pct",
    "nbi_necesidades_basicas_satisfechas_pct",
    "nbi_umbral_pct",
    "nbi_pobre_pct",
    "nbi_pobre_moderada_pct",
    "nbi_pobre_indigente_pct",
    "nbi_pobre_marginal_pct",
]


def as_float(value):
    if pd.isna(value):
        return None
    try:
        return float(value)
    except Exception:
        return None


def as_int(value):
    if pd.isna(value):
        return None
    try:
        return int(round(float(value)))
    except Exception:
        return None


def main() -> None:
    if not AUDIT_CSV.exists():
        raise SystemExit(f"No existe auditoría: {AUDIT_CSV}")

    audit = pd.read_csv(AUDIT_CSV, encoding="utf-8-sig")

    matched = audit[audit["codigo_entidad"].notna()].copy()
    matched["codigo_entidad"] = matched["codigo_entidad"].astype(str).str.replace(r"\.0$", "", regex=True)

    if len(matched) != 341:
        raise SystemExit(f"Se esperaban 341 matches NBI, pero hay {len(matched)}")

    if matched["codigo_entidad"].duplicated().any():
        dups = matched[matched["codigo_entidad"].duplicated(keep=False)]
        raise SystemExit("Hay códigos SIGEP duplicados en matching NBI:\n" + dups.to_string(index=False))

    rows = []

    for _, row in matched.iterrows():
        item = {
            "codigo_entidad": str(row["codigo_entidad"]),
            "nombre_entidad": row.get("nombre_entidad"),
            "departamento": row.get("departamento_sigep"),
            "grupo_eta": row.get("grupo_eta"),
            "tipo": row.get("tipo"),
            "departamento_nbi": row.get("departamento_nbi"),
            "provincia_nbi": row.get("provincia_nbi"),
            "municipio_nbi": row.get("municipio_nbi"),
            "match_status": row.get("status"),
            "fuente": "INE Bolivia, Censo 2024, Necesidades Básicas Insatisfechas",
            "gestion": 2024,
            "es_dato_censal": True,
        }

        for field in NBI_FIELDS:
            if field.startswith("nbi_inadecuados") or field.startswith("nbi_insuficiencia"):
                item[field] = as_int(row.get(field))
            else:
                item[field] = as_float(row.get(field))

        rows.append(item)

    FRONTEND_DATA.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")

    nbi_by_code = {row["codigo_entidad"]: row for row in rows}

    def enrich_items(items):
        for item in items:
            codigo = str(item.get("codigo_entidad") or "")
            extra = nbi_by_code.get(codigo)

            item["nbi_2024_es_dato_censal"] = False
            item["nbi_2024_match_status"] = None

            for field in NBI_FIELDS:
                item[field] = None

            if extra:
                item["nbi_2024_es_dato_censal"] = True
                item["nbi_2024_match_status"] = extra["match_status"]

                for field in NBI_FIELDS:
                    item[field] = extra.get(field)

        return items

    if ENTIDADES_JSON.exists():
        entidades = json.loads(ENTIDADES_JSON.read_text(encoding="utf-8"))
        entidades = enrich_items(entidades)
        ENTIDADES_JSON.write_text(json.dumps(entidades, ensure_ascii=False, indent=2), encoding="utf-8")
        print("OK enriquecido:", ENTIDADES_JSON)

    if ENTIDADES_INDICADORES_JSON.exists():
        indicadores = json.loads(ENTIDADES_INDICADORES_JSON.read_text(encoding="utf-8"))
        indicadores = enrich_items(indicadores)
        ENTIDADES_INDICADORES_JSON.write_text(json.dumps(indicadores, ensure_ascii=False, indent=2), encoding="utf-8")
        print("OK enriquecido:", ENTIDADES_INDICADORES_JSON)

    for geo_path in GEOJSON_CANDIDATES:
        if not geo_path.exists():
            continue

        geo = json.loads(geo_path.read_text(encoding="utf-8"))

        for feature in geo.get("features", []):
            props = feature.get("properties") or {}
            codigo = str(props.get("codigo_entidad") or "")
            extra = nbi_by_code.get(codigo)

            props["nbi_2024_es_dato_censal"] = False
            props["nbi_2024_match_status"] = None

            for field in NBI_FIELDS:
                props[field] = None

            if extra:
                props["nbi_2024_es_dato_censal"] = True
                props["nbi_2024_match_status"] = extra["match_status"]

                for field in NBI_FIELDS:
                    props[field] = extra.get(field)

            feature["properties"] = props

        geo_path.write_text(json.dumps(geo, ensure_ascii=False), encoding="utf-8")
        print("OK GeoJSON:", geo_path)

    print("OK JSON:", OUT_JSON)
    print("Registros exportados:", len(rows))

    print("\nMuestra:")
    for row in rows[:10]:
        print(row["codigo_entidad"], row["municipio_nbi"], row["nbi_pobre_pct"])


if __name__ == "__main__":
    main()
