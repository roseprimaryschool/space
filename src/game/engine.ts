import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  buildBarrelCluster,
  buildCargoCrate,
  buildConcreteBarrier,
  buildDumpster,
  buildEnemyMesh,
  buildForestTree,
  buildHangingVines,
  buildHoloAwning,
  buildLootChest,
  buildMaintenancePod,
  buildMountedBillboard,
  buildNpcRobot,
  buildPipeCluster,
  buildPlayerRobot,
  buildRubblePile,
  buildSkyTrain,
  buildSteamVent,
  buildStreetLamp,
  buildTerminal,
  buildVendingKiosk,
  buildWallHvacUnit,
  createBuildingFacadeTextures,
  createHoloBillboardTexture,
  createWetStreetTextures,
  type ChestRig,
  type EnemyRig,
  type PlayerRig,
} from './models';
import { soundEngine } from './audio';
import { resolveEnemyHitDamage } from './loot';
import { NPCS } from './story';
import {
  CHEST_SPAWNS,
  DISTRICT_META,
  ENEMY_SPAWNS,
  getDistrictAt,
  groundHeightAt,
  hasLineOfSight,
  PLAYER_SPAWN,
  resolveHorizontalCollision,
  TERMINAL_SPAWNS,
  WORLD_BOXES,
  WORLD_RAMPS,
  type DynamicBarrierState,
  type FacadeStyle,
} from './worldData';
import type {
  ComputedPlayerStats,
  CosmeticPalette,
  EnemyArchetype,
  EndingType,
  GamePhase,
  HudEnemyMarker,
  HudSnapshot,
  HudWaypoint,
  InteractionPrompt,
} from './types';

export interface EngineCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onOpenNpc: (npcId: string) => void;
  onOpenChest: (chestId: string, index: number, rarity: string, guaranteedItemId?: string) => void;
  onOpenTerminal: (terminalId: string) => void;
  onTriggerAscensionChoice: () => void;
  onGateOpened: () => void;
  onGameOver: (outcome: 'victory' | 'defeat', snapshot: HudSnapshot) => void;
  onToggleInventory: () => void;
  onTogglePause: () => void;
}

interface EnemyRuntime {
  id: string;
  archetype: EnemyArchetype;
  rig: EnemyRig;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  home: THREE.Vector3;
  patrolRadius: number;
  hp: number;
  maxHp: number;
  shieldHp: number;
  maxShieldHp: number;
  yaw: number;
  state: 'patrol' | 'chase' | 'windup' | 'recover' | 'ko';
  stateTimer: number;
  hitFlashTimer: number;
  stunTimer: number;
  slowTimer: number;
  lastDamagedAt: number;
  koTimer: number;
  strafeSign: number;
}

interface ProjectileRuntime {
  active: boolean;
  fromPlayer: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  damage: number;
  life: number;
  mesh: THREE.Mesh;
  colorHex: number;
  shieldMult: number;
  piercesShield: boolean;
  piercing: boolean;
  slowDuration: number;
  stunDuration: number;
  chainRadius: number;
  splashRadius: number;
  energyOnHit: number;
  hitEnemyIds: Set<string>;
}

interface ParticleRuntime {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  scale: number;
  color: THREE.Color;
}

interface AtmoDrop {
  x: number;
  y: number;
  z: number;
  speedY: number;
  driftX: number;
  isSpore: boolean;
}

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _camForward = new THREE.Vector3();
const _rainColor = new THREE.Color(0x38bdf8);
const _sporeColor = new THREE.Color(0x4ade80);
const _violetSpore = new THREE.Color(0xc084fc);

function scaleBoxUVs(geo: THREE.BoxGeometry, w: number, h: number, d: number, tileMeters = 10): void {
  const uv = geo.attributes.uv;
  const norm = geo.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(norm.getX(i));
    const ny = Math.abs(norm.getY(i));
    let uScale = w / tileMeters;
    let vScale = h / tileMeters;
    if (nx > 0.5) {
      uScale = d / tileMeters;
      vScale = h / tileMeters;
    } else if (ny > 0.5) {
      uScale = w / tileMeters;
      vScale = d / tileMeters;
    }
    uv.setXY(i, uv.getX(i) * uScale, uv.getY(i) * vScale);
  }
  uv.needsUpdate = true;
}

