import React, { useEffect, useRef } from 'react';

export const MovingVideoBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Particle nodes for cyber mesh
    const nodeCount = Math.min(80, Math.floor((width * height) / 18000));
    interface Node {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      pulse: number;
      pulseSpeed: number;
    }

    const colors = [
      'rgba(6, 182, 212, ',   // cyan
      'rgba(59, 130, 246, ',  // blue
      'rgba(16, 185, 129, ',  // emerald
      'rgba(139, 92, 246, ',  // purple
    ];

    const nodes: Node[] = [];
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        radius: Math.random() * 2.2 + 1.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.03,
      });
    }

    // Floating cyber data packets
    interface Packet {
      fromIndex: number;
      toIndex: number;
      progress: number;
      speed: number;
      color: string;
    }
    const packets: Packet[] = [];

    // Grid scanlines
    let scanlineY = 0;
    let radarAngle = 0;

    const render = () => {
      // Background clear with slight trail
      ctx.fillStyle = 'rgba(6, 11, 25, 0.25)';
      ctx.fillRect(0, 0, width, height);

      // 1. Moving Cyber Tech Grid
      ctx.strokeStyle = 'rgba(14, 116, 144, 0.07)';
      ctx.lineWidth = 1;
      const gridSize = 64;
      const timeOffset = (Date.now() * 0.015) % gridSize;

      for (let x = -timeOffset; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = -timeOffset; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Moving horizontal radar laser scanline
      scanlineY = (scanlineY + 1.5) % height;
      const scanGradient = ctx.createLinearGradient(0, scanlineY - 40, 0, scanlineY + 40);
      scanGradient.addColorStop(0, 'rgba(6, 182, 212, 0)');
      scanGradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.12)');
      scanGradient.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = scanGradient;
      ctx.fillRect(0, scanlineY - 40, width, 80);

      // 3. Update & Draw Mesh Nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;
        n.pulse += n.pulseSpeed;

        if (n.x < 0) n.x = width;
        if (n.x > width) n.x = 0;
        if (n.y < 0) n.y = height;
        if (n.y > height) n.y = 0;

        const currentRadius = n.radius + Math.sin(n.pulse) * 0.8;
        const opacity = 0.4 + Math.sin(n.pulse) * 0.3;

        // Node glow
        ctx.beginPath();
        ctx.arc(n.x, n.y, currentRadius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `${n.color} ${opacity * 0.25})`;
        ctx.fill();

        // Node core
        ctx.beginPath();
        ctx.arc(n.x, n.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = `${n.color} ${opacity})`;
        ctx.fill();

        // Connect nearby nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n.x - n2.x;
          const dy = n.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 140;

          if (dist < maxDist) {
            const lineOpacity = (1 - dist / maxDist) * 0.22;
            ctx.strokeStyle = `rgba(6, 182, 212, ${lineOpacity})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();

            // Spawn data packet occasionally
            if (Math.random() < 0.0006 && packets.length < 15) {
              packets.push({
                fromIndex: i,
                toIndex: j,
                progress: 0,
                speed: 0.015 + Math.random() * 0.02,
                color: 'rgba(56, 189, 248, 0.9)',
              });
            }
          }
        }
      }

      // 4. Update & Draw Cyber Data Packets
      for (let p = packets.length - 1; p >= 0; p--) {
        const pkt = packets[p];
        pkt.progress += pkt.speed;

        if (pkt.progress >= 1) {
          packets.splice(p, 1);
          continue;
        }

        const from = nodes[pkt.fromIndex];
        const to = nodes[pkt.toIndex];
        if (!from || !to) {
          packets.splice(p, 1);
          continue;
        }

        const px = from.x + (to.x - from.x) * pkt.progress;
        const py = from.y + (to.y - from.y) * pkt.progress;

        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = pkt.color;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 5. Ambient Cyber Light Waves
      radarAngle += 0.008;
      const cx = width * 0.85;
      const cy = height * 0.25;
      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 350);
      grad.addColorStop(0, 'rgba(6, 182, 212, 0.08)');
      grad.addColorStop(0.5, 'rgba(59, 130, 246, 0.04)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 350, 0, Math.PI * 2);
      ctx.fill();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#050914]">
      {/* Video Background Layer with Video Element */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-screen filter saturate-150 contrast-125"
        poster="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23050914'><rect width='100' height='100'/></svg>"
      >
        {/* High performance public tech cyber looping videos / fallbacks */}
        <source
          src="https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-with-charts-and-data-31912-large.mp4"
          type="video/mp4"
        />
        <source
          src="https://assets.mixkit.co/videos/preview/mixkit-hud-interface-system-in-a-cyberpunk-city-31910-large.mp4"
          type="video/mp4"
        />
      </video>

      {/* Cyber Mesh & Neural Network Real-Time Moving Canvas Layer */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
      />

      {/* Dark Vignette & Top/Bottom Gradient Overlays for High Contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050914]/80 via-transparent to-[#050914]/95 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,transparent_0%,#050914_85%)] pointer-events-none opacity-80" />
    </div>
  );
};
