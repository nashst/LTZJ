export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAMEOVER = 'GAMEOVER',
  VICTORY = 'VICTORY'
}

export enum WeaponType {
  STANDARD = 'STANDARD', // Classic single/double shot
  SPREAD = 'SPREAD',     // Wide angle fan shot
  LASER = 'LASER',       // Continuous pierce beam
  PLASMA = 'PLASMA'      // Mega charged orb
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  speed: number;
  weaponLevel: number;
  weaponType: WeaponType;
  score: number;
  highScore: number;
  lives: number;
  bombs: number;
  invulnerable: boolean;
  invulnerableTimer: number;
  shootCooldown: number;
}

export type EnemyType = 'SCOUT' | 'FIGHTER' | 'BOMBER' | 'ELITE' | 'BOSS';

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  shootTimer: number;
  shootInterval: number;
  patternTimer: number;
  phase?: number;
  color: string;
  points: number;
  angle?: number;
}

export type BulletType = 'STANDARD' | 'SPREAD' | 'LASER_BEAM' | 'PLASMA_BALL' | 'MISSILE';

export interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  damage: number;
  isPlayer: boolean;
  color: string;
  type: BulletType;
  angle?: number;
}

export type ParticleShape = 'CIRCLE' | 'SQUARE' | 'STAR' | 'SPARK';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  life: number;
  maxLife: number;
  shape: ParticleShape;
}

export type PowerUpType = 'WEAPON' | 'HEALTH' | 'SHIELD' | 'BOMB' | 'SHIELD_REPAIR';

export interface PowerUp {
  id: string;
  type: PowerUpType;
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  size: number;
  alpha: number;
  vy: number;
  life: number;
  maxLife: number;
}

export interface HighScore {
  name: string;
  score: number;
  date: string;
}
