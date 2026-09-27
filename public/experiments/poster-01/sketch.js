let spaceGrotesk;

let cards = [];
let particles = [];
let settledDots = [];
let slashes = [];
let labelsDropping = false;

const BACKDROP = "#ebe9e3";
const BG = "#f4f4f1";
const CYAN = "#6ac7d9";
const STEM = "#b6947d";
const CARD_FILL = "#f7f7f4";
const OUTER_BORDER = "#deded6";

const POSTER_RATIO = 1 / 1.414;
const PARTICLES_PER_FRUIT = 320;
const SOFT_STEPS = 14;
const PILE_BIN = 8;
const GLOBAL_FRUIT_SCALE = 1.04;

let poster = { x: 0, y: 0, w: 0, h: 0 };
let pileHeights = [];

const FRUIT_ORDER = [
  "cherry",
  "pear",
  "apple",
  "grapes",
  "peach",
  "banana",
  "raspberry",
  "dragonfruit",
  "watermelon",
  "pineapple",
  "strawberry",
  "orange"
];

function preload() {
  spaceGrotesk = loadFont("Space Grotesk.ttf");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(displayDensity());
  textFont(spaceGrotesk);
  textStyle(NORMAL);
  noCursor();
  rebuildPoster();
}

window.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "lab-visibility") return;
  if (event.data.active) {
    loop();
  } else {
    noLoop();
  }
});

function draw() {
  background(BACKDROP);

  if (!labelsDropping && cards.length > 0 && cards.every(c => c.sliced)) {
    startDrop();
  }

  drawPosterBase();

  for (let d of settledDots) d.draw();

  for (let card of cards) {
    card.updateDrop();
    card.draw();
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].draw();
    if (particles[i].dead) particles.splice(i, 1);
  }

  for (let i = slashes.length - 1; i >= 0; i--) {
    slashes[i].update();
    slashes[i].draw();
    if (slashes[i].dead) slashes.splice(i, 1);
  }

  drawSignature();
  drawCursor();
}

function mousePressed() {
  slashes.push(new Slash(mouseX - 18, mouseY - 18, mouseX + 18, mouseY + 18, true));

  for (let i = cards.length - 1; i >= 0; i--) {
    const c = cards[i];
    if (!c.sliced && c.hitPoint(mouseX, mouseY)) {
      c.slice(mouseX - 26, mouseY - 26, mouseX + 26, mouseY + 26);
      break;
    }
  }
}

function mouseDragged() {
  slashes.push(new Slash(pmouseX, pmouseY, mouseX, mouseY, false));

  for (let i = cards.length - 1; i >= 0; i--) {
    const c = cards[i];
    if (!c.sliced && c.hitSegment(pmouseX, pmouseY, mouseX, mouseY)) {
      c.slice(pmouseX, pmouseY, mouseX, mouseY);
    }
  }
  return false;
}

function touchMoved() {
  return mouseDragged();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  rebuildPoster();
}

function rebuildPoster() {
  computePosterRect();

  cards = [];
  particles = [];
  settledDots = [];
  slashes = [];
  labelsDropping = false;

  pileHeights = new Array(ceil(poster.w / PILE_BIN) + 2).fill(0);

  const layouts = getLayouts();
  layouts.forEach((cfg, i) => {
    cards.push(
      new PosterFruitCard(
        i + 1,
        FRUIT_ORDER[i % FRUIT_ORDER.length],
        cfg.x,
        cfg.y,
        cfg.w,
        cfg.h,
        cfg.z || 0
      )
    );
  });

  cards.sort((a, b) => a.z - b.z);
}

function computePosterRect() {
  let maxW = width * 0.97;
  let maxH = height * 0.97;
  let w = min(maxW, maxH * POSTER_RATIO);
  let h = w / POSTER_RATIO;

  if (h > maxH) {
    h = maxH;
    w = h * POSTER_RATIO;
  }

  poster.w = w;
  poster.h = h;
  poster.x = (width - w) * 0.5;
  poster.y = (height - h) * 0.5;
}

function startDrop() {
  labelsDropping = true;
  for (let c of cards) c.startDrop();
}

