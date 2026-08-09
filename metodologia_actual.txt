import { GlassCard, PageShell, SectionTitle } from "@/components/ui";

const sections = [
  {
    title: "Fuente principal: SIGEP",
    body: [
      "El observatorio utiliza información presupuestaria de entidades territoriales autónomas para la gestión 2026.",
      "La base consolida ingresos, gastos, programas, objeto del gasto, rubros de recursos, fuentes de financiamiento y organismos financiadores.",
      "Los montos se presentan en bolivianos corrientes y se agregan según la estructura presupuestaria disponible.",
    ],
  },
  {
    title: "Fuente poblacional: INE Censo 2024",
    body: [
      "Para los indicadores per cápita se utiliza población municipal del Censo 2024.",
      "El cruce se realizó entre entidades SIGEP y municipios/TIOC del INE.",
      "La denominación visible en el observatorio conserva el nombre oficial usado en SIGEP; el nombre INE se usa solamente como referencia de emparejamiento poblacional.",
    ],
  },
  {
    title: "Cruce SIGEP ↔ INE",
    body: [
      "El emparejamiento se hizo mediante normalización de nombres, departamento y equivalencias manuales revisadas.",
      "Cuando el nombre SIGEP difiere del nombre INE, se conserva el nombre SIGEP y se registra el municipio INE asociado.",
      "Este cruce permite calcular presupuesto per cápita para los gobiernos municipales y autonomías indígena originario campesinas con población disponible.",
    ],
  },
  {
    title: "Presupuesto per cápita",
    body: [
      "El presupuesto per cápita se calcula dividiendo el presupuesto total de la entidad entre su población 2024.",
      "Este indicador no mide eficiencia ni calidad del gasto; solamente muestra la escala presupuestaria relativa por habitante.",
      "Debe interpretarse junto con tamaño poblacional, tipo de entidad, geografía, estructura productiva y fuentes de financiamiento.",
    ],
  },
  {
    title: "Autonomía fiscal estricta",
    body: [
      "La autonomía fiscal estricta se calcula únicamente para GAM y GAIOC.",
      "La fórmula usada es: Recursos Específicos GAM/GAIOC fuente 20 organismo 210 dividido entre ingresos totales.",
      "Las regalías no se incluyen como autonomía fiscal estricta municipal, porque no corresponden a recaudación propia directa del gobierno municipal.",
    ],
  },
  {
    title: "Dependencia TGN",
    body: [
      "La dependencia TGN mide el peso de las transferencias del Tesoro General de la Nación sobre los ingresos totales.",
      "Dentro de este grupo se distinguen componentes como coparticipación tributaria, IDH y otras transferencias.",
      "Un porcentaje alto indica que la entidad depende en mayor medida de transferencias nacionales para financiar su presupuesto.",
    ],
  },
  {
    title: "Coparticipación, IDH y regalías",
    body: [
      "La coparticipación tributaria se identifica mediante fuente y organismo financiador según la clasificación presupuestaria.",
      "El IDH se presenta como un componente específico de las transferencias TGN.",
      "Las regalías se muestran por separado para evitar mezclarlas con recursos propios o autonomía fiscal estricta.",
    ],
  },
  {
    title: "Objeto del gasto",
    body: [
      "El objeto del gasto clasifica el presupuesto según la naturaleza económica del gasto.",
      "El observatorio permite revisar niveles agregados y desagregados del clasificador: servicios personales, servicios no personales, materiales y suministros, activos reales, transferencias, deuda y otros grupos.",
      "Los filtros jerárquicos permiten pasar de categorías generales a partidas más específicas.",
    ],
  },
  {
    title: "Fuente y organismo financiador",
    body: [
      "La fuente de financiamiento indica el origen general de los recursos.",
      "El organismo financiador permite identificar con mayor detalle la procedencia presupuestaria.",
      "La combinación fuente/organismo ayuda a distinguir recursos específicos, coparticipación tributaria, IDH, regalías, TGN y otros componentes.",
    ],
  },
  {
    title: "Limitaciones",
    body: [
      "El observatorio trabaja con datos presupuestarios, no necesariamente con ejecución presupuestaria.",
      "Los indicadores no reemplazan auditorías financieras ni análisis institucionales detallados.",
      "Algunos nombres pueden diferir entre SIGEP e INE; por eso se usa una tabla de equivalencias para el cruce poblacional.",
      "Los rankings deben interpretarse como herramientas exploratorias, no como juicios automáticos de desempeño.",
    ],
  },
];

export default function MetodologiaPage() {
  return (
    <PageShell
      eyebrow="Metodología"
      title="Cómo se construye el Observatorio de Presupuestos ETA 2026"
      description="Fuentes, cruces, criterios de cálculo y limitaciones principales del observatorio. El objetivo es que los indicadores sean transparentes, reproducibles y fáciles de interpretar."
    >
      <div className="grid gap-5">
        {sections.map((section, index) => (
          <GlassCard key={section.title}>
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 text-sm font-semibold text-cyan-100">
                {String(index + 1).padStart(2, "0")}
              </div>

              <div>
                <SectionTitle title={section.title} />
                <div className="space-y-3 text-sm leading-6 text-slate-300">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </PageShell>
  );
}
