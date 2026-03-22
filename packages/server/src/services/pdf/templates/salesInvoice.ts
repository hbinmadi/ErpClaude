import { db } from '../../../db';
import { salesInvoices, salesInvoiceLines, customers } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { baseHtml, escHtml, sarAmount } from './base';

export async function renderSalesInvoice(invoiceId: number): Promise<string> {
  const [inv] = await db.select().from(salesInvoices).where(eq(salesInvoices.id, invoiceId));
  if (!inv) throw Object.assign(new Error('Invoice not found'), { status: 404 });

  const [customer] = await db.select().from(customers).where(eq(customers.id, inv.customerId));
  const lines = await db.select().from(salesInvoiceLines).where(eq(salesInvoiceLines.invoiceId, invoiceId));

  const statusBadge =
    inv.status === 'paid'    ? '<span class="badge badge-paid">PAID</span>' :
    inv.status === 'partial' ? '<span class="badge badge-partial">PARTIAL</span>' :
    inv.amountDue > 0 && new Date(inv.dueDate) < new Date()
                             ? '<span class="badge badge-overdue">OVERDUE</span>' : '';

  const lineRows = lines.map((l: typeof lines[number]) => `
    <tr>
      <td>${escHtml(l.description)}</td>
      <td style="text-align:right">${Number(l.quantity)}</td>
      <td style="text-align:right">${sarAmount(l.unitPrice)}</td>
      <td style="text-align:right">${Number(l.discountPct)}%</td>
      <td style="text-align:right">${Number(l.taxRate)}%</td>
      <td style="text-align:right">${sarAmount(l.lineTotal)}</td>
    </tr>`).join('');

  const content = `
    <div class="header">
      <div class="company-block">
        <div class="en">Sara Advanced Trading Company</div>
        <div class="ar">شركة سارة للتجارة المتقدمة</div>
        <div class="meta">
          VAT: 310122393500003 &nbsp;|&nbsp; Khamis Mushait, Saudi Arabia<br/>
          Tel: +966 17 000 0000 &nbsp;|&nbsp; Email: info@sara.sa
        </div>
      </div>
      <div class="doc-block">
        <div class="doc-type">TAX INVOICE ${statusBadge}</div>
        <div class="doc-number">${escHtml(inv.invoiceNumber)}</div>
        <div class="doc-date">Date: ${inv.invoiceDate} &nbsp;|&nbsp; Due: ${inv.dueDate}</div>
      </div>
    </div>

    <div class="info-strip">
      <div class="info-box">
        <h4>Bill To</h4>
        <p><strong>${escHtml(customer?.companyName ?? '')}</strong></p>
        ${customer?.taxId ? `<p>VAT: ${escHtml(customer.taxId)}</p>` : ''}
        ${customer?.billingAddress ? `<p>${escHtml(customer.billingAddress)}</p>` : ''}
        ${customer?.email ? `<p>${escHtml(customer.email)}</p>` : ''}
      </div>
      <div class="info-box">
        <h4>Payment Info</h4>
        <p>Terms: ${customer?.paymentTermsDays ?? 30} days</p>
        <p>Currency: ${escHtml(inv.currency)}</p>
        ${inv.soId ? `<p>SO Ref: #${inv.soId}</p>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align:right">Qty</th>
          <th style="text-align:right">Unit Price</th>
          <th style="text-align:right">Disc%</th>
          <th style="text-align:right">VAT%</th>
          <th style="text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>${lineRows}</tbody>
    </table>

    <div class="totals-section">
      <div class="totals-box">
        <div class="totals-row"><span>Subtotal</span><span>${sarAmount(inv.subtotal)}</span></div>
        ${inv.discountAmount > 0 ? `<div class="totals-row"><span>Discount</span><span>-${sarAmount(inv.discountAmount)}</span></div>` : ''}
        <div class="totals-row"><span>VAT (15%)</span><span>${sarAmount(inv.taxAmount)}</span></div>
        <div class="totals-row grand"><span>TOTAL DUE</span><span>${sarAmount(inv.amountDue)}</span></div>
      </div>
    </div>

    <div class="footer">
      <div>
        <p>This is a computer-generated document. No signature required.</p>
        <p>هذه وثيقة منشأة بالحاسوب ولا تحتاج إلى توقيع.</p>
      </div>
      <div class="qr-placeholder">ZATCA<br/>QR</div>
    </div>`;

  return baseHtml(content, `Invoice ${inv.invoiceNumber}`);
}
