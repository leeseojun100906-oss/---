'use strict';

// Reduced stellar reaction network. Temperature gates and time scales are game
// approximations; these are net pathways, not simultaneous multi-body collisions.
const fusionPaths = [
  { reactants: ['H','H'], isotopes: [2,3], product: 'He', productA:4, neutrons:1, temp:1e8, q:17.6, label:'²H + ³H → ⁴He + n' },
  { reactants: ['H', 'H', 'H', 'H'], product: 'He', temp: 1.5e7, q: 26.73, label: '4 ¹H → ⁴He + 2e⁺ + 2νₑ' },
  { reactants: ['He', 'He', 'He'], product: 'C', temp: 1e8, q: 7.275, label: '3 ⁴He → ¹²C + γ' },
  { reactants: ['C', 'He'], product: 'O', temp: 2e8, q: 7.162, label: '¹²C + ⁴He → ¹⁶O + γ' },
  { reactants: ['O', 'He'], product: 'Ne', temp: 5e8, q: 4.73, label: '¹⁶O + ⁴He → ²⁰Ne + γ' },
  { reactants: ['Ne', 'He'], product: 'Mg', temp: 7e8, q: 9.32, label: '²⁰Ne + ⁴He → ²⁴Mg + γ' },
  { reactants: ['Mg', 'He'], product: 'Si', temp: 1e9, q: 9.98, label: '²⁴Mg + ⁴He → ²⁸Si + γ' },
  { reactants: ['Si', 'He'], product: 'S', temp: 1.5e9, q: 6.95, label: '²⁸Si + ⁴He → ³²S + γ' },
  { reactants: ['S', 'He'], product: 'Ar', temp: 1.8e9, q: 6.64, label: '³²S + ⁴He → ³⁶Ar + γ' },
  { reactants: ['Ar', 'He'], product: 'Ca', temp: 2e9, q: 7.04, label: '³⁶Ar + ⁴He → ⁴⁰Ca + γ' }
];
const isotopeMass = { H: 1, He: 4, C: 12, N: 14, O: 16, Ne: 20, Mg: 24, Si: 28, S: 32, Cl: 35, Ar: 36, Ca: 40 };
// Bond energies and dissociation gates are reduced per-molecule parameters.
const chemicalProperties = {
  H2: { dissociation: 4500, energy: 4.52 },
  O2: { dissociation: 5000, energy: 5.12 },
  N2: { dissociation: 9000, energy: 9.79 },
  H2O: { dissociation: 3500, energy: 9.5 },
  CO2: { dissociation: 4500, energy: 16.6 },
  CH4: { dissociation: 2000, energy: 17.0 },
  NH3: { dissociation: 1800, energy: 12.0 },
  HCl: { dissociation: 4000, energy: 4.43 },
  HBr: { dissociation: 3500, energy: 3.76 }
};
const chemicalReactions = [
  { inputs: ['H2', 'H2', 'O2'], outputs: ['H2O', 'H2O'], activation: 650, max: 3000, energy: 5.01, label: '2H₂ + O₂ → 2H₂O' },
  { inputs: ['CH4', 'O2', 'O2'], outputs: ['CO2', 'H2O', 'H2O'], activation: 800, max: 1900, energy: 8.32, label: 'CH₄ + 2O₂ → CO₂ + 2H₂O' }
];
let confinement = 1;
let nuclearEnergy = 0;
let chemicalEnergy = 0;
let flashes = [];
let reactionLabel = '반응 대기';
let densityPeak = 0;
let nuclearClock = 0;
let chemistryClock = 0;

function mass(a) {
  return a.A || defaultMass(a.s);
}

function bounds() {
  const scale = 1 / Math.sqrt(confinement);
  return { left: world.w * (1 - scale) / 2, top: world.h * (1 - scale) / 2,
    right: world.w * (1 + scale) / 2, bottom: world.h * (1 + scale) / 2 };
}

function spatialBins(items, size) {
  const bins = new Map();
  for (const a of items) {
    const key = Math.floor(a.x / size) + ',' + Math.floor(a.y / size);
    if (!bins.has(key)) bins.set(key, []);
    bins.get(key).push(a);
  }
  return bins;
}

function neighbors(a, bins, size) {
  const x = Math.floor(a.x / size), y = Math.floor(a.y / size);
  const nearby = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (const b of bins.get((x + dx) + ',' + (y + dy)) || []) nearby.push(b);
    }
  }
  return nearby;
}

