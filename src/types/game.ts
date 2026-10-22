export type HeadgearType =
  | 'none'
  | 'cap'
  | 'helmet'
  | 'chef_hat'
  | 'mohawk'
  | 'crown'
  | 'hood'
  | 'cowboy_hat';

export type EyewearType =
  | 'none'
  | 'sunglasses'
  | 'visor'
  | 'eyepatch'
  | 'goggles';

export type BackItemType =
  | 'none'
  | 'backpack'
  | 'cape'
  | 'guitar_case'
  | 'jetpack'
  | 'katana_sheath';

export type FacialHairType = 'none' | 'beard' | 'mustache' | 'mask';

export type EarsType =
  | 'none'
  | 'cat_ears'
  | 'fox_ears'
  | 'wolf_ears'
  | 'bunny_ears'
  | 'bear_ears'
  | 'demon_horns'
  | 'elephant_ears'
  | 'croc_ridge'
  | 'lion_mane'
  | 'frog_eyes'
  | 'shark_fin'
  | 'deer_antlers';

export type TailType =
  | 'none'
  | 'cat_tail'
  | 'fox_tail'
  | 'wolf_tail'
  | 'bunny_tail'
  | 'devil_tail'
  | 'elephant_tail'
  | 'croc_tail'
  | 'lion_tail'
  | 'shark_tail';

export type MuzzleType =
  | 'none'
  | 'cat_muzzle'
  | 'fox_muzzle'
  | 'wolf_muzzle'
  | 'bunny_muzzle'
  | 'elephant_trunk'
  | 'croc_snout'
  | 'lion_muzzle'
  | 'frog_muzzle'
  | 'shark_muzzle'
  | 'deer_muzzle';

export interface CharacterAppearance {
  name: string;
  tagline: string;
  prompt?: string;
  colors: {
    skin: string;
    shirt: string;
    pants: string;
    shoes: string;
    hair: string;
    accent: string;
  };
  proportions: {
    heightScale: number;
    torsoWidth: number;
    headScale: number;
    limbThickness: number;
  };
  accessories: {
    headgear: HeadgearType;
    eyewear: EyewearType;
    backItem: BackItemType;
    facialHair: FacialHairType;
    ears?: EarsType;
    tail?: TailType;
    muzzle?: MuzzleType;
  };
}

export type WeaponRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type WeaponTypeId =
  | 'frying_pan'
  | 'baseball_bat'
  | 'road_sign'
  | 'electric_guitar'
  | 'sledgehammer'
  | 'shopping_cart'
  | 'chainsaw'
  | 'traffic_cone';

export interface WeaponTemplate {
  id: WeaponTypeId;
  name: string;
  description: string;
  baseDamage: number;
  baseDurability: number;
  range: number;
  arcAngle: number;
  cooldown: number;
  knockback: number;
  heavyHitstop: number;
  soundType: 'metal' | 'wood' | 'heavy' | 'chainsaw' | 'guitar';
}

export interface EquippedWeapon {
  uid: string;
  type: WeaponTypeId;
  name: string;
  rarity: WeaponRarity;
  damage: number;
  durability: number;
  maxDurability: number;
  range: number;
  arcAngle: number;
  cooldown: number;
  knockback: number;
  heavyHitstop: number;
  soundType: 'metal' | 'wood' | 'heavy' | 'chainsaw' | 'guitar';
}

export interface RarityInfo {
  id: WeaponRarity;
  label: string;
  color: string;
  hex: number;
  damageMult: number;
  durabilityMult: number;
}

export const RARITY_CONFIG: Record<WeaponRarity, RarityInfo> = {
  common: {
    id: 'common',
    label: 'Обычный',
    color: '#94A3B8',
    hex: 0x94a3b8,
    damageMult: 1.0,
    durabilityMult: 1.0,
  },
  rare: {
    id: 'rare',
    label: 'Редкий',
    color: '#38BDF8',
    hex: 0x38bdf8,
    damageMult: 1.35,
    durabilityMult: 1.35,
  },
  epic: {
    id: 'epic',
    label: 'Эпический',
    color: '#A855F7',
    hex: 0xa855f7,
    damageMult: 1.85,
    durabilityMult: 1.7,
  },
  legendary: {
    id: 'legendary',
    label: 'Легендарный',
    color: '#F59E0B',
    hex: 0xf59e0b,
    damageMult: 2.65,
    durabilityMult: 2.3,
  },
};

export const WEAPON_TEMPLATES: Record<WeaponTypeId, WeaponTemplate> = {
  frying_pan: {
    id: 'frying_pan',
    name: 'Чугунная сковорода',
    description: 'Звонкий удар и мощный стан по голове',
    baseDamage: 36,
    baseDurability: 26,
    range: 3.2,
    arcAngle: Math.PI * 0.8,
    cooldown: 0.4,
    knockback: 7.5,
    heavyHitstop: 0.04,
    soundType: 'metal',
  },
  baseball_bat: {
    id: 'baseball_bat',
    name: 'Бита с гвоздями',
    description: 'Быстрый и широкий размах для толпы',
    baseDamage: 30,
    baseDurability: 30,
    range: 3.6,
    arcAngle: Math.PI * 0.88,
    cooldown: 0.34,
    knockback: 6.5,
    heavyHitstop: 0.032,
    soundType: 'wood',
  },
  road_sign: {
    id: 'road_sign',
    name: 'Знак «STOP»',
    description: 'Длинная рукоять и широкая дуга поражения',
    baseDamage: 44,
    baseDurability: 24,
    range: 4.4,
    arcAngle: Math.PI * 0.98,
    cooldown: 0.5,
    knockback: 9.2,
    heavyHitstop: 0.05,
    soundType: 'metal',
  },
  electric_guitar: {
    id: 'electric_guitar',
    name: 'Рок-гитара',
    description: 'Бьёт аккордами по широкому радиусу вокруг',
    baseDamage: 40,
    baseDurability: 22,
    range: 4.0,
    arcAngle: Math.PI * 1.3,
    cooldown: 0.42,
    knockback: 8.5,
    heavyHitstop: 0.045,
    soundType: 'guitar',
  },
  sledgehammer: {
    id: 'sledgehammer',
    name: 'Строительная кувалда',
    description: 'Сокрушительный урон и огромный отброс',
    baseDamage: 68,
    baseDurability: 20,
    range: 3.9,
    arcAngle: Math.PI * 0.92,
    cooldown: 0.62,
    knockback: 12.8,
    heavyHitstop: 0.06,
    soundType: 'heavy',
  },
  shopping_cart: {
    id: 'shopping_cart',
    name: 'Супермаркет-тележка',
    description: 'Таранит и раскидывает целую линию зомби',
    baseDamage: 50,
    baseDurability: 28,
    range: 4.2,
    arcAngle: Math.PI * 1.12,
    cooldown: 0.48,
    knockback: 11.2,
    heavyHitstop: 0.055,
    soundType: 'metal',
  },
  chainsaw: {
    id: 'chainsaw',
    name: 'Безумная бензопила',
    description: 'Сверхбыстрые серии ударов в ближнем бою',
    baseDamage: 28,
    baseDurability: 42,
    range: 3.4,
    arcAngle: Math.PI * 0.75,
    cooldown: 0.21,
    knockback: 4.5,
    heavyHitstop: 0.022,
    soundType: 'chainsaw',
  },
  traffic_cone: {
    id: 'traffic_cone',
    name: 'Дорожный конус',
    description: 'Лёгкий и невероятно быстрый подручный предмет',
    baseDamage: 24,
    baseDurability: 22,
    range: 3.0,
    arcAngle: Math.PI * 0.72,
    cooldown: 0.26,
    knockback: 5.2,
    heavyHitstop: 0.022,
    soundType: 'wood',
  },
};

