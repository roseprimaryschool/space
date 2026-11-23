export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type ActiveModal =
  | 'none'
  | 'dialogue'
  | 'hacking'
  | 'inventory'
  | 'ending_choice';

export type DistrictId =
  | 'terrace'
  | 'plaza'
  | 'atrium'
  | 'foundry'
  | 'biovault'
  | 'citadel';

export type LootCategory =
  | 'weapon'
  | 'core'
  | 'armor'
  | 'hacking'
  | 'cosmetic'
  | 'relic';

export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export interface LootStats {
  damage?: number;
  fireRate?: number;
  projectileCount?: number;
  spread?: number;
  range?: number;
  maxHp?: number;
  armor?: number;
  maxEnergy?: number;
  energyRegen?: number;
  maxStamina?: number;
  staminaRegen?: number;
  dashCooldownBonus?: number;
  hackEase?: number;
  doubleJump?: boolean;
  speedBonus?: number;
  energyCost?: number;
  projectileSpeed?: number;
  colorHex?: number;
  abilityName?: string;
  abilityDesc?: string;
  shieldMult?: number;
  piercesShield?: boolean;
  piercing?: boolean;
  slowDuration?: number;
  stunDuration?: number;
  chainRadius?: number;
  splashRadius?: number;
  energyOnHit?: number;
}

export interface CosmeticPalette {
  chassisHex: number;
  accentHex: number;
  visorHex: number;
  cssSwatch: string;
}

export interface LootItem {
  id: string;
  name: string;
  category: LootCategory;
  rarity: Rarity;
  description: string;
  stats: LootStats;
  cosmetic?: CosmeticPalette;
  relicLoreId?: string;
}

export interface ComputedPlayerStats {
  maxHp: number;
  armor: number;
  maxEnergy: number;
  energyRegen: number;
  maxStamina: number;
  staminaRegen: number;
  weaponDamage: number;
  fireRate: number;
  projectileCount: number;
  spread: number;
  range: number;
  moveSpeed: number;
  dashCooldown: number;
  hasDoubleJump: boolean;
  hackBonus: number;
  weaponId: string;
  weaponName: string;
  weaponColorHex: number;
  projectileSpeed: number;
  energyCost: number;
  abilityName: string;
  abilityDesc: string;
  shieldMult: number;
  piercesShield: boolean;
  piercing: boolean;
  slowDuration: number;
  stunDuration: number;
  chainRadius: number;
  splashRadius: number;
  energyOnHit: number;
}

export type EnemyArchetype = 'stalker' | 'sentinel' | 'enforcer' | 'warden';

export type InteractableType = 'npc' | 'chest' | 'terminal' | 'gate_console' | 'ascension_core';

export interface InteractionPrompt {
  id: string;
  type: InteractableType;
  label: string;
  sublabel: string;
  canHack?: boolean;
}

export interface DialogueChoice {
  label: string;
  nextNodeId: string | null;
  grantItemId?: string;
  unlockLoreId?: string;
  triggerGate?: boolean;
  triggerEnding?: boolean;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  role: string;
  text: string;
  choices: DialogueChoice[];
}

export interface NpcDefinition {
  id: string;
  name: string;
  title: string;
  district: DistrictId;
  position: [number, number, number];
  accentHex: number;
  startNodeId: string;
  nodes: Record<string, DialogueNode>;
}

export interface LoreEntry {
  id: string;
  title: string;
  district: string;
  timestamp: string;
  body: string;
}

export type EndingType = 'reunite' | 'liberate' | 'transcend';

export interface HudWeaponSlot {
  id: string;
  name: string;
  rarity: Rarity;
  damage: number;
  projectileCount: number;
  range: number;
  abilityName: string;
  abilityDesc: string;
  cssColor: string;
  equipped: boolean;
}

export interface HudEnemyMarker {
  id: string;
  label: string;
  hp: number;
  maxHp: number;
  shieldHp: number;
  maxShieldHp: number;
  stunned: boolean;
  xPct: number;
  yPct: number;
}

export interface HudWaypoint {
  id: string;
  label: string;
  sublabel: string;
  color: string;
  xPct: number;
  yPct: number;
  inView: boolean;
  behind: boolean;
  bearingDeg: number;
  distanceM: number;
}

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  stamina: number;
  maxStamina: number;
  sprinting: boolean;
  headingDeg: number;
  shards: number;
  district: DistrictId;
  districtName: string;
  directive: string;
  gateOpened: boolean;
  citadelUnlocked: boolean;
  biovaultUnlocked: boolean;
  guideTalked: boolean;
  archivistTalked: boolean;
  relicsFound: number;
  totalRelics: number;
  chestsOpened: number;
  totalChests: number;
  enemiesDefeated: number;
  elapsedSeconds: number;
  cameraMode: 'third' | 'first';
  weaponId: string;
  weaponName: string;
  weaponRange: number;
  weaponAbility: string;
  weaponCssColor: string;
  dashReady: number; // 0..1
  prompt: InteractionPrompt | null;
  toast: string | null;
  waypoints: HudWaypoint[];
  enemyMarkers: HudEnemyMarker[];
  outcome: 'none' | 'victory' | 'defeat';
  endingChosen: EndingType | null;
  score: number;
  bestScore: number;
}
