'use strict';

// Lightweight vector specimens: symbolic illustrations, not storage guidance.
const specimenFamilies={
 alkali:'Li Na K Rb Cs Fr'.split(' '),earth:'Be Mg Ca Sr Ba Ra'.split(' '),
 halogen:'F Cl Br I At Ts'.split(' '),noble:'He Ne Ar Kr Xe Rn Og'.split(' '),
 nonmetal:'H B C N O Si P S Ge As Se Sb Te Po'.split(' '),
 rare:'La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr'.split(' ')
};
let draggedSpecimen=null;
function specimenFamily(id){return Object.keys(specimenFamilies).find(key=>specimenFamilies[key].includes(id))||'metal';}
function specimenLook(id){
 const z=symbols.indexOf(id)+1,family=specimenFamily(id),recipe=recipes.find(r=>r.id===id);
 const gas=['H','He','N','O','F','Ne','Cl','Ar','Kr','Xe','Rn','H2','O2','N2','CO2','CH4','NH3','HCl','HBr','SO2'].includes(id);
 const liquid=['Hg','Br','H2O'].includes(id);
 const sampleColors={C:'#4e514b',S:'#dfbe43',P:'#bd714a',Cu:'#bb7951',Au:'#d6b361',Ag:'#d8d7c8',Hg:'#b9c8c7',Br:'#b15b33',I:'#7c627d',Cl:'#b7c15c',F:'#d7cd6a',O:'#a7c2cd',H:'#c7d6ca',He:'#c3adc8',Ne:'#d4a07c',N:'#a8b9ce',H2O:'#74a9aa',HCl:'#a9c28c',HBr:'#c59c75','OH-':'#b6a0c9','H3O+':'#d6a38b'};
 const oxideColors={Fe2O3:'#ad593e',CuO:'#393c36',Mn3O4:'#4e4339',Co3O4:'#353b3e',NiO:'#75845b',Cr2O3:'#637b47',ZnO:'#e3dfc4',Al2O3:'#dedbc8',MgO:'#ece8d4',SiO2:'#c8d2c7',Na2O2:'#d3cb86',KO2:'#dcb459'};
 const tint=sampleColors[id]||oxideColors[id]||(family==='alkali'?'#c5c5b8':family==='earth'?'#b4c0b0':family==='rare'?'#b0afa1':recipe?'#d2c6a1':family==='nonmetal'?'#b1a99b':'#adb9b8');
 return {z,family,recipe,gas,liquid,tint,seed:Math.max(1,z||id.split('').reduce((s,c)=>s+c.charCodeAt(0),0))};
}
function specimenSVG(id){
 const {z,gas,liquid,tint,seed,recipe}=specimenLook(id);
 const round=gas,body=round?'M34 27 L34 38 C34 44 17 47 17 63 L17 89 Q17 98 28 98 L64 98 Q75 98 75 89 L75 63 C75 47 58 44 58 38 L58 27 Z':'M30 27 L30 38 Q16 41 16 53 L16 89 Q16 98 26 98 L66 98 Q76 98 76 89 L76 53 Q76 41 62 38 L62 27 Z';
 let contents='';
 if(gas){
  contents='<ellipse cx="46" cy="61" rx="23" ry="15" fill="'+tint+'" opacity=".19"/>';
  for(let i=0;i<7;i++){const x=27+(seed*(i+3)*7)%37,y=43+(seed*(i+2)*11)%25,r=1.5+(i%3);contents+='<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="none" stroke="'+tint+'" stroke-width=".9" opacity=".85"/>';}
 }else if(liquid){
  contents='<path d="M22 60 Q32 57 45 61 T70 60 L70 88 Q70 93 64 93 H28 Q22 93 22 88Z" fill="'+tint+'" opacity=".75"/><path d="M23 61 Q37 57 48 62 T69 61" fill="none" stroke="#e8e9d5" opacity=".75"/>';
 }else if(z>103||id==='Fr'){
  contents='<g transform="translate(46 57)" fill="none" stroke="'+tint+'" stroke-width="1"><ellipse rx="19" ry="7"/><ellipse rx="19" ry="7" transform="rotate(60)"/><ellipse rx="19" ry="7" transform="rotate(120)"/><circle r="3" fill="'+tint+'"/></g>';
 }else{
  for(let i=0;i<5;i++){const x=22+(seed*7+i*11)%38,y=48+(seed+i*13)%19,w=8+(seed+i)%6;contents+='<path d="M'+x+' '+y+' l'+(w*.7)+' -5 '+(w*.6)+' 7 -4 10 -'+w+' -2Z" fill="'+tint+'" stroke="#3d4a45" stroke-width=".65"/><path d="M'+x+' '+y+' l'+(w*.9)+' 1 -2 8 M'+(x+w*.9)+' '+(y+1)+' l-2 -6" fill="none" stroke="#fff8dd" opacity=".36" stroke-width=".7"/>';}
 }
 if(recipe&&!gas&&!liquid)contents+='<circle cx="62" cy="54" r="3" fill="none" stroke="'+tint+'"/><path d="M59 53 L53 48" stroke="'+tint+'"/>';
 const size=id.length>5?11:id.length>3?15:22;
 return '<svg class="vial-illustration" viewBox="0 0 92 112" aria-hidden="true" focusable="false"><ellipse cx="46" cy="103" rx="31" ry="4" fill="#110b06" opacity=".32"/><path d="'+body+'" fill="#b6c9bb" fill-opacity=".11" stroke="#c7c8ab" stroke-width="1.3"/><path d="M24 53 V85 Q24 91 29 92 M68 49 V65" fill="none" stroke="#f3efd0" stroke-width="2.2" stroke-linecap="round" opacity=".33"/>'+contents+'<path d="M29 27 L30 15 Q46 11 62 15 L63 27Z" fill="#8c603d" stroke="#3c291d"/><path d="M32 16 L60 16 M32 20 L60 20 M32 24 L60 24" stroke="#bb9660" opacity=".6"/><rect x="27" y="27" width="38" height="6" rx="1" fill="#b7a56a" stroke="#665331"/><rect x="21" y="70" width="50" height="23" rx="1" fill="#eee1bc" stroke="#927b51"/><path d="M24 73 H68 M24 90 H68" stroke="#bdac83" stroke-width=".6"/><text x="46" y="87" fill="#3f493d" text-anchor="middle" font-family="Georgia,serif" font-size="'+size+'" font-weight="bold">'+id.replace(/</g,'&lt;')+'</text></svg>';
}
function updateSelectionDisplay(){
 const name=names[symbols.indexOf(selected)]||recipes.find(r=>r.id===selected)?.name||selected;
 $('selectedVial').innerHTML=specimenSVG(selected);
 $('selectedName').textContent=name;
 $('selectedSymbol').textContent=selected;
 $('selection').textContent=selected+' · '+name+' 배치';
 $('selectionNote').textContent='선반에서 꺼낸 시약 · 실험대에 그려 보세요';
 const combustionHints={CH4:'CH₄ + 2O₂ → CO₂ + 2H₂O\n혼합물 약 810 K (537 °C)부터 점화 지연 후 연소. 먼저 1,000 K에서 시험해 보세요.',H2:'2H₂ + O₂ → 2H₂O\n혼합물 약 833 K (560 °C)부터 점화 지연 후 연소.',O2:'연소에는 실제 O₂ 분자가 필요해요.\nCH₄ : O₂ = 1 : 2 · H₂ : O₂ = 2 : 1\n뜨거운 연료만 놓기보다 혼합물을 함께 가열하세요.'};
 $('combustionHint').hidden=!combustionHints[selected];$('combustionHint').textContent=combustionHints[selected]||'';
 oxidationHint();
}
function selectSpecimen(id){
 if(!developerMode&&!known.has(id)&&!discovered.has(id))return;
 selected=id;setTool('place');catalog();updateAtomicControls();
}
function renderShelfCatalog(){
 const entries=tab==='elements'?symbols.map((s,i)=>({id:s,name:names[i],number:i+1,open:known.has(s)})):recipes.map(r=>({...r,open:discovered.has(r.id)}));
 const query=$('search').value.trim().toLowerCase(),family=$('familyFilter').value||'all',availableOnly=$('availableOnly').checked;
 const shown=entries.filter(e=>(e.id+' '+e.name).toLowerCase().includes(query)&&(!availableOnly||e.open||developerMode)&&(tab!=='elements'||family==='all'||specimenFamily(e.id)===family)&&(tab==='elements'||!$('compoundFilter').value||$('compoundFilter').value==='all'||(e.category||'분자')===$('compoundFilter').value));
 const shelf=$('catalog'),scroll=shelf.scrollLeft||0;
 shelf.replaceChildren(...shown.map(e=>{
  const b=document.createElement('button'),available=e.open||developerMode;
  b.className='specimen'+(selected===e.id?' selected':'')+(!available?' locked':'');
  b.disabled=!available;b.draggable=available;b.title=e.id+' · '+e.name+(available?' · 선택하거나 실험대로 끌어 놓기':' · 아직 발견하지 못한 시약');
  b.setAttribute('aria-label',e.id+' '+e.name+(!available?' · 미발견':''));b.setAttribute('aria-pressed',String(selected===e.id));
  b.innerHTML='<span class="specimen-number">'+(e.number?'No. '+String(e.number).padStart(3,'0'):(e.category||'분자'))+'</span>'+specimenSVG(e.id)+'<span class="specimen-name">'+e.name+'</span><span class="specimen-state">'+(!available?'미발견':selected===e.id?'꺼내는 중':'선택하기')+'</span>';
  b.onclick=()=>selectSpecimen(e.id);
  b.ondragstart=event=>{draggedSpecimen=e.id;event.dataTransfer.setData('text/plain',e.id);event.dataTransfer.effectAllowed='copy';$('workspace').classList.add('receiving');};
  b.ondragend=()=>{draggedSpecimen=null;$('workspace').classList.remove('receiving');hover=null;};
  return b;
 }));
 shelf.scrollLeft=scroll;$('shelfEmpty').hidden=shown.length>0;$('familyFilter').disabled=tab!=='elements';$('compoundFilter').hidden=tab==='elements';
 $('discoveryCount').textContent='원소 '+known.size+' / 118 · 물질 '+discovered.size+' / '+recipes.length;
 $('shelfResult').textContent=shown.length+'개의 시약';
}
function bindLaboratory(){
 $('compoundFilter').onchange=()=>{catalog();$('catalog').scrollLeft=0;};
 $('familyFilter').onchange=()=>{catalog();$('catalog').scrollLeft=0;};
 $('availableOnly').onchange=()=>{catalog();$('catalog').scrollLeft=0;};
 $('shelfPrev').onclick=()=>$('catalog').scrollBy({left:-400,behavior:'smooth'});
 $('shelfNext').onclick=()=>$('catalog').scrollBy({left:400,behavior:'smooth'});
 canvas.ondragover=event=>{if(draggedSpecimen){event.preventDefault();event.dataTransfer.dropEffect='copy';hover={x:event.clientX,y:event.clientY};}};
 canvas.ondrop=event=>{
  if(!draggedSpecimen)return;event.preventDefault();const id=draggedSpecimen;
  draggedSpecimen=null;$('workspace').classList.remove('receiving');
  if(!developerMode&&!known.has(id)&&!discovered.has(id))return;
  selectSpecimen(id);paint(event);hover=null;notify(id+' 시약을 실험대에 꺼냈어요.');
 };
 updateSelectionDisplay();
}
