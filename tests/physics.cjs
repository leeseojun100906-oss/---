const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const elements=new Map(),storage=new Map(),noop=()=>{};
function el(id){if(!elements.has(id))elements.set(id,{value:id==='brush'?'6':'',checked:false,textContent:'',style:{},dataset:{},classList:{toggle:noop,remove:noop},setAttribute:noop,replaceChildren:noop,append:noop,getContext:()=>new Proxy({},{get:()=>noop}),getBoundingClientRect:()=>({left:0,top:0,width:800,height:600})});return elements.get(id);}
const context=vm.createContext({console,Math,JSON,Map,Set,Number,document:{getElementById:el,createElement:()=>el(Math.random()),querySelectorAll:()=>[]},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},setTimeout:noop,clearTimeout:noop,setInterval:noop,requestAnimationFrame:noop,ResizeObserver:class{observe(){}},confirm:()=>true,devicePixelRatio:1});
for(const file of ['ions.js','acid-base.js','reactive-metals.js','phases.js','buoyancy.js','atomic.js','physics.js','app.js'])vm.runInContext(fs.readFileSync(require('path').join(__dirname,'..',file),'utf8'),context);
const run=code=>vm.runInContext(code,context);
const check=code=>assert.equal(run(code),true,code);
check('representativeMasses.length===118 && symbols.every(s=>defaultMass(s)>=protonCount(s))');
run("atoms=[];molecules=[];freeElectrons=0;positrons=0;freeNeutrons=0;var a=atom('Li',500,400);a.A=7;transferElectron(a,true);");
check('charge(a)===1 && a.electrons===2 && freeElectrons===1');
run('transferElectron(a,false)');check('charge(a)===0 && freeElectrons===0');
run('a.electrons=0;freeElectrons=0;transferElectron(a,true);');check('a.electrons===0 && freeElectrons===0');
run("atoms=[];molecules=[];var a=atom('H',500,400),b=atom('H',510,400);a.electrons=b.electrons=0;a.vx=b.vx=0;applyElectricForces(.01);");check('a.vx<0 && b.vx>0');
run('b.electrons=2;a.vx=b.vx=0;applyElectricForces(.01);');check('a.vx>0 && b.vx<0');
run("atoms=[];molecules=[];freeElectrons=0;positrons=0;setTemp(2e7);for(let i=0;i<4;i++)atom('H',600+i*5,450);reactFusion();");
check("atoms.length===1 && atoms[0].s==='He' && atoms[0].A===4 && atoms[0].electrons===2 && freeElectrons===2 && positrons===2");
check('atoms.reduce((s,a)=>s+charge(a),0)-freeElectrons+positrons===0');
run('ionizationStep();');check('atoms.reduce((s,a)=>s+charge(a),0)-freeElectrons+positrons===0');
run("atoms=[];molecules=[];freeNeutrons=0;setTemp(1.1e8);var d=atom('H',600,450),t=atom('H',605,450);d.A=2;t.A=3;atom('Ne',610,450);atom('Ne',615,450);reactFusion();");
check("atoms.some(a=>a.s==='He'&&a.A===4) && freeNeutrons===1 && !atoms.some(a=>a.s==='H')");
run("atoms=[];molecules=[];setTemp(2e7);for(let i=0;i<4;i++){let a=atom('H',600+i*4,450);a.A=2;}reactFusion();");check('atoms.length===4 && atoms.every(a=>a.A===2)');
run("setDeveloperMode(true);selected='Li';updateAtomicControls();$('isotope').value=6;$('spawnCharge').value=1;add('Li',600,450);");check("atoms.at(-1).A===6 && atoms.at(-1).electrons===2 && !known.has('Li')");
run('save(true);atoms=[];load();');check("developerMode && atoms.at(-1).A===6 && atoms.at(-1).electrons===2");
run("setDeveloperMode(false);");check("selected==='H' && !known.has('Li')");
run("atoms=[];molecules=[];setTemp(300);add('H2O',600,450);var byId=new Map(atoms.map(a=>[a.id,a]));");check("waterState(molecules[0],byId)==='liquid'");
run('setTemp(250,true)');check("waterState(molecules[0],byId)==='solid'");
run('setTemp(500,true)');check("waterState(molecules[0],byId)==='gas'");
run("atoms=[];molecules=[];setTemp(300);for(let i=0;i<50;i++)add('H2O',500+(i%10)*15,400+Math.floor(i/10)*15);$('gravity').checked=true;for(let i=0;i<1200;i++)step(1/120);");check('atoms.every(a=>[a.x,a.y,a.vx,a.vy,a.t].every(Number.isFinite))');
console.log('PASS: element masses, transfer accounting, charge-force signs, fusion charge/nucleon accounting, isotope-specific D-T, developer isolation, save/restore, phase thresholds, 1200-step stability');

