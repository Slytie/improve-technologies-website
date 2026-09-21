# Improve Technologies — restored copy / refined Möbius

## Review
Open **preview.html** in a current browser. This single file includes both approved website pages and the live WebGL2 simulation. No installation, account, CDN, fonts or internet connection is required. Use a browser with WebGL2 enabled.

The modular website is **index.html** + **research-os.html**, with **styles.css** and **script.js** alongside them. **simulation.html** is a standalone, fully self-contained scene; its editable source is in **simulation.js** and **simulation.css**.

## What changed
- Restored the approved company copy from Improve_Technologies_Website.zip / Improve_Technologies_Preview.html. The headline, deck, ResearchOS detail page, research-step panels, evidence note, pilot form and footer remain intact.
- Replaced the hero's old orbital drawing with the electronic-ants Möbius simulation, surrounded by near-black space. The lower content sections retain the previous ivory-and-sage treatment.
- Broader opaque ribbon, a gently bent centerline, a smoothly concentrated half-twist, 34 longitudinal grooves, contrasting directional lighting and a depth-map self-shadow pass.
- A deliberately chosen initial angle makes the half-twist visible without user interaction.
- **Explore the ribbon** opens a full-screen in-page viewer. **See the fold** changes to a closer, oblique view and illuminates the strip's one continuous boundary. The traveling pulse traces that boundary.
- **Follow an ant** retains the surface-aligned camera and six-leg procedural gait. Drag to orbit, scroll/pinch to zoom; Space pauses, R resets. The website's own pause button controls its hero scene.
- The embedded scene is suspended offscreen and while the interactive viewer is open. Reduced-motion preferences start motion paused.

## Copy and scientific boundaries
The company copy was restored, not rewritten. New words are confined to simulation controls and the disclosure that this is interactive geometry, not a live ResearchOS session.
Ant motion, traces and the edge pulse are visual mechanisms; they do not imply that this scene implements autonomous scientific research or actual learning. The scene is procedural surface locomotion, not an N-body galaxy or a biological-ant simulation.

## Geometry
Let theta(u) = u/2 + 0.26 + 0.36 sin(u), R = 3.10, W = 1.08.
For -W <= v <= W:
  x = (R + v cos(theta)) cos(u)
  y = v sin(theta) + 0.16 sin(2u + 0.6)
  z = (R + v cos(theta)) sin(u)

The physical ribbon uses 0 <= u <= 2*pi with (u + 2*pi, v) identified with (u, -v).
Ant body orientation is evaluated on a 4*pi cover, keeping the local frame continuous across the half-twist. The traced boundary is the single closed curve (u, W), for 0 <= u <= 4*pi.

## Website integration
The public preview is available at
<https://slytie.github.io/improve-technologies-website/>. The pilot form still
builds/downloads a brief locally; it does not send it to an inbox. No tracking,
remote submission, stock photography or bundled font files have been added.

## Deployment
The site is deployed automatically to GitHub Pages from the `main` branch. The
deployment workflow publishes only the two website pages, their shared CSS and
JavaScript, the favicon, and the logo mark. Review captures and editable source
files remain in the repository but are not included in the public Pages artifact.

## Checks
46 targeted checks passed in Chromium with WebGL2 software rendering under Xvfb, including exact copy comparisons, shader execution, continuous surface normals, numerical tangent verification, ant movement, pause/resume, viewer controls, mobile fit and reduced motion. See review/qa-results.json. This is not an all-browser or real-device performance certification.

The short MP4 is captured directly from deterministic frames of the updated renderer. It is not image-generated; the HTML continues animating interactively.

## Editing
After modifying simulation.js / simulation.css, run `python rebuild_simulation.py` to refresh simulation.html and both embedded payloads. For marketing-copy changes, edit the modular pages; preview.html is a separately assembled two-page review version. Keep the existing accurate status labels and the local-only pilot-form disclosure.
