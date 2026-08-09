import json
import re
import unicodedata
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]

CANDIDATE = ROOT / "Resultados" / "PIBpc_municipios_2021_candidato_final_retro2021_340.csv"
FRONT = ROOT / "frontend" / "public" / "data"

TARGETS_JSON = [
    FRONT / "entidades.json",
    FRONT / "entidades_indicadores.json",
    FRONT / "pibpc_municipios_2021.json",
]

TARGETS_GEOJSON = [
    FRONT / "municipios_presupuesto.geojson",
    FRONT / "municipios_presupuesto_liviano.geojson",
]


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
    "tioc raqaypampa": "raqaypampa",
    "raqaypampa": "raqaypampa",
    "uru chipaya nacion originaria uru chipaya": "chipaya",
    "chipaya": "chipaya",
    "salinas de garci mendoza autonomia indigena originario campesina de salinas": "salinas",
    "salinas de garci mendoza": "salinas",
    "salinas": "salinas",
    "charagua autonomia guarani charagua iyambae": "charagua",
    "gutierrez autonomia indigena kereimba iyaambae": "gutierrez",
    "gutierrez": "gutierrez",
    "jesus de machaca": "jesus de machaka",
    "jesus de machaka": "jesus de machaka",
    "pampa grande": "pampagrande",
    "pampagrande": "pampagrande",
}


def normalize(value):
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


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path, data):
    path.write_text(
        json.dumps(data, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )


def build_lookup():
    df = pd.read_csv(CANDIDATE, encoding="utf-8-sig")

    lookup = {}

    for _, row in df.iterrows():
        key = normalize(row["DEPARTAMEN"]) + "|" + normalize(row["MUNICIPIO"])

        lookup[key] = {
            "departamento": row["DEPARTAMEN"],
            "municipio": row["MUNICIPIO"],
            "pib_estimado_usd2017_2021": float(row["PIB_MUNICIPAL_BENCHMARK_USD2017_2021"]),
            "poblacion_retro_2021": float(row["POB_RETRO_2021"]),
            "poblacion_2012_ine": None if pd.isna(row["POB_2012_INE"]) else float(row["POB_2012_INE"]),
            "poblacion_2024_censo": None if pd.isna(row["POB_2024_CENSO"]) else float(row["POB_2024_CENSO"]),
            "pibpc_usd2017_2021": float(row["PIBpc_RETRO_2021_USD2017"]),
            "pibpc_2021_metodo": "PIB benchmark INE departamental 2021 / población retrospectiva intercensal 2021",
            "pibpc_2021_denominador": "POB_RETRO_2021",
            "pibpc_2021_es_estimacion": True,
        }

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
    item = lookup.get(key)

    if item is None:
        # fallback solo por municipio si es único
        muni_key = normalize(muni)
        candidates = [v for k, v in lookup.items() if k.split("|", 1)[1] == muni_key]
        if len(candidates) == 1:
            item = candidates[0]

    if item is None:
        return False

    if "pibpc_usd2017_2021_base_worldpop" not in props:
        props["pibpc_usd2017_2021_base_worldpop"] = props.get("pibpc_usd2017_2021")

    props["pib_estimado_usd2017_2021"] = item["pib_estimado_usd2017_2021"]
    props["poblacion_retro_2021"] = item["poblacion_retro_2021"]
    props["poblacion_2012_ine"] = item["poblacion_2012_ine"]
    props["poblacion_2024_censo"] = item["poblacion_2024_censo"]
    props["pibpc_usd2017_2021"] = item["pibpc_usd2017_2021"]
    props["pibpc_usd2017_2021_retro"] = item["pibpc_usd2017_2021"]
    props["pibpc_2021_metodo"] = item["pibpc_2021_metodo"]
    props["pibpc_2021_denominador"] = item["pibpc_2021_denominador"]
    props["pibpc_2021_es_estimacion"] = item["pibpc_2021_es_estimacion"]

    return True


def patch_json_file(path, lookup):
    data = read_json(path)
    count = 0

    for row in data:
        if patch_props(row, lookup):
            count += 1

    write_json(path, data)
    return count, len(data)


def patch_geojson_file(path, lookup):
    data = read_json(path)
    count = 0

    for feature in data.get("features", []):
        props = feature.get("properties") or {}
        if patch_props(props, lookup):
            count += 1

    write_json(path, data)
    return count, len(data.get("features", []))


def main():
    if not CANDIDATE.exists():
        raise SystemExit(f"No existe {CANDIDATE}")

    lookup = build_lookup()
    print("Lookup candidato:", len(lookup))

    for path in TARGETS_JSON:
        if not path.exists():
            print("SKIP:", path)
            continue

        count, total = patch_json_file(path, lookup)
        print(f"OK JSON {path.relative_to(ROOT)}: {count}/{total}")

    for path in TARGETS_GEOJSON:
        if not path.exists():
            print("SKIP:", path)
            continue

        count, total = patch_geojson_file(path, lookup)
        print(f"OK GEOJSON {path.relative_to(ROOT)}: {count}/{total}")


if __name__ == "__main__":
    main()
