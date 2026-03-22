# Stage 04 — Suppliers, Purchase Orders & Branch Transfers

## Prompt Given
"branch transfers, suppliers, and purchase should also implement the address details and entry of items logic"

## What Was Done

### Backend — Schema Updates
- `packages/server/src/db/schema/suppliers.ts`
  - Added ZATCA fields: crNumber, streetName, buildingNumber, additionalNumber, district, city, postalCode, country
  - Added banking fields: bankName, bankAccount, bankIban
  - Kept legacy address field
- `packages/server/src/db/schema/branchTransfers.ts` (new)
  - Enum: transferStatusEnum ('draft'|'confirmed'|'cancelled')
  - Table: branchTransfers (id, transferNumber unique, fromBranchId, toBranchId, transferDate, status, notes, confirmedAt, confirmedBy, isDeleted, createdAt, createdBy)
  - Table: branchTransferLines (id, transferId, productId, description, quantity decimal(12,3), unitCost int halalas, lineTotal int halalas)

### Backend — Route Updates
- `packages/server/src/routes/suppliers.ts` — createSchema extended with ZATCA + banking fields
- `packages/server/src/routes/branchTransfers.ts` (new)
  - Auto-numbering: TRF00001 format via SQL MAX
  - GET / — list with branch names joined
  - GET /:id — get with lines + product code/name
  - POST / — create transfer + lines (admin, warehouse roles)
  - PUT /:id — update draft only, replaces lines
  - POST /:id/confirm — upserts branchProducts in destination with transferred unitCost; sets status=confirmed
  - POST /:id/cancel — sets status=cancelled (admin only)
- `packages/server/src/index.ts` — registered /api/branch-transfers

### Frontend — Components
- `packages/client/src/components/POGrid.tsx` (rewritten)
  - Same fluid entry improvements as InvoiceGrid
  - Uses /products/search endpoint
  - Auto-fills unitCost from purchasePrice/100 on product select
  - Exports newPOLine() function

### Frontend — Pages
- `packages/client/src/pages/purchase/SupplierFormPage.tsx` (rewritten)
  - 4 sections: Company Details, ZATCA/Tax Identification, ZATCA Structured Address, Banking & Payment
  - B2B/B2C badge same as CustomerFormPage
  - Banking: bankName, bankAccount, bankIban (hint: SA + 22 digits), paymentTermsDays
- `packages/client/src/pages/purchase/PurchaseOrderFormPage.tsx` (updated)
  - SupplierPanel: shows B2B/B2C badge, address, VAT, CR, payment terms, ZATCA gap warnings
  - handleSupplierSelect: async, fetches full supplier on selection
  - Totals: Subtotal (excl. VAT) + VAT + TOTAL DUE breakdown
  - Removed invalid width/placeholder props from Kbd components
- `packages/client/src/pages/branches/BranchTransfersPage.tsx` (new)
  - Lists transfers with from/to branch, status badges (draft/confirmed/cancelled)
  - Draft rows: Edit, Confirm, Cancel actions
  - Non-draft rows: View action
- `packages/client/src/pages/branches/BranchTransferFormPage.tsx` (new)
  - Inline TransferGrid (product lookup, description, qty, unitCost — no tax column)
  - Branch dropdowns for From/To, transfer date, notes
  - Read-only when status != draft
  - Total value display

### Frontend — Navigation
- Layout.tsx — added Branch Transfers nav item under Branches group
- App.tsx — added routes /branch-transfers, /branch-transfers/new, /branch-transfers/:id
