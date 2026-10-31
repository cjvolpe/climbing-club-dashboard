# dashboard

An Electron application with React and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [Biome](https://marketplace.visualstudio.com/items?itemName=biomejs.biome)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Styling

Tailwind CSS is enabled in the renderer through `@tailwindcss/vite`.
Use utility classes directly in React components, for example:

```tsx
<div className="flex items-center gap-4 p-6">Climbing club</div>
```

The stylesheet entry is `src/renderer/src/assets/main.css`. Tailwind scans
`src/renderer/src` for class names. Existing styles use the base and components
layers so Tailwind utilities can override them. Install the recommended Tailwind CSS
IntelliSense extension for editor completions.

### Code quality

Biome formats and checks JavaScript, TypeScript, JSON, CSS, and HTML files.
Markdown and YAML are outside the configured scope. Generated output and the npm lockfile are excluded.

```bash
npm run format     # Format files
npm run lint       # Run Biome lint checks
npm run check      # Check formatting, lint rules, and import organization
npm run check:fix  # Apply safe Biome fixes and formatting
npm run typecheck # Check TypeScript types
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```
