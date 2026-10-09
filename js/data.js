/* Grok Rides - vehicles, places, races, jobs */
(function () {
  'use strict';
  const GR = window.GR, W = GR.W;
  // kind: ground | boat | heli | plane | balloon.  off = off-road skill, snow = snow/ice skill
  GR.VEH = {
    compact: { name: 'Grok Pop', icon: '🚗', kind: 'ground', price: 0, vmax: 40, acc: 15, grip: 1.0, turn: 1.9, off: 0.35, snow: 0.3, mass: 1, tough: 1, r: 1.9, desc: 'Your trusty little starter car.' },
    taxi: { name: 'Grok Cab', icon: '🚕', kind: 'ground', price: 2500, vmax: 43, acc: 16, grip: 1.0, turn: 1.85, off: 0.35, snow: 0.3, mass: 1.1, tough: 1, r: 2.1, tags: ['taxi'], color: '#ffc61a', desc: 'Taxi fares pay 50% more!' },
    icecream: { name: 'Ice Cream Truck', icon: '🍦', kind: 'ground', price: 4000, vmax: 38, acc: 12, grip: 0.95, turn: 1.6, off: 0.4, snow: 0.3, mass: 1.6, tough: 0.9, r: 2.4, color: '#ffffff', desc: 'Plays a jingle when you honk. Pizza deliveries pay extra.', tags: ['treat'] },
    snowmobile: { name: 'Snow Zoom', icon: '🛷', kind: 'ground', price: 4500, vmax: 44, acc: 18, grip: 0.95, turn: 2.1, off: 0.75, snow: 1, mass: 0.6, tough: 1, r: 1.5, color: '#3ff0ff', desc: 'King of snow and ice. Grippy on the frozen lake!' },
    tow: { name: 'Hook & Haul', icon: '🛻', kind: 'ground', price: 5000, vmax: 42, acc: 14, grip: 0.98, turn: 1.7, off: 0.6, snow: 0.5, mass: 1.6, tough: 0.8, r: 2.5, tags: ['tow'], color: '#ff7a3d', desc: 'A real tow truck. Unlocks Tow Jobs.' },
    boat: { name: 'Splash Speedboat', icon: '🚤', kind: 'boat', price: 5000, vmax: 38, acc: 14, grip: 0.7, turn: 1.6, off: 0, snow: 0, mass: 1, tough: 1, r: 2.4, color: '#38bdf8', desc: 'Zoom around Sparkle Lake.' },
    buggy: { name: 'Dune Buggy', icon: '🏜️', kind: 'ground', price: 5500, vmax: 50, acc: 21, grip: 1.0, turn: 2.1, off: 1, snow: 0.5, mass: 0.8, tough: 1.1, r: 1.8, color: '#ffe14d', desc: 'Flies over sand dunes like they are roads.' },
    pickup: { name: 'Trail Boss 4x4', icon: '🛻', kind: 'ground', price: 6000, vmax: 46, acc: 17, grip: 0.98, turn: 1.75, off: 0.9, snow: 0.65, mass: 1.5, tough: 0.8, r: 2.5, tags: ['tow', 'cargo'], color: '#4ade80', desc: 'Off-road truck. Does Tow Jobs and small Cargo Hauls.' },
    heli_: null,
    balloon: { name: 'Hot Air Balloon', icon: '🎈', kind: 'balloon', price: 7000, vmax: 12, acc: 3, grip: 1, turn: 0.7, off: 1, snow: 1, mass: 1, tough: 1.4, r: 3, tags: ['tour'], desc: 'Float gently over the whole world. Does Sky Tours.' },
    bus: { name: 'City Bus', icon: '🚌', kind: 'ground', price: 8000, vmax: 34, acc: 10, grip: 0.95, turn: 1.45, off: 0.4, snow: 0.35, mass: 3, tough: 0.6, r: 3.0, tags: ['bus'], color: '#ffc61a', desc: 'Unlocks Bus Routes.' },
    sports: { name: 'Zoomer GT', icon: '🏎️', kind: 'ground', price: 8000, vmax: 56, acc: 23, grip: 1.08, turn: 2.0, off: 0.25, snow: 0.25, mass: 1, tough: 1.1, r: 2.1, color: '#ff3b3b', desc: 'Quick, grippy and fun.' },
    police: { name: 'Cruiser', icon: '🚓', kind: 'ground', price: 9000, vmax: 57, acc: 22, grip: 1.05, turn: 1.95, off: 0.4, snow: 0.35, mass: 1.2, tough: 0.8, r: 2.2, color: '#14213d', desc: 'Light bar flashes when you honk (just for fun!).' },
    muscle: { name: 'Thunder V8', icon: '🚘', kind: 'ground', price: 9500, vmax: 59, acc: 26, grip: 0.9, turn: 1.85, off: 0.3, snow: 0.25, mass: 1.3, tough: 0.9, r: 2.3, color: '#7c3aed', desc: 'Huge power, loves to drift.' },
    limo: { name: 'Stretch Limo', icon: '🤵', kind: 'ground', price: 10000, vmax: 46, acc: 15, grip: 0.98, turn: 1.55, off: 0.3, snow: 0.25, mass: 1.8, tough: 0.9, r: 3.0, tags: ['limo'], color: '#111111', desc: 'Unlocks Limo VIP gigs.' },
    bigrig: { name: 'Big Grok Rig', icon: '🚛', kind: 'ground', price: 12000, vmax: 39, acc: 10, grip: 0.95, turn: 1.35, off: 0.45, snow: 0.4, mass: 4, tough: 0.5, r: 3.0, tags: ['cargo'], color: '#e11d48', desc: 'Biggest Cargo Hauls pay the most.' },
    heli: { name: 'Grokopter', icon: '🚁', kind: 'heli', price: 14000, vmax: 34, acc: 10, grip: 1, turn: 1.4, off: 1, snow: 1, mass: 1, tough: 1, r: 3.4, tags: ['tour'], color: '#ff4fd8', desc: 'Hover anywhere. Does Sky Tours.' },
    monster: { name: 'Monster Truck', icon: '🦖', kind: 'ground', price: 15000, vmax: 50, acc: 20, grip: 1.0, turn: 1.75, off: 1, snow: 0.85, mass: 2, tough: 1.6, r: 2.8, tags: ['tow'], color: '#22c55e', desc: 'Giant wheels, super tough, goes anywhere.' },
    plane: { name: 'Stunt Plane', icon: '✈️', kind: 'plane', price: 18000, vmax: 62, acc: 12, grip: 1, turn: 1.1, off: 0.6, snow: 0.6, mass: 1, tough: 1, r: 3.5, tags: ['tour'], color: '#ffffff', desc: 'Take off from any long road. Fastest way around!' },
    super: { name: 'Grokzilla R', icon: '🏁', kind: 'ground', price: 22000, vmax: 72, acc: 32, grip: 1.15, turn: 2.05, off: 0.2, snow: 0.2, mass: 1, tough: 1.1, r: 2.2, color: '#ffd23f', desc: 'The fastest car in the world.' }
  };
  delete GR.VEH.heli_;
  for (const k in GR.VEH) GR.VEH[k].id = k;
  GR.VEH_ORDER = Object.keys(GR.VEH).sort((a, b) => GR.VEH[a].price - GR.VEH[b].price);
  GR.isAir = (k) => { const v = GR.VEH[k]; return v && (v.kind === 'heli' || v.kind === 'plane' || v.kind === 'balloon'); };
  GR.PAINTS = ['#ff4fd8', '#ff3b3b', '#ff7a3d', '#ffd23f', '#4ade80', '#22c55e', '#3ff0ff', '#38bdf8', '#2563eb', '#7c3aed', '#ffffff', '#9ca3af', '#111111', '#a16207', '#f9a8d4', '#14b8a6'];
  GR.UPG = {
    engine: { name: 'Engine', icon: '⚙️', max: 3, cost: [900, 1800, 3600], desc: '+6% top speed, +10% acceleration per level' },
    grip: { name: 'Tires', icon: '🛞', max: 3, cost: [700, 1400, 2800], desc: '+6% grip per level' },
    armor: { name: 'Armor', icon: '🛡️', max: 3, cost: [600, 1200, 2400], desc: '-20% crash damage per level' },
    nitro: { name: 'Nitro', icon: '🔥', max: 1, cost: [1500], desc: 'Adds a NITRO boost button' }
  };

  // ---- places (drive into the glowing circles) ----
  const S = GR.SPOTS = [];
  function spot(id, type, x, z, name, icon, extra) { const o = Object.assign({ id, type, x, z, name, icon }, extra || {}); S.push(o); W.pads.push({ x, z, r: 14 }); return o; }
  spot('g_city', 'garage', 500, -150, 'Grok City Garage', '🔧');
  spot('g_town', 'garage', -600, 300, 'Pine Hollow Garage', '🔧');
  spot('g_desert', 'garage', -250, 990, 'Cactus Gas & Garage', '🔧');
  spot('g_tundra', 'garage', 350, -965, 'Frostbite Outpost Garage', '🔧');
  spot('g_mtn', 'garage', -400, -520, 'Mountain Base Garage', '🔧');
  spot('g_air', 'garage', 1100, 640, 'Sky Field Hangar Garage', '🔧');
  spot('g_marina', 'garage', -330, 150, 'Marina Garage', '🔧');
  spot('dealer', 'dealer', 800, -350, 'Grok Motors Dealership', '🚗');
  spot('hangar', 'dealer', 1100, 450, 'Sky Field Aircraft Sales', '🛩️', { air: true });
  spot('marina', 'dealer', -300, 110, 'Sparkle Marina (boats)', '⚓', { boat: true, spawn: { x: -225, z: 110 } });
  // jobs
  spot('j_taxi', 'job', 700, -150, 'Taxi Stand', '🚕', { job: 'taxi' });
  spot('j_pizza', 'job', -500, 500, 'Pine Hollow Pizza', '🍕', { job: 'pizza' });
  spot('j_cargo', 'job', 230, 1110, 'Desert Cargo Depot', '📦', { job: 'cargo' });
  spot('j_limo', 'job', 600, 150, 'Grand Grok Hotel (Limo VIPs)', '🤵', { job: 'limo' });
  spot('j_tow', 'job', -300, 600, 'Pine Hollow Tow Yard', '🪝', { job: 'tow' });
  spot('j_tour', 'job', 400, 250, 'City Helipad (Sky Tours)', '🚁', { job: 'tour' });
  spot('j_tour2', 'job', 1100, 540, 'Sky Field Tours', '🎈', { job: 'tour' });
  spot('j_bus', 'job', 400, -350, 'Bus Depot', '🚌', { job: 'bus' });
  spot('j_snow', 'job', 760, -985, 'Tundra Supply Run', '❄️', { job: 'cargo' });

  // destinations for jobs
  GR.PLACES = [
    { n: 'Grok City Hall', x: 650, z: -300 }, { n: 'Downtown Mall', x: 850, z: 0 }, { n: 'City Park', x: 650, z: 100 }, { n: 'Grok Tower', x: 550, z: -200 }, { n: 'Stadium', x: 900, z: 200 },
    { n: 'Pine Hollow School', x: -550, z: 400 }, { n: 'Pine Hollow Library', x: -350, z: 500 }, { n: 'Maple Diner', x: -650, z: 550 }, { n: 'Town Square', x: -450, z: 450 },
    { n: 'Sparkle Lake Beach', x: 100, z: 330 }, { n: 'Sky Field', x: 1050, z: 550 }, { n: 'Frostbite Outpost', x: 350, z: -985 }, { n: 'Ice Fishing Hut', x: 600, z: -985 },
    { n: 'Mountain Base Lodge', x: -421, z: -470 }, { n: 'Cactus Gas', x: -300, z: 1050 }, { n: 'Desert Dino Museum', x: 700, z: 1100 }, { n: 'North Woods Cabin', x: -100, z: -950 }
  ];

  // ---- races ----
  GR.RACES = [
    { id: 'city', name: 'Grok City Circuit', icon: '🏙️', type: 'circuit', laps: 2, ai: 5, corners: [[450, -300], [850, -300], [850, 200], [450, 200]], r: 16, pay: 600, desc: 'Around the skyscrapers. 90-degree corners!' },
    { id: 'downtown', name: 'Downtown Dash', icon: '🚦', type: 'sprint', ai: 5, corners: [[350, 200], [550, 200], [550, 0], [750, 0], [750, -200], [850, -200], [850, -400]], r: 14, pay: 500, desc: 'Zig-zag sprint through the city streets.' },
    { id: 'town', name: 'Pine Hollow Loop', icon: '🏡', type: 'circuit', laps: 2, ai: 5, corners: [[-650, 250], [-250, 250], [-250, 450], [-450, 450], [-450, 650], [-650, 650]], r: 16, pay: 550, desc: 'A twisty little loop around town.' },
    { id: 'dunes', name: 'Sizzle Dune Rally', icon: '🏜️', type: 'circuit', laps: 2, ai: 5, corners: [[-150, 870], [250, 860], [360, 1020], [700, 1010], [750, 1200], [450, 1240], [150, 1220], [-200, 1200], [-360, 1060]], r: 45, pay: 800, offroad: true, desc: 'Off-road through the sand. Buggies and trucks rule here!' },
    { id: 'canyon', name: 'Canyon Highway', icon: '🛣️', type: 'sprint', ai: 5, corners: [[-460, 690], [-500, 820], [-300, 1050], [200, 1150], [700, 1100], [1050, 900], [1050, 650]], r: 70, pay: 750, desc: 'Flat-out highway sprint across the desert.' },
    { id: 'ice', name: 'Frostbite Ice Ring', icon: '🧊', type: 'circuit', laps: 3, ai: 5, ellipse: [600, -1150, 128, 82], pay: 700, desc: 'Slip and slide on the frozen lake!' },
    { id: 'hill', name: 'Grokmore Hill Climb', icon: '⛰️', type: 'sprint', ai: 5, road: 'Grokmore Pass', pay: 900, desc: 'Switchbacks all the way to the peak.' },
    { id: 'grand', name: 'The Grand Tour', icon: '🗺️', type: 'sprint', ai: 5, corners: [[950, -150], [950, -400], [1000, -700], [800, -950], [350, -1000], [-100, -950], [-450, -800], [-420, -350], [-350, 0], [-450, 250], [-450, 450]], r: 70, pay: 1500, desc: 'City to tundra to the mountain and down to town. Long!' },
    { id: 'lake', name: 'Sparkle Lake Splash', icon: '🚤', type: 'circuit', laps: 2, ai: 3, ellipse: [-50, 100, 150, 100], pay: 600, vehicle: 'boat', desc: 'Boat race! A free race boat is loaned to you.' },
    { id: 'sky', name: 'Sky Rings Challenge', icon: '🛩️', type: 'air', ai: 0, pts3: [[1100, 380, 25], [950, 200, 60], [800, -50, 90], [620, -200, 120], [300, -150, 80], [20, 100, 40], [-300, -150, 100], [-620, -480, 230], [-850, -600, 290], [-500, -150, 150], [-150, 380, 60], [300, 260, 35]], pay: 900, vehicle: 'heli', desc: 'Fly through the rings against the clock. A free Grokopter is loaned if you need one.' }
  ];
  GR.DIFF = { easy: { name: 'EASY', pace: 0.84, corner: 0.82, pay: 0.7 }, normal: { name: 'NORMAL', pace: 0.94, corner: 0.93, pay: 1 }, hard: { name: 'HARD', pace: 1.0, corner: 1.0, pay: 1.5 } };

  GR.JOBS = {
    taxi: { name: 'Taxi Fares', icon: '🚕', need: 'ground', desc: 'Pick up riders and drive them where they want to go. Any car works; a Grok Cab pays 50% more.' },
    pizza: { name: 'Pizza Delivery', icon: '🍕', need: 'ground', desc: 'Deliver 3 hot pizzas around Pine Hollow before they get cold!' },
    cargo: { name: 'Cargo Haul', icon: '📦', need: 'cargo', desc: 'Haul cargo across the world. Needs a Big Rig or Trail Boss 4x4. Crashing damages the cargo!' },
    limo: { name: 'Limo VIP', icon: '🤵', need: 'limo', desc: 'Drive a famous VIP smoothly. Bumps make them grumpy! Needs a Stretch Limo.' },
    tow: { name: 'Tow Jobs', icon: '🪝', need: 'tow', desc: 'Rescue broken-down cars and tow them to a garage. Needs a tow truck, 4x4 or Monster Truck.' },
    tour: { name: 'Sky Tours', icon: '🚁', need: 'tour', desc: 'Fly tourists past the sights, then land back at the pad. Needs a helicopter, balloon or plane.' },
    bus: { name: 'Bus Route', icon: '🚌', need: 'bus', desc: 'Stop at every bus stop on the route. Needs a City Bus.' }
  };
})();
