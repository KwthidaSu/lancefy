const canvas = document.getElementById("fireflies");
const ctx = canvas.getContext("2d");

let width, height;
let dots = [];

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

/* ลดจำนวน dot ให้ดูนิ่งขึ้น */
const DOT_COUNT = 35;

function random(min, max) {
  return Math.random() * (max - min) + min;
}

class Dot {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = random(0, width);
    this.y = random(0, height);
    this.radius = random(0.6, 1.4);
    this.alpha = random(0.12, 0.35);
    this.speedX = random(-0.08, 0.08);
    this.speedY = random(-0.08, 0.08);
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    if (
      this.x < -40 ||
      this.x > width + 40 ||
      this.y < -40 ||
      this.y > height + 40
    ) {
      this.reset();
    }
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(72, 168, 154, 0.45)";
    ctx.fillStyle = `rgba(203, 239, 235, ${this.alpha})`;

    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

for (let i = 0; i < DOT_COUNT; i++) {
  dots.push(new Dot());
}

function animate() {
  ctx.clearRect(0, 0, width, height);

  for (const dot of dots) {
    dot.update();
    dot.draw();
  }

  requestAnimationFrame(animate);
}

animate();