export interface PerkOption {
  id: string;
  icon: string;
  shortTitle: string;
  title: string;
  description: string;
  badge: string;
  color: string;
  currentLevel?: number;
  nextLevel?: number;
}

export const PERK_POOL: PerkOption[] = [
  {
    id: 'chain_lightning',
    icon: '⚡',
    shortTitle: 'Молния',
    title: 'Цепная молния',
    description:
      'Усиливает дуговой разряд: уменьшает число ударов до срабатывания, повышает урон и количество целей подряд!',
    badge: 'Молния: чаще + мощнее',
    color: '#38BDF8',
  },
  {
    id: 'fire_nova',
    icon: '🔥',
    shortTitle: 'Огонь',
    title: 'Кольцо Феникса',
    description:
      'Создаёт расширяющееся огненное кольцо вокруг героя. С каждым уровнем срабатывает чаще, бьёт дальше и сильнее!',
    badge: 'Огненный взрыв вокруг',
    color: '#F97316',
  },
  {
    id: 'orbit_blades',
    icon: '🌀',
    shortTitle: 'Пилы',
    title: 'Призрачные пилы',
    description:
      'Вокруг героя непрерывно вращаются энергетические клинки. Каждый новый уровень добавляет ещё +1 клинок, ускоряет вращение и урон!',
    badge: '+Клинки и скорость пил',
    color: '#A855F7',
  },
  {
    id: 'frost_nova',
    icon: '❄️',
    shortTitle: 'Холод',
    title: 'Ледяной шторм',
    description:
      'Замораживает землю вокруг героя при ударах, нанося урон и сковывая врагов льдом. С уровнем растёт радиус, урон и частота!',
    badge: 'Кольцо холода + замедление',
    color: '#22D3EE',
  },
  {
    id: 'meteor_strike',
    icon: '☄️',
    shortTitle: 'Метеор',
    title: 'Звездопад гнева',
    description:
      'С неба падают пылающие метеориты прямо в гущу монстров! Каждый уровень увеличивает число метеоритов в залпе и сокращает перезарядку!',
    badge: 'Метеоритный залп с неба',
    color: '#EF4444',
  },
  {
    id: 'vampiric_strikes',
    icon: '🧛',
    shortTitle: 'Вампир',
    title: 'Кровавый драйв',
    description:
      'Периодически выпускает алую волну вампиризма и исцеляет героя. С каждым уровнем лечит больше HP и срабатывает чаще!',
    badge: 'Вампиризм + алая волна',
    color: '#F43F5E',
  },
  {
    id: 'iron_grip',
    icon: '🛡️',
    shortTitle: 'Прочность',
    title: 'Железная хватка',
    description:
      '+45% к запасу прочности всех предметов за каждый уровень навыка и мгновенный полный ремонт текущего оружия',
    badge: 'Прочность +45% / ур.',
    color: '#60A5FA',
  },
  {
    id: 'heavy_swing',
    icon: '💥',
    shortTitle: 'Урон',
    title: 'Сокрушительный размах',
    description:
      '+30% к урону всеми предметами и магическими навыками за каждый уровень, плюс усиленное отбрасывание',
    badge: 'Урон +30% / ур.',
    color: '#F59E0B',
  },
  {
    id: 'turbo_sneakers',
    icon: '👟',
    shortTitle: 'Скорость',
    title: 'Турбо-кроссовки',
    description:
      '+18% к скорости бега на 360 градусов за каждый уровень навыка для лёгкого уклонения от снарядов боссов',
    badge: 'Скорость +18% / ур.',
    color: '#10B981',
  },
  {
    id: 'whirlwind_reach',
    icon: '🌪️',
    shortTitle: 'Радиус',
    title: 'Гигантский замах',
    description:
      '+22% к радиусу и углу дуги удара всеми видами оружия за каждый уровень навыка',
    badge: 'Радиус +22% / ур.',
    color: '#C084FC',
  },
  {
    id: 'shatter_blast',
    icon: '💣',
    shortTitle: 'Взрыв',
    title: 'Осколочный финал',
    description:
      'При поломке оружия в руках происходит мощный взрыв вокруг героя. Каждый уровень повышает урон и радиус взрыва!',
    badge: 'Взрыв при поломке оружия',
    color: '#FB7185',
  },
  {
    id: 'titan_vitality',
    icon: '❤️',
    shortTitle: 'Здоровье',
    title: 'Закалка титана',
    description:
      '+55 к максимальному здоровью за каждый уровень навыка и мгновенное лечение на 70 HP',
    badge: 'Макс. HP +55 и лечение',
    color: '#4ADE80',
  },
];

export function getChainLightningCadence(level: number): number {
  const table = [10, 7, 5, 4, 3, 2];
  return table[Math.min(table.length - 1, Math.max(0, level))];
}

/**
 * Generates level-aware description and badge for any perk when leveling up
 */
