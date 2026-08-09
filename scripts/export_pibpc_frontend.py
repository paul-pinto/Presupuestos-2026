
import json
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]

AUDIT_CSV = ROOT / "data" / "auditoria" / "audit_pibpc_sigep_matching.csv"

FRONTEND_DATA = ROOT / "frontend" / "public" / "data"

OUT_JSON = FRONTEND_DATA / "pibpc_municipios_2021.json"
ENTIDADES_INDICADORES_JSON = FRONTEND_DATA / "entidades_indicadores.json"
ENTIDADES_JSON = FRONTEND_DATA / "entidades.json"

GEOJSON_CANDIDATES = [
    FRONTEND_DATA / "municipios_presupuesto_liviano.geojson",
    FRONTEND_DATA / "municipios_presupuesto.geojson",
]


def as_float(value):
    if pd.isna(value):
        return None
    return float(value)


def main() -> None:
    if not AUDIT_CSV.exists():
        raise SystemExit(f"No existe auditoría: {AUDIT_CSV}")

    audit = pd.read_csv(AUDIT_CSV, encoding="utf-8-sig")

    matched = audit[audit["codigo_entidad"].notna()].copy()
    matched["codigo_entidad"] = matched["codigo_entidad"].astype(str).str.replace(r"\.0$", "", regex=True)

    if len(matched) != 340:
        raise SystemExit(f"Se esperaban 340 matches PIBpc, pero hay {len(matched)}")

    if matched["codigo_entidad"].duplicated().any():
        dups = matched[matched["codigo_entidad"].duplicated(keep=False)]
        raise SystemExit("Hay códigos SIGEP duplicados en matching:\n" + dups.to_string(index=False))

    rows = []

    for _, row in matched.iterrows():
        rows.append({
            "codigo_entidad": str(row["codigo_entidad"]),
            "nombre_entidad": row.get("nombre_entidad"),
            "departamento": row.get("departamento_sigep"),
            "grupo_eta": row.get("grupo_eta"),
            "tipo": row.get("tipo"),
            "departamento_pibpc": row.get("departamento_pibpc"),
            "provincia_pibpc": row.get("provincia_pibpc"),
            "municipio_pibpc": row.get("municipio_pibpc"),
            "municipio_alt_pibpc": row.get("municipio_alt_pibpc"),
            "pib_estimado_usd2017_2021": as_float(row.get("pib_usd2017")),
            "poblacion_estimada_pibpc_2021": as_float(row.get("poblacion_estimada_2021")),
            "pibpc_usd2017_2021": as_float(row.get("pibpc_usd2017")),
            "match_status": row.get("status"),
            "metodologia": "Estimación espacial municipal propia con grilla Rossi-Hansberg & Zhang 2021 y WorldPop 2021 como ponderador",
            "unidad_pib": "USD constantes de 2017",
            "es_estimacion": True,
        })

    FRONTEND_DATA.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")

    pibpc_by_code = {row["codigo_entidad"]: row for row in rows}

    # Enriquecer entidades_indicadores.json
    if ENTIDADES_INDICADORES_JSON.exists():
        data = json.loads(ENTIDADES_INDICADORES_JSON.read_text(encoding="utf-8"))

        for item in data:
            codigo = str(item.get("codigo_entidad") or "")
            extra = pibpc_by_code.get(codigo)

            item["pib_estimado_usd2017_2021"] = None
            item["poblacion_estimada_pibpc_2021"] = None
            item["pibpc_usd2017_2021"] = None
            item["pibpc_2021_es_estimacion"] = False
            item["pibpc_2021_match_status"] = None

            if extra:
                item["pib_estimado_usd2017_2021"] = extra["pib_estimado_usd2017_2021"]
                item["poblacion_estimada_pibpc_2021"] = extra["poblacion_estimada_pibpc_2021"]
                item["pibpc_usd2017_2021"] = extra["pibpc_usd2017_2021"]
                item["pibpc_2021_es_estimacion"] = True
                item["pibpc_2021_match_status"] = extra["match_status"]

        ENTIDADES_INDICADORES_JSON.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    # Enriquecer entidades.json también, para fichas y tablas generales.
    if ENTIDADES_JSON.exists():
        entidades = json.loads(ENTIDADES_JSON.read_text(encoding="utf-8"))

        for item in entidades:
            codigo = str(item.get("codigo_entidad") or "")
            extra = pibpc_by_code.get(codigo)

            item["pib_estimado_usd2017_2021"] = None
            item["poblacion_estimada_pibpc_2021"] = None
            item["pibpc_usd2017_2021"] = None
            item["pibpc_2021_es_estimacion"] = False
            item["pibpc_2021_match_status"] = None

            if extra:
                item["pib_estimado_usd2017_2021"] = extra["pib_estimado_usd2017_2021"]
                item["poblacion_estimada_pibpc_2021"] = extra["poblacion_estimada_pibpc_2021"]
                item["pibpc_usd2017_2021"] = extra["pibpc_usd2017_2021"]
                item["pibpc_2021_es_estimacion"] = True
                item["pibpc_2021_match_status"] = extra["match_status"]

        ENTIDADES_JSON.write_text(
            json.dumps(entidades, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    # Enriquecer GeoJSON del mapa si existe código_entidad.
    for geo_path in GEOJSON_CANDIDATES:
        if not geo_path.exists():
            continue

        geo = json.loads(geo_path.read_text(encoding="utf-8"))

        for feature in geo.get("features", []):
            props = feature.get("properties") or {}
            codigo = str(props.get("codigo_entidad") or "")
            extra = pibpc_by_code.get(codigo)

            props["pib_estimado_usd2017_2021"] = None
            props["poblacion_estimada_pibpc_2021"] = None
            props["pibpc_usd2017_2021"] = None
            props["pibpc_2021_es_estimacion"] = False
            props["pibpc_2021_match_status"] = None

            if extra:
                props["pib_estimado_usd2017_2021"] = extra["pib_estimado_usd2017_2021"]
                props["poblacion_estimada_pibpc_2021"] = extra["poblacion_estimada_pibpc_2021"]
                props["pibpc_usd2017_2021"] = extra["pibpc_usd2017_2021"]
                props["pibpc_2021_es_estimacion"] = True
                props["pibpc_2021_match_status"] = extra["match_status"]

            feature["properties"] = props

        geo_path.write_text(json.dumps(geo, ensure_ascii=False), encoding="utf-8")
        print("OK GeoJSON:", geo_path)

    print("OK JSON:", OUT_JSON)
    print("Registros exportados:", len(rows))

    print("\nMuestra:")
    for row in rows[:10]:
        print(row["codigo_entidad"], row["municipio_pibpc"], row["pibpc_usd2017_2021"])


if __name__ == "__main__":
    main()
