import { useEffect, useRef } from 'react';

// ─── Config ───────────────────────────────────────────────────────────────────
const SPEED       = 6;
const TRAIL_LEN   = 40;
const SPARK_COUNT = 16;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Spark {
  x: number; y: number;
  vx: number; vy: number;
  life: number;   // 1 → 0
  decay: number;
  r: number; g: number; b: number;
}

interface Flash {
  x: number; y: number;
  life: number;
  decay: number;
}

// Neon spark palette (R,G,B)
const SPARK_PALETTE: [number, number, number][] = [
  [255, 255, 255],
  [0,   245, 255],
  [255, 200,   0],
  [255,   0, 204],
  [0,   255, 136],
];

// ─── Component ────────────────────────────────────────────────────────────────
export function BulletAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width  = W;
    canvas.height = H;

    // Initial state
    const initAngle = Math.PI / 5.5;
    const bullet = {
      x:  W * 0.3,
      y:  H * 0.4,
      vx: SPEED * Math.cos(initAngle),
      vy: SPEED * Math.sin(initAngle),
    };

    const trail:  Array<{x: number; y: number}> = [];
    const sparks: Spark[] = [];
    const flashes: Flash[] = [];

    // ── Helpers ────────────────────────────────────────────────────────────────
    function spawnImpact(x: number, y: number) {
      // Bright flash
      flashes.push({ x, y, life: 1, decay: 0.06 });

      // Spark burst
      for (let i = 0; i < SPARK_COUNT; i++) {
        const a     = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 0.8;
        const [r, g, b] = SPARK_PALETTE[Math.floor(Math.random() * SPARK_PALETTE.length)];
        sparks.push({
          x, y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          life: 1,
          decay: 0.028 + Math.random() * 0.032,
          r, g, b,
        });
      }
    }

    // ── Resize ─────────────────────────────────────────────────────────────────
    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width  = W;
      canvas.height = H;
    };
    window.addEventListener('resize', onResize);

    // ── Main loop ──────────────────────────────────────────────────────────────
    let raf: number;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // Move
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;

      // Bounce
      const margin = 3;
      if (bullet.x <= margin) {
        bullet.vx = Math.abs(bullet.vx);
        bullet.x  = margin;
        spawnImpact(bullet.x, bullet.y);
      } else if (bullet.x >= W - margin) {
        bullet.vx = -Math.abs(bullet.vx);
        bullet.x  = W - margin;
        spawnImpact(bullet.x, bullet.y);
      }
      if (bullet.y <= margin) {
        bullet.vy = Math.abs(bullet.vy);
        bullet.y  = margin;
        spawnImpact(bullet.x, bullet.y);
      } else if (bullet.y >= H - margin) {
        bullet.vy = -Math.abs(bullet.vy);
        bullet.y  = H - margin;
        spawnImpact(bullet.x, bullet.y);
      }

      // Trail history
      trail.push({ x: bullet.x, y: bullet.y });
      if (trail.length > TRAIL_LEN) trail.shift();

      const angle = Math.atan2(bullet.vy, bullet.vx);

      // ── Trail ──────────────────────────────────────────────────────────────
      if (trail.length > 1) {
        for (let i = 1; i < trail.length; i++) {
          const t = i / trail.length; // 0=oldest 1=newest
          const a = t * t * t;        // cubic ease

          // Outer glow (cyan)
          ctx.beginPath();
          ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
          ctx.lineTo(trail[i].x, trail[i].y);
          ctx.strokeStyle = `rgba(0, 245, 255, ${a * 0.35})`;
          ctx.lineWidth   = t * 6;
          ctx.lineCap     = 'round';
          ctx.stroke();

          // Inner bright core (white-yellow)
          ctx.beginPath();
          ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
          ctx.lineTo(trail[i].x, trail[i].y);
          ctx.strokeStyle = `rgba(255, 240, 180, ${a * 0.9})`;
          ctx.lineWidth   = t * 1.6;
          ctx.stroke();
        }
      }

      // ── Impact flashes ────────────────────────────────────────────────���────
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        f.life -= f.decay;
        if (f.life <= 0) { flashes.splice(i, 1); continue; }

        const radius = (1 - f.life) * 70 + 8;
        const grad   = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, radius);
        grad.addColorStop(0,   `rgba(255, 255, 255, ${f.life * 0.95})`);
        grad.addColorStop(0.25, `rgba(0, 245, 255,  ${f.life * 0.7})`);
        grad.addColorStop(0.6,  `rgba(255, 200, 0,  ${f.life * 0.3})`);
        grad.addColorStop(1,    'rgba(0, 245, 255, 0)');

        ctx.beginPath();
        ctx.arc(f.x, f.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // ── Sparks ─────────────────────────────────────────────────────────────
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x  += s.vx;
        s.y  += s.vy;
        s.vx *= 0.94;
        s.vy *= 0.94;
        s.life -= s.decay;

        if (s.life <= 0) { sparks.splice(i, 1); continue; }

        const r = s.life * 2.5;
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 5);
        grad.addColorStop(0,   `rgba(${s.r}, ${s.g}, ${s.b}, ${s.life})`);
        grad.addColorStop(0.4, `rgba(${s.r}, ${s.g}, ${s.b}, ${s.life * 0.5})`);
        grad.addColorStop(1,   `rgba(${s.r}, ${s.g}, ${s.b}, 0)`);

        ctx.beginPath();
        ctx.arc(s.x, s.y, r * 5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Bright core dot
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${s.life * 0.9})`;
        ctx.fill();
      }

      // ── Bullet ─────────────────────────────────────────────────────────────
      ctx.save();
      ctx.translate(bullet.x, bullet.y);
      ctx.rotate(angle);

      // Wide outer halo
      const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, 22);
      halo.addColorStop(0, 'rgba(0, 245, 255, 0.22)');
      halo.addColorStop(1, 'rgba(0, 245, 255, 0)');
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fillStyle = halo;
      ctx.fill();

      // Body glow (elongated)
      const bodyGlow = ctx.createLinearGradient(-20, 0, 8, 0);
      bodyGlow.addColorStop(0,    'rgba(0, 245, 255, 0)');
      bodyGlow.addColorStop(0.45, 'rgba(0, 245, 255, 0.4)');
      bodyGlow.addColorStop(0.85, 'rgba(255, 255, 255, 0.75)');
      bodyGlow.addColorStop(1,    'rgba(255, 255, 255, 0)');
      ctx.beginPath();
      ctx.ellipse(-7, 0, 16, 4, 0, 0, Math.PI * 2);
      ctx.fillStyle = bodyGlow;
      ctx.fill();

      // Core bright body
      const core = ctx.createLinearGradient(-15, 0, 5, 0);
      core.addColorStop(0,    'rgba(255, 200, 0, 0)');
      core.addColorStop(0.35, 'rgba(255, 230, 80, 0.95)');
      core.addColorStop(0.82, 'rgba(255, 255, 255, 1)');
      core.addColorStop(1,    'rgba(255, 255, 255, 0)');
      ctx.beginPath();
      ctx.ellipse(-4, 0, 13, 2.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = core;
      ctx.fill();

      // Bright tip corona
      const tip = ctx.createRadialGradient(5, 0, 0, 5, 0, 8);
      tip.addColorStop(0,   'rgba(255, 255, 255, 1)');
      tip.addColorStop(0.4, 'rgba(0, 245, 255, 0.85)');
      tip.addColorStop(1,   'rgba(0, 245, 255, 0)');
      ctx.beginPath();
      ctx.arc(5, 0, 8, 0, Math.PI * 2);
      ctx.fillStyle = tip;
      ctx.fill();

      // Solid bright center point
      ctx.beginPath();
      ctx.arc(5, 0, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.restore();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9997,
      }}
    />
  );
}
