import * as THREE from 'three';
import type { CosmeticPalette, EnemyArchetype, Rarity } from './types';
import type { FacadeStyle } from './worldData';

export interface PlayerRig {
  group: THREE.Group;
  head: THREE.Group;
  visorMat: THREE.MeshStandardMaterial;
  chassisMat: THREE.MeshStandardMaterial;
  accentMat: THREE.MeshStandardMaterial;
  leftArm: THREE.Object3D;
  rightArm: THREE.Object3D;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  backpackCore: THREE.Mesh;
  thrusterFlame: THREE.Mesh;
}

export interface ChestRig {
  group: THREE.Group;
  lidGroup: THREE.Group;
  glowMat: THREE.MeshStandardMaterial;
}

export interface EnemyRig {
  group: THREE.Group;
  bodyGroup: THREE.Group;
  hitMaterials: THREE.MeshStandardMaterial[];
  telegraphRing: THREE.Mesh;
  shieldMesh?: THREE.Mesh;
  haloGroup?: THREE.Group;
}

export interface FacadeTextureSet {
  map: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  normalMap: THREE.DataTexture;
}

/**
 * Converts a grayscale height canvas into a crisp tangent-space RGB normal map.
 * Gives genuine 3D specular bevels on concrete cracks, mullions, rivets, and armor seams.
 */
