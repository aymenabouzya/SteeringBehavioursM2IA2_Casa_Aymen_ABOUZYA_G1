const GAME_CONFIG = {
  crystalCount: 32,
  crystalProtectionRadius: 180,
  hunterCount: 12,
  missileCapacity: 50,
  reloadFrames: 180,
  autoFireDelay: 24,
  crystalRespawnFrames: 45,
  scoreCrystalRespawnFrames: 90,
  maxSeeAhead: 105,
  playerFleeRadius: 245,
  playerFleeWeight: 3.2,
  speedMultiplier: 1.4,
  maxAddedAircraftPerSide: 20,
  winScore: 300,
  starCount: 110,
  flightMode: "mission",
  waveDurationFrames: 1500,
  waveEnemyIncrease: 2,
  maxWaveHunters: 28,
  waveSpeedIncrease: 0.08,
  maxWaveSpeedMultiplier: 1.5,
  shieldDurationFrames: 240,
  shieldCooldownFrames: 900,
  radarRange: 520,
};

const BEST_SCORE_KEY = "orbital-drift-best-score";
const DIFFICULTY_KEY = "orbital-drift-difficulty";
const CRYSTAL_VERTEX_COS = [1, 0.5, -0.5, -1, -0.5, 0.5];
const CRYSTAL_VERTEX_SIN = [0, 0.8660254, 0.8660254, 0, -0.8660254, -0.8660254];

let player;
let boss = null;
let alliedShips = [];
let hunters = [];
let crystals = [];
let missiles = [];
let obstacles = [];
let blackHoles = [];
let stars = [];
let score = 0;
let lives = 3;
let ammo = GAME_CONFIG.missileCapacity;
let reloadTimer = 0;
let crystalRespawnTimer = 0;
let scoreCrystalRespawnTimer = 0;
let autoFire = false;
let antiGravity = false;
let manualControl = true;
let gameOver = false;
let gameStarted = false;
let gamePaused = false;
let awaitingNextStage = false;
let panelsVisible = false;
let panelsVisibleBeforePause = false;
let gameOverReason = "";
let stage = 1;
let stageProgress = 0;
let gameWon = false;
let stageBannerTimer = 0;
let stageBannerText = "";
let wave = 1;
let waveTimer = GAME_CONFIG.waveDurationFrames;
let waveBannerTimer = 0;
let bestScore = 0;
let shieldFrames = 0;
let shieldCooldownFrames = 0;
let mouseTargetPosition = null;
let manualInputMode = "mouse";
let keyboardTargetPosition = null;
let galaxyTexture;
let patrolPath = [];

// Crée le canvas, les étoiles et une nouvelle partie.
function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  textFont("monospace");
  patrolPath = PathFollowing.createOrbitPath(width, height);
  stars = Array.from({ length: GAME_CONFIG.starCount }, () => ({
    x: random(width),
    y: random(height),
    size: random(0.7, 2),
    phase: random(TWO_PI),
    cross: random() < 0.025,
    depth: random(0.15, 1),
  }));
  GAME_CONFIG.difficulty = loadDifficulty();
  bestScore = loadBestScore();
  setupControlPanel();
  resetGame();
}

// Met à jour chaque entité en passant les forces à applyForce et la locomotion à Vehicle.
function draw() {
  drawSpace();
  if (Vehicle.debug && GAME_CONFIG.flightMode === "patrol") PathFollowing.draw(patrolPath);
  obstacles.forEach(obstacle => obstacle.show());
  blackHoles.forEach(blackHole => blackHole.show());

  if (gameStarted && !gameOver && !gamePaused && !awaitingNextStage) {
    updateCrystals();
    updateHunters();
    updateBoss();
    updatePlayer();
    updateAlliedShips();
    updateMissiles();
    updateCollisions();
    if (!gameOver) {
      updateRespawns();
      updateWeapons();
      updateWaves();
      updateShieldTimers();
      blackHoles.forEach(blackHole => blackHole.tick());
      updateGameState();
    }
  }
  saveBestScore();

  drawCrystals();
  drawFleetTrails();
  drawFleet();
  drawBossIndicator();
  drawFleetShields();
  drawRadar();
  missiles.forEach(missile => missile.show());
  drawMouseTargetIndicator();

  let crystalCount = 0;
  let hunterCount = 0;
  for (let i = 0; i < crystals.length; i++) if (crystals[i].alive) crystalCount++;
  for (let i = 0; i < hunters.length; i++) if (hunters[i].alive) hunterCount++;
  updateGameHud({
    antiGravity,
    autoFire,
    manualControl,
    manualInputMode,
    difficulty: GAME_CONFIG.difficulty,
    gamePaused,
    awaitingNextStage,
    flightMode: GAME_CONFIG.flightMode,
    crystals: crystalCount,
    allies: countLivingShips(alliedShips) + Number(player.alive),
    enemies: hunterCount,
    speedMultiplier: GAME_CONFIG.speedMultiplier,
    canAddAlly: alliedShips.length < GAME_CONFIG.maxAddedAircraftPerSide,
    canAddEnemy: hunters.length < GAME_CONFIG.hunterCount + GAME_CONFIG.maxAddedAircraftPerSide,
    gameOver,
    gameStarted,
    panelsVisible,
    stageState: GameRules.getStageObjective(
      stage,
      stageProgress,
      boss && boss.alive ? boss.health : 0,
      boss ? boss.maxHealth : 0,
    ),
    bossHealth: boss && boss.alive ? boss.health : 0,
    bossMaxHealth: boss ? boss.maxHealth : 0,
    bossActive: Boolean(boss && boss.alive),
    gameWon,
    stageBannerTimer,
    stageBannerText,
    wave,
    nextWaveSeconds: Math.ceil(waveTimer / 60),
    waveBannerTimer,
    bestScore,
    shieldFrames,
    shieldCooldownFrames,
    shieldDurationFrames: GAME_CONFIG.shieldDurationFrames,
    shieldMaxCooldownFrames: GAME_CONFIG.shieldCooldownFrames,
    winScore: GAME_CONFIG.winScore,
    planets: countPlanets(),
    asteroids: countAsteroids(),
    entities: 1 + countLivingShips(alliedShips) + crystalCount + hunterCount
      + Number(Boolean(boss && boss.alive)) + missiles.length + obstacles.length + blackHoles.length,
    blackHoleCooldownFrames: blackHoles.length ? blackHoles[0].cooldownFrames : 0,
    score,
    lives,
    ammo,
    maxAmmo: GAME_CONFIG.missileCapacity,
    reloading: reloadTimer > 0,
    message: getEndMessage(),
  });
}

