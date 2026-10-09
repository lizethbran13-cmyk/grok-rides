/* Grok Rides - the city & town street level: real architecture (glass towers, brick apartments, art-deco,
   modern and pastel shop-houses), raised sidewalks with kerbs, street furniture, crosswalks, street lamps,
   and a REAL DOOR on every building you can drive up to (each one opens into a generated interior). */
(function () {
  'use strict';
  const GR = window.GR, U = GR.U, W = GR.W, M = GR.M, T = THREE, PI = Math.PI;
  const B = GR.BLD = {};
  const PL = GR.PL; PL.gen = []; PL.genById = {};
  PL.find = (id) => PL.byId[id] || PL.genById[id] || null;
  // spatial buckets for the ~300 generated doors
  const DG = new Map(), DC = 40; const dk = (x, z) => Math.floor(x / DC) + ',' + Math.floor(z / DC);
  PL.addGen = function (p) {
    p.gen = true; p.yaw = Math.atan2(p.dx, p.dz); p.floor = W.gy(p.door.x, p.door.z);
    PL.gen.push(p); PL.genById[p.id] = p; const k = dk(p.door.x, p.door.z); if (!DG.has(k)) DG.set(k, []); DG.get(k).push(p); return p;
  };
  // nearest door (named places + generated buildings)
  PL.nearDoor = function (x, z, r) {
    let best = null, bd = r;
    for (const p of PL.list) { const d = Math.hypot(p.door.x - x, p.door.z - z); if (d < bd) { bd = d; best = p; } }
    const cx = Math.floor(x / DC), cz = Math.floor(z / DC), n = Math.ceil(r / DC);
    for (let a = -n; a <= n; a++) for (let b = -n; b <= n; b++) { const l = DG.get((cx + a) + ',' + (cz + b)); if (l) for (const p of l) { const d = Math.hypot(p.door.x - x, p.door.z - z); if (d < bd) { bd = d; best = p; } } }
    return best;
  };

  // ---------- what's inside (variants) ----------
  B.SHOPV = {
    cafe: { icon: '☕', label: 'CAFE', food: true, acc: '#92400e' }, bakery: { icon: '🥐', label: 'BAKERY', food: true, acc: '#b45309' }, icecream: { icon: '🍦', label: 'ICE CREAM', food: true, acc: '#ec4899' }, sushi: { icon: '🍣', label: 'SUSHI', food: true, acc: '#b91c1c' },
    books: { icon: '📚', label: 'BOOKS', acc: '#1d4ed8' }, toys: { icon: '🧸', label: 'TOYS', acc: '#db2777' }, flowers: { icon: '🌸', label: 'FLOWERS', acc: '#be185d' }, games: { icon: '🎮', label: 'ARCADE', acc: '#7c3aed' },
    pets: { icon: '🐶', label: 'PETS', acc: '#0f766e' }, shoes: { icon: '👟', label: 'SHOES', acc: '#334155' }, salon: { icon: '💇', label: 'SALON', acc: '#9333ea' }, bank: { icon: '🏦', label: 'BANK', acc: '#065f46' },
    pharmacy: { icon: '💊', label: 'PHARMACY', acc: '#15803d' }, music: { icon: '🎵', label: 'MUSIC', acc: '#4338ca' }, phones: { icon: '📱', label: 'PHONES', acc: '#0369a1' }, art: { icon: '🎨', label: 'ART', acc: '#c2410c' },
    apartments: { icon: '🏠', label: 'APARTMENTS', acc: '#0ea5e9' }, office: { icon: '🏢', label: 'OFFICES', acc: '#475569' }
  };
  const SHOPKEYS = Object.keys(B.SHOPV).filter((k) => k !== 'apartments' && k !== 'office');
  const NAMES1 = ['Sunny', 'Maple', 'Rainbow', 'Happy', 'Comet', 'Bubble', 'Cosmo', 'Pixel', 'Jolly', 'Starlight', 'Peachy', 'Lucky', 'Twinkle', 'Cozy', 'Zippy', 'Grok'];
  const NAMES2 = { apartments: ['Apartments', 'Lofts', 'Towers', 'Residences'], office: ['Office Tower', 'Plaza', 'Tech Hub', 'Business Center'] };

  // ---------- canvas helpers ----------
  function cvs(w, h, f) { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8; return t; }
  function noise(x, n, a) { for (let i = 0; i < n; i++) { x.fillStyle = 'rgba(0,0,0,' + (Math.random() * a) + ')'; x.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 3, 2 + Math.random() * 2); } }
  // ---------- REAL 3D facades ----------
  // every tower is built from actual geometry: pilasters (vertical piers) and floor ledges stick out of the wall, the glass sits
  // recessed in the openings behind them, and brick / deco / pastel windows get 3D sills, lintels and flower planters.
  // Only the glass itself is textured (crisp 512 px cells with blinds / curtains / plants behind it + a lit-at-night mask).
  function glassCells(tint, seed, inside) {
    const r = U.rng(seed), lit = [];
    const map = cvs(512, 512, (x) => {
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const X = i * 128, Y = j * 128, g = x.createLinearGradient(X, Y, X + 90, Y + 128); g.addColorStop(0, '#d6ebff'); g.addColorStop(0.42, tint); g.addColorStop(1, '#0f1d36'); x.fillStyle = g; x.fillRect(X, Y, 128, 128);
        const k = r(), c = inside[(r() * inside.length) | 0];
        if (k < 0.3) { x.fillStyle = c; x.globalAlpha = 0.9; x.fillRect(X, Y, 128, 30 + r() * 55); x.globalAlpha = 1; x.fillStyle = 'rgba(0,0,0,.14)'; for (let y = Y + 6; y < Y + 84; y += 8) x.fillRect(X, y, 128, 2); }
        else if (k < 0.52) { x.fillStyle = c; x.fillRect(X, Y, 24, 128); x.fillRect(X + 104, Y, 24, 128); x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(X + 20, Y, 4, 128); x.fillRect(X + 104, Y, 4, 128); }
        else if (k < 0.62) { x.fillStyle = '#7a4a26'; x.fillRect(X + 18, Y + 104, 26, 24); x.fillStyle = '#2f9e44'; x.beginPath(); x.arc(X + 31, Y + 96, 16, 0, 7); x.fill(); }
        x.fillStyle = 'rgba(255,255,255,.3)'; x.beginPath(); x.moveTo(X + 8, Y + 128); x.lineTo(X + 58, Y); x.lineTo(X + 78, Y); x.lineTo(X + 28, Y + 128); x.fill();
        x.fillStyle = 'rgba(28,36,52,.85)'; x.fillRect(X + 62, Y, 4, 128);
        lit.push([X, Y, r() < 0.42, r()]);
      }
    });
    const litT = cvs(512, 512, (x) => { x.fillStyle = '#000'; x.fillRect(0, 0, 512, 512); lit.forEach(([X, Y, on, k]) => { if (!on) return; x.fillStyle = 'rgba(255,' + Math.round(205 + k * 40) + ',' + Math.round(130 + k * 60) + ',' + (0.6 + k * 0.4) + ')'; x.fillRect(X, Y, 128, 128); x.fillStyle = '#000'; x.fillRect(X + 62, Y, 4, 128); }); });
    return { map, lit: litT };
  }
  // per-archetype 3D recipe. cw/ch = window cell (m); pil = pier width; pd = how far piers stick out; band = floor ledge height; bd = ledge depth; rec = glass recess
  const ARCH = {
    glass: { pil: 0.24, pd: 0.34, band: 0.34, bd: 0.26, rec: 0.16 },
    brick: { pil: 1.1, pd: 0.32, band: 1.0, bd: 0.3, rec: 0.38, sill: 1, lintel: 1 },
    deco: { pil: 0.8, pd: 0.4, band: 1.1, bd: 0.3, rec: 0.42, sill: 1, gold: 1 },
    modern: { pil: 0.14, pd: 0.14, band: 1.3, bd: 0.5, rec: 0.32 },
    pastel: { pil: 1.7, pd: 0.26, band: 0.9, bd: 0.26, rec: 0.32, sill: 1, lintel: 1, planter: 1 }
  };
  // [archetype, glass tint, wall colour, trim colour, cell w, cell h]
  const STYLES = [
    ['glass', '#3f86c6', '#dfe6ee', '#9fb3c8', 3, 3.5], ['glass', '#2fa59a', '#e3ece9', '#9cc0b8', 3, 3.5], ['glass', '#5468c4', '#cfd6e3', '#8e99b3', 3, 3.5],
    ['brick', '#4a6fa5', '#b5523b', '#efe2cf', 3, 3], ['brick', '#4a6fa5', '#c98a5a', '#f6ecdc', 3, 3],
    ['deco', '#3d5f8f', '#efe3c8', '#c99a2e', 3, 3.2], ['deco', '#3d5f8f', '#d9dfe8', '#b08d3a', 3, 3.2],
    ['modern', '#3c6db0', '#f4f6f8', '#334155', 3, 3], ['modern', '#2f6f8f', '#d8f0e6', '#2f4f4f', 3, 3], ['modern', '#4466aa', '#ffe3d3', '#3b3b55', 3, 3],
    ['pastel', '#5b7fb8', '#ffd1e1', '#ffffff', 4, 3], ['pastel', '#5b7fb8', '#fff1a8', '#ffffff', 4, 3], ['pastel', '#5b7fb8', '#c8e8ff', '#ffffff', 4, 3], ['pastel', '#5b7fb8', '#d4f5c9', '#ffffff', 4, 3]
  ];
  const INSIDE = ['#f8fafc', '#fde68a', '#fecaca', '#bfdbfe', '#e9d5ff', '#bbf7d0', '#fed7aa'];
  B.mats = []; // facade glass materials (night: lit windows)
  // 3D facade parts, merged per ~200 m chunk (frustum-culled on phones)
  const FP = new Map();
  function fpart(cx, cz) { const k = Math.floor(cx / 200) + ',' + Math.floor(cz / 200); let o = FP.get(k); if (!o) FP.set(k, (o = { p: [], n: [], c: [] })); return o; }
  const _fc = new T.Color();
  // axis-aligned box in facade space: s along the face, y up, d outward (skips the hidden back face)
  function fbox(o, f, s0, s1, y0, y1, d0, d1, col, m) { // m: faces to emit (F front, T top, B bottom, E ends)
    m = m || 'FTBE';
    _fc.set(col); const r = _fc.r, g = _fc.g, b = _fc.b;
    const X = (s, d) => f.ax + f.tx * s + f.nx * d, Z = (s, d) => f.az + f.tz * s + f.nz * d;
    const quad = (a, bb, c, d, nx, ny, nz) => { [a, bb, c, a, c, d].forEach((q) => { o.p.push(q[0], q[1], q[2]); o.n.push(nx, ny, nz); o.c.push(r, g, b); }); };
    const P = (s, y, d) => [X(s, d), y, Z(s, d)];
    // front (outward)
    quad(P(s0, y0, d1), P(s1, y0, d1), P(s1, y1, d1), P(s0, y1, d1), f.nx, 0, f.nz);
    // top / bottom
    if (m.indexOf('T') >= 0) quad(P(s0, y1, d1), P(s1, y1, d1), P(s1, y1, d0), P(s0, y1, d0), 0, 1, 0);
    if (m.indexOf('B') >= 0) quad(P(s0, y0, d0), P(s1, y0, d0), P(s1, y0, d1), P(s0, y0, d1), 0, -1, 0);
    // ends
    if (m.indexOf('E') < 0) return;
    quad(P(s1, y0, d1), P(s1, y0, d0), P(s1, y1, d0), P(s1, y1, d1), f.tx, 0, f.tz);
    quad(P(s0, y0, d0), P(s0, y0, d1), P(s0, y1, d1), P(s0, y1, d0), -f.tx, 0, -f.tz);
  }
  const FLOWERS = ['#ef4444', '#facc15', '#ec4899', '#f97316', '#a855f7'];
  function walls(x0, z0, x1, z1, y0, y1, S, faces) {
    const A = ARCH[S.arch], out = S.o, P = out.p, UV = out.uv, Nn = out.n, part = fpart((x0 + x1) / 2, (z0 + z1) / 2);
    const F = [[x0, z1, x1, z1, 0, 1], [x1, z1, x1, z0, 1, 0], [x1, z0, x0, z0, 0, -1], [x0, z0, x0, z1, -1, 0]];
    const H = y1 - y0; if (H < 1) return;
    const nf = Math.max(1, Math.round(H / S.ch)), ch = H / nf;
    F.forEach((q, fi) => {
      if (faces && !faces[fi]) return;
      const L = Math.hypot(q[2] - q[0], q[3] - q[1]), f = { ax: q[0], az: q[1], tx: (q[2] - q[0]) / L, tz: (q[3] - q[1]) / L, nx: q[4], nz: q[5] };
      const nc = Math.max(1, Math.round(L / S.cw)), cw = L / nc;
      // recessed glass (one quad per face)
      const g = (s, y) => [f.ax + f.tx * s - f.nx * A.rec, y, f.az + f.tz * s - f.nz * A.rec];
      const qd = [[g(0, y0), 0, 0], [g(L, y0), nc / 4, 0], [g(L, y1), nc / 4, nf / 4], [g(0, y1), 0, nf / 4]];
      [0, 1, 2, 0, 2, 3].forEach((i) => { P.push(...qd[i][0]); UV.push(qd[i][1], qd[i][2]); Nn.push(f.nx, 0, f.nz); });
      // piers
      for (let i = 0; i <= nc; i++) { const s = i * cw, a = Math.max(0, s - A.pil / 2), b = Math.min(L, s + A.pil / 2); fbox(part, f, a, b, y0, y1, -A.rec, A.pd, S.wall, 'FE'); if (A.gold && i > 0 && i < nc) fbox(part, f, s - 0.1, s + 0.1, y0 + 0.4, y1 - 0.4, A.pd, A.pd + 0.1, S.trim, 'FE'); }
      // floor ledges
      for (let j = 0; j <= nf; j++) { const y = y0 + j * ch, a = Math.max(y0, y - A.band / 2), b = Math.min(y1, y + A.band / 2); fbox(part, f, 0, L, a, b, -A.rec, A.bd, j === 0 || j === nf ? S.trim : S.wall, 'FTB'); }
      // per-window sills / lintels / planters (cheap boxes, only where the window is tall enough)
      if (A.sill || A.lintel || A.planter) for (let j = 0; j < nf; j++) for (let i = 0; i < nc; i++) {
        const sa = i * cw + A.pil / 2, sb = (i + 1) * cw - A.pil / 2, wb = y0 + j * ch + A.band / 2, wt = y0 + (j + 1) * ch - A.band / 2; if (sb - sa < 0.6 || wt - wb < 0.8 || wb > S.trimTop) continue;
        if (A.planter) { fbox(part, f, sa - 0.1, sb + 0.1, wb - 0.05, wb + 0.32, A.bd, A.bd + 0.42, '#8a5a2b', 'FTE'); const fl = FLOWERS[(i + j * 3 + fi) % FLOWERS.length]; fbox(part, f, sa + 0.05, sb - 0.05, wb + 0.32, wb + 0.52, A.bd + 0.08, A.bd + 0.36, fl, 'FT'); }
        else if (A.sill) fbox(part, f, sa - 0.18, sb + 0.18, wb - 0.04, wb + 0.12, A.bd, A.bd + 0.22, S.trim, 'FT');
        if (A.lintel) fbox(part, f, sa - 0.14, sb + 0.14, wt - 0.06, wt + 0.18, A.bd, A.bd + 0.1, S.trim, 'FB');
      }
    });
  }

  // ---------- 3D storefronts: stone piers, recessed display windows with mullions, a riser, a real sign box + awning ----------
  function storefront(o, statics, x0, z0, x1, z1, y0, r, door) {
    const H = 5.2, F = [[x0, z1, x1, z1, 0, 1], [x1, z1, x1, z0, 1, 0], [x1, z0, x0, z0, 0, -1], [x0, z0, x0, z1, -1, 0]];
    const tq = (f, s0, s1, ya, yb, d, uv) => { // textured quad on the face plane at depth d
      const b = o.p.length / 3, X = (q) => f.ax + f.tx * q + f.nx * d, Z = (q) => f.az + f.tz * q + f.nz * d;
      o.p.push(X(s0), ya, Z(s0), X(s1), ya, Z(s1), X(s1), yb, Z(s1), X(s0), yb, Z(s0)); for (let k = 0; k < 4; k++) o.n.push(f.nx, 0, f.nz);
      o.uv.push(uv[0], uv[1], uv[2], uv[1], uv[2], uv[3], uv[0], uv[3]); o.i.push(b, b + 1, b + 2, b, b + 2, b + 3);
    };
    F.forEach((q) => {
      const L = Math.hypot(q[2] - q[0], q[3] - q[1]), f = { ax: q[0], az: q[1], tx: (q[2] - q[0]) / L, tz: (q[3] - q[1]) / L, nx: q[4], nz: q[5] };
      const part = fpart((x0 + x1) / 2, (z0 + z1) / 2), n = Math.max(1, Math.round(L / 12)), seg = L / n;
      const ds = door && door.nx === f.nx && door.nz === f.nz ? (door.x - f.ax) * f.tx + (door.z - f.az) * f.tz : null;
      for (let i = 0; i <= n; i++) { const sp = i * seg; fbox(part, f, Math.max(0, sp - 0.35), Math.min(L, sp + 0.35), y0, y0 + H, -0.3, 0.3, '#d6d3d1', 'FE'); } // piers
      for (let i = 0; i < n; i++) {
        const sa = i * seg + 0.35, sb = (i + 1) * seg - 0.35;
        if (ds != null && ds > sa - 1.8 && ds < sb + 1.8) { // the real 3D door sits in this bay: solid wall around it
          fbox(part, f, sa, Math.max(sa, ds - 1.45), y0, y0 + H, -0.3, 0, '#e8e4dc', 'F'); fbox(part, f, Math.min(sb, ds + 1.45), sb, y0, y0 + H, -0.3, 0, '#e8e4dc', 'F'); fbox(part, f, Math.max(sa, ds - 1.45), Math.min(sb, ds + 1.45), y0 + 3.3, y0 + H, -0.3, 0, '#e8e4dc', 'FB');
          continue;
        }
        const sh = (r() * PL.SHOPS.length) | 0, col = PL.SHOPS[sh][2];
        tq(f, sa, sb, y0 + 0.6, y0 + 3.6, -0.3, PL.shopUV(sh, 'win'));               // recessed display glass
        fbox(part, f, sa, sb, y0, y0 + 0.6, -0.3, 0.12, '#57534e', 'FT');              // riser
        for (let k = 1; k < 3; k++) { const m = sa + (sb - sa) * k / 3; fbox(part, f, m - 0.07, m + 0.07, y0 + 0.6, y0 + 3.6, -0.3, -0.12, '#3f3f46', 'FE'); } // mullions
        fbox(part, f, sa, sb, y0 + 3.6, y0 + H, -0.3, 0, '#f1ece4', 'FB');             // wall band above the window
        fbox(part, f, sa + 0.25, sb - 0.25, y0 + 3.85, y0 + 4.95, 0, 0.42, col, 'FTBE'); // 3D sign box
        tq(f, sa + 0.4, sb - 0.4, y0 + 3.95, y0 + 4.85, 0.43, PL.shopUV(sh, 'sign'));
        if (r() < 0.7) { // striped 3D awning under the sign
          const nst = 4, w = (sb - sa - 0.4) / nst; for (let k = 0; k < nst; k++) { const s0 = sa + 0.2 + k * w; const ang = Math.atan2(f.nx, f.nz), mx = f.ax + f.tx * (s0 + w / 2) + f.nx * 0.95, mz = f.az + f.tz * (s0 + w / 2) + f.nz * 0.95; statics.push(U.paint(new T.BoxGeometry(w, 0.12, 1.9).rotateX(0.32).rotateY(ang).translate(mx, y0 + 3.45, mz), k % 2 ? col : '#ffffff')); }
        }
      }
    });
  }
  const box = (w, h, d) => new T.BoxGeometry(w, h, d);
  const pb = (st, g, c) => st.push(U.paint(g, c));

  // ---------- generated building registration ----------
  let genN = 0;
  function nameFor(v, r) {
    const n1 = NAMES1[(r() * NAMES1.length) | 0];
    if (NAMES2[v]) return n1 + ' ' + NAMES2[v][(r() * NAMES2[v].length) | 0];
    const S = B.SHOPV[v]; return n1 + ' ' + S.label.charAt(0) + S.label.slice(1).toLowerCase();
  }
  B.register = function (o) {
    const id = 'g' + (genN++) + '_' + o.variant;
    const S = B.SHOPV[o.variant] || {};
    const p = Object.assign({ id, kind: 'gen', icon: S.icon || '🚪', acc: S.acc || '#3b82f6', wall: '#f1f5f9' }, o);
    p.short = p.short || (p.icon + ' ' + (S.label || p.variant.toUpperCase())).replace(/^\S+ /, '');
    return PL.addGen(p);
  };

  // ---------- doors (one self-lit merged mesh for all of them) + name signs (atlas) ----------
  const doorParts = [], signBox = [], signQ = { p: [], uv: [], n: [] }, signIdx = {}; let signList = [];
  function signSlot(text) { if (signIdx[text] == null) { signIdx[text] = signList.length; signList.push(text); } return signIdx[text]; }
  // door on a wall: centre (x,z) on the facade, outward normal (nx,nz), ground y
  B.door = function (x, z, nx, nz, y, label, acc, w) {
    w = w || 2.4; const ang = Math.atan2(nx, nz), ox = nx * 0.08, oz = nz * 0.08;
    const add = (g, c, lx, ly, lz) => { U.xf(g, 0, 0, 0, 0, ang, 0); g.translate(x + ox + nx * lz + Math.cos(ang) * lx, y + ly, z + oz + nz * lz - Math.sin(ang) * lx); doorParts.push(U.paint(g, c)); };
    add(box(0.28, 3.0, 0.3), '#4ade80', -w / 2 - 0.12, 1.5, 0.05); add(box(0.28, 3.0, 0.3), '#4ade80', w / 2 + 0.12, 1.5, 0.05); add(box(w + 0.52, 0.3, 0.3), '#4ade80', 0, 3.05, 0.05);
    add(box(w / 2 - 0.08, 2.8, 0.06), '#bfe8ff', -w / 4, 1.4, 0); add(box(w / 2 - 0.08, 2.8, 0.06), '#bfe8ff', w / 4, 1.4, 0);
    add(box(0.06, 0.5, 0.1), '#334155', -0.12, 1.3, 0.08); add(box(0.06, 0.5, 0.1), '#334155', 0.12, 1.3, 0.08);
    add(box(w + 1.2, 0.04, 1.6), '#22c55e', 0, 0.03, 0.85); // welcome mat (glows)
    if (label) { // name sign above the door
      const s = signSlot(label), sw = Math.max(3.2, w + 1.2), sh = 0.8, cx = x + nx * 0.47, cz = z + nz * 0.47;
      { const g = M.rbox(sw + 0.3, sh + 0.3, 0.38, 0.08); U.xf(g, 0, 0, 0, 0, ang, 0); g.translate(x + nx * 0.27, y + 3.35 + sh / 2, z + nz * 0.27); signBox.push(U.paint(g, acc || '#1f2937')); } // a real sign box (text face sits on its front)
      const tx = Math.cos(ang), tz = -Math.sin(ang), Y0 = y + 3.35, Y1 = Y0 + sh;
      const pts = [[cx - tx * sw / 2, Y0, cz - tz * sw / 2], [cx + tx * sw / 2, Y0, cz + tz * sw / 2], [cx + tx * sw / 2, Y1, cz + tz * sw / 2], [cx - tx * sw / 2, Y1, cz - tz * sw / 2]];
      [0, 1, 2, 0, 2, 3].forEach((i) => { signQ.p.push(...pts[i]); signQ.n.push(nx, 0, nz); signQ.uv.push(i === 1 || i === 2 ? 1 : 0, i >= 2 ? 1 : 0, s); });
    }
  };
  function signAtlas() {
    const n = signList.length, cols = 4, rows = Math.ceil(n / cols), H = Math.max(1, rows) * 64;
    const hh = Math.pow(2, Math.ceil(Math.log2(Math.max(64, H))));
    return { t: cvs(1024, hh, (x) => {
      signList.forEach((txt, i) => { const X = (i % cols) * 256, Y = Math.floor(i / cols) * 64; x.fillStyle = '#1f2937'; x.fillRect(X, Y, 256, 64); x.fillStyle = '#fef3c7'; x.fillRect(X + 3, Y + 3, 250, 58); x.fillStyle = '#1f2937'; x.fillRect(X + 6, Y + 6, 244, 52); x.fillStyle = '#ffffff'; x.font = 'bold 30px "Trebuchet MS", "Apple Color Emoji", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; let t = txt; while (x.measureText(t).width > 236 && t.length > 4) t = t.slice(0, -2) + '…'; x.fillText(t, X + 128, Y + 34); });
    }), cols, rows: hh / 64 };
  }
  B.finishDoors = function (scene) {
    if (signBox.length) { const m = new T.Mesh(U.merge(signBox), M.matMatte); scene.add(m); B.signBoxMesh = m; }
    if (doorParts.length) { const m = new T.Mesh(U.merge(doorParts), M.glow); scene.add(m); B.doorMesh = m; }
    if (signQ.p.length) {
      const A = signAtlas(), uv = []; for (let i = 0; i < signQ.uv.length; i += 3) { const s = signQ.uv[i + 2], c = s % A.cols, r = Math.floor(s / A.cols); uv.push((c + 0.01 + signQ.uv[i] * 0.98) / A.cols, 1 - (r + 1 - 0.04 - signQ.uv[i + 1] * 0.92) / A.rows); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(signQ.p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(signQ.n, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      A.t.wrapS = A.t.wrapT = T.ClampToEdgeWrapping; const m = new T.Mesh(g, new T.MeshBasicMaterial({ map: A.t })); scene.add(m); B.signMesh = m;
    }
    // one floating "🚪 name" tag that hops to the nearest generated door
    B.tag = null; B.tagFor = null;
    GR.SC.anim.push((t) => {
      const v = GR.G && GR.G.viewVeh && GR.G.playing ? GR.G.viewVeh() : null; let best = null, bd = 20;
      if (v && !GR.G.inside) { const cx = Math.floor(v.x / DC), cz = Math.floor(v.z / DC); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const l = DG.get((cx + a) + ',' + (cz + b)); if (l) for (const p of l) { const d = Math.hypot(p.door.x - v.x, p.door.z - v.z); if (d < bd) { bd = d; best = p; } } } }
      if (best !== B.tagFor) { if (B.tag) { scene.remove(B.tag); B.tag.material.map.dispose(); B.tag.material.dispose(); B.tag = null; } B.tagFor = best; if (best) { B.tag = M.sprite('🚪 ' + best.name, { color: '#ffffff', bg: 'rgba(22,101,52,.85)', wide: 6, scale: 1.5, fs: 0.42, bold: true }); scene.add(B.tag); } }
      if (B.tag && best) B.tag.position.set(best.door.x, best.floor + 4.9 + Math.sin(t * 2) * 0.12, best.door.z);
    });
  };

  // ---------- sidewalks (raised, with kerbs) + crosswalks ----------
  function paverTex() {
    return cvs(128, 128, (x) => { x.fillStyle = '#c9cdd3'; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const v = 196 + ((i * 7 + j * 13) % 5) * 6; x.fillStyle = 'rgb(' + v + ',' + v + ',' + (v + 4) + ')'; x.fillRect(i * 32 + 1, j * 32 + 1, 30, 30); } noise(x, 300, 0.05); });
  }
  const SW = { p: [], uv: [], c: [] };
  function quad(a, b, c, d, col) { [a, b, c, a, c, d].forEach((q) => { SW.p.push(q[0], q[1], q[2]); SW.uv.push(q[0] / 3, q[2] / 3 + q[1] / 3); SW.c.push(col[0], col[1], col[2]); }); }
  // a raised slab: top (x0..x1, z0..z1) at y+h, kerb faces down to y-0.3; ring>0 = only a ring that wide (lawn in the middle)
  function slab(x0, z0, x1, z1, y, h, ring) {
    const top = y + h, lo = y - 0.3, C1 = [1, 1, 1], CK = [0.86, 0.87, 0.9], CF = [0.72, 0.73, 0.76];
    const rects = ring ? [[x0, z0, x1, z0 + ring], [x0, z1 - ring, x1, z1], [x0, z0 + ring, x0 + ring, z1 - ring], [x1 - ring, z0 + ring, x1, z1 - ring]] : [[x0, z0, x1, z1]];
    rects.forEach((r) => quad([r[0], top, r[1]], [r[0], top, r[3]], [r[2], top, r[3]], [r[2], top, r[1]], C1));
    // kerb stone strip (lighter) on the road side
    const k = 0.3;
    quad([x0, top + 0.004, z0], [x0, top + 0.004, z1], [x0 + k, top + 0.004, z1], [x0 + k, top + 0.004, z0], CK); quad([x1 - k, top + 0.004, z0], [x1 - k, top + 0.004, z1], [x1, top + 0.004, z1], [x1, top + 0.004, z0], CK);
    quad([x0, top + 0.004, z0], [x0, top + 0.004, z0 + k], [x1, top + 0.004, z0 + k], [x1, top + 0.004, z0], CK); quad([x0, top + 0.004, z1 - k], [x0, top + 0.004, z1], [x1, top + 0.004, z1], [x1, top + 0.004, z1 - k], CK);
    // outer kerb faces
    quad([x0, lo, z1], [x1, lo, z1], [x1, top, z1], [x0, top, z1], CF); quad([x1, lo, z0], [x0, lo, z0], [x0, top, z0], [x1, top, z0], CF);
    quad([x0, lo, z0], [x0, lo, z1], [x0, top, z1], [x0, top, z0], CF); quad([x1, lo, z1], [x1, lo, z0], [x1, top, z0], [x1, top, z1], CF);
    if (ring) { const a = x0 + ring, b = z0 + ring, c = x1 - ring, d = z1 - ring; quad([a, top, b], [c, top, b], [c, lo, b], [a, lo, b], CF); quad([c, top, d], [a, top, d], [a, lo, d], [c, lo, d], CF); quad([a, top, d], [a, top, b], [a, lo, b], [a, lo, d], CF); quad([c, top, b], [c, top, d], [c, lo, d], [c, lo, b], CF); }
  }
  function finishSidewalks(scene) {
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(SW.p, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(SW.uv, 2)); g.setAttribute('color', new T.Float32BufferAttribute(SW.c, 3)); g.computeVertexNormals();
    const m = new T.Mesh(g, new T.MeshLambertMaterial({ map: paverTex(), vertexColors: true })); m.receiveShadow = true; scene.add(m); B.sidewalks = m; B.sidewalkTris = SW.p.length / 9;
  }
  const CW = { p: [], uv: [] };
  function crosswalk(cx, cz, ax, az, dist, halfW, y) { // stripes across a road at `dist` from the crossing centre, road dir (ax,az)
    const px = cx + ax * dist, pz = cz + az * dist, nx = -az, nz = ax, L = 3.2;
    const c = [[px - nx * halfW, pz - nz * halfW], [px + nx * halfW, pz + nz * halfW], [px + nx * halfW + ax * L, pz + nz * halfW + az * L], [px - nx * halfW + ax * L, pz - nz * halfW + az * L]];
    const n = (c[1][0] - c[0][0]) * (c[2][1] - c[0][1]) - (c[1][1] - c[0][1]) * (c[2][0] - c[0][0]); const ord = n < 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
    const uvs = [[0, 0], [halfW * 2 / 1.5, 0], [halfW * 2 / 1.5, 1], [0, 1]];
    ord.forEach((i) => { CW.p.push(c[i][0], y, c[i][1]); CW.uv.push(uvs[i][0], uvs[i][1]); });
  }
  function finishCrosswalks(scene) {
    if (!CW.p.length) return;
    const t = cvs(64, 64, (x) => { x.clearRect(0, 0, 64, 64); x.fillStyle = 'rgba(250,250,250,.92)'; x.fillRect(8, 2, 32, 60); }); t.wrapT = T.ClampToEdgeWrapping;
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(CW.p, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(CW.uv, 2)); g.computeVertexNormals();
    const m = new T.Mesh(g, new T.MeshLambertMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -16 })); m.renderOrder = 2; scene.add(m); B.crosswalkN = CW.p.length / 18;
  }

  // ---------- street furniture (instanced) ----------
  const PROPS = { lamp: [], tree: [], bench: [], bin: [], hydrant: [], stop: [] };
  const doorPts = [];
  const nearDoorPt = (x, z, r) => doorPts.some((d) => Math.abs(d[0] - x) < r && Math.abs(d[1] - z) < r);
  function propGeos() {
    const P = (g, c) => U.paint(g, c);
    const pole = U.merge([P(new T.CylinderGeometry(0.12, 0.18, 7.2, 6, 1, true).translate(0, 3.6, 0), '#3b4250'), P(new T.CylinderGeometry(0.26, 0.3, 0.5, 6, 1, true).translate(0, 0.25, 0), '#3b4250'), P(new T.TorusGeometry(1.0, 0.08, 4, 6, PI / 2).rotateY(PI / 2).translate(0, 6.2, 1.0), '#3b4250'), P(new T.CylinderGeometry(0.28, 0.5, 0.35, 8).translate(0, 7.05, 1.0), '#3b4250')]);
    const bulb = new T.SphereGeometry(0.32, 8, 2, 0, PI * 2, PI / 2, PI / 2).translate(0, 7.0, 1.0);
    const tree = U.merge([P(new T.CylinderGeometry(0.9, 0.8, 0.6, 8, 1, true).translate(0, 0.3, 0), '#9aa3ad'), P(new T.CircleGeometry(0.85, 8).rotateX(-PI / 2).translate(0, 0.58, 0), '#6b4a2b'), P(new T.CylinderGeometry(0.13, 0.18, 2.6, 5, 1, true).translate(0, 1.8, 0), '#7a5230'), P(new T.IcosahedronGeometry(1.5, 1).translate(0, 3.6, 0), '#3fae4a'), P(new T.IcosahedronGeometry(1.1, 0).translate(0.6, 4.4, 0.3), '#58c45a'), P(new T.IcosahedronGeometry(1.0, 0).translate(-0.6, 4.2, -0.3), '#4bb853')]);
    const bench = U.merge([P(box(2.0, 0.1, 0.55).translate(0, 0.5, 0), '#b4733c'), P(box(2.0, 0.42, 0.08).translate(0, 0.8, -0.26), '#b4733c'), P(box(0.08, 0.5, 0.5).translate(-0.85, 0.25, 0), '#2f3540'), P(box(0.08, 0.5, 0.5).translate(0.85, 0.25, 0), '#2f3540')]);
    const bin = U.merge([P(new T.CylinderGeometry(0.34, 0.3, 0.95, 8, 1, true).translate(0, 0.48, 0), '#2e7d4f'), P(new T.CylinderGeometry(0.38, 0.38, 0.08, 8).translate(0, 0.98, 0), '#1f5e3a')]);
    const hydrant = U.merge([P(new T.CylinderGeometry(0.18, 0.22, 0.7, 8).translate(0, 0.35, 0), '#e53935'), P(new T.SphereGeometry(0.19, 8, 6).translate(0, 0.72, 0), '#e53935'), P(new T.CylinderGeometry(0.07, 0.07, 0.5, 6).rotateZ(PI / 2).translate(0, 0.45, 0), '#c62828')]);
    const stop = U.merge([P(box(0.1, 2.6, 0.1).translate(-1.6, 1.3, -0.6), '#64748b'), P(box(0.1, 2.6, 0.1).translate(1.6, 1.3, -0.6), '#64748b'), P(M.rbox(3.6, 0.12, 1.6, 0.05).translate(0, 2.65, 0), '#0ea5e9'), P(box(3.3, 1.7, 0.05).translate(0, 1.35, -0.62), '#cdeafe'), P(M.rbox(2.4, 0.08, 0.45, 0.03).translate(0, 0.5, -0.35), '#64748b'), P(box(0.7, 0.7, 0.06).translate(1.4, 2.95, 0.2), '#facc15')]);
    return { lamp: pole, bulb, tree, bench, bin, hydrant, stop };
  }
  // instanced props, split into ~300 m chunks so each chunk is frustum-culled on its own (phones only draw what's on screen)
  function instanced(geo, list, mat, scene) {
    if (!list.length) return null; const CH = 300, groups = new Map();
    list.forEach((p) => { const k = Math.floor(p[0] / CH) + ',' + Math.floor(p[2] / CH); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p); });
    const holder = new T.Group(), m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), v = new T.Vector3(), s = new T.Vector3(1, 1, 1);
    if (!geo.boundingSphere) geo.computeBoundingSphere(); const gr = geo.boundingSphere.radius + geo.boundingSphere.center.length();
    groups.forEach((L) => {
      const g = new T.BufferGeometry(); for (const a in geo.attributes) g.setAttribute(a, geo.attributes[a]); if (geo.index) g.setIndex(geo.index);
      const im = new T.InstancedMesh(g, mat, L.length); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
      L.forEach((p, i) => { q.setFromEuler(e.set(0, p[3], 0)); v.set(p[0], p[1], p[2]); m4.compose(v, q, s); im.setMatrixAt(i, m4); x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); });
      g.boundingSphere = new T.Sphere(new T.Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2 + gr);
      holder.add(im);
    });
    scene.add(holder); return holder;
  }
  // put props along one sidewalk side. a..b = along-axis range, fixed coordinate f, outward (toward road) normal (nx,nz)
  function furnish(ax, az, a0, a1, ox, oz, nx, nz, r, town) {
    // ax,az = direction along the side; (ox,oz) = point on kerb line at along=0; n = toward the road
    const L = a1 - a0, at = (s, off) => [ox + ax * s - nx * off, oz + az * s - nz * off];
    const yaw = Math.atan2(-nx, -nz);
    // lamps at the kerb every ~30 m
    for (let s = a0 + 12; s < a1 - 6; s += 30) { const [x, z] = at(s, 0.7); if (nearDoorPt(x, z, 3.5)) continue; PROPS.lamp.push([x, W.gy(x, z), z, yaw + PI, s]); W.addCirc(x, z, 0.3, 8, 'pole'); }
    if (town) return;
    for (let s = a0 + 24; s < a1 - 8; s += 30) { const [x, z] = at(s, 1.3); if (nearDoorPt(x, z, 3)) continue; PROPS.tree.push([x, W.gy(x, z) - 0.02, z, r() * 6]); W.addCirc(x, z, 0.9, 5, 'tree'); }
    if (r() < 0.8) { const s = a0 + L * (0.3 + r() * 0.4), [x, z] = at(s, 3.2); if (!nearDoorPt(x, z, 3.5)) { PROPS.bench.push([x, W.gy(x, z), z, yaw + PI]); W.addBox(x - 1, z - 1, x + 1, z + 1, 1, 'bench'); const [bx, bz] = at(s + 1.8, 3.4); PROPS.bin.push([bx, W.gy(bx, bz), bz, 0]); W.addCirc(bx, bz, 0.35, 1, 'bin'); } }
    if (r() < 0.6) { const s = a0 + 6 + r() * 4, [x, z] = at(s, 0.9); if (!nearDoorPt(x, z, 2.5)) { PROPS.hydrant.push([x, W.gy(x, z), z, r() * 6]); W.addCirc(x, z, 0.25, 1, 'hydrant'); } }
  }
  B.finishProps = function (scene) {
    const G = propGeos();
    B.lampMesh = instanced(G.lamp, PROPS.lamp, M.matMatte, scene);
    B.bulbMat = new T.MeshBasicMaterial({ color: 0xbdb8a6 });
    B.bulbMesh = instanced(G.bulb, PROPS.lamp, B.bulbMat, scene);
    // light pools under the lamps (only visible at night)
    const pt = cvs(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,226,160,.85)'); g.addColorStop(1, 'rgba(255,226,160,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
    B.poolMat = new T.MeshBasicMaterial({ map: pt, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -20 });
    const pools = PROPS.lamp.map((l) => { const yaw = l[3]; return [l[0] + Math.sin(yaw) * 1.4, l[1] + 0.06, l[2] + Math.cos(yaw) * 1.4, 0]; });
    B.poolMesh = instanced(new T.PlaneGeometry(9, 9).rotateX(-PI / 2), pools, B.poolMat, scene); if (B.poolMesh) { B.poolMesh.visible = false; B.poolMesh.children.forEach((c) => { c.renderOrder = 3; }); }
    GR.QTHIN = GR.QTHIN || []; ['tree', 'bench', 'bin', 'hydrant', 'stop'].forEach((k) => { const h = instanced(G[k], PROPS[k], M.matMatte, scene); if (h && k !== 'stop') h.children.forEach((im) => GR.QTHIN.push(im)); }); // LOW graphics thins these out
    B.propCounts = {}; for (const k in PROPS) B.propCounts[k] = PROPS[k].length;
    B.lamps = PROPS.lamp;
  };

  // ---------- architecture ----------
  function towerDetails(st, arch, x0, z0, x1, z1, y0, h, r, styleCol) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0; let top = h;
    const cap = (ww, dd, yy, c) => pb(st, box(ww, 0.9, dd).translate(cx, yy + 0.45, cz), c);
    if (arch === 'glass') {
      cap(w + 0.8, d + 0.8, y0 + h, '#cfd8e3');
      if (r() < 0.5) { pb(st, new T.CylinderGeometry(Math.min(w, d) * 0.32, Math.min(w, d) * 0.32, 0.4, 24).translate(cx, y0 + h + 1.1, cz), '#4b5563'); pb(st, box(1, 0.05, 4.6).translate(cx - 1.4, y0 + h + 1.33, cz), '#facc15'); pb(st, box(1, 0.05, 4.6).translate(cx + 1.4, y0 + h + 1.33, cz), '#facc15'); pb(st, box(1.8, 0.05, 1).translate(cx, y0 + h + 1.33, cz), '#facc15'); top = h + 1.5; }
      else { pb(st, box(w * 0.4, 4, d * 0.4).translate(cx, y0 + h + 2.9, cz), '#9aa5b4'); pb(st, new T.CylinderGeometry(0.15, 0.35, 16, 6).translate(cx, y0 + h + 12.9, cz), '#e5e7eb'); pb(st, new T.SphereGeometry(0.6, 8, 6).translate(cx, y0 + h + 21, cz), '#ff3b3b'); top = h + 21; }
    } else if (arch === 'brick') {
      cap(w + 1.2, d + 1.2, y0 + h, '#efe2cf'); pb(st, box(w + 0.5, 0.35, d + 0.5).translate(cx, y0 + 5.4, cz), '#efe2cf');
      // balconies on the two street faces (every other bay, max 6 floors)
      const floors = Math.min(6, Math.floor((h - 6) / 3));
      for (let f = 0; f < floors; f++) { const yy = y0 + 6.2 + f * 3 * Math.max(1, Math.floor((h - 6) / 3 / floors)); for (let s = 3 + (f % 2) * 3; s < w - 2; s += 6) { pb(st, box(2.4, 0.14, 1.0).translate(x0 + s, yy, z1 + 0.5), '#e5e7eb'); pb(st, box(2.4, 0.75, 0.06).translate(x0 + s, yy + 0.45, z1 + 1.0), '#334155'); pb(st, box(2.4, 0.14, 1.0).translate(x0 + s, yy, z0 - 0.5), '#e5e7eb'); pb(st, box(2.4, 0.75, 0.06).translate(x0 + s, yy + 0.45, z0 - 1.0), '#334155'); } }
      // rooftop water tank
      const tx = cx + w * 0.2, tz = cz - d * 0.2; for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4; pb(st, new T.CylinderGeometry(0.12, 0.12, 3, 5).translate(tx + Math.cos(a) * 1.4, y0 + h + 2.4, tz + Math.sin(a) * 1.4), '#6b4a2b'); }
      pb(st, new T.CylinderGeometry(2, 2, 3, 12).translate(tx, y0 + h + 5.4, tz), '#a0663a'); pb(st, new T.ConeGeometry(2.2, 1.4, 12).translate(tx, y0 + h + 7.6, tz), '#6b4a2b'); top = h + 8.3;
    } else if (arch === 'deco') {
      cap(w + 1, d + 1, y0 + h, '#e9dcbc');
      // stepped setbacks are built by the caller; crown here
      pb(st, new T.ConeGeometry(Math.min(w, d) * 0.28, 9, 4).rotateY(PI / 4).translate(cx, y0 + h + 5.4, cz), '#d4a72c'); pb(st, new T.CylinderGeometry(0.12, 0.25, 8, 6).translate(cx, y0 + h + 13, cz), '#f0d070'); top = h + 17;
    } else if (arch === 'modern') {
      cap(w + 0.4, d + 0.4, y0 + h, '#e5e7eb');
      // roof garden
      pb(st, box(w * 0.8, 0.5, d * 0.8).translate(cx, y0 + h + 1.1, cz), '#5fb85a'); for (let i = 0; i < 4; i++) pb(st, new T.IcosahedronGeometry(1.1 + r() * 0.6, 1).translate(cx + (r() - 0.5) * w * 0.6, y0 + h + 2.2, cz + (r() - 0.5) * d * 0.6), i % 2 ? '#3fae4a' : '#58c45a');
      pb(st, box(w * 0.82, 1.1, 0.12).translate(cx, y0 + h + 1.5, cz + d * 0.4), '#bfe8ff'); top = h + 3.4;
    } else { // pastel shop-house: cornice + stepped "gable" parapet + chimney
      cap(w + 1.0, d + 1.0, y0 + h, '#ffffff');
      const g = M.ext([['m', -w / 2, 0], ['l', w / 2, 0], ['l', w / 2, 1.2], ['l', w * 0.25, 1.2], ['l', w * 0.25, 2.2], ['l', -w * 0.25, 2.2], ['l', -w * 0.25, 1.2], ['l', -w / 2, 1.2]], 0.5, 0.05, 2);
      g.rotateY(PI / 2); pb(st, g.translate(cx, y0 + h + 0.9, z1 - 0.1), styleCol); const g2 = g.clone(); pb(st, g2.translate(0, 0, z0 - z1 + 0.2), styleCol);
      pb(st, box(1.2, 3, 1.2).translate(cx + w * 0.3, y0 + h + 2, cz), '#9a5b48'); top = h + 3.6;
    }
    return top;
  }
  function park(bx, bz, statics, scene) {
    const cx = bx + 50, cz = bz + 50, y = W.height(cx, cz) + W.SIDE_H;
    statics.push(U.paint(U.xf(new T.BoxGeometry(77, 0.3, 77), cx, y - 0.1, cz), '#6cc95a'));
    for (let i = 0; i < 4; i++) { const a = i * PI / 2; statics.push(U.paint(U.xf(new T.BoxGeometry(3, 0.04, 36), cx + Math.cos(a) * 20, y + 0.06, cz + Math.sin(a) * 20, 0, a, 0), '#e8dcc0')); }
    statics.push(U.paint(U.xf(new T.CylinderGeometry(7, 8, 1.2, 24), cx, y + 0.6, cz), '#cfd6e0')); statics.push(U.paint(U.xf(new T.CylinderGeometry(6.2, 6.2, 0.2, 24), cx, y + 1.15, cz), '#4cc3ff'));
    statics.push(U.paint(U.xf(new T.CylinderGeometry(0.6, 0.9, 3, 10), cx, y + 2, cz), '#cfd6e0')); statics.push(U.paint(U.xf(new T.SphereGeometry(1.1, 10, 8), cx, y + 3.6, cz), '#4cc3ff'));
    W.addCirc(cx, cz, 8, 3, 'fountain');
    const fx = cx + 22, fz = cz - 20; const wheel = new T.Group();
    const parts = [U.paint(new T.TorusGeometry(14, 0.35, 6, 40), '#ff4fd8'), U.paint(new T.TorusGeometry(14, 0.35, 6, 40).translate(0, 0, 1.6), '#ff4fd8')];
    for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; parts.push(U.paint(U.xf(new T.CylinderGeometry(0.12, 0.12, 14, 4), Math.cos(a) * 7, Math.sin(a) * 7, 0.8, 0, 0, a + PI / 2), '#ffffff')); parts.push(U.paint(U.xf(M.rbox(1.8, 1.6, 1.6, 0.4), Math.cos(a) * 14, Math.sin(a) * 14 - 1.2, 0.8), ['#ffd23f', '#3ff0ff', '#4ade80', '#ff7a3d'][i % 4])); }
    wheel.add(new T.Mesh(U.merge(parts), M.mat)); wheel.position.set(fx, y + 17, fz); scene.add(wheel); GR.SC.anim.push((t) => { wheel.rotation.z = t * 0.12; }); B.ferris = wheel;
    statics.push(U.paint(U.xf(new T.CylinderGeometry(0.5, 0.7, 18, 6), fx - 5, y + 8, fz + 0.8, 0, 0, -0.28), '#888')); statics.push(U.paint(U.xf(new T.CylinderGeometry(0.5, 0.7, 18, 6), fx + 5, y + 8, fz + 0.8, 0, 0, 0.28), '#888'));
    W.addBox(fx - 8, fz - 2, fx + 8, fz + 3, 32, 'ferris');
    for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2 + 0.3, rr = 30 + (i % 3) * 3, x = cx + Math.cos(a) * rr, z = cz + Math.sin(a) * rr; if (Math.hypot(x - fx, z - fz) < 12) continue; PROPS.tree.push([x, y - 0.4, z, i]); W.addCirc(x, z, 0.9, 5, 'tree'); }
    for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4, x = cx + Math.cos(a) * 12, z = cz + Math.sin(a) * 12; PROPS.bench.push([x, y, z, -a - PI / 2]); }
  }
  B.buildCity = function (scene, statics) {
    PL.list.forEach((q) => { if (q.door) doorPts.push([q.door.x, q.door.z]); }); // keep lamps / trees off the named places' doorsteps
    const C = W.CITY, r = U.rng(4242), fronts = { p: [], n: [], uv: [], i: [] };
    const styles = STYLES.map((s, i) => { const f = glassCells(s[1], 11 + i * 7, INSIDE); const mat = new T.MeshLambertMaterial({ map: f.map, emissiveMap: f.lit, emissive: new T.Color('#ffd9a0'), emissiveIntensity: 0 }); B.mats.push(mat); return { arch: s[0], wall: s[2], trim: s[3], cw: s[4], ch: s[5], mat, o: { p: [], uv: [], n: [] }, col: s[2] }; });
    const byArch = (a) => styles.filter((s) => s.arch === a);
    B.cityN = 0;
    for (let bx = C.x0; bx < C.x1; bx += 100) for (let bz = C.z0; bz < C.z1; bz += 100) {
      const hl = 7, hr = bx + 100 >= 950 ? 8 : 7, y = W.height(bx + 50, bz + 50);
      const ix0 = bx + hl, ix1 = bx + 100 - hr, iz0 = bz + 7, iz1 = bz + 93;
      // sidewalk slab (park: only a ring)
      const isPark = bx === 550 && bz === -100;
      slab(ix0, iz0, ix1, iz1, y, W.SIDE_H, isPark ? W.SIDE_W : 0);
      if (isPark) { park(bx, bz, statics, scene); }
      const B0 = { x0: ix0 + W.SIDE_W, x1: ix1 - W.SIDE_W, z0: iz0 + W.SIDE_W, z1: iz1 - W.SIDE_W };
      const lots = [];
      if (!isPark) for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
        const w = 26 + r() * 8, d = 26 + r() * 8;
        const x0 = a ? B0.x1 - w : B0.x0, z0 = b ? B0.z1 - d : B0.z0, x1 = x0 + w, z1 = z0 + d, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
        if (GR.SPOTS.some((s) => Math.abs(s.x - cx) < w / 2 + 14 && Math.abs(s.z - cz) < d / 2 + 14)) continue;
        if (PL.blocksLot(cx, cz, w / 2, d / 2)) continue;
        lots.push({ a, b, x0, z0, x1, z1, cx, cz, w, d });
      }
      lots.forEach((L) => {
        const dd = Math.hypot(L.cx - 650, L.cz + 50), core = Math.exp(-(dd / 260) * (dd / 260));
        const pick = r(); let arch;
        if (core > 0.6) arch = pick < 0.5 ? 'glass' : pick < 0.8 ? 'deco' : 'modern';
        else if (core > 0.25) arch = pick < 0.3 ? 'glass' : pick < 0.6 ? 'brick' : pick < 0.85 ? 'modern' : 'deco';
        else arch = pick < 0.45 ? 'pastel' : pick < 0.75 ? 'brick' : 'modern';
        const S = byArch(arch)[(r() * byArch(arch).length) | 0];
        let h = arch === 'pastel' ? 9.2 + Math.floor(r() * 2) * 3 : arch === 'brick' ? 18 + r() * 24 : 26 + 140 * core * (0.5 + 0.5 * r()) + r() * 10;
        if (arch === 'deco') h = Math.max(h, 40);
        const y0 = W.height(L.cx, L.cz) - 1;
        // door on one of the two street-facing faces
        const useX = r() < 0.5, nx = useX ? (L.a ? 1 : -1) : 0, nz = useX ? 0 : (L.b ? 1 : -1);
        const along = (r() - 0.5) * ((useX ? L.d : L.w) - 10);
        const dx = useX ? (L.a ? L.x1 : L.x0) : L.cx + along, dz = useX ? L.cz + along : (L.b ? L.z1 : L.z0);
        const doorP = { x: dx + nx * 1.6, z: dz + nz * 1.6 }, gy = W.height(dx, dz) + W.SIDE_H;
        // what's inside: tall towers are offices or apartments, low-rise are shops / food
        let variant; const vr = r();
        if (h > 60) variant = vr < 0.55 ? 'office' : vr < 0.85 ? 'apartments' : SHOPKEYS[(r() * SHOPKEYS.length) | 0];
        else if (arch === 'brick') variant = vr < 0.55 ? 'apartments' : SHOPKEYS[(r() * SHOPKEYS.length) | 0];
        else variant = vr < 0.22 ? 'apartments' : vr < 0.32 ? 'office' : SHOPKEYS[(r() * SHOPKEYS.length) | 0];
        const name = nameFor(variant, r), SV = B.SHOPV[variant];
        // body + storefront ring (skipping the door bay)
        S.trimTop = y0 + 45; walls(L.x0, L.z0, L.x1, L.z1, y0 + 5.2, y0 + h, S);
        storefront(fronts, statics, L.x0, L.z0, L.x1, L.z1, y0, r, { x: dx, z: dz, nx, nz });
        let top = h;
        if (arch === 'deco') { // two setback tiers
          const t1 = h, w2 = L.w * 0.72, d2 = L.d * 0.72, h2 = 14 + r() * 16; walls(L.cx - w2 / 2, L.cz - d2 / 2, L.cx + w2 / 2, L.cz + d2 / 2, y0 + t1, y0 + t1 + h2, S); pb(statics, box(L.w + 1, 0.9, L.d + 1).translate(L.cx, y0 + t1 + 0.45, L.cz), '#e9dcbc');
          const w3 = L.w * 0.46, d3 = L.d * 0.46, h3 = 8 + r() * 10; walls(L.cx - w3 / 2, L.cz - d3 / 2, L.cx + w3 / 2, L.cz + d3 / 2, y0 + t1 + h2, y0 + t1 + h2 + h3, S); pb(statics, box(w2 + 0.8, 0.8, d2 + 0.8).translate(L.cx, y0 + t1 + h2 + 0.4, L.cz), '#e9dcbc');
          top = towerDetails(statics, 'deco', L.cx - w3 / 2, L.cz - d3 / 2, L.cx + w3 / 2, L.cz + d3 / 2, y0, t1 + h2 + h3, r, S.col);
        } else if (arch === 'modern' && h > 30 && r() < 0.6) { // cantilevered top block
          const sh = L.w * 0.12, h2 = 9; walls(L.x0 + sh, L.z0, L.x1 + sh * 0.4, L.z1, y0 + h, y0 + h + h2, S); top = towerDetails(statics, 'modern', L.x0 + sh, L.z0, L.x1 + sh * 0.4, L.z1, y0, h + h2, r, S.col);
        } else top = towerDetails(statics, arch, L.x0, L.z0, L.x1, L.z1, y0, h, r, S.col);
        W.addBox(L.x0, L.z0, L.x1, L.z1, y0 + top, 'bld');
        B.door(dx, dz, nx, nz, gy, SV.icon + ' ' + (variant === 'apartments' || variant === 'office' ? name.toUpperCase() : SV.label), SV.acc);
        doorPts.push([doorP.x, doorP.z]);
        B.register({ variant, name, short: name.toUpperCase(), x: L.cx, z: L.cz, dx: nx, dz: nz, door: doorP, region: 'city', arch, h, wall: S.col });
        B.cityN++;
      });
    }
    // zebra crossings on every approach of every city junction
    for (let jx = C.x0; jx <= C.x1; jx += 100) for (let jz = C.z0; jz <= C.z1; jz += 100) { const yy = W.height(jx, jz) + 0.24, hwX = jx === 950 ? 8 : 7; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([ax, az]) => { const ex = jx + ax * 20, ez = jz + az * 20; if (ex < C.x0 - 1 || ex > C.x1 + 1 || ez < C.z0 - 1 || ez > C.z1 + 1) return; crosswalk(jx, jz, ax, az, (ax ? hwX : 7) + 1.6, (ax ? 7 : hwX) - 0.6, yy); }); }
    scene.add(PL.cityFrontMesh(fronts)); B.frontMat = PL.frontMat;
    styles.forEach((s) => { if (!s.o.p.length) return; const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(s.o.p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(s.o.n, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(s.o.uv, 2)); scene.add(new T.Mesh(g, s.mat)); });
    // the 3D facade parts (piers, ledges, sills, planters), one merged mesh per chunk
    FP.forEach((o) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(o.p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(o.n, 3)); g.setAttribute('color', new T.Float32BufferAttribute(o.c, 3)); g.computeBoundingSphere(); const m = new T.Mesh(g, M.matMatte); m.receiveShadow = true; scene.add(m); B.facadeTris = (B.facadeTris || 0) + o.p.length / 9; }); FP.clear();
    // furniture along every block side (after doors are known)
    for (let bx = C.x0; bx < C.x1; bx += 100) for (let bz = C.z0; bz < C.z1; bz += 100) {
      if (bx === 550 && bz === -100) continue;
      const hl = 7, hr = bx + 100 >= 950 ? 8 : 7, ix0 = bx + hl, ix1 = bx + 100 - hr, iz0 = bz + 7, iz1 = bz + 93;
      furnish(1, 0, 0, ix1 - ix0, ix0, iz0, 0, -1, r); furnish(1, 0, 0, ix1 - ix0, ix0, iz1, 0, 1, r); furnish(0, 1, 0, iz1 - iz0, ix0, iz0, -1, 0, r); furnish(0, 1, 0, iz1 - iz0, ix1, iz0, 1, 0, r);
      if (r() < 0.25) { const x = ix0 + 30, z = iz0 + 2.6; PROPS.stop.push([x, W.gy(x, z), z, PI]); W.addBox(x - 1.8, z - 0.9, x + 1.8, z + 0.3, 3, 'stop'); }
    }
  };
  // ---------- town: sidewalk rings, crosswalks, lamps ----------
  B.buildTownStreets = function () {
    const T0 = W.TOWN, r = U.rng(99);
    for (let bx = T0.x0; bx < T0.x1; bx += 100) for (let bz = T0.z0; bz < T0.z1; bz += 100) {
      const hl = bx === -450 ? 8 : 7, hr = bx + 100 === -450 ? 8 : 7, y = W.height(bx + 50, bz + 50);
      const ix0 = bx + hl, ix1 = bx + 100 - hr, iz0 = bz + 7, iz1 = bz + 93;
      slab(ix0, iz0, ix1, iz1, y, 0.36, W.SIDE_W);
      furnish(1, 0, 0, ix1 - ix0, ix0, iz0, 0, -1, r, true); furnish(1, 0, 0, ix1 - ix0, ix0, iz1, 0, 1, r, true); furnish(0, 1, 0, iz1 - iz0, ix0, iz0, -1, 0, r, true); furnish(0, 1, 0, iz1 - iz0, ix1, iz0, 1, 0, r, true);
    }
    for (let jx = T0.x0; jx <= T0.x1; jx += 100) for (let jz = T0.z0; jz <= T0.z1; jz += 100) { const yy = W.height(jx, jz) + 0.24, hwX = jx === -450 ? 8 : 7; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([ax, az]) => { const ex = jx + ax * 20, ez = jz + az * 20; if (ex < T0.x0 - 1 || ex > T0.x1 + 1 || ez < T0.z0 - 1 || ez > T0.z1 + 1) return; crosswalk(jx, jz, ax, az, (ax ? hwX : 7) + 1.6, (ax ? 7 : hwX) - 0.6, yy); }); }
  };
  B.finish = function (scene) { finishSidewalks(scene); finishCrosswalks(scene); B.finishProps(scene); B.finishDoors(scene); };
  B.addDoorPt = (x, z) => doorPts.push([x, z]);
})();
