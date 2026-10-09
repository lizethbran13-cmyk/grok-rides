/* Grok Rides - main game: boot, save, player vehicle, camera, interactions, loop */
(function () {
  'use strict';
  const GR = window.GR, U = GR.U, W = GR.W, M = GR.M, T = THREE, UI = GR.UI, GN = window.GrokNet;
  const $ = (id) => document.getElementById(id);
  const G = GR.G = { remotes: {}, playing: false, camMode: 0, route: null, gpsPick: null, passenger: null, room: null };
  const KEY = 'grokRides.save.v1';
  const START = { x: 553, z: -120, yaw: Math.PI };

  // ---------- save ----------
  function defSave() { return { v: 1, money: 1500, owned: { compact: { color: '#ff4fd8', upg: {}, dmg: 0 } }, cur: 'compact', pos: null, best: {}, won: {}, medals: {}, stats: {}, jobsDone: {}, tut: 0 }; }
  function load() {
    let s = null; try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    const d = defSave(); if (!s || typeof s !== 'object') return d;
    for (const k in d) if (s[k] == null || typeof s[k] !== typeof d[k]) s[k] = d[k];
    if (!s.owned.compact) s.owned.compact = d.owned.compact;
    for (const k in s.owned) { if (!GR.VEH[k]) delete s.owned[k]; else { s.owned[k].upg = s.owned[k].upg || {}; s.owned[k].dmg = +s.owned[k].dmg || 0; } }
    if (!s.owned[s.cur]) s.cur = 'compact'; if (!isFinite(s.money)) s.money = 1500;
    return s;
  }
  G.save = load();
  G.buffs = {};
  G.persist = function () {
    const s = G.save; if (G.me && !G.me.loaner && s.owned[G.me.type]) { s.owned[G.me.type].dmg = Math.round(G.me.dmg); if (!GR.Race.cur && !G.passenger) s.pos = { x: +G.me.x.toFixed(1), z: +G.me.z.toFixed(1), yaw: +G.me.yaw.toFixed(2), t: G.me.type }; }
    // remember if you were walking / inside a building, so a reload puts you back there (not always in the driver's seat)
    const F = GR.Foot; if (G.me && F && !GR.Race.cur && !G.passenger) s.foot = F.active ? { x: +F.x.toFixed(1), z: +F.z.toFixed(1), yaw: +F.yaw.toFixed(2), inside: F.inside ? F.inside.id : null } : null;
    if (G.tod != null) s.tod = +G.tod.toFixed(3);
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  };
  G.myName = () => GN.cleanName(($('nameIn').value || GN.savedProfile().name || 'Player'));
  G.myColor = () => G.color || GN.savedProfile().color;

  // ---------- boot ----------
  G.init = function () {
    const cv = $('c');
    const R = G.renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
    G.pr = Math.min(window.devicePixelRatio || 1, 3); G.prMax = G.pr; R.setPixelRatio(G.pr); // FULL quality by default (phones too); only the measured-FPS fallback below steps down R.setSize(innerWidth, innerHeight);
    
    const sc = G.scene = new T.Scene(); sc.background = new T.Color('#bfe6ff'); sc.fog = new T.Fog(0xcfeaff, 260, 1150);
    G.cam = new T.PerspectiveCamera(70, innerWidth / innerHeight, 0.5, 3200); G.cam.position.set(START.x, 60, START.z + 60);
    // lighting: soft sky fill + a warm sun that casts real shadows around you (cars, people) so things sit on the ground
    G.hemi = new T.HemisphereLight(0xd6ecff, 0x7c8a60, 0.58); sc.add(G.hemi);
    const sun = G.sun = new T.DirectionalLight(0xfff0d8, 0.88); G.sunDir = new T.Vector3(0.45, 1, 0.3).normalize(); sun.position.copy(G.sunDir).multiplyScalar(90); sc.add(sun); sc.add(sun.target);
    R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap; R.shadowMap.autoUpdate = true;
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const sc2 = sun.shadow.camera; sc2.left = -34; sc2.right = 34; sc2.top = 34; sc2.bottom = -34; sc2.near = 5; sc2.far = 220; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
    M.initEnv(R);
    window.addEventListener('resize', onResize); onResize();
    $('loading').classList.remove('hidden');
    setTimeout(() => {
      const t0 = performance.now();
      W.build(); GR.SC.build(sc); W.buildGraph();
      sc.traverse((o) => { if (o.isMesh && o !== GR.SC.sky && o.material && !o.material.transparent && o.material.type !== 'MeshBasicMaterial' && !o.isInstancedMesh) o.receiveShadow = true; }); GR.FX.init(sc); GR.Traffic.init(sc); GR.Fun.init(sc); GR.DN.init(sc); UI.initControls(); setupTitle(); setupLook();
      G.buildMs = Math.round(performance.now() - t0); $('loading').classList.add('hidden');
      if (G.gfx === 'low' && G.setQuality) G.setQuality('low', true);
      G.ready = true; requestAnimationFrame(loop);
      const prm = GN.params(); if (prm) { G.fromHub = true; G.color = prm.color; $('nameIn').value = prm.name; if (prm.mode === 'host') GR.Net.host(prm.code); else GR.Net.join(prm.code); }
    }, 30);
  };
  function onResize() { const w = innerWidth, h = innerHeight; G.renderer.setSize(w, h); G.cam.aspect = w / h; G.baseFov = w < h ? 74 : 62; G.cam.fov = G.baseFov; G.cam.updateProjectionMatrix(); }
  function setupTitle() {
    const prof = GN.savedProfile(); $('nameIn').value = prof.hasName ? prof.name : (G.save.name || ''); G.color = prof.color;
    const cols = GN.COLORS.concat(['#38bdf8', '#ffffff']); const row = $('colorRow');
    cols.forEach((c) => { const b = document.createElement('button'); b.style.background = c; b.type = 'button'; if (c === G.color) b.classList.add('on'); b.addEventListener('click', () => { G.color = c; row.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); }); row.appendChild(b); });
    $('bSolo').addEventListener('click', () => { GR.Snd.unlock(); saveProfile(); G.start('solo'); });
    $('bOnline').addEventListener('click', () => { saveProfile(); $('scrTitle').classList.add('hidden'); $('scrOnline').classList.remove('hidden'); });
    $('bHow').addEventListener('click', () => UI.help(false));
    $('bOnlineBack').addEventListener('click', () => { $('scrOnline').classList.add('hidden'); $('scrTitle').classList.remove('hidden'); });
    $('bHost').addEventListener('click', () => { GR.Snd.unlock(); GR.Net.host(); });
    $('bJoin').addEventListener('click', () => { GR.Snd.unlock(); const c = GN.normalizeCode($('codeIn').value); if (!GN.validCode(c)) { $('onlineMsg').textContent = 'Type the 5-letter code from your friend.'; return; } GR.Net.join(c); });
  }
  function saveProfile() { GN.saveProfile(G.myName(), G.color); G.save.name = G.myName(); }

  // ---------- start / vehicle ----------
  G.start = function (mode) {
    $('scrTitle').classList.add('hidden'); $('scrOnline').classList.add('hidden'); $('hud').classList.remove('hidden');
    G.mode = mode; G.playing = true; G.gpsPick = null;
    if (!G.me) {
      const s = G.save, p = s.pos;
      makeMe(s.cur);
      if (GR.Home) GR.Home.refreshAll();
      if (GR.Home && GR.Home.spawnOnLoad()) { /* you own a home: wake up there (ride parked in the driveway) */ }
      else if (p && p.t === s.cur && Math.abs(p.x) < 1440 && Math.abs(p.z) < 1440 && !(GR.VEH[s.cur].kind === 'ground' && W.waterDepth(p.x, p.z) > 0.5) && !W.blocked(p.x, p.z, Math.min(G.me.Wd, 3) / 2 + 0.3)) G.me.place(p.x, p.z, p.yaw);
      else spawnAt({ x: START.x, z: START.z, id: 'start' }, G.me, START.yaw);
      restoreFoot(s.foot);
    }
    G.camSnap = true;
    if (!G.save.tut) { G.save.tut = 1; G.persist(); setTimeout(() => UI.help(false), 400); UI.toast('Welcome to GROK RIDES! Drive into glowing circles to do stuff 🚗'); }
  };
  // reload while walking or inside a shop: put you back on foot / inside, with your ride parked where it was
  function restoreFoot(f) {
    const F = GR.Foot; if (!f || G.room || !F) return;
    try {
      if (f.inside) { const p = GR.PL.find(f.inside) || (GR.Home && GR.Home.find(f.inside)); if (p && F.getOut()) { F.enter(p, true); return; } }
      if (Math.abs(f.x) < 1440 && Math.abs(f.z) < 1440 && !W.blocked(f.x, f.z, 0.4) && W.waterDepth(f.x, f.z) < 0.5 && Math.hypot(f.x - G.me.x, f.z - G.me.z) < 600 && F.getOut()) { F.x = f.x; F.z = f.z; F.y = W.gy(f.x, f.z); F.yaw = F.camYaw = f.yaw || 0; G.camSnap = true; }
    } catch (e) { console.warn('restore foot', e); }
  }
  G.restoreFoot = restoreFoot;
  function makeMe(type, loaner) {
    const s = G.save, o = loaner ? { color: GR.VEH[type].color || '#ff4fd8', upg: {}, dmg: 0 } : s.owned[type];
    const boost = G.me ? G.me.boost : 0.6;
    if (G.me) G.me.dispose(G.scene);
    const v = new GR.Veh(type, o.color, { upg: o.upg, dmg: o.dmg, rim: o.rim, glow: o.glow, beam: true, boost, rider: G.myColor() }); v.loaner = !!loaner; v.isMe = true; G.scene.add(v.model); G.me = v;
    UI.setControlMode(v.kind); return v;
  }
  function spawnAt(spot, v, yaw) {
    let x = spot.x, z = spot.z;
    if (v.kind === 'boat') { const sp = (GR.SPOTS.find((q) => q.id === 'marina') || {}).spawn; x = sp.x; z = sp.z; yaw = Math.PI / 2; }
    else if (yaw == null) {
      const r = W.nearestRoad(x, z, true); yaw = r.yaw;
      // never spawn inside a wall / lamp post / tree: hop to the nearest road instead
      if (v.kind !== 'boat' && (W.blocked(x, z, Math.min(v.Wd, 3) / 2 + 0.4) || W.waterDepth(x, z) > 0.3) && r.d < 200) { x = r.x; z = r.z; }
    }
    if (GR.Traffic.clearNear) GR.Traffic.clearNear(x, z, Math.max(10, v.L + 6)); // no bus parked on top of your new ride
    v.place(x, z, yaw || 0); G.camSnap = true;
  }
  G.canSpawnHere = (k, spot) => GR.VEH[k].kind !== 'boat' || (spot && (spot.id === 'g_marina' || spot.id === 'marina'));
  G.switchVehicle = function (type, spot) {
    if (GR.Race.cur) return; G.persist();
    const was = { x: G.me.x, z: G.me.z }; // grab the old spot BEFORE the old ride is replaced (it used to drop new rides at 0,0)
    if (!spot && G.foot && !GR.Foot.inside) { was.x = GR.Foot.x; was.z = GR.Foot.z; }
    G.save.cur = type; makeMe(type); spawnAt(spot || was, G.me); UI.resetInput(); G.persist();
    if (G.foot) { UI.setControlMode('foot'); if (!GR.Foot.inside && Math.hypot(G.me.x - GR.Foot.x, G.me.z - GR.Foot.z) > 30) UI.toast('🚗 Your ' + GR.VEH[type].name + ' is parked at ' + (spot && spot.name ? spot.name : 'the lot') + '.'); else if (GR.Foot.inside) UI.toast('🚗 Your ' + GR.VEH[type].name + ' is parked right outside!'); }
    if (GR.Jobs.cur && !GR.Jobs.canDo(GR.Jobs.cur.id, G.me)) GR.Jobs.cancel('Job cancelled: this ride can\u2019t do that job.');
    GR.Snd.fx('ui');
  };
  G.priceScale = (k) => 0.6 + GR.VEH[k].price / 20000;
  G.repairCost = function () { const c = Math.round(G.me.dmg * 5 * G.priceScale(G.me.type)); return Math.min(c, Math.max(0, G.save.money)); };
  G.repair = function () { const c = G.repairCost(); G.save.money -= c; G.me.dmg = 0; undent(G.me); G.dmgTier = 0; GR.Snd.fx('buy'); UI.toast(c ? '🔧 Good as new! (' + U.fmtMoney(c) + ')' : '🔧 Good as new! The mechanic did it for free.'); G.repairFx(); G.persist(); };
  // sparkly "good as new" feedback: twinkles all over the ride + it does a happy little bounce
  G.repairFx = function () { const v = G.me; if (!v) return; for (let i = 0; i < 4; i++) setTimeout(() => { GR.FX.sparks(v.x + (Math.random() - 0.5) * v.Wd, v.y + 1 + Math.random(), v.z + (Math.random() - 0.5) * v.L, 10); }, i * 120); GR.FX.pop('✨ GOOD AS NEW!', v.x, v.y + 3.5, v.z, '#7CFC9A', 4); if (v.sp) v.sp.vy += 3; };
  G.style = function (k, val) { // rims / underglow customisation
    if (G.me.loaner) return false; const o = G.save.owned[G.me.type], tab = k === 'rim' ? M.RIMS : M.GLOWS, it = tab[val]; if (!it || o[k] === val) return false;
    o.own = o.own || {}; const key = k + ':' + val, price = o.own[key] ? 0 : it.price;
    if (G.save.money < price) { UI.toast('That costs ' + U.fmtMoney(price) + '.', true); return false; }
    G.save.money -= price; o.own[key] = 1; o[k] = val; if (k === 'rim') M.setRims(G.me.model, val); else M.setGlow(G.me.model, val);
    GR.Snd.fx('buy'); UI.toast(k === 'rim' ? '🛞 New rims: ' + it.name + '!' : '✨ Underglow: ' + it.name + '!'); G.persist(); return true;
  };
  G.buy = function (k) { const V = GR.VEH[k]; if (G.save.owned[k] || G.save.money < V.price) return false; G.save.money -= V.price; G.save.owned[k] = { color: V.color || '#ff4fd8', upg: {}, dmg: 0 }; GR.Snd.fx('buy'); G.persist(); return true; };
  G.paint = function (c) { if (G.me.loaner) return; if (G.save.money < 100) { UI.toast('Paint costs $100.', true); return; } G.save.money -= 100; G.save.owned[G.me.type].color = c; G.me.color = c; M.repaint(G.me.model.userData.body, c, GR.VEH[G.me.type].accent); GR.UI.thumb(G.me.type, c); GR.Snd.fx('buy'); G.persist(); };
  G.upgrade = function (k) { const o = G.save.owned[G.me.type], u = GR.UPG[k], lv = o.upg[k] || 0; if (lv >= u.max) return; const c = Math.round(u.cost[lv] * G.priceScale(G.me.type)); if (G.save.money < c) return; G.save.money -= c; o.upg[k] = lv + 1; G.me.upg = o.upg; GR.Snd.fx('buy'); UI.toast(u.icon + ' ' + u.name + ' upgraded to level ' + (lv + 1) + '!'); G.persist(); };
  G.earn = function (n, pop) { G.save.money += n; G.save.stats.earned = (G.save.stats.earned || 0) + n; if (pop !== false && G.me) GR.FX.pop('+' + U.fmtMoney(n), G.me.x, G.me.y + 4, G.me.z, '#7CFC9A', 4); GR.Snd.fx('coin'); };

  // dents (crumple) on the body mesh
  function dent(v, ev) {
    const body = v.model.userData.body, g = body.geometry, pos = g.attributes.position; if (!g.userData.orig) g.userData.orig = pos.array.slice();
    const lp = v.model.worldToLocal(new T.Vector3(ev.x, v.y + 0.8, ev.z)); const a = Math.min(0.28, (ev.s - 8) * 0.012), R = 1.7;
    const arr = pos.array; for (let i = 0; i < arr.length; i += 3) { const dx = arr[i] - lp.x, dz = arr[i + 2] - lp.z, d = Math.hypot(dx, dz); if (d < R) { const k = (1 - d / R) * a; arr[i] -= Math.sign(arr[i]) * k * 0.6; arr[i + 2] -= Math.sign(arr[i + 2]) * k; arr[i + 1] -= k * 0.25; } }
    pos.needsUpdate = true;
  }
  function undent(v) { const g = v.model.userData.body.geometry; if (g.userData.orig) { g.attributes.position.array.set(g.userData.orig); g.attributes.position.needsUpdate = true; } }
  G.dent = dent;

  // ---------- actions ----------
  G.nitro = function () { const v = G.me; if (G.foot || G.passenger || !G.playing) return; if (v.fireNitro()) { GR.Snd.fx('nitro'); UI.bigText('🔥 NITRO!'); } else if (v.nitro <= 0) UI.toast('🔥 Nitro is charging — drift and jump to fill it up faster!'); };
  G.horn = function () { if (G.foot) return; const v = G.me; if (v.type === 'icecream') GR.Snd.fx('jingle'); else if (v.type === 'police') { GR.Snd.fx('siren'); G.siren = 4; } else if (v.V.horn) GR.Snd.fx(v.V.horn); else GR.Snd.fx('horn'); GR.Net.event && GR.Net.event({ e: 'horn', ty: v.type }); };
  G.cycleCam = function () { G.camMode = (G.camMode + 1) % 3; UI.toast(['📷 Chase camera', '📷 Far camera', '📷 Driver camera'][G.camMode]); };
  G.resetVehicle = function (manual) {
    if (G.passenger || (G.foot && manual)) return; const v = G.me;
    const rp = GR.Race.resetPoint(); if (rp) { v.place(rp.x, rp.z, rp.yaw, rp.y != null ? rp.y : null); if (rp.y != null && v.kind === 'plane') { v.vF = 28; v.thr = 0.6; v.air = true; } G.camSnap = true; return; }
    if (v.kind === 'boat') { if (W.height(v.x, v.z) > -0.3) spawnAt({ x: 0, z: 0 }, v); else { v.vx = v.vz = 0; v.vF = 0; } G.camSnap = true; return; }
    const r = W.nearestRoad(v.x, v.z, true); v.place(r.x, r.z, r.yaw); G.camSnap = true; if (manual) UI.toast('↺ Back on the road!');
  };
  G.fastTravel = function (s) {
    if (GR.Race.cur || GR.Jobs.cur) return; GR.Foot.forceBack(); const v = G.me;
    if (v.kind === 'boat' && !G.canSpawnHere('boat', s)) { UI.toast('Boats can only go to Sparkle Marina. Switch rides at a garage first.', true); return; }
    $('fade').classList.add('on'); setTimeout(() => { spawnAt(s, v); $('fade').classList.remove('on'); UI.toast('🗺️ Welcome to ' + s.name + '!'); }, 320);
  };
  G.setGps = function (s) { G.gpsPick = s; G.route = null; G.routeKey = ''; };
  G.gpsTarget = function () {
    const r = GR.Race.nextTarget(); if (r) return r;
    const j = GR.Jobs.target(); if (j) return j;
    if (G.gpsPick) { if (Math.hypot(G.gpsPick.x - G.me.x, G.gpsPick.z - G.me.z) < 12) { G.gpsPick = null; return null; } return G.gpsPick; }
    return null;
  };
  G.setTime = (t) => GR.DN.setTime(t);
  G.camYaw = () => (G.foot ? GR.Foot.camYaw : G.camYawV || 0);
  G.toggleFoot = function () {
    if (!G.playing || UI.isOpen()) return; if (G.passenger) { G.hopOut(); return; }
    const F = GR.Foot;
    if (!G.foot) { F.getOut(); return; }
    if (F.inside) { UI.toast('🚪 Walk to the glowing EXIT door to go outside.'); return; }
    if (!F.getIn()) { if (G.me.kind === 'ground') F.callRide(); else UI.toast('Walk back to your ' + GR.VEH[G.me.type].name + ' to get in.'); }
  };
  const footView = { x: 0, y: 0, z: 0, yaw: 0, vF: 0, type: 'foot', kind: 'foot', L: 1, speed: () => 0 };
  G.viewVeh = function () { if (G.foot) { const F = GR.Foot; footView.x = F.x; footView.y = F.y; footView.z = F.z; footView.yaw = F.camYaw; footView.vF = F.spd; return footView; } if (G.passenger) { const r = G.remotes[G.passenger]; if (r && r.veh) return r.veh; } return G.me; };
  G.remoteList = function () { const l = []; for (const k in G.remotes) { const r = G.remotes[k]; if (r.veh && r.veh.model.visible) l.push(r.veh); } return l; };
  G.raceVehicleOk = function (rc) {
    const v = G.me;
    if (rc.vehicle === 'boat') return v.kind === 'boat' ? { ok: true } : { ok: false, loaner: 'boat', msg: 'This is a boat race.' };
    if (rc.type === 'air') return (v.kind === 'heli' || v.kind === 'plane') ? { ok: true } : { ok: false, loaner: 'heli', msg: 'This is a flying race.' };
    if (v.kind === 'ground') return { ok: true };
    const g = Object.keys(G.save.owned).filter((k) => GR.VEH[k].kind === 'ground').sort((a, b) => GR.VEH[b].vmax - GR.VEH[a].vmax)[0] || 'compact';
    return { ok: false, swap: g, msg: 'This race is for cars and trucks.' };
  };
  G.startRace = function (rc, o) {
    if (GR.Jobs.cur) GR.Jobs.cancel('Job cancelled for the race.');
    if (G.passenger) G.hopOut();
    if (o.online && G.room && !G.room.isHost) { GR.Net.requestRace(rc, o); UI.toast('Asked the host to start ' + rc.name + '!'); return; }
    if (o.online && G.room && G.room.isHost) { GR.Net.inviteRace(rc, o); return; }
    G.beginRace(rc, o, null, 0);
  };
  G.beginRace = function (rc, o, online, slot) {
    UI.close(); GR.Foot.forceBack(); if (GR.Jobs.cur) GR.Jobs.cancel(); if (G.passenger) G.hopOut();
    const fit = G.raceVehicleOk(rc);
    if (!fit.ok) { G.prevType = G.me.loaner ? G.prevType : G.save.cur; G.persist(); if (fit.loaner) makeMe(fit.loaner, true); else { G.save.cur = fit.swap; makeMe(fit.swap); } }
    GR.Race.start(rc, { diff: o.diff, laps: o.laps, ai: o.ai, online, slot }); G.camSnap = true;
  };
  G.afterRace = function () {
    if (G.me.loaner) { const t = G.prevType || G.save.cur; const x = G.me.x, z = G.me.z; makeMe(t); const kind = G.me.kind; if (kind === 'boat') spawnAt({ x: 0, z: 0 }, G.me); else { const r = W.nearestRoad(x, z, true); G.me.place(r.x, r.z, r.yaw); } G.camSnap = true; }
    G.persist();
  };
  G.quitRace = function () { if (!GR.Race.cur) return; GR.Race.stop(); UI.toast('Race quit.'); };
  G.toTitle = function () { GR.Foot.forceBack(); if (GR.Race.cur) GR.Race.stop(true); if (GR.Jobs.cur) GR.Jobs.cancel(); GR.Net.leave(); G.persist(); location.href = GN.soloUrl(); };

  // what can I do here?
  G.actOption = function () {
    if (!G.playing) return null;
    if (G.foot) return GR.Foot.actOption();
    if (G.passenger) return { label: '🚪 HOP OUT', fn: G.hopOut };
    if (GR.Race.cur) return null;
    const v = G.me;
    const air = GR.isAir(v.type), hgt = v.y - W.height(v.x, v.z);
    if (v.dmg >= 100) {
      const g = GR.SPOTS.find((s) => s.type === 'garage' && Math.hypot(s.x - v.x, s.z - v.z) < 12);
      return g ? { label: '🔧 GARAGE', fn: () => UI.garage(g) } : { label: '🛻 CALL A TOW (FREE)', fn: towMe };
    }
    // a friend's car right next to you beats a nearby shop door
    if (G.room && !GR.Jobs.cur && v.speed() < 4) {
      for (const k in G.remotes) { const r = G.remotes[k]; if (!r.veh || r.ride || r.foot || !r.veh.model.visible || r.inRace) continue; if (Math.hypot(r.veh.x - v.x, r.veh.z - v.z) < 9 && Math.abs(r.veh.y - v.y) < 4) return { label: '🚗 HOP IN WITH ' + r.name.toUpperCase(), fn: () => G.hopIn(k) }; } // r.foot: friend walked off, their car is just parked
    }
    const door = v.speed() < 3 && (!air || hgt < 1.5) ? GR.Foot.nearDoor(v.x, v.z, 13) : null;
    if (door && door.kind === 'myhome' && Math.hypot(door.door.x - v.x, door.door.z - v.z) < 8.5) return GR.Home.doorOption(door, true);
    if (door && Math.hypot(door.door.x - v.x, door.door.z - v.z) < 8.5) return { label: '🚶 GO INTO ' + door.short, fn: () => { if (GR.Foot.getOut()) GR.Foot.enter(door); } };
    if (v.speed() < 16 && (!air || hgt < 8)) {
      let best = null, bd = 10;
      for (const m of GR.SC.markers) { const d = Math.hypot(m.s.x - v.x, m.s.z - v.z); if (d < bd) { bd = d; best = m.s; } }
      if (best) {
        if (best.type === 'garage') return { label: '🔧 GARAGE', fn: () => UI.garage(best) };
        if (best.type === 'dealer') return { label: best.icon + ' SHOP: ' + best.name.split(' (')[0], fn: () => UI.dealer(best) };
        if (best.type === 'job') return GR.Jobs.cur ? null : { label: GR.JOBS[best.job].icon + ' ' + GR.JOBS[best.job].name.toUpperCase(), fn: () => UI.jobMenu(best) };
        if (best.type === 'race') { const rc = GR.RACES.find((q) => q.id === best.race); return { label: '🏁 RACE: ' + rc.name, fn: () => UI.raceMenu(rc) }; }
      }
    }
    const fo = GR.Fun && GR.Fun.actOption(v); if (fo) return fo;
    if (door && door.kind === 'myhome') return GR.Home.doorOption(door, true);
    if (door) return { label: '🚶 GO INTO ' + door.short, fn: () => { if (GR.Foot.getOut()) GR.Foot.enter(door); } };
    if (v.dmg >= 60 && !GR.Jobs.cur && !G.gpsPick) { const gq = GR.Jobs.nearestGarage(v.x, v.z); if (gq) return { label: '🔧 GPS TO GARAGE', fn: () => { G.setGps(gq); UI.toast('🔧 GPS set to ' + gq.name + '.'); } }; }
    return null;
  };
  G.act = function () { const o = G.actOption(); if (o) o.fn(); };
  function towMe() {
    const v = G.me, g = GR.Jobs.nearestGarage(v.x, v.z); if (GR.Jobs.cur) GR.Jobs.cancel('Job cancelled: your ride got towed.');
    $('fade').classList.add('on'); setTimeout(() => { const kind = v.kind; spawnAt(kind === 'boat' ? { x: 0, z: 0 } : g, v); v.dmg = Math.max(0, v.dmg - 0); $('fade').classList.remove('on'); UI.toast('🛻 Tony the tow truck brought you to ' + g.name + '. Tap GARAGE to repair!'); }, 350);
  }
  G.hopIn = function (pid) { const r = G.remotes[pid]; if (!r) return; G.passenger = pid; G.me.model.visible = false; G.me.vx = G.me.vz = 0; G.me.vF = 0; UI.toast('🚗 You hopped in with ' + r.name + '!'); GR.Net.sendNow(); };
  G.hopOut = function () {
    const r = G.remotes[G.passenger]; G.passenger = null; G.me.model.visible = true;
    if (r && r.veh) { const fx = Math.sin(r.veh.yaw), fz = Math.cos(r.veh.yaw); const x = r.veh.x - fz * 5, z = r.veh.z + fx * 5; if (G.me.kind === 'boat') spawnAt({ x: 0, z: 0 }, G.me); else G.me.place(x, z, r.veh.yaw); }
    G.camSnap = true; UI.toast('🚪 You hopped out.'); GR.Net.sendNow();
  };

  // ---------- camera ----------
  const look = { off: 0, pitch: 0, id: null, t: 0 };
  function setupLook() {
    const cv = $('c'); let lx = 0, ly = 0;
    cv.addEventListener('pointerdown', (e) => { look.id = e.pointerId; lx = e.clientX; ly = e.clientY; try { cv.setPointerCapture(e.pointerId); } catch (x) {} });
    cv.addEventListener('pointermove', (e) => { if (e.pointerId !== look.id) return; look.off -= (e.clientX - lx) * 0.008; look.pitch = U.clamp(look.pitch + (e.clientY - ly) * 0.004, -0.3, 0.8); lx = e.clientX; ly = e.clientY; look.t = 1.6; });
    const up = (e) => { if (e.pointerId === look.id) look.id = null; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  }
  const cp = new T.Vector3(), la = new T.Vector3(); let shake = 0;
  function updateCam(dt) {
    if (G.foot) { if (look.id == null) { look.t -= dt; if (look.t <= 0) { look.off *= Math.max(0, 1 - dt * 3); look.pitch *= Math.max(0, 1 - dt * 3); } } GR.Foot.cam(dt, G.cam, look); if (G.debugCam) { const d = G.debugCam; G.cam.position.set(d[0], d[1], d[2]); G.cam.lookAt(d[3], d[4], d[5]); } if (GR.SC.sky) GR.SC.sky.position.copy(G.cam.position); return; }
    const v = G.viewVeh(); if (!v) return; const air = GR.isAir(v.type);
    let target = v.yaw;
    // drifting: swing the camera part-way toward where the car is actually sliding, so you SEE the drift angle
    if (v.kind === 'ground' && !air && v.speed() > 8 && v.vF > 0) { const vy = Math.atan2(v.vx, v.vz); target = v.yaw + U.ang(vy - v.yaw) * 0.45; }
    if (look.id == null) { look.t -= dt; if (look.t <= 0) { look.off *= Math.max(0, 1 - dt * 3); look.pitch *= Math.max(0, 1 - dt * 3); } }
    G.camYawV = G.camSnap ? target : (G.camYawV || target) + U.ang(target - (G.camYawV || target)) * Math.min(1, dt * (air ? 2.5 : 3.6));
    const yaw = G.camYawV + look.off, L = v.L || 4, mode = G.camMode;
    const spd = Math.min(1, Math.abs(v.vF) / 40), boost = v.nitro > 0 ? 1 : 0;
    G.camPull = U.lerp(G.camPull || 0, spd * 1.6 + boost * 1.4, Math.min(1, dt * 2));
    let dist = [6.8 + L * 0.55 + G.camPull, 12 + L * 0.8 + G.camPull, 0][mode], h = [2.7 + L * 0.17 - spd * 0.4, 5 + L * 0.25, 0][mode];
    if (air) { dist = dist * 1.25 + (v.kind === 'balloon' ? 22 : 6); h += v.kind === 'balloon' ? 9 : 2; }
    if (v.type === 'monster') h += 1.5;
    h += look.pitch * dist;
    if (mode === 2) { const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw); const eye = v.kind === 'balloon' ? 2.4 : v.type === 'bigrig' || v.type === 'bus' ? 3.2 : v.type === 'monster' ? 3.3 : v.kind === 'heli' ? 2.3 : 1.45; cp.set(v.x + fx * L * 0.12, v.y + eye, v.z + fz * L * 0.12); la.set(v.x + Math.sin(yaw) * 30, v.y + eye - 1 - look.pitch * 10, v.z + Math.cos(yaw) * 30); }
    else { cp.set(v.x - Math.sin(yaw) * dist, v.y + h, v.z - Math.cos(yaw) * dist); la.set(v.x + Math.sin(yaw) * 4, v.y + 1.3 + (v.kind === 'balloon' ? 5 : air ? 1 : 0), v.z + Math.cos(yaw) * 4); }
    let gmin = Math.max(W.height(cp.x, cp.z), W.ellQ(W.LAKE, cp.x, cp.z) < 1.2 ? 0 : -99) + 1.2;
    if (mode !== 2) for (let k = 1; k <= 3; k++) { const f = k / 4, gx = U.lerp(cp.x, v.x, f), gz = U.lerp(cp.z, v.z, f), need = W.height(gx, gz) + 1.5, lineY = U.lerp(cp.y, v.y + 1.3, f); if (need > lineY) gmin = Math.max(gmin, cp.y + (need - lineY) / (1 - f)); }
    if (cp.y < gmin) cp.y = Math.min(gmin, v.y + 40);
    if (mode !== 2) camWalls(v, cp);
    if (G.camSnap) { G.cam.position.copy(cp); G.camSnap = false; } else G.cam.position.lerp(cp, Math.min(1, dt * (mode === 2 ? 30 : 9)));
    if (shake > 0) { shake = Math.max(0, shake - dt * 2); G.cam.position.x += (Math.random() - 0.5) * shake; G.cam.position.y += (Math.random() - 0.5) * shake; }
    G.cam.lookAt(la);
    const fov = G.baseFov + U.clamp((Math.abs(v.vF) - 25) * 0.25, 0, 10) + (v.nitro > 0 ? 6 : 0); if (Math.abs(G.cam.fov - fov) > 0.2) { G.cam.fov += (fov - G.cam.fov) * Math.min(1, dt * 3); G.cam.updateProjectionMatrix(); }
    if (G.debugCam) { const d = G.debugCam; G.cam.position.set(d[0], d[1], d[2]); G.cam.lookAt(d[3], d[4], d[5]); }
    if (GR.SC.sky) GR.SC.sky.position.copy(G.cam.position);
  }
  // don't let the chase camera sit inside a building: pull it in front of the first wall between car and camera
  const camNear = [];
  function camWalls(v, cp) {
    const ox = v.x, oz = v.z, dx = cp.x - ox, dz = cp.z - oz, len = Math.hypot(dx, dz); if (len < 1) return;
    let tMin = 1; W.near(ox + dx / 2, oz + dz / 2, len / 2 + 2, camNear);
    for (const c of camNear) {
      if (c.t !== 'b' || c.top < cp.y - 0.5 || c.top - v.y < 3) continue;
      let t0 = 0, t1 = 1; const ax = [[ox, dx, c.x0 - 0.4, c.x1 + 0.4], [oz, dz, c.z0 - 0.4, c.z1 + 0.4]]; let hit = true;
      for (const [o, d, lo, hi] of ax) { if (Math.abs(d) < 1e-6) { if (o < lo || o > hi) { hit = false; break; } continue; } let a = (lo - o) / d, b = (hi - o) / d; if (a > b) { const q = a; a = b; b = q; } t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) { hit = false; break; } }
      if (hit && t0 > 0.05 && t0 < tMin) tMin = t0;
    }
    if (tMin < 1) { const k = Math.max(0.25, tMin - 0.6 / len); cp.x = ox + dx * k; cp.z = oz + dz * k; cp.y = Math.max(cp.y, v.y + 2.2 + (1 - k) * 3); }
  }
  // keep the shadow box centred on the player (snapped to texels so shadows don't shimmer)
  function updateSun() {
    if (!G.sun) return; const v = G.viewVeh(); if (!v) return; const q = 68 / 1024, x = Math.round(v.x / q) * q, z = Math.round(v.z / q) * q, y = v.y;
    G.sun.target.position.set(x, y, z); G.sun.position.set(x + G.sunDir.x * 90, y + G.sunDir.y * 90, z + G.sunDir.z * 90);
  }

  // ---------- loop ----------
  let chimT = 0;
  let last = performance.now(), saveT = 0, smokeT = 0, splashT = 0, routeT = 0, perfT = 0, perfN = 0, perfS = 0;
  const parkIn = { thr: 0, brk: 0, steer: 0, up: 0, down: 0, fwd: 0, park: 1 };
  // ---------- graphics quality (pause menu): HIGH (default, full quality + a safety net that only steps down if FPS stays low) / LOW ----------
  const GFX_KEY = 'grokRides.gfx';
  G.gfx = (() => { try { return localStorage.getItem(GFX_KEY) === 'low' ? 'low' : 'high'; } catch (e) { return 'high'; } })();
  function swapMats(low) { // simpler (Lambert) car materials on LOW, the shiny PBR ones on HIGH
    if (!M.lowMats) M.lowMats = new Map([[M.mat, new T.MeshLambertMaterial({ vertexColors: true })], [M.matWheel, new T.MeshLambertMaterial({ vertexColors: true })], [M.matGlass, new T.MeshPhongMaterial({ vertexColors: true, shininess: 80 })]]);
    const back = new Map(); M.lowMats.forEach((v, k) => back.set(v, k)); M.useLow = low;
    const fix = (o) => { if (!o.isMesh) return; const r = low ? M.lowMats.get(o.material) : back.get(o.material); if (r) o.material = r; };
    G.scene.traverse(fix); if (G.inside && G.inside.scene) G.inside.scene.traverse(fix);
  }
  function thin(on) { (GR.QTHIN || []).forEach((im) => { const a = im.instanceMatrix.array; if (!im.userData.orig) im.userData.orig = a.slice(); const o = im.userData.orig; for (let i = 0; i < im.count; i++) { if (i % 2 === 0) continue; for (let k = 0; k < 16; k++) a[i * 16 + k] = on ? 0 : o[i * 16 + k]; } im.instanceMatrix.needsUpdate = true; }); }
  G.setQuality = function (mode, keep) {
    mode = mode === 'low' ? 'low' : 'high'; G.gfx = mode; if (!keep) { try { localStorage.setItem(GFX_KEY, mode); } catch (e) {} }
    const R = G.renderer, low = mode === 'low', sh = !low;
    G.pr = low ? Math.min(G.prMax, 1) : G.prMax; R.setPixelRatio(G.pr); R.setSize(innerWidth, innerHeight);
    if (R.shadowMap.enabled !== sh || G.sun.castShadow !== sh) { R.shadowMap.enabled = sh; G.sun.castShadow = sh; if (sh) { G.sun.shadow.mapSize.set(2048, 2048); if (G.sun.shadow.map) { G.sun.shadow.map.dispose(); G.sun.shadow.map = null; } } G.scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); }); }
    swapMats(low); thin(low); G.qStep = 0; G.slowN = 0; G.playT = 0;
  };
  function loop(now) {
    requestAnimationFrame(loop);
    let dt = (now - last) / 1000; last = now; if (!(dt > 0)) dt = 0.016; const rawDt = Math.min(dt, 1); dt = Math.min(dt, 0.05);
    G.t = (G.t || 0) + dt;
    if (G.playing && G.me) step(dt); else { const a = G.t * 0.05; G.cam.position.set(650 + Math.sin(a) * 420, 160, -50 + Math.cos(a) * 420); G.cam.lookAt(650, 40, -50); if (GR.SC.sky) GR.SC.sky.position.copy(G.cam.position); }
    GR.SC.anim.forEach((f) => f(G.t));
    GR.FX.update(dt);
    G.renderer.render(G.inside ? G.inside.scene : G.scene, G.cam);
    // adaptive resolution
    // auto quality: start at full quality; step down ONE notch only after the measured FPS stays low for two windows in a row (~5 s of play)
    if (G.playing && !document.hidden) { G.playT = (G.playT || 0) + dt; if (G.playT > 4) { perfS += rawDt; perfN++; perfT += rawDt; } }
    if (perfT > 2.5) { const avg = perfS / perfN, fps = 1 / avg; G.fps = Math.round(fps); G.slowN = fps < 30 ? (G.slowN || 0) + 1 : 0; G.verySlow = fps < 22;
      if (G.slowN >= 2) { G.slowN = 0; G.qStep = (G.qStep || 0) + 1;
        if (G.pr > 1.5) { G.pr = Math.max(1.5, G.pr - 0.5); G.renderer.setPixelRatio(G.pr); }
        else if (G.sun.shadow.mapSize.x > 1024 && !G.keepShadows) { G.sun.shadow.mapSize.set(1024, 1024); if (G.sun.shadow.map) { G.sun.shadow.map.dispose(); G.sun.shadow.map = null; } }
        else if (G.pr > 1) { G.pr = 1; G.renderer.setPixelRatio(1); }
        else if (G.verySlow && G.renderer.shadowMap.enabled && !G.keepShadows) { G.renderer.shadowMap.enabled = false; G.sun.castShadow = false; G.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); } }
      perfT = perfS = perfN = 0; }
  }
  function step(dt) {
    const v = G.me;
    const raceFrozen = GR.Race.cur && GR.Race.cur.t < 0;
    // snack buffs (not during races)
    let bl = false; for (const k in G.buffs) { if (G.buffs[k] > 0) { G.buffs[k] -= dt; bl = true; } }
    v.buff = GR.Race.cur || !bl ? null : { speed: G.buffs.speed > 0, grip: G.buffs.grip > 0, nitro: G.buffs.nitro > 0, snow: G.buffs.snow > 0, off: G.buffs.off > 0 };
    if (G.foot) { GR.Foot.update(dt, UI.isOpen() ? null : (G.autoFoot ? G.autoFoot(dt) : UI.readInput({ kind: 'foot' })), G.t); }
    // nobody at the wheel (walking, a menu is open, race countdown): PARK. Before this was {brk:1}, and
    // brake below 0.5 m/s means REVERSE, so a parked car drove off backwards by itself.
    let inp = UI.isOpen() || raceFrozen || G.foot ? parkIn : UI.readInput(v);
    if (G.autoInput && !raceFrozen && !G.foot) { const a = G.autoInput(v, dt); if (a) inp = a; }
    if (raceFrozen) { inp = parkIn; if (GR.isAir(v.type)) { v.vx = v.vz = v.vy = 0; } }
    if (!G.passenger) {
      const x0 = v.x, z0 = v.z;
      if (raceFrozen && GR.isAir(v.type)) v.syncModel(dt); else v.update(dt, inp);
      G.save.stats.dist = (G.save.stats.dist || 0) + Math.hypot(v.x - x0, v.z - z0);
      // collisions with traffic + friends
      GR.Traffic.collide(v, (c, hit) => GR.Fun.onTrafficHit(c, hit));
      for (const k in G.remotes) { const r = G.remotes[k]; if (r.veh && r.veh.model.visible && !r.ride) { r.veh.fixed = true; const hit = GR.collidePair(v, r.veh); if (hit > 6) v.hit(hit * 0.6, (v.x + r.veh.x) / 2, (v.z + r.veh.z) / 2); } }
      // crash fx
      v.ev.forEach((e) => {
        if (e.t === 'land') { if (e.s > 9) { shake = Math.min(0.8, e.s * 0.03); GR.FX.dust(v.x, v.y + 0.3, v.z, 0.85, 0.82, 0.75); } GR.Fun && GR.Fun.onLand(v, e); return; }
        if (e.t === 'launch') { GR.Fun && GR.Fun.onLaunch(v); return; }
        if (e.t === 'crush') { GR.FX.sparks(e.x, v.y + 0.6, e.z, 10); GR.FX.dust(e.x, v.y + 0.4, e.z, 0.6, 0.55, 0.5); GR.Snd.fx('crunch'); shake = Math.max(shake, 0.25); G.crushN = (G.crushN || 0) + 1; GR.FX.pop(['🦖 CRUNCH!', '🦖 SQUASH!', '🦖 SMOOSH!'][G.crushN % 3], e.x, v.y + 3.5, e.z, '#22c55e', 3.5); G.earn(5); return; }
        if (e.t !== 'crash') return; GR.FX.sparks(e.x, e.y, e.z, Math.min(30, 6 + e.s));
        if (e.d > 0.5) UI.hitFlash(Math.min(1, e.d / 12 + 0.25));
        if (e.s > 12) { GR.FX.pop(['💥 CRASH!', '💥 BONK!', '💥 KABOOM!', '💥 OOF!'][(Math.random() * 4) | 0], e.x, e.y + 2, e.z, '#ffd23f', 4); GR.Snd.fx('crash'); shake = Math.min(1.2, e.s * 0.04); G.save.stats.crashes = (G.save.stats.crashes || 0) + 1; if (navigator.vibrate) try { navigator.vibrate(40); } catch (x) {} } else GR.Snd.fx('bump');
        if (e.s > 9 && (v.kind === 'ground')) dent(v, e);
        if (v.dmg >= 100 && !G.wreckToast) { G.wreckToast = true; UI.toast('💥 Your ride is wrecked! Tap the red damage button to call a free tow.', true); }
      });
      if (v.dmg < 100) G.wreckToast = false;
      // WHEELIE bonus: hold it for a while (two-wheelers)
      if (v.wh > (v.V.wheelie || 1) * 0.6 && !v.air) { G.whT = (G.whT || 0) + dt; if (G.whT > 1 && !G.whShown) { G.whShown = true; UI.bigText('🏍️ WHEELIE!'); } }
      else if (G.whT) { if (G.whT > 1.5 && !GR.Race.cur) { const amt = Math.min(60, Math.round(G.whT * 6)); G.earn(amt); UI.toast('🏍️ ' + G.whT.toFixed(1) + 's wheelie! +$' + amt); G.save.stats.wheelie = Math.max(G.save.stats.wheelie || 0, +G.whT.toFixed(1)); } G.whT = 0; G.whShown = false; }
      // damage tiers: clear warnings + where to fix it
      const tier = v.dmg >= 85 ? 3 : v.dmg >= 60 ? 2 : v.dmg >= 35 ? 1 : 0;
      if (tier > (G.dmgTier || 0) && v.dmg < 100) { const gq = GR.Jobs.nearestGarage(v.x, v.z); UI.toast(['', '🔧 Dents! Your ride took a few hits.', '💨 Your ride is smoking! A garage can fix it' + (gq ? ' — nearest: ' + gq.name : '') + '.', '🔥 Almost wrecked! Get to a garage (tap 🔧 GPS)!'][tier], tier >= 2); }
      G.dmgTier = tier;
      // headlights flicker when the ride is badly hurt
      if (v.model.userData.head) v.model.userData.head.visible = !(v.dmg >= 75 && Math.sin(G.t * 23) + Math.sin(G.t * 7.3) > 1.2);
      // splash into the lake
      if (v.kind === 'ground' && v.wet > 1.3) { splashT += dt; if (splashT === dt) { GR.FX.splash(v.x, 0.5, v.z); GR.Snd.fx('splash'); UI.toast('💦 SPLASH! Cars can\u2019t swim — buy a boat at the Marina!'); } if (splashT > 1.2) { splashT = 0; G.resetVehicle(false); } } else splashT = 0;
      // smoke / dust / nitro
      smokeT -= dt;
      if (smokeT <= 0) {
        smokeT = 0.09; const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw);
        if (v.dmg >= 55) GR.FX.smoke(v.x + fx * v.L * 0.4, v.y + 1.2, v.z + fz * v.L * 0.4, v.dmg >= 85);
        if (v.kind === 'ground' && !v.air && Math.abs(v.vF) > 10) { const s = v.surf, c = s === 2 ? [0.95, 0.82, 0.55] : s === 3 || s === 4 ? [1, 1, 1] : s === 6 || s === 1 ? [0.7, 0.62, 0.5] : null; if (c || v.skid) GR.FX.dust(v.x - fx * v.L * 0.45, v.y + 0.3, v.z - fz * v.L * 0.45, c ? c[0] : 0.8, c ? c[1] : 0.8, c ? c[2] : 0.8); }
        if (v.V.ski && Math.abs(v.vF) > 3) { const n = G.gfx === 'low' ? 1 : 3 + Math.round(Math.min(4, Math.abs(v.vF) / 8)); GR.FX.spray(v.x - fx * v.L * 0.52, 0.25, v.z - fz * v.L * 0.52, -fx, -fz, n, U.clamp(v.lean * 2, -1, 1)); }
        else if (v.kind === 'boat' && Math.abs(v.vF) > 6) GR.FX.dust(v.x - fx * v.L * 0.5, 0.3, v.z - fz * v.L * 0.5, 0.85, 0.95, 1);
        if (v.nitro > 0) GR.FX.sparks(v.x - fx * v.L * 0.5, v.y + 0.6, v.z - fz * v.L * 0.5, 3);
      }
      if (v.model.userData.lightbar) { const lb = v.model.userData.lightbar, on = (G.siren || 0) > 0; G.siren = Math.max(0, (G.siren || 0) - dt); const ph = Math.floor(G.t * 6) % 2; lb.red.visible = !on || ph === 0; lb.blue.visible = !on || ph === 1; }
    }
    GR.Traffic.update(dt, v, G.remoteList(), G.t);
    if (G.me) G.me.model.userData.noRider = !!G.foot || !!G.passenger;
    for (const k in G.remotes) { const r = G.remotes[k]; if (r.veh) { r.veh.model.userData.noRider = !!r.foot; r.veh.lerpRemote(dt); if (r.tag) r.tag.position.set(r.veh.x, r.veh.y + (r.veh.L > 8 ? 6 : 4.5) + (GR.isAir(r.veh.type) ? 3 : 0), r.veh.z); } }
    GR.Foot.remoteTick(dt, G.t);
    chimT -= dt; if (chimT <= 0 && !G.inside) { chimT = 0.4; const L = GR.PL.byId && GR.PL.byId.lodge; if (L && L.smoke && Math.hypot(G.cam.position.x - L.x, G.cam.position.z - L.z) < 400) GR.FX.smoke(L.smoke.x + (Math.random() - 0.5), L.floor + L.h + 4.8, L.smoke.z, false); }
    GR.Race.update(dt); GR.Jobs.update(dt); if (GR.Fun) GR.Fun.update(dt); if (GR.DN) GR.DN.update(dt);
    // GPS route (roads) for jobs / picks; races use their own path
    routeT -= dt; const tg = G.gpsTarget();
    if (tg && !GR.Race.cur && !GR.isAir(v.type) && v.kind !== 'boat') { const key = Math.round(tg.x) + ',' + Math.round(tg.z); if (key !== G.routeKey || routeT <= 0) { routeT = 1.5; G.routeKey = key; G.route = W.route(v.x, v.z, tg.x, tg.z); } } else G.route = null;
    updateCam(dt); updateSun();
    UI.hud(G, dt);
    const rpm = U.clamp(Math.abs(v.vF) / (v.V.vmax || 40), 0, 1); GR.Snd.engine(G.foot ? 0 : rpm, !G.passenger && !G.foot, v.kind, v.type, v.thr || (UI.input ? UI.input.thr : 0));
    GR.Net.tick(dt);
    saveT += dt; if (saveT > 8) { saveT = 0; G.persist(); }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.playing) G.persist(); });

  // ---------- test hooks ----------
  window.__gr = { G, GR, W, U,
    tp: (x, z, yaw) => { G.me.place(x, z, yaw || 0); G.camSnap = true; },
    giveMoney: (n) => { G.save.money += n; },
    region: () => W.region(G.me.x, G.me.z),
    cam: (a) => { G.debugCam = a; },
    sim: (sec, h) => { h = h || 1 / 30; const n = Math.round(sec / h); for (let i = 0; i < n; i++) { G.t += h; step(h); } return __gr.state(); },
    roadTp: (name, s, back) => { const r = W.roads.find((q) => q.name === name); const p = U.pathAt(r.pi, s); G.me.place(p.x, p.z, Math.atan2(p.dx, p.dz) + (back ? Math.PI : 0)); G.camSnap = true; return p; },
    foot: () => ({ on: !!G.foot, x: GR.Foot.x, z: GR.Foot.z, inside: GR.Foot.inside ? GR.Foot.inside.id : null }),
    makeMe: (t) => makeMe(t), spawnAt: (s, yaw) => spawnAt(s, G.me, yaw),
    setTime: (t) => GR.DN.setTime(t),
    state: () => ({ x: G.me.x, y: G.me.y, z: G.me.z, v: G.me.vF, type: G.me.type, dmg: G.me.dmg, money: G.save.money, air: G.me.air })
  };
  G.init();
})();
