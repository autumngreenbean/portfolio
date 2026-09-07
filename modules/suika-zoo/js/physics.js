// ============================================================================
// physics.js — lightweight 2D circle physics simulated on the jar's XY plane.
// Deliberately not a full 3D rigid-body engine: Suika's feel comes from
// simple, predictable circle packing, so that's what we simulate. game.js
// mirrors each Body's (x, y) onto a three.js mesh at z=0 every frame.
// ============================================================================

export class Body {
  constructor(id, tierIndex, radius, x, y) {
    this.id = id;
    this.tierIndex = tierIndex;
    this.radius = radius;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.rotation = 0;       // visual-only spin
    this.settled = false;
    this.markedForMerge = false;
    this.spawnedAt = performance.now();
  }
}

export class World {
  constructor(config) {
    this.cfg = config;
    this.bodies = new Map();
    this._nextId = 1;
    this.halfWidth = config.JAR.innerWidth / 2;
    this.floorY = config.JAR.floorY;
    this.ceilingY = config.JAR.innerHeight;
    this.pendingMerges = [];   // filled by step(), drained by game.js
    this.pendingPops = [];     // max-tier + max-tier merges
  }

  addBody(tierIndex, radius, x, y) {
    const b = new Body(this._nextId++, tierIndex, radius, x, y);
    this.bodies.set(b.id, b);
    return b;
  }

  removeBody(id) {
    this.bodies.delete(id);
  }

  /** Highest point currently occupied by a *settled* body, for danger-line checks. */
  highestSettledTop() {
    let top = 0;
    for (const b of this.bodies.values()) {
      if (b.settled) top = Math.max(top, b.y + b.radius);
    }
    return top;
  }

  step(dtSeconds) {
    const cfg = this.cfg.PHYSICS;
    const g = cfg.gravity;
    const bodies = Array.from(this.bodies.values());

    // ---- Integrate ----
    for (const b of bodies) {
      b.vy -= g * dtSeconds;
      const dampF = Math.pow(cfg.linearDamping, dtSeconds);
      b.vx *= dampF;
      b.vy *= dampF;

      const speed = Math.hypot(b.vx, b.vy);
      if (speed > cfg.maxVelocity) {
        const s = cfg.maxVelocity / speed;
        b.vx *= s; b.vy *= s;
      }

      b.x += b.vx * dtSeconds;
      b.y += b.vy * dtSeconds;

      // visual rolling - only rotate when actually moving
      if (speed > 0.1) {
        b.rotation -= (b.vx / Math.max(b.radius, 1)) * dtSeconds;
      }
    }

    // ---- Walls / floor ----
    for (const b of bodies) {
      const minX = -this.halfWidth + b.radius;
      const maxX = this.halfWidth - b.radius;
      if (b.x < minX) { b.x = minX; b.vx = -b.vx * cfg.wallRestitution; }
      if (b.x > maxX) { b.x = maxX; b.vx = -b.vx * cfg.wallRestitution; }

      const minY = this.floorY + b.radius;
      if (b.y < minY) {
        b.y = minY;
        b.vy = b.vy < 0 ? -b.vy * cfg.wallRestitution : b.vy;
      }
    }

    // ---- Circle-circle collisions (a few relaxation substeps for stability) ----
    for (let s = 0; s < cfg.substeps; s++) {
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          this._resolvePair(bodies[i], bodies[j], cfg);
        }
      }
    }

    // ---- Settle detection ----
    // Simple velocity threshold. highestSettledTop() is polled continuously
    // by the danger-line check, so brief single-frame flicker here doesn't
    // matter — a genuinely-piled-high jar stays above the threshold steadily.
    for (const b of bodies) {
      b.settled = Math.hypot(b.vx, b.vy) < cfg.restVelocityEpsilon;
    }
  }

  _resolvePair(a, b, cfg) {
    if (a.markedForMerge || b.markedForMerge) return;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const minDist = a.radius + b.radius;

    // Same tier + within a small touch tolerance of each other => merge,
    // checked *before* the strict-overlap early return below. Two circles
    // can settle exactly tangent (dist === minDist) without ever technically
    // overlapping — with only the strict check they'd sit there forever
    // looking merged to the player but never actually triggering. A couple
    // world units of tolerance covers that without affecting the felt sizes.
    const MERGE_TOUCH_TOLERANCE = 3;
    if (a.tierIndex === b.tierIndex && dist < minDist + MERGE_TOUCH_TOLERANCE) {
      a.markedForMerge = true;
      b.markedForMerge = true;
      this.pendingMerges.push({ a, b });
      return;
    }

    if (dist >= minDist) return;

    const nx = dx / dist, ny = dy / dist;
    const overlap = minDist - dist;

    // Positional correction, weighted by inverse "mass" (~ area)
    const massA = a.radius * a.radius, massB = b.radius * b.radius;
    const totalMass = massA + massB;
    const corrA = overlap * (massB / totalMass);
    const corrB = overlap * (massA / totalMass);
    a.x -= nx * corrA; a.y -= ny * corrA;
    b.x += nx * corrB; b.y += ny * corrB;

    // Velocity impulse along normal
    const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
    const velAlongNormal = rvx * nx + rvy * ny;
    if (velAlongNormal > 0) return; // separating already

    const restitution = cfg.restitution;
    const impulse = -(1 + restitution) * velAlongNormal / (1 / massA + 1 / massB);
    const ix = impulse * nx, iy = impulse * ny;
    a.vx -= ix / massA; a.vy -= iy / massA;
    b.vx += ix / massB; b.vy += iy / massB;
  }

  /** Drains and returns merges detected this step; caller applies game logic. */
  drainMerges() {
    const merges = this.pendingMerges;
    this.pendingMerges = [];
    return merges;
  }
}
