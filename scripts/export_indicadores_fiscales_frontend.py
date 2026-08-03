import json
from pathlib import Path

BASE = Path(".")
RECURSOS_PATH = BASE / "frontend/public/data/recursos_fuente_organismo.json"
INGRESOS_PATH = BASE / "frontend/public/data/ingresos_vs_gastos.json"
OUT_JSON = BASE / "frontend/public/data/indicadores_fiscales.json"
OUT_CSV = BASE / "data/manual/indicadores_fiscales.csv"

def num(value):
    try:
        return float(value or 0)
    except Exception:
        return 0.0

def pct(value, total):
    total = num(total)
    if total <= 0:
        return 0.0
    return round((num(value) / total) * 100, 6)

def key(row):
    return str(row.get("codigo_entidad", "")).strip()

def main():
    recursos = json.loads(RECURSOS_PATH.read_text(encoding="utf-8"))
    ingresos = json.loads(INGRESOS_PATH.read_text(encoding="utf-8"))

    ingresos_by_entity = {
        key(row): row
        for row in ingresos
        if key(row)
    }

    grouped = {}

    for row in recursos:
        codigo = key(row)
        if not codigo:
            continue

        item = grouped.setdefault(codigo, {
            "codigo_entidad": codigo,
            "nombre_entidad": row.get("nombre_entidad", ""),
            "departamento": row.get("departamento", ""),
            "tipo": row.get("tipo", ""),
            "grupo_eta": row.get("grupo_eta", ""),

            "ingresos_total": 0.0,
            "recursos_especificos": 0.0,
            "recursos_especificos_gam_gaioc": 0.0,
            "otros_recursos_especificos": 0.0,
            "transferencias_tgn": 0.0,
            "coparticipacion": 0.0,
            "idh": 0.0,
            "regalias": 0.0,
            "otros_recursos": 0.0,
        })

        importe = num(row.get("importe"))
        fuente = str(row.get("fuente", "")).strip()
        organismo = str(row.get("organismo", "")).strip()

        # Fuente 20: Recursos Específicos.
        # Para autonomía fiscal estricta solo usamos 20/210:
        # Recursos Específicos de los GAM/GAIOC.
        if fuente == "20":
            item["recursos_especificos"] += importe

            if organismo == "210":
                item["recursos_especificos_gam_gaioc"] += importe
            elif organismo == "220":
                item["regalias"] += importe
            elif organismo == "230":
                item["otros_recursos_especificos"] += importe
            else:
                item["otros_recursos_especificos"] += importe

        # Fuente 41: Transferencias TGN
        elif fuente == "41":
            item["transferencias_tgn"] += importe

            if organismo == "113":
                item["coparticipacion"] += importe
            elif organismo == "119":
                item["idh"] += importe
            else:
                item["otros_recursos"] += importe

    rows = []

    for codigo, item in grouped.items():
        ingreso_row = ingresos_by_entity.get(codigo, {})
        ingresos_total = num(ingreso_row.get("ingresos_total"))

        # fallback: si no viene de ingresos_vs_gastos, sumamos recursos
        if ingresos_total <= 0:
            ingresos_total = (
                item["recursos_especificos"]
                + item["transferencias_tgn"]
                + item["otros_recursos"]
            )

        item["ingresos_total"] = ingresos_total

        # Autonomía fiscal estricta:
        # Solo aplica a GAM/GAIOC y usa únicamente 20/210.
        es_gam_gaioc = item.get("grupo_eta") in ["GAM", "GAIOC"]

        if es_gam_gaioc:
            recursos_propios = item["recursos_especificos_gam_gaioc"]
            item["recursos_propios"] = recursos_propios
            item["autonomia_fiscal_pct"] = pct(recursos_propios, ingresos_total)
            item["autonomia_fiscal_aplica"] = True
            item["autonomia_fiscal_base"] = "20/210 Recursos Específicos GAM/GAIOC"
        else:
            item["recursos_propios"] = None
            item["autonomia_fiscal_pct"] = None
            item["autonomia_fiscal_aplica"] = False
            item["autonomia_fiscal_base"] = "No calculado para entidades no GAM/GAIOC"

        item["dependencia_tgn_pct"] = pct(item["transferencias_tgn"], ingresos_total)
        item["coparticipacion_pct"] = pct(item["coparticipacion"], ingresos_total)
        item["idh_pct"] = pct(item["idh"], ingresos_total)
        item["regalias_pct"] = pct(item["regalias"], ingresos_total)
        item["recursos_especificos_pct"] = pct(item["recursos_especificos"], ingresos_total)
        item["recursos_especificos_gam_gaioc_pct"] = pct(item["recursos_especificos_gam_gaioc"], ingresos_total)
        item["otros_recursos_especificos_pct"] = pct(item["otros_recursos_especificos"], ingresos_total)

        rows.append(item)

    rows.sort(key=lambda r: (r["departamento"], r["nombre_entidad"]))

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(
        json.dumps(rows, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)

    headers = [
        "codigo_entidad",
        "nombre_entidad",
        "departamento",
        "tipo",
        "grupo_eta",
        "ingresos_total",
        "recursos_propios",
        "recursos_especificos",
        "recursos_especificos_gam_gaioc",
        "otros_recursos_especificos",
        "transferencias_tgn",
        "coparticipacion",
        "idh",
        "regalias",
        "otros_recursos",
        "autonomia_fiscal_pct",
        "autonomia_fiscal_aplica",
        "autonomia_fiscal_base",
        "dependencia_tgn_pct",
        "coparticipacion_pct",
        "idh_pct",
        "regalias_pct",
        "recursos_especificos_pct",
        "recursos_especificos_gam_gaioc_pct",
        "otros_recursos_especificos_pct",
    ]

    lines = [",".join(headers)]

    for row in rows:
        values = []
        for header in headers:
            value = row.get(header, "")
            if isinstance(value, str):
                value = '"' + value.replace('"', '""') + '"'
            else:
                value = str(value)
            values.append(value)
        lines.append(",".join(values))

    OUT_CSV.write_text("\n".join(lines), encoding="utf-8")

    print(f"OK JSON: {OUT_JSON}")
    print(f"OK CSV : {OUT_CSV}")
    print(f"Total entidades: {len(rows)}")

    top_autonomia = sorted(rows, key=lambda r: r["autonomia_fiscal_pct"], reverse=True)[:10]
    top_dependencia = sorted(rows, key=lambda r: r["dependencia_tgn_pct"], reverse=True)[:10]

    print("\nTOP autonomía fiscal:")
    for row in top_autonomia:
        print(f'{row["codigo_entidad"]} | {row["nombre_entidad"]} | {row["autonomia_fiscal_pct"]:.2f}%')

    print("\nTOP dependencia TGN:")
    for row in top_dependencia:
        print(f'{row["codigo_entidad"]} | {row["nombre_entidad"]} | {row["dependencia_tgn_pct"]:.2f}%')

if __name__ == "__main__":
    main()
