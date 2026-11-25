import { describe, expect, it } from 'vitest';
import {
  devReadiness,
  isAiReviewClear,
  isFormalReviewReady,
  latestRun,
  pendingIssues,
} from '../../src/domain/dev-review.js';

const dev = (over = {}) => ({
  developer: '孙宁',
  commit: 'c1',
  commits: [{ commit: 'c1', owner: '孙宁' }],
  smokes: [{ commit: 'c1', owner: '孙宁' }],
  selfTests: [{ commit: 'c1', owner: '孙宁' }],
  runs: [],
  issues: [],
  formalRequest: null,
  ...over,
});

describe('devReadiness', () => {
  it('is ready when the developer committed with smoke and self-test records', () => {
    expect(devReadiness(dev(), { smoke: {}, self: null })).toEqual({
      smoke: true,
      self: true,
      commit: true,
      stageSmoke: true,
      stageSelf: false,
    });
  });

  it('is not ready when the commit belongs to someone else', () => {
    const r = devReadiness(dev({ commits: [{ commit: 'c1', owner: '他人' }] }), {});
    expect(r).toMatchObject({ smoke: false, self: false, commit: false });
  });

  it('requires a new commit after fixes were acknowledged', () => {
    const r = devReadiness(dev({ v47NeedsNewCommit: true }), { smoke: {}, self: {} });
    expect(r).toMatchObject({
      smoke: false,
      self: false,
      commit: false,
      stageSmoke: true,
      stageSelf: true,
    });
  });
});

describe('AI review results', () => {
  const passRun = {
    commit: 'c1',
    result: '完成',
    checks: [{ result: '通过' }, { result: '通过' }],
  };

  it('finds the latest run for the current commit', () => {
    const d = dev({
      runs: [
        { commit: 'c1', id: 1 },
        { commit: 'c0', id: 2 },
        { commit: 'c1', id: 3 },
      ],
    });
    expect(latestRun(d).id).toBe(3);
    expect(latestRun(dev({ runs: [{ commit: 'c0' }] }))).toBeUndefined();
  });

  it('counts only open issues as pending', () => {
    const d = dev({ issues: [{ status: '已关闭' }, { status: '授权例外' }, { status: '待整改' }] });
    expect(pendingIssues(d)).toEqual([{ status: '待整改' }]);
  });

  it('is clear only when all checks pass and nothing is pending', () => {
    expect(isAiReviewClear(dev({ runs: [passRun] }))).toBe(true);
    expect(isAiReviewClear(dev({ runs: [passRun], issues: [{ status: '待整改' }] }))).toBe(false);
    expect(
      isAiReviewClear(
        dev({ runs: [{ ...passRun, checks: [{ result: '通过' }, { result: '不通过' }] }] }),
      ),
    ).toBe(false);
    expect(isAiReviewClear(dev())).toBe(false);
  });

  it('allows formal review only after a request for the current commit', () => {
    expect(isFormalReviewReady(dev({ runs: [passRun], formalRequest: { commit: 'c1' } }))).toBe(
      true,
    );
    expect(isFormalReviewReady(dev({ runs: [passRun], formalRequest: { commit: 'c0' } }))).toBe(
      false,
    );
    expect(isFormalReviewReady(dev({ runs: [passRun] }))).toBe(false);
  });
});
