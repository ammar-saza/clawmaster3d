import { useState, useEffect, useRef } from 'react';
import { ArcadeCabinet } from './components/ArcadeCabinet';
import { LeaderboardPanel } from './components/LeaderboardPanel';
import { LiveShowcase } from './components/LiveShowcase';
import { TutorialModal } from './components/TutorialModal';
import { AudioSettingsPanel } from './components/AudioSettingsPanel';
import { LeaderboardEntry, ArcadeFeedEvent, Rarity } from './types';
import { AudioEngine } from './utils/audio';
import { Volume2, VolumeX, HelpCircle, Flame, Gamepad2, Gift } from 'lucide-react';

const INITIAL_VIRTUAL_PLAYERS = [
  { id: 'v1', name: 'RetroGamer_7', score: 2600, timestamp: Date.now() - 3600000 },
  { id: 'v2', name: 'PixelClaw', score: 1850, timestamp: Date.now() - 7200000 },
  { id: 'v3', name: 'VoxelWarder', score: 1250, timestamp: Date.now() - 10800000 },
  { id: 'v4', name: 'NeonGlider', score: 750, timestamp: Date.now() - 14400000 },
  { id: 'v5', name: 'Lander_X', score: 450, timestamp: Date.now() - 18000000 },
  { id: 'v6', name: 'LuckyGraber', score: 200, timestamp: Date.now() - 21600000 },
];

