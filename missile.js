class Missile extends Ship {
  // Lance un missile autonome vers une cible ennemie.
  constructor(x, y, target) {
    super(x, y, "player");
    this.target = target;
    this.baseMaxSpeed = 6.2;
    this.applySpeedMultiplier(GAME_CONFIG.speedMultiplier || 1);
    this.maxForce = 0.22;
    this.r = 4;
    this.life = 100;
    this.pathMaxLength = 4;
    this.color = "#ffcf72";
  }

  // Poursuit la position future de la cible en conservant l'évitement des planètes.
  steerToTarget(obstacles) {
    if (!this.target || !this.target.alive) return;
    const future = this.target.pos.copy();
    future.add(p5.Vector.mult(this.target.vel, 12));
    this.steer(future, [], obstacles, false);
  }

  hitTarget() {
    if (!this.target || !this.target.alive) return false;
    if (this.target.isBoss) return this.target.takeDamage();
    this.target.alive = false;
    return true;
  }

  // Dessine un projectile lumineux.
  show() {
    push();
    noStroke();
    drawingContext.shadowBlur = 14;
    drawingContext.shadowColor = "#ffcb65";
    fill("#fff2ba");
    circle(this.pos.x, this.pos.y, this.r * 2);
    drawingContext.shadowBlur = 0;
    pop();
  }
}
