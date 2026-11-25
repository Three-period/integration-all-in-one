import { describe, expect, it } from 'vitest';
import { ROLE_LABELS, can } from '../../src/domain/permissions.js';

describe('permissions', () => {
  it('defines all ten roles', () => {
    expect(Object.keys(ROLE_LABELS)).toHaveLength(10);
    expect(ROLE_LABELS.qualityManager).toBe('质量主管');
  });

  it('keeps the current role rules', () => {
    expect(can('supervisor', 'operations.view')).toBe(true);
    expect(can('project', 'operations.view')).toBe(false);
    expect(can('reviewer', 'dev.workspace')).toBe(true);
    expect(can('reviewer', 'dev.submit')).toBe(false);
    expect(can('developer', 'dev.submit')).toBe(true);
    expect(can('reviewer', 'review.perform')).toBe(true);
    expect(can('testManager', 'approval.decide')).toBe(true);
    expect(can('developer', 'approval.decide')).toBe(false);
  });

  it('fails loudly on unknown permissions', () => {
    expect(() => can('developer', 'nope')).toThrow('未定义的权限');
  });
});
