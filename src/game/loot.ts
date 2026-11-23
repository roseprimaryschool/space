import type { ComputedPlayerStats, CosmeticPalette, LootItem, Rarity } from './types';

export const COSMETIC_PALETTES: Record<string, CosmeticPalette> = {
  obsidian: {
    chassisHex: 0x3b4459,
    accentHex: 0x06b6d4,
    visorHex: 0x38bdf8,
    cssSwatch: '#06b6d4',
  },
  emerald: {
    chassisHex: 0x244a42,
    accentHex: 0x34d399,
    visorHex: 0x6ee7b7,
    cssSwatch: '#34d399',
  },
  amethyst: {
    chassisHex: 0x362954,
    accentHex: 0xa855f7,
    visorHex: 0xd8b4fe,
    cssSwatch: '#a855f7',
  },
  solaris: {
    chassisHex: 0x5c4724,
    accentHex: 0xf59e0b,
    visorHex: 0xfcd34d,
    cssSwatch: '#f59e0b',
  },
  ghost: {
    chassisHex: 0xcbd5e1,
    accentHex: 0x818cf8,
    visorHex: 0x22d3ee,
    cssSwatch: '#cbd5e1',
  },
};

export const STARTER_WEAPON: LootItem = {
  id: 'wpn_pulse_starter',
  name: 'Mk-I Pulse Emitter',
  category: 'weapon',
  rarity: 'Common',
  description: 'Balanced 46m defense emitter firing steady kinetic cyan bolts.',
  stats: {
    damage: 22,
    fireRate: 3.4,
    projectileCount: 1,
    spread: 0.01,
    range: 46,
    projectileSpeed: 46,
    energyCost: 4,
    colorHex: 0x38bdf8,
    abilityName: 'Balanced Pulse',
    abilityDesc: '46m range · Low energy draw kinetic bolt',
    shieldMult: 1.0,
  },
};

export const STARTER_CORE: LootItem = {
  id: 'core_starter',
  name: 'Civic Micro-Cell',
  category: 'core',
  rarity: 'Common',
  description: 'Original Unit A-01 chassis battery with steady baseline output.',
  stats: { maxEnergy: 100, energyRegen: 14 },
};

export const STARTER_ARMOR: LootItem = {
  id: 'arm_starter',
  name: 'Titanium Maintenance Shell',
  category: 'armor',
  rarity: 'Common',
  description: 'Weathered ceramic-titanium plating rated for 1,000 years in stasis.',
  stats: { maxHp: 120, armor: 5 },
};

export const STARTER_COSMETIC: LootItem = {
  id: 'cos_obsidian',
  name: 'Unit A-01 Standard Coat',
  category: 'cosmetic',
  rarity: 'Common',
  description: 'Slate titanium chassis with cyan diagnostic visor.',
  stats: {},
  cosmetic: COSMETIC_PALETTES.obsidian,
};

export const GUARANTEED_RELICS: LootItem[] = [
  {
    id: 'relic_atrium_seed',
    name: 'Genesis Bio-Seed Matrix',
    category: 'relic',
    rarity: 'Legendary',
    description: 'Crystalline botanical archive holding Earth’s pre-exodus biosphere DNA.',
    stats: { maxHp: 25, speedBonus: 0.9 },
    relicLoreId: 'lore_bio_seed',
  },
  {
    id: 'relic_biovault_lattice',
    name: 'Project Exodus Neural Prism',
    category: 'relic',
    rarity: 'Legendary',
    description: 'Quantum memory lattice recording the day 40 million citizens uploaded into orbit.',
    stats: { maxEnergy: 35, energyRegen: 6 },
    relicLoreId: 'lore_neural_prism',
  },
  {
    id: 'relic_foundry_thruster',
    name: 'Chrono-Vector Thruster',
    category: 'relic',
    rarity: 'Epic',
    description: 'Experimental anti-gravity stabilizer enabling mid-air double jumps.',
    stats: { doubleJump: true, dashCooldownBonus: 0.35 },
    relicLoreId: 'lore_chrono_thruster',
  },
];

export const GUARANTEED_SPECIAL_WEAPONS: LootItem[] = [
  {
    id: 'wpn_plaza_scatter',
    name: 'Prism Scatter-Emitter',
    category: 'weapon',
    rarity: 'Epic',
    description: 'Short-range 20m scattergun blasting a 5-beam fan that melts enemy shields.',
    stats: {
      damage: 16,
      fireRate: 2.2,
      projectileCount: 5,
      spread: 0.085,
      range: 20,
      projectileSpeed: 38,
      energyCost: 8,
      colorHex: 0xc084fc,
      abilityName: 'Shield Shredder',
      abilityDesc: '20m CQC · 5-beam fan · 2.4x Shield DMG',
      shieldMult: 2.4,
    },
  },
];