check("classifyPhase('Fe',300)==='solid' && classifyPhase('Fe',2000)==='liquid' && classifyPhase('Fe',3200)==='gas'");
check("classifyPhase('CO2',190)==='solid' && classifyPhase('CO2',200)==='gas' && classifyPhase('Og',300)==='unknown'");
run("atoms=[];molecules=[];solidLinks.clear();$('gravity').checked=false;setTemp(300);for(let i=0;i<36;i++){let a=atom('Fe',500+i%6*6,400+Math.floor(i/6)*6);a.vx=10+Math.sin(i)*6;a.vy=Math.cos(i)*6;}var cx=atoms.reduce((s,a)=>s+a.vx,0)/36,cy=atoms.reduce((s,a)=>s+a.vy,0)/36;var energy=()=>atoms.reduce((s,a)=>s+(a.vx-cx)**2+(a.vy-cy)**2,0);var before=energy();for(let i=0;i<600;i++)step(1/120);var after=energy();");
console.log('solid relative motion energy ratio',run('after/before'));
check('after < before*.25 && solidLinks.size>0');
check('Math.abs(atoms.reduce((s,a)=>s+a.vx,0)/36-cx)<.001');
run('setTemp(2000,true);step(1/120)');check("atoms.every(a=>a.phase==='liquid') && solidLinks.size===0");
run('setTemp(3200,true);step(1/120)');check("atoms.every(a=>a.phase==='gas')");
run('setTemp(300,true);step(1/120)');check("atoms.every(a=>a.phase==='solid') && solidLinks.size>0");
console.log('PASS: Fe melt/boil/refreeze, sublimation, unknown data, solid jitter damping and bulk momentum');
run(`atoms=[];molecules=[];solidLinks.clear();setTemp(300);freeElectrons=0;positrons=0;
var totalE=()=>atoms.reduce((s,a)=>s+a.electrons,0)+freeElectrons;
var setup=()=>{atoms=[];molecules=[];solidLinks.clear();setTemp(300);add('H2O',500,400);};
var na=atom('Na',600,400),cl=atom('Cl',605,400);var e0=totalE();ionicChemistry();`);
check("molecules.some(m=>m.type==='NaCl') && charge(na)===1 && charge(cl)===-1 && totalE()===e0");
run("setup();add('CuCl2',505,400);var zn=atom('Zn',510,400);var e0=totalE();var n0=atoms.length;ionicChemistry();");
check("charge(zn)===2 && atoms.some(a=>a.s==='Cu'&&charge(a)===0) && totalE()===e0 && atoms.length===n0");
run("setup();add('ZnCl2',505,400);var cu=atom('Cu',510,400);ionicChemistry();");
check("charge(cu)===0 && atoms.some(a=>a.s==='Zn'&&charge(a)===2)");
run("setup();var ag=atom('Ag',505,400),cl=atom('Cl',510,400);ag.electrons--;cl.electrons++;var e0=totalE();ionicChemistry();chemistry();");
check("molecules.some(m=>m.type==='AgCl') && totalE()===e0");
run("setup();add('HCl',505,400);add('HCl',508,402);var zn=atom('Zn',510,400);var e0=totalE();ionicChemistry();");
check("charge(zn)===2 && molecules.some(m=>m.type==='H2') && totalE()===e0");
run("setup();var cu=atom('Cu',505,400),ag1=atom('Ag',510,400),ag2=atom('Ag',512,400);ag1.electrons--;ag2.electrons--;var e0=totalE();ionicChemistry();");
check("charge(cu)===2 && charge(ag1)===0 && charge(ag2)===0 && totalE()===e0");
run("atoms=[];molecules=[];setTemp(300);add('NaCl',500,400);freeElectrons=10;ionizationStep();chemistry();save(true);atoms=[];molecules=[];load();");
check("molecules.some(m=>m.type==='NaCl') && atoms.reduce((s,a)=>s+charge(a),0)===0");
run("atoms=[];molecules=[];setTemp(300);add('Fe',500,400);");check('atoms[0].vx===0 && atoms[0].vy===0');
console.log('PASS: ionic electron balance, salt dissolution, precipitation, forward/reverse displacement, acid, Cu/Ag stoichiometry, save/load, stationary solid spawn');
run("setup();for(let i=0;i<12;i++){add('NaCl',500+i*4,410);add('AgCl',500+i*4,420);}var initialElectrons=totalE();var initialNucleons=atoms.reduce((s,a)=>s+a.A,0);for(let i=0;i<600;i++)step(1/120);");
check('totalE()===initialElectrons && atoms.reduce((s,a)=>s+a.A,0)===initialNucleons && atoms.every(a=>[a.x,a.y,a.vx,a.vy].every(Number.isFinite))');
console.log('PASS: 600-step mixed salt/water stability and electron/nucleon conservation');
// Reproduce the reported stationary ions: a solid salt starts with zero speed.
run(`setup();add('CuCl2',505,400);for(const a of atoms)a.vx=a.vy=0;
var released=atoms.filter(a=>a.s==='Cu'||a.s==='Cl');ionicChemistry();updatePhases();
var e0=totalE(),q0=atoms.reduce((s,a)=>s+charge(a),0),p0x=atoms.reduce((s,a)=>s+mass(a)*a.vx,0),p0y=atoms.reduce((s,a)=>s+mass(a)*a.vy,0);
var seed=8101;var random8=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
aqueousMotion(1/120,random8);`);
check('released.every(a=>a.aqueous && Math.hypot(a.vx,a.vy)>.01)');
check('totalE()===e0 && atoms.reduce((s,a)=>s+charge(a),0)===q0');
check('Math.abs(atoms.reduce((s,a)=>s+mass(a)*a.vx,0)-p0x)<1e-9 && Math.abs(atoms.reduce((s,a)=>s+mass(a)*a.vy,0)-p0y)<1e-9');
run("atoms=[];molecules=[];setTemp(300);add('NaCl',500,400);var v0=JSON.stringify(atoms.map(a=>[a.vx,a.vy]));updatePhases();aqueousMotion(1/120,random8);");
check('JSON.stringify(atoms.map(a=>[a.vx,a.vy]))===v0');
run("setup();var cu=atom('Cu',505,400);cu.electrons-=2;cu.aqueous=true;for(const a of atoms)a.vx=a.vy=0;setTemp(250,true);aqueousMotion(1/120,random8);");
check('atoms.every(a=>a.vx===0 && a.vy===0)');
// Chloride is a spectator: contact alone cannot oxidize neutral zinc.
run("setup();var zn=atom('Zn',505,400),cl=atom('Cl',510,400);cl.electrons++;ionicChemistry();");
check('charge(zn)===0 && charge(cl)===-1');
console.log('PASS: dissolved salt starts moving, solvent momentum exchange, dry/frozen solids unchanged, chloride spectator');