function heightCanvasToNormalTexture(
  heightCanvas: HTMLCanvasElement,
  strength: number,
  maxAniso: number,
): THREE.DataTexture {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const ctx = heightCanvas.getContext('2d')!;
  const src = ctx.getImageData(0, 0, w, h).data;
  const out = new Uint8Array(w * h * 4);

  const sample = (x: number, y: number): number => {
    const wx = ((x % w) + w) % w;
    const wy = ((y % h) + h) % h;
    return src[(wy * w + wx) * 4] / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const hL = sample(x - 1, y);
      const hR = sample(x + 1, y);
      const hU = sample(x, y - 1);
      const hD = sample(x, y + 1);
      let nx = (hL - hR) * strength;
      let ny = (hU - hD) * strength;
      let nz = 1.0;
      const invLen = 1 / Math.hypot(nx, ny, nz);
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;
      const idx = (y * w + x) * 4;
      out[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      out[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      out[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      out[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(out, w, h, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAniso;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

let cachedRobotTex: { roughnessMap: THREE.CanvasTexture; normalMap: THREE.DataTexture } | null = null;

function getRobotArmorMaps(): { roughnessMap: THREE.CanvasTexture; normalMap: THREE.DataTexture } {
  if (cachedRobotTex) return cachedRobotTex;
  const size = 256;
  const rC = document.createElement('canvas');
  rC.width = size;
  rC.height = size;
  const rCtx = rC.getContext('2d')!;

  const bC = document.createElement('canvas');
  bC.width = size;
  bC.height = size;
  const bCtx = bC.getContext('2d')!;

  rCtx.fillStyle = '#6e6e6e'; // weathered satin brushed titanium
  rCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  let s = 1337;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };

  // Mottled carbon grime & oil smudges
  for (let i = 0; i < 90; i++) {
    const gx = rnd() * size;
    const gy = rnd() * size;
    const rad = 6 + rnd() * 20;
    const grad = rCtx.createRadialGradient(gx, gy, 1, gx, gy, rad);
    grad.addColorStop(0, 'rgba(210,210,210,0.28)');
    grad.addColorStop(1, 'rgba(210,210,210,0)');
    rCtx.fillStyle = grad;
    rCtx.beginPath();
    rCtx.arc(gx, gy, rad, 0, Math.PI * 2);
    rCtx.fill();
  }

  // Brushed metal micro-grain & battle-wear scratches
  for (let i = 0; i < 280; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const len = 8 + rnd() * 36;
    const dy = (rnd() - 0.5) * 5;
    rCtx.strokeStyle = rnd() > 0.45 ? 'rgba(220,220,220,0.25)' : 'rgba(25,25,25,0.3)';
    rCtx.lineWidth = 1;
    rCtx.beginPath();
    rCtx.moveTo(x, y);
    rCtx.lineTo(x + len, y + dy);
    rCtx.stroke();

    bCtx.strokeStyle = 'rgba(30,30,30,0.34)';
    bCtx.beginPath();
    bCtx.moveTo(x, y);
    bCtx.lineTo(x + len, y + dy);
    bCtx.stroke();
  }

  // Armor panel seam grooves & recessed bolts
  bCtx.strokeStyle = '#282828';
  bCtx.lineWidth = 3;
  bCtx.strokeRect(10, 10, size - 20, size - 20);
  bCtx.beginPath();
  bCtx.moveTo(0, size * 0.5);
  bCtx.lineTo(size, size * 0.5);
  bCtx.stroke();

  bCtx.fillStyle = '#c8c8c8';
  for (let rx = 24; rx < size; rx += 42) {
    bCtx.fillRect(rx, 16, 4, 4);
    bCtx.fillRect(rx, size - 20, 4, 4);
  }

  rCtx.fillStyle = '#b4b4b4';
  rCtx.fillRect(0, size * 0.5 - 2, size, 4);

  const roughnessMap = new THREE.CanvasTexture(rC);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  const normalMap = heightCanvasToNormalTexture(bC, 2.2, 4);

  cachedRobotTex = { roughnessMap, normalMap };
  return cachedRobotTex;
}

export function createBuildingFacadeTextures(
  style: FacadeStyle,
  maxAniso: number,
): FacadeTextureSet {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;

  const emisCanvas = document.createElement('canvas');
  emisCanvas.width = size;
  emisCanvas.height = size;
  const eCtx = emisCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  const baseFill =
    style === 'industrial'
      ? '#212022'
      : style === 'conservatory'
        ? '#1a221f'
        : style === 'citadel'
          ? '#16161f'
          : style === 'neon_arcade'
            ? '#1b1d24'
            : '#181c24';

  cCtx.fillStyle = baseFill;
  cCtx.fillRect(0, 0, size, size);

  eCtx.fillStyle = '#000000';
  eCtx.fillRect(0, 0, size, size);

  rCtx.fillStyle = '#d0d0d0'; // matte weathered concrete
  rCtx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#848484';
  bCtx.fillRect(0, 0, size, size);

  let seed = style.length * 1021 + 277;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // Multi-scale mottled concrete grain & aggregate blotches
  for (let i = 0; i < 420; i++) {
    const px = rand() * size;
    const py = rand() * size;
    const rad = 4 + rand() * 24;
    cCtx.fillStyle = rand() > 0.5 ? 'rgba(215,210,200,0.035)' : 'rgba(6,8,10,0.18)';
    cCtx.beginPath();
    cCtx.arc(px, py, rad, 0, Math.PI * 2);
    cCtx.fill();

    bCtx.fillStyle = rand() > 0.5 ? 'rgba(155,155,155,0.22)' : 'rgba(95,95,95,0.22)';
    bCtx.fillRect(px, py, 4, 4);
  }

  // Cast concrete formwork & weathered metal plating patches
  for (let i = 0; i < 160; i++) {
    const px = Math.floor(rand() * 16) * 32;
    const py = Math.floor(rand() * 16) * 32;
    const w = 32 * (1 + Math.floor(rand() * 2));
    const h = 32;
    cCtx.fillStyle = rand() > 0.5 ? 'rgba(255,248,235,0.035)' : 'rgba(0,0,0,0.22)';
    cCtx.fillRect(px, py, w, h);
    bCtx.fillStyle = rand() > 0.5 ? '#909090' : '#767676';
    bCtx.fillRect(px, py, w, h);
  }

  // Heavy rain-runoff soot streaks, oxidized rust drips & damp stains down the wall
  for (let i = 0; i < 95; i++) {
    const gx = rand() * size;
    const gy = rand() * size;
    const gw = 3 + rand() * 12;
    const gh = 48 + rand() * 170;
    const isRust = style === 'industrial' || rand() > 0.65;
    const grad = cCtx.createLinearGradient(0, gy, 0, gy + gh);
    grad.addColorStop(0, isRust ? 'rgba(84,42,18,0.42)' : 'rgba(5,7,9,0.52)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    cCtx.fillStyle = grad;
    cCtx.fillRect(gx, gy, gw, gh);

    // Damp streaks are slightly glossier than dry chalky concrete
    const rGrad = rCtx.createLinearGradient(0, gy, 0, gy + gh * 0.7);
    rGrad.addColorStop(0, 'rgba(72,72,72,0.45)');
    rGrad.addColorStop(1, 'rgba(200,200,200,0)');
    rCtx.fillStyle = rGrad;
    rCtx.fillRect(gx, gy, gw, gh * 0.7);
  }

  // Fine masonry hairline cracks across concrete
  cCtx.strokeStyle = 'rgba(4,5,7,0.68)';
  bCtx.strokeStyle = '#242424';
  for (let c = 0; c < 18; c++) {
    let cx = rand() * size;
    let cy = rand() * size;
    cCtx.lineWidth = 1.2;
    bCtx.lineWidth = 1.5;
    cCtx.beginPath();
    bCtx.beginPath();
    cCtx.moveTo(cx, cy);
    bCtx.moveTo(cx, cy);
    for (let seg = 0; seg < 6; seg++) {
      cx += (rand() - 0.5) * 28;
      cy += 10 + rand() * 20;
      cCtx.lineTo(cx, cy);
      bCtx.lineTo(cx, cy);
    }
    cCtx.stroke();
    bCtx.stroke();
  }

  // Horizontal heavy spandrel concrete decks (4 major structural tiers per 512px)
  const tierH = 128;
  for (let y = 0; y < size; y += tierH) {
    cCtx.fillStyle = '#0a0c10';
    cCtx.fillRect(0, y, size, 18);
    bCtx.fillStyle = '#303030';
    bCtx.fillRect(0, y, size, 18);
    cCtx.fillStyle = '#2a303b';
    cCtx.fillRect(0, y + 18, size, 6);
    bCtx.fillStyle = '#c4c4c4';
    bCtx.fillRect(0, y + 18, size, 6);
    rCtx.fillStyle = '#7c7c7c';
    rCtx.fillRect(0, y + 18, size, 6);

    // Dirt & grime shadow directly beneath concrete overhang
    const lipGrad = cCtx.createLinearGradient(0, y + 24, 0, y + 48);
    lipGrad.addColorStop(0, 'rgba(5,6,8,0.55)');
    lipGrad.addColorStop(1, 'rgba(0,0,0,0)');
    cCtx.fillStyle = lipGrad;
    cCtx.fillRect(0, y + 24, size, 24);
  }

  // Secondary vertical structural pilasters
  for (let x = 0; x < size; x += 128) {
    cCtx.fillStyle = '#212630';
    cCtx.fillRect(x, 0, 14, size);
    cCtx.fillStyle = '#0b0d12';
    cCtx.fillRect(x + 14, 0, 3, size);
    bCtx.fillStyle = '#b4b4b4';
    bCtx.fillRect(x, 0, 14, size);
    bCtx.fillStyle = '#323232';
    bCtx.fillRect(x + 14, 0, 3, size);
  }

  if (style === 'cyber_tower' || style === 'citadel') {
    for (let tier = 0; tier < 4; tier++) {
      const bandTop = tier * tierH + 34;
      const bandH = 74;

      if (tier % 2 === 0 && style === 'cyber_tower') {
        // Soot-stained mechanical equipment louver band
        cCtx.fillStyle = '#0e1118';
        cCtx.fillRect(18, bandTop, size - 36, bandH);
        bCtx.fillStyle = '#484848';
        bCtx.fillRect(18, bandTop, size - 36, bandH);
        for (let ly = bandTop + 6; ly < bandTop + bandH - 4; ly += 8) {
          cCtx.fillStyle = '#242934';
          cCtx.fillRect(22, ly, size - 44, 3);
          bCtx.fillStyle = '#a0a0a0';
          bCtx.fillRect(22, ly, size - 44, 3);
        }
        // Exhaust soot cloud above vent
        cCtx.fillStyle = 'rgba(4,5,7,0.45)';
        cCtx.fillRect(48, bandTop - 16, 120, 18);
        continue;
      }

      for (let bay = 0; bay < 4; bay++) {
        const bx = bay * 128 + 20;
        const bw = 102;
        cCtx.fillStyle = '#090b10';
        cCtx.fillRect(bx, bandTop, bw, bandH);
        bCtx.fillStyle = '#2a2a2a';
        bCtx.fillRect(bx, bandTop, bw, bandH);
        rCtx.fillStyle = '#242424';
        rCtx.fillRect(bx + 3, bandTop + 3, bw - 6, bandH - 6);

        for (let p = 0; p < 4; p++) {
          const px = bx + 4 + p * 24;
          const pw = 20;
          const ph = bandH - 8;
          const py = bandTop + 4;

          cCtx.fillStyle = '#060910';
          cCtx.fillRect(px, py, pw, ph);

          // Dusty grime smudge across lower half of pane
          const grime = cCtx.createLinearGradient(0, py, 0, py + ph);
          grime.addColorStop(0, 'rgba(0,0,0,0)');
          grime.addColorStop(1, 'rgba(34,30,26,0.48)');
          cCtx.fillStyle = grime;
          cCtx.fillRect(px, py, pw, ph);

          // Sparse dying/flickering interior rooms (~14%)
          if (rand() > 0.86) {
            const warm = rand() > 0.4;
            const colHex = style === 'citadel'
              ? (warm ? '#93c5fd' : '#a78bfa')
              : (warm ? '#d99b52' : '#5ea9c9');
            const g = eCtx.createLinearGradient(0, py, 0, py + ph);
            g.addColorStop(0, colHex);
            g.addColorStop(1, 'rgba(0,0,0,0.35)');
            eCtx.fillStyle = g;
            eCtx.globalAlpha = 0.42 + rand() * 0.28;
            eCtx.fillRect(px + 2, py + 4, pw - 4, ph - 8);
            eCtx.globalAlpha = 1;

            cCtx.fillStyle = colHex;
            cCtx.globalAlpha = 0.22;
            cCtx.fillRect(px + 2, py + 4, pw - 4, ph - 8);
            cCtx.globalAlpha = 1;
          }
        }
      }
    }

    if (style === 'citadel') {
      eCtx.fillStyle = '#8b5cf6';
      eCtx.fillRect(6, 0, 2, size);
      eCtx.fillRect(262, 0, 2, size);
    }
  } else if (style === 'neon_arcade') {
    // Dirty rusted corrugated blast shutters + street-level grime & stencil tags
    cCtx.fillStyle = '#151820';
    cCtx.fillRect(16, 260, size - 32, 240);
    for (let cy = 270; cy < 495; cy += 10) {
      cCtx.fillStyle = cy % 20 === 0 ? '#1f242e' : '#0b0d12';
      cCtx.fillRect(22, cy, size - 44, 5);
      bCtx.fillStyle = cy % 20 === 0 ? '#a8a8a8' : '#4a4a4a';
      bCtx.fillRect(22, cy, size - 44, 5);
    }
    // Rust wash over lower shutter corner
    const rustGrad = cCtx.createRadialGradient(90, 440, 10, 90, 440, 110);
    rustGrad.addColorStop(0, 'rgba(110,48,18,0.45)');
    rustGrad.addColorStop(1, 'rgba(0,0,0,0)');
    cCtx.fillStyle = rustGrad;
    cCtx.fillRect(16, 320, 220, 180);

    // Faded industrial stencil marking on shutter
    cCtx.fillStyle = 'rgba(203, 213, 225, 0.14)';
    cCtx.font = 'bold 26px monospace';
    cCtx.fillText('SEC-04 // CLOSED', 48, 370);

    // Thin chipped neon cornice strip
    eCtx.fillStyle = '#06b6d4';
    eCtx.fillRect(16, 250, 210, 4);
    eCtx.fillRect(268, 250, size - 284, 4); // broken dead tube gap
    cCtx.fillStyle = '#22d3ee';
    cCtx.fillRect(16, 250, 210, 4);

    // Upper brutalist recessed slits
    for (let bay = 0; bay < 8; bay++) {
      const sx = bay * 64 + 18;
      for (let row = 0; row < 2; row++) {
        const sy = row * 116 + 34;
        cCtx.fillStyle = '#080a0f';
        cCtx.fillRect(sx, sy, 28, 52);
        bCtx.fillStyle = '#2a2a2a';
        bCtx.fillRect(sx, sy, 28, 52);
        rCtx.fillStyle = '#242424';
        rCtx.fillRect(sx + 2, sy + 2, 24, 48);

        if (rand() > 0.76) {
          const glowCol = rand() > 0.45 ? '#d97706' : '#0891b2';
          eCtx.fillStyle = glowCol;
          eCtx.globalAlpha = 0.48;
          eCtx.fillRect(sx + 3, sy + 6, 22, 36);
          eCtx.globalAlpha = 1;
        }
      }
    }
  } else if (style === 'industrial') {
    for (let tier = 0; tier < 4; tier++) {
      const ty = tier * 128 + 28;
      for (let col = 0; col < 4; col++) {
        const tx = col * 128 + 20;
        cCtx.fillStyle = '#222429';
        cCtx.fillRect(tx, ty, 100, 88);
        bCtx.fillStyle = '#9c9c9c';
        bCtx.fillRect(tx, ty, 100, 88);
        rCtx.fillStyle = '#787878';
        rCtx.fillRect(tx, ty, 100, 88);

        // Rust & grease blotches on steel plates
        if (rand() > 0.35) {
          cCtx.fillStyle = 'rgba(105, 46, 16, 0.32)';
          cCtx.fillRect(tx + rand() * 35, ty + rand() * 35, 36, 36);
        }

        bCtx.fillStyle = '#dcdcdc';
        for (let r = 8; r < 96; r += 16) {
          bCtx.fillRect(tx + r, ty + 4, 3, 3);
          bCtx.fillRect(tx + r, ty + 81, 3, 3);
        }

        if ((tier + col) % 2 === 0) {
          cCtx.fillStyle = '#090b0f';
          cCtx.fillRect(tx + 14, ty + 16, 72, 56);
          bCtx.fillStyle = '#2a2a2a';
          bCtx.fillRect(tx + 14, ty + 16, 72, 56);
          for (let ly = ty + 22; ly < ty + 68; ly += 8) {
            cCtx.fillStyle = '#282c36';
            cCtx.fillRect(tx + 18, ly, 64, 4);
            bCtx.fillStyle = '#969696';
            bCtx.fillRect(tx + 18, ly, 64, 4);
          }
          if (rand() > 0.72) {
            eCtx.fillStyle = '#f59e0b';
            eCtx.fillRect(tx + 24, ty + 38, 12, 4);
          }
        }
      }
    }
    // Chipped yellow hazard stripe at bottom sill
    cCtx.fillStyle = '#92400e';
    for (let hx = 0; hx < size; hx += 32) {
      cCtx.fillRect(hx, size - 14, 15, 10);
    }
    cCtx.fillStyle = 'rgba(10,10,12,0.55)';
    for (let sc = 0; sc < 14; sc++) {
      cCtx.fillRect(rand() * size, size - 15, 8 + rand() * 14, 12);
    }
  } else {
    for (let bay = 0; bay < 4; bay++) {
      for (let tier = 0; tier < 4; tier++) {
        const bx = bay * 128 + 22;
        const by = tier * 128 + 30;
        cCtx.fillStyle = '#091210';
        cCtx.fillRect(bx, by, 92, 76);
        bCtx.fillStyle = '#303030';
        bCtx.fillRect(bx, by, 92, 76);
        rCtx.fillStyle = '#282828';
        rCtx.fillRect(bx + 3, by + 3, 86, 70);

        if (rand() > 0.72) {
          eCtx.fillStyle = '#34d399';
          eCtx.globalAlpha = 0.35;
          eCtx.fillRect(bx + 6, by + 10, 80, 56);
          eCtx.globalAlpha = 1;
        }
      }
    }
    cCtx.fillStyle = 'rgba(20, 92, 58, 0.58)';
    for (let i = 0; i < 42; i++) {
      const mx = rand() * size;
      const my = rand() * size;
      cCtx.fillRect(mx, my, 10 + rand() * 24, 18 + rand() * 44);
      bCtx.fillStyle = '#acaaaa';
      bCtx.fillRect(mx, my, 8 + rand() * 14, 14 + rand() * 26);
    }
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAniso;

  const emissiveMap = new THREE.CanvasTexture(emisCanvas);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.wrapS = THREE.RepeatWrapping;
  emissiveMap.wrapT = THREE.RepeatWrapping;
  emissiveMap.anisotropy = maxAniso;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.anisotropy = maxAniso;

  const normalMap = heightCanvasToNormalTexture(bumpCanvas, 2.4, maxAniso);

  return { map, emissiveMap, roughnessMap, normalMap };
}

export function createWetStreetTextures(maxAniso: number): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  normalMap: THREE.DataTexture;
} {
  const size = 512;
  const col = document.createElement('canvas');
  col.width = size;
  col.height = size;
  const ctx = col.getContext('2d')!;

  const rgh = document.createElement('canvas');
  rgh.width = size;
  rgh.height = size;
  const rCtx = rgh.getContext('2d')!;

  const bmp = document.createElement('canvas');
  bmp.width = size;
  bmp.height = size;
  const bCtx = bmp.getContext('2d')!;

  // Gritty weathered dystopian cracked asphalt
  ctx.fillStyle = '#14171c';
  ctx.fillRect(0, 0, size, size);

  rCtx.fillStyle = '#d4d4d4'; // dry gritty tarmac baseline
  rCtx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  let s = 4099;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };

  // Coarse asphalt gravel & dusty silt streaks
  for (let i = 0; i < 650; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const w = 4 + rnd() * 28;
    const h = 3 + rnd() * 10;
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(42, 44, 46, 0.24)' : 'rgba(6, 7, 9, 0.36)';
    ctx.fillRect(x, y, w, h);

    rCtx.fillStyle = rnd() > 0.5 ? 'rgba(180,180,180,0.3)' : 'rgba(235,235,235,0.22)';
    rCtx.fillRect(x, y, w, h);

    bCtx.fillStyle = rnd() > 0.5 ? 'rgba(154,154,154,0.4)' : 'rgba(102,102,102,0.4)';
    bCtx.fillRect(x, y, 3, 3);
  }

  // Irregular feathered damp tarmac & dark oil grime patches (no hard-edged ovals)
  for (let p = 0; p < 22; p++) {
    const px = 40 + rnd() * (size - 80);
    const py = 40 + rnd() * (size - 80);
    const rad = 18 + rnd() * 34;

    const cGrad = ctx.createRadialGradient(px, py, rad * 0.15, px, py, rad);
    cGrad.addColorStop(0, 'rgba(3, 5, 8, 0.56)');
    cGrad.addColorStop(0.65, 'rgba(7, 9, 13, 0.30)');
    cGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cGrad;
    ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);

    const rGrad = rCtx.createRadialGradient(px, py, rad * 0.2, px, py, rad);
    rGrad.addColorStop(0, 'rgba(98, 98, 98, 0.52)');
    rGrad.addColorStop(1, 'rgba(212, 212, 212, 0)');
    rCtx.fillStyle = rGrad;
    rCtx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
  }

  // Branching asphalt fractures & expansion joints
  ctx.strokeStyle = '#090b0e';
  bCtx.strokeStyle = '#242424';
  for (let c = 0; c < 14; c++) {
    let cx = rnd() * size;
    let cy = rnd() * size;
    ctx.lineWidth = 1.4;
    bCtx.lineWidth = 2.0;
    ctx.beginPath();
    bCtx.beginPath();
    ctx.moveTo(cx, cy);
    bCtx.moveTo(cx, cy);
    for (let seg = 0; seg < 7; seg++) {
      cx += (rnd() - 0.5) * 36;
      cy += (rnd() - 0.5) * 36;
      ctx.lineTo(cx, cy);
      bCtx.lineTo(cx, cy);
    }
    ctx.stroke();
    bCtx.stroke();
  }

  ctx.strokeStyle = '#1b1f27';
  ctx.lineWidth = 2;
  bCtx.strokeStyle = '#383838';
  bCtx.lineWidth = 2;
  for (let i = 0; i <= size; i += 256) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();

    bCtx.beginPath();
    bCtx.moveTo(i, 0);
    bCtx.lineTo(i, size);
    bCtx.stroke();
    bCtx.beginPath();
    bCtx.moveTo(0, i);
    bCtx.lineTo(size, i);
    bCtx.stroke();
  }

  // Rusted storm utility grate with dark sludge halo
  const sludge = ctx.createRadialGradient(428, 408, 16, 428, 408, 74);
  sludge.addColorStop(0, 'rgba(6,7,8,0.65)');
  sludge.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sludge;
  ctx.fillRect(340, 330, 170, 150);

  ctx.fillStyle = '#06080b';
  ctx.fillRect(380, 380, 96, 56);
  bCtx.fillStyle = '#282828';
  bCtx.fillRect(380, 380, 96, 56);
  ctx.fillStyle = '#2d2621'; // rusted iron grate bars
  for (let gx = 388; gx < 470; gx += 10) {
    ctx.fillRect(gx, 386, 5, 44);
    bCtx.fillStyle = '#b4b4b4';
    bCtx.fillRect(gx, 386, 5, 44);
  }

  // Scuffed, worn amber traffic dashes
  ctx.fillStyle = 'rgba(180, 105, 18, 0.24)';
  ctx.fillRect(24, 250, 50, 6);
  ctx.fillRect(280, 250, 50, 6);
  ctx.fillStyle = 'rgba(18, 20, 24, 0.55)';
  ctx.fillRect(42, 249, 10, 8);
  ctx.fillRect(298, 249, 14, 8);

  const map = new THREE.CanvasTexture(col);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAniso;

  const roughnessMap = new THREE.CanvasTexture(rgh);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.anisotropy = maxAniso;

  const normalMap = heightCanvasToNormalTexture(bmp, 2.2, maxAniso);

  return { map, roughnessMap, normalMap };
}

export function createHoloBillboardTexture(
  title: string,
  subtitle: string,
  accentCss: string,
  maxAniso: number,
  vertical = false,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = vertical ? 256 : 512;
  canvas.height = vertical ? 512 : 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#070a10';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Scanlines & dirty grime vignette
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let y = 0; y < canvas.height; y += 5) {
    ctx.fillRect(0, y, canvas.width, 2);
  }

  const vig = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    canvas.width * 0.2,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width * 0.72,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(4,5,7,0.68)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = accentCss;
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  ctx.fillStyle = accentCss;
  ctx.textAlign = 'center';

  if (vertical) {
    ctx.font = 'bold 34px "Chakra Petch", sans-serif';
    const chars = title.split('');
    const startY = 82;
    const step = Math.min(38, (canvas.height - 130) / Math.max(1, chars.length));
    chars.forEach((ch, idx) => {
      ctx.fillText(ch, canvas.width / 2, startY + idx * step);
    });
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 15px "JetBrains Mono", monospace';
    ctx.fillText(subtitle, canvas.width / 2, canvas.height - 34);
  } else {
    ctx.font = 'bold 42px "Chakra Petch", sans-serif';
    ctx.fillText(title, 256, 118);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 19px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(subtitle, 256, 168);
  }

  // Flicker dead-pixel glitch smudge
  ctx.fillStyle = 'rgba(8,10,14,0.85)';
  ctx.fillRect(canvas.width * 0.68, canvas.height * 0.72, canvas.width * 0.24, 10);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export function buildMountedBillboard(
  width: number,
  height: number,
  tex: THREE.CanvasTexture,
  accentHex: number,
): { group: THREE.Group; screenMat: THREE.MeshBasicMaterial } {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x171a21, roughness: 0.72, metalness: 0.78 });
  const rustMat = new THREE.MeshStandardMaterial({ color: 0x2c221c, roughness: 0.85, metalness: 0.55 });
  const screenMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9 });

  const backing = new THREE.Mesh(new THREE.BoxGeometry(width + 0.36, height + 0.36, 0.24), frameMat);
  backing.castShadow = true;
  group.add(backing);

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(width, height), screenMat);
  screen.position.z = 0.13;
  group.add(screen);

  // Rear steel mounting brackets & overhead light bar
  [-width * 0.35, width * 0.35].forEach((bx) => {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.65), rustMat);
    strut.position.set(bx, 0, -0.36);
    group.add(strut);
  });

  const lightBar = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.7, 0.09, 0.28),
    new THREE.MeshStandardMaterial({ color: accentHex, emissive: accentHex, emissiveIntensity: 1.4 }),
  );
  lightBar.position.set(0, height / 2 + 0.16, 0.22);
  group.add(lightBar);

  return { group, screenMat };
}

