"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReactECharts from "echarts-for-react";
import { ArrowLeft, Building2, Landmark, Search, SplitSquareVertical, Wallet } from "lucide-react";

type ObjetoGasto = {
  objeto_gasto: string;
  descripcion: string;
  total: number;
};

type FuenteObjeto = {
  fuente_columna: string;
  monto: number;
};

type ObjetoEntidad = {
  codigo_entidad: string;
  nombre_entidad: string;
  departamento: string;
  grupo_eta: string;
  tipo: string;
  gasto_total_objeto: number;
};

function formatBs(value: number): string {
  return `Bs ${Number(value || 0).toLocaleString("es-BO", {
    maximumFractionDigits: 0,
  })}`;
}

function formatBsCompact(value: number): string {
  const n = Number(value || 0);
  const abs = Math.abs(n);

  if (abs >= 1_000_000_000) {
    return `Bs ${(n / 1_000_000_000).toLocaleString("es-BO", {
      maximumFractionDigits: 1,
    })} Bn`;
  }

  if (abs >= 1_000_000) {
    return `Bs ${(n / 1_000_000).toLocaleString("es-BO", {
      maximumFractionDigits: 1,
    })} M`;
  }

  if (abs >= 1_000) {
    return `Bs ${(n / 1_000).toLocaleString("es-BO", {
      maximumFractionDigits: 1,
    })} mil`;
  }

  return `Bs ${n.toLocaleString("es-BO", {
    maximumFractionDigits: 0,
  })}`;
}

