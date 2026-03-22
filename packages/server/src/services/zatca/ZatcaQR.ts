// TLV encoder for ZATCA QR per specification v2.0
// Tag bytes: 01=seller, 02=vat, 03=timestamp, 04=total, 05=tax

export function buildZatcaQR(params: {
  sellerName: string;
  vatNumber: string;
  invoiceDate: string;    // ISO datetime
  totalWithTax: number;   // halalas
  totalTax: number;       // halalas
}): string {
  const encoder = new TextEncoder();

  function tlvEntry(tag: number, value: string): Uint8Array {
    const valueBytes = encoder.encode(value);
    const tlv = new Uint8Array(2 + valueBytes.length);
    tlv[0] = tag;
    tlv[1] = valueBytes.length;
    tlv.set(valueBytes, 2);
    return tlv;
  }

  const totalStr = (params.totalWithTax / 100).toFixed(2);
  const taxStr   = (params.totalTax      / 100).toFixed(2);

  const entries = [
    tlvEntry(1, params.sellerName),
    tlvEntry(2, params.vatNumber),
    tlvEntry(3, params.invoiceDate),
    tlvEntry(4, totalStr),
    tlvEntry(5, taxStr),
  ];

  const totalLen = entries.reduce((s, e) => s + e.length, 0);
  const combined = new Uint8Array(totalLen);
  let offset = 0;
  for (const e of entries) {
    combined.set(e, offset);
    offset += e.length;
  }

  return Buffer.from(combined).toString('base64');
}
