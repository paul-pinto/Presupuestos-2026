"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Layer } from "leaflet";
import L from "leaflet";
import { AtlasCard, AtlasMetric } from "@/components/atlas-ui";
import { formatBs, formatBsCompact, formatNumber, formatPct } from "@/lib/format";

type NivelTerritorial = "municipal" | "departamental";

type MunicipioProps = {
  departamento_geo: string;
  provincia_geo: string;
  municipio_geo: string;
  has_presupuesto: boolean;
  codigo_entidad?: string | null;
  nombre_entidad?: string | null;
  departamento?: string | null;
  tipo?: string | null;
  grupo_eta?: string | null;
  provincia_ine?: string | null;
  municipio_ine?: string | null;
  poblacion_2024?: number | null;
  presupuesto_total?: number | null;
  presupuesto_per_capita?: number | null;
  ingresos_total?: number | null;
  autonomia_fiscal_pct?: number | null;
  autonomia_fiscal_aplica?: boolean;
  dependencia_tgn_pct?: number | null;
  coparticipacion_pct?: number | null;
  idh_pct?: number | null;
  regalias_pct?: number | null;
  pibpc_2021?: number | null;
  pib_estimado_usd2017_2021?: number | null;
  poblacion_estimada_pibpc_2021?: number | null;
  pibpc_usd2017_2021?: number | null;
  pibpc_2021_es_estimacion?: boolean;
  pibpc_2021_match_status?: string | null;
  nbi_pobre_pct?: number | null;
  nbi_pobre_moderada_pct?: number | null;
  nbi_pobre_indigente_pct?: number | null;
  nbi_pobre_marginal_pct?: number | null;
  nbi_inadecuados_agua_saneamiento?: number | null;
  nbi_insuficiencia_educacion?: number | null;
  nbi_inadecuada_atencion_salud?: number | null;
  nbi_2024_es_dato_censal?: boolean;
  nbi_2024_match_status?: string | null;
  brecha_bienestar_producto_score?: number | null;
  brecha_bienestar_producto_categoria?: string | null;
  brecha_bienestar_producto_nivel_pibpc?: string | null;
  brecha_bienestar_producto_nivel_nbi?: string | null;
  brecha_bienestar_producto_metodo?: string | null;
  iehd?: number | null;
  iehd_pct?: number | null;
};

type MunicipioFeature = Feature<Geometry, MunicipioProps>;
type MunicipioCollection = FeatureCollection<Geometry, MunicipioProps>;

type IehdDepartamental = {
  codigo_entidad: string;
  nombre_entidad: string;
  departamento: string;
  ingresos_total: number | null;
  iehd: number | null;
  iehd_pct: number | null;
};

type DepartamentoAgregado = {
  departamento: string;
  municipios: number;
  municipios_con_presupuesto: number;
  poblacion_2024: number | null;
  presupuesto_total: number | null;
  presupuesto_per_capita: number | null;
  ingresos_total: number | null;
  autonomia_fiscal_pct: number | null;
  dependencia_tgn_pct: number | null;
  coparticipacion_pct: number | null;
  idh_pct: number | null;
  regalias_pct: number | null;
  pibpc_2021: number | null;
  pib_estimado_usd2017_2021: number | null;
  poblacion_estimada_pibpc_2021: number | null;
  pibpc_usd2017_2021: number | null;
  nbi_pobre_pct: number | null;
  brecha_bienestar_producto_score?: number | null;
  brecha_bienestar_producto_categoria?: string | null;
  brecha_bienestar_producto_nivel_pibpc?: string | null;
  brecha_bienestar_producto_nivel_nbi?: string | null;
  brecha_bienestar_producto_metodo?: string | null;
  iehd_pct?: number | null;
  iehd?: number | null;
};

const COLOR_NO_DATA = "#e5e7eb";
const COLORS = ["#d1fae5", "#99f6e4", "#5eead4", "#14b8a6", "#0f766e"];

const MAP_COLORS = ["#d1fae5", "#99f6e4", "#5eead4", "#14b8a6", "#0f766e"];

type FixedRange = {
  min: number | null;
  max: number | null;
  label: string;
};

