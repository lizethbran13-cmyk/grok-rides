/* Grok Rides - vehicle physics (cars, trucks, boats, helicopter, plane, balloon) */
(function () {
  'use strict';
  const GR = window.GR, U = GR.U, W = GR.W, M = GR.M, T = THREE;
  const G_ = 24; // cartoon gravity
  const tmpN = {}, nearList = [];

  class Veh {
    constructor(type, color, o) {
      o = o || {};
      this.type = type; this.V = GR.VEH[type]; this.kind = this.V.kind; this.color = color || this.V.color || '#ff4fd8';
      this.upg = o.upg || {}; this.pace = o.pace || 1; this.corner = 1; this.ai = !!o.ai; this.remote = !!o.remote;
      this.model = M.vehicle(type, this.color, { rim: o.rim, glow: o.glow, beam: !!o.beam, rider: o.rider || (this.V.two || this.V.kart || this.V.ski ? ['#3b82f6', '#f97316', '#a855f7', '#22c55e', '#ef4444'][Math.abs(Math.round((this.color.charCodeAt(2) || 0) + (this.color.charCodeAt(4) || 0))) % 5] : null) }); this.two = !!this.V.two; this.wh = 0; this.lean = 0; this.L = this.model.userData.L; this.Wd = this.model.userData.W;
      this.boost = o.boost != null ? o.boost : 0.6; this.sp = { p: 0, r: 0, y: 0, vp: 0, vr: 0, vy: 0 }; this.driftT = 0; this.gripK = 1;
      this.x = 0; this.y = 0; this.z = 0; this.yaw = 0; this.vx = 0; this.vz = 0; this.vy = 0; this.vF = 0; this.st = 0; this.pitch = 0; this.roll = 0;
      this.dmg = o.dmg || 0; this.air = false; this.thr = 0; this.nitro = 0; this.nitroT = 1; this.lift = 0; this.alt = 0; this.wet = 0; this.hits = 0; this.onGround = true;
      this.lastHit = 0; this.ev = []; this.surf = 0; this.rpm = 0;
      const n = this.kind === 'ground' || this.kind === 'boat' ? Math.max(1, Math.ceil(this.L / (Math.min(this.Wd, 3) + 0.2))) : 1;
      this.circ = []; const rad = this.kind === 'ground' || this.kind === 'boat' ? Math.min(this.Wd, 3) / 2 + 0.15 : this.V.r;
      for (let i = 0; i < n; i++) this.circ.push({ o: n === 1 ? 0 : -this.L / 2 + rad + (this.L - 2 * rad) * i / (n - 1), r: rad, x: 0, z: 0 });
      this.mass = this.V.mass;
    }
    place(x, z, yaw, y) {
      this.x = x; this.z = z; this.yaw = yaw || 0; this.vx = this.vz = this.vy = this.vF = 0;
      const gh = this.groundH(x, z); this.y = y != null ? Math.max(y, gh) : gh; this.air = this.y > gh + 0.5; this.thr = 0; this.lift = 0; this.yb = null; this.side = null; this.nitro = 0; this.syncModel(0);
    }
    groundH(x, z) {
      const h = W.gy(x, z);
      if (this.kind === 'boat') return Math.max(h, 0.05);
      if (this.kind === 'ground' && h < -0.2 && W.ellQ(W.LAKE, x, z) < 1.3) return h; // drive into the lake bed (splash)
      return h;
    }
    stats() {
      const u = this.upg, e = u.engine || 0;
      const b = this.buff || {};
      return { vmax: this.V.vmax * (1 + 0.06 * e) * (b.speed ? 1.05 : 1), acc: this.V.acc * (1 + 0.1 * e), grip: this.V.grip * (1 + 0.06 * (u.grip || 0)) * (b.grip ? 1.08 : 1), armor: u.armor || 0 };
    }
    speed() { return Math.hypot(this.vx, this.vz); }
    fwd() { return { x: Math.sin(this.yaw), z: Math.cos(this.yaw) }; }
    update(dt, inp) {
      if (this.remote) return;
      this.ev.length = 0;
      const steps = Math.max(1, Math.ceil(dt / (1 / 60))), h = dt / steps;
      for (let i = 0; i < steps; i++) {
        if (this.kind === 'ground' || this.kind === 'boat') this.stepGround(h, inp);
        else if (this.kind === 'heli') this.stepHeli(h, inp);
        else if (this.kind === 'plane') this.stepPlane(h, inp);
        else this.stepBalloon(h, inp);
        this.collideWorld();
      }
      this.tickBoost(dt);
      this.syncModel(dt, inp);
    }
    // NITRO for everyone: a boost tank that refills slowly by itself and FAST while drifting or flying off jumps
    tickBoost(dt) {
      if (this.nitro > 0) { this.nitro -= dt; if (this.nitro < 0) this.nitro = 0; this.nitroT = this.boost; return; }
      const lv = this.upg.nitro || 0, b = this.buff || {};
      let r = (1 / 45) * (1 + 0.6 * lv) * (b.nitro ? 2 : 1);
      if (this.drifting) r += 0.2; if (this.air && this.kind === 'ground') r += 0.3;
      this.boost = Math.min(1, this.boost + r * dt); this.nitroT = this.boost;
    }
    fireNitro() {
      if (this.nitro > 0 || this.boost < 0.2) return false;
      this.nitro = this.nitroMax = this.boost * (2.2 + 0.45 * (this.upg.nitro || 0)); this.boost = 0; this.nitroT = 0; return true;
    }
    stepGround(dt, inp) {
      const S = this.stats(), V = this.V;
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw), rx = -fz, rz = fx;
      let vF = this.vx * fx + this.vz * fz, vS = this.vx * rx + this.vz * rz;
      const surf = this.surf = W.surface(this.x, this.z), SF = W.SURF[surf];
      let grip, spd;
      if (this.kind === 'boat') {
        const deep = W.height(this.x, this.z) < -0.25;
        grip = deep ? V.grip : 0.15; spd = deep ? 1 : 0.1;
      } else {
        const bf = this.buff || {}, sk = (surf === 3 || surf === 4) ? Math.min(1, V.snow + (bf.snow ? 0.25 : 0)) : (surf === 0 ? 1 : Math.min(1, V.off + (bf.off ? 0.25 : 0)));
        grip = (SF.grip + (1 - SF.grip) * sk) * S.grip; spd = SF.spd + (1 - SF.spd) * sk;
        if (V.snow >= 1 && surf === 0) spd *= 0.85;
        if (surf === 5) { const d = W.waterDepth(this.x, this.z); spd = d > 0.6 ? 0.25 : 0.6; this.wet = d; } else this.wet = 0;
      }
      const dmgMul = this.dmg >= 100 ? 0.35 : 1 - this.dmg / 100 * 0.25;
      const nit = this.nitro > 0 ? 1 : 0;
      const vmax = S.vmax * spd * dmgMul * (1 + 0.28 * nit) * this.pace;
      const acc = S.acc * (1 + 0.7 * nit) * (this.ai ? Math.min(1.08, this.pace + 0.06) : 1);
      let thr = inp ? inp.thr || 0 : 0, brk = inp ? inp.brk || 0 : 0;
      const park = !inp || !!inp.park; // nobody driving (walking, menus, countdown): parking brake, never reverse
      if (park) { thr = 0; brk = 0; }
      if (nit && !park) thr = 1;
      if (!this.air) {
        if (thr > 0) { if (vF < -0.5) vF += 28 * thr * dt; else vF += acc * thr * Math.max(0, 1 - (vF / vmax) * (vF / vmax)) * dt; }
        if (brk > 0) { if (vF > 0.5) vF -= 32 * brk * dt; else vF = Math.max(vF - 9 * brk * dt, -Math.min(14, vmax * 0.35)); }
        if (thr <= 0 && brk <= 0) vF -= Math.sign(vF) * Math.min(Math.abs(vF), (1.6 + 0.004 * vF * vF + (1 - spd) * 6) * dt);
        if (vF > vmax) vF -= (vF - vmax) * 1.2 * dt;
        // slope
        const e = 2, slope = (W.height(this.x + fx * e, this.z + fz * e) - W.height(this.x - fx * e, this.z - fz * e)) / (2 * e);
        // parked / coasting to a stop: hold still (no creeping, no rolling away by itself)
        const hold = thr <= 0 && brk <= 0 && (park || Math.abs(vF) < 0.8) && Math.abs(slope) < 0.55 && this.kind !== 'boat';
        if (park && !hold) vF -= Math.sign(vF) * Math.min(Math.abs(vF), 30 * dt);
        if (hold) { vF -= Math.sign(vF) * Math.min(Math.abs(vF), (park ? 30 : 6) * dt); if (Math.abs(vF) < 0.8) vF = 0; }
        else if (this.kind !== 'boat') vF -= 9.8 * U.clamp(slope, -0.6, 0.6) * 0.5 * dt;
        // steering
        const sIn = inp ? U.clamp(inp.steer || 0, -1, 1) : 0;
        this.st += (sIn - this.st) * Math.min(1, dt * (this.ai ? 10 : 7));
        const av = Math.abs(vF), sf = U.clamp(av / 5, 0, 1), hs = 1 / (1 + Math.pow(av / 28, 1.5));
        let yr = -this.st * V.turn * 1.45 * sf * hs * (vF >= 0 ? 1 : -1);
        let gripAcc = grip * 40;
        // handbrake = DRIFT: the rear lets go, the car swings round, and grip comes back smoothly when you let go
        // two-wheelers: hold the button + GAS = WHEELIE (front lifts, a little extra pull), button alone = rear-wheel skid stop. No drifting.
        const wantWh = !!(V.wheelie && inp && inp.hand && thr > 0 && av > 2.5);
        this.whT = wantWh ? V.wheelie : 0;
        if (this.two && inp && inp.hand && !wantWh && thr <= 0) vF -= Math.sign(vF) * Math.min(Math.abs(vF), 14 * dt);
        if (wantWh && this.wh > V.wheelie * 0.6) vF += acc * 0.08 * dt;
        const hb = !!(inp && inp.hand) && av > 5 && !this.two;
        this.gripK += ((hb ? 0.2 : 1) - this.gripK) * Math.min(1, dt * (hb ? 9 : 2.6));
        gripAcc *= this.gripK; if (hb) { yr *= 1.55; vF -= Math.sign(vF) * Math.min(Math.abs(vF), 3.5 * dt); } else if (this.gripK < 0.9) yr *= 1.2;
        if (inp && inp.hand && av <= 5 && !(this.two && thr > 0)) vF -= Math.sign(vF) * Math.min(Math.abs(vF), 8 * dt);
        // lateral friction (grip limited -> slides/drifts when asking too much)
        const red = Math.min(Math.abs(vS), gripAcc * dt); vS -= Math.sign(vS) * red;
        if (hold && Math.abs(vS) < 0.8) vS = 0;
        this.skid = Math.abs(vS) > 4 && av > 8 ? Math.abs(vS) : 0;
        this.drifting = this.kind === 'ground' && Math.abs(vS) > 2.6 && av > 9; this.slip = vS;
        this.vx = fx * vF + rx * vS; this.vz = fz * vF + rz * vS;
        this.yaw += yr * dt;
      }
      this.vF = vF;
      // move
      let nx = this.x + this.vx * dt, nz = this.z + this.vz * dt;
      if (this.kind === 'boat' && W.height(nx, nz) > -0.3) {
        // shoreline: bounce back toward deeper water
        const gx = W.height(nx + 1, nz) - W.height(nx - 1, nz), gz = W.height(nx, nz + 1) - W.height(nx, nz - 1), gl = Math.hypot(gx, gz) || 1;
        const n = { x: -gx / gl, z: -gz / gl }, vn = this.vx * n.x + this.vz * n.z;
        if (vn < 0) { this.vx -= 1.4 * vn * n.x; this.vz -= 1.4 * vn * n.z; if (-vn > 6) this.hit(-vn * 0.5, nx, nz); }
        nx = this.x + this.vx * dt; nz = this.z + this.vz * dt; if (W.height(nx, nz) > -0.3) { nx = this.x; nz = this.z; }
      }
      this.x = nx; this.z = nz;
      // vertical
      const side = this.kind === 'boat' ? 0 : W.sideH(this.x, this.z);
      const gh = this.groundH(this.x, this.z) + (this.kind === 'boat' ? Math.sin(performance.now() / 400 + this.x) * 0.08 : 0), ghb = gh - side;
      if (this.side != null && Math.abs(side - this.side) > 0.05 && !this.air) this.sp.vy += (side - this.side) * 9; // kerb bump
      this.side = side;
      if (this.air) {
        this.vy -= G_ * dt; this.y += this.vy * dt;
        if (this.y <= gh) { this.sp.vy -= Math.min(5, -this.vy * 0.22); this.ev.push({ t: 'land', s: -this.vy, air: this.airT || 0 }); if (this.vy < (V.bigSus ? -24 : -14)) this.hit((-this.vy - (V.bigSus ? 22 : 12)) * 0.8, this.x, this.z, true); if (V.bigSus) this.susK = Math.min(1, -this.vy / 16); this.y = gh; this.vy = 0; this.air = false; this.yb = ghb; }
        this.airT = (this.airT || 0) + dt;
      } else {
        const yb = this.yb == null ? ghb : this.yb, vy = (ghb - yb) / dt;
        if (vy < this.vy - G_ * dt * 1.5 && this.vy > 2 && Math.abs(vF) > (V.two || V.kart ? 7 : 14)) { this.air = true; this.airT = 0; this.vy = Math.min(this.vy, 16); this.y += this.vy * dt; this.ev.push({ t: 'launch' }); }
        else { this.vy = U.clamp(vy, -30, 16); this.y = gh; }
        this.yb = ghb;
      }
    }
    stepHeli(dt, inp) {
      const V = this.V, S = this.stats(), gh = W.gy(this.x, this.z), ground = Math.max(gh, W.ellQ(W.LAKE, this.x, this.z) < 1.1 ? 0 : -99);
      const up = inp ? (inp.up || 0) - (inp.down || 0) : 0, jy = inp ? (inp.fwd != null ? inp.fwd : (inp.thr || 0) - (inp.brk || 0)) : 0, sIn = inp ? inp.steer || 0 : 0;
      const landed = this.y <= ground + 0.05;
      this.lift += ((up !== 0 ? 1 : this.y > ground + 0.5 ? 1 : 0) - this.lift) * Math.min(1, dt * 2);
      const vyT = up * 12; this.vy += (vyT - this.vy) * Math.min(1, dt * 2.5);
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw), rx = -fz, rz = fx;
      let vF = this.vx * fx + this.vz * fz, vS = this.vx * rx + this.vz * rz;
      const dmgMul = this.dmg >= 100 ? 0.5 : 1;
      if (!landed || up > 0) {
        const tF = jy * S.vmax * dmgMul * (this.nitro > 0 ? 1.3 : 1); vF += (tF - vF) * Math.min(1, dt * (S.acc / 14));
        this.yaw += -sIn * V.turn * dt;
      } else { vF *= Math.max(0, 1 - dt * 3); if (Math.abs(jy) > 0.1 && up >= 0) this.vy = Math.max(this.vy, 0); }
      vS *= Math.max(0, 1 - dt * 2.5);
      const nfx = Math.sin(this.yaw), nfz = Math.cos(this.yaw);
      this.vx = nfx * vF - nfz * vS; this.vz = nfz * vF + nfx * vS; this.vF = vF;
      this.x += this.vx * dt; this.z += this.vz * dt; this.y += this.vy * dt;
      if (this.y > 650) { this.y = 650; this.vy = Math.min(0, this.vy); }
      const g2 = Math.max(W.gy(this.x, this.z), W.ellQ(W.LAKE, this.x, this.z) < 1.1 ? 0 : -99);
      if (this.y < g2) { if (this.vy < -9) this.hit((-this.vy - 8) * 0.9, this.x, this.z, true); if (Math.hypot(vF, 0) > 12 && this.y < g2 - 0.5) this.hit(Math.abs(vF) * 0.3, this.x, this.z, true); this.y = g2; this.vy = Math.max(0, this.vy); }
      this.air = this.y > g2 + 0.3; this.tiltF = U.lerp(this.tiltF || 0, -vF / S.vmax * 0.22, dt * 3); this.tiltS = U.lerp(this.tiltS || 0, sIn * 0.18, dt * 3);
    }
    stepPlane(dt, inp) {
      const V = this.V, S = this.stats();
      const gh = Math.max(W.gy(this.x, this.z), W.ellQ(W.LAKE, this.x, this.z) < 1.05 ? 0 : -99);
      const sIn = inp ? inp.steer || 0 : 0, pIn = inp ? U.clamp((inp.up || 0) - (inp.down || 0) + (inp.fwd || 0), -1, 1) : 0;
      // throttle lever
      if (inp && inp.park && this.y <= gh + 0.1) { this.thr = 0; this.vF = Math.max(0, this.vF - 20 * dt); }
      if (inp && inp.thr > 0) this.thr = Math.min(1, this.thr + dt * 0.8); if (inp && inp.brk > 0) this.thr = Math.max(0, this.thr - dt * 0.9);
      const dmgMul = this.dmg >= 100 ? 0.6 : 1, nit = this.nitro > 0 ? 1.3 : 1;
      const tv = this.thr * S.vmax * dmgMul * nit;
      let v = this.vF; v += (tv - v) * Math.min(1, dt * (S.acc / 30));
      const onGround = this.y <= gh + 0.1;
      if (onGround) {
        if (inp && inp.brk > 0 && this.thr <= 0.01) v = Math.max(0, v - 14 * dt);
        if (W.surface(this.x, this.z) !== 0) v -= v * 0.15 * dt;
        this.yaw += -sIn * U.clamp(Math.abs(v) / 6, 0, 1) * 1.2 / (1 + v / 20) * dt;
        this.vy = 0; this.pitchA = U.lerp(this.pitchA || 0, 0, dt * 4);
        if (v > 24 && pIn > 0.1) { this.vy = 4; this.y = gh + 0.2; }
        this.y = Math.max(this.y, gh);
      } else {
        this.yaw += -sIn * V.turn * dt;
        let target = pIn * 0.45; this.pitchA = U.lerp(this.pitchA || 0, target, dt * 2.5);
        const vyT = Math.sin(this.pitchA) * v + (v < 18 ? -(18 - v) * 0.8 : 0);
        this.vy += (vyT - this.vy) * Math.min(1, dt * 3);
      }
      this.vF = v; const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
      this.vx = fx * v; this.vz = fz * v;
      this.x += this.vx * dt; this.z += this.vz * dt; this.y += this.vy * dt;
      if (this.y > 650) { this.y = 650; this.vy = Math.min(0, this.vy); }
      const g2 = Math.max(W.gy(this.x, this.z), W.ellQ(W.LAKE, this.x, this.z) < 1.05 ? 0 : -99);
      if (this.y < g2) {
        const rough = this.vy < -9 || (W.surface(this.x, this.z) === 5) || (this.vy < -5 && v > 40);
        if (rough && this.air) { this.hit(10 + Math.max(0, -this.vy) * 0.8, this.x, this.z, true); this.vF *= 0.4; this.vy = 6; this.y = g2 + 0.5; }
        else { this.y = g2; this.vy = 0; }
      }
      this.air = this.y > g2 + 0.3; this.bank = U.lerp(this.bank || 0, this.air ? sIn * 0.6 : 0, dt * 3);
    }
    stepBalloon(dt, inp) {
      const V = this.V, gh = Math.max(W.gy(this.x, this.z), W.ellQ(W.LAKE, this.x, this.z) < 1.1 ? 0 : -99);
      const up = inp ? (inp.up || 0) : 0, down = inp ? (inp.down || 0) : 0, jy = inp ? (inp.fwd != null ? inp.fwd : (inp.thr || 0) - (inp.brk || 0)) : 0, sIn = inp ? inp.steer || 0 : 0;
      this.burn = up > 0;
      const vyT = up ? 5 : down ? -5 : (this.y > gh + 1 ? -0.5 : 0); this.vy += (vyT - this.vy) * Math.min(1, dt * 0.9);
      const landed = this.y <= gh + 0.05;
      this.yaw += -sIn * V.turn * dt;
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
      let v = this.vF; const tv = landed ? 0 : jy * V.vmax * (this.nitro > 0 ? 1.4 : 1); v += (tv - v) * Math.min(1, dt * 0.8); this.vF = v;
      const wind = landed ? 0 : 1.2; this.vx = fx * v + wind * 0.6; this.vz = fz * v + wind * 0.3;
      this.x += this.vx * dt; this.z += this.vz * dt; this.y += this.vy * dt;
      if (this.y > 500) { this.y = 500; this.vy = Math.min(0, this.vy); }
      const g2 = Math.max(W.gy(this.x, this.z), W.ellQ(W.LAKE, this.x, this.z) < 1.1 ? 0 : -99);
      if (this.y < g2) { if (this.vy < -6) this.hit(4, this.x, this.z, true); this.y = g2; this.vy = Math.max(0, this.vy); }
      this.air = this.y > g2 + 0.3;
    }
    circles() {
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
      for (const c of this.circ) { c.x = this.x + fx * c.o; c.z = this.z + fz * c.o; }
      return this.circ;
    }
    collideWorld() {
      // world border
      const B = 1440; if (Math.abs(this.x) > B || Math.abs(this.z) > B) { const nx = -Math.sign(this.x) * (Math.abs(this.x) > B ? 1 : 0), nz = -Math.sign(this.z) * (Math.abs(this.z) > B ? 1 : 0); this.x = U.clamp(this.x, -B, B); this.z = U.clamp(this.z, -B, B); this.bounce(nx, nz, 0.3); }
      const cs = this.circles(); const list = W.near(this.x, this.z, this.L / 2 + 6, nearList);
      const yTop = this.y + 0.5;
      for (const c of list) {
        if (c.top < this.y + 0.3 || c.dead) continue;
        const crushIt = this.V.crush && c.prop && this.speed() > 2.5;
        for (const k of cs) {
          let nx, nz, pen;
          if (c.t === 'c') { const dx = k.x - c.x, dz = k.z - c.z, d = Math.hypot(dx, dz); if (d >= c.r + k.r || d < 1e-6) continue; nx = dx / d; nz = dz / d; pen = c.r + k.r - d; }
          else {
            const px = U.clamp(k.x, c.x0, c.x1), pz = U.clamp(k.z, c.z0, c.z1); let dx = k.x - px, dz = k.z - pz, d = Math.hypot(dx, dz);
            if (d >= k.r) continue;
            if (d < 1e-6) { const a = k.x - c.x0, b = c.x1 - k.x, e = k.z - c.z0, f = c.z1 - k.z, m = Math.min(a, b, e, f); nx = m === a ? -1 : m === b ? 1 : 0; nz = m === e ? -1 : m === f ? 1 : 0; pen = m + k.r; }
            else { nx = dx / d; nz = dz / d; pen = k.r - d; }
          }
          if (crushIt) { Veh.crush(c); this.ev.push({ t: 'crush', x: c.x != null ? c.x : (c.x0 + c.x1) / 2, z: c.z != null ? c.z : (c.z0 + c.z1) / 2, tag: c.tag }); break; } // monster truck: squash it, no bump
          this.x += nx * pen; this.z += nz * pen; k.x += nx * pen; k.z += nz * pen;
          this.bounce(nx, nz, 0.25, c.tag);
        }
      }
      void yTop;
    }
    bounce(nx, nz, e, tag) {
      const vn = this.vx * nx + this.vz * nz;
      if (vn < 0) {
        this.vx -= (1 + e) * vn * nx; this.vz -= (1 + e) * vn * nz;
        const t = 0.85; const tx = -nz, tz = nx, vt = this.vx * tx + this.vz * tz; this.vx -= (1 - t) * vt * tx; this.vz -= (1 - t) * vt * tz;
        const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw); this.vF = this.vx * fx + this.vz * fz;
        if (this.kind === 'plane') this.vF *= 0.5;
        if (-vn > 4.5) this.hit(-vn, this.x - nx * 1.5, this.z - nz * 1.5, false, tag);
      }
    }
    hit(impact, px, pz, ground, tag) {
      const now = performance.now(); if (now - this.lastHit < 250 && impact < 20) return; this.lastHit = now;
      const S = this.stats(), d = Math.max(0, impact - 4) * 1.5 / this.V.tough * (1 - 0.2 * S.armor);
      this.dmg = Math.min(100, this.dmg + d); this.hits++;
      this.ev.push({ t: 'crash', s: impact, x: px, y: this.y + 1, z: pz, d });
    }
    syncModel(dt, inp) {
      const m = this.model; m.position.set(this.x, this.y, this.z);
      if (this.kind === 'ground' || this.kind === 'boat') {
        if (!this.air) { W.normal(this.x, this.z, tmpN); const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw); const tp = Math.asin(U.clamp(-(tmpN.x * fx + tmpN.z * fz), -1, 1)), tr = Math.asin(U.clamp(-(tmpN.x * -fz + tmpN.z * fx), -1, 1)); if (this.kind === 'boat') { this.pitch = U.lerp(this.pitch, -Math.min(0.12, Math.abs(this.vF) * 0.004), Math.min(1, dt * 4)); this.roll = U.lerp(this.roll, this.st * 0.12, Math.min(1, dt * 4)); } else { this.pitch = U.lerp(this.pitch, tp, Math.min(1, dt * 10)); this.roll = U.lerp(this.roll, tr + this.st * Math.min(1, Math.abs(this.vF) / 40) * 0.05, Math.min(1, dt * 10)); } }
        else { this.pitch = U.lerp(this.pitch, -0.08, Math.min(1, dt * 2)); }
        let lift = 0;
        if (this.two || this.V.ski) { // lean INTO turns (centripetal), wheelie pivots on the rear wheel; stopped bikes rest on the rider's foot
          const yr = dt > 0 ? U.ang(this.yaw - (this._ly == null ? this.yaw : this._ly)) / dt : 0; this._ly = this.yaw;
          const stopped = !this.air && Math.abs(this.vF) < 0.6 && this.two;
          const tl = this.air ? this.lean * 0.9 : stopped ? -0.09 : U.clamp(-this.vF * yr * 0.055, -0.55, 0.55) * (this.V.ski ? 0.7 : 1);
          this.lean = U.lerp(this.lean, tl, Math.min(1, dt * 7)); this.stopped = stopped;
          this.wh = U.lerp(this.wh, this.air ? this.wh * 0.98 : (this.whT || 0), Math.min(1, dt * (this.whT ? 3 : 5)));
          if (this.wh < 0.004) this.wh = 0;
          const rz = (this.model.userData.wheels[1] || { position: { z: this.L * 0.4 } }).position.z;
          lift = Math.max(0, -rz) * Math.sin(this.wh);
          let pOff = 0;
          if (this.V.ski) { const t = GR.G ? GR.G.t : performance.now() / 1000, sp = Math.min(1, Math.abs(this.vF) / 20); lift += Math.sin(t * 2.3 + this.x * 0.2) * (0.06 + 0.12 * sp) + Math.max(0, Math.sin(t * 4.1 + this.z * 0.3)) * 0.12 * sp; pOff = Math.sin(t * 3.1) * 0.035 * (0.4 + sp); } // bob the nose on the waves (display only, never accumulates)
          this.roll = this.lean; this._pOff = pOff;
        }
        m.rotation.set(0, 0, 0); m.rotation.order = 'YXZ'; m.rotation.y = this.yaw; m.rotation.x = -U.clamp(this.pitch + (this._pOff || 0), -0.6, 0.6) - this.wh; m.rotation.z = U.clamp(this.roll, -0.6, 0.6);
        m.position.y = this.y + lift;
        if (m.userData.rider) M.animRider(m, this.vF, dt, inp ? (inp.park ? 0 : (inp.thr || 0)) : 0, !!this.stopped, this.wh);
        if (this.V.bigSus) this.bigSus(dt);
        M.spinWheels(m, this.vF, dt, this.st);
        this.suspend(dt, inp);
      } else if (this.kind === 'heli') {
        m.rotation.order = 'YXZ'; m.rotation.y = this.yaw; m.rotation.x = -(this.tiltF || 0); m.rotation.z = this.tiltS || 0;
        if (m.userData.rotor) { this.rotorSpin = (this.rotorSpin || 0) + dt * (6 + 30 * (this.lift || 0)); m.userData.rotor.rotation.y = this.rotorSpin; m.userData.trotor.rotation.x = this.rotorSpin * 1.5; }
      } else if (this.kind === 'plane') {
        m.rotation.order = 'YXZ'; m.rotation.y = this.yaw; m.rotation.x = -(this.pitchA || 0); m.rotation.z = this.bank || 0;
        if (m.userData.prop) m.userData.prop.rotation.z += dt * (4 + this.thr * 50);
        M.spinWheels(m, this.air ? 0 : this.vF, dt, 0);
      } else {
        m.rotation.set(0, this.yaw, Math.sin(performance.now() / 900) * 0.02);
        if (m.userData.flame) { m.userData.flame.visible = !!this.burn; m.userData.flame.scale.y = 0.8 + Math.random() * 0.5; }
      }
    }
    // monster truck: every wheel follows the ground under it (big articulation), wheels droop in the air and the body squashes on landing
    bigSus(dt) {
      const ws = this.model.userData.wheels, r = this.model.userData.wheelR, fx = Math.sin(this.yaw), fz = Math.cos(this.yaw), base = W.gy(this.x, this.z);
      this.susK = Math.max(0, (this.susK || 0) - dt * 2.2);
      for (const w of ws) {
        const lx = w.position.x, lz = w.userData.z0 != null ? w.userData.z0 : (w.userData.z0 = w.position.z);
        const wx = this.x + fz * lx + fx * lz, wz = this.z - fx * lx + fz * lz, gh = W.gy(wx, wz);
        const plane = Math.sin(this.pitch) * lz - Math.sin(this.roll) * lx;
        const target = this.air ? -0.45 : U.clamp(gh - base - plane, -0.55, 0.55) + this.susK * 0.3;
        w.userData.sy = U.lerp(w.userData.sy || 0, target, Math.min(1, dt * (this.air ? 4 : 14))); w.position.y = r + w.userData.sy;
      }
    }
    // springy chassis: leans out in turns, dips when braking, squats on launch, squashes on landings and kerbs
    suspend(dt, inp) {
      const ch = this.model.userData.chassis; if (!ch || !(dt > 0)) return;
      const sp = this.sp, aL = U.clamp(((this.vF - (this._pv == null ? this.vF : this._pv)) / dt), -40, 40), yr = U.ang(this.yaw - (this._py == null ? this.yaw : this._py)) / dt;
      this._pv = this.vF; this._py = this.yaw;
      const big = this.L > 7 ? 0.6 : 1, tp = this.air ? 0.04 : U.clamp(aL * 0.0045, -0.07, 0.07) * big, tr = this.air || this.two ? 0 : U.clamp(this.vF * yr * 0.0042 + (this.slip || 0) * 0.004, -0.085, 0.085) * big;
      const k = 70, c = 11, h = Math.min(dt, 1 / 30);
      sp.vp += ((tp - sp.p) * k - sp.vp * c) * h; sp.p += sp.vp * h; sp.vr += ((tr - sp.r) * k - sp.vr * c) * h; sp.r += sp.vr * h;
      sp.vy += ((0 - sp.y) * 90 - sp.vy * 9) * h; sp.y = U.clamp(sp.y + sp.vy * h, -0.28, 0.25);
      ch.rotation.x = sp.p; ch.rotation.z = sp.r; ch.position.y = sp.y;
      const tm = this.model.userData.tailMat; if (tm) { const brk = (inp && inp.brk > 0 && this.vF > 0.5) || (this.traffic && aL < -2.5); tm.color.setScalar(brk ? 1 : (M.nightOn ? 0.85 : 0.6)); }
    }
    setRemote(s) { // apply network snapshot target
      this.tx = s.x; this.ty = s.y; this.tz = s.z; this.tyaw = s.yaw; this.vF = s.v; this.tp = s.p || 0; this.tr = s.r || 0; this.burn = !!s.b; this.lift = 1; this.dmg = s.d || 0; this.thr = s.th || 0; this.wh = s.wh || 0; this.lean = s.ln || 0; this.tst = s.s || 0; this.tly = s.ly || 0;
      if (this.x === 0 && this.z === 0) { this.x = s.x; this.y = s.y; this.z = s.z; this.yaw = s.yaw; }
    }
    lerpRemote(dt) {
      if (this.tx == null) return; const k = Math.min(1, dt * 10);
      if (Math.hypot(this.tx - this.x, this.tz - this.z) > 40) { this.x = this.tx; this.z = this.tz; this.y = this.ty; }
      // dead-reckon a bit along heading
      this.x += (this.tx - this.x) * k; this.y += (this.ty - this.y) * k; this.z += (this.tz - this.z) * k; this.yaw += U.ang(this.tyaw - this.yaw) * k;
      this.vx = Math.sin(this.yaw) * this.vF; this.vz = Math.cos(this.yaw) * this.vF;
      const m = this.model; this.ly = U.lerp(this.ly || 0, this.tly || 0, k); m.position.set(this.x, this.y + this.ly, this.z); m.rotation.order = 'YXZ'; m.rotation.y = this.yaw; m.rotation.x = -this.tp; m.rotation.z = this.tr;
      this.st = U.lerp(this.st || 0, this.tst || 0, k); if (m.userData.rider) M.animRider(m, this.vF, dt, this.thr > 0.05 ? 1 : 0, this.two && Math.abs(this.vF) < 0.6, this.wh);
      if (m.userData.rotor) { this.rotorSpin = (this.rotorSpin || 0) + dt * 30; m.userData.rotor.rotation.y = this.rotorSpin; }
      if (m.userData.prop) m.userData.prop.rotation.z += dt * 40;
      if (m.userData.flame) m.userData.flame.visible = this.burn;
      M.spinWheels(m, this.vF, dt, this.st || 0);
    }
    snap() { return { x: +this.x.toFixed(2), y: +this.y.toFixed(2), z: +this.z.toFixed(2), yaw: +this.yaw.toFixed(3), v: +this.vF.toFixed(1), p: +(-this.model.rotation.x).toFixed(3), r: +this.model.rotation.z.toFixed(3), b: this.burn ? 1 : 0, d: Math.round(this.dmg), th: +(this.thr || 0).toFixed(2), wh: +(this.wh || 0).toFixed(3), ln: +(this.lean || 0).toFixed(3), s: +(this.st || 0).toFixed(2), ly: +(this.model.position.y - this.y).toFixed(2) }; }
    dispose(scene) { scene.remove(this.model); this.model.traverse((o) => { if (o.geometry && o === this.model.userData.body) o.geometry.dispose(); }); }
  }
  // monster truck squashes a street prop: the collider goes away and the prop is flattened in place
  Veh.crush = function (c) {
    c.dead = true; const e = c.prop; if (!e || !e.im) return; const im = e.im, i = e.ii, m4 = new T.Matrix4(), p = new T.Vector3(), q = new T.Quaternion(), sc = new T.Vector3();
    im.getMatrixAt(i, m4); m4.decompose(p, q, sc); if (sc.x === 0) return; sc.set(1.35, 0.14, 1.35); m4.compose(p, q, sc); im.setMatrixAt(i, m4); im.instanceMatrix.needsUpdate = true;
    if (im.userData.orig) m4.toArray(im.userData.orig, i * 16);
    GR.crushed = (GR.crushed || 0) + 1;
  };
  GR.Veh = Veh;

  // vehicle vs vehicle (circle sets)
  GR.collidePair = function (a, b) {
    if (Math.abs(a.y - b.y) > 3) return 0;
    const dx0 = a.x - b.x, dz0 = a.z - b.z; if (dx0 * dx0 + dz0 * dz0 > 400) return 0;
    const ca = a.circles(), cb = b.circles(); let hit = 0;
    for (const p of ca) for (const q of cb) {
      const dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz), R = p.r + q.r;
      if (d >= R || d < 1e-6) continue;
      const nx = dx / d, nz = dz / d, pen = R - d, ma = a.fixed ? 1e9 : a.mass, mb = b.fixed ? 1e9 : b.mass, wa = mb / (ma + mb), wb = ma / (ma + mb);
      if (!a.fixed) { a.x += nx * pen * wa; a.z += nz * pen * wa; }
      if (!b.fixed) { b.x -= nx * pen * wb; b.z -= nz * pen * wb; }
      const rv = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
      if (rv < 0) {
        const j = -(1.3) * rv; if (!a.fixed) { a.vx += j * wa * nx; a.vz += j * wa * nz; } if (!b.fixed) { b.vx -= j * wb * nx; b.vz -= j * wb * nz; }
        hit = Math.max(hit, -rv);
        const fa = Math.sin(a.yaw), fza = Math.cos(a.yaw); a.vF = a.vx * fa + a.vz * fza; const fb = Math.sin(b.yaw), fzb = Math.cos(b.yaw); b.vF = b.vx * fb + b.vz * fzb;
      }
      for (const c of [p, q]) { c.x = c.x; }
    }
    return hit;
  };
})();
