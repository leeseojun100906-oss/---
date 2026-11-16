'use strict';

// Display-scale emission: no photons or radiation transport are simulated.
const LIGHT_LIMIT = 96;
const THERMAL_LIGHT_LIMIT = 128;
const lightSprites = new Map();
let lightEffects = true;
let electricalEnergy = 0;
let electricalPower = 0;
let currentStrength = 1;

function emitEnergyLight(x, y, energy, options = {}) {
  if (![x, y, energy].every(Number.isFinite) || energy <= 0) return;
  const kind = options.kind || 'chemical';
  const violence = Math.max(.2, Math.min(3, options.violence || 1));
  const strength = Math.min(1, Math.log1p(energy) / 3 * violence);
  const tint = kind === 'nuclear' ? '190,219,255' :
    ({Na:'255,182,68',K:'198,150,255',Rb:'230,150,244',Cs:'158,182,255',Li:'255,110,81',Ca:'255,159,85'}[options.symbol] || '255,176,86');
  const duration = kind === 'nuclear' ? 1.1 : .3 + strength * .65;
  // Coalesce coincident events and bound memory even in dense reacting worlds.
  const same = flashes.find(f => f.kind === kind && f.tint === tint && f.life > f.duration * .8 && Math.hypot(f.x-x,f.y-y) < 20);
  if (same) {
    same.strength = Math.min(1, same.strength + strength * .3);
    same.radius = Math.min(150, same.radius + 3);
    return;
  }
  if (flashes.length >= LIGHT_LIMIT) flashes.shift();
  flashes.push({x,y,kind,tint,life:duration,duration,strength,
    radius:kind === 'nuclear' ? 145 : 32 + strength * 85,
    nuclear:kind === 'nuclear'});
}

function thermalEmission(a) {
  if (!Number.isFinite(a.t) || a.t < 800) return null;
  // Incandescence for condensed matter; very hot gases/plasmas use a stylized glow.
  if (a.phase !== 'solid' && a.phase !== 'liquid' && a.t < 6000) return null;
  const t = a.t;
  return {tint:t < 1200 ? '255,78,38' : t < 2000 ? '255,142,53' : t < 3500 ? '255,204,124' : t < 6000 ? '255,240,211' : '187,217,255',
    strength:Math.min(.8, Math.max(.025, Math.log(t / 780) * .45))};
}

function thermalLightCells(particles, viewZoom = zoom, viewport = null) {
  const size = Math.max(24, 28 / viewZoom), cells = new Map();
  for (const a of particles) {
    if (viewport && (a.x < viewport.left-90 || a.x > viewport.right+90 || a.y < viewport.top-90 || a.y > viewport.bottom+90)) continue;
    const emission = thermalEmission(a);
    if (!emission) continue;
    const key = Math.floor(a.x / size) + ',' + Math.floor(a.y / size);
    let cell = cells.get(key);
    if (!cell) {cell={x:0,y:0,count:0,strength:0,tint:emission.tint};cells.set(key,cell);}
    cell.x += a.x;cell.y += a.y;cell.count++;
    if (emission.strength > cell.strength) {cell.strength=emission.strength;cell.tint=emission.tint;}
  }
  return [...cells.values()].map(c => ({...c,x:c.x/c.count,y:c.y/c.count,
    strength:Math.min(.85,c.strength*(.48+Math.log1p(c.count)*.32)),radius:Math.min(90,size*.8+Math.sqrt(c.count)*4)}))
    .sort((a,b)=>b.strength-a.strength).slice(0,THERMAL_LIGHT_LIMIT);
}

function glowSprite(tint) {
  if (lightSprites.has(tint)) return lightSprites.get(tint);
  const sprite=document.createElement('canvas');sprite.width=sprite.height=128;
  const paint=sprite.getContext('2d'),gradient=paint.createRadialGradient(64,64,0,64,64,64);
  for (const [stop,alpha] of [[0,.95],[.12,.65],[.35,.23],[.7,.055],[1,0]]) gradient.addColorStop(stop,'rgba('+tint+','+alpha+')');
  paint.fillStyle=gradient;paint.fillRect(0,0,128,128);lightSprites.set(tint,sprite);return sprite;
}