function getLayouts() {
  return [
    rBox(0.03, 0.04, 0.24, 0.21, 1),   // cherry
    rBox(0.22, 0.02, 0.31, 0.31, 2),   // pear
    rBox(0.58, 0.03, 0.27, 0.22, 1),   // apple
    rBox(0.72, 0.21, 0.21, 0.23, 3),   // grapes

    rBox(0.05, 0.24, 0.30, 0.27, 0.9),   // peach
    rBox(0.38, 0.25, 0.25, 0.22, 2),   // banana
    rBox(0.09, 0.52, 0.34, 0.18, 1),   // raspberry
    rBox(0.42, 0.47, 0.25, 0.25, 2),   // dragonfruit

    rBox(0.65, 0.46, 0.26, 0.23, 3),   // watermelon
    rBox(0.17, 0.71, 0.24, 0.21, 2),   // pineapple
    rBox(0.47, 0.72, 0.23, 0.19, 2),   // strawberry
    rBox(0.72, 0.78, 0.24, 0.20, 2)    // orange
  ];
}

function rBox(x, y, w, h, z) {
  return {
    x: poster.x + x * poster.w,
    y: poster.y + y * poster.h,
    w: w * poster.w,
    h: h * poster.h,
    z
  };
}

class PosterFruitCard {
  constructor(index, type, x, y, w, h, z) {
    this.index = index;
    this.type = type;
    this.name = prettyName(type);
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.z = z;

    this.sliced = false;
    this.spec = fruitSpec(type);

    this.dropOn = false;
    this.dropOffY = 0;
    this.dropVy = 0;
    this.dropAlpha = 200;

    this.frame = this.computeFruitFrame();
    this.selection = selectionBounds(this.spec.hitBlobs, this.frame);

    this.g = createGraphics(max(1, floor(w)), max(1, floor(h)));
    this.g.pixelDensity(displayDensity());
    this.renderFruit();
  }

  computeFruitFrame() {
    const rawScale = (this.spec.boxScale || 0.92) * GLOBAL_FRUIT_SCALE;
    const s = min(this.w, this.h) * rawScale;
    const ox = (this.spec.boxOffsetX || 0) * s;
    const oy = (this.spec.boxOffsetY || 0) * s;
    return {
      x: (this.w - s) * 0.5 + ox,
      y: (this.h - s) * 0.5 + oy,
      s
    };
  }

  renderFruit() {
    const g = this.g;
    const f = this.frame;
    const s = f.s;

    g.clear();
    g.push();
    g.noStroke();

    for (let b of this.spec.blobs) {
      drawSoftBlob(g, f.x + b.x * s, f.y + b.y * s, b.w * s, b.h * s, b.col, b.alpha, b.ang || 0);
      drawBlobOutline(g, f.x + b.x * s, f.y + b.y * s, b.w * s, b.h * s, b.col, b.ang || 0, b.outScale || 1);
    }

    for (let d of this.spec.details) {
      if (d.kind === "blob") {
        drawSoftBlob(
          g,
          f.x + d.x * s,
          f.y + d.y * s,
          d.w * s,
          d.h * s,
          d.col,
          d.alpha,
          d.ang || 0,
          max(8, SOFT_STEPS - 2)
        );
        if (d.outline !== false) {
          drawBlobOutline(g, f.x + d.x * s, f.y + d.y * s, d.w * s, d.h * s, d.col, d.ang || 0, 0.78);
        }
      } else if (d.kind === "ellipse") {
        g.push();
        g.translate(f.x + d.x * s, f.y + d.y * s);
        g.rotate(d.ang || 0);
        const c = color(d.col);
        g.noStroke();
        g.fill(red(c), green(c), blue(c), d.alpha);
        g.ellipse(0, 0, d.w * s, d.h * s);
        g.pop();
      } else if (d.kind === "stroke") {
        drawStem(g, d.points, d.weight * s, d.col || STEM, f);
      } else if (d.kind === "line") {
        const c = color(d.col || STEM);
        g.push();
        g.stroke(red(c), green(c), blue(c), 255);
        g.strokeWeight(d.weight * s);
        g.strokeCap(ROUND);
        g.noFill();
        g.line(f.x + d.x1 * s, f.y + d.y1 * s, f.x + d.x2 * s, f.y + d.y2 * s);
        g.pop();
      }
    }

    g.pop();
  }

  startDrop() {
    if (this.dropOn) return;
    this.dropOn = true;
    this.dropVy = random(1.8, 3.6);
  }

