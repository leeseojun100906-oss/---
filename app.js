'use strict';
const $=id=>document.getElementById(id);
const symbols='H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'.split(' ');
const names='수소 헬륨 리튬 베릴륨 붕소 탄소 질소 산소 플루오린 네온 나트륨 마그네슘 알루미늄 규소 인 황 염소 아르곤 칼륨 칼슘 스칸듐 타이타늄 바나듐 크로뮴 망가니즈 철 코발트 니켈 구리 아연 갈륨 저마늄 비소 셀레늄 브로민 크립톤 루비듐 스트론튬 이트륨 지르코늄 나이오븀 몰리브데넘 테크네튬 루테늄 로듐 팔라듐 은 카드뮴 인듐 주석 안티모니 텔루륨 아이오딘 제논 세슘 바륨 란타넘 세륨 프라세오디뮴 네오디뮴 프로메튬 사마륨 유로퓸 가돌리늄 터븀 디스프로슘 홀뮴 어븀 툴륨 이터븀 루테튬 하프늄 탄탈럼 텅스텐 레늄 오스뮴 이리듐 백금 금 수은 탈륨 납 비스무트 폴로늄 아스타틴 라돈 프랑슘 라듐 악티늄 토륨 프로트악티늄 우라늄 넵투늄 플루토늄 아메리슘 퀴륨 버클륨 캘리포늄 아인슈타이늄 페르뮴 멘델레븀 노벨륨 로렌슘 러더포듐 더브늄 시보귬 보륨 하슘 마이트너륨 다름슈타튬 뢴트게늄 코페르니슘 니호늄 플레로븀 모스코븀 리버모륨 테네신 오가네손'.split(' ');
const recipes=[{id:'H2O',name:'물',atoms:['O','H','H']},{id:'CO2',name:'이산화탄소',atoms:['C','O','O']},{id:'CH4',name:'메테인',atoms:['C','H','H','H','H']},{id:'NH3',name:'암모니아',atoms:['N','H','H','H']},{id:'HCl',name:'염화 수소 / 염산(수용액)',category:'산',atoms:['Cl','H']},{id:'H2',name:'수소 분자',atoms:['H','H']},{id:'O2',name:'산소 분자',atoms:['O','O']},{id:'N2',name:'질소 분자',atoms:['N','N']}];
for(const [id,s] of Object.entries(saltData))recipes.push({id,name:s.name,atoms:[s.metal,...Array(s.q).fill('Cl')],ionic:true});
recipes.push({id:'HBr',name:'브로민화 수소 / 브로민화 수소산',atoms:['Br','H'],category:'산'});
for(const [id,b] of Object.entries(baseData))recipes.push({id,name:b.name,atoms:[b.metal,...Array.from({length:b.count},()=>['O','H']).flat()],ionic:true,category:'염기'});
recipes.push({id:'OH-',name:'수산화 이온',atoms:['O','H'],ionic:true,category:'다원자 이온'},{id:'H3O+',name:'하이드로늄 이온 / 옥소늄 이온',atoms:['O','H','H','H'],ionic:true,category:'다원자 이온'});
const colors={H:'#d9edb9',He:'#dbb7f3',C:'#9dabb3',O:'#f48670',N:'#85b5ff',Cl:'#77d6a4'};
function color(s){return colors[s]||`hsl(${(symbols.indexOf(s)*47)%360} 60% 67%)`;}
let atoms=[],molecules=[],known=new Set(['H']),discovered=new Set(),selected='H',tab='elements',tool='place',paused=false,zoom=1,cam={x:0,y:0},nextId=1,temperature=300,logs=[],thermalView=false;
let canvas=$('canvas'),ctx=canvas.getContext('2d'),width=0,height=0,pointer=null,hover=null,lastPaint=0,lastTick=0,frames=0,fpsTime=0,simTime=0;
const world={w:1200,h:900};
function notify(message){$('toast').textContent=message;$('toast').style.display='block';clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('toast').style.display='none',3500);}
function record(message){logs.unshift(message);logs=logs.slice(0,4);$('log').replaceChildren(...logs.map(t=>{let p=document.createElement('p');p.textContent=t;return p;}));}
function discover(id){if(developerMode)return;const set=symbols.includes(id)?known:discovered;if(set.has(id))return;set.add(id);record('발견 · '+id);notify('새로운 발견 · '+id);catalog();}
function catalog(){let entries=tab==='elements'?symbols.map((s,i)=>({id:s,name:names[i],number:i+1,open:known.has(s)})):recipes.map(r=>({...r,open:discovered.has(r.id)}));const query=$('search').value.toLowerCase();$('catalog').replaceChildren(...entries.filter(e=>(e.id+' '+e.name).toLowerCase().includes(query)).map(e=>{const b=document.createElement('button');b.className='element'+(selected===e.id?' selected':'');b.disabled=!e.open&&!developerMode;b.title=e.name+(e.open?'':' · 미발견');b.innerHTML='<small>'+(e.number||e.category||(e.ionic?'이온결정':'분자'))+'</small>'+e.id;b.onclick=()=>{selected=e.id;setTool('place');catalog();$('selection').textContent=e.id+' · '+e.name+' 배치';updateAtomicControls();};return b;}));$('discoveryCount').textContent=`원소 ${known.size} / 118 · 물질 ${discovered.size} / ${recipes.length}`;}
function setTool(value){tool=value;document.querySelectorAll('#tools button').forEach(b=>b.classList.toggle('active',b.dataset.tool===value));}
[['place','✦ 배치'],['erase','⌫ 지우기'],['heat','↗ 가열'],['cool','↘ 냉각'],['inspect','⊙ 관찰'],['acidity','◉ 산·염기 관찰'],['pan','✥ 이동'],['ionize','⊕ 전자 제거'],['electron','⊖ 전자 부착']].forEach(([id,text])=>{let b=document.createElement('button');b.textContent=text;b.dataset.tool=id;b.onclick=()=>setTool(id);$('tools').append(b);});setTool('place');
function atom(s,x,y){const a={id:nextId++,s,x:Math.max(4,Math.min(world.w-4,x)),y:Math.max(4,Math.min(world.h-4,y)),vx:0,vy:0,t:temperature,A:defaultMass(s),electrons:protonCount(s)};const angle=Math.random()*Math.PI*2;const speed=thermalSpeed(temperature,mass(a));a.vx=Math.cos(angle)*speed;a.vy=Math.sin(angle)*speed;atoms.push(a);return a;}
function add(s,x,y){const box=bounds();if(x<box.left+3||x>box.right-3||y<box.top+3||y>box.bottom-3)return;const r=recipes.find(r=>r.id===s);const members=r?r.atoms:[s];if(atoms.length+members.length>6000)return;let group=members.map((el,i)=>atom(el,x+(i?Math.cos(i*2.4)*7:0),y+(i?Math.sin(i*2.4)*7:0)));if(r){saltCharges(s,group);acidBaseCharges(s,group);molecules.push({type:s,ids:group.map(a=>a.id)});}else spawnedAtomicState(group[0]);if(classifyPhase(s,temperature)==='solid')for(const a of group)a.vx=a.vy=0;}
function unbond(ids){molecules=molecules.filter(m=>!m.ids.some(id=>ids.has(id)));}
function save(silent=false){try{localStorage.setItem('atom-garden-v1',JSON.stringify({version:3,ambientMedium,phaseView,developerMode,freeElectrons,positrons,freeNeutrons,gravity:$('gravity').checked,thermalView,brushSize:+$('brush').value,confinement,nuclearEnergy,chemicalEnergy,atoms,molecules,known:[...known],discovered:[...discovered],nextId,temperature,logs}));if(!silent)notify('세계와 도감을 이 브라우저에 저장했어요.');}catch{if(!silent)notify('저장 공간에 접근할 수 없어요.');}}
function load(){try{const raw=localStorage.getItem('atom-garden-v1');if(!raw)return;const d=JSON.parse(raw);if(![1,2,3].includes(d.version)||!Array.isArray(d.atoms)||d.atoms.length>6000)return;if(!d.atoms.every(a=>symbols.includes(a.s)&&[a.id,a.x,a.y,a.vx,a.vy].every(Number.isFinite)))return;ambientMedium=d.ambientMedium==='vacuum'?'vacuum':'air';phaseView=d.phaseView===true;thermalView=d.thermalView===true&&!phaseView;$('brush').value=Number.isFinite(d.brushSize)?Math.max(1,Math.min(100,d.brushSize)):6;$('brushValue').textContent=$('brush').value;developerMode=d.developerMode===true;freeElectrons=Number.isSafeInteger(d.freeElectrons)?Math.max(0,d.freeElectrons):0;positrons=Number.isSafeInteger(d.positrons)?Math.max(0,d.positrons):0;freeNeutrons=Number.isSafeInteger(d.freeNeutrons)?Math.max(0,d.freeNeutrons):0;$('gravity').checked=d.gravity===true;atoms=d.atoms;for(const a of atoms){normalizeAtom(a);a.t=Number.isFinite(a.t)?Math.max(10,Math.min(3e9,a.t)):(d.temperature||300);}confinement=Math.max(1,Math.min(100,d.confinement||1));nuclearEnergy=Number.isFinite(d.nuclearEnergy)?d.nuclearEnergy:0;chemicalEnergy=Number.isFinite(d.chemicalEnergy)?d.chemicalEnergy:0;const ids=new Set(atoms.map(a=>a.id));molecules=(d.molecules||[]).filter(m=>recipes.some(r=>r.id===m.type)&&m.ids.every(id=>ids.has(id)));known=new Set((d.known||['H']).filter(s=>symbols.includes(s)));known.add('H');discovered=new Set((d.discovered||[]).filter(s=>recipes.some(r=>r.id===s)));nextId=Math.max(0,...atoms.map(a=>a.id))+1;temperature=Math.min(3e9,Math.max(10,d.temperature||300));logs=d.logs||[];}catch{notify('이전 저장을 읽지 못했어요. 새 세계로 시작합니다.');}}
function setTemp(t,apply=false){temperature=Math.max(10,Math.min(3e9,t));if(apply){for(const a of atoms)thermostat(a,temperature);updatePhases();phaseStats();}$('temp').value=Math.log10(temperature);$('tempValue').textContent=Math.round(temperature).toLocaleString()+' K';}
function worldPos(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left-width/2)/zoom+world.w/2+cam.x,y:(e.clientY-r.top-height/2)/zoom+world.h/2+cam.y};}
function paint(e){const p=worldPos(e),radius=+$('brush').value*2;if(tool==='place'){for(let i=0;i<Math.ceil(radius/4);i++){let angle=Math.random()*Math.PI*2,dist=Math.sqrt(Math.random())*radius;add(selected,p.x+Math.cos(angle)*dist,p.y+Math.sin(angle)*dist);}}else if(tool==='erase'){const ids=new Set(atoms.filter(a=>Math.hypot(a.x-p.x,a.y-p.y)<radius).map(a=>a.id));unbond(ids);atoms=atoms.filter(a=>!ids.has(a.id));}else if(tool==='ionize'||tool==='electron'){for(const a of atoms){if(Math.hypot(a.x-p.x,a.y-p.y)<radius)transferElectron(a,tool==='ionize');}}else if(tool==='heat'||tool==='cool'){for(const a of atoms){if(Math.hypot(a.x-p.x,a.y-p.y)<radius)thermostat(a,a.t*(tool==='heat'?1.8:1/1.8));}}else if(tool==='acidity'){const s=acidBaseSample(p);notify('주변 반경 60 · '+s.label+' · '+acidBaseCounts(s)+' (pH 수치 아님)');}else if(tool==='inspect'){const a=atoms.find(a=>Math.hypot(a.x-p.x,a.y-p.y)<12);if(a){const m=molecules.find(m=>m.ids.includes(a.id));notify(`${atomicLabel(a)} · p ${protonCount(a.s)} / n ${a.A-protonCount(a.s)} / e ${a.electrons}${m?' / '+m.type+' 결합':' / 자유 원자'} / ${Math.round(a.t).toLocaleString()} K / ${phaseNames[a.phase||'unknown']}${gasInspection(a,m)}`);}}}
canvas.oncontextmenu=e=>e.preventDefault();canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);hover={x:e.clientX,y:e.clientY};pointer={id:e.pointerId,x:e.clientX,y:e.clientY,pan:e.button===2||tool==='pan',event:e};if(!pointer.pan)paint(e);};canvas.onpointermove=e=>{hover={x:e.clientX,y:e.clientY};if(!pointer)return;if(pointer.pan){cam.x-=(e.clientX-pointer.x)/zoom;cam.y-=(e.clientY-pointer.y)/zoom;}pointer.x=e.clientX;pointer.y=e.clientY;pointer.event=e;};canvas.onpointerup=()=>pointer=null;canvas.onpointercancel=()=>{pointer=null;hover=null;};canvas.onpointerleave=()=>{if(!pointer)hover=null;};canvas.onlostpointercapture=()=>pointer=null;
function setZoom(z){zoom=Math.max(.25,Math.min(8,z));$('zoomText').textContent=Math.round(zoom*100)+'%';$('lod').textContent=(zoom<.65?'MATERIAL VIEW':zoom>2?'MOLECULAR VIEW':'ATOMIC VIEW')+' / '+zoom.toFixed(1)+'×';}
canvas.onwheel=e=>{e.preventDefault();const before=worldPos(e);setZoom(zoom*(e.deltaY<0?1.15:1/1.15));const after=worldPos(e);cam.x+=before.x-after.x;cam.y+=before.y-after.y;};$('plus').onclick=()=>setZoom(zoom*1.4);$('minus').onclick=()=>setZoom(zoom/1.4);$('home').onclick=()=>{cam={x:0,y:0};setZoom(1);};
function draw() {
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-world.w / 2 - cam.x, -world.h / 2 - cam.y);
  ctx.strokeStyle = '#29383b';
  ctx.lineWidth = 1 / zoom;
  ctx.strokeRect(0, 0, world.w, world.h);
  ctx.fillStyle = '#263438';
  for (let x = 0; x < world.w; x += 40) {
    for (let y = 0; y < world.h; y += 40) ctx.fillRect(x, y, 1 / zoom, 1 / zoom);
  }
  if (zoom < .65) {
    for (const cell of renderCells(atoms).values()) {
      ctx.globalAlpha = thermalView || phaseView ? 1 : Math.min(1, .35 + cell.count * .12);
      ctx.fillStyle = phaseView ? phaseColors[cell.atom.phase||'unknown'] : thermalView ? temperatureColor(cell.totalTemperature / cell.count) : color(cell.atom.s);
      ctx.fillRect(cell.x, cell.y, 11, 11);
    }
    ctx.globalAlpha = 1;
  } else {
    const byId = new Map(atoms.map(a => [a.id, a]));
    ctx.strokeStyle = thermalView ? '#53616a' : '#677b6d';
    ctx.lineWidth = 1 / zoom;
    for (const molecule of molecules) {
      ctx.strokeStyle=(saltData[molecule.type]||baseData[molecule.type])?'#e5b86f':molecule.type==='OH-'?'#bea4ef':molecule.type==='H3O+'?'#f29c88':(thermalView?'#53616a':'#677b6d');
      const root = byId.get(molecule.ids[0]);
      for (const id of molecule.ids.slice(1)) {
        const atom = byId.get(id);
        ctx.beginPath();
        ctx.moveTo(root.x, root.y);
        ctx.lineTo(atom.x, atom.y);
        ctx.stroke();
      }
    }
    for (const atom of atoms) {
      ctx.fillStyle = phaseView ? phaseColors[atom.phase||'unknown'] : thermalView ? temperatureColor(atom.t) : color(atom.s);
      const vibration=atom.phase==='solid'?Math.min(.18,.12*Math.sqrt(atom.t/300)):0;
      ctx.fillRect(atom.x-1.5+Math.sin(simTime*28+atom.id)*vibration,atom.y-1.5+Math.cos(simTime*31+atom.id)*vibration,3,3);
      if (zoom > 3) {
        ctx.font = '3px monospace';
        ctx.fillText(atomicLabel(atom), atom.x + 2, atom.y - 2);
      }
    }
    // Label the complete molecular ion, rather than only its charged atom.
    if (zoom >= 2) for (const m of molecules) {
      if (!isPolyatomicIon(m.type)) continue;
      const root = byId.get(m.ids[0]);
      ctx.font = '4px monospace';
      ctx.fillStyle = m.type === 'H3O+' ? '#f29c88' : '#bea4ef';
      ctx.fillText(m.type === 'H3O+' ? 'H₃O⁺' : 'OH⁻', root.x - 8, root.y + 14);
    }
  }
  physicsOverlay();
  ctx.restore();
  drawBrush();
}