// Construit une texture galactique fixe, puis ajoute les étoiles de premier plan.
function drawSpace() {
  const ctx = drawingContext;
  if (!galaxyTexture || galaxyTexture.width !== width || galaxyTexture.height !== height) {
    galaxyTexture = createGalaxyTexture(width, height);
  }
  ctx.drawImage(galaxyTexture, 0, 0, width, height);
  ctx.save();
  ctx.fillStyle = "#d7e7ff";
  ctx.strokeStyle = "#d7e7ff";
  for (let i = 0; i < stars.length; i++) {
    const star = stars[i];
    const x = (star.x + sin(frameCount * 0.001 + star.phase) * 10 * star.depth + width) % width;
    const y = (star.y + cos(frameCount * 0.0013 + star.phase) * 8 * star.depth + height) % height;
    ctx.globalAlpha = 0.12 + 0.45 * (0.5 + 0.5 * sin(frameCount * 0.035 + star.phase));
    ctx.fillRect(x, y, star.size, star.size);
    if (star.cross) {
      ctx.beginPath();
      ctx.moveTo(x - 2.5, y);
      ctx.lineTo(x + 2.5, y);
      ctx.moveTo(x, y - 2.5);
      ctx.lineTo(x, y + 2.5);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Génère hors-boucle le fond bleu, les nébuleuses et le champ d'étoiles.
function createGalaxyTexture(canvasWidth, canvasHeight) {
  const texture = document.createElement("canvas");
  texture.width = Math.max(1, Math.round(canvasWidth));
  texture.height = Math.max(1, Math.round(canvasHeight));
  const ctx = texture.getContext("2d");
  const centerX = texture.width * 0.36;
  const centerY = texture.height * 0.49;
  let seed = 739391 + texture.width * 17 + texture.height * 31;
  const nextRandom = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const gaussian = () => {
    const first = Math.max(0.0001, nextRandom());
    return Math.sqrt(-2 * Math.log(first)) * Math.cos(TWO_PI * nextRandom());
  };

  ctx.fillStyle = "#02040d";
  ctx.fillRect(0, 0, texture.width, texture.height);
  const spaceGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, texture.width * 0.78);
  spaceGlow.addColorStop(0, "rgba(37, 51, 119, 0.3)");
  spaceGlow.addColorStop(0.52, "rgba(19, 27, 75, 0.2)");
  spaceGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = spaceGlow;
  ctx.fillRect(0, 0, texture.width, texture.height);

  const nebulaColors = [
    [38, 115, 255],
    [42, 183, 255],
    [99, 72, 245],
    [188, 58, 220],
    [245, 67, 147],
    [255, 111, 103],
  ];
  for (let i = 0; i < 46; i++) {
    const nebulaColor = nebulaColors[Math.floor(nextRandom() * nebulaColors.length)];
    const x = nextRandom() * texture.width;
    const y = nextRandom() * texture.height;
    const radius = texture.width * (0.025 + nextRandom() * 0.085);
    const glow = ctx.createRadialGradient(x, y, radius * 0.025, x, y, radius);
    glow.addColorStop(0, `rgba(${nebulaColor[0]}, ${nebulaColor[1]}, ${nebulaColor[2]}, 0.2)`);
    glow.addColorStop(0.38, `rgba(${nebulaColor[0]}, ${nebulaColor[1]}, ${nebulaColor[2]}, 0.075)`);
    glow.addColorStop(1, `rgba(${nebulaColor[0]}, ${nebulaColor[1]}, ${nebulaColor[2]}, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  for (const [x, y, radius, rgb] of [
    [0.77, 0.36, 0.2, [230, 51, 158]],
    [0.18, 0.84, 0.18, [173, 65, 232]],
    [0.91, 0.72, 0.14, [255, 92, 126]],
  ]) {
    const nebulaX = texture.width * x;
    const nebulaY = texture.height * y;
    const nebulaRadius = texture.width * radius;
    const glow = ctx.createRadialGradient(nebulaX, nebulaY, 0, nebulaX, nebulaY, nebulaRadius);
    glow.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.24)`);
    glow.addColorStop(0.38, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.11)`);
    glow.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(nebulaX - nebulaRadius, nebulaY - nebulaRadius, nebulaRadius * 2, nebulaRadius * 2);
  }

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(-0.24);
  const galaxyRadius = Math.max(texture.width * 0.5, texture.height * 0.52);
  const scaleY = Math.max(0.42, Math.min(0.94, texture.height * 0.48 / galaxyRadius));
  ctx.scale(1, scaleY);

  const coreGlow = ctx.createRadialGradient(0, 0, galaxyRadius * 0.012, 0, 0, galaxyRadius * 0.72);
  coreGlow.addColorStop(0, "rgba(255, 249, 239, 0.98)");
  coreGlow.addColorStop(0.045, "rgba(255, 230, 224, 0.87)");
  coreGlow.addColorStop(0.14, "rgba(255, 190, 209, 0.48)");
  coreGlow.addColorStop(0.36, "rgba(113, 162, 255, 0.19)");
  coreGlow.addColorStop(0.72, "rgba(42, 92, 222, 0.065)");
  coreGlow.addColorStop(1, "rgba(16, 30, 92, 0)");
  ctx.fillStyle = coreGlow;
  ctx.beginPath();
  ctx.arc(0, 0, galaxyRadius * 0.76, 0, TWO_PI);
  ctx.fill();

  for (let arm = 0; arm < 2; arm++) {
    const baseAngle = -0.38 + arm * Math.PI;
    const armPath = (angleOffset = 0) => {
      ctx.beginPath();
      for (let point = 0; point <= 240; point++) {
        const progress = point / 240;
        const radius = galaxyRadius * (0.035 + progress * 0.94);
        const angle = baseAngle + progress * Math.PI * 1.95 + angleOffset;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (point === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    };

    ctx.save();
    ctx.lineCap = "round";
    armPath();
    ctx.strokeStyle = arm === 1 ? "rgba(172, 70, 231, 0.2)" : "rgba(43, 119, 255, 0.23)";
    ctx.lineWidth = galaxyRadius * 0.12;
    ctx.shadowColor = arm === 1 ? "#c046ff" : "#328cff";
    ctx.shadowBlur = galaxyRadius * 0.075;
    ctx.stroke();

    armPath();
    ctx.strokeStyle = arm === 1 ? "rgba(207, 128, 255, 0.22)" : "rgba(94, 188, 255, 0.27)";
    ctx.lineWidth = galaxyRadius * 0.052;
    ctx.shadowBlur = galaxyRadius * 0.04;
    ctx.stroke();

    armPath(-0.09);
    ctx.globalCompositeOperation = "multiply";
    ctx.strokeStyle = "rgba(4, 8, 27, 0.52)";
    ctx.lineWidth = galaxyRadius * 0.025;
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.restore();

    for (let cloudIndex = 0; cloudIndex < 34; cloudIndex++) {
      const progress = 0.08 + cloudIndex / 34 * 0.87;
      const radius = galaxyRadius * (0.035 + progress * 0.94);
      const angle = baseAngle + progress * Math.PI * 1.95 + (nextRandom() - 0.5) * 0.16;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const cloudRadius = galaxyRadius * (0.018 + nextRandom() * 0.04) * (1 - progress * 0.28);
      const color = arm === 1 ? [205, 96, 243] : [79, 167, 255];
      const cloud = ctx.createRadialGradient(x, y, 0, x, y, cloudRadius);
      cloud.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.25)`);
      cloud.addColorStop(0.42, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.11)`);
      cloud.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);
      ctx.fillStyle = cloud;
      ctx.beginPath();
      ctx.arc(x, y, cloudRadius, 0, TWO_PI);
      ctx.fill();
    }
  }

  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, galaxyRadius * 0.2);
  core.addColorStop(0, "rgba(255, 255, 246, 1)");
  core.addColorStop(0.08, "rgba(255, 239, 228, 0.97)");
  core.addColorStop(0.28, "rgba(255, 208, 211, 0.68)");
  core.addColorStop(0.62, "rgba(218, 139, 216, 0.25)");
  core.addColorStop(1, "rgba(153, 80, 207, 0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.ellipse(0, 0, galaxyRadius * 0.22, galaxyRadius * 0.13, -0.04, 0, TWO_PI);
  ctx.fill();

  const starBuckets = [[], [], [], [], []];
  const halfSpan = Math.hypot(texture.width, texture.height) * 0.68;
  const fieldStarCount = Math.max(1800, Math.round(texture.width * texture.height * 0.008));
  for (let i = 0; i < fieldStarCount; i++) {
    const x = (nextRandom() * 2 - 1) * halfSpan;
    const y = (nextRandom() * 2 - 1) * texture.height * 0.68;
    const brightness = nextRandom();
    const bucket = Math.min(4, Math.floor(brightness * 5));
    const size = brightness > 0.997 ? 1.7 : brightness > 0.94 ? 1.05 : 0.52;
    starBuckets[bucket].push([x, y, size]);
  }

  const galaxyStarCount = Math.max(2500, Math.round(texture.width * texture.height * 0.012));
  for (let i = 0; i < galaxyStarCount; i++) {
    let x;
    let y;
    if (nextRandom() < 0.84) {
      const arm = Math.floor(nextRandom() * 2);
      const progress = Math.sqrt(nextRandom());
      const radius = galaxyRadius * (0.045 + progress * 0.92);
      const angle = -0.38 + arm * Math.PI + progress * Math.PI * 1.95 + gaussian() * 0.075;
      x = Math.cos(angle) * radius + gaussian() * galaxyRadius * 0.022;
      y = Math.sin(angle) * radius + gaussian() * galaxyRadius * 0.035;
    } else {
      const angle = nextRandom() * TWO_PI;
      const radius = Math.sqrt(nextRandom()) * galaxyRadius * 0.66;
      x = Math.cos(angle) * radius;
      y = Math.sin(angle) * radius;
    }
    const brightness = nextRandom();
    const bucket = Math.min(4, Math.floor(brightness * 5));
    const size = brightness > 0.996 ? 1.8 : brightness > 0.94 ? 1.1 : 0.55;
    starBuckets[bucket].push([x, y, size]);
  }

  for (let bucket = 0; bucket < starBuckets.length; bucket++) {
    const starsInBucket = starBuckets[bucket];
    ctx.fillStyle = [
      "rgba(104, 151, 239, 0.45)",
      "rgba(151, 191, 255, 0.59)",
      "rgba(205, 225, 255, 0.72)",
      "rgba(238, 246, 255, 0.87)",
      "rgba(255, 251, 236, 0.99)",
    ][bucket];
    ctx.beginPath();
    for (let i = 0; i < starsInBucket.length; i++) {
      const star = starsInBucket[i];
      ctx.moveTo(star[0] + star[2], star[1]);
      ctx.arc(star[0], star[1], star[2], 0, TWO_PI);
    }
    ctx.fill();
  }
  ctx.restore();
  return texture;
}

// Regroupe les segments de traînée pour réduire les appels au contexte Canvas.
function drawFleetTrails() {
  const ctx = drawingContext;
  ctx.save();
  ctx.lineWidth = 1.3;
  ctx.setLineDash([2, 4]);
  for (let faction = 0; faction < 2; faction++) {
    ctx.strokeStyle = faction === 0 ? "#99eaff" : "#ff5a70";
    ctx.shadowColor = faction === 0 ? "#48dfff" : "#ff405e";
    ctx.shadowBlur = 8;
    for (let ageGroup = 0; ageGroup < 3; ageGroup++) {
      ctx.globalAlpha = 0.1 + 0.35 * (ageGroup + 1) / 3;
      ctx.lineWidth = 0.8 + ageGroup * 0.25;
      ctx.beginPath();
      for (let i = 0; i < fleetSize(); i++) {
        const ship = getFleetShip(i);
        if (!ship.alive || (ship.faction === "enemy" ? 1 : 0) !== faction) continue;
        const segments = ship.path.length - 1;
        if (segments < 1) continue;
        const start = 1 + Math.floor(segments * ageGroup / 3);
        const end = 1 + Math.floor(segments * (ageGroup + 1) / 3);
        if (start >= end) continue;
        ctx.moveTo(ship.path[start - 1].x, ship.path[start - 1].y);
        for (let j = start; j < end; j++) ctx.lineTo(ship.path[j].x, ship.path[j].y);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Dessine des avions vus du dessus, avec ailes, fuselage, cockpit et réacteurs.
function drawFleet() {
  const ctx = drawingContext;
  for (let faction = 0; faction < 2; faction++) {
    for (let i = 0; i < fleetSize(); i++) {
      const ship = getFleetShip(i);
      if (!ship.alive || (ship.faction === "enemy" ? 1 : 0) !== faction) continue;
      const angle = ship.vel.magSq() > 0.001 ? ship.vel.heading() : 0;
      ctx.save();
      ctx.translate(ship.pos.x, ship.pos.y);
      ctx.rotate(angle);
      drawAircraft(ctx, ship, faction === 0);
      ctx.restore();
    }

  }

  if (Vehicle.debug) {
    noFill();
    for (let i = 0; i < fleetSize(); i++) {
      const ship = getFleetShip(i);
      if (!ship.alive) continue;
      stroke(ship.faction === "enemy" ? color(255, 90, 110, 110) : color(105, 220, 255, 110));
      circle(ship.pos.x, ship.pos.y, ship.r * 2);
    }
  }
}

function drawBossIndicator() {
  if (!boss || !boss.alive) return;
  const ctx = drawingContext;
  ctx.save();
  ctx.translate(boss.pos.x, boss.pos.y);
  ctx.rotate(boss.vel.magSq() > 0.001 ? boss.vel.heading() : 0);
  ctx.shadowBlur = 22;
  ctx.shadowColor = "#ff405e";
  drawAircraft(ctx, boss, false);
  ctx.restore();

  const barWidth = 66;
  const ratio = boss.health / boss.maxHealth;
  ctx.save();
  ctx.fillStyle = "rgba(11, 16, 35, 0.88)";
  ctx.fillRect(boss.pos.x - barWidth / 2, boss.pos.y - boss.r_pourDessin - 13, barWidth, 5);
  ctx.fillStyle = "#ff5a70";
  ctx.fillRect(boss.pos.x - barWidth / 2, boss.pos.y - boss.r_pourDessin - 13, barWidth * ratio, 5);
  ctx.restore();
}

// Dessine un halo autour de chaque avion blanc tant que le bouclier d'escadrille est actif.
function drawFleetShields() {
  if (shieldFrames <= 0 || !gameStarted || gameOver) return;
  const ctx = drawingContext;
  const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.18);
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = `rgba(91, 235, 255, ${0.45 + pulse * 0.4})`;
  ctx.shadowBlur = 15;
  ctx.shadowColor = "#48eaff";
  for (let i = -1; i < alliedShips.length; i++) {
    const ship = i < 0 ? player : alliedShips[i];
    if (!ship.alive) continue;
    ctx.beginPath();
    ctx.arc(ship.pos.x, ship.pos.y, ship.r + 9 + pulse * 2, 0, TWO_PI);
    ctx.stroke();
  }
  ctx.restore();
}

// Affiche un repère de cible près du pointeur pendant le pilotage manuel.
function drawMouseTargetIndicator() {
  if (!gameStarted || gameOver || gamePaused || awaitingNextStage || !manualControl
    || manualInputMode !== "mouse"
    || mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return;

  const targetX = Math.max(14, Math.min(width - 14, mouseX + 22));
  const targetY = Math.max(14, Math.min(height - 14, mouseY + 18));
  if (!mouseTargetPosition) {
    mouseTargetPosition = createVector(targetX, targetY);
  } else {
    mouseTargetPosition.x += (targetX - mouseTargetPosition.x) * 0.82;
    mouseTargetPosition.y += (targetY - mouseTargetPosition.y) * 0.82;
  }
  const ctx = drawingContext;
  ctx.save();
  ctx.strokeStyle = "#a8ff62";
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.9;
  ctx.shadowColor = "#a8ff62";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(mouseTargetPosition.x, mouseTargetPosition.y, 10, 0, TWO_PI);
  ctx.moveTo(mouseTargetPosition.x - 20, mouseTargetPosition.y);
  ctx.lineTo(mouseTargetPosition.x - 10, mouseTargetPosition.y);
  ctx.moveTo(mouseTargetPosition.x + 10, mouseTargetPosition.y);
  ctx.lineTo(mouseTargetPosition.x + 20, mouseTargetPosition.y);
  ctx.stroke();
  ctx.restore();
}

// Affiche la flotte rouge autour du joueur sur un radar top-down avec portée limitée.
function drawRadar() {
  const compact = width <= 600;
  const centerX = compact ? width - 64 : width - 76;
  const centerY = compact ? Math.min(160, height * 0.4) : height - 92;
  const radarRadius = compact ? 32 : 39;
  const panelSize = compact ? 104 : 116;
  const labelOffset = compact ? 43 : 49;
  const radarRange = GAME_CONFIG.radarRange;
  push();
  rectMode(CENTER);
  noStroke();
  fill(5, 12, 28, 225);
  rect(centerX, centerY, panelSize, panelSize, 8);
  noFill();
  stroke(72, 194, 224, 120);
  strokeWeight(1);
  rect(centerX, centerY, panelSize, panelSize, 8);

  noStroke();
  fill(161, 194, 214, 220);
  textAlign(LEFT, CENTER);
  textSize(7);
  text("TACTICAL RADAR", centerX - labelOffset, centerY - (compact ? 41 : 48));
  fill(112, 145, 169, 185);
  textAlign(RIGHT, CENTER);
  text(`${radarRange}M`, centerX + labelOffset, centerY - (compact ? 41 : 48));

  noFill();
  stroke(54, 138, 166, 105);
  strokeWeight(1);
  circle(centerX, centerY + 7, radarRadius * 2);
  circle(centerX, centerY + 7, radarRadius * 1.3);
  line(centerX - radarRadius, centerY + 7, centerX + radarRadius, centerY + 7);
  line(centerX, centerY + 7 - radarRadius, centerX, centerY + 7 + radarRadius);

  const ctx = drawingContext;
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY + 7, radarRadius - 1, 0, TWO_PI);
  ctx.clip();
  ctx.translate(centerX, centerY + 7);
  ctx.rotate(-frameCount * 0.012);
  const sweep = ctx.createLinearGradient(0, 0, radarRadius, 0);
  sweep.addColorStop(0, "rgba(59, 229, 216, 0)");
  sweep.addColorStop(1, "rgba(59, 229, 216, 0.22)");
  ctx.fillStyle = sweep;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, radarRadius - 1, -0.34, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  for (let i = 0; i < hunters.length; i++) {
    const hunter = hunters[i];
    if (!hunter.alive || !player.alive) continue;
    const dx = hunter.pos.x - player.pos.x;
    const dy = hunter.pos.y - player.pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const scale = distance > radarRange ? radarRange / distance : 1;
    const blipX = centerX + dx * scale / radarRange * radarRadius;
    const blipY = centerY + 7 + dy * scale / radarRange * radarRadius;
    drawingContext.save();
    drawingContext.shadowBlur = 8;
    drawingContext.shadowColor = "#ff4d67";
    noStroke();
    fill(255, 82, 111, 235);
    circle(blipX, blipY, 5);
    drawingContext.restore();
  }

  const heading = player.vel.magSq() > 0.001 ? player.vel.heading() : 0;
  push();
  translate(centerX, centerY + 7);
  rotate(heading);
  noStroke();
  fill(143, 250, 255);
  triangle(9, 0, -5, -4, -5, 4);
  pop();
  fill(108, 235, 246, 75);
  circle(centerX, centerY + 7, 4);
  pop();
}

// Dessine un avion militaire vu du dessus, orienté vers la droite. Refonte inspirée par la référence fournie.
function drawAircraft(ctx, ship, allied) {
  const scale = ship.r_pourDessin;
  const colors = allied
    ? { wing: "#2ea8ff", light: "#9fe6ff", dark: "#0f3a52", mark: "#cfeffd", glow: "#5fd8ff" }
    : { wing: "#8a4b1e", light: "#ffd78a", dark: "#5b2a16", mark: "#ffd2a6", glow: "#ffb86b" };

  ctx.save();
  ctx.scale(scale / 10, scale / 10);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Engine glow (twin engines) — stronger, pulsing with enginePower.
  const exhaustPulse = 0.8 + 0.3 * Math.sin(frameCount * 0.3 + ship.pos.x);
  const engineStrength = Math.max(0.35, Math.min(1.0, ship.enginePower || 0));
  const glowRadius = 5.5 + 6 * engineStrength;
  const glowColorCenter = allied ? 'rgba(170,255,255,' : 'rgba(255,230,180,';
  const glowColorMid = allied ? 'rgba(95,216,255,' : 'rgba(255,140,90,';

  const g = ctx.createRadialGradient(-14, 0, 0.1, -14, 0, glowRadius);
  g.addColorStop(0, (glowColorCenter) + (0.95 * engineStrength) + ')');
  g.addColorStop(0.25, (glowColorMid) + (0.7 * engineStrength) + ')');
  g.addColorStop(1, (allied ? 'rgba(60,160,255,0)' : 'rgba(255,60,90,0)'));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(-14, 0, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  // Exhaust cones
  ctx.globalAlpha = 0.9;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    const len = 8 + 18 * engineStrength * exhaustPulse;
    ctx.moveTo(-12, side * 1.4);
    ctx.lineTo(-12 - len, side * (2.5 + engineStrength * 1.6));
    ctx.lineTo(-12, side * 3.6);
    ctx.closePath();
    ctx.fillStyle = allied ? 'rgba(100,220,255,' + (0.6 + 0.3 * engineStrength) + ')' : 'rgba(255,160,120,' + (0.55 + 0.35 * engineStrength) + ')';
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  // Roulis visual
  ctx.rotate(ship.turnBank * 0.08);

  // Fuselage — elongated nose
  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.quadraticCurveTo(6, -2.6, -2, -2.6);
  ctx.lineTo(-8, -3.2);
  ctx.lineTo(-18, -6.2);
  ctx.lineTo(-20, -2.4);
  ctx.lineTo(-20, 2.4);
  ctx.lineTo(-18, 6.2);
  ctx.lineTo(-8, 3.2);
  ctx.lineTo(-2, 2.6);
  ctx.quadraticCurveTo(6, 2.6, 22, 0);
  ctx.closePath();
  const bodyGrad = ctx.createLinearGradient(22, 0, -18, 0);
  bodyGrad.addColorStop(0, colors.light);
  bodyGrad.addColorStop(0.6, colors.wing);
  bodyGrad.addColorStop(1, colors.dark);
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.lineWidth = 0.7;
  ctx.strokeStyle = colors.dark;
  ctx.stroke();

  // Delta wings
  ctx.beginPath();
  ctx.moveTo(6, -0.6);
  ctx.lineTo(-6, -9.6);
  ctx.lineTo(-16, -9.6);
  ctx.lineTo(-8, -0.6);
  ctx.closePath();
  const wingG = ctx.createLinearGradient(6, -4, -12, -8);
  wingG.addColorStop(0, colors.light);
  wingG.addColorStop(0.55, colors.wing);
  wingG.addColorStop(1, colors.dark);
  ctx.fillStyle = wingG;
  ctx.fill();
  ctx.strokeStyle = colors.dark;
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(6, 0.6);
  ctx.lineTo(-6, 9.6);
  ctx.lineTo(-16, 9.6);
  ctx.lineTo(-8, 0.6);
  ctx.closePath();
  ctx.fillStyle = wingG;
  ctx.fill();
  ctx.stroke();

  // Twin vertical tails (subtle top fins)
  ctx.beginPath();
  ctx.moveTo(-12, -3.6);
  ctx.lineTo(-9, -8.6);
  ctx.lineTo(-6, -7.4);
  ctx.lineTo(-10, -3.2);
  ctx.closePath();
  ctx.fillStyle = colors.wing;
  ctx.fill();
  ctx.strokeStyle = colors.dark;
  ctx.lineWidth = 0.45;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-12, 3.6);
  ctx.lineTo(-9, 8.6);
  ctx.lineTo(-6, 7.4);
  ctx.lineTo(-10, 3.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cockpit glass
  ctx.beginPath();
  ctx.ellipse(8, 0, 4.2, 2.6, 0, 0, Math.PI * 2);
  const glass = ctx.createLinearGradient(6, -2, 10, 2);
  glass.addColorStop(0, 'rgba(255,255,255,0.95)');
  glass.addColorStop(0.25, 'rgba(180,240,255,0.9)');
  glass.addColorStop(1, 'rgba(70,140,200,0.26)');
  ctx.fillStyle = glass;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 0.35;
  ctx.stroke();

  // Small missiles under wings
  ctx.fillStyle = allied ? '#aeefff' : '#ffd2a6';
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(-2, side * 6);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-6, side * 2);
    ctx.lineTo(-14, side * 2);
    ctx.lineTo(-14, side * -2);
    ctx.lineTo(-6, side * -2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 0.25;
    ctx.stroke();
    ctx.restore();
  }

  // Subtle highlight lines and paneling
  ctx.beginPath();
  ctx.moveTo(12, -1.1);
  ctx.lineTo(-2, -2.0);
  ctx.moveTo(12, 1.1);
  ctx.lineTo(-2, 2.0);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 0.35;
  ctx.stroke();

  // Small glow rim
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(0.5, 1.2), 0, Math.PI * 2);
  ctx.strokeStyle = allied ? 'rgba(95,216,255,0.06)' : 'rgba(255,150,80,0.06)';
  ctx.lineWidth = 0.9;
  ctx.stroke();

  ctx.restore();
}

// Regroupe les halos, les hexagones et les contours pour limiter les changements d'état Canvas.
function drawCrystals() {
  const ctx = drawingContext;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < crystals.length; i++) {
    const crystal = crystals[i];
    if (!crystal.alive) continue;
    const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.055 + crystal.phase);
    const glowRadius = crystal.r * (2.3 + pulse * 0.45);
    const halo = ctx.createRadialGradient(
      crystal.pos.x,
      crystal.pos.y,
      crystal.r * 0.15,
      crystal.pos.x,
      crystal.pos.y,
      glowRadius,
    );
    halo.addColorStop(0, `rgba(158, 250, 255, ${0.42 + pulse * 0.18})`);
    halo.addColorStop(0.3, `rgba(48, 211, 255, ${0.22 + pulse * 0.09})`);
    halo.addColorStop(1, "rgba(48, 211, 255, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(crystal.pos.x, crystal.pos.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";

  for (let i = 0; i < crystals.length; i++) {
    const crystal = crystals[i];
    if (!crystal.alive) continue;
    const rotation = frameCount * 0.012 + crystal.phase;
    const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.055 + crystal.phase);
    ctx.save();
    ctx.translate(crystal.pos.x, crystal.pos.y);
    ctx.rotate(rotation);
    const gem = ctx.createLinearGradient(-crystal.r, -crystal.r, crystal.r, crystal.r);
    gem.addColorStop(0, "#d9ffff");
    gem.addColorStop(0.35, "#68edff");
    gem.addColorStop(1, "#1675dc");
    ctx.beginPath();
    for (let vertex = 0; vertex < 6; vertex++) {
      const x = CRYSTAL_VERTEX_COS[vertex] * crystal.r;
      const y = CRYSTAL_VERTEX_SIN[vertex] * crystal.r;
      if (vertex === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = gem;
    ctx.shadowColor = "#42dcff";
    ctx.shadowBlur = 12 + pulse * 7;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(222, 255, 255, 0.95)";
    ctx.lineWidth = 0.85;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (const vertex of [0, 2, 4]) {
      ctx.lineTo(CRYSTAL_VERTEX_COS[vertex] * crystal.r, CRYSTAL_VERTEX_SIN[vertex] * crystal.r);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(223, 255, 255, 0.22)";
    ctx.fill();
    ctx.strokeStyle = "rgba(220, 255, 255, 0.5)";
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.fillStyle = "#f4ffff";
    ctx.globalAlpha = 0.72 + pulse * 0.28;
    ctx.beginPath();
    ctx.arc(-crystal.r * 0.24, -crystal.r * 0.28, Math.max(0.55, crystal.r * 0.13), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.setLineDash([2, 5]);
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = "rgba(132, 235, 255, 0.62)";
  ctx.shadowColor = "#49dfff";
  ctx.shadowBlur = 5;
  ctx.lineDashOffset = -frameCount * 0.12;
  ctx.beginPath();
  for (let i = 0; i < crystals.length; i++) {
    const crystal = crystals[i];
    if (!crystal.alive) continue;
    ctx.moveTo(crystal.pos.x + crystal.r * 1.55, crystal.pos.y);
    ctx.arc(crystal.pos.x, crystal.pos.y, crystal.r * 1.55, 0, Math.PI * 2);
  }
  ctx.stroke();
  ctx.restore();
  ctx.restore();

  if (Vehicle.debug) {
    noFill();
    stroke(65, 228, 255, 60);
    for (let i = 0; i < crystals.length; i++) {
      const crystal = crystals[i];
      if (crystal.alive) circle(crystal.pos.x, crystal.pos.y, crystal.visionRadius * 2);
    }
  }
}

// Reconstruit les entités de la partie sans modifier Vehicle.
function resetGame(startingStage = 1) {
  GameRules.applyDifficulty(GAME_CONFIG, GAME_CONFIG.difficulty || "pilote");
  score = 0;
  lives = GAME_CONFIG.initialLives;
  ammo = GAME_CONFIG.missileCapacity;
  reloadTimer = 0;
  crystalRespawnTimer = 0;
  scoreCrystalRespawnTimer = 0;
  autoFire = false;
  antiGravity = false;
  Vehicle.debug = false;
  gameOver = false;
  gameStarted = false;
  gamePaused = false;
  awaitingNextStage = false;
  panelsVisible = false;
  panelsVisibleBeforePause = false;
  gameOverReason = "";
  stage = startingStage;
  stageProgress = 0;
  gameWon = false;
  stageBannerTimer = 0;
  stageBannerText = "";
  wave = 1;
  waveTimer = GAME_CONFIG.waveDurationFrames;
  waveBannerTimer = 0;
  shieldFrames = 0;
  shieldCooldownFrames = 0;
  mouseTargetPosition = null;
  manualInputMode = "mouse";
  keyboardTargetPosition = null;
  missiles = [];
  obstacles = createCelestialBodies();
  alliedShips = [];
  player = new Ship(width * 0.13, height * 0.78, "player");
  patrolPath = PathFollowing.createOrbitPath(width, height);
  moveOutsideHazards(player);
  blackHoles = createBlackHolePair([player]);
  hunters = [];
  boss = null;
  crystals = [];

  for (let i = 0; i < GAME_CONFIG.crystalCount; i++) {
    spawnCrystal();
  }
  spawnCrystal("score");
  for (let i = 0; i < GAME_CONFIG.hunterCount; i++) {
    const hunterPosition = findOpenPosition([player, ...blackHoles, ...hunters, ...crystals], 70);
    hunters.push(new Hunter(hunterPosition.x, hunterPosition.y));
  }
  applyFleetSpeed();
}

// Démarre une nouvelle partie et lance le chronomètre de la première vague.
function startNewGame(startingStage = 1) {
  if (!Number.isInteger(startingStage) || startingStage < 1 || startingStage > GameRules.STAGES.length) {
    throw new RangeError("Le niveau de départ doit être compris entre 1 et 20.");
  }
  resetGame(startingStage);
  gameStarted = true;
  spawnStageBoss();
  stageBannerText = `ÉTAPE ${String(stage).padStart(2, "0")} · ${GameRules.STAGES[stage - 1].name}`;
  stageBannerTimer = 150;
}

function restartCurrentStage() {
  if (!gameOver) return false;
  startNewGame(stage);
  return true;
}

function returnToBriefing() {
  if (!gameOver) return false;
  resetGame();
  return true;
}

function startNextStage() {
  if (!awaitingNextStage || gameOver || stage >= GameRules.STAGES.length) return false;
  awaitingNextStage = false;
  stage++;
  stageProgress = 0;
  const nextObjective = GameRules.STAGES[stage - 1];
  stageBannerText = `ÉTAPE ${String(stage).padStart(2, "0")} · ${nextObjective.name}`;
  stageBannerTimer = 180;
  waveBannerTimer = 0;
  applyChallengePressure();
  spawnStageBoss();
  return true;
}

function spawnStageBoss() {
  const objective = GameRules.STAGES[stage - 1];
  boss = null;
  if (objective.type !== "boss") return;
  const position = findOpenPosition([player, ...blackHoles, ...alliedShips, ...hunters, ...crystals], 90);
  boss = new Boss(position.x, position.y, GAME_CONFIG.bossHealth + objective.bossHealthBonus);
  boss.applySpeedMultiplier(GAME_CONFIG.speedMultiplier);
}

// Crée le soleil, les planètes et les astéroïdes fixes qui structurent l'arène.
function createCelestialBodies() {
  const size = Math.min(width, height);
  return [
    new Obstacle(width * 0.5, height * 0.5, constrain(size * 0.13, 38, 62), "soleil", "#ff9b3e"),
    new Obstacle(width * 0.38, height * 0.25, constrain(size * 0.075, 25, 39), "saturne", "#b7a17b"),
    new Obstacle(width * 0.8, height * 0.7, constrain(size * 0.15, 48, 78), "planete", "#315d91"),
    new Asteroid(width * 0.11, height * 0.48, constrain(size * 0.023, 8, 14), 17),
    new Asteroid(width * 0.72, height * 0.13, constrain(size * 0.027, 9, 16), 29),
    new Asteroid(width * 0.89, height * 0.37, constrain(size * 0.02, 8, 12), 43),
  ];
}

function createBlackHolePair(entities) {
  const shortSide = Math.min(width, height);
  const clearance = Math.min(120, Math.max(70, shortSide * 0.25));
  const minimumPairDistance = Math.max(120, Math.min(260, shortSide * 0.45));
  const randomPosition = (minX, maxX, minY, maxY) =>
    createVector(random(minX, maxX), random(minY, maxY));
  let entry = null;
  let exit = null;
  for (let attempt = 0; attempt < 60 && !exit; attempt++) {
    entry = GameRules.findSafeTeleportPosition(
      width, height, entities, obstacles, randomPosition, clearance, null, 0,
    );
    if (!entry) break;
    exit = GameRules.findSafeTeleportPosition(
      width, height, [...entities, { pos: entry, r: 20 }], obstacles,
      randomPosition, clearance, entry, minimumPairDistance,
    );
  }
  if (!entry) throw new RangeError("Impossible de placer un trou noir loin des corps célestes.");
  if (!exit) throw new RangeError("Impossible de placer deux trous noirs éloignés des corps célestes.");

  const first = new BlackHole(entry.x, entry.y, "A");
  const second = new BlackHole(exit.x, exit.y, "B");
  first.connect(second);
  second.connect(first);
  return [first, second];
}

// Compte les planètes en excluant le soleil et les astéroïdes.
function countPlanets() {
  let count = 0;
  for (let i = 0; i < obstacles.length; i++) {
    if (obstacles[i].type !== "soleil" && obstacles[i].type !== "asteroide") count++;
  }
  return count;
}

// Compte les astéroïdes pour exposer l'état réel de l'arène dans le HUD.
function countAsteroids() {
  let count = 0;
  for (let i = 0; i < obstacles.length; i++) {
    if (obstacles[i].type === "asteroide") count++;
  }
  return count;
}

// Trouve une position éloignée des corps et des entités déjà placées.
function findOpenPosition(entities, clearance) {
  let candidate = createVector(width * 0.1, height * 0.1);
  for (let attempt = 0; attempt < 90; attempt++) {
    candidate = createVector(random(20, Math.max(21, width - 20)), random(20, Math.max(21, height - 20)));
    let open = true;
    for (let i = 0; i < obstacles.length; i++) {
      if (p5.Vector.dist(candidate, obstacles[i].pos) < obstacles[i].r + clearance) {
        open = false;
        break;
      }
    }
    for (let i = 0; open && i < entities.length; i++) {
      if (entities[i].alive !== false && p5.Vector.dist(candidate, entities[i].pos) < clearance + entities[i].r) open = false;
    }
    if (open) return candidate;
  }
  return candidate;
}

// Déplace le vaisseau de départ hors d'une zone céleste si nécessaire.
function moveOutsideHazards(ship) {
  for (let i = 0; i < obstacles.length; i++) {
    const obstacle = obstacles[i];
    if (p5.Vector.dist(ship.pos, obstacle.pos) < obstacle.r + ship.r * 2) {
      const away = p5.Vector.sub(ship.pos, obstacle.pos);
      if (away.magSq() === 0) away.set(1, 0);
      away.setMag(obstacle.r + ship.r * 2);
      ship.pos = p5.Vector.add(obstacle.pos, away);
    }
  }
  ship.pos.x = constrain(ship.pos.x, 0, width);
  ship.pos.y = constrain(ship.pos.y, 0, height);
}

// Fait déambuler les cristaux ou les fait fuir quand un avion blanc approche.
function updateCrystals() {
  const whiteShips = [player, ...alliedShips];
  for (let i = 0; i < crystals.length; i++) {
    const crystal = crystals[i];
    if (!crystal.alive) continue;
    crystal.steer(whiteShips);
    crystal.update();
  }
}

// Charge les chasseurs de protéger les cristaux et d'intercepter les alliés proches.
function updateHunters() {
  for (let i = 0; i < hunters.length; i++) {
    const hunter = hunters[i];
    if (!hunter.alive) continue;
    const target = hunter.chooseTarget(player, crystals, alliedShips);
    hunter.steer(target, hunters, obstacles, antiGravity);
    hunter.update();
  }

}

function updateBoss() {
  if (!boss || !boss.alive) return;
  boss.steer(player, [boss, ...hunters], obstacles, antiGravity);
  boss.update();
}

// Dirige le joueur au clavier, à la souris ou vers son objectif automatique.
function updatePlayer() {
  if (manualControl) {
    if (manualInputMode === "keyboard") {
      if (!keyboardTargetPosition) keyboardTargetPosition = player.pos.copy();
      const horizontal = Number(keyIsDown(RIGHT_ARROW)) - Number(keyIsDown(LEFT_ARROW));
      const vertical = Number(keyIsDown(DOWN_ARROW)) - Number(keyIsDown(UP_ARROW));
      const elapsed = Number.isFinite(deltaTime) && deltaTime > 0 ? deltaTime : 1000 / 60;
      const frameScale = Math.min(elapsed / (1000 / 60), 2);
      const directionLength = Math.hypot(horizontal, vertical) || 1;
      const movement = 3.5 * GAME_CONFIG.speedMultiplier * frameScale;
      keyboardTargetPosition.x = Math.max(0, Math.min(width, keyboardTargetPosition.x + horizontal / directionLength * movement));
      keyboardTargetPosition.y = Math.max(0, Math.min(height, keyboardTargetPosition.y + vertical / directionLength * movement));
      player.steerToPointer(keyboardTargetPosition);
    } else {
      player.steerToPointer(createVector(mouseX, mouseY));
    }
  } else {
    const target = player.chooseCrystalTarget(crystals);
    player.steer(target, [player], obstacles, antiGravity, hunters, GAME_CONFIG.flightMode, patrolPath);
  }
  player.update();
}

// Dirige les avions blancs ajoutés vers les cristaux et leur attribue leurs captures.
function updateAlliedShips() {
  const neighbors = [player, ...alliedShips];
  for (let i = 0; i < alliedShips.length; i++) {
    const ally = alliedShips[i];
    if (!ally.alive) continue;
    const target = ally.chooseCrystalTarget(crystals);
    ally.steer(target, neighbors, obstacles, antiGravity, hunters, GAME_CONFIG.flightMode, patrolPath);
    ally.update();
    if (!target) continue;
    collectCrystal(ally, target);
  }
}

// Fait poursuivre leur cible aux missiles et supprime ceux qui expirent ou touchent.
function updateMissiles() {
  for (let i = missiles.length - 1; i >= 0; i--) {
    const missile = missiles[i];
    missile.steerToTarget(obstacles);
    missile.update();
    missile.life--;
    let remove = missile.life <= 0
      || missile.pos.x < -20 || missile.pos.x > width + 20
      || missile.pos.y < -20 || missile.pos.y > height + 20;

    for (let j = 0; !remove && j < obstacles.length; j++) {
      if (GameRules.distanceSquared(missile, obstacles[j]) < (missile.r + obstacles[j].r) ** 2) remove = true;
    }
    if (!remove && missile.target && missile.target.alive && GameRules.overlaps(missile, missile.target)) {
      const target = missile.target;
      if (missile.hitTarget()) {
        if (target.isBoss) {
          stageProgress = target.health;
          if (!target.alive) score += 250;
        } else {
          score += 50;
          if (GameRules.STAGES[stage - 1].type === "hunters") stageProgress++;
        }
      }
      remove = true;
    }
    if (remove) missiles.splice(i, 1);
  }
}

// Termine la partie si le joueur touche un corps céleste ou un chasseur rouge.
function updateCollisions() {
  for (const blackHole of blackHoles) {
    if (blackHole.cooldownFrames === 0 && blackHole.contains(player)) {
      blackHole.enter(player);
      break;
    }
  }
  const hit = GameRules.resolvePlayerCollision(player, hunters, obstacles, shieldFrames, boss);
  if (hit) {
    lives = hit.lives;
    player.alive = false;
    gameOver = hit.gameOver;
    gameOverReason = hit.type;
    return;
  }
  if (shieldFrames > 0) repelShieldContacts();

  for (let i = 0; i < crystals.length; i++) {
    const crystal = crystals[i];
    collectCrystal(player, crystal);
  }

}

function collectCrystal(ship, crystal) {
  if (!crystal.alive || !GameRules.overlaps(ship, crystal)) return false;
  const reward = GameRules.crystalReward(crystal, ammo, GAME_CONFIG.missileCapacity);
  crystal.alive = false;
  const previousAmmo = ammo;
  ammo = reward.ammo;
  score += reward.score;
  const objectiveType = GameRules.STAGES[stage - 1].type;
  if (reward.bonus && objectiveType === "bonus") stageProgress++;
  if (objectiveType === "crystals" && !reward.bonus) stageProgress++;
  if (crystal.type === "score") {
    scoreCrystalRespawnTimer = GAME_CONFIG.scoreCrystalRespawnFrames;
  }
  if (reward.shield) {
    shieldFrames = Math.max(shieldFrames, GAME_CONFIG.shieldDurationFrames);
    shieldCooldownFrames = 0;
  }
  if (ammo > previousAmmo) reloadTimer = 0;
  crystalRespawnTimer = Math.max(crystalRespawnTimer, GAME_CONFIG.crystalRespawnFrames);
  return true;
}

// Repousse les chasseurs qui touchent un avion protégé sans déplacer directement les véhicules.
function repelShieldContacts() {
  for (let i = -1; i < alliedShips.length; i++) {
    const whiteShip = i < 0 ? player : alliedShips[i];
    const hunter = GameRules.firstFleetContact(whiteShip, hunters);
    if (!hunter) continue;
    repelContact(whiteShip, hunter);
  }
}

function repelContact(whiteShip, hunter) {
  const direction = p5.Vector.sub(whiteShip.pos, hunter.pos);
  if (direction.magSq() === 0) direction.set(1, 0);
  direction.setMag(whiteShip.maxForce * 5);
  whiteShip.applyForce(direction);
  hunter.applyForce(p5.Vector.mult(direction, -1));
}

// Active le bouclier d'escadrille si son temps de recharge est terminé.
function activateShield() {
  if (!gameStarted || gameOver || shieldCooldownFrames > 0) return false;
  shieldFrames = GAME_CONFIG.shieldDurationFrames;
  shieldCooldownFrames = GAME_CONFIG.shieldCooldownFrames;
  return true;
}

// Décompte la durée active et le rechargement du bouclier.
function updateShieldTimers() {
  if (shieldFrames > 0) shieldFrames--;
  if (shieldCooldownFrames > 0) shieldCooldownFrames--;
}

// Remplace périodiquement les cristaux collectés ou interceptés par l'ennemi.
function updateRespawns() {
  for (let i = crystals.length - 1; i >= 0; i--) {
    if (!crystals[i].alive) crystals.splice(i, 1);
  }
  const hasScoreCrystal = crystals.some(crystal => crystal.type === "score");
  if (!hasScoreCrystal) {
    if (scoreCrystalRespawnTimer > 0) scoreCrystalRespawnTimer--;
    else spawnCrystal("score");
  }
  const living = crystals.filter(crystal => crystal.type !== "score").length;
  const stageObjective = GameRules.STAGES[stage - 1];
  if (stageObjective.type === "bonus" && stageProgress < stageObjective.goal) {
    let availableBonuses = 0;
    for (let i = 0; i < crystals.length; i++) {
      if (crystals[i].alive && crystals[i].type !== "normal") availableBonuses++;
    }
    if (availableBonuses < stageObjective.goal - stageProgress) {
      spawnCrystal(random() < 0.5 ? "ammo" : "shield");
      crystalRespawnTimer = GAME_CONFIG.crystalRespawnFrames;
      return;
    }
  }
  if (living >= GAME_CONFIG.crystalCount) return;
  if (crystalRespawnTimer > 0) {
    crystalRespawnTimer--;
    return;
  }
  spawnCrystal();
  crystalRespawnTimer = GAME_CONFIG.crystalRespawnFrames;
}

// Place un cristal dans une zone libre de la scène.
function spawnCrystal(type) {
  const position = findOpenPosition([player, ...blackHoles, ...alliedShips, ...hunters, ...crystals], 25);
  const crystalType = type || (random() < 0.1 ? (random() < 0.5 ? "ammo" : "shield") : "normal");
  crystals.push(new Crystal(position.x, position.y, crystalType));
}

// Gère le rechargement et le tir automatique.
function updateWeapons() {
  if (reloadTimer > 0) {
    reloadTimer--;
    if (reloadTimer === 0) ammo = GAME_CONFIG.missileCapacity;
  }
  if (!autoFire || frameCount % GAME_CONFIG.autoFireDelay !== 0) return;
  const target = closestHunter(player);
  if (target) fireMissile(target);
}

// Déclenche une nouvelle vague toutes les 25 secondes et augmente la pression ennemie.
function updateWaves() {
  if (waveBannerTimer > 0) waveBannerTimer--;
  if (stageBannerTimer > 0) stageBannerTimer--;
  waveTimer--;
  if (waveTimer > 0) return;

  wave++;
  waveTimer = GAME_CONFIG.waveDurationFrames;
  waveBannerTimer = 150;
  applyChallengePressure();
}

function applyChallengePressure() {
  hunters = hunters.filter(hunter => hunter.alive);
  const progression = wave + stage - 2;
  const difficulty = Math.min(
    GAME_CONFIG.maxWaveSpeedMultiplier,
    1 + progression * GAME_CONFIG.waveSpeedIncrease,
  );
  for (let i = 0; i < hunters.length; i++) hunters[i].setWaveDifficulty(difficulty);

  const desiredCount = Math.min(
    GAME_CONFIG.maxWaveHunters,
    GAME_CONFIG.hunterCount + progression * GAME_CONFIG.waveEnemyIncrease,
  );
  while (countLivingShips(hunters) < desiredCount) {
    const position = findOpenPosition([player, ...blackHoles, ...alliedShips, ...hunters, ...crystals], 70);
    const hunter = new Hunter(position.x, position.y);
    hunter.setWaveDifficulty(difficulty);
    hunters.push(hunter);
  }
}

// Charge le record local sans bloquer le jeu si le navigateur interdit le stockage.
function loadBestScore() {
  try {
    const key = `${BEST_SCORE_KEY}-${GAME_CONFIG.difficulty}`;
    const stored = localStorage.getItem(key)
      ?? (GAME_CONFIG.difficulty === "pilote" ? localStorage.getItem(BEST_SCORE_KEY) : null);
    return Math.max(0, Number(stored) || 0);
  } catch (error) {
    console.warn("Le record ne peut pas être lu depuis le stockage local.", error);
    return 0;
  }
}

// Sauvegarde le score uniquement lorsqu'il dépasse le meilleur score connu.
function saveBestScore() {
  if (score <= bestScore) return;
  bestScore = score;
  try {
    localStorage.setItem(`${BEST_SCORE_KEY}-${GAME_CONFIG.difficulty}`, String(bestScore));
    if (GAME_CONFIG.difficulty === "pilote") {
      localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
    }
  } catch (error) {
    console.warn("Le nouveau record ne peut pas être sauvegardé localement.", error);
  }
}

// Tire un missile sur le chasseur vivant le plus proche.
function fireMissile(target = closestHunter(player)) {
  if (ammo <= 0 || reloadTimer > 0 || !target) return false;
  missiles.push(new Missile(player.pos.x, player.pos.y, target));
  ammo--;
  if (ammo === 0) reloadTimer = GAME_CONFIG.reloadFrames;
  return true;
}

// Renvoie le chasseur le plus proche du vaisseau donné.
function closestHunter(ship) {
  if (boss && boss.alive) return boss;
  let nearest = null;
  let nearestDistance = Infinity;
  for (let i = 0; i < hunters.length; i++) {
    const hunter = hunters[i];
    if (!hunter.alive) continue;
    const distance = GameRules.distanceSquared(ship, hunter);
    if (distance < nearestDistance) {
      nearest = hunter;
      nearestDistance = distance;
    }
  }
  return nearest;
}

// Fait avancer les objectifs propres à chaque étape et déclenche l'extraction finale.
function updateGameState() {
  if (score > bestScore) saveBestScore();
  if (GameRules.STAGES[stage - 1].type === "survive") stageProgress += 1 / 60;
  const currentObjective = GameRules.getStageObjective(
    stage,
    stageProgress,
    boss && boss.alive ? boss.health : 0,
    boss ? boss.maxHealth : 0,
  );
  if (currentObjective.completed) {
    if (stage === GameRules.STAGES.length) {
      gameWon = true;
      gameOver = true;
      return;
    }
    awaitingNextStage = true;
  }
  if (lives <= 0) {
    gameOver = true;
  }
}

// Retourne le message de fin ou une chaîne vide pendant la partie.
function getEndMessage() {
  if (!gameOver) return "";
  if (gameWon) return "BOSS DÉTRUIT — SECTEUR SÉCURISÉ";
  if (gameOverReason === "planet") return "VOUS AVEZ HEURTÉ UNE PLANÈTE";
  if (gameOverReason === "boss") return "LE BOSS A DÉTRUIT VOTRE AVION";
  return "UN CHASSEUR ROUGE A TOUCHÉ VOTRE AVION";
}

// Connecte le curseur de vitesse et les boutons d'ajout des deux escadrilles.
function setupControlPanel() {
  const speedSlider = document.getElementById("speed-control");
  const crystalCountSlider = document.getElementById("crystal-count-control");
  const protectionRadiusSlider = document.getElementById("protection-radius-control");
  const flightModeControl = document.getElementById("flight-mode-control");
  const controlPanel = document.querySelector(".control-panel");
  const controlToggle = document.getElementById("control-toggle");
  const whiteButton = document.getElementById("add-white-plane");
  const redButton = document.getElementById("add-red-plane");
  const restartButton = document.getElementById("restart-button");
  const restartFirstLevelButton = document.getElementById("restart-first-level-button");
  const briefingButton = document.getElementById("briefing-button");
  const startButton = document.getElementById("start-button");
  const nextStageButton = document.getElementById("next-stage-button");
  const shieldButton = document.getElementById("shield-button");
  const pauseButton = document.getElementById("pause-button");
  const resumeButton = document.getElementById("resume-button");
  const panelsToggle = document.getElementById("panels-toggle");
  const manualControlButton = document.getElementById("manual-control-button");
  const difficultyOptions = document.querySelectorAll(".difficulty-option");
  speedSlider.value = String(GAME_CONFIG.speedMultiplier);
  crystalCountSlider.value = String(GAME_CONFIG.crystalCount);
  protectionRadiusSlider.value = String(GAME_CONFIG.crystalProtectionRadius);
  flightModeControl.value = GAME_CONFIG.flightMode;
  updateSpeedLabel();
  updateParameterLabels();
  controlToggle.addEventListener("click", () => {
    const collapsed = controlPanel.classList.toggle("is-collapsed");
    controlToggle.setAttribute("aria-expanded", String(!collapsed));
    controlToggle.setAttribute(
      "aria-label",
      collapsed ? "Afficher les commandes" : "Masquer les commandes",
    );
  });
  speedSlider.addEventListener("input", () => {
    setSpeedMultiplier(Number(speedSlider.value));
  });
  crystalCountSlider.addEventListener("input", () => {
    setCrystalCount(Number(crystalCountSlider.value));
  });
  protectionRadiusSlider.addEventListener("input", () => {
    GAME_CONFIG.crystalProtectionRadius = Number(protectionRadiusSlider.value);
    updateParameterLabels();
  });
  flightModeControl.addEventListener("change", () => {
    GAME_CONFIG.flightMode = flightModeControl.value;
  });
  whiteButton.addEventListener("click", () => addAircraft("ally"));
  redButton.addEventListener("click", () => addAircraft("enemy"));
  restartButton.addEventListener("click", restartCurrentStage);
  restartFirstLevelButton.addEventListener("click", () => startNewGame(1));
  briefingButton.addEventListener("click", returnToBriefing);
  startButton.addEventListener("click", () => startNewGame());
  nextStageButton.addEventListener("click", startNextStage);
  updateDifficultyDescription();
  difficultyOptions.forEach(button => {
    button.addEventListener("click", () => setDifficulty(button.dataset.difficulty));
  });
  shieldButton.addEventListener("click", activateShield);
  manualControlButton.addEventListener("click", toggleManualControl);
  pauseButton.addEventListener("click", togglePause);
  resumeButton.addEventListener("click", togglePause);
  panelsToggle.addEventListener("click", toggleGamePanels);
}

function toggleGamePanels() {
  if (!gameStarted || gameOver) return false;
  if (gamePaused) return true;
  panelsVisible = !panelsVisible;
  return panelsVisible;
}

function loadDifficulty() {
  try {
    const savedDifficulty = localStorage.getItem(DIFFICULTY_KEY);
    return GameRules.getDifficulty(savedDifficulty) ? savedDifficulty : "pilote";
  } catch (error) {
    console.warn("Le réglage de difficulté ne peut pas être lu.", error);
    return "pilote";
  }
}

function setDifficulty(id) {
  if (gameStarted && !gameOver) return false;
  const difficulty = GameRules.applyDifficulty(GAME_CONFIG, id);
  bestScore = loadBestScore();
  try {
    localStorage.setItem(DIFFICULTY_KEY, id);
  } catch (error) {
    console.warn("Le réglage de difficulté ne peut pas être sauvegardé.", error);
  }
  updateDifficultyDescription();
  if (!gameStarted) resetGame();
  return difficulty;
}

function updateDifficultyDescription() {
  const difficulty = GameRules.getDifficulty(GAME_CONFIG.difficulty);
  document.querySelectorAll(".difficulty-option").forEach(button => {
    const selected = button.dataset.difficulty === GAME_CONFIG.difficulty;
    button.setAttribute("aria-pressed", String(selected));
    button.classList.toggle("is-selected", selected);
  });
  document.getElementById("difficulty-detail").textContent = difficulty.description;
}

function togglePause() {
  if (!gameStarted || gameOver || awaitingNextStage) return false;
  if (gamePaused) {
    gamePaused = false;
    panelsVisible = panelsVisibleBeforePause;
  } else {
    panelsVisibleBeforePause = panelsVisible;
    panelsVisible = true;
    gamePaused = true;
  }
  return gamePaused;
}

// Bascule entre le pilotage autonome et les commandes clavier.
function toggleManualControl() {
  manualControl = !manualControl;
  mouseTargetPosition = null;
  setManualInputMode("mouse", true);
}

function setManualInputMode(mode, forceReset = false) {
  if (manualInputMode === mode && !forceReset) return;
  manualInputMode = mode;
  keyboardTargetPosition = mode === "keyboard" && player ? player.pos.copy() : null;
  if (!player) return;
  player.pointerSpeed = 0;
  player.pointerSpeedMultiplier = 1;
  player.lastPointerPosition = null;
  player.maxSpeed = player.baseMaxSpeed * player.speedMultiplier;
}

// Ajuste la population de cristaux immédiatement selon le réglage.
function setCrystalCount(value) {
  GAME_CONFIG.crystalCount = Math.round(value);
  crystals = crystals.filter(crystal => crystal.alive);
  while (crystals.length > GAME_CONFIG.crystalCount) crystals.pop();
  while (crystals.length < GAME_CONFIG.crystalCount) spawnCrystal();
  updateParameterLabels();
}

// Affiche les valeurs actives des paramètres réglables.
function updateParameterLabels() {
  document.getElementById("crystal-count-value").textContent = String(GAME_CONFIG.crystalCount);
  document.getElementById("protection-radius-value").textContent = `${GAME_CONFIG.crystalProtectionRadius} px`;
}

// Synchronise le curseur, la valeur manuelle et la vitesse de toute la flotte.
function setSpeedMultiplier(value) {
  const min = 0.5;
  const max = 2;
  const multiplier = Math.min(max, Math.max(min, Math.round(value * 10) / 10));
  GAME_CONFIG.speedMultiplier = multiplier;
  document.getElementById("speed-control").value = String(multiplier);
  updateSpeedLabel();
  applyFleetSpeed();
}

// Applique le facteur de vitesse aux avions déjà présents sans modifier leur maxForce.
function applyFleetSpeed() {
  for (let i = 0; i < alliedShips.length; i++) alliedShips[i].applySpeedMultiplier(GAME_CONFIG.speedMultiplier);
  for (let i = 0; i < hunters.length; i++) hunters[i].applySpeedMultiplier(GAME_CONFIG.speedMultiplier);
  if (player) player.applySpeedMultiplier(GAME_CONFIG.speedMultiplier);
  for (let i = 0; i < missiles.length; i++) missiles[i].applySpeedMultiplier(GAME_CONFIG.speedMultiplier);
}

// Crée un nouvel avion dans une position libre, sans le placer au curseur.
function addAircraft(faction) {
  if (!gameStarted || gameOver) return false;
  const fleet = faction === "enemy" ? hunters : alliedShips;
  const maximumFleetSize = faction === "enemy"
    ? GAME_CONFIG.hunterCount + GAME_CONFIG.maxAddedAircraftPerSide
    : GAME_CONFIG.maxAddedAircraftPerSide;
  if (fleet.length >= maximumFleetSize) return false;
  const position = findOpenPosition([player, ...blackHoles, ...alliedShips, ...hunters, ...crystals], 55);
  const aircraft = faction === "enemy"
    ? new Hunter(position.x, position.y)
    : new Ship(position.x, position.y, "ally");
  if (faction === "enemy") {
    aircraft.setWaveDifficulty(Math.min(
      GAME_CONFIG.maxWaveSpeedMultiplier,
      1 + (wave - 1) * GAME_CONFIG.waveSpeedIncrease,
    ));
  }
  aircraft.vel = p5.Vector.random2D().mult(aircraft.maxSpeed * 0.35);
  aircraft.applySpeedMultiplier(GAME_CONFIG.speedMultiplier);
  fleet.push(aircraft);
  return true;
}

// Compte uniquement les appareils encore actifs dans une escadrille.
function countLivingShips(fleet) {
  let count = 0;
  for (let i = 0; i < fleet.length; i++) if (fleet[i].alive) count++;
  return count;
}

// Renvoie les appareils dans l'ordre joueur, alliés, ennemis pour leur dessin commun.
function fleetSize() {
  return 1 + alliedShips.length + hunters.length;
}

// Récupère un avion par index sans allouer une nouvelle collection à chaque image.
function getFleetShip(index) {
  if (index === 0) return player;
  index--;
  if (index < alliedShips.length) return alliedShips[index];
  return hunters[index - alliedShips.length];
}

// Actualise l'affichage de la vitesse choisie.
function updateSpeedLabel() {
  document.getElementById("speed-value").textContent = `${GAME_CONFIG.speedMultiplier.toFixed(1)}×`;
}

// Tire vers le chasseur le plus proche ou relance une partie après la défaite.
function mousePressed(mouseEvent) {
  if (mouseEvent && mouseEvent.target && mouseEvent.target.closest(".control-panel")) return;
  if (mouseEvent && mouseEvent.target && mouseEvent.target.closest(".diagnostics")) return;
  if (mouseEvent && mouseEvent.target && mouseEvent.target.closest(".game-overlay")) return false;
  if (gameStarted && !gameOver && !gamePaused && !awaitingNextStage && mouseEvent && mouseEvent.shiftKey) {
    obstacles.push(new Asteroid(mouseX, mouseY, random(9, 16), frameCount + obstacles.length));
    return false;
  }
  if (gameOver) {
    restartCurrentStage();
    return false;
  }
  if (!gameStarted || gamePaused || awaitingNextStage) return false;
  fireMissile();
  return false;
}

function mouseMoved() {
  if (manualControl && gameStarted && !gameOver && !gamePaused && !awaitingNextStage
    && mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    setManualInputMode("mouse");
  }
}

function mouseDragged() {
  mouseMoved();
}

// Active les commandes de partie et ajoute les corps célestes demandés.
function keyPressed(event) {
  const isArrowKey = keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW
    || keyCode === UP_ARROW || keyCode === DOWN_ARROW;
  const target = event && event.target;
  const isInteractiveTarget = target && typeof target.closest === "function"
    && target.closest("input, select, textarea, [contenteditable='true']");
  if (isArrowKey && manualControl && gameStarted && !gameOver && !gamePaused
    && !awaitingNextStage && !isInteractiveTarget) {
    setManualInputMode("keyboard");
    return false;
  }
  if (key === "Escape") {
    togglePause();
    return false;
  }
  if (key === " " && gameStarted && !gameOver) {
    togglePause();
    return false;
  }
  if (key === "r" || key === "R") {
    if (gameOver) restartCurrentStage();
    else startNewGame();
  } else if ((key === "Enter" || key === " ") && !gameStarted && !gameOver) {
    startNewGame();
    return false;
  } else if (gamePaused || awaitingNextStage) {
    return false;
  } else if ((key === "b" || key === "B") && gameStarted && !gameOver) {
    activateShield();
  } else if ((key === "m" || key === "M") && !gameOver) {
    toggleManualControl();
  } else if ((key === "g" || key === "G") && gameStarted && !gameOver) {
    antiGravity = !antiGravity;
  } else if ((key === "t" || key === "T") && !gameOver) {
    autoFire = !autoFire;
  } else if ((key === "d" || key === "D") && !gameOver) {
    Vehicle.debug = !Vehicle.debug;
  } else if ((key === "p" || key === "P") && !gameOver) {
    const planetColors = ["#315d91", "#597a57", "#a97949", "#625b8f"];
    obstacles.push(new Obstacle(mouseX, mouseY, random(24, 42), "planete", random(planetColors)));
  } else if ((key === "o" || key === "O") && !gameOver) {
    const planetColors = ["#315d91", "#597a57", "#a97949", "#625b8f"];
    obstacles.push(new Obstacle(mouseX, mouseY, random(18, 34), "planete", random(planetColors)));
  }
}

// Redimensionne le canvas et conserve les positions relatives des entités.
function windowResized() {
  const oldWidth = width;
  const oldHeight = height;
  resizeCanvas(windowWidth, windowHeight);
  patrolPath = PathFollowing.createOrbitPath(width, height);
  const scaleX = width / oldWidth;
  const scaleY = height / oldHeight;
  const entities = [player, ...alliedShips, ...hunters, ...crystals, ...missiles, ...obstacles];
  for (let i = 0; i < entities.length; i++) {
    entities[i].pos.x *= scaleX;
    entities[i].pos.y *= scaleY;
  }
  if (keyboardTargetPosition) {
    keyboardTargetPosition.x *= scaleX;
    keyboardTargetPosition.y *= scaleY;
  }
  for (let i = 0; i < obstacles.length; i++) {
    obstacles[i].surfaceTexture = null;
    obstacles[i].surfaceTextureSize = 0;
  }
  for (let i = 0; i < stars.length; i++) {
    stars[i].x = stars[i].x / oldWidth * width;
    stars[i].y = stars[i].y / oldHeight * height;
  }
  galaxyTexture = null;
}
