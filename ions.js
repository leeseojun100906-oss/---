'use strict';
// Selected reactions; solvent proximity and rates are deliberately simplified.
const saltData={
 NaCl:{metal:'Na',q:1,name:'염화 나트륨',melt:1074},KCl:{metal:'K',q:1,name:'염화 칼륨',melt:1043},
 MgCl2:{metal:'Mg',q:2,name:'염화 마그네슘',melt:987},CaCl2:{metal:'Ca',q:2,name:'염화 칼슘',melt:1045},
 ZnCl2:{metal:'Zn',q:2,name:'염화 아연',melt:563},FeCl2:{metal:'Fe',q:2,name:'염화 철(II)',melt:950},
 CuCl2:{metal:'Cu',q:2,name:'염화 구리(II)',melt:771},AgCl:{metal:'Ag',q:1,name:'염화 은',melt:728,insoluble:true}
};
// New reactive metals use the acid/water pathways only. Their common rank here
// merely enables proton reduction; it is not a potential or water-speed ranking.
const metalActivity={Li:7,Na:7,K:7,Rb:7,Cs:7,Fr:7,Ca:7,Sr:7,Ba:7,Mg:6,Al:6.2,Mn:5.5,Zn:5,Fe:4,Co:3.8,Ni:3.6,Pb:3.3,H:3,Cu:2,Ag:1};
const metalValence={Li:1,Na:1,K:1,Rb:1,Cs:1,Fr:1,Ca:2,Sr:2,Ba:2,Mg:2,Al:3,Mn:2,Zn:2,Fe:2,Co:2,Ni:2,Pb:2,Cu:2,Ag:1};
function saltCharges(type,group){const s=saltData[type];if(!s)return;group[0].electrons=protonCount(s.metal)-s.q;for(const a of group.slice(1))a.electrons=protonCount(a.s)+1;}
function solventMap(byId){
 const water=molecules.filter(m=>liquidSolvent(m,byId)).map(m=>byId.get(m.ids[0]));
 const bins=spatialBins(water,solvation.wetRadius),wet=new Set();
 for(const a of atoms)if(neighbors(a,bins,solvation.wetRadius).some(w=>Math.hypot(w.x-a.x,w.y-a.y)<solvation.wetRadius))wet.add(a.id);
 return wet;
}
function ionicChemistry(dt=.2){
 const byId=new Map(atoms.map(a=>[a.id,a])),wet=solventMap(byId);
 for(const a of atoms)a.aqueous=wet.has(a.id)&&charge(a)!==0;
 molecules=molecules.filter(m=>{
  const s=saltData[m.type];if(!s&&!strongAcids[m.type])return true;
  if(!m.ids.some(id=>wet.has(id))||s?.insoluble)return true;
  const g=m.ids.map(id=>byId.get(id));
  if(!s){const h=g.find(a=>a.s==='H'),cl=g.find(a=>a.s===strongAcids[m.type]);if(charge(h)!==0||charge(cl)!==0)return true;h.electrons--;cl.electrons++;}
  for(const a of g)a.aqueous=true;
  reactionLabel=m.type+' → 수용액 이온 (해리)';return false;
 });
 acidBaseChemistry(byId,wet);
 oxideAcidChemistry(byId,wet);
 networkRunRules(dt,true);
 const bonded=new Set(molecules.flatMap(m=>m.ids));
 const carriers=hydroniumCarriers(byId,wet);
 const free=atoms.filter(a=>!bonded.has(a.id)),bins=spatialBins([...free,...[...carriers.keys()].map(id=>byId.get(id))],22),used=new Set();
 for(const donor of free){
  const q=metalValence[donor.s];if(!q||charge(donor)!==0||!wet.has(donor.id)||used.has(donor.id))continue;
  const near=neighbors(donor,bins,22).filter(a=>!used.has(a.id)&&wet.has(a.id)&&Math.hypot(a.x-donor.x,a.y-donor.y)<22);
  for(const target of Object.keys(metalValence).filter(s=>!reactiveMetals[s]).concat('H')){
   if(target==='H'&&networkOxidizingAcidNear(donor,byId,wet))continue;
   // In aqueous salts these metals react with the solvent. Do not infer direct
   // metal deposition from a reactivity list while ignoring the water pathway.
   if(reactiveMetals[donor.s]&&target!=='H')continue;
   const tq=target==='H'?1:metalValence[target];if(!(metalActivity[donor.s]>metalActivity[target]))continue;
   // Balance electron transfer across multiple donors, and always produce H2
   // from a pair of protons (never a one-atom "H2" from a monovalent metal).
   let donorCount=tq,acceptorCount=q;
   if(q===tq){donorCount=1;acceptorCount=1;}
   if(target==='H'&&acceptorCount%2){donorCount*=2;acceptorCount*=2;}
   const donors=[donor,...near.filter(a=>a.id!==donor.id&&a.s===donor.s&&charge(a)===0&&!bonded.has(a.id)).slice(0,donorCount-1)];
   const acceptors=near.filter(a=>a.s===target&&charge(a)===tq).slice(0,acceptorCount);
   if(donors.length!==donorCount||acceptors.length!==acceptorCount)continue;
   for(const a of donors){a.electrons-=q;used.add(a.id);a.aqueous=true;}
   const surfaceVx=donor.vx,surfaceVy=donor.vy;
   for(const a of acceptors){
    a.electrons+=tq;used.add(a.id);a.aqueous=false;
    // Reduced metal loses its incoming solution motion to the departing donor.
    // Preserve pair momentum instead of letting the solid product fly away.
    if(target!=='H'){
     donor.vx+=(a.vx-surfaceVx)*mass(a)/mass(donor);
     donor.vy+=(a.vy-surfaceVy)*mass(a)/mass(donor);
     a.vx=surfaceVx;a.vy=surfaceVy;
    }
    discover(a.s);
   }
   let releasedWater=0;
   if(target==='H'){
    const consumed=new Set();
    for(const a of acceptors){
     const carrier=carriers.get(a.id);if(!carrier)continue;
     consumed.add(carrier);const ids=carrier.ids.slice(0,3);
     ids.forEach(id=>byId.get(id).aqueous=false);
     molecules.push({type:'H2O',ids});releasedWater++;
    }
    molecules=molecules.filter(m=>!consumed.has(m));
    for(let i=0;i<acceptors.length;i+=2)molecules.push({type:'H2',ids:acceptors.slice(i,i+2).map(a=>a.id)});acceptors.forEach(a=>bonded.add(a.id));discover('H2');
   }
   const donorLabel=(donorCount>1?donorCount:'')+donor.s,hydrogenLabel=(acceptors.length===2?'':acceptors.length/2)+'H₂';
   reactionLabel=donorLabel+' + '+acceptors.length+target+'('+tq+'+) → '+donorLabel+'('+q+'+) + '+(target==='H'?hydrogenLabel:acceptors.length+target);
   if(releasedWater)reactionLabel=donorLabel+' + '+releasedWater+'H₃O⁺'+(acceptors.length>releasedWater?' + '+(acceptors.length-releasedWater)+'H⁺':'')+' → '+donorLabel+'('+q+'+) + '+hydrogenLabel+' + '+releasedWater+'H₂O';
   record(reactionLabel+' · 산화·환원');break;
  }
 }
 for(const a of free){
  if(bonded.has(a.id))continue;
  for(const [type,s] of Object.entries(saltData)){
   if(a.s!==s.metal||a.t>=s.melt||(!s.insoluble&&wet.has(a.id)))continue;
   const aq=charge(a),neutral=aq===0&&['Na','K','Mg','Ca'].includes(a.s);if(aq!==s.q&&!neutral)continue;
   const candidates=neighbors(a,bins,22).filter(b=>b.s==='Cl'&&!bonded.has(b.id)&&b.t<s.melt&&charge(b)===(neutral?0:-1)&&Math.hypot(a.x-b.x,a.y-b.y)<16&&(s.insoluble||!wet.has(b.id))).slice(0,s.q);
   if(candidates.length!==s.q)continue;
   const group=[a,...candidates];if(neutral)saltCharges(type,group);
   group.forEach(b=>{bonded.add(b.id);b.aqueous=false;});molecules.push({type,ids:group.map(b=>b.id)});discover(type);
   reactionLabel=type+(s.insoluble&&wet.has(a.id)?' ↓ 침전':' · 이온결합');break;
  }
 }
 // Run after displacement/salt formation so atoms already consumed this tick
 // cannot also react with water. Recompute solvent after water consumption.
 if(reactiveMetalWater(byId,dt))acidBaseChemistry(byId,solventMap(byId));
}

