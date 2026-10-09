/* Grok Rides - shared helpers */
(function () {
  'use strict';
  const GR = window.GR = window.GR || {};
  const U = GR.U = {};
  U.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.smooth = (e0, e1, x) => { const t = U.clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  U.ang = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
  U.dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
  U.rng = function (seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  // value noise
  function hash(ix, iz) { let h = (ix * 374761393 + iz * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  U.noise = function (x, z) {
    const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
    const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
    const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
    return (a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz) * 2 - 1;
  };
  U.fbm = (x, z, o) => { let s = 0, a = 1, f = 1, n = 0; for (let i = 0; i < (o || 3); i++) { s += U.noise(x * f + i * 17.3, z * f - i * 9.1) * a; n += a; a *= 0.5; f *= 2; } return s / n; };

  // Rounded polyline through corner points (each corner gets a circular-ish fillet)
  U.roundPath = function (pts, radius, closed, step) {
    step = step || 4; const out = [];
    const n = pts.length;
    const P = (i) => pts[(i + n) % n];
    function pushLine(ax, az, bx, bz) {
      const L = Math.hypot(bx - ax, bz - az), k = Math.max(1, Math.ceil(L / step));
      for (let i = 0; i < k; i++) out.push({ x: ax + (bx - ax) * i / k, z: az + (bz - az) * i / k });
    }
    const segs = [];
    for (let i = 0; i < n; i++) {
      if (!closed && (i === 0 || i === n - 1)) { segs.push({ inx: P(i).x, inz: P(i).z, outx: P(i).x, outz: P(i).z, c: null }); continue; }
      const a = P(i - 1), b = P(i), c = P(i + 1);
      const l1 = Math.hypot(b.x - a.x, b.z - a.z), l2 = Math.hypot(c.x - b.x, c.z - b.z);
      const r = Math.min(radius, l1 * 0.45, l2 * 0.45);
      segs.push({ inx: b.x + (a.x - b.x) / l1 * r, inz: b.z + (a.z - b.z) / l1 * r, outx: b.x + (c.x - b.x) / l2 * r, outz: b.z + (c.z - b.z) / l2 * r, c: b });
    }
    const m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) {
      const s = segs[i], t = segs[(i + 1) % n];
      // fillet at s (quadratic bezier in -> corner -> out)
      if (s.c) { const L = Math.hypot(s.outx - s.inx, s.outz - s.inz) + 1, k = Math.max(2, Math.ceil(L / step)); for (let j = 0; j < k; j++) { const u = j / k, iu = 1 - u; out.push({ x: iu * iu * s.inx + 2 * iu * u * s.c.x + u * u * s.outx, z: iu * iu * s.inz + 2 * iu * u * s.c.z + u * u * s.outz }); } }
      pushLine(s.outx, s.outz, t.inx, t.inz);
    }
    if (!closed) out.push({ x: P(n - 1).x, z: P(n - 1).z });
    return out;
  };
  // polyline with cumulative length + tangents
  U.pathInfo = function (pts, closed) {
    const L = [0]; let tot = 0;
    for (let i = 1; i < pts.length; i++) { tot += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); L.push(tot); }
    const loop = closed ? Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].z - pts[pts.length - 1].z) : 0;
    return { pts, L, len: tot + loop, closed: !!closed };
  };
  // point at distance s along path
  U.pathAt = function (pi, s) {
    const p = pi.pts, n = p.length;
    if (pi.closed) { s = ((s % pi.len) + pi.len) % pi.len; } else s = U.clamp(s, 0, pi.len);
    let lo = 0, hi = n - 1;
    if (s >= pi.L[n - 1]) { const a = p[n - 1], b = pi.closed ? p[0] : p[n - 1]; const sl = pi.len - pi.L[n - 1] || 1, t = (s - pi.L[n - 1]) / sl; return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, dx: (b.x - a.x) / sl, dz: (b.z - a.z) / sl, i: n - 1 }; }
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (pi.L[m] <= s) lo = m; else hi = m; }
    const a = p[lo], b = p[lo + 1], sl = (pi.L[lo + 1] - pi.L[lo]) || 1, t = (s - pi.L[lo]) / sl;
    return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, dx: (b.x - a.x) / sl, dz: (b.z - a.z) / sl, i: lo };
  };
  // nearest arc-length on path, searching near hint (or globally if hint < 0)
  U.pathNearest = function (pi, x, z, hint, win) {
    const p = pi.pts, n = p.length; let best = 1e18, bs = 0, bi = 0;
    let i0 = 0, i1 = pi.closed ? n : n - 1;
    if (hint != null && hint >= 0) { i0 = hint - (win || 30); i1 = hint + (win || 30); }
    for (let k = i0; k < i1; k++) {
      let i = k; if (pi.closed) i = ((k % n) + n) % n; else if (i < 0 || i >= n - 1) continue;
      const a = p[i], b = p[(i + 1) % n];
      const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1;
      let t = ((x - a.x) * dx + (z - a.z) * dz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = a.x + dx * t, pz = a.z + dz * t, d = (x - px) * (x - px) + (z - pz) * (z - pz);
      if (d < best) { best = d; bi = i; bs = (i === n - 1 ? pi.L[n - 1] : pi.L[i]) + Math.sqrt(l2) * t; }
    }
    return { s: bs, i: bi, d: Math.sqrt(best) };
  };

  // merge (non-indexed) BufferGeometries that carry position/normal and optional color/uv
  U.merge = function (geos) {
    let total = 0; const list = [];
    geos.forEach((g) => { if (!g) return; const gg = g.index ? g.toNonIndexed() : g; list.push(gg); total += gg.attributes.position.count; });
    const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3), uv = new Float32Array(total * 2);
    let o = 0, hasUv = false, hasCol = false;
    list.forEach((g) => {
      const c = g.attributes.position.count;
      pos.set(g.attributes.position.array, o * 3);
      if (!g.attributes.normal) g.computeVertexNormals();
      nor.set(g.attributes.normal.array, o * 3);
      if (g.attributes.color) { col.set(g.attributes.color.array, o * 3); hasCol = true; } else col.fill(1, o * 3, (o + c) * 3);
      if (g.attributes.uv) { uv.set(g.attributes.uv.array, o * 2); hasUv = true; }
      o += c;
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    if (hasCol) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (hasUv) out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.computeBoundingSphere();
    return out;
  };
  // paint a geometry with a solid vertex color (returns non-indexed geo)
  const _c = new THREE.Color();
  U.paint = function (g, color) {
    const gg = g.index ? g.toNonIndexed() : g; _c.set(color);
    const n = gg.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; }
    gg.setAttribute('color', new THREE.BufferAttribute(a, 3)); return gg;
  };
  // transform helper: returns geometry transformed by position/rotation/scale
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
  U.xf = function (g, x, y, z, rx, ry, rz, sx, sy, sz) {
    _e.set(rx || 0, ry || 0, rz || 0); _q.setFromEuler(_e); _v.set(x || 0, y || 0, z || 0); _s.set(sx == null ? 1 : sx, sy == null ? (sx == null ? 1 : sx) : sy, sz == null ? (sx == null ? 1 : sx) : sz);
    _m.compose(_v, _q, _s); g.applyMatrix4(_m); return g;
  };
  U.fmtMoney = (n) => '$' + Math.round(n).toLocaleString('en-US');
  U.fmtTime = (t) => { if (!(t >= 0) || t === Infinity) return '--:--'; const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); };
  U.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
})();
