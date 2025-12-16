import React, { useEffect, useRef } from 'react';

const AnimatedBackground = ({ className = '' }) => {
  const containerRef = useRef(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const particles = [];
    const particleCount = 30;
    
    // Create particles
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      
      // Random position
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const z = Math.random() * 50 - 25;
      
      // Random size
      const size = Math.random() * 20 + 10;
      
      // Apply styles
      particle.style.left = `${x}%`;
      particle.style.top = `${y}%`;
      particle.style.transform = `translateZ(${z}px)`;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      
      // Random color
      const colors = ['#6A38C2', '#F83002', '#4CAF50', '#2196F3'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      particle.style.backgroundColor = color;
      particle.style.opacity = Math.random() * 0.5 + 0.1;
      
      // Add to container
      container.appendChild(particle);
      particles.push({
        element: particle,
        x, y, z,
        speedX: Math.random() * 0.5 - 0.25,
        speedY: Math.random() * 0.5 - 0.25,
        speedZ: Math.random() * 0.5 - 0.25
      });
    }
    
    // Animation loop
    let animationId;
    const animate = () => {
      particles.forEach(particle => {
        // Update position
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.z += particle.speedZ;
        
        // Boundary check
        if (particle.x < 0 || particle.x > 100) particle.speedX *= -1;
        if (particle.y < 0 || particle.y > 100) particle.speedY *= -1;
        if (particle.z < -25 || particle.z > 25) particle.speedZ *= -1;
        
        // Apply new position
        particle.element.style.left = `${particle.x}%`;
        particle.element.style.top = `${particle.y}%`;
        particle.element.style.transform = `translateZ(${particle.z}px)`;
      });
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      particles.forEach(particle => {
        if (container.contains(particle.element)) {
          container.removeChild(particle.element);
        }
      });
    };
  }, []);
  
  return (
    <div className={`animated-background absolute inset-0 overflow-hidden pointer-events-none ${className}`} ref={containerRef}>
      {/* Particles will be added here dynamically */}
    </div>
  );
};

export default AnimatedBackground;