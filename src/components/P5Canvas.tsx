'use client';

import { useEffect, useRef, useState } from 'react';
import p5 from 'p5';
import { FeedButton } from './FeedButton';

class Particle {
  p: p5;
  pos: p5.Vector;
  vel: p5.Vector;
  acc: p5.Vector;
  maxSpeed: number;
  size: number;
  originalSize: number;
  color: p5.Color;
  distanceFromTarget: number;
  lifespan: number;
  decay: number;

  constructor(p: p5, x: number, y: number) {
    this.p = p;
    this.pos = p.createVector(x, y);
    this.vel = p.createVector(0, 0);
    this.acc = p.createVector(0, 0);
    this.maxSpeed = 12;
    this.originalSize = p.random(6, 14);
    this.size = this.originalSize;
    this.distanceFromTarget = 0;
    this.lifespan = 255;
    this.decay = p.random(2, 4);
    
    const hue = p.random(15, 35);
    const saturation = p.random(90, 100);
    const brightness = p.random(95, 100);
    this.color = p.color(hue, saturation, brightness);
  }

  follow(target: p5.Vector) {
    let desired = p5.Vector.sub(target, this.pos);
    this.distanceFromTarget = desired.mag();
    
    const angle = this.p.noise(this.pos.x * 0.01, this.pos.y * 0.01, this.p.frameCount * 0.01) * this.p.TWO_PI;
    const noiseForce = p5.Vector.fromAngle(angle).mult(0.5);
    
    const upwardForce = this.p.createVector(0, -0.5);
    
    const speedMultiplier = this.p.map(this.distanceFromTarget, 0, 200, 0.1, 1);
    desired.setMag(this.maxSpeed * speedMultiplier);
    
    let steer = p5.Vector.sub(desired, this.vel);
    steer.limit(0.7);
    this.acc.add(steer);
    this.acc.add(noiseForce);
    this.acc.add(upwardForce);
  }

  update() {
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.mult(0);
    
    this.acc.add(this.p.createVector(0, 0.08));
    
    const sizeNoise = this.p.noise(this.pos.x * 0.05, this.pos.y * 0.05, this.p.frameCount * 0.02);
    this.size = this.p.map(
      this.distanceFromTarget,
      0,
      300,
      this.originalSize * (0.8 + sizeNoise * 0.4),
      this.originalSize * 0.2
    );

    if (this.distanceFromTarget > 200) {
      this.lifespan -= this.decay;
    } else {
      this.lifespan = 255;
    }
  }

  draw() {
    this.p.noStroke();
    
    const moveAlpha = this.p.map(this.distanceFromTarget, 0, 300, 255, 50);
    const alpha = this.p.min(moveAlpha, this.lifespan);
    
    const c = this.p.color(
      this.p.hue(this.color), 
      this.p.saturation(this.color), 
      this.p.brightness(this.color), 
      alpha
    );
    
    this.p.fill(c);
    this.p.circle(this.pos.x, this.pos.y, this.size);
  }

  isDead() {
    return this.lifespan < 0;
  }
}

export function P5Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFeeding, setIsFeeding] = useState(false);
  const feedingTimeRef = useRef<number>(0);
  const centerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const handleFeed = () => {
    setIsFeeding(true);
    feedingTimeRef.current = Date.now();
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const particles: Particle[] = [];
    const NUM_PARTICLES = 3000;
    const FEEDING_DURATION = 3000; // 3 seconds of excited behavior

    const sketch = (p: p5) => {
      let targetPos: p5.Vector;
      
      p.setup = () => {
        const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.touchStarted(() => false);
        canvas.touchMoved(() => false);
        
        p.colorMode(p.HSB);
        // Set center position
        centerPosRef.current = { x: p.width/2, y: p.height/2 };
        targetPos = p.createVector(centerPosRef.current.x, centerPosRef.current.y);
        
        for (let i = 0; i < NUM_PARTICLES; i++) {
          particles.push(
            new Particle(
              p,
              p.random(p.width),
              p.random(p.height)
            )
          );
        }
      };

      p.draw = () => {
        p.background(0, 8);
        
        // Normal target follows mouse/touch
        const mouseTarget = p.createVector(
          p.touches.length > 0 ? p.touches[0].x : p.mouseX,
          p.touches.length > 0 ? p.touches[0].y : p.mouseY
        );

        // When feeding, create excited behavior around the center
        if (isFeeding) {
          const timeSinceFeeding = Date.now() - feedingTimeRef.current;
          
          if (timeSinceFeeding > FEEDING_DURATION) {
            setIsFeeding(false);
          } else {
            // Create expanding/contracting circular motion during feeding
            const angle = (timeSinceFeeding * 0.005); // Slower rotation
            const baseRadius = p.min(p.width, p.height) * 0.15; // Responsive radius
            const radius = baseRadius + Math.sin(timeSinceFeeding * 0.003) * (baseRadius * 0.5);
            
            targetPos.x = centerPosRef.current.x + Math.cos(angle) * radius;
            targetPos.y = centerPosRef.current.y + Math.sin(angle) * radius;
            
            // Change particle colors during feeding
            particles.forEach(particle => {
              const hue = p.map(p.noise(particle.pos.x * 0.01, particle.pos.y * 0.01, p.frameCount * 0.02), 
                              0, 1, 0, 60);
              particle.color = p.color(hue, 100, 100);
            });
          }
        } else {
          targetPos = mouseTarget;
        }

        // Update center position on window resize
        centerPosRef.current = { x: p.width/2, y: p.height/2 };

        for (let i = particles.length - 1; i >= 0; i--) {
          if (particles[i].isDead()) {
            particles.splice(i, 1);
            particles.push(new Particle(p, targetPos.x, targetPos.y));
          }
        }

        particles.forEach(particle => {
          particle.follow(targetPos);
          particle.update();
          particle.draw();
        });
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        centerPosRef.current = { x: p.width/2, y: p.height/2 };
      };
    };

    const p5Instance = new p5(sketch, containerRef.current);

    return () => {
      p5Instance.remove();
    };
  }, [isFeeding]);

  return (
    <div className="relative w-screen h-screen">
      <div ref={containerRef} />
      <FeedButton onFeed={handleFeed} />
    </div>
  );
} 