export function buildLeveledPerkOption(
  base: PerkOption,
  currentLevel: number
): PerkOption {
  const nextLevel = currentLevel + 1;
  let badge = base.badge;
  let description = base.description;

  switch (base.id) {
    case 'chain_lightning': {
      const cadence = getChainLightningCadence(nextLevel);
      const targets = 4 + nextLevel * 2;
      const dmg = 70 + nextLevel * 40;
      badge = `Ур. ${nextLevel} · Каждый ${cadence}-й удар (${targets} цел.)`;
      description = `Разряд молнии бьёт каждый ${cadence}-й удар на ${dmg} ед. урона и перескакивает до ${targets} монстров подряд!`;
      break;
    }
    case 'fire_nova': {
      const cadence = Math.max(3, 9 - nextLevel);
      const radius = (5.0 + nextLevel * 1.2).toFixed(1);
      const dmg = 45 + nextLevel * 32;
      badge = `Ур. ${nextLevel} · Каждый ${cadence}-й удар (R=${radius}м)`;
      description = `Каждый ${cadence}-й удар выпускает огненное кольцо радиусом ${radius}м на ${dmg} урона с мощным отбросом!`;
      break;
    }
    case 'orbit_blades': {
      const count = 1 + nextLevel;
      const dmg = 24 + nextLevel * 14;
      badge = `Ур. ${nextLevel} · ${count} вращающихся клинка`;
      description = `Вокруг героя вращаются ${count} энергетических клинка с повышенной скоростью, нанося по ${dmg} урона при касании!`;
      break;
    }
    case 'frost_nova': {
      const cadence = Math.max(3, 8 - nextLevel);
      const radius = (5.5 + nextLevel * 1.25).toFixed(1);
      const dmg = 34 + nextLevel * 26;
      const slowPct = Math.min(80, 45 + nextLevel * 8);
      badge = `Ур. ${nextLevel} · Каждый ${cadence}-й удар (-${slowPct}% скор.)`;
      description = `Каждый ${cadence}-й удар замораживает врагов в радиусе ${radius}м на ${dmg} урона и замедляет их на ${slowPct}%!`;
      break;
    }
    case 'meteor_strike': {
      const cd = Math.max(1.6, 5.0 - nextLevel * 0.65).toFixed(1);
      const count = nextLevel;
      const dmg = 95 + nextLevel * 45;
      badge = `Ур. ${nextLevel} · ${count} метеор(а) каждые ${cd}с`;
      description = `Каждые ${cd}с с неба обрушивается залп из ${count} метеоритов по ${dmg} урона каждый в гущу монстров!`;
      break;
    }
    case 'vampiric_strikes': {
      const cadence = Math.max(3, 11 - nextLevel * 2);
      const heal = 10 + nextLevel * 6;
      const dmg = 38 + nextLevel * 26;
      badge = `Ур. ${nextLevel} · Каждый ${cadence}-й удар (+${heal} HP)`;
      description = `Каждый ${cadence}-й удар лечит героя на +${heal} HP и выпускает кровавую волну вокруг на ${dmg} урона!`;
      break;
    }
    case 'iron_grip': {
      badge = `Ур. ${nextLevel} · Прочность +${nextLevel * 45}%`;
      description = `Запас прочности оружия увеличен суммарно на +${nextLevel * 45}%, текущее оружие полностью чинится!`;
      break;
    }
    case 'heavy_swing': {
      badge = `Ур. ${nextLevel} · Урон +${nextLevel * 30}%`;
      description = `Урон оружием и всеми боевыми навыками увеличен суммарно на +${nextLevel * 30}%, усилен отброс врагов!`;
      break;
    }
    case 'turbo_sneakers': {
      badge = `Ур. ${nextLevel} · Скорость +${nextLevel * 18}%`;
      description = `Скорость бега во все стороны увеличена суммарно на +${nextLevel * 18}% для манёвров против боссов!`;
      break;
    }
    case 'whirlwind_reach': {
      badge = `Ур. ${nextLevel} · Радиус +${nextLevel * 22}%`;
      description = `Дальность и ширина дуги взмаха оружием увеличены суммарно на +${nextLevel * 22}%!`;
      break;
    }
    case 'shatter_blast': {
      const dmg = 140 + nextLevel * 75;
      badge = `Ур. ${nextLevel} · Взрыв на ${dmg} урона`;
      description = `Поломка оружия вызывает сокрушительный взрыв вокруг героя на ${dmg} урона и отбрасывает орду!`;
      break;
    }
    case 'titan_vitality': {
      badge = `Ур. ${nextLevel} · Макс. HP +${nextLevel * 55}`;
      description = `Даёт ещё +55 к максимальному здоровью (всего +${nextLevel * 55} HP) и мгновенно лечит на 70 HP!`;
      break;
    }
  }

  return {
    ...base,
    badge,
    description,
    currentLevel,
    nextLevel,
  };
}

export interface BiomeMonsterPalette {
  skin: number;
  coat: number;
  accent: number;
}

export interface BiomeConfig {
  id: string;
  name: string;
  timeLabel: string;
  groundColor: number;
  roadColor: number;
  fogColor: number;
  skyLightColor: number;
  groundLightColor: number;
  sunLightColor: number;
  sunIntensity: number;
  foliageColor: number;
  secondaryFoliageColor: number;
  houseWallColor: number;
  houseRoofColor: number;
  monsterPalette: BiomeMonsterPalette;
}

