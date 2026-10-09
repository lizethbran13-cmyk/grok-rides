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
    GR.PL.layout();
    GR.BLD.buildCity(scene, statics);
    buildTown(statics);
    GR.BLD.buildTownStreets();
    buildMesas(statics);
    buildLandmarks(scene, statics);
    buildRamps(statics);
    buildTrees(scene);
    GR.PL.buildExteriors(scene);
    GR.BLD.finish(scene);
    const g = U.merge(statics); const m = new T.Mesh(g, M.matMatte); scene.add(m); SC.statics = m;
    buildMarkers(scene);
  };

  function buildSky(scene) {
    const g = new T.SphereGeometry(2500, 48, 24), c = [], p = g.attributes.position;
    const top = new T.Color('#2f86f0'), mid = new T.Color('#7cc0ff'), hor = new T.Color('#e4f5ff'), sunC = new T.Color('#fff4d6');
    const sd = new T.Vector3(0.45, 1, 0.3).normalize(), v3 = new T.Vector3();
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) / 2500, t = U.clamp(y * 2.2, 0, 1); const col = t < 0.35 ? hor.clone().lerp(mid, t / 0.35) : mid.clone().lerp(top, (t - 0.35) / 0.65);
      v3.set(p.getX(i), p.getY(i), p.getZ(i)).normalize(); const sg = Math.pow(Math.max(0, v3.dot(sd)), 6) * 0.55; col.lerp(sunC, sg); c.push(col.r, col.g, col.b);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(c, 3));
    const sky = new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false })); sky.renderOrder = -1; scene.add(sky); SC.sky = sky;
    // the sun: a soft glowing disc in the sky dome (moves with the camera like the sky)
    { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,245,1)'); gr.addColorStop(0.18, 'rgba(255,250,225,1)'); gr.addColorStop(0.3, 'rgba(255,236,170,0.45)'); gr.addColorStop(1, 'rgba(255,230,160,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
      const sp = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(cv), fog: false, depthWrite: false, transparent: true })); sp.scale.set(520, 520, 1); sp.position.copy(sd).multiplyScalar(2300); sp.renderOrder = -1; sky.add(sp); SC.sunSp = sp; }
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
    const c = document.createElement('canvas'); c.width = 128; c.height = 128; const x = c.getContext('2d');
    x.fillStyle = kind === 'runway' ? '#5d6068' : '#45484f'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 500; i++) { x.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.05) + ')'; x.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
    if (kind !== 'plain') {
      x.fillStyle = '#e9ebee'; x.fillRect(5, 0, 3, 128); x.fillRect(120, 0, 3, 128);
      if (kind === 'runway') { x.fillStyle = '#ffffff'; x.fillRect(62, 0, 4, 60); }
      else { x.fillStyle = '#ffd23f'; x.fillRect(62.5, 0, 3, 52); }
    }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8; return t;
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
    buildJunctions(scene);
  }
  // Where two roads cross, both road meshes overlap at almost the same height -> their lane lines
  // z-fought and flickered (very visible on iPhone). Cover every crossing with a clean asphalt patch.
  function buildJunctions(scene) {
    const R = W.roads.filter((r) => r.kind !== 'runway'), pos = [], uv = [];
    const segs = (r) => { const p = r.pts, n = p.length, out = []; for (let i = 0; i < (r.closed ? n : n - 1); i++) out.push([p[i], p[(i + 1) % n]]); return out; };
    const S = R.map(segs), seen = [];
    for (let a = 0; a < R.length; a++) for (let b = a + 1; b < R.length; b++) {
      for (const [p1, p2] of S[a]) {
        const minx = Math.min(p1.x, p2.x) - 1, maxx = Math.max(p1.x, p2.x) + 1, minz = Math.min(p1.z, p2.z) - 1, maxz = Math.max(p1.z, p2.z) + 1;
        for (const [q1, q2] of S[b]) {
          if (Math.max(q1.x, q2.x) < minx || Math.min(q1.x, q2.x) > maxx || Math.max(q1.z, q2.z) < minz || Math.min(q1.z, q2.z) > maxz) continue;
          const rx = p2.x - p1.x, rz = p2.z - p1.z, sx = q2.x - q1.x, sz = q2.z - q1.z, den = rx * sz - rz * sx; if (Math.abs(den) < 1e-6) continue;
          const t = ((q1.x - p1.x) * sz - (q1.z - p1.z) * sx) / den, u = ((q1.x - p1.x) * rz - (q1.z - p1.z) * rx) / den;
          if (t < -0.02 || t > 1.02 || u < -0.02 || u > 1.02) continue;
          const cx = p1.x + rx * t, cz = p1.z + rz * t; if (seen.some((q) => Math.hypot(q[0] - cx, q[1] - cz) < 6)) continue; seen.push([cx, cz]);
          const la = Math.hypot(rx, rz), lb = Math.hypot(sx, sz), ax = rx / la, az = rz / la, bx = sx / lb, bz = sz / lb, sin = Math.max(0.35, Math.abs(ax * bz - az * bx));
          const ea = (R[b].hw + 0.3) / sin, eb = (R[a].hw + 0.3) / sin; // extent along road a / road b
          // stop at a road that ENDS here (T-junction) so we don't wipe the far kerb line
          const ra = R[a], rb = R[b];
          const endA = !ra.closed ? Math.min(U.pathNearest(ra.pi, cx, cz, -1).s, ra.pi.len - U.pathNearest(ra.pi, cx, cz, -1).s) : 99;
          const endB = !rb.closed ? Math.min(U.pathNearest(rb.pi, cx, cz, -1).s, rb.pi.len - U.pathNearest(rb.pi, cx, cz, -1).s) : 99;
          let a0 = -ea, a1 = ea, b0 = -eb, b1 = eb;
          if (endA < 3) { const sA = U.pathNearest(ra.pi, cx, cz, -1).s; if (sA < 3) a0 = Math.max(a0, -0.6); else a1 = Math.min(a1, 0.6); }
          if (endB < 3) { const sB = U.pathNearest(rb.pi, cx, cz, -1).s; if (sB < 3) b0 = Math.max(b0, -0.6); else b1 = Math.min(b1, 0.6); }
          // keep A's direction pointing "into" road A's existing part
          const dirA = U.pathAt(ra.pi, U.pathNearest(ra.pi, cx, cz, -1).s); const sgA = dirA.dx * ax + dirA.dz * az < 0 ? -1 : 1;
          const dirB = U.pathAt(rb.pi, U.pathNearest(rb.pi, cx, cz, -1).s); const sgB = dirB.dx * bx + dirB.dz * bz < 0 ? -1 : 1;
          const cor = [[a0, b0], [a1, b0], [a1, b1], [a0, b1]].map(([i, j]) => { const x = cx + ax * sgA * i + bx * sgB * j, z = cz + az * sgA * i + bz * sgB * j; return [x, W.height(x, z) + 0.25, z]; });
          // make the quad face up
          const n = (cor[1][0] - cor[0][0]) * (cor[2][2] - cor[0][2]) - (cor[1][2] - cor[0][2]) * (cor[2][0] - cor[0][0]);
          const tri = n < 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
          tri.forEach((k) => { pos.push(cor[k][0], cor[k][1], cor[k][2]); uv.push(cor[k][0] / 14, cor[k][2] / 14); });
        }
      }
    }
    if (!pos.length) return;
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    const m = new T.Mesh(g, new T.MeshLambertMaterial({ map: roadTex('plain'), polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -12 })); m.renderOrder = 1; scene.add(m); SC.junctions = m; SC.junctionN = pos.length / 18;
  }

  function buildWater(scene) {
    const g = new T.CircleGeometry(1, 64); g.rotateX(-PI / 2);
    const m = new T.Mesh(g, new T.MeshPhongMaterial({ color: 0x2fa8f0, transparent: true, opacity: 0.82, shininess: 90, specular: 0x99ccff }));
    m.scale.set(W.LAKE.rx * 1.28, 1, W.LAKE.rz * 1.28); m.position.set(W.LAKE.x, 0, W.LAKE.z); scene.add(m); SC.water = m;
    const ice = new T.Mesh(g.clone(), new T.MeshPhongMaterial({ color: 0xe6f6ff, transparent: true, opacity: 0.45, shininess: 120, specular: 0xffffff }));
    ice.scale.set(W.ICE.rx, 1, W.ICE.rz); ice.position.set(W.ICE.x, W.ICE.h + 0.12, W.ICE.z); scene.add(ice);
  }

  // ---- buildings ----
  function house(x, z, rot, r, statics) {
    const w = 10 + r() * 4, d = 9 + r() * 3, h = 4.5 + r() * 2.5, y = W.height(x, z) - 0.3;
    const wallC = ['#fff1d6', '#ffd6e7', '#d6f0ff', '#e0ffd6', '#fff7a8', '#e8dcff'][(r() * 6) | 0], roofC = ['#c0392b', '#7a4a2a', '#3b6fb6', '#4a7a3b', '#8a4fbf'][(r() * 5) | 0];
    const parts = [U.paint(new T.BoxGeometry(w, h, d).translate(0, h / 2, 0), wallC)];
    const rf = M.ext([['m', -d / 2 - 0.8, 0], ['l', d / 2 + 0.8, 0], ['l', 0, 3.4]], w + 1, 0.12, 2); rf.translate(0, h, 0); parts.push(U.paint(rf, roofC));
    parts.push(U.paint(new T.BoxGeometry(1.6, 2.6, 0.2).translate(0, 1.3, d / 2 + 0.05), '#7a4a2a'));
    // real 3D windows: white frame + deep sill + shutters, glass set back inside the frame (front, back and both sides)
    const trimC = '#ffffff', shutC = roofC;
    const win = (lx, lz, ry) => { const wp = [U.paint(new T.BoxGeometry(1.5, 1.3, 0.06).translate(0, 0, 0.02), '#3d6aa8'), U.paint(new T.BoxGeometry(1.8, 0.16, 0.22).translate(0, 0.73, 0.1), trimC), U.paint(new T.BoxGeometry(2.0, 0.14, 0.4).translate(0, -0.72, 0.18), trimC), U.paint(new T.BoxGeometry(0.16, 1.3, 0.22).translate(-0.83, 0, 0.1), trimC), U.paint(new T.BoxGeometry(0.16, 1.3, 0.22).translate(0.83, 0, 0.1), trimC), U.paint(new T.BoxGeometry(0.06, 1.3, 0.12).translate(0, 0, 0.06), trimC), U.paint(new T.BoxGeometry(0.55, 1.4, 0.08).translate(-1.2, 0, 0.06), shutC), U.paint(new T.BoxGeometry(0.55, 1.4, 0.08).translate(1.2, 0, 0.06), shutC)];
      const g = U.merge(wp); g.rotateY(ry); g.translate(lx, 2.6, lz); parts.push(g); };
    win(-w / 4 - 0.5, d / 2, 0); win(w / 4 + 0.5, d / 2, 0); win(-w / 4, -d / 2, PI); win(w / 4, -d / 2, PI); win(w / 2, 0, PI / 2); win(-w / 2, 0, -PI / 2);
    // porch roof + step in front of the door
    parts.push(U.paint(new T.BoxGeometry(2.8, 0.18, 1.4).rotateX(-0.2).translate(0, 3.35, d / 2 + 0.7), roofC)); parts.push(U.paint(new T.BoxGeometry(2.6, 0.3, 1.2).translate(0, 0.15, d / 2 + 0.6), '#cbd5e1'));
    parts.push(U.paint(new T.BoxGeometry(1, 2.6, 1).translate(w / 3, h + 2.2, -1), '#8a5a4a'));
    const g = U.merge(parts); U.xf(g, x, y, z, 0, rot, 0); statics.push(g);
    const ex = Math.abs(Math.sin(rot)) > 0.5 ? d / 2 : w / 2, ez = Math.abs(Math.sin(rot)) > 0.5 ? w / 2 : d / 2;
    W.addBox(x - ex, z - ez, x + ex, z + ez, y + h + 3.4, 'house');
    // every house is a real home you can visit
    const nx = Math.round(Math.sin(rot)), nz = Math.round(Math.cos(rot)), fx = x + nx * d / 2, fz = z + nz * d / 2;
    const fam = FAMILIES[(r() * FAMILIES.length) | 0];
    GR.BLD.door(fx, fz, nx, nz, y + 0.3, null, '#4ade80', 1.6);
    GR.BLD.addDoorPt(fx + nx * 1.6, fz + nz * 1.6);
    GR.BLD.register({ variant: 'home', icon: '🏠', name: 'The ' + fam + ' Family Home', short: fam.toUpperCase() + ' HOUSE', x, z, dx: nx, dz: nz, door: { x: fx + nx * 1.6, z: fz + nz * 1.6 }, region: W.region(x, z), wall: wallC, acc: roofC, fam });
  }
  const FAMILIES = ['Maple', 'Berry', 'Sunny', 'Pebble', 'Willow', 'Biscuit', 'Clover', 'Juniper', 'Marble', 'Puddle', 'Honey', 'Acorn', 'Rosie', 'Bramble', 'Pippin', 'Toffee'];
  function buildTown(statics) {
    const r = U.rng(9), T0 = W.TOWN;
    for (let bx = T0.x0; bx < T0.x1; bx += 100) for (let bz = T0.z0; bz < T0.z1; bz += 100) {
      const spots = [[bx + 28, bz + 22, PI], [bx + 72, bz + 22, PI], [bx + 28, bz + 78, 0], [bx + 72, bz + 78, 0], [bx + 22, bz + 50, -PI / 2], [bx + 78, bz + 50, PI / 2]];
      spots.forEach((s) => { if (GR.PL.blocksLot(s[0], s[1], 8, 8)) return; if (GR.SPOTS.some((p) => Math.hypot(p.x - s[0], p.z - s[1]) < 30) || W.pads.some((p) => p.tag && Math.hypot(p.x - s[0], p.z - s[1]) < 26)) return; if (r() < 0.12) return; const fx = s[0] + Math.round(Math.sin(s[2])) * 7, fz = s[1] + Math.round(Math.cos(s[2])) * 7; if (W.blocked(fx, fz, 0.6)) return; house(s[0], s[1], s[2], r, statics); });
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
    landDoor(ox + 7, oz, 1, 0, sy, 'observatory', '🔭', 'Grokmore Observatory', '#6366f1');
    const mx = S.x + 16, mz = S.z + 16; statics.push(U.paint(U.xf(new T.CylinderGeometry(0.4, 1.6, 40, 4), mx, sy + 20, mz), '#ef4444')); statics.push(U.paint(U.xf(new T.SphereGeometry(1, 8, 6), mx, sy + 41, mz), '#ffffff')); W.addCirc(mx, mz, 2, sy + 42, 'mast');
    { // summit flag: a real pole + 3D flag + a boxed wooden sign (no flat billboard)
      statics.push(U.paint(U.xf(new T.CylinderGeometry(0.18, 0.24, 12, 8), S.x, sy + 6, S.z), '#e5e7eb')); statics.push(U.paint(U.xf(new T.SphereGeometry(0.4, 10, 8), S.x, sy + 12.2, S.z), '#facc15'));
      statics.push(U.paint(U.xf(M.ext([['m', 0, 0], ['l', 4.2, 1.1], ['l', 0, 2.4]], 0.12, 0.03, 2), S.x, sy + 9.4, S.z, 0, PI / 2, 0), '#ff4fd8'));
      statics.push(U.paint(U.xf(M.rbox(5.2, 1.7, 0.4, 0.15), S.x, sy + 2.4, S.z + 0.6), '#8a5a2b')); statics.push(U.paint(U.xf(new T.BoxGeometry(0.25, 1.6, 0.25), S.x - 2.2, sy + 0.8, S.z + 0.6), '#6b4423')); statics.push(U.paint(U.xf(new T.BoxGeometry(0.25, 1.6, 0.25), S.x + 2.2, sy + 0.8, S.z + 0.6), '#6b4423'));
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 160; const cx = cv.getContext('2d'); cx.fillStyle = '#fef3c7'; cx.fillRect(0, 0, 512, 160); cx.fillStyle = '#3a1747'; cx.font = 'bold 84px "Trebuchet MS", "Apple Color Emoji", sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('🏔️ PEAK!', 256, 84);
      const tx = new T.CanvasTexture(cv); tx.anisotropy = 4; const pl = new T.Mesh(new T.PlaneGeometry(4.7, 1.4), new T.MeshLambertMaterial({ map: tx })); pl.position.set(S.x, sy + 2.4, S.z + 0.82); scene.add(pl);
    }
    // lighthouse
    const lx = 175, lz = 40, ly = W.height(lx, lz);
    for (let i = 0; i < 6; i++) statics.push(U.paint(U.xf(new T.CylinderGeometry(2.6 - i * 0.18 - 0.18, 2.6 - i * 0.18, 3.5, 14), lx, ly + 1.75 + i * 3.5, lz), i % 2 ? '#ffffff' : '#ef4444'));
    statics.push(U.paint(U.xf(new T.CylinderGeometry(1.6, 1.6, 2.4, 10), lx, ly + 22.2, lz), '#fff3a8')); statics.push(U.paint(U.xf(new T.ConeGeometry(2.2, 2.4, 10), lx, ly + 24.6, lz), '#334155')); W.addCirc(lx, lz, 2.8, ly + 26, 'light');
    landDoor(lx + 2.55, lz, 1, 0, ly, 'lighthouse', '💡', 'Sparkle Lighthouse', '#ef4444', 1.4);
    // marina dock
    const dx = -268, dz = 128; for (let i = 0; i < 6; i++) statics.push(U.paint(U.xf(new T.BoxGeometry(6, 0.4, 3), dx + i * 6, 0.6, dz), '#a0703c'));
    // wind turbines
    [[150, -480], [230, -540], [120, -610], [320, -470], [-150, -420]].forEach((p, i) => {
      const y = W.height(p[0], p[1]); statics.push(U.paint(U.xf(new T.CylinderGeometry(0.8, 1.4, 44, 10), p[0], y + 22, p[1]), '#f8fafc')); W.addCirc(p[0], p[1], 1.6, y + 44, 'turbine');
      const bl = []; for (let k = 0; k < 3; k++) bl.push(U.paint(U.xf(M.rbox(0.4, 18, 1.6, 0.2), 0, 9, 0, 0, 0, 0).rotateZ(k * PI * 2 / 3), '#f8fafc')); bl.push(U.paint(new T.SphereGeometry(1.4, 10, 8), '#e2e8f0'));
      const m = new T.Mesh(U.merge(bl), M.matMatte); m.position.set(p[0], y + 44, p[1] + 1.5); scene.add(m); SC.anim.push((t) => { m.rotation.z = t * 0.9 + i; });
    });
    // airfield: hangars + tower
    for (let i = 0; i < 3; i++) { const hx = 1225, hz = 420 + i * 70, y = W.height(hx, hz); const hg = new T.CylinderGeometry(14, 14, 30, 16, 1, false, 0, PI); hg.rotateZ(PI / 2); hg.rotateY(PI / 2); statics.push(U.paint(U.xf(hg, hx, y, hz), i === 1 ? '#94a3b8' : '#cbd5e1')); W.addBox(hx - 15, hz - 14, hx + 15, hz + 14, y + 14, 'hangar'); statics.push(U.paint(U.xf(new T.CircleGeometry(14, 16, 0, PI), hx - 15.02, y, hz, 0, -PI / 2, 0), '#64748b')); landDoor(hx - 15, hz, -1, 0, y, 'hangar', '🛩️', 'Hangar ' + (i + 1) + ' Workshop', '#0ea5e9', 3.2); }
    { const tx = 1215, tz = 330, y = W.height(tx, tz); statics.push(U.paint(U.xf(new T.CylinderGeometry(2.2, 3, 22, 10), tx, y + 11, tz), '#e2e8f0')); statics.push(U.paint(U.xf(new T.CylinderGeometry(5, 4, 4, 10), tx, y + 24, tz), '#38bdf8')); statics.push(U.paint(U.xf(new T.ConeGeometry(5.4, 2, 10), tx, y + 27, tz), '#334155')); W.addCirc(tx, tz, 3.2, y + 28, 'atc'); landDoor(tx - 2.7, tz, -1, 0, y, 'tower', '📡', 'Control Tower', '#38bdf8', 1.4); }
    // tundra outpost cabins + igloos
    [[330, -935], [300, -940], [600, -1000]].forEach((p, i) => { const y = W.height(p[0], p[1]); statics.push(U.paint(U.xf(new T.BoxGeometry(9, 4, 7), p[0], y + 2, p[1]), '#8a5a3b')); const rf = M.ext([['m', -4.5, 0], ['l', 4.5, 0], ['l', 0, 2.6]], 10, 0.1, 2); statics.push(U.paint(U.xf(rf, p[0], y + 4, p[1], 0, PI / 2, 0), '#f8fbff')); W.addBox(p[0] - 4.5, p[1] - 3.5, p[0] + 4.5, p[1] + 3.5, y + 6.6, 'cabin'); landDoor(p[0], p[1] + 3.5, 0, 1, y, 'cabin', '🛖', ['Snowy Cabin', 'Explorer Cabin', 'Husky Cabin'][i], '#b45309', 1.5); });
    [[450, -1230], [700, -1260], [820, -1120]].forEach((p, i) => { const y = W.height(p[0], p[1]); statics.push(U.paint(U.xf(new T.SphereGeometry(4, 14, 8, 0, PI * 2, 0, PI / 2), p[0], y, p[1]), '#f1f8ff')); statics.push(U.paint(U.xf(new T.CylinderGeometry(1.7, 1.7, 2.6, 12, 1, false, 0, PI), p[0], y, p[1] + 4.2, PI / 2, 0, 0), '#e6f2ff')); W.addCirc(p[0], p[1], 4, y + 4, 'igloo'); W.addBox(p[0] - 1.8, p[1] + 3, p[0] + 1.8, p[1] + 5.4, y + 2, 'igloo'); landDoor(p[0], p[1] + 5.45, 0, 1, y, 'igloo', '🧊', ['Penguin Igloo', 'Frosty Igloo', 'Polar Igloo'][i], '#0ea5e9', 1.4); });
    // giant cactus statue + dino at the desert museum
    { const x = 700, z = 1060, y = W.height(x, z); statics.push(U.paint(U.xf(new T.SphereGeometry(6, 14, 10), x, y + 7, z, 0, 0, 0, 1.6, 1, 1), '#4ade80')); statics.push(U.paint(U.xf(new T.CylinderGeometry(1.6, 2.4, 14, 10), x + 8, y + 12, z, 0, 0, -0.6), '#4ade80')); statics.push(U.paint(U.xf(new T.SphereGeometry(3, 12, 8), x + 13, y + 19, z), '#4ade80')); for (const s of [-1, 1]) statics.push(U.paint(U.xf(new T.CylinderGeometry(1, 1, 6, 8), x + s * 3, y + 3, z), '#3fae6c')); W.addCirc(x, z, 9, y + 20, 'dino'); }
  }

  // a real door (glowing frame + sign) on a landmark, leading into a generated interior
  function landDoor(x, z, nx, nz, y, variant, icon, name, acc, w) {
    GR.BLD.door(x, z, nx, nz, y, w && w < 2 ? null : icon + ' ' + name.toUpperCase(), acc, w || 2.2);
    GR.BLD.addDoorPt(x + nx * 1.6, z + nz * 1.6);
    GR.BLD.register({ variant, icon, name, short: name.toUpperCase(), x: x - nx * 3, z: z - nz * 3, dx: nx, dz: nz, door: { x: x + nx * 1.6, z: z + nz * 1.6 }, region: W.region(x, z), acc });
  }
  // stunt ramps: yellow/black kicker with chevrons + a landing strip
  function buildRamps(statics) {
    W.ramps.forEach((r) => {
      const n = 10, L = r.L, Wd = r.W, pos = [], col = [], c1 = new T.Color('#facc15'), c2 = new T.Color('#1f2937'), cs = new T.Color('#9ca3af');
      const pt = (u, s, up) => { const h = up ? r.H * Math.pow(u / L, 1.6) : 0, lx = s, lz = u - L / 2; return [r.x + r.fz * lx + r.fx * lz, r.y + h + (up ? 0.05 : -0.4), r.z - r.fx * lx + r.fz * lz]; };
      const tri = (a, b, c, k) => { [a, b, c].forEach((p) => { pos.push(p[0], p[1], p[2]); col.push(k.r, k.g, k.b); }); };
      for (let i = 0; i < n; i++) { const u0 = L * i / n, u1 = L * (i + 1) / n, k = i % 2 ? c1 : c2; const a = pt(u0, -Wd / 2, 1), b = pt(u0, Wd / 2, 1), c = pt(u1, Wd / 2, 1), d = pt(u1, -Wd / 2, 1); tri(a, c, b, k); tri(a, d, c, k);
        const a2 = pt(u0, -Wd / 2, 0), d2 = pt(u1, -Wd / 2, 0); tri(a2, d, a, cs); tri(a2, d2, d, cs); const b2 = pt(u0, Wd / 2, 0), c2b = pt(u1, Wd / 2, 0); tri(b2, b, c, cs); tri(b2, c, c2b, cs); }
      const e0 = pt(L, -Wd / 2, 0), e1 = pt(L, Wd / 2, 0), e2 = pt(L, Wd / 2, 1), e3 = pt(L, -Wd / 2, 1); tri(e0, e2, e1, cs); tri(e0, e3, e2, cs);
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); statics.push(g);
      // flags at the lip
      [-1, 1].forEach((sd) => { const p = pt(L, sd * (Wd / 2 + 0.4), 0); statics.push(U.paint(U.xf(new T.CylinderGeometry(0.06, 0.06, 4, 5), p[0], p[1] + 2, p[2]), '#e5e7eb')); statics.push(U.paint(U.xf(new T.BoxGeometry(0.05, 0.7, 1.1), p[0], p[1] + 3.6, p[2] + 0.5), '#ff4fd8')); });
    });
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
      if (W.ramps.some((q) => Math.hypot(q.x + q.fx * 20 - x, q.z + q.fz * 20 - z) < 45)) return false;
      if (GR.PL.nearDoor(x, z, 7)) return false;
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
    for (const k in L) { SC.treeCounts[k] = L[k].length; if (L[k].length) { const im = instanced({ round: roundG, pine: pineG, snow: snowG, cactus: cactusG, rock: rockG, red: redRockG }[k], L[k], scene); GR.QTHIN = GR.QTHIN || []; GR.QTHIN.push(im); } }
  }

  // ---- markers ----
  const TYPE_COL = { garage: '#4ade80', dealer: '#ffd23f', job: '#3ff0ff', race: '#ff4fd8' };
  function ringTex() {
    const c = document.createElement('canvas'); c.width = 4; c.height = 64; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.95)'); x.fillStyle = g; x.fillRect(0, 0, 4, 64); return new T.CanvasTexture(c);
  }
  SC.ringTex = null;
  SC.marker = function (x, z, color, icon, label, r) {
    SC.ringTex = SC.ringTex || ringTex();
    const G = new T.Group(), y = W.gy(x, z);
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
