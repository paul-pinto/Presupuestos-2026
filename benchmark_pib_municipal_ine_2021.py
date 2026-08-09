from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd


"""Benchmark departamental del PIB municipal estimado para Bolivia, 2021.

Entrada esperada: la salida municipal v2 (Rossi-Hansberg & Zhang + WorldPop).

Principio:
  * se conserva el PIB nacional municipal asignado en USD constantes de 2017;
  * se conserva la distribución RELATIVA de PIB entre municipios de un mismo
    departamento;
  * la participación de cada departamento se ancla a las cuentas
    departamentales 2021 del INE;
  * la población municipal no se modifica;
  * se recalcula PIBpc a partir del PIB municipal benchmarkeado.

Fuente INE:
  D.10.2.1 Bolivia: Medidas de volumen encadenadas del Producto Interno Bruto,
  según departamento con año de referencia 2017. Millones de bolivianos
  encadenados.
  https://www.ine.gob.bo/referencia2017/pib_departamental.html

Las medidas encadenadas no son estrictamente aditivas fuera del año de
referencia. Por eso los niveles departamentales INE se usan solamente para
construir participaciones normalizadas entre los nueve departamentos; no se
convierten mecánicamente de Bs encadenados a USD.
"""


INE_2021_CHAINED_MILLION_BOB = {
    "Chuquisaca": 14_352.73,
    "La Paz": 82_465.20,
    "Cochabamba": 54_692.60,
    "Oruro": 12_489.80,
    "Potosí": 19_978.84,
    "Tarija": 20_419.33,
    "Santa Cruz": 98_976.96,
    "Beni": 11_299.41,
    "Pando": 3_573.32,
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Benchmark departamental INE 2021 del PIB municipal estimado."
    )
    parser.add_argument(
        "input",
        nargs="?",
        type=Path,
        default=Path("Resultados/PIBpc_municipios_2021.csv"),
        help="CSV municipal v2 (default: Resultados/PIBpc_municipios_2021.csv)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("Resultados/PIBpc_municipios_2021_benchmark_INE.csv"),
        help="CSV municipal benchmarkeado.",
    )
    parser.add_argument(
        "--audit",
        type=Path,
        default=Path("Resultados/audit_benchmark_departamental_INE_2021.csv"),
        help="CSV de auditoría departamental.",
    )
    return parser.parse_args()


def require_columns(df: pd.DataFrame, cols: list[str]) -> None:
    missing = [col for col in cols if col not in df.columns]
    if missing:
        raise ValueError(f"Faltan columnas requeridas: {missing}")


def benchmark(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    required = ["DEPARTAMEN", "MUNICIPIO", "PIB_USD2017", "POB_ESTIMADA"]
    require_columns(df, required)

    out = df.copy()
    out["PIB_USD2017"] = pd.to_numeric(out["PIB_USD2017"], errors="raise")
    out["POB_ESTIMADA"] = pd.to_numeric(out["POB_ESTIMADA"], errors="raise")

    departments = set(out["DEPARTAMEN"].dropna().unique())
    expected = set(INE_2021_CHAINED_MILLION_BOB)
    if departments != expected:
        raise ValueError(
            "Los departamentos del CSV no coinciden con los 9 esperados. "
            f"Faltan={sorted(expected - departments)}; extra={sorted(departments - expected)}"
        )

    current = out.groupby("DEPARTAMEN", sort=False)["PIB_USD2017"].sum()
    national_assigned = float(current.sum())
    ine_total_departments = float(sum(INE_2021_CHAINED_MILLION_BOB.values()))

    ine_share = {
        dep: value / ine_total_departments
        for dep, value in INE_2021_CHAINED_MILLION_BOB.items()
    }
    target = {dep: national_assigned * ine_share[dep] for dep in expected}
    factor = {dep: target[dep] / float(current[dep]) for dep in expected}

    # Preservamos explícitamente los valores anteriores para poder auditar
    # municipio por municipio sin depender de otro archivo.
    out["PIB_USD2017_RHZ_WORLDPOP"] = out["PIB_USD2017"]
    if "PIBPC_USD2017" in out.columns:
        out["PIBPC_USD2017_RHZ_WORLDPOP"] = pd.to_numeric(
            out["PIBPC_USD2017"], errors="coerce"
        )
    else:
        out["PIBPC_USD2017_RHZ_WORLDPOP"] = np.where(
            out["POB_ESTIMADA"] > 0,
            out["PIB_USD2017"] / out["POB_ESTIMADA"],
            np.nan,
        )

    out["FACTOR_BENCHMARK_INE_2021"] = out["DEPARTAMEN"].map(factor)
    out["PART_INE_2021"] = out["DEPARTAMEN"].map(ine_share)
    out["PIB_USD2017"] = (
        out["PIB_USD2017_RHZ_WORLDPOP"] * out["FACTOR_BENCHMARK_INE_2021"]
    )
    out["PIBPC_USD2017"] = np.where(
        out["POB_ESTIMADA"] > 0,
        out["PIB_USD2017"] / out["POB_ESTIMADA"],
        np.nan,
    )

    rows: list[dict[str, float | str]] = []
    for dep, ine_value in INE_2021_CHAINED_MILLION_BOB.items():
        before = float(current[dep])
        after = float(out.loc[out["DEPARTAMEN"].eq(dep), "PIB_USD2017"].sum())
        rows.append(
            {
                "DEPARTAMEN": dep,
                "PIB_RHZ_WORLDPOP_USD2017": before,
                "PART_RHZ_WORLDPOP": before / national_assigned,
                "PIB_INE_2021_MM_BOB_ENCADENADOS": ine_value,
                "PART_INE_2021_NORMALIZADA": ine_share[dep],
                "FACTOR_BENCHMARK": factor[dep],
                "PIB_OBJETIVO_USD2017": target[dep],
                "PIB_BENCHMARK_USD2017": after,
                "DIFERENCIA_CIERRE_USD": after - target[dep],
            }
        )
    audit = pd.DataFrame(rows)

    if not np.isclose(out["PIB_USD2017"].sum(), national_assigned, rtol=0, atol=0.01):
        raise AssertionError("El benchmark alteró el PIB nacional asignado.")
    if audit["DIFERENCIA_CIERRE_USD"].abs().max() > 0.01:
        raise AssertionError("Algún departamento no cierra contra su objetivo INE.")

    return out, audit


def main() -> None:
    args = parse_args()
    df = pd.read_csv(args.input, encoding="utf-8-sig")
    result, audit = benchmark(df)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.audit.parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(args.output, index=False, encoding="utf-8-sig")
    audit.to_csv(args.audit, index=False, encoding="utf-8-sig")

    old_total = result["PIB_USD2017_RHZ_WORLDPOP"].sum()
    new_total = result["PIB_USD2017"].sum()
    print("\n========== BENCHMARK INE 2021 ==========")
    print(f"Municipios:                {len(result):,}")
    print(f"PIB antes:          USD {old_total:,.2f}")
    print(f"PIB benchmark:      USD {new_total:,.2f}")
    print(f"Diferencia nacional: USD {new_total - old_total:,.6f}")
    print("\nFactores departamentales:")
    for row in audit.itertuples(index=False):
        print(
            f"  {row.DEPARTAMEN:<12} {row.FACTOR_BENCHMARK:8.5f}  "
            f"({row.PART_RHZ_WORLDPOP * 100:6.2f}% -> "
            f"{row.PART_INE_2021_NORMALIZADA * 100:6.2f}%)"
        )
    print(f"\nCSV:       {args.output.resolve()}")
    print(f"Auditoría: {args.audit.resolve()}")


if __name__ == "__main__":
    main()