  updateDrop() {
    if (!this.dropOn) return;
    this.dropOffY += this.dropVy;
    this.dropVy += 0.18;
    this.dropAlpha *= 0.975;
  }

  draw() {
    if (this.dropAlpha < 3) return;

    const y = this.y + this.dropOffY;

    push();
    noStroke();
    fill(247, 247, 244, this.dropAlpha * 0.92);
    rect(this.x, y, this.w, this.h);
    stroke(230, this.dropAlpha);
    strokeWeight(1);
    noFill();
    rect(this.x, y, this.w, this.h);
    pop();

    if (!this.sliced) {
      image(this.g, this.x, y, this.w, this.h);
    }

    this.drawSelection(y);
    this.drawLabel(y);
  }

  drawSelection(drawY) {
    if (this.dropAlpha < 3) return;

    const b = this.selection;
    const x = this.x + b.x;
    const y = drawY + b.y;
    const w = b.w;
    const h = b.h;

    push();
    noFill();
    stroke(106, 199, 217, this.dropAlpha);
    strokeWeight(1.2);
    rect(x, y, w, h);

    const handles = [
      [x, y], [x + w * 0.5, y], [x + w, y],
      [x, y + h * 0.5], [x + w, y + h * 0.5],
      [x, y + h], [x + w * 0.5, y + h], [x + w, y + h]
    ];

    for (let p of handles) {
      fill(BG);
      stroke(106, 199, 217, this.dropAlpha);
      strokeWeight(1);
      rect(p[0] - 3, p[1] - 3, 6, 6);
    }
    pop();
  }

  drawLabel(drawY) {
    if (this.dropAlpha < 3) return;

    push();
    textFont(spaceGrotesk);
    noStroke();
    fill(45, this.dropAlpha);
    textAlign(LEFT, TOP);
    textSize(max(14, min(this.w, this.h) * 0.072));
    text(nf(this.index, 2) + ".", this.x + 11, drawY + 11);

    fill(80, this.dropAlpha * 0.95);
    textSize(max(13, min(this.w, this.h) * 0.054));
    text(this.name, this.x + 11, drawY + this.h - 22);
    pop();
  }

  hitPoint(wx, wy) {
    const lx = (wx - this.x - this.frame.x) / this.frame.s;
    const ly = (wy - this.y - this.frame.y) / this.frame.s;
    return pointInFruitSpec(lx, ly, this.spec.hitBlobs);
  }

  hitSegment(x1, y1, x2, y2) {
    const samples = 28;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const wx = lerp(x1, x2, t);
      const wy = lerp(y1, y2, t);
      if (this.hitPoint(wx, wy)) return true;
    }
    return false;
  }

  slice(x1, y1, x2, y2) {
    if (this.sliced) return;
    this.sliced = true;

    let dir = createVector(x2 - x1, y2 - y1);
    if (dir.mag() < 0.001) dir = createVector(1, -1);
    dir.normalize();
    const normal = createVector(-dir.y, dir.x);

    for (let i = 0; i < PARTICLES_PER_FRUIT; i++) {
      const blob = random(this.spec.particleBlobs);
      const local = sampleBlobPoint(blob, this.frame);
      const wx = this.x + local.x;
      const wy = this.y + local.y;
      const d = pointSegmentDistance(wx, wy, x1, y1, x2, y2);
      const boost = map(constrain(d, 0, 150), 0, 150, 1.7, 0.58);

      const v1 = dir.copy().mult(random(1.4, 5.2) * boost);
      const v2 = normal.copy().mult(random(-3.8, 3.8) * boost);
      const v3 = p5.Vector.random2D().mult(random(0.5, 2.4));
      const vel = v1.add(v2).add(v3);

      particles.push(
        new DotParticle(
          wx,
          wy,
          vel.x,
          vel.y,
          random(6, 13),
          blob.col,
          random(130, 250)
        )
      );
    }

    slashes.push(new Slash(x1, y1, x2, y2, true));
  }
}

class DotParticle {
  constructor(x, y, vx, vy, s, col, life) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.s = s;
    this.col = col;
    this.life = life;
    this.maxLife = life;
    this.dead = false;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.09;
    this.vx *= 0.992;
    this.vy *= 0.996;
    this.life--;

