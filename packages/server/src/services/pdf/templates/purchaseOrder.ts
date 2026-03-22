import { db } from '../../../db';
import { purchaseOrders, purchaseOrderLines, suppliers } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { baseHtml, escHtml, sarAmount } from './base';

export async function renderPurchaseOrder(poId: number): Promise<string> {
  const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId));
  if (!po) throw Object.assign(new Error('PO not found'), { status: 404 });

  const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, po.supplierId));
  const lines = await db.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.poId, poId));

  const lineRows = lines.map((l: typeof lines[number]) => `
    <tr>
      <td>${escHtml(l.description ?? '')}</td>
      <td style="text-align:right">${Number(l.quantity)}</td>
      <td style="text-align:right">${sarAmount(l.unitCost)}</td>
      <td style="text-align:right">${Number(l.taxRate)}%</td>
      <td style="text-align:right">${sarAmount(l.lineTotal)}</td>
    </tr>`).join('');

  const content = `
    <div class="header">
      <div class="company-block">
        <div class="en">Sara Advanced Trading Company</div>
        <div class="ar">شركة سارة للتجارة المتقدمة</div>
        <div class="meta">VAT: 310122393500003 &nbsp;|&nbsp; Khamis Mushait, Saudi Arabia</div>
      </div>
      <div class="doc-block">
        <div class="doc-type">PURCHASE ORDER</div>
        <div class="doc-number">${escHtml(po.poNumber)}</div>
        <div class="doc-date">Date: ${po.orderDate}${po.expectedDate ? ` &nbsp;|&nbsp; Expected: ${po.expectedDate}` : ''}</div>
      </div>
    </div>

    <div class="info-strip">
      <div class="info-box">
        <h4>Supplier</h4>
        <p><strong>${escHtml(supplier?.companyName ?? '')}</strong></p>
        ${supplier?.taxId ? `<p>VAT: ${escHtml(supplier.taxId)}</p>` : ''}
        ${supplier?.email ? `<p>${escHtml(supplier.email)}</p>` : ''}
        ${supplier?.phone ? `<p>${escHtml(supplier.phone)}</p>` : ''}
      </div>
      <div class="info-box">
        <h4>Delivery Info</h4>
        <p>Payment Terms: ${supplier?.paymentTermsDays ?? 30} days</p>
        <p>Currency: ${escHtml(po.currency)}</p>
        <p>Status: ${escHtml(po.status.toUpperCase())}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align:right">Qty</th>
          <th style="text-align:right">Unit Cost</th>
          <th style="text-align:right">VAT%</th>
          <th style="text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>${lineRows}</tbody>
    </table>

    <div class="totals-section">
      <div class="totals-box">
        <div class="totals-row"><span>Subtotal</span><span>${sarAmount(po.subtotal)}</span></div>
        <div class="totals-row"><span>VAT</span><span>${sarAmount(po.taxAmount)}</span></div>
        <div class="totals-row grand"><span>TOTAL</span><span>${sarAmount(po.totalAmount)}</span></div>
      </div>
    </div>

    ${po.notes ? `<div class="notes-box"><strong>Notes:</strong> ${escHtml(po.notes)}</div>` : ''}

    <div class="footer">
      <div>
        <p>Authorized by: _________________________</p>
        <p style="margin-top:4px">Signature / Date</p>
      </div>
    </div>`;

  return baseHtml(content, `PO ${po.poNumber}`);
}
