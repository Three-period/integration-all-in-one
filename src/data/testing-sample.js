import { projects } from './projects.js';
import { DEFAULT_DEMO_STEPS, getDevReview, getFlow, getVersionAnchor } from '../store/lifecycle.js';
import { MANUAL_CHECKS } from '../domain/review-gates.js';
import { state } from '../store/state.js';

export const SAMPLE_ID = 'demo-testing-handoff';
export const SAMPLE_NAME = '温控固件 · 测试整改示例';
export const SAMPLE_REPO = 'https://gitlab.example.com/ipd/thermal-firmware';
export const SAMPLE_COMMIT = '7b91c3e4';
export const SAMPLE_BRANCH = 'release/v1.0';

// Installed only by explicitly opening the example. A second visit resumes the existing workflow.
export function selectTestingSample() {
  if (state.role !== 'tester') return;
  state.projectId = SAMPLE_ID;
  if (projects[SAMPLE_ID]) return;
  const at = new Date().toLocaleString('zh-CN', { hour12: false });
  projects[SAMPLE_ID] = {
    name: SAMPLE_NAME,
    code: 'DEMO-TEST-001',
    type: '产品开发',
    department: '软件一科',
    owner: '王凯',
    ownerDetail: '王凯 / 项目经理',
    status: '进行中',
    flowStatus: '测试阶段',
    progress: 60,
    health: '健康',
    start: '2026-11-01',
    end: '2026-12-31',
    period: '11/01 — 12/31',
    version: 'V1.0',
    repo: SAMPLE_REPO,
    goal: '验证测试退回、开发整改、重新检视与回归验证。',
    needsSingleTest: '是',
    needsLongTest: '是',
  };
  Object.assign(getFlow().steps, DEFAULT_DEMO_STEPS);
  const d = getDevReview();
  const base = { commit: SAMPLE_COMMIT, owner: d.developer, at };
  d.repo = SAMPLE_REPO;
  d.branch = SAMPLE_BRANCH;
  d.commit = SAMPLE_COMMIT;
  d.commits.push({ ...base, repo: d.repo, branch: d.branch });
  d.smokes.push({ ...base, result: '通过', text: '启动与连接检查通过' });
  d.selfTests.push({ ...base, result: '已提交', text: '完成温控固件自测' });
  d.seq = 1;
  d.runs.push({
    ...base,
    id: 'AI-001',
    result: '完成',
    ruleVersion: 'RULE-1.0',
    checks: ['文件一致性', '文件正确性', '方案与代码一致性', '点检项检查'].map((name) => ({
      name,
      result: '通过',
      detail: '示例检查通过',
    })),
  });
  d.manual = MANUAL_CHECKS.map((kind) => ({ ...base, kind, result: '无新增问题' }));
  d.formalRequest = { ...base, processId: 'PROC-001', reviewTaskId: 'REV-001' };
  d.approval = { commit: d.commit, reviewer: '检视工程师', processId: 'PROC-001', at };
  d.handoff = true;
  Object.assign(getVersionAnchor(), {
    handoffCommit: d.commit,
    handoffVersion: 'V1.0',
    handoffAt: at,
  });
}
