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
- The repository currently contains the Electron starter interface; the requested treasury workflow is product scope, not implemented functionality.

### Open Decisions

- The assigned drive's location, availability offline, folder structure, and setup process.
- The receipt extraction method and supported receipt formats, including how extraction runs offline.
- How the treasurer reviews and corrects extracted values.
- Required trip fields, non-fuel expense handling, calculations, and PDF content.
- Whether “event” and “trip” describe the same record or distinct records.
- The club's official name, assets, and any specific accessibility requirements.

## Evidence on Hand

- `src/renderer/src/App.tsx`: starter interface; no implemented treasury workflows or real trip data.
- `src/main/index.ts` and `src/preload/`: existing Electron application structure.
- No real receipt samples, extraction benchmarks, or PDF examples have been supplied in this conversation. Future work must not invent these as product evidence.

## Product Principles

- Keep the receipt-to-PDF workflow usable offline.
- Keep original receipts and extracted data together under the assigned drive.
- Make routine treasury tasks and officer handoffs straightforward.
- Favor solutions that require little ongoing maintenance.
