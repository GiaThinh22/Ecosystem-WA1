let GRID_SIZE = 60;
let herbs = [];
let carns = [];
let foods = [];
let grid;
let showGrid = false;
let hudFontSize = 14;

let START_HERB = parseInt(prompt("Number of Herbivores?", "300"));
let START_CARN = parseInt(prompt("Number of Carnivores?", "12"));



function setup() {
  createCanvas(1000, 700);
  grid = new SpatialGrid(GRID_SIZE);
  for (let i = 0; i < START_HERB; i++)
    herbs.push(new Herbivore(random(width), random(height), new DNA()));

  for (let i = 0; i < START_CARN; i++)
    carns.push(new Carnivore(random(width), random(height), new DNA()));

  for (let i = 0; i < 300; i++)
    foods.push(new Food(random(width), random(height)));

  setInterval(() => {
    for (let i = 0; i < 3; i++)
      foods.push(new Food(random(width), random(height)));
  }, 1000);
}



function draw() {
  background(230);

  grid.clear();
  for (let f of foods) grid.insert(f, f.pos);
  for (let h of herbs) grid.insert(h, h.pos);
  for (let c of carns) grid.insert(c, c.pos);

  for (let h of herbs) {
    h.behave(grid);
    h.update();
    h.render();
  }

  for (let c of carns) {
    c.behave(grid);
    c.update();
    c.render();
  }

  for (let f of foods) f.render();

  herbs = herbs.filter(h => h.energy > 0);

  if (showGrid) grid.draw();

  push();
  fill(20);
  noStroke();
  textSize(hudFontSize);
  text("Herbivores: " + herbs.length, 10, 20);
  text("Carnivores: " + carns.length, 10, 40);
  pop();
}



function keyPressed() {
  if (key === 'G') showGrid = !showGrid;
}



function mutate(v) {
  if (random() < 0.1) v *= random(0.9, 1.1);
  return v;
}



function avgDNA(a, b) {
  return {
    size: (a.size + b.size) / 2,
    maxSpeed: (a.maxSpeed + b.maxSpeed) / 2,
    agility: (a.agility + b.agility) / 2,
    perception: (a.perception + b.perception) / 2
  };
}



function spawnFoodAt(pos) {
  for (let i = 0; i < 3; i++)
    foods.push(new Food(pos.x + random(-10,10), pos.y + random(-10,10)));
}



function resolveCombat(carn, herb) {
  let ratio = random(0.01, 0.05);
  for (let k of ["size", "maxSpeed", "agility", "perception"]) {
    let delta = herb.dna[k] * ratio;
    carn.dna[k] += delta;
    herb.dna[k] -= delta;
  }
  herbs.splice(herbs.indexOf(herb), 1);
}



function nearest(pos, arr) {
  let best = null, bestD = Infinity;
  for (let o of arr) {
    let d = p5.Vector.dist(pos, o.pos);
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return best;
}



function mousePressed() {
  if (mouseButton === LEFT) {
    herbs.push(new Herbivore(mouseX, mouseY, new DNA()));
  }
}



function isWeaker(a, b) {
  for (let k of ["size", "maxSpeed", "agility", "perception"])
    if (a.dna[k] >= b.dna[k]) return false;
  return true;
}
