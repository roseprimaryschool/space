import type { DistrictId, EnemyArchetype, Rarity } from './types';

export type FacadeStyle =
  | 'cyber_tower'
  | 'neon_arcade'
  | 'industrial'
  | 'conservatory'
  | 'citadel'
  | 'platform'
  | 'bridge';

export interface BoxCollider {
  id: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  kind: 'solid' | 'platform' | 'gate' | 'citadel_barrier' | 'biovault_barrier';
  district: DistrictId;
  facadeStyle?: FacadeStyle;
  colorHex?: number;
  emissiveHex?: number;
  label?: string;
}

export interface RampSurface {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  yAtMinZ: number;
  yAtMaxZ: number;
}

export interface ChestSpawn {
  id: string;
  index: number;
  position: [number, number, number];
  rarity: Rarity;
  district: DistrictId;
  guaranteedItemId?: string;
}

export interface EnemySpawn {
  id: string;
  archetype: EnemyArchetype;
  position: [number, number, number];
  patrolRadius: number;
  district: DistrictId;
}

export interface TerminalSpawn {
  id: string;
  title: string;
  subtitle: string;
  position: [number, number, number];
  targetType: 'gate' | 'foundry_lift' | 'citadel_bridge';
  district: DistrictId;
  loreId?: string;
}

export const PLAYER_SPAWN: [number, number, number] = [0, 0, 56];

export const DISTRICT_META: Record<DistrictId, { name: string; subtitle: string }> = {
  terrace: { name: 'Outer Maintenance Terrace', subtitle: 'Sector 00 · Awakening Alley' },
  plaza: { name: 'Nexus Prime Understreets', subtitle: 'Neon Corridor Grid & Plaza' },
  atrium: { name: 'Emerald Atrium', subtitle: 'Vertical Forest Lanes' },
  foundry: { name: 'Foundry Sector 9', subtitle: 'Smelting Pipe Corridors' },
  biovault: { name: 'Sub-Level Bio-Vault', subtitle: 'Classified Project Exodus Archive' },
  citadel: { name: 'Aether Citadel Spire', subtitle: 'Ascension Command Sanctum' },
};

export function getDistrictAt(x: number, y: number, z: number): DistrictId {
  if (y < -2.2 && z < -12) return 'biovault';
  if (z > 36) return 'terrace';
  if (z < -22) return 'citadel';
  if (x > 25) return 'atrium';
  if (x < -25) return 'foundry';
  return 'plaza';
}

