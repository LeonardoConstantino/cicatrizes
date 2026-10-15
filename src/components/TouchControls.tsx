import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause } from 'lucide-react';
import { gameSettingsManager } from '../config/gameSettings';

interface Props {
  onTogglePause: () => void;
  isPaused: boolean;
}

export const TouchControls: React.FC<Props> = ({ onTogglePause, isPaused }) => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const activeKeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    const hasTouch =
      typeof window !== 'undefined' &&
      (('ontouchstart' in window) || navigator.maxTouchPoints > 0);
    setIsTouchDevice(hasTouch);
  }, []);

  if (!isTouchDevice || !gameSettingsManager.get().touchControlsEnabled) {
    return null;
  }

  const sendKey = (code: string, key: string, isDown: boolean) => {
    if (isDown) {
      if (!activeKeys.current.has(code)) {
        activeKeys.current.add(code);
        window.dispatchEvent(new KeyboardEvent('keydown', { code, key, bubbles: true }));
      }
    } else {
      if (activeKeys.current.has(code)) {
        activeKeys.current.delete(code);
        window.dispatchEvent(new KeyboardEvent('keyup', { code, key, bubbles: true }));
      }
    }
  };

  const handleActionPress = (isDown: boolean) => {
    sendKey('Space', ' ', isDown);
    // Also dispatch mouse events so shooter & melee worlds respond immediately
    const evt = new MouseEvent(isDown ? 'mousedown' : 'mouseup', {
      button: 0,
      bubbles: true,
      clientX: window.innerWidth / 2,
      clientY: window.innerHeight / 2,
    });
    window.dispatchEvent(evt);
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-30 select-none touch-none">
      
      {/* Top Floating Mobile Pause Button */}
      <button
        onClick={onTogglePause}
        className="pointer-events-auto absolute top-4 right-20 w-9 h-9 rounded-full bg-slate-900/90 border border-slate-700/80 text-amber-400 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        aria-label="Pausa"
      >
        {isPaused ? <Play className="w-4 h-4 fill-amber-400" /> : <Pause className="w-4 h-4" />}
      </button>

      {/* Bottom Left: Directional Cross / D-Pad */}
      <div className="pointer-events-auto absolute bottom-8 left-6 w-36 h-36 relative">
        {/* Up */}
        <button
          onTouchStart={() => sendKey('KeyW', 'w', true)}
          onTouchEnd={() => sendKey('KeyW', 'w', false)}
          className="absolute top-0 left-12 w-12 h-12 rounded-xl bg-slate-900/80 border border-slate-700/80 active:bg-amber-500/40 text-slate-300 font-mono text-sm flex items-center justify-center shadow-lg"
        >
          ▲
        </button>

        {/* Down */}
        <button
          onTouchStart={() => sendKey('KeyS', 's', true)}
          onTouchEnd={() => sendKey('KeyS', 's', false)}
          className="absolute bottom-0 left-12 w-12 h-12 rounded-xl bg-slate-900/80 border border-slate-700/80 active:bg-amber-500/40 text-slate-300 font-mono text-sm flex items-center justify-center shadow-lg"
        >
          ▼
        </button>

        {/* Left */}
        <button
          onTouchStart={() => sendKey('KeyA', 'a', true)}
          onTouchEnd={() => sendKey('KeyA', 'a', false)}
          className="absolute top-12 left-0 w-12 h-12 rounded-xl bg-slate-900/80 border border-slate-700/80 active:bg-amber-500/40 text-slate-300 font-mono text-sm flex items-center justify-center shadow-lg"
        >
          ◀
        </button>

        {/* Right */}
        <button
          onTouchStart={() => sendKey('KeyD', 'd', true)}
          onTouchEnd={() => sendKey('KeyD', 'd', false)}
          className="absolute top-12 right-0 w-12 h-12 rounded-xl bg-slate-900/80 border border-slate-700/80 active:bg-amber-500/40 text-slate-300 font-mono text-sm flex items-center justify-center shadow-lg"
        >
          ▶
        </button>
      </div>

      {/* Bottom Right: Action / Trigger Buttons */}
      <div className="pointer-events-auto absolute bottom-8 right-6 flex flex-col gap-3 items-end">
        {/* Secondary / Jump / Special */}
        <button
          onTouchStart={() => sendKey('KeyW', 'w', true)}
          onTouchEnd={() => sendKey('KeyW', 'w', false)}
          className="w-16 h-16 rounded-full bg-slate-900/85 border border-indigo-500/50 active:bg-indigo-500/40 text-indigo-300 font-mono font-bold text-xs flex items-center justify-center shadow-lg shadow-indigo-950/40"
        >
          PULO
        </button>

        {/* Primary Action / Fire */}
        <button
          onTouchStart={() => handleActionPress(true)}
          onTouchEnd={() => handleActionPress(false)}
          className="w-20 h-20 rounded-full bg-amber-500/90 active:bg-amber-400 text-slate-950 font-mono font-extrabold text-sm flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95"
        >
          AÇÃO
        </button>
      </div>

    </div>
  );
};
