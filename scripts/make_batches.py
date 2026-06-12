import argparse
from pathlib import Path
import pandas as pd


def main():
    parser = argparse.ArgumentParser(description="Divide entidades_sigep.csv en lotes.")
    parser.add_argument("--input", default="config/entidades_sigep.csv")
    parser.add_argument("--out", default="config/batches")
    parser.add_argument("--size", type=int, default=50)
    args = parser.parse_args()

    in_path = Path(args.input)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(in_path, dtype={"codigo_entidad": str})
    total = len(df)

    for i in range(0, total, args.size):
        lote_num = i // args.size + 1
        out_path = out_dir / f"entidades_lote_{lote_num:02}.csv"
        df.iloc[i:i + args.size].to_csv(out_path, index=False, encoding="utf-8-sig")
        print(f"[OK] {out_path} -> {len(df.iloc[i:i + args.size])} entidades")

    print(f"[OK] Total entidades: {total}")
    print(f"[OK] Lotes creados: {(total + args.size - 1) // args.size}")


if __name__ == "__main__":
    main()
