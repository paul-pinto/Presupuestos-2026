import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";

const datasets = [
  {
    name: "Entidades",
    file: "/data/entidades.json",
    description: "Presupuesto total y grupos de gasto por entidad.",
  },
  {
    name: "Programas",
    file: "/data/programas.json",
    description: "Programas presupuestarios completos por entidad.",
  },
  {
    name: "Ingresos vs gastos",
    file: "/data/ingresos_vs_gastos.json",
    description: "ComparaciÃ³n de ingresos, gastos y diferencia por entidad.",
  },
  {
    name: "Objeto del gasto nivel 1",
    file: "/data/objeto_gasto_nivel1.json",
    description: "Agregado por objeto del gasto.",
  },
  {
    name: "Fuentes de financiamiento",
    file: "/data/fuentes_objeto_gasto.json",
    description: "Agregado por fuente de financiamiento.",
  },
  {
    name: "ValidaciÃ³n integrada",
    file: "/data/validacion_integrada.json",
    description: "Control de consistencia por entidad.",
  },
];

export default function DatosPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-950"
          >
            <ArrowLeft size={16} />
            Volver al resumen
          </Link>

          <p className="mt-6 text-sm font-medium uppercase tracking-wide text-slate-500">
            Datos abiertos
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Descargas</h1>
          <p className="mt-4 max-w-3xl text-slate-600">
            Archivos JSON utilizados por el frontend pÃºblico. Estos archivos permiten auditar,
            reutilizar o replicar los principales anÃ¡lisis del observatorio.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid gap-4">
          {datasets.map((dataset) => (
            <div
              key={dataset.file}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between"
            >
              <div>
                <h2 className="text-lg font-semibold">{dataset.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{dataset.description}</p>
                <p className="mt-2 font-mono text-xs text-slate-400">{dataset.file}</p>
              </div>

              <a
                href={dataset.file}
                download
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm text-white hover:bg-slate-800"
              >
                <Download size={16} />
                Descargar JSON
              </a>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