// Diffusion transports Cu2+ beyond the initial reaction radius to wetted zinc.
run(`atoms=[];molecules=[];solidLinks.clear();freeElectrons=0;positrons=0;setTemp(300);$('gravity').checked=false;
for(let x=480;x<=540;x+=20){add('H2O',x,380);add('H2O',x,420);}
add('CuCl2',500,400);var zinc=[];for(let i=0;i<8;i++)zinc.push(atom('Zn',500+30*Math.cos(i*Math.PI/4),400+30*Math.sin(i*Math.PI/4)));for(const a of atoms)a.vx=a.vy=0;
var beforeCl=atoms.filter(a=>a.s==='Cl').map(a=>[a.id,a.electrons]);var beforeA=atoms.map(a=>[a.id,a.A]);
var oldRandom=Math.random;seed=8101;Math.random=random8;var reactionAt=-1;
try{for(let i=0;i<2400;i++){step(1/120);if(zinc.some(a=>charge(a)===2)){reactionAt=i/120;break;}}}finally{Math.random=oldRandom;}`);
check('reactionAt>0 && reactionAt<20 && atoms.some(a=>a.s==="Cu" && charge(a)===0)');
check('beforeCl.every(([id,e])=>atoms.find(a=>a.id===id).electrons===e) && beforeA.every(([id,A])=>atoms.find(a=>a.id===id).A===A)');
console.log('PASS: diffusion-to-zinc reaction, chloride and isotopes unchanged');
// A freshly entering ion must not be pushed back by liquid-water atom pixels.
// No aqueous flag is required: entry can occur between chemistry updates.
run(`setup();var waterAtom=atoms[0],incoming=atom('Cu',waterAtom.x-3,waterAtom.y);incoming.electrons-=2;incoming.t=340;incoming.vx=12;incoming.vy=0;waterAtom.vx=waterAtom.vy=0;incoming.aqueous=false;updatePhases();var incomingX=incoming.x,waterX=waterAtom.x;collide(incoming,waterAtom);`);
check('incoming.x===incomingX && incoming.vx===12 && waterAtom.x===waterX && incoming.t<340');
run('incoming.x=waterAtom.x-3;incoming.vx=12;collide(waterAtom,incoming);');
check('incoming.x===waterAtom.x-3 && incoming.vx===12');
// Frozen water and solid surfaces retain their collision barriers.
run('setTemp(250,true);updatePhases();incoming.x=waterAtom.x-3;incoming.vx=12;waterAtom.vx=0;var iceX=incoming.x;collide(incoming,waterAtom);');
check('incoming.x<iceX && incoming.vx<12');
run("setup();var wall=atom('Zn',520,400),incoming=atom('Cu',517,400);incoming.electrons-=2;incoming.vx=12;wall.vx=0;updatePhases();collide(incoming,wall);");
check('incoming.x<517 && incoming.vx<12');
// Bound ions in undissolved salt must not bypass mechanical collisions.
run("setup();add('NaCl',503,400);updatePhases();var saltAtom=atoms.find(a=>a.s==='Na');saltAtom.x=atoms[0].x+3;var saltX=saltAtom.x;collide(saltAtom,atoms[0]);");
check('saltAtom.x>saltX');
console.log('PASS: liquid solvent permeability at entry, heat exchange, ice/metal/salt collisions preserved');
// Acid/base species and neutralization conserve identities, isotopes and electrons.
run(`var acidSetup=()=>{atoms=[];molecules=[];solidLinks.clear();freeElectrons=0;positrons=0;freeNeutrons=0;setTemp(300);add('H2O',500,400);};
var snapshotMatter=()=>({electrons:totalE(),charge:atoms.reduce((s,a)=>s+charge(a),0),isotopes:atoms.map(a=>a.id+':'+a.s+':'+a.A).sort().join('|')});
var sameMatter=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
acidSetup();add('HBr',504,400);var matterBefore=snapshotMatter();ionicChemistry();chemistry();`);
check("acidBaseSample().h===1 && atoms.some(a=>a.s==='Br'&&charge(a)===-1) && sameMatter(matterBefore,snapshotMatter())");
run("acidSetup();add('NaOH',505,400);var matterBefore=snapshotMatter();ionicChemistry();chemistry();updatePhases();");
check("acidBaseSample().oh===1 && acidBaseSample().label==='염기성' && molecules.some(m=>m.type==='OH-') && sameMatter(matterBefore,snapshotMatter())");
run("acidSetup();add('HCl',504,400);add('NaOH',508,400);atoms.find(a=>a.s==='H').A=2;var matterBefore=snapshotMatter();var heatBefore=chemicalEnergy;ionicChemistry();chemistry();");
check("molecules.filter(m=>m.type==='H2O').length===2 && acidBaseSample().h===0 && acidBaseSample().oh===0 && chemicalEnergy>heatBefore && sameMatter(matterBefore,snapshotMatter())");
check("atoms.some(a=>a.s==='Na'&&charge(a)===1)&&atoms.some(a=>a.s==='Cl'&&charge(a)===-1)");
run("ionicChemistry();chemistry();");check("molecules.filter(m=>m.type==='H2O').length===2 && sameMatter(matterBefore,snapshotMatter())");
run("acidSetup();add('Ca(OH)2',505,400);add('HCl',504,400);add('HBr',508,400);var matterBefore=snapshotMatter();ionicChemistry();chemistry();");
check("molecules.filter(m=>m.type==='H2O').length===3 && acidBaseSample().oh===0 && acidBaseSample().h===0 && atoms.some(a=>a.s==='Ca'&&charge(a)===2) && sameMatter(matterBefore,snapshotMatter())");
run("acidSetup();add('HCl',504,400);add('HCl',507,400);add('KOH',508,400);ionicChemistry();");check("acidBaseSample().h===1 && acidBaseSample().oh===0 && acidBaseSample().label==='산성'");
run("acidSetup();add('HCl',504,400);add('NaOH',507,400);add('KOH',508,400);ionicChemistry();");check("acidBaseSample().h===0 && acidBaseSample().oh===1 && acidBaseSample().label==='염기성'");
run("acidSetup();add('HCl',504,400);add('H2O',800,400);add('NaOH',805,400);ionicChemistry();");
check("acidBaseSample().label==='산·염기 혼합 / 중화 대기' && acidBaseSample({x:500,y:400}).label==='산성' && acidBaseSample({x:800,y:400}).label==='염기성'");
run("atoms=[];molecules=[];setTemp(300);add('NaOH',500,400);add('HCl',505,400);ionicChemistry();chemistry();");
check("molecules.some(m=>m.type==='NaOH') && molecules.some(m=>m.type==='HCl') && acidBaseSample().label==='액체 물 없음'");
run("acidSetup();add('NaOH',504,400);add('HCl',508,400);setTemp(250,true);ionicChemistry();");check("molecules.some(m=>m.type==='NaOH') && !molecules.some(m=>m.type==='OH-')");
run("acidSetup();add('NaOH',504,400);ionicChemistry();chemistry();updatePhases();for(const a of atoms)a.vx=a.vy=0;var hydroxide=molecules.find(m=>m.type==='OH-').ids.map(id=>atoms.find(a=>a.id===id));aqueousMotion(1/120,random8);");
check('hydroxide[0].vx===hydroxide[1].vx && hydroxide[0].vy===hydroxide[1].vy && Math.hypot(hydroxide[0].vx,hydroxide[0].vy)>0');
check('Math.abs(atoms.reduce((s,a)=>s+mass(a)*a.vx,0))<1e-9 && Math.abs(atoms.reduce((s,a)=>s+mass(a)*a.vy,0))<1e-9');
run("var wh=atoms.find(a=>a.material==='H2O');var ohH=hydroxide[1];ohH.x=wh.x-3;ohH.y=wh.y;ohH.vx=12;var xBefore=ohH.x;collide(ohH,wh);");check('ohH.x===xBefore && ohH.vx===12');
run("save(true);atoms=[];molecules=[];load();chemistry();");check("molecules.some(m=>m.type==='OH-') && acidBaseSample().oh===1");
run("acidSetup();for(let i=0;i<8;i++){add('NaOH',500+i*5,400);add('HCl',500+i*5,405);}var matterBefore=snapshotMatter();for(let i=0;i<1200;i++)step(1/120);");
check('sameMatter(matterBefore,snapshotMatter()) && atoms.every(a=>[a.x,a.y,a.vx,a.vy,a.t].every(Number.isFinite))');
console.log('PASS: strong acids/bases, OH bond persistence, neutralization, Ca stoichiometry, excess reagents, local assay, dry/frozen exclusions, OH diffusion/permeability, saves, 1200-step conservation');

