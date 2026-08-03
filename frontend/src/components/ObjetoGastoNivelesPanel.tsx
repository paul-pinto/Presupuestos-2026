"use client";
import { formatBs, formatBsCompact, formatNumber, formatPct, normalize, shortEntidadLabel } from "@/lib/format";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

type ObjetoCatalogoRow = {
  codigo: string;
  nivel: number;
  nombre: string;
  label: string;
};

type ObjetoGastoRow = {
  codigo_entidad?: string;
  nombre_entidad?: string;
  departamento?: string;
  tipo?: string;
  grupo_eta?: string;
  objeto_gasto?: string;
  descripcion?: string;
  descripcion_limpia?: string;
  total?: number;
  importe?: number;
  monto?: number;
};

function amount(row: ObjetoGastoRow): number {
  return Number(row.total ?? row.importe ?? row.monto ?? 0);
}

function cleanCode(value: string | number | null | undefined): string {
  return String(value || "").trim();
}

function digitCode(value: string | number | null | undefined): string {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.padEnd(5, "0").slice(0, 5);
}

function codeFromOption(value: string): string {
  if (value === "Todos") return "";
  return digitCode(value.split(" ")[0]);
}

function objectLevel(code: string, level: number): string {
  const digits = digitCode(code);
  if (!digits) return "";

  if (level === 1) return `${digits.slice(0, 1)}0000`;
  if (level === 2) return `${digits.slice(0, 2)}000`;
  if (level === 3) return `${digits.slice(0, 3)}00`;
  if (level === 4) return `${digits.slice(0, 4)}0`;

  return digits;
}

function levelName(level: number): string {
  if (level === 1) return "Grupo";
  if (level === 2) return "Subgrupo";
  if (level === 3) return "Partida";
  if (level === 4) return "Subpartida";
  return "Detalle";
}

function labelFor(code: string, rows: ObjetoGastoRow[]): string {
  if (!code) return "Todos";

  const normalized = digitCode(code);
  const level = normalized.endsWith("0000")
    ? 1
    : normalized.endsWith("000")
      ? 2
      : normalized.endsWith("00")
        ? 3
        : normalized.endsWith("0")
          ? 4
          : 5;

  const exact = rows.find((row) => digitCode(row.objeto_gasto) === normalized);
  if (exact) {
    const label = exact.descripcion_limpia || exact.descripcion || "";
    return label ? `${normalized} - ${label}` : `${normalized} - ${levelName(level)} ${normalized}`;
  }

  const child = rows.find((row) => digitCode(row.objeto_gasto).startsWith(normalized.replace(/0+$/, "")));
  if (child) {
    const label = child.descripcion_limpia || child.descripcion || "";
    return label ? `${normalized} - ${label}` : `${normalized} - ${levelName(level)} ${normalized}`;
  }

  return `${normalized} - ${levelName(level)} ${normalized}`;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "es-BO", { numeric: true })
  );
}

