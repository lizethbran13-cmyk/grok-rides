// GROK RIDES — fun stuff: stunt jumps, Grok Stars, photo spots, pop-up events (police chase, street race), drift points, pet buddy
(function () {
  'use strict';
  const GR = window.GR, T = THREE, U = GR.U, W = GR.W, M = GR.M, PI = Math.PI;
  const F = GR.Fun = { stars: [], photos: [], ev: null, offer: null };
  const G = () => GR.G, UI = () => GR.UI, $ = (id) => document.getElementById(id);
  const sv = () => { const s = G().save; s.stars = s.stars || {}; s.photos = s.photos || {}; s.ramps = s.ramps || {}; s.stunts = s.stunts || { best: 0, n: 0 }; return s; };
  const pay = (n, why) => { const s = G().save; s.money += n; GR.Snd.fx('coin'); G().persist(); return n; };

  // ---------- Grok Stars ----------
  function starGeo() { const sh = new T.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.45 : 1.1, a = i / 10 * PI * 2 + PI / 2; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) sh.lineTo(x, y); else sh.moveTo(x, y); } const g = new T.ExtrudeGeometry(sh, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 1 }); g.center(); return g; }
  F.starTotal = () => F.stars.length; F.starCount = () => F.stars.filter((s) => sv().stars[s.id]).length;
  function layoutStars() {
    const L = [], add = (id, x, z, y, hint, inside) => L.push({ id, x, z, y: y != null ? y : W.gy(x, z) + 1.6, hint, inside });
    // mid-air stars above every stunt ramp: jump to grab them!
    W.ramps.forEach((r, i) => add('ramp' + i, r.x + r.fx * (r.L / 2 + 14), r.z + r.fz * (r.L / 2 + 14), r.y + r.H + 4.2, 'High above a stunt ramp on the Grok Highway'));
    const S = W.SUMMIT; add('summit', S.x + 4, S.z - 6, null, 'At the very top of Mount Grokmore');
    add('ice', W.ICE.x + 30, W.ICE.z, W.ICE.h + 1.8, 'In the middle of the Frozen Lake');
    add('light', 183, 52, null, 'Behind Sparkle Lighthouse');
    add('runway', 1150, 790, null, 'At the far end of the Sky Field runway');
    add('wtower', -553, 568, null, 'Under the town water tower');
    W.MESAS.slice(0, 5).forEach((m, i) => { const a = 0.7 + i * 1.3, x = m[0] + Math.cos(a) * (m[2] * 1.15 + 9), z = m[1] + Math.sin(a) * (m[2] * 1.15 + 9); if (!W.blocked(x, z, 1.5) && W.waterDepth(x, z) < 0.2) add('mesa' + i, x, z, null, 'Hiding next to a big desert mesa'); });
    // a few hidden inside buildings (look around inside!)
    const g = GR.PL.gen || []; const picks = []; const want = ['games', 'books', 'toys', 'observatory', 'lighthouse', 'igloo', 'bank', 'home', 'apartments', 'cafe', 'hangar', 'pets'];
    want.forEach((v) => { const p = g.find((q) => q.variant === v && !picks.includes(q)); if (p) picks.push(p); });
    picks.slice(0, Math.max(0, 30 - L.length)).forEach((p) => add('in_' + p.id, p.door.x, p.door.z, 0, 'Hidden inside ' + p.name, p.id));
    // top up with off-road secrets
    const r = U.rng(4242); let tries = 0;
    while (L.length < 30 && tries++ < 400) { const x = -1300 + r() * 2600, z = -1300 + r() * 2600; if (W.blocked(x, z, 3) || W.waterDepth(x, z) > 0.1 || W.inRect(W.CITY, x, z, 20) || W.inRect(W.TOWN, x, z, 20)) continue; const n = W.nearestRoad(x, z, true); if (!n || n.d < 25 || n.d > 120) continue; add('wild' + L.length, x, z, null, 'Off the road somewhere in ' + W.REGION_NAMES[W.region(x, z)]); }
    return L;
  }
  let starMesh = null; const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), pv = new T.Vector3(), sc = new T.Vector3();
  F.init = function (scene) {
    F.scene = scene; F.stars = layoutStars(); F.byIn = {};
    const out = F.stars.filter((s) => !s.inside); F.out = out; F.stars.filter((s) => s.inside).forEach((s) => { F.byIn[s.inside] = s; });
    starMesh = new T.InstancedMesh(starGeo(), new T.MeshBasicMaterial({ color: 0xffd23f }), out.length); starMesh.frustumCulled = false; scene.add(starMesh);
        F.photos = [
      { id: 'peak', name: 'Mount Grokmore Peak', x: W.SUMMIT.x - 8, z: W.SUMMIT.z + 10, look: [W.SUMMIT.x - 300, W.SUMMIT.z + 600] },
      { id: 'ferris', name: 'Ferris Wheel Park', x: (GR.BLD.ferris ? GR.BLD.ferris.position.x : 622) + 26, z: (GR.BLD.ferris ? GR.BLD.ferris.position.z : -70) + 22, look: [GR.BLD.ferris ? GR.BLD.ferris.position.x : 622, GR.BLD.ferris ? GR.BLD.ferris.position.z : -70] },
      { id: 'lighthouse', name: 'Sparkle Lighthouse', x: 196, z: 62, look: [175, 40] },
      { id: 'mesa', name: 'Red Mesa Lookout', x: 470 + 70, z: 940 - 30, look: [470, 940] },
      { id: 'frozen', name: 'Frozen Lake', x: W.ICE.x - 175, z: W.ICE.z + 20, look: [W.ICE.x, W.ICE.z] },
      { id: 'tower', name: 'Grok Tower Plaza', x: 550 + 40, z: -200 + 40, look: [550, -200] }
    ].map((p) => { const n = W.nearestRoad(p.x, p.z, true); if (W.blocked(p.x, p.z, 2) && n) { p.x = n.x; p.z = n.z; } p.y = W.gy(p.x, p.z); return p; });
    F.photos.forEach((p) => { const sp = M.token('📸', 2.2, '#ff4fd8'); sp.position.set(p.x, p.y + 4.2, p.z); scene.add(sp); p.sp = sp; const ring = new T.Mesh(new T.RingGeometry(3.2, 3.8, 32), new T.MeshBasicMaterial({ color: 0xff4fd8, transparent: true, opacity: 0.8, depthWrite: false })); ring.rotation.x = -PI / 2; ring.position.set(p.x, p.y + 0.12, p.z); scene.add(ring); p.ring = ring; });
    // event HUD box
    const box = document.createElement('div'); box.id = 'evBox'; box.className = 'evbox hidden'; document.getElementById('hud').appendChild(box); F.box = box;
    const dr = document.createElement('div'); dr.id = 'driftBox'; dr.className = 'driftbox hidden'; document.getElementById('hud').appendChild(dr); F.dbox = dr;
    F.nextEv = 70 + Math.random() * 40; F.petChanged();
  };
  function updStars(dt, t) {
    const s = sv(), ws = G().me; let n = 0;
    F.out.forEach((st, i) => {
      const got = s.stars[st.id]; q.setFromEuler(e.set(0, t * 2 + i, 0)); pv.set(st.x, st.y + Math.sin(t * 2.5 + i) * 0.25, st.z); sc.setScalar(got ? 0 : 1.15); m4.compose(pv, q, sc); starMesh.setMatrixAt(i, m4); n++;
      if (got || G().inside) return;
      const v = G().viewVeh(); const d = Math.hypot(v.x - st.x, v.z - st.z), dy = Math.abs((v.y + 1) - st.y); if (d < (G().foot ? 2.2 : 4.2) && dy < (G().foot ? 2.6 : 4.2)) collect(st);
    });
    starMesh.instanceMatrix.needsUpdate = true; void ws; void n;
    // inside-building stars
    const b = G().inside; if (b && b.star && !s.stars[b.star.st.id]) { b.star.m.rotation.y = t * 2; b.star.m.position.y = 1.4 + Math.sin(t * 2.5) * 0.15; if (Math.hypot(GR.Foot.x - b.star.x, GR.Foot.z - b.star.z) < 1.3) { collect(b.star.st); b.star.m.visible = false; } }
  }
  function collect(st) {
    const s = sv(); if (s.stars[st.id]) return; s.stars[st.id] = 1; const n = F.starCount(), tot = F.starTotal(); pay(50);
    GR.Snd.fx('jingle'); UI().bigText('🌟 GROK STAR ' + n + '/' + tot); UI().toast('🌟 You found a Grok Star! +$50' + (n === tot ? ' — ALL STARS FOUND! +$1,000 🏆' : ''));
    if (n === tot) pay(1000); if (!G().inside) GR.FX.confetti(st.x, st.y, st.z); G().persist();
  }
  F.decorInterior = function (b, p) {
    const st = F.byIn && F.byIn[p.id]; if (!st) return;
    // tuck it in a back corner (behind stuff = a little hunt)
    const free = (x, z) => !b.solids.some((s) => x > s.x0 - 0.7 && x < s.x1 + 0.7 && z > s.z0 - 0.7 && z < s.z1 + 0.7) && !b.stations.some((s) => Math.hypot(s.x - x, s.z - z) < 1.8) && !b.npcs.some((n) => Math.hypot(n.x - x, n.z - z) < 1.2);
    let sx = 0, sz = 0, found = false;
    for (let k = 0; k < 40 && !found; k++) { const fx = ((k * 7) % 9) / 8 * 2 - 1, fz = ((k * 5) % 7) / 6; const x = fx * (b.W / 2 - 1.3), z = -b.D / 2 + 1.2 + fz * (b.D * 0.55); if (free(x, z)) { sx = x; sz = z; found = true; } }
    if (!found) { sx = b.W / 2 - 1.3; sz = 0; }
    const m = new T.Mesh(starGeo(), new T.MeshBasicMaterial({ color: 0xffd23f })); m.scale.setScalar(0.45); m.position.set(sx, 1.4, sz); b.scene.add(m); b.star = { m, x: sx, z: sz, st };
    if (sv().stars[st.id]) m.visible = false;
  };
  F.gpsStar = function (quiet) {
    const s = sv(), v = G().viewVeh(); let best = null, bd = 1e9; F.stars.forEach((st) => { if (s.stars[st.id]) return; const d = Math.hypot(st.x - v.x, st.z - v.z); if (d < bd) { bd = d; best = st; } });
    if (!best) { UI().toast('🌟 You found every Grok Star! Amazing!'); return false; }
    G().setGps({ x: best.x, z: best.z, name: 'Grok Star', icon: '🌟' }); UI().toast('🌟 GPS set! Hint: ' + best.hint + ' (' + Math.round(bd) + ' m)'); return true;
  };

  // ---------- stunts ----------
  F.onLaunch = function (v) { if (v !== G().me) return; let ramp = null; W.ramps.forEach((r) => { if (Math.hypot(r.x + r.fx * r.L / 2 - v.x, r.z + r.fz * r.L / 2 - v.z) < 9) ramp = r; }); F.jump = { ramp, x: v.x, z: v.z, t: 0, spin: 0, yaw: v.yaw }; };
  F.onLand = function (v, e) {
    const j = F.jump; F.jump = null; if (!j || v !== G().me) return; const air = e.air || 0, dist = Math.hypot(v.x - j.x, v.z - j.z);
    if (air < 0.9 || GR.Race.cur) return; const s = sv(); let amt = Math.round(15 + air * 20 + dist * 0.4), msg = '🚀 ' + air.toFixed(1) + 's AIR · ' + Math.round(dist) + ' m';
    if (j.ramp && !s.ramps[j.ramp.id]) { s.ramps[j.ramp.id] = 1; amt += 100; msg += ' · NEW JUMP!'; }
    if (e.s > 16) { amt = Math.round(amt * 0.5); msg += ' (rough landing)'; }
    s.stunts.n++; if (dist > s.stunts.best) { s.stunts.best = Math.round(dist); msg += ' · RECORD!'; }
    pay(amt); UI().bigText(msg); GR.FX.pop('+' + U.fmtMoney(amt), v.x, v.y + 3, v.z, '#7CFC9A', 4); F.lastStunt = { air, dist, amt };
  };
  // ---------- drift points ----------
  let dScore = 0, dIdle = 0;
  function updDrift(dt) {
    const v = G().me; if (G().foot || G().passenger || v.kind !== 'ground') { dScore = 0; F.dbox.classList.add('hidden'); return; }
    if (v.drifting && !v.air) { dScore += Math.abs(v.vF) * dt * 12 * (1 + Math.min(2, Math.abs(v.slip || 0) / 6)); dIdle = 0; }
    else if (dScore > 0) { dIdle += dt; if (dIdle > 0.7 || v.hits > (F.h0 || 0)) { if (dScore > 250 && v.hits === (F.h0 || 0)) { const amt = Math.min(80, Math.round(dScore / 60)); pay(amt); UI().bigText('🌀 DRIFT ' + Math.round(dScore).toLocaleString() + ' +$' + amt); F.lastDrift = amt; } dScore = 0; } }
    if (dScore === 0) F.h0 = v.hits;
    F.dbox.classList.toggle('hidden', dScore < 60); if (dScore >= 60) F.dbox.textContent = '🌀 DRIFT ' + Math.round(dScore).toLocaleString();
  }
  // ---------- photo spots ----------
  F.nearPhoto = function () { const v = G().viewVeh(); return F.photos.find((p) => Math.hypot(p.x - v.x, p.z - v.z) < 9) || null; };
  F.takePhoto = function (p) {
    const g = G(), cam = g.cam, r = g.renderer; const look = p.look; const v = g.viewVeh();
    const old = cam.position.clone(), oq = cam.quaternion.clone();
    cam.position.set(v.x - (look[0] - v.x) / Math.hypot(look[0] - v.x, look[1] - v.z) * 9, v.y + 4, v.z - (look[1] - v.z) / Math.hypot(look[0] - v.x, look[1] - v.z) * 9); cam.lookAt((v.x + look[0]) / 2, v.y + 3, (v.z + look[1]) / 2);
    r.render(g.scene, cam); let url = ''; try { url = r.domElement.toDataURL('image/jpeg', 0.8); } catch (x) { url = ''; }
    cam.position.copy(old); cam.quaternion.copy(oq);
    const s = sv(), first = !s.photos[p.id]; s.photos[p.id] = 1; if (first) pay(75); GR.Snd.fx('ui');
    UI().dismissable = true; UI().panel('<h2>📸 ' + U.esc(p.name) + '</h2><div class="polaroid">' + (url ? '<img src="' + url + '" alt="photo">' : '<div style="height:200px"></div>') + '<div class="cap">' + U.esc(p.name) + ' · ' + new Date().toLocaleDateString() + '</div></div><p class="sub">' + (first ? 'New photo spot! +$75 · ' : '') + 'Album: ' + Object.keys(s.photos).length + ' / ' + F.photos.length + '</p><div class="btnrow"><button class="btn primary" data-a="close">NICE!</button></div>', (root) => root.querySelector('[data-a=close]').addEventListener('click', () => UI().close()));
    g.persist();
  };
  // ---------- pop-up events ----------
  function canEvent() { const g = G(), v = g.me; return g.playing && !g.foot && !g.passenger && !GR.Race.cur && !GR.Jobs.cur && v.kind === 'ground' && v.dmg < 80 && !F.ev; }
  function offer(o) { F.offer = Object.assign({ t: 14 }, o); UI().toast(o.msg); GR.Snd.fx('horn'); }
  F.startChase = function () {
    const v = G().me, ahead = 90, x = v.x + Math.sin(v.yaw) * ahead, z = v.z + Math.cos(v.yaw) * ahead;
    const rb = GR.Traffic.addSpecial('muscle', '#111827', x, z, { robber: true, cruise: 21 }); if (!rb) return false;
    const tag = M.sprite('🦹 ROBBER', { bg: 'rgba(220,38,38,.9)', color: '#fff', wide: 2.6, scale: 3, fs: 0.5, bold: true }); rb.model.add(tag); tag.position.y = 3.6;
    F.ev = { kind: 'chase', rb, hits: 0, t: 90, cool: 0 }; F.offer = null; UI().bigText('🚨 CHASE!'); UI().toast('🚨 Bump the robber car 3 times before it gets away!'); G().siren = 90; return true;
  };
  F.onTrafficHit = function (c, hit) {
    const ev = F.ev; if (!ev || ev.kind !== 'chase' || c !== ev.rb || ev.cool > 0) return; ev.hits++; ev.cool = 1.0; c.stun = 0.8; GR.Snd.fx('crash'); GR.FX.sparks(c.x, c.y + 1, c.z, 20);
    UI().bigText('🚨 BUMP ' + ev.hits + '/3'); if (ev.hits >= 3) endChase(true);
  };
  function endChase(won) {
    const ev = F.ev; if (!ev) return; F.ev = null; G().siren = 0;
    if (won) { const amt = G().me.type === 'police' ? 600 : 400; pay(amt); UI().bigText('🚔 CAUGHT! +' + U.fmtMoney(amt)); UI().toast('🚔 You stopped the robber! The city says THANK YOU! +' + U.fmtMoney(amt)); ev.rb.cruise = 0; ev.rb.robber = false; GR.FX.confetti(ev.rb.x, ev.rb.y + 2, ev.rb.z); const s = sv(); s.chases = (s.chases || 0) + 1; setTimeout(() => GR.Traffic.remove(ev.rb), 3500); }
    else { UI().toast('🦹 The robber got away! Next time…', true); GR.Traffic.remove(ev.rb); }
    F.box.classList.add('hidden'); G().persist();
  }
  // street race: a rival pulls up and races you to a landmark along the roads
  F.startStreetRace = function () {
    const v = G().me, cands = GR.SPOTS.filter((s) => { const d = Math.hypot(s.x - v.x, s.z - v.z); return d > 450 && d < 900 && !s.boat && !s.air; });
    if (!cands.length) return false; const tg = cands[(Math.random() * cands.length) | 0], path = W.route(v.x, v.z, tg.x, tg.z); if (!path || path.length < 3) return false;
    // densify path, compute arc length
    const P = []; for (let i = 0; i < path.length - 1; i++) { const a = path[i], b = path[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 6)); for (let k = 0; k < n; k++) P.push({ x: U.lerp(a.x, b.x, k / n), z: U.lerp(a.z, b.z, k / n) }); } P.push(path[path.length - 1]);
    const S = [0]; for (let i = 1; i < P.length; i++) S.push(S[i - 1] + Math.hypot(P[i].x - P[i - 1].x, P[i].z - P[i - 1].z));
    const rv = new GR.Veh('sports', '#ff4fd8'); rv.fixed = true; F.scene.add(rv.model); const tag = M.sprite('😎 RIVAL', { bg: 'rgba(255,79,216,.9)', color: '#fff', wide: 2.4, scale: 2.6, fs: 0.5, bold: true }); rv.model.add(tag); tag.position.y = 3.2;
    F.ev = { kind: 'race', rv, P, S, d: 0, sp: 0, tg, t: 0, cnt: 3, len: S[S.length - 1] }; F.offer = null; placeRival(F.ev, 0);
    G().setGps({ x: tg.x, z: tg.z, name: tg.name }); UI().toast('🏁 Street race to ' + tg.name + '! Follow the GPS. Ready…'); return true;
  };
  function railAt(ev, d, out) { const S = ev.S, P = ev.P; let lo = 0, hi = S.length - 1; d = U.clamp(d, 0, ev.len); while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m] < d) lo = m; else hi = m; } const f = (d - S[lo]) / Math.max(1e-6, S[hi] - S[lo]); out.x = U.lerp(P[lo].x, P[hi].x, f); out.z = U.lerp(P[lo].z, P[hi].z, f); return out; }
  const ra = { x: 0, z: 0 }, rb_ = { x: 0, z: 0 };
  function placeRival(ev, dt) {
    railAt(ev, ev.d + 2.5, ra); railAt(ev, ev.d - 2.5, rb_); const yaw = Math.atan2(ra.x - rb_.x, ra.z - rb_.z), side = 3.2, x = (ra.x + rb_.x) / 2 + Math.cos(yaw) * -side, z = (ra.z + rb_.z) / 2 - Math.sin(yaw) * -side;
    const rv = ev.rv; rv.vx = dt ? (x - rv.x) / dt : 0; rv.vz = dt ? (z - rv.z) / dt : 0; rv.x = x; rv.z = z; rv.yaw = yaw; rv.vF = ev.sp; rv.y = W.gy(x, z); rv.air = false; rv.syncModel(dt || 0.016);
  }
  function updRace(dt, ev) {
    const v = G().me;
    if (ev.cnt > 0) { const c0 = Math.ceil(ev.cnt); ev.cnt -= dt; const c1 = Math.ceil(ev.cnt); if (c1 !== c0) UI().bigText(c1 > 0 ? String(c1) : '🏁 GO!'); placeRival(ev, dt); F.box.innerHTML = '🏁 STREET RACE<br><small>Get ready…</small>'; return; }
    ev.t += dt;
    // rival speed: fast on straights, slows for corners ahead (curvature from the path)
    railAt(ev, ev.d, ra); railAt(ev, ev.d + 18, rb_); const a1 = Math.atan2(rb_.x - ra.x, rb_.z - ra.z); railAt(ev, ev.d + 36, ra); const a2 = Math.atan2(ra.x - rb_.x, ra.z - rb_.z); const bend = Math.abs(U.ang(a2 - a1));
    const top = 27 * (1 - Math.min(0.6, bend * 0.9)), md = Math.hypot(v.x - ev.rv.x, v.z - ev.rv.z), rub = md > 160 ? 0.85 : 1.0;
    ev.sp += U.clamp(top * rub - ev.sp, -10 * dt, 6 * dt); ev.d += ev.sp * dt; placeRival(ev, dt);
    const hit = GR.collidePair(v, ev.rv); if (hit > 6) v.hit(hit * 0.4, (v.x + ev.rv.x) / 2, (v.z + ev.rv.z) / 2);
    const myLeft = Math.hypot(v.x - ev.tg.x, v.z - ev.tg.z), rvLeft = ev.len - ev.d;
    F.box.innerHTML = '🏁 STREET RACE → ' + U.esc(ev.tg.name) + '<br><small>' + (myLeft < rvLeft ? '🥇 You\u2019re winning!' : '🥈 Catch the rival!') + ' · ' + Math.round(myLeft) + ' m</small>';
    if (myLeft < 16) endRace(true); else if (rvLeft < 3) endRace(false); else if (ev.t > 240) endRace(false);
  }
  function endRace(won) {
    const ev = F.ev; F.ev = null; F.box.classList.add('hidden'); setTimeout(() => { if (ev.rv.model.parent) ev.rv.model.parent.remove(ev.rv.model); }, won ? 2500 : 100);
    if (won) { pay(300); UI().bigText('🏆 YOU WIN! +$300'); GR.FX.confetti(G().me.x, G().me.y + 2, G().me.z); const s = sv(); s.streetWins = (s.streetWins || 0) + 1; } else UI().toast('😎 The rival won this time. Rematch soon!', true);
    G().setGps(null); G().persist();
  }
  F.cancelEvent = function () { const ev = F.ev; if (!ev) return; if (ev.kind === 'chase') { F.ev = null; GR.Traffic.remove(ev.rb); G().siren = 0; } else { F.ev = null; if (ev.rv.model.parent) ev.rv.model.parent.remove(ev.rv.model); } F.box.classList.add('hidden'); };
  function updEvents(dt) {
    const g = G(), v = g.me;
    if (F.offer) { F.offer.t -= dt; if (F.offer.t <= 0 || !canEvent()) F.offer = null; }
    if (!F.ev && !F.offer && canEvent()) { F.nextEv -= dt; if (F.nextEv <= 0 && v.speed() > 6) { F.nextEv = 140 + Math.random() * 80; const reg = W.region(v.x, v.z); if ((reg === 'city' || reg === 'town') && Math.random() < 0.6) offer({ kind: 'chase', label: '🚨 CHASE THE ROBBER!', msg: '🚨 Police radio: a robber is speeding nearby! Tap 🚨 to chase!', fn: F.startChase }); else offer({ kind: 'race', label: '🏁 ACCEPT STREET RACE', msg: '😎 A rival revs their engine at you… Tap 🏁 to race!', fn: F.startStreetRace }); } }
    const ev = F.ev; if (!ev) return; F.box.classList.remove('hidden');
    if (GR.Race.cur || GR.Jobs.cur || g.foot) { F.cancelEvent(); return; }
    if (ev.kind === 'chase') {
      ev.t -= dt; ev.cool -= dt; const d = Math.hypot(ev.rb.x - v.x, ev.rb.z - v.z); g.setGps({ x: ev.rb.x, z: ev.rb.z, name: 'Robber' });
      F.box.innerHTML = '🚨 CHASE · bumps ' + ev.hits + '/3<br><small>' + Math.max(0, Math.ceil(ev.t)) + 's · ' + Math.round(d) + ' m away</small>';
      if (ev.t <= 0 || d > 420) endChase(false);
    } else updRace(dt, ev);
  }
  F.actOption = function (v) {
    if (F.offer) return { label: F.offer.label, fn: () => { const o = F.offer; F.offer = null; if (!o.fn()) UI().toast('Hmm, not a good spot for that. Next time!', true); } };
    if (v.speed() < 4 && !GR.isAir(v.type)) { const p = F.nearPhoto(); if (p) return { label: '📸 TAKE PHOTO', fn: () => F.takePhoto(p) }; }
    return null;
  };
  F.footOption = function () { if (GR.Foot.inside) return null; const p = F.nearPhoto(); return p ? { label: '📸 TAKE PHOTO', fn: () => F.takePhoto(p) } : null; };

  // ---------- pet buddy (follows you on foot) ----------
  let pet = null;
  F.petChanged = function () {
    const k = G() && G().save && G().save.pet; if (pet && pet.parent) pet.parent.remove(pet); pet = null; if (!k) return;
    const col = { dog: '#c68642', cat: '#f97316', bunny: '#f8fafc' }[k], g = new T.Group(), L = (c) => new T.MeshLambertMaterial({ color: c });
    const body = new T.Mesh(new T.SphereGeometry(0.28, 12, 8), L(col)); body.scale.set(0.9, 0.8, 1.3); body.position.y = 0.35; g.add(body);
    const head = new T.Mesh(new T.SphereGeometry(0.2, 12, 8), L(col)); head.position.set(0, 0.6, 0.32); g.add(head);
    [-1, 1].forEach((s) => { const ear = new T.Mesh(k === 'bunny' ? new T.CylinderGeometry(0.04, 0.05, 0.32, 6) : new T.ConeGeometry(0.07, 0.16, 6), L(k === 'dog' ? '#7c4a22' : col)); ear.position.set(s * 0.1, k === 'bunny' ? 0.86 : 0.78, 0.3); g.add(ear); const eye = new T.Mesh(new T.SphereGeometry(0.03, 6, 4), L('#111827')); eye.position.set(s * 0.07, 0.64, 0.5); g.add(eye); });
    const tail = new T.Mesh(new T.SphereGeometry(k === 'bunny' ? 0.1 : 0.06, 6, 4), L(k === 'bunny' ? '#ffffff' : col)); tail.position.set(0, 0.45, -0.38); tail.scale.z = k === 'bunny' ? 1 : 3; g.add(tail);
    for (let i = 0; i < 4; i++) { const l = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 0.22, 6), L(col)); l.position.set(i % 2 ? 0.12 : -0.12, 0.11, i < 2 ? 0.2 : -0.2); g.add(l); }
    g.userData.tail = tail; pet = g; F.pet = g;
  };
  function updPet(dt, t) {
    if (!pet) return; const g = G(), Fo = GR.Foot; if (!g.foot) { if (pet.parent) pet.parent.remove(pet); return; }
    const sc = g.inside ? g.inside.scene : g.scene; if (pet.parent !== sc) { sc.add(pet); pet.position.set(Fo.x - Math.sin(Fo.yaw) * 1.4 + 0.6, Fo.y, Fo.z - Math.cos(Fo.yaw) * 1.4); }
    const tx = Fo.x - Math.sin(Fo.yaw) * 1.3 + Math.cos(Fo.yaw) * 0.7, tz = Fo.z - Math.cos(Fo.yaw) * 1.3 - Math.sin(Fo.yaw) * 0.7, dx = tx - pet.position.x, dz = tz - pet.position.z, d = Math.hypot(dx, dz);
    if (d > 0.25) { const sp = Math.min(d * 3, 9) * dt; pet.position.x += dx / d * sp; pet.position.z += dz / d * sp; pet.rotation.y = Math.atan2(dx, dz); }
    pet.position.y = (g.inside ? 0 : W.gy(pet.position.x, pet.position.z)) + (d > 0.4 ? Math.abs(Math.sin(t * 12)) * 0.12 : 0); pet.userData.tail.rotation.y = Math.sin(t * 14) * 0.6;
  }
  F.update = function (dt) {
    if (!starMesh) return; const t = G().t; updStars(dt, t); updDrift(dt); updEvents(dt); updPet(dt, t);
    F.photos.forEach((p, i) => { p.sp.position.y = p.y + 4.2 + Math.sin(t * 2 + i) * 0.3; p.sp.rotation.y = t * 1.2 + i; p.ring.material.opacity = 0.5 + Math.sin(t * 3 + i) * 0.3; });
  };
})();
