// Find only a completed, successful run of this workflow on the default branch.
// Never silently reset a known checkpoint when its artifact is missing/expired.
module.exports = async ({ github, context, core }) => {
  if (process.env.RESET_BASELINE === 'true') {
    core.warning('基準点を再作成します。今回は新機能告知を生成しません。');
    return;
  }
  const repo = context.repo;
  const branch = context.payload.repository.default_branch;
  for await (const page of github.paginate.iterator(github.rest.actions.listWorkflowRuns, {
    ...repo, workflow_id: 'marketing-weekly.yml', branch, status: 'success', per_page: 100
  })) {
    for (const run of page.data) {
      if (run.id === context.runId || run.head_branch !== branch || run.head_repository?.full_name !== `${repo.owner}/${repo.repo}` ||
          !['schedule', 'workflow_dispatch'].includes(run.event)) continue;
      const artifacts = await github.paginate(github.rest.actions.listWorkflowRunArtifacts, { ...repo, run_id: run.id, per_page: 100 });
      const artifact = artifacts.find(a => a.name === 'marketing-review');
      if (!artifact || artifact.expired) throw Error('前回成功時の成果物が失効・削除されています。運用手順の基準点復旧を実施してください。');
      core.setOutput('run_id', String(run.id));
      return;
    }
  }
  core.notice('初回実行として現状を棚卸しします。');
};
