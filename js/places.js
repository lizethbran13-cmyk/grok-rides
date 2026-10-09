/* Grok Rides - enterable places: building exteriors (storefronts, signs, awnings, glowing doors),
   nicer street-level shop fronts for the city, and the walking person model. Interiors live in interiors.js */
(function () {
  'use strict';
  const GR = window.GR, U = GR.U, W = GR.W, M = GR.M, T = THREE, PI = Math.PI;
  const PL = GR.PL = { list: [], byId: {} };

  // ---------- which places exist (every region) ----------
  // anchor: a SPOT id (building goes next to it, door facing it) or at:[x,z] (door faces the nearest road)
  GR.PLACES_IN = [
    { id: 'showroom', name: 'Grok Motors Showroom', short: 'GROK MOTORS', icon: '🚗', kind: 'showroom', anchor: 'dealer', spot: 'dealer', wall: '#eef2f8', acc: '#ff4fd8', w: 26, d: 20, h: 10, region: 'city' },
    { id: 'citygarage', name: 'Grok City Paint & Tune', short: 'PAINT & TUNE', icon: '🔧', kind: 'garage', anchor: 'g_city', spot: 'g_city', wall: '#dfe6ee', acc: '#22c55e', w: 24, d: 18, h: 9, region: 'city' },
    { id: 'dispatch', name: 'Grok Dispatch (Job Office)', short: 'GROK DISPATCH', icon: '📋', kind: 'jobs', anchor: 'j_taxi', wall: '#f6e7c8', acc: '#f59e0b', w: 22, d: 16, h: 9, region: 'city' },
    { id: 'hotel', name: 'Grand Grok Hotel', short: 'GRAND GROK HOTEL', icon: '🏨', kind: 'hotel', anchor: 'j_limo', wall: '#f3e3ef', acc: '#a855f7', w: 26, d: 20, h: 30, region: 'city' },
    { id: 'raceclub', name: 'Grok Race Club HQ', short: 'RACE CLUB', icon: '🏁', kind: 'raceclub', at: [750, 50], wall: '#e9e9f2', acc: '#ef4444', w: 24, d: 18, h: 11, region: 'city' },
    { id: 'burger', name: 'Burger Blast', short: 'BURGER BLAST', icon: '🍔', kind: 'diner', at: [450, 50], wall: '#fff1d6', acc: '#ef4444', w: 20, d: 16, h: 8, region: 'city' },
    { id: 'store', name: 'Pine Hollow General Store', short: 'GENERAL STORE', icon: '🏪', kind: 'store', at: [-350, 350], wall: '#d9b98c', acc: '#16a34a', w: 20, d: 15, h: 8, region: 'town' },
    { id: 'diner', name: 'Maple Diner', short: 'MAPLE DINER', icon: '🥞', kind: 'diner', at: [-650, 550], wall: '#dbe4ec', acc: '#ec4899', w: 20, d: 15, h: 7, region: 'town' },
    { id: 'pizza', name: 'Pine Hollow Pizza', short: 'PIZZA', icon: '🍕', kind: 'pizza', anchor: 'j_pizza', spot: 'j_pizza', wall: '#fde6c8', acc: '#dc2626', w: 18, d: 14, h: 7, region: 'town' },
    { id: 'towngarage', name: 'Pine Hollow Garage', short: 'GARAGE', icon: '🔧', kind: 'garage', anchor: 'g_town', spot: 'g_town', wall: '#e2d6c4', acc: '#22c55e', w: 22, d: 16, h: 8, region: 'town' },
    { id: 'gasdesert', name: 'Cactus Gas & Mini Mart', short: 'CACTUS GAS', icon: '⛽', kind: 'gas', anchor: 'g_desert', spot: 'g_desert', wall: '#fde8cf', acc: '#f97316', w: 20, d: 14, h: 7, region: 'desert' },
    { id: 'trading', name: 'Sizzle Trading Post', short: 'TRADING POST', icon: '🌵', kind: 'trading', anchor: 'j_cargo', wall: '#d9a26a', acc: '#b45309', w: 20, d: 15, h: 7, region: 'desert' },
    { id: 'icecafe', name: 'Frostbite Ice Cafe & Research Outpost', short: 'ICE CAFE', icon: '❄️', kind: 'icecafe', anchor: 'g_tundra', wall: '#dbeefe', acc: '#0ea5e9', w: 22, d: 16, h: 8, region: 'tundra' },
    { id: 'lodge', name: 'Grokmore Mountain Lodge', short: 'MOUNTAIN LODGE', icon: '🏔️', kind: 'lodge', anchor: 'g_mtn', wall: '#8b5a2b', acc: '#b91c1c', w: 22, d: 16, h: 9, slope: 14, region: 'mountain' },
    { id: 'skyhangar', name: 'Sky Field Aircraft Hangar', short: 'SKY FIELD AIRCRAFT', icon: '🛩️', kind: 'showroom', anchor: 'hangar', spot: 'hangar', wall: '#e5e7eb', acc: '#0ea5e9', w: 30, d: 22, h: 12, region: 'airfield' },
    { id: 'boatshop', name: 'Sparkle Marina Boat Shop', short: 'BOAT SHOP', icon: '⚓', kind: 'showroom', anchor: 'marina', spot: 'marina', wall: '#e0f2fe', acc: '#2563eb', w: 22, d: 16, h: 8, region: 'lake' },
    { id: 'gashwy', name: 'Grok Gas (Highway Stop)', short: 'GROK GAS', icon: '⛽', kind: 'gas', at: [-380, -150], wall: '#f1f5f9', acc: '#ff4fd8', w: 20, d: 14, h: 7, region: 'country' }
  ];

  // ---------- layout: find a free, flat lot for each building (axis-aligned, door facing the anchor / a road) ----------
  const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  function footprintOk(cx, cz, hw, hd, pad, maxS) {
    let hmin = 1e9, hmax = -1e9;
    for (let x = cx - hw - pad; x <= cx + hw + pad + 0.01; x += 3) for (let z = cz - hd - pad; z <= cz + hd + pad + 0.01; z += 3) {
      if (W.roadD(x, z) < 1.5) return null; if (W.surface(x, z) === 5 || W.ellQ(W.LAKE, x, z) < 1.15) return null;
      if (W.blocked(x, z, 0.5)) return null;
      if (W.pads.some((p) => Math.hypot(p.x - x, p.z - z) < 12)) return null;
      const h = W.height(x, z); if (h < hmin) hmin = h; if (h > hmax) hmax = h;
    }
    return hmax - hmin < (maxS || 3.2) ? { hmin, hmax } : null;
  }
  PL.layout = function () {
    PL.list = []; PL.byId = {};
    GR.PLACES_IN.forEach((def) => {
      const sp = def.anchor ? GR.SPOTS.find((s) => s.id === def.anchor) : null; const ax = sp ? sp.x : def.at[0], az = sp ? sp.z : def.at[1];
      let best = null;
      for (let ox = -64; ox <= 64; ox += 4) for (let oz = -64; oz <= 64; oz += 4) {
        const cx = ax + ox, cz = az + oz; if (Math.hypot(ox, oz) > 64) continue;
        for (let k = 0; k < 4; k++) {
          const [dx, dz] = DIRS[k], hw = dx ? def.d / 2 : def.w / 2, hd = dx ? def.w / 2 : def.d / 2;
          const doorX = cx + dx * (def.d / 2 + 1.5), doorZ = cz + dz * (def.d / 2 + 1.5);
          const rd = W.roadD(doorX, doorZ); if (rd < (def.minRd || 2.5) || rd > 26) continue;
          // the door must look toward the anchor / road
          let score;
          if (sp) { const tx = ax - doorX, tz = az - doorZ, dd = Math.hypot(tx, tz); if ((tx * dx + tz * dz) < dd * 0.35) continue; score = Math.abs(dd - 16) + rd * 0.3; }
          else { const nr = W.nearestRoad(doorX, doorZ); if (!nr) continue; const tx = nr.x - doorX, tz = nr.z - doorZ, dd = Math.hypot(tx, tz) || 1; if ((tx * dx + tz * dz) < dd * 0.6) continue; score = Math.hypot(ox, oz) * 0.5 + rd; }
          if (best && score >= best.score) continue;
          if (PL.list.some((q) => Math.abs(q.x - cx) < q.hw + hw + 6 && Math.abs(q.z - cz) < q.hd + hd + 6)) continue;
          const fp = footprintOk(cx, cz, hw, hd, 3, def.slope); if (!fp) continue;
          // clear walk-up area in front of the door
          let clear = true; for (let s = 1; s < 7; s += 2) if (W.blocked(cx + dx * (def.d / 2 + s), cz + dz * (def.d / 2 + s), 1)) clear = false; if (!clear) continue;
          best = { score, cx, cz, k, hw, hd, fp };
        }
      }
      if (!best) { console.warn('no lot for', def.id); return; }
      const [dx, dz] = DIRS[best.k];
      const fx = best.cx + dx * def.d / 2, fz = best.cz + dz * def.d / 2;
      const p = Object.assign({}, def, { x: best.cx, z: best.cz, dir: best.k, dx, dz, hw: best.hw, hd: best.hd, yaw: Math.atan2(dx, dz), floor: W.height(fx, fz) + Math.max(W.sideH(fx + dx * 1.5, fz + dz * 1.5), W.sideH(fx - dx * 1.5, fz - dz * 1.5)) });
      p.sink = Math.max(0, p.floor - best.fp.hmin);
      p.door = { x: p.x + dx * (def.d / 2 + 1.6), z: p.z + dz * (def.d / 2 + 1.6) };
      p.box = W.addBox(p.x - p.hw, p.z - p.hd, p.x + p.hw, p.z + p.hd, p.floor + def.h, 'place');
      PL.list.push(p); PL.byId[p.id] = p;
    });
  };
  PL.blocksLot = (cx, cz, hw, hd) => PL.list.some((q) => Math.abs(q.x - cx) < q.hw + hw + 4 && Math.abs(q.z - cz) < q.hd + hd + 4);

  // ---------- canvas helpers ----------
  function cvs(w, h, f) { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.anisotropy = 4; return t; }
  function rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
  function shade(hex, k) { const c = new T.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); }
  function frontTex(p) {
    const kind = p.kind;
    return cvs(512, 256, (x, w, h) => {
      // wall
      x.fillStyle = p.wall; x.fillRect(0, 0, w, h);
      if (kind === 'lodge') { for (let y = 0; y < h; y += 16) { x.fillStyle = y % 32 ? '#7a4c22' : '#8f5a2c'; x.fillRect(0, y, w, 15); x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, y + 14, w, 2); } }
      if (kind === 'trading') { x.fillStyle = 'rgba(120,60,20,.12)'; for (let i = 0; i < 60; i++) x.fillRect(Math.random() * w, Math.random() * h, 8, 4); }
      if (kind === 'diner') { x.fillStyle = '#cfd6df'; x.fillRect(0, 40, w, h - 40); x.fillStyle = p.acc; x.fillRect(0, 180, w, 14); x.fillStyle = '#fff'; x.fillRect(0, 194, w, 4); }
      if (kind === 'raceclub') { for (let i = 0; i < 32; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? '#111' : '#fff'; x.fillRect(i * 16, 44 + j * 10, 16, 10); } }
      // (sign, windows, door and garage doors are real 3D geometry now - see buildExteriors)
      x.fillStyle = 'rgba(0,0,0,.08)'; for (let y = 0; y < h; y += 32) x.fillRect(0, y + 30, w, 2);
    });
  }
  function sideTex(p) {
    return cvs(256, 256, (x, w, h) => {
      x.fillStyle = p.wall; x.fillRect(0, 0, w, h);
      if (p.kind === 'lodge') for (let y = 0; y < h; y += 16) { x.fillStyle = y % 32 ? '#7a4c22' : '#8f5a2c'; x.fillRect(0, y, w, 15); }
      const rows = p.kind === 'hotel' ? 8 : 2, cols = 3;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { const X = 20 + i * 80, Y = 30 + j * (210 / rows); x.fillStyle = '#7dd3fc'; x.fillRect(X, Y, 50, 210 / rows - 18); x.fillStyle = '#fff6c8'; if ((i + j) % 3 === 0) x.fillRect(X + 4, Y + 4, 42, 210 / rows - 26); x.strokeStyle = shade(p.wall, 0.7); x.lineWidth = 4; x.strokeRect(X, Y, 50, 210 / rows - 18); }
    });
  }
  function stripeTex(c1, c2) { return cvs(128, 16, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? c1 : c2; x.fillRect(i * 16, 0, 16, h); } }); }
  function signTex(text, bg, fg) { return cvs(512, 128, (x, w, h) => { x.fillStyle = bg; rr(x, 4, 4, w - 8, h - 8, 26); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 8; x.stroke(); x.fillStyle = fg || '#fff'; x.font = 'bold 56px "Trebuchet MS", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = fg || '#fff'; x.shadowBlur = 14; x.fillText(text, w / 2, h / 2 + 3); }); }
  const lam = (c) => new T.MeshLambertMaterial({ color: c });
  function addMesh(g, geo, mat, x, y, z, ry) { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); if (ry) m.rotation.y = ry; g.add(m); return m; }

  // ---------- exterior building ----------
  PL.buildExteriors = function (scene) {
    PL.list.forEach((p) => {
      if (p.kind === 'myhome') { GR.Home.exterior(scene, p); return; }
      const g = new T.Group(); g.position.set(p.x, p.floor, p.z); g.rotation.y = p.yaw;
      const ft = frontTex(p), st = sideTex(p), roof = lam(shade(p.wall, 0.75));
      const sideM = new T.MeshLambertMaterial({ map: st }), frontM = new T.MeshLambertMaterial({ map: ft, emissive: 0x222222 }); PL.nightMats = PL.nightMats || []; PL.nightMats.push(frontM);
      // local +z = front. body: width w (x), depth d (z)
      const body = addMesh(g, new T.BoxGeometry(p.w, p.h + 3 + p.sink, p.d), [sideM, sideM, roof, roof, frontM, sideM], 0, (p.h - 3 - p.sink) / 2, 0);
      if (p.kind === 'hotel') { body.material[4] = new T.MeshLambertMaterial({ map: st }); const lobby = new T.MeshLambertMaterial({ map: ft, emissive: 0x222222 }); addMesh(g, new T.PlaneGeometry(p.w * 0.9, 8), lobby, 0, 4, p.d / 2 + 0.06); }
      // parapet + roof props
      addMesh(g, new T.BoxGeometry(p.w + 0.6, 0.8, p.d + 0.6), lam(shade(p.acc, 0.8)), 0, p.h + 0.4, 0);
      // big rooftop sign (lit)
      const sign = new T.Mesh(new T.PlaneGeometry(Math.min(p.w * 0.9, 18), 4.4), new T.MeshBasicMaterial({ map: signTex(p.icon + ' ' + p.short, p.acc), transparent: true }));
      sign.position.set(0, p.h + 3.4, p.d * 0.3 + 0.28); g.add(sign); p.sign = sign;
      addMesh(g, M.rbox(Math.min(p.w * 0.9, 18) - 0.3, 4.0, 0.5, 0.2), lam(shade(p.acc, 0.85)), 0, p.h + 3.4, p.d * 0.3); // the sign is a real box
      // real 3D street front: framed shop windows (glass recessed behind white frames + sills), roll-up garage doors, a 3D door
      { const fz = p.d / 2, P3 = [], add = (geo, c, x, y, z) => P3.push(U.paint(geo.translate(x, y, z), c));
        const trim = '#ffffff', frame = shade(p.acc, 0.7);
        const fwin = (cx, ww, y0, hh) => { add(new T.BoxGeometry(ww, hh, 0.1), '#ffd58a', cx, y0 + hh / 2, fz - 0.05); add(new T.BoxGeometry(ww + 0.5, 0.25, 0.4), trim, cx, y0 + hh + 0.12, fz + 0.15); add(new T.BoxGeometry(ww + 0.7, 0.2, 0.6), trim, cx, y0 - 0.1, fz + 0.25); add(new T.BoxGeometry(0.25, hh, 0.4), frame, cx - ww / 2 - 0.12, y0 + hh / 2, fz + 0.15); add(new T.BoxGeometry(0.25, hh, 0.4), frame, cx + ww / 2 + 0.12, y0 + hh / 2, fz + 0.15); for (let k = 1; k < 3; k++) add(new T.BoxGeometry(0.1, hh, 0.16), frame, cx - ww / 2 + ww * k / 3, y0 + hh / 2, fz + 0.06); };
        if (p.kind === 'garage') { [-0.3, 0.3].forEach((k) => { const cx = k * p.w, ww = Math.min(p.w * 0.3, 7); add(new T.BoxGeometry(ww + 0.6, 0.5, 0.5), '#555b66', cx, 4.6, fz + 0.2); for (let i = 0; i < 9; i++) add(new T.BoxGeometry(ww, 0.42, 0.14), i % 2 ? '#a3acb8' : '#b8c0cb', cx, 0.25 + i * 0.46, fz + 0.06); add(new T.BoxGeometry(0.3, 4.6, 0.5), '#555b66', cx - ww / 2 - 0.15, 2.3, fz + 0.2); add(new T.BoxGeometry(0.3, 4.6, 0.5), '#555b66', cx + ww / 2 + 0.15, 2.3, fz + 0.2); }); }
        else if (p.kind === 'showroom') { const ww = p.w - 4; for (let i = 0; i <= 6; i++) if (i !== 3) add(new T.BoxGeometry(0.22, 4.6, 0.3), '#e5e7eb', -ww / 2 + ww * i / 6, 2.6, fz + 0.12); add(new T.BoxGeometry(ww + 0.4, 0.3, 0.4), '#e5e7eb', 0, 5.0, fz + 0.15); add(new T.BoxGeometry(ww + 0.4, 0.4, 0.5), '#94a3b8', 0, 0.2, fz + 0.2); }
        else if (p.kind !== 'hotel') { const ww = Math.min(p.w * 0.28, 7); fwin(-p.w * 0.29, ww, 1.3, 2.3); fwin(p.w * 0.29, ww, 1.3, 2.3); }
        if (P3.length) { const mm = new T.Mesh(U.merge(P3), M.matMatte); g.add(mm); }
        const dw = wpos(p, 0, fz); GR.BLD.door(dw.x, dw.z, Math.sin(p.yaw), Math.cos(p.yaw), p.floor, null, p.acc, 2.4);
      }
      addMesh(g, new T.BoxGeometry(0.3, 2.4, 0.3), lam('#555'), -Math.min(p.w * 0.9, 18) * 0.35, p.h + 1.2, p.d * 0.3);
      addMesh(g, new T.BoxGeometry(0.3, 2.4, 0.3), lam('#555'), Math.min(p.w * 0.9, 18) * 0.35, p.h + 1.2, p.d * 0.3);
      // awning over the windows
      if (p.kind !== 'showroom' && p.kind !== 'garage') { const aw = addMesh(g, new T.BoxGeometry(p.w * 0.86, 0.22, 2.4), new T.MeshLambertMaterial({ map: stripeTex(p.acc, '#ffffff') }), 0, 4.1 * (p.h > 9 && p.kind !== 'hotel' ? 1 : 0.95), p.d / 2 + 1.1); aw.rotation.x = 0.28; }
      // glowing door frame + mat + hovering ENTER sign
      addMesh(g, new T.BoxGeometry(4.2, 0.12, 2.4), new T.MeshBasicMaterial({ color: 0x4ade80 }), 0, 0.06, p.d / 2 + 1.3);
      const tag = M.sprite('🚪 ' + p.name, { color: '#ffffff', bg: 'rgba(22,101,52,.85)', wide: 6, scale: 1.5, fs: 0.42, bold: true }); tag.position.set(0, 4.1, p.d / 2 + 3.2); tag.visible = false; g.add(tag); p.tag = tag;
      // step / sidewalk pad
      addMesh(g, new T.BoxGeometry(p.w + 4, 0.25, 6), lam('#d1d5db'), 0, -0.05, p.d / 2 + 3);
      kindProps(p, g);
      scene.add(g); p.group = g;
    });
    GR.SC.anim.push((t) => { PL.list.forEach((p) => { if (p.tag) { p.tag.position.y = 4.1 + Math.sin(t * 2 + p.x) * 0.12; const v = GR.G && GR.G.viewVeh && GR.G.viewVeh(); p.tag.visible = !!v && Math.hypot(v.x - p.door.x, v.z - p.door.z) < 20; } if (p.spin) p.spin.rotation.y = t * 0.6; }); });
  };
  function wpos(p, lx, lz) { const c = Math.cos(p.yaw), s = Math.sin(p.yaw); return { x: p.x + lx * c + lz * s, z: p.z - lx * s + lz * c }; }
  function kindProps(p, g) {
    const fz = p.d / 2;
    if (p.kind === 'gas') {
      // canopy + 2 pumps beside the shop
      const side = p.w / 2 + 6;
      [[-4, 6], [4, 6], [-4, 14], [4, 14]].forEach(([ox, oz]) => { addMesh(g, new T.CylinderGeometry(0.25, 0.25, 6, 8), lam('#e5e7eb'), side + ox, 3, fz - 10 + oz); const w = wpos(p, side + ox, fz - 10 + oz); W.addCirc(w.x, w.z, 0.4, 6, 'post'); });
      addMesh(g, new T.BoxGeometry(11, 0.7, 11), new T.MeshLambertMaterial({ color: p.acc, emissive: 0x331100 }), side, 6.2, fz);
      [-2, 2].forEach((ox) => { const pm = addMesh(g, new T.BoxGeometry(1.2, 2, 0.8), lam('#f8fafc'), side + ox, 1, fz); addMesh(g, new T.BoxGeometry(1.0, 0.6, 0.1), new T.MeshBasicMaterial({ color: 0x22c55e }), side + ox, 1.5, fz + 0.42); void pm; const w = wpos(p, side + ox, fz); W.addCirc(w.x, w.z, 0.8, 2, 'pump'); });
      const pr = new T.Mesh(new T.PlaneGeometry(3, 4), new T.MeshBasicMaterial({ map: signTex('⛽ $2.99', '#111827', '#fde047'), side: T.DoubleSide })); pr.position.set(-p.w / 2 - 3, 5, fz + 2); g.add(pr);
      addMesh(g, new T.CylinderGeometry(0.2, 0.2, 5, 6), lam('#555'), -p.w / 2 - 3, 2.5, fz + 2); const w = wpos(p, -p.w / 2 - 3, fz + 2); W.addCirc(w.x, w.z, 0.3, 5, 'post');
    } else if (p.kind === 'showroom') {
      // a shiny car on a spinning podium out front
      const types = p.spot === 'hangar' ? 'heli' : p.spot === 'marina' ? 'boat' : 'super';
      addMesh(g, new T.CylinderGeometry(3.6, 3.8, 0.6, 24), lam('#e5e7eb'), p.w / 2 - 4, 0.3, fz + 5);
      const car = M.vehicle(types, '#ff4fd8'); const holder = new T.Group(); holder.position.set(p.w / 2 - 4, 0.6, fz + 5); holder.add(car); g.add(holder); p.spin = holder;
      const w = wpos(p, p.w / 2 - 4, fz + 5); W.addCirc(w.x, w.z, 3.8, 2, 'podium');
    } else if (p.kind === 'garage') {
      for (let i = 0; i < 3; i++) addMesh(g, new T.TorusGeometry(0.45, 0.22, 6, 12), lam('#222'), -p.w / 2 + 1.5, 0.25 + i * 0.42, fz + 1.5).rotation.x = PI / 2;
      const w = wpos(p, -p.w / 2 + 1.5, fz + 1.5); W.addCirc(w.x, w.z, 0.8, 1.5, 'tires');
    } else if (p.kind === 'hotel') {
      [-6, 6].forEach((ox) => { addMesh(g, new T.CylinderGeometry(0.12, 0.12, 9, 6), lam('#ddd'), ox, 4.5, fz + 4); addMesh(g, new T.PlaneGeometry(2.2, 1.4), new T.MeshLambertMaterial({ color: p.acc, side: T.DoubleSide }), ox + 1.1, 8, fz + 4); const w = wpos(p, ox, fz + 4); W.addCirc(w.x, w.z, 0.25, 9, 'flag'); });
      addMesh(g, new T.BoxGeometry(3, 0.08, 6), lam('#b91c1c'), 0, 0.12, fz + 3);
    } else if (p.kind === 'lodge') {
      addMesh(g, new T.BoxGeometry(2, 5, 2), lam('#6b7280'), p.w / 2 - 3, p.h + 2, -2);
      const gable = new T.Mesh(new T.CylinderGeometry(0.01, p.w * 0.62, 4, 4, 1), lam('#7f1d1d')); gable.rotation.y = PI / 4; gable.scale.set(1, 1, p.d / p.w); gable.position.set(0, p.h + 2.4, 0); g.add(gable);
      p.smoke = wpos(p, p.w / 2 - 3, -2);
    } else if (p.kind === 'raceclub') {
      const cup = new T.Group(); cup.position.set(-p.w / 2 + 4, p.h + 0.8, -2);
      cup.add(new T.Mesh(new T.CylinderGeometry(1.6, 0.5, 3, 16), new T.MeshPhongMaterial({ color: 0xffcf3a, shininess: 90 }))); cup.children[0].position.y = 3.2;
      cup.add(new T.Mesh(new T.CylinderGeometry(0.3, 0.3, 1.6, 8), new T.MeshPhongMaterial({ color: 0xffcf3a }))); cup.children[1].position.y = 1;
      cup.add(new T.Mesh(new T.BoxGeometry(2, 0.5, 2), lam('#333'))); g.add(cup);
    } else if (p.kind === 'pizza') {
      const sl = new T.Mesh(new T.CylinderGeometry(3, 3, 0.4, 3, 1, false, 0, PI / 3), new T.MeshLambertMaterial({ color: 0xfacc15 })); sl.rotation.x = PI / 2; sl.position.set(-p.w / 2 + 3, p.h + 4.5, p.d * 0.1); g.add(sl);
    } else if (p.kind === 'store' || p.kind === 'trading') {
      [[-p.w / 2 + 1.2, fz + 1.2], [-p.w / 2 + 2.6, fz + 1.0]].forEach(([ox, oz]) => { addMesh(g, new T.CylinderGeometry(0.5, 0.5, 1.1, 10), lam('#8b5a2b'), ox, 0.55, oz); const w = wpos(p, ox, oz); W.addCirc(w.x, w.z, 0.55, 1.1, 'barrel'); });
      if (p.kind === 'trading') for (let i = -3; i <= 3; i++) addMesh(g, new T.CylinderGeometry(0.2, 0.2, 1.4, 6), lam('#6b4423'), i * 2.6, p.h - 1, fz + 0.5).rotation.x = PI / 2;
    } else if (p.kind === 'icecafe') {
      const dish = new T.Mesh(new T.SphereGeometry(2, 14, 8, 0, PI * 2, 0, PI / 2), lam('#f8fafc')); dish.rotation.x = -0.9; dish.position.set(p.w / 2 - 3, p.h + 2, -2); g.add(dish);
      addMesh(g, new T.CylinderGeometry(0.1, 0.1, 6, 6), lam('#94a3b8'), -p.w / 2 + 2, p.h + 3, -3);
    } else if (p.kind === 'diner') {
      const ns = new T.Mesh(new T.PlaneGeometry(6, 1.6), new T.MeshBasicMaterial({ map: signTex('OPEN 24/7', '#1e1b4b', '#ff4fd8'), transparent: true, side: T.DoubleSide })); ns.position.set(p.w / 2 - 3.5, 5.6, fz + 0.1); g.add(ns);
    }
  }

  // ---------- nicer city street level: storefronts with signs + awnings ----------
  const SHOPS = [['☕', 'CAFE', '#7c2d12'], ['📚', 'BOOKS', '#1d4ed8'], ['🧸', 'TOYS', '#db2777'], ['🌸', 'FLOWERS', '#be185d'], ['🎮', 'GAMES', '#7c3aed'], ['🥐', 'BAKERY', '#b45309'], ['🐶', 'PETS', '#0f766e'], ['👟', 'SHOES', '#334155'], ['🍦', 'ICE CREAM', '#ec4899'], ['💇', 'SALON', '#9333ea'], ['🏦', 'BANK', '#065f46'], ['💊', 'PHARMACY', '#15803d'], ['🎵', 'MUSIC', '#4338ca'], ['📱', 'PHONES', '#0369a1'], ['🍣', 'SUSHI', '#b91c1c'], ['🎨', 'ART', '#c2410c']];
  let shopTex = null;
  function storeAtlas() {
    if (shopTex) return shopTex;
    // per shop a 256x256 cell: top 64 px = the fascia sign (goes on a real 3D sign box), the rest = what you see THROUGH the
    // recessed shop window (shelves of goods, warm light). No painted doors - every real door is 3D geometry.
    shopTex = cvs(1024, 1024, (x) => {
      SHOPS.forEach((s, i) => {
        const X = (i % 4) * 256, Y = Math.floor(i / 4) * 256;
        x.fillStyle = s[2]; x.fillRect(X, Y, 256, 64); x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(X + 4, Y + 4, 248, 3); x.fillRect(X + 4, Y + 57, 248, 3);
        x.fillStyle = '#fff'; x.font = 'bold 34px "Trebuchet MS", "Apple Color Emoji", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s[0] + ' ' + s[1], X + 128, Y + 33);
        const g = x.createLinearGradient(0, Y + 64, 0, Y + 256); g.addColorStop(0, '#fff6d6'); g.addColorStop(1, '#ffd08a'); x.fillStyle = g; x.fillRect(X, Y + 64, 256, 192);
        x.fillStyle = 'rgba(120,80,40,.35)'; x.fillRect(X, Y + 64, 256, 10);
        const r = U.rng(i * 31 + 7), goods = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];
        for (let sh = 0; sh < 3; sh++) { const yy = Y + 120 + sh * 46; x.fillStyle = '#a16207'; x.fillRect(X + 8, yy, 240, 6); for (let k = 0; k < 9; k++) { x.fillStyle = goods[(r() * goods.length) | 0]; const w = 14 + r() * 8, hh = 14 + r() * 20; x.fillRect(X + 14 + k * 26, yy - hh, w, hh); } }
        x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.moveTo(X + 20, Y + 256); x.lineTo(X + 90, Y + 64); x.lineTo(X + 116, Y + 64); x.lineTo(X + 46, Y + 256); x.fill();
      });
    });
    shopTex.anisotropy = 8; return shopTex;
  }
  PL.SHOPS = SHOPS;
  // uv rect of shop s: region 'sign' or 'win'
  PL.shopUV = function (s, region) { const c = s % 4, rw = Math.floor(s / 4), u0 = c / 4 + 0.004, u1 = (c + 1) / 4 - 0.004, vt = 1 - rw / 4, v1 = region === 'sign' ? vt - 0.004 : vt - 64 / 1024, v0 = region === 'sign' ? vt - 64 / 1024 + 0.002 : vt - 1 / 4 + 0.004; return [u0, v0, u1, v1]; };
  // adds shop fronts around a city building footprint (called by scenery.buildCity)
  PL.cityFront = function (o, statics, x0, z0, x1, z1, y0, r, door) {
    const H = 5.2, sides = [[x0, z1, x1, z1, 0, 1], [x1, z1, x1, z0, 1, 0], [x1, z0, x0, z0, 0, -1], [x0, z0, x0, z1, -1, 0]];
    sides.forEach(([ax, az, bx, bz, nx, nz]) => {
      const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 12)), seg = len / n;
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n, px0 = U.lerp(ax, bx, t0) + nx * 0.08, pz0 = U.lerp(az, bz, t0) + nz * 0.08, px1 = U.lerp(ax, bx, t1) + nx * 0.08, pz1 = U.lerp(az, bz, t1) + nz * 0.08;
        if (door && door.nx === nx && door.nz === nz) { // the real door sits in this bay: plain wall + no painted shop door here
          const s0 = Math.min((px0 - door.x) * -nz + (pz0 - door.z) * nx, (px1 - door.x) * -nz + (pz1 - door.z) * nx), s1 = Math.max((px0 - door.x) * -nz + (pz0 - door.z) * nx, (px1 - door.x) * -nz + (pz1 - door.z) * nx);
          if (s0 < 1.8 && s1 > -1.8) { const mx = (px0 + px1) / 2, mz = (pz0 + pz1) / 2, ang = Math.atan2(nx, nz); statics.push(U.paint(new T.BoxGeometry(seg, H, 0.2).rotateY(ang).translate(mx - nx * 0.1, y0 + H / 2, mz - nz * 0.1), '#e8e4dc')); statics.push(U.paint(new T.BoxGeometry(seg * 0.9, 0.18, 2.0).rotateX(0.25).rotateY(ang).translate(mx + nx * 1.0, y0 + H - 0.9, mz + nz * 1.0), door.acc || '#4ade80')); continue; }
        }
        const s = (r() * SHOPS.length) | 0, u0 = (s % 4) / 4 + 0.004, u1 = (s % 4 + 1) / 4 - 0.004, v0 = 1 - (Math.floor(s / 4) + 1) / 4 + 0.004, v1 = 1 - Math.floor(s / 4) / 4 - 0.004;
        const b = o.p.length / 3;
        o.p.push(px0, y0, pz0, px1, y0, pz1, px1, y0 + H, pz1, px0, y0 + H, pz0);
        for (let k = 0; k < 4; k++) o.n.push(nx, 0, nz);
        o.uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
        o.i.push(b, b + 1, b + 2, b, b + 2, b + 3);
        // awning
        if (r() < 0.75) { const mx = (px0 + px1) / 2 + nx * 1.1, mz = (pz0 + pz1) / 2 + nz * 1.1, ang = Math.atan2(nx, nz); statics.push(U.paint(new T.BoxGeometry(seg * 0.82, 0.18, 2.2).rotateX(0.3).rotateY(ang).translate(mx, y0 + H - 0.9, mz), i % 2 ? SHOPS[s][2] : '#ffffff')); }
      }
    });
  };
  PL.cityFrontMesh = function (o) {
    PL.nFronts = o.i.length / 6;
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(o.p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(o.n, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(o.uv, 2)); g.setIndex(o.i);
    PL.frontMat = new T.MeshLambertMaterial({ map: storeAtlas(), emissive: 0x2a2a2a }); return new T.Mesh(g, PL.frontMat);
  };

  // ---------- walking person (separate limbs so it can walk / wave) ----------
  const HATS = { cap: { name: 'Grok Cap', icon: '🧢', price: 40 }, cowboy: { name: 'Cowboy Hat', icon: '🤠', price: 60 }, beanie: { name: 'Snow Beanie', icon: '🧶', price: 45 }, crown: { name: 'Party Crown', icon: '👑', price: 120 } };
  GR.HATS = HATS;
  GR.Person = function (o) {
    o = o || {}; const g = new T.Group(), mats = {}; const m = (c) => mats[c] || (mats[c] = new T.MeshLambertMaterial({ color: c }));
    const shirt = o.shirt || '#ff4fd8', skin = o.skin || '#f2c9a0', hair = o.hair || '#4b2e1a', pants = o.pants || '#2e3a5c';
    // rounded cartoon person: capsule limbs, lathe-turned torso, mitten hands, big friendly face (eyes w/ highlights, brows, cheeks, nose, ears).
    // rigid parts are merged into one vertex-coloured mesh each (6 draw calls per person)
    const VC = GR.Person.vc || (GR.Person.vc = new T.MeshLambertMaterial({ vertexColors: true }));
    const P = (list, geo, c, x, y, z, sx, sy, sz, rx, ry, rz) => { U.xf(geo, x || 0, y || 0, z || 0, rx || 0, ry || 0, rz || 0, sx || 1, sy || 1, sz || 1); list.push(U.paint(geo, c)); };
    const mesh = (list) => new T.Mesh(U.merge(list), VC);
    const capL = (list, r, len, c) => { P(list, new T.CylinderGeometry(r, r * 0.92, len, 10), c, 0, -len / 2, 0); P(list, new T.SphereGeometry(r, 10, 8), c); P(list, new T.SphereGeometry(r * 0.92, 10, 8), c, 0, -len, 0); };
    const hip = new T.Group(); hip.position.y = 0.86; g.add(hip);
    const leg = (sx) => { const l = new T.Group(); l.position.set(sx, 0, 0); const q = []; capL(q, 0.115, 0.7, pants); P(q, new T.SphereGeometry(0.15, 12, 8), '#2b2d33', 0, -0.8, 0.06, 0.85, 0.55, 1.35); l.add(mesh(q)); hip.add(l); return l; };
    const L = leg(0.13), R = leg(-0.13);
    const prof = [[0, 0], [0.26, 0.02], [0.31, 0.16], [0.32, 0.36], [0.3, 0.56], [0.24, 0.7], [0.12, 0.76], [0, 0.77]].map((q) => new T.Vector2(q[0], q[1]));
    const tq = []; P(tq, new T.LatheGeometry(prof, 16), shirt, 0, 0.84, 0); P(tq, new T.TorusGeometry(0.29, 0.035, 6, 18), pants, 0, 0.9, 0, 1, 1, 1, PI / 2); P(tq, new T.CylinderGeometry(0.08, 0.09, 0.14, 10), skin, 0, 1.64, 0);
    g.add(mesh(tq));
    const head = new T.Group(); head.position.y = 1.9; g.add(head);
    const hq = [];
    P(hq, new T.SphereGeometry(0.29, 18, 14), skin, 0, 0, 0, 1, 0.98, 0.95);
    P(hq, new T.SphereGeometry(0.305, 18, 12, 0, PI * 2, 0, PI * 0.52), hair, 0, 0.03, -0.025);
    P(hq, new T.SphereGeometry(0.16, 12, 8), hair, 0.04, 0.2, 0.17, 1.5, 0.45, 0.7, 0, 0, -0.2);
    [0.1, -0.1].forEach((x) => {
      P(hq, new T.SphereGeometry(0.06, 10, 8), '#ffffff', x, 0.03, 0.255, 0.85, 1.1, 0.5);
      P(hq, new T.SphereGeometry(0.036, 8, 6), '#1f2937', x, 0.025, 0.282);
      P(hq, new T.SphereGeometry(0.012, 6, 4), '#ffffff', x + 0.012, 0.042, 0.31);
      P(hq, new T.BoxGeometry(0.09, 0.022, 0.02), hair, x, 0.12, 0.27, 1, 1, 1, 0, 0, x > 0 ? -0.15 : 0.15);
      P(hq, new T.SphereGeometry(0.05, 8, 6), '#f9a8b8', x * 1.55, -0.07, 0.235, 1, 0.6, 0.3);
      P(hq, new T.SphereGeometry(0.06, 8, 6), skin, x * 2.9, 0, 0, 0.5, 1, 0.8);
    });
    P(hq, new T.SphereGeometry(0.04, 8, 6), skin, 0, -0.03, 0.29, 1, 0.9, 1.1);
    P(hq, new T.TorusGeometry(0.075, 0.017, 6, 12, PI), '#9f1239', 0, -0.11, 0.255, 1, 1, 1, 0, 0, PI);
    head.add(mesh(hq));
    const arm = (sx) => { const a = new T.Group(); a.position.set(sx, 1.5, 0); const q = []; capL(q, 0.08, 0.56, shirt); P(q, new T.SphereGeometry(0.095, 10, 8), skin, 0, -0.66, 0, 0.9, 1.1, 0.8); P(q, new T.SphereGeometry(0.04, 6, 5), skin, sx > 0 ? -0.06 : 0.06, -0.62, 0.05); a.add(mesh(q)); g.add(a); return a; };
    const AL = arm(0.37), AR = arm(-0.37);
    g.userData = { L, R, AL, AR, head, ph: Math.random() * 6, hat: null };
    GR.Person.setHat(g, o.hat);
    return g;
  };
  GR.Person.setHat = function (g, hat) {
    const u = g.userData; if (u.hatMesh) { u.head.remove(u.hatMesh); u.hatMesh = null; } u.hat = hat || null; if (!hat) return;
    const h = new T.Group(), L = (c) => new T.MeshLambertMaterial({ color: c });
    if (hat === 'cap') { const a = new T.Mesh(new T.SphereGeometry(0.27, 12, 8, 0, PI * 2, 0, PI / 2), L('#ff4fd8')); h.add(a); const b = new T.Mesh(new T.BoxGeometry(0.3, 0.03, 0.22), L('#3ff0ff')); b.position.set(0, 0.01, 0.3); h.add(b); h.position.y = 0.08; }
    if (hat === 'cowboy') { const a = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 0.04, 20), L('#a16207')); h.add(a); const b = new T.Mesh(new T.CylinderGeometry(0.2, 0.25, 0.3, 14), L('#a16207')); b.position.y = 0.16; h.add(b); h.position.y = 0.16; }
    if (hat === 'beanie') { const a = new T.Mesh(new T.SphereGeometry(0.28, 12, 8, 0, PI * 2, 0, PI / 2), L('#38bdf8')); h.add(a); const b = new T.Mesh(new T.SphereGeometry(0.09, 8, 6), L('#ffffff')); b.position.y = 0.3; h.add(b); h.position.y = 0.05; }
    if (hat === 'crown') { const a = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, 0.2, 8, 1, true), new T.MeshPhongMaterial({ color: 0xffcf3a, side: T.DoubleSide, shininess: 90 })); h.add(a); h.position.y = 0.3; }
    h.scale.setScalar(1.18); h.position.y *= 1.18; u.head.add(h); u.hatMesh = h;
  };
  // walk cycle: spd in m/s
  GR.Person.anim = function (g, spd, t, mode) {
    const u = g.userData, ph = t * (2 + spd * 1.6) + u.ph, sw = Math.min(0.9, spd * 0.16);
    u.L.rotation.x = Math.sin(ph) * sw; u.R.rotation.x = -Math.sin(ph) * sw; u.AL.rotation.x = -Math.sin(ph) * sw * 0.9; u.AR.rotation.x = Math.sin(ph) * sw * 0.9;
    u.AL.rotation.z = 0.08; u.AR.rotation.z = -0.08;
    if (mode === 'wave') { u.AR.rotation.z = -2.6 + Math.sin(t * 8) * 0.3; u.AR.rotation.x = 0; }
    if (mode === 'dance') { u.AL.rotation.z = 2.4 + Math.sin(t * 6) * 0.4; u.AR.rotation.z = -2.4 - Math.sin(t * 6) * 0.4; g.position.y = (g.userData.baseY || 0) + Math.abs(Math.sin(t * 6)) * 0.15; }
    if (mode === 'sit') { u.L.rotation.x = -1.4; u.R.rotation.x = -1.4; }
    u.head.rotation.y = spd < 0.1 && mode !== 'sit' ? Math.sin(t * 0.7 + u.ph) * 0.35 : 0;
  };
})();
