"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReactECharts from "echarts-for-react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Landmark,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

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

type ValidacionRow = {
  codigo_entidad: string;
  nombre_entidad: string;
  departamento: string;
  tipo: string;
  grupo_eta: string;
  gastos_categoria_grupo: number;
  ingresos_recursos_rubro: number;
  gastos_objeto_fuente: number;
  diff_ingresos_vs_gastos: number;
  diff_objeto_vs_categoria: number;
};

function formatBs(value: number): string {
  return `Bs ${Number(value || 0).toLocaleString("es-BO", {
    maximumFractionDigits: 0,
  })}`;
}\n\nfunction formatBsCompact(value: number): string {
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
        {icon ? (
          <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
            {icon}
          </div>
        ) : null}
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
        {description ? (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        ) : null}
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
        formatter: (value: number) => formatBsCompact(value),
        hideOverlap: true,
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

export default function EntidadDetallePage() {
  const params = useParams<{ codigo: string }>();
  const codigo = String(params.codigo || "");

  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [ingresosGastos, setIngresosGastos] = useState<IngresosGastos[]>([]);
  const [validacion, setValidacion] = useState<ValidacionRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [entidadesData, programasData, ingresosGastosData, validacionData] =
        await Promise.all([
          fetchJson<Entidad[]>("/data/entidades.json"),
          fetchJson<Programa[]>("/data/programas.json"),
          fetchJson<IngresosGastos[]>("/data/ingresos_vs_gastos.json"),
          fetchJson<ValidacionRow[]>("/data/validacion_integrada.json"),
        ]);

      setEntidades(entidadesData);
      setProgramas(programasData);
      setIngresosGastos(ingresosGastosData);
      setValidacion(validacionData);
    }

    load().catch((error) => {
      console.error(error);
      setLoadError(
        error instanceof Error ? error.message : "Error cargando ficha de entidad"
      );
    });
  }, []);

  const entidad = useMemo(() => {
    return entidades.find((item) => item.codigo_entidad === codigo);
  }, [entidades, codigo]);

  const programasEntidad = useMemo(() => {
    return programas
      .filter((item) => item.codigo_entidad === codigo)
      .sort((a, b) => Number(b.total || 0) - Number(a.total || 0));
  }, [programas, codigo]);

  const ingresosEntidad = useMemo(() => {
    return ingresosGastos.find((item) => item.codigo_entidad === codigo);
  }, [ingresosGastos, codigo]);

  const validacionEntidad = useMemo(() => {
    return validacion.find((item) => item.codigo_entidad === codigo);
  }, [validacion, codigo]);

  const grupos = useMemo(() => {
    if (!entidad) return [];

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
        monto: Number(entidad[grupo.key] || 0),
      }))
      .sort((a, b) => b.monto - a.monto);
  }, [entidad]);

  const gruposOption = chartOptionHorizontal({
    labels: [...grupos].reverse().map((item) => item.label),
    values: [...grupos].reverse().map((item) => item.monto),
    left: 130,
  });

  const programasOption = chartOptionHorizontal({
    labels: [...programasEntidad]
      .slice(0, 15)
      .reverse()
      .map((item) => `PRG ${item.prg} · ${item.descripcion}`),
    values: [...programasEntidad]
      .slice(0, 15)
      .reverse()
      .map((item) => item.total),
    left: 300,
  });

  const diffIngresosGastos = validacionEntidad?.diff_ingresos_vs_gastos || 0;
  const diffObjetoCategoria = validacionEntidad?.diff_objeto_vs_categoria || 0;

  const estadoOk =
    Math.abs(Number(diffIngresosGastos || 0)) <= 1 &&
    Math.abs(Number(diffObjetoCategoria || 0)) <= 1;

  if (loadError) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-slate-950">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          {loadError}
        </div>
      </main>
    );
  }

  if (!entidad) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-950">
        <section className="mx-auto max-w-4xl px-6 py-12">
          <Link
            href="/entidades"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-950"
          >
            <ArrowLeft size={16} />
            Volver a entidades
          </Link>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-3xl font-bold">Entidad no encontrada</h1>
            <p className="mt-3 text-slate-600">
              No se encontró una entidad con código {codigo}. Verifica el código o vuelve al
              explorador de entidades.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <Link
            href="/entidades"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-950"
          >
            <ArrowLeft size={16} />
            Volver a entidades
          </Link>

          <div className="mt-6 flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
                Ficha individual · Código {entidad.codigo_entidad}
              </p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight">
                {entidad.nombre_entidad}
              </h1>
              <p className="mt-3 max-w-3xl text-slate-600">
                {entidad.departamento} · {entidad.tipo} · {entidad.grupo_eta}
              </p>
            </div>

            <div className="hidden rounded-2xl bg-slate-100 p-4 text-slate-700 md:block">
              <Building2 size={32} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Presupuesto total"
            value={formatBs(entidad.presupuesto_total)}
            subtitle="Categoría programática / grupos"
            icon={<Landmark size={24} />}
          />
          <MetricCard
            title="Ingresos"
            value={formatBs(ingresosEntidad?.ingresos_total || 0)}
            subtitle="Recursos por rubro"
            icon={<WalletCards size={24} />}
          />
          <MetricCard
            title="Ingresos - gastos"
            value={formatBs(ingresosEntidad?.ingresos_menos_gastos || 0)}
            subtitle="Comparación presupuestaria"
          />
          <MetricCard
            title="Validación"
            value={estadoOk ? "OK" : "Diferencia"}
            subtitle="Tolerancia: Bs 1"
            icon={<ShieldCheck size={24} />}
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Section
            title="Distribución por grupos de gasto"
            description="Composición del presupuesto de la entidad."
          >
            <div className="h-[520px]">
              <ReactECharts option={gruposOption} style={{ height: "100%", width: "100%" }} />
            </div>
          </Section>

          <Section
            title="Programas principales"
            description="Programas disponibles en el dataset exportado."
          >
            <div className="h-[520px]">
              <ReactECharts option={programasOption} style={{ height: "100%", width: "100%" }} />
            </div>
          </Section>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Section title="Validación integrada">
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                {estadoOk ? (
                  <CheckCircle2 size={18} className="text-emerald-600" />
                ) : (
                  <ShieldCheck size={18} className="text-amber-600" />
                )}
                <span>
                  {estadoOk
                    ? "La entidad cuadra con la tolerancia aplicada."
                    : "La entidad presenta diferencias."}
                </span>
              </div>

              <div className="grid gap-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-slate-500">Gasto categoría/grupo</p>
                  <p className="mt-1 font-semibold">
                    {formatBs(validacionEntidad?.gastos_categoria_grupo || 0)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-slate-500">Ingresos recursos/rubro</p>
                  <p className="mt-1 font-semibold">
                    {formatBs(validacionEntidad?.ingresos_recursos_rubro || 0)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-slate-500">Gasto objeto/fuente</p>
                  <p className="mt-1 font-semibold">
                    {formatBs(validacionEntidad?.gastos_objeto_fuente || 0)}
                  </p>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Diferencias de control">
            <div className="grid gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-slate-500">Diff ingresos vs gastos</p>
                <p className="mt-1 text-xl font-semibold">{formatBs(diffIngresosGastos)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-slate-500">Diff objeto vs categoría</p>
                <p className="mt-1 text-xl font-semibold">{formatBs(diffObjetoCategoria)}</p>
              </div>
            </div>
          </Section>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b bg-white p-5">
            <h2 className="text-xl font-semibold">Tabla de programas</h2>
            <p className="mt-1 text-sm text-slate-500">
              Programas exportados para esta entidad.
            </p>
          </div>

          {programasEntidad.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">
              No hay programas disponibles para esta entidad en programas.json.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left">
                    <th className="p-3">PRG</th>
                    <th className="p-3">Programa</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-right">% entidad</th>
                  </tr>
                </thead>
                <tbody>
                  {programasEntidad.map((item, index) => (
                    <tr
                      key={`${item.codigo_entidad}-${item.prg}-${index}`}
                      className="border-b hover:bg-slate-50"
                    >
                      <td className="p-3 font-mono">{item.prg}</td>
                      <td className="p-3 font-medium">{item.descripcion}</td>
                      <td className="p-3 text-right font-semibold">
                        {formatBs(item.total)}
                      </td>
                      <td className="p-3 text-right">
                        {formatPct(item.total, entidad.presupuesto_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}