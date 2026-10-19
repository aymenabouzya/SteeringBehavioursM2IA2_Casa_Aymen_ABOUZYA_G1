import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

class Vector {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  set(x, y) { this.x = x; this.y = y; return this; }
  copy() { return new Vector(this.x, this.y); }
  add(vector) { this.x += vector.x; this.y += vector.y; return this; }
  sub(vector) { this.x -= vector.x; this.y -= vector.y; return this; }
  mult(scalar) { this.x *= scalar; this.y *= scalar; return this; }
  div(scalar) { this.x /= scalar; this.y /= scalar; return this; }
  magSq() { return this.x * this.x + this.y * this.y; }
  mag() { return Math.sqrt(this.magSq()); }
  normalize() { return this.setMag(1); }
  setMag(value) {
    const magnitude = this.mag();
    if (magnitude > 0) this.mult(value / magnitude);
    return this;
  }
  limit(maximum) {
    if (this.mag() > maximum) this.setMag(maximum);
    return this;
  }
  heading() { return Math.atan2(this.y, this.x); }
  static random2D() { return new Vector(1, 0); }
  static add(first, second) { return first.copy().add(second); }
  static sub(first, second) { return first.copy().sub(second); }
  static mult(vector, scalar) { return vector.copy().mult(scalar); }
  static dist(first, second) { return Math.hypot(first.x - second.x, first.y - second.y); }
}

function loadGame() {
  const context = vm.createContext({
    width: 800,
    height: 600,
    deltaTime: 1000 / 60,
    createVector: (x, y) => new Vector(x, y),
    p5: { Vector },
    random: (minimum = 1, maximum) => maximum === undefined ? minimum / 2 : (minimum + maximum) / 2,
    map: (value, start, stop, from, to) => from + (to - from) * ((value - start) / (stop - start)),
    cos: Math.cos,
    sin: Math.sin,
    TWO_PI: Math.PI * 2,
    GAME_CONFIG: {
      maxSeeAhead: 105,
      playerFleeRadius: 245,
      playerFleeWeight: 3.2,
      speedMultiplier: 1,
      crystalProtectionRadius: 180,
      flightMode: 'mission',
    },
  });
  for (const file of ['vehicle.js', 'obstacle.js', 'asteroid.js', 'blackHole.js', 'target.js', 'flocking.js', 'pathFollowing.js', 'ship.js', 'hunter.js', 'boss.js', 'missile.js', 'gameRules.js']) {
    vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context, { filename: file });
  }
  return vm.runInContext('({ Vehicle, Obstacle, Asteroid, BlackHole, Crystal, Ship, Hunter, Boss, Missile, GameRules, Flocking, PathFollowing, GAME_CONFIG })', context);
}

test('la page relie les modules du jeu dans leur ordre de dépendance', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const linkedScripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(match => match[1]);
  const gameScripts = linkedScripts.filter(path => !path.startsWith('libraries/'));

  assert.match(html, /<link rel="stylesheet" href="style\.css">/);
  assert.match(html, /id="difficulty-options"/);
  assert.match(html, /data-difficulty="cadet"/);
  assert.match(html, /data-difficulty="pilote"/);
  assert.match(html, /data-difficulty="as"/);
  assert.match(html, /id="pause-overlay"/);
  assert.match(html, /id="resume-button"/);
  assert.match(html, /id="stage-complete-overlay"/);
  assert.match(html, /id="first-stage-objective"/);
  assert.match(html, /id="next-stage-button"/);
  assert.match(html, /id="restart-first-level-button"/);
  assert.match(html, /id="objective-progress"/);
  assert.match(html, /id="stage-readout"/);
  assert.match(html, /id="stage-progress"/);
  assert.match(html, /class="mission-track stage-track"/);
  assert.match(html, /class="mission-track final-mission-track"/);
  assert.match(html, /id="briefing-button"/);
  assert.match(html, /id="panels-toggle"/);
  assert.match(html, /id="black-hole-state"/);
  assert.match(html, /ENTRER DANS UN TROU NOIR : SORTIR PAR L'AUTRE/);
  assert.match(html, /aria-label="Concept et règles de la mission"/);
  assert.match(html, /OBJECTIF DE MISSION/);
  assert.match(html, /PILOTAGE ET STEERING/);
  assert.match(html, /CRISTAUX ET COMBAT/);
  assert.match(html, /DANGERS ET PORTAILS/);
  assert.match(html, /VITESSE ET DIFFICULTÉ/);
  assert.match(html, /20 niveaux de collecte, de survie et de combat/);
  assert.match(html, /id="stage-roadmap"/);
  assert.equal((html.match(/<li><strong>/g) || []).length, 20);
  assert.match(html, /PAUSE \[ESPACE\]/);
  assert.match(html, /<kbd>G<\/kbd> anti-gravité/);
  assert.match(html, /<kbd>ESPACE<\/kbd> pause/);
  assert.match(html, /aria-controls="system-diagnostics flight-control"/);
  assert.deepEqual(gameScripts, [
    'vehicle.js',
    'obstacle.js',
    'asteroid.js',
    'blackHole.js',
    'target.js',
    'flocking.js',
    'pathFollowing.js',
    'ship.js',
    'hunter.js',
    'boss.js',
    'missile.js',
    'gameRules.js',
    'hud.js',
    'sketch.js',
  ]);
});

