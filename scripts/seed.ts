import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { informatiqueMatiere, informatiqueQuestions, informatiqueQuizzes } from "../src/data/seed/informatique";
import { droitMatiere, droitQuestions, droitQuizzes } from "../src/data/seed/droit";
import { sciencesVieMatiere, sciencesVieQuestions, sciencesVieQuizzes } from "../src/data/seed/sciences-vie";
import { btsGestionMatiere, btsGestionQuestions, btsGestionQuizzes } from "../src/data/seed/bts-gestion";
import type { QuestionSeed, QuizSeed } from "../src/data/seed/types";
import { btsInformatiqueQuestions, btsInformatiqueQuizzes } from "../src/data/seed/bts-informatique";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const MAX_QUESTIONS_PAR_QUIZ = 10;

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

async function seedMatiere(
  matiere: { nom: string; description: string },
  questions: QuestionSeed[],
  quizzes: QuizSeed[]
) {
  console.log(`\nMatière : ${matiere.nom}`);
  const matiereId = await upsertMatiere(matiere.nom, matiere.description);
  const idsParSlug: Record<string, string> = {};

  for (const q of questions) {
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
      console.log(`  - déjà présente : ${q.intitule}`);
    } else {
      const { data: inserted, error } = await supabase
        .from("questions")
        .insert({
          notion_id: notionId,
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

  for (const quiz of quizzes) {
    const questionIds = quiz.type === "global"
      ? questions.map((question) => question.id)
      : quiz.notionFiltre
        ? questions.filter((question) => question.notion === quiz.notionFiltre).map((question) => question.id)
        : quiz.questionIds.slice(0, MAX_QUESTIONS_PAR_QUIZ);
    let notionId: string | null = null;
    if (quiz.type === "notion" && quiz.notionFiltre) {
      const questionRef = questions.find((q) => q.notion === quiz.notionFiltre);
      notionId = await upsertNotion(matiereId, quiz.notionFiltre, questionRef?.niveau ?? 1);
    }

    const { data: quizExistant } = await supabase.from("quiz").select("id").eq("titre", quiz.titre).maybeSingle();
    if (quizExistant) {
      const { error: erreurMiseAJour } = await supabase
        .from("quiz")
        .update({
          type: quiz.type,
          matiere_id: matiereId,
          notion_id: notionId,
          formation_cible: quiz.formationCible ?? null,
          est_avance: quiz.estAvance ?? false,
          duree_secondes: quiz.dureeSecondes ?? null,
        })
        .eq("id", quizExistant.id);
      if (erreurMiseAJour) throw erreurMiseAJour;

      const { error: erreurSuppressionAnciennesLiaisons } = await supabase
        .from("quiz_questions")
        .delete()
        .eq("quiz_id", quizExistant.id);
      if (erreurSuppressionAnciennesLiaisons) throw erreurSuppressionAnciennesLiaisons;

      const liaisons = questionIds.map((slug, ordre) => ({
        quiz_id: quizExistant.id,
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

async function main() {
  await seedMatiere(
    informatiqueMatiere,
    [...informatiqueQuestions, ...btsInformatiqueQuestions],
    [...informatiqueQuizzes, ...btsInformatiqueQuizzes],
  );
  await seedMatiere(droitMatiere, droitQuestions, droitQuizzes);
  await seedMatiere(sciencesVieMatiere, sciencesVieQuestions, sciencesVieQuizzes);
  await seedMatiere(btsGestionMatiere, btsGestionQuestions, btsGestionQuizzes);
  console.log("\nSeeding terminé.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});