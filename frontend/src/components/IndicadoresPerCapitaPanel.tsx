"use client";
import { formatBs, formatBsCompact, formatNumber, formatPct, normalize, shortEntidadLabel } from "@/lib/format";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

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
  presupuesto_per_capita: number;
};

type Props = {
  departamento: string;
  tipo: string;
  grupoEta: string;
  query: string;
};

export default function IndicadoresPerCapitaPanel({
  departamento,
  tipo,
  grupoEta,
  query,
}: Props) {
  const [data, setData] = useState<EntidadIndicador[]>([]);

  useEffect(() => {
    fetch("/data/entidades_indicadores.json")
      .then((response) => response.json())
      .then((rows: EntidadIndicador[]) => setData(rows))
      .catch(() => setData([]));
  }, []);

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

  const top = [...withPopulation]
    .sort((a, b) => Number(b.presupuesto_per_capita || 0) - Number(a.presupuesto_per_capita || 0))
    .slice(0, 15);

  const option = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (value: number) => formatBs(value),
    },
    grid: { left: 320, right: 40, top: 20, bottom: 45, containLabel: true },
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
      data: [...top].reverse().map((item) => item.nombre_entidad),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: "#334155",
        width: 300,
        overflow: "truncate",
      },
    },
    series: [
      {
        type: "bar",
        data: [...top].reverse().map((item) =>
          Number(item.presupuesto_per_capita || 0)
        ),
        barMaxWidth: 24,
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

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
          Observatorio
        </p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">Indicadores per cápita</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Cruce entre presupuesto SIGEP y población INE 2024. La identidad institucional conserva el nombre oficial SIGEP.
        </p>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Población filtrada</p>
          <p className="mt-2 text-xl font-bold tabular-nums text-slate-950">{formatNumber(totalPoblacion)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Presupuesto filtrado</p>
          <p className="mt-2 text-xl font-bold tabular-nums text-slate-950">{formatBsCompact(totalPresupuesto)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Promedio per cápita</p>
          <p className="mt-2 text-xl font-bold tabular-nums text-slate-950">{formatBs(promedioPonderado)}</p>
        </div>
      </div>

      <div className="h-[560px]">
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
              <th className="px-4 py-3">Entidad SIGEP</th>
              <th className="px-4 py-3">Municipio INE</th>
              <th className="px-4 py-3 text-right">Población 2024</th>
              <th className="px-4 py-3 text-right">Presupuesto</th>
              <th className="px-4 py-3 text-right">Bs/hab.</th>
            </tr>
          </thead>
          <tbody>
            {top.map((item) => (
              <tr key={item.codigo_entidad} className="border-b border-slate-100 transition hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-950">{item.nombre_entidad}</td>
                <td className="px-4 py-3 text-slate-600">{item.municipio_ine}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">{formatNumber(item.poblacion_2024)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">{formatBs(item.presupuesto_total)}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-950">{formatBs(item.presupuesto_per_capita)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