// Explicit hydronium uses an existing water molecule and an existing proton.
run(`acidSetup();add('HCl',504,400);
var sourceWater=molecules.find(m=>m.type==='H2O').ids.slice();
var acidProton=atoms.find(a=>a.s==='H'&&!sourceWater.includes(a.id));acidProton.A=2;
var matterBefore=snapshotMatter();ionicChemistry();chemistry();
var hydronium=molecules.find(m=>m.type==='H3O+');
var hydroAtoms=hydronium.ids.map(id=>atoms.find(a=>a.id===id));`);
check("hydroAtoms.length===4 && hydroAtoms.filter(a=>a.s==='O').length===1 && hydroAtoms.filter(a=>a.s==='H').length===3");
check("hydroAtoms.reduce((s,a)=>s+charge(a),0)===1 && hydroAtoms.reduce((s,a)=>s+a.electrons,0)===10 && hydronium.ids[3]===acidProton.id");
check("JSON.stringify(hydronium.ids.slice(0,3))===JSON.stringify(sourceWater) && molecules.filter(m=>m.type==='H2O').length===0 && sameMatter(matterBefore,snapshotMatter())");
check("acidBaseSample().h3o===1 && acidBaseSample().protons===0 && acidBaseSample().label==='산성' && discovered.has('H3O+')");
run("for(let i=0;i<20;i++){ionicChemistry();chemistry();ionizationStep();}acidBaseStats();");
check("molecules.filter(m=>m.type==='H3O+').length===1 && sameMatter(matterBefore,snapshotMatter()) && $('acidStats').textContent.includes('H₃O⁺ 1')");
// Saturated display: never invent another oxygen; hydrate waiting H+ when water arrives.
run("add('HCl',506,400);var matterBefore=snapshotMatter();ionicChemistry();");
check("acidBaseSample().h3o===1 && acidBaseSample().protons===1 && sameMatter(matterBefore,snapshotMatter())");
run("add('H2O',510,400);var matterBefore=snapshotMatter();ionicChemistry();");
check("acidBaseSample().h3o===2 && acidBaseSample().protons===0 && sameMatter(matterBefore,snapshotMatter())");
// Hydronium + hydroxide yields two distinct waters; all six atom IDs survive once.
run("atoms=[];molecules=[];setTemp(300);add('H3O+',500,400);add('OH-',507,400);var matterBefore=snapshotMatter(),heatBefore=chemicalEnergy;ionicChemistry();chemistry();");
check("atoms.length===6 && molecules.length===2 && molecules.every(m=>m.type==='H2O') && new Set(molecules.flatMap(m=>m.ids)).size===6");
check("sameMatter(matterBefore,snapshotMatter()) && chemicalEnergy>heatBefore && reactionLabel.includes('H₃O⁺ + OH⁻ → 2H₂O') && atoms.every(a=>charge(a)===0)");
// Two hydronium ions are reduced at Zn; their two solvent waters remain.
run("acidSetup();add('H2O',507,400);add('HCl',503,400);add('HCl',508,400);ionicChemistry();var zn=atom('Zn',510,400);var matterBefore=snapshotMatter();ionicChemistry();chemistry();");
check("charge(zn)===2 && molecules.filter(m=>m.type==='H2O').length===2 && molecules.filter(m=>m.type==='H2').length===1 && !molecules.some(m=>m.type==='H3O+')");
check("sameMatter(matterBefore,snapshotMatter()) && atoms.filter(a=>a.s==='Cl'&&charge(a)===-1).length===2 && reactionLabel.includes('2H₃O⁺')");
run("acidSetup();add('H2O',507,400);add('HCl',503,400);add('HCl',508,400);ionicChemistry();var cu=atom('Cu',510,400);ionicChemistry();");
check("charge(cu)===0 && molecules.filter(m=>m.type==='H3O+').length===2 && !molecules.some(m=>m.type==='H2')");
// Dry, frozen and vapor-only surroundings cannot hydrate a free proton.
for (const t of [250,500]) {
 run(`acidSetup();setTemp(${t},true);var proton=atom('H',504,400);proton.electrons=0;ionicChemistry();`);
 check("!molecules.some(m=>m.type==='H3O+') && charge(proton)===1");
}
run("atoms=[];molecules=[];setTemp(300);var proton=atom('H',504,400);proton.electrons=0;ionicChemistry();");
check("!molecules.some(m=>m.type==='H3O+') && atoms.length===1");
// Diffuse the whole ion with equal kicks and opposite solvent momentum.
run("acidSetup();add('H2O',512,400);add('HCl',504,400);ionicChemistry();updatePhases();for(const a of atoms)a.vx=a.vy=0;var hydroAtoms=molecules.find(m=>m.type==='H3O+').ids.map(id=>atoms.find(a=>a.id===id));aqueousMotion(1/120,random8);");
check("hydroAtoms.every(a=>Math.abs(a.vx-hydroAtoms[0].vx)<1e-12&&Math.abs(a.vy-hydroAtoms[0].vy)<1e-12) && Math.hypot(hydroAtoms[0].vx,hydroAtoms[0].vy)>0");
check("Math.abs(atoms.reduce((s,a)=>s+mass(a)*a.vx,0))<1e-9 && Math.abs(atoms.reduce((s,a)=>s+mass(a)*a.vy,0))<1e-9");
run("var wh=atoms.find(a=>a.material==='H2O');for(const a of hydroAtoms){a.x=wh.x-3;a.y=wh.y;a.vx=12;collide(a,wh);if(a.x!==wh.x-3||a.vx!==12)throw Error('hydronium blocked by solvent');}");
// The new recipe loads before saved worlds; existing discoveries remain intact.
run("save(true);atoms=[];molecules=[];load();chemistry();");
check("molecules.some(m=>m.type==='H3O+') && discovered.has('H3O+') && acidBaseSample().h3o===1");
run("acidSetup();for(let i=0;i<10;i++)add('H2O',500+i*5,400);add('HCl',505,405);ionicChemistry();var matterBefore=snapshotMatter();for(let i=0;i<1200;i++)step(1/120);draw();");
check("sameMatter(matterBefore,snapshotMatter()) && molecules.some(m=>m.type==='H3O+') && atoms.every(a=>[a.x,a.y,a.vx,a.vy,a.t].every(Number.isFinite))");
console.log('PASS: explicit hydronium formation/identity/charge, finite solvent, 2-water neutralization, Zn/Cu redox, dry/ice/vapor exclusions, group diffusion/permeability, saved discovery, 1200-step conservation');

