---
name: Climbing Club Treasury
description: Offline receipt review in a dark driver ledger with a clean printable record.
colors:
  primary: "#4b9cd3"
  primary-hover: "#71b6e4"
  primary-ink: "#071a2a"
  navy-ground: "#0e1b2a"
  inspector-surface: "#111f2e"
  input-surface: "#101d2c"
  driver-slate: "#1b2b3e"
  selected-surface: "#1b4162"
  hover-surface: "#19334b"
  nav-active: "#1c3c5a"
  nav-border: "#2d5f84"
  line: "#2a3b4f"
  input-border: "#42566f"
  button-border: "#466079"
  button-hover: "#233e58"
  text: "#edf3fc"
  button-text: "#dcecff"
  input-text: "#eaf1fb"
  muted: "#adbed4"
  focus: "#8fd1ff"
  review-pending-bg: "#4a3e20"
  review-pending-text: "#f4d681"
  reviewed-bg: "#163c37"
  reviewed-text: "#9de4c9"
  print-paper: "#fff"
  print-ink: "#162333"
typography:
  headline:
    fontFamily: '"Segoe UI", Arial, sans-serif'
    fontSize: "29px"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: '"Segoe UI", Arial, sans-serif'
    fontSize: "18px"
    fontWeight: 600
  body:
    fontFamily: '"Segoe UI", Arial, sans-serif'
    fontSize: "14px"
    fontWeight: 400
  label:
    fontFamily: '"Segoe UI", Arial, sans-serif'
    fontSize: "12px"
    fontWeight: 400
  print-body:
    fontFamily: "Arial, sans-serif"
    fontSize: "14px"
  print-name:
    fontFamily: "Allura, cursive"
    fontSize: "30px"
rounded:
  field: "4px"
  button: "5px"
  panel: "6px"
  status: "20px"
spacing:
  inline: "8px"
  action-gap: "10px"
  field-gap: "8px"
  inspector-padding: "17px"
  workspace-gap: "22px"
  form-column-gap: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.button}"
    padding: "10px 14px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.button-text}"
    rounded: "{rounded.button}"
    padding: "10px 14px"
  button-text:
    textColor: "#82c5f4"
    rounded: "{rounded.button}"
    padding: "8px"
  input:
    backgroundColor: "{colors.input-surface}"
    textColor: "{colors.input-text}"
    rounded: "{rounded.field}"
    padding: "9px 10px"
  nav-active:
    backgroundColor: "{colors.nav-active}"
    textColor: "#fff"
    padding: "13px 16px"
    rounded: "{rounded.button}"
  status-pending:
    backgroundColor: "{colors.review-pending-bg}"
    textColor: "{colors.review-pending-text}"
    padding: "5px 9px"
    rounded: "{rounded.status}"
  status-reviewed:
    backgroundColor: "{colors.reviewed-bg}"
    textColor: "{colors.reviewed-text}"
    padding: "5px 9px"
    rounded: "{rounded.status}"
  inspector:
    backgroundColor: "{colors.inspector-surface}"
    padding: "17px"
    rounded: "{rounded.panel}"
---

# Design System: Climbing Club Treasury

## Overview

**Creative North Star: "The Driver Ledger"**

The approved dark navy and slate identity frames a practical treasury workspace. Blue marks actions and the selected original receipt; monetary columns and driver groups provide the visual structure. The metaphor describes the implemented direction rather than a newly approved brand name.

The app uses system sans typography and compact, bordered work surfaces. A white printable document is a separate reading context. This document records the current source in `src/renderer/src/App.tsx` and `src/renderer/src/assets/main.css`; the formal composition-led fidelity gate remains open. It does not certify pixel fidelity to the approved reference.

**Key Characteristics:**
- Navy shell with slate driver groups and blue selection.
- Aligned tabular monetary values and explicit review labels.
- Original-image inspector beside the ledger or in a dedicated narrow view.
- System UI typography, with bundled cursive restricted to generated PDF names.

## Colors

The palette uses one blue action accent against cool dark neutrals, with amber and green reserved for review state. Frontmatter values are normative.

### Primary

- **Carolina Blue** (`primary`): primary actions, selection outlines, and checkbox accent. The hover token lightens the action while keeping dark ink.

### Neutral

- **Navy Ground**: the shell and base canvas.
- **Driver Slate**: grouping rows that contain editable driver names, subtotals, and reimbursement methods.
- **Inspector Surface** and **Input Surface**: subtly separate review tools and editable fields.
- **Cool Line**: thin panel boundaries and table dividers.
- **Pale Text** and **Muted Blue Gray**: primary content and supporting explanations.
- **Print Paper** and **Print Ink**: white and dark text for the printable document.

Amber pending and green reviewed pairs are semantic status colors, not additional brand accents. Both states include visible text.

**The Explicit Review Rule.** Pair review color with “Needs review” or “Reviewed”; color alone must not carry readiness.

## Typography

**Body and UI Font:** Segoe UI, Arial, sans-serif. **Print Body:** Arial, sans-serif. **Print Name:** locally bundled Allura, cursive.

The UI is readable and utilitarian, using weight and scale rather than ornamental typography. Tables use tabular numerals; monetary columns align right. Paragraphs use a generous line height (1.65); settings introduction text is constrained to (70ch).

