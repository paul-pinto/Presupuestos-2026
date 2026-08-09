"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReactECharts from "echarts-for-react";
import { ArrowLeft, Building2, Landmark, Search, SplitSquareVertical, Wallet } from "lucide-react";
import ObjetoGastoNivelesPanel from "@/components/ObjetoGastoNivelesPanel";
import { shortEntidadLabel } from "@/lib/format";

function formatFuenteTecnica(value: string | null | undefined): string {
  const raw = String(value || "");

  const labels: Record<string, string> = {
    "monto_11_ot_gob": "11 - Otros gobiernos",
    "monto_20_rec_esp": "20 - Recursos específicos",
    "monto_20_regalias": "20/220 - Regalías",
    "monto_20_otros": "20/230 - Otros recursos específicos",
    "monto_41_tgn": "41 - Transferencias TGN",
    "monto_41_111": "41/111 - TGN",
    "monto_41_113": "41/113 - Coparticipación tributaria",
    "monto_41_119": "41/119 - IDH",
  };

  if (labels[raw]) return labels[raw];

  return raw
    .replace(/^monto_/, "")
    .replaceAll("_", " ")
    .replace(/\bot\b/gi, "otros")
    .replace(/\bgob\b/gi, "gobiernos")
    .replace(/\brec\b/gi, "recursos")
    .replace(/\besp\b/gi, "específicos")
    .replace(/\btgn\b/gi, "TGN")
    .trim();
}



type ObjetoGasto = {
  objeto_gasto: string;
  descripcion: string;
  total: number;
};

type FuenteObjeto = {
  fuente_columna: string;
  monto: number;
};

type ObjetoGastoDetalle = {
  codigo_entidad?: string;
  nombre_entidad?: string;
  departamento?: string;
  grupo_eta?: string;
  tipo?: string;
  objeto_gasto?: string;
  descripcion?: string;
  descripcion_limpia?: string;
  total?: number;
  importe?: number;
  monto?: number;
};

type FuenteObjetoDetalle = {
  codigo_entidad?: string;
  nombre_entidad?: string;
  departamento?: string;
  grupo_eta?: string;
  tipo?: string;
  fuente_columna?: string;
  fuente?: string;
  fuente_nombre?: string;
  monto?: number;
  importe?: number;
  total?: number;
};

type ObjetoEntidad = {
  codigo_entidad: string;
  nombre_entidad: string;
  departamento: string;
  grupo_eta: string;
  tipo: string;
  gasto_total_objeto: number;
};


function formatFuenteColumna(value: string): string {
  const labels: Record<string, string> = {
    "monto_11_ot_gob": "11 - Otros gobiernos",
    "monto_20_rec_esp": "20 - Recursos específicos",
    "monto_20_regalias": "20/220 - Regalías",
    "monto_20_otros": "20/230 - Otros recursos específicos",
    "monto_41_tgn": "41 - Transferencias TGN",
    "monto_41_111": "41/111 - TGN",
    "monto_41_113": "41/113 - Coparticipación tributaria",
    "monto_41_119": "41/119 - IDH",
  };

  return labels[value] ?? value
    .replace(/^monto_/, "")
    .replaceAll("_", " ")
    .toUpperCase();
}

function formatBs(value: number): string {
  return `Bs ${Number(value || 0).toLocaleString("es-BO", {
    maximumFractionDigits: 0,
  })}`;
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
    <div className="ofp-card rounded-3xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
          <p className="mt-3 text-2xl font-bold tabular-nums text-slate-950">{value}</p>
          {subtitle ? <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p> : null}
        </div>
        {icon ? <div className="rounded-2xl border border-teal-100 bg-teal-50 p-3 text-teal-700">{icon}</div> : null}
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
    <section className="ofp-card rounded-3xl p-5">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
          Objeto del gasto
        </p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}


