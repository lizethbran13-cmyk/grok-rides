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
  G.persist = function () {
    const s = G.save; if (G.me && !G.me.loaner && s.owned[G.me.type]) { s.owned[G.me.type].dmg = Math.round(G.me.dmg); if (!GR.Race.cur && !G.passenger) s.pos = { x: +G.me.x.toFixed(1), z: +G.me.z.toFixed(1), yaw: +G.me.yaw.toFixed(2), t: G.me.type }; }
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  };
  G.myName = () => GN.cleanName(($('nameIn').value || GN.savedProfile().name || 'Player'));
  G.myColor = () => G.color || GN.savedProfile().color;

  // ---------- boot ----------
  G.init = function () {
    const cv = $('c');
    const R = G.renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
    G.pr = Math.min(window.devicePixelRatio || 1, 1.75); R.setPixelRatio(G.pr); R.setSize(innerWidth, innerHeight);
    
    const sc = G.scene = new T.Scene(); sc.background = new T.Color('#bfe6ff'); sc.fog = new T.Fog(0xcfeaff, 260, 1150);
    G.cam = new T.PerspectiveCamera(70, innerWidth / innerHeight, 0.5, 3200); G.cam.position.set(START.x, 60, START.z + 60);
    sc.add(new T.HemisphereLight(0xdff3ff, 0x6a7a5a, 0.62)); const sun = new T.DirectionalLight(0xfff1dc, 0.62); sun.position.set(0.5, 1, 0.35); sc.add(sun);
    window.addEventListener('resize', onResize); onResize();
    $('loading').classList.remove('hidden');
    setTimeout(() => {
      const t0 = performance.now();
      W.build(); GR.SC.build(sc); W.buildGraph(); GR.FX.init(sc); GR.Traffic.init(sc); UI.initControls(); setupTitle(); setupLook();
      G.buildMs = Math.round(performance.now() - t0); $('loading').classList.add('hidden');
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
      if (p && p.t === s.cur && Math.abs(p.x) < 1440 && Math.abs(p.z) < 1440 && !(GR.VEH[s.cur].kind === 'ground' && W.waterDepth(p.x, p.z) > 0.5)) G.me.place(p.x, p.z, p.yaw);
      else spawnAt({ x: START.x, z: START.z, id: 'start' }, G.me, START.yaw);
    }
    G.camSnap = true;
    if (!G.save.tut) { G.save.tut = 1; G.persist(); setTimeout(() => UI.help(false), 400); UI.toast('Welcome to GROK RIDES! Drive into glowing circles to do stuff 🚗'); }
  };
  function makeMe(type, loaner) {
    const s = G.save, o = loaner ? { color: GR.VEH[type].color || '#ff4fd8', upg: {}, dmg: 0 } : s.owned[type];
    if (G.me) G.me.dispose(G.scene);
    const v = new GR.Veh(type, o.color, { upg: o.upg, dmg: o.dmg }); v.loaner = !!loaner; v.isMe = true; G.scene.add(v.model); G.me = v;
    UI.setControlMode(v.kind); return v;
  }
  function spawnAt(spot, v, yaw) {
    let x = spot.x, z = spot.z;
    if (v.kind === 'boat') { const sp = (GR.SPOTS.find((q) => q.id === 'marina') || {}).spawn; x = sp.x; z = sp.z; yaw = Math.PI / 2; }
    else if (yaw == null) { const r = W.nearestRoad(x, z, true); yaw = r.yaw; }
    v.place(x, z, yaw || 0); G.camSnap = true;
  }
  G.canSpawnHere = (k, spot) => GR.VEH[k].kind !== 'boat' || (spot && (spot.id === 'g_marina' || spot.id === 'marina'));
  G.switchVehicle = function (type, spot) {
    if (GR.Race.cur) return; G.persist();
    G.save.cur = type; makeMe(type); spawnAt(spot || { x: G.me.x, z: G.me.z }, G.me); G.persist();
    if (GR.Jobs.cur && !GR.Jobs.canDo(GR.Jobs.cur.id, G.me)) GR.Jobs.cancel('Job cancelled: this ride can\u2019t do that job.');
    GR.Snd.fx('ui');
  };
  G.priceScale = (k) => 0.6 + GR.VEH[k].price / 20000;
  G.repairCost = function () { const c = Math.round(G.me.dmg * 5 * G.priceScale(G.me.type)); return Math.min(c, Math.max(0, G.save.money)); };
  G.repair = function () { const c = G.repairCost(); G.save.money -= c; G.me.dmg = 0; undent(G.me); GR.Snd.fx('buy'); UI.toast(c ? '🔧 Good as new! (' + U.fmtMoney(c) + ')' : '🔧 Good as new! The mechanic did it for free.'); G.persist(); };
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
  G.nitro = function () { const v = G.me; if (G.passenger || !(v.upg.nitro > 0) || v.nitroT < 1 || v.nitro > 0) return; v.nitro = 2.5; v.nitroT = 0; GR.Snd.fx('nitro'); UI.bigText('🔥'); };
  G.horn = function () { const v = G.me; if (v.type === 'icecream') GR.Snd.fx('jingle'); else if (v.type === 'police') { GR.Snd.fx('siren'); G.siren = 4; } else GR.Snd.fx('horn'); GR.Net.event && GR.Net.event({ e: 'horn', ty: v.type }); };
  G.cycleCam = function () { G.camMode = (G.camMode + 1) % 3; UI.toast(['📷 Chase camera', '📷 Far camera', '📷 Driver camera'][G.camMode]); };
  G.resetVehicle = function (manual) {
    if (G.passenger) return; const v = G.me;
    const rp = GR.Race.resetPoint(); if (rp) { v.place(rp.x, rp.z, rp.yaw, rp.y != null ? rp.y : null); if (rp.y != null && v.kind === 'plane') { v.vF = 28; v.thr = 0.6; v.air = true; } G.camSnap = true; return; }
    if (v.kind === 'boat') { if (W.height(v.x, v.z) > -0.3) spawnAt({ x: 0, z: 0 }, v); else { v.vx = v.vz = 0; v.vF = 0; } G.camSnap = true; return; }
    const r = W.nearestRoad(v.x, v.z, true); v.place(r.x, r.z, r.yaw); G.camSnap = true; if (manual) UI.toast('↺ Back on the road!');
  };
  G.fastTravel = function (s) {
    if (GR.Race.cur || GR.Jobs.cur) return; const v = G.me;
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
  G.camYaw = () => G.camYawV || 0;
  G.viewVeh = function () { if (G.passenger) { const r = G.remotes[G.passenger]; if (r && r.veh) return r.veh; } return G.me; };
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
    UI.close(); if (GR.Jobs.cur) GR.Jobs.cancel(); if (G.passenger) G.hopOut();
    const fit = G.raceVehicleOk(rc);
    if (!fit.ok) { G.prevType = G.me.loaner ? G.prevType : G.save.cur; G.persist(); if (fit.loaner) makeMe(fit.loaner, true); else { G.save.cur = fit.swap; makeMe(fit.swap); } }
    GR.Race.start(rc, { diff: o.diff, laps: o.laps, ai: o.ai, online, slot }); G.camSnap = true;
  };
  G.afterRace = function () {
    if (G.me.loaner) { const t = G.prevType || G.save.cur; const x = G.me.x, z = G.me.z; makeMe(t); const kind = G.me.kind; if (kind === 'boat') spawnAt({ x: 0, z: 0 }, G.me); else { const r = W.nearestRoad(x, z, true); G.me.place(r.x, r.z, r.yaw); } G.camSnap = true; }
    G.persist();
  };
  G.quitRace = function () { if (!GR.Race.cur) return; GR.Race.stop(); UI.toast('Race quit.'); };
  G.toTitle = function () { if (GR.Race.cur) GR.Race.stop(true); if (GR.Jobs.cur) GR.Jobs.cancel(); GR.Net.leave(); G.persist(); location.href = GN.soloUrl(); };

  // what can I do here?
  G.actOption = function () {
    if (!G.playing) return null;
    if (G.passenger) return { label: '🚪 HOP OUT', fn: G.hopOut };
    if (GR.Race.cur) return null;
    const v = G.me;
    const air = GR.isAir(v.type), hgt = v.y - W.height(v.x, v.z);
    if (v.dmg >= 100) {
      const g = GR.SPOTS.find((s) => s.type === 'garage' && Math.hypot(s.x - v.x, s.z - v.z) < 12);
      return g ? { label: '🔧 GARAGE', fn: () => UI.garage(g) } : { label: '🛻 CALL A TOW (FREE)', fn: towMe };
    }
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
    if (G.room && !GR.Jobs.cur && v.speed() < 4) {
      for (const k in G.remotes) { const r = G.remotes[k]; if (!r.veh || r.ride || !r.veh.model.visible || r.inRace) continue; if (Math.hypot(r.veh.x - v.x, r.veh.z - v.z) < 9 && Math.abs(r.veh.y - v.y) < 4) return { label: '🚗 HOP IN WITH ' + r.name.toUpperCase(), fn: () => G.hopIn(k) }; }
    }
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
    const v = G.viewVeh(); if (!v) return; const air = GR.isAir(v.type);
    let target = v.yaw; if (v.kind === 'ground' && v.vF < -3) target = v.yaw; // keep looking forward when reversing
    if (look.id == null) { look.t -= dt; if (look.t <= 0) { look.off *= Math.max(0, 1 - dt * 3); look.pitch *= Math.max(0, 1 - dt * 3); } }
    G.camYawV = G.camSnap ? target : (G.camYawV || target) + U.ang(target - (G.camYawV || target)) * Math.min(1, dt * (air ? 2.5 : 4.5));
    const yaw = G.camYawV + look.off, L = v.L || 4, mode = G.camMode;
    let dist = [6.8 + L * 0.55, 12 + L * 0.8, 0][mode], h = [2.7 + L * 0.17, 5 + L * 0.25, 0][mode];
    if (air) { dist = dist * 1.25 + (v.kind === 'balloon' ? 22 : 6); h += v.kind === 'balloon' ? 9 : 2; }
    if (v.type === 'monster') h += 1.5;
    h += look.pitch * dist;
    if (mode === 2) { const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw); const eye = v.kind === 'balloon' ? 2.4 : v.type === 'bigrig' || v.type === 'bus' ? 3.2 : v.type === 'monster' ? 3.3 : v.kind === 'heli' ? 2.3 : 1.45; cp.set(v.x + fx * L * 0.12, v.y + eye, v.z + fz * L * 0.12); la.set(v.x + Math.sin(yaw) * 30, v.y + eye - 1 - look.pitch * 10, v.z + Math.cos(yaw) * 30); }
    else { cp.set(v.x - Math.sin(yaw) * dist, v.y + h, v.z - Math.cos(yaw) * dist); la.set(v.x + Math.sin(yaw) * 4, v.y + 1.3 + (v.kind === 'balloon' ? 5 : air ? 1 : 0), v.z + Math.cos(yaw) * 4); }
    let gmin = Math.max(W.height(cp.x, cp.z), W.ellQ(W.LAKE, cp.x, cp.z) < 1.2 ? 0 : -99) + 1.2;
    if (mode !== 2) for (let k = 1; k <= 3; k++) { const f = k / 4, gx = U.lerp(cp.x, v.x, f), gz = U.lerp(cp.z, v.z, f), need = W.height(gx, gz) + 1.5, lineY = U.lerp(cp.y, v.y + 1.3, f); if (need > lineY) gmin = Math.max(gmin, cp.y + (need - lineY) / (1 - f)); }
    if (cp.y < gmin) cp.y = Math.min(gmin, v.y + 40);
    if (G.camSnap) { G.cam.position.copy(cp); G.camSnap = false; } else G.cam.position.lerp(cp, Math.min(1, dt * (mode === 2 ? 30 : 9)));
    if (shake > 0) { shake = Math.max(0, shake - dt * 2); G.cam.position.x += (Math.random() - 0.5) * shake; G.cam.position.y += (Math.random() - 0.5) * shake; }
    G.cam.lookAt(la);
    const fov = G.baseFov + U.clamp((Math.abs(v.vF) - 25) * 0.25, 0, 10) + (v.nitro > 0 ? 6 : 0); if (Math.abs(G.cam.fov - fov) > 0.2) { G.cam.fov += (fov - G.cam.fov) * Math.min(1, dt * 3); G.cam.updateProjectionMatrix(); }
    if (G.debugCam) { const d = G.debugCam; G.cam.position.set(d[0], d[1], d[2]); G.cam.lookAt(d[3], d[4], d[5]); }
    if (GR.SC.sky) GR.SC.sky.position.copy(G.cam.position);
  }

  // ---------- loop ----------
  let last = performance.now(), saveT = 0, smokeT = 0, splashT = 0, routeT = 0, perfT = 0, perfN = 0, perfS = 0;
  const idle = { thr: 0, brk: 0, steer: 0, up: 0, down: 0, fwd: 0 };
  function loop(now) {
    requestAnimationFrame(loop);
    let dt = (now - last) / 1000; last = now; if (!(dt > 0)) dt = 0.016; dt = Math.min(dt, 0.05);
    G.t = (G.t || 0) + dt;
    if (G.playing && G.me) step(dt); else { const a = G.t * 0.05; G.cam.position.set(650 + Math.sin(a) * 420, 160, -50 + Math.cos(a) * 420); G.cam.lookAt(650, 40, -50); if (GR.SC.sky) GR.SC.sky.position.copy(G.cam.position); }
    GR.SC.anim.forEach((f) => f(G.t));
    GR.FX.update(dt);
    G.renderer.render(G.scene, G.cam);
    // adaptive resolution
    perfS += dt; perfN++; perfT += dt; if (perfT > 3) { const avg = perfS / perfN; if (avg > 0.034 && G.pr > 1) { G.pr = Math.max(1, G.pr - 0.25); G.renderer.setPixelRatio(G.pr); } perfT = perfS = perfN = 0; G.fps = Math.round(1 / avg); }
  }
  function step(dt) {
    const v = G.me;
    const raceFrozen = GR.Race.cur && GR.Race.cur.t < 0;
    let inp = UI.isOpen() || raceFrozen ? idle : UI.readInput(v);
    if (UI.isOpen() && v.kind === 'ground') inp = { brk: Math.abs(v.vF) > 0.5 ? 0.6 : 0 };
    if (G.autoInput && !raceFrozen) { const a = G.autoInput(v, dt); if (a) inp = a; }
    if (raceFrozen) { inp = { brk: 1 }; if (GR.isAir(v.type)) { v.vx = v.vz = v.vy = 0; } }
    if (!G.passenger) {
      const x0 = v.x, z0 = v.z;
      if (raceFrozen && GR.isAir(v.type)) v.syncModel(dt); else v.update(dt, inp);
      G.save.stats.dist = (G.save.stats.dist || 0) + Math.hypot(v.x - x0, v.z - z0);
      // collisions with traffic + friends
      GR.Traffic.collide(v, () => {});
      for (const k in G.remotes) { const r = G.remotes[k]; if (r.veh && r.veh.model.visible && !r.ride) { r.veh.fixed = true; const hit = GR.collidePair(v, r.veh); if (hit > 6) v.hit(hit * 0.6, (v.x + r.veh.x) / 2, (v.z + r.veh.z) / 2); } }
      // crash fx
      v.ev.forEach((e) => {
        if (e.t !== 'crash') return; GR.FX.sparks(e.x, e.y, e.z, Math.min(30, 6 + e.s));
        if (e.s > 12) { GR.FX.pop(['💥 CRASH!', '💥 BONK!', '💥 KABOOM!', '💥 OOF!'][(Math.random() * 4) | 0], e.x, e.y + 2, e.z, '#ffd23f', 4); GR.Snd.fx('crash'); shake = Math.min(1.2, e.s * 0.04); G.save.stats.crashes = (G.save.stats.crashes || 0) + 1; if (navigator.vibrate) try { navigator.vibrate(40); } catch (x) {} } else GR.Snd.fx('bump');
        if (e.s > 9 && (v.kind === 'ground')) dent(v, e);
        if (v.dmg >= 100 && !G.wreckToast) { G.wreckToast = true; UI.toast('💥 Your ride is wrecked! Tap the red damage button to call a free tow.', true); }
      });
      if (v.dmg < 100) G.wreckToast = false;
      // splash into the lake
      if (v.kind === 'ground' && v.wet > 1.3) { splashT += dt; if (splashT === dt) { GR.FX.splash(v.x, 0.5, v.z); GR.Snd.fx('splash'); UI.toast('💦 SPLASH! Cars can\u2019t swim — buy a boat at the Marina!'); } if (splashT > 1.2) { splashT = 0; G.resetVehicle(false); } } else splashT = 0;
      // smoke / dust / nitro
      smokeT -= dt;
      if (smokeT <= 0) {
        smokeT = 0.09; const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw);
        if (v.dmg >= 55) GR.FX.smoke(v.x + fx * v.L * 0.4, v.y + 1.2, v.z + fz * v.L * 0.4, v.dmg >= 85);
        if (v.kind === 'ground' && !v.air && Math.abs(v.vF) > 10) { const s = v.surf, c = s === 2 ? [0.95, 0.82, 0.55] : s === 3 || s === 4 ? [1, 1, 1] : s === 6 || s === 1 ? [0.7, 0.62, 0.5] : null; if (c || v.skid) GR.FX.dust(v.x - fx * v.L * 0.45, v.y + 0.3, v.z - fz * v.L * 0.45, c ? c[0] : 0.8, c ? c[1] : 0.8, c ? c[2] : 0.8); }
        if (v.kind === 'boat' && Math.abs(v.vF) > 6) GR.FX.dust(v.x - fx * v.L * 0.5, 0.3, v.z - fz * v.L * 0.5, 0.85, 0.95, 1);
        if (v.nitro > 0) GR.FX.sparks(v.x - fx * v.L * 0.5, v.y + 0.6, v.z - fz * v.L * 0.5, 3);
      }
      if (v.model.userData.lightbar) { const lb = v.model.userData.lightbar, on = (G.siren || 0) > 0; G.siren = Math.max(0, (G.siren || 0) - dt); const ph = Math.floor(G.t * 6) % 2; lb.red.visible = !on || ph === 0; lb.blue.visible = !on || ph === 1; }
    }
    GR.Traffic.update(dt, v, G.remoteList(), G.t);
    for (const k in G.remotes) { const r = G.remotes[k]; if (r.veh) { r.veh.lerpRemote(dt); if (r.tag) r.tag.position.set(r.veh.x, r.veh.y + (r.veh.L > 8 ? 6 : 4.5) + (GR.isAir(r.veh.type) ? 3 : 0), r.veh.z); } }
    GR.Race.update(dt); GR.Jobs.update(dt);
    // GPS route (roads) for jobs / picks; races use their own path
    routeT -= dt; const tg = G.gpsTarget();
    if (tg && !GR.Race.cur && !GR.isAir(v.type) && v.kind !== 'boat') { const key = Math.round(tg.x) + ',' + Math.round(tg.z); if (key !== G.routeKey || routeT <= 0) { routeT = 1.5; G.routeKey = key; G.route = W.route(v.x, v.z, tg.x, tg.z); } } else G.route = null;
    updateCam(dt);
    UI.hud(G, dt);
    const rpm = U.clamp(Math.abs(v.vF) / (v.V.vmax || 40), 0, 1); GR.Snd.engine(rpm, !G.passenger, v.kind);
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
    state: () => ({ x: G.me.x, y: G.me.y, z: G.me.z, v: G.me.vF, type: G.me.type, dmg: G.me.dmg, money: G.save.money, air: G.me.air })
  };
  G.init();
})();