// Interconnected narrow neon alleyways (4m-6.5m wide), market arcades,
// industrial pipe corridors, and multi-tier skyscrapers.
export const WORLD_BOXES: BoxCollider[] = [
  // === COLOSSAL ENTRANCE GATES (z = 36, opening is x = -6..6) ===
  { id: 'gate_pylon_left', minX: -16, maxX: -6, minY: 0, maxY: 26, minZ: 34.5, maxZ: 39.5, kind: 'solid', district: 'terrace', facadeStyle: 'cyber_tower', colorHex: 0x161d30 },
  { id: 'gate_pylon_right', minX: 6, maxX: 16, minY: 0, maxY: 26, minZ: 34.5, maxZ: 39.5, kind: 'solid', district: 'terrace', facadeStyle: 'cyber_tower', colorHex: 0x161d30 },
  { id: 'gate_lintel', minX: -17, maxX: 17, minY: 16, maxY: 20, minZ: 34.5, maxZ: 39.5, kind: 'solid', district: 'terrace', facadeStyle: 'bridge', colorHex: 0x1c253d },
  // Dynamic gate seal collider (disengages when gateOpened = true)
  { id: 'gate_seal', minX: -6, maxX: 6, minY: 0, maxY: 16, minZ: 36, maxZ: 38, kind: 'gate', district: 'terrace' },

  // === OUTER TERRACE NARROW APPROACH CORRIDORS (z = 40..66) ===
  // West Terrace Tower & Service Block creating narrow west maintenance alley (x: -16..-11)
  { id: 'terrace_wall_w', minX: -26, maxX: -16, minY: 0, maxY: 22, minZ: 40, maxZ: 68, kind: 'solid', district: 'terrace', facadeStyle: 'industrial', colorHex: 0x151b2b },
  { id: 'terrace_kiosk_w', minX: -11, maxX: -5.5, minY: 0, maxY: 7.5, minZ: 44, maxZ: 54, kind: 'solid', district: 'terrace', facadeStyle: 'neon_arcade', colorHex: 0x1a2236 },
  // East Terrace Tower & Stepped Platform creating east alley (x: 5.5..11) + ledge at 11..16
  { id: 'terrace_wall_e', minX: 16, maxX: 26, minY: 0, maxY: 24, minZ: 40, maxZ: 68, kind: 'solid', district: 'terrace', facadeStyle: 'cyber_tower', colorHex: 0x151b2b },
  { id: 'terrace_ledge_e', minX: 10.5, maxX: 15.8, minY: 0, maxY: 2.1, minZ: 45, maxZ: 53, kind: 'platform', district: 'terrace', facadeStyle: 'platform', colorHex: 0x263147 },
  { id: 'terrace_arch_beam', minX: -16, maxX: 16, minY: 9.5, maxY: 11.2, minZ: 47, maxZ: 50, kind: 'solid', district: 'terrace', facadeStyle: 'bridge', colorHex: 0x1b2438 },

  // === NEXUS PRIME UNDERSTREETS & NARROW ALLEY BLOCKS (x = -25..25, z = -22..35) ===
  // Central Holographic Obelisk Core (z = 4..8, center avenue x = -3.5..3.5 splits around it)
  { id: 'plaza_obelisk', minX: -2.0, maxX: 2.0, minY: 0, maxY: 15, minZ: 4.5, maxZ: 8.5, kind: 'solid', district: 'plaza', facadeStyle: 'citadel', colorHex: 0x1b233a },

  // South-West Market Block (x: -17.5..-6.0, z: 18..29) -> Narrow alleys around it!
  { id: 'plaza_sw_tower', minX: -17.5, maxX: -9.5, minY: 0, maxY: 28, minZ: 18, maxZ: 28.5, kind: 'solid', district: 'plaza', facadeStyle: 'cyber_tower', colorHex: 0x141b2d },
  { id: 'plaza_kiosk_w', minX: -9.5, maxX: -5.5, minY: 0, maxY: 2.4, minZ: 20, maxZ: 26.5, kind: 'platform', district: 'plaza', facadeStyle: 'neon_arcade', colorHex: 0x232d45 },

  // South-East Arcade Block (x: 6.0..17.5, z: 18..29) -> M-07 stands just north at [8, 0, 14]
  { id: 'plaza_se_tower', minX: 9.5, maxX: 17.5, minY: 0, maxY: 32, minZ: 18, maxZ: 28.5, kind: 'solid', district: 'plaza', facadeStyle: 'neon_arcade', colorHex: 0x161d32 },
  { id: 'plaza_kiosk_e', minX: 5.5, maxX: 9.5, minY: 0, maxY: 2.4, minZ: 20, maxZ: 26.5, kind: 'platform', district: 'plaza', facadeStyle: 'neon_arcade', colorHex: 0x232d45 },

  // Mid-North West Block (x: -18..-6.2, z: -8..2) -> Leaves West Alley (-24..-18), Cross-Street (z: 2..18), Center Ave (-6.2..6.2)
  { id: 'plaza_nw_block', minX: -18, maxX: -6.2, minY: 0, maxY: 36, minZ: -8, maxZ: 1.5, kind: 'solid', district: 'plaza', facadeStyle: 'cyber_tower', colorHex: 0x13192a },
  // Mid-North East Block (x: 6.2..18.5, z: -9..2.5) -> Leaves East Alley (18.5..24) and low stepped arcade at z: -14..-9
  { id: 'plaza_ne_block', minX: 9.5, maxX: 18.5, minY: 0, maxY: 34, minZ: -9, maxZ: 2.5, kind: 'solid', district: 'plaza', facadeStyle: 'cyber_tower', colorHex: 0x151c2e },
  { id: 'plaza_ne_ledge', minX: 6.2, maxX: 9.5, minY: 0, maxY: 2.4, minZ: -7, maxZ: 0.5, kind: 'platform', district: 'plaza', facadeStyle: 'neon_arcade', colorHex: 0x243048 },

  // Corner Megatowers framing the narrow entrance corridors to Atrium (z: 3..14) and Foundry (z: 3..14)
  { id: 'tower_nw', minX: -33, maxX: -23.5, minY: 0, maxY: 58, minZ: -24, maxZ: -11, kind: 'solid', district: 'plaza', facadeStyle: 'cyber_tower', colorHex: 0x131826 },
  { id: 'tower_sw', minX: -33, maxX: -23.5, minY: 0, maxY: 48, minZ: 16.5, maxZ: 34, kind: 'solid', district: 'plaza', facadeStyle: 'industrial', colorHex: 0x161c2c },
  { id: 'tower_ne', minX: 23.5, maxX: 33, minY: 0, maxY: 62, minZ: -24, maxZ: -11, kind: 'solid', district: 'plaza', facadeStyle: 'cyber_tower', colorHex: 0x141a29 },
  { id: 'tower_se', minX: 23.5, maxX: 33, minY: 0, maxY: 50, minZ: 16.5, maxZ: 34, kind: 'solid', district: 'plaza', facadeStyle: 'neon_arcade', colorHex: 0x171f30 },

  // Overhead Plaza Skybridges (walkable or architectural above alleys at y = 9.2..10.5)
  { id: 'plaza_skybridge_s', minX: -17.5, maxX: 17.5, minY: 9.2, maxY: 10.6, minZ: 21.5, maxZ: 24.5, kind: 'solid', district: 'plaza', facadeStyle: 'bridge', colorHex: 0x1f2a42 },
  { id: 'plaza_skybridge_n', minX: -18, maxX: 18.5, minY: 11.0, maxY: 12.4, minZ: -5.5, maxZ: -2.5, kind: 'solid', district: 'plaza', facadeStyle: 'bridge', colorHex: 0x1f2a42 },

  // === EMERALD ATRIUM (EAST: x = 25..74, z = -22..22) — NARROW OVERGROWN LANES ===
  { id: 'atrium_wall_n', minX: 33, maxX: 76, minY: 0, maxY: 32, minZ: -26, maxZ: -20, kind: 'solid', district: 'atrium', facadeStyle: 'conservatory', colorHex: 0x132222 },
  { id: 'atrium_wall_s', minX: 33, maxX: 76, minY: 0, maxY: 32, minZ: 20, maxZ: 26, kind: 'solid', district: 'atrium', facadeStyle: 'conservatory', colorHex: 0x132222 },
  { id: 'atrium_wall_e', minX: 72, maxX: 78, minY: 0, maxY: 38, minZ: -26, maxZ: 26, kind: 'solid', district: 'atrium', facadeStyle: 'cyber_tower', colorHex: 0x132024 },
  // Interior Botanical Pillar-Blocks dividing Atrium into narrow mossy streets (~4.5m wide)
  { id: 'atrium_pillar_sw', minX: 34, maxX: 40.5, minY: 0, maxY: 16, minZ: 10, maxZ: 16, kind: 'solid', district: 'atrium', facadeStyle: 'conservatory', colorHex: 0x172b28 },
  { id: 'atrium_shop_1', minX: 35, maxX: 42.5, minY: 0, maxY: 5.2, minZ: -17, maxZ: -10, kind: 'platform', district: 'atrium', facadeStyle: 'neon_arcade', colorHex: 0x1c2738 },
  { id: 'atrium_mid_block', minX: 48, maxX: 54.5, minY: 0, maxY: 14, minZ: 1, maxZ: 8, kind: 'solid', district: 'atrium', facadeStyle: 'conservatory', colorHex: 0x183029 },
  // Stepped lush botanical terraces ascending to Relic #1
  { id: 'atrium_step_1', minX: 48.5, maxX: 56, minY: 0, maxY: 2.2, minZ: -13, maxZ: -3.5, kind: 'platform', district: 'atrium', facadeStyle: 'platform', colorHex: 0x1f473a },
  { id: 'atrium_step_2', minX: 56, maxX: 64, minY: 0, maxY: 4.5, minZ: -14.5, maxZ: -4.5, kind: 'platform', district: 'atrium', facadeStyle: 'platform', colorHex: 0x225442 },
  { id: 'atrium_step_3', minX: 60.5, maxX: 69.5, minY: 0, maxY: 6.8, minZ: -2, maxZ: 9.5, kind: 'platform', district: 'atrium', facadeStyle: 'platform', colorHex: 0x25614a },
  { id: 'atrium_relic_deck', minX: 58.5, maxX: 69.5, minY: 0, maxY: 9.0, minZ: 10, maxZ: 18.5, kind: 'platform', district: 'atrium', facadeStyle: 'platform', colorHex: 0x2b7054 },

  // === FOUNDRY SECTOR 9 (WEST: x = -74..-25, z = -22..22) — NARROW PIPE CORRIDORS ===
  { id: 'foundry_wall_n', minX: -76, maxX: -33, minY: 0, maxY: 34, minZ: -26, maxZ: -20, kind: 'solid', district: 'foundry', facadeStyle: 'industrial', colorHex: 0x1b1a26 },
  { id: 'foundry_wall_s', minX: -76, maxX: -33, minY: 0, maxY: 34, minZ: 20, maxZ: 26, kind: 'solid', district: 'foundry', facadeStyle: 'industrial', colorHex: 0x1b1a26 },
  { id: 'foundry_wall_w', minX: -78, maxX: -72, minY: 0, maxY: 40, minZ: -26, maxZ: 26, kind: 'solid', district: 'foundry', facadeStyle: 'industrial', colorHex: 0x171824 },
  // Industrial Smelter Stacks & Cargo Corridors forming tight 4.5m-5.5m walkways
  { id: 'foundry_stack_ne', minX: -43, maxX: -35, minY: 0, maxY: 18, minZ: -14, maxZ: -5, kind: 'solid', district: 'foundry', facadeStyle: 'industrial', colorHex: 0x232234 },
  { id: 'foundry_reactor', minX: -54, maxX: -46.5, minY: 0, maxY: 16, minZ: -4.5, maxZ: 3.5, kind: 'solid', district: 'foundry', facadeStyle: 'industrial', colorHex: 0x252638 },
  { id: 'foundry_smelter_s', minX: -52, maxX: -44.5, minY: 0, maxY: 14, minZ: 9, maxZ: 15, kind: 'solid', district: 'foundry', facadeStyle: 'industrial', colorHex: 0x202232 },
  // Stepped Freight Crates & Upper Gantry
  { id: 'foundry_crate_1', minX: -60.5, maxX: -53, minY: 0, maxY: 2.3, minZ: 9.5, maxZ: 16.5, kind: 'platform', district: 'foundry', facadeStyle: 'platform', colorHex: 0x35374a },
  { id: 'foundry_crate_2', minX: -68.5, maxX: -60.5, minY: 0, maxY: 4.5, minZ: 8, maxZ: 16.5, kind: 'platform', district: 'foundry', facadeStyle: 'platform', colorHex: 0x3c3e52 },
  { id: 'foundry_gantry', minX: -69.5, maxX: -58.5, minY: 0, maxY: 6.5, minZ: -14, maxZ: 7, kind: 'platform', district: 'foundry', facadeStyle: 'bridge', colorHex: 0x2f3347 },

  // === SUB-LEVEL BIO-VAULT (UNDERGROUND: x = -23..-9.5, z = -58..-16, floor y = -7) ===
  { id: 'biovault_barrier', minX: -20, maxX: -10, minY: 0, maxY: 7, minZ: -16, maxZ: -14, kind: 'biovault_barrier', district: 'plaza' },
  { id: 'biovault_floor', minX: -25, maxX: -8, minY: -9, maxY: -7, minZ: -58, maxZ: -32, kind: 'platform', district: 'biovault', facadeStyle: 'platform', colorHex: 0x121728 },
  { id: 'biovault_wall_w', minX: -26, maxX: -23, minY: -7, maxY: 4, minZ: -58, maxZ: -14, kind: 'solid', district: 'biovault', facadeStyle: 'industrial', colorHex: 0x161c30 },
  { id: 'biovault_wall_e', minX: -10, maxX: -8, minY: -7, maxY: 0, minZ: -58, maxZ: -16, kind: 'solid', district: 'biovault', facadeStyle: 'industrial', colorHex: 0x161c30 },
  { id: 'biovault_wall_n', minX: -26, maxX: -8, minY: -7, maxY: 4, minZ: -60, maxZ: -56, kind: 'solid', district: 'biovault', facadeStyle: 'citadel', colorHex: 0x161c30 },
  { id: 'biovault_pedestal', minX: -19, maxX: -13, minY: -7, maxY: -5.4, minZ: -52, maxZ: -44, kind: 'platform', district: 'biovault', facadeStyle: 'citadel', colorHex: 0x2a244a },

  // === AETHER CITADEL ASCENT (NORTH: x = -18..18, z = -86..-20) ===
  { id: 'citadel_barrier', minX: -8, maxX: 8, minY: 0, maxY: 12, minZ: -23, maxZ: -21, kind: 'citadel_barrier', district: 'plaza' },
  { id: 'citadel_wall_w', minX: -24, maxX: -16, minY: 13, maxY: 52, minZ: -90, maxZ: -50, kind: 'solid', district: 'citadel', facadeStyle: 'citadel', colorHex: 0x14182a },
  { id: 'citadel_wall_e', minX: 16, maxX: 24, minY: 0, maxY: 52, minZ: -90, maxZ: -20, kind: 'solid', district: 'citadel', facadeStyle: 'citadel', colorHex: 0x14182a },
  { id: 'citadel_wall_n', minX: -24, maxX: 24, minY: 0, maxY: 62, minZ: -92, maxZ: -84, kind: 'solid', district: 'citadel', facadeStyle: 'citadel', colorHex: 0x161a30 },
  { id: 'citadel_summit', minX: -16, maxX: 16, minY: 0, maxY: 14, minZ: -84, maxZ: -50, kind: 'platform', district: 'citadel', facadeStyle: 'citadel', colorHex: 0x1d223b },
  { id: 'citadel_pillar_w', minX: -11, maxX: -8, minY: 14, maxY: 22, minZ: -66, maxZ: -63, kind: 'solid', district: 'citadel', facadeStyle: 'citadel', colorHex: 0x2b3154 },
  { id: 'citadel_pillar_e', minX: 8, maxX: 11, minY: 14, maxY: 22, minZ: -66, maxZ: -63, kind: 'solid', district: 'citadel', facadeStyle: 'citadel', colorHex: 0x2b3154 },
];

