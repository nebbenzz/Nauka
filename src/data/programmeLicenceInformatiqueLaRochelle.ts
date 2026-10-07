export interface NotionProgramme {
  matiere: string;
  nom: string;
}

export interface CoursProgramme {
  nom: string;
  notions: NotionProgramme[];
}

export interface UniteProgramme {
  nom: string;
  statut: "obligatoire" | "à choix";
  nombreChoix?: number;
  cours: CoursProgramme[];
}

export interface SemestreProgramme {
  numero: number;
  unites: UniteProgramme[];
}

export interface ProgrammeCurriculum {
  nom: string;
  parcours: string;
  source: string;
  semestres: SemestreProgramme[];
}

const matiereInformatique = "Informatique";
const notions = (...noms: string[]) => noms.map((nom) => ({ matiere: matiereInformatique, nom }));
const cours = (nom: string, notionsAssociees: NotionProgramme[] = []): CoursProgramme => ({ nom, notions: notionsAssociees });

const choixDecouvertes = [
  cours("Découverte Sciences de la vie"),
  cours("Découverte Sciences pour la santé"),
  cours("Découverte Sciences de la Terre"),
  cours("Découverte Génie civil"),
  cours("Découverte Physique, Chimie, Matériaux"),
  cours("Découverte Informatique", notions("Architecture des ordinateurs", "Architecture des systèmes numériques - initiation", "Web", "Programmation web - initiation", "Sécurité informatique")),
  cours("Découverte mathématiques"),
];

const choixReper = [
  cours("RePer : Permaculture en milieu urbain"),
  cours("RePer RAN Mathématiques niveau 1"),
  cours("RePer RAN Mathématiques niveau 2"),
  cours("RePer RAN Mathématiques niveau 3"),
  cours("RePer RAN Physique"),
  cours("RePer RAN Chimie"),
  cours("RePer RAN Sciences de la Vie"),
  cours("RePer : Conduite de projet"),
];