- **Headline:** trip and settings headings; desktop role in frontmatter, reduced to (25px) at the narrow breakpoint.
- **Title:** section headings; inspector headings use a smaller (16px) variant.
- **Body:** base interface text; receipt cells use (13px).
- **Label:** metadata and table headers; status labels use (11px).
- **Print name:** generated driver-name rendering. The font is imported from `assets/fonts/Allura-Regular.ttf` and embedded in generated document HTML for offline use. It is not a captured signature.

**The Cursive Boundary Rule.** Keep Allura in generated PDF names; keep operational UI in system sans.

## Layout

The shell has a header (70px), a left navigation column (182px), and a flexible main area with padding (25px 26px 0). The trip header groups identifying text and actions above the ledger. The workspace uses a flexible ledger plus inspector (310px), separated by (22px); at widths of at least (1600px), the inspector becomes (350px).

At or below (1250px), selecting a receipt hides the ledger and opens a dedicated inspector capped at (680px), with “Back to drivers” visible. The trip header stacks. At or below (760px), navigation becomes a horizontal row, main padding becomes (20px 14px 0), forms become one column, and ledger tools stack. The table retains its columns within an overflow container rather than compressing monetary text. The header reduces to (62px).

The original-image frame fits the receipt by default, then permits native-size scrolling when enlarged. Its height changes with breakpoints: default (300px), wide (360px), dedicated inspector (380px), and narrow (340px). PDF preview uses a white iframe; the generated document has its own print layout.

## Elevation & Depth

The implementation has no box-shadow vocabulary. Depth comes from tonal surfaces, one-pixel borders, selected-row outlines, and whitespace. Keep ledger and inspector flat. Keyboard focus uses a visible outline (2px) with offset (3px), rather than an ambient glow.

Button background transitions last (0.16s) with `ease-out`; reduced-motion preference removes transitions. No animation is needed to explain ledger state.

## Shapes

Controls use compact softened corners: fields, buttons, and work panels follow their frontmatter radii. Status badges use pill-shaped corners. Ledger overflow clips to its panel boundary. Dividers retain a thin, precise geometry; original-image frames use field-sized rounding. Outline icons share a (24 × 24) viewBox and rounded strokes, normally displayed at (20px).

## Components

### Buttons

Primary actions use blue fill and dark semibold text (650). Secondary buttons are transparent with a thin cool border. Text actions have transparent borders and lighter blue text. Standard buttons have minimum height (40px), an (8px) icon/text gap, and hover background change. Disabled controls have opacity (0.5) and a not-allowed cursor. All keyboard-operable controls receive the global focus outline.

### Inputs / Fields

Fields have dark fill, thin contrasting borders, compact rounding, and a visible label above the input with an (8px) gap. Placeholders are subdued. Driver-name inputs remain transparent within the driver group and reveal a border on hover or focus. Native selects serve reimbursement choices; the review checkbox uses the blue accent.

### Navigation

Trips, Profile, and Storage use icon-plus-label buttons. Active navigation has a blue-toned filled surface, a visible border, and white text. Navigation is vertical on desktop and evenly distributed horizontally at the narrow breakpoint. Focus remains visible in either orientation.

### Chips

Review badges are passive text labels rather than filter buttons. Pending and reviewed states use their semantic token pairs with pill rounding. The separate “Needs review” checkbox filters ledger content.

### Cards / Containers

The ledger is a clipped bordered panel; its table, toolbar, and total footer remain one continuous work surface. The inspector is a padded tonal panel with a thin boundary and no shadow. Trip setup uses a related slate fill and panel rounding; settings use a flat, width-constrained form instead of a grid of decorative cards.

### Driver Ledger and Original Inspector

Driver groups expand to reveal receipt rows. Each group carries an editable name, subtotal, status, and reimbursement method. Selected receipt rows use blue-toned fill and an inset accent outline; hover uses a darker toned highlight. Receipt filenames wrap, while numeric cells remain unbroken and right aligned.

The inspector displays the original image before amount fields and the review action. It states that automatic extraction is not configured. Editing an amount reopens review; the action is disabled until amounts are valid. Closing the inspector restores focus to the receipt control. Do not present a generated sample receipt as real source evidence.

### Printable Receipt

The PDF uses white paper, dark text, simple ruled tables, right-aligned amounts, and a cursive driver-name line. Original receipt images remain in the review workflow and are excluded from the printable record. The white preview is deliberate within the dark shell.

## Do's and Don'ts

### Do:

- **Do** preserve navy ground, slate driver groups, and blue actions and selection.
- **Do** align monetary columns right and retain tabular numerals.
- **Do** show review labels alongside semantic status colors.
- **Do** retain a visible return control in the dedicated narrow inspector.
- **Do** keep print content readable on white and bundle the generated-name font offline.

### Don't:

- **Don't** introduce decorative shadows into the flat ledger and inspector.
- **Don't** use Allura for navigation, fields, or operational headings.
- **Don't** imply automatic extraction or captured signatures in visual copy.
- **Don't** claim reference pixel fidelity or formal composition acceptance from this source documentation.
