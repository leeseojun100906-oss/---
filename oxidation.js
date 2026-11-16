'use strict';

// A shared, atom-balanced oxidation engine. Profiles select representative
// products, not a complete phase diagram or ab-initio reaction prediction.
// Rates, contact radius, heat and coating factors are gameplay parameters.
// Sources: OpenStax Chemistry 2e §18.9; Purdue Active Metal Reactions;
// RSC 'The combustion of iron wool'. See README/help for scope and sources.
const oxidationProfiles={
 Li:{q:1,rate:.3},
 Na:{q:1,oxygen:[-1,-1],metals:2,rate:.8,kind:'과산화물'},
 K:{q:1,oxygen:[-1,0],metals:1,rate:1.5,kind:'초과산화물'},
 Rb:{q:1,oxygen:[-1,0],metals:1,rate:2,kind:'초과산화물'},
 Cs:{q:1,oxygen:[-1,0],metals:1,rate:2.5,kind:'초과산화물'},
 Be:{q:2,rate:.02,coating:true}, Mg:{q:2,rate:.06,coating:true},
 Ca:{q:2,rate:.3}, Sr:{q:2,rate:.5}, Ba:{q:2,rate:.7},
 Al:{q:3,rate:.12,coating:true}, Ti:{q:4,rate:.04,coating:true},
 Cr:{q:3,rate:.03,coating:true},
 Mn:{states:[2,3,3],rate:.05}, Fe:{q:3,rate:.04},
 Co:{states:[2,3,3],rate:.025}, Ni:{q:2,rate:.015,coating:true},
 Cu:{q:2,rate:.008}, Zn:{q:2,rate:.06,coating:true},
 Sn:{q:4,rate:.015,coating:true}, Pb:{q:2,rate:.015,coating:true},
 C:{q:4,rate:.004,covalent:true,min:650},
 S:{q:4,rate:.04,covalent:true,min:500},
 Si:{q:4,rate:.008,covalent:true,coating:true,min:600}
};
const oxideData={};
const oxideGcd=(a,b)=>b?oxideGcd(b,a%b):a;
const formulaPart=(symbol,n)=>symbol+(n===1?'':n);
for(const [element,p] of Object.entries(oxidationProfiles)){
 const n=p.metals||p.states?.length||2/oxideGcd(p.q,2);
 const metalStates=p.states||Array(n).fill(p.q);
 const oxygen=p.oxygen||Array(metalStates.reduce((s,q)=>s+q,0)/2).fill(-2);
 const id=formulaPart(element,n)+formulaPart('O',oxygen.length);
 const copies=2/oxideGcd(oxygen.length,2);
 Object.assign(p,{element,id,metalStates,oxygen,copies,metalCount:n*copies,oxygenCount:oxygen.length*copies/2});
 // Localized formal charges for ionic solids; covalent products remain neutral.
 // A superoxide's one excess electron is localized for bookkeeping, not density.
 const pattern=p.covalent?Array(n+oxygen.length).fill(0):[...metalStates,...oxygen];
 oxideData[id]={profile:p,atoms:[...Array(n).fill(element),...Array(oxygen.length).fill('O')],pattern,
  // A conservative simulated solid range, NOT a claimed melting point. Above
  // this range the state is explicitly unknown, never silently treated as gas.
  solidThrough:p.kind?500:1200,
  acid:!p.covalent&&!p.kind&&!['Be','Ti','Cr','Mn','Co','Sn','Pb'].includes(element)};
}
oxideData.Fe2O3.solidThrough=1500;
oxideData.MgO.solidThrough=1500;oxideData.Al2O3.solidThrough=1500;
function oxidationEquation(p){
 const coefficient=n=>n===1?'':n;
 return coefficient(p.metalCount)+p.element+' + '+coefficient(p.oxygenCount)+'O₂ → '+coefficient(p.copies)+p.id;
}
function registerOxideRecipes(){
 for(const [id,d] of Object.entries(oxideData)){
  if(recipes.some(r=>r.id===id))continue;
  const p=d.profile,name=(p.kind||'산화물')+' · '+names[symbols.indexOf(p.element)];
  recipes.push({id,name,atoms:d.atoms,ionic:!p.covalent,reactionOnly:true,category:p.kind||'산화물'});
 }
}
function oxideCharges(type,group){
 const d=oxideData[type];if(!d)return;
 group.forEach((a,i)=>a.electrons=protonCount(a.s)-d.pattern[i]);
}
function validOxide(m,byId){
 const d=oxideData[m.type];
 return !!d&&m.ids.length===d.atoms.length&&m.ids.every((id,i)=>{
  const a=byId.get(id);return a&&a.s===d.atoms[i]&&charge(a)===d.pattern[i];
 });
}
function oxidePhase(type,t){
 if(type==='CO2')return null; // Existing sublimation data stays authoritative.
 if(type==='SO2')return t<197.7?'solid':t<263.1?'liquid':'gas';
 const d=oxideData[type];return d?(t<=d.solidThrough?'solid':'unknown'):null;
}
function oxidationRate(p,t,coated=false){
 if(!Number.isFinite(t)||t<(p.min||90)||t>3000)return 0;
 const coating=coated&&p.coating&&t<1000?.025:1;
 return Math.min(35,p.rate*Math.exp(Math.min(10,(t-300)/160)))*coating;
}
function elementalOxidation(byId,dt=.2){
 const bound=new Set(molecules.flatMap(m=>m.ids));
 const free=atoms.filter(a=>oxidationProfiles[a.s]&&!bound.has(a.id)&&charge(a)===0);
 const eligible=new Set(free.map(a=>a.id));
 for(const a of atoms)if(!eligible.has(a.id))a.oxidationDose=0;
 const oxygen=molecules.filter(m=>m.type==='O2'&&m.ids.every(id=>byId.has(id)&&charge(byId.get(id))===0)&&classifyPhase('O2',moleculeTemperature(m,byId))==='gas');
 if(!oxygen.length){for(const a of free)a.oxidationDose=0;return 0;}
 const centers=oxygen.map(m=>({x:m.ids.reduce((s,id)=>s+byId.get(id).x,0)/2,y:m.ids.reduce((s,id)=>s+byId.get(id).y,0)/2,m}));
 const oxygenBins=spatialBins(centers,32),metalBins=spatialBins(free,32);
 const coatings=spatialBins(molecules.filter(m=>oxideData[m.type]).map(m=>({...byId.get(m.ids[0]),oxide:m.type})),32);
 const usedAtoms=new Set(),usedOxygen=new Set(),formed=[],events=new Map();
 for(const a of free){
  if(usedAtoms.has(a.id))continue;
  const p=oxidationProfiles[a.s];
  const near=(items)=>items.filter(b=>Math.hypot(b.x-a.x,b.y-a.y)<32).sort((b,c)=>Math.hypot(b.x-a.x,b.y-a.y)-Math.hypot(c.x-a.x,c.y-a.y));
  const metals=[a,...near(neighbors(a,metalBins,32)).filter(b=>b.id!==a.id&&b.s===a.s&&!usedAtoms.has(b.id)).slice(0,p.metalCount-1)];
  const oxidizers=near(neighbors(a,oxygenBins,32)).filter(o=>!usedOxygen.has(o.m)).slice(0,p.oxygenCount);
  if(metals.length!==p.metalCount||oxidizers.length!==p.oxygenCount){a.oxidationDose=0;continue;}
  const oxygens=oxidizers.flatMap(o=>o.m.ids.map(id=>byId.get(id))),group=[...metals,...oxygens];
  const t=group.reduce((s,b)=>s+b.t,0)/group.length;
  const coated=neighbors(a,coatings,32).some(b=>b.oxide===p.id&&Math.hypot(b.x-a.x,b.y-a.y)<22);
  const rate=oxidationRate(p,t,coated);
  if(!rate){a.oxidationDose=0;continue;}
  a.oxidationDose=(Number.isFinite(a.oxidationDose)?Math.max(0,Math.min(1,a.oxidationDose)):0)+Math.max(0,Math.min(.5,dt))*rate;
  if(a.oxidationDose<1-1e-9)continue;
  for(let i=0;i<p.copies;i++){
   const unit=[...metals.slice(i*p.metalStates.length,(i+1)*p.metalStates.length),...oxygens.slice(i*p.oxygen.length,(i+1)*p.oxygen.length)];
   oxideCharges(p.id,unit);
   unit.forEach(b=>{b.aqueous=false;b.oxidationDose=0;usedAtoms.add(b.id);});
   formed.push({type:p.id,ids:unit.map(b=>b.id)});
  }
  oxidizers.forEach(o=>usedOxygen.add(o.m));discover(p.id);
  // Qualitative display heat, not tabulated formation enthalpies. Cold surface
  // oxidation releases heat but is not rendered as an instantaneous flash.
  const energy=4*p.oxygenCount;chemicalEnergy+=energy;
  for(const b of group)thermostat(b,t+energy*18/group.length);
  if(t>=650||p.rate>=.3)emitEnergyLight(a.x,a.y,energy,{kind:'chemical',symbol:a.s,violence:Math.min(2,.3+rate/20)});
  const label=oxidationEquation(p)+' · 산화';events.set(label,(events.get(label)||0)+1);
 }
 molecules=molecules.filter(m=>!usedOxygen.has(m)).concat(formed);
 for(const [label,count] of events){reactionLabel=label;record(label+' · '+count+'회');}
 return [...events.values()].reduce((s,n)=>s+n,0);
}