export const programmeLicenceInformatiqueLaRochelle: ProgrammeCurriculum = {
  nom: "Licence Informatique, La Rochelle Université",
  parcours: "Parcours général",
  source: "https://formations.univ-larochelle.fr/licence-informatique",
  semestres: [
    {
      numero: 1,
      unites: [
        { nom: "UE_A - Découvertes - Modèle A", statut: "à choix", nombreChoix: 3, cours: choixDecouvertes },
        { nom: "UE_B - Découvertes - Modèle B", statut: "à choix", nombreChoix: 2, cours: choixDecouvertes },
        { nom: "UE_B - RePer - Modèle B", statut: "à choix", nombreChoix: 1, cours: choixReper },
        { nom: "UE_C - Découvertes - Modèle C", statut: "à choix", nombreChoix: 1, cours: choixDecouvertes },
        { nom: "UE_C - RePer - Modèle C", statut: "à choix", nombreChoix: 2, cours: choixReper },
        {
          nom: "Unité fondamentale",
          statut: "obligatoire",
          cours: [
            cours("Mathématiques générales"),
            cours("Mathématiques pour les sciences naturelles"),
            cours("Mécanique 1"),
            cours("Mécanique 2"),
            cours("Introduction à la programmation", notions("Programmation", "Programmation impérative - initiation")),
            cours("Introduction aux systèmes informatiques", notions("Architecture des ordinateurs", "Architecture des systèmes numériques - initiation", "Systèmes d'exploitation", "Systèmes d'exploitation - initiation")),
            cours("Mathématiques 1"),
            cours("Mathématiques 2"),
            cours("Introduction à la physique newtonienne"),
            cours("Physique générale"),
            cours("Structure de la matière"),
            cours("Réactions chimiques"),
            cours("Sciences du vivant"),
            cours("Biochimie 1"),
            cours("Terre, univers, environnement"),
          ],
        },
        {
          nom: "Unités transversales",
          statut: "obligatoire",
          cours: [cours("Informatique d'usage"), cours("LV1 Anglais"), cours("Accompagnement à la réussite de mon projet 1")],
        },
      ],
    },
    {
      numero: 2,
      unites: [
        {
          nom: "Administrer des systèmes et réseaux - novice",
          statut: "obligatoire",
          cours: [
            cours("Architecture des ordinateurs - novice", notions("Architecture des ordinateurs")),
            cours("Systèmes d'exploitation - novice", notions("Systèmes d'exploitation", "Systèmes d'exploitation - initiation")),
          ],
        },
        {
          nom: "Développer un logiciel - novice",
          statut: "obligatoire",
          cours: [
            cours("Introduction à la programmation objet", notions("Programmation orientée objet", "Programmation objet - initiation")),
            cours("Programmation web - novice", notions("Web", "Développement web et logiciel", "Programmation web - initiation")),
          ],
        },
        {
          nom: "Informaticien citoyen et numérique responsable 1",
          statut: "obligatoire",
          cours: [cours("Principe de la démarche scientifique"), cours("Enjeux du numérique responsable", notions("Numérique responsable - Licence")), cours("Projets transversaux appliqués au développement durable")],
        },
        {
          nom: "Modéliser et construire un système - novice",
          statut: "obligatoire",
          cours: [
            cours("Algorithmique des tableaux", notions("Algorithmique", "Structures de données")),
            cours("Mathématiques pour l'IA - novice", notions("Mathématiques pour l'IA - initiation")),
            cours("Génie logiciel - modélisation - bases", notions("Développement web et logiciel", "Génie logiciel - initiation")),
          ],
        },
        { nom: "Unités transversales", statut: "obligatoire", cours: [cours("Préparation PIX"), cours("LV1 Anglais")] },
      ],
    },
    {
      numero: 3,
      unites: [
        {
          nom: "Administrer des systèmes et réseaux - intermédiaire 1",
          statut: "obligatoire",
          cours: [cours("Bases de données - novice", notions("Bases de données")), cours("Réseaux - novice", notions("Réseaux", "Réseaux - Licence"))],
        },
        {
          nom: "Développer un logiciel - intermédiaire 1",
          statut: "obligatoire",
          cours: [cours("Programmation impérative - novice", notions("Programmation", "Programmation impérative - intermédiaire")), cours("Programmation Web - intermédiaire", notions("Web", "Développement web et logiciel", "Programmation web - intermédiaire"))],
        },
        {
          nom: "Informaticien citoyen et numérique responsable 2",
          statut: "obligatoire",
          cours: [cours("Épistémologie"), cours("Numérique responsable - intermédiaire", notions("Numérique responsable - Licence")), cours("Projets transversaux appliqués au développement durable")],
        },
        {
          nom: "Modéliser et construire un système - intermédiaire 1",
          statut: "obligatoire",
          cours: [
            cours("Mathématiques pour l'IA - intermédiaire", notions("Mathématiques pour l'IA - intermédiaire")),
            cours("Programmation objet - avancé", notions("Programmation orientée objet", "Programmation objet - intermédiaire")),
            cours("Génie logiciel - modélisation - intermédiaire", notions("Développement web et logiciel", "Génie logiciel - intermédiaire")),
          ],
        },
        { nom: "Unités transversales", statut: "obligatoire", cours: [cours("LV1 Anglais"), cours("Accompagnement à la réussite de mon projet 2"), cours("Outils numériques")] },
      ],
    },
    {
      numero: 4,
      unites: [
        {
          nom: "Administrer des systèmes et réseaux - intermédiaire 2",
          statut: "obligatoire",
          cours: [cours("Réseaux - intermédiaire", notions("Réseaux", "Réseaux - Licence")), cours("Systèmes d'exploitation - avancé", notions("Systèmes d'exploitation", "Systèmes d'exploitation - intermédiaire"))],
        },
        {
          nom: "Développer un logiciel - intermédiaire 2",
          statut: "obligatoire",
          cours: [cours("Programmation impérative - avancé", notions("Programmation", "Programmation impérative - intermédiaire")), cours("Structures de données", notions("Structures de données", "Structures de données - intermédiaire", "Algorithmique"))],
        },
        {
          nom: "Informaticien citoyen et numérique responsable 3",
          statut: "à choix",
          nombreChoix: 1,
          cours: [cours("Étude de cas : contrôle et modélisation de processus en vue d'un développement plus durable", notions("Numérique responsable - Licence")), cours("Projets transversaux appliqués au développement durable", notions("Numérique responsable - Licence"))],
        },
        {
          nom: "Modéliser et construire un système - intermédiaire 2",
          statut: "obligatoire",
          cours: [cours("Génie logiciel - qualité logicielle et gestion de projet", notions("Développement web et logiciel", "Génie logiciel - intermédiaire")), cours("Analyse de données - utilisateur", notions("Analyse de données - initiation"))],
        },
        { nom: "Unités transversales", statut: "obligatoire", cours: [cours("LV1 Anglais")] },
        { nom: "Web responsable", statut: "à choix", nombreChoix: 1, cours: [cours("Éco-conception web", notions("Éco-conception web")), cours("Programmation web - avancé", notions("Web", "Développement web et logiciel", "Programmation web - intermédiaire"))] },
      ],
    },
    {
      numero: 5,
      unites: [
        {
          nom: "Administrer des systèmes et réseaux - compétent 1",
          statut: "obligatoire",
          cours: [cours("Architecture des ordinateurs - avancé", notions("Architecture des ordinateurs", "Architecture des ordinateurs avancée - Licence")), cours("Sécurité - bases", notions("Sécurité informatique", "Cybersécurité", "Sécurité des systèmes - Licence"))],
        },
        { nom: "Développement pour plateformes connectées 1", statut: "à choix", nombreChoix: 1, cours: [cours("Développement IOT et efficacité énergétique", notions("Objets connectés et efficacité énergétique"))] },
        {
          nom: "Développer un logiciel - compétent 1",
          statut: "obligatoire",
          cours: [cours("Programmation événementielle", notions("Programmation", "Programmation événementielle - Licence")), cours("Fonctions avancées des SGBD", notions("Bases de données", "Base de données avancée", "Bases de données avancées - Licence"))],
        },
        {
          nom: "Modéliser et construire un système - compétent 1",
          statut: "obligatoire",
          cours: [cours("Structures de données - avancé", notions("Structures de données", "Algorithmique")), cours("Analyse de données - développeur", notions("Analyse de données - avancée"))],
        },
        { nom: "Objets intelligents et autonomes 1", statut: "à choix", nombreChoix: 1, cours: [cours("Traitement du signal pour les objets intelligents")] },
        { nom: "Unités transversales", statut: "obligatoire", cours: [cours("LV1 Anglais"), cours("Accompagnement à la réussite de mon projet 3"), cours("Projet")] },
      ],
    },
    {
      numero: 6,
      unites: [
        {
          nom: "Administrer des systèmes et réseaux - compétent 2",
          statut: "obligatoire",
          cours: [cours("Systèmes répartis", notions("Systèmes répartis")), cours("Sécurité", notions("Sécurité informatique", "Cybersécurité", "Sécurité des systèmes - Licence"))],
        },
        { nom: "Développement pour plateformes connectées 2", statut: "à choix", nombreChoix: 1, cours: [cours("Développement sur smartphones", notions("Développement mobile"))] },
        {
          nom: "Développer un logiciel - compétent 2",
          statut: "obligatoire",
          cours: [cours("Programmation fonctionnelle", notions("Programmation fonctionnelle", "Programmation fonctionnelle - Licence")), cours("Modélisation de bases de données", notions("Bases de données", "Base de données avancée", "Bases de données avancées - Licence"))],
        },
        {
          nom: "Modéliser et construire un système - compétent 2",
          statut: "obligatoire",
          cours: [cours("Compilation", notions("Compilation")), cours("Algorithmes de graphes et complexité", notions("Algorithmique", "Structures de données", "Algorithmes de graphes et complexité"))],
        },
        { nom: "Objets intelligents et autonomes 2", statut: "à choix", nombreChoix: 1, cours: [cours("Vision embarquée et Intelligence artificielle", notions("Traitement du signal et vision"))] },
        { nom: "Stage / Expérience professionnelle", statut: "obligatoire", cours: [cours("Stage (6 semaines)")] },
        { nom: "Unités transversales", statut: "obligatoire", cours: [cours("LV1 Anglais")] },
      ],
    },
  ],
};