export const BIOMES: BiomeConfig[] = [
  {
    id: 'sunny_coral_boulevard',
    name: 'Уровень 1 · Солнечный Бульвар',
    timeLabel: 'Солнечный полдень',
    groundColor: 0x2ea043,
    roadColor: 0x334155,
    fogColor: 0x38bdf8,
    skyLightColor: 0x7dd3fc,
    groundLightColor: 0x22c55e,
    sunLightColor: 0xfffbeb,
    sunIntensity: 2.4,
    foliageColor: 0x22c55e,
    secondaryFoliageColor: 0xf43f5e,
    houseWallColor: 0xfef3c7,
    houseRoofColor: 0xe11d48,
    // Vivid violet & crimson monsters that pop sharply against green grass
    monsterPalette: {
      skin: 0xc084fc,
      coat: 0x991b1b,
      accent: 0xfacc15,
    },
  },
  {
    id: 'neon_sakura_district',
    name: 'Уровень 2 · Неоновая Сакура',
    timeLabel: 'Кибер-сумерки',
    groundColor: 0x3b1d5e,
    roadColor: 0x1e1b4b,
    fogColor: 0x4c1d95,
    skyLightColor: 0xf472b6,
    groundLightColor: 0x38bdf8,
    sunLightColor: 0xf9a8d4,
    sunIntensity: 2.3,
    foliageColor: 0xec4899,
    secondaryFoliageColor: 0x22d3ee,
    houseWallColor: 0xe0e7ff,
    houseRoofColor: 0x9333ea,
    // Bright neon-lime & cyan monsters that stand out clearly on dark purple floor
    monsterPalette: {
      skin: 0xa3e635,
      coat: 0x0f766e,
      accent: 0x22d3ee,
    },
  },
  {
    id: 'golden_autumn_valley',
    name: 'Уровень 3 · Золотая Осень',
    timeLabel: 'Янтарный закат',
    groundColor: 0xb45309,
    roadColor: 0x292524,
    fogColor: 0xd97706,
    skyLightColor: 0xfde047,
    groundLightColor: 0x9a3412,
    sunLightColor: 0xfdba74,
    sunIntensity: 2.45,
    foliageColor: 0xf97316,
    secondaryFoliageColor: 0xeab308,
    houseWallColor: 0xffedd5,
    houseRoofColor: 0x991b1b,
    // Frost-cyan & cobalt monsters contrasting against warm autumn orange
    monsterPalette: {
      skin: 0x38bdf8,
      coat: 0x1e3a8a,
      accent: 0xf43f5e,
    },
  },
  {
    id: 'emerald_oasis_lagoon',
    name: 'Уровень 4 · Лазурная Лагуна',
    timeLabel: 'Тропический бриз',
    groundColor: 0x0d9488,
    roadColor: 0x1e293b,
    fogColor: 0x06b6d4,
    skyLightColor: 0x67e8f9,
    groundLightColor: 0x10b981,
    sunLightColor: 0xfef9c3,
    sunIntensity: 2.5,
    foliageColor: 0x84cc16,
    secondaryFoliageColor: 0x06b6d4,
    houseWallColor: 0xf0fdf4,
    houseRoofColor: 0x0284c7,
    // Warm coral-rose & ruby monsters contrasting against cool turquoise lagoon
    monsterPalette: {
      skin: 0xfb7185,
      coat: 0x881337,
      accent: 0xfde047,
    },
  },
  {
    id: 'crimson_carnival',
    name: 'Уровень 5 · Кристальный Карнавал',
    timeLabel: 'Аврора',
    groundColor: 0x701a75,
    roadColor: 0x311042,
    fogColor: 0x86198f,
    skyLightColor: 0xf0abfc,
    groundLightColor: 0x6366f1,
    sunLightColor: 0xfde047,
    sunIntensity: 2.4,
    foliageColor: 0xa855f7,
    secondaryFoliageColor: 0xfacc15,
    houseWallColor: 0xfdf4ff,
    houseRoofColor: 0xdb2777,
    // Bright mint-emerald & gold monsters against deep magenta carnival ground
    monsterPalette: {
      skin: 0x4ade80,
      coat: 0x065f46,
      accent: 0xfef08a,
    },
  },
  {
    id: 'desert_mirage_canyon',
    name: 'Уровень 6 · Песчаный Мираж',
    timeLabel: 'Знойный каньон',
    groundColor: 0xd97706,
    roadColor: 0x451a03,
    fogColor: 0xf59e0b,
    skyLightColor: 0xfef08a,
    groundLightColor: 0xb45309,
    sunLightColor: 0xfff7ed,
    sunIntensity: 2.6,
    foliageColor: 0x16a34a,
    secondaryFoliageColor: 0xfacc15,
    houseWallColor: 0xfef3c7,
    houseRoofColor: 0xc2410c,
    // Royal amethyst & electric cyan monsters contrasting against golden desert sand
    monsterPalette: {
      skin: 0xa855f7,
      coat: 0x3b0764,
      accent: 0x22d3ee,
    },
  },
  {
    id: 'frozen_crystal_tundra',
    name: 'Уровень 7 · Ледяная Тундра',
    timeLabel: 'Полярное сияние',
    groundColor: 0x0284c7,
    roadColor: 0x0f172a,
    fogColor: 0x38bdf8,
    skyLightColor: 0xe0f2fe,
    groundLightColor: 0x0369a1,
    sunLightColor: 0xf0f9ff,
    sunIntensity: 2.35,
    foliageColor: 0x38bdf8,
    secondaryFoliageColor: 0xa5f3fc,
    houseWallColor: 0xf8fafc,
    houseRoofColor: 0x2563eb,
    // Fiery magma-orange & dark crimson monsters on icy blue tundra
    monsterPalette: {
      skin: 0xf97316,
      coat: 0x7f1d1d,
      accent: 0xfef08a,
    },
  },
  {
    id: 'candy_sugar_kingdom',
    name: 'Уровень 8 · Конфетное Королевство',
    timeLabel: 'Сахарный рассвет',
    groundColor: 0xdb2777,
    roadColor: 0x4c1d95,
    fogColor: 0xf472b6,
    skyLightColor: 0xfbcfe8,
    groundLightColor: 0xc026d3,
    sunLightColor: 0xfff1f2,
    sunIntensity: 2.45,
    foliageColor: 0x2dd4bf,
    secondaryFoliageColor: 0xfde047,
    houseWallColor: 0xfff1f2,
    houseRoofColor: 0xec4899,
    // Electric turquoise-mint & deep navy monsters on pink candy floor
    monsterPalette: {
      skin: 0x2dd4bf,
      coat: 0x1e3a8a,
      accent: 0xfacc15,
    },
  },
  {
    id: 'magma_volcano_crater',
    name: 'Уровень 9 · Вулканический Кратер',
    timeLabel: 'Пепельный шторм',
    groundColor: 0x7f1d1d,
    roadColor: 0x18181b,
    fogColor: 0x991b1b,
    skyLightColor: 0xfb923c,
    groundLightColor: 0xdc2626,
    sunLightColor: 0xfed7aa,
    sunIntensity: 2.4,
    foliageColor: 0xf97316,
    secondaryFoliageColor: 0xef4444,
    houseWallColor: 0xfecaca,
    houseRoofColor: 0x450a0a,
    // Bright ice-blue & neon-lime monsters contrasting with dark red volcano
    monsterPalette: {
      skin: 0x7dd3fc,
      coat: 0x0c4a6e,
      accent: 0xa3e635,
    },
  },
  {
    id: 'starlight_cyber_citadel',
    name: 'Уровень 10 · Звёздная Цитадель',
    timeLabel: 'Галактическая ночь',
    groundColor: 0x1e1b4b,
    roadColor: 0x090d16,
    fogColor: 0x312e81,
    skyLightColor: 0x818cf8,
    groundLightColor: 0x22d3ee,
    sunLightColor: 0xe0e7ff,
    sunIntensity: 2.5,
    foliageColor: 0x06b6d4,
    secondaryFoliageColor: 0xa855f7,
    houseWallColor: 0xe2e8f0,
    houseRoofColor: 0x4f46e5,
    // Radiant solar-gold & crimson monsters against dark starlight navy
    monsterPalette: {
      skin: 0xfacc15,
      coat: 0xbe123c,
      accent: 0x22d3ee,
    },
  },
];

