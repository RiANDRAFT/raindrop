// Raindrop: rain-on-glass simulation (canvas). Drops grow, then slide and leave trails.
const Rain = (() => {
  let c, x, W, H, drops = [], streaks = [], raf = 0, level = 5;
  const R = Math.random;
  const size = () => { W = c.width = innerWidth; H = c.height = innerHeight; };
  const mkDrop = (top) => ({ x: R() * W, y: top ? -10 : R() * H, r: 1.5 + R() * 3.5, vy: 0, slide: false, sy: 0 });
  const mkStreak = () => ({ x: R() * W, y: R() * H, l: 18 + R() * 40, v: 14 + R() * 12 });

  function frame() {
    x.clearRect(0, 0, W, H);
    x.lineCap = "round";
    for (const s of streaks) {
      x.strokeStyle = "rgba(190,215,255,.10)"; x.lineWidth = 1;
      x.beginPath(); x.moveTo(s.x, s.y); x.lineTo(s.x - 2, s.y + s.l); x.stroke();
      s.y += s.v; if (s.y > H) { s.y = -s.l; s.x = R() * W; }
    }
    for (const d of drops) {
      if (!d.slide) {
        d.r += 0.002 + R() * 0.006;
        if (d.r > 5 + R() * 6 && R() < 0.03) { d.slide = true; d.sy = d.y; }
      } else {
        d.vy = Math.min(d.vy + 0.07, 4.5);
        if (R() < 0.04) d.vy *= 0.25;                       // stick-and-slip
        d.y += d.vy; d.r *= 0.9996;
        x.strokeStyle = "rgba(200,225,255,.09)"; x.lineWidth = d.r * 0.55;
        x.beginPath(); x.moveTo(d.x, d.sy); x.lineTo(d.x, d.y); x.stroke();
        if (d.y > H + 20) Object.assign(d, mkDrop(true));
      }
      const g = x.createRadialGradient(d.x - d.r * .3, d.y - d.r * .4, d.r * .1, d.x, d.y, d.r);
      g.addColorStop(0, "rgba(255,255,255,.6)");
      g.addColorStop(.55, "rgba(170,205,255,.10)");
      g.addColorStop(1, "rgba(8,16,32,.38)");
      x.fillStyle = g; x.strokeStyle = "rgba(255,255,255,.2)"; x.lineWidth = 1;
      x.beginPath(); x.ellipse(d.x, d.y, d.r * .85, d.r, 0, 0, 7); x.fill(); x.stroke();
    }
    raf = requestAnimationFrame(frame);
  }
  function seed() {
    drops = Array.from({ length: level * 28 }, () => mkDrop(false));
    streaks = Array.from({ length: level * 6 }, mkStreak);
  }
  return {
    start(canvas, intensity) {
      this.stop(); c = canvas; x = c.getContext("2d"); level = +intensity || 5;
      size(); seed();
      if (!this.bound) { this.bound = 1; addEventListener("resize", () => { size(); seed(); }); }
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) frame();
      else { frame(); cancelAnimationFrame(raf); }
    },
    stop() { cancelAnimationFrame(raf); if (x) x.clearRect(0, 0, W, H); },
  };
})();