export class NexusGameEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;

  private frameId = 0;
  private disposed = false;
  private lastTickMs = performance.now();
  private elapsedTime = 0;

  private phase: GamePhase = 'title';
  private modalOpen = false;
  private cameraMode: 'third' | 'first' = 'third';

  // Player state
  private playerRig!: PlayerRig;
  private playerPos = new THREE.Vector3(...PLAYER_SPAWN);
  private playerVel = new THREE.Vector3();
  private playerYaw = 0;
  private camYaw = 0;
  private camPitch = 0.14;
  private camCurrentPos = new THREE.Vector3(3.8, 7.2, 18.0);
  private camLookCurrent = new THREE.Vector3(-0.5, 9.2, -30);
  private grounded = true;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private jumpsUsed = 0;
  private dashTimer = 0;
  private dashCooldownTimer = 0;
  private dashDir = new THREE.Vector3();
  private fireCooldown = 0;
  private invulnTimer = 0;
  private walkPhase = 0;
  private squashScale = new THREE.Vector3(1, 1, 1);

  private hp = 120;
  private energy = 100;
  private stamina = 100;
  private staminaDelayTimer = 0;
  private isSprinting = false;
  private shards = 0;
  private enemiesDefeated = 0;
  private elapsedSeconds = 0;
  private score = 0;
  private bestScore = 0;
  private relicsFound = 0;
  private hitstopTimer = 0;
  private trauma = 0;
  private toastMsg: string | null = null;
  private toastTimer = 0;
  private hudEmitTimer = 0;
  private guideTalked = false;
  private archivistTalked = false;
  private v12Talked = false;
  private k4Talked = false;

  private stats: ComputedPlayerStats = {
    maxHp: 120,
    armor: 5,
    maxEnergy: 100,
    energyRegen: 14,
    maxStamina: 100,
    staminaRegen: 28,
    weaponDamage: 22,
    fireRate: 3.4,
    projectileCount: 1,
    spread: 0.01,
    range: 48,
    moveSpeed: 10.5,
    dashCooldown: 1.35,
    hasDoubleJump: false,
    hackBonus: 0,
    weaponId: 'wpn_pulse_starter',
    weaponName: 'Mk-I Pulse Emitter',
    weaponColorHex: 0x38bdf8,
    projectileSpeed: 46,
    energyCost: 4,
    abilityName: 'Balanced Pulse',
    abilityDesc: '46m range · Low energy draw kinetic bolt',
    shieldMult: 1.0,
    piercesShield: false,
    piercing: false,
    slowDuration: 0,
    stunDuration: 0,
    chainRadius: 0,
    splashRadius: 0,
    energyOnHit: 0,
  };

  private barriers: DynamicBarrierState = {
    gateOpened: false,
    biovaultUnlocked: false,
    citadelUnlocked: false,
  };

  // Dynamic world refs
  private gateLeftMesh!: THREE.Mesh;
  private gateRightMesh!: THREE.Mesh;
  private gateOpenAnim = 0;
  private biovaultBarrierMesh!: THREE.Mesh;
  private citadelBarrierMesh!: THREE.Mesh;
  private skyTrain!: THREE.Group;
  private skyTrainT = 0;
  private orbitalRing!: THREE.Mesh;
  private ambientDrones: Array<{ group: THREE.Group; center: THREE.Vector3; radius: number; speed: number; phase: number }> = [];
  private holoMaterials: THREE.MeshBasicMaterial[] = [];
  private steamPuffs: Array<{ mesh: THREE.Mesh; basePhase: number }> = [];
  private waypointBeacons: Array<{ diamond: THREE.Mesh; beam: THREE.Mesh }> = [];
  private ascensionCoreMesh!: THREE.Mesh;

  // Atmospheric rain & spores
  private atmoDrops: AtmoDrop[] = [];
  private atmoMesh!: THREE.InstancedMesh;

  // Interactive entities
  private npcMeshes = new Map<string, THREE.Group>();
  private chestStates = new Map<string, { rig: ChestRig; opened: boolean; openAnim: number; pos: THREE.Vector3; rarity: string; index: number; guaranteedItemId?: string }>();
  private terminalStates = new Map<string, { mesh: THREE.Group; hacked: boolean; pos: THREE.Vector3; targetType: string }>();
  private enemies: EnemyRuntime[] = [];

  // Raycast occlusion list
  private occluders: THREE.Object3D[] = [];
  private raycaster = new THREE.Raycaster();

  // Pooled projectiles & particles
  private projectiles: ProjectileRuntime[] = [];
  private particles: ParticleRuntime[] = [];
  private particleMesh!: THREE.InstancedMesh;
  private particleCursor = 0;

  // Input
  private keys = new Set<string>();
  private mouseDown = false;
  private isDraggingLook = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private currentPrompt: InteractionPrompt | null = null;
  private lastOutcome: 'none' | 'victory' | 'defeat' = 'none';
  private lastEnding: EndingType | null = null;

  constructor(container: HTMLElement, callbacks: EngineCallbacks, initialCosmetic: CosmeticPalette) {
    this.container = container;
    this.callbacks = callbacks;

    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(width, height);

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.tabIndex = 0;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0f16);
    this.scene.fog = new THREE.FogExp2(0x0b0f16, 0.0124);

    this.camera = new THREE.PerspectiveCamera(62, width / Math.max(1, height), 0.15, 360);

    // Studio Environment Reflection (RoomEnvironment)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Hardware GPU Post-Processing (UnrealBloomPass + OutputPass)
    if (!this.isSoftwareGl) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.46,
        0.58,
        0.78,
      );
      this.composer.addPass(this.bloomPass);
      this.composer.addPass(new OutputPass());
    }

    try {
      const stored = localStorage.getItem('nexus_prime_best');
      if (stored) this.bestScore = Number(stored) || 0;
    } catch {
      // ignore storage errors
    }

    this.buildSkyAndAtmosphere();
    this.buildLighting();
    this.buildWorldGeometry();
    this.buildDynamicActors(initialCosmetic);
    this.initPools();
    this.bindEvents();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.lastTickMs = performance.now();
    this.tick();
  }

  private buildSkyAndAtmosphere(): void {
    // Smoggy overcast twilight sky dome with distant industrial sodium horizon haze
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {},
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        varying vec3 vWorldDir;
        float hash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }
        void main() {
          float h = clamp(vWorldDir.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 zenith = vec3(0.025, 0.032, 0.055);
          vec3 mid = vec3(0.055, 0.072, 0.11);
          vec3 horizon = vec3(0.11, 0.105, 0.125);
          vec3 col = mix(horizon, mid, smoothstep(0.45, 0.72, h));
          col = mix(col, zenith, smoothstep(0.68, 0.98, h));

          // Hazy polluted sodium/cyan smog band near city skyline
          float smog = exp(-pow((vWorldDir.y - 0.08) * 6.5, 2.0));
          col += vec3(0.08, 0.055, 0.035) * smog;

          // Faint aurora / orbital discharge streak high above clouds
          float band = exp(-pow((vWorldDir.y - 0.3 + vWorldDir.x * 0.14) * 5.2, 2.0));
          col += vec3(0.025, 0.08, 0.12) * band;

          if (vWorldDir.y > 0.14) {
            float s = hash(floor(vWorldDir * 220.0));
            if (s > 0.994) {
              col += vec3(0.7, 0.78, 0.9) * smoothstep(0.14, 0.45, vWorldDir.y) * 0.65;
            }
          }
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const skyDome = new THREE.Mesh(new THREE.SphereGeometry(270, 24, 16), skyMat);
    this.scene.add(skyDome);

    // Massive weathered Orbital Aether Ring arching across the northern horizon
    this.orbitalRing = new THREE.Mesh(
      new THREE.TorusGeometry(148, 1.35, 8, 96),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.34,
      }),
    );
    this.orbitalRing.position.set(0, 44, -95);
    this.orbitalRing.rotation.x = Math.PI * 0.38;
    this.orbitalRing.rotation.y = 0.28;
    this.scene.add(this.orbitalRing);

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const spireBeam = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 2.6, 130, 12, 1, true), beamMat);
    spireBeam.position.set(0, 78, -79);
    this.scene.add(spireBeam);
  }

  private buildLighting(): void {
    // Cool polluted slate sky vs gritty muddy earth bounce
    const hemi = new THREE.HemisphereLight(0x52697e, 0x171412, 0.85);
    this.scene.add(hemi);

    // Warm overcast sodium-haze key light for crisp normal-map & bevel highlights
    const key = new THREE.DirectionalLight(0xe6d8c5, 1.38);
    key.position.set(44, 72, 38);
    if (!this.isSoftwareGl) {
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.near = 5;
      key.shadow.camera.far = 175;
      key.shadow.camera.left = -75;
      key.shadow.camera.right = 75;
      key.shadow.camera.top = 75;
      key.shadow.camera.bottom = -75;
      key.shadow.bias = -0.0005;
      key.shadow.normalBias = 0.02;
    }
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0x7c3aed, 0.58);
    rim.position.set(-48, 30, -64);
    this.scene.add(rim);

    // 5 unshadowed atmospheric district point lights (within budget)
    const plazaGlow = new THREE.PointLight(0x38bdf8, 22, 40, 1.5);
    plazaGlow.position.set(0, 9, 10);
    this.scene.add(plazaGlow);

    const alleyGlow = new THREE.PointLight(0xd97706, 22, 32, 1.5);
    alleyGlow.position.set(-14, 6.5, 22);
    this.scene.add(alleyGlow);

    const atriumGlow = new THREE.PointLight(0x34d399, 22, 40, 1.5);
    atriumGlow.position.set(50, 8, 4);
    this.scene.add(atriumGlow);

    const foundryGlow = new THREE.PointLight(0xea580c, 24, 38, 1.5);
    foundryGlow.position.set(-50, 7, 0);
    this.scene.add(foundryGlow);

    const citadelGlow = new THREE.PointLight(0xc084fc, 28, 46, 1.5);
    citadelGlow.position.set(0, 19, -70);
    this.scene.add(citadelGlow);
  }

  private buildWorldGeometry(): void {
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const streetTex = createWetStreetTextures(maxAniso);

    // Shared facade materials per architectural style with tangent-space normal & roughness depth
    const styles: FacadeStyle[] = ['cyber_tower', 'neon_arcade', 'industrial', 'conservatory', 'citadel'];
    const facadeMats = new Map<FacadeStyle, THREE.MeshStandardMaterial>();
    for (const st of styles) {
      const texSet = createBuildingFacadeTextures(st, maxAniso);
      const emisColor =
        st === 'industrial'
          ? 0xffedd5
          : st === 'conservatory'
            ? 0xa7f3d0
            : st === 'citadel'
              ? 0xe9d5ff
              : 0xffffff;
      facadeMats.set(
        st,
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: texSet.map,
          emissive: emisColor,
          emissiveMap: texSet.emissiveMap,
          emissiveIntensity: 0.85,
          roughnessMap: texSet.roughnessMap,
          normalMap: texSet.normalMap,
          normalScale: new THREE.Vector2(1.15, 1.15),
          roughness: 0.94,
          metalness: 0.36,
          envMapIntensity: 0.55,
        }),
      );
    }

    // Cracked puddle-streaked weathered asphalt roadway
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: streetTex.map,
      roughnessMap: streetTex.roughnessMap,
      normalMap: streetTex.normalMap,
      normalScale: new THREE.Vector2(1.15, 1.15),
      roughness: 0.96,
      metalness: 0.14,
      envMapIntensity: 0.24,
    });

    const addGroundSlab = (minX: number, maxX: number, minZ: number, maxZ: number, y = 0) => {
      const w = maxX - minX;
      const d = maxZ - minZ;
      const geo = new THREE.BoxGeometry(w, 1.0, d);
      scaleBoxUVs(geo, w, 1, d, 8);
      const mesh = new THREE.Mesh(geo, deckMat);
      mesh.position.set((minX + maxX) / 2, y - 0.5, (minZ + maxZ) / 2);
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    };

    addGroundSlab(-150, 150, -16, 150, 0);
    addGroundSlab(-9.5, 150, -150, -16, 0);
    addGroundSlab(-150, -23, -150, -16, 0);
    addGroundSlab(-23, -9.5, -150, -58, 0);

    // Starting Maintenance Pod
    const pod = buildMaintenancePod();
    pod.position.set(0, 0, 62);
    this.scene.add(pod);

    // Build WORLD_BOXES with properly scaled facade UVs, neon roof crowns & architectural setbacks
    for (const box of WORLD_BOXES) {
      const w = box.maxX - box.minX;
      const h = box.maxY - box.minY;
      const d = box.maxZ - box.minZ;
      const cx = (box.minX + box.maxX) / 2;
      const cy = (box.minY + box.maxY) / 2;
      const cz = (box.minZ + box.maxZ) / 2;

      if (box.kind === 'gate') {
        const doorArmMat = facadeMats.get('industrial')!;
        const ribMat = new THREE.MeshStandardMaterial({
          color: 0x13161c,
          roughness: 0.65,
          metalness: 0.72,
        });
        const rustFrameMat = new THREE.MeshStandardMaterial({
          color: 0x2b211b,
          roughness: 0.84,
          metalness: 0.45,
        });
        const trimMat = new THREE.MeshStandardMaterial({
          color: 0xd97706,
          emissive: 0xb45309,
          emissiveIntensity: 1.4,
          roughness: 0.3,
        });
        const seamMat = new THREE.MeshStandardMaterial({
          color: 0x22d3ee,
          emissive: 0x06b6d4,
          emissiveIntensity: 1.35,
          roughness: 0.25,
        });

        const buildDoorLeaf = (sideSign: number): THREE.Mesh => {
          const leafGeo = new THREE.BoxGeometry(6, 16, 1.4);
          scaleBoxUVs(leafGeo, 6, 16, 1.4, 8);
          const leaf = new THREE.Mesh(leafGeo, doorArmMat);
          leaf.position.set(sideSign * 3, 8, 37);

          // Heavy horizontal armored vault beams
          for (const ry of [-6.8, -2.6, 1.8, 6.2]) {
            const rib = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.58, 1.8), ribMat);
            rib.position.y = ry;
            leaf.add(rib);
          }
          // Vertical rusted steel frame posts
          const postOuter = new THREE.Mesh(new THREE.BoxGeometry(0.42, 16, 1.75), rustFrameMat);
          postOuter.position.x = sideSign * 2.75;
          leaf.add(postOuter);

          // Slim recessed amber/cyan lock slit
          const edgeStrip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 14.8, 1.84), trimMat);
          edgeStrip.position.x = -sideSign * 2.86;
          leaf.add(edgeStrip);

          for (const ry of [-4.6, -0.4, 3.8]) {
            const inlay = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 1.7), seamMat);
            inlay.position.set(-sideSign * 0.6, ry, 0);
            leaf.add(inlay);
          }
          return leaf;
        };

        this.gateLeftMesh = buildDoorLeaf(-1);
        this.gateRightMesh = buildDoorLeaf(1);

        this.scene.add(this.gateLeftMesh, this.gateRightMesh);
        this.occluders.push(this.gateLeftMesh, this.gateRightMesh);
        continue;
      }

      if (box.kind === 'biovault_barrier' || box.kind === 'citadel_barrier') {
        const isBio = box.kind === 'biovault_barrier';
        const colHex = isBio ? 0xf59e0b : 0x38bdf8;
        const fieldMat = new THREE.MeshStandardMaterial({
          color: colHex,
          emissive: colHex,
          emissiveIntensity: 0.5,
          transparent: true,
          opacity: 0.03,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const barrierMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.25), fieldMat);
        barrierMesh.position.set(cx, cy, cz);

        const beamMat = new THREE.MeshStandardMaterial({
          color: colHex,
          emissive: colHex,
          emissiveIntensity: 1.8,
        });
        for (let by = -h * 0.35; by <= h * 0.35; by += h * 0.22) {
          const laser = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, 0.24), beamMat);
          laser.position.y = by;
          barrierMesh.add(laser);
        }
        this.scene.add(barrierMesh);
        if (isBio) this.biovaultBarrierMesh = barrierMesh;
        else this.citadelBarrierMesh = barrierMesh;
        continue;
      }

      const geo = new THREE.BoxGeometry(w, h, d);
      const isAtriumGreen = box.district === 'atrium' && box.kind === 'platform';
      let mat: THREE.MeshStandardMaterial;

      if (isAtriumGreen) {
        mat = new THREE.MeshStandardMaterial({
          color: box.colorHex ?? 0x204d3c,
          roughness: 0.88,
          metalness: 0.06,
        });
      } else if (box.facadeStyle && facadeMats.has(box.facadeStyle)) {
        scaleBoxUVs(geo, w, h, d, 14);
        mat = facadeMats.get(box.facadeStyle)!;
      } else if (box.facadeStyle === 'bridge') {
        scaleBoxUVs(geo, w, h, d, 10);
        mat = facadeMats.get('industrial')!;
      } else {
        scaleBoxUVs(geo, w, h, d, 10);
        mat = new THREE.MeshStandardMaterial({
          color: box.colorHex ?? 0x1e222a,
          roughness: 0.85,
          metalness: 0.35,
          normalMap: streetTex.normalMap,
          normalScale: new THREE.Vector2(0.55, 0.55),
        });
      }

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(cx, cy, cz);
      mesh.castShadow = h > 2.5;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      if (h > 2.0) this.occluders.push(mesh);

      // Real 3D Architectural Relief: corner steel buttresses, concrete base curbs & horizontal belt ledges
      if (h >= 12 && box.facadeStyle !== 'bridge') {
        const girderMat = new THREE.MeshStandardMaterial({ color: 0x0e131d, roughness: 0.62, metalness: 0.72 });
        const plinthMat = new THREE.MeshStandardMaterial({ color: 0x1a202c, roughness: 0.86, metalness: 0.18 });

        // Ground-floor brutalist foundation plinth skirt
        const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.32, 1.35, d + 0.32), plinthMat);
        plinth.position.set(cx, box.minY + 0.675, cz);
        plinth.receiveShadow = true;
        this.scene.add(plinth);

        // 4 structural corner steel girders giving deep 3D edge silhouettes
        const colW = Math.min(0.48, Math.min(w, d) * 0.14);
        [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ].forEach(([sx, sz]) => {
          const buttress = new THREE.Mesh(new THREE.BoxGeometry(colW, h, colW), girderMat);
          buttress.position.set(cx + sx * (w / 2), cy, cz + sz * (d / 2));
          this.scene.add(buttress);
        });

        // Horizontal protruding structural belt ledges every ~10m of tower height
        for (let ly = box.minY + 9.5; ly < box.maxY - 2; ly += 10) {
          const belt = new THREE.Mesh(new THREE.BoxGeometry(w + 0.28, 0.38, d + 0.28), girderMat);
          belt.position.set(cx, ly, cz);
          this.scene.add(belt);
        }

        const accentHex =
          box.district === 'atrium'
            ? 0x34d399
            : box.district === 'foundry'
              ? 0xf59e0b
              : box.facadeStyle === 'neon_arcade'
                ? 0xec4899
                : 0x38bdf8;
        const trimMat = new THREE.MeshStandardMaterial({
          color: accentHex,
          emissive: accentHex,
          emissiveIntensity: 1.55,
          roughness: 0.22,
        });
        const crown = new THREE.Mesh(new THREE.BoxGeometry(w + 0.34, 0.26, d + 0.34), trimMat);
        crown.position.set(cx, box.maxY - 0.8, cz);
        this.scene.add(crown);

        // Stepped penthouse & antenna spire on skyscrapers >= 24m
        if (h >= 24) {
          const pentMat = facadeMats.get(box.facadeStyle ?? 'cyber_tower')!;
          const pentGeo = new THREE.BoxGeometry(w * 0.62, 6, d * 0.62);
          scaleBoxUVs(pentGeo, w * 0.62, 6, d * 0.62, 12);
          const pent = new THREE.Mesh(pentGeo, pentMat);
          pent.position.set(cx, box.maxY + 3, cz);
          this.scene.add(pent);

          const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.22, 9, 6), trimMat);
          mast.position.set(cx, box.maxY + 10.5, cz);
          this.scene.add(mast);
        }
      }

      // Glowing under-truss strip on skybridges
      if (box.facadeStyle === 'bridge') {
        const railMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x06b6d4,
          emissiveIntensity: 1.65,
          roughness: 0.2,
        });
        const underStrip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d + 0.18), railMat);
        underStrip.position.set(cx, box.minY + 0.12, cz);
        this.scene.add(underStrip);
      }

      if (isAtriumGreen) {
        const mossMat = new THREE.MeshStandardMaterial({ color: 0x206846, roughness: 0.9 });
        const mossCap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, 0.18, d + 0.14), mossMat);
        mossCap.position.set(cx, box.maxY + 0.05, cz);
        mossCap.receiveShadow = true;
        this.scene.add(mossCap);
      }
    }

    // Build Ramps
    for (const r of WORLD_RAMPS) {
      const lenZ = r.maxZ - r.minZ;
      const dy = r.yAtMaxZ - r.yAtMinZ;
      const hyp = Math.hypot(lenZ, dy);
      const angle = Math.atan2(dy, lenZ);
      const rampGeo = new THREE.BoxGeometry(r.maxX - r.minX, 0.6, hyp);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x1e2538,
        roughness: 0.45,
        metalness: 0.68,
      });
      const mesh = new THREE.Mesh(rampGeo, mat);
      mesh.position.set((r.minX + r.maxX) / 2, (r.yAtMinZ + r.yAtMaxZ) / 2 - 0.3, (r.minZ + r.maxZ) / 2);
      mesh.rotation.x = -angle;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      const railMat = new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0xa855f7,
        emissiveIntensity: 1.8,
      });
      [-1, 1].forEach((side) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, hyp), railMat);
        rail.position.set(
          (r.minX + r.maxX) / 2 + side * ((r.maxX - r.minX) / 2 - 0.15),
          (r.yAtMinZ + r.yAtMaxZ) / 2 + 0.25,
          (r.minZ + r.maxZ) / 2,
        );
        rail.rotation.x = -angle;
        this.scene.add(rail);
      });
    }

    // Recessed Steel Transit Tram Rails & Curbside Grates (replacing glaring white stripe)
    const railSteelMat = new THREE.MeshStandardMaterial({ color: 0x3b4559, roughness: 0.35, metalness: 0.88 });
    [-0.95, 0.95].forEach((rx) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.04, 78), railSteelMat);
      rail.position.set(rx, 0.015, 17);
      this.scene.add(rail);
    });
    [11.1, 12.9].forEach((rz) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(92, 0.04, 0.11), railSteelMat);
      rail.position.set(0, 0.015, rz);
      this.scene.add(rail);
    });

    // Streetlamps with volumetric light cones along narrow alleys
    const lampSpecs: Array<[number, number, number, number, number]> = [
      [-4.8, 0, 52, Math.PI / 2, 0x38bdf8],
      [4.8, 0, 46, -Math.PI / 2, 0xf59e0b],
      [-5.2, 0, 31, Math.PI / 2, 0x38bdf8],
      [5.2, 0, 31, -Math.PI / 2, 0x38bdf8],
      [-5.2, 0, 14, Math.PI / 2, 0xf59e0b],
      [5.2, 0, 14, -Math.PI / 2, 0x38bdf8],
      [-18.8, 0, 22, 0, 0xf59e0b],
      [18.8, 0, 22, Math.PI, 0x34d399],
      [34, 0, 4, 0, 0x34d399],
      [-34, 0, 4, 0, 0xf59e0b],
    ];
    for (const [lx, ly, lz, rotY, hex] of lampSpecs) {
      const lamp = buildStreetLamp(hex);
      lamp.position.set(lx, ly, lz);
      lamp.rotation.y = rotY;
      this.scene.add(lamp);
    }

    // Storefront Holographic Awnings overhanging narrow streets
    const awningSpecs: Array<[number, number, number, number, number]> = [
      [6.2, 3.6, 23, -Math.PI / 2, 0xec4899],
      [-6.2, 3.6, 23, Math.PI / 2, 0x38bdf8],
      [9.5, 3.8, 18, Math.PI, 0xa855f7],
      [-9.5, 3.8, 18, Math.PI, 0x38bdf8],
      [9.5, 3.8, 2.5, 0, 0x34d399],
      [-9.5, 3.8, 1.5, 0, 0xf59e0b],
    ];
    for (const [ax, ay, az, rotY, hex] of awningSpecs) {
      const awning = buildHoloAwning(hex);
      awning.position.set(ax, ay, az);
      awning.rotation.y = rotY;
      this.scene.add(awning);
    }

    // Cyber Vending Kiosks & Industrial Pipe Clusters tucked in alley corners
    const kioskCoords: Array<[number, number, number, number, number]> = [
      [-5.1, 0, 48, Math.PI / 2, 0x22d3ee],
      [5.1, 0, 29.5, -Math.PI / 2, 0xf59e0b],
      [-17.8, 0, 27, -Math.PI / 2, 0xa855f7],
      [17.8, 0, 26, Math.PI / 2, 0x34d399],
    ];
    for (const [kx, ky, kz, rotY, hex] of kioskCoords) {
      const k = buildVendingKiosk(hex);
      k.position.set(kx, ky, kz);
      k.rotation.y = rotY;
      this.scene.add(k);
    }

    const pipeCoords: Array<[number, number, number, number]> = [
      [-15.2, 0, 54, 0x38bdf8],
      [-35.2, 0, -5.2, 0xf59e0b],
      [-46.2, 0, -4.2, 0xf59e0b],
      [-52.2, 0, 9.2, 0xf59e0b],
    ];
    for (const [px, py, pz, hex] of pipeCoords) {
      const pipes = buildPipeCluster(hex);
      pipes.position.set(px, py, pz);
      this.scene.add(pipes);
    }

    // Wall-mounted HVAC/Exhaust Fans breaking up tall building walls
    const hvacSpecs: Array<[number, number, number, number]> = [
      [-5.4, 4.2, 46, Math.PI / 2],
      [15.6, 5.4, 56, -Math.PI / 2],
      [-6.1, 5.2, -3, Math.PI / 2],
      [6.1, 5.6, -4, -Math.PI / 2],
      [-9.4, 4.8, 22, Math.PI / 2],
      [9.4, 4.8, 22, -Math.PI / 2],
      [-23.4, 5.0, 24, Math.PI / 2],
      [23.4, 5.0, 24, -Math.PI / 2],
    ];
    for (const [hx, hy, hz, rotY] of hvacSpecs) {
      const hvac = buildWallHvacUnit();
      hvac.position.set(hx, hy, hz);
      hvac.rotation.y = rotY;
      this.scene.add(hvac);
    }

    // Dystopian Street Clutter: Weathered Cargo Crates & Concrete Barriers along curbs
    const crateSpecs: Array<[number, number, number, number, number]> = [
      [9.6, 0, 50, 0.15, 0xf59e0b],
      [-14.8, 0, 58, 0.3, 0x38bdf8],
      [-18.2, 0, 17, 0.1, 0xf59e0b],
      [18.2, 0, 17, -0.2, 0x34d399],
      [-34.2, 0, 15, 0.05, 0xf59e0b],
    ];
    for (const [cx2, cy2, cz2, rotY, hex] of crateSpecs) {
      const c = buildCargoCrate(hex);
      c.position.set(cx2, cy2, cz2);
      c.rotation.y = rotY;
      this.scene.add(c);
    }

    const barrierSpecs: Array<[number, number, number, number]> = [
      [-9.4, 0, 42, Math.PI / 2],
      [9.4, 0, 42, Math.PI / 2],
      [-4.6, 0, 32, Math.PI / 2],
      [4.6, 0, 32, Math.PI / 2],
      [-22.2, 0, 15.5, 0],
      [22.2, 0, 15.5, 0],
    ];
    for (const [bx, by, bz, rotY] of barrierSpecs) {
      const bar = buildConcreteBarrier();
      bar.position.set(bx, by, bz);
      bar.rotation.y = rotY;
      this.scene.add(bar);
    }

    // Raised Weathered Concrete Sidewalk Curbs along main avenues
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x262930, roughness: 0.94, metalness: 0.06 });
    const curbStrips: Array<[number, number, number, number]> = [
      [-5.2, 49, 1.3, 19],
      [10.2, 49, 1.3, 19],
      [-5.8, 23, 1.4, 12],
      [5.8, 23, 1.4, 12],
      [-5.8, -3, 1.4, 11],
      [5.8, -3, 1.4, 11],
      [-18.8, 23, 1.4, 12],
      [18.8, 23, 1.4, 12],
    ];
    for (const [cx, cz, cw, cd] of curbStrips) {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.14, cd), curbMat);
      curb.position.set(cx, 0.07, cz);
      curb.receiveShadow = true;
      this.scene.add(curb);
    }

    // Grimy Dumpsters, Rusted Oil Barrels, Concrete Rubble & Steam Vents tucked along curbs
    const dumpsterSpots: Array<[number, number, number, number]> = [
      [-15.0, 0, 46, Math.PI / 2],
      [-18.4, 0, 19, Math.PI / 2],
      [18.4, 0, -5, -Math.PI / 2],
      [-35.8, 0, 18.5, 0],
    ];
    for (const [dx, dy, dz, rotY] of dumpsterSpots) {
      const dmp = buildDumpster();
      dmp.position.set(dx, dy, dz);
      dmp.rotation.y = rotY;
      this.scene.add(dmp);
    }

    const barrelSpots: Array<[number, number, number, number]> = [
      [-5.0, 0, 58, 0xb45309],
      [14.8, 0, 42, 0x991b1b],
      [-18.2, 0, 2.5, 0xb45309],
      [18.2, 0, 14, 0x0f766e],
      [-45.4, 0, -2, 0xd97706],
    ];
    for (const [bx, by, bz, hex] of barrelSpots) {
      const barrels = buildBarrelCluster(hex);
      barrels.position.set(bx, by, bz);
      this.scene.add(barrels);
    }

    const rubbleSpots: Array<[number, number, number, number]> = [
      [4.5, 0, 56, 0.4],
      [-4.6, 0, 34, 1.2],
      [-8.5, 0, 17.4, 0.7],
      [8.5, 0, 17.4, 2.1],
      [-17.2, 0, -9, 0.2],
      [35.2, 0, 17, 1.6],
    ];
    for (const [rx, ry, rz, rotY] of rubbleSpots) {
      const rub = buildRubblePile();
      rub.position.set(rx, ry, rz);
      rub.rotation.y = rotY;
      this.scene.add(rub);
    }

    const ventSpots: Array<[number, number, number]> = [
      [-3.2, 0, 50],
      [3.4, 0, 26],
      [-3.4, 0, 10],
      [-38, 0, 6],
    ];
    ventSpots.forEach(([vx, vy, vz], idx) => {
      const { group, puffs } = buildSteamVent();
      group.position.set(vx, vy, vz);
      this.scene.add(group);
      puffs.forEach((mesh, pIdx) => {
        this.steamPuffs.push({ mesh, basePhase: idx * 0.7 + pIdx * 0.25 });
      });
    });

    // Draped overhead power cables bridging narrow alleyways
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7, metalness: 0.5 });
    const cableSpans: Array<[THREE.Vector3, THREE.Vector3]> = [
      [new THREE.Vector3(-9.5, 9.5, 27), new THREE.Vector3(9.5, 10.2, 26)],
      [new THREE.Vector3(-17.5, 12.5, 14), new THREE.Vector3(17.5, 11.8, 15)],
      [new THREE.Vector3(-18, 13.0, 2), new THREE.Vector3(18, 13.5, 1)],
      [new THREE.Vector3(-11, 7.2, 51), new THREE.Vector3(11, 8.2, 50)],
    ];
    for (const [a, b] of cableSpans) {
      const mid = a.clone().lerp(b, 0.5);
      mid.y -= 1.65;
      const curve = new THREE.CatmullRomCurve3([a, mid, b]);
      const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.055, 5, false), cableMat);
      this.scene.add(cable);
    }

    // Hanging overgrown emerald vines along Atrium walls & skybridges
    const vineSpots: Array<[number, number, number, number]> = [
      [0, 9.2, 24.6, 0],
      [0, 11.0, -2.4, 0],
      [37, 15.8, 10, 0],
      [51, 13.8, 8, 0],
      [42, 18, -20, 0],
    ];
    for (const [vx, vy, vz, rotY] of vineSpots) {
      const v = buildHangingVines(5.5, 4.2);
      v.position.set(vx, vy, vz);
      v.rotation.y = rotY;
      this.scene.add(v);
    }

    // Elevated Sky-Rail Viaduct & Automated Monorail Train
    const viaductMat = new THREE.MeshStandardMaterial({ color: 0x171d2c, roughness: 0.42, metalness: 0.8 });
    const railTrack = new THREE.Mesh(new THREE.BoxGeometry(190, 1.4, 3.6), viaductMat);
    railTrack.position.set(0, 22.8, 12);
    this.scene.add(railTrack);

    const railGlow = new THREE.Mesh(
      new THREE.BoxGeometry(190, 0.25, 3.8),
      new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 1.9 }),
    );
    railGlow.position.set(0, 23.6, 12);
    this.scene.add(railGlow);

    this.skyTrain = buildSkyTrain();
    this.skyTrain.position.set(-40, 25.0, 12);
    this.scene.add(this.skyTrain);

    // Conservatory Arches & Vertical Forest Trees
    const archMat = new THREE.MeshStandardMaterial({ color: 0x26354a, roughness: 0.28, metalness: 0.84 });
    for (let x = 35; x <= 68; x += 11) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(20, 0.45, 6, 20, Math.PI), archMat);
      arch.rotation.y = Math.PI / 2;
      arch.position.set(x, 0, 0);
      this.scene.add(arch);
    }

    const treePositions: Array<[number, number, number, number]> = [
      [31, 0, 14, 1.15],
      [43, 0, -5, 1.2],
      [56, 0, 12, 1.25],
      [66, 0, -16, 1.1],
      [64, 9.0, 16, 0.85],
      [19.5, 0, 31, 0.88],
      [-19.5, 0, 31, 0.88],
      [14, 0, -14, 0.95],
      [-13.5, 0, 56, 0.85],
      [13.5, 0, 56, 0.85],
      [45, 0, 15, 1.0],
      [-31, 0, 15, 0.8],
    ];
    treePositions.forEach(([tx, ty, tz, s], i) => {
      const tree = buildForestTree(s, i % 2 === 0 ? 0x4ade80 : 0x34d399);
      tree.position.set(tx, ty, tz);
      this.scene.add(tree);
    });

    // Mounted Steel-Framed Holographic Billboards & Vertical Alley Signs
    const billboards = [
      { pos: [-17.1, 14, 24] as const, rotY: Math.PI / 2, title: 'NEXUS PRIME', sub: 'TRANSIT LINE A', color: '#06b6d4', hex: 0x06b6d4, vert: false },
      { pos: [17.1, 15, 24] as const, rotY: -Math.PI / 2, title: 'EXODUS', sub: 'AETHER LATTICE', color: '#c084fc', hex: 0xc084fc, vert: false },
      { pos: [-5.8, 7.5, 22] as const, rotY: Math.PI / 2, title: 'CYBER', sub: 'SECTOR 01', color: '#ec4899', hex: 0xec4899, vert: true },
      { pos: [5.8, 7.5, 22] as const, rotY: -Math.PI / 2, title: 'SYNTH', sub: 'MEMORIES', color: '#38bdf8', hex: 0x38bdf8, vert: true },
      { pos: [38, 12, -19.5] as const, rotY: 0, title: 'BIO-DOME 04', sub: 'BIOSPHERE 99.8%', color: '#34d399', hex: 0x34d399, vert: false },
      { pos: [-48, 13, -19.5] as const, rotY: 0, title: 'FOUNDRY 09', sub: 'REFINERY ACTIVE', color: '#f59e0b', hex: 0xf59e0b, vert: false },
      { pos: [0, 21.8, 34.4] as const, rotY: 0, title: 'NEXUS GATE', sub: 'YEAR 3026 · A-01', color: '#38bdf8', hex: 0x38bdf8, vert: false },
    ];
    billboards.forEach((b) => {
      const tex = createHoloBillboardTexture(b.title, b.sub, b.color, maxAniso, b.vert);
      const { group, screenMat } = buildMountedBillboard(
        b.vert ? 2.8 : 10.2,
        b.vert ? 6.0 : 5.0,
        tex,
        b.hex,
      );
      this.holoMaterials.push(screenMat);
      group.position.set(b.pos[0], b.pos[1], b.pos[2]);
      group.rotation.y = b.rotY;
      this.scene.add(group);
    });

    // Distant Megacity Skyline Ring with illuminated window facades
    const skyTowerCount = 72;
    const skyGeo = new THREE.BoxGeometry(1, 1, 1);
    scaleBoxUVs(skyGeo, 1, 3.5, 1, 1);
    const skyMat = facadeMats.get('cyber_tower')!;
    const skyline = new THREE.InstancedMesh(skyGeo, skyMat, skyTowerCount);
    const crownMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const crowns = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.03, 1), crownMat, skyTowerCount);
    for (let i = 0; i < skyTowerCount; i++) {
      const ang = (i / skyTowerCount) * Math.PI * 2;
      const dist = 104 + ((i * 19) % 48);
      const h = 46 + ((i * 29) % 88);
      const w = 10 + ((i * 7) % 14);
      _scale.set(w, h, w);
      _quat.identity();
      _v1.set(Math.cos(ang) * dist, h / 2 - 4, Math.sin(ang) * dist);
      _mat4.compose(_v1, _quat, _scale);
      skyline.setMatrixAt(i, _mat4);

      _scale.set(w * 1.02, 1.5, w * 1.02);
      _v1.set(Math.cos(ang) * dist, h - 5.5, Math.sin(ang) * dist);
      _mat4.compose(_v1, _quat, _scale);
      crowns.setMatrixAt(i, _mat4);
    }
    skyline.computeBoundingSphere();
    crowns.computeBoundingSphere();
    this.scene.add(skyline, crowns);

    // Apex Ascension Core Monument at Citadel Summit (0, 14, -79)
    const corePedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 3.0, 1.1, 12),
      new THREE.MeshStandardMaterial({ color: 0x1e223b, roughness: 0.35, metalness: 0.8 }),
    );
    corePedestal.position.set(0, 14.55, -79);
    this.scene.add(corePedestal);

    this.ascensionCoreMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.35, 0),
      new THREE.MeshStandardMaterial({
        color: 0xc084fc,
        emissive: 0xa855f7,
        emissiveIntensity: 2.3,
        roughness: 0.1,
      }),
    );
    this.ascensionCoreMesh.position.set(0, 17.2, -79);
    this.scene.add(this.ascensionCoreMesh);
  }

  private buildDynamicActors(initialCosmetic: CosmeticPalette): void {
    this.playerRig = buildPlayerRobot(initialCosmetic);
    this.playerRig.group.position.copy(this.playerPos);
    this.scene.add(this.playerRig.group);

    for (const npc of NPCS) {
      const mesh = buildNpcRobot(npc.accentHex, npc.id === 'npc_a00');
      mesh.position.set(...npc.position);
      this.scene.add(mesh);
      this.npcMeshes.set(npc.id, mesh);
    }

    for (const c of CHEST_SPAWNS) {
      const rig = buildLootChest(c.rarity);
      rig.group.position.set(...c.position);
      this.scene.add(rig.group);
      this.chestStates.set(c.id, {
        rig,
        opened: false,
        openAnim: 0,
        pos: new THREE.Vector3(...c.position),
        rarity: c.rarity,
        index: c.index,
        guaranteedItemId: c.guaranteedItemId,
      });
    }

    for (const t of TERMINAL_SPAWNS) {
      const mesh = buildTerminal(t.targetType === 'gate' ? 0x06b6d4 : 0xa855f7);
      mesh.position.set(...t.position);
      this.scene.add(mesh);
      this.terminalStates.set(t.id, {
        mesh,
        hacked: false,
        pos: new THREE.Vector3(...t.position),
        targetType: t.targetType,
      });
    }

    for (let i = 0; i < 6; i++) {
      const drone = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.8 }),
      );
      const eye = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.12, 0.24),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 2.0 }),
      );
      eye.position.z = 0.36;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.04, 6, 16),
        new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 1.2 }),
      );
      ring.rotation.x = Math.PI / 2;
      drone.add(body, eye, ring);
      this.scene.add(drone);
      this.ambientDrones.push({
        group: drone,
        center: new THREE.Vector3(i % 2 === 0 ? 0 : 48, 5.8 + (i % 3) * 1.4, i % 2 === 0 ? 12 : 0),
        radius: 9 + (i % 3) * 3,
        speed: 0.45 + i * 0.1,
        phase: i * 1.3,
      });
    }

    // Holographic waypoint beacons for active quest objectives
    const diamondGeo = new THREE.OctahedronGeometry(0.42, 0);
    const beamGeo = new THREE.CylinderGeometry(0.08, 0.22, 16, 8, 1, true);
    for (let i = 0; i < 6; i++) {
      const diamond = new THREE.Mesh(
        diamondGeo,
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.92 }),
      );
      const beam = new THREE.Mesh(
        beamGeo,
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.14,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      diamond.visible = false;
      beam.visible = false;
      this.scene.add(diamond, beam);
      this.waypointBeacons.push({ diamond, beam });
    }

    this.spawnEnemies();
  }

  private spawnEnemies(): void {
    for (const e of this.enemies) {
      this.scene.remove(e.rig.group);
    }
    this.enemies = [];

    const maxHpMap: Record<EnemyArchetype, number> = {
      stalker: 70,
      sentinel: 85,
      enforcer: 115,
      warden: 420,
    };

    for (const sp of ENEMY_SPAWNS) {
      const rig = buildEnemyMesh(sp.archetype);
      rig.group.position.set(...sp.position);
      if (rig.shieldMesh) {
        rig.shieldMesh.visible = true;
        const sm = rig.shieldMesh.material as THREE.MeshStandardMaterial;
        sm.opacity = 0.48;
        sm.emissiveIntensity = 1.1;
      }
      this.scene.add(rig.group);
      const maxShieldHp = sp.archetype === 'enforcer' ? 60 : 0;
      this.enemies.push({
        id: sp.id,
        archetype: sp.archetype,
        rig,
        pos: new THREE.Vector3(...sp.position),
        vel: new THREE.Vector3(),
        home: new THREE.Vector3(...sp.position),
        patrolRadius: sp.patrolRadius,
        hp: maxHpMap[sp.archetype],
        maxHp: maxHpMap[sp.archetype],
        shieldHp: maxShieldHp,
        maxShieldHp,
        yaw: 0,
        state: 'patrol',
        stateTimer: 0,
        hitFlashTimer: 0,
        stunTimer: 0,
        slowTimer: 0,
        lastDamagedAt: -99,
        koTimer: 0,
        strafeSign: Math.random() > 0.5 ? 1 : -1,
      });
    }
  }

  private initPools(): void {
    const projGeo = new THREE.SphereGeometry(0.16, 8, 8);
    for (let i = 0; i < 48; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const mesh = new THREE.Mesh(projGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.projectiles.push({
        active: false,
        fromPlayer: true,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        damage: 20,
        life: 0,
        mesh,
        colorHex: 0x38bdf8,
        shieldMult: 1,
        piercesShield: false,
        piercing: false,
        slowDuration: 0,
        stunDuration: 0,
        chainRadius: 0,
        splashRadius: 0,
        energyOnHit: 0,
        hitEnemyIds: new Set<string>(),
      });
    }

    const pGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, 220);
    this.particleMesh.frustumCulled = false;
    this.scene.add(this.particleMesh);

    for (let i = 0; i < 220; i++) {
      this.particles.push({
        active: false,
        pos: new THREE.Vector3(0, -100, 0),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        scale: 0,
        color: new THREE.Color(0x38bdf8),
      });
      _scale.set(0, 0, 0);
      _quat.identity();
      _mat4.compose(this.particles[i].pos, _quat, _scale);
      this.particleMesh.setMatrixAt(i, _mat4);
      this.particleMesh.setColorAt(i, this.particles[i].color);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;

    // Atmospheric rain streaks & floating bioluminescent spores (150 instances, zero-GC)
    const dropGeo = new THREE.BoxGeometry(0.04, 0.45, 0.04);
    const dropMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.42,
    });
    this.atmoMesh = new THREE.InstancedMesh(dropGeo, dropMat, 150);
    this.atmoMesh.frustumCulled = false;
    this.scene.add(this.atmoMesh);

    for (let i = 0; i < 150; i++) {
      const isSpore = i % 3 === 0;
      const drop: AtmoDrop = {
        x: (Math.random() - 0.5) * 140,
        y: Math.random() * 28,
        z: -75 + Math.random() * 140,
        speedY: isSpore ? -0.9 - Math.random() * 0.6 : -14 - Math.random() * 5,
        driftX: isSpore ? (Math.random() - 0.5) * 1.2 : -1.4,
        isSpore,
      };
      this.atmoDrops.push(drop);
      _scale.set(isSpore ? 1.8 : 0.9, isSpore ? 0.22 : 1.35, isSpore ? 1.8 : 0.9);
      _quat.identity();
      _v1.set(drop.x, drop.y, drop.z);
      _mat4.compose(_v1, _quat, _scale);
      this.atmoMesh.setMatrixAt(i, _mat4);
      this.atmoMesh.setColorAt(i, isSpore ? (i % 2 === 0 ? _sporeColor : _violetSpore) : _rainColor);
    }
    this.atmoMesh.instanceMatrix.needsUpdate = true;
    if (this.atmoMesh.instanceColor) this.atmoMesh.instanceColor.needsUpdate = true;
  }

  private spawnParticles(origin: THREE.Vector3, count: number, colorHex: number, speed = 6, life = 0.55): void {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % this.particles.length;
      p.active = true;
      p.pos.copy(origin);
      p.vel.set(
        (Math.random() - 0.5) * speed * 2,
        Math.random() * speed * 1.2 + 1.2,
        (Math.random() - 0.5) * speed * 2,
      );
      p.maxLife = life * (0.7 + Math.random() * 0.6);
      p.life = p.maxLife;
      p.scale = 0.7 + Math.random() * 0.9;
      p.color.setHex(colorHex);
    }
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    const onKeyDown = (e: KeyboardEvent) => {
      if (this.phase === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
        }
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.phase === 'playing' && !this.modalOpen) {
          this.callbacks.onTogglePause();
          return;
        }
      }

      if (this.phase !== 'playing' || this.modalOpen) return;

      if (e.code === 'KeyV') {
        this.cameraMode = this.cameraMode === 'third' ? 'first' : 'third';
        this.playerRig.group.visible = this.cameraMode === 'third';
        this.showToast(this.cameraMode === 'first' ? 'First-Person Visor View' : 'Third-Person Tether View');
        this.emitHudSnapshot();
        return;
      }

      if (!this.keys.has(e.code)) {
        if (e.code === 'Space') {
          this.jumpBufferTimer = 0.12;
        }
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
          this.tryDash();
        }
        if (e.code === 'KeyE') {
          this.tryInteract(false);
        }
        if (e.code === 'KeyF') {
          this.tryInteract(true);
        }
      }
      this.keys.add(e.code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && this.playerVel.y > 0) {
        this.playerVel.y *= 0.48;
      }
      this.keys.delete(e.code);
    };

    const onMouseDown = (e: MouseEvent) => {
      if (this.phase !== 'playing' || this.modalOpen) return;
      soundEngine.startAmbient();
      if (e.button === 0) {
        this.mouseDown = true;
        this.isDraggingLook = true;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
        if (document.pointerLockElement !== canvas && canvas.requestPointerLock) {
          try {
            const p = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
            p?.catch?.(() => {});
          } catch {
            // fallback drag look
          }
        }
      } else if (e.button === 2) {
        this.isDraggingLook = true;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
      }
    };

    const onMouseUp = () => {
      this.mouseDown = false;
      this.isDraggingLook = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (this.phase !== 'playing' || this.modalOpen) return;
      let dx = 0;
      let dy = 0;
      if (document.pointerLockElement === canvas) {
        dx = e.movementX;
        dy = e.movementY;
      } else if (this.isDraggingLook) {
        dx = e.clientX - this.lastPointerX;
        dy = e.clientY - this.lastPointerY;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
      }
      if (dx !== 0 || dy !== 0) {
        this.camYaw -= dx * 0.0032;
        this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.0026, -0.45, 1.05);
      }
    };

    const onResize = () => {
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = w / Math.max(1, h);
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      if (this.composer) {
        this.composer.setSize(w, h);
      }
      if (this.bloomPass) {
        this.bloomPass.resolution.set(w, h);
      }
    };

    const onBlur = () => this.clearInputs();
    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('resize', onResize);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('contextmenu', onContextMenu);

    this.cleanupListeners = () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('contextmenu', onContextMenu);
    };
  }

  private cleanupListeners: () => void = () => {};

  public clearInputs(): void {
    this.keys.clear();
    this.mouseDown = false;
    this.isDraggingLook = false;
  }

  public setPhase(nextPhase: GamePhase): void {
    this.phase = nextPhase;
    document.body.dataset.state = nextPhase;
    if (nextPhase !== 'playing') {
      this.clearInputs();
      if (document.pointerLockElement) {
        document.exitPointerLock?.();
      }
    } else {
      soundEngine.startAmbient();
      this.renderer.domElement.focus();
    }
    this.emitHudSnapshot();
  }

  public setModalOpen(open: boolean): void {
    this.modalOpen = open;
    if (open) {
      this.clearInputs();
      if (document.pointerLockElement) {
        document.exitPointerLock?.();
      }
    }
  }

  public startNewGame(): void {
    this.playerPos.set(...PLAYER_SPAWN);
    this.playerVel.set(0, 0, 0);
    this.playerYaw = 0;
    this.camYaw = 0;
    this.camPitch = 0.14;
    this.grounded = true;
    this.hp = this.stats.maxHp;
    this.energy = this.stats.maxEnergy;
    this.stamina = this.stats.maxStamina;
    this.staminaDelayTimer = 0;
    this.isSprinting = false;
    this.shards = 0;
    this.enemiesDefeated = 0;
    this.elapsedSeconds = 0;
    this.score = 0;
    this.relicsFound = 0;
    this.lastOutcome = 'none';
    this.lastEnding = null;
    this.guideTalked = false;
    this.archivistTalked = false;
    this.v12Talked = false;
    this.k4Talked = false;

    this.barriers = {
      gateOpened: false,
      biovaultUnlocked: false,
      citadelUnlocked: false,
    };
    this.gateOpenAnim = 0;
    this.gateLeftMesh.position.x = -3;
    this.gateRightMesh.position.x = 3;
    this.biovaultBarrierMesh.visible = true;
    this.citadelBarrierMesh.visible = true;

    for (const [, ch] of this.chestStates) {
      ch.opened = false;
      ch.openAnim = 0;
      ch.rig.lidGroup.rotation.x = 0;
    }
    for (const [, term] of this.terminalStates) {
      term.hacked = false;
    }
    for (const p of this.projectiles) {
      p.active = false;
      p.mesh.visible = false;
    }

    this.spawnEnemies();
    // Snap third-person camera immediately behind Unit A-01 so start / autostart frames never pass through walls
    this.camCurrentPos.set(this.playerPos.x + 0.68, this.playerPos.y + 2.6, this.playerPos.z + 5.0);
    this.camLookCurrent.set(this.playerPos.x + 0.68, this.playerPos.y + 1.8, this.playerPos.z - 10);
    this.camera.position.copy(this.camCurrentPos);
    this.camera.lookAt(this.camLookCurrent);
    this.setPhase('playing');
    this.showToast('Unit A-01 Awakened · Speak with Relay Guide S-01 ahead [E]');
  }

  public markNpcTalked(npcId: string): void {
    let changed = false;
    if (npcId === 'npc_s01' && !this.guideTalked) {
      this.guideTalked = true;
      changed = true;
      this.showToast('Waypoints Synced · Awaken the Southern Gate Console [E]');
    } else if (npcId === 'npc_m07' && !this.archivistTalked) {
      this.archivistTalked = true;
      changed = true;
      this.showToast('Sector Navigation Markers Uploaded to Visor');
    } else if (npcId === 'npc_v12' && !this.v12Talked) {
      this.v12Talked = true;
      changed = true;
    } else if (npcId === 'npc_k4' && !this.k4Talked) {
      this.k4Talked = true;
      changed = true;
    }
    if (changed) {
      this.emitHudSnapshot();
    }
  }

  public applyStats(stats: ComputedPlayerStats, cosmetic: CosmeticPalette, relicsCount: number): void {
    const prevMaxHp = this.stats.maxHp;
    this.stats = stats;
    this.relicsFound = relicsCount;
    if (stats.maxHp > prevMaxHp) {
      this.hp = Math.min(stats.maxHp, this.hp + (stats.maxHp - prevMaxHp));
    } else {
      this.hp = Math.min(stats.maxHp, this.hp);
    }
    this.stamina = Math.min(stats.maxStamina, this.stamina);

    this.playerRig.chassisMat.color.setHex(cosmetic.chassisHex);
    this.playerRig.accentMat.color.setHex(cosmetic.accentHex);
    this.playerRig.accentMat.emissive.setHex(cosmetic.accentHex);
    this.playerRig.visorMat.color.setHex(cosmetic.visorHex);
    this.playerRig.visorMat.emissive.setHex(cosmetic.visorHex);

    if (relicsCount >= 2 && !this.barriers.citadelUnlocked) {
      this.unlockBarrier('citadel_bridge');
    }
    this.emitHudSnapshot();
  }

  public unlockBarrier(targetType: string): void {
    if (targetType === 'gate' && !this.barriers.gateOpened) {
      this.barriers.gateOpened = true;
      soundEngine.playGateOpen();
      this.spawnParticles(new THREE.Vector3(0, 2, 37), 24, 0xa855f7, 8, 0.9);
      this.showToast('Entrance Gates Opening — Welcome to Nexus Prime');
      this.callbacks.onGateOpened();
    } else if (targetType === 'foundry_lift' && !this.barriers.biovaultUnlocked) {
      this.barriers.biovaultUnlocked = true;
      this.biovaultBarrierMesh.visible = false;
      soundEngine.playGateOpen();
      this.showToast('Sub-Level Bio-Vault Unsealed beneath North-West Alley');
    } else if (targetType === 'citadel_bridge' && !this.barriers.citadelUnlocked) {
      this.barriers.citadelUnlocked = true;
      this.citadelBarrierMesh.visible = false;
      soundEngine.playGateOpen();
      this.showToast('Aether Citadel Barrier Disengaged — Ascend to the Spire');
    }
    const term = [...this.terminalStates.values()].find((t) => t.targetType === targetType);
    if (term) term.hacked = true;
    this.score += 150;
    this.emitHudSnapshot();
  }

  public triggerEnding(ending: EndingType): void {
    this.lastOutcome = 'victory';
    this.lastEnding = ending;
    this.score += 1000 + Math.round(this.hp * 2);
    this.saveBestScore();
    this.setPhase('gameover');
    this.callbacks.onGameOver('victory', this.buildSnapshot());
  }

  public showToast(msg: string): void {
    this.toastMsg = msg;
    this.toastTimer = 3.8;
    this.emitHudSnapshot();
  }

  private saveBestScore(): void {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      try {
        localStorage.setItem('nexus_prime_best', String(this.bestScore));
      } catch {
        // ignore
      }
    }
  }

  private tryDash(): void {
    if (this.dashCooldownTimer > 0 || this.stamina < 24) return;
    this.stamina -= 24;
    this.staminaDelayTimer = 0.45;
    this.dashTimer = 0.2;
    this.dashCooldownTimer = this.stats.dashCooldown;
    this.invulnTimer = 0.25;

    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    const rightX = Math.cos(this.camYaw);
    const rightZ = -Math.sin(this.camYaw);
    let dx = 0;
    let dz = 0;
    if (this.keys.has('KeyW')) { dx += fwdX; dz += fwdZ; }
    if (this.keys.has('KeyS')) { dx -= fwdX; dz -= fwdZ; }
    if (this.keys.has('KeyD')) { dx += rightX; dz += rightZ; }
    if (this.keys.has('KeyA')) { dx -= rightX; dz -= rightZ; }
    if (dx === 0 && dz === 0) {
      dx = fwdX;
      dz = fwdZ;
    }
    const len = Math.hypot(dx, dz) || 1;
    this.dashDir.set(dx / len, 0, dz / len);
    soundEngine.playDash();
    this.spawnParticles(this.playerPos.clone().add(new THREE.Vector3(0, 1, 0)), 10, 0x38bdf8, 5, 0.35);
  }

  private tryInteract(preferHack: boolean): void {
    const nearest = this.currentPrompt ?? this.findNearestInteractable();
    if (!nearest) return;

    if (nearest.type === 'npc') {
      soundEngine.playDialogue();
      this.callbacks.onOpenNpc(nearest.id);
    } else if (nearest.type === 'chest') {
      const ch = this.chestStates.get(nearest.id);
      if (!ch || ch.opened) return;
      ch.opened = true;
      this.score += 100;
      soundEngine.playChest();
      this.spawnParticles(ch.pos.clone().add(new THREE.Vector3(0, 0.8, 0)), 18, 0xf59e0b, 7, 0.7);
      this.callbacks.onOpenChest(nearest.id, ch.index, ch.rarity, ch.guaranteedItemId);
    } else if (nearest.type === 'terminal') {
      const term = this.terminalStates.get(nearest.id);
      if (!term) return;
      if (term.targetType === 'gate' && !preferHack) {
        this.unlockBarrier('gate');
      } else {
        soundEngine.playHackClick();
        this.callbacks.onOpenTerminal(nearest.id);
      }
    } else if (nearest.type === 'ascension_core') {
      soundEngine.playDialogue();
      this.callbacks.onTriggerAscensionChoice();
    }
  }

  private findNearestInteractable(): InteractionPrompt | null {
    let bestDist = 4.2;
    let prompt: InteractionPrompt | null = null;

    for (const npc of NPCS) {
      _v1.set(...npc.position);
      const d = this.playerPos.distanceTo(_v1);
      if (d < bestDist) {
        bestDist = d;
        prompt = { id: npc.id, type: 'npc', label: `[E] Talk to ${npc.name}`, sublabel: npc.title };
      }
    }

    for (const [id, ch] of this.chestStates) {
      if (ch.opened) continue;
      const d = this.playerPos.distanceTo(ch.pos);
      if (d < bestDist) {
        bestDist = d;
        prompt = { id, type: 'chest', label: `[E] Open ${ch.rarity} Supply Cache`, sublabel: 'Procedural Gear & Upgrades' };
      }
    }

    for (const t of TERMINAL_SPAWNS) {
      const st = this.terminalStates.get(t.id);
      if (!st || st.hacked) continue;
      const d = this.playerPos.distanceTo(st.pos);
      if (d < bestDist) {
        bestDist = d;
        prompt = {
          id: t.id,
          type: 'terminal',
          label: t.targetType === 'gate' ? '[E] Awaken Gate / [F] Hack Circuit' : `[F] Hack ${t.title}`,
          sublabel: t.subtitle,
          canHack: true,
        };
      }
    }

    _v1.set(0, 14, -79);
    if (this.playerPos.distanceTo(_v1) < 5.0) {
      prompt = {
        id: 'ascension_core',
        type: 'ascension_core',
        label: '[E] Interface with Apex Ascension Core',
        sublabel: 'Determine the fate of Nexus Prime & Humanity',
      };
    }

    return prompt;
  }

  private firePlayerWeapon(): void {
    const cost = this.stats.energyCost || 4;
    if (this.fireCooldown > 0 || this.energy < cost) return;
    this.fireCooldown = 1 / this.stats.fireRate;
    this.energy = Math.max(0, this.energy - cost);
    soundEngine.playShoot();

    _camForward.set(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    const targetPoint = _v2.copy(this.camera.position).addScaledVector(_camForward, this.stats.range);
    const muzzle = _v1.copy(this.playerPos).add(new THREE.Vector3(0, 1.35, 0));
    const baseDir = targetPoint.sub(muzzle).normalize();

    const speed = this.stats.projectileSpeed || 46;
    const colorHex = this.stats.weaponColorHex || 0x38bdf8;
    const count = this.stats.projectileCount;

    for (let i = 0; i < count; i++) {
      const proj = this.projectiles.find((p) => !p.active);
      if (!proj) break;
      proj.active = true;
      proj.fromPlayer = true;
      proj.pos.copy(muzzle);
      const spreadOffset = count > 1 ? (i - (count - 1) / 2) * this.stats.spread : 0;
      _v3.copy(baseDir);
      _v3.x += (Math.random() - 0.5) * this.stats.spread * 0.45 + spreadOffset;
      _v3.y += (Math.random() - 0.5) * this.stats.spread * 0.35;
      _v3.normalize();
      proj.vel.copy(_v3).multiplyScalar(speed);
      proj.damage = this.stats.weaponDamage;
      proj.life = this.stats.range / speed;
      proj.colorHex = colorHex;
      proj.shieldMult = this.stats.shieldMult;
      proj.piercesShield = this.stats.piercesShield;
      proj.piercing = this.stats.piercing;
      proj.slowDuration = this.stats.slowDuration;
      proj.stunDuration = this.stats.stunDuration;
      proj.chainRadius = this.stats.chainRadius;
      proj.splashRadius = this.stats.splashRadius;
      proj.energyOnHit = this.stats.energyOnHit;
      proj.hitEnemyIds.clear();

      (proj.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
      if (proj.piercing) {
        proj.mesh.scale.set(0.75, 0.75, 3.8);
      } else if (proj.splashRadius > 0) {
        proj.mesh.scale.set(1.35, 1.35, 2.2);
      } else if (count >= 5) {
        proj.mesh.scale.set(1.15, 1.15, 1.15);
      } else {
        proj.mesh.scale.set(0.9, 0.9, 1.6);
      }
      proj.mesh.position.copy(proj.pos);
      proj.mesh.lookAt(proj.pos.x + _v3.x, proj.pos.y + _v3.y, proj.pos.z + _v3.z);
      proj.mesh.visible = true;
    }

    this.spawnParticles(muzzle, count >= 5 ? 8 : 4, colorHex, 5.5, 0.18);
    this.playerYaw = this.camYaw;
  }

  private tick = (): void => {
    if (this.disposed) return;

    const nowMs = performance.now();
    const rawDt = Math.max(0.001, (nowMs - this.lastTickMs) / 1000);
    this.lastTickMs = nowMs;

    let remaining = Math.min(rawDt, 0.25);
    while (remaining > 0.0001) {
      const dt = Math.min(remaining, 0.05);
      remaining -= dt;
      this.elapsedTime += dt;

      this.updateAmbientWorld(dt);

      if (this.phase === 'title') {
        this.updateTitleCamera(dt);
      } else if (this.phase === 'playing') {
        if (!this.modalOpen) {
          if (this.hitstopTimer > 0) {
            this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
          } else {
            this.elapsedSeconds += dt;
            this.updatePlayer(dt);
            this.updateEnemies(dt);
            this.updateProjectiles(dt);
          }
        }
        this.updateGameplayCamera(dt);
      }

      this.updateParticles(dt);

      if (this.toastTimer > 0) {
        this.toastTimer -= dt;
        if (this.toastTimer <= 0) this.toastMsg = null;
      }
    }

    this.hudEmitTimer += Math.min(rawDt, 0.25);
    if (this.hudEmitTimer >= 0.06) {
      this.hudEmitTimer = 0;
      this.emitHudSnapshot();
    }

    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 45);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updateTitleCamera(dt: number): void {
    // Cinematic flyover gazing down the unobstructed neon canyon & towering skyline
    const t = this.elapsedTime * 0.16;
    const targetPos = _v1.set(3.4 + Math.sin(t) * 1.8, 7.2 + Math.sin(t * 1.2) * 0.7, 17.8 + Math.cos(t) * 2.2);
    const lookTarget = _v2.set(-0.5, 9.0, -32);
    const k = 1 - Math.exp(-3 * dt);
    this.camCurrentPos.lerp(targetPos, k);
    this.camLookCurrent.lerp(lookTarget, k);
    this.camera.position.copy(this.camCurrentPos);
    this.camera.lookAt(this.camLookCurrent);
  }

  private updateAmbientWorld(dt: number): void {
    const elapsed = this.elapsedTime;

    this.skyTrainT = (this.skyTrainT + dt * 0.11) % 1;
    this.skyTrain.position.x = -95 + this.skyTrainT * 190;

    if (this.orbitalRing) {
      this.orbitalRing.rotation.z += dt * 0.025;
    }

    if (this.barriers.gateOpened && this.gateOpenAnim < 1) {
      this.gateOpenAnim = Math.min(1, this.gateOpenAnim + dt * 0.65);
      const ease = 1 - Math.pow(1 - this.gateOpenAnim, 3);
      this.gateLeftMesh.position.x = -3 - ease * 7.5;
      this.gateRightMesh.position.x = 3 + ease * 7.5;
    }

    for (const [, ch] of this.chestStates) {
      if (ch.opened && ch.openAnim < 1) {
        ch.openAnim = Math.min(1, ch.openAnim + dt * 3.5);
        ch.rig.lidGroup.rotation.x = -ch.openAnim * 1.25;
      }
    }

    for (const d of this.ambientDrones) {
      const a = elapsed * d.speed + d.phase;
      d.group.position.set(
        d.center.x + Math.cos(a) * d.radius,
        d.center.y + Math.sin(a * 2.2) * 0.55,
        d.center.z + Math.sin(a) * d.radius,
      );
      d.group.rotation.y = -a;
    }

    for (const [, mesh] of this.npcMeshes) {
      const halo = mesh.getObjectByName('npcHalo');
      if (halo) {
        halo.position.y = 2.22 + Math.sin(elapsed * 2.4) * 0.08;
        halo.rotation.z = elapsed * 0.9;
      }
    }

    this.holoMaterials.forEach((mat, i) => {
      mat.opacity = 0.84 + Math.sin(elapsed * (3.5 + i) + i * 2.1) * 0.1;
    });

    const activeDefs = this.getActiveWaypointDefs();
    this.waypointBeacons.forEach((b, idx) => {
      const def = activeDefs[idx];
      if (!def || this.phase !== 'playing') {
        b.diamond.visible = false;
        b.beam.visible = false;
        return;
      }
      b.diamond.visible = true;
      b.beam.visible = true;
      const hoverY = def.pos[1] + 1.5 + Math.sin(elapsed * 2.6 + idx) * 0.25;
      b.diamond.position.set(def.pos[0], hoverY, def.pos[2]);
      b.diamond.rotation.y = elapsed * 1.8 + idx;
      b.beam.position.set(def.pos[0], def.pos[1] + 8, def.pos[2]);
      const hex = parseInt(def.color.replace('#', ''), 16);
      (b.diamond.material as THREE.MeshBasicMaterial).color.setHex(hex);
      (b.beam.material as THREE.MeshBasicMaterial).color.setHex(hex);
    });

    for (const sp of this.steamPuffs) {
      const cycle = (elapsed * 0.42 + sp.basePhase) % 1;
      sp.mesh.position.y = 0.25 + cycle * 2.8;
      sp.mesh.position.x = Math.sin(elapsed * 1.4 + sp.basePhase * 6) * 0.22;
      const sc = 0.7 + cycle * 1.5;
      sp.mesh.scale.setScalar(sc);
      (sp.mesh.material as THREE.MeshBasicMaterial).opacity = Math.sin(cycle * Math.PI) * 0.16;
    }

    if (this.ascensionCoreMesh) {
      this.ascensionCoreMesh.rotation.y += dt * 0.85;
      this.ascensionCoreMesh.position.y = 17.2 + Math.sin(elapsed * 2.0) * 0.35;
    }

    // Update rain & glowing spore drift
    for (let i = 0; i < this.atmoDrops.length; i++) {
      const d = this.atmoDrops[i];
      d.y += d.speedY * dt;
      d.x += d.driftX * dt;
      if (d.isSpore) {
        d.x += Math.sin(elapsed * 1.5 + i) * 0.4 * dt;
      }
      if (d.y < 0) {
        d.y = 26 + (i % 5);
        d.x = ((d.x + 70) % 140) - 70;
      }
      _scale.set(d.isSpore ? 1.8 : 0.9, d.isSpore ? 0.22 : 1.35, d.isSpore ? 1.8 : 0.9);
      _quat.identity();
      _v1.set(d.x, d.y, d.z);
      _mat4.compose(_v1, _quat, _scale);
      this.atmoMesh.setMatrixAt(i, _mat4);
    }
    this.atmoMesh.instanceMatrix.needsUpdate = true;
  }

  private updatePlayer(dt: number): void {
    if (this.keys.has('ArrowLeft')) this.camYaw += 2.1 * dt;
    if (this.keys.has('ArrowRight')) this.camYaw -= 2.1 * dt;
    if (this.keys.has('ArrowUp')) this.camPitch = Math.max(-0.4, this.camPitch - 1.4 * dt);
    if (this.keys.has('ArrowDown')) this.camPitch = Math.min(1.0, this.camPitch + 1.4 * dt);

    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.dashCooldownTimer = Math.max(0, this.dashCooldownTimer - dt);
    this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    this.energy = Math.min(this.stats.maxEnergy, this.energy + this.stats.energyRegen * dt);

    if (this.mouseDown || this.keys.has('KeyJ')) {
      this.firePlayerWeapon();
    }

    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    const rightX = Math.cos(this.camYaw);
    const rightZ = -Math.sin(this.camYaw);

    let moveX = 0;
    let moveZ = 0;
    if (this.keys.has('KeyW')) { moveX += fwdX; moveZ += fwdZ; }
    if (this.keys.has('KeyS')) { moveX -= fwdX; moveZ -= fwdZ; }
    if (this.keys.has('KeyD')) { moveX += rightX; moveZ += rightZ; }
    if (this.keys.has('KeyA')) { moveX -= rightX; moveZ -= rightZ; }

    const moveLen = Math.hypot(moveX, moveZ);
    if (moveLen > 0.001) {
      moveX /= moveLen;
      moveZ /= moveLen;
      const targetYaw = Math.atan2(-moveX, -moveZ);
      let diff = targetYaw - this.playerYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.playerYaw += diff * (1 - Math.exp(-14 * dt));
    }

    // Tactical Sprint (holding Shift while moving) & Stamina recovery
    const wantsSprint = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) && moveLen > 0.001 && this.dashTimer <= 0;
    if (wantsSprint && this.stamina > 2) {
      this.isSprinting = true;
      this.stamina = Math.max(0, this.stamina - 22 * dt);
      this.staminaDelayTimer = 0.4;
    } else {
      this.isSprinting = false;
      if (this.staminaDelayTimer > 0) {
        this.staminaDelayTimer = Math.max(0, this.staminaDelayTimer - dt);
      } else {
        this.stamina = Math.min(this.stats.maxStamina, this.stamina + this.stats.staminaRegen * dt);
      }
    }

    // Thruster exhaust flame visual on sprint/dash
    const flameMat = this.playerRig.thrusterFlame.material as THREE.MeshBasicMaterial;
    flameMat.opacity = this.dashTimer > 0 ? 0.92 : this.isSprinting ? 0.55 : 0;

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.playerVel.x = this.dashDir.x * 26;
      this.playerVel.z = this.dashDir.z * 26;
    } else {
      const speedMul = this.isSprinting ? 1.42 : 1.0;
      const targetVx = moveX * this.stats.moveSpeed * speedMul;
      const targetVz = moveZ * this.stats.moveSpeed * speedMul;
      const accel = this.grounded ? 16 : 8;
      const k = 1 - Math.exp(-accel * dt);
      this.playerVel.x += (targetVx - this.playerVel.x) * k;
      this.playerVel.z += (targetVz - this.playerVel.z) * k;
    }

    if (this.grounded) {
      this.coyoteTimer = 0.11;
      this.jumpsUsed = 0;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
      const maxJumps = this.stats.hasDoubleJump ? 2 : 1;
      const isDouble = this.jumpsUsed > 0 && this.jumpsUsed < maxJumps;
      if (this.coyoteTimer > 0 || (isDouble && this.stamina >= 15)) {
        if (isDouble) {
          this.stamina = Math.max(0, this.stamina - 15);
          this.staminaDelayTimer = 0.35;
        }
        this.playerVel.y = 11.4;
        this.grounded = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.jumpsUsed++;
        this.squashScale.set(0.84, 1.2, 0.84);
        soundEngine.playJump();
        this.spawnParticles(this.playerPos, 5, 0x94a3b8, 3.2, 0.35);
      }
    }

    this.playerVel.y -= 24 * dt;

    const nextX = this.playerPos.x + this.playerVel.x * dt;
    const nextZ = this.playerPos.z + this.playerVel.z * dt;
    const resolved = resolveHorizontalCollision(nextX, this.playerPos.y, nextZ, 0.52, this.barriers);
    this.playerPos.x = resolved.x;
    this.playerPos.z = resolved.z;

    const prevGrounded = this.grounded;
    this.playerPos.y += this.playerVel.y * dt;
    const floorY = groundHeightAt(this.playerPos.x, this.playerPos.z, this.playerPos.y, this.barriers);
    if (this.playerPos.y <= floorY) {
      if (!prevGrounded && this.playerVel.y < -5) {
        this.squashScale.set(1.22, 0.78, 1.22);
      }
      this.playerPos.y = floorY;
      this.playerVel.y = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }

    if (!this.barriers.gateOpened && this.playerPos.z < 46 && this.playerPos.z > 37 && Math.abs(this.playerPos.x) < 10) {
      this.currentPrompt = {
        id: 'term_gate',
        type: 'terminal',
        label: '[E] Awaken Gate / [F] Hack Circuit',
        sublabel: 'Open the Colossal Gates of Nexus Prime',
        canHack: true,
      };
    } else {
      this.currentPrompt = this.findNearestInteractable();
    }

    const horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
    if (this.grounded && horizSpeed > 0.4) {
      this.walkPhase += horizSpeed * dt * 1.65;
    }
    const swing = this.grounded ? Math.sin(this.walkPhase) * Math.min(0.65, horizSpeed * 0.06) : 0.25;
    this.playerRig.leftLeg.rotation.x = swing;
    this.playerRig.rightLeg.rotation.x = -swing;
    this.playerRig.leftArm.rotation.x = -swing * 0.8;
    this.playerRig.rightArm.rotation.x = this.mouseDown ? -1.35 : swing * 0.7;

    this.squashScale.lerp(_v1.set(1, 1, 1), 1 - Math.exp(-12 * dt));
    this.playerRig.group.position.copy(this.playerPos);
    this.playerRig.group.rotation.y = this.playerYaw;
    this.playerRig.group.scale.copy(this.squashScale);
  }

  private updateGameplayCamera(dt: number): void {
    const anchor = _v1.set(this.playerPos.x, this.playerPos.y + 1.55, this.playerPos.z);

    if (this.cameraMode === 'first') {
      const lookDir = _v2.set(
        -Math.sin(this.camYaw) * Math.cos(this.camPitch),
        -Math.sin(this.camPitch),
        -Math.cos(this.camYaw) * Math.cos(this.camPitch),
      );
      this.camera.position.copy(anchor);
      this.camera.lookAt(anchor.clone().add(lookDir));
    } else {
      const dist = 5.0;
      const shoulderOffset = _camRight.set(Math.cos(this.camYaw) * 0.68, 0.34, -Math.sin(this.camYaw) * 0.68);
      const backDir = _v2.set(
        Math.sin(this.camYaw) * Math.cos(this.camPitch),
        Math.sin(this.camPitch),
        Math.cos(this.camYaw) * Math.cos(this.camPitch),
      ).normalize();

      const fullTarget = _v3.copy(anchor).add(shoulderOffset).addScaledVector(backDir, dist);
      const rayVec = fullTarget.clone().sub(anchor);
      const fullLen = Math.max(0.1, rayVec.length());
      const rayDir = rayVec.divideScalar(fullLen);

      this.raycaster.set(anchor, rayDir);
      this.raycaster.far = fullLen;
      const hits = this.raycaster.intersectObjects(this.occluders, false);
      const clampedLen = hits.length > 0 && hits[0].distance < fullLen ? Math.max(0.85, hits[0].distance - 0.42) : fullLen;
      const desiredPos = _v3.copy(anchor).addScaledVector(rayDir, clampedLen);

      // Guard against side-wall shoulder clipping using active AABB colliders
      const safeCam = resolveHorizontalCollision(desiredPos.x, Math.max(0, desiredPos.y - 0.4), desiredPos.z, 0.42, this.barriers);
      desiredPos.x = safeCam.x;
      desiredPos.z = safeCam.z;

      const k = 1 - Math.exp(-16 * dt);
      this.camCurrentPos.lerp(desiredPos, k);

      const lookTarget = anchor.clone().add(shoulderOffset).addScaledVector(backDir, -10);
      this.camLookCurrent.lerp(lookTarget, k);

      this.camera.position.copy(this.camCurrentPos);
      this.camera.lookAt(this.camLookCurrent);
    }

    if (this.trauma > 0) {
      const shake = this.trauma * this.trauma * 0.25;
      this.camera.rotation.z += (Math.random() - 0.5) * shake;
      this.camera.rotation.x += (Math.random() - 0.5) * shake * 0.7;
      this.trauma = Math.max(0, this.trauma - dt * 2.2);
    }
  }

  private updateEnemies(dt: number): void {
    let activeAttackers = 0;
    for (const e of this.enemies) {
      if (e.state === 'windup') activeAttackers++;
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      if (e.hitFlashTimer > 0) {
        e.hitFlashTimer -= dt;
        if (e.hitFlashTimer <= 0) {
          e.rig.hitMaterials.forEach((m) => m.emissive.setHex(e.archetype === 'warden' ? 0xa855f7 : 0x000000));
        }
      }

      if (e.state === 'ko') {
        e.koTimer += dt;
        e.rig.bodyGroup.rotation.x = Math.min(Math.PI / 2, e.koTimer * 4.5);
        e.rig.group.scale.setScalar(Math.max(0.01, 1 - e.koTimer * 2.2));
        if (e.koTimer >= 0.42) {
          this.scene.remove(e.rig.group);
          this.enemies.splice(i, 1);
        }
        continue;
      }

      if (e.slowTimer > 0) e.slowTimer = Math.max(0, e.slowTimer - dt);
      if (e.stunTimer > 0) {
        e.stunTimer = Math.max(0, e.stunTimer - dt);
        const ringMat = e.rig.telegraphRing.material as THREE.MeshBasicMaterial;
        ringMat.color.setHex(0x22d3ee);
        ringMat.opacity = 0.55;
        e.rig.telegraphRing.scale.setScalar(1.0 + Math.sin(this.elapsedTime * 22) * 0.08);
        e.rig.group.position.copy(e.pos);
        e.rig.group.rotation.y = e.yaw;
        continue;
      }

      const moveMult = e.slowTimer > 0 ? 0.45 : 1.0;

      const toPlayer = _v1.subVectors(this.playerPos, e.pos);
      const flatDist = Math.hypot(toPlayer.x, toPlayer.z);
      const yDiff = Math.abs(toPlayer.y);
      const aggroRange = e.archetype === 'warden' ? 22 : 13.5;
      const inSafeArrivalZone = this.playerPos.z > 18 && Math.abs(this.playerPos.x) < 11.5;
      const canSeePlayer =
        flatDist < aggroRange + 6 &&
        yDiff < 8 &&
        hasLineOfSight(
          e.pos.x,
          e.pos.y + 1.35,
          e.pos.z,
          this.playerPos.x,
          this.playerPos.y + 1.35,
          this.playerPos.z,
          this.barriers,
        );

      if (e.archetype === 'warden' && e.rig.haloGroup) {
        e.rig.haloGroup.rotation.y += dt * 1.4;
        e.rig.haloGroup.rotation.z += dt * 0.7;
      }

      const ringMat = e.rig.telegraphRing.material as THREE.MeshBasicMaterial;
      ringMat.color.setHex(0xf43f5e);

      const turnToward = (targetYaw: number, maxRate: number) => {
        const diff = Math.atan2(Math.sin(targetYaw - e.yaw), Math.cos(targetYaw - e.yaw));
        const step = Math.sign(diff) * Math.min(Math.abs(diff), maxRate * dt);
        e.yaw += step;
      };

      if (e.state === 'patrol') {
        ringMat.opacity = 0;
        const patAngle = this.elapsedTime * 0.7 + i;
        const tx = e.home.x + Math.cos(patAngle) * e.patrolRadius * 0.5;
        const tz = e.home.z + Math.sin(patAngle) * e.patrolRadius * 0.5;
        const dx = tx - e.pos.x;
        const dz = tz - e.pos.z;
        const dl = Math.hypot(dx, dz) || 1;
        e.pos.x += (dx / dl) * 2.2 * moveMult * dt;
        e.pos.z += (dz / dl) * 2.2 * moveMult * dt;
        turnToward(Math.atan2(dx, dz), 4.5);

        if (!inSafeArrivalZone && flatDist < aggroRange && yDiff < 5.5 && canSeePlayer) {
          e.state = 'chase';
        }
      } else if (e.state === 'chase') {
        ringMat.opacity = 0;
        if (inSafeArrivalZone || flatDist > aggroRange + 6 || yDiff > 8 || !canSeePlayer) {
          e.state = 'patrol';
          continue;
        }
        const desiredYaw = Math.atan2(toPlayer.x, toPlayer.z);
        // Heavy shielded Enforcers turn deliberately so players can dash behind & flank!
        turnToward(desiredYaw, e.archetype === 'enforcer' ? 2.1 : 7.0);
        const nx = toPlayer.x / Math.max(0.01, flatDist);
        const nz = toPlayer.z / Math.max(0.01, flatDist);

        if (e.archetype === 'stalker') {
          e.pos.x += nx * 6.2 * moveMult * dt;
          e.pos.z += nz * 6.2 * moveMult * dt;
          if (flatDist < 4.2 && activeAttackers < 3) {
            e.state = 'windup';
            e.stateTimer = 0.42;
            activeAttackers++;
          }
        } else if (e.archetype === 'sentinel') {
          const moveRadial = flatDist < 7 ? -3.5 : flatDist > 13 ? 4.0 : 0;
          const sx = -nz * e.strafeSign * 3.8;
          const sz = nx * e.strafeSign * 3.8;
          e.pos.x += (nx * moveRadial + sx) * moveMult * dt;
          e.pos.z += (nz * moveRadial + sz) * moveMult * dt;
          if (flatDist < 13.5 && activeAttackers < 3 && canSeePlayer) {
            e.state = 'windup';
            e.stateTimer = 0.55;
            activeAttackers++;
          }
        } else if (e.archetype === 'enforcer') {
          e.pos.x += nx * 3.0 * moveMult * dt;
          e.pos.z += nz * 3.0 * moveMult * dt;
          if (flatDist < 3.6 && activeAttackers < 3) {
            e.state = 'windup';
            e.stateTimer = 0.62;
            activeAttackers++;
          }
        } else {
          e.pos.x += (-nz * 3.4 + nx * (flatDist > 10 ? 2.8 : 0)) * moveMult * dt;
          e.pos.z += (nx * 3.4 + nz * (flatDist > 10 ? 2.8 : 0)) * moveMult * dt;
          if (activeAttackers < 3 && canSeePlayer) {
            e.state = 'windup';
            e.stateTimer = 0.62;
            activeAttackers++;
          }
        }
      } else if (e.state === 'windup') {
        e.stateTimer -= dt;
        ringMat.opacity = 0.78;
        e.rig.telegraphRing.scale.setScalar(1 + Math.sin(this.elapsedTime * 18) * 0.12);
        turnToward(Math.atan2(toPlayer.x, toPlayer.z), e.archetype === 'enforcer' ? 1.5 : 6.0);

        if (e.stateTimer <= 0) {
          ringMat.opacity = 0;
          if (e.archetype === 'stalker') {
            if (flatDist < 4.5 && yDiff < 2.5 && canSeePlayer) this.damagePlayer(14);
          } else if (e.archetype === 'enforcer') {
            this.spawnParticles(e.pos, 14, 0xa855f7, 6, 0.45);
            if (flatDist < 4.4 && yDiff < 2.5 && canSeePlayer) this.damagePlayer(22);
          } else if (e.archetype === 'sentinel') {
            if (canSeePlayer) this.fireEnemyBolt(e.pos, toPlayer.clone().normalize(), 12);
          } else if (canSeePlayer) {
            const base = toPlayer.clone().normalize();
            [-0.22, 0, 0.22].forEach((ang) => {
              const dir = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
              this.fireEnemyBolt(e.pos, dir, 16);
            });
          }
          e.state = 'recover';
          e.stateTimer = e.archetype === 'warden' ? 1.1 : 0.9;
        }
      } else if (e.state === 'recover') {
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) e.state = 'chase';
      }

      const resolved = resolveHorizontalCollision(e.pos.x, e.pos.y, e.pos.z, 0.65, this.barriers);
      e.pos.x = resolved.x;
      e.pos.z = resolved.z;
      e.pos.y = groundHeightAt(e.pos.x, e.pos.z, e.pos.y + 0.5, this.barriers);
      e.rig.group.position.copy(e.pos);
      e.rig.group.rotation.y = e.yaw;
    }
  }

  private fireEnemyBolt(origin: THREE.Vector3, dir: THREE.Vector3, damage: number): void {
    const proj = this.projectiles.find((p) => !p.active);
    if (!proj) return;
    proj.active = true;
    proj.fromPlayer = false;
    proj.pos.copy(origin).add(new THREE.Vector3(0, 1.4, 0));
    proj.vel.copy(dir).multiplyScalar(21);
    proj.damage = damage;
    proj.life = 2.4;
    proj.colorHex = 0xf43f5e;
    proj.shieldMult = 1;
    proj.piercesShield = false;
    proj.piercing = false;
    proj.slowDuration = 0;
    proj.stunDuration = 0;
    proj.chainRadius = 0;
    proj.splashRadius = 0;
    proj.energyOnHit = 0;
    proj.hitEnemyIds.clear();
    (proj.mesh.material as THREE.MeshBasicMaterial).color.setHex(0xf43f5e);
    proj.mesh.scale.setScalar(1.0);
    proj.mesh.position.copy(proj.pos);
    proj.mesh.visible = true;
  }

  private damagePlayer(rawAmount: number): void {
    if (this.invulnTimer > 0 || this.phase !== 'playing') return;
    const mitigated = Math.max(4, Math.round(rawAmount * (100 / (100 + this.stats.armor * 2))));
    this.hp = Math.max(0, this.hp - mitigated);
    this.invulnTimer = 0.5;
    this.trauma = Math.min(1, this.trauma + 0.55);
    soundEngine.playPlayerHurt();
    this.spawnParticles(this.playerPos.clone().add(new THREE.Vector3(0, 1, 0)), 10, 0xf43f5e, 5, 0.4);
    this.emitHudSnapshot();

    if (this.hp <= 0) {
      this.lastOutcome = 'defeat';
      this.saveBestScore();
      this.setPhase('gameover');
      this.callbacks.onGameOver('defeat', this.buildSnapshot());
    }
  }

  private applyEnemyDefeat(e: EnemyRuntime): void {
    if (e.state === 'ko') return;
    e.state = 'ko';
    e.koTimer = 0;
    this.enemiesDefeated++;
    this.shards += e.archetype === 'warden' ? 120 : 25;
    this.score += e.archetype === 'warden' ? 500 : 120;
    this.hitstopTimer = 0.05;
    this.trauma = Math.min(1, this.trauma + 0.45);
    soundEngine.playKill();
    this.spawnParticles(e.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), 20, 0xa855f7, 8, 0.65);
    if (e.archetype === 'warden') {
      this.showToast('Citadel Warden Defeated! Speak with Architect Echo A-00.');
    }
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.life -= dt;
      p.pos.addScaledVector(p.vel, dt);
      p.mesh.position.copy(p.pos);

      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }

      // Stop projectiles against solid building walls
      let hitWall = false;
      for (const box of WORLD_BOXES) {
        if (box.kind === 'gate' && this.barriers.gateOpened) continue;
        if (box.kind === 'biovault_barrier' && this.barriers.biovaultUnlocked) continue;
        if (box.kind === 'citadel_barrier' && this.barriers.citadelUnlocked) continue;
        if (
          p.pos.x >= box.minX &&
          p.pos.x <= box.maxX &&
          p.pos.y >= box.minY &&
          p.pos.y <= box.maxY &&
          p.pos.z >= box.minZ &&
          p.pos.z <= box.maxZ
        ) {
          hitWall = true;
          break;
        }
      }
      if (hitWall) {
        this.spawnParticles(p.pos, 4, p.colorHex, 3, 0.2);
        p.active = false;
        p.mesh.visible = false;
        continue;
      }

      if (p.fromPlayer) {
        for (const e of this.enemies) {
          if (e.state === 'ko' || p.hitEnemyIds.has(e.id)) continue;
          const hitDist = e.archetype === 'warden' ? 1.65 : e.archetype === 'enforcer' ? 1.35 : 1.1;
          const dx = p.pos.x - e.pos.x;
          const dz = p.pos.z - e.pos.z;
          const dy = p.pos.y - (e.pos.y + 1.15);
          if (dx * dx + dz * dz < hitDist * hitDist && Math.abs(dy) < 1.38) {
            p.hitEnemyIds.add(e.id);
            if (!p.piercing) {
              p.active = false;
              p.mesh.visible = false;
            }

            const fwdX = Math.sin(e.yaw);
            const fwdZ = Math.cos(e.yaw);
            const incomingDot = (p.vel.x * fwdX + p.vel.z * fwdZ) / (p.vel.length() || 1);
            const hitFront = incomingDot < -0.2;

            const outcome = resolveEnemyHitDamage({
              baseDamage: p.damage,
              shieldHp: e.shieldHp,
              hitFront,
              shieldMult: p.shieldMult,
              piercesShield: p.piercesShield,
            });

            e.shieldHp = outcome.newShieldHp;
            e.hp -= outcome.hullDamage;
            e.hitFlashTimer = 0.08;
            e.lastDamagedAt = this.elapsedTime;
            e.rig.hitMaterials.forEach((m) => m.emissive.setHex(0xffffff));

            if (e.rig.shieldMesh) {
              if (e.shieldHp <= 0) {
                e.rig.shieldMesh.visible = false;
              } else {
                const sm = e.rig.shieldMesh.material as THREE.MeshStandardMaterial;
                sm.opacity = 0.16 + 0.36 * (e.shieldHp / Math.max(1, e.maxShieldHp));
              }
            }

            if (outcome.shieldShattered) {
              e.stunTimer = Math.max(e.stunTimer, 1.45);
              this.trauma = Math.min(1, this.trauma + 0.32);
              soundEngine.playGateOpen();
              this.spawnParticles(e.pos.clone().add(new THREE.Vector3(0, 1.25, 0)), 22, 0xc084fc, 8, 0.55);
              this.showToast('Enforcer Shield Shattered — Hull Exposed!');
            } else if (outcome.hitShield) {
              this.spawnParticles(p.pos, 8, 0xa855f7, 4.5, 0.28);
            } else if (outcome.flankCrit) {
              this.spawnParticles(p.pos, 9, 0xfbbf24, 5.5, 0.32);
            }

            // Weapon ability triggers
            if (p.energyOnHit > 0) {
              this.energy = Math.min(this.stats.maxEnergy, this.energy + p.energyOnHit);
            }
            if (p.slowDuration > 0) {
              e.slowTimer = Math.max(e.slowTimer, p.slowDuration);
            }
            if (p.stunDuration > 0) {
              e.stunTimer = Math.max(e.stunTimer, p.stunDuration);
            }
            if (p.shieldMult >= 2.0) {
              const pLen = Math.hypot(p.vel.x, p.vel.z) || 1;
              e.pos.x += (p.vel.x / pLen) * 0.75;
              e.pos.z += (p.vel.z / pLen) * 0.75;
            }
            if (p.chainRadius > 0) {
              let nearestChain: EnemyRuntime | null = null;
              let bestChainDist = p.chainRadius;
              for (const other of this.enemies) {
                if (other.id === e.id || other.state === 'ko') continue;
                const d = other.pos.distanceTo(e.pos);
                if (d < bestChainDist) {
                  bestChainDist = d;
                  nearestChain = other;
                }
              }
              if (nearestChain) {
                const chainDmg = Math.round(p.damage * 0.55);
                nearestChain.hp -= chainDmg;
                nearestChain.stunTimer = Math.max(nearestChain.stunTimer, 0.6);
                nearestChain.lastDamagedAt = this.elapsedTime;
                nearestChain.hitFlashTimer = 0.08;
                nearestChain.rig.hitMaterials.forEach((m) => m.emissive.setHex(0xe879f9));
                const mid = e.pos.clone().lerp(nearestChain.pos, 0.5).add(new THREE.Vector3(0, 1.2, 0));
                this.spawnParticles(mid, 10, 0xe879f9, 6, 0.35);
                if (nearestChain.hp <= 0) this.applyEnemyDefeat(nearestChain);
              }
            }
            if (p.splashRadius > 0) {
              this.spawnParticles(p.pos, 14, 0xfbbf24, 7, 0.4);
              for (const other of this.enemies) {
                if (other.id === e.id || other.state === 'ko') continue;
                if (other.pos.distanceTo(p.pos) <= p.splashRadius) {
                  other.hp -= Math.round(p.damage * 0.65);
                  other.lastDamagedAt = this.elapsedTime;
                  other.hitFlashTimer = 0.06;
                  if (other.hp <= 0) this.applyEnemyDefeat(other);
                }
              }
            }

            if (e.hp <= 0) {
              this.applyEnemyDefeat(e);
            } else {
              soundEngine.playHit();
              this.spawnParticles(p.pos, 6, p.colorHex, 5, 0.3);
            }
            if (!p.piercing) break;
          }
        }
      } else {
        const dx = p.pos.x - this.playerPos.x;
        const dz = p.pos.z - this.playerPos.z;
        const dy = p.pos.y - (this.playerPos.y + 1.0);
        if (dx * dx + dz * dz < 0.55 && Math.abs(dy) < 1.1) {
          p.active = false;
          p.mesh.visible = false;
          this.damagePlayer(p.damage);
        }
      }
    }
  }

  private updateParticles(dt: number): void {
    let dirty = false;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      dirty = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _scale.set(0, 0, 0);
        _v1.set(0, -100, 0);
      } else {
        p.vel.y -= 12 * dt;
        p.pos.addScaledVector(p.vel, dt);
        const s = (p.life / p.maxLife) * p.scale;
        _scale.set(s, s, s);
        _v1.copy(p.pos);
      }
      _quat.identity();
      _mat4.compose(_v1, _quat, _scale);
      this.particleMesh.setMatrixAt(i, _mat4);
      this.particleMesh.setColorAt(i, p.color);
    }
    if (dirty) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  private getActiveWaypointDefs(): Array<{ id: string; label: string; sublabel: string; color: string; pos: [number, number, number] }> {
    const defs: Array<{ id: string; label: string; sublabel: string; color: string; pos: [number, number, number] }> = [];

    if (!this.barriers.gateOpened) {
      if (!this.guideTalked) {
        defs.push({
          id: 'wp_guide',
          label: 'Guide S-01',
          sublabel: 'Talk [E]',
          color: '#22d3ee',
          pos: [3.5, 1.4, 47],
        });
      } else {
        defs.push({
          id: 'wp_gate',
          label: 'Southern Gate',
          sublabel: 'Awaken [E]',
          color: '#38bdf8',
          pos: [-3.5, 1.5, 41],
        });
      }
      return defs;
    }

    if (!this.archivistTalked) {
      defs.push({
        id: 'wp_m07',
        label: 'Archivist M-07',
        sublabel: 'Get Coordinates [E]',
        color: '#22d3ee',
        pos: [3.2, 1.5, 17.5],
      });
      return defs;
    }

    // After Archivist M-07 briefs the player, project full sector guidance markers
    const atriumRelic = this.chestStates.get('chest_atrium_relic');
    if (!atriumRelic?.opened) {
      if (!this.v12Talked) {
        defs.push({
          id: 'wp_atrium',
          label: 'Emerald Atrium',
          sublabel: 'Botanist V-12',
          color: '#34d399',
          pos: [44, 1.5, 6],
        });
      } else {
        defs.push({
          id: 'wp_atrium_relic',
          label: 'Bio-Seed Relic',
          sublabel: 'Canopy Deck',
          color: '#34d399',
          pos: [64, 10.2, 14.5],
        });
      }
    }

    const foundryRelic = this.chestStates.get('chest_foundry_relic');
    if (!foundryRelic?.opened) {
      if (!this.k4Talked) {
        defs.push({
          id: 'wp_foundry',
          label: 'Foundry Sector 9',
          sublabel: 'Forge-Mind K-4',
          color: '#f59e0b',
          pos: [-38, 1.5, 12],
        });
      } else {
        defs.push({
          id: 'wp_foundry_relic',
          label: 'Thruster Relic',
          sublabel: 'Upper Gantry',
          color: '#f59e0b',
          pos: [-64, 7.8, -6],
        });
      }
    }

    const bioRelic = this.chestStates.get('chest_biovault_relic');
    if (!this.barriers.biovaultUnlocked) {
      defs.push({
        id: 'wp_biovault_term',
        label: 'Bio-Vault Lock',
        sublabel: 'Hack Terminal [F]',
        color: '#c084fc',
        pos: [-25, 1.5, -8],
      });
    } else if (!bioRelic?.opened) {
      defs.push({
        id: 'wp_biovault_relic',
        label: 'Neural Prism',
        sublabel: 'Sub-Level Vault',
        color: '#c084fc',
        pos: [-16, -4.0, -48],
      });
    }

    if (!this.barriers.citadelUnlocked) {
      defs.push({
        id: 'wp_citadel_term',
        label: 'Aether Citadel',
        sublabel: 'North Barrier [F]',
        color: '#38bdf8',
        pos: [5.5, 1.5, -19.5],
      });
    } else {
      defs.push({
        id: 'wp_ascension_core',
        label: 'Ascension Core',
        sublabel: 'Citadel Summit',
        color: '#e879f9',
        pos: [0, 16.0, -79],
      });
    }

    return defs;
  }

  private projectWaypoints(): HudWaypoint[] {
    if (this.phase !== 'playing') return [];
    const defs = this.getActiveWaypointDefs();
    const out: HudWaypoint[] = [];
    this.camera.updateMatrixWorld();

    for (const def of defs) {
      _v1.set(def.pos[0], def.pos[1] + 0.9, def.pos[2]);
      const distanceM = Math.round(this.playerPos.distanceTo(_v1));
      const dx = def.pos[0] - this.playerPos.x;
      const dz = def.pos[2] - this.playerPos.z;
      const bearingRad = Math.atan2(dx, -dz);
      const bearingDeg = Math.round(((bearingRad * 180) / Math.PI + 360) % 360);

      _v2.copy(_v1).project(this.camera);
      const behind = _v2.z > 1;
      let nx = _v2.x;
      let ny = _v2.y;
      if (behind) {
        nx = -nx;
        ny = -Math.abs(ny);
      }

      const inView = !behind && Math.abs(nx) <= 0.92 && Math.abs(ny) <= 0.88;
      if (!inView) {
        const maxC = Math.max(Math.abs(nx), Math.abs(ny), 0.001);
        nx = (nx / maxC) * 0.9;
        ny = Math.max(-0.82, Math.min(0.82, (ny / maxC) * 0.85));
      }

      const xPct = Math.max(6, Math.min(94, (nx * 0.5 + 0.5) * 100));
      const yPct = Math.max(12, Math.min(86, (-ny * 0.5 + 0.5) * 100));

      out.push({
        id: def.id,
        label: def.label,
        sublabel: def.sublabel,
        color: def.color,
        xPct,
        yPct,
        inView,
        behind,
        bearingDeg,
        distanceM,
      });
    }

    return out;
  }

  private computeDirective(): string {
    if (!this.barriers.gateOpened) {
      if (!this.guideTalked) {
        return 'Speak with Relay Guide S-01 [E] or Awaken the Southern Gate Console';
      }
      return 'Follow Marker to Southern Gate Console [E] to enter Nexus Prime';
    }
    if (!this.archivistTalked) {
      return 'Follow Marker to Archivist M-07 [E] for Nexus Prime Sector Coordinates';
    }
    if (!this.barriers.citadelUnlocked) {
      return `Follow Visor Markers · Collect Relics (${this.relicsFound}/2) or Hack Citadel North Barrier`;
    }
    const wardenAlive = this.enemies.some((e) => e.archetype === 'warden' && e.state !== 'ko');
    if (wardenAlive) {
      return 'Ascend the Aether Citadel & Defeat the Citadel Warden';
    }
    return 'Speak with Architect Echo A-00 & Activate the Ascension Core';
  }

  private projectEnemyMarkers(): HudEnemyMarker[] {
    if (this.phase !== 'playing') return [];
    const out: HudEnemyMarker[] = [];
    this.camera.updateMatrixWorld();
    const labels: Record<EnemyArchetype, string> = {
      stalker: 'Patrol Stalker',
      sentinel: 'Sentinel Drone',
      enforcer: 'Shielded Enforcer',
      warden: 'Citadel Warden',
    };

    for (const e of this.enemies) {
      if (e.state === 'ko') continue;
      const dist = this.playerPos.distanceTo(e.pos);
      const recentlyDamaged = this.elapsedTime - e.lastDamagedAt < 4.5;
      if (dist > (recentlyDamaged ? 32 : 20)) continue;

      _v1.set(e.pos.x, e.pos.y + (e.archetype === 'warden' ? 3.8 : 2.55), e.pos.z);
      _v2.copy(_v1).project(this.camera);
      if (_v2.z > 1 || Math.abs(_v2.x) > 0.92 || Math.abs(_v2.y) > 0.88) continue;

      out.push({
        id: e.id,
        label: labels[e.archetype],
        hp: Math.max(0, Math.round(e.hp)),
        maxHp: e.maxHp,
        shieldHp: Math.max(0, Math.round(e.shieldHp)),
        maxShieldHp: e.maxShieldHp,
        stunned: e.stunTimer > 0,
        xPct: (_v2.x * 0.5 + 0.5) * 100,
        yPct: (-_v2.y * 0.5 + 0.5) * 100,
      });
    }
    return out;
  }

  private buildSnapshot(): HudSnapshot {
    const distId = getDistrictAt(this.playerPos.x, this.playerPos.y, this.playerPos.z);
    const openedCount = [...this.chestStates.values()].filter((c) => c.opened).length;
    const rawDeg = ((-this.camYaw * 180) / Math.PI) % 360;
    const headingDeg = Math.round((rawDeg + 360) % 360);
    const weaponCssColor = `#${(this.stats.weaponColorHex || 0x38bdf8).toString(16).padStart(6, '0')}`;

    return {
      hp: Math.round(this.hp),
      maxHp: Math.round(this.stats.maxHp),
      energy: Math.round(this.energy),
      maxEnergy: Math.round(this.stats.maxEnergy),
      stamina: Math.round(this.stamina),
      maxStamina: Math.round(this.stats.maxStamina),
      sprinting: this.isSprinting,
      headingDeg,
      shards: Math.round(this.shards),
      district: distId,
      districtName: DISTRICT_META[distId].name,
      directive: this.computeDirective(),
      gateOpened: this.barriers.gateOpened,
      citadelUnlocked: this.barriers.citadelUnlocked,
      biovaultUnlocked: this.barriers.biovaultUnlocked,
      guideTalked: this.guideTalked,
      archivistTalked: this.archivistTalked,
      relicsFound: this.relicsFound,
      totalRelics: 3,
      chestsOpened: openedCount,
      totalChests: this.chestStates.size,
      enemiesDefeated: this.enemiesDefeated,
      elapsedSeconds: Math.round(this.elapsedSeconds),
      cameraMode: this.cameraMode,
      weaponId: this.stats.weaponId,
      weaponName: this.stats.weaponName,
      weaponRange: this.stats.range,
      weaponAbility: this.stats.abilityName,
      weaponCssColor,
      dashReady: this.dashCooldownTimer <= 0 ? 1 : 1 - this.dashCooldownTimer / this.stats.dashCooldown,
      prompt: this.currentPrompt,
      toast: this.toastMsg,
      waypoints: this.projectWaypoints(),
      enemyMarkers: this.projectEnemyMarkers(),
      outcome: this.lastOutcome,
      endingChosen: this.lastEnding,
      score: Math.round(this.score),
      bestScore: Math.round(this.bestScore),
    };
  }

  private emitHudSnapshot(): void {
    this.callbacks.onHudUpdate(this.buildSnapshot());
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.cleanupListeners();
    this.composer?.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
