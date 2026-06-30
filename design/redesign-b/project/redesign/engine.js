/* global window */
// Lightweight live engine for the redesigned editor. NOT a full TOML/Jinja
// implementation — just enough to make the 2-pane editor recompute output,
// variables, and validation from real input. Attached to window.CGEngine.

(function () {
  // ---- minimal TOML parser (tables, dotted/quoted keys, str/num/bool/array) ----
  function parseToml(src) {
    const root = {};
    let cur = root;
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const line = stripComment(raw).trim();
      if (!line) continue;

      // array-of-tables [[a.b]] — must be tested before the single [table] header
      const ath = line.match(/^\[\[(.+)\]\]$/);
      if (ath) {
        const path = splitKeys(ath[1]);
        const key = path[path.length - 1];
        const parent = path.slice(0, -1).reduce((o, k) => (o[k] = o[k] || {}), root);
        if (!Array.isArray(parent[key])) parent[key] = [];
        const tbl = {};
        parent[key].push(tbl);
        cur = tbl;
        continue;
      }
      // table header [a.b."c"]
      const th = line.match(/^\[(.+)\]$/);
      if (th) {
        const path = splitKeys(th[1]);
        cur = path.reduce((o, k) => (o[k] = o[k] || {}), root);
        continue;
      }
      // key = value
      const kv = line.match(/^(.+?)=(.*)$/);
      if (!kv) {
        const e = new Error('構文を解釈できません');
        e.line = i + 1; e.detail = '「key = value」または「[table]」の形式が必要です';
        throw e;
      }
      const keyPath = splitKeys(kv[1].trim());
      let val;
      try { val = parseValue(kv[2].trim()); }
      catch (err) { err.line = i + 1; throw err; }
      const parent = keyPath.slice(0, -1).reduce((o, k) => (o[k] = o[k] || {}), cur);
      parent[keyPath[keyPath.length - 1]] = val;
    }
    return root;
  }

  function stripComment(line) {
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && line[i - 1] !== '\\') q = !q;
      else if (ch === '#' && !q) return line.slice(0, i);
    }
    return line;
  }

  function splitKeys(s) {
    const out = []; let buf = ''; let q = false;
    for (const ch of s) {
      if (ch === '"') { q = !q; continue; }
      if (ch === '.' && !q) { out.push(buf.trim()); buf = ''; continue; }
      buf += ch;
    }
    if (buf.trim()) out.push(buf.trim());
    return out;
  }

  function parseValue(v) {
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (/^".*"$/.test(v)) return v.slice(1, -1);
    if (/^-?\d+$/.test(v)) return parseInt(v, 10);
    if (/^-?\d*\.\d+$/.test(v)) return parseFloat(v);
    if (/^\[.*\]$/.test(v)) {
      const inner = v.slice(1, -1).trim();
      if (!inner) return [];
      return splitTop(inner).map((x) => parseValue(x.trim()));
    }
    const e = new Error('値を解釈できません: ' + v);
    e.detail = '文字列は "..."、数値・真偽値・配列 [..] が使えます';
    throw e;
  }

  function splitTop(s) {
    const out = []; let buf = ''; let depth = 0; let q = false;
    for (const ch of s) {
      if (ch === '"') q = !q;
      if (!q && (ch === '[')) depth++;
      if (!q && (ch === ']')) depth--;
      if (ch === ',' && depth === 0 && !q) { out.push(buf); buf = ''; continue; }
      buf += ch;
    }
    if (buf.trim()) out.push(buf);
    return out;
  }

  // ---- extract {{ vars }} and {% for x in y %} from a Jinja template ----
  function extractVars(tpl) {
    const vars = new Set();
    const loopVars = new Set();
    let m;
    const reFor = /\{%\s*for\s+([\w,\s]+)\s+in\s+([\w.]+?)(?:\.(?:items|values|keys)\(\))?\s*%\}/g;
    while ((m = reFor.exec(tpl))) {
      m[1].split(',').forEach((v) => loopVars.add(v.trim()));
      vars.add(m[2].trim());
    }
    const reExpr = /\{\{\s*([\w.]+)/g;
    while ((m = reExpr.exec(tpl))) {
      const base = m[1].split('.')[0];
      if (!loopVars.has(base)) vars.add(m[1].trim());
    }
    return [...vars];
  }

  // ---- tiny Jinja-ish renderer: {{ x }}, | join(','), {% for k,v in obj %}, {% if %} ----
  function render(tpl, ctx) {
    // strip comments
    tpl = tpl.replace(/\{#[\s\S]*?#\}/g, '');
    // Jinja whitespace control, ON by default here so block-style loops don't
    // leave a blank line per iteration:
    //  - lstrip_blocks: drop leading spaces/tabs before a block tag on its own line
    //  - trim_blocks:   drop the single newline right after a block tag
    tpl = tpl.replace(/^[ \t]+(\{%)/gm, '$1');
    tpl = tpl.replace(/(\{%[^%]*%\})\n/g, '$1');
    return renderBlock(tpl, ctx);
  }

  function lookup(path, ctx) {
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ctx);
  }

  function applyFilters(val, filters) {
    for (const f of filters) {
      const jm = f.match(/^join\(\s*'(.*)'\s*\)$/) || f.match(/^join\(\s*"(.*)"\s*\)$/);
      if (jm && Array.isArray(val)) val = val.join(jm[1]);
      else if (f === 'upper' && typeof val === 'string') val = val.toUpperCase();
      else if (f === 'lower' && typeof val === 'string') val = val.toLowerCase();
    }
    return val;
  }

  function evalExpr(expr, ctx) {
    const parts = expr.split('|').map((s) => s.trim());
    let val = lookup(parts[0], ctx);
    if (val === undefined) {
      const e = new Error('未定義の変数: ' + parts[0]);
      e.detail = 'テンプレートの変数が設定データに見つかりません';
      e.varName = parts[0];
      throw e;
    }
    return applyFilters(val, parts.slice(1));
  }

  function renderBlock(tpl, ctx) {
    let out = '';
    let i = 0;
    const tagRe = /\{\{(.+?)\}\}|\{%(.+?)%\}/g;
    let m; let last = 0;
    const stack = [];
    // We process sequentially, handling for/if/endfor/endif by finding matching blocks.
    // Simplify: use a recursive scan.
    return scan(tpl, ctx);
  }

  function findMatch(tpl, from, openKw, closeKw) {
    const re = /\{%\s*(\w+)/g; re.lastIndex = from;
    let depth = 0; let m;
    while ((m = re.exec(tpl))) {
      if (m[1] === openKw) depth++;
      else if (m[1] === closeKw) { if (depth === 0) return m.index; depth--; }
    }
    return -1;
  }

  function scan(tpl, ctx) {
    let out = ''; let i = 0;
    const re = /\{\{(.+?)\}\}|\{%(.+?)%\}/g;
    let m; let last = 0;
    while ((m = re.exec(tpl))) {
      out += tpl.slice(last, m.index);
      if (m[1] != null) {
        out += String(evalExpr(m[1].trim(), ctx));
        last = re.lastIndex;
      } else {
        const tag = m[2].trim();
        const forM = tag.match(/^for\s+([\w,\s]+)\s+in\s+([\w.]+?)(?:\.(?:items|values|keys)\(\))?$/);
        const ifM = tag.match(/^if\s+(.+)$/);
        if (forM) {
          const endIdx = findMatch(tpl, re.lastIndex, 'for', 'endfor');
          const body = tpl.slice(re.lastIndex, endIdx);
          const coll = lookup(forM[2].trim(), ctx);
          const names = forM[1].split(',').map((s) => s.trim());
          let acc = '';
          if (coll && typeof coll === 'object') {
            const entries = Array.isArray(coll) ? coll.map((v, k) => [k, v]) : Object.entries(coll);
            let li = 0;
            for (const [k, v] of entries) {
              li++;
              const sub = Object.assign({}, ctx);
              if (names.length === 2) { sub[names[0]] = k; sub[names[1]] = v; }
              else { sub[names[0]] = v; }
              sub.loop_index = li;
              acc += scan(body, sub);
            }
          }
          out += acc;
          re.lastIndex = skipTag(tpl, endIdx);
          last = re.lastIndex;
        } else if (ifM) {
          const endIdx = findMatch(tpl, re.lastIndex, 'if', 'endif');
          const body = tpl.slice(re.lastIndex, endIdx);
          // optional {% else %}
          const elseIdx = findElse(tpl, re.lastIndex, endIdx);
          const cond = evalCond(ifM[1], ctx);
          if (elseIdx >= 0) {
            out += cond ? scan(tpl.slice(re.lastIndex, elseIdx), ctx)
                        : scan(tpl.slice(skipTag(tpl, elseIdx), endIdx), ctx);
          } else {
            out += cond ? scan(body, ctx) : '';
          }
          re.lastIndex = skipTag(tpl, endIdx);
          last = re.lastIndex;
        } else {
          // unknown tag (endfor/endif handled by skips) — drop it
          last = re.lastIndex;
        }
      }
    }
    out += tpl.slice(last);
    return out;
  }

  function findElse(tpl, from, end) {
    const re = /\{%\s*(\w+)/g; re.lastIndex = from; let depth = 0; let m;
    while ((m = re.exec(tpl)) && m.index < end) {
      if (m[1] === 'if' || m[1] === 'for') depth++;
      else if (m[1] === 'endif' || m[1] === 'endfor') depth--;
      else if (m[1] === 'else' && depth === 0) return m.index;
    }
    return -1;
  }

  function skipTag(tpl, idx) {
    const close = tpl.indexOf('%}', idx);
    return close === -1 ? tpl.length : close + 2;
  }

  function evalCond(expr, ctx) {
    const cmp = expr.match(/^(.+?)(==|!=)(.+)$/);
    if (cmp) {
      const a = lookup(cmp[1].trim(), ctx);
      let b = cmp[3].trim();
      if (/^".*"$/.test(b) || /^'.*'$/.test(b)) b = b.slice(1, -1);
      else if (b === 'true') b = true; else if (b === 'false') b = false;
      else if (/^-?\d+$/.test(b)) b = parseInt(b, 10);
      return cmp[2] === '==' ? a === b : a !== b;
    }
    const v = lookup(expr.trim(), ctx);
    return !!v;
  }

  // trim_blocks handles loop-induced blanks; here we only cap runs of blank
  // lines at one (3+ newlines → 2) so intentional spacing survives.
  function tidy(s) {
    return s.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+$/gm, '').trimEnd() + '\n';
  }

  // ---- minimal YAML parser (indentation maps, block lists, inline scalars) ----
  function stripYamlComment(line) {
    let q = null;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) { if (ch === q) q = null; continue; }
      if (ch === '"' || ch === "'") q = ch;
      else if (ch === '#' && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
    }
    return line;
  }

  function yamlScalar(v) {
    if (v === '' || v === '~' || v === 'null') return null;
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (/^".*"$/.test(v) || /^'.*'$/.test(v)) return v.slice(1, -1);
    if (/^-?\d+$/.test(v)) return parseInt(v, 10);
    if (/^-?\d*\.\d+$/.test(v)) return parseFloat(v);
    if (/^\[.*\]$/.test(v)) {
      const inner = v.slice(1, -1).trim();
      return inner ? splitTop(inner).map((x) => yamlScalar(x.trim())) : [];
    }
    return v;
  }

  function parseYaml(src) {
    const rows = [];
    src.split('\n').forEach((raw, i) => {
      const s = stripYamlComment(raw);
      if (s.trim() === '') return;
      rows.push({ indent: s.match(/^ */)[0].length, text: s.trim(), n: i + 1 });
    });
    let pos = 0;

    function parseNode(indent) {
      if (pos >= rows.length) return null;
      return rows[pos].text.startsWith('- ') ? parseList(indent) : parseMap(indent);
    }
    function parseMap(indent) {
      const obj = {};
      while (pos < rows.length && rows[pos].indent === indent && !rows[pos].text.startsWith('- ')) {
        const row = rows[pos];
        const m = row.text.match(/^([^:]+):\s*(.*)$/);
        if (!m) { const e = new Error('マッピングを解釈できません'); e.line = row.n; e.detail = '「key: value」の形式が必要です'; throw e; }
        const key = m[1].trim();
        const val = m[2].trim();
        pos++;
        if (val === '') {
          obj[key] = (pos < rows.length && rows[pos].indent > indent) ? parseNode(rows[pos].indent) : null;
        } else {
          obj[key] = yamlScalar(val);
        }
      }
      return obj;
    }
    function parseList(indent) {
      const arr = [];
      while (pos < rows.length && rows[pos].indent === indent && rows[pos].text.startsWith('- ')) {
        const row = rows[pos];
        const rest = row.text.slice(2).trim();
        if (rest === '') { pos++; arr.push(parseNode(rows[pos] ? rows[pos].indent : indent + 2)); }
        else if (/^[^:]+:\s/.test(rest) || /^[^:]+:$/.test(rest)) {
          // inline map start ("- key: value") — re-emit as a map row at a deeper indent
          row.indent = indent + 2; row.text = rest;
          arr.push(parseMap(indent + 2));
        } else { pos++; arr.push(yamlScalar(rest)); }
      }
      return arr;
    }

    const out = parseNode(0);
    if (out == null || typeof out !== 'object') { const e = new Error('YAML を解釈できません'); e.line = 1; e.detail = 'マッピングまたはリストが必要です'; throw e; }
    return out;
  }

  // ---- minimal CSV parser (header row + records) ----
  function parseCsv(src) {
    const lines = src.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) { const e = new Error('CSV が空です'); e.line = 1; e.detail = '先頭行にヘッダーが必要です'; throw e; }
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].includes(',')) {
        const e = new Error('CSV として解析できません');
        e.line = i + 1; e.detail = '区切り文字 (,) が見つかりません — この行は CSV の形式ではありません';
        throw e;
      }
    }
    const header = lines[0].split(',').map((s) => s.trim());
    const rows = lines.slice(1).map((line) => {
      const cells = line.split(',').map((s) => s.trim());
      const o = {}; header.forEach((h, i) => { o[h] = cells[i] !== undefined ? cells[i] : ''; });
      return o;
    });
    return { header, rows };
  }

  function parseByFormat(text, format) {
    if (format === 'yaml') return parseYaml(text);
    if (format === 'csv') return parseCsv(text);
    return parseToml(text);
  }

  // Try every format; return the first that parses (for the "auto-detect" helper).
  function detectFormat(text) {
    for (const f of ['toml', 'yaml', 'csv']) {
      try { parseByFormat(text, f); return f; } catch (e) { /* keep trying */ }
    }
    return null;
  }

  // ---- public: compute everything the editor needs ----
  function compute(dataText, format, tplText) {
    const result = { ok: true, error: null, output: '', json: '', vars: [], interfaces: 0, keys: 0, suggest: null };
    let ctx;
    try {
      ctx = parseByFormat(dataText, format);
    } catch (e) {
      // a parse failure here is the format-mismatch story: suggest the format that DOES parse
      const suggest = detectFormat(dataText);
      result.ok = false;
      result.suggest = (suggest && suggest !== format) ? suggest : null;
      result.error = {
        line: e.line || 1,
        title: format.toUpperCase() + ' として解析できません',
        detail: e.detail || e.message,
      };
      return result;
    }
    result.json = JSON.stringify(ctx, null, 2);
    result.keys = Object.keys(ctx).length;
    result.interfaces = ctx.interfaces ? Object.keys(ctx.interfaces).length : 0;
    result.vars = extractVars(tplText);
    try {
      result.output = tidy(render(tplText, ctx));
    } catch (e) {
      result.ok = false;
      result.error = { line: null, title: e.message, detail: e.detail || 'テンプレートを確認してください', pane: 'tpl', varName: e.varName };
    }
    return result;
  }

  function firstSectionLine(src) {
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) if (/^\s*\[.+\]\s*$/.test(lines[i])) return i + 1;
    return 1;
  }

  window.CGEngine = { compute, parseToml, parseYaml, parseCsv, detectFormat, render, extractVars };
})();
