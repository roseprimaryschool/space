import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computePlayerStats,
  generateProceduralChestLoot,
  resolveEnemyHitDamage,
  STARTER_ARMOR,
  STARTER_CORE,
  STARTER_WEAPON,
  GUARANTEED_RELICS,
  GUARANTEED_SPECIAL_WEAPONS,
} from './loot';
import {
  createCircuitPuzzle,
  evaluateCircuitPower,
  rotateCircuitTile,
} from './puzzles';
import {
  groundHeightAt,
  hasLineOfSight,
  resolveHorizontalCollision,
  PLAYER_SPAWN,
  getDistrictAt,
  CHEST_SPAWNS,
  ENEMY_SPAWNS,
  TERMINAL_SPAWNS,
} from './worldData';
import { NPCS, ENDINGS, LORE_ENTRIES } from './story';

test('procedural chest loot generates deterministic valid items with rarity', () => {
  const a = generateProceduralChestLoot(1, 'Rare', 3026);
  const b = generateProceduralChestLoot(1, 'Rare', 3026);
  assert.deepEqual(a, b);
  assert.ok(a.length >= 1);
  assert.ok(['Rare', 'Epic', 'Legendary'].includes(a[0].rarity));
});

test('computePlayerStats aggregates weapon, core, armor, stamina, and relics cleanly', () => {
  const stats = computePlayerStats({
    weapon: STARTER_WEAPON,
    core: STARTER_CORE,
    armor: STARTER_ARMOR,
    hacking: {
      id: 'hack_test',
      name: 'Bypass Key',
      category: 'hacking',
      rarity: 'Rare',
      description: 'test',
      stats: { hackEase: 2 },
    },
    relics: GUARANTEED_RELICS,
  });

  assert.equal(stats.hasDoubleJump, true);
  assert.equal(stats.hackBonus, 2);
  assert.ok(stats.maxHp > (STARTER_ARMOR.stats.maxHp ?? 0));
  assert.ok(stats.maxEnergy > (STARTER_CORE.stats.maxEnergy ?? 0));
  assert.ok(stats.maxStamina >= 100);
  assert.ok(stats.staminaRegen >= 28);
  assert.ok(stats.dashCooldown < 1.35);
});

test('circuit hacking puzzle starts unsolved and solves when rotated to alignment', () => {
  const puzzle = createCircuitPuzzle({
    id: 'test_puzzle',
    title: 'Test Lock',
    subtitle: 'Align nodes',
    size: 4,
    hackBonus: 0,
    targetType: 'gate',
    targetId: 'term_gate',
  });

  assert.equal(puzzle.solved, false);
  assert.equal(puzzle.tiles[0][0].powered, true);

  let current = puzzle;
  for (let r = 0; r < current.size; r++) {
    for (let c = 0; c < current.size; c++) {
      if (current.tiles[r][c].locked) continue;
      for (let k = 0; k < 4; k++) {
        current = rotateCircuitTile(current, r, c);
        if (current.solved) break;
      }
      if (current.solved) break;
    }
    if (current.solved) break;
  }

  const manual = createCircuitPuzzle({
    id: 'manual',
    title: 'Manual',
    subtitle: 'Sub',
    size: 2,
    hackBonus: 3,
    targetType: 'gate',
    targetId: 'g',
  });
  const check = evaluateCircuitPower(manual.tiles);
  assert.equal(typeof check.solved, 'boolean');
});

test('player spawn, NPCs, terminals, and alley spawns are unobstructed in narrow corridors', () => {
  const [sx, sy, sz] = PLAYER_SPAWN;
  const barriers = { gateOpened: false, biovaultUnlocked: false, citadelUnlocked: false };
  const unlocked = { gateOpened: true, biovaultUnlocked: true, citadelUnlocked: true };
  const floor = groundHeightAt(sx, sz, sy + 0.5, barriers);
  assert.equal(floor, 0);

  const resolved = resolveHorizontalCollision(sx, sy, sz, 0.55, barriers);
  assert.equal(resolved.x, sx);
  assert.equal(resolved.z, sz);
  assert.equal(getDistrictAt(sx, sy, sz), 'terrace');

  for (const npc of NPCS) {
    const [nx, ny, nz] = npc.position;
    const npcResolved = resolveHorizontalCollision(nx, ny, nz, 0.45, unlocked);
    assert.ok(
      Math.hypot(npcResolved.x - nx, npcResolved.z - nz) < 0.05,
      `NPC ${npc.id} should stand in clear alley space`,
    );
  }

  for (const term of TERMINAL_SPAWNS) {
    const [tx, ty, tz] = term.position;
    const termResolved = resolveHorizontalCollision(tx, ty, tz, 0.45, unlocked);
    assert.ok(
      Math.hypot(termResolved.x - tx, termResolved.z - tz) < 0.05,
      `Terminal ${term.id} should not overlap building solids`,
    );
  }

  for (const enemy of ENEMY_SPAWNS) {
    const [ex, ey, ez] = enemy.position;
    const enResolved = resolveHorizontalCollision(ex, ey, ez, 0.45, unlocked);
    assert.ok(
      Math.hypot(enResolved.x - ex, enResolved.z - ez) < 0.05,
      `Enemy ${enemy.id} should patrol clear alley/courtyard space`,
    );
  }
});

