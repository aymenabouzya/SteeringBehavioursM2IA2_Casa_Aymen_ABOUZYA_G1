// Forces de flocking calculées séparément avant leur composition par le vaisseau.
const Flocking = (() => {
  // Calcule une force de steering moyenne sans créer de vecteurs dans la boucle.
  function averageDirection(vehicle, neighbors, radius, behavior) {
    let directionX = 0;
    let directionY = 0;
    let neighborCount = 0;
    const radiusSquared = radius * radius;

    for (let i = 0; i < neighbors.length; i++) {
      const neighbor = neighbors[i];
      if (neighbor === vehicle || !neighbor.alive) continue;
      const dx = neighbor.pos.x - vehicle.pos.x;
      const dy = neighbor.pos.y - vehicle.pos.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared === 0 || distanceSquared >= radiusSquared) continue;
      if (behavior === "separation") {
        directionX -= dx / distanceSquared;
        directionY -= dy / distanceSquared;
      } else if (behavior === "alignment") {
        directionX += neighbor.vel.x;
        directionY += neighbor.vel.y;
      } else {
        directionX += dx;
        directionY += dy;
      }
      neighborCount++;
    }

    if (neighborCount === 0) return createVector(0, 0);
    directionX /= neighborCount;
    directionY /= neighborCount;
    const magnitudeSquared = directionX * directionX + directionY * directionY;
    if (magnitudeSquared === 0) return createVector(0, 0);
    const scale = vehicle.maxSpeed / Math.sqrt(magnitudeSquared);
    return createVector(
      directionX * scale - vehicle.vel.x,
      directionY * scale - vehicle.vel.y,
    ).limit(vehicle.maxForce);
  }

  // Éloigne les voisins proches avec des vecteurs normalisés, pondérés par 1 / distance.
  function separation(vehicle, neighbors, radius = 34) {
    return averageDirection(vehicle, neighbors, radius, "separation");
  }

  // Aligne la vitesse désirée sur la moyenne des vitesses des voisins.
  function alignment(vehicle, neighbors, radius = 110) {
    return averageDirection(vehicle, neighbors, radius, "alignment");
  }

  // Oriente vers le centre moyen des voisins dans le rayon de cohésion.
  function cohesion(vehicle, neighbors, radius = 140) {
    return averageDirection(vehicle, neighbors, radius, "cohesion");
  }

  return { separation, alignment, cohesion };
})();
