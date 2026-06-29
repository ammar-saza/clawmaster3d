import React, { useState, useEffect } from 'react';
import { AudioEngine } from '../utils/audio';
import { Sliders, Music, Activity, Coins, Music4, Play, Volume2, VolumeX } from 'lucide-react';

interface AudioSettingsPanelProps {
  isMuted: boolean;
  onMuteToggle: () => void;
}

export const AudioSettingsPanel: React.FC<AudioSettingsPanelProps> = ({
  isMuted,
  onMuteToggle,
}) => {
  // Read current sound config from AudioEngine directly
  const [musicVol, setMusicVol] = useState(() => Math.round(AudioEngine.musicVolume * 100));
  const [craneVol, setCraneVol] = useState(() => Math.round(AudioEngine.craneVolume * 100));
  const [coinVol, setCoinVol] = useState(() => Math.round(AudioEngine.coinVolume * 100));
  const [isExpanded, setIsExpanded] = useState(true);

  // Synchronize when settings change
  const handleMusicChange = (val: number) => {
    setMusicVol(val);
    AudioEngine.setMusicVolume(val / 100);
  };

  const handleCraneChange = (val: number) => {
    setCraneVol(val);
    AudioEngine.setCraneVolume(val / 100);
  };

  const handleCoinChange = (val: number) => {
    setCoinVol(val);
    AudioEngine.setCoinVolume(val / 100);
  };

  // Sound triggering functions for playtesting
  const testMusic = () => {
    if (isMuted) return;
    // Just toggle off/on ambient hum quickly to let them hear the current frequency level
    AudioEngine.setMusicVolume(musicVol / 100);
  };

  const testCrane = () => {
    if (isMuted) return;
    AudioEngine.playClawAction();
  };

  const testCoin = () => {
    if (isMuted) return;
    AudioEngine.playCoin();
  };

  return (
    <div 
      className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl p-5 shadow-xl font-sans"
      id="advanced-audio-settings-panel"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-pink-400 animate-pulse" />
          <h2 className="text-xs font-mono font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 uppercase tracking-widest">
            Advanced Sound Deck
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Main Mute status button */}
          <button
            id="audio-deck-mute-btn"
            onClick={onMuteToggle}
            className={`px-2.5 py-1 text-[10px] font-mono rounded font-extrabold transition-all border outline-none cursor-pointer ${
              isMuted
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            {isMuted ? 'ALL MUTED' : 'LIVE SOUND'}
          </button>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-mono text-slate-400 hover:text-white hover:underline ml-1"
          >
            {isExpanded ? '[ HIDE ]' : '[ SHOW ]'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="flex flex-col gap-4">
          {isMuted && (
            <div className="bg-rose-500/10 border border-rose-500/22 rounded-xl p-3 text-center text-xs text-rose-400 font-mono">
              ⚠️ Audio is globally muted. Unmute to preview or test levels!
            </div>
          )}

          {/* BACKGROUND MUSIC SLIDER */}
          <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-slate-950 border border-slate-850">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-slate-300 font-bold font-sans">
                <Music className="w-3.5 h-3.5 text-cyan-400" />
                Background Aura (Hum)
              </span>
              <span className="text-xs font-mono font-bold text-cyan-400">{musicVol}%</span>
            </div>
            
            <div className="flex items-center gap-3 mt-1.5">
              <input
                id="audio-music-slider"
                type="range"
                min="0"
                max="100"
                value={musicVol}
                onChange={(e) => handleMusicChange(Number(e.target.value))}
                className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
              />
              <button
                id="test-music-btn"
                onClick={testMusic}
                disabled={isMuted}
                title="Preview Sound"
                className="p-1 rounded bg-slate-900 border border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-400 transition-all cursor-pointer disabled:opacity-30"
              >
                <Music4 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* CRANE MOVEMENT SOUNDS SLIDER */}
          <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-slate-950 border border-slate-850">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-slate-300 font-bold font-sans">
                <Activity className="w-3.5 h-3.5 text-pink-400" />
                Crane Motors & Grab
              </span>
              <span className="text-xs font-mono font-bold text-pink-400">{craneVol}%</span>
            </div>

            <div className="flex items-center gap-3 mt-1.5">
              <input
                id="audio-crane-slider"
                type="range"
                min="0"
                max="100"
                value={craneVol}
                onChange={(e) => handleCraneChange(Number(e.target.value))}
                className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500 focus:outline-none"
              />
              <button
                id="test-crane-btn"
                onClick={testCrane}
                disabled={isMuted}
                title="Trigger Claw Audio Test"
                className="p-1 rounded bg-slate-900 border border-slate-700 text-slate-400 hover:text-pink-400 hover:border-pink-500 transition-all cursor-pointer disabled:opacity-30 flex items-center justify-center"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* COIN COLLECTION ALERTS SLIDER */}
          <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-slate-950 border border-slate-850">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-slate-300 font-bold font-sans">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                Coin Collection Alerts
              </span>
              <span className="text-xs font-mono font-bold text-amber-400">{coinVol}%</span>
            </div>

            <div className="flex items-center gap-3 mt-1.5">
              <input
                id="audio-coin-slider"
                type="range"
                min="0"
                max="100"
                value={coinVol}
                onChange={(e) => handleCoinChange(Number(e.target.value))}
                className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
              />
              <button
                id="test-coin-btn"
                onClick={testCoin}
                disabled={isMuted}
                title="Trigger Coin Scale Audio Test"
                className="p-1 rounded bg-slate-900 border border-slate-700 text-slate-400 hover:text-amber-400 hover:border-amber-500 transition-all cursor-pointer disabled:opacity-30 flex items-center justify-center"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
