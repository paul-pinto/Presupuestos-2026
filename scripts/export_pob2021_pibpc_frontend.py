import json
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]

AUDIT = ROOT / "data" / "auditoria" / "audit_pob2021_sigep_matching.csv"

FRONT_DATA = ROOT / "frontend" / "public" / "data"

FILES = [
    FRONT_DATA / "entidades.json",
    FRONT_DATA / "entidades_indicadores.json",
    FRONT_DATA / "pibpc_municipios_2021.json",
    FRONT_DATA / "municipios_presupuesto.geojson",
    FRONT_DATA / "municipios_presupuesto_liviano.geojson",
]


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data):
    path.write_text(
        json.dumps(data, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )


def to_num(value):
    if value is None:
        return None
    try:
        n = float(value)
    except Exception:
        return None
    if pd.isna(n):
        return None
    return n


def patch_record(row: dict, pop_by_code: dict) -> bool:
    codigo = str(row.get("codigo_entidad", "")).replace(".0", "").strip()
    if not codigo:
        return False

    pob2021 = pop_by_code.get(codigo)
    if pob2021 is None:
        row["poblacion_proyectada_2021"] = None
        row["pibpc_usd2017_2021_ajustado"] = None
        row["pibpc_2021_denominador"] = None
        return False

    pib = to_num(row.get("pib_estimado_usd2017_2021"))

    # Preservar el indicador anterior antes de sobreescribir el campo público.
    if "pibpc_usd2017_2021_base_worldpop" not in row:
        row["pibpc_usd2017_2021_base_worldpop"] = row.get("pibpc_usd2017_2021")

    row["poblacion_proyectada_2021"] = int(pob2021)
    row["pibpc_2021_denominador"] = "poblacion_proyectada_2021"

    if pib is not None and pob2021 > 0:
        ajustado = pib / pob2021
        row["pibpc_usd2017_2021_ajustado"] = ajustado

        # Campo público usado por mapa/ficha/indicadores.
        row["pibpc_usd2017_2021"] = ajustado
        return True

    row["pibpc_usd2017_2021_ajustado"] = None
    return False


def patch_plain_json(path: Path, pop_by_code: dict) -> tuple[int, int]:
    data = read_json(path)
    patched = 0
    adjusted = 0

    for row in data:
        before = row.get("pibpc_usd2017_2021")
        did_adjust = patch_record(row, pop_by_code)
        if str(row.get("codigo_entidad", "")).replace(".0", "").strip() in pop_by_code:
            patched += 1
        if did_adjust and row.get("pibpc_usd2017_2021") != before:
            adjusted += 1

    write_json(path, data)
    return patched, adjusted


def patch_geojson(path: Path, pop_by_code: dict) -> tuple[int, int]:
    data = read_json(path)
    patched = 0
    adjusted = 0

    for feature in data.get("features", []):
        props = feature.get("properties") or {}
        before = props.get("pibpc_usd2017_2021")
        did_adjust = patch_record(props, pop_by_code)
        if str(props.get("codigo_entidad", "")).replace(".0", "").strip() in pop_by_code:
            patched += 1
        if did_adjust and props.get("pibpc_usd2017_2021") != before:
            adjusted += 1

    write_json(path, data)
    return patched, adjusted


def main():
    if not AUDIT.exists():
        raise SystemExit(f"No existe {AUDIT}. Primero corre scripts/audit_pob2021_sigep_match.py")

    audit = pd.read_csv(AUDIT, encoding="utf-8-sig")
    audit["codigo_entidad"] = audit["codigo_entidad"].astype(str).str.replace(r"\.0$", "", regex=True)

    ok = audit[
        audit["codigo_entidad"].notna()
        & audit["codigo_entidad"].ne("")
        & audit["status"].isin(["match_exacto", "match_contiene", "match_manual"])
    ].copy()

    pop_by_code = {
        str(row["codigo_entidad"]).replace(".0", "").strip(): int(row["poblacion_proyectada_2021"])
        for _, row in ok.iterrows()
    }

    print("Poblaciones 2021 listas para integrar:", len(pop_by_code))

    for path in FILES:
        if not path.exists():
            print("SKIP no existe:", path)
            continue

        if path.suffix.lower() == ".geojson":
            patched, adjusted = patch_geojson(path, pop_by_code)
        else:
            patched, adjusted = patch_plain_json(path, pop_by_code)

        print(f"OK {path.relative_to(ROOT)} | población integrada: {patched} | PIBpc recalculado: {adjusted}")

    # Mini control de casos importantes
    entidades = read_json(FRONT_DATA / "entidades_indicadores.json")
    by_code = {str(x.get("codigo_entidad")): x for x in entidades}

    print()
    print("CONTROL")
    for code, name in [
        ("1805", "Puerto Guayaramerín"),
        ("1701", "Santa Cruz de la Sierra"),
        ("1205", "El Alto"),
        ("1301", "Cochabamba"),
        ("1601", "Tarija"),
    ]:
        row = by_code.get(code)
        if not row:
            print(code, name, "NO ENCONTRADO")
            continue

        print(
            code,
            name,
            "| pob2021:",
            row.get("poblacion_proyectada_2021"),
            "| pib:",
            row.get("pib_estimado_usd2017_2021"),
            "| pibpc ajustado:",
            row.get("pibpc_usd2017_2021"),
            "| pibpc base worldpop:",
            row.get("pibpc_usd2017_2021_base_worldpop"),
        )


if __name__ == "__main__":
    main()
