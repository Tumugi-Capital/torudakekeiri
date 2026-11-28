"""解説ページ（guide-*.html）を作り直す。文章を直すときはこのファイルを直して実行する。

    python3 tools/guides/build_guides.py .

ページの見た目はヘルプセンターと同じ（assets/tailwind.css・assets/subpage.css）。
構造化データ（Article・FAQPage・BreadcrumbList）も一緒に作る。
"""
import json, pathlib, sys
ROOT = pathlib.Path(sys.argv[1])
SITE = "https://tumugi-capital.github.io/torudakekeiri/"
LINE = "https://lin.ee/8zc0VBd"

HEAD = """<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="color-scheme" content="only light" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} | 撮るだけ経理</title>
  <link rel="canonical" href="{url}" />
  <meta name="description" content="{desc}" />
  <meta property="og:title" content="{title} | 撮るだけ経理" />
  <meta property="og:description" content="{desc}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="{url}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta property="og:image" content="https://tumugi-capital.github.io/torudakekeiri/og-image.png?v=2" />
  <meta name="twitter:image" content="https://tumugi-capital.github.io/torudakekeiri/og-image.png?v=2" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="./assets/tailwind.css" />
  <style>
    body {{
      font-family: 'Noto Sans JP', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', sans-serif;
      -webkit-font-smoothing: antialiased; line-break: strict; word-break: normal; overflow-wrap: anywhere;
    }}
    h1, h2 {{ font-family: 'Noto Serif JP', 'Hiragino Mincho ProN', 'Yu Mincho', serif; letter-spacing: 0.04em; }}
    p, li, h1, h2, h3 {{ text-wrap: pretty; }}
    .dot-bg {{ background-image: radial-gradient(rgba(63, 98, 82, 0.14) 1.2px, transparent 1.2px); background-size: 18px 18px; }}
    .cmd {{ display: inline-block; border-radius: 9999px; background: #eee9df; padding: 1px 10px; font-weight: 700; color: #263f35; font-size: 0.85em; }}
    table.guide-table {{ width: 100%; border-collapse: collapse; font-size: 0.875rem; }}
    table.guide-table th, table.guide-table td {{ border-bottom: 1px solid #efe6d6; padding: 8px 6px; text-align: left; vertical-align: top; }}
    table.guide-table th {{ color: #1f3a2f; white-space: nowrap; }}
  </style>
  <link rel="stylesheet" href="assets/subpage.css" />
  <script type="application/ld+json">
{jsonld}
  </script>
</head>
<body class="bg-brand-50 text-stone-700 leading-relaxed tracking-wide">

  <nav class="sticky top-0 z-50 border-b border-brand-100 bg-white/95 px-4 py-3 backdrop-blur">
    <div class="mx-auto flex max-w-2xl items-center justify-between gap-3">
      <a href="./" class="flex items-center gap-2 text-sm font-extrabold text-stone-800"><i class="brand-mark" aria-hidden="true">⌁</i>撮るだけ経理</a>
      <a href="./" class="rounded-full bg-brand-100 px-4 py-1.5 text-xs font-bold text-brand-700 transition hover:bg-brand-200">← サービス紹介へ戻る</a>
    </div>
  </nav>

  <header class="relative overflow-hidden page-hero px-4 pb-10 pt-10 text-center shadow-sm dot-bg">
    <div class="relative mx-auto max-w-2xl">
      <span class="page-eyebrow">GUIDE</span>
      <h1 class="text-2xl font-extrabold text-stone-800 sm:text-3xl">{title}</h1>
      <p class="mt-3 text-sm leading-7 text-stone-600">{lead}</p>
    </div>
  </header>

  <main class="mx-auto max-w-2xl px-4 pb-16 pt-4">
{body}
    <section class="pt-10">
      <div class="rounded-3xl border border-brand-100 bg-white p-5 text-sm leading-8 text-stone-600 shadow-sm">
        <h2 class="text-lg font-extrabold text-stone-800">撮るだけ経理を試してみる</h2>
        <p class="mt-3">撮るだけ経理は、LINEにレシート・領収書の写真やPDFの請求書を送るだけで、AIが仕訳の候補を作り、確認したうえでMoney Forward クラウド会計・freee会計へ記帳できる経理アシスタントです。月20回まで無料で試せます（クレジットカード登録不要）。</p>
        <p class="mt-3"><a href="{line}" class="font-bold text-brand-600 underline">LINEで友だち追加して試す</a>　／　<a href="./help.html" class="font-bold text-brand-600 underline">ヘルプセンター</a>　／　<a href="./#pricing" class="font-bold text-brand-600 underline">料金プラン</a></p>
      </div>
      <p class="mt-6 text-xs leading-6 text-stone-500">この記事は一般的な考え方をまとめたもので、税務の助言ではありません。実際の科目・処理は、事業の内容や会計方針によって変わります。判断に迷うときは、税理士等の専門家にご確認ください。</p>
      <p class="mt-3 text-xs leading-6 text-stone-500">ほかの解説：{others}</p>
    </section>
  </main>
</body>
</html>
"""

