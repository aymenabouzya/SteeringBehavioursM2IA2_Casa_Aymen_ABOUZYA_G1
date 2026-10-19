import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

class Vector {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  set(x, y) { this.x = x; this.y = y; return this; }
  copy() { return new Vector(this.x, this.y); }
  add(vector) { this.x += vector.x; this.y += vector.y; return this; }
  sub(vector) { this.x -= vector.x; this.y -= vector.y; return this; }
  mult(scalar) { this.x *= scalar; this.y *= scalar; return this; }
  mag() { return Math.hypot(this.x, this.y); }
  setMag(magnitude) {
    const current = this.mag();
    if (current > 0) this.mult(magnitude / current);
    return this;
  }
  limit(maximum) {
    if (this.mag() > maximum) this.setMag(maximum);
    return this;
  }
  heading() { return Math.atan2(this.y, this.x); }
  static sub(first, second) { return first.copy().sub(second); }
}

function loadEntities() {
  const context = vm.createContext({
    createVector: (x, y) => new Vector(x, y),
    p5: { Vector },
    map: (value, fromStart, fromEnd, toStart, toEnd) =>
      toStart + (toEnd - toStart) * ((value - fromStart) / (fromEnd - fromStart)),
  });
  for (const file of ['vehicle.js', 'obstacle.js']) {
    vm.runInContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context, { filename: file });
  }
  return vm.runInContext('({ Vehicle, Obstacle })', context);
}

test('seek produit un steering borné par maxForce', () => {
  const { Vehicle } = loadEntities();
  const vehicle = new Vehicle(0, 0);
  const force = vehicle.seek(new Vector(500, 0));

  assert.ok(force.x > 0);
  assert.ok(Math.abs(force.mag() - vehicle.maxForce) < 1e-9);
});

test('arrive réduit le steering à proximité de la cible', () => {
  const { Vehicle } = loadEntities();
  const vehicle = new Vehicle(0, 0);
  vehicle.vel.set(1.9, 0);
  const force = vehicle.arrive(new Vector(50, 0));

  assert.ok(force.x > 0);
  assert.ok(force.mag() < vehicle.maxForce);
  assert.ok(Math.abs(force.x - 0.1) < 1e-9);
});

test('un obstacle visible reste un Vehicle stationnaire', () => {
  const { Vehicle, Obstacle } = loadEntities();
  const obstacle = new Obstacle(120, 80, 30, 'green');

  assert.ok(obstacle instanceof Vehicle);
  assert.equal(obstacle.pos.x, 120);
  assert.equal(obstacle.pos.y, 80);
  assert.equal(obstacle.maxSpeed, 0);
});
