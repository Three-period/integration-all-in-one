/**
 * 流程视图 · 流程图（桌面 / 平板）。
 *
 * 保留原流程图的拓扑：四个环节分区、I–IV 类设计分支、单板 / 长运测试分叉、
 * 橙色虚线退回路径、紫色特殊流程（ECN / PCN、紧急临时下发）。节点为圆形：
 * 阶段节点为蓝色系，审核节点为红色系；已完成点亮，进行中带外圈，未开始为灰色，
 * 本项目不涉及的分支变淡并以虚线表示。四个环节排成两行，桌面无需横向滚动。
 */
import { esc } from '../../core/dom.js';

const R = 21; // 节点半径
const R_SMALL = 14; // 终点节点半径
const W = 1128;

/* ---------- 布局 ---------- */

// 第一行：01 立项与需求（4 列）+ 02 分类设计（8 列），列距 88。
const P1 = 88;
const S01 = { x: 0, y: 0, w: 368, h: 566, title: '01 立项与需求' };
const S02 = { x: 384, y: 0, w: W - 384, h: 566, title: '02 分类设计（I / II / III / IV 类）' };
const c1 = (i) => S01.x + 8 + P1 / 2 + i * P1;
const c2 = (i) => S02.x + 8 + P1 / 2 + i * P1;
const ROW1_MAIN = 96;
const LANES = [196, 296, 396, 496]; // I / II / III / IV 类

// 第二行：03 开发与测试（6 列）+ 04 审核、发布与结项（5 列），列距 98。
const P2 = 98;
const ROW2_TOP = 600;
const S03 = { x: 0, y: ROW2_TOP, w: 604, h: 410, title: '03 开发与测试' };
const S04 = { x: 620, y: ROW2_TOP, w: W - 620, h: 410, title: '04 审核、发布与结项' };
const c3 = (i) => S03.x + 8 + P2 / 2 + i * P2;
const c4 = (i) => S04.x + 8 + P2 / 2 + i * P2;
const ROW2_MAIN = ROW2_TOP + 96;
const ROW2_L1 = ROW2_TOP + 196;
const ROW2_L2 = ROW2_TOP + 296;
const H = ROW2_TOP + 412;

const TRANS_Y = 583; // 第一行汇合后转入第二行的连线高度
const CONV_X = c2(7) + R + 16; // 设计分支汇合线
const SPINE_X = c2(1) + P1 / 2; // 设计分支起点

/* ---------- 节点 ---------- */

/**
 * kind：content 阶段节点 / approval 审核节点 / end 终点 / special 特殊流程。
 * docType：设计文档节点对应的文档类型；report：测试节点对应的报告类型。
 */
