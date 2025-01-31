'use client';

import { useEffect, useRef } from 'react';
import { FeedButton } from './FeedButton';
import { PetButton } from './PetButton';
import { SleepButton } from './SleepButton';
import type { Vector, Color } from 'p5';
import type P5 from 'p5';

interface TouchPoint {
  x: number;
  y: number;
}

// Extend P5 type to include our custom method
interface P5WithFeeding extends P5 {
  startFeeding: () => void;
  startPetting: () => void;
  startSleeping: () => void;
  touches: TouchPoint[];
}

class Particle {
  p: P5WithFeeding;  // Update type here too
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
  growthFactor: number = 1.5;  // This will now be permanent

  constructor(p: P5WithFeeding, x: number, y: number) {
    this.p = p;
    this.pos = p.createVector(x, y);
    this.vel = p.createVector(0, 0);
    this.acc = p.createVector(0, 0);
    this.maxSpeed = 12;
    this.originalSize = p.random(6, 14);  // Set original size directly
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
    
    // Use permanent growth factor
    const sizeNoise = this.p.noise(this.pos.x * 0.05, this.pos.y * 0.05, this.p.frameCount * 0.02);
    this.size = this.p.map(
      this.distanceFromTarget,
      0,
      300,
      this.originalSize * this.growthFactor * (1.2 + sizeNoise * 0.8),
      this.originalSize * this.growthFactor * 0.2
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
  const p5Ref = useRef<P5WithFeeding | null>(null);  // Update ref type

  const handleFeed = () => {
    if (p5Ref.current) {
      p5Ref.current.startFeeding();
    }
  };

  const handlePet = () => {
    if (p5Ref.current) {
      p5Ref.current.startPetting();
    }
  };

  const handleSleep = () => {
    if (p5Ref.current) {
      p5Ref.current.startSleeping();
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    import('p5').then(module => {
      const p5 = module.default;
      
      const sketch = (p: P5WithFeeding) => {  // Update sketch parameter type
        let targetPos: Vector;
        let currentTarget: Vector;  // Add this to track current position
        const LERP_FACTOR = 0.1;    // Adjust this for faster/slower transitions
        const particles: Particle[] = [];
        let isFeeding = false;
        let feedStartTime = 0;
        const FEED_DURATION = 2000;
        const NUM_PARTICLES = 2000;
        let isPetting = false;
        let petStartTime = 0;
        const PET_DURATION = 3000;  // Increased from 1500 to 3000ms
        let isSleeping = false;
        let sleepStartTime = 0;
        const SLEEP_DURATION = 6000;
        const LERP_FACTOR_SLEEP = 0.02;

        p.startFeeding = () => {
          isFeeding = true;
          feedStartTime = p.millis();
          // Permanently increase size by 2x
          particles.forEach(particle => {
            particle.feeding = true;
            particle.growthFactor *= 1.5; // This growth will now persist
          });
        };

        p.startPetting = () => {
          if (!isFeeding) {
            isPetting = true;
            petStartTime = p.millis();
            // Set target to center when starting pet
            currentTarget.set(p.width/2, p.height/2);
            targetPos.set(p.width/2, p.height/2);
          }
        };

        p.startSleeping = () => {
          if (!isFeeding && !isPetting) {
            isSleeping = true;
            sleepStartTime = p.millis();
            // Don't set position immediately, let it move slowly
          }
        };

        p.draw = () => {
          p.background(0, 4);
          
          // Calculate corner positions each frame
          const CORNER_X = p.width * 0.15;    // Left side
          const CORNER_Y = p.height * 0.85;   // Bottom
          
          if (isSleeping) {
            const elapsed = p.millis() - sleepStartTime;
            if (elapsed > SLEEP_DURATION) {
              isSleeping = false;
            } else {
              // Slowly move to corner
              currentTarget.x = p.lerp(currentTarget.x, CORNER_X, LERP_FACTOR_SLEEP);
              currentTarget.y = p.lerp(currentTarget.y, CORNER_Y, LERP_FACTOR_SLEEP);
              
              // Gentle curling pulse
              const angle = elapsed * 0.001;
              const curledX = currentTarget.x + Math.cos(angle) * 15;
              const curledY = currentTarget.y + Math.sin(angle) * 15;
              
              // Slower pulsing
              const pulse = Math.sin(elapsed * 0.0008) * 8;
              targetPos.set(
                curledX + pulse,
                curledY + pulse
              );

              // Floating Zzz text
              const zSize = p.width * 0.04;
              p.push();
              p.fill(255, Math.sin(elapsed * 0.001) * 127 + 128);
              p.textSize(zSize);
              
              // Multiple Z's floating up in an arc
              const numZ = 3;
              for (let i = 0; i < numZ; i++) {
                const zPhase = (elapsed * 0.0008 + i * 1.0) % 3;
                const arcX = CORNER_X + 50 + Math.sin(zPhase * 0.5) * 40;
                const y = CORNER_Y - 80 - zPhase * 40;
                const opacity = Math.max(0, 1 - zPhase) * 255;
                
                p.fill(255, opacity);
                p.text("Z", arcX, y);
              }
              p.pop();
            }
          } else if (isPetting) {
            const elapsed = p.millis() - petStartTime;
            if (elapsed > PET_DURATION) {
              isPetting = false;
            } else {
              // Wiggle around the center
              const wiggleX = Math.sin(elapsed * 0.01) * 50;
              const wiggleY = Math.cos(elapsed * 0.015) * 30;
              targetPos.set(
                p.width/2 + wiggleX,
                p.height/2 + wiggleY
              );

              // Add wiggling text
              const textWiggleX = Math.sin(elapsed * 0.008) * 15;
              const textWiggleY = Math.cos(elapsed * 0.01) * 10;
              
              p.push();
              p.fill(255, Math.sin(elapsed * 0.01) * 127 + 128);
              p.textSize(p.width * 0.06);
              p.text(
                "✨ Wiggly Wiggly! ✨", 
                p.width/2 + textWiggleX, 
                p.height * 0.3 + textWiggleY
              );
              p.pop();
            }
          } else if (isFeeding) {
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

              // Add Yum yum text
              const textWiggleX = Math.sin(elapsed * 0.006) * 20;
              const textWiggleY = Math.cos(elapsed * 0.008) * 15;
              
              p.push();
              p.fill(255, Math.sin(elapsed * 0.01) * 127 + 128);
              p.textSize(p.width * 0.06);
              p.text(
                "🍖 Yum yum! 🍖", 
                p.width/2 + textWiggleX, 
                p.height * 0.3 + textWiggleY
              );
              p.pop();
            }
          } else {
            // Normal movement code
            const touchX = p.touches[0]?.x ?? p.mouseX;
            const touchY = p.touches[0]?.y ?? p.mouseY;
            
            currentTarget.x = p.lerp(currentTarget.x, touchX, LERP_FACTOR);
            currentTarget.y = p.lerp(currentTarget.y, touchY, LERP_FACTOR);
            targetPos.set(currentTarget.x, currentTarget.y);
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
          currentTarget = p.createVector(p.width/2, p.height/2);
          
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
          // Don't need to update corner positions as they're calculated each frame
        };
      };

      const p5Instance = new p5(sketch, container) as P5WithFeeding;
      p5Ref.current = p5Instance;

      return () => {
        p5Instance.remove();
      };
    });
  }, []);

  return (
    <div className="relative w-screen h-screen">
      <div ref={containerRef} />
      <SleepButton onSleep={handleSleep} />
      <PetButton onPet={handlePet} />
      <FeedButton onFeed={handleFeed} />
    </div>
  );
} 