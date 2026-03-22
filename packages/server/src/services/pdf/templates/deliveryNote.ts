import { db } from '../../../db';
import { deliveries, deliveryLines, customers, salesOrders } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { baseHtml, escHtml } from './base';

export async function renderDeliveryNote(deliveryId: number): Promise<string> {
  const [del] = await db.select().from(deliveries).where(eq(deliveries.id, deliveryId));
  if (!del) throw Object.assign(new Error('Delivery not found'), { status: 404 });

  const [customer] = await db.select().from(customers).where(eq(customers.id, del.customerId));
  const [so] = await db.select().from(salesOrders).where(eq(salesOrders.id, del.soId));
  const lines = await db.select().from(deliveryLines).where(eq(deliveryLines.deliveryId, deliveryId));

  const lineRows = lines.map((l: typeof lines[number]) => `
    <tr>
      <td>${l.productId}</td>
      <td style="text-align:right">${Number(l.quantityShipped)}</td>
      <td>✓</td>
    </tr>`).join('');

  const content = `
    <div class="header">
      <div class="company-block">
        <div class="en">Sara Advanced Trading Company</div>
        <div class="ar">شركة سارة للتجارة المتقدمة</div>
        <div class="meta">Khamis Mushait, Saudi Arabia</div>
      </div>
      <div class="doc-block">
        <div class="doc-type">DELIVERY NOTE</div>
        <div class="doc-number">${escHtml(del.deliveryNumber)}</div>
        <div class="doc-date">Date: ${del.deliveryDate}</div>
      </div>
    </div>

    <div class="info-strip">
      <div class="info-box">
        <h4>Deliver To</h4>
        <p><strong>${escHtml(customer?.companyName ?? '')}</strong></p>
        ${customer?.shippingAddress ? `<p>${escHtml(customer.shippingAddress)}</p>` : ''}
        ${customer?.phone ? `<p>${escHtml(customer.phone)}</p>` : ''}
      </div>
      <div class="info-box">
        <h4>Reference</h4>
        <p>SO: ${so?.soNumber ?? del.soId}</p>
        <p>Delivery: ${del.deliveryNumber}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th style="text-align:right">Qty Shipped</th>
          <th>Received</th>
        </tr>
      </thead>
      <tbody>${lineRows}</tbody>
    </table>

    ${del.notes ? `<div class="notes-box"><strong>Notes:</strong> ${escHtml(del.notes)}</div>` : ''}

    <div class="footer">
      <div>
        <p>Received by: _________________________</p>
        <p style="margin-top:4px">Name / Signature / Date</p>
      </div>
      <div>
        <p>Delivered by: _________________________</p>
        <p style="margin-top:4px">Name / Signature</p>
      </div>
    </div>`;

  return baseHtml(content, `Delivery ${del.deliveryNumber}`);
}
