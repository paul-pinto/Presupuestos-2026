import json
import re
import unicodedata
from pathlib import Path

import pandas as pd


GEO_PATH = Path("data/geografia/bolivia_PIBpc_municipal_2021.geojson")
INDICADORES_PATH = Path("frontend/public/data/entidades_indicadores.json")
FISCALES_PATH = Path("frontend/public/data/indicadores_fiscales.json")
EQUIV_PATH = Path("data/manual/equivalencias_mapa_municipal.csv")

OUTPUT_PATH = Path("frontend/public/data/municipios_presupuesto.geojson")
AUDIT_MATCH_PATH = Path("data/auditoria/mapa_municipal_export_match.csv")
AUDIT_PENDING_PATH = Path("data/auditoria/mapa_municipal_export_pendientes.csv")


def fix_mojibake(value):
    if value is None:
        return ""

    text = str(value)

    if text.lower() == "nan":
        return ""

    try:
        fixed = text.encode("latin1").decode("utf-8")
        if "Ã" in text or "�" in text:
            return fixed
        return text
    except Exception:
        return text


def norm(value):
    text = fix_mojibake(value)
    text = text.lower().strip()
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def safe_number(value):
    if value is None:
        return None

    try:
        if pd.isna(value):
            return None
    except Exception:
        pass

    try:
        return float(value)
    except Exception:
        return None


