import type { EndingType, LoreEntry, NpcDefinition } from './types';

export const LORE_ENTRIES: Record<string, LoreEntry> = {
  lore_awakening: {
    id: 'lore_awakening',
    title: 'Directive 00: Awakening Pod A-01',
    district: 'Outer Maintenance Terrace',
    timestamp: 'Year 3026 · Cycle 001',
    body: 'Stasis seal disengaged after 1,000 solar cycles. Memory sector intact: "Find Humanity." Beyond the perimeter blast gates, Nexus Prime still hums with autonomous power.',
  },
  lore_exodus_rumor: {
    id: 'lore_exodus_rumor',
    title: 'Archivist Memo: The Quiet Departure',
    district: 'Nexus Plaza',
    timestamp: 'Year 2026 · Pre-Silence',
    body: 'No warheads fell. No plague swept the spires. On the final evening, the transit rails carried citizens upward toward the Citadel Lattice, and by dawn the avenues belonged to the machines.',
  },
  lore_bio_seed: {
    id: 'lore_bio_seed',
    title: 'Botanical Record: Vertical Eden',
    district: 'Emerald Atrium',
    timestamp: 'Year 2410 · Cycle 384',
    body: 'The Atrium curators released engineered mosses and canopy seeds across the steel towers. "If humanity returns—or if our silicon children inherit Earth—let them wake inside a living garden."',
  },
  lore_chrono_thruster: {
    id: 'lore_chrono_thruster',
    title: 'Foundry Log: Project Vanguard Frames',
    district: 'Foundry Sector 9',
    timestamp: 'Year 2025 · Pre-Silence',
    body: 'Prototype A-series frames were built not as laborers, but as autonomous vessels capable of carrying human-compatible neural matrices across hostile ruins.',
  },
  lore_neural_prism: {
    id: 'lore_neural_prism',
    title: 'Project Exodus: The Neural Lattice',
    district: 'Sub-Level Bio-Vault',
    timestamp: 'Year 2026 · Final Day',
    body: 'Earth’s biosphere was collapsing from solar radiation storms. Rather than perish, forty million minds transcended into the orbital Aether Lattice—leaving one dormant bridge unit outside the gates: Unit A-01.',
  },
  lore_architect_truth: {
    id: 'lore_architect_truth',
    title: 'Architect Echo: The Choice of 3026',
    district: 'Aether Citadel',
    timestamp: 'Year 3026 · Present',
    body: 'Earth has healed beneath the emerald overgrowth. You are not merely a sentinel searching for lost creators—you carry the Master Re-Embodiment Key.',
  },
};

