class Hunter extends Ship {
  // Initialise un poursuivant rouge, plus lent que le vaisseau du joueur.
  constructor(x, y) {
    super(x, y, "enemy");
    this.baseMaxSpeed = random(2.15, 2.8);
    this.waveDifficultyMultiplier = 1;
    this.applySpeedMultiplier(GAME_CONFIG.speedMultiplier || 1);
    this.maxForce = 0.105;
    this.guardDistance = random(52, 72);
    this.guardAngle = random(TWO_PI);
  }

  // Combine le multiplicateur de vitesse du joueur avec la difficulté de la vague.
  applySpeedMultiplier(multiplier) {
    const speedRatio = multiplier / (this.speedMultiplier || multiplier);
    this.speedMultiplier = multiplier;
    this.maxSpeed = this.baseMaxSpeed * multiplier * (this.waveDifficultyMultiplier || 1);
    if (this.vel.magSq() > 0) this.vel.mult(speedRatio).limit(this.maxSpeed);
  }

  // Augmente la vitesse maximale du chasseur sans dépasser sa limite configurée.
  setWaveDifficulty(multiplier) {
    this.waveDifficultyMultiplier = multiplier;
    this.maxSpeed = this.baseMaxSpeed * this.speedMultiplier * multiplier;
    this.vel.limit(this.maxSpeed);
  }

  // Intercepte les alliés près des cristaux et garde sinon une position proche du plus menacé.
  chooseTarget(player, crystals, alliedShips = []) {
    let nearestThreat = null;
    let nearestThreatDistanceSquared = Infinity;
    let nearestCrystal = null;
    let nearestCrystalDistanceSquared = Infinity;

    for (let i = 0; i < crystals.length; i++) {
      const crystal = crystals[i];
      if (!crystal.alive) continue;

      const crystalX = this.pos.x - crystal.pos.x;
      const crystalY = this.pos.y - crystal.pos.y;
      const crystalDistanceSquared = crystalX * crystalX + crystalY * crystalY;
      if (crystalDistanceSquared < nearestCrystalDistanceSquared) {
        nearestCrystal = crystal;
        nearestCrystalDistanceSquared = crystalDistanceSquared;
      }

      const protectRadius = GAME_CONFIG.crystalProtectionRadius;
      const protectRadiusSquared = protectRadius * protectRadius;
      for (let j = -1; j < alliedShips.length; j++) {
        const ally = j < 0 ? player : alliedShips[j];
        if (!ally || !ally.alive) continue;
        const dx = ally.pos.x - crystal.pos.x;
        const dy = ally.pos.y - crystal.pos.y;
        if (dx * dx + dy * dy > protectRadiusSquared) continue;

        const hunterX = this.pos.x - ally.pos.x;
        const hunterY = this.pos.y - ally.pos.y;
        const threatDistanceSquared = hunterX * hunterX + hunterY * hunterY;
        if (threatDistanceSquared < nearestThreatDistanceSquared) {
          nearestThreat = ally;
          nearestThreatDistanceSquared = threatDistanceSquared;
        }
      }
    }

    if (nearestThreat) return nearestThreat;
    if (!nearestCrystal) return null;

    return createVector(
      nearestCrystal.pos.x + cos(this.guardAngle) * this.guardDistance,
      nearestCrystal.pos.y + sin(this.guardAngle) * this.guardDistance,
    );
  }

  // Suit sa cible avec arrive et compose la force avec l'évitement et la séparation.
  steer(target, neighbors, obstacles, antiGravity = false) {
    return super.steer(target, neighbors, obstacles, antiGravity);
  }
}
