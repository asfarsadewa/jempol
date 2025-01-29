'use client';

import { useEffect, useRef, useState } from 'react';
import { FeedButton } from './FeedButton';
import type { Vector, Color } from 'p5';

class Particle {
  p: any; // We'll type this as any for now since we get the actual p5 instance in constructor
  pos: Vector;
  vel: Vector;
  acc: Vector;
  maxSpeed: number;
  size: number;
  originalSize: number;
  color: Color;
  distanceFromTarget: number;
  lifespan: number;
  decay: number;
  feeding: boolean = false;

  constructor(p: any, x: number, y: number) {
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

  follow(target: Vector) {
    const desired = this.p.createVector(
      target.x - this.pos.x,
      target.y - this.pos.y
    );
    this.distanceFromTarget = desired.mag();
    
    // More organic movement
    const angle = this.p.noise(this.pos.x * 0.01, this.pos.y * 0.01, this.p.frameCount * 0.01) * this.p.TWO_PI;
    const noiseForce = this.p.createVector(Math.cos(angle), Math.sin(angle));
    noiseForce.mult(1.2); // Increased noise influence
    
    const upwardForce = this.p.createVector(0, -0.8); // More upward drift
    
    const speedMultiplier = this.p.map(this.distanceFromTarget, 0, 200, 0.1, 1);
    desired.setMag(this.feeding ? 12 : this.maxSpeed * speedMultiplier);
    
    const steer = this.p.createVector(
      desired.x - this.vel.x,
      desired.y - this.vel.y
    );
    steer.limit(0.7);
    
    // Adjust force weights
    this.acc.add(steer.mult(0.8));         // Less steering
    this.acc.add(noiseForce);              // More noise
    this.acc.add(upwardForce.mult(0.6));   // More drift
  }

  update() {
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.mult(0);
    
    // Very light gravity
    this.acc.add(this.p.createVector(0, 0.02));
    
    // More dramatic size variation
    const sizeNoise = this.p.noise(this.pos.x * 0.05, this.pos.y * 0.05, this.p.frameCount * 0.02);
    this.size = this.p.map(
      this.distanceFromTarget,
      0,
      300,
      this.originalSize * (1.2 + sizeNoise * 0.8), // Bigger head
      this.originalSize * 0.2  // Smaller tail
    );

    // Longer trails
    if (this.distanceFromTarget > 200) {
      this.lifespan -= this.decay * 0.5;
    } else {
      this.lifespan = 255;
    }
  }

  draw() {
    this.p.noStroke();
    
    // Longer trails
    const moveAlpha = this.p.map(this.distanceFromTarget, 0, 300, 255, 30);
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
  const p5Ref = useRef<any>(null); // Store p5 instance reference

  const handleFeed = () => {
    if (p5Ref.current) {
      p5Ref.current.startFeeding();
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    import('p5').then(module => {
      const p5 = module.default;
      
      const sketch = (p: any) => {
        let targetPos: Vector;
        let particles: Particle[] = [];
        let isFeeding = false;
        let feedStartTime = 0;
        const FEED_DURATION = 2000;
        const NUM_PARTICLES = 2000;

        p.startFeeding = () => {
          isFeeding = true;
          feedStartTime = p.millis();
          // Set all particles to feeding mode
          particles.forEach(particle => particle.feeding = true);
        };

        p.draw = () => {
          p.background(0, 4);
          
          // Always update target position first
          if (!isFeeding) {
            targetPos.set(
              p.touches.length > 0 ? p.touches[0].x : p.mouseX,
              p.touches.length > 0 ? p.touches[0].y : p.mouseY
            );
          } else {
            const elapsed = p.millis() - feedStartTime;
            if (elapsed > FEED_DURATION) {
              isFeeding = false;
              particles.forEach(particle => particle.feeding = false);
            } else {
              const progress = (elapsed / FEED_DURATION) * Math.PI;
              const radius = p.width * 0.2;
              targetPos.set(
                p.width/2 + Math.cos(progress) * radius,
                p.height/2 + Math.sin(progress) * radius * 0.5
              );
            }
          }

          // Update and draw particles
          for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            particle.follow(targetPos);
            particle.update();
            particle.draw();
            
            if (particle.isDead()) {
              particles.splice(i, 1);
              particles.push(new Particle(p, targetPos.x, targetPos.y));
            }
          }
        };

        p.setup = () => {
          const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
          canvas.touchStarted(() => false);
          canvas.touchMoved(() => false);
          
          p.colorMode(p.HSB);
          targetPos = p.createVector(p.width/2, p.height/2);
          
          // Initialize particles
          for (let i = 0; i < NUM_PARTICLES; i++) {
            particles.push(
              new Particle(
                p,
                p.width/2 + p.random(-100, 100),  // Start near center
                p.height/2 + p.random(-100, 100)
              )
            );
          }
          
          p.textAlign(p.CENTER, p.CENTER);
          p.textSize(p.width * 0.08);
        };

        p.windowResized = () => {
          p.resizeCanvas(p.windowWidth, p.windowHeight);
          targetPos.set(p.width/2, p.height/2);
        };
      };

      const p5Instance = new p5(sketch, containerRef.current);
      p5Ref.current = p5Instance; // Store the instance

      return () => {
        p5Instance.remove();
      };
    });
  }, []); // No dependencies needed

  return (
    <div className="relative w-screen h-screen">
      <div ref={containerRef} />
      <FeedButton onFeed={handleFeed} />
    </div>
  );
} 