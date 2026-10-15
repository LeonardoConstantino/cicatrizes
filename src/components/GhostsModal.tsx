import React, { useState, useEffect } from 'react';
import { PRESET_GHOSTS, GhostData, GhostStorage } from '../meta/BehavioralGhosts';
import { Users, X, Play, Copy, Check, Plus, Trash2, ShieldAlert } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectGhost: (ghost: GhostData | null) => void;
  activeGhostId?: string;
}

export const GhostsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectGhost,
  activeGhostId,
}) => {
  const [personalGhosts, setPersonalGhosts] = useState<GhostData[]>([]);
  const [importCode, setImportCode] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showImportBox, setShowImportBox] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPersonalGhosts(GhostStorage.getSavedGhosts());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyCode = (ghost: GhostData) => {
    const code = GhostStorage.exportGhostCode(ghost);
    navigator.clipboard.writeText(code);
    setCopiedId(ghost.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleImportSubmit = () => {
    if (!importCode.trim()) return;
    const imported = GhostStorage.importGhostCode(importCode);
    if (imported) {
      GhostStorage.savePersonalGhost(imported);
      setPersonalGhosts(GhostStorage.getSavedGhosts());
      onSelectGhost(imported);
      setImportCode('');
      setShowImportBox(false);
      setImportError(null);
    } else {
      setImportError('Código inválido ou corrompido.');
      setTimeout(() => setImportError(null), 3000);
    }
  };

  const handleDeletePersonal = (id: string) => {
    GhostStorage.deletePersonalGhost(id);
    setPersonalGhosts(GhostStorage.getSavedGhosts());
    if (activeGhostId === id) {
      onSelectGhost(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-wide">
                Fantasmas Comportamentais (Seção 14 do GDD)
              </h2>
              <p className="text-xs text-slate-400">
                Você vs. os hábitos de outra pessoa ou do seu próprio passado gravado.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeGhostId && (
              <button
                onClick={() => onSelectGhost(null)}
                className="text-[11px] font-mono px-2.5 py-1 rounded border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 transition-colors"
              >
                Desativar Fantasma
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-medium transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">

          {/* Import / Export Action Bar */}
          <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-lg border border-slate-800">
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-white">Compartilhamento Assíncrono:</span>
              <p className="text-[11px] text-slate-400">Troque códigos de fantasmas com amigos para competir contra os hábitos deles.</p>
            </div>
            <button
              onClick={() => setShowImportBox(!showImportBox)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Importar Código
            </button>
          </div>

          {/* Import Box */}
          {showImportBox && (
            <div className="bg-slate-950 p-4 rounded-lg border border-indigo-500/50 space-y-2 animate-in fade-in duration-150">
              <span className="text-xs font-mono text-slate-300 block">Cole o código do fantasma abaixo:</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: eyJpZCI6InBlcnNvbmFsX3J1bl8... "
                  value={importCode}
                  onChange={(e) => setImportCode(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs font-mono bg-slate-900 border border-slate-700 rounded text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-400"
                />
                <button
                  onClick={handleImportSubmit}
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                >
                  Carregar
                </button>
              </div>
              {importError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 font-mono">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {importError}
                </div>
              )}
            </div>
          )}

          {/* 1. Personal Recorded Ghosts */}
          {personalGhosts.length > 0 && (
            <div className="space-y-3">
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block">
                Seus Fantasmas Gravados (Runs Anteriores)
              </span>
              <div className="space-y-3">
                {personalGhosts.map(ghost => {
                  const isActive = activeGhostId === ghost.id;
                  const isCopied = copiedId === ghost.id;

                  return (
                    <div
                      key={ghost.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isActive
                          ? 'bg-amber-950/30 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            style={{ backgroundColor: ghost.color }}
                            className="w-3 h-3 rounded-full animate-pulse"
                          />
                          <h3 className="font-semibold text-white text-sm">{ghost.name}</h3>
                          {ghost.createdAt && (
                            <span className="text-[10px] text-slate-500 font-mono">[{ghost.createdAt}]</span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          {ghost.score ? `${ghost.score.toLocaleString()} pts` : 'Gravado'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 mb-3">{ghost.description}</p>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCopyCode(ghost)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
                            title="Copiar código de compartilhamento"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            {isCopied ? 'Copiado!' : 'Exportar Código'}
                          </button>
                          <button
                            onClick={() => handleDeletePersonal(ghost.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                            title="Excluir gravação"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            onSelectGhost(ghost);
                            onClose();
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            isActive
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                          }`}
                        >
                          <Play className="w-3 h-3" />
                          {isActive ? 'Fantasma Ativo' : 'Carregar Este Eu'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Preset AI Ghosts */}
          <div className="space-y-3">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
              Fantasmas de Arquétipos (Presets com IA Autônoma)
            </span>
            <div className="space-y-3">
              {PRESET_GHOSTS.map(ghost => {
                const isActive = activeGhostId === ghost.id;
                const isCopied = copiedId === ghost.id;

                return (
                  <div
                    key={ghost.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-indigo-950/40 border-indigo-500/80 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          style={{ backgroundColor: ghost.color }}
                          className="w-3 h-3 rounded-full"
                        />
                        <h3 className="font-semibold text-white text-sm">{ghost.name}</h3>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        Cicatriz Dominante: {ghost.dominantScar}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mb-3">{ghost.description}</p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-2.5 text-[10px] font-mono text-slate-400">
                          <span>Agressão: {(ghost.traits.aggression * 100).toFixed(0)}%</span>
                          <span>Evasão: {(ghost.traits.evasion * 100).toFixed(0)}%</span>
                          <span>Ritmo: {(ghost.traits.rhythm * 100).toFixed(0)}%</span>
                        </div>
                        <button
                          onClick={() => handleCopyCode(ghost)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-[10px] font-mono text-slate-400 hover:text-white transition-colors"
                          title="Copiar código do fantasma"
                        >
                          {isCopied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                          {isCopied ? 'Copiado!' : 'Código'}
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          onSelectGhost(ghost);
                          onClose();
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          isActive
                            ? 'bg-indigo-500 text-white font-bold'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                      >
                        <Play className="w-3 h-3" />
                        {isActive ? 'Fantasma Ativo' : 'Carregar Fantasma'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
