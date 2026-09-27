let jobs = [];
let fallingWords = [];
let piledLetters = [];
let refreshTimer = 0;
let refreshInterval = 120;
let anxietyLevel = 0;
let uiFont;
let pileTop = 0;

const titlePool = [
  "Junior Designer",
  "UI/UX Intern",
  "Content Designer",
  "Brand Assistant",
  "Visual Designer",
  "Creative Support",
  "Marketing Executive",
  "Digital Design Trainee"
];

const doubtWords = [
  "not enough",
  "try again",
  "update portfolio",
  "no response",
  "keep waiting",
  "refresh",
  "maybe another role",
  "almost there",
  "processing",
  "seen",
  "checking again",
  "still nothing",
  "too late",
  "open to work",
  "no interview",
  "refresh again",
  "please reply",
  "waiting",
  "keep applying",
  "no update",
  "try harder",
  "wrong timing",
  "keep searching",
  "nothing yet",
  "stay online",
  "another rejection",
  "application sent",
  "viewed only",
  "loading",
  "maybe tomorrow",
  "check inbox",
  "try one more",
  "pending",
  "still unseen",
  "under review",
  "no feedback",
  "try later",
  "rejected",
  "keep scrolling",
  "still waiting"
];

function preload() {
  uiFont = loadFont("Space Grotesk.ttf");
}

function setup() {
  createCanvas(1000, 1300);
  textFont(uiFont);
  rectMode(CORNER);
  textAlign(LEFT, BASELINE);
  generateJobs();
  generateFallingWords();
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
  background(244);

  refreshTimer++;

  if (refreshTimer >= refreshInterval) {
    refreshTimer = 0;
    generateJobs();
    anxietyLevel = min(anxietyLevel + 0.08, 1.8);

    for (let i = 0; i < 6; i++) {
      fallingWords.push(
        makeFallingWord(
          random(doubtWords),
          random(40, width - 260),
          random(-220, -20)
        )
      );
    }
  }

  updateWords();
  updateLettersPhysics();

  drawNoiseBackground();
  drawAnxietyLines();
  drawMainPanel();
  drawHeader();
  drawJobs();
  drawLoadingBar();

  // 只柔化堆积区背后的求职页面，避免与堆积文字打架
  drawPileBackdropSoften();

  drawFallingWords();
  drawPiledLetters();
  drawCursorDistortion();
}

function generateJobs() {
  jobs = [];
  for (let i = 0; i < 7; i++) {
    jobs.push({
      title: random(titlePool),
      status: weightedStatus(),
      x: 120,
      y: 220 + i * 125,
      w: width - 240,
      h: 90
    });
  }
}

function weightedStatus() {
  let r = random();
  if (r < 0.28) return "pending";
  if (r < 0.48) return "under review";
  if (r < 0.63) return "viewed";
  if (r < 0.78) return "processing";
  if (r < 0.92) return "submitted";
  return "no update";
}

function makeFallingWord(word, x, y) {
  return {
    word: word,
    x: x,
    y: y,
    speed: random(2.6, 4.6),
    alpha: random(170, 225),
    size: random(16, 30),
    drift: random(-0.25, 0.25)
  };
}

function generateFallingWords() {
  fallingWords = [];
  piledLetters = [];
  pileTop = 0;

  for (let i = 0; i < 44; i++) {
    fallingWords.push(
      makeFallingWord(
        random(doubtWords),
        random(30, width - 260),
        random(height)
      )
    );
  }
}

function getMouseInfluence(x, y, radius = 140) {
  let d = dist(mouseX, mouseY, x, y);
  if (d > radius) return 0;
  return map(d, radius, 0, 0, 1);
}

function updateWords() {
  for (let i = fallingWords.length - 1; i >= 0; i--) {
    let w = fallingWords[i];

    w.y += w.speed + anxietyLevel * 1.1;
    w.x += w.drift;

    let baseY = height - 16 - pileTop;

    if (w.y >= baseY) {
      explodeWordToLetters(w);
      fallingWords.splice(i, 1);
    }
  }

  while (fallingWords.length < 62) {
    fallingWords.push(
      makeFallingWord(
        random(doubtWords),
        random(30, width - 260),
        random(-260, -20)
      )
    );
  }

  if (piledLetters.length > 1400) {
    piledLetters.splice(0, piledLetters.length - 1400);
  }
}

