export interface QuizDraft {
  selections: Record<string, string[]>;
  reponsesAvancees: Record<string, string>;
  questionsIds: string[];
  updatedAt: string;
}

type StorageLike = Storage | Map<string, string>;

function readStorageItem(storage: StorageLike, key: string): string | null {
  if (storage instanceof Map) {
    return storage.get(key) ?? null;
  }
  return storage.getItem(key);
}

function writeStorageItem(storage: StorageLike, key: string, value: string) {
  if (storage instanceof Map) {
    storage.set(key, value);
    return;
  }
  storage.setItem(key, value);
}

function deleteStorageItem(storage: StorageLike, key: string) {
  if (storage instanceof Map) {
    storage.delete(key);
    return;
  }
  storage.removeItem(key);
}

export function getDraftStorageKey(quizId: string, userId: string): string {
  return `notio:quiz:draft:${userId}:${quizId}`;
}

export function saveQuizDraft(
  quizId: string,
  userId: string,
  draft: QuizDraft,
  storage: StorageLike = globalThis.localStorage
) {
  try {
    writeStorageItem(storage, getDraftStorageKey(quizId, userId), JSON.stringify(draft));
  } catch {
    // Ignore when the browser blocks local storage.
  }
}

export function readQuizDraft(
  quizId: string,
  userId: string,
  storage: StorageLike = globalThis.localStorage
): QuizDraft | null {
  try {
    const value = readStorageItem(storage, getDraftStorageKey(quizId, userId));
    if (!value) return null;

    const parsed = JSON.parse(value) as Partial<QuizDraft>;
    if (!parsed || typeof parsed !== "object") return null;

    return {
      selections: parsed.selections ?? {},
      reponsesAvancees: parsed.reponsesAvancees ?? {},
      questionsIds: Array.isArray(parsed.questionsIds) ? parsed.questionsIds.filter((questionId): questionId is string => typeof questionId === "string") : [],
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function getQuestionsFromDraft<T extends { id: string }>(
  draft: QuizDraft | null | undefined,
  questions: T[]
): T[] {
  if (!draft || draft.questionsIds.length === 0) {
    return questions;
  }

  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const orderedQuestions = draft.questionsIds
    .map((questionId) => questionsById.get(questionId))
    .filter((question): question is T => Boolean(question));

  return orderedQuestions.length > 0 ? orderedQuestions : questions;
}

export function clearQuizDraft(
  quizId: string,
  userId: string,
  storage: StorageLike = globalThis.localStorage
) {
  try {
    deleteStorageItem(storage, getDraftStorageKey(quizId, userId));
  } catch {
    // Ignore when the browser blocks local storage.
  }
}
