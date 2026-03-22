export function baseHtml(content: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8"/>
  <title>${escHtml(title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;700&family=Inter:wght@400;600;700&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', 'Noto Sans Arabic', Arial, sans-serif;
      font-size: 10pt;
      color: #1a1a2e;
      line-height: 1.5;
    }

    .page { width: 100%; }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #1a3c5e;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .company-block .en { font-size: 16pt; font-weight: 700; color: #1a3c5e; }
    .company-block .ar { font-size: 13pt; font-weight: 700; color: #1a3c5e; direction: rtl; }
    .company-block .meta { font-size: 8pt; color: #666; margin-top: 4px; }
    .doc-block { text-align: right; }
    .doc-block .doc-type { font-size: 18pt; font-weight: 700; color: #1a3c5e; }
    .doc-block .doc-number { font-size: 12pt; font-weight: 600; }
    .doc-block .doc-date { font-size: 9pt; color: #666; }

    .info-strip {
      display: flex;
      gap: 20px;
      margin-bottom: 14px;
    }
    .info-box {
      flex: 1;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 8px 10px;
    }
    .info-box h4 { font-size: 8pt; text-transform: uppercase; color: #999; margin-bottom: 4px; }
    .info-box p  { font-size: 9pt; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 9pt;
    }
    thead th {
      background: #1a3c5e;
      color: white;
      padding: 6px 8px;
      text-align: left;
    }
    tbody tr:nth-child(even) { background: #f7f9fc; }
    tbody td { padding: 5px 8px; border-bottom: 1px solid #e8e8e8; }
    tfoot td {
      padding: 5px 8px;
      font-weight: 600;
      border-top: 2px solid #1a3c5e;
    }

    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 8px;
    }
    .totals-box {
      width: 260px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 10px;
      border-bottom: 1px solid #e8e8e8;
      font-size: 9pt;
    }
    .totals-row.grand {
      background: #1a3c5e;
      color: white;
      font-size: 10pt;
      font-weight: 700;
    }

    .footer {
      margin-top: 20px;
      border-top: 1px solid #e0e0e0;
      padding-top: 8px;
      font-size: 8pt;
      color: #888;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .footer .qr-placeholder {
      width: 60px;
      height: 60px;
      border: 1px solid #ccc;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 7pt;
      color: #aaa;
    }
    .notes-box {
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 8px 10px;
      font-size: 9pt;
      color: #555;
      margin-top: 10px;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 8pt;
      font-weight: 600;
    }
    .badge-paid    { background: #d4edda; color: #155724; }
    .badge-partial { background: #fff3cd; color: #856404; }
    .badge-overdue { background: #f8d7da; color: #721c24; }
  </style>
</head>
<body><div class="page">${content}</div></body>
</html>`;
}

export function escHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function sarAmount(halalas: number): string {
  return (halalas / 100).toLocaleString('en-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' SAR';
}