const WEAPON_TEMPLATES: Omit<LootItem, 'id'>[] = [
  {
    name: 'Vanguard Pulse Carbine',
    category: 'weapon',
    rarity: 'Rare',
    description: 'Mid-long 66m rapid carbine that slows bots and refunds +2 Energy per hit.',
    stats: {
      damage: 26,
      fireRate: 5.6,
      projectileCount: 1,
      spread: 0.012,
      range: 66,
      projectileSpeed: 62,
      energyCost: 3,
      colorHex: 0x34d399,
      abilityName: 'Kinetic Suppressor',
      abilityDesc: '66m rapid · Slows foes & refunds +2 EN on hit',
      shieldMult: 1.1,
      slowDuration: 1.2,
      energyOnHit: 2,
    },
  },
  {
    name: 'Prism Scatter-Emitter',
    category: 'weapon',
    rarity: 'Epic',
    description: 'Short-range 20m scattergun blasting a 5-beam fan that melts enemy shields.',
    stats: {
      damage: 16,
      fireRate: 2.2,
      projectileCount: 5,
      spread: 0.085,
      range: 20,
      projectileSpeed: 38,
      energyCost: 8,
      colorHex: 0xc084fc,
      abilityName: 'Shield Shredder',
      abilityDesc: '20m CQC · 5-beam fan · 2.4x Shield DMG',
      shieldMult: 2.4,
    },
  },
  {
    name: 'Aether Arc Lance',
    category: 'weapon',
    rarity: 'Epic',
    description: 'Long-range 98m piercing rail lance that stuns targets and chains EMP arcs.',
    stats: {
      damage: 54,
      fireRate: 2.1,
      projectileCount: 1,
      spread: 0.002,
      range: 98,
      projectileSpeed: 115,
      energyCost: 10,
      colorHex: 0xe879f9,
      abilityName: 'Piercing EMP Chain',
      abilityDesc: '98m sniper · Pierces foes, stuns & chains 8m lightning',
      shieldMult: 1.5,
      piercing: true,
      stunDuration: 0.85,
      chainRadius: 8.0,
    },
  },
  {
    name: 'Solaris Twin-Railgun',
    category: 'weapon',
    rarity: 'Legendary',
    description: '88m heavy twin-barrel siege gun whose solar shells bypass shields and explode.',
    stats: {
      damage: 38,
      fireRate: 3.0,
      projectileCount: 2,
      spread: 0.025,
      range: 88,
      projectileSpeed: 85,
      energyCost: 11,
      colorHex: 0xfbbf24,
      abilityName: 'Solar Shield-Bypass',
      abilityDesc: '88m siege · Bypasses shields + 4m Solar Blast',
      shieldMult: 1.0,
      piercesShield: true,
      splashRadius: 4.0,
    },
  },
];

const CORE_TEMPLATES: Omit<LootItem, 'id'>[] = [
  {
    name: 'Bio-Capacitor Mk.II',
    category: 'core',
    rarity: 'Rare',
    description: 'Photosynthetic energy core harvested from Emerald Atrium conduits.',
    stats: { maxEnergy: 130, energyRegen: 20, dashCooldownBonus: 0.2 },
  },
  {
    name: 'Violet Singularity Cell',
    category: 'core',
    rarity: 'Epic',
    description: 'Zero-point nexus cell surging with purple sub-space charge.',
    stats: { maxEnergy: 165, energyRegen: 26, dashCooldownBonus: 0.35 },
  },
  {
    name: 'Architect Starlight Core',
    category: 'core',
    rarity: 'Legendary',
    description: 'Experimental Ascension-grade fusion core with near-instant recovery.',
    stats: { maxEnergy: 200, energyRegen: 34, dashCooldownBonus: 0.5 },
  },
];

const ARMOR_TEMPLATES: Omit<LootItem, 'id'>[] = [
  {
    name: 'Botanist Bark-Weave',
    category: 'armor',
    rarity: 'Rare',
    description: 'Self-healing graphene weave reinforced with living emerald fibers.',
    stats: { maxHp: 160, armor: 12, speedBonus: 0.6 },
  },
  {
    name: 'Foundry Bastion Plate',
    category: 'armor',
    rarity: 'Epic',
    description: 'Heavy industrial composite hull absorbing high-energy impacts.',
    stats: { maxHp: 210, armor: 22 },
  },
  {
    name: 'Aegis Citadel Exoshell',
    category: 'armor',
    rarity: 'Legendary',
    description: 'Reactive quantum alloy shell crafted for Spire guardians.',
    stats: { maxHp: 260, armor: 30, speedBonus: 1.0 },
  },
];

