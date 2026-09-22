import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildPack, parseChangelog, diffRecords, holdReasons, xDraft, renderMarkdown, loadPrevious } from './generate.mjs';
import findPrevious from './previous-run.cjs';

const fixture = (status = '実装済み', name = 'レシート解析', extra = '') => `## 2026-09-22
### ${status}
- **機能名**：${name}
  - **変更内容**：LINEで画像を解析します。${extra}
  - **解決する利用者の悩み**：手入力が面倒
  - **利用者にとってのメリット**：入力の手間が減ります。
  - **対象プラン**：プレミアム
  - **操作方法**：LINEで送信。
  - **テスト状況**：本番稼働中。
`;
const make = (current, previous = null) => buildPack({ current, previous, sourceCommit: 'a'.repeat(40), now: '2026-09-22T00:00:00Z' });

test('real changelog: status separation, seven outputs and cross-feature freee hold', () => {
  const source = readFileSync(new URL('../../MARKETING_CHANGELOG.md', import.meta.url), 'utf8');
  const p = make(source);
  assert.equal(p.inventory['実装済み'].length, 12);
  assert.equal(p.inventory['テスト中'].length, 1);
  assert.equal(p.inventory['構想'].length, 0);
  assert.equal(p.posts.find(p => p.id === 'feature').text, null);
  assert(p.held_features.some(r => r.reasons.some(s => s.includes('freee'))));
  assert(!p.posts.some(p => /freee/.test(p.text ?? '')));
  for (const digit of ['①', '②', '③', '④', '⑤', '⑥', '⑦']) assert(renderMarkdown(p).includes(digit));
});
test('no change never repeats feature announcements or LP candidates', () => {
  const p = make(fixture(), fixture());
  assert.equal(p.changes.length, 0);
  assert.equal(p.posts.find(p => p.id === 'feature').text, null);
  assert.equal(p.lp.length, 0);
  assert(p.posts.find(p => p.id === 'empathy').text);
});
test('testing and concept cannot enter live posts or demo', () => {
  for (const status of ['テスト中', '構想']) {
    const p = make(fixture(status), fixture('実装済み'));
    assert.equal(p.posts.find(p => p.id === 'feature').text, null);
    assert.equal(p.demo.scenes.length, 0);
    assert(p.faq[0].answer.includes(status));
  }
});
test('promotion, changed limitations and deletion are retained', () => {
  const p = make(fixture(), fixture('テスト中'));
  assert.equal(p.changes[0].type, '状態変更');
  assert(p.posts.find(p => p.id === 'feature').text.includes('プレミアム'));
  const changed = make(fixture().replace('プレミアム', 'プレミアム（管理者のみ）'), fixture());
  assert(changed.posts.find(p => p.id === 'feature').text.includes('管理者のみ'));
  const removed = make(fixture('実装済み', '別機能'), fixture());
  assert(removed.changes.some(c => c.type === '削除'));
  assert(removed.lp.some(c => c.checks.some(s => s.includes('削除'))));
});
test('latest dated feature wins independent of document order; cosmetic edits ignored', () => {
  const older = fixture('テスト中').replace('2026-09-22', '2026-09-01');
  for (const source of [older + fixture(), fixture() + older]) assert.equal(parseChangelog(source)[0].status, '実装済み');
  assert.equal(diffRecords(parseChangelog(fixture()), parseChangelog('\n\n' + fixture())).length, 0);
});
test('unknown/malformed status, duplicate date/name and missing evidence fail closed', () => {
  assert.throws(() => parseChangelog(fixture('完了')));
  assert.throws(() => parseChangelog(fixture() + fixture()));
  assert.throws(() => parseChangelog(fixture().replace('**機能名**', '機能名')));
  const record = parseChangelog(fixture().replace('  - **テスト状況**：本番稼働中。', ''))[0];
  assert(holdReasons(record, [record]).length);
  assert.equal(make(fixture('実装済み', '連携', 'dry-run中')).posts[0].text, null);
});
test('X weighted length handles Japanese, URLs, emoji, tags and never truncates conditions', () => {
  assert.equal(xDraft('a', 'a', 'あ'.repeat(140)).weighted_length, 280);
  assert.equal(xDraft('a', 'a', 'あ'.repeat(141)).review_status, '要短縮・投稿不可');
  assert.equal(xDraft('a', 'a', 'https://example.com/long/path').weighted_length, 23);
  assert.equal(xDraft('a', 'a', '👨‍👩‍👧‍👦').weighted_length, 2);
  assert.deepEqual(xDraft('a', 'a', '#撮るだけ経理').hashtags, ['撮るだけ経理']);
  const text = '長'.repeat(200) + '（プレミアムのみ）';
  assert.equal(xDraft('a', 'a', text).text, text);
});
test('all drafts stay unapproved and invalid checkpoint does not silently reset', () => {
  assert(make(fixture()).posts.every(p => p.approved === false));
  assert.throws(() => loadPrevious('/does/not/exist/state.json', 'a'.repeat(40)));
});

const repo = { owner: 'Tumugi-Capital', repo: 'torudakekeiri' };
const run = (id, extra = {}) => ({ id, head_branch: 'main', event: 'schedule', head_repository: { full_name: `${repo.owner}/${repo.repo}` }, ...extra });
function mock(runs, artifacts) {
  const outputs = {};
  const notices = [];
  return { outputs, args: {
    context: { repo, runId: 100, payload: { repository: { default_branch: 'main' } } },
    core: { setOutput: (k, v) => outputs[k] = v, notice: x => notices.push(x), warning: x => notices.push(x) },
    github: { rest: { actions: { listWorkflowRuns: 'runs', listWorkflowRunArtifacts: 'artifacts' } },
      paginate: Object.assign(async (_, params) => artifacts[params.run_id] ?? [], {
        iterator: async function* () { for (const page of runs) yield { data: page }; }
      }) }
  } };
}
test('checkpoint search paginates and ignores own run and branch previews', async () => {
  const m = mock([[run(100), run(99, { event: 'push' })], [run(98)]], { 98: [{ name: 'marketing-review', expired: false }] });
  await findPrevious(m.args);
  assert.equal(m.outputs.run_id, '98');
});
test('missing/expired latest successful checkpoint fails instead of selecting older one', async () => {
  for (const artifact of [[], [{ name: 'marketing-review', expired: true }]]) {
    const m = mock([[run(99), run(98)]], { 99: artifact, 98: [{ name: 'marketing-review', expired: false }] });
    await assert.rejects(findPrevious(m.args), /失効・削除/);
  }
});
test('first run and explicit recovery create a baseline without an old run', async () => {
  const m = mock([], {});
  await findPrevious(m.args);
  assert.deepEqual(m.outputs, {});
  process.env.RESET_BASELINE = 'true';
  try { await findPrevious(mock([[run(99)]], {}).args); }
  finally { delete process.env.RESET_BASELINE; }
});