export function createContactShadowDisc(radius = 0.75): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.82)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 18), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.025;
  return mesh;
}

export function buildWallHvacUnit(): THREE.Group {
  const group = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x262b33, roughness: 0.72, metalness: 0.68 });
  const rustMat = new THREE.MeshStandardMaterial({ color: 0x382820, roughness: 0.86, metalness: 0.45 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x0b0e13, roughness: 0.85, metalness: 0.3 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 1.1,
  });

  const casing = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.15, 0.85), metalMat);
  const fanHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.14, 12), darkMat);
  fanHousing.rotation.x = Math.PI / 2;
  fanHousing.position.set(-0.32, 0, 0.42);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.76, 0.1), rustMat);
  grille.position.set(0.42, 0, 0.42);
  const dripPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6), rustMat);
  dripPipe.position.set(-0.75, -0.75, 0.15);
  const statusLed = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.08), accentMat);
  statusLed.position.set(0.58, 0.42, 0.43);

  group.add(casing, fanHousing, grille, dripPipe, statusLed);
  return group;
}

export function buildCargoCrate(accentHex = 0xf59e0b): THREE.Group {
  const group = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x24282e, roughness: 0.76, metalness: 0.52 });
  const ribMat = new THREE.MeshStandardMaterial({ color: 0x14171d, roughness: 0.65, metalness: 0.68 });
  const stripeMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 0.52,
    roughness: 0.5,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.05, 1.05), hullMat);
  body.position.y = 0.525;
  body.castShadow = true;
  body.receiveShadow = true;

  const ribL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.12, 1.12), ribMat);
  ribL.position.set(-0.56, 0.54, 0);
  const ribR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.12, 1.12), ribMat);
  ribR.position.set(0.56, 0.54, 0);
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.09, 1.08), stripeMat);
  badge.position.set(0, 0.78, 0);

  group.add(body, ribL, ribR, badge, createContactShadowDisc(0.9));
  return group;
}