function thermalSpeed(t, m) {
  // Logarithmic display scaling keeps stellar plasmas visible in a finite canvas.
  return 12 * Math.sqrt(Math.min(t, 3000) / 300 / m) * (1 + Math.max(0, Math.log10(t / 3000)) * .22);
}

function thermostat(a, target) {
  const previous = thermalSpeed(a.t || 300, mass(a));
  const ratio = thermalSpeed(target, mass(a)) / Math.max(.01, previous);
  a.vx *= ratio;
  a.vy *= ratio;
  a.t = Math.max(10, Math.min(3e9, target));
}

function collide(a, b) {
  let dx = b.x - a.x, dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  if (distance >= 4) return;
  const transfer = (b.t - a.t) * .05;
  a.t += transfer;
  b.t -= transfer;
  // Liquid water is a coarse solvent: its three displayed atoms must not
  // become three rigid walls for a solute or a gas bubble. Solvent drag and
  // momentum exchange handle these contacts. Ice and solids keep hard contacts.
  const liquidWater = a => a.material === 'H2O' && a.phase === 'liquid';
  const freeIon = a => (a.material === a.s && charge(a) !== 0) || isPolyatomicIon(a.material);
  if ((liquidWater(a) && freeIon(b)) || (liquidWater(b) && freeIon(a))) return;
  if ((liquidWater(a) && b.phase==='gas') || (liquidWater(b) && a.phase==='gas')) return;
  if (distance < .00001) { dx = 1; dy = 0; }
  const normalDistance = distance < .00001 ? 1 : distance;
  const nx = dx / normalDistance, ny = dy / normalDistance;
  const ma = mass(a), mb = mass(b), total = ma + mb;
  const correction = 4 - distance;
  a.x -= nx * correction * mb / total;
  a.y -= ny * correction * mb / total;
  b.x += nx * correction * ma / total;
  b.y += ny * correction * ma / total;
  const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (relative < 0) {
    const restitution = a.phase==='solid' && b.phase==='solid' ? .15 : 1;
    const impulse = -(1+restitution) * relative / (1 / ma + 1 / mb);
    a.vx -= impulse * nx / ma;
    a.vy -= impulse * ny / ma;
    b.vx += impulse * nx / mb;
    b.vy += impulse * ny / mb;
  }
}

function reactFusion() {
  const bins = spatialBins(atoms, 32);
  const consumed = new Set();
  const products = [];
  densityPeak = 0;
  let events = 0;
  for (const a of atoms) {
    if (consumed.has(a.id) || a.t < 1.5e7) continue;
    const near = neighbors(a, bins, 32).filter(b => !consumed.has(b.id) && Math.hypot(a.x - b.x, a.y - b.y) <= 32);
    densityPeak = Math.max(densityPeak, near.length);
    if (near.length < 4) continue;
    for (const path of fusionPaths) {
      if (path.reactants[0] !== a.s || a.t < path.temp || a.A !== (path.isotopes ? path.isotopes[0] : defaultMass(a.s))) continue;
      const group = [a];
      for (let i=1; i<path.reactants.length; i++) {
        const symbol=path.reactants[i];
        const requiredA=path.isotopes ? path.isotopes[i] : defaultMass(symbol);
        const b = near.find(b => b.s === symbol && b.A === requiredA && b.t >= path.temp && !group.includes(b));
        if (!b) break;
        group.push(b);
      }
      if (group.length !== path.reactants.length) continue;
      group.forEach(b => consumed.add(b.id));
      const totalMass = group.reduce((sum, b) => sum + mass(b), 0);
      const avg = field => group.reduce((sum, b) => sum + b[field] * mass(b), 0) / totalMass;
      const productZ=protonCount(path.product);
      const boundElectrons=group.reduce((sum,b)=>sum+b.electrons,0);
      const retained=Math.min(productZ,boundElectrons);
      freeElectrons+=boundElectrons-retained;
      positrons+=group.reduce((sum,b)=>sum+protonCount(b.s),0)-productZ;
      freeNeutrons+=path.neutrons||0;
      products.push({ A:path.productA||defaultMass(path.product), electrons:retained, s: path.product, x: avg('x'), y: avg('y'), vx: avg('vx'), vy: avg('vy'), t: Math.min(3e9, avg('t') * 1.04) });
      nuclearEnergy += path.q;
      reactionLabel = path.label;
      flashes.push({ x: a.x, y: a.y, life: 1, nuclear: true });
      events++;
      break;
    }
    if (events >= 16) break;
  }
  if (!products.length) return;
  unbond(consumed);
  atoms = atoms.filter(a => !consumed.has(a.id));
  for (const p of products) {
    const a = atom(p.s, p.x, p.y);
    Object.assign(a, p);
    discover(p.s);
  }
  record(reactionLabel + ' · 핵융합');
}