// The old wet cutoff dropped drag at radius 28, allowing ballistic escape.
// Recovery must still act on a free ion outside that cutoff with aqueous=false.
run(`acidSetup();var cl=atom('Cl',532,400);cl.electrons++;cl.aqueous=false;
updatePhases();for(const a of atoms)a.vx=a.vy=0;cl.vx=35;
var px=atoms.reduce((s,a)=>s+mass(a)*a.vx,0),py=atoms.reduce((s,a)=>s+mass(a)*a.vy,0),matterBefore=snapshotMatter();
var noKick=()=>1-Number.EPSILON;aqueousMotion(1/120,noKick);`);
check('cl.vx<35 && atoms[0].vx>0 && sameMatter(matterBefore,snapshotMatter())');
check('Math.abs(atoms.reduce((s,a)=>s+mass(a)*a.vx,0)-px)<1e-9 && Math.abs(atoms.reduce((s,a)=>s+mass(a)*a.vy,0)-py)<1e-9');
// In the liquid interior, common flow is preserved (no screen-space damping).
run("acidSetup();var cl=atom('Cl',505,400);cl.electrons++;updatePhases();for(const a of atoms){a.vx=17;a.vy=-9;}aqueousMotion(1/120,noKick);");
check('atoms.every(a=>Math.abs(a.vx-17)<1e-6 && Math.abs(a.vy+9)<1e-6)');
// Solvent force on molecular ions moves all members together, without stretching bonds.
for(const type of ['OH-','H3O+']){
 run(`acidSetup();add('${type}',532,400);updatePhases();var group=molecules.find(m=>m.type==='${type}').ids.map(id=>atoms.find(a=>a.id===id));
 for(const a of atoms)a.vx=a.vy=0;for(const a of group)a.vx=35;
 var px=atoms.reduce((s,a)=>s+mass(a)*a.vx,0),py=0;aqueousMotion(1/120,noKick);`);
 check('group.every(a=>Math.abs(a.vx-group[0].vx)<1e-12 && Math.abs(a.vy-group[0].vy)<1e-12) && group[0].vx<35');
 check('Math.abs(atoms.reduce((s,a)=>s+mass(a)*a.vx,0)-px)<1e-9 && Math.abs(atoms.reduce((s,a)=>s+mass(a)*a.vy,0)-py)<1e-9');
}
// Nearby ice/steam, removed water, and distant separate droplets exert no hydration force.
for(const t of [250,500]){
 run(`acidSetup();var cl=atom('Cl',530,400);cl.electrons++;cl.aqueous=true;setTemp(${t},true);updatePhases();
 var beforeV=JSON.stringify(atoms.map(a=>[a.vx,a.vy]));aqueousMotion(1/120,noKick);`);
 check('JSON.stringify(atoms.map(a=>[a.vx,a.vy]))===beforeV && !cl.aqueous');
}
run("acidSetup();add('H2O',800,400);var cl=atom('Cl',650,400);cl.electrons++;cl.aqueous=true;updatePhases();var beforeV=JSON.stringify(atoms.map(a=>[a.vx,a.vy]));aqueousMotion(1/120,noKick);");
check('JSON.stringify(atoms.map(a=>[a.vx,a.vy]))===beforeV && !cl.aqueous');
run("atoms=atoms.filter(a=>a.id===cl.id);molecules=[];cl.aqueous=true;var beforeV=JSON.stringify([cl.vx,cl.vy]);aqueousMotion(1/120,noKick);");
check('JSON.stringify([cl.vx,cl.vy])===beforeV && !cl.aqueous');
// Reduced neutral metal and intact salt must not be treated as dissolved ions.
run("acidSetup();add('Cu',525,400);add('NaCl',530,400);updatePhases();var beforeV=JSON.stringify(atoms.map(a=>[a.vx,a.vy]));aqueousMotion(1/120,noKick);");
check('JSON.stringify(atoms.map(a=>[a.vx,a.vy]))===beforeV');

