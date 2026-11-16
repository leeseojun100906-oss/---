'use strict';
// Every rule is checked at registration and again at commit. No atoms or
// electrons are created by chemistry. New products reuse the input IDs.
let networkLastEvents=0;
function networkCharges(type,group){
 const d=networkSpecies[type];if(!d)return;
 group.forEach((a,i)=>a.electrons=protonCount(a.s)-d.pattern[i]);
}
function validNetwork(m,byId){
 const d=networkSpecies[m.type];return !!d&&m.ids.length===d.atoms.length&&m.ids.every((id,i)=>{
  const a=byId.get(id);return a&&a.s===d.atoms[i]&&charge(a)===d.pattern[i];
 });
}
function networkPolyion(type){const d=networkSpecies[type];return d?.kind==='ion'&&d.atoms.length>1;}
function networkPhase(type,t){
 const d=networkSpecies[type];if(!d||d.legacy||type==='OH-')return null;
 if(d.kind==='ion')return 'plasma';
 if(d.kind==='salt'||d.kind==='oxide'||d.kind==='solid')return t>=250&&t<=400?'solid':'unknown';
 const phase={F2:[53.5,85],Cl2:[171.7,239.1],Br2:[265.8,332],I2:[386.8,457.4],CO:[68.1,81.6],NO:[109.5,121.4],NO2:[261.9,294.3],N2O:[182.3,184.7],CH3OH:[175.6,337.8],C2H5OH:[159,351.5]};
 if(phase[type])return t<phase[type][0]?'solid':t<phase[type][1]?'liquid':'gas';
 return t>=290&&t<=300?(d.room||'unknown'):'unknown';
}
function networkUnits(byId){
 const units=[],bound=new Set(molecules.flatMap(m=>m.ids)),claimed=new Set();
 for(const m of molecules){
  if(!m.ids.every(id=>byId.has(id)))continue;
  const g=m.ids.map(id=>byId.get(id));
  if(g.some(a=>claimed.has(a.id)))continue;
  const d=networkDescriptor(m.type);if(!d||d.atoms.length!==g.length||g.some((a,i)=>a.s!==d.atoms[i]||charge(a)!==d.pattern[i]))continue;
  g.forEach(a=>claimed.add(a.id));
  units.push({type:m.type,ids:m.ids,m,key:m,x:g.reduce((s,a)=>s+a.x,0)/g.length,y:g.reduce((s,a)=>s+a.y,0)/g.length});
 }
 const atomicIonIds=new Map(Object.values(networkIons).filter(d=>d.atoms.length===1).map(d=>[d.atoms[0]+':'+d.q,d.id]));
 for(const a of atoms)if(!bound.has(a.id)){
  const q=charge(a),type=q===0?a.s:atomicIonIds.get(a.s+':'+q);
  if(type)units.push({type,ids:[a.id],a,key:a.id,x:a.x,y:a.y});
 }
 return units;
}
function networkProducts(outputs,pool){
 const available=[...pool],products=[];let after=0;
 for(const type of outputs){
  const d=networkDescriptor(type);if(!d)return null;
  const group=[];
  for(let i=0;i<d.atoms.length;i++){
   const index=available.findIndex(a=>a.s===d.atoms[i]);if(index<0)return null;
   const a=available.splice(index,1)[0];const electrons=protonCount(a.s)-d.pattern[i];
   if(electrons<0||electrons>protonCount(a.s)+3)return null;
   group.push({a,electrons});after+=electrons;
  }
  products.push({type,group});
 }
 if(available.length||after!==pool.reduce((s,a)=>s+a.electrons,0))return null;
 return products;
}
function networkApplyProducts(products,removed,formed,group,wet){
 for(const u of group)if(u.m)removed.add(u.m);
 for(const p of products){
  for(const {a,electrons} of p.group){a.electrons=electrons;a.aqueous=wet&&networkSpecies[p.type]?.kind==='ion';a.oxidationDose=0;a.networkDose={};}
  if(p.group.length>1||!symbols.includes(p.type)&&networkSpecies[p.type]?.kind!=='ion')formed.push({type:p.type,ids:p.group.map(x=>x.a.id)});
  discover(p.type);
 }
}
function networkOxidizingAcidNear(a,byId,wet){
 // Acidic nitrate inhibits ordinary H2 evolution; neutral nitrate salts do not
 // inhibit metal displacement. The caller checks this only for proton reduction.
 return molecules.some(m=>['HNO3','NO3-'].includes(m.type)&&m.ids.some(id=>{
  const b=byId.get(id);return b&&wet.has(id)&&Math.hypot(b.x-a.x,b.y-a.y)<36;
 }));
}
function networkRunRules(dt=.2,aqueous=false){
 if(!atoms.length)return 0;
 const byId=new Map(atoms.map(a=>[a.id,a])),units=networkUnits(byId),bins=spatialBins(units,36);
 const wet=solventMap(byId),used=new Set(),removed=new Set(),formed=[],counts=new Map();
 let heatBins=null,events=0;
 for(const first of units){
  if(used.has(first.key))continue;
  const rules=networkRuleIndex.get(first.type);if(!rules)continue;
  let near=null;
  const owner=first.m||first.a;
  if(!owner.networkDose||typeof owner.networkDose!=='object')owner.networkDose={};
  for(const rule of rules){
   if(rule.saltAction!=='crystal'&&!!rule.aqueous!==aqueous)continue;
   if(!near)near=neighbors(first,bins,36).filter(u=>Math.hypot(u.x-first.x,u.y-first.y)<36).sort((a,b)=>Math.hypot(a.x-first.x,a.y-first.y)-Math.hypot(b.x-first.x,b.y-first.y));
   const group=[first];
   for(const type of rule.inputs.slice(1)){
    const next=near.find(u=>u.type===type&&!used.has(u.key)&&!group.includes(u));if(!next)break;group.push(next);
   }
   const progressKey=rule.id+(rule.saltAction==='crystal'?(aqueous?':wet':':dry'):'');
   const clear=()=>{delete owner.networkDose[progressKey];};
   if(group.length!==rule.inputs.length){clear();continue;}
   const pool=group.flatMap(u=>u.ids.map(id=>byId.get(id)));
   if(new Set(pool.map(a=>a.id)).size!==pool.length){clear();continue;}
   const t=pool.reduce((s,a)=>s+a.t,0)/pool.length;
   if(t<rule.min||t>rule.max||(rule.pressure&&confinement<rule.pressure)){clear();continue;}
   const groupWet=group.every(u=>u.ids.some(id=>wet.has(id)));
   const waterCount=near.filter(u=>u.type==='H2O'&&liquidSolvent(u.m,byId)).length;
   if(rule.saltAction){
    const d=networkSalts[rule.salt];
    if(rule.saltAction==='dissolve'){
     if(!groupWet||!waterCount||d.solubility==='insoluble'||d.solubility==='sparingly'&&waterCount<8){clear();continue;}
    }else{
     const anyWet=group.some(u=>u.ids.some(id=>wet.has(id)));
     // Never crystallize a readily soluble salt in water or a limited-solubility
     // salt in the dilution region. Crystal/dissolution thresholds don't overlap.
     if(aqueous){if(d.legacy&&baseData[d.id]){clear();continue;}if(!groupWet||t>=373||d.solubility==='soluble'||d.solubility==='sparingly'&&waterCount>=8){clear();continue;}}
     else if(anyWet){clear();continue;}
     const gate=baseData[d.id]?.gate||saltData[d.id]?.melt||700;
     if(t>=gate){clear();continue;}
    }
   }else if(aqueous&&!groupWet){clear();continue;}
   if(aqueous&&group.some(u=>u.type==='H2O'&&!liquidSolvent(u.m,byId))){clear();continue;}
   if(rule.combustion&&group.some(u=>u.type==='O2'&&classifyPhase('O2',moleculeTemperature(u.m,byId))!=='gas')){clear();continue;}
   const catalyst=rule.catalysts&&near.find(u=>rule.catalysts.includes(u.type)&&!group.includes(u)&&!used.has(u.key));
   if(rule.requireCatalyst&&!catalyst){clear();continue;}
   const rate=rule.rate*(catalyst&&!rule.requireCatalyst?(rule.catalystBoost||1):1)*(rule.combustion?Math.min(20,Math.exp((t-rule.min)/250)):1);
   const old=Number.isFinite(owner.networkDose[progressKey])?Math.max(0,Math.min(1,owner.networkDose[progressKey])):0;
   owner.networkDose[progressKey]=old+Math.max(0,Math.min(.5,dt))*rate;
   if(owner.networkDose[progressKey]<1-1e-9)continue;
   const products=networkProducts(rule.outputs,pool);if(!products){clear();continue;}
   group.forEach(u=>used.add(u.key));
   // Catalysts are unchanged and retained, not released into the product pool.
   networkApplyProducts(products,removed,formed,group,aqueous);
   if(rule.combustion){if(!heatBins)heatBins=spatialBins(atoms,48);combustionHeat(pool,rule.heat,heatBins);}
   else if(rule.heat)chemicalHeat(pool,rule.heat);
   const label=rule.label+' · '+rule.family;counts.set(label,(counts.get(label)||0)+1);events++;break;
  }
 }
 if(events)molecules=molecules.filter(m=>!removed.has(m)).concat(formed);
 for(const [label,n] of counts){reactionLabel=label;record(label+' · '+n+'회');}
 networkLastEvents=events;return events;
}
function networkSelectionHint(){
 const d=networkSpecies[selected],rules=networkRules.filter(r=>r.inputs.includes(selected));
 if(!d&&!rules.length)return false;
 const lines=[];
 if(oxidationProfiles[selected])lines.push('산소 반응 · '+oxidationEquation(oxidationProfiles[selected]));
 if(d?.kind==='salt'){
  lines.push('염 · '+({soluble:'수용성',sparingly:'난용성 · 물 양에 따른 근사',insoluble:'불용성 · 침전 후보'}[d.solubility]));
  lines.push('구성 이온: '+networkEquation(d.parts));
 }
 if(d?.kind==='ion')lines.push('이온 · 총 전하 '+d.q+' · 원자/전자 수 보존');
 if(d?.fuel)lines.push('가연성 유기물 · 대표 구조 (이성질체 미구분)');
 for(const r of rules.filter(r=>!r.saltAction||r.saltAction==='dissolve').slice(0,3))lines.push(r.label+(r.requireCatalyst?' · 촉매 '+r.catalysts.join('/'):'')+(r.pressure?' · 압축 '+r.pressure+'× 이상':''));
 if(d?.fuel)lines.push('연소 기준 800 K는 게임 설정입니다. 실제 물질별 발화 온도가 아닙니다.');
 if(selected==='HNO3')lines.push('묽은 질산·Cu/Ag 산화 경로. 진한 질산·다른 금속 생성물은 미구현.');
 if(selected==='H2SO4')lines.push('묽은 수용액 모델. 뜨겁고 진한 황산의 산화 반응은 미구현.');
 if(!lines.length)lines.push('등록된 반응 '+rules.length+'개 · 반응 수첩에서 조건 확인');
 $('reactionSupport').hidden=false;$('reactionSupport').textContent=lines.join('\n');return true;
}
function reactionBookEntries(){
 const rows=networkRules.map(r=>({equation:r.label,kind:r.family,condition:(r.aqueous?'액체 물 근처 · ':'')+(r.saltAction?({dissolve:'용해도 판정',crystal:'용해도·건조 판정'}[r.saltAction]):r.combustion?'게임 기준 '+r.min+' K 이상':r.min>10?r.min+'–'+r.max+' K (게임 설정)':'접촉 시간 필요')+(r.requireCatalyst?' · 촉매 '+r.catalysts.join('/'):'')+(r.pressure?' · 압축 '+r.pressure+'× 이상':''),text:r.inputs.concat(r.outputs).map(k=>networkDescriptor(k)?.name||recipes.find(x=>x.id===k)?.name||names[symbols.indexOf(k)]||k).join(' ')}));
 for(const p of Object.values(oxidationProfiles))rows.push({equation:oxidationEquation(p),kind:'원소 산화',condition:'실제 O₂ · 접촉·온도·산화막 근사',text:names[symbols.indexOf(p.element)]});
 for(const r of chemicalReactions)rows.push({equation:r.label,kind:'연소',condition:'혼합물 '+r.activation+' K 이상 · 점화 지연',text:r.inputs.join(' ')});
 for(const [s,d] of Object.entries(reactiveMetals))rows.push({equation:(d.q===1?'2':'')+s+' + 2H2O → '+(d.q===1?'2':'')+d.hydroxide+' + H2',kind:'금속·물',condition:'액체 물 · '+d.activity,text:names[symbols.indexOf(s)]});
 return rows;
}
function renderReactionBook(){
 const q=$('reactionSearch').value.trim().toLowerCase(),kind=$('reactionKind').value;
 const all=reactionBookEntries(),rows=all.filter(r=>(!kind||r.kind===kind)&&(!q||(r.equation+' '+r.kind+' '+r.text).toLowerCase().includes(q)));
 $('reactionBookCount').textContent=rows.length+' / '+all.length+'개 등록 경로 · 물질 '+recipes.length+'종';
 const body=$('reactionRows');body.replaceChildren(...rows.slice(0,100).map(r=>{
  const tr=document.createElement('tr');for(const value of [r.equation,r.kind,r.condition]){const td=document.createElement('td');td.textContent=value;tr.append(td);}return tr;
 }));
 $('reactionMore').hidden=rows.length<=100;
}
function bindReactionBook(){
 for(const [id,k] of Object.entries(reactionKits)){const o=document.createElement('option');o.value=id;o.textContent=k.name;$('reactionKit').append(o);}
 $('placeReactionKit').onclick=placeReactionKit;
 for(const k of [...new Set(reactionBookEntries().map(r=>r.kind))]){const o=document.createElement('option');o.value=k;o.textContent=k;$('reactionKind').append(o);}
 $('openReactions').onclick=()=>{renderReactionBook();$('reactionDialog').showModal();};
 $('closeReactions').onclick=()=>$('reactionDialog').close();
 $('reactionSearch').oninput=renderReactionBook;$('reactionKind').onchange=renderReactionBook;
 $('networkSummary').textContent=recipes.length+'종 물질 · '+reactionBookEntries().length+'개 등록 경로';
}
const reactionKits={
 precipitate:{name:'질산 은 + 염화 나트륨 · 흰 침전',types:['AgNO3','NaCl',...Array(10).fill('H2O')],t:300},
 sulfate:{name:'염화 바륨 + 황산 나트륨 · 침전',types:['BaCl2','Na2SO4',...Array(10).fill('H2O')],t:300},
 carbonate:{name:'탄산 칼슘 + 염산 · CO₂',types:['CaCO3','HCl','HCl',...Array(10).fill('H2O')],t:300},
 ethanol:{name:'에탄올 + 산소 · 연소',types:['C2H5OH','O2','O2','O2'],t:1000},
 decomposition:{name:'탄산 칼슘 · 열분해',types:['CaCO3'],t:1200},
 acid:{name:'염산 + 아세트산 나트륨 · 약산',types:['HCl','CH3COONa',...Array(10).fill('H2O')],t:300}
};
function placeReactionKit(){
 if(!developerMode){notify('실험 키트는 개발자 모드에서 사용할 수 있어요.');return;}
 const kit=reactionKits[$('reactionKit').value];if(!kit)return;
 const needed=kit.types.reduce((s,id)=>s+networkDescriptor(id).atoms.length,0);
 if(atoms.length+needed>6000){notify('입자 한도를 넘어요. 공간을 비워 주세요.');return;}
 const box=bounds(),x=(box.left+box.right)/2,y=(box.top+box.bottom)/2;
 // Add a paused kit to the existing world; never clear the player's particles
 // or heat unrelated objects. Existing world state is preserved.
 paused=true;$('pause').textContent='▶ 재생';setTemp(kit.t);
 kit.types.forEach((id,i)=>add(id,x+(i%4-1.5)*4,y+(Math.floor(i/4)-1)*4));
 updatePhases();$('reactionDialog').close();notify(kit.name+' 배치 완료 · 재생을 눌러 관찰하세요.');
}
