import type { UserProgress, TubeTheme, BallSkin } from './types';

const STORAGE_KEY = 'woody_sort_game_progress_v1';

const DEFAULT_PROGRESS: UserProgress = {
  unlockedLevel: 1,
  stars: {},
  bestMoves: {},
  unlockedSecrets: [],
  coins: 150,
  selectedTheme: 'oak',
  selectedSkin: 'glossy',
  soundEnabled: true,
  ambientEnabled: false,
  hapticEnabled: true,
};

export function loadProgress(): UserProgress {
  if (typeof window === 'undefined') return DEFAULT_PROGRESS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PROGRESS, ...parsed };
  } catch (err) {
    console.error('Failed to load progress from localStorage', err);
    return DEFAULT_PROGRESS;
  }
}

export function saveProgress(progress: UserProgress): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (err) {
    console.error('Failed to save progress to localStorage', err);
  }
}

export function updateLevelCompleted(
  levelId: number,
  moves: number,
  parMoves: number = 20
): { newStars: number; earnedCoins: number; isNewRecord: boolean } {
  const progress = loadProgress();

  // Calculate stars: 3 stars if <= parMoves, 2 stars if <= parMoves * 1.5, 1 star otherwise
  let stars = 1;
  if (moves <= parMoves) {
    stars = 3;
  } else if (moves <= Math.ceil(parMoves * 1.5)) {
    stars = 2;
  }

  const previousStars = progress.stars[levelId] || 0;
  const previousBest = progress.bestMoves[levelId] || Infinity;
  const isNewRecord = moves < previousBest;

  if (stars > previousStars) {
    progress.stars[levelId] = stars;
  }
  if (isNewRecord) {
    progress.bestMoves[levelId] = moves;
  }

  // Coins earned
  const earnedCoins = stars * 25 + (isNewRecord ? 20 : 0);
  progress.coins += earnedCoins;

  // Unlock next level
  if (levelId === progress.unlockedLevel && levelId < 100) {
    progress.unlockedLevel = levelId + 1;
  }

  // Check hidden level unlock condition (e.g. 15 total stars unlocks hidden 101, 30 stars unlocks 102, etc.)
  const totalStars = Object.values(progress.stars).reduce((a, b) => a + b, 0);
  if (totalStars >= 10 && !progress.unlockedSecrets.includes(101)) {
    progress.unlockedSecrets.push(101);
  }
  if (totalStars >= 25 && !progress.unlockedSecrets.includes(102)) {
    progress.unlockedSecrets.push(102);
  }
  if (totalStars >= 45 && !progress.unlockedSecrets.includes(103)) {
    progress.unlockedSecrets.push(103);
  }
  if (totalStars >= 65 && !progress.unlockedSecrets.includes(104)) {
    progress.unlockedSecrets.push(104);
  }
  if (totalStars >= 90 && !progress.unlockedSecrets.includes(105)) {
    progress.unlockedSecrets.push(105);
  }

  saveProgress(progress);
  return { newStars: stars, earnedCoins, isNewRecord };
}
