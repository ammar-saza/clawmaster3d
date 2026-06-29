export type ClawPhase = 'idle' | 'moving' | 'descending' | 'closing' | 'ascending' | 'returning' | 'dropping' | 'resetting';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Capsule {
  id: string;
  x: number;      // -100 to 100
  y: number;      // Bottom of cabinet is 0, top of toy bed is up to 50
  z: number;      // -100 to 100
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  rarity: Rarity;
  color: string;
  prizeName: string;
  points: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  spinX: number;
  spinY: number;
  isGrabbed: boolean;
  scaleY?: number; // for toy plush shape variety
}

export interface ClawState {
  x: number;      // -100 to 100
  y: number;      // Height from 0 to 200
  z: number;      // -100 to 100
  phase: ClawPhase;
  fingerOpenAngle: number; // 0 (closed) to 1 (fully open)
  grabbedCapsuleId: string | null;
  targetX: number;
  targetZ: number;
  dropTimer: number;
  wobbleX: number;
  wobbleZ: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  timestamp: number;
  isUser?: boolean;
}

export interface ArcadeFeedEvent {
  id: string;
  time: string;
  playerName: string;
  type: 'coin_insert' | 'claw_move' | 'catch_success' | 'catch_fail' | 'enter' | 'exit';
  detail: string;
  rarity?: Rarity;
}
