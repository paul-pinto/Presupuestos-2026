"use client";
import { formatBs, formatBsCompact, formatNumber, formatPct, normalize } from "@/lib/format";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, Building2, Users, WalletCards, BarChart3 } from "lucide-react";


function shortEntidadLabel(value: string): string {
  const raw = String(value || "").trim();

  const replacements: Array<[RegExp, string]> = [
    [/^Gobierno Autónomo Departamental del\s+/i, ""],
    [/^Gobierno Autónomo Departamental de\s+/i, ""],
    [/^Gobierno Autónomo Municipal de\s+/i, ""],
    [/^Gobierno Autónomo Municipal del\s+/i, ""],
    [/^Gobierno Autónomo Regional del\s+/i, ""],
    [/^Gobierno Autónomo Regional de\s+/i, ""],
    [/^Gobierno Autónomo Indígena Originario Campesino de\s+/i, ""],
    [/^Gobierno Autónomo Indígena Originario Campesino del\s+/i, ""],
  ];

  let cleaned = raw;

  for (const [pattern, replacement] of replacements) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  return cleaned.trim() || raw;
}

function formatFilterOptionLabel(value: string): string {
  const raw = String(value || "").trim();

  if (!raw) return "";
  if (raw === "Todos") return "Todos";

  const key = raw.toLowerCase();

  const dictionary: Record<string, string> = {
    departamental: "Departamental",
    municipal: "Municipal",
    regional: "Regional",
    indigena_originario_campesino: "Indígena Originario Campesino",
    gad: "GAD",
    gam: "GAM",
    gaioc: "GAIOC",
    gar: "GAR",
  };

  if (dictionary[key]) return dictionary[key];

  return raw
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      const wordKey = word.toLowerCase();
      return dictionary[wordKey] || word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

type EntidadIndicador = {
  codigo_entidad: string;
  nombre_entidad: string;
  departamento: string;
  tipo: string;
  grupo_eta: string;
  presupuesto_total: number;
  provincia_ine: string;
  municipio_ine: string;
  poblacion_2024: number;
  hombres_2024: number;
  mujeres_2024: number;
  presupuesto_per_capita: number;
};


type IndicadorFiscal = {
  codigo_entidad: string;
  nombre_entidad: string;
  departamento: string;
  tipo: string;
  grupo_eta: string;
  ingresos_total: number;
  recursos_propios: number;
  recursos_especificos: number;
  transferencias_tgn: number;
  coparticipacion: number;
  idh: number;
  regalias: number;
  otros_recursos: number;
  autonomia_fiscal_pct: number;
  dependencia_tgn_pct: number;
  coparticipacion_pct: number;
  idh_pct: number;
  regalias_pct: number;
  recursos_especificos_pct: number;
  autonomia_fiscal_aplica?: boolean | null;
  autonomia_departamental?: number | null;
  autonomia_departamental_pct?: number | null;
  autonomia_departamental_aplica?: boolean | null;
  autonomia_departamental_base?: string | null;
  iehd?: number | null;
  iehd_pct?: number | null;
};

function MetricCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="ofp-card rounded-3xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
          <p className="mt-3 text-2xl font-bold tabular-nums text-slate-950">{value}</p>
          {subtitle ? <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p> : null}
        </div>
        {icon ? (
          <div className="rounded-2xl border border-teal-100 bg-teal-50 p-3 text-teal-700">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="ofp-card rounded-3xl p-5">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
          Indicadores
        </p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

function TableCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden ofp-card rounded-3xl">
      <div className="border-b border-slate-200 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
          Tabla
        </p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

function applyBarStyle(option: any) {
  return {
    ...option,
    xAxis: {
      ...option.xAxis,
      splitLine: { lineStyle: { color: "#e2e8f0" } },
      axisLine: { lineStyle: { color: "#cbd5e1" } },
      axisTick: { show: false },
      axisLabel: {
        ...(option.xAxis?.axisLabel || {}),
        color: "#64748b",
      },
    },
    yAxis: {
      ...option.yAxis,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        ...(option.yAxis?.axisLabel || {}),
        color: "#334155",
      },
    },
    series: (option.series || []).map((serie: any) => ({
      ...serie,
      itemStyle: {
        ...(serie.itemStyle || {}),
        color: "#0f766e",
        borderRadius: [0, 8, 8, 0],
      },
      emphasis: {
        itemStyle: {
          color: "#115e59",
        },
      },
    })),
  };
}

function applyScatterStyle(option: any) {
  return {
    ...option,
    xAxis: {
      ...option.xAxis,
      splitLine: { lineStyle: { color: "#e2e8f0" } },
      axisLine: { lineStyle: { color: "#cbd5e1" } },
      axisTick: { show: false },
      nameTextStyle: { color: "#475569", fontWeight: 600 },
      axisLabel: {
        ...(option.xAxis?.axisLabel || {}),
        color: "#64748b",
      },
    },
    yAxis: {
      ...option.yAxis,
      splitLine: { lineStyle: { color: "#e2e8f0" } },
      axisLine: { lineStyle: { color: "#cbd5e1" } },
      axisTick: { show: false },
      nameTextStyle: { color: "#475569", fontWeight: 600 },
      axisLabel: {
        ...(option.yAxis?.axisLabel || {}),
        color: "#64748b",
      },
    },
    series: (option.series || []).map((serie: any) => ({
      ...serie,
      itemStyle: {
        color: "#0f766e",
        opacity: 0.75,
      },
      emphasis: {
        itemStyle: {
          color: "#115e59",
          opacity: 1,
        },
      },
    })),
  };
}


export default function IndicadoresPage() {
  const [data, setData] = useState<EntidadIndicador[]>([]);
  const [fiscales, setFiscales] = useState<IndicadorFiscal[]>([]);
  const [query, setQuery] = useState("");
  const [departamento, setDepartamento] = useState("Todos");
  const [tipo, setTipo] = useState("Todos");
  const [grupoEta, setGrupoEta] = useState("Todos");

  useEffect(() => {
    fetch("/data/entidades_indicadores.json")
      .then((response) => response.json())
      .then((rows: EntidadIndicador[]) => setData(rows))
      .catch(() => setData([]));

    fetch("/data/indicadores_fiscales.json")
      .then((response) => response.json())
      .then((rows: IndicadorFiscal[]) => setFiscales(rows))
      .catch(() => setFiscales([]));
  }, []);

  const departamentos = useMemo(() => {
    return ["Todos", ...Array.from(new Set(data.map((item) => item.departamento))).sort()];
  }, [data]);

  const tipos = useMemo(() => {
    return ["Todos", ...Array.from(new Set(data.map((item) => item.tipo))).sort()];
  }, [data]);

  const gruposEta = useMemo(() => {
    return ["Todos", ...Array.from(new Set(data.map((item) => item.grupo_eta))).sort()];
  }, [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return data.filter((item) => {
      if (departamento !== "Todos" && item.departamento !== departamento) return false;
      if (tipo !== "Todos" && item.tipo !== tipo) return false;
      if (grupoEta !== "Todos" && item.grupo_eta !== grupoEta) return false;

      if (!q) return true;

      return (
        normalize(item.codigo_entidad).includes(q) ||
        normalize(item.nombre_entidad).includes(q) ||
        normalize(item.departamento).includes(q) ||
        normalize(item.provincia_ine).includes(q) ||
        normalize(item.municipio_ine).includes(q)
      );
    });
  }, [data, departamento, tipo, grupoEta, query]);

  const filteredFiscal = useMemo(() => {
    const q = query.trim().toLowerCase();

    return fiscales.filter((item) => {
      if (departamento !== "Todos" && item.departamento !== departamento) return false;
      if (tipo !== "Todos" && item.tipo !== tipo) return false;
      if (grupoEta !== "Todos" && item.grupo_eta !== grupoEta) return false;

      if (!q) return true;

      return (
        normalize(item.codigo_entidad).includes(q) ||
        normalize(item.nombre_entidad).includes(q) ||
        normalize(item.departamento).includes(q)
      );
    });
  }, [fiscales, departamento, tipo, grupoEta, query]);

  const withPopulation = filtered.filter((item) => Number(item.poblacion_2024 || 0) > 0);

  const totalPoblacion = withPopulation.reduce(
    (sum, item) => sum + Number(item.poblacion_2024 || 0),
    0
  );

  const totalPresupuesto = withPopulation.reduce(
    (sum, item) => sum + Number(item.presupuesto_total || 0),
    0
  );

  const promedioPonderado =
    totalPoblacion > 0 ? totalPresupuesto / totalPoblacion : 0;

  const topPerCapita = [...withPopulation]
    .sort((a, b) => Number(b.presupuesto_per_capita || 0) - Number(a.presupuesto_per_capita || 0))
    .slice(0, 20);

  const topPoblacion = [...withPopulation]
    .sort((a, b) => Number(b.poblacion_2024 || 0) - Number(a.poblacion_2024 || 0))
    .slice(0, 20);

  const topAutonomiaFiscalEstricta = [...filteredFiscal]
    .filter((item) => item.autonomia_fiscal_aplica === true)
    .filter((item) => item.autonomia_fiscal_pct !== null && item.autonomia_fiscal_pct !== undefined)
    .sort((a, b) => Number(b.autonomia_fiscal_pct || 0) - Number(a.autonomia_fiscal_pct || 0))
    .slice(0, 12);

  const topAutonomiaDepartamental = [...filteredFiscal]
    .filter((item) => item.autonomia_departamental_aplica === true)
    .filter((item) => item.autonomia_departamental_pct !== null && item.autonomia_departamental_pct !== undefined)
    .sort((a, b) => Number(b.autonomia_departamental_pct || 0) - Number(a.autonomia_departamental_pct || 0))
    .slice(0, 12);

  const usaAutonomiaDepartamental =
    topAutonomiaFiscalEstricta.length === 0 && topAutonomiaDepartamental.length > 0;

  const topAutonomiaFiscal = usaAutonomiaDepartamental
    ? topAutonomiaDepartamental
    : topAutonomiaFiscalEstricta;

  const topDependenciaTgn = [...filteredFiscal]
    .filter((item) => Number(item.ingresos_total || 0) > 0)
    .sort((a, b) => Number(b.dependencia_tgn_pct || 0) - Number(a.dependencia_tgn_pct || 0))
    .slice(0, 12);

  const topCoparticipacion = [...filteredFiscal]
    .filter((item) => Number(item.ingresos_total || 0) > 0)
    .sort((a, b) => Number(b.coparticipacion_pct || 0) - Number(a.coparticipacion_pct || 0))
    .slice(0, 12);

  const topIdh = [...filteredFiscal]
    .filter((item) => Number(item.ingresos_total || 0) > 0)
    .sort((a, b) => Number(b.idh_pct || 0) - Number(a.idh_pct || 0))
    .slice(0, 12);


  const topRegalias = [...filteredFiscal]
    .filter((item) => Number(item.ingresos_total || 0) > 0)
    .filter((item) => Number(item.regalias_pct || 0) > 0)
    .sort((a, b) => Number(b.regalias_pct || 0) - Number(a.regalias_pct || 0))
    .slice(0, 12);

  const fiscalBarChart = (
    rows: IndicadorFiscal[],
    field: keyof IndicadorFiscal,
    title: string
  ) => {
    const maxValue = Math.max(...rows.map((item) => Number(item[field] || 0)), 0);

    const xMax =
      maxValue <= 10 ? 10 :
      maxValue <= 25 ? 25 :
      maxValue <= 50 ? 50 :
      100;

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: Array<{ name: string; value: number; marker: string }>) => {
          const item = params[0];

          return `${item.name}<br/>${item.marker} ${title}: <b>${Number(item.value || 0).toLocaleString("es-BO", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}%</b>`;
        },
      },
      grid: { left: 260, right: 90, top: 20, bottom: 40, containLabel: false },
      xAxis: {
        type: "value",
        min: 0,
        max: xMax,
        axisLabel: {
          formatter: (value: number) => `${value}%`,
          hideOverlap: true,
        },
      },
      yAxis: {
        type: "category",
        data: [...rows].reverse().map((item) =>
          shortEntidadLabel(item.nombre_entidad || item.departamento || "")
        ),
        axisLabel: {
          width: 230,
          overflow: "truncate",
        },
      },
      series: [
        {
          type: "bar",
          data: [...rows].reverse().map((item) => Number(item[field] || 0)),
          label: {
            show: true,
            position: "right",
            formatter: (params: { value: number }) =>
              `${Number(params.value || 0).toLocaleString("es-BO", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}%`,
          },
        },
      ],
    };
  };

  const chartPerCapita = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (value: number) => formatBs(value),
    },
    grid: { left: 320, right: 40, top: 20, bottom: 45, containLabel: true },
    xAxis: {
      type: "value",
      axisLabel: {
        formatter: (value: number) => formatBsCompact(value),
        hideOverlap: true,
      },
    },
    yAxis: {
      type: "category",
      data: [...topPerCapita].reverse().map((item) => shortEntidadLabel(item.nombre_entidad)),
      axisLabel: {
        width: 300,
        overflow: "truncate",
      },
    },
    series: [
      {
        type: "bar",
        data: [...topPerCapita].reverse().map((item) => item.presupuesto_per_capita),
        barMaxWidth: 24,
      },
    ],
  };

  const chartPoblacion = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (value: number) => formatNumber(value),
    },
    grid: { left: 320, right: 40, top: 20, bottom: 45, containLabel: true },
    xAxis: {
      type: "value",
      axisLabel: {
        formatter: (value: number) => formatNumber(value),
        hideOverlap: true,
      },
    },
    yAxis: {
      type: "category",
      data: [...topPoblacion].reverse().map((item) => shortEntidadLabel(item.nombre_entidad)),
      axisLabel: {
        width: 300,
        overflow: "truncate",
      },
    },
    series: [
      {
        type: "bar",
        data: [...topPoblacion].reverse().map((item) => item.poblacion_2024),
        barMaxWidth: 24,
      },
    ],
  };

  const scatterPresupuestoPoblacion = {
    tooltip: {
      trigger: "item",
      formatter: (params: { data: [number, number, string, string] }) => {
        const [poblacion, presupuesto, entidad, perCapita] = params.data;
        return `
          <strong>${entidad}</strong><br/>
          Población: ${formatNumber(poblacion)}<br/>
          Presupuesto: ${formatBs(presupuesto)}<br/>
          Per cápita: ${perCapita}
        `;
      },
    },
    grid: { left: 90, right: 40, top: 20, bottom: 70, containLabel: true },
    xAxis: {
      type: "value",
      name: "Población 2024",
      nameLocation: "middle",
      nameGap: 45,
      axisLabel: {
        formatter: (value: number) => formatNumber(value),
      },
    },
    yAxis: {
      type: "value",
      name: "Presupuesto",
      nameLocation: "middle",
      nameGap: 70,
      axisLabel: {
        formatter: (value: number) => formatBsCompact(value),
      },
    },
    series: [
      {
        type: "scatter",
        symbolSize: 8,
        data: withPopulation.map((item) => [
          Number(item.poblacion_2024 || 0),
          Number(item.presupuesto_total || 0),
          shortEntidadLabel(item.nombre_entidad),
          formatBs(item.presupuesto_per_capita),
        ]),
      },
    ],
  };

  return (
    <main className="min-h-screen ofp-page-bg text-slate-950">
      <section className="ofp-hero">
        <div className="ofp-hero-inner mx-auto max-w-7xl px-6 py-12 lg:py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
          >
            <ArrowLeft size={16} />
            Volver al observatorio
          </Link>

          <div className="mt-6 max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
              SIGEP + INE 2024
            </p>
            <h1 className="mt-3 max-w-5xl text-4xl font-bold tracking-tight text-slate-950">
              Indicadores territoriales per cápita
            </h1>
            <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600">
  Panel de indicadores fiscales y socioeconómicos para comparar territorios. Integra presupuesto per cápita, autonomía fiscal, dependencia del TGN, coparticipación, IDH, regalías, población, PIBpc estimado y pobreza NBI como insumos para el análisis territorial y el debate del pacto fiscal.
</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-6 md:grid-cols-4">
        <MetricCard
          title="Entidades filtradas"
          value={formatNumber(filtered.length)}
          subtitle="Entidades con indicador"
          icon={<Building2 size={22} />}
        />

        <MetricCard
          title="Población filtrada"
          value={formatNumber(totalPoblacion)}
          subtitle="INE 2024"
          icon={<Users size={22} />}
        />

        <MetricCard
          title="Presupuesto filtrado"
          value={formatBsCompact(totalPresupuesto)}
          subtitle="SIGEP 2026"
          icon={<WalletCards size={22} />}
        />

        <MetricCard
          title="Promedio per cápita"
          value={formatBs(promedioPonderado)}
          subtitle="Promedio ponderado"
          icon={<BarChart3 size={22} />}
        />
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-4">
        <div className="grid gap-4 ofp-card rounded-3xl p-5 md:grid-cols-4">
          <label className="text-sm font-medium text-slate-700">
            Buscar
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Entidad, municipio, provincia..."
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Departamento
            <select
              value={departamento}
              onChange={(event) => setDepartamento(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              {departamentos.map((option) => (
                <option key={option} value={option}>{formatFilterOptionLabel(option)}</option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            Tipo
            <select
              value={tipo}
              onChange={(event) => setTipo(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              {tipos.map((option) => (
                <option key={option} value={option}>{formatFilterOptionLabel(option)}</option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            Grupo ETA
            <select
              value={grupoEta}
              onChange={(event) => setGrupoEta(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              {gruposEta.map((option) => (
                <option key={option} value={option}>{formatFilterOptionLabel(option)}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-10">
        <ChartCard
          title="Ranking de presupuesto per cápita"
          description="Entidades con mayor presupuesto SIGEP por habitante según población INE 2024."
        >
          <div className="h-[650px]">
            <ReactECharts option={applyBarStyle(chartPerCapita)} style={{ height: "100%", width: "100%" }} />
          </div>
        </ChartCard>

        <ChartCard
          title="Presupuesto frente a población"
          description="Relación entre tamaño poblacional y presupuesto total aprobado."
        >
          <div className="h-[520px]">
            <ReactECharts option={applyScatterStyle(scatterPresupuestoPoblacion)} style={{ height: "100%", width: "100%" }} />
          </div>
        </ChartCard>

        {(topAutonomiaFiscalEstricta.length > 0 || topAutonomiaDepartamental.length > 0) ? (
          <ChartCard
            title={usaAutonomiaDepartamental ? "Ranking de autonomía fiscal departamental" : "Ranking de autonomía fiscal estricta"}
            description={
              usaAutonomiaDepartamental
                ? "Rubros 12 + 13 + 15 + 16 + 21 sobre ingresos totales departamentales."
                : "Recursos específicos propios GAM/GAIOC sobre ingresos totales."
            }
          >
            <div className="h-[650px]">
              <ReactECharts
                option={applyBarStyle(
                  fiscalBarChart(
                    topAutonomiaFiscal,
                    usaAutonomiaDepartamental ? "autonomia_departamental_pct" : "autonomia_fiscal_pct",
                    usaAutonomiaDepartamental ? "Autonomía departamental" : "Autonomía fiscal estricta"
                  )
                )}
                style={{ height: "100%", width: "100%" }}
              />
            </div>
          </ChartCard>
        ) : (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
              Indicador no aplicable
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
              Autonomía fiscal no aplica al filtro actual
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Este indicador se calcula como autonomía estricta para GAM/GAIOC y como autonomía departamental para GAD.
            </p>
          </section>
        )}

        <ChartCard
          title="Ranking de dependencia TGN"
          description="Peso de las transferencias TGN sobre el total de ingresos de cada entidad."
        >
          <div className="h-[650px]">
            <ReactECharts
              option={applyBarStyle(fiscalBarChart(topDependenciaTgn, "dependencia_tgn_pct", "Dependencia TGN"))}
              style={{ height: "100%", width: "100%" }}
            />
          </div>
        </ChartCard>

        <div className="ofp-card rounded-3xl p-5">
          <h2 className="text-xl font-bold tracking-tight text-slate-950">Dependencia por coparticipación</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Peso de la coparticipación tributaria sobre los ingresos totales.
            </p>
            <div className="mt-4 h-[500px]">
              <ReactECharts
                option={applyBarStyle(fiscalBarChart(topCoparticipacion, "coparticipacion_pct", "Coparticipación"))}
                style={{ height: "100%", width: "100%" }}
              />
            </div>
        </div>

        <div className="ofp-card rounded-3xl p-5">
          <h2 className="text-xl font-bold tracking-tight text-slate-950">Dependencia por IDH</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Peso del IDH sobre los ingresos totales.
            </p>
            <div className="mt-4 h-[500px]">
              <ReactECharts
                option={applyBarStyle(fiscalBarChart(topIdh, "idh_pct", "IDH"))}
                style={{ height: "100%", width: "100%" }}
              />
            </div>
        </div>

        <ChartCard
          title="Dependencia por regalías"
          description="Peso de las regalías sobre los ingresos totales de cada entidad."
        >
          <div className="h-[500px]">
            <ReactECharts
              option={applyBarStyle(fiscalBarChart(topRegalias, "regalias_pct", "Regalías"))}
              style={{ height: "100%", width: "100%" }}
            />
          </div>
        </ChartCard>

        <ChartCard
          title="Ranking de población"
          description="Entidades ordenadas por población censal INE 2024."
        >
          <div className="h-[650px]">
            <ReactECharts option={applyBarStyle(chartPoblacion)} style={{ height: "100%", width: "100%" }} />
          </div>
        </ChartCard>

        <div className="overflow-hidden ofp-card rounded-3xl">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-xl font-bold tracking-tight text-slate-950">Tabla fiscal</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Indicadores de autonomía y dependencia fiscal por entidad.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                  <th className="p-3">Código</th>
                  <th className="p-3">Entidad</th>
                  <th className="p-3 text-right tabular-nums">Ingresos</th>
                  <th className="p-3 text-right tabular-nums">{usaAutonomiaDepartamental ? "Autonomía deptal." : "Autonomía"}</th>
                  <th className="p-3 text-right tabular-nums">TGN</th>
                  <th className="p-3 text-right tabular-nums">Copart.</th>
                  <th className="p-3 text-right tabular-nums">IDH</th>
                  <th className="p-3 text-right tabular-nums">Regalías</th>
                </tr>
              </thead>
              <tbody>
                {[...filteredFiscal]
                  .sort((a, b) => {
                    const autonomiaA = usaAutonomiaDepartamental
                      ? Number(a.autonomia_departamental_pct || 0)
                      : Number(a.autonomia_fiscal_pct || 0);

                    const autonomiaB = usaAutonomiaDepartamental
                      ? Number(b.autonomia_departamental_pct || 0)
                      : Number(b.autonomia_fiscal_pct || 0);

                    return autonomiaB - autonomiaA;
                  })
                  .slice(0, 100)
                  .map((item) => (
                    <tr key={item.codigo_entidad} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-mono">{item.codigo_entidad}</td>
                      <td className="p-3 font-medium text-slate-950">{item.nombre_entidad}</td>
                      <td className="p-3 text-right tabular-nums">{formatBs(item.ingresos_total)}</td>
                      <td className="p-3 text-right font-semibold tabular-nums text-slate-950">{Number(
                        usaAutonomiaDepartamental
                          ? item.autonomia_departamental_pct || 0
                          : item.autonomia_fiscal_pct || 0
                      ).toLocaleString("es-BO", { maximumFractionDigits: 2 })}%</td>
                      <td className="p-3 text-right tabular-nums">{Number(item.dependencia_tgn_pct || 0).toLocaleString("es-BO", { maximumFractionDigits: 2 })}%</td>
                      <td className="p-3 text-right tabular-nums">{Number(item.coparticipacion_pct || 0).toLocaleString("es-BO", { maximumFractionDigits: 2 })}%</td>
                      <td className="p-3 text-right tabular-nums">{Number(item.idh_pct || 0).toLocaleString("es-BO", { maximumFractionDigits: 2 })}%</td>
                      <td className="p-3 text-right tabular-nums">{Number(item.regalias_pct || 0).toLocaleString("es-BO", { maximumFractionDigits: 2 })}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden ofp-card rounded-3xl">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-xl font-bold tracking-tight text-slate-950">Tabla de indicadores</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Revisión del match SIGEP ↔ INE y cálculo de presupuesto por habitante.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                  <th className="p-3">Código</th>
                  <th className="p-3">Entidad SIGEP</th>
                  <th className="p-3">Municipio INE</th>
                  <th className="p-3">Provincia INE</th>
                  <th className="p-3 text-right tabular-nums">Población</th>
                  <th className="p-3 text-right tabular-nums">Presupuesto</th>
                  <th className="p-3 text-right tabular-nums">Bs/hab.</th>
                </tr>
              </thead>
              <tbody>
                {[...withPopulation]
                  .sort((a, b) => Number(b.presupuesto_per_capita || 0) - Number(a.presupuesto_per_capita || 0))
                  .slice(0, 100)
                  .map((item) => (
                    <tr key={item.codigo_entidad} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-mono">{item.codigo_entidad}</td>
                      <td className="p-3 font-medium text-slate-950">{item.nombre_entidad}</td>
                      <td className="p-3 text-slate-600">{item.municipio_ine}</td>
                      <td className="p-3 text-slate-600">{item.provincia_ine}</td>
                      <td className="p-3 text-right tabular-nums">{formatNumber(item.poblacion_2024)}</td>
                      <td className="p-3 text-right tabular-nums">{formatBs(item.presupuesto_total)}</td>
                      <td className="p-3 text-right font-semibold tabular-nums text-slate-950">{formatBs(item.presupuesto_per_capita)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
