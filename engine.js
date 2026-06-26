/* ============================================================
   GameGenie — the ENGINE  (Phase 3)
   ------------------------------------------------------------
   The kitchen. It reads a BLUEPRINT (the order ticket the Genie
   writes) and cooks a real, playable, low-poly game on screen.

   No images — every shape is built from code. Themed by the
   blueprint: the player's colour, the world's mood, the
   challenge and the power-ups all come from what was decided
   in the chat.

   This first engine is a 3-lane dodge-and-collect runner — the
   shared skeleton of runners, racers and dodge games. More game
   types become new engines/blocks in Phase 5.

   Needs Three.js loaded first (global THREE).
   Exposes:  window.GameGenieEngine.run(blueprint, mountEl)
             window.GameGenieEngine.stop()
   ============================================================ */
(function () {
  'use strict';

  var THREE = window.THREE;
  var state = null; // holds the running game so we can stop/clean up

  /* ---------- helpers: turn words into colours & themes ------- */

  var NAMED_COLORS = {
    red:0xe8484f, crimson:0xe8484f, scarlet:0xe8484f,
    orange:0xf2913d, amber:0xf2913d,
    yellow:0xf2d24b, gold:0xf2c84b,
    green:0x4fcf72, lime:0x8fe04b, emerald:0x3fc98a,
    teal:0x3fc9c2, cyan:0x49d6e8, aqua:0x49d6e8,
    blue:0x4f8df2, azure:0x4f8df2, navy:0x3a5fd9,
    purple:0x9a5fe0, violet:0x9a5fe0, magenta:0xe05fc4,
    pink:0xf07ab0, rose:0xf07ab0,
    white:0xf2f2f5, silver:0xcfd3dc, grey:0x9aa0ad, gray:0x9aa0ad,
    black:0x2a2c33, dark:0x33363f, brown:0x9a6b43
  };

  function colorFromText(text, fallback) {
    if (!text) return fallback;
    var t = (' ' + text + ' ').toLowerCase();
    for (var name in NAMED_COLORS) {
      if (t.indexOf(name) !== -1) return NAMED_COLORS[name];
    }
    return fallback;
  }

  // pick a world theme (ground / fog / accent / light) from words
  function themeFromText(text) {
    var t = (text || '').toLowerCase();
    var has = function (w) { return t.indexOf(w) !== -1; };

    if (has('neon') || has('cyber') || has('futur') || has('sci') || has('city') || has('tron'))
      return { ground:0x12131a, grid:0x2bd6e0, fog:0x0a0b12, sky:0x0a0b12, accent:0x49d6e8, amb:0.5 };
    if (has('night') || has('dark') || has('spooky') || has('horror') || has('haunt'))
      return { ground:0x14161f, grid:0x3a3f55, fog:0x0c0d14, sky:0x0c0d14, accent:0x8a7bff, amb:0.4 };
    if (has('space') || has('galaxy') || has('star') || has('cosmic') || has('moon'))
      return { ground:0x0d0d16, grid:0x4a4f8a, fog:0x06060d, sky:0x06060d, accent:0xb8a9ff, amb:0.45 };
    if (has('lava') || has('fire') || has('volcano') || has('inferno'))
      return { ground:0x1e1210, grid:0xe86a3a, fog:0x140a08, sky:0x1a0c08, accent:0xf2913d, amb:0.5 };
    if (has('ice') || has('snow') || has('winter') || has('frozen') || has('arctic'))
      return { ground:0xd6e2ee, grid:0x8fb3d6, fog:0xc4d4e6, sky:0xdfeaf4, accent:0x49b6e8, amb:0.85 };
    if (has('forest') || has('jungle') || has('nature') || has('grass') || has('woods'))
      return { ground:0x1f3a24, grid:0x4fcf72, fog:0x152a1a, sky:0x16331f, accent:0x8fe04b, amb:0.6 };
    if (has('desert') || has('sand') || has('dune'))
      return { ground:0x3a2f1e, grid:0xe0c06a, fog:0x2a2114, sky:0x33291a, accent:0xf2d24b, amb:0.7 };
    if (has('sunny') || has('day') || has('bright') || has('beach') || has('park'))
      return { ground:0x2a3340, grid:0x6fa8e0, fog:0x1d2733, sky:0x223044, accent:0xf2c84b, amb:0.8 };
    // default: cool neutral
    return { ground:0x16171d, grid:0x3a4150, fog:0x0e0e12, sky:0x0e0e12, accent:0x9aa6c4, amb:0.55 };
  }

  // does the blueprint imply a finish line (win), or endless score?
  function isFinite_(bp) {
    var t = ((bp.goal || '') + ' ' + (bp.kind || '') + ' ' + (bp.title || '')).toLowerCase();
    return /finish|race|reach|win|lap|end|escape|complete|cross/.test(t);
  }

  /* ---------- tiny DOM helpers for the HUD --------------------- */
  function el(tag, css, html) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* ============================================================
     RUN — build the scene and start the loop
     ============================================================ */
  function run(blueprint, mount) {
    stop(); // clear any previous game

    var bp = blueprint || {};
    var ch = bp.character || {};
    var wd = bp.world || {};
    var themeText = (wd.setting || '') + ' ' + (wd.mood || '') + ' ' + (bp.title || '') + ' ' + (bp.kind || '');
    var theme = themeFromText(themeText);
    var playerColor = colorFromText(ch.color || ch.look, theme.accent);
    var finite = isFinite_(bp);
    var hasShield = /shield|invinci|protect|armor|armour/i.test((bp.extras || []).join(' '));
    var hasSpeed  = /speed|boost|fast|rocket|turbo|nitro/i.test((bp.extras || []).join(' '));

    // ---- renderer / scene / camera ----
    var W = mount.clientWidth || 600, H = mount.clientHeight || 400;
    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(theme.sky, 1);
    mount.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    scene.fog = new THREE.Fog(theme.fog, 22, 70);

    var camera = new THREE.PerspectiveCamera(62, W / H, 0.1, 200);
    camera.position.set(0, 5.2, 9);
    camera.lookAt(0, 1, -8);

    // ---- lights ----
    scene.add(new THREE.HemisphereLight(0xffffff, theme.ground, theme.amb));
    var dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(4, 10, 6);
    scene.add(dir);

    // ---- ground ----
    var LANE_X = [-2.6, 0, 2.6];
    var groundMat = new THREE.MeshStandardMaterial({ color: theme.ground, roughness: 1, metalness: 0 });
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(14, 240), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -100;
    scene.add(ground);

    // lane divider lines (give a sense of speed)
    var laneLineMat = new THREE.MeshStandardMaterial({ color: theme.grid, roughness: 1, emissive: theme.grid, emissiveIntensity: 0.25 });
    var stripes = [];
    for (var s = 0; s < 26; s++) {
      var stripe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 2.4), laneLineMat);
      stripe.position.set(LANE_X[1] - 1.3, 0.02, -s * 5);
      scene.add(stripe);
      stripes.push(stripe);
      var stripe2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 2.4), laneLineMat);
      stripe2.position.set(LANE_X[1] + 1.3, 0.02, -s * 5);
      scene.add(stripe2);
      stripes.push(stripe2);
    }

    // side rails for depth
    var railMat = new THREE.MeshStandardMaterial({ color: theme.grid, roughness: 1, emissive: theme.grid, emissiveIntensity: 0.15 });
    [-4.4, 4.4].forEach(function (x) {
      var rail = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 240), railMat);
      rail.position.set(x, 0.25, -100);
      scene.add(rail);
    });

    // ---- the player (a low-poly craft / car / character) ----
    var player = new THREE.Group();
    var bodyMat = new THREE.MeshStandardMaterial({ color: playerColor, roughness: 0.45, metalness: 0.1, flatShading: true });
    var bodyDark = new THREE.MeshStandardMaterial({ color: 0x1c1d22, roughness: 0.6, flatShading: true });
    var body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 1.7), bodyMat);
    body.position.y = 0.45; player.add(body);
    var cabin = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.8), bodyDark);
    cabin.position.set(0, 0.85, 0.1); player.add(cabin);
    var nose = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.8, 4), bodyMat);
    nose.rotation.x = -Math.PI / 2; nose.position.set(0, 0.45, -1.1); player.add(nose);
    // little fins for life
    [-0.65, 0.65].forEach(function (fx) {
      var fin = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.06, 0.6), bodyMat);
      fin.position.set(fx, 0.55, 0.7); player.add(fin);
    });
    player.position.set(LANE_X[1], 0, 4);
    scene.add(player);

    // a soft glow ring under the player
    var glow = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.1, 20),
      new THREE.MeshBasicMaterial({ color: playerColor, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.03; player.add(glow);

    // ---- object pools ----
    var obstacleMat = new THREE.MeshStandardMaterial({ color: 0xe8484f, roughness: 0.5, emissive: 0x611, emissiveIntensity: 0.3, flatShading: true });
    var gemMat = new THREE.MeshStandardMaterial({ color: theme.accent, roughness: 0.3, metalness: 0.2, emissive: theme.accent, emissiveIntensity: 0.5, flatShading: true });
    var obstacles = [];
    var gems = [];

    function spawnObstacle(z) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), obstacleMat);
      var lane = Math.floor(Math.random() * 3);
      m.position.set(LANE_X[lane], 0.7, z);
      m.userData = { lane: lane, hit: false, spin: (Math.random() - 0.5) * 0.04 };
      scene.add(m); obstacles.push(m);
    }
    function spawnGem(z) {
      var m = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), gemMat);
      var lane = Math.floor(Math.random() * 3);
      m.position.set(LANE_X[lane], 1.0, z);
      m.userData = { lane: lane, got: false, kind: (hasShield || hasSpeed) && Math.random() < 0.35 ? 'power' : 'coin' };
      if (m.userData.kind === 'power') { m.scale.set(1.5, 1.5, 1.5); }
      scene.add(m); gems.push(m);
    }

    // pre-fill the track
    var z0 = -20;
    for (var i = 0; i < 16; i++) {
      if (Math.random() < 0.7) spawnObstacle(z0 - i * 9 - Math.random() * 4);
      if (Math.random() < 0.6) spawnGem(z0 - i * 9 - 4 - Math.random() * 4);
    }

    /* ---------- HUD overlay ---------- */
    var hud = el('div', 'position:absolute;inset:0;pointer-events:none;font-family:Inter,system-ui,sans-serif;');
    var stats = el('div', 'position:absolute;top:14px;left:16px;color:#fff;font-size:14px;font-weight:600;text-shadow:0 1px 4px rgba(0,0,0,.6);line-height:1.5;');
    var hint = el('div', 'position:absolute;bottom:14px;left:0;right:0;text-align:center;color:#cfd3dc;font-size:12px;text-shadow:0 1px 4px rgba(0,0,0,.6);', '← → or A / D to switch lanes · tap left / right on mobile');
    var center = el('div', 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;');
    hud.appendChild(stats); hud.appendChild(hint); hud.appendChild(center);
    mount.appendChild(hud);

    function bigMessage(title, sub, btnLabel, onBtn) {
      center.innerHTML = '';
      var t = el('div', 'color:#fff;font-family:\'Space Grotesk\',sans-serif;font-weight:700;font-size:30px;text-shadow:0 2px 8px rgba(0,0,0,.7);', title);
      center.appendChild(t);
      if (sub) center.appendChild(el('div', 'color:#cfd3dc;font-size:14px;text-shadow:0 1px 4px rgba(0,0,0,.6);', sub));
      if (btnLabel) {
        var b = el('button', 'pointer-events:auto;cursor:pointer;border:none;border-radius:12px;padding:12px 22px;font-family:\'Space Grotesk\',sans-serif;font-weight:600;font-size:15px;color:#15151a;background:radial-gradient(circle at 38% 32%,#fff,#e8ecf4 45%,#767e98);box-shadow:0 0 16px 2px rgba(174,185,214,.5);', btnLabel);
        b.onclick = onBtn; center.appendChild(b);
      }
      center.style.background = 'rgba(8,8,12,.45)';
    }
    function clearMessage() { center.innerHTML = ''; center.style.background = 'none'; }

    /* ---------- game state ---------- */
    var g = {
      laneTarget: 1, lives: 3, score: 0, distance: 0,
      speed: 0.42, baseSpeed: 0.42, maxSpeed: 1.05,
      finishDist: finite ? 1100 : 0, // 0 = endless
      shieldT: 0, boostT: 0, invuln: 0,
      running: false, ended: false, shake: 0, raf: 0
    };

    function updateStats() {
      var lifeStr = '';
      for (var k = 0; k < g.lives; k++) lifeStr += '♥';
      var line = '◆ ' + g.score + '   ' + lifeStr;
      if (finite) line += '   ' + Math.min(100, Math.floor(g.distance / g.finishDist * 100)) + '%';
      else line += '   ' + Math.floor(g.distance) + 'm';
      if (g.shieldT > 0) line += '   ⛨ shield';
      if (g.boostT > 0) line += '   » boost';
      stats.textContent = line;
    }

    /* ---------- input ---------- */
    function move(dir) {
      if (!g.running) return;
      g.laneTarget = Math.max(0, Math.min(2, g.laneTarget + dir));
    }
    function onKey(e) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { move(-1); }
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { move(1); }
    }
    function onTap(e) {
      var rect = renderer.domElement.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      move(x < rect.width / 2 ? -1 : 1);
    }
    window.addEventListener('keydown', onKey);
    renderer.domElement.addEventListener('mousedown', onTap);
    renderer.domElement.addEventListener('touchstart', function (e) { e.preventDefault(); onTap(e); }, { passive: false });

    /* ---------- resize ---------- */
    function onResize() {
      var w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', onResize);

    /* ---------- collisions ---------- */
    function playerLane() { return g.laneTarget; }

    function hitObstacle(o) {
      if (g.shieldT > 0 || g.boostT > 0 || g.invuln > 0) {
        // smash through while protected
        o.userData.hit = true; o.visible = false;
        burst(o.position, 0xffffff);
        return;
      }
      o.userData.hit = true; o.visible = false;
      g.lives--; g.invuln = 70; g.shake = 12;
      burst(o.position, 0xe8484f);
      updateStats();
      if (g.lives <= 0) endGame(false);
    }

    /* ---------- particle burst (juice) ---------- */
    var bits = [];
    function burst(pos, color) {
      for (var b = 0; b < 10; b++) {
        var p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12),
          new THREE.MeshBasicMaterial({ color: color }));
        p.position.copy(pos);
        p.userData = { v: new THREE.Vector3((Math.random() - 0.5) * 0.4, Math.random() * 0.4, (Math.random() - 0.5) * 0.4), life: 30 };
        scene.add(p); bits.push(p);
      }
    }

    /* ---------- end / win ---------- */
    function endGame(won) {
      if (g.ended) return;
      g.ended = true; g.running = false;
      if (won) bigMessage('You win! ✦', 'Score ' + g.score, 'Play again', restart);
      else bigMessage('Game over', 'Score ' + g.score, 'Try again', restart);
    }
    function restart() {
      window.GameGenieEngine.run(blueprint, mount);
    }

    /* ---------- main loop ---------- */
    var clock = 0;
    function loop() {
      g.raf = requestAnimationFrame(loop);
      clock++;

      if (g.running && !g.ended) {
        // speed ramps up
        g.speed = Math.min(g.maxSpeed, g.speed + 0.00018);
        var spd = g.speed * (g.boostT > 0 ? 1.8 : 1);
        g.distance += spd;

        // timers
        if (g.shieldT > 0) g.shieldT--;
        if (g.boostT > 0) g.boostT--;
        if (g.invuln > 0) g.invuln--;

        // move stripes toward camera (speed feel)
        stripes.forEach(function (st) {
          st.position.z += spd;
          if (st.position.z > 8) st.position.z -= 26 * 5;
        });

        // obstacles
        obstacles.forEach(function (o) {
          o.position.z += spd;
          o.rotation.y += o.userData.spin;
          if (!o.userData.hit && o.position.z > 2.6 && o.position.z < 5.2 && o.userData.lane === playerLane()) {
            hitObstacle(o);
          }
          if (o.position.z > 12) {
            // recycle far ahead
            o.position.z -= 150 - Math.random() * 20;
            o.position.x = LANE_X[Math.floor(Math.random() * 3)];
            o.userData.lane = LANE_X.indexOf(o.position.x);
            o.userData.hit = false; o.visible = true;
          }
        });

        // gems
        gems.forEach(function (m) {
          m.position.z += spd;
          m.rotation.y += 0.06;
          m.position.y = 1.0 + Math.sin(clock * 0.08 + m.id) * 0.12;
          if (!m.userData.got && m.position.z > 2.6 && m.position.z < 5.4 && m.userData.lane === playerLane()) {
            m.userData.got = true; m.visible = false;
            burst(m.position, m.userData.kind === 'power' ? 0xfff2a0 : theme.accent);
            if (m.userData.kind === 'power') {
              g.score += 5;
              if (hasShield) g.shieldT = 320;
              if (hasSpeed) g.boostT = 200;
              if (!hasShield && !hasSpeed) g.score += 5;
            } else { g.score += 1; }
            updateStats();
          }
          if (m.position.z > 12) {
            m.position.z -= 150 - Math.random() * 20;
            m.position.x = LANE_X[Math.floor(Math.random() * 3)];
            m.userData.lane = LANE_X.indexOf(m.position.x);
            m.userData.got = false; m.visible = true;
          }
        });

        // win check
        if (finite && g.distance >= g.finishDist) endGame(true);
      }

      // player glide to target lane + lean + bob
      var tx = LANE_X[g.laneTarget];
      player.position.x += (tx - player.position.x) * 0.18;
      player.rotation.z += ((tx - player.position.x) * -0.25 - player.rotation.z) * 0.2;
      player.position.y = Math.sin(clock * 0.1) * 0.04;
      // blink while invulnerable
      player.visible = !(g.invuln > 0 && Math.floor(clock / 4) % 2 === 0);
      if (g.shieldT > 0) { glow.material.opacity = 0.5 + Math.sin(clock * 0.3) * 0.2; }
      else { glow.material.opacity = 0.25; }

      // particles
      for (var b = bits.length - 1; b >= 0; b--) {
        var p = bits[b];
        p.position.add(p.userData.v);
        p.userData.v.y -= 0.02;
        p.userData.life--;
        p.material.opacity = Math.max(0, p.userData.life / 30);
        p.material.transparent = true;
        if (p.userData.life <= 0) { scene.remove(p); bits.splice(b, 1); }
      }

      // camera shake
      if (g.shake > 0) { g.shake--; camera.position.x = (Math.random() - 0.5) * g.shake * 0.04; }
      else { camera.position.x += (0 - camera.position.x) * 0.2; }

      renderer.render(scene, camera);
    }

    // store for cleanup
    state = {
      renderer: renderer, scene: scene, mount: mount,
      onKey: onKey, onResize: onResize, g: g
    };

    // countdown then go
    updateStats();
    bigMessage(bp.title || 'Your game', finite ? 'Reach the finish · dodge what comes' : 'Survive · grab everything', 'Start', function () {
      clearMessage();
      g.running = true;
    });
    loop();
  }

  /* ============================================================
     STOP — tear the game down cleanly
     ============================================================ */
  function stop() {
    if (!state) return;
    cancelAnimationFrame(state.g.raf);
    window.removeEventListener('keydown', state.onKey);
    window.removeEventListener('resize', state.onResize);
    try {
      state.scene.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach(function (m) { m.dispose(); });
          else o.material.dispose();
        }
      });
      state.renderer.dispose();
    } catch (e) {}
    if (state.mount) state.mount.innerHTML = '';
    state = null;
  }

  window.GameGenieEngine = { run: run, stop: stop };
})();
