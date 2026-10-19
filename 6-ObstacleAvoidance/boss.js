class Boss extends Hunter {
  constructor(x, y, health = GAME_CONFIG.bossHealth) {
    super(x, y);
    this.isBoss = true;
    this.maxHealth = health;
    this.health = health;
    this.r = 27;
    this.r_pourDessin = 19;
    this.mass = 4;
    this.baseMaxSpeed *= 0.72;
    this.applySpeedMultiplier(GAME_CONFIG.speedMultiplier || 1);
    this.maxForce = 0.14;
    this.pathMaxLength = 24;
  }

  takeDamage() {
    if (!this.alive || this.health <= 0) return false;
    this.health--;
    if (this.health === 0) this.alive = false;
    return true;
  }
}
