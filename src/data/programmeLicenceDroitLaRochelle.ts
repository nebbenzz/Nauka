import type { ProgrammeCurriculum } from "./programmeLicenceInformatiqueLaRochelle";

const notionsDroit = (...noms: string[]) => noms.map((nom) => ({ matiere: "Droit", nom }));
const cours = (nom: string, notions: ReturnType<typeof notionsDroit> = []) => ({ nom, notions });

export const programmeLicenceDroitLaRochelle: ProgrammeCurriculum = {
  nom: "Licence Droit, La Rochelle Université",
  parcours: "Parcours général",
  source: "https://formations.univ-larochelle.fr/licence-droit",
  semestres: [
    {
      numero: 1,
      unites: [
        {
          nom: "Acquérir les fondamentaux en droit privé/droit public",
          statut: "obligatoire",
          cours: [
            cours("Droit constitutionnel (théorie générale)", notionsDroit("Droit constitutionnel - théorie générale")),
            cours("Droit civil (les personnes)", notionsDroit("Droit civil - les personnes")),
          ],
        },
        {
          nom: "Découvrir les bases d'une culture économique et politique",
          statut: "obligatoire",
          cours: [cours("Science politique", notionsDroit("Science politique")), cours("Introduction à la gestion", notionsDroit("Introduction à la gestion"))],
        },
        {
          nom: "Découvrir les bases du droit",
          statut: "obligatoire",
          cours: [
            cours("Introduction générale au droit", notionsDroit("Introduction au droit")),
            cours("Introduction historique au droit", notionsDroit("Introduction historique au droit")),
          ],
        },
        {
          nom: "Unités transversales",
          statut: "obligatoire",
          cours: [
            cours("Argumentation et logique", notionsDroit("Argumentation et logique")),
            cours("Accompagnement à la réussite de mon projet 1"),
            cours("LV1 Anglais"),
            cours("LV1 Allemand"),
            cours("LV1 Espagnol"),
          ],
        },
      ],
    },
    {
      numero: 2,
      unites: [
        {
          nom: "Approcher l'organisation et le fonctionnement des institutions",
          statut: "obligatoire",
          cours: [
            cours("Histoire des institutions", notionsDroit("Histoire des institutions")),
            cours("Institutions administratives", notionsDroit("Institutions administratives")),
          ],
        },
        { nom: "Compléter les connaissances en droit civil", statut: "obligatoire", cours: [cours("Droit civil (la famille)", notionsDroit("Droit civil - la famille", "Droit des enfants"))] },
        {
          nom: "Compléter les connaissances en droit constitutionnel",
          statut: "obligatoire",
          cours: [cours("Droit constitutionnel (institutions de la Ve République)", notionsDroit("Droit constitutionnel - Ve République"))],
        },
        {
          nom: "Culture juridique 1",
          statut: "obligatoire",
          cours: [
            cours("Relations internationales", notionsDroit("Relations internationales")),
            cours("Introduction aux droits européens", notionsDroit("Droit européen - introduction")),
          ],
        },
        {
          nom: "Unités transversales",
          statut: "obligatoire",
          cours: [cours("Préparation PIX"), cours("LV1 Anglais"), cours("LV1 Allemand"), cours("LV1 Espagnol")],
        },
      ],
    },
    {
      numero: 3,
      unites: [
        { nom: "Compléter les connaissances en droit civil", statut: "obligatoire", cours: [cours("Droit des obligations 1", notionsDroit("Droit des obligations - formation"))] },
        {
          nom: "Compléter les connaissances en droit public et droit privé",
          statut: "obligatoire",
          cours: [
            cours("Droit pénal général", notionsDroit("Droit pénal général")),
            cours("Droit des affaires", notionsDroit("Droit des affaires")),
            cours("Finances publiques", notionsDroit("Finances publiques")),
          ],
        },
        {
          nom: "Culture juridique 2",
          statut: "obligatoire",
          cours: [
            cours("Histoire du droit pénal", notionsDroit("Histoire du droit pénal")),
            cours("Sociologie politique", notionsDroit("Sociologie politique")),
          ],
        },
        { nom: "Découvrir le droit administratif", statut: "obligatoire", cours: [cours("Droit administratif 1", notionsDroit("Droit administratif"))] },
        {
          nom: "Unités transversales",
          statut: "obligatoire",
          cours: [
            cours("LV1 Anglais"),
            cours("LV1 Allemand"),
            cours("LV1 Espagnol"),
            cours("Accompagnement à la réussite de mon projet 2"),
            cours("Outils numériques"),
          ],
        },
      ],
    },
    {
      numero: 4,
      unites: [
        { nom: "Compléter les connaissances en droit administratif", statut: "obligatoire", cours: [cours("Droit administratif 2", notionsDroit("Droit administratif"))] },
        {
          nom: "Compléter les connaissances en droit civil",
          statut: "obligatoire",
          cours: [cours("Droit des obligations (responsabilité)", notionsDroit("Responsabilité civile"))],
        },
        {
          nom: "Compléter les fondamentaux",
          statut: "obligatoire",
          cours: [
            cours("Procédure pénale", notionsDroit("Procédure pénale")),
            cours("Droit de l'Union européenne", notionsDroit("Droit de l'Union européenne")),
            cours("Droit fiscal général", notionsDroit("Droit fiscal général")),
          ],
        },
        {
          nom: "Culture juridique 3",
          statut: "obligatoire",
          cours: [
            cours("Histoire des idées politiques", notionsDroit("Histoire des idées politiques")),
            cours("Histoire de l'Europe", notionsDroit("Histoire de l'Europe")),
          ],
        },
        { nom: "Unités transversales", statut: "obligatoire", cours: [cours("LV1 Anglais"), cours("LV1 Allemand"), cours("LV1 Espagnol")] },
      ],
    },
    {
      numero: 5,
      unites: [
        {
          nom: "Approfondir des fondamentaux 1 (2 EC au choix)",
          statut: "obligatoire",
          nombreChoix: 2,
          cours: [
            cours("Droit du travail 1", notionsDroit("Droit du travail")),
            cours("Droit général des sociétés", notionsDroit("Droit des sociétés")),
            cours("Libertés fondamentales", notionsDroit("Libertés fondamentales")),
            cours("Régime des obligations", notionsDroit("Régime général des obligations")),
          ],
        },
        {
          nom: "Compléter les fondamentaux 2 (2 EC au choix)",
          statut: "obligatoire",
          nombreChoix: 2,
          cours: [
            cours("Droit du travail 1", notionsDroit("Droit du travail")),
            cours("Droit général des sociétés", notionsDroit("Droit des sociétés")),
            cours("Libertés fondamentales", notionsDroit("Libertés fondamentales")),
            cours("Régime des obligations", notionsDroit("Régime général des obligations")),
          ],
        },
        {
          nom: "Compléter les fondamentaux 3",
          statut: "obligatoire",
          cours: [
            cours("Droit judiciaire", notionsDroit("Droit judiciaire")),
            cours("Contentieux administratif", notionsDroit("Contentieux administratif")),
            cours("Droit international public 1", notionsDroit("Droit international public")),
          ],
        },
        {
          nom: "Culture juridique 4",
          statut: "obligatoire",
          cours: [
            cours("Droit privé des biens (langue d'enseignement : anglais)", notionsDroit("Droit privé des biens")),
            cours("Histoire de la propriété", notionsDroit("Histoire de la propriété")),
          ],
        },
        {
          nom: "Unités transversales",
          statut: "obligatoire",
          cours: [
            cours("LV1 Anglais"),
            cours("LV1 Allemand"),
            cours("LV1 Espagnol"),
            cours("Accompagnement à la réussite de mon projet 3"),
            cours("Philosophie du droit", notionsDroit("Philosophie du droit")),
            cours("Accompagnement méthodologique au rapport de stage"),
          ],
        },
      ],
    },
    {
      numero: 6,
      unites: [
        {
          nom: "Approfondir des fondamentaux 4 (2 EC au choix)",
          statut: "obligatoire",
          nombreChoix: 2,
          cours: [
            cours("Droit du travail 2", notionsDroit("Droit du travail")),
            cours("Droit international public 2", notionsDroit("Droit international public")),
            cours("Droit des obligations (contrats spéciaux)", notionsDroit("Droit des contrats spéciaux")),
            cours("Droit des sociétés 2", notionsDroit("Droit des sociétés")),
          ],
        },
        {
          nom: "Compléter les fondamentaux 5 (2 EC au choix)",
          statut: "obligatoire",
          nombreChoix: 2,
          cours: [
            cours("Droit du travail 2", notionsDroit("Droit du travail")),
            cours("Droit international public 2", notionsDroit("Droit international public")),
            cours("Droit des obligations (contrats spéciaux)", notionsDroit("Droit des contrats spéciaux")),
            cours("Droit des sociétés 2", notionsDroit("Droit des sociétés")),
          ],
        },
        {
          nom: "Culture juridique 5",
          statut: "obligatoire",
          cours: [
            cours("Droit public des biens", notionsDroit("Droit public des biens")),
            cours("Droit de l'environnement", notionsDroit("Droit de l'environnement")),
          ],
        },
        {
          nom: "Stage / Expérience professionnelle",
          statut: "obligatoire",
          cours: [cours("Stage (4 semaines)"), cours("Alternative au stage : sujet de recherche")],
        },
        {
          nom: "Unités transversales",
          statut: "obligatoire",
          cours: [cours("LV1 Anglais"), cours("LV1 Allemand"), cours("LV1 Espagnol")],
        },
      ],
    },
  ],
};