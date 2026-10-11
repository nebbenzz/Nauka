import { Link } from "react-router-dom";
import { programmeLicenceInformatiqueLaRochelle, type ProgrammeCurriculum } from "../data/programmeLicenceInformatiqueLaRochelle";
import { construireSemestresProgramme, type EtatCoursProgramme, type NotionSuivieProgramme } from "../lib/programmeCoverage";

interface Props {
  niveauFormation: number;
  notions: NotionSuivieProgramme[];
  programme?: ProgrammeCurriculum;
}

const etatsCours: Record<EtatCoursProgramme, { libelle: string; classes: string }> = {
  maitrise: { libelle: "Maîtrisé", classes: "bg-sage/15 text-sage" },
  "en-cours": { libelle: "En cours", classes: "bg-highlight/30 text-ink" },
  "a-decouvrir": { libelle: "À découvrir", classes: "bg-navy/10 text-navy" },
  "non-disponible": { libelle: "Pas encore dans Nauka", classes: "bg-paper text-inkmuted" },
};

export default function ProgrammeLicenceInformatique({
  niveauFormation,
  notions,
  programme = programmeLicenceInformatiqueLaRochelle,
}: Props) {
  const semestres = construireSemestresProgramme(programme, niveauFormation, notions);
  const universite = programme.nom.slice(programme.nom.lastIndexOf(", ") + 2);

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
        <p className="text-sm font-semibold text-ink">
          {programme.parcours} · {universite}
        </p>
        <a
          href={programme.source}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold text-navy underline underline-offset-4"
        >
          Programme officiel
        </a>
      </div>
      <p className="py-3 text-xs leading-5 text-inkmuted">
        Une EC sans notion associée signale un contenu absent de Nauka, pas une matière non maîtrisée. Les choix individuels ne sont pas enregistrés dans ton profil.
      </p>

      <div className="divide-y divide-line border-y border-line">
        {semestres.map((semestre) => {
          const totalCours = semestre.unites.reduce((total, unite) => total + unite.cours.length, 0);
          return (
            <details key={semestre.numero}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 marker:hidden">
                <span className="flex min-w-0 items-baseline gap-3">
                  <span className="font-display text-lg font-bold text-ink">Semestre {semestre.numero}</span>
                  <span className="text-xs text-inkmuted">L{Math.ceil(semestre.numero / 2)}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-inkmuted">{totalCours} EC proposées</span>
              </summary>

              <div className="border-t border-line">
                {semestre.unites.map((unite) => (
                  <details key={unite.nom} className="border-b border-line/70 last:border-0">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-2 py-3 marker:hidden">
                      <span className="min-w-0 text-sm font-semibold text-ink">{unite.nom}</span>
                      <span className="shrink-0 text-right text-[11px] text-inkmuted">
                        {unite.nombreChoix ? `${unite.nombreChoix} au choix` : unite.statut}
                      </span>
                    </summary>
                    <ul className="divide-y divide-line/60 px-2">
                      {unite.cours.map((cours) => {
                        const etat = etatsCours[cours.etat];
                        const notionsUniques = Array.from(
                          new Map(cours.notionsAssociees.map((notion) => [`${notion.matiere_nom}|${notion.nom}`, notion])).values(),
                        );
                        return (
                          <li key={cours.nom} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                            <div className="min-w-0">
                              <p className="text-sm text-ink">{cours.nom}</p>
                              {notionsUniques.length > 0 ? (
                                <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                                  {notionsUniques.map((notion) => (
                                    <li key={`${notion.matiere_nom}|${notion.nom}`}>
                                      <Link
                                        to={`/questionnaires?recherche=${encodeURIComponent(notion.nom)}`}
                                        className="text-xs text-navy underline underline-offset-2"
                                      >
                                        Notion Nauka : {notion.nom}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-1 text-xs text-inkmuted">Aucune notion de cet EC n’est encore reliée à un questionnaire Nauka.</p>
                              )}
                            </div>
                            <span className={`w-fit shrink-0 px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${etat.classes}`}>
                              {etat.libelle}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}