function cleanFuenteLabel(value: string): string {
  const raw = String(value || "").trim();

  const labels: Record<string, string> = {
    monto_01_tgn: "TGN",
    monto_03_tgn_ct: "TGN - Coparticipación tributaria",
    monto_04_recon: "Recursos específicos",
    monto_05_tgn_fcom: "TGN - Fondo compensatorio",
    monto_06_tgn_pg_n: "TGN - Programas nacionales",
    monto_07_tgn_iehd: "TGN - IEHD",
    monto_08_tgn_idh: "TGN - IDH",
    monto_09_tgn_ipj: "TGN - IPJ",
    monto_11_ot_gob: "Otros recursos del gobierno",
    monto_12_total_tgn: "Total TGN",
    monto_13_otros_ingresos: "Otros ingresos",
    monto_14_recursos_especificos: "Recursos específicos",
    monto_15_donaciones_internas: "Donaciones internas",
    monto_16_credito_externo: "Crédito externo",
  };

  if (labels[raw]) return labels[raw];

  return raw
    .replace(/^monto_\d+_/, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatBsCompact(value: number): string {
  const n = Number(value || 0);
  const abs = Math.abs(n);

  if (abs >= 1_000_000_000) {
    return `Bs ${(n / 1_000_000_000).toLocaleString("es-BO", {
      maximumFractionDigits: 1,
    })} Bn`;
  }

  if (abs >= 1_000_000) {
    return `Bs ${(n / 1_000_000).toLocaleString("es-BO", {
      maximumFractionDigits: 1,
    })} M`;
  }

  if (abs >= 1_000) {
    return `Bs ${(n / 1_000).toLocaleString("es-BO", {
      maximumFractionDigits: 1,
    })} mil`;
  }

  return `Bs ${n.toLocaleString("es-BO", {
    maximumFractionDigits: 0,
  })}`;
}

function cleanFuenteLabel(value: string): string {
  const raw = String(value || "").trim();

  const labels: Record<string, string> = {
    monto_01_tgn: "TGN",
    monto_03_tgn_ct: "TGN - Coparticipación tributaria",
    monto_04_recon: "Recursos específicos",
    monto_05_tgn_fcom: "TGN - Fondo compensatorio",
    monto_06_tgn_pg_n: "TGN - Programas nacionales",
    monto_07_tgn_iehd: "TGN - IEHD",
    monto_08_tgn_idh: "TGN - IDH",
    monto_09_tgn_ipj: "TGN - IPJ",
    monto_11_ot_gob: "Otros recursos del gobierno",
    monto_12_total_tgn: "Total TGN",
    monto_13_otros_ingresos: "Otros ingresos",
    monto_14_recursos_especificos: "Recursos específicos",
    monto_15_donaciones_internas: "Donaciones internas",
    monto_16_credito_externo: "Crédito externo",
  };

  if (labels[raw]) return labels[raw];

  return raw
    .replace(/^monto_\d+_/, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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


function cleanObjetoGastoLabel(objeto: string, descripcion: string): string {
  const codigo = String(objeto || "").trim();

  const labels: Record<string, string> = {
    "1": "Servicios personales",
    "2": "Servicios no personales",
    "3": "Materiales y suministros",
    "4": "Activos reales",
    "5": "Activos financieros",
    "6": "Servicios de la deuda pública y disminución de otros activos",
    "7": "Transferencias",
    "8": "Impuestos, regalías y tasas",
    "9": "Otros gastos",
  };

  return labels[codigo] || String(descripcion || "").replace(/\s+/g, " ").trim();
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

export default function ObjetoGastoPage() {
  const [objetoGasto, setObjetoGasto] = useState<ObjetoGasto[]>([]);
  const [fuentesObjeto, setFuentesObjeto] = useState<FuenteObjeto[]>([]);
  const [entidades, setEntidades] = useState<ObjetoEntidad[]>([]);
  const [departamento, setDepartamento] = useState("Todos");
  const [tipo, setTipo] = useState("Todos");
  const [grupoEta, setGrupoEta] = useState("Todos");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(100);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [objetoData, fuentesData, entidadesData] = await Promise.all([
        fetchJson<ObjetoGasto[]>("/data/objeto_gasto_nivel1.json"),
        fetchJson<FuenteObjeto[]>("/data/fuentes_objeto_gasto.json"),
        fetchJson<ObjetoEntidad[]>("/data/objeto_gasto_entidad_top.json"),
      ]);

      setObjetoGasto(objetoData);
      setFuentesObjeto(fuentesData);
      setEntidades(entidadesData);
    }

    load().catch((error) => {
      console.error(error);
      setLoadError(error instanceof Error ? error.message : "Error cargando objeto del gasto");
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
      })
      .sort((a, b) => Number(b.gasto_total_objeto || 0) - Number(a.gasto_total_objeto || 0));
  }, [entidades, departamento, tipo, grupoEta, query]);

  const visibles = entidadesFiltradas.slice(0, limit);

  const totalObjetoFiltrado = entidadesFiltradas.reduce(
    (acc, item) => acc + Number(item.gasto_total_objeto || 0),
    0
  );

  const totalObjetoGlobal = objetoGasto.reduce((acc, item) => acc + Number(item.total || 0), 0);
  const totalFuentesGlobal = fuentesObjeto.reduce((acc, item) => acc + Number(item.monto || 0), 0);

  const objetoPrincipal = objetoGasto[0];
  const fuentePrincipal = fuentesObjeto[0];

  const objetoOption = chartOptionHorizontal({
    labels: [...objetoGasto]
      .slice(0, 18)
      .reverse()
      .map((item) => `${item.objeto_gasto}. ${cleanObjetoGastoLabel(item.objeto_gasto, item.descripcion)}`),
    values: [...objetoGasto]
      .slice(0, 18)
      .reverse()
      .map((item) => item.total),
    left: 330,
  });

  const fuentesOption = chartOptionHorizontal({
    labels: [...fuentesObjeto].reverse().map((item) => cleanFuenteLabel(item.fuente_columna)),
    values: [...fuentesObjeto].reverse().map((item) => item.monto),
    left: 260,
  });

  const entidadesOption = chartOptionHorizontal({
    labels: [...entidadesFiltradas]
      .slice(0, 20)
      .reverse()
      .map((item) => item.nombre_entidad),
    values: [...entidadesFiltradas]
      .slice(0, 20)
      .reverse()
      .map((item) => item.gasto_total_objeto),
    left: 300,
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
                Clasificación económica
              </p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight">Objeto del gasto</h1>
              <p className="mt-3 max-w-3xl text-slate-600">
                Exploración del gasto por objeto y fuente de financiamiento. Esta vista resume
                la estructura económica del presupuesto y permite filtrar entidades con mayor gasto
                clasificado por objeto/fuente.
              </p>
            </div>

            <div className="hidden rounded-2xl bg-slate-100 p-4 text-slate-700 md:block">
              <Landmark size={32} />
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
              <h2 className="text-xl font-semibold">Filtros de objeto/fuente</h2>
              <p className="mt-1 text-sm text-slate-500">
                Filtran el ranking y tabla de entidades. Los gráficos de objeto y fuente son agregados globales.
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
                  placeholder="Entidad, código o departamento..."
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
            title="Objeto/fuente filtrado"
            value={formatBs(totalObjetoFiltrado)}
            subtitle={`${formatInt(entidadesFiltradas.length)} entidades`}
            icon={<Wallet size={24} />}
          />
          <MetricCard
            title="Objeto gasto global"
            value={formatBs(totalObjetoGlobal)}
            subtitle="Agregado nivel 1"
            icon={<Landmark size={24} />}
          />
          <MetricCard
            title="Fuente global"
            value={formatBs(totalFuentesGlobal)}
            subtitle="Suma por fuente_columna"
            icon={<SplitSquareVertical size={24} />}
          />
          <MetricCard
            title="Entidades filtradas"
            value={formatInt(entidadesFiltradas.length)}
            subtitle={`Mostrando ${formatInt(visibles.length)}`}
            icon={<Building2 size={24} />}
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <MetricCard
            title="Objeto principal"
            value={objetoPrincipal ? `${objetoPrincipal.objeto_gasto}` : "-"}
            subtitle={objetoPrincipal ? `${objetoPrincipal.descripcion} · ${formatBs(objetoPrincipal.total)}` : "Sin datos"}
          />
          <MetricCard
            title="Fuente principal"
            value={fuentePrincipal ? fuentePrincipal.fuente_columna : "-"}
            subtitle={fuentePrincipal ? formatBs(fuentePrincipal.monto) : "Sin datos"}
          />
        </div>

        <div className="mt-8 grid gap-6">
          <Section
            title="Objeto del gasto nivel 1"
            description="Ranking global por objeto del gasto."
          >
            <div className="h-[520px]">
              <ReactECharts option={objetoOption} style={{ height: "100%", width: "100%" }} />
            </div>
          </Section>

          <Section
            title="Fuentes de financiamiento"
            description="Distribución global por fuente de financiamiento."
          >
            <div className="h-[620px]">
              <ReactECharts option={fuentesOption} style={{ height: "100%", width: "100%" }} />
            </div>
          </Section>
        </div>

        <div className="mt-8">
          <Section
            title="Top entidades por objeto/fuente"
            description="Ranking filtrado de entidades con mayor gasto clasificado por objeto/fuente."
          >
            <div className="h-[720px]">
              <ReactECharts option={entidadesOption} style={{ height: "100%", width: "100%" }} />
            </div>
          </Section>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b bg-white p-5">
            <h2 className="text-xl font-semibold">Tabla objeto/fuente por entidad</h2>
            <p className="mt-1 text-sm text-slate-500">
              Ranking filtrado por gasto total objeto/fuente.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left">
                  <th className="p-3">Código</th>
                  <th className="p-3">Entidad</th>
                  <th className="p-3">Departamento</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Grupo ETA</th>
                  <th className="p-3 text-right">Objeto/fuente</th>
                  <th className="p-3 text-right">% filtro</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((item) => (
                  <tr key={item.codigo_entidad} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-mono">{item.codigo_entidad}</td>
                    <td className="p-3 font-medium">{item.nombre_entidad}</td>
                    <td className="p-3">{item.departamento}</td>
                    <td className="p-3">{item.tipo}</td>
                    <td className="p-3">{item.grupo_eta}</td>
                    <td className="p-3 text-right font-semibold">
                      {formatBs(item.gasto_total_objeto)}
                    </td>
                    <td className="p-3 text-right">
                      {formatPct(item.gasto_total_objeto, totalObjetoFiltrado)}
                    </td>
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
