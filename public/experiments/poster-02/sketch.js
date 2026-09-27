let mushroomImg;
let customFont;

let spores = [];
let glitchBars = [];
let rings = [];
let labels = [];
let filmAnchors = [];

let hallucination = 0;
let filmJolt = 0;
let clickedOnce = false;
let t = 0;

const palette = [
  [255, 78, 151],   // pink
  [88, 220, 255],   // cyan
  [255, 232, 70],   // yellow
  [170, 255, 120],  // lime
  [255, 132, 62],   // orange
  [182, 147, 255],  // violet
  [255, 255, 255]   // white
];

const words = [
  "TOXIC",
  "SPORE",
  "AIRBORNE",
  "VISION",
  "DRIFT",
  "TRACE",
  "BLOOM",
  "HALLUCINATION"
];

function preload() {
  mushroomImg = loadImage("mushroom.jpg");
  customFont = loadFont("Space Grotesk.ttf");
}

function setup() {
  createCanvas(720, 960);
  pixelDensity(1);

  imageMode(CENTER);
  textAlign(CENTER, CENTER);
  textFont(customFont);
  noCursor();

  for (let i = 0; i < 10; i++) {
    glitchBars.push(new GlitchBar(false));
  }

  for (let i = 0; i < words.length; i++) {
    labels.push({
      word: words[i],
      seedX: random(1000),
      seedY: random(1000),
      seedR: random(1000),
      size: random(14, 24),
      colorA: palette[floor(random(palette.length - 1))],
      colorB: palette[floor(random(palette.length - 1))]
    });
  }

  buildFilmAnchors();
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
  t += 0.01;
  hallucination *= 0.995;
  hallucination = constrain(hallucination, 0, 1);

  filmJolt *= 0.9;
  filmJolt = constrain(filmJolt, 0, 1.6);

  background(0);

  drawCoverImage();
  drawLiquidFilm();
  drawBloomLights();
  drawGlitchBars();
  updateAndDrawSpores();
  updateAndDrawRings();
  drawFloatingWords();
  drawBottomType();
  drawCustomCursor();
}

function mousePressed() {
  let onCap = isMouseOnMushroom();
  let power = onCap ? 1.0 : 0.65;

  clickedOnce = true;
  hallucination += onCap ? 0.32 : 0.18;
  hallucination = constrain(hallucination, 0, 1);

  filmJolt = max(filmJolt, onCap ? 1.0 : 0.65);

  releaseSpores(mouseX, mouseY, power);
  rings.push(new ToxicRing(mouseX, mouseY, power));

  let count = onCap ? 8 : 4;
  for (let i = 0; i < count; i++) {
    glitchBars.push(new GlitchBar(true, mouseX, mouseY));
  }
}

function buildFilmAnchors() {
  filmAnchors = [
    // cap
    { x: 0.50, y: 0.22, rx: 0.16, ry: 0.055, colA: 0, colB: 1, alpha: 100, phase: 0.1, detail: 0.22 },
    { x: 0.34, y: 0.26, rx: 0.14, ry: 0.06,  colA: 5, colB: 2, alpha: 80, phase: 1.1, detail: 0.18 },
    { x: 0.66, y: 0.26, rx: 0.14, ry: 0.06,  colA: 1, colB: 4, alpha: 90, phase: 2.2, detail: 0.18 },
    { x: 0.50, y: 0.31, rx: 0.23, ry: 0.08,  colA: 2, colB: 0, alpha: 90, phase: 2.8, detail: 0.16 },

    // lower cap / gills zone
    { x: 0.41, y: 0.39, rx: 0.10, ry: 0.045, colA: 3, colB: 1, alpha: 42, phase: 1.7, detail: 0.16 },
    { x: 0.59, y: 0.39, rx: 0.10, ry: 0.045, colA: 4, colB: 5, alpha: 42, phase: 0.8, detail: 0.16 },

    // stem
    { x: 0.60, y: 0.53, rx: 0.07, ry: 0.11,  colA: 1, colB: 0, alpha: 30, phase: 0.4, detail: 0.14 },
    { x: 0.50, y: 0.66, rx: 0.065, ry: 0.13, colA: 5, colB: 2, alpha: 40, phase: 1.9, detail: 0.14 },
    { x: 0.60, y: 0.85, rx: 0.085, ry: 0.07, colA: 4, colB: 1, alpha: 60, phase: 2.5, detail: 0.12 }
  ];
}

