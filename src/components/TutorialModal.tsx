import React from 'react';
import { HelpCircle, X, Sliders, PlayCircle, Key, Info } from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
      <div className="w-full max-w-xl bg-slate-900 rounded-3xl border-2 border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-extrabold text-white tracking-widest uppercase">
              ARCADE GAME MANUAL
            </h2>
          </div>
          <button
            id="close-tutorial-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6 text-slate-300 text-xs leading-relaxed max-w-full">
          
          {/* Quick Guide */}
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white uppercase text-xs mb-1">Authentic 3D Mechanical Claw Game</p>
              <p className="text-slate-400 text-[11px]">
                Control the crane's position above a nested pile of cute plush teddy bears. Clump around the bears, reel them up carefully, and drop them into the bottom-left chute. Beware of mechanical swings; active crane swings can cause teddies to slip out!
              </p>
            </div>
          </div>

          {/* Steer mechanics */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 flex flex-col gap-2.5">
            <div className="text-[10px] font-mono tracking-wider text-slate-400 font-extrabold uppercase flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-rose-500" /> CONTROLLER ACTION KEYS
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px]">
              <div className="flex items-center gap-2">
                <span className="bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-md text-white font-bold">[ W, A, S, D ]</span>
                <span className="text-slate-400">or Arrows to Steer</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-slate-900 border border-slate-700 px-3 py-1 rounded-md text-white font-bold">[ SPACE ]</span>
                <span className="text-slate-400">drops and fires claw</span>
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <span className="bg-slate-900 border border-slate-700 px-2 py-1 rounded-md text-white font-bold">🕹️ DRAG KNOB</span>
                <span className="text-slate-400">Mouse/Touch Analog control panel</span>
              </div>
            </div>
          </div>

          {/* Capsule modifiers */}
          <div className="flex flex-col gap-2.5">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-extrabold flex items-center gap-1.5">
              <Key className="w-4 h-4 text-cyan-400" /> PLUSH TEDDY BEAR RARITY INDEX
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              
              <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-red-500/20">
                <div className="flex items-center gap-2 font-mono">
                  <span className="w-3 h-3 rounded-full bg-[#ff4b4b] shadow shadow-[#ff4b4b]" />
                  <span className="font-extrabold text-[#ff4b4b] uppercase">[ COMMON ]</span>
                </div>
                <span className="text-slate-300 font-extrabold font-mono">100 PTS</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-blue-500/20">
                <div className="flex items-center gap-2 font-mono">
                  <span className="w-3 h-3 rounded-full bg-[#3b82f6] shadow shadow-[#3b82f6]" />
                  <span className="font-extrabold text-[#3b82f6] uppercase">[ UNCOMMON ]</span>
                </div>
                <span className="text-slate-300 font-extrabold font-mono">250 PTS</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-purple-500/20">
                <div className="flex items-center gap-2 font-mono">
                  <span className="w-3 h-3 rounded-full bg-[#d946ef] shadow shadow-[#d946ef]" />
                  <span className="font-extrabold text-[#d946ef] uppercase">[ RARE ]</span>
                </div>
                <span className="text-slate-300 font-extrabold font-mono">500 PTS</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-rose-500/20">
                <div className="flex items-center gap-2 font-mono">
                  <span className="w-3 h-3 rounded-full bg-[#f43f5e] shadow shadow-[#f43f5e]" />
                  <span className="font-extrabold text-[#f43f5e] uppercase">[ EPIC ]</span>
                </div>
                <span className="text-slate-300 font-extrabold font-mono font-mono">1,000 PTS</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-white/20 sm:col-span-2">
                <div className="flex items-center gap-2 font-mono">
                  <span className="w-3 h-3 rounded-full bg-[#ffffff] shadow shadow-white animate-pulse" />
                  <span className="font-extrabold text-white uppercase">[ LEGENDARY ]</span>
                </div>
                <span className="text-amber-400 font-extrabold font-mono">2,500 PTS</span>
              </div>

            </div>
          </div>

          {/* Arcade tips */}
          <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/40 text-[11px] text-slate-300">
            <span className="font-bold text-cyan-400 block mb-1">⭐ PRO CLAW STRATEGY:</span>
            To catch rare or legendary teddy bears, align the crane's shadow precisely over the target teddy before dropping. Move slowly and let the claw come to a complete rest to eliminate swings, minimizing drops!
          </div>

        </div>

        {/* Bottom Button */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            id="start-playing-btn"
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold rounded-xl active:scale-95 transition-all text-xs flex items-center gap-1.5"
          >
            <PlayCircle className="w-4 h-4" /> START PLAYING
          </button>
        </div>

      </div>
    </div>
  );
};
