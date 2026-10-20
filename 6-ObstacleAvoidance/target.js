class Crystal extends Target {
  // Initialise un petit cristal mobile avec un rayon de perception des avions.
  constructor(x, y, type = "normal") {
    super(x, y);
    this.type = type;
    this.r = random(5, 8);
    this.maxSpeed = random(0.8, 1.35);
    this.maxForce = 0.055;
    this.color = type === "score" ? "#e879ff"
      : type === "ammo" ? "#ffcc67"
      : type === "shield" ? "#a77dff" : "#52eaff";
    this.pathMaxLength = 0;
    this.wanderAngle = random(TWO_PI);
    this.visionRadius = 105;
    this.alive = true;
    this.phase = random(TWO_PI);
  }

  // Choisit wander hors de danger ou fuit l'avion le plus proche.
  steer(aircraft) {
    let nearestAircraft = null;
    let nearestDistanceSquared = this.visionRadius * this.visionRadius;
    for (let i = 0; i < aircraft.length; i++) {
      const ship = aircraft[i];
      if (!ship.alive) continue;
      const dx = this.pos.x - ship.pos.x;
      const dy = this.pos.y - ship.pos.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < nearestDistanceSquared) {
        nearestDistanceSquared = distanceSquared;
        nearestAircraft = ship;
      }
    }

    let steering;
    if (nearestAircraft) {
      const desiredVelocity = p5.Vector.sub(this.pos, nearestAircraft.pos);
      if (desiredVelocity.magSq() === 0) desiredVelocity.set(1, 0);
      desiredVelocity.setMag(this.maxSpeed);
      steering = desiredVelocity.sub(this.vel);
    } else {
      this.wanderAngle += random(-0.09, 0.09);
      const forward = this.vel.magSq() > 0.01
        ? this.vel.copy().normalize()
        : createVector(cos(this.wanderAngle), sin(this.wanderAngle));
      const circleCenter = p5.Vector.add(this.pos, forward.mult(28));
      const wanderTarget = p5.Vector.add(
        circleCenter,
        createVector(cos(this.wanderAngle) * 21, sin(this.wanderAngle) * 21),
      );
      steering = this.arrive(wanderTarget);
    }

    steering.limit(this.maxForce);
    this.applyForce(steering);
  }

  // Dessine les cristaux avec des couleurs et des halos propres à chaque bonus.
  show() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(frameCount * 0.012 + this.phase);
    const isScoreCrystal = this.type === "score";
    const tint = isScoreCrystal ? "#e879ff"
      : this.type === "ammo" ? "#ffcb62"
      : this.type === "shield" ? "#a77dff" : "#35ddff";
    const size = this.r * (isScoreCrystal ? 1.35 : 1);
    const halo = isScoreCrystal ? [232, 121, 255] : this.type === "ammo" ? [255, 203, 98]
      : this.type === "shield" ? [167, 125, 255] : [51, 221, 255];
    noStroke();
    fill(halo[0], halo[1], halo[2], 40);
    circle(0, 0, size * (isScoreCrystal ? 4.2 : 3.5));
    drawingContext.shadowBlur = isScoreCrystal ? 26 : this.type === "normal" ? 16 : 20;
    drawingContext.shadowColor = tint;
    fill(tint);
    beginShape();
    for (let i = 0; i < 6; i++) {
      const angle = i * TWO_PI / 6;
      vertex(cos(angle) * size, sin(angle) * size);
    }
    endShape(CLOSE);
    drawingContext.shadowBlur = 0;
    noFill();
    stroke(tint);
    strokeWeight(isScoreCrystal ? 1.5 : 1);
    circle(0, 0, size * (isScoreCrystal ? 3.2 : 2.8));
    if (isScoreCrystal) {
      drawingContext.setLineDash([2, 3]);
      circle(0, 0, size * 4.1);
      drawingContext.setLineDash([]);
    }
    pop();
    if (Vehicle.debug) {
      noFill();
      stroke(65, 228, 255, 60);
      circle(this.pos.x, this.pos.y, this.visionRadius * 2);
    }
  }

  // Applique les forces puis enveloppe le cristal dans les limites du canvas.
  update() {
    super.update();
    this.edges();
  }
}