// Deterministic 30-second full-physics retention regression, including repulsion.
run(`seed=112;var oldRandom=Math.random;Math.random=random8;
atoms=[];molecules=[];solidLinks.clear();freeElectrons=0;positrons=0;setTemp(300);$('gravity').checked=false;chemistryClock=nuclearClock=0;
for(let x=480;x<=520;x+=10)for(let y=380;y<=420;y+=10)add('H2O',x,y);
for(let i=0;i<12;i++){const a=atom('Cl',500+12*Math.cos(i*Math.PI/6),400+12*Math.sin(i*Math.PI/6));a.electrons++;}
for(const a of atoms)a.vx=a.vy=0;
var matterBefore=snapshotMatter(),wetFrames=0,totalFrames=0,maxSolventDistance=0;
try{for(let i=0;i<3600;i++){step(1/120);if(i%12===0){
 const roots=molecules.filter(m=>m.type==='H2O').map(m=>atoms.find(a=>a.id===m.ids[0]));
 for(const a of atoms.filter(a=>a.s==='Cl')){
  const d=Math.min(...roots.map(w=>Math.hypot(w.x-a.x,w.y-a.y)));wetFrames+=d<28;totalFrames++;maxSolventDistance=Math.max(maxSolventDistance,d);
 }
}}}finally{Math.random=oldRandom;}`);
check('wetFrames/totalFrames>.98 && maxSolventDistance<28');
check('sameMatter(matterBefore,snapshotMatter()) && atoms.every(a=>[a.x,a.y,a.vx,a.vy,a.t].every(Number.isFinite))');
console.log('PASS: wet-edge recovery, common fluid flow, molecular-ion coherence, momentum/matter conservation, ice/steam/removal/distance exclusions, 30-second ion retention',run('({wetFraction:wetFrames/totalFrames,maxDistance:maxSolventDistance})'));

