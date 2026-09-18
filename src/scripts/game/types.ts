export type BallColor =
  | 'ruby-red'
  | 'amber-orange'
  | 'golden-yellow'
  | 'emerald-green'
  | 'sapphire-blue'
  | 'amethyst-purple'
  | 'sakura-pink'
  | 'ocean-cyan'
  | 'forest-lime'
  | 'chocolate-brown';

export interface ColorDef {
  id: BallColor;
  name: string;
  gradient: [string, string];
  glow: string;
  woodTone: string;
  icon?: string;
}

export interface LevelConfig {
  id: number;
  name?: string;
  isSecret?: boolean;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Master' | 'Hidden';
  capacity: number; // usually 4
  tubes: BallColor[][]; // array of tubes, bottom to top
  parMoves?: number;
}

export interface MoveStep {
  fromTube: number;
  toTube: number;
  ball: BallColor;
  count: number;
}

export interface GameStats {
  moves: number;
  startTime: number;
  elapsedSeconds: number;
  undoCount: number;
  hintsUsed: number;
  extraTubesUsed: number;
  isCompleted: boolean;
}

export type TubeTheme = 'oak' | 'walnut' | 'bamboo' | 'mahogany' | 'cedar';
export type BallSkin = 'glossy' | 'wooden' | 'gemstone' | 'nature' | 'metallic';

export interface UserProgress {
  unlockedLevel: number;
  stars: Record<number, number>; // levelId -> stars (1-3)
  bestMoves: Record<number, number>;
  unlockedSecrets: number[];
  coins: number;
  selectedTheme: TubeTheme;
  selectedSkin: BallSkin;
  soundEnabled: boolean;
  ambientEnabled: boolean;
  hapticEnabled: boolean;
}
