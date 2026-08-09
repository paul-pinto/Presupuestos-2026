"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Search } from "lucide-react";

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


function formatFilterOptionLabel(value: string): string {
  const raw = String(value || "").trim();

  if (!raw) return "";
  if (raw === "Todos") return "Todos";

  const key = raw.toLowerCase();

  const dictionary: Record<string, string> = {
    departamental: "Departamental",
    municipal: "Municipal",
    regional: "Regional",
    indigena_originario_campesino: "Indígena Originario Campesino",

    gad: "GAD",
    gam: "GAM",
    gaioc: "GAIOC",
    gar: "GAR",
  };

  if (dictionary[key]) return dictionary[key];

  return raw
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      const wordKey = word.toLowerCase();
      return dictionary[wordKey] || word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
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
    <div className="ofp-card rounded-3xl p-5">
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
  );
}

function SelectControl({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  options: Array<string | number>;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((item) => (
          <option key={String(item)} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}


export default function EntidadesPage() {
  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [departamento, setDepartamento] = useState("Todos");
  const [tipo, setTipo] = useState("Todos");
  const [grupoEta, setGrupoEta] = useState("Todos");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(100);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchJson<Entidad[]>("/data/entidades.json")
      .then(setEntidades)
      .catch((error) => {
        console.error(error);
        setLoadError(error instanceof Error ? error.message : "Error cargando entidades");
      });
  }, []);

  const departamentos = useMemo(() => {
    return [
      "Todos",
      ...Array.from(new Set(entidades.map((item) => item.departamento).filter(Boolean))).sort(),
    ];
  }, [entidades]);

  const tipos = useMemo(() => {
    return [
      "Todos",
      ...Array.from(new Set(entidades.map((item) => item.tipo).filter(Boolean))).sort(),
    ];
  }, [entidades]);

  const gruposEta = useMemo(() => {
    return [
      "Todos",
      ...Array.from(new Set(entidades.map((item) => item.grupo_eta).filter(Boolean))).sort(),
    ];
  }, [entidades]);

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();

    return entidades
      .filter((item) => departamento === "Todos" || item.departamento === departamento)
      .filter((item) => tipo === "Todos" || item.tipo === tipo)
      .filter((item) => grupoEta === "Todos" || item.grupo_eta === grupoEta)
      .filter((item) => {
        if (!q) return true;

        return (
          item.codigo_entidad.toLowerCase().includes(q) ||
          item.nombre_entidad.toLowerCase().includes(q) ||
          item.departamento.toLowerCase().includes(q) ||
          item.tipo.toLowerCase().includes(q) ||
          item.grupo_eta.toLowerCase().includes(q)
        );
      });
  }, [entidades, departamento, tipo, grupoEta, query]);

  const visibles = filtradas.slice(0, limit);
  const totalFiltrado = filtradas.reduce((acc, item) => acc + item.presupuesto_total, 0);

  return (
    <main className="min-h-screen ofp-page-bg text-slate-950">
      <section className="ofp-hero">
        <div className="ofp-hero-inner mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
          >
            <ArrowLeft size={16} />
            Volver al resumen
          </Link>

          <div className="mt-6 flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
                Explorador
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">Entidades</h1>
              <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600">
  Explorador institucional de entidades territoriales autónomas. Permite revisar presupuestos, ingresos, gastos, población, presupuesto per cápita y clasificación territorial para comparar municipios, gobernaciones, autonomías indígenas y entidades regionales dentro de una misma lectura fiscal.
</p>
            </div>

            <div className="hidden rounded-3xl border border-teal-100 bg-teal-50 p-4 text-teal-700 md:block">
              <Building2 size={32} />
            </div>
          </div>
        </div>
      </section>

      <section className="ofp-hero-inner mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
        {loadError ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            {loadError}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            title="Entidades filtradas"
            value={formatInt(filtradas.length)}
            subtitle="Según búsqueda y filtros activos"
          />

          <MetricCard
            title="Presupuesto filtrado"
            value={formatBs(totalFiltrado)}
            subtitle="Suma del presupuesto total de gasto"
          />

          <MetricCard
            title="Mostrando"
            value={`${formatInt(visibles.length)} / ${formatInt(filtradas.length)}`}
            subtitle="Filas visibles en la tabla"
          />
        </div>

        <div className="mt-8 ofp-card rounded-3xl p-5">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_160px]">
            <div>
              <label className="text-sm font-medium text-slate-700">Buscar</label>
              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 transition focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
                <Search size={16} className="text-slate-400" />
                <input
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="Código, nombre, departamento..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Departamento</label>
              <select
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                value={departamento}
                onChange={(event) => setDepartamento(event.target.value)}
              >
                {departamentos.map((item) => (
                  <option key={item} value={item}>{formatFilterOptionLabel(item)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Tipo</label>
              <select
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                value={tipo}
                onChange={(event) => setTipo(event.target.value)}
              >
                {tipos.map((item) => (
                  <option key={item} value={item}>{formatFilterOptionLabel(item)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Grupo ETA</label>
              <select
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                value={grupoEta}
                onChange={(event) => setGrupoEta(event.target.value)}
              >
                {gruposEta.map((item) => (
                  <option key={item} value={item}>{formatFilterOptionLabel(item)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Límite</label>
              <select
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-8 overflow-hidden ofp-card rounded-3xl">
          <div className="border-b border-slate-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
              Tabla
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
              Entidades presupuestarias
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Listado filtrable por código, entidad, departamento, tipo, grupo ETA y grupos de gasto.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                  <th className="p-3">Código</th>
                  <th className="p-3">Entidad</th>
                  <th className="p-3">Departamento</th>
                  <th className="p-3">Grupo ETA</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3 text-right tabular-nums text-slate-700">Presupuesto</th>
                  <th className="p-3 text-right tabular-nums text-slate-700">G1</th>
                  <th className="p-3 text-right tabular-nums text-slate-700">G2</th>
                  <th className="p-3 text-right tabular-nums text-slate-700">G3</th>
                  <th className="p-3 text-right tabular-nums text-slate-700">G4</th>
                  <th className="p-3 text-right tabular-nums text-slate-700">G5</th>
                  <th className="p-3 text-right tabular-nums text-slate-700">G6</th>
                  <th className="p-3 text-right tabular-nums text-slate-700">G7</th>
                  <th className="p-3 text-right tabular-nums text-slate-700">G8</th>
                  <th className="p-3 text-right tabular-nums text-slate-700">G9</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((item) => (
                  <tr key={item.codigo_entidad} className="border-b border-slate-100 transition hover:bg-slate-50">
                    <td className="p-3 font-mono text-xs text-slate-600">{item.codigo_entidad}</td>
                    <td className="p-3 font-medium text-slate-950">
                      <Link
                        href={`/entidades/${item.codigo_entidad}`}
                        className="font-semibold text-teal-700 underline decoration-teal-200 underline-offset-4 hover:text-teal-900 hover:decoration-teal-700"
                      >
                        {item.nombre_entidad}
                      </Link>
                    </td>
                    <td className="p-3">{item.departamento}</td>
                    <td className="p-3">{item.grupo_eta}</td>
                    <td className="p-3">{item.tipo}</td>
                    <td className="p-3 text-right font-semibold tabular-nums text-slate-950">
                      {formatBs(item.presupuesto_total)}
                    </td>
                    <td className="p-3 text-right tabular-nums text-slate-700">{formatBs(item.grupo_1)}</td>
                    <td className="p-3 text-right tabular-nums text-slate-700">{formatBs(item.grupo_2)}</td>
                    <td className="p-3 text-right tabular-nums text-slate-700">{formatBs(item.grupo_3)}</td>
                    <td className="p-3 text-right tabular-nums text-slate-700">{formatBs(item.grupo_4)}</td>
                    <td className="p-3 text-right tabular-nums text-slate-700">{formatBs(item.grupo_5)}</td>
                    <td className="p-3 text-right tabular-nums text-slate-700">{formatBs(item.grupo_6)}</td>
                    <td className="p-3 text-right tabular-nums text-slate-700">{formatBs(item.grupo_7)}</td>
                    <td className="p-3 text-right tabular-nums text-slate-700">{formatBs(item.grupo_8)}</td>
                    <td className="p-3 text-right tabular-nums text-slate-700">{formatBs(item.grupo_9)}</td>
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
