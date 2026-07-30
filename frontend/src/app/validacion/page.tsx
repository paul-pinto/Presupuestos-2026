"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Search } from "lucide-react";

type ValidacionRow = {
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

function formatBs(value: number | undefined): string {
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
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
      {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
    </div>
  );
}

function absTotal(row: ValidacionRow): number {
  return (
    Math.abs(Number(row.diff_ingresos_vs_gastos || 0)) +
    Math.abs(Number(row.diff_objeto_vs_categoria || 0))
  );
}

export default function ValidacionPage() {
  const [rows, setRows] = useState<ValidacionRow[]>([]);
  const [departamento, setDepartamento] = useState("Todos");
  const [query, setQuery] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<ValidacionRow[]>("/data/validacion_diferencias.json")
      .then(setRows)
      .catch((error) => {
        console.error(error);
        setLoadError(error instanceof Error ? error.message : "Error cargando validación");
      });
  }, []);

  const departamentos = useMemo(() => {
    return [
      "Todos",
      ...Array.from(new Set(rows.map((item) => item.departamento).filter(Boolean))).sort(),
    ] as string[];
  }, [rows]);

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();

    return rows
      .filter((item) => departamento === "Todos" || item.departamento === departamento)
      .filter((item) => {
        if (!q) return true;

        return (
          String(item.codigo_entidad || "").toLowerCase().includes(q) ||
          String(item.nombre_entidad || "").toLowerCase().includes(q) ||
          String(item.departamento || "").toLowerCase().includes(q) ||
          String(item.grupo_eta || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => absTotal(b) - absTotal(a));
  }, [rows, departamento, query]);

  const diffIngresosGastos = filtradas.reduce(
    (acc, item) => acc + Number(item.diff_ingresos_vs_gastos || 0),
    0
  );

  const diffObjetoCategoria = filtradas.reduce(
    (acc, item) => acc + Number(item.diff_objeto_vs_categoria || 0),
    0
  );

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
                Control de calidad
              </p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight">
                Validación integrada
              </h1>
              <p className="mt-3 max-w-3xl text-slate-600">
                Revisión de diferencias entre ingresos por rubro, gastos por categoría/grupo
                y objeto del gasto por fuente. La tolerancia aplicada es de Bs 1.
              </p>
            </div>

            <div className="hidden rounded-2xl bg-slate-100 p-4 text-slate-700 md:block">
              {rows.length === 0 ? <CheckCircle2 size={32} /> : <AlertTriangle size={32} />}
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

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            title="Entidades con diferencias"
            value={formatInt(filtradas.length)}
            subtitle="Según filtros actuales"
          />
          <MetricCard
            title="Diff ingresos vs gastos"
            value={formatBs(diffIngresosGastos)}
            subtitle="Suma filtrada"
          />
          <MetricCard
            title="Diff objeto vs categoría"
            value={formatBs(diffObjetoCategoria)}
            subtitle="Suma filtrada"
          />
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_280px]">
            <div>
              <label className="text-sm font-medium text-slate-700">Buscar</label>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
                <Search size={16} className="text-slate-400" />
                <input
                  className="w-full outline-none"
                  placeholder="Código, entidad, departamento o grupo ETA..."
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
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {filtradas.length === 0 ? (
            <div className="p-6">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-700">
                No hay diferencias para los filtros seleccionados.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left">
                    <th className="p-3">Código</th>
                    <th className="p-3">Entidad</th>
                    <th className="p-3">Departamento</th>
                    <th className="p-3">Grupo ETA</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3 text-right">Gasto cat/grupo</th>
                    <th className="p-3 text-right">Ingresos rubro</th>
                    <th className="p-3 text-right">Objeto/fuente</th>
                    <th className="p-3 text-right">Diff ingresos-gastos</th>
                    <th className="p-3 text-right">Diff objeto-categoría</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((item) => (
                    <tr key={item.codigo_entidad} className="border-b hover:bg-slate-50">
                      <td className="p-3 font-mono">{item.codigo_entidad}</td>
                      <td className="p-3 font-medium">{item.nombre_entidad || "-"}</td>
                      <td className="p-3">{item.departamento || "-"}</td>
                      <td className="p-3">{item.grupo_eta || "-"}</td>
                      <td className="p-3">{item.tipo || "-"}</td>
                      <td className="p-3 text-right">
                        {formatBs(item.gastos_categoria_grupo)}
                      </td>
                      <td className="p-3 text-right">
                        {formatBs(item.ingresos_recursos_rubro)}
                      </td>
                      <td className="p-3 text-right">
                        {formatBs(item.gastos_objeto_fuente)}
                      </td>
                      <td className="p-3 text-right font-semibold">
                        {formatBs(item.diff_ingresos_vs_gastos)}
                      </td>
                      <td className="p-3 text-right font-semibold">
                        {formatBs(item.diff_objeto_vs_categoria)}
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
