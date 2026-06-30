import React from 'react';

/**
 * FileUploader — recreates Streamlit's st.file_uploader dropzone.
 * Dashed border, cloud prompt, type/size limits, and an optional
 * "uploaded file" row once a name is provided.
 */
export interface FileUploaderProps {
  label?: React.ReactNode;
  accept?: string;
  acceptLabel?: string;
  maxSize?: string;
  fileName?: string | null;
  fileSize?: string;
  onBrowse?: () => void;
  onFile?: (file: File) => void;
  style?: React.CSSProperties;
}

export function FileUploader({
  label,
  accept = '',
  acceptLabel,
  maxSize = '30MB',
  fileName = null,
  fileSize = '',
  onBrowse,
  onFile,
  style,
}: FileUploaderProps) {
  const [hover, setHover] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const handleBrowse = () => {
    inputRef.current?.click();
    onBrowse?.();
  };
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (file) onFile?.(file);
    event.currentTarget.value = '';
  };

  return (
    <div style={{ fontFamily: 'var(--font-sans)', ...style }}>
      {label && (
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)', marginBottom: 'var(--space-2)' }}>
          {label}
        </div>
      )}
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          background: 'var(--surface-raised)',
          border: `1px dashed ${hover ? 'var(--cg-red)' : 'var(--border-default)'}`,
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4) var(--space-5)',
          transition: 'border-color var(--dur-base) var(--ease-standard)',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--cg-red)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.9 }}>
          <path d="M7 18.5 A4 4 0 0 1 6.5 10.6 A5.2 5.2 0 0 1 16.2 9.4 A3.6 3.6 0 0 1 17 18.5" />
          <path d="M12 12.5 v6" />
          <path d="M9.5 15 L12 12.5 L14.5 15" />
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-body)' }}>Drag and drop file here</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>
            Limit {maxSize} per file{(acceptLabel || accept) ? ` · ${acceptLabel || accept}` : ''}
          </div>
        </div>
        <button
          type="button"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--weight-semibold)' as unknown as number,
            color: 'var(--text-body)',
            background: 'var(--surface-app)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 14px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
          onClick={handleBrowse}
        >
          Browse files
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {fileName && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            marginTop: 'var(--space-2)',
            padding: 'var(--space-2) var(--space-3)',
            fontSize: 'var(--text-sm)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--text-secondary)' }}>
            <path d="M6 3 h7 l5 5 v12 a1 1 0 0 1 -1 1 H6 a1 1 0 0 1 -1 -1 V4 a1 1 0 0 1 1 -1 Z" />
            <path d="M13 3 v5 h5" />
          </svg>
          <span style={{ flex: 1, minWidth: 0, color: 'var(--text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fileName}
          </span>
          {fileSize && <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>{fileSize}</span>}
          <span style={{ color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</span>
        </div>
      )}
    </div>
  );
}
