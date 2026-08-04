"use client";

import { useEffect, useRef } from "react";

const CELL_SIZE = 24;
const DOT_SIZE = 2.4;
const REVEAL_SPEED = 0.55;

export function AuthDotGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let seeds: Float32Array = new Float32Array(0);
    let animationId = 0;
    const startedAt = performance.now();

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(width / CELL_SIZE) + 1;
      rows = Math.ceil(height / CELL_SIZE) + 1;
      seeds = new Float32Array(cols * rows);
      for (let i = 0; i < seeds.length; i += 1) seeds[i] = Math.random();
    };

    resize();
    window.addEventListener("resize", resize);

    const centerX = () => width / 2;
    const centerY = () => height / 2;

    const draw = (now: number) => {
      const elapsed = (now - startedAt) / 1000;
      ctx.clearRect(0, 0, width, height);

      const cx = centerX();
      const cy = centerY();
      const maxDist = Math.hypot(cx, cy) || 1;

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const x = col * CELL_SIZE + CELL_SIZE / 2;
          const y = row * CELL_SIZE + CELL_SIZE / 2;
          const seed = seeds[row * cols + col] ?? 0;

          const dist = Math.hypot(x - cx, y - cy) / maxDist;
          const revealAt = dist * 0.6 + seed * 0.5;
          const revealed = reduceMotion || elapsed * REVEAL_SPEED > revealAt;
          if (!revealed) continue;

          const flicker = reduceMotion ? 0.5 : 0.35 + 0.35 * Math.sin(elapsed * 0.6 + seed * 18.84);
          const isAccent = seed > 0.86;
          const opacity = Math.max(0, flicker) * (isAccent ? 0.55 : 0.22);

          ctx.fillStyle = isAccent ? `rgba(231, 255, 73, ${opacity})` : `rgba(243, 241, 235, ${opacity})`;
          ctx.fillRect(x - DOT_SIZE / 2, y - DOT_SIZE / 2, DOT_SIZE, DOT_SIZE);
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    animationId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="auth-dot-grid" aria-hidden="true" />;
}