function moleculeTemperature(m, byId) {
  return m.ids.reduce((sum, id) => sum + byId.get(id).t, 0) / m.ids.length;
}

function chemicalHeat(group, energy) {
  chemicalEnergy += energy;
  // A qualitative heat feedback. Display energy is logged separately in eV.
  const change = energy * 18 / group.length;
  for (const a of group) thermostat(a, Math.max(10, a.t + change));
}

function exchangeMolecules(byId) {
  const used = new Set();
  const formed = [];
  const centers = molecules.map(m => ({ ...byId.get(m.ids[0]), molecule: m }));
  const bins = spatialBins(centers, 35);
  for (const center of centers) {
    const first = center.molecule;
    if (used.has(first)) continue;
    const nearby = neighbors(center, bins, 35).filter(b => Math.hypot(center.x - b.x, center.y - b.y) < 35);
    for (const reaction of chemicalReactions) {
      const t = moleculeTemperature(first, byId);
      if (first.type !== reaction.inputs[0] || t < reaction.activation || t > reaction.max) continue;
      const group = [first];
      for (const type of reaction.inputs.slice(1)) {
        const next = nearby.find(b => b.molecule.type === type && !used.has(b.molecule) && !group.includes(b.molecule));
        if (!next) break;
        group.push(next.molecule);
      }
      if (group.length !== reaction.inputs.length) continue;
      const pool = group.flatMap(m => m.ids.map(id => byId.get(id)));
      const available = [...pool];
      for (const type of reaction.outputs) {
        const recipe = recipes.find(r => r.id === type);
        const ids = recipe.atoms.map(symbol => {
          const index = available.findIndex(a => a.s === symbol);
          return available.splice(index, 1)[0].id;
        });
        formed.push({ type, ids });
        discover(type);
      }
      group.forEach(m => used.add(m));
      chemicalHeat(pool, reaction.energy);
      reactionLabel = reaction.label;
      flashes.push({ x: center.x, y: center.y, life: .5, nuclear: false });
      break;
    }
  }
  molecules = molecules.filter(m => !used.has(m)).concat(formed);
}

function chemistry() {
  const byId = new Map(atoms.map(a => [a.id, a]));
  molecules = molecules.filter(m => {
    if(acidBasePattern(m.type))return validAcidBase(m,byId) && moleculeTemperature(m,byId)<(baseData[m.type]?.gate||1800);
    if(saltData[m.type])return m.ids.every((id,i)=>charge(byId.get(id))===(i===0?saltData[m.type].q:-1)) && moleculeTemperature(m,byId)<saltData[m.type].melt;
    if(m.ids.some(id=>charge(byId.get(id))!==0))return false;
    const property = chemicalProperties[m.type];
    if (moleculeTemperature(m, byId) < property.dissociation) return true;
    chemicalHeat(m.ids.map(id => byId.get(id)), -property.energy);
    return false;
  });
  exchangeMolecules(byId);
  const bonded = new Set(molecules.flatMap(m => m.ids));
  const bins = spatialBins(atoms.filter(a => !bonded.has(a.id)), 20);
  for (const a of atoms) {
    if (bonded.has(a.id) || charge(a)!==0 || a.t > 9000) continue;
    const near = neighbors(a, bins, 20);
    for (const recipe of recipes) {
      if(recipe.ionic)continue;
      const property = chemicalProperties[recipe.id];
      if (recipe.atoms[0] !== a.s || a.t >= property.dissociation * .75) continue;
      const group = [a];
      for (const symbol of recipe.atoms.slice(1)) {
        const b = near.find(b => b.s === symbol && charge(b)===0 && b.t < property.dissociation * .75 && !bonded.has(b.id) && !group.includes(b) && Math.hypot(b.x - a.x, b.y - a.y) < 16);
        if (!b) break;
        group.push(b);
      }
      if (group.length !== recipe.atoms.length) continue;
      group.forEach(b => bonded.add(b.id));
      molecules.push({ type: recipe.id, ids: group.map(b => b.id) });
      chemicalHeat(group, property.energy);
      discover(recipe.id);
      break;
    }
  }
}

