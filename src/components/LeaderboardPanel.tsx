import React, { useState } from 'react';
import { LeaderboardEntry } from '../types';
import { Trophy, Coins, User, Edit, Timer } from 'lucide-react';

interface LeaderboardPanelProps {
  leaderboard: LeaderboardEntry[];
  playerName: string;
  onUpdateName: (name: string) => void;
  playerScore: number;
  coins: number;
  onAddCoin: () => void;
  nextCoinInSeconds: number;
  prizesCaught: Array<{ name: string; timestamp: number; color: string; val: number }>;
}

export const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({
  leaderboard,
  playerName,
  onUpdateName,
  playerScore,
  coins,
  onAddCoin,
  nextCoinInSeconds,
  prizesCaught,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(playerName);

  const handleSubmitName = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onUpdateName(nameInput.trim());
      setIsEditingName(false);
    }
  };

  return (
    <div className="w-full bg-slate-900 rounded-2xl border-2 border-slate-800 p-5 flex flex-col gap-5 shadow-xl font-sans" id="leaderboard-module">
      
      {/* COIN GEN TIERS */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total Points */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">Your Wallet</span>
            <span className="text-xl font-extrabold text-amber-400 font-mono flex items-center gap-1.5 mt-0.5">
              <Coins className="w-5 h-5 text-amber-400" />
              {coins} <span className="text-xs text-slate-500 font-medium font-sans">COINS</span>
            </span>
          </div>
        </div>

        {/* Total Score */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">Your Score</span>
            <span className="text-xl font-extrabold text-cyan-400 font-mono flex items-center gap-1.5 mt-0.5">
              <Trophy className="w-5 h-5 text-cyan-400" />
              {playerScore} <span className="text-xs text-slate-500 font-medium font-sans">PTS</span>
            </span>
          </div>
        </div>
      </div>

      {/* COIN MINT GENERATOR SLOTS */}
      <div className="p-3 bg-slate-950 rounded-xl border border-slate-850 flex items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-2 text-xs">
          <Timer className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '4s' }} />
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-extrabold">COIN DISPENSER</span>
            <span className="text-emerald-400 font-bold">NEXT FREE COIN IN {nextCoinInSeconds}s</span>
          </div>
        </div>
        <div className="flex-1 max-w-[120px] h-1.5 bg-slate-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${(1 - nextCoinInSeconds / 30) * 100}%` }}
          />
        </div>
      </div>

      {/* PLAYER NICKNAME SETTINGS EDITOR */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 flex flex-col gap-2.5">
        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-cyan-400" /> PLAYER PROFILE
        </div>

        {isEditingName ? (
          <form onSubmit={handleSubmitName} className="flex gap-2 w-full">
            <input
              id="player-name-input"
              type="text"
              maxLength={15}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              placeholder="Nickname..."
              autoFocus
            />
            <button
              id="save-name-btn"
              type="submit"
              className="bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white px-3 py-1.5 rounded-lg border border-cyan-500/50 text-xs font-semibold tracking-wider transition-all"
            >
              SAVE
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold font-sans text-cyan-400 tracking-wide font-mono flex items-center gap-1.5">
              {playerName} <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/22 px-1.5 py-0.5 rounded uppercase">YOU</span>
            </span>
            <button
              id="edit-name-btn"
              onClick={() => setIsEditingName(true)}
              className="text-slate-400 hover:text-cyan-400 p-1 rounded-md hover:bg-slate-900 transition-all"
              title="Edit Nickname"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* CORE LEADERBOARD LIST */}
      <div className="flex-1 flex flex-col gap-2.5 min-h-[220px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            🏆 GLOBAL HIGH SCORES
          </span>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded font-extrabold">LIVE SYNCHRONIZED</span>
        </div>

        <div className="flex flex-col gap-1.5 overflow-hidden">
          {leaderboard.map((entry, index) => {
            const isSelf = entry.isUser;
            const rank = index + 1;

            return (
              <div
                key={entry.id}
                className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                  isSelf
                    ? 'bg-cyan-500/10 border-cyan-500/50 text-white shadow-md'
                    : 'bg-slate-950/80 border-slate-850 hover:bg-slate-950 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank Badge */}
                  <span
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-extrabold font-mono ${
                      rank === 1
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow'
                        : rank === 2
                        ? 'bg-slate-300/20 text-slate-300 border border-slate-400/50'
                        : rank === 3
                        ? 'bg-amber-700/20 text-amber-600 border border-amber-700/50'
                        : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    {rank}
                  </span>

                  {/* Player Name */}
                  <span className={`text-xs font-semibold tracking-wide font-mono ${isSelf ? 'text-cyan-400 font-extrabold' : 'text-slate-200'}`}>
                    {entry.name}
                  </span>
                </div>

                {/* Score */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold font-mono text-slate-200">
                    {entry.score} <span className="text-[10px] text-slate-500 font-medium font-sans">PTS</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PRIZES LOG SHOWCASE SECTION */}
      {prizesCaught.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-slate-800 pt-3">
          <span className="text-[10px] font-mono font-extrabold text-slate-400 uppercase tracking-widest">
            🎁 COLLECTIBLE COLLECTION ({prizesCaught.length})
          </span>
          <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto pr-1">
            {prizesCaught.map((prize, i) => (
              <span
                key={i}
                className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-slate-950 border border-slate-850/80 flex items-center gap-1.5"
                style={{ borderColor: prize.color + '22' }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: prize.color }} />
                <span className="text-slate-300 font-semibold">{prize.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
