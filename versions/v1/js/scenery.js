/* Grok Rides - builds the visible world (terrain, roads, water, buildings, trees, landmarks, markers) */
(function () {
  'use strict';
  const GR = window.GR, U = GR.U, W = GR.W, M = GR.M, T = THREE;
  const SC = GR.SC = { anim: [] };
  const PI = Math.PI;

  function terrainColor(x, z, h, ny, out) {
    const n = U.noise(x / 37, z / 37) * 0.5 + U.noise(x / 9, z / 9) * 0.2, s = W.surface(x, z);
    let c;
    if (W.inRect(W.CITY, x, z, 14)) c = [0.74 + n * 0.04, 0.75 + n * 0.04, 0.78 + n * 0.04];
    else if (W.inRect(W.AIR, x, z, 40)) c = [0.55 + n * 0.05, 0.75, 0.42];
    else if (s === 5 || (W.ellQ(W.LAKE, x, z) < 1.25 && h < 2.2)) c = [0.93, 0.85, 0.62];
    else if (s === 4) c = [0.78 + n * 0.05, 0.9 + n * 0.03, 0.98];
    else if (s === 3) c = [0.93 + n * 0.05, 0.96 + n * 0.03, 1.0];
    else if (s === 2) c = [0.95 + n * 0.04, 0.8 + n * 0.06, 0.5 + n * 0.05];
    else if (s === 6) c = [0.55 + n * 0.08, 0.5 + n * 0.07, 0.42 + n * 0.05];
    else c = [0.42 + n * 0.1, 0.72 + n * 0.08, 0.32 + n * 0.06];
    if (ny < 0.8 && s !== 0 && !W.inRect(W.CITY, x, z, 14)) { const k = U.smooth(0.8, 0.62, ny); const rock = s === 2 ? [0.78, 0.45, 0.3] : s === 3 ? [0.75, 0.78, 0.85] : [0.55, 0.55, 0.58]; for (let i = 0; i < 3; i++) c[i] = U.lerp(c[i], rock[i], k); }
    out[0] = c[0]; out[1] = c[1]; out[2] = c[2];
  }

  SC.build = function (scene) {
    SC.scene = scene;
    buildSky(scene);
    buildTerrain(scene);
    buildRoads(scene);
    buildWater(scene);
    const statics = []; // vertex-colored static geometry
    buildCity(scene, statics);
    buildTown(statics);
    buildMesas(statics);
    buildLandmarks(scene, statics);
    buildTrees(scene);
    const g = U.merge(statics); const m = new T.Mesh(g, M.matMatte); scene.add(m); SC.statics = m;
    buildMarkers(scene);
  };

  function buildSky(scene) {
    const g = new T.SphereGeometry(2500, 24, 12), c = [], p = g.attributes.position;
    const top = new T.Color('#4aa3ff'), hor = new T.Color('#cfefff');
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 2500, t = U.clamp(y * 2.2, 0, 1); const col = hor.clone().lerp(top, t); c.push(col.r, col.g, col.b); }
    g.setAttribute('color', new T.Float32BufferAttribute(c, 3));
    const sky = new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false })); sky.renderOrder = -1; scene.add(sky); SC.sky = sky;
    // clouds
    const cg = []; const r = U.rng(7);
    for (let i = 0; i < 46; i++) { const x = (r() - 0.5) * 3600, z = (r() - 0.5) * 3600, y = 330 + r() * 120; for (let k = 0; k < 4; k++) cg.push(U.paint(U.xf(new T.IcosahedronGeometry(1, 1), x + (k - 1.5) * 26 + r() * 10, y + r() * 8, z + r() * 20, 0, 0, 0, 30 + r() * 18, 12 + r() * 6, 22 + r() * 10), '#ffffff')); }
    const cl = new T.Mesh(U.merge(cg), new T.MeshLambertMaterial({ vertexColors: true, emissive: 0x777777, fog: false })); scene.add(cl);
  }

  function buildTerrain(scene) {
    const N = W.N, R = W.RES, HALF = W.HALF;
    const pos = new Float32Array(N * N * 3), col = new Float32Array(N * N * 3), tmp = [0, 0, 0], nrm = {};
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const k = i * N + j, x = -HALF + j * R, z = -HALF + i * R, h = W.H[k];
      pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
      W.normal(x, z, nrm); terrainColor(x, z, h, nrm.y, tmp); col[k * 3] = tmp[0]; col[k * 3 + 1] = tmp[1]; col[k * 3 + 2] = tmp[2];
    }
    const idx = new Uint32Array((N - 1) * (N - 1) * 6); let o = 0;
    for (let i = 0; i < N - 1; i++) for (let j = 0; j < N - 1; j++) { const a = i * N + j, b = a + 1, c = a + N, d = c + 1; idx[o++] = a; idx[o++] = c; idx[o++] = b; idx[o++] = b; idx[o++] = c; idx[o++] = d; }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3)); g.setIndex(new T.BufferAttribute(idx, 1)); g.computeVertexNormals();
    const m = new T.Mesh(g, new T.MeshLambertMaterial({ vertexColors: true })); scene.add(m); SC.terrain = m;
  }

  function roadTex(kind) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d');
    x.fillStyle = kind === 'runway' ? '#5d6068' : '#45484f'; x.fillRect(0, 0, 64, 128);
    for (let i = 0; i < 300; i++) { x.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.05) + ')'; x.fillRect(Math.random() * 64, Math.random() * 128, 2, 2); }
    x.fillStyle = '#f2f2f2'; x.fillRect(2, 0, 3, 128); x.fillRect(59, 0, 3, 128);
    if (kind === 'runway') { x.fillStyle = '#ffffff'; x.fillRect(30, 0, 4, 60); }
    else { x.fillStyle = '#ffd23f'; x.fillRect(30, 0, 4, 70); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t;
  }
  function buildRoads(scene) {
    const mats = { road: new T.MeshLambertMaterial({ map: roadTex('road'), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }), runway: new T.MeshLambertMaterial({ map: roadTex('runway'), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }) };
    const byKind = { road: [], runway: [] };
    W.roads.forEach((r, ri) => {
      const p = r.pts, n = p.length, pos = [], uv = [], idx = []; let v = 0, len = 0;
      const cnt = r.closed ? n + 1 : n;
      for (let i = 0; i < cnt; i++) {
        const a = p[i % n], prev = p[r.closed ? (i - 1 + n) % n : Math.max(0, i - 1)], next = p[r.closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
        let tx = next.x - prev.x, tz = next.z - prev.z; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
        if (i > 0) len += Math.hypot(a.x - p[(i - 1) % n].x, a.z - p[(i - 1) % n].z);
        const nx = -tz, nz = tx, hw = r.hw;
        for (let k = 0; k < 3; k++) { const s = (k - 1) * hw, x = a.x + nx * s, z = a.z + nz * s; pos.push(x, W.height(x, z) + 0.22 + ri * 0.002, z); uv.push(k / 2, len / 14); }
        if (i > 0) { const b = (i - 1) * 3, c2 = i * 3; for (let k = 0; k < 2; k++) idx.push(b + k, b + k + 1, c2 + k, b + k + 1, c2 + k + 1, c2 + k); }
      }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      byKind[r.kind === 'runway' ? 'runway' : 'road'].push(g.toNonIndexed());
    });
    for (const k in byKind) if (byKind[k].length) { const m = new T.Mesh(U.merge(byKind[k]), mats[k]); scene.add(m); }
  }

  function buildWater(scene) {
    const g = new T.CircleGeometry(1, 64); g.rotateX(-PI / 2);
    const m = new T.Mesh(g, new T.MeshPhongMaterial({ color: 0x2fa8f0, transparent: true, opacity: 0.82, shininess: 90, specular: 0x99ccff }));
    m.scale.set(W.LAKE.rx * 1.28, 1, W.LAKE.rz * 1.28); m.position.set(W.LAKE.x, 0, W.LAKE.z); scene.add(m); SC.water = m;
    const ice = new T.Mesh(g.clone(), new T.MeshPhongMaterial({ color: 0xe6f6ff, transparent: true, opacity: 0.45, shininess: 120, specular: 0xffffff }));
    ice.scale.set(W.ICE.rx, 1, W.ICE.rz); ice.position.set(W.ICE.x, W.ICE.h + 0.12, W.ICE.z); scene.add(ice);
  }

  // ---- buildings ----
  function winTex(wall, glass, lit) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d');
    x.fillStyle = wall; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const gx = 8 + i * 40, gy = 10 + j * 42, gr = x.createLinearGradient(gx, gy, gx + 30, gy + 26);
      const on = Math.random() < lit; gr.addColorStop(0, on ? '#fff3c4' : glass); gr.addColorStop(1, on ? '#ffd27a' : '#0d1b33'); x.fillStyle = gr; x.fillRect(gx, gy, 30, 28);
    }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t;
  }
  function walls(x0, z0, x1, z1, y0, y1, out) {
    const P = out.p, UV = out.uv, Nn = out.n, tile = 12;
    const faces = [[x0, z1, x1, z1, 0, 1], [x1, z1, x1, z0, 1, 0], [x1, z0, x0, z0, 0, -1], [x0, z0, x0, z1, -1, 0]];
    faces.forEach((f) => {
      const L = Math.hypot(f[2] - f[0], f[3] - f[1]), u1 = Math.max(1, Math.round(L / tile)), v1 = (y1 - y0) / tile;
      const q = [[f[0], y0, f[1], 0, 0], [f[2], y0, f[3], u1, 0], [f[2], y1, f[3], u1, v1], [f[0], y1, f[1], 0, v1]];
      [0, 1, 2, 0, 2, 3].forEach((i) => { P.push(q[i][0], q[i][1], q[i][2]); UV.push(q[i][3], q[i][4]); Nn.push(f[4], 0, f[5]); });
    });
  }
  function buildCity(scene, statics) {
    const styles = [{ t: winTex('#d9dee8', '#3d6fb6', 0.15), o: { p: [], uv: [], n: [] } }, { t: winTex('#e8d6b8', '#40597a', 0.2), o: { p: [], uv: [], n: [] } }, { t: winTex('#7d8796', '#62c4ff', 0.1), o: { p: [], uv: [], n: [] } }, { t: winTex('#f2b8c6', '#3a4f8a', 0.2), o: { p: [], uv: [], n: [] } }];
    const r = U.rng(42), C = W.CITY;
    for (let bx = C.x0; bx < C.x1; bx += 100) for (let bz = C.z0; bz < C.z1; bz += 100) {
      if (bx === 550 && bz === -100) { park(bx, bz, statics); continue; }
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
        const cx = bx + 30 + a * 40, cz = bz + 30 + b * 40;
        if (GR.SPOTS.some((s) => Math.abs(s.x - cx) < 34 && Math.abs(s.z - cz) < 34)) continue;
        const w = 22 + r() * 10, d = 22 + r() * 10, dd = Math.hypot(cx - 650, cz + 50);
        let h = 14 + 150 * Math.exp(-(dd / 240) * (dd / 240)) * (0.45 + 0.55 * r()) + r() * 12;
        const st = styles[(r() * styles.length) | 0], x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, y0 = W.height(cx, cz) - 1;
        walls(x0, z0, x1, z1, y0, y0 + h, st.o);
        statics.push(U.paint(U.xf(new T.BoxGeometry(w + 1, 1, d + 1), cx, y0 + h + 0.5, cz), '#8b93a1'));
        let top = h;
        if (h > 70 && r() < 0.7) { const w2 = w * 0.65, d2 = d * 0.65, h2 = 12 + r() * 30; walls(cx - w2 / 2, cz - d2 / 2, cx + w2 / 2, cz + d2 / 2, y0 + h + 1, y0 + h + 1 + h2, st.o); statics.push(U.paint(U.xf(new T.BoxGeometry(w2 + 1, 1, d2 + 1), cx, y0 + h + h2 + 1.5, cz), '#8b93a1')); top = h + h2 + 2; if (r() < 0.6) { statics.push(U.paint(U.xf(new T.CylinderGeometry(0.3, 0.5, 14, 6), cx, y0 + top + 7, cz), '#cfd4dc')); statics.push(U.paint(U.xf(new T.SphereGeometry(0.8, 8, 6), cx, y0 + top + 14, cz), '#ff3b3b')); } }
        else if (r() < 0.6) { statics.push(U.paint(U.xf(new T.CylinderGeometry(2.4, 2.4, 4, 10), cx + w * 0.2, y0 + h + 3, cz - d * 0.15), '#a0663a')); statics.push(U.paint(U.xf(new T.BoxGeometry(4, 2, 3), cx - w * 0.2, y0 + h + 2, cz + d * 0.2), '#c9ced6')); }
        W.addBox(x0, z0, x1, z1, y0 + top, 'bld');
      }
    }
    styles.forEach((s) => {
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(s.o.p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(s.o.n, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(s.o.uv, 2));
      scene.add(new T.Mesh(g, new T.MeshLambertMaterial({ map: s.t })));
    });
    // street lamps
    const lamp = U.merge([U.paint(new T.CylinderGeometry(0.15, 0.2, 7, 6).translate(0, 3.5, 0), '#40444c'), U.paint(new T.BoxGeometry(0.3, 0.2, 2).translate(0, 7, 0.9), '#40444c'), U.paint(new T.BoxGeometry(0.5, 0.15, 0.8).translate(0, 6.85, 1.6), '#fff6c8')]);
    const lamps = []; for (let x = C.x0; x <= C.x1; x += 100) for (let z = C.z0 + 50; z < C.z1; z += 100) { lamps.push([x + 9, z, -PI / 2]); lamps.push([x - 9, z + 25, PI / 2]); }
    const im = new T.InstancedMesh(lamp, M.matMatte, lamps.length), m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler();
    lamps.forEach((l, i) => { q.setFromEuler(e.set(0, l[2], 0)); m4.compose(new T.Vector3(l[0], W.height(l[0], l[1]), l[1]), q, new T.Vector3(1, 1, 1)); im.setMatrixAt(i, m4); W.addCirc(l[0], l[1], 0.4, 7, 'pole'); });
    scene.add(im);
  }
  function park(bx, bz, statics) {
    const cx = bx + 50, cz = bz + 50, y = W.height(cx, cz);
    statics.push(U.paint(U.xf(new T.BoxGeometry(80, 0.3, 80), cx, y + 0.05, cz), '#6cc95a'));
    statics.push(U.paint(U.xf(new T.CylinderGeometry(7, 8, 1.2, 20), cx, y + 0.6, cz), '#cfd6e0')); statics.push(U.paint(U.xf(new T.CylinderGeometry(6.2, 6.2, 0.2, 20), cx, y + 1.15, cz), '#4cc3ff'));
    statics.push(U.paint(U.xf(new T.CylinderGeometry(0.6, 0.9, 3, 10), cx, y + 2, cz), '#cfd6e0'));
    W.addCirc(cx, cz, 8, 3, 'fountain');
    // ferris wheel
    const fx = cx + 22, fz = cz - 20; const wheel = new T.Group();
    const parts = [U.paint(new T.TorusGeometry(14, 0.35, 6, 40), '#ff4fd8'), U.paint(new T.TorusGeometry(14, 0.35, 6, 40).translate(0, 0, 1.6), '#ff4fd8')];
    for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; parts.push(U.paint(U.xf(new T.CylinderGeometry(0.12, 0.12, 14, 4), Math.cos(a) * 7, Math.sin(a) * 7, 0.8, 0, 0, a + PI / 2), '#ffffff')); const cab = U.paint(U.xf(M.rbox(1.8, 1.6, 1.6, 0.4), Math.cos(a) * 14, Math.sin(a) * 14 - 1.2, 0.8), ['#ffd23f', '#3ff0ff', '#4ade80', '#ff7a3d'][i % 4]); parts.push(cab); }
    wheel.add(new T.Mesh(U.merge(parts), M.mat)); wheel.position.set(fx, y + 17, fz); SC.scene.add(wheel); SC.anim.push((t) => { wheel.rotation.z = t * 0.12; });
    statics.push(U.paint(U.xf(new T.CylinderGeometry(0.5, 0.7, 18, 6), fx - 5, y + 8, fz + 0.8, 0, 0, -0.28), '#888')); statics.push(U.paint(U.xf(new T.CylinderGeometry(0.5, 0.7, 18, 6), fx + 5, y + 8, fz + 0.8, 0, 0, 0.28), '#888'));
    W.addBox(fx - 8, fz - 2, fx + 8, fz + 3, 32, 'ferris');
    for (let i = 0; i < 10; i++) W.pads.length;
  }
  function house(x, z, rot, r, statics) {
    const w = 10 + r() * 4, d = 9 + r() * 3, h = 4.5 + r() * 2.5, y = W.height(x, z) - 0.3;
    const wallC = ['#fff1d6', '#ffd6e7', '#d6f0ff', '#e0ffd6', '#fff7a8', '#e8dcff'][(r() * 6) | 0], roofC = ['#c0392b', '#7a4a2a', '#3b6fb6', '#4a7a3b', '#8a4fbf'][(r() * 5) | 0];
    const parts = [U.paint(new T.BoxGeometry(w, h, d).translate(0, h / 2, 0), wallC)];
    const rf = M.ext([['m', -d / 2 - 0.8, 0], ['l', d / 2 + 0.8, 0], ['l', 0, 3.4]], w + 1, 0.12, 2); rf.translate(0, h, 0); parts.push(U.paint(rf, roofC));
    parts.push(U.paint(new T.BoxGeometry(1.6, 2.6, 0.2).translate(0, 1.3, d / 2 + 0.05), '#7a4a2a'));
    parts.push(U.paint(new T.BoxGeometry(1.6, 1.4, 0.2).translate(-w / 4 - 0.5, 2.6, d / 2 + 0.05), '#4a6fa5')); parts.push(U.paint(new T.BoxGeometry(1.6, 1.4, 0.2).translate(w / 4 + 0.5, 2.6, d / 2 + 0.05), '#4a6fa5'));
    parts.push(U.paint(new T.BoxGeometry(1, 2.6, 1).translate(w / 3, h + 2.2, -1), '#8a5a4a'));
    const g = U.merge(parts); U.xf(g, x, y, z, 0, rot, 0); statics.push(g);
    const ex = Math.abs(Math.sin(rot)) > 0.5 ? d / 2 : w / 2, ez = Math.abs(Math.sin(rot)) > 0.5 ? w / 2 : d / 2;
    W.addBox(x - ex, z - ez, x + ex, z + ez, y + h + 3.4, 'house');
  }
  function buildTown(statics) {
    const r = U.rng(9), T0 = W.TOWN;
    for (let bx = T0.x0; bx < T0.x1; bx += 100) for (let bz = T0.z0; bz < T0.z1; bz += 100) {
      const spots = [[bx + 28, bz + 22, PI], [bx + 72, bz + 22, PI], [bx + 28, bz + 78, 0], [bx + 72, bz + 78, 0], [bx + 22, bz + 50, -PI / 2], [bx + 78, bz + 50, PI / 2]];
      spots.forEach((s) => { if (GR.SPOTS.some((p) => Math.hypot(p.x - s[0], p.z - s[1]) < 30) || W.pads.some((p) => p.tag && Math.hypot(p.x - s[0], p.z - s[1]) < 26)) return; if (r() < 0.12) return; house(s[0], s[1], s[2], r, statics); });
    }
    // water tower
    const x = -560, z = 560, y = W.height(x, z);
    for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4; statics.push(U.paint(U.xf(new T.CylinderGeometry(0.3, 0.3, 16, 6), x + Math.cos(a) * 3, y + 8, z + Math.sin(a) * 3), '#8a8f99')); }
    statics.push(U.paint(U.xf(new T.SphereGeometry(5, 14, 10), x, y + 19, z, 0, 0, 0, 1, 0.8, 1), '#7dd3fc')); W.addCirc(x, z, 4.5, 24, 'tower');
  }
  function buildMesas(statics) {
    const bands = ['#c45a32', '#e0894f', '#b3502c', '#f0a060'];
    W.MESAS.forEach((m) => {
      const [x, z, rad, h] = m, y = W.height(x, z) - 4; let y0 = y, rr = rad * 1.15;
      for (let i = 0; i < 4; i++) { const hh = (h + 4) / 4, r2 = rr * (0.93 - i * 0.02); statics.push(U.paint(U.xf(new T.CylinderGeometry(r2, rr, hh, 11), x, y0 + hh / 2, z, 0, i * 0.4, 0), bands[i % 4])); y0 += hh; rr = r2; }
      statics.push(U.paint(U.xf(new T.CylinderGeometry(rr * 0.98, rr, 1, 11), x, y0 + 0.5, z), '#d9a066'));
      W.addCirc(x, z, rad * 1.05, y0, 'mesa');
    });
  }
  function buildLandmarks(scene, statics) {
    // summit observatory + radio mast
    const S = W.SUMMIT, sy = W.height(S.x, S.z);
    const ox = S.x - 22, oz = S.z - 10;
    statics.push(U.paint(U.xf(new T.CylinderGeometry(7, 7, 6, 18), ox, sy + 3, oz), '#f1f5f9')); statics.push(U.paint(U.xf(new T.SphereGeometry(7, 18, 10, 0, PI * 2, 0, PI / 2), ox, sy + 6, oz), '#cbd5e1'));
    statics.push(U.paint(U.xf(new T.BoxGeometry(1.4, 3, 9), ox + 1.5, sy + 9, oz, 0, 0, 0.6), '#475569')); W.addCirc(ox, oz, 7.5, sy + 13, 'obs');
    const mx = S.x + 16, mz = S.z + 16; statics.push(U.paint(U.xf(new T.CylinderGeometry(0.4, 1.6, 40, 4), mx, sy + 20, mz), '#ef4444')); statics.push(U.paint(U.xf(new T.SphereGeometry(1, 8, 6), mx, sy + 41, mz), '#ffffff')); W.addCirc(mx, mz, 2, sy + 42, 'mast');
    const flag = M.sprite('🏔️ PEAK!', { bg: 'rgba(255,255,255,0.9)', color: '#3a1747', wide: 2.6, scale: 7, fs: 0.55, bold: true }); flag.position.set(S.x, sy + 14, S.z); scene.add(flag);
    // lighthouse
    const lx = 175, lz = 40, ly = W.height(lx, lz);
    for (let i = 0; i < 6; i++) statics.push(U.paint(U.xf(new T.CylinderGeometry(2.6 - i * 0.18 - 0.18, 2.6 - i * 0.18, 3.5, 14), lx, ly + 1.75 + i * 3.5, lz), i % 2 ? '#ffffff' : '#ef4444'));
    statics.push(U.paint(U.xf(new T.CylinderGeometry(1.6, 1.6, 2.4, 10), lx, ly + 22.2, lz), '#fff3a8')); statics.push(U.paint(U.xf(new T.ConeGeometry(2.2, 2.4, 10), lx, ly + 24.6, lz), '#334155')); W.addCirc(lx, lz, 2.8, ly + 26, 'light');
    // marina dock
    const dx = -268, dz = 128; for (let i = 0; i < 6; i++) statics.push(U.paint(U.xf(new T.BoxGeometry(6, 0.4, 3), dx + i * 6, 0.6, dz), '#a0703c'));
    // wind turbines
    [[150, -480], [230, -540], [120, -610], [320, -470], [-150, -420]].forEach((p, i) => {
      const y = W.height(p[0], p[1]); statics.push(U.paint(U.xf(new T.CylinderGeometry(0.8, 1.4, 44, 10), p[0], y + 22, p[1]), '#f8fafc')); W.addCirc(p[0], p[1], 1.6, y + 44, 'turbine');
      const bl = []; for (let k = 0; k < 3; k++) bl.push(U.paint(U.xf(M.rbox(0.4, 18, 1.6, 0.2), 0, 9, 0, 0, 0, 0).rotateZ(k * PI * 2 / 3), '#f8fafc')); bl.push(U.paint(new T.SphereGeometry(1.4, 10, 8), '#e2e8f0'));
      const m = new T.Mesh(U.merge(bl), M.matMatte); m.position.set(p[0], y + 44, p[1] + 1.5); scene.add(m); SC.anim.push((t) => { m.rotation.z = t * 0.9 + i; });
    });
    // airfield: hangars + tower
    for (let i = 0; i < 3; i++) { const hx = 1225, hz = 420 + i * 70, y = W.height(hx, hz); const hg = new T.CylinderGeometry(14, 14, 30, 16, 1, false, 0, PI); hg.rotateZ(PI / 2); hg.rotateY(PI / 2); statics.push(U.paint(U.xf(hg, hx, y, hz), i === 1 ? '#94a3b8' : '#cbd5e1')); W.addBox(hx - 15, hz - 14, hx + 15, hz + 14, y + 14, 'hangar'); }
    { const tx = 1215, tz = 330, y = W.height(tx, tz); statics.push(U.paint(U.xf(new T.CylinderGeometry(2.2, 3, 22, 10), tx, y + 11, tz), '#e2e8f0')); statics.push(U.paint(U.xf(new T.CylinderGeometry(5, 4, 4, 10), tx, y + 24, tz), '#38bdf8')); statics.push(U.paint(U.xf(new T.ConeGeometry(5.4, 2, 10), tx, y + 27, tz), '#334155')); W.addCirc(tx, tz, 3.2, y + 28, 'atc'); }
    // tundra outpost cabins + igloos
    [[330, -935], [300, -940], [600, -1000]].forEach((p, i) => { const y = W.height(p[0], p[1]); statics.push(U.paint(U.xf(new T.BoxGeometry(9, 4, 7), p[0], y + 2, p[1]), '#8a5a3b')); const rf = M.ext([['m', -4.5, 0], ['l', 4.5, 0], ['l', 0, 2.6]], 10, 0.1, 2); statics.push(U.paint(U.xf(rf, p[0], y + 4, p[1], 0, PI / 2, 0), '#f8fbff')); W.addBox(p[0] - 4.5, p[1] - 3.5, p[0] + 4.5, p[1] + 3.5, y + 6.6, 'cabin'); });
    [[450, -1230], [700, -1260], [820, -1120]].forEach((p) => { const y = W.height(p[0], p[1]); statics.push(U.paint(U.xf(new T.SphereGeometry(4, 12, 8, 0, PI * 2, 0, PI / 2), p[0], y, p[1]), '#f1f8ff')); W.addCirc(p[0], p[1], 4, y + 4, 'igloo'); });
    // giant cactus statue + dino at the desert museum
    { const x = 700, z = 1060, y = W.height(x, z); statics.push(U.paint(U.xf(new T.SphereGeometry(6, 14, 10), x, y + 7, z, 0, 0, 0, 1.6, 1, 1), '#4ade80')); statics.push(U.paint(U.xf(new T.CylinderGeometry(1.6, 2.4, 14, 10), x + 8, y + 12, z, 0, 0, -0.6), '#4ade80')); statics.push(U.paint(U.xf(new T.SphereGeometry(3, 12, 8), x + 13, y + 19, z), '#4ade80')); for (const s of [-1, 1]) statics.push(U.paint(U.xf(new T.CylinderGeometry(1, 1, 6, 8), x + s * 3, y + 3, z), '#3fae6c')); W.addCirc(x, z, 9, y + 20, 'dino'); }
  }

  function instanced(geo, list, scene) {
    const im = new T.InstancedMesh(geo, M.matMatte, list.length), m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), s = new T.Vector3();
    list.forEach((p, i) => { q.setFromEuler(e.set(0, p[3], 0)); v.set(p[0], p[1], p[2]); s.set(p[4], p[4], p[4]); m4.compose(v, q, s); im.setMatrixAt(i, m4); });
    scene.add(im); return im;
  }
  function buildTrees(scene) {
    const trunk = (h) => U.paint(new T.CylinderGeometry(0.35, 0.5, h, 6).translate(0, h / 2, 0), '#7a5230');
    const roundG = U.merge([trunk(3), U.paint(U.xf(new T.IcosahedronGeometry(2.6, 1), 0, 4.6, 0), '#3fae4a'), U.paint(U.xf(new T.IcosahedronGeometry(1.9, 1), 1, 5.8, 0.4), '#58c45a')]);
    const pineG = U.merge([trunk(2), U.paint(new T.ConeGeometry(2.6, 4, 8).translate(0, 3.6, 0), '#2f7d46'), U.paint(new T.ConeGeometry(2.0, 3.4, 8).translate(0, 5.6, 0), '#38914f'), U.paint(new T.ConeGeometry(1.3, 2.6, 8).translate(0, 7.4, 0), '#43a35c')]);
    const snowG = U.merge([trunk(2), U.paint(new T.ConeGeometry(2.6, 4, 8).translate(0, 3.6, 0), '#2f6d4c'), U.paint(new T.ConeGeometry(2.0, 3.4, 8).translate(0, 5.6, 0), '#f4f9ff'), U.paint(new T.ConeGeometry(1.3, 2.6, 8).translate(0, 7.4, 0), '#ffffff')]);
    const cactusG = U.merge([U.paint(new T.CylinderGeometry(0.55, 0.6, 5, 8).translate(0, 2.5, 0), '#3fa34d'), U.paint(new T.SphereGeometry(0.55, 8, 6).translate(0, 5, 0), '#3fa34d'), U.paint(new T.CylinderGeometry(0.35, 0.35, 1.6, 6).translate(1.0, 3.6, 0), '#3fa34d'), U.paint(new T.CylinderGeometry(0.35, 0.35, 1.2, 6).rotateZ(PI / 2).translate(0.6, 2.8, 0), '#3fa34d'), U.paint(new T.CylinderGeometry(0.35, 0.35, 1.4, 6).translate(-0.9, 3.2, 0), '#3fa34d'), U.paint(new T.CylinderGeometry(0.35, 0.35, 1.0, 6).rotateZ(PI / 2).translate(-0.5, 2.5, 0), '#3fa34d')]);
    const rockG = U.paint(new T.DodecahedronGeometry(1.4, 0), '#9ca3af'), redRockG = U.paint(new T.DodecahedronGeometry(1.4, 0), '#c46a40');
    const L = { round: [], pine: [], snow: [], cactus: [], rock: [], red: [] };
    const r = U.rng(1234);
    // keep race lines clear of trees and rocks (a 14 m corridor around every ground/boat race path)
    const RC = new Set(), CS = 8;
    GR.RACES.forEach((rc) => { if (rc.type === 'air') return; const P = GR.racePath(rc); for (let s = 0; s < P.pi.len; s += 4) { const p = U.pathAt(P.pi, s); for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) RC.add((Math.floor(p.x / CS) + dx) + ',' + (Math.floor(p.z / CS) + dz)); } });
    function ok(x, z, rad) {
      if (RC.has(Math.floor(x / CS) + ',' + Math.floor(z / CS))) return false;
      if (Math.abs(x) > 1450 || Math.abs(z) > 1450) return false;
      if (W.roadD(x, z) < 5 + rad) return false;
      if (W.inRect(W.CITY, x, z, 12) || W.inRect(W.AIR, x, z, 50)) return false;
      if (W.ellQ(W.LAKE, x, z) < 1.3 || W.ellQ(W.ICE, x, z) < 1.15) return false;
      if (GR.SPOTS.some((s) => Math.hypot(s.x - x, s.z - z) < 24)) return false;
      if (W.blocked(x, z, rad + 2)) return false;
      return true;
    }
    for (let i = 0; i < 9000; i++) {
      const x = (r() - 0.5) * 2900, z = (r() - 0.5) * 2900, reg = W.region(x, z), h = W.height(x, z), s = 0.8 + r() * 0.6;
      let type = null;
      if (reg === 'town') type = r() < 0.25 ? 'round' : null;
      else if (reg === 'country') type = r() < 0.32 ? (r() < 0.7 ? 'round' : 'pine') : null;
      else if (reg === 'mountain') type = h > 175 ? (r() < 0.15 ? 'rock' : null) : r() < 0.5 ? (h > 110 ? 'snow' : 'pine') : null;
      else if (reg === 'tundra') type = r() < 0.35 ? 'snow' : null;
      else if (reg === 'desert') type = r() < 0.12 ? 'cactus' : r() < 0.1 ? 'red' : null;
      if (!type) continue;
      if (!ok(x, z, 1.5 * s)) continue;
      L[type].push([x, h - 0.2, z, r() * PI * 2, type === 'rock' || type === 'red' ? s * 1.6 : s]);
      W.addCirc(x, z, type === 'rock' || type === 'red' ? 1.8 * s : 0.7 * s, h + 7 * s, 'tree');
    }
    // town street trees
    for (let x = W.TOWN.x0 + 10; x < W.TOWN.x1; x += 25) for (let z = W.TOWN.z0 + 50; z < W.TOWN.z1; z += 100) { const xx = x + 3, zz = z + (r() < 0.5 ? -40 : 40); if (ok(xx, zz, 1.2)) { L.round.push([xx, W.height(xx, zz) - 0.2, zz, r() * 6, 0.9]); W.addCirc(xx, zz, 0.7, 8, 'tree'); } }
    SC.treeCounts = {};
    for (const k in L) { SC.treeCounts[k] = L[k].length; if (L[k].length) instanced({ round: roundG, pine: pineG, snow: snowG, cactus: cactusG, rock: rockG, red: redRockG }[k], L[k], scene); }
  }

  // ---- markers ----
  const TYPE_COL = { garage: '#4ade80', dealer: '#ffd23f', job: '#3ff0ff', race: '#ff4fd8' };
  function ringTex() {
    const c = document.createElement('canvas'); c.width = 4; c.height = 64; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.95)'); x.fillStyle = g; x.fillRect(0, 0, 4, 64); return new T.CanvasTexture(c);
  }
  SC.ringTex = null;
  SC.marker = function (x, z, color, icon, label, r) {
    SC.ringTex = SC.ringTex || ringTex();
    const G = new T.Group(), y = W.height(x, z);
    const ring = new T.Mesh(new T.CylinderGeometry(r || 7, r || 7, 3, 32, 1, true), new T.MeshBasicMaterial({ color, map: SC.ringTex, transparent: true, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending }));
    ring.position.y = 1.5; G.add(ring);
    const disc = new T.Mesh(new T.CircleGeometry(r || 7, 32).rotateX(-PI / 2), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, depthWrite: false })); disc.position.y = 0.35; G.add(disc);
    const sp = M.sprite(icon, { bg: color, size: 128, fs: 0.62, scale: 5.5 }); sp.position.y = 9; G.add(sp); G.userData.icon = sp;
    if (label) { const lb = M.sprite(label, { color: '#ffffff', stroke: '#3a1747', wide: 5, scale: 3.2, fs: 0.5, bold: true }); lb.position.y = 13; G.add(lb); G.userData.label = lb; }
    G.position.set(x, y, z); SC.scene.add(G); return G;
  };
  function buildMarkers() {
    SC.markers = [];
    GR.SPOTS.forEach((s) => { const g = SC.marker(s.x, s.z, TYPE_COL[s.type], s.icon, s.name.length > 22 ? s.name.split(' (')[0] : s.name); SC.markers.push({ s, g }); });
    GR.RACES.forEach((rc) => { const st = GR.raceStart(rc); const g = SC.marker(st.x, st.z, TYPE_COL.race, rc.icon, '🏁 ' + rc.name); SC.markers.push({ s: { id: 'race_' + rc.id, type: 'race', race: rc.id, x: st.x, z: st.z, name: rc.name, icon: rc.icon }, g }); });
    SC.anim.push((t) => { SC.markers.forEach((m) => { m.g.userData.icon.position.y = 9 + Math.sin(t * 2 + m.s.x) * 0.6; }); });
  }
})();
