
import json
import re
import unicodedata
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]

PIBPC_CSV = ROOT / "data" / "manual" / "PIBpc_municipios_2021.csv"
ENTIDADES_JSON = ROOT / "frontend" / "public" / "data" / "entidades.json"

OUT_DIR = ROOT / "data" / "auditoria"
OUT_DIR.mkdir(parents=True, exist_ok=True)

OUT_MATCH = OUT_DIR / "audit_pibpc_sigep_matching.csv"
OUT_NO_MATCH_PIBPC = OUT_DIR / "audit_pibpc_sin_entidad_sigep.csv"
OUT_NO_MATCH_SIGEP = OUT_DIR / "audit_sigep_gam_sin_pibpc.csv"
OUT_DUPLICATES = OUT_DIR / "audit_pibpc_sigep_posibles_duplicados.csv"
EQUIV_CSV = ROOT / "data" / "manual" / "equivalencias_pibpc_sigep.csv"


STOPWORDS = [
    "gobierno autonomo municipal de",
    "gobierno autónomo municipal de",
    "gobierno autonomo municipal del",
    "gobierno autónomo municipal del",
    "gobierno autonomo indigena originario campesino de",
    "gobierno autónomo indígena originario campesino de",
    "gobierno autonomo indigena originario campesino del",
    "gobierno autónomo indígena originario campesino del",
]


