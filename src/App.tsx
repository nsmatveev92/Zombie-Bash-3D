import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ACHIEVEMENTS_LIST,
  AchievementDef,
  BIOMES,
  CHARACTER_PRESETS,
  CharacterAppearance,
  DEFAULT_META_PROGRESSION,
  EarsType,
  GameHudState,
  getChainLightningCadence,
  getMetaUpgradeCost,
  META_UPGRADES,
  MetaProgressionState,
  MetaUpgradeId,
  MuzzleType,
  PERK_POOL,
  RARITY_CONFIG,
  SavedRunState,
  TailType,
} from './types/game';
import { GameCanvas, MetaGameplayEvent } from './three/GameCanvas';
import { soundEngine } from './audio/soundEngine';
import { SkillIcon } from './components/SkillIcon';

const STORAGE_KEY_APPEARANCE = 'zombie_bash_3d_appearance_v1';
const STORAGE_KEY_BEST_SCORE = 'zombie_bash_3d_best_score_v1';
const STORAGE_KEY_SAVED_RUN = 'zombie_bash_3d_saved_run_v1';
const STORAGE_KEY_META = 'zombie_bash_3d_meta_v1';

const INITIAL_HUD: GameHudState = {
  phase: 'title',
  hp: 130,
  maxHp: 130,
  xp: 0,
  xpToNext: 260,
  level: 1,
  stageNumber: 1,
  stageAnnouncement: null,
  stageTransitionProgress: 0,
  isBerserk: false,
  deathTimer: 0,
  score: 0,
  kills: 0,
  bossesDefeated: 0,
  runCoins: 0,
  elapsedTime: 0,
  nextBossIn: 60,
  biomeIndex: 0,
  weapon: null,
  nearbyItem: null,
  activeBoss: null,
  autoAttack: true,
  comboCount: 0,
  hitCount: 0,
  activePerks: [],
  perkLevels: {},
  levelUpChoices: [],
  favoriteWeaponName: 'Чугунная сковорода',
};

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

interface TouchJoystickState {
  active: boolean;
  pointerId: number;
  originX: number;
  originY: number;
  knobX: number;
  knobY: number;
}

