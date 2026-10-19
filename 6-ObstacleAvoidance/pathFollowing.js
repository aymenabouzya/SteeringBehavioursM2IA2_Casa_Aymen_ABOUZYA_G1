// Suivi d'un chemin fermé par projection scalaire sur ses segments.
const PathFollowing = (() => {
  // Construit un circuit elliptique ajusté aux dimensions du canvas.
  function createOrbitPath(canvasWidth, canvasHeight, pointCount = 32) {
    const centerX = canvasWidth * 0.5;
    const centerY = canvasHeight * 0.5;
    const radiusX = Math.max(25, canvasWidth * 0.4);
    const radiusY = Math.max(25, canvasHeight * 0.39);
    const points = [];

    for (let i = 0; i < pointCount; i++) {
      const angle = i / pointCount * TWO_PI;
      points.push(createVector(
        centerX + Math.cos(angle) * radiusX,
        centerY + Math.sin(angle) * radiusY,
      ));
    }
    return points;
  }

  // Projette la position anticipée sur le segment le plus proche, puis seek une cible en avant.
  function steering(vehicle, path, lookAhead = 38) {
    if (path.length < 2) return createVector(0, 0);
    const future = vehicle.pos.copy();
    if (vehicle.vel.magSq() > 0) {
      future.add(vehicle.vel.copy().setMag(Math.min(48, lookAhead + vehicle.vel.mag() * 5)));
    }

    let closestDistanceSquared = Infinity;
    let closestX = path[0].x;
    let closestY = path[0].y;
    let tangentX = 1;
    let tangentY = 0;

    for (let i = 0; i < path.length; i++) {
      const start = path[i];
      const end = path[(i + 1) % path.length];
      const segmentX = end.x - start.x;
      const segmentY = end.y - start.y;
      const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
      if (segmentLengthSquared === 0) continue;

      const futureX = future.x - start.x;
      const futureY = future.y - start.y;
      const projection = Math.max(0, Math.min(1,
        (futureX * segmentX + futureY * segmentY) / segmentLengthSquared,
      ));
      const projectionX = start.x + segmentX * projection;
      const projectionY = start.y + segmentY * projection;
      const dx = future.x - projectionX;
      const dy = future.y - projectionY;
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared < closestDistanceSquared) {
        closestDistanceSquared = distanceSquared;
        closestX = projectionX;
        closestY = projectionY;
        const segmentLength = Math.sqrt(segmentLengthSquared);
        tangentX = segmentX / segmentLength;
        tangentY = segmentY / segmentLength;
      }
    }

    const target = createVector(
      closestX + tangentX * lookAhead,
      closestY + tangentY * lookAhead,
    );
    const desired = p5.Vector.sub(target, vehicle.pos);
    if (desired.magSq() === 0) return createVector(0, 0);
    desired.setMag(vehicle.maxSpeed);
    return desired.sub(vehicle.vel).limit(vehicle.maxForce);
  }

  // Affiche le circuit en mode debug pour rendre la projection observable.
  function draw(path) {
    if (path.length < 2) return;
    push();
    noFill();
    stroke(91, 178, 255, 90);
    strokeWeight(1);
    beginShape();
    for (let i = 0; i < path.length; i++) vertex(path[i].x, path[i].y);
    endShape(CLOSE);
    pop();
  }

  return { createOrbitPath, steering, draw };
})();