export function buildConcreteBarrier(): THREE.Group {
  const group = new THREE.Group();
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x2f333a, roughness: 0.94, metalness: 0.05 });
  const sootMat = new THREE.MeshStandardMaterial({ color: 0x181a1f, roughness: 0.96, metalness: 0.04 });
  const warnMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    emissive: 0x92400e,
    emissiveIntensity: 0.35,
    roughness: 0.7,
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.36, 0.62), sootMat);
  base.position.y = 0.18;
  const upper = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.56, 0.36), concreteMat);
  upper.position.y = 0.64;
  upper.castShadow = true;
  const reflector = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.4), warnMat);
  reflector.position.set(0, 0.78, 0);

  group.add(base, upper, reflector, createContactShadowDisc(1.1));
  return group;
}

export function buildDumpster(): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e2b24, roughness: 0.84, metalness: 0.38 });
  const rustMat = new THREE.MeshStandardMaterial({ color: 0x3d281c, roughness: 0.88, metalness: 0.42 });
  const lidMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.92, metalness: 0.12 });

  const bin = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.15, 1.25), bodyMat);
  bin.position.y = 0.62;
  bin.castShadow = true;
  bin.receiveShadow = true;

  const rim = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.12, 1.35), rustMat);
  rim.position.y = 1.18;

  const lidL = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 1.28), lidMat);
  lidL.position.set(-0.48, 1.26, 0);
  const lidR = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 1.28), lidMat);
  lidR.position.set(0.5, 1.35, -0.08);
  lidR.rotation.z = 0.22; // ajar lid

  // Wheel skids
  [-0.78, 0.78].forEach((wx) => {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 1.1), rustMat);
    skid.position.set(wx, 0.05, 0);
    group.add(skid);
  });

  group.add(bin, rim, lidL, lidR, createContactShadowDisc(1.35));
  return group;
}

export function buildBarrelCluster(accentHex = 0xb45309): THREE.Group {
  const group = new THREE.Group();
  const drumMat = new THREE.MeshStandardMaterial({ color: 0x2c333b, roughness: 0.76, metalness: 0.62 });
  const rustDrumMat = new THREE.MeshStandardMaterial({ color: 0x3e291e, roughness: 0.84, metalness: 0.54 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.68, metalness: 0.35 });
  const oilMat = new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0.85 });

  const makeDrum = (mat: THREE.MeshStandardMaterial): THREE.Group => {
    const d = new THREE.Group();
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.94, 12), mat);
    cyl.position.y = 0.47;
    cyl.castShadow = true;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.335, 0.335, 0.14, 12), stripeMat);
    band.position.y = 0.52;
    const lipTop = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.025, 6, 14), mat);
    lipTop.rotation.x = Math.PI / 2;
    lipTop.position.y = 0.93;
    d.add(cyl, band, lipTop);
    return d;
  };

  const d1 = makeDrum(drumMat);
  d1.position.set(-0.32, 0, -0.15);

  const d2 = makeDrum(rustDrumMat);
  d2.position.set(0.34, 0, 0.12);

  // Tipped leaking drum
  const d3 = makeDrum(rustDrumMat);
  d3.rotation.z = Math.PI / 2;
  d3.rotation.y = 0.45;
  d3.position.set(0.05, 0.32, 0.55);

  const oilSpill = new THREE.Mesh(new THREE.CircleGeometry(0.85, 14), oilMat);
  oilSpill.rotation.x = -Math.PI / 2;
  oilSpill.position.set(0.35, 0.022, 0.55);

  group.add(d1, d2, d3, oilSpill, createContactShadowDisc(1.0));
  return group;
}

