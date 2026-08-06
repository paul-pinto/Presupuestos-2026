import { GlassCard, PageShell, Pill } from "@/components/ui";

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
    <PageShell
      eyebrow="Datos"
      title="Datasets del Observatorio de Presupuestos ETA 2026"
      description="Archivos JSON que alimentan el frontend del observatorio. Se generan desde la base procesada del proyecto y se publican como archivos estáticos dentro de /data."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {datasets.map((dataset) => (
          <GlassCard key={dataset.file}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">{dataset.title}</h2>
                <p className="mt-1 font-mono text-xs text-cyan-300">{dataset.file}</p>
              </div>

              <a
                href={`/data/${dataset.file}`}
                className="rounded-full border border-cyan-300/40 px-3 py-1 text-xs font-medium text-cyan-200 hover:bg-cyan-300/10"
                target="_blank"
                rel="noreferrer"
              >
                Ver JSON
              </a>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-300">
              {dataset.description}
            </p>

            <div className="mt-4">
              <Pill>{dataset.usedIn}</Pill>
            </div>
          </GlassCard>
        ))}
      </div>

      <section className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5">
        <h2 className="text-lg font-semibold text-amber-100">Nota de uso</h2>
        <p className="mt-3 text-sm leading-6 text-amber-50/90">
          Los archivos publicados son insumos procesados para visualización. No reemplazan
          la fuente oficial ni una auditoría presupuestaria. Los rankings deben interpretarse
          como herramientas exploratorias y no como conclusiones automáticas sobre desempeño
          institucional.
        </p>
      </section>
    </PageShell>
  );
}
