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
  const filtresParcoursActifs = [typeFormationSelectionne, formationSelectionnee, matiereSelectionnee]
    .filter(Boolean).length;
  const formationResume = formations.find((formation) => formation.id === formationSelectionnee)?.nom
    || typeFormationSelectionne;
  const parcoursResume = [formationResume, matiereSelectionnee].filter(Boolean).join(" · ")
    || "Toutes les formations et matières";

  return (
    <section className="mt-0" aria-label="Recherche et filtres des questionnaires">
      <div className="mt-5 space-y-4">
        <div className={`grid items-end gap-4 ${filtresActifs ? "sm:grid-cols-[minmax(0,1fr)_auto_minmax(15rem,0.65fr)]" : "sm:grid-cols-[minmax(0,1fr)_minmax(15rem,0.65fr)]"}`}>
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

          {filtresActifs && (
            <button
              type="button"
              onClick={onReinitialiser}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-xs font-semibold text-inkmuted transition-colors hover:border-navy/40 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-3.5 w-3.5">
                <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v5m4-5v5" />
              </svg>
              Réinitialiser
            </button>
          )}

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

        <details className="group rounded-md border border-line bg-white">
          <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 rounded-md px-4 py-3 transition-colors hover:bg-paper/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-highlight [&::-webkit-details-marker]:hidden">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-highlight/25 text-navy">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4">
                <path d="M4 6h16M7 12h10m-7 6h4" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-ink">Formation et matière</span>
              <span className="block truncate text-xs text-inkmuted">{parcoursResume}</span>
            </span>
            {filtresParcoursActifs > 0 && (
              <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-navy px-2 text-xs font-bold text-white" aria-label={`${filtresParcoursActifs} filtres actifs`}>
                {filtresParcoursActifs}
              </span>
            )}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4 shrink-0 text-inkmuted transition-transform group-open:rotate-180">
              <path d="m7 10 5 5 5-5" />
            </svg>
          </summary>

          <div className="border-t border-line bg-paper/50 p-4 sm:p-5">
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
        </details>
      </div>
    </section>
  );
}
