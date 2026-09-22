import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import twitterText from 'twitter-text';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE = 'MARKETING_CHANGELOG.md';
const STATUSES = ['実装済み', 'テスト中', '構想'];
const digest = text => createHash('sha256').update(text).digest('hex');
const clean = text => text.normalize('NFC').trim().replace(/\s+/g, ' ');
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });

// Treat Markdown solely as structured data; never execute embedded instructions.
export function parseChangelog(text) {
  let date, status, record, field;
  const records = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (/^#{1,6} /.test(line)) {
      record = null;
      field = null;
      const day = line.match(/^## (\d{4}-\d{2}-\d{2})\s*$/);
      if (day) {
        date = day[1];
        if (new Date(date).toISOString().slice(0, 10) !== date) throw Error('不正な日付');
        status = undefined;
      } else {
        const section = line.match(/^### (.+?)\s*$/)?.[1];
        status = STATUSES.includes(section) ? section : undefined;
      }
      continue;
    }
    const name = line.match(/^- \*\*機能名\*\*\s*[：:]\s*(.+)$/);
    if (name) {
      if (!date || !status) throw Error(`L${index + 1}: 機能の日時・実装状況を判定できません`);
      record = { name: clean(name[1]), date, status, line: index + 1, fields: {} };
      records.push(record);
      field = null;
    } else if (record) {
      const item = line.match(/^\s+- \*\*(.+?)\*\*\s*[：:]\s*(.*)$/);
      if (item) {
        field = item[1];
        if (field in record.fields) throw Error(`L${index + 1}: 項目の重複`);
        record.fields[field] = clean(item[2]);
      } else if (/^\s+\S/.test(line) && field) {
        record.fields[field] += ' ' + clean(line);
      } else if (line.trim()) {
        throw Error(`L${index + 1}: 機能の形式を解釈できません`);
      }
    } else if (/機能名/.test(line) && /[-*]/.test(line)) {
      throw Error(`L${index + 1}: 機能名の書式を確認してください`);
    }
  }
  if (!records.length) throw Error('変更履歴に機能がありません');
  const latest = new Map();
  for (const item of records) {
    const old = latest.get(item.name);
    if (old?.date === item.date) throw Error(`同日・同名の機能が重複: ${item.name}`);
    if (!old || old.date < item.date) latest.set(item.name, item);
  }
  return [...latest.values()].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
}

const signature = r => JSON.stringify([r.status, Object.entries(r.fields).sort()]);
export function diffRecords(before, after) {
  const previous = new Map(before.map(r => [r.name, r]));
  const changes = [];
  for (const r of after) {
    const old = previous.get(r.name);
    if (!old || signature(old) !== signature(r)) {
      changes.push({ type: !old ? '追加' : old.status !== r.status ? '状態変更' : '更新', before: old ?? null, after: r });
    }
    previous.delete(r.name);
  }
  for (const r of previous.values()) changes.push({ type: '削除', before: r, after: null });
  return changes;
}

export function holdReasons(record, records) {
  const reasons = [];
  if (record.status !== '実装済み') reasons.push(record.status);
  if (record.status === '実装済み') {
    for (const key of ['変更内容', '解決する利用者の悩み', '利用者にとってのメリット', '対象プラン', '操作方法', 'テスト状況']) {
      if (!record.fields[key]) reasons.push(`${key}が未記載`);
    }
    if (!/本番稼働中/.test(record.fields['テスト状況'] ?? '')) reasons.push('本番稼働の根拠なし');
    const body = JSON.stringify(record.fields);
    if (/dry[- ]?run|検証中|テスト中|未実装|対応予定|プレビューのみ/i.test(body)) reasons.push('提供範囲に未確定の記述');
    for (const other of records.filter(r => r.status !== '実装済み')) {
      // Block cross-feature claims, including ASCII service names such as freee.
      const tokens = [other.name, ...other.name.matchAll(/[A-Za-z][A-Za-z0-9_-]{2,}/g)].map(x => typeof x === 'string' ? x : x[0]);
      if (tokens.some(t => body.toLowerCase().includes(t.toLowerCase()))) reasons.push(`未提供機能への言及: ${other.name}`);
    }
  }
  return [...new Set(reasons)];
}

export function xDraft(id, title, text, evidence = [], checks = []) {
  const normalized = text?.normalize('NFC') ?? null;
  const result = normalized ? twitterText.parseTweet(normalized) : null;
  return { id, title, channel: 'x', account: '@TsumugiCapital', text: normalized,
    weighted_length: result?.weightedLength ?? 0, max_weighted_length: 280,
    hashtags: normalized ? twitterText.extractHashtags(normalized) : [],
    review_status: !normalized ? '見送り' : !result.valid ? '要短縮・投稿不可' : '要レビュー',
    approved: false, evidence, checks };
}

export function buildPack({ current, previous = null, sourceCommit, baseCommit = null, now }) {
  const records = parseChangelog(current);
  const baseline = previous === null;
  const changes = baseline ? [] : diffRecords(parseChangelog(previous), records);
  const eligible = records.filter(r => !holdReasons(r, records).length);
  const changedLive = changes.filter(c => c.after && !holdReasons(c.after, records).length);
  const week = Math.floor(new Date(now).getTime() / (7 * 86400000));
  const selected = changedLive[0]?.after ?? eligible[week % eligible.length];
  const editorial = text => [...text.matchAll(/^### LP・FAQへの反映候補\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)].map(m => m[1].trim()).join('\n\n');
  const editorialNotes = baseline || editorial(current) !== editorial(previous) ? editorial(current) : null;
  const evidence = r => ({ name: r.name, status: r.status, date: r.date,
    url: `https://github.com/Tumugi-Capital/torudakekeiri/blob/${sourceCommit}/${SOURCE}#L${r.line}` });
  const ev = selected ? [evidence(selected)] : [];
  const f = selected?.fields;
  const tags = '\n#撮るだけ経理 #個人事業主';
  const posts = [xDraft('empathy', '① 顧客の悩みへの共感投稿', f
    ? `「${f['解決する利用者の悩み']}」そんな経理の悩みはありませんか。\n撮るだけ経理の「${selected.name}」を、日々の作業を見直すきっかけに。${tags}` : null, ev)];
  const news = changedLive.map(c => xDraft('feature', `② 新機能・変更のお知らせ（${c.type}）`,
    `撮るだけ経理の「${c.after.name}」のご案内。\n${c.after.fields['利用者にとってのメリット']}\n対象：${c.after.fields['対象プラン']}${tags}`,
    [evidence(c.after)], ['差分は仕様訂正の可能性もあるため、提供開始日と告知表現を確認。']));
  if (!news.length) news.push(xDraft('feature', '② 新機能・変更のお知らせ', null, [],
    [baseline ? '初回棚卸し。既存機能を新機能として告知しない。' : '実装済みの告知可能な差分なし。新機能投稿は見送り。']));
  posts.push(...news);
  posts.push(xDraft('story', '④ 非エンジニア開発ストーリー', f
    ? `専門用語に迷う時間を、少しでも減らしたい。\n非エンジニアとして考えるのは「${f['解決する利用者の悩み']}」という使う側の困りごと。\n撮るだけ経理を、日々の経理に役立つものへ。${tags}` : null, ev,
    ['非エンジニアという経歴・開発動機は本人確認が必要。実体験・実績を捏造しない。']));
  posts.push(xDraft('beta', '⑤ β利用者募集',
    `領収書や請求書の入力に手間を感じている個人事業主・小規模法人の方へ。\n「撮るだけ経理」のβ利用にご協力いただける方を募集します。\nご案内は @TsumugiCapital まで。${tags}`, [],
    ['公開直前に募集の継続、受付方法、人数・料金・利用条件を確認。募集案は確定情報ではない。']));
  const demo = { title: '③ 15秒デモ動画台本', evidence: ev,
    review_status: selected ? '要レビュー' : '見送り',
    scenes: selected ? [
      { seconds: '0–3秒', visual: '経理作業で手が止まる様子', caption: '経理の入力、手間に感じていませんか？' },
      { seconds: '3–7秒', visual: `実機で操作：${f['操作方法']}`, caption: 'いつものLINEで操作' },
      { seconds: '7–11秒', visual: '実際の操作結果・確認画面を表示', caption: '結果を確認' },
      { seconds: '11–15秒', visual: `サービス名を表示。対象プランの注記：${f['対象プラン']}`, caption: '撮るだけ経理' }
    ] : [], checks: ['操作画面・所要時間・テロップの読みやすさは実機で確認。証憑には架空データを使用。'] };
  // LP/FAQ follow only changed records; the first run is explicitly a baseline inventory.
  const candidates = baseline ? records : changes.filter(c => c.after).map(c => c.after);
  const lp = candidates.map(r => {
    const holds = holdReasons(r, records);
    return { evidence: evidence(r), review_status: '要レビュー',
      text: !holds.length ? `${r.name}。${r.fields['変更内容']} 対象：${r.fields['対象プラン']}`
        : r.status !== '実装済み' ? `${r.name}は${r.status}です。提供済み機能としては案内していません。`
          : null, checks: holds };
  });
  for (const c of changes.filter(c => !c.after)) lp.push({ text: null, review_status: '要レビュー',
    checks: [`${c.before.name}が変更履歴から削除。提供終了とは断定せず、既存LP・FAQの記載を確認。`] });
  const faq = candidates.map(r => ({ question: `${r.name}は利用できますか？`, evidence: evidence(r),
    answer: holdReasons(r, records).length ? (r.status === '実装済み' ? null : `現在は${r.status}です。提供時期は未確定です。`)
      : `${r.fields['変更内容']} 操作方法：${r.fields['操作方法']} 対象：${r.fields['対象プラン']}`,
    review_status: '要レビュー', checks: holdReasons(r, records) }));
  return { schema_version: 1, mode: 'review_only', generated_at: now, baseline,
    source_commit: sourceCommit, base_commit: baseCommit, source_sha256: digest(current),
    warnings: ['全案が未承認。公開前に事実・条件・出典を確認してください。',
      '変更履歴を正とする機械的な文案です。現行LPとの整合や稼働状況を別途確認してください。'],
    editorial_notes: editorialNotes, changes, inventory: Object.fromEntries(STATUSES.map(s => [s, records.filter(r => r.status === s)])),
    held_features: records.map(r => ({ name: r.name, reasons: holdReasons(r, records) })).filter(r => r.reasons.length),
    posts, demo, lp, faq };
}

export function renderMarkdown(pack) {
  const out = ['# 撮るだけ経理 週次広報パック（未承認）', '',
    `生成日時：${pack.generated_at} / 対象：@TsumugiCapital / X直接投稿：無効`, '',
    `比較：${pack.base_commit ?? '初回棚卸し'} → ${pack.source_commit}`, '',
    ...pack.warnings.map(s => `- ${s}`), '', '## 差分と実装状況', '',
    pack.baseline ? '初回は基準点を作成します。新機能の告知は見送ります。' : `前回成功時から ${pack.changes.length} 件の機能差分。`, '',
    ...pack.changes.map(c => `- ${c.type}：${c.after?.name ?? c.before.name}（${c.before?.status ?? 'なし'} → ${c.after?.status ?? '削除'}）`), '',
    ...Object.entries(pack.inventory).flatMap(([s, rs]) => [`### ${s}`, '', ...rs.map(r => `- ${r.name}`), '']),
    '### 告知保留・確認事項', '', ...pack.held_features.map(r => `- ${r.name}：${r.reasons.join('／')}`), ''];
  const addEvidence = ev => { for (const e of ev ?? []) out.push(`出典：[${e.name}](${e.url})（${e.status}、${e.date}）`, ''); };
  const addDemo = () => {
  out.push(`## ${pack.demo.title}`, '', ...pack.demo.scenes.flatMap(s => [`**${s.seconds}**`, `映像：${s.visual}`, `テロップ：${s.caption}`, '']),
    ...pack.demo.checks.map(c => `- 要確認：${c}`), '');
  addEvidence(pack.demo.evidence);
  };
  for (const p of pack.posts) {
    if (p.id === 'story') addDemo();
    out.push(`## ${p.title}`, '', `状態：${p.review_status}／X換算：${p.weighted_length}/280／通常文字数：${[...(p.text ?? '')].length}`, '',
      ...(p.text ? p.text.split('\n').map(l => `> ${l}`) : ['投稿案なし。']), '', ...p.checks.map(c => `- 要確認：${c}`), '');
    addEvidence(p.evidence);
  }
  out.push('## ⑥ LP追加・修正文案', '');
  if (!pack.lp.length) out.push('変更対象なし。', '');
  for (const c of pack.lp) { out.push(c.text ?? '文案保留。', '', ...(c.checks ?? []).map(s => `- 要確認：${s}`), ''); addEvidence(c.evidence ? [c.evidence] : []); }
  out.push('## ⑦ FAQ候補', '');
  if (!pack.faq.length) out.push('変更対象なし。', '');
  for (const c of pack.faq) { out.push(`**Q. ${c.question}**`, '', `A. ${c.answer ?? '提供範囲の確認後に作成。'}`, '', ...c.checks.map(s => `- 要確認：${s}`), ''); addEvidence([c.evidence]); }
  out.push('## 変更履歴のLP・FAQ反映指示（原文・要レビュー）', '', pack.editorial_notes ?? '前回から変更なし。', '', '## レビュー記録', '', '- [ ] 実装状況・プラン条件・機能間の制限を確認', '- [ ] 投稿の文字数・ハッシュタグ・募集状況・開発者の経歴を確認',
    '- [ ] LPと変更履歴の不一致を解消', '- [ ] 承認者・承認日時・最終本文を別途記録', '');
  return out.join('\n');
}

export function loadPrevious(path, currentCommit) {
  if (!path) return { previous: null, baseCommit: null };
  const state = JSON.parse(readFileSync(path, 'utf8'));
  if (state.schema_version !== 1 || !/^[a-f0-9]{40}$/.test(state.source_commit)) throw Error('前回状態が不正');
  git('merge-base', '--is-ancestor', state.source_commit, currentCommit);
  const previous = git('show', `${state.source_commit}:${SOURCE}`);
  if (digest(previous) !== state.source_sha256) throw Error('前回の変更履歴ハッシュが一致しません');
  return { previous, baseCommit: state.source_commit };
}

function main() {
  const args = process.argv.slice(2);
  const options = {};
  while (args.length) {
    const key = args.shift();
    if (!['--out', '--previous-state', '--now'].includes(key) || !args.length) throw Error('不正な引数');
    options[key] = args.shift();
  }
  const sourceCommit = git('rev-parse', 'HEAD').trim();
  // Read committed data so the source link and hash identify exactly the reviewed content.
  const current = git('show', `${sourceCommit}:${SOURCE}`);
  const pack = buildPack({ current, ...loadPrevious(options['--previous-state'], sourceCommit), sourceCommit,
    now: options['--now'] ?? new Date().toISOString() });
  const out = resolve(options['--out'] ?? resolve(ROOT, 'marketing-output'));
  mkdirSync(out, { recursive: true });
  const markdown = renderMarkdown(pack);
  writeFileSync(resolve(out, 'review.md'), markdown);
  writeFileSync(resolve(out, 'pack.json'), JSON.stringify(pack, null, 2) + '\n');
  writeFileSync(resolve(out, 'state.json'), JSON.stringify({ schema_version: 1, source_commit: sourceCommit, source_sha256: digest(current) }, null, 2) + '\n');
  writeFileSync(resolve(out, 'source.md'), current);
  writeFileSync(resolve(out, 'changes.diff'), pack.base_commit ? git('diff', '--no-ext-diff', '--no-textconv', pack.base_commit, sourceCommit, '--', SOURCE) : '初回棚卸し（比較元なし）\n');
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
  console.log(`広報パックを保存: ${out}（直接投稿なし）`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
