import { useState, type ReactNode } from 'react';
import { Button, FileUploader, Badge } from '../ds';
import { Icon } from './Icon';
import { HowToModal } from './HowToModal';
import type { Style } from '../styles/css';
import logoMark from '../assets/brand/logo-mark.svg';

// EmptyState — first-run onboarding for the 2-pane editor. Teaches the
// two-file concept (values + template → commands) and offers three ways to
// start: one-click sample, upload, or template library.

// Background drifting items for the haunting backdrop (no emoji — SVG + code).
const CG_GLYPHS = [
  { name: 'server',        top: '17%', left: '5%',  size: 30, op: 0.08, anim: 'cg-drift',  delay: '0s' },
  { name: 'router',        top: '63%', left: '11%', size: 26, op: 0.07, anim: 'cg-sway',   delay: '-4s' },
  { name: 'switch',        top: '28%', left: '89%', size: 30, op: 0.08, anim: 'cg-drift2', delay: '-8s' },
  { name: 'topology',      top: '70%', left: '83%', size: 36, op: 0.07, anim: 'cg-twirl',  delay: '-2s' },
  { name: 'terminal',      top: '46%', left: '3%',  size: 24, op: 0.07, anim: 'cg-sway',   delay: '-6s' },
  { name: 'ethernet-port', top: '80%', left: '46%', size: 24, op: 0.06, anim: 'cg-drift',  delay: '-10s' },
];
const WHISPER_VOCAB = [
  // drawn from common Linux /etc configs — sshd_config, nginx, sysctl, fstab, hosts, ntp, iptables, cron…
  'PermitRootLogin no', 'Port 22', 'PasswordAuthentication no', 'AllowTcpForwarding no',
  'nameserver 8.8.8.8', 'search corp.local', 'options timeout:2',
  'listen 443 ssl;', 'proxy_pass http://backend;', 'server_name example.com;', 'worker_connections 1024;',
  'net.ipv4.ip_forward = 1', 'vm.swappiness = 10', 'net.core.somaxconn = 1024', 'fs.file-max = 100000',
  '127.0.0.1   localhost', '::1   ip6-localhost', '192.168.1.10  router-001',
  'iface eth0 inet static', 'address 192.168.1.10', 'netmask 255.255.255.0', 'gateway 192.168.1.1',
  'server pool.ntp.org iburst', 'driftfile /var/lib/ntp/drift',
  '0 3 * * * /usr/bin/backup.sh', '*/5 * * * * root /usr/local/bin/check',
  '-A INPUT -p tcp --dport 22 -j ACCEPT', '-A INPUT -j DROP', '-P FORWARD DROP',
  'UUID=… /boot ext4 defaults 0 1', 'tmpfs /tmp tmpfs defaults 0 0', '/dev/sda1 / ext4 errors=remount-ro',
  'rocommunity public', 'syslocation datacenter-1', 'balance roundrobin', 'mode http',
  'auth required pam_unix.so', 'ServerName www.example.com', 'DocumentRoot /var/www/html',
  'interface GigabitEthernet0/1', '{% for intf in interfaces %}', '{{ global.hostname }}', '> _',
];
// pseudo-random, seeded per index; a per-load time seed reshuffles the layout each reload
// while keeping it stable within one session (computed once at module load).
const CG_SEED = (Date.now() % 100000) * 0.0173;
function rng(n: number): number {
  const x = Math.sin((n + CG_SEED) * 99.13) * 43758.5453;
  return x - Math.floor(x);
}
const CG_WHISPERS = Array.from({ length: 42 }, (_, i) => ({
  text: WHISPER_VOCAB[i % WHISPER_VOCAB.length],
  top: (4 + rng(i + 1) * 90).toFixed(1) + '%',
  left: (2 + rng(i + 51) * 90).toFixed(1) + '%',
  size: 11 + Math.round(rng(i + 17) * 2),
  delay: '-' + (rng(i + 7) * 9).toFixed(1) + 's',
}));
const CG_MOTES = Array.from({ length: 90 }, (_, i) => ({
  left: (1 + rng(i + 200) * 97).toFixed(1) + '%',
  size: 2 + Math.round(rng(i + 311) * 2),
  dur: 12 + Math.round(rng(i + 421) * 12) + 's',
  delay: rng(i + 533) * 14 + 's',
  op: (0.3 + rng(i + 641) * 0.25).toFixed(2),
}));

interface ConceptCardProps {
  icon: ReactNode;
  title: string;
  sub: string;
  note: string;
  outcome?: boolean;
}