function renderCells(particles) {
  const cells = new Map();
  for (const atom of particles) {
    const x = Math.floor(atom.x / 12) * 12;
    const y = Math.floor(atom.y / 12) * 12;
    const key = x + ',' + y;
    if (!cells.has(key)) cells.set(key, { x, y, atom, count: 0, totalTemperature: 0 });
    const cell = cells.get(key);
    cell.count++;
    cell.totalTemperature += atom.t;
  }
  return cells;
}

function frame(time){let dt=Math.min(.1,(time-lastTick)/1000||.016);lastTick=time;if(pointer&&!pointer.pan&&tool!=='inspect'&&tool!=='acidity'&&time-lastPaint>70){paint(pointer.event);lastPaint=time;}if(!paused){simTime+=dt;physicsAccumulator=Math.min(.1,physicsAccumulator+dt);while(physicsAccumulator>=1/120){step(1/120);physicsAccumulator-=1/120;}}else physicsAccumulator=0;draw();frames++;if(time-fpsTime>500){$('fps').textContent=Math.round(frames*1000/(time-fpsTime))+' FPS';fpsTime=time;frames=0;$('count').textContent=atoms.length.toLocaleString();$('bonds').textContent=molecules.length;updatePhysicsStats();atomicStats();}requestAnimationFrame(frame);}
new ResizeObserver(()=>{const r=canvas.getBoundingClientRect();width=r.width;height=r.height;canvas.width=width*devicePixelRatio;canvas.height=height*devicePixelRatio;ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);}).observe(canvas);
$('brush').oninput=()=>{$('brushValue').textContent=$('brush').value;};$('temp').oninput=()=>setTemp(10**+$('temp').value,true);$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'▶ 재생':'Ⅱ 일시정지';};$('save').onclick=()=>save();$('help').onclick=()=>$('dialog').showModal();$('close').onclick=()=>$('dialog').close();$('search').oninput=catalog;for(const [id,t] of [['elementTab','elements'],['moleculeTab','molecules']])$(id).onclick=()=>{tab=t;$('elementTab').classList.toggle('active',t==='elements');$('moleculeTab').classList.toggle('active',t==='molecules');catalog();};$('clear').onclick=()=>{if(confirm('원자를 모두 지울까요? 발견 도감은 유지됩니다.')){atoms=[];molecules=[];freeElectrons=0;positrons=0;freeNeutrons=0;solidLinks.clear();save(true);}};$('reset').onclick=()=>{if(confirm('세계와 발견 도감을 초기화할까요?')){atoms=[];molecules=[];freeElectrons=0;positrons=0;freeNeutrons=0;solidLinks.clear();known=new Set(['H']);discovered=new Set();selected='H';nuclearEnergy=0;chemicalEnergy=0;flashes=[];reactionLabel='반응 대기';confinement=1;$('compression').value=1;$('compressionValue').textContent='1×';setTemp(300);$('selection').textContent='H · 수소 배치';setTool('place');logs=[];record('수소로 시작하는 새 세계');catalog();save(true);}};
load();setAmbientMedium(ambientMedium);$('ambientMedium').onchange=()=>setAmbientMedium($('ambientMedium').value);setDeveloperMode(developerMode);$('developerMode').onchange=()=>setDeveloperMode($('developerMode').checked);$('isotope').onchange=()=>{$('atomicSelection').textContent='양성자 '+protonCount(selected)+' · 중성자 '+(Number($('isotope').value)-protonCount(selected));};setThermalView(thermalView);$('elementView').onclick=()=>{setPhaseView(false);setThermalView(false);};$('phaseView').onclick=()=>setPhaseView(true);$('temperatureView').onclick=()=>setThermalView(true);$('compression').value=confinement;$('compressionValue').textContent=confinement+'×';$('compression').oninput=()=>setConfinement(+$('compression').value);setTemp(temperature);updatePhases();setPhaseView(phaseView);catalog();record('수소에서 시작하는 실험실');requestAnimationFrame(frame);setInterval(()=>save(true),15000);

