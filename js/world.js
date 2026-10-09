/* Grok Rides - the big free-roam world: terrain, regions, roads, buildings, props */
(function () {
  'use strict';
  const GR = window.GR, U = GR.U;
  const W = GR.W = {};
  const HALF = W.HALF = 1500, RES = W.RES = 6, N = W.N = 501;
  W.CITY = { x0: 350, x1: 950, z0: -400, z1: 300, h: 3 };
  W.TOWN = { x0: -650, x1: -250, z0: 250, z1: 650, h: 4 };
  W.LAKE = { x: -60, z: 100, rx: 200, rz: 150 };
  W.ICE = { x: 600, z: -1150, rx: 160, rz: 110, h: 8 };
  W.PEAK = { x: -850, z: -600, h: 230, s: 320 };
  W.AIR = { x0: 1120, x1: 1180, z0: 320, z1: 780, h: 5 };
  W.MESAS = [[0, 1320, 60, 38], [470, 940, 45, 30], [-720, 1120, 70, 44], [900, 1270, 55, 34], [-1050, 880, 50, 28], [-250, 1300, 40, 26], [1250, 1050, 60, 40]];
  const H = W.H = new Float32Array(N * N), RD = W.RD = new Float32Array(N * N).fill(999);

  function rectW(r, x, z, f) { const dx = Math.max(r.x0 - x, 0, x - r.x1), dz = Math.max(r.z0 - z, 0, z - r.z1); return U.smooth(f, 0, Math.hypot(dx, dz)); }
  function ellQ(e, x, z) { const dx = (x - e.x) / e.rx, dz = (z - e.z) / e.rz; return dx * dx + dz * dz; }
  W.ellQ = ellQ;
  // ---- base terrain (before roads) ----
  function baseH(x, z) {
    let h = 4 + 9 * U.fbm(x / 420 + 3, z / 420 - 7, 3);
    const wd = U.smooth(650, 850, z); // desert dunes
    if (wd > 0) h += wd * (5 * Math.sin(x / 38 + 3 * U.noise(x / 200, z / 200)) * Math.sin(z / 51) + 6 * U.fbm(x / 160, z / 160, 2));
    const wt = U.smooth(-700, -900, z); // tundra hills
    if (wt > 0) h += wt * 12 * U.fbm(x / 230 + 11, z / 230, 3);
    const dp = Math.hypot(x - W.PEAK.x, z - W.PEAK.z);
    h += W.PEAK.h * Math.exp(-(dp / W.PEAK.s) * (dp / W.PEAK.s)) + 30 * U.fbm(x / 140, z / 140, 3) * Math.exp(-(dp / 480) * (dp / 480));
    // second smaller mountains for scenery
    const d2 = Math.hypot(x + 1250, z + 1150); h += 140 * Math.exp(-(d2 / 260) * (d2 / 260));
    const d3 = Math.hypot(x - 1250, z + 400); h += 90 * Math.exp(-(d3 / 200) * (d3 / 200));
    // world rim hills
    const e = Math.max(Math.abs(x), Math.abs(z)); h += U.smooth(1260, 1490, e) * (110 + 40 * U.noise(x / 90, z / 90));
    // flat zones
    h = U.lerp(h, W.CITY.h, rectW(W.CITY, x, z, 90));
    h = U.lerp(h, W.TOWN.h, rectW(W.TOWN, x, z, 80));
    h = U.lerp(h, W.AIR.h, rectW(W.AIR, x, z, 80));
    const ql = ellQ(W.LAKE, x, z); if (ql < 1.6) h = U.lerp(h, -7 * (1 - ql) + 0.9, U.smooth(1.6, 1.0, ql));
    const qi = ellQ(W.ICE, x, z); if (qi < 1.5) h = U.lerp(h, W.ICE.h, U.smooth(1.5, 1.0, qi));
    return h;
  }
  W.baseH = baseH;

  // ---- road network ----
  const roads = W.roads = [];
  function road(name, corners, o) {
    o = o || {};
    const pts = U.roundPath(corners.map((p) => ({ x: p[0], z: p[1] })), o.r == null ? 30 : o.r, !!o.closed, 4);
    roads.push({ name, pts, hw: o.hw || 7, closed: !!o.closed, kind: o.kind || 'road', traffic: !!o.traffic });
  }
  road('Grok Highway', [[950, 300], [950, -400], [1000, -700], [800, -950], [350, -1000], [-100, -950], [-450, -800], [-420, -350], [-350, 0], [-450, 250], [-450, 650], [-500, 820], [-300, 1050], [200, 1150], [700, 1100], [1050, 900], [1050, 400]], { closed: true, r: 70, hw: 8, traffic: true });
  for (let x = 350; x <= 850; x += 100) road('City St', [[x, -400], [x, 300]], { r: 0, traffic: true });
  for (let z = -400; z <= 300; z += 100) road('City Ave', [[350, z], [950, z]], { r: 0, traffic: true });
  for (let x = -650; x <= -250; x += 100) if (x !== -450) road('Town St', [[x, 250], [x, 650]], { r: 0, traffic: true });
  for (let z = 250; z <= 650; z += 100) road('Town Ave', [[-650, z], [-250, z]], { r: 0, traffic: true });
  road('Lakeshore Rd', [[-250, 450], [-120, 340], [150, 330], [350, 250]], { r: 60, traffic: true });
  road('Marina Ln', [[-372, 130], [-290, 130]], { r: 0 });
  road('Airfield Rd', [[1050, 550], [1150, 550]], { r: 0 });
  road('Runway', [[1150, 330], [1150, 770]], { r: 0, hw: 16, kind: 'runway' });
  // mountain switchbacks
  (function () {
    const F = { x: -440, z: -470 }, P = W.PEAK, dx = P.x - F.x, dz = P.z - F.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, nx = -uz, nz = ux;
    const c = [[-421, -470]]; c.push([F.x - 30, F.z]);
    for (let k = 0; k <= 6; k++) { const a = k * 50, s = k === 0 ? 0 : (k % 2 ? 72 : -72); c.push([F.x - 30 + ux * a + nx * s, F.z + uz * a + nz * s]); }
    c.push([F.x - 30 + ux * 345, F.z + uz * 345]);
    W.SUMMIT = { x: c[c.length - 1][0], z: c[c.length - 1][1] };
    road('Grokmore Pass', c, { r: 26, hw: 7 });
  })();
  // tundra loop around the frozen lake
  (function () {
    const c = []; for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; c.push([W.ICE.x + Math.sin(a) * 235, W.ICE.z + Math.cos(a) * 165]); }
    road('Frostbite Loop', c, { closed: true, r: 0, hw: 7 });
  })();

  // ---- build height grid ----
  W.build = function () {
    for (let i = 0; i < N; i++) { const z = -HALF + i * RES; for (let j = 0; j < N; j++) H[i * N + j] = baseH(-HALF + j * RES, z); }
    // road heights from smoothed base terrain
    roads.forEach((r) => {
      const n = r.pts.length; let h = r.pts.map((p) => sampleRaw(p.x, p.z));
      for (let pass = 0; pass < 6; pass++) {
        const o = h.slice();
        for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let k = -6; k <= 6; k++) { let j = i + k; if (r.closed) j = (j + n) % n; else if (j < 0 || j >= n) continue; s += o[j]; c++; } h[i] = s / c; }
      }
      r.pts.forEach((p, i) => { p.y = h[i]; });
      r.pi = U.pathInfo(r.pts, r.closed);
    });
    const RH = new Float32Array(N * N), RW = new Float32Array(N * N).fill(999);
    roads.forEach((r) => {
      const p = r.pts, n = p.length, m = r.closed ? n : n - 1, R = r.hw + 26;
      for (let k = 0; k < m; k++) {
        const a = p[k], b = p[(k + 1) % n];
        const j0 = Math.max(0, Math.floor((Math.min(a.x, b.x) - R + HALF) / RES)), j1 = Math.min(N - 1, Math.ceil((Math.max(a.x, b.x) + R + HALF) / RES));
        const i0 = Math.max(0, Math.floor((Math.min(a.z, b.z) - R + HALF) / RES)), i1 = Math.min(N - 1, Math.ceil((Math.max(a.z, b.z) + R + HALF) / RES));
        const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1;
        for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
          const x = -HALF + j * RES, z = -HALF + i * RES;
          let t = ((x - a.x) * dx + (z - a.z) * dz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
          const d = Math.hypot(x - a.x - dx * t, z - a.z - dz * t) - r.hw, idx = i * N + j;
          if (d < RW[idx]) { RW[idx] = d; RH[idx] = a.y + (b.y - a.y) * t; }
        }
      }
    });
    for (let idx = 0; idx < N * N; idx++) {
      const d = RW[idx]; RD[idx] = d;
      if (d < 26) { const w = d <= 4 ? 1 : U.smooth(26, 4, d); H[idx] = U.lerp(H[idx], RH[idx], w); }
    }
    // flatten pads (markers / landmarks)
    W.pads.forEach((pd) => flatten(pd.x, pd.z, pd.r || 16));
  };
  function sampleRaw(x, z) { return baseH(x, z); }
  function flatten(x, z, r) {
    const h = W.height(x, z), R = r + 14;
    for (let i = Math.max(0, Math.floor((z - R + HALF) / RES)); i <= Math.min(N - 1, Math.ceil((z + R + HALF) / RES)); i++)
      for (let j = Math.max(0, Math.floor((x - R + HALF) / RES)); j <= Math.min(N - 1, Math.ceil((x + R + HALF) / RES)); j++) {
        const d = Math.hypot(-HALF + j * RES - x, -HALF + i * RES - z), w = U.smooth(R, r, d); const idx = i * N + j; H[idx] = U.lerp(H[idx], h, w);
      }
  }
  W.pads = [];
  function bil(A, x, z) {
    const fx = U.clamp((x + HALF) / RES, 0, N - 1.001), fz = U.clamp((z + HALF) / RES, 0, N - 1.001);
    const j = fx | 0, i = fz | 0, tx = fx - j, tz = fz - i, k = i * N + j;
    // match the terrain mesh triangulation (diagonal from (j+1,i) to (j,i+1))
    if (tx + tz <= 1) return A[k] + (A[k + 1] - A[k]) * tx + (A[k + N] - A[k]) * tz;
    return A[k + N + 1] + (A[k + N] - A[k + N + 1]) * (1 - tx) + (A[k + 1] - A[k + N + 1]) * (1 - tz);
  }
  W.height = (x, z) => bil(H, x, z);
  W.roadD = (x, z) => bil(RD, x, z);
  // the road mesh sits ROAD_LIFT above the terrain; wheels/feet use this so they sit ON the asphalt, not sunk into it
  W.ROAD_LIFT = 0.22;
  W.gy = (x, z) => { const h = bil(H, x, z), d = bil(RD, x, z); return d >= 0.6 ? h : h + W.ROAD_LIFT * U.smooth(0.6, 0, d); };
  W.normal = function (x, z, out) { const e = 2, hx = W.height(x + e, z) - W.height(x - e, z), hz = W.height(x, z + e) - W.height(x, z - e); out = out || {}; const l = Math.hypot(hx, 2 * e, hz); out.x = -hx / l; out.y = 2 * e / l; out.z = -hz / l; return out; };
  W.inRect = (r, x, z, m) => x > r.x0 - (m || 0) && x < r.x1 + (m || 0) && z > r.z0 - (m || 0) && z < r.z1 + (m || 0);

  // ---- regions + surfaces ----
  W.region = function (x, z) {
    if (W.inRect(W.CITY, x, z, 30)) return 'city';
    if (W.inRect(W.TOWN, x, z, 30)) return 'town';
    if (ellQ(W.LAKE, x, z) < 1.25) return 'lake';
    if (W.inRect(W.AIR, x, z, 90)) return 'airfield';
    if (Math.hypot(x - W.PEAK.x, z - W.PEAK.z) < 470) return 'mountain';
    if (z < -780) return 'tundra';
    if (z > 740) return 'desert';
    return 'country';
  };
  W.REGION_NAMES = { city: 'Grok City', town: 'Pine Hollow', lake: 'Sparkle Lake', airfield: 'Sky Field', mountain: 'Mount Grokmore', tundra: 'Frostbite Tundra', desert: 'Sizzle Desert', country: 'Countryside' };
  // 0 road, 1 grass, 2 sand, 3 snow, 4 ice, 5 water, 6 dirt
  W.SURF = [
    { n: 'road', grip: 1, spd: 1, rough: 0 }, { n: 'grass', grip: 0.85, spd: 0.8, rough: 0.5 }, { n: 'sand', grip: 0.72, spd: 0.68, rough: 0.8 },
    { n: 'snow', grip: 0.6, spd: 0.72, rough: 0.6 }, { n: 'ice', grip: 0.32, spd: 0.95, rough: 0 }, { n: 'water', grip: 0.5, spd: 0.3, rough: 0 }, { n: 'dirt', grip: 0.8, spd: 0.78, rough: 0.6 }];
  W.surface = function (x, z) {
    if (W.roadD(x, z) < 0.5) return 0;
    const h = W.height(x, z);
    if (ellQ(W.LAKE, x, z) < 1.05 && h < -0.4) return 5;
    if (ellQ(W.ICE, x, z) < 1) return 4;
    if (W.inRect(W.CITY, x, z, 20) || W.inRect(W.AIR, x, z, 30)) return 0;
    const dp = Math.hypot(x - W.PEAK.x, z - W.PEAK.z);
    if (dp < 470) return h > 150 ? 3 : 6;
    if (z < -780 || h > 120) return 3;
    if (z > 740) return 2;
    return 1;
  };
  W.waterDepth = (x, z) => (ellQ(W.LAKE, x, z) < 1.2 ? Math.max(0, -W.height(x, z)) : 0);

  // ---- colliders (spatial hash) ----
  const CELL = 50, GN = Math.ceil(3000 / CELL);
  const grid = W.cgrid = new Array(GN * GN);
  W.colliders = [];
  function cellsFor(x0, z0, x1, z1, fn) {
    const a = U.clamp(Math.floor((x0 + HALF) / CELL), 0, GN - 1), b = U.clamp(Math.floor((x1 + HALF) / CELL), 0, GN - 1);
    const c = U.clamp(Math.floor((z0 + HALF) / CELL), 0, GN - 1), d = U.clamp(Math.floor((z1 + HALF) / CELL), 0, GN - 1);
    for (let i = c; i <= d; i++) for (let j = a; j <= b; j++) fn(i * GN + j);
  }
  W.addBox = function (x0, z0, x1, z1, top, tag) { const c = { t: 'b', x0, z0, x1, z1, top, tag }; W.colliders.push(c); cellsFor(x0, z0, x1, z1, (k) => (grid[k] = grid[k] || []).push(c)); return c; };
  W.addCirc = function (x, z, r, top, tag) { const c = { t: 'c', x, z, r, top, tag }; W.colliders.push(c); cellsFor(x - r, z - r, x + r, z + r, (k) => (grid[k] = grid[k] || []).push(c)); return c; };
  W.near = function (x, z, r, out) {
    out = out || []; out.length = 0; const seen = W._seen = (W._seen || 0) + 1;
    cellsFor(x - r, z - r, x + r, z + r, (k) => { const a = grid[k]; if (a) for (let i = 0; i < a.length; i++) { const c = a[i]; if (c._s !== seen) { c._s = seen; out.push(c); } } });
    return out;
  };
  // is a spot free of buildings (for spawning props)
  W.blocked = function (x, z, r) { const a = W.near(x, z, r + 2); for (const c of a) { if (c.t === 'b') { if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return true; } else if (Math.hypot(x - c.x, z - c.z) < c.r + r) return true; } return false; };

  // nearest road point + heading (for resets / GPS)
  W.nearestRoad = function (x, z, skipRunway) {
    let best = null;
    roads.forEach((r) => { if (skipRunway && r.kind === 'runway') return; const q = U.pathNearest(r.pi, x, z, -1); if (!best || q.d < best.d) best = { d: q.d, s: q.s, r }; });
    const p = U.pathAt(best.r.pi, best.s); return { x: p.x, z: p.z, yaw: Math.atan2(p.dx, p.dz), d: best.d, road: best.r };
  };

  // ---- GPS graph (road nodes) ----
  W.buildGraph = function () {
    const nodes = []; const hash = new Map();
    const key = (x, z) => Math.floor(x / 14) + ',' + Math.floor(z / 14);
    roads.forEach((r) => {
      const ids = []; for (let i = 0; i < r.pts.length; i += 3) { const p = r.pts[i]; ids.push(nodes.length); nodes.push({ x: p.x, z: p.z, e: [] }); }
      if (!r.closed) { const p = r.pts[r.pts.length - 1]; ids.push(nodes.length); nodes.push({ x: p.x, z: p.z, e: [] }); }
      for (let i = 0; i < ids.length - 1; i++) link(ids[i], ids[i + 1]);
      if (r.closed) link(ids[ids.length - 1], ids[0]);
    });
    function link(a, b) { const d = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].z - nodes[b].z); nodes[a].e.push(b, d); nodes[b].e.push(a, d); }
    nodes.forEach((n, i) => { const k = key(n.x, n.z); if (!hash.has(k)) hash.set(k, []); hash.get(k).push(i); });
    nodes.forEach((n, i) => {
      const cx = Math.floor(n.x / 14), cz = Math.floor(n.z / 14);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const l = hash.get((cx + a) + ',' + (cz + b)); if (l) l.forEach((j) => { if (j > i && Math.hypot(nodes[j].x - n.x, nodes[j].z - n.z) < 13 && n.e.indexOf(j) < 0) link(i, j); }); }
    });
    W.gnodes = nodes;
  };
  W.route = function (x0, z0, x1, z1) {
    const nodes = W.gnodes; if (!nodes) return null;
    let a = -1, b = -1, da = 1e9, db = 1e9;
    nodes.forEach((n, i) => { const d1 = (n.x - x0) ** 2 + (n.z - z0) ** 2, d2 = (n.x - x1) ** 2 + (n.z - z1) ** 2; if (d1 < da) { da = d1; a = i; } if (d2 < db) { db = d2; b = i; } });
    if (Math.sqrt(da) > 120 || Math.sqrt(db) > 160) return null;
    const dist = new Float64Array(nodes.length).fill(Infinity), prev = new Int32Array(nodes.length).fill(-1), done = new Uint8Array(nodes.length);
    const heap = [[0, a]]; dist[a] = 0;
    while (heap.length) {
      // binary heap pop
      const top = heap[0], last = heap.pop();
      if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[i], heap[m]] = [heap[m], heap[i]]; i = m; } }
      const u = top[1]; if (done[u]) continue; done[u] = 1; if (u === b) break;
      const e = nodes[u].e;
      for (let k = 0; k < e.length; k += 2) { const v = e[k], nd = dist[u] + e[k + 1]; if (nd < dist[v]) { dist[v] = nd; prev[v] = u; heap.push([nd, v]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[i], heap[p]] = [heap[p], heap[i]]; i = p; } } }
    }
    if (!isFinite(dist[b])) return null;
    const out = [{ x: x1, z: z1 }]; for (let u = b; u >= 0; u = prev[u]) out.push({ x: nodes[u].x, z: nodes[u].z }); out.push({ x: x0, z: z0 });
    return out.reverse();
  };
})();