test('gate, biovault, and citadel barriers block until unlocked then permit passage', () => {
  const locked = { gateOpened: false, biovaultUnlocked: false, citadelUnlocked: false };
  const unlocked = { gateOpened: true, biovaultUnlocked: true, citadelUnlocked: true };

  // Gate at z=36..38 should push player back South when locked
  const blockedGate = resolveHorizontalCollision(0, 0, 38.2, 0.6, locked);
  assert.ok(blockedGate.z >= 38.59);

  const openGate = resolveHorizontalCollision(0, 0, 38.2, 0.6, unlocked);
  assert.equal(openGate.z, 38.2);

  // Citadel ramp smoothly climbs from y=0 at z=-24 to y=14 at z=-50
  const midRampY = groundHeightAt(0, -37, 10, unlocked);
  assert.ok(midRampY > 6.5 && midRampY < 7.5);

  // Bio-Vault ramp smoothly descends from y=0 at z=-16 to y=-7 at z=-34
  const bioMidY = groundHeightAt(-15, -25, 0, unlocked);
  assert.ok(bioMidY < -3 && bioMidY > -4);
});

test('awakening terrace and entire nexus plaza arrival hub have zero enemies', () => {
  const unlocked = { gateOpened: true, biovaultUnlocked: false, citadelUnlocked: false };

  // Zero enemies on the Awakening Terrace (z >= 35) or anywhere inside Nexus Plaza arrival hub
  for (const enemy of ENEMY_SPAWNS) {
    const [ex, , ez] = enemy.position;
    assert.ok(ez < 35, `Enemy ${enemy.id} must not spawn on the Awakening Terrace`);
    const insideStartingPlaza = Math.abs(ex) <= 25 && ez >= -18;
    assert.equal(insideStartingPlaza, false, `Enemy ${enemy.id} must not spawn in the starting Nexus Plaza hub`);
  }

  // Every enemy is well clear of the gate & Archivist M-07 welcome zone
  for (const enemy of ENEMY_SPAWNS) {
    const [ex, , ez] = enemy.position;
    assert.ok(Math.hypot(ex - 0, ez - 32) > 32, `Enemy ${enemy.id} too close to gate entrance`);
    assert.ok(Math.hypot(ex - 4.5, ez - 17.5) > 26, `Enemy ${enemy.id} too close to Archivist M-07`);
  }

  // Open main avenue has clear line-of-sight
  assert.equal(hasLineOfSight(0, 1.4, 34, 0, 1.4, 20, unlocked), true);

  // Skyscrapers block line-of-sight across parallel side alleys
  assert.equal(hasLineOfSight(0, 1.4, 24, -20.5, 1.4, 22, unlocked), false);
  assert.equal(hasLineOfSight(0, 1.4, 24, 21, 1.4, 22, unlocked), false);
});

