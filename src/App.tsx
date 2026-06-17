import React, { useState, useEffect } from 'react';
import { GameState } from './types';
import ArcadeCabinet from './components/ArcadeCabinet';
import GameCanvas from './components/GameCanvas';
import { audio } from './lib/audio';
import { Trophy, Coins, Info, Swords, Shield, Heart } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('arcade_strike_highscore') || '0', 10);
  });
  const [lives, setLives] = useState<number>(3);
  const [bombs, setBombs] = useState<number>(2);
  const [coins, setCoins] = useState<number>(3); // Start with 3 arcade credits!
  const [muted, setMuted] = useState<boolean>(false);

  // Active control states passed to the cabinet to animate joysticks & buttons
  const [controlStates, setControlStates] = useState({
    up: false,
    down: false,
    left: false,
    right: false,
    bomb: false,
    shoot: false
  });

  // Handle high score updates
  const handleUpdateHighScore = (newHighScore: number) => {
    localStorage.setItem('arcade_strike_highscore', newHighScore.toString());
    setHighScore(newHighScore);
  };

  // Keyboard shortcut to drop bombs and help trigger sounds
  const handlePressBomb = () => {
    if (gameState === GameState.PLAYING && bombs > 0) {
      // Create a artificial KeyboardEvent to trigger bomb directly inside canvas listener
      const bombEvt = new KeyboardEvent('keydown', { code: 'Space' });
      window.dispatchEvent(bombEvt);
      
      // Release trigger
      setTimeout(() => {
        const releaseEvt = new KeyboardEvent('keyup', { code: 'Space' });
        window.dispatchEvent(releaseEvt);
      }, 80);
    }
  };

  // Insert arcade coin credits
  const handleInsertCoin = () => {
    audio.init();
    audio.playPowerUp();
    
    // Add coin credit
    setCoins(c => c + 1);

    // If game over or menu, start game immediately using coin
    if (gameState === GameState.MENU) {
      setCoins(c => {
        const remaining = Math.max(0, c - 1);
        setGameState(GameState.PLAYING);
        return remaining;
      });
    } else if (gameState === GameState.GAMEOVER) {
      setCoins(c => {
        const remaining = Math.max(0, c - 1);
        setGameState(GameState.PLAYING);
        return remaining;
      });
    }
  };

  // Toggle master sound mute state
  const handleToggleMute = () => {
    audio.init();
    const isMutedNow = audio.toggleMute();
    setMuted(isMutedNow);
  };

  return (
    <div id="retro-cabinet-chamber" className="min-h-screen bg-[#020508] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] text-zinc-100 flex flex-col justify-between relative overflow-x-hidden">
      
      {/* Decorative neon ambient room lighting */}
      <div className="absolute top-0 inset-x-0 h-[450px] bg-gradient-to-b from-blue-900/10 via-red-900/5 to-transparent pointer-events-none" />
      <div className="absolute -left-40 top-1/4 w-[400px] h-[400px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -right-40 top-1/3 w-[400px] h-[400px] bg-red-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Main Arcade Room Layout */}
      <main id="arcade-room-container" className="flex-1 flex flex-col items-center justify-center p-4">
        
        {/* Game instructions / quick helper badge */}
        <div className="hidden lg:flex flex-col gap-4 fixed left-6 top-1/4 w-60 bg-zinc-950/85 border border-zinc-800 p-4 rounded-xl font-mono text-xs text-zinc-400 shadow-xl leading-5 z-10">
          <h3 className="text-zinc-200 font-bold border-b border-zinc-800 pb-1.5 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span>CREDIT PLAY SYSTEM</span>
          </h3>
          <p className="text-zinc-500 text-[11px]">
            这是一个模拟经典街机游戏。使用虚拟 <span className="text-orange-400 font-bold">投币口</span> 投入虚拟 5 美分硬币来获取游戏积分：
          </p>
          <ul className="space-y-1.5 text-zinc-500 border-t border-zinc-900 pt-2 text-[11px]">
            <li className="flex justify-between">
              <span>开始单次游戏:</span>
              <span className="text-emerald-400 font-bold">-1 CREDIT</span>
            </li>
            <li className="flex justify-between">
              <span>默认启动赠送:</span>
              <span className="text-zinc-300 font-bold">3 CREDITS</span>
            </li>
            <li className="flex justify-between">
              <span>击败 Boss 特赏:</span>
              <span className="text-yellow-400 font-bold">+1 CREDIT</span>
            </li>
          </ul>
        </div>

        {/* Right HUD wing: status monitor */}
        <div className="hidden lg:flex flex-col gap-4 fixed right-6 top-1/4 w-60 bg-zinc-950/85 border border-zinc-800 p-4 rounded-xl font-mono text-xs text-zinc-400 shadow-xl leading-5 z-10">
          <h3 className="text-zinc-200 font-bold border-b border-zinc-800 pb-1.5 flex items-center gap-1.5">
            <Swords className="w-4 h-4 text-red-500" />
            <span>FIGHTER STATS</span>
          </h3>
          <div className="space-y-2 mt-1">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-zinc-500">SYSTEM HULL:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Heart className="w-3 h-3 fill-emerald-400 text-emerald-400" /> 100%
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-zinc-500">SHIELD DOME:</span>
              <span className="text-cyan-400 font-bold flex items-center gap-1">
                <Shield className="w-3 h-3 text-cyan-400 fill-cyan-400" /> ACTIVE
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-zinc-500">SOUND SYNTH:</span>
              <span className="text-zinc-300">WEB AUDIO FM</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-zinc-500">FRAME RATIO:</span>
              <span className="text-zinc-300">60 FPS AUTO</span>
            </div>
          </div>
        </div>

        {/* ARCADE MACHINE CABINET WRAPPER */}
        <ArcadeCabinet
          score={score}
          highScore={highScore}
          lives={lives}
          bombs={bombs}
          coins={coins}
          gameState={gameState}
          onInsertCoin={handleInsertCoin}
          onPressBomb={handlePressBomb}
          onToggleMute={handleToggleMute}
          muted={muted}
          controlStates={controlStates}
        >
          {/* THE CRT SCREEN VIEWPORT */}
          <GameCanvas
            gameState={gameState}
            setGameState={setGameState}
            score={score}
            setScore={setScore}
            highScore={highScore}
            setHighScore={handleUpdateHighScore}
            lives={lives}
            setLives={setLives}
            bombs={bombs}
            setBombs={setBombs}
            coins={coins}
            setCoins={setCoins}
            activeControlStates={controlStates}
            setActiveControlStates={setControlStates}
          />
        </ArcadeCabinet>

      </main>
    </div>
  );
}
