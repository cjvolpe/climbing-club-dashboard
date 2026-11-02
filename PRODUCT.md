# Climbing Club Dashboard

<!-- impeccable:product-schema 1 -->

## Platform

web

The existing app uses an Electron desktop shell with a React and TypeScript renderer, styled with Tailwind CSS. It does not use a native iOS or Android design language.

## Users

The club treasurer manages gas and trip spending. The officer board changes frequently, so the app must remain easy to maintain and hand over to incoming officers.

## Product Purpose

Collect receipts and spending data for a trip, then produce a printable PDF trip receipt once the data is complete.

## Operating Context

The treasurer uploads receipts for an event, collects the extracted spending data, and prints a PDF receipt for the completed trip. Receipts and their extracted data are stored under an assigned drive. The app must be usable offline.

## Capabilities and Constraints

- Upload receipts and associate them with an event or trip.
- Extract the amount spent and price per gallon from receipts.
- Store original receipts and extracted data on an assigned drive.
- Generate a printable PDF trip receipt after collection is complete.
- Support offline operation and require little ongoing maintenance.
- The Electron application implements offline English receipt OCR alongside manual review and the receipt-to-PDF workflow.

### Open Decisions

- The assigned drive's location, availability offline, folder structure, and setup process.
- Required trip fields, non-fuel expense handling, calculations, and PDF content.
- Whether “event” and “trip” describe the same record or distinct records.
- The club's official name, assets, and any specific accessibility requirements.

## Evidence on Hand

- `src/renderer/src/App.tsx`: implemented trip, driver, manual receipt review, profile, storage, and PDF workflows; no real club records are seeded.
- `src/main/index.ts` and `src/preload/`: existing Electron application structure.
- `src/main/receipt-ocr.ts`, `receipt-parser.ts`, and `receipt-diagnostics.ts`: offline English Tesseract OCR, coordinate-aware amount parsing, and saved diagnostics; the renderer's OCR inspector exposes the evidence for review.
- No real receipt samples, extraction benchmarks, or PDF examples have been supplied in this conversation. Future work must not invent these as product evidence.

## Product Principles

- Keep the receipt-to-PDF workflow usable offline.
- Keep original receipts and extracted data together under the assigned drive.
- Make routine treasury tasks and officer handoffs straightforward.
- Favor solutions that require little ongoing maintenance.

## Implementation status

The Electron application now implements trip creation, editable driver names and reimbursement methods, original-image import (PNG/JPEG/WebP), manually entered receipt amounts, explicit review state, driver and trip totals, profile details, workspace-folder selection/copy, autosave, PDF preview, and US Letter PDF export. Original images can be enlarged and scrolled during review. Narrow windows use a dedicated inspector with a visible return control.

PNG/JPEG/WebP imports run English Tesseract OCR locally with bundled language data and no external transmission. Coordinate-aware parsing conservatively suggests total cost and price per gallon from supported labels; low-confidence, missing, or ambiguous values require manual entry. All amounts still require confirmation against the original.

The expandable OCR inspector shows original, cropped OCR input, grayscale, and binary images, confidence-colored word boxes with a text confidence list, raw recognized text, selected and rejected amount candidates with reasons, progress, and errors. The exact cropped input is saved when a crop is found and selected by default, with crop dimensions and offset shown; prepared crops remain available if recognition fails. A visible alert identifies scans without crop metadata, and older scans with crop bounds but no saved cropped image prompt a rerun. Existing receipts can run OCR from the inspector. Rerunning preserves entered values until a suggestion is explicitly applied to an individual field, which reopens review. Diagnostics are saved as `.ocr.json` sidecars beside original images and removed when those originals are deleted.

The initial workspace lives under Electron userData. Assigned-folder selection copies the workspace into an empty external folder and leaves the prior copy intact. Receipt numbers use start date plus sequence and remain stable on repeat exports. Export includes generated cursive names using bundled Allura, not captured signatures. Trip dates are set at creation; date editing and automatic migration of other workspace folders are not implemented.
