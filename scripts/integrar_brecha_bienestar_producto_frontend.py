import json
import re
import unicodedata
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
BRECHA_JSON = ROOT / "frontend" / "public" / "data" / "brecha_bienestar_producto.json"

TARGETS = [
    ROOT / "frontend" / "public" / "data" / "municipios_presupuesto.geojson",
    ROOT / "frontend" / "public" / "data" / "municipios_presupuesto_liviano.geojson",
    ROOT / "frontend" / "public" / "data" / "entidades.json",
    ROOT / "frontend" / "public" / "data" / "entidades_indicadores.json",
]


ALIASES = {
    "puerto guayaramerin": "guayaramerin",
    "guayaramerin": "guayaramerin",
    "tioc raqaypampa": "raqaypampa",
    "raqaypampa": "raqaypampa",
    "santa ana de yacuma": "santa ana",
    "santa ana": "santa ana",
    "san jose de chiquitos": "san jose",
    "san jose": "san jose",
    "pampa grande": "pampagrande",
    "pampagrande": "pampagrande",
}


def normalize(value):
    text = str(value or "").strip().lower()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.replace("ñ", "n")
    text = re.sub(r"[^a-z0-9 ]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return ALIASES.get(text, text)


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path, data):
    path.write_text(
        json.dumps(data, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )


def build_lookup():
    rows = read_json(BRECHA_JSON)
    lookup = {}

    for row in rows:
        key = normalize(row.get("departamento")) + "|" + normalize(row.get("municipio"))
        lookup[key] = row

    return lookup


def patch_props(props, lookup):
    dept = props.get("departamento") or props.get("DEPARTAMEN") or props.get("departamento_geo")
    muni = (
        props.get("municipio_ine")
        or props.get("municipio")
        or props.get("MUNICIPIO")
        or props.get("nombre")
        or props.get("nombre_entidad")
    )

    key = normalize(dept) + "|" + normalize(muni)
    row = lookup.get(key)

    if row is None:
        muni_key = normalize(muni)
        candidates = [v for k, v in lookup.items() if k.split("|", 1)[1] == muni_key]
        if len(candidates) == 1:
            row = candidates[0]

    if row is None:
        return False

    props["brecha_bienestar_producto_score"] = row.get("score_brecha_bienestar_producto")
    props["brecha_bienestar_producto_categoria"] = row.get("categoria_brecha")
    props["brecha_bienestar_producto_nivel_pibpc"] = row.get("nivel_pibpc")
    props["brecha_bienestar_producto_nivel_nbi"] = row.get("nivel_nbi")
    props["brecha_bienestar_producto_metodo"] = row.get("metodo")

    return True


def main():
    if not BRECHA_JSON.exists():
        raise SystemExit(f"No existe {BRECHA_JSON}")

    lookup = build_lookup()
    print("Lookup brecha:", len(lookup))

    for path in TARGETS:
        if not path.exists():
            print("SKIP:", path)
            continue

        data = read_json(path)

        if path.suffix == ".geojson":
            total = len(data.get("features", []))
            patched = 0
            for feature in data.get("features", []):
                props = feature.get("properties") or {}
                if patch_props(props, lookup):
                    patched += 1
        else:
            total = len(data)
            patched = 0
            for row in data:
                if patch_props(row, lookup):
                    patched += 1

        write_json(path, data)
        print(f"OK {path.relative_to(ROOT)}: {patched}/{total}")


if __name__ == "__main__":
    main()
