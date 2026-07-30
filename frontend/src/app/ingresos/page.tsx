"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReactECharts from "echarts-for-react";
import { ArrowLeft, Landmark, Search, WalletCards, Scale, Building2 } from "lucide-react";

type IngresosGastos = {
  codigo_entidad: string;
  nombre_entidad: string;
  departamento: string;
  grupo_eta: string;
  tipo: string;
  ingresos_total: number;
  gastos_total: number;
  ingresos_menos_gastos: number;
};

type RecursoRubro = {
  rubro: string;
  descripcion: string;
  importe: number;
};

function formatBs(value: number): string {
  return `Bs ${Number(value || 0).toLocaleString("es-BO", {
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
          {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        {icon ? <div className="rounded-xl bg-slate-100 p-3 text-slate-700">{icon}</div> : null}
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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
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
    grid: { left, right: 40, top: 20, bottom: 40 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (value: number) => formatBs(value),
    },
    xAxis: {
      type: "value",
      axisLabel: {
        formatter: (value: number) => formatInt(value),
      },
    },
    yAxis: {
      type: "category",
      data: labels,
      axisLabel: {
        width: left - 20,
        overflow: "truncate",
      },
    },
    series: [
      {
        type: "bar",
        data: values,
      },
    ],
  };
}

export default function IngresosPage() {
  const [rows, setRows] = useState<IngresosGastos[]>([]);
  const [recursosRubro, setRecursosRubro] = useState<RecursoRubro[]>([]);
  const [departamento, setDepartamento] = useState("Todos");
  const [tipo, setTipo] = useState("Todos");
  const [grupoEta, setGrupoEta] = useState("Todos");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(100);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [ingresosGastosData, recursosRubroData] = await Promise.all([
        fetchJson<IngresosGastos[]>("/data/ingresos_vs_gastos.json"),
        fetchJson<RecursoRubro[]>("/data/recursos_rubro.json"),
      ]);

      setRows(ingresosGastosData);
      setRecursosRubro(recursosRubroData);
    }

    load().catch((error) => {
      console.error(error);
      setLoadError(error instanceof Error ? error.message : "Error cargando ingresos");
    });
  }, []);

  const departamentos = useMemo(() => {
    return [
      "Todos",
      ...Array.from(new Set(rows.map((item) => item.departamento).filter(Boolean))).sort(),
    ];
  }, [rows]);

  const tipos = useMemo(() => {
    return ["Todos", ...Array.from(new Set(rows.map((item) => item.tipo).filter(Boolean))).sort()];
  }, [rows]);

  const gruposEta = useMemo(() => {
    return [
      "Todos",
      ...Array.from(new Set(rows.map((item) => item.grupo_eta).filter(Boolean))).sort(),
    ];
  }, [rows]);

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();

    return rows
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
      })
      .sort((a, b) => Number(b.ingresos_total || 0) - Number(a.ingresos_total || 0));
  }, [rows, departamento, tipo, grupoEta, query]);

  const visibles = filtradas.slice(0, limit);

  const ingresosTotal = filtradas.reduce((acc, item) => acc + Number(item.ingresos_total || 0), 0);
  const gastosTotal = filtradas.reduce((acc, item) => acc + Number(item.gastos_total || 0), 0);
  const diferencia = ingresosTotal - gastosTotal;

  const topIngresosOption = chartOptionHorizontal({
    labels: [...filtradas]
      .slice(0, 20)
      .reverse()
      .map((item) => item.nombre_entidad),
    values: [...filtradas]
      .slice(0, 20)
      .reverse()
      .map((item) => item.ingresos_total),
    left: 300,
  });

  const rubrosOption = chartOptionHorizontal({
    labels: [...recursosRubro]
      .slice(0, 18)
      .reverse()
      .map((item) => `${item.rubro} · ${item.descripcion}`),
    values: [...recursosRubro]
      .slice(0, 18)
      .reverse()
      .map((item) => item.importe),
    left: 330,
  });

  const resetFilters = () => {
    setDepartamento("Todos");
    setTipo("Todos");
    setGrupoEta("Todos");
    setQuery("");
    setLimit(100);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-950"
          >
            <ArrowLeft size={16} />
            Volver al resumen
          </Link>

          <div className="mt-6 flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
                Recursos presupuestarios
              </p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight">Ingresos</h1>
              <p className="mt-3 max-w-3xl text-slate-600">
                Exploración de ingresos por entidad y comparación contra gastos. Los rubros se
                muestran como agregado general; el detalle filtrable por rubro se agregará cuando
                exportemos el dataset largo de recursos.
              </p>
            </div>

            <div className="hidden rounded-2xl bg-slate-100 p-4 text-slate-700 md:block">
              <WalletCards size={32} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        {loadError ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            {loadError}
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Filtros de ingresos</h2>
              <p className="mt-1 text-sm text-slate-500">
                Filtran entidades, comparación ingresos/gastos y tabla inferior.
              </p>
            </div>

            <button
              onClick={resetFilters}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Limpiar filtros
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_160px]">
            <div>
              <label className="text-sm font-medium text-slate-700">Buscar</label>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
                <Search size={16} className="text-slate-400" />
                <input
                  className="w-full outline-none"
                  placeholder="Entidad, código o departamento..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Departamento</label>
              <select
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                value={departamento}
                onChange={(event) => setDepartamento(event.target.value)}
              >
                {departamentos.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Tipo</label>
              <select
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                value={tipo}
                onChange={(event) => setTipo(event.target.value)}
              >
                {tipos.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Grupo ETA</label>
              <select
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                value={grupoEta}
                onChange={(event) => setGrupoEta(event.target.value)}
              >
                {gruposEta.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Límite</label>
              <select
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
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
            title="Ingreso filtrado"
            value={formatBs(ingresosTotal)}
            subtitle={`${formatInt(filtradas.length)} entidades`}
            icon={<WalletCards size={24} />}
          />
          <MetricCard
            title="Gasto filtrado"
            value={formatBs(gastosTotal)}
            subtitle="Comparación presupuestaria"
            icon={<Landmark size={24} />}
          />
          <MetricCard
            title="Ingresos - gastos"
            value={formatBs(diferencia)}
            subtitle="Balance agregado filtrado"
            icon={<Scale size={24} />}
          />
          <MetricCard
            title="Entidades filtradas"
            value={formatInt(filtradas.length)}
            subtitle={`Mostrando ${formatInt(visibles.length)}`}
            icon={<Building2 size={24} />}
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Section
            title="Top entidades por ingresos"
            description="Ranking de entidades con mayor ingreso total según filtros."
          >
            <div className="h-[620px]">
              <ReactECharts option={topIngresosOption} style={{ height: "100%", width: "100%" }} />
            </div>
          </Section>

          <Section
            title="Recursos por rubro"
            description="Agregado general por rubro de recurso."
          >
            <div className="h-[620px]">
              <ReactECharts option={rubrosOption} style={{ height: "100%", width: "100%" }} />
            </div>
          </Section>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b bg-white p-5">
            <h2 className="text-xl font-semibold">Tabla ingresos vs gastos</h2>
            <p className="mt-1 text-sm text-slate-500">
              Comparación filtrada por entidad.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left">
                  <th className="p-3">Código</th>
                  <th className="p-3">Entidad</th>
                  <th className="p-3">Departamento</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Grupo ETA</th>
                  <th className="p-3 text-right">Ingresos</th>
                  <th className="p-3 text-right">Gastos</th>
                  <th className="p-3 text-right">Ingresos - gastos</th>
                  <th className="p-3 text-right">% ingresos filtrados</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((item) => (
                  <tr key={item.codigo_entidad} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-mono">{item.codigo_entidad}</td>
                    <td className="p-3 font-medium">{item.nombre_entidad}</td>
                    <td className="p-3">{item.departamento}</td>
                    <td className="p-3">{item.tipo}</td>
                    <td className="p-3">{item.grupo_eta}</td>
                    <td className="p-3 text-right font-semibold">
                      {formatBs(item.ingresos_total)}
                    </td>
                    <td className="p-3 text-right">{formatBs(item.gastos_total)}</td>
                    <td className="p-3 text-right font-semibold">
                      {formatBs(item.ingresos_menos_gastos)}
                    </td>
                    <td className="p-3 text-right">
                      {formatPct(item.ingresos_total, ingresosTotal)}
                    </td>
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