export const CHARACTER_PRESETS: CharacterAppearance[] = [
  {
    name: 'Лис Кицунэ',
    tagline: 'Рыжий лис-самурай с пушистыми ушами и хвостом',
    prompt:
      'Рыжий лис-самурай с большими лисьими ушками, пушистым двухцветным хвостом, острой лисьей мордочкой и катаной за спиной',
    colors: {
      skin: '#F97316',
      shirt: '#1E293B',
      pants: '#0F172A',
      shoes: '#DC2626',
      hair: '#EA580C',
      accent: '#FEF3C7',
    },
    proportions: {
      heightScale: 1.04,
      torsoWidth: 0.94,
      headScale: 1.08,
      limbThickness: 0.92,
    },
    accessories: {
      headgear: 'none',
      eyewear: 'none',
      backItem: 'katana_sheath',
      facialHair: 'none',
      ears: 'fox_ears',
      tail: 'fox_tail',
      muzzle: 'fox_muzzle',
    },
  },
  {
    name: 'Котик Нэко',
    tagline: 'Неоновый котик с ушками, усиками и гибким хвостом',
    prompt:
      'Ловкий чёрно-бирюзовый котик с кошачьими ушками, милой мордочкой с усами, длинным кошачьим хвостом и кибер-визором',
    colors: {
      skin: '#334155',
      shirt: '#06B6D4',
      pants: '#0F172A',
      shoes: '#EC4899',
      hair: '#1E293B',
      accent: '#F472B6',
    },
    proportions: {
      heightScale: 0.98,
      torsoWidth: 0.9,
      headScale: 1.12,
      limbThickness: 0.88,
    },
    accessories: {
      headgear: 'none',
      eyewear: 'visor',
      backItem: 'guitar_case',
      facialHair: 'none',
      ears: 'cat_ears',
      tail: 'cat_tail',
      muzzle: 'cat_muzzle',
    },
  },
  {
    name: 'Слоник Дамбо',
    tagline: 'Могучий слоник с большими ушами, хоботом и бивнями',
    prompt:
      'Добрый и сильный голубовато-серый слоник с огромными ушами, длинным хоботом, белыми бивнями и хвостиком',
    colors: {
      skin: '#94A3B8',
      shirt: '#F59E0B',
      pants: '#1E3A8A',
      shoes: '#EF4444',
      hair: '#64748B',
      accent: '#FDE047',
    },
    proportions: {
      heightScale: 1.08,
      torsoWidth: 1.32,
      headScale: 1.16,
      limbThickness: 1.25,
    },
    accessories: {
      headgear: 'none',
      eyewear: 'none',
      backItem: 'backpack',
      facialHair: 'none',
      ears: 'elephant_ears',
      tail: 'elephant_tail',
      muzzle: 'elephant_trunk',
    },
  },
  {
    name: 'Крокодил Рекс',
    tagline: 'Зубастый аллигатор с гребнем и мощным хвостом',
    prompt:
      'Изумрудный крокодил-выживший с длинной зубастой пастью, шипастым гребнем и мощным крокодильим хвостом',
    colors: {
      skin: '#16A34A',
      shirt: '#78350F',
      pants: '#1E293B',
      shoes: '#F59E0B',
      hair: '#15803D',
      accent: '#A3E635',
    },
    proportions: {
      heightScale: 1.08,
      torsoWidth: 1.24,
      headScale: 1.1,
      limbThickness: 1.18,
    },
    accessories: {
      headgear: 'none',
      eyewear: 'sunglasses',
      backItem: 'none',
      facialHair: 'none',
      ears: 'croc_ridge',
      tail: 'croc_tail',
      muzzle: 'croc_snout',
    },
  },
  {
    name: 'Лев Симба',
    tagline: 'Царь зверей с пышной золотой гривой и кисточкой на хвосте',
    prompt:
      'Золотой лев-воин с густой рыжей гривой вокруг головы, львиной мордой, хвостом с кисточкой и королевским плащом',
    colors: {
      skin: '#F59E0B',
      shirt: '#DC2626',
      pants: '#1E293B',
      shoes: '#FACC15',
      hair: '#B45309',
      accent: '#FDE047',
    },
    proportions: {
      heightScale: 1.12,
      torsoWidth: 1.22,
      headScale: 1.14,
      limbThickness: 1.16,
    },
    accessories: {
      headgear: 'none',
      eyewear: 'none',
      backItem: 'cape',
      facialHair: 'none',
      ears: 'lion_mane',
      tail: 'lion_tail',
      muzzle: 'lion_muzzle',
    },
  },
  {
    name: 'Волк Фенрир',
    tagline: 'Серый северный волк с ушами и пушистым хвостом',
    prompt:
      'Могучий серый волк-охотник с волчьими ушами, клыкастой мордой, волчьим хвостом и тактическими очками',
    colors: {
      skin: '#64748B',
      shirt: '#7C2D12',
      pants: '#1E293B',
      shoes: '#0F172A',
      hair: '#475569',
      accent: '#F59E0B',
    },
    proportions: {
      heightScale: 1.1,
      torsoWidth: 1.18,
      headScale: 1.06,
      limbThickness: 1.12,
    },
    accessories: {
      headgear: 'none',
      eyewear: 'goggles',
      backItem: 'backpack',
      facialHair: 'none',
      ears: 'wolf_ears',
      tail: 'wolf_tail',
      muzzle: 'wolf_muzzle',
    },
  },
  {
    name: 'Зайка Джуди',
    tagline: 'Сверхбыстрый белый кролик с длинными ушками и пушком',
    prompt:
      'Белоснежный кролик-спецназовец с длинными заячьими ушками, розовым носиком и пушистым хвостиком',
    colors: {
      skin: '#F8FAFC',
      shirt: '#3B82F6',
      pants: '#1E3A8A',
      shoes: '#EC4899',
      hair: '#E2E8F0',
      accent: '#F472B6',
    },
    proportions: {
      heightScale: 0.96,
      torsoWidth: 0.9,
      headScale: 1.1,
      limbThickness: 0.9,
    },
    accessories: {
      headgear: 'none',
      eyewear: 'none',
      backItem: 'jetpack',
      facialHair: 'none',
      ears: 'bunny_ears',
      tail: 'bunny_tail',
      muzzle: 'bunny_muzzle',
    },
  },
  {
    name: 'Панда По',
    tagline: 'Мастер кунг-фу с круглыми ушками и мощным торсом',
    prompt:
      'Круглый и мощный медведь-панда с чёрными ушками, мордочкой и золотым поясом',
    colors: {
      skin: '#F8FAFC',
      shirt: '#1E293B',
      pants: '#0F172A',
      shoes: '#F59E0B',
      hair: '#0F172A',
      accent: '#10B981',
    },
    proportions: {
      heightScale: 1.05,
      torsoWidth: 1.35,
      headScale: 1.15,
      limbThickness: 1.25,
    },
    accessories: {
      headgear: 'none',
      eyewear: 'none',
      backItem: 'katana_sheath',
      facialHair: 'none',
      ears: 'bear_ears',
      tail: 'bunny_tail',
      muzzle: 'wolf_muzzle',
    },
  },
  {
    name: 'Лягушонок Пепе',
    tagline: 'Весёлая зелёная лягушка с большими глазами на макушке',
    prompt:
      'Ярко-зелёный лягушонок в худи с большими выпуклыми лягушачьими глазами и широкой улыбкой',
    colors: {
      skin: '#22C55E',
      shirt: '#3B82F6',
      pants: '#1E293B',
      shoes: '#FACC15',
      hair: '#16A34A',
      accent: '#F43F5E',
    },
    proportions: {
      heightScale: 0.95,
      torsoWidth: 1.08,
      headScale: 1.18,
      limbThickness: 0.95,
    },
    accessories: {
      headgear: 'none',
      eyewear: 'none',
      backItem: 'backpack',
      facialHair: 'none',
      ears: 'frog_eyes',
      tail: 'none',
      muzzle: 'frog_muzzle',
    },
  },
  {
    name: 'Акула Мако',
    tagline: 'Морской хищник с плавником и зубастой ухмылкой',
    prompt:
      'Сине-стальная акула-серфер с высоким плавником, акульим хвостом и очками',
    colors: {
      skin: '#0284C7',
      shirt: '#F97316',
      pants: '#0F172A',
      shoes: '#38BDF8',
      hair: '#0369A1',
      accent: '#22D3EE',
    },
    proportions: {
      heightScale: 1.08,
      torsoWidth: 1.18,
      headScale: 1.1,
      limbThickness: 1.08,
    },
    accessories: {
      headgear: 'none',
      eyewear: 'sunglasses',
      backItem: 'guitar_case',
      facialHair: 'none',
      ears: 'shark_fin',
      tail: 'shark_tail',
      muzzle: 'shark_muzzle',
    },
  },
  {
    name: 'Олень Рудольф',
    tagline: 'Лесной страж с ветвистыми рогами и пушистым хвостиком',
    prompt:
      'Благородный лесной олень с красивыми ветвистыми рогами, оленьей мордочкой и плащом',
    colors: {
      skin: '#B45309',
      shirt: '#059669',
      pants: '#1E293B',
      shoes: '#78350F',
      hair: '#78350F',
      accent: '#FDE047',
    },
    proportions: {
      heightScale: 1.12,
      torsoWidth: 1.0,
      headScale: 1.08,
      limbThickness: 0.96,
    },
    accessories: {
      headgear: 'none',
      eyewear: 'none',
      backItem: 'cape',
      facialHair: 'none',
      ears: 'deer_antlers',
      tail: 'bunny_tail',
      muzzle: 'deer_muzzle',
    },
  },
  {
    name: 'Демон Инферно',
    tagline: 'Огненный демон с витыми рогами и хвостом-стрелой',
    prompt:
      'Крылатый багровый демон с золотыми рогами и дьявольским хвостом',
    colors: {
      skin: '#EF4444',
      shirt: '#1E1B4B',
      pants: '#090D16',
      shoes: '#F59E0B',
      hair: '#1E293B',
      accent: '#FACC15',
    },
    proportions: {
      heightScale: 1.1,
      torsoWidth: 1.16,
      headScale: 1.06,
      limbThickness: 1.1,
    },
    accessories: {
      headgear: 'none',
      eyewear: 'visor',
      backItem: 'cape',
      facialHair: 'none',
      ears: 'demon_horns',
      tail: 'devil_tail',
      muzzle: 'none',
    },
  },
];