export function buildRubblePile(): THREE.Group {
  const group = new THREE.Group();
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#262930';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 650; i++) {
    const shade = 24 + ((i * 37) % 34);
    ctx.fillStyle = `rgba(${shade}, ${shade + 2}, ${shade + 5}, 0.5)`;
    ctx.fillRect((i * 53) % 128, (i * 89) % 128, 2 + (i % 4), 2 + (i % 3));
  }
  ctx.strokeStyle = 'rgba(10,12,16,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(12, 24);
  ctx.lineTo(54, 48);
  ctx.lineTo(96, 38);
  ctx.moveTo(40, 110);
  ctx.lineTo(74, 72);
  ctx.stroke();
  const slabTex = new THREE.CanvasTexture(c);
  slabTex.colorSpace = THREE.SRGBColorSpace;
  const slabMat = new THREE.MeshStandardMaterial({
    map: slabTex,
    roughness: 0.94,
    metalness: 0.08,
  });
  const rebarMat = new THREE.MeshStandardMaterial({ color: 0x452719, roughness: 0.85, metalness: 0.65 });

  const specs: Array<[number, number, number, number, number, number]> = [
    [0, 0.18, 0, 0.48, 0.25, 0.3],
    [-0.38, 0.12, 0.22, 0.32, 0.6, 1.1],
    [0.35, 0.14, -0.18, 0.35, 0.1, 0.7],
    [0.12, 0.28, 0.1, 0.24, 0.9, 0.4],
  ];
  specs.forEach(([x, y, z, r, rx, ry]) => {
    const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), slabMat);
    chunk.scale.set(1.3, 0.55, 1.1);
    chunk.position.set(x, y, z);
    chunk.rotation.set(rx, ry, 0.2);
    chunk.castShadow = true;
    chunk.receiveShadow = true;
    group.add(chunk);
  });

  // Protruding bent rebar rods
  [-0.18, 0.22].forEach((rx, idx) => {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.85, 5), rebarMat);
    rod.position.set(rx, 0.34, idx * 0.15 - 0.08);
    rod.rotation.set(0.45, 0.3, idx === 0 ? 0.5 : -0.4);
    group.add(rod);
  });

  group.add(createContactShadowDisc(0.95));
  return group;
}

export function buildSteamVent(): { group: THREE.Group; puffs: THREE.Mesh[] } {
  const group = new THREE.Group();
  const grateMat = new THREE.MeshStandardMaterial({ color: 0x1c2026, roughness: 0.8, metalness: 0.7 });
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.58, 0.06, 12), grateMat);
  rim.position.y = 0.03;
  group.add(rim);

  const puffMat = new THREE.MeshBasicMaterial({
    color: 0x94a3b8,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });
  const puffs: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32 + i * 0.12, 1), puffMat.clone());
    puff.position.y = 0.4 + i * 0.75;
    group.add(puff);
    puffs.push(puff);
  }
  return { group, puffs };
}

export function buildStreetLamp(glowHex = 0x38bdf8): THREE.Group {
  const group = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x161a22, roughness: 0.65, metalness: 0.78 });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: glowHex,
    emissive: glowHex,
    emissiveIntensity: 1.9,
    roughness: 0.2,
  });
  const coneMat = new THREE.MeshBasicMaterial({
    color: glowHex,
    transparent: true,
    opacity: 0.026,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.48, 8), poleMat);
  base.position.y = 0.24;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 4.7, 8), poleMat);
  shaft.position.y = 2.55;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.22, 8), poleMat);
  collar.position.y = 3.8;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.13, 1.35), poleMat);
  arm.position.set(0, 4.88, 0.55);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.58), bulbMat);
  head.position.set(0, 4.79, 1.02);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.15, 3.2, 12, 1, true), coneMat);
  cone.position.set(0, 3.15, 1.02);

  group.add(base, shaft, collar, arm, head, cone);
  return group;
}

export function buildHoloAwning(colorHex: number): THREE.Group {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x161920, roughness: 0.68, metalness: 0.75 });
  const neonMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 1.45,
    roughness: 0.25,
  });
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0x1e222a,
    roughness: 0.85,
    metalness: 0.35,
  });

  const canopy = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.16, 1.7), canopyMat);
  canopy.rotation.x = 0.22;
  const frontBar = new THREE.Mesh(new THREE.BoxGeometry(4.26, 0.1, 0.12), neonMat);
  frontBar.position.set(0, -0.15, 0.84);
  [-1.95, 0, 1.95].forEach((sx) => {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 1.72), frameMat);
    strut.position.set(sx, 0.04, 0);
    strut.rotation.x = 0.22;
    group.add(strut);
    if (sx !== 0) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 1.15), frameMat);
      brace.position.set(sx, -0.34, 0.38);
      brace.rotation.x = -0.65;
      group.add(brace);
    }
  });

  group.add(canopy, frontBar);
  return group;
}

export function buildVendingKiosk(accentHex = 0x22d3ee): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a2230, roughness: 0.54, metalness: 0.72 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x0c101a, roughness: 0.8, metalness: 0.32 });
  const screenMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 1.55,
    roughness: 0.18,
  });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.25, 0.88), bodyMat);
  hull.position.y = 1.125;
  hull.castShadow = true;
  const visorCap = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.18, 1.12), trimMat);
  visorCap.position.set(0, 2.28, 0.08);
  const display = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.1, 0.06), screenMat);
  display.position.set(0, 1.42, 0.44);
  const dispenser = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.36, 0.08), trimMat);
  dispenser.position.set(0, 0.45, 0.44);

  group.add(hull, visorCap, display, dispenser, createContactShadowDisc(0.95));
  return group;
}

export function buildPipeCluster(accentHex = 0xf59e0b): THREE.Group {
  const group = new THREE.Group();
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x262d3c, roughness: 0.38, metalness: 0.84 });
  const ringMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 1.35,
    roughness: 0.25,
  });

  [-0.32, 0, 0.32].forEach((ox, idx) => {
    const h = 3.4 + (idx % 2) * 0.9;
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, h, 10), pipeMat);
    pipe.position.set(ox, h / 2, 0);
    group.add(pipe);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.14, 10), ringMat);
    collar.position.set(ox, 1.4 + idx * 0.4, 0);
    group.add(collar);
  });

  const cross = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.24, 0.38), pipeMat);
  cross.position.set(0, 2.2, 0);
  group.add(cross, createContactShadowDisc(0.8));
  return group;
}

export function buildHangingVines(width = 4, drop = 4.5): THREE.Group {
  const group = new THREE.Group();
  const vineMat = new THREE.MeshStandardMaterial({
    color: 0x1b5e42,
    emissive: 0x10b981,
    emissiveIntensity: 0.18,
    roughness: 0.88,
  });
  const count = 4;
  for (let i = 0; i < count; i++) {
    const len = drop * (0.6 + ((i * 37) % 10) * 0.05);
    const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, len, 5), vineMat);
    strand.position.set(-width / 2 + (i + 0.5) * (width / count), -len / 2, 0);
    group.add(strand);
  }
  return group;
}

/**
 * Articulated sleek sci-fi recon android / mech chassis (Unit A-01).
 * Features tapered carapace armor, brushed metallic wear maps, hydraulic pistons,
 * sculpted angular visor cowl, compact dual-nozzle thruster pack, and arm-mounted rail carbine.
 * Forward faces -Z; rear faces +Z (towards third-person camera).
 */
