export type FiltreQuestionnaire = "tous" | "classiques" | "avances";

interface Props {
  valeur: FiltreQuestionnaire;
  onChange: (valeur: FiltreQuestionnaire) => void;
  recherche: string;
  onRechercheChange: (valeur: string) => void;
  typesFormation: string[];
  typeFormationSelectionne: string;
  onTypeFormationChange: (type: string) => void;
  formations: Array<{ id: string; nom: string }>;
  formationSelectionnee: string;
  onFormationChange: (formationId: string) => void;
  matieres: string[];
  matiereSelectionnee: string;
  onMatiereChange: (matiere: string) => void;
  onReinitialiser: () => void;
}

const filtres: { valeur: FiltreQuestionnaire; label: string }[] = [
  { valeur: "tous", label: "Tous" },
  { valeur: "classiques", label: "Classiques" },
  { valeur: "avances", label: "Avancés" },
];

const classeSelect = "min-h-12 w-full appearance-none rounded-md border border-line bg-white px-3.5 pr-10 text-sm text-ink outline-none transition-colors hover:border-navy/40 focus:border-navy focus:ring-2 focus:ring-highlight/40 disabled:cursor-not-allowed disabled:bg-paper disabled:text-inkmuted";
const classeLabel = "mb-2 block text-xs font-semibold text-ink";

export default function QuestionnaireFilters({
  valeur,
  onChange,
  recherche,
  onRechercheChange,
  typesFormation,
  typeFormationSelectionne,
  onTypeFormationChange,
  formations,
  formationSelectionnee,
  onFormationChange,
  matieres,
  matiereSelectionnee,
  onMatiereChange,
  onReinitialiser,
}: Props) {
  const filtresActifs = Boolean(
    recherche.trim()
    || valeur !== "tous"
    || typeFormationSelectionne
    || formationSelectionnee
    || matiereSelectionnee,
  );

  return (
    <section className="mt-0" aria-label="Recherche et filtres des questionnaires">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {filtresActifs && (
          <button
            type="button"
            onClick={onReinitialiser}
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-xs font-semibold text-inkmuted transition-colors hover:border-navy/40 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-3.5 w-3.5">
              <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v5m4-5v5" />
            </svg>
            Réinitialiser
          </button>
        )}
      </div>

      <div className="mt-5 space-y-6">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,0.65fr)]">
          <div>
            <label htmlFor="recherche-questionnaires" className={classeLabel}>Recherche</label>
            <div className="relative">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-inkmuted">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
              <input
                id="recherche-questionnaires"
                type="search"
                placeholder="Matière, notion ou questionnaire..."
                value={recherche}
                onChange={(event) => onRechercheChange(event.target.value)}
                className="min-h-12 w-full rounded-md border border-line bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-inkmuted/70 hover:border-navy/40 focus:border-navy focus:ring-2 focus:ring-highlight/40"
              />
            </div>
          </div>

          <div>
            <span className={classeLabel}>Format du questionnaire</span>
            <div role="group" aria-label="Format des questionnaires" className="flex min-h-12 rounded-md border border-line bg-paper p-1">
              {filtres.map((filtre) => (
                <button
                  key={filtre.valeur}
                  type="button"
                  aria-pressed={valeur === filtre.valeur}
                  onClick={() => onChange(filtre.valeur)}
                  className={valeur === filtre.valeur
                    ? "min-w-0 flex-1 rounded bg-navy px-2 text-xs font-bold text-paper shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-1"
                    : "min-w-0 flex-1 rounded px-2 text-xs font-semibold text-inkmuted transition-colors hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-1"}
                >
                  {filtre.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-1">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="filtre-type-formation" className={classeLabel}>Type de formation</label>
              <div className="relative">
                <select
                  id="filtre-type-formation"
                  value={typeFormationSelectionne}
                  onChange={(event) => onTypeFormationChange(event.target.value)}
                  className={classeSelect}
                >
                  <option value="">Tous les types</option>
                  {typesFormation.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-inkmuted">
                  <path d="m7 10 5 5 5-5" />
                </svg>
              </div>
            </div>

            <div>
              <label htmlFor="filtre-formation" className={classeLabel}>Formation précise</label>
              <div className="relative">
                <select
                  id="filtre-formation"
                  value={formationSelectionnee}
                  onChange={(event) => onFormationChange(event.target.value)}
                  disabled={!typeFormationSelectionne}
                  className={classeSelect}
                >
                  <option value="">{typeFormationSelectionne ? "Toutes les formations" : "Choisir un type d'abord"}</option>
                  {formations.map((formation) => <option key={formation.id} value={formation.id}>{formation.nom}</option>)}
                </select>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-inkmuted">
                  <path d="m7 10 5 5 5-5" />
                </svg>
              </div>
            </div>

            <div>
              <label htmlFor="filtre-matiere" className={classeLabel}>Matière</label>
              <div className="relative">
                <select
                  id="filtre-matiere"
                  value={matiereSelectionnee}
                  onChange={(event) => onMatiereChange(event.target.value)}
                  className={classeSelect}
                >
                  <option value="">Toutes les matières</option>
                  {matieres.map((matiere) => <option key={matiere} value={matiere}>{matiere}</option>)}
                </select>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-inkmuted">
                  <path d="m7 10 5 5 5-5" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
