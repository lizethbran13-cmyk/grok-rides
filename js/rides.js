/* Grok Rides - two-wheelers, scooters, go-kart, jet ski: smooth 3D models (tube frames, sculpted fairings), spoked/cast wheels,
   a real rounded rider who pedals / kicks / tucks / puts a foot down, plus the per-frame rider animation */
(function () {
  'use strict';
  const GR = window.GR, U = GR.U, M = GR.M, T = THREE, PI = Math.PI;
  const H = M.H, B = M.builders, Kit = M.Kit, { box, cyl, sph, ext, plan, rbox, GLASS, DARK, CHROME, HEAD, TAIL } = H;
  const V3 = (p) => new T.Vector3(p[0], p[1], p[2]);
  // smooth bent tube along points (frames, forks, bars, pipes) + round welds at the ends
  function tube(k, pts, r, col, seg) {
    const c = pts.length > 2 ? new T.CatmullRomCurve3(pts.map(V3), false, 'centripetal') : new T.LineCurve3(V3(pts[0]), V3(pts[1]));
    k.add(new T.TubeGeometry(c, M.useLow ? Math.max(3, Math.ceil((seg || (pts.length > 2 ? 16 : 4)) / 2)) : seg || (pts.length > 2 ? 16 : 4), r, M.useLow ? 6 : 10, false), col);
    const sw = M.useLow ? 6 : 10, sh = M.useLow ? 4 : 8; k.add(sph(r * 1.12, sw, sh), col, pts[0][0], pts[0][1], pts[0][2]); const e = pts[pts.length - 1]; k.add(sph(r * 1.12, sw, sh), col, e[0], e[1], e[2]);
  }
  // wheel fender: a real curved arc that hugs the tyre (a0 = start angle from the rear, arc = sweep)
  function fender(k, y, z, R, w, col, a0, arc) { const t = 0.035; k.add(new T.TorusGeometry(R, t, 6, 24, arc).rotateZ(a0).rotateY(PI / 2).scale(w / (2 * t), 1, 1), col, 0, y, z); }
  const mirrorTube = (k, pts, r, col, seg) => { tube(k, pts, r, col, seg); tube(k, pts.map((p) => [-p[0], p[1], p[2]]), r, col, seg); };
  // ---------- wheels ----------
  const WC = {};
  function spoked(r, tr, n, rim, tire, wide) { // bicycle / cruiser: round tyre (torus), rim, real wire spokes, hub
    const key = 'sp' + r + tr + n + rim + (M.useLow ? 'L' : ''); if (WC[key]) return WC[key];
    const q = [], P = (g, c) => q.push(U.paint(g, c)); const ns = M.useLow ? Math.min(n, 10) : n;
    const LW = M.useLow; P(new T.TorusGeometry(r - tr, tr, LW ? 6 : 10, LW ? 20 : 32).rotateY(PI / 2), tire);
    P(new T.TorusGeometry(r - tr * 1.9, tr * 0.32, LW ? 4 : 6, LW ? 20 : 32).rotateY(PI / 2), rim);
    if (wide) P(new T.CylinderGeometry(r - tr * 1.6, r - tr * 1.6, wide, 28, 1, true).rotateZ(PI / 2), rim);
    P(cyl(0.035, 0.035, 0.12, 10).rotateZ(PI / 2), rim);
    for (let i = 0; i < ns; i++) { const a = i / ns * PI * 2, side = i % 2 ? 0.03 : -0.03, L = r - tr * 1.9; const g = cyl(0.008, 0.008, L, 4); g.translate(0, L / 2, 0); g.rotateZ(side * 0.6); g.rotateX(a); g.translate(side, 0, 0); P(g, '#d6dbe3'); }
    return (WC[key] = U.merge(q));
  }
  function cast(r, tr, n, rim, w) { // motorcycle / moped / kart: fat rounded tyre + cast spokes + brake disc
    const key = 'ca' + r + tr + n + rim + w + (M.useLow ? 'L' : ''); if (WC[key]) return WC[key];
    const q = [], P = (g, c) => q.push(U.paint(g, c));
    P(new T.CylinderGeometry(r - tr * 0.5, r - tr * 0.5, w, 28, 1, true).rotateZ(PI / 2), '#26282d');
    P(new T.TorusGeometry(r - tr * 0.55, tr * 0.55, 10, 28).rotateY(PI / 2).translate(w / 2 - tr * 0.3, 0, 0), '#26282d'); P(new T.TorusGeometry(r - tr * 0.55, tr * 0.55, 10, 28).rotateY(PI / 2).translate(-w / 2 + tr * 0.3, 0, 0), '#26282d');
    P(new T.CylinderGeometry(r - tr * 1.05, r - tr * 1.05, w * 0.7, 24).rotateZ(PI / 2), '#3a3d45');
    P(new T.TorusGeometry(r - tr * 1.1, 0.012, 4, 24).rotateY(PI / 2).translate(w * 0.36, 0, 0), rim); P(new T.TorusGeometry(r - tr * 1.1, 0.012, 4, 24).rotateY(PI / 2).translate(-w * 0.36, 0, 0), rim);
    for (let i = 0; i < n; i++) P(U.xf(rbox(w * 0.5, 0.035, r - tr * 1.1, 0.012), 0, 0, 0, i * PI * 2 / n, 0, 0).translate(0, 0, 0), rim);
    P(cyl(r * 0.24, r * 0.24, w * 0.8, 16).rotateZ(PI / 2), rim);
    if (w < 0.3) P(cyl(r * 0.55, r * 0.55, 0.012, 24).rotateZ(PI / 2).translate(w * 0.42, 0, 0), '#b8bec8');
    return (WC[key] = U.merge(q));
  }
  // ---------- builders (forward = +Z, up = +Y, +X = rider's left) ----------
  function saddle(k, y, z, col, w, l) { k.add(sph(1, 16, 10), col || DARK, 0, y, z, 0, 0, 0, w || 0.085, 0.04, l || 0.15); k.add(sph(1, 14, 8), col || DARK, 0, y - 0.005, z + (l || 0.15) * 0.8, 0, 0, 0, 0.03, 0.03, 0.08); }
  function grips(k, x, y, z, len) { k.add(cyl(0.024, 0.024, len || 0.1, 10).rotateZ(PI / 2), DARK, x, y, z); k.add(cyl(0.024, 0.024, len || 0.1, 10).rotateZ(PI / 2), DARK, -x, y, z); }
  function bicycle(o) {
    const k = new Kit(), s = new Kit(), r = o.r, F = [0, r, o.wz], R = [0, r, -o.wz], BB = o.bb, S = o.st, Ht = o.ht, Hb = o.hb, fr = o.tube;
    tube(k, [S, [0, (S[1] + Ht[1]) / 2 + 0.01, (S[2] + Ht[2]) / 2], Ht], fr, 'paint'); tube(k, [BB, Hb], fr * 1.15, 'paint'); tube(k, [BB, S], fr, 'paint'); tube(k, [Hb, Ht], fr * 1.3, 'paint');
    mirrorTube(k, [[0.02, BB[1], BB[2]], [0.06, (BB[1] + r) / 2, (BB[2] + R[2]) / 2], [0.06, r, R[2]]], fr * 0.7, 'paint'); mirrorTube(k, [[0.02, S[1] - 0.04, S[2]], [0.06, r, R[2]]], fr * 0.65, 'paint');
    tube(k, [S, [0, S[1] + 0.07, S[2] - 0.03]], 0.014, CHROME); saddle(k, S[1] + 0.09, S[2] - 0.04, o.saddle);
    k.add(new T.TorusGeometry(0.09, 0.012, 6, 22).rotateY(PI / 2), CHROME, -0.06, BB[1], BB[2]); k.add(cyl(0.03, 0.03, 0.14, 10).rotateZ(PI / 2), DARK, 0, BB[1], BB[2]);
    tube(k, [[-0.06, BB[1] + 0.09, BB[2]], [-0.06, r + 0.035, R[2]]], 0.006, '#4b5563'); tube(k, [[-0.06, BB[1] - 0.09, BB[2]], [-0.06, r - 0.035, R[2]]], 0.006, '#4b5563'); // chain
    if (o.pegs) { k.add(cyl(0.03, 0.03, 0.34, 10).rotateZ(PI / 2), CHROME, 0, r, R[2]); }
    if (o.bottle) { k.add(cyl(0.035, 0.035, 0.18, 12), 'accent', 0, (BB[1] + Hb[1]) / 2 + 0.06, (BB[2] + Hb[2]) / 2, -1.0); }
    // steering: fork + stem + bars + front wheel turn together around the head tube
    mirrorTube(s, [[0.02, Hb[1], Hb[2]], [0.055, (Hb[1] + r) / 2 + 0.05, (Hb[2] + F[2]) / 2], [0.055, r, F[2]]], fr * 0.75, o.fork || CHROME);
    const sT = [Ht[0], Ht[1] + 0.12, Ht[2] - 0.03]; tube(s, [Ht, sT], 0.018, CHROME);
    if (o.drop) { [1, -1].forEach((sx) => tube(s, [[0, sT[1], sT[2] + 0.05], [sx * 0.2, sT[1], sT[2] + 0.06], [sx * 0.21, sT[1] - 0.02, sT[2] + 0.15], [sx * 0.21, sT[1] - 0.11, sT[2] + 0.14], [sx * 0.21, sT[1] - 0.13, sT[2] + 0.07]], 0.014, DARK, 14)); o.bar = [sT[1], sT[2] + 0.08, 0.2]; }
    else { tube(s, [[-0.32, sT[1] + 0.08, sT[2] - 0.06], [-0.2, sT[1] + 0.02, sT[2]], [0, sT[1], sT[2] + 0.02], [0.2, sT[1] + 0.02, sT[2]], [0.32, sT[1] + 0.08, sT[2] - 0.06]], 0.015, o.barCol || CHROME, 18); grips(s, 0.33, sT[1] + 0.085, sT[2] - 0.065, 0.12); if (o.cross) tube(s, [[-0.15, sT[1] + 0.12, sT[2] - 0.01], [0.15, sT[1] + 0.12, sT[2] - 0.01]], 0.011, o.barCol || CHROME); o.bar = [sT[1] + 0.08, sT[2] - 0.06, 0.32]; }
    if (o.plate) s.add(rbox(0.22, 0.17, 0.02, 0.05), 'accent', 0, sT[1] - 0.04, sT[2] + 0.08, -0.25);
    s.add(sph(0.025, 10, 8), HEAD, 0, Ht[1] - 0.04, Ht[2] + 0.05);
    const wg = spoked(r, o.tr, o.spokes, o.rim || '#cfd5de', '#2a2c31');
    return { K: k, L: o.L, W: 0.62, wr: r, wp: [[0, o.wz], [0, -o.wz]], wheelGeo: [wg, wg], wW: o.tr * 2, steer: { K: s, z: (Ht[2] + Hb[2]) / 2, wz: o.wz }, raw: true, accent: o.accent || '#ffffff',
      rider: { seat: [S[1] + 0.12, S[2] - 0.06], hands: o.bar, pedal: [BB[1], BB[2], 0.17], lean: o.lean, sc: 0.68, helmet: true } };
  }
  B.bmx = () => bicycle({ r: 0.27, tr: 0.055, wz: 0.5, bb: [0, 0.3, -0.04], st: [0, 0.66, -0.2], ht: [0, 0.7, 0.34], hb: [0, 0.54, 0.39], tube: 0.026, L: 1.7, spokes: 28, pegs: 1, cross: 1, plate: 1, lean: 0.34, accent: '#ffd23f', rim: '#e6e9ef' });
  B.roadbike = () => bicycle({ r: 0.35, tr: 0.022, wz: 0.52, bb: [0, 0.33, -0.02], st: [0, 0.86, -0.2], ht: [0, 0.86, 0.37], hb: [0, 0.71, 0.41], tube: 0.022, L: 1.85, spokes: 20, drop: 1, bottle: 1, lean: 0.62, accent: '#3ff0ff', rim: '#2f3238', saddle: '#111' });
  B.kick = () => {
    const k = new Kit(), s = new Kit(), r = 0.1;
    k.add(rbox(0.15, 0.05, 0.64, 0.024), 'paint', 0, 0.15, -0.02); k.add(rbox(0.13, 0.012, 0.54, 0.006), '#2b2d33', 0, 0.178, -0.03);
    k.add(sph(1, 14, 8, 0, PI * 2, 0, PI / 2), DARK, 0, 0.17, -0.37, 0, 0, 0, 0.06, 0.06, 0.13); // rear foot-brake fender
    tube(k, [[0, 0.15, 0.27], [0, 0.17, 0.33], [0, 0.22, 0.36]], 0.03, 'paint');
    k.add(rbox(0.12, 0.03, 0.06, 0.012), TAIL, 0, 0.16, -0.36);
    tube(s, [[0, 0.22, 0.37], [0, 0.95, 0.33]], 0.022, CHROME); tube(s, [[0, 0.22, 0.37], [0.03, 0.15, 0.39], [0.03, r, 0.4]], 0.014, CHROME); tube(s, [[-0.25, 0.96, 0.33], [0.25, 0.96, 0.33]], 0.016, DARK); grips(s, 0.25, 0.96, 0.33, 0.1);
    s.add(cyl(0.04, 0.04, 0.05, 14), 'paint', 0, 0.72, 0.345); s.add(sph(0.022, 10, 8), HEAD, 0, 0.8, 0.36);
    const wg = cast(r, 0.03, 5, '#ff4fd8', 0.045);
    return { K: k, L: 0.95, W: 0.52, wr: r, wp: [[0, 0.4], [0, -0.38]], wheelGeo: [wg, wg], wW: 0.05, steer: { K: s, z: 0.37, wz: 0.4 }, raw: true, accent: '#ffffff', rider: { pose: 'stand', seat: [0.18 + 0.86 * 0.7, -0.05], hands: [0.96, 0.33, 0.25], lean: 0.08, sc: 0.7, helmet: true } };
  };
  B.moped = () => {
    const k = new Kit(), s = new Kit();
    k.add(sph(1, 22, 16), 'paint', 0, 0.56, -0.43, 0, 0, 0, 0.27, 0.25, 0.46); // round rear cowl
    k.add(rbox(0.36, 0.05, 0.56, 0.025), '#3a3d45', 0, 0.3, 0.06); k.add(rbox(0.34, 0.14, 0.5, 0.06), 'paint', 0, 0.24, 0.06);
    k.add(ext([['m', 0.25, 0.3], ['l', 0.37, 0.3], ['q', 0.55, 0.62, 0.46, 1.0], ['l', 0.37, 1.0], ['q', 0.43, 0.64, 0.25, 0.37]], 0.5, 0.05, 12, 1, 3), 'paint'); // curved leg shield
    k.add(ext([['m', -0.7, 0.8], ['q', -0.4, 0.86, -0.08, 0.8], ['l', -0.06, 0.72], ['l', -0.7, 0.72]], 0.3, 0.05, 10, 1, 3), '#5b3a1e'); // seat
    k.add(sph(1, 12, 8), TAIL, 0, 0.62, -0.88, 0, 0, 0, 0.07, 0.04, 0.03); k.add(rbox(0.12, 0.06, 0.12, 0.02), CHROME, 0, 0.78, -0.82);
    tube(k, [[-0.17, 0.3, -0.25], [-0.2, 0.28, -0.55], [-0.19, 0.32, -0.78]], 0.035, CHROME);
    k.add(cyl(0.08, 0.08, 0.18, 14).rotateX(PI / 2), 'accent', 0.24, 0.6, -0.6); // spare-wheel cover look
    tube(s, [[0.06, 0.22, 0.6], [0.06, 0.62, 0.5], [0, 0.98, 0.42]], 0.028, CHROME);
    fender(s, 0.22, 0.6, 0.27, 0.15, 'paint', PI * 0.2, PI * 0.75); // front fender
    s.add(rbox(0.5, 0.1, 0.16, 0.045), 'paint', 0, 1.04, 0.41); s.add(sph(1, 16, 10), HEAD, 0, 1.03, 0.5, 0, 0, 0, 0.07, 0.06, 0.04); s.add(new T.TorusGeometry(0.068, 0.012, 6, 18), CHROME, 0, 1.03, 0.49);
    grips(s, 0.3, 1.05, 0.39, 0.12); [1, -1].forEach((x) => { tube(s, [[x * 0.18, 1.08, 0.4], [x * 0.24, 1.22, 0.36]], 0.008, CHROME); s.add(sph(1, 10, 8), CHROME, x * 0.25, 1.24, 0.36, 0, 0, 0, 0.05, 0.035, 0.015); });
    const wg = cast(0.22, 0.07, 5, '#d9dde4', 0.12);
    return { K: k, L: 1.8, W: 0.72, wr: 0.22, wp: [[0, 0.6], [0, -0.55]], wheelGeo: [wg, wg], wW: 0.12, steer: { K: s, z: 0.45, wz: 0.6 }, raw: true, accent: '#ffffff', rider: { seat: [0.84, -0.32], hands: [1.05, 0.38, 0.3], feet: [0.34, 0.08], lean: 0.05, sc: 0.7, helmet: true } };
  };
  B.sportbike = () => {
    const k = new Kit(), s = new Kit();
    k.add(ext([['m', -0.25, 0.45], ['l', 0.3, 0.42], ['q', 0.8, 0.46, 0.92, 0.74], ['q', 0.93, 0.9, 0.72, 0.95], ['l', 0.3, 0.92], ['l', -0.25, 0.86]], 0.4, 0.14, 16, 2, 5), 'paint'); // fairing
    k.add(sph(1, 20, 14), 'paint', 0, 0.94, 0.12, 0.12, 0, 0, 0.2, 0.13, 0.36); // tank
    [1, -1].forEach((x) => k.add(ext([['m', 0.25, 0.55], ['l', 0.55, 0.6], ['l', 0.5, 0.66], ['l', 0.25, 0.62]], 0.02, 0.008, 2, 1, 1), DARK, x * 0.21, 0, 0));
    k.add(ext([['m', -0.28, 0.82], ['l', -0.92, 1.02], ['q', -1.02, 1.06, -0.98, 0.96], ['l', -0.32, 0.64]], 0.3, 0.08, 10, 1, 3), 'paint'); // tail
    k.add(ext([['m', -0.2, 0.98], ['q', -0.45, 1.0, -0.62, 1.04], ['l', -0.6, 0.96], ['l', -0.2, 0.9]], 0.26, 0.04, 8, 1, 2), DARK);
    k.add(ext([['m', 0.62, 0.98], ['q', 0.72, 1.18, 0.58, 1.24], ['l', 0.5, 1.02]], 0.36, 0.03, 8, 1, 2), GLASS);
    k.add(ext([['m', 0.1, 0.74], ['l', 0.8, 0.72], ['l', 0.76, 0.79], ['l', 0.1, 0.81]], 0.44, 0.02, 2, 1, 1), 'accent');
    k.add(rbox(0.36, 0.3, 0.46, 0.08), '#2b2d33', 0, 0.46, -0.04);
    mirrorTube(k, [[0.13, 0.48, -0.2], [0.12, 0.31, -0.7]], 0.035, DARK); tube(k, [[-0.12, 0.36, 0.1], [-0.2, 0.32, -0.3], [-0.2, 0.6, -0.72]], 0.04, CHROME); k.add(cyl(0.06, 0.07, 0.28, 14).rotateX(-1.1), CHROME, -0.2, 0.66, -0.8);
    k.add(rbox(0.24, 0.06, 0.05, 0.02), HEAD, 0, 0.8, 0.9); k.add(rbox(0.16, 0.05, 0.04, 0.02), TAIL, 0, 0.99, -0.99);
    mirrorTube(s, [[0.1, 0.31, 0.72], [0.1, 0.96, 0.55]], 0.032, '#e8b43a'); mirrorTube(s, [[0.11, 0.96, 0.54], [0.3, 0.94, 0.47]], 0.018, DARK); grips(s, 0.3, 0.94, 0.46, 0.1);
    fender(s, 0.31, 0.72, 0.36, 0.16, 'paint', PI * 0.3, PI * 0.45);
    const fw = cast(0.31, 0.08, 5, '#ffd23f', 0.13), rw = cast(0.32, 0.1, 5, '#ffd23f', 0.2);
    return { K: k, L: 2.05, W: 0.76, wr: 0.31, wp: [[0, 0.72], [0, -0.7, 0.32]], wheelGeo: [fw, rw], wW: 0.18, steer: { K: s, z: 0.6, wz: 0.72 }, raw: true, accent: '#111111', rider: { seat: [1.0, -0.32], hands: [0.94, 0.46, 0.3], feet: [0.52, -0.3], lean: 0.85, sc: 0.68, helmet: 'visor' } };
  };
  B.cruiser = () => {
    const k = new Kit(), s = new Kit();
    tube(k, [[0, 0.98, 0.62], [0, 0.9, 0.2], [0, 0.7, -0.3], [0, 0.42, -0.78]], 0.035, DARK); tube(k, [[0, 0.9, 0.6], [0, 0.4, 0.3], [0, 0.3, -0.25], [0, 0.34, -0.78]], 0.033, DARK);
    k.add(sph(1, 22, 14), 'paint', 0, 0.96, 0.22, -0.12, 0, 0, 0.2, 0.15, 0.38); k.add(cyl(0.035, 0.035, 0.02, 12), CHROME, 0, 1.11, 0.18);
    [0.38, -0.38].forEach((a) => { const g = new T.Group(); void g; k.add(cyl(0.09, 0.1, 0.36, 16), CHROME, 0, 0.58, 0.05 + a * 0.32, a); for (let i = 0; i < 4; i++) k.add(new T.TorusGeometry(0.1, 0.016, 6, 18).rotateX(PI / 2), '#c4cad4', 0, 0.48 + i * 0.07, 0.05 + a * 0.32 + Math.sin(a) * (i * 0.07), a); });
    k.add(rbox(0.26, 0.24, 0.42, 0.08), '#9aa3af', 0, 0.36, 0.02); k.add(cyl(0.11, 0.11, 0.1, 18).rotateZ(PI / 2), CHROME, 0.14, 0.36, 0.02);
    fender(k, 0.34, -0.8, 0.4, 0.2, 'paint', -PI * 0.05, PI * 0.72);
    k.add(ext([['m', -0.62, 0.72], ['q', -0.4, 0.74, -0.3, 0.68], ['q', -0.1, 0.66, 0.02, 0.78], ['l', 0.05, 0.66], ['l', -0.62, 0.6]], 0.34, 0.06, 10, 1, 3), '#3b2416');
    [1, -1].forEach((x) => k.add(rbox(0.16, 0.26, 0.42, 0.07), '#7c4a24', x * 0.24, 0.6, -0.68));
    tube(k, [[-0.1, 0.55, 0.12], [-0.2, 0.3, -0.1], [-0.21, 0.32, -0.98]], 0.035, CHROME); tube(k, [[-0.1, 0.62, -0.05], [-0.23, 0.42, -0.25], [-0.24, 0.43, -0.96]], 0.033, CHROME);
    k.add(rbox(0.14, 0.06, 0.05, 0.02), TAIL, 0, 0.66, -1.12);
    mirrorTube(s, [[0.1, 0.34, 0.95], [0.1, 1.0, 0.62]], 0.03, CHROME); tube(s, [[0.42, 1.2, 0.42], [0.3, 1.1, 0.55], [0, 1.04, 0.62], [-0.3, 1.1, 0.55], [-0.42, 1.2, 0.42]], 0.02, CHROME, 20); grips(s, 0.44, 1.21, 0.4, 0.12);
    s.add(sph(1, 16, 12), CHROME, 0, 0.94, 0.76, 0, 0, 0, 0.12, 0.12, 0.1); s.add(cyl(0.1, 0.1, 0.02, 18).rotateX(PI / 2), HEAD, 0, 0.94, 0.86);
    fender(s, 0.34, 0.95, 0.4, 0.17, 'paint', PI * 0.3, PI * 0.62);
    const fw = spoked(0.34, 0.075, 36, '#e6e9ef', '#24262b', 0.06), rw = spoked(0.34, 0.085, 36, '#e6e9ef', '#24262b', 0.1);
    return { K: k, L: 2.4, W: 0.95, wr: 0.34, wp: [[0, 0.95], [0, -0.8]], wheelGeo: [fw, rw], wW: 0.17, steer: { K: s, z: 0.62, wz: 0.95 }, raw: true, accent: '#ffffff', rider: { seat: [0.74, -0.3], hands: [1.2, 0.42, 0.42], feet: [0.42, 0.4], lean: -0.08, sc: 0.7, helmet: 'open' } };
  };
  B.kart = () => {
    const k = new Kit();
    k.add(plan([['m', -0.42, 0.8], ['l', 0.42, 0.8], ['l', 0.48, -0.75], ['l', -0.48, -0.75]], 0.04, 0.015), '#2b2d33', 0, 0.09, 0);
    k.add(ext([['m', 0.45, 0.1], ['l', 0.95, 0.1], ['q', 1.08, 0.12, 1.02, 0.24], ['l', 0.5, 0.36], ['q', 0.42, 0.37, 0.4, 0.3]], 0.84, 0.08, 12, 1, 4), 'paint'); // nose cone
    [1, -1].forEach((x) => k.add(rbox(0.2, 0.2, 0.78, 0.09), 'paint', x * 0.5, 0.2, -0.08)); // side pods
    k.add(rbox(0.18, 0.08, 0.02, 0.03), 'accent', 0, 0.3, 0.98, -0.4);
    tube(k, [[-0.62, 0.22, -0.82], [0, 0.22, -0.86], [0.62, 0.22, -0.82]], 0.03, CHROME); tube(k, [[-0.55, 0.16, 1.0], [0, 0.16, 1.04], [0.55, 0.16, 1.0]], 0.026, CHROME);
    k.add(ext([['m', -0.6, 0.18], ['l', -0.3, 0.16], ['l', -0.32, 0.3], ['q', -0.5, 0.62, -0.62, 0.6], ['l', -0.65, 0.2]], 0.4, 0.05, 10, 1, 3), '#1f2937'); // bucket seat
    k.add(rbox(0.26, 0.24, 0.26, 0.06), '#4b5563', -0.3, 0.3, -0.62); k.add(cyl(0.07, 0.07, 0.3, 14).rotateX(PI / 2), CHROME, -0.42, 0.3, -0.78);
    tube(k, [[0, 0.2, 0.62], [0, 0.42, 0.32]], 0.018, CHROME); k.add(new T.TorusGeometry(0.13, 0.022, 8, 20), DARK, 0, 0.44, 0.3, -1.0); tube(k, [[-0.12, 0.44, 0.31], [0.12, 0.44, 0.31]], 0.012, DARK);
    k.add(rbox(0.1, 0.05, 0.03, 0.015), HEAD, 0.25, 0.26, 1.02); k.add(rbox(0.1, 0.05, 0.03, 0.015), HEAD, -0.25, 0.26, 1.02); k.add(rbox(0.12, 0.04, 0.03, 0.015), TAIL, 0.25, 0.24, -0.86);
    const fw = cast(0.14, 0.05, 5, '#ffd23f', 0.14), rw = cast(0.15, 0.06, 5, '#ffd23f', 0.2);
    return { K: k, L: 1.9, W: 1.3, wr: 0.14, wp: [[0.56, 0.62], [-0.56, 0.62], [0.6, -0.62, 0.15], [-0.6, -0.62, 0.15]], wheelGeo: [fw, fw, rw, rw], wW: 0.2, raw: true, accent: '#ffffff', rider: { pose: 'sit', seat: [0.26, -0.45], hands: [0.46, 0.22, 0.13], feet: [0.18, 0.62], lean: -0.15, sc: 0.62, helmet: 'visor' } };
  };
  B.jetski = () => {
    const k = new Kit(), s = new Kit();
    k.add(plan([['m', -0.52, 1.35], ['l', 0.52, 1.35], ['q', 0.6, 0, 0.26, -1.25], ['q', 0, -1.55, -0.26, -1.25], ['q', -0.6, 0, -0.52, 1.35]], 0.42, 0.13), 'paint', 0, -0.18, 0);
    k.add(plan([['m', -0.5, 1.33], ['l', 0.5, 1.33], ['q', 0.56, 0, 0.24, -1.2], ['q', 0, -1.48, -0.24, -1.2], ['q', -0.56, 0, -0.5, 1.33]], 0.1, 0.04), '#f8fafc', 0, -0.26, 0);
    k.add(ext([['m', -1.3, 0.24], ['l', 1.2, 0.24], ['q', 1.42, 0.28, 1.2, 0.42], ['l', 0.6, 0.62], ['q', 0.32, 0.86, 0.1, 0.8], ['l', -0.25, 0.56], ['l', -1.3, 0.46]], 0.74, 0.1, 12, 2, 4), 'accent');
    k.add(ext([['m', -0.95, 0.58], ['q', -0.6, 0.78, -0.05, 0.76], ['l', 0.0, 0.62], ['l', -0.95, 0.5]], 0.36, 0.07, 10, 1, 3), DARK);
    k.add(ext([['m', 0.5, 0.82], ['q', 0.6, 0.98, 0.42, 1.02], ['l', 0.36, 0.86]], 0.4, 0.03, 8, 1, 2), GLASS);
    k.add(cyl(0.09, 0.07, 0.2, 14).rotateX(PI / 2), CHROME, 0, 0.06, -1.42); k.add(rbox(0.16, 0.05, 0.04, 0.02), TAIL, 0, 0.44, -1.32);
    k.add(rbox(0.3, 0.05, 0.05, 0.02), HEAD, 0, 0.5, 1.28); [1, -1].forEach((x) => k.add(rbox(0.06, 0.03, 1.2, 0.015), 'paint', x * 0.38, 0.47, -0.3));
    s.add(rbox(0.18, 0.26, 0.2, 0.06), 'paint', 0, 0.9, 0.3); tube(s, [[-0.34, 1.02, 0.24], [-0.2, 1.0, 0.3], [0, 1.0, 0.32], [0.2, 1.0, 0.3], [0.34, 1.02, 0.24]], 0.02, DARK, 16); grips(s, 0.35, 1.02, 0.23, 0.12);
    return { K: k, L: 2.9, W: 1.15, wr: 0, wp: [], wheelGeo: [], steer: { K: s, z: 0.3, wz: 99 }, raw: true, accent: '#ffffff', rider: { seat: [0.86, -0.42], hands: [1.0, 0.24, 0.32], feet: [0.5, -0.02], lean: 0.2, sc: 0.68, helmet: false, vest: true } };
  };
  // big shocks + bigger body for the monster truck (real suspension travel is animated in vehicle.js)
  const monster0 = B.monster;
  B.monster = () => { const r = monster0(); [[1.25, 1.7], [-1.25, 1.7], [1.25, -1.65], [-1.25, -1.65]].forEach(([x, z]) => { r.K.add(cyl(0.11, 0.11, 0.9, 12), CHROME, x * 0.82, 1.45, z, 0, 0, x > 0 ? -0.35 : 0.35); for (let i = 0; i < 6; i++) r.K.add(new T.TorusGeometry(0.15, 0.025, 6, 14).rotateX(PI / 2), '#ef4444', x * 0.82 + (x > 0 ? 1 : -1) * (i - 2.5) * 0.045, 1.2 + i * 0.1, z, 0, 0, x > 0 ? -0.35 : 0.35); }); r.bigSus = true; return r; };

  // ---------- rider ----------
  const HELM = {};
  M.addRider = function (G, cfg, color, type) {
    if (!GR.Person) return; const sc = cfg.sc || 0.7;
    const p = GR.Person({ shirt: color, pants: '#27324d' }); p.scale.setScalar(sc); p.position.y = -0.86 * sc;
    p.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
    const piv = new T.Group(); piv.position.set(0, cfg.seat[0], cfg.seat[1]); piv.add(p); piv.rotation.x = cfg.lean || 0;
    const u = p.userData;
    if (cfg.helmet) { const hk = String(cfg.helmet); const geo = HELM[hk] || (HELM[hk] = (() => { const q = []; q.push(U.paint(new T.SphereGeometry(0.34, 20, 14, 0, PI * 2, 0, PI * 0.56), '#ffffff'));
        q.push(U.paint(new T.TorusGeometry(0.31, 0.03, 8, 24).rotateX(PI / 2).translate(0, -0.06, 0), '#e5e7eb'));
        if (cfg.helmet === 'visor') q.push(U.paint(new T.SphereGeometry(0.345, 18, 10, -0.9, 1.8, PI * 0.36, PI * 0.26), '#1f2a44'));
        q.push(U.paint(U.xf(new T.BoxGeometry(0.06, 0.03, 0.4), 0, 0.33, -0.02), '#ef4444')); return U.merge(q); })());
      const hm = new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true })); hm.position.y = 0.1; hm.scale.setScalar(1.04); hm.castShadow = true; const col = new T.Color(color).lerp(new T.Color('#ffffff'), 0.25); hm.material.color = col; u.head.add(hm); }
    if (cfg.vest) { const v = new T.Mesh(new T.CylinderGeometry(0.34, 0.33, 0.5, 16, 1, true), new T.MeshLambertMaterial({ color: '#f97316', side: T.DoubleSide })); v.position.y = 1.2; p.add(v); }
    G.userData.chassis.add(piv);
    let crank = null;
    if (cfg.pedal) { const q = []; [1, -1].forEach((sd) => { q.push(U.paint(U.xf(new T.BoxGeometry(0.02, 0.025, cfg.pedal[2]), sd * 0.085, 0, sd * cfg.pedal[2] / 2), '#9aa3af')); q.push(U.paint(U.xf(M.rbox(0.1, 0.022, 0.06, 0.008), sd * 0.13, 0, sd * cfg.pedal[2]), '#2b2d33')); }); crank = new T.Mesh(U.merge(q), M.matWheel); crank.position.set(0, cfg.pedal[0], cfg.pedal[1]); G.userData.chassis.add(crank); }
    G.userData.rider = { piv, p, cfg, ph: 0, crank, sc };
    M.poseRider(G, 0, 0, false, 0);
  };
  const legLen = 0.82;
  // aim a limb (hanging straight down from its joint) at a target point (y,z in the pivot's un-leaned frame)
  const aim = (dy, dz) => -Math.atan2(dz, -dy);
  M.poseRider = function (G, ph, kick, footDown, wh) {
    const R = G.userData.rider; if (!R) return; const c = R.cfg, sc = R.sc, u = R.p.userData, lean = c.lean || 0, sy = c.seat[0], sz = c.seat[1];
    R.piv.rotation.x = lean;
    // arms -> handlebar grips
    const shY = 0.64 * sc * Math.cos(lean), shZ = 0.64 * sc * Math.sin(lean), hy = c.hands[0] - sy - shY, hz = c.hands[1] - sz - shZ, al = Math.hypot(hy, hz);
    const ax = aim(hy, hz) - lean, spr = Math.atan2(Math.max(0, (c.hands[2] || 0.3) - 0.37 * sc), al);
    u.AL.rotation.set(ax, 0, spr); u.AR.rotation.set(ax, 0, -spr);
    u.head.rotation.x = -lean * 0.75 + (wh || 0) * 0.5;
    let fl, fr;
    if (c.pedal) { const cr = c.pedal[2]; fl = [c.pedal[0] + cr * Math.sin(ph), c.pedal[1] + cr * Math.cos(ph)]; fr = [c.pedal[0] - cr * Math.sin(ph), c.pedal[1] - cr * Math.cos(ph)]; if (R.crank) R.crank.rotation.x = -ph - PI / 2; }
    else if (c.pose === 'stand') { fl = [0.18, sz + 0.06]; fr = [0.18, sz - 0.1]; }
    else { fl = fr = c.feet; }
    const leg = (L, f, side) => { const dy = f[0] - sy, dz = f[1] - sz; L.rotation.set(aim(dy, dz) - lean, 0, c.pose === 'sit' ? side * 0.12 : side * 0.05); };
    leg(u.L, fl, 1); leg(u.R, fr, -1);
    if (c.pose === 'stand') { u.L.rotation.x = -lean; u.R.rotation.x = -lean + kick; }
    if (footDown) { u.L.rotation.x = -lean + 0.1; u.L.rotation.z = 0.42; }
  };
  // per frame: pedal cadence follows the wheels, kick-scooter pushes, foot down when stopped
  M.animRider = function (G, v, dt, thr, stopped, wh) {
    const R = G.userData.rider; if (!R) return;
    R.p.visible = !G.userData.noRider;
    const c = R.cfg; let kick = 0;
    if (c.pedal) { if (thr > 0.05 || Math.abs(v) < 0.3) R.ph += Math.max(0, v) * dt / (G.userData.wheelR || 0.3) * 0.42; }
    if (c.pose === 'stand') { if (thr > 0.05 && Math.abs(v) < 9) { R.kt = (R.kt || 0) + dt * 5; kick = Math.max(0, Math.sin(R.kt)) * 0.75; } else R.kt = 0; }
    M.poseRider(G, R.ph, kick, stopped && c.pose !== 'sit' && c.pose !== 'stand' && G.userData.type !== 'jetski', wh);
  };
})();