export type GamePhase = 'title' | 'playing' | 'levelup' | 'paused' | 'gameover';

export type EnemyVariant =
  | 'walker'
  | 'runner'
  | 'brute'
  | 'spitter'
  | 'bomber'
  | 'necromancer'
  | 'mini_skeleton'
  | 'boss';

export interface ActiveBossHud {
  name: string;
  subtitle: string;
  hp: number;
  maxHp: number;
  phase: 1 | 2 | 3;
  phaseLabel: string;
  isGrandBoss?: boolean;
}

export interface NearbyItemPrompt {
  name: string;
  rarity: WeaponRarity;
  damage: number;
}

export interface SavedRunState {
  savedAt: number;
  hp: number;
  maxHp: number;
  xp: number;
  xpToNext: number;
  level: number;
  stageNumber: number;
  biomeIndex: number;
  score: number;
  kills: number;
  bossesDefeated: number;
  elapsedTime: number;
  nextBossTimer: number;
  weapon: EquippedWeapon | null;
  perkLevels: Record<string, number>;
  activePerks: string[];
  hitCount: number;
  weaponUsageCount: Record<string, number>;
}

export interface GameHudState {
  phase: GamePhase;
  hp: number;
  maxHp: number;
  xp: number;
  xpToNext: number;
  level: number;
  stageNumber: number;
  stageAnnouncement: string | null;
  stageTransitionProgress: number;
  isBerserk: boolean;
  deathTimer: number;
  score: number;
  kills: number;
  bossesDefeated: number;
  elapsedTime: number;
  nextBossIn: number;
  biomeIndex: number;
  weapon: EquippedWeapon | null;
  nearbyItem: NearbyItemPrompt | null;
  activeBoss: ActiveBossHud | null;
  autoAttack: boolean;
  comboCount: number;
  hitCount: number;
  activePerks: string[];
  perkLevels: Record<string, number>;
  levelUpChoices: PerkOption[];
  favoriteWeaponName: string;
  runCoins: number;
}

