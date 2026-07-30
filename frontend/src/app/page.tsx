"use client";

import React, { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Database,
  FileCheck2,
  Landmark,
  MapPinned,
  WalletCards,
} from "lucide-react";

type Summary = {
  gasto_total: number;
  ingresos_total: number;
  gasto_total_objeto: number;
  entidades: number;
  departamentos: number;
  entidades_con_diferencias: number;
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

type GrupoGasto = {
  grupo_gasto: string;
  grupo_gasto_label: string;
  monto: number;
};

type RecursoRubro = {
  rubro: string;
  descripcion: string;
  importe: number;
};

type ObjetoGasto = {
  objeto_gasto: string;
  descripcion: string;
  total: number;
};

type FuenteObjeto = {
  fuente_columna: string;
  monto: number;
};

type ValidacionDiferencia = {
  codigo_entidad: string;
  nombre_entidad?: string;
  departamento?: string;
  grupo_eta?: string;
  tipo?: string;
  gastos_categoria_grupo?: number;
  ingresos_recursos_rubro?: number;
  gastos_objeto_fuente?: number;
  diff_ingresos_vs_gastos: number;
  diff_objeto_vs_categoria: number;
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
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
          {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        <div className="rounded-xl bg-slate-100 p-3 text-slate-700">{icon}</div>
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
    grid: { left: 80, right: 30, top: 20, bottom: 80 },
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
        width: 100,
        overflow: "truncate",
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

export default function Home() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [gruposGasto, setGruposGasto] = useState<GrupoGasto[]>([]);
  const [recursosRubro, setRecursosRubro] = useState<RecursoRubro[]>([]);
  const [objetoGasto, setObjetoGasto] = useState<ObjetoGasto[]>([]);
  const [fuentesObjeto, setFuentesObjeto] = useState<FuenteObjeto[]>([]);
  const [validacionDiferencias, setValidacionDiferencias] = useState<ValidacionDiferencia[]>([]);
  const [departamento, setDepartamento] = useState<string>("Todos");
  const [query, setQuery] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [
        summaryData,
        entidadesData,
        departamentosData,
        programasData,
        gruposGastoData,
        recursosRubroData,
        objetoGastoData,
        fuentesObjetoData,
        validacionDiferenciasData,
      ] = await Promise.all([
        fetchJson<Summary>("/data/summary.json"),
        fetchJson<Entidad[]>("/data/entidades.json"),
        fetchJson<Departamento[]>("/data/departamentos.json"),
        fetchJson<Programa[]>("/data/programas_top.json"),
        fetchJson<GrupoGasto[]>("/data/grupos_gasto.json"),
        fetchJson<RecursoRubro[]>("/data/recursos_rubro.json"),
        fetchJson<ObjetoGasto[]>("/data/objeto_gasto_nivel1.json"),
        fetchJson<FuenteObjeto[]>("/data/fuentes_objeto_gasto.json"),
        fetchJson<ValidacionDiferencia[]>("/data/validacion_diferencias.json"),
      ]);

      setSummary(summaryData);
      setEntidades(entidadesData);
      setDepartamentos(departamentosData);
      setProgramas(programasData);
      setGruposGasto(gruposGastoData);
      setRecursosRubro(recursosRubroData);
      setObjetoGasto(objetoGastoData);
      setFuentesObjeto(fuentesObjetoData);
      setValidacionDiferencias(validacionDiferenciasData);
    }

    load().catch((error) => {
      console.error(error);
      setLoadError(error instanceof Error ? error.message : "Error desconocido cargando datos");
    });
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

  const rankingOption = chartOptionHorizontal({
    labels: [...topEntidades].reverse().map((item) => item.nombre_entidad),
    values: [...topEntidades].reverse().map((item) => item.presupuesto_total),
    left: 280,
  });

  const departamentosOption = chartOptionHorizontal({
    labels: [...departamentos].reverse().map((item) => item.departamento),
    values: [...departamentos].reverse().map((item) => item.presupuesto_total),
    left: 130,
  });

  const programasOption = chartOptionHorizontal({
    labels: [...programasFiltrados]
      .reverse()
      .map((item) => `${item.nombre_entidad} · PRG ${item.prg}`),
    values: [...programasFiltrados].reverse().map((item) => item.total),
    left: 300,
  });

  const gruposGastoOption = chartOptionVertical({
    labels: gruposGasto.map((item) => item.grupo_gasto_label),
    values: gruposGasto.map((item) => item.monto),
  });

  const recursosRubroOption = chartOptionHorizontal({
    labels: [...recursosRubro]
      .slice(0, 15)
      .reverse()
      .map((item) => `${item.rubro} · ${item.descripcion}`),
    values: [...recursosRubro]
      .slice(0, 15)
      .reverse()
      .map((item) => item.importe),
    left: 300,
  });

  const objetoGastoOption = chartOptionHorizontal({
    labels: [...objetoGasto]
      .slice(0, 15)
      .reverse()
      .map((item) => `${item.objeto_gasto} · ${item.descripcion}`),
    values: [...objetoGasto]
      .slice(0, 15)
      .reverse()
      .map((item) => item.total),
    left: 300,
  });

  const fuentesObjetoOption = chartOptionHorizontal({
    labels: [...fuentesObjeto].reverse().map((item) => item.fuente_columna),
    values: [...fuentesObjeto].reverse().map((item) => item.monto),
    left: 220,
  });

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
            Versión React/Next.js generada desde DuckDB y datos SIGEP procesados.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <a
              href="https://paul-pinto-presupuestos-2026-app-neflqq.streamlit.app/"
              target="_blank"
              className="rounded-full border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100"
            >
              Abrir versión Streamlit
            </a>
            <a
              href="https://github.com/paul-pinto/Presupuestos-2026"
              target="_blank"
              className="rounded-full border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100"
            >
              Ver repositorio
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        {loadError ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            {loadError}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Gasto total"
            value={summary ? formatBs(summary.gasto_total) : "Cargando..."}
            subtitle="Categoría programática / grupo de gasto"
            icon={<Database size={24} />}
          />
          <MetricCard
            title="Ingreso total"
            value={summary ? formatBs(summary.ingresos_total) : "Cargando..."}
            subtitle="Recursos por rubro"
            icon={<WalletCards size={24} />}
          />
          <MetricCard
            title="Objeto/Fuente"
            value={summary ? formatBs(summary.gasto_total_objeto) : "Cargando..."}
            subtitle="Objeto del gasto por fuente"
            icon={<Landmark size={24} />}
          />
          <MetricCard
            title="Entidades"
            value={summary ? formatInt(summary.entidades) : "Cargando..."}
            subtitle={summary ? `${formatInt(summary.departamentos)} departamentos` : ""}
            icon={<Building2 size={24} />}
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <MetricCard
            title="Entidades con diferencias"
            value={summary ? formatInt(summary.entidades_con_diferencias) : "Cargando..."}
            subtitle="Tolerancia aplicada: Bs 1"
            icon={<AlertTriangle size={24} />}
          />
          <MetricCard
            title="Datasets exportados"
            value={summary ? formatInt(Object.keys(summary.manifest).length) : "Cargando..."}
            subtitle="JSON estático servido por Vercel"
            icon={<FileCheck2 size={24} />}
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
          <Section
            title="Ranking de entidades por presupuesto"
            description="Top 20 según filtros seleccionados."
          >
            <div className="h-[720px]">
              <ReactECharts option={rankingOption} style={{ height: "100%", width: "100%" }} />
            </div>
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Gasto agregado por departamento">
              <div className="h-[520px]">
                <ReactECharts option={departamentosOption} style={{ height: "100%", width: "100%" }} />
              </div>
            </Section>

            <Section title="Grupos de gasto">
              <div className="h-[520px]">
                <ReactECharts option={gruposGastoOption} style={{ height: "100%", width: "100%" }} />
              </div>
            </Section>
          </div>

          <Section
            title="Top programas presupuestarios"
            description="Programas con mayor presupuesto dentro del universo exportado."
          >
            <div className="h-[720px]">
              <ReactECharts option={programasOption} style={{ height: "100%", width: "100%" }} />
            </div>
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Recursos / ingresos por rubro">
              <div className="h-[620px]">
                <ReactECharts option={recursosRubroOption} style={{ height: "100%", width: "100%" }} />
              </div>
            </Section>

            <Section title="Objeto del gasto nivel 1">
              <div className="h-[620px]">
                <ReactECharts option={objetoGastoOption} style={{ height: "100%", width: "100%" }} />
              </div>
            </Section>
          </div>

          <Section title="Fuentes de financiamiento en objeto del gasto">
            <div className="h-[420px]">
              <ReactECharts option={fuentesObjetoOption} style={{ height: "100%", width: "100%" }} />
            </div>
          </Section>

          <Section
            title="Top entidades"
            description={`Mostrando ${topEntidades.length} entidades. Total filtrado: ${formatInt(
              entidadesFiltradas.length
            )}.`}
          >
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left">
                    <th className="p-3">Código</th>
                    <th className="p-3">Entidad</th>
                    <th className="p-3">Departamento</th>
                    <th className="p-3">Grupo ETA</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3 text-right">Presupuesto</th>
                    <th className="p-3 text-right">% filtro</th>
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
                      <td className="p-3 text-right">
                        {formatPct(
                          item.presupuesto_total,
                          entidadesFiltradas.reduce((acc, row) => acc + row.presupuesto_total, 0)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section
            title="Validación integrada"
            description="Entidades con diferencias entre ingresos, gastos por categoría/grupo y objeto/fuente."
          >
            {validacionDiferencias.length === 0 ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
                Todas las entidades cuadran con la tolerancia aplicada.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left">
                      <th className="p-3">Código</th>
                      <th className="p-3">Entidad</th>
                      <th className="p-3">Departamento</th>
                      <th className="p-3 text-right">Diff ingresos vs gastos</th>
                      <th className="p-3 text-right">Diff objeto vs categoría</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validacionDiferencias.slice(0, 30).map((item) => (
                      <tr key={item.codigo_entidad} className="border-b">
                        <td className="p-3 font-mono">{item.codigo_entidad}</td>
                        <td className="p-3">{item.nombre_entidad || "-"}</td>
                        <td className="p-3">{item.departamento || "-"}</td>
                        <td className="p-3 text-right">
                          {formatBs(item.diff_ingresos_vs_gastos)}
                        </td>
                        <td className="p-3 text-right">
                          {formatBs(item.diff_objeto_vs_categoria)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      </section>
    </main>
  );
}