function nodes(h) {
  const lane = (n, types, y, docs) =>
    docs.map(([key, label, docType, col, kind]) => ({
      key: key + n,
      label,
      stage: 'design',
      kind,
      designTypes: types,
      docType,
      x: c2(col),
      y,
    }));
  return [
    {
      key: 'planning',
      label: '项目立项',
      stage: 'planning',
      target: 'basic',
      kind: 'content',
      x: c1(0),
      y: ROW1_MAIN,
      done: h.planningSubmitted,
    },
    {
      key: 'planningReview',
      label: '项目立项审核',
      stage: 'planning',
      kind: 'approval',
      x: c1(1),
      y: ROW1_MAIN,
    },
    {
      key: 'reqCollect',
      label: '需求收集、分析、整理',
      lines: ['需求收集、', '分析、整理'],
      stage: 'requirements',
      kind: 'content',
      x: c1(2),
      y: ROW1_MAIN,
      done: h.requirementSubmitted,
    },
    {
      key: 'reqReview',
      label: '需求审核',
      stage: 'requirements',
      kind: 'approval',
      x: c1(3),
      y: ROW1_MAIN,
    },
    {
      key: 'spec',
      label: '拟制软件规格书',
      lines: ['拟制软件', '规格书'],
      stage: 'design',
      kind: 'content',
      docType: '软件规格书',
      x: c2(0),
      y: ROW1_MAIN,
      tip: true,
    },
    {
      key: 'specReview',
      label: '软件规格书审核',
      lines: ['软件规格书', '审核'],
      stage: 'design',
      kind: 'approval',
      docType: '软件规格书',
      x: c2(1),
      y: ROW1_MAIN,
    },
    ...lane('I', ['I'], LANES[0], [
      ['arch', '软件架构设计', '软件架构设计', 2, 'content'],
      ['archReview', '架构设计审核', '软件架构设计', 3, 'approval'],
      ['summary', '软件概要设计', '概要设计', 4, 'content'],
      ['summaryReview', '概要设计审核', '概要设计', 5, 'approval'],
      ['detail', '软件详细设计', '详细设计', 6, 'content'],
      ['detailReview', '详细设计审核', '详细设计', 7, 'approval'],
    ]),
    ...lane('II', ['II'], LANES[1], [
      ['summary', '软件概要设计', '概要设计', 4, 'content'],
      ['summaryReview', '概要设计审核', '概要设计', 5, 'approval'],
      ['detail', '软件详细设计', '详细设计', 6, 'content'],
      ['detailReview', '详细设计审核', '详细设计', 7, 'approval'],
    ]),
    ...lane('III', ['III'], LANES[2], [
      ['detail', '软件详细设计', '详细设计', 6, 'content'],
      ['detailReview', '详细设计审核', '详细设计', 7, 'approval'],
    ]),
    {
      key: 'noDesign',
      label: '无需设计审批',
      lines: ['无需设计', '审批'],
      stage: 'design',
      kind: 'content',
      designTypes: ['IV'],
      small: true,
      x: c2(7),
      y: LANES[3],
    },
    {
      key: 'coding',
      label: '软件编码 / 自测报告',
      lines: ['软件编码 /', '自测报告'],
      stage: 'development',
      kind: 'content',
      x: c3(0),
      y: ROW2_MAIN,
    },
    {
      key: 'smoke',
      label: '冒烟测试',
      stage: 'testing',
      kind: 'content',
      report: 'smoke',
      x: c3(1),
      y: ROW2_MAIN,
    },
    {
      key: 'single',
      label: '单板测试',
      stage: 'testing',
      kind: 'content',
      report: 'single',
      testKind: 'single',
      x: c3(2),
      y: ROW2_L1,
    },
    {
      key: 'long',
      label: '长运测试',
      stage: 'testing',
      kind: 'content',
      report: 'long',
      testKind: 'long',
      x: c3(3),
      y: ROW2_L2,
    },
    {
      key: 'system',
      label: '整机测试',
      stage: 'testing',
      kind: 'content',
      report: 'system',
      x: c3(4),
      y: ROW2_MAIN,
    },
    {
      key: 'testReview',
      label: '测试审核',
      stage: 'testing',
      kind: 'approval',
      x: c3(5),
      y: ROW2_MAIN,
    },
    {
      key: 'releaseReview',
      label: '发布评审',
      stage: 'release',
      kind: 'approval',
      x: c4(0),
      y: ROW2_MAIN,
      done: h.releaseApproved,
    },
    {
      key: 'archive',
      label: '文档归档',
      stage: 'release',
      kind: 'content',
      x: c4(1),
      y: ROW2_MAIN,
      done: h.releaseApproved,
    },
    {
      key: 'publish',
      label: '版本发布',
      stage: 'release',
      kind: 'content',
      x: c4(2),
      y: ROW2_MAIN,
    },
    { key: 'closing', label: '结项', stage: 'closing', kind: 'content', x: c4(3), y: ROW2_MAIN },
    {
      key: 'end',
      label: '完成',
      stage: 'closing',
      kind: 'end',
      small: true,
      x: c4(4),
      y: ROW2_MAIN,
    },
    { key: 'ecn', label: 'ECN / PCN', stage: 'release', kind: 'special', x: c4(1), y: ROW2_L1 },
    {
      key: 'emergency',
      label: '紧急临时下发',
      lines: ['紧急临时', '下发'],
      stage: 'release',
      kind: 'special',
      x: c4(1),
      y: ROW2_L2,
    },
  ];
}

/* ---------- 连线 ---------- */

