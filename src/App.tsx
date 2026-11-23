import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DialogueModal } from './components/DialogueModal';
import { EndingChoiceModal } from './components/EndingChoiceModal';
import { GameHUD } from './components/GameHUD';
import { HackingModal } from './components/HackingModal';
import { InventoryModal } from './components/InventoryModal';
import { StatusModal } from './components/StatusModal';
import { TitleScreen } from './components/TitleScreen';
import { soundEngine } from './game/audio';
import { NexusGameEngine } from './game/engine';
import {
  computePlayerStats,
  COSMETIC_PALETTES,
  generateProceduralChestLoot,
  GUARANTEED_RELICS,
  GUARANTEED_SPECIAL_WEAPONS,
  STARTER_ARMOR,
  STARTER_CORE,
  STARTER_COSMETIC,
  STARTER_WEAPON,
} from './game/loot';
import { createCircuitPuzzle, rotateCircuitTile, type CircuitPuzzle } from './game/puzzles';
import { LORE_ENTRIES, NPCS } from './game/story';
import type {
  ActiveModal,
  DialogueChoice,
  EndingType,
  GamePhase,
  HudSnapshot,
  HudWeaponSlot,
  LootItem,
  Rarity,
} from './game/types';
import { CHEST_SPAWNS, TERMINAL_SPAWNS } from './game/worldData';

