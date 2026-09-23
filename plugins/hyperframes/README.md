# hyperframes

Adds HyperFrames video composition guidance to Cline with bundled skills for HTML-based video, animation adapters, media preprocessing, registry blocks, and conversion workflows.

## What It Adds

This plugin bundles skills for:

- Building HyperFrames HTML video compositions, captions, voiceovers, data-in-motion visuals, and scene transitions.
- Running the HyperFrames CLI dev loop for scaffolding, preview, linting, rendering, and troubleshooting.
- Writing deterministic animation adapters with GSAP, Anime.js, Lottie, Three.js, TypeGPU, WAAPI, CSS animations, and Tailwind v4 browser-runtime styles.
- Installing and wiring HyperFrames registry blocks and components.
- Preprocessing media with HyperFrames-supported text-to-speech, transcription, and background-removal workflows.
- Converting Remotion compositions or websites into HyperFrames projects.

## Requirements

Users need Node and npm or another package runner for `npx hyperframes` workflows. Some media workflows may need Python, FFmpeg, browser binaries, or model downloads depending on the specific HyperFrames command the user asks Cline to run.

## Install

```bash
cline plugin install hyperframes
```

For local development from this repository:

```bash
cline plugin install ./plugins/hyperframes --cwd .
```

## Example Usage

After installation, ask Cline:

```text
Create a 15-second product launch video in HyperFrames with animated captions and a final logo beat.
```

Cline can use the bundled HyperFrames skills to plan the composition, write HTML, wire deterministic animations, run the CLI validation loop, and prepare video outputs.

## Security Notes

The bundled skills can guide Cline to install packages, run local preview/render commands, read website assets, process media files, and generate video outputs. Cline should keep these actions explicit, avoid starting long renders or third-party downloads without user intent, and treat captured website/media content as user data.
