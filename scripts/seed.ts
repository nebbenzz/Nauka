import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { informatiqueMatiere, informatiqueQuestions, informatiqueQuizzes, quizzesAgregesInformatique, quizzesLicenceInformatiqueLaRochelle } from "../src/data/seed/informatique";
import { droitMatiere, droitQuestions, droitQuizzes, quizzesAgregesDroit, quizzesLicenceDroitLaRochelle } from "../src/data/seed/droit";
import { sciencesVieMatiere, sciencesVieQuestions, sciencesVieQuizzes } from "../src/data/seed/sciences-vie";
import { btsGestionMatiere, btsGestionQuestions, btsGestionQuizzes } from "../src/data/seed/bts-gestion";
import { btsInformatiqueQuestions, btsInformatiqueQuizzes } from "../src/data/seed/bts-informatique";
import { creerQuizMatiereParNiveau, creerQuizNotionParNiveau } from "../src/lib/quizSeedGroups";
import type { QuestionSeed, QuizSeed } from "../src/data/seed/types";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const MAX_QUESTIONS_PAR_QUIZ = 10;
const matieresDisponibles = new Set(["informatique", "licence-informatique", "droit", "licence-droit", "sciences-vie", "bts-gestion", "regroupements"]);
const matiereCible = process.argv[2]?.trim().toLowerCase();

async function upsertMatiere(nom: string, description: string): Promise<string> {
  const { data: existant } = await supabase.from("matieres").select("id").eq("nom", nom).maybeSingle();
  if (existant) return existant.id;
  const { data, error } = await supabase.from("matieres").insert({ nom, description }).select("id").single();
  if (error) throw error;
  return data.id;
}

