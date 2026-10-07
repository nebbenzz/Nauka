import { useState } from "react";

interface Props {
  reduit: boolean;
  onToggle: (v: boolean) => void;
  onNaviguer: (cible: string, terme: string) => void;
  matieresClassiques: string[];
  matieresAvancees: string[];
  estPro?: boolean;
}

export default function SidebarQuestionnaires({ reduit, onToggle, onNaviguer, matieresClassiques, matieresAvancees, estPro }: Props) {
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
        className="fixed left-0 top-20 z-10 m-4 rounded-md border border-navy/20 bg-paper p-2 text-navy shadow-sm transition-colors hover:border-navy hover:bg-white"
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

      <nav className="mt-5 space-y-5">
        <div>
          <p className="px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-inkmuted">Espace personnel</p>
          <div className="mt-2 space-y-1">
            {estPro && (
              <button
                type="button"
                onClick={() => {
                  onNaviguer("mes-questionnaires", "");
                }}
                className="flex w-full items-center gap-2 rounded-lg border border-highlight/60 bg-highlight/20 px-3 py-2.5 text-left text-sm font-semibold text-ink transition-colors hover:bg-highlight/35"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Mes questionnaires
              </button>
            )}
          </div>
        </div>
      </nav>

      <nav className="mt-5 space-y-5">
        <div className="border-t border-line pt-5">
          <p className="px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-inkmuted">Questionnaires</p>
          <div className="mt-2 space-y-1">
            <button type="button" onClick={() => onNaviguer("pour-vous", "")} className="flex w-full items-center gap-3 border-l-2 border-highlight bg-white px-3 py-2.5 text-left text-sm font-bold text-ink transition-colors hover:border-navy hover:bg-navy/5">
              Pour vous
            </button>
            <button type="button" onClick={() => toggleMatiere("classiques-decouvrir")} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-ink transition-colors hover:bg-white hover:text-navy">
              <span className="flex items-center gap-3"><span className="flex h-6 w-6 items-center justify-center border border-line text-xs text-inkmuted">+</span>Découvrez aussi</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={ouvertes["classiques-decouvrir"] ? "h-4 w-4 rotate-90 transition-transform" : "h-4 w-4 transition-transform"}><polyline points="9 18 15 12 9 6" /></svg>
            </button>
            {ouvertes["classiques-decouvrir"] && <div className="ml-6 space-y-1 border-l border-line pl-3">
              {matieresClassiques.map((matiere) => <button key={`classique-${matiere}`} type="button" onClick={() => onNaviguer(`matiere-${matiere}`, matiere)} className="block w-full rounded px-2 py-1.5 text-left text-xs text-inkmuted hover:bg-white hover:text-navy">{matiere}</button>)}
            </div>}
          </div>
        </div>

        <div className="border-t border-line pt-5">
          <p className="px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-inkmuted">Questionnaires avancés</p>
          <div className="mt-2 space-y-1">
            <button type="button" onClick={() => onNaviguer("avances-pour-vous", "")} className="flex w-full items-center gap-3 border-l-2 border-sage bg-white px-3 py-2.5 text-left text-sm font-bold text-ink transition-colors hover:border-navy hover:bg-navy/5">
              Pour vous
            </button>
            <button type="button" onClick={() => toggleMatiere("avances-decouvrir")} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-ink transition-colors hover:bg-white hover:text-navy">
              <span className="flex items-center gap-3"><span className="flex h-6 w-6 items-center justify-center border border-line text-xs text-inkmuted">+</span>Découvrez aussi</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={ouvertes["avances-decouvrir"] ? "h-4 w-4 rotate-90 transition-transform" : "h-4 w-4 transition-transform"}><polyline points="9 18 15 12 9 6" /></svg>
            </button>
            {ouvertes["avances-decouvrir"] && <div className="ml-6 space-y-1 border-l border-line pl-3">
              {matieresAvancees.map((matiere) => <button key={`avance-${matiere}`} type="button" onClick={() => onNaviguer(`avance-matiere-${matiere}`, matiere)} className="block w-full rounded px-2 py-1.5 text-left text-xs text-inkmuted hover:bg-white hover:text-navy">{matiere}</button>)}
            </div>}
          </div>
        </div>
      </nav>
    </aside>
  );
}