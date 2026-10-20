class Ship extends Vehicle {
  // Initialise le vaisseau et limite l'historique de sa traînée.
  constructor(x, y, faction = "player") {
    super(x, y);
    this.faction = faction;
    this.color = faction === "enemy" ? "#ff596f" : "#e8f8ff";
    this.maxSpeed = faction === "enemy" ? 2.8 : 4.1;
    this.baseMaxSpeed = this.maxSpeed;
    this.speedMultiplier = 1;
    this.pointerSpeed = 0;
    this.pointerSpeedMultiplier = 1;
    this.lastPointerPosition = null;
    this.applySpeedMultiplier(GAME_CONFIG.speedMultiplier || 1);
    this.maxForce = faction === "enemy" ? 0.12 : 0.45;
    this.r_pourDessin = faction === "enemy" ? 9 : 10;
    this.r = faction === "enemy" ? 15 : 16;
    this.pathMaxLength = 9;
    this.alive = true;
    this.mass = 1;
    this.turnBank = 0;
    this.enginePower = 0;
    this.avoidanceObstacle = null;
    this.avoidanceSide = 1;
  }

  // Ajuste la vitesse maximale et met immédiatement à l'échelle la vitesse actuelle.
  applySpeedMultiplier(multiplier) {
    const speedRatio = multiplier / this.speedMultiplier;
    this.maxSpeed = this.baseMaxSpeed * multiplier * this.pointerSpeedMultiplier;
    if (this.vel.magSq() > 0) this.vel.mult(speedRatio).limit(this.maxSpeed);
    this.speedMultiplier = multiplier;
  }

  // Calcule l'évitement amélioré sur ahead, ahead2 et la position actuelle.
  avoidObstacles(obstacles) {
    const speed = this.vel.mag();
    const dynamicLength = this.maxSpeed > 0 ? speed / this.maxSpeed : 0;
    const aheadX = speed > 0 ? this.vel.x / speed * GAME_CONFIG.maxSeeAhead * dynamicLength : 0;
    const aheadY = speed > 0 ? this.vel.y / speed * GAME_CONFIG.maxSeeAhead * dynamicLength : 0;
    let threat = null;
    let threatPoint = null;
    let threatClearance = Infinity;

    for (let i = 0; i < obstacles.length; i++) {
      const obstacle = obstacles[i];
      for (let j = 0; j < 3; j++) {
        const pointX = this.pos.x + (j === 0 ? aheadX : j === 1 ? aheadX * 0.5 : 0);
        const pointY = this.pos.y + (j === 0 ? aheadY : j === 1 ? aheadY * 0.5 : 0);
        const dx = pointX - obstacle.pos.x;
        const dy = pointY - obstacle.pos.y;
        const avoidanceMargin = this.r * 1.5;
        const collisionDistance = obstacle.r + avoidanceMargin;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared < collisionDistance * collisionDistance) {
          const clearance = Math.sqrt(distanceSquared) - obstacle.r;
          if (clearance < avoidanceMargin && clearance < threatClearance) {
            threat = obstacle;
            threatPoint = createVector(pointX, pointY);
            threatClearance = clearance;
          }
        }
      }
    }

    if (Vehicle.debug) {
      this.drawAvoidanceDebug(
        createVector(aheadX, aheadY),
        createVector(aheadX * 0.5, aheadY * 0.5),
        threat,
        threatPoint,
      );
    }
    if (!threat) {
      this.avoidanceObstacle = null;
      return createVector(0, 0);
    }

    if (this.avoidanceObstacle !== threat) {
      const projectedSpeed = this.vel.mag();
      const lateralX = projectedSpeed > 0 ? -this.vel.y / projectedSpeed : 0;
      const lateralY = projectedSpeed > 0 ? this.vel.x / projectedSpeed : -1;
      const projectedSide = (threatPoint.x - threat.pos.x) * lateralX
        + (threatPoint.y - threat.pos.y) * lateralY;
      this.avoidanceSide = projectedSide < 0 ? -1 : 1;
      this.avoidanceObstacle = threat;
    }

    const currentSpeed = this.vel.mag();
    const lateralX = currentSpeed > 0 ? -this.vel.y / currentSpeed : 0;
    const lateralY = currentSpeed > 0 ? this.vel.x / currentSpeed : -1;
    const desiredVelocity = createVector(
      lateralX * this.avoidanceSide,
      lateralY * this.avoidanceSide,
    ).mult(this.maxSpeed);
    const steering = desiredVelocity.sub(this.vel);
    steering.limit(this.maxForce);
    return steering;
  }

  // Dessine les deux projections et le cercle rouge en cas de collision prévue.
  drawAvoidanceDebug(ahead, ahead2, threat, threatPoint) {
    this.drawVector(this.pos, ahead, "#66e8ff");
    this.drawVector(this.pos, ahead2, "#aa94ff");
    if (threat && threatPoint) {
      push();
      noFill();
      stroke(255, 65, 85);
      strokeWeight(2);
      circle(threatPoint.x, threatPoint.y, this.r * 2);
      pop();
    }
  }

  // Éloigne le vaisseau de ses voisins avec un poids inversement proportionnel à la distance.
  separation(neighbors) {
    return Flocking.separation(this, neighbors, 34);
  }

  // Aligne le vaisseau sur la vitesse moyenne de ses voisins proches.
  alignment(neighbors) {
    return Flocking.alignment(this, neighbors, 110);
  }

  // Ramène le vaisseau vers la position moyenne des voisins proches.
  cohesion(neighbors) {
    return Flocking.cohesion(this, neighbors, 140);
  }

  // Choisit le cristal vivant le plus proche pour le pilotage autonome.
  chooseCrystalTarget(crystals) {
    let nearestCrystal = null;
    let nearestDistanceSquared = Infinity;
    for (let i = 0; i < crystals.length; i++) {
      const crystal = crystals[i];
      if (!crystal.alive) continue;
      const dx = this.pos.x - crystal.pos.x;
      const dy = this.pos.y - crystal.pos.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < nearestDistanceSquared) {
        nearestCrystal = crystal;
        nearestDistanceSquared = distanceSquared;
      }
    }
    return nearestCrystal;
  }

  // Fuit le chasseur vivant le plus proche dans le rayon prévu pour le joueur.
  fleeThreats(threats) {
    const radiusSquared = GAME_CONFIG.playerFleeRadius * GAME_CONFIG.playerFleeRadius;
    let nearestThreat = null;
    let nearestDistanceSquared = radiusSquared;

    for (let i = 0; i < threats.length; i++) {
      const threat = threats[i];
      if (!threat.alive) continue;
      const dx = this.pos.x - threat.pos.x;
      const dy = this.pos.y - threat.pos.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < nearestDistanceSquared) {
        nearestThreat = threat;
        nearestDistanceSquared = distanceSquared;
      }
    }

    if (!nearestThreat) return createVector(0, 0);

    const desiredVelocity = p5.Vector.sub(this.pos, nearestThreat.pos);
    if (desiredVelocity.magSq() === 0) {
      desiredVelocity.set(-nearestThreat.vel.x, -nearestThreat.vel.y);
      if (desiredVelocity.magSq() === 0) desiredVelocity.set(1, 0);
    }
    desiredVelocity.setMag(this.maxSpeed);
    const steering = desiredVelocity.sub(this.vel);
    steering.limit(this.maxForce);
    return steering;
  }

  // Adapte la vitesse maximale au mouvement du pointeur avant de le suivre avec arrive.
  steerToPointer(target) {
    if (this.lastPointerPosition) {
      const elapsed = Number.isFinite(deltaTime) && deltaTime > 0 ? deltaTime : 1000 / 60;
      const pointerSpeed = p5.Vector.dist(target, this.lastPointerPosition) * (1000 / 60) / elapsed;
      const smoothing = 1 - Math.exp(-elapsed / 80);
      this.pointerSpeed += (pointerSpeed - this.pointerSpeed) * smoothing;
    }
    this.lastPointerPosition = target.copy();
    this.pointerSpeedMultiplier = 1 + Math.min(this.pointerSpeed / 16, 1) * 1.2;
    this.maxSpeed = this.baseMaxSpeed * this.speedMultiplier * this.pointerSpeedMultiplier;
    const steering = this.arrive(target);
    this.applyForce(steering);
    return steering;
  }

  // Combine arrivée, fuite, évitement, séparation et gravité avant application.
  steer(target, neighbors, obstacles, antiGravity = false, threats = [], flightMode = "mission", patrolPath = []) {
    const arrive = flightMode === "patrol"
      ? PathFollowing.steering(this, patrolPath)
      : target ? this.arrive(target.pos || target) : createVector(0, 0);
    const flee = this.fleeThreats(threats);
    const avoid = this.avoidObstacles(obstacles);
    const separate = this.separation(neighbors);
    const align = flightMode === "flock" ? this.alignment(neighbors) : createVector(0, 0);
    const group = flightMode === "flock" ? this.cohesion(neighbors) : createVector(0, 0);
    const gravity = this.gravity(obstacles, antiGravity);

    arrive.mult(flightMode === "patrol" ? 1 : 1.1);
    flee.mult(this.faction !== "enemy" ? GAME_CONFIG.playerFleeWeight : 0);
    avoid.mult(3);
    separate.mult(1.4);
    align.mult(flightMode === "flock" ? 0.8 : 0);
    group.mult(flightMode === "flock" ? 0.55 : 0);
    gravity.mult(0.7);

    const combined = createVector(0, 0);
    if (avoid.magSq() > 0) {
      combined.add(avoid.mult(3));
    } else {
      combined.add(arrive).add(flee).add(separate).add(align).add(group).add(gravity);
    }
    combined.limit(this.maxForce);
    this.applyForce(combined);
    return combined;
  }

  // Calcule une faible attraction ou répulsion gravitationnelle sans dépasser maxForce.
  gravity(obstacles, antiGravity) {
    const force = createVector(0, 0);
    const polarity = antiGravity ? -1 : 1;
    for (let i = 0; i < obstacles.length; i++) {
      const body = obstacles[i];
      const dx = body.pos.x - this.pos.x;
      const dy = body.pos.y - this.pos.y;
      const distanceSq = Math.max(900, dx * dx + dy * dy);
      const magnitude = Math.min(0.018, body.mass * 0.000025 / distanceSq) * polarity;
      const distance = Math.sqrt(distanceSq);
      if (distance > 0) {
        force.x += dx / distance * magnitude;
        force.y += dy / distance * magnitude;
      }
    }
    force.limit(this.maxForce);
    return force;
  }

  // Dessine une représentation simple utilisée hors du rendu groupé de la flotte.
  show() {
    const ctx = drawingContext;
    if (this.path.length > 1) {
      ctx.save();
      ctx.strokeStyle = this.faction === "enemy" ? "#ff5a70" : "#99eaff";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 4]);
      for (let i = 1; i < this.path.length; i++) {
        ctx.globalAlpha = 0.08 + 0.35 * i / this.path.length;
        ctx.beginPath();
        ctx.moveTo(this.path[i - 1].x, this.path[i - 1].y);
        ctx.lineTo(this.path[i].x, this.path[i].y);
        ctx.stroke();
      }
      ctx.restore();
    }

    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.magSq() > 0.001 ? this.vel.heading() : 0);
    noStroke();
    drawingContext.shadowBlur = 12;
    drawingContext.shadowColor = this.color;
    fill(this.color);
    triangle(this.r_pourDessin, 0, -this.r_pourDessin, -this.r_pourDessin * 0.55, -this.r_pourDessin * 0.45, 0);
    triangle(this.r_pourDessin, 0, -this.r_pourDessin * 0.45, 0, -this.r_pourDessin, this.r_pourDessin * 0.55);
    drawingContext.shadowBlur = 0;
    pop();

    if (Vehicle.debug) {
      noFill();
      stroke(this.faction === "enemy" ? color(255, 90, 110, 110) : color(105, 220, 255, 110));
      circle(this.pos.x, this.pos.y, this.r * 2);
    }
  }

  // Convertit l'accélération latérale en un roulis visuel adouci.
  updateMotionVisuals() {
    const lateralAcceleration = this.vel.x * this.acc.y - this.vel.y * this.acc.x;
    const scale = Math.max(1, this.maxSpeed * this.maxForce);
    const targetBank = Math.max(-1, Math.min(1, lateralAcceleration / scale));
    this.turnBank += (targetBank - this.turnBank) * 0.16;

    const targetEnginePower = 0.18 + 0.82 * Math.min(1, this.acc.mag() / Math.max(this.maxForce, 0.001));
    this.enginePower += (targetEnginePower - this.enginePower) * 0.22;
  }

  // Applique la locomotion héritée puis réapparaît de l'autre côté du canvas.
  update() {
    this.updateMotionVisuals();
    super.update();
    this.edges();
  }
}
