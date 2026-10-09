// GROK RIDES — day / night cycle: moving sun + moon, sky + fog colours, stars, street lamps, lit windows, headlights
(function () {
  'use strict';
  const GR = window.GR, T = THREE, U = GR.U, M = GR.M, PI = Math.PI;
  const DN = GR.DN = { tod: 0.36, speed: 1 };
  const DAY_S = 420, NIGHT_S = 150; // ~7 min of daylight, ~2.5 min of night
  const C = (h) => new T.Color(h);
  // palette keyframes by sun height (-1..1)
  const KEYS = [
    { e: -0.35, top: C('#060b24'), mid: C('#0d1838'), hor: C('#1d2b52'), fog: C('#121c3a'), sun: C('#7f9cff'), hemiS: C('#5a6fb0'), hemiG: C('#1b2235') },
    { e: -0.05, top: C('#1b2a6b'), mid: C('#4b4f8f'), hor: C('#f39a7a'), fog: C('#8a7fa0'), sun: C('#ff9d6b'), hemiS: C('#9fa6d6'), hemiG: C('#4a4058') },
    { e: 0.12, top: C('#3a7fe0'), mid: C('#9cc4f0'), hor: C('#ffd2a6'), fog: C('#f2d8c0'), sun: C('#ffc38a'), hemiS: C('#cfe0ff'), hemiG: C('#7c7a60') },
    { e: 0.45, top: C('#2f86f0'), mid: C('#7cc0ff'), hor: C('#e4f5ff'), fog: C('#cfeaff'), sun: C('#fff0d8'), hemiS: C('#d6ecff'), hemiG: C('#7c8a60') }
  ];
  const pal = { top: C('#000'), mid: C('#000'), hor: C('#000'), fog: C('#000'), sun: C('#000'), hemiS: C('#000'), hemiG: C('#000') };
  function palette(e) {
    let a = KEYS[0], b = KEYS[KEYS.length - 1];
    for (let i = 0; i < KEYS.length - 1; i++) if (e >= KEYS[i].e && e <= KEYS[i + 1].e) { a = KEYS[i]; b = KEYS[i + 1]; }
    const t = e <= KEYS[0].e ? 0 : e >= b.e ? 1 : (e - a.e) / (b.e - a.e);
    for (const k in pal) pal[k].copy(a[k]).lerp(b[k], U.smooth(0, 1, t));
  }
  let G, sky, skyPos, skyCol, stars, moon, lastSky = -1;
  DN.init = function (scene) {
    G = GR.G; sky = GR.SC.sky; const s = G.save; DN.tod = typeof s.tod === 'number' ? s.tod : 0.36;
    if (sky) { skyPos = sky.geometry.attributes.position; skyCol = sky.geometry.attributes.color; }
    // stars (live inside the sky dome)
    const sp = [], r = U.rng(7); for (let i = 0; i < 900; i++) { const a = r() * PI * 2, el = Math.asin(0.05 + r() * 0.95); sp.push(Math.cos(a) * Math.cos(el) * 2300, Math.sin(el) * 2300, Math.sin(a) * Math.cos(el) * 2300); }
    stars = new T.Points(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(sp, 3)), new T.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0, depthWrite: false }));
    stars.renderOrder = -1; if (sky) sky.add(stars);
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.28, 'rgba(235,240,255,1)'); gr.addColorStop(0.36, 'rgba(200,215,255,.35)'); gr.addColorStop(1, 'rgba(200,215,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    x.fillStyle = 'rgba(170,180,210,.55)'; [[56, 52, 7], [72, 70, 5], [60, 76, 4]].forEach((c) => { x.beginPath(); x.arc(c[0], c[1], c[2], 0, 7); x.fill(); });
    moon = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(cv), fog: false, depthWrite: false, transparent: true })); moon.scale.set(300, 300, 1); moon.renderOrder = -1; if (sky) sky.add(moon);
    DN.apply(true);
  };
  DN.isNight = () => DN.nightK > 0.5;
  DN.setTime = function (t) { DN.tod = ((t % 1) + 1) % 1; DN.apply(true); if (G && G.save) G.save.tod = DN.tod; };
  const sd = new T.Vector3(), v3 = new T.Vector3(), tmp = new T.Color();
  DN.apply = function (force) {
    if (!G || !G.sun) return;
    const a = (DN.tod - 0.25) * PI * 2; // 0.25 sunrise, 0.5 noon, 0.75 sunset
    sd.set(Math.cos(a) * 0.82, Math.sin(a), 0.38).normalize(); const e = sd.y; palette(e);
    const dayK = U.smooth(-0.1, 0.18, e); DN.dayK = dayK; DN.nightK = 1 - U.smooth(-0.14, 0.06, e);
    // the light follows the sun by day and the moon at night
    if (e > -0.05) G.sunDir.copy(sd); else G.sunDir.set(-sd.x, -sd.y, sd.z).normalize();
    if (G.sunDir.y < 0.18) { G.sunDir.y = 0.18; G.sunDir.normalize(); }
    G.sun.color.copy(pal.sun); G.sun.intensity = 0.2 + 0.7 * dayK;
    if (G.hemi) { G.hemi.color.copy(pal.hemiS); G.hemi.groundColor.copy(pal.hemiG); G.hemi.intensity = 0.46 + 0.14 * dayK; }
    G.scene.fog.color.copy(pal.fog); G.scene.background.copy(pal.fog);
    G.scene.fog.near = 200 + 60 * dayK; G.scene.fog.far = 820 + 330 * dayK;
    if (GR.SC.sunSp) { GR.SC.sunSp.position.copy(sd).multiplyScalar(2300); GR.SC.sunSp.visible = e > -0.12; GR.SC.sunSp.material.color.copy(pal.sun).lerp(tmp.set('#ffffff'), dayK * 0.6); }
    if (moon) { moon.position.set(-sd.x, -sd.y, sd.z).normalize().multiplyScalar(2250); moon.visible = -sd.y > -0.1; }
    if (stars) stars.material.opacity = Math.max(0, DN.nightK - 0.15) * 0.95;
    // sky dome vertex colours (only when the time moved a bit)
    if (skyCol && (force || Math.abs(DN.tod - lastSky) > 0.0015)) {
      lastSky = DN.tod; const sunC = tmp.copy(pal.sun).lerp(C('#ffffff'), 0.3), arr = skyCol.array;
      for (let i = 0; i < skyPos.count; i++) {
        const y = skyPos.getY(i) / 2500, t = U.clamp(y * 2.2, 0, 1); let r, g, b;
        if (t < 0.35) { const k = t / 0.35; r = pal.hor.r + (pal.mid.r - pal.hor.r) * k; g = pal.hor.g + (pal.mid.g - pal.hor.g) * k; b = pal.hor.b + (pal.mid.b - pal.hor.b) * k; } else { const k = (t - 0.35) / 0.65; r = pal.mid.r + (pal.top.r - pal.mid.r) * k; g = pal.mid.g + (pal.top.g - pal.mid.g) * k; b = pal.mid.b + (pal.top.b - pal.mid.b) * k; }
        v3.set(skyPos.getX(i), skyPos.getY(i), skyPos.getZ(i)).normalize(); const sg = Math.pow(Math.max(0, v3.dot(sd)), 6) * 0.55 * U.smooth(-0.2, 0.05, e);
        arr[i * 3] = r + (sunC.r - r) * sg; arr[i * 3 + 1] = g + (sunC.g - g) * sg; arr[i * 3 + 2] = b + (sunC.b - b) * sg;
      }
      skyCol.needsUpdate = true;
    }
    // city lights
    const n = DN.nightK, B = GR.BLD;
    if (B) {
      if (B.bulbMat) B.bulbMat.color.set(n > 0.3 ? '#fff1b8' : '#bdb8a6');
      if (B.poolMat) { B.poolMat.opacity = n * 0.55; if (B.poolMesh) B.poolMesh.visible = n > 0.05; }
      (B.mats || []).forEach((m) => { m.emissiveIntensity = n * 1.1; });
    }
    if (GR.PL.frontMat) GR.PL.frontMat.emissive.setScalar(0.16 + n * 0.5);
    (GR.PL.nightMats || []).forEach((m) => m.emissive.setScalar(0.13 + n * 0.45));
    const on = n > 0.45; if (M.nightOn !== on) M.setNight(on);
  };
  let acc = 0;
  DN.update = function (dt) {
    const day = DN.tod > 0.22 && DN.tod < 0.78, rate = day ? 0.56 / DAY_S : 0.44 / NIGHT_S;
    DN.tod = (DN.tod + rate * dt * DN.speed) % 1; acc += dt;
    if (acc > 0.25) { acc = 0; DN.apply(false); if (G.save) G.save.tod = Math.round(DN.tod * 1000) / 1000; }
    if (sky && G.cam) sky.position.copy(G.cam.position);
    const chip = document.getElementById('todChip'); if (chip) { const h = Math.floor(DN.tod * 24), m = Math.floor((DN.tod * 24 - h) * 60); const ic = DN.nightK > 0.5 ? '🌙' : DN.tod < 0.3 ? '🌅' : DN.tod > 0.7 ? '🌇' : '☀️'; const txt = ic + ' ' + ((h + 11) % 12 + 1) + ':' + String(m - m % 10).padStart(2, '0') + (h < 12 ? ' AM' : ' PM'); if (chip.textContent !== txt) chip.textContent = txt; }
  };
})();
