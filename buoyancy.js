'use strict';

// Coarse gas-parcel model. A rendered molecule keeps all its atoms, while its
// ideal-gas density is compared with an implicit ambient air bath at 1 atm.
// Isotope mass numbers approximate molar masses; this is not molecular CFD.
const atmosphere={pressure:101325,temperature:300,molarMass:28.97,R:8.314462618,gravity:30,airDrag:.65,waterDrag:2.5,waterDensity:997,waterRadius:18};
let ambientMedium='air';

function idealGasDensity(molarMass,temperature,pressure=atmosphere.pressure){
 return pressure*(molarMass/1000)/(atmosphere.R*Math.max(10,temperature));
}
function ambientAirDensity(){return idealGasDensity(atmosphere.molarMass,atmosphere.temperature);}
function groupGasDensity(group){
 const molarMass=group.reduce((s,a)=>s+mass(a),0);
 const temperature=group.reduce((s,a)=>s+a.t,0)/group.length;
 return idealGasDensity(molarMass,temperature);
}
function gasGroups(byId){
 const groups=[],bonded=new Set();
 for(const m of molecules){
  m.ids.forEach(id=>bonded.add(id));
  if(byId.get(m.ids[0])?.phase==='gas')groups.push(m.ids.map(id=>byId.get(id)));
 }
 for(const a of atoms)if(a.phase==='gas'&&!bonded.has(a.id))groups.push([a]);
 return groups;
}
function applyGravityAndBuoyancy(dt,byId){
 if(!$('gravity').checked)return;
 const g=atmosphere.gravity;
 for(const a of atoms)a.vy+=g*dt;
 const groups=gasGroups(byId);if(!groups.length)return;
 const water=molecules.filter(m=>liquidSolvent(m,byId)).map(m=>({...byId.get(m.ids[0]),members:m.ids.map(id=>byId.get(id))}));
 const bins=spatialBins(water,atmosphere.waterRadius);
 for(const group of groups){
  const gasMass=group.reduce((s,a)=>s+mass(a),0);
  const mean=key=>group.reduce((s,a)=>s+mass(a)*a[key],0)/gasMass;
  const center={x:mean('x'),y:mean('y')};
  const nearby=neighbors(center,bins,atmosphere.waterRadius).filter(w=>Math.hypot(center.x-w.x,center.y-w.y)<atmosphere.waterRadius);
  const bath=nearby.flatMap(w=>w.members),bathMass=bath.reduce((s,a)=>s+mass(a),0);
  const density=groupGasDensity(group);
  const surroundingDensity=bath.length?atmosphere.waterDensity:ambientMedium==='air'?ambientAirDensity():0;
  // Vacuum has gravity but no ambient buoyancy or drag.
  if(!surroundingDensity)continue;
  const flowX=bath.length?bath.reduce((s,a)=>s+mass(a)*a.vx,0)/bathMass:0;
  const flowY=bath.length?bath.reduce((s,a)=>s+mass(a)*a.vy,0)/bathMass:0;
  // The density contrast is softened with displaced-fluid inertia to keep the
  // display acceleration bounded. It retains the correct sign and temperature
  // dependence, rather than multiplying gravity by atom mass.
  const acceleration=g*(density-surroundingDensity)/(density+surroundingDensity);
  const buoyancy=(acceleration-g)*dt;
  const drag=1-Math.exp(-dt*(bath.length?atmosphere.waterDrag:atmosphere.airDrag));
  const share=bath.length?bathMass/(bathMass+gasMass):1;
  const dvx=(flowX-mean('vx'))*drag*share;
  const dvy=buoyancy+(flowY-(mean('vy')+buoyancy))*drag*share;
  // Give every atom the same acceleration, preserving internal bond motion.
  for(const a of group){a.vx+=dvx;a.vy+=dvy;}
  // Explicit liquid receives the opposite impulse. Ambient air is an external
  // reservoir; its mass and momentum are not simulated as extra atoms.
  for(const a of bath){a.vx-=dvx*gasMass/bathMass;a.vy-=dvy*gasMass/bathMass;}
 }
}
function gasInspection(a,m){
 if(a.phase!=='gas')return '';
 const byId=new Map(atoms.map(a=>[a.id,a]));
 const group=m?m.ids.map(id=>byId.get(id)):[a];
 const density=groupGasDensity(group),relative=density/ambientAirDensity();
 return ' / 기체 밀도 '+density.toFixed(3)+' kg/m³ (1기압 환산) / 300 K 공기의 '+relative.toFixed(2)+'배';
}
function gasStats(){
 $('gasStats').textContent=ambientMedium==='air'?'배경 공기 · 300 K · 1기압 · '+ambientAirDensity().toFixed(3)+' kg/m³':'배경 진공 · 공기 부력 없음';
}
function setAmbientMedium(value){
 ambientMedium=value==='vacuum'?'vacuum':'air';
 $('ambientMedium').value=ambientMedium;gasStats();
}