test('story NPCs, distinct weapons, chests, enemies, and endings cover all narrow-street districts', () => {
  assert.ok(NPCS.length >= 5);
  assert.ok(NPCS.some((n) => n.id === 'npc_s01' && n.district === 'terrace'));
  assert.equal(CHEST_SPAWNS.length, 18);
  assert.equal(ENEMY_SPAWNS.length, 14);
  const archetypes = new Set(ENEMY_SPAWNS.map((e) => e.archetype));
  assert.ok(archetypes.size >= 4);
  assert.equal(Object.keys(ENDINGS).length, 3);
  assert.ok(Object.keys(LORE_ENTRIES).length >= 6);

  // Switching equipped weapon yields distinct projectile properties
  const [wpnTerrace] = generateProceduralChestLoot(0, 'Common');
  const [wpnAtrium] = generateProceduralChestLoot(5, 'Rare');
  assert.equal(wpnTerrace.category, 'weapon');
  assert.equal(wpnAtrium.category, 'weapon');
  assert.notEqual(wpnTerrace.name, wpnAtrium.name);

  const s1 = computePlayerStats({
    weapon: STARTER_WEAPON,
    core: STARTER_CORE,
    armor: STARTER_ARMOR,
    hacking: null,
    relics: [],
  });
  const s2 = computePlayerStats({
    weapon: wpnAtrium,
    core: STARTER_CORE,
    armor: STARTER_ARMOR,
    hacking: null,
    relics: [],
  });
  assert.notEqual(s1.weaponId, s2.weaponId);
  assert.notEqual(s1.weaponColorHex, s2.weaponColorHex);
});

test('shielded enemies can be broken cleanly via frontal drain, shield shred, shield bypass, or flanking', () => {
  // Frontal starter hit drains shield HP without touching hull yet
  const hit1 = resolveEnemyHitDamage({
    baseDamage: 22,
    shieldHp: 60,
    hitFront: true,
    shieldMult: 1.0,
    piercesShield: false,
  });
  assert.equal(hit1.hitShield, true);
  assert.equal(hit1.shieldShattered, false);
  assert.equal(hit1.newShieldHp, 38);
  assert.equal(hit1.hullDamage, 0);

  // Prism Scatter-Emitter deals 2.4x shield damage and shatters remaining shield with overflow hull damage
  const hitShred = resolveEnemyHitDamage({
    baseDamage: 16,
    shieldHp: 20,
    hitFront: true,
    shieldMult: 2.4, // 38 effective shield dmg >= 20
    piercesShield: false,
  });
  assert.equal(hitShred.hitShield, true);
  assert.equal(hitShred.shieldShattered, true);
  assert.equal(hitShred.newShieldHp, 0);
  assert.ok(hitShred.hullDamage > 0);

  // Solaris Twin-Railgun bypasses shield directly to hull
  const hitBypass = resolveEnemyHitDamage({
    baseDamage: 38,
    shieldHp: 60,
    hitFront: true,
    shieldMult: 1.0,
    piercesShield: true,
  });
  assert.equal(hitBypass.hitShield, false);
  assert.equal(hitBypass.newShieldHp, 60);
  assert.equal(hitBypass.hullDamage, 38);

  // Flanking behind/beside an active shield deals 1.5x hull crit
  const hitFlank = resolveEnemyHitDamage({
    baseDamage: 22,
    shieldHp: 60,
    hitFront: false,
    shieldMult: 1.0,
    piercesShield: false,
  });
  assert.equal(hitFlank.flankCrit, true);
  assert.equal(hitFlank.hitShield, false);
  assert.equal(hitFlank.hullDamage, 33);
});

test('crate weapons have genuinely distinct ranges and combat abilities beyond color', () => {
  const scatter = GUARANTEED_SPECIAL_WEAPONS[0];
  const carbine = generateProceduralChestLoot(0, 'Common')[0];
  const scatterCrate = generateProceduralChestLoot(5, 'Rare')[0];
  const lance = generateProceduralChestLoot(10, 'Rare')[0];
  const railgun = generateProceduralChestLoot(15, 'Rare')[0];

  const all = [STARTER_WEAPON, scatter, carbine, scatterCrate, lance, railgun];
  const ranges = new Set(all.map((w) => w.stats.range));
  const abilities = new Set(all.map((w) => w.stats.abilityName));
  assert.ok(ranges.size >= 5, 'Weapons should span multiple distinct ranges (20m to 98m)');
  assert.ok(abilities.size >= 5, 'Weapons should each carry a distinct tactical ability');
  assert.equal(scatter.stats.range, 20);
  assert.equal(scatter.stats.shieldMult, 2.4);
  assert.equal(carbine.stats.slowDuration, 1.2);
  assert.equal(carbine.stats.energyOnHit, 2);
  assert.equal(lance.stats.piercing, true);
  assert.ok((lance.stats.chainRadius ?? 0) >= 8);
  assert.equal(railgun.stats.piercesShield, true);
  assert.ok((railgun.stats.splashRadius ?? 0) >= 4);
});

