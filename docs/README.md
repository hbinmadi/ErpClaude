# Sara Advanced Trading Company — ERP Development Log

## Stages

| Stage | Topic | Prompt Summary |
|-------|-------|---------------|
| [01](STAGE_01_project_setup.md) | Project Setup & Server Start | "start server" |
| [02](STAGE_02_branches.md) | Multi-Branch Support | "add branches, same products, replicate with cost" |
| [03](STAGE_03_sales_invoice_zatca.md) | Sales Invoice + ZATCA Customer Fields | "fluid item selection, zatca compliant customer fields" |
| [04](STAGE_04_suppliers_purchase_branch_transfers.md) | Suppliers, Purchase, Branch Transfers | "branch transfers, suppliers, purchase — address + items logic" |
| [05](STAGE_05_keyboard_friendly_forms.md) | Keyboard-Friendly Forms (EscapeMenu) | "make all forms keyboard friendly, escape gives a menu" |
| [06](STAGE_06_git_backup.md) | Git & Database Backup | "add to github, backup data" |

## Quick Start
Double-click `start.bat` in the project root.

## Repository
https://github.com/hbinmadi/ErpClaude

## Tech Stack
- **Backend**: Node.js + Express + TypeScript + Drizzle ORM + PostgreSQL 18
- **Frontend**: React 18 + TypeScript + Vite + React Query
- **Auth**: JWT (access + refresh)
- **E-Invoicing**: ZATCA Phase 2 (Saudi Arabia)
- **PDF**: Custom service (invoices, POs, payslips, delivery notes)
