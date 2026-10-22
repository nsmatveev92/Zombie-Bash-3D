import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  BIOMES,
  buildLeveledPerkOption,
  CharacterAppearance,
  computeMetaBonuses,
  DEFAULT_META_PROGRESSION,
  EnemyVariant,
  EquippedWeapon,
  GameHudState,
  GamePhase,
  getChainLightningCadence,
  MetaProgressionState,
  PERK_POOL,
  PerkOption,
  RARITY_CONFIG,
  SavedRunState,
  WEAPON_TEMPLATES,
  WeaponRarity,
  WeaponTypeId,
} from '../types/game';
import {
  createArenaBorderGroup,
  createDestructibleMesh,
  createHeroRig,
  createWeaponMesh,
  createZombieRig,
  DestructibleKind,
  HeroRigRefs,
  ZombieRigRefs,
} from './proceduralModels';
import { soundEngine } from '../audio/soundEngine';

export interface MetaGameplayEvent {
  coinsAdded?: number;
  killsAdded?: number;
  propsSmashedAdded?: number;
  berserkKillsAdded?: number;
  bossesKilledAdded?: number;
  grandBossesKilledAdded?: number;
  stageCleared?: number;
  levelReached?: number;
}

interface GameCanvasProps {
  appearance: CharacterAppearance;
  metaProgression?: MetaProgressionState;
  phase: GamePhase;
  autoAttack: boolean;
  autoPickup: boolean;
  onHudUpdate: (state: GameHudState) => void;
  onSaveRun?: (saved: SavedRunState | null) => void;
  onMetaEvent?: (event: MetaGameplayEvent) => void;
  registerActions: (actions: {
    startNewGame: (startStage?: number) => void;
    resumeSavedGame: (saved: SavedRunState) => void;
    selectPerk: (perkId: string) => void;
    togglePause: () => void;
    manualAttack: () => void;
    pickupNearby: () => void;
    setTouchMove: (dx: number, dz: number) => void;
  }) => void;
}

const _camTargetPos = new THREE.Vector3();
const _camLookAt = new THREE.Vector3();
const _colorTmp = new THREE.Color();
const _bladeWorldPos = new THREE.Vector3();

const CHUNK_SIZE = 44;
const ARENA_HALF_SIZE = 34; // Bounded 68x68 square arena per level
const BOSS_INTERVAL = 60;

const WEAPON_IDS: WeaponTypeId[] = [
  'frying_pan',
  'baseball_bat',
  'road_sign',
  'electric_guitar',
  'sledgehammer',
  'shopping_cart',
  'chainsaw',
  'traffic_cone',
];

const RARITY_RANK: Record<WeaponRarity, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

const BOSS_ARCHETYPES = [
  {
    name: 'Мясник Громила',
    subtitle: 'Уклоняйтесь от красных зон и снарядов',
  },
  {
    name: 'Асфальтовый Титан',
    subtitle: 'Уходите с линии тарана и крестовых лучей',
  },
  {
    name: 'Кислотный Джаггернаут',
    subtitle: 'Остерегайтесь метеоритных колец и залпов',
  },
];

interface GroundWeaponEntity {
  id: string;
  weapon: EquippedWeapon;
  mesh: THREE.Group;
  ringMesh: THREE.Mesh;
  x: number;
  z: number;
  bobPhase: number;
}

interface DestructibleEntity {
  id: string;
  chunkKey: string;
  kind: DestructibleKind;
  mesh: THREE.Group;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  radius: number;
  hitFlashTimer: number;
}

interface ZombieEntity {
  id: string;
  variant: EnemyVariant;
  bossIndex: number;
  bossPhase: 1 | 2 | 3;
  isGrandBoss?: boolean;
  rig: ZombieRigRefs;
  x: number;
  z: number;
  vx: number;
  vz: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  radius: number;
  walkPhase: number;
  hitFlashTimer: number;
  slowTimer: number;
  attackCooldown: number;
  specialAbilityTimer: number;
  telegraphTimer: number;
  telegraphMax: number;
  telegraphPattern: 'slam' | 'charge' | 'cross_beams' | 'meteor_rain';
  telegraphDirX: number;
  telegraphDirZ: number;
  meteorTargets: { x: number; z: number }[];
}

interface EnemyProjectile {
  mesh: THREE.Mesh;
  x: number;
  z: number;
  vx: number;
  vz: number;
  damage: number;
  life: number;
  active: boolean;
}

interface XpGemEntity {
  mesh: THREE.Mesh;
  x: number;
  z: number;
  value: number;
  active: boolean;
}

interface ParticleEntity {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  active: boolean;
}

interface NovaWaveEffect {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
  maxScale: number;
  active: boolean;
}

interface ChunkData {
  key: string;
  cx: number;
  cz: number;
  group: THREE.Group;
  groundMat: THREE.MeshStandardMaterial;
  roadMat: THREE.MeshStandardMaterial;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  appearance,
  metaProgression = DEFAULT_META_PROGRESSION,
  phase,
  autoAttack,
  autoPickup,
  onHudUpdate,
  onSaveRun,
  onMetaEvent,
  registerActions,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<GamePhase>(phase);
  const autoAttackRef = useRef<boolean>(autoAttack);
  const autoPickupRef = useRef<boolean>(autoPickup);
  const appearanceRef = useRef<CharacterAppearance>(appearance);
  const metaProgressionRef = useRef<MetaProgressionState>(metaProgression);
  const onHudUpdateRef = useRef(onHudUpdate);
  const onSaveRunRef = useRef(onSaveRun);
  const onMetaEventRef = useRef(onMetaEvent);

  phaseRef.current = phase;
  autoAttackRef.current = autoAttack;
  autoPickupRef.current = autoPickup;
  metaProgressionRef.current = metaProgression;
  onHudUpdateRef.current = onHudUpdate;
  onSaveRunRef.current = onSaveRun;
  onMetaEventRef.current = onMetaEvent;

  const rebuildHeroFnRef = useRef<((app: CharacterAppearance) => void) | null>(
    null
  );

  useEffect(() => {
    appearanceRef.current = appearance;
    if (rebuildHeroFnRef.current) {
      rebuildHeroFnRef.current(appearance);
    }
  }, [appearance]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const initialBiome = BIOMES[0];
    scene.background = new THREE.Color(initialBiome.fogColor);
    scene.fog = new THREE.FogExp2(initialBiome.fogColor, 0.012);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      44,
      container.clientWidth / container.clientHeight,
      0.5,
      150
    );
    camera.position.set(0, 18, 20);
    camera.lookAt(0, 1, 0);