function explodeWordToLetters(w) {
  textSize(w.size);

  let cursorX = w.x;
  let explodeY = max(w.y, height * 0.66);

  for (let i = 0; i < w.word.length; i++) {
    let ch = w.word[i];
    let cw = textWidth(ch === " " ? "  " : ch);

    if (ch !== " ") {
      let sizeJitter = w.size + random(-1, 1);
      let r = max(5, sizeJitter * 0.28);

      piledLetters.push({
        char: ch,
        x: cursorX + random(-2, 2),
        y: explodeY + random(-3, 3),
        vx: random(-0.8, 0.8),
        vy: random(-1.8, -0.4),
        ax: 0,
        ay: 0.34,
        alpha: random(105, 150),
        size: sizeJitter,
        rot: random(-0.03, 0.03),
        vr: random(-0.0025, 0.0025),
        r: r,
        bounce: 0.16,
        friction: 0.992,
        settle: false
      });

      pileTop = min(pileTop + random(2.2, 3.8), height * 0.56);
    }

    cursorX += cw + random(0.5, 2);
  }
}

function updateLettersPhysics() {
  let floorY = height - 10;
  let activeTop = height * 0.66;

  for (let l of piledLetters) {
    if (!l.settle) {
      l.vy += l.ay;
      l.vx *= l.friction;
      l.vy *= 0.996;
      l.x += l.vx;
      l.y += l.vy;
      l.rot += l.vr;
      l.vr *= 0.996;
    }

    if (l.x < 8) {
      l.x = 8;
      l.vx *= -0.15;
    }
    if (l.x > width - 8) {
      l.x = width - 8;
      l.vx *= -0.15;
    }

    if (l.y < activeTop) {
      l.y = activeTop;
      l.vy *= 0.12;
    }

    if (l.y + l.r > floorY) {
      l.y = floorY - l.r;
      l.vy *= -l.bounce;
      l.vx *= 0.9;

      if (abs(l.vy) < 0.22 && abs(l.vx) < 0.06) {
        l.vx = 0;
        l.vy = 0;
        l.vr = 0;
        l.settle = true;
      }
    }
  }

  for (let i = 0; i < piledLetters.length; i++) {
    let a = piledLetters[i];

    for (let j = i + 1; j < piledLetters.length; j++) {
      let b = piledLetters[j];

      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let distSq = dx * dx + dy * dy;
      let minDist = (a.r + b.r) * 0.88;

      if (distSq > 0 && distSq < minDist * minDist) {
        let d = sqrt(distSq);
        let overlap = (minDist - d) * 0.36;
        let nx = dx / d;
        let ny = dy / d;

        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;

        if (!a.settle || !b.settle) {
          let rvx = b.vx - a.vx;
          let rvy = b.vy - a.vy;
          let sepVel = rvx * nx + rvy * ny;

          if (sepVel < 0) {
            let impulse = -0.04 * sepVel;
            if (!a.settle) {
              a.vx -= impulse * nx;
              a.vy -= impulse * ny;
            }
            if (!b.settle) {
              b.vx += impulse * nx;
              b.vy += impulse * ny;
            }
          }
        }
      }
    }
  }

  let minY = height;
  for (let l of piledLetters) {
    minY = min(minY, l.y - l.r);
  }
  pileTop = constrain(height - minY, 0, height * 0.56);
}

function drawNoiseBackground() {
  noStroke();

  for (let i = 0; i < 2800; i++) {
    let x = random(width);
    let y = random(height);
    let a = random(8, 18 + anxietyLevel * 30);
    fill(0, a);
    rect(x, y, random(1, 3), random(1, 3));
  }

  for (let i = 0; i < 8 + anxietyLevel * 18; i++) {
    let y = random(height);
    fill(0, random(8, 22));
    rect(0, y, width, random(1, 3));
  }
}

function drawAnxietyLines() {
  noFill();

  let lineCount = 40 + floor(anxietyLevel * 40);

  for (let i = 0; i < lineCount; i++) {
    let startX = random(width);
    let startY = random(height);
    let segments = floor(random(6, 14));
    let px = startX;
    let py = startY;

    strokeWeight(random(0.5, 1.8));
    beginShape();

    for (let j = 0; j < segments; j++) {
      let influence = getMouseInfluence(px, py, 170);

      if (influence > 0) {
        let angle = atan2(py - mouseY, px - mouseX);
        px += cos(angle) * influence * 22;
        py += sin(angle) * influence * 22;
      }

      stroke(0, random(14, 42) * (1 - influence * 0.7));
      vertex(px, py);

      px += random(-65, 65);
      py += random(-38, 38);
    }

    endShape();
  }
}

