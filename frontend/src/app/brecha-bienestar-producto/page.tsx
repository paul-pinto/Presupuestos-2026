"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, BarChart3, Landmark, ShieldCheck } from "lucide-react";

type BrechaRow = {
  departamento: string;
  municipio: string;
  codigo_entidad?: string | null;
  poblacion_retro_2021: number | null;
  pib_estimado_usd2017_2021: number | null;
  pibpc_usd2017_2021: number | null;
  nbi_pobre_pct: number | null;
  nivel_pibpc: string;
  nivel_nbi: string;
  categoria_brecha: string;
  score_brecha_bienestar_producto: number | null;
  metodo: string;
};

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "Sin dato";
  return Number(value).toLocaleString("es-BO", {
    maximumFractionDigits: 0,
  });
}

function formatUsd(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "Sin dato";
  return `USD ${Number(value).toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPct(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "Sin dato";
  return `${Number(value).toLocaleString("es-BO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "Sin dato";
  return `${Number(value).toLocaleString("es-BO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} pts`;
}

function categoriaClass(categoria: string) {
  if (categoria === "Producto alto con rezago social") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (categoria === "Producto medio con rezago social") {
    return "border-orange-200 bg-orange-50 text-orange-800";
  }

  if (categoria === "Rezago estructural") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (categoria === "Producto alto con mejor bienestar relativo") {
    return "border-teal-200 bg-teal-50 text-teal-800";
  }

  if (categoria === "Bienestar relativo con producto medio") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (categoria === "Sin dato") {
    return "border-slate-200 bg-slate-50 text-slate-500";
  }

  return "border-slate-200 bg-white text-slate-700";
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {title}
          </p>
          <p className="mt-3 text-2xl font-bold tabular-nums text-slate-950">
            {value}
          </p>
          {subtitle ? (
            <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        {icon ? (
          <div className="rounded-2xl border border-teal-100 bg-teal-50 p-3 text-teal-700">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function BrechaBienestarProductoPage() {
  const [rows, setRows] = useState<BrechaRow[]>([]);
  const [departamento, setDepartamento] = useState("Todos");
  const [categoria, setCategoria] = useState("Todas");
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/data/brecha_bienestar_producto.json")
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo cargar brecha_bienestar_producto.json");
        return res.json();
      })
      .then(setRows)
      .catch(console.error);
  }, []);

  const departamentos = useMemo(() => {
    return ["Todos", ...Array.from(new Set(rows.map((row) => row.departamento).filter(Boolean))).sort()];
  }, [rows]);

  const categorias = useMemo(() => {
    return ["Todas", ...Array.from(new Set(rows.map((row) => row.categoria_brecha).filter(Boolean))).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchDepartamento = departamento === "Todos" || row.departamento === departamento;
      const matchCategoria = categoria === "Todas" || row.categoria_brecha === categoria;
      const codigo = String(row.codigo_entidad || "").toLowerCase();

      const matchQuery =
        !q ||
        codigo.includes(q) ||
        row.municipio.toLowerCase().includes(q) ||
        row.departamento.toLowerCase().includes(q);

      return matchDepartamento && matchCategoria && matchQuery;
    });
  }, [rows, departamento, categoria, query]);

  const conScore = filtered.filter((row) => row.score_brecha_bienestar_producto !== null);

  const topBrecha = [...conScore]
    .sort(
      (a, b) =>
        Number(b.score_brecha_bienestar_producto || 0) -
        Number(a.score_brecha_bienestar_producto || 0)
    )
    .slice(0, 20);

  const categoriasCount = useMemo(() => {
    const result = new Map<string, number>();

    for (const row of filtered) {
      result.set(row.categoria_brecha, (result.get(row.categoria_brecha) || 0) + 1);
    }

    return Array.from(result.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  const promedioScore =
    conScore.length > 0
      ? conScore.reduce((acc, row) => acc + Number(row.score_brecha_bienestar_producto || 0), 0) /
        conScore.length
      : null;

  return (
    <main className="min-h-screen ofp-page-bg text-slate-950">
      <section className="ofp-hero">
        <div className="ofp-hero-inner mx-auto max-w-7xl px-6 py-12 lg:py-16">
          <Link
            href="/indicadores"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
          >
            <ArrowLeft size={16} />
            Volver a indicadores
          </Link>

          <div className="mt-6 flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
                Pacto Fiscal · Indicador sintético
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
                Brecha bienestar-producto
              </h1>
              <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600">
  Indicador sintético que cruza PIBpc municipal estimado 2021 con pobreza por NBI 2024. Identifica territorios donde existe producto económico estimado, pero persisten privaciones básicas, revelando brechas entre actividad económica territorial y bienestar social efectivo.
</p>
            </div>

            <div className="hidden rounded-3xl border border-teal-100 bg-teal-50 p-4 text-teal-700 md:block">
              <BarChart3 size={32} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-6">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Territorios"
            value={formatNumber(filtered.length)}
            subtitle="Filtro actual"
            icon={<Landmark size={22} />}
          />
          <MetricCard
            title="Con score"
            value={formatNumber(conScore.length)}
            subtitle="PIBpc + NBI disponibles"
            icon={<ShieldCheck size={22} />}
          />
          <MetricCard
            title="Score promedio"
            value={formatScore(promedioScore)}
            subtitle="Brecha bienestar-producto"
            icon={<BarChart3 size={22} />}
          />
          <MetricCard
            title="Casos críticos"
            value={formatNumber(
              filtered.filter((row) => row.categoria_brecha === "Producto alto con rezago social").length
            )}
            subtitle="PIBpc alto + NBI alto"
            icon={<AlertTriangle size={22} />}
          />
        </div>

        <div className="mt-6 ofp-card rounded-3xl p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_220px_280px]">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Buscar
              </label>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Código, municipio o departamento..."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Departamento
              </label>
              <select
                value={departamento}
                onChange={(event) => setDepartamento(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                {departamentos.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Categoría
              </label>
              <select
                value={categoria}
                onChange={(event) => setCategoria(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                {categorias.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="ofp-card rounded-3xl p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
              Categorías
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
              Lectura territorial
            </h2>

            <div className="mt-5 grid gap-3">
              {categoriasCount.map((item) => (
                <div
                  key={item.name}
                  className={`rounded-2xl border px-4 py-3 ${categoriaClass(item.name)}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="text-lg font-bold tabular-nums">{item.count}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="ofp-card rounded-3xl p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
              Ranking
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
              Mayor brecha bienestar-producto
            </h2>

            <div className="mt-5 grid gap-3">
              {topBrecha.map((row, index) => (
                <div key={`${row.departamento}-${row.municipio}`} className="grid gap-1">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <div>
                      <span className="font-bold text-slate-950">{index + 1}. {row.municipio}</span>
                      <span className="ml-2 text-xs text-slate-500">{row.departamento}</span>
                    </div>
                    <span className="font-bold tabular-nums text-slate-950">
                      {formatScore(row.score_brecha_bienestar_producto)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-teal-700"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, Number(row.score_brecha_bienestar_producto || 0))
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    PIBpc {formatUsd(row.pibpc_usd2017_2021)} · NBI {formatPct(row.nbi_pobre_pct)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-6 overflow-hidden ofp-card rounded-3xl">
          <div className="border-b border-slate-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
              Tabla
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
              Territorios ordenados
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                  <th className="p-3">Código</th>
                  <th className="p-3">Municipio</th>
                  <th className="p-3">Departamento</th>
                  <th className="p-3 text-right">PIBpc 2021</th>
                  <th className="p-3 text-right">NBI 2024</th>
                  <th className="p-3 text-right">Score</th>
                  <th className="p-3">Categoría</th>
                </tr>
              </thead>
              <tbody>
                {[...filtered]
                  .sort(
                    (a, b) =>
                      Number(b.score_brecha_bienestar_producto || -1) -
                      Number(a.score_brecha_bienestar_producto || -1)
                  )
                  .map((row) => (
                    <tr
                      key={`${row.departamento}-${row.municipio}`}
                      className="border-b border-slate-100 transition hover:bg-slate-50"
                    >
                      <td className="p-3 font-mono text-xs font-semibold text-slate-500">{row.codigo_entidad || "-"}</td>
                      <td className="p-3 font-semibold text-slate-950">{row.municipio}</td>
                      <td className="p-3 text-slate-600">{row.departamento}</td>
                      <td className="p-3 text-right font-semibold tabular-nums text-slate-950">
                        {formatUsd(row.pibpc_usd2017_2021)}
                      </td>
                      <td className="p-3 text-right tabular-nums text-slate-700">
                        {formatPct(row.nbi_pobre_pct)}
                      </td>
                      <td className="p-3 text-right font-semibold tabular-nums text-slate-950">
                        {formatScore(row.score_brecha_bienestar_producto)}
                      </td>
                      <td className="p-3">
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${categoriaClass(row.categoria_brecha)}`}>
                          {row.categoria_brecha}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 ofp-card rounded-3xl p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
            Metodología
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
            Cómo se lee el indicador
          </h2>
          <p className="mt-3 max-w-5xl text-sm leading-7 text-slate-600">
            La brecha bienestar-producto no mide pobreza monetaria ni ingreso de hogares.
            Cruza producción territorial estimada con privaciones básicas. Un valor alto
            señala territorios donde el producto por habitante estimado es relativamente
            alto, pero la pobreza por NBI sigue siendo elevada. Es útil para discutir
            pacto fiscal, asignación territorial y conversión del producto local en bienestar.
          </p>
        </section>
      </section>
    </main>
  );
}
