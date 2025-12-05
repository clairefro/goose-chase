import p5 from "p5";

export class Poop {
  x: number;
  y: number;
  size: number;
  color: [number, number, number];

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    // Random small size between 2-3.5 pixels
    this.size = Math.random() * 1.5 + 2;
    // Darker range of brown shades
    const brownShade = Math.floor(Math.random() * 40) + 20; // 20-60 (darker)
    this.color = [brownShade + 15, brownShade, Math.max(0, brownShade - 10)];
  }

  draw(p: p5) {
    // Draw poop as pixelated square/rect
    p.fill(this.color[0], this.color[1], this.color[2]);
    p.noStroke();
    // Use rect for pixelated look, round size to nearest integer
    const pixelSize = Math.round(this.size);
    p.rect(Math.round(this.x), Math.round(this.y), pixelSize, pixelSize);
  }
}