function drawCoverImage() {
  let cx = width / 2;
  let cy = height / 2;

  let imgAspect = mushroomImg.width / mushroomImg.height;
  let canvasAspect = width / height;

  let coverW, coverH;
  if (imgAspect > canvasAspect) {
    coverH = height * 1.18;
    coverW = coverH * imgAspect;
  } else {
    coverW = width * 1.18;
    coverH = coverW / imgAspect;
  }

  let driftX = sin(frameCount * 0.025) * hallucination * 18;
  let driftY = cos(frameCount * 0.02) * hallucination * 14;
  let pulse = 1 + sin(frameCount * 0.035) * hallucination * 0.018;

  coverW *= pulse;
  coverH *= pulse;

  push();
  tint(255, 255);
  image(mushroomImg, cx, cy, coverW, coverH);
  pop();

  let split = 10 + hallucination * 34;

  push();
  blendMode(SCREEN);
  tint(255, 70, 150, 65 + hallucination * 90);
  image(mushroomImg, cx - split + driftX, cy - 2, coverW, coverH);
  pop();

  push();
  blendMode(SCREEN);
  tint(80, 230, 255, 55 + hallucination * 85);
  image(mushroomImg, cx + split * 0.9 - driftX * 0.25, cy + 3, coverW, coverH);
  pop();

  push();
  blendMode(SCREEN);
  tint(255, 230, 80, 30 + hallucination * 55);
  image(mushroomImg, cx, cy - split * 0.2 + driftY, coverW, coverH);
  pop();

  if (hallucination > 0.03) {
    let sliceCount = 120;

    for (let i = 0; i < sliceCount; i++) {
      let sy = map(i, 0, sliceCount, 0, mushroomImg.height);
      let sh = mushroomImg.height / sliceCount;

      let dy = map(i, 0, sliceCount, 0, height);
      let dh = height / sliceCount + 2;

      let wave = sin(frameCount * 0.1 + i * 0.23) * hallucination * 18;
      let jitter = map(noise(i * 0.12, t * 2.0), 0, 1, -30, 30) * hallucination;
      let burst = noise(i * 0.2 + 100, t * 5.0) > 0.83 ? random(-85, 85) * hallucination : 0;
      let offsetX = wave + jitter + burst;

      push();
      tint(255, 18 + hallucination * 38);
      image(
        mushroomImg,
        width / 2 + offsetX,
        dy + dh / 2,
        coverW,
        dh,
        0,
        sy,
        mushroomImg.width,
        sh
      );
      pop();
    }
  }

  if (hallucination > 0.08) {
    for (let i = 0; i < 22; i++) {
      let sx = random(mushroomImg.width * 0.08, mushroomImg.width * 0.92);
      let sw = random(10, 36);
      let dx = map(sx, 0, mushroomImg.width, 0, width) + random(-50, 50) * hallucination;
      let dw = sw * (width / mushroomImg.width) * random(0.7, 1.35);

      push();
      tint(255, random(16, 40));
      image(
        mushroomImg,
        dx,
        height / 2 + random(-22, 22) * hallucination,
        dw,
        height * 1.22,
        sx,
        0,
        sw,
        mushroomImg.height
      );
      pop();
    }
  }

  if (hallucination > 0.12) {
    let echoes = 10;
    for (let i = 0; i < echoes; i++) {
      let a = TWO_PI * i / echoes + frameCount * 0.012;
      let r = 18 + hallucination * 46;
      let ex = cos(a) * r;
      let ey = sin(a) * r * 0.72;

      push();
      tint(255, 10 + hallucination * 18);
      image(mushroomImg, cx + ex, cy + ey, coverW, coverH);
      pop();
    }
  }

  if (hallucination > 0.1) {
    for (let y = 0; y < height; y += 3) {
      let rr = 200 + 55 * sin(y * 0.03 + frameCount * 0.08);
      let gg = 120 + 120 * noise(y * 0.01, t * 3.0);
      let bb = 180 + 75 * cos(y * 0.02 + frameCount * 0.06);
      stroke(rr, gg, bb, 4 + hallucination * 10);
      line(0, y, width, y);
    }
  }

  if (hallucination > 0.18) {
    noStroke();
    for (let i = 0; i < 32; i++) {
      let c = palette[floor(random(palette.length))];
      fill(c[0], c[1], c[2], random(10, 34));
      rect(random(width), random(height), random(18, 110), random(2, 12));
    }
  }
}

