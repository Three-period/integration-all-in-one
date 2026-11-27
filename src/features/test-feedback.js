/** Each return, repair and regression refers to the same project defect and exact Commit. */
import { App } from '../core/app.js';
import { esc } from '../core/dom.js';
import { project, state } from '../store/state.js';
import { bugBlank, ensureBugRecords } from '../store/bugs.js';
import {
  approvalRequests,
  createReviewModel,
  documentId,
  getDevReview,
} from '../store/lifecycle.js';
import { closeModal, openDrawer, openModal } from '../components/overlays.js';
import { showToast } from '../components/toast.js';
import { isTestKindEnabled } from '../domain/testing.js';
import { getReleaseGate } from './version-anchor.js';

const kinds = { smoke: '冒烟测试', single: '单板测试', long: '长运测试', system: '整机测试' };
const fields = { phenomenon: '问题现象', requirement: '整改要求', expected: '预期结果' };
const timestamp = () => new Date().toLocaleString('zh-CN', { hour12: false });

export function projectFeedback() {
  return (state.bugRecords || []).filter(
    (row) => row.projectId === state.projectId && row.testFeedback,
  );
}
export function repairsDue() {
  return projectFeedback().filter((row) => ['待整改', '待检视'].includes(row.status));
}
function button(action, label, attrs = {}) {
  const attributes = Object.entries(attrs)
    .map(([k, v]) => ' data-' + k + '="' + esc(v) + '"')
    .join('');
  return (
    '<button type="button" class="btn" data-feedback="' +
    action +
    '"' +
    attributes +
    '>' +
    esc(label) +
    '</button>'
  );
}
function line(label, value) {
  return '<p><strong>' + esc(label) + '</strong>　' + esc(value || '—') + '</p>';
}
function defectRow(row) {
  return (
    '<div class="v5-row"><span><b>' +
    esc(row.name) +
    '</b><small>' +
    esc(row.id) +
    '</small> · ' +
    esc(kinds[row.testFeedback.kind]) +
    ' · ' +
    esc(row.status) +
    '</span>' +
    button('view-defect', '查看', { id: row.id }) +
    '</div>'
  );
}
export function feedbackList(title) {
  const rows = projectFeedback();
  return rows.length
    ? '<section class="v35-panel"><h3>' +
        esc(title) +
        '</h3>' +
        rows.map(defectRow).join('') +
        '</section>'
    : '';
}
export function feedbackEvidence() {
  return (
    '<div class="v5-evidence"><b>缺陷反馈</b>' +
    (projectFeedback().map(defectRow).join('') || '<p>暂无测试退回的缺陷。</p>') +
    '</div>'
  );
}
export function openFeedbackDetail(row) {
  const rounds = row.testFeedback.rounds
    .map(
      (r, i) =>
        '<section class="v5-evidence"><h4>第 ' +
        (i + 1) +
        ' 轮 · ' +
        esc(r.foundCommit) +
        '</h4>' +
        line('测试反馈', r.actor + ' · ' + r.at) +
        Object.entries(fields)
          .map(([k, label]) => line(label, r[k]))
          .join('') +
        r.repairs
          .map((fix) => line('开发整改', [fix.commit, fix.owner, fix.at, fix.summary].join(' · ')))
          .join('') +
        (r.review
          ? line('检视准出', [r.review.commit, r.review.actor, r.review.at].join(' · '))
          : '') +
        (r.verification
          ? line(
              '回归验证',
              [
                r.verification.result,
                r.verification.commit,
                r.verification.actor,
                r.verification.at,
              ].join(' · '),
            )
          : '') +
        '</section>',
    )
    .join('');
  openDrawer(
    '缺陷反馈 · ' + row.id,
    line('所属项目', row.project) +
      line('测试环节', kinds[row.testFeedback.kind]) +
      line('状态', row.status) +
      line('开发负责人', row.resolver) +
      rounds,
    undefined,
    row.projectId,
  );
}
function repoLink(address) {
  if (!address) return '未记录';
  try {
    const url = new URL(/^[\w.-]+\//.test(address) ? 'https://' + address : address);
    if (['https:', 'http:'].includes(url.protocol))
      return (
        '<a href="' +
        esc(url.href) +
        '" target="_blank" rel="noopener noreferrer">' +
        esc(address) +
        '</a>'
      );
  } catch {
    /* Older demo records may have a repository label instead of a URL. */
  }
  return esc(address);
}
export function versionList(d) {
  return (
    '<div class="v5-evidence"><b>GitLab 仓库 / Commit</b><p>当前关联　' +
    repoLink(d.repo) +
    ' · ' +
    esc(d.branch) +
    '</p>' +
    (d.commits
      .slice()
      .reverse()
      .map(
        (c) =>
          '<div class="v5-row"><span>' +
          esc(c.commit) +
          ' · ' +
          (c.commit === d.commit ? '当前版本' : '历史版本') +
          ' · ' +
          esc(c.owner) +
          '</span>' +
          button('view-version', '查看', { commit: c.commit }) +
          '</div>',
      )
      .join('') || '<p>暂无提交版本。</p>') +
    '</div>'
  );
}
function openVersion(d, commit) {
  const record = d.commits.find((c) => c.commit === commit);
  if (!record) return;
  const active = commit === d.commit;
  const approval =
    (active && d.approval) || d.reviewArchives?.find((x) => x.commit === commit)?.approval;
  openDrawer(
    'GitLab 版本 · ' + commit,
    '<p>仓库地址　' +
      repoLink(record.repo ?? (active ? d.repo : '')) +
      '</p>' +
      line('分支', record.branch ?? (active ? d.branch : '未记录')) +
      line('开发提交', record.owner + ' · ' + record.at) +
      line('整改说明', record.fixSummary) +
      line(
        'AI 检视',
        d.runs
          .filter((r) => r.commit === commit)
          .map((r) => r.id + ' · ' + r.result)
          .join('，'),
      ) +
      line('检视准出', approval ? approval.reviewer + ' · ' + approval.at : '') +
      projectFeedback()
        .filter((row) =>
          row.testFeedback.rounds.some(
            (r) => r.foundCommit === commit || r.repairs.some((f) => f.commit === commit),
          ),
        )
        .map(defectRow)
        .join(''),
    undefined,
    state.projectId,
  );
}

export function testingFeedback(kind) {
  const gate = getReleaseGate();
  const canReturn =
    !!gate.commit &&
    !gate.testPass &&
    state.role === 'tester' &&
    isTestKindEnabled(project(), kind);
  const context = { kind, commit: gate.commit, project: state.projectId };
  const rows = projectFeedback().filter((row) => row.testFeedback.kind === kind);
  if (!canReturn && !rows.length) return '';
  return (
    '<div class="testing-feedback">' +
    (canReturn ? button('open-return', '退回开发整改', context) : '') +
    rows
      .map((row) => {
        const verify =
          canReturn && row.status === '待回归验证' && row.testFeedback.verifyCommit === gate.commit;
        return (
          defectRow(row) +
          (verify
            ? button('close-verified', '回归通过并关闭', { ...context, id: row.id }) +
              button('open-return', '回归未通过', { ...context, id: row.id })
            : '')
        );
      })
      .join('') +
    '</div>'
  );
}

export function bindRepairCommit(d, record) {
  const fixes = repairsDue();
  for (const row of fixes) {
    row.status = '待检视';
    row.updated = record.at;
    row.testFeedback.rounds
      .at(-1)
      .repairs.push({
        commit: record.commit,
        summary: record.fixSummary,
        owner: record.owner,
        at: record.at,
      });
  }
  record.defectIds = fixes.map((row) => row.id);
  d.commits.push(record);
}
export function markFeedbackReviewed(commit, at) {
  for (const row of projectFeedback()) {
    const round = row.testFeedback.rounds.at(-1);
    if (row.status === '待检视' && round.repairs.at(-1)?.commit === commit) {
      row.status = '待回归验证';
      round.review = { commit, at, actor: state.user.name };
    }
    // Any other outstanding regressions are now run on the latest handed-off build.
    if (row.status === '待回归验证') row.testFeedback.verifyCommit = commit;
  }
}
function returnToDevelopment(d, row, round) {
  const review = d.reviewV5;
  (d.reviewArchives ??= []).push({
    commit: d.commit,
    approval: d.approval,
    process: review?.process,
    tasks: review?.tasks || [],
    meetings: review?.meetings || [],
    verdicts: review?.verdicts || [],
    feedback: review?.feedback || [],
  });
  const current = d.commits.find((c) => c.commit === d.commit);
  if (current) {
    current.repo ??= d.repo;
    current.branch ??= d.branch;
  }
  d.reviewV5 = createReviewModel();
  d.handoff = false;
  d.approval = null;
  d.formalRequest = null;
  d.prep = { owner: d.developer, smoke: null, self: null };
  d.v47NeedsNewCommit = true;
  row.testFeedback.rounds.push(round);
  row.testFeedback.verifyCommit = '';
  row.status = '待整改';
  row.updated = round.at;
  for (const req of approvalRequests) {
    if (req.projectId === state.projectId && req.stage === 'testing' && req.status === '待审核') {
      req.status = '已失效';
      req.invalidReason = '测试退回开发整改 · ' + row.id + ' · ' + round.foundCommit;
    }
  }
  project().flowStatus = '开发阶段';
  d.log.unshift({
    at: round.at,
    commit: round.foundCommit,
    text: kinds[row.testFeedback.kind] + '退回整改 · ' + row.id,
  });
}
export function initTestFeedback() {
  document.addEventListener('click', (event) => {
    const el = event.target.closest('[data-feedback]');
    if (!el) return;
    const { feedback: action, id, kind, commit, project: pid } = el.dataset;
    const row = id ? projectFeedback().find((item) => item.id === id) : null;
    if (action === 'view-defect') {
      if (row) openFeedbackDetail(row);
      return;
    }
    const d = getDevReview();
    if (action === 'view-version') return openVersion(d, commit);
    const gate = getReleaseGate();
    if (
      state.role !== 'tester' ||
      pid !== state.projectId ||
      !kinds[kind] ||
      !isTestKindEnabled(project(), kind) ||
      !commit ||
      gate.commit !== commit ||
      gate.testPass ||
      (id &&
        (!row ||
          row.status !== '待回归验证' ||
          row.testFeedback.kind !== kind ||
          row.testFeedback.verifyCommit !== commit))
    ) {
      showToast('测试版本或缺陷状态已变化，请查看当前记录。', 'warn');
      return;
    }
    const attrs = { project: pid, kind, commit, ...(id ? { id } : {}) };
    if (action === 'open-return') {
      const body =
        '<div data-owner-project="' +
        esc(pid) +
        '">' +
        line('测试环节', kinds[kind] + ' · ' + commit) +
        Object.entries(fields)
          .map(
            ([key, label]) =>
              '<label class="field">' +
              label +
              ' *<textarea required rows="3" data-return-field="' +
              key +
              '"></textarea></label>',
          )
          .join('') +
        '</div>';
      openModal(
        'test-feedback',
        id ? '回归未通过 · 再次退回开发整改' : '退回开发整改',
        body,
        '<button class="btn" data-action="close-modal">取消</button>' +
          button('submit', '提交并退回开发', attrs),
      );
      return;
    }
    const at = timestamp(),
      actor = state.user.name;
    if (action === 'close-verified' && row) {
      row.testFeedback.rounds.at(-1).verification = { result: '通过', commit, at, actor };
      row.status = '已关闭';
      row.updated = at;
      row.actual = at;
      row.conclusion = '回归通过 · ' + commit;
      App.render();
      showToast('回归验证通过，缺陷已关闭');
      return;
    }
    if (action !== 'submit') return;
    const round = { foundCommit: commit, at, actor, repairs: [] };
    for (const [key, label] of Object.entries(fields)) {
      const input = document.querySelector('#modalRoot.show [data-return-field="' + key + '"]');
      if (!input?.value.trim()) {
        input?.focus();
        showToast('请填写' + label, 'warn');
        return;
      }
      round[key] = input.value.trim();
    }
    ensureBugRecords();
    const defect = row || {
      ...bugBlank(),
      id: documentId('DFT'),
      name: round.phenomenon.slice(0, 60),
      summary: round.phenomenon,
      description: round.requirement,
      creator: actor,
      created: at,
      version: commit,
      reviewer: '检视工程师',
      resolver: d.developer,
      testFeedback: { kind, rounds: [] },
    };
    if (row) row.testFeedback.rounds.at(-1).verification = { result: '未通过', commit, at, actor };
    else state.bugRecords.unshift(defect);
    returnToDevelopment(d, defect, round);
    closeModal();
    App.render();
    showToast('已退回开发整改 · ' + defect.id);
  });
}
