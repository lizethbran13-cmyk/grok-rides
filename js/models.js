/* Grok Rides - smooth low-poly vehicle + people models (vertex-colored, merged) */
(function () {
  'use strict';
  const GR = window.GR, U = GR.U, T = THREE;
  const M = GR.M = {};
  const PI = Math.PI;
  // glossy car paint: PBR material + a small baked sky reflection (set up in M.initEnv once the renderer exists)
  M.mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.36, metalness: 0.1, envMapIntensity: 0.6 });
  M.matWheel = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.2, envMapIntensity: 0.6 });
  M.initEnv = function (renderer) {
    try {
      const sc = new T.Scene(), g = new T.SphereGeometry(10, 32, 16), c = [], p = g.attributes.position;
      const top = new T.Color('#5aa8ff'), hor = new T.Color('#f2f8ff'), gnd = new T.Color('#5d6b55');
      for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 10; const col = y > 0 ? hor.clone().lerp(top, Math.min(1, y * 1.6)) : hor.clone().lerp(gnd, Math.min(1, -y * 4)); c.push(col.r, col.g, col.b); }
      g.setAttribute('color', new T.Float32BufferAttribute(c, 3)); sc.add(new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide })));
      const sun = new T.Mesh(new T.SphereGeometry(1.4, 12, 8), new T.MeshBasicMaterial({ color: 0xffffff })); sun.position.set(5, 7.5, 3); sc.add(sun);
      const pm = new T.PMREMGenerator(renderer), rt = pm.fromScene(sc, 0.02); M.env = rt.texture; pm.dispose();
      M.mat.envMap = M.env; M.matWheel.envMap = M.env; M.mat.needsUpdate = M.matWheel.needsUpdate = true;
    } catch (e) { /* older GPUs: plain shading is fine */ }
  };
  // smooth shading across soft edges (< ~38 deg) but keep crisp creases: makes the low-poly bodies look rounded, not blocky
  M.autoSmooth = function (g, deg) {
    const pos = g.attributes.position, n = pos.count, cosT = Math.cos((deg || 38) * PI / 180);
    g.computeVertexNormals(); const fn = g.attributes.normal.array.slice(); // flat (non-indexed) face normals
    const key = (i) => Math.round(pos.getX(i) * 500) + ',' + Math.round(pos.getY(i) * 500) + ',' + Math.round(pos.getZ(i) * 500);
    const groups = new Map(); for (let i = 0; i < n; i++) { const k = key(i); let a = groups.get(k); if (!a) groups.set(k, (a = [])); a.push(i); }
    const out = g.attributes.normal.array;
    groups.forEach((a) => { for (const i of a) { let x = 0, y = 0, z = 0; for (const j of a) { const d = fn[i * 3] * fn[j * 3] + fn[i * 3 + 1] * fn[j * 3 + 1] + fn[i * 3 + 2] * fn[j * 3 + 2]; if (d >= cosT) { x += fn[j * 3]; y += fn[j * 3 + 1]; z += fn[j * 3 + 2]; } } const l = Math.hypot(x, y, z) || 1; out[i * 3] = x / l; out[i * 3 + 1] = y / l; out[i * 3 + 2] = z / l; } });
    g.attributes.normal.needsUpdate = true; return g;
  };
  // round the body in plan view (tapered nose/tail corners) and tuck the greenhouse in (tumblehome): no more shoebox cars
  M.sculpt = function (g, L, W, k) {
    const pos = g.attributes.position; let y0 = 1e9, y1 = -1e9; for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const hl = L / 2;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); if (Math.abs(x) < 0.05) continue;
      const zn = Math.min(1.15, Math.abs(z) / hl), yn = (y - y0) / Math.max(0.01, y1 - y0);
      const plan = 1 - k.plan * Math.pow(U.clamp((zn - k.start) / (1 - k.start), 0, 1.2), 2);
      const tum = 1 - k.tum * U.smooth(0.42, 1, yn) - 0.035 * U.smooth(0.12, 0, yn);
      pos.setX(i, x * plan * tum);
    }
    pos.needsUpdate = true; return g;
  };
  M.matMatte = new T.MeshLambertMaterial({ vertexColors: true });
  M.glow = new T.MeshBasicMaterial({ vertexColors: true });

  // shape DSL -> extruded, bevelled side profile.  u = forward, v = up; returns geometry with forward along +Z
  function shapeOf(cmds) {
    const s = new T.Shape();
    cmds.forEach((c) => { if (c[0] === 'm') s.moveTo(c[1], c[2]); else if (c[0] === 'l') s.lineTo(c[1], c[2]); else if (c[0] === 'q') s.quadraticCurveTo(c[1], c[2], c[3], c[4]); });
    return s;
  }
  function ext(cmds, width, bev, curve) {
    bev = bev == null ? 0.12 : bev;
    const depth = Math.max(0.01, width - bev * 2);
    const g = new T.ExtrudeGeometry(shapeOf(cmds), { depth, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev * 0.85, bevelSegments: 2, curveSegments: curve || 6, steps: 1 });
    g.translate(0, 0, -depth / 2); g.rotateY(-PI / 2); return g;
  }
  M.ext = ext;
  // plan-view extrude (shape in x/z plane, extruded upward)
  function plan(cmds, height, bev) {
    bev = bev == null ? 0.1 : bev;
    const g = new T.ExtrudeGeometry(shapeOf(cmds), { depth: Math.max(0.01, height - bev * 2), bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev * 0.85, bevelSegments: 2, curveSegments: 8, steps: 1 });
    g.rotateX(-PI / 2); g.translate(0, bev, 0); return g; // shape y -> -z ; so draw with y = -forward
  }
  const box = (w, h, d) => new T.BoxGeometry(w, h, d);
  const cyl = (r1, r2, h, s) => new T.CylinderGeometry(r1, r2, h, s || 12);
  const sph = (r, a, b) => new T.SphereGeometry(r, a || 12, b || 8);
  // rounded box via extrude of rounded rect (side profile) -> smooth
  function rbox(w, h, d, r) {
    r = Math.min(r == null ? 0.15 : r, h / 2 - 0.01, d / 2 - 0.01);
    // the extrude bevel grows the outline by bevelSize, so inset the profile by that much: the box now really is w x h x d
    // (before, every rounded part came out ~2*bevel too big and swallowed lights, stripes and windows next to it)
    const bev = Math.min(r, w / 4), sz = Math.min(bev * 0.85, h / 2 - 0.005, d / 2 - 0.005), rr = Math.max(0.002, r - sz);
    const x0 = -d / 2 + sz, x1 = d / 2 - sz, y0 = -h / 2 + sz, y1 = h / 2 - sz, q = Math.min(rr, (x1 - x0) / 2 - 0.001, (y1 - y0) / 2 - 0.001);
    return ext([['m', x0 + q, y0], ['l', x1 - q, y0], ['q', x1, y0, x1, y0 + q], ['l', x1, y1 - q], ['q', x1, y1, x1 - q, y1], ['l', x0 + q, y1], ['q', x0, y1, x0, y1 - q], ['l', x0, y0 + q], ['q', x0, y0, x0 + q, y0]], w, bev, 4);
  }
  M.rbox = rbox;

  // part collector: parts tagged 'paint' get recolored
  function Kit() { this.parts = []; }
  Kit.prototype.add = function (g, color, x, y, z, rx, ry, rz, sx, sy, sz) { U.xf(g, x, y, z, rx, ry, rz, sx, sy, sz); this.parts.push({ g, color }); return this; };
  Kit.prototype.mirror = function (gfn, color, x, y, z, rx, ry, rz) { this.add(gfn(), color, x, y, z, rx, ry, rz); this.add(gfn(), color, -x, y, z, rx, -(ry || 0), -(rz || 0)); return this; };
  Kit.prototype.build = function (paint, accent) {
    const gs = [], ranges = []; let o = 0;
    this.parts.forEach((p) => {
      const col = p.color === 'paint' ? paint : p.color === 'accent' ? (accent || '#ffffff') : p.color;
      const g = U.paint(p.g, col); const n = g.attributes.position.count;
      if (p.color === 'paint') ranges.push([o, n]); if (p.color === 'accent') ranges.push([o, n, 1]);
      o += n; gs.push(g);
    });
    const geo = U.merge(gs); geo.userData.paint = ranges; return geo;
  };
  M.repaint = function (mesh, color, accent) {
    const g = mesh.geometry, c = new T.Color(color), ca = new T.Color(accent || '#ffffff'), a = g.attributes.color.array;
    (g.userData.paint || []).forEach((r) => { const cc = r[2] ? ca : c; for (let i = r[0]; i < r[0] + r[1]; i++) { a[i * 3] = cc.r; a[i * 3 + 1] = cc.g; a[i * 3 + 2] = cc.b; } });
    g.attributes.color.needsUpdate = true;
  };

  const TIRE = '#222428', RIM = '#c9ced8', GLASS = '#1d2b4a', DARK = '#2b2d33', CHROME = '#e6e9ef', HEAD = '#fff6c8', TAIL = '#ff2a3a';
  const wheelCache = {};
  function wheelGeo(r, w) {
    const k = r + '_' + w; if (wheelCache[k]) return wheelCache[k];
    const t = U.paint(cyl(r, r, w, 18).rotateZ(PI / 2), TIRE);
    const t2 = U.paint(new T.TorusGeometry(r * 0.82, r * 0.18, 6, 18).rotateY(PI / 2), TIRE);
    const rim = U.paint(cyl(r * 0.6, r * 0.6, w + 0.04, 12).rotateZ(PI / 2), RIM);
    const hub = U.paint(cyl(r * 0.22, r * 0.22, w + 0.08, 8).rotateZ(PI / 2), '#8a8f99');
    const spokes = []; for (let i = 0; i < 5; i++) spokes.push(U.paint(U.xf(box(w + 0.05, r * 0.12, r * 1.1), 0, 0, 0, i * PI * 2 / 5, 0, 0), '#aeb4bf'));
    return (wheelCache[k] = U.merge([t, t2, rim, hub].concat(spokes)));
  }

  // generic car body
  function carKit(o) {
    const K = new Kit(), L = o.L, Wd = o.W, cl = o.clear || 0.32, belt = o.belt || 0.95, nose = o.nose || 0.72, tail = o.tail || 0.9;
    const hr = L / 2, cf = o.cabF, cr = o.cabR, roof = o.roof || 1.45, ws = o.ws || 0.55, rw = o.rw || 0.45;
    K.add(ext([['m', -hr + 0.25, cl], ['l', hr - 0.3, cl], ['q', hr, cl, hr, cl + 0.25], ['l', hr, nose - 0.08], ['q', hr - 0.05, nose + 0.06, hr - 0.4, nose + 0.12], ['q', cf + 0.3, belt, cf, belt], ['l', cr, belt], ['q', -hr + 0.35, tail + 0.04, -hr + 0.05, tail], ['l', -hr, cl + 0.25], ['q', -hr, cl, -hr + 0.25, cl]], Wd, 0.16, 8), 'paint');
    if (o.cab !== false) {
      K.add(ext([['m', cr, belt - 0.05], ['l', cr + rw, roof], ['l', cf - ws, roof], ['l', cf, belt - 0.05]], Wd - 0.3, 0.12, 4), GLASS);
      K.add(ext([['m', cr + rw - 0.04, roof - 0.06], ['l', cf - ws + 0.04, roof - 0.06], ['l', cf - ws + 0.02, roof + 0.05], ['l', cr + rw - 0.02, roof + 0.05]], Wd - 0.26, 0.1, 2), 'paint');
    }
    // bumpers + lights + grille (the body bevel grows the outline by ~0.14, so these sit that much further out)
    const bo = 0.14;
    K.add(rbox(Wd - 0.06, 0.26, 0.3, 0.1), DARK, 0, cl + 0.12, hr + bo - 0.06);
    K.add(rbox(Wd - 0.06, 0.26, 0.3, 0.1), DARK, 0, cl + 0.12, -hr - bo + 0.06);
    K.mirror(() => rbox(0.44, 0.16, 0.12, 0.06), HEAD, Wd / 2 - 0.36, nose - 0.13, hr + bo - 0.04);
    K.mirror(() => rbox(0.42, 0.15, 0.12, 0.06), TAIL, Wd / 2 - 0.34, tail - 0.17, -hr - bo + 0.04);
    K.add(rbox(Wd * 0.4, 0.15, 0.1, 0.05), '#3a3d45', 0, nose - 0.24, hr + bo - 0.03);
    K.mirror(() => box(0.03, 0.05, cf - cr + 0.6), CHROME, Wd / 2 + bo - 0.02, belt - 0.03, (cf + cr) / 2); // chrome belt trim
    // mirrors
    K.mirror(() => rbox(0.16, 0.12, 0.22, 0.05), 'paint', Wd / 2 + bo, belt + 0.12, cf - 0.15);
    return K;
  }
  function addWheels(G, pos, r, w) {
    const geo = wheelGeo(r, w); G.userData.wheels = [];
    pos.forEach((p) => { const m = new T.Mesh(geo, M.matWheel); m.castShadow = true; m.position.set(p[0], r, p[1]); if (p[0] < 0) m.rotation.y = PI; G.add(m); G.userData.wheels.push(m); m.userData.front = p[1] > 0; });
    G.userData.wheelR = r;
  }
  function std4(L, Wd, r, fo, ro) { const x = Wd / 2 - 0.08; return [[x, L / 2 - fo], [-x, L / 2 - fo], [x, -L / 2 + ro], [-x, -L / 2 + ro]]; }

  const builders = {
    compact(K) { const k = carKit({ L: 3.9, W: 1.85, cabF: 0.75, cabR: -1.55, roof: 1.55, belt: 0.98, tail: 1.0, rw: 0.15, ws: 0.6 }); return { K: k, L: 3.9, W: 1.85, wr: 0.36, wp: std4(3.9, 1.85, 0.36, 0.7, 0.65) }; },
    taxi() { const k = carKit({ L: 4.6, W: 1.9, cabF: 0.6, cabR: -1.2, roof: 1.5 }); k.add(rbox(0.9, 0.26, 0.4, 0.08), '#fff7b0', 0, 1.66, -0.2); k.add(rbox(0.94, 0.08, 0.44, 0.03), DARK, 0, 1.55, -0.2); k.mirror(() => box(0.02, 0.12, 3.6), '#222', 0.96, 0.7, 0); return { K: k, L: 4.6, W: 1.9, wr: 0.37, wp: std4(4.6, 1.9, 0.37, 0.8, 0.8) }; },
    sports() { const k = carKit({ L: 4.4, W: 1.95, cabF: 0.4, cabR: -1.1, roof: 1.18, belt: 0.82, nose: 0.55, tail: 0.86, clear: 0.24, ws: 0.75, rw: 0.6 }); k.add(rbox(1.7, 0.06, 0.32, 0.03), 'paint', 0, 1.05, -2.0); k.mirror(() => box(0.08, 0.2, 0.08), DARK, 0.6, 0.94, -2.0); k.add(rbox(1.0, 0.04, 0.9, 0.02), 'accent', 0, 0.84, 1.3); return { K: k, L: 4.4, W: 1.95, wr: 0.36, wp: std4(4.4, 1.95, 0.36, 0.75, 0.75), accent: '#111111' }; },
    super() { const k = carKit({ L: 4.6, W: 2.05, cabF: 0.55, cabR: -0.9, roof: 1.1, belt: 0.74, nose: 0.46, tail: 0.84, clear: 0.2, ws: 0.95, rw: 0.75 }); k.add(rbox(2.0, 0.07, 0.42, 0.03), 'accent', 0, 1.18, -2.1); k.mirror(() => box(0.08, 0.36, 0.1), DARK, 0.75, 0.99, -2.05); k.mirror(() => rbox(0.1, 0.24, 0.9, 0.05), DARK, 1.02, 0.6, -0.6); k.add(rbox(1.2, 0.08, 0.2, 0.03), '#ff9a2a', 0, 0.55, -2.32); return { K: k, L: 4.6, W: 2.05, wr: 0.37, wp: std4(4.6, 2.05, 0.37, 0.78, 0.8), accent: '#151515' }; },
    muscle() { const k = carKit({ L: 4.9, W: 2.0, cabF: 0.1, cabR: -1.3, roof: 1.32, belt: 0.92, nose: 0.82, tail: 0.94, ws: 0.6, rw: 0.35 }); k.add(rbox(0.7, 0.18, 1.0, 0.08), DARK, 0, 1.02, 1.3); k.add(box(0.28, 0.02, 4.85), 'accent', 0.22, 0.99, 0); k.add(box(0.28, 0.02, 4.85), 'accent', -0.22, 0.99, 0); return { K: k, L: 4.9, W: 2.0, wr: 0.4, wp: std4(4.9, 2.0, 0.4, 0.85, 0.85), accent: '#ffffff' }; },
    police() { const k = carKit({ L: 4.7, W: 1.95, cabF: 0.55, cabR: -1.25, roof: 1.5 }); k.mirror(() => box(0.02, 0.4, 2.4), '#ffffff', 0.985, 0.7, 0.1); k.add(rbox(1.3, 0.16, 0.36, 0.06), '#333', 0, 1.6, -0.3); return { K: k, L: 4.7, W: 1.95, wr: 0.38, wp: std4(4.7, 1.95, 0.38, 0.82, 0.82), lightbar: [0, 1.72, -0.3] }; },
    limo() { const k = carKit({ L: 8.0, W: 2.0, cabF: 1.6, cabR: -2.6, roof: 1.5, ws: 0.6, rw: 0.4 }); for (let i = 0; i < 3; i++) k.mirror(() => box(0.03, 0.05, 0.03), CHROME, 1.0, 0.95, -1.8 + i * 1.2); k.add(rbox(0.6, 0.08, 0.3, 0.03), CHROME, 0, 0.7, 4.0); return { K: k, L: 8, W: 2.0, wr: 0.38, wp: std4(8, 2.0, 0.38, 1.0, 1.0) }; },
    icecream() {
      const k = new Kit(); k.add(rbox(2.1, 2.1, 5.0, 0.3), 'paint', 0, 1.55, -0.2); k.add(rbox(2.0, 1.0, 1.0, 0.25), 'paint', 0, 1.0, 2.35);
      k.add(rbox(1.9, 0.6, 0.06, 0.05), GLASS, 0, 1.9, 2.1, -0.25); k.mirror(() => rbox(0.05, 0.8, 1.6, 0.1), '#fff2a8', 1.06, 1.8, -0.4);
      k.add(cyl(0.5, 0.05, 1.1, 12), '#e8b06a', 0, 3.2, -0.6, PI); k.add(sph(0.55), '#ff9ad5', 0, 3.85, -0.6); k.add(sph(0.18), '#ff3355', 0, 4.4, -0.6);
      k.mirror(() => rbox(0.36, 0.14, 0.1, 0.04), HEAD, 0.7, 1.0, 2.86); k.mirror(() => rbox(0.3, 0.14, 0.1, 0.04), TAIL, 0.8, 0.8, -2.72); k.add(rbox(2.0, 0.22, 0.25, 0.08), DARK, 0, 0.5, 2.85); k.add(rbox(2.0, 0.22, 0.25, 0.08), DARK, 0, 0.5, -2.7);
      return { K: k, L: 5.6, W: 2.1, wr: 0.42, wp: std4(5.6, 2.1, 0.42, 0.9, 1.0), accent: '#ff9ad5' };
    },
    pickup(o) {
      o = o || {}; const k = new Kit(), cl = o.lift || 0.55;
      k.add(ext([['m', -2.6, cl], ['l', 2.4, cl], ['q', 2.7, cl, 2.7, cl + 0.3], ['l', 2.7, cl + 0.75], ['q', 2.6, cl + 0.95, 2.2, cl + 0.97], ['l', 0.9, cl + 1.0], ['l', 0.9, cl + 0.62], ['l', -2.6, cl + 0.62]], 2.05, 0.14, 6), 'paint');
      k.add(ext([['m', -0.9, cl + 0.95], ['l', -0.8, cl + 1.75], ['l', 0.35, cl + 1.75], ['l', 0.95, cl + 0.95]], 1.85, 0.12, 2), GLASS);
      k.add(ext([['m', -0.85, cl + 1.68], ['l', 0.4, cl + 1.68], ['l', 0.4, cl + 1.8], ['l', -0.85, cl + 1.8]], 1.88, 0.1, 2), 'paint');
      k.add(rbox(2.05, 0.55, 0.12, 0.04), 'paint', 0, cl + 0.88, -2.58); k.mirror(() => rbox(0.1, 0.5, 1.7, 0.04), 'paint', 0.98, cl + 0.88, -1.75); k.add(rbox(1.9, 0.5, 0.1, 0.04), 'paint', 0, cl + 0.88, -0.92);
      k.add(rbox(2.15, 0.3, 0.3, 0.1), DARK, 0, cl + 0.15, 2.7); k.add(rbox(2.1, 0.25, 0.25, 0.1), DARK, 0, cl + 0.15, -2.65);
      k.mirror(() => rbox(0.38, 0.18, 0.12, 0.05), HEAD, 0.68, cl + 0.62, 2.72); k.mirror(() => rbox(0.18, 0.36, 0.1, 0.04), TAIL, 0.9, cl + 0.75, -2.66);
      k.add(rbox(0.9, 0.3, 0.1, 0.04), '#3a3d45', 0, cl + 0.55, 2.74);
      return { K: k, L: 5.4, W: 2.05, wr: o.wr || 0.48, wp: std4(5.4, (o.ww || 2.15), o.wr || 0.48, 1.0, 1.05) };
    },
    tow() { const r = builders.pickup(); const k = r.K; k.add(rbox(1.2, 0.14, 0.4, 0.05), '#ffb000', 0, 2.42, -0.3); k.add(cyl(0.12, 0.12, 2.6, 8), '#555', 0, 1.9, -2.1, 0.9); k.add(cyl(0.05, 0.05, 1.2, 6), '#222', 0, 2.0, -3.2); k.add(new T.TorusGeometry(0.18, 0.05, 6, 10, PI * 1.3), '#999', 0, 1.35, -3.2); r.lightbar = [0, 2.5, -0.3]; return r; },
    monster() { const r = builders.pickup({ lift: 1.35, wr: 1.05, ww: 2.9 }); r.K.mirror(() => cyl(0.08, 0.08, 2.4, 8), '#666', 0.6, 1.1, 0, PI / 2); r.wp = std4(5.4, 3.0, 1.05, 1.1, 1.1); r.W = 3.0; r.wW = 0.75; return r; },
    bigrig() {
      const k = new Kit();
      k.add(ext([['m', 2.6, 0.7], ['l', 5.6, 0.7], ['q', 5.9, 0.7, 5.9, 1.0], ['l', 5.9, 1.9], ['q', 5.85, 2.1, 5.5, 2.15], ['l', 5.0, 2.2], ['l', 4.6, 3.3], ['q', 4.5, 3.45, 4.2, 3.45], ['l', 2.8, 3.45], ['q', 2.6, 3.45, 2.6, 3.2]], 2.4, 0.18, 6), 'paint');
      k.add(ext([['m', 4.62, 2.25], ['l', 5.02, 2.25], ['l', 4.65, 3.1], ['l', 4.3, 3.1]], 2.2, 0.06, 2), GLASS);
      k.add(rbox(1.2, 0.9, 0.12, 0.05), '#d8dde6', 0, 1.35, 5.95); k.mirror(() => cyl(0.1, 0.1, 2.2, 8), CHROME, 1.1, 3.0, 2.85);
      k.mirror(() => rbox(0.38, 0.22, 0.1, 0.05), HEAD, 0.85, 1.05, 5.95);
      k.add(rbox(2.55, 3.0, 8.6, 0.25), 'accent', 0, 2.6, -2.0); k.add(rbox(2.4, 0.3, 8.6, 0.1), DARK, 0, 0.95, -2.0);
      k.mirror(() => rbox(0.2, 0.2, 0.08, 0.05), TAIL, 1.0, 1.3, -6.32);
      return { K: k, L: 12.6, W: 2.55, wr: 0.55, wp: [[1.18, 4.8], [-1.18, 4.8], [1.18, 1.6], [-1.18, 1.6], [1.18, -4.6], [-1.18, -4.6], [1.18, -5.7], [-1.18, -5.7]], accent: '#f4f6fa', zoff: 0 };
    },
    bus() {
      const k = new Kit(); k.add(rbox(2.55, 2.6, 11, 0.35), 'paint', 0, 1.85, 0);
      k.mirror(() => box(0.04, 0.9, 9.4), GLASS, 1.28, 2.3, -0.3); k.add(rbox(2.3, 1.2, 0.08, 0.1), GLASS, 0, 2.2, 5.5); k.add(box(2.6, 0.12, 11.02), '#ffffff', 0, 1.35, 0);
      k.add(rbox(1.6, 0.35, 0.1, 0.05), '#111', 0, 3.0, 5.52); k.mirror(() => rbox(0.36, 0.2, 0.1, 0.05), HEAD, 0.9, 0.95, 5.52); k.mirror(() => rbox(0.3, 0.3, 0.1, 0.05), TAIL, 1.0, 1.0, -5.52);
      return { K: k, L: 11, W: 2.55, wr: 0.55, wp: std4(11, 2.5, 0.55, 2.1, 2.4), accent: '#ffffff' };
    },
    buggy() {
      const k = new Kit(); k.add(ext([['m', -1.5, 0.5], ['l', 1.4, 0.5], ['q', 1.9, 0.55, 1.95, 0.8], ['l', 1.0, 0.95], ['l', -1.6, 0.95], ['l', -1.75, 0.6]], 1.4, 0.12, 4), 'paint');
      const tube = (len) => cyl(0.06, 0.06, len, 6);
      k.mirror(() => tube(1.6), '#333', 0.65, 1.6, 0.15, 0.4, 0, 0); k.mirror(() => tube(1.3), '#333', 0.65, 1.55, -1.0, -0.25, 0, 0); k.add(tube(1.35).rotateZ(PI / 2), '#333', 0, 2.2, -0.4); k.add(tube(1.35).rotateZ(PI / 2), '#333', 0, 2.25, 0.5);
      k.add(rbox(0.6, 0.7, 0.6, 0.15), '#222', 0, 1.25, -0.4); k.add(rbox(0.8, 0.5, 0.5, 0.15), '#555', 0, 1.0, -1.4);
      k.mirror(() => rbox(0.3, 0.16, 0.1, 0.05), HEAD, 0.4, 0.9, 1.9);
      return { K: k, L: 3.6, W: 2.2, wr: 0.55, wp: [[1.05, 1.25], [-1.05, 1.25], [1.1, -1.25], [-1.1, -1.25]], wW: 0.45 };
    },
    compactWheels: null,
    snowmobile() {
      const k = new Kit(); k.add(ext([['m', -1.3, 0.35], ['l', 1.2, 0.35], ['q', 1.7, 0.4, 1.6, 0.75], ['l', 0.6, 1.0], ['l', -1.3, 0.9]], 1.0, 0.15, 6), 'paint');
      k.add(ext([['m', 0.55, 0.95], ['l', 0.3, 1.5], ['l', 0.2, 1.48], ['l', 0.4, 0.95]], 0.8, 0.04, 2), '#9ad8ff'); k.add(rbox(0.6, 0.25, 1.1, 0.1), '#222', 0, 1.0, -0.6);
      k.mirror(() => rbox(0.14, 0.08, 1.7, 0.04), '#ccc', 0.55, 0.06, 1.0); k.mirror(() => box(0.06, 0.4, 0.06), '#555', 0.55, 0.25, 1.1);
      k.add(rbox(0.8, 0.45, 1.5, 0.18), '#1a1a1a', 0, 0.28, -0.75); k.add(rbox(0.3, 0.12, 0.1, 0.04), HEAD, 0, 0.7, 1.55);
      return { K: k, L: 3.2, W: 1.2, wr: 0, wp: [] };
    },
    boat() {
      const k = new Kit();
      k.add(plan([['m', -1.1, 2.6], ['l', 1.1, 2.6], ['q', 1.25, 0, 0.4, -2.3], ['q', 0, -2.9, -0.4, -2.3], ['q', -1.25, 0, -1.1, 2.6]], 1.0, 0.15), 'paint', 0, -0.3, 0);
      k.add(plan([['m', -1.0, 2.5], ['l', 1.0, 2.5], ['q', 1.1, 0, 0.36, -2.1], ['q', 0, -2.6, -0.36, -2.1], ['q', -1.1, 0, -1.0, 2.5]], 0.12, 0.04), '#f4f4f4', 0, 0.62, 0);
      k.add(ext([['m', 0.0, 0.7], ['l', 0.35, 1.25], ['l', 0.45, 1.25], ['l', 0.45, 0.7]], 1.6, 0.04, 2), '#9ad8ff', 0, 0, 0.1);
      k.add(rbox(1.4, 0.45, 0.7, 0.15), '#c0392b', 0, 0.9, -0.9); k.add(rbox(0.5, 0.7, 0.5, 0.1), '#333', 0, 0.4, -2.75);
      return { K: k, L: 5.4, W: 2.4, wr: 0, wp: [] };
    },
    heli() {
      const k = new Kit(); k.add(sph(1.3, 16, 12), 'paint', 0, 1.9, 0.4, 0, 0, 0, 1.05, 1.0, 1.55);
      k.add(sph(1.05, 14, 10), GLASS, 0, 2.05, 1.25, 0, 0, 0, 0.95, 0.85, 1.0);
      k.add(cyl(0.22, 0.42, 4.2, 10).rotateX(PI / 2), 'paint', 0, 2.25, -2.8); k.add(rbox(0.12, 1.1, 0.8, 0.05), 'accent', 0, 2.75, -4.75);
      k.add(rbox(1.4, 0.08, 0.5, 0.03), 'accent', 0, 2.25, -4.4);
      k.mirror(() => cyl(0.07, 0.07, 3.2, 8).rotateX(PI / 2), '#444', 0.85, 0.15, 0.3); k.mirror(() => cyl(0.05, 0.05, 0.7, 6), '#444', 0.85, 0.5, 1.1); k.mirror(() => cyl(0.05, 0.05, 0.7, 6), '#444', 0.85, 0.5, -0.6);
      k.add(cyl(0.18, 0.25, 0.5, 10), '#555', 0, 3.3, 0.2);
      return { K: k, L: 6, W: 2.6, wr: 0, wp: [], rotor: true, accent: '#ffffff' };
    },
    plane() {
      const k = new Kit();
      const pts = [[0, -3.6], [0.25, -3.4], [0.45, -2.2], [0.75, -0.5], [0.85, 0.6], [0.8, 1.5], [0.6, 2.2], [0.3, 2.5], [0, 2.55]].map((p) => new T.Vector2(p[0], p[1]));
      k.add(new T.LatheGeometry(pts, 14).rotateX(PI / 2), 'paint', 0, 1.45, 0);
      k.add(sph(0.62, 12, 8), GLASS, 0, 2.05, 0.1, 0, 0, 0, 0.9, 0.75, 1.5);
      k.add(ext([['m', -0.6, 0], ['q', 0.2, 0.2, 0.9, 0.05], ['l', 0.9, -0.05], ['l', -0.6, -0.08]], 9.0, 0.06, 4), 'accent', 0, 1.25, 0.4, 0, 0, 0.04);
      k.add(ext([['m', -0.4, 0], ['q', 0.1, 0.1, 0.5, 0.03], ['l', 0.5, -0.03], ['l', -0.4, -0.05]], 3.2, 0.04, 3), 'accent', 0, 1.6, -3.1);
      k.add(ext([['m', -0.7, 0], ['l', 0.2, 0], ['l', -0.2, 1.1], ['l', -0.6, 1.1]], 0.12, 0.03, 2), 'accent', 0, 1.6, -3.0);
      k.mirror(() => cyl(0.05, 0.05, 1.2, 6), '#444', 0.7, 0.75, 1.1, 0, 0, 0.35); k.add(cyl(0.15, 0.3, 0.3, 10).rotateX(PI / 2), '#e33', 0, 1.45, 2.65);
      return { K: k, L: 7, W: 9, wr: 0.32, wp: [[1.0, 1.1], [-1.0, 1.1], [0, -3.2]], prop: [0, 1.45, 2.85], accent: '#ffffff' };
    },
    balloon() {
      const k = new Kit(); const pts = [];
      for (let i = 0; i <= 14; i++) { const a = i / 14 * PI; const r = Math.sin(a) * (a < PI * 0.62 ? 6.2 : 6.2 - (a - PI * 0.62) * 3.6); pts.push(new T.Vector2(Math.max(0.9, r * 1.0), 7 - Math.cos(a) * 7.2)); }
      pts[0].x = 0.01; pts[pts.length - 1].x = 1.6;
      const env = new T.LatheGeometry(pts.reverse(), 16).toNonIndexed();
      const cols = new Float32Array(env.attributes.position.count * 3), pp = env.attributes.position.array; const cA = new T.Color('#ff3b6b'), cB = new T.Color('#ffd23f');
      for (let i = 0; i < env.attributes.position.count; i += 3) { const x = (pp[i * 3] + pp[i * 3 + 3] + pp[i * 3 + 6]) / 3, z = (pp[i * 3 + 2] + pp[i * 3 + 5] + pp[i * 3 + 8]) / 3; const seg = Math.floor(((Math.atan2(z, x) + PI) / (PI * 2)) * 8 + 0.5) % 2; const c = seg ? cA : cB; for (let q = 0; q < 3; q++) { cols[(i + q) * 3] = c.r; cols[(i + q) * 3 + 1] = c.g; cols[(i + q) * 3 + 2] = c.b; } }
      env.setAttribute('color', new T.BufferAttribute(cols, 3)); env.translate(0, 4.2, 0);
      k.parts.push({ g: env, color: null, keep: true });
      k.add(cyl(0.85, 0.7, 1.0, 12), '#a0703c', 0, 0.5, 0); k.add(new T.TorusGeometry(0.85, 0.08, 6, 14).rotateX(PI / 2), '#6b4423', 0, 1.0, 0);
      for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4; k.add(cyl(0.03, 0.03, 3.4, 4), '#555', Math.cos(a) * 1.2, 2.7, Math.sin(a) * 1.2, Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12); }
      k.add(cyl(0.25, 0.25, 0.4, 8), '#444', 0, 3.2, 0);
      return { K: k, L: 3, W: 12, wr: 0, wp: [], flame: true, envColorFixed: true };
    }
  };
  // Kit.build must keep pre-colored geometry
  const _build = Kit.prototype.build;
  Kit.prototype.build = function (paint, accent) {
    const keep = this.parts.filter((p) => p.keep); this.parts = this.parts.filter((p) => !p.keep);
    if (!keep.length) return _build.call(this, paint, accent);
    const geo = _build.call(this, paint, accent); const all = U.merge([geo].concat(keep.map((p) => p.g))); all.userData.paint = geo.userData.paint; return all;
  };

  const bodyCache = {};
  M.vehicle = function (type, color, opt) {
    opt = opt || {};
    const key = type; const G = new T.Group();
    let r = bodyCache[key]; if (!r) {
      r = builders[type](); r.base = r.K.build('#ffffff', r.accent);
      const big = type === 'bus' || type === 'bigrig', car = !big && ['heli', 'plane', 'balloon', 'boat', 'snowmobile', 'buggy'].indexOf(type) < 0;
      if (car) M.sculpt(r.base, r.L, r.W, { plan: 0.16, start: 0.62, tum: type === 'icecream' ? 0.05 : 0.12 });
      else if (big) M.sculpt(r.base, r.L, r.W, { plan: 0.05, start: 0.85, tum: 0.04 });
      M.autoSmooth(r.base, 38); bodyCache[key] = r;
    }
    const geo = r.base.clone(); geo.userData.paint = r.base.userData.paint;
    const body = new T.Mesh(geo, M.mat); body.castShadow = true; G.add(body); G.userData.body = body; M.repaint(body, color || '#ff4fd8', opt.accent || r.accent);
    if (r.wp.length) addWheels(G, r.wp, r.wr, r.wW || 0.34);
    else G.userData.wheels = [];
    if (r.rotor) {
      const rot = new T.Group(); const bg = U.merge([U.paint(rbox(0.32, 0.06, 9.4, 0.03), '#2a2a2a'), U.paint(rbox(9.4, 0.06, 0.32, 0.03), '#2a2a2a'), U.paint(cyl(0.2, 0.2, 0.2, 8), '#666')]);
      rot.add(new T.Mesh(bg, M.mat)); rot.position.set(0, 3.6, 0.2); G.add(rot); G.userData.rotor = rot;
      const tr = new T.Mesh(U.merge([U.paint(rbox(0.06, 1.5, 0.16, 0.02), '#2a2a2a')]), M.mat); tr.position.set(0.15, 2.75, -4.7); G.add(tr); G.userData.trotor = tr;
    }
    if (r.prop) { const p = new T.Mesh(U.merge([U.paint(rbox(0.12, 2.2, 0.08, 0.03), '#333'), U.paint(sph(0.2), '#e33')]), M.mat); p.position.set(r.prop[0], r.prop[1], r.prop[2]); G.add(p); G.userData.prop = p; }
    if (r.flame) { const f = new T.Mesh(new T.ConeGeometry(0.3, 1.4, 8), new T.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.85 })); f.position.set(0, 4.1, 0); f.visible = false; G.add(f); G.userData.flame = f; }
    if (r.lightbar) {
      const lb = new T.Group(); const red = new T.Mesh(new T.BoxGeometry(0.5, 0.14, 0.3), new T.MeshBasicMaterial({ color: 0xff2030 })), blue = new T.Mesh(new T.BoxGeometry(0.5, 0.14, 0.3), new T.MeshBasicMaterial({ color: 0x2060ff }));
      red.position.x = 0.32; blue.position.x = -0.32; lb.add(red, blue); lb.position.set(r.lightbar[0], r.lightbar[1], r.lightbar[2]); G.add(lb); G.userData.lightbar = { red, blue };
    }
    G.userData.L = r.L; G.userData.W = r.W; G.userData.type = type;
    return G;
  };
  M.spinWheels = function (G, v, dt, steer) {
    const ws = G.userData.wheels; if (!ws || !ws.length) return; const r = G.userData.wheelR || 0.4;
    G.userData.spin = (G.userData.spin || 0) + v * dt / r;
    for (const w of ws) { w.rotation.order = 'YXZ'; w.rotation.x = w.position.x < 0 ? -G.userData.spin : G.userData.spin; w.rotation.y = (w.position.x < 0 ? PI : 0) + (w.userData.front ? steer * 0.45 : 0); }
  };

  // ---- people ----
  M.personGeo = function (shirt, skin, hair) {
    const k = new Kit();
    k.add(cyl(0.11, 0.1, 0.8, 6), '#2e3a5c', 0.12, 0.4, 0); k.add(cyl(0.11, 0.1, 0.8, 6), '#2e3a5c', -0.12, 0.4, 0);
    k.add(cyl(0.26, 0.3, 0.75, 10), shirt, 0, 1.15, 0); k.add(sph(0.26, 10, 8), shirt, 0, 1.5, 0, 0, 0, 0, 1, 0.5, 1);
    k.add(sph(0.24, 12, 10), skin, 0, 1.82, 0); k.add(sph(0.25, 12, 8, ), hair, 0, 1.9, -0.03, 0, 0, 0, 1, 0.7, 1);
    k.mirror(() => cyl(0.07, 0.07, 0.7, 6), shirt, 0.34, 1.12, 0, 0, 0, 0.15);
    k.add(sph(0.035, 6, 4), '#222', 0.09, 1.85, 0.21); k.add(sph(0.035, 6, 4), '#222', -0.09, 1.85, 0.21);
    return k.build('#fff');
  };
  // emoji / text sprite
  M.sprite = function (text, opts) {
    opts = opts || {}; const c = document.createElement('canvas'); const s = opts.size || 128; c.width = s * (opts.wide || 1); c.height = s; const x = c.getContext('2d');
    if (opts.bg) { x.fillStyle = opts.bg; const r = s * 0.2; x.beginPath(); x.moveTo(r, 0); x.arcTo(c.width, 0, c.width, s, r); x.arcTo(c.width, s, 0, s, r); x.arcTo(0, s, 0, 0, r); x.arcTo(0, 0, c.width, 0, r); x.fill(); }
    x.font = (opts.bold ? 'bold ' : '') + Math.floor(s * (opts.fs || 0.72)) + 'px "Trebuchet MS", "Apple Color Emoji", "Segoe UI Emoji", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    if (opts.stroke) { x.lineWidth = s * 0.08; x.strokeStyle = opts.stroke; x.strokeText(text, c.width / 2, s * 0.55); }
    x.fillStyle = opts.color || '#fff'; x.fillText(text, c.width / 2, s * 0.55);
    const tex = new T.CanvasTexture(c); const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
    const sc = opts.scale || 4; sp.scale.set(sc * (opts.wide || 1), sc, 1); return sp;
  };
})();
