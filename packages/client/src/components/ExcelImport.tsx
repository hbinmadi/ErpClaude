import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../lib/api';
import { Upload, X, FileSpreadsheet, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';

// ── Product field definitions ────────────────────────────────────────────────
const PRODUCT_FIELDS = [
  { key: 'code', label: 'Code *', required: true },
  { key: 'name', label: 'Name *', required: true },
  { key: 'description', label: 'Description', required: false },
  { key: 'productType', label: 'Product Type', required: false },
  { key: 'salesPrice', label: 'Sales Price (SAR)', required: false },
  { key: 'purchasePrice', label: 'Purchase Price (SAR)', required: false },
  { key: 'taxRate', label: 'Tax Rate %', required: false },
  { key: 'reorderPoint', label: 'Reorder Point', required: false },
  { key: 'reorderQty', label: 'Reorder Qty', required: false },
  { key: 'isActive', label: 'Active (true/false)', required: false },
] as const;

type ProductField = typeof PRODUCT_FIELDS[number]['key'];

// Try to auto-map a sheet column header to a product field
function autoMap(header: string): ProductField | '' {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (h === 'code' || h === 'sku' || h === 'productcode') return 'code';
  if (h === 'name' || h === 'productname' || h === 'title') return 'name';
  if (h.includes('desc')) return 'description';
  if (h.includes('type')) return 'productType';
  if (h.includes('sale') || h === 'price' || h === 'sellingprice') return 'salesPrice';
  if (h.includes('purchase') || h.includes('cost')) return 'purchasePrice';
  if (h.includes('tax') || h.includes('vat')) return 'taxRate';
  if (h.includes('reorderpoint') || h === 'minstock') return 'reorderPoint';
  if (h.includes('reorderqty') || h === 'orderqty') return 'reorderQty';
  if (h === 'active' || h === 'isactive' || h === 'status') return 'isActive';
  return '';
}

const BATCH_SIZE = 500;

interface ExcelImportProps {
  onClose: () => void;
  onComplete: () => void;
}

type ImportStatus = 'idle' | 'parsed' | 'importing' | 'done' | 'error';

export default function ExcelImport({ onClose, onComplete }: ExcelImportProps) {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, ProductField | ''>>({});
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [allRows, setAllRows] = useState<Record<string, unknown>[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState({ imported: 0, updated: 0, errors: [] as { row: number; message: string }[] });
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      const wb = XLSX.read(data, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
      if (json.length === 0) { setStatus('error'); return; }
      const headers = Object.keys(json[0]);
      const autoMapping: Record<string, ProductField | ''> = {};
      headers.forEach(h => { autoMapping[h] = autoMap(h); });
      setSheetHeaders(headers);
      setMapping(autoMapping);
      setPreviewRows(json.slice(0, 5));
      setAllRows(json);
      setStatus('parsed');
    };
    reader.readAsBinaryString(file);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleImport = async () => {
    // Build rows using mapping
    const mappedRows = allRows.map(row => {
      const out: Record<string, unknown> = {};
      sheetHeaders.forEach(header => {
        const field = mapping[header];
        if (field) out[field] = row[header];
      });
      return out;
    });

    setStatus('importing');
    setProgress({ done: 0, total: mappedRows.length });
    let totalImported = 0, totalUpdated = 0;
    const allErrors: { row: number; message: string }[] = [];

    for (let i = 0; i < mappedRows.length; i += BATCH_SIZE) {
      const batch = mappedRows.slice(i, i + BATCH_SIZE);
      const batchWithOffset = batch.map((r, idx) => ({ ...r, _rowIdx: i + idx + 1 }));
      try {
        const resp = await api.post('/products/import-batch', { rows: batchWithOffset });
        totalImported += resp.data.data.imported;
        totalUpdated += resp.data.data.updated;
        allErrors.push(...resp.data.data.errors);
      } catch (err: any) {
        allErrors.push({ row: i + 1, message: err?.response?.data?.message ?? 'Batch failed' });
      }
      setProgress({ done: Math.min(i + BATCH_SIZE, mappedRows.length), total: mappedRows.length });
    }

    setResults({ imported: totalImported, updated: totalUpdated, errors: allErrors });
    setStatus('done');
    onComplete();
  };

  const canImport = status === 'parsed' &&
    sheetHeaders.some(h => mapping[h] === 'code') &&
    sheetHeaders.some(h => mapping[h] === 'name');

  // ── styles ────────────────────────────────────────────────────────────────
  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
  const modal: React.CSSProperties = {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)',
    width: '90vw', maxWidth: 820, maxHeight: '90vh',
    display: 'flex', flexDirection: 'column', fontFamily: 'var(--font)',
  };
  const btnPrimary: React.CSSProperties = {
    padding: '8px 20px', background: 'var(--primary)', color: 'var(--primary-fg)',
    border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'var(--font)',
  };
  const btnSecondary: React.CSSProperties = {
    padding: '8px 16px', background: 'var(--bg-elevated)', color: 'var(--text)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13,
    cursor: 'pointer', fontFamily: 'var(--font)',
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Code', 'Name', 'Description', 'Product Type', 'Sales Price (SAR)', 'Purchase Price (SAR)', 'Tax Rate %', 'Reorder Point', 'Reorder Qty', 'Active'],
      ['P001', 'Sample Product', 'A sample product', 'inventory', '100.00', '70.00', '15', '10', '50', 'true'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'products_import_template.xlsx');
  };

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modal}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Import Products from Excel</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              {allRows.length > 0 ? `${allRows.length.toLocaleString()} rows detected in ${fileName}` : 'Upload an .xlsx or .xls file — no row limit'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={downloadTemplate} style={btnSecondary}>
              Download Template
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* Drop zone */}
          {(status === 'idle' || status === 'error') && (
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                background: dragOver ? 'var(--primary-subtle)' : 'var(--bg-elevated)',
                padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <FileSpreadsheet size={40} style={{ color: 'var(--text-faint)', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>
                Drop your Excel file here
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                or click to browse — .xlsx, .xls supported — no row limit
              </p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} style={{ display: 'none' }} />
            </div>
          )}

          {/* Parsed: column mapping + preview */}
          {(status === 'parsed') && (
            <>
              {/* Column mapping */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
                  Column Mapping — map your sheet columns to product fields
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                  {sheetHeaders.map(header => (
                    <div key={header} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 12, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={header}>
                        {header}
                      </span>
                      <ChevronDown size={12} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                      <select
                        value={mapping[header] ?? ''}
                        onChange={e => setMapping(m => ({ ...m, [header]: e.target.value as ProductField | '' }))}
                        style={{ fontSize: 12, background: 'var(--bg-surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '2px 4px', fontFamily: 'var(--font)', flexShrink: 0 }}
                      >
                        <option value="">— ignore —</option>
                        {PRODUCT_FIELDS.map(f => (
                          <option key={f.key} value={f.key}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                {!canImport && (
                  <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 8 }}>
                    Map at least the "Code" and "Name" columns to proceed.
                  </p>
                )}
              </div>

              {/* Preview */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                  Preview (first 5 rows of {allRows.length.toLocaleString()} total)
                </p>
                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%', fontFamily: 'var(--font)' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-elevated)' }}>
                        {sheetHeaders.map(h => (
                          <th key={h} style={{ padding: '6px 10px', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textAlign: 'left' }}>
                            {h}
                            {mapping[h] && <span style={{ color: 'var(--primary)', marginLeft: 4, fontWeight: 400 }}>→ {mapping[h]}</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                          {sheetHeaders.map(h => (
                            <td key={h} style={{ padding: '5px 10px', color: 'var(--text)', whiteSpace: 'nowrap', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {String(row[h] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Importing: progress bar */}
          {status === 'importing' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Upload size={36} style={{ color: 'var(--primary)', margin: '0 auto 16px' }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
                Importing {progress.total.toLocaleString()} rows…
              </p>
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 99, height: 8, overflow: 'hidden', maxWidth: 400, margin: '0 auto 12px' }}>
                <div style={{
                  background: 'var(--primary)', height: '100%', borderRadius: 99,
                  width: `${progress.total ? Math.round(progress.done / progress.total * 100) : 0}%`,
                  transition: 'width 0.3s',
                }} />
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {progress.done.toLocaleString()} / {progress.total.toLocaleString()} rows ({Math.round(progress.done / (progress.total || 1) * 100)}%)
              </p>
            </div>
          )}

          {/* Done: results */}
          {status === 'done' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <CheckCircle size={40} style={{ color: 'var(--success)', margin: '0 auto 16px' }} />
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Import Complete</p>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 16 }}>
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 24px', textAlign: 'center' }}>
                  <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)', margin: 0 }}>{results.imported.toLocaleString()}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>New</p>
                </div>
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 24px', textAlign: 'center' }}>
                  <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{results.updated.toLocaleString()}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>Updated</p>
                </div>
                {results.errors.length > 0 && (
                  <div style={{ background: 'var(--danger-subtle)', border: '1px solid var(--danger)', borderRadius: 'var(--radius)', padding: '12px 24px', textAlign: 'center' }}>
                    <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--danger)', margin: 0 }}>{results.errors.length.toLocaleString()}</p>
                    <p style={{ fontSize: 12, color: 'var(--danger)', margin: '4px 0 0' }}>Errors</p>
                  </div>
                )}
              </div>
              {results.errors.length > 0 && (
                <div style={{ background: 'var(--danger-subtle)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', padding: 12, textAlign: 'left', maxHeight: 160, overflowY: 'auto', marginTop: 8 }}>
                  {results.errors.slice(0, 20).map((e, i) => (
                    <p key={i} style={{ margin: '2px 0', fontSize: 12, color: 'var(--danger)' }}>
                      <AlertCircle size={11} style={{ display: 'inline', marginRight: 4 }} />{e.message}
                    </p>
                  ))}
                  {results.errors.length > 20 && (
                    <p style={{ fontSize: 12, color: 'var(--danger)', margin: '4px 0 0' }}>…and {results.errors.length - 20} more errors</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {status === 'done' ? (
            <button onClick={onClose} style={btnPrimary}>Close</button>
          ) : (
            <>
              <button onClick={onClose} style={btnSecondary} disabled={status === 'importing'}>Cancel</button>
              {status === 'parsed' && (
                <button onClick={handleImport} disabled={!canImport} style={{ ...btnPrimary, opacity: canImport ? 1 : 0.5, cursor: canImport ? 'pointer' : 'not-allowed' }}>
                  Import {allRows.length.toLocaleString()} rows
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