function drawLiquidFilm() {
  let amp = 0.55 + hallucination * 0.9;
  let j = filmJolt;
  let tt = frameCount * 0.018;

  push();
  blendMode(SCREEN);
  noStroke();

  for (let i = 0; i < filmAnchors.length; i++) {
    let a = filmAnchors[i];
    let x = width * a.x + sin(tt * 2.2 + a.phase) * 4 * amp;
    let y = height * a.y + cos(tt * 1.8 + a.phase) * 3 * amp;

    let rx = width * a.rx * (1 + sin(tt * 2.0 + a.phase) * 0.03 + j * 0.03);
    let ry = height * a.ry * (1 + cos(tt * 2.3 + a.phase) * 0.04 + j * 0.04);

    let c1 = palette[a.colA];
    let c2 = palette[a.colB];

    drawFilmBlob(
      x,
      y,
      rx,
      ry,
      c1,
      a.alpha + hallucination * 12,
      a.phase,
      a.detail,
      j
    );

    drawFilmBlob(
      x + sin(tt * 3.0 + i) * 6,
      y + cos(tt * 2.7 + i) * 5,
      rx * 0.78,
      ry * 0.78,
      c2,
      a.alpha * 0.72 + hallucination * 10,
      a.phase + 1.6,
      a.detail * 1.15,
      j
    );

    if (i < 6) {
      drawFilmRibs(x, y, rx, ry, a.phase, j, c2);
    }
  }

  drawFilmHighlights();

  pop();
}

function drawFilmBlob(cx, cy, rx, ry, col, alphaVal, phase, detail, jolt) {
  beginShape();
  let steps = 34;

  for (let i = 0; i <= steps; i++) {
    let ang = map(i, 0, steps, 0, TWO_PI);

    let n = noise(
      cos(ang) * detail + phase * 10,
      sin(ang) * detail + t * 0.9 + phase * 20
    );

    let jitter = sin(ang * 4 + frameCount * 0.22 + phase * 3) * jolt * 0.08;
    let rMod = 1 + map(n, 0, 1, -0.18, 0.24) + jitter;

    let x = cx + cos(ang) * rx * rMod;
    let y = cy + sin(ang) * ry * rMod;

    fill(col[0], col[1], col[2], alphaVal);
    vertex(x, y);
  }

  endShape(CLOSE);

  fill(col[0], col[1], col[2], alphaVal * 0.18);
  ellipse(cx, cy, rx * 1.55, ry * 1.55);
}

function drawFilmRibs(cx, cy, rx, ry, phase, jolt, col) {
  stroke(col[0], col[1], col[2], 18 + hallucination * 12);
  strokeWeight(1.1);
  noFill();

  let ribCount = 4;
  for (let i = 0; i < ribCount; i++) {
    let off = map(i, 0, ribCount - 1, -0.45, 0.45);
    let xx = cx + off * rx * 0.9 + sin(frameCount * 0.03 + phase + i) * 2 * jolt;
    beginShape();
    for (let k = 0; k <= 12; k++) {
      let yy = cy - ry * 0.65 + (k / 12) * ry * 1.3;
      let w = sin(k * 0.7 + frameCount * 0.04 + phase) * rx * 0.05;
      curveVertex(xx + w, yy);
    }
    endShape();
  }

  noStroke();
}

function drawFilmHighlights() {
  let hi = [
    { x: 0.43, y: 0.20, w: 0.14, h: 0.035, c: palette[6] },
    { x: 0.57, y: 0.22, w: 0.11, h: 0.03,  c: palette[2] },
    { x: 0.48, y: 0.51, w: 0.05, h: 0.08,  c: palette[1] },
    { x: 0.52, y: 0.66, w: 0.045, h: 0.09, c: palette[5] }
  ];

  noStroke();
  for (let i = 0; i < hi.length; i++) {
    let h = hi[i];
    let x = width * h.x + sin(frameCount * 0.03 + i) * 3;
    let y = height * h.y + cos(frameCount * 0.025 + i) * 2;
    let w = width * h.w * (1 + filmJolt * 0.03);
    let hh = height * h.h * (1 + filmJolt * 0.04);

    fill(h.c[0], h.c[1], h.c[2], 16 + hallucination * 10);
    ellipse(x, y, w * 1.8, hh * 1.8);

    fill(255, 20 + hallucination * 10);
    ellipse(x, y, w, hh);
  }
}