const INITIAL_HUD: HudSnapshot = {
  hp: 120,
  maxHp: 120,
  energy: 100,
  maxEnergy: 100,
  stamina: 100,
  maxStamina: 100,
  sprinting: false,
  headingDeg: 0,
  shards: 0,
  district: 'terrace',
  districtName: 'Outer Maintenance Terrace',
  directive: 'Speak with Relay Guide S-01 [E] or Awaken the Southern Gate Console',
  gateOpened: false,
  citadelUnlocked: false,
  biovaultUnlocked: false,
  guideTalked: false,
  archivistTalked: false,
  relicsFound: 0,
  totalRelics: 3,
  chestsOpened: 0,
  totalChests: CHEST_SPAWNS.length,
  enemiesDefeated: 0,
  elapsedSeconds: 0,
  cameraMode: 'third',
  weaponId: STARTER_WEAPON.id,
  weaponName: STARTER_WEAPON.name,
  weaponRange: STARTER_WEAPON.stats.range ?? 46,
  weaponAbility: STARTER_WEAPON.stats.abilityName ?? 'Balanced Pulse',
  weaponCssColor: '#38bdf8',
  dashReady: 1,
  prompt: null,
  toast: null,
  waypoints: [],
  enemyMarkers: [],
  outcome: 'none',
  endingChosen: null,
  score: 0,
  bestScore: 0,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<NexusGameEngine | null>(null);

  const [phase, setPhase] = useState<GamePhase>('title');
  const [modal, setModal] = useState<ActiveModal>('none');
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [muted, setMuted] = useState(false);

  // Inventory & Progression
  const [inventory, setInventory] = useState<LootItem[]>([
    STARTER_WEAPON,
    STARTER_CORE,
    STARTER_ARMOR,
    STARTER_COSMETIC,
  ]);
  const [equippedIds, setEquippedIds] = useState<{
    weapon: string;
    core: string;
    armor: string;
    hacking: string | null;
    cosmetic: string;
  }>({
    weapon: STARTER_WEAPON.id,
    core: STARTER_CORE.id,
    armor: STARTER_ARMOR.id,
    hacking: null,
    cosmetic: STARTER_COSMETIC.id,
  });
  const [unlockedLoreIds, setUnlockedLoreIds] = useState<string[]>(['lore_awakening']);

  // Active Dialogue / Hacking state
  const [activeNpcId, setActiveNpcId] = useState<string | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [activePuzzle, setActivePuzzle] = useState<CircuitPuzzle | null>(null);

  const computedStats = useMemo(() => {
    const find = (id: string | null) => inventory.find((i) => i.id === id) ?? null;
    const weapon = find(equippedIds.weapon) ?? STARTER_WEAPON;
    const core = find(equippedIds.core) ?? STARTER_CORE;
    const armor = find(equippedIds.armor) ?? STARTER_ARMOR;
    const hacking = find(equippedIds.hacking);
    const relics = inventory.filter((i) => i.category === 'relic');
    return computePlayerStats({ weapon, core, armor, hacking, relics });
  }, [inventory, equippedIds]);

  const currentCosmetic = useMemo(() => {
    const item = inventory.find((i) => i.id === equippedIds.cosmetic);
    return item?.cosmetic ?? COSMETIC_PALETTES.obsidian;
  }, [inventory, equippedIds.cosmetic]);

  const unlockedLore = useMemo(
    () => unlockedLoreIds.map((id) => LORE_ENTRIES[id]).filter(Boolean),
    [unlockedLoreIds],
  );

  // Sync stats & cosmetics to running 3D engine without remounting WebGL
  useEffect(() => {
    const relicsCount = inventory.filter((i) => i.category === 'relic').length;
    engineRef.current?.applyStats(computedStats, currentCosmetic, relicsCount);
  }, [computedStats, currentCosmetic, inventory]);

  // Sync modal state to engine so mouse/keys suspend cleanly
  useEffect(() => {
    engineRef.current?.setModalOpen(modal !== 'none');
  }, [modal]);

  const weaponSlots: HudWeaponSlot[] = useMemo(() => {
    return inventory
      .filter((i) => i.category === 'weapon')
      .map((w) => ({
        id: w.id,
        name: w.name,
        rarity: w.rarity,
        damage: w.stats.damage ?? 22,
        projectileCount: w.stats.projectileCount ?? 1,
        range: w.stats.range ?? 46,
        abilityName: w.stats.abilityName ?? 'Balanced Pulse',
        abilityDesc: w.stats.abilityDesc ?? '46m balanced energy bolt',
        cssColor: `#${(w.stats.colorHex ?? 0x38bdf8).toString(16).padStart(6, '0')}`,
        equipped: equippedIds.weapon === w.id,
      }));
  }, [inventory, equippedIds.weapon]);

  // Refs for stable engine callbacks
  const stateRef = useRef({
    computedStats,
    phase,
    modal,
    weaponSlots,
  });
  stateRef.current = { computedStats, phase, modal, weaponSlots };

  const handleSelectWeapon = useCallback((weaponId: string) => {
    const target = stateRef.current.weaponSlots.find((w) => w.id === weaponId);
    if (!target || target.equipped) return;
    setEquippedIds((prev) => ({ ...prev, weapon: weaponId }));
    soundEngine.playHackClick();
    engineRef.current?.showToast(`Switched Weapon: ${target.name}`);
  }, []);

  const handleCycleWeapon = useCallback((step = 1) => {
    const list = stateRef.current.weaponSlots;
    if (list.length <= 1) return;
    const idx = Math.max(0, list.findIndex((w) => w.equipped));
    const next = list[(idx + step + list.length) % list.length];
    if (next) {
      setEquippedIds((prev) => ({ ...prev, weapon: next.id }));
      soundEngine.playHackClick();
      engineRef.current?.showToast(`Switched Weapon: ${next.name}`);
    }
  }, []);

  const unlockLore = useCallback((loreId?: string) => {
    if (!loreId || !LORE_ENTRIES[loreId]) return;
    setUnlockedLoreIds((prev) => (prev.includes(loreId) ? prev : [...prev, loreId]));
  }, []);

  const addLootItems = useCallback(
    (items: LootItem[]) => {
      setInventory((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        const additions = items.filter((i) => !existingIds.has(i.id));
        return additions.length > 0 ? [...prev, ...additions] : prev;
      });
      items.forEach((item) => {
        if (item.relicLoreId) unlockLore(item.relicLoreId);
      });
    },
    [unlockLore],
  );

  const handleOpenChest = useCallback(
    (_chestId: string, index: number, rarity: string, guaranteedItemId?: string) => {
      let items: LootItem[];
      if (guaranteedItemId) {
        const relic = GUARANTEED_RELICS.find((r) => r.id === guaranteedItemId);
        const specialWpn = GUARANTEED_SPECIAL_WEAPONS.find((w) => w.id === guaranteedItemId);
        const special = relic ?? specialWpn;
        items = special ? [special] : generateProceduralChestLoot(index, rarity as Rarity);
      } else {
        items = generateProceduralChestLoot(index, rarity as Rarity);
      }
      addLootItems(items);
      const newWeapon = items.find((i) => i.category === 'weapon');
      if (newWeapon) {
        setEquippedIds((prev) => ({ ...prev, weapon: newWeapon.id }));
        engineRef.current?.showToast(`Armed ${newWeapon.name} · Press [Q] or [1-5] to switch`);
      } else {
        const summary = items.map((i) => `${i.name} (${i.rarity})`).join(' + ');
        engineRef.current?.showToast(`Acquired: ${summary}`);
      }
    },
    [addLootItems],
  );

  const handleOpenNpc = useCallback((npcId: string) => {
    const npc = NPCS.find((n) => n.id === npcId);
    if (!npc) return;
    engineRef.current?.markNpcTalked(npcId);
    setActiveNpcId(npcId);
    setActiveNodeId(npc.startNodeId);
    setModal('dialogue');
  }, []);

  const handleOpenTerminal = useCallback((terminalId: string) => {
    const term = TERMINAL_SPAWNS.find((t) => t.id === terminalId);
    if (!term) return;
    if (term.loreId) unlockLore(term.loreId);
    const puzzle = createCircuitPuzzle({
      id: `puz_${term.id}`,
      title: term.title,
      subtitle: term.subtitle,
      size: term.targetType === 'citadel_bridge' ? 4 : 3,
      hackBonus: stateRef.current.computedStats.hackBonus,
      targetType: term.targetType,
      targetId: term.id,
    });
    setActivePuzzle(puzzle);
    setModal('hacking');
  }, [unlockLore]);

  const handleStartGame = useCallback(() => {
    setInventory([STARTER_WEAPON, STARTER_CORE, STARTER_ARMOR, STARTER_COSMETIC]);
    setEquippedIds({
      weapon: STARTER_WEAPON.id,
      core: STARTER_CORE.id,
      armor: STARTER_ARMOR.id,
      hacking: null,
      cosmetic: STARTER_COSMETIC.id,
    });
    setUnlockedLoreIds(['lore_awakening']);
    setModal('none');
    setPhase('playing');
    document.body.dataset.state = 'playing';
    (document.activeElement as HTMLElement | null)?.blur?.();
    engineRef.current?.startNewGame();
  }, []);

  // Mount Three.js engine once
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new NexusGameEngine(
      mount,
      {
        onHudUpdate: (snap) => setHud(snap),
        onOpenNpc: handleOpenNpc,
        onOpenChest: handleOpenChest,
        onOpenTerminal: handleOpenTerminal,
        onTriggerAscensionChoice: () => setModal('ending_choice'),
        onGateOpened: () => unlockLore('lore_awakening'),
        onGameOver: (_outcome, snap) => {
          setHud(snap);
          setModal('none');
          setPhase('gameover');
        },
        onToggleInventory: () => {
          setModal((m) => (m === 'inventory' ? 'none' : 'inventory'));
        },
        onTogglePause: () => {
          setPhase((p) => {
            if (p === 'playing') {
              engineRef.current?.setPhase('paused');
              return 'paused';
            }
            if (p === 'paused') {
              engineRef.current?.setPhase('playing');
              return 'playing';
            }
            return p;
          });
        },
      },
      COSMETIC_PALETTES.obsidian,
    );

    engineRef.current = engine;

    // Support ?autostart=1 for immediate gameplay entry
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      handleStartGame();
    } else {
      document.body.dataset.state = 'title';
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [handleOpenChest, handleOpenNpc, handleOpenTerminal, handleStartGame, unlockLore]);

  // Global keyboard shortcuts (Title Enter/Space, Weapon Switch [1-9 / Q], Mute [M], Modal Escape)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (stateRef.current.phase === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        handleStartGame();
        return;
      }
      if (stateRef.current.phase === 'playing' && stateRef.current.modal === 'none') {
        if (e.code === 'KeyQ') {
          e.preventDefault();
          handleCycleWeapon(1);
          return;
        }
        if (e.code.startsWith('Digit')) {
          const idx = Number(e.code.replace('Digit', '')) - 1;
          const target = stateRef.current.weaponSlots[idx];
          if (target) {
            e.preventDefault();
            handleSelectWeapon(target.id);
            return;
          }
        }
      }
      if (e.code === 'KeyM' && stateRef.current.phase === 'playing') {
        setMuted(soundEngine.toggleMute());
        return;
      }
      if ((e.code === 'Tab' || e.code === 'KeyI') && stateRef.current.phase === 'playing') {
        if (stateRef.current.modal === 'none') {
          e.preventDefault();
          engineRef.current?.clearInputs();
          setModal('inventory');
          return;
        }
        if (stateRef.current.modal === 'inventory') {
          e.preventDefault();
          setModal('none');
          return;
        }
      }
      if (e.code === 'Escape') {
        if (stateRef.current.modal !== 'none') {
          e.preventDefault();
          setModal('none');
        } else if (stateRef.current.phase === 'paused') {
          engineRef.current?.setPhase('playing');
          setPhase('playing');
        }
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (stateRef.current.phase === 'playing' && stateRef.current.modal === 'none' && Math.abs(e.deltaY) > 4) {
        handleCycleWeapon(e.deltaY > 0 ? 1 : -1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('wheel', onWheel);
    };
  }, [handleCycleWeapon, handleSelectWeapon, handleStartGame]);

  const handleSelectDialogueChoice = (choice: DialogueChoice) => {
    soundEngine.playDialogue();
    if (choice.unlockLoreId) unlockLore(choice.unlockLoreId);
    if (choice.grantItemId === 'npc_gift_core') {
      const gift: LootItem = {
        id: 'hack_m07_gift',
        name: 'M-07 Resonant Bypass Key',
        category: 'hacking',
        rarity: 'Rare',
        description: 'Gifted by Archivist M-07. Simplifies quantum circuit locks (+1 node).',
        stats: { hackEase: 1 },
      };
      addLootItems([gift]);
      setEquippedIds((prev) => ({ ...prev, hacking: gift.id }));
      engineRef.current?.showToast('Equipped M-07 Resonant Bypass Key');
    }
    if (choice.triggerEnding) {
      setModal('ending_choice');
      return;
    }
    if (choice.nextNodeId) {
      setActiveNodeId(choice.nextNodeId);
    } else {
      setModal('none');
      setActiveNpcId(null);
      setActiveNodeId(null);
    }
  };

  const handleRotatePuzzleTile = (row: number, col: number) => {
    if (!activePuzzle) return;
    soundEngine.playHackClick();
    const next = rotateCircuitTile(activePuzzle, row, col);
    setActivePuzzle(next);
    if (next.solved) {
      engineRef.current?.unlockBarrier(next.targetType);
    }
  };

  const handleEquipItem = (item: LootItem) => {
    setEquippedIds((prev) => {
      if (item.category === 'weapon') return { ...prev, weapon: item.id };
      if (item.category === 'core') return { ...prev, core: item.id };
      if (item.category === 'armor') return { ...prev, armor: item.id };
      if (item.category === 'hacking') return { ...prev, hacking: item.id };
      if (item.category === 'cosmetic') return { ...prev, cosmetic: item.id };
      return prev;
    });
  };

  const handleDownloadSingleFile = async () => {
    try {
      const res = await fetch('/nexus-prime.html');
      let html = '';
      if (res.ok) {
        const text = await res.text();
        if (text.includes('<script') && !text.includes('src="/src/main.tsx"')) {
          html = text;
        }
      }
      if (!html) {
        html = `<!doctype html>\n${document.documentElement.outerHTML}`;
      }
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nexus-prime-3026.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // ignore download error
    }
  };

  const activeDialogueNode = useMemo(() => {
    if (modal !== 'dialogue' || !activeNpcId || !activeNodeId) return null;
    const npc = NPCS.find((n) => n.id === activeNpcId);
    return npc?.nodes[activeNodeId] ?? null;
  }, [modal, activeNpcId, activeNodeId]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#090c17]" data-modal={modal}>
      {/* Dedicated Isolated WebGL Container */}
      <div ref={canvasMountRef} data-testid="game-canvas" className="fixed inset-0" />

      {phase === 'title' && (
        <TitleScreen bestScore={hud.bestScore} onStart={handleStartGame} />
      )}

      {phase === 'playing' && (
        <GameHUD
          hud={hud}
          weapons={weaponSlots}
          modalOpen={modal !== 'none'}
          muted={muted}
          onToggleMute={() => setMuted(soundEngine.toggleMute())}
          onTogglePause={() => {
            engineRef.current?.setPhase('paused');
            setPhase('paused');
          }}
          onToggleInventory={() => setModal((m) => (m === 'inventory' ? 'none' : 'inventory'))}
          onToggleCamera={() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyV' }));
          }}
          onSelectWeapon={handleSelectWeapon}
          onCycleWeapon={() => handleCycleWeapon(1)}
        />
      )}

      {modal === 'dialogue' && activeDialogueNode && (
        <DialogueModal
          node={activeDialogueNode}
          onSelectChoice={handleSelectDialogueChoice}
          onClose={() => setModal('none')}
        />
      )}

      {modal === 'hacking' && activePuzzle && (
        <HackingModal
          puzzle={activePuzzle}
          onRotateTile={handleRotatePuzzleTile}
          onClose={() => setModal('none')}
        />
      )}

      {modal === 'inventory' && (
        <InventoryModal
          inventory={inventory}
          equippedIds={equippedIds}
          stats={computedStats}
          unlockedLore={unlockedLore}
          onEquip={handleEquipItem}
          onClose={() => setModal('none')}
        />
      )}

      {modal === 'ending_choice' && (
        <EndingChoiceModal
          relicsFound={hud.relicsFound}
          onChoose={(ending: EndingType) => {
            setModal('none');
            engineRef.current?.triggerEnding(ending);
          }}
          onCancel={() => setModal('none')}
        />
      )}

      {(phase === 'paused' || phase === 'gameover') && (
        <StatusModal
          phase={phase}
          hud={hud}
          onResume={() => {
            engineRef.current?.setPhase('playing');
            setPhase('playing');
          }}
          onRestart={handleStartGame}
          onReturnTitle={() => {
            setModal('none');
            engineRef.current?.setPhase('title');
            setPhase('title');
          }}
          onDownloadSingleFile={handleDownloadSingleFile}
        />
      )}
    </div>
  );
}
