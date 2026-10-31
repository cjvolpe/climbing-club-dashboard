# Receipt-to-PDF shape brief

## Job and selected direction

The club treasurer collects and checks gas spending for a trip, then produces a printable reimbursement receipt while working offline. Visitor mode: Operate.

The user selected `dark-drivers-v2` in chat. Approved visual reference: `mocks/decision/dark-drivers-v2.png`. Preserve the dark navy shell, slate work surfaces, #4B9CD3 selection and action color, readable sans typography, and aligned monetary columns. This is a shape brief, not an implementation contract.

## Workflow and layout

- Trips, Profile, and Storage form the main navigation. A trip header shows event name, date range, and location, with Add receipts and Preview PDF actions.
- The main work area groups receipt rows beneath expandable driver rows. Show each driver's subtotal and reimbursement method. A selected receipt opens its original image and editable extracted total cost and price per gallon in the right review pane.
- The treasurer reviews and corrects values before export. Keep review state explicit and totals consistent across the table, inspector, and PDF. Driver total equals the sum of that driver's receipt costs. Reimbursement options are Zelle, CashApp, and Check.
- Support unlimited receipt items per driver without assuming a fixed driver count. Preserve selection and scroll position through review; use filtering and scrolling for large trips. On narrower windows, open the receipt inspector as a dedicated view with a clear return to the driver list rather than squeezing all columns into view.
- Preview the printable document before export. Dark theme applies to the application; the PDF uses a readable white print layout. Keep original images available for review and out of the PDF.

## Required information

Trip setup records event name, trip date range, location, and number of drivers. Profile manages organization name, email, address, city/state/ZIP, and Truist account number.

The PDF includes saved trip details, receipt creation date, club profile information, a receipt number based on trip start date plus sequence (for example 20261030-01), each driver's individual receipt items, driver totals, reimbursement method, and a cursive rendering of the driver's name. Generated names are text, not captured signatures.

## States and constraints

Plan for no trips, no drivers, no receipts, extraction in progress, failed extraction with manual correction, unreviewed and reviewed receipts, incomplete required fields, PDF generation and export failure/success, and unavailable assigned storage. Preserve entered work and offer a clear recovery action. Export readiness should explain what remains to be reviewed or completed.

Electron with React, TypeScript, and Tailwind remains the platform. Original receipts and extracted data stay together under the assigned drive. Use keyboard-accessible controls, visible focus, sufficient text contrast, and labels alongside status colors. Bundle any required fonts for offline use.

## Boundaries and open decisions

Existing application code and earlier design options remain intact. The approved image establishes composition and visual direction; its synthetic names, stations, figures, extra fields (such as gallons and notes), and storage/sync wording do not establish new requirements. Use the confirmed fields above when building.

Still to resolve during implementation: assigned-drive setup and recovery, supported receipt formats and offline extraction engine, numbering behavior after trip-date edits or re-export, and print paper size. Do not infer these from the mockup. No payment execution or captured-signature workflow is included.

## Direction contract

THESIS: Review each driver's original receipts beside aligned reimbursement amounts, then produce a clean printable record.

OWN-WORLD: Approved dark-drivers-v2 reference; navy ground, slate driver rows, Carolina blue actions and selections, readable system sans type, explicit amber and green review states.

STORY: Create a trip, name its drivers, import receipt images, enter and verify amounts, complete the organization profile, preview and export the PDF.

FIRST VIEWPORT: Persistent left navigation; event title and date/location above a wide driver ledger; receipt selection opens an original-image inspector at the right. Totals close the ledger. Narrow windows use a dedicated inspector with a return control.

FORM: User-pinned driver-based layout, selected in the existing shape round; seed: a84cce9a8bd1aeb9. The shape brief's confirmed fields override synthetic mockup content.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
