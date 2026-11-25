/**
 * 登录鉴权。
 *
 * 页面只通过 login / logout / currentUser 使用鉴权，不关心账号来自哪里。
 * 当前使用演示账号（mockAuthProvider）；接入平台鉴权时，实现同样三个方法的
 * provider 并调用 setAuthProvider 即可，页面代码无需修改。
 */
import { ACCOUNTS, DEMO_PASSWORD } from '../data/accounts.js';

const SESSION_KEY = 'rd-platform-session';

/** 演示账号鉴权：登录状态保存在浏览器会话中，关闭浏览器后失效。 */
export const mockAuthProvider = {
  login(username, password) {
    const account = ACCOUNTS.find((a) => a.username === String(username || '').trim());
    if (!account || password !== DEMO_PASSWORD) return { ok: false, reason: '账号或密码错误' };
    const user = {
      username: account.username,
      name: account.name,
      role: account.role,
      department: account.department,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return { ok: true, user };
  },
  logout() {
    sessionStorage.removeItem(SESSION_KEY);
  },
  currentUser() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || null;
    } catch {
      return null;
    }
  },
};

let provider = mockAuthProvider;

/** 替换鉴权实现（例如接入平台统一登录）。 */
export function setAuthProvider(next) {
  provider = next;
}

export const login = (username, password) => provider.login(username, password);
export const logout = () => provider.logout();
export const currentUser = () => provider.currentUser();
