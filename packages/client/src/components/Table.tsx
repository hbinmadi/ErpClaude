interface Column<T> {
  header: string;
  accessor?: keyof T;
  render?: (row: T) => React.ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  error?: Error | null;
  keyField?: keyof T;
  onRowClick?: (row: T) => void;
}

function Skeleton() {
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      borderRadius: 'var(--radius-sm)',
      height: 14, width: '80%',
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

export default function Table<T extends Record<string, unknown>>({
  columns,
  data,
  isLoading,
  error,
  keyField,
  onRowClick,
}: TableProps<T>) {
  if (error) {
    return (
      <div style={{
        background: 'var(--danger-subtle)',
        border: '1px solid var(--danger)',
        borderRadius: 'var(--radius)',
        padding: '12px 16px',
        color: 'var(--danger)',
        fontSize: 13,
      }}>
        Error: {error.message}
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .erp-table-row:hover td {
          background: var(--bg-hover) !important;
        }
      `}</style>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            borderCollapse: 'collapse',
            fontSize: 13, width: '100%',
            fontFamily: 'var(--font)',
          }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {columns.map((col, i) => (
                  <th
                    key={i}
                    style={{
                      padding: '10px 14px',
                      textAlign: col.align ?? 'left',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                      borderBottom: '1px solid var(--border)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, rowIdx) => (
                    <tr key={rowIdx}>
                      {columns.map((_, colIdx) => (
                        <td
                          key={colIdx}
                          style={{
                            padding: '11px 14px',
                            borderBottom: '1px solid var(--border-muted)',
                            background: 'var(--bg-surface)',
                          }}
                        >
                          <Skeleton />
                        </td>
                      ))}
                    </tr>
                  ))
                : data.length === 0
                ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      style={{
                        padding: '32px 16px', textAlign: 'center',
                        color: 'var(--text-faint)', fontSize: 13,
                        background: 'var(--bg-surface)',
                      }}
                    >
                      No records found
                    </td>
                  </tr>
                )
                : data.map((row, rowIdx) => (
                    <tr
                      key={keyField ? String(row[keyField]) : rowIdx}
                      className="erp-table-row"
                      onClick={() => onRowClick?.(row)}
                      style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                    >
                      {columns.map((col, colIdx) => (
                        <td
                          key={colIdx}
                          style={{
                            padding: '10px 14px',
                            color: 'var(--text)',
                            borderBottom: rowIdx < data.length - 1
                              ? '1px solid var(--border-muted)' : 'none',
                            background: 'var(--bg-surface)',
                            whiteSpace: 'nowrap',
                            textAlign: col.align ?? 'left',
                          }}
                        >
                          {col.render
                            ? col.render(row)
                            : col.accessor !== undefined
                            ? String(row[col.accessor] ?? '')
                            : ''}
                        </td>
                      ))}
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
