import json
import re
import unicodedata
from pathlib import Path

import pandas as pd


GEO_PATH = Path("data/geografia/bolivia_PIBpc_municipal_2021.geojson")
INDICADORES_PATH = Path("frontend/public/data/entidades_indicadores.json")
FISCALES_PATH = Path("frontend/public/data/indicadores_fiscales.json")
EQUIV_PATH = Path("data/manual/equivalencias_mapa_municipal.csv")


def fix_mojibake(value):
    if value is None:
        return ""

    text = str(value)

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


def read_geojson_properties(path):
    with path.open(encoding="utf-8") as f:
        data = json.load(f)

    rows = []
    for feature in data.get("features", []):
        props = dict(feature.get("properties") or {})
        rows.append(props)

    return pd.DataFrame(rows), data


def main():
    print("Cargando GeoJSON municipal...")
    if not GEO_PATH.exists():
        raise SystemExit(f"No existe: {GEO_PATH}")

    geo, raw_geojson = read_geojson_properties(GEO_PATH)

    print("Cargando indicadores...")
    indicadores = pd.DataFrame(json.loads(INDICADORES_PATH.read_text(encoding="utf-8")))
    fiscales = pd.DataFrame(json.loads(FISCALES_PATH.read_text(encoding="utf-8")))

    equivalencias = pd.DataFrame()
    if EQUIV_PATH.exists():
        equivalencias = pd.read_csv(EQUIV_PATH)
        equivalencias["depto_key"] = equivalencias["departamento_geo"].map(norm)
        equivalencias["mun_key"] = equivalencias["municipio_geo"].map(norm)
        equivalencias["mun_key_equiv"] = equivalencias["municipio_ine"].map(norm)

    print()
    print("=== GEOJSON ===")
    print("Features:", len(raw_geojson.get("features", [])))
    print("Columnas:")
    for col in geo.columns:
        print("-", col)

    print()
    print("=== MUESTRA GEOJSON ===")
    print(geo.head(10).to_string(index=False))

    print()
    print("=== INDICADORES ===")
    print("Filas:", len(indicadores))
    print("Columnas:", list(indicadores.columns))

    required = ["DEPARTAMEN", "PROVINCIA", "MUNICIPIO"]
    missing = [col for col in required if col not in geo.columns]
    if missing:
        raise SystemExit(f"Faltan columnas esperadas en GeoJSON: {missing}")

    geo["departamento_geo"] = geo["DEPARTAMEN"].map(fix_mojibake)
    geo["provincia_geo"] = geo["PROVINCIA"].map(fix_mojibake)
    geo["municipio_geo"] = geo["MUNICIPIO"].map(fix_mojibake)

    geo["depto_key"] = geo["departamento_geo"].map(norm)
    geo["mun_key"] = geo["municipio_geo"].map(norm)

    if len(equivalencias):
        geo = geo.merge(
            equivalencias[["depto_key", "mun_key", "mun_key_equiv"]],
            on=["depto_key", "mun_key"],
            how="left",
        )
        geo["mun_key"] = geo["mun_key_equiv"].fillna(geo["mun_key"])
        geo = geo.drop(columns=["mun_key_equiv"])

    indicadores["depto_key"] = indicadores["departamento"].map(norm)
    indicadores["mun_key"] = indicadores["municipio_ine"].map(norm)

    cruce = geo.merge(
        indicadores,
        on=["depto_key", "mun_key"],
        how="left",
        suffixes=("_geo", "_sigep"),
    )

    total_geo = len(cruce)
    matched = int(cruce["codigo_entidad"].notna().sum())
    pendientes = int(cruce["codigo_entidad"].isna().sum())

    print()
    print("=== CRUCE GEOJSON ↔ SIGEP/INE ===")
    print("Municipios en GeoJSON:", total_geo)
    print("Matcheados:", matched)
    print("Pendientes:", pendientes)
    print("Porcentaje match:", round(matched / total_geo * 100, 2), "%")

    pendientes_df = cruce[cruce["codigo_entidad"].isna()][
        ["departamento_geo", "provincia_geo", "municipio_geo"]
    ].sort_values(["departamento_geo", "provincia_geo", "municipio_geo"])

    out_dir = Path("data/auditoria")
    out_dir.mkdir(parents=True, exist_ok=True)

    pendientes_path = out_dir / "mapa_municipal_pendientes.csv"
    cruce_path = out_dir / "mapa_municipal_cruce.csv"

    pendientes_df.to_csv(pendientes_path, index=False, encoding="utf-8-sig")
    cruce.to_csv(cruce_path, index=False, encoding="utf-8-sig")

    print()
    print("Pendientes guardados en:", pendientes_path)
    print("Cruce completo guardado en:", cruce_path)

    print()
    print("=== PRIMEROS PENDIENTES ===")
    if len(pendientes_df):
        print(pendientes_df.head(50).to_string(index=False))
    else:
        print("Sin pendientes.")


if __name__ == "__main__":
    main()
