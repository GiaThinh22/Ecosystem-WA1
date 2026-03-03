class DNA {
  constructor(avg = null) {
    if (avg) {
      this.size = mutate(avg.size);
      this.maxSpeed = mutate(avg.maxSpeed);
      this.agility = mutate(avg.agility);
      this.perception = mutate(avg.perception);
    } else {
      this.size = random(0.6, 1.6);
      this.maxSpeed = random(1.0, 4.5);
      this.agility = random(0.6, 1.6);
      this.perception = random(30, 140);
    }
  }
}




class Agent {
  constructor(x, y, dna) {
    this.dna = dna;
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D();
    this.acc = createVector();

    this.mass = max(0.3, pow(dna.size, 3));
    this.maxSpeed = dna.maxSpeed;
    this.maxForce = this.mass * 0.04 * dna.agility;

    this.energy = 80 * this.mass;
    this.cooldown = 0;
  }

  applyForce(f) {
    f.limit(this.maxForce);
    this.acc.add(f);
  }

  seek(target) {
    let desired = p5.Vector.sub(target, this.pos);
    desired.setMag(this.maxSpeed);
    let steer = p5.Vector.sub(desired, this.vel);
    steer.limit(this.maxForce);
    return steer;
  }

  update() {
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.mult(0);

    this.energy -= (0.0025 * this.mass * this.vel.magSq()) +
                   (0.0008 * this.dna.perception) + 0.02;

    this.cooldown--;
    this.wrap();
  }

  wrap() {
    if (this.pos.x < 0) this.pos.x = width;
    if (this.pos.y < 0) this.pos.y = height;
    if (this.pos.x > width) this.pos.x = 0;
    if (this.pos.y > height) this.pos.y = 0;
  }
}



class Herbivore extends Agent {
  constructor(x, y, dna) {
    super(x, y, dna);
    this.hasEaten = false;
  }

  behave(grid) {
    let nearbyFood = grid.query(this.pos, this.dna.perception, foods);
    let nearbyHerb = grid.query(this.pos, this.dna.perception, herbs);

    if (this.energy < 0.3 * 80 * this.mass || !this.hasEaten) {
      let f = nearest(this.pos, nearbyFood);
      if (f) this.applyForce(this.seek(f.pos));
      if (f && p5.Vector.dist(this.pos, f.pos) < 6 * this.dna.size) {
        this.energy += 25;
        this.hasEaten = true;
        spawnFoodAt(f.pos);
        foods.splice(foods.indexOf(f), 1);
      }
    } else {
      let mate = nearest(this.pos, nearbyHerb.filter(h => h !== this));
      if (mate) this.applyForce(this.seek(mate.pos));
      if (mate && p5.Vector.dist(this.pos, mate.pos) < 8 * this.dna.size)
        this.reproduce(mate);
    }
  }

  reproduce(other) {
    if (this.cooldown > 0 || other.cooldown > 0) return;
    if (this.energy < 0.7 * 80 * this.mass) return;

    let dna = new DNA(avgDNA(this.dna, other.dna));
    herbs.push(new Herbivore(this.pos.x, this.pos.y, dna));

    this.energy *= 0.65;
    other.energy *= 0.65;
    this.cooldown = other.cooldown = 300;
  }

  render() {
    fill(50, 200, 80);
    noStroke();
    circle(this.pos.x, this.pos.y, this.dna.size * 6);
  }
}



class Carnivore extends Agent {
  constructor(x, y, dna) {
    super(x, y, dna);
    this.energy = Infinity;
  }

  behave(grid) {
    let r = this.dna.perception;

    let nearbyHerb = grid.query(this.pos, r, herbs);

    // find herb
    if (nearbyHerb.length > 0) {
      let h = nearest(this.pos, nearbyHerb);
      if (h) this.applyForce(this.seek(h.pos));
      if (h && p5.Vector.dist(this.pos, h.pos) < 7 * this.dna.size)
        resolveCombat(this, h);
      return;
    }

    // no herb, eat carn
    let blockRadius = 5 * grid.size;
    let nearbyCarn = grid.query(this.pos, blockRadius, carns);

    let target = null;
    for (let c of nearbyCarn) {
      if (c !== this && isWeaker(c, this)) {
        target = c;
        break;
      }
    }

    if (target) {
      this.applyForce(this.seek(target.pos));
      if (p5.Vector.dist(this.pos, target.pos) < 7 * this.dna.size) {
        resolveCombat(this, target);
        carns.splice(carns.indexOf(target), 1);
      }
    }
  }


  render() {
    fill(200, 60, 60);
    noStroke();
    circle(this.pos.x, this.pos.y, this.dna.size * 8);
  }
}



class Food {
  constructor(x, y) {
    this.pos = createVector(x, y);
  }

  render() {
    fill(255, 162, 0);
    noStroke();
    circle(this.pos.x, this.pos.y, 4);
  }
}


class SpatialGrid {
  constructor(size) {
    this.size = size;
    this.cells = new Map();
  }

  clear() {
    this.cells.clear();
  }

  insert(obj, pos) {
    let x = floor(pos.x / this.size);
    let y = floor(pos.y / this.size);
    let key = x + "," + y;
    if (!this.cells.has(key)) this.cells.set(key, []);
    this.cells.get(key).push(obj);
  }

  query(pos, r, arr) {
    let found = [];
    let gx = floor(pos.x / this.size);
    let gy = floor(pos.y / this.size);
    let range = ceil(r / this.size);

    for (let dx = -range; dx <= range; dx++)
      for (let dy = -range; dy <= range; dy++) {
        let key = (gx + dx) + "," + (gy + dy);
        if (this.cells.has(key))
          for (let o of this.cells.get(key))
            if (arr.includes(o) && p5.Vector.dist(pos, o.pos) < r)
              found.push(o);
      }
    return found;
  }

  draw() {
    stroke(200);
    for (let x = 0; x < width; x += this.size)
      for (let y = 0; y < height; y += this.size)
        rect(x, y, this.size, this.size);
  }
}