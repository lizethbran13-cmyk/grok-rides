// GROK RIDES — generated interiors: every building with a door has a real inside (shops, cafes, homes, offices, landmarks)
(function () {
  'use strict';
  const GR = window.GR, T = THREE, U = GR.U, M = GR.M, IN = GR.IN, PI = Math.PI, esc = U.esc;
  const K = IN.kit, who = K.who, snackStation = K.snackStation, hatStation = K.hatStation;
  const UI = () => GR.UI, G = () => GR.G;
  Object.assign(GR.SNACKS, {
    latte: { icon: '☕', name: 'Rocket Latte', price: 6, buff: 'nitro', secs: 150, desc: 'Nitro recharges 2× faster' },
    croissant: { icon: '🥐', name: 'Butter Croissant', price: 6, buff: 'grip', secs: 150, desc: '+8% grip' },
    cupcake: { icon: '🧁', name: 'Rainbow Cupcake', price: 5, buff: 'speed', secs: 120, desc: '+5% top speed' },
    cone: { icon: '🍦', name: 'Triple Scoop', price: 7, buff: 'nitro', secs: 180, desc: 'Nitro recharges 2× faster' },
    sundae: { icon: '🍨', name: 'Turbo Sundae', price: 9, buff: 'speed', secs: 180, desc: '+5% top speed' },
    sushi: { icon: '🍣', name: 'Sushi Roll', price: 10, buff: 'speed', secs: 180, desc: '+5% top speed' },
    noodles: { icon: '🍜', name: 'Ramen Bowl', price: 9, buff: 'grip', secs: 180, desc: '+8% grip' },
    cookie: { icon: '🍪', name: 'Grandma\u2019s Cookies', price: 0, buff: 'grip', secs: 120, desc: '+8% grip (free!)' },
    fish: { icon: '🐟', name: 'Grilled Fish', price: 6, buff: 'snow', secs: 180, desc: 'Better grip on snow & ice' },
    tea: { icon: '🍵', name: 'Warm Tea', price: 3, buff: 'snow', secs: 120, desc: 'Better grip on snow & ice' }
  });
  const R = (w, d, h) => [w, d, h];
  Object.assign(IN.ROOMV, {
    cafe: R(18, 14, 4.8), bakery: R(18, 14, 4.8), icecream: R(18, 14, 4.8), sushi: R(18, 14, 4.8),
    books: R(18, 14, 5), toys: R(18, 14, 5), flowers: R(16, 12, 4.6), games: R(20, 14, 5), pets: R(18, 14, 4.8), shoes: R(16, 12, 4.6), salon: R(16, 12, 4.6),
    bank: R(22, 16, 6.5), pharmacy: R(16, 12, 4.6), music: R(18, 14, 5), phones: R(16, 12, 4.6), art: R(18, 14, 5.5),
    apartments: R(20, 15, 5.2), office: R(22, 16, 5.2), home: R(16, 12, 4.3), cabin: R(14, 11, 4.2), igloo: R(12, 12, 4.2),
    hangar: R(30, 22, 10), tower: R(14, 12, 5), observatory: R(18, 18, 7.5), lighthouse: R(12, 12, 6)
  });

  // ---------- fun actions ----------
  const now = () => Date.now();
  IN.treat = function (p, key, amt, msg, secs) {
    const g = G(), s = g.save, k = p.id + ':' + key; s.cd = s.cd || {};
    if ((s.cd[k] || 0) > now()) { const m = Math.ceil((s.cd[k] - now()) / 60000); UI().toast('⏳ Come back in ' + m + ' min!', true); return false; }
    for (const q in s.cd) if (s.cd[q] < now()) delete s.cd[q];
    s.cd[k] = now() + (secs || 180) * 1000; s.money += amt; GR.Snd.fx('coin'); UI().toast(msg + (amt ? ' +' + U.fmtMoney(amt) : '')); g.persist(); return true;
  };
  IN.STICKERS = {
    book: { icon: '📖', name: 'Story Book', price: 12 }, teddy: { icon: '🧸', name: 'Teddy Bear', price: 18 }, robot: { icon: '🤖', name: 'Toy Robot', price: 22 }, rocket: { icon: '🚀', name: 'Toy Rocket', price: 20 },
    bouquet: { icon: '💐', name: 'Bouquet', price: 10 }, sunflower: { icon: '🌻', name: 'Sunflower', price: 6 }, guitar: { icon: '🎸', name: 'Mini Guitar', price: 25 }, drum: { icon: '🥁', name: 'Drum', price: 18 },
    phonecase: { icon: '📱', name: 'Sparkle Phone Case', price: 15 }, painting: { icon: '🖼️', name: 'Painting', price: 30 }, palette: { icon: '🎨', name: 'Paint Set', price: 12 }, bow: { icon: '🎀', name: 'Hair Bow', price: 8 },
    medal: { icon: '🏅', name: 'Arcade Medal', price: 0 }, plane: { icon: '✈️', name: 'Model Plane', price: 20 }, star: { icon: '🌟', name: 'Star Chart', price: 15 }, shell: { icon: '🐚', name: 'Sea Shell', price: 5 }
  };
  IN.shopMenu = function (title, keys, extra) {
    const g = G(), s = g.save; s.stickers = s.stickers || {}; UI().dismissable = true;
    const render = () => {
      let h = '<h2>' + esc(title) + '</h2><p class="sub">Collect them all! Your sticker book: ' + Object.keys(s.stickers).length + ' / ' + Object.keys(IN.STICKERS).length + '</p><div class="list">';
      (extra || []).forEach((e, i) => { h += '<div class="row"><span class="ico">' + e.icon + '</span><span class="grow"><b>' + esc(e.name) + '</b><br><small>' + esc(e.desc) + '</small></span><button class="btn primary small" data-x="' + i + '" ' + (e.owned && e.owned() ? 'disabled' : s.money < e.price ? 'disabled' : '') + '>' + (e.owned && e.owned() ? 'OWNED' : U.fmtMoney(e.price)) + '</button></div>'; });
      keys.forEach((k) => { const it = IN.STICKERS[k], own = s.stickers[k]; h += '<div class="row"><span class="ico">' + it.icon + '</span><span class="grow"><b>' + esc(it.name) + '</b><br><small>' + (own ? 'In your sticker book ✓' : 'Sticker for your collection') + '</small></span><button class="btn primary small" data-k="' + k + '" ' + (own || s.money < it.price ? 'disabled' : '') + '>' + (own ? 'GOT IT' : U.fmtMoney(it.price)) + '</button></div>'; });
      h += '</div><div class="btnrow"><button class="btn alt" data-a="close">DONE</button></div>';
      UI().panel(h, (root) => {
        root.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => { const it = IN.STICKERS[b.dataset.k]; if (s.money < it.price) return; s.money -= it.price; s.stickers[b.dataset.k] = 1; GR.Snd.fx('buy'); UI().toast(it.icon + ' ' + it.name + ' added to your sticker book!'); g.persist(); render(); }));
        root.querySelectorAll('[data-x]').forEach((b) => b.addEventListener('click', () => { const e = extra[+b.dataset.x]; if (s.money < e.price) return; s.money -= e.price; e.buy(); GR.Snd.fx('buy'); g.persist(); render(); }));
        root.querySelector('[data-a=close]').addEventListener('click', () => UI().close());
      });
    };
    render();
  };
  const gift = (k) => { const s = G().save; s.stickers = s.stickers || {}; if (s.stickers[k]) return false; s.stickers[k] = 1; G().persist(); return true; };
  IN.claw = function (b) {
    const g = G(), s = g.save; if (s.money < 5) { UI().toast('The claw machine costs $5.', true); return; }
    s.money -= 5; GR.Snd.fx('ui'); const r = Math.random(), opts = ['teddy', 'robot', 'rocket', 'bow'].filter((k) => !(s.stickers || {})[k]);
    setTimeout(() => { if (r < 0.45 && opts.length) { const k = opts[(Math.random() * opts.length) | 0]; gift(k); GR.Snd.fx('jingle'); UI().toast('🕹️ GOT ONE! ' + IN.STICKERS[k].icon + ' ' + IN.STICKERS[k].name + '!'); IN.cheer(b); } else if (r < 0.7) { s.money += 8; UI().toast('🕹️ Almost! You won $8 in tickets.'); } else UI().toast('🕹️ So close! Try again?'); g.persist(); }, 600);
  };
  IN.arcade = function (b, p) {
    const sc = (2000 + Math.random() * 98000) | 0, s = G().save; s.hiScore = Math.max(s.hiScore || 0, sc); GR.Snd.fx('nitro');
    if (sc > 70000) { if (gift('medal')) UI().toast('🏅 NEW HIGH SCORE ' + sc + '! Arcade Medal sticker!'); else IN.treat(p, 'arcade', 25, '🏆 HIGH SCORE ' + sc + '!', 120); IN.party(b, '🎉 High score party!'); }
    else UI().toast('🕹️ Score: ' + sc.toLocaleString() + ' (best ' + s.hiScore.toLocaleString() + ')');
  };
  IN.nap = function () { const dn = GR.DN; if (!dn) return; const night = dn.isNight(); dn.setTime(night ? 0.3 : 0.84); UI().toast(night ? '🌅 Good morning! You feel rested.' : '🌙 Zzz… you napped until the evening.'); GR.Snd.fx('jingle'); };
  IN.telescope = function () { GR.DN && GR.DN.setTime(0.97); const f = GR.Fun; UI().toast('🔭 Wow, look at the stars! ' + (f ? '🌟 You found ' + f.starCount() + ' / ' + f.starTotal() + ' Grok Stars.' : '')); f && f.gpsStar && f.gpsStar(true); };
  IN.starMap = function (cost) { const f = GR.Fun; if (!f) return; const s = G().save; if (cost && s.money < cost) { UI().toast('Treasure maps cost $' + cost + '.', true); return; } if (f.gpsStar()) { if (cost) { s.money -= cost; G().persist(); } } };
  IN.firstAid = function () { const g = G(), s = g.save; if (g.me.dmg < 2) { UI().toast('🚗 Your ride is already fine!'); return; } if (s.money < 30) { UI().toast('A repair kit costs $30.', true); return; } s.money -= 30; g.me.dmg = Math.max(0, g.me.dmg - 40); s.owned[g.me.type] && (s.owned[g.me.type].dmg = g.me.dmg); GR.Snd.fx('buy'); UI().toast('🩹 Repair kit sent! Your ride is 40% fixed.'); g.persist(); };
  IN.interest = function (p) { const s = G().save, amt = Math.max(5, Math.min(60, Math.round(s.money * 0.03))); IN.treat(p, 'bank', amt, '🏦 Your savings earned interest!', 300); };
  IN.paintShop = function () { UI()._gtab = 'paint'; UI().garage({ name: 'Art Studio Paint Bar', noCars: true }); };
  IN.tune = function (p) { const g = G(); if (g.me.dmg < 2) { UI().toast('🔧 Mechanic Max: Your ride is purr-fect already!'); return; } if (IN.treat(p, 'tune', 0, '🔧 Free tune-up! Damage −25%.', 240)) { g.me.dmg = Math.max(0, g.me.dmg - 25); g.save.owned[g.me.type] && (g.save.owned[g.me.type].dmg = g.me.dmg); } };
  const JOKES = ['Why did the car go to school? To get a little smarter-ter-ter! 🚗', 'What do you call a sleeping dinosaur? A dino-snore! 🦖', 'Why are fish so smart? They live in schools! 🐟', 'What does a cloud wear under its raincoat? Thunderwear! ⛈️', 'Why did the cookie go to the doctor? It felt crummy! 🍪', 'What has four wheels and flies? A garbage truck! 🚛', 'Why can\u2019t a bike stand on its own? It\u2019s two-tired! 🚲'];
  IN.joke = () => { UI().toast('📖 ' + JOKES[(Math.random() * JOKES.length) | 0]); GR.Snd.fx('ui'); };
  const TV = ['📺 Cartoon time! Super Turbo Pup saves the day!', '📺 The weather lady says: sunny with a chance of nitro.', '📺 Breaking news: a balloon was spotted over Mount Grokmore!', '📺 Cooking show: how to make a Turbo Burger!'];
  IN.tv = (b) => { UI().toast(TV[(Math.random() * TV.length) | 0]); b.npcs.forEach((n) => { n.waveT = 1.5; }); };
  IN.petMenu = function () {
    const s = G().save, PETS = [{ k: 'dog', icon: '🐶', name: 'Puppy Buddy', price: 80 }, { k: 'cat', icon: '🐱', name: 'Kitty Buddy', price: 80 }, { k: 'bunny', icon: '🐰', name: 'Bunny Buddy', price: 60 }];
    IN.shopMenu('🐾 Adopt a Buddy', [], PETS.map((q) => ({ icon: q.icon, name: q.name, price: q.price, desc: 'Follows you around when you walk!', owned: () => s.pet === q.k, buy: () => { s.pet = q.k; GR.Fun && GR.Fun.petChanged(); UI().toast(q.icon + ' ' + q.name + ' will follow you when you walk!'); } })));
  };
  IN.sneakers = function () {
    const s = G().save; IN.shopMenu('👟 Sneaker Shop', ['bow'], [{ icon: '👟', name: 'Speedy Sneakers', price: 60, desc: 'Run 35% faster on foot', owned: () => !!s.sneakers, buy: () => { s.sneakers = 1; UI().toast('👟 Zoom! You run faster now.'); } }, { icon: '🥾', name: 'Snow Boots', price: 40, desc: 'Cozy! (free ❄️ grip snack every visit to the tundra)', owned: () => !!s.boots, buy: () => { s.boots = 1; UI().toast('🥾 Snow boots on!'); } }]);
  };

  // ---------- decoration helpers ----------
  // ---------- shared 3D decor kit (every generated room) ----------
  const artCache = {};
  function artTex(seed) { // a crisp little painted landscape for the picture frames
    if (artCache[seed]) return artCache[seed]; const c = document.createElement('canvas'); c.width = 256; c.height = 192; const x = c.getContext('2d'), r = U.rng(seed);
    const skies = [['#7dd3fc', '#e0f2fe'], ['#fda4af', '#fef3c7'], ['#a78bfa', '#fbcfe8'], ['#38bdf8', '#bae6fd']], sk = skies[seed % 4]; const g = x.createLinearGradient(0, 0, 0, 120); g.addColorStop(0, sk[0]); g.addColorStop(1, sk[1]); x.fillStyle = g; x.fillRect(0, 0, 256, 192);
    x.fillStyle = '#fde047'; x.beginPath(); x.arc(60 + r() * 140, 40 + r() * 20, 18, 0, 7); x.fill();
    ['#86efac', '#4ade80', '#16a34a'].forEach((col, i) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, 192); for (let X = 0; X <= 256; X += 16) x.lineTo(X, 100 + i * 28 + Math.sin(X * 0.03 + r() * 0.4 + i * 2 + seed) * 18); x.lineTo(256, 192); x.fill(); });
    if (seed % 3 === 0) { x.fillStyle = '#ffffff'; for (let i = 0; i < 3; i++) { const cx = 30 + r() * 200, cy = 25 + r() * 30; x.beginPath(); x.arc(cx, cy, 10, 0, 7); x.arc(cx + 12, cy - 4, 12, 0, 7); x.arc(cx + 24, cy, 9, 0, 7); x.fill(); } }
    else { x.fillStyle = '#ef4444'; x.fillRect(150, 120, 30, 22); x.fillStyle = '#7c2d12'; x.beginPath(); x.moveTo(146, 122); x.lineTo(165, 104); x.lineTo(184, 122); x.fill(); }
    const t = new T.CanvasTexture(c); t.anisotropy = 4; artCache[seed] = t; return t;
  }
  let skyTexC = null;
  function skyTex() { if (skyTexC) return skyTexC; const c = document.createElement('canvas'); c.width = 8; c.height = 128; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#93c5fd'); g.addColorStop(0.7, '#e0f2fe'); g.addColorStop(1, '#bbf7d0'); x.fillStyle = g; x.fillRect(0, 0, 8, 128); return (skyTexC = new T.CanvasTexture(c)); }
  // a group sitting on a wall, local +z = into the room, x = along the wall
  function onWall(b, side, along, y) { const g = new T.Group(); if (side === 'n') g.position.set(along, y, -b.D / 2); else if (side === 's') { g.position.set(along, y, b.D / 2); g.rotation.y = PI; } else if (side === 'e') { g.position.set(b.W / 2, y, along); g.rotation.y = -PI / 2; } else { g.position.set(-b.W / 2, y, along); g.rotation.y = PI / 2; } b.scene.add(g); return g; }
  const rb = (b, g, w, h, d, r, col, x, y, z) => { const m = new T.Mesh(M.rbox(w, h, d, r), typeof col === 'string' ? b.mat(col) : col); m.position.set(x, y, z); g.add(m); return m; };
  const bx = (b, g, w, h, d, col, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), typeof col === 'string' ? b.mat(col) : col); m.position.set(x, y, z); g.add(m); return m; };
  function picture(b, side, along, y, w, h, seed, frameCol) { const g = onWall(b, side, along, y); rb(b, g, w + 0.24, h + 0.24, 0.1, 0.04, frameCol || '#a16207', 0, 0, 0.06); bx(b, g, w + 0.04, h + 0.04, 0.02, '#fffbeb', 0, 0, 0.115); const pm = new T.Mesh(new T.PlaneGeometry(w - 0.12, h - 0.12), new T.MeshLambertMaterial({ map: artTex(seed) })); pm.position.z = 0.13; g.add(pm); }
  function window3(b, side, along, y, w, h, curtain) { // deep framed window: glass set back, muntins, sill, rod + soft curtains
    const g = onWall(b, side, along, y), sky = new T.MeshBasicMaterial({ map: skyTex() });
    const gl = new T.Mesh(new T.PlaneGeometry(w, h), sky); gl.position.z = 0.02; g.add(gl);
    bx(b, g, w + 0.36, 0.18, 0.2, '#ffffff', 0, h / 2 + 0.09, 0.1); bx(b, g, 0.18, h, 0.2, '#ffffff', -w / 2 - 0.09, 0, 0.1); bx(b, g, 0.18, h, 0.2, '#ffffff', w / 2 + 0.09, 0, 0.1);
    bx(b, g, w + 0.6, 0.1, 0.36, '#f8fafc', 0, -h / 2 - 0.05, 0.18); bx(b, g, 0.06, h, 0.06, '#ffffff', 0, 0, 0.05); bx(b, g, w, 0.06, 0.06, '#ffffff', 0, 0, 0.05);
    const rod = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, w + 1.2, 8), b.mat('#78716c')); rod.rotation.z = PI / 2; rod.position.set(0, h / 2 + 0.3, 0.3); g.add(rod);
    [-1, 1].forEach((sd) => { for (let k = 0; k < 3; k++) rb(b, g, 0.16, h + 0.55, 0.12, 0.06, curtain, sd * (w / 2 + 0.12 + k * 0.13), -0.05, 0.3 + (k % 2) * 0.06); });
    bx(b, g, 0.3, 0.22, 0.2, '#b45309', w / 2 - 0.3, -h / 2 + 0.11, 0.2); const lf = new T.Mesh(new T.IcosahedronGeometry(0.17, 1), b.mat('#22c55e')); lf.position.set(w / 2 - 0.3, -h / 2 + 0.35, 0.2); g.add(lf);
  }
  function wallShelf(b, side, along, y, w) { const g = onWall(b, side, along, y); bx(b, g, w, 0.06, 0.32, '#a16207', 0, 0, 0.16); [-w / 2 + 0.2, w / 2 - 0.2].forEach((x) => bx(b, g, 0.04, 0.18, 0.28, '#78716c', x, -0.12, 0.14));
    const cols = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7']; let x = -w / 2 + 0.15; for (let i = 0; i < 6 && x < w / 2 - 0.5; i++) { const hh = 0.26 + (i % 3) * 0.05, tw = 0.07 + (i % 2) * 0.03; bx(b, g, tw, hh, 0.22, cols[i % cols.length], x, 0.03 + hh / 2, 0.15); x += tw + 0.02; }
    const vase = new T.Mesh(new T.CylinderGeometry(0.07, 0.1, 0.24, 12), b.mat('#f472b6')); vase.position.set(w / 2 - 0.35, 0.15, 0.16); g.add(vase); const fl = new T.Mesh(new T.IcosahedronGeometry(0.12, 1), b.mat('#facc15')); fl.position.set(w / 2 - 0.35, 0.36, 0.16); g.add(fl); }
  function pendant(b, x, z, col) { const H = b.H, len = Math.min(1.2, H * 0.22); b.cyl(x, H - len, z, 0.012, len, '#334155', false, 4); const sh = new T.Mesh(new T.CylinderGeometry(0.12, 0.42, 0.34, 18, 1, true), new T.MeshLambertMaterial({ color: col, side: T.DoubleSide })); sh.position.set(x, H - len - 0.12, z); b.scene.add(sh); b.ball(x, H - len - 0.24, z, 0.1, '#fff7d6', true); }
  function floorLamp(b, x, z) { b.cyl(x, 0, z, 0.22, 0.04, '#334155', false, 14); b.cyl(x, 0.04, z, 0.025, 1.55, '#334155', false, 6); const sh = new T.Mesh(new T.CylinderGeometry(0.2, 0.32, 0.36, 16, 1, true), b.mat('#fef3c7', true)); sh.position.set(x, 1.7, z); b.scene.add(sh); b.solids.push({ x0: x - 0.25, z0: z - 0.25, x1: x + 0.25, z1: z + 0.25 }); }
  function corners(b, c) { const x = b.W / 2 - 1, z = b.D / 2 - 1.2; [[-x, -z], [x, -z]].forEach((q) => b.plant(q[0], q[1], c || 1)); }
  function frames(b, side, n) { for (let i = 0; i < n; i++) picture(b, side, (i - (n - 1) / 2) * 2.4, 2.6, 1.4, 0.95, (i * 5 + n) % 12, ['#a16207', '#1f2937', '#ffffff'][i % 3]); }
  function cafeTables(b, list, col) { list.forEach((t) => { b.table(t[0], t[1], '#fef3c7'); b.chair(t[0] - 0.9, t[1], col, PI / 2); b.chair(t[0] + 0.9, t[1], col, -PI / 2); }); }
  function displayCase(b, x, z, w, items, col) { b.box(x, 0, z, w, 0.9, 0.9, col || '#f1f5f9', true); const gl = b.box(x, 0.9, z, w, 0.5, 0.9, '#bfe8ff'); gl.material = new T.MeshLambertMaterial({ color: '#dff4ff', transparent: true, opacity: 0.5 }); items.forEach((c, i) => b.ball(x - w / 2 + 0.4 + i * (w - 0.8) / Math.max(1, items.length - 1), 1.05, z, 0.16, c)); }
  function bed(b, x, z, c) { // rounded mattress, padded headboard, pillows, folded blanket, nightstand + lamp
    const R = (w, h, d, r, col, px, py, pz, ry) => { const m = new T.Mesh(M.rbox(w, h, d, r), b.mat(col)); m.position.set(px, py + h / 2, pz); if (ry) m.rotation.y = ry; b.scene.add(m); return m; };
    R(2.1, 0.32, 2.7, 0.08, '#8b5a2b', x, 0.12, z); [[-0.95, -1.25], [0.95, -1.25], [-0.95, 1.25], [0.95, 1.25]].forEach((q) => b.cyl(x + q[0], 0, z + q[1], 0.06, 0.14, '#6b4423', false, 8));
    R(1.95, 0.3, 2.5, 0.14, '#f8fafc', x, 0.44, z + 0.05); R(2.0, 0.12, 1.7, 0.06, c, x, 0.72, z + 0.42); R(2.04, 0.1, 0.35, 0.05, '#ffffff', x, 0.74, z - 0.38);
    R(0.78, 0.2, 0.46, 0.1, '#ffffff', x - 0.48, 0.74, z - 0.95); R(0.78, 0.2, 0.46, 0.1, '#fef3c7', x + 0.48, 0.74, z - 0.95);
    R(2.3, 1.35, 0.22, 0.1, '#a16207', x, 0, z - 1.42); R(2.0, 0.85, 0.12, 0.12, c, x, 0.35, z - 1.3);
    b.solids.push({ x0: x - 1.05, z0: z - 1.5, x1: x + 1.05, z1: z + 1.35 });
    const nx = x + (x > 0 ? -1.55 : 1.55); R(0.6, 0.6, 0.5, 0.05, '#a16207', nx, 0, z - 1.2); b.box(nx - 0.2, 0.3, z - 0.94, 0.14, 0.04, 0.02, '#fbbf24'); b.cyl(nx, 0.6, z - 1.2, 0.1, 0.25, '#e5e7eb', false, 10); const sh = new T.Mesh(new T.CylinderGeometry(0.12, 0.22, 0.25, 14, 1, true), b.mat('#fde68a', true)); sh.position.set(nx, 0.98, z - 1.2); b.scene.add(sh);
  }
  function kitchen(b, x, z0, len, acc) { // along the west wall: base cabinets + doors/handles, worktop, sink + tap, hob, upper cabinets, fridge
    const g = new T.Group(); g.position.set(x, 0, z0); b.scene.add(g); const n = Math.round(len / 0.75), cw = len / n;
    for (let i = 0; i < n; i++) { const zz = i * cw + cw / 2; rb(b, g, 0.85, 0.82, cw - 0.04, 0.03, '#f8fafc', 0.02, 0.5, zz); bx(b, g, 0.03, 0.03, 0.22, '#94a3b8', 0.46, 0.75, zz); rb(b, g, 0.4, 0.62, cw - 0.06, 0.03, '#f1f5f9', 0, 2.05, zz); bx(b, g, 0.03, 0.18, 0.03, '#94a3b8', 0.21, 1.85, zz + cw * 0.3); }
    bx(b, g, 0.08, 0.1, len, '#334155', 0.0, 0.05, len / 2); rb(b, g, 0.95, 0.06, len + 0.05, 0.02, acc, 0.06, 0.94, len / 2);
    bx(b, g, 0.45, 0.04, 0.6, '#cbd5e1', 0.08, 0.975, cw * 1.5); const tap = new T.Mesh(new T.TorusGeometry(0.12, 0.02, 6, 12, PI), b.mat('#cbd5e1')); tap.rotation.y = PI / 2; tap.position.set(-0.22, 1.02, cw * 1.5); g.add(tap);
    bx(b, g, 0.55, 0.03, 0.6, '#111827', 0.06, 0.975, len - cw * 1.5); [[-0.12, -0.14], [0.14, -0.14], [-0.12, 0.14], [0.14, 0.14]].forEach((q) => { const r = new T.Mesh(new T.TorusGeometry(0.08, 0.012, 4, 14), b.mat('#ef4444', true)); r.rotation.x = PI / 2; r.position.set(0.06 + q[0], 0.995, len - cw * 1.5 + q[1]); g.add(r); });
    rb(b, g, 0.85, 2.1, 0.9, 0.08, '#e2e8f0', 0.02, 1.05, -0.55); bx(b, g, 0.04, 0.5, 0.04, '#94a3b8', 0.46, 1.5, -0.25); bx(b, g, 0.04, 0.3, 0.04, '#94a3b8', 0.46, 0.7, -0.25); bx(b, g, 0.02, 0.02, 0.86, '#94a3b8', 0.45, 1.15, -0.55);
    b.solids.push({ x0: x - 0.45, z0: z0 - 1.0, x1: x + 0.5, z1: z0 + len });
  }
  function tvSet(b, x, z) { // low media cabinet with doors + a TV with a real bezel and stand
    const R = (w, h, d, r, col, px, py, pz) => { const m = new T.Mesh(M.rbox(w, h, d, r), b.mat(col)); m.position.set(px, py + h / 2, pz); b.scene.add(m); return m; };
    R(2.8, 0.6, 0.6, 0.06, '#6b4423', x, 0, z); b.solids.push({ x0: x - 1.4, z0: z - 0.3, x1: x + 1.4, z1: z + 0.3 }); [-0.7, 0.7].forEach((o) => { R(1.25, 0.46, 0.04, 0.03, '#7c5532', x + o, 0.07, z + 0.31); b.box(x + o + (o > 0 ? -0.5 : 0.5), 0.3, z + 0.34, 0.04, 0.12, 0.03, '#d4a72c'); });
    R(0.5, 0.05, 0.3, 0.02, '#1f2937', x, 0.6, z); b.box(x, 0.65, z, 0.08, 0.25, 0.08, '#1f2937'); R(2.2, 1.3, 0.12, 0.06, '#111827', x, 0.88, z);
    const sc = b.box(x, 0.95, z + 0.065, 2.0, 1.15, 0.02, '#60a5fa', false, true); b.anims.push((t) => sc.material.color.setHSL((t * 0.07) % 1, 0.6, 0.6));
    b.plant(x + 1.9, z + 0.1, 0.8);
  }
  function desk(b, x, z, c) { b.box(x, 0, z, 1.8, 0.75, 0.9, c || '#e5e7eb', true); b.box(x, 0.75, z - 0.2, 0.8, 0.5, 0.05, '#1f2937'); b.box(x, 0.77, z - 0.18, 0.72, 0.42, 0.02, '#38bdf8', false, true); b.chair(x, z + 0.9, '#334155'); }
  function rack(b, x, z, w, cols) { b.box(x, 1.7, z, w, 0.05, 0.05, '#94a3b8'); b.box(x - w / 2, 0, z, 0.06, 1.75, 0.06, '#94a3b8'); b.box(x + w / 2, 0, z, 0.06, 1.75, 0.06, '#94a3b8'); for (let i = 0; i < Math.floor(w / 0.35); i++) b.box(x - w / 2 + 0.25 + i * 0.35, 0.7, z, 0.3, 0.95, 0.5, cols[i % cols.length]); b.solids.push({ x0: x - w / 2, z0: z - 0.3, x1: x + w / 2, z1: z + 0.3 }); }
  function piano(b, x, z) { b.box(x, 0, z, 2.2, 1.0, 0.9, '#111827', true); b.box(x, 1.0, z + 0.2, 2.0, 0.04, 0.4, '#f8fafc'); b.box(x, 1.0, z - 0.3, 2.2, 0.8, 0.3, '#111827'); }
  function fishTank(b, x, z) { b.box(x, 0, z, 2.4, 0.7, 0.8, '#334155', true); const t = b.box(x, 0.7, z, 2.4, 1.1, 0.8, '#7dd3fc'); t.material = new T.MeshLambertMaterial({ color: '#67e8f9', transparent: true, opacity: 0.55 }); ['#f97316', '#facc15', '#ec4899'].forEach((c, i) => { const f = b.ball(x, 1.2, z, 0.12, c); f.scale.x = 1.7; b.anims.push((tt) => { f.position.x = x + Math.sin(tt * (0.6 + i * 0.3) + i * 2) * 0.9; f.position.y = 1.0 + i * 0.22 + Math.sin(tt * 2 + i) * 0.05; f.rotation.y = Math.cos(tt * (0.6 + i * 0.3) + i * 2) > 0 ? 0 : PI; }); }); }
  function petBed(b, x, z, c, body) { b.cyl(x, 0, z, 0.7, 0.2, c, true, 16); const d = b.ball(x, 0.4, z, 0.32, body); d.scale.set(1.3, 0.8, 1); const h = b.ball(x + 0.35, 0.62, z, 0.2, body); b.anims.push((t) => { h.position.y = 0.62 + Math.abs(Math.sin(t * 3 + x)) * 0.05; d.scale.y = 0.8 + Math.sin(t * 2 + z) * 0.03; }); }
  function plantShelf(b, x, z, w) { b.box(x, 0, z, w, 0.9, 0.8, '#a16207', true); for (let i = 0; i < Math.floor(w / 0.6); i++) { const px = x - w / 2 + 0.35 + i * 0.6; b.cyl(px, 0.9, z, 0.18, 0.28, '#c2410c', false, 8); b.ball(px, 1.35, z, 0.25, ['#ef4444', '#facc15', '#ec4899', '#f97316', '#a855f7'][i % 5]); b.ball(px, 1.18, z, 0.22, '#16a34a'); } }
  function bigWindowDome(b, c) { const d = new T.Mesh(new T.SphereGeometry(Math.min(b.W, b.D) * 0.48, 24, 12, 0, PI * 2, 0, PI / 2), new T.MeshBasicMaterial({ color: c, side: T.BackSide })); d.position.y = b.H - 0.2; b.scene.add(d); }
  const NAMES = ['Ava', 'Ben', 'Cleo', 'Dev', 'Ella', 'Finn', 'Gigi', 'Hugo', 'Iris', 'Jay', 'Kiki', 'Leo', 'Mia', 'Nico', 'Omar', 'Pia', 'Quinn', 'Rex', 'Suki', 'Toby', 'Uma', 'Vic', 'Wren', 'Zoe'];
  const nm = (p, i) => NAMES[(p.id.length * 7 + (parseInt(p.id.slice(1), 10) || 0) * 3 + i * 5) % NAMES.length];
  const walker = (b, p, i, lines, path) => b.npc(path[0][0], path[0][1], 0, who(nm(p, i), { lines, path }));

  // ---------- the variants ----------
  const GEN = {
    cafe(b, p) {
      b.shell({ floor: 'wood', wall: '#fdf2e9', ceil: '#fff7ed' }); b.counter(-2, -b.D / 2 + 2.2, 8, 1.0, '#e7e5e4', '#92400e');
      const mach = b.box(-4.5, 1.08, -b.D / 2 + 2.1, 0.9, 0.7, 0.6, '#64748b'); void mach; b.ball(-4.5, 2.0, -b.D / 2 + 2.1, 0.12, '#ef4444', true);
      b.sign('☕ LATTE $6\n🧁 CUPCAKE $5\n🍪 COOKIE', 'n', 5, 2.7, 3.6, 1.5, '#3f2a1d', '#fde68a');
      snackStation(b, -2, -b.D / 2 + 3.9, ['latte', 'cupcake', 'coffee'], 'ORDER AT THE COUNTER');
      cafeTables(b, [[-5, 2], [-1.5, 3], [2.5, 2], [5.5, 3.5]], '#92400e'); corners(b);
      b.station(b.W / 2 - 1.8, 0, '📖', 'READ THE JOKE BOOK', IN.joke, '#3ff0ff');
      b.npc(-2, -b.D / 2 + 1.3, 0, who('Barista ' + nm(p, 0), { shirt: '#92400e', lines: ['Our Rocket Latte recharges your nitro!', 'Free Wi-Fi password: VROOMVROOM'] }));
      b.npc(-5.9, 2, PI / 2, who(nm(p, 1), { mode: 'sit', y: 0.05, lines: ['This cupcake has sprinkles AND frosting!'] }));
      walker(b, p, 2, ['I came for the cookies. I stayed for the cookies.'], [[3, -1], [-4, -1]]);
    },
    bakery(b, p) {
      b.shell({ floor: 'check', tile: 2, wall: '#fff7ed', ceil: '#fffbeb' }); displayCase(b, -2, -b.D / 2 + 2.6, 7, ['#d97706', '#fbbf24', '#f472b6', '#a16207', '#fde68a', '#ec4899'], '#fde68a');
      const ov = b.box(5, 0, -b.D / 2 + 1.2, 2.6, 2.2, 1.6, '#b45309', true); void ov; const fire = b.box(5, 0.6, -b.D / 2 + 2.02, 1.4, 0.6, 0.04, '#f97316', false, true); b.anims.push((t) => fire.material.color.setHSL(0.07 + Math.sin(t * 6) * 0.02, 1, 0.55));
      for (let i = 0; i < 4; i++) b.cyl(b.W / 2 - 0.8, 0.9 + i * 0.45, -2 + i * 0.1, 0.25, 0.16, '#d97706', false, 12);
      b.box(b.W / 2 - 0.8, 0, -2, 0.9, 2.4, 2.4, '#e7e5e4', true);
      snackStation(b, -2, -b.D / 2 + 4.3, ['croissant', 'cupcake', 'donut'], 'FRESH BAKED');
      b.station(3, 3.5, '🎂', 'DECORATE A CAKE', () => { IN.treat(p, 'cake', 10, '🎂 Beautiful cake! The baker bought it.', 150); IN.cheer(b); }, '#ec4899');
      cafeTables(b, [[-5, 3], [-1, 3.5]], '#f472b6'); corners(b, 0.8);
      b.npc(-2, -b.D / 2 + 1.4, 0, who('Baker ' + nm(p, 0), { shirt: '#ffffff', hat: 'cap', lines: ['Croissants give your tires extra grip!', 'Fresh out of the oven!'] }));
      b.npc(4, -2, PI, who(nm(p, 1), { lines: ['Mmm, smells like cinnamon!'], path: [[4, -1], [-3, -1]] }));
    },
    icecream(b, p) {
      b.shell({ floor: 'check', tile: 2, wall: '#fdf2f8', ceil: '#fce7f3' }); displayCase(b, -1, -b.D / 2 + 2.4, 8, ['#f9a8d4', '#fde68a', '#a7f3d0', '#c4b5fd', '#fca5a5', '#ffffff', '#7c2d12'], '#f9a8d4');
      const cone = b.ball(5.5, 3.2, -b.D / 2 + 0.6, 0.7, '#f9a8d4', true); b.anims.push((t) => { cone.rotation.y = t; }); b.cyl(5.5, 1.6, -b.D / 2 + 0.6, 0.35, 1.2, '#d97706', false, 8);
      snackStation(b, -1, -b.D / 2 + 4.0, ['cone', 'sundae', 'shake'], 'PICK YOUR SCOOPS');
      b.station(4.5, 3, '🎡', 'SPIN THE FLAVOR WHEEL', () => { const f = ['Bubblegum', 'Mint Chip', 'Rocket Road', 'Rainbow', 'Cookie Dough']; UI().toast('🎡 Today\u2019s free flavor: ' + f[(Math.random() * f.length) | 0] + '!'); IN.treat(p, 'wheel', 5, '🍦 Free sample bonus!', 120); }, '#ec4899');
      cafeTables(b, [[-5, 2.5], [-1.5, 3.5], [1.8, 2]], '#ec4899'); corners(b, 0.9);
      b.npc(-1, -b.D / 2 + 1.3, 0, who('Scoop ' + nm(p, 0), { shirt: '#f472b6', lines: ['Triple scoop = triple happy!', 'The Turbo Sundae makes you a bit faster.'] }));
      b.npc(-5.9, 2.5, PI / 2, who(nm(p, 1), { mode: 'sit', y: 0.05, lines: ['Brain freeze!!'] }));
      walker(b, p, 2, ['Which flavor should I get…'], [[2, 0], [-5, 0]]);
    },
    sushi(b, p) {
      b.shell({ floor: 'wood', wall: '#fef2f2', ceil: '#fff1f2' }); b.counter(0, -b.D / 2 + 2.2, 10, 1.0, '#e7e5e4', '#7f1d1d');
      const belt = []; for (let i = 0; i < 8; i++) { const pl = b.cyl(0, 1.1, -b.D / 2 + 2.2, 0.25, 0.05, ['#ef4444', '#f97316', '#22c55e', '#facc15'][i % 4], false, 14); belt.push(pl); } b.anims.push((t) => belt.forEach((pl, i) => { pl.position.x = ((t * 0.8 + i * 1.25) % 10) - 5; }));
      for (let i = 0; i < 6; i++) { const x = -4 + i * 1.6; b.cyl(x, 0, -b.D / 2 + 3.4, 0.25, 0.7, '#7f1d1d', false, 10); }
      for (let i = 0; i < 3; i++) { const l = b.ball(-5 + i * 5, b.H - 0.9, 1.5, 0.35, '#ef4444', true); l.scale.y = 1.3; }
      snackStation(b, 0, -b.D / 2 + 4.6, ['sushi', 'noodles', 'tea'], 'ORDER SUSHI');
      fishTank(b, b.W / 2 - 1.2, 3); b.station(b.W / 2 - 2.7, 3, '🐟', 'FEED THE FISH', () => { UI().toast('🐟 The fish do a happy wiggle!'); GR.Snd.fx('splash'); }, '#3ff0ff');
      cafeTables(b, [[-5, 3.5], [-1.5, 3.5]], '#7f1d1d');
      b.npc(-2, -b.D / 2 + 1.3, 0, who('Chef ' + nm(p, 0), { shirt: '#ffffff', lines: ['Sushi rolls = a little extra speed!', 'Ramen is good for grip. Trust me.'] }));
      b.npc(1.2, -b.D / 2 + 3.4, PI, who(nm(p, 1), { mode: 'sit', y: 0.05, lines: ['I love the conveyor belt!'] }));
    },
    books(b, p) {
      b.shell({ floor: 'wood', wall: '#eff6ff', rug: 'rug', rugW: 4, rugD: 3, rugZ: 3 });
      [-6, -2, 2, 6].forEach((x) => b.shelf(x, -b.D / 2 + 1, 3, false, ['#1d4ed8', '#b91c1c', '#15803d', '#a16207', '#7c3aed'])); b.shelf(-b.W / 2 + 1, 0, 4, true); b.shelf(-b.W / 2 + 1, 4.2, 3, true);
      b.sofa(2, 4.8, 2.6, '#1d4ed8', PI); b.station(0, 2.5, '📖', 'READ A STORY', IN.joke, '#3ff0ff');
      b.station(b.W / 2 - 2.5, -1, '🗺️', 'TREASURE MAP $10', () => IN.starMap(10), '#facc15');
      b.station(4.5, 1.5, '📚', 'BUY BOOKS', () => IN.shopMenu('📚 Book Nook', ['book', 'star']), '#a855f7'); corners(b);
      b.npc(b.W / 2 - 2, 4, -PI / 2, who('Librarian ' + nm(p, 0), { lines: ['Treasure maps lead to hidden Grok Stars!', 'Shhh… the stars are hiding all over the map.'] }));
      walker(b, p, 1, ['I\u2019m looking for dinosaur books!'], [[-4, 1], [3, 1]]);
    },
    toys(b, p) {
      b.shell({ floor: 'check', tile: 2, wall: '#fdf4ff' });
      b.shelf(-5, -b.D / 2 + 1, 5, false); b.shelf(4, -b.D / 2 + 1, 5, false, ['#f472b6', '#60a5fa', '#facc15']);
      const claw = b.box(-b.W / 2 + 1.5, 0, 2, 1.6, 2.4, 1.6, '#ec4899', true); void claw; const gl = b.box(-b.W / 2 + 1.5, 1.0, 2, 1.4, 1.2, 1.4, '#ffffff'); gl.material = new T.MeshLambertMaterial({ color: '#e0f2fe', transparent: true, opacity: 0.45 }); ['#f59e0b', '#a855f7', '#22c55e', '#ef4444'].forEach((c, i) => b.ball(-b.W / 2 + 1.1 + (i % 2) * 0.8, 1.2, 1.6 + (i >> 1) * 0.8, 0.22, c));
      b.station(-b.W / 2 + 3.2, 2, '🕹️', 'CLAW MACHINE $5', () => IN.claw(b), '#ec4899');
      const train = b.box(0, 0.05, 2, 0.8, 0.5, 0.5, '#ef4444'); b.anims.push((t) => { train.position.set(Math.cos(t * 0.8) * 2.4, 0.05, 2.5 + Math.sin(t * 0.8) * 1.5); train.rotation.y = -t * 0.8; });
      const ted = b.ball(5, 0.5, 3.5, 0.5, '#a16207'); b.ball(5, 1.15, 3.5, 0.35, '#a16207'); void ted;
      b.station(2.5, -1.5, '🧸', 'BUY TOYS', () => IN.shopMenu('🧸 Toy Box', ['teddy', 'robot', 'rocket']), '#a855f7');
      b.npc(5, -2, 0, who('Toymaker ' + nm(p, 0), { lines: ['The claw machine is tricky… but fair!', 'Collect every toy sticker!'] }));
      b.npc(-2, 4, PI, who('Little ' + nm(p, 1), { lines: ['I want the ROCKET!!'], path: [[-2, 4], [3, 4]] }));
    },
    flowers(b, p) {
      b.shell({ floor: 'tile', wall: '#fdf2f8' }); plantShelf(b, -3, -b.D / 2 + 1, 6); plantShelf(b, b.W / 2 - 1, 0, 4); plantShelf(b, -b.W / 2 + 1, 2, 3);
      for (let i = 0; i < 5; i++) b.plant(-5 + i * 2.5, 3.8, 0.8 + (i % 2) * 0.3);
      b.station(0, 1, '💐', 'BUY FLOWERS', () => IN.shopMenu('🌸 Flower Shop', ['bouquet', 'sunflower']), '#ec4899');
      b.station(3.5, -1.5, '🌻', 'WATER THE PLANTS', () => IN.treat(p, 'water', 6, '💧 The plants say thank you!', 150), '#22c55e');
      b.npc(-3, -b.D / 2 + 2.3, 0, who('Florist ' + nm(p, 0), { shirt: '#be185d', lines: ['Sunflowers love sunshine… like you!', 'Every flower is a sticker for your book.'] }));
      walker(b, p, 1, ['These roses smell amazing!'], [[-4, 0], [2, 0]]);
    },
    games(b, p) {
      b.shell({ floor: 'carpet', wall: '#1e1b4b', ceil: '#0f0a2e', windows: false }); b.scene.background = new T.Color('#0f0a2e');
      for (let i = 0; i < 5; i++) { const x = -7 + i * 3.5; b.box(x, 0, -b.D / 2 + 0.8, 1.2, 2.0, 0.9, ['#7c3aed', '#db2777', '#0891b2', '#16a34a', '#ea580c'][i], true); const sc = b.box(x, 1.2, -b.D / 2 + 1.27, 0.9, 0.6, 0.02, '#22d3ee', false, true); b.anims.push((t) => sc.material.color.setHSL((t * 0.3 + i * 0.2) % 1, 0.9, 0.6)); }
      for (let i = 0; i < 6; i++) { const pd = b.box(-3 + (i % 3) * 1.1, 0, 3 + (i >> 1 & 1) * 1.1, 1.0, 0.08, 1.0, '#ec4899', false, true); b.anims.push((t) => pd.material.color.setHSL((t + i * 0.15) % 1, 1, 0.55)); }
      b.station(0, -b.D / 2 + 2.6, '🕹️', 'PLAY ARCADE', () => IN.arcade(b, p), '#22d3ee');
      b.station(-2, 5.2, '💃', 'DANCE MACHINE', () => IN.party(b, '💃 Dance battle! Everybody dance!'), '#ec4899');
      b.station(5.5, 3, '🕹️', 'CLAW MACHINE $5', () => IN.claw(b), '#facc15'); b.box(7.5, 0, 3, 1.4, 2.2, 1.4, '#facc15', true);
      b.npc(5, -2, -PI / 2, who('Gamer ' + nm(p, 0), { lines: ['Beat 70,000 for an Arcade Medal!', 'My high score is… a secret.'] }));
      b.npc(-6, 1, PI, who(nm(p, 1), { mode: 'wave', lines: ['One more game! ONE more!'] }));
      walker(b, p, 2, ['Watch my dance moves!'], [[1, 1.5], [-5, 1.5]]);
    },
    pets(b, p) {
      b.shell({ floor: 'tile', wall: '#ecfdf5' }); petBed(b, -5, 3.5, '#f472b6', '#d6a77a'); petBed(b, -2.5, 4, '#60a5fa', '#f8fafc'); petBed(b, 4.5, 3.8, '#facc15', '#78716c');
      fishTank(b, -b.W / 2 + 2, -b.D / 2 + 1); b.shelf(4, -b.D / 2 + 1, 4, false, ['#22c55e', '#f97316', '#3b82f6']);
      b.station(0, 2.5, '🐾', 'ADOPT A BUDDY', IN.petMenu, '#22c55e');
      b.station(-3.8, 1.8, '🦴', 'GIVE A TREAT', () => { IN.party(b, '🐶 Woof woof! The puppies are SO happy!'); }, '#facc15');
      b.npc(4, -b.D / 2 + 2.5, 0, who('Vet ' + nm(p, 0), { shirt: '#0f766e', lines: ['A buddy will follow you everywhere you walk!', 'Puppies love belly rubs.'] }));
      walker(b, p, 1, ['That kitty just winked at me!'], [[2, 0], [-4, 0]]);
    },
    shoes(b, p) {
      b.shell({ floor: 'shiny', wall: '#f1f5f9' }); for (let i = 0; i < 3; i++) b.shelf(-4 + i * 4, -b.D / 2 + 1, 3, false, ['#ef4444', '#f8fafc', '#111827', '#22c55e']);
      b.sofa(0, 2.5, 3, '#334155', PI); b.box(-4, 0, 2.5, 1.2, 0.4, 1.2, '#94a3b8', true);
      b.station(3.5, 0.8, '👟', 'SHOE SHOP', IN.sneakers, '#3ff0ff'); b.station(-3.5, 0.6, '🏃', 'TRY THE TREADMILL', () => IN.treat(p, 'run', 5, '🏃 Great workout!', 150), '#22c55e');
      b.npc(4, -2.6, 0, who('Coach ' + nm(p, 0), { lines: ['Speedy Sneakers make you run super fast!', 'Lace up, champ!'] }));
      b.npc(0, 3.0, PI, who(nm(p, 1), { mode: 'sit', y: 0.05, lines: ['These shoes are so bouncy!'] }));
    },
    salon(b, p) {
      b.shell({ floor: 'check', tile: 2, wall: '#faf5ff' });
      for (let i = 0; i < 3; i++) { const x = -4 + i * 4; b.chair(x, -b.D / 2 + 2, '#9333ea'); b.box(x, 0, -b.D / 2 + 2, 0.9, 0.42, 0.9, '#9333ea', true); const mr = b.box(x, 1.2, -b.D / 2 + 0.25, 1.4, 1.6, 0.05, '#e0f2fe', false, true); void mr; }
      hatStation(b, b.W / 2 - 2.4, 2, ['cap', 'cowboy', 'beanie', 'crown']);
      b.station(0, 1.2, '✨', 'GET GLAMMED UP', () => { IN.party(b, '✨ You look FABULOUS!'); gift('bow') && UI().toast('🎀 Free Hair Bow sticker!'); }, '#ec4899'); corners(b, 0.8);
      b.npc(-4, -b.D / 2 + 3, PI, who('Stylist ' + nm(p, 0), { shirt: '#9333ea', lines: ['Hats! Glitter! Fabulous!', 'Every hat looks great on you.'] }));
      b.npc(0, -b.D / 2 + 2, PI, who(nm(p, 1), { mode: 'sit', y: 0.05, lines: ['Make it sparkly please!'] }));
    },
    bank(b, p) {
      b.shell({ floor: 'shiny', wall: '#ecfdf5', ceil: '#f0fdf4' }); b.counter(0, -b.D / 2 + 2.6, 12, 1.0, '#f8fafc', '#065f46');
      for (let i = -1; i <= 1; i++) b.box(i * 4, 1.08, -b.D / 2 + 2.6, 0.05, 1.2, 1.0, '#a7f3d0');
      const vault = b.cyl(b.W / 2 - 0.4, 0.4, -2, 1.6, 0.3, '#94a3b8', false, 24); vault.rotation.z = PI / 2; vault.position.y = 1.8; const wh = b.cyl(b.W / 2 - 0.7, 1.8, -2, 0.5, 0.1, '#facc15', false, 6); wh.rotation.z = PI / 2; wh.position.y = 1.8; b.anims.push((t) => { wh.rotation.x = t * 0.5; });
      [[-6, 3], [6, 3]].forEach((q) => b.cyl(q[0], 0, q[1], 0.45, b.H, '#e5e7eb', true, 14));
      b.station(0, -b.D / 2 + 4.2, '🏦', 'COLLECT INTEREST', () => IN.interest(p), '#22c55e');
      b.station(b.W / 2 - 2.5, -2, '🔐', 'PEEK AT THE VAULT', () => UI().toast('🔐 So many shiny coins! You have ' + U.fmtMoney(G().save.money) + ' saved.'), '#facc15');
      b.npc(0, -b.D / 2 + 1.4, 0, who('Teller ' + nm(p, 0), { shirt: '#065f46', lines: ['Savings grow over time! Come back for interest.', 'Welcome to the bank!'] }));
      walker(b, p, 1, ['I\u2019m saving up for the Super Car!'], [[-5, 1], [4, 1]]);
    },
    pharmacy(b, p) {
      b.shell({ floor: 'tile', wall: '#f0fdf4' }); b.shelf(-4, -1, 5, false, ['#22c55e', '#f8fafc', '#ef4444']); b.shelf(-4, 2.5, 5, false, ['#60a5fa', '#facc15']); b.counter(4, -b.D / 2 + 2, 5, 1.0, '#f8fafc', '#15803d');
      b.station(4, -b.D / 2 + 3.6, '🩹', 'CAR REPAIR KIT $30', IN.firstAid, '#22c55e'); snackStation(b, 3, 2.8, ['candy', 'soda', 'tea'], 'HEALTHY SNACKS');
      b.npc(4, -b.D / 2 + 1.2, 0, who('Dr. ' + nm(p, 0), { shirt: '#ffffff', lines: ['Repair kits fix your ride from anywhere!', 'Drink water and wear your seatbelt!'] }));
      walker(b, p, 1, ['I need bandages for my toy car!'], [[0, 0.8], [0, 4.5]]);
    },
    music(b, p) {
      b.shell({ floor: 'wood', wall: '#eef2ff', rug: 'carpet', rugW: 5, rugD: 3, rugZ: 3 }); piano(b, -4, -b.D / 2 + 1.2);
      for (let i = 0; i < 4; i++) { const g = b.box(b.W / 2 - 0.3, 1.0, -4 + i * 1.2, 0.15, 1.1, 0.5, ['#ef4444', '#f59e0b', '#3b82f6', '#111827'][i]); void g; }
      const dr = b.cyl(3, 0, 3, 0.6, 0.6, '#ef4444', true, 18); void dr; b.cyl(4.2, 0, 3.4, 0.4, 0.8, '#3b82f6', false, 14);
      b.station(-4, -b.D / 2 + 2.6, '🎹', 'PLAY PIANO', () => { GR.Snd.fx('jingle'); UI().toast('🎹 Do-re-mi-fa-so-VROOM!'); IN.cheer(b); }, '#a855f7');
      b.station(1, 3, '🥁', 'JAM SESSION', () => IN.party(b, '🎸 Rock out! Everybody jams!'), '#ec4899');
      b.station(4, -2, '🎸', 'BUY INSTRUMENTS', () => IN.shopMenu('🎵 Music Shop', ['guitar', 'drum']), '#facc15');
      b.npc(5, -3.5, -PI / 2, who('DJ ' + nm(p, 0), { shirt: '#4338ca', hat: 'cap', lines: ['Hit the jam session for a dance party!', 'Turn it UP!'] }));
      b.npc(-2, 3, PI, who(nm(p, 1), { mode: 'wave', lines: ['I can play three chords!'] }));
    },
    phones(b, p) {
      b.shell({ floor: 'shiny', wall: '#f0f9ff' }); [-4, 0, 4].forEach((x) => { b.box(x, 0, 0, 2.6, 0.95, 1.2, '#f8fafc', true); for (let i = 0; i < 3; i++) b.box(x - 0.8 + i * 0.8, 0.95, 0, 0.35, 0.03, 0.6, '#0f172a'); });
      const sc = b.box(0, 1.2, -b.D / 2 + 0.1, 6, 2.4, 0.05, '#0ea5e9', false, true); b.anims.push((t) => sc.material.color.setHSL(0.55 + Math.sin(t * 0.5) * 0.05, 0.8, 0.5));
      b.station(0, 2.8, '📶', 'STAR RADAR APP $5', () => IN.starMap(5), '#3ff0ff'); b.station(-4, 2.4, '📱', 'BUY A CASE', () => IN.shopMenu('📱 Phone Shop', ['phonecase']), '#a855f7');
      b.npc(4, 2.4, PI, who('Techie ' + nm(p, 0), { shirt: '#0369a1', lines: ['The Star Radar app finds hidden Grok Stars!', 'Have you tried turning it off and on again?'] }));
      walker(b, p, 1, ['My phone has 5 bars!'], [[-5, -2], [5, -2]]);
    },
    art(b, p) {
      b.shell({ floor: 'concrete', wall: '#ffffff', ceil: '#ffffff' }); frames(b, 'n', 4); frames(b, 'w', 2);
      [-3, 1, 5].forEach((x, i) => { b.box(x, 0, 1.5, 0.08, 1.6, 0.08, '#78350f'); const cv = b.box(x, 1.0, 1.4, 1.2, 0.9, 0.05, ['#fde68a', '#bfdbfe', '#fbcfe8'][i]); void cv; });
      b.station(0, 3.5, '🎨', 'PAINT MY RIDE', IN.paintShop, '#ec4899'); b.station(-5, -1, '🖼️', 'ART SHOP', () => IN.shopMenu('🎨 Art Studio', ['painting', 'palette']), '#facc15');
      b.npc(1, 2.2, PI, who('Artist ' + nm(p, 0), { hat: 'beanie', lines: ['Paint your ride any color you like!', 'Art is everywhere — even in a car!'] }));
      walker(b, p, 1, ['This painting looks like a burger. I love it.'], [[-6, -3], [6, -3]]);
    },
    apartments(b, p) {
      b.shell({ floor: 'shiny', wall: '#f1f5f9', rug: 'carpet', rugW: 5, rugD: 3, rugZ: 1 });
      for (let i = 0; i < 6; i++) b.box(-b.W / 2 + 1.5 + (i % 3) * 0.7, 1.0 + (i >> 1 & 1) * 0.6, -b.D / 2 + 0.2, 0.6, 0.5, 0.15, '#94a3b8');
      const el = b.box(b.W / 2 - 2.2, 0, -b.D / 2 + 0.2, 2.2, 2.8, 0.2, '#cbd5e1'); void el; b.box(b.W / 2 - 2.2, 2.9, -b.D / 2 + 0.25, 0.8, 0.3, 0.05, '#22c55e', false, true);
      b.sofa(-2, 2.5, 3, '#0ea5e9', PI); b.sofa(2.5, 2.5, 2.4, '#0ea5e9', PI); fishTank(b, 0, -b.D / 2 + 1); corners(b);
      b.station(-b.W / 2 + 2.5, -b.D / 2 + 2, '📬', 'CHECK MAILBOX', () => IN.treat(p, 'mail', 12, '📬 A letter from Grandma! (with money)', 240), '#facc15');
      b.station(b.W / 2 - 2.2, -b.D / 2 + 2.2, '🛗', 'NAP IN YOUR APARTMENT', IN.nap, '#3ff0ff');
      b.npc(-2, 3.2, PI, who('Neighbor ' + nm(p, 0), { mode: 'sit', y: 0.05, lines: ['My cat is the boss of this building.', 'The elevator music is a banger.'] }));
      b.npc(4, -2.5, 0, who('Doorman ' + nm(p, 1), { shirt: '#0ea5e9', hat: 'cap', lines: ['Welcome home!', 'Mail comes every few minutes.'] }));
    },
    office(b, p) {
      b.shell({ floor: 'carpet', wall: '#f8fafc' }); for (let i = 0; i < 6; i++) desk(b, -7 + (i % 3) * 4, -2 + (i >> 1 & 1) * 0 + (i > 2 ? 3.5 : 0), '#e5e7eb');
      b.box(b.W / 2 - 1, 0, -4, 0.6, 1.2, 0.6, '#e5e7eb', true); b.cyl(b.W / 2 - 1, 1.2, -4, 0.25, 0.6, '#7dd3fc', false, 12);
      b.station(b.W / 2 - 2.3, -4, '💧', 'WATER COOLER CHAT', () => UI().toast('💧 Office gossip: someone saw a police chase downtown!'), '#3ff0ff');
      b.station(0, 4.8, '💼', 'JOB BOARD', () => IN.jobBoard(p), '#22c55e'); b.station(5, 4.5, '☕', 'COFFEE BREAK', () => IN.snackMenu(p, ['coffee', 'donut'], 'COFFEE BREAK'), '#ffd23f');
      b.npc(-3, -1.1, PI, who('Boss ' + nm(p, 0), { shirt: '#475569', lines: ['Need work? Check the job board!', 'Synergy! …I don\u2019t know what that means.'] }));
      b.npc(1, 2.4, PI, who(nm(p, 1), { mode: 'sit', y: 0.05, lines: ['Is it lunchtime yet?'] }));
      walker(b, p, 2, ['Meeting in 5 minutes!'], [[6, 0.5], [-6, 0.5]]);
    },
    home(b, p) {
      const wall = p.wall || '#fff1d6'; b.shell({ floor: 'wood', wall, rug: 'rug', rugW: 4, rugD: 3, rugZ: 1.5, ceil: '#fffaf0' });
      b.sofa(-3, 3.2, 3, p.acc || '#c0392b', PI); tvSet(b, -3, -b.D / 2 + 0.7); bed(b, b.W / 2 - 1.6, -b.D / 2 + 2, '#93c5fd');
      b.box(3, 0, 2.5, 1.6, 0.75, 1.0, '#a16207', true); b.ball(3, 0.95, 2.5, 0.25, '#fbbf24'); b.chair(3, 3.4, '#a16207', PI); b.chair(3, 1.6, '#a16207', 0);
      kitchen(b, -b.W / 2 + 0.45, -3.6, 4.6, p.acc || '#0ea5e9'); corners(b, 0.8);
      { const g = new T.Group(); g.position.set(-3, 0, 1.6); b.scene.add(g); rb(b, g, 1.5, 0.08, 0.8, 0.04, '#a16207', 0, 0.42, 0); [[-0.62, -0.3], [0.62, -0.3], [-0.62, 0.3], [0.62, 0.3]].forEach((q) => bx(b, g, 0.07, 0.4, 0.07, '#78350f', q[0], 0.2, q[1])); const mug = new T.Mesh(new T.CylinderGeometry(0.06, 0.05, 0.11, 10), b.mat('#f472b6')); mug.position.set(0.3, 0.52, 0); g.add(mug); bx(b, g, 0.4, 0.04, 0.3, '#3b82f6', -0.3, 0.48, 0.05); b.solids.push({ x0: -3.8, z0: 1.15, x1: -2.2, z1: 2.05 }); }
      b.station(-3, -b.D / 2 + 2.2, '📺', 'WATCH TV', () => IN.tv(b), '#3ff0ff'); b.station(b.W / 2 - 1.6, 0.6, '🛏️', 'TAKE A NAP', IN.nap, '#a855f7');
      snackStation(b, 3, 0.6, ['cookie', 'shake'], 'KITCHEN');
      const fam = p.fam || 'Family';
      b.npc(1, -2, 0, who((['Mama', 'Papa', 'Grandpa', 'Auntie'][(p.id.length + (parseInt(p.id.slice(1), 10) || 0)) % 4]) + ' ' + fam, { lines: ['Welcome! Take a cookie, they\u2019re free!', 'Wipe your wheels — I mean feet!'] }));
      b.npc(-3, 3.3, PI, who('Kid ' + nm(p, 1), { mode: 'sit', y: 0.05, lines: ['Shh! My cartoon is on!', 'Did you find any Grok Stars? I found one on a roof!'] }));
    },
    cabin(b, p) {
      b.shell({ floor: 'wood', wall: '#a0673a', ceil: '#7c4a22', rug: 'carpet', rugW: 3, rugD: 3, rugZ: 0 });
      b.box(0, 0, -b.D / 2 + 0.6, 2.8, 2.6, 1.0, '#78716c', true); const fi = b.ball(0, 0.5, -b.D / 2 + 1.15, 0.4, '#f97316', true); b.anims.push((t) => { fi.scale.y = 1 + Math.sin(t * 11) * 0.2; });
      const pl = new T.PointLight(0xffa040, 0.8, 10); pl.position.set(0, 1.2, -b.D / 2 + 2); b.scene.add(pl);
      bed(b, -b.W / 2 + 1.6, 1.5, '#dc2626'); b.sofa(2.5, 1.5, 2.4, '#7f1d1d', -PI / 2);
      b.station(0, -b.D / 2 + 2.8, '🔥', 'WARM UP BY THE FIRE', IN.warmUp, '#f97316'); snackStation(b, 3.5, -1.5, ['cocoa', 'tea'], 'COCOA POT'); b.station(-b.W / 2 + 1.6, 3.6, '🛏️', 'NAP', IN.nap, '#a855f7');
      b.npc(2, -2, PI, who('Ranger ' + nm(p, 0), { hat: 'beanie', shirt: '#166534', lines: ['Cocoa helps your tires grip on snow!', 'The ice is slippery — go slow on the frozen lake.'] }));
      b.npc(2.5, 1.5, -PI / 2, who(nm(p, 1), { mode: 'sit', y: 0.05, hat: 'beanie', lines: ['Brrr! Close the door!'] }));
    },
    igloo(b, p) {
      b.shell({ floor: 'snowtile', wall: '#f0f9ff', ceil: '#e0f2fe', windows: false, noCeil: true }); bigWindowDome(b, '#e0f2fe');
      for (let i = 0; i < 3; i++) b.box(-3 + i * 3, 0, -3.5, 1.4, 0.5, 1.0, '#bae6fd', true);
      const lamp = b.ball(0, 0.4, 1, 0.3, '#fbbf24', true); b.anims.push((t) => lamp.scale.setScalar(1 + Math.sin(t * 5) * 0.08)); const pl = new T.PointLight(0xffc070, 0.7, 9); pl.position.set(0, 1.2, 1); b.scene.add(pl);
      b.station(-2.5, 1, '🐟', 'ICE FISHING', () => { if (Math.random() < 0.5) IN.treat(p, 'fish', 8, '🐟 You caught a fish!', 90); else UI().toast('🎣 Nibble… nibble… nope!'); }, '#3ff0ff'); b.cyl(-2.5, 0.01, -0.2, 0.5, 0.02, '#1e3a8a', false, 18);
      snackStation(b, 2.5, 1, ['fish', 'tea'], 'IGLOO KITCHEN'); b.station(0, 3.6, '🔥', 'WARM UP', IN.warmUp, '#f97316');
      b.npc(-3, -2.5, 0, who('Explorer ' + nm(p, 0), { hat: 'beanie', shirt: '#0ea5e9', lines: ['Igloos are warmer than they look!', 'I saw a Grok Star on the frozen lake once…'] }));
      b.npc(3, -2.5, 0, who(nm(p, 1), { mode: 'sit', y: 0.05, hat: 'beanie', lines: ['Fish for dinner again? YAY!'] }));
    },
    hangar(b, p) {
      b.shell({ floor: 'concrete', tile: 6, wall: '#cbd5e1', ceil: '#94a3b8', winW: false }); b.car('plane', 0, -2, PI / 2, '#f8fafc');
      for (let i = 0; i < 4; i++) b.box(-b.W / 2 + 1, 0, -6 + i * 3, 1.0, 2.0, 2.0, ['#ef4444', '#3b82f6', '#facc15', '#64748b'][i], true);
      b.box(b.W / 2 - 2, 0, 5, 3, 1.0, 1.2, '#475569', true);
      b.station(6, 6, '🔧', 'FREE TUNE-UP', () => IN.tune(p), '#22c55e'); b.station(-6, 6, '✈️', 'SKY TOUR JOB', () => IN.startJobFrom(p, 'tour'), '#3ff0ff'); b.station(0, 7, '🛩️', 'MODEL PLANES', () => IN.shopMenu('🛩️ Pilot Shop', ['plane']), '#facc15');
      b.npc(4, 3, PI, who('Mechanic ' + nm(p, 0), { shirt: '#f97316', hat: 'cap', lines: ['Free tune-ups for good drivers!', 'Planes need a long road to take off.'] }));
      walker(b, p, 1, ['I\u2019m a pilot! Well… I\u2019m learning.'], [[-8, 3], [8, 3]]);
    },
    tower(b, p) {
      b.shell({ floor: 'carpet', wall: '#e0f2fe' }); for (let i = 0; i < 3; i++) desk(b, -4 + i * 4, -b.D / 2 + 1.6, '#334155');
      const radar = b.cyl(0, 0.9, 1.5, 1.0, 0.06, '#064e3b', false, 24); void radar; const sweep = b.box(0, 0.98, 1.5, 0.05, 0.02, 1.0, '#22c55e', false, true); b.anims.push((t) => { sweep.rotation.y = t * 2; sweep.position.set(Math.sin(t * 2) * 0.5, 0.98, 1.5 + Math.cos(t * 2) * 0.5); }); b.box(0, 0, 1.5, 1.4, 0.9, 1.4, '#334155', true);
      b.station(0, 3.5, '📡', 'RADAR: FIND A STAR', () => IN.starMap(0), '#22c55e'); b.station(-4, -1, '🎧', 'TALK TO PILOTS', () => UI().toast('🎧 "Tower, this is Balloon 7… I see a shiny star on a mesa!"'), '#3ff0ff');
      b.npc(-4, -b.D / 2 + 2.4, PI, who('Controller ' + nm(p, 0), { mode: 'sit', y: 0.05, lines: ['Cleared for takeoff!', 'The radar shows hidden stars!'] }));
      b.npc(4, 2, PI, who(nm(p, 1), { lines: ['Look at all the planes!'], path: [[4, 2], [4, -1]] }));
    },
    observatory(b, p) {
      b.shell({ floor: 'carpet', wall: '#1e1b4b', ceil: '#0b1026', windows: false, noCeil: true }); b.scene.background = new T.Color('#0b1026'); bigWindowDome(b, '#0b1026');
      const sp = []; for (let i = 0; i < 260; i++) { const a = Math.random() * PI * 2, e = 0.12 + Math.random() * 1.4, r = Math.min(b.W, b.D) * 0.46; sp.push(Math.cos(a) * Math.cos(e) * r, b.H - 0.2 + Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r); }
      const stars = new T.Points(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(sp, 3)), new T.PointsMaterial({ color: 0xffffff, size: 0.12 })); b.scene.add(stars);
      const tel = b.cyl(0, 1.2, -2, 0.35, 3.4, '#cbd5e1', false, 16); tel.rotation.x = -0.8; tel.position.set(0, 2.4, -2); b.cyl(0, 0, -2, 0.5, 1.4, '#475569', true, 12);
      const pl = new T.Group(); [['#f59e0b', 0.6, 2.2], ['#60a5fa', 0.35, 3.6], ['#ef4444', 0.28, 5]].forEach((q, i) => { const m = b.ball(0, 0, 0, q[1], q[0], true); m.userData.r = q[2]; m.userData.i = i; pl.add(m); b.scene.remove(m); }); pl.position.set(4.5, 2.5, 3); b.scene.add(pl); b.anims.push((t) => pl.children.forEach((m) => { const a = t * (0.6 - m.userData.i * 0.15) + m.userData.i * 2; m.position.set(Math.cos(a) * m.userData.r * 0.5, 0, Math.sin(a) * m.userData.r * 0.5); }));
      b.station(0, 0.2, '🔭', 'LOOK THROUGH TELESCOPE', IN.telescope, '#a855f7'); b.station(4.5, 5.5, '🪐', 'PLANET SHOW', () => IN.party(b, '🪐 The planets dance!'), '#3ff0ff'); b.station(-5, 3, '🌟', 'STAR CHART', () => IN.shopMenu('🌟 Gift Shop', ['star']), '#facc15');
      b.npc(-2, -3.5, 0, who('Prof. ' + nm(p, 0), { shirt: '#4338ca', lines: ['Grok Stars hide on rooftops, mesas and inside buildings!', 'The telescope shows the night sky.'] }));
      walker(b, p, 1, ['Is that Saturn?!'], [[-6, 0], [6, 0]]);
    },
    lighthouse(b, p) {
      b.shell({ floor: 'wood', wall: '#fef2f2', ceil: '#fff1f2' }); for (let i = 0; i < 10; i++) { const a = i * 0.6; b.box(Math.cos(a) * 3.2, i * 0.45, -1 + Math.sin(a) * 3.2, 1.4, 0.15, 0.7, '#7f1d1d'); }
      b.cyl(0, 0, -1, 0.4, b.H, '#e5e7eb', true, 12); const lens = b.ball(0, b.H - 1, -1, 0.5, '#fde047', true); b.anims.push((t) => lens.material.color.setHSL(0.15, 1, 0.55 + Math.sin(t * 3) * 0.1));
      b.station(3.5, 3.5, '💡', 'LIGHT THE BEACON', () => { IN.party(b, '💡 The beacon shines! Boats wave hello!'); IN.treat(p, 'beacon', 10, '⚓ The harbor master tips you.', 200); }, '#facc15'); b.station(-3.5, 3.5, '🔭', 'SPYGLASS', () => IN.starMap(0), '#3ff0ff'); b.station(0, 4.5, '🐚', 'SEA SHELLS', () => IN.shopMenu('🐚 Beach Finds', ['shell']), '#ec4899');
      b.npc(-3, 1.5, PI, who('Keeper ' + nm(p, 0), { hat: 'cap', lines: ['Every boat needs a lighthouse!', 'The spyglass can spot faraway stars.'] }));
      b.npc(3, 1.5, PI, who(nm(p, 1), { lines: ['I can see the marina from the top!'] }));
    }
  };
  IN.GEN = GEN;
  // shared finishing touches: wainscot band, picture frames, a ceiling fan, doormat — so no room feels bare
  function finish(b, p) {
    const lite = new T.Color(p.acc || '#64748b').lerp(new T.Color('#ffffff'), 0.55).getStyle(), m = b.mat(lite), e = 0.04, H = b.H;
    // wainscot + chair rail + skirting + crown moulding (real boxes that stick out of the walls)
    [[0, -b.D / 2 + e, b.W, 0.05, 0, 1], [-b.W / 2 + e, 0, 0.05, b.D, 1, 0], [b.W / 2 - e, 0, 0.05, b.D, -1, 0]].forEach((w) => {
      const add = (h, y, dd, col) => { const g = new T.Mesh(new T.BoxGeometry(w[2] > 1 ? w[2] : dd, h, w[3] > 1 ? w[3] : dd), typeof col === 'string' ? b.mat(col) : col); g.position.set(w[0] + w[4] * dd / 2, y, w[1] + w[5] * dd / 2); b.scene.add(g); };
      add(1.0, 0.5, 0.05, m); add(0.08, 1.02, 0.12, '#ffffff'); add(0.16, 0.08, 0.08, '#ffffff'); if (H < 8) add(0.22, H - 0.11, 0.22, '#ffffff');
    });
    const big = ['hangar', 'observatory', 'igloo', 'games'].includes(p.variant), r = U.rng(p.id.length * 7 + (parseInt(p.id.slice(1), 10) || 0));
    // 3D windows on the side walls, framed paintings on the back wall, a wall shelf
    if (!big) {
      const wy = Math.min(2.35, H * 0.52), curtain = ['#f9a8d4', '#93c5fd', '#fde68a', '#c4b5fd', '#86efac'][(r() * 5) | 0];
      [-1, 1].forEach((sd) => { window3(b, sd < 0 ? 'w' : 'e', -b.D / 4, wy, 1.5, 1.35, curtain); });
      wallShelf(b, r() < 0.5 ? 'e' : 'w', b.D / 4, 1.95, 1.6);
      [-1, 1].forEach((sd, i) => picture(b, 'n', sd * (b.W / 2 - 2.2), Math.min(2.6, H - 1.1), 1.4, 1.0, (p.id.length + i * 3 + ((r() * 9) | 0)) % 12, i ? '#1f2937' : '#a16207'));
    }
    // ceiling: beams + pendant lamps (no more blank ceiling); floor lamp + leafy plant by the door
    if (H < 8) {
      for (let zz = -b.D / 2 + 2.5; zz < b.D / 2 - 1; zz += 2.5) b.box(0, H - 0.26, zz, b.W, 0.26, 0.3, '#b98a5a');
      b.box(0, H - 0.04, 0, b.W, 0.04, b.D, '#f5e6cc'); // warm plank ceiling under the beams
      [-1, 0, 1].forEach((sd) => pendant(b, sd * b.W / 4, sd ? -b.D / 6 : 0.5, p.acc || '#f59e0b'));
      // party bunting: real little 3D pennants on strings across the room
      const cols = ['#ef4444', '#f59e0b', '#facc15', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];
      [-b.D / 4].forEach((zz, row) => { const n = Math.floor(b.W / 0.7), y0 = H - 0.35, pt = (i) => [-b.W / 2 + 0.35 + i * 0.7, y0 - Math.sin((i + 0.5) / n * PI) * 0.3];
        for (let i = 0; i < n; i++) { const [x, y] = pt(i); const f = new T.Mesh(new T.ConeGeometry(0.14, 0.3, 3), b.mat(cols[(i + row * 3) % cols.length])); f.rotation.x = PI; f.scale.z = 0.25; f.position.set(x, y - 0.15, zz); b.scene.add(f);
          if (i < n - 1) { const [x2, y2] = pt(i + 1), L = Math.hypot(x2 - x, y2 - y), sg = new T.Mesh(new T.BoxGeometry(L, 0.025, 0.025), b.mat('#f8fafc')); sg.position.set((x + x2) / 2, (y + y2) / 2, zz); sg.rotation.z = Math.atan2(y2 - y, x2 - x); b.scene.add(sg); } } });
    }
    if (!big) { floorLamp(b, -b.W / 2 + 0.8, b.D / 2 - 1.2); b.plant(b.W / 2 - 0.8, b.D / 2 - 1.2, 0.9); }
    const mat = new T.Mesh(M.rbox(2.2, 0.04, 1.2, 0.02), b.mat(p.acc || '#22c55e')); mat.position.set(0, 0.02, b.D / 2 - 0.9); b.scene.add(mat);
  }
  IN.deco = { picture, window3, wallShelf, pendant, floorLamp, bed, kitchen, tvSet, piano, fishTank, petBed, plantShelf, rb, bx, onWall, finish, artTex };
  IN.BUILD.gen = function (b, p) { (GEN[p.variant] || GEN.cafe)(b, p); finish(b, p); };
})();
