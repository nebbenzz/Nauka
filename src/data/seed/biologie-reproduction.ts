import type { QuestionSeed, QuizSeed } from "./types";

export const biologieReproductionMatiere = {
  nom: "Biologie de la reproduction",
  description: "Stratégies de reproduction animale, reproduction sexuée et asexuée, gamètes, méiose et détermination du sexe — Licence 3 Biologie, semestre 5.",
};

const notions = {
  senescence: "Sénescence, mortalité et stratégies de reproduction (S5)",
  strategies: "Reproduction sexuée et asexuée (S5)",
  gametes: "Gamètes et méiose (S5)",
  sexe: "Détermination du sexe (S5)",
} as const;

type NotionKey = keyof typeof notions;

function creerQuestion(
  id: string,
  notion: NotionKey,
  type: "qcm" | "qcu",
  intitule: string,
  explication: string,
  reponsesCorrectes: string[],
  distracteurs: string[],
): QuestionSeed {
  const reponsesInitiales = [
    ...reponsesCorrectes.map((texte) => [texte, true] as const),
    ...distracteurs.map((texte) => [texte, false] as const),
  ];
  const decalage = Number(id.slice(-2)) % reponsesInitiales.length;
  const reponsesMelangees = [...reponsesInitiales.slice(decalage), ...reponsesInitiales.slice(0, decalage)];

  return {
    id,
    notion: notions[notion],
    niveau: 3,
    type,
    intitule,
    explication,
    reponses: reponsesMelangees.map(([texte, correcte]) => ({ texte, correcte })),
  };
}

function qcu(
  id: string,
  notion: NotionKey,
  intitule: string,
  explication: string,
  reponseCorrecte: string,
  distracteurs: [string, string, string],
): QuestionSeed {
  return creerQuestion(id, notion, "qcu", intitule, explication, [reponseCorrecte], distracteurs);
}

function qcm(
  id: string,
  notion: NotionKey,
  intitule: string,
  explication: string,
  reponsesCorrectes: [string, string],
  distracteurs: [string, string],
): QuestionSeed {
  return creerQuestion(id, notion, "qcm", intitule, explication, reponsesCorrectes, distracteurs);
}

function qcm3(
  id: string,
  notion: NotionKey,
  intitule: string,
  explication: string,
  reponsesCorrectes: [string, string, string],
  distracteur: string,
): QuestionSeed {
  return creerQuestion(id, notion, "qcm", intitule, explication, reponsesCorrectes, [distracteur]);
}

