#!/usr/bin/env node
/**
 * Behaviour regression check.
 *
 * Builds a baseline git ref and the current working tree, then compares them with
 * an exploratory crawl, scripted business scenarios and screenshots.
 *
 *   pnpm test:regression                     # baseline = HEAD
 *   pnpm test:regression -- --base <ref>     # baseline = any commit / branch
 *   pnpm test:regression -- --no-shots       # skip screenshot comparison
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { crawl } from './crawl.mjs';
import { runScenarios } from './scenarios.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const base = opt('--base', 'HEAD');
const clicks = Number(opt('--clicks', '30'));
const shots = !args.includes('--no-shots');
const out = path.join(root, '.regression');
const vite = path.join(root, 'node_modules', '.bin', 'vite');

const log = (...m) => console.log('[regression]', ...m);

function build(srcRoot, outDir) {
  fs.rmSync(outDir, { recursive: true, force: true });
  const pkgPath = path.join(srcRoot, 'package.json');
  const isVite = fs.existsSync(pkgPath) && /"vite"/.test(fs.readFileSync(pkgPath, 'utf8'));
  if (isVite) {
    execFileSync(
      vite,
      ['build', srcRoot, '--outDir', outDir, '--emptyOutDir', '--logLevel', 'error'],
      {
        cwd: root,
        stdio: 'inherit',
      },
    );
  } else {
    fs.cpSync(srcRoot, outDir, { recursive: true, filter: (p) => !p.includes(`${path.sep}.git`) });
  }
}

function serve(dir) {
  return new Promise((resolve) => {
    const types = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
    };
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const file = path.join(dir, rel === '/' ? 'index.html' : rel);
      if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, {
        'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () =>
      resolve({ server, url: `http://127.0.0.1:${server.address().port}/` }),
    );
  });
}

function compareSteps(a, b, label) {
  const issues = [];
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i];
    const y = b[i];
    if (!x || !y) {
      issues.push(
        `${label} 步骤数不同：基线 ${a.length}，当前 ${b.length}（首个缺失：${(x || y).ctx}）`,
      );
      break;
    }
    const fields = Object.keys({ ...x.snap, ...y.snap }).filter((k) => x.snap[k] !== y.snap[k]);
    if (x.ctx !== y.ctx || x.act !== y.act) fields.push('操作路径');
    if (x.status !== y.status) fields.push(`执行结果(${x.status} → ${y.status})`);
    if (fields.length) issues.push(`${x.ctx} | ${x.act.slice(0, 80)} => ${fields.join(', ')}`);
  }
  return issues;
}

async function collect(name, dir) {
  const { server, url } = await serve(dir);
  const shotsDir = path.join(out, `shots-${name}`);
  fs.rmSync(shotsDir, { recursive: true, force: true });
  if (shots) fs.mkdirSync(shotsDir, { recursive: true });
  try {
    log(`${name}：遍历页面…`);
    const c = await crawl(url, {
      clicks,
      screenshots: shots,
      onShot: (i, buf) => fs.writeFileSync(path.join(shotsDir, `${i}.png`), buf),
    });
    log(`${name}：执行业务场景…`);
    const s = await runScenarios(url);
    return { crawl: c, scenarios: s, shotsDir };
  } finally {
    server.close();
  }
}

function compareShots(dirA, dirB) {
  const diffs = [];
  const diffDir = path.join(out, 'shots-diff');
  fs.rmSync(diffDir, { recursive: true, force: true });
  for (const f of fs.readdirSync(dirA)) {
    const fb = path.join(dirB, f);
    if (!fs.existsSync(fb)) {
      diffs.push(`${f} 缺失`);
      continue;
    }
    const a = PNG.sync.read(fs.readFileSync(path.join(dirA, f)));
    const b = PNG.sync.read(fs.readFileSync(fb));
    if (a.width !== b.width || a.height !== b.height) {
      diffs.push(`${f} 尺寸不同`);
      continue;
    }
    const d = new PNG({ width: a.width, height: a.height });
    const n = pixelmatch(a.data, b.data, d.data, a.width, a.height, { threshold: 0.1 });
    if (n) {
      fs.mkdirSync(diffDir, { recursive: true });
      fs.writeFileSync(path.join(diffDir, f), PNG.sync.write(d));
      diffs.push(`${f} 有 ${n} 个像素不同`);
    }
  }
  return diffs;
}

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const wt = fs.mkdtempSync(path.join(os.tmpdir(), 'regression-base-'));
  log(`构建基线 ${base}…`);
  execFileSync('git', ['worktree', 'add', '--detach', '--force', wt, base], {
    cwd: root,
    stdio: 'ignore',
  });
  try {
    build(wt, path.join(out, 'base'));
  } finally {
    execFileSync('git', ['worktree', 'remove', '--force', wt], { cwd: root, stdio: 'ignore' });
  }
  log('构建当前工作区…');
  build(root, path.join(out, 'current'));

  const A = await collect('base', path.join(out, 'base'));
  const B = await collect('current', path.join(out, 'current'));

  const report = [];
  const crawlDiffs = compareSteps(A.crawl.steps, B.crawl.steps, '遍历');
  report.push(`页面遍历：${B.crawl.steps.length} 步，差异 ${crawlDiffs.length}`);
  const scenarioDiffs = [];
  const broken = [];
  A.scenarios.results.forEach((sa, i) => {
    const sb = B.scenarios.results[i];
    scenarioDiffs.push(...compareSteps(sa.steps, sb.steps, sa.name));
    sa.steps.filter((s) => s.status !== 'ok').forEach((s) => broken.push(`${s.ctx}: ${s.status}`));
    const endToast = (steps) => {
      const last = [...steps].reverse().find((s) => s.toasts.length);
      return last ? last.toasts.join(' / ') : '无';
    };
    const a = endToast(sa.steps);
    const b = endToast(sb.steps);
    report.push(
      `场景「${sa.name}」：${sa.steps.length} 步，终点提示「${a}」${a === b ? '' : ` → 当前「${b}」`}`,
    );
  });
  report.push(`业务场景差异：${scenarioDiffs.length}`);
  const shotDiffs = shots ? compareShots(A.shotsDir, B.shotsDir) : [];
  if (shots) report.push(`截图：${fs.readdirSync(A.shotsDir).length} 张，差异 ${shotDiffs.length}`);
  const newErrors = [...new Set([...B.crawl.errors, ...B.scenarios.errors])].filter(
    (e) => ![...A.crawl.errors, ...A.scenarios.errors].includes(e),
  );
  report.push(`新增运行时错误：${newErrors.length}`);

  console.log('\n' + report.join('\n'));
  const show = (title, list) => {
    if (list.length) console.log(`\n${title}（前 15 条）：\n  ` + list.slice(0, 15).join('\n  '));
  };
  show('页面遍历差异', crawlDiffs);
  show('业务场景差异', scenarioDiffs);
  show('截图差异（差异图见 .regression/shots-diff）', shotDiffs);
  show('新增运行时错误', newErrors);
  show('基线中无法执行的场景步骤（场景脚本可能需要更新）', broken);
  fs.writeFileSync(
    path.join(out, 'report.json'),
    JSON.stringify({ base, crawlDiffs, scenarioDiffs, shotDiffs, newErrors, broken }, null, 2),
  );

  const failed = crawlDiffs.length || scenarioDiffs.length || shotDiffs.length || newErrors.length;
  console.log(failed ? '\n结果：存在差异' : '\n结果：与基线一致');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
