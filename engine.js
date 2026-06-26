/* ============================================================
   GameGenie — the UNIVERSAL ENGINE  (Phase 4 — spec-driven)
   ------------------------------------------------------------
   The barrier-breaker. One engine that READS A SPEC and builds
   different KINDS of game from primitives — not one hardcoded
   game. All share the same beauty layer (shadows / sky / light).

   Modes it understands today (extensible):
     · runner  — drive/race forward, switch lanes, dodge & collect
     · flyer   — fly free in 2D, dodge floating hazards, collect
     · jumper  — run & JUMP over walls (platformer), collect

   The Genie writes blueprint.mode; if absent we infer it.
   Needs Three.js (global THREE).
   window.GameGenieEngine.run(blueprint, mountEl) / .stop()
   ============================================================ */
(function () {
  'use strict';
  var THREE = window.THREE;
  var state = null;

  /* ---------- colours & themes ---------- */
  var NAMED = {
    red:0xe8484f, crimson:0xe8484f, orange:0xf2913d, amber:0xf2913d,
    yellow:0xf2d24b, gold:0xf2c84b, green:0x4fcf72, lime:0x8fe04b,
    teal:0x3fc9c2, cyan:0x49d6e8, aqua:0x49d6e8, blue:0x4f8df2,
    azure:0x4f8df2, navy:0x3a5fd9, purple:0x9a5fe0, violet:0x9a5fe0,
    magenta:0xe05fc4, pink:0xf07ab0, rose:0xf07ab0, white:0xf2f2f5,
    silver:0xcfd3dc, grey:0x9aa0ad, gray:0x9aa0ad, black:0x2a2c33, brown:0x9a6b43
  };
  function colorFromText(t, fb){ if(!t) return fb; t=(' '+t+' ').toLowerCase();
    for(var n in NAMED){ if(t.indexOf(n)!==-1) return NAMED[n]; } return fb; }

  function themeFromText(t){
    t=(t||'').toLowerCase(); var has=function(w){return t.indexOf(w)!==-1;};
    if(has('neon')||has('cyber')||has('futur')||has('sci')||has('city')||has('sky'))
      return {dark:true, road:0x191c2a, edge:0x35e0e8, accent:0x49d6e8, bld1:0x1a1f33, bld2:0x232a47, top:0x0a1030, horizon:0x1b2a5a, sun:0x9ab8ff, sunI:0.85, amb:0.55, exposure:1.0};
    if(has('night')||has('dark')||has('spooky')||has('haunt'))
      return {dark:true, road:0x171924, edge:0x7a6fff, accent:0x8a7bff, bld1:0x191a28, bld2:0x23243c, top:0x070810, horizon:0x161a30, sun:0xb0a8ff, sunI:0.6, amb:0.45, exposure:1.05};
    if(has('space')||has('galaxy')||has('star')||has('cosmic'))
      return {dark:true, road:0x12121f, edge:0x9a8fff, accent:0xb8a9ff, bld1:0x16162e, bld2:0x1e1e3e, top:0x04040a, horizon:0x0c0c1e, sun:0xcabfff, sunI:0.55, amb:0.5, exposure:1.1};
    if(has('lava')||has('fire')||has('volcano'))
      return {dark:true, road:0x22130f, edge:0xff7a3a, accent:0xf2913d, bld1:0x2a1512, bld2:0x3a1d18, top:0x190a08, horizon:0x4a1d0c, sun:0xff8a4a, sunI:1.0, amb:0.5, exposure:1.0};
    if(has('ice')||has('snow')||has('frozen'))
      return {dark:false, road:0x9fb8cc, edge:0xfff8ee, accent:0x49b6e8, bld1:0xbcd0e2, bld2:0xa8c0d6, top:0x8ec2ee, horizon:0xd6e6f2, sun:0xfff4e0, sunI:1.25, amb:0.95, exposure:1.05};
    if(has('forest')||has('jungle')||has('nature')||has('park')||has('grass'))
      return {dark:false, road:0x5a7a4a, edge:0xfff2d0, accent:0x8fe04b, bld1:0x6a8a52, bld2:0x567046, top:0x6fb6ee, horizon:0xbfe0ec, sun:0xfff2c8, sunI:1.3, amb:0.8, exposure:1.05};
    if(has('sunny')||has('day')||has('bright')||has('beach')||has('desert')||has('sand'))
      return {dark:false, road:0xc8b27a, edge:0xfff6e0, accent:0xf2c84b, bld1:0xd8c890, bld2:0xc0a868, top:0x6fb6ee, horizon:0xcfe6ee, sun:0xfff4d0, sunI:1.35, amb:0.85, exposure:1.05};
    return {dark:true, road:0x1a1d28, edge:0x49d6e8, accent:0x6fa8e0, bld1:0x1c1f2c, bld2:0x262a3c, top:0x1a2440, horizon:0x3a5478, sun:0xffe6c0, sunI:1.0, amb:0.6, exposure:1.0};
  }

  function detectMode(bp){
    if(bp.mode){ var m=(''+bp.mode).toLowerCase();
      if(m.indexOf('fly')!==-1) return 'flyer';
      if(m.indexOf('jump')!==-1||m.indexOf('platform')!==-1) return 'jumper';
      if(m.indexOf('run')!==-1||m.indexOf('rac')!==-1||m.indexOf('driv')!==-1) return 'runner';
    }
    var t=((bp.kind||'')+' '+(bp.controls||'')+' '+(bp.goal||'')+' '+(bp.title||'')+' '+((bp.character||{}).look||'')).toLowerCase();
    if(/jump|platform|hop|parkour|mario/.test(t)) return 'jumper';
    if(/fly|flying|plane|jet|spaceship|rocket|bird|aero|drone|glide|space/.test(t)) return 'flyer';
    return 'runner';
  }
  function isFinite_(bp){ var t=((bp.goal||'')+' '+(bp.kind||'')+' '+(bp.title||'')).toLowerCase();
    return /finish|race|reach|win|lap|end|escape|complete|cross|driver|award|level/.test(t); }
  function el(tag,css,html){var e=document.createElement(tag);if(css)e.style.cssText=css;if(html!=null)e.innerHTML=html;return e;}
  function hex(c){ return '#'+('000000'+c.toString(16)).slice(-6); }
  function gridTexture(base, line){
    var c=document.createElement('canvas'); c.width=c.height=64; var x=c.getContext('2d');
    x.fillStyle=hex(base); x.fillRect(0,0,64,64); x.strokeStyle=hex(line); x.globalAlpha=0.35; x.lineWidth=2;
    for(var i=0;i<=64;i+=16){ x.beginPath();x.moveTo(i,0);x.lineTo(i,64);x.stroke(); x.beginPath();x.moveTo(0,i);x.lineTo(64,i);x.stroke(); }
    x.globalAlpha=0.06; for(var n=0;n<260;n++){ x.fillStyle=Math.random()<0.5?'#fff':'#000'; x.fillRect(Math.random()*64,Math.random()*64,2,2); }
    var t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; return t;
  }
  function windowTexture(lit){
    var c=document.createElement('canvas'); c.width=c.height=64; var x=c.getContext('2d'); x.fillStyle='#000'; x.fillRect(0,0,64,64);
    for(var gy=4; gy<64; gy+=12){ for(var gx=4; gx<64; gx+=12){ if(Math.random()<0.55){ x.fillStyle=Math.random()<0.5?hex(lit):'#fff4cc'; x.fillRect(gx,gy,7,7); } } }
    var t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(1,2); return t;
  }

  /* ============================================================ RUN */
  function run(blueprint, mount){
    stop();
    var bp=blueprint||{}, ch=bp.character||{}, wd=bp.world||{};
    var themeText=(wd.setting||'')+' '+(wd.mood||'')+' '+(bp.title||'')+' '+(bp.kind||'');
    var theme=themeFromText(themeText);
    var color=colorFromText(ch.color||ch.look, theme.accent);
    var mode=detectMode(bp);
    var finite=isFinite_(bp);
    var extrasStr=(bp.extras||[]).join(' ')+' '+(bp.challenge||'');
    var hasShield=/shield|invinci|protect|armor|armour/i.test(extrasStr);
    var hasSpeed =/speed|boost|fast|rocket|turbo|nitro/i.test(extrasStr);

    var small=(Math.min(window.innerWidth,window.innerHeight)<820)||('ontouchstart'in window);
    var SHADOW=small?1024:2048;

    var W=mount.clientWidth||600, H=mount.clientHeight||400;
    var renderer=new THREE.WebGLRenderer({antialias:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    renderer.setSize(W,H);
    renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.outputEncoding=THREE.sRGBEncoding; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=theme.exposure;
    mount.appendChild(renderer.domElement);

    var scene=new THREE.Scene(); scene.fog=new THREE.Fog(theme.horizon,30,110);
    var camera=new THREE.PerspectiveCamera(62,W/H,0.1,400); var camFov=62;

    /* ---- sky + sun + stars ---- */
    var skyMat=new THREE.ShaderMaterial({ side:THREE.BackSide, depthWrite:false,
      uniforms:{ top:{value:new THREE.Color(theme.top)}, bot:{value:new THREE.Color(theme.horizon)} },
      vertexShader:'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'varying vec3 vP; uniform vec3 top; uniform vec3 bot; void main(){ float h=clamp(normalize(vP).y*0.6+0.35,0.0,1.0); gl_FragColor=vec4(mix(bot,top,h),1.0);}' });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(250,24,16),skyMat));
    var sunDisc=new THREE.Mesh(new THREE.SphereGeometry(theme.dark?5:9,18,18),new THREE.MeshBasicMaterial({color:theme.sun})); sunDisc.position.set(-70,80,-150); scene.add(sunDisc);
    if(theme.dark){ var sg=new THREE.BufferGeometry(),N=420,pos=new Float32Array(N*3);
      for(var i=0;i<N;i++){ var a=Math.random()*Math.PI*2,ph=Math.acos(Math.random()*0.7+0.2),R=230;
        pos[i*3]=R*Math.sin(ph)*Math.cos(a); pos[i*3+1]=R*Math.cos(ph); pos[i*3+2]=R*Math.sin(ph)*Math.sin(a); }
      sg.setAttribute('position',new THREE.BufferAttribute(pos,3)); scene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:0.8,sizeAttenuation:true}))); }

    /* ---- lights ---- */
    scene.add(new THREE.HemisphereLight(theme.top,theme.road,theme.amb));
    var sun=new THREE.DirectionalLight(theme.sun,theme.sunI); sun.position.set(-14,22,8); sun.castShadow=true;
    sun.shadow.mapSize.set(SHADOW,SHADOW); sun.shadow.camera.near=1; sun.shadow.camera.far=120;
    sun.shadow.camera.left=-26; sun.shadow.camera.right=26; sun.shadow.camera.top=34; sun.shadow.camera.bottom=-34; sun.shadow.bias=-0.0004;
    sun.target.position.set(0,0,-10); scene.add(sun); scene.add(sun.target);

    var LANE_X=[-2.6,0,2.6];

    /* ---- road + city (shared world) ---- */
    var roadTex=gridTexture(theme.road,theme.edge); roadTex.repeat.set(4,90);
    var road=new THREE.Mesh(new THREE.PlaneGeometry(11,300),new THREE.MeshStandardMaterial({color:0xffffff,map:roadTex,roughness:0.95}));
    road.rotation.x=-Math.PI/2; road.position.z=-130; road.receiveShadow=true; scene.add(road);
    var edgeMat=new THREE.MeshStandardMaterial({color:theme.edge,emissive:theme.edge,emissiveIntensity:0.7,roughness:1});
    [-5.5,5.5].forEach(function(x){ var e=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.2,300),edgeMat); e.position.set(x,0.1,-130); scene.add(e); });
    var winTex=windowTexture(theme.accent); var buildings=[];
    function makeBuilding(side){ var grp=new THREE.Group(); var h=5+Math.random()*24,w=2.4+Math.random()*3.4,dp=2.4+Math.random()*3.6;
      var base=Math.random()<0.5?theme.bld1:theme.bld2;
      var mat=new THREE.MeshStandardMaterial({color:base,roughness:0.9,metalness:0.05,emissive:theme.accent,emissiveMap:winTex,emissiveIntensity:theme.dark?0.9:0.25,flatShading:true});
      var b=new THREE.Mesh(new THREE.BoxGeometry(w,h,dp),mat); b.position.y=h/2; b.castShadow=true; b.receiveShadow=true; grp.add(b);
      grp.position.set(side*(7+Math.random()*9),0,0); grp.userData={side:side}; return grp; }
    var SPAN=150,GAP=11;
    for(var s=-1;s<=1;s+=2){ for(var bz=0;bz<SPAN/GAP;bz++){ var bld=makeBuilding(s); bld.position.z=-bz*GAP-Math.random()*5; scene.add(bld); buildings.push(bld); } }

    function part(geo,mat){var m=new THREE.Mesh(geo,mat);m.castShadow=true;return m;}
    var hullMat=new THREE.MeshStandardMaterial({color:color,roughness:0.4,metalness:0.3,flatShading:true});
    var glassMat=new THREE.MeshStandardMaterial({color:0x10131c,roughness:0.15,metalness:0.5,flatShading:true});

    /* ---- PLAYER (craft for runner/flyer, character for jumper) ---- */
    var player=new THREE.Group(), glow;
    function buildCraft(){
      var hull=part(new THREE.BoxGeometry(1.2,0.32,1.9),hullMat); hull.position.y=0.2; player.add(hull);
      var nose=part(new THREE.ConeGeometry(0.55,1.0,4),hullMat); nose.rotation.x=-Math.PI/2; nose.rotation.z=Math.PI/4; nose.position.set(0,0.2,-1.25); player.add(nose);
      var can=part(new THREE.BoxGeometry(0.6,0.34,0.7),glassMat); can.position.set(0,0.45,-0.1); player.add(can);
      [-1,1].forEach(function(sx){ var wing=part(new THREE.BoxGeometry(0.9,0.07,0.7),hullMat); wing.position.set(sx*0.85,0.18,0.45); wing.rotation.y=sx*0.3; player.add(wing);
        var th=part(new THREE.CylinderGeometry(0.16,0.16,0.4,8),new THREE.MeshStandardMaterial({color:theme.accent,emissive:theme.accent,emissiveIntensity:1.1,roughness:1})); th.rotation.x=Math.PI/2; th.position.set(sx*0.85,0.18,0.95); player.add(th); });
      glow=new THREE.Mesh(new THREE.RingGeometry(0.6,1.25,22),new THREE.MeshBasicMaterial({color:color,transparent:true,opacity:0.3,side:THREE.DoubleSide})); glow.rotation.x=-Math.PI/2; glow.position.y=-0.55; player.add(glow);
    }
    function buildCharacter(){
      var legMat=new THREE.MeshStandardMaterial({color:0x2a2d36,roughness:0.7,flatShading:true});
      [-0.22,0.22].forEach(function(lx){ var leg=part(new THREE.BoxGeometry(0.28,0.5,0.3),legMat); leg.position.set(lx,0.25,0); player.add(leg); });
      var torso=part(new THREE.BoxGeometry(0.7,0.7,0.45),hullMat); torso.position.y=0.85; player.add(torso);
      var head=part(new THREE.BoxGeometry(0.5,0.5,0.5),new THREE.MeshStandardMaterial({color:0xf0d2b0,roughness:0.8,flatShading:true})); head.position.y=1.45; player.add(head);
      [-0.5,0.5].forEach(function(ax){ var arm=part(new THREE.BoxGeometry(0.2,0.6,0.22),hullMat); arm.position.set(ax,0.85,0); player.add(arm); });
      glow=new THREE.Mesh(new THREE.RingGeometry(0.4,0.7,20),new THREE.MeshBasicMaterial({color:color,transparent:true,opacity:0.2,side:THREE.DoubleSide})); glow.rotation.x=-Math.PI/2; glow.position.y=0.02; player.add(glow);
    }
    var HOVER = mode==='jumper' ? 0 : 1.25;
    if(mode==='jumper') buildCharacter(); else buildCraft();
    player.position.set(0,HOVER,4); scene.add(player);

    /* ---- hazards + gems per mode ---- */
    var TC=[0xe8484f,0xf2913d,0xb0b6c4,0x4f8df2,0x9aa0ad];
    var obstacles=[], gems=[];
    function makeCar(){ var grp=new THREE.Group(); var police=Math.random()<0.3; var col=police?0x20242e:TC[Math.floor(Math.random()*TC.length)];
      var body=part(new THREE.BoxGeometry(1.15,0.4,1.7),new THREE.MeshStandardMaterial({color:col,roughness:0.5,metalness:0.2,flatShading:true})); body.position.y=0.25; grp.add(body);
      var cab=part(new THREE.BoxGeometry(0.8,0.34,0.85),new THREE.MeshStandardMaterial({color:0x10131c,roughness:0.3,flatShading:true})); cab.position.set(0,0.55,0.05); grp.add(cab);
      if(police){ [[-0.18,0xe8484f],[0.18,0x4f8df2]].forEach(function(p){ var lt=part(new THREE.BoxGeometry(0.18,0.12,0.2),new THREE.MeshStandardMaterial({color:p[1],emissive:p[1],emissiveIntensity:1.0})); lt.position.set(p[0],0.8,0.1); grp.add(lt); }); }
      return grp; }
    function makeFloatBlock(){ var col=TC[Math.floor(Math.random()*TC.length)];
      var m=part(new THREE.IcosahedronGeometry(0.7,0),new THREE.MeshStandardMaterial({color:col,roughness:0.5,metalness:0.1,emissive:col,emissiveIntensity:0.15,flatShading:true})); return m; }
    function makeWall(){ var w=part(new THREE.BoxGeometry(4.4,1.0,0.7),new THREE.MeshStandardMaterial({color:0xe8484f,roughness:0.5,emissive:0x611,emissiveIntensity:0.3,flatShading:true})); w.position.y=0.5; var grp=new THREE.Group(); grp.add(w); return grp; }
    var gemMat=new THREE.MeshStandardMaterial({color:theme.accent,roughness:0.2,metalness:0.4,emissive:theme.accent,emissiveIntensity:0.7,flatShading:true});

    function spawnObstacle(z){
      var m, lane=Math.floor(Math.random()*3);
      if(mode==='runner'){ m=makeCar(); m.position.set(LANE_X[lane],1.25,z); m.userData={lane:lane,hit:false}; }
      else if(mode==='flyer'){ m=makeFloatBlock(); var fx=(Math.random()*2-1)*3.6, fy=0.9+Math.random()*3.6; m.position.set(fx,fy,z); m.userData={hit:false}; }
      else { m=makeWall(); m.position.set(0,0,z); m.userData={hit:false}; }
      scene.add(m); obstacles.push(m);
    }
    function spawnGem(z){
      var m=new THREE.Mesh(new THREE.OctahedronGeometry(0.42),gemMat);
      var pw=(hasShield||hasSpeed)&&Math.random()<0.35;
      if(mode==='runner'){ var lane=Math.floor(Math.random()*3); m.position.set(LANE_X[lane],1.35,z); m.userData={lane:lane,got:false,kind:pw?'power':'coin'}; }
      else if(mode==='flyer'){ m.position.set((Math.random()*2-1)*3.4,0.9+Math.random()*3.4,z); m.userData={got:false,kind:pw?'power':'coin'}; }
      else { m.position.set(0, Math.random()<0.5?0.6:1.7, z); m.userData={got:false,kind:pw?'power':'coin'}; }
      if(pw)m.scale.set(1.5,1.5,1.5); scene.add(m); gems.push(m);
    }
    for(var k=0;k<14;k++){ if(Math.random()<0.7) spawnObstacle(-22-k*9-Math.random()*4); if(Math.random()<0.6) spawnGem(-22-k*9-4-Math.random()*4); }

    /* ---- HUD ---- */
    var hud=el('div','position:absolute;inset:0;pointer-events:none;font-family:Inter,system-ui,sans-serif;');
    var stats=el('div','position:absolute;top:14px;left:16px;color:#fff;font-size:14px;font-weight:600;text-shadow:0 1px 5px rgba(0,0,0,.8);');
    var hintTxt = mode==='flyer' ? 'arrows / W A S D to fly · drag on mobile' : (mode==='jumper' ? 'Space / ↑ to jump · tap on mobile' : '← → or A / D · tap left / right on mobile');
    var hint=el('div','position:absolute;bottom:14px;left:0;right:0;text-align:center;color:#e6e9f0;font-size:12px;text-shadow:0 1px 5px rgba(0,0,0,.8);',hintTxt);
    var center=el('div','position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;');
    hud.appendChild(stats);hud.appendChild(hint);hud.appendChild(center);mount.appendChild(hud);
    function bigMessage(title,sub,btn,onBtn){ center.innerHTML='';
      center.appendChild(el('div','color:#fff;font-family:\'Space Grotesk\',sans-serif;font-weight:700;font-size:30px;text-shadow:0 2px 10px rgba(0,0,0,.9);',title));
      if(sub) center.appendChild(el('div','color:#e6e9f0;font-size:14px;text-shadow:0 1px 6px rgba(0,0,0,.9);',sub));
      if(btn){var b=el('button','pointer-events:auto;cursor:pointer;border:none;border-radius:12px;padding:12px 24px;font-family:\'Space Grotesk\',sans-serif;font-weight:600;font-size:15px;color:#15151a;background:radial-gradient(circle at 38% 32%,#fff,#e8ecf4 45%,#767e98);box-shadow:0 0 16px 2px rgba(174,185,214,.5);',btn);b.onclick=onBtn;center.appendChild(b);}
      center.style.background='rgba(6,7,12,.45)'; }
    function clearMessage(){center.innerHTML='';center.style.background='none';}

    /* ---- state ---- */
    var g={lane:1, fx:0, fy:1.8, py:0, vy:0, onGround:true,
      lives:3, score:0, distance:0, speed:0.42, maxSpeed:1.1,
      finishDist:finite?1100:0, shieldT:0, boostT:0, invuln:0, running:false, ended:false, shake:0, raf:0};
    var keys={};
    function updateStats(){ var hp=''; for(var n=0;n<g.lives;n++) hp+='♥';
      var line='◆ '+g.score+'   '+hp;
      line+= finite ? '   '+Math.min(100,Math.floor(g.distance/g.finishDist*100))+'%' : '   '+Math.floor(g.distance)+'m';
      if(g.shieldT>0) line+='   ⛨'; if(g.boostT>0) line+='   »»'; stats.textContent=line; }

    /* ---- input ---- */
    function laneMove(d){ if(g.running) g.lane=Math.max(0,Math.min(2,g.lane+d)); }
    function jump(){ if(g.running && g.onGround){ g.vy=0.34; g.onGround=false; } }
    function onKey(e){ var k=e.key; keys[k.toLowerCase()]=true;
      if(mode==='runner'){ if(k==='ArrowLeft'||k==='a'||k==='A') laneMove(-1); else if(k==='ArrowRight'||k==='d'||k==='D') laneMove(1); }
      else if(mode==='jumper'){ if(k===' '||k==='ArrowUp'||k==='w'||k==='W') jump(); } }
    function onKeyUp(e){ keys[e.key.toLowerCase()]=false; }
    function pointer(e){ var r=renderer.domElement.getBoundingClientRect();
      var px=(e.touches?e.touches[0].clientX:e.clientX)-r.left, py=(e.touches?e.touches[0].clientY:e.clientY)-r.top;
      if(mode==='runner'){ laneMove(px<r.width/2?-1:1); }
      else if(mode==='jumper'){ jump(); }
      else { g.fx=Math.max(-3.8,Math.min(3.8,(px/r.width*2-1)*3.8)); g.fy=Math.max(0.6,Math.min(4.8,(1-py/r.height)*4.4+0.5)); } }
    window.addEventListener('keydown',onKey); window.addEventListener('keyup',onKeyUp);
    renderer.domElement.addEventListener('mousedown',pointer);
    renderer.domElement.addEventListener('mousemove',function(e){ if(mode==='flyer'&&(e.buttons&1)) pointer(e); });
    renderer.domElement.addEventListener('touchstart',function(e){e.preventDefault();pointer(e);},{passive:false});
    renderer.domElement.addEventListener('touchmove',function(e){e.preventDefault();pointer(e);},{passive:false});
    function onResize(){var w=mount.clientWidth,h=mount.clientHeight;if(!w||!h)return; renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
    window.addEventListener('resize',onResize);

    /* ---- juice + rules ---- */
    var bits=[];
    function burst(pos,c){ for(var b=0;b<10;b++){ var p=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.12,0.12),new THREE.MeshBasicMaterial({color:c}));
      p.position.copy(pos); p.userData={v:new THREE.Vector3((Math.random()-0.5)*0.4,Math.random()*0.4,(Math.random()-0.5)*0.4),life:30}; scene.add(p);bits.push(p); } }
    function takeHit(pos){ if(g.shieldT>0||g.boostT>0||g.invuln>0){ burst(pos,0xffffff); return false; }
      g.lives--; g.invuln=70; g.shake=14; burst(pos,0xe8484f); updateStats(); if(g.lives<=0) endGame(false); return true; }
    function endGame(won){ if(g.ended)return; g.ended=true;g.running=false;
      if(won) bigMessage('You win! ✦','Score '+g.score,'Play again',restart); else bigMessage('Game over','Score '+g.score,'Try again',restart); }
    function restart(){ window.GameGenieEngine.run(blueprint,mount); }
    function gotGem(m){ m.userData.got=true; m.visible=false; burst(m.position, m.userData.kind==='power'?0xfff2a0:theme.accent);
      if(m.userData.kind==='power'){ g.score+=5; if(hasShield)g.shieldT=320; if(hasSpeed)g.boostT=200; if(!hasShield&&!hasSpeed)g.score+=5; } else g.score+=1; updateStats(); }

    /* ---- loop ---- */
    var clock=0;
    function loop(){ g.raf=requestAnimationFrame(loop); clock++;
      if(g.running&&!g.ended){
        g.speed=Math.min(g.maxSpeed,g.speed+0.00018); var spd=g.speed*(g.boostT>0?1.8:1); g.distance+=spd;
        if(g.shieldT>0)g.shieldT--; if(g.boostT>0)g.boostT--; if(g.invuln>0)g.invuln--;

        buildings.forEach(function(b){ b.position.z+=spd; if(b.position.z>18){ b.position.z-=SPAN; b.position.x=b.userData.side*(7+Math.random()*9); }});

        // flyer continuous keyboard
        if(mode==='flyer'){ if(keys['arrowleft']||keys['a'])g.fx-=0.13; if(keys['arrowright']||keys['d'])g.fx+=0.13;
          if(keys['arrowup']||keys['w'])g.fy+=0.13; if(keys['arrowdown']||keys['s'])g.fy-=0.13;
          g.fx=Math.max(-3.8,Math.min(3.8,g.fx)); g.fy=Math.max(0.6,Math.min(4.8,g.fy)); }
        // jumper gravity
        if(mode==='jumper'){ g.vy-=0.018; g.py+=g.vy; if(g.py<=0){g.py=0;g.vy=0;g.onGround=true;} }

        // obstacles
        obstacles.forEach(function(o){ o.position.z+=spd; if(o.rotation) o.rotation.y=Math.sin(clock*0.02)*0.04;
          if(!o.userData.hit && o.position.z>2.0 && o.position.z<5.6){
            var hitNow=false;
            if(mode==='runner'){ if(o.userData.lane===g.lane) hitNow=true; }
            else if(mode==='flyer'){ if(Math.abs(o.position.x-player.position.x)<0.95 && Math.abs(o.position.y-player.position.y)<0.95) hitNow=true; }
            else { if(g.py < 0.9) hitNow=true; } // jumper: didn't clear the wall
            if(hitNow){ o.userData.hit=true; o.visible=false; takeHit(o.position); }
          }
          if(o.position.z>13){ o.position.z-=150-Math.random()*20; o.userData.hit=false; o.visible=true;
            if(mode==='runner'){ var ln=Math.floor(Math.random()*3); o.position.x=LANE_X[ln]; o.userData.lane=ln; }
            else if(mode==='flyer'){ o.position.x=(Math.random()*2-1)*3.6; o.position.y=0.9+Math.random()*3.6; } } });

        // gems
        gems.forEach(function(m){ m.position.z+=spd; m.rotation.y+=0.06;
          if(!m.userData.got && m.position.z>2.0 && m.position.z<5.6){
            var grab=false;
            if(mode==='runner'){ if(m.userData.lane===g.lane) grab=true; }
            else if(mode==='flyer'){ if(Math.abs(m.position.x-player.position.x)<1.0 && Math.abs(m.position.y-player.position.y)<1.0) grab=true; }
            else { if(Math.abs((g.py+0.8)-m.position.y)<1.0) grab=true; }
            if(grab) gotGem(m);
          }
          if(m.position.z>13){ m.position.z-=150-Math.random()*20; m.userData.got=false; m.visible=true;
            if(mode==='runner'){ var l2=Math.floor(Math.random()*3); m.position.x=LANE_X[l2]; m.userData.lane=l2; }
            else if(mode==='flyer'){ m.position.x=(Math.random()*2-1)*3.4; m.position.y=0.9+Math.random()*3.4; }
            else { m.position.y=Math.random()<0.5?0.6:1.7; } } });

        if(finite&&g.distance>=g.finishDist) endGame(true);
      }

      // ---- player visual per mode ----
      if(mode==='runner'){ var tx=LANE_X[g.lane], dx=tx-player.position.x; player.position.x+=dx*0.16;
        player.rotation.z+=(dx*-0.4-player.rotation.z)*0.18; player.rotation.y=dx*0.12; player.position.y=HOVER+Math.sin(clock*0.09)*0.07; }
      else if(mode==='flyer'){ var dxf=g.fx-player.position.x, dyf=g.fy-player.position.y; player.position.x+=dxf*0.15; player.position.y+=dyf*0.15;
        player.rotation.z+=(dxf*-0.35-player.rotation.z)*0.15; player.rotation.x=(-dyf*0.2-player.rotation.x)*0.15+player.rotation.x; }
      else { player.position.x=0; player.position.y=g.py; player.rotation.x=g.onGround?0:-0.2; }

      player.visible=!(g.invuln>0&&Math.floor(clock/4)%2===0);
      if(glow) glow.material.opacity=g.shieldT>0?0.55+Math.sin(clock*0.3)*0.2:(mode==='jumper'?0.2:0.3);

      // ---- camera per mode ----
      var camY = mode==='flyer' ? 4.6 : (mode==='jumper'?3.6:5.3);
      camera.position.x+=(player.position.x*0.5-camera.position.x)*0.08;
      camera.position.y+=((camY+Math.sin(clock*0.05)*0.12 + (mode==='flyer'?player.position.y*0.25:0))-camera.position.y)*0.1;
      if(g.shake>0){g.shake--;camera.position.x+=(Math.random()-0.5)*g.shake*0.05;}
      camera.position.z = mode==='jumper'?10:9;
      camera.rotation.z+=(player.position.x*-0.016-camera.rotation.z)*0.1;
      var wantFov=g.boostT>0?72:62; camFov+=(wantFov-camFov)*0.08; camera.fov=camFov; camera.updateProjectionMatrix();
      camera.lookAt(player.position.x*0.4, mode==='flyer'?2.0:1.4, -12);

      for(var b=bits.length-1;b>=0;b--){ var p=bits[b]; p.position.add(p.userData.v); p.userData.v.y-=0.02; p.userData.life--;
        p.material.transparent=true; p.material.opacity=Math.max(0,p.userData.life/30); if(p.userData.life<=0){scene.remove(p);bits.splice(b,1);} }
      renderer.render(scene,camera);
    }

    var label = mode==='flyer'?'Fly · dodge the hazards · grab the gems' : (mode==='jumper'?'Run & jump the walls · grab the gems':(finite?'Reach the finish · dodge the traffic':'Survive · grab the gems'));
    state={renderer:renderer,scene:scene,mount:mount,onKey:onKey,onKeyUp:onKeyUp,onResize:onResize,g:g};
    updateStats();
    bigMessage((bp.title||'Your game'), label, 'Start', function(){clearMessage();g.running=true;});
    loop();
  }

  /* ============================================================ STOP */
  function stop(){
    if(!state)return;
    cancelAnimationFrame(state.g.raf);
    window.removeEventListener('keydown',state.onKey); window.removeEventListener('keyup',state.onKeyUp);
    window.removeEventListener('resize',state.onResize);
    try{ state.scene.traverse(function(o){ if(o.geometry)o.geometry.dispose();
      if(o.material){ Array.isArray(o.material)?o.material.forEach(function(m){m.dispose();}):o.material.dispose(); } });
      state.renderer.dispose(); }catch(e){}
    if(state.mount)state.mount.innerHTML='';
    state=null;
  }

  window.GameGenieEngine={run:run,stop:stop};
})();