// Ideal-gas density uses whole-molecule molar mass and actual temperature.
check('Math.abs(ambientAirDensity()-1.17682)<.0001 && Math.abs(idealGasDensity(2,300)-.081244)<.00001');
check('Math.abs(idealGasDensity(44,600)*2-idealGasDensity(44,300))<1e-12');
check('Math.abs(idealGasDensity(44,300,202650)-2*idealGasDensity(44,300))<1e-12');
run(`var gasSetup=()=>{atoms=[];molecules=[];solidLinks.clear();freeElectrons=positrons=freeNeutrons=0;chemistryClock=nuclearClock=0;setTemp(300);setAmbientMedium('air');$('gravity').checked=true;};
gasSetup();add('H2',400,400);add('He',500,400);add('CO2',600,400);add('Fe',700,400);for(const a of atoms)a.vx=a.vy=0;
var phaseAtoms=updatePhases();applyGravityAndBuoyancy(1/120,phaseAtoms);
var meanVy=type=>{const m=molecules.find(m=>m.type===type);const group=m?m.ids.map(id=>atoms.find(a=>a.id===id)):atoms.filter(a=>a.s===type);return group.reduce((s,a)=>s+mass(a)*a.vy,0)/group.reduce((s,a)=>s+mass(a),0);};`);
check("meanVy('H2')<meanVy('He') && meanVy('He')<0 && meanVy('CO2')>0 && meanVy('Fe')===30/120");
run("var hydro=molecules.find(m=>m.type==='H2').ids.map(id=>atoms.find(a=>a.id===id));var lightDensity=groupGasDensity(hydro);hydro.forEach(a=>a.A=2);");
check('Math.abs(groupGasDensity(hydro)-lightDensity*2)<1e-12');
run("gasSetup();add('CO2',500,400);setTemp(600,true);for(const a of atoms)a.vx=a.vy=0;applyGravityAndBuoyancy(1/120,updatePhases());");
check("meanVy('CO2')<0");
// The same force increment is applied to every member of a mixed-mass molecule.
run("gasSetup();add('CO2',500,400);var beforeV=atoms.map(a=>[a.vx,a.vy]);applyGravityAndBuoyancy(1/120,updatePhases());var deltas=atoms.map((a,i)=>[a.vx-beforeV[i][0],a.vy-beforeV[i][1]]);");
check('deltas.every(d=>Math.abs(d[0]-deltas[0][0])<1e-12&&Math.abs(d[1]-deltas[0][1])<1e-12)');
// Vacuum: no anti-gravity for light gases. Gravity off: no buoyancy/drag.
run("gasSetup();setAmbientMedium('vacuum');add('H2',400,400);add('CO2',600,400);for(const a of atoms){a.vx=7;a.vy=0;}applyGravityAndBuoyancy(1/120,updatePhases());");
check('atoms.every(a=>a.vx===7 && a.vy===30/120)');
run("setAmbientMedium('air');$('gravity').checked=false;var beforeV=JSON.stringify(atoms.map(a=>[a.vx,a.vy]));applyGravityAndBuoyancy(1/120,updatePhases());");
check('JSON.stringify(atoms.map(a=>[a.vx,a.vy]))===beforeV');
// Liquid buoyancy works even in ambient vacuum and exchanges momentum with water.
run("gasSetup();setAmbientMedium('vacuum');add('H2O',500,400);add('H2',508,400);for(const a of atoms)a.vx=a.vy=0;var totalMass=atoms.reduce((s,a)=>s+mass(a),0),matterBefore=snapshotMatter();applyGravityAndBuoyancy(1/120,updatePhases());");
check("meanVy('H2')<0 && meanVy('H2O')>0 && sameMatter(matterBefore,snapshotMatter())");
check('Math.abs(atoms.reduce((s,a)=>s+mass(a)*a.vy,0)-totalMass*30/120)<1e-9');
// Bubbles pass through the coarse liquid pixels, but not ice or a metal wall.
run("var waterAtom=atoms.find(a=>a.material==='H2O'),h=atoms.find(a=>a.material==='H2');h.x=waterAtom.x-3;h.y=waterAtom.y;h.vx=12;collide(h,waterAtom);");
check('h.x===waterAtom.x-3 && h.vx===12');
run("setTemp(250,true);updatePhases();h.x=waterAtom.x-3;h.vx=12;waterAtom.vx=0;var initialX=h.x;collide(h,waterAtom);");
check('h.x<initialX && h.vx<12');
// Sub-cooled molecular hydrogen is liquid: do not apply gas lift to it.
run("gasSetup();setTemp(18);add('H2',500,400);for(const a of atoms)a.vx=a.vy=0;applyGravityAndBuoyancy(1/120,updatePhases());");
check("atoms.every(a=>a.phase==='liquid'&&a.vy===30/120)");
// A lone hydrogen atom is also treated as a light neutral gas before bonding.
run("gasSetup();add('H',500,400);atoms[0].vx=atoms[0].vy=0;applyGravityAndBuoyancy(1/120,updatePhases());");
check("atoms[0].phase==='gas' && atoms[0].vy<0");
// Whole simulation: H2 rises while CO2 descends; stable after repeated steps.
run("gasSetup();add('H2',400,450);add('CO2',700,450);for(const a of atoms)a.vx=a.vy=0;var matterBefore=snapshotMatter();for(let i=0;i<600;i++)step(1/120);");
check("molecules.find(m=>m.type==='H2').ids.every(id=>atoms.find(a=>a.id===id).y<400) && molecules.find(m=>m.type==='CO2').ids.every(id=>atoms.find(a=>a.id===id).y>460)");
check('sameMatter(matterBefore,snapshotMatter()) && atoms.every(a=>[a.x,a.y,a.vx,a.vy,a.t].every(Number.isFinite))');
// A redox-generated H2 molecule gets the gas force on the following step.
run("gasSetup();add('H2O',500,400);add('H2O',507,400);add('HCl',503,400);add('HCl',508,400);var zn=atom('Zn',510,400);ionicChemistry();chemistry();for(const a of atoms)a.vx=a.vy=0;applyGravityAndBuoyancy(1/120,updatePhases());");
check("charge(zn)===2 && molecules.some(m=>m.type==='H2') && meanVy('H2')<0");
// Existing saves default to air; selected vacuum and gravity survive reload.
run("setAmbientMedium('vacuum');save(true);setAmbientMedium('air');load();");
check("ambientMedium==='vacuum' && $('gravity').checked");
run("var oldSave=JSON.parse(localStorage.getItem('atom-garden-v1'));delete oldSave.ambientMedium;localStorage.setItem('atom-garden-v1',JSON.stringify(oldSave));load();gasStats();");
check("ambientMedium==='air' && $('gasStats').textContent.includes('1.177')");
console.log('PASS: gas density/temperature/isotopes, H2/He rise vs CO2 fall, molecular force coherence, vacuum/gravity-off, liquid bubble momentum, ice barrier, liquid-H2 exclusion, 600-step motion, Zn-generated H2, saved medium');

