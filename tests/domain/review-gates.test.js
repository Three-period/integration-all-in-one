import { describe, expect, it } from 'vitest';
import {
  formalSubmitCheck,
  isIssueEligible,
  isRecheckRun,
  reviewApprovalState,
} from '../../src/domain/review-gates.js';

const passRun = { id: 'AI-001', commit: 'c2', result: '完成', checks: [{ result: '通过' }] };
const ready = { commit: true, smoke: true, self: true };
const allChecks = {
  高风险必查: { completed: true },
  'AI 未有效覆盖': { completed: true },
  独立抽检: { completed: true },
};

describe('isRecheckRun', () => {
  it('detects AI issues waiting for recheck on a new commit', () => {
    const dev = { commit: 'c2', issues: [{ source: 'AI 检视', status: '待复检', commit: 'c1' }] };
    expect(isRecheckRun(dev)).toBe(true);
    expect(isRecheckRun({ ...dev, commit: 'c1' })).toBe(false);
  });

  it('detects human findings that require fixes on a new commit', () => {
    const dev = { commit: 'c2', issues: [{ source: '人工检视', status: '待整改', commit: 'c1' }] };
    expect(isRecheckRun(dev)).toBe(true);
    expect(
      isRecheckRun({ commit: 'c2', issues: [{ source: '其他', status: '待整改', commit: 'c1' }] }),
    ).toBe(false);
  });
});

describe('formalSubmitCheck', () => {
  it('requires smoke, self-test and commit first', () => {
    expect(formalSubmitCheck({ runs: [], issues: [] }, {}, { ...ready, smoke: false }).ok).toBe(
      false,
    );
  });

  it('requires an AI run and no self-service issues', () => {
    expect(formalSubmitCheck({ commit: 'c2', runs: [], issues: [] }, {}, ready).reason).toBe(
      '当前 Commit 尚未生成 AI 检视批次',
    );
    const dev = { commit: 'c2', runs: [passRun], issues: [{ id: 'ISS-1', status: '待整改' }] };
    expect(formalSubmitCheck(dev, {}, ready).reason).toBe('仍有 1 条开发/AI可自主处理问题：ISS-1');
  });

  it('opens the first formal review with pending disputes', () => {
    const dispute = { id: 'ISS-2', status: '异议待裁定' };
    const res = formalSubmitCheck({ commit: 'c2', runs: [passRun], issues: [dispute] }, {}, ready);
    expect(res).toEqual({ ok: true, type: '首次正式检视', issues: [dispute] });
  });

  it('only adds a follow-up round for disputes not yet assigned to a task', () => {
    const model = { process: { id: 'PROC-001' } };
    const assigned = { id: 'ISS-2', status: '异议待裁定', humanTaskId: 'REV-001' };
    expect(
      formalSubmitCheck({ commit: 'c2', runs: [passRun], issues: [assigned] }, model, ready).ok,
    ).toBe(false);
    const fresh = { id: 'ISS-3', status: '异议待裁定' };
    expect(
      formalSubmitCheck({ commit: 'c2', runs: [passRun], issues: [fresh] }, model, ready).type,
    ).toBe('追加异议裁定');
  });
});

describe('reviewApprovalState', () => {
  const model = {
    process: { firstFormalTaskId: 'REV-001', manualChecks: allChecks, approval: null },
    verdicts: [],
  };

  it('passes for the reviewer when issues are closed and all checks are done', () => {
    const state = reviewApprovalState(
      { commit: 'c2', runs: [passRun], issues: [] },
      model,
      'reviewer',
    );
    expect(state).toMatchObject({ gate1: true, gate2: true, passed: true, missing: [] });
  });

  it('does not pass for other roles or with missing checks', () => {
    expect(
      reviewApprovalState({ commit: 'c2', runs: [passRun], issues: [] }, model, 'developer').passed,
    ).toBe(false);
    const partial = {
      ...model,
      process: { ...model.process, manualChecks: { 独立抽检: { completed: true } } },
    };
    const state = reviewApprovalState(
      { commit: 'c2', runs: [passRun], issues: [] },
      partial,
      'reviewer',
    );
    expect(state.gate2).toBe(false);
    expect(state.missing).toEqual(['高风险必查', 'AI 未有效覆盖']);
  });

  it('accepts a failed AI run only after every failure issue has a "no issue" verdict', () => {
    const failed = { id: 'AI-002', commit: 'c2', result: '执行失败', checks: [] };
    const issue = { id: 'ISS-9', run: 'AI-002', source: 'AI 执行异常', status: '已裁定无问题' };
    const dev = { commit: 'c2', runs: [failed], issues: [issue] };
    expect(reviewApprovalState(dev, model, 'reviewer').gate1).toBe(false);
    const withVerdict = { ...model, verdicts: [{ issueId: 'ISS-9', result: '无问题' }] };
    expect(reviewApprovalState(dev, withVerdict, 'reviewer')).toMatchObject({
      gate1: true,
      aiManuallyResolved: true,
    });
  });
});

describe('isIssueEligible', () => {
  it('accepts disputes in the chosen task that are not in an offline meeting', () => {
    const task = { issueIds: ['ISS-1'] };
    expect(isIssueEligible(task, { id: 'ISS-1', status: '异议待裁定' })).toBe(true);
    expect(isIssueEligible(task, { id: 'ISS-1', status: '异议待裁定', meetingGroupId: 'M1' })).toBe(
      false,
    );
    expect(isIssueEligible(task, { id: 'ISS-2', status: '异议待裁定' })).toBe(false);
    expect(isIssueEligible(null, { id: 'ISS-1', status: '异议待裁定' })).toBe(false);
  });
});