export const biologieReproductionQuestions: QuestionSeed[] = [
  qcu("br-pb-01", "senescence", "Que désigne la sénescence ?", "La sénescence est le vieillissement naturel des tissus et de l'organisme, marqué par une diminution progressive des capacités.", "Le vieillissement naturel des tissus et de l'organisme", ["La maturation des gamètes", "La mort immédiate après la fécondation", "La production de descendants par mitose"]),
  qcu("br-pb-02", "senescence", "Quelle hypothèse explique la sénescence par l'accumulation de mutations délétères qui s'expriment tardivement ?", "L'hypothèse d'accumulation des mutations propose que les effets délétères tardifs sont moins efficacement éliminés par la sélection.", "L'accumulation de mutations à effets délétères tardifs", ["La sélection des mutations uniquement favorables tardivement", "La disparition de toute mutation après la reproduction", "La transformation des cellules somatiques en gamètes"]),
  qcu("br-pb-03", "senescence", "Pourquoi les effets favorables qui s'expriment tôt dans la vie sont-ils davantage sélectionnés ?", "Les effets bénéfiques précoces sont davantage favorisés que des effets similaires qui ne s'expriment que tardivement.", "La sélection favorise plus fortement les effets bénéfiques précoces", ["Les individus ne se reproduisent jamais avant la sénescence", "Les effets tardifs sont toujours bénéfiques", "La sénescence empêche toute sélection naturelle"]),
  qcu("br-pb-04", "senescence", "Quelle synthèse de la sénescence est associée à G. Williams ?", "La synthèse évoquée associe les effets génétiques et les arbitrages évolutifs : une croissance ou une performance reproductive accrue peut se faire au détriment de la longévité.", "Des gènes favorisant croissance ou reproduction peuvent réduire la longévité", ["La sénescence est exclusivement causée par l'absence de reproduction", "La longévité est toujours maximisée par une croissance rapide", "Les mutations cessent d'agir après la maturité"]),
  qcu("br-pb-05", "senescence", "Chez quels types de plantes la sémelparité est-elle fréquente ?", "La sémelparité est fréquente chez les plantes annuelles et bisannuelles; certaines plantes pérennes peuvent également être sémelpares.", "Les plantes annuelles et bisannuelles", ["Les plantes pérennes qui fleurissent chaque année", "Les plantes qui ne produisent jamais de graines", "Les plantes qui se reproduisent uniquement par bouturage"]),
  qcu("br-pb-06", "senescence", "Qu'est-ce qui caractérise une espèce itéropare ?", "Les espèces itéropares peuvent se reproduire à plusieurs reprises et ne meurent pas immédiatement après une reproduction.", "Elle peut se reproduire plusieurs fois", ["Elle meurt toujours avant sa première reproduction", "Elle produit uniquement des clones", "Elle ne connaît qu'une seule saison de reproduction"]),
  qcu("br-pb-07", "senescence", "Quel exemple de sémelparité végétale est décrit ?", "Certaines plantes pérennes croissent plusieurs années, fleurissent une seule fois sous certaines conditions, puis meurent après la reproduction.", "Une plante pérenne qui fleurit une seule fois puis meurt", ["Une plante qui fleurit chaque année pendant toute sa vie", "Une plante qui ne produit jamais de fleurs", "Une plante qui se reproduit uniquement par bouturage"]),
  qcm("br-pb-08", "senescence", "Quelles caractéristiques des éphémères favorisent les rencontres reproductives ?", "Les éphémères apparaissent en grand nombre au même moment et au même endroit; leurs œufs étant exposés à des pertes, la production de nombreux descendants augmente les chances de reproduction.", ["Les individus apparaissent simultanément", "Une forte production d'individus augmente les chances de rencontre"], ["Les adultes se nourrissent grâce à une bouche fonctionnelle", "Les œufs sont déposés dans des territoires très étendus"]),
  qcu("br-pb-09", "senescence", "Quel critère de reproduction est utilisé dans la définition d'une espèce présentée ?", "Définit une espèce par l'interfécondité et la production d'une descendance fertile à son tour.", "Des individus interféconds donnant une descendance fertile", ["Des individus vivant dans le même milieu", "Des individus ayant exactement le même génome", "Des individus présentant la même longévité"]),
  qcm3("br-pb-10", "senescence", "Quelles sont les trois fonctions essentielles associées à la reproduction ?", "La reproduction contribue à résister aux conditions défavorables, coloniser l'espace et survivre au temps par les descendants.", ["Résister à des conditions défavorables", "Coloniser l'espace", "Survivre au temps grâce aux descendants"], "Éliminer toute variation génétique"),
  qcu("br-pb-41", "senescence", "Quelle phase suit le plateau de croissance dans l'évolution générale décrite ?", "Après la maturation, la croissance et un plateau, l'organisme connaît une dégradation progressive de ses capacités jusqu'à la mort.", "Une dégradation progressive des capacités de l'organisme", ["Une nouvelle phase de croissance illimitée", "La formation immédiate d'un zygote", "Une période sans aucun changement jusqu'à la mort"]),
  qcu("br-pb-42", "senescence", "Qu'est-ce qu'une espèce sémelpare ?", "Une espèce sémelpare se reproduit une seule fois puis meurt après cet épisode reproducteur.", "Une espèce qui se reproduit une seule fois et meurt après cet épisode", ["Une espèce qui se reproduit plusieurs fois au cours de sa vie", "Une espèce qui produit des clones sans fécondation", "Une espèce dont le sexe dépend uniquement de l'environnement"]),
  qcu("br-pb-43", "senescence", "Pourquoi les éphémères adultes sont-elles décrites comme programmées pour mourir ?", "Leur bouche est soudée dès la métamorphose, ce qui empêche leur alimentation au stade adulte.", "Leur bouche est soudée après la métamorphose", ["Elles ne possèdent jamais de gamètes", "Elles vivent uniquement sous forme d'œuf", "Elles sont incapables de se déplacer dans l'eau"]),
  qcu("br-pb-44", "senescence", "Pourquoi les éphémères doivent-elles produire de nombreux œufs ?", "Les œufs déposés dans une mare peuvent être mangés par les poissons; une forte production compense ces pertes.", "Une partie des œufs est mangée par les poissons", ["Les œufs ne peuvent pas se développer dans l'eau", "Chaque œuf produit nécessairement plusieurs adultes", "Les adultes ne se rencontrent jamais au même endroit"]),
  qcu("br-pb-45", "senescence", "Quelle relation générale entre mort et reproduction est formulée ?", "Présente la mort et la reproduction comme deux étapes liées et génétiquement programmées.", "La mort et la reproduction sont liées à des étapes génétiquement programmées", ["La reproduction empêche toujours la sénescence", "La mort survient indépendamment de toute stratégie de reproduction", "Seules les espèces asexuées sont mortelles"]),

  qcu("br-pb-11", "strategies", "Quel mécanisme permet à une bactérie unicellulaire de produire deux cellules filles lors d'une reproduction asexuée ?", "Chez les bactéries et de nombreux unicellulaires, la division cellulaire produit des cellules filles génétiquement proches de la cellule mère.", "La division cellulaire", ["La fécondation", "La méiose", "La gamétogenèse"]),
  qcu("br-pb-12", "strategies", "Chez une hydre, quelle structure peut participer à une reproduction asexuée ?", "Chez les organismes pluricellulaires, des bourgeons ou des propagules peuvent former un nouvel individu.", "Un bourgeon", ["Un zygote issu de fécondation", "Un globule polaire", "Un chromosome sexuel"]),
  qcu("br-pb-13", "strategies", "Que permet une spore dans la reproduction asexuée décrite ?", "La spore, une fois libérée, peut reprendre le développement de l'organisme à partir d'un germe.", "De reprendre le développement d'un organisme", ["De réaliser directement la fécondation", "De produire uniquement des gamètes mâles", "De remplacer la mitose par un crossing-over"]),
  qcu("br-pb-14", "strategies", "Quelle propriété explique qu'une cellule végétale puisse parfois régénérer un individu complet ?", "La totipotence permet à certaines cellules végétales de générer un organisme complet, notamment à partir de racines, tiges ou feuilles.", "La totipotence", ["L'hétérogamétie", "La sémelparité", "La recombinaison des chromosomes sexuels"]),
  qcm("br-pb-15", "strategies", "Dans quels groupes animaux la reproduction asexuée est-elle mentionnée comme fréquente ?", "Les exemples incluent notamment les spongiaires, les cnidaires, les annélides et les bryozoaires.", ["Les spongiaires", "Les cnidaires"], ["Les oiseaux", "Les mollusques"]),
  qcu("br-pb-16", "strategies", "Pourquoi la régénération partielle d'un membre ne constitue-t-elle pas, à elle seule, une reproduction asexuée ?", "La régénération répare une partie de l'individu; elle ne produit pas nécessairement un nouvel individu.", "Elle restaure une partie du même individu sans former un nouvel individu", ["Elle implique toujours la fusion de deux gamètes", "Elle se déroule uniquement dans les cellules sexuelles", "Elle produit systématiquement quatre descendants"]),
  qcm("br-pb-17", "strategies", "Quels avantages de la reproduction asexuée sont décrits ?", "L'absence de partenaire nécessaire et la production rapide de descendants peuvent accélérer la colonisation d'un milieu.", ["Elle ne nécessite pas de partenaire", "Elle peut permettre une colonisation rapide"], ["Elle garantit un brassage génétique important", "Elle protège toujours une population d'un changement brutal du milieu"]),
  qcm("br-pb-18", "strategies", "Quelles limites de la reproduction asexuée sont soulignées ?", "La production de copies limite le brassage génétique; une population peu variée peut être vulnérable à un changement environnemental.", ["Le brassage génétique est limité", "Un changement du milieu peut menacer des individus semblables"], ["Chaque descendant doit trouver un partenaire", "La reproduction est nécessairement plus lente que la reproduction sexuée"]),
  qcu("br-pb-19", "strategies", "Quel échange caractérise la conjugaison des ciliés décrite ?", "Lors de la conjugaison, deux ciliés s'accolent et échangent leurs noyaux.", "Un échange de noyaux entre deux ciliés", ["La production d'un bourgeon par un seul cilié", "La fusion d'un ovule et d'un spermatozoïde", "La formation de spores dans une gélule"]),
  qcu("br-pb-20", "strategies", "Comment appelle-t-on l'accouplement entre cellules somatiques décrit chez les Basidiomycètes ?", "La fusion de cellules somatiques, avec fusion des noyaux parfois différée, est appelée somatogamie.", "La somatogamie", ["La sémelparité", "L'ovogenèse", "La parthénogenèse"]),
  qcu("br-pb-46", "strategies", "Quel phénomène de reproduction a lieu chez Chlamydomonas ?", "Deux gamètes fusionnent et ne se distinguent pas des individus ordinaires par leur aspect.", "La fusion de deux gamètes semblables aux individus ordinaires", ["La formation d'une gélule contenant des spicules", "La production d'un blastozoïde par bourgeonnement", "L'échange de noyaux entre deux ciliés"]),
  qcu("br-pb-47", "strategies", "Chez les cnidaires fixés, que peuvent former les bourgeons produits sur l'individu parent ?", "Décrit des bourgeons qui se développent puis donnent des méduses, formes libres capables de se déplacer et de coloniser d'autres milieux.", "Des méduses, formes libres de l'organisme", ["Des spermatozoïdes mobiles", "Des globules polaires", "Des spores végétales"]),
  qcu("br-pb-48", "strategies", "Chez les annélides, où peut se former le bourgeon reproducteur ?", "Un métamère situé à l'arrière peut développer un bourgeon qui formera un individu complet.", "Sur un métamère postérieur", ["Dans l'ampoule de l'oviducte", "Dans la tête de l'épididyme", "À l'intérieur d'un globule polaire"]),
  qcu("br-pb-49", "strategies", "Quel groupe de chordés est cité comme pouvant présenter une reproduction asexuée ?", "Les ?l?ments comprennent les chordés fixés, notamment les tuniciers, parmi les exemples de reproduction asexuée.", "Les tuniciers fixés", ["Les oiseaux", "Les mammifères placentaires", "Les poissons à nageoires rayonnées uniquement"]),
  qcu("br-pb-50", "strategies", "Quelle hypothèse est avancée sur l'origine des espèces actuellement asexuées ?", "L'hypothèse proposée est que ces espèces ont perdu l'usage du sexe, et non qu'elles ne l'aient jamais acquis.", "Elles ont perdu l'usage du sexe", ["Elles n'ont jamais eu d'ancêtre sexué", "Elles proviennent toutes d'une seule espèce végétale", "Elles se reproduisent obligatoirement par fécondation externe"]),

  qcu("br-pb-21", "gametes", "Comment appelle-t-on la production des gamètes ?", "La gamétogenèse correspond à la production des cellules reproductrices spécialisées appelées gamètes.", "La gamétogenèse", ["La nidation", "La folliculogenèse", "La sénescence"]),
  qcu("br-pb-22", "gametes", "Quel est le résultat chromosomique de la fécondation entre deux gamètes haploïdes ?", "La fécondation associe deux lots haploïdes et forme une cellule diploïde appelée zygote.", "Une cellule diploïde appelée zygote", ["Une cellule haploïde appelée spore", "Deux cellules haploïdes indépendantes", "Une cellule sans chromosomes"]),
  qcu("br-pb-23", "gametes", "Quelle situation correspond à une reproduction sexuée externe ?", "Dans une reproduction externe, les individus déposent leurs gamètes dans le milieu où se déroule la rencontre.", "Les gamètes sont déposés dans le milieu extérieur", ["Les gamètes se rencontrent uniquement dans une cavité interne", "Un individu produit un clone par mitose", "Un bourgeon se détache du parent"]),
  qcu("br-pb-24", "gametes", "Quel est le résultat typique de l'ovogenèse humaine décrit ?", "La division asymétrique aboutit à un ovule fonctionnel et à deux globules polaires.", "Un ovule fonctionnel et deux globules polaires", ["Quatre ovules mobiles", "Quatre spermatozoïdes", "Deux ovules et deux zygotes"]),
  qcu("br-pb-25", "gametes", "Combien de cellules différenciées une cellule engagée dans la spermatogenèse produit-elle ?", "Chaque cellule entrant en méiose lors de la spermatogenèse produit quatre cellules différenciées.", "Quatre cellules", ["Une cellule", "Deux cellules", "Huit cellules"]),
  qcm("br-pb-26", "gametes", "Quelles différences entre ovules et spermatozoïdes sont présentées ?", "Les ovules sont volumineux et peu mobiles, tandis que les spermatozoïdes sont petits et mobiles; les spermatozoïdes sont produits en plus grand nombre.", ["L'ovule est plus volumineux", "Le spermatozoïde est mobile"], ["Les ovules sont produits en plus grand nombre", "Les spermatozoïdes possèdent davantage de réserves que les ovules"]),
  qcu("br-pb-27", "gametes", "Chez l'humain, à combien de chromosomes passe une cellule lors de la réduction méiotique décrite ?", "La réduction chromatique fait passer le nombre de chromosomes de 46 à 23 dans les gamètes humains.", "De 46 à 23 chromosomes", ["De 23 à 46 chromosomes", "De 46 à 92 chromosomes", "De 23 à 12 chromosomes"]),
  qcu("br-pb-28", "gametes", "Quel mécanisme répartit au hasard les chromosomes homologues pendant la méiose ?", "La distribution aléatoire des chromosomes homologues contribue à créer des combinaisons génétiques différentes.", "La distribution aléatoire des chromosomes homologues", ["La nidation", "La réplication des cellules somatiques", "La fécondation externe uniquement"]),
  qcu("br-pb-29", "gametes", "Que désigne un crossing-over pendant la méiose ?", "Un crossing-over correspond à une recombinaison entre chromosomes homologues qui crée de nouvelles associations génétiques.", "Une recombinaison entre chromosomes homologues", ["La séparation de l'ovule de son globule polaire", "La division d'une bactérie en deux cellules", "La migration d'un testicule vers l'extérieur"]),
  qcm("br-pb-30", "gametes", "Quels processus contribuent à la variabilité génétique des descendants sexués ?", "Les mutations créent de nouvelles variantes génétiques; la méiose et la recombinaison en redistribuent les combinaisons.", ["Les mutations", "La recombinaison génétique"], ["La production de clones identiques par mitose uniquement", "La sénescence des tissus"]),
  qcu("br-pb-51", "gametes", "Quel coût la production de gamètes représente-t-elle pour la reproduction sexuée ?", "La fabrication de cellules spécialisées nécessite un surplus d'énergie, qui dépend notamment de la taille des œufs produits.", "Un surplus d'énergie", ["La disparition de toute hormone gonadique", "Une réduction du nombre de chromosomes à zéro", "La transformation des gamètes en cellules somatiques"]),
  qcu("br-pb-52", "gametes", "Quelle fonction est attribuée à la différence de forme entre gamètes mâles et femelles ?", "Leurs formes distinctes contribuent à éviter l'autofécondation.", "Éviter l'autofécondation", ["Permettre la mitose des gamètes", "Empêcher toute fécondation", "Rendre les deux gamètes également mobiles"]),
  qcu("br-pb-53", "gametes", "Quel est l'avantage reproductif de produire un très grand nombre de spermatozoïdes ?", "Explique que l'émission d'un grand nombre de spermatozoïdes augmente les chances qu'une fécondation ait lieu.", "Augmenter les chances de fécondation", ["Augmenter le nombre de chromosomes de chaque spermatozoïde", "Rendre les ovules mobiles", "Éviter la méiose"]),
  qcu("br-pb-54", "gametes", "Quelle condition de rencontre des individus est associée à la reproduction sexuée interne ?", "Dans la reproduction interne, les individus doivent se rencontrer et avoir un contact physique pour que les gamètes se réunissent.", "Une rencontre avec contact physique entre les individus", ["Le dépôt des gamètes dans un milieu extérieur", "La formation d'un clone par mitose", "La dispersion de spores dans l'air"]),
  qcm("br-pb-55", "gametes", "Quels avantages de la recombinaison sexuée dans un environnement changeant sont présentés ?", "La recombinaison peut associer rapidement des mutations favorables issues de lignées différentes et produire des combinaisons utiles face à de nouvelles conditions.", ["Associer des mutations favorables provenant de lignées différentes", "Produire de nouvelles combinaisons de caractères"], ["Empêcher toute variation entre les descendants", "Rendre les mutations indépendantes de la sélection naturelle"]),

  qcu("br-pb-31", "sexe", "Quel rôle du chromosome Y dans la détermination du sexe chez les mammifères est présenté ?", "Dans le modèle mammalien présenté, la présence du chromosome Y est associée à la différenciation des gonades mâles; son absence conduit au développement ovarien.", "Sa présence est associée à la formation des gonades mâles", ["Il détermine le sexe chez toutes les espèces animales", "Il est présent chez les femelles mammifères", "Il remplace les chromosomes autosomiques"]),
  qcu("br-pb-32", "sexe", "Pourquoi les femelles mammifères sont-elles dites homogamétiques ?", "Les femelles XX ne produisent que des gamètes portant un chromosome X.", "Elles possèdent XX et produisent des gamètes portant X", ["Elles possèdent XY et produisent deux types de gamètes", "Elles possèdent ZZ et produisent des gamètes Z ou W", "Elles ne produisent pas de gamètes"]),
  qcu("br-pb-33", "sexe", "Pourquoi les mâles mammifères sont-ils dits hétérogamétiques ?", "Un mâle XY produit deux populations de spermatozoïdes, portant X ou Y.", "Ils produisent des spermatozoïdes portant X ou Y", ["Ils produisent uniquement des ovules X", "Ils possèdent deux chromosomes Y dans tous les cas", "Ils produisent des gamètes portant toujours X et Y ensemble"]),
  qcu("br-pb-34", "sexe", "Quel mécanisme de détermination du sexe intervient chez la drosophile ?", "La détermination du sexe dépend d'un équilibre entre les déterminants associés au chromosome X et ceux portés par les autosomes; le chromosome Y n'est pas le déterminant central.", "Un rapport entre déterminants du chromosome X et des autosomes", ["La présence obligatoire d'un chromosome Y", "La température d'incubation des œufs uniquement", "La position de la larve dans une femelle"]),
  qcu("br-pb-35", "sexe", "Chez les oiseaux, quel système chromosomique est présenté pour la femelle et le mâle ?", "Chez les oiseaux, la femelle est hétérogamétique ZW et le mâle homogamétique ZZ.", "Femelle ZW et mâle ZZ", ["Femelle XX et mâle XY", "Femelle ZZ et mâle ZW", "Femelle XO et mâle XX"]),
  qcm("br-pb-36", "sexe", "Quels systèmes de détermination chromosomique sont mentionnés chez les reptiles ?", "Des systèmes XY/XX ou ZZ/ZW existent chez les reptiles, en plus de la détermination environnementale chez certaines espèces.", ["XY/XX", "ZZ/ZW"], ["Une détermination toujours identique chez tous les reptiles", "Un système fondé uniquement sur les groupes sanguins"]),
  qcu("br-pb-37", "sexe", "Comment la température influence-t-elle le sexe des alligators du Mississippi ?", "En dessous de 30 °C, les alligators du Mississippi donnent des femelles; au-dessus de 34 °C, ils donnent des mâles.", "En dessous de 30 °C, des femelles; au-dessus de 34 °C, des mâles", ["En dessous de 30 °C, des mâles; au-dessus de 34 °C, des femelles", "La température n'a aucun effet", "Toutes les températures produisent uniquement des femelles"]),
  qcu("br-pb-38", "sexe", "Chez Bonellia viridis, que devient une larve qui se développe au contact d'une femelle ?", "Dans l'exemple présenté, une larve ingérée ou en contact avec une femelle se développe en mâle; sans femelle, elle se développe en femelle.", "Elle se développe en mâle", ["Elle se développe toujours en femelle", "Elle devient un zygote", "Elle ne peut plus se développer"]),
  qcm("br-pb-39", "sexe", "Quels facteurs de détermination du sexe autres que les chromosomes sont décrits ?", "La température agit chez certains reptiles; chez Bonellia viridis, la position de la larve par rapport à une femelle influence son développement sexuel.", ["La température de développement", "La position de la larve dans son environnement"], ["La couleur des plumes", "La quantité de globules polaires"]),
  qcu("br-pb-40", "sexe", "De quels facteurs la détermination du sexe peut-elle dépendre ?", "Selon les espèces, la détermination du sexe peut dépendre des chromosomes, de l'environnement ou d'une combinaison de ces facteurs.", "Elle peut dépendre des chromosomes ou de l'environnement selon l'espèce", ["Elle dépend toujours du chromosome Y", "Elle dépend toujours de la température", "Elle est identique chez tous les animaux"]),
  qcu("br-pb-56", "sexe", "Comment se répartissent les 46 chromosomes humains ?", "Le caryotype humain présenté comprend 22 paires d'autosomes et une paire de chromosomes sexuels.", "22 paires d'autosomes et une paire de chromosomes sexuels", ["23 paires d'autosomes et aucun chromosome sexuel", "21 paires d'autosomes et deux paires sexuelles", "46 paires de chromosomes homologues"]),
  qcu("br-pb-57", "sexe", "Quels trois chromosomes sexuels sont cités chez Xiphophorus maculatus ?", "Les ?l?ments comprennent chez ce poisson les chromosomes sexuels W, X et Y.", "W, X et Y", ["X, Y et Z", "Z, W et V", "XX, XY et ZZ"]),
  qcu("br-pb-58", "sexe", "Quelle particularité chromosomique est décrite chez le singe hibou ?", "Décrit une structure spécifique du sexe associée à un chromosome X porté par l'autosome 17 chez le mâle, tandis qu'elle est absente chez la femelle.", "Une structure sexe-spécifique associée à un X porté par l'autosome 17", ["Un chromosome Y présent uniquement chez la femelle", "Un système ZW identique à celui des oiseaux", "Une détermination du sexe par la température uniquement"]),
  qcu("br-pb-59", "sexe", "Chez combien d'espèces d'amphibiens des systèmes chromosomiques de détermination du sexe ont-ils été identifiés ?", "Des systèmes XY/XX ou ZZ/ZW ont été identifiés chez un petit nombre d'espèces d'amphibiens.", "Chez peu d'espèces", ["Chez toutes les espèces", "Chez les seuls reptiles", "Chez les seuls oiseaux"]),
  qcm("br-pb-60", "sexe", "Quelles caractéristiques du chromosome W chez les oiseaux sont mentionnées ?", "Le chromosome W est décrit comme plus petit que Z et presque entièrement constitué d'hétérochromatine.", ["Il est plus petit que le chromosome Z", "Il est presque entièrement constitué d'hétérochromatine"], ["Il est plus grand que le chromosome Z", "Il est présent en deux copies chez le mâle"]),
];

export const biologieReproductionQuizzes: QuizSeed[] = [
  {
    titre: "Biologie de la reproduction — L3 (S5)",
    type: "global",
    formationCible: "L3 Biologie",
    questionIds: biologieReproductionQuestions.map((question) => question.id),
  },
];