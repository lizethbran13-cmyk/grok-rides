/* Grok Rides - your own home: 3 houses for sale (real 3D exteriors + For Sale signs), Grok Realty office, a furnished 3D
   interior (living room, kitchen, bedroom, garage with your parked rides), decorate mode, sleep, mailbox, spawn-at-home,
   fast travel, minimap icon and co-op visits. Saved in localStorage (G.save.homes / G.save.mainHome). */
(function () {
  'use strict';
  const GR = window.GR, U = GR.U, M = GR.M, W = GR.W, T = THREE, PI = Math.PI;
  const $ = (id) => document.getElementById(id);
  const G = () => GR.G, UI = () => GR.UI, IN = () => GR.IN;
  const H = GR.Home = {};
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US');
  // ---------- the houses for sale ----------
  H.LIST = [
    { id: 'h_starter', name: 'Pine Hollow Starter House', short: 'STARTER HOUSE', icon: '🏡', price: 6000, at: [-470, 430], region: 'town', style: 'cottage', wall: '#fde7c4', acc: '#b45309', blurb: 'Cozy little house in the small town. Porch, garden and a garage for 2 rides.' },
    { id: 'h_villa', name: 'Sizzle Desert Villa', short: 'DESERT VILLA', icon: '🌵', price: 14000, at: [-170, 1000], region: 'desert', style: 'villa', wall: '#fbf3e6', acc: '#c2410c', blurb: 'Sunny white villa with arched windows and a terracotta roof.' },
    { id: 'h_loft', name: 'Grok City Sky Loft', short: 'CITY LOFT', icon: '🏙️', price: 22000, at: [820, -150], region: 'city', style: 'loft', wall: '#e2e8f0', acc: '#334155', blurb: 'Two-storey modern loft downtown with huge windows and a roof terrace.' }
  ];
  H.LIST.forEach((d) => GR.PLACES_IN.push({ id: d.id, name: d.name, short: d.short, icon: '🏷️', kind: 'myhome', at: d.at, wall: d.wall, acc: d.acc, w: 16, d: 12, h: d.style === 'loft' ? 8 : 6, minRd: 9, region: d.region, home: d, room: [22, 16, 4.2] }));
  GR.PLACES_IN.push({ id: 'realty', name: 'Grok Realty (Homes for Sale)', short: 'GROK REALTY', icon: '🏠', kind: 'realty', at: [560, -330], wall: '#ecfdf5', acc: '#16a34a', w: 20, d: 15, h: 8, region: 'city', room: [18, 14, 4.6] });
  // ---------- furniture & colours you can buy in decorate mode ----------
  H.FURN = {
    plant: { name: 'Leafy Plant', icon: '🪴', price: 60 }, lamp: { name: 'Floor Lamp', icon: '💡', price: 80 }, rug: { name: 'Round Rug', icon: '🟣', price: 70 },
    armchair: { name: 'Comfy Armchair', icon: '🛋️', price: 150 }, beanbag: { name: 'Bean Bag', icon: '🫘', price: 90 }, bookshelf: { name: 'Bookshelf', icon: '📚', price: 180 },
    teddy: { name: 'Giant Teddy', icon: '🧸', price: 120 }, aquarium: { name: 'Fish Tank', icon: '🐠', price: 300 }, trophy: { name: 'Trophy Stand', icon: '🏆', price: 200 },
    arcade: { name: 'Arcade Machine', icon: '🕹️', price: 400 }, piano: { name: 'Piano', icon: '🎹', price: 450 }, tree: { name: 'Party Tree', icon: '🎄', price: 160 }
  };
  H.WALLS = ['#f5e6d3', '#fde2e4', '#dbeafe', '#dcfce7', '#fef9c3', '#ede9fe', '#e5e7eb', '#fed7aa'];
  H.FLOORS = { wood: 'Wood planks', tile: 'White tiles', carpet: 'Comfy carpet', check: 'Checkerboard', shiny: 'Shiny marble' };
  const MAXITEMS = 24;
  // ---------- save helpers ----------
  function S() { const s = G().save; s.homes = s.homes || {}; return s; }
  H.owns = (id) => !!S().homes[id];
  H.main = () => { const s = S(); return s.mainHome && s.homes[s.mainHome] ? s.mainHome : null; };
  H.places = () => H.LIST.map((d) => GR.PL.byId[d.id]).filter(Boolean);
  H.decor = (id) => { const h = S().homes[id]; if (!h) return null; h.wall = h.wall || H.WALLS[0]; h.floor = h.floor || 'wood'; h.items = h.items || []; return h; };
  // ---------- 3D exterior ----------
  const parts = [], glassParts = [];
  const P = (g, c, x, y, z, rx, ry, rz) => { U.xf(g, x, y, z, rx, ry, rz); parts.push(U.paint(g, c)); return g; };
  const Gl = (g, x, y, z) => { U.xf(g, x, y, z); glassParts.push(U.paint(g, '#5b8fd1')); };
  const box = (w, h, d) => new T.BoxGeometry(w, h, d);
  // framed window with sill + recessed glass + muntins (front face at z)
  function win(x, y, z, w, h, frame, arch) {
    Gl(box(w, h, 0.06), x, y, z + 0.04);
    P(box(w + 0.3, 0.14, 0.22), frame, x, y + h / 2 + 0.07, z + 0.1); P(box(0.14, h, 0.22), frame, x - w / 2 - 0.07, y, z + 0.1); P(box(0.14, h, 0.22), frame, x + w / 2 + 0.07, y, z + 0.1);
    P(box(w + 0.5, 0.12, 0.38), frame, x, y - h / 2 - 0.06, z + 0.18); P(box(0.06, h, 0.06), frame, x, y, z + 0.09); P(box(w, 0.06, 0.06), frame, x, y, z + 0.09);
    if (arch) { Gl(new T.CylinderGeometry(w / 2, w / 2, 0.06, 18, 1, false, -PI / 2, PI).rotateX(PI / 2).rotateZ(0), x, y + h / 2, z + 0.04); P(new T.TorusGeometry(w / 2 + 0.07, 0.08, 6, 18, PI), frame, x, y + h / 2, z + 0.1); }
  }
  function flowerBox(x, y, z, w) { P(M.rbox(w, 0.26, 0.32, 0.05), '#8a5a2b', x, y, z + 0.2); for (let i = 0; i < Math.round(w / 0.22); i++) P(new T.IcosahedronGeometry(0.11, 0), ['#ef4444', '#facc15', '#ec4899', '#f97316', '#a855f7'][i % 5], x - w / 2 + 0.12 + i * 0.22, y + 0.2, z + 0.2); }
  function garageDoor(x, z, w, h, col) { for (let i = 0; i < 6; i++) P(M.rbox(w, h / 6 - 0.04, 0.12, 0.03), col, x, h / 12 + i * h / 6, z + 0.04); P(box(w + 0.4, 0.2, 0.3), '#ffffff', x, h + 0.1, z + 0.1); P(box(0.2, h, 0.3), '#ffffff', x - w / 2 - 0.1, h / 2, z + 0.1); P(box(0.2, h, 0.3), '#ffffff', x + w / 2 + 0.1, h / 2, z + 0.1); }
  function frontDoor(x, z, col) { P(box(1.5, 2.5, 0.16), col, x, 1.25, z + 0.04); for (let i = 0; i < 2; i++) P(M.rbox(1.1, 0.9, 0.06, 0.04), col, x, 0.7 + i * 1.15, z + 0.14); P(new T.SphereGeometry(0.07, 10, 8), '#facc15', x + 0.55, 1.2, z + 0.16); P(box(1.9, 0.2, 0.34), '#ffffff', x, 2.6, z + 0.05); P(box(0.2, 2.6, 0.34), '#ffffff', x - 0.85, 1.3, z + 0.05); P(box(0.2, 2.6, 0.34), '#ffffff', x + 0.85, 1.3, z + 0.05); P(M.rbox(2.4, 0.3, 1.4, 0.05), '#cbd5e1', x, 0.15, z + 0.8); P(new T.SphereGeometry(0.14, 12, 10), '#fff7d6', x + 1.2, 2.3, z + 0.22); }
  function textTex(lines, bg, fg) { const c = document.createElement('canvas'); c.width = 512; c.height = 320; const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, 512, 320); x.strokeStyle = '#ffffff'; x.lineWidth = 14; x.strokeRect(10, 10, 492, 300); x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; lines.forEach((l, i) => { x.font = 'bold ' + (i ? 54 : 74) + 'px "Trebuchet MS", "Apple Color Emoji", sans-serif'; x.fillText(l, 256, 90 + i * 100); }); const t = new T.CanvasTexture(c); t.anisotropy = 8; return t; }
  H.exterior = function (scene, p) {
    const d = p.home, g = new T.Group(); g.position.set(p.x, p.floor, p.z); g.rotation.y = p.yaw; parts.length = 0; glassParts.length = 0;
    const w = p.w, dd = p.d, z1 = dd / 2, wall = d.wall, trim = '#ffffff', sink = p.sink || 0;
    P(box(w + 0.4, 0.5 + sink, dd + 0.4), '#9ca3af', 0, 0.25 - sink / 2 - 0.25, 0); // foundation
    if (d.style === 'cottage') {
      P(box(w, 3.6, dd), wall, 0, 1.8, 0);
      const rf = M.ext([['m', -dd / 2 - 0.7, 0], ['l', dd / 2 + 0.7, 0], ['l', 0, 3.2]], w + 1.0, 0.14, 2); rf.translate(0, 3.6, 0); parts.push(U.paint(rf, '#b45309'));
      P(box(w - 0.4, 0.1, 0.4), '#7c2d12', 0, 3.62, z1 + 0.5); P(box(1.0, 2.6, 1.0), '#9a3412', -w / 4, 5.4, -1.2); P(box(1.2, 0.2, 1.2), '#7c2d12', -w / 4, 6.7, -1.2);
      frontDoor(0, z1, '#2563eb'); win(-5.0, 1.9, z1, 1.6, 1.3, trim); flowerBox(-5.0, 1.0, z1, 1.8); garageDoor(4.4, z1, 4.6, 2.7, '#f8fafc');
      P(box(2.8, 0.18, 1.6), '#b45309', 0, 3.0, z1 + 0.8, -0.18); [-1.2, 1.2].forEach((x) => P(new T.CylinderGeometry(0.08, 0.08, 2.9, 10), trim, x, 1.45, z1 + 1.45));
      for (let x = -w / 2; x <= -2.5; x += 0.5) P(M.rbox(0.12, 0.9, 0.06, 0.03), '#ffffff', x, 0.45, z1 + 6.2); P(box(w / 2 - 2.5, 0.08, 0.06), '#ffffff', -w / 4 - 1.25, 0.75, z1 + 6.2);
    } else if (d.style === 'villa') {
      P(box(w, 4.0, dd), wall, 0, 2.0, 0); P(box(w + 0.3, 0.3, dd + 0.3), '#fde68a', 0, 4.1, 0);
      const roof = new T.ConeGeometry(Math.hypot(w, dd) / 2 + 0.4, 2.0, 4, 1); roof.rotateY(PI / 4); roof.scale(w / Math.hypot(w, dd) * 1.414, 1, dd / Math.hypot(w, dd) * 1.414); P(roof, '#c2410c', 0, 5.25, 0);
      frontDoor(0, z1, '#92400e'); win(-5.0, 2.0, z1, 1.3, 1.6, '#fde68a', true); garageDoor(4.4, z1, 4.6, 2.8, '#d6a76c');
      P(box(0.5, 3.4, 0.5), wall, -1.8, 1.7, z1 + 1.8); P(box(0.5, 3.4, 0.5), wall, 1.8, 1.7, z1 + 1.8); P(box(4.2, 0.4, 2.2), '#c2410c', 0, 3.6, z1 + 1.0); // porch with columns
      [[-6.8, z1 + 2.2], [-3.6, z1 + 2.6]].forEach((q) => { P(new T.CylinderGeometry(0.35, 0.28, 0.55, 14), '#c2410c', q[0], 0.28, q[1]); P(new T.CylinderGeometry(0.16, 0.18, 1.1, 10), '#3fa34d', q[0], 1.1, q[1]); P(new T.SphereGeometry(0.16, 10, 8), '#3fa34d', q[0], 1.65, q[1]); });
    } else {
      P(box(w, 8, dd), wall, 0, 4, 0); P(box(w + 0.4, 0.5, dd + 0.4), '#334155', 0, 8.25, 0);
      [[-5.2, 5.6], [-1.6, 5.6], [2.0, 5.6], [5.6, 5.6], [-5.2, 1.7]].forEach((q) => { Gl(box(3.0, 2.6, 0.08), q[0], q[1], z1 + 0.04); P(box(3.2, 0.14, 0.3), '#1f2937', q[0], q[1] + 1.37, z1 + 0.05); P(box(3.2, 0.14, 0.3), '#1f2937', q[0], q[1] - 1.37, z1 + 0.05); P(box(0.12, 2.6, 0.3), '#1f2937', q[0] - 1.55, q[1], z1 + 0.05); P(box(0.12, 2.6, 0.3), '#1f2937', q[0] + 1.55, q[1], z1 + 0.05); });
      P(box(w - 1, 0.25, 1.6), '#94a3b8', 0, 4.0, z1 + 0.8); for (let x = -w / 2 + 0.8; x <= w / 2 - 0.8; x += 1.5) P(new T.CylinderGeometry(0.04, 0.04, 1.0, 6), '#e5e7eb', x, 4.6, z1 + 1.55); P(box(w - 1, 0.08, 0.08), '#e5e7eb', 0, 5.1, z1 + 1.55);
      frontDoor(0, z1, '#111827'); garageDoor(4.4, z1, 4.6, 2.8, '#475569');
      [[-5, -3], [0, -3], [5, -3]].forEach((q) => { P(M.rbox(1.6, 0.6, 0.8, 0.1), '#78716c', q[0], 8.8, q[1]); P(new T.IcosahedronGeometry(0.55, 1), '#22c55e', q[0], 9.4, q[1]); });
    }
    // driveway + path + mailbox + sign
    P(box(5.4, 0.08, 7.0), '#cbd5e1', 4.4, 0.04, z1 + 3.5); P(box(1.4, 0.06, 6.0), '#e2e8f0', 0, 0.03, z1 + 3.4);
    const mb = [-3.0, z1 + 6.0]; P(new T.CylinderGeometry(0.07, 0.07, 1.1, 8), '#78350f', mb[0], 0.55, mb[1]); P(M.rbox(0.36, 0.38, 0.62, 0.15), d.acc, mb[0], 1.25, mb[1]); P(box(0.04, 0.32, 0.1), '#ef4444', mb[0] + 0.2, 1.42, mb[1] - 0.12);
    P(new T.CylinderGeometry(0.08, 0.08, 2.2, 8), '#f8fafc', -6.2, 1.1, z1 + 4.6); P(box(1.5, 0.08, 0.08), '#f8fafc', -5.6, 2.1, z1 + 4.6);
    const body = new T.Mesh(U.merge(parts), M.matMatte); body.castShadow = true; body.receiveShadow = true; g.add(body);
    if (glassParts.length) g.add(new T.Mesh(U.merge(glassParts), M.matGlass));
    // the swinging sign (3D board + printed face on both sides): FOR SALE <price>, or your name plate once it's yours
    const board = new T.Group(); board.position.set(-5.3, 1.55, z1 + 4.6); g.add(board);
    board.add(new T.Mesh(M.rbox(1.5, 0.95, 0.08, 0.04), new T.MeshLambertMaterial({ color: '#ffffff' })));
    const face = new T.MeshBasicMaterial({ map: textTex(['FOR SALE', fmt(d.price)], '#dc2626', '#ffffff') }); [0.045, -0.045].forEach((z) => { const m = new T.Mesh(new T.PlaneGeometry(1.38, 0.84), face); m.position.z = z; if (z < 0) m.rotation.y = PI; board.add(m); });
    p.signFace = face; p.board = board; scene.add(g); p.ext = g;
    const tag = M.sprite('🚪 ' + d.name, { color: '#ffffff', bg: 'rgba(22,101,52,.85)', wide: 6, scale: 1.5, fs: 0.42, bold: true }); tag.position.set(0, 4.1, z1 + 3.2); tag.visible = false; g.add(tag); p.tag = tag;
    // world positions: mailbox, driveway (where your ride parks), collider for the mailbox
    const L = (lx, lz) => ({ x: p.x + Math.cos(p.yaw) * lx + Math.sin(p.yaw) * lz, z: p.z - Math.sin(p.yaw) * lx + Math.cos(p.yaw) * lz });
    p.mailbox = L(mb[0], mb[1]); p.drive = Object.assign(L(4.4, z1 + 4.5), { yaw: p.yaw }); p.homeSpot = Object.assign(L(4.4, z1 + 4.5), { name: 'your driveway', id: 'home' });
    W.addCirc(p.mailbox.x, p.mailbox.z, 0.3, 1.5, 'mailbox');
    H.refresh(p);
  };
  // show FOR SALE / SOLD-to-you sign + minimap icon
  H.refresh = function (p) {
    if (!p || !p.signFace) return; const own = G() && G().save && H.owns(p.id);
    p.icon = own ? '🏠' : '🏷️'; p.short = own ? 'MY ' + p.home.short : p.home.short + ' (FOR SALE)';
    p.signFace.map.dispose(); p.signFace.map = own ? textTex(['🏠 HOME', (G().myName ? G().myName() : 'My') + "'s"], '#16a34a', '#ffffff') : textTex(['FOR SALE', fmt(p.home.price)], '#dc2626', '#ffffff'); p.signFace.needsUpdate = true;
  };
  H.refreshAll = () => H.places().forEach(H.refresh);
  // ---------- buying ----------
  H.shop = function (focusId) {
    const s = S(); let h = '<h2>🏠 GROK REALTY</h2><p class="sub">Buy a home: your own house to decorate, a garage for your rides, a comfy bed, and you wake up there every time you play!</p><div class="list">';
    H.LIST.forEach((d) => { const own = H.owns(d.id), main = s.mainHome === d.id; h += '<div class="li' + (d.id === focusId ? ' on' : '') + '"><span class="ico">' + d.icon + '</span><div class="grow"><b>' + esc(d.name) + '</b><br><small>' + esc(d.blurb) + '</small></div>' +
      (own ? (main ? '<b>🏠 HOME</b>' : '<button class="btn alt small" data-main="' + d.id + '">MAKE MAIN</button>') : '<button class="btn gold small" data-buy="' + d.id + '">' + fmt(d.price) + '</button>') + '<button class="btn blue small" data-gps="' + d.id + '">GPS</button></div>'; });
    h += '</div><p class="sub small">You have ' + fmt(s.money) + '.</p><div class="btnrow"><button class="btn alt" data-a="close">CLOSE</button></div>';
    UI().panel(h, (root) => {
      root.querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', () => { H.buy(b.dataset.buy); H.shop(b.dataset.buy); }));
      root.querySelectorAll('[data-main]').forEach((b) => b.addEventListener('click', () => { s.mainHome = b.dataset.main; G().persist(); GR.Net.sendNow && GR.Net.sendNow(true); UI().toast('🏠 This is your main home now. You\u2019ll wake up here!'); H.shop(); }));
      root.querySelectorAll('[data-gps]').forEach((b) => b.addEventListener('click', () => { const p = GR.PL.byId[b.dataset.gps]; if (p) { G().setGps({ x: p.door.x, z: p.door.z, name: p.home.name }); UI().toast('🗺️ GPS set to ' + p.home.name); } UI().close(); }));
      root.querySelector('[data-a=close]').addEventListener('click', () => UI().close());
    });
  };
  H.buy = function (id) {
    const s = S(), d = H.LIST.find((q) => q.id === id); if (!d || H.owns(id)) return false;
    if (s.money < d.price) { UI().toast('🏠 You need ' + fmt(d.price) + ' for ' + d.name + '. Keep doing jobs and races!', true); return false; }
    s.money -= d.price; s.homes[id] = { wall: H.WALLS[0], floor: 'wood', items: [], bought: Date.now(), mail: 0 }; s.mainHome = id; G().persist();
    H.refresh(GR.PL.byId[id]); GR.Snd.fx('win'); UI().bigText('🏠 HOME SWEET HOME!'); UI().toast('🔑 You bought ' + d.name + '! It\u2019s your spawn point now. Check the mailbox!');
    const p = GR.PL.byId[id]; if (p) GR.FX.confetti(p.door.x, p.floor + 3, p.door.z); if (GR.Net.sendNow) GR.Net.sendNow(true);
    return true;
  };
  // ---------- door / mailbox options ----------
  function friendHomeAt(p) { const g = G(); for (const k in g.remotes) { const r = g.remotes[k]; if (r.home && r.home.id === p.id) return r; } return null; }
  H.doorOption = function (p, driving) {
    const enter = (pl) => () => { if (driving && !GR.Foot.getOut()) return; if (pl.friend) { const ob = IN().cache[pl.id]; if (ob && ob !== G().inside) { delete IN().cache[pl.id]; IN().dispose(ob); } } GR.Foot.enter(pl); };
    const fr = friendHomeAt(p);
    if (fr && (!H.owns(p.id) || (fr.foot && fr.foot.inside && fr.foot.inside.indexOf(p.id + '@') === 0))) return { label: '🏠 VISIT ' + fr.name.toUpperCase() + '\u2019S HOME', fn: enter(H.placeFor(p, fr)) };
    if (H.owns(p.id)) return { label: '🏠 GO INSIDE MY HOME', fn: enter(H.placeFor(p, null)) };
    return { label: '🏷️ FOR SALE ' + fmt(p.home.price), fn: () => H.shop(p.id) };
  };
  H.footOption = function () {
    const F = GR.Foot; if (F.inside) return null;
    for (const p of H.places()) if (p.mailbox && H.owns(p.id) && Math.hypot(p.mailbox.x - F.x, p.mailbox.z - F.z) < 1.8) return { label: '📬 CHECK MAIL', fn: () => H.mail(p) };
    return null;
  };
  const LETTERS = ['💌 From Grandma Grok: "So proud of you! Remember to eat your veggies."', '📰 The Pine Hollow Times: "Mystery monster truck squashes 12 benches!"', '🎟️ Coupon: Burger Blast says hi! Show this for a smile.', '✉️ From the Race Club: "Come race us anytime, champ!"', '🌟 Star Map hint: "Some Grok Stars hide on rooftops..."', '📮 Postcard from Frostbite Outpost: "Wish you were here! Bring a warm hat."'];
  H.mail = function (p) {
    const h = H.decor(p.id), day = Math.floor(Date.now() / 86400000), g = G(); GR.Snd.fx('coin');
    if (!h.mailWelcome) { h.mailWelcome = 1; h.mailDay = day; g.earn(200); UI().toast('📬 Welcome letter from Grok Realty: "Enjoy your new home!" + $200 housewarming gift'); g.persist(); return; }
    if (h.mailDay !== day) { h.mailDay = day; const amt = 100; g.earn(amt); UI().toast('📬 Daily mail: a ' + fmt(amt) + ' gift card + ' + LETTERS[day % LETTERS.length]); g.persist(); return; }
    UI().toast('📭 ' + LETTERS[(Math.random() * LETTERS.length) | 0] + ' (More mail tomorrow!)');
  };
  // ---------- interior ----------
  const PCACHE = {};
  // the place object you walk into. ownerKey keeps your home and a friend's home (same lot) apart, and lets co-op visitors match ids
  H.placeFor = function (base, friend) {
    const g = G(), key = friend ? friend.pid : (g.room ? g.room.pid : 'me'), id = base.id + '@' + key;
    let p = PCACHE[id]; if (!p) { p = PCACHE[id] = Object.assign({}, base, { id, baseId: base.id, gen: false }); }
    p.owner = friend ? friend.name : null; p.friend = friend || null; p.decorData = friend ? (friend.home.d || {}) : H.decor(base.id); p.short = friend ? friend.name.toUpperCase() + '\u2019S HOME' : 'MY HOME'; p.name = friend ? friend.name + '\u2019s ' + base.home.name : base.home.name; p.icon = '🏠';
    p.door = base.door; p.dx = base.dx; p.dz = base.dz; p.yaw = base.yaw;
    return p;
  };
  H.find = function (id) { if (!id || id.indexOf('@') < 0) return null; const base = GR.PL.byId[id.split('@')[0]]; if (!base || !H.owns(base.id)) return null; return H.placeFor(base, null); };
  const furn = {}; // builders: (b, x, z, r) in room coords
  function grp(b, x, z, r) { const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = r || 0; b.scene.add(g); return g; }
  const RB = (b, g, w, h, d, rr, c, x, y, z) => { const m = new T.Mesh(M.rbox(w, h, d, rr), b.mat(c)); m.position.set(x, y + h / 2, z); g.add(m); return m; };
  const SP = (b, g, r, c, x, y, z, sx, sy, sz) => { const m = new T.Mesh(new T.SphereGeometry(r, 16, 12), b.mat(c)); m.position.set(x, y, z); m.scale.set(sx || 1, sy || sx || 1, sz || sx || 1); g.add(m); return m; };
  const solid = (b, x, z, rx, rz) => b.solids.push({ x0: x - rx, z0: z - rz, x1: x + rx, z1: z + rz });
  furn.plant = (b, x, z) => b.plant(x, z, 1.1);
  furn.lamp = (b, x, z) => IN().deco.floorLamp(b, x, z);
  furn.rug = (b, x, z, r) => { const g = grp(b, x, z, r); const m = new T.Mesh(new T.CylinderGeometry(1.3, 1.3, 0.03, 32), b.mat('#a855f7')); m.position.y = 0.015; g.add(m); const m2 = new T.Mesh(new T.TorusGeometry(1.0, 0.04, 6, 32), b.mat('#f0abfc')); m2.rotation.x = PI / 2; m2.position.y = 0.035; g.add(m2); };
  furn.armchair = (b, x, z, r) => { const g = grp(b, x, z, r); RB(b, g, 1.1, 0.42, 0.95, 0.12, '#0ea5e9', 0, 0.08, 0); RB(b, g, 1.1, 0.8, 0.26, 0.12, '#0284c7', 0, 0.3, -0.38); RB(b, g, 0.22, 0.58, 0.95, 0.1, '#0284c7', -0.5, 0.2, 0); RB(b, g, 0.22, 0.58, 0.95, 0.1, '#0284c7', 0.5, 0.2, 0); RB(b, g, 0.85, 0.16, 0.7, 0.07, '#7dd3fc', 0, 0.5, 0.06); solid(b, x, z, 0.55, 0.55); };
  furn.beanbag = (b, x, z) => { const g = grp(b, x, z, 0); SP(b, g, 0.6, '#f97316', 0, 0.38, 0, 1, 0.62, 1); SP(b, g, 0.38, '#fb923c', 0, 0.6, -0.25, 1, 0.8, 0.6); solid(b, x, z, 0.5, 0.5); };
  furn.bookshelf = (b, x, z, r) => { const g = grp(b, x, z, r); RB(b, g, 1.6, 2.0, 0.45, 0.04, '#92400e', 0, 0, 0); const cols = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#14b8a6']; for (let s = 0; s < 4; s++) { RB(b, g, 1.5, 0.04, 0.4, 0.01, '#b45309', 0, 0.15 + s * 0.48, 0.03); for (let i = 0; i < 9; i++) RB(b, g, 0.11, 0.3 + (i % 3) * 0.05, 0.3, 0.015, cols[(i + s) % 6], -0.6 + i * 0.15, 0.19 + s * 0.48, 0.06); } solid(b, x, z, 0.8, 0.8); };
  furn.teddy = (b, x, z, r) => { const g = grp(b, x, z, r), c = '#b45309'; SP(b, g, 0.45, c, 0, 0.5, 0, 1, 1.1, 0.9); SP(b, g, 0.33, c, 0, 1.15, 0.05); [[-0.24, 1.4], [0.24, 1.4]].forEach((q) => SP(b, g, 0.11, c, q[0], q[1], 0)); SP(b, g, 0.14, '#fde68a', 0, 1.08, 0.3, 1, 0.8, 0.6); SP(b, g, 0.04, '#111', -0.1, 1.24, 0.29); SP(b, g, 0.04, '#111', 0.1, 1.24, 0.29); SP(b, g, 0.045, '#111', 0, 1.13, 0.39); [[-0.42, 0.62], [0.42, 0.62], [-0.2, 0.1], [0.2, 0.1]].forEach((q) => SP(b, g, 0.16, c, q[0], q[1], 0.15, 1, 1.3, 1)); SP(b, g, 0.16, '#ef4444', 0, 0.9, 0.3, 1.4, 0.5, 0.4); solid(b, x, z, 0.5, 0.5); };
  furn.aquarium = (b, x, z) => { IN().deco.fishTank(b, x, z); solid(b, x, z, 1.25, 0.45); };
  furn.trophy = (b, x, z, r) => { const g = grp(b, x, z, r); RB(b, g, 1.4, 1.0, 0.6, 0.05, '#1f2937', 0, 0, 0); [-0.45, 0, 0.45].forEach((tx, i) => { const c = ['#cd7f32', '#facc15', '#cbd5e1'][i]; RB(b, g, 0.24, 0.1, 0.2, 0.03, '#111827', tx, 1.0, 0); const cup = new T.Mesh(new T.CylinderGeometry(0.15, 0.06, 0.26, 16), b.mat(c)); cup.position.set(tx, 1.32 + (i === 1 ? 0.08 : 0), 0); g.add(cup); const st = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.12, 8), b.mat(c)); st.position.set(tx, 1.15, 0); g.add(st); }); solid(b, x, z, 0.7, 0.4); };
  furn.arcade = (b, x, z, r) => { const g = grp(b, x, z, r); RB(b, g, 0.9, 1.9, 0.8, 0.06, '#7c3aed', 0, 0, 0); RB(b, g, 0.92, 0.12, 0.5, 0.04, '#111827', 0, 1.0, 0.35); const sc = new T.Mesh(new T.BoxGeometry(0.66, 0.5, 0.04), new T.MeshBasicMaterial({ color: '#22d3ee' })); sc.position.set(0, 1.45, 0.38); sc.rotation.x = -0.15; g.add(sc); b.anims.push((t) => sc.material.color.setHSL((t * 0.2) % 1, 0.8, 0.6)); SP(b, g, 0.05, '#ef4444', -0.15, 1.15, 0.5); SP(b, g, 0.05, '#facc15', 0.1, 1.15, 0.5); solid(b, x, z, 0.5, 0.5); const wx = x + Math.sin(r || 0) * 1.0, wz = z + Math.cos(r || 0) * 1.0; b.station(wx, wz, '🕹️', 'PLAY ARCADE', () => IN().arcade(b, b.p), '#a855f7'); };
  furn.piano = (b, x, z, r) => { const g = grp(b, x, z, r); RB(b, g, 1.8, 1.25, 0.6, 0.04, '#111827', 0, 0, -0.1); RB(b, g, 1.7, 0.06, 0.32, 0.01, '#f8fafc', 0, 0.75, 0.28); for (let i = 0; i < 10; i++) RB(b, g, 0.06, 0.06, 0.18, 0.01, '#111827', -0.7 + i * 0.16, 0.8, 0.2); solid(b, x, z, 0.95, 0.5); const wx = x + Math.sin(r || 0) * 0.95, wz = z + Math.cos(r || 0) * 0.95; b.station(wx, wz, '🎹', 'PLAY PIANO', () => { GR.Snd.fx('jingle'); UI().toast('🎹 You play a happy tune!'); }, '#f8fafc'); };
  furn.tree = (b, x, z) => { const g = grp(b, x, z, 0); RB(b, g, 0.5, 0.4, 0.5, 0.05, '#b91c1c', 0, 0, 0); [[0.8, 0.9, 0.5], [0.62, 0.8, 1.15], [0.42, 0.7, 1.75]].forEach((q) => { const c = new T.Mesh(new T.ConeGeometry(q[0], q[1], 14), b.mat('#15803d')); c.position.y = q[2] + q[1] / 2; g.add(c); }); const st = new T.Mesh(new T.OctahedronGeometry(0.16), b.mat('#facc15', true)); st.position.y = 2.6; g.add(st); ['#ef4444', '#3b82f6', '#facc15', '#ec4899', '#f8fafc'].forEach((c, i) => { const a = i * 1.3; SP(b, g, 0.08, c, Math.cos(a) * (0.55 - i * 0.07), 0.9 + i * 0.32, Math.sin(a) * (0.55 - i * 0.07)); }); solid(b, x, z, 0.6, 0.6); };
  function wallSeg(b, x0, z0, x1, z1, h, col) { const w = Math.max(0.2, Math.abs(x1 - x0)), d = Math.max(0.2, Math.abs(z1 - z0)), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; b.box(cx, 0, cz, w, h, d, col); b.box(cx, h, cz, w + 0.08, 0.08, d + 0.08, '#ffffff'); b.solids.push({ x0: cx - w / 2, z0: cz - d / 2, x1: cx + w / 2, z1: cz + d / 2 }); }
  // ---------- the garage: everything real 3D (merged into one vertex-coloured mesh so phones stay fast) ----------
  function signFace(text, bg, w, h) { return new T.MeshBasicMaterial({ map: IN().kit.signTex(text, bg, '#ffffff', Math.round(256 * w / h), 256) }); }
  // a 3D sign board hanging from the ceiling on two chains, printed on both sides
  function hangSign(b, x, y, z, text, bg, w, h) {
    const g = new T.Group(); g.position.set(x, y, z); b.scene.add(g);
    const bd = new T.Mesh(M.rbox(w + 0.12, h + 0.12, 0.09, 0.04), b.mat(bg)); g.add(bd); const fm = signFace(text, bg, w, h);
    [0.05, -0.05].forEach((zz) => { const f = new T.Mesh(new T.PlaneGeometry(w, h), fm); f.position.z = zz; if (zz < 0) f.rotation.y = PI; g.add(f); });
    const top = b.H - y; [-w / 2 + 0.15, w / 2 - 0.15].forEach((cx) => { for (let k = 0; k < top / 0.09 - 3; k++) { const l = new T.Mesh(new T.TorusGeometry(0.03, 0.008, 4, 8), b.mat('#9ca3af')); l.position.set(cx, h / 2 + 0.06 + k * 0.09, 0); if (k % 2) l.rotation.y = PI / 2; g.add(l); } });
    return g;
  }
  function buildGarage(b, Dd, Hh) {
    const q = [], A = (g, c, x, y, z, rx, ry, rz) => { U.xf(g, x, y, z, rx || 0, ry || 0, rz || 0); q.push(U.paint(g, c)); };
    const bx = (w, h, d) => new T.BoxGeometry(w, h, d), rb = (w, h, d, r) => M.rbox(w, h, d, r), cy = (r1, r2, h, n) => new T.CylinderGeometry(r1, r2, h, n || 12);
    const X0 = 4, X1 = 11, Z0 = -8, Z1 = 8;
    // floor: sealed concrete slab with expansion joints, yellow bay lines, a drain, oil stains
    A(bx(7, 0.02, 16), '#a8a29e', 7.5, 0.01, 0); for (let zz = -4; zz <= 4; zz += 4) A(bx(7, 0.004, 0.03), '#8b8580', 7.5, 0.022, zz); A(bx(0.03, 0.004, 16), '#8b8580', 7.5, 0.022, 0);
    [5.9, 9.1].forEach((x) => { A(bx(0.08, 0.005, 5.6), '#facc15', x - 1.6, 0.024, -4.4); A(bx(0.08, 0.005, 5.6), '#facc15', x + 1.6, 0.024, -4.4); });
    A(cy(0.22, 0.22, 0.01, 18), '#57534e', 7.5, 0.025, -0.6); for (let i = -2; i <= 2; i++) A(bx(0.36, 0.012, 0.025), '#3f3c39', 7.5, 0.03, -0.6 + i * 0.07);
    // walls: painted garage panels + dark grey wainscot (east, north, front)
    A(bx(0.04, Hh, Z1 - Z0), '#d4d8de', X1 - 0.02, Hh / 2, 0); A(bx(0.05, 1.0, Z1 - Z0), '#64748b', X1 - 0.04, 0.5, 0);
    A(bx(X1 - X0, Hh, 0.04), '#d4d8de', 7.5, Hh / 2, Z0 + 0.02); A(bx(X1 - X0, 1.0, 0.05), '#64748b', 7.5, 0.5, Z0 + 0.04);
    A(bx(X1 - X0, 0.12, 0.08), '#facc15', 7.5, 1.06, Z0 + 0.06); A(bx(0.08, 0.12, Z1 - Z0), '#facc15', X1 - 0.06, 1.06, 0);
    // roll-up door: ribbed slats in guide rails, roller housing, handle, rubber seal, little windows
    for (let i = 0; i < 9; i++) A(rb(5.6, 0.36, 0.08, 0.03), i % 2 ? '#e5e7eb' : '#f1f5f9', 7.5, 0.2 + i * 0.39, Z1 - 0.1);
    [5.5, 6.8, 8.2, 9.5].forEach((x) => A(bx(0.9, 0.24, 0.03), '#93c5fd', x, 2.94, Z1 - 0.15));
    A(bx(5.7, 0.06, 0.12), '#111827', 7.5, 0.03, Z1 - 0.1); [4.62, 10.38].forEach((x) => A(bx(0.12, 3.7, 0.18), '#6b7280', x, 1.85, Z1 - 0.12));
    A(cy(0.26, 0.26, 5.9, 18), '#9ca3af', 7.5, 3.85, Z1 - 0.32, 0, 0, PI / 2); A(rb(0.5, 0.06, 0.08, 0.03), '#374151', 7.5, 0.6, Z1 - 0.18);
    // ceiling: exposed beams + two fluorescent light fixtures (glowing tubes)
    [-6, -2, 2, 6].forEach((z) => A(bx(7, 0.22, 0.16), '#a8a29e', 7.5, Hh - 0.11, z)); A(bx(0.16, 0.18, 16), '#a8a29e', 7.5, Hh - 0.31, 0);
    [[5.9, -4.4], [9.1, -4.4], [7.5, 3.6]].forEach((f) => { A(rb(0.36, 0.1, 1.7, 0.03), '#e5e7eb', f[0], Hh - 0.45, f[1]); [-0.05, 0.05].forEach((o) => A(bx(0.05, 0.03, 0.04), '#9ca3af', f[0] + o * 3, Hh - 0.33, f[1] - 0.7)); });
    // shelving unit on the north wall: steel uprights, 4 shelves, paint cans, boxes, a helmet, oil bottles
    const SX = 7.5, SZ = Z0 + 0.35; [[-1.25, -0.22], [1.25, -0.22], [-1.25, 0.22], [1.25, 0.22]].forEach((o) => A(bx(0.05, 2.3, 0.05), '#475569', SX + o[0], 1.15, SZ + o[1]));
    for (let k = 0; k < 4; k++) A(bx(2.6, 0.04, 0.5), '#94a3b8', SX, 0.25 + k * 0.62, SZ);
    [['#ef4444', -1.0], ['#3b82f6', -0.7], ['#22c55e', -0.4]].forEach((c) => { A(cy(0.12, 0.12, 0.26, 16), c[0], SX + c[1], 0.4, SZ); A(cy(0.125, 0.125, 0.03, 16), '#cbd5e1', SX + c[1], 0.54, SZ); });
    [[0.3, 0.4, '#c19a6b'], [0.8, 0.32, '#b08968'], [-0.6, 0.34, '#c19a6b']].forEach((c, i) => A(rb(0.42, c[1], 0.38, 0.02), c[2], SX + c[0], 0.27 + (i === 2 ? 0.62 : 0) + c[1] / 2, SZ));
    for (let i = 0; i < 5; i++) A(rb(0.1, 0.26, 0.08, 0.03), ['#facc15', '#f97316', '#0ea5e9'][i % 3], SX + 0.1 + i * 0.16, 0.89 + 0.13 + 0.62, SZ);
    A(new T.SphereGeometry(0.2, 16, 12, 0, PI * 2, 0, PI * 0.6), '#ff4fd8', SX - 0.8, 1.52, SZ); A(rb(0.5, 0.08, 0.35, 0.03), '#374151', SX + 0.6, 2.13, SZ);
    // pegboard tool wall above the workbench (east wall)
    const PZ = 1.6, PX = X1 - 0.07; A(bx(0.04, 1.4, 2.6), '#c8a06a', PX, 1.95, PZ); A(bx(0.06, 0.05, 2.7), '#8a5a2b', PX, 2.66, PZ); A(bx(0.06, 0.05, 2.7), '#8a5a2b', PX, 1.24, PZ);
    for (let r = 0; r < 6; r++) for (let c = 0; c < 12; c++) A(cy(0.016, 0.016, 0.01, 6), '#6b4f2a', PX - 0.022, 1.35 + r * 0.24, PZ - 1.18 + c * 0.215, 0, 0, PI / 2);
    const TX = PX - 0.06;
    [0.0, 0.22, 0.42].forEach((dz, i) => { const L = 0.3 + i * 0.05; A(rb(0.02, L, 0.05, 0.01), '#cbd5e1', TX, 2.05, PZ - 1.0 + dz); A(new T.TorusGeometry(0.045, 0.014, 6, 12, PI * 1.5), '#cbd5e1', TX, 2.05 + L / 2 + 0.04, PZ - 1.0 + dz, 0, PI / 2, PI * 0.75); });
    A(cy(0.022, 0.022, 0.36, 8), '#92400e', TX, 1.85, PZ - 0.25); A(rb(0.07, 0.07, 0.2, 0.02), '#374151', TX, 2.05, PZ - 0.25);
    [['#ef4444', 0.05], ['#facc15', 0.17], ['#3b82f6', 0.29]].forEach((c) => { A(cy(0.026, 0.022, 0.13, 10), c[0], TX, 2.2, PZ + c[1]); A(cy(0.007, 0.007, 0.17, 6), '#d1d5db', TX, 2.05, PZ + c[1]); });
    A(bx(0.01, 0.16, 0.55), '#d1d5db', TX, 1.55, PZ + 0.75); A(rb(0.04, 0.16, 0.16, 0.03), '#dc2626', TX, 1.58, PZ + 1.08);
    A(cy(0.012, 0.012, 0.22, 6), '#ef4444', TX, 2.4, PZ + 0.6, 0.25, 0, 0); A(cy(0.012, 0.012, 0.22, 6), '#ef4444', TX, 2.4, PZ + 0.66, -0.25, 0, 0);
    A(cy(0.08, 0.08, 0.05, 16), '#facc15', TX, 2.42, PZ + 0.95, 0, 0, PI / 2);
    // workbench: wooden top, steel legs, drawers with handles, lower shelf, vise, a little toolbox and a lamp
    const WX = 10.4; A(rb(1.1, 0.08, 2.6, 0.02), '#b7793f', WX, 0.92, PZ); [[-0.45, -1.2], [0.45, -1.2], [-0.45, 1.2], [0.45, 1.2]].forEach((o) => A(bx(0.06, 0.88, 0.06), '#475569', WX + o[0], 0.44, PZ + o[1]));
    A(bx(1.0, 0.04, 2.5), '#64748b', WX, 0.2, PZ); for (let i = 0; i < 3; i++) { A(rb(0.04, 0.2, 0.7, 0.02), '#94a3b8', WX - 0.55, 0.74, PZ - 0.8 + i * 0.8); A(bx(0.03, 0.03, 0.22), '#e5e7eb', WX - 0.58, 0.74, PZ - 0.8 + i * 0.8); }
    A(rb(0.18, 0.14, 0.32, 0.02), '#1d4ed8', WX - 0.3, 1.03, PZ - 0.9); A(cy(0.015, 0.015, 0.4, 6), '#d1d5db', WX - 0.42, 1.06, PZ - 0.9, 0, 0, PI / 2);
    A(rb(0.3, 0.2, 0.5, 0.03), '#dc2626', WX, 1.06, PZ + 0.3); A(bx(0.04, 0.06, 0.3), '#111827', WX, 1.2, PZ + 0.3);
    A(cy(0.08, 0.1, 0.03, 12), '#111827', WX + 0.2, 0.97, PZ + 1.0); A(cy(0.012, 0.012, 0.45, 6), '#111827', WX + 0.2, 1.2, PZ + 1.0); A(cy(0.06, 0.13, 0.14, 12), '#16a34a', WX + 0.05, 1.42, PZ + 1.0, 0, 0, 0.6);
    b.solids.push({ x0: WX - 0.6, z0: PZ - 1.3, x1: X1, z1: PZ + 1.3 });
    // rolling tool chest (red, 6 drawers, chrome handles, casters)
    const CX = 10.35, CZ = 4.3; A(rb(0.72, 1.05, 1.1, 0.04), '#dc2626', CX, 0.62, CZ); A(rb(0.76, 0.06, 1.14, 0.02), '#111827', CX, 1.17, CZ);
    for (let i = 0; i < 6; i++) { A(bx(0.02, 0.012, 1.0), '#7f1d1d', CX - 0.37, 0.2 + i * 0.17, CZ); A(cy(0.012, 0.012, 0.5, 6), '#e5e7eb', CX - 0.4, 0.27 + i * 0.17, CZ, PI / 2, 0, 0); }
    [[-0.28, -0.45], [0.28, -0.45], [-0.28, 0.45], [0.28, 0.45]].forEach((o) => A(cy(0.05, 0.05, 0.04, 10), '#111827', CX + o[0], 0.05, CZ + o[1], 0, 0, PI / 2));
    b.solids.push({ x0: CX - 0.4, z0: CZ - 0.6, x1: X1, z1: CZ + 0.6 });
    // tyre stacks (real rounded tyres with rims) + a hose reel + a fire extinguisher
    [[10.3, 6.7, 3], [9.3, 7.0, 2]].forEach((t) => { for (let i = 0; i < t[2]; i++) { A(new T.TorusGeometry(0.34, 0.14, 10, 22), '#1f2937', t[0], 0.14 + i * 0.28, t[1], PI / 2); A(cy(0.22, 0.22, 0.2, 16), '#9ca3af', t[0], 0.14 + i * 0.28, t[1]); } b.solids.push({ x0: t[0] - 0.5, z0: t[1] - 0.5, x1: t[0] + 0.5, z1: t[1] + 0.5 }); });
    A(new T.TorusGeometry(0.3, 0.07, 8, 20), '#16a34a', X1 - 0.15, 2.1, -1.4, 0, PI / 2, 0); A(cy(0.18, 0.18, 0.12, 14), '#374151', X1 - 0.12, 2.1, -1.4, 0, 0, PI / 2);
    A(cy(0.1, 0.1, 0.5, 14), '#dc2626', X1 - 0.15, 0.55, -0.4); A(new T.SphereGeometry(0.1, 12, 8), '#dc2626', X1 - 0.15, 0.8, -0.4); A(cy(0.03, 0.03, 0.12, 8), '#111827', X1 - 0.15, 0.9, -0.4);
    const body = new T.Mesh(U.merge(q), M.matMatte); b.scene.add(body);
    // light tubes glow; oil stains (soft, see-through); a warm fill light so the garage isn't grey
    [[5.9, -4.4], [9.1, -4.4], [7.5, 3.6]].forEach((f) => b.box(f[0], Hh - 0.52, f[1], 0.16, 0.03, 1.55, '#fffbea', false, true));
    const oil = new T.MeshBasicMaterial({ color: '#1c1917', transparent: true, opacity: 0.3, depthWrite: false });
    [[5.7, -3.6, 0.55], [6.2, -3.1, 0.3], [9.3, -3.8, 0.45], [7.4, 4.9, 0.4]].forEach((o) => { const m = new T.Mesh(new T.CircleGeometry(o[2], 22), oil); m.rotation.x = -PI / 2; m.position.set(o[0], 0.03, o[1]); m.scale.y = 0.75; b.scene.add(m); });
    const pl = new T.PointLight(0xfff1d6, 0.5, 12); pl.position.set(7.5, Hh - 0.8, 0); b.scene.add(pl);
    // 3D wall signs (real boards): garage name above the shelves + a checkered race banner + a speed-limit plate
    b.sign('🔧 MY GARAGE', 'e', -4.6, 3.05, 3.2, 0.75, '#1f2937');
    b.sign('🏁 GROK RIDES RACE TEAM 🏁', 'n', 7.5, 3.4, 4.2, 0.55, '#111827');
    b.sign('5\nMPH', 'e', 5.6, 2.3, 0.6, 0.8, '#b91c1c');
  }
  function buildHome(b, p) {
    const D = p.decorData || {}, wall = D.wall || H.WALLS[0], dk = IN().deco, acc = p.acc || '#b45309', visit = !!p.friend;
    b.shell({ wall, floor: D.floor || 'wood', tile: 3, windows: false, ceil: '#fff7ed' });
    const Wd = b.W, Dd = b.D;
    // --- room dividers (low, so the camera always sees over them): bedroom, kitchen, garage ---
    wallSeg(b, -11, -1.5, -6.2, -1.5, 1.3, wall); wallSeg(b, -4.4, -1.5, -3.5, -1.5, 1.3, wall); wallSeg(b, -3.5, -8, -3.5, -4.6, 1.3, wall);
    wallSeg(b, 4, -8, 4, -1.2, 1.3, '#d6d3d1'); wallSeg(b, 4, 2.2, 4, 8, 1.3, '#d6d3d1');
    buildGarage(b, Dd, b.H);
    const prev = S().homePrev, rides = visit ? (p.friend.home.rv || []) : Object.keys(G().save.owned).filter((k) => GR.VEH[k].kind === 'ground' && k !== G().me.type).sort((a, b) => (b === prev) - (a === prev)); // the ride you just swapped out parks first
    const ok = rides.map((k) => (typeof k === 'string' ? { t: k, c: (G().save.owned[k] || {}).color } : k)).filter((r) => GR.VEH[r.t] && GR.VEH[r.t].kind === 'ground' && !['bus', 'bigrig', 'limo'].includes(r.t));
    const slots = [[5.9, -4.4, 0], [9.1, -4.4, 0], [7.5, 4.6, PI / 2]]; b.parked = [];
    ok.slice(0, 3).forEach((r, i) => { const s = slots[i]; if (i === 2 && !(GR.VEH[r.t].two || GR.VEH[r.t].kart)) return; const m = M.vehicle(r.t, r.c || GR.VEH[r.t].color || '#ff4fd8', { noRider: true, noNight: true }); m.position.set(s[0], 0, s[1]); m.rotation.y = s[2]; b.scene.add(m); const L = m.userData.L, Wd2 = m.userData.W; if (s[2]) solid(b, s[0], s[1], L / 2, Wd2 / 2); else solid(b, s[0], s[1], Wd2 / 2, L / 2); b.parked.push(r.t);
      const sz = s[2] ? s[1] - 1.4 : s[1] + L / 2 + 0.9;
      hangSign(b, s[0], b.H - 0.95, s[1] + (s[2] ? -0.2 : 0.4), GR.VEH[r.t].icon + ' ' + GR.VEH[r.t].name, visit ? '#475569' : '#16a34a', 2.3, 0.6);
      if (!visit) { const st = b.station(s[0], sz, GR.VEH[r.t].icon, 'DRIVE ' + GR.VEH[r.t].name.toUpperCase(), () => H.swap(r.t), '#22c55e'); st.sp.visible = false; } });
    if (!visit) { const st = b.station(7.5, 1.0, '🚗', 'MY GARAGE (SWAP RIDE)', () => H.garageMenu(), '#22c55e'); st.sp.visible = false; hangSign(b, 7.5, b.H - 1.0, 1.0, '🔑 SWAP RIDES', '#ff4fd8', 2.0, 0.55); }
    // --- bedroom ---
    dk.bed(b, -8.6, -6.3, '#60a5fa'); b.box(-4.6, 0, -6.8, 1.4, 2.1, 0.7, '#a16207', true); b.box(-4.6, 1.0, -6.44, 0.04, 0.9, 0.02, '#78350f'); [-4.25, -4.95].forEach((x) => b.box(x, 1.0, -6.43, 0.05, 0.05, 0.04, '#facc15'));
    const br = new T.Mesh(M.rbox(3.2, 0.03, 2.2, 0.3), b.mat('#f9a8d4')); br.position.set(-8.6, 0.02, -3.6); b.scene.add(br);
    dk.window3(b, 'w', -4.6, 2.0, 1.5, 1.3, '#bfdbfe'); dk.picture(b, 'n', -6.2, 2.7, 1.1, 0.8, 3, '#1f2937');
    b.station(-6.6, -3.2, '😴', visit ? 'TAKE A NAP' : 'SLEEP TILL MORNING', () => H.sleep(), '#818cf8');
    // --- kitchen + dining ---
    dk.kitchen(b, -3.0, -7.3, 2.6, acc); b.table(0.9, -4.6, '#fef3c7', 0.75); [[-0.15, -4.6, PI / 2], [1.95, -4.6, -PI / 2], [0.9, -3.6, PI], [0.9, -5.6, 0]].forEach((c) => b.chair(c[0], c[1], acc, c[2]));
    dk.pendant(b, 0.9, -4.6, acc); dk.window3(b, 'n', 1.2, 2.1, 1.6, 1.2, '#fde68a'); dk.wallShelf(b, 'n', -1.8, 2.3, 1.4);
    const bowl = new T.Mesh(new T.SphereGeometry(0.22, 14, 8, 0, PI * 2, PI / 2, PI / 2), b.mat('#f8fafc')); bowl.position.set(0.9, 1.0, -4.6); b.scene.add(bowl); ['#ef4444', '#facc15', '#22c55e'].forEach((c, i) => b.ball(0.82 + i * 0.09, 1.0, -4.6 + (i - 1) * 0.07, 0.07, c));
    if (!visit) b.station(-1.7, -5.6, '🥞', 'MAKE PANCAKES', () => H.cook(), '#f59e0b');
    // --- living room ---
    dk.tvSet(b, -7.6, -1.05); b.sofa(-7.6, 2.9, 3.0, '#ef4444', PI); const ct = new T.Mesh(M.rbox(1.6, 0.1, 0.8, 0.04), b.mat('#a16207')); ct.position.set(-7.6, 0.45, 1.1); b.scene.add(ct); [[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]].forEach((q) => b.cyl(-7.6 + q[0], 0, 1.1 + q[1], 0.04, 0.42, '#78350f', false, 8)); solid(b, -7.6, 1.1, 0.8, 0.4);
    const lr = new T.Mesh(M.rbox(4.6, 0.03, 3.2, 0.3), b.mat('#fde68a')); lr.position.set(-7.6, 0.02, 1.6); b.scene.add(lr); b.ball(-7.9, 0.58, 1.1, 0.12, '#f472b6'); b.box(-7.2, 0.5, 1.15, 0.4, 0.06, 0.3, '#3b82f6');
    dk.floorLamp(b, -10.3, 3.6); b.plant(-10.3, -0.6, 1.0); b.plant(-2.6, 7.0, 1.1); dk.window3(b, 'w', 2.8, 2.0, 1.6, 1.3, '#fecaca'); dk.picture(b, 's', -6.5, 2.4, 1.6, 1.0, 7, '#a16207'); dk.picture(b, 's', -3.4, 2.4, 0.9, 0.9, 5, '#1f2937');
    dk.pendant(b, -7.6, 1.6, '#f59e0b'); dk.wallShelf(b, 'w', 0.2, 2.2, 1.4);
    if (!visit) b.station(-1.8, 5.2, '🎨', 'DECORATE MY HOME', () => H.decorMenu(), '#ff4fd8');
    // --- your placed furniture ---
    (D.items || []).slice(0, MAXITEMS).forEach((it) => { const f = furn[it.k]; if (f) try { f(b, it.x, it.z, it.r || 0); } catch (e) { console.warn('furn', it, e); } });
    b.homeOf = p.baseId;
  }
  IN().BUILD.myhome = buildHome;
  IN().BUILD.realty = function (b, p) {
    b.shell({ wall: '#ecfdf5', floor: 'shiny', tile: 4 }); const dk = IN().deco;
    b.counter(0, -3.5, 6, 1.2, '#f8fafc', '#16a34a');
    b.npc(0, -4.6, 0, IN().kit.who('Realtor Rosa', { hat: null, lines: ['Every home comes with a garage and a comfy bed!', 'You wake up at your main home every time you play.', 'Decorate it however you like!'] }));
    b.npc(-6.5, 5.2, PI * 0.8, IN().kit.who('Ben', { lines: ['I\u2019m saving up for the loft. Those windows!', 'The starter house has a garden AND a garage!'], path: [[-7, 5.2], [6, 5.2]] }));
    H.LIST.forEach((d, i) => { const x = -5 + i * 5; const g = new T.Group(); g.position.set(x, 0, 2.2); b.scene.add(g); const ped = new T.Mesh(M.rbox(1.6, 0.9, 1.6, 0.1), b.mat('#f8fafc')); ped.position.y = 0.45; g.add(ped);
      const mini = new T.Group(); mini.position.y = 0.9; mini.scale.setScalar(0.09); g.add(mini); const hb = new T.Mesh(new T.BoxGeometry(16, d.style === 'loft' ? 8 : 3.8, 12), b.mat(d.wall)); hb.position.y = (d.style === 'loft' ? 4 : 1.9); mini.add(hb); const rf = d.style === 'loft' ? new T.Mesh(new T.BoxGeometry(16.4, 0.6, 12.4), b.mat('#334155')) : new T.Mesh(new T.ConeGeometry(11, 3.5, 4), b.mat(d.style === 'villa' ? '#c2410c' : '#b45309')); rf.position.y = d.style === 'loft' ? 8.3 : 5.5; if (d.style !== 'loft') { rf.rotation.y = PI / 4; rf.scale.set(1, 1, 0.75); } mini.add(rf); const dr = new T.Mesh(new T.BoxGeometry(1.5, 2.5, 0.2), b.mat('#2563eb')); dr.position.set(-1, 1.25, 6.05); mini.add(dr);
      b.anims.push((t) => { mini.rotation.y = t * 0.4 + i; }); solid(b, x, 2.2, 0.85, 0.85);
      b.station(x, 3.9, d.icon, d.short + ' ' + fmt(d.price), () => H.shop(d.id), '#16a34a'); });
    dk.picture(b, 'n', -5.5, 2.8, 1.6, 1.1, 2); dk.picture(b, 'n', 5.5, 2.8, 1.6, 1.1, 8); b.plant(-7.8, -5.5, 1.1); b.plant(7.8, -5.5, 1.1); dk.floorLamp(b, -7.8, 4.5);
    b.station(0, -1.6, '🏠', 'HOMES FOR SALE', () => H.shop(), '#16a34a');
  };
  // rebuild the home you're standing in (after decorating / swapping rides), keeping you where you are
  H.rebuild = function () {
    const F = GR.Foot, p = F.inside; if (!p || p.kind !== 'myhome') return; const g = G(), old = IN().cache[p.id], me = F.body();
    delete IN().cache[p.id]; if (!p.friend) p.decorData = H.decor(p.baseId);
    const b = IN().get(p); g.inside = b; b.scene.add(me); if (old && old !== b) IN().dispose(old);
  };
  // ---------- actions inside ----------
  H.sleep = function () {
    const dn = GR.DN; if (!dn) return; $('fade').classList.add('on'); GR.Snd.fx('ui');
    setTimeout(() => { dn.setTime(0.27); const g = G(); g.me.boost = 1; g.persist(); $('fade').classList.remove('on'); UI().bigText('☀️ GOOD MORNING!'); UI().toast('😴 You slept like a log. Nitro tank is full!'); }, 700);
  };
  H.cook = function () { const g = G(); g.buffs.speed = Math.max(g.buffs.speed || 0, 120); GR.Snd.fx('coin'); UI().toast('🥞 Yum, homemade pancakes! +5% speed for 2 minutes.'); };
  H.swap = function (type) {
    const p = GR.Foot.inside, base = p && GR.PL.byId[p.baseId]; if (!base) return;
    S().homePrev = G().me.type; G().switchVehicle(type, base.homeSpot); UI().toast('🚗 Your ' + GR.VEH[type].name + ' is waiting in the driveway!'); H.rebuild();
  };
  H.garageMenu = function () {
    const s = S(), g = G(); let h = '<h2>🚗 MY GARAGE</h2><p class="sub">Pick a ride: it parks in your driveway, ready to go.</p><div class="vgrid">';
    GR.VEH_ORDER.forEach((k) => { if (!s.owned[k] || GR.VEH[k].kind !== 'ground') return; h += '<button class="vcard ' + (k === g.me.type ? 'on' : '') + '" data-v="' + k + '"><img src="' + UI().thumb(k, s.owned[k].color) + '" alt=""><b>' + esc(GR.VEH[k].name) + '</b><small>' + (k === g.me.type ? 'IN THE DRIVEWAY' : 'TAP TO TAKE') + '</small></button>'; });
    h += '</div><p class="sub small">Boats live at the Marina and aircraft at Sky Field.</p><div class="btnrow"><button class="btn alt" data-a="close">DONE</button></div>';
    UI().panel(h, (root) => { root.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => { const k = b.dataset.v; if (k !== g.me.type) H.swap(k); H.garageMenu(); })); root.querySelector('[data-a=close]').addEventListener('click', () => UI().close()); });
  };
  // ---------- decorate mode ----------
  H.decorMenu = function (tab) {
    const p = GR.Foot.inside; if (!p || p.friend) return; const h0 = H.decor(p.baseId), s = S(); tab = tab || H._dt || 'furn'; H._dt = tab;
    let h = '<h2>🎨 DECORATE</h2><div class="tabs"><button class="btn small ' + (tab === 'furn' ? 'primary' : 'alt') + '" data-t="furn">🛋️ FURNITURE</button><button class="btn small ' + (tab === 'walls' ? 'primary' : 'alt') + '" data-t="walls">🖌️ WALLS & FLOOR</button></div>';
    if (tab === 'furn') {
      h += '<p class="sub small">Buy an item and it\u2019s placed right where you\u2019re standing (facing the way you face). ' + h0.items.length + ' / ' + MAXITEMS + ' items.</p><div class="list">';
      for (const k in H.FURN) { const f = H.FURN[k]; h += '<div class="li"><span class="ico">' + f.icon + '</span><div class="grow">' + esc(f.name) + '</div><button class="btn gold small" data-f="' + k + '">' + fmt(f.price) + '</button></div>'; }
      h += '</div><div class="btnrow"><button class="btn red small" data-a="rm">♻️ REMOVE NEAREST (50% BACK)</button></div>';
    } else {
      h += '<h3>WALL COLOUR ($50)</h3><div class="swatches">' + H.WALLS.map((c) => '<button class="sw' + (h0.wall === c ? ' on' : '') + '" data-w="' + c + '" style="background:' + c + ';width:44px;height:44px;border-radius:12px;border:3px solid ' + (h0.wall === c ? '#ff4fd8' : '#fff') + '"></button>').join(' ') + '</div>';
      h += '<h3>FLOOR ($100)</h3><div class="list">' + Object.keys(H.FLOORS).map((k) => '<div class="li"><div class="grow">' + H.FLOORS[k] + (h0.floor === k ? ' ✅' : '') + '</div><button class="btn alt small" data-fl="' + k + '">PICK</button></div>').join('') + '</div>';
    }
    h += '<p class="sub small">You have ' + fmt(s.money) + '.</p><div class="btnrow"><button class="btn alt" data-a="close">DONE</button></div>';
    UI().panel(h, (root) => {
      const on = (sel, fn) => root.querySelectorAll(sel).forEach((b) => b.addEventListener('click', () => fn(b)));
      on('[data-t]', (b) => H.decorMenu(b.dataset.t)); on('[data-a=close]', () => UI().close());
      on('[data-f]', (b) => { if (H.place(b.dataset.f)) UI().close(); else H.decorMenu(); });
      on('[data-a=rm]', () => { H.removeNearest(); H.decorMenu(); });
      on('[data-w]', (b) => { H.setWall(b.dataset.w); H.decorMenu('walls'); }); on('[data-fl]', (b) => { H.setFloor(b.dataset.fl); H.decorMenu('walls'); });
    });
  };
  function pay(n) { const s = S(); if (s.money < n) { UI().toast('Not enough money (' + fmt(n) + ').', true); return false; } s.money -= n; return true; }
  H.place = function (k) {
    const F = GR.Foot, p = F.inside; if (!p || p.friend || !H.FURN[k]) return false; const h0 = H.decor(p.baseId), b = G().inside;
    if (h0.items.length >= MAXITEMS) { UI().toast('Your home is full! Remove something first.', true); return false; }
    let x = F.x + Math.sin(F.yaw) * 1.2, z = F.z + Math.cos(F.yaw) * 1.2; x = U.clamp(x, -b.W / 2 + 0.8, b.W / 2 - 0.8); z = U.clamp(z, -b.D / 2 + 0.8, b.D / 2 - 2.2);
    if (Math.abs(x) < 1.6 && z > b.D / 2 - 3) { UI().toast('Keep the front door clear!', true); return false; }
    if (!pay(H.FURN[k].price)) return false;
    h0.items.push({ k, x: +x.toFixed(2), z: +z.toFixed(2), r: +(F.yaw + PI).toFixed(2) }); G().persist(); GR.Snd.fx('buy'); UI().toast(H.FURN[k].icon + ' ' + H.FURN[k].name + ' placed!'); H.rebuild(); GR.Net.sendNow && GR.Net.sendNow(true); return true;
  };
  H.removeNearest = function () {
    const F = GR.Foot, p = F.inside; if (!p) return; const h0 = H.decor(p.baseId); let bi = -1, bd = 3.5;
    h0.items.forEach((it, i) => { const d = Math.hypot(it.x - F.x, it.z - F.z); if (d < bd) { bd = d; bi = i; } });
    if (bi < 0) { UI().toast('Stand next to an item you placed to remove it.', true); return; }
    const it = h0.items.splice(bi, 1)[0]; G().earn(Math.round(H.FURN[it.k].price / 2)); G().persist(); H.rebuild(); GR.Net.sendNow && GR.Net.sendNow(true);
  };
  H.setWall = function (c) { const p = GR.Foot.inside; if (!p) return; const h0 = H.decor(p.baseId); if (h0.wall === c) return; if (!pay(50)) return; h0.wall = c; G().persist(); GR.Snd.fx('buy'); H.rebuild(); GR.Net.sendNow && GR.Net.sendNow(true); };
  H.setFloor = function (f) { const p = GR.Foot.inside; if (!p) return; const h0 = H.decor(p.baseId); if (h0.floor === f) return; if (!pay(100)) return; h0.floor = f; G().persist(); GR.Snd.fx('buy'); H.rebuild(); GR.Net.sendNow && GR.Net.sendNow(true); };
  // ---------- spawn / fast travel ----------
  H.spawnOnLoad = function () {
    const g = G(), id = H.main(); if (!id || g.room) return false; const p = GR.PL.byId[id]; if (!p || !p.homeSpot) return false;
    if (GR.VEH[g.me.type].kind !== 'ground') return false;
    const s = g.save; if (s.foot && !(s.foot.inside && String(s.foot.inside).indexOf(id + '@') === 0)) s.foot = null;
    __place(p); return true;
  };
  function __place(p) { const g = G(); if (GR.Traffic.clearNear) GR.Traffic.clearNear(p.drive.x, p.drive.z, 10); g.me.place(p.drive.x, p.drive.z, p.yaw); g.camSnap = true; }
  H.goHome = function () {
    const g = G(), id = H.main(); if (!id) return; const p = GR.PL.byId[id]; if (GR.Race.cur || GR.Jobs.cur) return; GR.Foot.forceBack();
    if (g.me.kind !== 'ground') { UI().toast('Park your ' + g.me.V.name + ' at a garage first, then fast travel home.', true); return; }
    $('fade').classList.add('on'); setTimeout(() => { __place(p); $('fade').classList.remove('on'); UI().toast('🏠 Home sweet home!'); }, 320);
  };
  // ---------- co-op: tell friends which home you own + how it's decorated + which rides are in your garage ----------
  H.netInfo = function () { const id = H.main(); if (!id) return 0; const h0 = H.decor(id), s = S(); return { id, d: { wall: h0.wall, floor: h0.floor, items: h0.items.slice(0, MAXITEMS) }, rv: Object.keys(s.owned).filter((k) => GR.VEH[k].kind === 'ground' && k !== G().me.type).slice(0, 3).map((k) => ({ t: k, c: s.owned[k].color })) }; };
  const COL = (c, d) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : d);
  H.netIn = function (h) {
    if (!h || typeof h !== 'object' || !H.LIST.some((q) => q.id === h.id)) return null; const d = h.d || {};
    const items = (Array.isArray(d.items) ? d.items : []).slice(0, MAXITEMS).filter((it) => it && H.FURN[it.k] && isFinite(it.x) && isFinite(it.z)).map((it) => ({ k: it.k, x: U.clamp(+it.x, -10.5, 10.5), z: U.clamp(+it.z, -7.5, 7.5), r: isFinite(it.r) ? +it.r : 0 }));
    const rv = (Array.isArray(h.rv) ? h.rv : []).slice(0, 3).filter((r) => r && GR.VEH[r.t]).map((r) => ({ t: r.t, c: COL(r.c, null) }));
    return { id: h.id, d: { wall: COL(d.wall, H.WALLS[0]), floor: H.FLOORS[d.floor] ? d.floor : 'wood', items }, rv };
  };
  // minimap: your home is always drawn (pink 🏠), homes for sale as 🏷️
})();
