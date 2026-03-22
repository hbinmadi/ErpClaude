import crypto from 'crypto';
import { randomUUID } from 'crypto';
import { db } from '../../db';
import { zatcaInvoices, salesInvoices, salesInvoiceLines, customers, companySettings, sequences } from '../../db/schema';
import { eq, sql } from 'drizzle-orm';
import { buildInvoiceXml, InvoiceData } from './ZatcaXml';
import { buildZatcaQR } from './ZatcaQR';

const ZATCA_SANDBOX_URL = 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal';
const ZATCA_PROD_URL    = 'https://gw-fatoora.zatca.gov.sa/e-invoicing/core';

function getZatcaBaseUrl(): string {
  return process.env.ZATCA_ENV === 'sandbox' ? ZATCA_SANDBOX_URL : ZATCA_PROD_URL;
}

function hashXml(xml: string): string {
  return crypto.createHash('sha256').update(xml, 'utf8').digest('base64');
}

async function getCompanySetting(key: string): Promise<string> {
  const [row] = await db.select().from(companySettings).where(eq(companySettings.key, key));
  if (!row) throw new Error(`Company setting not found: ${key}`);
  const raw = typeof row.value === 'string' ? row.value : JSON.stringify(row.value);
  return JSON.parse(raw) as string;
}

/**
 * Prepare a ZATCA invoice for a posted sales invoice.
 * MUST be called inside a transaction — acquires SELECT FOR UPDATE on sequences.
 */
export async function prepareInvoice(salesInvoiceId: number, tx: typeof db): Promise<void> {
  const [inv] = await tx.select().from(salesInvoices).where(eq(salesInvoices.id, salesInvoiceId));
  if (!inv) throw new Error(`Sales invoice ${salesInvoiceId} not found`);

  const [customer] = inv.customerId
    ? await tx.select().from(customers).where(eq(customers.id, inv.customerId))
    : [null];

  const lines = await tx.select().from(salesInvoiceLines)
    .where(eq(salesInvoiceLines.invoiceId, salesInvoiceId));

  // Determine invoice type: B2B if customer has VAT, else simplified
  const invoiceType: 'standard' | 'simplified' = customer?.taxId ? 'standard' : 'simplified';

  // ── PIH CHAIN — SELECT FOR UPDATE ──────────────────────────────────────
  const seqResult = await tx.execute(sql`
    SELECT id, next_value
    FROM sequences
    WHERE module = 'zatca_invoice_counter'
    FOR UPDATE
  `);

  if (seqResult.rows.length === 0) {
    throw new Error('ZATCA invoice counter sequence not found — re-run Core seed');
  }

  const seqRow = seqResult.rows[0] as { id: number; next_value: number };
  const counterValue = seqRow.next_value;

  // Get previous hash
  const previousHash = await getCompanySetting('zatca_previous_hash');

  // Company info
  const sellerNameEn = await getCompanySetting('company_name_en');
  const sellerNameAr = await getCompanySetting('company_name_ar');
  const vatNumber    = await getCompanySetting('company_vat_number');
  const cityEn       = await getCompanySetting('city_en');

  const issueDate = inv.invoiceDate;
  const issueTime = new Date().toTimeString().slice(0, 8);
  const uuid      = randomUUID();

  // Build XML
  const invoiceData: InvoiceData = {
    invoiceNumber: inv.invoiceNumber,
    uuid,
    issueDate,
    issueTime,
    invoiceType,
    invoiceCounterValue: counterValue,
    previousInvoiceHash: previousHash,
    seller: {
      name: sellerNameEn,
      nameAr: sellerNameAr,
      vatNumber,
      address: '',
      city: cityEn,
      country: 'SA',
    },
    buyer: customer?.taxId ? {
      name: customer.companyName,
      vatNumber: customer.taxId,
      city: '',
      country: 'SA',
    } : undefined,
    lines: lines.map(l => ({
      id: l.id,
      description: l.description,
      quantity: Number(l.quantity),
      unitPrice: l.unitPrice,
      discountAmount: Math.round(l.unitPrice * Number(l.quantity) * Number(l.discountPct) / 100),
      taxRate: Number(l.taxRate),
      lineExtensionAmount: l.lineTotal,
    })),
    subtotal: inv.subtotal,
    discountAmount: inv.discountAmount,
    taxAmount: inv.taxAmount,
    totalAmount: inv.totalAmount,
  };

  const xmlContent  = buildInvoiceXml(invoiceData);
  const invoiceHash = hashXml(xmlContent);

  // QR code (TLV)
  const qrCodeBase64 = buildZatcaQR({
    sellerName: sellerNameEn,
    vatNumber,
    invoiceDate: `${issueDate}T${issueTime}`,
    totalWithTax: inv.totalAmount,
    totalTax: inv.taxAmount,
  });

  // Persist ZATCA invoice record
  await tx.insert(zatcaInvoices).values({
    salesInvoiceId,
    invoiceType,
    invoiceCounterValue: counterValue,
    previousInvoiceHash: previousHash,
    invoiceHash,
    xmlContent,
    qrCodeBase64,
    status: 'pending',
    nextRetryAt: new Date(),
  });

  // ── COMMIT: Advance counter + update previous hash ─────────────────────
  await tx.execute(sql`
    UPDATE sequences SET next_value = next_value + 1 WHERE id = ${seqRow.id}
  `);

  await tx.execute(sql`
    UPDATE company_settings
    SET value = ${JSON.stringify(invoiceHash)}, updated_at = NOW()
    WHERE key = 'zatca_previous_hash'
  `);
}