export type MetaUpgradeId =
  | 'meta_damage'
  | 'meta_hp'
  | 'meta_speed'
  | 'meta_durability'
  | 'meta_xp'
  | 'meta_coins'
  | 'meta_start_weapon'
  | 'meta_regen'
  | 'meta_crit'
  | 'meta_armor';

export interface MetaUpgradeDef {
  id: MetaUpgradeId;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
  color: string;
  maxLevel: number;
  baseCost: number;
  costStep: number;
  perLevelLabel: (lvl: number) => string;
}

export const META_UPGRADES: MetaUpgradeDef[] = [
  {
    id: 'meta_damage',
    title: 'Сила крушения',
    shortTitle: 'Урон',
    description: 'Постоянно увеличивает урон кулаков и любого оружия',
    icon: '⚔️',
    color: '#F59E0B',
    maxLevel: 15,
    baseCost: 45,
    costStep: 35,
    perLevelLabel: (lvl) => `+${lvl * 8}% к урону`,
  },
  {
    id: 'meta_hp',
    title: 'Богатырское здоровье',
    shortTitle: 'Здоровье',
    description: 'Увеличивает максимальный запас здоровья со старта забега',
    icon: '❤️',
    color: '#22C55E',
    maxLevel: 15,
    baseCost: 40,
    costStep: 30,
    perLevelLabel: (lvl) => `+${lvl * 22} макс. HP`,
  },
  {
    id: 'meta_speed',
    title: 'Скороходы',
    shortTitle: 'Скорость',
    description: 'Повышает скорость бега и манёвренность персонажа',
    icon: '👟',
    color: '#10B981',
    maxLevel: 10,
    baseCost: 50,
    costStep: 40,
    perLevelLabel: (lvl) => `+${lvl * 4}% к скорости`,
  },
  {
    id: 'meta_durability',
    title: 'Титановая закалка',
    shortTitle: 'Прочность',
    description: 'Любое найденное оружие служит значительно дольше',
    icon: '🛡️',
    color: '#38BDF8',
    maxLevel: 10,
    baseCost: 45,
    costStep: 35,
    perLevelLabel: (lvl) => `+${lvl * 12}% прочности`,
  },
  {
    id: 'meta_xp',
    title: 'Магнит знаний',
    shortTitle: 'Опыт (XP)',
    description: 'Увеличивает количество опыта со всех кристаллов',
    icon: '💎',
    color: '#A855F7',
    maxLevel: 10,
    baseCost: 55,
    costStep: 45,
    perLevelLabel: (lvl) => `+${lvl * 10}% к опыту`,
  },
  {
    id: 'meta_coins',
    title: 'Золотая лихорадка',
    shortTitle: 'Монеты',
    description: 'Увеличивает добычу золотых монет с боссов, этапов и декораций',
    icon: '🪙',
    color: '#FACC15',
    maxLevel: 10,
    baseCost: 60,
    costStep: 50,
    perLevelLabel: (lvl) => `+${lvl * 12}% монет`,
  },
  {
    id: 'meta_start_weapon',
    title: 'Стартовый арсенал',
    shortTitle: 'Старт-оружие',
    description: 'Вы начинаете забег сразу с оружием в руках (выше уровень — выше редкость)',
    icon: '🎸',
    color: '#EC4899',
    maxLevel: 4,
    baseCost: 120,
    costStep: 160,
    perLevelLabel: (lvl) =>
      lvl <= 0
        ? 'Без оружия'
        : lvl === 1
        ? 'Обычное оружие'
        : lvl === 2
        ? 'Редкое оружие'
        : lvl === 3
        ? 'Эпическое оружие'
        : 'Легендарное оружие',
  },
  {
    id: 'meta_regen',
    title: 'Живая кровь',
    shortTitle: 'Регенерация',
    description: 'Пассивно восстанавливает здоровье каждую секунду боя',
    icon: '🧪',
    color: '#FB7185',
    maxLevel: 10,
    baseCost: 65,
    costStep: 50,
    perLevelLabel: (lvl) => `+${(lvl * 1.5).toFixed(1)} HP/сек`,
  },
  {
    id: 'meta_crit',
    title: 'Критический раскол',
    shortTitle: 'Шанс крита',
    description: 'Шанс нанести 200% критического урона с золотой вспышкой',
    icon: '💥',
    color: '#F97316',
    maxLevel: 10,
    baseCost: 70,
    costStep: 55,
    perLevelLabel: (lvl) => `${lvl * 5}% шанс (2× урон)`,
  },
  {
    id: 'meta_armor',
    title: 'Каменная шкура',
    shortTitle: 'Броня',
    description: 'Снижает весь входящий урон от монстров и боссов',
    icon: '🪨',
    color: '#94A3B8',
    maxLevel: 10,
    baseCost: 65,
    costStep: 50,
    perLevelLabel: (lvl) => `-${lvl * 5}% входящего урона`,
  },
];

export function getMetaUpgradeCost(def: MetaUpgradeDef, currentLevel: number): number {
  return def.baseCost + currentLevel * def.costStep;
}

export type AchievementStatKey =
  | 'totalKills'
  | 'totalPropsSmashed'
  | 'berserkKills'
  | 'bossesKilled'
  | 'grandBossesKilled'
  | 'highestStageCleared'
  | 'totalCoinsEarned'
  | 'maxLevelReached';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  statKey: AchievementStatKey;
  targetValue: number;
  coinReward: number;
  rewardTitle: string;
  frameColor: string;
}

