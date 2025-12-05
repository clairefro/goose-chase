import p5 from "p5";
import { PLAYER_1, PLAYER_2, SYSTEM } from "@rcade/plugin-input-classic";
import { Goose } from "./models/Goose";
import { Poop } from "./models/Poop";
import { PowerUp } from "./models/PowerUp";
import gooseSpriteUrl from "./assets/img/ss-goose-walk.png";
import cat1SpriteUrl from "./assets/img/ss-cat-1.png";
import cat2SpriteUrl from "./assets/img/ss-cat-2.png";
import pixelFontUrl from "./assets/fonts/PressStart2P-vaV7.ttf";
import backgroundUrl from "./assets/tilemaps/map.png";
import quackSoundUrl from "./assets/sounds/quack.mp3";

// Rcade game dimensions
const WIDTH = 336;
const HEIGHT = 262;

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

  // Player sprites
  let cat1SpriteSheet: p5.Image;
  let cat2SpriteSheet: p5.Image;
  let cat1Frames: {
    down: p5.Image[];
    left: p5.Image[];
    right: p5.Image[];
    up: p5.Image[];
  } = { down: [], left: [], right: [], up: [] };
  let cat2Frames: {
    down: p5.Image[];
    left: p5.Image[];
    right: p5.Image[];
    up: p5.Image[];
  } = { down: [], left: [], right: [], up: [] };

  // Player animation
  let player1Direction = "down";
  let player2Direction = "down";
  let player1FrameIndex = 0;
  let player2FrameIndex = 0;
  let animationCounter = 0;

  // Font
  let pixelFont: p5.Font;

  // Background
  let backgroundImg: p5.Image;

  // Web Audio API for sound
  let audioContext: AudioContext;
  let quackBuffer: AudioBuffer | null = null;

  p.preload = () => {
    gooseSpriteSheet = p.loadImage(gooseSpriteUrl);
    cat1SpriteSheet = p.loadImage(cat1SpriteUrl);
    cat2SpriteSheet = p.loadImage(cat2SpriteUrl);
    pixelFont = p.loadFont(pixelFontUrl);
    backgroundImg = p.loadImage(backgroundUrl);
  };

  // Initialize audio after user interaction
  function initAudio() {
    if (!audioContext) {
      audioContext = new AudioContext();

      // Load quack sound
      fetch(quackSoundUrl)
        .then((response) => response.arrayBuffer())
        .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
        .then((audioBuffer) => {
          quackBuffer = audioBuffer;
        })
        .catch((err) => console.error("Error loading quack sound:", err));
    }
  }

  // Function to play quack sound
  function playQuack() {
    if (!quackBuffer) return;

    const source = audioContext.createBufferSource();
    source.buffer = quackBuffer;
    source.connect(audioContext.destination);
    source.start(0);
  }
  // Goal area (elevator)
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

    // Extract cat frames (4 rows x 3 cols: down, left, right, up)
    const catFrameWidth = cat1SpriteSheet.width / 3;
    const catFrameHeight = cat1SpriteSheet.height / 4;
    const directions = ["down", "left", "right", "up"] as const;

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        const frame1 = cat1SpriteSheet.get(
          col * catFrameWidth,
          row * catFrameHeight,
          catFrameWidth,
          catFrameHeight
        );
        const frame2 = cat2SpriteSheet.get(
          col * catFrameWidth,
          row * catFrameHeight,
          catFrameWidth,
          catFrameHeight
        );
        cat1Frames[directions[row]].push(frame1);
        cat2Frames[directions[row]].push(frame2);
      }
    }

    // Create geese
    for (let i = 0; i < numGeese; i++) {
      geese.push(new Goose(p));
    }
  };

  p.draw = () => {
    // Draw background
    p.image(backgroundImg, 0, 0, WIDTH, HEIGHT);

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
        initAudio(); // Initialize audio on first user interaction
      } else if (SYSTEM.TWO_PLAYER) {
        gameStarted = true;
        twoPlayerMode = true;
        startTime = p.millis();
        initAudio(); // Initialize audio on first user interaction
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
    let player1Moving = false;
    if (PLAYER_1.DPAD.up) {
      player1Y -= playerSpeed;
      player1Direction = "up";
      player1Moving = true;
    }
    if (PLAYER_1.DPAD.down) {
      player1Y += playerSpeed;
      player1Direction = "down";
      player1Moving = true;
    }
    if (PLAYER_1.DPAD.left) {
      player1X -= playerSpeed;
      player1Direction = "left";
      player1Moving = true;
    }
    if (PLAYER_1.DPAD.right) {
      player1X += playerSpeed;
      player1Direction = "right";
      player1Moving = true;
    }

    // Keep player 1 in bounds
    player1X = p.constrain(player1X, player1Size / 2, WIDTH - player1Size / 2);
    player1Y = p.constrain(player1Y, player1Size / 2, HEIGHT - player1Size / 2);

    // Animate player 1
    if (player1Moving) {
      animationCounter++;
      if (animationCounter % 8 === 0) {
        player1FrameIndex = (player1FrameIndex + 1) % 3;
      }
    }

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
    let player2Moving = false;
    if (twoPlayerMode) {
      if (PLAYER_2.DPAD.up) {
        player2Y -= playerSpeed;
        player2Direction = "up";
        player2Moving = true;
      }
      if (PLAYER_2.DPAD.down) {
        player2Y += playerSpeed;
        player2Direction = "down";
        player2Moving = true;
      }
      if (PLAYER_2.DPAD.left) {
        player2X -= playerSpeed;
        player2Direction = "left";
        player2Moving = true;
      }
      if (PLAYER_2.DPAD.right) {
        player2X += playerSpeed;
        player2Direction = "right";
        player2Moving = true;
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

      // Animate player 2
      if (player2Moving && animationCounter % 8 === 0) {
        player2FrameIndex = (player2FrameIndex + 1) % 3;
      }

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
        playQuack(); // Play quack sound
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

    // Draw player 1 cat sprite
    p.push();
    p.imageMode(p.CENTER);
    const catSize = player1Size * 3;
    p.image(
      cat1Frames[player1Direction as keyof typeof cat1Frames][
        player1FrameIndex
      ],
      player1X,
      player1Y,
      catSize,
      catSize
    );
    p.pop();

    // Show BIG MODE text if powered up
    if (player1PowerUpTimer > 0) {
      p.fill(255, 215, 0);
      p.textSize(6);
      p.textAlign(p.CENTER, p.BOTTOM);
      p.text("BIG MODE", player1X, player1Y - player1Size / 2 - 5);
    }

    // Draw player 2 cat sprite if in two-player mode
    if (twoPlayerMode) {
      p.push();
      p.imageMode(p.CENTER);
      const cat2Size = player2Size * 3;
      p.image(
        cat2Frames[player2Direction as keyof typeof cat2Frames][
          player2FrameIndex
        ],
        player2X,
        player2Y,
        cat2Size,
        cat2Size
      );
      p.pop();

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
      const poopArea = poops.reduce((total, poop) => {
        // Calculate area of each circle: π * r²
        return total + Math.PI * poop.size * poop.size;
      }, 0);
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
