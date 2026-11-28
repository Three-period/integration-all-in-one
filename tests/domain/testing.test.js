import { describe, expect, it } from 'vitest';
import { isTestKindEnabled, reportReadiness } from '../../src/domain/testing.js';

describe('isTestKindEnabled', () => {
  it('lets projects turn off single-board and long-run tests', () => {
    expect(isTestKindEnabled({ needsSingleTest: '否' }, 'single')).toBe(false);
    expect(isTestKindEnabled({ needsLongTest: '否' }, 'long')).toBe(false);
    expect(isTestKindEnabled({}, 'single')).toBe(true);
    expect(isTestKindEnabled({ needsSingleTest: '否' }, 'system')).toBe(true);
  });
});

describe('reportReadiness', () => {
  it('skips disabled test kinds', () => {
    expect(reportReadiness(false, [], 'c1')).toEqual({ ready: true, skipped: true });
  });

  it('needs a submitted report with a conclusion for the handoff commit', () => {
    const row = { status: '待评审', commit: 'c1', conclusion: '通过' };
    expect(reportReadiness(true, [row], 'c1')).toEqual({ ready: true, row });
    expect(reportReadiness(true, [{ ...row, status: '草稿' }], 'c1').ready).toBe(false);
    expect(reportReadiness(true, [{ ...row, conclusion: '  ' }], 'c1').ready).toBe(false);
    expect(reportReadiness(true, [{ ...row, commit: 'c0' }], 'c1')).toEqual({
      ready: false,
      row: null,
    });
  });
});
