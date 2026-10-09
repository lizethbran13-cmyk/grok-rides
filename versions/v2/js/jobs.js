/* Grok Rides - car jobs: taxi, pizza, cargo, limo VIP, tow, sky tours, bus route */
(function () {
  'use strict';
  const GR = window.GR, U = GR.U, W = GR.W, M = GR.M, T = THREE;
  const J = GR.Jobs = { cur: null };
  const rnd = Math.random;
  const SIGHTS = () => [
    { n: 'Grok Tower', x: 550, z: -200, y: 150 }, { n: 'Ferris Wheel', x: 622, z: -70, y: 45 }, { n: 'Lighthouse', x: 175, z: 40, y: 45 }, { n: 'Sparkle Lake', x: -60, z: 100, y: 30 },
    { n: 'Mount Grokmore Peak', x: W.SUMMIT.x, z: W.SUMMIT.z, y: W.height(W.SUMMIT.x, W.SUMMIT.z) + 40 }, { n: 'Red Mesa', x: 470, z: 940, y: 75 }, { n: 'Dino Museum', x: 700, z: 1060, y: 45 },
    { n: 'Wind Farm', x: 230, z: -540, y: 70 }, { n: 'Frozen Lake', x: 600, z: -1150, y: 40 }, { n: 'Water Tower', x: -560, z: 560, y: 45 }, { n: 'Control Tower', x: 1215, z: 330, y: 55 }];
  function canDo(jobId, veh) {
    const need = GR.JOBS[jobId].need, V = veh.V, tags = V.tags || [];
    if (need === 'ground') return V.kind === 'ground' && veh.type !== 'snowmobile';
    return tags.indexOf(need) >= 0;
  }
  J.canDo = canDo;
  J.whoCan = function (jobId) { const need = GR.JOBS[jobId].need; return GR.VEH_ORDER.filter((k) => { const V = GR.VEH[k]; return need === 'ground' ? V.kind === 'ground' && k !== 'snowmobile' : (V.tags || []).indexOf(need) >= 0; }); };
  function placeNear(x, z, minD, maxD, filter) {
    const L = GR.PLACES.filter((p) => { const d = Math.hypot(p.x - x, p.z - z); return d >= minD && d <= maxD && (!filter || filter(p)); });
    return L.length ? L[(rnd() * L.length) | 0] : GR.PLACES[(rnd() * GR.PLACES.length) | 0];
  }
  function roadPoint(region, x0, z0, minD, maxD) {
    const rs = W.roads.filter((r) => r.kind !== 'runway' && (!region || r.name.indexOf(region) === 0));
    for (let i = 0; i < 60; i++) { const r = rs[(rnd() * rs.length) | 0], p = U.pathAt(r.pi, rnd() * r.pi.len), d = Math.hypot(p.x - x0, p.z - z0); if (d >= minD && d <= maxD) return { x: p.x - p.dz * (r.hw + 3), z: p.z + p.dx * (r.hw + 3) }; }
    return { x: x0 + 100, z: z0 };
  }
  // ---- create a job ----
  J.start = function (jobId, spot) {
    const G = GR.G, v = G.me, mul = { taxi: v.type === 'taxi' ? 1.5 : 1, pizza: v.type === 'icecream' ? 1.3 : 1, cargo: v.type === 'bigrig' ? 1.5 : 1, tour: v.kind === 'balloon' ? 1.25 : 1 }[jobId] || 1;
    const j = { id: jobId, def: GR.JOBS[jobId], stops: [], idx: 0, t: 0, limit: 0, pay: 0, mul, mood: 100, cond: 100, dmg0: v.dmg, hits0: v.hits, spot, obj: [], extra: {} };
    const sx = v.x, sz = v.z;
    if (jobId === 'taxi') {
      const a = placeNear(sx, sz, 60, 500, (p) => W.inRect(W.CITY, p.x, p.z, 150) || W.inRect(W.TOWN, p.x, p.z, 150)), b = placeNear(a.x, a.z, 250, 900, (p) => p !== a);
      const ra = roadPoint(null, a.x, a.z, 0, 60), rb = roadPoint(null, b.x, b.z, 0, 60);
      j.stops = [{ x: ra.x, z: ra.z, n: 'Pick up rider at ' + a.n, kind: 'pickup', icon: '🙋', stop: true }, { x: rb.x, z: rb.z, n: 'Drop off at ' + b.n, kind: 'drop', icon: '🏁', stop: true }];
      const dist = Math.hypot(ra.x - rb.x, ra.z - rb.z); j.base = 90 + dist * 0.28; j.limit = 40 + Math.hypot(ra.x - sx, ra.z - sz) / 10 + dist / 11;
    } else if (jobId === 'pizza') {
      for (let i = 0; i < 3; i++) { const p = roadPoint('Town', sx, sz, 60, 420); j.stops.push({ x: p.x, z: p.z, n: 'Deliver pizza #' + (i + 1), kind: 'drop', icon: '🍕', stop: true }); }
      j.base = 210; j.limit = 120;
    } else if (jobId === 'cargo') {
      const b = placeNear(sx, sz, 650, 2400), rb = roadPoint(null, b.x, b.z, 0, 70); const dist = Math.hypot(rb.x - sx, rb.z - sz);
      j.stops = [{ x: rb.x, z: rb.z, n: 'Haul cargo to ' + b.n, kind: 'drop', icon: '📦', stop: true }]; j.base = 220 + dist * 0.38;
      if (v.type !== 'bigrig') { const crate = new T.Mesh(U.merge([U.paint(M.rbox(1.6, 1.0, 1.6, 0.08), '#c08a4a'), U.paint(new T.BoxGeometry(1.62, 0.12, 1.62).translate(0, 0.2, 0), '#8a5a2a')]), M.mat); crate.position.set(0, 1.55, -1.7); v.model.add(crate); j.obj.push({ o: crate, parent: v.model }); }
    } else if (jobId === 'limo') {
      const b = placeNear(sx, sz, 400, 1600), rb = roadPoint(null, b.x, b.z, 0, 70); const dist = Math.hypot(rb.x - sx, rb.z - sz);
      const vip = ['Pop star Luna Lux', 'Chef Gordo Grok', 'Mayor Maple', 'Movie star Rex Royal', 'Princess Pebbles', 'DJ Zoomies'][(rnd() * 6) | 0];
      j.extra.vip = vip; j.stops = [{ x: rb.x, z: rb.z, n: 'Drive ' + vip + ' to ' + b.n, kind: 'drop', icon: '⭐', stop: true }]; j.base = 320 + dist * 0.32;
    } else if (jobId === 'tow') {
      const p = roadPoint(null, sx, sz, 250, 800);
      j.stops = [{ x: p.x, z: p.z, n: 'Find the broken-down car', kind: 'hook', icon: '🚙', stop: true }, { x: 0, z: 0, n: 'Tow it to the nearest garage', kind: 'drop', icon: '🔧', stop: true, garage: true }];
      const bc = new GR.Veh(['compact', 'sports', 'taxi', 'muscle'][(rnd() * 4) | 0], ['#94a3b8', '#ef4444', '#3b82f6'][(rnd() * 3) | 0]); bc.place(p.x, p.z, rnd() * 6); G.scene.add(bc.model); j.extra.broken = bc;
      j.extra.smokeT = 0; j.base = 260 + Math.hypot(p.x - sx, p.z - sz) * 0.25;
    } else if (jobId === 'tour') {
      const reach = v.kind === 'balloon' ? 650 : 1300, n = v.kind === 'balloon' ? 2 : 3;
      const sights = SIGHTS().filter((s) => Math.hypot(s.x - sx, s.z - sz) < reach).sort(() => rnd() - 0.5).slice(0, n);
      sights.forEach((s) => j.stops.push({ x: s.x, z: s.z, y: s.y, n: 'Fly past ' + s.n, kind: 'ring', icon: '📸' }));
      j.stops.push({ x: spot ? spot.x : sx, z: spot ? spot.z : sz, n: 'Land back at the pad', kind: 'land', icon: '🛬', stop: true });
      j.base = 260 + sights.length * 90;
    } else if (jobId === 'bus') {
      const route = [[450, -250], [650, -390], [850, -250], [850, 50], [650, 210], [450, 50]].map((p, i) => { const q = roadPoint(null, p[0], p[1], 0, 30); return { x: q.x, z: q.z, n: 'Bus stop ' + (i + 1) + ' of 6', kind: 'drop', icon: '🚏', stop: true }; });
      j.stops = route; j.base = 480;
    }
    j.mark = null; J.cur = j; markStop(j); GR.UI.jobHud();
    GR.Snd.fx('ui'); return j;
  };
  function markStop(j) {
    const G = GR.G; if (j.mark) { G.scene.remove(j.mark); j.mark = null; }
    const s = j.stops[j.idx]; if (!s) return;
    if (s.garage) { const g = nearestGarage(G.me.x, G.me.z); s.x = g.x; s.z = g.z; s.n = 'Tow it to ' + g.name; }
    if (s.kind === 'ring') { const m = new T.Mesh(new T.TorusGeometry(12, 1.2, 8, 28), new T.MeshBasicMaterial({ color: 0x3ff0ff, transparent: true, opacity: 0.85 })); m.position.set(s.x, s.y, s.z); G.scene.add(m); j.mark = m; m.userData.ring = true; }
    else { j.mark = GR.SC.marker(s.x, s.z, '#3ff0ff', s.icon, null, s.kind === 'land' ? 9 : 8); }
    if (s.kind === 'pickup' || (j.id === 'limo' && j.idx === 0 && false)) { const pg = GR.M.personGeo(['#ff4fd8', '#22c55e', '#f59e0b', '#3b82f6'][(rnd() * 4) | 0], '#f1c7a0', '#4a2f1e'); const pm = new T.Mesh(pg, M.matMatte); pm.position.set(s.x, W.height(s.x, s.z), s.z); G.scene.add(pm); j.extra.rider = pm; }
  }
  function nearestGarage(x, z) { let b = null, bd = 1e9; GR.SPOTS.forEach((s) => { if (s.type === 'garage') { const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; b = s; } } }); return b; }
  J.nearestGarage = nearestGarage;
  J.cancel = function (msg) { const j = J.cur; if (!j) return; cleanup(j); J.cur = null; GR.UI.jobHud(); if (msg) GR.UI.toast(msg, true); };
  function cleanup(j) {
    const G = GR.G; if (j.mark) G.scene.remove(j.mark); if (j.extra.rider) G.scene.remove(j.extra.rider); if (j.extra.broken) j.extra.broken.dispose(G.scene);
    j.obj.forEach((o) => o.parent.remove(o.o));
  }
  J.update = function (dt) {
    const j = J.cur; if (!j) return; const G = GR.G, v = G.me;
    j.t += dt;
    if (j.mark && j.mark.userData.ring) j.mark.lookAt(G.cam.position.x, j.mark.position.y, G.cam.position.z);
    if (!canDo(j.id, v)) { J.cancel('Job cancelled: you switched to a vehicle that can\u2019t do this job.'); return; }
    // mood / cargo condition
    const hitN = v.hits - (j.lastHits == null ? j.hits0 : j.lastHits); j.lastHits = v.hits;
    if (hitN > 0) { if (j.id === 'limo') { j.mood = Math.max(0, j.mood - 18 * hitN); GR.UI.toast(j.extra.vip + ': "Ouch! Careful!" 😤', true); } if (j.id === 'cargo') { j.cond = Math.max(10, j.cond - 12 * hitN); GR.UI.toast('Cargo got bumped! ' + Math.round(j.cond) + '% left', true); } if (j.id === 'taxi' || j.id === 'pizza') j.mood = Math.max(0, j.mood - 10 * hitN); }
    if (j.id === 'limo' && v.skid > 7) j.mood = Math.max(0, j.mood - dt * 6);
    if (j.limit && j.t > j.limit && !j.late) { j.late = true; GR.UI.toast(j.id === 'pizza' ? 'The pizzas are getting cold! Smaller tip now 🍕' : 'You\u2019re late! The rider is grumpy but still wants a ride.', true); }
    // towed car follows
    const bc = j.extra.broken;
    if (bc) {
      if (j.extra.hooked) { const fx = Math.sin(v.yaw), fz = Math.cos(v.yaw), back = v.L / 2 + bc.L / 2 + 0.6; const tx = v.x - fx * back, tz = v.z - fz * back; bc.x = tx; bc.z = tz; bc.yaw += U.ang(v.yaw - bc.yaw) * Math.min(1, dt * 4); bc.y = W.height(tx, tz) + 0.5; bc.vF = v.vF; bc.syncModel(dt); bc.model.rotation.x = 0.12; }
      else { j.extra.smokeT -= dt; if (j.extra.smokeT <= 0) { j.extra.smokeT = 0.25; GR.FX.smoke(bc.x, bc.y + 1.2, bc.z, true); } }
    }
    const s = j.stops[j.idx]; if (!s) return;
    const d = s.kind === 'ring' ? Math.hypot(v.x - s.x, v.z - s.z, v.y - s.y) : Math.hypot(v.x - s.x, v.z - s.z);
    const slow = Math.abs(v.vF) < 3.5 || (s.kind === 'ring');
    let reached = false;
    if (s.kind === 'ring') reached = d < 16;
    else if (s.kind === 'land') reached = d < 12 && !v.air && Math.abs(v.vF) < 4;
    else if (s.kind === 'hook') reached = d < 11 && slow;
    else reached = d < 10 && slow;
    if (!reached) return;
    GR.Snd.fx('cp');
    if (s.kind === 'pickup') { if (j.extra.rider) { G.scene.remove(j.extra.rider); j.extra.rider = null; } GR.UI.toast('🙋 Rider hopped in! "' + ['To ', 'Please take me to ', 'Step on it! To '][(rnd() * 3) | 0] + j.stops[1].n.replace('Drop off at ', '') + '"'); }
    if (s.kind === 'hook') { j.extra.hooked = true; GR.UI.toast('🪝 Hooked up! Now tow it to a garage.'); }
    if (j.id === 'pizza') { j.pay += 0; GR.FX.pop('🍕 +1', v.x, v.y + 4, v.z, '#ffd23f', 3); }
    if (j.id === 'bus') { GR.FX.pop('🚏 Stop!', v.x, v.y + 5, v.z, '#ffffff', 3); }
    if (s.kind === 'ring') GR.FX.pop('📸 Click!', v.x, v.y + 4, v.z, '#ffffff', 3);
    j.idx++;
    if (j.idx >= j.stops.length) return finish(j);
    markStop(j); GR.UI.jobHud();
  };
  function finish(j) {
    const G = GR.G; let pay = j.base * j.mul, notes = [];
    if (j.limit) { if (j.t <= j.limit) { const b = Math.round((j.limit - j.t) * 2); pay += b; notes.push('Speedy bonus +$' + b); } else { pay *= 0.6; notes.push('Late: 60% pay'); } }
    if (j.id === 'cargo') { pay *= j.cond / 100; notes.push('Cargo condition ' + Math.round(j.cond) + '%'); }
    if (j.id === 'limo') { pay *= 0.5 + j.mood / 200; if (j.mood > 80) { pay += 150; notes.push('VIP loved it! Tip +$150 ⭐'); } else notes.push('VIP mood ' + Math.round(j.mood) + '%'); }
    if ((j.id === 'taxi' || j.id === 'pizza') && j.mood >= 100) { pay += 40; notes.push('Smooth driving tip +$40'); }
    if (j.mul > 1) notes.push('Perfect vehicle x' + j.mul);
    if (G.buffs && G.buffs.pay > 0) { pay *= 1.1; notes.push('Room service bonus +10% 🛎️'); }
    pay = Math.round(pay); cleanup(j); J.cur = null;
    G.earn(pay, true); G.save.stats.jobs = (G.save.stats.jobs || 0) + 1; G.save.jobsDone[j.id] = (G.save.jobsDone[j.id] || 0) + 1; G.persist();
    GR.Snd.fx('coin'); GR.FX.confetti(G.me.x, G.me.y + 3, G.me.z);
    GR.UI.jobDone(j, pay, notes); GR.UI.jobHud();
  }
  J.target = function () { const j = J.cur; if (!j) return null; const s = j.stops[j.idx]; return s ? { x: s.x, z: s.z, y: s.y, n: s.n } : null; };
})();
