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

export function shortEntidadLabel(value: string | null | undefined): string {
  if (!value) return "";

  return String(value)
    .replace(/^Gobierno Autónomo Departamental del\s+/i, "")
    .replace(/^Gobierno Autónomo Departamental de\s+/i, "")
    .replace(/^Gobierno Autónomo Municipal del\s+/i, "")
    .replace(/^Gobierno Autónomo Municipal de\s+/i, "")
    .replace(/^Gobierno Autónomo Regional del\s+/i, "")
    .replace(/^Gobierno Autónomo Regional de\s+/i, "")
    .replace(/^Gobierno Autónomo Indígena Originario Campesino del\s+/i, "")
    .replace(/^Gobierno Autónomo Indígena Originario Campesino de\s+/i, "")
    .replace(/^Gobierno Autónomo Indígena Guaraní\s+/i, "")
    .replace(/^Gobierno Autónomo Indígena\s+/i, "")
    .replace(/^Autonomía Originaria del\s+/i, "")
    .replace(/^Autonomía Originaria de\s+/i, "")
    .replace(/^Autonomía Indígena Originaria Campesina del\s+/i, "")
    .replace(/^Autonomía Indígena Originaria Campesina de\s+/i, "")
    .replace(/^Entidad Territorial Autónoma\s+/i, "")
    .trim();
}
