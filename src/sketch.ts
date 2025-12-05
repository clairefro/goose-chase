import p5 from "p5";
import { PLAYER_1, PLAYER_2, SYSTEM } from "@rcade/plugin-input-classic";

// Rcade game dimensions
const WIDTH = 336;
const HEIGHT = 262;

/** ------- MODELS -------------  */

class Goose {
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

  constructor(p: p5) {
    this.x = p.random(this.size, WIDTH - this.size);
    this.y = p.random(this.size, HEIGHT - this.size);
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
    goalHeight?: number
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

    // Flee from closest player if too close
    const closestDistance = Math.min(distance1, distance2);
    if (closestDistance < this.fleeDistance && closestDistance > 0) {
      // Use the closer player's direction
      const dx = distance1 < distance2 ? dx1 : dx2;
      const dy = distance1 < distance2 ? dy1 : dy2;
      const angle = Math.atan2(dy, dx);
      this.vx += Math.cos(angle) * this.fleeSpeed;
      this.vy += Math.sin(angle) * this.fleeSpeed;
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

    // Bounce off walls
    if (this.x < this.size) {
      this.x = this.size;
      this.vx = Math.abs(this.vx);
    }
    if (this.x > WIDTH - this.size) {
      this.x = WIDTH - this.size;
      this.vx = -Math.abs(this.vx);
    }
    if (this.y < this.size) {
      this.y = this.size;
      this.vy = Math.abs(this.vy);
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
      this.vy = -Math.abs(this.vy);
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

/** --------------------------------- */

const sketch = (p: p5) => {
  let player1X: number;
  let player1Y: number;
  let player2X: number;
  let player2Y: number;
  const playerSpeed = 4;
  const playerSize = 10;
  let gameStarted = false;
  let twoPlayerMode = false;
  let geese: Goose[] = [];
  const numGeese = 404;

  // Sprite sheet
  let gooseSpriteSheet: p5.Image;
  let gooseFrames: p5.Image[] = [];

  // Font
  let pixelFont: p5.Font;

  p.preload = () => {
    gooseSpriteSheet = p.loadImage("src/assets/img/ss-goose-walk.png");
    pixelFont = p.loadFont("src/assets/fonts/PressStart2P-vaV7.ttf");
  }; // Goal area (elevator)
  const goalWidth = 50;
  const goalHeight = 40;
  const goalX = WIDTH - goalWidth - 20; // 20px space from right wall
  const goalY = HEIGHT - 10; // Partially off-screen at bottom
  let geeseHerded = 0;

  // Timer and scoring
  let startTime = 0;
  let elapsedTime = 0;
  let finalScore = 0;
  let gameWon = false;

  const resetGame = () => {
    player1X = WIDTH / 3;
    player1Y = HEIGHT / 2;
    player2X = (WIDTH * 2) / 3;
    player2Y = HEIGHT / 2;
    geese = [];
    for (let i = 0; i < numGeese; i++) {
      geese.push(new Goose(p));
    }
    geeseHerded = 0;
    startTime = p.millis();
    elapsedTime = 0;
    finalScore = 0;
    gameWon = false;
    gameStarted = true;
  };

  p.setup = () => {
    p.createCanvas(WIDTH, HEIGHT);
    player1X = WIDTH / 3;
    player1Y = HEIGHT / 2;
    player2X = (WIDTH * 2) / 3;
    player2Y = HEIGHT / 2;

    // Set 8-bit pixel font for all text
    p.textFont(pixelFont);

    // Extract frames from sprite sheet (adjust frame count and size as needed)
    // Frames are 64x32 pixels in a horizontal row
    const frameWidth = 64;
    const frameHeight = 32;
    const frameCount = 4;

    for (let i = 0; i < frameCount; i++) {
      // Extract center 32px of each 64px wide frame
      const xOffset = 16; // (64 - 32) / 2 = 16
      const frame = gooseSpriteSheet.get(
        i * frameWidth + xOffset,
        0,
        32, // extract 32px width
        frameHeight
      );
      gooseFrames.push(frame);
    }

    // Create geese
    for (let i = 0; i < numGeese; i++) {
      geese.push(new Goose(p));
    }
  };

  p.draw = () => {
    p.background(120, 180, 120); // Grass green

    // ====== START SCREEN ======
    if (!gameStarted) {
      // Show start screen
      p.fill(255);
      p.textSize(12);
      p.textAlign(p.CENTER, p.CENTER);
      p.text("GOOSE CHASE", WIDTH / 2, HEIGHT / 2 - 30);
      p.textSize(8);
      p.text("Press 1P START for solo", WIDTH / 2, HEIGHT / 2);
      p.text("Press 2P START for team", WIDTH / 2, HEIGHT / 2 + 20);
      p.textSize(6);
      p.text(
        "Use D-PAD to chase the geese out of RC",
        WIDTH / 2,
        HEIGHT / 2 + 45
      );

      if (SYSTEM.ONE_PLAYER) {
        gameStarted = true;
        twoPlayerMode = false;
        startTime = p.millis();
      } else if (SYSTEM.TWO_PLAYER) {
        gameStarted = true;
        twoPlayerMode = true;
        startTime = p.millis();
      }
      return;
    }
    // ====== END START SCREEN ======

    // Update elapsed time if game not won
    if (!gameWon) {
      elapsedTime = p.millis() - startTime;
    }

    // Handle input from arcade controls - Player 1
    if (PLAYER_1.DPAD.up) {
      player1Y -= playerSpeed;
    }
    if (PLAYER_1.DPAD.down) {
      player1Y += playerSpeed;
    }
    if (PLAYER_1.DPAD.left) {
      player1X -= playerSpeed;
    }
    if (PLAYER_1.DPAD.right) {
      player1X += playerSpeed;
    }

    // Keep player 1 in bounds
    player1X = p.constrain(player1X, playerSize / 2, WIDTH - playerSize / 2);
    player1Y = p.constrain(player1Y, playerSize / 2, HEIGHT - playerSize / 2);

    // Handle input for Player 2 if in two-player mode
    if (twoPlayerMode) {
      if (PLAYER_2.DPAD.up) {
        player2Y -= playerSpeed;
      }
      if (PLAYER_2.DPAD.down) {
        player2Y += playerSpeed;
      }
      if (PLAYER_2.DPAD.left) {
        player2X -= playerSpeed;
      }
      if (PLAYER_2.DPAD.right) {
        player2X += playerSpeed;
      }

      // Keep player 2 in bounds
      player2X = p.constrain(player2X, playerSize / 2, WIDTH - playerSize / 2);
      player2Y = p.constrain(player2Y, playerSize / 2, HEIGHT - playerSize / 2);
    }

    // Draw goal area first (so it appears behind geese)
    // Elevator door
    p.fill(60, 60, 70); // Dark gray elevator
    p.noStroke();
    p.rect(goalX, goalY, goalWidth, goalHeight);
    // Elevator door frame
    p.stroke(40, 40, 50);
    p.strokeWeight(2);
    p.noFill();
    p.rect(goalX, goalY, goalWidth, goalHeight);
    // Door split line
    p.line(
      goalX + goalWidth / 2,
      goalY,
      goalX + goalWidth / 2,
      goalY + goalHeight
    );
    p.noStroke();

    // Flashing red arrow above goal
    if (p.frameCount % 30 < 15) {
      // Flash every 30 frames
      p.fill(255, 50, 50);
      p.noStroke();
      const arrowX = goalX + goalWidth / 2;
      const arrowY = goalY - 20;
      const arrowSize = 8;
      // Draw downward pointing triangle
      p.triangle(
        arrowX,
        arrowY + arrowSize,
        arrowX - arrowSize,
        arrowY - arrowSize,
        arrowX + arrowSize,
        arrowY - arrowSize
      );
    }

    // Update and draw geese
    geese = geese.filter((goose) => {
      if (twoPlayerMode) {
        goose.update(
          p,
          player1X,
          player1Y,
          player2X,
          player2Y,
          goalX,
          goalY,
          goalWidth,
          goalHeight
        );
      } else {
        goose.update(
          p,
          player1X,
          player1Y,
          undefined,
          undefined,
          goalX,
          goalY,
          goalWidth,
          goalHeight
        );
      }

      // Check if goose touches any part of goal (elevator)
      // Use goose size to check if it overlaps with goal rectangle
      const gooseRight = goose.x + goose.size / 2;
      const gooseLeft = goose.x - goose.size / 2;
      const gooseBottom = goose.y + goose.size / 2;
      const gooseTop = goose.y - goose.size / 2;

      const touchesGoalX =
        gooseRight >= goalX && gooseLeft <= goalX + goalWidth;
      const touchesGoalY =
        gooseBottom >= goalY && gooseTop <= goalY + goalHeight;

      if (touchesGoalX && touchesGoalY) {
        geeseHerded++;
        if (!gameWon && geese.length === 1) {
          // Last goose herded - game won!
          gameWon = true;
          // Logarithmic scoring: faster times get exponentially higher scores
          // Base score 100000 - higher starting value
          // Joke: If you take too long, you can get negative scores!
          const timeSeconds = elapsedTime / 1000;
          finalScore = Math.round(
            100000 / (1 + Math.log10(timeSeconds + 1)) - timeSeconds * 15
          );
        }
        return false; // Remove this goose
      }

      return true; // Keep this goose
    });
    for (const goose of geese) {
      goose.draw(p, gooseFrames);
    }

    // Draw player 1 as red X
    p.stroke(200, 50, 50);
    p.strokeWeight(4);
    p.line(
      player1X - playerSize / 2,
      player1Y - playerSize / 2,
      player1X + playerSize / 2,
      player1Y + playerSize / 2
    );
    p.line(
      player1X + playerSize / 2,
      player1Y - playerSize / 2,
      player1X - playerSize / 2,
      player1Y + playerSize / 2
    );

    // Draw player 2 as blue X if in two-player mode
    if (twoPlayerMode) {
      p.stroke(50, 100, 255);
      p.strokeWeight(4);
      p.line(
        player2X - playerSize / 2,
        player2Y - playerSize / 2,
        player2X + playerSize / 2,
        player2Y + playerSize / 2
      );
      p.line(
        player2X + playerSize / 2,
        player2Y - playerSize / 2,
        player2X - playerSize / 2,
        player2Y + playerSize / 2
      );
    }
    p.noStroke();

    // Draw geese count and timer
    p.fill(255);
    p.textSize(8);
    p.textAlign(p.LEFT, p.TOP);
    p.text(`Geese: ${geeseHerded}/${numGeese}`, 10, 10);

    const seconds = Math.floor(elapsedTime / 1000);
    const milliseconds = Math.floor((elapsedTime % 1000) / 10);
    const timeStr = `${seconds}.${milliseconds.toString().padStart(2, "0")}s`;
    p.text(`Time: ${timeStr}`, 10, 30);

    // Show current score in real-time
    const timeSeconds = elapsedTime / 1000;
    const currentScore = Math.round(
      100000 / (1 + Math.log10(timeSeconds + 1)) - timeSeconds * 15
    );
    p.text(`Score: ${currentScore}`, 10, 50);

    // Check for win condition
    if (gameWon) {
      p.fill(255, 255, 100);
      p.textSize(16);
      p.textAlign(p.CENTER, p.CENTER);
      p.text("YOU WIN!", WIDTH / 2, HEIGHT / 2 - 20);
      p.textSize(10);
      p.text(`Time: ${timeStr}`, WIDTH / 2, HEIGHT / 2 + 10);
      p.text(`Score: ${finalScore}`, WIDTH / 2, HEIGHT / 2 + 35);
      p.textSize(8);
      p.text("Press A to restart", WIDTH / 2, HEIGHT / 2 + 60);

      // Check for restart
      if (PLAYER_1.A) {
        resetGame();
      }
    }
  };
};

new p5(sketch, document.getElementById("sketch")!);
