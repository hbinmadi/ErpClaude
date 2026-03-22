import { randomUUID } from 'crypto';
import { escHtml } from '../pdf/templates/base';

export interface InvoiceData {
  invoiceNumber: string;
  uuid: string;
  issueDate: string;       // YYYY-MM-DD
  issueTime: string;       // HH:MM:SS
  invoiceType: 'standard' | 'simplified';
  invoiceCounterValue: number;
  previousInvoiceHash: string;
  seller: {
    name: string;
    nameAr: string;
    vatNumber: string;
    address: string;
    city: string;
    country: string;
  };
  buyer?: {
    name: string;
    vatNumber?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  lines: Array<{
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;     // halalas
    discountAmount: number;
    taxRate: number;       // 15
    lineExtensionAmount: number;  // halalas, net before tax
  }>;
  subtotal: number;        // halalas
  discountAmount: number;  // halalas
  taxAmount: number;       // halalas
  totalAmount: number;     // halalas
}

function sar(halalas: number): string {
  return (halalas / 100).toFixed(2);
}

export function buildInvoiceXml(data: InvoiceData): string {
  const typeCode = data.invoiceType === 'standard' ? '388' : '381';
  const subtypeCode = data.invoiceType === 'standard' ? '0100000' : '0200000';

  const buyerBlock = data.buyer ? `
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${escHtml(data.buyer.name)}</cbc:Name></cac:PartyName>
      ${data.buyer.vatNumber ? `
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escHtml(data.buyer.vatNumber)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>` : ''}
      <cac:PostalAddress>
        <cbc:CityName>${escHtml(data.buyer.city ?? '')}</cbc:CityName>
        <cac:Country><cbc:IdentificationCode>${escHtml(data.buyer.country ?? 'SA')}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingCustomerParty>` : `
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>General Public</cbc:Name></cac:PartyName>
    </cac:Party>
  </cac:AccountingCustomerParty>`;

  const lineItems = data.lines.map(l => `
    <cac:InvoiceLine>
      <cbc:ID>${l.id}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="PCE">${l.quantity}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="SAR">${sar(l.lineExtensionAmount)}</cbc:LineExtensionAmount>
      ${l.discountAmount > 0 ? `
      <cac:AllowanceCharge>
        <cbc:ChargeIndicator>false</cbc:ChargeIndicator>
        <cbc:Amount currencyID="SAR">${sar(l.discountAmount)}</cbc:Amount>
      </cac:AllowanceCharge>` : ''}
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="SAR">${sar(Math.round(l.lineExtensionAmount * l.taxRate / 100))}</cbc:TaxAmount>
        <cac:TaxSubtotal>
          <cbc:TaxableAmount currencyID="SAR">${sar(l.lineExtensionAmount)}</cbc:TaxableAmount>
          <cbc:TaxAmount currencyID="SAR">${sar(Math.round(l.lineExtensionAmount * l.taxRate / 100))}</cbc:TaxAmount>
          <cac:TaxCategory>
            <cbc:ID>S</cbc:ID>
            <cbc:Percent>${l.taxRate}</cbc:Percent>
            <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
          </cac:TaxCategory>
        </cac:TaxSubtotal>
      </cac:TaxTotal>
      <cac:Item>
        <cbc:Name>${escHtml(l.description)}</cbc:Name>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="SAR">${sar(l.unitPrice)}</cbc:PriceAmount>
      </cac:Price>
    </cac:InvoiceLine>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionURI>urn:oasis:names:specification:ubl:dsig:enveloped:xades</ext:ExtensionURI>
      <ext:ExtensionContent>
        <sig:UBLDocumentSignatures xmlns:sig="urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2">
          <!-- ZATCA signing content injected here during signing step -->
        </sig:UBLDocumentSignatures>
        <!-- PIH: previous invoice hash -->
        <pih:PIH xmlns:pih="urn:zatca:pih">${data.previousInvoiceHash}</pih:PIH>
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>urn:zatca:${data.invoiceType}:1.0</cbc:CustomizationID>
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${escHtml(data.invoiceNumber)}</cbc:ID>
  <cbc:UUID>${data.uuid}</cbc:UUID>
  <cbc:IssueDate>${data.issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${data.issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="${subtypeCode}">${typeCode}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>
  <cac:AdditionalDocumentReference>
    <cbc:ID>ICV</cbc:ID>
    <cbc:UUID>${data.invoiceCounterValue}</cbc:UUID>
  </cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference>
    <cbc:ID>PIH</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${data.previousInvoiceHash}</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="CRN">${escHtml(data.seller.vatNumber)}</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${escHtml(data.seller.name)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escHtml(data.seller.address)}</cbc:StreetName>
        <cbc:CityName>${escHtml(data.seller.city)}</cbc:CityName>
        <cac:Country><cbc:IdentificationCode>${escHtml(data.seller.country)}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escHtml(data.seller.vatNumber)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  ${buyerBlock}
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="SAR">${sar(data.taxAmount)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="SAR">${sar(data.subtotal)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="SAR">${sar(data.taxAmount)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>15</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="SAR">${sar(data.subtotal + data.discountAmount)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="SAR">${sar(data.subtotal)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="SAR">${sar(data.totalAmount)}</cbc:TaxInclusiveAmount>
    ${data.discountAmount > 0 ? `<cbc:AllowanceTotalAmount currencyID="SAR">${sar(data.discountAmount)}</cbc:AllowanceTotalAmount>` : ''}
    <cbc:PayableAmount currencyID="SAR">${sar(data.totalAmount)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${lineItems}
</Invoice>`;
}
