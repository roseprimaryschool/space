export type TileShape = 'straight' | 'corner' | 'tee' | 'cross' | 'source' | 'sink';

export interface CircuitTile {
  row: number;
  col: number;
  shape: TileShape;
  rotation: number; // 0, 1, 2, 3 (x 90deg clockwise)
  locked?: boolean;
  powered: boolean;
}

export interface CircuitPuzzle {
  id: string;
  title: string;
  subtitle: string;
  size: number;
  tiles: CircuitTile[][];
  moves: number;
  solved: boolean;
  targetType: 'gate' | 'foundry_lift' | 'citadel_bridge' | 'chest';
  targetId: string;
}

// Directions: 0=North, 1=East, 2=South, 3=West
const BASE_PORTS: Record<TileShape, number[]> = {
  straight: [0, 2],
  corner: [0, 1],
  tee: [0, 1, 3],
  cross: [0, 1, 2, 3],
  source: [1], // points East at rotation 0
  sink: [3],   // receives from West at rotation 0
};

export function getOpenPorts(shape: TileShape, rotation: number): number[] {
  const r = ((rotation % 4) + 4) % 4;
  return BASE_PORTS[shape].map((dir) => (dir + r) % 4);
}

const DR = [-1, 0, 1, 0];
const DC = [0, 1, 0, -1];

export function evaluateCircuitPower(tiles: CircuitTile[][]): { tiles: CircuitTile[][]; solved: boolean } {
  const size = tiles.length;
  const next = tiles.map((row) => row.map((t) => ({ ...t, powered: false })));

  // Find source at (0, 0)
  const queue: Array<[number, number]> = [];
  next[0][0].powered = true;
  queue.push([0, 0]);

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const current = next[r][c];
    const ports = getOpenPorts(current.shape, current.rotation);

    for (const dir of ports) {
      const nr = r + DR[dir];
      const nc = c + DC[dir];
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      const neighbor = next[nr][nc];
      if (neighbor.powered) continue;
      const opposite = (dir + 2) % 4;
      const neighborPorts = getOpenPorts(neighbor.shape, neighbor.rotation);
      if (neighborPorts.includes(opposite)) {
        neighbor.powered = true;
        queue.push([nr, nc]);
      }
    }
  }

  const sink = next[size - 1][size - 1];
  return { tiles: next, solved: sink.powered };
}

export function rotateCircuitTile(puzzle: CircuitPuzzle, row: number, col: number): CircuitPuzzle {
  if (puzzle.solved) return puzzle;
  const tile = puzzle.tiles[row]?.[col];
  if (!tile || tile.locked) return puzzle;

  const cloned = puzzle.tiles.map((r) => r.map((t) => ({ ...t })));
  cloned[row][col].rotation = (cloned[row][col].rotation + 1) % 4;
  const evaluated = evaluateCircuitPower(cloned);

  return {
    ...puzzle,
    tiles: evaluated.tiles,
    moves: puzzle.moves + 1,
    solved: evaluated.solved,
  };
}