// Metal + liquid-water chemistry must reuse the original atoms and electrons.
run(`var metalWaterSetup=(symbol,waterCount=5,metalCount=2/reactiveMetals[symbol].q)=>{
 gasSetup();setDeveloperMode(false);$('gravity').checked=false;discovered=new Set();
 for(let i=0;i<waterCount;i++)add('H2O',500+i*2,400);
 for(let i=0;i<metalCount;i++)atom(symbol,505+i*3,404);
 for(const a of atoms)a.vx=a.vy=0;
};var uniqueBonds=()=>{const ids=molecules.flatMap(m=>m.ids);return new Set(ids).size===ids.length;};`);
for(const symbol of ['Li','Na','K','Rb','Cs','Fr','Ca','Sr','Ba']){
 run(`metalWaterSetup('${symbol}');var matterBefore=snapshotMatter(),heatBefore=chemicalEnergy;ionicChemistry(3);chemistry();updatePhases();`);
 check(`atoms.filter(a=>a.s==='${symbol}').every(a=>charge(a)===reactiveMetals['${symbol}'].q) && molecules.filter(m=>m.type==='H2').length===1 && molecules.find(m=>m.type==='H2').ids.length===2`);
 check(`molecules.filter(m=>m.type==='OH-').length===2 && acidBaseSample().label==='염기성' && discovered.has(reactiveMetals['${symbol}'].hydroxide)`);
 check('sameMatter(matterBefore,snapshotMatter()) && uniqueBonds() && chemicalEnergy>heatBefore');
 run('for(let i=0;i<10;i++)ionicChemistry();');
 check("molecules.filter(m=>m.type==='H2').length===1 && sameMatter(matterBefore,snapshotMatter()) && uniqueBonds()");
 run(`metalWaterSetup('${symbol}',2);var matterBefore=snapshotMatter();ionicChemistry(3);chemistry();`);
 check(`molecules.filter(m=>m.type===reactiveMetals['${symbol}'].hydroxide).length===2/reactiveMetals['${symbol}'].q && !molecules.some(m=>m.type==='H2O') && sameMatter(matterBefore,snapshotMatter()) && uniqueBonds()`);
 // Every added hydroxide also loads, spawns and dissociates as an intact OH group.
 run(`gasSetup();add('H2O',500,400);add(reactiveMetals['${symbol}'].hydroxide,505,400);var matterBefore=snapshotMatter();save(true);load();ionicChemistry();`);
 check(`sameMatter(matterBefore,snapshotMatter()) && molecules.filter(m=>m.type==='OH-').length===reactiveMetals['${symbol}'].q && uniqueBonds()`);
}
run(`var contactTicks={};for(const s of ['Li','Na','K','Rb','Cs']){
 metalWaterSetup(s);let ticks=0;while(!molecules.some(m=>m.type==='H2')&&ticks<30){ionicChemistry(.2);ticks++;}contactTicks[s]=ticks;
}`);
check('contactTicks.Li>contactTicks.Na && contactTicks.Na>contactTicks.K && contactTicks.K>contactTicks.Rb && contactTicks.Rb>contactTicks.Cs');
for(const temperature of [250,400]){
 run(`metalWaterSetup('Na');setTemp(${temperature},true);ionicChemistry(3);`);
 check("!molecules.some(m=>m.type==='H2') && atoms.filter(a=>a.s==='Na').every(a=>charge(a)===0)");
}
for(const [water,metal] of [[0,2],[1,2],[5,1]]){
 run(`metalWaterSetup('Na',${water},${metal});var matterBefore=snapshotMatter();ionicChemistry(3);`);
 check("!molecules.some(m=>m.type==='H2') && sameMatter(matterBefore,snapshotMatter())");
}
run("metalWaterSetup('Na');ionicChemistry(.2);var na=atoms.find(a=>a.s==='Na');na.x+=100;ionicChemistry(.2);");
check('na.waterContact===0');
for(const symbol of ['Zn','Cu','Mg','Be']){
 run(`gasSetup();for(let i=0;i<4;i++)add('H2O',500+i*2,400);atom('${symbol}',505,404);ionicChemistry(3);`);
 check(`!molecules.some(m=>m.type==='H2') && atoms.find(a=>a.s==='${symbol}').electrons===protonCount('${symbol}')`);
}
run("gasSetup();add('NaCl',505,400);for(let i=0;i<5;i++)add('H2O',500+i*2,400);ionicChemistry(3);");
check("!molecules.some(m=>m.type==='H2') && atoms.find(a=>a.s==='Na').electrons===10");
run("metalWaterSetup('Na',2,4);var matterBefore=snapshotMatter();ionicChemistry(3);");
check("molecules.filter(m=>m.type==='H2').length===1 && atoms.filter(a=>a.s==='Na'&&charge(a)===0).length===2 && sameMatter(matterBefore,snapshotMatter()) && uniqueBonds()");
// A previously solid metal heated into gas cannot react using stale phase data.
run("metalWaterSetup('Na');updatePhases();for(const a of atoms.filter(a=>a.s==='Na'))a.t=2000;ionicChemistry(3);");
check("!molecules.some(m=>m.type==='H2')");
console.log('PASS: all nine metal/water pathways, hydroxide discovery/load/dissociation, conservation, dry/ice/steam/ion/bound-metal exclusions, no water reuse, reaction speed ordering',run('contactTicks'));

// Monovalent acid reaction needs two donors; aqueous salts use water reaction.
run("gasSetup();add('H3O+',500,400);add('H3O+',505,400);var na=atom('Na',507,400);var matterBefore=snapshotMatter();ionicChemistry(.01);");
check("charge(na)===0 && !molecules.some(m=>m.type==='H2') && sameMatter(matterBefore,snapshotMatter())");
run("atom('Na',509,400);var matterBefore=snapshotMatter();ionicChemistry(.01);");
check("atoms.filter(a=>a.s==='Na').every(a=>charge(a)===1) && molecules.filter(m=>m.type==='H2').length===1 && molecules.find(m=>m.type==='H2').ids.length===2 && !molecules.some(m=>m.type==='H3O+') && sameMatter(matterBefore,snapshotMatter()) && uniqueBonds()");
run("gasSetup();add('H2O',500,400);add('CuCl2',505,400);atom('Na',507,400);ionicChemistry(.01);");
check("charge(atoms.find(a=>a.s==='Cu'))===2");
run("atom('Na',509,400);var matterBefore=snapshotMatter();ionicChemistry(.01);");
check("atoms.filter(a=>a.s==='Na').every(a=>charge(a)===0) && charge(atoms.find(a=>a.s==='Cu'))===2 && sameMatter(matterBefore,snapshotMatter()) && uniqueBonds()");
// Product OH- neutralizes an acid added after water reaction.
run("metalWaterSetup('Li');ionicChemistry(3);add('HCl',504,400);add('HCl',507,400);var matterBefore=snapshotMatter();ionicChemistry();");
check("acidBaseSample().h===0 && acidBaseSample().oh===0 && sameMatter(matterBefore,snapshotMatter()) && uniqueBonds()");
check("classifyPhase('Rb',300)==='solid' && classifyPhase('Cs',305)==='liquid' && classifyPhase('Sr',300)==='solid' && classifyPhase('Ba',300)==='solid' && classifyPhase('FrOH',300)==='unknown'");
// Real timesteps, hydrated ions and buoyant gas stay finite and preserve matter.
run(`metalWaterSetup('Na',12,4);$('gravity').checked=true;var matterBefore=snapshotMatter();seed=122;var oldRandom=Math.random;Math.random=random8;
try{for(let i=0;i<1200;i++)step(1/120);}finally{Math.random=oldRandom;}`);
check("molecules.some(m=>m.type==='H2') && sameMatter(matterBefore,snapshotMatter()) && uniqueBonds() && atoms.every(a=>[a.x,a.y,a.vx,a.vy,a.t].every(Number.isFinite))");
console.log('PASS: balanced Na/acid redox, no direct Na/Cu2+ deposition, product neutralization, added phase data, 1200-step metal/water stability');
