/** 登录页：输入账号密码登录；下方列出演示账号，点击即可填入。 */
import { ACCOUNTS, DEMO_PASSWORD } from '../data/accounts.js';
import { ROLE_LABELS } from '../domain/permissions.js';
import { esc } from '../core/dom.js';
import { login } from '../core/auth.js';

export function renderLogin() {
  document.body.classList.add('is-login');
  const root = document.createElement('main');
  root.className = 'login-page';
  root.innerHTML = `
    <section class="login-card" aria-labelledby="loginTitle">
      <div class="login-brand"><span class="brand-mark"></span><span>一体化研发平台</span></div>
      <h1 id="loginTitle">登录</h1>
      <p class="login-sub">使用平台账号登录，系统按账号角色展示对应的工作界面。</p>
      <form class="login-form" novalidate>
        <label class="field"><span>账号</span><input class="input" name="username" autocomplete="username" data-login="username" required /></label>
        <label class="field"><span>密码</span><input class="input" name="password" type="password" autocomplete="current-password" data-login="password" required /></label>
        <p class="login-error" role="alert" data-login="error"></p>
        <button class="btn primary login-submit" type="submit" data-login="submit">登录</button>
      </form>
      <details class="login-demo">
        <summary>演示账号（密码 ${esc(DEMO_PASSWORD)}）</summary>
        <div class="login-demo-list">
          ${ACCOUNTS.map(
            (a) =>
              `<button type="button" class="login-demo-item" data-demo-account="${esc(a.username)}"><b>${esc(ROLE_LABELS[a.role])}</b><span>${esc(a.username)} · ${esc(a.name)}</span></button>`,
          ).join('')}
        </div>
      </details>
    </section>`;
  document.body.appendChild(root);

  const form = root.querySelector('form');
  const field = (name) => root.querySelector(`[data-login="${name}"]`);
  root.addEventListener('click', (e) => {
    const item = e.target.closest('[data-demo-account]');
    if (!item) return;
    field('username').value = item.dataset.demoAccount;
    field('password').value = DEMO_PASSWORD;
    field('password').focus();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const result = login(field('username').value, field('password').value);
    if (!result.ok) {
      field('error').textContent = result.reason;
      return;
    }
    window.location.reload();
  });
  field('username').focus();
}