function drawBrush() {
  if (!hover || tool === 'pan') return;
  const rect = canvas.getBoundingClientRect();
  const x = hover.x - rect.left;
  const y = hover.y - rect.top;
  const radius = tool === 'acidity' ? 60 * zoom : tool === 'inspect' ? 12 * zoom : +$('brush').value * 2 * zoom;
  const tint = { erase: '#ff8c8c', heat: '#ffb26c', cool: '#83c8ff', inspect: '#fff', acidity:'#c5a4ef' }[tool] || '#b9eb8c';
  ctx.save();
  ctx.strokeStyle = tint;
  ctx.fillStyle = tint;
  ctx.globalAlpha = .09;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = .95;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y);
  ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4);
  ctx.stroke();
  ctx.restore();
}

function temperatureColor(value) {
  const stops = [
    { temperature: 10, rgb: [52, 70, 200] },
    { temperature: 1000, rgb: [49, 201, 207] },
    { temperature: 1e6, rgb: [245, 184, 65] },
    { temperature: 3e9, rgb: [255, 242, 237] }
  ];
  const temperature = Math.max(10, Math.min(3e9, Number.isFinite(value) ? value : 300));
  const upper = stops.findIndex(stop => stop.temperature >= temperature);
  if (upper === 0) return 'rgb(' + stops[0].rgb.join(',') + ')';
  const low = stops[upper - 1], high = stops[upper];
  const ratio = Math.log(temperature / low.temperature) / Math.log(high.temperature / low.temperature);
  const rgb = low.rgb.map((channel, index) => Math.round(channel + (high.rgb[index] - channel) * ratio));
  return 'rgb(' + rgb.join(',') + ')';
}

function setThermalView(enabled) {
  if(enabled){phaseView=false;$('phaseView').classList.remove('active');$('phaseView').setAttribute('aria-pressed','false');$('phaseLegend').hidden=true;}
  thermalView = enabled;
  $('elementView').classList.toggle('active', !enabled && !phaseView);
  $('temperatureView').classList.toggle('active', enabled);
  $('elementView').setAttribute('aria-pressed', String(!enabled && !phaseView));
  $('temperatureView').setAttribute('aria-pressed', String(enabled));
  $('temperatureLegend').hidden = !enabled;
  const ticks = [10, 1000, 1e6, 3e9];
  const stops = ticks.map(t => temperatureColor(t) + ' ' + (Math.log10(t / 10) / Math.log10(3e8) * 100) + '%');
  $('temperatureGradient').style.background = 'linear-gradient(to right, ' + stops.join(',') + ')';
}
