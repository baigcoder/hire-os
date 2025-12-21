import React, { useEffect, useRef } from "react";

const InteractiveBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    const particles = [];
    const particleCount = Math.min(window.innerWidth / 10, 100); // Responsive count

    // Mouse state
    const mouse = { x: -1000, y: -1000, radius: 200 };

    window.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    });

    // Particle Class
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.baseSize = Math.random() * 2 + 0.5;
        this.size = this.baseSize;
        this.speedX = Math.random() * 0.4 - 0.2;
        this.speedY = Math.random() * 0.4 - 0.2;
        this.color = "#F59E0B"; // Amber-500
        this.opacity = Math.random() * 0.5 + 0.1;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Mouse Interaction: Gliding away gently or attracting
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < mouse.radius) {
          const forceDirectionX = dx / distance;
          const forceDirectionY = dy / distance;
          const force = (mouse.radius - distance) / mouse.radius;

          // Gentle push away
          const pushStrength = 2;
          this.x -= forceDirectionX * force * pushStrength;
          this.y -= forceDirectionY * force * pushStrength;

          // Glow up when near mouse
          this.size = this.baseSize * (1 + force * 1.5);
          this.opacity = Math.min(1, this.opacity + 0.05);
        } else {
          this.size = Math.lerp(this.size, this.baseSize, 0.1);
          this.opacity = Math.lerp(this.opacity, 0.3, 0.02);
        }

        // Wrap around screen
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
      }

      draw() {
        ctx.fillStyle = `rgba(245, 158, 11, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Helper for interpolation
    Math.lerp = (start, end, amt) => (1 - amt) * start + amt * end;

    const init = () => {
      particles.length = 0;
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas

      // Draw Connection Lines
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.update();
        p1.draw();

        // Connect to nearby particles
        for (let j = i; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const connectDistance = 120;

          if (distance < connectDistance) {
            ctx.beginPath();
            const opacity = 1 - distance / connectDistance;

            // If mouse is near, make line gold, otherwise faint grey
            const mouseDist = Math.sqrt(
              (mouse.x - p1.x) ** 2 + (mouse.y - p1.y) ** 2,
            );
            if (mouseDist < 200) {
              ctx.strokeStyle = `rgba(245, 158, 11, ${opacity * 0.8})`; // Gold
              ctx.lineWidth = 0.8;
            } else {
              ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.05})`; // Faint white
              ctx.lineWidth = 0.2;
            }

            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // Connect to Mouse specifically (Neural effect)
        const dx = mouse.x - p1.x;
        const dy = mouse.y - p1.y;
        const distMouse = Math.sqrt(dx * dx + dy * dy);
        if (distMouse < 200) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(245, 158, 11, ${1 - distMouse / 200})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ opacity: 0.8 }}
    />
  );
};

export default InteractiveBackground;