def section(h2, inner):
    return f"""    <section class="pt-10">
      <h2 class="text-lg font-extrabold text-stone-800">{h2}</h2>
      <div class="mt-4 rounded-3xl border border-brand-100 bg-white p-5 text-sm leading-8 text-stone-600 shadow-sm">
{inner}
      </div>
    </section>
"""

def ul(items): return '        <ul class="list-disc space-y-1 pl-5">\n' + "".join(f"          <li>{i}</li>\n" for i in items) + "        </ul>"
def ol(items): return '        <ol class="list-decimal space-y-2 pl-5">\n' + "".join(f"          <li>{i}</li>\n" for i in items) + "        </ol>"
MT3 = ' class="mt-3"'
def p(t, first=False): return f'        <p{"" if first else MT3}>{t}</p>'
def stack(rows):
    """スマホで読みやすいよう、表ではなく「見出し＋箇条書き」で並べる（各行の2列目は「／」区切り）。"""
    out = []
    for i, (name, items) in enumerate(rows):
        cls = "font-bold text-stone-800" + ("" if i == 0 else " mt-6")
        out.append(f'        <h3 class="{cls}">{name}</h3>')
        out.append(ul([x.strip() for x in items.split("／")]))
    return "\n".join(out)


def table(head, rows):
    h = "".join(f"<th>{c}</th>" for c in head)
    r = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in row) + "</tr>" for row in rows)
    return f'        <table class="guide-table"><thead><tr>{h}</tr></thead><tbody>{r}</tbody></table>'

GUIDES = []

GUIDES.append(dict(
    file="guide-line-receipt.html",
    title="個人事業主がLINEでレシートを整理する方法",
    desc="個人事業主・フリーランスが、たまりがちなレシート・領収書をLINEで整理し、会計ソフトへ記帳するまでの流れと、月末に困らないためのコツをまとめました。",
    lead="レシートは「その日のうちに撮って送る」だけ。<br />月末にまとめて入力する手間を減らす方法をまとめました。",
    faq=[
        ("レシートを整理するいちばん簡単な方法は？", "受け取ったその日のうちにスマホで撮り、記録に残すことです。撮るだけ経理なら、LINEに写真を送るだけで、AIが日付・金額・支払先・勘定科目・税区分を読み取って仕訳の候補にします。"),
        ("専用のアプリは必要ですか？", "撮るだけ経理は、いつものLINEで使えます。アプリのインストールは不要で、友だち追加するだけで始められます。"),
        ("会計ソフトへの入力も自動になりますか？", "PREMIUMプランでは、読み取った内容を確認したうえで、Money Forward クラウド会計・freee会計へ記帳できます。弥生会計向けにはCSVを出力できます。AIが勝手に記帳することはありません。"),
    ],
    sections=[
        ("レシートがたまる原因", "\n".join([
            p("個人事業主・フリーランスの経理で多い悩みは、レシートが財布や引き出しにたまり、月末や確定申告の前にまとめて入力することになる、というものです。時間がたつほど、次のようなことが起きやすくなります。", True),
            ul(["何の支払いだったか（用途・相手）を思い出せない", "感熱紙の文字が薄くなって読めない", "入力の量が多く、本業の時間が削られる", "同じレシートを二重に入力してしまう"]),
        ])),
        ("LINEで整理する流れ", "\n".join([
            p("撮るだけ経理を使うと、次の流れでレシートを整理できます。", True),
            ol([
                f'<a href="{LINE}" class="font-bold text-brand-600 underline">LINEで友だち追加</a>する（アプリのインストールは不要）。',
                "レシートを受け取ったら、その場でスマホの標準カメラで撮る。",
                "LINEのメニューの「写真を送る」から送る（何枚かまとめて選べます）。PDFの請求書は、ファイルのまま送れます。",
                "AIが日付・金額・支払先・勘定科目・税区分を読み取り、確認のカードを返します。違うところは「科目を変更」などのボタンで直します。",
                "支払方法（現金・事業用カード・個人カードなど）を選び、Money Forward・freee へ記帳します（PREMIUM）。弥生会計を使っている方は、月ごとにCSVを出力して取り込みます。",
            ]),
        ])),
        ("月末に困らないためのコツ", "\n".join([
            ul([
                "<strong>その日のうちに送る：</strong>用途を覚えているうちなら、科目の判断も正確になります。",
                "<strong>用途はメモで添える：</strong>「メモ: A社との打ち合わせ」のように先に送っておくと、科目の判断に生かせます。",
                "<strong>飲食は相手と人数を残す：</strong>会議費・交際費の判断の根拠になります。撮るだけ経理では、LINEで送った参加者を摘要に残せます。",
                "<strong>私用の買い物は外す：</strong>「経費にしない」で除外しておけば、帳簿に混ざりません。",
                "<strong>月末に残りを確認する：</strong>LINEで<span class=\"cmd\">未処理</span>と送ると、まだ記帳していないレシートを確認できます。",
            ]),
        ])),
        ("紙のレシートの保管について", "\n".join([
            p("写真で記録しても、紙の原本をいつ捨ててよいかは、電子帳簿保存法の要件（スキャナ保存の要件など）によって変わります。原本の扱いに迷うときは、ヘルプセンターの説明や、税理士等の専門家の案内を確認してください。", True),
        ])),
    ],
))

