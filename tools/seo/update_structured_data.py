"""index.html の構造化データ（JSON-LD）を、ページの内容から作り直す。

AI検索（ChatGPT・Perplexity・Gemini・Google の AI による概要）や検索エンジンが、サービスの内容と
よくある質問を正しく読み取れるようにする。よくある質問はページの #faq から自動で集めるため、
FAQ を足したり直したりしたら、このスクリプトを実行し直す。

    python3 tools/seo/update_structured_data.py
"""
from __future__ import annotations

import html
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[2]
INDEX = ROOT / "index.html"
SITE = "https://tumugi-capital.github.io/torudakekeiri/"
LINE_ADD_URL = "https://lin.ee/8zc0VBd"

# AI がそのまま引用できる、サービスの定義（ページ上部の「撮るだけ経理とは」と同じ内容）。
DEFINITION = (
    "撮るだけ経理は、LINEにレシート・領収書の写真やPDFの請求書を送るだけで、AIが日付・金額・支払先・"
    "勘定科目・税区分を読み取って仕訳の候補にし、確認したうえでMoney Forward クラウド会計・freee会計へ"
    "記帳できる、個人事業主・小規模事業者向けの経理アシスタントです。弥生会計向けのCSV出力にも対応し、"
    "月20回まで無料で試せます。"
)

FEATURES = [
    "LINEに送ったレシート・領収書・PDF請求書をAIが読み取り、仕訳の候補を作成",
    "Money Forward クラウド会計・freee会計への記帳（PREMIUM）",
    "弥生会計の仕訳日記帳インポート形式のCSV出力（PREMIUM）",
    "8%と10%が混ざったレシートの税率ごとの内訳の読み取りと検算",
    "業種（11業種）に合わせた勘定科目の判断",
    "支払方法に応じた貸方科目（現金・事業用カード・個人カードの立替など）",
    "家事按分・外貨のレシート・複数枚のまとめて記帳・記帳の取り消し",
    "二重記帳の防止（通信が途切れたときも記帳済みかを確認）",
    "インボイス登録番号は画面に表示しない",
]

OFFERS = [
    ("FREE（月20回まで無料）", "0", None),
    ("ENTRY（月額）", "550", "MON"),
    ("ENTRY（年払い）", "5500", "ANN"),
    ("PREMIUM（月額）", "1100", "MON"),
    ("PREMIUM（年払い）", "11000", "ANN"),
]


def _text(fragment: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", fragment))).strip()


def faq_items(page: str) -> list[tuple[str, str]]:
    section = re.search(r'<section class="sec" id="faq">(.*?)</section>', page, re.S)
    if not section:
        raise SystemExit("index.html に #faq が見つかりません")
    pairs = re.findall(r"<details(?: open)?><summary>(.*?)</summary><p>(.*?)</p></details>", section.group(1), re.S)
    return [(_text(q), _text(a)) for q, a in pairs]


def build(page: str) -> dict:
    org_id = SITE + "#organization"
    offers = []
    for name, price, unit in OFFERS:
        offer = {"@type": "Offer", "name": name, "price": price, "priceCurrency": "JPY"}
        if unit:
            offer["priceSpecification"] = {
                "@type": "UnitPriceSpecification", "price": price, "priceCurrency": "JPY",
                "referenceQuantity": {"@type": "QuantitativeValue", "value": 1, "unitCode": unit},
            }
        offers.append(offer)
    return {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Organization",
                "@id": org_id,
                "name": "紬キャピタル合同会社",
                "url": "https://tumugi-capital.github.io/homepage/",
                "brand": {"@type": "Brand", "name": "撮るだけ経理"},
                "publishingPrinciples": SITE + "tokushoho.html",
            },
            {
                "@type": "WebSite",
                "@id": SITE + "#website",
                "name": "撮るだけ経理",
                "url": SITE,
                "inLanguage": "ja",
                "publisher": {"@id": org_id},
            },
            {
                "@type": "SoftwareApplication",
                "@id": SITE + "#app",
                "name": "撮るだけ経理",
                "alternateName": ["とるだけけいり", "撮るだけ経理（LINEの経理アシスタント）"],
                "applicationCategory": "BusinessApplication",
                "applicationSubCategory": "会計・経理（レシート読み取り・仕訳）",
                "operatingSystem": "LINE (iOS / Android / PC)",
                "url": SITE,
                "installUrl": LINE_ADD_URL,
                "description": DEFINITION,
                "featureList": FEATURES,
                "audience": {"@type": "BusinessAudience", "audienceType": "個人事業主・フリーランス・小規模事業者"},
                "inLanguage": "ja",
                "publisher": {"@id": org_id},
                "offers": offers,
            },
            {
                "@type": "FAQPage",
                "@id": SITE + "#faq",
                "mainEntity": [
                    {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
                    for q, a in faq_items(page)
                ],
            },
        ],
    }


def main() -> None:
    page = INDEX.read_text(encoding="utf-8")
    data = json.dumps(build(page), ensure_ascii=False, indent=1)
    new, n = re.subn(r'(<script type="application/ld\+json">\n).*?(\n</script>)',
                     lambda m: m.group(1) + data + m.group(2), page, count=1, flags=re.S)
    if n != 1:
        raise SystemExit("JSON-LD の場所が見つかりません")
    INDEX.write_text(new, encoding="utf-8")
    print(f"updated: FAQ {len(build(page)['@graph'][3]['mainEntity'])} 件")


if __name__ == "__main__":
    main()
