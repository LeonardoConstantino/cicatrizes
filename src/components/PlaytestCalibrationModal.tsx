import React, { useState, useEffect } from 'react';
import { PlaytestConfig, playtestConfigManager, PLAYTEST_PRESETS } from '../config/playtestConfig';
import { Sliders, Copy, Check, RotateCcw, Zap, Sparkles, Terminal, Volume2, Mic } from 'lucide-react';
import { curatorVoice } from '../curator/CuratorVoice';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentStimulus: number;
  timeInWorldSec: number;
  timeUntilEligibleSec: number;
  activeWorldId: string;
}

export const PlaytestCalibrationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentStimulus,
  timeInWorldSec,
  timeUntilEligibleSec,
  activeWorldId,
}) => {
  const [config, setConfig] = useState<PlaytestConfig>(playtestConfigManager.get());
  const [copied, setCopied] = useState(false);
  const [jsonInput, setJsonInput] = useState(playtestConfigManager.exportJsonString());
  const [activeTab, setActiveTab] = useState<'sliders' | 'json' | 'presets' | 'voice'>('sliders');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  useEffect(() => {
    const unsub = playtestConfigManager.subscribe((newCfg) => {
      setConfig(newCfg);
      setJsonInput(JSON.stringify(newCfg, null, 2));
    });

    const updateVoices = () => {
      setAvailableVoices(curatorVoice.getAvailableVoices());
    };
    updateVoices();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return unsub;
  }, []);

  if (!isOpen) return null;

  const updateConfig = (updater: (prev: PlaytestConfig) => PlaytestConfig) => {
    const updated = updater(config);
    playtestConfigManager.set(updated);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(playtestConfigManager.exportJsonString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyJson = () => {
    const success = playtestConfigManager.importJsonString(jsonInput);
    if (success) {
      setImportStatus('Configuração JSON aplicada com sucesso!');
      setTimeout(() => setImportStatus(null), 2500);
    } else {
      setImportStatus('Erro: JSON inválido ou estrutura incompleta.');
      setTimeout(() => setImportStatus(null), 3000);
    }
  };

  const handleReset = () => {
    playtestConfigManager.resetToDefault();
  };

  const handlePresetSelect = (key: string) => {
    playtestConfigManager.applyPreset(key);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-wide flex items-center gap-2">
                Painel de Calibração do Playtest
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  v0.1 JSON Config
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Ajuste os thresholds do StimulusEngine, tempos de mutação e dissolução em tempo real.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-medium transition-colors"
          >
            Fechar (Esc)
          </button>
        </div>

        {/* Live Status Bar */}
        <div className="grid grid-cols-4 gap-2 px-6 py-2.5 bg-slate-950/40 border-b border-slate-800/80 text-xs font-mono">
          <div>
            <span className="text-slate-500 block">Mundo Ativo:</span>
            <span className="text-amber-400 font-semibold">{activeWorldId}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Estimulação Atual:</span>
            <span className={`font-semibold ${currentStimulus >= config.stimulus.mutationThreshold ? 'text-emerald-400' : currentStimulus >= config.stimulus.warningThreshold ? 'text-amber-400' : 'text-slate-300'}`}>
              {(currentStimulus * 100).toFixed(1)}% <span className="text-slate-500">/ {(config.stimulus.mutationThreshold * 100).toFixed(0)}%</span>
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Tempo no Mundo:</span>
            <span className="text-slate-200">{timeInWorldSec.toFixed(1)}s</span>
          </div>
          <div>
            <span className="text-slate-500 block">Próxima Mutação:</span>
            <span className={timeUntilEligibleSec <= 0 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
              {timeUntilEligibleSec <= 0 ? 'Elegível Agora' : `${timeUntilEligibleSec.toFixed(0)}s restando`}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900/60">
          <button
            onClick={() => setActiveTab('sliders')}
            className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'sliders' ? 'border-amber-400 text-amber-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Sliders className="w-3.5 h-3.5" /> Controles & Sliders
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'voice' ? 'border-amber-400 text-amber-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Volume2 className="w-3.5 h-3.5" /> Voz do Curador (TTS)
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'presets' ? 'border-amber-400 text-amber-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Presets de Playtest
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'json' ? 'border-amber-400 text-amber-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <Terminal className="w-3.5 h-3.5" /> Código JSON Direto
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'sliders' && (
            <div className="space-y-6">

              {/* 1. StimulusEngine Calibration */}
              <div className="space-y-4 bg-slate-950/40 p-4 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    StimulusEngine (Thresholds de Mutação)
                  </h3>
                  <span className="text-xs text-amber-400 font-mono">
                    Mutação: {config.stimulus.mutationThreshold.toFixed(2)} | Inquieto: {config.stimulus.warningThreshold.toFixed(2)}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Threshold de Mutação (GDD Padrão: 0.72)</span>
                      <span className="font-mono text-amber-300">{config.stimulus.mutationThreshold.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.30"
                      max="0.95"
                      step="0.01"
                      value={config.stimulus.mutationThreshold}
                      onChange={(e) => updateConfig(c => ({
                        ...c,
                        stimulus: { ...c.stimulus, mutationThreshold: parseFloat(e.target.value) }
                      }))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                      <span>0.30 (Muito sensível)</span>
                      <span>0.72 (GDD)</span>
                      <span>0.95 (Ultra-estrito)</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Threshold de Inquietação / Aviso (GDD: 0.55)</span>
                      <span className="font-mono text-amber-300">{config.stimulus.warningThreshold.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.20"
                      max="0.80"
                      step="0.01"
                      value={config.stimulus.warningThreshold}
                      onChange={(e) => updateConfig(c => ({
                        ...c,
                        stimulus: { ...c.stimulus, warningThreshold: parseFloat(e.target.value) }
                      }))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Throttle de Tempo de Mutações */}
              <div className="space-y-4 bg-slate-950/40 p-4 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    Throttle Temporal entre Mutações
                  </h3>
                  <span className="text-xs text-cyan-400 font-mono">
                    1ª: {config.mutations.minTimeFirstMutationSec}s | Subsequentes: {config.mutations.minTimeBetweenMutationsSec}s
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Tempo Mínimo 1º Mundo</span>
                      <span className="font-mono text-cyan-300">{config.mutations.minTimeFirstMutationSec}s</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="180"
                      step="5"
                      value={config.mutations.minTimeFirstMutationSec}
                      onChange={(e) => updateConfig(c => ({
                        ...c,
                        mutations: { ...c.mutations, minTimeFirstMutationSec: parseInt(e.target.value) }
                      }))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">GDD: 90s (Use 15s para testar rápido)</span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Tempo Mínimo Mutações Seguintes</span>
                      <span className="font-mono text-cyan-300">{config.mutations.minTimeBetweenMutationsSec}s</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="120"
                      step="5"
                      value={config.mutations.minTimeBetweenMutationsSec}
                      onChange={(e) => updateConfig(c => ({
                        ...c,
                        mutations: { ...c.mutations, minTimeBetweenMutationsSec: parseInt(e.target.value) }
                      }))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">GDD: 60s entre novos mundos</span>
                  </div>
                </div>
              </div>

              {/* 3. HUD Dissolution & Scars Rarity Balance */}
              <div className="grid grid-cols-2 gap-4">
                {/* HUD Dissolution */}
                <div className="space-y-3 bg-slate-950/40 p-4 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Velocidade de Dissolução da HUD</h3>
                    <span className="text-xs font-mono text-purple-300">{config.hud.dissolutionSpeedMultiplier.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.1"
                    value={config.hud.dissolutionSpeedMultiplier}
                    onChange={(e) => updateConfig(c => ({
                      ...c,
                      hud: { ...c.hud, dissolutionSpeedMultiplier: parseFloat(e.target.value) }
                    }))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-400"
                  />
                  <p className="text-[11px] text-slate-400">
                    Controla o quão rápido a HUD (HP, Combo, Score) desaparece conforme a estimulação cresce.
                  </p>
                </div>

                {/* Rare vs Common Scars */}
                <div className="space-y-3 bg-slate-950/40 p-4 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Chance de Cicatrizes Raras</h3>
                    <span className="text-xs font-mono text-emerald-300">{(config.scars.rareScarProbability * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={config.scars.rareScarProbability}
                    onChange={(e) => updateConfig(c => ({
                      ...c,
                      scars: { ...c.scars, rareScarProbability: parseFloat(e.target.value) }
                    }))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />
                  <p className="text-[11px] text-slate-400">
                    Probabilidade de desbloquear FANTASMA, PULSO, COLAPSO ou PARALISIA quando elegíveis (GDD: 30%).
                  </p>
                </div>
              </div>

              {/* 4. Behavior & Juice */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 bg-slate-950/40 p-4 rounded-lg border border-slate-800">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Decaimento EMA do Comportamento</span>
                    <span className="font-mono text-slate-200">{config.behavior.decayFactor.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.80"
                    max="0.99"
                    step="0.01"
                    value={config.behavior.decayFactor}
                    onChange={(e) => updateConfig(c => ({
                      ...c,
                      behavior: { ...c.behavior, decayFactor: parseFloat(e.target.value) }
                    }))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-400"
                  />
                  <span className="text-[10px] text-slate-500 block">0.97 = memória de ~30 ações</span>
                </div>

                <div className="space-y-2 bg-slate-950/40 p-4 rounded-lg border border-slate-800">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">Hitstop Freeze (Micro-pausa de impacto)</span>
                    <span className="font-mono text-slate-200">{config.juice.hitstopMs}ms</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="5"
                    value={config.juice.hitstopMs}
                    onChange={(e) => updateConfig(c => ({
                      ...c,
                      juice: { ...c.juice, hitstopMs: parseInt(e.target.value) }
                    }))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-400"
                  />
                  <span className="text-[10px] text-slate-500 block">GDD: 30ms para peso cinético ideal</span>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'voice' && (
            <div className="space-y-6">
              <div className="space-y-4 bg-slate-950/40 p-5 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <Mic className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Voz do Curador (Speech Synthesis API)</h3>
                      <p className="text-xs text-slate-400">
                        O Curador sintetiza voz neural/nativa do navegador para comentar em tempo real.
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                    <span className="text-xs font-mono text-slate-300">Voz Ativa:</span>
                    <input
                      type="checkbox"
                      checked={config.curatorVoice?.enabled ?? true}
                      onChange={(e) => updateConfig(c => ({
                        ...c,
                        curatorVoice: { ...c.curatorVoice, enabled: e.target.checked }
                      }))}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  {/* Volume */}
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300 font-medium">Volume</span>
                      <span className="font-mono text-amber-300">{((config.curatorVoice?.volume ?? 0.28) * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="1.0"
                      step="0.01"
                      value={config.curatorVoice?.volume ?? 0.28}
                      onChange={(e) => updateConfig(c => ({
                        ...c,
                        curatorVoice: { ...c.curatorVoice, volume: parseFloat(e.target.value) }
                      }))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Inicia baixo (28%) para sussurrar</span>
                  </div>

                  {/* Pitch */}
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300 font-medium">Tom (Pitch)</span>
                      <span className="font-mono text-amber-300">{(config.curatorVoice?.pitch ?? 0.85).toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.05"
                      value={config.curatorVoice?.pitch ?? 0.85}
                      onChange={(e) => updateConfig(c => ({
                        ...c,
                        curatorVoice: { ...c.curatorVoice, pitch: parseFloat(e.target.value) }
                      }))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">0.85 = Tom misterioso e solene</span>
                  </div>

                  {/* Rate */}
                  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300 font-medium">Velocidade (Rate)</span>
                      <span className="font-mono text-amber-300">{(config.curatorVoice?.rate ?? 0.92).toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.05"
                      value={config.curatorVoice?.rate ?? 0.92}
                      onChange={(e) => updateConfig(c => ({
                        ...c,
                        curatorVoice: { ...c.curatorVoice, rate: parseFloat(e.target.value) }
                      }))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">0.92 = Ritmo pausado e deliberado</span>
                  </div>
                </div>

                {/* Voice Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium block">
                    Voz do Sistema (Disponíveis no seu Navegador):
                  </label>
                  <select
                    value={config.curatorVoice?.voiceUri ?? ''}
                    onChange={(e) => updateConfig(c => ({
                      ...c,
                      curatorVoice: { ...c.curatorVoice, voiceUri: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-400"
                  >
                    <option value="">(Automático: Preferir Português / Voz Natural)</option>
                    {availableVoices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Test Voice Button */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
                  <span className="text-xs font-mono text-slate-400">
                    Teste o volume e a entonação da fala curta:
                  </span>
                  <button
                    onClick={() => {
                      setIsPlayingTest(true);
                      curatorVoice.speakSynthesizer('Você encontrou uma cadência.', {
                        volume: config.curatorVoice?.volume,
                        pitch: config.curatorVoice?.pitch,
                        rate: config.curatorVoice?.rate,
                        voiceUri: config.curatorVoice?.voiceUri,
                      });
                      setTimeout(() => setIsPlayingTest(false), 2000);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold font-mono transition-all ${
                      isPlayingTest
                        ? 'bg-amber-400 text-slate-950 animate-pulse'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    {isPlayingTest ? 'Reproduzindo...' : 'Ouvir Prévia da Voz'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'presets' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(PLAYTEST_PRESETS).map(([key, preset]) => (
                <div
                  key={key}
                  className="bg-slate-950/50 border border-slate-800 hover:border-amber-500/50 rounded-lg p-4 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-white">{preset.name}</h4>
                      {key === 'gdd_default' && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Original GDD
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mb-3">{preset.description}</p>
                    <div className="text-[11px] font-mono text-slate-500 space-y-0.5">
                      <div>Threshold: {preset.config.stimulus.mutationThreshold}</div>
                      <div>Tempo 1ª Mutação: {preset.config.mutations.minTimeFirstMutationSec}s</div>
                      <div>Raras: {(preset.config.scars.rareScarProbability * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePresetSelect(key)}
                    className="mt-4 w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 text-xs font-medium transition-colors"
                  >
                    Ativar Este Preset
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'json' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Edite o objeto JSON diretamente abaixo ou cole configurações de playtests externos.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyJson}
                    className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado!' : 'Copiar JSON'}
                  </button>
                  <button
                    onClick={handleApplyJson}
                    className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-medium transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Aplicar Mudanças
                  </button>
                </div>
              </div>

              {importStatus && (
                <div className={`p-2.5 rounded text-xs font-mono ${importStatus.includes('Erro') ? 'bg-red-950/60 border border-red-800 text-red-300' : 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'}`}>
                  {importStatus}
                </div>
              )}

              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                rows={16}
                className="w-full bg-slate-950 text-emerald-400 font-mono text-xs p-4 rounded-lg border border-slate-800 focus:outline-none focus:border-amber-500"
                spellCheck={false}
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Restaurar Padrões do GDD
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-semibold transition-colors"
            >
              Continuar Jogando
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