export const ACHIEVEMENTS_LIST: AchievementDef[] = [
  {
    id: 'ach_first_blood',
    title: 'Первая сотня',
    description: 'Сокрушите 100 монстров за все забеги',
    icon: '⚔️',
    statKey: 'totalKills',
    targetValue: 100,
    coinReward: 100,
    rewardTitle: 'Охотник на Нежить',
    frameColor: '#38BDF8',
  },
  {
    id: 'ach_slayer_500',
    title: 'Мясорубка',
    description: 'Сокрушите 500 монстров за все забеги',
    icon: '💀',
    statKey: 'totalKills',
    targetValue: 500,
    coinReward: 250,
    rewardTitle: 'Палач Орды',
    frameColor: '#EF4444',
  },
  {
    id: 'ach_slayer_1500',
    title: 'Легенда Выживания',
    description: 'Сокрушите 1 500 монстров за все забеги',
    icon: '👑',
    statKey: 'totalKills',
    targetValue: 1500,
    coinReward: 600,
    rewardTitle: 'Бессмертный Император',
    frameColor: '#FACC15',
  },
  {
    id: 'ach_smasher_50',
    title: 'Уличный Вандал',
    description: 'Разнесите 50 декораций окружения (машин, домов, статуй)',
    icon: '🔨',
    statKey: 'totalPropsSmashed',
    targetValue: 50,
    coinReward: 120,
    rewardTitle: 'Гроза Квартала',
    frameColor: '#F97316',
  },
  {
    id: 'ach_smasher_250',
    title: 'Тотальный Демонтаж',
    description: 'Разнесите 250 объектов окружения',
    icon: '🚜',
    statKey: 'totalPropsSmashed',
    targetValue: 250,
    coinReward: 320,
    rewardTitle: 'Архитектор Хаоса',
    frameColor: '#FB923C',
  },
  {
    id: 'ach_berserk_30',
    title: 'Кровавая Ярость',
    description: 'Убейте 30 монстров, находясь в режиме Берсерка (HP < 20%)',
    icon: '🔥',
    statKey: 'berserkKills',
    targetValue: 30,
    coinReward: 220,
    rewardTitle: 'Яростный Берсерк',
    frameColor: '#F43F5E',
  },
  {
    id: 'ach_berserk_120',
    title: 'На Грани Смерти',
    description: 'Убейте 120 монстров в режиме Берсерка',
    icon: '🩸',
    statKey: 'berserkKills',
    targetValue: 120,
    coinReward: 480,
    rewardTitle: 'Неудержимый Демон',
    frameColor: '#E11D48',
  },
  {
    id: 'ach_boss_3',
    title: 'Истребитель Гигантов',
    description: 'Победите 3 боссов этапов',
    icon: '🏆',
    statKey: 'bossesKilled',
    targetValue: 3,
    coinReward: 180,
    rewardTitle: 'Сокрушитель Боссов',
    frameColor: '#A855F7',
  },
  {
    id: 'ach_stage_10',
    title: 'Покоритель Десятки',
    description: 'Одолейте Гранд-Босса 10-го этапа и откройте чекпоинт 11-го этапа',
    icon: '🌟',
    statKey: 'highestStageCleared',
    targetValue: 10,
    coinReward: 500,
    rewardTitle: 'Покоритель Десятки',
    frameColor: '#F59E0B',
  },
  {
    id: 'ach_stage_20',
    title: 'Властелин Двадцатки',
    description: 'Одолейте Гранд-Босса 20-го этапа и откройте чекпоинт 21-го этапа',
    icon: '⚡',
    statKey: 'highestStageCleared',
    targetValue: 20,
    coinReward: 1000,
    rewardTitle: 'Владыка Арены',
    frameColor: '#22D3EE',
  },
  {
    id: 'ach_rich_1000',
    title: 'Золотой Магнат',
    description: 'Соберите суммарно 1 000 золотых монет',
    icon: '💰',
    statKey: 'totalCoinsEarned',
    targetValue: 1000,
    coinReward: 300,
    rewardTitle: 'Золотой Барон',
    frameColor: '#FDE047',
  },
  {
    id: 'ach_level_12',
    title: 'Мастер Навыков',
    description: 'Достигните 12-го уровня персонажа в рамках одного забега',
    icon: '✨',
    statKey: 'maxLevelReached',
    targetValue: 12,
    coinReward: 280,
    rewardTitle: 'Верховный Мастер',
    frameColor: '#10B981',
  },
];

export interface MetaProgressionState {
  coins: number;
  totalCoinsEarned: number;
  upgradeLevels: Record<MetaUpgradeId, number>;
  unlockedCheckpoints: number[];
  selectedCheckpoint: number;
  unlockedAchievements: string[];
  selectedTitleAchievementId: string | null;
  stats: {
    totalKills: number;
    totalPropsSmashed: number;
    berserkKills: number;
    bossesKilled: number;
    grandBossesKilled: number;
    highestStageCleared: number;
    maxLevelReached: number;
  };
}

export const DEFAULT_META_PROGRESSION: MetaProgressionState = {
  coins: 120,
  totalCoinsEarned: 120,
  upgradeLevels: {
    meta_damage: 0,
    meta_hp: 0,
    meta_speed: 0,
    meta_durability: 0,
    meta_xp: 0,
    meta_coins: 0,
    meta_start_weapon: 0,
    meta_regen: 0,
    meta_crit: 0,
    meta_armor: 0,
  },
  unlockedCheckpoints: [1],
  selectedCheckpoint: 1,
  unlockedAchievements: [],
  selectedTitleAchievementId: null,
  stats: {
    totalKills: 0,
    totalPropsSmashed: 0,
    berserkKills: 0,
    bossesKilled: 0,
    grandBossesKilled: 0,
    highestStageCleared: 0,
    maxLevelReached: 1,
  },
};

export interface ComputedMetaBonuses {
  damageMult: number;
  bonusHp: number;
  speedMult: number;
  durabilityMult: number;
  xpMult: number;
  coinMult: number;
  startWeaponTier: number;
  hpRegenPerSec: number;
  critChance: number;
  damageReduction: number;
}

export function computeMetaBonuses(
  meta: MetaProgressionState
): ComputedMetaBonuses {
  const u = meta.upgradeLevels || DEFAULT_META_PROGRESSION.upgradeLevels;
  return {
    damageMult: 1 + (u.meta_damage || 0) * 0.08,
    bonusHp: (u.meta_hp || 0) * 22,
    speedMult: 1 + (u.meta_speed || 0) * 0.04,
    durabilityMult: 1 + (u.meta_durability || 0) * 0.12,
    xpMult: 1 + (u.meta_xp || 0) * 0.1,
    coinMult: 1 + (u.meta_coins || 0) * 0.12,
    startWeaponTier: Math.min(4, u.meta_start_weapon || 0),
    hpRegenPerSec: (u.meta_regen || 0) * 1.5,
    critChance: Math.min(0.6, (u.meta_crit || 0) * 0.05),
    damageReduction: Math.min(0.5, (u.meta_armor || 0) * 0.05),
  };
}

