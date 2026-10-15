import React, { useState } from 'react';
import { X, Sliders, Eye, Monitor, Smartphone, Trash2, Check, AlertTriangle } from 'lucide-react';
import { gameSettingsManager, GameSettings } from '../config/gameSettings';
import { curatorMemory } from '../curator/CuratorMemory';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onResetSave?: () => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, onResetSave }) => {
  const [settings, setSettings] = useState<GameSettings>(gameSettingsManager.get());
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  if (!isOpen) return null;

  const handleToggleFlashes = () => {
    const next = gameSettingsManager.update({ reduceFlashes: !settings.reduceFlashes });
    setSettings(next);
  };

  const handleShakeChange = (val: number) => {
    const next = gameSettingsManager.update({ cameraShakeMultiplier: val });
    setSettings(next);
  };

  const handleToggleCRT = () => {
    const next = gameSettingsManager.update({ crtScanlines: !settings.crtScanlines });
    setSettings(next);
  };

  const handleToggleTouch = () => {
    const next = gameSettingsManager.update({ touchControlsEnabled: !settings.touchControlsEnabled });
    setSettings(next);
  };

  const handleResetProgress = () => {
    curatorMemory.clearHistory();
    setResetDone(true);
    setConfirmReset(false);
    setTimeout(() => {
      setResetDone(false);
      if (onResetSave) onResetSave();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-500" />
            <h2 className="font-mono text-sm font-bold tracking-wider text-white uppercase">
              Configurações & Acessibilidade
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-6 space-y-6 overflow-y-auto font-sans">
          
          {/* Section: Acessibilidade & Fotossensibilidade */}
          <div className="space-y-4">
            <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider block">
              Conforto Visual & Acessibilidade
            </span>

            {/* Reduce Flashes */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="space-y-0.5 pr-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  Reduzir Flashes de Tela
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Desativa clarões brancos e estroboscópios em tela cheia (recomendado para fotossensíveis).
                </p>
              </div>
              <button
                onClick={handleToggleFlashes}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                  settings.reduceFlashes ? 'bg-amber-500' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                    settings.reduceFlashes ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Camera Shake Slider */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-amber-400" />
                  Intensidade do Tremor de Câmera
                </span>
                <span className="text-xs font-mono text-amber-400 font-bold">
                  {Math.round(settings.cameraShakeMultiplier * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.25"
                value={settings.cameraShakeMultiplier}
                onChange={(e) => handleShakeChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>0% (Desligado)</span>
                <span>100% (Padrão)</span>
                <span>150% (Intenso)</span>
              </div>
            </div>

            {/* CRT Scanlines */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="space-y-0.5 pr-3">
                <div className="text-xs font-semibold text-white">
                  Linhas de Varredura CRT
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Textura sutil de monitor arcade clássico.
                </p>
              </div>
              <button
                onClick={handleToggleCRT}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                  settings.crtScanlines ? 'bg-amber-500' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                    settings.crtScanlines ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Touch Controls Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="space-y-0.5 pr-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                  Controles de Toque na Tela
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Exibe joystick e botões táteis virtuais em telas sensíveis ao toque.
                </p>
              </div>
              <button
                onClick={handleToggleTouch}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                  settings.touchControlsEnabled ? 'bg-amber-500' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                    settings.touchControlsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section: Reset / Clear Save */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <span className="text-[11px] font-mono text-rose-400 uppercase tracking-wider block">
              Gerenciamento de Dados
            </span>

            {resetDone ? (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                Histórico limpo com sucesso! Reiniciando ciclo...
              </div>
            ) : !confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-800 text-slate-400 hover:text-rose-300 text-xs font-mono flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Redefinir Histórico de Runs (Reset Save)
              </button>
            ) : (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/50 space-y-2 text-center animate-in fade-in duration-150">
                <div className="flex items-center justify-center gap-1.5 text-rose-300 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  Apagar todas as cicatrizes e recordes?
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Esta ação é irreversível e resetará o jogo para a Run 1.
                </p>
                <div className="flex gap-2 justify-center pt-1">
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleResetProgress}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-mono text-white font-bold transition-colors"
                  >
                    Confirmar Reset
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider transition-all"
          >
            Concluir
          </button>
        </div>

      </div>
    </div>
  );
};
