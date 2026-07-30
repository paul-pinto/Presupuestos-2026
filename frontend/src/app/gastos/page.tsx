"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReactECharts from "echarts-for-react";
import { ArrowLeft, BarChart3, Layers3, Search, Wallet } from "lucide-react";

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

function chartOptionVertical({
  labels,
  values,
}: {
  labels: string[];
  values: number[];
}) {
  return {
    grid: { left: 90, right: 30, top: 20, bottom: 80 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (value: number) => formatBs(value),
    },
    xAxis: {
      type: "category",
      data: labels,
      axisLabel: {
        rotate: 35,
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        formatter: (value: number) => formatInt(value),
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
        fetchJson<Programa[]>("/data/programas_top.json"),
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
      .map((item) => `${item.nombre_entidad} · PRG ${item.prg}`),
    values: [...programasFiltrados]
      .slice(0, 20)
      .reverse()
      .map((item) => item.total),
    left: 320,
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
                Análisis presupuestario
              </p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight">Gastos</h1>
              <p className="mt-3 max-w-3xl text-slate-600">
                Exploración del gasto por entidad, grupo de gasto y programas presupuestarios.
                Esta vista usa los datos exportados desde DuckDB hacia JSON estático.
              </p>
            </div>

            <div className="hidden rounded-2xl bg-slate-100 p-4 text-slate-700 md:block">
              <Wallet size={32} />
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
              <h2 className="text-xl font-semibold">Filtros de gasto</h2>
              <p className="mt-1 text-sm text-slate-500">
                Filtran entidades, grupos de gasto, programas y tabla inferior.
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
                  placeholder="Entidad, código o programa..."
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

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
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
            <div className="h-[520px]">
              <ReactECharts option={programasOption} style={{ height: "100%", width: "100%" }} />
            </div>
          </Section>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b bg-white p-5">
            <h2 className="text-xl font-semibold">Tabla de programas</h2>
            <p className="mt-1 text-sm text-slate-500">
              Ranking filtrado por presupuesto total del programa.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left">
                  <th className="p-3">Entidad</th>
                  <th className="p-3">Departamento</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Grupo ETA</th>
                  <th className="p-3">PRG</th>
                  <th className="p-3">Programa</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-right">% filtro</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((item, index) => (
                  <tr
                    key={`${item.codigo_entidad}-${item.prg}-${index}`}
                    className="border-b hover:bg-slate-50"
                  >
                    <td className="p-3 font-medium">{item.nombre_entidad}</td>
                    <td className="p-3">{item.departamento}</td>
                    <td className="p-3">{item.tipo}</td>
                    <td className="p-3">{item.grupo_eta}</td>
                    <td className="p-3 font-mono">{item.prg}</td>
                    <td className="p-3">{item.descripcion}</td>
                    <td className="p-3 text-right font-semibold">{formatBs(item.total)}</td>
                    <td className="p-3 text-right">{formatPct(item.total, gastoTotal)}</td>
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
