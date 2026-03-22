# Stage 05 — Keyboard-Friendly Forms (Consistent UX)

## Prompt Given
"check all forms and make them keyboard friendly and keep the logic same in all the forms, like i press escape and i get the menu what to next"

## What Was Done

### New Component
- `packages/client/src/components/kbd/EscapeMenu.tsx`
  - Centered modal overlay with blurred backdrop
  - Three options with letter shortcuts:
    - S → Save & Leave (saves then navigates back to list)
    - D → Discard & Leave (navigates without saving)
    - Esc → Stay Here (closes menu, continues editing)
  - Focus auto-lands on Discard when opened
  - S/D/Esc captured with event capture so they don't bleed into inputs
  - `saving` prop disables Save & Leave while mutation is pending

### All 9 Form Pages Updated

| Form Page | Back Route | Secondary Action |
|-----------|-----------|-----------------|
| JournalEntryFormPage | /journal | — (also fixed alertMsg bug) |
| BranchFormPage | /branches | — (added F2 + KbdStatusBar, was missing) |
| BranchTransferFormPage | /branch-transfers | — (added KbdStatusBar) |
| EmployeeFormPage | /employees | — |
| ProductFormPage | /inventory/products | — |
| PurchaseOrderFormPage | /purchase-orders | F8 Submit PO |
| SupplierFormPage | /suppliers | — |
| CustomerFormPage | /customers | — |
| SalesInvoiceFormPage | /sales-invoices | F8 Post |

### Pattern Applied to Every Form
```tsx
// 1. Import
import EscapeMenu from '../../components/kbd/EscapeMenu';

// 2. State + ref
const [escapeOpen, setEscapeOpen] = useState(false);
const leaveAfterSave = useRef(false);

// 3. Escape key → open menu (not immediate navigate)
if (e.key === 'Escape') { e.preventDefault(); setEscapeOpen(true); }

// 4. onSuccess: check leaveAfterSave
if (leaveAfterSave.current) {
  leaveAfterSave.current = false;
  navigate('/list-route');
  return;
}

// 5. EscapeMenu in JSX
<EscapeMenu
  isOpen={escapeOpen}
  onSave={() => { leaveAfterSave.current = true; setEscapeOpen(false); handleSave(); }}
  onDiscard={() => navigate('/list-route')}
  onStay={() => setEscapeOpen(false)}
  saving={saveMutation.isPending}
/>
```

### KbdStatusBar
- All forms now show `Esc → Leave` (was `Esc → Back`) to signal new behavior

### Global Keyboard Shortcuts (all forms)
| Key | Action |
|-----|--------|
| F2 | Save |
| F8 | Submit / Post (where applicable) |
| Esc | Open Leave menu |
| Tab / Enter | Advance to next field |
| Shift+Tab | Previous field (via useFormNav) |
