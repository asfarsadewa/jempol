'use client';

import { useEffect, useRef, useState } from 'react';
import { FeedButton } from './FeedButton';
import type p5Type from 'p5';

// Only import p5 on client side
let p5Instance: typeof p5Type;
if (typeof window !== 'undefined') {
  import('p5').then(module => {
    p5Instance = module.default;
  });
}

class Particle {
  p: typeof p5Type;
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

  constructor(p: typeof p5Type, x: number, y: number) {
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
    const desired = p5Instance.Vector.sub(target, this.pos);
    this.distanceFromTarget = desired.mag();
    
    const angle = this.p.noise(this.pos.x * 0.01, this.pos.y * 0.01, this.p.frameCount * 0.01) * this.p.TWO_PI;
    const noiseForce = this.p.createVector(Math.cos(angle), Math.sin(angle));
    noiseForce.mult(0.5);
    
    const upwardForce = this.p.createVector(0, -0.5);
    
    const speedMultiplier = this.p.map(this.distanceFromTarget, 0, 200, 0.1, 1);
    desired.setMag(this.maxSpeed * speedMultiplier);
    
    const steer = desired.copy();
    steer.sub(this.vel);
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
    const FEEDING_DURATION = 3000;

    const sketch = (p: typeof p5Type) => {
      let targetPos: p5.Vector;
      let showThanks = false;
      let thanksStartTime = 0;
      
      p.setup = () => {
        const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.touchStarted(() => false);
        canvas.touchMoved(() => false);
        
        p.colorMode(p.HSB);
        centerPosRef.current = { x: p.width/2, y: p.height/2 };
        targetPos = p.createVector(centerPosRef.current.x, centerPosRef.current.y);
        
        for (let i = 0; i < NUM_PARTICLES; i++) {
          particles.push(
            new Particle(p, p.random(p.width), p.random(p.height))
          );
        }
        
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(p.width * 0.08);
      };

      p.draw = () => {
        p.background(0, 8);
        
        const mouseTarget = p.createVector(
          p.touches.length > 0 ? p.touches[0].x : p.mouseX,
          p.touches.length > 0 ? p.touches[0].y : p.mouseY
        );

        if (isFeeding) {
          const timeSinceFeeding = Date.now() - feedingTimeRef.current;
          
          if (timeSinceFeeding > FEEDING_DURATION) {
            setIsFeeding(false);
            showThanks = true;
            thanksStartTime = Date.now();
          } else {
            const progress = timeSinceFeeding / FEEDING_DURATION;
            const faceRadius = p.width * 0.15;
            
            if (progress < 0.3) {
              // Left eye - circular motion
              const eyeAngle = p.frameCount * 0.2;
              targetPos.x = centerPosRef.current.x - faceRadius * 0.3 + Math.cos(eyeAngle) * (faceRadius * 0.1);
              targetPos.y = centerPosRef.current.y - faceRadius * 0.2 + Math.sin(eyeAngle) * (faceRadius * 0.1);
            } else if (progress < 0.6) {
              // Right eye - circular motion
              const eyeAngle = p.frameCount * 0.2;
              targetPos.x = centerPosRef.current.x + faceRadius * 0.3 + Math.cos(eyeAngle) * (faceRadius * 0.1);
              targetPos.y = centerPosRef.current.y - faceRadius * 0.2 + Math.sin(eyeAngle) * (faceRadius * 0.1);
            } else {
              // Smile - half circle motion
              const smileAngle = p.map(Math.sin(p.frameCount * 0.1), -1, 1, 0, Math.PI);
              targetPos.x = centerPosRef.current.x + Math.cos(smileAngle) * faceRadius * 0.4;
              targetPos.y = centerPosRef.current.y + Math.sin(smileAngle) * faceRadius * 0.2 + faceRadius * 0.1;
            }

            // Color updates
            if (p.frameCount % 2 === 0) {
              particles.forEach(particle => {
                const hue = p.map(p.noise(particle.pos.x * 0.01, p.frameCount * 0.01), 0, 1, 15, 35);
                particle.color = p.color(hue, 100, 100);
              });
            }
          }
        } else {
          targetPos = mouseTarget;
        }

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

        // Draw "Thanks!" text
        if (showThanks) {
          const timeSinceStart = Date.now() - thanksStartTime;
          if (timeSinceStart < 5000) {
            // Draw text shadow first
            p.fill(0, 200);
            for (let i = 0; i < 10; i++) {
              p.text(
                "Thanks! 🔥", 
                centerPosRef.current.x + i, 
                centerPosRef.current.y - p.height * 0.2 + i
              );
            }
            // Draw main text
            p.fill(255, 255);
            p.textStyle(p.BOLD);
            p.textSize(p.width * 0.15); // Much bigger text
            p.text(
              "Thanks! 🔥", 
              centerPosRef.current.x, 
              centerPosRef.current.y - p.height * 0.2
            );
          } else {
            showThanks = false;
          }
        }
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        centerPosRef.current = { x: p.width/2, y: p.height/2 };
      };
    };

    const p5Instance = new p5Instance(sketch, containerRef.current);

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