function drawMainPanel() {
  let panelX = 70;
  let panelY = 100;
  let panelW = width - 140;
  let panelH = height - 200;

  noStroke();
  fill(224, 232, 238, 240);
  rect(panelX, panelY, panelW, panelH, 18);

  for (let i = 0; i < anxietyLevel * 6; i++) {
    noStroke();
    fill(130, 148, 160, 7);
    rect(panelX + random(-4, 4), panelY + random(-4, 4), panelW, panelH, 18);
  }

  stroke(92, 108, 118, 34);
  noFill();
  rect(panelX, panelY, panelW, panelH, 18);
}

function drawHeader() {
  fill(30, 36, 40);
  noStroke();
  textSize(30);
  textStyle(BOLD);

  text("APPLICATIONS", 120, 150);
  text("APPLICATIONS", 121, 150);
  text("APPLICATIONS", 120.5, 149.5);

  textStyle(NORMAL);
  textSize(14);
  fill(92, 102, 108);
  text("auto-refreshing...", 120, 178);

  let buttonY = 132;
  let buttonW = 70;
  let buttonH = 28;

  let inboxX = width - 290;
  let statusX = width - 195;

  fill(210, 219, 225);
  rect(inboxX, buttonY, buttonW, buttonH, 8);
  rect(statusX, buttonY, buttonW, buttonH, 8);

  stroke(95, 110, 120, 28);
  noFill();
  rect(inboxX, buttonY, buttonW, buttonH, 8);
  rect(statusX, buttonY, buttonW, buttonH, 8);

  fill(36, 42, 46);
  noStroke();
  textSize(12);
  textAlign(CENTER, CENTER);
  text("Inbox", inboxX + buttonW / 2, buttonY + buttonH / 2);
  text("Status", statusX + buttonW / 2, buttonY + buttonH / 2);
  textAlign(LEFT, BASELINE);
}

function drawJobs() {
  for (let job of jobs) {
    let jitterX = random(-1.8, 1.8) * anxietyLevel * 4.8;
    let jitterY = random(-1.2, 1.2) * anxietyLevel * 3.2;

    noStroke();
    fill(0, 10);
    rect(job.x + 6 + jitterX, job.y + 6 + jitterY, job.w, job.h, 10);

    fill(238, 243, 246, 248);
    rect(job.x + jitterX, job.y + jitterY, job.w, job.h, 10);

    stroke(96, 110, 120, 22);
    noFill();
    rect(job.x + jitterX, job.y + jitterY, job.w, job.h, 10);

    noStroke();
    fill(24, 30, 34);
    textSize(22);
    textStyle(BOLD);
    text(job.title, job.x + 28 + jitterX, job.y + 35 + jitterY);

    fill(102, 110, 116);
    textStyle(NORMAL);
    textSize(13);
    text("Submitted recently", job.x + 28 + jitterX, job.y + 60 + jitterY);

    let statusW = textWidth(job.status) + 28;
    let statusX = job.x + job.w - statusW - 25 + jitterX;
    let statusY = job.y + 24 + jitterY;
    let statusH = 28;

    let labelJitterX = random(-0.9, 0.9) * anxietyLevel * 3.4;
    let labelJitterY = random(-0.6, 0.6) * anxietyLevel * 2.4;

    fill(statusColor(job.status));
    rect(statusX + labelJitterX, statusY + labelJitterY, statusW, statusH, 14);

    fill(30, 36, 40);
    textSize(12);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text(
      job.status,
      statusX + labelJitterX + statusW / 2,
      statusY + labelJitterY + statusH / 2 - 1
    );
    textAlign(LEFT, BASELINE);

    fill(70, 88, 98, 16);
    rect(job.x + 28 + jitterX, job.y + 72 + jitterY, job.w - 56, 2);
  }
}

function statusColor(status) {
  if (status === "pending") return color(220, 226, 230);
  if (status === "under review") return color(213, 220, 226);
  if (status === "viewed") return color(206, 214, 221);
  if (status === "processing") return color(198, 208, 216);
  if (status === "submitted") return color(226, 231, 235);
  return color(192, 202, 210);
}

