export type FiltreQuestionnaire = "tous" | "classiques" | "avances";

interface Props {
  valeur: FiltreQuestionnaire;
  onChange: (valeur: FiltreQuestionnaire) => void;
  matieres: string[];
  matiereSelectionnee: string;
  onMatiereChange: (matiere: string) => void;
}

const filtres: { valeur: FiltreQuestionnaire; label: string }[] = [
  { valeur: "tous", label: "Tous" },
  { valeur: "classiques", label: "Classiques" },
  { valeur: "avances", label: "Avancés" },
];

export default function QuestionnaireFilters({
  valeur,
  onChange,
  matieres,
  matiereSelectionnee,
  onMatiereChange,
}: Props) {
  return (
    <div className="mt-5 pb-4" aria-label="Filtres des questionnaires">
      <div className="flex flex-wrap items-center gap-2">
              {filtres.map((filtre) => (
                <button
                  key={filtre.valeur}
                  type="button"
                  onClick={() => onChange(filtre.valeur)}
                  className={valeur === filtre.valeur
                    ? "min-h-10 rounded-md border border-navy bg-navy px-4 py-2 text-xs font-bold text-paper transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2"
                    : "min-h-10 rounded-md border border-line bg-white px-4 py-2 text-xs font-semibold text-inkmuted transition-colors hover:border-navy/40 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2"}
                >
                  {filtre.label}
                </button>
              ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
              <label htmlFor="filtre-matiere" className="font-mono text-[11px] uppercase tracking-widest text-inkmuted">
                Matière
              </label>
              <select
                id="filtre-matiere"
                value={matiereSelectionnee}
                onChange={(e) => onMatiereChange(e.target.value)}
                className="min-h-10 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-navy focus:ring-2 focus:ring-highlight/50"
              >
                <option value="">Toutes les matières</option>
                {matieres.map((matiere) => (
                  <option key={matiere} value={matiere}>
                    {matiere}
                  </option>
                ))}
              </select>

              {(valeur !== "tous" || matiereSelectionnee) && (
                <button
                  type="button"
                  onClick={() => {
                    onChange("tous");
                    onMatiereChange("");
                  }}
                  className="text-xs font-semibold text-navy underline underline-offset-4 transition-colors hover:text-ink"
                >
                  Réinitialiser
                </button>
              )}
      </div>
    </div>
  );
}
