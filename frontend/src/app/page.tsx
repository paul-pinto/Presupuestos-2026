"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReactECharts from "echarts-for-react";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Database,
  FileCheck2,
  Landmark,
  MapPinned,
  Search,
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
    grid: { left, right: 50, top: 20, bottom: 55, containLabel: true },
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

function chartOptionVertical({
  labels,
  values,
}: {
  labels: string[];
  values: number[];
}) {
  return {
    grid: { left: 90, right: 40, top: 20, bottom: 70, containLabel: true },
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
        formatter: (value: number) => formatBsCompact(value),
        hideOverlap: true,
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
  const [recursosRubro, setRecursosRubro] = useState<RecursoRubro[]>([]);
  const [objetoGasto, setObjetoGasto] = useState<ObjetoGasto[]>([]);
  const [fuentesObjeto, setFuentesObjeto] = useState<FuenteObjeto[]>([]);
  const [ingresosGastos, setIngresosGastos] = useState<IngresosGastos[]>([]);
  const [validacionDiferencias, setValidacionDiferencias] = useState<ValidacionDiferencia[]>([]);

  const [departamento, setDepartamento] = useState<string>("Todos");
  const [tipo, setTipo] = useState<string>("Todos");
  const [grupoEta, setGrupoEta] = useState<string>("Todos");
  const [query, setQuery] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [
        summaryData,
        entidadesData,
        departamentosData,
        programasData,
        recursosRubroData,
        objetoGastoData,
        fuentesObjetoData,
        ingresosGastosData,
        validacionDiferenciasData,
      ] = await Promise.all([
        fetchJson<Summary>("/data/summary.json"),
        fetchJson<Entidad[]>("/data/entidades.json"),
        fetchJson<Departamento[]>("/data/departamentos.json"),
        fetchJson<Programa[]>("/data/programas_top.json"),
        fetchJson<RecursoRubro[]>("/data/recursos_rubro.json"),
        fetchJson<ObjetoGasto[]>("/data/objeto_gasto_nivel1.json"),
        fetchJson<FuenteObjeto[]>("/data/fuentes_objeto_gasto.json"),
        fetchJson<IngresosGastos[]>("/data/ingresos_vs_gastos.json"),
        fetchJson<ValidacionDiferencia[]>("/data/validacion_diferencias.json"),
      ]);

      setSummary(summaryData);
      setEntidades(entidadesData);
      setDepartamentos(departamentosData);
      setProgramas(programasData);
      setRecursosRubro(recursosRubroData);
      setObjetoGasto(objetoGastoData);
      setFuentesObjeto(fuentesObjetoData);
      setIngresosGastos(ingresosGastosData);
      setValidacionDiferencias(validacionDiferenciasData);
    }

    load().catch((error) => {
      console.error(error);
      setLoadError(error instanceof Error ? error.message : "Error desconocido cargando datos");
    });
  }, []);

  const departamentosOptions = useMemo(() => {
    return ["Todos", ...Array.from(new Set(entidades.map((item) => item.departamento).filter(Boolean))).sort()];
  }, [entidades]);

  const tiposOptions = useMemo(() => {
    return ["Todos", ...Array.from(new Set(entidades.map((item) => item.tipo).filter(Boolean))).sort()];
  }, [entidades]);

  const gruposEtaOptions = useMemo(() => {
    return ["Todos", ...Array.from(new Set(entidades.map((item) => item.grupo_eta).filter(Boolean))).sort()];
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
      });
  }, [entidades, departamento, tipo, grupoEta, query]);

  const programasFiltrados = useMemo(() => {
    const q = query.trim().toLowerCase();

    return programas
      .filter((item) => departamento === "Todos" || item.departamento === departamento)
      .filter((item) => tipo === "Todos" || item.tipo === tipo)
      .filter((item) => grupoEta === "Todos" || item.grupo_eta === grupoEta)
      .filter((item) => {
        if (!q) return true;

        return (
          normalize(item.codigo_entidad).includes(q) ||
          normalize(item.nombre_entidad).includes(q) ||
          normalize(item.descripcion).includes(q) ||
          normalize(item.departamento).includes(q) ||
          normalize(item.tipo).includes(q) ||
          normalize(item.grupo_eta).includes(q)
        );
      })
      .slice(0, 20);
  }, [programas, departamento, tipo, grupoEta, query]);

  const ingresosGastosFiltrados = useMemo(() => {
    const q = query.trim().toLowerCase();

    return ingresosGastos
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
      });
  }, [ingresosGastos, departamento, tipo, grupoEta, query]);

  const validacionDiferenciasFiltradas = useMemo(() => {
    const q = query.trim().toLowerCase();

    return validacionDiferencias
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
      });
  }, [validacionDiferencias, departamento, tipo, grupoEta, query]);

  const topEntidades = entidadesFiltradas.slice(0, 20);

  const gastoTotalFiltrado = entidadesFiltradas.reduce(
    (acc, item) => acc + Number(item.presupuesto_total || 0),
    0
  );

  const ingresosTotalFiltrado = ingresosGastosFiltrados.reduce(
    (acc, item) => acc + Number(item.ingresos_total || 0),
    0
  );

  const departamentosFiltrados = useMemo(() => {
    const map = new Map<string, { departamento: string; presupuesto_total: number; entidades: number }>();

    for (const item of entidadesFiltradas) {
      const key = item.departamento || "Sin departamento";
      const current = map.get(key) || {
        departamento: key,
        presupuesto_total: 0,
        entidades: 0,
      };

      current.presupuesto_total += Number(item.presupuesto_total || 0);
      current.entidades += 1;
      map.set(key, current);
    }

    return Array.from(map.values()).sort((a, b) => b.presupuesto_total - a.presupuesto_total);
  }, [entidadesFiltradas]);

  const gruposGastoFiltrado: GrupoGasto[] = useMemo(() => {
    const grupos = [
      { key: "grupo_1", label: "Grupo 1" },
      { key: "grupo_2", label: "Grupo 2" },
      { key: "grupo_3", label: "Grupo 3" },
      { key: "grupo_4", label: "Grupo 4" },
      { key: "grupo_5", label: "Grupo 5" },
      { key: "grupo_6", label: "Grupo 6" },
      { key: "grupo_7", label: "Grupo 7" },
      { key: "grupo_8", label: "Grupo 8" },
      { key: "grupo_9", label: "Grupo 9" },
    ] as const;

    return grupos
      .map((grupo) => ({
        grupo_gasto: grupo.key,
        grupo_gasto_label: grupo.label,
        monto: entidadesFiltradas.reduce(
          (acc, item) => acc + Number(item[grupo.key] || 0),
          0
        ),
      }))
      .sort((a, b) => b.monto - a.monto);
  }, [entidadesFiltradas]);

  const rankingOption = chartOptionHorizontal({
    labels: [...topEntidades].reverse().map((item) => item.nombre_entidad),
    values: [...topEntidades].reverse().map((item) => item.presupuesto_total),
    left: 280,
  });

  const departamentosOption = chartOptionHorizontal({
    labels: [...departamentosFiltrados].reverse().map((item) => item.departamento),
    values: [...departamentosFiltrados].reverse().map((item) => item.presupuesto_total),
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
    labels: gruposGastoFiltrado.map((item) => item.grupo_gasto_label),
    values: gruposGastoFiltrado.map((item) => item.monto),
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
    left: 380,
  });

  const objetoGastoOption = chartOptionHorizontal({
    labels: [...objetoGasto]
      .slice(0, 15)
      .reverse()
      .map((item) => `${item.objeto_gasto}. ${cleanObjetoGastoLabel(item.objeto_gasto, item.descripcion)}`),
    values: [...objetoGasto]
      .slice(0, 15)
      .reverse()
      .map((item) => item.total),
    left: 380,
  });

  const fuentesObjetoOption = chartOptionHorizontal({
    labels: [...fuentesObjeto].reverse().map((item) => item.fuente_columna),
    values: [...fuentesObjeto].reverse().map((item) => item.monto),
    left: 220,
  });

  const resetFilters = () => {
    setDepartamento("Todos");
    setTipo("Todos");
    setGrupoEta("Todos");
    setQuery("");
  };

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
            <Link
              href="/entidades"
              className="rounded-full bg-slate-950 px-4 py-2 text-white hover:bg-slate-800"
            >
              Explorar entidades
            </Link>
            <Link
              href="/gastos"
              className="rounded-full bg-slate-800 px-4 py-2 text-white hover:bg-slate-700"
            >
              Ver gastos
            </Link>
            <Link
              href="/ingresos"
              className="rounded-full bg-slate-800 px-4 py-2 text-white hover:bg-slate-700"
            >
              Ver ingresos
            </Link>
            <Link
              href="/objeto-gasto"
              className="rounded-full bg-slate-800 px-4 py-2 text-white hover:bg-slate-700"
            >
              Ver objeto del gasto
            </Link>


            <Link
              href="/validacion"
              className="rounded-full bg-slate-800 px-4 py-2 text-white hover:bg-slate-700"
            >
              Ver validación
            </Link>
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

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Filtros globales</h2>
              <p className="mt-1 text-sm text-slate-500">
                Afectan métricas, rankings, programas, grupos de gasto y tablas principales.
              </p>
            </div>

            <button
              onClick={resetFilters}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Limpiar filtros
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <label className="text-sm font-medium text-slate-700">Buscar entidad</label>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
                <Search size={16} className="text-slate-400" />
                <input
                  className="w-full outline-none"
                  placeholder="Código, nombre, departamento..."
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
                {departamentosOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
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
                {tiposOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
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
                {gruposEtaOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Gasto total"
            value={formatBs(gastoTotalFiltrado)}
            subtitle={`${formatInt(entidadesFiltradas.length)} entidades filtradas`}
            icon={<Database size={24} />}
          />
          <MetricCard
            title="Ingreso total"
            value={formatBs(ingresosTotalFiltrado)}
            subtitle="Según entidades filtradas"
            icon={<WalletCards size={24} />}
          />
          <MetricCard
            title="Departamentos"
            value={formatInt(departamentosFiltrados.length)}
            subtitle={summary ? `${formatInt(summary.departamentos)} en universo total` : ""}
            icon={<MapPinned size={24} />}
          />
          <MetricCard
            title="Entidades"
            value={formatInt(entidadesFiltradas.length)}
            subtitle={summary ? `${formatInt(summary.entidades)} en universo total` : ""}
            icon={<Building2 size={24} />}
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <MetricCard
            title="Objeto/Fuente"
            value={summary ? formatBs(summary.gasto_total_objeto) : "Cargando..."}
            subtitle="Agregado global; detalle filtrable irá en /objeto-gasto"
            icon={<Landmark size={24} />}
          />
          <MetricCard
            title="Entidades con diferencias"
            value={formatInt(validacionDiferenciasFiltradas.length)}
            subtitle="Según filtros actuales"
            icon={<AlertTriangle size={24} />}
          />
        </div>

        <div className="mt-8 grid gap-6">
          <Section
            title="Ranking de entidades por presupuesto"
            description="Top 20 según filtros globales."
          >
            <div className="h-[720px]">
              <ReactECharts option={rankingOption} style={{ height: "100%", width: "100%" }} />
            </div>
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Gasto agregado por departamento" description="Calculado con los filtros actuales.">
              <div className="h-[520px]">
                <ReactECharts option={departamentosOption} style={{ height: "100%", width: "100%" }} />
              </div>
            </Section>

            <Section title="Grupos de gasto" description="Calculado con las entidades filtradas.">
              <div className="h-[520px]">
                <ReactECharts option={gruposGastoOption} style={{ height: "100%", width: "100%" }} />
              </div>
            </Section>
          </div>

          <Section
            title="Top programas presupuestarios"
            description="Programas filtrados por departamento, tipo, grupo ETA y búsqueda."
          >
            <div className="h-[720px]">
              <ReactECharts option={programasOption} style={{ height: "100%", width: "100%" }} />
            </div>
          </Section>

          <div className="grid gap-6">
            <Section
              title="Recursos / ingresos por rubro"
              description="Agregado global por rubro. El detalle filtrable por entidad se agregará en /ingresos."
            >
              <div className="h-[560px]">
                <ReactECharts option={recursosRubroOption} style={{ height: "100%", width: "100%" }} />
              </div>
            </Section>

            <Section
              title="Objeto del gasto nivel 1"
              description="Agregado global por objeto. El detalle filtrable por entidad se agregará en /objeto-gasto."
            >
              <div className="h-[520px]">
                <ReactECharts option={objetoGastoOption} style={{ height: "100%", width: "100%" }} />
              </div>
            </Section>
          </div>

          <Section title="Fuentes de financiamiento en objeto del gasto" description="Agregado global.">
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
                        {formatPct(item.presupuesto_total, gastoTotalFiltrado)}
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
            {validacionDiferenciasFiltradas.length === 0 ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
                No hay diferencias para los filtros actuales.
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
                    {validacionDiferenciasFiltradas.slice(0, 30).map((item) => (
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
