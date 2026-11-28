import { describe, expect, it } from 'vitest';
import {
  APPROVAL_STATUS,
  canDecide,
  createApprovalRequest,
  decideApproval,
  isStageApproved,
  latestApproval,
  pendingApprovalsFor,
  stageApprovers,
} from '../../src/domain/approvals.js';

const submit = (over = {}) =>
  createApprovalRequest({
    id: 'APR-1',
    project: {},
    projectId: 'thermal',
    stage: 'testing',
    deliverable: '测试报告',
    submitter: '赵敏',
    at: 't0',
    ...over,
  });

describe('stageApprovers', () => {
  it('uses the project configuration, falling back to defaults', () => {
    expect(stageApprovers({}, 'requirements')).toEqual(['rdManager']);
    expect(
      stageApprovers({ approvers: { requirements: ['qualityManager'] } }, 'requirements'),
    ).toEqual(['qualityManager']);
    expect(stageApprovers({ approvers: { requirements: [] } }, 'requirements')).toEqual([
      'rdManager',
    ]);
    expect(stageApprovers({}, 'development')).toEqual([]);
  });
});

describe('approval flow', () => {
  it('creates a pending request routed to the stage approvers', () => {
    const r = submit();
    expect(r).toMatchObject({
      status: APPROVAL_STATUS.PENDING,
      approvers: ['testManager', 'qualityManager'],
    });
    expect(canDecide(r, 'testManager')).toBe(true);
    expect(canDecide(r, 'rdDirector')).toBe(false);
  });

  it('approves with any one approver', () => {
    const res = decideApproval(submit(), {
      role: 'qualityManager',
      user: '质量主管',
      decision: 'approve',
      at: 't1',
    });
    expect(res.ok).toBe(true);
    expect(res.request.status).toBe(APPROVAL_STATUS.APPROVED);
    expect(res.request.decisions).toHaveLength(1);
    expect(canDecide(res.request, 'testManager')).toBe(false);
  });

  it('requires a comment to reject', () => {
    const r = submit();
    expect(decideApproval(r, { role: 'testManager', decision: 'reject', comment: ' ' })).toEqual({
      ok: false,
      reason: '退回时请填写审核意见',
    });
    const res = decideApproval(r, {
      role: 'testManager',
      decision: 'reject',
      comment: '报告缺少结论',
    });
    expect(res.request.status).toBe(APPROVAL_STATUS.REJECTED);
    expect(r.status).toBe(APPROVAL_STATUS.PENDING);
  });

  it('rejects decisions from roles without approval rights', () => {
    expect(decideApproval(submit(), { role: 'developer', decision: 'approve' }).ok).toBe(false);
  });

  it('lists pending approvals and the latest result per stage', () => {
    const first = decideApproval(submit({ id: 'APR-1' }), {
      role: 'testManager',
      decision: 'reject',
      comment: '补充',
    }).request;
    const second = submit({ id: 'APR-2' });
    const all = [first, second, submit({ id: 'APR-3', stage: 'design' })];
    expect(pendingApprovalsFor('testManager', all).map((r) => r.id)).toEqual(['APR-2']);
    expect(pendingApprovalsFor('rdDirector', all).map((r) => r.id)).toEqual(['APR-3']);
    expect(latestApproval(all, 'thermal', 'testing').id).toBe('APR-2');
    expect(isStageApproved(all, 'thermal', 'testing')).toBe(false);
    const approved = decideApproval(second, { role: 'testManager', decision: 'approve' }).request;
    expect(isStageApproved([first, approved], 'thermal', 'testing')).toBe(true);
    expect(latestApproval(all, 'gateway', 'testing')).toBeNull();
  });
});
