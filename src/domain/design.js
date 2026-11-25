/** 设计文档规则：锁定、前序评审与当前版本选取。 */

/** 评审已结束的设计文档状态，不允许再编辑。 */
export const FINAL_DESIGN_STATUSES = ['已结束', '评审通过'];

/** 评审已通过的设计文档状态（用于前序与阶段审核判断）。 */
const APPROVED_DESIGN_STATUSES = ['评审通过', '已结束'];

/**
 * 某类设计文档的前序文档是否已评审通过。
 *
 * @param {string} type 文档类型
 * @param {string[]} order 项目需要评审的文档类型（按先后排列）
 * @param {() => object[]} getRecords 读取设计文档记录；仅在需要时调用
 */
export function isPriorDesignApproved(type, order, getRecords) {
  const index = order.indexOf(type);
  if (index < 0) return false;
  if (index === 0) return true;
  return getRecords().some(
    (r) => r.docType === order[index - 1] && APPROVED_DESIGN_STATUSES.includes(r.status),
  );
}

/**
 * 设计文档是否只读：已评审结束、在「全部」视图中浏览、项目不需要该类文档，
 * 或前序文档尚未评审通过。getOrder / getRecords 仅在需要时调用。
 */
export function isDesignLocked(record, { category, getOrder, getRecords }) {
  if (record && FINAL_DESIGN_STATUSES.includes(record.status)) return true;
  if (category === '全部') return true;
  return !!(
    record &&
    (!getOrder().includes(record.docType) ||
      !isPriorDesignApproved(record.docType, getOrder(), getRecords))
  );
}

function versionNumber(record) {
  const m = String(record.version || '').match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  return m ? Number(m[1]) * 1000000 + Number(m[2]) * 1000 + Number(m[3] || 0) : 0;
}

/** 某类设计文档的当前版本：新建文档优先（越新越靠前），否则取版本号最大的一条。 */
export function currentDesignRecord(records, type) {
  const rows = records.filter((r) => r.docType === type);
  rows.sort((a, b) => {
    const aNew = /^DSN-NEW-/.test(a.id);
    const bNew = /^DSN-NEW-/.test(b.id);
    if (aNew !== bNew) return aNew ? -1 : 1;
    if (aNew && bNew) return Number(b.id.slice(8)) - Number(a.id.slice(8));
    return versionNumber(b) - versionNumber(a);
  });
  return rows[0] || null;
}

/** 当前版本尚未评审通过的设计文档类型。 */
export function missingDesignReviews(order, records) {
  return order.filter((type) => {
    const record = currentDesignRecord(records, type);
    return !record || !APPROVED_DESIGN_STATUSES.includes(record.status);
  });
}
