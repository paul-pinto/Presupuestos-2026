"use client";

import React, { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { BarChart3, Building2, Database, MapPinned } from "lucide-react";

type Summary = {
  gasto_total: number;
  entidades: number;
  departamentos: number;
  manifest: Record<string, { file: string; rows: number; bytes: number }>;
};

type Entidad = {
  codigo_entidad: string;
  nombre_entidad: string;
  departamento: string;
  grupo_eta: string;
  tipo: string;
  presupuesto_total: number;
};

type Departamento = {
  departamento: string;
  presupuesto_total: number;
  entidades: number;
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
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-3 text-slate-700">{icon}</div>
      </div>
    </div>
  );
}

export default function Home() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [departamento, setDepartamento] = useState<string>("Todos");
  const [query, setQuery] = useState<string>("");

  useEffect(() => {
    async function load() {
      const [summaryData, entidadesData, departamentosData, programasData] =
        await Promise.all([
          fetchJson<Summary>("/data/summary.json"),
          fetchJson<Entidad[]>("/data/entidades.json"),
          fetchJson<Departamento[]>("/data/departamentos.json"),
          fetchJson<Programa[]>("/data/programas_top.json"),
        ]);

      setSummary(summaryData);
      setEntidades(entidadesData);
      setDepartamentos(departamentosData);
      setProgramas(programasData);
    }

    load().catch((error) => console.error(error));
  }, []);

  const departamentosOptions = useMemo(() => {
    return ["Todos", ...departamentos.map((item) => item.departamento).filter(Boolean)];
  }, [departamentos]);

  const entidadesFiltradas = useMemo(() => {
    return entidades
      .filter((item) => departamento === "Todos" || item.departamento === departamento)
      .filter((item) => {
        const q = query.trim().toLowerCase();

        if (!q) return true;

        return (
          item.codigo_entidad.toLowerCase().includes(q) ||
          item.nombre_entidad.toLowerCase().includes(q) ||
          item.departamento.toLowerCase().includes(q)
        );
      });
  }, [entidades, departamento, query]);

  const topEntidades = entidadesFiltradas.slice(0, 20);

  const programasFiltrados = useMemo(() => {
    return programas
      .filter((item) => departamento === "Todos" || item.departamento === departamento)
      .slice(0, 20);
  }, [programas, departamento]);

  const rankingOption = {
    grid: { left: 260, right: 40, top: 20, bottom: 40 },
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
      data: [...topEntidades].reverse().map((item) => item.nombre_entidad),
      axisLabel: {
        width: 240,
        overflow: "truncate",
      },
    },
    series: [
      {
        type: "bar",
        data: [...topEntidades].reverse().map((item) => item.presupuesto_total),
      },
    ],
  };

  const departamentosOption = {
    grid: { left: 120, right: 40, top: 20, bottom: 40 },
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
      data: [...departamentos].reverse().map((item) => item.departamento),
    },
    series: [
      {
        type: "bar",
        data: [...departamentos].reverse().map((item) => item.presupuesto_total),
      },
    ],
  };

  const programasOption = {
    grid: { left: 260, right: 40, top: 20, bottom: 40 },
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
      data: [...programasFiltrados].reverse().map(
        (item) => `${item.nombre_entidad} · PRG ${item.prg}`
      ),
      axisLabel: {
        width: 240,
        overflow: "truncate",
      },
    },
    series: [
      {
        type: "bar",
        data: [...programasFiltrados].reverse().map((item) => item.total),
      },
    ],
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            SIGEP · Bolivia · Gestión 2026
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Presupuestos ETA Bolivia 2026
          </h1>
          <p className="mt-4 max-w-3xl text-slate-600">
            Explorador público de presupuestos institucionales municipales y departamentales.
            Versión frontend experimental generada desde DuckDB y datos SIGEP procesados.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Gasto total"
            value={summary ? formatBs(summary.gasto_total) : "Cargando..."}
            icon={<Database size={24} />}
          />
          <MetricCard
            title="Entidades"
            value={summary ? formatInt(summary.entidades) : "Cargando..."}
            icon={<Building2 size={24} />}
          />
          <MetricCard
            title="Departamentos"
            value={summary ? formatInt(summary.departamentos) : "Cargando..."}
            icon={<MapPinned size={24} />}
          />
          <MetricCard
            title="Datasets exportados"
            value={summary ? formatInt(Object.keys(summary.manifest).length) : "Cargando..."}
            icon={<BarChart3 size={24} />}
          />
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[280px_1fr]">
            <div>
              <label className="text-sm font-medium text-slate-700">Departamento</label>
              <select
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                value={departamento}
                onChange={(event) => setDepartamento(event.target.value)}
              >
                {departamentosOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Buscar entidad</label>
              <input
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                placeholder="Código, nombre o departamento..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Ranking de entidades por presupuesto</h2>
            <div className="mt-4 h-[720px]">
              <ReactECharts option={rankingOption} style={{ height: "100%", width: "100%" }} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Gasto agregado por departamento</h2>
            <div className="mt-4 h-[520px]">
              <ReactECharts option={departamentosOption} style={{ height: "100%", width: "100%" }} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Top programas presupuestarios</h2>
            <div className="mt-4 h-[720px]">
              <ReactECharts option={programasOption} style={{ height: "100%", width: "100%" }} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Top entidades</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left">
                    <th className="p-3">Código</th>
                    <th className="p-3">Entidad</th>
                    <th className="p-3">Departamento</th>
                    <th className="p-3">Grupo ETA</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3 text-right">Presupuesto</th>
                  </tr>
                </thead>
                <tbody>
                  {topEntidades.map((item) => (
                    <tr key={item.codigo_entidad} className="border-b">
                      <td className="p-3 font-mono">{item.codigo_entidad}</td>
                      <td className="p-3">{item.nombre_entidad}</td>
                      <td className="p-3">{item.departamento}</td>
                      <td className="p-3">{item.grupo_eta}</td>
                      <td className="p-3">{item.tipo}</td>
                      <td className="p-3 text-right font-medium">
                        {formatBs(item.presupuesto_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
