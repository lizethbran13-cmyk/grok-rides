/* Grok Rides - races: paths, checkpoints, fair AI rivals, results (solo + online) */
(function () {
  'use strict';
  const GR = window.GR, U = GR.U, W = GR.W, M = GR.M, T = THREE;
  const R = GR.Race = { cur: null };
  const NAMES = ['Zippy Zoe', 'Turbo Tom', 'Rocket Rita', 'Speedy Sam', 'Dash Dina', 'Vroom Vic', 'Nitro Nia', 'Gearbox Gus', 'Skid Sky', 'Lightning Lu'];
  const AICOL = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#14b8a6', '#ec4899'];
  const pathCache = {};
  GR.racePath = function (rc) {
    if (pathCache[rc.id]) return pathCache[rc.id];
    let pts, closed = rc.type === 'circuit';
    if (rc.corners) pts = U.roundPath(rc.corners.map((p) => ({ x: p[0], z: p[1] })), rc.r || 20, closed, 4);
    else if (rc.ellipse) { const [cx, cz, rx, rz] = rc.ellipse; pts = []; for (let i = 0; i < 96; i++) { const a = -i / 96 * Math.PI * 2; pts.push({ x: cx + Math.sin(a) * rx, z: cz + Math.cos(a) * rz }); } }
    else if (rc.road) pts = W.roads.find((r) => r.name === rc.road).pts.map((p) => ({ x: p.x, z: p.z }));
    else if (rc.pts3) { pts = rc.pts3.map((p) => ({ x: p[0], z: p[1], y: p[2] })); closed = false; }
    const pi = U.pathInfo(pts, closed);
    return (pathCache[rc.id] = { pi, closed, pts });
  };
  GR.raceStart = function (rc) {
    const P = GR.racePath(rc);
    if (rc.type === 'air') return { x: P.pts[0].x, z: P.pts[0].z };
    const s0 = startS(rc, P); const p = U.pathAt(P.pi, s0 - 30); return { x: p.x, z: p.z };
  };
  function startS(rc, P) { return P.closed ? 0 : 48; }
  function slotPos(rc, P, k) {
    const s0 = startS(rc, P), row = Math.floor(k / 2), col = k % 2, s = s0 - 10 - row * 10, p = U.pathAt(P.pi, s);
    const nx = -p.dz, nz = p.dx, off = (col ? 1 : -1) * (rc.vehicle === 'boat' ? 5 : 3.2);
    return { x: p.x + nx * off, z: p.z + nz * off, yaw: Math.atan2(p.dx, p.dz) };
  }
  function buildCPs(rc, P) {
    if (rc.type === 'air') return P.pts.slice(1).map((p, i) => ({ x: p.x, z: p.z, y: p.y, s: i + 1 }));
    const s0 = startS(rc, P), total = P.closed ? P.pi.len * (rc.laps || 1) : P.pi.len - s0, gap = rc.vehicle === 'boat' ? 70 : 110, n = Math.max(3, Math.round(total / gap)), cps = [];
    for (let i = 1; i <= n; i++) { const s = s0 + total * i / n, p = U.pathAt(P.pi, s); cps.push({ x: p.x, z: p.z, s: s - s0, dx: p.dx, dz: p.dz }); }
    return cps;
  }
  R.total = (r) => r.air ? r.cps.length : (r.P.closed ? r.P.pi.len * r.laps : r.P.pi.len - startS(r.rc, r.P));

  // ---- gate visuals ----
  function checkerTex() { const c = document.createElement('canvas'); c.width = 64; c.height = 16; const x = c.getContext('2d'); for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#111' : '#fff'; x.fillRect(i * 4, j * 4, 4, 4); } const t = new T.CanvasTexture(c); t.magFilter = T.NearestFilter; return t; }
  let chk = null;
  function gate(cp, finish, air, w) {
    const G = new T.Group();
    if (air) {
      const tor = new T.Mesh(new T.TorusGeometry(11, 1.1, 8, 28), new T.MeshBasicMaterial({ color: finish ? 0xffffff : 0xff4fd8, transparent: true, opacity: 0.85 })); G.add(tor);
      G.position.set(cp.x, cp.y, cp.z); G.userData.ring = tor; return G;
    }
    chk = chk || checkerTex(); const hw = w || 10;
    const postM = new T.MeshLambertMaterial({ color: finish ? 0xffffff : 0xff4fd8 });
    const p1 = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 8, 8), postM), p2 = p1.clone(); p1.position.set(-hw, 4, 0); p2.position.set(hw, 4, 0);
    const ban = new T.Mesh(new T.BoxGeometry(hw * 2 + 1, 1.6, 0.3), finish ? new T.MeshBasicMaterial({ map: chk }) : new T.MeshLambertMaterial({ color: 0xff4fd8, emissive: 0x551040 })); ban.position.y = 8;
    G.add(p1, p2, ban); const y = W.height(cp.x, cp.z) + (cp.water ? 0 : 0); G.position.set(cp.x, Math.max(y, cp.water ? 0 : -99), cp.z); G.rotation.y = Math.atan2(cp.dx, cp.dz);
    return G;
  }

  // ---- start a race ----
  // opts: { diff, ai, laps, online:{ids:[{pid,name,slot}], host:bool}, slot, vehicle (Veh to use) }
  R.start = function (rc, opts) {
    const G = GR.G; R.stop(true);
    const P = GR.racePath(rc), diff = GR.DIFF[opts.diff || 'normal'];
    const r = R.cur = { rc, P, diff, diffKey: opts.diff || 'normal', laps: rc.type === 'circuit' ? (opts.laps || rc.laps || 1) : 1, air: rc.type === 'air', t: -3.5, cps: null, ai: [], gates: [], online: opts.online || null, others: {}, done: false, resultShown: false, cleanHits: 0, dmg0: 0, startedAt: performance.now() };
    r.cps = buildCPs(Object.assign({}, rc, { laps: r.laps }), P);
    r.cps.forEach((c) => { c.water = rc.vehicle === 'boat'; });
    // place me
    const me = G.me; const slot = opts.slot || 0; const sp = r.air ? { x: P.pts[0].x, z: P.pts[0].z, yaw: Math.atan2(P.pts[1].x - P.pts[0].x, P.pts[1].z - P.pts[0].z) } : slotPos(rc, P, slot);
    if (r.air) { const o = (slot - 1) * 14; sp.x += Math.cos(sp.yaw) * o; sp.z -= Math.sin(sp.yaw) * o; }
    me.place(sp.x, sp.z, sp.yaw, r.air ? W.height(sp.x, sp.z) + (me.kind === 'plane' ? 0 : 0) : null);
    if (r.air && me.kind !== 'plane') { me.y = Math.max(me.y, W.height(sp.x, sp.z) + 22); me.air = true; }
    if (r.air && me.kind === 'plane') { me.y = W.height(sp.x, sp.z) + 40; me.vF = 30; me.thr = 0.6; me.air = true; }
    r.dmg0 = me.dmg; r.hits0 = me.hits;
    r.me = { prog: 0, cp: 0, fin: null, hint: -1, lastS: 0, name: G.myName(), me: true };
    // AI rivals (host / solo only)
    const nAI = opts.ai != null ? opts.ai : rc.ai; r.aiCount = nAI;
    const takenSlots = r.online ? r.online.ids.length : 1;
    if (!r.online || r.online.host) {
      const ptype = me.type, pupg = Object.assign({}, me.upg); const V = GR.VEH[ptype];
      for (let i = 0; i < nAI; i++) {
        const k = takenSlots + i, pos = slotPos(rc, P, k);
        const a = new GR.Veh(ptype, AICOL[i % AICOL.length], { ai: true, upg: pupg, pace: diff.pace });
        a.corner = diff.corner; a.place(pos.x, pos.z, pos.yaw); G.scene.add(a.model);
        a.rs = { prog: 0, cp: 0, fin: null, hint: -1, lastS: 0, name: NAMES[(i + (rc.id.length)) % NAMES.length], lane: (i % 3 - 1) * 2.4, laneT: 0, stuck: 0, ai: true, id: 'ai' + i };
        void V; r.ai.push(a);
      }
    }
    refreshGates(r);
    GR.Traffic.enabled = false; GR.Traffic.clear();
    GR.UI && GR.UI.raceHud(true);
    return r;
  };
  function refreshGates(r) {
    const G = GR.G; r.gates.forEach((g) => G.scene.remove(g)); r.gates = [];
    const k = r.me.cp; for (let i = k; i < Math.min(r.cps.length, k + 2); i++) { const g = gate(r.cps[i], i === r.cps.length - 1, r.air, r.rc.vehicle === 'boat' ? 14 : 11); if (i > k) g.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.35; } }); G.scene.add(g); r.gates.push(g); }
  }
  R.stop = function (silent) {
    const r = R.cur; if (!r) return; const G = GR.G;
    r.ai.forEach((a) => a.dispose(G.scene)); r.gates.forEach((g) => G.scene.remove(g)); R.cur = null;
    GR.Traffic.enabled = true; GR.UI && GR.UI.raceHud(false);
    if (!silent && G.afterRace) G.afterRace(r);
  };

  // progress tracking for any racer state (st) driving vehicle v
  function track(r, st, v, dt, isAI) {
    if (st.fin != null) return;
    const cp = r.cps[st.cp];
    if (r.air) {
      const d = Math.hypot(v.x - cp.x, v.z - cp.z, (v.y + 1.5) - cp.y);
      st.prog = st.cp + Math.max(0, 1 - d / 400);
      if (d < 15) { st.cp++; if (!isAI && GR.G.me === v) { GR.Snd.fx('cp'); refreshGates(r); } }
    } else {
      const P = r.P, q = U.pathNearest(P.pi, v.x, v.z, st.hint, st.hint < 0 ? 0 : 40);
      if (st.hint < 0) { const g = U.pathNearest(P.pi, v.x, v.z, -1); st.hint = g.i; st.lastS = g.s; if (!st.init) { st.init = 1; let rel = g.s - startS(r.rc, P); if (P.closed && rel > P.pi.len / 2) rel -= P.pi.len; st.prog = rel; } } else {
        let d = q.s - st.lastS; if (P.closed) { if (d < -P.pi.len / 2) d += P.pi.len; if (d > P.pi.len / 2) d -= P.pi.len; }
        if (q.d < 60 && Math.abs(d) < 60) { st.prog += d; st.lastS = q.s; st.hint = q.i; } else { const g = U.pathNearest(P.pi, v.x, v.z, -1); if (g.d < 40) { st.hint = g.i; st.lastS = g.s; } }
      }
      st.wrong = (st.wrong || 0) * 0.95 + (q.s - (st.ps || q.s) < -0.01 && Math.abs(v.vF) > 3 ? 1 : 0) * 0.05; st.ps = q.s;
      const cap = cp.s + 15; if (st.prog > cap) st.prog = cap;
      const rad = r.rc.vehicle === 'boat' ? 26 : 24;
      if (Math.hypot(v.x - cp.x, v.z - cp.z) < rad || (st.prog >= cp.s - 2 && Math.hypot(v.x - cp.x, v.z - cp.z) < rad * 1.8)) { st.cp++; if (!isAI && GR.G.me === v) { GR.Snd.fx('cp'); refreshGates(r); } }
      st.lap = r.P.closed ? Math.min(r.laps, 1 + Math.floor(Math.max(0, st.prog) / r.P.pi.len)) : 1;
    }
    if (st.cp >= r.cps.length) { st.fin = r.t; st.prog = R.total(r) + 1; if (!isAI && GR.G.me === v) onMyFinish(r); }
  }
  function aiInput(r, a, st, dt, others) {
    const P = r.P;
    const q = U.pathNearest(P.pi, a.x, a.z, st.hint < 0 ? -1 : st.hint, 40);
    const v = Math.max(0, a.vF), look = 6 + v * 0.42;
    // lane changes to pass slower cars
    st.laneT -= dt;
    for (const o of others) { if (o === a) continue; const dx = o.x - a.x, dz = o.z - a.z, fx = Math.sin(a.yaw), fz = Math.cos(a.yaw), f = dx * fx + dz * fz, s = dx * -fz + dz * fx; if (f > 0 && f < 14 && Math.abs(s) < 2.6 && st.laneT <= 0) { st.lane = U.clamp(st.lane + (s > 0 ? 3 : -3), -4, 4); st.laneT = 2.5; } }
    if (st.laneT <= 0) st.lane *= Math.max(0, 1 - dt * 0.15);
    const tp = U.pathAt(P.pi, q.s + look), nx = -tp.dz, nz = tp.dx, lane = r.rc.vehicle === 'boat' ? st.lane * 1.5 : st.lane;
    const tx = tp.x + nx * lane, tz = tp.z + nz * lane;
    const want = Math.atan2(tx - a.x, tz - a.z), err = U.ang(want - a.yaw);
    const steer = U.clamp(-err * 2.6, -1, 1);
    // speed planning from path curvature ahead
    const surf = W.SURF[a.surf || 0], sk = (a.surf === 3 || a.surf === 4) ? a.V.snow : a.surf === 0 ? 1 : a.V.off;
    const gripE = (a.kind === 'boat' ? a.V.grip : (surf.grip + (1 - surf.grip) * sk)) * a.stats().grip;
    const latA = gripE * 40 * 0.8 * a.corner, dec = 20 * Math.max(0.5, gripE);
    let vt = 999; const span = 24 + v * v / (2 * dec);
    let prev = U.pathAt(P.pi, q.s); let prevH = Math.atan2(prev.dx, prev.dz);
    for (let d = 8; d < span; d += 8) {
      const p = U.pathAt(P.pi, q.s + d), h = Math.atan2(p.dx, p.dz), k = Math.abs(U.ang(h - prevH)) / 8 + 1e-4;
      const vc = Math.sqrt(latA / k), allow = Math.sqrt(vc * vc + 2 * dec * Math.max(0, d - 8)); if (allow < vt) vt = allow; prevH = h;
    }
    const inp = { steer, thr: vt > v + 0.5 ? 1 : 0, brk: v > vt + 1.5 ? 1 : 0 };
    if (r.t < 0) { inp.thr = 0; inp.brk = 1; }
    st.q = q; return inp;
  }
  function aiDrive(r, a, dt, others) {
    const st = a.rs, P = r.P; if (st.fin != null && st.fin < r.t - 6) { a.update(dt, { brk: a.vF > 0.5 ? 1 : 0 }); return; }
    const inp = aiInput(r, a, st, dt, others), q = st.q;
    // light rubber band vs the leading human
    const lead = Math.max(r.me.prog, ...Object.values(r.others).map((o) => o.prog || 0));
    const gap = lead - st.prog; const rb = U.clamp(gap / 160, -1, 1) * 0.05;
    a.pace = r.diff.pace * (1 + rb);
    a.update(dt, inp);
    // stuck / off-path recovery
    if (r.t > 2 && st.fin == null) {
      if (Math.abs(a.vF) < 2) st.stuck += dt; else st.stuck = Math.max(0, st.stuck - dt);
      if (st.stuck > 2.5 || q.d > 45 || a.wet > 1) { const p = U.pathAt(P.pi, q.s + 6); a.place(p.x, p.z, Math.atan2(p.dx, p.dz)); st.stuck = 0; st.hint = -1; }
    }
  }
  // test autopilot for the local player (same driving brain as the AI)
  R.autoInput = function (dt) { const r = R.cur; if (!r || r.air) return null; GR.G.me.corner = 0.95; const st = r.auto || (r.auto = { hint: -1, lane: 0, laneT: 0, prog: 0 }); return aiInput(r, GR.G.me, st, dt, [GR.G.me].concat(r.ai)); };
  function onMyFinish(r) {
    const G = GR.G, me = G.me; GR.Snd.fx('win'); GR.FX.confetti(me.x, me.y + 3, me.z);
    r.myFinish = r.t; r.cleanHits = me.hits - r.hits0; r.dmgTaken = me.dmg - r.dmg0;
    if (r.online) G.netRace && G.netRace({ t: 'rfin', fin: r.t });
    setTimeout(() => { if (R.cur === r) R.showResults(); }, 1800);
  }
  R.standings = function () {
    const r = R.cur; if (!r) return [];
    const list = [{ name: r.me.name + ' (you)', prog: r.me.prog, fin: r.me.fin, me: true, id: 'me' }];
    r.ai.forEach((a) => list.push({ name: a.rs.name, prog: a.rs.prog, fin: a.rs.fin, id: a.rs.id, ai: true }));
    for (const k in r.others) { const o = r.others[k]; list.push({ name: o.name, prog: o.prog, fin: o.fin, id: k, ai: !!o.ai, friend: !o.ai }); }
    list.sort((a, b) => (a.fin != null && b.fin != null) ? a.fin - b.fin : a.fin != null ? -1 : b.fin != null ? 1 : b.prog - a.prog);
    return list;
  };
  R.myPos = function () { const l = R.standings(); return { pos: l.findIndex((e) => e.me) + 1, of: l.length }; };
  R.showResults = function () {
    const r = R.cur; if (!r || r.resultShown) return; r.resultShown = true;
    const G = GR.G, { pos, of } = R.myPos();
    let pay = 0, medal = null, clean = false;
    if (r.air) {
      const len = r.P.pi.len; const gold = len / 38 + 8, silver = len / 31 + 8, bronze = len / 25 + 8; r.medals = { gold, silver, bronze };
      medal = r.me.fin <= gold ? 'gold' : r.me.fin <= silver ? 'silver' : r.me.fin <= bronze ? 'bronze' : null;
      pay = r.rc.pay * ({ gold: 1, silver: 0.65, bronze: 0.4 }[medal] || 0.15);
      if (r.online && of > 1) pay *= [1.2, 1, 0.9][pos - 1] || 0.9;
    } else {
      const mult = [1, 0.6, 0.4, 0.25, 0.2, 0.15, 0.12, 0.1][pos - 1] || 0.1; pay = r.rc.pay * mult * r.diff.pay * (r.laps / (r.rc.laps || 1));
    }
    clean = r.cleanHits <= 1 && r.dmgTaken < 6;
    const cleanBonus = clean ? Math.round(pay * 0.25) : 0; pay = Math.round(pay);
    const best = G.save.best[r.rc.id + (r.air ? '' : '_' + r.laps)];
    const newBest = !best || r.me.fin < best;
    G.earn(pay + cleanBonus, false); if (newBest) G.save.best[r.rc.id + (r.air ? '' : '_' + r.laps)] = r.me.fin;
    G.save.stats.races = (G.save.stats.races || 0) + 1; if (pos === 1 && !r.air) G.save.stats.wins = (G.save.stats.wins || 0) + 1;
    if (r.air && medal) G.save.medals[r.rc.id] = medal;
    if (pos === 1 && !r.air) { G.save.won[r.rc.id] = Math.max(G.save.won[r.rc.id] || 0, { easy: 1, normal: 2, hard: 3 }[r.diffKey]); }
    G.persist();
    r.result = { pos, of, pay, cleanBonus, clean, medal, newBest, time: r.me.fin };
    GR.UI.results(r);
  };
  R.update = function (dt) {
    const r = R.cur; if (!r) return; const G = GR.G;
    r.t += dt;
    if (r.t < 0 && Math.ceil(r.t) !== r.lastCount) { r.lastCount = Math.ceil(r.t); if (r.lastCount <= 3 && r.lastCount >= 1) { GR.Snd.fx('count'); GR.UI.bigText(String(r.lastCount)); } }
    if (r.t >= 0 && !r.went) { r.went = true; GR.Snd.fx('go'); GR.UI.bigText('GO!'); }
    track(r, r.me, G.me, dt, false);
    const all = [G.me].concat(r.ai, G.remoteList());
    r.ai.forEach((a) => { if (a.remote) { a.lerpRemote(dt); return; } aiDrive(r, a, dt, all); track(r, a.rs, a, dt, true); });
    // collisions among race cars
    for (let i = 0; i < r.ai.length; i++) { const hit = GR.collidePair(G.me, r.ai[i]); if (hit > 5) { G.me.hit(hit * 0.7, (G.me.x + r.ai[i].x) / 2, (G.me.z + r.ai[i].z) / 2); } for (let j = i + 1; j < r.ai.length; j++) GR.collidePair(r.ai[i], r.ai[j]); }
    r.gates.forEach((g) => { if (g.userData.ring) g.lookAt(G.cam.position.x, g.position.y, G.cam.position.z); });
    if (r.air && r.gates[0]) r.gates[0].rotation.z += dt;
    // safety: auto-show results if everyone else finished long ago and I'm stuck (never soft-lock)
    if (r.me.fin == null && r.t > 600) { r.me.fin = r.t; r.me.prog = 0; onMyFinish(r); }
  };
  R.nextTarget = function () { const r = R.cur; if (!r || r.me.fin != null) return null; const c = r.cps[r.me.cp]; return c ? { x: c.x, z: c.z, y: c.y } : null; };
  R.resetPoint = function () {
    const r = R.cur; if (!r) return null; const c = r.cps[r.me.cp - 1];
    if (r.air) { const p = c || { x: r.P.pts[0].x, z: r.P.pts[0].z, y: r.P.pts[0].y }; const n = r.cps[r.me.cp] || p; return { x: p.x, z: p.z, y: p.y, yaw: Math.atan2(n.x - p.x, n.z - p.z) }; }
    const s = c ? (startS(r.rc, r.P) + c.s) : startS(r.rc, r.P); const p = U.pathAt(r.P.pi, s); r.me.hint = -1; return { x: p.x, z: p.z, yaw: Math.atan2(p.dx, p.dz) };
  };
  // online: snapshot of AI for clients
  R.aiSnap = function () { const r = R.cur; if (!r) return null; return r.ai.map((a) => ({ id: a.rs.id, n: a.rs.name, ty: a.type, c: a.color, s: a.snap(), pg: Math.round(a.rs.prog), f: a.rs.fin })); };
  R.applyAiSnap = function (list) {
    const r = R.cur; if (!r || !list) return; const G = GR.G; r.remoteAi = r.remoteAi || {};
    list.forEach((s) => {
      let a = r.remoteAi[s.id]; if (!a) { a = r.remoteAi[s.id] = new GR.Veh(s.ty, s.c, { remote: true }); a.fixed = true; G.scene.add(a.model); r.ai.push(a); a.rs = { name: s.n, prog: 0, fin: null, id: s.id, ai: true, remote: true }; }
      a.setRemote(s.s); a.rs.prog = s.pg; a.rs.fin = s.f;
    });
  };
})();
