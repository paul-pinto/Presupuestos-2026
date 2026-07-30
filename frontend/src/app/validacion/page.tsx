"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Search,
  ShieldCheck,
} from "lucide-react";

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

function hasDiff(row: ValidacionRow): boolean {
  return (
    Math.abs(Number(row.diff_ingresos_vs_gastos || 0)) > 1 ||
    Math.abs(Number(row.diff_objeto_vs_categoria || 0)) > 1
  );
}

function absTotal(row: ValidacionRow): number {
  return (
    Math.abs(Number(row.diff_ingresos_vs_gastos || 0)) +
    Math.abs(Number(row.diff_objeto_vs_categoria || 0))
  );
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

export default function ValidacionPage() {
  const [rows, setRows] = useState<ValidacionRow[]>([]);
  const [departamento, setDepartamento] = useState("Todos");
  const [tipo, setTipo] = useState("Todos");
  const [grupoEta, setGrupoEta] = useState("Todos");
  const [estado, setEstado] = useState("Todos");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(100);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<ValidacionRow[]>("/data/validacion_integrada.json")
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
    ];
  }, [rows]);

  const tipos = useMemo(() => {
    return [
      "Todos",
      ...Array.from(new Set(rows.map((item) => item.tipo).filter(Boolean))).sort(),
    ];
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
        if (estado === "Con diferencias") return hasDiff(item);
        if (estado === "OK") return !hasDiff(item);
        return true;
      })
      .filter((item) => {
        if (!q) return true;

        return (
          item.codigo_entidad.toLowerCase().includes(q) ||
          item.nombre_entidad.toLowerCase().includes(q) ||
          item.departamento.toLowerCase().includes(q) ||
          item.tipo.toLowerCase().includes(q) ||
          item.grupo_eta.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => absTotal(b) - absTotal(a));
  }, [rows, departamento, tipo, grupoEta, estado, query]);

  const visibles = filtradas.slice(0, limit);

  const totalConDiferencias = rows.filter(hasDiff).length;
  const totalOk = rows.length - totalConDiferencias;

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
                Revisión completa de las 353 entidades exportadas. Compara ingresos por rubro,
                gastos por categoría/grupo y objeto del gasto por fuente. Tolerancia aplicada: Bs 1.
              </p>
            </div>

            <div className="hidden rounded-2xl bg-slate-100 p-4 text-slate-700 md:block">
              {totalConDiferencias === 0 ? <CheckCircle2 size={32} /> : <AlertTriangle size={32} />}
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

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Entidades revisadas"
            value={formatInt(rows.length)}
            subtitle="Universo de validación"
            icon={<ShieldCheck size={24} />}
          />
          <MetricCard
            title="Entidades OK"
            value={formatInt(totalOk)}
            subtitle="Sin diferencias mayores a Bs 1"
            icon={<CheckCircle2 size={24} />}
          />
          <MetricCard
            title="Con diferencias"
            value={formatInt(totalConDiferencias)}
            subtitle="Según tolerancia"
            icon={<AlertTriangle size={24} />}
          />
          <MetricCard
            title="Filtradas"
            value={formatInt(filtradas.length)}
            subtitle={`Mostrando ${formatInt(visibles.length)}`}
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <MetricCard
            title="Diff ingresos vs gastos"
            value={formatBs(diffIngresosGastos)}
            subtitle="Suma según filtros actuales"
          />
          <MetricCard
            title="Diff objeto vs categoría"
            value={formatBs(diffObjetoCategoria)}
            subtitle="Suma según filtros actuales"
          />
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_160px]">
            <div>
              <label className="text-sm font-medium text-slate-700">Buscar</label>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
                <Search size={16} className="text-slate-400" />
                <input
                  className="w-full outline-none"
                  placeholder="Código, entidad, departamento..."
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
              <label className="text-sm font-medium text-slate-700">Estado</label>
              <select
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2"
                value={estado}
                onChange={(event) => setEstado(event.target.value)}
              >
                <option>Todos</option>
                <option>OK</option>
                <option>Con diferencias</option>
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

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left">
                  <th className="p-3">Estado</th>
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
                {visibles.map((item) => {
                  const diff = hasDiff(item);

                  return (
                    <tr key={item.codigo_entidad} className="border-b hover:bg-slate-50">
                      <td className="p-3">
                        {diff ? (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                            Diferencia
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono">{item.codigo_entidad}</td>
                      <td className="p-3 font-medium">{item.nombre_entidad}</td>
                      <td className="p-3">{item.departamento}</td>
                      <td className="p-3">{item.grupo_eta}</td>
                      <td className="p-3">{item.tipo}</td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