    // Colorful Studio & Outdoor Lighting
    const hemiLight = new THREE.HemisphereLight(
      initialBiome.skyLightColor,
      initialBiome.groundLightColor,
      1.05
    );
    hemiLight.position.set(0, 40, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(
      initialBiome.sunLightColor,
      initialBiome.sunIntensity
    );
    sunLight.position.set(18, 32, 16);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    const shadowD = 28;
    sunLight.shadow.camera.left = -shadowD;
    sunLight.shadow.camera.right = shadowD;
    sunLight.shadow.camera.top = shadowD;
    sunLight.shadow.camera.bottom = -shadowD;
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 80;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);
    scene.add(sunLight.target);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.75);
    rimLight.position.set(-16, 14, -18);
    scene.add(rimLight);

    // Detailed procedural stone & cobble tile ground texture
    const createGroundGridTexture = () => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, 512, 512);

      // Stone slab grid with beveled highlights & mortar seams
      const tileCount = 4;
      const tileSize = 512 / tileCount;
      for (let row = 0; row < tileCount; row++) {
        for (let col = 0; col < tileCount; col++) {
          const offsetX = (row % 2) * (tileSize * 0.5);
          const x = ((col * tileSize + offsetX) % 512);
          const y = row * tileSize;
          const shade = 238 + Math.floor(Math.random() * 16);
          ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
          ctx.fillRect(x + 3, y + 3, tileSize - 6, tileSize - 6);

          // Top-left bevel highlight
          ctx.strokeStyle = 'rgba(255,255,255,0.45)';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 4, y + 4, tileSize - 8, tileSize - 8);

          // Mortar seam
          ctx.strokeStyle = 'rgba(15,23,42,0.16)';
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 1.5, y + 1.5, tileSize - 3, tileSize - 3);
        }
      }

      // Subtle organic pebbles & surface grain
      for (let i = 0; i < 240; i++) {
        ctx.fillStyle =
          i % 2 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.06)';
        ctx.beginPath();
        ctx.arc(
          Math.random() * 512,
          Math.random() * 512,
          1.5 + Math.random() * 3.5,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(8, 8);
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return tex;
    };
    const groundGridTex = createGroundGridTexture();

    // World Groups
    const chunksRoot = new THREE.Group();
    const itemsRoot = new THREE.Group();
    const destructiblesRoot = new THREE.Group();
    const enemiesRoot = new THREE.Group();
    const effectsRoot = new THREE.Group();
    scene.add(
      chunksRoot,
      itemsRoot,
      destructiblesRoot,
      enemiesRoot,
      effectsRoot
    );

    // Slash Arc Visual Mesh
    const slashGeo = new THREE.RingGeometry(
      1.1,
      3.5,
      28,
      1,
      -Math.PI * 0.48,
      Math.PI * 0.96
    );
    slashGeo.rotateX(-Math.PI / 2);
    const slashMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const slashMesh = new THREE.Mesh(slashGeo, slashMat);
    slashMesh.position.y = 0.85;
    slashMesh.visible = false;
    effectsRoot.add(slashMesh);

    // 3D Chain Lightning Bolt Visual (Jagged glowing cyan-yellow line)
    const maxLightningPoints = 36;
    const lightningPositions = new Float32Array(maxLightningPoints * 3);
    const lightningGeo = new THREE.BufferGeometry();
    lightningGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(lightningPositions, 3)
    );
    const lightningMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
    });
    const lightningLine = new THREE.Line(lightningGeo, lightningMat);
    lightningLine.visible = false;
    effectsRoot.add(lightningLine);
    let lightningTimer = 0;

    // Expanding Nova Wave Rings (for Fire Nova, Frost Nova, Vampiric Wave)
    const novaWaves: NovaWaveEffect[] = [];
    const baseNovaGeo = new THREE.RingGeometry(0.75, 1.0, 32);
    baseNovaGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xf97316,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(baseNovaGeo, mat);
      mesh.position.y = 0.25;
      mesh.visible = false;
      effectsRoot.add(mesh);
      novaWaves.push({
        mesh,
        mat,
        life: 0,
        maxLife: 0.45,
        maxScale: 6.5,
        active: false,
      });
    }

    const triggerNovaWaveVisual = (
      x: number,
      z: number,
      colorHex: number,
      maxRadius = 6.5
    ) => {
      for (const nw of novaWaves) {
        if (!nw.active) {
          nw.active = true;
          nw.life = 0;
          nw.maxLife = 0.38;
          nw.maxScale = maxRadius;
          nw.mat.color.setHex(colorHex);
          nw.mat.opacity = 0.85;
          nw.mesh.position.set(x, 0.28, z);
          nw.mesh.scale.setScalar(0.5);
          nw.mesh.visible = true;
          return;
        }
      }
    };

    // Orbiting Energy Blades Group (`orbit_blades` perk)
    const orbitBladesGroup = new THREE.Group();
    orbitBladesGroup.position.y = 0.95;
    effectsRoot.add(orbitBladesGroup);
    const bladeMeshes: THREE.Mesh[] = [];

    const rebuildOrbitBlades = (count: number) => {
      while (orbitBladesGroup.children.length > 0) {
        orbitBladesGroup.remove(orbitBladesGroup.children[0]);
      }
      bladeMeshes.length = 0;
      if (count <= 0) return;

      const bladeGeo = new THREE.TorusGeometry(0.42, 0.08, 8, 18);
      bladeGeo.rotateX(Math.PI / 2);
      const bladeMat = new THREE.MeshBasicMaterial({
        color: 0xc084fc,
      });
      const radius = 3.15;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const m = new THREE.Mesh(bladeGeo, bladeMat);
        m.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        orbitBladesGroup.add(m);
        bladeMeshes.push(m);
      }
    };

    // Boss Telegraph Visuals (Slam Ring, Charge Line, 4-Way Cross Beams, 3 Meteor Circles)
    const telegraphRingGeo = new THREE.RingGeometry(0.2, 5.4, 36);
    telegraphRingGeo.rotateX(-Math.PI / 2);
    const telegraphRingMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const telegraphRingMesh = new THREE.Mesh(
      telegraphRingGeo,
      telegraphRingMat
    );
    telegraphRingMesh.position.y = 0.06;
    telegraphRingMesh.visible = false;
    effectsRoot.add(telegraphRingMesh);

    const telegraphLineGeo = new THREE.PlaneGeometry(2.6, 17);
    telegraphLineGeo.translate(0, 8.5, 0);
    telegraphLineGeo.rotateX(-Math.PI / 2);
    const telegraphLineMesh = new THREE.Mesh(
      telegraphLineGeo,
      telegraphRingMat
    );
    telegraphLineMesh.position.y = 0.06;
    telegraphLineMesh.visible = false;
    effectsRoot.add(telegraphLineMesh);

    // 4-Way Cross Beams for Boss Phase 2
    const crossTelegraphGroup = new THREE.Group();
    const crossBeamGeo1 = new THREE.PlaneGeometry(2.3, 24);
    crossBeamGeo1.rotateX(-Math.PI / 2);
    const crossBeamGeo2 = new THREE.PlaneGeometry(24, 2.3);
    crossBeamGeo2.rotateX(-Math.PI / 2);
    crossTelegraphGroup.add(
      new THREE.Mesh(crossBeamGeo1, telegraphRingMat),
      new THREE.Mesh(crossBeamGeo2, telegraphRingMat)
    );
    crossTelegraphGroup.position.y = 0.06;
    crossTelegraphGroup.visible = false;
    effectsRoot.add(crossTelegraphGroup);

    // 3 Meteor Danger Circles for Boss Phase 3
    const meteorCircleGeo = new THREE.RingGeometry(0.15, 3.3, 28);
    meteorCircleGeo.rotateX(-Math.PI / 2);
    const meteorCircleMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(meteorCircleGeo, telegraphRingMat);
      m.position.y = 0.06;
      m.visible = false;
      effectsRoot.add(m);
      meteorCircleMeshes.push(m);
    }

    // Pooled Enemy Projectiles (for Spitter & Boss Phase 2/3 bullet patterns)
    const projGeo = new THREE.SphereGeometry(0.28, 12, 12);
    const projMat = new THREE.MeshBasicMaterial({ color: 0xd946ef });
    const enemyProjectiles: EnemyProjectile[] = [];
    for (let i = 0; i < 45; i++) {
      const m = new THREE.Mesh(projGeo, projMat);
      m.visible = false;
      effectsRoot.add(m);
      enemyProjectiles.push({
        mesh: m,
        x: 0,
        z: 0,
        vx: 0,
        vz: 0,
        damage: 14,
        life: 0,
        active: false,
      });
    }

    const spawnEnemyProjectile = (
      x: number,
      z: number,
      vx: number,
      vz: number,
      damage = 14
    ) => {
      for (const ep of enemyProjectiles) {
        if (!ep.active) {
          ep.active = true;
          ep.x = x;
          ep.z = z;
          ep.vx = vx;
          ep.vz = vz;
          ep.damage = damage;
          ep.life = 3.2;
          ep.mesh.position.set(x, 0.9, z);
          ep.mesh.visible = true;
          return;
        }
      }
    };

    // Pooled Smooth Spherical Particles (110 meshes)
    const particleGeo = new THREE.SphereGeometry(0.16, 8, 8);
    const particles: ParticleEntity[] = [];
    for (let i = 0; i < 110; i++) {
      const pMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.35,
      });
      const pMesh = new THREE.Mesh(particleGeo, pMat);
      pMesh.visible = false;
      effectsRoot.add(pMesh);
      particles.push({
        mesh: pMesh,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.5,
        active: false,
      });
    }

    const spawnParticles = (
      x: number,
      y: number,
      z: number,
      colorHex: number,
      count = 10,
      speed = 6.5
    ) => {
      let spawned = 0;
      for (let i = 0; i < particles.length && spawned < count; i++) {
        const p = particles[i];
        if (!p.active) {
          p.active = true;
          p.life = 0;
          p.maxLife = 0.3 + Math.random() * 0.32;
          p.mesh.position.set(x, y, z);
          p.mesh.scale.setScalar(0.85 + Math.random() * 0.85);
          (p.mesh.material as THREE.MeshStandardMaterial).color.setHex(
            colorHex
          );
          const angle = Math.random() * Math.PI * 2;
          const spd = (0.4 + Math.random() * 0.85) * speed;
          p.vx = Math.cos(angle) * spd;
          p.vy = 3.0 + Math.random() * 5.2;
          p.vz = Math.sin(angle) * spd;
          p.mesh.visible = true;
          spawned++;
        }
      }
    };

    // Pooled XP Gems (95 meshes)
    const gemGeo = new THREE.OctahedronGeometry(0.28, 1);
    const gemMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.7,
      roughness: 0.15,
      metalness: 0.8,
      clearcoat: 1.0,
    });
    const xpGems: XpGemEntity[] = [];
    for (let i = 0; i < 95; i++) {
      const m = new THREE.Mesh(gemGeo, gemMat);
      m.visible = false;
      effectsRoot.add(m);
      xpGems.push({ mesh: m, x: 0, z: 0, value: 15, active: false });
    }

    const spawnXpGem = (x: number, z: number, value = 18) => {
      for (let i = 0; i < xpGems.length; i++) {
        const g = xpGems[i];
        if (!g.active) {
          g.active = true;
          g.x = x;
          g.z = z;
          g.value = value;
          g.mesh.position.set(x, 0.45, z);
          g.mesh.visible = true;
          return;
        }
      }
    };

    // Mutable Game Simulation State
    const sim = {
      playerX: 0,
      playerZ: 0,
      playerVx: 0,
      playerVz: 0,
      facingAngle: 0,
      walkCycle: 0,
      hp: 130,
      maxHp: 130,
      xp: 0,
      xpToNext: 260,
      level: 1,
      stageNumber: 1,
      stageTime: 0,
      stageTransitionTimer: 0,
      stageTransitionSwapped: false,
      stageAnnouncement: null as string | null,
      stageAnnouncementTimer: 0,
      score: 0,
      kills: 0,
      bossesDefeated: 0,
      elapsedTime: 0,
      nextBossTimer: BOSS_INTERVAL,
      biomeIndex: 0,
      weapon: null as EquippedWeapon | null,
      weaponUsageCount: {} as Record<string, number>,
      attackCooldownTimer: 0,
      swingAnimTimer: 0,
      swingAnimDuration: 0.24,
      hitstopTimer: 0,
      shakeIntensity: 0,
      comboCount: 0,
      comboResetTimer: 0,
      hitCount: 0,
      activePerks: [] as string[],
      perkLevels: {} as Record<string, number>,
      levelUpChoices: [] as PerkOption[],
      // Perk & skill parameters
      damageMult: 1.0,
      durabilityMult: 1.0,
      speedMult: 1.0,
      rangeMult: 1.0,
      attackSpeedMult: 1.0,
      shatterBlastLevel: 0,
      chainLightningLevel: 0, // 0 = base (every 10th hit), 1+ = upgraded via perk!
      fireNovaLevel: 0,
      frostNovaLevel: 0,
      orbitBladesLevel: 0,
      orbitBladesCount: 0,
      orbitDamageCooldown: 0,
      meteorStrikeLevel: 0,
      meteorTimer: 4.5,
      vampiricLevel: 0,
      luckBonus: 0,
      magnetRadius: 5.8,
      enemySpawnTimer: 0,
      waveSurgeTimer: 16,
      hudSyncTimer: 0,
      saveRunTimer: 0,
      touchMoveX: 0,
      touchMoveZ: 0,
      weaponPickupCooldown: 0,
      wasBerserk: false,
      deathAnimTimer: 0,
      deathKickTimer: 0,
      runCoins: 0,
    };

    const getMetaBonuses = () =>
      computeMetaBonuses(metaProgressionRef.current || DEFAULT_META_PROGRESSION);

    const awardCoins = (baseAmount: number, x?: number, z?: number) => {
      if (baseAmount <= 0) return;
      const metaB = getMetaBonuses();
      // Higher checkpoint tiers grant +50% coins per 10 stages (Stage 11 = 1.5x, Stage 21 = 2.0x)
      const stageTierMult = 1 + Math.floor((sim.stageNumber - 1) / 10) * 0.5;
      const earned = Math.max(
        1,
        Math.round(baseAmount * metaB.coinMult * stageTierMult)
      );
      sim.runCoins += earned;
      if (x !== undefined && z !== undefined) {
        spawnParticles(x, 1.15, z, 0xfacc15, Math.min(14, 3 + Math.floor(earned / 8)), 6.5);
      }
      onMetaEventRef.current?.({ coinsAdded: earned });
    };

    const isBerserkActive = () =>
      sim.hp > 0 && sim.deathAnimTimer <= 0 && sim.hp / sim.maxHp < 0.2;

    const getEffectiveDamageMult = () =>
      sim.damageMult *
      getMetaBonuses().damageMult *
      (isBerserkActive() ? 1.5 : 1.0);

    const getEffectiveSpeedMult = () =>
      sim.speedMult *
      getMetaBonuses().speedMult *
      (isBerserkActive() ? 1.5 : 1.0);

    let heroRig: HeroRigRefs = createHeroRig(appearanceRef.current);
    scene.add(heroRig.root);

    // Berserk Red Aura Ring under Hero
    const berserkAuraGeo = new THREE.RingGeometry(0.65, 1.35, 32);
    berserkAuraGeo.rotateX(-Math.PI / 2);
    const berserkAuraMat = new THREE.MeshBasicMaterial({
      color: 0xff1122,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const berserkAuraMesh = new THREE.Mesh(berserkAuraGeo, berserkAuraMat);
    berserkAuraMesh.position.y = 0.06;
    berserkAuraMesh.visible = false;
    effectsRoot.add(berserkAuraMesh);

    let heroEmissiveMats: THREE.MeshStandardMaterial[] = [];
    const collectHeroMaterials = (rig: HeroRigRefs) => {
      const mats = new Set<THREE.MeshStandardMaterial>();
      rig.bodyGroup.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mat = child.material;
          if (mat instanceof THREE.MeshStandardMaterial) {
            // Skip pure black/white eye meshes so eyes stay crisp
            const hex = mat.color.getHex();
            if (hex !== 0xffffff && hex !== 0x0f172a) {
              mats.add(mat);
            }
          }
        }
      });
      heroEmissiveMats = Array.from(mats);
    };
    collectHeroMaterials(heroRig);

    const setHeroRedGlow = (intensity: number, colorHex = 0xff1122) => {
      for (const m of heroEmissiveMats) {
        if (intensity > 0) {
          m.emissive.setHex(colorHex);
          m.emissiveIntensity = intensity;
        } else {
          m.emissive.setHex(0x000000);
          m.emissiveIntensity = 0;
        }
      }
    };

    const equipWeaponVisual = (w: EquippedWeapon | null) => {
      while (heroRig.weaponSocket.children.length > 0) {
        heroRig.weaponSocket.remove(heroRig.weaponSocket.children[0]);
      }
      if (w) {
        const wMesh = createWeaponMesh(w.type, w.rarity);
        heroRig.weaponSocket.add(wMesh);
      }
    };

    rebuildHeroFnRef.current = (newApp: CharacterAppearance) => {
      const oldPos = heroRig.root.position.clone();
      const oldRot = heroRig.root.rotation.y;
      scene.remove(heroRig.root);
      heroRig = createHeroRig(newApp);
      heroRig.root.position.copy(oldPos);
      heroRig.root.rotation.y = oldRot;
      scene.add(heroRig.root);
      collectHeroMaterials(heroRig);
      equipWeaponVisual(sim.weapon);
    };

    const chunks = new Map<string, ChunkData>();
    const groundWeapons: GroundWeaponEntity[] = [];
    const destructibles: DestructibleEntity[] = [];
    const zombies: ZombieEntity[] = [];

    const rollRarity = (forceRarePlus = false): WeaponRarity => {
      const r = Math.random() + sim.luckBonus * 0.12;
      if (forceRarePlus) {
        if (r > 0.7) return 'legendary';
        if (r > 0.32) return 'epic';
        return 'rare';
      }
      if (r > 0.91) return 'legendary';
      if (r > 0.72) return 'epic';
      if (r > 0.4) return 'rare';
      return 'common';
    };

    const createWeaponInstance = (
      type?: WeaponTypeId,
      rarity?: WeaponRarity
    ): EquippedWeapon => {
      const chosenType =
        type || WEAPON_IDS[Math.floor(Math.random() * WEAPON_IDS.length)];
      const chosenRarity = rarity || rollRarity(false);
      const tpl = WEAPON_TEMPLATES[chosenType];
      const rInfo = RARITY_CONFIG[chosenRarity];
      const metaB = getMetaBonuses();
      const maxDur = Math.round(
        tpl.baseDurability *
          rInfo.durabilityMult *
          sim.durabilityMult *
          metaB.durabilityMult
      );
      return {
        uid: `${chosenType}_${Math.random().toString(36).slice(2, 8)}`,
        type: chosenType,
        name: tpl.name,
        rarity: chosenRarity,
        damage: Math.round(tpl.baseDamage * rInfo.damageMult),
        durability: maxDur,
        maxDurability: maxDur,
        range: tpl.range,
        arcAngle: tpl.arcAngle,
        cooldown: tpl.cooldown,
        knockback: tpl.knockback,
        heavyHitstop: tpl.heavyHitstop,
        soundType: tpl.soundType,
      };
    };

    const spawnGroundWeapon = (
      x: number,
      z: number,
      type?: WeaponTypeId,
      rarity?: WeaponRarity
    ) => {
      if (groundWeapons.length > 35) {
        const oldest = groundWeapons.shift()!;
        itemsRoot.remove(oldest.mesh);
        itemsRoot.remove(oldest.ringMesh);
      }
      const weapon = createWeaponInstance(type, rarity);
      const mesh = createWeaponMesh(weapon.type, weapon.rarity);
      mesh.position.set(x, 0.55, z);
      itemsRoot.add(mesh);

      const ringGeo = new THREE.RingGeometry(0.65, 0.85, 24);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: RARITY_CONFIG[weapon.rarity].hex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(x, 0.04, z);
      itemsRoot.add(ringMesh);

      groundWeapons.push({
        id: weapon.uid,
        weapon,
        mesh,
        ringMesh,
        x,
        z,
        bobPhase: Math.random() * Math.PI * 2,
      });
    };

    const isInsideArena = (x: number, z: number, margin = 2.6) =>
      Math.abs(x) <= ARENA_HALF_SIZE - margin &&
      Math.abs(z) <= ARENA_HALF_SIZE - margin;

    const clampToArena = (val: number, margin = 1.25) =>
      Math.max(-ARENA_HALF_SIZE + margin, Math.min(ARENA_HALF_SIZE - margin, val));

    const spawnDestructible = (
      x: number,
      z: number,
      kind: DestructibleKind,
      chunkKey = 'manual',
      rotationY?: number
    ) => {
      if (destructibles.length > 140) return;
      if (!isInsideArena(x, z, 2.4)) return;
      const biome = BIOMES[sim.biomeIndex % BIOMES.length];
      const mesh = createDestructibleMesh(
        kind,
        biome.foliageColor,
        biome.secondaryFoliageColor,
        biome.houseWallColor,
        biome.houseRoofColor
      );
      mesh.position.set(x, 0, z);
      mesh.rotation.y =
        rotationY !== undefined
          ? rotationY
          : (Math.floor(Math.random() * 8) * Math.PI) / 4;
      destructiblesRoot.add(mesh);

      const maxHpMap: Record<DestructibleKind, number> = {
        house: 135,
        windmill: 145,
        fountain: 110,
        car: 95,
        bus_stop: 85,
        statue: 90,
        cart: 65,
        phone_booth: 60,
        crystal_cluster: 65,
        tree: 55,
        cactus: 48,
        snowman: 42,
        crate: 40,
        streetlight: 35,
        hydrant: 32,
        barrel: 28,
        street_sign: 28,
      };
      const radiusMap: Record<DestructibleKind, number> = {
        house: 2.1,
        windmill: 1.85,
        fountain: 1.65,
        car: 1.75,
        bus_stop: 1.5,
        statue: 0.95,
        cart: 1.25,
        phone_booth: 0.78,
        crystal_cluster: 0.95,
        tree: 0.85,
        cactus: 0.75,
        snowman: 0.8,
        crate: 0.7,
        streetlight: 0.45,
        hydrant: 0.48,
        barrel: 0.6,
        street_sign: 0.45,
      };

      const maxHp = maxHpMap[kind];
      destructibles.push({
        id: `prop_${Math.random()}`,
        chunkKey,
        kind,
        mesh,
        x,
        z,
        hp: maxHp,
        maxHp,
        radius: radiusMap[kind],
        hitFlashTimer: 0,
      });
    };

    const buildChunk = (cx: number, cz: number): ChunkData => {
      const key = `${cx},${cz}`;
      const group = new THREE.Group();
      const worldX = cx * CHUNK_SIZE;
      const worldZ = cz * CHUNK_SIZE;
      group.position.set(worldX, 0, worldZ);

      const biome = BIOMES[sim.biomeIndex % BIOMES.length];

      const groundMat = new THREE.MeshStandardMaterial({
        color: biome.groundColor,
        map: groundGridTex,
        roughness: 0.85,
        metalness: 0.05,
      });
      const groundMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE),
        groundMat
      );
      groundMesh.rotation.x = -Math.PI / 2;
      groundMesh.receiveShadow = true;
      group.add(groundMesh);

      const roadMat = new THREE.MeshStandardMaterial({
        color: biome.roadColor,
        roughness: 0.78,
        metalness: 0.12,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const roadMeshZ = new THREE.Mesh(
        new THREE.PlaneGeometry(7.6, CHUNK_SIZE),
        roadMat
      );
      roadMeshZ.rotation.x = -Math.PI / 2;
      roadMeshZ.position.y = 0.02;
      group.add(roadMeshZ);

      const dashMat = new THREE.MeshBasicMaterial({
        color: 0xfde047,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      });
      for (let d = -CHUNK_SIZE / 2 + 3; d < CHUNK_SIZE / 2; d += 6) {
        const dash = new THREE.Mesh(
          new THREE.PlaneGeometry(0.28, 2.6),
          dashMat
        );
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(0, 0.03, d);
        group.add(dash);
      }

      const seedBase = Math.abs((cx * 73856093) ^ (cz * 19349663));

      // 1. Colorful Destructible Houses & Windmills
      for (let h = 0; h < 2; h++) {
        const side = h === 0 ? -1 : 1;
        const hx = worldX + side * (11.5 + ((seedBase + h * 13) % 6));
        const hz = worldZ + (h === 0 ? -10 : 10);
        if (Math.hypot(hx - sim.playerX, hz - sim.playerZ) > 6.5) {
          const buildingKind: DestructibleKind =
            (seedBase + h) % 3 === 0 ? 'windmill' : 'house';
          spawnDestructible(
            hx,
            hz,
            buildingKind,
            key,
            side === -1 ? Math.PI / 2 : -Math.PI / 2
          );
        }
      }

      // 2. Curb Props (Streetlights, Signs, Hydrants, Phone Booths, Bus Stops)
      const curbCatalog: DestructibleKind[] = [
        'streetlight',
        'street_sign',
        'hydrant',
        'phone_booth',
        'bus_stop',
      ];
      for (let s = 0; s < 4; s++) {
        const side = s % 2 === 0 ? 1 : -1;
        const curbX = worldX + side * 4.8;
        const curbZ = worldZ - 15 + s * 10;
        if (Math.hypot(curbX - sim.playerX, curbZ - sim.playerZ) > 4.5) {
          const curbKind = curbCatalog[(seedBase + s) % curbCatalog.length];
          spawnDestructible(curbX, curbZ, curbKind, key);
        }
      }

      // 3. Colorful Trees, Cacti, Snowmen & Crystal Clusters
      const natureCatalog: DestructibleKind[] = [
        'tree',
        'tree',
        'cactus',
        'snowman',
        'crystal_cluster',
      ];
      for (let i = 0; i < 6; i++) {
        const side = i % 2 === 0 ? 1 : -1;
        const tx = worldX + side * (8.5 + ((seedBase + i * 19) % 11));
        const tz = worldZ - CHUNK_SIZE * 0.42 + i * 6.8;
        if (Math.hypot(tx - sim.playerX, tz - sim.playerZ) > 5.5) {
          const natureKind =
            natureCatalog[(seedBase + i * 3) % natureCatalog.length];
          spawnDestructible(tx, tz, natureKind, key);
        }
      }

      // 4. Rich Variety of Props (Carts, Cars, Crates, Barrels, Fountains, Statues, Crystals)
      const varietyProps: DestructibleKind[] = [
        'cart',
        'car',
        'crate',
        'barrel',
        'fountain',
        'statue',
        'crystal_cluster',
        'snowman',
        'cactus',
        'phone_booth',
      ];
      for (let i = 0; i < 6; i++) {
        const px = worldX + (Math.random() - 0.5) * (CHUNK_SIZE * 0.78);
        const pz = worldZ + (Math.random() - 0.5) * (CHUNK_SIZE * 0.78);
        if (Math.hypot(px - sim.playerX, pz - sim.playerZ) > 5.5) {
          const chosenKind =
            varietyProps[(seedBase + i * 7) % varietyProps.length];
          spawnDestructible(px, pz, chosenKind, key);
        }
      }

      // 5. Weapons
      for (let i = 0; i < 3; i++) {
        const wx = worldX + (Math.random() - 0.5) * (CHUNK_SIZE * 0.76);
        const wz = worldZ + (Math.random() - 0.5) * (CHUNK_SIZE * 0.76);
        if (
          isInsideArena(wx, wz, 3.0) &&
          Math.hypot(wx - sim.playerX, wz - sim.playerZ) > 4.5
        ) {
          spawnGroundWeapon(wx, wz);
        }
      }

      // 6. Add 3D Bounded Square Arena Perimeter Walls & Corner Towers on center chunk
      if (cx === 0 && cz === 0) {
        const borderGroup = createArenaBorderGroup(
          ARENA_HALF_SIZE,
          biome.houseWallColor,
          biome.houseRoofColor,
          biome.secondaryFoliageColor
        );
        group.add(borderGroup);
      }

      chunksRoot.add(group);
      return {
        key,
        cx,
        cz,
        group,
        groundMat,
        roadMat,
      };
    };

    const updateChunksAroundPlayer = () => {
      // Fixed 3x3 chunk grid covering the bounded square arena
      for (let cx = -1; cx <= 1; cx++) {
        for (let cz = -1; cz <= 1; cz++) {
          const key = `${cx},${cz}`;
          if (!chunks.has(key)) {
            chunks.set(key, buildChunk(cx, cz));
          }
        }
      }
    };

    const applyBiomePalette = (biomeIdx: number, rebuildWorldProps = false) => {
      const b = BIOMES[biomeIdx % BIOMES.length];
      _colorTmp.setHex(b.fogColor);
      scene.background = _colorTmp.clone();
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.setHex(b.fogColor);
      }
      hemiLight.color.setHex(b.skyLightColor);
      hemiLight.groundColor.setHex(b.groundLightColor);
      sunLight.color.setHex(b.sunLightColor);
      sunLight.intensity = b.sunIntensity;

      if (rebuildWorldProps) {
        for (const chunk of chunks.values()) chunksRoot.remove(chunk.group);
        chunks.clear();
        for (const d of destructibles) destructiblesRoot.remove(d.mesh);
        destructibles.length = 0;
        updateChunksAroundPlayer();
      } else {
        for (const chunk of chunks.values()) {
          chunk.groundMat.color.setHex(b.groundColor);
          chunk.roadMat.color.setHex(b.roadColor);
        }
      }
    };

    // Trigger "ВЖУХ!" Stage Transition after Boss Defeat!
    const advanceToNextStageLevel = () => {
      // Clear all remaining monsters & projectiles with celebratory bursts
      for (const z of zombies) {
        spawnParticles(z.x, 1.0, z.z, 0xfacc15, 8, 7);
        enemiesRoot.remove(z.rig.root);
      }
      zombies.length = 0;
      for (const ep of enemyProjectiles) {
        ep.active = false;
        ep.mesh.visible = false;
      }
      hideAllBossTelegraphs();

      soundEngine.playLevelUp();
      soundEngine.playMagicNova();
      triggerNovaWaveVisual(sim.playerX, sim.playerZ, 0xfacc15, 16);
      spawnParticles(sim.playerX, 1.5, sim.playerZ, 0xfacc15, 32, 11);
      spawnParticles(sim.playerX, 1.8, sim.playerZ, 0x38bdf8, 28, 10);

      sim.stageTransitionTimer = 1.5;
      sim.stageTransitionSwapped = false;
      syncHud(true);
    };

    // Diverse Monster Spawner (7 monster types + Boss, Biome-Harmonized Colors)
    const spawnZombie = (
      forceBoss = false,
      customDist?: number,
      forcedVariant?: EnemyVariant,
      customX?: number,
      customZ?: number
    ) => {
      if (!forceBoss && zombies.length >= 100) return;
      const angle = Math.random() * Math.PI * 2;
      const dist =
        customDist !== undefined
          ? customDist
          : forceBoss
          ? 16
          : 15 + Math.random() * 11;
      const rawX =
        customX !== undefined ? customX : sim.playerX + Math.cos(angle) * dist;
      const rawZ =
        customZ !== undefined ? customZ : sim.playerZ + Math.sin(angle) * dist;
      const zx = clampToArena(rawX, 1.6);
      const zz = clampToArena(rawZ, 1.6);

      const timeScale = 1 + sim.stageTime / 75 + (sim.stageNumber - 1) * 0.28;
      let variant: EnemyVariant = 'walker';
      if (forceBoss) {
        variant = 'boss';
      } else if (forcedVariant) {
        variant = forcedVariant;
      } else {
        const r = Math.random();
        if (r > 0.92 && sim.stageTime > 18) variant = 'necromancer';
        else if (r > 0.82 && sim.stageTime > 12) variant = 'bomber';
        else if (r > 0.68 && sim.stageTime > 8) variant = 'spitter';
        else if (r > 0.54 && sim.stageTime > 14) variant = 'brute';
        else if (r > 0.34) variant = 'runner';
        else if (r > 0.22) variant = 'mini_skeleton';
        else variant = 'walker';
      }

      const bossIdx = sim.bossesDefeated % BOSS_ARCHETYPES.length;
      const isGrandBoss = forceBoss && sim.stageNumber % 10 === 0;
      const currentBiome = BIOMES[sim.biomeIndex % BIOMES.length];
      const rig = createZombieRig(
        variant,
        bossIdx,
        currentBiome.monsterPalette,
        isGrandBoss
      );
      rig.root.position.set(zx, 0, zz);
      enemiesRoot.add(rig.root);

      const baseHp =
        variant === 'boss'
          ? Math.round((isGrandBoss ? 1150 : 680) * timeScale)
          : variant === 'brute'
          ? Math.round(90 * timeScale)
          : variant === 'necromancer'
          ? Math.round(75 * timeScale)
          : variant === 'spitter'
          ? Math.round(48 * timeScale)
          : variant === 'bomber'
          ? Math.round(42 * timeScale)
          : variant === 'runner'
          ? Math.round(34 * timeScale)
          : variant === 'mini_skeleton'
          ? Math.round(24 * timeScale)
          : Math.round(46 * timeScale);

      const speed =
        variant === 'boss'
          ? isGrandBoss
            ? 5.0
            : 4.6
          : variant === 'mini_skeleton'
          ? 6.6
          : variant === 'runner'
          ? 6.1
          : variant === 'bomber'
          ? 5.6
          : variant === 'spitter'
          ? 3.4
          : variant === 'necromancer'
          ? 2.8
          : variant === 'brute'
          ? 3.1
          : 3.9;

      const damage =
        variant === 'boss'
          ? isGrandBoss
            ? 34
            : 26
          : variant === 'bomber'
          ? 22
          : variant === 'brute'
          ? 15
          : variant === 'runner' || variant === 'mini_skeleton'
          ? 8
          : 10;

      const zEntity: ZombieEntity = {
        id: `z_${Math.random()}`,
        variant,
        bossIndex: bossIdx,
        bossPhase: 1,
        isGrandBoss,
        rig,
        x: zx,
        z: zz,
        vx: 0,
        vz: 0,
        hp: baseHp,
        maxHp: baseHp,
        speed,
        damage,
        radius:
          variant === 'boss'
            ? isGrandBoss
              ? 1.85
              : 1.45
            : variant === 'brute'
            ? 0.85
            : variant === 'mini_skeleton'
            ? 0.45
            : 0.58,
        walkPhase: Math.random() * Math.PI * 2,
        hitFlashTimer: 0,
        slowTimer: 0,
        attackCooldown: 1.5 + Math.random(),
        specialAbilityTimer: 3.0 + Math.random() * 2.0,
        telegraphTimer: 0,
        telegraphMax: 1.5,
        telegraphPattern: 'slam',
        telegraphDirX: 0,
        telegraphDirZ: 1,
        meteorTargets: [],
      };

      zombies.push(zEntity);
      if (forceBoss) {
        soundEngine.playBossSpawn();
        sim.shakeIntensity = isGrandBoss ? 0.72 : 0.45;
        if (isGrandBoss) {
          sim.stageAnnouncement = `👑 ГРАНД-БОСС ${sim.stageNumber}-ГО ЭТАПА · ОТКРОЙ ЧЕКПОИНТ ${sim.stageNumber + 1}!`;
          sim.stageAnnouncementTimer = 4.8;
        }
      }
    };

    const triggerExplosion = (
      x: number,
      z: number,
      radius: number,
      dmg: number,
      primaryColor = 0xf97316,
      secondaryColor = 0xfacc15
    ) => {
      soundEngine.playExplosion();
      sim.shakeIntensity = Math.max(sim.shakeIntensity, 0.55);
      triggerNovaWaveVisual(x, z, primaryColor, radius);
      spawnParticles(x, 0.9, z, primaryColor, 20, 9.5);
      spawnParticles(x, 1.2, z, secondaryColor, 12, 7.5);

      for (let i = zombies.length - 1; i >= 0; i--) {
        const zb = zombies[i];
        if (!zb) continue;
        const dist = Math.hypot(zb.x - x, zb.z - z);
        if (dist <= radius + zb.radius) {
          damageZombie(
            i,
            dmg,
            (zb.x - x) / (dist || 1),
            (zb.z - z) / (dist || 1),
            12
          );
        }
      }
    };

    // Chain Lightning Skill Execution (Scales targets & damage with level!)
    const triggerChainLightning = (startX: number, startZ: number) => {
      if (zombies.length === 0) return;
      const lvl = sim.chainLightningLevel;
      const maxTargets = 4 + lvl * 2;
      const lightningDmg = Math.round(
        (70 + lvl * 40) * getEffectiveDamageMult()
      );

      const hitIndices: number[] = [];
      let curX = startX;
      let curZ = startZ;

      const points: THREE.Vector3[] = [
        new THREE.Vector3(sim.playerX, 1.2, sim.playerZ),
      ];

      for (let bounce = 0; bounce < maxTargets; bounce++) {
        let bestIdx = -1;
        let bestDist = 12.0 + lvl * 0.8;
        for (let i = 0; i < zombies.length; i++) {
          if (hitIndices.includes(i)) continue;
          const cand = zombies[i];
          if (!cand) continue;
          const d = Math.hypot(cand.x - curX, cand.z - curZ);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
          }
        }
        if (bestIdx === -1) break;
        const target = zombies[bestIdx];
        if (!target) break;
        hitIndices.push(bestIdx);

        const midX = (curX + target.x) * 0.5 + (Math.random() - 0.5) * 0.9;
        const midZ = (curZ + target.z) * 0.5 + (Math.random() - 0.5) * 0.9;
        points.push(new THREE.Vector3(midX, 1.35, midZ));
        points.push(new THREE.Vector3(target.x, 1.15, target.z));

        curX = target.x;
        curZ = target.z;
      }

      if (hitIndices.length === 0) return;

      soundEngine.playLightning();
      const posAttr = lightningGeo.getAttribute(
        'position'
      ) as THREE.BufferAttribute;
      for (let i = 0; i < maxLightningPoints; i++) {
        const pt = points[Math.min(i, points.length - 1)];
        posAttr.setXYZ(i, pt.x, pt.y, pt.z);
      }
      posAttr.needsUpdate = true;
      lightningMat.opacity = 1.0;
      lightningLine.visible = true;
      lightningTimer = 0.26;

      const sortedDesc = [...hitIndices].sort((a, b) => b - a);
      for (const idx of sortedDesc) {
        const zb = zombies[idx];
        if (zb) {
          spawnParticles(zb.x, 1.2, zb.z, 0x38bdf8, 6, 6.5);
          damageZombie(idx, lightningDmg, 0, 0, 4.5);
        }
      }
    };

    const triggerLevelUpModal = () => {
      soundEngine.playLevelUp();
      const shuffled = [...PERK_POOL].sort(() => Math.random() - 0.5);
      sim.levelUpChoices = shuffled
        .slice(0, 3)
        .map((p) => buildLeveledPerkOption(p, sim.perkLevels[p.id] || 0));
      phaseRef.current = 'levelup';
      syncHud(true);
    };

    const hideAllBossTelegraphs = () => {
      telegraphRingMesh.visible = false;
      telegraphLineMesh.visible = false;
      crossTelegraphGroup.visible = false;
      for (const m of meteorCircleMeshes) m.visible = false;
    };

    const damageZombie = (
      index: number,
      amount: number,
      dirX: number,
      dirZ: number,
      knockbackForce: number
    ) => {
      const zb = zombies[index];
      if (!zb) return;
      zb.hp -= amount;
      zb.hitFlashTimer = 0.1;
      for (const m of zb.rig.materialsToFlash) {
        m.emissive.setHex(0xd97706);
        m.emissiveIntensity = 0.85;
      }
      zb.vx += dirX * knockbackForce;
      zb.vz += dirZ * knockbackForce;

      // Boss Phase Transitions (Phase 1 -> Phase 2 at 66%, Phase 2 -> Phase 3 at 33%)
      if (zb.variant === 'boss' && zb.hp > 0) {
        const hpRatio = zb.hp / zb.maxHp;
        if (hpRatio <= 0.33 && zb.bossPhase < 3) {
          zb.bossPhase = 3;
          zb.speed = 6.0;
          zb.rig.bodyGroup.scale.setScalar(2.65);
          if (zb.rig.bossAura) {
            (zb.rig.bossAura.material as THREE.MeshBasicMaterial).color.setHex(
              0xef4444
            );
            zb.rig.bossAura.scale.setScalar(1.45);
          }
          soundEngine.playBossSpawn();
          triggerNovaWaveVisual(zb.x, zb.z, 0xef4444, 9);
          // Summon 4 fast skeleton guards on phase 3!
          for (let s = 0; s < 4; s++) {
            const a = (s / 4) * Math.PI * 2;
            spawnZombie(
              false,
              undefined,
              'mini_skeleton',
              zb.x + Math.cos(a) * 3,
              zb.z + Math.sin(a) * 3
            );
          }
        } else if (hpRatio <= 0.66 && zb.bossPhase < 2) {
          zb.bossPhase = 2;
          zb.speed = 5.3;
          zb.rig.bodyGroup.scale.setScalar(2.45);
          if (zb.rig.bossAura) {
            (zb.rig.bossAura.material as THREE.MeshBasicMaterial).color.setHex(
              0xa855f7
            );
            zb.rig.bossAura.scale.setScalar(1.25);
          }
          soundEngine.playBossSpawn();
          triggerNovaWaveVisual(zb.x, zb.z, 0xa855f7, 7.5);
        }
      }

      spawnParticles(zb.x, 1.1, zb.z, 0x84cc16, 4, 5.5);

      if (zb.hp <= 0) {
        const deadX = zb.x;
        const deadZ = zb.z;
        const deadVariant = zb.variant;
        const deadIsGrandBoss = Boolean(zb.isGrandBoss);
        const wasBerserk = isBerserkActive();
        enemiesRoot.remove(zb.rig.root);
        zombies.splice(index, 1);
        sim.kills += 1;
        sim.comboCount += 1;
        sim.comboResetTimer = 3.5;
        const scoreGain =
          deadVariant === 'boss'
            ? 1500
            : deadVariant === 'necromancer' || deadVariant === 'brute'
            ? 130
            : 50;
        sim.score +=
          scoreGain * Math.min(5, 1 + Math.floor(sim.comboCount / 6));

        // Award Gold Coins for kills and Boss/Stage clears
        if (deadVariant === 'boss') {
          awardCoins(deadIsGrandBoss ? 180 : 75, deadX, deadZ);
        } else if (deadVariant === 'brute' || deadVariant === 'necromancer') {
          awardCoins(8, deadX, deadZ);
        } else if (Math.random() < 0.35) {
          awardCoins(3, deadX, deadZ);
        }

        onMetaEventRef.current?.({
          killsAdded: 1,
          berserkKillsAdded: wasBerserk ? 1 : 0,
          bossesKilledAdded: deadVariant === 'boss' ? 1 : 0,
          grandBossesKilledAdded:
            deadVariant === 'boss' && deadIsGrandBoss ? 1 : 0,
          stageCleared: deadVariant === 'boss' ? sim.stageNumber : undefined,
        });

        spawnParticles(
          deadX,
          0.9,
          deadZ,
          0xef4444,
          deadVariant === 'boss' ? 28 : 8,
          7.5
        );
        spawnXpGem(
          deadX,
          deadZ,
          deadVariant === 'boss' ? 140 : deadVariant === 'brute' ? 35 : 18
        );

        // Bomber explodes on death, damaging nearby zombies!
        if (deadVariant === 'bomber') {
          triggerExplosion(deadX, deadZ, 4.2, 85, 0xf97316, 0xfde047);
        }

        if (deadVariant === 'boss') {
          sim.bossesDefeated += 1;
          hideAllBossTelegraphs();
          spawnGroundWeapon(deadX, deadZ, undefined, 'legendary');
          advanceToNextStageLevel();
        } else if (Math.random() < 0.12) {
          spawnGroundWeapon(deadX, deadZ);
        }
      }
    };

    const destroyPropAt = (index: number) => {
      const prop = destructibles[index];
      if (!prop) return;
      destructiblesRoot.remove(prop.mesh);
      destructibles.splice(index, 1);
      sim.score += prop.kind === 'house' ? 250 : prop.kind === 'car' ? 150 : 50;

      // Award Gold Coins and track smashed props for achievements
      const basePropCoins =
        prop.kind === 'house' || prop.kind === 'windmill'
          ? 12
          : prop.kind === 'car' ||
            prop.kind === 'crystal_cluster' ||
            prop.kind === 'statue'
          ? 7
          : 3;
      awardCoins(basePropCoins, prop.x, prop.z);
      onMetaEventRef.current?.({ propsSmashedAdded: 1 });

      if (prop.kind === 'barrel') {
        triggerExplosion(prop.x, prop.z, 5.5, 140, 0xf97316, 0xfacc15);
      } else if (prop.kind === 'hydrant' || prop.kind === 'fountain') {
        triggerExplosion(prop.x, prop.z, 5.5, 110, 0x38bdf8, 0xe0f2fe);
        spawnXpGem(prop.x, prop.z, 25);
      } else if (prop.kind === 'house' || prop.kind === 'windmill') {
        soundEngine.playExplosion();
        sim.shakeIntensity = Math.max(sim.shakeIntensity, 0.45);
        spawnParticles(prop.x, 1.5, prop.z, 0xe11d48, 22, 8.5);
        spawnParticles(prop.x, 1.0, prop.z, 0xfef3c7, 16, 7.0);
        spawnGroundWeapon(prop.x, prop.z, undefined, rollRarity(true));
        spawnXpGem(prop.x + 1.0, prop.z, 35);
        spawnXpGem(prop.x - 1.0, prop.z + 0.6, 35);
        sim.hp = Math.min(sim.maxHp, sim.hp + 20);
      } else if (prop.kind === 'car' || prop.kind === 'bus_stop') {
        soundEngine.playWeaponBreak();
        spawnParticles(prop.x, 1.0, prop.z, 0x38bdf8, 16, 7.5);
        spawnGroundWeapon(prop.x, prop.z, undefined, rollRarity(true));
        spawnXpGem(prop.x + 0.8, prop.z, 30);
      } else if (prop.kind === 'crystal_cluster' || prop.kind === 'statue') {
        soundEngine.playMagicNova();
        spawnParticles(prop.x, 1.3, prop.z, 0xa855f7, 18, 7.5);
        spawnParticles(prop.x, 1.0, prop.z, 0xfacc15, 14, 6.5);
        spawnXpGem(prop.x + 0.5, prop.z, 32);
        spawnXpGem(prop.x - 0.5, prop.z, 32);
        if (Math.random() < 0.65) {
          spawnGroundWeapon(prop.x, prop.z, undefined, rollRarity(true));
        }
      } else if (prop.kind === 'cart' || prop.kind === 'phone_booth') {
        soundEngine.playHit('wood', true);
        spawnParticles(prop.x, 1.0, prop.z, 0xef4444, 14, 6.5);
        spawnParticles(prop.x, 0.7, prop.z, 0xfacc15, 12, 6.0);
        spawnGroundWeapon(prop.x, prop.z);
        spawnXpGem(prop.x, prop.z, 22);
      } else if (
        prop.kind === 'tree' ||
        prop.kind === 'cactus' ||
        prop.kind === 'snowman'
      ) {
        soundEngine.playHit('wood');
        spawnParticles(
          prop.x,
          1.8,
          prop.z,
          prop.kind === 'snowman' ? 0xf8fafc : 0x22c55e,
          16,
          6.5
        );
        spawnXpGem(prop.x, prop.z, 18);
        if (Math.random() < 0.35) {
          spawnGroundWeapon(prop.x, prop.z, 'baseball_bat');
        }
      } else if (prop.kind === 'street_sign' || prop.kind === 'streetlight') {
        soundEngine.playHit('metal');
        spawnParticles(prop.x, 1.4, prop.z, 0xfacc15, 12, 6.0);
        spawnXpGem(prop.x, prop.z, 16);
        if (Math.random() < 0.5) {
          spawnGroundWeapon(prop.x, prop.z, 'road_sign');
        }
      } else {
        soundEngine.playHit('wood');
        spawnParticles(prop.x, 0.8, prop.z, 0xd97706, 12, 5.5);
        spawnGroundWeapon(prop.x, prop.z);
        sim.hp = Math.min(sim.maxHp, sim.hp + 12);
      }
    };

    // Perform Melee Attack + Proc Skills!
    const performAttack = () => {
      if (
        sim.attackCooldownTimer > 0 ||
        sim.deathAnimTimer > 0 ||
        phaseRef.current !== 'playing'
      )
        return;

      const effDamageMult = getEffectiveDamageMult();
      const w = sim.weapon;
      const baseDamage = w ? w.damage : 18;
      const totalDamage = Math.round(baseDamage * effDamageMult);
      const range = (w ? w.range : 2.5) * sim.rangeMult;
      const arcAngle = (w ? w.arcAngle : Math.PI * 0.7) * sim.rangeMult;
      const cooldown =
        (w ? w.cooldown : 0.32) / Math.max(0.5, sim.attackSpeedMult);
      const knockback = (w ? w.knockback : 5.0) * effDamageMult;
      const soundType = w ? w.soundType : 'fist';

      sim.attackCooldownTimer = cooldown;
      sim.swingAnimDuration = Math.min(0.26, cooldown * 0.85);
      sim.swingAnimTimer = sim.swingAnimDuration;
      sim.hitCount += 1;

      soundEngine.playSwing(soundType);

      // Show 3D Slash Arc
      slashMesh.position.set(sim.playerX, 0.85, sim.playerZ);
      slashMesh.rotation.y = sim.facingAngle - Math.PI / 2;
      slashMesh.scale.setScalar(range / 3.2);
      slashMat.color.setHex(
        isBerserkActive()
          ? 0xff1122
          : w
          ? RARITY_CONFIG[w.rarity].hex
          : 0xf8fafc
      );
      slashMat.opacity = 0.75;
      slashMesh.visible = true;

      const forwardX = Math.sin(sim.facingAngle);
      const forwardZ = Math.cos(sim.facingAngle);
      const cosHalfArc = Math.cos(arcAngle * 0.5);

      let hitAnything = false;

      for (let i = zombies.length - 1; i >= 0; i--) {
        const zb = zombies[i];
        if (!zb) continue;
        const dx = zb.x - sim.playerX;
        const dz = zb.z - sim.playerZ;
        const dist = Math.hypot(dx, dz);
        if (dist <= range + zb.radius) {
          const ndx = dx / (dist || 1);
          const ndz = dz / (dist || 1);
          const dot = ndx * forwardX + ndz * forwardZ;
          if (dot >= cosHalfArc || dist < 1.35) {
            hitAnything = true;
            const isLastHit = w ? w.durability === 1 : false;
            const isCrit = Math.random() < getMetaBonuses().critChance;
            const critMult = isCrit ? 2.0 : 1.0;
            const finalDmg = Math.round(
              totalDamage * (isLastHit ? 1.75 : 1.0) * critMult
            );
            if (isCrit) {
              spawnParticles(zb.x, 1.35, zb.z, 0xfde047, 10, 8.5);
            }
            damageZombie(i, finalDmg, ndx, ndz, knockback);
          }
        }
      }

      for (let i = destructibles.length - 1; i >= 0; i--) {
        const prop = destructibles[i];
        if (!prop) continue;
        const dx = prop.x - sim.playerX;
        const dz = prop.z - sim.playerZ;
        const dist = Math.hypot(dx, dz);
        if (dist <= range + prop.radius) {
          const ndx = dx / (dist || 1);
          const ndz = dz / (dist || 1);
          const dot = ndx * forwardX + ndz * forwardZ;
          if (dot >= cosHalfArc || dist < prop.radius + 0.85) {
            hitAnything = true;
            prop.hp -= totalDamage;
            prop.hitFlashTimer = 0.12;
            spawnParticles(prop.x, 0.9, prop.z, 0xfbbf24, 5, 4.5);
            if (prop.hp <= 0) {
              destroyPropAt(i);
            }
          }
        }
      }

      // PROC SKILL 1: Chain Lightning (10th hit base; scales down to 7, 5, 4, 3, 2 hits with level!)
      const lightningInterval = getChainLightningCadence(sim.chainLightningLevel);
      if (sim.hitCount % lightningInterval === 0) {
        triggerChainLightning(sim.playerX, sim.playerZ);
      }

      // PROC SKILL 2: Fire Nova Ring (Scales cadence, radius, and damage with level!)
      if (sim.fireNovaLevel > 0) {
        const fireCadence = Math.max(3, 9 - sim.fireNovaLevel);
        if (sim.hitCount % fireCadence === 0) {
          soundEngine.playMagicNova();
          const fireRadius = 5.0 + sim.fireNovaLevel * 1.2;
          const fireDmg = Math.round(
            (45 + sim.fireNovaLevel * 32) * effDamageMult
          );
          triggerExplosion(
            sim.playerX,
            sim.playerZ,
            fireRadius,
            fireDmg,
            0xf97316,
            0xfde047
          );
        }
      }

      // PROC SKILL 3: Frost Nova Ring (Scales cadence, radius, slow, and damage with level!)
      if (sim.frostNovaLevel > 0) {
        const frostCadence = Math.max(3, 8 - sim.frostNovaLevel);
        if (sim.hitCount % frostCadence === 0) {
          soundEngine.playMagicNova();
          const frostRadius = 5.5 + sim.frostNovaLevel * 1.25;
          const frostDmg = Math.round(
            (34 + sim.frostNovaLevel * 26) * effDamageMult
          );
          triggerNovaWaveVisual(
            sim.playerX,
            sim.playerZ,
            0x22d3ee,
            frostRadius
          );
          for (let i = zombies.length - 1; i >= 0; i--) {
            const zb = zombies[i];
            if (!zb) continue;
            const d = Math.hypot(zb.x - sim.playerX, zb.z - sim.playerZ);
            if (d <= frostRadius) {
              zb.slowTimer = 3.0 + sim.frostNovaLevel * 0.7;
              damageZombie(i, frostDmg, 0, 0, 3.5);
            }
          }
        }
      }

      // PROC SKILL 4: Vampiric Strikes (Scales cadence, heal, and crimson wave damage!)
      if (sim.vampiricLevel > 0) {
        const vampCadence = Math.max(3, 11 - sim.vampiricLevel * 2);
        if (sim.hitCount % vampCadence === 0) {
          soundEngine.playMagicNova();
          const healAmt = 10 + sim.vampiricLevel * 6;
          const vampDmg = Math.round(
            (38 + sim.vampiricLevel * 26) * effDamageMult
          );
          sim.hp = Math.min(sim.maxHp, sim.hp + healAmt);
          triggerNovaWaveVisual(sim.playerX, sim.playerZ, 0xf43f5e, 5.4);
          for (let i = zombies.length - 1; i >= 0; i--) {
            const zb = zombies[i];
            if (!zb) continue;
            const d = Math.hypot(zb.x - sim.playerX, zb.z - sim.playerZ);
            if (d <= 5.4) {
              damageZombie(i, vampDmg, 0, 0, 4);
            }
          }
        }
      }

      if (hitAnything) {
        soundEngine.playHit(soundType, w?.durability === 1);
        sim.hitstopTimer = w ? w.heavyHitstop : 0.025;
        sim.shakeIntensity = Math.max(
          sim.shakeIntensity,
          w ? w.heavyHitstop * 5 : 0.14
        );

        if (w) {
          sim.weaponUsageCount[w.name] =
            (sim.weaponUsageCount[w.name] || 0) + 1;
          w.durability -= 1;
          if (w.durability <= 0) {
            soundEngine.playWeaponBreak();
            spawnParticles(
              sim.playerX + forwardX * 1.2,
              1.1,
              sim.playerZ + forwardZ * 1.2,
              RARITY_CONFIG[w.rarity].hex,
              14,
              7.5
            );
            if (sim.shatterBlastLevel > 0) {
              triggerExplosion(
                sim.playerX,
                sim.playerZ,
                4.8 + sim.shatterBlastLevel * 0.6,
                Math.round(
                  (140 + sim.shatterBlastLevel * 75) * effDamageMult
                )
              );
            }
            sim.weapon = null;
            equipWeaponVisual(null);
          }
        }
      }
    };

    const pickupGroundWeaponAt = (index: number) => {
      const gw = groundWeapons[index];
      if (!gw) return;
      itemsRoot.remove(gw.mesh);
      itemsRoot.remove(gw.ringMesh);
      groundWeapons.splice(index, 1);

      sim.weapon = gw.weapon;
      equipWeaponVisual(sim.weapon);
      soundEngine.playPickup(
        gw.weapon.rarity === 'epic' || gw.weapon.rarity === 'legendary'
      );
      syncHud(true);
    };

    const heldKeys = new Set<string>();

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const code = e.code;
      heldKeys.add(code);

      if (code === 'Space') {
        e.preventDefault();
        if (phaseRef.current === 'title') {
          startNewGame();
        } else if (phaseRef.current === 'playing') {
          performAttack();
        }
      } else if (code === 'Enter' && phaseRef.current === 'title') {
        e.preventDefault();
        startNewGame();
      } else if (code === 'KeyE' && phaseRef.current === 'playing') {
        tryPickupNearby();
      } else if (code === 'Escape') {
        if (phaseRef.current === 'playing' || phaseRef.current === 'paused') {
          togglePause();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      heldKeys.delete(e.code);
    };

    const onBlur = () => {
      heldKeys.clear();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    const tryPickupNearby = () => {
      let bestIdx = -1;
      let bestDist = 2.8;
      for (let i = 0; i < groundWeapons.length; i++) {
        const d = Math.hypot(
          groundWeapons[i].x - sim.playerX,
          groundWeapons[i].z - sim.playerZ
        );
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      if (bestIdx !== -1) {
        pickupGroundWeaponAt(bestIdx);
      }
    };

    const startNewGame = (customStartStage?: number) => {
      for (const z of zombies) enemiesRoot.remove(z.rig.root);
      zombies.length = 0;
      for (const gw of groundWeapons) {
        itemsRoot.remove(gw.mesh);
        itemsRoot.remove(gw.ringMesh);
      }
      groundWeapons.length = 0;
      for (const d of destructibles) destructiblesRoot.remove(d.mesh);
      destructibles.length = 0;
      for (const chunk of chunks.values()) chunksRoot.remove(chunk.group);
      chunks.clear();
      for (const g of xpGems) {
        g.active = false;
        g.mesh.visible = false;
      }
      for (const ep of enemyProjectiles) {
        ep.active = false;
        ep.mesh.visible = false;
      }
      hideAllBossTelegraphs();

      const startStage = Math.max(
        1,
        customStartStage ??
          metaProgressionRef.current?.selectedCheckpoint ??
          1
      );
      const startBiomeIdx = (startStage - 1) % BIOMES.length;
      const startBiome = BIOMES[startBiomeIdx];
      const metaB = getMetaBonuses();

      sim.playerX = 0;
      sim.playerZ = 0;
      sim.playerVx = 0;
      sim.playerVz = 0;
      sim.facingAngle = 0;
      sim.maxHp = 130 + metaB.bonusHp;
      sim.hp = sim.maxHp;
      sim.xp = 0;
      sim.xpToNext = 260;
      sim.level = 1;
      sim.stageNumber = startStage;
      sim.stageTime = 0;
      sim.stageTransitionTimer = 0;
      sim.stageTransitionSwapped = false;
      sim.stageAnnouncement =
        startStage > 1
          ? `ЧЕКПОИНТ · ЭТАП ${startStage} · ${startBiome.name.toUpperCase()}`
          : `УРОВЕНЬ 1 · ${startBiome.name.toUpperCase()}`;
      sim.stageAnnouncementTimer = 3.5;
      sim.score = 0;
      sim.kills = 0;
      sim.bossesDefeated = startStage - 1;
      sim.elapsedTime = 0;
      sim.nextBossTimer = BOSS_INTERVAL;
      sim.biomeIndex = startBiomeIdx;
      sim.comboCount = 0;
      sim.hitCount = 0;
      sim.activePerks = [];
      sim.perkLevels = {};
      sim.levelUpChoices = [];
      sim.damageMult = 1.0;
      sim.durabilityMult = 1.0;
      sim.speedMult = 1.0;
      sim.rangeMult = 1.0;
      sim.attackSpeedMult = 1.0;
      sim.shatterBlastLevel = 0;
      sim.chainLightningLevel = 0;
      sim.fireNovaLevel = 0;
      sim.frostNovaLevel = 0;
      sim.orbitBladesLevel = 0;
      sim.orbitBladesCount = 0;
      rebuildOrbitBlades(0);
      sim.meteorStrikeLevel = 0;
      sim.vampiricLevel = 0;
      sim.luckBonus = 0;
      sim.magnetRadius = 5.5;
      sim.weaponUsageCount = {};
      sim.waveSurgeTimer = 20;
      sim.enemySpawnTimer = 1.0;
      sim.wasBerserk = false;
      sim.deathAnimTimer = 0;
      sim.deathKickTimer = 0;
      sim.runCoins = 0;
      berserkAuraMesh.visible = false;
      orbitBladesGroup.visible = true;
      setHeroRedGlow(0);

      applyBiomePalette(startBiomeIdx, true);
      heroRig.root.position.set(0, 0, 0);
      heroRig.root.rotation.set(0, 0, 0);
      heroRig.bodyGroup.position.set(0, 0, 0);

      // Apply Starting Weapon from Meta-Progression ("Стартовый арсенал")
      const startRarityMap: Record<number, WeaponRarity> = {
        1: 'common',
        2: 'rare',
        3: 'epic',
        4: 'legendary',
      };
      if (metaB.startWeaponTier > 0) {
        sim.weapon = createWeaponInstance(
          undefined,
          startRarityMap[metaB.startWeaponTier] || 'common'
        );
      } else {
        sim.weapon = createWeaponInstance('frying_pan', 'common');
      }
      equipWeaponVisual(sim.weapon);

      spawnGroundWeapon(4.2, 3.2, 'baseball_bat', 'rare');
      spawnGroundWeapon(-4.8, 2.5, 'electric_guitar', 'epic');
      spawnGroundWeapon(0, -5.5, 'sledgehammer', 'rare');
      spawnDestructible(5.8, -3.5, 'cart', '0,0');
      spawnDestructible(-6.2, -4.5, 'barrel', '0,0');
      spawnDestructible(7.5, 5.2, 'fountain', '0,0');

      // Start gently with 4 initial monsters at the edges of the square arena
      for (let i = 0; i < 4; i++) {
        spawnZombie(false, 20 + i * 2.5);
      }

      phaseRef.current = 'playing';
      syncHud(true);
    };

    const resumeSavedGame = (saved: SavedRunState) => {
      for (const z of zombies) enemiesRoot.remove(z.rig.root);
      zombies.length = 0;
      for (const gw of groundWeapons) {
        itemsRoot.remove(gw.mesh);
        itemsRoot.remove(gw.ringMesh);
      }
      groundWeapons.length = 0;
      for (const d of destructibles) destructiblesRoot.remove(d.mesh);
      destructibles.length = 0;
      for (const chunk of chunks.values()) chunksRoot.remove(chunk.group);
      chunks.clear();
      for (const g of xpGems) {
        g.active = false;
        g.mesh.visible = false;
      }
      for (const ep of enemyProjectiles) {
        ep.active = false;
        ep.mesh.visible = false;
      }
      hideAllBossTelegraphs();

      sim.playerX = 0;
      sim.playerZ = 0;
      sim.playerVx = 0;
      sim.playerVz = 0;
      sim.facingAngle = 0;
      sim.hp = Math.max(25, saved.hp || 130);
      sim.maxHp = saved.maxHp || 130;
      sim.xp = saved.xp || 0;
      sim.xpToNext = saved.xpToNext || 260;
      sim.level = saved.level || 1;
      sim.stageNumber = saved.stageNumber || 1;
      sim.stageTime = 0;
      sim.stageTransitionTimer = 0;
      sim.stageTransitionSwapped = false;
      sim.wasBerserk = false;
      sim.deathAnimTimer = 0;
      sim.deathKickTimer = 0;
      berserkAuraMesh.visible = false;
      orbitBladesGroup.visible = true;
      setHeroRedGlow(0);
      sim.score = saved.score || 0;
      sim.kills = saved.kills || 0;
      sim.bossesDefeated = saved.bossesDefeated || 0;
      sim.elapsedTime = saved.elapsedTime || 0;
      sim.nextBossTimer = Math.max(15, saved.nextBossTimer || BOSS_INTERVAL);
      sim.biomeIndex = saved.biomeIndex || 0;
      sim.comboCount = 0;
      sim.hitCount = saved.hitCount || 0;
      sim.activePerks = Array.isArray(saved.activePerks)
        ? [...saved.activePerks]
        : [];
      sim.perkLevels = saved.perkLevels ? { ...saved.perkLevels } : {};
      sim.levelUpChoices = [];
      sim.weaponUsageCount = saved.weaponUsageCount
        ? { ...saved.weaponUsageCount }
        : {};
      sim.waveSurgeTimer = 20;
      sim.enemySpawnTimer = 1.0;

      // Recompute cumulative perk multipliers from saved perkLevels
      const pLvls = sim.perkLevels;
      sim.chainLightningLevel = pLvls['chain_lightning'] || 0;
      sim.fireNovaLevel = pLvls['fire_nova'] || 0;
      sim.frostNovaLevel = pLvls['frost_nova'] || 0;
      sim.orbitBladesLevel = pLvls['orbit_blades'] || 0;
      sim.orbitBladesCount =
        sim.orbitBladesLevel > 0 ? 1 + sim.orbitBladesLevel : 0;
      rebuildOrbitBlades(sim.orbitBladesCount);
      sim.meteorStrikeLevel = pLvls['meteor_strike'] || 0;
      sim.vampiricLevel = pLvls['vampiric_strikes'] || 0;
      sim.durabilityMult = 1 + (pLvls['iron_grip'] || 0) * 0.45;
      sim.damageMult = 1 + (pLvls['heavy_swing'] || 0) * 0.3;
      sim.speedMult = 1 + (pLvls['turbo_sneakers'] || 0) * 0.18;
      sim.rangeMult = 1 + (pLvls['whirlwind_reach'] || 0) * 0.22;
      sim.shatterBlastLevel = pLvls['shatter_blast'] || 0;

      const bName = BIOMES[sim.biomeIndex % BIOMES.length].name.toUpperCase();
      sim.stageAnnouncement = `ПРОДОЛЖЕНИЕ · ${bName}`;
      sim.stageAnnouncementTimer = 3.2;

      applyBiomePalette(sim.biomeIndex, true);
      heroRig.root.position.set(0, 0, 0);
      heroRig.root.rotation.set(0, 0, 0);
      heroRig.bodyGroup.position.set(0, 0, 0);

      sim.weapon =
        saved.weapon || createWeaponInstance('frying_pan', 'rare');
      equipWeaponVisual(sim.weapon);

      spawnGroundWeapon(4.2, 3.2, 'baseball_bat', 'rare');
      spawnGroundWeapon(-4.8, 2.5, 'electric_guitar', 'epic');

      for (let i = 0; i < 4; i++) {
        spawnZombie(false, 20 + i * 2.5);
      }

      phaseRef.current = 'playing';
      syncHud(true);
    };

    const selectPerk = (perkId: string) => {
      sim.activePerks.push(perkId);
      const nextLvl = (sim.perkLevels[perkId] || 0) + 1;
      sim.perkLevels[perkId] = nextLvl;

      if (perkId === 'chain_lightning') {
        sim.chainLightningLevel = nextLvl;
      } else if (perkId === 'fire_nova') {
        sim.fireNovaLevel = nextLvl;
      } else if (perkId === 'frost_nova') {
        sim.frostNovaLevel = nextLvl;
      } else if (perkId === 'orbit_blades') {
        sim.orbitBladesLevel = nextLvl;
        sim.orbitBladesCount = 1 + nextLvl;
        rebuildOrbitBlades(sim.orbitBladesCount);
      } else if (perkId === 'meteor_strike') {
        sim.meteorStrikeLevel = nextLvl;
      } else if (perkId === 'vampiric_strikes') {
        sim.vampiricLevel = nextLvl;
      } else if (perkId === 'iron_grip') {
        sim.durabilityMult = 1 + nextLvl * 0.45;
        if (sim.weapon) {
          sim.weapon.maxDurability = Math.round(
            sim.weapon.maxDurability * 1.45
          );
          sim.weapon.durability = sim.weapon.maxDurability;
        }
      } else if (perkId === 'heavy_swing') {
        sim.damageMult = 1 + nextLvl * 0.3;
      } else if (perkId === 'turbo_sneakers') {
        sim.speedMult = 1 + nextLvl * 0.18;
      } else if (perkId === 'whirlwind_reach') {
        sim.rangeMult = 1 + nextLvl * 0.22;
      } else if (perkId === 'shatter_blast') {
        sim.shatterBlastLevel = nextLvl;
      } else if (perkId === 'titan_vitality') {
        sim.maxHp += 55;
        sim.hp = Math.min(sim.maxHp, sim.hp + 70);
      }

      sim.levelUpChoices = [];
      phaseRef.current = 'playing';
      soundEngine.playPickup(true);
      syncHud(true);
    };

    const togglePause = () => {
      if (phaseRef.current === 'playing') {
        phaseRef.current = 'paused';
      } else if (phaseRef.current === 'paused') {
        phaseRef.current = 'playing';
      }
      syncHud(true);
    };

    const setTouchMove = (dx: number, dz: number) => {
      sim.touchMoveX = dx;
      sim.touchMoveZ = dz;
    };

    registerActions({
      startNewGame,
      resumeSavedGame,
      selectPerk,
      togglePause,
      manualAttack: performAttack,
      pickupNearby: tryPickupNearby,
      setTouchMove,
    });

    const getFavoriteWeapon = () => {
      let best = 'Чугунная сковорода';
      let max = -1;
      for (const [k, v] of Object.entries(sim.weaponUsageCount)) {
        if (v > max) {
          max = v;
          best = k;
        }
      }
      return best;
    };

    const syncHud = (force = false) => {
      if (!force && sim.hudSyncTimer < 0.08) return;
      sim.hudSyncTimer = 0;

      // Save or clear persistent run progress
      if (phaseRef.current === 'gameover' || sim.deathAnimTimer > 0) {
        onSaveRunRef.current?.(null);
      } else if (
        (phaseRef.current === 'playing' ||
          phaseRef.current === 'paused' ||
          phaseRef.current === 'levelup') &&
        (force || sim.saveRunTimer >= 2.2)
      ) {
        sim.saveRunTimer = 0;
        onSaveRunRef.current?.({
          hp: Math.max(1, Math.ceil(sim.hp)),
          maxHp: sim.maxHp,
          xp: Math.floor(sim.xp),
          xpToNext: sim.xpToNext,
          level: sim.level,
          stageNumber: sim.stageNumber,
          score: sim.score,
          kills: sim.kills,
          bossesDefeated: sim.bossesDefeated,
          elapsedTime: sim.elapsedTime,
          nextBossTimer: sim.nextBossTimer,
          biomeIndex: sim.biomeIndex,
          weapon: sim.weapon ? { ...sim.weapon } : null,
          perkLevels: { ...sim.perkLevels },
          activePerks: [...sim.activePerks],
          hitCount: sim.hitCount,
          weaponUsageCount: { ...sim.weaponUsageCount },
          savedAt: Date.now(),
        });
      }

      const bossEntity = zombies.find((z) => z.variant === 'boss');
      const activeBoss = bossEntity
        ? {
            name: bossEntity.isGrandBoss
              ? `ВЛАДЫКА ДЕСЯТКИ: ${BOSS_ARCHETYPES[bossEntity.bossIndex].name}`
              : BOSS_ARCHETYPES[bossEntity.bossIndex].name,
            subtitle: BOSS_ARCHETYPES[bossEntity.bossIndex].subtitle,
            hp: Math.max(0, Math.ceil(bossEntity.hp)),
            maxHp: bossEntity.maxHp,
            phase: bossEntity.bossPhase,
            isGrandBoss: Boolean(bossEntity.isGrandBoss),
            phaseLabel:
              bossEntity.bossPhase === 3
                ? 'СТАДИЯ 3/3 · БЕРСЕРК!'
                : bossEntity.bossPhase === 2
                ? 'СТАДИЯ 2/3 · ЯРОСТЬ!'
                : 'СТАДИЯ 1/3 · НАТИСК',
          }
        : null;

      let nearbyItem = null;
      let minDist = 3.2;
      for (const gw of groundWeapons) {
        const d = Math.hypot(gw.x - sim.playerX, gw.z - sim.playerZ);
        if (d < minDist) {
          minDist = d;
          nearbyItem = {
            name: gw.weapon.name,
            rarity: gw.weapon.rarity,
            damage: Math.round(gw.weapon.damage * getEffectiveDamageMult()),
          };
        }
      }

      onHudUpdateRef.current({
        phase: phaseRef.current,
        hp: Math.max(0, Math.ceil(sim.hp)),
        maxHp: sim.maxHp,
        xp: Math.floor(sim.xp),
        xpToNext: sim.xpToNext,
        level: sim.level,
        stageNumber: sim.stageNumber,
        stageAnnouncement: sim.stageAnnouncement,
        stageTransitionProgress:
          sim.stageTransitionTimer > 0
            ? Math.sin((1 - sim.stageTransitionTimer / 1.5) * Math.PI)
            : 0,
        isBerserk: isBerserkActive(),
        deathTimer: Math.max(0, sim.deathAnimTimer),
        score: sim.score,
        kills: sim.kills,
        bossesDefeated: sim.bossesDefeated,
        elapsedTime: sim.elapsedTime,
        nextBossIn: Math.max(0, Math.ceil(sim.nextBossTimer)),
        biomeIndex: sim.biomeIndex,
        weapon: sim.weapon ? { ...sim.weapon } : null,
        nearbyItem,
        activeBoss,
        autoAttack: autoAttackRef.current,
        comboCount: sim.comboCount,
        hitCount: sim.hitCount,
        activePerks: [...sim.activePerks],
        perkLevels: { ...sim.perkLevels },
        levelUpChoices: sim.levelUpChoices,
        favoriteWeaponName: getFavoriteWeapon(),
        runCoins: sim.runCoins,
      });
    };

    const triggerDeathBeatdown = () => {
      if (sim.deathAnimTimer > 0) return;
      sim.hp = 0;
      sim.deathAnimTimer = 5.0;
      sim.deathKickTimer = 0.1;
      sim.playerVx = 0;
      sim.playerVz = 0;
      sim.wasBerserk = false;
      berserkAuraMesh.visible = false;
      slashMesh.visible = false;
      orbitBladesGroup.visible = false;
      hideAllBossTelegraphs();
      setHeroRedGlow(0);

      for (const ep of enemyProjectiles) {
        ep.active = false;
        ep.mesh.visible = false;
      }

      // Ensure a full crowd of at least 10 monsters surrounds the fallen hero to kick them!
      const needed = Math.max(0, 10 - zombies.length);
      for (let k = 0; k < needed; k++) {
        const a = (k / Math.max(1, needed)) * Math.PI * 2;
        spawnZombie(
          false,
          undefined,
          k % 2 === 0 ? 'runner' : 'walker',
          sim.playerX + Math.cos(a) * 2.8,
          sim.playerZ + Math.sin(a) * 2.8
        );
      }

      // Pull far monsters closer so the crowd forms immediately around the fallen player
      for (let i = 0; i < zombies.length; i++) {
        const zb = zombies[i];
        if (!zb) continue;
        const d = Math.hypot(zb.x - sim.playerX, zb.z - sim.playerZ);
        if (d > 5.0) {
          const a = (i / Math.max(1, zombies.length)) * Math.PI * 2;
          zb.x = clampToArena(sim.playerX + Math.cos(a) * 3.0, 1.4);
          zb.z = clampToArena(sim.playerZ + Math.sin(a) * 3.0, 1.4);
        }
      }

      soundEngine.playPlayerHurt();
      sim.shakeIntensity = 0.45;
      syncHud(true);
    };

    updateChunksAroundPlayer();
    sim.weapon = createWeaponInstance('frying_pan', 'epic');
    equipWeaponVisual(sim.weapon);
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const clock = new THREE.Clock();
    let frameId = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      sim.hudSyncTimer += dt;

      if (phaseRef.current === 'title') {
        sim.walkCycle += dt * 3.2;
        heroRig.root.position.set(0, 0, 0);
        heroRig.root.rotation.y = Math.sin(sim.walkCycle * 0.35) * 0.48;
        heroRig.bodyGroup.position.y =
          Math.abs(Math.sin(sim.walkCycle)) * 0.04;
        heroRig.rightArm.rotation.x =
          -0.35 + Math.sin(sim.walkCycle * 0.8) * 0.12;
        heroRig.leftArm.rotation.x = Math.sin(sim.walkCycle * 0.8) * 0.1;
        if (heroRig.tailPivot) {
          heroRig.tailPivot.rotation.y = Math.sin(sim.walkCycle * 1.4) * 0.38;
          heroRig.tailPivot.rotation.x = Math.cos(sim.walkCycle * 0.9) * 0.12;
        }

        const isPortrait = camera.aspect < 1.05;
        if (isPortrait) {
          // Center the full hero (ears to shoes) cleanly between the top logo and the bottom card
          _camTargetPos.set(
            Math.sin(sim.walkCycle * 0.28) * 1.15,
            1.95,
            6.35
          );
          camera.position.lerp(_camTargetPos, 1 - Math.exp(-5 * dt));
          _camLookAt.set(0, 0.32, 0);
          camera.lookAt(_camLookAt);
        } else {
          // On landscape / desktop, frame the full hero on the right side while the compact menu sits on the left/bottom
          _camTargetPos.set(
            Math.sin(sim.walkCycle * 0.22) * 1.6 - 1.15,
            1.95,
            5.65
          );
          camera.position.lerp(_camTargetPos, 1 - Math.exp(-5 * dt));
          _camLookAt.set(-1.05, 0.62, 0);
          camera.lookAt(_camLookAt);
        }
      } else if (phaseRef.current === 'playing') {
        if (sim.hitstopTimer > 0) {
          sim.hitstopTimer -= dt;
        } else if (sim.deathAnimTimer > 0) {
          // ==================== 5-SECOND DEATH ANIMATION: CROWD OF MONSTERS KICKING FALLEN HERO ====================
          sim.elapsedTime += dt;
          sim.deathAnimTimer -= dt;
          sim.deathKickTimer -= dt;

          // Fallen Hero on the ground getting jolted by kicks
          heroRig.root.position.set(sim.playerX, 0.28, sim.playerZ);
          heroRig.root.rotation.x = -Math.PI * 0.46;
          heroRig.root.rotation.z = Math.sin(sim.elapsedTime * 26) * 0.22;
          heroRig.root.rotation.y += dt * 1.2;

          heroRig.bodyGroup.position.set(
            Math.sin(sim.elapsedTime * 38) * 0.14,
            Math.abs(Math.sin(sim.elapsedTime * 28)) * 0.18,
            0
          );
          heroRig.leftArm.rotation.x = -0.8 + Math.sin(sim.elapsedTime * 22) * 0.55;
          heroRig.rightArm.rotation.x = -0.8 - Math.sin(sim.elapsedTime * 22) * 0.55;
          heroRig.leftLeg.rotation.x = Math.sin(sim.elapsedTime * 19) * 0.45;
          heroRig.rightLeg.rotation.x = -Math.sin(sim.elapsedTime * 19) * 0.45;

          // Periodic kick impact sound, flash & particles
          if (sim.deathKickTimer <= 0) {
            sim.deathKickTimer = 0.18;
            soundEngine.playHit('fist', false);
            if (Math.random() < 0.35) {
              soundEngine.playPlayerHurt();
            }
            sim.shakeIntensity = 0.24;
            setHeroRedGlow(0.85, 0xff2233);
            spawnParticles(
              sim.playerX + (Math.random() - 0.5) * 0.9,
              0.45,
              sim.playerZ + (Math.random() - 0.5) * 0.9,
              Math.random() > 0.45 ? 0xfacc15 : 0xef4444,
              6,
              5.8
            );
          } else if (sim.deathKickTimer < 0.09) {
            setHeroRedGlow(0);
          }

          // Crowd of monsters gathers in a tight circle around the fallen hero and kicks with their feet!
          const totalMob = Math.max(1, zombies.length);
          for (let i = 0; i < zombies.length; i++) {
            const zb = zombies[i];
            if (!zb) continue;
            const ringAngle = (i / totalMob) * Math.PI * 2 + sim.elapsedTime * 0.3;
            const ringRadius = 1.18 + zb.radius * 0.55;
            const targetX = sim.playerX + Math.cos(ringAngle) * ringRadius;
            const targetZ = sim.playerZ + Math.sin(ringAngle) * ringRadius;

            zb.x = THREE.MathUtils.damp(zb.x, targetX, 8, dt);
            zb.z = THREE.MathUtils.damp(zb.z, targetZ, 8, dt);
            zb.rig.root.position.set(zb.x, 0, zb.z);
            zb.rig.root.rotation.y = Math.atan2(
              sim.playerX - zb.x,
              sim.playerZ - zb.z
            );

            // Fast alternating leg kicks directed at the fallen player
            zb.walkPhase += dt * 21;
            const kickWave = Math.sin(zb.walkPhase + i * 0.9);
            if (kickWave > 0) {
              // Kick left leg forward & up
              zb.rig.leftLeg.rotation.x = -kickWave * 1.48;
              zb.rig.rightLeg.rotation.x = 0.18;
            } else {
              // Kick right leg forward & up
              zb.rig.rightLeg.rotation.x = kickWave * 1.48;
              zb.rig.leftLeg.rotation.x = 0.18;
            }
            zb.rig.bodyGroup.position.y = Math.abs(kickWave) * 0.14;
            zb.rig.leftArm.rotation.x = -0.65 + kickWave * 0.45;
            zb.rig.rightArm.rotation.x = -0.65 - kickWave * 0.45;
          }

          // Update Pooled Particles & Nova Waves during death beatdown
          for (const nw of novaWaves) {
            if (!nw.active) continue;
            nw.life += dt;
            if (nw.life >= nw.maxLife) {
              nw.active = false;
              nw.mesh.visible = false;
              continue;
            }
            const p = nw.life / nw.maxLife;
            nw.mesh.scale.setScalar(0.5 + p * nw.maxScale);
            nw.mat.opacity = (1 - p) * 0.85;
          }

          for (const p of particles) {
            if (!p.active) continue;
            p.life += dt;
            if (p.life >= p.maxLife) {
              p.active = false;
              p.mesh.visible = false;
              continue;
            }
            p.vy -= 14 * dt;
            p.mesh.position.x += p.vx * dt;
            p.mesh.position.y = Math.max(0.08, p.mesh.position.y + p.vy * dt);
            p.mesh.position.z += p.vz * dt;
            const s = (1 - p.life / p.maxLife) * 0.95;
            p.mesh.scale.setScalar(s);
          }

          // Zoomed-in dramatic camera on the mob kicking the hero
          if (sim.shakeIntensity > 0) {
            sim.shakeIntensity = Math.max(0, sim.shakeIntensity - dt * 2.2);
          }
          const shakeX = (Math.random() - 0.5) * sim.shakeIntensity;
          const shakeZ = (Math.random() - 0.5) * sim.shakeIntensity;
          const portraitZoom =
            camera.aspect < 0.85
              ? Math.min(1.32, Math.max(1.0, 0.86 / Math.max(0.45, camera.aspect)))
              : 1.0;

          _camTargetPos.set(
            sim.playerX + shakeX,
            11.2 * portraitZoom,
            sim.playerZ + 10.2 * portraitZoom + shakeZ
          );
          camera.position.lerp(_camTargetPos, 1 - Math.exp(-6 * dt));
          _camLookAt.set(sim.playerX + shakeX, 0.45, sim.playerZ + shakeZ);
          camera.lookAt(_camLookAt);

          syncHud(false);

          if (sim.deathAnimTimer <= 0) {
            sim.deathAnimTimer = 0;
            setHeroRedGlow(0);
            heroRig.root.rotation.set(0, 0, 0);
            heroRig.bodyGroup.position.set(0, 0, 0);
            orbitBladesGroup.visible = true;
            phaseRef.current = 'gameover';
            syncHud(true);
          }
        } else {
          sim.elapsedTime += dt;
          sim.saveRunTimer += dt;

          // Passive HP Regeneration from Meta-Progression ("Живая кровь")
          const hpRegen = getMetaBonuses().hpRegenPerSec;
          if (hpRegen > 0 && sim.hp > 0 && sim.hp < sim.maxHp) {
            sim.hp = Math.min(sim.maxHp, sim.hp + hpRegen * dt);
          }

          // "ВЖУХ!" Stage Transition Animation (Portal Warp to Fresh Level)
          if (sim.stageTransitionTimer > 0) {
            sim.stageTransitionTimer = Math.max(0, sim.stageTransitionTimer - dt);
            heroRig.root.rotation.y += dt * 16;
            spawnParticles(
              sim.playerX + (Math.random() - 0.5) * 4,
              1.2,
              sim.playerZ + (Math.random() - 0.5) * 4,
              0x38bdf8,
              2,
              8
            );

            if (sim.stageTransitionTimer <= 0.75 && !sim.stageTransitionSwapped) {
              sim.stageTransitionSwapped = true;
              sim.stageNumber += 1;
              sim.biomeIndex = (sim.biomeIndex + 1) % BIOMES.length;
              const newBiome = BIOMES[sim.biomeIndex];

              // Clear old ground weapons and teleport hero to center of new bounded square arena
              for (const gw of groundWeapons) {
                itemsRoot.remove(gw.mesh);
                itemsRoot.remove(gw.ringMesh);
              }
              groundWeapons.length = 0;

              sim.playerX = 0;
              sim.playerZ = 0;
              sim.playerVx = 0;
              sim.playerVz = 0;
              sim.stageTime = 0;
              sim.nextBossTimer = BOSS_INTERVAL;
              sim.enemySpawnTimer = 1.2;
              sim.waveSurgeTimer = 20;

              applyBiomePalette(sim.biomeIndex, true);
              heroRig.root.position.set(0, 0, 0);

              sim.hp = Math.min(sim.maxHp, sim.hp + 55);
              spawnGroundWeapon(0, -4.2, undefined, 'legendary');
              spawnGroundWeapon(4.5, 2.8, undefined, 'epic');

              // Start the new level freshly with just 3 monsters that ramp up over time
              for (let i = 0; i < 3; i++) {
                spawnZombie(false, 22 + i * 2);
              }

              triggerNovaWaveVisual(0, 0, 0x38bdf8, 15);
              spawnParticles(0, 1.5, 0, 0xfacc15, 28, 10);

              sim.stageAnnouncement = `УРОВЕНЬ ${sim.stageNumber} · ${newBiome.name.toUpperCase()}`;
              sim.stageAnnouncementTimer = 4.2;
              camera.position.set(0, 28, 25);
            }
          } else {
            sim.stageTime += dt;
          }

          if (sim.stageAnnouncementTimer > 0) {
            sim.stageAnnouncementTimer -= dt;
            if (sim.stageAnnouncementTimer <= 0) {
              sim.stageAnnouncement = null;
            }
          }

          if (lightningTimer > 0) {
            lightningTimer -= dt;
            lightningMat.opacity = Math.max(0, lightningTimer / 0.24);
            if (lightningTimer <= 0) lightningLine.visible = false;
          }

          if (sim.comboResetTimer > 0) {
            sim.comboResetTimer -= dt;
            if (sim.comboResetTimer <= 0) sim.comboCount = 0;
          }

          // Boss Spawn Timer & Gradual Wave Spawner (paused during whoosh transition)
          if (sim.stageTransitionTimer <= 0) {
            const hasBossAlive = zombies.some((z) => z.variant === 'boss');
            if (!hasBossAlive) {
              sim.nextBossTimer -= dt;
              if (sim.nextBossTimer <= 0) {
                sim.nextBossTimer = BOSS_INTERVAL;
                spawnZombie(true);
              }
            }

            // Gradual Stage Monster Spawner: starts slow & small on each level, ramps up over stageTime!
            sim.enemySpawnTimer -= dt;
            if (sim.enemySpawnTimer <= 0) {
              const spawnInterval = Math.max(
                0.32,
                1.15 - sim.stageTime * 0.012
              );
              sim.enemySpawnTimer = spawnInterval;
              const packCount =
                sim.stageTime > 44
                  ? 4
                  : sim.stageTime > 28
                  ? 3
                  : sim.stageTime > 12
                  ? 2
                  : 1;
              for (let k = 0; k < packCount; k++) {
                spawnZombie(false);
              }
            }

            sim.waveSurgeTimer -= dt;
            if (sim.waveSurgeTimer <= 0) {
              sim.waveSurgeTimer = 19;
              const surgeCount = Math.min(10, 4 + Math.floor(sim.stageTime / 12));
              for (let k = 0; k < surgeCount; k++) {
                spawnZombie(false, 18 + (k % 4) * 2);
              }
            }
          }

          // Meteor Strike Skill (`meteor_strike` perk — fires `meteorStrikeLevel` meteors!)
          if (sim.meteorStrikeLevel > 0 && zombies.length > 0) {
            sim.meteorTimer -= dt;
            if (sim.meteorTimer <= 0) {
              sim.meteorTimer = Math.max(
                1.6,
                5.0 - sim.meteorStrikeLevel * 0.65
              );
              const meteorDmg = Math.round(
                (95 + sim.meteorStrikeLevel * 45) * getEffectiveDamageMult()
              );
              const meteorRadius = 3.8 + sim.meteorStrikeLevel * 0.45;
              const volleyCount = Math.min(
                sim.meteorStrikeLevel,
                zombies.length
              );
              for (let v = 0; v < volleyCount; v++) {
                const randZombie =
                  zombies[Math.floor(Math.random() * zombies.length)];
                if (randZombie) {
                  triggerExplosion(
                    randZombie.x,
                    randZombie.z,
                    meteorRadius,
                    meteorDmg,
                    0xef4444,
                    0xfacc15
                  );
                }
              }
            }
          }

          // Orbiting Energy Blades (`orbit_blades` perk — scales blade count, spin speed, and damage!)
          if (sim.orbitBladesCount > 0) {
            orbitBladesGroup.position.set(sim.playerX, 0.95, sim.playerZ);
            const spinSpeed = 4.5 + sim.orbitBladesLevel * 0.85;
            orbitBladesGroup.rotation.y += dt * spinSpeed;
            sim.orbitDamageCooldown -= dt;
            if (sim.orbitDamageCooldown <= 0) {
              sim.orbitDamageCooldown = 0.2;
              const bladeDmg = Math.round(
                (24 + sim.orbitBladesLevel * 14) * getEffectiveDamageMult()
              );
              for (const bMesh of bladeMeshes) {
                bMesh.getWorldPosition(_bladeWorldPos);
                for (let i = zombies.length - 1; i >= 0; i--) {
                  const zb = zombies[i];
                  if (!zb) continue;
                  if (
                    Math.hypot(
                      zb.x - _bladeWorldPos.x,
                      zb.z - _bladeWorldPos.z
                    ) <
                    1.05 + zb.radius
                  ) {
                    damageZombie(i, bladeDmg, 0, 0, 3.8);
                  }
                }
              }
            }
          }

          // 360° WASD + Mobile Touch Finger Drag Movement (+50% speed in Berserk Mode!)
          let moveX = sim.touchMoveX;
          let moveZ = sim.touchMoveZ;
          if (heldKeys.has('KeyW') || heldKeys.has('ArrowUp')) moveZ -= 1;
          if (heldKeys.has('KeyS') || heldKeys.has('ArrowDown')) moveZ += 1;
          if (heldKeys.has('KeyA') || heldKeys.has('ArrowLeft')) moveX -= 1;
          if (heldKeys.has('KeyD') || heldKeys.has('ArrowRight')) moveX += 1;

          const moveLen = Math.hypot(moveX, moveZ);
          const maxSpeed = 8.8 * getEffectiveSpeedMult();
          if (moveLen > 0.04) {
            const clampedLen = Math.min(1, moveLen);
            moveX = (moveX / moveLen) * clampedLen;
            moveZ = (moveZ / moveLen) * clampedLen;
            const targetAngle = Math.atan2(moveX, moveZ);
            let diff = targetAngle - sim.facingAngle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            sim.facingAngle += diff * (1 - Math.exp(-16 * dt));
          } else {
            moveX = 0;
            moveZ = 0;
          }

          sim.playerVx = THREE.MathUtils.damp(
            sim.playerVx,
            moveX * maxSpeed,
            12,
            dt
          );
          sim.playerVz = THREE.MathUtils.damp(
            sim.playerVz,
            moveZ * maxSpeed,
            12,
            dt
          );

          sim.playerX += sim.playerVx * dt;
          sim.playerZ += sim.playerVz * dt;

          // Collide softly with destructible props
          for (const prop of destructibles) {
            const dx = sim.playerX - prop.x;
            const dz = sim.playerZ - prop.z;
            const dist = Math.hypot(dx, dz);
            const minSep = 0.52 + prop.radius;
            if (dist < minSep && dist > 0.001) {
              const push = (minSep - dist) / dist;
              sim.playerX += dx * push;
              sim.playerZ += dz * push;
            }
            if (prop.hitFlashTimer > 0) {
              prop.hitFlashTimer -= dt;
              const wobble = 1 + Math.sin(prop.hitFlashTimer * 50) * 0.12;
              prop.mesh.scale.set(wobble, 1 / wobble, wobble);
            } else {
              prop.mesh.scale.setScalar(1);
            }
          }

          // Clamp player inside bounded square arena
          sim.playerX = clampToArena(sim.playerX, 1.25);
          sim.playerZ = clampToArena(sim.playerZ, 1.25);

          updateChunksAroundPlayer();

          heroRig.root.position.set(sim.playerX, 0, sim.playerZ);
          heroRig.root.rotation.x = 0;
          heroRig.root.rotation.z = 0;
          if (sim.stageTransitionTimer <= 0) {
            heroRig.root.rotation.y = sim.facingAngle;
          }

          // ==================== BERSERK MODE (< 20% HP): RED GLOW + AURA + +50% DAMAGE & SPEED ====================
          const berserkNow = isBerserkActive();
          if (berserkNow) {
            if (!sim.wasBerserk) {
              sim.wasBerserk = true;
              soundEngine.playMagicNova();
              triggerNovaWaveVisual(sim.playerX, sim.playerZ, 0xff1122, 7.5);
              spawnParticles(sim.playerX, 1.1, sim.playerZ, 0xff1122, 22, 8.5);
            }
            const redPulse = 0.58 + Math.sin(sim.elapsedTime * 15) * 0.32;
            setHeroRedGlow(redPulse, 0xff1122);
            berserkAuraMesh.visible = true;
            berserkAuraMesh.position.set(sim.playerX, 0.06, sim.playerZ);
            berserkAuraMesh.scale.setScalar(
              1.0 + Math.sin(sim.elapsedTime * 14) * 0.18
            );
            berserkAuraMat.opacity = 0.55 + Math.sin(sim.elapsedTime * 14) * 0.25;
            if (Math.random() < 0.45) {
              spawnParticles(
                sim.playerX + (Math.random() - 0.5) * 0.9,
                0.55,
                sim.playerZ + (Math.random() - 0.5) * 0.9,
                0xff1122,
                1,
                3.8
              );
            }
          } else if (sim.wasBerserk) {
            sim.wasBerserk = false;
            berserkAuraMesh.visible = false;
            setHeroRedGlow(0);
          }

          const speedMag = Math.hypot(sim.playerVx, sim.playerVz);
          if (speedMag > 0.4) {
            sim.walkCycle += dt * speedMag * 1.65;
            const swing = Math.sin(sim.walkCycle) * 0.65;
            heroRig.leftLeg.rotation.x = swing;
            heroRig.rightLeg.rotation.x = -swing;
            heroRig.leftArm.rotation.x = -swing * 0.7;
            heroRig.bodyGroup.position.y =
              Math.abs(Math.sin(sim.walkCycle * 2)) * 0.07;
            if (heroRig.tailPivot) {
              heroRig.tailPivot.rotation.y = Math.sin(sim.walkCycle * 1.2) * 0.45;
              heroRig.tailPivot.rotation.x = 0.15 + Math.cos(sim.walkCycle * 2) * 0.12;
            }
          } else {
            heroRig.leftLeg.rotation.x = THREE.MathUtils.damp(
              heroRig.leftLeg.rotation.x,
              0,
              10,
              dt
            );
            heroRig.rightLeg.rotation.x = THREE.MathUtils.damp(
              heroRig.rightLeg.rotation.x,
              0,
              10,
              dt
            );
            heroRig.leftArm.rotation.x = THREE.MathUtils.damp(
              heroRig.leftArm.rotation.x,
              0,
              10,
              dt
            );
            heroRig.bodyGroup.position.y = THREE.MathUtils.damp(
              heroRig.bodyGroup.position.y,
              0,
              10,
              dt
            );
            if (heroRig.tailPivot) {
              heroRig.tailPivot.rotation.y = Math.sin(sim.elapsedTime * 3.0) * 0.25;
            }
          }

          if (sim.attackCooldownTimer > 0) {
            sim.attackCooldownTimer -= dt;
          }

          if (sim.swingAnimTimer > 0) {
            sim.swingAnimTimer -= dt;
            const p = 1 - sim.swingAnimTimer / sim.swingAnimDuration;
            heroRig.rightArm.rotation.x = -1.35 + Math.sin(p * Math.PI) * 1.1;
            heroRig.rightArm.rotation.y = -0.9 + p * 1.9;
            slashMat.opacity = Math.max(0, (1 - p) * 0.75);
            if (sim.swingAnimTimer <= 0) {
              slashMesh.visible = false;
              heroRig.rightArm.rotation.y = 0;
            }
          } else {
            heroRig.rightArm.rotation.x = THREE.MathUtils.damp(
              heroRig.rightArm.rotation.x,
              -0.35,
              10,
              dt
            );
            heroRig.rightArm.rotation.y = THREE.MathUtils.damp(
              heroRig.rightArm.rotation.y,
              0,
              10,
              dt
            );
          }

          if (sim.weaponPickupCooldown > 0) {
            sim.weaponPickupCooldown -= dt;
          }

          for (let i = groundWeapons.length - 1; i >= 0; i--) {
            const gw = groundWeapons[i];
            if (!gw) continue;
            gw.bobPhase += dt * 3;
            gw.mesh.position.y = 0.52 + Math.sin(gw.bobPhase) * 0.12;
            gw.mesh.rotation.y += dt * 1.8;

            const dist = Math.hypot(gw.x - sim.playerX, gw.z - sim.playerZ);
            if (dist < 1.85) {
              if (!sim.weapon) {
                sim.weaponPickupCooldown = 0.6;
                pickupGroundWeaponAt(i);
              } else if (
                autoPickupRef.current &&
                sim.weaponPickupCooldown <= 0
              ) {
                const curRank = RARITY_RANK[sim.weapon.rarity];
                const newRank = RARITY_RANK[gw.weapon.rarity];
                const curDurRatio =
                  sim.weapon.durability / sim.weapon.maxDurability;
                const isUpgrade =
                  newRank > curRank ||
                  (newRank === curRank &&
                    gw.weapon.damage > sim.weapon.damage) ||
                  (curDurRatio <= 0.45 && newRank >= curRank - 1);
                if (isUpgrade) {
                  sim.weaponPickupCooldown = 0.75;
                  pickupGroundWeaponAt(i);
                }
              }
            }
          }

          // Auto-attack
          if (autoAttackRef.current && sim.attackCooldownTimer <= 0) {
            const checkRange =
              (sim.weapon ? sim.weapon.range : 2.4) * sim.rangeMult * 0.92;
            let shouldSwing = false;
            for (const zb of zombies) {
              if (!zb) continue;
              if (
                Math.hypot(zb.x - sim.playerX, zb.z - sim.playerZ) <=
                checkRange + zb.radius
              ) {
                shouldSwing = true;
                break;
              }
            }
            if (!shouldSwing) {
              const forwardX = Math.sin(sim.facingAngle);
              const forwardZ = Math.cos(sim.facingAngle);
              for (const prop of destructibles) {
                if (!prop) continue;
                const dx = prop.x - sim.playerX;
                const dz = prop.z - sim.playerZ;
                const d = Math.hypot(dx, dz);
                if (d <= checkRange * 0.78 + prop.radius) {
                  const dot =
                    (dx / (d || 1)) * forwardX + (dz / (d || 1)) * forwardZ;
                  if (dot > 0.45) {
                    shouldSwing = true;
                    break;
                  }
                }
              }
            }
            if (shouldSwing) performAttack();
          }

          // Update Zombies, Special Monsters (Spitter, Necromancer, Bomber) & 3-Phase Bosses
          let activeBossTelegraphShown = false;
          for (let i = zombies.length - 1; i >= 0; i--) {
            const zb = zombies[i];
            if (!zb) continue;
            const dx = sim.playerX - zb.x;
            const dz = sim.playerZ - zb.z;
            const dist = Math.hypot(dx, dz) || 0.001;

            if (dist > 46 && zb.variant !== 'boss') {
              const respawnAngle =
                sim.facingAngle + (Math.random() - 0.5) * Math.PI * 1.2;
              zb.x = sim.playerX + Math.sin(respawnAngle) * 20;
              zb.z = sim.playerZ + Math.cos(respawnAngle) * 20;
              zb.rig.root.position.set(zb.x, 0, zb.z);
              continue;
            }

            if (zb.hitFlashTimer > 0) {
              zb.hitFlashTimer -= dt;
              if (zb.hitFlashTimer <= 0) {
                for (const m of zb.rig.materialsToFlash) {
                  m.emissive.setHex(zb.slowTimer > 0 ? 0x0284c7 : 0x000000);
                  m.emissiveIntensity = zb.slowTimer > 0 ? 0.5 : 0;
                }
              }
            }

            if (zb.slowTimer > 0) {
              zb.slowTimer -= dt;
            }

            // Spitter Monster: fires acid projectiles at the player from range!
            if (zb.variant === 'spitter') {
              zb.specialAbilityTimer -= dt;
              if (zb.specialAbilityTimer <= 0 && dist < 14 && dist > 3.5) {
                zb.specialAbilityTimer = 2.8;
                const projSpeed = 10.5;
                spawnEnemyProjectile(
                  zb.x,
                  zb.z,
                  (dx / dist) * projSpeed,
                  (dz / dist) * projSpeed,
                  12
                );
              }
            }

            // Necromancer Monster: summons mini_skeleton minions!
            if (zb.variant === 'necromancer') {
              zb.specialAbilityTimer -= dt;
              if (zb.specialAbilityTimer <= 0 && dist < 17) {
                zb.specialAbilityTimer = 5.5;
                spawnParticles(zb.x, 1.4, zb.z, 0x22d3ee, 10, 5);
                for (let m = 0; m < 2; m++) {
                  spawnZombie(
                    false,
                    undefined,
                    'mini_skeleton',
                    zb.x + (m === 0 ? -1.4 : 1.4),
                    zb.z + 1.0
                  );
                }
              }
            }

            // Multi-Phase Boss Skill State Machine (Phases 1, 2, 3)
            if (zb.variant === 'boss') {
              if (zb.telegraphTimer > 0) {
                activeBossTelegraphShown = true;
                zb.telegraphTimer -= dt;
                const progress = 1 - zb.telegraphTimer / zb.telegraphMax;
                telegraphRingMat.opacity = 0.28 + progress * 0.55;

                if (zb.telegraphPattern === 'charge') {
                  telegraphLineMesh.visible = true;
                  telegraphLineMesh.position.set(zb.x, 0.06, zb.z);
                  telegraphLineMesh.rotation.z = -Math.atan2(
                    zb.telegraphDirX,
                    zb.telegraphDirZ
                  );
                } else if (zb.telegraphPattern === 'cross_beams') {
                  crossTelegraphGroup.visible = true;
                  crossTelegraphGroup.position.set(zb.x, 0.06, zb.z);
                } else if (zb.telegraphPattern === 'meteor_rain') {
                  for (let m = 0; m < meteorCircleMeshes.length; m++) {
                    const target = zb.meteorTargets[m];
                    if (target) {
                      meteorCircleMeshes[m].visible = true;
                      meteorCircleMeshes[m].position.set(
                        target.x,
                        0.06,
                        target.z
                      );
                    }
                  }
                } else {
                  telegraphRingMesh.visible = true;
                  telegraphRingMesh.position.set(zb.x, 0.06, zb.z);
                }

                if (zb.telegraphTimer <= 0) {
                  hideAllBossTelegraphs();

                  if (zb.telegraphPattern === 'charge') {
                    zb.vx = zb.telegraphDirX * 28;
                    zb.vz = zb.telegraphDirZ * 28;
                    soundEngine.playSwing('heavy');
                  } else if (zb.telegraphPattern === 'cross_beams') {
                    // Phase 2: 4-Way Cross Laser Explosion + 5-Projectile Fan!
                    soundEngine.playExplosion();
                    sim.shakeIntensity = 0.5;
                    spawnParticles(zb.x, 0.8, zb.z, 0xa855f7, 24, 10);
                    if (
                      Math.abs(sim.playerX - zb.x) < 1.35 ||
                      Math.abs(sim.playerZ - zb.z) < 1.35
                    ) {
                      if (dist < 12) {
                        const dmgMult = 1 - getMetaBonuses().damageReduction;
                        sim.hp -= 24 * dmgMult;
                        soundEngine.playPlayerHurt();
                        if (sim.hp <= 0) {
                          triggerDeathBeatdown();
                        }
                      }
                    }
                    const baseAngle = Math.atan2(dx, dz);
                    for (let f = -2; f <= 2; f++) {
                      const a = baseAngle + f * 0.26;
                      spawnEnemyProjectile(
                        zb.x,
                        zb.z,
                        Math.sin(a) * 11.5,
                        Math.cos(a) * 11.5,
                        16
                      );
                    }
                  } else if (zb.telegraphPattern === 'meteor_rain') {
                    // Phase 3: Detonate 3 Meteor Circles + 8-Way Radial Bullet Ring!
                    soundEngine.playExplosion();
                    sim.shakeIntensity = 0.6;
                    for (const t of zb.meteorTargets) {
                      if (!t) continue;
                      triggerNovaWaveVisual(t.x, t.z, 0xef4444, 3.4);
                      spawnParticles(t.x, 0.6, t.z, 0xef4444, 14, 8);
                      if (
                        Math.hypot(sim.playerX - t.x, sim.playerZ - t.z) < 3.3
                      ) {
                        const dmgMult = 1 - getMetaBonuses().damageReduction;
                        sim.hp -= 22 * dmgMult;
                        soundEngine.playPlayerHurt();
                        if (sim.hp <= 0) {
                          triggerDeathBeatdown();
                        }
                      }
                    }
                    for (let r = 0; r < 8; r++) {
                      const a = (r / 8) * Math.PI * 2;
                      spawnEnemyProjectile(
                        zb.x,
                        zb.z,
                        Math.sin(a) * 10.5,
                        Math.cos(a) * 10.5,
                        16
                      );
                    }
                  } else {
                    // Slam
                    soundEngine.playExplosion();
                    sim.shakeIntensity = 0.5;
                    triggerNovaWaveVisual(zb.x, zb.z, 0xef4444, 5.4);
                    spawnParticles(zb.x, 0.5, zb.z, 0xef4444, 22, 9);
                    if (dist < 5.4) {
                      const dmgMult = 1 - getMetaBonuses().damageReduction;
                      sim.hp -= 25 * dmgMult;
                      soundEngine.playPlayerHurt();
                      if (sim.hp <= 0) {
                        triggerDeathBeatdown();
                      }
                    }
                  }

                  zb.attackCooldown =
                    zb.bossPhase === 3 ? 2.4 : zb.bossPhase === 2 ? 2.9 : 3.5;
                }
              } else {
                zb.attackCooldown -= dt;
                if (zb.attackCooldown <= 0 && dist < 14) {
                  zb.telegraphMax = zb.bossPhase === 3 ? 1.15 : 1.35;
                  zb.telegraphTimer = zb.telegraphMax;
                  zb.telegraphDirX = dx / dist;
                  zb.telegraphDirZ = dz / dist;

                  // Pick attack pattern based on Boss Phase!
                  if (zb.bossPhase === 3) {
                    zb.telegraphPattern =
                      Math.random() < 0.6 ? 'meteor_rain' : 'cross_beams';
                    zb.meteorTargets = [
                      { x: sim.playerX, z: sim.playerZ },
                      {
                        x: sim.playerX + (Math.random() - 0.5) * 8,
                        z: sim.playerZ + (Math.random() - 0.5) * 8,
                      },
                      {
                        x: sim.playerX + (Math.random() - 0.5) * 8,
                        z: sim.playerZ + (Math.random() - 0.5) * 8,
                      },
                    ];
                  } else if (zb.bossPhase === 2) {
                    zb.telegraphPattern =
                      Math.random() < 0.65 ? 'cross_beams' : 'charge';
                  } else {
                    zb.telegraphPattern =
                      Math.random() < 0.5 ? 'slam' : 'charge';
                  }
                }
              }
            }

            const slowMult = zb.slowTimer > 0 ? 0.45 : 1.0;
            const moveFactor =
              zb.telegraphTimer > 0
                ? 0.12
                : zb.variant === 'spitter' && dist < 7.5
                ? 0.25
                : 1.0;
            const targetVx = (dx / dist) * zb.speed * moveFactor * slowMult;
            const targetVz = (dz / dist) * zb.speed * moveFactor * slowMult;

            zb.vx = THREE.MathUtils.damp(zb.vx, targetVx, 6, dt);
            zb.vz = THREE.MathUtils.damp(zb.vz, targetVz, 6, dt);

            const maxJ = Math.min(i, zombies.length);
            for (let j = Math.max(0, i - 14); j < maxJ; j++) {
              const other = zombies[j];
              if (!other) continue;
              const sdx = zb.x - other.x;
              const sdz = zb.z - other.z;
              const sDist = Math.hypot(sdx, sdz);
              const minSep = zb.radius + other.radius;
              if (sDist < minSep && sDist > 0.01) {
                const push = ((minSep - sDist) / sDist) * 4.5 * dt;
                zb.x += sdx * push;
                zb.z += sdz * push;
                other.x -= sdx * push;
                other.z -= sdz * push;
              }
            }

            zb.x = clampToArena(zb.x + zb.vx * dt, 1.25);
            zb.z = clampToArena(zb.z + zb.vz * dt, 1.25);

            zb.rig.root.position.set(zb.x, 0, zb.z);
            zb.rig.root.rotation.y = Math.atan2(dx, dz);

            zb.walkPhase += dt * zb.speed * slowMult * 2.1;
            const zSwing = Math.sin(zb.walkPhase) * 0.55;
            zb.rig.leftLeg.rotation.x = zSwing;
            zb.rig.rightLeg.rotation.x = -zSwing;
            zb.rig.leftArm.rotation.x = Math.sin(zb.walkPhase * 1.5) * 0.18;
            zb.rig.rightArm.rotation.x = -Math.sin(zb.walkPhase * 1.5) * 0.18;

            const hitDist = 0.55 + zb.radius;
            if (dist < hitDist) {
              const dmgMult = 1 - getMetaBonuses().damageReduction;
              sim.hp -= zb.damage * dmgMult * dt * 1.45;
              if (Math.random() < 0.08) {
                soundEngine.playPlayerHurt();
                sim.shakeIntensity = Math.max(sim.shakeIntensity, 0.22);
              }
              if (sim.hp <= 0) {
                triggerDeathBeatdown();
                break;
              }
            }
          }

          if (!activeBossTelegraphShown) {
            hideAllBossTelegraphs();
          }

          // Update Enemy Projectiles (Dodgeable Orbs!)
          for (const ep of enemyProjectiles) {
            if (!ep.active) continue;
            ep.life -= dt;
            if (ep.life <= 0) {
              ep.active = false;
              ep.mesh.visible = false;
              continue;
            }
            ep.x += ep.vx * dt;
            ep.z += ep.vz * dt;
            ep.mesh.position.set(ep.x, 0.9, ep.z);

            const dToPlayer = Math.hypot(
              ep.x - sim.playerX,
              ep.z - sim.playerZ
            );
            if (dToPlayer < 0.75) {
              ep.active = false;
              ep.mesh.visible = false;
              const dmgMult = 1 - getMetaBonuses().damageReduction;
              sim.hp -= ep.damage * dmgMult;
              soundEngine.playPlayerHurt();
              sim.shakeIntensity = Math.max(sim.shakeIntensity, 0.25);
              spawnParticles(sim.playerX, 1.0, sim.playerZ, 0xd946ef, 8, 5);
              if (sim.hp <= 0) {
                triggerDeathBeatdown();
                break;
              }
            }
          }

          // Update Nova Waves
          for (const nw of novaWaves) {
            if (!nw.active) continue;
            nw.life += dt;
            if (nw.life >= nw.maxLife) {
              nw.active = false;
              nw.mesh.visible = false;
              continue;
            }
            const p = nw.life / nw.maxLife;
            nw.mesh.scale.setScalar(0.5 + p * nw.maxScale);
            nw.mat.opacity = (1 - p) * 0.85;
          }

          // Update XP Gems (with Meta XP Multiplier!)
          for (const g of xpGems) {
            if (!g.active) continue;
            g.mesh.rotation.y += dt * 3;
            const dx = sim.playerX - g.x;
            const dz = sim.playerZ - g.z;
            const dist = Math.hypot(dx, dz);
            if (dist < sim.magnetRadius) {
              const pullSpeed = 15.5;
              g.x += (dx / (dist || 1)) * pullSpeed * dt;
              g.z += (dz / (dist || 1)) * pullSpeed * dt;
              g.mesh.position.set(g.x, 0.45, g.z);
              if (dist < 0.9) {
                g.active = false;
                g.mesh.visible = false;
                soundEngine.playXpGem();
                sim.xp += Math.round(g.value * getMetaBonuses().xpMult);
                if (sim.xp >= sim.xpToNext) {
                  sim.xp -= sim.xpToNext;
                  sim.level += 1;
                  sim.xpToNext = Math.round(sim.xpToNext * 1.55 + 85);
                  onMetaEventRef.current?.({ levelReached: sim.level });
                  triggerLevelUpModal();
                }
              }
            }
          }

          // Update Pooled Particles
          for (const p of particles) {
            if (!p.active) continue;
            p.life += dt;
            if (p.life >= p.maxLife) {
              p.active = false;
              p.mesh.visible = false;
              continue;
            }
            p.vy -= 14 * dt;
            p.mesh.position.x += p.vx * dt;
            p.mesh.position.y = Math.max(0.08, p.mesh.position.y + p.vy * dt);
            p.mesh.position.z += p.vz * dt;
            const s = (1 - p.life / p.maxLife) * 0.95;
            p.mesh.scale.setScalar(s);
          }

          // Isometric Chase Camera (with 1:1 screen-aligned X/Z axes & Portrait Zoom Adaptation)
          if (sim.shakeIntensity > 0) {
            sim.shakeIntensity = Math.max(0, sim.shakeIntensity - dt * 2.2);
          }
          const shakeX = (Math.random() - 0.5) * sim.shakeIntensity;
          const shakeZ = (Math.random() - 0.5) * sim.shakeIntensity;

          const portraitZoom =
            camera.aspect < 0.85
              ? Math.min(1.38, Math.max(1.0, 0.86 / Math.max(0.45, camera.aspect)))
              : 1.0;

          _camTargetPos.set(
            sim.playerX + shakeX,
            18.0 * portraitZoom,
            sim.playerZ + 16.5 * portraitZoom + shakeZ
          );
          camera.position.lerp(_camTargetPos, 1 - Math.exp(-8 * dt));
          _camLookAt.set(sim.playerX + shakeX, 0.8, sim.playerZ + shakeZ);
          camera.lookAt(_camLookAt);

          sunLight.position.set(sim.playerX + 18, 32, sim.playerZ + 16);
          sunLight.target.position.set(sim.playerX, 0, sim.playerZ);

          syncHud(false);
        }
      }

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 w-full h-full overflow-hidden z-0"
    />
  );
};
