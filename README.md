# Climbing Club Dashboard

Offline Electron application for collecting trip gas receipts and exporting reimbursement PDFs.

## Run

Use Node.js and npm, then:

```sh
npm install
npm run dev
```

## Workflow

1. Create a trip with event name, date range, location, and initial driver count.
2. Enter driver names and reimbursement methods (Zelle, CashApp, or Check).
3. Import PNG, JPG, JPEG, or WebP receipt images for each driver.
4. Manually enter each receipt's total cost and price per gallon, check the original, and mark it reviewed.
5. Complete all fields in Profile.
6. Preview the white US Letter document and export a PDF.

Automatic OCR is not implemented. The application explicitly requests manual entry; no receipt is uploaded to an external service.

## Storage and handoff

The default workspace is the application's local user-data folder. Storage lets you copy the current workspace into an empty assigned-drive folder. Keep the complete folder together: treasury.json contains trip/profile data and receipts/ contains original images. The prior folder remains as a backup. Restore assigned-drive access if saving fails, then choose Retry save. Do not run multiple app instances against the same folder.

Receipt numbers use the start date plus a sequence and remain stable on re-export. Export includes organization/account details, trip information, creation date, driver items and totals, payment methods, and generated cursive names. These names are not captured signatures.

## Checks and packaging

```sh
npm run typecheck
npm run check
npm run build
npm run build:win
```

A desktop smoke harness is available at .impeccable/review/smoke.cjs. Run it after building using Electron with ELECTRON_RUN_AS_NODE unset. It uses an isolated test workspace under .impeccable/review, never the real treasury workspace.

The renderer uses React, TypeScript, and Tailwind CSS with project CSS. Design decisions are recorded in DESIGN.md.

The PDF's bundled Allura font is sourced from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/allura); its SIL Open Font License is included beside the font.