/** 正向连线：from → to，via 为中间拐点；label 为分支说明。 */
function forwardEdges() {
  const toCoding = (from, y) => ({
    from,
    to: 'coding',
    via: [
      [CONV_X, y],
      [CONV_X, TRANS_Y],
      [S03.x + 10, TRANS_Y],
      [S03.x + 10, ROW2_MAIN],
    ],
  });
  const branch = (to, y) => ({
    from: 'specReview',
    to,
    via: [
      [SPINE_X, ROW1_MAIN],
      [SPINE_X, y],
    ],
  });
  return [
    { from: 'planning', to: 'planningReview' },
    { from: 'planningReview', to: 'reqCollect' },
    { from: 'reqCollect', to: 'reqReview' },
    { from: 'reqReview', to: 'spec' },
    { from: 'spec', to: 'specReview' },
    branch('archI', LANES[0]),
    branch('summaryII', LANES[1]),
    branch('detailIII', LANES[2]),
    branch('noDesign', LANES[3]),
    { from: 'archI', to: 'archReviewI' },
    { from: 'archReviewI', to: 'summaryI' },
    { from: 'summaryI', to: 'summaryReviewI' },
    { from: 'summaryReviewI', to: 'detailI' },
    { from: 'detailI', to: 'detailReviewI' },
    { from: 'summaryII', to: 'summaryReviewII' },
    { from: 'summaryReviewII', to: 'detailII' },
    { from: 'detailII', to: 'detailReviewII' },
    { from: 'detailIII', to: 'detailReviewIII' },
    toCoding('detailReviewI', LANES[0]),
    toCoding('detailReviewII', LANES[1]),
    toCoding('detailReviewIII', LANES[2]),
    toCoding('noDesign', LANES[3]),
    { from: 'coding', to: 'smoke' },
    { from: 'smoke', to: 'system', label: '免单板', labelAt: [c3(2.5), ROW2_MAIN - 7] },
    {
      from: 'smoke',
      to: 'single',
      via: [
        [c3(1) + P2 / 2, ROW2_MAIN],
        [c3(1) + P2 / 2, ROW2_L1],
      ],
      label: '需单板',
      labelAt: [c3(1) + P2 / 2 + 6, ROW2_MAIN + 52],
      anchor: 'start',
    },
    {
      from: 'single',
      to: 'system',
      via: [
        [c3(4) - P2 / 2, ROW2_L1],
        [c3(4) - P2 / 2, ROW2_MAIN],
      ],
      label: '免长运',
      labelAt: [c3(3), ROW2_L1 - 7],
    },
    {
      from: 'single',
      to: 'long',
      via: [
        [c3(2) + P2 / 2, ROW2_L1],
        [c3(2) + P2 / 2, ROW2_L2],
      ],
      label: '需长运',
      labelAt: [c3(2) + P2 / 2 + 6, ROW2_L1 + 52],
      anchor: 'start',
    },
    {
      from: 'long',
      to: 'system',
      via: [
        [c3(4) - P2 / 2, ROW2_L2],
        [c3(4) - P2 / 2, ROW2_MAIN],
      ],
    },
    { from: 'system', to: 'testReview' },
    { from: 'testReview', to: 'releaseReview' },
    { from: 'releaseReview', to: 'archive' },
    { from: 'archive', to: 'publish' },
    { from: 'publish', to: 'closing' },
    { from: 'closing', to: 'end' },
    {
      from: 'releaseReview',
      to: 'ecn',
      special: true,
      via: [
        [c4(0) + P2 / 2, ROW2_MAIN],
        [c4(0) + P2 / 2, ROW2_L1],
      ],
    },
    {
      from: 'ecn',
      to: 'publish',
      special: true,
      via: [
        [c4(2) - P2 / 2, ROW2_L1],
        [c4(2) - P2 / 2, ROW2_MAIN],
      ],
    },
    {
      from: 'releaseReview',
      to: 'emergency',
      special: true,
      via: [
        [c4(0) + P2 / 2, ROW2_MAIN],
        [c4(0) + P2 / 2, ROW2_L2],
      ],
    },
    {
      from: 'emergency',
      to: 'publish',
      special: true,
      via: [
        [c4(2) - P2 / 2, ROW2_L2],
        [c4(2) - P2 / 2, ROW2_MAIN],
      ],
    },
  ];
}

/** 退回路径（橙色虚线，走节点上方）：from 审核节点 → to 退回的节点。 */
const BACK_EDGES = [
  { from: 'planningReview', to: 'planning', label: '不通过，取消立项' },
  { from: 'reqReview', to: 'reqCollect', label: '未通过，返回修改' },
  { from: 'specReview', to: 'spec', label: '未通过，返回修改' },
  { from: 'archReviewI', to: 'archI' },
  { from: 'summaryReviewI', to: 'summaryI' },
  { from: 'detailReviewI', to: 'detailI' },
  { from: 'summaryReviewII', to: 'summaryII' },
  { from: 'detailReviewII', to: 'detailII' },
  { from: 'detailReviewIII', to: 'detailIII' },
  { from: 'testReview', to: 'coding', label: '测试审核不通过：返回开发 / 相关测试环节' },
  { from: 'releaseReview', to: 'system', label: '不通过，返回整机测试', high: true },
];

/* ---------- 绘制 ---------- */

const radius = (n) => (n.small ? R_SMALL : R);

