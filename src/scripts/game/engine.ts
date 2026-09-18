import type { BallColor, LevelConfig, MoveStep, GameStats } from './types';
import { getLevel } from './levels';
import { isValidMove, isPuzzleSolved, isTubeComplete, findHintMove } from './solver';
import { sound } from './audio';
import { loadProgress, saveProgress, updateLevelCompleted } from './storage';
import confetti from 'canvas-confetti';

export class WoodySortEngine {
  private levelConfig!: LevelConfig;
  private currentLevelId: number = 1;
  private tubes: BallColor[][] = [];
  private capacity: number = 4;
  private selectedTubeIndex: number | null = null;
  private isAnimating: boolean = false;
  private moveHistory: { tubes: BallColor[][]; moves: number }[] = [];
  private stats: GameStats = {
    moves: 0,
    startTime: Date.now(),
    elapsedSeconds: 0,
    undoCount: 0,
    hintsUsed: 0,
    extraTubesUsed: 0,
    isCompleted: false,
  };
  private timerInterval: number | null = null;
  private containerElement: HTMLElement;
  private onStateChangeCallback?: (engine: WoodySortEngine) => void;
  private onWinCallback?: (stars: number, moves: number, coinsEarned: number) => void;

  constructor(container: HTMLElement) {
    this.containerElement = container;
  }

  public init(levelId: number = 1) {
    this.currentLevelId = levelId;
    this.levelConfig = getLevel(levelId);
    this.capacity = this.levelConfig.capacity || 4;
    this.tubes = this.levelConfig.tubes.map(tube => [...tube]);
    this.selectedTubeIndex = null;
    this.isAnimating = false;
    this.moveHistory = [];
    this.stats = {
      moves: 0,
      startTime: Date.now(),
      elapsedSeconds: 0,
      undoCount: 0,
      hintsUsed: 0,
      extraTubesUsed: 0,
      isCompleted: false,
    };

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = window.setInterval(() => {
      if (!this.stats.isCompleted) {
        this.stats.elapsedSeconds = Math.floor((Date.now() - this.stats.startTime) / 1000);
        this.notifyStateChange();
      }
    }, 1000);

    this.render();
    this.notifyStateChange();
  }

  public setCallbacks(
    onStateChange: (engine: WoodySortEngine) => void,
    onWin: (stars: number, moves: number, coinsEarned: number) => void
  ) {
    this.onStateChangeCallback = onStateChange;
    this.onWinCallback = onWin;
  }