export const WORLD_RAMPS: RampSurface[] = [
  { id: 'citadel_ramp', minX: -7, maxX: 7, minZ: -50, maxZ: -24, yAtMinZ: 14, yAtMaxZ: 0 },
  { id: 'biovault_ramp', minX: -20, maxX: -10, minZ: -34, maxZ: -16, yAtMinZ: -7, yAtMaxZ: 0 },
];

export const CHEST_SPAWNS: ChestSpawn[] = [
  { id: 'chest_terrace_1', index: 0, position: [13, 2.1, 49], rarity: 'Common', district: 'terrace' },
  { id: 'chest_terrace_2', index: 16, position: [-13.5, 0, 49], rarity: 'Rare', district: 'terrace' },
  { id: 'chest_plaza_1', index: 1, position: [-7.5, 2.4, 23], rarity: 'Rare', district: 'plaza' },
  {
    id: 'chest_plaza_2',
    index: 2,
    position: [7.5, 2.4, 23],
    rarity: 'Epic',
    district: 'plaza',
    guaranteedItemId: 'wpn_plaza_scatter',
  },
  { id: 'chest_plaza_3', index: 3, position: [-20.5, 0, 24], rarity: 'Common', district: 'plaza' },
  { id: 'chest_plaza_4', index: 17, position: [20.5, 0, -4], rarity: 'Epic', district: 'plaza' },
  { id: 'chest_atrium_1', index: 4, position: [39, 5.2, -13.5], rarity: 'Rare', district: 'atrium' },
  { id: 'chest_atrium_2', index: 5, position: [52, 2.2, -8], rarity: 'Rare', district: 'atrium' },
  { id: 'chest_atrium_3', index: 6, position: [65, 6.8, 4], rarity: 'Epic', district: 'atrium' },
  {
    id: 'chest_atrium_relic',
    index: 7,
    position: [64, 9.0, 14.5],
    rarity: 'Legendary',
    district: 'atrium',
    guaranteedItemId: 'relic_atrium_seed',
  },
  { id: 'chest_foundry_1', index: 8, position: [-56.5, 2.3, 13], rarity: 'Rare', district: 'foundry' },
  { id: 'chest_foundry_2', index: 9, position: [-64.5, 4.5, 12.5], rarity: 'Epic', district: 'foundry' },
  {
    id: 'chest_foundry_relic',
    index: 11,
    position: [-64, 6.5, -6],
    rarity: 'Legendary',
    district: 'foundry',
    guaranteedItemId: 'relic_foundry_thruster',
  },
  { id: 'chest_foundry_4', index: 10, position: [-47, 0, -16], rarity: 'Epic', district: 'foundry' },
  { id: 'chest_biovault_1', index: 12, position: [-21, -7, -40], rarity: 'Epic', district: 'biovault' },
  {
    id: 'chest_biovault_relic',
    index: 13,
    position: [-16, -5.4, -48],
    rarity: 'Legendary',
    district: 'biovault',
    guaranteedItemId: 'relic_biovault_lattice',
  },
  { id: 'chest_citadel_1', index: 14, position: [-12, 14, -55], rarity: 'Epic', district: 'citadel' },
  { id: 'chest_citadel_2', index: 15, position: [12, 14, -55], rarity: 'Legendary', district: 'citadel' },
];