export default function App() {
  // Saved local high scores if any
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('neonclaw_player_name') || 'Guest_Player';
  });

  const [playerScore, setPlayerScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('neonclaw_player_score') || '0', 10);
  });

  const [coins, setCoins] = useState<number>(() => {
    const saved = localStorage.getItem('neonclaw_player_coins');
    return saved !== null ? parseInt(saved, 10) : 5; // Start with 5 coins
  });

  const [prizesCaught, setPrizesCaught] = useState<Array<{ name: string; timestamp: number; color: string; val: number }>>(() => {
    const saved = localStorage.getItem('neonclaw_winnings');
    return saved ? JSON.parse(saved) : [];
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [feedEvents, setFeedEvents] = useState<ArcadeFeedEvent[]>([]);
  const [nextCoinInSeconds, setNextCoinInSeconds] = useState<number>(30);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isManualOpen, setIsManualOpen] = useState<boolean>(true); // Defaults to true on entry

  // Active virtual competitors loop reference
  const virtualPlayersRef = useRef<Array<{ id: string; name: string; score: number }>>([
    ...INITIAL_VIRTUAL_PLAYERS
  ]);

  // Synchronize Player Name changes
  const handleUpdateName = (newName: string) => {
    setPlayerName(newName);
    localStorage.setItem('neonclaw_player_name', newName);

    // Trigger local feed update
    handleNewFeedEvent({
      id: `setup_${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      playerName: newName,
      type: 'enter',
      detail: 'configured their custom nickname on the console!',
    });
  };

  // Score points from capsule retrieval
  const handleScorePoints = (points: number, prizeName: string, rarity: Rarity) => {
    const nextScore = playerScore + points;
    setPlayerScore(nextScore);
    localStorage.setItem('neonclaw_player_score', nextScore.toString());

    // Update listings
    const newWin = {
      name: prizeName,
      timestamp: Date.now(),
      color: rarity === 'common' ? '#ff4b4b' : rarity === 'uncommon' ? '#3b82f6' : rarity === 'rare' ? '#d946ef' : rarity === 'epic' ? '#f43f5e' : '#ffffff',
      val: points
    };
    const nextWins = [newWin, ...prizesCaught];
    setPrizesCaught(nextWins);
    localStorage.setItem('neonclaw_winnings', JSON.stringify(nextWins));
  };

  // Consume coin trigger
  const handleUseCoin = () => {
    if (coins <= 0) return false;
    const nextCoins = coins - 1;
    setCoins(nextCoins);
    localStorage.setItem('neonclaw_player_coins', nextCoins.toString());
    return true;
  };

  // Manual coin grant
  const handleAddCoin = () => {
    const nextCoins = Math.min(15, coins + 1); // Cap coin count slightly to encourage gameplay
    setCoins(nextCoins);
    localStorage.setItem('neonclaw_player_coins', nextCoins.toString());
  };

  // Handle stream feed notifications
  const handleNewFeedEvent = (event: ArcadeFeedEvent) => {
    setFeedEvents((prev) => [event, ...prev].slice(0, 30)); // keeps max pool clean
  };

  // Initial Startup Actions
  useEffect(() => {
    // Welcome notification
    handleNewFeedEvent({
      id: `welcome_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      playerName: playerName,
      type: 'enter',
      detail: 'stepped into the cyber machine zone!',
    });
  }, []);

  // Sync ref with playerName for the timer to avoid stale closures
  const stateRef = useRef({ coins, playerName });
  useEffect(() => {
    stateRef.current = { coins, playerName };
  }, [coins, playerName]);

  // Free coin generator effect (30 second ticks)
  useEffect(() => {
    const timer = setInterval(() => {
      setNextCoinInSeconds((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setTimeout(() => {
            if (stateRef.current.coins < 10) {
              handleAddCoin();
              handleNewFeedEvent({
                id: `dispense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                playerName: 'CONSOLE',
                type: 'enter',
                detail: `granted a FREE token to ${stateRef.current.playerName}! (${stateRef.current.coins + 1} total)`,
              });
              AudioEngine.playTargetHit();
            }
          }, 0);
          return 30;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);


  // LEADERBOARD MERGING & RE-SORT
  useEffect(() => {
    // Combine current user scores with virtual competitors data
    const userRow: LeaderboardEntry = {
      id: 'current_user',
      name: playerName,
      score: playerScore,
      timestamp: Date.now(),
      isUser: true,
    };

    const combinedList = [
      userRow,
      ...virtualPlayersRef.current.map((vp) => ({
        id: vp.id,
        name: vp.name,
        score: vp.score,
        timestamp: Date.now(),
      })),
    ];

    // Core sorting hierarchy: sorting by score descending
    combinedList.sort((a, b) => b.score - a.score);
    setLeaderboard(combinedList);
  }, [playerName, playerScore, coins]);

  // VIRTUAL COMPETITORS GAMEPLAY SIMULATOR
  // Emulates other online arcade machines to populate action logs and leaderboard dynamics
  useEffect(() => {
    const interval = setInterval(() => {
      const candidates = virtualPlayersRef.current;
      const targetIndex = Math.floor(Math.random() * candidates.length);
      const chosenPlayer = candidates[targetIndex];

      const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const coinProb = Math.random();

      if (coinProb < 0.28) {
        // Option 1: Virtual player enters coin
        handleNewFeedEvent({
          id: `feed_virt_coin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          time: currentTime,
          playerName: chosenPlayer.name,
          type: 'coin_insert',
          detail: 'inserted an arcade coin to start a game!',
        });
      } 
      else if (coinProb < 0.75) {
        // Option 2: Caught Capsule! Boost points and re-sort
        const options: { text: string; val: number; r: Rarity }[] = [
          { text: 'Honey Cuddle Teddy', val: 100, r: 'common' },
          { text: 'Peach Bubble Bear', val: 105, r: 'common' },
          { text: 'Aqua Cyber Bear', val: 250, r: 'uncommon' },
          { text: 'Sunny Lemon Bear', val: 255, r: 'uncommon' },
          { text: 'Retro Gamer Teddy', val: 500, r: 'rare' },
          { text: 'Cyberpunk Neon Bear', val: 1000, r: 'epic' },
        ];
        const prize = options[Math.floor(Math.random() * options.length)];
        
        // Update competitors ref state in background
        chosenPlayer.score += prize.val;
        virtualPlayersRef.current = [...candidates];

        handleNewFeedEvent({
          id: `feed_virt_success_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          time: currentTime,
          playerName: chosenPlayer.name,
          type: 'catch_success',
          detail: `scored +${prize.val} pts for scooping a ${prize.text} (${prize.r.toUpperCase()})!`,
          rarity: prize.r,
        });

        // Trigger visual highlight update on leaderboard sorted entries
        setLeaderboard((prev) => {
          const next = prev.map((item) =>
            item.id === chosenPlayer.id ? { ...item, score: chosenPlayer.score } : item
          );
          return [...next].sort((a, b) => b.score - a.score);
        });
      } 
      else {
        // Option 3: Claw missed
        handleNewFeedEvent({
          id: `feed_virt_fail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          time: currentTime,
          playerName: chosenPlayer.name,
          type: 'catch_fail',
          detail: 'had their capsule slide right out! Brutal slip!',
        });
      }

    }, 14000); // Ticks every 14s for background arcade density

    return () => clearInterval(interval);
  }, []);

  // AudioManager Toggle Trigger
  const toggleMute = () => {
    AudioEngine.toggleMute();
    setIsAudioMuted(!isAudioMuted);
  };

  return (
    <div className="min-h-screen bg-[#07060e] text-slate-100 flex flex-col justify-between">
      
      {/* GLOWING ARCADE NEON HEADER SECTION */}
      <header className="border-b border-purple-900 bg-[#0d091a]/40 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-40 select-none">
        
        {/* Title logo branding with visual fire markers */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-purple-500/30 animate-pulse">
            <Gamepad2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold font-sans tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400 uppercase">
              NEON CLAW 3D
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">ARCADE SIMULATOR // VER 2.5</p>
          </div>
        </div>

        {/* Global Toolbar buttons */}
        <div className="flex items-center gap-2.5">
          {/* Flame streak */}
          <div className="hidden sm:flex items-center gap-1 bg-amber-500/10 border border-amber-500/22 px-2.5 py-1 rounded-xl text-amber-400 text-xs font-mono font-bold">
            <Flame className="w-3.5 h-3.5 fill-amber-400 animate-bounce" /> ACTIVE GAMES
          </div>

          {/* Guide Manuel Indicator Trigger */}
          <button
            id="open-manual-btn"
            onClick={() => setIsManualOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 hover:border-cyan-400 bg-slate-900/60 hover:bg-slate-900 text-slate-300 hover:text-white text-xs font-semibold tracking-wider transition-all cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" /> MANUAL
          </button>

          {/* Audio toggle */}
          <button
            id="audio-toggle-btn"
            onClick={toggleMute}
            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
              isAudioMuted
                ? 'border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-cyan-400'
            }`}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* THREE COLUMN GRID MASTER CABINET RESPONSIVE VIEW */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch">
        
        {/* CENTER/LEFT GRID: Crane simulation viewport (8 core columns) */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <ArcadeCabinet
            playerName={playerName}
            coins={coins}
            useCoin={handleUseCoin}
            onScorePoints={handleScorePoints}
            onFeedEvent={handleNewFeedEvent}
            isAudioMuted={isAudioMuted}
          />
        </div>

        {/* RIGHT COLUMN GRID: Trophies, Profile, Leaderboard (5 core columns) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <LeaderboardPanel
            leaderboard={leaderboard}
            playerName={playerName}
            onUpdateName={handleUpdateName}
            playerScore={playerScore}
            coins={coins}
            onAddCoin={handleAddCoin}
            nextCoinInSeconds={nextCoinInSeconds}
            prizesCaught={prizesCaught}
          />

          <AudioSettingsPanel
            isMuted={isAudioMuted}
            onMuteToggle={toggleMute}
          />
          
          <LiveShowcase events={feedEvents} />
        </div>

      </main>

      {/* TUTORIAL ONBOARDING SCREEN manual */}
      <TutorialModal isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} />

      {/* FOOTER METRICS AND METADATA */}
      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-slate-500 gap-2 select-none">
        <div>
          SYS_PING: 14MS // HOSTED CLOUD_INGRESS
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Gift className="w-3.5 h-3.5 text-pink-400 animate-pulse" /> Collected treasures survive cache clears!
        </div>
      </footer>
    </div>
  );
}