GUIDES.append(dict(
    file="guide-industry-accounts.html",
    title="業種別・よくある経費と勘定科目の考え方",
    desc="飲食店・小売・建設・美容・IT・運送・士業・医療介護・農業・教室など、個人事業主の業種ごとに、よくある経費と勘定科目の考え方をまとめました。飲食店の食材は仕入高？といった疑問にも答えます。",
    lead="同じような買い物でも、業種によって合う科目は変わります。<br />業種ごとのよくある経費と、科目の考え方の目安です。",
    faq=[
        ("飲食店が買った食材は、どの勘定科目ですか？", "料理の材料として使う肉・魚・野菜・調味料などは「仕入高」にするのが一般的です。社内の差し入れなら福利厚生費、取引先への贈答なら交際費、私用なら経費にしません。"),
        ("ネットショップの梱包材や送料は、どの勘定科目ですか？", "段ボール・緩衝材などの梱包材や、商品を発送した送料は「荷造運賃」にするのが一般的です。"),
        ("運送業のガソリン代は、どの勘定科目ですか？", "仕事で使う車のガソリン・軽油・オイル交換・洗車・車検などは「車両費」、高速道路の料金・駐車場代は「旅費交通費」にするのが一般的です。"),
        ("農業の種や肥料は、どの勘定科目ですか？", "青色申告決算書（農業所得用）では、種・苗は「種苗費」、肥料は「肥料費」、農薬は「農薬衛生費」、家畜のえさは「飼料費」などの科目があります。"),
    ],
    sections=[
        ("業種で科目が変わる理由", p("たとえば「ホームセンターで木材を買った」場合、建設業の方なら工事に使う材料（仕入高）ですが、ほかの業種の方なら備品や消耗品かもしれません。勘定科目は、何を買ったかだけでなく、事業の中で何に使うかで決まります。下の一覧は、業種ごとによくある経費と科目の目安です。", True)),
        ("業種別の早見表", stack([
            ["飲食店", "料理の材料（肉・魚・野菜・調味料）→ 仕入高／割り箸・洗剤・ラップ → 消耗品費／ガス・電気・水道 → 水道光熱費／グルメサイトの掲載料 → 広告宣伝費"],
            ["小売・ネットショップ", "販売する商品 → 仕入高／梱包材・発送の送料 → 荷造運賃／販売手数料・決済手数料 → 支払手数料／広告 → 広告宣伝費"],
            ["建設・工事・職人", "工事に使う資材・部材・塗料 → 仕入高／10万円未満の工具・作業着 → 消耗品費／仕事の車のガソリン → 車両費／資材置き場の賃料 → 地代家賃"],
            ["美容・理容・サロン", "施術に使うカラー剤・パーマ液・ネイル材料 → 仕入高／タオル・清掃用品 → 消耗品費／店舗の賃料 → 地代家賃／掲載サイトの料金 → 広告宣伝費"],
            ["IT・Web・デザイン・ライター", "クラウド・ソフトの月額 → 通信費または支払手数料／仕事の本・資料 → 新聞図書費／コワーキングの利用料 → 地代家賃／10万円未満の周辺機器 → 消耗品費"],
            ["運送・配達・ドライバー", "ガソリン・オイル・洗車・車検 → 車両費／高速代・駐車場 → 旅費交通費／梱包材 → 荷造運賃"],
            ["士業・コンサル・講師", "専門書・法令集 → 新聞図書費／セミナー参加費 → 研修費／打ち合わせの飲食 → 会議費／貸会議室 → 会議費または地代家賃"],
            ["医療・介護", "手袋・マスク・消毒液など → 消耗品費／提供・販売する医薬品や介護用品 → 仕入高／施設の賃料 → 地代家賃／電気・水道 → 水道光熱費"],
            ["農業", "種・苗 → 種苗費／肥料 → 肥料費／農薬 → 農薬衛生費／家畜のえさ → 飼料費／10万円未満の農具 → 消耗品費／出荷の段ボール・送料 → 荷造運賃"],
            ["教室・スクール", "生徒に配る教材 → 仕入高／教室の文房具・備品 → 消耗品費／教室の賃料 → 地代家賃／生徒募集のチラシ → 広告宣伝費"],
        ])),
        ("迷いやすいポイント", ul([
            "<strong>10万円以上の物：</strong>工具・パソコンなどは、金額によって消耗品費ではなく資産（減価償却）になることがあります。",
            "<strong>私用との共用：</strong>自宅兼事務所の家賃・電気代などは、事業で使う割合だけを経費にします（家事按分）。",
            "<strong>食べ物：</strong>同じ食べ物でも、材料なら仕入高、会議なら会議費、取引先との飲食なら交際費、社内なら福利厚生費と、使い道で変わります。",
            "<strong>会計ソフトの科目名：</strong>会計ソフトや事業所によって、科目の名前が少し違うことがあります（例：地代家賃と賃借料）。",
        ])),
        ("撮るだけ経理での使い方", "\n".join([
            p("撮るだけ経理では、はじめに業種（11業種）を選んでおくと、上のような業種ごとの考え方をAIの判断材料にします。業種と関係のない私用の買い物は、業種に寄せずに内容どおりに判断します。", True),
            p("業種を変えるときは、LINEで<span class=\"cmd\">業種</span>と送ってください。読み取った科目は、記帳の前に「科目を変更」でいつでも直せます。"),
        ])),
    ],
))