ALIASES = {
    "nuestra senora de la paz": "la paz",
    "nuestra señora de la paz": "la paz",
    "sipesipe": "sipe sipe",
    "jesus de machaka": "jesus de machaca",
    "jesus de machaca": "jesus de machaca",
    "salinas de garci mendoza": "salinas de garci mendoza",
    "salinas de garcí mendoza": "salinas de garci mendoza",
    "san jose": "san jose de chiquitos",
    "san jose de chiquitos": "san jose de chiquitos",
    "puerto guayaramerin": "guayaramerin",
    "guayaramerin": "guayaramerin",
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


def departamento_key(value: object) -> str:
    return normalize(value)


def main() -> None:
    if not PIBPC_CSV.exists():
        raise SystemExit(f"No existe {PIBPC_CSV}")

    if not ENTIDADES_JSON.exists():
        raise SystemExit(f"No existe {ENTIDADES_JSON}")

    pibpc = pd.read_csv(PIBPC_CSV, encoding="utf-8-sig")

    entidades = pd.DataFrame(json.loads(ENTIDADES_JSON.read_text(encoding="utf-8")))

    gam = entidades[
        (entidades["tipo"].astype(str).str.lower().eq("municipal"))
        | (entidades["grupo_eta"].astype(str).str.upper().eq("GAM"))
        | (entidades["grupo_eta"].astype(str).str.upper().eq("GAIOC"))
    ].copy()

    pibpc["pibpc_key"] = pibpc["MUNICIPIO"].map(normalize)
    pibpc["pibpc_alt_key"] = pibpc["MUN_ALTERN"].map(normalize)
    pibpc["depto_key"] = pibpc["DEPARTAMEN"].map(departamento_key)

    gam["sigep_key"] = gam["nombre_entidad"].map(normalize)
    gam["depto_key"] = gam["departamento"].map(departamento_key)

    equivalencias = {}
    if EQUIV_CSV.exists():
        equiv = pd.read_csv(EQUIV_CSV, encoding="utf-8-sig")
        for _, row in equiv.iterrows():
            key = (
                departamento_key(row.get("departamento_pibpc")),
                normalize(row.get("municipio_pibpc")),
            )
            equivalencias[key] = str(row.get("codigo_entidad")).strip()

    rows = []

    for _, p in pibpc.iterrows():
        candidates = gam[gam["depto_key"].eq(p["depto_key"])].copy()

        manual_key = (p["depto_key"], p["pibpc_key"])
        manual_codigo = equivalencias.get(manual_key)

        if manual_codigo:
            manual = gam[gam["codigo_entidad"].astype(str).eq(manual_codigo)]
            if len(manual) == 1:
                s = manual.iloc[0]
                status = "match_manual"
                rows.append({
                    "status": status,
                    "departamento_pibpc": p["DEPARTAMEN"],
                    "provincia_pibpc": p["PROVINCIA"],
                    "municipio_pibpc": p["MUNICIPIO"],
                    "municipio_alt_pibpc": p["MUN_ALTERN"],
                    "pibpc_key": p["pibpc_key"],
                    "pibpc_alt_key": p["pibpc_alt_key"],
                    "pib_usd2017": p["PIB_USD2017"],
                    "poblacion_estimada_2021": p["POB_ESTIMADA"],
                    "pibpc_usd2017": p["PIBPC_USD2017"],
                    "codigo_entidad": s.get("codigo_entidad"),
                    "nombre_entidad": s.get("nombre_entidad"),
                    "departamento_sigep": s.get("departamento"),
                    "grupo_eta": s.get("grupo_eta"),
                    "tipo": s.get("tipo"),
                    "presupuesto_total_sigep": s.get("presupuesto_total"),
                })
                continue

        exact = candidates[
            candidates["sigep_key"].eq(p["pibpc_key"])
            | candidates["sigep_key"].eq(p["pibpc_alt_key"])
        ]

        if len(exact) == 1:
            s = exact.iloc[0]
            status = "match_exacto"
        elif len(exact) > 1:
            s = exact.iloc[0]
            status = "duplicado_exacto"
        else:
            # Segundo intento: contiene nombre normalizado.
            contains = candidates[
                candidates["sigep_key"].str.contains(re.escape(p["pibpc_key"]), na=False)
                | candidates["sigep_key"].str.contains(re.escape(p["pibpc_alt_key"]), na=False)
                | pd.Series([p["pibpc_key"] in x for x in candidates["sigep_key"]], index=candidates.index)
                | pd.Series([p["pibpc_alt_key"] in x for x in candidates["sigep_key"]], index=candidates.index)
            ]

            if len(contains) == 1:
                s = contains.iloc[0]
                status = "match_contiene"
            elif len(contains) > 1:
                s = contains.iloc[0]
                status = "duplicado_contiene"
            else:
                s = None
                status = "sin_match"

        rows.append({
            "status": status,
            "departamento_pibpc": p["DEPARTAMEN"],
            "provincia_pibpc": p["PROVINCIA"],
            "municipio_pibpc": p["MUNICIPIO"],
            "municipio_alt_pibpc": p["MUN_ALTERN"],
            "pibpc_key": p["pibpc_key"],
            "pibpc_alt_key": p["pibpc_alt_key"],
            "pib_usd2017": p["PIB_USD2017"],
            "poblacion_estimada_2021": p["POB_ESTIMADA"],
            "pibpc_usd2017": p["PIBPC_USD2017"],
            "codigo_entidad": None if s is None else s.get("codigo_entidad"),
            "nombre_entidad": None if s is None else s.get("nombre_entidad"),
            "departamento_sigep": None if s is None else s.get("departamento"),
            "grupo_eta": None if s is None else s.get("grupo_eta"),
            "tipo": None if s is None else s.get("tipo"),
            "presupuesto_total_sigep": None if s is None else s.get("presupuesto_total"),
        })

    audit = pd.DataFrame(rows)

    matched_codes = set(
        audit.loc[audit["codigo_entidad"].notna(), "codigo_entidad"].astype(str)
    )

    sigep_no_match = gam[
        ~gam["codigo_entidad"].astype(str).isin(matched_codes)
    ].copy()

    pibpc_no_match = audit[audit["status"].eq("sin_match")].copy()

    duplicates = audit[audit["status"].str.contains("duplicado", na=False)].copy()

    audit.to_csv(OUT_MATCH, index=False, encoding="utf-8-sig")
    pibpc_no_match.to_csv(OUT_NO_MATCH_PIBPC, index=False, encoding="utf-8-sig")
    sigep_no_match.to_csv(OUT_NO_MATCH_SIGEP, index=False, encoding="utf-8-sig")
    duplicates.to_csv(OUT_DUPLICATES, index=False, encoding="utf-8-sig")

    print("PIBpc municipios:", len(pibpc))
    print("SIGEP GAM/GAIOC candidatos:", len(gam))
    print()
    print(audit["status"].value_counts(dropna=False).to_string())
    print()
    print("PIBpc sin match:", len(pibpc_no_match))
    print("SIGEP GAM/GAIOC sin PIBpc:", len(sigep_no_match))
    print("Duplicados:", len(duplicates))
    print()
    print("OK:", OUT_MATCH)
    print("OK:", OUT_NO_MATCH_PIBPC)
    print("OK:", OUT_NO_MATCH_SIGEP)
    print("OK:", OUT_DUPLICATES)

    if len(pibpc_no_match):
        print("\nPIBpc sin match muestra:")
        print(pibpc_no_match[[
            "departamento_pibpc",
            "provincia_pibpc",
            "municipio_pibpc",
            "municipio_alt_pibpc",
        ]].head(30).to_string(index=False))

    if len(sigep_no_match):
        print("\nSIGEP sin PIBpc muestra:")
        print(sigep_no_match[[
            "codigo_entidad",
            "nombre_entidad",
            "departamento",
            "grupo_eta",
            "tipo",
        ]].head(30).to_string(index=False))


if __name__ == "__main__":
    main()
