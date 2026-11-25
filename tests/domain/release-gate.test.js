import { describe, expect, it } from 'vitest';
import { computeReleaseGate } from '../../src/domain/release-gate.js';

const anchor = (over = {}) => ({
  handoffVersion: 'V2.6',
  testReview: { status: '审核通过', commit: 'c1' },
  releaseReview: { status: '已通过', commit: 'c1' },
  published: { status: '已发布', commit: 'c1' },
  closingCommit: '',
  ...over,
});

describe('computeReleaseGate', () => {
  it('passes every gate when all records bind the handoff commit', () => {
    const gate = computeReleaseGate(anchor(), 'c1');
    expect(gate).toMatchObject({
      commit: 'c1',
      version: 'V2.6',
      testPass: true,
      releasePass: true,
    });
    expect(gate.published).toEqual({ status: '已发布', commit: 'c1' });
  });

  it('fails everything without a handoff commit', () => {
    const gate = computeReleaseGate(anchor(), '');
    expect(gate.testPass).toBe(false);
    expect(gate.releasePass).toBe(false);
    expect(gate.published).toBeNull();
  });

  it('rejects records bound to another commit', () => {
    expect(computeReleaseGate(anchor(), 'c2').testPass).toBe(false);
    const gate = computeReleaseGate(
      anchor({ releaseReview: { status: '已通过', commit: 'old' } }),
      'c1',
    );
    expect(gate.testPass).toBe(true);
    expect(gate.releasePass).toBe(false);
    expect(gate.published).toBeNull();
  });

  it('requires an approved test review before release review counts', () => {
    const gate = computeReleaseGate(
      anchor({ testReview: { status: '待审核', commit: 'c1' } }),
      'c1',
    );
    expect(gate.testPass).toBe(false);
    expect(gate.releasePass).toBe(false);
  });
});