function drawLoadingBar() {
  let barX = 120;
  let barY = height - 150;
  let barW = width - 240;
  let barH = 24;

  let t = (sin(frameCount * 0.045) + 1) / 2;
  let fakeProgress = map(t, 0, 1, 0.62, 0.98);

  if (frameCount % 300 > 220) {
    fakeProgress = map(sin(frameCount * 0.11), -1, 1, 0.45, 0.7);
  }

  noStroke();
  fill(210, 219, 225);
  rect(barX, barY, barW, barH, 12);

  fill(78, 96, 108);
  rect(barX, barY, barW * fakeProgress, barH, 12);

  fill(56, 66, 72);
  textSize(13);
  textStyle(NORMAL);
  text("System processing...", barX, barY - 14);

  fill(95, 106, 112);
  textAlign(RIGHT, BASELINE);
  text(floor(fakeProgress * 100) + "%", barX + barW, barY - 14);
  textAlign(LEFT, BASELINE);
}

function drawPileBackdropSoften() {
  let panelX = 70;
  let panelY = 100;
  let panelW = width - 140;
  let panelH = height - 200;

  let softenTop = constrain(
    height - pileTop - 90,
    panelY + panelH * 0.36,
    height - 150
  );
  let softenH = height - softenTop;

  noStroke();

  // 主体柔化层
  fill(236, 242, 246, 98);
  rect(panelX + 8, softenTop, panelW - 16, softenH, 18);

  // 内层进一步压平信息对比
  fill(242, 246, 249, 52);
  rect(panelX + 20, softenTop + 10, panelW - 40, softenH - 12, 14);

  fill(248, 250, 252, 24);
  rect(panelX + 34, softenTop + 22, panelW - 68, softenH - 28, 12);

  // 顶部过渡，避免边界硬
  for (let i = 0; i < 12; i++) {
    let y = softenTop - 72 + i * 6;
    let a = map(i, 0, 11, 3, 18);
    fill(236, 242, 246, a);
    rect(panelX + 8, y, panelW - 16, 8, 8);
  }

  // 很轻的纵向柔光纹理，模拟毛玻璃感，但不形成雾团
  stroke(255, 255, 255, 16);
  strokeWeight(2);
  for (let i = 0; i < 7; i++) {
    let x = panelX + 90 + i * ((panelW - 180) / 6);
    line(x, softenTop + 16, x, height - 26);
  }
  noStroke();
}

function drawFallingWords() {
  for (let w of fallingWords) {
    let influence = getMouseInfluence(w.x, w.y, 150);

    let pushX = 0;
    let pushY = 0;

    if (influence > 0) {
      let angle = atan2(w.y - mouseY, w.x - mouseX);
      pushX = cos(angle) * influence * 18 + random(-2, 2) * influence * 4;
      pushY = sin(angle) * influence * 18 + random(-2, 2) * influence * 4;
    }

    let localAlpha = w.alpha * (1 - influence * 0.72);

    noStroke();
    textStyle(BOLD);

    // 居中的浅蓝光晕，不做偏移
    fill(182, 210, 236, localAlpha * 0.16);
    textSize(w.size + 7);
    text(w.word, w.x + pushX, w.y + pushY);

    fill(164, 198, 230, localAlpha * 0.22);
    textSize(w.size + 4);
    text(w.word, w.x + pushX, w.y + pushY);

    // 主文字：浅蓝
    fill(108, 156, 204, localAlpha);
    textSize(w.size);
    text(w.word, w.x + pushX, w.y + pushY);

    if (anxietyLevel > 0.5) {
      fill(108, 156, 204, localAlpha * 0.18);
      textSize(w.size + 2);
      text(w.word, w.x + pushX, w.y + pushY);
    }
  }
}

function drawPiledLetters() {
  for (let l of piledLetters) {
    push();
    translate(l.x, l.y);
    rotate(l.rot);

    fill(92, 142, 192, l.alpha);
    noStroke();
    textSize(l.size);
    textStyle(BOLD);
    text(l.char, 0, 0);
    pop();
  }
}

function drawCursorDistortion() {
  noStroke();

  fill(255, 55);
  ellipse(mouseX, mouseY, 120, 120);

  fill(255, 22);
  ellipse(mouseX, mouseY, 180, 180);

  fill(255, 10);
  ellipse(mouseX, mouseY, 240, 240);

  stroke(120, 135, 145, 20);
  noFill();
  ellipse(
    mouseX,
    mouseY,
    130 + sin(frameCount * 0.08) * 6,
    130 + sin(frameCount * 0.08) * 6
  );
}