function ConceptCard({ icon, title, sub, note, outcome }: ConceptCardProps) {
  return (
    <div
      style={{
        width: 184,
        background: 'var(--cg-bg-secondary)',
        border: `1px solid ${outcome ? 'var(--cg-error-border)' : 'var(--cg-border)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '16px 16px 14px',
        boxShadow: outcome ? '0 0 0 1px var(--cg-error-border)' : 'none',
      }}
    >
      <div style={{ fontSize: 26, lineHeight: 1, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--cg-text)' }}>{title}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cg-text-muted)', marginTop: 3 }}>{sub}</div>
      <div style={{ marginTop: 10 }}>
        <Badge tone={outcome ? 'error' : 'neutral'}>{note}</Badge>
      </div>
    </div>
  );
}

function Op({ children, accent }: { children: ReactNode; accent?: boolean }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', width: 34, flexShrink: 0, fontSize: 22, color: accent ? 'var(--cg-red)' : 'var(--cg-text-faint)', fontWeight: 700 }}>
      {children}
    </div>
  );
}

export interface EmptyStateProps {
  onStart: (mode?: string) => void;
  onLibrary?: () => void;
  onConfigFile?: (file: File) => void;
  onTemplateFile?: (file: File) => void;
  onUploadError?: (message: string) => void;
  onConfigUploadError?: (message: string) => void;
  onTemplateUploadError?: (message: string) => void;
  uploadError?: string | null;
  configFileName?: string | null;
  templateFileName?: string | null;
}

export function EmptyState({
  onStart,
  onLibrary,
  onConfigFile,
  onTemplateFile,
  onUploadError,
  onConfigUploadError,
  onTemplateUploadError,
  uploadError,
  configFileName,
  templateFileName,
}: EmptyStateProps) {
  const [howto, setHowto] = useState(false);
  const reportConfigUploadError = onConfigUploadError || onUploadError;
  const reportTemplateUploadError = onTemplateUploadError || onUploadError;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--cg-bg)', fontFamily: 'var(--font-sans)', color: 'var(--cg-text)', position: 'relative', overflow: 'hidden' }}>

      {/* app bar */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: '0 18px', height: 56, borderBottom: '1px solid var(--cg-border)', flexShrink: 0 }}>
        <img src={logoMark} alt="" style={{ width: 30, height: 30, flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 'var(--text-md)', whiteSpace: 'nowrap' }}>Command ghostwriter</span>
        </div>
        <div style={{ flex: 1 }} />
        <a href="#" onClick={(e) => { e.preventDefault(); setHowto(true); }} style={{ color: 'var(--cg-text-muted)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>使い方</a>
      </header>

      {/* ===== haunting atmosphere (behind content) ===== */}
      <div aria-hidden="true" style={{ position: 'absolute', top: 56, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        {/* vignette */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 50% 20%, transparent 26%, rgba(0,0,0,.80) 100%)' }} />
        {/* creeping cold light from above */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(70% 50% at 50% -8%, rgba(90,120,150,.14), transparent 60%)' }} />
        {/* spectral glow near the hero */}
        <div className="cg-glow" style={{ position: 'absolute', top: '4%', left: '50%', width: 460, height: 460, marginLeft: -230, borderRadius: '50%', filter: 'blur(50px)', background: 'radial-gradient(circle, rgba(174,199,214,.5), rgba(174,199,214,0) 70%)' }} />
        {/* drifting infra glyphs */}
        {CG_GLYPHS.map((g, i) => (
          <span key={'g' + i} className={g.anim} style={{ position: 'absolute', top: g.top, left: g.left, opacity: g.op, animationDelay: g.delay }}>
            <Icon name={g.name} size={g.size} color="var(--cg-ghost-outline)" />
          </span>
        ))}
        {/* whispered command fragments */}
        {CG_WHISPERS.map((w, i) => (
          <span key={'w' + i} className="cg-fade" style={{ position: 'absolute', top: w.top, left: w.left, opacity: 0.1, fontFamily: 'var(--font-mono)', fontSize: w.size, color: 'var(--cg-ghost-outline)', whiteSpace: 'nowrap', letterSpacing: '.05em', animationDelay: w.delay }}>{w.text}</span>
        ))}
        {/* dust motes */}
        {CG_MOTES.map((m, i) => (
          <span
            key={'m' + i}
            className="cg-ghost"
            style={{ position: 'absolute', bottom: -10, left: m.left, width: m.size, height: m.size, borderRadius: '50%', background: 'var(--cg-ghost-outline)', opacity: 0, '--cg-d': m.dur, '--cg-delay': m.delay, '--cg-o': m.op } as Style}
          />
        ))}
        {/* low mist — layered, creeping */}
        <div className="cg-mist" style={{ position: 'absolute', bottom: -100, left: '50%', width: 1240, height: 320, marginLeft: -620, borderRadius: '50%', filter: 'blur(58px)', background: 'radial-gradient(circle, rgba(174,199,214,.32), rgba(174,199,214,0) 70%)' }} />
        <div className="cg-creep" style={{ position: 'absolute', bottom: 0, left: -120, right: -120, height: 180, filter: 'blur(34px)', background: 'linear-gradient(180deg, rgba(174,199,214,0), rgba(174,199,214,.18))' }} />
        <div className="cg-mist" style={{ position: 'absolute', top: '36%', left: '50%', width: 1040, height: 200, marginLeft: -520, borderRadius: '50%', filter: 'blur(50px)', animationDelay: '-3s', background: 'radial-gradient(circle, rgba(174,199,214,.18), rgba(174,199,214,0) 70%)' }} />
      </div>

      {/* hero */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '40px 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ width: '100%', maxWidth: 880 }}>

          {/* headline */}
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <div style={{ position: 'relative', width: 76, height: 76, margin: '0 auto 18px' }}>
              <div className="cg-glow" style={{ position: 'absolute', inset: -26, borderRadius: '50%', filter: 'blur(22px)', background: 'radial-gradient(circle, rgba(174,199,214,.6), rgba(174,199,214,0) 70%)' }} />
              <img src={logoMark} alt="" className="cg-bob" style={{ position: 'relative', width: 76, height: 76, filter: 'drop-shadow(0 4px 14px rgba(255,75,75,.35))' }} />
            </div>
            <h1 style={{ margin: '0 0 8px', fontSize: 'var(--text-2xl)', fontWeight: 700, letterSpacing: '-.01em' }}>
              2つのファイルから、実行可能なコマンドを。
            </h1>
            <p style={{ margin: '0 auto', maxWidth: 560, color: 'var(--cg-text-muted)', fontSize: 'var(--text-base)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--cg-text)' }}>設定定義ファイル</strong>（値）と
              <strong style={{ color: 'var(--cg-text)' }}> Jinjaテンプレート</strong>（雛形）を組み合わせるだけ。
              繰り返しのCLI作業を、値の差し替えだけで生成できます。
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '18px auto 10px' }}>
              <span style={{ width: 40, height: 1, background: 'linear-gradient(90deg, transparent, var(--cg-border-strong))' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--cg-red)', fontWeight: 600 }}>&gt;_</span>
              <span style={{ width: 40, height: 1, background: 'linear-gradient(90deg, var(--cg-border-strong), transparent)' }} />
            </div>
            <div className="cg-flicker" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', letterSpacing: '.18em', color: 'var(--cg-ghost-outline)' }}>
              設定定義 × テンプレート → 再現可能なコマンド
            </div>
          </div>

          {/* concept diagram */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 34, flexWrap: 'wrap' }}>
            <ConceptCard icon={<Icon name="config-file" size={26} />} title="設定定義ファイル" sub="TOML · YAML · CSV" note="「値」を定義" />
            <Op>＋</Op>
            <ConceptCard icon={<Icon name="template-file" size={26} />} title="Jinjaテンプレート" sub=".j2 · .jinja2" note="「雛形」を記述" />
            <Op accent>→</Op>
            <ConceptCard icon={<Icon name="terminal" size={26} color="var(--cg-red)" />} title="実行可能なコマンド" sub="CLI · Markdown" note="そのまま実行" outcome />
          </div>

          {/* start card */}
          <div style={{ background: 'var(--cg-bg-secondary)', border: '1px solid var(--cg-border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
            {/* primary: sample */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>はじめてなら、サンプルで試す</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--cg-text-muted)', marginTop: 2 }}>
                  Ciscoスイッチ設定の例を読み込み、すぐに結果まで体験できます（30秒）。
                </div>
              </div>
              <Button variant="primary" size="lg" icon={<Icon name="generate" size={17} />} onClick={() => onStart('sample')}>サンプルで試す</Button>
            </div>

            {/* divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--cg-border)' }} />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--cg-text-faint)' }}>または、自分のファイルから</span>
              <div style={{ flex: 1, height: 1, background: 'var(--cg-border)' }} />
            </div>

            {/* uploads */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FileUploader
                label="① 設定定義ファイル"
                accept=".toml,.yaml,.yml,.csv"
                acceptLabel="TOML, YAML, CSV"
                onFile={onConfigFile}
                onError={reportConfigUploadError}
                fileName={configFileName}
              />
              <FileUploader
                label="② Jinjaテンプレート"
                accept=".j2,.jinja2"
                acceptLabel="J2, JINJA2"
                onFile={onTemplateFile}
                onError={reportTemplateUploadError}
                fileName={templateFileName}
              />
            </div>

            {uploadError && (
              <div role="alert" style={{ marginTop: 12, padding: '10px 12px', border: '1px solid var(--cg-error-border)', borderRadius: 'var(--radius-md)', background: 'var(--cg-error-bg)', color: 'var(--cg-red-tint)', fontSize: 'var(--text-sm)' }}>
                {uploadError}
              </div>
            )}

            {/* library link */}
            <div style={{ marginTop: 18, textAlign: 'center' }}>
              <a href="#" onClick={(e) => { e.preventDefault(); onLibrary && onLibrary(); }} style={{ color: 'var(--cg-info)', textDecoration: 'none', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                保存済みテンプレートライブラリから選ぶ →
              </a>
            </div>
          </div>

        </div>
      </div>

      <HowToModal open={howto} onClose={() => setHowto(false)} />
    </div>
  );
}