// Basic/amphoteric oxide dissolution: O(2-) + 2 H3O(+) -> 3 H2O.
// Entire formula units require the full proton count before any mutation.
// Peroxides, superoxides and refractory/covalent oxides are deliberately excluded.
function oxideAcidChemistry(byId,wet){
 const carriers=[...hydroniumCarriers(byId,wet).values()];
 if(!carriers.length)return 0;
 const bins=spatialBins(carriers.map(m=>({...byId.get(m.ids[3]),m})),28);
 const consumed=new Set(),formed=[];let events=0;
 for(const m of molecules){
  const d=oxideData[m.type];
  if(!d?.acid||!validOxide(m,byId)||!m.ids.some(id=>wet.has(id)))continue;
  const root=byId.get(m.ids[0]),oxygens=m.ids.slice(d.profile.metalStates.length).map(id=>byId.get(id));
  const candidates=neighbors(root,bins,28).filter(c=>!consumed.has(c.m)&&Math.hypot(c.x-root.x,c.y-root.y)<28).slice(0,oxygens.length*2);
  if(candidates.length!==oxygens.length*2)continue;
  for(let i=0;i<oxygens.length;i++){
   const o=oxygens[i],pair=candidates.slice(2*i,2*i+2);o.electrons-=2;o.aqueous=false;
   for(const c of pair){
    const h=byId.get(c.id);h.electrons++;h.aqueous=false;
    consumed.add(c.m);c.m.ids.slice(0,3).forEach(id=>byId.get(id).aqueous=false);formed.push({type:'H2O',ids:c.m.ids.slice(0,3)});
   }
   formed.push({type:'H2O',ids:[o.id,...pair.map(c=>c.id)]});
  }
  m.ids.slice(0,d.profile.metalStates.length).forEach(id=>byId.get(id).aqueous=true);
  consumed.add(m);discover('H2O');events++;
  reactionLabel=m.type+' + '+candidates.length+'H₃O⁺ → 금속 이온 + '+oxygens.length*3+'H₂O';record(reactionLabel+' · 산화물 중화');
 }
 if(events)molecules=molecules.filter(m=>!consumed.has(m)).concat(formed);
 return events;
}
function oxidationHint(){
 if(networkSelectionHint())return;
 const el=$('reactionSupport'),p=oxidationProfiles[selected],d=oxideData[selected];
 el.hidden=false;
 if(p){el.textContent='공통 산소 반응 · '+oxidationEquation(p)+'\n'+(p.rate>=.3?'상온에서도 빠르게 반응하는 게임 모델.':'상온에서는 느리며, 가열하면 빨라져요. 1,000 K에서 시험해 보세요.')+(p.coating?'\n주변 산화막은 추가 산화를 늦춰요.':'')+'\n실제 O₂ 분자와 충분한 원자 수가 필요해요.';return;}
 if(d){el.textContent=(d.profile.kind||'산화물')+' · '+(d.acid?'수용액의 H₃O⁺와 중화 가능':'등록된 후속 반응은 반응 수첩에서 확인')+'\n'+(d.profile.covalent?'공유결합 단위로 표시.':'이온 고체의 조성 단위를 묶어 표시.')+(selected==='CO2'||selected==='SO2'?'':' 상태 자료 범위 밖은 「자료 없음」.');return;}
 if(selected==='O2'){el.textContent='공통 산화 규칙: '+Object.keys(oxidationProfiles).length+'종 원소 지원.\n철·마그네슘·알루미늄·구리·탄소·황 등과 접촉 반응.\n산화수·반응 속도·표면 산화막을 구분해요.';return;}
 if(symbols.includes(selected)){
  const ordinaryInactive=['Au','Pt','Ag','He','Ne','Ar','Kr','Xe','Rn'];
  el.textContent=ordinaryInactive.includes(selected)?'산소와의 빠른 직접 산화는 일반 조건에서 지원하지 않아요. 다른 산화제·특수 조건은 별도 모델이 필요해요.':selected==='H'?'H₂ 분자를 만든 뒤 O₂와 연소해요.': '이 원소의 직접 산소 반응 자료는 아직 미등록이에요.\n도감에 있다는 것과 모든 반응이 구현된 것은 달라요.';
  if(metalValence[selected])el.textContent+='\n산·수용액 반응은 등록된 금속 반응성 규칙을 사용해요.';
  return;
 }
 el.textContent='이 물질은 등록된 분자·산염기·이온 반응을 사용해요.\n모든 반응 조합을 자동 예측하는 모델은 아니에요.';
}
