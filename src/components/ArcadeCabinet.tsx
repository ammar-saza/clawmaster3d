import React, { useRef, useEffect, useState } from 'react';
import { Capsule, ClawState, Rarity, ArcadeFeedEvent } from '../types';
import { AudioEngine } from '../utils/audio';

// Constants
const CABINET_WIDTH = 150;
const CABINET_LENGTH = 150;
const CABINET_HEIGHT = 180;
const GRAVITY = -0.32;
const RESTITUTION = 0.6; // bounciness
const DRAG = 0.985;
const CHUTE_MIN_X = -75;
const CHUTE_MAX_X = -35;
const CHUTE_MIN_Z = 35;
const CHUTE_MAX_Z = 75;

interface ArcadeCabinetProps {
  playerName: string;
  coins: number;
  useCoin: () => boolean;
  onScorePoints: (points: number, prizeName: string, rarity: Rarity) => void;
  onFeedEvent: (event: ArcadeFeedEvent) => void;
  isAudioMuted: boolean;
}

export const ArcadeCabinet: React.FC<ArcadeCabinetProps> = ({
  playerName,
  coins,
  useCoin,
  onScorePoints,
  onFeedEvent,
  isAudioMuted,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Simulation Game State
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [claw, setClaw] = useState<ClawState>({
    x: 0,
    y: 170,
    z: 0,
    phase: 'idle',
    fingerOpenAngle: 1.0,
    grabbedCapsuleId: null,
    targetX: 0,
    targetZ: 0,
    dropTimer: 0,
    wobbleX: 0,
    wobbleZ: 0,
  });

  const [joystickDir, setJoystickDir] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isCraneMoving, setIsCraneMoving] = useState<boolean>(false);
  const [arcadeMessage, setArcadeMessage] = useState<string>("INSERT COIN TO START PLAYING");
  const [coinsEjected, setCoinsEjected] = useState<number>(0);
  const [unlockedPrize, setUnlockedPrize] = useState<{ name: string; rarity: Rarity; points: number } | null>(null);

  // Ref-based states to prevent heavy re-renders during 60FPS animation loop
  const stateRef = useRef({
    capsules: [] as Capsule[],
    claw: {
      x: 0,
      y: 170,
      z: 0,
      phase: 'idle' as ClawState['phase'],
      fingerOpenAngle: 1.0,
      grabbedCapsuleId: null as string | null,
      targetX: 0,
      targetZ: 0,
      dropTimer: 0,
      wobbleX: 0,
      wobbleZ: 0,
      wobbleVX: 0,
      wobbleVZ: 0,
    },
    chutePrizeAnims: [] as Array<{ x: number; y: number; r: number; color: string; life: number; velocityY: number }>,
    joystickDir: { x: 0, y: 0 },
    keysPressed: {} as Record<string, boolean>,
    hasActivePlay: false,
    coins: 0,
  });

  stateRef.current.coins = coins;

  // Prize capsule dataset generator
  const createCapsulesList = (): Capsule[] => {
    const list: Capsule[] = [];
    const rarities: { r: Rarity; text: string; color: string; val: number }[] = [
      { r: 'common', text: 'Honey Cuddle Teddy', color: '#b45309', val: 100 },
      { r: 'common', text: 'Lime Velvet Bear', color: '#10b981', val: 100 },
      { r: 'common', text: 'Peach Bubble Bear', color: '#fb923c', val: 100 },
      { r: 'common', text: 'Lilac Baby Teddy', color: '#c084fc', val: 100 },
      { r: 'uncommon', text: 'Aqua Cyber Bear', color: '#06b6d4', val: 250 },
      { r: 'uncommon', text: 'Mint Choco Teddy', color: '#14b8a6', val: 250 },
      { r: 'uncommon', text: 'Sunny Lemon Bear', color: '#eab308', val: 250 },
      { r: 'rare', text: 'Retro Gamer Teddy', color: '#d946ef', val: 500 },
      { r: 'rare', text: 'Starry Denim Bear', color: '#3b82f6', val: 500 },
      { r: 'epic', text: 'Vintage Royal Velvet Bear', color: '#be123c', val: 1000 },
      { r: 'epic', text: 'Cyberpunk Neon Bear', color: '#f43f5e', val: 1000 },
      { r: 'legendary', text: 'Prismatic Galaxy Bear', color: '#ffffff', val: 2500 },
    ];

    // Generate clusters of items
    const totalCapsules = 18;
    for (let i = 0; i < totalCapsules; i++) {
      const option = rarities[Math.floor(Math.random() * rarities.length)];
      
      // Pile objects randomly at bottom center with height offset
      const x = (Math.random() - 0.5) * 100;
      const z = (Math.random() - 0.5) * 90 + 10; // Keep slightly back from absolute front chute
      const y = 8 + Math.floor(i / 4) * 12 + Math.random() * 5; // stack heights

      list.push({
        id: `capsule_${i}_${Date.now()}`,
        x,
        y,
        z,
        vx: 0,
        vy: 0,
        vz: 0,
        radius: 12 + Math.random() * 2,
        rarity: option.r,
        color: option.color,
        prizeName: option.text,
        points: option.val,
        rotationX: Math.random() * Math.PI,
        rotationY: Math.random() * Math.PI,
        rotationZ: Math.random() * Math.PI,
        spinX: (Math.random() - 0.5) * 0.1,
        spinY: (Math.random() - 0.5) * 0.1,
        isGrabbed: false,
        scaleY: option.r === 'common' ? 1 : 0.85 + Math.random() * 0.3,
      });
    }
    return list;
  };

  // Initialize capsule pile
  useEffect(() => {
    const list = createCapsulesList();
    setCapsules(list);
    stateRef.current.capsules = list;
  }, []);

  // Keyboard Event Binding
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['arrowup', 'w', 'arrowdown', 's', 'arrowleft', 'a', 'arrowright', 'd', ' '].includes(key)) {
        stateRef.current.keysPressed[key] = true;
        // prevent page scrolling with spaces or arrows inside app iframe
        if (key === ' ' || key.startsWith('arrow')) {
          e.preventDefault();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['arrowup', 'w', 'arrowdown', 's', 'arrowleft', 'a', 'arrowright', 'd', ' '].includes(key)) {
        stateRef.current.keysPressed[key] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Update Game Logic Loop
  useEffect(() => {
    let animationFrameId: number;

    const gameLoop = () => {
      updateSimulation();
      render3D();
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Physics Simulation and State Management
  const updateSimulation = () => {
    const state = stateRef.current;
    const clawState = state.claw;
    const capsulesList = state.capsules;

    // 1. UPDATE CRANE INTERACTIVE INPUTS (ONLY IF IDLE OR ACTIVE PLAYING)
    if (clawState.phase === 'moving') {
      let dx = 0;
      let dz = 0;

      // Check keys
      if (state.keysPressed['w'] || state.keysPressed['arrowup']) dz -= 1.8;
      if (state.keysPressed['s'] || state.keysPressed['arrowdown']) dz += 1.8;
      if (state.keysPressed['a'] || state.keysPressed['arrowleft']) dx -= 1.8;
      if (state.keysPressed['d'] || state.keysPressed['arrowright']) dx += 1.8;

      // Add on-screen drag joystick input if any
      if (state.joystickDir.x !== 0 || state.joystickDir.y !== 0) {
        dx += state.joystickDir.x * 2.2;
        dz += state.joystickDir.y * 2.2;
      }

      const activeMove = dx !== 0 || dz !== 0;
      if (activeMove) {
        // play engine motor humming sound
        AudioEngine.startMotor();
        setIsCraneMoving(true);

        const nextX = Math.max(-75, Math.min(75, clawState.x + dx));
        const nextZ = Math.max(-75, Math.min(75, clawState.z + dz));

        // Add physical gantry acceleration to support swing
        const accelX = nextX - clawState.x;
        const accelZ = nextZ - clawState.z;
        clawState.wobbleVX -= accelX * 0.12; 
        clawState.wobbleVZ -= accelZ * 0.12;

        clawState.x = nextX;
        clawState.z = nextZ;
      } else {
        AudioEngine.stopMotor();
        setIsCraneMoving(false);
      }

      // Check Drop Action Trigger (Space Bar or Button Click)
      if (state.keysPressed[' ']) {
        state.keysPressed[' '] = false; // consume trigger
        startClawDrop();
      }
    } else {
      AudioEngine.stopMotor();
      setIsCraneMoving(false);
    }

    // 2. UPDATE CLAW PENDULUM WOBBLE/SWING (Lag behind spring motion)
    clawState.wobbleX += clawState.wobbleVX;
    clawState.wobbleZ += clawState.wobbleVZ;
    // Spring physics formula to pull wobble back to center (0)
    const springForce = 0.045;
    const dragForce = 0.955;
    clawState.wobbleVX += (-clawState.wobbleX) * springForce;
    clawState.wobbleVZ += (-clawState.wobbleZ) * springForce;
    // Damper
    clawState.wobbleVX *= dragForce;
    clawState.wobbleVZ *= dragForce;

    // 3. FINITE STATE MACHINE (FSM) CLAW ACTIONS
    if (clawState.phase === 'descending') {
      // open fingers fully as we drop
      clawState.fingerOpenAngle = Math.min(1.0, clawState.fingerOpenAngle + 0.08);
      
      const speed = 3.2;
      clawState.y -= speed;

      // Scan closest capsule elevation
      let minElevation = 18;
      for (const cap of capsulesList) {
        const dx = Math.abs(cap.x - clawState.x);
        const dz = Math.abs(cap.z - clawState.z);
        if (dx < 18 && dz < 18) {
          minElevation = Math.max(minElevation, cap.y + cap.radius);
        }
      }

      // Trigger clamp once reaching toy stack height or absolute floor
      if (clawState.y <= minElevation - 4) {
        clawState.phase = 'closing';
        AudioEngine.playClawAction();
      }
    } 
    else if (clawState.phase === 'closing') {
      // close fingers gradually on target
      clawState.fingerOpenAngle = Math.max(0.0, clawState.fingerOpenAngle - 0.05);

      if (clawState.fingerOpenAngle <= 0.05) {
        // Attempt to lock/grab the capsule!
        let bestTarget: Capsule | null = null;
        let bestDist = 28; // Max threshold distance from claw tip to center of capsule

        for (const cap of capsulesList) {
          if (cap.isGrabbed) continue;
          const dx = cap.x - (clawState.x + clawState.wobbleX * 0.5);
          const dy = cap.y - (clawState.y - 12); // distance from mechanical center to claws tips
          const dz = cap.z - (clawState.z + clawState.wobbleZ * 0.5);
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < bestDist) {
            bestDist = dist;
            bestTarget = cap;
          }
        }

        if (bestTarget) {
          clawState.grabbedCapsuleId = bestTarget.id;
          bestTarget.isGrabbed = true;
          setArcadeMessage(`LUCKY! GRABBED AN ITEM: ${bestTarget.prizeName.toUpperCase()}`);
          
          // trigger dynamic feed event
          onFeedEvent({
            id: `feed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            playerName,
            type: 'claw_move',
            detail: `clamped claw onto a ${bestTarget.rarity.toUpperCase()} capsule!`,
          });
        } else {
          setArcadeMessage("MISSED! NO ITEMS CAUGHT");
        }

        clawState.phase = 'ascending';
      }
    } 
    else if (clawState.phase === 'ascending') {
      const speed = 2.8;
      clawState.y = Math.min(170, clawState.y + speed);

      // If holding prize, lift it alongside crane string
      if (clawState.grabbedCapsuleId) {
        const held = capsulesList.find(c => c.id === clawState.grabbedCapsuleId);
        if (held) {
          held.x = clawState.x + clawState.wobbleX * 0.4;
          held.y = clawState.y - 12; // carry near joint of fingers
          held.z = clawState.z + clawState.wobbleZ * 0.4;
          held.vx = 0;
          held.vy = 0;
          held.vz = 0;

          // REALITY ARCADE WOBBLE SLIP:
          // Slips are calculated of rarity tier weight. Less slip on common, high slip on Epics/Legendary
          const slipChance = held.rarity === 'legendary' ? 0.0055 
                             : held.rarity === 'epic' ? 0.003
                             : held.rarity === 'rare' ? 0.0018
                             : held.rarity === 'uncommon' ? 0.0008
                             : 0.0003;
          
          // Increases slip if player is swinging crane actively
          const actualSlipChance = slipChance * (1 + Math.abs(clawState.wobbleX) * 0.4);

          if (Math.random() < actualSlipChance) {
            // Drop mid-climb! Slide down
            held.isGrabbed = false;
            held.vx = clawState.wobbleVX * 1.5;
            held.vz = clawState.wobbleVZ * 1.5;
            held.vy = -1;
            clawState.grabbedCapsuleId = null;
            AudioEngine.playFail();
            setArcadeMessage("OH NO! COLD GRIP! THE TOY SLIPPED OUT!");
            
            onFeedEvent({
              id: `feed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              playerName,
              type: 'catch_fail',
              detail: `had a ${held.rarity.toUpperCase()} capsule slip mid-air! So close!`,
            });
          }
        }
      }

      if (clawState.y >= 170) {
        clawState.phase = 'returning';
      }
    } 
    else if (clawState.phase === 'returning') {
      // Auto return back to the upper chute: X = -65, Z = 60
      const targetHomeX = -65;
      const targetHomeZ = 60;
      const speed = 2.2;

      const dx = targetHomeX - clawState.x;
      const dz = targetHomeZ - clawState.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance > 1) {
        clawState.x += (dx / distance) * speed;
        clawState.z += (dz / distance) * speed;

        // Apply visual swing deceleration
        clawState.wobbleVX += (dx / distance) * 0.04;
        clawState.wobbleVZ += (dz / distance) * 0.04;

        // Propagate toy location with claw motion
        if (clawState.grabbedCapsuleId) {
          const held = capsulesList.find(c => c.id === clawState.grabbedCapsuleId);
          if (held) {
            held.x = clawState.x + clawState.wobbleX * 0.4;
            held.y = clawState.y - 12;
            held.z = clawState.z + clawState.wobbleZ * 0.4;
          }
        }
      } else {
        clawState.x = targetHomeX;
        clawState.z = targetHomeZ;
        clawState.phase = 'dropping';
        clawState.dropTimer = 25; // wait frames
      }
    } 
    else if (clawState.phase === 'dropping') {
      // open claws to release grabbed items
      clawState.fingerOpenAngle = Math.min(1.0, clawState.fingerOpenAngle + 0.1);

      if (clawState.grabbedCapsuleId) {
        const held = capsulesList.find(c => c.id === clawState.grabbedCapsuleId);
        if (held) {
          held.isGrabbed = false;
          held.vx = clawState.wobbleVX * 0.5;
          held.vy = -0.5; // push downward momentum
          held.vz = clawState.wobbleVZ * 0.5;
          clawState.grabbedCapsuleId = null;
          
          setArcadeMessage("CHUTE EJECTION VENT... STAND BY");
        }
      }

      clawState.dropTimer--;
      if (clawState.dropTimer <= 0) {
        clawState.phase = 'resetting';
      }
    } 
    else if (clawState.phase === 'resetting') {
      // Return to middle center idle
      const centerTargetX = 0;
      const centerTargetZ = 0;
      const speed = 2.5;

      const dx = centerTargetX - clawState.x;
      const dz = centerTargetZ - clawState.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance > 1.5) {
        clawState.x += (dx / distance) * speed;
        clawState.z += (dz / distance) * speed;
      } else {
        clawState.x = centerTargetX;
        clawState.z = centerTargetZ;
        clawState.phase = 'idle';
        setArcadeMessage(state.coins > 0 ? "INSERT COIN OR PRESS TO MOVE" : "OUT OF COINS! INSERT COIN TO SPIN!");
        state.hasActivePlay = false;
      }
    }

    // 4. CAPSULES RIGID-BODY PHYSICS & COLLISION SIMULATION
    for (let i = 0; i < capsulesList.length; i++) {
      const capA = capsulesList[i];
      if (capA.isGrabbed) continue;

      // Gravity acceleration
      capA.vy += GRAVITY;

      // Update positions
      capA.x += capA.vx;
      capA.y += capA.vy;
      capA.z += capA.vz;

      // Drag friction decay
      capA.vx *= DRAG;
      capA.vy *= DRAG;
      capA.vz *= DRAG;

      // Apply spinning
      capA.rotationX += capA.spinX;
      capA.rotationY += capA.spinY;

      // Wall boundaries (Excludes Chute cutout)
      // Left (-75) & Right (75) coordinates
      const isOverChute = (capA.x >= CHUTE_MIN_X && capA.x <= CHUTE_MAX_X && capA.z >= CHUTE_MIN_Z && capA.z <= CHUTE_MAX_Z);

      // Bottom Bed Surface Collision
      if (isOverChute) {
        // Falling into chute!
        if (capA.y < -35) {
          // Trigger claim prize!
          claimCapsulePrize(capA);
          
          // Re-generate item at the top stack to keep capsules constant
          capA.x = (Math.random() - 0.5) * 80;
          capA.y = 120 + Math.random() * 20;
          capA.z = (Math.random() - 0.5) * 80;
          capA.vx = 0;
          capA.vy = -1;
          capA.vz = 0;
        }
      } else {
        // standard ground floor
        const floorHeight = capA.radius;
        if (capA.y < floorHeight) {
          capA.y = floorHeight;
          capA.vy = -capA.vy * RESTITUTION;
          capA.vx *= 0.85; // slide friction
          capA.vz *= 0.85;
        }

        // Left / Right Walls
        if (capA.x < -72) {
          capA.x = -72;
          capA.vx = -capA.vx * RESTITUTION;
        }
        if (capA.x > 72) {
          capA.x = 72;
          capA.vx = -capA.vx * RESTITUTION;
        }
      }

      // Back Wall & Front Glass boundary
      if (capA.z < -72) {
        capA.z = -72;
        capA.vz = -capA.vz * RESTITUTION;
      }
      if (capA.z > 72) {
        capA.z = 72;
        capA.vz = -capA.vz * RESTITUTION;
      }

      // 5. TOY-TO-TOY COLLISIONS (Spherical 3D impulse)
      for (let j = i + 1; j < capsulesList.length; j++) {
        const capB = capsulesList[j];
        if (capB.isGrabbed) continue;

        const dx = capB.x - capA.x;
        const dy = capB.y - capA.y;
        const dz = capB.z - capA.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const minDist = capA.radius + capB.radius;

        if (dist < minDist && dist > 0.1) {
          // Solid intersect! Separate them
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          // Push apart ratio based on height or equal force
          capA.x -= nx * overlap * 0.55;
          capA.y -= ny * overlap * 0.55;
          capA.z -= nz * overlap * 0.55;

          capB.x += nx * overlap * 0.55;
          capB.y += ny * overlap * 0.55;
          capB.z += nz * overlap * 0.55;

          // Velocity response along collision normal
          const kx = capA.vx - capB.vx;
          const ky = capA.vy - capB.vy;
          const kz = capA.vz - capB.vz;
          const relativeSpeed = kx * nx + ky * ny + kz * nz;

          if (relativeSpeed > 0) {
            const impulse = (2 * relativeSpeed) / 2;
            const impulseCoeff = impulse * 0.7; // spring loss

            capA.vx -= nx * impulseCoeff;
            capA.vy -= ny * impulseCoeff;
            capA.vz -= nz * impulseCoeff;

            capB.vx += nx * impulseCoeff;
            capB.vy += ny * impulseCoeff;
            capB.vz += nz * impulseCoeff;
          }
        }
      }
    }

    // 6. CHUTE PARTICLES EXPANSION LIFE
    state.chutePrizeAnims = state.chutePrizeAnims.filter(p => {
      p.x += (Math.random() - 0.5) * 5;
      p.y += p.velocityY;
      p.velocityY -= 0.12; // gravity on sparkles
      p.life -= 0.02;
      return p.life > 0;
    });

    // Write-back ref references to functional states safely
    setClaw({ ...clawState });
    setCapsules([...capsulesList]);
  };

  // Action: User Inserts Coin
  const insertCoin = () => {
    if (stateRef.current.claw.phase !== 'idle') return; // busy
    if (useCoin()) {
      AudioEngine.playCoin();
      stateRef.current.claw.phase = 'moving';
      setArcadeMessage("USE WASD / ARROWS / JOYSTICK TO MOVE. SPACE TO DROP CLAW");
      stateRef.current.hasActivePlay = true;

      onFeedEvent({
        id: `feed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        playerName,
        type: 'coin_insert',
        detail: 'inserted an arcade coin and grabbed the joystick!',
      });
    }
  };

  // Trigger manual Drop
  const triggerGrabButton = () => {
    if (stateRef.current.claw.phase === 'moving') {
      startClawDrop();
    }
  };

  const startClawDrop = () => {
    stateRef.current.claw.phase = 'descending';
    setArcadeMessage("SWEEPING HOOK INCOMING... PLEASE SIT BACK");
  };

  // Claim Caught Capsule Prize
  const claimCapsulePrize = (capsule: Capsule) => {
    AudioEngine.playSuccess();
    onScorePoints(capsule.points, capsule.prizeName, capsule.rarity);
    
    // Add sparkles to UI eject bin
    const binAnimList = stateRef.current.chutePrizeAnims;
    for (let i = 0; i < 20; i++) {
      binAnimList.push({
        x: (Math.random() - 0.5) * 40,
        y: (Math.random() - 0.5) * 30,
        r: 3 + Math.random() * 5,
        color: capsule.color,
        life: 1.0,
        velocityY: 3 + Math.random() * 5,
      });
    }

    setCoinsEjected(prev => prev + 1);
    setUnlockedPrize({
      name: capsule.prizeName,
      rarity: capsule.rarity,
      points: capsule.points,
    });

    onFeedEvent({
      id: `claimed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      playerName,
      type: 'catch_success',
      detail: `scored +${capsule.points} pts for pulling out a beautiful ${capsule.prizeName} (${capsule.rarity.toUpperCase()})!`,
      rarity: capsule.rarity,
    });
  };

  // Vector 3D to 2D Raster Projector
  const projectPoint = (x: number, y: number, z: number, w: number, h: number) => {
    const fov = 340;
    // Camera is positioned back and above, tilting downwards
    const camX = 0;
    const camY = 110;
    const camZ = 230;
    
    const pitchRad = 12 * Math.PI / 180; // slight tilt down
    
    const dx = x - camX;
    const dy = y - camY;
    const dz = z - camZ;
    
    // Rotate 3D coordinates on pitch
    const ry = dy * Math.cos(pitchRad) - dz * Math.sin(pitchRad);
    const rz = dy * Math.sin(pitchRad) + dz * Math.cos(pitchRad);
    
    const depth = rz === 0 ? 0.1 : -rz;
    const scale = fov / depth;
    
    return {
      x: w / 2 + dx * scale,
      y: h / 2 - ry * scale, // invert
      scale: scale,
      depth: rz,
    };
  };

  // Render 3D Scene onto 2D HTML Canvas
  const render3D = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Reset backdrop
    ctx.fillStyle = '#0a0a0f'; // rich black background
    ctx.fillRect(0, 0, w, h);

    // Draw ambient neon background grid lines
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = 1;
    for (let i = -100; i <= 100; i += 25) {
      // Draw grid planes along bottom XZ floor
      const p1 = projectPoint(i, 0, -100, w, h);
      const p2 = projectPoint(i, 0, 100, w, h);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      const p3 = projectPoint(-100, 0, i, w, h);
      const p4 = projectPoint(100, 0, i, w, h);
      ctx.beginPath();
      ctx.moveTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.stroke();
    }

    // PROJECT CABINET CORNER PLANES
    const corners = {
      bFL: projectPoint(-80, 0, 80, w, h), // bottom front left
      bFR: projectPoint(80, 0, 80, w, h),  // bottom front right
      bBL: projectPoint(-80, 0, -80, w, h), // bottom back left
      bBR: projectPoint(80, 0, -80, w, h),  // bottom back right
      tFL: projectPoint(-80, CABINET_HEIGHT, 80, w, h),
      tFR: projectPoint(80, CABINET_HEIGHT, 80, w, h),
      tBL: projectPoint(-80, CABINET_HEIGHT, -80, w, h),
      tBR: projectPoint(80, CABINET_HEIGHT, -80, w, h),
    };

    // Draw Chute Pit Outline
    const chuteFL = projectPoint(CHUTE_MIN_X, 0, CHUTE_MAX_Z, w, h);
    const chuteFR = projectPoint(CHUTE_MAX_X, 0, CHUTE_MAX_Z, w, h);
    const chuteBL = projectPoint(CHUTE_MIN_X, 0, CHUTE_MIN_Z, w, h);
    const chuteBR = projectPoint(CHUTE_MAX_X, 0, CHUTE_MIN_Z, w, h);

    // Deep pit fill
    ctx.fillStyle = '#050508';
    ctx.beginPath();
    ctx.moveTo(chuteFL.x, chuteFL.y);
    ctx.lineTo(chuteFR.x, chuteFR.y);
    ctx.lineTo(chuteBR.x, chuteBR.y);
    ctx.lineTo(chuteBL.x, chuteBL.y);
    ctx.closePath();
    ctx.fill();

    // Red neon chute boundary glow
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#f87171';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(chuteFL.x, chuteFL.y);
    ctx.lineTo(chuteFR.x, chuteFR.y);
    ctx.lineTo(chuteBR.x, chuteBR.y);
    ctx.lineTo(chuteBL.x, chuteBL.y);
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0; // reset

    // Back mirror wall paint
    ctx.fillStyle = '#0f111a';
    ctx.beginPath();
    ctx.moveTo(corners.bBL.x, corners.bBL.y);
    ctx.lineTo(corners.bBR.x, corners.bBR.y);
    ctx.lineTo(corners.tBR.x, corners.tBR.y);
    ctx.lineTo(corners.tBL.x, corners.tBL.y);
    ctx.closePath();
    ctx.fill();

    // Draw grid lines on mirror back layer for deep arcade immersion
    ctx.strokeStyle = '#232136';
    ctx.lineWidth = 1;
    for (let y = 0; y <= CABINET_HEIGHT; y += 30) {
      const pL = projectPoint(-80, y, -80, w, h);
      const pR = projectPoint(80, y, -80, w, h);
      ctx.beginPath();
      ctx.moveTo(pL.x, pL.y);
      ctx.lineTo(pR.x, pR.y);
      ctx.stroke();
    }

    // DRAW TOY CAPSULES (Depth sorted!)
    const state = stateRef.current;
    
    // Assemble all elements rendering in center (capsules + claw string)
    // Create an object array to render depth-wise back-to-front
    const renderQueue: Array<{
      type: 'capsule' | 'claw_finger' | 'crane_gantry' | 'gantry_rail';
      depth: number;
      refData: any;
    }> = [];

    state.capsules.forEach(cap => {
      const proj = projectPoint(cap.x, cap.y, cap.z, w, h);
      renderQueue.push({
        type: 'capsule',
        depth: proj.depth,
        refData: { cap, proj },
      });
    });

    // Sort queue from largest depth value (furthest away) to smallest depth value (closest)
    renderQueue.sort((a, b) => b.depth - a.depth);

    // Draw elements depth-wise
    renderQueue.forEach(item => {
      if (item.type === 'capsule') {
        const { cap, proj } = item.refData;
        const radius = cap.radius * proj.scale;
        
        ctx.save();
        ctx.translate(proj.x, proj.y);

        // Apply slight rotation for natural physical placement
        const rotationVal = (cap.rotationX + cap.rotationY + cap.rotationZ) || 0;
        ctx.rotate(rotationVal);

        // Radial gradient for fluffy fur look
        const bodyGrad = ctx.createRadialGradient(
          -radius * 0.25, -radius * 0.25, radius * 0.1,
          0, 0, radius
        );
        bodyGrad.addColorStop(0, '#ffffff'); // highlight glow
        bodyGrad.addColorStop(0.2, cap.color);
        bodyGrad.addColorStop(0.75, darkenColor(cap.color, 0.38));
        bodyGrad.addColorStop(1, '#0c0a09'); // shadow contour

        const darkFurColor = darkenColor(cap.color, 0.45);
        const lightInnerEar = cap.rarity === 'legendary' ? '#f472b6' : '#fbcfe8';

        // 1. TWO PLUSH ROUND EARS (Rendered behind the head)
        // Left Ear
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(-radius * 0.58, -radius * 0.58, radius * 0.38, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = darkFurColor;
        ctx.lineWidth = radius * 0.08;
        ctx.stroke();

        // Left Inner Ear
        ctx.fillStyle = lightInnerEar;
        ctx.beginPath();
        ctx.arc(-radius * 0.58, -radius * 0.58, radius * 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Right Ear
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(radius * 0.58, -radius * 0.58, radius * 0.38, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Right Inner Ear
        ctx.fillStyle = lightInnerEar;
        ctx.beginPath();
        ctx.arc(radius * 0.58, -radius * 0.58, radius * 0.2, 0, Math.PI * 2);
        ctx.fill();

        // 2. MAIN FLUFFY HEAD ROUND SHAPE
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.82, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 3. TWO FLOATING SOFT PLUSH PAWS AT SIDES
        // Left Paw
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(-radius * 0.5, radius * 0.45, radius * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Right Paw
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(radius * 0.5, radius * 0.45, radius * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 4. HEARTWARMING MUZZLE
        ctx.fillStyle = '#ffedd5'; // cream peach oval muzzle
        ctx.beginPath();
        ctx.ellipse(0, radius * 0.12, radius * 0.32, radius * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c2410c'; // warm tan rim
        ctx.lineWidth = radius * 0.04;
        ctx.stroke();

        // 5. CUTE RETRO EMBROIDERED EYES
        ctx.fillStyle = '#0f172a'; // slate eyes
        ctx.beginPath();
        ctx.arc(-radius * 0.26, -radius * 0.12, radius * 0.08, 0, Math.PI * 2);
        ctx.arc(radius * 0.26, -radius * 0.12, radius * 0.08, 0, Math.PI * 2);
        ctx.fill();

        // Dynamic shiny catches
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-radius * 0.28, -radius * 0.14, radius * 0.03, 0, Math.PI * 2);
        ctx.arc(radius * 0.24, -radius * 0.14, radius * 0.03, 0, Math.PI * 2);
        ctx.fill();

        // 6. TINY NOSE & SMILE MOUTH LINE
        ctx.fillStyle = '#1c1917'; // stone-colored nose
        ctx.beginPath();
        ctx.ellipse(0, radius * 0.02, radius * 0.1, radius * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();

        // Embroidered mouth line
        ctx.strokeStyle = '#1c1917';
        ctx.lineWidth = radius * 0.04;
        ctx.beginPath();
        ctx.arc(-radius * 0.06, radius * 0.08, radius * 0.06, Math.PI, Math.PI * 0.2, true);
        ctx.arc(radius * 0.06, radius * 0.08, radius * 0.06, 0, Math.PI * 0.8, false);
        ctx.stroke();

        // 7. EMBLEMATIC ROSY BLUSH CHEEKS
        ctx.fillStyle = 'rgba(244, 63, 94, 0.38)';
        ctx.beginPath();
        ctx.arc(-radius * 0.44, 0, radius * 0.09, 0, Math.PI * 2);
        ctx.arc(radius * 0.44, 0, radius * 0.09, 0, Math.PI * 2);
        ctx.fill();

        // 8. GLAMOROUS BOW TIE FOR EPIC & LEGENDARY TEDDIES
        if (cap.rarity === 'legendary' || cap.rarity === 'epic') {
          ctx.fillStyle = cap.rarity === 'legendary' ? '#fbbf24' : '#e11d48'; // Gold vs Red bow
          ctx.beginPath();
          // left ribbon wing
          ctx.moveTo(0, radius * 0.52);
          ctx.lineTo(-radius * 0.3, radius * 0.38);
          ctx.lineTo(-radius * 0.3, radius * 0.66);
          ctx.closePath();
          // right ribbon wing
          ctx.moveTo(0, radius * 0.52);
          ctx.lineTo(radius * 0.3, radius * 0.38);
          ctx.lineTo(radius * 0.3, radius * 0.66);
          ctx.closePath();
          ctx.fill();

          // knot bead
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, radius * 0.52, radius * 0.08, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    });

    // DRAW THE ACTIVE CRANE & CLAW MECHANISM
    const clawX = state.claw.x;
    const clawY = state.claw.y;
    const clawZ = state.claw.z;
    const wobbleX = state.claw.wobbleX;
    const wobbleZ = state.claw.wobbleZ;

    // Projected coordinates of claw joints
    const crGantry = projectPoint(clawX, CABINET_HEIGHT, clawZ, w, h); // Gantry on top rail
    const crJoint = projectPoint(clawX + wobbleX * 0.6, clawY, clawZ + wobbleZ * 0.6, w, h); // Mechanical metal base

    // 1. Draw solid steel hanging cable
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(crGantry.x, crGantry.y);
    ctx.lineTo(crJoint.x, crJoint.y);
    ctx.stroke();

    // Grid details on crane cables
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const dotsCount = Math.floor((crJoint.y - crGantry.y) / 10);
    for (let k = 0; k < dotsCount; k++) {
      const ratio = k / dotsCount;
      const hx = crGantry.x + (crJoint.x - crGantry.x) * ratio;
      const hy = crGantry.y + (crJoint.y - crGantry.y) * ratio;
      ctx.arc(hx, hy, 1.5, 0, Math.PI * 2);
    }
    ctx.stroke();

    // 2. Draw mechanical claw base engine joint block
    const jointRadius = 8 * crJoint.scale;
    ctx.save();
    ctx.translate(crJoint.x, crJoint.y);

    const goldGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, jointRadius);
    goldGrad.addColorStop(0, '#fef08a');
    goldGrad.addColorStop(0.4, '#eab308');
    goldGrad.addColorStop(1, '#854d0e');

    ctx.fillStyle = goldGrad;
    ctx.beginPath();
    ctx.arc(0, 0, jointRadius, 0, Math.PI * 2);
    ctx.fill();

    // Glowing cyan center gem on claw
    ctx.fillStyle = state.claw.grabbedCapsuleId ? '#10b981' : '#22d3ee';
    ctx.shadowColor = state.claw.grabbedCapsuleId ? '#34d399' : '#06b6d4';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, jointRadius * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // reset
    ctx.restore();

    // 3. DRAW 3 PRONG MECHANICAL CLAW FINGERS (Left, Right, Back directions)
    const fingerAngle = state.claw.fingerOpenAngle; // 0 to 1
    const prongsCount = 3;

    for (let p = 0; p < prongsCount; p++) {
      const angleOffset = (p * Math.PI * 2) / prongsCount + (stateRef.current.claw.y * 0.005); // slight rotation on swing
      
      // Calculate finger tips pivot offsets in 3D:
      // When closed, they curve inward underneath the center.
      // Offset formula creates a beautifully articulated mechanical scoop effect
      const pivotRadius = 8;
      const fingerLength = 16;
      
      const angleClaw = (fingerAngle * 35 + 10) * Math.PI / 180; // open degrees

      // Joint 1: Pivot root
      const rootX = clawX + wobbleX * 0.6 + Math.cos(angleOffset) * pivotRadius;
      const rootY = clawY - 4;
      const rootZ = clawZ + wobbleZ * 0.6 + Math.sin(angleOffset) * pivotRadius;

      // Joint 2: Elbow pivot bent outwards
      const elbowX = rootX + Math.cos(angleOffset) * Math.sin(angleClaw) * fingerLength;
      const elbowY = rootY - Math.cos(angleClaw) * fingerLength;
      const elbowZ = rootZ + Math.sin(angleOffset) * Math.sin(angleClaw) * fingerLength;

      // Joint 3: Scooping hook tip claw curved inward
      const closedAngleOffset = (1.0 - fingerAngle) * 38 * Math.PI / 180;
      const tipX = elbowX - Math.cos(angleOffset) * Math.sin(closedAngleOffset) * (fingerLength * 0.7);
      const tipY = elbowY - Math.cos(closedAngleOffset) * (fingerLength * 0.7);
      const tipZ = elbowZ - Math.sin(angleOffset) * Math.sin(closedAngleOffset) * (fingerLength * 0.7);

      const pRoot = projectPoint(rootX, rootY, rootZ, w, h);
      const pElbow = projectPoint(elbowX, elbowY, elbowZ, w, h);
      const pTip = projectPoint(tipX, tipY, tipZ, w, h);

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 3.5 * pRoot.scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(pRoot.x, pRoot.y);
      ctx.lineTo(pElbow.x, pElbow.y);
      ctx.lineTo(pTip.x, pTip.y);
      ctx.stroke();

      // Sharp gold finger tips
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.5 * pRoot.scale;
      ctx.beginPath();
      ctx.moveTo(pElbow.x, pElbow.y);
      ctx.lineTo(pTip.x, pTip.y);
      ctx.stroke();
    }

    // DRAW THE SLIDING GANTRY ON TOP RAILS (Y = CABINET_HEIGHT)
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 4;
    const gantryW = 12 * crGantry.scale;
    ctx.fillRect(crGantry.x - gantryW / 2, crGantry.y - gantryW / 3, gantryW, gantryW / 1.5);
    ctx.strokeRect(crGantry.x - gantryW / 2, crGantry.y - gantryW / 3, gantryW, gantryW / 1.5);

    // Glowing gantry indicator
    ctx.fillStyle = isCraneMoving ? '#a855f7' : '#475569';
    ctx.beginPath();
    ctx.arc(crGantry.x, crGantry.y, 3, 0, Math.PI * 2);
    ctx.fill();

    // 4. DRAW COOPERATIVE FRONT CABINET FRAMING GLASS SHEETS (Adds heavy high fidelity layout)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.beginPath();
    
    // Bottom border box panel
    ctx.moveTo(corners.bFL.x, corners.bFL.y);
    ctx.lineTo(corners.bFR.x, corners.bFR.y);
    ctx.lineTo(corners.tFR.x, corners.tFR.y);
    ctx.lineTo(corners.tFL.x, corners.tFL.y);
    ctx.closePath();
    ctx.stroke();

    // Top Neon Marquee Frame Panel
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.moveTo(corners.tFL.x, corners.tFL.y);
    ctx.lineTo(corners.tFR.x, corners.tFR.y);
    ctx.lineTo(corners.tFR.x, corners.tFR.y - 30);
    ctx.lineTo(corners.tFL.x, corners.tFL.y - 30);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#d946ef';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#f472b6';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Neon Text label inside marquee
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#d946ef';
    ctx.shadowBlur = 8;
    ctx.fillText("🕹️  N E O N   C L A W   3 D  🕹️", (corners.tFL.x + corners.tFR.x) / 2, corners.tFL.y - 10);
    ctx.shadowBlur = 0;

    // Vertical structural corner supports
    ctx.strokeStyle = '#2e303e';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(corners.bFL.x, corners.bFL.y);
    ctx.lineTo(corners.tFL.x, corners.tFL.y);
    ctx.moveTo(corners.bFR.x, corners.bFR.y);
    ctx.lineTo(corners.tFR.x, corners.tFR.y);
    ctx.stroke();

    // Ejected Prize Chute Bin Panel (Bottom Forward Left Glass cutout)
    // Draw eject hatch outline
    const ejectHatchL = projectPoint(-75, 0, 78, w, h);
    const ejectHatchR = projectPoint(-35, 0, 78, w, h);
    
    ctx.fillStyle = '#18181b';
    ctx.fillRect(ejectHatchL.x, ejectHatchL.y - 12, ejectHatchR.x - ejectHatchL.x, 32);
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.strokeRect(ejectHatchL.x, ejectHatchL.y - 12, ejectHatchR.x - ejectHatchL.x, 32);

    // Render Sparkle Explosions inside eject chute
    state.chutePrizeAnims.forEach(part => {
      ctx.fillStyle = part.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;
      
      ctx.save();
      ctx.globalAlpha = part.life;
      ctx.translate(ejectHatchL.x + (ejectHatchR.x - ejectHatchL.x) / 2 + part.x, ejectHatchL.y + part.y);
      ctx.beginPath();
      ctx.arc(0, 0, part.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    if (state.chutePrizeAnims.length > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px "Courier New"';
      ctx.fillText("PRIZE EJECTED!", ejectHatchL.x + (ejectHatchR.x - ejectHatchL.x) / 2, ejectHatchL.y - 16);
    }
  };

  // Helper utility to darken neon hex colors for spherical back shading
  const darkenColor = (hex: string, percent: number) => {
    if (hex === '#ffffff') return '#cbd5e1';
    let num = parseInt(hex.replace("#", ""), 16),
      amt = Math.round(2.55 * (percent * 100)),
      R = (num >> 16) - amt,
      G = (num >> 8 & 0x00FF) - amt,
      B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R < 0 ? 0 : R > 255 ? 255 : R) * 0x10000 + (G < 0 ? 0 : G > 255 ? 255 : G) * 0x100 + (B < 0 ? 0 : B > 255 ? 255 : B)).toString(16).slice(1);
  };

  // Joystick controller event listener
  const handleJoystickMove = (dx: number, dy: number) => {
    stateRef.current.joystickDir = { x: dx, y: dy };
    setJoystickDir({ x: dx, y: dy });
  };

  const handleJoystickEnd = () => {
    stateRef.current.joystickDir = { x: 0, y: 0 };
    setJoystickDir({ x: 0, y: 0 });
  };

  // Handle Dragging Joystick
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const handlePointerDown = () => {
    if (stateRef.current.claw.phase === 'moving') {
      setIsDragging(true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Normalize up to radius 35px
    const maxDistance = 35;
    const ratio = Math.min(1.0, distance / maxDistance);
    const angle = Math.atan2(dy, dx);
    
    const inputX = Math.cos(angle) * ratio;
    const inputY = Math.sin(angle) * ratio;

    handleJoystickMove(inputX, inputY);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    handleJoystickEnd();
  };

  return (
    <div className="w-full flex flex-col items-center select-none" id="arcade-module">
      {/* 3D GRAPHICS PANEL VIEWPORTS */}
      <div className="relative w-full aspect-square md:aspect-[4/5] bg-slate-950 rounded-2xl border-4 border-slate-850 shadow-2xl overflow-hidden group">
        
        {/* Canvas for 60FPS physics */}
        <canvas
          id="claw-3d-viewport"
          ref={canvasRef}
          width={450}
          height={550}
          className="w-full h-full object-cover rounded-xl"
        />

        {/* Live Status Display ticker overhead the glass */}
        <div className="absolute top-12 left-4 right-4 p-2.5 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/80 flex items-center justify-between text-xs z-10 transition-all">
          <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full ${claw.phase !== 'idle' ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="font-mono text-cyan-400 tracking-wider">
              {claw.phase === 'idle' ? 'SYS_READY' : `CRANE_${claw.phase.toUpperCase()}`}
            </span>
          </div>
          <div className="font-mono text-[10px] text-slate-400">
            MACH_V2 // FPS 60
          </div>
        </div>

        {/* Dynamic marquee scrolling notices */}
        <div className="absolute bottom-[3%] left-4 right-4 p-3 bg-slate-950/95 border border-purple-500/50 rounded-xl flex flex-col items-center justify-center font-mono text-center shadow-lg pointer-events-none">
          <div className="text-[9px] text-purple-400 font-extrabold uppercase tracking-widest mb-1">ARCADE MARQUEE</div>
          <div className="text-[11px] text-white opacity-95 tracking-wide uppercase transition-all duration-300">
            {arcadeMessage}
          </div>
        </div>

        {/* UNLOCKED PRIZE MODAL NOTIFICATION */}
        {unlockedPrize && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 z-20 text-center animate-fade-in animate-duration-300">
            <div className="w-20 h-20 rounded-full bg-slate-900 border-4 border-cyan-400/80 flex items-center justify-center text-4xl shadow-glow shadow-cyan-400 mb-4 animate-bounce">
              🎁
            </div>
            <h2 className="text-xl font-bold font-sans tracking-tight text-white mb-1">
              YOU CAUGHT COLD REWARDS!
            </h2>
            <p className="text-xs text-slate-400 uppercase tracking-widest font-mono mb-4">
              [ {unlockedPrize.rarity} tier item ]
            </p>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl mb-4 w-full max-w-[280px]">
              <div className="text-lg font-extrabold text-cyan-400 mb-0.5">{unlockedPrize.name}</div>
              <div className="text-sm font-mono text-amber-400 font-bold">+{unlockedPrize.points} POINTS!</div>
            </div>
            <button
              id="claim-btn"
              onClick={() => setUnlockedPrize(null)}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-sans text-xs font-semibold rounded-xl tracking-wider active:scale-95 transition-all shadow-md shadow-cyan-500/30"
            >
              CLAIM AND CONTINUE
            </button>
          </div>
        )}
      </div>

      {/* PHYSICAL SYSTEM CONSOLE INTERFACES */}
      <div className="w-full mt-4 bg-slate-900 rounded-2xl border-2 border-slate-800 p-5 shadow-2xl flex flex-col md:flex-row items-center gap-6">
        
        {/* Joystick on Left side */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-bold">
            🕹️ ANALOG STEERING
          </div>

          <div
            id="arcade-joystick-gantry"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className={`w-28 h-28 rounded-full bg-slate-950 border-4 border-slate-800 relative select-none cursor-grab flex items-center justify-center shadow-inner transition-all ${claw.phase === 'moving' ? 'ring-2 ring-cyan-500/50' : 'opacity-50 cursor-not-allowed'}`}
          >
            {/* Center handle knob */}
            <div
              className={`w-14 h-14 rounded-full bg-red-600 shadow-lg absolute flex items-center justify-center border-2 border-red-400/50 transform transition-all pointer-events-none active:scale-95`}
              style={{
                transform: `translate(${joystickDir.x * 25}px, ${joystickDir.y * 25}px)`,
                boxShadow: `0 ${6 - joystickDir.y * 5}px 14px rgba(0,0,0,0.6)`
              }}
            >
              <div className="w-4 h-4 rounded-full bg-red-400 opacity-60 absolute top-2 left-2" />
            </div>
          </div>
          
          <div className="text-[9px] font-mono text-slate-500 hidden md:block">
            DRAG KNOB OR USE WASD/ARROWS
          </div>
        </div>

        {/* Trigger Controls & Coins slots on Right */}
        <div className="flex-1 flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
          
          {/* Action Button: INSERT COIN */}
          <div className="flex flex-col items-center gap-2 w-full sm:w-auto">
            <span className="text-[9px] font-mono text-slate-400 font-bold tracking-widest uppercase">COIN RECEPTOR</span>
            <button
              id="insert-coin-slot"
              onClick={insertCoin}
              disabled={claw.phase !== 'idle' || coins <= 0}
              className={`w-full sm:w-36 py-4 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                claw.phase === 'idle' && coins > 0
                  ? 'bg-amber-500/10 border-amber-500 text-amber-500 hover:bg-amber-500/20 shadow-lg shadow-amber-500/10 cursor-pointer'
                  : 'bg-slate-950/60 border-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <div className="text-xl">🟡</div>
              <div className="font-mono text-xs font-bold uppercase tracking-wider">INSERT COIN</div>
              <div className="text-[10px] font-mono text-slate-400 font-medium">({coins} AVAILABLE)</div>
            </button>
          </div>

          {/* Action Button: DROP CLAW */}
          <div className="flex flex-col items-center gap-2 w-full sm:w-auto">
            <span className="text-[9px] font-mono text-slate-400 font-bold tracking-widest uppercase">ACTUATOR BUTTON</span>
            <button
              id="drop-claw-btn"
              onClick={triggerGrabButton}
              disabled={claw.phase !== 'moving'}
              className={`w-full sm:w-36 py-4 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                claw.phase === 'moving'
                  ? 'bg-red-500 border-red-400 text-white hover:bg-red-400 hover:border-red-300 shadow-lg shadow-red-500/20 cursor-pointer animate-pulse-subtle'
                  : 'bg-slate-950/60 border-slate-850 text-slate-500 cursor-not-allowed'
              }`}
            >
              <div className="text-xl">🔴</div>
              <div className="font-mono text-xs font-bold uppercase tracking-widest">PROPEL CLAW</div>
              <div className="text-[10px] font-mono text-slate-400">[PRESS SPACE]</div>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
