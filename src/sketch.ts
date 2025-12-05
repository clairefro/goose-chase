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

/** --------------------------------- */

class Poop {
  x: number;
  y: number;
  size: number = 2;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  draw(p: p5) {
    // Draw poop as small brown circle
    p.fill(101, 67, 33);
    p.noStroke();
    p.ellipse(this.x, this.y, this.size * 2, this.size * 2);
  }
}

class PowerUp {
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

/** --------------------------------- */

const sketch = (p: p5) => {
  let player1X: number;
  let player1Y: number;
  let player2X: number;
  let player2Y: number;
  const playerSpeed = 4;
  const basePlayerSize = 10;
  let player1Size = basePlayerSize;
  let player2Size = basePlayerSize;
  let player1PowerUpTimer = 0;
  let player2PowerUpTimer = 0;
  const powerUpDuration = 300; // 5 seconds at 60fps
  let gameStarted = false;
  let twoPlayerMode = false;
  let geese: Goose[] = [];
  const numGeese = 404;
  let powerUps: PowerUp[] = [];
  let powerUpSpawnTimer = 0;
  let nextPowerUpSpawn = 0;
  let poops: Poop[] = [];

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
    player1Size = basePlayerSize;
    player2Size = basePlayerSize;
    player1PowerUpTimer = 0;
    player2PowerUpTimer = 0;
    geese = [];
    for (let i = 0; i < numGeese; i++) {
      geese.push(new Goose(p));
    }
    powerUps = [];
    powerUpSpawnTimer = 0;
    nextPowerUpSpawn = Math.floor(p.random(300, 600)); // First spawn 5-10 seconds
    poops = [];
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

      // Spawn power-ups at random intervals
      powerUpSpawnTimer++;
      if (powerUpSpawnTimer >= nextPowerUpSpawn) {
        powerUps.push(new PowerUp(p));
        powerUpSpawnTimer = 0;
        // Next spawn in 5-15 seconds (300-900 frames at 60fps)
        nextPowerUpSpawn = Math.floor(p.random(300, 900));
      }

      // Update power-ups and remove expired ones
      powerUps = powerUps.filter((powerUp) => powerUp.update()); // Update power-up timers
      if (player1PowerUpTimer > 0) {
        player1PowerUpTimer--;
        if (player1PowerUpTimer === 0) {
          player1Size = basePlayerSize;
        }
      }
      if (player2PowerUpTimer > 0) {
        player2PowerUpTimer--;
        if (player2PowerUpTimer === 0) {
          player2Size = basePlayerSize;
        }
      }
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
    player1X = p.constrain(player1X, player1Size / 2, WIDTH - player1Size / 2);
    player1Y = p.constrain(player1Y, player1Size / 2, HEIGHT - player1Size / 2);

    // Check power-up collisions for player 1
    powerUps = powerUps.filter((powerUp) => {
      if (powerUp.checkCollision(player1X, player1Y)) {
        player1Size = basePlayerSize * 2.5;
        player1PowerUpTimer = powerUpDuration;
        return false;
      }
      return true;
    });

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
      player2X = p.constrain(
        player2X,
        player2Size / 2,
        WIDTH - player2Size / 2
      );
      player2Y = p.constrain(
        player2Y,
        player2Size / 2,
        HEIGHT - player2Size / 2
      );

      // Check power-up collisions for player 2
      powerUps = powerUps.filter((powerUp) => {
        if (powerUp.checkCollision(player2X, player2Y)) {
          player2Size = basePlayerSize * 2.5;
          player2PowerUpTimer = powerUpDuration;
          return false;
        }
        return true;
      });
    }

    // Draw poops
    for (const poop of poops) {
      poop.draw(p);
    }

    // Draw power-ups
    for (const powerUp of powerUps) {
      powerUp.draw(p);
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
          goalHeight,
          player1Size,
          player2Size
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
          goalHeight,
          player1Size
        );
      }

      // Check if goose should poop
      if (goose.poopTimer >= goose.nextPoop) {
        poops.push(new Poop(goose.x, goose.y));
        goose.poopTimer = 0;
        goose.nextPoop = Math.floor(p.random(300, 1200));
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
      player1X - player1Size / 2,
      player1Y - player1Size / 2,
      player1X + player1Size / 2,
      player1Y + player1Size / 2
    );
    p.line(
      player1X + player1Size / 2,
      player1Y - player1Size / 2,
      player1X - player1Size / 2,
      player1Y + player1Size / 2
    );

    // Show BIG MODE text if powered up
    if (player1PowerUpTimer > 0) {
      p.fill(255, 215, 0);
      p.textSize(6);
      p.textAlign(p.CENTER, p.BOTTOM);
      p.text("BIG MODE", player1X, player1Y - player1Size / 2 - 5);
    }

    // Draw player 2 as blue X if in two-player mode
    if (twoPlayerMode) {
      p.stroke(50, 100, 255);
      p.strokeWeight(4);
      p.line(
        player2X - player2Size / 2,
        player2Y - player2Size / 2,
        player2X + player2Size / 2,
        player2Y + player2Size / 2
      );
      p.line(
        player2X + player2Size / 2,
        player2Y - player2Size / 2,
        player2X - player2Size / 2,
        player2Y + player2Size / 2
      );

      // Show BIG MODE text if powered up
      if (player2PowerUpTimer > 0) {
        p.fill(255, 215, 0);
        p.textSize(6);
        p.textAlign(p.CENTER, p.BOTTOM);
        p.text("BIG MODE", player2X, player2Y - player2Size / 2 - 5);
      }
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
      // Calculate poop coverage percentage
      const poopArea = poops.length * Math.PI * 4; // Each poop has radius 2
      const screenArea = WIDTH * HEIGHT;
      const poopCoveragePercent = (poopArea / screenArea) * 100;

      p.fill(255, 255, 100);
      p.textSize(16);
      p.textAlign(p.CENTER, p.CENTER);
      p.text("YOU WIN!", WIDTH / 2, HEIGHT / 2 - 30);
      p.textSize(10);
      p.text(`Time: ${timeStr}`, WIDTH / 2, HEIGHT / 2);
      p.text(`Score: ${finalScore}`, WIDTH / 2, HEIGHT / 2 + 25);
      p.text(
        `Poop Coverage: ${poopCoveragePercent.toFixed(1)}%`,
        WIDTH / 2,
        HEIGHT / 2 + 50
      );
      p.textSize(8);
      p.text("Press A to restart", WIDTH / 2, HEIGHT / 2 + 75);

      // Check for restart
      if (PLAYER_1.A) {
        resetGame();
      }
    }
  };
};

new p5(sketch, document.getElementById("sketch")!);
