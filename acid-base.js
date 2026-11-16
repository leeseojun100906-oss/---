'use strict';
// Explicit hydronium with a simplified strong-electrolyte model.
// Weak-acid equilibrium, saturation and concentration-based pH are not computed.
const strongAcids={HCl:'Cl',HBr:'Br'};
const baseData={
 LiOH:{name:'수산화 리튬',metal:'Li',count:1,gate:735},
 NaOH:{name:'수산화 나트륨',metal:'Na',count:1,gate:591},
 KOH:{name:'수산화 칼륨',metal:'K',count:1,gate:633},
 RbOH:{name:'수산화 루비듐',metal:'Rb',count:1,gate:655},
 CsOH:{name:'수산화 세슘',metal:'Cs',count:1,gate:615},
 FrOH:{name:'수산화 프랑슘 · 예측',metal:'Fr',count:1,gate:null},
 'Ca(OH)2':{name:'수산화 칼슘',metal:'Ca',count:2,gate:853},
 'Sr(OH)2':{name:'수산화 스트론튬',metal:'Sr',count:2,gate:808},
 'Ba(OH)2':{name:'수산화 바륨',metal:'Ba',count:2,gate:681}
};
function acidBasePattern(type){
 if(networkPolyion(type)&&type!=='OH-')return networkSpecies[type].pattern;
 if(type==='OH-')return [-1,0];
 // Localized electron bookkeeping: the fourth atom is the added proton.
 // This is not a calculation of the molecule's electron-density distribution.
 if(type==='H3O+')return [0,0,0,1];
 const b=baseData[type];
 return b?[b.count,...Array.from({length:b.count},()=>[-1,0]).flat()]:null;
}
function acidBaseCharges(type,group){
 const pattern=acidBasePattern(type);if(!pattern)return;
 group.forEach((a,i)=>a.electrons=protonCount(a.s)-pattern[i]);
}
function validAcidBase(m,byId){
 const pattern=acidBasePattern(m.type);
 return pattern&&m.ids.length===pattern.length&&m.ids.every((id,i)=>byId.has(id)&&charge(byId.get(id))===pattern[i]);
}
function isPolyatomicIon(type){return type==='OH-'||type==='H3O+'||networkPolyion(type);}
function liquidSolvent(m,byId){
 return (m.type==='H2O'||(m.type==='H3O+'&&validAcidBase(m,byId)))&&moleculeTemperature(m,byId)>=273.15&&moleculeTemperature(m,byId)<373.15;
}
function hydroniumCarriers(byId,wet){
 return new Map(molecules.filter(m=>m.type==='H3O+'&&validAcidBase(m,byId)&&m.ids.some(id=>wet.has(id))).map(m=>[m.ids[3],m]));
}
function protonateWater(byId,wet,announce=true){
 const bound=new Set(molecules.flatMap(m=>m.ids)),used=new Set(),formed=[];
 const water=molecules.filter(m=>m.type==='H2O'&&liquidSolvent(m,byId)&&m.ids.every(id=>charge(byId.get(id))===0));
 const bins=spatialBins(water.map(m=>({...byId.get(m.ids[0]),m})),22);
 for(const a of atoms){
  if(a.s!=='H'||charge(a)!==1||bound.has(a.id)||!wet.has(a.id))continue;
  const w=neighbors(a,bins,22).find(w=>!used.has(w.m)&&Math.hypot(w.x-a.x,w.y-a.y)<22);
  if(!w)continue;
  const ids=[...w.m.ids,a.id];used.add(w.m);formed.push({type:'H3O+',ids});
  ids.forEach(id=>{byId.get(id).aqueous=true;wet.add(id);});
 }
 if(!formed.length)return;
 molecules=molecules.filter(m=>!used.has(m)).concat(formed);discover('H3O+');
 if(announce)reactionLabel='H₂O + H⁺ → H₃O⁺ · 수화 '+formed.length+'회';
}
function acidBaseChemistry(byId,wet){
 const formed=[],remove=new Set();
 // An OH- group survives dissolution with its O-H bond and excess electron.
 for(const m of molecules){
  const b=baseData[m.type];
  if(!b||!validAcidBase(m,byId)||!m.ids.some(id=>wet.has(id)))continue;
  remove.add(m);
  for(let i=0;i<b.count;i++){
   const ids=m.ids.slice(1+i*2,3+i*2);
   formed.push({type:'OH-',ids});discover('OH-');
  }
  m.ids.forEach(id=>byId.get(id).aqueous=true);
  reactionLabel=m.type+' → '+b.metal+'('+b.count+'+) + '+b.count+'OH⁻';
 }
 molecules=molecules.filter(m=>!remove.has(m)).concat(formed);
 protonateWater(byId,wet);
 const bonded=new Set(molecules.flatMap(m=>m.ids)),used=new Set(),consumed=new Set();
 const carriers=hydroniumCarriers(byId,wet);
 const hydrogens=atoms.filter(a=>a.s==='H'&&charge(a)===1&&((!bonded.has(a.id)&&wet.has(a.id))||carriers.has(a.id)));
 const bins=spatialBins(hydrogens,22),water=[];
 let neutralized=0,hydrated=0;
 for(const m of molecules){
  if(m.type!=='OH-'||!validAcidBase(m,byId))continue;
  const o=byId.get(m.ids[0]);
  if(!m.ids.some(id=>wet.has(id)))continue;
  m.ids.forEach(id=>byId.get(id).aqueous=true);
  const proton=neighbors(o,bins,22).find(a=>!used.has(a.id)&&Math.hypot(a.x-o.x,a.y-o.y)<22);
  if(!proton)continue;
  // Reassign localized electrons only: sum(e), charge, atoms and isotopes stay fixed.
  o.electrons--;proton.electrons++;
  const ids=[...m.ids,proton.id];
  ids.forEach(id=>byId.get(id).aqueous=false);
  water.push({type:'H2O',ids});consumed.add(m);used.add(proton.id);
  const carrier=carriers.get(proton.id),products=[...ids];
  if(carrier){
   const solventIds=carrier.ids.slice(0,3);
   solventIds.forEach(id=>byId.get(id).aqueous=false);
   water.push({type:'H2O',ids:solventIds});consumed.add(carrier);products.push(...solventIds);hydrated++;
  }
  chemicalHeat(products.map(id=>byId.get(id)),.59);
  neutralized++;
 }
 if(neutralized){
  molecules=molecules.filter(m=>!consumed.has(m)).concat(water);discover('H2O');
  reactionLabel=(hydrated===neutralized?'H₃O⁺ + OH⁻ → 2H₂O':'H₃O⁺/H⁺ + OH⁻ → 물')+' · 중화 '+neutralized+'회 (발열)';record(reactionLabel);
 }
 // Water released by neutralization can hydrate the remaining excess acid.
 protonateWater(byId,wet,false);
 // Re-form a base from its ions when the surrounding water is absent.
 const bound=new Set(molecules.flatMap(m=>m.ids)),availableOH=molecules.filter(m=>m.type==='OH-'&&validAcidBase(m,byId)),taken=new Set();
 const hydroxideBins=spatialBins(availableOH.map(m=>({...byId.get(m.ids[0]),m})),22),bases=[];
 for(const a of atoms){
  if(bound.has(a.id)||wet.has(a.id))continue;
  for(const [type,b] of Object.entries(baseData)){
   if(a.s!==b.metal||charge(a)!==b.count||a.t>=(b.gate||1800))continue;
   const near=neighbors(a,hydroxideBins,22).filter(r=>!taken.has(r.m)&&r.m.ids.every(id=>!wet.has(id))&&Math.hypot(r.x-a.x,r.y-a.y)<16).slice(0,b.count);
   if(near.length!==b.count)continue;
   near.forEach(r=>taken.add(r.m));bases.push({type,ids:[a.id,...near.flatMap(r=>r.m.ids)]});bound.add(a.id);discover(type);break;
  }
 }
 if(bases.length)molecules=molecules.filter(m=>!taken.has(m)).concat(bases);
}
function acidBaseSample(point=null,radius=60){
 const byId=new Map(atoms.map(a=>[a.id,a])),wet=solventMap(byId),bonded=new Set(molecules.flatMap(m=>m.ids));
 const within=a=>!point||Math.hypot(a.x-point.x,a.y-point.y)<=radius;
 const water=molecules.filter(m=>m.type==='H2O'&&within(byId.get(m.ids[0]))&&moleculeTemperature(m,byId)>=273.15&&moleculeTemperature(m,byId)<373.15).length;
 const h3o=molecules.filter(m=>m.type==='H3O+'&&validAcidBase(m,byId)&&within(byId.get(m.ids[0]))&&m.ids.some(id=>wet.has(id))).length;
 const protons=atoms.filter(a=>within(a)&&a.s==='H'&&charge(a)===1&&!bonded.has(a.id)&&wet.has(a.id)).length;
 const h=h3o+protons;
 const oh=molecules.filter(m=>m.type==='OH-'&&validAcidBase(m,byId)&&within(byId.get(m.ids[0]))&&m.ids.some(id=>wet.has(id))).length;
 const solvent=molecules.some(m=>within(byId.get(m.ids[0]))&&liquidSolvent(m,byId));
 const label=!solvent?'액체 물 없음':h&&oh?'산·염기 혼합 / 중화 대기':h?'산성':oh?'염기성':'H₃O⁺·OH⁻ 과잉 없음';
 return {h,h3o,protons,oh,water,label};
}
function acidBaseCounts(s){return 'H₃O⁺ '+s.h3o+' / OH⁻ '+s.oh+(s.protons?' / 수화 대기 H⁺ '+s.protons:'');}
function acidBaseStats(){
 const s=acidBaseSample();
 $('acidStats').textContent='전체 용액 · '+acidBaseCounts(s);
 $('acidState').textContent=s.label;
 $('acidState').style.color=s.h&&s.oh?'#8a5e20':s.h?'#a74932':s.oh?'#725087':'#506c38';
}