export function buildPlayerRobot(palette: CosmeticPalette): PlayerRig {
  const group = new THREE.Group();
  const armorMaps = getRobotArmorMaps();

  const chassisMat = new THREE.MeshStandardMaterial({
    color: palette.chassisHex,
    roughness: 0.46,
    metalness: 0.82,
    roughnessMap: armorMaps.roughnessMap,
    normalMap: armorMaps.normalMap,
    normalScale: new THREE.Vector2(0.7, 0.7),
  });
  const darkFrameMat = new THREE.MeshStandardMaterial({
    color: 0x111520,
    roughness: 0.68,
    metalness: 0.52,
  });
  const gunmetalMat = new THREE.MeshStandardMaterial({
    color: 0x3b4458,
    roughness: 0.36,
    metalness: 0.88,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: palette.accentHex,
    emissive: palette.accentHex,
    emissiveIntensity: 1.25,
    roughness: 0.22,
    metalness: 0.5,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: palette.visorHex,
    emissive: palette.visorHex,
    emissiveIntensity: 2.1,
    roughness: 0.1,
    metalness: 0.2,
  });

  // === PELVIS & ARTICULATED WAIST SPINE ===
  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, 0.18, 8), darkFrameMat);
  pelvis.position.y = 0.77;
  group.add(pelvis);

  const hipBelt = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.09, 0.28), chassisMat);
  hipBelt.position.y = 0.82;
  group.add(hipBelt);

  // Ribbed hydraulic waist abdomen
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.16 - i * 0.01, 0.17, 0.06, 8), darkFrameMat);
    seg.position.y = 0.88 + i * 0.065;
    group.add(seg);
  }

  // Twin lateral abdominal hydraulic pistons
  [-0.14, 0.14].forEach((px) => {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.24, 6), gunmetalMat);
    rod.position.set(px, 0.96, 0.04);
    rod.rotation.z = px > 0 ? 0.12 : -0.12;
    group.add(rod);
  });

  // === V-TAPERED CHEST CARAPACE & SPINE ===
  const torsoCore = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.19, 0.44, 8), darkFrameMat);
  torsoCore.scale.set(1.12, 1, 0.72);
  torsoCore.position.y = 1.2;
  torsoCore.castShadow = true;
  group.add(torsoCore);

  // Angled left/right pectoral armor plates
  [-1, 1].forEach((side) => {
    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.26), chassisMat);
    chestPlate.position.set(side * 0.13, 1.24, -0.05);
    chestPlate.rotation.y = side * 0.22;
    chestPlate.rotation.x = -0.1;
    chestPlate.castShadow = true;
    group.add(chestPlate);

    const clavicle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.3), gunmetalMat);
    clavicle.position.set(side * 0.17, 1.4, 0);
    clavicle.rotation.z = side * -0.18;
    group.add(clavicle);
  });

  // Recessed Chest Reactor Lens (front -Z)
  const chestRing = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.05, 12), gunmetalMat);
  chestRing.rotation.x = Math.PI / 2;
  chestRing.position.set(0, 1.25, -0.18);
  const chestLens = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12), accentMat);
  chestLens.rotation.x = Math.PI / 2;
  chestLens.position.set(0, 1.25, -0.19);
  group.add(chestRing, chestLens);

  // Armored Spine Vertebrae along back (+Z, clearly seen in 3rd-person view)
  for (let i = 0; i < 4; i++) {
    const vert = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.055, 0.12), gunmetalMat);
    vert.position.set(0, 0.93 + i * 0.08, 0.14);
    vert.rotation.x = 0.2;
    group.add(vert);
  }

  // === SLEEK COMPACT DUAL-THRUSTER JUMP PACK ===
  const packHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.38, 6), chassisMat);
  packHousing.scale.set(1.2, 1, 0.65);
  packHousing.position.set(0, 1.23, 0.21);
  packHousing.rotation.x = 0.14;
  group.add(packHousing);

  // Thin vertical glowing power core cell recessed inside jump pack
  const backpackCore = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.05), accentMat);
  backpackCore.position.set(0, 1.23, 0.3);
  backpackCore.rotation.x = 0.14;
  group.add(backpackCore);

  // Twin angled radiator fins & vector nozzles
  [-0.14, 0.14].forEach((nx) => {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.14), gunmetalMat);
    fin.position.set(nx * 1.15, 1.28, 0.26);
    fin.rotation.y = nx > 0 ? -0.35 : 0.35;
    group.add(fin);

    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 0.12, 8), darkFrameMat);
    nozzle.position.set(nx, 1.03, 0.26);
    nozzle.rotation.x = -0.32;
    group.add(nozzle);
  });

  // Combined thruster plasma exhaust mesh (alpha controlled by sprint/dash)
  const thrusterFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.085, 0.36, 8),
    new THREE.MeshBasicMaterial({ color: palette.visorHex, transparent: true, opacity: 0.0 }),
  );
  thrusterFlame.rotation.x = Math.PI / 2 + 0.28;
  thrusterFlame.position.set(0, 0.96, 0.38);
  group.add(thrusterFlame);

  // Flexible braided hydraulic power hoses routing from jump pack into hip manifold
  [-0.13, 0.13].forEach((cx) => {
    const hoseCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(cx * 0.9, 1.38, 0.18),
      new THREE.Vector3(cx * 1.45, 1.15, 0.24),
      new THREE.Vector3(cx * 1.1, 0.84, 0.15),
    ]);
    const hose = new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 10, 0.022, 6, false), darkFrameMat);
    group.add(hose);
  });

  // === NECK ACTUATOR & SCULPTED VISOR HEAD ===
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.14, 8), darkFrameMat);
  neck.position.set(0, 1.48, 0);
  group.add(neck);

  const head = new THREE.Group();
  head.position.set(0, 1.54, 0);

  // Swept aerodynamic cranium shell
  const cranium = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.26, 8), chassisMat);
  cranium.scale.set(1.05, 1, 1.25);
  cranium.position.set(0, 0.14, 0.02);
  cranium.castShadow = true;
  head.add(cranium);

  // Angular brow overhang & jaw cheek armor
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 0.26), chassisMat);
  brow.position.set(0, 0.23, -0.09);
  brow.rotation.x = 0.18;
  head.add(brow);

  [-0.14, 0.14].forEach((cx) => {
    const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.24), gunmetalMat);
    cheek.position.set(cx, 0.1, -0.04);
    cheek.rotation.y = cx > 0 ? 0.22 : -0.22;
    head.add(cheek);
  });

  // Recessed black optical trench + dual glowing visor lenses (front -Z only)
  const visorTrench = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.09, 0.08), darkFrameMat);
  visorTrench.position.set(0, 0.14, -0.19);
  head.add(visorTrench);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.045, 0.05), visorMat);
  visor.position.set(0, 0.14, -0.215);
  head.add(visor);

  // Rear cranial armored heat-sink fins (no backwards eye bar)
  for (let r = -1; r <= 1; r++) {
    const sink = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.13, 0.08), gunmetalMat);
    sink.position.set(r * 0.055, 0.14, 0.21);
    head.add(sink);
  }

  // Sleek swept sensor comms antenna (single asymmetrical recon whip + ear receiver)
  const earPodL = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.06, 8), gunmetalMat);
  earPodL.rotation.z = Math.PI / 2;
  earPodL.position.set(-0.2, 0.15, 0.02);
  const antStem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.016, 0.3, 6), gunmetalMat);
  antStem.position.set(-0.21, 0.3, 0.07);
  antStem.rotation.x = -0.22;
  antStem.rotation.z = 0.14;
  const antTip = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), accentMat);
  antTip.position.set(-0.23, 0.44, 0.1);
  head.add(earPodL, antStem, antTip);

  group.add(head);

  // === ARTICULATED ARMS, PAULDRONS & RAIL-CARBINE ===
  const buildArm = (side: -1 | 1, withWeapon: boolean): THREE.Group => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.33, 1.37, 0);

    const shoulderBall = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), darkFrameMat);
    const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.24), chassisMat);
    pauldron.position.set(side * 0.04, 0.04, 0);
    pauldron.rotation.z = side * -0.28;

    const bicep = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.058, 0.26, 8), darkFrameMat);
    bicep.position.y = -0.15;

    const elbowJoint = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.11, 8), gunmetalMat);
    elbowJoint.rotation.z = Math.PI / 2;
    elbowJoint.position.y = -0.29;

    const gauntlet = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.055, 0.28, 8), chassisMat);
    gauntlet.position.set(0, -0.43, -0.04);
    gauntlet.rotation.x = 0.22;

    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.1), darkFrameMat);
    hand.position.set(0, -0.58, -0.07);

    arm.add(shoulderBall, pauldron, bicep, elbowJoint, gauntlet, hand);

    if (withWeapon) {
      // Multi-part Pulse Rail-Carbine integrated along right forearm
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.42), gunmetalMat);
      receiver.position.set(0.02, -0.46, -0.2);
      const shroud = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.075, 0.28), chassisMat);
      shroud.position.set(0.02, -0.44, -0.34);
      const railCore = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.36), accentMat);
      railCore.position.set(0.02, -0.43, -0.32);
      const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, 0.12, 8), darkFrameMat);
      muzzle.rotation.x = Math.PI / 2;
      muzzle.position.set(0.02, -0.45, -0.51);
      arm.add(receiver, shroud, railCore, muzzle);
    }
    return arm;
  };

  const leftArm = buildArm(-1, false);
  const rightArm = buildArm(1, true);
  group.add(leftArm, rightArm);

  // === ARTICULATED HYDRAULIC LEGS & SPLIT STABILIZER FEET ===
  const buildLeg = (side: -1 | 1): THREE.Group => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.16, 0.74, 0);

    const hipBall = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), darkFrameMat);

    // Armored thigh + exposed rear piston strut
    const thighFrame = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.34, 8), darkFrameMat);
    thighFrame.position.y = -0.18;
    const thighPlate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.14), chassisMat);
    thighPlate.position.set(side * 0.015, -0.17, -0.04);
    thighPlate.rotation.x = -0.06;
    thighPlate.castShadow = true;

    // Mechanical knee hinge + knee guard
    const kneeHinge = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.13, 8), gunmetalMat);
    kneeHinge.rotation.z = Math.PI / 2;
    kneeHinge.position.set(0, -0.36, 0);
    const kneeGuard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.11, 0.09), gunmetalMat);
    kneeGuard.position.set(0, -0.35, -0.08);
    kneeGuard.rotation.x = 0.25;

    // Tapered shin greave + calf thruster strut
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.055, 0.34, 8), chassisMat);
    shin.position.set(0, -0.53, 0.01);
    shin.rotation.x = -0.08;
    shin.castShadow = true;
    const calfTrim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.06), gunmetalMat);
    calfTrim.position.set(0, -0.52, 0.08);

    // Split mechanical foot + heel spur
    const footFront = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.22), darkFrameMat);
    footFront.position.set(0, -0.705, -0.04);
    const footHeel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.1), gunmetalMat);
    footHeel.position.set(0, -0.71, 0.08);

    leg.add(hipBall, thighFrame, thighPlate, kneeHinge, kneeGuard, shin, calfTrim, footFront, footHeel);
    return leg;
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);
  group.add(leftLeg, rightLeg);

  group.add(createContactShadowDisc(0.68));

  return {
    group,
    head,
    visorMat,
    chassisMat,
    accentMat,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    backpackCore,
    thrusterFlame,
  };
}

