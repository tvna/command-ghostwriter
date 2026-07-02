import React from 'react';

// CodeView — a line-numbered, syntax-highlighted code surface for the
// redesigned editor. Optionally editable via a transparent textarea overlay
// kept scroll-locked to the highlight layer. Lightweight regex tokenizer;
// languages: toml, jinja, bash, json, markdown.

type TokenClass = 'comment' | 'string' | 'number' | 'bool' | 'key' | 'section' | 'expr' | 'stmt' | 'ip';

const CV_COLORS: Record<TokenClass, string> = {
  comment: 'var(--cg-text-faint)',
  string: '#7CD992',
  number: '#5AB9F0',
  bool: '#5AB9F0',
  key: '#FF8C8C',
  section: '#FFBD45',
  expr: '#FF8C8C',
  stmt: '#FFBD45',
  ip: '#5AB9F0',
};

const CV_REGEX: Record<string, RegExp> = {
  toml: /(#.*$)|(\[[^\]]*\])|("(?:[^"\\]|\\.)*")|(\b(?:true|false)\b)|(\b\d[\d.]*\b)|([A-Za-z0-9_."]+)(?=\s*=)/g,
  jinja: /(\{#[\s\S]*?#\})|(\{\{[\s\S]*?\}\})|(\{%[\s\S]*?%\})|("(?:[^"\\]|\\.)*")/g,
  bash: /((?:#|!).*$)|("(?:[^"\\]|\\.)*")|(\b\d{1,3}(?:\.\d{1,3}){3}\b)|(\b\d+\b)/g,
};
const CV_CLASS: Record<string, TokenClass[]> = {
  toml: ['comment', 'section', 'string', 'bool', 'number', 'key'],
  jinja: ['comment', 'expr', 'stmt', 'string'],
  bash: ['comment', 'string', 'ip', 'number'],
};

interface Token {
  t: string;
  c?: TokenClass;
}

function cvTokens(line: string, lang: string): Token[] {
  if (lang === 'json') return cvJson(line);
  const re = CV_REGEX[lang];
  if (!re) return [{ t: line }];
  re.lastIndex = 0;
  const out: Token[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push({ t: line.slice(last, m.index) });
    let gi = 1;
    for (; gi < m.length; gi++) {
      if (m[gi] != null) break;
    }
    out.push({ t: m[0], c: CV_CLASS[lang][gi - 1] });
    last = re.lastIndex;
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  if (last < line.length) out.push({ t: line.slice(last) });
  return out;
}

function cvJson(line: string): Token[] {
  const re = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\b\d[\d.]*\b)|\b(true|false|null)\b/g;
  const out: Token[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push({ t: line.slice(last, m.index) });
    if (m[1] != null) {
      out.push({ t: m[1], c: m[2] ? 'key' : 'string' });
      if (m[2]) out.push({ t: m[2] });
    } else if (m[3] != null) {
      out.push({ t: m[3], c: 'number' });
    } else if (m[4] != null) {
      out.push({ t: m[4], c: 'bool' });
    }
    last = re.lastIndex;
  }
  if (last < line.length) out.push({ t: line.slice(last) });
  return out;
}

export interface CodeViewProps {
  code: string;
  lang: string;
  errorLine?: number;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

export function CodeView({ code, lang, errorLine, onChange, readOnly }: CodeViewProps) {
  const lines = code.split('\n');
  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const hlRef = React.useRef<HTMLDivElement>(null);
  const gutRef = React.useRef<HTMLDivElement>(null);
  const editable = !readOnly && typeof onChange === 'function';

  // keep the highlight layer + gutter scroll-locked to the textarea
  const onScroll = () => {
    if (!taRef.current) return;
    const { scrollTop, scrollLeft } = taRef.current;
    if (hlRef.current) {
      hlRef.current.scrollTop = scrollTop;
      hlRef.current.scrollLeft = scrollLeft;
    }
    if (gutRef.current) gutRef.current.scrollTop = scrollTop;
  };

  const PAD = '12px 16px';
  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        fontFamily: 'var(--font-mono)',
        fontSize: 13,
        lineHeight: '20px',
        background: 'var(--cg-bg-code)',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* gutter */}
      <div
        ref={gutRef}
        style={{
          flexShrink: 0,
          textAlign: 'right',
          padding: '12px 10px 12px 14px',
          color: 'var(--cg-text-faint)',
          userSelect: 'none',
          overflow: 'hidden',
          background: 'rgba(255,255,255,.015)',
          borderRight: '1px solid var(--cg-border)',
        }}
      >
        {lines.map((_, i) => (
          <div key={i} style={{ color: i + 1 === errorLine ? 'var(--cg-red)' : undefined }}>
            {i + 1}
          </div>
        ))}
      </div>

      {/* code + optional editor overlay */}
      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        {/* highlighted layer */}
        <div
          ref={hlRef}
          style={{
            position: 'absolute',
            inset: 0,
            padding: PAD,
            whiteSpace: 'pre',
            overflow: editable ? 'hidden' : 'auto',
            color: 'var(--cg-text)',
            pointerEvents: editable ? 'none' : 'auto',
          }}
        >
          {lines.map((line, i) => (
            <div key={i} style={{ minHeight: 20, background: i + 1 === errorLine ? 'var(--cg-error-bg)' : undefined }}>
              {cvTokens(line, lang).map((tok, j) => (
                <span key={j} style={tok.c ? { color: CV_COLORS[tok.c] } : undefined}>
                  {tok.t}
                </span>
              ))}
              {line === '' && <span>{'\u200b'}</span>}
            </div>
          ))}
        </div>
        {/* transparent textarea catches input; text is hidden, caret shown */}
        {editable && (
          <textarea
            ref={taRef}
            value={code}
            spellCheck={false}
            onChange={(e) => onChange!(e.target.value)}
            onScroll={onScroll}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              margin: 0,
              padding: PAD,
              border: 'none',
              outline: 'none',
              resize: 'none',
              background: 'transparent',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              lineHeight: 'inherit',
              whiteSpace: 'pre',
              overflow: 'auto',
              color: 'transparent',
              caretColor: 'var(--cg-text)',
              tabSize: 2,
            }}
          />
        )}
      </div>
    </div>
  );
}