async function upsertNotion(matiereId: string, nom: string, niveau: number): Promise<string> {
  const { data: existant } = await supabase
    .from("notions")
    .select("id")
    .eq("matiere_id", matiereId)
    .eq("nom", nom)
    .maybeSingle();
  if (existant) {
    await supabase.from("notions").update({ niveau }).eq("id", existant.id);
    return existant.id;
  }
  const { data, error } = await supabase
    .from("notions")
    .insert({ matiere_id: matiereId, nom, niveau })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function chargerIdsQuestionsExistantes(matiereId: string, questions: QuestionSeed[]): Promise<Record<string, string>> {
  const nomsNotions = [...new Set(questions.map((question) => question.notion))];
  const { data: notions, error: erreurNotions } = await supabase
    .from("notions")
    .select("id, nom")
    .eq("matiere_id", matiereId)
    .in("nom", nomsNotions);
  if (erreurNotions) throw erreurNotions;

  const nomParNotionId = new Map((notions || []).map((notion) => [notion.id as string, notion.nom as string]));
  if (nomParNotionId.size !== nomsNotions.length) {
    throw new Error("Certaines notions du pool n'existent pas encore en base ; exécute d'abord le seed de cette matière.");
  }

  const { data: questionsExistantes, error: erreurQuestions } = await supabase
    .from("questions")
    .select("id, intitule, notion_id")
    .in("notion_id", [...nomParNotionId.keys()]);
  if (erreurQuestions) throw erreurQuestions;

  const idParContenu = new Map<string, string>();
  for (const question of questionsExistantes || []) {
    const notion = nomParNotionId.get(question.notion_id as string);
    if (notion) idParContenu.set(`${notion}\u0000${question.intitule}`, question.id);
  }

  const idsParSlug: Record<string, string> = {};
  for (const question of questions) {
    const questionId = idParContenu.get(`${question.notion}\u0000${question.intitule}`);
    if (!questionId) throw new Error(`Question absente de la base pour le pool agrégé : ${question.intitule}`);
    idsParSlug[question.id] = questionId;
  }
  return idsParSlug;
}

async function seedMatiere(
  matiere: { nom: string; description: string },
  questions: QuestionSeed[],
  quizzes: QuizSeed[],
  seulementGroupes = false,
) {
  console.log(`\nMatière : ${matiere.nom}`);
  const matiereId = await upsertMatiere(matiere.nom, matiere.description);
  const idsParSlug = seulementGroupes
    ? await chargerIdsQuestionsExistantes(matiereId, questions)
    : {};
  const questionsACharger = seulementGroupes ? [] : questions;
  const notionsAgregees = quizzes.flatMap((quiz) => quiz.notionsIncluses ?? []);
  const quizNotionsParNiveau = seulementGroupes ? [] : creerQuizNotionParNiveau(questions, notionsAgregees, quizzes);
  const quizMatiereParNiveau = seulementGroupes ? [] : creerQuizMatiereParNiveau(matiere.nom, questions, quizzes);
  const tousLesQuiz = [...quizzes, ...quizNotionsParNiveau, ...quizMatiereParNiveau];

  for (const q of questionsACharger) {
    const notionId = await upsertNotion(matiereId, q.notion, q.niveau);

    const { data: existante } = await supabase
      .from("questions")
      .select("id")
      .eq("notion_id", notionId)
      .eq("intitule", q.intitule)
      .maybeSingle();

    let questionId: string;
    if (existante) {
      questionId = existante.id;
      const { error: erreurMiseAJourNiveau } = await supabase
        .from("questions")
        .update({ niveau: q.niveau })
        .eq("id", questionId);
      if (erreurMiseAJourNiveau) throw erreurMiseAJourNiveau;
      console.log(`  - déjà présente : ${q.intitule}`);
    } else {
      const { data: inserted, error } = await supabase
        .from("questions")
        .insert({
          notion_id: notionId,
          niveau: q.niveau,
          type: q.type,
          intitule: q.intitule,
          explication: q.explication,
          difficulte: 1,
          points: q.points ?? 1,
          source: "manuel",
        })
        .select("id")
        .single();
      if (error) throw error;
      questionId = inserted.id;

      if (q.criteresEvaluation) {
        const { error: erreurCriteres } = await supabase.from("criteres_evaluation").insert({
          question_id: questionId,
          langage: q.criteresEvaluation.langage ?? null,
          code_reference: q.criteresEvaluation.codeReference ?? null,
          tests_json: q.criteresEvaluation.testsJson ?? null,
          criteres_ia: q.criteresEvaluation.criteresIa ?? null,
          penalite_points: q.criteresEvaluation.penalitePoints ?? 0,
        });
        if (erreurCriteres) throw erreurCriteres;
      }

      console.log(`  + créée : ${q.intitule}`);
    }

    if (q.reponses?.length) {
      const { data: reponsesExistantes, error: erreurLectureReponses } = await supabase
        .from("reponses")
        .select("ordre")
        .eq("question_id", questionId);
      if (erreurLectureReponses) throw erreurLectureReponses;

      const ordresExistants = new Set((reponsesExistantes || []).map((reponse) => reponse.ordre));
      const reponsesAInserer = q.reponses
        .map((reponse, ordre) => ({
          question_id: questionId,
          texte: reponse.texte,
          est_correcte: reponse.correcte,
          ordre,
        }))
        .filter((reponse) => !ordresExistants.has(reponse.ordre));

      if (reponsesAInserer.length) {
        const { error: erreurReponses } = await supabase.from("reponses").insert(reponsesAInserer);
        if (erreurReponses) throw erreurReponses;
      }
    }

    idsParSlug[q.id] = questionId;
  }

  for (const quiz of tousLesQuiz) {
    const questionsIncluses = questions.filter((question) =>
      (quiz.niveauxInclus
        ? quiz.niveauxInclus.includes(question.niveau)
        : quiz.niveauCible === undefined || question.niveau === quiz.niveauCible)
      && (!quiz.notionsIncluses || quiz.notionsIncluses.includes(question.notion)),
    );
    const questionIds = quiz.type === "global"
      ? questionsIncluses.map((question) => question.id)
      : quiz.notionFiltre
        ? questionsIncluses.filter((question) => question.notion === quiz.notionFiltre).map((question) => question.id)
        : quiz.questionIds.slice(0, MAX_QUESTIONS_PAR_QUIZ);
    let notionId: string | null = null;
    if (quiz.notionFiltre) {
      const questionRef = questions.find((q) => q.notion === quiz.notionFiltre);
      notionId = await upsertNotion(matiereId, quiz.notionFiltre, quiz.niveauPremiereDecouverte ?? quiz.niveauNotion ?? questionRef?.niveau ?? 1);
    }

    const { data: quizExistant } = await supabase
      .from("quiz")
      .select("id")
      .eq("titre", quiz.titre)
      .eq("matiere_id", matiereId)
      .maybeSingle();
    let quizAActualiser = quizExistant;
    if (!quizAActualiser && quiz.type === "notion") {
      const { data: quizAvecAncienTitre, error: erreurAncienTitre } = await supabase
        .from("quiz")
        .select("id")
        .eq("titre", `${matiere.nom === "Droit" ? "Licence Droit" : "Licence Informatique"} — ${quiz.titre}`)
        .eq("matiere_id", matiereId)
        .maybeSingle();
      if (erreurAncienTitre) throw erreurAncienTitre;
      quizAActualiser = quizAvecAncienTitre;
    }

    if (quizAActualiser) {
      const { error: erreurMiseAJour } = await supabase
        .from("quiz")
        .update({
          titre: quiz.titre,
          type: quiz.type,
          matiere_id: matiereId,
          notion_id: notionId,
          formation_cible: quiz.formationCible ?? null,
          est_avance: quiz.estAvance ?? false,
          duree_secondes: quiz.dureeSecondes ?? null,
          niveau_cible: quiz.niveauCible ?? null,
          niveau_premiere_decouverte: quiz.niveauPremiereDecouverte ?? null,
        })
        .eq("id", quizAActualiser.id);
      if (erreurMiseAJour) throw erreurMiseAJour;

      const { error: erreurSuppressionAnciennesLiaisons } = await supabase
        .from("quiz_questions")
        .delete()
        .eq("quiz_id", quizAActualiser.id);
      if (erreurSuppressionAnciennesLiaisons) throw erreurSuppressionAnciennesLiaisons;

      const liaisons = questionIds.map((slug, ordre) => ({
        quiz_id: quizAActualiser.id,
        question_id: idsParSlug[slug],
        ordre,
      }));
      const { error: erreurNouvellesLiaisons } = await supabase.from("quiz_questions").insert(liaisons);
      if (erreurNouvellesLiaisons) throw erreurNouvellesLiaisons;
      console.log(`  quiz actualisé : ${quiz.titre}`);
      continue;
    }

    const { data: quizInsere, error } = await supabase
      .from("quiz")
      .insert({
        titre: quiz.titre,
        type: quiz.type,
        matiere_id: matiereId,
        notion_id: notionId,
        created_by: null,
        is_public: true,
        formation_cible: quiz.formationCible ?? null,
        est_avance: quiz.estAvance ?? false,
        duree_secondes: quiz.dureeSecondes ?? null,
        niveau_cible: quiz.niveauCible ?? null,
        niveau_premiere_decouverte: quiz.niveauPremiereDecouverte ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;

    const liaisons = questionIds.map((slug, ordre) => ({
      quiz_id: quizInsere.id,
      question_id: idsParSlug[slug],
      ordre,
    }));
    const { error: erreurLiaisons } = await supabase.from("quiz_questions").insert(liaisons);
    if (erreurLiaisons) throw erreurLiaisons;

    console.log(`  + quiz créé : ${quiz.titre}`);
  }
}

function filtrerQuestionsPourQuizzes(questions: QuestionSeed[], quizzes: QuizSeed[]): QuestionSeed[] {
  const notionsCibles = new Set(quizzes.flatMap((quiz) => [
    ...(quiz.notionFiltre ? [quiz.notionFiltre] : []),
    ...(quiz.notionsIncluses ?? []),
  ]));
  return questions.filter((question) => notionsCibles.has(question.notion));
}

async function main() {
  if (matiereCible && !matieresDisponibles.has(matiereCible)) {
    throw new Error(`Matière inconnue : ${matiereCible}. Valeurs possibles : ${[...matieresDisponibles].join(", ")}`);
  }

  if (matiereCible === "licence-informatique") {
    const quizzesCibles = [...quizzesLicenceInformatiqueLaRochelle, ...quizzesAgregesInformatique];
    const questionsCibles = filtrerQuestionsPourQuizzes([...informatiqueQuestions, ...btsInformatiqueQuestions], quizzesCibles);
    await seedMatiere(informatiqueMatiere, questionsCibles, quizzesCibles);
  }

  if (matiereCible === "licence-droit") {
    const quizzesCibles = [...quizzesLicenceDroitLaRochelle, ...quizzesAgregesDroit];
    const questionsCibles = filtrerQuestionsPourQuizzes(droitQuestions, quizzesCibles);
    await seedMatiere(droitMatiere, questionsCibles, quizzesCibles);
  }

  if (matiereCible === "regroupements") {
    await seedMatiere(informatiqueMatiere, [...informatiqueQuestions, ...btsInformatiqueQuestions], quizzesAgregesInformatique, true);
    await seedMatiere(droitMatiere, droitQuestions, quizzesAgregesDroit, true);
  }

  if (!matiereCible || matiereCible === "informatique") {
    await seedMatiere(
      informatiqueMatiere,
      [...informatiqueQuestions, ...btsInformatiqueQuestions],
      [...informatiqueQuizzes, ...btsInformatiqueQuizzes],
    );
  }
  if (!matiereCible || matiereCible === "droit") await seedMatiere(droitMatiere, droitQuestions, droitQuizzes);
  if (!matiereCible || matiereCible === "sciences-vie") await seedMatiere(sciencesVieMatiere, sciencesVieQuestions, sciencesVieQuizzes);
  if (!matiereCible || matiereCible === "bts-gestion") await seedMatiere(btsGestionMatiere, btsGestionQuestions, btsGestionQuizzes);
  console.log("\nSeeding terminé.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});