/**
 * Submit a single ZATCA invoice to ZATCA clearance/reporting API.
 */
export async function submitInvoice(zatcaInvoiceId: number): Promise<void> {
  const [zi] = await db.select().from(zatcaInvoices).where(eq(zatcaInvoices.id, zatcaInvoiceId));
  if (!zi) throw new Error('ZATCA invoice not found');
  if (zi.status === 'cleared' || zi.status === 'reported') return;

  const maxRetries = Number(process.env.ZATCA_MAX_RETRY_ATTEMPTS ?? 10);
  if (zi.retryCount >= maxRetries) {
    await db.update(zatcaInvoices)
      .set({ status: 'error', updatedAt: new Date() })
      .where(eq(zatcaInvoices.id, zatcaInvoiceId));
    return;
  }

  const endpoint = zi.invoiceType === 'standard' ? '/invoices/clearance/single' : '/invoices/reporting/single';
  const url = `${getZatcaBaseUrl()}${endpoint}`;

  const xmlBase64 = Buffer.from(zi.xmlContent, 'utf8').toString('base64');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Version': 'V2',
        'Accept-Language': 'en',
      },
      body: JSON.stringify({
        invoiceHash: zi.invoiceHash,
        uuid: zi.zatcaUUID ?? randomUUID(),
        invoice: xmlBase64,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    const responseText = await response.text();
    const cleared = response.status === 200 || response.status === 202;

    await db.update(zatcaInvoices)
      .set({
        status: cleared ? (zi.invoiceType === 'standard' ? 'cleared' : 'reported') : 'rejected',
        clearanceStatus: String(response.status),
        responsePayload: responseText.slice(0, 4000),
        retryCount: zi.retryCount + 1,
        lastAttemptAt: new Date(),
        nextRetryAt: cleared ? null : new Date(Date.now() + Number(process.env.ZATCA_RETRY_INTERVAL_MS ?? 300000)),
        clearedAt: cleared ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(zatcaInvoices.id, zatcaInvoiceId));

  } catch (err: any) {
    const nextRetry = new Date(Date.now() + Number(process.env.ZATCA_RETRY_INTERVAL_MS ?? 300000));

    await db.update(zatcaInvoices)
      .set({
        status: 'error',
        responsePayload: err.message?.slice(0, 500),
        retryCount: zi.retryCount + 1,
        lastAttemptAt: new Date(),
        nextRetryAt: nextRetry,
        updatedAt: new Date(),
      })
      .where(eq(zatcaInvoices.id, zatcaInvoiceId));
  }
}