const FIXED_RANGES: Record<string, FixedRange[]> = {
  iehd_pct: [
    { min: 0, max: 5, label: "0% – 5%" },
    { min: 5, max: 15, label: "5% – 15%" },
    { min: 15, max: 30, label: "15% – 30%" },
    { min: 30, max: 50, label: "30% – 50%" },
    { min: 50, max: null, label: "> 50%" },
  ],
  brecha_bienestar_producto_score: [
    { min: null, max: 30, label: "Brecha baja" },
    { min: 30, max: 45, label: "Brecha media-baja" },
    { min: 45, max: 60, label: "Brecha media" },
    { min: 60, max: 75, label: "Brecha alta" },
    { min: 75, max: null, label: "Brecha crítica" },
  ],
  presupuesto_total: [
    { min: null, max: 10_000_000, label: "< Bs 10 millones" },
    { min: 10_000_000, max: 50_000_000, label: "Bs 10 – 50 millones" },
    { min: 50_000_000, max: 200_000_000, label: "Bs 50 – 200 millones" },
    { min: 200_000_000, max: 1_000_000_000, label: "Bs 200 – 1.000 millones" },
    { min: 1_000_000_000, max: null, label: "> Bs 1.000 millones" },
  ],

  presupuesto_per_capita: [
    { min: null, max: 1_000, label: "< Bs 1.000" },
    { min: 1_000, max: 2_000, label: "Bs 1.000 – 2.000" },
    { min: 2_000, max: 3_500, label: "Bs 2.000 – 3.500" },
    { min: 3_500, max: 5_000, label: "Bs 3.500 – 5.000" },
    { min: 5_000, max: null, label: "> Bs 5.000" },
  ],

  poblacion_2024: [
    { min: null, max: 5_000, label: "< 5.000 hab." },
    { min: 5_000, max: 20_000, label: "5.000 – 20.000 hab." },
    { min: 20_000, max: 100_000, label: "20.000 – 100.000 hab." },
    { min: 100_000, max: 500_000, label: "100.000 – 500.000 hab." },
    { min: 500_000, max: null, label: "> 500.000 hab." },
  ],

  poblacion_retro_2021: [
    { min: null, max: 5_000, label: "< 5.000 hab." },
    { min: 5_000, max: 20_000, label: "5.000 – 20.000 hab." },
    { min: 20_000, max: 100_000, label: "20.000 – 100.000 hab." },
    { min: 100_000, max: 500_000, label: "100.000 – 500.000 hab." },
    { min: 500_000, max: null, label: "> 500.000 hab." },
  ],

  autonomia_fiscal_pct: [
    { min: 0, max: 5, label: "0% – 5%" },
    { min: 5, max: 15, label: "5% – 15%" },
    { min: 15, max: 30, label: "15% – 30%" },
    { min: 30, max: 50, label: "30% – 50%" },
    { min: 50, max: null, label: "> 50%" },
  ],

  dependencia_tgn_pct: [
    { min: 0, max: 20, label: "0% – 20%" },
    { min: 20, max: 40, label: "20% – 40%" },
    { min: 40, max: 60, label: "40% – 60%" },
    { min: 60, max: 80, label: "60% – 80%" },
    { min: 80, max: null, label: "> 80%" },
  ],

  coparticipacion_pct: [
    { min: 0, max: 20, label: "0% – 20%" },
    { min: 20, max: 40, label: "20% – 40%" },
    { min: 40, max: 60, label: "40% – 60%" },
    { min: 60, max: 80, label: "60% – 80%" },
    { min: 80, max: null, label: "> 80%" },
  ],

  idh_pct: [
    { min: 0, max: 5, label: "0% – 5%" },
    { min: 5, max: 15, label: "5% – 15%" },
    { min: 15, max: 30, label: "15% – 30%" },
    { min: 30, max: 50, label: "30% – 50%" },
    { min: 50, max: null, label: "> 50%" },
  ],

  regalias_pct: [
    { min: 0, max: 5, label: "0% – 5%" },
    { min: 5, max: 15, label: "5% – 15%" },
    { min: 15, max: 30, label: "15% – 30%" },
    { min: 30, max: 50, label: "30% – 50%" },
    { min: 50, max: null, label: "> 50%" },
  ],

  pibpc_usd2017_2021: [
    { min: null, max: 1_500, label: "< USD 1.500" },
    { min: 1_500, max: 2_500, label: "USD 1.500 – 2.500" },
    { min: 2_500, max: 3_500, label: "USD 2.500 – 3.500" },
    { min: 3_500, max: 5_000, label: "USD 3.500 – 5.000" },
    { min: 5_000, max: null, label: "> USD 5.000" },
  ],

  pibpc_usd2017_2021_retro: [
    { min: null, max: 1_500, label: "< USD 1.500" },
    { min: 1_500, max: 2_500, label: "USD 1.500 – 2.500" },
    { min: 2_500, max: 3_500, label: "USD 2.500 – 3.500" },
    { min: 3_500, max: 5_000, label: "USD 3.500 – 5.000" },
    { min: 5_000, max: null, label: "> USD 5.000" },
  ],

  nbi_pobre_pct: [
    { min: 0, max: 20, label: "0% – 20%" },
    { min: 20, max: 40, label: "20% – 40%" },
    { min: 40, max: 60, label: "40% – 60%" },
    { min: 60, max: 80, label: "60% – 80%" },
    { min: 80, max: null, label: "> 80%" },
  ],
};