    if (this.y >= poster.y + poster.h - 22) {
      const localX = this.x - poster.x;
      const bin = constrain(floor(localX / PILE_BIN), 0, pileHeights.length - 1);
      const stackY = poster.y + poster.h - 18 - pileHeights[bin] * 1.18 + random(-1.4, 1.4);

      settledDots.push(
        new SettledDot(
          this.x + random(-2, 2),
          stackY,
          this.s * random(0.84, 1.12),
          this.col
        )
      );

      pileHeights[bin] += random(0.5, 1.1);
      this.dead = true;
    }

    if (
      this.life <= 0 ||
      this.x < poster.x - 60 ||
      this.x > poster.x + poster.w + 60 ||
      this.y < poster.y - 60 ||
      this.y > poster.y + poster.h + 100
    ) {
      this.dead = true;
    }
  }

  draw() {
    const c = color(this.col);
    const a = map(this.life, 0, this.maxLife, 0, 220);

    push();
    blendMode(ADD);
    noStroke();
    fill(red(c), green(c), blue(c), a * 0.035);
    circle(this.x, this.y, this.s * 1.18);
    fill(red(c), green(c), blue(c), a * 0.06);
    circle(this.x, this.y, this.s * 1.02);
    pop();

    noStroke();
    fill(red(c), green(c), blue(c), a * 0.34);
    circle(this.x, this.y, this.s * 1.02);

    fill(red(c), green(c), blue(c), a * 0.92);
    circle(this.x, this.y, this.s * 0.82);
  }
}

class SettledDot {
  constructor(x, y, s, col) {
    this.x = x;
    this.y = y;
    this.s = s;
    this.col = col;
  }

  draw() {
    const c = color(this.col);

    push();
    blendMode(ADD);
    noStroke();
    fill(red(c), green(c), blue(c), 8);
    circle(this.x, this.y, this.s * 1.18);
    pop();

    noStroke();
    fill(red(c), green(c), blue(c), 55);
    circle(this.x, this.y, this.s * 1.02);

    fill(red(c), green(c), blue(c), 140);
    circle(this.x, this.y, this.s * 0.84);
  }
}

class Slash {
  constructor(x1, y1, x2, y2, heavy) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.life = heavy ? 18 : 10;
    this.maxLife = this.life;
    this.heavy = heavy;
    this.dead = false;
  }

  update() {
    this.life--;
    if (this.life <= 0) this.dead = true;
  }

  draw() {
    const a = map(this.life, 0, this.maxLife, 0, this.heavy ? 185 : 105);
    const w = map(this.life, 0, this.maxLife, 1, this.heavy ? 18 : 8);

    push();
    blendMode(ADD);
    noFill();
    strokeCap(ROUND);

    stroke(255, a * 0.08);
    strokeWeight(w + 8);
    line(this.x1, this.y1, this.x2, this.y2);

    stroke(255, a * 0.18);
    strokeWeight(w + 3);
    line(this.x1, this.y1, this.x2, this.y2);

    stroke(255, a * 0.75);
    strokeWeight(w);
    line(this.x1, this.y1, this.x2, this.y2);

    stroke(140, 220, 255, a * 0.26);
    strokeWeight(w * 0.32);
    line(this.x1 + 2, this.y1 - 2, this.x2 + 2, this.y2 - 2);
    pop();
  }
}

function drawPosterBase() {
  push();
  noStroke();
  fill(BG);
  rect(poster.x, poster.y, poster.w, poster.h);

  noFill();
  stroke(OUTER_BORDER);
  strokeWeight(1);
  rect(poster.x, poster.y, poster.w, poster.h);
  pop();
}

function drawSignature() {
  push();
  textFont(spaceGrotesk);
  textAlign(LEFT, TOP);
  noStroke();
  fill(55, 55, 55, 180);
  textSize(max(16, poster.w * 0.022));
  text("© Sudorein", poster.x + 570, poster.y + 10);
  pop();
}

function drawCursor() {
  if (
    mouseX < poster.x || mouseX > poster.x + poster.w ||
    mouseY < poster.y || mouseY > poster.y + poster.h
  ) return;

  const dx = mouseX - pmouseX;
  const dy = mouseY - pmouseY;
  const angle = atan2(dy, dx);
  const speed = constrain(dist(mouseX, mouseY, pmouseX, pmouseY), 0, 18);

  push();
  translate(mouseX, mouseY);
  rotate(angle);
  blendMode(ADD);
  noStroke();

  fill(165, 220, 255, 8);
  ellipse(-10 - speed * 0.6, 0, 18 + speed * 1.4, 12 + speed * 0.8);

  fill(255, 220, 205, 10);
  ellipse(-2, 0, 14, 11);

  fill(255, 255, 255, 18);
  ellipse(0, 0, 9, 9);

  fill(255, 250, 245, 140);
  ellipse(0, 0, 3.4, 3.4);

  fill(255, 255, 255, 55);
  ellipse(1.8, -1.6, 1.5, 1.5);
  pop();
}

