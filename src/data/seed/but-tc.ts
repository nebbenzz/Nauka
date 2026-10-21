import type { QuestionSeed, QuizSeed } from "./types";

export const butTcMatiere = {
  nom: "Techniques de commercialisation",
  description: "Marketing, études de marché, négociation commerciale, communication et stratégie — BUT Techniques de commercialisation.",
};

// Progression alignée sur le programme national du BUT TC ; chaque niveau couvre deux semestres.
const notions = {
  marketing: "Fondamentaux du marketing (S1)",
  etudes: "Études marketing et comportement du consommateur (S2)",
  negociation: "Négociation commerciale (S3)",
  operationnel: "Marketing opérationnel et communication commerciale (S4)",
  digital: "Marketing digital et acquisition (S5)",
  strategie: "Stratégie commerciale et développement d'activité (S6)",
} as const;

type NotionKey = keyof typeof notions;

const niveauParNotion: Record<NotionKey, number> = {
  marketing: 1,
  etudes: 1,
  negociation: 2,
  operationnel: 2,
  digital: 3,
  strategie: 3,
};

function q(
  id: string,
  notion: NotionKey,
  type: "qcm" | "qcu",
  intitule: string,
  explication: string,
  reponsesCorrectes: string[],
  distracteurs: string[],
): QuestionSeed {
  const reponses = [
    ...reponsesCorrectes.map((texte) => [texte, true] as const),
    ...distracteurs.map((texte) => [texte, false] as const),
  ];
  const decalage = Number(id.slice(-2)) % reponses.length;
  const reponsesMelangees = [...reponses.slice(decalage), ...reponses.slice(0, decalage)];

  return {
    id,
    notion: notions[notion],
    niveau: niveauParNotion[notion],
    type,
    intitule,
    explication,
    reponses: reponsesMelangees.map(([texte, correcte]) => ({ texte, correcte })),
  };
}

function qc(
  id: string,
  notion: NotionKey,
  type: "qcm" | "qcu",
  intitule: string,
  explication: string,
  reponseCorrecte: string,
  distracteurs: string[],
): QuestionSeed {
  return q(id, notion, type, intitule, explication, [reponseCorrecte], distracteurs);
}

function qcm(
  id: string,
  notion: NotionKey,
  intitule: string,
  explication: string,
  reponsesCorrectes: string[],
  distracteurs: string[],
): QuestionSeed {
  return q(id, notion, "qcm", intitule, explication, reponsesCorrectes, distracteurs);
}

