import json
import re
import unicodedata
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]

PIB_CANDIDATE = ROOT / "Resultados" / "PIBpc_municipios_2021_candidato_final_retro2021_340.csv"
NBI_JSON = ROOT / "frontend" / "public" / "data" / "nbi_municipios_2024.json"

OUT_JSON = ROOT / "frontend" / "public" / "data" / "brecha_bienestar_producto.json"
OUT_AUDIT = ROOT / "Resultados" / "audit_brecha_bienestar_producto.csv"


ALIASES = {
    "puerto guayaramerin": "guayaramerin",
    "guayaramerin": "guayaramerin",
    "santa ana de yacuma": "santa ana",
    "santa ana": "santa ana",
    "san jose de chiquitos": "san jose",
    "san jose": "san jose",
    "pampa grande": "pampagrande",
    "pampagrande": "pampagrande",
    "corocoro": "coro coro",
    "coro coro": "coro coro",
    "jesus de machaca": "jesus de machaka",
    "jesus de machaka": "jesus de machaka",
    "tioc raqaypampa": "raqaypampa",
    "raqaypampa": "raqaypampa",
}


def normalize(value):
    text = str(value or "").strip().lower()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.replace("ñ", "n")
    text = re.sub(r"[^a-z0-9 ]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return ALIASES.get(text, text)


def nivel_pibpc(value):
    if pd.isna(value):
        return "sin_dato"
    value = float(value)

    if value >= 3500:
        return "alto"
    if value >= 2500:
        return "medio"
    return "bajo"


def nivel_nbi(value):
    if pd.isna(value):
        return "sin_dato"
    value = float(value)

    if value >= 60:
        return "alto"
    if value >= 40:
        return "medio"
    return "bajo"


def categoria_brecha(pibpc_nivel, nbi_nivel):
    if pibpc_nivel == "sin_dato" or nbi_nivel == "sin_dato":
        return "Sin dato"

    if pibpc_nivel == "alto" and nbi_nivel == "alto":
        return "Producto alto con rezago social"

    if pibpc_nivel == "alto" and nbi_nivel in ["medio", "bajo"]:
        return "Producto alto con mejor bienestar relativo"

    if pibpc_nivel == "medio" and nbi_nivel == "alto":
        return "Producto medio con rezago social"

    if pibpc_nivel == "bajo" and nbi_nivel == "alto":
        return "Rezago estructural"

    if pibpc_nivel == "bajo" and nbi_nivel in ["medio", "bajo"]:
        return "Bajo producto, menor pobreza relativa"

    if pibpc_nivel == "medio" and nbi_nivel == "medio":
        return "Situación intermedia"

    if pibpc_nivel == "medio" and nbi_nivel == "bajo":
        return "Bienestar relativo con producto medio"

    return "Situación intermedia"


def score_brecha(pibpc, nbi):
    """
    Score simple 0-100:
    - sube con NBI alto
    - sube cuando PIBpc también es alto
    - destaca territorios donde hay producto estimado, pero rezago social.
    """
    if pd.isna(pibpc) or pd.isna(nbi):
        return None

    pibpc = float(pibpc)
    nbi = float(nbi)

    pib_component = min(max((pibpc - 1500) / (5000 - 1500), 0), 1)
    nbi_component = min(max(nbi / 100, 0), 1)

    return round((0.55 * nbi_component + 0.45 * pib_component) * 100, 4)


def main():
    if not PIB_CANDIDATE.exists():
        raise SystemExit(f"No existe {PIB_CANDIDATE}")

    if not NBI_JSON.exists():
        raise SystemExit(f"No existe {NBI_JSON}")

    pib = pd.read_csv(PIB_CANDIDATE, encoding="utf-8-sig")
    nbi = pd.DataFrame(json.loads(NBI_JSON.read_text(encoding="utf-8")))

    pib["key"] = pib["DEPARTAMEN"].map(normalize) + "|" + pib["MUNICIPIO"].map(normalize)
    nbi["key"] = nbi["departamento"].map(normalize) + "|" + nbi["municipio_nbi"].map(normalize)

    df = pib.merge(nbi, on="key", how="left", suffixes=("", "_nbi"))

    rows = []

    for _, row in df.iterrows():
        pibpc = row.get("PIBpc_RETRO_2021_USD2017")
        nbi_pobre = row.get("nbi_pobre_pct")

        pib_nivel = nivel_pibpc(pibpc)
        nbi_nivel = nivel_nbi(nbi_pobre)
        categoria = categoria_brecha(pib_nivel, nbi_nivel)
        score = score_brecha(pibpc, nbi_pobre)

        rows.append({
            "departamento": row.get("DEPARTAMEN"),
            "municipio": row.get("MUNICIPIO"),
            "codigo_entidad": row.get("codigo_entidad") if "codigo_entidad" in row else None,
            "poblacion_retro_2021": row.get("POB_RETRO_2021"),
            "pib_estimado_usd2017_2021": row.get("PIB_MUNICIPAL_BENCHMARK_USD2017_2021"),
            "pibpc_usd2017_2021": pibpc,
            "nbi_pobre_pct": nbi_pobre,
            "nbi_pobre_moderada_pct": row.get("nbi_pobre_moderada_pct"),
            "nbi_pobre_indigente_pct": row.get("nbi_pobre_indigente_pct"),
            "nbi_pobre_marginal_pct": row.get("nbi_pobre_marginal_pct"),
            "nivel_pibpc": pib_nivel,
            "nivel_nbi": nbi_nivel,
            "categoria_brecha": categoria,
            "score_brecha_bienestar_producto": score,
            "metodo": "Cruce PIBpc estimado 2021 en USD constantes de 2017 con pobreza NBI 2024",
        })

    out = pd.DataFrame(rows)

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_AUDIT.parent.mkdir(parents=True, exist_ok=True)

    def clean_json_value(value):
        if pd.isna(value):
            return None
        return value

    records = []
    for record in out.to_dict(orient="records"):
        records.append({
            key: clean_json_value(value)
            for key, value in record.items()
        })

    OUT_JSON.write_text(
        json.dumps(
            records,
            ensure_ascii=False,
            separators=(",", ":"),
            allow_nan=False,
        ),
        encoding="utf-8",
    )

    out.to_csv(OUT_AUDIT, index=False, encoding="utf-8-sig")

    print("Filas:", len(out))
    print("Con PIBpc:", out["pibpc_usd2017_2021"].notna().sum())
    print("Con NBI:", out["nbi_pobre_pct"].notna().sum())
    print("Con score:", out["score_brecha_bienestar_producto"].notna().sum())

    print()
    print("Categorías:")
    print(out["categoria_brecha"].value_counts(dropna=False).to_string())

    print()
    print("Top 20 brecha bienestar-producto:")
    print(
        out.sort_values("score_brecha_bienestar_producto", ascending=False)
          [[
              "departamento",
              "municipio",
              "pibpc_usd2017_2021",
              "nbi_pobre_pct",
              "categoria_brecha",
              "score_brecha_bienestar_producto",
          ]]
          .head(20)
          .to_string(index=False)
    )

    print()
    print("OK JSON:", OUT_JSON)
    print("OK AUDIT:", OUT_AUDIT)


if __name__ == "__main__":
    main()
