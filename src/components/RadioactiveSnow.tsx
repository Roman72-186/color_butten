import { useEffect, useRef } from 'react';

// ─── Config ───────────────────────────────────────────────────────────────────
const FLAKE_COUNT  = 70;
const MIN_RADIUS   = 0.6;
const MAX_RADIUS   = 1.8;
const MIN_SPEED    = 0.12;
const MAX_SPEED    = 0.45;
const GLOW_MULT    = 3.5;   // glow radius = particle radius * GLOW_MULT
const PULSE_SPEED  = 0.025;

// Radioactive neon palette (r, g, b)
const PALETTE: [number, number, number][] = [
  [0,   255, 80],    // toxic green (dominant)
  [0,   255, 80],
  [0,   255, 80],
  [80,  255, 0],     // acid yellow-green
  [0,   240, 120],
  [180, 255, 0],     // yellow-lime
  [0,   200, 255],   // cyan trace
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface Flake {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;       // horizontal wobble amplitude
  driftPhase: number;  // phase offset
  pulsePhase: number;
  color: [number, number, number];
  opacity: number;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function RadioactiveSnow() {
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

    function makeFlake(yOverride?: number): Flake {
      const r = MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS);
      return {
        x:          Math.random() * W,
        y:          yOverride ?? Math.random() * H,
        r,
        speed:      MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED),
        drift:      0.3 + Math.random() * 0.8,
        driftPhase: Math.random() * Math.PI * 2,
        pulsePhase: Math.random() * Math.PI * 2,
        color:      PALETTE[Math.floor(Math.random() * PALETTE.length)],
        opacity:    0.18 + Math.random() * 0.22,
      };
    }

    const flakes: Flake[] = Array.from({ length: FLAKE_COUNT }, () => makeFlake());

    let frame = 0;
    let raf: number;

    const onResize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width  = W;
      canvas.height = H;
    };
    window.addEventListener('resize', onResize);

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      frame++;

      for (const f of flakes) {
        // Move
        f.y += f.speed;
        f.x += Math.sin(f.driftPhase + frame * 0.018) * f.drift;

        // Wrap vertically
        if (f.y > H + f.r * 10) {
          f.x          = Math.random() * W;
          f.y          = -f.r * 10;
          f.pulsePhase = Math.random() * Math.PI * 2;
        }
        // Wrap horizontally (soft)
        if (f.x < -20) f.x = W + 20;
        if (f.x > W + 20) f.x = -20;

        // Pulsing opacity
        const pulse  = 0.85 + 0.15 * Math.sin(f.pulsePhase + frame * PULSE_SPEED);
        const alpha  = f.opacity * pulse;

        const [r, g, b] = f.color;
        const glowR = f.r * GLOW_MULT;

        // Outer glow
        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, glowR);
        grad.addColorStop(0,   `rgba(${r}, ${g}, ${b}, ${(alpha * 0.55).toFixed(3)})`);
        grad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.2).toFixed(3)})`);
        grad.addColorStop(1,   `rgba(${r}, ${g}, ${b}, 0)`);

        ctx.beginPath();
        ctx.arc(f.x, f.y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Bright core
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
        ctx.fill();

        // White hot center for larger flakes
        if (f.r > 1.2) {
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r * 0.38, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.8).toFixed(3)})`;
          ctx.fill();
        }
      }

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
        position:      'fixed',
        top:           0,
        left:          0,
        width:         '100%',
        height:        '100%',
        pointerEvents: 'none',
        zIndex:        9997,
      }}
    />
  );
}