test('chaque étape attend une action du joueur avant de démarrer la suivante', () => {
  const sketch = readFileSync(new URL('../sketch.js', import.meta.url), 'utf8');
  const hud = readFileSync(new URL('../hud.js', import.meta.url), 'utf8');
  const stageAdvance = sketch.match(/function startNextStage\(\) \{[\s\S]*?\n\}/)?.[0] || '';
  const gameState = sketch.match(/function updateGameState\(\) \{[\s\S]*?\n\}/)?.[0] || '';

  assert.match(sketch, /&& !awaitingNextStage\)\s*\{/);
  assert.match(gameState, /if \(currentObjective\.completed\)[\s\S]*awaitingNextStage = true/);
  assert.doesNotMatch(gameState, /stage\+\+/);
  assert.match(stageAdvance, /if \(!awaitingNextStage \|\| gameOver/);
  assert.match(stageAdvance, /awaitingNextStage = false;[\s\S]*stage\+\+;[\s\S]*stageProgress = 0;/);
  assert.match(stageAdvance, /if \(nextObjective\.type === "boss"\)[\s\S]*new Boss/);
  assert.match(stageAdvance, /GAME_CONFIG\.bossHealth \+ nextObjective\.bossHealthBonus/);
  assert.match(sketch, /nextStageButton\.addEventListener\("click", startNextStage\)/);
  assert.match(hud, /stageCompleteOverlay\.hidden = !state\.awaitingNextStage/);
  assert.match(hud, /first-stage-objective", GameRules\.getStageInstruction\(1\)/);
  assert.match(hud, /getStageInstruction\(state\.stageState\.number \+ 1, nextBossHealth\)/);
});

test('après une défaite, le joueur peut recommencer le niveau perdu ou repartir au niveau 1', () => {
  const sketch = readFileSync(new URL('../sketch.js', import.meta.url), 'utf8');
  const hud = readFileSync(new URL('../hud.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const startNewGame = sketch.match(/function startNewGame\(startingStage = 1\) \{[\s\S]*?\n\}/)?.[0] || '';
  const restartCurrentStage = sketch.match(/function restartCurrentStage\(\) \{[\s\S]*?\n\}/)?.[0] || '';
  const keyHandler = sketch.match(/function keyPressed\(\) \{[\s\S]*?\n\}/)?.[0] || '';

  assert.match(startNewGame, /resetGame\(startingStage\)/);
  assert.match(startNewGame, /spawnStageBoss\(\)/);
  assert.match(restartCurrentStage, /if \(!gameOver\) return false;[\s\S]*startNewGame\(stage\)/);
  assert.match(sketch, /restartButton\.addEventListener\("click", restartCurrentStage\)/);
  assert.match(sketch, /restartFirstLevelButton\.addEventListener\("click", \(\) => startNewGame\(1\)\)/);
  assert.match(sketch, /startButton\.addEventListener\("click", \(\) => startNewGame\(\)\)/);
  assert.doesNotMatch(sketch, /startButton\.addEventListener\("click", startNewGame\)/);
  assert.match(keyHandler, /if \(gameOver\) restartCurrentStage\(\);[\s\S]*else startNewGame\(\)/);
  assert.match(html, /RECOMMENCER CE NIVEAU/);
  assert.match(html, /RECOMMENCER AU NIVEAU 1/);
  assert.match(hud, /RECOMMENCER LE NIVEAU.*state\.stageState\.number/);
});

test('Espace met la partie en pause et G bascule l’anti-gravité', () => {
  const sketch = readFileSync(new URL('../sketch.js', import.meta.url), 'utf8');
  const hud = readFileSync(new URL('../hud.js', import.meta.url), 'utf8');
  const keyHandler = sketch.match(/function keyPressed\(\) \{[\s\S]*?\n\}/)?.[0] || '';

  assert.match(keyHandler, /key === " " && gameStarted && !gameOver[\s\S]*togglePause\(\)/);
  assert.match(keyHandler, /key === "g" \|\| key === "G"[\s\S]*antiGravity = !antiGravity/);
  assert.doesNotMatch(keyHandler, /key === " " && !gameOver[\s\S]*antiGravity = !antiGravity/);
  assert.match(hud, /PAUSE \[ESPACE\]/);
  assert.match(hud, /REPRENDRE \[ESPACE\]/);
});

test('les panneaux diagnostic et contrôle sont masqués pendant la partie', () => {
  const hud = readFileSync(new URL('../hud.js', import.meta.url), 'utf8');
  const sketch = readFileSync(new URL('../sketch.js', import.meta.url), 'utf8');
  const style = readFileSync(new URL('../style.css', import.meta.url), 'utf8');

  assert.match(hud, /classList\.toggle\("is-playing", isPlaying\)/);
  assert.match(hud, /classList\.toggle\("is-paused", state\.gamePaused\)/);
  assert.match(hud, /panelsToggle\.hidden = !isPlaying/);
  assert.match(hud, /panelsToggle\.textContent = state\.panelsVisible \? "MASQUER LES PANNEAUX" : "AFFICHER LES PANNEAUX"/);
  assert.match(sketch, /function toggleGamePanels\(\)[\s\S]*panelsVisible = !panelsVisible/);
  assert.match(style, /\.game-ui\.is-playing:not\(\.panels-visible\) \.diagnostics,\s*\.game-ui\.is-playing:not\(\.panels-visible\) \.control-panel\s*\{[^}]*visibility:\s*hidden/s);
  assert.match(style, /\.game-ui\.is-playing\.is-paused \.panels-toggle\s*\{[^}]*z-index:\s*6/s);
  assert.match(style, /\.game-ui\.is-playing\.is-paused \.pause-overlay\s*\{[^}]*z-index:\s*1;[^}]*background:\s*transparent;[^}]*pointer-events:\s*none/s);
  assert.match(style, /\.game-ui\.is-playing\.is-paused \.pause-overlay > \*\s*\{[^}]*pointer-events:\s*auto/s);
});

test('le jeu démarre en mode manuel et conserve le mode choisi aux redémarrages', () => {
  const sketch = readFileSync(new URL('../sketch.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const initialManualMode = sketch.match(/let manualControl = (true|false);/)?.[1];
  const resetGame = sketch.match(/function resetGame\(\) \{[\s\S]*?\n\}/)?.[0] || '';

  assert.equal(initialManualMode, 'true');
  assert.doesNotMatch(resetGame, /manualControl\s*=/);
  assert.match(html, /Mode initial : manuel/);
  assert.match(sketch, /manualControlButton\.addEventListener\("click", toggleManualControl\)/);
});

test('la vitesse démarre à 1.4x et le curseur permet de l’augmenter jusqu’à 2x', () => {
  const sketch = readFileSync(new URL('../sketch.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const style = readFileSync(new URL('../style.css', import.meta.url), 'utf8');

  assert.match(sketch, /speedMultiplier:\s*1\.4,/);
  assert.match(sketch, /speedSlider\.value = String\(GAME_CONFIG\.speedMultiplier\)/);
  assert.match(sketch, /function resetGame\(\)[\s\S]*?applyFleetSpeed\(\);/);
  assert.doesNotMatch(sketch.match(/function resetGame\(\)[\s\S]*?\n\}/)?.[0] || '', /speedMultiplier\s*=/);
  assert.match(html, /id="speed-control"[^>]*min="0\.5"[^>]*max="2"[^>]*step="0\.1"[^>]*value="1\.4"/);
  assert.match(html, /id="speed-value"[^>]*>1\.4×<\/output>/);
  assert.match(style, /\.panels-toggle\s*\{[^}]*background:\s*linear-gradient\(100deg,\s*#c9fbff,\s*#76d9ff\)/s);
  assert.match(style, /\.panels-toggle\s*\{[^}]*color:\s*#071c34/s);
});

test('les trois difficultés gardent une collision fatale et règlent renforts et objectifs', () => {
  const { GameRules } = loadGame();
  const config = {};
  const cadet = GameRules.applyDifficulty(config, 'cadet');
  assert.equal(config.initialLives, 1);
  assert.equal(config.hunterCount, 7);
  assert.equal(config.waveDurationFrames, 2100);
  assert.equal(config.maxWaveHunters, 18);
  assert.equal(config.winScore, 250);
  assert.equal(config.bossHealth, 3);
  assert.match(cadet.description, /1 collision fatale/);

  const pilot = GameRules.applyDifficulty(config, 'pilote');
  assert.equal(config.initialLives, 1);
  assert.equal(config.hunterCount, 12);
  assert.equal(config.waveDurationFrames, 1500);
  assert.equal(config.winScore, 300);
  assert.equal(config.bossHealth, 5);
  assert.match(pilot.description, /bonus de score 300 pts/);

  const ace = GameRules.applyDifficulty(config, 'as');
  assert.equal(config.initialLives, 1);
  assert.equal(config.hunterCount, 16);
  assert.equal(config.waveDurationFrames, 1200);
  assert.equal(config.waveEnemyIncrease, 3);
  assert.equal(config.maxWaveHunters, 38);
  assert.equal(config.maxWaveSpeedMultiplier, 1.85);
  assert.equal(config.winScore, 400);
  assert.equal(config.bossHealth, 7);
  assert.match(ace.description, /16 chasseurs/);
  assert.throws(() => GameRules.applyDifficulty(config, 'unknown'), RangeError);
  assert.throws(() => GameRules.applyDifficulty(config, '__proto__'), RangeError);
});

test('les 20 niveaux suivent la campagne et couvrent les objectifs avec des boss croissants', () => {
  const { GameRules } = loadGame();
  assert.equal(GameRules.STAGES.length, 20);
  assert.deepEqual(
    JSON.parse(JSON.stringify(GameRules.STAGES.map(({ type }) => type))),
    [
      'crystals', 'survive', 'hunters', 'bonus', 'boss',
      'crystals', 'survive', 'hunters', 'bonus', 'boss',
      'crystals', 'survive', 'hunters', 'bonus', 'boss',
      'crystals', 'survive', 'hunters', 'bonus', 'boss',
    ],
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(GameRules.STAGES.filter(({ type }) => type === 'boss')
      .map(({ bossHealthBonus }) => bossHealthBonus))),
    [0, 2, 4, 6],
  );
  assert.equal(GameRules.getStageInstruction(1), 'Récupère 3 cristaux standards avec ton avion ou tes alliés.');
  assert.equal(GameRules.getStageInstruction(2), 'Survis 20 secondes sans perdre ton avion.');
  assert.equal(GameRules.getStageInstruction(3), 'Détruis 3 chasseurs rouges avec tes missiles.');
  assert.equal(GameRules.getStageInstruction(4), 'Récupère 2 cristaux bonus dorés ou violets avec ton avion ou tes alliés.');
  assert.equal(
    GameRules.getStageInstruction(5, 9),
    'Détruis le boss en lui tirant des missiles et évite tout contact. Le boss possède 9 PV.',
  );
  assert.throws(() => GameRules.getStageInstruction(0), RangeError);
  assert.throws(() => GameRules.getStageInstruction(21), RangeError);
  assert.deepEqual(
    JSON.parse(JSON.stringify(GameRules.STAGES.map(({ name }) => name))),
    [
      'PREMIER CONTACT', "CEINTURE D'ASTÉROÏDES", 'PATROUILLE ENNEMIE',
      "RAVITAILLEMENT D'URGENCE", 'LE GARDIEN DU SECTEUR', 'RENFORTS ROUGES',
      'COURSE CONTRE LA VAGUE', "BRISER L'ENCERCLEMENT", 'RÉSERVE DE MUNITIONS',
      "CROISEUR DE L'AVANT-GARDE", 'NAVIGATION À VUE', 'FUITE GRAVITATIONNELLE',
      'ÉLIMINER LES POURSUITEURS', 'BOUCLIER CRITIQUE', 'LE COMMANDANT APPARAÎT',
      'DERNIER RAVITAILLEMENT', 'LA FLOTTE ENTIÈRE', 'OUVRIR LE PASSAGE',
      'DERNIÈRE CHANCE', 'BATAILLE DE LA TERRE',
    ],
  );
  assert.equal(GameRules.getStageObjective(1, 2).progressLabel, '2 / 3');
  assert.equal(GameRules.getStageObjective(1, 3).completed, true);
  assert.equal(GameRules.getStageObjective(2, 12.5).progressLabel, '12 / 20 s');
  assert.equal(GameRules.getStageObjective(2, 20).completed, true);
  assert.equal(GameRules.getStageObjective(3, 1).ratio, 1 / 3);
  assert.equal(GameRules.getStageObjective(4, 2).completed, true);
  assert.equal(GameRules.getStageObjective(5, 0, 2, 5).progressLabel, 'PV 2 / 5');
  assert.equal(GameRules.getStageObjective(5, 0, 0, 5).completed, true);
  assert.equal(GameRules.getStageObjective(5, 0, 0, 5).ratio, 1);
  assert.equal(GameRules.getStageObjective(6, 4).goal, 5);
  assert.equal(GameRules.getStageObjective(7, 29).completed, false);
  assert.equal(GameRules.getStageObjective(8, 5).completed, true);
  assert.equal(GameRules.getStageObjective(9, 2).goal, 3);
  assert.equal(GameRules.getStageObjective(10, 0, 0, 7).completed, true);
  assert.equal(GameRules.getStageObjective(12, 39).goal, 40);
  assert.equal(GameRules.getStageObjective(15, 0, 6, 9).completed, false);
  assert.equal(GameRules.getStageObjective(16, 7).completed, true);
  assert.equal(GameRules.getStageObjective(18, 8).completed, true);
  assert.equal(GameRules.getStageObjective(19, 4).goal, 5);
  assert.equal(GameRules.getStageObjective(20, 0, 0, 11).completed, true);
  assert.equal(GameRules.getStageObjective(20, 0, 0, 11).total, 20);
  assert.throws(() => GameRules.getStageObjective(0, 0), RangeError);
  assert.throws(() => GameRules.getStageObjective(21, 0), RangeError);
});

test('un astéroïde est un obstacle Vehicle stationnaire à silhouette déterministe', () => {
  const { Vehicle, Obstacle, Asteroid } = loadGame();
  const first = new Asteroid(120, 80, 12, 42);
  const second = new Asteroid(120, 80, 12, 42);

  assert.ok(first instanceof Vehicle);
  assert.ok(first instanceof Obstacle);
  assert.equal(first.maxSpeed, 0);
  assert.equal(first.vertices.length, 10);
  assert.equal(JSON.stringify(first.vertices), JSON.stringify(second.vertices));
});

test('le fond procédural construit une galaxie spirale lumineuse avec ses bras et ses étoiles', () => {
  const source = readFileSync(new URL('../sketch.js', import.meta.url), 'utf8');
  const functionStart = source.indexOf('function createGalaxyTexture(');
  const functionEnd = source.indexOf('\n// Regroupe les segments de traînée', functionStart);
  assert.ok(functionStart >= 0 && functionEnd > functionStart);

  const counts = { gradients: 0, strokes: 0, stars: 0, translations: [] };
  const context = {
    beginPath() {},
    ellipse() {},
    fill() {},
    fillRect() {},
    moveTo() {},
    lineTo() {},
    translate(x, y) { counts.translations.push([x, y]); },
    rotate() {},
    scale() {},
    save() {},
    restore() {},
    stroke() { counts.strokes++; },
    arc() { counts.stars++; },
    createRadialGradient() {
      counts.gradients++;
      return { addColorStop() {} };
    },
  };
  const vmContext = vm.createContext({
    document: {
      createElement: () => ({
        getContext: () => context,
      }),
    },
    TWO_PI: Math.PI * 2,
  });
  vm.runInContext(source.slice(functionStart, functionEnd), vmContext);
  const texture = vm.runInContext('createGalaxyTexture(900, 500)', vmContext);

  assert.equal(texture.width, 900);
  assert.equal(texture.height, 500);
  assert.equal(counts.strokes, 6);
  assert.deepEqual(counts.translations[0], [324, 245]);
  assert.ok(counts.gradients > 90);
  assert.ok(counts.stars > 7000);
});

test('l’évitement anticipe les obstacles et borne la force de steering', () => {
  const { Ship } = loadGame();
  const ship = new Ship(100, 100);
  ship.vel.set(4, 0);
  const nearby = { pos: new Vector(160, 100), r: 20 };
  const distant = { pos: new Vector(500, 400), r: 25 };
  const avoid = ship.avoidObstacles([nearby]);
  const clear = ship.avoidObstacles([distant]);

  assert.ok(avoid.mag() > 0);
  assert.ok(avoid.mag() <= ship.maxForce + 1e-9);
  assert.ok(clear.mag() === 0);
});

test('le pilotage automatique donne priorité à l’évitement sur la poursuite', () => {
  const { Ship } = loadGame();
  const ship = new Ship(100, 100);
  ship.vel.set(4, 0);
  const planet = { pos: new Vector(160, 100), r: 30, type: 'planete' };
  const target = { pos: new Vector(500, 100) };

  const steering = ship.steer(target, [ship], [planet]);

  assert.ok(steering.x < 0);
  assert.ok(steering.mag() <= ship.maxForce + 1e-9);
});

test('le pilotage automatique passe à côté d’une planète au lieu de la toucher', () => {
  const { Ship } = loadGame();
  const ship = new Ship(100, 100);
  ship.vel.set(4, 0);
  const planet = { pos: new Vector(250, 100), r: 30, type: 'planete' };
  const target = { pos: new Vector(450, 100) };
  let minimumClearance = Infinity;

  for (let frame = 0; frame < 180; frame++) {
    ship.steer(target, [ship], [planet]);
    ship.update();
    const clearance = Vector.dist(ship.pos, planet.pos) - planet.r - ship.r;
    minimumClearance = Math.min(minimumClearance, clearance);
  }

  assert.ok(minimumClearance > 0, `le vaisseau a touché la planète (${minimumClearance}px)`);
});

test('la séparation repousse les voisins proches et ignore les voisins lointains', () => {
  const { Ship } = loadGame();
  const ship = new Ship(100, 100);
  const neighbor = new Ship(110, 100);
  const farNeighbor = new Ship(400, 400);
  const closeForce = ship.separation([ship, neighbor]);

  assert.ok(closeForce.x < 0);
  assert.ok(closeForce.mag() <= ship.maxForce + 1e-9);
  assert.equal(ship.separation([ship, farNeighbor]).mag(), 0);
});

test('les avions conservent le passage d’un bord à l’autre du canvas', () => {
  const { Ship } = loadGame();
  const ship = new Ship(820, 300, 'ally');

  ship.update();

  assert.equal(ship.pos.x, -ship.r);
});

test('le flocking aligne la vitesse et attire vers le centre des voisins perçus', () => {
  const { Ship } = loadGame();
  const ship = new Ship(100, 100, 'ally');
  const neighbor = new Ship(130, 100, 'ally');
  neighbor.vel.set(0, 3);
  const alignment = ship.alignment([ship, neighbor]);
  const cohesion = ship.cohesion([ship, neighbor]);

  assert.ok(alignment.x < 0);
  assert.ok(alignment.y > 0);
  assert.ok(cohesion.x > 0);
  assert.ok(alignment.mag() <= ship.maxForce + 1e-9);
  assert.ok(cohesion.mag() <= ship.maxForce + 1e-9);
  assert.equal(ship.alignment([ship, new Ship(500, 500)]).mag(), 0);
});

test('le suivi de chemin projette le point anticipé et garde une force bornée', () => {
  const { Ship, PathFollowing } = loadGame();
  const ship = new Ship(100, 150, 'ally');
  const path = [
    new Vector(0, 200),
    new Vector(300, 200),
    new Vector(300, 300),
    new Vector(0, 300),
  ];
  const force = PathFollowing.steering(ship, path);

  assert.ok(force.y > 0);
  assert.ok(force.mag() > 0);
  assert.ok(force.mag() <= ship.maxForce + 1e-9);
});

test('le mode patrouille applique un steering de chemin même sans cristal', () => {
  const { Ship, PathFollowing } = loadGame();
  const ship = new Ship(100, 150, 'ally');
  const path = [
    new Vector(0, 200),
    new Vector(300, 200),
    new Vector(300, 300),
    new Vector(0, 300),
  ];
  ship.steer(null, [ship], [], false, [], 'patrol', path);

  assert.ok(ship.acc.mag() > 0);
  assert.ok(ship.acc.mag() <= ship.maxForce + 1e-9);
});

test('le vaisseau joueur fuit le chasseur le plus proche dans son rayon de perception', () => {
  const { Ship, Hunter } = loadGame();
  const ship = new Ship(100, 100);
  const nearbyHunter = new Hunter(150, 100);
  const distantHunter = new Hunter(500, 100);
  const flee = ship.fleeThreats([distantHunter, nearbyHunter]);

  assert.ok(flee.x < 0);
  assert.ok(flee.mag() <= ship.maxForce + 1e-9);
  assert.equal(ship.fleeThreats([distantHunter]).mag(), 0);
});

test('le roulis visuel suit l’accélération latérale et revient progressivement à plat', () => {
  const { Ship } = loadGame();
  const ship = new Ship(100, 100, 'ally');
  ship.vel.set(3, 0);
  ship.acc.set(0, 0.12);

  ship.updateMotionVisuals();
  const bankAfterTurn = ship.turnBank;
  const engineAfterThrust = ship.enginePower;
  ship.acc.set(0, 0);
  ship.updateMotionVisuals();

  assert.ok(bankAfterTurn > 0);
  assert.ok(ship.turnBank > 0 && ship.turnBank < bankAfterTurn);
  assert.ok(engineAfterThrust > 0);
  assert.ok(engineAfterThrust <= 1);
});

test('le joueur fuit un chasseur même en se dirigeant vers un cristal', () => {
  const { Ship, Hunter } = loadGame();
  const ship = new Ship(100, 100);
  const hunter = new Hunter(150, 100);
  const crystal = { pos: new Vector(500, 100), alive: true };
  ship.steer(crystal, [ship], [], false, [hunter]);

  assert.ok(ship.acc.x < 0);
  assert.ok(ship.acc.mag() <= ship.maxForce + 1e-9);

  const ally = new Ship(100, 100, 'ally');
  ally.steer(crystal, [ally], [], false, [hunter]);
  assert.ok(ally.acc.x < 0);
  assert.ok(ally.acc.mag() <= ally.maxForce + 1e-9);
});

test('le pilote automatique choisit le cristal vivant le plus proche', () => {
  const { Ship } = loadGame();
  const ship = new Ship(100, 100);
  const nearest = { pos: new Vector(130, 100), alive: true };
  const farther = { pos: new Vector(180, 100), alive: true };
  const collected = { pos: new Vector(105, 100), alive: false };

  assert.equal(ship.chooseCrystalTarget([farther, collected, nearest]), nearest);
  assert.equal(ship.chooseCrystalTarget([collected]), null);
});

test('le pilotage manuel dirige le vaisseau vers la souris avec une force de steering bornée', () => {
  const { Ship } = loadGame();
  const ship = new Ship(100, 100);

  const force = ship.steerToPointer(new Vector(300, 100));

  assert.equal(ship.maxForce, 0.45);
  assert.ok(force.x > 0);
  assert.ok(Math.abs(force.y) < 1e-9);
  assert.ok(Math.abs(force.mag() - ship.maxForce) < 1e-9);
  assert.ok(force.mag() <= ship.maxForce + 1e-9);
  assert.ok(ship.acc.mag() <= ship.maxForce + 1e-9);
  assert.deepEqual([ship.pos.x, ship.pos.y], [100, 100]);
});

test('le vaisseau accélère quand le pointeur se déplace vite et ralentit quand il s’arrête', () => {
  const { Ship } = loadGame();
  const ship = new Ship(100, 100);

  ship.steerToPointer(new Vector(100, 100));
  const initialMaxSpeed = ship.maxSpeed;
  ship.steerToPointer(new Vector(140, 100));
  const fastPointerMaxSpeed = ship.maxSpeed;

  assert.ok(fastPointerMaxSpeed > initialMaxSpeed);
  assert.ok(fastPointerMaxSpeed <= ship.baseMaxSpeed * ship.speedMultiplier * 2.2);
  for (let frame = 0; frame < 30; frame++) {
    ship.steerToPointer(new Vector(140, 100));
  }
  assert.ok(ship.pointerSpeedMultiplier < 1.05);
  assert.ok(Math.abs(ship.maxSpeed - initialMaxSpeed) < 1e-9);
  assert.ok(ship.acc.mag() <= ship.maxForce + 1e-9);
});

test('le pilotage manuel ralentit lorsque le pointeur est proche et freine à la cible', () => {
  const { Ship } = loadGame();
  const ship = new Ship(100, 100);

  const closeForce = ship.steerToPointer(new Vector(101, 100));
  assert.ok(closeForce.mag() < ship.maxForce);

  ship.vel.set(2, 0);
  const force = ship.steerToPointer(new Vector(100, 100));
  assert.ok(force.x < 0);
  assert.ok(force.mag() <= ship.maxForce + 1e-9);
});

test('le pilotage manuel reste immobile lorsque le pointeur est sur le vaisseau arrêté', () => {
  const { Ship } = loadGame();
  const ship = new Ship(100, 100);

  const force = ship.steerToPointer(new Vector(100, 100));

  assert.equal(force.mag(), 0);
  assert.equal(ship.acc.mag(), 0);
});

test('le contrôleur utilise la position de la souris au lieu des touches directionnelles', () => {
  const sketch = readFileSync(new URL('../sketch.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const updatePlayer = sketch.match(/function updatePlayer\(\) \{[\s\S]*?\n\}/)?.[0] || '';

  assert.match(updatePlayer, /player\.steerToPointer\(createVector\(mouseX, mouseY\)\)/);
  assert.doesNotMatch(updatePlayer, /keyIsDown/);
  assert.match(html, /SOURIS<\/kbd> pointer pour piloter/);
  assert.match(html, /déplace la souris pour diriger le vaisseau vers le pointeur/);
});

test('le repère circulaire vert apparaît près du pointeur seulement en pilotage manuel actif', () => {
  const sketch = readFileSync(new URL('../sketch.js', import.meta.url), 'utf8');
  const markerFunction = sketch.match(/function drawMouseTargetIndicator\(\) \{[\s\S]*?\n\}/)?.[0] || '';
  const calls = [];
  const context = {
    gameStarted: true,
    gameOver: false,
    gamePaused: false,
    awaitingNextStage: false,
    manualControl: true,
    mouseX: 200,
    mouseY: 150,
    mouseTargetPosition: null,
    width: 800,
    height: 600,
    TWO_PI: Math.PI * 2,
    createVector: (x, y) => ({ x, y }),
    drawingContext: {
      save() {},
      restore() {},
      beginPath() {},
      arc: (...args) => calls.push(['arc', ...args]),
      moveTo: (...args) => calls.push(['moveTo', ...args]),
      lineTo: (...args) => calls.push(['lineTo', ...args]),
      stroke() {},
    },
  };

  assert.ok(markerFunction);
  vm.runInNewContext(markerFunction, context);
  vm.runInNewContext('drawMouseTargetIndicator()', context);
  assert.deepEqual(calls[0], ['arc', 222, 168, 10, 0, Math.PI * 2]);
  assert.equal(calls.filter(([name]) => name === 'moveTo').length, 2);
  assert.equal(calls.filter(([name]) => name === 'lineTo').length, 2);

  calls.length = 0;
  context.mouseX = 400;
  context.mouseY = 250;
  vm.runInNewContext('drawMouseTargetIndicator()', context);
  assert.deepEqual(calls[0], ['arc', 386, 250, 10, 0, Math.PI * 2]);
  assert.ok(context.mouseTargetPosition.x > 222 + (422 - 222) * 0.8);
  assert.ok(context.mouseTargetPosition.y > 168 + (268 - 168) * 0.8);

  calls.length = 0;
  context.manualControl = false;
  vm.runInNewContext('drawMouseTargetIndicator()', context);
  assert.equal(calls.length, 0);
  context.manualControl = true;
  context.gamePaused = true;
  vm.runInNewContext('drawMouseTargetIndicator()', context);
  assert.equal(calls.length, 0);
});

test('les chasseurs interceptent les vaisseaux blancs qui approchent les cristaux', () => {
  const { Ship, Hunter } = loadGame();
  const hunter = new Hunter(100, 100);
  const player = new Ship(500, 500);
  const ally = new Ship(120, 100, 'ally');
  const crystal = { pos: new Vector(110, 100), alive: true };

  assert.equal(hunter.chooseTarget(player, [crystal], [ally]), ally);
});

test('les chasseurs gardent une position autour du cristal quand aucun allié ne le menace', () => {
  const { Ship, Hunter } = loadGame();
  const hunter = new Hunter(100, 100);
  const player = new Ship(500, 500);
  const crystal = { pos: new Vector(110, 100), alive: true };
  const guardPosition = hunter.chooseTarget(player, [crystal]);

  assert.notEqual(guardPosition, crystal);
  assert.ok(Math.abs(Vector.dist(guardPosition, crystal.pos) - hunter.guardDistance) < 1e-9);
});

test('la portée de défense des chasseurs suit le paramètre du jeu', () => {
  const { Ship, Hunter, GAME_CONFIG } = loadGame();
  const hunter = new Hunter(100, 100);
  const player = new Ship(500, 500);
  const ally = new Ship(300, 100, 'ally');
  const crystal = { pos: new Vector(100, 100), alive: true };

  assert.notEqual(hunter.chooseTarget(player, [crystal], [ally]), ally);
  GAME_CONFIG.crystalProtectionRadius = 220;
  assert.equal(hunter.chooseTarget(player, [crystal], [ally]), ally);
});

test('les cristaux ont un rayon réduit', () => {
  const { Crystal } = loadGame();
  const crystal = new Crystal(100, 100);

  assert.ok(crystal.r >= 5 && crystal.r <= 8);
});

test('les planètes et le soleil reçoivent des palettes texturées adaptées à leur type', () => {
  const { Obstacle } = loadGame();
  const sun = new Obstacle(0, 0, 40, 'soleil', '#ff9b3e');
  const saturn = new Obstacle(0, 0, 30, 'saturne', '#b7a17b');
  const bluePlanet = new Obstacle(0, 0, 35, 'planete', '#315d91');

  assert.equal(sun.getSurfacePalette().length, 5);
  assert.equal(sun.getSurfacePalette()[0], '#ff9b21');
  assert.equal(saturn.getSurfacePalette()[0], '#ead8ae');
  assert.equal(bluePlanet.getSurfacePalette()[2], '#315d91');
  assert.notDeepEqual(saturn.getSurfacePalette(), bluePlanet.getSurfacePalette());
});

test('la texture solaire contient une granulation dense, des régions actives et des taches', () => {
  const { Obstacle } = loadGame();
  const sun = new Obstacle(0, 0, 40, 'soleil', '#ff9b3e');
  let ellipseCount = 0;
  let activeRegionCount = 0;
  let seed = 17;
  const context = {
    beginPath() {},
    ellipse() { ellipseCount++; },
    fill() {},
    createRadialGradient() {
      activeRegionCount++;
      return { addColorStop() {} };
    },
  };
  const nextRandom = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  sun.drawSolarGranulation(context, 100, 95, sun.getSurfacePalette(), nextRandom);

  assert.ok(ellipseCount > 2600);
  assert.equal(activeRegionCount, 5);
});

test('le multiplicateur du menu ajuste immédiatement la vitesse et respecte la limite de chaque avion', () => {
  const { Ship, Hunter } = loadGame();
  const ally = new Ship(100, 100, 'ally');
  const hunter = new Hunter(300, 100);
  const allyBaseSpeed = ally.baseMaxSpeed;
  const hunterBaseSpeed = hunter.baseMaxSpeed;

  ally.vel.set(2, 0);
  ally.applySpeedMultiplier(1.5);
  hunter.applySpeedMultiplier(1.5);
  assert.equal(ally.maxSpeed, allyBaseSpeed * 1.5);
  assert.equal(hunter.maxSpeed, hunterBaseSpeed * 1.5);
  assert.equal(ally.vel.mag(), 3);

  ally.applySpeedMultiplier(0.5);
  assert.equal(ally.maxSpeed, allyBaseSpeed * 0.5);
  assert.equal(ally.vel.mag(), 1);

  ally.applySpeedMultiplier(2);
  assert.equal(ally.vel.mag(), 4);
  assert.ok(ally.vel.mag() <= ally.maxSpeed);
});

test('la difficulté des vagues augmente la vitesse rouge et suit le réglage de vitesse global', () => {
  const { Hunter } = loadGame();
  const hunter = new Hunter(100, 100);
  const baseSpeed = hunter.baseMaxSpeed;
  hunter.setWaveDifficulty(1.24);
  assert.ok(Math.abs(hunter.maxSpeed - baseSpeed * 1.24) < 1e-9);

  hunter.applySpeedMultiplier(1.5);
  assert.ok(Math.abs(hunter.maxSpeed - baseSpeed * 1.5 * 1.24) < 1e-9);
  assert.ok(hunter.vel.mag() <= hunter.maxSpeed);
});

test('les cristaux fuient un avion blanc dans leur rayon de perception', () => {
  const { Crystal, Ship } = loadGame();
  const crystal = new Crystal(100, 100);
  crystal.vel.set(0, 0);
  const whiteShip = new Ship(130, 100, 'ally');
  crystal.steer([whiteShip]);

  assert.ok(crystal.acc.x < 0);
  assert.ok(crystal.acc.mag() <= crystal.maxForce + 1e-9);
});

test('toutes les entités de jeu héritent de Vehicle et les obstacles restent fixes', () => {
  const { Vehicle, Obstacle, BlackHole, Crystal, Ship, Hunter, Boss, Missile } = loadGame();
  const obstacle = new Obstacle(300, 200, 40, 'planete', '#7655dd');
  const blackHole = new BlackHole(180, 200);
  const target = new Crystal(100, 100);
  const ship = new Ship(50, 50);
  const hunter = new Hunter(250, 200);
  const boss = new Boss(350, 200, 3);
  const missile = new Missile(60, 50, hunter);

  for (const entity of [obstacle, blackHole, target, ship, hunter, boss, missile]) assert.ok(entity instanceof Vehicle);
  assert.equal(obstacle.maxSpeed, 0);
  assert.equal(blackHole.maxSpeed, 0);
});

test('entrer dans le trou noir téléporte le joueur et déclenche un délai de recharge', () => {
  const { BlackHole } = loadGame();
  const blackHole = new BlackHole(100, 100, 'A');
  const exit = new BlackHole(420, 260, 'B');
  blackHole.connect(exit);
  exit.connect(blackHole);
  const ship = { pos: new Vector(130, 100), acc: new Vector(2, 1), r: 10, alive: true };

  assert.equal(blackHole.enter(ship), true);
  assert.deepEqual([ship.pos.x, ship.pos.y], [420, 260]);
  assert.equal(ship.acc.mag(), 0);
  assert.equal(blackHole.cooldownFrames, 180);
  assert.equal(exit.cooldownFrames, 180);
  assert.equal(exit.enter(ship), false);
  blackHole.tick();
  exit.tick();
  assert.equal(blackHole.cooldownFrames, 179);
});

test('le trou noir ne téléporte pas un vaisseau distant ou détruit', () => {
  const { BlackHole } = loadGame();
  const blackHole = new BlackHole(100, 100, 'A');
  const exit = new BlackHole(420, 260, 'B');
  blackHole.connect(exit);
  const ship = { pos: new Vector(300, 100), acc: new Vector(), r: 10, alive: true };

  assert.equal(blackHole.enter(ship), false);
  ship.pos.set(100, 100);
  ship.alive = false;
  assert.equal(blackHole.enter(ship), false);
  assert.throws(() => blackHole.connect(blackHole), RangeError);
});

test('les deux trous sont petits et leur position reste éloignée des planètes', () => {
  const { BlackHole, GameRules } = loadGame();
  const first = new BlackHole(150, 100, 'A');
  const second = new BlackHole(650, 400, 'B');
  const planet = { pos: new Vector(350, 250), r: 55, type: 'planete' };
  const clearance = 120;
  const finder = (x, y) => GameRules.findSafeTeleportPosition(
    800,
    600,
    [],
    [planet],
    () => new Vector(x, y),
    clearance,
    null,
    0,
  );

  assert.ok(first.r < 30);
  assert.ok(second.r < 30);
  for (const hole of [first, second]) {
    const safePosition = finder(hole.pos.x, hole.pos.y);
    assert.deepEqual([safePosition.x, safePosition.y], [hole.pos.x, hole.pos.y]);
    assert.ok(GameRules.distanceSquared(hole, planet) > (planet.r + clearance) ** 2);
  }
});

test('la position de sortie évite les dangers et s’éloigne du trou noir', () => {
  const { GameRules } = loadGame();
  const entity = { pos: new Vector(300, 200), r: 20, alive: true };
  const obstacle = { pos: new Vector(500, 300), r: 30 };
  const candidates = [new Vector(110, 100), new Vector(300, 200), new Vector(400, 400)];
  const position = GameRules.findSafeTeleportPosition(
    800,
    600,
    [entity],
    [obstacle],
    () => candidates.shift(),
    30,
    new Vector(100, 100),
    180,
  );

  assert.deepEqual([position.x, position.y], [400, 400]);
  assert.ok(GameRules.distanceSquared({ pos: position }, entity) > (30 + entity.r) ** 2);
  assert.ok(GameRules.distanceSquared({ pos: position }, obstacle) > (30 + obstacle.r) ** 2);
});

test('une sortie de secours balaie les positions libres et retourne null si tout est bloqué', () => {
  const { GameRules } = loadGame();
  const safePosition = GameRules.findSafeTeleportPosition(
    320,
    240,
    [],
    [],
    () => new Vector(0, 0),
    30,
    new Vector(20, 20),
    0,
  );
  assert.deepEqual([safePosition.x, safePosition.y], [30, 30]);

  const blocked = GameRules.findSafeTeleportPosition(
    100,
    80,
    [],
    [{ pos: new Vector(50, 40), r: 1000 }],
    () => new Vector(50, 40),
    30,
    new Vector(5, 5),
    0,
  );
  assert.equal(blocked, null);
  assert.throws(() => GameRules.findSafeTeleportPosition(0, 100, [], [], () => new Vector(), 10, null, 0), RangeError);
});

test('le cercle englobant décide correctement les contacts et les non-contacts', () => {
  const { GameRules } = loadGame();
  const first = { pos: new Vector(0, 0), r: 10 };
  const touching = { pos: new Vector(19, 0), r: 10 };
  const far = { pos: new Vector(30, 0), r: 10 };

  assert.ok(GameRules.overlaps(first, touching));
  assert.ok(!GameRules.overlaps(first, far));
  assert.ok(GameRules.overlaps(first, { pos: new Vector(20, 0), r: 10 }));
});

test('chaque cristal touché fournit une munition, dans la limite du stock', () => {
  const { GameRules } = loadGame();
  const ship = { pos: new Vector(100, 100), r: 10 };
  const crystal = { pos: new Vector(119, 100), r: 10, alive: true };

  const ammo = GameRules.collectCrystal(ship, crystal, 4, 50);

  assert.equal(ammo, 5);
  assert.equal(crystal.alive, false);
  assert.equal(GameRules.collectCrystal(ship, crystal, ammo, 50), null);
  assert.equal(GameRules.collectCrystal(ship, { ...crystal, alive: true, pos: new Vector(300, 300) }, ammo, 50), null);

  const fullStockCrystal = { pos: new Vector(119, 100), r: 10, alive: true };
  assert.equal(GameRules.collectCrystal(ship, fullStockCrystal, 50, 50), 50);
  assert.equal(fullStockCrystal.alive, false);
});

test('les cristaux bonus rechargent les munitions ou restaurent le bouclier, avec des limites', () => {
  const { GameRules } = loadGame();
  assert.deepEqual(
    JSON.parse(JSON.stringify(GameRules.crystalReward({ alive: true, type: 'ammo' }, 45, 50))),
    { ammo: 50, score: 75, shield: false, bonus: true },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(GameRules.crystalReward({ alive: true, type: 'shield' }, 0, 50))),
    { ammo: 0, score: 75, shield: true, bonus: true },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(GameRules.crystalReward({ alive: true, type: 'normal' }, 50, 50))),
    { ammo: 50, score: 25, shield: false, bonus: false },
  );
  assert.equal(GameRules.crystalReward({ alive: false, type: 'ammo' }, 0, 50), null);
  assert.throws(() => GameRules.crystalReward({ alive: true, type: 'unknown' }, 0, 50), RangeError);
});

test('un contact entre un chasseur vivant et un avion blanc vivant est détecté', () => {
  const { GameRules } = loadGame();
  const whiteShip = { pos: new Vector(100, 100), r: 10, alive: true };
  const hunter = { pos: new Vector(119, 100), r: 10, alive: true };
  const distantHunter = { pos: new Vector(300, 300), r: 10, alive: true };

  assert.equal(GameRules.firstFleetContact(whiteShip, [distantHunter, hunter]), hunter);
  assert.equal(GameRules.firstFleetContact(whiteShip, [{ ...hunter, alive: false }]), null);
  assert.equal(GameRules.firstFleetContact({ ...whiteShip, alive: false }, [hunter]), null);
  assert.equal(GameRules.firstFleetContact(whiteShip, [hunter], 1), null);
  assert.equal(GameRules.firstFleetContact(whiteShip, [distantHunter]), null);
});

test('le premier contact fatal termine la partie, mais le bouclier protège', () => {
  const { GameRules } = loadGame();
  const whiteShip = { pos: new Vector(100, 100), r: 10, alive: true };
  const hunter = { pos: new Vector(119, 100), r: 10, alive: true };

  const hit = GameRules.resolvePlayerCollision(whiteShip, [hunter]);
  assert.equal(hit.type, 'hunter');
  assert.equal(hit.hunter, hunter);
  assert.equal(hit.lives, 0);
  assert.equal(hit.gameOver, true);
  assert.equal(GameRules.resolvePlayerCollision(whiteShip, [hunter], [], 1), null);
  assert.equal(GameRules.resolvePlayerCollision(whiteShip, [{ ...hunter, alive: false }]), null);
  assert.equal(GameRules.resolvePlayerCollision(whiteShip, [{ ...hunter, pos: new Vector(300, 300) }]), null);
});

test('le boss détruit le joueur même sous bouclier', () => {
  const { GameRules } = loadGame();
  const player = { pos: new Vector(100, 100), r: 10, alive: true };
  const boss = { pos: new Vector(119, 100), r: 10, alive: true, isBoss: true };

  const hit = GameRules.resolvePlayerCollision(player, [], [], 120, boss);
  assert.equal(hit.type, 'boss');
  assert.equal(hit.hunter, boss);
  assert.equal(hit.gameOver, true);
  assert.equal(GameRules.resolvePlayerCollision(player, [], [], 120, { ...boss, alive: false }), null);
});

test('toucher une planète ou le soleil termine la partie même sous bouclier', () => {
  const { GameRules } = loadGame();
  const player = { pos: new Vector(100, 100), r: 16, alive: true };
  const planet = { pos: new Vector(135, 100), r: 20, type: 'planete' };
  const sun = { pos: new Vector(100, 100), r: 40, type: 'soleil' };
  const asteroid = { pos: new Vector(100, 100), r: 20, type: 'asteroide' };

  const hit = GameRules.resolvePlayerCollision(player, [], [planet], 120);
  assert.equal(hit.type, 'planet');
  assert.equal(hit.obstacle, planet);
  assert.equal(hit.lives, 0);
  assert.equal(hit.gameOver, true);
  assert.equal(GameRules.firstPlanetContact(player, [sun]), sun);
  assert.equal(GameRules.firstPlanetContact(player, [asteroid]), null);
  assert.equal(GameRules.firstPlanetContact(player, [{ ...planet, pos: new Vector(300, 300) }]), null);
  assert.equal(GameRules.firstPlanetContact({ ...player, alive: false }, [planet]), null);
});

test('un chasseur à distance ne touche pas le vaisseau joueur', () => {
  const { GameRules } = loadGame();
  const player = { pos: new Vector(100, 100), r: 16, alive: true };
  const hunter = { pos: new Vector(200, 100), r: 15, alive: true };

  assert.equal(GameRules.firstFleetContact(player, [hunter]), null);
});

test('un missile calcule une force vers la position future du chasseur', () => {
  const { Hunter, Missile } = loadGame();
  const hunter = new Hunter(200, 100);
  hunter.vel.set(0, 2);
  const missile = new Missile(100, 100, hunter);
  missile.steerToTarget([]);

  assert.ok(missile.acc.x > 0);
  assert.ok(missile.acc.y > 0);
  assert.ok(missile.acc.mag() <= missile.maxForce + 1e-9);
});

test('le boss est un véhicule hostile à plusieurs points de vie et reste une cible de missile', () => {
  const { Vehicle, Boss, Missile } = loadGame();
  const boss = new Boss(300, 250, 3);
  assert.ok(boss instanceof Vehicle);
  assert.equal(boss.isBoss, true);
  assert.equal(boss.health, 3);
  assert.ok(boss.r > new (loadGame().Hunter)(300, 250).r);

  for (let i = 0; i < 2; i++) {
    assert.equal(new Missile(100, 250, boss).hitTarget(), true);
    assert.equal(boss.alive, true);
  }
  assert.equal(new Missile(100, 250, boss).hitTarget(), true);
  assert.equal(boss.health, 0);
  assert.equal(boss.alive, false);
  assert.equal(missile.hitTarget(), false);
});

test('les cristaux spéciaux portent un type distinct pour leurs effets et leur rendu', () => {
  const { Crystal } = loadGame();
  const normal = new Crystal(80, 80);
  const ammo = new Crystal(100, 80, 'ammo');
  const shield = new Crystal(120, 80, 'shield');
  assert.equal(normal.type, 'normal');
  assert.equal(ammo.type, 'ammo');
  assert.equal(shield.type, 'shield');
  assert.notEqual(ammo.color, normal.color);
  assert.notEqual(shield.color, normal.color);
});
