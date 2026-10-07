import { useMemo, useState } from "react";

export interface EvenementRevision {
  resultat_id: string;
  quiz_id: string;
  quiz_titre: string;
  matiere_nom: string;
  score: number;
  score_max: number;
  date: string;
}

interface Props {
  dateExamen: string | null;
  evenements: EvenementRevision[];
  sessionsParSemaine: number;
  dureeSessionMinutes: number;
  sessionsCetteSemaine: number;
}

const joursSemaine = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const moisFrancais = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function cleDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function debutSemaine(date: Date) {
  const debut = new Date(date);
  debut.setHours(0, 0, 0, 0);
  debut.setDate(debut.getDate() - ((debut.getDay() + 6) % 7));
  return debut;
}

function dateLocale(date: Date) {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function RevisionCalendar({ dateExamen, evenements, sessionsParSemaine, dureeSessionMinutes, sessionsCetteSemaine }: Props) {
  const aujourdHui = new Date();
  const [moisAffiche, setMoisAffiche] = useState(new Date(aujourdHui.getFullYear(), aujourdHui.getMonth(), 1));
  const [jourSelectionne, setJourSelectionne] = useState(cleDate(aujourdHui));

  const evenementsParJour = useMemo(() => {
    return evenements.reduce<Record<string, EvenementRevision[]>>((acc, evenement) => {
      const date = new Date(evenement.date);
      if (Number.isNaN(date.getTime())) return acc;
      const cle = cleDate(date);
      acc[cle] = acc[cle] || [];
      acc[cle].push(evenement);
      return acc;
    }, {});
  }, [evenements]);

  const cases = useMemo(() => {
    const premierJour = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth(), 1);
    const decalage = (premierJour.getDay() + 6) % 7;
    const dernierJour = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() + 1, 0).getDate();
    const totalCases = Math.ceil((decalage + dernierJour) / 7) * 7;

    return Array.from({ length: totalCases }, (_, index) => {
      const jour = index - decalage + 1;
      return jour > 0 && jour <= dernierJour
        ? new Date(moisAffiche.getFullYear(), moisAffiche.getMonth(), jour)
        : null;
    });
  }, [moisAffiche]);

  const joursPlanifies = useMemo(() => {
    const planifies = new Set<string>();
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    const jourExamen = dateExamen ? new Date(`${dateExamen}T00:00:00`) : null;
    if (jourExamen && jourExamen < aujourdhui) return planifies;

    const premierJourMois = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth(), 1);
    const dernierJourMois = new Date(moisAffiche.getFullYear(), moisAffiche.getMonth() + 1, 0);
    const semaineActuelle = cleDate(debutSemaine(aujourdhui));
    const joursCompletes = new Set(Object.keys(evenementsParJour));
    const semaine = debutSemaine(premierJourMois);

    while (semaine <= dernierJourMois) {
      const estSemaineActuelle = cleDate(semaine) === semaineActuelle;
      const objectifSemaine = estSemaineActuelle
        ? Math.max(0, sessionsParSemaine - sessionsCetteSemaine)
        : sessionsParSemaine;
      const joursDisponibles: Date[] = [];

      for (let decalage = 0; decalage < 7; decalage += 1) {
        const jour = new Date(semaine);
        jour.setDate(jour.getDate() + decalage);
        const cle = cleDate(jour);
        if (jour < aujourdhui || (jourExamen && jour >= jourExamen) || joursCompletes.has(cle)) continue;
        joursDisponibles.push(jour);
      }

      const nombrePlanifie = Math.min(objectifSemaine, joursDisponibles.length);
      for (let index = 0; index < nombrePlanifie; index += 1) {
        const indexJour = Math.floor(((index + 0.5) * joursDisponibles.length) / nombrePlanifie);
        planifies.add(cleDate(joursDisponibles[indexJour]));
      }

      semaine.setDate(semaine.getDate() + 7);
    }

    return planifies;
  }, [dateExamen, evenementsParJour, moisAffiche, sessionsCetteSemaine, sessionsParSemaine]);

  const evenementsSelectionnes = evenementsParJour[jourSelectionne] || [];
  const examenDansLeMois = dateExamen?.startsWith(`${moisAffiche.getFullYear()}-${String(moisAffiche.getMonth() + 1).padStart(2, "0")}`);
  const sessionPlanifieeSelectionnee = joursPlanifies.has(jourSelectionne);

  function changerMois(delta: number) {
    setMoisAffiche((mois) => new Date(mois.getFullYear(), mois.getMonth() + delta, 1));
  }

  return (
    <section className="rounded-[1.5rem] border border-line bg-white p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-inkmuted">Agenda de révision</p>
          <h2 className="mt-2 font-display text-2xl font-extrabold">Ton calendrier</h2>
          <p className="mt-1 text-sm text-inkmuted">Retrouve tes sessions, tes prochaines dates conseillées et ton examen.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => changerMois(-1)} aria-label="Mois précédent" className="rounded-full border border-line p-2 text-inkmuted transition-colors hover:border-navy hover:text-navy">←</button>
          <p className="min-w-32 text-center font-display text-sm font-bold capitalize">{moisFrancais[moisAffiche.getMonth()]} {moisAffiche.getFullYear()}</p>
          <button type="button" onClick={() => changerMois(1)} aria-label="Mois suivant" className="rounded-full border border-line p-2 text-inkmuted transition-colors hover:border-navy hover:text-navy">→</button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-inkmuted sm:gap-2">
        {joursSemaine.map((jour) => <span key={jour}>{jour}</span>)}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">
        {cases.map((date, index) => {
          if (!date) return <div key={`vide-${index}`} className="min-h-16 rounded-lg bg-paper/50 sm:min-h-20" />;
          const cle = cleDate(date);
          const sessions = evenementsParJour[cle] || [];
          const estAujourdHui = cle === cleDate(aujourdHui);
          const estExamen = dateExamen === cle;
          const estSelectionne = jourSelectionne === cle;
          const estPlanifie = joursPlanifies.has(cle);
          return (
            <button
              key={cle}
              type="button"
              onClick={() => setJourSelectionne(cle)}
              aria-label={`${dateLocale(date)}${estExamen ? ", examen" : ""}${sessions.length > 0 ? `, ${sessions.length} session(s) effectuée(s)` : ""}${estPlanifie ? ", session conseillée" : ""}`}
              className={estSelectionne ? "relative min-h-16 rounded-lg border-2 border-navy bg-paper p-2 text-left transition-colors sm:min-h-20" : "relative min-h-16 rounded-lg border border-line bg-white p-2 text-left transition-colors hover:border-navy/50 sm:min-h-20"}
            >
              <span className={estAujourdHui ? "flex h-6 w-6 items-center justify-center rounded-full bg-navy text-xs font-bold text-paper" : "text-xs font-bold text-ink"}>{date.getDate()}</span>
              {estExamen && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-highlight" title="Date d'examen" />}
              {sessions.length > 0 && <span className="mt-2 block h-1.5 w-8 max-w-full rounded-full bg-sage" title={`${sessions.length} session${sessions.length > 1 ? "s" : ""}`} />}
              {estPlanifie && <span className="absolute bottom-2 right-2 h-2 w-2 rounded-full bg-navy" title="Session conseillée" />}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-4 border-t border-line pt-4 text-xs text-inkmuted">
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-sage" /> Questionnaire effectué</span>
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-navy" /> Session conseillée · {dureeSessionMinutes} min</span>
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-highlight" /> Examen</span>
      </div>

      <div className="mt-5 rounded-xl bg-paper p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display font-bold">{dateLocale(new Date(`${jourSelectionne}T12:00:00`))}</p>
          {examenDansLeMois && dateExamen === jourSelectionne && <span className="rounded-full bg-highlight/50 px-3 py-1 text-xs font-bold text-ink">Examen</span>}
        </div>
        {sessionPlanifieeSelectionnee && (
          <div className="mt-3 border-l-2 border-navy pl-3">
            <p className="text-sm font-semibold text-ink">Séance conseillée · {dureeSessionMinutes} minutes</p>
            <p className="mt-1 text-xs text-inkmuted">Une courte session suffit. Tu peux la déplacer ou adapter ton rythme depuis ton profil.</p>
          </div>
        )}
        {evenementsSelectionnes.length === 0 ? (
          <p className="mt-3 text-sm text-inkmuted">Aucune session enregistrée ce jour-là.</p>
        ) : (
          <div className="mt-3 divide-y divide-line">
            {evenementsSelectionnes.map((evenement) => (
              <div key={evenement.resultat_id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-highlight/40 text-xs font-extrabold text-ink">{Math.round((evenement.score / evenement.score_max) * 100)}%</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{evenement.quiz_titre}</p>
                  <p className="mt-0.5 text-xs text-inkmuted">{evenement.matiere_nom} · {evenement.score}/{evenement.score_max}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