export function createCircuitPuzzle(params: {
  id: string;
  title: string;
  subtitle: string;
  size?: number;
  hackBonus?: number;
  targetType: CircuitPuzzle['targetType'];
  targetId: string;
}): CircuitPuzzle {
  const size = params.size ?? 4;
  const hackBonus = params.hackBonus ?? 0;

  // Deterministic guaranteed-solvable lattice path from (0,0) -> (size-1, size-1)
  // Path goes right across top-ish or zig-zag down-right
  const solutionShapes: Array<Array<{ shape: TileShape; solRot: number }>> = [];
  for (let r = 0; r < size; r++) {
    const rowArr: Array<{ shape: TileShape; solRot: number }> = [];
    for (let c = 0; c < size; c++) {
      rowArr.push({ shape: (r + c) % 2 === 0 ? 'corner' : 'straight', solRot: 0 });
    }
    solutionShapes.push(rowArr);
  }

  // Construct an explicit clean path from (0,0) East -> (0,1) -> (1,1) -> (1,2) -> ... -> (size-1, size-1)
  const path: Array<[number, number]> = [[0, 0]];
  let cr = 0;
  let cc = 0;
  while (cr < size - 1 || cc < size - 1) {
    if (cc < size - 1 && (cr === cc || cr === size - 1)) {
      cc++;
    } else if (cr < size - 1) {
      cr++;
    } else {
      cc++;
    }
    path.push([cr, cc]);
  }

  const dirBetween = (a: [number, number], b: [number, number]): number => {
    if (b[0] < a[0]) return 0;
    if (b[1] > a[1]) return 1;
    if (b[0] > a[0]) return 2;
    return 3;
  };

  for (let i = 0; i < path.length; i++) {
    const [r, c] = path[i];
    if (i === 0) {
      const outDir = dirBetween(path[0], path[1]);
      // source base port is [1] (East)
      solutionShapes[r][c] = { shape: 'source', solRot: (outDir - 1 + 4) % 4 };
    } else if (i === path.length - 1) {
      const inDir = dirBetween(path[i], path[i - 1]);
      // sink base port is [3] (West)
      solutionShapes[r][c] = { shape: 'sink', solRot: (inDir - 3 + 4) % 4 };
    } else {
      const prevDir = dirBetween(path[i], path[i - 1]);
      const nextDir = dirBetween(path[i], path[i + 1]);
      const pair = [prevDir, nextDir].sort((a, b) => a - b);
      if (pair[1] - pair[0] === 2) {
        // straight: base [0, 2]
        solutionShapes[r][c] = { shape: 'straight', solRot: pair[0] % 2 };
      } else {
        // corner: base [0, 1] -> rotations: 0:[0,1], 1:[1,2], 2:[2,3], 3:[3,0]
        let solRot = 0;
        if (pair[0] === 0 && pair[1] === 1) solRot = 0;
        else if (pair[0] === 1 && pair[1] === 2) solRot = 1;
        else if (pair[0] === 2 && pair[1] === 3) solRot = 2;
        else solRot = 3; // [0, 3]
        solutionShapes[r][c] = { shape: 'corner', solRot };
      }
    }
  }

  // Scramble non-source/non-sink tiles along the path unless hackBonus locks early nodes
  const pathSet = new Set(path.map(([r, c]) => `${r},${c}`));
  const tiles: CircuitTile[][] = [];

  for (let r = 0; r < size; r++) {
    const row: CircuitTile[] = [];
    for (let c = 0; c < size; c++) {
      const spec = solutionShapes[r][c];
      const isSource = r === 0 && c === 0;
      const isSink = r === size - 1 && c === size - 1;
      const pathIdx = path.findIndex(([pr, pc]) => pr === r && pc === c);
      const preSolvedByHack = pathIdx > 0 && pathIdx <= hackBonus;
      const locked = isSource || isSink || preSolvedByHack;

      let rotation = spec.solRot;
      if (!locked) {
        if (pathSet.has(`${r},${c}`)) {
          // Ensure at least 1 or 2 rotations off the solution
          const offset = ((r * 3 + c * 5 + 1) % 3) + 1;
          rotation = (spec.solRot + offset) % 4;
        } else {
          rotation = (r + c * 2) % 4;
        }
      }

      row.push({
        row: r,
        col: c,
        shape: spec.shape,
        rotation,
        locked,
        powered: false,
      });
    }
    tiles.push(row);
  }

  // Ensure initial board is not already solved unless hackBonus solved everything
  let evaluated = evaluateCircuitPower(tiles);
  if (evaluated.solved) {
    const mid = path[Math.floor(path.length / 2)];
    const tile = tiles[mid[0]][mid[1]];
    if (!tile.locked) {
      tile.rotation = (tile.rotation + 1) % 4;
      evaluated = evaluateCircuitPower(tiles);
    }
  }

  return {
    id: params.id,
    title: params.title,
    subtitle: params.subtitle,
    size,
    tiles: evaluated.tiles,
    moves: 0,
    solved: evaluated.solved,
    targetType: params.targetType,
    targetId: params.targetId,
  };
}