GUIDES.append(dict(
    file="guide-accounting-software.html",
    title="freee・Money Forward・弥生へレシートを取り込む方法",
    desc="レシート・領収書を freee会計・Money Forward クラウド会計・弥生会計へ取り込む方法を、撮るだけ経理（LINE）を使う手順で説明します。連携のしかた、記帳の流れ、弥生会計へのCSVの取り込みまでまとめました。",
    lead="LINEに送ったレシートを、お使いの会計ソフトへ。<br />freee・Money Forward・弥生それぞれの取り込み方です。",
    faq=[
        ("LINEからfreee会計に記帳できますか？", "撮るだけ経理のPREMIUMプランで、LINEで「freee連携」と送って連携すると、読み取ったレシートを確認したうえでfreee会計へ取引として登録できます。領収書の画像はファイルボックスへアップロードします。"),
        ("LINEからMoney Forward クラウド会計に記帳できますか？", "撮るだけ経理のPREMIUMプランで、LINEで「連携」と送って連携すると、読み取ったレシートを確認したうえでMoney Forward クラウド会計へ仕訳を登録できます。レシートの画像は証憑として仕訳に添付します。"),
        ("弥生会計にも取り込めますか？", "撮るだけ経理のPREMIUMプランで、LINEで「CSV出力」と送ると、その月の確定済みの仕訳を弥生会計の仕訳日記帳のインポート形式のCSVで出力できます。"),
    ],
    sections=[
        ("3つの会計ソフトの取り込み方の違い", stack([
            ["Money Forward クラウド会計", "連携して、仕訳を直接登録します／レシートの画像は、証憑として仕訳に添付します"],
            ["freee会計", "連携して、取引を直接登録します／レシートの画像は、ファイルボックスへアップロードします"],
            ["弥生会計", "月ごとにCSVを出力して、弥生会計で取り込みます／レシートの画像はCSVには含まれません"],
        ])),
        ("Money Forward クラウド会計の場合", ol([
            "LINEで<span class=\"cmd\">連携</span>と送り、表示されるボタンから Money Forward にログインして、連携を許可します。",
            "レシートの写真を送り、読み取り結果を確かめます。違うところはボタンで直します。",
            "支払方法を選び、「MFに記帳する」を押します。仕訳が登録され、レシートの画像が添付されます。",
            "間違えたときは、LINEで<span class=\"cmd\">取り消し</span>と送ると、直前の記帳を Money Forward から削除して未処理に戻せます。",
        ])),
        ("freee会計の場合", ol([
            "LINEで<span class=\"cmd\">freee連携</span>と送り、表示されるボタンから freee にログインして、連携を許可します。",
            "レシートの写真を送り、読み取り結果を確かめます。",
            "支払方法を選び、freee への登録ボタンを押します。取引が登録され、領収書の画像がファイルボックスにアップロードされます。",
        ])),
        ("弥生会計の場合", "\n".join([
            ol([
                "レシートの写真を送り、読み取り結果を確かめて確定します。",
                "LINEで<span class=\"cmd\">CSV出力</span>と送ると、その月の確定済みの仕訳のCSVが届きます。「CSV出力 2026-11」のように月を指定することもできます。",
                "弥生会計の仕訳日記帳のインポート機能で、そのCSVを取り込みます。",
            ]),
            p("取り込む前に、弥生会計に同じ名前の勘定科目・税区分があるかを確かめてください。"),
        ])),
        ("記帳の前に確認できるので安心", ul([
            "AIが勝手に記帳することはありません。必ず内容を確かめてから記帳します。",
            "同じレシートを二重に記帳しないよう確認をはさみます。記帳の途中で通信が途切れたときも、会計ソフトに記帳済みかを確かめてからお知らせします。",
            "8%と10%が混ざったレシートは、税率ごとに分けて記帳します。",
            "インボイスの登録番号は、LINEの画面に表示しません。",
        ])),
    ],
))

