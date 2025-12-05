# Goose Chase

Chase all the geese out of RC

## Getting Started

Install dependencies:

```bash
npm install
npm run dev
```

## p5.js Basics

The template uses p5.js in [instance mode](https://github.com/processing/p5.js/wiki/Global-and-instance-mode) with TypeScript:

```ts
import p5 from "p5";

const sketch = (p: p5) => {
  p.setup = () => {
    p.createCanvas(336, 262); // RCade dimensions
  };

  p.draw = () => {
    p.background(26, 26, 46);
    p.fill(255);
    p.ellipse(p.width / 2, p.height / 2, 50, 50);
  };
};

new p5(sketch, document.getElementById("sketch")!);
```

## Arcade Controls

This template uses `@rcade/plugin-input-classic` for arcade input:

```ts
import { PLAYER_1, SYSTEM } from "@rcade/plugin-input-classic";

// D-pad
if (PLAYER_1.DPAD.up) {
  /* ... */
}
if (PLAYER_1.DPAD.down) {
  /* ... */
}
if (PLAYER_1.DPAD.left) {
  /* ... */
}
if (PLAYER_1.DPAD.right) {
  /* ... */
}

// Buttons
if (PLAYER_1.A) {
  /* ... */
}
if (PLAYER_1.B) {
  /* ... */
}

// System
if (SYSTEM.ONE_PLAYER) {
  /* Start game */
}
```

## RCade Screen Size

The RCade cabinet uses a 336x262 pixel display. The template is pre-configured with these dimensions.

## Deployment

First, create a new repository on GitHub:

1. Go to [github.com/new](https://github.com/new)
2. Create a new repository (can be public or private)
3. **Don't** initialize it with a README, .gitignore, or license

Then connect your local project and push:

```bash
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

The included GitHub Actions workflow will automatically deploy to RCade.

---

Made with <3 at [The Recurse Center](https://recurse.com)

## Credits

### Sound

Quack Sound Effect by <a href="https://pixabay.com/users/freesound_community-46691455/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=14494">freesound_community</a> from <a href="https://pixabay.com/sound-effects//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=14494">Pixabay</a>

### Images

Goose: https://duckhive.itch.io/goose

### Font

Press Start 2P by [codeman38](https://www.fontspace.com/codeman38)
