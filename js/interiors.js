// GROK RIDES — walk-in interiors (shops, diners, hotel, race club…) + on-foot controller
(function () {
  'use strict';
  const GR = window.GR, T = THREE, U = GR.U, W = GR.W, M = GR.M, PI = Math.PI;
  const IN = GR.IN = {};
  const $ = (id) => document.getElementById(id), esc = U.esc;

  // ---------- snacks = small, short bonuses ----------
  const SNACKS = GR.SNACKS = {
    burger: { icon: '🍔', name: 'Turbo Burger', price: 15, buff: 'speed', secs: 180, desc: '+5% top speed' },
    fries: { icon: '🍟', name: 'Crispy Fries', price: 8, buff: 'grip', secs: 180, desc: '+8% grip' },
    shake: { icon: '🥤', name: 'Nitro Shake', price: 10, buff: 'nitro', secs: 180, desc: 'Nitro recharges 2× faster' },
    pancakes: { icon: '🥞', name: 'Pancake Stack', price: 12, buff: 'speed', secs: 180, desc: '+5% top speed' },
    slice: { icon: '🍕', name: 'Pizza Slice', price: 8, buff: 'grip', secs: 180, desc: '+8% grip' },
    soda: { icon: '🥫', name: 'Fizzy Soda', price: 4, buff: 'nitro', secs: 120, desc: 'Nitro recharges 2× faster' },
    coffee: { icon: '☕', name: 'Coffee', price: 4, buff: 'nitro', secs: 120, desc: 'Nitro recharges 2× faster' },
    candy: { icon: '🍭', name: 'Grippy Gummies', price: 5, buff: 'grip', secs: 120, desc: '+8% grip' },
    jerky: { icon: '🥓', name: 'Trail Jerky', price: 6, buff: 'off', secs: 180, desc: 'Better grip on dirt & sand' },
    slushie: { icon: '🧊', name: 'Blue Slushie', price: 5, buff: 'nitro', secs: 150, desc: 'Nitro recharges 2× faster' },
    cocoa: { icon: '☕', name: 'Hot Cocoa', price: 6, buff: 'snow', secs: 180, desc: 'Better grip on snow & ice' },
    cactus: { icon: '🌵', name: 'Cactus Juice', price: 6, buff: 'off', secs: 180, desc: 'Better grip on dirt & sand' },
    donut: { icon: '🍩', name: 'Frosted Donut', price: 5, buff: 'grip', secs: 150, desc: '+8% grip' },
    roomsvc: { icon: '🛎️', name: 'Room Service Feast', price: 25, buff: 'pay', secs: 300, desc: '+10% pay for jobs' }
  };
  const BUFFNAME = { speed: '⚡ Speed', grip: '🛞 Grip', nitro: '🔥 Nitro', snow: '❄️ Snow grip', off: '🏜️ Dirt grip', pay: '💰 +10% pay' };
  IN.BUFFNAME = BUFFNAME;
  const SOUV = GR.SOUVENIRS = { dino: { icon: '🦖', name: 'Dino Keychain', price: 15 }, sand: { icon: '🏺', name: 'Sand Art Jar', price: 20 }, plush: { icon: '🌵', name: 'Cactus Plush', price: 25 }, globe: { icon: '🔮', name: 'Snow Globe', price: 20 }, pin: { icon: '📌', name: 'Grok Rides Pin', price: 10 } };

  // ---------- textures ----------
  const texCache = {};
  function floorTex(kind) {
    if (texCache[kind]) return texCache[kind];
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    if (kind === 'check') { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? '#1f2937' : '#f8fafc'; x.fillRect(i * 32, j * 32, 32, 32); } }
    else if (kind === 'wood') { x.fillStyle = '#b07a45'; x.fillRect(0, 0, 256, 256); for (let j = 0; j < 8; j++) { x.fillStyle = j % 2 ? '#a36d3a' : '#bb8552'; x.fillRect(0, j * 32, 256, 30); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(((j * 97) % 200) + 20, j * 32, 2, 30); } }
    else if (kind === 'tile') { x.fillStyle = '#e2e8f0'; x.fillRect(0, 0, 256, 256); x.strokeStyle = '#94a3b8'; x.lineWidth = 2; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, 256); x.stroke(); x.beginPath(); x.moveTo(0, i * 64); x.lineTo(256, i * 64); x.stroke(); } }
    else if (kind === 'shiny') { const g = x.createLinearGradient(0, 0, 256, 256); g.addColorStop(0, '#f1f5f9'); g.addColorStop(1, '#cbd5e1'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 3; for (let i = 0; i <= 2; i++) { x.beginPath(); x.moveTo(i * 128, 0); x.lineTo(i * 128, 256); x.stroke(); x.beginPath(); x.moveTo(0, i * 128); x.lineTo(256, i * 128); x.stroke(); } }
    else if (kind === 'concrete') { x.fillStyle = '#9ca3af'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 400; i++) { x.fillStyle = 'rgba(0,0,0,' + (Math.random() * 0.08) + ')'; x.fillRect(Math.random() * 256, Math.random() * 256, 3, 3); } x.fillStyle = '#facc15'; x.fillRect(0, 120, 256, 8); }
    else if (kind === 'carpet') { x.fillStyle = '#7c2d4a'; x.fillRect(0, 0, 256, 256); x.fillStyle = '#facc15'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.beginPath(); x.arc(32 + i * 64, 32 + j * 64, 8, 0, 7); x.fill(); } }
    else if (kind === 'rug') { x.fillStyle = '#c2410c'; x.fillRect(0, 0, 256, 256); ['#fde68a', '#0f766e', '#fde68a', '#7c2d12'].forEach((col, i) => { x.fillStyle = col; x.fillRect(0, 30 + i * 56, 256, 18); }); }
    else if (kind === 'snowtile') { x.fillStyle = '#e0f2fe'; x.fillRect(0, 0, 256, 256); x.strokeStyle = '#7dd3fc'; x.lineWidth = 3; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, 256); x.stroke(); x.beginPath(); x.moveTo(0, i * 64); x.lineTo(256, i * 64); x.stroke(); } }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; texCache[kind] = t; return t;
  }
  function signTex(text, bg, fg, w, h, font) {
    const c = document.createElement('canvas'); c.width = w || 512; c.height = h || 128; const x = c.getContext('2d');
    x.fillStyle = bg || '#111827'; x.fillRect(0, 0, c.width, c.height); x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 6; x.strokeRect(3, 3, c.width - 6, c.height - 6);
    x.fillStyle = fg || '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const lines = String(text).split('\n'); const fs = font || Math.min(c.height / lines.length * 0.62, c.width / Math.max(...lines.map((l) => l.length)) * 1.5);
    x.font = 'bold ' + Math.floor(fs) + 'px "Trebuchet MS", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    lines.forEach((l, i) => x.fillText(l, c.width / 2, c.height * (i + 0.5) / lines.length + fs * 0.05));
    return new T.CanvasTexture(c);
  }

  // ---------- builder ----------
  const ROOM = { showroom: [30, 22, 7.5], garage: [24, 18, 6.5], jobs: [20, 16, 5], hotel: [26, 20, 7.5], raceclub: [24, 18, 6], diner: [20, 15, 4.8], pizza: [18, 14, 4.8], store: [20, 15, 4.8], gas: [18, 13, 4.5], trading: [20, 15, 5], icecafe: [22, 16, 5], lodge: [22, 16, 7] };
  function Builder(p) {
    const sz = (p.room ? p.room : p.id === 'skyhangar' ? [36, 26, 11] : p.gen ? (IN.ROOMV[p.variant] || [18, 14, 4.8]) : ROOM[p.kind]).slice(); const b = this;
    b.p = p; b.W = sz[0]; b.D = sz[1]; b.H = sz[2]; b.scene = new T.Scene(); b.solids = []; b.stations = []; b.npcs = []; b.anims = []; b.mats = {};
    b.scene.background = new T.Color('#1e1b2e');
  }
  Builder.prototype.mat = function (c, emis) { const k = c + (emis || ''); return this.mats[k] || (this.mats[k] = emis ? new T.MeshBasicMaterial({ color: c }) : new T.MeshLambertMaterial({ color: c })); };
  Builder.prototype.box = function (x, y, z, w, h, d, c, solid, emis) { const m = new T.Mesh(new T.BoxGeometry(w, h, d), typeof c === 'string' ? this.mat(c, emis) : c); m.position.set(x, y + h / 2, z); this.scene.add(m); if (solid) this.solids.push({ x0: x - w / 2, z0: z - d / 2, x1: x + w / 2, z1: z + d / 2 }); return m; };
  Builder.prototype.cyl = function (x, y, z, r, h, c, solid, seg) { const m = new T.Mesh(new T.CylinderGeometry(r, r, h, seg || 16), this.mat(c)); m.position.set(x, y + h / 2, z); this.scene.add(m); if (solid) this.solids.push({ x0: x - r, z0: z - r, x1: x + r, z1: z + r }); return m; };
  Builder.prototype.ball = function (x, y, z, r, c, emis) { const m = new T.Mesh(new T.SphereGeometry(r, 14, 10), this.mat(c, emis)); m.position.set(x, y, z); this.scene.add(m); return m; };
  // wall sign: side 'n' (back wall z=-D/2), 'e' (x=+W/2), 'w' (x=-W/2), 's' (front wall)
  Builder.prototype.sign = function (text, side, along, y, w, h, bg, fg) {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: signTex(text, bg, fg, Math.round(256 * w / h), 256) }));
    const b = this, e = 0.24;
    if (side === 'n') { m.position.set(along, y, -b.D / 2 + e); }
    else if (side === 's') { m.position.set(along, y, b.D / 2 - e); m.rotation.y = PI; }
    else if (side === 'e') { m.position.set(b.W / 2 - e, y, along); m.rotation.y = -PI / 2; }
    else { m.position.set(-b.W / 2 + e, y, along); m.rotation.y = PI / 2; }
    { const bx = new T.Mesh(M.rbox(w + 0.2, h + 0.2, 0.22, 0.06), this.mat(bg || '#1f2937')); bx.position.copy(m.position); bx.rotation.copy(m.rotation); bx.translateZ(-0.12); b.scene.add(bx); } // a real sign board behind the face
    b.scene.add(m); return m;
  };
  Builder.prototype.window = function (side, along, y, w, h) { // bright daylight window with frame
    const b = this, m = this.sign('', side, along, y, w, h, '#bfe8ff'); m.material.map = null; m.material.color.set('#c9ecff'); m.material.needsUpdate = true;
    const f = this.sign('', side, along, y, w + 0.3, h + 0.3, '#ffffff'); f.position.add(new T.Vector3(side === 'e' ? 0.02 : side === 'w' ? -0.02 : 0, 0, side === 'n' ? -0.02 : side === 's' ? 0.02 : 0)); f.material.map = null; f.material.color.set('#f8fafc');
    const bar = new T.Mesh(new T.PlaneGeometry(0.08, h), this.mat('#f8fafc', true)); bar.position.copy(m.position); bar.rotation.copy(m.rotation); bar.translateZ(0.01); b.scene.add(bar);
    return m;
  };
  Builder.prototype.sprite = function (text, x, y, z, s, opts) {
    if (!opts && [...text].length <= 3 && !/[A-Za-z0-9$]/.test(text)) { const tk = M.token(text, (s || 1.2) * 0.7); tk.position.set(x, y, z); tk.rotation.y = Math.random() * 6; this.scene.add(tk); return tk; } /* emoji prop -> real 3D token */
    const sp = M.sprite(text, Object.assign({ scale: s || 1.2 }, opts || {})); sp.position.set(x, y, z); this.scene.add(sp); return sp; };
  Builder.prototype.plant = function (x, z, s) { // pot with rim + soil + a bushy clump of leaves
    s = s || 1; const pot = new T.Mesh(new T.CylinderGeometry(0.34 * s, 0.25 * s, 0.55 * s, 14), this.mat('#c2410c')); pot.position.set(x, 0.275 * s, z); this.scene.add(pot); this.solids.push({ x0: x - 0.34 * s, z0: z - 0.34 * s, x1: x + 0.34 * s, z1: z + 0.34 * s });
    const rim = new T.Mesh(new T.TorusGeometry(0.34 * s, 0.05 * s, 6, 16), this.mat('#9a3412')); rim.rotation.x = PI / 2; rim.position.set(x, 0.55 * s, z); this.scene.add(rim); this.cyl(x, 0.5 * s, z, 0.3 * s, 0.04, '#57351c', false, 12);
    [[0, 1.0, 0, 0.42, '#16a34a'], [0.22, 1.25, 0.08, 0.3, '#22c55e'], [-0.2, 1.2, -0.1, 0.32, '#15803d'], [0.05, 1.5, -0.05, 0.26, '#4ade80'], [-0.08, 0.85, 0.22, 0.26, '#22c55e']].forEach((q) => { const l = new T.Mesh(new T.IcosahedronGeometry(q[3] * s, 1), this.mat(q[4])); l.position.set(x + q[0] * s, q[1] * s, z + q[2] * s); l.scale.y = 1.15; this.scene.add(l); });
  };
  Builder.prototype.table = function (x, z, c, r) { this.cyl(x, 0.72, z, r || 0.6, 0.06, c || '#f8fafc', false, 18); this.cyl(x, 0, z, 0.07, 0.72, '#6b7280', false, 8); this.solids.push({ x0: x - 0.6, z0: z - 0.6, x1: x + 0.6, z1: z + 0.6 }); };
  Builder.prototype.chair = function (x, z, c, face) { // seat cushion, backrest, four legs; face = direction the sitter looks
    c = c || '#ef4444'; const g = new T.Group(); g.position.set(x, 0, z); this.scene.add(g); const seat = new T.Mesh(M.rbox(0.5, 0.09, 0.5, 0.04), this.mat(c)); seat.position.y = 0.46; g.add(seat);
    const back = new T.Mesh(M.rbox(0.5, 0.5, 0.07, 0.04), this.mat(c)); back.position.set(0, 0.76, -0.22); g.add(back); g.rotation.y = face || 0;
    [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach((q) => { const l = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 0.44, 6), this.mat('#6b4423')); l.position.set(q[0], 0.22, q[1]); g.add(l); });
  };
  Builder.prototype.shelf = function (x, z, w, rotX, cols) { // shelf of colorful boxes, long along x (or z when rotX)
    const d = 0.7, h = 1.9, sx = rotX ? d : w, sz = rotX ? w : d; this.box(x, 0, z, sx, h, sz, '#e5e7eb', true);
    cols = cols || ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6'];
    for (let lv = 0; lv < 3; lv++) for (let i = 0; i < Math.floor(w / 0.45); i++) { const o = -w / 2 + 0.25 + i * 0.45, c = cols[(i * 3 + lv * 5) % cols.length]; const hh = 0.32 + ((i + lv) % 3) * 0.06; if (rotX) { this.box(x - d / 2 - 0.02, 0.3 + lv * 0.6, z + o, 0.12, hh, 0.36, c); this.box(x + d / 2 + 0.02, 0.3 + lv * 0.6, z + o, 0.12, hh, 0.36, c); } else { this.box(x + o, 0.3 + lv * 0.6, z - d / 2 - 0.02, 0.36, hh, 0.12, c); this.box(x + o, 0.3 + lv * 0.6, z + d / 2 + 0.02, 0.36, hh, 0.12, c); } }
  };
  Builder.prototype.counter = function (x, z, w, d, top, front) { this.box(x, 0, z, w, 1.0, d, front || '#7c3aed', true); this.box(x, 1.0, z, w + 0.1, 0.08, d + 0.1, top || '#f8fafc'); };
  Builder.prototype.sofa = function (x, z, w, c, rot) { const g = new T.Group(), R = (bx, by, bz, bw, bh, bd, rr, col) => { const m = new T.Mesh(M.rbox(bw, bh, bd, rr), this.mat(col || c)); m.position.set(bx, by + bh / 2, bz); g.add(m); };
    const dk = new T.Color(c).multiplyScalar(0.8).getStyle(); R(0, 0.1, 0, w, 0.3, 0.9, 0.08, dk); const n = Math.max(2, Math.round(w / 1.1)); for (let i = 0; i < n; i++) { const cw = (w - 0.5) / n, cx = -w / 2 + 0.25 + cw * (i + 0.5); R(cx, 0.4, 0.05, cw - 0.04, 0.18, 0.78, 0.08); R(cx, 0.55, -0.34, cw - 0.04, 0.6, 0.22, 0.1); }
    R(-w / 2 + 0.13, 0.1, 0, 0.26, 0.6, 0.92, 0.12, dk); R(w / 2 - 0.13, 0.1, 0, 0.26, 0.6, 0.92, 0.12, dk); R(-w / 2 + 0.6, 0.62, -0.05, 0.38, 0.32, 0.12, 0.1, '#fde68a');
    [[-w / 2 + 0.15, -0.35], [w / 2 - 0.15, -0.35], [-w / 2 + 0.15, 0.35], [w / 2 - 0.15, 0.35]].forEach((q) => { const l = new T.Mesh(new T.CylinderGeometry(0.04, 0.03, 0.1, 6), this.mat('#6b4423')); l.position.set(q[0], 0.05, q[1]); g.add(l); });
    g.position.set(x, 0, z); g.rotation.y = rot || 0; this.scene.add(g); const hw = Math.abs(Math.cos(rot || 0)) > 0.5 ? w / 2 : 0.45, hd = Math.abs(Math.cos(rot || 0)) > 0.5 ? 0.45 : w / 2; this.solids.push({ x0: x - hw, z0: z - hd, x1: x + hw, z1: z + hd }); };
  Builder.prototype.car = function (type, x, z, yaw, color, y) { const m = M.vehicle(type, color || GR.VEH[type].color || '#ff4fd8'); m.position.set(x, y || 0, z); m.rotation.y = yaw || 0; this.scene.add(m); const L = m.userData.L || 4, Wd = m.userData.W || 2; const c = Math.abs(Math.sin(yaw || 0)) > 0.7; this.solids.push({ x0: x - (c ? L : Wd) / 2, z0: z - (c ? Wd : L) / 2, x1: x + (c ? L : Wd) / 2, z1: z + (c ? Wd : L) / 2 }); return m; };
  Builder.prototype.npc = function (x, z, yaw, o) {
    const g = GR.Person(o); g.position.set(x, o.y || 0, z); g.rotation.y = yaw; g.userData.baseY = o.y || 0; this.scene.add(g);
    const tag = M.sprite(o.name, { color: '#fff', bg: 'rgba(30,20,60,.75)', wide: 3, scale: 0.6, fs: 0.48, bold: true }); tag.position.set(x, (o.y || 0) + 2.45, z); this.scene.add(tag);
    const n = { g, tag, x, z, yaw0: yaw, name: o.name, lines: o.lines || ['Hi there!'], mode: o.mode || 'idle', path: o.path || null, pi: 0, li: 0, waveT: 0, danceT: 0 };
    this.npcs.push(n); return n;
  };
  Builder.prototype.station = function (x, z, icon, label, fn, col) {
    const ring = new T.Mesh(new T.RingGeometry(0.75, 1.0, 32), new T.MeshBasicMaterial({ color: col || '#3ff0ff', transparent: true, opacity: 0.85, side: T.DoubleSide })); ring.rotation.x = -PI / 2; ring.position.set(x, 0.03, z); this.scene.add(ring);
    const sp = M.token(icon, 0.75, col || '#3ff0ff'); sp.position.set(x, 2.3, z); this.scene.add(sp);
    const st = { x, z, icon, label, fn, ring, sp }; this.stations.push(st); return st;
  };
  Builder.prototype.shell = function (o) {
    const b = this, Wd = b.W, D = b.D, H = b.H, wall = o.wall || '#f1f5f9', acc = b.p.acc;
    const ft = floorTex(o.floor || 'tile').clone(); ft.needsUpdate = true; ft.repeat.set(Wd / (o.tile || 4), D / (o.tile || 4));
    const fl = new T.Mesh(new T.PlaneGeometry(Wd, D), new T.MeshLambertMaterial({ map: ft })); fl.rotation.x = -PI / 2; b.scene.add(fl);
    if (o.rug) { const rt = floorTex(o.rug); const r = new T.Mesh(new T.PlaneGeometry(o.rugW || 4, o.rugD || 6), new T.MeshLambertMaterial({ map: rt })); r.rotation.x = -PI / 2; r.position.set(0, 0.015, o.rugZ || 0); b.scene.add(r); }
    const wm = new T.MeshLambertMaterial({ color: wall });
    const wl = (x, z, w, d, h, y) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), wm); m.position.set(x, (y || 0) + h / 2, z); b.scene.add(m); };
    wl(0, -D / 2 - 0.15, Wd + 0.6, 0.3, H); wl(-Wd / 2 - 0.15, 0, 0.3, D, H); wl(Wd / 2 + 0.15, 0, 0.3, D, H);
    // front wall with door opening (2.4 wide, 2.8 tall)
    const sw = (Wd - 2.4) / 2; wl(-Wd / 2 + sw / 2, D / 2 + 0.15, sw, 0.3, H); wl(Wd / 2 - sw / 2, D / 2 + 0.15, sw, 0.3, H); wl(0, D / 2 + 0.15, 2.4, 0.3, H - 2.8, 2.8);
    // glass door (exit) — glowing so it's obvious
    const dm = new T.Mesh(new T.PlaneGeometry(2.3, 2.75), new T.MeshBasicMaterial({ color: '#7CFC9A', transparent: true, opacity: 0.55 })); dm.position.set(0, 1.4, D / 2 + 0.05); dm.rotation.y = PI; b.scene.add(dm);
    const ex = b.sign('🚪 EXIT', 's', 0, 3.15, 1.8, 0.5, '#16a34a'); ex.position.z -= 0.0;
    // ceiling + lights
    const ce = new T.Mesh(new T.PlaneGeometry(Wd, D), new T.MeshBasicMaterial({ color: o.ceil || '#eeeaf6' })); ce.rotation.x = PI / 2; ce.position.y = H; if (!o.noCeil) b.scene.add(ce);
    for (let i = -1; i <= 1; i += 2) for (let j = -1; j <= 1; j += 2) if (!o.noCeil) b.box(i * Wd / 4, H - 0.08, j * D / 4, 2.2, 0.06, 0.8, '#fffbe6', false, true); else b.sprite('✨', i * Wd / 3, H - 0.6, j * D / 3, 0.5);
    // baseboard trim + accent stripe
    b.box(0, 0, -D / 2 + 0.03, Wd, 0.25, 0.06, acc); b.box(-Wd / 2 + 0.03, 0, 0, 0.06, 0.25, D, acc); b.box(Wd / 2 - 0.03, 0, 0, 0.06, 0.25, D, acc);
    b.box(0, H - 0.2, -D / 2 + 0.03, Wd, 0.1, 0.06, acc); b.box(-Wd / 2 + 0.03, H - 0.6, 0, 0.06, 0.2, D, acc); b.box(Wd / 2 - 0.03, H - 0.6, 0, 0.06, 0.2, D, acc);
    if (o.windows !== false) { const n = Math.max(1, Math.floor(D / 6)); for (let i = 0; i < n; i++) { const a = -D / 2 + D * (i + 0.5) / n; if (o.winE !== false) b.window('e', a, Math.min(2.2, H / 2), 2.2, 1.5); if (o.winW !== false) b.window('w', a, Math.min(2.2, H / 2), 2.2, 1.5); } }
    b.sign(b.p.icon + ' ' + b.p.short, 'n', 0, H - 0.75, Math.min(Wd - 4, 9), 0.9, acc);
    b.scene.add(new T.HemisphereLight(0xffffff, 0x8a7766, 0.75)); b.scene.add(new T.AmbientLight(0xffffff, 0.3));
    const dl = new T.DirectionalLight(0xffffff, 0.45); dl.position.set(3, 10, 6); b.scene.add(dl);
    b.exit = { x: 0, z: D / 2 - 0.9 };
  };

  // ---------- per-kind content ----------
  const SHIRTS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#14b8a6', '#ec4899', '#f97316'];
  const HAIRS = ['#4b2e1a', '#111827', '#d4a373', '#7c2d12', '#e5e7eb', '#facc15'];
  const SKINS = ['#f2c9a0', '#c68642', '#8d5524', '#ffdbac', '#e0ac69'];
  let rr = 1; const pick = (a) => a[(rr = (rr * 9301 + 49297) % 233280) % a.length];
  const who = (name, extra) => Object.assign({ name, shirt: pick(SHIRTS), hair: pick(HAIRS), skin: pick(SKINS) }, extra || {});
  const spotOf = (id) => GR.SPOTS.find((s) => s.id === id);
  const nearestSpot = (pred, x, z) => { let best = null, bd = 1e9; GR.SPOTS.forEach((s) => { if (!pred(s)) return; const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; best = s; } }); return best; };

  function snackStation(b, x, z, list, title) {
    const S = list.map((k) => SNACKS[k]); return b.station(x, z, S[0].icon, (title || 'ORDER') , () => IN.snackMenu(b.p, list, title), '#ffd23f');
  }
  function hatStation(b, x, z, list) {
    // hat rack prop
    b.cyl(x - 1.3, 0, z, 0.05, 1.7, '#78350f', false, 6); list.forEach((h, i) => { const g = new T.Group(); GR.Person.setHat({ userData: { head: g } }, h); g.position.set(x - 1.3 + (i % 2 ? 0.25 : -0.25), 1.2 + i * 0.25, z); b.scene.add(g); });
    return b.station(x, z, '🧢', 'HATS', () => IN.hatMenu(list), '#a855f7');
  }
  const BUILD = {
    showroom(b, p) {
      const spot = spotOf(p.spot), air = !!spot.air, boat = !!spot.boat;
      b.shell({ floor: air ? 'concrete' : 'shiny', tile: air ? 6 : 4, wall: p.wall, windows: !air, winW: false });
      const list = GR.VEH_ORDER.filter((k) => { const V = GR.VEH[k]; if (air) return GR.isAir(k) && k !== 'balloon'; if (boat) return V.kind === 'boat'; return V.kind === 'ground' && !V.hidden; });
      const pickList = air || boat ? list.slice(0, 3) : ['sports', 'super', 'monster', 'pickup'].filter((k) => GR.VEH[k]);
      const n = pickList.length, Wd = b.W;
      pickList.forEach((k, i) => {
        const x = -Wd / 2 + Wd * (i + 0.5) / n, z = -2.5; const V = GR.VEH[k];
        const pod = b.cyl(x, 0, z, air ? 4.4 : 2.9, 0.25, p.acc, false, 32); const m = b.car(k, x, z, 0.6, V.color, 0.25); b.solids.pop(); b.solids.push({ x0: x - (air ? 4.4 : 2.9), z0: z - (air ? 4.4 : 2.9), x1: x + (air ? 4.4 : 2.9), z1: z + (air ? 4.4 : 2.9) });
        b.anims.push((t) => { m.rotation.y = 0.6 + t * 0.35 + i; });
        b.sprite(V.icon + ' ' + U.fmtMoney(V.price), x, air ? 6.2 : 3.8, z, 0.8, { wide: 3.5, bg: 'rgba(30,20,60,.8)', fs: 0.5, bold: true });
        b.station(x, z + (air ? 5.6 : 4.2), '🔍', V.name.toUpperCase(), () => UI().dealer(spot, k), p.acc);
      });
      b.counter(Wd / 2 - 4, b.D / 2 - 5, 4, 1.2, '#f8fafc', '#1f2937');
      b.station(Wd / 2 - 4, b.D / 2 - 3.2, '🛒', 'SEE ALL ' + (air ? 'AIRCRAFT' : boat ? 'BOATS' : 'RIDES'), () => UI().dealer(spot), '#ffd23f');
      b.box(-Wd / 2 + 2.5, 0, b.D / 2 - 4, 1.0, 1.7, 0.8, '#1f2937', true); b.sprite('☕', -Wd / 2 + 2.5, 2.1, b.D / 2 - 4, 0.6);
      snackStation(b, -Wd / 2 + 2.5, b.D / 2 - 2.6, ['coffee', 'donut'], 'FREE-ISH COFFEE');
      b.plant(-Wd / 2 + 1.2, -b.D / 2 + 1.2); b.plant(Wd / 2 - 1.2, -b.D / 2 + 1.2);
      b.sign(air ? 'FLY HIGH WITH GROK ✈' : boat ? 'MAKE A SPLASH ⚓' : 'DRIVE YOUR DREAM 🚗', 'w', -2, 3.2, 6, 1, '#111827', p.acc);
      b.npc(Wd / 2 - 4, b.D / 2 - 6.2, 0, who(air ? 'Captain Skye' : boat ? 'Skipper Sue' : 'Sal the Seller', { shirt: '#111827', mode: 'wave', lines: air ? ['Helicopters hover, planes go zoom, balloons float slow and pretty!', 'Fly through the Sky Rings for medals!'] : boat ? ['Boats can only launch here at Sparkle Marina.', 'The lake race loans you a boat for free!'] : ['Every ride here is fair and fun. Tap a car to see its stats!', 'Earn money with jobs and races, then come back!', 'Upgrades at the garage make any car faster.'] }));
      b.npc(-4, 3, PI * 0.8, who('Max', { lines: ['I\u2019m saving up for the monster truck!', 'Have you tried the drift in the sports car?'], path: [[-6, 3.5], [4, 3.5]] }));
      b.npc(5, 2.5, -PI * 0.6, who('Pat', { lines: ['That one has a turbo! VROOM!', 'My kid loves the ice cream truck.'] }));
    },
    garage(b, p) {
      const spot = spotOf(p.spot); b.shell({ floor: 'concrete', tile: 6, wall: p.wall, ceil: '#d1d5db' });
      // lift with car
      const lx = -4, lz = -3; [[-1.6, -2.8], [1.6, -2.8], [-1.6, 2.8], [1.6, 2.8]].forEach((o) => b.box(lx + o[0], 0, lz + o[1], 0.25, 2.4, 0.25, '#ef4444', true));
      b.box(lx, 1.6, lz, 2.8, 0.15, 5.4, '#6b7280'); b.car('muscle', lx, lz, 0, '#22d3ee', 1.75); b.solids.pop(); b.solids.push({ x0: lx - 1.7, z0: lz - 2.9, x1: lx + 1.7, z1: lz + 2.9 });
      // tool chests + tires
      for (let i = 0; i < 3; i++) b.box(b.W / 2 - 0.6, 0, -4 + i * 1.4, 0.9, 1.1, 1.2, ['#dc2626', '#2563eb', '#dc2626'][i], true);
      b.sign('🔧 TOOLS', 'e', -3, 2.4, 2.6, 0.7, '#dc2626');
      for (let i = 0; i < 4; i++) { const t = new T.Mesh(new T.TorusGeometry(0.42, 0.18, 8, 16), b.mat('#111827')); t.rotation.x = PI / 2; t.position.set(-b.W / 2 + 1, 0.2 + i * 0.36, b.D / 2 - 3); b.scene.add(t); }
      b.solids.push({ x0: -b.W / 2, z0: b.D / 2 - 3.7, x1: -b.W / 2 + 1.7, z1: b.D / 2 - 2.3 });
      // paint booth
      b.box(4, 0, -5.5, 5, 0.04, 4, '#a855f7'); ['#ef4444', '#22c55e', '#3b82f6', '#facc15'].forEach((c, i) => b.box(2.2 + i * 1.2, 0, -b.D / 2 + 0.6, 0.6, 0.9, 0.6, c, true));
      b.sign('🎨 PAINT BOOTH', 'n', 4, 3, 4.5, 0.9, '#a855f7');
      b.station(1, 1.5, '🔧', 'REPAIR & TUNE', () => UI().garage(spot), '#22c55e');
      b.station(4, -3.2, '🎨', 'PAINT & UPGRADES', () => UI().garage(spot), '#a855f7');
      b.box(b.W / 2 - 1, 0, b.D / 2 - 3, 1.0, 1.8, 0.8, '#ef4444', true); b.sprite('🥤', b.W / 2 - 1, 2.2, b.D / 2 - 3, 0.6);
      snackStation(b, b.W / 2 - 2.3, b.D / 2 - 2.0, ['soda', 'candy'], 'SODA MACHINE');
      b.npc(-1.6, -1, PI / 2, who('Wrench Wendy', { shirt: '#1d4ed8', mode: 'wave', hat: 'cap', lines: ['Crash? No problem! I fix everything.', 'Grip tires help a LOT on snow and sand.', 'Nitro is the most fun upgrade, trust me!'] }));
      b.npc(-4, 0.4, PI, who('Gus', { shirt: '#1d4ed8', lines: ['Just changing the oil on this beauty.', 'Paint your ride any color you like!'] }));
      b.npc(4, 2, -PI / 2, who('Customer Kim', { lines: ['My car got a big dent from a cartoon crash, haha!'], path: [[3, 2], [3, -1]] }));
    },
    jobs(b, p) {
      b.shell({ floor: 'tile', wall: p.wall, winW: false });
      // desks
      [[-5, -3], [0, -3], [5, -3]].forEach((d, i) => { b.box(d[0], 0, d[1], 2.6, 0.78, 1.2, '#92400e', true); b.box(d[0], 0.78, d[1] - 0.3, 0.9, 0.6, 0.06, '#111827'); const sc = b.box(d[0], 0.83, d[1] - 0.27, 0.8, 0.5, 0.02, ['#3ff0ff', '#7CFC9A', '#ffd23f'][i], false, true); void sc; b.chair(d[0], d[1] + 1.0, '#1f2937'); });
      // big map board
      const mapC = document.createElement('canvas'); mapC.width = 512; mapC.height = 512; mapC.getContext('2d').drawImage(UI().baseMap(), 0, 0, 512, 512);
      const mm = new T.Mesh(new T.PlaneGeometry(4.2, 4.2), new T.MeshBasicMaterial({ map: new T.CanvasTexture(mapC) })); mm.position.set(-b.W / 2 + 0.07, 2.4, 2); mm.rotation.y = PI / 2; b.scene.add(mm);
      b.sign('📋 JOBS TODAY:\n🚕 Taxi · 🍕 Pizza · 📦 Cargo\n🤵 Limo · 🚌 Bus · 🪝 Tow · 🎈 Tours', 'e', 0, 2.4, 5, 2.2, '#f59e0b', '#1f2937');
      b.station(3, 2.5, '📋', 'JOB BOARD', () => IN.jobBoard(p), '#3ff0ff');
      b.box(-b.W / 2 + 1, 0, -b.D / 2 + 1.2, 0.8, 1.6, 0.8, '#e5e7eb', true); b.sprite('☕', -b.W / 2 + 1, 2, -b.D / 2 + 1.2, 0.6);
      snackStation(b, -b.W / 2 + 2.4, -b.D / 2 + 2.2, ['coffee', 'donut'], 'COFFEE CORNER');
      b.npc(0, -2.0, 0, who('Dispatcher Dee', { mode: 'sit', y: 0.0, lines: ['Taxi riders tip more if you drive smooth!', 'Pick a job on the board — each one needs the right ride.', 'Limo VIPs love a gentle ride. No bumps!'] }));
      b.npc(-5, -2.0, 0, who('Radio Ray', { mode: 'sit', lines: ['Calling all drivers! Pizzas are getting cold!'] }));
      b.npc(4, 4, PI, who('Driver Dan', { hat: 'cap', lines: ['I made $500 on bus routes today!', 'The tow job is really fun.'], path: [[4, 4.5], [-3, 4.5]] }));
      b.plant(b.W / 2 - 1, -b.D / 2 + 1);
    },
    hotel(b, p) {
      b.shell({ floor: 'shiny', wall: p.wall, rug: 'carpet', rugW: 3.2, rugD: b.D - 2, rugZ: 0, ceil: '#fdf2f8' });
      // chandelier
      const ch = new T.Group(); for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2; const m = new T.Mesh(new T.SphereGeometry(0.16, 8, 6), b.mat('#fff7cc', true)); m.position.set(Math.cos(a) * 1.1, 0, Math.sin(a) * 1.1); ch.add(m); } const ring = new T.Mesh(new T.TorusGeometry(1.1, 0.06, 6, 30), b.mat('#facc15')); ring.rotation.x = PI / 2; ch.add(ring); ch.position.set(0, b.H - 1.4, -1); b.scene.add(ch); b.anims.push((t) => { ch.rotation.y = t * 0.2; });
      { const pl = new T.PointLight(0xffe7a8, 0.6, 18); pl.position.set(0, b.H - 1.6, -1); b.scene.add(pl); }
      b.counter(-6, -5.5, 5, 1.2, '#facc15', '#7e22ce'); b.sprite('🛎️', -6, 1.4, -5.5, 0.5);
      b.station(-6, -3.6, '🛎️', 'ROOM SERVICE', () => IN.snackMenu(p, ['roomsvc', 'shake', 'pancakes'], 'ROOM SERVICE'), '#ffd23f');
      b.counter(6, -5.5, 4, 1.2, '#f8fafc', '#111827'); b.sprite('🎩', 6, 1.4, -5.5, 0.5);
      b.station(6, -3.6, '🤵', 'VIP LIMO DESK', () => IN.startJobFrom(p, 'limo'), '#a855f7');
      // elevators
      [-2, 2].forEach((x) => { b.box(x, 0, -b.D / 2 + 0.1, 1.8, 3, 0.1, '#d4d4d8'); b.box(x, 0, -b.D / 2 + 0.15, 0.04, 3, 0.05, '#71717a'); });
      b.sign('🛗 ROOMS 1–30', 'n', 0, 3.6, 3, 0.5, '#7e22ce');
      // piano + sofas
      b.box(8, 0, 4, 2.2, 1.0, 1.4, '#111827', true); b.box(8, 1.0, 3.4, 2.1, 0.06, 0.25, '#f8fafc'); b.chair(8, 5.2, '#7e22ce');
      b.station(8, 6.4, '🎹', 'PLAY THE PIANO', () => IN.party(b, '🎹 Everyone loves your song!'), '#ec4899');
      b.sofa(-7, 3, 3.4, '#a21caf', 0); b.sofa(-7, 7, 3.4, '#a21caf', PI); b.table(-7, 5, '#facc15', 0.5);
      b.plant(-b.W / 2 + 1, b.D / 2 - 1.5, 1.3); b.plant(b.W / 2 - 1, b.D / 2 - 1.5, 1.3); b.plant(-b.W / 2 + 1, -b.D / 2 + 1, 1.3); b.plant(b.W / 2 - 1, -b.D / 2 + 1, 1.3);
      b.npc(-6, -6.6, 0, who('Concierge Clara', { shirt: '#7e22ce', lines: ['Welcome to the Grand Grok Hotel!', 'Room service gives you +10% job pay for 5 minutes.', 'VIPs need a limo. Our desk can set you up!'] }));
      b.npc(6, -6.6, 0, who('Bellhop Bo', { shirt: '#b91c1c', hat: 'cap', mode: 'wave', lines: ['Need a limo? I\u2019ll call the VIP right away!'] }));
      b.npc(-7, 2.7, 0, who('Guest Gloria', { mode: 'sit', y: 0.05, lines: ['The rooftop view is amazing at sunset!'] }));
      b.npc(2, 5, PI, who('Tourist Tom', { lines: ['I came here by hot air balloon!', 'Have you seen the giant Grok statue?'], path: [[2, 6], [2, 0]] }));
    },
    raceclub(b, p) {
      b.shell({ floor: 'check', tile: 2, wall: p.wall, ceil: '#e5e7eb', winE: false, winW: false });
      b.car('super', 0, -4, 0.4, '#ef4444'); b.cyl(0, 0, -4, 3, 0.1, '#111827');
      // trophy shelves
      for (let i = 0; i < 3; i++) { b.box(-b.W / 2 + 0.4, 0.4 + i * 0.7, -2 + 0, 0.6, 0.06, 6, '#78350f'); for (let j = 0; j < 4; j++) { const z = -4.5 + j * 1.6; b.cyl(-b.W / 2 + 0.4, 0.46 + i * 0.7, z, 0.12, 0.25, '#facc15', false, 8); b.ball(-b.W / 2 + 0.4, 0.86 + i * 0.7, z, 0.15, ['#facc15', '#d1d5db', '#d97706'][(i + j) % 3]); } }
      b.solids.push({ x0: -b.W / 2, z0: -5.2, x1: -b.W / 2 + 0.8, z1: 1.2 });
      b.station(-b.W / 2 + 2, -2, '🏆', 'TROPHY CASE', () => IN.trophies(), '#ffd23f');
      // race board
      b.sign('🏁 RACES\n' + GR.RACES.slice(0, 5).map((r) => r.icon + ' ' + r.name).join('\n'), 'e', -1, 2.7, 4.4, 3.4, '#111827', '#ffffff');
      b.station(b.W / 2 - 2.2, -1, '🏁', 'RACE BOARD', () => IN.raceBoard(), '#ef4444');
      // sim rigs
      [3, 6].forEach((x, i) => { b.box(x, 0, 4, 1, 0.5, 1.4, '#111827', true); b.box(x, 0.5, 3.4, 1, 0.8, 0.12, '#111827'); b.box(x, 0.9, 5.0, 1.4, 0.8, 0.05, i ? '#3ff0ff' : '#7CFC9A', false, true); });
      b.station(4.5, 2.2, '🎮', 'SIM RIG PRACTICE', () => { GR.Snd.fx('nitro'); const t = (55 + Math.random() * 10).toFixed(2); UI().toast('🎮 Practice lap: 0:' + t + ' — nice driving!'); IN.cheer(b); }, '#3ff0ff');
      b.npc(b.W / 2 - 3.2, -2.5, -PI / 2, who('Coach Revs', { shirt: '#ef4444', hat: 'cap', mode: 'wave', lines: ['Racing is about clean lines. Brake BEFORE the turn!', 'NPC racers drive the same car as you. Fair and square!', 'Win on Hard for the big prize!'] }));
      b.npc(4.5, 5, PI, who('Racer Rosa', { mode: 'sit', lines: ['I just beat the Ice Ring on hard!'] }));
      b.npc(-3, 3, 0.5, who('Speedy Sam', { lines: ['Nitro on the straights, not the corners!', 'The Grand Tour goes through every region.'], path: [[-3, 3], [-3, 6.5]] }));
    },
    diner(b, p) {
      const burger = p.id === 'burger';
      b.shell({ floor: 'check', tile: 2, wall: p.wall, ceil: '#fff7ed' });
      b.counter(-2, -b.D / 2 + 2.3, 10, 1.0, '#e5e7eb', burger ? '#ef4444' : '#ec4899');
      for (let i = 0; i < 6; i++) { const x = -6 + i * 1.6; b.cyl(x, 0, -b.D / 2 + 3.4, 0.25, 0.7, '#e5e7eb', false, 10); b.cyl(x, 0.7, -b.D / 2 + 3.4, 0.3, 0.1, '#ef4444', false, 14); }
      b.sign(burger ? '🍔 BURGER $15\n🍟 FRIES $8\n🥤 SHAKE $10' : '🥞 PANCAKES $12\n🍔 BURGER $15\n🥤 SHAKE $10', 'n', 6.2, 2.75, 3.6, 1.5, '#111827', '#ffd23f');
      // booths
      [[6, -2], [6, 2.5]].forEach((bt) => { b.sofa(bt[0], bt[1] - 1.2, 2.4, '#dc2626', 0); b.sofa(bt[0], bt[1] + 1.2, 2.4, '#dc2626', PI); b.box(bt[0], 0, bt[1], 2.0, 0.75, 1.0, '#f8fafc', true); });
      // jukebox
      const jx = -b.W / 2 + 0.8, jz = 3; b.box(jx, 0, jz, 1.0, 1.6, 0.8, '#f59e0b', true); const jt = b.ball(jx, 1.6, jz, 0.5, '#ec4899', true); jt.scale.z = 0.8; b.anims.push((t) => { jt.material.color.setHSL((t * 0.2) % 1, 0.9, 0.6); });
      snackStation(b, -2, -b.D / 2 + 4.6, burger ? ['burger', 'fries', 'shake'] : ['pancakes', 'burger', 'shake'], 'ORDER FOOD');
      b.station(jx + 1.5, jz, '🎵', 'JUKEBOX', () => IN.party(b, '🎵 Dance party!'), '#ec4899');
      b.npc(-2, -b.D / 2 + 1.3, 0, who(burger ? 'Chef Patty' : 'Flo', { shirt: '#ffffff', lines: burger ? ['Turbo Burgers make your ride a little faster!', 'Extra pickles? You got it!'] : ['Pancakes, hon? They\u2019re famous!', 'Truckers love our coffee.'] }));
      b.npc(5.4, -2.6, 0, who('Hungry Hank', { mode: 'sit', y: 0.05, lines: ['Mmm, best fries in the world!'] }));
      b.npc(6.6, 3.1, PI, who('Lily', { mode: 'sit', y: 0.05, lines: ['Play the jukebox! Everyone dances!'] }));
      b.npc(0, 2, PI, who('Waiter Will', { lines: ['Sit anywhere you like!', 'Shakes recharge your nitro faster!'], path: [[2, 3], [-4, 3]] }));
    },
    pizza(b, p) {
      b.shell({ floor: 'check', tile: 2, wall: p.wall });
      const ov = b.ball(-5, 1.4, -b.D / 2 + 1.6, 1.4, '#9a3412'); ov.scale.y = 0.8; b.box(-5, 0, -b.D / 2 + 1.6, 2.6, 0.9, 2.2, '#78350f', true); const fire = b.ball(-5, 1.2, -b.D / 2 + 2.6, 0.45, '#f97316', true); b.anims.push((t) => { fire.scale.setScalar(0.9 + Math.sin(t * 9) * 0.1); });
      b.counter(2, -b.D / 2 + 2.2, 7, 1.0, '#f8fafc', '#dc2626');
      b.sign('🍕 PIZZA SLICE $8\n🥫 SODA $4\n📦 DRIVERS WANTED!', 'e', 0, 2.5, 3.8, 1.6, '#dc2626');
      snackStation(b, 0.5, -b.D / 2 + 4.0, ['slice', 'soda'], 'ORDER PIZZA');
      b.station(4.5, -b.D / 2 + 4.0, '📦', 'DELIVERY DESK', () => IN.startJobFrom(p, 'pizza'), '#3ff0ff');
      [[-4, 2], [0, 3], [4, 2]].forEach((t) => { b.table(t[0], t[1], '#fde68a'); b.chair(t[0] - 0.9, t[1], '#dc2626'); b.chair(t[0] + 0.9, t[1], '#16a34a'); });
      b.npc(2, -b.D / 2 + 1.3, 0, who('Papa Pepperoni', { shirt: '#ffffff', hat: 'cap', lines: ['Deliver pizzas fast and they stay hot!', 'The ice cream truck can deliver too — it\u2019s cool!'] }));
      b.npc(-4.9, 2, PI / 2, who('Nina', { mode: 'sit', y: 0.05, lines: ['Pepperoni is the best topping. Fact.'] }));
      b.npc(4.9, 2, -PI / 2, who('Leo', { mode: 'sit', y: 0.05, lines: ['I deliver pizza on my day off!'] }));
    },
    store(b, p) {
      b.shell({ floor: 'wood', wall: p.wall });
      b.shelf(-4, -1, 6, false); b.shelf(-4, 3, 6, false); b.shelf(3, -1, 4, false, ['#facc15', '#ef4444', '#f97316']);
      b.box(b.W / 2 - 0.6, 0, -2, 1.0, 2.2, 4, '#e0f2fe', true); b.box(b.W / 2 - 1.12, 0.2, -2, 0.02, 1.9, 3.8, '#bae6fd', false, true); b.sign('🥤 COLD DRINKS', 'e', -1, 2.6, 2.4, 0.5, '#0ea5e9');
      b.counter(4, b.D / 2 - 4, 4, 1.2, '#f8fafc', '#16a34a'); b.sprite('🍭', 3, 1.4, b.D / 2 - 4, 0.5);
      snackStation(b, 4, b.D / 2 - 2.3, ['candy', 'soda', 'jerky'], 'SNACKS');
      hatStation(b, -b.W / 2 + 2.5, b.D / 2 - 3, ['cap', 'cowboy', 'beanie', 'crown']);
      b.station(0, -b.D / 2 + 1.8, '🎁', 'SOUVENIRS', () => IN.souvMenu(['pin', 'dino', 'globe']), '#ec4899');
      b.npc(4, b.D / 2 - 5.1, 0 + PI * 0, who('Mr. Maple', { shirt: '#16a34a', lines: ['Howdy! Hats keep your head warm AND look cool.', 'Gummies help your tires grip!', 'Pine Hollow has the best pizza around.'] }));
      b.npc(0, 1, PI / 2, who('Shopper Sue', { lines: ['Where are the marshmallows?'], path: [[-1, 1], [-7, 1]] }));
      b.npc(-6, 5, 0, who('Little Leo', { lines: ['I want the crown hat!!'] }));
    },
    gas(b, p) {
      b.shell({ floor: 'tile', wall: p.wall });
      b.shelf(-3, 0, 5, false); b.shelf(-3, 3.2, 5, false, ['#ef4444', '#3b82f6', '#facc15']);
      const sl = b.box(b.W / 2 - 1, 0, -3, 1.2, 1.6, 0.8, '#1d4ed8', true); void sl; ['#3b82f6', '#ef4444'].forEach((c, i) => { const t = b.cyl(b.W / 2 - 1.3 + i * 0.6, 1.6, -3, 0.22, 0.5, c); b.anims.push((tt) => { t.rotation.y = tt * 2; }); });
      b.counter(3, b.D / 2 - 3.5, 3.6, 1.1, '#f8fafc', p.acc);
      snackStation(b, b.W / 2 - 2.6, -1.4, ['slushie', 'candy', 'jerky'], 'SLUSHIES & SNACKS');
      b.station(3, b.D / 2 - 1.9, '🧽', 'CAR WASH ($20)', () => IN.carWash(), '#3ff0ff');
      b.sign('⛽ FUEL UP · 🧽 CAR WASH · 🧊 SLUSHIES', 'n', 0, 2.8, 7, 0.8, p.acc);
      b.npc(3, b.D / 2 - 4.5, 0, who('Clerk Carla', { shirt: p.acc, lines: ['Our car wash makes your ride sparkle!', 'Slushies recharge nitro faster. Brain freeze not included.'] }));
      b.npc(-6, 1.6, PI / 2, who('Trucker Tex', { hat: 'cowboy', lines: ['Long drive across the desert. Need jerky!'], path: [[-6, 1.6], [0, 1.6]] }));
    },
    trading(b, p) {
      b.shell({ floor: 'wood', wall: '#e8c39e', rug: 'rug', rugW: 5, rugD: 3.4, rugZ: 1.5, ceil: '#f5deb3' });
      for (let i = -2; i <= 2; i++) b.box(i * 3, b.H - 0.3, 0, 0.25, 0.25, b.D, '#78350f');
      b.sign('', 'n', -7, 2.6, 2.4, 1.6, '#c2410c'); b.sign('', 'n', 7, 2.6, 2.4, 1.6, '#0f766e'); b.sign('', 'w', 0, 2.4, 2.4, 1.6, '#7c3aed');
      for (let i = 0; i < 5; i++) { const pt = b.cyl(-b.W / 2 + 1.5 + i * 1.1, 0, -b.D / 2 + 1.0, 0.35, 0.6 + (i % 2) * 0.3, ['#b45309', '#c2410c', '#92400e'][i % 3], true, 12); void pt; }
      [[4, -4], [6, 3], [-6, 4]].forEach((c) => { b.cyl(c[0], 0, c[1], 0.3, 0.4, '#b45309', true, 10); b.cyl(c[0], 0.4, c[1], 0.18, 1.0, '#16a34a', false, 8); b.cyl(c[0] + 0.25, 0.8, c[1], 0.08, 0.4, '#16a34a', false, 6); });
      b.counter(0, -b.D / 2 + 2.6, 6, 1.1, '#d6a76a', '#92400e');
      snackStation(b, -1.5, -b.D / 2 + 4.3, ['cactus', 'jerky'], 'CACTUS JUICE BAR');
      b.station(2, -b.D / 2 + 4.3, '📦', 'CARGO DESK', () => IN.startJobFrom(p, 'cargo'), '#3ff0ff');
      hatStation(b, b.W / 2 - 2.5, 2, ['cowboy', 'cap']);
      b.station(-b.W / 2 + 2.2, 4.5, '🎁', 'SOUVENIRS', () => IN.souvMenu(['sand', 'plush', 'dino']), '#ec4899');
      b.npc(0, -b.D / 2 + 1.5, 0, who('Dusty Dot', { hat: 'cowboy', shirt: '#b45309', lines: ['Cactus juice helps your tires grip on sand!', 'The cargo depot is right next door, partner.', 'Watch out for the big mesas!'] }));
      b.npc(4, 4, PI, who('Sandy', { lines: ['I found a dinosaur bone in the desert! (It was a stick.)'], path: [[4, 4.5], [-2, 4.5]] }));
    },
    icecafe(b, p) {
      b.shell({ floor: 'snowtile', wall: p.wall, ceil: '#f0f9ff' });
      b.counter(-4, -b.D / 2 + 2.2, 6, 1.0, '#f8fafc', '#0ea5e9');
      b.sign('☕ HOT COCOA $6\n🍩 DONUT $5', 'n', -5.2, 2.75, 3.2, 1.2, '#0369a1');
      snackStation(b, -4, -b.D / 2 + 3.9, ['cocoa', 'donut'], 'HOT COCOA BAR');
      // research lab corner
      b.box(6, 0, -5, 3, 0.8, 1.2, '#e5e7eb', true); b.box(5.2, 0.8, -5.3, 0.8, 0.6, 0.05, '#22d3ee', false, true); b.box(6.8, 0.8, -5.3, 0.8, 0.6, 0.05, '#a7f3d0', false, true);
      const gl = b.ball(4.6, 1.15, -5, 0.3, '#3b82f6'); b.anims.push((t) => { gl.rotation.y = t; });
      for (let i = 0; i < 3; i++) { const ice = new T.Mesh(new T.OctahedronGeometry(0.3), new T.MeshLambertMaterial({ color: '#bae6fd', transparent: true, opacity: 0.8 })); ice.position.set(b.W / 2 - 0.8, 1.2, -1 + i * 1); b.scene.add(ice); b.anims.push((t) => { ice.rotation.y = t + i; }); }
      b.box(b.W / 2 - 0.8, 0, 0, 0.8, 1.0, 3.2, '#e5e7eb', true);
      b.sign('🔬 RESEARCH OUTPOST\n❄️ -12°C OUTSIDE', 'e', 0, 2.8, 3.4, 1.2, '#0ea5e9');
      b.station(5.5, -3.2, '🔬', 'SUPPLY RUN JOB', () => IN.startJobFrom(p, 'cargo', 'j_snow'), '#3ff0ff');
      hatStation(b, -b.W / 2 + 2.6, 3.5, ['beanie']);
      [[-1, 3], [3, 4]].forEach((t) => { b.table(t[0], t[1], '#e0f2fe'); b.chair(t[0] - 0.9, t[1], '#0ea5e9'); b.chair(t[0] + 0.9, t[1], '#0ea5e9'); });
      b.npc(-1.8, -b.D / 2 + 1.3, 0, who('Barista Bree', { hat: 'beanie', lines: ['Hot cocoa = better grip on snow and ice!', 'Snowmobiles are the kings of the tundra.'] }));
      b.npc(6, -3.9, PI, who('Dr. Frost', { shirt: '#ffffff', lines: ['We study the ice! Bring supplies from the outpost.', 'Brrr! Science is cool.'] }));
      b.npc(-1.9, 3, PI / 2, who('Ivy', { mode: 'sit', y: 0.05, hat: 'beanie', lines: ['Have you raced the Ice Ring? So slippery!'] }));
    },
    lodge(b, p) {
      b.shell({ floor: 'wood', wall: '#a0673a', rug: 'carpet', rugW: 5, rugD: 4, rugZ: -2, ceil: '#7c4a22' });
      for (let i = 0; i < 6; i++) b.box(0, 0.4 + i * 1.0, -b.D / 2 + 0.2, b.W, 0.08, 0.1, '#6b3f1d');
      // fireplace
      b.box(0, 0, -b.D / 2 + 0.7, 3.4, 3.0, 1.2, '#78716c', true); b.box(0, 0, -b.D / 2 + 1.25, 1.8, 1.3, 0.1, '#1c1917');
      const fi = b.ball(0, 0.5, -b.D / 2 + 1.25, 0.45, '#f97316', true), fi2 = b.ball(0.3, 0.4, -b.D / 2 + 1.3, 0.3, '#facc15', true); b.anims.push((t) => { fi.scale.y = 1 + Math.sin(t * 11) * 0.2; fi2.scale.y = 1 + Math.cos(t * 13) * 0.25; });
      const pl = new T.PointLight(0xffa040, 0.9, 12); pl.position.set(0, 1.2, -b.D / 2 + 2.2); b.scene.add(pl); b.anims.push((t) => { pl.intensity = 0.8 + Math.sin(t * 7) * 0.15; });
      b.station(0, -b.D / 2 + 3.6, '🔥', 'WARM UP BY FIRE', () => IN.warmUp(), '#f97316');
      b.sofa(-3.5, -1.5, 3, '#7f1d1d', PI / 2); b.sofa(3.5, -1.5, 3, '#7f1d1d', -PI / 2);
      b.counter(-6.5, 4, 4, 1.1, '#d6a76a', '#6b3f1d');
      snackStation(b, -6.5, 2.2, ['cocoa', 'pancakes'], 'COCOA & PANCAKES');
      // ski rack + trail map
      for (let i = 0; i < 4; i++) b.box(b.W / 2 - 0.3, 0, -3 + i * 0.4, 0.1, 1.8, 0.1, ['#ef4444', '#3b82f6', '#facc15', '#22c55e'][i]);
      b.sign('🗺️ GROKMORE TRAILS\n⛰️ Summit · 🏂 Hill Climb', 'e', 0, 2.5, 3.6, 1.4, '#166534');
      b.station(b.W / 2 - 2.2, 3, '🗺️', 'TRAIL MAP (GPS)', () => IN.trailMap(), '#22c55e');
      b.npc(-6.5, 5.1, PI, who('Ranger Rita', { hat: 'cowboy', shirt: '#166534', lines: ['The summit view is the best in Grok Rides!', 'Use 4x4s or the snowmobile up high.', 'Cocoa keeps you cozy — and grippy on snow!'] }));
      b.npc(-3.3, -1.5, PI / 2, who('Skier Sky', { mode: 'sit', y: 0.05, hat: 'beanie', lines: ['I raced down the mountain… in a balloon!'] }));
      b.npc(3, 3, PI, who('Hiker Hal', { lines: ['My legs are SO tired. Fire is nice.'], path: [[3, 4], [-2, 4]] }));
    }
  };
  function UI() { return GR.UI; }
  IN.Builder = Builder; IN.BUILD = BUILD; IN.ROOMV = {};
  IN.kit = { who, pick, snackStation, hatStation, floorTex, signTex, spotOf, nearestSpot, SHIRTS };
  IN.cache = {}; const lru = [];
  function dispose(b) { b.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map && !Object.values(texCache).includes(m.map) && !(m.map.userData && m.map.userData.keep)) m.map.dispose(); m.dispose(); }); } }); }
  IN.get = function (p) {
    if (IN.cache[p.id]) { const i = lru.indexOf(p.id); if (i >= 0) lru.splice(i, 1); lru.push(p.id); return IN.cache[p.id]; }
    const b = new Builder(p); (p.gen ? BUILD.gen : (BUILD[p.kind] || BUILD.store))(b, p);
    if (GR.Fun && GR.Fun.decorInterior) GR.Fun.decorInterior(b, p);
    IN.cache[p.id] = b; lru.push(p.id);
    // keep memory low on phones: only the 8 most recent generated interiors stay built
    while (lru.length > 8) { const id = lru.find((k) => IN.cache[k] && IN.cache[k].p.gen && IN.cache[k] !== GR.G.inside); if (!id) break; lru.splice(lru.indexOf(id), 1); const ob = IN.cache[id]; delete IN.cache[id]; if (me && me.parent === ob.scene) ob.scene.remove(me); dispose(ob); }
    return b;
  };
  IN.update = function (b, dt, t, fx, fz) {
    b.anims.forEach((f) => f(t));
    b.stations.forEach((s, i) => { s.ring.material.opacity = 0.55 + Math.sin(t * 4 + i) * 0.3; s.sp.position.y = 2.3 + Math.sin(t * 2 + i) * 0.1; s.sp.rotation.y = t * 1.6 + i; });
    b.npcs.forEach((n) => {
      let spd = 0;
      const near = Math.hypot(fx - n.x, fz - n.z) < 2.6 || (n.path && Math.hypot(fx - n.x, fz - n.z) < 3.2);
      if (n.path && !near && n.danceT <= 0) {
        const tg = n.path[n.pi], dx = tg[0] - n.x, dz = tg[1] - n.z, d = Math.hypot(dx, dz);
        if (d < 0.2) { n.pause = (n.pause || 0) + dt; if (n.pause > 1.5) { n.pause = 0; n.pi = (n.pi + 1) % n.path.length; } }
        else { spd = 1.2; n.x += dx / d * spd * dt; n.z += dz / d * spd * dt; n.g.rotation.y += U.ang(Math.atan2(dx, dz) - n.g.rotation.y) * Math.min(1, dt * 6); }
      } else if (near && n.mode !== 'sit') n.g.rotation.y += U.ang(Math.atan2(fx - n.x, fz - n.z) - n.g.rotation.y) * Math.min(1, dt * 5);
      n.g.position.x = n.x; n.g.position.z = n.z; n.tag.position.set(n.x, n.g.userData.baseY + (n.mode === 'sit' ? 1.95 : 2.35), n.z); const cpos = GR.G.cam.position; n.tag.visible = Math.hypot(cpos.x - n.x, cpos.z - n.z) > 4.5;
      n.waveT -= dt; n.danceT -= dt;
      const mode = n.danceT > 0 && n.mode !== 'sit' ? 'dance' : n.waveT > 0 ? 'wave' : n.mode === 'sit' ? 'sit' : n.mode === 'wave' && near ? 'wave' : 'idle';
      if (mode !== 'dance') n.g.position.y = n.g.userData.baseY + (n.mode === 'sit' ? -0.38 : 0);
      GR.Person.anim(n.g, spd, t, mode);
    });
  };

  // ---------- station actions ----------
  IN.snackMenu = function (p, list, title) {
    const G = GR.G; UI().dismissable = true;
    const render = () => {
      let h = '<h2>' + esc((p ? p.icon + ' ' : '') + (title || 'Snacks')) + '</h2><p class="sub">Snacks give a small bonus for a few minutes (not in races). You have <b>' + U.fmtMoney(G.save.money) + '</b>.</p><div class="list">';
      list.forEach((k) => { const s = SNACKS[k], on = (G.buffs[s.buff] || 0) > 0; h += '<div class="row snack"><span class="ico">' + s.icon + '</span><span class="grow"><b>' + esc(s.name) + '</b><br><small>' + esc(s.desc) + ' · ' + Math.round(s.secs / 60) + ' min' + (on ? ' · <i>active</i>' : '') + '</small></span><button class="btn gold small" data-k="' + k + '" ' + (G.save.money < s.price ? 'disabled' : '') + '>' + U.fmtMoney(s.price) + '</button></div>'; });
      h += '</div><div class="btnrow"><button class="btn alt" data-a="close">DONE</button></div>';
      UI().panel(h, (root) => { root.querySelectorAll('[data-k]').forEach((e) => e.addEventListener('click', () => { IN.eat(e.dataset.k); render(); })); root.querySelector('[data-a=close]').addEventListener('click', () => UI().close()); });
    };
    render();
  };
  IN.eat = function (k) {
    const G = GR.G, s = SNACKS[k]; if (!s || G.save.money < s.price) return false;
    G.save.money -= s.price; G.buffs[s.buff] = Math.max(G.buffs[s.buff] || 0, 0) + s.secs; G.save.stats.snacks = (G.save.stats.snacks || 0) + 1;
    GR.Snd.fx('buy'); UI().toast(s.icon + ' Yum! ' + BUFFNAME[s.buff] + ' bonus for ' + Math.round(G.buffs[s.buff] / 60) + ' min'); G.persist(); return true;
  };
  IN.hatMenu = function (list) {
    const G = GR.G, s = G.save; s.hats = s.hats || {}; UI().dismissable = true;
    const render = () => {
      let h = '<h2>🧢 Hats</h2><p class="sub">Wear a hat when you walk around! Friends can see it too.</p><div class="list">';
      list.forEach((k) => { const H = GR.HATS[k], own = !!s.hats[k], on = s.hat === k; h += '<div class="row"><span class="ico">' + H.icon + '</span><span class="grow"><b>' + esc(H.name) + '</b></span>' + (own ? '<button class="btn ' + (on ? 'alt' : 'green') + ' small" data-w="' + k + '">' + (on ? 'TAKE OFF' : 'WEAR') + '</button>' : '<button class="btn gold small" data-b="' + k + '" ' + (s.money < H.price ? 'disabled' : '') + '>' + U.fmtMoney(H.price) + '</button>') + '</div>'; });
      h += '</div><div class="btnrow"><button class="btn alt" data-a="close">DONE</button></div>';
      UI().panel(h, (root) => {
        root.querySelectorAll('[data-b]').forEach((e) => e.addEventListener('click', () => { const k = e.dataset.b, H = GR.HATS[k]; if (s.money < H.price) return; s.money -= H.price; s.hats[k] = 1; s.hat = k; Foot.setHat(k); GR.Snd.fx('buy'); UI().toast(H.icon + ' You got the ' + H.name + '!'); G.persist(); render(); }));
        root.querySelectorAll('[data-w]').forEach((e) => e.addEventListener('click', () => { const k = e.dataset.w; s.hat = s.hat === k ? null : k; Foot.setHat(s.hat); G.persist(); render(); }));
        root.querySelector('[data-a=close]').addEventListener('click', () => UI().close());
      });
    };
    render();
  };
  IN.souvMenu = function (list) {
    const G = GR.G, s = G.save; s.souv = s.souv || {}; UI().dismissable = true;
    const render = () => {
      let h = '<h2>🎁 Souvenirs</h2><p class="sub">Collect them all! You have ' + Object.keys(s.souv).length + ' / ' + Object.keys(SOUV).length + '.</p><div class="list">';
      list.forEach((k) => { const S = SOUV[k], own = !!s.souv[k]; h += '<div class="row"><span class="ico">' + S.icon + '</span><span class="grow"><b>' + esc(S.name) + '</b></span>' + (own ? '<span class="tag">GOT IT ✓</span>' : '<button class="btn gold small" data-b="' + k + '" ' + (s.money < S.price ? 'disabled' : '') + '>' + U.fmtMoney(S.price) + '</button>') + '</div>'; });
      h += '</div><div class="btnrow"><button class="btn alt" data-a="close">DONE</button></div>';
      UI().panel(h, (root) => {
        root.querySelectorAll('[data-b]').forEach((e) => e.addEventListener('click', () => { const k = e.dataset.b; if (s.money < SOUV[k].price) return; s.money -= SOUV[k].price; s.souv[k] = 1; GR.Snd.fx('buy'); UI().toast(SOUV[k].icon + ' Added to your collection!'); G.persist(); render(); }));
        root.querySelector('[data-a=close]').addEventListener('click', () => UI().close());
      });
    };
    render();
  };
  IN.jobBoard = function (p) {
    const G = GR.G; UI().dismissable = true;
    let h = '<h2>📋 Job Board</h2><p class="sub">Your ride: <b>' + esc(GR.VEH[G.me.type].icon + ' ' + GR.VEH[G.me.type].name) + '</b>. Start a job, then walk out to your ride!</p><div class="list">';
    Object.keys(GR.JOBS).forEach((id) => { const J = GR.JOBS[id], ok = GR.Jobs.canDo(id, G.me); const who = GR.Jobs.whoCan(id).slice(0, 3).map((k) => GR.VEH[k].icon).join(' ');
      h += '<div class="row"><span class="ico">' + J.icon + '</span><span class="grow"><b>' + esc(J.name) + '</b><br><small>' + esc(J.desc) + (ok ? '' : ' · needs ' + who) + '</small></span><button class="btn ' + (ok ? 'green' : 'alt') + ' small" data-j="' + id + '" ' + (ok && !GR.Jobs.cur ? '' : 'disabled') + '>' + (ok ? 'START' : 'NEED RIDE') + '</button></div>'; });
    h += '</div>' + (GR.Jobs.cur ? '<p class="msg">You already have a job going!</p>' : '') + '<div class="btnrow"><button class="btn alt" data-a="close">DONE</button></div>';
    UI().panel(h, (root) => {
      root.querySelectorAll('[data-j]').forEach((e) => e.addEventListener('click', () => IN.startJobFrom(p, e.dataset.j)));
      root.querySelector('[data-a=close]').addEventListener('click', () => UI().close());
    });
  };
  IN.startJobFrom = function (p, jid, spotId) {
    const G = GR.G;
    if (GR.Jobs.cur) { UI().toast('You already have a job! Finish it first.', true); return false; }
    if (!GR.Jobs.canDo(jid, G.me)) { const who = GR.Jobs.whoCan(jid).slice(0, 3).map((k) => GR.VEH[k].name).join(', '); UI().toast(GR.JOBS[jid].icon + ' This job needs: ' + who + '. Switch rides at a garage!', true); return false; }
    const sp = spotId ? spotOf(spotId) : nearestSpot((s) => s.type === 'job' && s.job === jid, p.x, p.z);
    UI().close(); GR.Jobs.start(jid, sp); UI().toast(GR.JOBS[jid].icon + ' Job started! Walk back to your ride and follow the GPS.'); return true;
  };
  IN.raceBoard = function () {
    const G = GR.G, s = G.save; UI().dismissable = true;
    let h = '<h2>🏁 Race Board</h2><p class="sub">Pick a race — we\u2019ll take you and your ride to the start line.</p><div class="list">';
    GR.RACES.forEach((rc) => { const won = s.won[rc.id], med = s.medals[rc.id]; h += '<div class="row"><span class="ico">' + rc.icon + '</span><span class="grow"><b>' + esc(rc.name) + '</b><br><small>' + esc(rc.desc) + (won ? ' · 🏆 won' : '') + (med ? ' · ' + { gold: '🥇', silver: '🥈', bronze: '🥉' }[med] : '') + '</small></span><button class="btn primary small" data-r="' + rc.id + '">GO</button></div>'; });
    h += '</div><div class="btnrow"><button class="btn alt" data-a="close">DONE</button></div>';
    UI().panel(h, (root) => {
      root.querySelectorAll('[data-r]').forEach((e) => e.addEventListener('click', () => IN.goRace(e.dataset.r)));
      root.querySelector('[data-a=close]').addEventListener('click', () => UI().close());
    });
  };
  IN.goRace = function (id) {
    const G = GR.G, rc = GR.RACES.find((q) => q.id === id), sp = GR.raceStart(rc); UI().close();
    if (GR.Jobs.cur) GR.Jobs.cancel('Job cancelled for the race.');
    Foot.forceBack(); $('fade').classList.add('on');
    setTimeout(() => { if (sp && G.me.kind !== 'boat' && W.waterDepth(sp.x, sp.z) < 0.3) { const r = W.nearestRoad(sp.x, sp.z, true); G.me.place(sp.x, sp.z, r ? r.yaw : 0); } G.camSnap = true; $('fade').classList.remove('on'); UI().raceMenu(rc); }, 300);
  };
  IN.trophies = function () {
    const s = GR.G.save, st = s.stats || {}; UI().dismissable = true;
    const won = Object.keys(s.won || {}).length, med = Object.values(s.medals || {}), souv = Object.keys(s.souv || {}).length;
    let h = '<h2>🏆 Trophy Case</h2><div class="list">';
    [['🏁', 'Races won', won + ' / ' + GR.RACES.filter((r) => r.type !== 'air').length], ['🥇', 'Gold medals', med.filter((m) => m === 'gold').length], ['💼', 'Jobs done', Object.values(s.jobsDone || {}).reduce((a, b) => a + b, 0)], ['🚗', 'Rides owned', Object.keys(s.owned).length + ' / ' + GR.VEH_ORDER.length], ['🎁', 'Souvenirs', souv], ['🍔', 'Snacks eaten', st.snacks || 0], ['💥', 'Cartoon crashes', st.crashes || 0], ['💰', 'Money earned', U.fmtMoney(st.earned || 0)]].forEach((r) => { h += '<div class="row"><span class="ico">' + r[0] + '</span><span class="grow">' + r[1] + '</span><b>' + r[2] + '</b></div>'; });
    h += '</div><div class="btnrow"><button class="btn alt" data-a="close">DONE</button></div>';
    UI().panel(h, (root) => root.querySelector('[data-a=close]').addEventListener('click', () => UI().close()));
  };
  IN.carWash = function () {
    const G = GR.G; if (G.save.money < 20) { UI().toast('The car wash costs $20.', true); return; }
    G.save.money -= 20; G.me.dmg = Math.max(0, G.me.dmg - 15); G.save.owned[G.me.type] && (G.save.owned[G.me.type].dmg = G.me.dmg); GR.Snd.fx('splash'); UI().toast('🧽 Your ride is sparkly clean! (a little damage buffed out too)'); G.persist();
  };
  IN.warmUp = function () { const G = GR.G; if ((G.buffs.snow || 0) > 30) { UI().toast('🔥 You\u2019re already toasty!'); return; } G.buffs.snow = 90; GR.Snd.fx('ui'); UI().toast('🔥 Toasty! Free ❄️ snow grip for 1.5 min.'); };
  IN.trailMap = function () { const G = GR.G, m = GR.SC.markers.find((q) => q.s.race === 'hill'), sp = m && m.s; if (sp) { G.setGps(sp); UI().toast('🗺️ GPS set to the Grokmore Hill Climb!'); } };
  IN.party = function (b, msg) { GR.Snd.fx('jingle'); UI().toast(msg); b.npcs.forEach((n) => { n.danceT = 7; }); Foot.dance = 7; };
  IN.cheer = function (b) { b.npcs.forEach((n) => { n.waveT = 2; }); };

  // ================= ON FOOT =================
  const Foot = GR.Foot = { active: false, inside: null, x: 0, y: 0, z: 0, yaw: 0, spd: 0, dance: 0, camYaw: 0 };
  let me = null; // Person model
  const G_ = () => GR.G;
  function body() { if (!me) { const G = G_(); me = GR.Person({ shirt: G.myColor(), hat: G.save.hat || null }); me.traverse((o) => { if (o.isMesh) o.castShadow = true; }); } return me; }
  Foot.model = () => me;
  Foot.setHat = (h) => { if (me) GR.Person.setHat(me, h); GR.Net && GR.Net.sendNow && GR.Net.sendNow(); };
  Foot.canGetOut = function () {
    const G = G_(), v = G.me; if (Foot.active || G.passenger || GR.Race.cur || !G.playing) return null;
    if (v.dmg >= 100) return null;
    if (v.speed() > 2.5) return null; if (GR.isAir(v.type) && v.y - v.groundH(v.x, v.z) > 1.5) return null;
    return Foot.exitSpot(v);
  };
  Foot.exitSpot = function (v) {
    const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw), off = (v.Wd || 2) / 2 + 1.0;
    for (const o2 of [off, off + 1.5]) for (const side of [1, -1]) for (const f of [0, -0.4, 0.4, -0.8, 0.8]) { const x = v.x - fz * o2 * side + fx * f * v.L, z = v.z + fx * o2 * side + fz * f * v.L; if (!W.blocked(x, z, 0.35) && W.waterDepth(x, z) < 0.4) return { x, z }; }
    if (v.kind !== 'boat' && W.waterDepth(v.x, v.z) < 0.4) return { x: v.x - fx * (v.L / 2 + 1), z: v.z - fz * (v.L / 2 + 1) };
    return null;
  };
  Foot.getOut = function () {
    const G = G_(), v = G.me, s = Foot.canGetOut(); if (!s) { UI().toast(v.kind === 'boat' ? '🚤 Park next to the shore to get out.' : GR.isAir(v.type) ? 'Land first, then you can get out!' : 'Stop first, then you can get out!', true); return false; }
    v.vx = v.vz = v.vy = v.vF = 0; Foot.active = true; G.foot = true; Foot.inside = null; Foot.x = s.x; Foot.z = s.z; Foot.y = W.gy(s.x, s.z); Foot.yaw = Math.atan2(s.x - v.x, s.z - v.z); Foot.camYaw = v.yaw; Foot.spd = 0;
    const m = body(); GR.Person.setHat(m, G.save.hat || null); G.scene.add(m); place(); document.body.classList.add('onfoot'); UI().setControlMode('foot'); G.camSnap = true; GR.Snd.fx('ui'); GR.Net.sendNow && GR.Net.sendNow();
    if (!G.save.footTut) { G.save.footTut = 1; UI().toast('🚶 Walk with the joystick. Glowing green doors = places you can go inside!'); }
    return true;
  };
  Foot.getIn = function (force) {
    const G = G_(), v = G.me; if (!Foot.active) return false;
    if (Foot.inside) Foot.leave(true);
    if (!force && Math.hypot(v.x - Foot.x, v.z - Foot.z) > (v.L || 4) / 2 + 4) return false;
    if (me && me.parent) me.parent.remove(me); Foot.active = false; G.foot = false; document.body.classList.remove('onfoot', 'inside'); UI().setControlMode(v.kind); G.camSnap = true; GR.Snd.fx('ui'); GR.Net.sendNow && GR.Net.sendNow(); return true;
  };
  Foot.forceBack = function () { if (Foot.active) Foot.getIn(true); };
  Foot.callRide = function () {
    const G = G_(), v = G.me; if (Foot.inside || v.kind !== 'ground') return;
    const r = W.nearestRoad(Foot.x, Foot.z, true); if (!r || Math.hypot(r.x - Foot.x, r.z - Foot.z) > 60) { UI().toast('Walk closer to a road so your ride can find you.', true); return; }
    $('fade').classList.add('on'); setTimeout(() => { v.place(r.x, r.z, r.yaw); $('fade').classList.remove('on'); UI().toast('📲 Your ' + GR.VEH[v.type].name + ' is here!'); }, 300);
  };
  Foot.enter = function (p, quiet) {
    const G = G_(); if (!Foot.active && !Foot.getOut()) return false;
    const b = IN.get(p); $('fade').classList.add('on');
    Foot.inside = p; G.inside = b; b.scene.add(body()); Foot.x = 0; Foot.z = b.D / 2 - 3.2; Foot.y = 0; Foot.yaw = PI; Foot.camYaw = PI; Foot.spd = 0; place();
    document.body.classList.add('inside'); $('regionN').textContent = p.short; G.camSnap = true; GR.Snd.fx('ui'); setTimeout(() => $('fade').classList.remove('on'), 250);
    G.save.visited = G.save.visited || {}; if (!G.save.visited[p.id]) { G.save.visited[p.id] = 1; G.persist(); }
    if (!quiet) UI().toast(p.icon + ' Welcome to ' + p.name + '!'); GR.Net.sendNow && GR.Net.sendNow(); return true;
  };
  Foot.leave = function (quiet) {
    const G = G_(), p = Foot.inside; if (!p) return; Foot.inside = null; G.inside = null; G.scene.add(body());
    Foot.x = p.door.x + p.dx * 0.8; Foot.z = p.door.z + p.dz * 0.8; Foot.y = W.gy(Foot.x, Foot.z); Foot.yaw = p.yaw; Foot.camYaw = p.yaw; place();
    document.body.classList.remove('inside'); $('regionN').textContent = W.REGION_NAMES[W.region(Foot.x, Foot.z)]; G.camSnap = true; if (!quiet) GR.Snd.fx('ui'); GR.Net.sendNow && GR.Net.sendNow();
  };
  function place() { const m = body(); m.position.set(Foot.x, Foot.y, Foot.z); m.rotation.y = Foot.yaw; }
  Foot.body = body; IN.dispose = dispose;
  Foot.nearDoor = (x, z, r) => GR.PL.nearDoor(x, z, r);
  Foot.nearStation = function () { const b = G_().inside; if (!b) return null; let best = null, bd = 1.3; b.stations.forEach((s) => { const d = Math.hypot(s.x - Foot.x, s.z - Foot.z); if (d < bd) { bd = d; best = s; } }); return best; };
  Foot.nearNpc = function () { const b = G_().inside; if (!b) return null; let best = null, bd = 2.0; b.npcs.forEach((n) => { const d = Math.hypot(n.x - Foot.x, n.z - Foot.z); if (d < bd) { bd = d; best = n; } }); return best; };
  Foot.talk = function (n) { const l = n.lines[n.li % n.lines.length]; n.li++; n.waveT = 1.6; UI().toast('💬 ' + n.name + ': ' + l); GR.Snd.fx('ui'); };
  Foot.actOption = function () {
    const G = G_(), v = G.me;
    if (Foot.inside) {
      const b = G.inside;
      if (Math.abs(Foot.x - b.exit.x) < 1.6 && Foot.z > b.D / 2 - 1.8) return { label: '🚪 EXIT', fn: () => Foot.leave() };
      const s = Foot.nearStation(); if (s) return { label: s.icon + ' ' + (s.label.length > 20 ? s.label.slice(0, 19).trim() + '…' : s.label), fn: s.fn };
      const n = Foot.nearNpc(); if (n) return { label: '💬 TALK: ' + n.name.split(' ').pop(), fn: () => Foot.talk(n) };
      return null;
    }
    const ho = GR.Home && GR.Home.footOption(); if (ho) return ho;
    const p = Foot.nearDoor(Foot.x, Foot.z, 3.2); if (p && p.kind === 'myhome') return GR.Home.doorOption(p, false); if (p) return { label: '🚪 ENTER ' + p.short, fn: () => Foot.enter(p) };
    const fo = GR.Fun && GR.Fun.footOption && GR.Fun.footOption(); if (fo) return fo;
    const dv = Math.hypot(v.x - Foot.x, v.z - Foot.z);
    if (dv < (v.L || 4) / 2 + 4) return { label: '🚗 GET IN', fn: () => Foot.getIn() };
    if (G.room) for (const k in G.remotes) { const r = G.remotes[k]; if (r.veh && !r.ride && !r.foot && r.veh.model.visible && Math.hypot(r.veh.x - Foot.x, r.veh.z - Foot.z) < (r.veh.L || 4) / 2 + 3) return { label: '🚗 HOP IN WITH ' + r.name.toUpperCase(), fn: () => { Foot.getIn(true); G.hopIn(k); } }; }
    if (dv > 45 && v.kind === 'ground') return { label: '📲 CALL MY RIDE', fn: Foot.callRide };
    return null;
  };
  const tmpIn = { mx: 0, my: 0, run: 0 };
  Foot.update = function (dt, inp, t) {
    const G = G_(); inp = inp || tmpIn;
    const mx = inp.mx || 0, my = inp.my || 0, mag = Math.min(1, Math.hypot(mx, my));
    const cy = Foot.camYaw, fx = Math.sin(cy), fz = Math.cos(cy), rx = -fz, rz = fx;
    let dx = fx * my + rx * mx, dz = fz * my + rz * mx; const dl = Math.hypot(dx, dz);
    const run = inp.run || mag > 0.92, target = mag < 0.08 ? 0 : (run ? (G.save.sneakers ? 8.4 : 6.2) : 3.0) * Math.max(0.4, mag);
    Foot.spd += (target - Foot.spd) * Math.min(1, dt * 8);
    if (dl > 0.05) { dx /= dl; dz /= dl; Foot.yaw += U.ang(Math.atan2(dx, dz) - Foot.yaw) * Math.min(1, dt * 10); Foot.dance = 0; }
    const sx = Math.sin(Foot.yaw) * Foot.spd * dt, sz = Math.cos(Foot.yaw) * Foot.spd * dt;
    if (Foot.inside) {
      // NPCs are solid now (you bump into them instead of walking through)
      const b = G.inside, hw = b.W / 2 - 0.35, hd = b.D / 2 - 0.35, hit = (x, z) => Math.abs(x) > hw || Math.abs(z) > hd || b.solids.some((s) => x > s.x0 - 0.3 && x < s.x1 + 0.3 && z > s.z0 - 0.3 && z < s.z1 + 0.3) || b.npcs.some((n) => { const d0 = Math.hypot(n.x - Foot.x, n.z - Foot.z), d1 = Math.hypot(n.x - x, n.z - z); return d1 < 0.7 && d1 < d0; });
      if (!hit(Foot.x + sx, Foot.z)) Foot.x += sx; if (!hit(Foot.x, Foot.z + sz)) Foot.z += sz; Foot.y = 0;
      IN.update(b, dt, t, Foot.x, Foot.z);
      // walking out through the door = exit
      if (Foot.z > b.D / 2 - 0.45 && Math.abs(Foot.x) < 1.1 && Foot.spd > 0.5 && Math.cos(Foot.yaw) > 0.5) Foot.leave();
    } else {
      const ok = (x, z) => !W.blocked(x, z, 0.3) && W.waterDepth(x, z) < 0.7 && Math.abs(x) < 1480 && Math.abs(z) < 1480 && W.gy(x, z) - Foot.y < 1.2;
      if (ok(Foot.x + sx, Foot.z)) Foot.x += sx; if (ok(Foot.x, Foot.z + sz)) Foot.z += sz;
      Foot.y += (W.gy(Foot.x, Foot.z) - Foot.y) * Math.min(1, dt * 12);
    }
    // camera yaw slowly swings behind when walking forward-ish
    if (Foot.spd > 0.5 && my > -0.3) Foot.camYaw += U.ang(Foot.yaw - Foot.camYaw) * Math.min(1, dt * (Foot.inside ? 1.6 : 1.2) * Math.min(1, Math.abs(my) + 0.3));
    Foot.dance = Math.max(0, Foot.dance - dt);
    const m = body(); m.userData.baseY = Foot.y; place(); GR.Person.anim(m, Foot.spd, t, Foot.dance > 0 ? 'dance' : 'idle');
  };
  const cp = new T.Vector3(), la = new T.Vector3();
  Foot.cam = function (dt, cam, look) {
    const G = G_(), yaw = Foot.camYaw + look.off, ins = Foot.inside, dist = ins ? 6.6 : 5.6, h = (ins ? Math.min(3.4, G.inside.H - 1.0) : 2.8) + look.pitch * dist;
    cp.set(Foot.x - Math.sin(yaw) * dist, Foot.y + h, Foot.z - Math.cos(yaw) * dist); la.set(Foot.x + Math.sin(yaw) * (ins ? 4 : 1.5), Foot.y + (ins ? 0.55 : 1.4), Foot.z + Math.cos(yaw) * (ins ? 4 : 1.5));
    if (ins) { const b = G.inside; cp.x = U.clamp(cp.x, -b.W / 2 + 0.4, b.W / 2 - 0.4); cp.z = U.clamp(cp.z, -b.D / 2 + 0.4, b.D / 2 - 0.4); const lost = dist - Math.hypot(cp.x - Foot.x, cp.z - Foot.z); if (lost > 0) cp.y += lost * 0.4; cp.y = U.clamp(cp.y, 0.8, b.H - 0.35); }
    else { let g = W.height(cp.x, cp.z) + 0.9; for (let k = 1; k <= 3; k++) { const f = k / 4, gx = U.lerp(cp.x, Foot.x, f), gz = U.lerp(cp.z, Foot.z, f), need = W.height(gx, gz) + 0.8, lineY = U.lerp(cp.y, Foot.y + 1.2, f); if (need > lineY) g = Math.max(g, cp.y + (need - lineY) / (1 - f)); } if (cp.y < g) cp.y = Math.min(g, Foot.y + 14); }
    if (G.camSnap) { cam.position.copy(cp); G.camSnap = false; } else cam.position.lerp(cp, Math.min(1, dt * 8));
    cam.lookAt(la); if (Math.abs(cam.fov - G.baseFov) > 0.2) { cam.fov = G.baseFov; cam.updateProjectionMatrix(); }
  };
  // remote friends on foot
  Foot.remote = function (r, d) {
    const G = G_();
    r.foot = d.ft ? { x: d.ft[0], y: d.ft[1], z: d.ft[2], yaw: d.ft[3], inside: d.ft[4] || null, hat: d.ft[5] || null } : null;
    if (!r.foot) { if (r.person && r.person.parent) r.person.parent.remove(r.person); return; }
    if (!r.person) { r.person = GR.Person({ shirt: r.color }); r.ptag = M.sprite(r.name, { color: '#fff', bg: r.color, wide: 3, scale: 0.8, fs: 0.5, bold: true }); r.ptag.position.y = 2.55; r.person.add(r.ptag); r.pT = { x: r.foot.x, z: r.foot.z }; }
    if (r.person.userData.hat !== r.foot.hat) GR.Person.setHat(r.person, r.foot.hat);
  };
  Foot.remoteTick = function (dt, t) {
    const G = G_(); const myIn = Foot.inside ? Foot.inside.id : null;
    for (const k in G.remotes) {
      const r = G.remotes[k]; if (!r.person) continue;
      if (!r.foot) { if (r.person.parent) r.person.parent.remove(r.person); continue; }
      const same = (r.foot.inside || null) === myIn; const sc = r.foot.inside ? (same ? G.inside && G.inside.scene : null) : (myIn ? null : G.scene);
      if (!same || !sc) { if (r.person.parent) r.person.parent.remove(r.person); continue; }
      if (r.person.parent !== sc) { sc.add(r.person); r.person.position.set(r.foot.x, r.foot.y, r.foot.z); }
      const p = r.person.position, ox = p.x, oz = p.z; p.x += (r.foot.x - p.x) * Math.min(1, dt * 10); p.z += (r.foot.z - p.z) * Math.min(1, dt * 10); p.y = r.foot.y;
      r.person.rotation.y += U.ang(r.foot.yaw - r.person.rotation.y) * Math.min(1, dt * 10);
      GR.Person.anim(r.person, Math.hypot(p.x - ox, p.z - oz) / Math.max(dt, 1e-3), t, 'idle');
    }
  };
  Foot.snap = function () { if (!Foot.active) return null; const r2 = (n) => Math.round(n * 100) / 100; return [r2(Foot.x), r2(Foot.y), r2(Foot.z), r2(Foot.yaw), Foot.inside ? Foot.inside.id : 0, GR.G.save.hat || 0]; };
})();
