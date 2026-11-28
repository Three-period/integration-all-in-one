import { describe, expect, it } from 'vitest';
import {
  designDocTypes,
  designKeysFor,
  flowNodeState,
  isHandoffReady,
  isStageDone,
  isStageEditable,
  isStagePrereqMet,
  isStageReached,
  stageState,
} from '../../src/domain/stages.js';

const approvedDev = { approval: { commit: 'c1' }, handoff: true, commit: 'c1' };

describe('designKeysFor / designDocTypes', () => {
  it('maps each design type to its documents', () => {
    expect(designKeysFor('I')).toEqual(['architecture', 'summarydesign', 'detaildesign']);
    expect(designKeysFor('III')).toEqual(['detaildesign']);
    expect(designKeysFor('IV')).toEqual([]);
  });

  it('falls back to type II for unknown types', () => {
    expect(designKeysFor(undefined)).toEqual(['summarydesign', 'detaildesign']);
  });

  it('returns a fresh array each time', () => {
    designKeysFor('II').push('x');
    expect(designKeysFor('II')).toEqual(['summarydesign', 'detaildesign']);
  });

  it('always starts with the software specification', () => {
    expect(designDocTypes('I')).toEqual(['软件规格书', '软件架构设计', '概要设计', '详细设计']);
    expect(designDocTypes('IV')).toEqual(['软件规格书']);
  });
});

describe('isHandoffReady', () => {
  it('requires approval, handoff and the approved commit to be current', () => {
    expect(isHandoffReady(approvedDev)).toBe(true);
    expect(isHandoffReady({ ...approvedDev, handoff: false })).toBe(false);
    expect(isHandoffReady({ ...approvedDev, commit: 'c2' })).toBe(false);
    expect(isHandoffReady({ ...approvedDev, approval: null })).toBe(false);
  });
});

describe('isStageDone', () => {
  it('uses flow steps for planning, requirements and design', () => {
    const facts = { flowSteps: { planning: true, requirements: false } };
    expect(isStageDone('planning', facts)).toBe(true);
    expect(isStageDone('requirements', facts)).toBe(false);
    expect(isStageDone('design', facts)).toBe(false);
  });

  it('uses the dev handoff for development', () => {
    expect(isStageDone('development', { dev: approvedDev })).toBe(true);
    expect(isStageDone('development', { dev: { ...approvedDev, commit: 'c9' } })).toBe(false);
  });

  it('uses the release gate for testing, release and closing', () => {
    const gate = {
      testPass: true,
      published: { status: '已发布' },
      commit: 'c1',
      closingCommit: 'c1',
    };
    expect(isStageDone('testing', { gate })).toBe(true);
    expect(isStageDone('release', { gate })).toBe(true);
    expect(isStageDone('closing', { gate })).toBe(true);
    expect(isStageDone('closing', { gate: { ...gate, closingCommit: 'old' } })).toBe(false);
    expect(isStageDone('release', { gate: { ...gate, published: null } })).toBe(false);
  });

  it('only reads the facts that the stage needs', () => {
    const facts = {
      get dev() {
        throw new Error('dev should not be read');
      },
      get gate() {
        throw new Error('gate should not be read');
      },
      flowSteps: { design: true },
    };
    expect(isStageDone('design', facts)).toBe(true);
  });
});

describe('isStagePrereqMet', () => {
  it('lets the first stage through and checks the previous stage otherwise', () => {
    const done = new Set(['planning']);
    const isDone = (s) => done.has(s);
    expect(isStagePrereqMet('planning', isDone)).toBe(true);
    expect(isStagePrereqMet('requirements', isDone)).toBe(true);
    expect(isStagePrereqMet('design', isDone)).toBe(false);
  });
});

describe('stageState / isStageReached', () => {
  const doneSet =
    (...stages) =>
    (s) =>
      stages.includes(s);

  it('marks completed, reached and unreached stages', () => {
    const isDone = doneSet('planning', 'requirements');
    expect(stageState('planning', isDone)).toBe('done');
    expect(stageState('design', isDone)).toBe('current');
    expect(stageState('development', isDone)).toBe('pending');
  });

  it('reaches closing only after release is done', () => {
    expect(isStageReached('closing', doneSet('testing'))).toBe(false);
    expect(isStageReached('closing', doneSet('release'))).toBe(true);
    expect(isStageReached('unknown', doneSet())).toBe(false);
  });

  it('lets unreached stages be viewed but not edited', () => {
    const isDone = doneSet('planning');
    expect(isStageEditable('requirements', isDone)).toBe(true);
    expect(isStageEditable('design', isDone)).toBe(false);
  });
});

describe('flowNodeState', () => {
  const ctx = (over = {}) => ({
    stageStateOf: (s) => ({ planning: 'done', requirements: 'current' })[s] || 'pending',
    designType: 'II',
    isTestEnabled: (k) => k !== 'long',
    approvalStatus: () => '',
    ...over,
  });

  it('follows the stage state for deliverable nodes', () => {
    expect(flowNodeState({ stage: 'planning', kind: 'content' }, ctx())).toBe('done');
    expect(flowNodeState({ stage: 'requirements', kind: 'content' }, ctx())).toBe('current');
    expect(flowNodeState({ stage: 'design', kind: 'content' }, ctx())).toBe('pending');
  });

  it('lights an approval node only while its review is pending', () => {
    const node = { stage: 'requirements', kind: 'approval' };
    expect(flowNodeState(node, ctx())).toBe('pending');
    expect(flowNodeState(node, ctx({ approvalStatus: () => '待审核' }))).toBe('current');
    expect(flowNodeState({ stage: 'planning', kind: 'approval' }, ctx())).toBe('done');
  });

  it('skips design branches and tests the project does not use', () => {
    expect(flowNodeState({ stage: 'design', kind: 'content', designTypes: ['I'] }, ctx())).toBe(
      'skipped',
    );
    expect(flowNodeState({ stage: 'design', kind: 'content', designTypes: ['II'] }, ctx())).toBe(
      'pending',
    );
    expect(flowNodeState({ stage: 'testing', kind: 'content', testKind: 'long' }, ctx())).toBe(
      'skipped',
    );
  });

  it('completes the end node with closing', () => {
    expect(flowNodeState({ kind: 'end' }, ctx())).toBe('pending');
    expect(flowNodeState({ kind: 'end' }, ctx({ stageStateOf: () => 'done' }))).toBe('done');
  });
});
