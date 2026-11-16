'use strict';

// Contact times and heat feedback are display-scale parameters, not laboratory
// rate constants or calibrated explosion yields. Fr uses a predicted pathway.
const reactiveMetals={
 Li:{q:1,hydroxide:'LiOH',rate:.45,activity:'완만',heat:4.4,flash:.4},
 Na:{q:1,hydroxide:'NaOH',rate:1,activity:'빠름',heat:4,flash:.5},
 K:{q:1,hydroxide:'KOH',rate:2,activity:'격렬',heat:4.2,flash:.65},
 Rb:{q:1,hydroxide:'RbOH',rate:3.4,activity:'매우 격렬',heat:4.4,flash:.8},
 Cs:{q:1,hydroxide:'CsOH',rate:5,activity:'매우 격렬',heat:4.6,flash:1},
 Fr:{q:1,hydroxide:'FrOH',rate:3.4,activity:'예측 모델',heat:4.4,flash:.8,predicted:true},
 Ca:{q:2,hydroxide:'Ca(OH)2',rate:.6,activity:'완만',heat:4.3,flash:.4},
 Sr:{q:2,hydroxide:'Sr(OH)2',rate:1,activity:'빠름',heat:4.6,flash:.5},
 Ba:{q:2,hydroxide:'Ba(OH)2',rate:1.6,activity:'빠름',heat:4.9,flash:.6}
};
function metalFamily(symbol){
 const data=reactiveMetals[symbol];
 return data?(data.q===1?'알칼리 금속':'알칼리토금속'):'';
}
function reactiveMetalHint(){
 const data=reactiveMetals[selected],el=$('metalHint');el.hidden=!data;
 if(!data)return;
 el.textContent=metalFamily(selected)+' · 물 반응 '+data.activity+'\n'+
 (data.q===1?'같은 금속 2원자':'금속 1원자')+' + 액체 물 2분자 → '+(data.q===1?'2':'')+data.hydroxide+' + H₂\n'+
 '물을 넉넉히 배치하면 금속 양이온과 OH⁻가 남아요.'+
 (data.predicted?'\n프랑슘 반응·상태는 예측이며 붕괴는 미구현입니다.':'');
}
function reactiveMetalWater(byId,dt=.2){
 const bound=new Set(molecules.flatMap(m=>m.ids));
 const availableWater=molecules.filter(m=>m.type==='H2O'&&liquidSolvent(m,byId)&&m.ids.every(id=>charge(byId.get(id))===0));
 const waterBins=spatialBins(availableWater.map(m=>({...byId.get(m.ids[0]),m})),22);
 const metals=atoms.filter(a=>reactiveMetals[a.s]&&charge(a)===0&&!bound.has(a.id)&&['solid','liquid'].includes(classifyPhase(a.s,a.t)));
 const eligible=new Set(metals.map(a=>a.id)),metalBins=spatialBins(metals,22);
 for(const a of atoms)if(!eligible.has(a.id))a.waterContact=0;
 for(const a of metals){
  const touching=neighbors(a,waterBins,22).some(w=>Math.hypot(w.x-a.x,w.y-a.y)<18);
  a.waterContact=touching?Math.min(1,(Number.isFinite(a.waterContact)?a.waterContact:0)+Math.max(0,dt)*reactiveMetals[a.s].rate):0;
 }
 const usedMetals=new Set(),usedWater=new Set(),formed=[],reactions=new Map();let events=0;
 for(const a of metals){
  if(usedMetals.has(a.id)||a.waterContact<1)continue;
  const data=reactiveMetals[a.s],needed=2/data.q;
  const donors=[a];
  if(needed===2){
   const second=neighbors(a,metalBins,22).find(b=>b.id!==a.id&&b.s===a.s&&b.waterContact>=1&&!usedMetals.has(b.id)&&Math.hypot(b.x-a.x,b.y-a.y)<22);
   if(!second)continue;donors.push(second);
  }
  const waters=neighbors(a,waterBins,22).filter(w=>!usedWater.has(w.m)&&Math.hypot(w.x-a.x,w.y-a.y)<18).slice(0,2);
  if(waters.length!==2)continue;
  const oh=waters.map(w=>w.m.ids.slice(0,2)),hydrogen=waters.map(w=>w.m.ids[2]);
  // Two donated electrons are localized on the two hydroxide oxygens. All
  // original atoms, isotope labels and bound electrons remain accounted for.
  for(const donor of donors){donor.electrons-=data.q;donor.waterContact=0;usedMetals.add(donor.id);}
  for(const w of waters){byId.get(w.m.ids[0]).electrons++;usedWater.add(w.m);}
  donors.forEach((donor,i)=>formed.push({type:data.hydroxide,ids:[donor.id,...oh.slice(i*data.q,(i+1)*data.q).flat()]}));
  formed.push({type:'H2',ids:hydrogen});
  const products=[...donors,...waters.flatMap(w=>w.m.ids.map(id=>byId.get(id)))];
  products.forEach(a=>a.aqueous=false);chemicalHeat(products,data.heat,{symbol:a.s,violence:Math.max(.4,data.rate*.45)});

  discover(data.hydroxide);discover('H2');
  reactionLabel=(needed===2?'2':'')+a.s+' + 2H₂O → '+(needed===2?'2':'')+data.hydroxide+' + H₂ · 발열'+(data.predicted?' (예측)':'');
  reactions.set(reactionLabel,(reactions.get(reactionLabel)||0)+1);
  events++;
 }
 if(events){molecules=molecules.filter(m=>!usedWater.has(m)).concat(formed);for(const [label,count] of reactions)record(label+' · '+count+'회');}
 return events;
}