export const ENEMY_SPAWNS: EnemySpawn[] = [
  { id: 'en_atrium_1', archetype: 'stalker', position: [38, 0, -2], patrolRadius: 4.5, district: 'atrium' },
  { id: 'en_atrium_2', archetype: 'sentinel', position: [57, 0, -1], patrolRadius: 4.5, district: 'atrium' },
  { id: 'en_atrium_3', archetype: 'stalker', position: [45, 0, 14], patrolRadius: 4, district: 'atrium' },
  { id: 'en_atrium_4', archetype: 'sentinel', position: [67, 0, -17], patrolRadius: 3.5, district: 'atrium' },
  { id: 'en_atrium_5', archetype: 'enforcer', position: [52, 0, 14], patrolRadius: 3.5, district: 'atrium' },
  { id: 'en_foundry_1', archetype: 'stalker', position: [-39, 0, 2], patrolRadius: 4.5, district: 'foundry' },
  { id: 'en_foundry_2', archetype: 'sentinel', position: [-57, 0, -10], patrolRadius: 5, district: 'foundry' },
  { id: 'en_foundry_3', archetype: 'enforcer', position: [-48, 0, 6.2], patrolRadius: 3.5, district: 'foundry' },
  { id: 'en_foundry_4', archetype: 'sentinel', position: [-38, 0, -17], patrolRadius: 3.5, district: 'foundry' },
  { id: 'en_foundry_5', archetype: 'stalker', position: [-64, 0, -17], patrolRadius: 3.5, district: 'foundry' },
  { id: 'en_biovault_1', archetype: 'enforcer', position: [-15, -7, -38], patrolRadius: 4, district: 'biovault' },
  { id: 'en_biovault_2', archetype: 'sentinel', position: [-20, -5, -45], patrolRadius: 4, district: 'biovault' },
  { id: 'en_citadel_guard', archetype: 'enforcer', position: [-12, 14, -58], patrolRadius: 3.5, district: 'citadel' },
  { id: 'en_citadel_warden', archetype: 'warden', position: [0, 14, -64], patrolRadius: 7, district: 'citadel' },
];