function drawBloomLights() {
  if (hallucination < 0.06) return;

  push();
  blendMode(SCREEN);
  noStroke();

  let orbs = [
    { x: width * 0.18, y: height * 0.22, s: 120, c: palette[0] },
    { x: width * 0.78, y: height * 0.20, s: 150, c: palette[1] },
    { x: width * 0.62, y: height * 0.38, s: 110, c: palette[2] },
    { x: width * 0.35, y: height * 0.68, s: 140, c: palette[5] },
    { x: width * 0.80, y: height * 0.63, s: 170, c: palette[4] }
  ];

  for (let i = 0; i < orbs.length; i++) {
    let o = orbs[i];
    let pulse = 1 + sin(frameCount * 0.03 + i) * 0.08;
    let size = o.s * pulse * (0.55 + hallucination * 0.9);

    for (let k = 5; k >= 1; k--) {
      fill(o.c[0], o.c[1], o.c[2], (8 + hallucination * 18) / k);
      ellipse(o.x, o.y, size * k * 0.58);
    }
  }

  pop();
}

function drawGlitchBars() {
  for (let i = glitchBars.length - 1; i >= 0; i--) {
    glitchBars[i].update();
    glitchBars[i].display();

    if (glitchBars[i].dead()) {
      glitchBars.splice(i, 1);
    }
  }

  while (glitchBars.length < 10) {
    glitchBars.push(new GlitchBar(false));
  }
}

function updateAndDrawSpores() {
  for (let i = spores.length - 1; i >= 0; i--) {
    spores[i].update();
    spores[i].display();
    if (spores[i].isDead()) {
      spores.splice(i, 1);
    }
  }
}

function updateAndDrawRings() {
  for (let i = rings.length - 1; i >= 0; i--) {
    rings[i].update();
    rings[i].display();
    if (rings[i].dead()) {
      rings.splice(i, 1);
    }
  }
}

function drawFloatingWords() {
  if (hallucination < 0.12) return;

  textFont(customFont);
  textStyle(NORMAL);

  for (let i = 0; i < labels.length; i++) {
    let lb = labels[i];

    let x = width * noise(lb.seedX, t * 0.6 + i);
    let y = height * noise(lb.seedY, t * 0.6 + i + 200);
    let rot = map(noise(lb.seedR, t * 0.5), 0, 1, -0.2, 0.2);
    let size = lb.size + sin(frameCount * 0.03 + i) * 2;

    let c1 = lb.colorA;
    let c2 = lb.colorB;
    let alpha = 135 + hallucination * 110;

    push();
    translate(x, y);
    rotate(rot);
    textSize(size);

    fill(c1[0], c1[1], c1[2], alpha * 0.55);
    text(lb.word, -4, -2);

    fill(c2[0], c2[1], c2[2], alpha * 0.55);
    text(lb.word, 4, 2);

    fill(255, alpha);
    text(lb.word, 0, 0);

    pop();
  }
}

function drawBottomType() {
  textFont(customFont);

  let txt = "Click to hallucinate";
  let x = width / 2;
  let y = height - 58;

  push();
  textAlign(CENTER, CENTER);

  // 1) 底层压印文字：更大、更淡，形成海报层次
  textStyle(BOLD);
  textSize(25);
  fill(255, 20);
  text(txt, x, y + 2);

  fill(255, 12);
  text(txt, x, y + 8);
  
  // 3) 主字：白色厚重主体
  fill(255, 252);
  text(txt, x, y);

  // 4) 再叠一层极轻微黑灰压字，让它更“印刷”
  fill(0, 60);
  text(txt, x, y + 1.5);

  pop();
}

function drawCustomCursor() {
  let hover = isMouseOnMushroom();

  noFill();
  strokeWeight(1.2);

  if (hover) {
    stroke(255, 90, 160, 230);
  } else {
    stroke(255, 210);
  }

  let r = hover ? 28 + sin(frameCount * 0.18) * 3 : 18;
  ellipse(mouseX, mouseY, r);

  stroke(255, 160);
  line(mouseX - 7, mouseY, mouseX + 7, mouseY);
  line(mouseX, mouseY - 7, mouseX, mouseY + 7);

  if (hover) {
    noStroke();
    fill(255, 70, 140, 34);
    ellipse(mouseX, mouseY, 46 + sin(frameCount * 0.2) * 5);
  }
}

function releaseSpores(x, y, power = 1) {
  let amount = floor(55 + 35 * power);
  for (let i = 0; i < amount; i++) {
    spores.push(new Spore(x, y, power));
  }

  let extra = floor(45 + 30 * power);
  for (let i = 0; i < extra; i++) {
    let angle = random(PI, TWO_PI);
    let rx = random(30, width * 0.28);
    let ry = random(10, height * 0.08);

    let sx = width / 2 + cos(angle) * rx;
    let sy = height * 0.335 + sin(angle) * ry;

    spores.push(new Spore(sx, sy, power));
  }
}

