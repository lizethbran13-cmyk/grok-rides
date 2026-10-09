/* Grok Rides - cartoon effects: sparks, smoke, dust, splash, pop text */
(function () {
  'use strict';
  const GR = window.GR, T = THREE, M = GR.M;
  const FX = GR.FX = {};
  const MAX = 600;
  let pts, pos, col, siz, alp, P = [];
  FX.init = function (scene) {
    const g = new T.BufferGeometry(); pos = new Float32Array(MAX * 3); col = new Float32Array(MAX * 3); siz = new Float32Array(MAX); alp = new Float32Array(MAX);
    g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3)); g.setAttribute('size', new T.BufferAttribute(siz, 1)); g.setAttribute('alpha', new T.BufferAttribute(alp, 1));
    const mat = new T.ShaderMaterial({
      transparent: true, depthWrite: false, vertexColors: true,
      vertexShader: 'attribute float size; attribute float alpha; varying vec3 vC; varying float vA; void main(){ vC=color; vA=alpha; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=size*(300.0/-mv.z); gl_Position=projectionMatrix*mv; }',
      fragmentShader: 'varying vec3 vC; varying float vA; void main(){ vec2 d=gl_PointCoord-0.5; float r=dot(d,d); if(r>0.25) discard; gl_FragColor=vec4(vC, vA*(1.0-r*2.5)); }'
    });
    pts = new T.Points(g, mat); pts.frustumCulled = false; scene.add(pts); FX.scene = scene;
    for (let i = 0; i < MAX; i++) P.push({ life: 0 });
  };
  let cursor = 0;
  function emit(x, y, z, vx, vy, vz, life, size, r, g, b, grav, grow) { const p = P[cursor]; cursor = (cursor + 1) % MAX; p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.life = p.max = life; p.size = size; p.r = r; p.g = g; p.b = b; p.grav = grav; p.grow = grow || 0; }
  FX.sparks = function (x, y, z, n) { for (let i = 0; i < (n || 14); i++) emit(x, y, z, (Math.random() - 0.5) * 14, Math.random() * 9 + 2, (Math.random() - 0.5) * 14, 0.5 + Math.random() * 0.3, 0.5, 1, 0.8 + Math.random() * 0.2, 0.3, 20); };
  FX.smoke = function (x, y, z, dark) { const c = dark ? 0.3 : 0.85; emit(x, y, z, (Math.random() - 0.5) * 1.5, 2 + Math.random(), (Math.random() - 0.5) * 1.5, 1.4, 1.6, c, c, c, -0.5, 2.4); };
  FX.dust = function (x, y, z, r, g, b) { emit(x + (Math.random() - 0.5), y, z + (Math.random() - 0.5), (Math.random() - 0.5) * 2, 1 + Math.random(), (Math.random() - 0.5) * 2, 0.9, 1.2, r, g, b, 0, 2); };
  // jet-ski rooster tail: water thrown up and back behind the jet (vx/vz = backward direction)
  FX.spray = function (x, y, z, bx, bz, n, side) { for (let i = 0; i < n; i++) { const k = 5 + Math.random() * 5; emit(x + (Math.random() - 0.5) * 0.3, y, z + (Math.random() - 0.5) * 0.3, bx * k + (Math.random() - 0.5) * 2 + (side || 0) * bz * 4, 4 + Math.random() * 4, bz * k + (Math.random() - 0.5) * 2 - (side || 0) * bx * 4, 0.7 + Math.random() * 0.3, 0.55, 0.85, 0.95, 1, 16, 1.4); } };
  FX.splash = function (x, y, z) { for (let i = 0; i < 16; i++) emit(x, y, z, (Math.random() - 0.5) * 8, 5 + Math.random() * 6, (Math.random() - 0.5) * 8, 0.8, 0.8, 0.7, 0.9, 1, 18); };
  FX.confetti = function (x, y, z) { for (let i = 0; i < 60; i++) emit(x, y, z, (Math.random() - 0.5) * 18, 8 + Math.random() * 10, (Math.random() - 0.5) * 18, 1.6, 0.9, Math.random(), Math.random(), Math.random(), 9); };
  const pops = [];
  FX.pop = function (text, x, y, z, color, scale) {
    const s = M.sprite(text, { color: color || '#ffd23f', stroke: '#3a1747', wide: 3, scale: scale || 3, fs: 0.55, bold: true }); s.position.set(x, y, z); FX.scene.add(s); pops.push({ s, t: 0 });
  };
  FX.update = function (dt) {
    let n = 0;
    for (let i = 0; i < MAX; i++) {
      const p = P[i]; if (p.life <= 0) { alp[i] = 0; siz[i] = 0; continue; }
      p.life -= dt; p.vy -= p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.size += p.grow * dt;
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z; col[i * 3] = p.r; col[i * 3 + 1] = p.g; col[i * 3 + 2] = p.b; siz[i] = p.size; alp[i] = Math.max(0, p.life / p.max); n++;
    }
    const g = pts.geometry; g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = g.attributes.size.needsUpdate = g.attributes.alpha.needsUpdate = true;
    for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i]; p.t += dt; p.s.position.y += dt * 3; p.s.material.opacity = Math.max(0, 1 - p.t / 1.4); const k = p.t < 0.15 ? p.t / 0.15 : 1; p.s.scale.set(p.s.userData.w || (p.s.userData.w = p.s.scale.x), p.s.userData.h || (p.s.userData.h = p.s.scale.y), 1).multiplyScalar(k); if (p.t > 1.4) { FX.scene.remove(p.s); p.s.material.map.dispose(); p.s.material.dispose(); pops.splice(i, 1); } }
    return n;
  };
})();
