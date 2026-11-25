import { describe, expect, it } from 'vitest';
import { ROLE_LABELS, can, landingFor } from '../../src/domain/permissions.js';

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

  it('only product and project managers configure approvers', () => {
    expect(can('project', 'project.configure')).toBe(true);
    expect(can('product', 'project.configure')).toBe(true);
    expect(can('rdDirector', 'project.configure')).toBe(false);
  });

  it('lands each role on its own interface', () => {
    expect(landingFor('developer')).toEqual({ view: 'project-lifecycle', stage: 'development' });
    expect(landingFor('tester')).toEqual({ view: 'project-lifecycle', stage: 'testing' });
    expect(landingFor('supervisor')).toEqual({ view: 'ops-projects' });
    expect(landingFor('rdDirector')).toEqual({ view: 'dashboard' });
  });
});
