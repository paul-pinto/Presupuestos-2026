import Link from "next/link";
import { ArrowLeft, Database, ExternalLink } from "lucide-react";

const datasets = [
  {
    file: "summary.json",
    title: "Resumen general",
    description: "Totales principales del observatorio: presupuesto agregado, ingresos, entidades, departamentos y validación.",
    usedIn: "Inicio",
  },
  {
    file: "entidades.json",
    title: "Entidades territoriales autónomas",
    description: "Base principal de entidades con presupuesto total, departamento, tipo, grupo ETA y grupos de gasto.",
    usedIn: "Inicio, Entidades, Fichas individuales",
  },
  {
    file: "programas.json",
    title: "Programas presupuestarios",
    description: "Detalle de programas por entidad, usado para rankings y fichas individuales.",
    usedIn: "Inicio, Gastos, Fichas individuales",
  },
  {
    file: "ingresos_vs_gastos.json",
    title: "Ingresos frente a gastos",
    description: "Comparación presupuestaria entre recursos e importes de gasto por entidad.",
    usedIn: "Inicio, Ingresos, Fichas individuales",
  },
  {
    file: "recursos_detalle.json",
    title: "Recursos por rubro",
    description: "Detalle de ingresos clasificados por rubro presupuestario.",
    usedIn: "Inicio, Ingresos",
  },
  {
    file: "recursos_fuente_organismo.json",
    title: "Recursos por fuente y organismo",
    description: "Detalle de ingresos según fuente de financiamiento y organismo financiador.",
    usedIn: "Inicio, Ingresos, Indicadores fiscales",
  },
  {
    file: "objeto_gasto_detalle.json",
    title: "Objeto del gasto detallado",
    description: "Detalle del gasto por clasificador de objeto del gasto y entidad.",
    usedIn: "Objeto del gasto",
  },
  {
    file: "objeto_gasto_catalogo.json",
    title: "Catálogo de objeto del gasto",
    description: "Catálogo jerárquico usado para navegar niveles del clasificador de gasto.",
    usedIn: "Objeto del gasto",
  },
  {
    file: "entidades_indicadores.json",
    title: "Indicadores poblacionales",
    description: "Cruce SIGEP con población INE 2024 para calcular presupuesto per cápita.",
    usedIn: "Indicadores, Fichas individuales",
  },
  {
    file: "indicadores_fiscales.json",
    title: "Indicadores fiscales",
    description: "Autonomía fiscal estricta, dependencia TGN, coparticipación, IDH, regalías y recursos específicos.",
    usedIn: "Indicadores, Fichas individuales",
  },
  {
    file: "validacion_integrada.json",
    title: "Validación integrada",
    description: "Control de consistencia entre diferentes agregaciones presupuestarias.",
    usedIn: "Validación, Fichas individuales",
  },
];

export default function DatosPage() {
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
                Datos abiertos
              </p>
              <h1 className="mt-3 max-w-5xl text-4xl font-bold tracking-tight text-slate-950">
                Datasets del Observatorio de Presupuestos ETA 2026
              </h1>
              <p className="mt-4 max-w-4xl text-base leading-7 text-slate-600">
  Catálogo de bases públicas generadas por el observatorio. Reúne archivos JSON y GeoJSON utilizados por el frontend, incluyendo presupuestos, entidades, programas, recursos, objeto del gasto, validación, indicadores fiscales, población, NBI, PIBpc y capas territoriales.
</p>
            </div>

            <div className="hidden rounded-3xl border border-teal-100 bg-teal-50 p-4 text-teal-700 md:block">
              <Database size={32} />
            </div>
          </div>
        </div>
      </section>

      <section className="ofp-hero-inner mx-auto max-w-7xl px-6 py-12 lg:py-16">
        <div className="grid gap-4 md:grid-cols-2">
          {datasets.map((dataset) => (
            <article
              key={dataset.file}
              className="ofp-card rounded-3xl p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
                    Dataset
                  </p>
                  <h2 className="mt-2 text-lg font-bold tracking-tight text-slate-950">
                    {dataset.title}
                  </h2>
                  <p className="mt-2 font-mono text-xs text-slate-500">
                    {dataset.file}
                  </p>
                </div>

                <a
                  href={`/data/${dataset.file}`}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver JSON
                  <ExternalLink size={14} />
                </a>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                {dataset.description}
              </p>

              <div className="mt-4">
                <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800">
                  {dataset.usedIn}
                </span>
              </div>
            </article>
          ))}
        </div>

        <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
            Nota de uso
          </p>
          <h2 className="mt-2 text-lg font-bold tracking-tight text-slate-950">
            Alcance de los datos publicados
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            Los archivos publicados son insumos procesados para visualización. No reemplazan
            la fuente oficial ni una auditoría presupuestaria. Los rankings deben interpretarse
            como herramientas exploratorias y no como conclusiones automáticas sobre desempeño
            institucional.
          </p>
        </section>
      </section>
    </main>
  );
}
