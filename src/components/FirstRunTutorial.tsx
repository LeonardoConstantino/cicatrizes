import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  isVisible: boolean;
  onDismiss: () => void;
}

export const FirstRunTutorial: React.FC<Props> = ({ isVisible, onDismiss }) => {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(onDismiss, 400);
    }, 8500);
    return () => clearTimeout(timer);
  }, [isVisible, onDismiss]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed top-16 left-1/2 -translate-x-1/2 z-40 max-w-lg w-[92%] p-5 rounded-2xl bg-black/90 border border-amber-500/50 backdrop-blur-md shadow-[0_0_35px_rgba(245,158,11,0.25)] text-center transition-all duration-300 pointer-events-auto ${
        fading ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0 animate-in fade-in slide-in-from-top-4'
      }`}
    >
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded transition-colors"
        aria-label="Fechar instrução"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-400 font-mono text-sm flex items-center justify-center mx-auto mb-2 animate-pulse">
        ◉
      </div>

      <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold block mb-1">
        TRANSMISSÃO DO CURADOR · PRIMEIRA INCURSÃO
      </span>

      <p className="text-sm font-serif italic text-slate-100 leading-relaxed mb-3">
        “O Arquivo observa. Mova com <strong className="text-amber-300 not-italic">WASD</strong>, dispare com o <strong className="text-amber-300 not-italic">Mouse</strong>. Cada hábito seu se tornará uma cicatriz no próximo mundo.”
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800">
        <span>WASD: Navegar</span>
        <span>·</span>
        <span>Clique / Espaço: Ação</span>
        <span>·</span>
        <span>ESC / P: Pausar</span>
      </div>
    </div>
  );
};