export const TERMINAL_SPAWNS: TerminalSpawn[] = [
  {
    id: 'term_gate',
    title: 'Southern Gate Override',
    subtitle: 'Align the quantum circuit to disengage the 1,000-year entrance seal.',
    position: [-3.5, 0, 41],
    targetType: 'gate',
    district: 'terrace',
    loreId: 'lore_awakening',
  },
  {
    id: 'term_biovault',
    title: 'Sub-Level Bio-Vault Lock',
    subtitle: 'Bypass Foundry containment to open the underground Exodus Archive.',
    position: [-25, 0, -8],
    targetType: 'foundry_lift',
    district: 'foundry',
  },
  {
    id: 'term_citadel',
    title: 'Aether Citadel Barrier',
    subtitle: 'Override the northern Spire defensive lattice.',
    position: [5.5, 0, -19.5],
    targetType: 'citadel_bridge',
    district: 'plaza',
  },
];

export interface DynamicBarrierState {
  gateOpened: boolean;
  biovaultUnlocked: boolean;
  citadelUnlocked: boolean;
}

export function isBoxActive(box: BoxCollider, barriers: DynamicBarrierState): boolean {
  if (box.kind === 'gate') return !barriers.gateOpened;
  if (box.kind === 'biovault_barrier') return !barriers.biovaultUnlocked;
  if (box.kind === 'citadel_barrier') return !barriers.citadelUnlocked;
  return true;
}

