import { writeFile } from "node:fs/promises";
import path from "node:path";
import { informatiqueQuestions } from "../src/data/seed/informatique";
import { btsInformatiqueQuestions } from "../src/data/seed/bts-informatique";

const questions = [...informatiqueQuestions, ...btsInformatiqueQuestions];
const questionsParNotion = new Map<string, typeof questions>();

for (const question of questions) {
  const groupe = questionsParNotion.get(question.notion) ?? [];
  groupe.push(question);
  questionsParNotion.set(question.notion, groupe);
}

const lignes = [
  "# Questions de la matière Informatique",
  "",
  `Corpus : ${questions.length} questions réparties entre ${questionsParNotion.size} notions.`,
  "",
  "Les questions BTS SIO sont incluses, car elles partagent la matière « Informatique » dans les seeds.",
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

const cheminSortie = path.resolve("src/data/seed/questions-informatique.md");
await writeFile(cheminSortie, `${lignes.join("\n")}\n`, "utf8");
console.log(`Liste générée : ${cheminSortie} (${questions.length} questions, ${questionsParNotion.size} notions).`);