/** 折线两端收缩到节点圆边，避免箭头压在节点上。 */
function trimmed(points, from, to) {
  const pts = points.map((p) => p.slice());
  const shrink = (a, b, r) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    a[0] += (dx / len) * r;
    a[1] += (dy / len) * r;
  };
  shrink(pts[0], pts[1], radius(from) + 1);
  shrink(pts[pts.length - 1], pts[pts.length - 2], radius(to) + 3);
  return pts;
}

const path = (pts) => 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');

function edgeClass(edge, a, b) {
  if (edge.special) return 'fd-edge is-special';
  if (a.state === 'skipped' || b.state === 'skipped') return 'fd-edge is-skipped';
  if (a.state === 'done' && (b.state === 'done' || b.state === 'current')) return 'fd-edge is-done';
  return 'fd-edge';
}

function labelLines(n) {
  if (n.lines) return n.lines;
  return n.label.length > 6 ? [n.label.slice(0, 5), n.label.slice(5)] : [n.label];
}

const STATE_LABELS = {
  done: '已完成',
  current: '进行中',
  pending: '未开始',
  skipped: '不涉及',
  special: '特殊流程',
};

function renderNode(n, specTip) {
  const r = radius(n);
  const mark =
    n.state === 'done'
      ? '<text class="fd-mark" x="' + n.x + '" y="' + (n.y + 5) + '">✓</text>'
      : n.state === 'skipped'
        ? '<text class="fd-mark" x="' + n.x + '" y="' + (n.y + 4) + '">–</text>'
        : n.kind === 'approval'
          ? '<text class="fd-mark fd-mark-sm" x="' + n.x + '" y="' + (n.y + 4) + '">审</text>'
          : n.state === 'current' && !n.small
            ? '<circle class="fd-dot" cx="' + n.x + '" cy="' + n.y + '" r="5"/>'
            : '';
  const lines = labelLines(n);
  const labels = lines
    .map(
      (t, i) =>
        '<text class="fd-label" x="' +
        n.x +
        '" y="' +
        (n.y + r + 16 + i * 14) +
        '">' +
        esc(t) +
        '</text>',
    )
    .join('');
  const target = n.target || n.stage;
  const tip = n.tip && specTip ? renderTip(n, specTip) : '';
  return (
    '<g class="fd-node kind-' +
    n.kind +
    ' is-' +
    n.state +
    (tip ? ' has-tip' : '') +
    '" data-flow-view-action="node" data-flow-stage="' +
    target +
    '" role="button" tabindex="0" aria-label="' +
    esc(n.label + ' · ' + STATE_LABELS[n.state] + '，点击进入对应阶段') +
    '"><title>' +
    esc(n.label + ' · ' + STATE_LABELS[n.state]) +
    '</title>' +
    (n.state === 'current'
      ? '<circle class="fd-halo" cx="' + n.x + '" cy="' + n.y + '" r="' + (r + 6) + '"/>'
      : '') +
    '<circle class="fd-circle" cx="' +
    n.x +
    '" cy="' +
    n.y +
    '" r="' +
    r +
    '"/>' +
    mark +
    labels +
    tip +
    '</g>'
  );
}

/** 软件规格书节点悬停提示：当前状态与负责人。 */
function renderTip(n, info) {
  const x = n.x - 20;
  const y = n.y + R + 40;
  return (
    '<g class="fd-tip" aria-hidden="true"><rect x="' +
    x +
    '" y="' +
    y +
    '" width="172" height="62" rx="8"/><text class="fd-tip-k" x="' +
    (x + 12) +
    '" y="' +
    (y + 22) +
    '">当前状态</text><text class="fd-tip-v" x="' +
    (x + 72) +
    '" y="' +
    (y + 22) +
    '">' +
    esc(info.status) +
    '</text><text class="fd-tip-k" x="' +
    (x + 12) +
    '" y="' +
    (y + 46) +
    '">负责人</text><text class="fd-tip-v" x="' +
    (x + 72) +
    '" y="' +
    (y + 46) +
    '">' +
    esc(info.owner) +
    '</text></g>'
  );
}

function renderSection(s) {
  return (
    '<rect class="fd-section" x="' +
    s.x +
    '" y="' +
    s.y +
    '" width="' +
    s.w +
    '" height="' +
    s.h +
    '" rx="12"/><text class="fd-section-title" x="' +
    (s.x + 26) +
    '" y="' +
    (s.y + 26) +
    '">' +
    s.title +
    '</text>'
  );
}

/**
 * 绘制流程图。
 * @param {object} h 节点状态所需的数据：stateOf(node) 计算节点状态；designType 当前项目设计类别；
 *   specTip 软件规格书提示（status、owner）；以及若干 done 判断（planningSubmitted 等）。
 */
