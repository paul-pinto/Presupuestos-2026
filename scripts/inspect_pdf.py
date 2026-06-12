import sys
from pathlib import Path

import pdfplumber


pdf_path = Path(sys.argv[1])

print("PDF:", pdf_path)
print("exists:", pdf_path.exists())
print("size_bytes:", pdf_path.stat().st_size if pdf_path.exists() else None)

with pdfplumber.open(pdf_path) as pdf:
    print("pages:", len(pdf.pages))

    for i, page in enumerate(pdf.pages[:5], start=1):
        print(f"\n--- PAGE {i} ---")
        text = page.extract_text(x_tolerance=1, y_tolerance=3) or ""
        print(text[:6000] if text else "[NO TEXT]")