export function buildNpcRobot(accentHex: number, isArchitect = false): THREE.Group {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: isArchitect ? 0x241e3b : 0x262e3d,
    roughness: 0.42,
    metalness: 0.78,
  });
  const cloakMat = new THREE.MeshStandardMaterial({
    color: isArchitect ? 0x161226 : 0x181e28,
    roughness: 0.9,
    metalness: 0.08,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x3b4458,
    roughness: 0.35,
    metalness: 0.85,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 1.85,
    roughness: 0.18,
    metalness: 0.3,
  });

  // Lower weathered synth-fabric cloak & mechanical legs glimpse
  const cloakLower = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.44, 0.82, 10), cloakMat);
  cloakLower.position.y = 0.42;
  cloakLower.castShadow = true;
  group.add(cloakLower);

  // Draped shoulder mantle & utility belt
  const mantle = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.28, 0.56, 10), cloakMat);
  mantle.position.y = 1.12;
  mantle.castShadow = true;
  group.add(mantle);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.08, 10), trimMat);
  belt.position.y = 0.84;
  group.add(belt);

  // Asymmetrical travel pack + antenna
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.22), bodyMat);
  pack.position.set(0, 1.14, -0.24);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.44, 6), trimMat);
  ant.position.set(0.14, 1.48, -0.26);
  group.add(pack, ant);

  // Hooded sensor head with glowing cyclops optic cluster
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.32, 8), cloakMat);
  hood.position.set(0, 1.66, 0);
  const faceplate = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.24, 10), bodyMat);
  faceplate.position.set(0, 1.65, 0.04);
  const optic = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 12), glowMat);
  optic.rotation.x = Math.PI / 2;
  optic.position.set(0, 1.67, 0.19);
  const subOptic = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), glowMat);
  subOptic.position.set(0.09, 1.61, 0.18);
  group.add(hood, faceplate, optic, subOptic);

  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.024, 8, 24), glowMat);
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 2.15;
  halo.name = 'npcHalo';
  group.add(halo);

  group.add(createContactShadowDisc(0.75));
  return group;
}

export function buildEnemyMesh(archetype: EnemyArchetype): EnemyRig {
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);
  const hitMaterials: THREE.MeshStandardMaterial[] = [];

  const mkMat = (color: number, roughness: number, metalness: number, emissive = 0x000000, emissiveInt = 0) => {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      emissive,
      emissiveIntensity: emissiveInt,
    });
    hitMaterials.push(m);
    return m;
  };

  let telegraphRadius = 1.1;

  if (archetype === 'stalker') {
    // Sleek angular quadrupedal hunter-hound mech
    const hull = mkMat(0x1f2430, 0.45, 0.82);
    const blade = mkMat(0x475569, 0.28, 0.88);
    const frame = mkMat(0x11151d, 0.72, 0.45);
    const eye = mkMat(0xef4444, 0.15, 0.2, 0xef4444, 2.2);

    const chassis = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 1.08, 6), hull);
    chassis.rotation.x = Math.PI / 2;
    chassis.position.y = 0.74;
    chassis.castShadow = true;
    bodyGroup.add(chassis);

    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 0.44, 6), hull);
    snout.rotation.x = Math.PI / 2 + 0.18;
    snout.position.set(0, 0.84, 0.66);
    bodyGroup.add(snout);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.06), eye);
    visor.position.set(0, 0.87, 0.84);
    bodyGroup.add(visor);

    // Twin dorsal cooling fins
    [-0.1, 0.1].forEach((fx) => {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.36, 0.48), blade);
      fin.position.set(fx, 1.02, -0.08);
      fin.rotation.x = -0.35;
      bodyGroup.add(fin);
    });

    // Articulated upper/lower quadruped legs
    [
      [-0.3, 0.42, -1],
      [0.3, 0.42, 1],
      [-0.32, -0.42, -1],
      [0.32, -0.42, 1],
    ].forEach(([lx, lz, side]) => {
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.14), hull);
      upper.position.set(lx, 0.56, lz);
      upper.rotation.x = -0.25;
      upper.rotation.z = side * -0.14;
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.42, 6), frame);
      lower.position.set(lx * 1.08, 0.22, lz - 0.05);
      lower.rotation.x = 0.22;
      bodyGroup.add(upper, lower);
    });
  } else if (archetype === 'sentinel') {
    const hull = mkMat(0x202738, 0.35, 0.85);
    const wingMat = mkMat(0x111622, 0.65, 0.45);
    const core = mkMat(0xf59e0b, 0.15, 0.2, 0xf59e0b, 2.1);

    const sphere = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), hull);
    sphere.position.y = 1.65;
    sphere.castShadow = true;
    bodyGroup.add(sphere);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.045, 6, 18), wingMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 1.65;
    bodyGroup.add(collar);

    const optic = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.16, 12), core);
    optic.rotation.x = Math.PI / 2;
    optic.position.set(0, 1.65, 0.38);
    bodyGroup.add(optic);

    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2 + Math.PI / 4;
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.62, 0.32), wingMat);
      wing.position.set(Math.cos(ang) * 0.58, 1.72, Math.sin(ang) * 0.58);
      wing.rotation.y = -ang;
      bodyGroup.add(wing);
    }
    telegraphRadius = 1.25;
  } else if (archetype === 'enforcer') {
    const hull = mkMat(0x272233, 0.42, 0.8);
    const trim = mkMat(0xa855f7, 0.2, 0.3, 0xa855f7, 1.8);
    const dark = mkMat(0x12151e, 0.72, 0.4);

    // Twin heavy articulated hydraulic legs
    [-0.28, 0.28].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.88, 8), dark);
      leg.position.set(lx, 0.44, 0);
      bodyGroup.add(leg);
    });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.42, 0.96, 8), hull);
    torso.scale.set(1.1, 1, 0.75);
    torso.position.y = 1.38;
    torso.castShadow = true;
    bodyGroup.add(torso);

    [-0.58, 0.58].forEach((px) => {
      const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.52), hull);
      pauldron.position.set(px, 1.72, 0);
      pauldron.rotation.z = px > 0 ? -0.24 : 0.24;
      bodyGroup.add(pauldron);
    });

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.09, 0.1), trim);
    visor.position.set(0, 1.78, 0.38);
    bodyGroup.add(visor);

    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x9333ea,
      emissiveIntensity: 1.05,
      transparent: true,
      opacity: 0.42,
      roughness: 0.15,
      side: THREE.DoubleSide,
    });
    const shieldMesh = new THREE.Mesh(new THREE.BoxGeometry(1.38, 1.55, 0.08), shieldMat);
    shieldMesh.position.set(0, 1.25, 0.68);
    bodyGroup.add(shieldMesh);

    const telegraphRing = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.4, 24),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0, side: THREE.DoubleSide }),
    );
    telegraphRing.rotation.x = -Math.PI / 2;
    telegraphRing.position.y = 0.05;
    group.add(telegraphRing);
    group.add(createContactShadowDisc(1.1));
    return { group, bodyGroup, hitMaterials, telegraphRing, shieldMesh };
  } else {
    const hull = mkMat(0x1f1a33, 0.32, 0.86);
    const crystal = mkMat(0xc084fc, 0.12, 0.2, 0xa855f7, 2.3);
    const gold = mkMat(0xf59e0b, 0.28, 0.84);

    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0), crystal);
    core.position.y = 2.25;
    bodyGroup.add(core);

    const mantle = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.62, 1.4, 8), hull);
    mantle.position.y = 1.42;
    mantle.castShadow = true;
    bodyGroup.add(mantle);

    const haloGroup = new THREE.Group();
    haloGroup.position.y = 2.25;
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.06, 8, 28), gold);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.045, 8, 28), crystal);
    ring2.rotation.x = Math.PI / 3;
    haloGroup.add(ring1, ring2);
    bodyGroup.add(haloGroup);

    const telegraphRing = new THREE.Mesh(
      new THREE.RingGeometry(1.5, 2.0, 32),
      new THREE.MeshBasicMaterial({ color: 0xec4899, transparent: true, opacity: 0, side: THREE.DoubleSide }),
    );
    telegraphRing.rotation.x = -Math.PI / 2;
    telegraphRing.position.y = 0.06;
    group.add(telegraphRing);
    group.add(createContactShadowDisc(1.45));
    return { group, bodyGroup, hitMaterials, telegraphRing, haloGroup };
  }

  const telegraphRing = new THREE.Mesh(
    new THREE.RingGeometry(telegraphRadius * 0.8, telegraphRadius, 24),
    new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0, side: THREE.DoubleSide }),
  );
  telegraphRing.rotation.x = -Math.PI / 2;
  telegraphRing.position.y = 0.05;
  group.add(telegraphRing);
  group.add(createContactShadowDisc(0.85));

  return { group, bodyGroup, hitMaterials, telegraphRing };
}