function drawSoftBlob(g, x, y, w, h, hex, alpha, ang, steps = SOFT_STEPS) {
  const c = color(hex);
  g.push();
  g.translate(x, y);
  g.rotate(ang || 0);
  g.noStroke();

  for (let i = steps; i >= 1; i--) {
    const t = i / steps;
    const ww = lerp(w * 1.30, w * 0.82, 1 - t);
    const hh = lerp(h * 1.30, h * 0.82, 1 - t);
    const a = alpha * lerp(0.022, 0.16, 1 - t);
    g.fill(red(c), green(c), blue(c), a);
    g.ellipse(0, 0, ww, hh);
  }

  g.fill(red(c), green(c), blue(c), alpha * 0.23);
  g.ellipse(0, 0, w * 0.72, h * 0.72);
  g.pop();
}

function drawBlobOutline(g, x, y, w, h, hex, ang, weightScale = 1) {
  const base = color(hex);
  const oc = color(red(base) * 0.78, green(base) * 0.78, blue(base) * 0.78);

  g.push();
  g.translate(x, y);
  g.rotate(ang || 0);
  g.noFill();

  g.stroke(red(oc), green(oc), blue(oc), 92);
  g.strokeWeight(max(1.0, min(w, h) * 0.016 * weightScale));
  g.ellipse(0, 0, w * 0.93, h * 0.93);

  g.stroke(red(oc), green(oc), blue(oc), 32);
  g.strokeWeight(max(0.8, min(w, h) * 0.009 * weightScale));
  g.ellipse(0, 0, w * 1.03, h * 1.03);
  g.pop();
}

function drawStem(g, pts, weight, col = STEM, frame) {
  const c = color(col);
  g.push();
  g.noFill();
  g.stroke(red(c), green(c), blue(c), 255);
  g.strokeWeight(weight);
  g.strokeCap(ROUND);
  g.beginShape();
  g.curveVertex(frame.x + pts[0][0] * frame.s, frame.y + pts[0][1] * frame.s);
  for (let p of pts) {
    g.curveVertex(frame.x + p[0] * frame.s, frame.y + p[1] * frame.s);
  }
  const last = pts[pts.length - 1];
  g.curveVertex(frame.x + last[0] * frame.s, frame.y + last[1] * frame.s);
  g.endShape();
  g.pop();
}

function pointInFruitSpec(x, y, blobs) {
  for (let b of blobs) {
    if (pointInBlobNormalized(x, y, b)) return true;
  }
  return false;
}

function pointInBlobNormalized(x, y, b) {
  const dx = x - b.x;
  const dy = y - b.y;
  const a = -(b.ang || 0);
  const rx = dx * cos(a) - dy * sin(a);
  const ry = dx * sin(a) + dy * cos(a);
  const ex = rx / (b.w * 0.5);
  const ey = ry / (b.h * 0.5);
  return ex * ex + ey * ey <= 1;
}

function sampleBlobPoint(blob, frame) {
  let rx = randomGaussian() * blob.w * 0.16;
  let ry = randomGaussian() * blob.h * 0.16;
  rx = constrain(rx, -blob.w * 0.42, blob.w * 0.42);
  ry = constrain(ry, -blob.h * 0.42, blob.h * 0.42);

  const a = blob.ang || 0;
  const xx = rx * cos(a) - ry * sin(a);
  const yy = rx * sin(a) + ry * cos(a);

  return createVector(
    frame.x + (blob.x + xx) * frame.s,
    frame.y + (blob.y + yy) * frame.s
  );
}

function selectionBounds(blobs, frame) {
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (let b of blobs) {
    minX = min(minX, b.x - b.w * 0.62);
    maxX = max(maxX, b.x + b.w * 0.62);
    minY = min(minY, b.y - b.h * 0.62);
    maxY = max(maxY, b.y + b.h * 0.62);
  }
  const pad = frame.s * 0.04;
  return {
    x: frame.x + minX * frame.s - pad,
    y: frame.y + minY * frame.s - pad,
    w: (maxX - minX) * frame.s + pad * 2,
    h: (maxY - minY) * frame.s + pad * 2
  };
}

