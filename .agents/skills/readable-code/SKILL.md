---
name: readable-code
description: Improve code readability, maintainability, and organization. Use when writing, editing, refactoring, or reviewing code, especially React, Next.js, JavaScript, and TypeScript projects. Keep React page files under 250 lines and extract reusable or significant UI sections into components.
---

# Readable Code

Write clean, readable, maintainable code while preserving existing functionality.

## General Principles

### 1. Prioritize Readability
- Prefer simple, explicit solutions over clever or unnecessarily complex ones.
- Use descriptive names for variables, functions, classes, and components.
- Follow the naming conventions of the language and existing project.
- Avoid deeply nested conditionals and excessive abstraction.
- Use early returns when they improve readability.
- Keep related logic together.
- Remove unnecessary duplication.

### 2. Keep Functions Focused
- Each function should have one clear responsibility.
- Extract complex logic into appropriately named helper functions.
- Avoid functions with excessive parameters.
- Prefer readable intermediate variables over complicated expressions.
- Do not split straightforward logic into unnecessary helper functions.

### 3. Organize Files Logically
- Each file should have a clear purpose.
- Separate unrelated responsibilities into different files.
- Keep imports organized and consistent.
- Follow existing project conventions unless they conflict with maintainability.
- Avoid creating unnecessary files or directory structures.

### 4. Write Useful Comments
- Explain why something is done when the reasoning is not obvious.
- Avoid comments that merely restate the code.
- Document unusual behavior, important constraints, and non-obvious decisions.
- Prefer self-documenting code over excessive comments.

## React and Next.js Rules

### 1. Page File Length

For React and Next.js projects:

- Target a maximum of 200 lines per page file.
- Allow up to 250 lines when keeping closely related code together improves readability.
- Treat 250 lines as a hard maximum for newly created or substantially refactored page files.
- If a page exceeds 250 lines, extract components, hooks, utilities, or other logical sections.
- Do not compress code or remove useful whitespace merely to satisfy the line limit.
- For small edits to existing oversized pages, avoid unrelated refactoring unless requested.

These rules apply to page-level components, including Next.js `page.tsx` and `page.jsx` files.

### 2. Component Extraction

Extract UI into separate components when:

- The UI is reused or likely to be reused.
- The UI represents a significant or independently understandable section of a page.
- The UI contains substantial conditional rendering or interaction logic.
- Extracting it would meaningfully simplify the parent component.
- The parent page is approaching or exceeding its line limit.

Examples include:
- Navigation bars
- Headers and footers
- Search and filter interfaces
- Pagination controls
- Cards and information panels
- Forms
- Modals
- Complex lists
- Dashboard sections

Do not extract trivial JSX solely to create more components.

### 3. Component Organization

Store extracted components in a `components/` directory.

Prefer descriptive filenames and one primary component per file.

Example:

src/
├── app/
│   └── pokemon/
│       └── page.tsx
├── components/
│   └── pokemon/
│       ├── PokemonCard.tsx
│       ├── PokemonStats.tsx
│       └── PokemonPagination.tsx
├── hooks/
│   └── usePokemon.ts
└── lib/
    └── pokemon.ts

Follow the existing project structure when appropriate.

Keep components specific to a feature grouped together.

### 4. Separate UI and Logic

- Keep page components focused on composition and page-level behavior.
- Move complex reusable stateful logic into custom hooks.
- Move independent data transformations into utility functions.
- Keep API requests and data-access logic separate when doing so improves clarity.
- Avoid introducing abstractions for simple one-off operations.

### 5. Component Design

- Give components clear, descriptive names.
- Define explicit TypeScript props when using TypeScript.
- Prefer passing only the data a component needs.
- Avoid unnecessary prop drilling.
- Keep state as close as practical to where it is used.
- Use composition when it improves readability.
- Preserve accessibility and semantic HTML.

### 6. Avoid Overengineering

Do not:
- Extract every JSX element into its own component.
- Create custom hooks for trivial operations.
- Introduce unnecessary design patterns.
- Add dependencies without a clear benefit.
- Build generic abstractions for functionality used only once.
- Sacrifice readability to minimize line counts.

## Refactoring Guidelines

When improving existing code:

1. Identify readability and organization issues.
2. Determine which changes would meaningfully improve maintainability.
3. Extract significant UI sections into components when appropriate.
4. Simplify complicated functions and conditional logic.
5. Preserve existing behavior and public interfaces.
6. Keep changes focused on the requested task.
7. Run available formatting, linting, type-checking, and tests when practical.

Avoid unrelated changes during small feature requests.

## Before Finishing

Verify that:

- Code is readable and consistently formatted.
- Files have clear responsibilities.
- React page files satisfy the length guidelines when applicable.
- Reusable and significant UI sections are appropriately extracted.
- Component names and props are descriptive.
- Unnecessary abstractions have been avoided.
- Existing functionality has been preserved.

When substantial refactoring occurs, briefly summarize the structural changes and their purpose.