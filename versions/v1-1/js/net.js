/* Grok Rides - online co-op (up to 3) on the shared GrokNet layer: free roam, ride along, races */
(function () {
  'use strict';
  const GR = window.GR, GN = window.GrokNet, UI = GR.UI;
  const $ = (id) => document.getElementById(id);
  const N = GR.Net = {};
  let sendT = 0, aiT = 0;
  function G() { return GR.G; }
  function msg(t, ok) { const m = $('onlineMsg'); if (m) { m.textContent = t; m.className = 'msg' + (ok ? ' ok' : ''); } }
  function bind(room) {
    const g = G(); g.room = room;
    room.on('status', (t) => { if (!g.playing) msg(t, true); });
    room.on('open', () => {
      if (room.isHost) { g.start('host'); UI.toast('Room ' + room.code + ' is open! Friends join with this code.'); }
      else { msg('Connected! Driving over…', true); g.start('join'); UI.toast('Joined room ' + room.code + '! 🚗'); }
      GR.Snd.fx('join'); N.badge = GN.ui.badge(room, { pos: 'bc', label: room.code }); N.badge.el.style.bottom = 'calc(4px + env(safe-area-inset-bottom))';
    });
    room.on('join', (p) => { if (p.pid !== room.pid) { UI.toast('👋 ' + p.name + ' joined!'); GR.Snd.fx('join'); sendT = 1; } });
    room.on('leave', (p) => { removeRemote(p.pid); UI.toast(p.name + ' left the game', true); });
    room.on('message', (d, from) => onMsg(d, from));
    room.on('reconnecting', () => UI.toast('Lost the host — reconnecting…', true));
    room.on('error', (e) => {
      if (!g.playing) { msg(e.title + ': ' + e.message); g.room = null; return; }
      UI.toast(e.title + ' — you can keep playing solo.', true); N.leave(true);
    });
    room.start();
  }
  N.host = function (code) { const g = G(); msg('Opening a room…', true); bind(GN.createRoom({ role: 'host', code: code || undefined, name: g.myName(), color: g.myColor(), max: 3, rejoin: !!code })); };
  N.join = function (code) { const g = G(); msg('Joining ' + code + '…', true); bind(GN.createRoom({ role: 'join', code, name: g.myName(), color: g.myColor(), rejoin: !!g.fromHub })); };
  N.leave = function (keepPlaying) {
    const g = G(); if (!g.room) return; try { g.room.leave(); } catch (e) {} g.room = null;
    if (N.badge) { N.badge.remove(); N.badge = null; }
    for (const k in g.remotes) removeRemote(k);
    if (g.passenger) { g.passenger = null; g.me.model.visible = true; }
    if (GR.Race.cur && GR.Race.cur.online) { GR.Race.cur.online = null; }
    void keepPlaying;
  };
  function removeRemote(pid) { const g = G(), r = g.remotes[pid]; if (!r) return; if (r.veh) r.veh.dispose(g.scene); if (r.tag) g.scene.remove(r.tag); if (r.person && r.person.parent) r.person.parent.remove(r.person); delete g.remotes[pid]; if (g.passenger === pid) { g.passenger = null; g.me.model.visible = true; g.camSnap = true; } if (GR.Race.cur) delete GR.Race.cur.others[pid]; }
  function myRaceInfo() { const r = GR.Race.cur; if (!r || !r.online) return null; return { id: r.online.id, pg: Math.round(r.me.prog), f: r.me.fin }; }
  N.sendNow = function () { sendT = 1; };
  N.tick = function (dt) {
    const g = G(), room = g.room; if (!room || !room.opened || !g.me) return;
    sendT += dt;
    if (sendT >= 0.1) {
      sendT = 0;
      room.broadcast({ t: 'p', id: room.pid, n: g.myName(), c: g.myColor(), ty: g.me.type, vc: g.me.color, s: g.me.snap(), ride: g.passenger || null, rg: myRaceInfo(), ft: GR.Foot.snap() });
    }
    const r = GR.Race.cur;
    if (room.isHost && r && r.online && r.ai.length) { aiT += dt; if (aiT > 0.1) { aiT = 0; room.broadcast({ t: 'ai', id: r.online.id, l: GR.Race.aiSnap() }); } }
  };
  N.event = function (e) { const g = G(); if (g.room) g.room.broadcast(Object.assign({ t: 'ev', id: g.room.pid }, e)); };
  function onMsg(d, from) {
    const g = G(); if (!d || !g.room) return;
    if (d.t === 'p') {
      if (d.id === g.room.pid) return;
      let r = g.remotes[d.id];
      if (!r) { r = g.remotes[d.id] = { pid: d.id, name: GN.cleanName(d.n), color: GN.cleanColor(d.c) }; }
      if (!GR.VEH[d.ty]) return;
      if (!r.veh || r.type !== d.ty || r.vcol !== d.vc) {
        if (r.veh) r.veh.dispose(g.scene); r.type = d.ty; r.vcol = d.vc;
        r.veh = new GR.Veh(d.ty, /^#[0-9a-f]{6}$/i.test(d.vc || '') ? d.vc : r.color, { remote: true }); r.veh.fixed = true; g.scene.add(r.veh.model);
        if (!r.tag) { r.tag = GR.M.sprite(r.name, { color: '#ffffff', bg: r.color, wide: 3, scale: 2.4, fs: 0.5, bold: true }); g.scene.add(r.tag); }
      }
      r.veh.setRemote(d.s); r.last = performance.now();
      const wasRide = r.ride; r.ride = d.ride || null; r.veh.model.visible = !r.ride;
      if (r.ride && !wasRide && r.ride === g.room.pid) UI.toast('🚗 ' + r.name + ' hopped in your ride!');
      if (!r.ride && wasRide === g.room.pid) UI.toast('🚪 ' + r.name + ' hopped out.');
      if (r.tag) r.tag.visible = !r.ride;
      r.inRace = !!d.rg; GR.Foot.remote(r, d);
      const rc = GR.Race.cur; if (rc && rc.online && d.rg && d.rg.id === rc.online.id) { rc.others[d.id] = { name: r.name, prog: d.rg.pg, fin: d.rg.f }; }
    } else if (d.t === 'ai') {
      const rc = GR.Race.cur; if (rc && rc.online && !g.room.isHost && d.id === rc.online.id) GR.Race.applyAiSnap(d.l);
    } else if (d.t === 'rinv') {
      if (g.room.isHost && from !== g.room.pid) return;
      const rc = GR.RACES.find((q) => q.id === d.rc); if (!rc) return;
      const me = d.ids.find((q) => q.pid === g.room.pid); if (!me) return;
      UI.toast('🏁 ' + d.host + ' started ' + rc.name + '! Get ready…');
      g.beginRace(rc, { diff: d.diff, laps: d.laps, ai: d.ai }, { id: d.id, host: false, ids: d.ids }, me.slot);
    } else if (d.t === 'rreq') {
      if (!g.room.isHost) return; const rc = GR.RACES.find((q) => q.id === d.rc); if (!rc) return;
      const who = g.remotes[from] ? g.remotes[from].name : 'A friend';
      UI.toast('🏁 ' + who + ' wants to race ' + rc.name + '!');
      N.inviteRace(rc, { diff: d.diff, laps: d.laps, ai: d.ai });
    } else if (d.t === 'ev') {
      if (d.e === 'horn' && g.remotes[d.id] && g.remotes[d.id].veh && g.me) { const rv = g.remotes[d.id].veh; if (Math.hypot(rv.x - g.me.x, rv.z - g.me.z) < 150) GR.Snd.fx(d.ty === 'icecream' ? 'jingle' : d.ty === 'police' ? 'siren' : 'horn'); }
    }
  }
  N.inviteRace = function (rc, o) {
    const g = G(), room = g.room; if (!room || !room.isHost) return;
    const ids = room.players().map((p, i) => ({ pid: p.pid, name: p.name, slot: i }));
    const id = 'r' + Date.now().toString(36);
    room.broadcast({ t: 'rinv', id, rc: rc.id, diff: o.diff, laps: o.laps, ai: o.ai, ids, host: g.myName() });
    const me = ids.find((q) => q.pid === room.pid);
    g.beginRace(rc, o, { id, host: true, ids }, me ? me.slot : 0);
  };
  N.requestRace = function (rc, o) { const g = G(); if (g.room) g.room.send({ t: 'rreq', rc: rc.id, diff: o.diff, laps: o.laps, ai: o.ai }); };
})();