function pointSegmentDistance(px, py, x1, y1, x2, y2) {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  const t = lenSq === 0 ? 0 : constrain(dot / lenSq, 0, 1);
  const xx = x1 + C * t;
  const yy = y1 + D * t;
  return dist(px, py, xx, yy);
}

function prettyName(type) {
  const map = {
    cherry: "Cherry",
    pear: "Pear",
    apple: "Apple",
    grapes: "Grapes",
    peach: "Peach",
    raspberry: "Raspberry",
    banana: "Banana",
    dragonfruit: "Dragonfruit",
    watermelon: "Watermelon",
    pineapple: "Pineapple",
    strawberry: "Strawberry",
    orange: "Orange"
  };
  return map[type] || type;
}

function b(x, y, w, h, col, alpha = 96, ang = 0, outScale = 1) {
  return { x, y, w, h, col, alpha, ang, outScale };
}

function fruitSpec(type) {
  let blobs = [];
  let details = [];
  let hitBlobs = [];
  let boxScale = 0.92;
  let boxOffsetX = 0;
  let boxOffsetY = 0;

  if (type === "cherry") {
    boxScale = 1;
    blobs = [
      b(0.41, 0.56, 0.17, 0.22, "#f2a8bf", 112, -0.55),
      b(0.58, 0.61, 0.18, 0.24, "#f3b091", 112, 0.42),
      b(0.49, 0.57, 0.20, 0.11, "#ff612d", 126, -0.10),
      b(0.35, 0.66, 0.09, 0.11, "#e89ab9", 94),
      b(0.64, 0.48, 0.08, 0.10, "#f5b0cc", 78)
    ];
    details = [
      { kind: "stroke", points: [[0.16, 0.28], [0.29, 0.40], [0.43, 0.55]], weight: 0.014 },
      { kind: "stroke", points: [[0.76, 0.16], [0.64, 0.29], [0.51, 0.50]], weight: 0.013 },
      { kind: "stroke", points: [[0.58, 0.35], [0.58, 0.45], [0.57, 0.59]], weight: 0.0065 }
    ];
  }

  else if (type === "pear") {
    boxScale = 0.88;
    boxOffsetY = -0.01;
    blobs = [
      b(0.51, 0.38, 0.28, 0.29, "#d6ecd1", 106),
      b(0.50, 0.63, 0.37, 0.42, "#d8edd1", 112),
      b(0.50, 0.61, 0.31, 0.36, "#c7e2c1", 80),
      b(0.45, 0.70, 0.08, 0.06, "#ffffff", 210, 0.7),
      b(0.49, 0.73, 0.07, 0.05, "#ffffff", 205, -0.2)
    ];
    details = [
      { kind: "blob", x: 0.44, y: 0.71, w: 0.05, h: 0.10, col: "#a8cf81", alpha: 130, ang: 0.8 },
      { kind: "stroke", points: [[0.52, 0.12], [0.53, 0.18], [0.54, 0.29]], weight: 0.0135 },
      { kind: "line", x1: 0.58, y1: 0.68, x2: 0.57, y2: 0.79, weight: 0.0115 }
    ];
  }

  else if (type === "apple") {
    boxScale = 0.99;
    blobs = [
      b(0.50, 0.57, 0.46, 0.45, "#f26b6b", 110),
      b(0.44, 0.56, 0.20, 0.13, "#ff8a7a", 102, -0.1),
      b(0.54, 0.56, 0.18, 0.13, "#e84f5f", 100, 0.15),
      b(0.60, 0.53, 0.12, 0.11, "#ffb0a3", 84),
      b(0.50, 0.60, 0.46, 0.43, "#d94a57", 24)
    ];
    details = [
      { kind: "stroke", points: [[0.50, 0.18], [0.53, 0.30], [0.52, 0.44]], weight: 0.011 }
    ];
  }

  else if (type === "grapes") {
   boxScale = 1.3;
  boxOffsetY = -0.02;
  blobs = [
    b(0.49, 0.34, 0.11, 0.13, "#8d86f6", 106),
    b(0.57, 0.35, 0.11, 0.13, "#9f97ff", 106),

    b(0.44, 0.46, 0.11, 0.13, "#7268e8", 106),
    b(0.52, 0.47, 0.11, 0.13, "#b0a8ff", 104),
    b(0.60, 0.47, 0.11, 0.13, "#9d93f7", 104),

    b(0.40, 0.59, 0.11, 0.13, "#5f56d8", 106),
    b(0.48, 0.59, 0.11, 0.13, "#8f86f1", 104),
    b(0.56, 0.60, 0.11, 0.13, "#b4adff", 104),
    b(0.64, 0.59, 0.11, 0.13, "#847be9", 104),

    b(0.45, 0.72, 0.11, 0.13, "#746ae2", 104),
    b(0.53, 0.73, 0.11, 0.13, "#c3bcff", 104),
    b(0.61, 0.72, 0.11, 0.13, "#958cf0", 104)
  ];
  details = [
    { kind: "stroke", points: [[0.52, 0.10], [0.52, 0.19], [0.52, 0.29]], weight: 0.0105 },
    { kind: "stroke", points: [[0.52, 0.28], [0.47, 0.33], [0.44, 0.40]], weight: 0.0065 },
    { kind: "stroke", points: [[0.52, 0.28], [0.58, 0.33], [0.61, 0.40]], weight: 0.0065 }
    ];
  }

  else if (type === "peach") {
    boxScale = 1.00;
    boxOffsetY = 0.01;
    blobs = [
      b(0.50, 0.60, 0.34, 0.34, "#f5d0b4", 108),
      b(0.43, 0.62, 0.17, 0.24, "#ffd38b", 88, -0.18),
      b(0.59, 0.61, 0.17, 0.23, "#ffbf9b", 86, 0.16),
      b(0.51, 0.62, 0.10, 0.22, "#f2b6a2", 46),
      b(0.56, 0.51, 0.08, 0.07, "#fff2de", 90)
    ];
    details = [
      { kind: "blob", x: 0.56, y: 0.36, w: 0.10, h: 0.13, col: "#98d56b", alpha: 96, ang: 0.38 },
      { kind: "line", x1: 0.50, y1: 0.46, x2: 0.50, y2: 0.72, weight: 0.0046, col: "#d3a28d" }
    ];
  }

  else if (type === "banana") {
    boxScale = 1.19;
    boxOffsetY = -0.09;
    blobs = [
      b(0.43, 0.63, 0.27, 0.13, "#ffd54c", 116, -0.70),
      b(0.52, 0.56, 0.26, 0.13, "#ffeb76", 104, -0.60),
      b(0.61, 0.49, 0.19, 0.09, "#fff19d", 90, -0.52),
      b(0.39, 0.69, 0.13, 0.08, "#ffc048", 82, -0.74)
    ];
    details = [
      { kind: "line", x1: 0.29, y1: 0.71, x2: 0.25, y2: 0.73, weight: 0.009, col: "#c9a88e" },
      { kind: "line", x1: 0.64, y1: 0.42, x2: 0.67, y2: 0.40, weight: 0.009, col: "#c9a88e" }
    ];
  }

  else if (type === "raspberry") {
    boxScale = 1.00;
    const centers = [
      [0.44, 0.42], [0.52, 0.42], [0.60, 0.42],
      [0.40, 0.52], [0.48, 0.52], [0.56, 0.52], [0.64, 0.52],
      [0.44, 0.62], [0.52, 0.62], [0.60, 0.62],
      [0.48, 0.72], [0.56, 0.72]
    ];
    blobs = centers.map((p, i) =>
      b(p[0], p[1], 0.088, 0.112, i % 3 === 0 ? "#ff5c4c" : i % 3 === 1 ? "#ff4f46" : "#ff6952", 120)
    );
    details = [
      { kind: "stroke", points: [[0.53, 0.16], [0.52, 0.27], [0.53, 0.42]], weight: 0.0102 }
    ];
  }

  else if (type === "dragonfruit") {
    boxScale = 0.98;
    blobs = [
      b(0.50, 0.58, 0.32, 0.43, "#f4cde6", 108),
      b(0.42, 0.40, 0.11, 0.12, "#ececf1", 90),
      b(0.50, 0.36, 0.12, 0.14, "#f1eef2", 92),
      b(0.58, 0.40, 0.11, 0.12, "#ece8ef", 88),
      b(0.40, 0.70, 0.10, 0.24, "#d7e249", 108, -0.22),
      b(0.60, 0.70, 0.10, 0.24, "#d7e249", 108, 0.22)
    ];
    details = [
      { kind: "stroke", points: [[0.49, 0.82], [0.48, 0.91], [0.45, 0.99]], weight: 0.012 }
    ];
  }

  else if (type === "watermelon") {
    boxScale = 1.5;
    boxOffsetY = -0.09;
    blobs = [
      b(0.50, 0.63, 0.36, 0.30, "#ff4c5b", 118),
      b(0.50, 0.74, 0.39, 0.09, "#b0ee9d", 110),
      b(0.50, 0.71, 0.34, 0.05, "#fff8ef", 160)
    ];
    details = [
      { kind: "ellipse", x: 0.44, y: 0.62, w: 0.016, h: 0.045, col: "#b6947d", alpha: 220, ang: -0.2 },
      { kind: "ellipse", x: 0.51, y: 0.59, w: 0.016, h: 0.045, col: "#b6947d", alpha: 220, ang: 0.15 },
      { kind: "ellipse", x: 0.58, y: 0.63, w: 0.016, h: 0.045, col: "#b6947d", alpha: 220, ang: -0.1 }
    ];
  }

  else if (type === "pineapple") {
    boxScale = 1.00;
    boxOffsetY = 0.02;
    blobs = [
      b(0.50, 0.64, 0.23, 0.34, "#ffd64a", 110),
      b(0.42, 0.39, 0.10, 0.20, "#96df7c", 102, -0.5),
      b(0.50, 0.31, 0.10, 0.24, "#89de9f", 98),
      b(0.58, 0.39, 0.10, 0.20, "#79d89f", 102, 0.5)
    ];
    details = [
      { kind: "ellipse", x: 0.48, y: 0.62, w: 0.02, h: 0.02, col: "#ff8a32", alpha: 180 },
      { kind: "ellipse", x: 0.53, y: 0.56, w: 0.02, h: 0.02, col: "#ff8a32", alpha: 180 },
      { kind: "ellipse", x: 0.45, y: 0.70, w: 0.02, h: 0.02, col: "#ff8a32", alpha: 180 },
      { kind: "ellipse", x: 0.56, y: 0.67, w: 0.02, h: 0.02, col: "#ff8a32", alpha: 180 }
    ];
  }

  else if (type === "strawberry") {
    boxScale = 1.00;
    blobs = [
      b(0.50, 0.59, 0.24, 0.32, "#ff4f56", 116),
      b(0.45, 0.37, 0.10, 0.12, "#a8dd6b", 106, -0.5),
      b(0.50, 0.33, 0.10, 0.12, "#9ad464", 106),
      b(0.55, 0.37, 0.10, 0.12, "#a8dd6b", 106, 0.5),
      b(0.48, 0.64, 0.07, 0.08, "#ff8b7b", 70)
    ];
    details = [
      { kind: "ellipse", x: 0.45, y: 0.53, w: 0.012, h: 0.02, col: "#fce8a6", alpha: 210, ang: -0.2 },
      { kind: "ellipse", x: 0.52, y: 0.56, w: 0.012, h: 0.02, col: "#fce8a6", alpha: 210, ang: 0.2 },
      { kind: "ellipse", x: 0.49, y: 0.62, w: 0.012, h: 0.02, col: "#fce8a6", alpha: 210, ang: 0.1 }
    ];
  }

  else if (type === "orange") {
    boxScale = 1.08;
    boxOffsetX = 0.02;
    boxOffsetY = 0.02;
    blobs = [
      b(0.50, 0.58, 0.30, 0.30, "#ffb24a", 114),
      b(0.44, 0.52, 0.08, 0.08, "#ffd18b", 76),
      b(0.56, 0.62, 0.07, 0.07, "#ffca7d", 60)
    ];
    details = [
      { kind: "blob", x: 0.53, y: 0.38, w: 0.08, h: 0.11, col: "#99d66b", alpha: 95, ang: 0.35 }
    ];
  }

  hitBlobs = blobs.filter(b => b.alpha > 40);
  return { blobs, details, particleBlobs: hitBlobs.length ? hitBlobs : blobs, hitBlobs, boxScale, boxOffsetX, boxOffsetY };
}
