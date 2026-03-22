# Stage 03 — Sales Invoice Improvements + ZATCA Customer Details

## Prompt Given
"good job, now sales invoice we need to make the selection of items as fluid as possible, add customer details which is zatca compliant with all the fields necessary"

## What Was Done

### Backend — Schema Updates
- `packages/server/src/db/schema/customers.ts`
  - Added ZATCA fields: crNumber, streetName, buildingNumber, additionalNumber, district, city, postalCode, country (default 'SA')
  - Kept legacy billingAddress, shippingAddress
- `packages/server/src/db/schema/salesInvoices.ts`
  - Added: invoiceTypeEnum ('standard'|'simplified'), paymentMeansEnum ('cash'|'bank'|'credit'|'card'|'cheque')
  - Added fields: supplyDate, invoiceType, paymentMeans, notes

### Backend — Route Updates
- `packages/server/src/routes/customers.ts` — createSchema extended with all ZATCA fields
- `packages/server/src/routes/salesInvoices.ts`
  - GET /:id joins customer + lines
  - createInvoiceSchema accepts supplyDate, invoiceType, paymentMeans, notes

### Frontend — Components
- `packages/client/src/components/GridLookupCell.tsx` (updated)
  - Dropdown wider (280px), taller (260px)
  - Shows product code (bold, primary color) above product name
- `packages/client/src/components/InvoiceGrid.tsx` (rewritten)
  - Uses /products/search endpoint (fast, 15 results)
  - Tab key advances cells (same as Enter)
  - Auto-fills unitPrice from salesPrice/100 and taxRate on product select
  - + Add Row button with dashed border
  - × Remove row button per line (red, disabled when 1 row)
  - New rows flash primary-subtle background
  - focusCell retries up to 5 times (20ms) for newly added rows

### Frontend — Pages
- `packages/client/src/pages/sales/CustomerFormPage.tsx` (rewritten)
  - 4 sections: Company Details, ZATCA/Tax Identification, ZATCA Structured Address, Additional Addresses
  - Live B2B/B2C badge based on taxId (15-digit starting with "3")
- `packages/client/src/pages/sales/SalesInvoiceFormPage.tsx` (rewritten)
  - CustomerPanel: shows B2B/B2C badge, VAT, CR, structured address, ZATCA gap warnings
  - handleCustomerSelect: async, fetches full customer, auto-sets invoiceType
  - New fields: Invoice Type (ZATCA), Payment Means, Supply Date
  - Totals: Subtotal (excl. VAT), Discount, VAT 15%, TOTAL DUE

## ZATCA Compliance Rules
- B2B (Standard/Clearance): requires 15-digit VAT starting with "3", structured address, CR number
- B2C (Simplified/Reporting): no buyer ID required
- Building number, street, district, city, postal code all required for full compliance
