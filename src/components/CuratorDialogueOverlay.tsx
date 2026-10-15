import React, { useState, useEffect } from 'react';
import { curatorVoice, CuratorWhisper } from '../curator/CuratorVoice';
import { Eye } from 'lucide-react';

export const CuratorDialogueOverlay: React.FC = () => {
  const [whisper, setWhisper] = useState<CuratorWhisper | null>(null);

  useEffect(() => {
    return curatorVoice.subscribe(setWhisper);
  }, []);

  if (!whisper) return null;

  const moodColors = {
    observation: 'border-cyan-500/50 text-cyan-200 bg-cyan-950/70 shadow-[0_0_20px_rgba(6,182,212,0.25)]',
    warning: 'border-rose-500/60 text-rose-200 bg-rose-950/75 shadow-[0_0_20px_rgba(244,63,94,0.3)]',
    judgment: 'border-purple-500/50 text-purple-200 bg-purple-950/70 shadow-[0_0_20px_rgba(168,85,247,0.25)]',
    revelation: 'border-amber-500/50 text-amber-200 bg-amber-950/70 shadow-[0_0_20px_rgba(245,158,11,0.25)]',
  };

  const iconColors = {
    observation: 'text-cyan-400',
    warning: 'text-rose-400 animate-pulse',
    judgment: 'text-purple-400',
    revelation: 'text-amber-400',
  };

  return (
    <div className="fixed top-16 left-0 right-0 pointer-events-none z-30 flex items-center justify-center p-4 animate-in fade-in slide-in-from-top-4 duration-300">
      <div
        className={`flex items-center gap-3 px-5 py-2.5 rounded-full border backdrop-blur-md max-w-lg transition-all ${moodColors[whisper.mood]}`}
      >
        <Eye className={`w-4 h-4 shrink-0 ${iconColors[whisper.mood]}`} />
        <div className="flex flex-col text-left">
          <span className="text-xs md:text-sm font-serif italic tracking-wide">
            “{whisper.text}”
          </span>
          {whisper.subtext && (
            <span className="text-[10px] font-mono text-slate-400 mt-0.5 tracking-wider">
              {whisper.subtext}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