const HACKING_TEMPLATES: Omit<LootItem, 'id'>[] = [
  {
    name: 'Sub-Routine Bypass Key',
    category: 'hacking',
    rarity: 'Rare',
    description: 'Reduces terminal circuit lock complexity and widens signal alignment.',
    stats: { hackEase: 1 },
  },
  {
    name: 'Architect Master Decrypter',
    category: 'hacking',
    rarity: 'Epic',
    description: 'Pre-aligns outer security nodes on high-tier Citadel terminals.',
    stats: { hackEase: 2 },
  },
];

const COSMETIC_TEMPLATES: Omit<LootItem, 'id'>[] = [
  {
    name: 'Emerald Overgrowth Finish',
    category: 'cosmetic',
    rarity: 'Rare',
    description: 'Moss-kissed bio-alloy plating with bioluminescent teal visor.',
    stats: {},
    cosmetic: COSMETIC_PALETTES.emerald,
  },
  {
    name: 'Amethyst Conduit Finish',
    category: 'cosmetic',
    rarity: 'Epic',
    description: 'Deep violet anodized plating pulsing with Aether energy.',
    stats: {},
    cosmetic: COSMETIC_PALETTES.amethyst,
  },
  {
    name: 'Solaris Vanguard Finish',
    category: 'cosmetic',
    rarity: 'Legendary',
    description: 'Gilded antique gold & amber optics from humanity’s final parade.',
    stats: {},
    cosmetic: COSMETIC_PALETTES.solaris,
  },
  {
    name: 'Ghost Protocol Chassis',
    category: 'cosmetic',
    rarity: 'Epic',
    description: 'Pristine alabaster pearl finish reserved for Architect couriers.',
    stats: {},
    cosmetic: COSMETIC_PALETTES.ghost,
  },
];