function getObjetoEntidadValue(item: ObjetoEntidad): number {
  const row = item as unknown as Record<string, unknown>;

  const excluded = new Set([
    "codigo_entidad",
    "codigo",
    "gestion",
    "anio",
    "prg",
    "objeto_gasto",
  ]);

  let best = 0;

  for (const [key, value] of Object.entries(row)) {
    if (excluded.has(key)) continue;
    if (key.toLowerCase().includes("codigo")) continue;

    const numberValue = Number(value);

    if (Number.isFinite(numberValue) && numberValue > best) {
      best = numberValue;
    }
  }

  return best;
}

function chartOptionHorizontal({
  labels,
  values,
  tooltipLabels,
  left = 260,
}: {
  labels: string[];
  values: number[];
  tooltipLabels?: string[];
  left?: number;
}) {
  return {
    grid: { left, right: 55, top: 20, bottom: 45, containLabel: false },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any) => {
        const item = Array.isArray(params) ? params[0] : params;
        const index = item?.dataIndex ?? 0;
        const name = tooltipLabels?.[index] || item?.name || "";
        const value = Number(item?.value || 0);

        return `
          <div style="min-width:260px">
            <div style="font-weight:600;color:#475569;margin-bottom:6px;">${name}</div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#0f766e;"></span>
              <strong>${formatBs(value)}</strong>
            </div>
          </div>
        `;
      },
    },
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
      data: labels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: "#334155",
        width: left - 30,
        overflow: "truncate",
      },
    },
    series: [
      {
        type: "bar",
        data: values,
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
}

export default function ObjetoGastoPage() {
  const [objetoGasto, setObjetoGasto] = useState<ObjetoGasto[]>([]);
  const [fuentesObjeto, setFuentesObjeto] = useState<FuenteObjeto[]>([]);
  const [objetoGastoDetalle, setObjetoGastoDetalle] = useState<ObjetoGastoDetalle[]>([]);
  const [fuentesObjetoDetalle, setFuentesObjetoDetalle] = useState<FuenteObjetoDetalle[]>([]);
  const [entidades, setEntidades] = useState<ObjetoEntidad[]>([]);
  const [departamento, setDepartamento] = useState("Todos");
  const [tipo, setTipo] = useState("Todos");
  const [grupoEta, setGrupoEta] = useState("Todos");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(100);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [
        objetoData,
        fuentesData,
        entidadesData,
        objetoDetalleData,
        fuentesDetalleData,
      ] = await Promise.all([
        fetchJson<ObjetoGasto[]>("/data/objeto_gasto_nivel1.json"),
        fetchJson<FuenteObjeto[]>("/data/fuentes_objeto_gasto.json"),
        fetchJson<ObjetoEntidad[]>("/data/objeto_gasto_entidad_top.json"),
        fetchJson<ObjetoGastoDetalle[]>("/data/objeto_gasto_detalle.json"),
        fetchJson<FuenteObjetoDetalle[]>("/data/fuentes_objeto_largo.json"),
      ]);

      setObjetoGasto(objetoData);
      setFuentesObjeto(fuentesData);
      setEntidades(entidadesData);
      setObjetoGastoDetalle(objetoDetalleData);
      setFuentesObjetoDetalle(fuentesDetalleData);
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

  const objetoGastoFiltrado = useMemo(() => {
    const q = query.trim().toLowerCase();

    const labelMap = new Map(
      objetoGasto.map((item) => [
        String(item.objeto_gasto || "").trim(),
        cleanObjetoGastoLabel(item.objeto_gasto, item.descripcion),
      ])
    );

    const grouped = new Map<string, { objeto_gasto: string; descripcion: string; total: number }>();

    for (const row of objetoGastoDetalle) {
      if (departamento !== "Todos" && row.departamento !== departamento) continue;
      if (tipo !== "Todos" && row.tipo !== tipo) continue;
      if (grupoEta !== "Todos" && row.grupo_eta !== grupoEta) continue;

      if (q) {
        const matches =
          normalize(row.codigo_entidad).includes(q) ||
          normalize(row.nombre_entidad).includes(q) ||
          normalize(row.departamento).includes(q) ||
          normalize(row.tipo).includes(q) ||
          normalize(row.grupo_eta).includes(q) ||
          normalize(row.objeto_gasto).includes(q) ||
          normalize(row.descripcion).includes(q) ||
          normalize(row.descripcion_limpia).includes(q);

        if (!matches) continue;
      }

      const rawCode = String(row.objeto_gasto || "").replace(/\D/g, "");
      if (!rawCode) continue;

      const nivel1 = rawCode.slice(0, 1);
      const total = Number(row.total ?? row.importe ?? row.monto ?? 0);

      const current = grouped.get(nivel1) || {
        objeto_gasto: nivel1,
        descripcion: labelMap.get(nivel1) || `Grupo ${nivel1}`,
        total: 0,
      };

      current.total += total;
      grouped.set(nivel1, current);
    }

    return Array.from(grouped.values()).sort((a, b) => b.total - a.total);
  }, [objetoGastoDetalle, objetoGasto, departamento, tipo, grupoEta, query]);

  const fuentesObjetoFiltrado = useMemo(() => {
    const q = query.trim().toLowerCase();

    const grouped = new Map<string, { fuente_columna: string; monto: number }>();

    for (const row of fuentesObjetoDetalle) {
      if (departamento !== "Todos" && row.departamento !== departamento) continue;
      if (tipo !== "Todos" && row.tipo !== tipo) continue;
      if (grupoEta !== "Todos" && row.grupo_eta !== grupoEta) continue;

      if (q) {
        const matches =
          normalize(row.codigo_entidad).includes(q) ||
          normalize(row.nombre_entidad).includes(q) ||
          normalize(row.departamento).includes(q) ||
          normalize(row.tipo).includes(q) ||
          normalize(row.grupo_eta).includes(q) ||
          normalize(row.fuente_columna).includes(q);

        if (!matches) continue;
      }

      const fuenteColumna = String(row.fuente_columna || "").trim();
      if (!fuenteColumna) continue;

      const monto = Number(row.monto ?? row.importe ?? row.total ?? 0);

      const current = grouped.get(fuenteColumna) || {
        fuente_columna: fuenteColumna,
        monto: 0,
      };

      current.monto += monto;
      grouped.set(fuenteColumna, current);
    }

    return Array.from(grouped.values()).sort((a, b) => b.monto - a.monto);
  }, [fuentesObjetoDetalle, departamento, tipo, grupoEta, query]);

  const objetoPrincipal = objetoGastoFiltrado[0];
  const fuentePrincipal = fuentesObjetoFiltrado[0];

  const objetoOption = chartOptionHorizontal({
    labels: [...objetoGastoFiltrado]
      .slice(0, 18)
      .reverse()
      .map((item) => `${item.objeto_gasto}. ${cleanObjetoGastoLabel(item.objeto_gasto, item.descripcion)}`),
    values: [...objetoGastoFiltrado]
      .slice(0, 18)
      .reverse()
      .map((item) => {
        const row = item as any;
        return Number(
          row.monto ||
            row.monto_total ||
            row.gasto_total ||
            row.presupuesto_total ||
            row.total_gasto ||
            row.total ||
            0
        );
      }),
    left: 280,
  });

  const fuentesOption = chartOptionHorizontal({
    labels: [...fuentesObjetoFiltrado].reverse().map((item) => cleanFuenteLabel(item.fuente_columna)),
    values: [...fuentesObjetoFiltrado].reverse().map((item) => item.monto),
    left: 260,
  });

  const entidadesOption = chartOptionHorizontal({
    labels: [...entidadesFiltradas]
      .slice(0, 20)
      .reverse()
      .map((item) => shortEntidadLabel(item.nombre_entidad || "")),
    values: [...entidadesFiltradas]
      .slice(0, 20)
      .reverse()
      .map((item) => getObjetoEntidadValue(item)),
    tooltipLabels: [...entidadesFiltradas]
      .slice(0, 20)
      .reverse()
      .map(
        (item) =>
          `${item.nombre_entidad || ""} · ${item.departamento || ""} · Código ${item.codigo_entidad || ""}`
      ),
    left: 280,
  });

  const resetFilters = () => {
    setDepartamento("Todos");
    setTipo("Todos");
    setGrupoEta("Todos");
    setQuery("");
    setLimit(100);
  };

  return (
    <main className="min-h-screen ofp-page-bg text-slate-950">
      <section className="ofp-hero">
        <div className="ofp-hero-inner mx-auto max-w-7xl px-6 py-12 lg:py-16">
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
                Clasificación económica
              </p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">Objeto del gasto</h1>
              <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600">
  Explorador del objeto del gasto presupuestario. Desagrega el presupuesto por partidas y niveles del clasificador oficial, permitiendo identificar en qué bienes, servicios, transferencias, inversión, personal y obligaciones se concentra el gasto de cada entidad territorial.
</p>
            </div>

            <div className="hidden rounded-3xl border border-teal-100 bg-teal-50 p-4 text-teal-700 md:block">
              <Landmark size={32} />
            </div>
          </div>
        </div>
      </section>

      <section className="ofp-hero-inner mx-auto max-w-7xl px-6 py-12 lg:py-16">
        {loadError ? (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            {loadError}
          </div>
        ) : null}

        <div className="ofp-card rounded-3xl p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
                Filtros
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">Filtros de objeto/fuente</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Filtran el ranking y tabla de entidades. Los gráficos de objeto y fuente responden a los filtros activos.
              </p>
            </div>

            <button
              onClick={resetFilters}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
            >
              Limpiar filtros
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr_160px]">
            <div>
              <label className="text-sm font-medium text-slate-700">Buscar</label>
              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 transition focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100">
                <Search size={16} className="text-slate-400" />
                <input
                  className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="Entidad, código o departamento..."
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
            subtitle="Suma por fuente de financiamiento"
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
            value={fuentePrincipal ? cleanFuenteLabel(fuentePrincipal.fuente_columna) : "-"}
            subtitle={fuentePrincipal ? formatBs(fuentePrincipal.monto) : "Sin datos"}
          />
        </div>

        <div className="mt-8 grid gap-6">
          <Section
            title="Objeto del gasto nivel 1"
            description="Ranking por objeto del gasto según los filtros activos."
          >
            <div className="h-[520px]">
              <ReactECharts option={objetoOption} style={{ height: "100%", width: "100%" }} />
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

        <div className="mt-8">
          <ObjetoGastoNivelesPanel query={query} />
        </div>

        <div className="mt-8 overflow-hidden ofp-card rounded-3xl">
          <div className="border-b border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
              Tabla
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">Tabla objeto/fuente por entidad</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Ranking filtrado por gasto total objeto/fuente.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                  <th className="p-3">Código</th>
                  <th className="p-3">Entidad</th>
                  <th className="p-3">Departamento</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Grupo ETA</th>
                  <th className="p-3 text-right tabular-nums text-slate-700">Objeto/fuente</th>
                  <th className="p-3 text-right tabular-nums text-slate-700">% filtro</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((item) => (
                  <tr key={item.codigo_entidad} className="border-b border-slate-100 transition hover:bg-slate-50">
                    <td className="p-3 font-mono text-xs text-slate-600">{item.codigo_entidad}</td>
                    <td className="p-3 font-medium text-slate-950">{item.nombre_entidad}</td>
                    <td className="p-3">{item.departamento}</td>
                    <td className="p-3">{item.tipo}</td>
                    <td className="p-3">{item.grupo_eta}</td>
                    <td className="p-3 text-right font-semibold tabular-nums text-slate-950">
                      {formatBs(item.gasto_total_objeto)}
                    </td>
                    <td className="p-3 text-right tabular-nums text-slate-700">
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