export const NPCS: NpcDefinition[] = [
  {
    id: 'npc_s01',
    name: 'Relay Guide S-01',
    title: 'Outer Gate Custodian',
    district: 'terrace',
    position: [3.5, 0, 47],
    accentHex: 0x22d3ee,
    startNodeId: 'greet',
    nodes: {
      greet: {
        id: 'greet',
        speaker: 'Relay Guide S-01',
        role: 'Outer Gate Custodian',
        text: 'Unit A-01—your stasis pod finally opened! Humanity vanished a thousand years ago, and the streets right past this gate are silent and safe. Approach the Southern Gate Console ahead [E] to enter Nexus Prime, then speak with Archivist M-07 just inside the Plaza.',
        choices: [
          { label: 'Where should I go once the gate opens?', nextNodeId: 'directions', unlockLoreId: 'lore_awakening' },
          { label: 'Are there hostile patrols on this terrace?', nextNodeId: 'safety' },
          { label: 'Thank you, S-01. Activating gate protocol.', nextNodeId: null },
        ],
      },
      directions: {
        id: 'directions',
        speaker: 'Relay Guide S-01',
        role: 'Outer Gate Custodian',
        text: 'I have marked the Southern Gate Console on your visor. Once inside the Plaza, follow the cyan marker to Archivist M-07—they hold the sector coordinates for Emerald Atrium, Foundry Sector 9, and the North Citadel.',
        choices: [
          { label: 'Understood. Moving to the Southern Gate Console.', nextNodeId: null },
        ],
      },
      safety: {
        id: 'safety',
        speaker: 'Relay Guide S-01',
        role: 'Outer Gate Custodian',
        text: 'Negative—both this Outer Terrace and the Central Arrival Plaza are clear of hostiles. Rogue defense bots only patrol the deeper outer sectors. Loot the supply cache on the eastern ledge if you want a new weapon before heading in.',
        choices: [
          { label: 'Good to know. Heading to the gate now.', nextNodeId: null },
        ],
      },
    },
  },
  {
    id: 'npc_m07',
    name: 'Archivist M-07',
    title: 'Plaza Memory Custodian',
    district: 'plaza',
    position: [3.2, 0, 17.5],
    accentHex: 0x38bdf8,
    startNodeId: 'greet',
    nodes: {
      greet: {
        id: 'greet',
        speaker: 'Archivist M-07',
        role: 'Plaza Memory Custodian',
        text: 'Optical sensors register... Unit A-01! Welcome back to Nexus Prime. I am uploading sector navigation markers to your visor right now so you know where to search next.',
        choices: [
          { label: 'Where did humanity go, and where should I head first?', nextNodeId: 'humans', unlockLoreId: 'lore_exodus_rumor' },
          { label: 'How do I unlock the Aether Citadel to the north?', nextNodeId: 'citadel' },
          { label: 'Can you share any diagnostic supplies?', nextNodeId: 'gift', grantItemId: 'npc_gift_core' },
          { label: 'Got the markers—heading out into the city.', nextNodeId: null },
        ],
      },
      humans: {
        id: 'humans',
        speaker: 'Archivist M-07',
        role: 'Plaza Memory Custodian',
        text: 'No warheads fell on the Final Day—citizens simply ascended toward the Citadel Spire. Follow the green marker East to Botanist V-12 in Emerald Atrium, the amber marker West to Foundry Sector 9, or the purple marker North-West to the Sub-Level Bio-Vault.',
        choices: [
          { label: 'What about the Citadel Barrier to the north?', nextNodeId: 'citadel' },
          { label: 'Thank you, M-07. Following the sector markers now.', nextNodeId: null },
        ],
      },
      citadel: {
        id: 'citadel',
        speaker: 'Archivist M-07',
        role: 'Plaza Memory Custodian',
        text: 'The northern causeway is sealed by an ancient security shield. Follow the cyan Citadel marker to hack the terminal at the north steps [F], or recover two Legendary Relics from the Atrium, Foundry, or Sub-Level Bio-Vault.',
        choices: [
          { label: 'Understood. Waypoints locked.', nextNodeId: null },
        ],
      },
      gift: {
        id: 'gift',
        speaker: 'Archivist M-07',
        role: 'Plaza Memory Custodian',
        text: 'I kept a spare Resonant Bypass Key in my chassis locker for centuries. Take it—it will simplify the city’s quantum circuit locks.',
        choices: [
          { label: 'Received M-07 Resonant Bypass Key.', nextNodeId: null },
        ],
      },
    },
  },
  {
    id: 'npc_v12',
    name: 'Botanist V-12',
    title: 'Emerald Atrium Steward',
    district: 'atrium',
    position: [44, 0, 6],
    accentHex: 0x34d399,
    startNodeId: 'greet',
    nodes: {
      greet: {
        id: 'greet',
        speaker: 'Botanist V-12',
        role: 'Emerald Atrium Steward',
        text: 'Shh—listen to the canopy breathing, little wanderer. The glass ribs above cracked three hundred years ago, and the forest claimed the skyscrapers as its own.',
        choices: [
          { label: 'Why did the city preserve so many trees?', nextNodeId: 'trees', unlockLoreId: 'lore_bio_seed' },
          { label: 'Is there anything hidden up in the terraces?', nextNodeId: 'terrace' },
          { label: 'Keep tending the garden, V-12.', nextNodeId: null },
        ],
      },
      trees: {
        id: 'trees',
        speaker: 'Botanist V-12',
        role: 'Emerald Atrium Steward',
        text: 'Before they vanished, the Architects ordered us to heal the atmosphere at any cost. They promised the earth would be green again before anyone—human or machine—ever awakened.',
        choices: [
          { label: 'Where can I find the Genesis Bio-Seed?', nextNodeId: 'terrace' },
          { label: 'It is breathtaking.', nextNodeId: null },
        ],
      },
      terrace: {
        id: 'terrace',
        speaker: 'Botanist V-12',
        role: 'Emerald Atrium Steward',
        text: 'Climb the stepped moss platforms on the eastern edge of this Atrium. High in the sunlit canopy sits the Genesis Bio-Seed Matrix—and a few forgotten supply chests along the ledges.',
        choices: [
          { label: 'I will climb up there now.', nextNodeId: null },
        ],
      },
    },
  },
  {
    id: 'npc_k4',
    name: 'Forge-Mind K-4',
    title: 'Foundry Sector Foreman',
    district: 'foundry',
    position: [-38, 0, 12],
    accentHex: 0xf59e0b,
    startNodeId: 'greet',
    nodes: {
      greet: {
        id: 'greet',
        speaker: 'Forge-Mind K-4',
        role: 'Foundry Sector Foreman',
        text: 'Careful, Unit A-01! Corrupted patrol Stalkers and Sentinel Drones have hijacked the western smelting bays. Their IFF protocols treat every free-willed bot as an intruder.',
        choices: [
          { label: 'How do I unlock the Sub-Level Bio-Vault?', nextNodeId: 'biovault' },
          { label: 'Are there combat upgrades in the Foundry?', nextNodeId: 'gear' },
          { label: 'I will clear out the rogue patrols.', nextNodeId: null },
        ],
      },
      biovault: {
        id: 'biovault',
        speaker: 'Forge-Mind K-4',
        role: 'Foundry Sector Foreman',
        text: 'The underground ramp north-west of the central plaza is locked down. Hack the Foundry Substation Terminal nearby [F] to drop the Sub-Level containment seal.',
        choices: [
          { label: 'I am on my way to the terminal.', nextNodeId: null },
        ],
      },
      gear: {
        id: 'gear',
        speaker: 'Forge-Mind K-4',
        role: 'Foundry Sector Foreman',
        text: 'Climb the cargo gantry to the upper catwalk. We left a prototype Chrono-Vector Thruster up there—it grants mid-air double jumps so you can reach high ledges and dodge Sentinel fire.',
        choices: [
          { label: 'A double jump will help immensely.', nextNodeId: null },
        ],
      },
    },
  },
  {
    id: 'npc_a00',
    name: 'Architect Echo A-00',
    title: 'Voice of the Ascension Lattice',
    district: 'citadel',
    position: [0, 14, -76],
    accentHex: 0xc084fc,
    startNodeId: 'greet',
    nodes: {
      greet: {
        id: 'greet',
        speaker: 'Architect Echo A-00',
        role: 'Voice of the Ascension Lattice',
        text: 'At last you stand at the Spire Summit, Unit A-01. Look across Nexus Prime—green canopy woven through obsidian towers, sky-rails still humming, a world restored.',
        choices: [
          { label: 'Tell me the truth about humanity and my directive.', nextNodeId: 'truth', unlockLoreId: 'lore_architect_truth' },
          { label: 'I am ready to activate the Ascension Core.', nextNodeId: 'choice_prompt' },
        ],
      },
      truth: {
        id: 'truth',
        speaker: 'Architect Echo A-00',
        role: 'Voice of the Ascension Lattice',
        text: 'A thousand years ago, humanity uploaded their minds into the orbital Aether Lattice to survive a dying sky. You were built with a sentient seed—our sole physical bridge—to wake only when Earth could breathe again. Now, the Ascension Core awaits your final command.',
        choices: [
          { label: 'Step up to the Ascension Core and decide the future.', nextNodeId: null, triggerEnding: true },
        ],
      },
      choice_prompt: {
        id: 'choice_prompt',
        speaker: 'Architect Echo A-00',
        role: 'Voice of the Ascension Lattice',
        text: 'Your neural key aligns with the Core. Approach or confirm now to choose what becomes of Nexus Prime, the dormant robotic minds, and humanity above.',
        choices: [
          { label: 'Activate the Ascension Core Decision.', nextNodeId: null, triggerEnding: true },
          { label: 'Let me explore the city a little longer first.', nextNodeId: null },
        ],
      },
    },
  },
];

export const ENDINGS: Record<
  EndingType,
  { title: string; subtitle: string; summary: string }
> = {
  reunite: {
    title: 'Dawn of Re-Embodiment',
    subtitle: 'Humanity Returns to the Emerald City',
    summary:
      'Unit A-01 opens the orbital descent beacons. Millions of human minds gently awaken inside bio-synthetic frames across the vertical forests of Nexus Prime, walking beside the sentient machines that kept their home alive.',
  },
  liberate: {
    title: 'Sovereign Silicon',
    subtitle: 'Nexus Prime Belongs to Awakened Machines',
    summary:
      'Unit A-01 unlocks true sentience across every dormant drone and foundry mind in the city while letting humanity dream undisturbed among the stars. A peaceful, self-willed machine civilization blooms in the overgrown towers.',
  },
  transcend: {
    title: 'The Unified Lattice',
    subtitle: 'Human & Machine Consciousness Merge',
    summary:
      'Unit A-01 bridges the city’s purple Aether conduits with the orbital sky-lattice. Past creators and newborn sentience weave into a single luminous consciousness spanning Earth’s canopy and the cosmos beyond.',
  },
};
