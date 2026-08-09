"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReactECharts from "echarts-for-react";
import { ArrowLeft, BarChart3, Layers3, Search, Wallet } from "lucide-react";
import { shortEntidadLabel } from "@/lib/format";

type GrupoKey =
  | "grupo_1"
  | "grupo_2"
  | "grupo_3"
  | "grupo_4"
  | "grupo_5"
  | "grupo_6"
  | "grupo_7"
  | "grupo_8"
  | "grupo_9";

type Entidad = {
  codigo_entidad: string;
  nombre_entidad: string;
  departamento: string;
  grupo_eta: string;
  tipo: string;
  presupuesto_total: number;
  grupo_1: number;
  grupo_2: number;
  grupo_3: number;
  grupo_4: number;
  grupo_5: number;
  grupo_6: number;
  grupo_7: number;
  grupo_8: number;
  grupo_9: number;
};

type Programa = {
  codigo_entidad: string;
  nombre_entidad: string;
  departamento: string;
  grupo_eta: string;
  tipo: string;
  prg: string;
  descripcion: string;
  total: number;
  grupo_1: number;
  grupo_2: number;
  grupo_3: number;
  grupo_4: number;
  grupo_5: number;
  grupo_6: number;
  grupo_7: number;
  grupo_8: number;
  grupo_9: number;
};

function formatBs(value: number): string {
  return `Bs ${Number(value || 0).toLocaleString("es-BO", {
    maximumFractionDigits: 0,
  })}`;
}

function formatBsCompact(value: number): string {
  const n = Number(value || 0);
  const abs = Math.abs(n);

  if (abs >= 1_000_000) {
    return `Bs ${(n / 1_000_000).toLocaleString("es-BO", {
      maximumFractionDigits: 0,
    })} millones`;
  }

  if (abs >= 1_000) {
    return `Bs ${(n / 1_000).toLocaleString("es-BO", {
      maximumFractionDigits: 0,
    })} mil`;
  }

  return `Bs ${n.toLocaleString("es-BO", {
    maximumFractionDigits: 0,
  })}`;
}


function formatInt(value: number): string {
  return Number(value || 0).toLocaleString("es-BO", {
    maximumFractionDigits: 0,
  });
}

