# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A React + TypeScript SPA that visualises mood data exported from the [Pixels app](https://apps.apple.com/app/pixels-your-daily-mood-log/id1560327210). Users upload a JSON export and get an interactive Plotly chart showing rolling-average mood scores by year. Hosted on GitHub Pages at `https://teezeit.github.io/pixels/`.

## Commands

```bash
pnpm dev          # dev server at http://localhost:5173/pixels/
pnpm test         # run Vitest unit tests
pnpm test:watch   # tests in watch mode
pnpm build        # tsc + vite build → dist/
pnpm preview      # preview the production build locally
```

## Architecture

Everything lives in `src/`:

- **`dataProcessing.ts`** — pure functions: `parseJson` → `fillDateGaps` → `rollingAvg`. This is the core logic; tested in `dataProcessing.test.ts`.
- **`chart.ts`** — `buildFigure(entries, config)` produces a Plotly `{ data, layout }` object. One subplot row per selected year; x-axis normalised to year 2000 so years are visually comparable.
- **`App.tsx`** — all UI state (`ChartConfig`) in a single `useState`. `PlotView` uses a `useRef` + `Plotly.react()` to render the chart imperatively. Config controls are hidden until data is loaded.

## Data format

Input JSON is a list of objects: `[{"date": "YYYY-MM-DD", "scores": [1–5, ...]}, ...]`. Only `scores[0]` is used. `public/mock_pixels_data.json` is the sample dataset loaded by the "Try Sample Data" button.

## TDD

Write tests in `src/dataProcessing.test.ts` before implementing data-pipeline changes. The pure functions in `dataProcessing.ts` map cleanly to unit tests (see existing examples). Chart and UI changes are verified manually via `pnpm dev`.

## Deployment

Push to `main` → GitHub Actions (`.github/workflows/deploy.yml`) runs tests, builds, and deploys `dist/` to GitHub Pages. `vite.config.ts` sets `base: '/pixels/'` to match the repo name.
