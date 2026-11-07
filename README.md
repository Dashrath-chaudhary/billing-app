# VoltBill — Electrical Shop Billing

A local-first React + TypeScript + Tailwind CSS billing app for electrical products and fitting/labour charges.

## Run locally

1. Install Node.js 20+.
2. Extract this folder.
3. Open a terminal inside the project folder.
4. Run:

```bash
npm install
npm run dev
```

5. Open the local URL printed by Vite (usually http://localhost:5173).

## Production build

```bash
npm run build
npm run preview
```

## Features

- Customer name, mobile, address and optional GSTIN
- Electrical product and fitting/labour line items
- Quantity, unit, rate, HSN/SAC and per-item GST rate
- Percentage or flat discount
- CGST + SGST (intra-state) or IGST (inter-state)
- Payment mode, received amount and balance due
- Live invoice preview
- Print or Save as PDF using the browser print dialog
- Business details and invoice footer customization
- Reusable product/service catalogue with purchase cost and selling price
- Local inventory quantities and configurable low-stock thresholds
- Manual stock adjustments with reason notes
- Stock movement history for invoice sales, invoice edits, invoice deletion/returns and manual adjustments
- Invoice-linked stock deduction applied only to the quantity difference when an already-saved bill is edited
- Labour/fitting items excluded from stock by default; tracking can be explicitly enabled per catalogue item
- Backup/restore includes inventory and movement history; older VoltBill backups are migrated with zero opening stock
- Saved bill history with reopen, print and delete
- Browser localStorage autosave
- JSON backup export and restore

## Data storage and backups

Data is stored in the current browser's localStorage on this computer. It is not uploaded to a server. Use **Business settings → Export backup** regularly. Inventory quantities are changed through stock adjustments and saved invoices; editing or reopening an invoice does not re-deduct unchanged quantities. To move data to another computer, export the JSON backup and import it there.

When importing an older backup created before inventory existed, catalogue items default to stock tracking for products with zero stock; historical bills are not retroactively deducted because their lines do not contain catalogue links. Enter opening quantities using **Inventory & stock → Adjust stock**. Clearing browser data, using another browser profile, or uninstalling a browser can remove local records if you have not exported a backup.

## PDF

Click **Print / PDF** in the invoice preview. In the browser print dialog, choose **Save as PDF** as the destination. For best output, use A4 paper and enable background graphics if desired.

## Important GST note

GST rates and HSN/SAC codes are editable per line item and should be confirmed for the actual goods/services being billed. This tool is an invoice preparation aid, not GST filing or e-invoicing software. If you are GST-registered, confirm the applicable invoice particulars and tax treatment with your accountant / tax professional. The app does not generate IRN or a government-valid e-invoice QR code.