export function rarityToHex(rarity: Rarity): number {
  switch (rarity) {
    case 'Legendary':
      return 0xf59e0b;
    case 'Epic':
      return 0xa855f7;
    case 'Rare':
      return 0x10b981;
    default:
      return 0x06b6d4;
  }
}

export function buildLootChest(rarity: Rarity): ChestRig {
  const group = new THREE.Group();
  const hex = rarityToHex(rarity);

  const housingMat = new THREE.MeshStandardMaterial({
    color: 0x1b2230,
    roughness: 0.48,
    metalness: 0.76,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.28,
    metalness: 0.88,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: hex,
    emissive: hex,
    emissiveIntensity: 1.85,
    roughness: 0.18,
    metalness: 0.2,
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.52, 0.78), housingMat);
  base.position.y = 0.26;
  base.castShadow = true;
  group.add(base);

  const band = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.14, 0.84), trimMat);
  band.position.y = 0.48;
  group.add(band);

  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.86), glowMat);
  strip.position.y = 0.44;
  group.add(strip);

  const lidGroup = new THREE.Group();
  lidGroup.position.set(0, 0.54, -0.38);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.22, 0.78), housingMat);
  lid.position.set(0, 0.11, 0.38);
  const lidBevel = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.1, 0.52), glowMat);
  lidBevel.position.set(0, 0.24, 0.38);
  lidGroup.add(lid, lidBevel);
  group.add(lidGroup);

  group.add(createContactShadowDisc(0.95));

  return { group, lidGroup, glowMat };
}

export function buildTerminal(accentHex = 0xa855f7): THREE.Group {
  const group = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.5, metalness: 0.78 });
  const screenMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 1.8,
    roughness: 0.18,
    metalness: 0.2,
  });

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.56, 0.24, 8), baseMat);
  plinth.position.y = 0.12;
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.15, 0.24), baseMat);
  stem.position.y = 0.75;
  const consoleHead = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.52, 0.12), baseMat);
  consoleHead.position.set(0, 1.38, 0.08);
  consoleHead.rotation.x = -0.45;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.4), screenMat);
  screen.position.set(0, 1.41, 0.13);
  screen.rotation.x = -0.45;

  group.add(plinth, stem, consoleHead, screen, createContactShadowDisc(0.7));
  return group;
}

export function buildForestTree(scale = 1, glowHex = 0x4ade80): THREE.Group {
  const group = new THREE.Group();
  const planterMat = new THREE.MeshStandardMaterial({ color: 0x1a2334, roughness: 0.52, metalness: 0.76 });
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x261e1a, roughness: 0.92, metalness: 0.05 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x155e3f, roughness: 0.78, metalness: 0.06 });
  const mossMat = new THREE.MeshStandardMaterial({
    color: 0x2cb67d,
    emissive: glowHex,
    emissiveIntensity: 0.35,
    roughness: 0.65,
  });

  const planter = new THREE.Mesh(new THREE.CylinderGeometry(1.15 * scale, 1.3 * scale, 0.45, 6), planterMat);
  planter.position.y = 0.225;
  group.add(planter);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * scale, 0.46 * scale, 4.4 * scale, 7), barkMat);
  trunk.position.y = 2.3 * scale;
  trunk.castShadow = true;
  group.add(trunk);

  const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.11 * scale, 0.19 * scale, 2.1 * scale, 6), barkMat);
  branch.position.set(0.65 * scale, 3.3 * scale, 0.35 * scale);
  branch.rotation.z = -0.58;
  branch.rotation.x = 0.35;
  group.add(branch);

  const c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.05 * scale, 1), leafMat);
  c1.position.set(0, 4.8 * scale, 0);
  c1.scale.y = 0.68;
  c1.castShadow = true;

  const c2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.38 * scale, 1), mossMat);
  c2.position.set(1.15 * scale, 4.15 * scale, 0.7 * scale);
  c2.scale.y = 0.65;

  const c3 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.32 * scale, 1), leafMat);
  c3.position.set(-1.05 * scale, 4.35 * scale, -0.58 * scale);
  c3.scale.y = 0.72;

  const tendrilGeo = new THREE.CylinderGeometry(0.04 * scale, 0.07 * scale, 1.45 * scale, 5);
  [-0.9, 0.85, 0.2].forEach((tx, idx) => {
    const t = new THREE.Mesh(tendrilGeo, mossMat);
    t.position.set(tx * scale, 3.25 * scale, (idx - 1) * 0.55 * scale);
    group.add(t);
  });

  group.add(c1, c2, c3);
  return group;
}

export function buildSkyTrain(): THREE.Group {
  const train = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x1a2230, roughness: 0.32, metalness: 0.88 });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.75,
    roughness: 0.2,
  });
  const winMat = new THREE.MeshStandardMaterial({
    color: 0xc084fc,
    emissive: 0xa855f7,
    emissiveIntensity: 1.45,
    roughness: 0.15,
  });

  [-9, 0, 9].forEach((offsetX, idx) => {
    const car = new THREE.Mesh(new THREE.BoxGeometry(7.8, 1.8, 2.2), hullMat);
    car.position.x = offsetX;
    train.add(car);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.36, 2.26), idx === 1 ? winMat : trimMat);
    stripe.position.set(offsetX, 0.18, 0);
    train.add(stripe);

    const undercarriage = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.45, 1.5), hullMat);
    undercarriage.position.set(offsetX, -1.05, 0);
    train.add(undercarriage);
  });

  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.6, 6), hullMat);
  nose.rotation.z = -Math.PI / 2;
  nose.position.x = 14.2;
  train.add(nose);

  return train;
}

export function buildMaintenancePod(): THREE.Group {
  const group = new THREE.Group();
  const shellMat = new THREE.MeshStandardMaterial({ color: 0x1e2534, roughness: 0.46, metalness: 0.78 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.45,
    roughness: 0.2,
  });

  const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.7, 0.22, 16), shellMat);
  pad.position.y = 0.11;
  group.add(pad);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.06, 8, 28), glowMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.24;
  group.add(ring);

  for (let i = -2; i <= 2; i++) {
    const ang = (i * Math.PI) / 6;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.2, 0.36), shellMat);
    rib.position.set(Math.sin(ang) * 2.1, 1.6, Math.cos(ang) * 2.1);
    rib.rotation.y = ang;
    rib.rotation.x = -0.15;
    group.add(rib);
  }

  const canopy = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 0.3, 12, 1, false, -Math.PI * 0.4, Math.PI * 0.8), shellMat);
  canopy.position.set(0, 3.2, 0.6);
  group.add(canopy);

  return group;
}
