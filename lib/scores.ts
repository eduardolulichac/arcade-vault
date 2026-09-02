// lib/scores.ts — puntuaciones guardadas en localStorage (av_scores)

const STORAGE_KEY = "av_scores";

export interface SavedScoreEntry {
  game: string; // Game.id
  score: number;
  name: string;
  at: number; // Date.now()
}

export function getScores(): SavedScoreEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveScore(entry: Omit<SavedScoreEntry, "at">): void {
  try {
    const all = getScores();
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // localStorage no disponible (modo privado) — falla silenciosamente
  }
}