function SelectBox({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm text-slate-600">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-950"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function ObjetoGastoNivelesPanel() {
  const [data, setData] = useState<ObjetoGastoRow[]>([]);
  const [catalogo, setCatalogo] = useState<ObjetoCatalogoRow[]>([]);
  const [query, setQuery] = useState("");
  const [nivel1, setNivel1] = useState("Todos");
  const [nivel2, setNivel2] = useState("Todos");
  const [nivel3, setNivel3] = useState("Todos");
  const [nivel4, setNivel4] = useState("Todos");

  const nivel1Code = codeFromOption(nivel1);
  const nivel2Code = codeFromOption(nivel2);
  const nivel3Code = codeFromOption(nivel3);
  const nivel4Code = codeFromOption(nivel4);

  useEffect(() => {
    fetch("/data/objeto_gasto_detalle.json")
      .then((response) => response.json())
      .then((rows: ObjetoGastoRow[]) => setData(rows))
      .catch(() => setData([]));

    fetch("/data/objeto_gasto_catalogo.json")
      .then((response) => response.json())
      .then((rows: ObjetoCatalogoRow[]) => setCatalogo(rows))
      .catch(() => setCatalogo([]));
  }, []);

  const catalogoNivel1 = useMemo(() => {
    return catalogo.filter((item) => item.nivel === 1);
  }, [catalogo]);

  const catalogoNivel2 = useMemo(() => {
    if (!nivel1Code) return catalogo.filter((item) => item.nivel === 2);
    const prefix = nivel1Code.slice(0, 1);
    return catalogo.filter((item) => item.nivel === 2 && item.codigo.startsWith(prefix));
  }, [catalogo, nivel1Code]);

  const catalogoNivel3 = useMemo(() => {
    if (!nivel2Code) return catalogo.filter((item) => item.nivel === 3);
    const prefix = nivel2Code.slice(0, 2);
    return catalogo.filter((item) => item.nivel === 3 && item.codigo.startsWith(prefix));
  }, [catalogo, nivel2Code]);

  const catalogoNivel4 = useMemo(() => {
    if (!nivel3Code) return catalogo.filter((item) => item.nivel === 4);
    const prefix = nivel3Code.slice(0, 3);
    return catalogo.filter((item) => item.nivel === 4 && item.codigo.startsWith(prefix));
  }, [catalogo, nivel3Code]);

  const nivel1Options = useMemo(() => {
    return ["Todos", ...catalogoNivel1.map((item) => item.label)];
  }, [catalogoNivel1]);
const nivel2Options = useMemo(() => {
    return ["Todos", ...catalogoNivel2.map((item) => item.label)];
  }, [catalogoNivel2]);
const nivel3Options = useMemo(() => {
    return ["Todos", ...catalogoNivel3.map((item) => item.label)];
  }, [catalogoNivel3]);
const nivel4Options = useMemo(() => {
    return ["Todos", ...catalogoNivel4.map((item) => item.label)];
  }, [catalogoNivel4]);
const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return data.filter((row) => {
      const code = cleanCode(row.objeto_gasto);

      if (nivel1Code && objectLevel(code, 1) !== nivel1Code) return false;
      if (nivel2Code && objectLevel(code, 2) !== nivel2Code) return false;
      if (nivel3Code && objectLevel(code, 3) !== nivel3Code) return false;
      if (nivel4Code && objectLevel(code, 4) !== nivel4Code) return false;

      if (!q) return true;

      return (
        normalize(row.codigo_entidad).includes(q) ||
        normalize(row.nombre_entidad).includes(q) ||
        normalize(row.departamento).includes(q) ||
        normalize(row.objeto_gasto).includes(q) ||
        normalize(row.descripcion).includes(q) ||
        normalize(row.descripcion_limpia).includes(q)
      );
    });
  }, [data, query, nivel1Code, nivel2Code, nivel3Code, nivel4Code]);

  const total = filtered.reduce((sum, row) => sum + amount(row), 0);

  const ranking = useMemo(() => {
    const grouped = new Map<string, { codigo: string; entidad: string; total: number }>();

    for (const row of filtered) {
      const codigo = cleanCode(row.codigo_entidad);
      const entidad = row.nombre_entidad || codigo || "Sin entidad";
      const current = grouped.get(codigo) || { codigo, entidad, total: 0 };
      current.total += amount(row);
      grouped.set(codigo, current);
    }

    return Array.from(grouped.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);
  }, [filtered]);

  const objectBreakdown = useMemo(() => {
    const grouped = new Map<string, { code: string; label: string; total: number }>();

    for (const row of filtered) {
      const code = digitCode(row.objeto_gasto);
      const label = row.descripcion_limpia || row.descripcion || code;
      const key = `${code} - ${label}`;
      const current = grouped.get(key) || { code, label: key, total: 0 };
      current.total += amount(row);
      grouped.set(key, current);
    }

    return Array.from(grouped.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);
  }, [filtered]);

  const rankingOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (value: number) => formatBs(value),
    },
    grid: { left: 230, right: 90, top: 20, bottom: 35, containLabel: true },
    xAxis: {
      type: "value",
      axisLabel: {
        formatter: (value: number) => formatBsCompact(value),
      },
    },
    yAxis: {
      type: "category",
      data: [...ranking].reverse().map((item) => shortEntidadLabel(item.entidad)),
      axisLabel: {
        width: 210,
        overflow: "truncate",
        interval: 0,
      },
    },
    series: [
      {
        type: "bar",
        data: [...ranking].reverse().map((item) => item.total),
        barMaxWidth: 24,
        label: {
          show: true,
          position: "right",
          formatter: ({ value }: { value: number }) => formatBsCompact(value),
        },
      },
    ],
  };

  const breakdownOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (value: number) => formatBs(value),
    },
    grid: { left: 260, right: 90, top: 20, bottom: 35, containLabel: true },
    xAxis: {
      type: "value",
      axisLabel: {
        formatter: (value: number) => formatBsCompact(value),
      },
    },
    yAxis: {
      type: "category",
      data: [...objectBreakdown].reverse().map((item) => item.label),
      axisLabel: {
        width: 240,
        overflow: "truncate",
        interval: 0,
      },
    },
    series: [
      {
        type: "bar",
        data: [...objectBreakdown].reverse().map((item) => item.total),
        barMaxWidth: 24,
        label: {
          show: true,
          position: "right",
          formatter: ({ value }: { value: number }) => formatBsCompact(value),
        },
      },
    ],
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-semibold">Objeto del gasto por niveles</h2>
        <p className="mt-1 text-sm text-slate-500">
          Explora el gasto filtrando la clasificación oficial de objeto del gasto por grupos, subgrupos y partidas.
        </p>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="text-sm text-slate-600">
          Buscar entidad u objeto
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Entidad, código, descripción..."
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-950"
          />
        </label>

        <SelectBox
          label="Nivel 1"
          value={nivel1}
          options={nivel1Options}
          onChange={(value) => {
            setNivel1(value);
            setNivel2("Todos");
            setNivel3("Todos");
            setNivel4("Todos");
          }}
        />

        <SelectBox
          label="Nivel 2"
          value={nivel2}
          options={nivel2Options}
          onChange={(value) => {
            setNivel2(value);
            setNivel3("Todos");
            setNivel4("Todos");
          }}
        />

        <SelectBox
          label="Nivel 3"
          value={nivel3}
          options={nivel3Options}
          onChange={(value) => {
            setNivel3(value);
            setNivel4("Todos");
          }}
        />

        <SelectBox
          label="Nivel 4"
          value={nivel4}
          options={nivel4Options}
          onChange={setNivel4}
        />
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Registros filtrados</p>
          <p className="mt-1 text-lg font-bold text-slate-950">
            {filtered.length.toLocaleString("es-BO")}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total filtrado</p>
          <p className="mt-1 text-lg font-bold text-slate-950">{formatBsCompact(total)}</p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Entidades</p>
          <p className="mt-1 text-lg font-bold text-slate-950">
            {ranking.length.toLocaleString("es-BO")}
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Top entidades por objeto seleccionado</h3>
          <div className="mt-3 h-[520px]">
            <ReactECharts option={rankingOption} style={{ height: "100%", width: "100%" }} />
          </div>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900">Composición del objeto seleccionado</h3>
          <div className="mt-3 h-[520px]">
            <ReactECharts option={breakdownOption} style={{ height: "100%", width: "100%" }} />
          </div>
        </div>
      </div>
    </section>
  );
}