export function seededRandom(seed: number): () => number {
  let s = (seed >>> 0) || 1337;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function generateProceduralChestLoot(chestIndex: number, minRarity: Rarity = 'Common', seedOffset = 3026): LootItem[] {
  const rng = seededRandom(chestIndex * 7919 + seedOffset);
  const pools: Array<Omit<LootItem, 'id'>[]> = [
    WEAPON_TEMPLATES,
    CORE_TEMPLATES,
    ARMOR_TEMPLATES,
    HACKING_TEMPLATES,
    COSMETIC_TEMPLATES,
  ];
  const rarityRank: Record<Rarity, number> = { Common: 0, Rare: 1, Epic: 2, Legendary: 3 };
  const minRank = rarityRank[minRarity];

  const pool = pools[chestIndex % pools.length];
  const eligible = pool.filter((item) => rarityRank[item.rarity] >= minRank);
  const candidates = eligible.length > 0 ? eligible : pool;
  const pickIdx =
    pool === WEAPON_TEMPLATES
      ? Math.floor(chestIndex / pools.length) % candidates.length
      : Math.floor(rng() * candidates.length);
  const chosen = candidates[pickIdx];

  const bonusRoll = rng();
  const item: LootItem = {
    ...chosen,
    id: `proc_${chestIndex}_${chosen.category}_${Math.floor(rng() * 10000)}`,
    stats: { ...chosen.stats },
  };

  // Add subtle procedural stat tuning
  if (item.category === 'weapon' && item.stats.damage) {
    const mod = bonusRoll > 0.7 ? 4 : bonusRoll > 0.35 ? 2 : 0;
    item.stats.damage += mod;
    if (mod >= 4) item.name = `Overclocked ${item.name}`;
  } else if (item.category === 'armor' && item.stats.maxHp) {
    const mod = Math.round(bonusRoll * 20);
    item.stats.maxHp += mod;
  }

  const results: LootItem[] = [item];
  // High-tier chests also yield a secondary cosmetic or hacking tool
  if (minRank >= 2 && rng() > 0.45) {
    const cos = COSMETIC_TEMPLATES[Math.floor(rng() * COSMETIC_TEMPLATES.length)];
    results.push({
      ...cos,
      id: `proc_sec_${chestIndex}_${Math.floor(rng() * 9999)}`,
      stats: { ...cos.stats },
    });
  }

  return results;
}

export function computePlayerStats(equipped: {
  weapon: LootItem;
  core: LootItem;
  armor: LootItem;
  hacking: LootItem | null;
  relics: LootItem[];
}): ComputedPlayerStats {
  let maxHp = equipped.armor.stats.maxHp ?? 120;
  let armor = equipped.armor.stats.armor ?? 5;
  let maxEnergy = equipped.core.stats.maxEnergy ?? 100;
  let energyRegen = equipped.core.stats.energyRegen ?? 14;
  let maxStamina = 100 + (equipped.core.stats.maxStamina ?? 0);
  let staminaRegen = 28 + (equipped.core.stats.staminaRegen ?? 0);
  let dashReduction = equipped.core.stats.dashCooldownBonus ?? 0;
  let moveSpeed = 10.5 + (equipped.armor.stats.speedBonus ?? 0);
  let hasDoubleJump = false;
  let hackBonus = equipped.hacking?.stats.hackEase ?? 0;

  for (const relic of equipped.relics) {
    maxHp += relic.stats.maxHp ?? 0;
    armor += relic.stats.armor ?? 0;
    maxEnergy += relic.stats.maxEnergy ?? 0;
    energyRegen += relic.stats.energyRegen ?? 0;
    maxStamina += relic.stats.maxStamina ?? 12;
    staminaRegen += relic.stats.staminaRegen ?? 4;
    dashReduction += relic.stats.dashCooldownBonus ?? 0;
    moveSpeed += relic.stats.speedBonus ?? 0;
    hackBonus += relic.stats.hackEase ?? 0;
    if (relic.stats.doubleJump) hasDoubleJump = true;
  }

  return {
    maxHp,
    armor,
    maxEnergy,
    energyRegen,
    maxStamina,
    staminaRegen,
    weaponDamage: equipped.weapon.stats.damage ?? 22,
    fireRate: equipped.weapon.stats.fireRate ?? 3.4,
    projectileCount: equipped.weapon.stats.projectileCount ?? 1,
    spread: equipped.weapon.stats.spread ?? 0.01,
    range: equipped.weapon.stats.range ?? 48,
    moveSpeed,
    dashCooldown: Math.max(0.55, 1.35 - dashReduction),
    hasDoubleJump,
    hackBonus,
    weaponId: equipped.weapon.id,
    weaponName: equipped.weapon.name,
    weaponColorHex: equipped.weapon.stats.colorHex ?? 0x38bdf8,
    projectileSpeed: equipped.weapon.stats.projectileSpeed ?? 46,
    energyCost: equipped.weapon.stats.energyCost ?? 4,
    abilityName: equipped.weapon.stats.abilityName ?? 'Balanced Pulse',
    abilityDesc: equipped.weapon.stats.abilityDesc ?? '46m balanced energy bolt',
    shieldMult: equipped.weapon.stats.shieldMult ?? 1.0,
    piercesShield: Boolean(equipped.weapon.stats.piercesShield),
    piercing: Boolean(equipped.weapon.stats.piercing),
    slowDuration: equipped.weapon.stats.slowDuration ?? 0,
    stunDuration: equipped.weapon.stats.stunDuration ?? 0,
    chainRadius: equipped.weapon.stats.chainRadius ?? 0,
    splashRadius: equipped.weapon.stats.splashRadius ?? 0,
    energyOnHit: equipped.weapon.stats.energyOnHit ?? 0,
  };
}

export interface ShieldHitOutcome {
  newShieldHp: number;
  hullDamage: number;
  hitShield: boolean;
  shieldShattered: boolean;
  flankCrit: boolean;
}

export function resolveEnemyHitDamage(params: {
  baseDamage: number;
  shieldHp: number;
  hitFront: boolean;
  shieldMult: number;
  piercesShield: boolean;
}): ShieldHitOutcome {
  const { baseDamage, shieldHp, hitFront, shieldMult, piercesShield } = params;

  if (shieldHp > 0 && hitFront && !piercesShield) {
    const effectiveShieldDmg = Math.max(1, Math.round(baseDamage * shieldMult));
    if (effectiveShieldDmg >= shieldHp) {
      const overflowRatio = (effectiveShieldDmg - shieldHp) / Math.max(1, effectiveShieldDmg);
      const hullDamage = Math.round(baseDamage * overflowRatio);
      return {
        newShieldHp: 0,
        hullDamage,
        hitShield: true,
        shieldShattered: true,
        flankCrit: false,
      };
    }
    return {
      newShieldHp: shieldHp - effectiveShieldDmg,
      hullDamage: 0,
      hitShield: true,
      shieldShattered: false,
      flankCrit: false,
    };
  }

  // Flanking behind/beside an active shield or hitting with shield-bypass railgun deals full (or 1.5x flank) damage
  const flankCrit = shieldHp > 0 && !hitFront;
  const hullDamage = flankCrit ? Math.round(baseDamage * 1.5) : Math.round(baseDamage);
  return {
    newShieldHp: shieldHp,
    hullDamage,
    hitShield: false,
    shieldShattered: false,
    flankCrit,
  };
}
