import p5 from "p5";

const WIDTH = 336;
const HEIGHT = 262;

export class PowerUp {
  x: number;
  y: number;
  size: number = 12;
  lifetime: number;
  age: number = 0;

  constructor(p: p5) {
    this.x = p.random(30, WIDTH - 30);
    this.y = p.random(30, HEIGHT - 60);
    // Random lifetime between 3-8 seconds (180-480 frames at 60fps)
    this.lifetime = Math.floor(p.random(180, 480));
  }

  update(): boolean {
    this.age++;
    return this.age < this.lifetime; // Return true if still alive
  }

  draw(p: p5) {
    // Draw power-up as simple golden circle
    p.fill(255, 215, 0);
    p.noStroke();
    p.ellipse(this.x, this.y, this.size * 2, this.size * 2);
  }

  checkCollision(playerX: number, playerY: number): boolean {
    const distance = Math.sqrt(
      (this.x - playerX) ** 2 + (this.y - playerY) ** 2
    );
    return distance < this.size + 10;
  }
}
