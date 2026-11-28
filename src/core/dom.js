/** DOM 与模板工具：选择器、HTML 转义和通用标签片段。 */
export const $ = (s) => document.querySelector(s);

export const $$ = (s) => [...document.querySelectorAll(s)];

export const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m],
  );

export const tag = (text, type = 'gray') => `<span class="tag ${type}">${text}</span>`;

export const person = (name, initial = name[0]) =>
  `<div class="person"><i class="mini-avatar">${initial}</i>${name}</div>`;