function step(dt) {
  const phaseAtoms=updatePhases();
  applyElectricForces(dt);
  aqueousMotion(dt);
  applyGravityAndBuoyancy(dt,phaseAtoms);
  const box = bounds();
  for (const a of atoms) {
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    if (a.x < box.left + 3 || a.x > box.right - 3) {
      a.x = Math.max(box.left + 3, Math.min(box.right - 3, a.x));
      a.vx = (a.x <= box.left + 3 ? 1 : -1) * Math.abs(a.vx);
    }
    if (a.y < box.top + 3 || a.y > box.bottom - 3) {
      a.y = Math.max(box.top + 3, Math.min(box.bottom - 3, a.y));
      a.vy = (a.y <= box.top + 3 ? 1 : -1) * Math.abs(a.vy);
    }
  }
  const bins = spatialBins(atoms, 8);
  for (const a of atoms) {
    for (const b of neighbors(a, bins, 8)) {
      if (a.id < b.id) collide(a, b);
    }
  }
  const byId = new Map(atoms.map(a => [a.id, a]));
  phaseForces(dt, byId);
  for (const molecule of molecules) {
    const root = byId.get(molecule.ids[0]);
    for (const id of molecule.ids.slice(1)) {
      const a = byId.get(id);
      const dx = a.x - root.x, dy = a.y - root.y, distance = Math.hypot(dx, dy) || 1;
      if(root.phase==='solid'&&a.phase==='solid'){const damping=1-Math.exp(-70*dt),total=mass(a)+mass(root),dvx=(a.vx-root.vx)*damping,dvy=(a.vy-root.vy)*damping;root.vx+=dvx*mass(a)/total;root.vy+=dvy*mass(a)/total;a.vx-=dvx*mass(root)/total;a.vy-=dvy*mass(root)/total;}
      const force = Math.max(-200,Math.min(200,(distance - 7) * 45)) * dt;
      if(distance>14){
        const correction=(distance-14)*.5;
        const total=mass(a)+mass(root);
        a.x-=dx/distance*correction*mass(root)/total;
        a.y-=dy/distance*correction*mass(root)/total;
        root.x+=dx/distance*correction*mass(a)/total;
        root.y+=dy/distance*correction*mass(a)/total;
      }
      a.vx -= force * dx / distance / mass(a);
      a.vy -= force * dy / distance / mass(a);
      root.vx += force * dx / distance / mass(root);
      root.vy += force * dy / distance / mass(root);
    }
  }
  nuclearClock += dt;
  chemistryClock += dt;
  if (chemistryClock >= .2) { chemistryClock = 0; ionicChemistry(); ionizationStep(); chemistry(); updatePhases(); }
  if (nuclearClock >= .5) { nuclearClock = 0; reactFusion(); }
  flashes = flashes.filter(f => (f.life -= dt) > 0);
}

function setConfinement(value) {
  const old = bounds();
  confinement = Math.max(1, Math.min(100, value));
  const next = bounds();
  const ratio = (next.right - next.left) / (old.right - old.left);
  for (const a of atoms) {
    a.x = world.w / 2 + (a.x - world.w / 2) * ratio;
    a.y = world.h / 2 + (a.y - world.h / 2) * ratio;
    thermostat(a, Math.min(3e9, a.t / (ratio * ratio)));
  }
  $('compressionValue').textContent = confinement.toFixed(0) + '×';
}

function physicsOverlay() {
  const box = bounds();
  ctx.strokeStyle = '#83a9be';
  ctx.lineWidth = 1 / zoom;
  ctx.setLineDash([6 / zoom, 6 / zoom]);
  ctx.strokeRect(box.left, box.top, box.right - box.left, box.bottom - box.top);
  ctx.setLineDash([]);
  for (const f of flashes) {
    ctx.strokeStyle = f.nuclear ? '#ffe5a2' : '#ff986d';
    ctx.globalAlpha = Math.min(1, f.life);
    ctx.beginPath();
    ctx.arc(f.x, f.y, 8 + (1 - f.life) * 25, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function updatePhysicsStats() {
  const average = atoms.length ? atoms.reduce((sum, a) => sum + a.t, 0) / atoms.length : temperature;
  $('averageTemp').textContent = average >= 1e6 ? (average / 1e6).toFixed(1) + ' MK' : Math.round(average).toLocaleString() + ' K';
  $('energy').textContent = nuclearEnergy.toFixed(2) + ' MeV';
  $('chemicalEnergy').textContent = chemicalEnergy.toFixed(2) + ' eV';
  $('reaction').textContent = reactionLabel;
  $('density').textContent = densityPeak + ' / 반경 32';
}
