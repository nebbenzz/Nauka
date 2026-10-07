import type { ProgrammeCurriculum, SemestreProgramme } from "../data/programmeLicenceInformatiqueLaRochelle";

export type EtatNotionProgramme = "a-decouvrir" | "en-cours" | "maitrise";
export type EtatCoursProgramme = EtatNotionProgramme | "non-disponible";

export interface NotionSuivieProgramme {
  nom: string;
  matiere_nom: string;
  etat: EtatNotionProgramme;
}

export interface CoursProgrammeCouvert {
  nom: string;
  notionsAssociees: NotionSuivieProgramme[];
  etat: EtatCoursProgramme;
}

export interface UniteProgrammeCouverte {
  nom: string;
  statut: "obligatoire" | "à choix";
  nombreChoix?: number;
  cours: CoursProgrammeCouvert[];
}

export interface SemestreProgrammeCouvert extends Omit<SemestreProgramme, "unites"> {
  unites: UniteProgrammeCouverte[];
}

function normaliserTexte(valeur: string | null | undefined): string {
  return (valeur ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function estProgrammeLicenceInformatiqueLaRochelle(
  formation: string | null | undefined,
  etablissement: string | null | undefined,
): boolean {
  const formationNormalisee = normaliserTexte(formation);
  const etablissementNormalise = normaliserTexte(etablissement);
  return /^l[1-3] informatique$/.test(formationNormalisee) && etablissementNormalise.includes("rochelle");
}

export function construireSemestresProgramme(
  programme: ProgrammeCurriculum,
  niveauFormation: number,
  catalogue: NotionSuivieProgramme[],
): SemestreProgrammeCouvert[] {
  const dernierSemestre = Math.min(6, Math.max(0, niveauFormation * 2));
  return programme.semestres
    .filter((semestre) => semestre.numero <= dernierSemestre)
    .map((semestre) => ({
      ...semestre,
      unites: semestre.unites.map((unite) => ({
        ...unite,
        cours: unite.cours.map((cours) => {
          const notionsAssociees = cours.notions.flatMap((reference) =>
            catalogue.filter((notion) => notion.matiere_nom === reference.matiere && notion.nom === reference.nom),
          );
          let etat: EtatCoursProgramme = "non-disponible";
          if (notionsAssociees.length > 0) {
            etat = notionsAssociees.every((notion) => notion.etat === "maitrise")
              ? "maitrise"
              : notionsAssociees.some((notion) => notion.etat !== "a-decouvrir")
                ? "en-cours"
                : "a-decouvrir";
          }
          return { nom: cours.nom, notionsAssociees, etat };
        }),
      })),
    }));
}