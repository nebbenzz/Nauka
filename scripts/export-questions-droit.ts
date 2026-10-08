import { writeFile } from "node:fs/promises";
import path from "node:path";
import { droitQuestions } from "../src/data/seed/droit";

const questionsParNotion = new Map<string, typeof droitQuestions>();

for (const question of droitQuestions) {
  const groupe = questionsParNotion.get(question.notion) ?? [];
  groupe.push(question);
  questionsParNotion.set(question.notion, groupe);
}

const lignes = [
  "# Questions de la matière Droit",
  "",
  `Corpus : ${droitQuestions.length} questions réparties entre ${questionsParNotion.size} notions.`,
  "",
  "Les questions de la Licence Droit de La Rochelle sont regroupées sous leur notion et classées par niveau.",
  "",
  ...[...questionsParNotion.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "fr"))
    .flatMap(([notion, groupe]) => [
      `## ${notion} (${groupe.length})`,
      "",
      "| Niveau | Type | ID | Question |",
      "| --- | --- | --- | --- |",
      ...groupe
        .sort((a, b) => a.niveau - b.niveau || a.id.localeCompare(b.id, "fr"))
        .map((question) => {
          const intitule = question.intitule.replace(/\s+/g, " ").replace(/\|/g, "\\|");
          return `| L${question.niveau} | ${question.type.toUpperCase()} | ${question.id} | ${intitule} |`;
        }),
      "",
    ]),
];

const cheminSortie = path.resolve("src/data/seed/questions-droit.md");
await writeFile(cheminSortie, `${lignes.join("\n")}\n`, "utf8");
console.log(`Liste générée : ${cheminSortie} (${droitQuestions.length} questions, ${questionsParNotion.size} notions).`);