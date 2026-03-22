# Stage 02 — Multi-Branch Support

## Prompt Given
"now we need to add branches, which will have the same products and if not match we replicate in all the branches with cost"

## What Was Done

### Backend — Schema
- `packages/server/src/db/schema/branches.ts`
  - Table: `branches` (id, code, name, address, phone, isHQ, isActive)
  - Table: `branchProducts` (branchId, productId, costPrice, salesPrice, syncedAt) — unique(branchId, productId)
- `packages/server/src/db/schema/index.ts` — exported new schemas

### Backend — Routes
- `packages/server/src/routes/branches.ts`
  - GET /api/branches — list all branches
  - GET /api/branches/:id — get one
  - POST /api/branches — create (admin)
  - PUT /api/branches/:id — update (admin)
  - GET /api/branches/:id/products — all master products LEFT JOIN branchProducts (flags missing:true)
  - PUT /api/branches/:id/products/:productId — upsert branch cost/sales price
  - POST /api/branches/sync — replicate all missing products to all branches with master purchasePrice as costPrice
- `packages/server/src/index.ts` — registered /api/branches

### Frontend — Pages
- `packages/client/src/pages/branches/BranchesPage.tsx`
  - Lists branches with Refresh, Sync Products, New Branch buttons
  - Table with Edit and Products action per row
- `packages/client/src/pages/branches/BranchFormPage.tsx`
  - Create/edit: code, name, address, phone, isHQ, isActive
- `packages/client/src/pages/branches/BranchProductsPage.tsx`
  - All master products with branch-specific prices
  - Filter: All / Not Synced / Synced
  - Inline price editing
  - Sync Missing button

### Frontend — Navigation
- `packages/client/src/components/Layout.tsx` — added Branches nav group
- `packages/client/src/App.tsx` — added routes /branches, /branches/new, /branches/:id, /branches/:id/products

## Key Design Decisions
- Pricing stored as integers (halalas = SAR × 100)
- Branch product sync uses master purchasePrice as initial costPrice
- Missing products flagged with `missing: true` in branch product list