export function groundHeightAt(
  x: number,
  z: number,
  currentY: number,
  barriers: DynamicBarrierState,
): number {
  let maxFloor = -Infinity;

  const inBioPit = x >= -23 && x <= -9.5 && z <= -16 && z >= -58;
  if (!inBioPit) {
    maxFloor = 0;
  } else {
    maxFloor = -7;
  }

  for (const r of WORLD_RAMPS) {
    if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) {
      const t = (z - r.minZ) / Math.max(0.001, r.maxZ - r.minZ);
      const rampY = r.yAtMinZ + (r.yAtMaxZ - r.yAtMinZ) * t;
      if (rampY <= currentY + 1.35 && rampY > maxFloor) {
        maxFloor = rampY;
      }
    }
  }

  for (const box of WORLD_BOXES) {
    if (!isBoxActive(box, barriers)) continue;
    if (x >= box.minX - 0.35 && x <= box.maxX + 0.35 && z >= box.minZ - 0.35 && z <= box.maxZ + 0.35) {
      if (box.maxY <= currentY + 1.1 && box.maxY > maxFloor) {
        maxFloor = box.maxY;
      }
    }
  }

  return maxFloor === -Infinity ? 0 : maxFloor;
}

export function resolveHorizontalCollision(
  x: number,
  y: number,
  z: number,
  radius: number,
  barriers: DynamicBarrierState,
): { x: number; z: number } {
  let nx = Math.max(-71, Math.min(71, x));
  let nz = Math.max(-83, Math.min(68, z));

  if (nz > 38) {
    nx = Math.max(-15.4, Math.min(15.4, nx));
  }

  for (const box of WORLD_BOXES) {
    if (!isBoxActive(box, barriers)) continue;
    if (y >= box.maxY - 0.45 || y + 1.8 <= box.minY) continue;

    const closestX = Math.max(box.minX, Math.min(nx, box.maxX));
    const closestZ = Math.max(box.minZ, Math.min(nz, box.maxZ));
    const dx = nx - closestX;
    const dz = nz - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < radius * radius) {
      if (distSq > 1e-6) {
        const dist = Math.sqrt(distSq);
        const push = radius - dist;
        nx += (dx / dist) * push;
        nz += (dz / dist) * push;
      } else {
        const penLeft = Math.abs(nx - box.minX);
        const penRight = Math.abs(box.maxX - nx);
        const penBack = Math.abs(nz - box.minZ);
        const penFront = Math.abs(box.maxZ - nz);
        const minPen = Math.min(penLeft, penRight, penBack, penFront);
        if (minPen === penLeft) nx = box.minX - radius;
        else if (minPen === penRight) nx = box.maxX + radius;
        else if (minPen === penBack) nz = box.minZ - radius;
        else nz = box.maxZ + radius;
      }
    }
  }

  return { x: nx, z: nz };
}

/**
 * Checks horizontal/vertical line-of-sight between two world points (e.g. enemy eye -> player eye)
 * against all active solid building colliders so enemies cannot detect or aggro through walls.
 */
export function hasLineOfSight(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  barriers: DynamicBarrierState,
): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;

  for (const box of WORLD_BOXES) {
    if (!isBoxActive(box, barriers)) continue;
    // Ignore ground-level platforms shorter than eye height when both actors stand above them
    if (box.maxY <= Math.min(ay, by) - 0.1) continue;

    let tmin = 0.001;
    let tmax = 0.999;

    const checkAxis = (p: number, d: number, minB: number, maxB: number): boolean => {
      if (Math.abs(d) < 1e-6) {
        return p >= minB && p <= maxB;
      }
      let t1 = (minB - p) / d;
      let t2 = (maxB - p) / d;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      return tmin <= tmax;
    };

    if (
      checkAxis(ax, dx, box.minX, box.maxX) &&
      checkAxis(ay, dy, box.minY, box.maxY) &&
      checkAxis(az, dz, box.minZ, box.maxZ)
    ) {
      return false;
    }
  }
  return true;
}

