/* Grok Rides - tiny WebAudio engine hum + sound effects */
(function () {
  'use strict';
  const GR = window.GR;
  const A = GR.Snd = { muted: false };
  let ctx = null, eng = null, engGain = null, lp = null, master = null;
  try { A.muted = localStorage.getItem('grokRides.mute') === '1'; } catch (e) {}
  A.unlock = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = A.muted ? 0 : 0.6; master.connect(ctx.destination);
    eng = ctx.createOscillator(); eng.type = 'sawtooth'; lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400; engGain = ctx.createGain(); engGain.gain.value = 0;
    eng.connect(lp); lp.connect(engGain); engGain.connect(master); eng.start();
  };
  A.setMute = function (m) { A.muted = m; try { localStorage.setItem('grokRides.mute', m ? '1' : '0'); } catch (e) {} if (master) master.gain.value = m ? 0 : 0.6; };
  // per-ride engine voices: [wave, base Hz, Hz per rpm, low-pass base, low-pass per rpm, volume]
  const VOICE = { moped: ['square', 95, 230, 500, 1600, 0.045], sport: ['sawtooth', 85, 300, 600, 2400, 0.06], cruiser: ['sawtooth', 30, 62, 220, 420, 0.1], kart: ['square', 70, 200, 450, 1400, 0.05], jetski: ['sawtooth', 58, 150, 380, 900, 0.07], monster: ['sawtooth', 36, 85, 260, 600, 0.1] };
  let tickT = 0, lastT = 0;
  A.engine = function (rpm, on, kind, type, thr) {
    if (!ctx) return; const t = ctx.currentTime, V = GR.VEH[type] || {}, vo = VOICE[V.snd];
    if (V.snd === 'pedal') { // no motor: soft freewheel clicks while coasting, quiet tyre whirr while pedalling
      engGain.gain.setTargetAtTime(on && rpm > 0.05 ? 0.012 : 0, t, 0.15); eng.type = 'triangle'; eng.frequency.setTargetAtTime(180 + rpm * 260, t, 0.1); lp.frequency.setTargetAtTime(900, t, 0.1);
      const dt = Math.min(0.1, t - lastT); lastT = t; if (on && rpm > 0.08 && !(thr > 0.05)) { tickT += dt; if (tickT > 0.09 / (0.3 + rpm)) { tickT = 0; beep(2600, 0.012, 'square', 0.025); } }
      return;
    }
    lastT = t;
    if (vo) { if (eng.type !== vo[0]) eng.type = vo[0]; eng.frequency.setTargetAtTime(vo[1] + rpm * vo[2] + (V.snd === 'cruiser' ? Math.sin(t * 38) * 4 : 0), t, 0.08); lp.frequency.setTargetAtTime(vo[3] + rpm * vo[4], t, 0.1); engGain.gain.setTargetAtTime(on ? vo[5] : 0, t, 0.15); return; }
    if (eng.type !== 'sawtooth') eng.type = 'sawtooth';
    const base = kind === 'heli' ? 38 : kind === 'balloon' ? 30 : kind === 'plane' ? 70 : 55;
    eng.frequency.setTargetAtTime(base + rpm * (kind === 'heli' ? 20 : 120), t, 0.08);
    lp.frequency.setTargetAtTime(300 + rpm * 900, t, 0.1);
    engGain.gain.setTargetAtTime(on ? (kind === 'balloon' ? 0.02 : 0.07) : 0, t, 0.15);
  };
  function beep(f, d, type, vol, slide) {
    if (!ctx || A.muted) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || 'square'; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(vol || 0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.02);
  }
  function noise(d, vol, f) {
    if (!ctx || A.muted) return; const t = ctx.currentTime, n = ctx.sampleRate * d, b = ctx.createBuffer(1, n, ctx.sampleRate), a = b.getChannelData(0); for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(); s.buffer = b; const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = f || 1200; const g = ctx.createGain(); g.gain.value = vol || 0.3; s.connect(fl); fl.connect(g); g.connect(master); s.start(t);
  }
  A.fx = function (k) {
    switch (k) {
      case 'crash': noise(0.35, 0.45, 900); beep(120, 0.25, 'square', 0.12, 50); break;
      case 'bump': noise(0.12, 0.2, 700); break;
      case 'coin': beep(880, 0.08, 'square', 0.1); setTimeout(() => beep(1320, 0.14, 'square', 0.1), 80); break;
      case 'go': beep(1046, 0.4, 'square', 0.14); break;
      case 'count': beep(523, 0.18, 'square', 0.12); break;
      case 'cp': beep(740, 0.08, 'triangle', 0.14); setTimeout(() => beep(990, 0.1, 'triangle', 0.12), 60); break;
      case 'win': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.18, 'square', 0.12), i * 120)); break;
      case 'horn': beep(392, 0.3, 'sawtooth', 0.1); beep(494, 0.3, 'sawtooth', 0.08); break;
      case 'jingle': [784, 659, 784, 880, 784, 659, 523].forEach((f, i) => setTimeout(() => beep(f, 0.14, 'triangle', 0.12), i * 150)); break;
      case 'siren': beep(700, 0.4, 'sawtooth', 0.07, 1000); setTimeout(() => beep(1000, 0.4, 'sawtooth', 0.07, 700), 400); break;
      case 'nitro': noise(0.5, 0.3, 2500); beep(200, 0.5, 'sawtooth', 0.08, 600); break;
      case 'splash': noise(0.5, 0.35, 1800); break;
      case 'ui': beep(660, 0.05, 'triangle', 0.1); break;
      case 'buy': [659, 880, 1175].forEach((f, i) => setTimeout(() => beep(f, 0.12, 'square', 0.1), i * 90)); break;
      case 'fail': beep(330, 0.25, 'square', 0.1, 160); break;
      case 'bell': beep(2093, 0.35, 'triangle', 0.12); setTimeout(() => beep(2093, 0.45, 'triangle', 0.1), 170); break;
      case 'meep': beep(620, 0.12, 'square', 0.1); setTimeout(() => beep(620, 0.16, 'square', 0.1), 150); break;
      case 'roar': beep(110, 0.6, 'sawtooth', 0.14, 70); noise(0.6, 0.3, 500); break;
      case 'crunch': noise(0.25, 0.4, 600); beep(90, 0.2, 'square', 0.1, 50); break;
      case 'join': beep(600, 0.1, 'triangle', 0.12); setTimeout(() => beep(900, 0.12, 'triangle', 0.12), 100); break;
    }
  };
})();
