/* Grok Rides - ambient traffic + pedestrians (they always hop out of the way) */
(function () {
  'use strict';
  const GR = window.GR, U = GR.U, W = GR.W, M = GR.M, T = THREE;
  const TR = GR.Traffic = { cars: [], peds: [], enabled: true };
  const TYPES = ['compact', 'compact', 'taxi', 'pickup', 'sports', 'compact', 'bus', 'icecream', 'police', 'limo', 'muscle', 'taxi', 'bigrig'];
  const COLS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#f8fafc', '#64748b', '#0ea5e9'];
  const MAXC = 16, MAXP = 36;
  let scene, troads, proads, rnd = U.rng(77);
  TR.init = function (sc) {
    scene = sc; troads = W.roads.filter((r) => r.traffic); proads = W.roads.filter((r) => r.traffic && r.kind !== 'runway' && (r.name.indexOf('City') === 0 || r.name.indexOf('Town') === 0));
    // pedestrian instanced meshes
    const P = (g, c) => U.paint(g, c);
    const shirt = U.merge([P(new T.CylinderGeometry(0.26, 0.3, 0.75, 8).translate(0, 1.15, 0), '#fff'), P(new T.SphereGeometry(0.26, 8, 6).scale(1, 0.5, 1).translate(0, 1.5, 0), '#fff'), P(new T.CylinderGeometry(0.07, 0.07, 0.7, 5).rotateZ(0.15).translate(0.34, 1.12, 0), '#fff'), P(new T.CylinderGeometry(0.07, 0.07, 0.7, 5).rotateZ(-0.15).translate(-0.34, 1.12, 0), '#fff')]);
    const rest = U.merge([P(new T.CylinderGeometry(0.11, 0.1, 0.8, 6).translate(0.12, 0.4, 0), '#2e3a5c'), P(new T.CylinderGeometry(0.11, 0.1, 0.8, 6).translate(-0.12, 0.4, 0), '#2e3a5c'), P(new T.SphereGeometry(0.24, 10, 8).translate(0, 1.82, 0), '#f1c7a0'), P(new T.SphereGeometry(0.25, 10, 6).scale(1, 0.7, 1).translate(0, 1.92, -0.03), '#4a2f1e'), P(new T.SphereGeometry(0.035, 5, 4).translate(0.09, 1.85, 0.21), '#222'), P(new T.SphereGeometry(0.035, 5, 4).translate(-0.09, 1.85, 0.21), '#222')]);
    TR.pShirt = new T.InstancedMesh(shirt, new T.MeshLambertMaterial({ vertexColors: true }), MAXP); TR.pRest = new T.InstancedMesh(rest, M.matMatte, MAXP);
    const c = new T.Color(); for (let i = 0; i < MAXP; i++) { TR.pShirt.setColorAt(i, c.set(COLS[i % COLS.length])); }
    TR.pShirt.frustumCulled = TR.pRest.frustumCulled = false; scene.add(TR.pShirt, TR.pRest);
    for (let i = 0; i < MAXP; i++) TR.peds.push({ on: false });
  };
  let nextId = 1;
  const camF = { x: 0, z: 1, ok: false };
  function inView(x, z, px, pz) { // roughly inside the camera's view cone (so we never pop cars in/out in front of you)
    const cam = GR.G && GR.G.cam; if (!cam) return false;
    const dx = x - cam.position.x, dz = z - cam.position.z, d = Math.hypot(dx, dz) || 1;
    return (dx * camF.x + dz * camF.z) / d > 0.35;
  }
  function spawnCar(px, pz) {
    for (let tries = 0; tries < 12; tries++) {
      const r = troads[(rnd() * troads.length) | 0], s = rnd() * r.pi.len, p = U.pathAt(r.pi, s);
      const d = Math.hypot(p.x - px, p.z - pz); if (d < 150 || d > 310) continue;
      if (d < 280 && inView(p.x, p.z, px, pz)) continue;
      if (!r.closed && (s < 25 || s > r.pi.len - 25)) continue;
      if (TR.cars.some((c) => Math.hypot(c.x - p.x, c.z - p.z) < 22)) continue;
      const type = TYPES[(rnd() * TYPES.length) | 0], col = type === 'taxi' ? '#ffc61a' : type === 'police' ? '#14213d' : type === 'bus' ? '#ffc61a' : COLS[(rnd() * COLS.length) | 0];
      const v = new GR.Veh(type, col); v.fixed = true; v.traffic = true; v.id = nextId++; v.r = r; v.s = s; v.dir = rnd() < 0.5 ? 1 : -1;
      v.cruise = (r.name === 'Grok Highway' ? 20 + rnd() * 5 : 11 + rnd() * 4) * (v.L > 9 ? 0.85 : 1); v.vF = 0; v.stun = 0;
      v.lane0 = r.hw * 0.5; v.lane = v.lane0; v.laneT = v.lane0; v.ox = v.oz = v.oyaw = 0; v.bT = v.bD = 0; v.waitT = 0; v.passT = 0;
      scene.add(v.model); TR.cars.push(v); placeT(v, 0); return v;
    }
    return null;
  }
  // a point on the car's lane, s metres along its road
  const pa = { x: 0, z: 0 }, pb = { x: 0, z: 0 };
  function lanePt(v, s, out) {
    // open roads: extrapolate straight past the ends (pathAt clamps there and its direction collapses to 0,
    // which used to snap long buses/limos onto the centre line for a frame)
    const pi = v.r.pi; let over = 0; if (!v.r.closed) { if (s > pi.len - 0.05) { over = s - (pi.len - 0.05); s = pi.len - 0.05; } else if (s < 0.05) { over = s - 0.05; s = 0.05; } }
    const p = U.pathAt(pi, s), fx = p.dx * v.dir, fz = p.dz * v.dir; out.x = p.x + p.dx * over - fz * v.lane; out.z = p.z + p.dz * over + fx * v.lane; return out;
  }
  function railPose(v, out) {
    // front + rear axle both ride the lane, so long buses/limos swing round corners instead of sliding sideways
    const half = Math.min(v.L * 0.38, 4.5); lanePt(v, v.s + v.dir * half, pa); lanePt(v, v.s - v.dir * half, pb);
    out.x = (pa.x + pb.x) / 2; out.z = (pa.z + pb.z) / 2; out.yaw = Math.atan2(pa.x - pb.x, pa.z - pb.z); return out;
  }
  const rp = { x: 0, z: 0, yaw: 0 };
  function placeT(v, dt) {
    v.lane += U.clamp(v.laneT - v.lane, -2.5 * (dt || 1), 2.5 * (dt || 1));
    railPose(v, rp);
    if (dt && v.bT < v.bD) { v.bT = Math.min(v.bD, v.bT + dt); const k = 1 - U.smooth(0, 1, v.bT / v.bD); v.ox = v.ox0 * k; v.oz = v.oz0 * k; v.oyaw = v.oy0 * k; } // eased turn blend
    const nx = rp.x + v.ox, nz = rp.z + v.oz, yaw = rp.yaw + v.oyaw;
    v.vx = dt ? (nx - v.x) / dt : Math.sin(yaw) * v.vF; v.vz = dt ? (nz - v.z) / dt : Math.cos(yaw) * v.vF;
    v.x = nx; v.z = nz; v.yaw = yaw; v.y = W.gy(nx, nz); v.air = false; v.syncModel(dt || 0.016);
  }
  function endTransfer(v) {
    // reached the end of an open road: turn onto a crossing road, blending smoothly from where we are (no teleport / spin)
    const old = { x: v.x, z: v.z, yaw: v.yaw };
    const p = U.pathAt(v.r.pi, v.s), cands = [];
    troads.forEach((r) => { if (r === v.r) return; const q = U.pathNearest(r.pi, p.x, p.z, -1); if (q.d < 14) cands.push({ r, s: q.s }); });
    if (!cands.length) { v.dir *= -1; }
    else {
      const hx = Math.sin(old.yaw), hz = Math.cos(old.yaw), opts = [];
      cands.forEach((c) => { const q = U.pathAt(c.r.pi, c.s); [1, -1].forEach((d) => { if (!c.r.closed && ((d > 0 && c.s + 25 > c.r.pi.len) || (d < 0 && c.s < 25))) return; if ((q.dx * d) * hx + (q.dz * d) * hz < -0.3) return; opts.push({ r: c.r, s: c.s, d }); }); });
      if (!opts.length) cands.forEach((c) => opts.push({ r: c.r, s: c.s, d: c.r.closed || c.s + 25 < c.r.pi.len ? 1 : -1 }));
      const o = opts[(rnd() * opts.length) | 0]; v.r = o.r; v.s = o.s; v.dir = o.d;
    }
    v.lane0 = v.r.hw * 0.5; v.lane = v.laneT = v.lane0; v.passT = 0;
    railPose(v, rp); v.ox = v.ox0 = old.x - rp.x; v.oz = v.oz0 = old.z - rp.z; v.oyaw = v.oy0 = U.ang(old.yaw - rp.yaw); v.bT = 0; v.bD = Math.max(1.7, v.L / 4) * (0.5 + Math.abs(v.oy0) / 3);
  }
  TR.spawnTest = function (type, r, s, dir) { // test hook: put one car on a given road
    const v = new GR.Veh(type, '#ffc61a'); v.fixed = true; v.traffic = true; v.id = nextId++; v.r = r; v.s = s; v.dir = dir; v.cruise = 12; v.vF = 0; v.stun = 0;
    v.lane0 = r.hw * 0.5; v.lane = v.laneT = v.lane0; v.ox = v.oz = v.oyaw = 0; v.bT = v.bD = 0; v.waitT = 0; v.passT = 0; scene.add(v.model); TR.cars.push(v); placeT(v, 0); return v;
  };
  TR.clear = function () { TR.cars.forEach((c) => c.dispose(scene)); TR.cars.length = 0; TR.peds.forEach((p) => (p.on = false)); };
  TR.clearNear = function (x, z, r) { for (let i = TR.cars.length - 1; i >= 0; i--) { const c = TR.cars[i]; if (Math.hypot(c.x - x, c.z - z) < r + c.L / 2) { c.dispose(scene); TR.cars.splice(i, 1); } } };
  TR.update = function (dt, me, others, t) {
    const px = me.x, pz = me.z;
    if (!TR.enabled) { if (TR.cars.length) TR.clear(); hidePeds(); return; }
    const cam = GR.G && GR.G.cam; if (cam) { const e = cam.matrixWorld.elements; const l = Math.hypot(e[8], e[10]) || 1; camF.x = -e[8] / l; camF.z = -e[10] / l; }
    // cars: only despawn far away / out of view so they never pop out in front of you
    for (let i = TR.cars.length - 1; i >= 0; i--) { const c = TR.cars[i], d = Math.hypot(c.x - px, c.z - pz); if (d > 460 || (d > 340 && !inView(c.x, c.z, px, pz)) || (c.waitT > 8 && d > 70 && !inView(c.x, c.z, px, pz))) { c.dispose(scene); TR.cars.splice(i, 1); } }
    if (TR.cars.length < MAXC && rnd() < 0.3) spawnCar(px, pz);
    const movers = [me].concat(others || []);
    TR.cars.forEach((c) => {
      // look ahead for obstacles
      const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); let block = null;
      const chk = (o, isCar) => {
        if (o === c || !o || block) return; const dx = o.x - c.x, dz = o.z - c.z, f = dx * fx + dz * fz, sd = Math.abs(dx * -fz + dz * fx);
        if (!(f > 0 && f < 12 + c.L / 2 + (o.L || 4) / 2 && sd < 1.4 + (o.Wd || 2) / 2 + 0.2 && Math.abs((o.y || 0) - c.y) < 4)) return;
        if (isCar) {
          const hd = Math.cos(o.yaw - c.yaw);
          // crossing traffic at a junction: lower id goes first (no gridlock); after a long wait just go
          if (hd < 0.5 && hd > -0.5 && (o.id > c.id || c.waitT > 4)) return;
        } else if (c.passT > 0) return;
        block = o;
      };
      for (const o of movers) chk(o, false);
      for (const o of TR.cars) chk(o, true);
      if (block) c.waitT += dt; else c.waitT = Math.max(0, c.waitT - dt * 2);
      // stuck behind a parked player/friend: pull round them in the other lane
      if (block && movers.indexOf(block) >= 0 && c.waitT > 2.5 && Math.hypot(block.vx || 0, block.vz || 0) < 1) { c.passT = 6; c.laneT = -c.lane0 * 0.9; }
      if (c.passT > 0) { c.passT -= dt; if (c.passT <= 0) c.laneT = c.lane0; }
      const tgt = block || c.stun > 0 ? 0 : c.cruise * (c.passT > 0 ? 0.55 : 1) * (c.bT < c.bD ? 0.6 : 1);
      c.vF += U.clamp(tgt - c.vF, -14 * dt, 5 * dt); if (c.stun > 0) c.stun -= dt;
      c.s += c.dir * c.vF * dt;
      if (!c.r.closed && (c.s < 2 || c.s > c.r.pi.len - 2)) { c.s = U.clamp(c.s, 2, c.r.pi.len - 2); endTransfer(c); }
      placeT(c, dt);
      if (block && rnd() < dt * 0.15 && Math.hypot(c.x - px, c.z - pz) < 40) { GR.Snd && GR.Snd.fx('horn'); }
    });
    // pedestrians
    updatePeds(dt, px, pz, movers, t);
  };
  TR.collide = function (v, onHit) {
    for (const c of TR.cars) { const hit = GR.collidePair(v, c); if (hit > 0) { c.stun = 2; if (hit > 4.5) { v.hit(hit * 0.8, (v.x + c.x) / 2, (v.z + c.z) / 2, false, 'traffic'); onHit && onHit(c, hit); } } }
  };
  const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), vv = new T.Vector3(), one = new T.Vector3(1, 1, 1);
  function hidePeds() { if (!TR.pShirt) return; TR.pShirt.count = 0; TR.pRest.count = 0; }
  function updatePeds(dt, px, pz, movers, t) {
    const reg = W.region(px, pz), near = reg === 'city' || reg === 'town' || W.inRect(W.CITY, px, pz, 250) || W.inRect(W.TOWN, px, pz, 250);
    let n = 0;
    TR.peds.forEach((p, i) => {
      if (p.on && Math.hypot(p.x - px, p.z - pz) > 230) p.on = false;
      if (!p.on && near && rnd() < 0.05) {
        const r = proads[(rnd() * proads.length) | 0], s = rnd() * r.pi.len, a = U.pathAt(r.pi, s), side = rnd() < 0.5 ? 1 : -1, off = r.hw + 3.5;
        const x = a.x - a.dz * off * side, z = a.z + a.dx * off * side, d = Math.hypot(x - px, z - pz);
        if (d > 50 && d < 200 && !W.blocked(x, z, 0.6)) { Object.assign(p, { on: true, r, s, side, off, dir: rnd() < 0.5 ? 1 : -1, sp: 1.2 + rnd() * 0.6, x, z, y: W.gy(x, z), hop: 0, dx: 0, dz: 0, yaw: 0 }); }
      }
      if (!p.on) return;
      // dodge vehicles
      let threat = null;
      for (const o of movers.concat(TR.cars)) { if (!o) continue; const sp = Math.hypot(o.vx || 0, o.vz || 0); const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz); if (d < 4 + sp * 0.35 && sp > 2 && Math.abs((o.y || 0) - p.y) < 4) { threat = { dx, dz, d, o }; break; } }
      if (threat && p.hop <= 0) { const l = threat.d || 1; p.dx = threat.dx / l * 7; p.dz = threat.dz / l * 7; p.hop = 0.6; if (p.yell == null || t - p.yell > 3) { p.yell = t; GR.FX && GR.FX.pop(['!', 'Whoa!', 'Eek!', 'Hey!'][(rnd() * 4) | 0], p.x, p.y + 3, p.z, '#ffffff', 2.2); } }
      if (p.hop > 0) { p.hop -= dt; let nx = p.x + p.dx * dt, nz = p.z + p.dz * dt; if (!W.blocked(nx, nz, 0.5)) { p.x = nx; p.z = nz; } p.hy = Math.sin((0.6 - p.hop) / 0.6 * Math.PI) * 1.4; }
      else {
        p.hy = 0;
        // drift back to sidewalk line, walk along it
        p.s += p.dir * p.sp * dt; if (!p.r.closed && (p.s < 5 || p.s > p.r.pi.len - 5)) p.dir *= -1;
        const a = U.pathAt(p.r.pi, p.s), tx = a.x - a.dz * p.off * p.side, tz = a.z + a.dx * p.off * p.side;
        p.x += (tx - p.x) * Math.min(1, dt * 1.5); p.z += (tz - p.z) * Math.min(1, dt * 1.5); p.yaw = Math.atan2(a.dx * p.dir, a.dz * p.dir);
      }
      p.y = W.gy(p.x, p.z);
      const bob = p.hop > 0 ? p.hy : Math.abs(Math.sin(t * 7 + i)) * 0.08;
      q.setFromEuler(e.set(0, p.yaw, p.hop > 0 ? 0.3 : 0)); vv.set(p.x, p.y + bob, p.z); m4.compose(vv, q, one);
      TR.pShirt.setMatrixAt(n, m4); TR.pRest.setMatrixAt(n, m4); const c = new T.Color(COLS[i % COLS.length]); TR.pShirt.setColorAt(n, c); n++;
    });
    TR.pShirt.count = n; TR.pRest.count = n; TR.pShirt.instanceMatrix.needsUpdate = true; TR.pRest.instanceMatrix.needsUpdate = true; if (TR.pShirt.instanceColor) TR.pShirt.instanceColor.needsUpdate = true;
  }
  TR.pedCount = () => TR.peds.filter((p) => p.on).length;
})();