def main():
    print("Cargando GeoJSON base...")
    raw = json.loads(GEO_PATH.read_text(encoding="utf-8"))

    print("Cargando indicadores...")
    indicadores = pd.DataFrame(json.loads(INDICADORES_PATH.read_text(encoding="utf-8")))
    fiscales = pd.DataFrame(json.loads(FISCALES_PATH.read_text(encoding="utf-8")))

    print("Preparando equivalencias...")
    equivalencias = pd.DataFrame()
    if EQUIV_PATH.exists():
        equivalencias = pd.read_csv(EQUIV_PATH)
        equivalencias["depto_key"] = equivalencias["departamento_geo"].map(norm)
        equivalencias["mun_key"] = equivalencias["municipio_geo"].map(norm)
        equivalencias["mun_key_equiv"] = equivalencias["municipio_ine"].map(norm)

    indicadores["depto_key"] = indicadores["departamento"].map(norm)
    indicadores["mun_key"] = indicadores["municipio_ine"].map(norm)

    fiscales = fiscales.copy()
    fiscales["codigo_entidad"] = fiscales["codigo_entidad"].astype(str)

    indicadores["codigo_entidad"] = indicadores["codigo_entidad"].astype(str)

    indicadores_full = indicadores.merge(
        fiscales,
        on="codigo_entidad",
        how="left",
        suffixes=("", "_fiscal"),
    )

    lookup = {
        (row["depto_key"], row["mun_key"]): row.to_dict()
        for _, row in indicadores_full.iterrows()
    }

    equiv_lookup = {}
    if len(equivalencias):
        equiv_lookup = {
            (row["depto_key"], row["mun_key"]): row["mun_key_equiv"]
            for _, row in equivalencias.iterrows()
        }

    features_out = []
    audit_rows = []
    pending_rows = []

    total_features = 0
    valid_features = 0
    matched = 0
    skipped_invalid = 0

    for feature in raw.get("features", []):
        total_features += 1
        props = dict(feature.get("properties") or {})

        departamento_geo = fix_mojibake(props.get("DEPARTAMEN"))
        provincia_geo = fix_mojibake(props.get("PROVINCIA"))
        municipio_geo = fix_mojibake(props.get("MUNICIPIO"))
        capital_geo = fix_mojibake(props.get("CAPITAL"))
        municipio_alternativo = fix_mojibake(props.get("MUN_ALTERN"))

        if not departamento_geo or not municipio_geo:
            skipped_invalid += 1
            continue

        valid_features += 1

        depto_key = norm(departamento_geo)
        mun_key_original = norm(municipio_geo)
        mun_key = equiv_lookup.get((depto_key, mun_key_original), mun_key_original)

        indicador = lookup.get((depto_key, mun_key))

        base_props = {
            "departamento_geo": departamento_geo,
            "provincia_geo": provincia_geo,
            "municipio_geo": municipio_geo,
            "capital_geo": capital_geo,
            "municipio_alternativo": municipio_alternativo,
            "pibpc_2021": safe_number(props.get("PIBpc_2021_wmean")),
            "decil_pibpc_2021": safe_number(props.get("decile")),
        }

        if indicador:
            matched += 1

            enriched = {
                **base_props,
                "has_presupuesto": True,
                "codigo_entidad": indicador.get("codigo_entidad"),
                "nombre_entidad": indicador.get("nombre_entidad"),
                "departamento": indicador.get("departamento"),
                "tipo": indicador.get("tipo"),
                "grupo_eta": indicador.get("grupo_eta"),
                "provincia_ine": indicador.get("provincia_ine"),
                "municipio_ine": indicador.get("municipio_ine"),
                "poblacion_2024": safe_number(indicador.get("poblacion_2024")),
                "presupuesto_total": safe_number(indicador.get("presupuesto_total")),
                "presupuesto_per_capita": safe_number(indicador.get("presupuesto_per_capita")),
                "ingresos_total": safe_number(indicador.get("ingresos_total")),
                "autonomia_fiscal_pct": safe_number(indicador.get("autonomia_fiscal_pct")),
                "autonomia_fiscal_aplica": bool(indicador.get("autonomia_fiscal_aplica")) if indicador.get("autonomia_fiscal_aplica") is not None else False,
                "dependencia_tgn_pct": safe_number(indicador.get("dependencia_tgn_pct")),
                "coparticipacion_pct": safe_number(indicador.get("coparticipacion_pct")),
                "idh_pct": safe_number(indicador.get("idh_pct")),
                "regalias_pct": safe_number(indicador.get("regalias_pct")),
                "recursos_especificos_gam_gaioc_pct": safe_number(indicador.get("recursos_especificos_gam_gaioc_pct")),
            }

            audit_rows.append(enriched)
        else:
            enriched = {
                **base_props,
                "has_presupuesto": False,
                "codigo_entidad": None,
                "nombre_entidad": None,
                "departamento": None,
                "tipo": None,
                "grupo_eta": None,
                "provincia_ine": None,
                "municipio_ine": None,
                "poblacion_2024": None,
                "presupuesto_total": None,
                "presupuesto_per_capita": None,
                "ingresos_total": None,
                "autonomia_fiscal_pct": None,
                "autonomia_fiscal_aplica": False,
                "dependencia_tgn_pct": None,
                "coparticipacion_pct": None,
                "idh_pct": None,
                "regalias_pct": None,
                "recursos_especificos_gam_gaioc_pct": None,
            }

            pending_rows.append(enriched)

        feature_out = {
            "type": "Feature",
            "properties": enriched,
            "geometry": feature.get("geometry"),
        }

        features_out.append(feature_out)

    out = {
        "type": "FeatureCollection",
        "name": "municipios_presupuesto_bolivia_2026",
        "features": features_out,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(out, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    AUDIT_MATCH_PATH.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(audit_rows).to_csv(AUDIT_MATCH_PATH, index=False, encoding="utf-8-sig")
    pd.DataFrame(pending_rows).to_csv(AUDIT_PENDING_PATH, index=False, encoding="utf-8-sig")

    print()
    print("=== EXPORT MAPA MUNICIPAL ===")
    print("Features originales:", total_features)
    print("Features válidas:", valid_features)
    print("Descartadas inválidas:", skipped_invalid)
    print("Matcheadas:", matched)
    print("Sin dato presupuestario:", valid_features - matched)
    print("GeoJSON generado:", OUTPUT_PATH)
    print("Auditoría match:", AUDIT_MATCH_PATH)
    print("Auditoría pendientes:", AUDIT_PENDING_PATH)


if __name__ == "__main__":
    main()