// Display-scale hydration: local solvent drag, diffusion and a soft restoring
// force near the liquid edge. Water remains permeable to ions. Every impulse
// has an equal-and-opposite solvent impulse; no screen-space pinning or remote
// attraction. The wider force shell prevents ballistic escape at the wet cutoff.
const solvation={wetRadius:28,forceRadius:40,interiorRadius:14,drag:3.5,edgeDrag:.7,stiffness:80,thermalSpeed:14};
function aqueousMotion(dt, random=Math.random) {
 const byId=new Map(atoms.map(a=>[a.id,a]));
 const polyions=molecules.filter(m=>isPolyatomicIon(m.type)&&validAcidBase(m,byId));
 const bonded=new Set(molecules.flatMap(m=>m.ids));
 // Include free ions just outside the wet region, even if chemistry has already
 // cleared aqueous. Bound salts and reduced neutral metals are excluded.
 const moving=atoms.filter(a=>charge(a)!==0&&a.phase!=='solid'&&!bonded.has(a.id)).map(a=>[a]);
 for(const m of polyions)moving.push(m.ids.map(id=>byId.get(id)));
 if(!moving.length)return;
 const water=molecules.filter(m=>liquidSolvent(m,byId))
  .map(m=>({...byId.get(m.ids[0]),members:m.ids.map(id=>byId.get(id))}));
 const bins=spatialBins(water,solvation.forceRadius),solventRoots=new Set(water.map(w=>w.id));
 for(const group of moving){
  const groupMass=group.reduce((s,a)=>s+mass(a),0);
  const mean=key=>group.reduce((s,a)=>s+mass(a)*a[key],0)/groupMass;
  const a={x:mean('x'),y:mean('y'),vx:mean('vx'),vy:mean('vy'),t:mean('t')};
  const nearby=neighbors(a,bins,solvation.forceRadius).filter(w=>!group.some(a=>a.id===w.id)&&Math.hypot(a.x-w.x,a.y-w.y)<solvation.forceRadius);
  if(!nearby.length){
   const selfHydrated=solventRoots.has(group[0].id);
   group.forEach(a=>a.aqueous=selfHydrated);continue;
  }
  let closest=nearby[0],distance=Math.hypot(a.x-closest.x,a.y-closest.y);
  for(const w of nearby){const d=Math.hypot(a.x-w.x,a.y-w.y);if(d<distance){closest=w;distance=d;}}
  group.forEach(a=>a.aqueous=distance<solvation.wetRadius||a.material==='H3O+');
  const local=nearby.filter(w=>Math.hypot(a.x-w.x,a.y-w.y)<solvation.wetRadius);
  // Couple to nearby water, not the centre of all droplets in the world.
  const bath=(local.length?local:[closest]).flatMap(w=>w.members),bathMass=bath.reduce((s,w)=>s+mass(w),0),ma=groupMass;
  const flowX=bath.reduce((s,w)=>s+mass(w)*w.vx,0)/bathMass,flowY=bath.reduce((s,w)=>s+mass(w)*w.vy,0)/bathMass;
  const edge=Math.max(0,distance-solvation.interiorRadius);
  const decay=Math.exp(-dt*(solvation.drag+solvation.edgeDrag*edge));
  const sigma=solvation.thermalSpeed*Math.sqrt(35/ma)*Math.sqrt(Math.min(373.15,a.t)/300);
  const radius=Math.sqrt(-2*Math.log(Math.max(1e-12,random()))),angle=2*Math.PI*random();
  const noise=sigma*Math.sqrt(1-decay*decay)*Math.max(.15,1-edge/24);
  const pull=solvation.stiffness*edge*dt/Math.max(distance,.001);
  // Reduced-mass coupling damps relative motion without overdamping a small
  // water bath or changing the common velocity of a moving solution.
  const share=bathMass/(ma+bathMass);
  const dvx=share*((flowX-a.vx)*(1-decay)+noise*radius*Math.cos(angle)+(closest.x-a.x)*pull);
  const dvy=share*((flowY-a.vy)*(1-decay)+noise*radius*Math.sin(angle)+(closest.y-a.y)*pull);
  for(const member of group){member.vx+=dvx;member.vy+=dvy;}
  for(const w of bath){w.vx-=dvx*ma/bathMass;w.vy-=dvy*ma/bathMass;}
 }
}
