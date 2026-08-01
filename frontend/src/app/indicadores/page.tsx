"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, Building2, Users, WalletCards, BarChart3 } from "lucide-react";

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

function formatBs(value: number): string {
  return `Bs ${Number(value || 0).toLocaleString("es-BO", {
    maximumFractionDigits: 0,
  })}`;
}

function formatNumber(value: number): string {
  return Number(value || 0).toLocaleString("es-BO", {
    maximumFractionDigits: 0,
  });
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

  return formatBs(n);
}

function normalize(value: string | number | null | undefined): string {
  return String(value || "").toLowerCase();
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
        {icon ? (
          <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function IndicadoresPage() {
  const [data, setData] = useState<EntidadIndicador[]>([]);
  const [query, setQuery] = useState("");
  const [departamento, setDepartamento] = useState("Todos");
  const [tipo, setTipo] = useState("Todos");
  const [grupoEta, setGrupoEta] = useState("Todos");

  useEffect(() => {
    fetch("/data/entidades_indicadores.json")
      .then((response) => response.json())
      .then((rows: EntidadIndicador[]) => setData(rows))
      .catch(() => setData([]));
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
      data: [...topPerCapita].reverse().map((item) => item.nombre_entidad),
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
      data: [...topPoblacion].reverse().map((item) => item.nombre_entidad),
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
          item.nombre_entidad,
          formatBs(item.presupuesto_per_capita),
        ]),
      },
    ],
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
            Volver al observatorio
          </Link>

          <div className="mt-6 max-w-4xl">
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              SIGEP + INE 2024
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">
              Indicadores territoriales per cápita
            </h1>
            <p className="mt-3 text-slate-600">
              Cruce entre presupuesto institucional SIGEP y población censal INE 2024.
              La identidad visible de cada entidad conserva la denominación oficial SIGEP.
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
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
          <label className="text-sm text-slate-600">
            Buscar
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Entidad, municipio, provincia..."
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-950"
            />
          </label>

          <label className="text-sm text-slate-600">
            Departamento
            <select
              value={departamento}
              onChange={(event) => setDepartamento(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-950"
            >
              {departamentos.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-600">
            Tipo
            <select
              value={tipo}
              onChange={(event) => setTipo(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-950"
            >
              {tipos.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-600">
            Grupo ETA
            <select
              value={grupoEta}
              onChange={(event) => setGrupoEta(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-950"
            >
              {gruposEta.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Ranking de presupuesto per cápita</h2>
          <p className="mt-1 text-sm text-slate-500">
            Entidades con mayor presupuesto SIGEP por habitante según población INE 2024.
          </p>
          <div className="mt-4 h-[650px]">
            <ReactECharts option={chartPerCapita} style={{ height: "100%", width: "100%" }} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Presupuesto frente a población</h2>
          <p className="mt-1 text-sm text-slate-500">
            Relación entre tamaño poblacional y presupuesto total aprobado.
          </p>
          <div className="mt-4 h-[520px]">
            <ReactECharts option={scatterPresupuestoPoblacion} style={{ height: "100%", width: "100%" }} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Ranking de población</h2>
          <p className="mt-1 text-sm text-slate-500">
            Entidades ordenadas por población censal INE 2024.
          </p>
          <div className="mt-4 h-[650px]">
            <ReactECharts option={chartPoblacion} style={{ height: "100%", width: "100%" }} />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-xl font-semibold">Tabla de indicadores</h2>
            <p className="mt-1 text-sm text-slate-500">
              Revisión del match SIGEP ↔ INE y cálculo de presupuesto por habitante.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="p-3">Código</th>
                  <th className="p-3">Entidad SIGEP</th>
                  <th className="p-3">Municipio INE</th>
                  <th className="p-3">Provincia INE</th>
                  <th className="p-3 text-right">Población</th>
                  <th className="p-3 text-right">Presupuesto</th>
                  <th className="p-3 text-right">Bs/hab.</th>
                </tr>
              </thead>
              <tbody>
                {[...withPopulation]
                  .sort((a, b) => Number(b.presupuesto_per_capita || 0) - Number(a.presupuesto_per_capita || 0))
                  .slice(0, 100)
                  .map((item) => (
                    <tr key={item.codigo_entidad} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-mono">{item.codigo_entidad}</td>
                      <td className="p-3 font-medium">{item.nombre_entidad}</td>
                      <td className="p-3 text-slate-600">{item.municipio_ine}</td>
                      <td className="p-3 text-slate-600">{item.provincia_ine}</td>
                      <td className="p-3 text-right">{formatNumber(item.poblacion_2024)}</td>
                      <td className="p-3 text-right">{formatBs(item.presupuesto_total)}</td>
                      <td className="p-3 text-right font-semibold">{formatBs(item.presupuesto_per_capita)}</td>
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