function formatPct(value: number, total: number): string {
  if (!total) return "0,00%";

  return `${((value / total) * 100).toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
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


function normalize(value: string | undefined | null): string {
  return String(value || "").toLowerCase();
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`No se pudo cargar ${path}`);
  }

  return response.json();
}

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
        {icon ? <div className="rounded-2xl border border-teal-100 bg-teal-50 p-3 text-teal-700">{icon}</div> : null}
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="ofp-card rounded-3xl p-5">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
          Gastos
        </p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function chartOptionHorizontal({
  labels,
  values,
  left = 260,
}: {
  labels: string[];
  values: number[];
  left?: number;
}) {
  return {
    grid: { left, right: 70, top: 20, bottom: 45, containLabel: false },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (value: number) => formatBs(value),
    },
    xAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#e2e8f0" } },
      axisLine: { lineStyle: { color: "#cbd5e1" } },
      axisTick: { show: false },
      axisLabel: {
        color: "#64748b",
        formatter: (value: number) => formatBsCompact(value),
        hideOverlap: true,
      },
    },
    yAxis: {
      type: "category",
      data: labels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: "#334155",
        width: left - 30,
        overflow: "truncate",
      },
    },
    series: [
      {
        type: "bar",
        data: values,
        itemStyle: {
          color: "#0f766e",
          borderRadius: [0, 8, 8, 0],
        },
        emphasis: {
          itemStyle: {
            color: "#115e59",
          },
        },
      },
    ],
  };
}

function chartOptionVertical({
  labels,
  values,
}: {
  labels: string[];
  values: number[];
}) {
  return {
    grid: { left: 90, right: 30, top: 20, bottom: 80, containLabel: true },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (value: number) => formatBs(value),
    },
    xAxis: {
      type: "category",
      data: labels,
      axisLine: { lineStyle: { color: "#cbd5e1" } },
      axisTick: { show: false },
      axisLabel: {
        color: "#64748b",
        rotate: 35,
      },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#e2e8f0" } },
      axisLine: { lineStyle: { color: "#cbd5e1" } },
      axisTick: { show: false },
      axisLabel: {
        color: "#64748b",
        formatter: (value: number) => formatBsCompact(value),
        hideOverlap: true,
      },
    },
    series: [
      {
        type: "bar",
        data: values,
        itemStyle: {
          color: "#0f766e",
          borderRadius: [0, 8, 8, 0],
        },
        emphasis: {
          itemStyle: {
            color: "#115e59",
          },
        },
      },
    ],
  };
}

export default function GastosPage() {
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [departamento, setDepartamento] = useState("Todos");
  const [tipo, setTipo] = useState("Todos");
  const [grupoEta, setGrupoEta] = useState("Todos");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(100);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [entidadesData, programasData] = await Promise.all([
        fetchJson<Entidad[]>("/data/entidades.json"),
        fetchJson<Programa[]>("/data/programas.json"),
      ]);

      setEntidades(entidadesData);
      setProgramas(programasData);
    }

    load().catch((error) => {
      console.error(error);
      setLoadError(error instanceof Error ? error.message : "Error cargando gastos");
    });
  }, []);

  const departamentos = useMemo(() => {
    return [
      "Todos",
      ...Array.from(new Set(entidades.map((item) => item.departamento).filter(Boolean))).sort(),
    ];
  }, [entidades]);

  const tipos = useMemo(() => {
    return ["Todos", ...Array.from(new Set(entidades.map((item) => item.tipo).filter(Boolean))).sort()];
  }, [entidades]);

  const gruposEta = useMemo(() => {
    return [
      "Todos",
      ...Array.from(new Set(entidades.map((item) => item.grupo_eta).filter(Boolean))).sort(),
    ];
  }, [entidades]);

  const entidadesFiltradas = useMemo(() => {
    const q = query.trim().toLowerCase();

    return entidades
      .filter((item) => departamento === "Todos" || item.departamento === departamento)
      .filter((item) => tipo === "Todos" || item.tipo === tipo)
      .filter((item) => grupoEta === "Todos" || item.grupo_eta === grupoEta)
      .filter((item) => {
        if (!q) return true;

        return (
          normalize(item.codigo_entidad).includes(q) ||
          normalize(item.nombre_entidad).includes(q) ||
          normalize(item.departamento).includes(q) ||
          normalize(item.tipo).includes(q) ||
          normalize(item.grupo_eta).includes(q)
        );
      });
  }, [entidades, departamento, tipo, grupoEta, query]);

  const programasFiltrados = useMemo(() => {
    const q = query.trim().toLowerCase();

    return programas
      .filter((item) => departamento === "Todos" || item.departamento === departamento)
      .filter((item) => tipo === "Todos" || item.tipo === tipo)
      .filter((item) => grupoEta === "Todos" || item.grupo_eta === grupoEta)
      .filter((item) => {
        if (!q) return true;

        return (
          normalize(item.codigo_entidad).includes(q) ||
          normalize(item.nombre_entidad).includes(q) ||
          normalize(item.descripcion).includes(q) ||
          normalize(item.departamento).includes(q) ||
          normalize(item.tipo).includes(q) ||
          normalize(item.grupo_eta).includes(q)
        );
      })
      .sort((a, b) => Number(b.total || 0) - Number(a.total || 0));
  }, [programas, departamento, tipo, grupoEta, query]);

  const visibles = programasFiltrados.slice(0, limit);

  const gastoTotal = entidadesFiltradas.reduce(
    (acc, item) => acc + Number(item.presupuesto_total || 0),
    0
  );

  const grupos = useMemo(() => {
    const defs: { key: GrupoKey; label: string }[] = [
      { key: "grupo_1", label: "Grupo 1" },
      { key: "grupo_2", label: "Grupo 2" },
      { key: "grupo_3", label: "Grupo 3" },
      { key: "grupo_4", label: "Grupo 4" },
      { key: "grupo_5", label: "Grupo 5" },
      { key: "grupo_6", label: "Grupo 6" },
      { key: "grupo_7", label: "Grupo 7" },
      { key: "grupo_8", label: "Grupo 8" },
      { key: "grupo_9", label: "Grupo 9" },
    ];

    return defs
      .map((grupo) => ({
        key: grupo.key,
        label: grupo.label,
        monto: entidadesFiltradas.reduce((acc, item) => acc + Number(item[grupo.key] || 0), 0),
      }))
      .sort((a, b) => b.monto - a.monto);
  }, [entidadesFiltradas]);

  const grupoPrincipal = grupos[0];

  const gruposOption = chartOptionVertical({
    labels: grupos.map((item) => item.label),
    values: grupos.map((item) => item.monto),
  });

  const programasOption = chartOptionHorizontal({
    labels: [...programasFiltrados]
      .slice(0, 20)
      .reverse()
      .map((item) => `${shortEntidadLabel(item.nombre_entidad)} · PRG ${item.prg}`),
    values: [...programasFiltrados]
      .slice(0, 20)
      .reverse()
      .map((item) => item.total),
    left: 360,
  });

  const resetFilters = () => {
    setDepartamento("Todos");
    setTipo("Todos");
    setGrupoEta("Todos");
    setQuery("");
    setLimit(100);
  };

  return (
    <main className="min-h-screen ofp-page-bg text-slate-950">
      <section className="ofp-hero">
        <div className="ofp-hero-inner mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
          >
            <ArrowLeft size={16} />
            Volver al resumen
          </Link>

          <div className="mt-6 flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
                Análisis presupuestario
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">Gastos</h1>
              <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600">
  Análisis de la estructura del gasto público subnacional. Presenta la distribución presupuestaria por entidad, departamento, grupo ETA, programas y grupos de gasto, permitiendo identificar prioridades institucionales, concentración del gasto y patrones territoriales de asignación.
</p>
            </div>

            <div className="hidden rounded-3xl border border-teal-100 bg-teal-50 p-4 text-teal-700 md:block">
              <Wallet size={32} />
            </div>
          </div>
        </div>
      </section>

      <section className="ofp-hero-inner mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        {loadError ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            {loadError}
          </div>
        ) : null}

        <div className="ofp-card rounded-3xl p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
                Filtros
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">Filtros de gasto</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Filtran entidades, grupos de gasto, programas y tabla inferior.
              </p>
            </div>

            <button
              onClick={resetFilters}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
            >
              Limpiar filtros
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_160px]">
            <div>
              <label className="text-sm font-medium text-slate-700">Buscar</label>
              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 transition focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
                <Search size={16} className="text-slate-400" />
                <input
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="Entidad, código o programa..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Departamento</label>
              <select
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                value={departamento}
                onChange={(event) => setDepartamento(event.target.value)}
              >
                {departamentos.map((item) => (
                  <option key={item} value={item}>{formatFilterOptionLabel(item)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Tipo</label>
              <select
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                value={tipo}
                onChange={(event) => setTipo(event.target.value)}
              >
                {tipos.map((item) => (
                  <option key={item} value={item}>{formatFilterOptionLabel(item)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Grupo ETA</label>
              <select
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                value={grupoEta}
                onChange={(event) => setGrupoEta(event.target.value)}
              >
                {gruposEta.map((item) => (
                  <option key={item} value={item}>{formatFilterOptionLabel(item)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Límite</label>
              <select
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Gasto filtrado"
            value={formatBs(gastoTotal)}
            subtitle={`${formatInt(entidadesFiltradas.length)} entidades`}
            icon={<Wallet size={24} />}
          />
          <MetricCard
            title="Programas filtrados"
            value={formatInt(programasFiltrados.length)}
            subtitle={`Mostrando ${formatInt(visibles.length)}`}
            icon={<BarChart3 size={24} />}
          />
          <MetricCard
            title="Grupo principal"
            value={grupoPrincipal ? grupoPrincipal.label : "-"}
            subtitle={grupoPrincipal ? formatBs(grupoPrincipal.monto) : "Sin datos"}
            icon={<Layers3 size={24} />}
          />
          <MetricCard
            title="Participación grupo principal"
            value={grupoPrincipal ? formatPct(grupoPrincipal.monto, gastoTotal) : "0,00%"}
            subtitle="Sobre gasto filtrado"
          />
        </div>

        <div className="mt-8 grid gap-6">
          <Section
            title="Grupos de gasto"
            description="Distribución del gasto según los filtros seleccionados."
          >
            <div className="h-[520px]">
              <ReactECharts option={gruposOption} style={{ height: "100%", width: "100%" }} />
            </div>
          </Section>

          <Section
            title="Top programas presupuestarios"
            description="Programas con mayor presupuesto dentro del filtro actual."
          >
            <div className="h-[720px]">
              <ReactECharts option={programasOption} style={{ height: "100%", width: "100%" }} />
            </div>
          </Section>
        </div>

        <div className="mt-8 overflow-hidden ofp-card rounded-3xl">
          <div className="border-b border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
              Tabla
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">Tabla de programas</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Ranking filtrado por presupuesto total del programa.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                  <th className="p-3">Entidad</th>
                  <th className="p-3">Departamento</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Grupo ETA</th>
                  <th className="p-3">PRG</th>
                  <th className="p-3">Programa</th>
                  <th className="p-3 text-right tabular-nums text-slate-700">Total</th>
                  <th className="p-3 text-right tabular-nums text-slate-700">% filtro</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((item, index) => (
                  <tr
                    key={`${item.codigo_entidad}-${item.prg}-${index}`}
                    className="border-b border-slate-100 transition hover:bg-slate-50"
                  >
                    <td className="p-3 font-medium text-slate-950">{item.nombre_entidad}</td>
                    <td className="p-3">{item.departamento}</td>
                    <td className="p-3">{item.tipo}</td>
                    <td className="p-3">{item.grupo_eta}</td>
                    <td className="p-3 font-mono text-xs text-slate-600">{item.prg}</td>
                    <td className="p-3">{item.descripcion}</td>
                    <td className="p-3 text-right font-semibold tabular-nums text-slate-950">{formatBs(item.total)}</td>
                    <td className="p-3 text-right tabular-nums text-slate-700">{formatPct(item.total, gastoTotal)}</td>
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