export default function App() {
  const [appearance, setAppearance] = useState<CharacterAppearance>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_APPEARANCE);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return CHARACTER_PRESETS[0];
  });

  const [promptInput, setPromptInput] = useState<string>(
    CHARACTER_PRESETS[0].prompt || ''
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [genError, setGenError] = useState<string | null>(null);

  const [hud, setHud] = useState<GameHudState>(INITIAL_HUD);
  const [autoAttack, setAutoAttack] = useState<boolean>(true);
  const [autoPickup, setAutoPickup] = useState<boolean>(true);
  const [muted, setMuted] = useState<boolean>(false);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [titleMinimized, setTitleMinimized] = useState<boolean>(false);
  const [titleTab, setTitleTab] = useState<
    'upgrades' | 'achievements' | 'ai' | 'parts' | 'presets'
  >('upgrades');
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [bestScore, setBestScore] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(STORAGE_KEY_BEST_SCORE)) || 0;
    } catch {
      return 0;
    }
  });
  const [savedRun, setSavedRun] = useState<SavedRunState | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SAVED_RUN);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SavedRunState;
      if (parsed && parsed.level >= 1 && parsed.hp > 0) return parsed;
    } catch {
      // ignore
    }
    return null;
  });

  // Meta-Progression (Coins, Upgrades, Checkpoints, Achievements)
  const [meta, setMeta] = useState<MetaProgressionState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_META);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<MetaProgressionState>;
        return {
          ...DEFAULT_META_PROGRESSION,
          ...parsed,
          upgradeLevels: {
            ...DEFAULT_META_PROGRESSION.upgradeLevels,
            ...(parsed.upgradeLevels || {}),
          },
          unlockedCheckpoints:
            Array.isArray(parsed.unlockedCheckpoints) &&
            parsed.unlockedCheckpoints.length > 0
              ? parsed.unlockedCheckpoints
              : [1],
          unlockedAchievements: Array.isArray(parsed.unlockedAchievements)
            ? parsed.unlockedAchievements
            : [],
          stats: {
            ...DEFAULT_META_PROGRESSION.stats,
            ...(parsed.stats || {}),
          },
        };
      }
    } catch {
      // ignore
    }
    return DEFAULT_META_PROGRESSION;
  });

  const [achievementToast, setAchievementToast] =
    useState<AchievementDef | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const persistMeta = useCallback((next: MetaProgressionState) => {
    try {
      localStorage.setItem(STORAGE_KEY_META, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const triggerAchievementToast = useCallback((ach: AchievementDef) => {
    setAchievementToast(ach);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setAchievementToast(null);
    }, 4500);
  }, []);

  const handleMetaEvent = useCallback(
    (event: MetaGameplayEvent) => {
      setMeta((prev) => {
        const addedCoins = event.coinsAdded || 0;
        let nextCoins = prev.coins + addedCoins;
        let nextTotalCoins = prev.totalCoinsEarned + Math.max(0, addedCoins);

        const nextStats = {
          totalKills: prev.stats.totalKills + (event.killsAdded || 0),
          totalPropsSmashed:
            prev.stats.totalPropsSmashed + (event.propsSmashedAdded || 0),
          berserkKills:
            prev.stats.berserkKills + (event.berserkKillsAdded || 0),
          bossesKilled:
            prev.stats.bossesKilled + (event.bossesKilledAdded || 0),
          grandBossesKilled:
            prev.stats.grandBossesKilled + (event.grandBossesKilledAdded || 0),
          highestStageCleared: Math.max(
            prev.stats.highestStageCleared,
            event.stageCleared || 0
          ),
          maxLevelReached: Math.max(
            prev.stats.maxLevelReached,
            event.levelReached || 1
          ),
        };

        const nextCheckpoints = [...prev.unlockedCheckpoints];
        let nextSelectedStage = prev.selectedCheckpoint;
        if (event.stageCleared && event.stageCleared % 10 === 0) {
          const unlockedStage = event.stageCleared + 1;
          if (!nextCheckpoints.includes(unlockedStage)) {
            nextCheckpoints.push(unlockedStage);
            nextCheckpoints.sort((a, b) => a - b);
            nextSelectedStage = unlockedStage;
          }
        }

        const nextUnlockedAch = [...prev.unlockedAchievements];
        let newlyUnlocked: AchievementDef | null = null;
        for (const ach of ACHIEVEMENTS_LIST) {
          if (!nextUnlockedAch.includes(ach.id)) {
            const currentVal =
              ach.statKey === 'totalCoinsEarned'
                ? nextTotalCoins
                : nextStats[ach.statKey];
            if (currentVal >= ach.targetValue) {
              nextUnlockedAch.push(ach.id);
              nextCoins += ach.coinReward;
              nextTotalCoins += ach.coinReward;
              newlyUnlocked = ach;
            }
          }
        }

        const nextState: MetaProgressionState = {
          ...prev,
          coins: nextCoins,
          totalCoinsEarned: nextTotalCoins,
          unlockedCheckpoints: nextCheckpoints,
          selectedCheckpoint: nextSelectedStage,
          unlockedAchievements: nextUnlockedAch,
          selectedTitleAchievementId:
            prev.selectedTitleAchievementId ||
            (newlyUnlocked ? newlyUnlocked.id : prev.selectedTitleAchievementId),
          stats: nextStats,
        };

        persistMeta(nextState);
        if (newlyUnlocked) {
          soundEngine.playLevelUp();
          setTimeout(() => triggerAchievementToast(newlyUnlocked!), 0);
        }
        return nextState;
      });
    },
    [persistMeta, triggerAchievementToast]
  );

  const handleBuyUpgrade = (upgradeId: MetaUpgradeId) => {
    const def = META_UPGRADES.find((u) => u.id === upgradeId);
    if (!def) return;
    const curLvl = meta.upgradeLevels[upgradeId] || 0;
    if (curLvl >= def.maxLevel) return;
    const cost = getMetaUpgradeCost(def, curLvl);
    if (meta.coins < cost) return;

    soundEngine.playPickup(true);
    setMeta((prev) => {
      const nextCoins = prev.coins - cost;
      const nextState: MetaProgressionState = {
        ...prev,
        coins: nextCoins,
        upgradeLevels: {
          ...prev.upgradeLevels,
          [upgradeId]: curLvl + 1,
        },
      };
      persistMeta(nextState);
      return nextState;
    });
  };

  const handleSelectCheckpoint = (stage: number) => {
    if (!meta.unlockedCheckpoints.includes(stage)) return;
    soundEngine.playPickup(false);
    setMeta((prev) => {
      const next = { ...prev, selectedCheckpoint: stage };
      persistMeta(next);
      return next;
    });
  };

  const handleSelectTitle = (achId: string) => {
    if (!meta.unlockedAchievements.includes(achId)) return;
    soundEngine.playPickup(false);
    setMeta((prev) => {
      const next = {
        ...prev,
        selectedTitleAchievementId:
          prev.selectedTitleAchievementId === achId ? null : achId,
      };
      persistMeta(next);
      return next;
    });
  };

  // Floating 360° Touch Joystick State
  const [joystick, setJoystick] = useState<TouchJoystickState | null>(null);
  const joystickRef = useRef<TouchJoystickState | null>(null);

  const actionsRef = useRef<{
    startNewGame: (startStage?: number) => void;
    resumeSavedGame: (saved: SavedRunState) => void;
    selectPerk: (perkId: string) => void;
    togglePause: () => void;
    manualAttack: () => void;
    pickupNearby: () => void;
    setTouchMove: (dx: number, dz: number) => void;
  } | null>(null);

  const handleSaveRun = (state: SavedRunState | null) => {
    setSavedRun(state);
    try {
      if (state) {
        localStorage.setItem(STORAGE_KEY_SAVED_RUN, JSON.stringify(state));
      } else {
        localStorage.removeItem(STORAGE_KEY_SAVED_RUN);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (hud.score > bestScore) {
      setBestScore(hud.score);
      try {
        localStorage.setItem(STORAGE_KEY_BEST_SCORE, String(hud.score));
      } catch {
        // ignore
      }
    }
  }, [hud.score, bestScore]);

  // Clear touch joystick whenever leaving 'playing' phase
  useEffect(() => {
    if (hud.phase !== 'playing') {
      joystickRef.current = null;
      setJoystick(null);
      actionsRef.current?.setTouchMove(0, 0);
    }
  }, [hud.phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'KeyH') {
        setDockCollapsed((prev) => !prev);
      }
    };
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    };
  }, []);

  const handleSaveAppearance = (next: CharacterAppearance) => {
    setAppearance(next);
    try {
      localStorage.setItem(STORAGE_KEY_APPEARANCE, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleGenerateAppearance = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = promptInput.trim();
    if (!trimmed || isGenerating) return;

    setIsGenerating(true);
    setGenError(null);

    const buildClientFallback = (text: string): CharacterAppearance => {
      const lower = text.toLowerCase();
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
      }
      const pick = <T,>(arr: readonly T[], off = 0): T =>
        arr[(hash + off) % arr.length];

      const shirt =
        /красн|ал/.test(lower)
          ? '#EF4444'
          : /син|голуб|бирюз|неон/.test(lower)
          ? '#06B6D4'
          : /зелен|хаки|изумруд/.test(lower)
          ? '#10B981'
          : /желт|золот|оранж/.test(lower)
          ? '#F59E0B'
          : /фиолет|пурпур/.test(lower)
          ? '#8B5CF6'
          : /розов/.test(lower)
          ? '#EC4899'
          : /бел/.test(lower)
          ? '#F8FAFC'
          : /черн|темн/.test(lower)
          ? '#1E293B'
          : pick(['#06B6D4', '#EF4444', '#8B5CF6', '#10B981', '#F59E0B', '#3B82F6'], 1);

      const hair =
        /розов/.test(lower)
          ? '#EC4899'
          : /зелен/.test(lower)
          ? '#22C55E'
          : /син|голуб/.test(lower)
          ? '#38BDF8'
          : /бел|сед/.test(lower)
          ? '#F1F5F9'
          : /рыж|огн/.test(lower)
          ? '#EA580C'
          : /желт|блонд|золот/.test(lower)
          ? '#FACC15'
          : pick(['#EC4899', '#F59E0B', '#38BDF8', '#78350F', '#1E293B', '#A855F7'], 2);

      const headgear = /ирокез|панк/.test(lower)
        ? 'mohawk'
        : /повар|колпак|шеф/.test(lower)
        ? 'chef_hat'
        : /корон|король|царь/.test(lower)
        ? 'crown'
        : /капюшон|ниндзя|маг|ассасин/.test(lower)
        ? 'hood'
        : /ковбой|шляп|шериф/.test(lower)
        ? 'cowboy_hat'
        : /шлем|рыцарь|солдат|космо|байкер|каск/.test(lower)
        ? 'helmet'
        : /кепк|бейсбол|скейт/.test(lower)
        ? 'cap'
        : pick(['mohawk', 'cap', 'helmet', 'hood', 'cowboy_hat', 'crown', 'chef_hat'] as const, 0);

      const eyewear = /визор|кибер|робот|лазер/.test(lower)
        ? 'visor'
        : /повязк|пират/.test(lower)
        ? 'eyepatch'
        : /гоггл|авиатор|стимпанк|учен/.test(lower)
        ? 'goggles'
        : /очк|темн|крут/.test(lower)
        ? 'sunglasses'
        : pick(['visor', 'sunglasses', 'goggles', 'none'] as const, 1);

      const backItem = /плащ|супер|герой|вампир/.test(lower)
        ? 'cape'
        : /гитар|рок|музыкант/.test(lower)
        ? 'guitar_case'
        : /ранец|джетпак|реактив|космо/.test(lower)
        ? 'jetpack'
        : /катан|меч|самурай|ниндзя/.test(lower)
        ? 'katana_sheath'
        : /рюкзак|сталкер|выжив|турист/.test(lower)
        ? 'backpack'
        : pick(['backpack', 'cape', 'jetpack', 'katana_sheath', 'guitar_case'] as const, 2);

      const facialHair = /бород|лесоруб|викинг|дед/.test(lower)
        ? 'beard'
        : /ус|усатый|шеф/.test(lower)
        ? 'mustache'
        : /маск|ниндзя|респиратор/.test(lower)
        ? 'mask'
        : 'none';

      const isFox = /лис|лисич|кицун|фенек|fox|kitsune/.test(lower);
      const isCat = /кот|котик|кошк|кошеч|нэко|неко|мяу|cat|neko|kitty/.test(lower);
      const isElephant = /слон|слоник|мамонт|хобот|elephant/.test(lower);
      const isCroc = /крокодил|аллигатор|рептил|динозавр|ящер|croc/.test(lower);
      const isLion = /лев|льв|тигр|симба|lion/.test(lower);
      const isFrog = /лягуш|жаб|пепе|квак|frog/.test(lower);
      const isShark = /акул|плавник|челюст|shark/.test(lower);
      const isDeer = /олен|лось|бэмби|рудольф|deer/.test(lower);
      const isWolf = /волк|волч|оборотен|пёс|пес|собак|хаски|wolf/.test(lower);
      const isBunny = /заяц|зайк|зайч|кролик|bunny|rabbit/.test(lower);
      const isBear = /медвед|мишк|панд|bear|panda/.test(lower);
      const isDemon = /демон|черт|чёрт|дьявол|рога|demon/.test(lower);

      const ears: EarsType = isFox
        ? 'fox_ears'
        : isCat
        ? 'cat_ears'
        : isElephant
        ? 'elephant_ears'
        : isCroc
        ? 'croc_ridge'
        : isLion
        ? 'lion_mane'
        : isFrog
        ? 'frog_eyes'
        : isShark
        ? 'shark_fin'
        : isDeer
        ? 'deer_antlers'
        : isWolf
        ? 'wolf_ears'
        : isBunny
        ? 'bunny_ears'
        : isBear
        ? 'bear_ears'
        : isDemon
        ? 'demon_horns'
        : /уши|ушки/.test(lower)
        ? 'cat_ears'
        : 'none';

      const tail: TailType = isFox
        ? 'fox_tail'
        : isCat
        ? 'cat_tail'
        : isElephant
        ? 'elephant_tail'
        : isCroc
        ? 'croc_tail'
        : isLion
        ? 'lion_tail'
        : isShark
        ? 'shark_tail'
        : isWolf
        ? 'wolf_tail'
        : isBunny || isBear || isDeer
        ? 'bunny_tail'
        : isDemon
        ? 'devil_tail'
        : /хвост|хвостик/.test(lower)
        ? ears === 'fox_ears'
          ? 'fox_tail'
          : 'cat_tail'
        : 'none';

      const muzzle: MuzzleType = isFox
        ? 'fox_muzzle'
        : isCat
        ? 'cat_muzzle'
        : isElephant
        ? 'elephant_trunk'
        : isCroc
        ? 'croc_snout'
        : isLion
        ? 'lion_muzzle'
        : isFrog
        ? 'frog_muzzle'
        : isShark
        ? 'shark_muzzle'
        : isDeer
        ? 'deer_muzzle'
        : isWolf || isBear
        ? 'wolf_muzzle'
        : isBunny
        ? 'bunny_muzzle'
        : 'none';

      const skin = isFox
        ? '#F97316'
        : isCat
        ? '#FB923C'
        : isElephant
        ? '#94A3B8'
        : isCroc
        ? '#16A34A'
        : isLion
        ? '#F59E0B'
        : isFrog
        ? '#22C55E'
        : isShark
        ? '#0284C7'
        : isDeer
        ? '#B45309'
        : isWolf
        ? '#64748B'
        : isBunny
        ? '#F8FAFC'
        : isBear
        ? '#92400E'
        : pick(['#F1C27D', '#FFDBAC', '#E0AC69', '#C68642'], 0);

      const words = text
        .replace(/[^a-zA-Zа-яА-ЯёЁ0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2);
      const rawName = words.slice(0, 2).join(' ') || 'Выживший';
      const name = rawName.charAt(0).toUpperCase() + rawName.slice(1).slice(0, 20);

      return {
        name,
        tagline: text.slice(0, 46),
        prompt: text,
        colors: {
          skin,
          shirt,
          pants: pick(['#1E293B', '#0F172A', '#334155', '#1E3A8A'], 3),
          shoes: pick(['#F43F5E', '#F59E0B', '#10B981', '#38BDF8'], 4),
          hair,
          accent: isFox
            ? '#FEF3C7'
            : isCat
            ? '#F472B6'
            : pick(['#FACC15', '#22D3EE', '#F43F5E', '#A3E635'], 5),
        },
        proportions: {
          heightScale: /высок|длинн|гигант/.test(lower)
            ? 1.18
            : /низк|карлик|гном|коренаст|котик/.test(lower)
            ? 0.92
            : 1.04,
          torsoWidth: /толст|широк|качок|здоровяк|мощн|крупн/.test(lower)
            ? 1.3
            : /худ|тонк|ловк|строй|лис|кот/.test(lower)
            ? 0.9
            : 1.02,
          headScale: ears !== 'none' ? 1.08 : 1.02,
          limbThickness: /толст|широк|качок|мощн/.test(lower) ? 1.22 : 0.95,
        },
        accessories: {
          headgear: ears !== 'none' ? 'none' : headgear,
          eyewear,
          backItem,
          facialHair,
          ears,
          tail,
          muzzle,
        },
      };
    };

    try {
      const res = await fetch('/api/character/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed }),
      });
      if (!res.ok) {
        throw new Error('Fallback');
      }
      const data = await res.json();
      const nextApp: CharacterAppearance = {
        name: data.name || 'Выживший',
        tagline: data.tagline || trimmed.slice(0, 42),
        prompt: trimmed,
        colors: {
          skin: data.colors?.skin || '#F1C27D',
          shirt: data.colors?.shirt || '#06B6D4',
          pants: data.colors?.pants || '#1E293B',
          shoes: data.colors?.shoes || '#F43F5E',
          hair: data.colors?.hair || '#EC4899',
          accent: data.colors?.accent || '#FACC15',
        },
        proportions: {
          heightScale: Math.min(
            1.25,
            Math.max(0.82, Number(data.proportions?.heightScale) || 1.0)
          ),
          torsoWidth: Math.min(
            1.4,
            Math.max(0.78, Number(data.proportions?.torsoWidth) || 1.0)
          ),
          headScale: Math.min(
            1.28,
            Math.max(0.85, Number(data.proportions?.headScale) || 1.0)
          ),
          limbThickness: Math.min(
            1.35,
            Math.max(0.8, Number(data.proportions?.limbThickness) || 1.0)
          ),
        },
        accessories: {
          headgear: data.accessories?.headgear || 'none',
          eyewear: data.accessories?.eyewear || 'none',
          backItem: data.accessories?.backItem || 'none',
          facialHair: data.accessories?.facialHair || 'none',
          ears: data.accessories?.ears || 'none',
          tail: data.accessories?.tail || 'none',
          muzzle: data.accessories?.muzzle || 'none',
        },
      };
      handleSaveAppearance(nextApp);
      soundEngine.playPickup(true);
    } catch {
      const fallbackApp = buildClientFallback(trimmed);
      handleSaveAppearance(fallbackApp);
      soundEngine.playPickup(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundEngine.muted = next;
  };

  // Floating 360° Touch / Pointer Steering Handlers
  const JOYSTICK_MAX_RADIUS = 52;

  const handleTouchZonePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (hud.phase !== 'playing') return;
    if (joystickRef.current && joystickRef.current.active) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    const state: TouchJoystickState = {
      active: true,
      pointerId: e.pointerId,
      originX: e.clientX,
      originY: e.clientY,
      knobX: e.clientX,
      knobY: e.clientY,
    };
    joystickRef.current = state;
    setJoystick(state);
    actionsRef.current?.setTouchMove(0, 0);
  };

  const handleTouchZonePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const cur = joystickRef.current;
    if (!cur || !cur.active || cur.pointerId !== e.pointerId) return;

    let dx = e.clientX - cur.originX;
    let dy = e.clientY - cur.originY;
    const dist = Math.hypot(dx, dy);

    let newOriginX = cur.originX;
    let newOriginY = cur.originY;

    // Floating joystick: if finger drags beyond radius, pull origin smoothly along with finger!
    if (dist > JOYSTICK_MAX_RADIUS) {
      const excess = dist - JOYSTICK_MAX_RADIUS;
      newOriginX += (dx / dist) * excess;
      newOriginY += (dy / dist) * excess;
      dx = e.clientX - newOriginX;
      dy = e.clientY - newOriginY;
    }

    const clampedDist = Math.min(JOYSTICK_MAX_RADIUS, Math.hypot(dx, dy));
    const normX =
      clampedDist > 3 ? dx / JOYSTICK_MAX_RADIUS : 0;
    const normZ =
      clampedDist > 3 ? dy / JOYSTICK_MAX_RADIUS : 0;

    const updated: TouchJoystickState = {
      active: true,
      pointerId: cur.pointerId,
      originX: newOriginX,
      originY: newOriginY,
      knobX: e.clientX,
      knobY: e.clientY,
    };
    joystickRef.current = updated;
    setJoystick(updated);
    actionsRef.current?.setTouchMove(normX, normZ);
  };

  const handleTouchZonePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const cur = joystickRef.current;
    if (!cur || cur.pointerId !== e.pointerId) return;
    joystickRef.current = null;
    setJoystick(null);
    actionsRef.current?.setTouchMove(0, 0);
  };

  const currentBiome = BIOMES[hud.biomeIndex % BIOMES.length];
  const hpPercent = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  const xpPercent = Math.max(0, Math.min(100, (hud.xp / hud.xpToNext) * 100));
  const lightningCadence = getChainLightningCadence(
    hud.perkLevels['chain_lightning'] || 0
  );
  const equippedTitleAch = ACHIEVEMENTS_LIST.find(
    (a) => a.id === meta.selectedTitleAchievementId
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none touch-none">
      {/* Isolated 3D WebGL Canvas */}
      <GameCanvas
        appearance={appearance}
        phase={hud.phase}
        autoAttack={autoAttack}
        autoPickup={autoPickup}
        metaProgression={meta}
        onHudUpdate={setHud}
        onSaveRun={handleSaveRun}
        onMetaEvent={handleMetaEvent}
        registerActions={(acts) => {
          actionsRef.current = acts;
        }}
      />

      {/* Floating Achievement Unlocked Toast Banner */}
      {achievementToast && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-fade-in">
          <div
            className="bg-slate-950/95 border-2 rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-3"
            style={{
              borderColor: achievementToast.frameColor,
              boxShadow: `0 0 28px -4px ${achievementToast.frameColor}`,
            }}
          >
            <div className="text-2xl">{achievementToast.icon}</div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                🏆 Достижение открыто! +{achievementToast.coinReward} 🪙
              </div>
              <div className="text-xs sm:text-sm font-display font-bold text-white">
                {achievementToast.title} · Титул «{achievementToast.rewardTitle}»
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen 360° Touch Drag Steering Surface (Active during Gameplay) */}
      {hud.phase === 'playing' && (
        <div
          onPointerDown={handleTouchZonePointerDown}
          onPointerMove={handleTouchZonePointerMove}
          onPointerUp={handleTouchZonePointerEnd}
          onPointerCancel={handleTouchZonePointerEnd}
          className="fixed inset-0 z-[5] touch-none cursor-grab active:cursor-grabbing"
        >
          {joystick && joystick.active && (
            <div className="pointer-events-none fixed inset-0">
              {/* Outer Floating Ring (Extra Transparent so field stays clear) */}
              <div
                className="fixed w-24 h-24 -ml-12 -mt-12 rounded-full border border-amber-400/25 bg-slate-950/15"
                style={{
                  left: `${joystick.originX}px`,
                  top: `${joystick.originY}px`,
                }}
              />
              {/* Inner Thumb Knob (Subtle Translucent Glow) */}
              <div
                className="fixed w-10 h-10 -ml-5 -mt-5 rounded-full bg-amber-400/35 border border-white/35"
                style={{
                  left: `${joystick.knobX}px`,
                  top: `${joystick.knobY}px`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* ==================== 1. TITLE SCREEN & COMPACT MINIMIZABLE CHARACTER FORGE ==================== */}
      {hud.phase === 'title' && (
        <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-2.5 sm:p-5">
          {/* Top Brand & Record Row */}
          <div className="flex items-start justify-between gap-2">
            <div className="pointer-events-auto max-w-[210px] sm:max-w-md">
              <svg
                viewBox="0 0 500 86"
                className="w-44 sm:w-64 md:w-80 h-auto drop-shadow-[0_6px_16px_rgba(0,0,0,0.85)]"
                aria-label="ZOMBIE BASH 3D"
              >
                <defs>
                  <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FDE047" />
                    <stop offset="55%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#EF4444" />
                  </linearGradient>
                </defs>
                <text
                  x="2"
                  y="54"
                  fill="#090D16"
                  stroke="#090D16"
                  strokeWidth="10"
                  strokeLinejoin="round"
                  fontFamily="Outfit, sans-serif"
                  fontWeight="800"
                  fontSize="54"
                  letterSpacing="-1"
                >
                  ZOMBIE BASH 3D
                </text>
                <text
                  x="0"
                  y="52"
                  fill="url(#titleGrad)"
                  fontFamily="Outfit, sans-serif"
                  fontWeight="800"
                  fontSize="54"
                  letterSpacing="-1"
                >
                  ZOMBIE BASH 3D
                </text>
                <text
                  x="4"
                  y="78"
                  fill="#E2E8F0"
                  fontFamily="Plus Jakarta Sans, sans-serif"
                  fontWeight="600"
                  fontSize="15"
                  letterSpacing="2.5"
                >
                  БЕСКОНЕЧНЫЙ ЭКШЕН-РАНЕР НА ВЫЖИВАНИЕ
                </text>
              </svg>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href="/zombie-bash-3d.apk"
                download="Zombie-Bash-3D.apk"
                className="pointer-events-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl px-3 py-1.5 text-[11px] sm:text-xs font-extrabold shadow-lg transition-colors"
                title="Скачать готовый подписанный установочный файл Android APK"
              >
                📲 Скачать .APK
              </a>

              {installPromptEvent && (
                <button
                  type="button"
                  onClick={async () => {
                    installPromptEvent.prompt();
                    await installPromptEvent.userChoice;
                    setInstallPromptEvent(null);
                  }}
                  className="pointer-events-auto bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition-colors"
                >
                  📲 Установить
                </button>
              )}

              <div className="pointer-events-auto bg-slate-950/88 border border-amber-400/45 rounded-xl px-2.5 py-1 sm:px-3.5 sm:py-1.5 text-right shadow-lg">
                <div className="text-[9px] sm:text-[11px] text-amber-300/90 font-semibold">
                  Казна
                </div>
                <div className="text-xs sm:text-base font-bold text-amber-400 font-mono-tabular">
                  🪙 {meta.coins.toLocaleString('ru-RU')}
                </div>
              </div>

              {bestScore > 0 && (
                <div className="pointer-events-auto bg-slate-950/80 border border-white/10 rounded-xl px-2.5 py-1 sm:px-3.5 sm:py-1.5 text-right">
                  <div className="text-[9px] sm:text-[11px] text-slate-400">Рекорд</div>
                  <div className="text-xs sm:text-base font-bold text-amber-400 font-mono-tabular">
                    {bestScore.toLocaleString('ru-RU')}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Compact & Collapsible Bottom Character Forge & Meta Shop Sheet */}
          <div
            className="pointer-events-auto w-full max-w-lg self-center sm:self-start bg-slate-950/86 border rounded-2xl p-2.5 sm:p-3.5 shadow-2xl space-y-2"
            style={{
              borderColor: equippedTitleAch
                ? equippedTitleAch.frameColor
                : 'rgba(255,255,255,0.14)',
              boxShadow: equippedTitleAch
                ? `0 0 24px -8px ${equippedTitleAch.frameColor}`
                : undefined,
            }}
          >
            {/* Compact Header Row: Hero Name + Equipped Title Badge + Sound + Minimize Toggle */}
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                    {appearance.name}
                  </h2>
                  {equippedTitleAch ? (
                    <span
                      className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-slate-900 border"
                      style={{
                        color: equippedTitleAch.frameColor,
                        borderColor: equippedTitleAch.frameColor,
                      }}
                    >
                      {equippedTitleAch.icon} {equippedTitleAch.rewardTitle}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                      · {appearance.tagline}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-400/35 text-[11px] font-mono-tabular font-bold text-amber-300">
                  🪙 {meta.coins}
                </span>
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="px-2 py-1 text-[10px] sm:text-xs font-medium text-slate-300 bg-slate-900/90 hover:bg-slate-800 border border-white/10 rounded-lg transition-colors"
                >
                  {muted ? '🔇' : '🔊'}
                </button>
                <button
                  type="button"
                  onClick={() => setTitleMinimized((prev) => !prev)}
                  className="px-2.5 py-1 text-[10px] sm:text-xs font-semibold text-amber-300 bg-slate-900/90 hover:bg-slate-800 border border-white/10 rounded-lg transition-colors"
                >
                  {titleMinimized ? '▴ Лавка и герой' : '▾ Свернуть'}
                </button>
              </div>
            </div>

            {!titleMinimized && (
              <>
                {/* Compact 5-Tab Switcher: Upgrades, Achievements, AI, Parts, Presets */}
                <div className="grid grid-cols-5 gap-1 bg-slate-900/90 p-1 rounded-xl border border-white/8">
                  <button
                    type="button"
                    onClick={() => setTitleTab('upgrades')}
                    className={`py-1 px-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-colors truncate ${
                      titleTab === 'upgrades'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    🪙 Прокачка
                  </button>
                  <button
                    type="button"
                    onClick={() => setTitleTab('achievements')}
                    className={`py-1 px-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-colors truncate ${
                      titleTab === 'achievements'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    🏆 Ачивки ({meta.unlockedAchievements.length}/{ACHIEVEMENTS_LIST.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTitleTab('ai')}
                    className={`py-1 px-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-colors truncate ${
                      titleTab === 'ai'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    ✨ ИИ-Облик
                  </button>
                  <button
                    type="button"
                    onClick={() => setTitleTab('parts')}
                    className={`py-1 px-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-colors truncate ${
                      titleTab === 'parts'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    🦊 Детали
                  </button>
                  <button
                    type="button"
                    onClick={() => setTitleTab('presets')}
                    className={`py-1 px-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-colors truncate ${
                      titleTab === 'presets'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    🎭 Образы
                  </button>
                </div>

                {/* TAB: UPGRADES SHOP (10 Permanent Meta-Upgrades) */}
                {titleTab === 'upgrades' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
                    {META_UPGRADES.map((upg) => {
                      const lvl = meta.upgradeLevels[upg.id] || 0;
                      const isMax = lvl >= upg.maxLevel;
                      const cost = getMetaUpgradeCost(upg, lvl);
                      const canAfford = !isMax && meta.coins >= cost;
                      return (
                        <div
                          key={upg.id}
                          className="flex items-center justify-between gap-2 bg-slate-900/90 border border-white/10 rounded-xl px-2.5 py-1.5"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">{upg.icon}</span>
                              <span className="text-[11px] font-bold text-white truncate">
                                {upg.title}
                              </span>
                              <span
                                className="text-[9px] font-mono-tabular px-1.5 py-0.2 rounded bg-slate-950 border border-white/10"
                                style={{ color: upg.color }}
                              >
                                {lvl}/{upg.maxLevel}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {upg.perLevelLabel(lvl > 0 ? lvl : 1)}
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={isMax || !canAfford}
                            onClick={() => handleBuyUpgrade(upg.id)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono-tabular font-extrabold shrink-0 transition-colors ${
                              isMax
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                                : canAfford
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow'
                                : 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
                            }`}
                          >
                            {isMax ? 'МАКС' : `🪙 ${cost}`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* TAB: ACHIEVEMENTS & HERO TITLES */}
                {titleTab === 'achievements' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
                    {ACHIEVEMENTS_LIST.map((ach) => {
                      const unlocked = meta.unlockedAchievements.includes(ach.id);
                      const curVal =
                        ach.statKey === 'totalCoinsEarned'
                          ? meta.totalCoinsEarned
                          : meta.stats[ach.statKey] || 0;
                      const progressPct = Math.min(
                        100,
                        Math.floor((curVal / ach.targetValue) * 100)
                      );
                      const isEquipped = meta.selectedTitleAchievementId === ach.id;
                      return (
                        <div
                          key={ach.id}
                          className={`flex flex-col justify-between gap-1 rounded-xl px-2.5 py-1.5 border transition-colors ${
                            unlocked
                              ? 'bg-slate-900/95 border-amber-400/40'
                              : 'bg-slate-900/50 border-white/8 opacity-80'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-sm">{ach.icon}</span>
                                <span className="text-[11px] font-bold text-white truncate">
                                  {ach.title}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 leading-tight">
                                {ach.description}
                              </div>
                            </div>
                            <span className="text-[10px] font-mono-tabular font-bold text-amber-300 shrink-0">
                              +{ach.coinReward} 🪙
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            <div className="flex-1 h-1.5 bg-slate-950 rounded-full overflow-hidden">
                              <div
                                className="h-full transition-all"
                                style={{
                                  width: `${progressPct}%`,
                                  backgroundColor: ach.frameColor,
                                }}
                              />
                            </div>
                            {unlocked ? (
                              <button
                                type="button"
                                onClick={() => handleSelectTitle(ach.id)}
                                className={`px-2 py-0.5 rounded text-[9px] font-extrabold transition-colors ${
                                  isEquipped
                                    ? 'bg-amber-400 text-slate-950'
                                    : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30'
                                }`}
                              >
                                {isEquipped
                                  ? `✓ ${ach.rewardTitle}`
                                  : `Надеть «${ach.rewardTitle}»`}
                              </button>
                            ) : (
                              <span className="text-[9px] font-mono-tabular text-slate-400">
                                {curVal}/{ach.targetValue}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* TAB 1: Compact Single-Row AI Generator */}
                {titleTab === 'ai' && (
                  <form onSubmit={handleGenerateAppearance} className="space-y-1.5">
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={promptInput}
                        onChange={(e) => setPromptInput(e.target.value)}
                        placeholder="Опишите: рыжий лис-самурай, неоновый котик..."
                        className="flex-1 min-w-0 rounded-xl bg-slate-900/95 border border-white/15 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                      <button
                        type="submit"
                        disabled={isGenerating || !promptInput.trim()}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/50 text-amber-300 text-xs font-bold transition-colors disabled:opacity-50 shrink-0"
                      >
                        {isGenerating ? '...' : 'Создать'}
                      </button>
                    </div>
                    {genError && <p className="text-[11px] text-rose-400">{genError}</p>}
                  </form>
                )}

                {/* TAB 2: Compact Ears, Tail & Gear Switches */}
                {titleTab === 'parts' && (
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const earsList: EarsType[] = [
                          'none',
                          'fox_ears',
                          'cat_ears',
                          'elephant_ears',
                          'croc_ridge',
                          'lion_mane',
                          'wolf_ears',
                          'bunny_ears',
                          'bear_ears',
                          'frog_eyes',
                          'shark_fin',
                          'deer_antlers',
                          'demon_horns',
                        ];
                        const cur = appearance.accessories.ears || 'none';
                        const nextEars =
                          earsList[(earsList.indexOf(cur) + 1) % earsList.length];
                        const autoMuzzle: MuzzleType =
                          nextEars === 'fox_ears'
                            ? 'fox_muzzle'
                            : nextEars === 'cat_ears'
                            ? 'cat_muzzle'
                            : nextEars === 'elephant_ears'
                            ? 'elephant_trunk'
                            : nextEars === 'croc_ridge'
                            ? 'croc_snout'
                            : nextEars === 'lion_mane'
                            ? 'lion_muzzle'
                            : nextEars === 'frog_eyes'
                            ? 'frog_muzzle'
                            : nextEars === 'shark_fin'
                            ? 'shark_muzzle'
                            : nextEars === 'deer_antlers'
                            ? 'deer_muzzle'
                            : nextEars === 'wolf_ears' || nextEars === 'bear_ears'
                            ? 'wolf_muzzle'
                            : nextEars === 'bunny_ears'
                            ? 'bunny_muzzle'
                            : 'none';
                        const autoTail: TailType =
                          nextEars === 'fox_ears'
                            ? 'fox_tail'
                            : nextEars === 'cat_ears'
                            ? 'cat_tail'
                            : nextEars === 'elephant_ears'
                            ? 'elephant_tail'
                            : nextEars === 'croc_ridge'
                            ? 'croc_tail'
                            : nextEars === 'lion_mane'
                            ? 'lion_tail'
                            : nextEars === 'shark_fin'
                            ? 'shark_tail'
                            : nextEars === 'wolf_ears'
                            ? 'wolf_tail'
                            : nextEars === 'bunny_ears' ||
                              nextEars === 'bear_ears' ||
                              nextEars === 'deer_antlers'
                            ? 'bunny_tail'
                            : nextEars === 'demon_horns'
                            ? 'devil_tail'
                            : 'none';
                        handleSaveAppearance({
                          ...appearance,
                          accessories: {
                            ...appearance.accessories,
                            ears: nextEars,
                            muzzle: autoMuzzle,
                            tail: autoTail,
                            headgear:
                              nextEars !== 'none'
                                ? 'none'
                                : appearance.accessories.headgear,
                          },
                        });
                        soundEngine.playPickup(false);
                      }}
                      className="px-2 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-[11px] font-medium text-amber-300 transition-colors text-center truncate"
                    >
                      Зверь:{' '}
                      {
                        {
                          none: 'Человек',
                          fox_ears: 'Лис',
                          cat_ears: 'Котик',
                          elephant_ears: 'Слоник',
                          croc_ridge: 'Крокодил',
                          lion_mane: 'Лев',
                          wolf_ears: 'Волк',
                          bunny_ears: 'Зайка',
                          bear_ears: 'Панда',
                          frog_eyes: 'Лягушка',
                          shark_fin: 'Акула',
                          deer_antlers: 'Олень',
                          demon_horns: 'Демон',
                        }[appearance.accessories.ears || 'none']
                      }{' '}
                      ↻
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const tailsList: TailType[] = [
                          'none',
                          'fox_tail',
                          'cat_tail',
                          'elephant_tail',
                          'croc_tail',
                          'lion_tail',
                          'shark_tail',
                          'wolf_tail',
                          'bunny_tail',
                          'devil_tail',
                        ];
                        const cur = appearance.accessories.tail || 'none';
                        const nextTail =
                          tailsList[(tailsList.indexOf(cur) + 1) % tailsList.length];
                        handleSaveAppearance({
                          ...appearance,
                          accessories: {
                            ...appearance.accessories,
                            tail: nextTail,
                          },
                        });
                        soundEngine.playPickup(false);
                      }}
                      className="px-2 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-[11px] font-medium text-sky-300 transition-colors text-center truncate"
                    >
                      Хвост:{' '}
                      {
                        {
                          none: 'Нет',
                          fox_tail: 'Лисий',
                          cat_tail: 'Котик',
                          elephant_tail: 'Слон',
                          croc_tail: 'Крокодил',
                          lion_tail: 'Львиный',
                          shark_tail: 'Акулий',
                          wolf_tail: 'Волк',
                          bunny_tail: 'Пушок',
                          devil_tail: 'Демон',
                        }[appearance.accessories.tail || 'none']
                      }{' '}
                      ↻
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const headgears = [
                          'none',
                          'mohawk',
                          'chef_hat',
                          'cap',
                          'helmet',
                          'crown',
                          'hood',
                          'cowboy_hat',
                        ] as const;
                        const eyewears = [
                          'none',
                          'visor',
                          'sunglasses',
                          'goggles',
                          'eyepatch',
                        ] as const;
                        const backs = [
                          'none',
                          'backpack',
                          'cape',
                          'guitar_case',
                          'jetpack',
                          'katana_sheath',
                        ] as const;
                        const nextHg =
                          headgears[
                            (headgears.indexOf(appearance.accessories.headgear) +
                              1) %
                              headgears.length
                          ];
                        const nextEw =
                          eyewears[
                            (eyewears.indexOf(appearance.accessories.eyewear) + 1) %
                              eyewears.length
                          ];
                        const nextBk =
                          backs[
                            (backs.indexOf(appearance.accessories.backItem) + 1) %
                              backs.length
                          ];
                        handleSaveAppearance({
                          ...appearance,
                          accessories: {
                            ...appearance.accessories,
                            headgear: nextHg,
                            eyewear: nextEw,
                            backItem: nextBk,
                          },
                        });
                        soundEngine.playPickup(false);
                      }}
                      className="px-2 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-[11px] font-medium text-emerald-300 transition-colors text-center truncate"
                    >
                      Стиль ↻
                    </button>
                  </div>
                )}

                {/* TAB 3: 12 Playable Animal Characters Grid */}
                {titleTab === 'presets' && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-32 overflow-y-auto pr-0.5">
                    {CHARACTER_PRESETS.map((preset) => {
                      const active = appearance.name === preset.name;
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            handleSaveAppearance(preset);
                            setPromptInput(preset.prompt || '');
                            soundEngine.playPickup(false);
                          }}
                          className={`px-2 py-1.5 rounded-lg text-center text-[10px] sm:text-[11px] font-medium border transition-colors truncate ${
                            active
                              ? 'bg-slate-800 border-amber-400/60 text-white'
                              : 'bg-slate-900/70 border-white/10 text-slate-300 hover:bg-slate-800/80'
                          }`}
                        >
                          {preset.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Checkpoint Stage Selector (Stage 1, 11, 21, 31... unlocked by defeating Stage 10/20/30 Grand-Bosses) */}
            <div className="flex items-center justify-between gap-1.5 bg-slate-900/90 border border-white/10 rounded-xl px-2.5 py-1.5">
              <div className="text-[10px] sm:text-[11px] text-slate-300 font-semibold">
                🚩 Чекпоинт старта:
              </div>
              <div className="flex items-center gap-1 overflow-x-auto">
                {[1, 11, 21, 31].map((stg) => {
                  const unlocked = meta.unlockedCheckpoints.includes(stg);
                  const selected = meta.selectedCheckpoint === stg;
                  const coinMult = 1 + Math.floor((stg - 1) / 10) * 0.5;
                  return (
                    <button
                      key={stg}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => handleSelectCheckpoint(stg)}
                      title={
                        unlocked
                          ? `Старт с Этапа ${stg} (множитель монет ×${coinMult.toFixed(1)})`
                          : `Победите Гранд-Босса ${stg - 1}-го этапа, чтобы открыть чекпоинт`
                      }
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono-tabular font-bold transition-colors ${
                        selected
                          ? 'bg-amber-500 text-slate-950 shadow'
                          : unlocked
                          ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30'
                          : 'bg-slate-950/80 text-slate-600 border border-white/5 cursor-not-allowed'
                      }`}
                    >
                      {unlocked ? `Эт.${stg}` : `🔒${stg}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary CTA Row: Resume Saved Run (if available) + Start New Run */}
            <div className="flex flex-col sm:flex-row gap-1.5 pt-0.5">
              {savedRun && (
                <button
                  type="button"
                  onClick={() => actionsRef.current?.resumeSavedGame(savedRun)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-display font-extrabold text-xs sm:text-sm tracking-wide shadow-lg transition-transform active:scale-[0.99]"
                >
                  ▶ Продолжить (Ур.{savedRun.level} · Эт.{savedRun.stageNumber})
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  handleSaveRun(null);
                  actionsRef.current?.startNewGame(meta.selectedCheckpoint);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-display font-extrabold text-xs sm:text-sm tracking-wide shadow-lg transition-transform active:scale-[0.99]"
              >
                {savedRun
                  ? `Новый забег (Эт.${meta.selectedCheckpoint})`
                  : meta.selectedCheckpoint > 1
                  ? `В бой с Этапа ${meta.selectedCheckpoint}`
                  : 'Начать забег'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 2. ULTRA-COMPACT NON-OCCLUDING HUD (MOBILE & DESKTOP) ==================== */}
      {hud.phase !== 'title' && (
        <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-2 sm:p-3.5">
          {/* TOP COMPACT PERIMETER STRIP */}
          <div className="w-full flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              {/* Top-Left: Ultra-Compact HP + XP + Stage Pill */}
              <div
                className={`pointer-events-auto bg-slate-950/82 border rounded-xl px-2.5 py-1.5 sm:px-3.5 sm:py-2 flex-1 max-w-[235px] sm:max-w-[300px] space-y-1 transition-colors ${
                  hud.isBerserk
                    ? 'border-rose-500 shadow-[0_0_16px_rgba(244,63,94,0.45)]'
                    : 'border-white/12'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs font-mono-tabular">
                  <span className="font-bold text-white truncate">
                    Ур.{hud.level} · Эт.{hud.stageNumber}
                  </span>
                  <span
                    className={`font-bold shrink-0 ${
                      hud.isBerserk
                        ? 'text-rose-400 animate-pulse'
                        : 'text-emerald-400'
                    }`}
                  >
                    {hud.isBerserk ? '🔥 БЕРСЕРК ' : '♥ '}
                    {hud.hp}/{hud.maxHp}
                  </span>
                </div>

                {/* Compact Health Bar */}
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                  <div
                    className={`h-full transition-transform duration-150 origin-left ${
                      hud.isBerserk ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                    style={{ transform: `scaleX(${hpPercent / 100})` }}
                  />
                </div>

                {/* Slim XP Strip directly underneath */}
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-400 transition-transform duration-150 origin-left"
                      style={{ transform: `scaleX(${xpPercent / 100})` }}
                    />
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-sky-300 font-mono-tabular shrink-0">
                    {hud.xp}/{hud.xpToNext} XP
                  </span>
                </div>
              </div>

              {/* Top-Center (Desktop): Timer or Boss */}
              <div className="hidden md:flex flex-col items-center">
                {!hud.activeBoss && (
                  <div className="pointer-events-auto bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-1.5 text-center">
                    <div className="text-[11px] text-slate-400">
                      {currentBiome.name} · Босс через{' '}
                      <span className="text-amber-400 font-mono-tabular font-semibold">
                        {hud.nextBossIn}с
                      </span>
                    </div>
                    <div className="text-base font-bold text-white font-mono-tabular">
                      {formatTime(hud.elapsedTime)}
                    </div>
                  </div>
                )}
              </div>

              {/* Top-Right: Compact Score + Coins + Lightning Proc + Pause Button */}
              <div className="pointer-events-auto bg-slate-950/82 border border-white/12 rounded-xl px-2.5 py-1.5 sm:px-3.5 sm:py-2 flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="text-right font-mono-tabular leading-tight">
                  <div className="text-xs sm:text-sm font-bold text-amber-400 flex items-center justify-end gap-2">
                    <span>🪙 {meta.coins}</span>
                    <span className="text-slate-500">·</span>
                    <span>
                      {hud.score.toLocaleString('ru-RU')}
                      <span className="text-[10px] text-slate-400 font-normal ml-0.5">
                        очк
                      </span>
                    </span>
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-semibold text-sky-400">
                    ⚡ {hud.hitCount % lightningCadence}/{lightningCadence} · ☠{' '}
                    {hud.kills}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => actionsRef.current?.togglePause()}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 active:bg-slate-700 border border-white/12 text-xs font-bold text-slate-200 transition-colors"
                  aria-label="Пауза"
                >
                  ⏸
                </button>
              </div>
            </div>

            {/* Berserk Active Banner (< 20% HP) */}
            {hud.isBerserk && hud.deathTimer <= 0 && (
              <div className="self-center pointer-events-none bg-rose-600/95 text-white font-display font-extrabold text-[11px] sm:text-xs px-3.5 py-1 rounded-lg shadow-lg border border-rose-300 tracking-wide text-center animate-pulse">
                🔥 РЕЖИМ БЕРСЕРКА · +50% УРОН И СКОРОСТЬ!
              </div>
            )}

            {/* GTA-Style "ПОТРАЧЕНО" Death Overlay (while monsters kick character for 5s) */}
            {hud.deathTimer > 0 && (
              <div className="fixed inset-x-0 top-[14%] sm:top-[16%] z-30 pointer-events-none flex flex-col items-center justify-center animate-fade-in">
                <div className="w-full bg-gradient-to-r from-black/40 via-black/88 to-black/40 border-y-2 border-red-600/80 py-2.5 sm:py-4 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.95)]">
                  <div
                    className="font-display font-black text-4xl sm:text-6xl tracking-[0.16em] text-red-600 uppercase select-none"
                    style={{
                      textShadow:
                        '0 4px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 0 28px rgba(220,38,38,0.85)',
                    }}
                  >
                    ПОТРАЧЕНО
                  </div>
                </div>
              </div>
            )}

            {/* Slim Stage Announcement OR Active Boss Bar (Compact height so field stays visible) */}
            {hud.stageAnnouncement && hud.deathTimer <= 0 && (
              <div className="self-center pointer-events-none bg-amber-500/95 text-slate-950 font-display font-extrabold text-[11px] sm:text-xs px-3.5 py-1 rounded-lg shadow-lg border border-amber-300 tracking-wide text-center">
                {hud.stageAnnouncement}
              </div>
            )}

            {hud.activeBoss ? (
              <div
                className={`self-center w-full max-w-md pointer-events-auto bg-slate-950/90 border rounded-xl px-3 py-1.5 ${
                  hud.activeBoss.isGrandBoss
                    ? 'border-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.45)]'
                    : 'border-rose-500/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs mb-1">
                  <span
                    className={`font-display font-bold truncate ${
                      hud.activeBoss.isGrandBoss
                        ? 'text-amber-300'
                        : 'text-rose-400'
                    }`}
                  >
                    {hud.activeBoss.isGrandBoss ? '👑 ГРАНД-БОСС: ' : 'БОСС: '}
                    {hud.activeBoss.name}
                  </span>
                  <span className="font-mono-tabular text-amber-300 font-semibold shrink-0">
                    {hud.activeBoss.phaseLabel} · {hud.activeBoss.hp} HP
                  </span>
                </div>
                <div className="relative w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-rose-500/40">
                  <div
                    className={`h-full transition-transform duration-100 origin-left ${
                      hud.activeBoss.phase === 3
                        ? 'bg-fuchsia-500'
                        : hud.activeBoss.phase === 2
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{
                      transform: `scaleX(${Math.max(
                        0,
                        Math.min(1, hud.activeBoss.hp / hud.activeBoss.maxHp)
                      )})`,
                    }}
                  />
                  <div className="absolute top-0 bottom-0 left-[33.3%] w-0.5 bg-white/60" />
                  <div className="absolute top-0 bottom-0 left-[66.6%] w-0.5 bg-white/60" />
                </div>
              </div>
            ) : (
              /* Mobile micro timer strip */
              <div className="md:hidden self-center pointer-events-none bg-slate-950/70 border border-white/8 rounded-full px-3 py-0.5 text-[10px] text-slate-300 font-mono-tabular">
                ⏱ {formatTime(hud.elapsedTime)} · Босс через{' '}
                <span className="text-amber-400 font-bold">
                  {hud.nextBossIn}с
                </span>
              </div>
            )}
          </div>

          {/* ==================== BOTTOM PERIMETER: COMPACT WEAPON PILL & THUMB CONTROLS ==================== */}
          <div className="w-full flex items-end justify-between gap-2">
            {/* Bottom-Left: Compact Weapon & Active Skills Pill (Collapsible) */}
            <div className="flex flex-col items-start max-w-[56%] sm:max-w-sm">
              <button
                type="button"
                onClick={() => setDockCollapsed((prev) => !prev)}
                className="pointer-events-auto mb-1 px-2.5 py-0.5 rounded-md bg-slate-950/80 border border-white/10 text-[10px] text-slate-300"
              >
                {dockCollapsed ? '▴ Оружие' : '▾ Скрыть'}
              </button>

              {!dockCollapsed && (
                <div className="pointer-events-auto w-full bg-slate-950/85 border border-white/12 rounded-xl p-2 sm:p-3 shadow-xl space-y-1.5">
                  {hud.weapon ? (
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="text-xs sm:text-sm font-bold truncate"
                          style={{
                            color: RARITY_CONFIG[hud.weapon.rarity].color,
                          }}
                        >
                          {hud.weapon.name}
                        </span>
                        <span className="text-[10px] sm:text-xs font-mono-tabular text-slate-300 shrink-0">
                          ⚔ {hud.weapon.damage} · {hud.weapon.durability}/
                          {hud.weapon.maxDurability}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full transition-transform duration-150 origin-left"
                          style={{
                            backgroundColor:
                              RARITY_CONFIG[hud.weapon.rarity].color,
                            transform: `scaleX(${Math.max(
                              0,
                              Math.min(
                                1,
                                hud.weapon.durability /
                                  hud.weapon.maxDurability
                              )
                            )})`,
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-amber-400">
                      Голые кулаки — пробегите по предмету!
                    </div>
                  )}

                  {/* Active Cumulative Skills Mini-Row with Custom SVG Icons */}
                  {Object.keys(hud.perkLevels).length > 0 && (
                    <div className="pt-1.5 border-t border-white/10 flex flex-wrap items-center gap-1.5 text-[10px]">
                      {Object.entries(hud.perkLevels).map(([id, lvl]) => {
                        const pInfo = PERK_POOL.find((p) => p.id === id);
                        if (!pInfo) return null;
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-slate-900/90 border border-white/10 font-mono-tabular font-bold"
                            style={{ color: pInfo.color }}
                            title={pInfo.title}
                          >
                            <SkillIcon id={id} className="w-4 h-4 shrink-0" />
                            <span>×{lvl}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom-Right: Mobile-Friendly Thumb Action Cluster (Pickup + Attack + Auto Toggles) */}
            <div className="pointer-events-auto flex flex-col items-end gap-2 shrink-0">
              {/* Thumb-Friendly Floating Pickup Button when an item is nearby */}
              {hud.nearbyItem && (
                <button
                  type="button"
                  onClick={() => actionsRef.current?.pickupNearby()}
                  className="px-3.5 py-2 rounded-xl bg-slate-950/95 border-2 shadow-xl flex items-center gap-2 active:scale-95 transition-transform"
                  style={{
                    borderColor: RARITY_CONFIG[hud.nearbyItem.rarity].color,
                  }}
                >
                  <div className="text-left leading-tight">
                    <div
                      className="text-xs font-extrabold"
                      style={{
                        color: RARITY_CONFIG[hud.nearbyItem.rarity].color,
                      }}
                    >
                      ВЗЯТЬ: {hud.nearbyItem.name}
                    </div>
                    <div className="text-[10px] text-slate-300 font-mono-tabular">
                      {RARITY_CONFIG[hud.nearbyItem.rarity].label} · Урон{' '}
                      {hud.nearbyItem.damage}
                    </div>
                  </div>
                </button>
              )}

              <div className="flex items-center gap-1.5">
                {/* Smart Auto-Pickup Toggle */}
                <button
                  type="button"
                  onClick={() => setAutoPickup((prev) => !prev)}
                  className={`px-2.5 py-2 rounded-xl border text-[11px] font-semibold transition-colors ${
                    autoPickup
                      ? 'bg-sky-500/20 border-sky-400/50 text-sky-300'
                      : 'bg-slate-950/85 border-white/10 text-slate-400'
                  }`}
                >
                  {autoPickup ? 'Авто-лут: Вкл' : 'Авто-лут: Выкл'}
                </button>

                {/* Auto-Attack Toggle */}
                <button
                  type="button"
                  onClick={() => setAutoAttack((prev) => !prev)}
                  className={`px-2.5 py-2 rounded-xl border text-[11px] font-semibold transition-colors ${
                    autoAttack
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                      : 'bg-slate-950/85 border-white/10 text-slate-400'
                  }`}
                >
                  {autoAttack ? 'Авто-бой: Вкл' : 'Авто-бой: Выкл'}
                </button>

                {/* Manual Attack Button */}
                <button
                  type="button"
                  onClick={() => actionsRef.current?.manualAttack()}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-display font-extrabold text-xs sm:text-sm shadow-lg transition-transform"
                >
                  УДАР
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 2.5 STAGE "WHOOSH" PORTAL TRANSITION OVERLAY ==================== */}
      {hud.stageTransitionProgress > 0 && (
        <div
          className="fixed inset-0 z-30 pointer-events-none flex items-center justify-center overflow-hidden"
          style={{
            background: `radial-gradient(circle at center, rgba(56, 189, 248, ${
              Math.sin(hud.stageTransitionProgress * Math.PI) * 0.72
            }) 0%, rgba(168, 85, 247, ${
              Math.sin(hud.stageTransitionProgress * Math.PI) * 0.58
            }) 45%, rgba(2, 6, 23, ${
              Math.sin(hud.stageTransitionProgress * Math.PI) * 0.92
            }) 100%)`,
          }}
        >
          <div
            className="flex flex-col items-center gap-2 px-6 py-4 rounded-2xl bg-slate-950/90 border-2 border-cyan-400/80 shadow-2xl transition-transform duration-75"
            style={{
              transform: `scale(${
                0.85 + Math.sin(hud.stageTransitionProgress * Math.PI) * 0.35
              })`,
            }}
          >
            <div className="text-2xl sm:text-4xl font-display font-black tracking-wider text-cyan-300">
              ⚡ ВЖУХ! НОВЫЙ УРОВЕНЬ ⚡
            </div>
            <div className="text-xs sm:text-sm font-bold text-amber-300">
              Босс повержен! Перемещение на арену {hud.stageNumber + 1}...
            </div>
          </div>
        </div>
      )}

      {/* ==================== 3. COMPACT 3-ICON LEVEL-UP SELECTOR (NO SCREEN BLOCKING) ==================== */}
      {hud.phase === 'levelup' && (
        <div className="fixed inset-0 z-20 pointer-events-none flex flex-col items-center justify-center p-3">
          <div className="pointer-events-auto flex flex-col items-center gap-2.5 bg-slate-950/82 backdrop-blur-md border border-amber-400/45 rounded-2xl px-4 py-3.5 shadow-2xl">
            <div className="text-xs sm:text-sm font-display font-extrabold text-amber-300 tracking-wide">
              УРОВЕНЬ {hud.level} — ВЫБЕРИ НАВЫК
            </div>

            <div className="flex items-center justify-center gap-2.5 sm:gap-4">
              {hud.levelUpChoices.map((perk) => {
                const curLvl = perk.currentLevel || 0;
                const nextLvl = perk.nextLevel || curLvl + 1;
                return (
                  <button
                    key={perk.id}
                    type="button"
                    onClick={() => actionsRef.current?.selectPerk(perk.id)}
                    className="w-24 h-28 sm:w-28 sm:h-32 rounded-2xl bg-slate-900/95 hover:bg-slate-800 active:scale-95 border-2 flex flex-col items-center justify-between py-2 px-1.5 shadow-xl transition-transform group"
                    style={{
                      borderColor: perk.color,
                      boxShadow: `0 0 22px -6px ${perk.color}`,
                    }}
                    title={perk.title}
                  >
                    <div className="group-hover:scale-110 transition-transform duration-150">
                      <SkillIcon
                        id={perk.id}
                        className="w-12 h-12 sm:w-14 sm:h-14"
                      />
                    </div>
                    <span className="text-[11px] sm:text-xs font-extrabold text-white truncate max-w-full leading-tight">
                      {perk.shortTitle}
                    </span>
                    <span
                      className="text-[10px] font-mono-tabular font-bold px-2 py-0.5 rounded-md bg-slate-950/90 border border-white/10"
                      style={{ color: perk.color }}
                    >
                      {curLvl > 0 ? `Ур.${curLvl}→${nextLvl}` : 'Ур.1'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== 4. PAUSE MODAL ==================== */}
      {hud.phase === 'paused' && (
        <div className="fixed inset-0 z-20 bg-slate-950/82 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-display font-bold text-white">
                  Игра на паузе
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Время: {formatTime(hud.elapsedTime)} · Уровень {hud.level}
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleMute}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-medium text-slate-200"
              >
                {muted ? 'Звук: Выкл' : 'Звук: Вкл'}
              </button>
            </div>

            {Object.keys(hud.perkLevels).length > 0 && (
              <div className="space-y-1">
                <div className="text-xs text-slate-400">
                  Уровни ваших навыков:
                </div>
                <div className="text-xs text-slate-200 leading-relaxed">
                  {Object.entries(hud.perkLevels)
                    .map(
                      ([id, lvl]) =>
                        `${PERK_POOL.find((p) => p.id === id)?.title || id} (Ур. ${lvl})`
                    )
                    .join(' · ')}
                </div>
              </div>
            )}

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => actionsRef.current?.togglePause()}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors"
              >
                Продолжить бой
              </button>
              <button
                type="button"
                onClick={() =>
                  actionsRef.current?.startNewGame(meta.selectedCheckpoint)
                }
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
              >
                Начать заново (Эт.{meta.selectedCheckpoint})
              </button>
              <button
                type="button"
                onClick={() =>
                  setHud((prev) => ({ ...prev, phase: 'title' }))
                }
                className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-white/10 text-slate-300 font-medium text-xs transition-colors"
              >
                Сохранить и выйти в меню (Прокачка 🪙)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 5. GAME OVER SUMMARY MODAL ==================== */}
      {hud.phase === 'gameover' && (
        <div className="fixed inset-0 z-20 bg-slate-950/85 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-rose-500/40 rounded-2xl p-5 sm:p-8 shadow-2xl space-y-5">
            <div className="text-center space-y-1">
              <div className="text-xs font-semibold text-rose-400">
                ЗАБЕГ ОКОНЧЕН
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white">
                {appearance.name} пал в бою
              </h2>
              <p className="text-xs text-slate-400">
                Локация: {currentBiome.name} · Этап {hud.stageNumber}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 font-mono-tabular">
              <div className="bg-slate-950 border border-white/10 rounded-xl p-3">
                <div className="text-[11px] text-slate-400">Итоговый счёт</div>
                <div className="text-lg sm:text-xl font-bold text-amber-400">
                  {hud.score.toLocaleString('ru-RU')}
                </div>
              </div>
              <div className="bg-slate-950 border border-amber-400/30 rounded-xl p-3">
                <div className="text-[11px] text-amber-300">Добыто монет</div>
                <div className="text-lg sm:text-xl font-bold text-amber-400">
                  +{hud.runCoins} 🪙 (Всего: {meta.coins})
                </div>
              </div>
              <div className="bg-slate-950 border border-white/10 rounded-xl p-3">
                <div className="text-[11px] text-slate-400">Сокрушено зомби</div>
                <div className="text-lg sm:text-xl font-bold text-emerald-400">
                  {hud.kills} (Боссов: {hud.bossesDefeated})
                </div>
              </div>
              <div className="bg-slate-950 border border-white/10 rounded-xl p-3">
                <div className="text-[11px] text-slate-400">Любимое оружие</div>
                <div className="text-xs sm:text-sm font-bold text-sky-400 truncate mt-1">
                  {hud.favoriteWeaponName}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() =>
                  actionsRef.current?.startNewGame(meta.selectedCheckpoint)
                }
                className="flex-1 py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-extrabold text-sm transition-colors"
              >
                Новый забег (Эт.{meta.selectedCheckpoint})
              </button>
              <button
                type="button"
                onClick={() => {
                  setTitleTab('upgrades');
                  setTitleMinimized(false);
                  setHud((prev) => ({ ...prev, phase: 'title' }));
                }}
                className="py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30 font-bold text-xs transition-colors"
              >
                🪙 В лавку прокачки ({meta.coins})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
