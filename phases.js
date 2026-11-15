'use strict';

// Approximate normal-pressure transition temperatures, kelvin.
// Helium has no solid phase at normal pressure. Carbon/CO2 sublime here.
const phaseData = {
  H2:[13.99,20.27], He:[0,4.22], Li:[453.65,1603], Be:[1560,2742], B:[2349,4200],
  C:{sublimation:3915}, N2:[63.15,77.36], O2:[54.36,90.19], Ne:[24.56,27.10],
  Na:[370.94,1156], Mg:[923,1363], Al:[933.47,2792], Si:[1687,3538],
  S:[388.36,717.8], Ar:[83.81,87.30], K:[336.53,1032], Ca:[1115,1757],
  Rb:[312.45,961], Cs:[301.7,944], Sr:[1050,1650], Ba:[1000,2118],
  Fr:[300,923], // Estimated: no macroscopic stable sample exists.
  Ti:[1941,3560], Cr:[2180,2944], Mn:[1519,2334], Fe:[1811,3134], Co:[1768,3200],
  Ni:[1728,3186], Cu:[1357.77,2835], Zn:[692.68,1180], Ag:[1234.93,2435],
  Sn:[505.08,2875], W:[3695,5828], Pt:[2041.4,4098], Au:[1337.33,3129],
  Hg:[234.32,629.88], Pb:[600.61,2022], U:[1405.3,4404],
  H2O:[273.15,373.15], CO2:{sublimation:194.65}, CH4:[90.69,111.66],
  NH3:[195.4,239.8], HCl:[159,188.1], HBr:[186.3,206.4]
};
const phaseNames = {solid:'고체',liquid:'액체',gas:'기체',plasma:'자유 이온',unknown:'자료 없음'};
const phaseColors = {solid:'#b9cddd',liquid:'#51baff',gas:'#c5df97',plasma:'#e8a1ff',unknown:'#78888a'};
let solidLinks = new Map();
let phaseView = false;

function classifyPhase(material, t) {
  if(isPolyatomicIon(material))return 'plasma';
  // Free neutral atoms of these normally molecular gases are treated as gas
  // until a molecule forms; their molecular recipes have their own phase data.
  if(['H','N','O','F','Cl'].includes(material))return 'gas';
  if(baseData[material])return baseData[material].gate&&t<baseData[material].gate?'solid':'unknown';
  if(saltData[material])return t<saltData[material].melt?'solid':'unknown';
  const data = phaseData[material];
  if (!data) return 'unknown';
  if (data.sublimation) return t < data.sublimation ? 'solid' : 'gas';
  if (t < data[0]) return 'solid';
  return t < data[1] ? 'liquid' : 'gas';
}

function updatePhases() {
  const byId = new Map(atoms.map(a=>[a.id,a]));
  for (const a of atoms) {
    a.material = a.s;
    a.phase = charge(a) !== 0 ? 'plasma' : classifyPhase(a.s,a.t);
    a.unit = a.id;
  }
  for (const m of molecules) {
    const phase = classifyPhase(m.type,moleculeTemperature(m,byId));
    for (const id of m.ids) {
      const a = byId.get(id);
      if(!a)continue;
      a.material = m.type;
      a.phase = phase;
      a.unit = m.ids[0];
    }
  }
  return byId;
}

function phaseForces(dt, byId) {
  const condensed = atoms.filter(a=>a.phase==='solid'||a.phase==='liquid');
  const bins = spatialBins(condensed,20);
  const degrees = new Map();
  // Links retain their rest length until melting, ionization, reaction or deletion.
  for (const [key,link] of solidLinks) {
    const a=byId.get(link.a), b=byId.get(link.b);
    if (!a || !b || a.phase!=='solid' || b.phase!=='solid' || a.material!==link.material || b.material!==link.material) {
      solidLinks.delete(key);
      continue;
    }
    degrees.set(a.id,(degrees.get(a.id)||0)+1);
    degrees.set(b.id,(degrees.get(b.id)||0)+1);
  }
  for (const a of condensed) {
    for (const b of neighbors(a,bins,20)) {
      if (a.id>=b.id || a.material!==b.material || a.unit===b.unit) continue;
      const dx=b.x-a.x, dy=b.y-a.y, distance=Math.hypot(dx,dy);
      const radius=a.material===a.s?9:20;
      if (distance<.01 || distance>radius) continue;
      if (a.phase==='solid' && b.phase==='solid') {
        const key=a.id+':'+b.id;
        if (!solidLinks.has(key) && (degrees.get(a.id)||0)<6 && (degrees.get(b.id)||0)<6) {
          solidLinks.set(key,{a:a.id,b:b.id,rest:Math.max(4.2,distance),material:a.material});
          degrees.set(a.id,(degrees.get(a.id)||0)+1);
          degrees.set(b.id,(degrees.get(b.id)||0)+1);
        }
      } else if (a.phase==='liquid' && b.phase==='liquid') {
        const target=a.material===a.s?5:9;
        const force=2*(distance-target)*(1-distance/radius);
        const relative=((b.vx-a.vx)*dx+(b.vy-a.vy)*dy)/distance;
        const impulse=(force+relative*2)*dt;
        a.vx+=impulse*dx/distance/mass(a); a.vy+=impulse*dy/distance/mass(a);
        b.vx-=impulse*dx/distance/mass(b); b.vy-=impulse*dy/distance/mass(b);
      }
    }
  }
  // Equal-and-opposite damping suppresses internal jitter while allowing the
  // whole body to translate and fall. No velocity is pinned to the screen.
  const damping=1-Math.exp(-70*dt);
  for (const link of solidLinks.values()) {
    const a=byId.get(link.a),b=byId.get(link.b);
    const ma=mass(a),mb=mass(b),total=ma+mb;
    const dx=b.x-a.x,dy=b.y-a.y,distance=Math.hypot(dx,dy)||1;
    const correction=(distance-link.rest)*.35;
    a.x+=dx/distance*correction*mb/total; a.y+=dy/distance*correction*mb/total;
    b.x-=dx/distance*correction*ma/total; b.y-=dy/distance*correction*ma/total;
    const dvx=(b.vx-a.vx)*damping,dvy=(b.vy-a.vy)*damping;
    a.vx+=dvx*mb/total;a.vy+=dvy*mb/total;
    b.vx-=dvx*ma/total;b.vy-=dvy*ma/total;
  }
}

function phaseStats() {
  const counts={solid:0,liquid:0,gas:0,plasma:0,unknown:0};
  for(const a of atoms) counts[a.phase||'unknown']++;
  $('phaseStats').textContent=Object.entries(counts).map(([key,n])=>phaseNames[key]+' '+n).join(' · ')+' (원자 수)';
  $('solidStats').textContent='고체 결합 '+solidLinks.size+' · 1기압 기준 근사';
}
function setPhaseView(enabled) {
  phaseView=enabled;
  if(enabled)setThermalView(false);
  $('phaseView').classList.toggle('active',enabled);
  $('phaseView').setAttribute('aria-pressed',String(enabled));
  $('phaseLegend').hidden=!enabled;
}
