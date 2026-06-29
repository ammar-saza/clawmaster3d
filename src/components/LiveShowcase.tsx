import React from 'react';
import { ArcadeFeedEvent } from '../types';
import { Radio, Sparkles, MessageSquare } from 'lucide-react';

interface LiveShowcaseProps {
  events: ArcadeFeedEvent[];
}

export const LiveShowcase: React.FC<LiveShowcaseProps> = ({ events }) => {
  return (
    <div className="w-full bg-slate-900 rounded-2xl border-2 border-slate-800 p-5 mt-4 flex flex-col gap-3 shadow-xl font-sans" id="live-showcase-module">
      
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
            REAL-TIME COLLABORATORS FEED
          </span>
        </div>
        <span className="text-[9px] font-mono font-bold uppercase text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded tracking-wider flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 text-rose-400" /> ACTIVE
        </span>
      </div>

      {/* Events Stream */}
      <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
        {events.length === 0 ? (
          <div className="text-xs text-slate-500 font-mono text-center py-6">
            Connecting to global arcade network... Wait for feeds.
          </div>
        ) : (
          events.slice(0, 7).map((evt) => {
            const isCoin = evt.type === 'coin_insert';
            const isGrabSuccess = evt.type === 'catch_success';
            const isGrabFail = evt.type === 'catch_fail';
            
            // Format colors based on action type
            let actionBadgeStyle = 'bg-slate-950 text-slate-400 border border-slate-850';
            let iconMarker = '🕹️';
            
            if (isCoin) {
              actionBadgeStyle = 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
              iconMarker = '🟡';
            } else if (isGrabSuccess) {
              actionBadgeStyle = 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 font-extrabold';
              iconMarker = '🎉';
            } else if (isGrabFail) {
              actionBadgeStyle = 'bg-rose-500/10 text-rose-400 border border-rose-500/30';
              iconMarker = '🩹';
            } else if (evt.type === 'enter') {
              actionBadgeStyle = 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/22';
              iconMarker = '✨';
            }

            return (
              <div
                key={evt.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-slate-950/70 hover:bg-slate-950 border border-slate-850 rounded-xl transition-all gap-1 text-[11px] font-mono animate-fade-in"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs">{iconMarker}</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-extrabold text-slate-200 tracking-wide">
                      {evt.playerName}
                    </span>
                    <span className="text-slate-400 font-medium">
                      {evt.detail}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 justify-between sm:justify-end">
                  <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">{evt.time}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