def jsonld(g):
    url = SITE + g["file"]
    return json.dumps({"@context": "https://schema.org", "@graph": [
        {"@type": "Article", "headline": g["title"], "description": g["desc"], "url": url, "inLanguage": "ja",
         "datePublished": "2026-11-28", "dateModified": "2026-11-28",
         "author": {"@type": "Organization", "name": "紬キャピタル合同会社"},
         "publisher": {"@id": SITE + "#organization"},
         "about": {"@id": SITE + "#app"}, "mainEntityOfPage": url},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in g["faq"]]},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "撮るだけ経理", "item": SITE},
            {"@type": "ListItem", "position": 2, "name": g["title"], "item": url}]},
    ]}, ensure_ascii=False, indent=1)

for g in GUIDES:
    body = "".join(section(h, inner) for h, inner in g["sections"])
    faq_inner = "\n".join(
        (f'        <h3 class="font-bold text-stone-800{"" if i == 0 else " mt-6"}">{q}</h3>\n' + p(a)) for i, (q, a) in enumerate(g["faq"]))
    body += section("よくある質問", faq_inner)
    others = "　／　".join(f'<a href="./{o["file"]}" class="font-bold text-brand-600 underline">{o["title"]}</a>' for o in GUIDES if o is not g)
    html = HEAD.format(title=g["title"], url=SITE + g["file"], desc=g["desc"], lead=g["lead"], jsonld=jsonld(g),
                       body=body, line=LINE, others=others)
    (ROOT / g["file"]).write_text(html, encoding="utf-8")
    print("wrote", g["file"])
