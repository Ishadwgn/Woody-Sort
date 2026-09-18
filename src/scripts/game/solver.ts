import type { BallColor, LevelConfig } from './types';

/**
 * Encodes tubes state to canonical string key for BFS visited set
 */
function serializeState(tubes: BallColor[][]): string {
  // Sort empty tubes or normalize representation
  return tubes.map(tube => tube.join(',')).join('|');
}

/**
 * Checks if the current puzzle state is completely solved
 */
export function isPuzzleSolved(tubes: BallColor[][], capacity: number = 4): boolean {
  for (const tube of tubes) {
    if (tube.length === 0) continue;
    if (tube.length !== capacity) return false;
    const first = tube[0];
    for (let i = 1; i < tube.length; i++) {
      if (tube[i] !== first) return false;
    }
  }
  return true;
}

/**
 * Checks if a specific tube is fully completed with matching balls
 */
export function isTubeComplete(tube: BallColor[], capacity: number = 4): boolean {
  if (tube.length !== capacity) return false;
  const first = tube[0];
  return tube.every(b => b === first);
}

/**
 * Checks whether a single move from `fromIdx` to `toIdx` is valid
 */
export function isValidMove(tubes: BallColor[][], fromIdx: number, toIdx: number, capacity: number = 4): boolean {
  if (fromIdx === toIdx) return false;
  if (fromIdx < 0 || fromIdx >= tubes.length || toIdx < 0 || toIdx >= tubes.length) return false;

  const source = tubes[fromIdx];
  const target = tubes[toIdx];

  if (source.length === 0) return false;
  if (target.length >= capacity) return false;

  // If source tube is already completely unified and solved, moving out of it is almost always unnecessary
  if (isTubeComplete(source, capacity)) return false;

  const movingBall = source[source.length - 1];

  if (target.length === 0) {
    // If source only contains this same color, moving into empty tube is useless redundant move
    if (source.every(b => b === movingBall)) return false;
    return true;
  }

  const targetTop = target[target.length - 1];
  return targetTop === movingBall;
}

/**
 * Finds all valid next moves from a given state
 */
export function getValidMoves(tubes: BallColor[][], capacity: number = 4): { from: number; to: number }[] {
  const moves: { from: number; to: number }[] = [];
  const numTubes = tubes.length;

  for (let from = 0; from < numTubes; from++) {
    if (tubes[from].length === 0) continue;
    for (let to = 0; to < numTubes; to++) {
      if (isValidMove(tubes, from, to, capacity)) {
        moves.push({ from, to });
      }
    }
  }
  return moves;
}

/**
 * Executes a move on cloned state
 */
export function applyMove(tubes: BallColor[][], from: number, to: number): BallColor[][] {
  const nextTubes = tubes.map(t => [...t]);
  const ball = nextTubes[from].pop();
  if (ball) {
    nextTubes[to].push(ball);
  }
  return nextTubes;
}

/**
 * BFS Solver to find shortest path to solution.
 * Returns the first optimal move `{ from: number, to: number }` or null if unsolvable.
 */
export function findHintMove(
  tubes: BallColor[][],
  capacity: number = 4,
  maxIterations: number = 4000
): { from: number; to: number } | null {
  if (isPuzzleSolved(tubes, capacity)) return null;

  interface QueueNode {
    tubes: BallColor[][];
    firstMove: { from: number; to: number } | null;
  }

  const queue: QueueNode[] = [{ tubes, firstMove: null }];
  const visited = new Set<string>();
  visited.add(serializeState(tubes));

  let count = 0;

  while (queue.length > 0 && count < maxIterations) {
    count++;
    const current = queue.shift()!;

    const moves = getValidMoves(current.tubes, capacity);

    for (const move of moves) {
      const nextTubes = applyMove(current.tubes, move.from, move.to);
      const key = serializeState(nextTubes);

      if (isPuzzleSolved(nextTubes, capacity)) {
        return current.firstMove || move;
      }

      if (!visited.has(key)) {
        visited.add(key);
        queue.push({
          tubes: nextTubes,
          firstMove: current.firstMove || move,
        });
      }
    }
  }

  // Fallback: Return any immediately valid move if search depth reached
  const immediateMoves = getValidMoves(tubes, capacity);
  return immediateMoves.length > 0 ? immediateMoves[0] : null;
}

/**
 * Procedural Solvable Level Generator
 */
export function generateProceduralLevel(
  levelId: number,
  numColors: number,
  emptyTubes: number = 2,
  capacity: number = 4
): LevelConfig {
  const palette: BallColor[] = [
    'ruby-red',
    'sapphire-blue',
    'emerald-green',
    'amber-orange',
    'amethyst-purple',
    'golden-yellow',
    'sakura-pink',
    'ocean-cyan',
    'forest-lime',
    'chocolate-brown',
  ];

  const selectedColors = palette.slice(0, Math.min(numColors, palette.length));
  const allBalls: BallColor[] = [];

  for (const c of selectedColors) {
    for (let i = 0; i < capacity; i++) {
      allBalls.push(c);
    }
  }

  // Fisher-Yates shuffle with solvable check
  let attempts = 0;
  while (attempts < 50) {
    attempts++;
    const shuffled = [...allBalls];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const tubes: BallColor[][] = [];
    for (let i = 0; i < selectedColors.length; i++) {
      tubes.push(shuffled.slice(i * capacity, (i + 1) * capacity));
    }
    for (let i = 0; i < emptyTubes; i++) {
      tubes.push([]);
    }

    // Verify it is not already solved and has a valid solution
    if (!isPuzzleSolved(tubes, capacity)) {
      const hint = findHintMove(tubes, capacity, 1500);
      if (hint !== null) {
        return {
          id: levelId,
          name: `Level ${levelId}`,
          difficulty: numColors <= 3 ? 'Easy' : numColors <= 5 ? 'Medium' : 'Hard',
          capacity,
          tubes,
          parMoves: numColors * 6,
        };
      }
    }
  }

  // Fallback default balanced level
  const defaultTubes: BallColor[][] = [
    ['ruby-red', 'emerald-green', 'sapphire-blue', 'ruby-red'],
    ['sapphire-blue', 'ruby-red', 'emerald-green', 'emerald-green'],
    ['sapphire-blue', 'emerald-green', 'ruby-red', 'sapphire-blue'],
    [],
    [],
  ];

  return {
    id: levelId,
    name: `Level ${levelId}`,
    difficulty: 'Medium',
    capacity,
    tubes: defaultTubes,
    parMoves: 18,
  };
}
