class BlackHole extends Vehicle {
  constructor(x, y, label = "A", radius = 20) {
    super(x, y);
    this.r = radius;
    this.label = label;
    this.exit = null;
    this.maxSpeed = 0;
    this.vel.set(0, 0);
    this.cooldownFrames = 0;
    this.flashFrames = 0;
  }

  connect(exit) {
    if (!(exit instanceof BlackHole) || exit === this) {
      throw new RangeError("Un trou noir doit être relié à un autre trou noir.");
    }
    this.exit = exit;
  }

  contains(entity) {
    const radius = this.r + entity.r;
    return GameRules.distanceSquared(this, entity) <= radius * radius;
  }

  enter(ship, cooldownFrames = 180) {
    if (!ship.alive || !this.exit || this.cooldownFrames > 0
      || this.exit.cooldownFrames > 0 || !this.contains(ship)) return false;
    if (!Number.isInteger(cooldownFrames) || cooldownFrames < 0) {
      throw new RangeError("La durée de recharge du trou noir doit être valide.");
    }
    ship.pos.set(this.exit.pos.x, this.exit.pos.y);
    ship.acc.set(0, 0);
    this.cooldownFrames = cooldownFrames;
    this.exit.cooldownFrames = cooldownFrames;
    this.flashFrames = 36;
    this.exit.flashFrames = 36;
    return true;
  }

  tick() {
    if (this.cooldownFrames > 0) this.cooldownFrames--;
    if (this.flashFrames > 0) this.flashFrames--;
  }

  show() {
    const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.055);
    const active = this.cooldownFrames === 0;
    const glow = active ? 190 + pulse * 55 : 95;
    push();
    translate(this.pos.x, this.pos.y);
    noFill();
    for (let ring = 0; ring < 3; ring++) {
      const ringRadius = this.r * (1.35 + ring * 0.28 + pulse * 0.05);
      stroke(ring === 1 ? color(255, 184, 97, glow) : color(132, 139, 255, glow * 0.68));
      strokeWeight(ring === 1 ? 2.2 : 1.4);
      ellipse(0, 0, ringRadius * 2, ringRadius * (1.15 + ring * 0.08));
    }

    for (let i = 0; i < 28; i++) {
      const angle = i * TWO_PI / 28 + frameCount * (i % 2 ? 0.012 : -0.009);
      const distance = this.r * (0.78 + (i % 7) * 0.105);
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance * 0.68;
      stroke(i % 3 === 0 ? color(255, 202, 125, glow) : color(151, 143, 255, glow * 0.82));
      strokeWeight(i % 4 === 0 ? 2.2 : 1.2);
      point(x, y);
    }

    noStroke();
    fill(105, 86, 180, active ? 35 + pulse * 22 : 16);
    circle(0, 0, this.r * 2.25);
    drawingContext.shadowBlur = active ? 24 : 10;
    drawingContext.shadowColor = active ? "#b8a2ff" : "#77758d";
    fill("#03030a");
    circle(0, 0, this.r * 1.28);
    drawingContext.shadowBlur = 0;
    noFill();
    stroke(active ? color(242, 219, 255, 215) : color(166, 166, 180, 115));
    strokeWeight(2);
    circle(0, 0, this.r * 1.36);
    noStroke();
    fill(209, 205, 255, active ? 210 : 120);
    textAlign(CENTER, CENTER);
    textSize(9);
    text(this.label, 0, this.r * 2.05);
    pop();

    if (this.flashFrames > 0) {
      noFill();
      stroke(185, 235, 255, this.flashFrames * 5);
      strokeWeight(3);
      circle(this.pos.x, this.pos.y, this.flashFrames * 4);
    }
    if (Vehicle.debug) {
      noFill();
      stroke(190, 163, 255, 100);
      circle(this.pos.x, this.pos.y, (this.r + 24) * 2);
    }
  }
}