function getFixedRangeIndex(value: number | null | undefined, indicadorKey: string): number | null {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;

  const ranges = FIXED_RANGES[indicadorKey];
  if (!ranges) return null;

  const n = Number(value);

  for (let i = 0; i < ranges.length; i += 1) {
    const range = ranges[i];
    const minOk = range.min === null || n >= range.min;
    const maxOk = range.max === null || n < range.max;

    if (minOk && maxOk) return i;
  }

  return null;
}

function getFixedRangeColor(value: number | null | undefined, indicadorKey: string): string {
  const index = getFixedRangeIndex(value, indicadorKey);
  if (index === null) return "#e5e7eb";
  return MAP_COLORS[index] || MAP_COLORS[MAP_COLORS.length - 1];
}

function getFixedLegend(indicadorKey: string) {
  const ranges = FIXED_RANGES[indicadorKey] || [
    { min: null, max: null, label: "Rango no definido" },
  ];

  return [
    ...ranges.map((range, index) => ({
      label: range.label,
      color: MAP_COLORS[index] || MAP_COLORS[MAP_COLORS.length - 1],
    })),
    {
      label: "Sin dato",
      color: "#e5e7eb",
    },
  ];
}


const indicadores = [
  {
    key: "presupuesto_per_capita",
    label: "Presupuesto per cápita",
    group: "Presupuesto",
    format: (value: number) => formatBs(value),
  },
  {
    key: "presupuesto_total",
    label: "Presupuesto total",
    group: "Presupuesto",
    format: (value: number) => formatBsCompact(value),
  },
  {
    key: "poblacion_2024",
    label: "Población 2024",
    group: "Censo 2024",
    format: (value: number) => formatNumber(value),
  },
  {
    key: "autonomia_fiscal_pct",
    label: "Autonomía fiscal estricta",
    group: "Fiscal",
    format: (value: number) => formatPct(value),
  },
  {
    key: "dependencia_tgn_pct",
    label: "Dependencia TGN",
    group: "Fiscal",
    format: (value: number) => formatPct(value),
  },
  {
    key: "coparticipacion_pct",
    label: "Coparticipación tributaria",
    group: "Fiscal",
    format: (value: number) => formatPct(value),
  },
  {
    key: "idh_pct",
    label: "IDH",
    group: "Fiscal",
    format: (value: number) => formatPct(value),
  },

  {
    key: "iehd_pct",
    label: "IEHD",
    group: "Ingresos fiscales",
    format: (value: number) => formatPct(value),
  },
  {
    key: "regalias_pct",
    label: "Regalías",
    group: "Fiscal",
    format: (value: number) => formatPct(value),
  },
  {
    key: "pibpc_usd2017_2021",
    label: "PIBpc estimado 2021",
    group: "Economía",
    format: (value: number) =>
      `USD ${value.toLocaleString("es-BO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
  },
  {
    key: "nbi_pobre_pct",
    label: "Pobreza NBI 2024",
    group: "Censo 2024",
    format: (value: number) => formatPct(value),
  },

  {
    key: "brecha_bienestar_producto_score",
    label: "Brecha bienestar-producto",
    group: "Pacto Fiscal",
    format: (value: number) =>
      `${Number(value || 0).toLocaleString("es-BO", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })} pts`,
  },
] as const;

type IndicadorKey = (typeof indicadores)[number]["key"];

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getMunicipalValue(props: MunicipioProps, key: IndicadorKey): number | null {
  if (key === "autonomia_fiscal_pct" && !props.autonomia_fiscal_aplica) return null;
  return asNumber(props[key]);
}

function getDepartamentalValue(row: DepartamentoAgregado | undefined, key: IndicadorKey): number | null {
  if (!row) return null;
  return asNumber(row[key]);
}

function quantiles(values: number[]) {
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return [];

  const pick = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
  return [pick(0.2), pick(0.4), pick(0.6), pick(0.8)];
}

function colorForValue(value: number | null, breaks: number[]) {
  if (value === null || breaks.length < 4) return COLOR_NO_DATA;
  if (value <= breaks[0]) return COLORS[0];
  if (value <= breaks[1]) return COLORS[1];
  if (value <= breaks[2]) return COLORS[2];
  if (value <= breaks[3]) return COLORS[3];
  return COLORS[4];
}

function weightedPct(rows: MunicipioProps[], key: keyof MunicipioProps): number | null {
  let numerator = 0;
  let denominator = 0;

  for (const row of rows) {
    const value = asNumber(row[key]);
    const ingresos = asNumber(row.ingresos_total);
    if (value === null || ingresos === null || ingresos <= 0) continue;

    numerator += value * ingresos;
    denominator += ingresos;
  }

  return denominator > 0 ? numerator / denominator : null;
}

function average(values: Array<number | null>) {
  const clean = values.filter((value): value is number => value !== null);
  if (!clean.length) return null;
  return clean.reduce((acc, value) => acc + value, 0) / clean.length;
}

function weightedByPopulation(rows: MunicipioProps[], key: keyof MunicipioProps): number | null {
  const valid = rows
    .map((row) => ({
      value: asNumber(row[key]),
      weight: asNumber(row.poblacion_2024) || asNumber(row.poblacion_estimada_pibpc_2021) || 0,
    }))
    .filter((row) => row.value !== null && row.weight > 0);

  const totalWeight = valid.reduce((acc, row) => acc + row.weight, 0);
  if (!totalWeight) return average(rows.map((row) => asNumber(row[key])));

  return valid.reduce((acc, row) => acc + (row.value || 0) * row.weight, 0) / totalWeight;
}


function aggregateDepartments(features: MunicipioFeature[], iehdDepartamental: IehdDepartamental[] = []) {
  const iehdPorDepartamento = new Map(
    iehdDepartamental.map((row) => [
      String(row.departamento || "").trim(),
      {
        iehd: row.iehd,
        iehd_pct: row.iehd_pct,
      },
    ])
  );

  const grouped = new Map<string, MunicipioProps[]>();

  for (const feature of features) {
    const props = feature.properties;
    if (!props?.departamento_geo) continue;

    grouped.set(props.departamento_geo, [
      ...(grouped.get(props.departamento_geo) || []),
      props,
    ]);
  }

  const result = new Map<string, DepartamentoAgregado>();

  for (const [departamento, rows] of grouped.entries()) {
    const rowsWithBudget = rows.filter((row) => row.has_presupuesto);

    const presupuesto = rowsWithBudget.reduce(
      (acc, row) => acc + (asNumber(row.presupuesto_total) || 0),
      0
    );

    const poblacion = rowsWithBudget.reduce(
      (acc, row) => acc + (asNumber(row.poblacion_2024) || 0),
      0
    );

    const ingresos = rowsWithBudget.reduce(
      (acc, row) => acc + (asNumber(row.ingresos_total) || 0),
      0
    );

    const pibEstimado2021 = rowsWithBudget.reduce(
      (acc, row) => acc + (asNumber(row.pib_estimado_usd2017_2021) || 0),
      0
    );

    const poblacionPibpc2021 = rowsWithBudget.reduce(
      (acc, row) => acc + (asNumber(row.poblacion_estimada_pibpc_2021) || 0),
      0
    );

    result.set(departamento, {
      departamento,
      municipios: rows.length,
      municipios_con_presupuesto: rowsWithBudget.length,
      poblacion_2024: poblacion || null,
      presupuesto_total: presupuesto || null,
      presupuesto_per_capita: presupuesto > 0 && poblacion > 0 ? presupuesto / poblacion : null,
      ingresos_total: ingresos || null,
      autonomia_fiscal_pct: weightedPct(rowsWithBudget, "autonomia_fiscal_pct"),
      dependencia_tgn_pct: weightedPct(rowsWithBudget, "dependencia_tgn_pct"),
      coparticipacion_pct: weightedPct(rowsWithBudget, "coparticipacion_pct"),
      idh_pct: weightedPct(rowsWithBudget, "idh_pct"),
      regalias_pct: weightedPct(rowsWithBudget, "regalias_pct"),
      iehd: iehdPorDepartamento.get(departamento)?.iehd ?? null,
      iehd_pct: iehdPorDepartamento.get(departamento)?.iehd_pct ?? null,
      pibpc_2021: average(rows.map((row) => asNumber(row.pibpc_2021))),
      pib_estimado_usd2017_2021: pibEstimado2021 || null,
      poblacion_estimada_pibpc_2021: poblacionPibpc2021 || null,
      pibpc_usd2017_2021:
        pibEstimado2021 > 0 && poblacionPibpc2021 > 0
          ? pibEstimado2021 / poblacionPibpc2021
          : null,
      nbi_pobre_pct: weightedByPopulation(rowsWithBudget, "nbi_pobre_pct"),
    });
  }

  return result;
}

function popupHtml(
  props: MunicipioProps,
  nivel: NivelTerritorial,
  depto: DepartamentoAgregado | undefined,
  indicador: (typeof indicadores)[number],
  value: number | null
) {
  const title =
    nivel === "municipal"
      ? props.municipio_ine || props.municipio_geo || "-"
      : props.departamento_geo || "-";

  const subtitle =
    nivel === "municipal"
      ? `Provincia: ${props.provincia_ine || props.provincia_geo || "-"}`
      : "Vista departamental";

  const poblacion = nivel === "municipal" ? props.poblacion_2024 : depto?.poblacion_2024;
  const presupuesto = nivel === "municipal" ? props.presupuesto_total : depto?.presupuesto_total;
  const perCapita = nivel === "municipal" ? props.presupuesto_per_capita : depto?.presupuesto_per_capita;
  const dependencia = nivel === "municipal" ? props.dependencia_tgn_pct : depto?.dependencia_tgn_pct;

  const ficha =
    nivel === "municipal" && props.codigo_entidad && props.has_presupuesto
      ? `<div style="margin-top:10px;"><a href="/entidades/${props.codigo_entidad}" style="color:#0f766e;font-weight:700;text-decoration:none;">Ver ficha presupuestaria</a></div>`
      : "";

  const etiquetaTerritorio = nivel === "municipal" ? props.departamento_geo : "Departamento";
  const etiquetaPoblacion = nivel === "municipal" ? "Población 2024" : "Población departamental";
  const etiquetaPresupuesto = nivel === "municipal" ? "Presupuesto" : "Presupuesto departamental";
  const etiquetaPerCapita = nivel === "municipal" ? "Per cápita" : "Per cápita departamental";

  return `
    <div style="min-width:250px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="font-size:12px;color:#64748b;">${etiquetaTerritorio}</div>
      <div style="font-size:17px;font-weight:800;color:#0f172a;margin-top:2px;">${title}</div>
      <div style="font-size:12px;color:#64748b;margin-top:2px;">${subtitle}</div>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:10px 0;" />
      <div style="display:grid;gap:4px;font-size:13px;color:#0f172a;">
        <div><strong>${indicador.label}:</strong> ${value === null ? "Sin dato" : indicador.format(value)}</div>
        <div><strong>${etiquetaPoblacion}:</strong> ${poblacion ? formatNumber(poblacion) : "Sin dato"}</div>
        <div><strong>${etiquetaPresupuesto}:</strong> ${presupuesto ? formatBsCompact(presupuesto) : "Sin dato"}</div>
        <div><strong>${etiquetaPerCapita}:</strong> ${perCapita ? formatBs(perCapita) : "Sin dato"}</div>
        <div><strong>Dependencia TGN:</strong> ${dependencia !== null && dependencia !== undefined ? formatPct(dependencia) : "Sin dato"}</div>
      </div>
      ${ficha}
    </div>
  `;
}

export default function MapaMunicipal() {
  const [geojson, setGeojson] = useState<MunicipioCollection | null>(null);
  const [geojsonDepartamental, setGeojsonDepartamental] = useState<MunicipioCollection | null>(null);
  const [indicadorKey, setIndicadorKey] = useState<IndicadorKey>("presupuesto_per_capita");
  const [departamento, setDepartamento] = useState("Todos");
  const [nivel, setNivel] = useState<NivelTerritorial>("municipal");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const indicador = indicadores.find((item) => item.key === indicadorKey) || indicadores[0];

  const [iehdDepartamental, setIehdDepartamental] = useState<IehdDepartamental[]>([]);

  useEffect(() => {
    let mounted = true;

    setLoading(true);

    Promise.all([
      fetch("/data/municipios_presupuesto_liviano.geojson").then((response) => {
        if (!response.ok) throw new Error("No se pudo cargar el GeoJSON municipal.");
        return response.json();
      }),
      fetch("/data/departamentos_presupuesto.geojson").then((response) => {
        if (!response.ok) throw new Error("No se pudo cargar el GeoJSON departamental.");
        return response.json();
      }),
      fetch("/data/iehd_departamental.json").then((response) => {
        if (!response.ok) throw new Error("No se pudo cargar IEHD departamental.");
        return response.json();
      }),
    ])
      .then(([municipalData, departamentalData, iehdData]: [MunicipioCollection, MunicipioCollection, IehdDepartamental[]]) => {
        if (!mounted) return;
        setGeojson(municipalData);
        setGeojsonDepartamental(departamentalData);
        setIehdDepartamental(iehdData);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Error al cargar el mapa.");
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const allFeatures = useMemo(() => geojson?.features || [], [geojson]);

  const departamentosAgregados = useMemo(
    () => aggregateDepartments(allFeatures, iehdDepartamental),
    [allFeatures, iehdDepartamental]
  );

  const departamentos = useMemo(() => {
    return Array.from(
      new Set(allFeatures.map((f) => f.properties.departamento_geo).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "es"));
  }, [allFeatures]);

  const features = useMemo(() => {
    return allFeatures.filter((feature) => {
      if (departamento !== "Todos" && feature.properties.departamento_geo !== departamento) {
        return false;
      }
      return true;
    });
  }, [allFeatures, departamento]);

  const valueForFeature = (feature: MunicipioFeature) => {
    if (nivel === "municipal") {
      return getMunicipalValue(feature.properties, indicadorKey);
    }

    return getDepartamentalValue(
      departamentosAgregados.get(feature.properties.departamento_geo),
      indicadorKey
    );
  };

  const values = useMemo(() => {
    if (nivel === "municipal") {
      return features
        .map((feature) => getMunicipalValue(feature.properties, indicadorKey))
        .filter((value): value is number => value !== null);
    }

    const seen = new Set<string>();
    const result: number[] = [];

    for (const feature of features) {
      const depto = feature.properties.departamento_geo;
      if (seen.has(depto)) continue;
      seen.add(depto);

      const value = getDepartamentalValue(departamentosAgregados.get(depto), indicadorKey);
      if (value !== null) result.push(value);
    }

    return result;
  }, [features, nivel, indicadorKey, departamentosAgregados]);

  const breaks = useMemo(() => quantiles(values), [values]);

  const filteredGeojson = useMemo<MunicipioCollection | null>(() => {
    if (!geojson) return null;
    return { ...geojson, features };
  }, [geojson, features]);

  const filteredDepartamentalGeojson = useMemo<MunicipioCollection | null>(() => {
    if (!geojsonDepartamental) return null;

    const deptFeatures = geojsonDepartamental.features.filter((feature) => {
      if (departamento === "Todos") return true;
      return feature.properties.departamento_geo === departamento;
    });

    return { ...geojsonDepartamental, features: deptFeatures };
  }, [geojsonDepartamental, departamento]);

  const geojsonVisible = nivel === "municipal" ? filteredGeojson : filteredDepartamentalGeojson;

  const ranking = useMemo(() => {
    if (nivel === "municipal") {
      return features
        .map((feature) => {
          const props = feature.properties;
          const value = getMunicipalValue(props, indicadorKey);

          return {
            id: props.codigo_entidad || `${props.departamento_geo}-${props.municipio_geo}`,
            nombre: props.municipio_ine || props.municipio_geo,
            departamento: props.departamento_geo,
            codigo: props.codigo_entidad,
            value,
          };
        })
        .filter((row) => row.value !== null)
        .sort((a, b) => (b.value || 0) - (a.value || 0));
    }

    return Array.from(departamentosAgregados.values())
      .filter((row) => departamento === "Todos" || row.departamento === departamento)
      .map((row) => ({
        id: row.departamento,
        nombre: row.departamento,
        departamento: "Bolivia",
        codigo: null,
        value: getDepartamentalValue(row, indicadorKey),
      }))
      .filter((row) => row.value !== null)
      .sort((a, b) => (b.value || 0) - (a.value || 0));
  }, [features, nivel, indicadorKey, departamentosAgregados, departamento]);

  const topRows = ranking.slice(0, 12);
  const maxRow = ranking[0];
  const minRow = ranking.length ? ranking[ranking.length - 1] : undefined;

  const totalTerritorios =
    nivel === "municipal"
      ? features.length
      : new Set(features.map((feature) => feature.properties.departamento_geo)).size;

  const promedio = values.length
    ? values.reduce((acc, value) => acc + value, 0) / values.length
    : null;

  function styleFeature(feature?: Feature<Geometry, MunicipioProps>) {
    const typedFeature = feature as MunicipioFeature | undefined;
    const value = typedFeature ? valueForFeature(typedFeature) : null;

    return {
      fillColor: getFixedRangeColor(value, indicadorKey),
      weight: nivel === "departamental" ? 0.45 : 0.7,
      opacity: nivel === "departamental" ? 0 : 1,
      color: "#64748b",
      fillOpacity: value === null ? 0.35 : 0.84,
    };
  }

  function onEachFeature(feature: Feature<Geometry, MunicipioProps>, layer: Layer) {
    const props = feature.properties;
    const typedFeature = feature as MunicipioFeature;
    const depto = departamentosAgregados.get(props.departamento_geo);
    const value = valueForFeature(typedFeature);

    const title =
      nivel === "municipal"
        ? props.municipio_ine || props.municipio_geo
        : props.departamento_geo;

    layer.bindTooltip(
      `<strong>${title}</strong><br/>${indicador.label}: ${
        value === null ? "Sin dato" : indicador.format(value)
      }`,
      { sticky: true }
    );

    layer.bindPopup(popupHtml(props, nivel, depto, indicador, value));

    layer.on({
      mouseover: () => {
        const path = layer as L.Path;
        path.setStyle({ weight: 2, color: "#0f172a", fillOpacity: 0.95 });
      },
      mouseout: () => {
        const path = layer as L.Path;
        path.setStyle(styleFeature(feature));
      },
    });
  }

  if (loading) {
    return (
      <AtlasCard className="p-8">
        <p className="text-slate-600">Cargando mapa territorial...</p>
      </AtlasCard>
    );
  }

  if (error) {
    return (
      <AtlasCard className="border-red-200 bg-red-50 p-8">
        <p className="text-red-700">{error}</p>
      </AtlasCard>
    );
  }

  return (
    <div className="grid gap-6">
      <AtlasCard className="p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Nivel territorial
            </p>
            <div className="mt-2 flex rounded-2xl border border-slate-200 bg-slate-100 p-1">
              {[
                ["municipal", "Municipal"],
                ["departamental", "Departamental"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setNivel(value as NivelTerritorial)}
                  className={[
                    "flex-1 rounded-xl px-3 py-2 text-sm font-medium transition",
                    nivel === value
                      ? "bg-teal-700 text-white shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-slate-950",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Indicador
            </span>
            <select
              value={indicadorKey}
              onChange={(event) => setIndicadorKey(event.target.value as IndicadorKey)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              {indicadores.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Departamento
            </span>
            <select
              value={departamento}
              onChange={(event) => setDepartamento(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              <option>Todos</option>
              {departamentos.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
      </AtlasCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AtlasMetric
          label={nivel === "municipal" ? "Municipios visibles" : "Departamentos visibles"}
          value={formatNumber(totalTerritorios)}
          description="Según filtros aplicados"
        />
        <AtlasMetric
          label="Con dato"
          value={formatNumber(values.length)}
          description={indicador.label}
        />
        <AtlasMetric
          label="Mayor valor"
          value={maxRow?.value === null || maxRow?.value === undefined ? "Sin dato" : indicador.format(maxRow.value)}
          description={maxRow?.nombre}
        />
        <AtlasMetric
          label="Promedio visible"
          value={promedio === null ? "Sin dato" : indicador.format(promedio)}
          description="Promedio del territorio visible"
        />
      </div>

      <section className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <AtlasCard className="overflow-hidden">
          <MapContainer
            center={[-16.5, -64.8]}
            zoom={5}
            minZoom={4}
            maxZoom={10}
            scrollWheelZoom
            style={{ height: "72vh", width: "100%" }}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {geojsonVisible ? (
              <GeoJSON
                key={`${nivel}-${indicadorKey}-${departamento}`}
                data={geojsonVisible}
                style={styleFeature}
                onEachFeature={onEachFeature}
              />
            ) : null}
          </MapContainer>
        </AtlasCard>

        <AtlasCard className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-teal-700">
            {nivel === "municipal" ? "Vista municipal" : "Vista departamental"}
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-950">{indicador.label}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {indicadorKey === "pibpc_usd2017_2021"
              ? "Estimación espacial municipal propia en base a Rossi-Hansberg & Zhang (2025) y WorldPop 2021, expresada en USD constantes de 2017. No corresponde a un PIB municipal oficial publicado por el INE."
              : indicadorKey === "nbi_pobre_pct"
                ? "Porcentaje de población pobre por Necesidades Básicas Insatisfechas según Censo 2024. Fuente: INE Bolivia."
                : nivel === "municipal"
                  ? "Cada municipio se colorea con su propio valor."
                  : "Cada municipio hereda el valor agregado de su departamento."}
          </p>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Leyenda
            </p>
            <div className="mt-3 grid gap-2 text-sm text-slate-700">
              {(getFixedLegend(indicadorKey) || [
                { color: COLORS[0], label: "Valor bajo" },
                { color: COLORS[1], label: "Valor medio-bajo" },
                { color: COLORS[2], label: "Valor medio" },
                { color: COLORS[3], label: "Valor medio-alto" },
                { color: COLORS[4], label: "Valor alto" },
                { color: COLOR_NO_DATA, label: "Sin dato" },
              ]).map((item, index) => (
                <div key={`${nivel}-${indicadorKey}-${index}`} className="flex items-center gap-3">
                  <span className="h-4 w-8 rounded" style={{ backgroundColor: item.color }} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Nota metodológica
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              En vista departamental, los porcentajes fiscales se agregan ponderando por ingresos.
              Los territorios sin cruce presupuestario quedan como sin dato.
            </p>
          </div>
        </AtlasCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <AtlasCard className="p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-teal-700">
            Ranking visible
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-950">{indicador.label}</h2>

          <div className="mt-5 grid gap-3">
            {topRows.map((row, index) => {
              const maxValue = maxRow?.value || 1;
              const width = row.value ? Math.max(4, (row.value / maxValue) * 100) : 0;

              return (
                <div key={`ranking-${row.id}-${row.nombre}-${index}`} className="grid gap-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-950">{index + 1}. {row.nombre}</span>
                      <span className="ml-2 text-xs text-slate-500">{row.departamento}</span>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums text-slate-950">
                      {row.value === null ? "Sin dato" : indicador.format(row.value)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-teal-700"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </AtlasCard>

        <AtlasCard className="overflow-hidden">
          <div className="border-b border-slate-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-teal-700">
              Tabla visible
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">
              Territorios ordenados
            </h2>
          </div>

          <div className="max-h-[520px] overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Territorio</th>
                  <th className="px-4 py-3 text-left">Departamento</th>
                  <th className="px-4 py-3 text-right">{indicador.label}</th>
                  {nivel === "municipal" ? <th className="px-4 py-3 text-right">Ficha</th> : null}
                </tr>
              </thead>
              <tbody>
                {ranking.slice(0, 80).map((row, index) => (
                  <tr key={`table-${row.id}-${row.nombre}-${index}`} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-950">{row.nombre}</td>
                    <td className="px-4 py-3 text-slate-600">{row.departamento}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-950">
                      {row.value === null ? "Sin dato" : indicador.format(row.value)}
                    </td>
                    {nivel === "municipal" ? (
                      <td className="px-4 py-3 text-right">
                        {row.codigo ? (
                          <Link
                            href={`/entidades/${row.codigo}`}
                            className="text-sm font-semibold text-teal-700 hover:text-teal-900"
                          >
                            Ver
                          </Link>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AtlasCard>
      </section>

      {minRow ? (
        <p className="text-xs text-slate-500">
          Menor valor visible: <strong>{minRow.nombre}</strong> ·{" "}
          {minRow.value === null ? "Sin dato" : indicador.format(minRow.value)}
        </p>
      ) : null}
    </div>
  );
}