function drawEnergyLighting() {
  if (!lightEffects) return;
  ctx.save();ctx.globalCompositeOperation='screen';
  // Keep calibrated temperature and phase colors readable.
  const viewScale = thermalView || phaseView ? .22 : 1;
  const paintGlow=(x,y,r,tint,alpha)=>{
    const sx=(x-world.w/2-cam.x)*zoom+width/2,sy=(y-world.h/2-cam.y)*zoom+height/2;
    if(sx+r*zoom<0||sy+r*zoom<0||sx-r*zoom>width||sy-r*zoom>height)return;
    ctx.globalAlpha=Math.min(.85,alpha)*viewScale;
    ctx.drawImage(glowSprite(tint),x-r,y-r,r*2,r*2);
  };
  const viewport={left:world.w/2+cam.x-width/(2*zoom),right:world.w/2+cam.x+width/(2*zoom),top:world.h/2+cam.y-height/(2*zoom),bottom:world.h/2+cam.y+height/(2*zoom)};
  for (const c of thermalLightCells(atoms,zoom,viewport)) paintGlow(c.x,c.y,c.radius,c.tint,c.strength);
  for (const f of flashes) {
    const remaining=Math.max(0,Math.min(1,f.life/f.duration));
    const fade=remaining*remaining;
    const radius=f.radius*(1+.24*(1-remaining));
    paintGlow(f.x,f.y,radius,f.tint,f.strength*fade);
    paintGlow(f.x,f.y,Math.max(8,radius*.16),'255,242,211',f.strength*fade*.8);
  }
  ctx.restore();
}

// Relative resistance and imposed current are game parameters, not atom-scale
// ohms/amperes. P ∝ I²R; an external local probe supplies all added energy.
const conductorResistance = {Cu:1,Ag:.95,Au:1.4,Al:1.6,W:3.3,Fe:6,Ni:4.2,Cr:7.5,
  Pt:6.3,Zn:3.5,Sn:6.5,Pb:12,Ti:15,Li:5.5,Na:2.8,K:4.3,Mg:2.6,Ca:2,Hg:15};

function resistiveHeatingAt(p, radius, dt, strength = currentStrength) {
  electricalPower=0;
  if (!p || ![p.x,p.y,radius,dt,strength].every(Number.isFinite) || radius<=0 || dt<=0 || strength<=0) return 0;
  strength=Math.min(5,strength);
  const metal=atoms.filter(a=>conductorResistance[a.s] && charge(a)===0 && !a.aqueous && a.material===a.s && (a.phase==='solid'||a.phase==='liquid') && Math.hypot(a.x-p.x,a.y-p.y)<=radius);
  const bins=spatialBins(metal,12);
  for (const a of metal) {
    // A lone atom or separated particles cannot bridge the ideal local probe.
    if (!neighbors(a,bins,12).some(b=>b.id!==a.id&&Math.hypot(b.x-a.x,b.y-a.y)<=12)) continue;
    const resistance=conductorResistance[a.s]*Math.min(3,1+Math.max(0,a.t-300)*.0007);
    const power=5*strength*strength*resistance,energy=power*dt;
    electricalPower+=power;electricalEnergy+=energy;
    thermostat(a,Math.min(3e9,a.t+energy*36));
  }
  return electricalPower;
}

function updateElectricalHeating(dt) {
  electricalPower=0;
  if (tool==='current' && pointer && !pointer.pan) resistiveHeatingAt(worldPos(pointer.event),+$('brush').value*2,dt);
}

function bindEnergyControls() {
  $('lightEffects').checked=lightEffects;
  $('lightEffects').onchange=()=>{lightEffects=$('lightEffects').checked;};
  $('currentStrength').value=currentStrength;
  $('currentValue').textContent=currentStrength+'×';
  $('currentStrength').oninput=()=>{currentStrength=Math.max(.25,Math.min(5,+$('currentStrength').value||1));$('currentValue').textContent=currentStrength+'×';};
}
