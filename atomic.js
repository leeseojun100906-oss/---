'use strict';

let developerMode = false;
let freeElectrons = 0;
let positrons = 0;
let freeNeutrons = 0;
let physicsAccumulator = 0;
// Representative isotope for each element. The menu is a curated subset, not a nuclide chart.
const representativeMasses = [1,4,7,9,11,12,14,16,19,20,23,24,27,28,31,32,35,36,39,40,45,48,51,52,55,56,59,58,63,64,69,74,75,80,79,84,85,88,89,90,93,98,98,102,103,106,107,114,115,120,121,130,127,132,133,138,139,140,141,142,145,152,153,158,159,164,165,166,169,174,175,180,181,184,187,192,193,195,197,202,205,208,209,209,210,222,223,226,227,232,231,238,237,244,243,247,247,251,252,257,258,259,266,267,268,269,270,277,278,281,282,285,286,289,290,293,294,294];
const isotopeChoices = {
  H:[1,2,3], He:[3,4], Li:[6,7], B:[10,11], C:[12,13,14], N:[14,15], O:[16,17,18],
  Ne:[20,21,22], Mg:[24,25,26], Si:[28,29,30], S:[32,33,34,36], Cl:[35,37],
  Ar:[36,38,40], K:[39,40,41], Ca:[40,42,43,44,46,48], Fe:[54,56,57,58], Cu:[63,65],
  U:[234,235,238], Th:[230,232]
};
const firstIonization = {H:13.60,He:24.59,Li:5.39,C:11.26,N:14.53,O:13.62,Na:5.14,Cl:12.97};
function protonCount(symbol) { return symbols.indexOf(symbol) + 1; }
function defaultMass(symbol) { return representativeMasses[protonCount(symbol) - 1]; }
function allowedIsotopes(symbol) { return isotopeChoices[symbol] || [defaultMass(symbol)]; }
function charge(a) { return protonCount(a.s) - a.electrons; }
function atomicLabel(a) {
  const q = charge(a);
  return a.s + '-' + a.A + (q ? ' (' + Math.abs(q) + (q > 0 ? '+' : '−') + ')' : '') + (a.aqueous && q ? ' (aq)' : '');
}
function normalizeAtom(a) {
  if (!allowedIsotopes(a.s).includes(a.A)) a.A = defaultMass(a.s);
  const z = protonCount(a.s);
  a.electrons = Number.isInteger(a.electrons) ? Math.max(0, Math.min(z + 3, a.electrons)) : z;
}
function updateAtomicControls() {
  reactiveMetalHint();
  const isElement = symbols.includes(selected);
  const menu = $('isotope');
  menu.replaceChildren();
  for (const A of isElement ? allowedIsotopes(selected) : []) {
    const option = document.createElement('option');
    option.value = A;
    option.textContent = selected + '-' + A + (selected === 'H' && A === 2 ? ' · 중수소' : selected === 'H' && A === 3 ? ' · 삼중수소' : '');
    menu.append(option);
  }
  if (isElement) menu.value = defaultMass(selected);
  menu.disabled = !isElement;
  $('spawnCharge').disabled = !isElement;
  $('spawnCharge').max = isElement ? protonCount(selected) : 0;
  $('spawnCharge').value = 0;
  $('atomicSelection').textContent = isElement ? '양성자 ' + protonCount(selected) + ' · 중성자 ' + (defaultMass(selected) - protonCount(selected)) : ((saltData[selected]||baseData[selected])?'이온결정은 양·음이온을 전하 중성 비율로 소환':selected==='OH-'?'O-H 결합과 총 전하 −1로 소환':selected==='H3O+'?'O 1개·H 3개 결합과 총 전하 +1로 소환':'분자는 기본 동위원소·중성 상태로 소환');
}
function setDeveloperMode(enabled) {
  developerMode = enabled;
  $('developerMode').checked = enabled;
  $('developerPanel').hidden = !enabled;
  if (!enabled && !known.has(selected) && !discovered.has(selected)) {
    selected = 'H';
    $('selection').textContent = 'H · 수소 배치';
  }
  catalog();
  updateAtomicControls();
}
function spawnedAtomicState(a) {
  if (!developerMode || !symbols.includes(selected)) return;
  const requested = Number($('isotope').value);
  if (allowedIsotopes(a.s).includes(requested)) a.A = requested;
  const z = protonCount(a.s);
  const q = Math.max(-3, Math.min(z, Math.trunc(Number($('spawnCharge').value) || 0)));
  a.electrons = z - q;
  const speed = thermalSpeed(a.t, a.A);
  const angle = Math.atan2(a.vy, a.vx);
  a.vx = Math.cos(angle) * speed;
  a.vy = Math.sin(angle) * speed;
}
function transferElectron(a, remove) {
  if (remove && a.electrons > 0) {
    a.electrons--;
    freeElectrons++;
  } else if (!remove && freeElectrons > 0 && a.electrons < protonCount(a.s) + 3) {
    a.electrons++;
    freeElectrons--;
  } else return false;
  unbond(new Set([a.id]));
  return true;
}
function ionizationStep() {
  const protectedIons=new Set(molecules.filter(m=>saltData[m.type]||acidBasePattern(m.type)).flatMap(m=>m.ids));
  for (const a of atoms) {
    const q = charge(a);
    // Reduced threshold model. Higher ionization stages use an approximate scaling.
    const threshold = (firstIonization[a.s] || 10) * Math.pow(Math.max(1, q + 1), 2) * 5000;
    if (a.t > threshold && a.electrons > 0) transferElectron(a, true);
    else if (a.t < 5000 && !a.aqueous && !protectedIons.has(a.id) && q > 0 && freeElectrons > 0) transferElectron(a, false);
  }
  const annihilations = Math.min(freeElectrons, positrons);
  freeElectrons -= annihilations;
  positrons -= annihilations;
}
function applyElectricForces(dt) {
  const ions = atoms.filter(a => charge(a) !== 0);
  const bins = spatialBins(ions, 60);
  for (const a of ions) {
    for (const b of neighbors(a, bins, 60)) {
      if (a.id >= b.id) continue;
      const dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy);
      if (distance < .001 || distance > 60) continue;
      const force = 180 * charge(a) * charge(b) * (1 - distance / 60) / (distance * distance + 36);
      const impulse = Math.max(-80, Math.min(80, force)) * dt;
      a.vx -= impulse * dx / distance / mass(a);
      a.vy -= impulse * dy / distance / mass(a);
      b.vx += impulse * dx / distance / mass(b);
      b.vy += impulse * dy / distance / mass(b);
    }
  }
}
function waterState(m, byId) {
  const t = moleculeTemperature(m, byId);
  return t < 273.15 ? 'solid' : t < 373.15 ? 'liquid' : 'gas';
}
function atomicStats() {
  const bound = atoms.reduce((sum,a)=>sum+a.electrons,0);
  const totalCharge = atoms.reduce((sum,a)=>sum+charge(a),0) - freeElectrons + positrons;
  $('electronStats').textContent = '결합 전자 ' + bound + ' · 자유 전자 ' + freeElectrons + ' · 양전자 ' + positrons + ' · 중성자 ' + freeNeutrons;
  $('chargeStats').textContent = '계의 순전하 ' + totalCharge + ' e · 이온 ' + atoms.filter(a=>charge(a)!==0).length + '개';
  $('solutionStats').textContent='수용액 이온 '+atoms.filter(a=>a.aqueous&&charge(a)!==0).length+'개 · 수화 결속 · 물속 확산';
  phaseStats();
  acidBaseStats();
  gasStats();
}
