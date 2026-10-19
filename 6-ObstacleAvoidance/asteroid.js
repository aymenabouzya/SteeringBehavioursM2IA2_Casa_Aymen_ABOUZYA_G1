class Asteroid extends Obstacle {
  // Crée un rocher immobile dont la silhouette est stable pour faciliter le debug.
  constructor(x, y, radius, seed = 1) {
    super(x, y, radius, "asteroide", "#817b79");
    let randomSeed = Math.abs(Math.floor(seed)) % 2147483647 || 1;
    this.vertices = [];
    for (let i = 0; i < 10; i++) {
      randomSeed = (randomSeed * 16807) % 2147483647;
      const variation = 0.76 + (randomSeed - 1) / 2147483646 * 0.42;
      const angle = i / 10 * Math.PI * 2;
      this.vertices.push([
        Math.cos(angle) * radius * variation,
        Math.sin(angle) * radius * variation,
      ]);
    }
  }

  // Dessine l'astéroïde facetté et son rayon de collision en mode debug.
  show() {
    push();
    if (Vehicle.debug) {
      noFill();
      stroke(178, 153, 255, 100);
      strokeWeight(1);
      circle(this.pos.x, this.pos.y, this.r * 2);
    }

    translate(this.pos.x, this.pos.y);
    rotate(this.vertices[0][0] * 0.01);
    drawingContext.shadowBlur = 9;
    drawingContext.shadowColor = "#a99bff";
    fill("#6d6972");
    stroke("#b3aab4");
    strokeWeight(1.2);
    beginShape();
    for (let i = 0; i < this.vertices.length; i++) {
      vertex(this.vertices[i][0], this.vertices[i][1]);
    }
    endShape(CLOSE);
    drawingContext.shadowBlur = 0;

    noStroke();
    fill(35, 38, 52, 150);
    circle(-this.r * 0.28, -this.r * 0.16, this.r * 0.38);
    circle(this.r * 0.32, this.r * 0.22, this.r * 0.25);
    pop();
  }
}