function isMouseOnMushroom() {
  let cx = width / 2;
  let cy = height * 0.34;
  let rx = width * 0.40;
  let ry = height * 0.14;

  let dx = mouseX - cx;
  let dy = mouseY - cy;

  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) < 1;
}

class Spore {
  constructor(x, y, power) {
    this.x = x;
    this.y = y;

    let angle = random(TWO_PI);
    let speed = random(1.4, 6.5) * (0.75 + power * 0.45);

    this.vx = cos(angle) * speed * random(0.35, 1.35);
    this.vy = sin(angle) * speed * random(0.2, 1.0) - random(1.0, 4.4);

    this.life = random(100, 240);
    this.maxLife = this.life;
    this.size = random(2, 11);
    this.wobble = random(1000);
    this.rot = random(TWO_PI);
    this.spin = random(-0.08, 0.08);
    this.type = floor(random(4));
  }

  update() {
    let n1 = noise(this.wobble, t * 4.0);
    let n2 = noise(this.wobble + 300, t * 4.0);

    this.x += this.vx + map(n1, 0, 1, -2.0, 2.0);
    this.y += this.vy + map(n2, 0, 1, -1.0, 1.0);

    this.vx *= 0.992;
    this.vy *= 0.996;
    this.vy -= 0.004;

    this.rot += this.spin;
    this.wobble += 0.018;
    this.life--;
  }

  display() {
    let alpha = map(this.life, 0, this.maxLife, 0, 205);

    push();
    translate(this.x, this.y);
    rotate(this.rot);
    noStroke();

    if (this.type === 0) {
      fill(255, 235, 190, alpha);
      ellipse(0, 0, this.size);
      fill(255, 90, 150, alpha * 0.28);
      ellipse(0, 0, this.size * 3.1);
    } else if (this.type === 1) {
      fill(90, 225, 255, alpha);
      ellipse(0, 0, this.size * 0.9);
      fill(90, 225, 255, alpha * 0.24);
      ellipse(0, 0, this.size * 3.2);
    } else if (this.type === 2) {
      fill(180, 255, 120, alpha);
      rectMode(CENTER);
      rect(0, 0, this.size * 0.85, this.size * 0.85, 2);
      fill(255, 255, 255, alpha * 0.14);
      ellipse(0, 0, this.size * 2.7);
    } else {
      fill(255, 120, 220, alpha * 0.82);
      ellipse(0, 0, this.size * 0.75);
      fill(255, 255, 255, alpha * 0.14);
      ellipse(0, 0, this.size * 3.5);
    }

    pop();
  }

  isDead() {
    return this.life <= 0;
  }
}

class GlitchBar {
  constructor(forceStrong = false, px = null, py = null) {
    this.x = px === null ? random(width) : px + random(-140, 140);
    this.y = py === null ? random(height) : py + random(-90, 90);
    this.w = random(24, 150);
    this.h = random(3, 18);
    this.life = forceStrong ? random(18, 42) : random(8, 20);
    this.maxLife = this.life;
    this.vx = random(-4, 4);
    this.col = palette[floor(random(palette.length))];
    this.strong = forceStrong;
  }

  update() {
    this.x += this.vx;
    this.life--;
  }

  display() {
    let a = map(this.life, 0, this.maxLife, 0, this.strong ? 90 : 40);

    noStroke();
    fill(this.col[0], this.col[1], this.col[2], a);
    rect(this.x, this.y, this.w, this.h);

    fill(255, a * 0.6);
    rect(this.x + random(-12, 12), this.y, this.w * random(0.25, 0.85), this.h);
  }

  dead() {
    return this.life <= 0;
  }
}

class ToxicRing {
  constructor(x, y, power) {
    this.x = x;
    this.y = y;
    this.r = 8;
    this.life = 48 + power * 18;
    this.maxLife = this.life;
    this.power = power;
    this.col = palette[floor(random(palette.length))];
  }

  update() {
    this.r += 4 + this.power * 2.5;
    this.life--;
  }

  display() {
    let a = map(this.life, 0, this.maxLife, 0, 120);

    push();
    blendMode(SCREEN);
    noFill();

    stroke(this.col[0], this.col[1], this.col[2], a);
    strokeWeight(2.5);
    ellipse(this.x, this.y, this.r);

    stroke(255, a * 0.55);
    strokeWeight(1);
    ellipse(this.x, this.y, this.r * 1.35);

    pop();
  }

  dead() {
    return this.life <= 0;
  }
}
