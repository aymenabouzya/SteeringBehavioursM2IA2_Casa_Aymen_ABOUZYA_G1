const DIFFICULTIES = Object.freeze({
  cadet: Object.freeze({
    label: "CADET",
    description: "20 niveaux · 7 chasseurs · 1 collision fatale · boss final à 9 PV",
    initialLives: 1,
    hunterCount: 7,
    waveDurationFrames: 2100,
    waveEnemyIncrease: 1,
    maxWaveHunters: 18,
    waveSpeedIncrease: 0.04,
    maxWaveSpeedMultiplier: 1.3,
    winScore: 250,
    bossHealth: 3,
  }),
  pilote: Object.freeze({
    label: "PILOTE",
    description: "20 niveaux · 12 chasseurs · 1 collision fatale · boss final à 11 PV",
    initialLives: 1,
    hunterCount: 12,
    waveDurationFrames: 1500,
    waveEnemyIncrease: 2,
    maxWaveHunters: 28,
    waveSpeedIncrease: 0.08,
    maxWaveSpeedMultiplier: 1.5,
    winScore: 300,
    bossHealth: 5,
  }),
  as: Object.freeze({
    label: "AS",
    description: "20 niveaux · 16 chasseurs · 1 collision fatale · boss final à 13 PV",
    initialLives: 1,
    hunterCount: 16,
    waveDurationFrames: 1200,
    waveEnemyIncrease: 3,
    maxWaveHunters: 38,
    waveSpeedIncrease: 0.11,
    maxWaveSpeedMultiplier: 1.85,
    winScore: 400,
    bossHealth: 7,
  }),
});

const STAGES = Object.freeze([
  Object.freeze({ name: "PREMIER CONTACT", objective: "RAMASSER DES CRISTAUX", type: "crystals", goal: 3 }),
  Object.freeze({ name: "CEINTURE D'ASTÉROÏDES", objective: "SURVIVRE", type: "survive", goal: 20 }),
  Object.freeze({ name: "PATROUILLE ENNEMIE", objective: "DÉTRUIRE DES CHASSEURS", type: "hunters", goal: 3 }),
  Object.freeze({ name: "RAVITAILLEMENT D'URGENCE", objective: "CAPTURER LES CRISTAUX BONUS", type: "bonus", goal: 2 }),
  Object.freeze({ name: "LE GARDIEN DU SECTEUR", objective: "VAINCRE LE BOSS", type: "boss", goal: 1, bossHealthBonus: 0 }),
  Object.freeze({ name: "RENFORTS ROUGES", objective: "RAMASSER DES CRISTAUX", type: "crystals", goal: 5 }),
  Object.freeze({ name: "COURSE CONTRE LA VAGUE", objective: "SURVIVRE", type: "survive", goal: 30 }),
  Object.freeze({ name: "BRISER L'ENCERCLEMENT", objective: "DÉTRUIRE DES CHASSEURS", type: "hunters", goal: 5 }),
  Object.freeze({ name: "RÉSERVE DE MUNITIONS", objective: "CAPTURER LES CRISTAUX BONUS", type: "bonus", goal: 3 }),
  Object.freeze({ name: "CROISEUR DE L'AVANT-GARDE", objective: "VAINCRE LE BOSS", type: "boss", goal: 1, bossHealthBonus: 2 }),
  Object.freeze({ name: "NAVIGATION À VUE", objective: "RAMASSER DES CRISTAUX", type: "crystals", goal: 6 }),
  Object.freeze({ name: "FUITE GRAVITATIONNELLE", objective: "SURVIVRE", type: "survive", goal: 40 }),
  Object.freeze({ name: "ÉLIMINER LES POURSUITEURS", objective: "DÉTRUIRE DES CHASSEURS", type: "hunters", goal: 6 }),
  Object.freeze({ name: "BOUCLIER CRITIQUE", objective: "CAPTURER LES CRISTAUX BONUS", type: "bonus", goal: 4 }),
  Object.freeze({ name: "LE COMMANDANT APPARAÎT", objective: "VAINCRE LE BOSS", type: "boss", goal: 1, bossHealthBonus: 4 }),
  Object.freeze({ name: "DERNIER RAVITAILLEMENT", objective: "RAMASSER DES CRISTAUX", type: "crystals", goal: 7 }),
  Object.freeze({ name: "LA FLOTTE ENTIÈRE", objective: "SURVIVRE", type: "survive", goal: 50 }),
  Object.freeze({ name: "OUVRIR LE PASSAGE", objective: "DÉTRUIRE DES CHASSEURS", type: "hunters", goal: 8 }),
  Object.freeze({ name: "DERNIÈRE CHANCE", objective: "CAPTURER LES CRISTAUX BONUS", type: "bonus", goal: 5 }),
  Object.freeze({ name: "BATAILLE DE LA TERRE", objective: "VAINCRE LE COMMANDANT", type: "boss", goal: 1, bossHealthBonus: 6 }),
]);

