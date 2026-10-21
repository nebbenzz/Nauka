import { useState } from "react";
import type { GroupeCatalogue } from "../lib/catalogUtils";

interface Props {
  reduit: boolean;
  onToggle: (v: boolean) => void;
  onNaviguer: (cible: string, terme: string, ciblesFormation?: Array<string | null>, formationCible?: string) => void;
  groupesClassiques: GroupeCatalogue<{ id: string }>[];
  groupesAvances: GroupeCatalogue<{ id: string }>[];
  estPro?: boolean;
}

interface ListeCatalogueProps {
  groupes: GroupeCatalogue<{ id: string }>[];
  prefixe: "matiere" | "avance-matiere";
  onNaviguer: Props["onNaviguer"];
}

function ListeCatalogue({ groupes, prefixe, onNaviguer }: ListeCatalogueProps) {
  const survolSousMenu = prefixe === "avance-matiere"
    ? "hover:bg-sage/20 hover:text-ink"
    : "hover:bg-highlight/10 hover:text-navy";
  const survolType = prefixe === "avance-matiere"
    ? "hover:border-sage/60 hover:bg-sage/5"
    : "hover:border-highlight/60 hover:bg-highlight/5";
  const couleurPoint = prefixe === "avance-matiere" ? "bg-sage/80" : "bg-highlight/70";

  return (
    <div className="ml-2 space-y-1 border-l border-line pl-2">
      {groupes.map((groupe) => {
        const nombreQuiz = groupe.formations.reduce(
          (total, formation) => total + formation.quizs.length + formation.domaines.reduce((sousTotal, domaine) => sousTotal + domaine.quizs.length, 0),
          0,
        );

        return (
          <details key={groupe.type} className="group/type">
            <summary className={`flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 rounded-md border border-line/70 bg-white/60 px-2.5 py-2 text-xs font-bold text-ink marker:hidden transition-colors ${survolType}`}>
              <span>{groupe.type}</span>
              <span className="flex items-center gap-2 rounded-full bg-paper px-1.5 py-0.5 text-[10px] font-medium text-inkmuted">
                {nombreQuiz}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 transition-transform group-open/type:rotate-90" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
              </span>
            </summary>
            <div className="ml-2 space-y-1 border-l border-line pl-2">
              {groupe.formations.map((formation) => {
                const nombreQuizFormation = formation.quizs.length + formation.domaines.reduce((total, domaine) => total + domaine.quizs.length, 0);
                const ouvrirTouteLaFormation = groupe.type === "BTS" || groupe.type === "BUT";
                return (
                  formation.domaines.length === 0 || ouvrirTouteLaFormation ? (
                    <button
                      key={formation.id}
                      type="button"
                      onClick={() => onNaviguer(
                        `${prefixe}-${formation.id}`,
                        formation.nom,
                        formation.ciblesFormation,
                        ouvrirTouteLaFormation ? formation.nom : undefined,
                      )}
                      className={`flex min-h-9 w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-[11px] font-semibold text-inkmuted transition-colors ${survolSousMenu}`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${couleurPoint}`} aria-hidden="true" />
                        <span>{formation.nom}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-paper px-1.5 py-0.5 text-[10px]">{nombreQuizFormation}</span>
                    </button>
                  ) : (
                    <details key={formation.id} className="group/formation">
                      <summary className={`flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-[11px] font-semibold text-inkmuted marker:hidden transition-colors ${survolSousMenu}`}>
                        <span className="flex min-w-0 items-center gap-2">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${couleurPoint}`} aria-hidden="true" />
                          <span>{formation.nom}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-paper px-1.5 py-0.5 text-[10px]">
                          {nombreQuizFormation}
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 transition-transform group-open/formation:rotate-90" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>
                        </span>
                      </summary>
                      <div className="ml-2 space-y-1 border-l border-line pl-2">
                        {formation.domaines.map((domaine) => (
                          <button
                            key={domaine.id}
                            type="button"
                            onClick={() => onNaviguer(`${prefixe}-${domaine.id}`, domaine.nom, [domaine.formationCible])}
                            className={`flex min-h-8 w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[11px] text-inkmuted transition-colors ${survolSousMenu}`}
                          >
                            <span>{domaine.nom}</span>
                            <span className="shrink-0 text-[10px] text-inkmuted/80">{domaine.quizs.length}</span>
                          </button>
                        ))}
                      </div>
                    </details>
                  )
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}

export default function SidebarQuestionnaires({ reduit, onToggle, onNaviguer, groupesClassiques, groupesAvances, estPro }: Props) {
  const [ouvertes, setOuvertes] = useState<Record<string, boolean>>({});

  function toggleMatiere(cle: string) {
    setOuvertes((prev) => ({ ...prev, [cle]: !prev[cle] }));
  }

  if (reduit) {
    return (
      <button
        type="button"
        onClick={() => onToggle(false)}
        aria-label="Ouvrir le menu"
        className="fixed left-0 top-20 z-10 m-4 inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-navy/20 bg-paper p-2 text-navy shadow-sm transition-colors hover:border-navy hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>
    );
  }

  return (
    <aside className="fixed bottom-0 left-0 top-20 z-10 w-64 overflow-y-auto border-r border-navy/10 bg-paper px-3 py-4 shadow-[8px_0_24px_rgba(29,53,87,0.04)]">
      <div className="flex items-center justify-between border-b border-line px-2 pb-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-navy">Bibliothèque</p>
        </div>
        <button type="button" onClick={() => onToggle(true)} aria-label="Réduire le menu" className="text-inkmuted transition-colors hover:text-navy">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      {estPro && (
        <nav className="mt-5 space-y-5">
          <div>
            <p className="px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-inkmuted">Espace personnel</p>
            <div className="mt-2 space-y-1">
              <button
                type="button"
                onClick={() => {
                  onNaviguer("mes-questionnaires", "");
                }}
                className="flex min-h-10 w-full items-center gap-2 rounded-md border border-highlight/60 bg-highlight/20 px-3 py-2.5 text-left text-sm font-semibold text-ink transition-colors hover:bg-highlight/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Mes questionnaires
              </button>
            </div>
          </div>
        </nav>
      )}

      <nav className="mt-5 space-y-5">
        <div className="border-t border-line pt-5">
          <p className="px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-inkmuted">Questionnaires</p>
          <div className="mt-2 space-y-2">
            <button type="button" onClick={() => onNaviguer("pour-vous", "")} className="flex min-h-10 w-full items-center gap-3 rounded-md border border-highlight/30 border-l-2 border-l-highlight bg-white px-3 py-2.5 text-left text-sm font-bold text-ink transition-colors hover:border-highlight/60 hover:bg-highlight/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2">
              Pour vous
            </button>
            <button type="button" aria-expanded={ouvertes["classiques-decouvrir"] ?? false} aria-controls="catalogue-classiques-sidebar" onClick={() => toggleMatiere("classiques-decouvrir")} className="flex min-h-10 w-full items-center justify-between gap-3 rounded-md border border-highlight/30 bg-highlight/10 px-3 py-2 text-left text-sm font-semibold text-ink transition-colors hover:border-highlight/60 hover:bg-highlight/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2">
              <span className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-navy" aria-hidden="true">{ouvertes["classiques-decouvrir"] ? "−" : "+"}</span>
                Découvrez aussi
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={ouvertes["classiques-decouvrir"] ? "h-4 w-4 rotate-90 transition-transform" : "h-4 w-4 transition-transform"}><polyline points="9 18 15 12 9 6" /></svg>
            </button>
            <div id="catalogue-classiques-sidebar" hidden={!ouvertes["classiques-decouvrir"]}>
              <ListeCatalogue groupes={groupesClassiques} prefixe="matiere" onNaviguer={onNaviguer} />
            </div>
          </div>
        </div>

        <div className="border-t border-line pt-5">
          <p className="px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-inkmuted">Questionnaires avancés</p>
          <div className="mt-2 space-y-2">
            <button type="button" onClick={() => onNaviguer("avances-pour-vous", "")} className="flex min-h-10 w-full items-center gap-3 rounded-md border border-sage/35 border-l-2 border-l-sage bg-white px-3 py-2.5 text-left text-sm font-bold text-ink transition-colors hover:border-sage/60 hover:bg-sage/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2">
              Pour vous
            </button>
            <button type="button" aria-expanded={ouvertes["avances-decouvrir"] ?? false} aria-controls="catalogue-avances-sidebar" onClick={() => toggleMatiere("avances-decouvrir")} className="flex min-h-10 w-full items-center justify-between gap-3 rounded-md border border-sage/35 bg-sage/10 px-3 py-2 text-left text-sm font-semibold text-ink transition-colors hover:border-sage/60 hover:bg-sage/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2">
              <span className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-sage" aria-hidden="true">{ouvertes["avances-decouvrir"] ? "−" : "+"}</span>
                Découvrez aussi
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={ouvertes["avances-decouvrir"] ? "h-4 w-4 rotate-90 transition-transform" : "h-4 w-4 transition-transform"}><polyline points="9 18 15 12 9 6" /></svg>
            </button>
            <div id="catalogue-avances-sidebar" hidden={!ouvertes["avances-decouvrir"]}>
              <ListeCatalogue groupes={groupesAvances} prefixe="avance-matiere" onNaviguer={onNaviguer} />
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );
}