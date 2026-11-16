'use strict';
// Curated chemical families, not arbitrary Cartesian products of elements.
// Formula balancing alone does not prove a substance is stable or a reaction
// possible. Pair exclusions and directional reaction rules are essential.
const networkSpecies={},networkIons={},networkSalts={},networkRules=[],networkRuleIndex=new Map();
const networkCations={
 'Li+':['Li',1],'Na+':['Na',1],'K+':['K',1],'Rb+':['Rb',1],'Cs+':['Cs',1],
 'Mg2+':['Mg',2],'Ca2+':['Ca',2],'Sr2+':['Sr',2],'Ba2+':['Ba',2],
 'Al3+':['Al',3],'Zn2+':['Zn',2],'Fe2+':['Fe',2],'Fe3+':['Fe',3],
 'Mn2+':['Mn',2],'Co2+':['Co',2],'Ni2+':['Ni',2],'Cu2+':['Cu',2],
 'Ag+':['Ag',1],'Pb2+':['Pb',2]
};
const networkAnions={
 'S^2-':{formula:'S',atoms:['S'],q:-2,name:'황화'},
 'HS-':{formula:'HS',atoms:['H','S'],q:-1,name:'황화수소'},
 'F-':{formula:'F',atoms:['F'],q:-1,name:'플루오린화'},
 'Cl-':{formula:'Cl',atoms:['Cl'],q:-1,name:'염화'},
 'Br-':{formula:'Br',atoms:['Br'],q:-1,name:'브로민화'},
 'I-':{formula:'I',atoms:['I'],q:-1,name:'아이오딘화'},
 'NO3-':{formula:'NO3',atoms:['N','O','O','O'],q:-1,name:'질산'},
 'SO4^2-':{formula:'SO4',atoms:['S','O','O','O','O'],q:-2,name:'황산'},
 'CO3^2-':{formula:'CO3',atoms:['C','O','O','O'],q:-2,name:'탄산'},
 'PO4^3-':{formula:'PO4',atoms:['P','O','O','O','O'],q:-3,name:'인산'},
 'OH-':{formula:'OH',atoms:['O','H'],q:-1,name:'수산화'},
 'CH3COO-':{formula:'CH3COO',atoms:['C','H','H','H','C','O','O'],q:-1,name:'아세트산'},
 'HCO3-':{formula:'HCO3',atoms:['H','C','O','O','O'],q:-1,name:'탄산수소'},
 'HSO4-':{formula:'HSO4',atoms:['H','S','O','O','O','O'],q:-1,name:'황산수소'},
 'H2PO4-':{formula:'H2PO4',atoms:['H','H','P','O','O','O','O'],q:-1,name:'인산이수소'},
 'HPO4^2-':{formula:'HPO4',atoms:['H','P','O','O','O','O'],q:-2,name:'인산수소'},
 'HCOO-':{formula:'HCOO',atoms:['H','C','O','O'],q:-1,name:'폼산'}
};
function networkDef(id,atoms,options={}){
 const d={id,atoms,pattern:Array(atoms.length).fill(0),category:'물질',...options};
 networkSpecies[id]=d;return d;
}
function localizedPattern(atoms,q){
 const result=Array(atoms.length).fill(0);
 const candidates=atoms.map((s,i)=>({s,i})).sort((a,b)=>(a.s==='O'?-1:0)-(b.s==='O'?-1:0));
 let remaining=Math.abs(q);
 for(const {i} of candidates){const n=Math.min(1,remaining);result[i]=Math.sign(q)*n;remaining-=n;if(!remaining)break;}
 if(remaining)result[0]+=Math.sign(q)*remaining;
 return result;
}
function networkIon(id,atoms,q,options={}){
 const d=networkDef(id,atoms,{kind:'ion',q,pattern:localizedPattern(atoms,q),category:atoms.length>1?'다원자 이온':'단원자 이온',...options});
 networkIons[id]=d;return d;
}
function saltAllowed(c,a){
 const metal=networkIons[c].formula;
 if(a==='S^2-'&&!['Li','Na','K','Zn','Fe','Cu','Ag','Pb'].includes(metal))return false;
 if(a==='S^2-'&&c==='Fe3+')return false;
 if(a==='HS-'&&!['Na','K','NH4'].includes(metal))return false;
 if(a==='F-'&&!['Li','Na','K','Rb','Cs','Mg','Ca','Sr','Ba','Al','Ag','Pb','NH4'].includes(metal))return false;
 if(a==='OH-'&&['Ag','NH4'].includes(metal))return false;
 if(a==='CH3COO-'&&['Al3+','Fe3+'].includes(c))return false;
 if(a==='I-'&&['Cu2+','Fe3+'].includes(c))return false; // redox, not CuI2 or FeI3
 if(a==='CO3^2-'&&!['Li','Na','K','Rb','Cs','Mg','Ca','Sr','Ba','Zn','Mn','Ag','Pb','NH4'].includes(metal))return false;
 if(['HCO3-','HSO4-','H2PO4-','HPO4^2-','HCOO-'].includes(a)&&!['Na','K','NH4'].includes(metal))return false;
 return true;
}
function saltSolubility(c,a){
 const metal=networkIons[c].formula;
 if(metal==='Ag'&&a==='CH3COO-')return 'sparingly';
 if(['Na','K','Rb','Cs','NH4'].includes(metal)||['NO3-','CH3COO-','HCOO-'].includes(a))return 'soluble';
 if(metal==='Li')return ['CO3^2-','F-'].includes(a)?'sparingly':a==='PO4^3-'?'insoluble':'soluble';
 if(['Cl-','Br-','I-'].includes(a))return metal==='Ag'||metal==='Pb'&&a==='I-'?'insoluble':metal==='Pb'?'sparingly':'soluble';
 if(a==='F-')return ['Mg','Ca','Sr','Ba','Al','Pb'].includes(metal)?'insoluble':'soluble';
 if(a==='SO4^2-')return ['Sr','Ba','Pb'].includes(metal)?'insoluble':['Ca','Ag'].includes(metal)?'sparingly':'soluble';
 if(a==='OH-')return metal==='Ba'?'soluble':['Ca','Sr'].includes(metal)?'sparingly':'insoluble';
 return ['CO3^2-','PO4^3-','S^2-'].includes(a)?'insoluble':'soluble';
}
function networkFormulaPart(ion,n){return n===1?ion.formula:(ion.atoms.length>1?'('+ion.formula+')':ion.formula)+n;}
function networkDescriptor(id){
 if(networkSpecies[id])return networkSpecies[id];
 if(symbols.includes(id))return {id,atoms:[id],pattern:[0]};
 const r=recipes.find(r=>r.id===id);if(!r)return null;
 return {id,atoms:r.atoms,pattern:acidBasePattern(id)||oxideData[id]?.pattern||(saltData[id]?[saltData[id].q,...Array(saltData[id].q).fill(-1)]:Array(r.atoms.length).fill(0))};
}
function networkRule(id,inputs,outputs,options={}){
 const sides=[inputs,outputs].map(list=>{
  const counts={};let q=0;
  for(const type of list){const d=networkDescriptor(type);if(!d)throw Error(id+': unknown '+type);
   for(const s of d.atoms)counts[s]=(counts[s]||0)+1;q+=d.pattern.reduce((n,v)=>n+v,0);
  }return JSON.stringify([Object.entries(counts).sort(),q]);
 });
 if(sides[0]!==sides[1])throw Error('Unbalanced reaction: '+id);
 const r={id,inputs,outputs,min:10,max:5000,rate:2,heat:0,family:'합성',...options};
 r.label=networkEquation(inputs)+' → '+networkEquation(outputs);networkRules.push(r);
 if(!networkRuleIndex.has(inputs[0]))networkRuleIndex.set(inputs[0],[]);
 networkRuleIndex.get(inputs[0]).push(r);return r;
}
function networkEquation(side){
 const counts=new Map();for(const s of side)counts.set(s,(counts.get(s)||0)+1);
 return [...counts].map(([s,n])=>(n===1?'':n)+s).join(' + ');
}
function registerReactionNetwork(){
 for(const [id,[symbol,q]] of Object.entries(networkCations))networkIon(id,[symbol],q,{formula:symbol,name:names[symbols.indexOf(symbol)]+'('+q+'+)'});
 networkIon('H+',['H'],1,{formula:'H',name:'수소 이온'});
 networkIon('NH4+',['N','H','H','H','H'],1,{formula:'NH4',pattern:[0,0,0,0,1],name:'암모늄 이온'});
 for(const [id,d] of Object.entries(networkAnions))networkIon(id,d.atoms,d.q,{...d,name:d.name+' 이온'});
 // Keep the existing hydroxide localization and water-proton conventions.
 networkSpecies['OH-'].pattern=[-1,0];
 const cations=[...Object.keys(networkCations),'NH4+'];
 for(const c of cations)for(const a of Object.keys(networkAnions)){
  if(!saltAllowed(c,a))continue;
  const ci=networkIons[c],an=networkIons[a],g=oxideGcd(ci.q,-an.q),nc=-an.q/g,na=ci.q/g;
  const id=['CH3COO-','HCOO-'].includes(a)&&nc===1&&na===1?an.formula+ci.formula:networkFormulaPart(ci,nc)+networkFormulaPart(an,na),parts=[...Array(nc).fill(c),...Array(na).fill(a)];
  const memberAtoms=parts.flatMap(k=>networkIons[k].atoms),pattern=parts.flatMap(k=>networkIons[k].pattern);
  const existing=recipes.find(r=>r.id===id);
  const d=networkDef(id,memberAtoms,{pattern,kind:'salt',parts,cation:c,anion:a,solubility:saltSolubility(c,a),name:an.name+' '+(names[symbols.indexOf(ci.formula)]||'암모늄')+(ci.q>1?'('+ci.q+'+)':''),category:a==='OH-'?'염기':'염',legacy:!!existing,room:'solid'});
  // Existing salts/bases keep their original atom order and localized charges.
  if(existing){d.atoms=existing.atoms;d.pattern=acidBasePattern(id)||(saltData[id]?[saltData[id].q,...Array(saltData[id].q).fill(-1)]:d.pattern);}
  networkSalts[id]=d;
 }
 const simple={
 F2:['플루오린 분자',['F','F'],'gas'],Cl2:['염소 분자',['Cl','Cl'],'gas'],Br2:['브로민 분자',['Br','Br'],'liquid'],I2:['아이오딘 분자',['I','I'],'solid'],
 HF:['플루오린화 수소',['F','H'],'gas'],HI:['아이오딘화 수소',['I','H'],'gas'],
 CO:['일산화탄소',['C','O'],'gas'],NO:['일산화질소',['N','O'],'gas'],NO2:['이산화질소',['N','O','O'],'gas'],N2O:['아산화질소',['N','N','O'],'gas'],
 H2S:['황화 수소',['S','H','H'],'gas'],
 H2O2:['과산화 수소',['O','O','H','H'],'liquid'],H2CO3:['탄산 · 수용액 형식종',['C','O','O','O','H','H'],'unknown'],
 HNO3:['질산 · 묽은 수용액 모델',['N','O','O','O','H'],'liquid'],H2SO4:['황산 · 묽은 수용액 모델',['S','O','O','O','O','H','H'],'liquid'],
 H3PO4:['인산',['P','O','O','O','O','H','H','H'],'solid'],
 HCOOH:['폼산',['C','O','O','H','H'],'liquid'],CH3COOH:['아세트산',['C','C','O','O','H','H','H','H'],'liquid'],
 MnO2:['이산화 망가니즈',['Mn','O','O'],'solid'],Ag2O:['산화 은',['Ag','Ag','O'],'solid'],CuI:['아이오딘화 구리(I)',['Cu','I'],'solid']
 };
 for(const [id,[name,list,room]] of Object.entries(simple))networkDef(id,list,{name,room,category:id.startsWith('H')&&['HF','HI','HNO3','H2SO4','H3PO4','H2CO3','HCOOH','CH3COOH'].includes(id)?'산':'분자'});
 Object.assign(networkSpecies.MnO2,{pattern:[4,-2,-2],kind:'oxide'});
 Object.assign(networkSpecies.Ag2O,{pattern:[1,1,-2],kind:'oxide'});
 Object.assign(networkSpecies.CuI,{pattern:[1,-1],kind:'solid',category:'염'});
 // Neutral molecular formation is limited to small, selected species. Organic
 // formulas are never allowed to assemble magically from an arbitrary atom bag.
 for(const [id,energy,gate] of [['F2',1.6,2200],['Cl2',2.5,3000],['Br2',2,2500],['I2',1.5,2000],['HF',5.9,5000],['HI',3.1,3000],['CO',11.1,6000],['NO',6.5,4000]]){
  chemicalProperties[id]={energy,dissociation:gate};networkSpecies[id].formAtoms=true;
 }
 // Room-state data is intentionally narrow; unregistered transitions say unknown.
 // These homologous families are representative straight-chain compounds, not isomers.
 const fuel=(id,c,h,o,name,room)=>networkDef(id,[...Array(c).fill('C'),...Array(h).fill('H'),...Array(o).fill('O')],{name,room,category:'유기물',fuel:{c,h,o}});
 const alkaneNames=['','','에테인','프로페인','뷰테인','펜테인','헥세인','헵테인','옥테인','노네인','데케인','운데케인','도데케인'];
 for(let n=2;n<=12;n++)fuel('C'+n+'H'+(2*n+2),n,2*n+2,0,alkaneNames[n],n<=4?'gas':'liquid');
 for(let n=2;n<=8;n++)fuel('C'+n+'H'+(2*n),n,2*n,0,n===2?'에텐':n===3?'프로펜':'1-알켄 · 탄소 '+n,n<=4?'gas':'liquid');
 for(let n=2;n<=6;n++)fuel('C'+n+'H'+(2*n-2),n,2*n-2,0,n===2?'에타인 / 아세틸렌':'1-알카인 · 탄소 '+n,n<=4?'gas':'liquid');
 for(let n=1;n<=6;n++)fuel((n===1?'C':'C'+n)+'H'+(2*n+1)+'OH',n,2*n+2,1,n===1?'메탄올':n===2?'에탄올':'1-알코올 · 탄소 '+n,'liquid');
 fuel('C6H6',6,6,0,'벤젠','liquid');fuel('C3H6O',3,6,1,'아세톤','liquid');
 fuel('C6H12O6',6,12,6,'포도당','solid');fuel('C12H22O11',12,22,11,'설탕 / 수크로스','solid');
 networkSpecies.HCOOH.fuel={c:1,h:2,o:2};networkSpecies.CH3COOH.fuel={c:2,h:4,o:2};
 for(const d of Object.values(networkSpecies)){
  if(!recipes.some(r=>r.id===d.id))recipes.push({id:d.id,name:d.name||d.id,atoms:d.atoms,ionic:d.pattern.some(q=>q!==0),reactionOnly:!d.formAtoms,category:d.category});
 }
 buildNetworkRules();
}
function buildNetworkRules(){
 const rule=networkRule,repeat=(id,n)=>Array(n).fill(id);
 // Actual solvent molecules carry each released proton. Weak pathways are
 // reversible contact models, not calibrated equilibrium constants or pH.
 const acids=[['H2S','HS-',.01],['HS-','S^2-',.0005],['HI','I-',3],['HF','F-',.08],['HNO3','NO3-',3],['H2SO4','HSO4-',3],['HSO4-','SO4^2-',.4],['H3PO4','H2PO4-',.1],['H2PO4-','HPO4^2-',.015],['HPO4^2-','PO4^3-',.002],['H2CO3','HCO3-',.04],['HCO3-','CO3^2-',.004],['CH3COOH','CH3COO-',.04],['HCOOH','HCOO-',.06]];
 for(const [acid,base,rate] of acids){
  rule('acid:'+acid,[acid,'H2O'],[base,'H3O+'],{aqueous:true,max:373,rate,family:'산 해리'});
  if(rate<1){
   rule('acid-reverse:'+acid,[base,'H3O+'],[acid,'H2O'],{aqueous:true,max:373,rate:2,family:'약산 평형 근사'});
   rule('base-hydrolysis:'+base,[base,'H2O'],[acid,'OH-'],{aqueous:true,max:373,rate:Math.min(.03,.001/rate),family:'가수분해'});
  }
  rule('acid-oh:'+acid,[acid,'OH-'],[base,'H2O'],{aqueous:true,max:373,rate:5,heat:.4,family:'중화'});
 }
 rule('ammonia-water',['NH3','H2O'],['NH4+','OH-'],{aqueous:true,max:373,rate:.04,family:'약염기 평형 근사'});
 rule('ammonium-hydrolysis',['NH4+','H2O'],['NH3','H3O+'],{aqueous:true,max:373,rate:.01,family:'가수분해'});
 rule('calcium-bicarbonate',['CaCO3','CO2','H2O'],['Ca2+','HCO3-','HCO3-'],{aqueous:true,max:373,rate:.2,family:'탄산염 용해'});
 rule('ammonium-hydroxide',['NH4+','OH-'],['NH3','H2O'],{aqueous:true,max:373,rate:4,family:'암모니아 생성'});
 rule('ammonia-acid',['NH3','H3O+'],['NH4+','H2O'],{aqueous:true,max:373,rate:5,heat:.4,family:'중화'});
 rule('carbonate-acid',['CO3^2-','H3O+','H3O+'],['CO2','H2O','H2O','H2O'],{aqueous:true,max:373,rate:5,family:'기체 발생'});
 rule('bicarbonate-acid',['HCO3-','H3O+'],['CO2','H2O','H2O'],{aqueous:true,max:373,rate:5,family:'기체 발생'});
 rule('carbonic-decomposition',['H2CO3'],['CO2','H2O'],{aqueous:true,max:373,rate:.25,family:'탄산 평형 근사'});
 rule('carbonic-hydration',['CO2','H2O'],['H2CO3'],{aqueous:true,max:373,rate:.01,family:'탄산 평형 근사'});
 rule('co2-hydroxide',['CO2','OH-'],['HCO3-'],{aqueous:true,max:373,rate:2,family:'산성 산화물 중화'});
 rule('bicarbonate-hydroxide',['HCO3-','OH-'],['CO3^2-','H2O'],{aqueous:true,max:373,rate:2,family:'중화'});
 rule('hydrogen-sulfur',['S','H2'],['H2S'],{min:600,rate:1,family:'분자 합성'});
 rule('sulfide-hydrolysis',['S^2-','H2O'],['HS-','OH-'],{aqueous:true,max:373,rate:2,family:'가수분해'});
 rule('ammonium-chloride',['NH3','HCl'],['NH4Cl'],{max:500,rate:2,heat:.5,family:'염 합성'});
 // Insoluble carbonate/hydroxide solids dissolve by acid, without first
 // pretending that their ions are freely soluble in water.
 for(const d of Object.values(networkSalts)){
  if(d.solubility==='soluble')continue;
  const an=d.parts.filter(i=>i===d.anion).length,cat=d.parts.filter(i=>i===d.cation);
  if(d.anion==='CO3^2-')rule('solid-carbonate:'+d.id,[d.id,...repeat('H3O+',2*an)],[...cat,...repeat('CO2',an),...repeat('H2O',3*an)],{aqueous:true,max:373,rate:3,family:'탄산염·산 반응'});
  if(d.anion==='S^2-'&&['Zn2+','Fe2+','Pb2+'].includes(d.cation))rule('sulfide-acid:'+d.id,[d.id,...repeat('H3O+',2*an)],[...cat,...repeat('H2S',an),...repeat('H2O',2*an)],{aqueous:true,max:373,rate:1,family:'기체 발생'});
  if(d.anion==='OH-')rule('solid-hydroxide:'+d.id,[d.id,...repeat('H3O+',an)],[...cat,...repeat('H2O',2*an)],{aqueous:true,max:373,rate:3,heat:.4*an,family:'염기·산 중화'});
 }
 for(const d of Object.values(networkSalts)){
  // Legacy dissolution remains owned by the earlier modules for save compatibility.
  if(!d.legacy&&d.solubility!=='insoluble')rule('dissolve:'+d.id,[d.id],d.parts,{aqueous:true,max:373,rate:3,family:'염 해리',saltAction:'dissolve',salt:d.id});
  rule('crystal:'+d.id,d.parts,[d.id],{max:900,rate:3,family:'염 생성·침전',saltAction:'crystal',salt:d.id});
 }
 for(const d of Object.values(networkSalts)){
  if(!['F-','Cl-','Br-','I-'].includes(d.anion)||d.cation==='NH4+'||d.cation==='Fe2+')continue;
  const c=networkIons[d.cation],a=networkIons[d.anion],na=d.parts.filter(k=>k===d.anion).length,nc=d.parts.length-na,copies=2/oxideGcd(na,2);
  rule('metal-halogen:'+d.id,[...repeat(c.formula,nc*copies),...repeat(a.formula+'2',na*copies/2)],repeat(d.id,copies),{min:reactiveMetals[c.formula]?100:450,rate:1,heat:copies*.6,family:'금속·할로젠 합성'});
 }
 for(const c of ['Al3+','Fe3+']){
  const hydroxide=c==='Al3+'?'Al(OH)3':'Fe(OH)3';
  rule('trivalent-carbonate:'+c,[c,c,'CO3^2-','CO3^2-','CO3^2-','H2O','H2O','H2O'],[hydroxide,hydroxide,'CO2','CO2','CO2'],{aqueous:true,max:373,rate:3,family:'가수분해·침전'});
  rule('trivalent-hydrolysis:'+c,[c,...repeat('H2O',6)],[hydroxide,...repeat('H3O+',3)],{aqueous:true,max:373,rate:.02,family:'가수분해'});
 }
 rule('ferric-iron',['Fe3+','Fe3+','Fe'],['Fe2+','Fe2+','Fe2+'],{aqueous:true,max:373,rate:2,family:'산화·환원'});
 rule('ferric-copper',['Fe3+','Fe3+','Cu'],['Fe2+','Fe2+','Cu2+'],{aqueous:true,max:373,rate:2,family:'산화·환원'});
 rule('silver-oxide-acid',['Ag2O','H3O+','H3O+'],['Ag+','Ag+','H2O','H2O','H2O'],{aqueous:true,max:373,rate:3,family:'산화물 중화'});
 // Familiar directional decomposition reactions; thresholds are game settings.
 for(const [carbonate,oxide,gate] of [['CaCO3','CaO',1100],['MgCO3','MgO',700],['ZnCO3','ZnO',600],['SrCO3','SrO',1400],['BaCO3','BaO',1600],['PbCO3','PbO',650]]){
  rule('carbonate-heat:'+carbonate,[carbonate],[oxide,'CO2'],{min:gate,rate:1,heat:-1,family:'열분해'});
 }
 for(const [base,oxide,water,gate] of [['Mg(OH)2','MgO',1,650],['Cu(OH)2','CuO',1,400],['Zn(OH)2','ZnO',1,450],['Ca(OH)2','CaO',1,850]]){
  rule('hydroxide-heat:'+base,[base],[oxide,...repeat('H2O',water)],{min:gate,rate:2,heat:-.5,family:'열분해'});
 }
 for(const [base,oxide,gate] of [['Fe(OH)3','Fe2O3',600],['Al(OH)3','Al2O3',650]])rule('trihydroxide-heat:'+base,[base,base],[oxide,'H2O','H2O','H2O'],{min:gate,rate:1,heat:-1,family:'열분해'});
 for(const [oxide,base] of [['CaO','Ca(OH)2'],['SrO','Sr(OH)2'],['BaO','Ba(OH)2']])rule('oxide-water:'+oxide,[oxide,'H2O'],[base],{aqueous:true,max:373,rate:2,heat:.8,family:'산화물·물 반응'});
 rule('lithium-oxide-water',['Li2O','H2O'],['LiOH','LiOH'],{aqueous:true,max:373,rate:2,heat:.6,family:'산화물·물 반응'});
 rule('peroxide-water',['Na2O2','H2O','H2O'],['NaOH','NaOH','H2O2'],{aqueous:true,max:373,rate:2,heat:.6,family:'과산화물·물 반응'});
 for(const s of ['K','Rb','Cs'])rule('superoxide-water:'+s,[...repeat(s+'O2',4),'H2O','H2O'],[...repeat(s+'OH',4),'O2','O2','O2'],{aqueous:true,max:373,rate:2,heat:1,family:'초과산화물·물 반응'});
 rule('ammonium-chloride-heat',['NH4Cl'],['NH3','HCl'],{min:650,rate:1,family:'열분해'});
 rule('ammonium-carbonate-heat',['(NH4)2CO3'],['NH3','NH3','CO2','H2O'],{min:400,rate:1,family:'열분해'});
 rule('peroxide-decomposition',['H2O2','H2O2'],['H2O','H2O','O2'],{min:290,rate:.03,catalysts:['MnO2','Fe','Cu'],catalystBoost:80,heat:2,family:'과산화물 분해'});
 rule('silver-hydroxide',['Ag+','Ag+','OH-','OH-'],['Ag2O','H2O'],{aqueous:true,max:373,rate:5,family:'침전'});
 rule('copper-iodide',['Cu2+','Cu2+','I-','I-','I-','I-'],['CuI','CuI','I2'],{aqueous:true,max:373,rate:4,family:'산화·환원 침전'});
 rule('ferric-iodide',['Fe3+','Fe3+','I-','I-'],['Fe2+','Fe2+','I2'],{aqueous:true,max:373,rate:4,family:'산화·환원'});
 // Explicit dilute nitrate pathway; old proton-to-H2 displacement is inhibited
 // nearby. Concentrated acid, passive films and NOx equilibrium are not modeled.
 rule('copper-dilute-nitric',['Cu','Cu','Cu','NO3-','NO3-',...repeat('H3O+',8)],['Cu2+','Cu2+','Cu2+','NO','NO',...repeat('H2O',12)],{aqueous:true,max:373,rate:2,family:'묽은 질산 산화'});
 rule('silver-dilute-nitric',['Ag','Ag','Ag','NO3-',...repeat('H3O+',4)],['Ag+','Ag+','Ag+','NO',...repeat('H2O',6)],{aqueous:true,max:373,rate:2,family:'묽은 질산 산화'});
 rule('nitric-oxide-oxidation',['NO','NO','O2'],['NO2','NO2'],{rate:2,heat:.5,family:'기체 산화'});
 rule('nitrogen-dioxide-water',['NO2','NO2','NO2','H2O'],['HNO3','HNO3','NO'],{aqueous:true,max:373,rate:.5,family:'기체·물 반응'});
 for(const halogen of ['F','Cl','Br','I'])rule('hydrogen-halogen:'+halogen,['H2',halogen+'2'],['H'+halogen,'H'+halogen],{min:halogen==='F'?90:halogen==='Cl'?500:600,rate:2,heat:.6,family:'분자 합성'});
 for(const [oxidant,reduced] of [['Cl','Br'],['Cl','I'],['Br','I']])rule('halogen-displacement:'+oxidant+reduced,[oxidant+'2',reduced+'-',reduced+'-'],[oxidant+'-',oxidant+'-',reduced+'2'],{aqueous:true,max:373,rate:3,family:'할로젠 치환'});
 rule('carbon-monoxide-burn',['CO','CO','O2'],['CO2','CO2'],{min:850,rate:2,heat:5.8,family:'연소',combustion:true});
 rule('haber',['N2','H2','H2','H2'],['NH3','NH3'],{min:650,max:850,pressure:20,catalysts:['Fe'],requireCatalyst:true,rate:.6,heat:.9,family:'촉매 합성'});
 rule('methanol-synthesis',['CO','H2','H2'],['CH3OH'],{min:500,max:800,pressure:10,catalysts:['Cu','ZnO'],requireCatalyst:true,rate:.5,heat:.8,family:'촉매 합성'});
 rule('methanation-co',['CO','H2','H2','H2'],['CH4','H2O'],{min:550,max:1000,catalysts:['Ni'],requireCatalyst:true,rate:.5,heat:2,family:'촉매 합성'});
 rule('methanation-co2',['CO2','H2','H2','H2','H2'],['CH4','H2O','H2O'],{min:550,max:1000,catalysts:['Ni'],requireCatalyst:true,rate:.5,heat:1.7,family:'촉매 합성'});
 for(const d of Object.values(networkSpecies))if(d.fuel){
  const {c,h,o}=d.fuel,oxygen4=4*c+h-2*o,copies=4/oxideGcd(oxygen4,4);
  rule('fuel:'+d.id,[...repeat(d.id,copies),...repeat('O2',oxygen4*copies/4)],[...repeat('CO2',c*copies),...repeat('H2O',h*copies/2)],{min:800,rate:2,heat:Math.max(1,(c*4+h*.5-o)*copies),family:'유기물 연소',combustion:true});
 }
}