export function renderFlowDiagram(h) {
  const list = nodes(h);
  const byKey = Object.create(null);
  list.forEach((n) => {
    n.state = n.kind === 'special' ? 'special' : h.stateOf(n);
    byKey[n.key] = n;
  });

  const edges = forwardEdges().map((e) => {
    const a = byKey[e.from];
    const b = byKey[e.to];
    const pts = trimmed([[a.x, a.y], ...(e.via || []), [b.x, b.y]], a, b);
    const cls = edgeClass(e, a, b);
    return { cls, html: '<path class="' + cls + '" d="' + path(pts) + '"/>', e };
  });
  // 未点亮的线先画，点亮的线后画，叠在共用线段上方。
  const order = (c) => (c.includes('is-done') ? 2 : c.includes('is-skipped') ? 0 : 1);
  edges.sort((x, y) => order(x.cls) - order(y.cls));
  const edgeLabels = forwardEdges()
    .filter((e) => e.label)
    .map(
      (e) =>
        '<text class="fd-edge-label' +
        (e.anchor === 'start' ? ' is-start' : '') +
        '" x="' +
        e.labelAt[0] +
        '" y="' +
        e.labelAt[1] +
        '">' +
        e.label +
        '</text>',
    )
    .join('');

  const back = BACK_EDGES.map((e) => {
    const a = byKey[e.from];
    const b = byKey[e.to];
    const ly = a.y - R - (e.high ? 28 : 14);
    const pts = [
      [a.x, a.y - R - 1],
      [a.x, ly],
      [b.x, ly],
      [b.x, b.y - R - 4],
    ];
    const label = e.label
      ? '<text class="fd-back-label" x="' +
        (a.x + b.x) / 2 +
        '" y="' +
        (ly - 5) +
        '">' +
        e.label +
        '</text>'
      : '';
    return '<path class="fd-back" d="' + path(pts) + '"/>' + label;
  }).join('');

  const laneNames = [
    'I 类 · 全量设计',
    'II 类 · 概要 + 详细',
    'III 类 · 详细设计',
    'IV 类 · 跳过设计',
  ];
  const laneLabels = laneNames
    .map((t, i) => {
      const active = ['I', 'II', 'III', 'IV'][i] === (h.designType || 'II');
      return (
        '<text class="fd-lane' +
        (active ? ' is-active' : '') +
        '" x="' +
        (S02.x + 18) +
        '" y="' +
        (LANES[i] + 4) +
        '">' +
        t +
        (active ? '（本项目）' : '') +
        '</text>'
      );
    })
    .join('');

  const note =
    '<g class="fd-note"><rect x="16" y="190" width="336" height="84" rx="9"/>' +
    '<text class="fd-note-title" x="32" y="218">测试路径提前确定</text>' +
    '<text class="fd-note-text" x="32" y="240">软件规格书定稿后，由测试组确认：</text>' +
    '<text class="fd-note-text" x="32" y="260">是否单板测试 / 是否长运测试</text></g>';
  const testNote =
    '<text class="fd-note-text" x="' +
    (S03.x + 26) +
    '" y="' +
    (ROW2_L2 + 76) +
    '">冒烟测试为必经节点；单板与长运按已确认的测试路径流转。</text><text class="fd-note-text" x="' +
    (S03.x + 26) +
    '" y="' +
    (ROW2_L2 + 94) +
    '">测试报告为输出物，所有测试路径汇入测试审核。</text>';
  const specialNote =
    '<text class="fd-note-text" x="' +
    (S04.x + 26) +
    '" y="' +
    (ROW2_L2 + 94) +
    '">紫色为特殊流程，评审通过后可直接进入版本发布。</text>';

  return (
    '<svg class="fd-svg" viewBox="0 0 ' +
    W +
    ' ' +
    H +
    '" role="group" aria-label="一体化研发全生命周期流程图">' +
    '<defs>' +
    ['grey', 'done', 'back', 'special']
      .map(
        (k) =>
          '<marker id="fd-arrow-' +
          k +
          '" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="fd-arrow-' +
          k +
          '" d="M0 0 L8 4 L0 8 z"/></marker>',
      )
      .join('') +
    '</defs>' +
    [S01, S02, S03, S04].map(renderSection).join('') +
    note +
    laneLabels +
    testNote +
    specialNote +
    edges.map((x) => x.html).join('') +
    edgeLabels +
    back +
    list.map((n) => renderNode(n, h.specTip)).join('') +
    '</svg>'
  );
}