export const butTcQuestions: QuestionSeed[] = [
  qc("tc-s1-mkt-01", "marketing", "qcu", "Quel est l'objectif central d'une démarche marketing ?", "La démarche marketing consiste à comprendre un marché et ses clients pour concevoir une offre qui crée de la valeur, plutôt qu'à se limiter à pousser un produit existant.", "Construire une offre créatrice de valeur en réponse aux besoins d'un marché", ["Vendre à tout prix le stock disponible", "Réduire systématiquement les coûts de production", "Remplacer l'étude des clients par l'intuition du vendeur"]),
  qc("tc-s1-mkt-02", "marketing", "qcu", "Quelle proposition distingue correctement un besoin d'une demande ?", "Un besoin correspond à un état de manque ; la demande traduit ce besoin en volonté d'achat, soutenue par un pouvoir d'achat et orientée vers une offre.", "La demande associe un besoin à une intention d'achat et à une capacité de paiement", ["Le besoin est toujours créé par la publicité", "La demande désigne uniquement le nombre de concurrents", "Besoin et demande sont deux mots pour désigner le prix"]),
  qcm("tc-s1-mkt-03", "marketing", "Quelles variables peuvent servir à segmenter un marché de consommateurs ?", "La segmentation peut s'appuyer sur des critères sociodémographiques, géographiques, comportementaux ou psychographiques, à condition qu'ils aident à distinguer des attentes ou comportements pertinents.", ["La zone géographique", "Les comportements d'achat"], ["Le numéro de facture attribué après l'achat", "La couleur du logo de l'entreprise"]),
  qc("tc-s1-mkt-04", "marketing", "qcu", "À quoi sert principalement le ciblage après la segmentation ?", "Le ciblage consiste à choisir les segments que l'organisation décide de servir en fonction de leur intérêt et de ses capacités.", "Sélectionner les segments de clientèle que l'organisation veut servir", ["Attribuer un prix à chaque concurrent", "Décrire le produit sans choisir de clientèle", "Remplacer la segmentation par une campagne publicitaire"]),
  qc("tc-s1-mkt-05", "marketing", "qcu", "Que décrit le positionnement d'une offre ?", "Le positionnement est la place distinctive que l'entreprise cherche à occuper dans l'esprit de la cible par rapport aux offres concurrentes.", "La perception distinctive recherchée auprès de la clientèle cible", ["Le rang chronologique du produit dans le catalogue", "Le nombre de vendeurs affectés à une région", "Le lieu où sont stockées les marchandises"]),
  qc("tc-s1-mkt-06", "marketing", "qcu", "Une entreprise affirme que son service est « simple à mettre en place et disponible en moins de 24 heures ». Quel élément du positionnement exprime cette promesse ?", "La proposition de valeur formule le bénéfice principal promis au client et les éléments qui différencient l'offre.", "La proposition de valeur", ["La part de marché", "Le coût de revient", "La structure juridique"]),
  qc("tc-s1-mkt-07", "marketing", "qcu", "Une marque veut mesurer le poids de ses ventes dans les ventes totales de sa catégorie. Quel indicateur doit-elle calculer ?", "La part de marché rapporte les ventes de l'entreprise aux ventes totales du marché défini, sur une période et un périmètre cohérents.", "La part de marché", ["Le taux de marge commerciale", "Le taux de rotation des stocks", "Le coût d'acquisition client"]),
  qcm("tc-s1-mkt-08", "marketing", "Quelles caractéristiques rendent un segment intéressant pour une action marketing ?", "Un segment doit pouvoir être identifié et atteint, présenter un intérêt suffisant, et permettre à l'organisation de proposer une réponse adaptée.", ["Il peut être mesuré et distingué des autres segments", "L'entreprise peut l'atteindre avec une offre adaptée"], ["Il doit nécessairement regrouper tous les acheteurs du marché", "Il est défini uniquement par le nom du produit"]),
  qc("tc-s1-mkt-09", "marketing", "qcu", "Une entreprise vend 600 unités sur un marché qui en compte 6 000 sur la même période. Quelle est sa part de marché en volume ?", "La part de marché en volume est égale aux ventes de l'entreprise divisées par les ventes totales : 600 / 6 000 = 10 %.", "10 %", ["1 %", "6 %", "60 %"]),
  qc("tc-s1-mkt-10", "marketing", "qcu", "Pourquoi une entreprise étudie-t-elle ses concurrents avant de définir son offre ?", "L'analyse concurrentielle aide à comprendre les alternatives disponibles, les attentes déjà couvertes et les possibilités de différenciation.", "Pour repérer les offres existantes et définir une différenciation pertinente", ["Pour copier automatiquement les prix des concurrents", "Pour éviter de recueillir des informations sur les clients", "Pour garantir qu'aucun concurrent n'entrera sur le marché"]),

  qc("tc-s2-etudes-01", "etudes", "qcu", "Quelle méthode convient le mieux pour comprendre en profondeur les raisons d'un comportement d'achat ?", "Les entretiens semi-directifs permettent d'explorer les motivations et représentations avec des questions ouvertes ; ils ne mesurent pas à eux seuls leur fréquence dans toute la population.", "Une étude qualitative par entretiens semi-directifs", ["Un relevé comptable des ventes uniquement", "Un sondage fermé auprès d'une seule personne", "Un calcul de part de marché sans enquête"]),
  qc("tc-s2-etudes-02", "etudes", "qcu", "Une étude veut estimer la proportion de clients satisfaits parmi 2 000 acheteurs. Quel dispositif est le plus adapté ?", "Une enquête quantitative avec un échantillon construit selon une méthode explicite permet d'estimer une proportion, en tenant compte des limites d'échantillonnage.", "Un questionnaire standardisé administré à un échantillon pertinent", ["Deux entretiens libres sans grille d'analyse", "Une observation d'un seul vendeur", "Une réunion interne avec les responsables commerciaux"]),
  qc("tc-s2-etudes-03", "etudes", "qcu", "Qu'est-ce qu'une donnée primaire dans une étude de marché ?", "Une donnée primaire est collectée spécifiquement pour répondre à la question de recherche, par exemple au moyen d'une enquête ou d'une observation.", "Une donnée recueillie directement pour l'étude en cours", ["Une donnée publiée auparavant pour un autre objectif", "Une donnée nécessairement issue d'un organisme public", "Une donnée qui n'a pas été vérifiée"]),
  qc("tc-s2-etudes-04", "etudes", "qcu", "Quel défaut présente la question « Vous trouvez notre service rapide et pratique, n'est-ce pas ? » ?", "La formulation suggère une réponse favorable et combine deux attributs, ce qui empêche de savoir auquel le répondant réagit.", "Elle est orientée et contient deux idées à la fois", ["Elle ne comporte aucune modalité de réponse", "Elle utilise un vocabulaire trop technique pour mesurer un délai", "Elle demande une information impossible à exprimer par un avis"]),
  qcm("tc-s2-etudes-05", "etudes", "Quelles pratiques améliorent la qualité d'un questionnaire ?", "Des questions compréhensibles, neutres et centrées sur une seule idée réduisent les erreurs de compréhension et les biais de réponse.", ["Employer des termes compréhensibles pour la cible", "Ne poser qu'une idée par question"], ["Présenter d'abord les réponses que l'enquêteur préfère", "Modifier le sens des questions selon chaque répondant"]),
  qc("tc-s2-etudes-06", "etudes", "qcu", "À quoi sert une échelle de Likert dans une enquête ?", "Une échelle de Likert recueille le degré d'accord ou de désaccord avec une affirmation, selon des modalités ordonnées.", "Mesurer un degré d'accord ou une attitude sur des modalités ordonnées", ["Calculer directement le chiffre d'affaires", "Classer les entreprises selon leur statut juridique", "Remplacer l'échantillonnage par une moyenne"]),
  qc("tc-s2-etudes-07", "etudes", "qcu", "Quel enchaînement correspond le mieux à un parcours d'achat classique ?", "Le parcours débute par la reconnaissance d'un besoin, puis comprend la recherche et l'évaluation d'options, la décision d'achat et l'évaluation après achat.", "Reconnaissance du besoin, recherche, évaluation, achat, évaluation après achat", ["Achat, segmentation, production, besoin, fidélisation", "Publicité, paiement, ciblage, étude, besoin", "Recherche, vente, besoin, concurrence, prix"]),
  qc("tc-s2-etudes-08", "etudes", "qcu", "Que désigne le biais de désirabilité sociale dans une enquête ?", "Un répondant peut donner une réponse qu'il juge socialement valorisée plutôt que décrire son comportement réel.", "La tendance à donner une réponse jugée socialement acceptable", ["La sélection aléatoire des répondants", "La variation du prix selon le canal de vente", "La différence entre données primaires et secondaires"]),
  qc("tc-s2-etudes-09", "etudes", "qcu", "Une enquête en ligne ne reçoit des réponses que de clients très engagés. Quel risque doit être examiné en priorité ?", "Les personnes qui répondent spontanément peuvent différer des autres clients ; l'échantillon risque donc de ne pas représenter la population étudiée.", "Un biais d'autosélection des répondants", ["Une erreur de calcul du coût de revient", "Une baisse automatique de la validité du produit", "Une confusion entre prix hors taxes et toutes taxes comprises"]),
  qcm("tc-s2-etudes-10", "etudes", "Quelles affirmations sur les personas sont exactes ?", "Un persona synthétise des informations sur un profil de clientèle pour faciliter la conception d'une offre ; il doit s'appuyer sur des données et ne représente pas chaque individu.", ["Il synthétise un profil utile à la conception d'une offre", "Il gagne à être fondé sur des données de clientèle"], ["Il décrit nécessairement une personne réelle unique", "Il remplace toute étude quantitative ou qualitative"]),

  qc("tc-s3-neg-01", "negociation", "qcu", "Quel est l'objectif principal de la phase de découverte lors d'un entretien de vente ?", "La découverte permet de comprendre le contexte, les besoins, les contraintes et les critères de décision avant de proposer une solution.", "Comprendre la situation et les besoins du client avant de proposer", ["Réciter immédiatement toutes les caractéristiques du produit", "Obtenir une signature avant d'écouter le client", "Écarter les critères de décision du client"]),
  qc("tc-s3-neg-02", "negociation", "qcu", "Quelle question est la plus adaptée pour faire préciser une difficulté exprimée par un client ?", "Une question ouverte invite le client à développer sa situation et donne au vendeur des éléments pour préciser le besoin.", "« Pouvez-vous me décrire ce qui vous pose problème aujourd'hui ? »", ["« Vous êtes satisfait, oui ou non ? »", "« Vous allez acheter maintenant ? »", "« Vous savez que notre offre est la meilleure ? »"]),
  qcm("tc-s3-neg-03", "negociation", "Quelles pratiques relèvent de l'écoute active en entretien commercial ?", "L'écoute active s'appuie sur l'attention, la reformulation et des questions de clarification pour vérifier la compréhension.", ["Reformuler le besoin avec ses propres mots", "Demander une précision lorsqu'un point reste ambigu"], ["Interrompre chaque réponse pour présenter l'offre", "Supposer que le silence confirme l'accord"]),
  qc("tc-s3-neg-04", "negociation", "qcu", "Dans une argumentation commerciale, à quoi sert la méthode « caractéristique – avantage – bénéfice » ?", "Elle relie un élément concret de l'offre à son avantage, puis à la valeur que cet avantage apporte dans la situation du client.", "À relier une caractéristique de l'offre à un bénéfice pertinent pour le client", ["À remplacer la découverte des besoins", "À présenter uniquement des données techniques", "À calculer la remise maximale autorisée"]),
  qc("tc-s3-neg-05", "negociation", "qcu", "Un client objecte que la mise en place lui semble trop longue. Quelle première réaction est la plus professionnelle ?", "Il faut accueillir l'objection et en préciser la cause avant de répondre ; une réponse immédiate risquerait de traiter le mauvais problème.", "Clarifier ce que le client entend par « trop longue » avant de répondre", ["Contredire immédiatement le client", "Accorder une remise sans comprendre l'objection", "Changer de sujet et conclure la vente"]),
  qc("tc-s3-neg-06", "negociation", "qcu", "Pourquoi un vendeur prépare-t-il ses marges de négociation avant un rendez-vous ?", "Définir des limites et des contreparties permet de négocier de manière cohérente sans dégrader la valeur de l'offre ou dépasser les autorisations.", "Connaître ses limites et les contreparties possibles avant de concéder", ["Éviter d'écouter les demandes du client", "Garantir que le client acceptera la première proposition", "Remplacer le calcul du prix de vente par une intuition"]),
  qcm("tc-s3-neg-07", "negociation", "Quelles précautions rendent une concession commerciale plus maîtrisée ?", "Une concession doit rester dans le cadre autorisé et être conditionnée à une contrepartie explicite, par exemple un volume ou un engagement.", ["Vérifier qu'elle reste dans la limite autorisée", "La relier à une contrepartie clairement formulée"], ["La proposer avant même de connaître la demande", "Cumuler les remises sans en mesurer l'effet"]),
  qc("tc-s3-neg-08", "negociation", "qcu", "Quel signe justifie de vérifier si un client est prêt à avancer vers la conclusion ?", "Une question concrète sur les modalités de mise en œuvre peut signaler un intérêt ; le vendeur doit le vérifier sans présumer de l'accord.", "Le client demande comment organiser la mise en place", ["Le client n'a pas encore expliqué son besoin", "Le client exprime une objection non clarifiée", "Le vendeur a terminé sa présentation"]),
  qc("tc-s3-neg-09", "negociation", "qcu", "Quelle information doit être consignée dans un CRM après un échange commercial ?", "Un CRM doit contenir des informations utiles au suivi, comme les besoins, les décisions, les prochaines actions et leur échéance, en respectant les règles de protection des données.", "Les besoins exprimés et la prochaine action convenue avec sa date", ["Une appréciation personnelle sans lien avec la vente", "Toutes les informations personnelles disponibles, même inutiles", "Un prix concurrent non vérifié présenté comme certain"]),
  qc("tc-s3-neg-10", "negociation", "qcu", "Pourquoi assurer un suivi après la vente ?", "Le suivi vérifie la bonne mise en œuvre de la solution, aide à résoudre les difficultés et peut contribuer à la satisfaction et à la fidélisation.", "Vérifier la satisfaction et traiter les éventuelles difficultés après l'achat", ["Éviter tout contact après la signature", "Remplacer les engagements contractuels par une promesse orale", "Empêcher le client de comparer son expérience à ses attentes"]),

  qc("tc-s4-op-01", "operationnel", "qcu", "Quels sont les quatre leviers classiques du marketing mix ?", "Le modèle des 4P regroupe le produit, le prix, la distribution (place) et la communication (promotion).", "Produit, prix, distribution et communication", ["Produit, personnel, profit et prévision", "Prix, publicité, preuve et productivité", "Production, partenariat, position et portefeuille"]),
  qc("tc-s4-op-02", "operationnel", "qcu", "Quelle logique caractérise une stratégie de prix de pénétration ?", "Le prix de pénétration est fixé relativement bas au lancement pour faciliter l'adoption et gagner rapidement des clients, sous réserve d'une économie viable.", "Proposer un prix de lancement bas pour accélérer l'adoption", ["Fixer un prix très élevé pour cibler les premiers acheteurs", "Aligner le prix sur le coût sans étudier le marché", "Faire varier le prix uniquement selon la couleur du produit"]),
  qc("tc-s4-op-03", "operationnel", "qcu", "Une marque vend un produit de grande consommation dans le plus grand nombre de points de vente possible. Quel mode de distribution privilégie-t-elle ?", "La distribution intensive vise une présence étendue pour rendre le produit facilement accessible.", "La distribution intensive", ["La distribution exclusive", "La distribution sélective", "La vente sans intermédiaire uniquement"]),
  qcm("tc-s4-op-04", "operationnel", "Quelles actions contribuent à la cohérence d'une campagne de communication ?", "Une campagne cohérente adapte le message et les supports à la cible tout en conservant une promesse et une identité reconnaissables.", ["Adapter le message au public visé", "Conserver une promesse cohérente entre les supports"], ["Changer de positionnement à chaque publication", "Choisir les supports sans tenir compte des usages de la cible"]),
  qc("tc-s4-op-05", "operationnel", "qcu", "Quel indicateur mesure la proportion de personnes ayant réalisé l'action attendue après avoir vu une page ?", "Le taux de conversion rapporte les actions réalisées aux visites ou interactions définies comme base de calcul.", "Le taux de conversion", ["Le taux de notoriété spontanée", "La part de voix", "Le taux de démarque inconnue"]),
  qc("tc-s4-op-06", "operationnel", "qcu", "Une campagne touche 1 000 personnes et obtient 50 clics. Quel est son taux de clics (CTR) ?", "Le CTR est le rapport entre les clics et les impressions : 50 / 1 000 = 5 %.", "5 %", ["0,5 %", "20 %", "50 %"]),
  qc("tc-s4-op-07", "operationnel", "qcu", "Pourquoi suivre les résultats d'une action commerciale à l'aide d'indicateurs définis à l'avance ?", "Des indicateurs liés aux objectifs permettent de comparer les résultats observés aux résultats attendus et d'ajuster l'action.", "Pour évaluer l'écart aux objectifs et décider d'ajustements", ["Pour prouver qu'une campagne réussit quelle que soit sa performance", "Pour éviter de définir une cible", "Pour remplacer toutes les données commerciales par des impressions"]),
  qc("tc-s4-op-08", "operationnel", "qcu", "À quoi correspond le cycle de vie d'un produit en marketing ?", "Le cycle de vie décrit généralement des phases d'introduction, de croissance, de maturité et de déclin, avec des enjeux différents selon la phase.", "Aux phases d'évolution des ventes d'une offre sur son marché", ["À la durée légale de garantie du produit", "Au calendrier de paiement des fournisseurs", "Au temps nécessaire pour produire une unité"]),
  qc("tc-s4-op-09", "operationnel", "qcu", "Une entreprise prévoit de lancer un produit avec un budget de campagne limité. Quel choix doit guider la sélection des canaux ?", "Le choix dépend des objectifs, de la cible, des coûts et de la capacité des canaux à produire des résultats mesurables.", "L'adéquation aux objectifs et aux usages de la cible, ainsi que le coût", ["Le nombre total de canaux disponibles sur le marché", "La préférence personnelle du responsable uniquement", "La popularité générale du canal, sans lien avec la cible"]),
  qcm("tc-s4-op-10", "operationnel", "Quelles affirmations sur le marketing mix sont pertinentes ?", "Les leviers du mix doivent être cohérents entre eux et adaptés au positionnement ainsi qu'aux attentes de la cible.", ["Les choix de prix doivent être cohérents avec le positionnement", "La distribution doit rendre l'offre accessible à la cible visée"], ["Chaque levier peut être décidé sans tenir compte des autres", "Le mix est identique pour toutes les offres d'une entreprise"]),

  qc("tc-s5-dig-01", "digital", "qcu", "Quel objectif poursuit principalement le référencement naturel (SEO) ?", "Le SEO vise à améliorer la visibilité d'un site dans les résultats non payants des moteurs de recherche.", "Améliorer la visibilité dans les résultats organiques des moteurs de recherche", ["Acheter des annonces dans les résultats sponsorisés", "Augmenter le nombre de produits en stock", "Remplacer l'analyse des mots-clés par des publications sociales"]),
  qc("tc-s5-dig-02", "digital", "qcu", "Quelle distinction caractérise le référencement payant (SEA) ?", "Le SEA repose sur des annonces achetées, souvent facturées selon des mécanismes comme le coût par clic ; il ne se confond pas avec le référencement organique.", "Acheter des annonces diffusées sur des espaces publicitaires de recherche", ["Optimiser exclusivement le contenu non sponsorisé", "Créer un lien entrant sans campagne publicitaire", "Envoyer un courriel à une liste de clients"]),
  qc("tc-s5-dig-03", "digital", "qcu", "Une campagne génère 120 clics pour 3 000 impressions. Quel est le CTR ?", "Le taux de clics vaut 120 / 3 000, soit 0,04 ou 4 %.", "4 %", ["0,4 %", "12 %", "40 %"]),
  qc("tc-s5-dig-04", "digital", "qcu", "Une page reçoit 500 visites et 25 achats. Quel est son taux de conversion en achat ?", "Le taux de conversion est le nombre d'achats divisé par le nombre de visites : 25 / 500 = 5 %.", "5 %", ["2 %", "10 %", "25 %"]),
  qc("tc-s5-dig-05", "digital", "qcu", "À quoi servent les paramètres UTM ajoutés à une URL de campagne ?", "Les paramètres UTM aident les outils d'analyse à identifier la source, le support ou la campagne à l'origine d'une visite.", "Attribuer les visites à une source ou campagne marketing", ["Chiffrer le paiement réalisé sur le site", "Garantir le positionnement naturel d'une page", "Remplacer l'information sur le consentement aux traceurs"]),
  qc("tc-s5-dig-06", "digital", "qcu", "Quel indicateur aide à comparer le coût d'acquisition d'un nouveau client entre deux campagnes ?", "Le coût d'acquisition client rapporte les dépenses attribuées à l'acquisition au nombre de nouveaux clients acquis selon une méthode cohérente.", "Le coût d'acquisition client (CAC)", ["Le nombre total d'abonnés à la marque", "Le taux d'ouverture des courriels uniquement", "Le nombre de pages indexées"]),
  qcm("tc-s5-dig-07", "digital", "Quelles précautions sont importantes lors de l'envoi de courriels commerciaux à des particuliers ?", "Les règles applicables imposent notamment de respecter la base légale, l'information des personnes, les droits d'opposition et les conditions de collecte des adresses.", ["Informer clairement les destinataires et respecter leur droit d'opposition", "Vérifier que la collecte et l'utilisation des adresses ont une base légale appropriée"], ["Acheter n'importe quelle liste de contacts sans vérifier son origine", "Rendre le désabonnement impossible pour préserver la taille de la liste"]),
  qc("tc-s5-dig-08", "digital", "qcu", "Dans un test A/B, quelle pratique permet une comparaison plus fiable ?", "Un test A/B compare des variantes auprès de groupes comparables en ne changeant qu'un élément principal à la fois et en définissant à l'avance l'indicateur évalué.", "Comparer deux variantes sur des groupes comparables avec un indicateur défini", ["Modifier simultanément le prix, le texte et le public sans suivi distinct", "Arrêter le test dès qu'une variante obtient un clic", "Montrer toujours la même variante à tous les visiteurs"]),
  qc("tc-s5-dig-09", "digital", "qcu", "Pourquoi une page d'atterrissage doit-elle présenter un appel à l'action clair ?", "Un appel à l'action explicite aide le visiteur à comprendre l'étape attendue et réduit l'ambiguïté entre la promesse de la campagne et la page.", "Pour rendre l'action attendue facile à identifier", ["Pour augmenter le nombre de menus sans lien avec l'offre", "Pour masquer les conditions de l'offre", "Pour éviter de mesurer les conversions"]),
  qc("tc-s5-dig-10", "digital", "qcu", "Quel indicateur mesure la proportion de destinataires qui ouvrent un courriel parmi ceux qui l'ont reçu ?", "Le taux d'ouverture rapporte les ouvertures mesurées aux courriels délivrés, en tenant compte des limites techniques de mesure.", "Le taux d'ouverture", ["Le taux de rebond du site", "Le taux de conversion en magasin", "La part de marché en valeur"]),

  qc("tc-s6-str-01", "strategie", "qcu", "Dans une analyse SWOT, où classe-t-on une compétence interne reconnue de l'entreprise ?", "Les forces et faiblesses relèvent de l'analyse interne ; les opportunités et menaces concernent l'environnement externe.", "Dans les forces", ["Dans les opportunités", "Dans les menaces", "Dans les tendances macroéconomiques"]),
  qc("tc-s6-str-02", "strategie", "qcu", "Quel outil examine notamment les facteurs politiques, économiques, socioculturels, technologiques, environnementaux et légaux ?", "L'analyse PESTEL structure l'étude de facteurs macro-environnementaux susceptibles d'influencer l'organisation.", "L'analyse PESTEL", ["La matrice BCG", "Le modèle AIDA", "Le tableau de trésorerie"]),
  qc("tc-s6-str-03", "strategie", "qcu", "À quoi sert l'analyse des cinq forces de Porter ?", "Elle aide à analyser l'intensité concurrentielle d'un secteur en examinant notamment clients, fournisseurs, concurrents, substituts et nouveaux entrants.", "À apprécier les pressions concurrentielles dans un secteur", ["À répartir les tâches entre les vendeurs", "À calculer la TVA collectée", "À mesurer la satisfaction après chaque transaction"]),
  qc("tc-s6-str-04", "strategie", "qcu", "Une entreprise dispose d'une technologie difficile à imiter, utile à ses clients et bien exploitée par son organisation. Quel avantage peut-elle en tirer ?", "Une ressource créatrice de valeur, rare, difficile à imiter et soutenue par l'organisation peut contribuer à un avantage concurrentiel durable.", "Un avantage concurrentiel potentiellement durable", ["Une garantie de monopole légal immédiat", "Une hausse automatique de la demande", "Une suppression de tout risque commercial"]),
  qc("tc-s6-str-05", "strategie", "qcu", "Un produit est vendu 80 € et son coût variable unitaire est de 50 €. Quelle est sa marge sur coût variable unitaire ?", "La marge sur coût variable unitaire est égale au prix de vente diminué du coût variable unitaire : 80 - 50 = 30 €.", "30 €", ["20 €", "50 €", "130 €"]),
  qc("tc-s6-str-06", "strategie", "qcu", "Une entreprise veut fidéliser ses clients les plus rentables sans négliger les autres. Quelle démarche est la plus pertinente ?", "Une segmentation de la clientèle fondée sur des critères pertinents permet d'adapter les actions tout en évitant de traiter les clients comme un groupe homogène.", "Segmenter les clients à partir de données pertinentes et définir une action adaptée à chaque segment", ["Envoyer la même remise à tous sans analyser les comportements", "Supprimer le suivi des clients après le premier achat", "Choisir les clients uniquement selon leur âge"]),
  qcm("tc-s6-str-07", "strategie", "Quelles qualités doit présenter un objectif commercial pour faciliter son pilotage ?", "Un objectif utile au pilotage doit être défini précisément, mesurable, réaliste au regard des ressources, pertinent et borné dans le temps.", ["Être mesurable avec un indicateur défini", "Comporter une échéance explicite"], ["Être formulé comme une intention impossible à vérifier", "Ignorer les moyens disponibles et les contraintes"]),
  qc("tc-s6-str-08", "strategie", "qcu", "Pourquoi une entreprise élabore-t-elle un plan d'action commercial après avoir défini sa stratégie ?", "Le plan d'action traduit les orientations en actions, responsables, ressources, échéances et indicateurs de suivi.", "Pour transformer les orientations en actions suivies et attribuées", ["Pour remplacer l'analyse du marché par une liste de souhaits", "Pour garantir les ventes sans tenir compte de l'exécution", "Pour supprimer les objectifs de l'entreprise"]),
  qc("tc-s6-str-09", "strategie", "qcu", "Que mesure la valeur vie client (Customer Lifetime Value) dans son principe ?", "La valeur vie client estime la valeur économique attendue de la relation avec un client sur sa durée, selon les hypothèses retenues.", "La valeur économique attendue de la relation avec un client dans le temps", ["Le chiffre d'affaires réalisé lors d'une seule visite", "Le coût total d'une campagne publicitaire", "Le nombre de clients ayant visité le site aujourd'hui"]),
  qc("tc-s6-str-10", "strategie", "qcu", "Une entreprise choisit de se différencier par un service après-vente très réactif. Quel élément doit-elle vérifier pour rendre ce choix crédible ?", "La différenciation doit répondre à une attente valorisée par la cible et être soutenue par des capacités réelles, comme les équipes et processus de service.", "Que la cible valorise ce service et que l'entreprise puisse réellement le délivrer", ["Que les concurrents utilisent tous le même argument", "Que le service soit gratuit quelles que soient ses conséquences", "Que le positionnement ne soit pas communiqué aux clients"]),
];

const niveaux = [1, 2, 3] as const;

export const butTcQuizzes: QuizSeed[] = [
  ...Object.entries(notions).map(([cle, notion]) => {
    const niveau = niveauParNotion[cle as NotionKey];
    const questions = butTcQuestions.filter((question) => question.notion === notion);
    return {
      titre: `${notion} [L${niveau}]`,
      type: "notion" as const,
      notionFiltre: notion,
      niveauNotion: niveau,
      niveauCible: niveau,
      niveauPremiereDecouverte: niveau,
      questionIds: questions.map((question) => question.id),
      formationCible: "BUT Techniques de Commercialisation",
    };
  }),
  ...niveaux.map((niveau) => ({
    titre: `${butTcMatiere.nom} [L${niveau}]`,
    type: "global" as const,
    niveauCible: niveau,
    niveauPremiereDecouverte: 1,
    questionIds: butTcQuestions.filter((question) => question.niveau === niveau).map((question) => question.id),
    formationCible: "BUT Techniques de Commercialisation",
  })),
];
