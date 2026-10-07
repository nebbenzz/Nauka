export interface Formation {
  label: string;
  domaine: string;
  type: "Licence" | "Master" | "BTS" | "BUT" | "Prépa";
  niveauOrdinal: number; // 1=L1, 2=L2/BTS/Prépa, 3=L3/BUT, 4=M1, 5=M2
}

const domainesUniversitaires = [
  "Droit",
  "Informatique",
  "Mathématiques",
  "Physique",
  "Chimie",
  "Biologie",
  "Histoire",
  "Géographie",
  "Économie",
  "Gestion",
  "Psychologie",
  "Sciences politiques",
  "Lettres modernes",
  "Langues étrangères appliquées",
  "Sociologie",
  "STAPS",
];

const niveauxUniversitaires = ["L1", "L2", "L3", "M1", "M2"] as const;
const ordinalParNiveau: Record<string, number> = { L1: 1, L2: 2, L3: 3, M1: 4, M2: 5 };

const licencesEtMasters: Formation[] = domainesUniversitaires.flatMap((domaine) =>
  niveauxUniversitaires.map((niveau) => ({
    label: `${niveau} ${domaine}`,
    domaine,
    type: niveau.startsWith("L") ? ("Licence" as const) : ("Master" as const),
    niveauOrdinal: ordinalParNiveau[niveau],
  }))
);

const bts: Formation[] = [
  { label: "BTS Informatique de gestion (SIO)", domaine: "Informatique", type: "BTS", niveauOrdinal: 2 },
  { label: "BTS Comptabilité et Gestion", domaine: "Gestion", type: "BTS", niveauOrdinal: 2 },
  { label: "BTS Management Commercial Opérationnel", domaine: "Gestion", type: "BTS", niveauOrdinal: 2 },
  { label: "BTS Négociation et Digitalisation de la Relation Client", domaine: "Gestion", type: "BTS", niveauOrdinal: 2 },
  { label: "BTS Assistant de Gestion PME-PMI", domaine: "Gestion", type: "BTS", niveauOrdinal: 2 },
  { label: "BTS Biotechnologies", domaine: "Biologie", type: "BTS", niveauOrdinal: 2 },
  { label: "BTS Analyses de Biologie Médicale", domaine: "Biologie", type: "BTS", niveauOrdinal: 2 },
  { label: "BTS Communication", domaine: "Communication", type: "BTS", niveauOrdinal: 2 },
];

const but: Formation[] = [
  { label: "BUT Informatique", domaine: "Informatique", type: "BUT", niveauOrdinal: 3 },
  { label: "BUT Réseaux et Télécommunications", domaine: "Informatique", type: "BUT", niveauOrdinal: 3 },
  { label: "BUT Génie Biologique", domaine: "Biologie", type: "BUT", niveauOrdinal: 3 },
  { label: "BUT Techniques de Commercialisation", domaine: "Gestion", type: "BUT", niveauOrdinal: 3 },
  { label: "BUT Gestion des Entreprises et des Administrations", domaine: "Gestion", type: "BUT", niveauOrdinal: 3 },
  { label: "BUT Carrières Juridiques", domaine: "Droit", type: "BUT", niveauOrdinal: 3 },
  { label: "BUT Génie Chimique - Génie des Procédés", domaine: "Chimie", type: "BUT", niveauOrdinal: 3 },
  { label: "BUT Mesures Physiques", domaine: "Physique", type: "BUT", niveauOrdinal: 3 },
  { label: "BUT Information-Communication", domaine: "Communication", type: "BUT", niveauOrdinal: 3 },
];

const prepas: Formation[] = [
  { label: "CPGE MPSI (Mathématiques, Physique, Sciences de l'Ingénieur)", domaine: "Mathématiques", type: "Prépa", niveauOrdinal: 2 },
  { label: "CPGE PCSI (Physique, Chimie, Sciences de l'Ingénieur)", domaine: "Physique", type: "Prépa", niveauOrdinal: 2 },
  { label: "CPGE BCPST (Biologie, Chimie, Physique, Sciences de la Terre)", domaine: "Biologie", type: "Prépa", niveauOrdinal: 2 },
  { label: "CPGE ECG (Économique et Commerciale)", domaine: "Économie", type: "Prépa", niveauOrdinal: 2 },
  { label: "CPGE Lettres (Hypokhâgne/Khâgne)", domaine: "Lettres modernes", type: "Prépa", niveauOrdinal: 2 },
];

export const FORMATIONS: Formation[] = [
  ...licencesEtMasters,
  ...bts,
  ...but,
  ...prepas,
];