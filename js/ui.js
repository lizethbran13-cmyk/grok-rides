/* Grok Rides - HUD, touch controls, panels (garage, dealer, races, jobs, map, menu) */
(function () {
  'use strict';
  const GR = window.GR, U = GR.U, W = GR.W, T = THREE;
  const UI = GR.UI = {};
  const $ = (id) => document.getElementById(id);
  const esc = U.esc;
  const inp = UI.input = { steer: 0, thr: 0, brk: 0, up: 0, down: 0, fwd: 0, hand: 0 };
  const keys = {}; let joy = { id: null, x: 0, y: 0 };

  UI.toast = function (msg, bad) {
    const t = document.createElement('div'); t.className = 'toast' + (bad ? ' bad' : ''); t.textContent = msg; const box = $('toasts'); box.appendChild(t);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 450); }, 3200);
  };
  let bigT = 0; UI.bigText = function (s) { const b = $('bigText'); b.textContent = s; b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); clearTimeout(bigT); bigT = setTimeout(() => b.classList.remove('on'), 900); };
  UI.isOpen = () => !$('pnl').classList.contains('hidden');
  UI.panel = function (html, bind) { $('pnlCard').innerHTML = html; $('pnl').classList.remove('hidden'); $('pnlCard').scrollTop = 0; if (bind) bind($('pnlCard')); GR.Snd.fx('ui'); };
  UI.close = function () { $('pnl').classList.add('hidden'); $('pnlCard').innerHTML = ''; UI.onClose && UI.onClose(); UI.onClose = null; };
  function on(root, sel, fn) { root.querySelectorAll(sel).forEach((e) => e.addEventListener('click', (ev) => { ev.stopPropagation(); fn(e, ev); })); }

  // ---------- 3D thumbnails ----------
  let tr = null, ts, tc; const thumbs = {};
  UI.thumb = function (type, color) {
    const key = type + color; if (thumbs[key]) return thumbs[key];
    try {
      if (!tr) { tr = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); tr.setSize(240, 150); tr.setPixelRatio(1); ts = new T.Scene(); ts.add(new T.HemisphereLight(0xffffff, 0x8888aa, 0.9)); const d = new T.DirectionalLight(0xffffff, 0.8); d.position.set(3, 5, 4); ts.add(d); tc = new T.PerspectiveCamera(30, 240 / 150, 0.1, 200); }
      const m = GR.M.vehicle(type, color); ts.add(m);
      const box = new T.Box3().setFromObject(m), c = box.getCenter(new T.Vector3()), s = box.getSize(new T.Vector3()), r = Math.max(s.x, s.y, s.z);
      tc.position.set(c.x + r * 1.25, c.y + r * 0.6, c.z + r * 1.55); tc.lookAt(c); tr.render(ts, tc);
      thumbs[key] = tr.domElement.toDataURL(); ts.remove(m); m.userData.body.geometry.dispose();
    } catch (e) { thumbs[key] = ''; }
    return thumbs[key];
  };

  // ---------- controls ----------
  function pedal(el, key) {
    const set = (v) => { inp['_' + key] = v; el.classList.toggle('on', !!v); };
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); GR.Snd.unlock(); try { el.setPointerCapture(e.pointerId); } catch (x) {} set(1); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => el.addEventListener(t, () => set(0)));
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  UI.initControls = function () {
    const jz = $('joy'), knob = $('joyKnob');
    const upd = (e) => { const r = $('joyBase').getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = e.clientX - cx, dy = e.clientY - cy; const l = Math.hypot(dx, dy), R = 52; if (l > R) { dx *= R / l; dy *= R / l; } joy.x = dx / R; joy.y = -dy / R; knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; };
    jz.addEventListener('pointerdown', (e) => { e.preventDefault(); GR.Snd.unlock(); joy.id = e.pointerId; try { jz.setPointerCapture(e.pointerId); } catch (x) {} upd(e); });
    jz.addEventListener('pointermove', (e) => { if (e.pointerId === joy.id) upd(e); });
    const end = (e) => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => jz.addEventListener(t, end));
    pedal($('bGas'), 'gas'); pedal($('bBrake'), 'brake');
    $('bNitro').addEventListener('pointerdown', (e) => { e.preventDefault(); GR.G.nitro(); });
    $('bHorn').addEventListener('click', () => GR.G.horn());
    $('bCam').addEventListener('click', () => GR.G.cycleCam());
    $('bReset').addEventListener('click', () => GR.G.resetVehicle(true));
    $('bMenu').addEventListener('click', () => UI.menu());
    $('bMap').addEventListener('click', () => UI.map());
    $('minimap').addEventListener('click', () => UI.map());
    $('bAct').addEventListener('click', () => GR.G.act());
    $('dmgChip').addEventListener('click', () => { if (GR.G.me && GR.G.me.dmg >= 100) GR.G.act(); });
    $('pnl').addEventListener('click', (e) => { if (e.target === $('pnl') && UI.dismissable) UI.close(); });
    window.addEventListener('keydown', (e) => {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
      keys[e.code] = true; GR.Snd.unlock();
      if (!GR.G.playing) return;
      if (e.code === 'Escape') { if (UI.isOpen() && UI.dismissable) UI.close(); else if (!UI.isOpen()) UI.menu(); }
      if (UI.isOpen()) return;
      if (e.code === 'KeyE' || e.code === 'Enter') GR.G.act();
      if (e.code === 'KeyC') GR.G.cycleCam();
      if (e.code === 'KeyT') GR.G.resetVehicle(true);
      if (e.code === 'KeyH') GR.G.horn();
      if (e.code === 'KeyM') UI.map();
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') GR.G.nitro();
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) >= 0) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; inp._gas = inp._brake = 0; });
  };
  UI.readInput = function (veh) {
    const k = keys, kind = veh ? veh.kind : 'ground';
    const kx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    const ky = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    let jx = joy.x; jx = Math.abs(jx) < 0.08 ? 0 : Math.sign(jx) * Math.pow((Math.abs(jx) - 0.08) / 0.92, 1.25);
    let jy = joy.y; jy = Math.abs(jy) < 0.12 ? 0 : Math.sign(jy) * (Math.abs(jy) - 0.12) / 0.88;
    inp.steer = U.clamp(jx + kx, -1, 1); inp.hand = k.Space && kind === 'ground' ? 1 : 0;
    if (kind === 'heli' || kind === 'balloon') {
      inp.up = (inp._gas || k.KeyR || k.Space || k.PageUp) ? 1 : 0; inp.down = (inp._brake || k.KeyF || k.ControlLeft || k.PageDown) ? 1 : 0;
      inp.fwd = U.clamp(jy + ky, -1, 1); inp.thr = 0; inp.brk = 0;
    } else if (kind === 'plane') {
      inp.thr = (inp._gas || k.KeyW) ? 1 : 0; inp.brk = (inp._brake || k.KeyS) ? 1 : 0;
      inp.fwd = U.clamp(jy + (k.ArrowUp ? 1 : 0) - (k.ArrowDown ? 1 : 0), -1, 1); inp.up = k.KeyR || k.Space ? 1 : 0; inp.down = k.KeyF ? 1 : 0;
      if (k.ArrowLeft || k.ArrowRight) inp.steer = U.clamp(jx + kx, -1, 1);
    } else {
      inp.thr = (inp._gas || ky > 0) ? 1 : 0; inp.brk = (inp._brake || ky < 0) ? 1 : 0; inp.up = inp.down = 0; inp.fwd = 0;
    }
    return inp;
  };
  UI.setControlMode = function (kind) {
    const air = kind === 'heli' || kind === 'balloon';
    $('bGas').querySelector('span').textContent = air ? '⬆ UP' : kind === 'plane' ? 'FASTER' : 'GAS';
    $('bBrake').querySelector('span').textContent = air ? '⬇ DOWN' : kind === 'plane' ? 'SLOWER' : 'BRAKE';
    $('joyHint').textContent = air ? 'TURN + FLY FORWARD' : kind === 'plane' ? 'TURN + UP/DOWN' : 'STEER';
    $('thrBar').classList.toggle('hidden', kind !== 'plane');
    $('speedo').querySelector('small').textContent = air || kind === 'plane' ? 'MPH · ALT' : 'MPH';
  };

  // ---------- minimap ----------
  let baseMap = null;
  const MAP_PX = 600, M2P = MAP_PX / 3000;
  function buildBaseMap() {
    const c = document.createElement('canvas'); c.width = c.height = MAP_PX; const x = c.getContext('2d'); const img = x.createImageData(MAP_PX, MAP_PX);
    for (let i = 0; i < MAP_PX; i++) for (let j = 0; j < MAP_PX; j++) {
      const wx = -1500 + (j + 0.5) / M2P, wz = -1500 + (i + 0.5) / M2P, s = W.surface(wx, wz), h = W.height(wx, wz);
      let col = [111, 191, 90];
      if (W.inRect(W.CITY, wx, wz, 10)) col = [190, 192, 200]; else if (s === 5 || (W.ellQ(W.LAKE, wx, wz) < 1.02)) col = [64, 168, 240]; else if (s === 4) col = [190, 230, 255]; else if (s === 3) col = [240, 246, 255]; else if (s === 2) col = [240, 205, 130]; else if (s === 6) col = [150, 135, 112];
      const shade = U.clamp(1 + (h - W.height(wx - 6, wz - 6)) * 0.04, 0.75, 1.2);
      const k = (i * MAP_PX + j) * 4; img.data[k] = col[0] * shade; img.data[k + 1] = col[1] * shade; img.data[k + 2] = col[2] * shade; img.data[k + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    x.lineCap = 'round'; x.lineJoin = 'round';
    W.roads.forEach((r) => { x.strokeStyle = r.name === 'Grok Highway' ? '#ffd23f' : '#ffffff'; x.lineWidth = r.kind === 'runway' ? 5 : r.name === 'Grok Highway' ? 3.4 : 2.4; x.beginPath(); r.pts.forEach((p, i) => { const px = (p.x + 1500) * M2P, py = (p.z + 1500) * M2P; if (i) x.lineTo(px, py); else x.moveTo(px, py); }); if (r.closed) x.closePath(); x.stroke(); });
    W.MESAS.forEach((m) => { x.fillStyle = '#c45a32'; x.beginPath(); x.arc((m[0] + 1500) * M2P, (m[1] + 1500) * M2P, m[2] * M2P, 0, 7); x.fill(); });
    baseMap = c;
  }
  UI.baseMap = () => baseMap || (buildBaseMap(), baseMap);
  const SPOTCOL = { garage: '#4ade80', dealer: '#ffd23f', job: '#3ff0ff', race: '#ff4fd8' };
  function drawMini(G) {
    const cv = $('minimap'), x = cv.getContext('2d'), S = cv.width, me = G.viewVeh(); if (!me) return;
    const radius = 160 + Math.min(260, Math.abs(me.vF) * 4), sc = (S / 2) / radius; // px per meter
    x.save(); x.clearRect(0, 0, S, S); x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, 7); x.clip();
    x.fillStyle = '#6fbf5a'; x.fillRect(0, 0, S, S);
    const hd = Math.atan2(Math.sin(me.yaw), -Math.cos(me.yaw));
    x.translate(S / 2, S / 2); x.rotate(-hd); x.scale(sc, sc); x.translate(-me.x, -me.z);
    const bm = UI.baseMap(); x.imageSmoothingEnabled = true; x.drawImage(bm, -1500, -1500, 3000, 3000);
    // route
    if (G.route && G.route.length > 1) { x.strokeStyle = '#3ff0ff'; x.lineWidth = 9 / sc * 0.5; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); G.route.forEach((p, i) => (i ? x.lineTo(p.x, p.z) : x.moveTo(p.x, p.z))); x.stroke(); }
    const rc = GR.Race.cur; if (rc && !rc.air) { x.strokeStyle = 'rgba(255,79,216,.85)'; x.lineWidth = 6 / sc * 0.5; x.beginPath(); rc.P.pts.forEach((p, i) => (i ? x.lineTo(p.x, p.z) : x.moveTo(p.x, p.z))); if (rc.P.closed) x.closePath(); x.stroke(); }
    const dot = (px, pz, col, r) => { x.fillStyle = col; x.beginPath(); x.arc(px, pz, r / sc, 0, 7); x.fill(); x.lineWidth = 1.5 / sc; x.strokeStyle = '#fff'; x.stroke(); };
    if (!rc) GR.SC.markers.forEach((m) => { if (Math.abs(m.s.x - me.x) < radius * 1.5 && Math.abs(m.s.z - me.z) < radius * 1.5) dot(m.s.x, m.s.z, SPOTCOL[m.s.type], 5); });
    if (rc) { const t = GR.Race.nextTarget(); if (t) dot(t.x, t.z, '#ffffff', 6); rc.ai.forEach((a) => dot(a.x, a.z, '#ff3b3b', 3.5)); }
    const tg = G.gpsTarget(); if (tg) dot(tg.x, tg.z, '#3ff0ff', 6);
    for (const k in G.remotes) { const r = G.remotes[k]; if (r.veh) dot(r.veh.x, r.veh.z, r.color, 5); }
    x.restore();
    // me arrow (always up)
    x.save(); x.translate(S / 2, S / 2); x.fillStyle = '#ff4fd8'; x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, -14); x.lineTo(10, 11); x.lineTo(0, 5); x.lineTo(-10, 11); x.closePath(); x.fill(); x.stroke(); x.restore();
    // north tick
    const nx = S / 2 + Math.sin(-hd) * (S / 2 - 14), ny = S / 2 - Math.cos(-hd) * (S / 2 - 14); x.fillStyle = '#3a1747'; x.beginPath(); x.arc(nx, ny, 11, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = 'bold 15px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('N', nx, ny + 1);
  }

  // ---------- HUD ----------
  let hudT = 0, lastMoney = -1;
  UI.hud = function (G, dt) {
    hudT += dt; const v = G.viewVeh(); if (!v) return;
    if (G.save.money !== lastMoney) { lastMoney = G.save.money; $('moneyN').textContent = U.fmtMoney(G.save.money); }
    const mph = Math.round(Math.abs(v.kind === 'heli' || v.kind === 'balloon' ? v.speed() : v.vF) * 2.237);
    const air = GR.isAir(v.type); $('spdN').textContent = air ? mph + ' · ' + Math.max(0, Math.round(v.y - W.height(v.x, v.z))) + 'm' : mph;
    if (v.kind === 'plane') $('thrBar').firstElementChild.style.width = Math.round(v.thr * 100) + '%';
    const me = G.me, d = Math.round(me.dmg); $('dmgBar').style.width = d + '%'; $('dmgBar').style.backgroundPosition = (-d * 1.2) + 'px 0'; $('dmgN').textContent = d >= 100 ? 'TOW' : d + '%';
    $('dmgChip').classList.toggle('wreck', d >= 100);
    const hasN = (me.upg.nitro || 0) > 0 && !G.passenger; $('nitroChip').classList.toggle('hidden', !hasN); $('bNitro').classList.toggle('hidden', !hasN);
    if (hasN) { $('nitroBar').style.width = Math.round((me.nitro > 0 ? me.nitro / 2.5 : me.nitroT) * 100) + '%'; $('bNitro').classList.toggle('empty', me.nitroT < 1 && me.nitro <= 0); }
    if (hudT > 0.25) {
      hudT = 0;
      $('regionN').textContent = W.REGION_NAMES[W.region(v.x, v.z)];
      const act = G.actOption(); const b = $('bAct'); if (act && !UI.isOpen()) { b.textContent = act.label; b.classList.remove('hidden'); } else b.classList.add('hidden');
      // race
      const r = GR.Race.cur;
      if (r) {
        const p = GR.Race.myPos(); $('racePos').textContent = ordinal(p.pos) + ' / ' + p.of;
        $('raceLap').textContent = r.air ? 'RING ' + Math.min(r.cps.length, r.me.cp + 1) + ' / ' + r.cps.length : r.P.closed ? 'LAP ' + (r.me.lap || 1) + ' / ' + r.laps : 'CHECKPOINT ' + Math.min(r.cps.length, r.me.cp + 1) + ' / ' + r.cps.length;
        $('raceTime').textContent = '⏱ ' + U.fmtTime(Math.max(0, r.me.fin != null ? r.me.fin : r.t));
        $('wrongWay').classList.toggle('hidden', !(r.me.wrong > 0.6 && r.t > 2 && !r.air && r.me.fin == null));
      } else $('wrongWay').classList.add('hidden');
      const j = GR.Jobs.cur; if (j) UI.jobHud(true);
      // mates
      const ms = $('mates'); let html = '';
      for (const k in G.remotes) { const o = G.remotes[k]; html += '<div class="mate" style="border-color:' + esc(o.color) + '">' + esc(o.name) + ' · ' + (o.ride ? '🚗 riding' : esc((GR.VEH[o.type] || {}).icon || '')) + ' ' + (o.veh ? Math.round(Math.hypot(o.veh.x - v.x, o.veh.z - v.z)) + 'm' : '') + '</div>'; }
      if (G.passenger) html += '<div class="mate" style="border-color:#ffd23f">🚗 Riding with ' + esc(G.remotes[G.passenger] ? G.remotes[G.passenger].name : 'friend') + '</div>';
      if (ms.innerHTML !== html) ms.innerHTML = html;
    }
    // GPS
    const tg = G.gpsTarget();
    if (tg) {
      const dist = Math.hypot(tg.x - v.x, tg.z - v.z); $('gps').classList.remove('hidden');
      const camYaw = G.camYaw(); const ang = Math.atan2(tg.x - v.x, tg.z - v.z); const rel = U.ang(camYaw - ang);
      $('gpsArrow').style.transform = 'rotate(' + (rel * 180 / Math.PI - 90) + 'deg)';
      $('gpsT').textContent = dist > 1000 ? (dist / 1000).toFixed(1) + ' km' : Math.round(dist) + ' m';
    } else $('gps').classList.add('hidden');
    drawMini(G);
  };
  function ordinal(n) { return n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'); }
  UI.ordinal = ordinal;
  UI.raceHud = function (onn) { $('raceBox').classList.toggle('hidden', !onn); if (!onn) $('wrongWay').classList.add('hidden'); };
  UI.jobHud = function () {
    const j = GR.Jobs.cur, b = $('jobBox'); if (!j) { b.classList.add('hidden'); b.innerHTML = ''; return; }
    b.classList.remove('hidden'); const s = j.stops[j.idx];
    let extra = '';
    if (j.limit) { const left = Math.max(0, j.limit - j.t); extra = '⏱ ' + (j.t > j.limit ? 'LATE' : Math.ceil(left) + 's'); }
    if (j.id === 'limo') extra = (j.mood > 70 ? '😊' : j.mood > 40 ? '😐' : '😤') + ' VIP mood ' + Math.round(j.mood) + '%';
    if (j.id === 'cargo') extra = '📦 Cargo ' + Math.round(j.cond) + '%';
    if (j.id === 'bus' || j.id === 'pizza' || j.id === 'tour') extra += (extra ? ' · ' : '') + (j.idx) + '/' + j.stops.length + ' done';
    const html = '<button class="jx" data-x="1">✕</button><b>' + j.def.icon + ' ' + esc(j.def.name) + '</b><br>' + (s ? esc(s.icon + ' ' + s.n) : '') + (extra ? '<br><small>' + extra + '</small>' : '');
    if (b.innerHTML !== html) { b.innerHTML = html; on(b, '[data-x]', () => { GR.Jobs.cancel('Job cancelled.'); }); }
  };

  // ---------- panels ----------
  function statBars(V) {
    const air = GR.isAir(V.id), bar = (n, v) => '<div class="stat"><span>' + n + '</span><div class="bar"><i style="width:' + Math.round(U.clamp(v, 0.05, 1) * 100) + '%"></i></div></div>';
    return bar('Speed', V.vmax / 72) + bar(air ? 'Climb' : 'Accel', V.acc / 32) + bar('Handling', (V.grip * V.turn) / 2.4) + (air ? '' : bar('Off-road', V.off) + bar('Snow/Ice', V.snow));
  }
  UI.statBars = statBars;
  function close() { UI.close(); }
  UI.garage = function (spot) {
    const G = GR.G, me = G.me, s = G.save; UI.dismissable = true; let tab = UI._gtab || 'cars';
    const render = () => {
      const cur = s.owned[s.cur], cost = G.repairCost();
      let h = '<h2>🔧 ' + esc(spot.name) + '</h2>';
      h += '<img class="big3d" src="' + UI.thumb(s.cur, cur.color) + '" alt="">';
      h += '<div class="sub"><b>' + esc(GR.VEH[s.cur].icon + ' ' + GR.VEH[s.cur].name) + '</b> · Damage ' + Math.round(me.dmg) + '%</div>';
      h += '<div class="btnrow"><button class="btn green small" data-a="repair" ' + (me.dmg < 1 ? 'disabled' : '') + '>' + (me.dmg < 1 ? 'NO DAMAGE ✨' : 'REPAIR ' + (cost ? U.fmtMoney(cost) : '(FREE)')) + '</button></div>';
      h += '<div class="seg"><button data-t="cars" class="' + (tab === 'cars' ? 'on' : '') + '">MY RIDES</button><button data-t="paint" class="' + (tab === 'paint' ? 'on' : '') + '">PAINT</button><button data-t="upg" class="' + (tab === 'upg' ? 'on' : '') + '">UPGRADES</button></div>';
      if (tab === 'cars') {
        h += '<div class="vgrid">'; GR.VEH_ORDER.forEach((k) => { if (!s.owned[k]) return; const V = GR.VEH[k], ok = G.canSpawnHere(k, spot); h += '<button class="vcard ' + (k === s.cur ? 'on' : '') + (ok ? '' : ' cant') + '" data-v="' + k + '"><img src="' + UI.thumb(k, s.owned[k].color) + '" alt=""><b>' + esc(V.name) + '</b><small>' + (k === s.cur ? 'DRIVING' : ok ? 'TAP TO SWITCH' : (V.kind === 'boat' ? 'Only at the Marina' : 'Not here')) + '</small></button>'; }); h += '</div>';
        h += '<p class="sub">Buy more rides at <b>Grok Motors</b> (city), <b>Sky Field</b> (aircraft) and the <b>Marina</b> (boats).</p>';
      } else if (tab === 'paint') {
        h += '<p class="sub">Pick a color ($100). Your ride: ' + esc(GR.VEH[s.cur].name) + '</p><div class="swatches" style="margin:8px 0">'; GR.PAINTS.forEach((c) => { h += '<button data-c="' + c + '" class="' + (cur.color === c ? 'on' : '') + '" style="background:' + c + '"></button>'; }); h += '</div>';
      } else {
        for (const k in GR.UPG) { const u = GR.UPG[k], lv = (cur.upg || {})[k] || 0, max = lv >= u.max, price = max ? 0 : Math.round(u.cost[lv] * G.priceScale(s.cur)); let pips = ''; for (let i = 0; i < u.max; i++) pips += '<i class="' + (i < lv ? 'on' : '') + '"></i>'; h += '<div class="upg"><span style="font-size:26px">' + u.icon + '</span><div class="grow"><b>' + u.name + '</b> <span class="pips">' + pips + '</span><small>' + u.desc + '</small></div><button class="btn gold" data-u="' + k + '" ' + (max || s.money < price ? 'disabled' : '') + '>' + (max ? 'MAX' : U.fmtMoney(price)) + '</button></div>'; }
      }
      h += '<div class="btnrow"><button class="btn alt" data-a="close">DONE</button></div>';
      UI.panel(h, (root) => {
        on(root, '[data-t]', (e) => { tab = UI._gtab = e.dataset.t; render(); });
        on(root, '[data-a=close]', close);
        on(root, '[data-a=repair]', () => { G.repair(); render(); });
        on(root, '[data-v]', (e) => { const k = e.dataset.v; if (k === s.cur) return; if (!G.canSpawnHere(k, spot)) { UI.toast(GR.VEH[k].kind === 'boat' ? 'Boats can only be picked up at Sparkle Marina.' : 'Can\u2019t switch here.', true); return; } G.switchVehicle(k, spot); render(); });
        on(root, '[data-c]', (e) => { G.paint(e.dataset.c); render(); });
        on(root, '[data-u]', (e) => { G.upgrade(e.dataset.u); render(); });
      });
    };
    render();
  };
  UI.dealer = function (spot) {
    const G = GR.G, s = G.save; UI.dismissable = true;
    const list = GR.VEH_ORDER.filter((k) => { const V = GR.VEH[k]; if (spot.air) return GR.isAir(k); if (spot.boat) return V.kind === 'boat'; return V.kind === 'ground'; });
    const grid = () => {
      let h = '<h2>' + esc(spot.icon + ' ' + spot.name) + '</h2><p class="sub">You have <b>' + U.fmtMoney(s.money) + '</b>. Tap a ride to see it.</p><div class="vgrid">';
      list.forEach((k) => { const V = GR.VEH[k], own = !!s.owned[k]; h += '<button class="vcard" data-v="' + k + '">' + (own ? '<span class="tag">OWNED</span>' : '') + '<img src="' + UI.thumb(k, own ? s.owned[k].color : (V.color || '#ff4fd8')) + '" alt=""><b>' + esc(V.name) + '</b><small>' + (own ? 'In your garage' : V.price ? U.fmtMoney(V.price) : 'FREE') + '</small></button>'; });
      h += '</div>'; if (!spot.air) h += '<p class="sub small">Helicopters, planes and balloons are sold at <b>Sky Field</b> (east of the city). Boats at <b>Sparkle Marina</b>.</p>';
      h += '<div class="btnrow"><button class="btn alt" data-a="close">DONE</button></div>';
      UI.panel(h, (root) => { on(root, '[data-a=close]', close); on(root, '[data-v]', (e) => detail(e.dataset.v)); });
    };
    const detail = (k) => {
      const V = GR.VEH[k], own = !!s.owned[k], col = own ? s.owned[k].color : (V.color || '#ff4fd8');
      let h = '<h2>' + esc(V.icon + ' ' + V.name) + '</h2><img class="big3d" src="' + UI.thumb(k, col) + '" alt=""><p class="sub">' + esc(V.desc) + '</p>' + statBars(V);
      h += '<div class="btnrow">' + (own ? '<button class="btn green" data-a="drive">' + (k === s.cur ? 'DRIVING IT' : 'DRIVE IT') + '</button>' : '<button class="btn gold" data-a="buy" ' + (s.money < V.price ? 'disabled' : '') + '>BUY ' + U.fmtMoney(V.price) + '</button>') + '<button class="btn alt" data-a="back">BACK</button></div>';
      if (!own && s.money < V.price) h += '<p class="msg">You need ' + U.fmtMoney(V.price - s.money) + ' more. Try jobs and races!</p>';
      UI.panel(h, (root) => {
        on(root, '[data-a=back]', grid);
        on(root, '[data-a=buy]', () => { if (G.buy(k)) { G.switchVehicle(k, spot); UI.toast('🎉 You bought the ' + V.name + '!'); close(); } });
        on(root, '[data-a=drive]', () => { if (k !== s.cur) G.switchVehicle(k, spot); close(); });
      });
    };
    grid();
  };
  UI.raceMenu = function (rc, opts) {
    const G = GR.G, s = G.save; UI.dismissable = true; opts = opts || {};
    let diff = UI._diff || 'normal', laps = rc.laps || 1, ai = rc.ai;
    const render = () => {
      const fits = G.raceVehicleOk(rc);
      let h = '<h2>' + esc(rc.icon + ' ' + rc.name) + '</h2><p class="sub">' + esc(rc.desc) + '</p>';
      const P = GR.racePath(rc); h += '<p class="sub small">' + (rc.type === 'circuit' ? 'Circuit' : rc.type === 'air' ? 'Air time trial' : 'Point-to-point') + ' · ' + (P.pi.len / 1000).toFixed(1) + ' km' + (rc.type === 'circuit' ? ' per lap' : '') + '</p>';
      const bk = s.best[rc.id + (rc.type === 'air' ? '' : '_' + laps)]; const won = s.won[rc.id] || 0, medal = s.medals[rc.id];
      h += '<p class="sub">' + (bk ? '🏅 Best: <b>' + U.fmtTime(bk) + '</b>' : 'No best time yet') + (rc.type === 'air' ? (medal ? ' · ' + { gold: '🥇', silver: '🥈', bronze: '🥉' }[medal] : '') : (won ? ' · Won on ' + ['', 'Easy', 'Normal', 'Hard'][won] + ' 🏆' : '')) + '</p>';
      if (rc.type !== 'air') {
        h += '<h3>RIVALS</h3><div class="seg">' + ['easy', 'normal', 'hard'].map((d) => '<button data-d="' + d + '" class="' + (d === diff ? 'on' : '') + '">' + GR.DIFF[d].name + '</button>').join('') + '</div>';
        h += '<div class="seg">' + [0, 3, rc.ai].filter((v, i, a) => a.indexOf(v) === i).map((n) => '<button data-n="' + n + '" class="' + (n === ai ? 'on' : '') + '">' + (n ? n + ' NPC racers' : 'No NPCs') + '</button>').join('') + '</div>';
        if (rc.type === 'circuit') h += '<h3>LAPS</h3><div class="seg">' + [1, 2, 3].map((n) => '<button data-l="' + n + '" class="' + (n === laps ? 'on' : '') + '">' + n + '</button>').join('') + '</div>';
        h += '<p class="sub small">NPC rivals drive the same ride as you, so it\u2019s fair! Prize: up to ' + U.fmtMoney(rc.pay * GR.DIFF[diff].pay * (rc.type === 'circuit' ? laps / (rc.laps || 1) : 1)) + ' + clean-racing bonus.</p>';
      } else h += '<p class="sub small">Fly through all ' + (rc.pts3.length - 1) + ' rings. 🥇🥈🥉 medals for fast times. Prize up to ' + U.fmtMoney(rc.pay) + '.</p>';
      if (!fits.ok) h += '<p class="msg">' + esc(fits.msg) + '</p>';
      const online = G.room && G.room.count && G.room.count() > 1;
      h += '<div class="btnrow">';
      if (fits.ok || fits.loaner || fits.swap) h += '<button class="btn primary" data-a="go">' + (online ? (G.room.isHost ? 'RACE EVERYONE 🏁' : 'ASK HOST TO START 🏁') : 'START RACE 🏁') + '</button>';
      if (online) h += '<button class="btn blue small" data-a="solo">RACE SOLO</button>';
      h += '<button class="btn alt" data-a="close">LATER</button></div>';
      if (fits.loaner) h += '<p class="sub small">A free ' + esc(GR.VEH[fits.loaner].name) + ' is loaned to you for this race.</p>';
      if (fits.swap) h += '<p class="sub small">You\u2019ll race in your ' + esc(GR.VEH[fits.swap].name) + '.</p>';
      UI.panel(h, (root) => {
        on(root, '[data-d]', (e) => { diff = UI._diff = e.dataset.d; render(); });
        on(root, '[data-l]', (e) => { laps = +e.dataset.l; render(); });
        on(root, '[data-n]', (e) => { ai = +e.dataset.n; render(); });
        on(root, '[data-a=close]', close);
        on(root, '[data-a=go]', () => { close(); G.startRace(rc, { diff, laps, ai, online: online }); });
        on(root, '[data-a=solo]', () => { close(); G.startRace(rc, { diff, laps, ai, online: false }); });
      });
    };
    render();
  };
  UI.jobMenu = function (spot) {
    const G = GR.G, jid = spot.job, J = GR.JOBS[jid], ok = GR.Jobs.canDo(jid, G.me); UI.dismissable = true;
    let h = '<h2>' + esc(J.icon + ' ' + J.name) + '</h2><p class="sub">' + esc(J.desc) + '</p><p class="sub small">Done ' + (G.save.jobsDone[jid] || 0) + ' times</p>';
    if (!ok) { const who = GR.Jobs.whoCan(jid); h += '<p class="msg">Your ' + esc(G.me.V.name) + ' can\u2019t do this job.</p><p class="sub small">Works with: ' + who.map((k) => GR.VEH[k].icon + ' ' + GR.VEH[k].name + (G.save.owned[k] ? ' ✅' : ' (' + U.fmtMoney(GR.VEH[k].price) + ')')).join(', ') + '</p>'; }
    if (GR.Jobs.cur) h += '<p class="msg">Finish or cancel your current job first.</p>';
    h += '<div class="btnrow">' + (ok && !GR.Jobs.cur ? '<button class="btn primary" data-a="go">START JOB</button>' : '') + '<button class="btn alt" data-a="close">LATER</button></div>';
    UI.panel(h, (root) => { on(root, '[data-a=close]', close); on(root, '[data-a=go]', () => { close(); GR.Jobs.start(jid, spot); }); });
  };
  UI.jobDone = function (j, pay, notes) {
    UI.dismissable = true;
    let h = '<h2>' + esc(j.def.icon) + ' JOB DONE!</h2><div class="paybox">+' + U.fmtMoney(pay) + '</div>' + notes.map((n) => '<p class="sub small">' + esc(n) + '</p>').join('');
    h += '<div class="btnrow"><button class="btn primary" data-a="again">ANOTHER ONE</button><button class="btn alt" data-a="close">DONE</button></div>';
    UI.panel(h, (root) => { on(root, '[data-a=close]', close); on(root, '[data-a=again]', () => { close(); if (GR.Jobs.canDo(j.id, GR.G.me)) GR.Jobs.start(j.id, j.spot); }); });
  };
  UI.results = function (r) {
    const R = r.result; UI.dismissable = false;
    const draw = () => {
      if (GR.Race.cur !== r) return;
      const list = GR.Race.standings();
      let h = '<h2>' + (r.air ? (R.medal ? { gold: '🥇 GOLD!', silver: '🥈 SILVER!', bronze: '🥉 BRONZE!' }[R.medal] : 'FINISHED!') : R.pos === 1 ? '🏆 YOU WON!' : '🏁 ' + ordinal(R.pos) + ' PLACE!') + '</h2>';
      h += '<p class="sub">' + esc(r.rc.name) + ' · ' + r.diff.name + (R.newBest ? ' · <b>NEW BEST!</b>' : '') + '</p>';
      h += '<table class="res">' + list.map((e, i) => '<tr class="' + (e.me ? 'me' : '') + '"><td>' + (i + 1) + '</td><td>' + esc(e.name) + (e.friend ? ' 👫' : '') + '</td><td>' + (e.fin != null ? U.fmtTime(e.fin) : 'racing…') + '</td></tr>').join('') + '</table>';
      if (r.air && r.medals) h += '<p class="sub small">🥇 ' + U.fmtTime(r.medals.gold) + ' · 🥈 ' + U.fmtTime(r.medals.silver) + ' · 🥉 ' + U.fmtTime(r.medals.bronze) + '</p>';
      h += '<div class="paybox">+' + U.fmtMoney(R.pay) + (R.cleanBonus ? ' <small>+ ' + U.fmtMoney(R.cleanBonus) + ' ✨ CLEAN RACING</small>' : '') + '</div>';
      if (!R.clean) h += '<p class="sub small">Tip: finish without crashing for a 25% clean-racing bonus!</p>';
      h += '<div class="btnrow"><button class="btn primary" data-a="again">RACE AGAIN</button><button class="btn alt" data-a="done">DONE</button></div>';
      UI.panel(h, (root) => {
        on(root, '[data-a=done]', () => { clearInterval(iv); close(); GR.Race.stop(); });
        on(root, '[data-a=again]', () => { clearInterval(iv); close(); const rc = r.rc; GR.Race.stop(); GR.G.startRace(rc, { diff: r.diffKey, laps: r.laps, ai: r.aiCount, online: !!r.online }); });
      });
    };
    const iv = setInterval(() => { if (GR.Race.cur !== r || !UI.isOpen()) { clearInterval(iv); return; } const st = GR.Race.standings(); const k = st.map((e) => e.fin).join(','); if (k !== UI._resK) { UI._resK = k; draw(); } }, 1000);
    draw();
  };
  UI.map = function () {
    const G = GR.G; UI.dismissable = true;
    let h = '<h2>🗺️ MAP</h2><canvas id="mapCv" width="600" height="600"></canvas><div class="legend"><span>🟢 Garage</span><span>🟡 Dealer</span><span>🔵 Job</span><span>🟣 Race</span><span>🩷 You</span></div><p class="sub small">Tap a place to set your GPS.</p>';
    const canFT = !GR.Race.cur && !GR.Jobs.cur && !G.passenger;
    h += '<h3>FAST TRAVEL</h3>' + (canFT ? '<div class="ftlist">' + GR.SPOTS.filter((s) => s.type === 'garage' || s.type === 'dealer').map((s) => '<button class="btn blue" data-ft="' + s.id + '">' + esc(s.icon + ' ' + s.name.replace(' Garage', '').replace('Grok Motors Dealership', 'Grok Motors')) + '</button>').join('') + '</div>' : '<p class="sub small">Finish your race or job to fast travel.</p>');
    h += '<div class="btnrow">' + (G.gpsPick ? '<button class="btn alt small" data-a="clear">CLEAR GPS</button>' : '') + '<button class="btn alt" data-a="close">CLOSE</button></div>';
    UI.panel(h, (root) => {
      const cv = root.querySelector('#mapCv'), x = cv.getContext('2d');
      x.drawImage(UI.baseMap(), 0, 0, 600, 600);
      const P = (wx, wz) => [(wx + 1500) * 0.2, (wz + 1500) * 0.2];
      x.font = 'bold 13px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      const names = { city: [650, -50], town: [-450, 450], desert: [300, 1250], tundra: [100, -1250], mountain: [-850, -350], lake: [-60, 100], airfield: [1150, 250] };
      for (const k in names) { const p = P(names[k][0], names[k][1]); x.fillStyle = 'rgba(58,23,71,.75)'; const t = W.REGION_NAMES[k]; const w = x.measureText(t).width + 10; x.fillRect(p[0] - w / 2, p[1] - 9, w, 18); x.fillStyle = '#fff'; x.fillText(t, p[0], p[1]); }
      GR.SC.markers.forEach((m) => { const p = P(m.s.x, m.s.z); x.fillStyle = SPOTCOL[m.s.type]; x.beginPath(); x.arc(p[0], p[1], 7, 0, 7); x.fill(); x.strokeStyle = '#3a1747'; x.lineWidth = 2; x.stroke(); });
      const v = G.viewVeh(); const pp = P(v.x, v.z); x.fillStyle = '#ff4fd8'; x.beginPath(); x.arc(pp[0], pp[1], 9, 0, 7); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 3; x.stroke();
      for (const k in G.remotes) { const r = G.remotes[k]; if (r.veh) { const p = P(r.veh.x, r.veh.z); x.fillStyle = r.color; x.beginPath(); x.arc(p[0], p[1], 7, 0, 7); x.fill(); x.stroke(); } }
      const tg = G.gpsTarget(); if (tg) { const p = P(tg.x, tg.z); x.strokeStyle = '#3ff0ff'; x.lineWidth = 4; x.beginPath(); x.arc(p[0], p[1], 12, 0, 7); x.stroke(); }
      cv.addEventListener('click', (e) => {
        const r = cv.getBoundingClientRect(), mx = (e.clientX - r.left) / r.width * 600, my = (e.clientY - r.top) / r.height * 600;
        let best = null, bd = 30; GR.SC.markers.forEach((m) => { const p = P(m.s.x, m.s.z), d = Math.hypot(p[0] - mx, p[1] - my); if (d < bd) { bd = d; best = m.s; } });
        if (best) { G.setGps(best); UI.toast('GPS set: ' + best.name); close(); }
      });
      on(root, '[data-a=close]', close); on(root, '[data-a=clear]', () => { G.setGps(null); close(); });
      on(root, '[data-ft]', (e) => { const s = GR.SPOTS.find((q) => q.id === e.dataset.ft); close(); G.fastTravel(s); });
    });
  };
  UI.menu = function () {
    const G = GR.G; UI.dismissable = true; const s = G.save;
    let h = '<h2>⏸ PAUSED</h2>';
    if (G.room) h += '<p class="sub">Room code: <b style="letter-spacing:3px;font-size:22px">' + esc(G.room.code) + '</b><br><small>' + (G.room.count ? G.room.count() : 1) + '/3 players</small></p>';
    h += '<div class="btncol"><button class="btn primary" data-a="close">RESUME</button>';
    if (GR.Race.cur) h += '<button class="btn red" data-a="quitrace">QUIT RACE</button>';
    if (GR.Jobs.cur) h += '<button class="btn red" data-a="quitjob">CANCEL JOB</button>';
    h += '<button class="btn blue" data-a="map">🗺️ MAP & FAST TRAVEL</button><button class="btn alt small" data-a="stats">🏆 MY STATS</button><button class="btn alt small" data-a="help">❓ HOW TO PLAY</button><button class="btn alt small" data-a="snd">' + (GR.Snd.muted ? '🔇 SOUND OFF' : '🔊 SOUND ON') + '</button><button class="btn alt small" data-a="leave">' + (G.room ? 'LEAVE ONLINE GAME' : 'TITLE SCREEN') + '</button></div>';
    UI.panel(h, (root) => {
      on(root, '[data-a=close]', close); on(root, '[data-a=map]', () => UI.map()); on(root, '[data-a=help]', () => UI.help(true));
      on(root, '[data-a=quitrace]', () => { close(); G.quitRace(); }); on(root, '[data-a=quitjob]', () => { close(); GR.Jobs.cancel('Job cancelled.'); });
      on(root, '[data-a=snd]', () => { GR.Snd.setMute(!GR.Snd.muted); UI.menu(); });
      on(root, '[data-a=leave]', () => { close(); G.toTitle(); });
      on(root, '[data-a=stats]', () => {
        const owned = Object.keys(s.owned).length, st = s.stats;
        let x = '<h2>🏆 MY STATS</h2><div class="list">' + [['💵', 'Money earned', U.fmtMoney(st.earned || 0)], ['🏁', 'Races / wins', (st.races || 0) + ' / ' + (st.wins || 0)], ['🧰', 'Jobs done', st.jobs || 0], ['🚗', 'Rides owned', owned + ' / ' + GR.VEH_ORDER.length], ['💥', 'Crashes', st.crashes || 0], ['🛣️', 'Distance', ((st.dist || 0) / 1609).toFixed(1) + ' miles']].map((r) => '<div class="li"><span class="ico">' + r[0] + '</span><div class="grow">' + r[1] + '</div><b>' + r[2] + '</b></div>').join('') + '</div>';
        x += '<h3>BEST TIMES</h3><div class="list">' + GR.RACES.map((rc) => { const keys = Object.keys(s.best).filter((k) => k === rc.id || k.indexOf(rc.id + '_') === 0); const b = keys.map((k) => s.best[k]).sort((a, b) => a - b)[0]; return '<div class="li"><span class="ico">' + rc.icon + '</span><div class="grow">' + esc(rc.name) + '</div><b>' + (b ? U.fmtTime(b) : '--') + (s.won[rc.id] ? ' 🏆' : '') + (s.medals[rc.id] ? ' ' + { gold: '🥇', silver: '🥈', bronze: '🥉' }[s.medals[rc.id]] : '') + '</b></div>'; }).join('') + '</div><div class="btnrow"><button class="btn alt" data-a="close">BACK</button></div>';
        UI.panel(x, (r2) => on(r2, '[data-a=close]', () => UI.menu()));
      });
    });
  };
  UI.help = function (fromMenu) {
    UI.dismissable = true;
    const h = '<h2>❓ HOW TO PLAY</h2><ol class="help"><li><b>Drive:</b> drag the left stick to steer, hold <b>GAS</b> / <b>BRAKE</b> (hold brake to reverse).</li><li><b>Fly:</b> helicopter &amp; balloon use <b>UP/DOWN</b> and the stick to move. Planes: hold <b>FASTER</b> on a long road, then push the stick <b>up</b> to take off.</li><li>Drive into glowing circles: <span style="color:#16a34a">🟢 Garages</span> (repair, paint, upgrades, switch rides), <span style="color:#ca8a04">🟡 Dealers</span>, <span style="color:#0891b2">🔵 Jobs</span>, <span style="color:#db2777">🟣 Races</span>.</li><li><b>Jobs</b> earn money: taxi, pizza, cargo, limo VIP, tow, sky tours, bus.</li><li><b>Races</b> vs NPCs or friends. Don\u2019t crash 💥 — clean racing pays a bonus!</li><li>Crashes add damage. At 100% you need a tow. Repair at any garage.</li><li>Stuck or flipped into the lake? Tap <b>↺</b> to reset.</li><li>🗺️ Map: set GPS and fast travel to garages.</li></ol><div class="btnrow"><button class="btn primary" data-a="close">GOT IT!</button></div>';
    UI.panel(h, (root) => on(root, '[data-a=close]', () => (fromMenu ? UI.menu() : close())));
  };
})();
