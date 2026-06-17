import React, { useRef, useEffect, useState } from 'react';
import { 
  GameState, 
  Player, 
  Enemy, 
  Bullet, 
  Particle, 
  PowerUp, 
  FloatingText, 
  WeaponType, 
  BulletType, 
  EnemyType, 
  HighScore 
} from '../types';
import { audio } from '../lib/audio';
import { CircleAlert, Play, RefreshCw, Trophy, Swords } from 'lucide-react';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  score: number;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  highScore: number;
  setHighScore: (s: number) => void;
  lives: number;
  setLives: React.Dispatch<React.SetStateAction<number>>;
  bombs: number;
  setBombs: React.Dispatch<React.SetStateAction<number>>;
  coins: number;
  setCoins: React.Dispatch<React.SetStateAction<number>>;
  activeControlStates: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    bomb: boolean;
  };
  setActiveControlStates: React.Dispatch<React.SetStateAction<{
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    bomb: boolean;
  }>>;
}

// Virtual resolution coordinates for coordinate-independent math
const GAME_WIDTH = 500;
const GAME_HEIGHT = 650;

export default function GameCanvas({
  gameState,
  setGameState,
  score,
  setScore,
  highScore,
  setHighScore,
  lives,
  setLives,
  bombs,
  setBombs,
  coins,
  setCoins,
  activeControlStates,
  setActiveControlStates
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);

  // Core mutable game states for the animation render loop (recreation loop)
  const playerRef = useRef<Player>({
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT - 80,
    width: 32,
    height: 32,
    hp: 100,
    maxHp: 100,
    shield: 50,
    maxShield: 100,
    speed: 5.5,
    weaponLevel: 1,
    weaponType: WeaponType.STANDARD,
    score: 0,
    highScore: 0,
    lives: 3,
    bombs: 2,
    invulnerable: false,
    invulnerableTimer: 0,
    shootCooldown: 0
  });

  // Track dragging / mouse state
  const isDragging = useRef<boolean>(false);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Game lists
  const enemiesRef = useRef<Enemy[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const starfieldRef = useRef<{ x: number; y: number; speed: number; size: number; alpha: number }[]>([]);

  // System states
  const waveTimer = useRef<number>(0);
  const bossActive = useRef<boolean>(false);
  const bossId = useRef<string | null>(null);
  const localKeys = useRef<{ [key: string]: boolean }>({});

  // Background stars creation
  const initStarfield = () => {
    const list = [];
    for (let i = 0; i < 60; i++) {
      list.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * GAME_HEIGHT,
        speed: Math.random() * 2 + 0.5,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.7 + 0.3
      });
    }
    starfieldRef.current = list;
  };

  // Safe floating text creator helper
  const addFloatingText = (text: string, x: number, y: number, color: string = '#ffffff', size: number = 14) => {
    floatingTextsRef.current.push({
      id: Math.random().toString(),
      text,
      x,
      y,
      color,
      size,
      alpha: 1,
      vy: -1.2,
      life: 0,
      maxLife: 45
    });
  };

  // Particle explosion trigger helper
  const addExplosion = (x: number, y: number, count = 12, color = '#ff5533', shape: 'CIRCLE' | 'SQUARE' | 'STAR' | 'SPARK' = 'CIRCLE') => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.5 + 1;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 4 + 1.5,
        alpha: 1,
        decay: Math.random() * 0.02 + 0.015,
        life: 0,
        maxLife: Math.random() * 25 + 15,
        shape
      });
    }
  };

  // Spark ring decoration helper
  const addSparkRing = (x: number, y: number, radius: number, color: string) => {
    const counts = 16;
    for (let i = 0; i < counts; i++) {
      const angle = (i / counts) * Math.PI * 2;
      particlesRef.current.push({
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius,
        vx: Math.cos(angle) * 1.8,
        vy: Math.sin(angle) * 1.8,
        color,
        size: 2,
        alpha: 0.9,
        decay: 0.03,
        life: 0,
        maxLife: 30,
        shape: 'SPARK'
      });
    }
  };

  // Drop dynamic powerups based on probability
  const maybeSpawnPowerUp = (x: number, y: number) => {
    const chance = Math.random();
    if (chance > 0.45) return; // 45% drops rate

    const types: ('WEAPON' | 'SHIELD_REPAIR' | 'HEALTH' | 'BOMB')[] = ['WEAPON', 'SHIELD_REPAIR', 'HEALTH', 'BOMB'];
    const weights = [0.45, 0.25, 0.20, 0.10]; // Probability weights
    
    // Weighted selection
    let r = Math.random();
    let typeSelected: 'WEAPON' | 'SHIELD_REPAIR' | 'HEALTH' | 'BOMB' = 'WEAPON';
    let cumulative = 0;
    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i];
      if (r <= cumulative) {
        typeSelected = types[i];
        break;
      }
    }

    powerUpsRef.current.push({
      id: Math.random().toString(),
      type: typeSelected,
      x,
      y,
      width: 18,
      height: 18,
      vy: 1.2
    });
  };

  // Trigger screen-clearing megablast bomb
  const triggerMegaBomb = () => {
    if (playerRef.current.bombs <= 0) return;
    
    // Decrement bomb
    setBombs(b => {
      const remaining = Math.max(0, b - 1);
      playerRef.current.bombs = remaining;
      return remaining;
    });

    audio.playBomb();
    addFloatingText("BOMB EXTERMINATION DETONATED!", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, '#ffaa00', 16);

    // Screen shake flashing feedback is simulated inside game loop logic
    // Damage all enemies drastically and clear bullets
    bulletsRef.current = [];
    
    enemiesRef.current.forEach(enemy => {
      let dmg = enemy.type === 'BOSS' ? 250 : enemy.maxHp;
      enemy.hp -= dmg;
      addExplosion(enemy.x, enemy.y, 10, '#ffa500');
      
      // Floating damage
      addFloatingText(`-${dmg}`, enemy.x, enemy.y - 12, '#ff4444', 12);
    });

    // Epic bright flash particle ring
    for (let d = 0; d < 200; d += 15) {
      addSparkRing(GAME_WIDTH / 2, GAME_HEIGHT / 2, d, '#ff5500');
    }
  };

  // Initialize Game elements
  const initGame = () => {
    playerRef.current = {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT - 80,
      width: 32,
      height: 32,
      hp: 100,
      maxHp: 100,
      shield: 50,
      maxShield: 100,
      speed: 5.5,
      weaponLevel: 1,
      weaponType: WeaponType.STANDARD,
      score: 0,
      highScore: parseInt(localStorage.getItem('arcade_strike_highscore') || '0', 10),
      lives: 3,
      bombs: 2,
      invulnerable: true,
      invulnerableTimer: 90, // invulnerable for 1.5 seconds on start
      shootCooldown: 0
    };

    setScore(0);
    setLives(3);
    setBombs(2);
    
    enemiesRef.current = [];
    bulletsRef.current = [];
    particlesRef.current = [];
    powerUpsRef.current = [];
    floatingTextsRef.current = [];
    waveTimer.current = 0;
    bossActive.current = false;
    bossId.current = null;
    initStarfield();

    audio.startMusic();
  };

  // Keyboard Event Bindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      localKeys.current[code] = true;

      const updated = { ...activeControlStates };
      if (code === 'KeyW' || code === 'ArrowUp') updated.up = true;
      if (code === 'KeyS' || code === 'ArrowDown') updated.down = true;
      if (code === 'KeyA' || code === 'ArrowLeft') updated.left = true;
      if (code === 'KeyD' || code === 'ArrowRight') updated.right = true;
      if (code === 'KeyB' || code === 'Space') {
        updated.bomb = true;
        if (gameState === GameState.PLAYING) {
          triggerMegaBomb();
        }
      }
      setActiveControlStates(updated);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      localKeys.current[code] = false;

      const updated = { ...activeControlStates };
      if (code === 'KeyW' || code === 'ArrowUp') updated.up = false;
      if (code === 'KeyS' || code === 'ArrowDown') updated.down = false;
      if (code === 'KeyA' || code === 'ArrowLeft') updated.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') updated.right = false;
      if (code === 'KeyB' || code === 'Space') updated.bomb = false;
      setActiveControlStates(updated);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // Launch a standard enemy based on game difficulty and timer progression
  const spawnEnemy = () => {
    if (bossActive.current) return; // Do not spawn basic waves during boss fight

    waveTimer.current++;
    
    // Boss triggering condition: every 4500 score points
    if (score > 0 && score % 4000 < 200 && score > Math.floor(score / 4000) * 4000 && enemiesRef.current.filter(e => e.type === 'BOSS').length === 0) {
      triggerBossFight();
      return;
    }

    if (waveTimer.current % 110 === 0) {
      // Spawn Scout: light, fast dive
      const count = Math.random() > 0.6 ? 3 : 2;
      const startX = Math.random() * (GAME_WIDTH - 100) + 50;
      for (let i = 0; i < count; i++) {
        enemiesRef.current.push({
          id: Math.random().toString(),
          type: 'SCOUT',
          x: startX + (i - (count - 1)/2) * 35,
          y: -40 - (i * 20),
          width: 24,
          height: 24,
          vx: 0,
          vy: 2.2,
          hp: 12,
          maxHp: 12,
          shootTimer: Math.random() * 80 + 40,
          shootInterval: 120,
          patternTimer: 0,
          color: '#22c55e', // Green
          points: 100
        });
      }
    }

    if (waveTimer.current % 180 === 40) {
      // Spawn Fighter: aimed fire
      enemiesRef.current.push({
        id: Math.random().toString(),
        type: 'FIGHTER',
        x: Math.random() * (GAME_WIDTH - 60) + 30,
        y: -35,
        width: 28,
        height: 28,
        vx: (Math.random() > 0.5 ? 1 : -1) * 1.3,
        vy: 1.5,
        hp: 20,
        maxHp: 20,
        shootTimer: 60,
        shootInterval: 100,
        patternTimer: 0,
        color: '#3b82f6', // Azure Blue
        points: 250
      });
    }

    if (waveTimer.current % 320 === 180) {
      // Spawn Elite Bomber: zig-zag cruiser
      enemiesRef.current.push({
        id: Math.random().toString(),
        type: 'ELITE',
        x: Math.random() * (GAME_WIDTH / 2) + GAME_WIDTH / 4,
        y: -50,
        width: 38,
        height: 34,
        vx: 1.6,
        vy: 0.8,
        hp: 60,
        maxHp: 60,
        shootTimer: 45,
        shootInterval: 80,
        patternTimer: 0,
        color: '#a855f7', // Purple
        points: 500
      });
    }
  };

  // Boss flagship triggering orchestrator
  const triggerBossFight = () => {
    bossActive.current = true;
    audio.playBossWarning();
    
    addFloatingText("⚠️ WARNING! BOSS ARRIVING ⚠️", GAME_WIDTH / 2, GAME_HEIGHT / 3, '#ef4444', 18);
    
    // Spawn Huge Boss Flagship right at the top center
    const bossIdStr = Math.random().toString();
    bossId.current = bossIdStr;

    enemiesRef.current.push({
      id: bossIdStr,
      type: 'BOSS',
      x: GAME_WIDTH / 2,
      y: -90, // Enters smoothly downwards
      width: 110,
      height: 70,
      vx: 0.8,
      vy: 0.6, // Descent speed
      hp: 600 + (score / 10), // Boss scales health as player score grows!
      maxHp: 600 + (score / 10),
      shootTimer: 100,
      shootInterval: 70,
      patternTimer: 0,
      phase: 1,
      color: '#f43f5e', // Hot Red/Pink
      points: 2500
    });
  };

  // Perform standard physics and state updates per frame
  const updateGameObjects = () => {
    // 1. Move Background Scrolling Stars
    starfieldRef.current.forEach(star => {
      star.y += star.speed;
      if (star.y > GAME_HEIGHT) {
        star.y = 0;
        star.x = Math.random() * GAME_WIDTH;
      }
    });

    // 2. Refresh Player state
    const player = playerRef.current;
    if (player.invulnerable) {
      player.invulnerableTimer--;
      if (player.invulnerableTimer <= 0) {
        player.invulnerable = false;
      }
    }

    // Process keys to move player
    let dx = 0;
    let dy = 0;
    if (localKeys.current['KeyW'] || localKeys.current['ArrowUp']) dy -= 1;
    if (localKeys.current['KeyS'] || localKeys.current['ArrowDown']) dy += 1;
    if (localKeys.current['KeyA'] || localKeys.current['ArrowLeft']) dx -= 1;
    if (localKeys.current['KeyD'] || localKeys.current['ArrowRight']) dx += 1;

    // Apply keyboard displacement
    if (dx !== 0 || dy !== 0) {
      // Normalize diagonals
      const length = Math.sqrt(dx * dx + dy * dy);
      player.x += (dx / length) * player.speed;
      player.y += (dy / length) * player.speed;
    }

    // Confines player boundary
    player.x = Math.max(player.width / 2 + 10, Math.min(GAME_WIDTH - player.width / 2 - 10, player.x));
    player.y = Math.max(player.height / 2 + 30, Math.min(GAME_HEIGHT - player.height / 2 - 20, player.y));

    // Player fire triggers
    if (player.shootCooldown > 0) {
      player.shootCooldown--;
    } else {
      firePlayerBullet(player);
    }

    // 3. Move Bullets & Check Bounds
    bulletsRef.current = bulletsRef.current.filter(bullet => {
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;
      
      // Keep inside bounds
      return (
        bullet.x > -20 && 
        bullet.x < GAME_WIDTH + 20 && 
        bullet.y > -20 && 
        bullet.y < GAME_HEIGHT + 20
      );
    });

    // 4. Move Powerups
    powerUpsRef.current = powerUpsRef.current.filter(power => {
      power.y += power.vy;

      // Check collision with player
      const p = playerRef.current;
      const dist = Math.hypot(power.x - p.x, power.y - p.y);
      if (dist < (p.width / 2 + power.width / 2)) {
        // Apply capsule mechanics
        applyPowerUp(power);
        return false;
      }

      return power.y < GAME_HEIGHT + 20;
    });

    // 5. Move and AI update enemies
    enemiesRef.current = enemiesRef.current.filter(enemy => {
      enemy.patternTimer++;

      if (enemy.type === 'SCOUT') {
        enemy.y += enemy.vy;
        enemy.x += Math.sin(enemy.patternTimer / 15) * 1.5; // Slight sway
        
        // Shoot straight
        enemy.shootTimer--;
        if (enemy.shootTimer <= 0) {
          enemy.shootTimer = enemy.shootInterval;
          fireEnemyBullet(enemy, 'STANDARD', 0, 3.2);
        }
      } 
      else if (enemy.type === 'FIGHTER') {
        enemy.y += enemy.vy;
        enemy.x += enemy.vx;
        
        // Bounce off walls
        if (enemy.x <= enemy.width / 2 + 10 || enemy.x >= GAME_WIDTH - enemy.width / 2 - 10) {
          enemy.vx *= -1;
        }

        enemy.shootTimer--;
        if (enemy.shootTimer <= 0) {
          enemy.shootTimer = enemy.shootInterval;
          // Aim bullet directly towards player's position
          const angle = Math.atan2(playerRef.current.y - enemy.y, playerRef.current.x - enemy.x);
          bulletsRef.current.push({
            id: Math.random().toString(),
            x: enemy.x,
            y: enemy.y + 12,
            vx: Math.cos(angle) * 3,
            vy: Math.sin(angle) * 3,
            width: 6,
            height: 10,
            damage: 15,
            isPlayer: false,
            color: '#ee6611',
            type: 'STANDARD',
            angle
          });
        }
      } 
      else if (enemy.type === 'ELITE') {
        enemy.x += enemy.vx;
        // Float entry
        if (enemy.y < 120) {
          enemy.y += enemy.vy;
        } else {
          enemy.y = 120 + Math.sin(enemy.patternTimer / 25) * 20;
        }

        // Side-to-side ping-pong
        if (enemy.x <= enemy.width / 2 + 20 || enemy.x >= GAME_WIDTH - enemy.width / 2 - 20) {
          enemy.vx *= -1;
        }

        enemy.shootTimer--;
        if (enemy.shootTimer <= 0) {
          enemy.shootTimer = enemy.shootInterval;
          // 3-way spread shots downwards
          fireEnemyBullet(enemy, 'STANDARD', 0, 2.5);
          fireEnemyBullet(enemy, 'STANDARD', -0.8, 2.3);
          fireEnemyBullet(enemy, 'STANDARD', 0.8, 2.3);
        }
      } 
      else if (enemy.type === 'BOSS') {
        // Boss flight behavior
        if (enemy.y < 100) {
          enemy.y += enemy.vy; // Cruise in from top
        } else {
          // Hover side to side
          enemy.x += enemy.vx;
          if (enemy.x <= enemy.width / 2 + 40 || enemy.x >= GAME_WIDTH - enemy.width / 2 - 40) {
            enemy.vx *= -1;
          }
          
          enemy.shootTimer--;
          if (enemy.shootTimer <= 0) {
            enemy.shootTimer = enemy.shootInterval;
            
            // Health percentage decides battle phases
            const hpPercent = enemy.hp / enemy.maxHp;
            if (hpPercent > 0.65) {
              enemy.phase = 1;
            } else if (hpPercent > 0.3) {
              enemy.phase = 2;
            } else {
              enemy.phase = 3;
            }

            // Phase 1: Heavy triple-track spray
            if (enemy.phase === 1) {
              for (let i = -1; i <= 1; i++) {
                fireEnemyBullet(enemy, 'STANDARD', i * 0.5, 3.2);
              }
            } 
            // Phase 2: Spiral stars
            else if (enemy.phase === 2) {
              const offsets = [0, 0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 2.8, 3.2, 3.6];
              offsets.forEach(offset => {
                const angle = (enemy.patternTimer / 10) + offset;
                bulletsRef.current.push({
                  id: Math.random().toString(),
                  x: enemy.x,
                  y: enemy.y + 15,
                  vx: Math.cos(angle) * 2.8,
                  vy: Math.sin(angle) * 2.8,
                  width: 8,
                  height: 8,
                  damage: 18,
                  isPlayer: false,
                  color: '#f43f5e',
                  type: 'SPREAD',
                  angle
                });
              });
            } 
            // Phase 3: Crazy multi-directional bullet hell + tracking missile
            else {
              // Rapid random spread
              for (let i = 0; i < 6; i++) {
                const angle = Math.random() * Math.PI + 0.2; // down arcs
                bulletsRef.current.push({
                  id: Math.random().toString(),
                  x: enemy.x,
                  y: enemy.y + 15,
                  vx: Math.cos(angle) * (3.5 + Math.random()),
                  vy: Math.sin(angle) * (3.5 + Math.random()),
                  width: 7,
                  height: 7,
                  damage: 20,
                  isPlayer: false,
                  color: '#fb7185',
                  type: 'PLASMA_BALL',
                  angle
                });
              }
              // Aimed heavy missile towards player
              const angleToPlayer = Math.atan2(playerRef.current.y - enemy.y, playerRef.current.x - enemy.x);
              bulletsRef.current.push({
                id: Math.random().toString(),
                x: enemy.x,
                y: enemy.y + 20,
                vx: Math.cos(angleToPlayer) * 1.8,
                vy: Math.sin(angleToPlayer) * 1.8,
                width: 14,
                height: 14,
                damage: 30,
                isPlayer: false,
                color: '#ea580c',
                type: 'MISSILE',
                angle: angleToPlayer
              });
            }
          }
        }
      }

      // Check if enemy left bottom boundary
      if (enemy.y > GAME_HEIGHT + 35) {
        if (enemy.type === 'BOSS') {
          // Loop boss back to top
          enemy.y = -80;
          return true;
        }
        return false;
      }
      return enemy.hp > 0;
    });

    // 6. Handle Bullet-Enemy, Bullet-Player, and Enemy-Player Collisions
    handleCollisions();

    // 7. Update Particles
    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      p.life++;
      return p.alpha > 0 && p.life < p.maxLife;
    });

    // 8. Update Float texts
    floatingTextsRef.current = floatingTextsRef.current.filter(t => {
      t.y += t.vy;
      t.life++;
      t.alpha = 1 - (t.life / t.maxLife);
      return t.life < t.maxLife;
    });
  };

  // Build bullet firing layouts depending on player states and active WeaponType
  const firePlayerBullet = (player: Player) => {
    const lvl = player.weaponLevel;
    const type = player.weaponType;

    // Shoots logic
    if (type === WeaponType.STANDARD) {
      player.shootCooldown = Math.max(9, 14 - lvl);
      audio.playShoot('STANDARD');

      if (lvl === 1) {
        bulletsRef.current.push({
          id: Math.random().toString(),
          x: player.x,
          y: player.y - 18,
          vx: 0,
          vy: -6.5,
          width: 5,
          height: 12,
          damage: 15,
          isPlayer: true,
          color: '#38bdf8',
          type: 'STANDARD'
        });
      } else if (lvl === 2) {
        // Double shots
        bulletsRef.current.push({
          id: Math.random().toString(),
          x: player.x - 8,
          y: player.y - 16,
          vx: 0,
          vy: -7.0,
          width: 5,
          height: 12,
          damage: 15,
          isPlayer: true,
          color: '#38bdf8',
          type: 'STANDARD'
        });
        bulletsRef.current.push({
          id: Math.random().toString(),
          x: player.x + 8,
          y: player.y - 16,
          vx: 0,
          vy: -7.0,
          width: 5,
          height: 12,
          damage: 15,
          isPlayer: true,
          color: '#38bdf8',
          type: 'STANDARD'
        });
      } else {
        // Triple central + wing attachments duplicates
        bulletsRef.current.push({ id: Math.random().toString(), x: player.x, y: player.y - 20, vx: 0, vy: -7.5, width: 6, height: 14, damage: 18, isPlayer: true, color: '#38bdf8', type: 'STANDARD' });
        bulletsRef.current.push({ id: Math.random().toString(), x: player.x - 14, y: player.y - 8, vx: 0, vy: -7.2, width: 4, height: 12, damage: 12, isPlayer: true, color: '#38bdf8', type: 'STANDARD' });
        bulletsRef.current.push({ id: Math.random().toString(), x: player.x + 14, y: player.y - 8, vx: 0, vy: -7.2, width: 4, height: 12, damage: 12, isPlayer: true, color: '#38bdf8', type: 'STANDARD' });
      }
    } 
    else if (type === WeaponType.SPREAD) {
      player.shootCooldown = 18;
      audio.playShoot('SPREAD');

      if (lvl === 1) {
        // 3-way spread
        const angles = [-0.15, 0, 0.15];
        angles.forEach(ang => {
          bulletsRef.current.push({
            id: Math.random().toString(),
            x: player.x,
            y: player.y - 15,
            vx: Math.sin(ang) * 6,
            vy: -Math.cos(ang) * 6,
            width: 6,
            height: 12,
            damage: 14,
            isPlayer: true,
            color: '#a855f7',
            type: 'SPREAD',
            angle: ang - Math.PI / 2
          });
        });
      } else {
        // 5-way fanning blast
        const angles = [-0.35, -0.18, 0, 0.18, 0.35];
        angles.forEach(ang => {
          bulletsRef.current.push({
            id: Math.random().toString(),
            x: player.x,
            y: player.y - 15,
            vx: Math.sin(ang) * 6.5,
            vy: -Math.cos(ang) * 6.5,
            width: 6,
            height: 12,
            damage: 15,
            isPlayer: true,
            color: '#a855f7',
            type: 'SPREAD',
            angle: ang - Math.PI / 2
          });
        });
      }
    } 
    else if (type === WeaponType.LASER) {
      player.shootCooldown = 8; // Super fast continuous trace laser beams
      audio.playShoot('LASER');
      
      const beamDmg = lvl === 1 ? 5 : 8;
      // Laser beam bullet draws as thin neon stick
      bulletsRef.current.push({
        id: Math.random().toString(),
        x: player.x,
        y: player.y - 25,
        vx: 0,
        vy: -9,
        width: 4,
        height: 24,
        damage: beamDmg,
        isPlayer: true,
        color: '#f43f5e',
        type: 'LASER_BEAM'
      });

      if (lvl >= 2) {
        // Twin direct lasers
        bulletsRef.current.push({
          id: Math.random().toString(),
          x: player.x - 10,
          y: player.y - 15,
          vx: 0,
          vy: -9,
          width: 3,
          height: 20,
          damage: 5,
          isPlayer: true,
          color: '#f43f5e',
          type: 'LASER_BEAM'
        });
        bulletsRef.current.push({
          id: Math.random().toString(),
          x: player.x + 10,
          y: player.y - 15,
          vx: 0,
          vy: -9,
          width: 3,
          height: 20,
          damage: 5,
          isPlayer: true,
          color: '#f43f5e',
          type: 'LASER_BEAM'
        });
      }
    } 
    else if (type === WeaponType.PLASMA) {
      player.shootCooldown = Math.max(22, 30 - lvl * 3);
      audio.playShoot('PLASMA');

      // Fires a massive slow energetic orb
      bulletsRef.current.push({
        id: Math.random().toString(),
        x: player.x,
        y: player.y - 20,
        vx: 0,
        vy: -3.8,
        width: 24,
        height: 24,
        damage: 40 + lvl * 15,
        isPlayer: true,
        color: '#eab308', // Glowing Gold
        type: 'PLASMA_BALL'
      });
    }
  };

  // Helper targeting enemy bullet spawner
  const fireEnemyBullet = (enemy: Enemy, type: BulletType, vx: number, vy: number) => {
    bulletsRef.current.push({
      id: Math.random().toString(),
      x: enemy.x,
      y: enemy.y + enemy.height / 2,
      vx,
      vy,
      width: 7,
      height: 10,
      damage: enemy.type === 'BOSS' ? 22 : 12,
      isPlayer: false,
      color: '#f43f5e',
      type
    });
  };

  // Power Up pill collection effects
  const applyPowerUp = (power: PowerUp) => {
    audio.playPowerUp();
    const p = playerRef.current;

    if (power.type === 'WEAPON') {
      // Cylce weapons S STANDARD -> SPREAD -> LASER -> PLASMA -> repeat, increment level
      if (p.weaponLevel < 3) {
        p.weaponLevel++;
        addFloatingText("⚡ WEAPON FORCE BOOSTED! ⚡", p.x, p.y - 30, '#38bdf8', 14);
      } else {
        p.weaponLevel = 1;
        // Cycles type
        const typesList = [WeaponType.STANDARD, WeaponType.SPREAD, WeaponType.LASER, WeaponType.PLASMA];
        const nextIndex = (typesList.indexOf(p.weaponType) + 1) % typesList.length;
        p.weaponType = typesList[nextIndex];
        
        let label = "STANDARD";
        if (p.weaponType === WeaponType.SPREAD) label = "SPREAD MULTI";
        if (p.weaponType === WeaponType.LASER) label = "CONTINUOUS THUNDER LASER";
        if (p.weaponType === WeaponType.PLASMA) label = "ENERGIZED PLASMA GLOBE";
        
        addFloatingText(`WEAPON CYCLED: ${label}!`, p.x, p.y - 30, '#a855f7', 14);
      }
    } 
    else if (power.type === 'SHIELD_REPAIR') {
      p.shield = Math.min(p.maxShield, p.shield + 40);
      addFloatingText("🛡️ SHIELD SECURED +40", p.x, p.y - 30, '#06b6d4', 14);
    } 
    else if (power.type === 'HEALTH') {
      p.hp = Math.min(p.maxHp, p.hp + 30);
      addFloatingText("💚 COMPONENT REPAIRED +30", p.x, p.y - 30, '#22c55e', 14);
    } 
    else if (power.type === 'BOMB') {
      setBombs(b => {
        const amt = b + 1;
        p.bombs = amt;
        return amt;
      });
      addFloatingText("💣 MEGA BOMB STOCK +1", p.x, p.y - 30, '#f97316', 14);
    }

    // Capture visual effects ring
    addSparkRing(power.x, power.y, 16, '#00ffff');
  };

  // Complete collision detection suite
  const handleCollisions = () => {
    const player = playerRef.current;
    
    // 1. Bullets checking loops
    bulletsRef.current = bulletsRef.current.filter(bullet => {
      // If it's a PLAYER bullet, test against enemies
      if (bullet.isPlayer) {
        for (let i = 0; i < enemiesRef.current.length; i++) {
          const enemy = enemiesRef.current[i];
          const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);
          const collisionRange = (bullet.width + enemy.width) / 1.8;

          if (dist < collisionRange) {
            // Apply Damage
            enemy.hp -= bullet.damage;
            
            // Spark effect on bullet hit
            addExplosion(bullet.x, bullet.y, 4, bullet.color, 'SPARK');

            // Float hit damage
            addFloatingText(`-${bullet.damage}`, enemy.x + (Math.random() * 20 - 10), enemy.y - 12, '#ffffff', 10);

            // Check if enemy died
            if (enemy.hp <= 0) {
              // Enemy vanquished! Add explosion
              const sizeLabel = enemy.type === 'BOSS' ? 'BOSS' : enemy.type === 'ELITE' ? 'LARGE' : 'MEDIUM';
              audio.playExplosion(sizeLabel);
              
              const particleColor = enemy.type === 'BOSS' ? '#ef4444' : enemy.type === 'ELITE' ? '#a855f7' : enemy.type === 'FIGHTER' ? '#3b82f6' : '#22c55e';
              addExplosion(enemy.x, enemy.y, enemy.type === 'BOSS' ? 70 : enemy.type === 'ELITE' ? 25 : 12, particleColor, 'CIRCLE');
              addSparkRing(enemy.x, enemy.y, enemy.type === 'BOSS' ? 40 : 18, '#ffffff');

              // If BOSS died, victory!
              if (enemy.type === 'BOSS') {
                bossActive.current = false;
                bossId.current = null;
                addFloatingText("🏆 EPIC DEFEAT: BOSS DESTROYED! +2500", GAME_WIDTH / 2, GAME_HEIGHT / 3, '#facc15', 16);
                
                // End game with VICTORY or just cycle back to next wave difficulty
                // Let's grant huge coins bonus inside arcade context and give next tier speed
                setCoins(c => c + 1);
              }

              // Update Score
              setScore(s => {
                const updated = s + enemy.points;
                player.score = updated;
                
                // Update persistent high score
                const currentHS = parseInt(localStorage.getItem('arcade_strike_highscore') || '0', 10);
                if (updated > currentHS) {
                  localStorage.setItem('arcade_strike_highscore', updated.toString());
                  setHighScore(updated);
                }
                return updated;
              });

              addFloatingText(`+${enemy.points}`, enemy.x, enemy.y, '#facc15', 13);
              
              // Probability to drop item capsule
              maybeSpawnPowerUp(enemy.x, enemy.y);
            }

            // Laser cuts straight through standard enemies (piercing) but Standard/Spread bullet dies on hit
            if (bullet.type !== 'LASER_BEAM') {
              return false;
            }
          }
        }
      } 
      // Else bullet is ENEMY bullet, check against Player plane
      else {
        if (!player.invulnerable && gameState === GameState.PLAYING) {
          const dist = Math.hypot(bullet.x - player.x, bullet.y - player.y);
          const range = (bullet.width + player.width) / 2.2;

          if (dist < range) {
            // Hit! Spark ring
            addSparkRing(bullet.x, bullet.y, 12, '#ff3300');
            
            damagePlayer(bullet.damage);
            return false; // Enemy bullet disappears
          }
        }
      }

      return true;
    });

    // 2. Direct Plane-Enemy collision (Crash risk)
    if (!player.invulnerable && gameState === GameState.PLAYING) {
      enemiesRef.current.forEach(enemy => {
        const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        const crashRange = (player.width + enemy.width) / 2.0;

        if (dist < crashRange) {
          // Crash! Both take severe damage
          audio.playPlayerHit();
          addExplosion(player.x, player.y, 20, '#ff3333');
          addSparkRing(enemy.x, enemy.y, 25, '#ffff00');

          damagePlayer(enemy.type === 'BOSS' ? 50 : 35);
          
          enemy.hp -= 40; // Plane deals body crash damage to enemy too
          if (enemy.hp <= 0) {
            audio.playExplosion('MEDIUM');
            addExplosion(enemy.x, enemy.y, 12, enemy.color);
            setScore(s => s + enemy.points);
          }
        }
      });
    }
  };

  // Perform calculations for damage absorption between shields and hull health
  const damagePlayer = (dmg: number) => {
    const player = playerRef.current;
    audio.playPlayerHit();

    // Flash screen shake
    // Compute block rates
    if (player.shield > 0) {
      const absorbed = Math.min(player.shield, dmg * 0.85); // Shield blocks 85% damage
      player.shield -= absorbed;
      const passThrough = dmg - absorbed;
      player.hp -= passThrough;
      addFloatingText(`🛡️ SHIELD DECAY -${Math.round(absorbed)}`, player.x, player.y - 25, '#06b6d4', 12);
    } else {
      player.hp -= dmg;
      addFloatingText(`💥 HULL INTEGRITY DIRECT DAMAGE -${Math.round(dmg)}`, player.x, player.y - 25, '#ef4444', 12);
    }

    // Player invulnerable frames slightly to avoid direct instant death multi-hit
    player.invulnerable = true;
    player.invulnerableTimer = 45; // 0.75 seconds immunity

    // Check of death
    if (player.hp <= 0) {
      player.lives--;
      setLives(player.lives);

      audio.playExplosion('LARGE');
      addExplosion(player.x, player.y, 50, '#ef4444', 'CIRCLE');
      
      if (player.lives > 0) {
        // Respawn player
        player.hp = 100;
        player.shield = 50;
        player.x = GAME_WIDTH / 2;
        player.y = GAME_HEIGHT - 80;
        player.invulnerable = true;
        player.invulnerableTimer = 90; // 1.5s respawn immunity
        
        // Downgrade weapon slightly as death penalty
        player.weaponLevel = Math.max(1, player.weaponLevel - 1);

        addFloatingText(`✈️ RESPONDING FIGHTER! LIVES: ${player.lives}`, GAME_WIDTH / 2, GAME_HEIGHT / 2, '#38bdf8', 15);
      } else {
        // Ultimate Game Over!
        setGameState(GameState.GAMEOVER);
        audio.stopMusic();
      }
    }
  };

  // Graphic components procedural canvas renderer suite (High performance neon drawings)
  const renderGame = (ctx: CanvasRenderingContext2D) => {
    // Clear canvas with space darkness depth
    ctx.fillStyle = '#090b10';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 1. Draw Space scrolling Starfield
    starfieldRef.current.forEach(star => {
      ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    // 2. Draw capsule Drops
    powerUpsRef.current.forEach(power => {
      // Pulsing outer glowing aura
      const t = Date.now() / 150;
      const sizeOffset = Math.sin(t) * 2;
      
      ctx.shadowBlur = 10;
      
      let color = '#38bdf8';
      let symbol = 'W';
      if (power.type === 'HEALTH') {
        color = '#22c55e';
        symbol = 'H';
      } else if (power.type === 'SHIELD_REPAIR') {
        color = '#06b6d4';
        symbol = 'S';
      } else if (power.type === 'BOMB') {
        color = '#f97316';
        symbol = 'B';
      }

      ctx.shadowColor = color;
      ctx.fillStyle = color;
      
      // Draw capsule box
      ctx.beginPath();
      ctx.arc(power.x, power.y, power.width / 2 + sizeOffset / 2, 0, Math.PI * 2);
      ctx.fill();

      // Core white sphere
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(power.x, power.y, power.width / 4, 0, Math.PI * 2);
      ctx.fill();

      // Label letter
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(symbol, power.x, power.y);
    });

    // 3. Draw Player Bullets & Enemy Bullets
    bulletsRef.current.forEach(bullet => {
      ctx.shadowBlur = bullet.isPlayer ? 10 : 8;
      ctx.shadowColor = bullet.color;
      ctx.fillStyle = bullet.color;

      if (bullet.type === 'STANDARD' || bullet.type === 'LASER_BEAM') {
        ctx.fillRect(bullet.x - bullet.width / 2, bullet.y - bullet.height / 2, bullet.width, bullet.height);
      } 
      else if (bullet.type === 'SPREAD') {
        // Draw angled diamond
        ctx.save();
        ctx.translate(bullet.x, bullet.y);
        ctx.rotate(bullet.angle || 0);
        ctx.beginPath();
        ctx.moveTo(-bullet.width / 2, 0);
        ctx.lineTo(0, -bullet.height / 2);
        ctx.lineTo(bullet.width / 2, 0);
        ctx.lineTo(0, bullet.height / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } 
      else if (bullet.type === 'PLASMA_BALL') {
        // Draw pulsing energy orb
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.width / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      else if (bullet.type === 'MISSILE') {
        // Big heavy boss missile
        ctx.save();
        ctx.translate(bullet.x, bullet.y);
        ctx.rotate(bullet.angle ?? 0);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(-6, -10, 12, 20);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(-6, -10);
        ctx.lineTo(0, -18);
        ctx.lineTo(6, -10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    });
    ctx.shadowBlur = 0; // Reset glows

    // 4. Draw Planes: Enemies
    enemiesRef.current.forEach(enemy => {
      ctx.shadowBlur = 8;
      ctx.shadowColor = enemy.color;
      ctx.fillStyle = enemy.color;

      if (enemy.type === 'SCOUT') {
        // Fast triangle fighter
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y + enemy.height / 2);
        ctx.lineTo(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2);
        ctx.lineTo(enemy.x + enemy.width / 2, enemy.y - enemy.height / 2);
        ctx.closePath();
        ctx.fill();
        
        // Wing highlights
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(enemy.x - enemy.width / 2, enemy.y - 3, 3, 2);
        ctx.fillRect(enemy.x + enemy.width / 2 - 3, enemy.y - 3, 3, 2);
      } 
      else if (enemy.type === 'FIGHTER') {
        // Forked swift jet shape
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y + enemy.height / 2 + 5);
        ctx.lineTo(enemy.x - enemy.width / 2, enemy.y - enemy.height / 4);
        ctx.lineTo(enemy.x - enemy.width / 4, enemy.y - enemy.height / 2);
        ctx.lineTo(enemy.x, enemy.y - enemy.height / 4);
        ctx.lineTo(enemy.x + enemy.width / 4, enemy.y - enemy.height / 2);
        ctx.lineTo(enemy.x + enemy.width / 2, enemy.y - enemy.height / 4);
        ctx.closePath();
        ctx.fill();

        // Neon core glass canopy
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(enemy.x - 3, enemy.y, 6, 6);
      } 
      else if (enemy.type === 'ELITE') {
        // Heavy Cruiser wing design
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y + enemy.height / 2);
        ctx.lineTo(enemy.x - enemy.width / 2, enemy.y);
        ctx.lineTo(enemy.x - enemy.width / 3, enemy.y - enemy.height / 2);
        ctx.lineTo(enemy.x, enemy.y - enemy.height / 3);
        ctx.lineTo(enemy.x + enemy.width / 3, enemy.y - enemy.height / 2);
        ctx.lineTo(enemy.x + enemy.width / 2, enemy.y);
        ctx.closePath();
        ctx.fill();

        // Elite power core indicators
        const pulse = Math.abs(Math.sin(Date.now() / 200));
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#d946ef';
        ctx.fillStyle = `rgba(217, 70, 239, ${0.4 + pulse * 0.6})`;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, 5, 0, Math.PI*2);
        ctx.fill();
      } 
      else if (enemy.type === 'BOSS') {
        // Giant flagship mothership vessel
        ctx.shadowBlur = 20;
        ctx.shadowColor = enemy.color;
        ctx.fillStyle = enemy.color;

        // Base hull
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y + enemy.height / 2 + 10);
        ctx.lineTo(enemy.x - enemy.width / 2, enemy.y);
        ctx.lineTo(enemy.x - enemy.width / 2.5, enemy.y - enemy.height / 2);
        ctx.lineTo(enemy.x - enemy.width / 5, enemy.y - enemy.height / 2.5);
        ctx.lineTo(enemy.x, enemy.y - enemy.height / 2);
        ctx.lineTo(enemy.x + enemy.width / 5, enemy.y - enemy.height / 2.5);
        ctx.lineTo(enemy.x + enemy.width / 2.5, enemy.y - enemy.height / 2);
        ctx.lineTo(enemy.x + enemy.width / 2, enemy.y);
        ctx.closePath();
        ctx.fill();

        // Heavy flanking thruster wings
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(enemy.x - enemy.width / 2 + 10, enemy.y - enemy.height / 2 - 12, 10, 12);
        ctx.fillRect(enemy.x + enemy.width / 2 - 20, enemy.y - enemy.height / 2 - 12, 10, 12);
        
        // Thrust fire orange flame flicker
        const fl = Math.random() * 8 + 4;
        ctx.fillStyle = '#f97316';
        ctx.fillRect(enemy.x - enemy.width / 2 + 12, enemy.y - enemy.height / 2 - 12 - fl, 6, fl);
        ctx.fillRect(enemy.x + enemy.width / 2 - 18, enemy.y - enemy.height / 2 - 12 - fl, 6, fl);

        // Core shield generator pulsing bar
        const hpPercent = enemy.hp / enemy.maxHp;
        
        ctx.shadowBlur = 0; // Reset
        // Render detailed boss health HUD immediately above boss
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(enemy.x - 40, enemy.y - enemy.height / 2 - 25, 80, 5);
        
        const bossBarColor = hpPercent > 0.6 ? '#22c55e' : hpPercent > 0.3 ? '#eab308' : '#ef4444';
        ctx.fillStyle = bossBarColor;
        ctx.fillRect(enemy.x - 40, enemy.y - enemy.height / 2 - 25, 80 * hpPercent, 5);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px Courier New';
        ctx.fillText("BOSS COMPONENT", enemy.x, enemy.y - enemy.height / 2 - 32);
      }
    });
    ctx.shadowBlur = 0;

    // 5. Draw Player Plane
    const player = playerRef.current;
    if (gameState === GameState.PLAYING) {
      // Engine flames flickering generators
      const fType = Math.random();
      const flameH = fType > 0.5 ? 12 : 7;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(player.x - 3, player.y + player.height / 2, 6, flameH);
      ctx.fillStyle = '#f97316';
      ctx.fillRect(player.x - 1.5, player.y + player.height / 2, 3, flameH - 3);

      // If invulnerable, perform flickering render
      let shouldRender = true;
      if (player.invulnerable && Math.floor(player.invulnerableTimer / 4) % 2 === 0) {
        shouldRender = false;
      }

      if (shouldRender) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#06b6d4'; // Cyan neon glow player jet

        // Vector Spaceship fighter drawing
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(player.x, player.y - player.height / 2); // Nose
        ctx.lineTo(player.x - player.width / 2, player.y + player.height / 3); // Left Wing sweep
        ctx.lineTo(player.x - player.width / 4, player.y + player.height / 2); // Left tail stabilizer
        ctx.lineTo(player.x, player.y + player.height / 3); // Central nozzle
        ctx.lineTo(player.x + player.width / 4, player.y + player.height / 2); // Right stabilizer
        ctx.lineTo(player.x + player.width / 2, player.y + player.height / 3); // Right wing sweep
        ctx.closePath();
        ctx.fill();

        // Decorative Cyan metallic flight trims
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(player.x - player.width / 4, player.y + player.height / 12);
        ctx.lineTo(player.x - player.width / 2, player.y + player.height / 3);
        ctx.lineTo(player.x, player.y + player.height / 3);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(player.x + player.width / 4, player.y + player.height / 12);
        ctx.lineTo(player.x + player.width / 2, player.y + player.height / 3);
        ctx.lineTo(player.x, player.y + player.height / 3);
        ctx.closePath();
        ctx.fill();

        // Cockpit glass bubble
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(player.x, player.y - player.height / 6, 4, 0, Math.PI * 2);
        ctx.fill();

        // Shield dome bubble drawing
        if (player.shield > 0) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#22d3ee';
          ctx.strokeStyle = `rgba(34, 211, 238, ${0.2 + (player.shield / player.maxShield) * 0.4})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(player.x, player.y, player.width * 1.0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.shadowBlur = 0;
    }

    // 6. Draw Explosion Particles
    particlesRef.current.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 6;
      ctx.shadowColor = p.color;

      if (p.shape === 'CIRCLE') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } 
      else if (p.shape === 'SQUARE') {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } 
      else { // SPARK or STAR
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size * 2, p.size / 2);
      }
      ctx.restore();
    });
    ctx.shadowBlur = 0;

    // 7. Render floating texts
    floatingTextsRef.current.forEach(t => {
      ctx.fillStyle = `rgba(${t.color === '#ffffff' ? '255,255,255' : t.color === '#facc15' ? '250,204,21' : '239,68,68'}, ${t.alpha})`;
      ctx.font = `bold ${t.size}px Courier New`;
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x, t.y);
    });

    // 8. Screen Warnings / Danger overlays
    const playerHP = playerRef.current.hp;
    if (playerHP < 30 && gameState === GameState.PLAYING) {
      // Flash low HP crimson alert bar borders
      const alertPulse = Math.abs(Math.sin(Date.now() / 150)) * 0.15;
      ctx.fillStyle = `rgba(239, 68, 68, ${alertPulse})`;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
  };

  // Main canvas refresh and update execution loops
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      if (gameState === GameState.PLAYING) {
        // Sequence wave enemy spawn
        spawnEnemy();
        // Move assets
        updateGameObjects();
      }

      // Draw frames
      renderGame(ctx);

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    if (gameState === GameState.PLAYING) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else {
      // Just render background visual loop on other states
      const renderStaticLoop = () => {
        updateStaticObjects();
        renderGame(ctx);
        gameLoopRef.current = requestAnimationFrame(renderStaticLoop);
      };
      renderStaticLoop();
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState]);

  // Updates for simple passive menu backgrounds
  const updateStaticObjects = () => {
    // Scroll background starfields passively
    starfieldRef.current.forEach(star => {
      star.y += star.speed * 0.4;
      if (star.y > GAME_HEIGHT) {
        star.y = 0;
        star.x = Math.random() * GAME_WIDTH;
      }
    });

    // Handle float texts
    floatingTextsRef.current.forEach(t => {
      t.y += t.vy * 0.5;
      t.life++;
      t.alpha = 1 - (t.life / t.maxLife);
    });
    floatingTextsRef.current = floatingTextsRef.current.filter(t => t.life < t.maxLife);

    // Update existing particles passively
    particlesRef.current.forEach(p => {
      p.x += p.vx * 0.6;
      p.y += p.vy * 0.6;
      p.alpha -= p.decay;
    });
    particlesRef.current = particlesRef.current.filter(p => p.alpha > 0);
  };

  // Start executing setup immediately
  useEffect(() => {
    initStarfield();
    if (gameState === GameState.PLAYING) {
      initGame();
    }
  }, [gameState]);

  // Mouse / Touch drag-to-move systems mapping
  const getCanvasMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Scale back to 500x650 coordinate matrix
    const x = ((e.clientX - rect.left) / rect.width) * GAME_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * GAME_HEIGHT;
    return { x, y };
  };

  const getCanvasTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || e.touches.length === 0) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    const x = ((e.touches[0].clientX - rect.left) / rect.width) * GAME_WIDTH;
    const y = ((e.touches[0].clientY - rect.top) / rect.height) * GAME_HEIGHT;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== GameState.PLAYING) return;
    const pos = getCanvasMousePos(e);
    const p = playerRef.current;
    const dist = Math.hypot(pos.x - p.x, pos.y - p.y);

    // Allow grab if clicked close to player
    if (dist < 40) {
      isDragging.current = true;
      dragOffset.current = { x: p.x - pos.x, y: p.y - pos.y };
    } else {
      // Instant glide targeting
      isDragging.current = true;
      dragOffset.current = { x: 0, y: 0 };
      p.x = pos.x;
      p.y = pos.y;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current || gameState !== GameState.PLAYING) return;
    const pos = getCanvasMousePos(e);
    const p = playerRef.current;

    // Direct movement tracking
    p.x = pos.x + dragOffset.current.x;
    p.y = pos.y + dragOffset.current.y;
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (gameState !== GameState.PLAYING) return;
    const pos = getCanvasTouchPos(e);
    const p = playerRef.current;
    
    // Auto glide tracking on touch tap
    isDragging.current = true;
    dragOffset.current = { x: 0, y: 0 };
    p.x = pos.x;
    p.y = pos.y;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging.current || gameState !== GameState.PLAYING) return;
    const pos = getCanvasTouchPos(e);
    const p = playerRef.current;
    p.x = pos.x;
    p.y = pos.y;
  };

  // Triggers starting the game
  const handleStartInteraction = () => {
    audio.init();
    setCoins(c => {
      if (c > 0) {
        setGameState(GameState.PLAYING);
        return c - 1;
      } else {
        // Mock coin load for fast testing if coins are 0
        setGameState(GameState.PLAYING);
        return 0;
      }
    });
  };

  // UI Views elements overlaid inside HTML viewport
  return (
    <div ref={containerRef} className="w-full h-full relative flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUpOrLeave}
        className="block max-w-full max-h-full cursor-crosshair box-border select-none"
      />

      {/* Screen Game Over View Layer Overlay */}
      {gameState === GameState.GAMEOVER && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-4 z-20 text-center select-none font-sans">
          <div className="animate-bounce mb-2">
            <CircleAlert className="w-16 h-16 text-rose-500 mx-auto drop-shadow-[0_0_12px_rgba(244,63,94,0.4)]" />
          </div>
          <h2 className="text-4xl font-black text-rose-500 tracking-tighter italic font-display uppercase mb-1 drop-shadow-[0_0_12px_rgba(244,63,94,0.3)]">
            GAME OVER
          </h2>
          <p className="text-zinc-500 text-[10px] tracking-[0.3em] uppercase mb-6 font-bold">
            组件破损 • 任务终止
          </p>

          <div className="bg-black/95 border border-zinc-800 rounded-lg p-5 w-full max-w-xs mb-6 text-left shadow-[0_0_30px_rgba(0,0,0,0.85)]">
            <div className="flex justify-between border-b border-zinc-850 pb-2 mb-2 font-mono">
              <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">FINAL SCORE</span>
              <span className="text-cyan-400 font-extrabold text-sm tracking-wider">{score.toString().padStart(6, '0')}</span>
            </div>
            <div className="flex justify-between pb-1 font-mono">
              <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider text-left">WEAPON TYPE</span>
              <span className="text-zinc-300 font-extrabold text-xs">
                {playerRef.current.weaponType === WeaponType.STANDARD ? "STANDARD" : playerRef.current.weaponType === WeaponType.SPREAD ? "SPREAD" : playerRef.current.weaponType === WeaponType.LASER ? "LASERBEAM" : "PLASMA"}
              </span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">HI-SCORE RECORD</span>
              <span className="text-zinc-400 text-xs">{highScore.toString().padStart(6, '0')}</span>
            </div>
          </div>

          <button
            onClick={initGame}
            id="retry-game-btn"
            className="flex items-center gap-2 px-6 py-3 border-2 border-cyan-500 hover:bg-cyan-500/10 text-cyan-400 font-extrabold rounded-lg cursor-pointer transition active:scale-95 text-xs uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(6,182,212,0.2)] font-mono"
          >
            <RefreshCw className="w-4 h-4 animate-spin-slow" />
            <span>RESTART FIGHTER</span>
          </button>
        </div>
      )}

      {/* Screen Menu View Layer Overlay */}
      {gameState === GameState.MENU && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 z-20 text-center select-none font-sans">
          <div className="w-20 h-20 bg-gradient-to-tr from-cyan-500 via-indigo-600 to-rose-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.35)] mb-4 animate-pulse border border-white/10">
            <Swords className="w-12 h-12 text-black drop-shadow-[0_1px_2px_rgba(255,255,255,0.4)]" />
          </div>

          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-200 to-rose-400 tracking-tighter italic font-display uppercase mb-1 drop-shadow-[0_4px_12px_rgba(6,182,212,0.2)]">
            雷霆中队：街机挑战
          </h2>
          <p className="text-zinc-400 text-[9px] tracking-[0.35em] uppercase mb-6 font-bold font-mono">
            SELECT INITIATION PROTOCOL
          </p>

          <div className="bg-black/95 border border-zinc-800 rounded-xl p-4 w-full max-w-xs mb-8 text-left text-xs leading-5 shadow-2xl font-mono">
            <div className="text-cyan-400 font-extrabold mb-2.5 uppercase text-center border-b border-zinc-850 pb-1.5 flex items-center justify-center gap-1.5 tracking-[0.1em] text-[11px]">
              <Trophy className="w-3.5 h-3.5 text-rose-500 animate-pulse" /> MISSION OBJECTIVES
            </div>
            <ul className="list-none space-y-2 text-[11px]">
              <li className="flex items-start gap-1"><span className="text-cyan-400 font-black">▶</span> <span><span className="text-zinc-300 font-extrabold">拖拽/键鼠</span> 移动战机，自动开火</span></li>
              <li className="flex items-start gap-1"><span className="text-cyan-400 font-black">▶</span> <span>收集闪烁 <span className="text-cyan-400 font-extrabold">W/S/H/B 胶囊</span>升级战力</span></li>
              <li className="flex items-start gap-1"><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-rose-400 font-black">▶</span> <span>迎击史诗 <span className="text-rose-400 font-extrabold">Boss 红色主舰</span>旗舰</span></li>
              <li className="flex items-start gap-1"><span className="text-cyan-400 font-black">▶</span> <span><span className="text-rose-400 font-extrabold">空闲/B 键</span>释放极热核子炸弹清屏</span></li>
            </ul>
          </div>

          {/* Action button */}
          <button
            onClick={handleStartInteraction}
            id="start-arcade-trigger-btn"
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 via-indigo-600 to-rose-500 hover:brightness-110 text-white font-black px-8 py-4 rounded-lg border border-white/20 cursor-pointer transition active:scale-95 text-xs uppercase tracking-[0.25em] shadow-[0_8px_25px_rgba(6,182,212,0.35)]"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{coins > 0 ? "INSERTED • COIN PLAY" : "FREE PLAY (INSERT COIN)"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
