from pathlib import Path

ROOTS = [
    Path("frontend/src/app"),
    Path("frontend/src/components"),
]

REPLACEMENTS = {
    # Fondos oscuros a fondo claro
    "min-h-screen bg-slate-950 text-slate-100": "min-h-screen bg-slate-50 text-slate-950",
    "min-h-screen bg-slate-950 text-white": "min-h-screen bg-slate-50 text-slate-950",
    "bg-slate-950 text-slate-100": "bg-slate-50 text-slate-950",
    "bg-slate-950 text-white": "bg-slate-50 text-slate-950",

    # Cards oscuras a cards blancas
    "border border-white/10 bg-white/[0.03]": "border border-slate-200 bg-white",
    "border border-white/10 bg-slate-950/60": "border border-slate-200 bg-slate-50",
    "border border-white/10 bg-slate-950": "border border-slate-200 bg-white",
    "border-white/10 bg-white/[0.03]": "border-slate-200 bg-white",
    "border-white/10 bg-slate-950/60": "border-slate-200 bg-slate-50",
    "border-white/10": "border-slate-200",

    # Sombras negras fuertes a sombras suaves
    "shadow-2xl shadow-black/20": "shadow-sm",
    "shadow-2xl shadow-black/30": "shadow-sm",
    "shadow-black/20": "",
    "shadow-black/30": "",

    # Cyan a teal institucional
    "text-cyan-300": "text-teal-700",
    "text-cyan-100": "text-teal-800",
    "border-cyan-300/30": "border-teal-200",
    "bg-cyan-300/10": "bg-teal-50",
    "bg-cyan-300": "bg-teal-700",
    "focus:border-cyan-300/60": "focus:border-teal-500 focus:ring-2 focus:ring-teal-100",

    # Textos sobre fondo oscuro a textos sobre fondo claro
    "text-white": "text-slate-950",
    "text-slate-100": "text-slate-950",
    "text-slate-200": "text-slate-700",
    "text-slate-300": "text-slate-700",
    "text-slate-400": "text-slate-600",

    # Inputs oscuros a inputs claros
    "bg-slate-950 px-4 py-3 text-sm text-slate-950": "bg-white px-4 py-3 text-sm text-slate-900",
    "bg-slate-950 px-4 py-3 text-sm text-white": "bg-white px-4 py-3 text-sm text-slate-900",
    "border border-slate-200 bg-slate-950": "border border-slate-200 bg-white",

    # Pills
    "rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs text-teal-800":
        "rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800",

    # Botones activos
    "bg-teal-700 text-slate-950": "bg-teal-700 text-white",
}

def normalize_file(path: Path):
    text = path.read_text(encoding="utf-8")
    original = text

    for old, new in REPLACEMENTS.items():
        text = text.replace(old, new)

    # Evitar dobles espacios raros por reemplazos
    while "  " in text:
        text = text.replace("  ", " ")

    if text != original:
        backup = path.with_suffix(path.suffix + ".bak_visual")
        if not backup.exists():
            backup.write_text(original, encoding="utf-8")
        path.write_text(text, encoding="utf-8")
        return True

    return False

def main():
    changed = []

    for root in ROOTS:
        for path in root.rglob("*.tsx"):
            if normalize_file(path):
                changed.append(path)

    print("Archivos modificados:", len(changed))
    for path in changed:
        print("-", path)

if __name__ == "__main__":
    main()
