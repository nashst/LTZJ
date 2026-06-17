import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Swords, Shield, Rocket, CircleAlert, Trophy } from 'lucide-react';

interface ArcadeCabinetProps {
  children: React.ReactNode;
  score: number;
  highScore: number;
  lives: number;
  bombs: number;
  coins: number;
  gameState: string;
  onInsertCoin: () => void;
  onPressBomb: () => void;
  onToggleMute: () => void;
  muted: boolean;
  controlStates: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    bomb: boolean;
  };
}

export default function ArcadeCabinet({
  children,
  score,
  highScore,
  lives,
  bombs,
  coins,
  gameState,
  onInsertCoin,
  onPressBomb,
  onToggleMute,
  muted,
  controlStates
}: ArcadeCabinetProps) {
  const [blink, setBlink] = useState(true);

  // Blinking neon insert coin text
  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(b => !b);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div id="arcade-cabinet-root" className="w-full max-w-4xl mx-auto flex flex-col items-center select-none py-4 px-2 font-sans">
      {/* Upper Header Marquee */}
      <div id="arcade-marquee" className="w-full bg-black border-x-4 border-t-4 border-zinc-800 rounded-t-2xl p-5 shadow-[0_0_35px_rgba(6,182,212,0.15)] relative overflow-hidden flex flex-col items-center">
        {/* Neon lines background */}
        <div className="absolute inset-y-0 bottom-0 top-0 opacity-[0.15] bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.4)_50%),_linear-gradient(90deg,_rgba(0,255,255,0.06),_rgba(255,0,255,0.02),_rgba(0,255,255,0.06))] bg-[length:100%_4px,_6px_100%] pointer-events-none" />
        
        {/* Accent ambient lighting */}
        <div className="absolute -left-12 top-0 w-40 h-40 bg-cyan-500/15 blur-3xl rounded-full animate-pulse" />
        <div className="absolute -right-12 top-0 w-40 h-40 bg-rose-500/15 blur-3xl rounded-full animate-pulse" />

        <div className="flex items-center justify-between w-full z-10 border-b border-zinc-800 pb-3">
          <div className="text-left">
            <span className="text-cyan-400 font-extrabold block text-[10px] tracking-[0.25em] uppercase">1UP SCORE</span>
            <span className="text-white text-2xl font-black italic tracking-tight font-mono drop-shadow-[0_0_4px_rgba(255,255,255,0.3)]">
              {score.toString().padStart(6, '0')}
            </span>
          </div>

          {/* Marquee Title */}
          <div className="flex flex-col items-center select-none">
            <div className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
              <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-rose-400 font-display drop-shadow-[0_4px_12px_rgba(6,182,212,0.35)] uppercase">
                雷霆街机
              </h1>
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
            </div>
            <p className="text-[10px] text-zinc-400 font-mono tracking-[0.35em] uppercase mt-1.5 font-bold">
              STRIKE FORCE • 💥 RETRO ARCADE 💥
            </p>
          </div>

          <div className="text-right">
            <span className="text-rose-500 font-extrabold block text-[10px] tracking-[0.25em] uppercase flex items-center justify-end gap-1">
              <Trophy className="w-3 h-3 text-rose-500 animate-bounce" /> HI-SCORE
            </span>
            <span className="text-rose-400 text-2xl font-black italic tracking-tight font-mono drop-shadow-[0_0_4px_rgba(244,63,94,0.3)]">
              {Math.max(highScore, score).toString().padStart(6, '0')}
            </span>
          </div>
        </div>

        {/* Audio Mute & Info Panel */}
        <div className="flex w-full items-center justify-between mt-3 text-[11px] font-mono text-zinc-400 z-10">
          <div className="flex gap-4">
            <span className="tracking-wider uppercase">CREDIT: <span className="text-emerald-400 font-black">{coins}</span></span>
            <span className="tracking-wider uppercase">SHIELD: <span className="text-cyan-400 font-bold">█████</span></span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleMute}
              id="audio-toggle-btn"
              className="p-1 px-3 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition flex items-center gap-1.5 active:scale-95 border border-zinc-800 text-[10px] uppercase font-bold tracking-widest cursor-pointer"
            >
              {muted ? <VolumeX className="w-3 h-3 text-rose-400" /> : <Volume2 className="w-3 h-3 text-cyan-400 animate-pulse" />}
              <span>{muted ? "MUTED" : "SOUND ON"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Screen & Bezel */}
      <div id="arcade-bezel" className="w-full bg-black border-x-4 border-zinc-800 p-2 md:p-4 shadow-2xl relative flex flex-col items-center">
        {/* Outer Bezel Graphics */}
        <div className="absolute left-1.5 top-12 bottom-12 w-1 bg-gradient-to-b from-cyan-400 via-indigo-500 to-rose-400 opacity-40 rounded" />
        <div className="absolute right-1.5 top-12 bottom-12 w-1 bg-gradient-to-b from-cyan-400 via-indigo-500 to-rose-400 opacity-40 rounded" />

        {/* CRT Screen Wrapper */}
        <div id="crt-screen" className="relative w-full aspect-[3/4] max-h-[600px] overflow-hidden rounded-lg bg-[#05070a] border-[6px] border-zinc-800 shadow-[0_0_40px_rgba(6,182,212,0.1),inset_0_0_60px_rgba(0,0,0,0.9)] flex items-center justify-center">
          
          {/* CRT scanline and vignette visual filter layer overlay */}
          <div className="absolute inset-0 z-40 pointer-events-none opacity-30 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.45)_50%),_linear-gradient(90deg,_rgba(255,0,0,0.08),_rgba(0,255,0,0.03),_rgba(0,0,255,0.08))] bg-[length:100%_4px,_12px_100%]" />
          
          {/* Subtle curved screen shadow reflection */}
          <div className="absolute inset-0 z-40 pointer-events-none opacity-10 bg-radial-gradient from-transparent via-black/30 to-black/90" />
          
          {/* Glowing screen halo */}
          <div className="absolute inset-0 z-0 pointer-events-none shadow-[inset_0_0_80px_rgba(59,130,246,0.15)]" />

          {/* Actual game canvas or active screens */}
          <div className="w-full h-full relative z-10 flex flex-col items-center justify-center">
            {children}
          </div>
        </div>
      </div>

      {/* Control Console (Joysticks, Action Buttons, and Coin Slot) */}
      <div id="arcade-controller" className="w-full bg-black border-x-4 border-b-4 border-l-4 border-r-4 border-zinc-800 rounded-b-2xl p-4 md:p-6 shadow-[0_20px_40px_rgba(0,0,0,0.73)] relative overflow-hidden flex flex-col md:flex-row gap-6 md:gap-4 items-center justify-between">
        
        {/* Metal mesh pattern accent */}
        <div className="absolute inset-0 bg-zinc-950 opacity-20 bg-[radial-gradient(#52525b_1px,transparent_1px)] [background-size:14px_14px] pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-cyan-400 via-indigo-500 to-rose-400" />

        {/* Interactive Red Ball Joystick */}
        <div className="flex items-center gap-4 z-10">
          <div className="relative w-24 h-24 bg-zinc-950 rounded-full border-[3px] border-zinc-800 flex items-center justify-center p-2 shadow-inner">
            {/* Joystick Base Socket Ring */}
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-700 relative flex items-center justify-center">
              {/* Dynamic tited Joystick ball shadow & stick */}
              <div 
                className="absolute w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 via-rose-600 to-rose-900 border border-rose-950 cursor-pointer shadow-lg transform transition-transform duration-75 flex items-center justify-center text-[10px] text-rose-100 font-mono font-bold"
                style={{
                  transform: `translate(${
                    controlStates.left ? '-18px' : controlStates.right ? '18px' : '0px'
                  }, ${
                    controlStates.up ? '-18px' : controlStates.down ? '18px' : '0px'
                  })`
                }}
              >
                <div className="w-4 h-4 rounded-full bg-white/25 absolute top-1 left-1.5" />
                <span className="text-[7px] tracking-tight uppercase">JOY</span>
              </div>
            </div>

            {/* Micro-switch directions indicators */}
            <span className={`absolute top-1 text-[8px] font-mono font-bold ${controlStates.up ? 'text-cyan-400 font-bold scale-110' : 'text-zinc-650'}`}>▲ UP</span>
            <span className={`absolute bottom-1 text-[8px] font-mono font-bold ${controlStates.down ? 'text-cyan-400 font-bold scale-110' : 'text-zinc-650'}`}>▼ DOWN</span>
            <span className={`absolute left-1 text-[8px] font-mono font-bold rotate-90 Origin-center ${controlStates.left ? 'text-cyan-400 font-bold scale-110' : 'text-zinc-650'}`}>▲ LEFT</span>
            <span className={`absolute right-1 text-[8px] font-mono font-bold -rotate-90 origin-center ${controlStates.right ? 'text-cyan-400 font-bold scale-110' : 'text-zinc-650'}`}>▲ RIGHT</span>
          </div>
          
          <div className="flex flex-col text-left font-mono">
            <span className="text-zinc-350 text-xs font-black uppercase tracking-wider">移动控制</span>
            <span className="text-zinc-500 text-[10px]">键盘: WASD / 方向键</span>
            <span className="text-zinc-500 text-[10px]">鼠标: 拖拽机型</span>
            <span className="text-zinc-500 text-[10px]">移动触控: 直接拖拽</span>
          </div>
        </div>

        {/* Central Coin Acceptor / Start Trigger */}
        <div className="flex flex-col items-center justify-center z-10 py-1">
          <div className="flex gap-4 items-center">
            {/* Insert Coin slot */}
            <button
              onClick={onInsertCoin}
              id="insert-coin-slot"
              className={`w-14 h-16 border-2 rounded-md flex flex-col justify-between items-center py-2 relative transition cursor-pointer active:scale-95 ${
                coins > 0 
                ? 'border-cyan-500 bg-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
                : 'border-zinc-800 bg-zinc-950 hover:border-cyan-500 hover:bg-cyan-500/5'
              }`}
            >
              <div className="text-[7px] font-mono text-zinc-500 tracking-wider font-extrabold uppercase">COIN SLOT</div>
              {/* Insert slit */}
              <div className="w-1.5 h-6 bg-zinc-900 border border-zinc-700 rounded shadow-inner relative flex items-center justify-center">
                <div className="w-0.5 h-4 bg-cyan-400 animate-pulse" />
              </div>
              <div className="text-[8px] font-bold font-mono text-cyan-400 animate-pulse">$ 5</div>
            </button>

            {/* Glowing START Player 1 button */}
            <button
              onClick={onInsertCoin}
              id="start-p1-btn"
              className={`px-4 py-2.5 border-2 rounded-md font-mono text-xs font-black transition duration-200 uppercase tracking-widest ${
                coins > 0
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 animate-pulse hover:bg-emerald-500/20 cursor-pointer shadow-[0_0_18px_rgba(16,185,129,0.4)]'
                  : 'border-zinc-800 text-zinc-650 bg-zinc-950 cursor-not-allowed'
              }`}
              disabled={coins === 0 && gameState !== 'MENU'}
            >
              {coins > 0 ? 'START PLAY' : 'INSERT COIN'}
            </button>
          </div>
          
          <span className="text-zinc-500 text-[9px] font-mono font-extrabold uppercase tracking-[0.2em] mt-2 block">
            {coins > 0 ? '🔥 READY FOR ACTION !' : '🪙 INSERT COIN TO INITIATE'}
          </span>
        </div>

        {/* Action Fire / Bomb Push Buttons */}
        <div className="flex items-center gap-4 z-10">
          <div className="text-right font-mono flex flex-col mr-2 justify-center">
            <span className="text-zinc-350 text-xs font-black uppercase tracking-wider">武器系统</span>
            <span className="text-zinc-500 text-[10px]">自动开火 (Auto-fire)</span>
            <span className="text-zinc-500 text-[10px]">空格键 / B 释放炸弹</span>
          </div>

          {/* LARGE MEGA BOMB BUTTON */}
          <div className="flex flex-col items-center">
            <button
              onClick={onPressBomb}
              id="arcade-bomb-btn"
              disabled={bombs === 0 || gameState !== 'PLAYING'}
              className={`w-14 h-14 rounded-full flex items-center justify-center relative transition transform active:scale-90 border-4 ${
                bombs > 0 && gameState === 'PLAYING'
                  ? 'bg-gradient-to-tr from-rose-800 via-rose-500 to-orange-400 border-zinc-800 hover:brightness-110 cursor-pointer shadow-[0_5px_15px_rgba(244,63,94,0.5)]'
                  : 'bg-zinc-900 border-zinc-950 cursor-not-allowed text-zinc-600'
              }`}
            >
              {/* Inner button shadow ring */}
              <div className="absolute inset-1.5 rounded-full border border-white/20 bg-black/10 flex items-center justify-center">
                <Rocket className={`w-5 h-5 ${bombs > 0 ? 'text-white drop-shadow-[0_0_4px_black]' : 'text-zinc-600'}`} />
              </div>
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-mono font-extrabold text-rose-500 tracking-wider uppercase">
                BOMB: {bombs}
              </span>
            </button>
          </div>

          {/* EXTRA ACTION BUTTON */}
          <div className="flex flex-col items-center">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center relative border-4 bg-gradient-to-tr from-cyan-800 via-cyan-500 to-indigo-300 border-zinc-850 shadow-[0_5px_15px_rgba(6,182,212,0.3)]`}
            >
              <div className="absolute inset-1.5 rounded-full border border-white/20 bg-black/10 flex items-center justify-center text-[9px] font-mono font-black text-cyan-55 animate-pulse text-center leading-3">
                AUTO<br/>FIRE
              </div>
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-mono font-extrabold text-cyan-400 tracking-wider">
                SHOOT
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer copyright */}
      <p className="mt-4 text-[10px] text-zinc-650 font-mono text-center tracking-[0.25em] uppercase font-bold">
        © 2026 ARCADE CORP • RETRO EMULATOR-3000 PRO • COIN PLAY ONLY
      </p>
    </div>
  );
}
