/**
 * 演示账号。正式环境由平台统一鉴权，见 core/auth.js。
 * 所有演示账号的密码均为 DEMO_PASSWORD。
 */
export const DEMO_PASSWORD = 'Demo@2026';

export const ACCOUNTS = [
  { username: 'pm', name: '何盈', role: 'product', department: '产品与解决方案部' },
  { username: 'pjm', name: '王凯', role: 'project', department: '软件一科' },
  { username: 'dev', name: '孙宁', role: 'developer', department: '软件一科' },
  { username: 'qa', name: '赵敏', role: 'tester', department: '质量部' },
  { username: 'reviewer', name: '李明', role: 'reviewer', department: '软件一科' },
  { username: 'lead', name: '周航', role: 'supervisor', department: '研发中心' },
  { username: 'director', name: '陈立', role: 'rdDirector', department: '研发中心' },
  { username: 'rdlead', name: '刘洋', role: 'rdManager', department: '软件一科' },
  { username: 'testlead', name: '王芳', role: 'testManager', department: '质量部' },
  { username: 'qalead', name: '张敏', role: 'qualityManager', department: '质量部' },
];
