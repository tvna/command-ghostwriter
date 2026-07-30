"""Drift gate for the two-axis template taxonomy (domain category x activity).

Parses the template registry (``web/src/lib/templates.ts``) and asserts the
taxonomy invariants established when the old activity-axis ``runbook`` category
was split into a pure domain ``category`` plus an orthogonal ``activity`` axis:

- ``category`` is one of the five domain values (TypeScript enforces the union
  at build time; this checks the data too, and runs in the Python CI).
- ``activity`` (when present) is one of the six activity values; omission means
  "build".
- ``output`` / ``format`` stay within their allowed sets.
- every ``(category, subCategory)`` pair is in the normalized allow-list below.

Adding a template with a new sub-category is deliberate: extend
``ALLOWED_SUBCATEGORIES`` in the same change. This keeps the sub-category
vocabulary from silently sprawling again -- the drift the two-axis reorg fixed.
"""

import re
from pathlib import Path
from typing import Final

import pytest
from _pytest.mark.structures import MarkDecorator

UNIT: MarkDecorator = pytest.mark.unit

TEMPLATES_TS: Final[Path] = Path(__file__).resolve().parents[2] / "web" / "src" / "lib" / "templates.ts"

CATEGORIES: Final[frozenset[str]] = frozenset({"network", "server", "dns", "ai", "ops"})
ACTIVITIES: Final[frozenset[str]] = frozenset({"build", "troubleshoot", "security-response", "change", "routine", "drill"})
OUTPUTS: Final[frozenset[str]] = frozenset({"cli", "config", "markdown"})
FORMATS: Final[frozenset[str]] = frozenset({"toml", "yaml", "csv"})

# Normalized (category -> allowed sub-categories). Extend deliberately.
ALLOWED_SUBCATEGORIES: Final[dict[str, frozenset[str]]] = {
    "network": frozenset(
        {
            "Alaxala",
            "Allied Telesis",
            "Arista",
            "Aruba",
            "Cisco",
            "Dell",
            "DHCP",
            "Fortinet",
            "HPE Aruba",
            "IDS・IPS",
            "IPアドレス管理",
            "IPアドレス設計",
            "Juniper",
            "L1/L2リンク",
            "NEC",
            "NIC",
            "Palo Alto Networks",
            "SonicWall",
            "Ubiquiti",
            "VLAN",
            "YAMAHA",
            "ZTNAオーバーレイ",
            "iptables",
            "nftables",
            "オーバーレイVPN",
            "トラフィック分析",
            "トンネリング",
            "パケット解析",
            "ファイアウォール",
            "ブリッジ",
            "プロキシ / Web",
            "ポート確認",
            "ルーティング",
            "冗長化",
            "性能測定",
            "疎通・経路",
            "疎通確認",
            "監視",
            "遠隔起動",
        }
    ),
    "server": frozenset(
        {
            "AWS CLI",
            "AppArmor",
            "Docker",
            "EDR・フォレンジック",
            "IAM・SSO",
            "KVM/libvirt",
            "Podman",
            "SELinux",
            "SIEM・HIDS",
            "SSH",
            "Ubuntu / Debian",
            "VPN",
            "Webサーバ",
            "cron",
            "sudo",
            "systemd",
            "カーネル",
            "コンテナ",
            "シークレット管理",
            "ディスク管理",
            "データベース",
            "ネットワーク設定",
            "バックアップ",
            "パッケージ管理",
            "パッチ・脆弱性",
            "パーミッション",
            "ファイル共有",
            "ブート・起動",
            "プロキシ",
            "メール",
            "ユーザー管理",
            "リリース・デプロイ",
            "ログ保全",
            "ログ運用",
            "侵入対策",
            "名前解決",
            "時刻同期",
            "構成管理",
            "監視",
            "証明書",
            "認証",
            "負荷・性能",
            "負荷分散",
            "資産・状態管理",
            "資産管理",
            "運用ツール",
            "適合性監査",
        }
    ),
    "dns": frozenset(
        {
            "BIND",
            "BIND冗長化",
            "DNSSEC",
            "DNS切り分け",
            "DNS切替",
            "PowerDNS",
            "Unbound",
            "dnsmasq",
            "レコード管理",
            "動的更新",
            "暗号化DNS",
            "監視",
        }
    ),
    "ai": frozenset(
        {
            "APIゲートウェイ",
            "GPUクラスタ",
            "GPUコンテナ",
            "GPU基盤",
            "GPU監視",
            "MLOps",
            "NVIDIA DGX",
            "step-ca / Caddy",
            "エージェント基盤",
            "クラウドAI",
            "セキュリティ・ガバナンス",
            "データ基盤",
            "ベクトルDB",
            "モデル管理",
            "監視・可観測性",
            "推論サーバ",
        }
    ),
    "ops": frozenset(
        {
            "キャパシティ",
            "ファシリティ・電源",
            "ポリシー統制",
            "ログ集約",
            "報告・コミュニケーション",
            "変更・メンテナンス進行",
            "監視・アラート",
            "証跡保全",
        }
    ),
}

# One "{ id: \"...\" }" opener per META entry; used to detect regex under-matching.
_ENTRY_OPENER = re.compile(r'\{ id: "')
_ENTRY_RE = re.compile(
    r'\{ id: "(?P<id>[^"]+)",.*?category: "(?P<category>[^"]+)", '
    r'subCategory: "(?P<subCategory>[^"]+)", format: "(?P<format>[^"]+)", '
    r'output: "(?P<output>[^"]+)"(?:, activity: "(?P<activity>[^"]+)")?'
)


def _entries() -> list[dict[str, str]]:
    text = TEMPLATES_TS.read_text(encoding="utf-8")
    return [m.groupdict() for m in _ENTRY_RE.finditer(text)]


@UNIT
def test_registry_parses() -> None:
    text = TEMPLATES_TS.read_text(encoding="utf-8")
    total = len(_ENTRY_OPENER.findall(text))
    entries = _entries()
    assert entries, "no template entries parsed from the registry"
    assert len(entries) == total, (
        f"regex parsed {len(entries)} of {total} META entries -- a template line likely drifted from the expected field order"
    )


@UNIT
def test_taxonomy_invariants() -> None:
    errors: list[str] = []
    for e in _entries():
        tid = e["id"]
        if e["category"] not in CATEGORIES:
            errors.append(f"{tid}: bad category {e['category']!r}")
        if e["format"] not in FORMATS:
            errors.append(f"{tid}: bad format {e['format']!r}")
        if e["output"] not in OUTPUTS:
            errors.append(f"{tid}: bad output {e['output']!r}")
        activity = e.get("activity")
        if activity is not None and activity not in ACTIVITIES:
            errors.append(f"{tid}: bad activity {activity!r}")
        allowed = ALLOWED_SUBCATEGORIES.get(e["category"], frozenset())
        if e["subCategory"] not in allowed:
            errors.append(
                f"{tid}: subCategory {e['subCategory']!r} not in the allow-list for "
                f"category {e['category']!r} (extend ALLOWED_SUBCATEGORIES deliberately)"
            )
    assert not errors, "taxonomy drift detected:\n" + "\n".join(errors)
