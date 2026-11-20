import assert from "node:assert/strict";
import test from "node:test";
import {
  biologieReproductionMatiere,
  biologieReproductionQuestions,
  biologieReproductionQuizzes,
} from "./biologie-reproduction";
import {
  biologiePhysiologieReproductionMatiere,
  biologiePhysiologieReproductionQuestions,
  biologiePhysiologieReproductionQuizzes,
} from "./biologie-physiologie-reproduction";
import { creerQuizMatiereParNiveau, creerQuizNotionParNiveau } from "../../lib/quizSeedGroups";

const matieres = [
  {
    matiere: biologieReproductionMatiere,
    questions: biologieReproductionQuestions,
    quizzes: biologieReproductionQuizzes,
    nombreNotions: 4,
    questionsParNotion: 15,
  },
  {
    matiere: biologiePhysiologieReproductionMatiere,
    questions: biologiePhysiologieReproductionQuestions,
    quizzes: biologiePhysiologieReproductionQuizzes,
    nombreNotions: 3,
    questionsParNotion: 20,
  },
];

test("les deux matières de reproduction sont distinctes et ciblent L3 Biologie", () => {
  assert.notEqual(biologieReproductionMatiere.nom, biologiePhysiologieReproductionMatiere.nom);
  for (const { matiere, quizzes } of matieres) {
    assert.ok(matiere.nom.includes("reproduction"));
    assert.equal(quizzes.length, 1);
    assert.equal(quizzes[0].formationCible, "L3 Biologie");
    assert.match(quizzes[0].titre, /L3 \(S5\)/);
  }
});

test("chaque notion du semestre 5 contient des QCM/QCU de niveau licence 3 sans doublon", () => {
  const idsToutesMatieres = new Set<string>();
  const intitulesToutesMatieres = new Set<string>();

  for (const { questions, nombreNotions, questionsParNotion: nombreQuestionsParNotion } of matieres) {
    const questionsParNotion = new Map<string, typeof questions>();
    for (const question of questions) {
      const questionsDeLaNotion = questionsParNotion.get(question.notion) ?? [];
      questionsDeLaNotion.push(question);
      questionsParNotion.set(question.notion, questionsDeLaNotion);
      assert.equal(idsToutesMatieres.has(question.id), false, question.id);
      idsToutesMatieres.add(question.id);
      assert.equal(intitulesToutesMatieres.has(question.intitule), false, question.intitule);
      intitulesToutesMatieres.add(question.intitule);
      assert.equal(question.niveau, 3, question.id);
      assert.ok(question.type === "qcm" || question.type === "qcu", question.id);
      assert.equal(question.reponses?.length, 4, question.id);
      const nombreBonnesReponses = question.reponses?.filter((reponse) => reponse.correcte).length;
      assert.equal(
        question.type === "qcu" ? nombreBonnesReponses === 1 : (nombreBonnesReponses ?? 0) > 1,
        true,
        question.id,
      );
    }

    assert.equal(questionsParNotion.size, nombreNotions);
    for (const [notion, questionsDeLaNotion] of questionsParNotion) {
      assert.match(notion, /\(S5\)$/);
      assert.equal(questionsDeLaNotion.length, nombreQuestionsParNotion, notion);
    }
  }
});

test("le mécanisme existant génère les quiz par notion et le quiz matière L3", () => {
  for (const { matiere, questions, quizzes, nombreNotions } of matieres) {
    const quizNotions = creerQuizNotionParNiveau(questions, [], quizzes);
    const quizMatiere = creerQuizMatiereParNiveau(matiere.nom, questions, quizzes);

    assert.equal(quizNotions.length, nombreNotions);
    assert.ok(quizNotions.every((quiz) => quiz.niveauCible === 3));
    assert.equal(quizMatiere.length, 1);
    assert.equal(quizMatiere[0].niveauCible, 3);
    assert.deepEqual(new Set(quizzes[0].questionIds), new Set(questions.map((question) => question.id)));
  }
});