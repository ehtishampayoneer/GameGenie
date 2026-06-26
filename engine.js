/* ============================================================
   GameGenie — the ENGINE  (Phase 3.1 — richer world)
   ------------------------------------------------------------
   Reads a BLUEPRINT and cooks a real low-poly game on screen.
   No images — every shape is built from code.

   This build adds: a scrolling low-poly CITY, car-shaped
   TRAFFIC, a proper hovering FLYING CRAFT, and a living CAMERA
   that banks and moves. Still the dodge-runner engine at heart.

   Needs Three.js (global THREE).
   window.GameGenieEngine.run(blueprint, mountEl) / .stop()
   ============================================================ */
(function () {
  'use strict';
  var THREE = window.THREE;
  var state = null;

  /* ---------- words -> colours & themes ---------- */
  var NAMED = {
    red:0xe8484f, crimson:0xe8484f, orange:0xf2913d, amber:0xf2913d,
    yellow:0xf2d24b, gold:0xf2c84b, green:0x4fcf72, lime:0x8fe04b,
    teal:0x3fc9c2, cyan:0x49d6e8, aqua:0x49d6e8, blue:0x4f8df2,
    azure:0x4f8df2, navy:0x3a5fd9, purple:0x9a5fe0, violet:0x9a5fe0,
    magenta:0xe05fc4, pink:0xf07ab0, rose:0xf07ab0, white:0xf2f2f5,
    silver:0xcfd3dc, grey:0x9aa0ad, gray:0x9aa0ad, black:0x2a2c33, brown:0x9a6b43
  };
  function colorFromText(t, fb){
    if(!t) return fb; t=(' '+t+' ').toLowerCase();
    for(var n in NAMED){ if(t.indexOf(n)!==-1) return NAMED[n]; } return fb;
  }
  function themeFromText(t){
    t=(t||'').toLowerCase(); var has=function(w){return t.indexOf(w)!==-1;};
    if(has('neon')||has('cyber')||has('futur')||has('sci')||has('city')||has('sky'))
      return {road:0x14161f, edge:0x2bd6e0, fog:0x07080f, sky:0x090a14, accent:0x49d6e8, bld1:0x1a1d2b, bld2:0x222742, amb:0.55};
    if(has('night')||has('dark')||has('spooky')||has('haunt'))
      return {road:0x15171f, edge:0x6a5fff, fog:0x090910, sky:0x0b0c15, accent:0x8a7bff, bld1:0x1a1b26, bld2:0x24243a, amb:0.45};
    if(has('space')||has('galaxy')||has('star')||has('cosmic'))
      return {road:0x0e0e18, edge:0x8a7bff, fog:0x05050c, sky:0x05050c, accent:0xb8a9ff, bld1:0x14142a, bld2:0x1c1c3a, amb:0.5};
    if(has('lava')||has('fire')||has('volcano'))
      return {road:0x1e1210, edge:0xe86a3a, fog:0x120807, sky:0x180a08, accent:0xf2913d, bld1:0x2a1512, bld2:0x3a1d18, amb:0.55};
    if(has('ice')||has('snow')||has('frozen'))
      return {road:0x2a3540, edge:0x8fd6ee, fog:0x152028, sky:0x1a2833, accent:0x49b6e8, bld1:0x2e3e4a, bld2:0x3a4e5e, amb:0.8};
    if(has('forest')||has('jungle')||has('nature'))
      return {road:0x1c2a20, edge:0x4fcf72, fog:0x101a14, sky:0x14241a, accent:0x8fe04b, bld1:0x1f3a28, bld2:0x274a32, amb:0.6};
    return {road:0x16171d, edge:0x49d6e8, fog:0x0a0a10, sky:0x0c0d16, accent:0x6fa8e0, bld1:0x1a1c26, bld2:0x23263a, amb:0.55};
  }
  function isFinite_(bp){
    var t=((bp.goal||'')+' '+(bp.kind||'')+' '+(bp.title||'')).toLowerCase();
    return /finish|race|reach|win|lap|end|escape|complete|cross|award|driver/.test(t);
  }
  function el(tag,css,html){var e=document.createElement(tag);if(css)e.style.cssText=css;if(html!=null)e.innerHTML=html;return e;}

  /* ============================================================ RUN */
  function run(blueprint, mount){
    stop();
    var bp=blueprint||{}, ch=bp.character||{}, wd=bp.world||{};
    var themeText=(wd.setting||'')+' '+(wd.mood||'')+' '+(bp.title||'')+' '+(bp.kind||'');
    var theme=themeFromText(themeText);
    var playerColor=colorFromText(ch.color||ch.look, theme.accent);
    var finite=isFinite_(bp);
    var extrasStr=(bp.extras||[]).join(' ')+' '+(bp.challenge||'');
    var hasShield=/shield|invinci|protect|armor|armour/i.test(extrasStr);
    var hasSpeed =/speed|boost|fast|rocket|turbo|nitro/i.test(extrasStr);

    var W=mount.clientWidth||600, H=mount.clientHeight||400;
    var renderer=new THREE.WebGLRenderer({antialias:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    renderer.setSize(W,H); renderer.setClearColor(theme.sky,1);
    mount.appendChild(renderer.domElement);

    var scene=new THREE.Scene();
    scene.fog=new THREE.Fog(theme.fog,26,95);
    var camera=new THREE.PerspectiveCamera(62,W/H,0.1,300);
    var camFov=62;

    scene.add(new THREE.HemisphereLight(0xffffff, theme.road, theme.amb));
    var dir=new THREE.DirectionalLight(0xffffff,0.7); dir.position.set(5,12,6); scene.add(dir);

    var LANE_X=[-2.6,0,2.6], ROAD_Y=0, HOVER=1.25;

    /* ---- floating sky-road ---- */
    var road=new THREE.Mesh(new THREE.PlaneGeometry(11,260),
      new THREE.MeshStandardMaterial({color:theme.road,roughness:1,metalness:0}));
    road.rotation.x=-Math.PI/2; road.position.z=-110; scene.add(road);
    // glowing edges
    var edgeMat=new THREE.MeshStandardMaterial({color:theme.edge,emissive:theme.edge,emissiveIntensity:0.6,roughness:1});
    [-5.5,5.5].forEach(function(x){
      var e=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.18,260),edgeMat);
      e.position.set(x,0.09,-110); scene.add(e);
    });
    // dashed lane lines (speed feel)
    var dashMat=new THREE.MeshStandardMaterial({color:theme.edge,emissive:theme.edge,emissiveIntensity:0.3,roughness:1});
    var dashes=[];
    for(var d=0;d<24;d++){
      [-1.3,1.3].forEach(function(x){
        var m=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.02,2.2),dashMat);
        m.position.set(x,0.05,-d*5); scene.add(m); dashes.push(m);
      });
    }

    /* ---- low-poly CITY: buildings either side ---- */
    var buildings=[];
    function makeBuilding(side){
      var grp=new THREE.Group();
      var h=4+Math.random()*22, w=2+Math.random()*3.2, dp=2+Math.random()*3.5;
      var base=Math.random()<0.5?theme.bld1:theme.bld2;
      var b=new THREE.Mesh(new THREE.BoxGeometry(w,h,dp),
        new THREE.MeshStandardMaterial({color:base,roughness:0.9,metalness:0.05,flatShading:true}));
      b.position.y=h/2; grp.add(b);
      // a couple of glowing "windows"/signs for life
      var wins=1+Math.floor(Math.random()*2);
      for(var i=0;i<wins;i++){
        var win=new THREE.Mesh(new THREE.BoxGeometry(w*0.5,0.6+Math.random()*1.2,0.06),
          new THREE.MeshStandardMaterial({color:theme.accent,emissive:theme.accent,emissiveIntensity:0.8,roughness:1}));
        win.position.set((Math.random()-0.5)*w*0.4, h*(0.3+Math.random()*0.5), dp/2+0.02);
        grp.add(win);
      }
      var x=side*(7+Math.random()*8);
      grp.position.set(x,0,0);
      grp.userData={side:side};
      return grp;
    }
    var BUILD_SPAN=140, BUILD_GAP=11;
    for(var s=-1;s<=1;s+=2){
      for(var bz=0;bz<BUILD_SPAN/BUILD_GAP;bz++){
        var bld=makeBuilding(s);
        bld.position.z=-bz*BUILD_GAP - Math.random()*5;
        scene.add(bld); buildings.push(bld);
      }
    }

    /* ---- the FLYING CRAFT (player) ---- */
    var player=new THREE.Group();
    var hullMat=new THREE.MeshStandardMaterial({color:playerColor,roughness:0.4,metalness:0.25,flatShading:true});
    var glassMat=new THREE.MeshStandardMaterial({color:0x10131c,roughness:0.2,metalness:0.4,flatShading:true});
    var hull=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.32,1.9),hullMat); hull.position.y=0.2; player.add(hull);
    var nose=new THREE.Mesh(new THREE.ConeGeometry(0.55,1.0,4),hullMat);
    nose.rotation.x=-Math.PI/2; nose.rotation.z=Math.PI/4; nose.position.set(0,0.2,-1.25); player.add(nose);
    var canopy=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.34,0.7),glassMat); canopy.position.set(0,0.45,-0.1); player.add(canopy);
    // swept wings
    [-1,1].forEach(function(sx){
      var wing=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.07,0.7),hullMat);
      wing.position.set(sx*0.85,0.18,0.45); wing.rotation.y=sx*0.3; player.add(wing);
      // thruster core (glowing)
      var th=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.4,8),
        new THREE.MeshStandardMaterial({color:theme.accent,emissive:theme.accent,emissiveIntensity:1.0,roughness:1}));
      th.rotation.x=Math.PI/2; th.position.set(sx*0.85,0.18,0.95); player.add(th);
    });
    // hover glow underneath
    var glow=new THREE.Mesh(new THREE.RingGeometry(0.6,1.25,22),
      new THREE.MeshBasicMaterial({color:playerColor,transparent:true,opacity:0.3,side:THREE.DoubleSide}));
    glow.rotation.x=-Math.PI/2; glow.position.y=-HOVER+0.05; player.add(glow);
    player.position.set(LANE_X[1],HOVER,4); scene.add(player);

    /* ---- TRAFFIC (obstacles, car-shaped) + gems ---- */
    var TRAFFIC_COLORS=[0xe8484f,0xf2913d,0xb0b6c4,0x4f8df2,0x9aa0ad];
    var obstacles=[], gems=[];
    function makeCar(){
      var grp=new THREE.Group();
      var police=Math.random()<0.3;
      var col=police?0x20242e:TRAFFIC_COLORS[Math.floor(Math.random()*TRAFFIC_COLORS.length)];
      var body=new THREE.Mesh(new THREE.BoxGeometry(1.15,0.4,1.7),
        new THREE.MeshStandardMaterial({color:col,roughness:0.5,metalness:0.15,flatShading:true}));
      body.position.y=0.25; grp.add(body);
      var cab=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.34,0.85),
        new THREE.MeshStandardMaterial({color:0x10131c,roughness:0.3,flatShading:true}));
      cab.position.set(0,0.55,0.05); grp.add(cab);
      if(police){
        [[-0.18,0xe8484f],[0.18,0x4f8df2]].forEach(function(p){
          var lt=new THREE.Mesh(new THREE.BoxGeometry(0.18,0.12,0.2),
            new THREE.MeshStandardMaterial({color:p[1],emissive:p[1],emissiveIntensity:1.0}));
          lt.position.set(p[0],0.8,0.1); grp.add(lt);
        });
      }
      return grp;
    }
    function spawnObstacle(z){
      var m=makeCar(); var lane=Math.floor(Math.random()*3);
      m.position.set(LANE_X[lane],HOVER,z);
      m.userData={lane:lane,hit:false}; scene.add(m); obstacles.push(m);
    }
    var gemMat=new THREE.MeshStandardMaterial({color:theme.accent,roughness:0.25,metalness:0.3,emissive:theme.accent,emissiveIntensity:0.6,flatShading:true});
    function spawnGem(z){
      var m=new THREE.Mesh(new THREE.OctahedronGeometry(0.42),gemMat);
      var lane=Math.floor(Math.random()*3);
      m.position.set(LANE_X[lane],HOVER+0.1,z);
      var pw=(hasShield||hasSpeed)&&Math.random()<0.35;
      m.userData={lane:lane,got:false,kind:pw?'power':'coin'};
      if(pw) m.scale.set(1.5,1.5,1.5);
      scene.add(m); gems.push(m);
    }
    for(var i=0;i<14;i++){
      if(Math.random()<0.72) spawnObstacle(-22-i*9-Math.random()*4);
      if(Math.random()<0.6)  spawnGem(-22-i*9-4-Math.random()*4);
    }

    /* ---- HUD ---- */
    var hud=el('div','position:absolute;inset:0;pointer-events:none;font-family:Inter,system-ui,sans-serif;');
    var stats=el('div','position:absolute;top:14px;left:16px;color:#fff;font-size:14px;font-weight:600;text-shadow:0 1px 4px rgba(0,0,0,.7);');
    var hint=el('div','position:absolute;bottom:14px;left:0;right:0;text-align:center;color:#cfd3dc;font-size:12px;text-shadow:0 1px 4px rgba(0,0,0,.7);','← → or A / D to switch lanes · tap left / right on mobile');
    var center=el('div','position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;');
    hud.appendChild(stats);hud.appendChild(hint);hud.appendChild(center);mount.appendChild(hud);
    function bigMessage(title,sub,btn,onBtn){
      center.innerHTML='';
      center.appendChild(el('div','color:#fff;font-family:\'Space Grotesk\',sans-serif;font-weight:700;font-size:30px;text-shadow:0 2px 8px rgba(0,0,0,.8);',title));
      if(sub) center.appendChild(el('div','color:#cfd3dc;font-size:14px;text-shadow:0 1px 4px rgba(0,0,0,.7);',sub));
      if(btn){var b=el('button','pointer-events:auto;cursor:pointer;border:none;border-radius:12px;padding:12px 24px;font-family:\'Space Grotesk\',sans-serif;font-weight:600;font-size:15px;color:#15151a;background:radial-gradient(circle at 38% 32%,#fff,#e8ecf4 45%,#767e98);box-shadow:0 0 16px 2px rgba(174,185,214,.5);',btn);b.onclick=onBtn;center.appendChild(b);}
      center.style.background='rgba(7,7,12,.5)';
    }
    function clearMessage(){center.innerHTML='';center.style.background='none';}

    /* ---- state ---- */
    var g={laneTarget:1,lives:3,score:0,distance:0,speed:0.42,maxSpeed:1.1,
      finishDist:finite?1150:0,shieldT:0,boostT:0,invuln:0,running:false,ended:false,shake:0,raf:0};
    function updateStats(){
      var hp=''; for(var k=0;k<g.lives;k++) hp+='♥';
      var line='◆ '+g.score+'   '+hp;
      line+= finite ? '   '+Math.min(100,Math.floor(g.distance/g.finishDist*100))+'%' : '   '+Math.floor(g.distance)+'m';
      if(g.shieldT>0) line+='   ⛨';
      if(g.boostT>0) line+='   »»';
      stats.textContent=line;
    }

    /* ---- input ---- */
    function move(dir){ if(g.running) g.laneTarget=Math.max(0,Math.min(2,g.laneTarget+dir)); }
    function onKey(e){ var k=e.key;
      if(k==='ArrowLeft'||k==='a'||k==='A') move(-1);
      else if(k==='ArrowRight'||k==='d'||k==='D') move(1); }
    function onTap(e){ var r=renderer.domElement.getBoundingClientRect();
      var x=(e.touches?e.touches[0].clientX:e.clientX)-r.left; move(x<r.width/2?-1:1); }
    window.addEventListener('keydown',onKey);
    renderer.domElement.addEventListener('mousedown',onTap);
    renderer.domElement.addEventListener('touchstart',function(e){e.preventDefault();onTap(e);},{passive:false});
    function onResize(){var w=mount.clientWidth,h=mount.clientHeight;if(!w||!h)return;
      renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
    window.addEventListener('resize',onResize);

    /* ---- juice ---- */
    var bits=[];
    function burst(pos,color){
      for(var b=0;b<10;b++){
        var p=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.12,0.12),new THREE.MeshBasicMaterial({color:color}));
        p.position.copy(pos);
        p.userData={v:new THREE.Vector3((Math.random()-0.5)*0.4,Math.random()*0.4,(Math.random()-0.5)*0.4),life:30};
        scene.add(p);bits.push(p);
      }
    }
    function hitObstacle(o){
      if(g.shieldT>0||g.boostT>0||g.invuln>0){o.userData.hit=true;o.visible=false;burst(o.position,0xffffff);return;}
      o.userData.hit=true;o.visible=false;g.lives--;g.invuln=70;g.shake=14;
      burst(o.position,0xe8484f);updateStats();
      if(g.lives<=0) endGame(false);
    }
    function endGame(won){ if(g.ended)return; g.ended=true;g.running=false;
      if(won) bigMessage('You win! ✦','Score '+g.score,'Play again',restart);
      else bigMessage('Crashed','Score '+g.score,'Try again',restart);
    }
    function restart(){ window.GameGenieEngine.run(blueprint,mount); }

    /* ---- loop ---- */
    var clock=0;
    function loop(){
      g.raf=requestAnimationFrame(loop); clock++;
      if(g.running&&!g.ended){
        g.speed=Math.min(g.maxSpeed,g.speed+0.00018);
        var spd=g.speed*(g.boostT>0?1.8:1);
        g.distance+=spd;
        if(g.shieldT>0)g.shieldT--; if(g.boostT>0)g.boostT--; if(g.invuln>0)g.invuln--;

        dashes.forEach(function(m){m.position.z+=spd; if(m.position.z>8)m.position.z-=24*5;});
        buildings.forEach(function(bld){ bld.position.z+=spd;
          if(bld.position.z>16){ bld.position.z-=BUILD_SPAN;
            bld.position.x=bld.userData.side*(7+Math.random()*8); }});
        obstacles.forEach(function(o){ o.position.z+=spd; o.rotation.y=Math.sin(clock*0.02)*0.04;
          if(!o.userData.hit&&o.position.z>2.4&&o.position.z<5.4&&o.userData.lane===g.laneTarget) hitObstacle(o);
          if(o.position.z>13){ o.position.z-=150-Math.random()*20;
            var ln=Math.floor(Math.random()*3); o.position.x=LANE_X[ln]; o.userData.lane=ln;
            o.userData.hit=false; o.visible=true; } });
        gems.forEach(function(m){ m.position.z+=spd; m.rotation.y+=0.06;
          m.position.y=HOVER+0.1+Math.sin(clock*0.08+m.id)*0.12;
          if(!m.userData.got&&m.position.z>2.4&&m.position.z<5.6&&m.userData.lane===g.laneTarget){
            m.userData.got=true;m.visible=false;
            burst(m.position,m.userData.kind==='power'?0xfff2a0:theme.accent);
            if(m.userData.kind==='power'){ g.score+=5;
              if(hasShield)g.shieldT=320; if(hasSpeed)g.boostT=200;
              if(!hasShield&&!hasSpeed)g.score+=5;
            } else g.score+=1;
            updateStats();
          }
          if(m.position.z>13){ m.position.z-=150-Math.random()*20;
            var l2=Math.floor(Math.random()*3); m.position.x=LANE_X[l2]; m.userData.lane=l2;
            m.userData.got=false; m.visible=true; } });

        if(finite&&g.distance>=g.finishDist) endGame(true);
      }

      // player glide + bank + hover bob
      var tx=LANE_X[g.laneTarget];
      var dx=tx-player.position.x;
      player.position.x+=dx*0.16;
      player.rotation.z+=(dx*-0.4 - player.rotation.z)*0.18;
      player.rotation.y=dx*0.12;
      player.position.y=HOVER+Math.sin(clock*0.09)*0.07;
      player.visible=!(g.invuln>0&&Math.floor(clock/4)%2===0);
      glow.material.opacity = g.shieldT>0 ? 0.55+Math.sin(clock*0.3)*0.2 : 0.3;

      // LIVING CAMERA — follows, banks, breathes
      camera.position.x += (player.position.x*0.55 - camera.position.x)*0.08;
      camera.position.y += ((5.3+Math.sin(clock*0.05)*0.12) - camera.position.y)*0.1;
      if(g.shake>0){ g.shake--; camera.position.x += (Math.random()-0.5)*g.shake*0.05; }
      camera.position.z=9;
      camera.rotation.z += (player.position.x*-0.018 - camera.rotation.z)*0.1;
      var wantFov = g.boostT>0 ? 72 : 62;
      camFov += (wantFov-camFov)*0.08; camera.fov=camFov; camera.updateProjectionMatrix();
      camera.lookAt(player.position.x*0.45,1.4,-12);

      // particles
      for(var b=bits.length-1;b>=0;b--){ var p=bits[b];
        p.position.add(p.userData.v); p.userData.v.y-=0.02; p.userData.life--;
        p.material.transparent=true; p.material.opacity=Math.max(0,p.userData.life/30);
        if(p.userData.life<=0){scene.remove(p);bits.splice(b,1);} }

      renderer.render(scene,camera);
    }

    state={renderer:renderer,scene:scene,mount:mount,onKey:onKey,onResize:onResize,g:g};
    updateStats();
    bigMessage(bp.title||'Your game', finite?'Reach the finish · dodge the traffic':'Survive · grab the gems','Start',function(){clearMessage();g.running=true;});
    loop();
  }

  /* ============================================================ STOP */
  function stop(){
    if(!state)return;
    cancelAnimationFrame(state.g.raf);
    window.removeEventListener('keydown',state.onKey);
    window.removeEventListener('resize',state.onResize);
    try{
      state.scene.traverse(function(o){
        if(o.geometry)o.geometry.dispose();
        if(o.material){ Array.isArray(o.material)?o.material.forEach(function(m){m.dispose();}):o.material.dispose(); }
      });
      state.renderer.dispose();
    }catch(e){}
    if(state.mount)state.mount.innerHTML='';
    state=null;
  }

  window.GameGenieEngine={run:run,stop:stop};
})();
