import React, { useEffect, useRef } from 'react';

export const VoiceWaveCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let mouseX = 0;
    let mouseY = 0;
    let step = 0;
    let animationFrameId: number;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = canvas.width = parent.clientWidth;
      height = canvas.height = parent.clientHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };

    window.addEventListener('mousemove', handleMouseMove);

    const drawWaveGrid = () => {
      const lines = 20;
      const points = 75;
      const spacingX = width / (points - 1);
      
      step += 0.014;

      for (let i = 0; i < lines; i++) {
        ctx.beginPath();
        const lineYRatio = i / lines;
        const baseY = height * 0.42 + i * 18;
        
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, `rgba(255, 85, 0, ${0.2 + lineYRatio * 0.55})`);
        grad.addColorStop(0.5, `rgba(225, 29, 72, ${0.4 + lineYRatio * 0.55})`);
        grad.addColorStop(1, `rgba(255, 85, 0, ${0.2 + lineYRatio * 0.45})`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5 + lineYRatio * 1.2;

        ctx.shadowBlur = 16 + lineYRatio * 10;
        ctx.shadowColor = i % 2 === 0 ? 'rgba(255, 85, 0, 0.85)' : 'rgba(225, 29, 72, 0.85)';

        for (let j = 0; j < points; j++) {
          const x = j * spacingX;
          
          const distToMouse = Math.hypot(x - mouseX, baseY - mouseY);
          const mouseFactor = Math.max(0, 1 - distToMouse / 300);
          const mouseElevation = mouseFactor * -42 * Math.sin(step * 3.5);

          const wave1 = Math.sin(j * 0.1 + step * 1.8 + i * 0.25) * (20 + i * 1.3);
          const wave2 = Math.cos(j * 0.07 - step * 1.3) * (14 + i * 0.7);
          
          const y = baseY + wave1 + wave2 + mouseElevation;

          if (j === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      drawWaveGrid();
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas id="voiceWaveCanvas" ref={canvasRef} />;
};
