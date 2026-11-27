import { describe, expect, it } from 'vitest';
import { ROLE_LABELS, can, landingFor } from '../../src/domain/permissions.js';

describe('permissions', () => {
  it('defines all nine roles', () => {
    expect(Object.keys(ROLE_LABELS)).toHaveLength(9);
    expect(ROLE_LABELS.qualityManager).toBe('质量主管');
  });

  it('keeps the current role rules', () => {
    for (const role of ['rdDirector', 'rdManager', 'testManager', 'qualityManager']) {
      expect(can(role, 'operations.view')).toBe(true);
      expect(can(role, 'approval.decide')).toBe(true);
    }
    for (const role of Object.keys(ROLE_LABELS)) expect(can(role, 'dev.workspace')).toBe(true);
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
    expect(landingFor('rdDirector')).toEqual({ view: 'dashboard' });
  });
});
