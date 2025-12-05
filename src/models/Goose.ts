import p5 from "p5";

const WIDTH = 336;
const HEIGHT = 262;

export class Goose {
  x: number;
  y: number;
  vx: number = 0;
  vy: number = 0;
  size: number = 8;
  fleeDistance: number = 65;
  fleeSpeed: number = 2.5;
  wanderSpeed: number = 0.7;
  friction: number = 0.93;
  frameIndex: number = 0;
  frameCounter: number = 0;
  poopTimer: number = 0;
  nextPoop: number;
  chaseCount: number = 0;
  wasBeingChased: boolean = false;

  constructor(p: p5) {
    this.x = p.random(this.size, WIDTH - this.size);
    this.y = p.random(this.size, HEIGHT - this.size);
    // Random poop interval between 5-20 seconds (300-1200 frames at 60fps)
    this.nextPoop = Math.floor(p.random(300, 1200));
  }

  update(
    p: p5,
    player1X: number,
    player1Y: number,
    player2X?: number,
    player2Y?: number,
    goalX?: number,
    goalY?: number,
    goalWidth?: number,
    goalHeight?: number,
    player1Size?: number,
    player2Size?: number
  ) {
    // Calculate distance to player 1
    const dx1 = this.x - player1X;
    const dy1 = this.y - player1Y;
    const distance1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

    // Calculate distance to player 2 if exists
    let distance2 = Infinity;
    let dx2 = 0;
    let dy2 = 0;
    if (player2X !== undefined && player2Y !== undefined) {
      dx2 = this.x - player2X;
      dy2 = this.y - player2Y;
      distance2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    }

    // Calculate flee distance based on player sizes (larger players = larger flee radius)
    // Use 1.5x multiplier for powered up players instead of full 2.5x
    const baseFlee = this.fleeDistance;
    const player1Multiplier = 1 + ((player1Size || 10) / 10 - 1) * 0.6;
    const player2Multiplier = 1 + ((player2Size || 10) / 10 - 1) * 0.6;
    const player1FleeDistance = baseFlee * player1Multiplier;
    const player2FleeDistance = baseFlee * player2Multiplier;

    // Check if should flee from player 1 or player 2
    const fleeFromPlayer1 = distance1 < player1FleeDistance && distance1 > 0;
    const fleeFromPlayer2 = distance2 < player2FleeDistance && distance2 > 0;
    const isBeingChased = fleeFromPlayer1 || fleeFromPlayer2;

    // Track chase count - increment when first chased in a sequence
    if (isBeingChased && !this.wasBeingChased) {
      this.chaseCount++;
    }
    this.wasBeingChased = isBeingChased;

    if (isBeingChased) {
      // Use the closer player's direction (or the only threatening player)
      const dx = distance1 < distance2 ? dx1 : dx2;
      const dy = distance1 < distance2 ? dy1 : dy2;
      const angle = Math.atan2(dy, dx);
      // Increase flee speed by 0.3 for each chase, up to +3.0 max bonus
      const chaseSpeedBonus = Math.min(this.chaseCount * 0.3, 3.0);
      const effectiveFleeSpeed = this.fleeSpeed + chaseSpeedBonus;
      this.vx += Math.cos(angle) * effectiveFleeSpeed;
      this.vy += Math.sin(angle) * effectiveFleeSpeed;
    } else {
      // Random wandering when far from both players
      this.vx += p.random(-this.wanderSpeed, this.wanderSpeed);
      this.vy += p.random(-this.wanderSpeed, this.wanderSpeed);
    }

    // Apply friction
    this.vx *= this.friction;
    this.vy *= this.friction;

    // Limit speed
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > 4) {
      this.vx = (this.vx / speed) * 4;
      this.vy = (this.vy / speed) * 4;
    }

    // Update position
    this.x += this.vx;
    this.y += this.vy;

    // Update poop timer
    this.poopTimer++;

    // Corner detection - add escape velocity if stuck in corner
    const cornerMargin = this.size * 3;
    const nearLeftWall = this.x < cornerMargin;
    const nearRightWall = this.x > WIDTH - cornerMargin;
    const nearTopWall = this.y < cornerMargin;
    const nearBottomWall = this.y > HEIGHT - cornerMargin;

    // If in a corner (near two walls) and moving slowly, add escape velocity
    if (speed < 1) {
      if (nearLeftWall && nearTopWall) {
        this.vx += 2;
        this.vy += 2;
      } else if (nearRightWall && nearTopWall) {
        this.vx -= 2;
        this.vy += 2;
      } else if (nearLeftWall && nearBottomWall) {
        this.vx += 2;
        this.vy -= 2;
      } else if (nearRightWall && nearBottomWall) {
        this.vx -= 2;
        this.vy -= 2;
      }
    }

    // Bounce off walls
    if (this.x < this.size) {
      this.x = this.size;
      this.vx = Math.abs(this.vx) + 0.5; // Add extra velocity to escape
    }
    if (this.x > WIDTH - this.size) {
      this.x = WIDTH - this.size;
      this.vx = -Math.abs(this.vx) - 0.5;
    }
    if (this.y < this.size) {
      this.y = this.size;
      this.vy = Math.abs(this.vy) + 0.5;
    }
    // Check if in goal area before bouncing at bottom
    const inGoalX =
      goalX !== undefined &&
      goalWidth !== undefined &&
      this.x >= goalX &&
      this.x <= goalX + goalWidth;
    const canEnterGoal =
      inGoalX &&
      goalY !== undefined &&
      goalHeight !== undefined &&
      this.y >= goalY;

    if (this.y > HEIGHT - this.size && !canEnterGoal) {
      this.y = HEIGHT - this.size;
      this.vy = -Math.abs(this.vy) - 0.5;
    } else if (this.y > HEIGHT + 20) {
      // Prevent going too far off-screen
      this.y = HEIGHT + 20;
      this.vy = -Math.abs(this.vy);
    }
  }

  draw(p: p5, frames?: p5.Image[]) {
    if (frames && frames.length > 0) {
      // Animate sprite
      this.frameCounter++;
      if (this.frameCounter % 8 === 0) {
        this.frameIndex = (this.frameIndex + 1) % frames.length;
      }

      p.push(); // Save transformation state
      p.translate(this.x, this.y); // Move to goose position

      // Flip sprite horizontally if moving left
      if (this.vx < 0) {
        p.scale(-1, 1);
      }

      p.imageMode(p.CENTER);
      p.image(frames[this.frameIndex], 0, 0, this.size * 2.5, this.size * 2.5);
      p.pop(); // Restore transformation state
    } else {
      // Fallback: Draw goose as a simple particle
      p.fill(255, 255, 200);
      p.noStroke();
      p.ellipse(this.x, this.y, this.size, this.size);

      // Draw eyes
      p.fill(50);
      p.ellipse(this.x - 3, this.y - 2, 2, 2);
      p.ellipse(this.x + 3, this.y - 2, 2, 2);
    }
  }
}