  private notifyStateChange() {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this);
    }
  }

  public getLevelId(): number {
    return this.currentLevelId;
  }

  public getLevelConfig(): LevelConfig {
    return this.levelConfig;
  }

  public getStats(): GameStats {
    return this.stats;
  }

  public getTubes(): BallColor[][] {
    return this.tubes;
  }

  public getSelectedTube(): number | null {
    return this.selectedTubeIndex;
  }

  public canUndo(): boolean {
    return this.moveHistory.length > 0 && !this.stats.isCompleted && !this.isAnimating;
  }

  public canAddTube(): boolean {
    return this.stats.extraTubesUsed < 2 && !this.stats.isCompleted && !this.isAnimating;
  }

  /**
   * Handle tube click / selection
   */
  public async handleTubeClick(tubeIndex: number) {
    if (this.stats.isCompleted || this.isAnimating) return;

    // Clear any active hint highlights
    this.clearHintHighlights();

    if (this.selectedTubeIndex === null) {
      // Step 1: Select source tube if it has balls
      const sourceTube = this.tubes[tubeIndex];
      if (sourceTube.length === 0) {
        sound.playInvalid();
        this.shakeTube(tubeIndex);
        return;
      }

      // If tube is already full & completed, no need to touch
      if (isTubeComplete(sourceTube, this.capacity)) {
        sound.playWoodKnock(1.2);
        return;
      }

      this.selectedTubeIndex = tubeIndex;
      sound.playBallPop();
      this.render();
      this.notifyStateChange();
    } else if (this.selectedTubeIndex === tubeIndex) {
      // Deselect if clicked same tube
      this.selectedTubeIndex = null;
      sound.playWoodKnock(0.9);
      this.render();
      this.notifyStateChange();
    } else {
      // Step 2: Move from selectedTube to clicked tube
      const fromIdx = this.selectedTubeIndex;
      const toIdx = tubeIndex;

      if (isValidMove(this.tubes, fromIdx, toIdx, this.capacity)) {
        await this.executeMove(fromIdx, toIdx);
      } else {
        sound.playInvalid();
        this.shakeTube(toIdx);
        this.selectedTubeIndex = null;
        this.render();
        this.notifyStateChange();
      }
    }
  }

  /**
   * Execute ball transfer with cascading matching balls and audio
   */
  private async executeMove(fromIdx: number, toIdx: number) {
    this.isAnimating = true;

    // Save history before moving
    this.moveHistory.push({
      tubes: this.tubes.map(t => [...t]),
      moves: this.stats.moves,
    });

    const sourceTube = this.tubes[fromIdx];
    const targetTube = this.tubes[toIdx];
    const movingColor = sourceTube[sourceTube.length - 1];

    // Determine how many matching balls we can cascade move in one go!
    let matchingCount = 0;
    for (let i = sourceTube.length - 1; i >= 0; i--) {
      if (sourceTube[i] === movingColor) {
        matchingCount++;
      } else {
        break;
      }
    }
    const availableSpace = this.capacity - targetTube.length;
    const moveCount = Math.min(matchingCount, availableSpace);

    this.selectedTubeIndex = null;
    this.stats.moves += 1;

    // Move balls one by one with pleasant rhythm
    for (let i = 0; i < moveCount; i++) {
      const ball = this.tubes[fromIdx].pop()!;
      this.tubes[toIdx].push(ball);
      sound.playBallDrop(1.0 + i * 0.1);
      this.render();
      await new Promise(resolve => setTimeout(resolve, 140));
    }

    // Check if target tube is now completely solved
    if (isTubeComplete(this.tubes[toIdx], this.capacity)) {
      sound.playTubeComplete();
      this.celebrateTube(toIdx);
    }

    this.isAnimating = false;
    this.render();
    this.notifyStateChange();

    // Check if whole puzzle is solved
    if (isPuzzleSolved(this.tubes, this.capacity)) {
      this.handleVictory();
    }
  }

  /**
   * Victory resolution
   */
  private handleVictory() {
    this.stats.isCompleted = true;
    if (this.timerInterval) clearInterval(this.timerInterval);

    sound.playVictory();

    // Confetti effect with leaves/gold colors
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#eab308', '#f97316', '#3b82f6', '#ec4899', '#a855f7'],
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#eab308', '#22c55e', '#fbbf24'],
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#eab308', '#22c55e', '#fbbf24'],
        });
      }, 300);
    } catch {}

    const { newStars, earnedCoins } = updateLevelCompleted(
      this.currentLevelId,
      this.stats.moves,
      this.levelConfig.parMoves || 20
    );

    if (this.onWinCallback) {
      this.onWinCallback(newStars, this.stats.moves, earnedCoins);
    }
    this.notifyStateChange();
  }

  /**
   * Undo Move
   */
  public undo() {
    if (!this.canUndo()) return;
    const last = this.moveHistory.pop()!;
    this.tubes = last.tubes;
    this.stats.moves = last.moves;
    this.stats.undoCount += 1;
    this.selectedTubeIndex = null;
    sound.playBooster();
    this.render();
    this.notifyStateChange();
  }

  /**
   * Restart Level
   */
  public restart() {
    if (this.isAnimating) return;
    sound.playBooster();
    this.init(this.currentLevelId);
  }

  /**
   * Booster: Add +1 Empty Wooden Tube
   */
  public addExtraTube() {
    if (!this.canAddTube()) return;
    this.stats.extraTubesUsed += 1;
    this.tubes.push([]);
    sound.playBooster();
    this.render();
    this.notifyStateChange();
  }

  /**
   * Booster: Smart AI Hint
   */
  public hint() {
    if (this.stats.isCompleted || this.isAnimating) return;
    const hintMove = findHintMove(this.tubes, this.capacity);
    if (!hintMove) {
      sound.playInvalid();
      return;
    }
    this.stats.hintsUsed += 1;
    sound.playBooster();

    // Highlight source and target tubes
    this.highlightHintMove(hintMove.from, hintMove.to);
    this.notifyStateChange();
  }

  private highlightHintMove(fromIdx: number, toIdx: number) {
    const tubeElements = this.containerElement.querySelectorAll('.woody-tube');
    const fromEl = tubeElements[fromIdx] as HTMLElement;
    const toEl = tubeElements[toIdx] as HTMLElement;

    if (fromEl) fromEl.classList.add('hint-source');
    if (toEl) toEl.classList.add('hint-target');

    setTimeout(() => {
      this.clearHintHighlights();
    }, 2500);
  }

  private clearHintHighlights() {
    const tubeElements = this.containerElement.querySelectorAll('.woody-tube');
    tubeElements.forEach(el => {
      el.classList.remove('hint-source', 'hint-target');
    });
  }

  private shakeTube(tubeIndex: number) {
    const tubeElements = this.containerElement.querySelectorAll('.woody-tube');
    const target = tubeElements[tubeIndex] as HTMLElement;
    if (target) {
      target.classList.add('shake-tube');
      setTimeout(() => {
        target.classList.remove('shake-tube');
      }, 400);
    }
  }

  private celebrateTube(tubeIndex: number) {
    const tubeElements = this.containerElement.querySelectorAll('.woody-tube');
    const target = tubeElements[tubeIndex] as HTMLElement;
    if (target) {
      target.classList.add('completed-tube');
      setTimeout(() => {
        target.classList.remove('completed-tube');
      }, 1000);
    }
  }

  /**
   * Render the visual board with responsive wooden tubes and balls
   */
  public render() {
    const progress = loadProgress();
    const theme = progress.selectedTheme || 'oak';
    const skin = progress.selectedSkin || 'glossy';

    this.containerElement.innerHTML = '';
    this.containerElement.className = `woody-board-grid theme-${theme} skin-${skin}`;

    this.tubes.forEach((tube, tubeIdx) => {
      const isSelected = this.selectedTubeIndex === tubeIdx;
      const isFullAndComplete = isTubeComplete(tube, this.capacity);

      const tubeWrapper = document.createElement('div');
      tubeWrapper.className = `woody-tube-wrapper ${isSelected ? 'is-selected' : ''} ${isFullAndComplete ? 'is-complete' : ''}`;
      tubeWrapper.setAttribute('data-tube-index', tubeIdx.toString());

      // Wood tube outer container
      const tubeEl = document.createElement('div');
      tubeEl.className = `woody-tube ${isSelected ? 'selected' : ''}`;

      // Wooden cork cap or finish banner when completed
      if (isFullAndComplete) {
        const ribbon = document.createElement('div');
        ribbon.className = 'tube-complete-ribbon';
        ribbon.innerHTML = '<span>★</span>';
        tubeEl.appendChild(ribbon);
      }

      // Lifted ball holder when selected
      if (isSelected && tube.length > 0) {
        const topBallColor = tube[tube.length - 1];
        const liftedBall = document.createElement('div');
        liftedBall.className = `woody-ball lifted-ball ball-${topBallColor}`;
        tubeWrapper.appendChild(liftedBall);
      }

      // Ball stack inside tube
      const stackEl = document.createElement('div');
      stackEl.className = 'tube-ball-stack';

      tube.forEach((color, ballIdx) => {
        // If tube is selected, hide the topmost ball from the inside stack because it's lifted above
        const isTopLifted = isSelected && ballIdx === tube.length - 1;
        const ballEl = document.createElement('div');
        ballEl.className = `woody-ball ball-${color} ${isTopLifted ? 'ball-hidden' : ''}`;
        ballEl.setAttribute('data-color', color);
        stackEl.appendChild(ballEl);
      });

      // Wooden base stand & bark rim
      const tubeRim = document.createElement('div');
      tubeRim.className = 'wood-rim';

      const tubeBase = document.createElement('div');
      tubeBase.className = 'wood-base';

      tubeEl.appendChild(tubeRim);
      tubeEl.appendChild(stackEl);
      tubeEl.appendChild(tubeBase);

      tubeWrapper.appendChild(tubeEl);

      // Tube index indicator
      const tubeLabel = document.createElement('div');
      tubeLabel.className = 'tube-number-badge';
      tubeLabel.textContent = `${tubeIdx + 1}`;
      tubeWrapper.appendChild(tubeLabel);

      tubeWrapper.addEventListener('click', () => {
        this.handleTubeClick(tubeIdx);
      });

      this.containerElement.appendChild(tubeWrapper);
    });
  }

  public destroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }
}
