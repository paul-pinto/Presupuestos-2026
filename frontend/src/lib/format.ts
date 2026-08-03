export function formatBs(value: number): string {
  return `Bs ${Number(value || 0).toLocaleString("es-BO", {
    maximumFractionDigits: 0,
  })}`;
}

export function formatNumber(value: number): string {
  return Number(value || 0).toLocaleString("es-BO", {
    maximumFractionDigits: 0,
  });
}

export function formatPct(value: number, digits = 2): string {
  return `${Number(value || 0).toLocaleString("es-BO", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

export function formatBsCompact(value: number): string {
  const n = Number(value || 0);
  const abs = Math.abs(n);

  if (abs >= 1_000_000) {
    return `Bs ${(n / 1_000_000).toLocaleString("es-BO", {
      minimumFractionDigits: abs < 10_000_000 ? 1 : 0,
      maximumFractionDigits: abs < 10_000_000 ? 1 : 0,
    })} millones`;
  }

  if (abs >= 1_000) {
    return `Bs ${(n / 1_000).toLocaleString("es-BO", {
      maximumFractionDigits: 0,
    })} mil`;
  }

  return formatBs(n);
}

export function normalize(value: string | number | null | undefined): string {
  return String(value || "").toLowerCase();
}

export function shortEntidadLabel(value: string): string {
  return String(value || "")
    .replace(/^Gobierno Autónomo Municipal de /i, "")
    .replace(/^Gobierno Autónomo Municipal /i, "")
    .replace(/^Gobierno Autónomo Departamental de /i, "")
    .replace(/^Gobierno Autónomo Regional de /i, "")
    .replace(/^Gobierno Autónomo Indígena Originario Campesino de /i, "")
    .replace(/^Gobierno Autónomo Indígena Originario Campesino /i, "")
    .trim();
}