const GameRules = {
  DIFFICULTIES,
  STAGES,

  getDifficulty(id) {
    return Object.prototype.hasOwnProperty.call(DIFFICULTIES, id)
      ? DIFFICULTIES[id] : null;
  },

  applyDifficulty(config, id) {
    const difficulty = this.getDifficulty(id);
    if (!difficulty) throw new RangeError(`Difficulté inconnue : ${id}`);
    config.difficulty = id;
    config.initialLives = difficulty.initialLives;
    config.hunterCount = difficulty.hunterCount;
    config.waveDurationFrames = difficulty.waveDurationFrames;
    config.waveEnemyIncrease = difficulty.waveEnemyIncrease;
    config.maxWaveHunters = difficulty.maxWaveHunters;
    config.waveSpeedIncrease = difficulty.waveSpeedIncrease;
    config.maxWaveSpeedMultiplier = difficulty.maxWaveSpeedMultiplier;
    config.winScore = difficulty.winScore;
    config.bossHealth = difficulty.bossHealth;
    return difficulty;
  },

  getStage(score, winScore) {
    if (!Number.isFinite(score) || score < 0 || !Number.isFinite(winScore) || winScore <= 0) {
      throw new RangeError("Le score et l'objectif doivent être des nombres positifs valides.");
    }
    const boundedScore = Math.min(score, winScore);
    let index = 0;
    while (
      index < STAGES.length - 1
      && boundedScore >= Math.ceil(winScore * (index + 1) / STAGES.length)
    ) {
      index++;
    }
    const startScore = index === 0 ? 0 : Math.ceil(winScore * index / STAGES.length);
    const goalScore = Math.ceil(winScore * (index + 1) / STAGES.length);
    return {
      number: index + 1,
      total: STAGES.length,
      name: STAGES[index].name,
      score: boundedScore,
      startScore,
      goalScore,
      progress: Math.min(1, (boundedScore - startScore) / (goalScore - startScore)),
    };
  },

  getStageInstruction(stageNumber, bossHealth = null) {
    if (!Number.isInteger(stageNumber) || stageNumber < 1 || stageNumber > STAGES.length) {
      throw new RangeError("L'étape doit être comprise entre 1 et 20.");
    }
    const definition = STAGES[stageNumber - 1];
    if (definition.type === "crystals") {
      return `Récupère ${definition.goal} cristaux standards avec ton avion ou tes alliés.`;
    }
    if (definition.type === "survive") {
      return `Survis ${definition.goal} secondes sans perdre ton avion.`;
    }
    if (definition.type === "hunters") {
      return `Détruis ${definition.goal} chasseurs rouges avec tes missiles.`;
    }
    if (definition.type === "bonus") {
      return `Récupère ${definition.goal} cristaux bonus dorés, violets ou mauves avec ton avion ou tes alliés.`;
    }
    const healthDetail = Number.isInteger(bossHealth) && bossHealth > 0
      ? ` Le boss possède ${bossHealth} PV.`
      : "";
    return `Détruis le boss en lui tirant des missiles et évite tout contact.${healthDetail}`;
  },

  getStageObjective(stageNumber, progress, bossHealth = 0, bossMaxHealth = 0) {
    if (!Number.isInteger(stageNumber) || stageNumber < 1 || stageNumber > STAGES.length
      || !Number.isFinite(progress) || progress < 0
      || !Number.isFinite(bossHealth) || bossHealth < 0
      || !Number.isFinite(bossMaxHealth) || bossMaxHealth < 0) {
      throw new RangeError("L'étape et sa progression doivent être valides.");
    }
    const definition = STAGES[stageNumber - 1];
    const goal = definition.type === "boss" ? Math.max(1, bossMaxHealth) : definition.goal;
    const completed = definition.type === "boss"
      ? bossMaxHealth > 0 && bossHealth === 0
      : progress >= goal;
    const value = definition.type === "boss"
      ? Math.max(0, goal - bossHealth)
      : Math.min(progress, goal);
    const displayProgress = definition.type === "survive" ? Math.floor(value) : value;
    return {
      number: stageNumber,
      total: STAGES.length,
      name: definition.name,
      objective: definition.objective,
      type: definition.type,
      progress: value,
      goal,
      progressLabel: definition.type === "survive"
        ? `${displayProgress} / ${goal} s`
        : definition.type === "boss" ? `PV ${bossHealth} / ${bossMaxHealth}`
        : `${displayProgress} / ${goal}`,
      ratio: goal === 0 ? 1 : value / goal,
      completed,
    };
  },

  // Compare les centres au carré afin d'éviter une racine carrée pour les collisions.
  distanceSquared(first, second) {
    const dx = first.pos.x - second.pos.x;
    const dy = first.pos.y - second.pos.y;
    return dx * dx + dy * dy;
  },

  // Vérifie le chevauchement de deux cercles englobants.
  overlaps(first, second) {
    const radius = first.r + second.r;
    return this.distanceSquared(first, second) <= radius * radius;
  },

  findSafeTeleportPosition(width, height, entities, obstacles, randomPosition, margin, origin, minimumDistance) {
    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0
      || !Array.isArray(entities) || !Array.isArray(obstacles)
      || typeof randomPosition !== "function"
      || !Number.isFinite(margin) || margin < 0
      || (origin && (!Number.isFinite(origin.x) || !Number.isFinite(origin.y)))
      || !Number.isFinite(minimumDistance) || minimumDistance < 0) {
      throw new RangeError("Les paramètres de sortie du trou noir doivent être valides.");
    }

    const edge = Math.min(margin, width / 2, height / 2);
    const isSafe = position => {
      if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)
        || position.x < edge || position.x > width - edge
        || position.y < edge || position.y > height - edge) return false;
      const point = { pos: position };
      if (origin && this.distanceSquared(point, { pos: origin }) < minimumDistance ** 2) return false;
      for (const entity of entities) {
        if (entity.alive === false) continue;
        if (this.distanceSquared(point, entity) < (margin + entity.r) ** 2) return false;
      }
      for (const obstacle of obstacles) {
        if (obstacle.alive === false) continue;
        if (this.distanceSquared(point, obstacle) < (margin + obstacle.r) ** 2) return false;
      }
      return true;
    };

    for (let attempt = 0; attempt < 240; attempt++) {
      const candidate = randomPosition(edge, width - edge, edge, height - edge);
      if (isSafe(candidate)) return candidate;
    }

    const step = Math.max(16, Math.min(32, margin / 2));
    for (let y = edge; y <= height - edge; y += step) {
      for (let x = edge; x <= width - edge; x += step) {
        const candidate = createVector(x, y);
        if (isSafe(candidate)) return candidate;
      }
    }
    return null;
  },

  // Un cristal capturé rapporte une munition, sans dépasser la capacité.
  collectCrystal(ship, crystal, ammo, maxAmmo) {
    if (!crystal.alive || !this.overlaps(ship, crystal)) return null;
    const reward = this.crystalReward(crystal, ammo, maxAmmo);
    crystal.alive = false;
    return reward.ammo;
  },

  crystalReward(crystal, ammo, maxAmmo) {
    if (!crystal.alive) return null;
    if (!Number.isInteger(ammo) || ammo < 0 || !Number.isInteger(maxAmmo) || maxAmmo < ammo) {
      throw new RangeError("Les munitions et leur capacité doivent être valides.");
    }
    const type = crystal.type === undefined ? "normal" : crystal.type;
    if (type === "normal") {
      return { ammo: Math.min(ammo + 1, maxAmmo), score: 25, shield: false, bonus: false };
    }
    if (type === "ammo") {
      return { ammo: Math.min(ammo + 10, maxAmmo), score: 75, shield: false, bonus: true };
    }
    if (type === "shield") {
      return { ammo, score: 75, shield: true, bonus: true };
    }
    if (type === "score") {
      return { ammo, score: 250, shield: false, bonus: true };
    }
    throw new RangeError(`Type de cristal inconnu : ${type}`);
  },

  // Renvoie le premier chasseur vivant qui touche un avion blanc vivant.
  firstFleetContact(whiteShip, hunters, shieldFrames = 0) {
    if (!whiteShip.alive || shieldFrames > 0) return null;
    for (let i = 0; i < hunters.length; i++) {
      const hunter = hunters[i];
      if (hunter.alive && this.overlaps(whiteShip, hunter)) return hunter;
    }
    return null;
  },

  firstPlanetContact(whiteShip, celestialBodies) {
    if (!whiteShip.alive) return null;
    for (let i = 0; i < celestialBodies.length; i++) {
      const body = celestialBodies[i];
      if (body.type !== "asteroide" && this.overlaps(whiteShip, body)) return body;
    }
    return null;
  },

  resolvePlayerCollision(whiteShip, hunters, celestialBodies = [], shieldFrames = 0, boss = null) {
    const planet = this.firstPlanetContact(whiteShip, celestialBodies);
    if (planet) return { type: "planet", obstacle: planet, lives: 0, gameOver: true };
    if (boss && boss.alive && this.overlaps(whiteShip, boss)) {
      return { type: "boss", hunter: boss, lives: 0, gameOver: true };
    }
    const hunter = this.firstFleetContact(whiteShip, hunters, shieldFrames);
    if (hunter) return { type: "hunter", hunter, lives: 0, gameOver: true };
    return null;
  },
};
