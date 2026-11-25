/** 个人菜单：个人信息、修改密码与退出登录。 */
import { closeDrawer, openDrawer, openModal } from './overlays.js';
import { showToast } from './toast.js';

/** 个人菜单（个人信息 / 修改密码 / 退出） */
export function bindProfileMenu() {
  document.addEventListener('click', function (e) {
    var menu = document.querySelector('#profileMenu');
    if (!menu) return;
    var el = e.target.closest('[data-profile-action]');
    if (!el) {
      if (!e.target.closest('#profileMenu')) menu.classList.remove('show');
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    var action = el.dataset.profileAction;
    if (action === 'toggle') {
      menu.classList.toggle('show');
      return;
    }
    menu.classList.remove('show');
    if (action === 'personal') {
      openDrawer(
        '个人信息',
        '<div class="form-card" style="padding:0;border:0;box-shadow:none"><div class="kv-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));padding:0"><div class="kv"><label>姓名</label><div>何盈</div></div><div class="kv"><label>账号</label><div>heying</div></div><div class="kv"><label>所属部门</label><div>软件一科</div></div><div class="kv"><label>当前角色</label><div>产品经理</div></div><div class="kv"><label>账号状态</label><div><span class="tag green">正常</span></div></div><div class="kv"><label>最近登录</label><div>2026-08-16 09:24</div></div></div></div>',
        '<button class="btn" data-action="close-drawer">关闭</button>',
      );
      return;
    }
    if (action === 'password') {
      openDrawer(
        '修改密码',
        '<div class="form-card" style="padding:0;border:0;box-shadow:none"><div class="form-grid" style="grid-template-columns:1fr;gap:14px"><div class="field"><label>当前密码</label><input type="password" placeholder="请输入当前密码"></div><div class="field"><label>新密码</label><input type="password" placeholder="请输入新密码"></div><div class="field"><label>确认新密码</label><input type="password" placeholder="请再次输入新密码"></div></div></div>',
        '<button class="btn" data-profile-action="password-cancel">取消</button><button class="btn primary" data-profile-action="password-save">保存密码</button>',
      );
      return;
    }
    if (action === 'password-cancel') {
      closeDrawer();
      return;
    }
    if (action === 'password-save') {
      closeDrawer();
      showToast('密码修改已保存');
      return;
    }
    if (action === 'logout') {
      openModal(
        'profile-logout',
        '退出登录',
        '<div class="notice warn"><i>!</i><span>确定退出当前账号吗？</span></div>',
        '<button class="btn" data-profile-action="logout-cancel">取消</button><button class="btn danger" data-profile-action="logout-confirm">退出登录</button>',
      );
      return;
    }
    if (action === 'logout-cancel') {
      document.querySelector('#modalRoot').classList.remove('show');
      return;
    }
    if (action === 'logout-confirm') {
      document.querySelector('#modalRoot').classList.remove('show');
      showToast('已退出登录');
      return;
    }
  });
}
