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
  function spawnCar(px, pz) {
    for (let tries = 0; tries < 12; tries++) {
      const r = troads[(rnd() * troads.length) | 0], s = rnd() * r.pi.len, p = U.pathAt(r.pi, s);
      const d = Math.hypot(p.x - px, p.z - pz); if (d < 130 || d > 300) continue;
      if (TR.cars.some((c) => c.r === r && Math.abs(c.s - s) < 25)) continue;
      const type = TYPES[(rnd() * TYPES.length) | 0], col = type === 'taxi' ? '#ffc61a' : type === 'police' ? '#14213d' : type === 'bus' ? '#ffc61a' : COLS[(rnd() * COLS.length) | 0];
      const v = new GR.Veh(type, col); v.fixed = true; v.traffic = true; v.r = r; v.s = s; v.dir = rnd() < 0.5 ? 1 : -1; v.cruise = r.name === 'Grok Highway' ? 20 + rnd() * 5 : 11 + rnd() * 4; v.vF = 0; v.stun = 0; v.lane = r.hw * 0.5;
      scene.add(v.model); TR.cars.push(v); placeT(v, 0); return v;
    }
    return null;
  }
  function placeT(v, dt) {
    const p = U.pathAt(v.r.pi, v.s); const fx = p.dx * v.dir, fz = p.dz * v.dir, rx = -fz, rz = fx;
    const tx = p.x + rx * v.lane, tz = p.z + rz * v.lane, ty = W.height(tx, tz);
    v.vx = fx * v.vF; v.vz = fz * v.vF;
    if (v.stun > 0 && dt) { v.stun -= dt; v.x += (tx - v.x) * dt * 0.5; v.z += (tz - v.z) * dt * 0.5; }
    else { v.x = tx; v.z = tz; }
    v.y = ty; const yaw = Math.atan2(fx, fz); v.yaw = dt ? v.yaw + U.ang(yaw - v.yaw) * Math.min(1, dt * 8) : yaw; v.syncModel(dt || 0.016);
  }
  function endTransfer(v) {
    // reached end of an open road: hop onto a crossing road
    const p = U.pathAt(v.r.pi, v.s), cands = [];
    troads.forEach((r) => { if (r === v.r) return; const q = U.pathNearest(r.pi, p.x, p.z, -1); if (q.d < 14) cands.push({ r, s: q.s }); });
    if (!cands.length) { v.dir *= -1; return; }
    const c = cands[(rnd() * cands.length) | 0]; v.r = c.r; v.s = c.s;
    const dirs = []; if (c.r.closed || c.s + 20 < c.r.pi.len) dirs.push(1); if (c.r.closed || c.s > 20) dirs.push(-1); v.dir = dirs[(rnd() * dirs.length) | 0] || 1;
  }
  TR.clear = function () { TR.cars.forEach((c) => c.dispose(scene)); TR.cars.length = 0; TR.peds.forEach((p) => (p.on = false)); };
  TR.update = function (dt, me, others, t) {
    const px = me.x, pz = me.z;
    if (!TR.enabled) { if (TR.cars.length) TR.clear(); hidePeds(); return; }
    // cars
    for (let i = TR.cars.length - 1; i >= 0; i--) { const c = TR.cars[i]; if (Math.hypot(c.x - px, c.z - pz) > 340) { c.dispose(scene); TR.cars.splice(i, 1); } }
    if (TR.cars.length < MAXC && rnd() < 0.3) spawnCar(px, pz);
    const movers = [me].concat(others || []);
    TR.cars.forEach((c) => {
      // look ahead for obstacles
      const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); let block = false;
      for (const o of movers.concat(TR.cars)) { if (o === c || !o) continue; const dx = o.x - c.x, dz = o.z - c.z, f = dx * fx + dz * fz, s = Math.abs(dx * -fz + dz * fx); if (f > 0 && f < 13 + c.L / 2 && s < 2.6 && Math.abs((o.y || 0) - c.y) < 4) { block = true; break; } }
      const tgt = block || c.stun > 0 ? 0 : c.cruise; c.vF += U.clamp(tgt - c.vF, -14 * dt, 5 * dt);
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
        if (d > 50 && d < 200 && !W.blocked(x, z, 0.6)) { Object.assign(p, { on: true, r, s, side, off, dir: rnd() < 0.5 ? 1 : -1, sp: 1.2 + rnd() * 0.6, x, z, y: W.height(x, z), hop: 0, dx: 0, dz: 0, yaw: 0 }); }
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
      p.y = W.height(p.x, p.z);
      const bob = p.hop > 0 ? p.hy : Math.abs(Math.sin(t * 7 + i)) * 0.08;
      q.setFromEuler(e.set(0, p.yaw, p.hop > 0 ? 0.3 : 0)); vv.set(p.x, p.y + bob, p.z); m4.compose(vv, q, one);
      TR.pShirt.setMatrixAt(n, m4); TR.pRest.setMatrixAt(n, m4); const c = new T.Color(COLS[i % COLS.length]); TR.pShirt.setColorAt(n, c); n++;
    });
    TR.pShirt.count = n; TR.pRest.count = n; TR.pShirt.instanceMatrix.needsUpdate = true; TR.pRest.instanceMatrix.needsUpdate = true; if (TR.pShirt.instanceColor) TR.pShirt.instanceColor.needsUpdate = true;
  }
  TR.pedCount = () => TR.peds.filter((p) => p.on).length;
})();
