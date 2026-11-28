import { describe, expect, it } from 'vitest';
import {
  currentDesignRecord,
  isDesignLocked,
  isPriorDesignApproved,
  missingDesignReviews,
} from '../../src/domain/design.js';

const order = ['软件规格书', '概要设计', '详细设计'];
const records = [
  { id: 'DSN-001-V100', docType: '软件规格书', version: 'V1.0.0', status: '评审通过' },
  { id: 'DSN-003-V100', docType: '概要设计', version: 'V1.0.0', status: '进行中' },
];

describe('isPriorDesignApproved', () => {
  it('treats the first document as approved and unknown types as not approved', () => {
    expect(isPriorDesignApproved('软件规格书', order, () => [])).toBe(true);
    expect(isPriorDesignApproved('软件架构设计', order, () => records)).toBe(false);
  });

  it('checks the previous document type', () => {
    expect(isPriorDesignApproved('概要设计', order, () => records)).toBe(true);
    expect(isPriorDesignApproved('详细设计', order, () => records)).toBe(false);
  });
});

describe('isDesignLocked', () => {
  const ctx = (over = {}) => ({
    category: '概要设计',
    getOrder: () => order,
    getRecords: () => records,
    ...over,
  });

  it('locks finished documents and the "全部" view', () => {
    expect(isDesignLocked({ docType: '概要设计', status: '评审通过' }, ctx())).toBe(true);
    expect(
      isDesignLocked({ docType: '概要设计', status: '进行中' }, ctx({ category: '全部' })),
    ).toBe(true);
  });

  it('locks documents the project does not need or whose predecessor is not approved', () => {
    expect(isDesignLocked({ docType: '软件架构设计', status: '进行中' }, ctx())).toBe(true);
    expect(isDesignLocked({ docType: '详细设计', status: '进行中' }, ctx())).toBe(true);
    expect(isDesignLocked({ docType: '概要设计', status: '进行中' }, ctx())).toBe(false);
  });

  it('does not read the order or records when an earlier rule already decides', () => {
    const fail = () => {
      throw new Error('should not be read');
    };
    expect(
      isDesignLocked(
        { docType: '概要设计', status: '已结束' },
        ctx({ getOrder: fail, getRecords: fail }),
      ),
    ).toBe(true);
  });
});

describe('currentDesignRecord / missingDesignReviews', () => {
  it('prefers the newest draft, then the highest version', () => {
    const rows = [
      { id: 'DSN-002-V100', docType: '概要设计', version: 'V1.0.0' },
      { id: 'DSN-002-V110', docType: '概要设计', version: 'V1.1.0' },
    ];
    expect(currentDesignRecord(rows, '概要设计').id).toBe('DSN-002-V110');
    const withDrafts = [
      ...rows,
      { id: 'DSN-NEW-1', docType: '概要设计' },
      { id: 'DSN-NEW-2', docType: '概要设计' },
    ];
    expect(currentDesignRecord(withDrafts, '概要设计').id).toBe('DSN-NEW-2');
    expect(currentDesignRecord(rows, '详细设计')).toBeNull();
  });

  it('lists document types whose current version is not approved', () => {
    expect(missingDesignReviews(order, records)).toEqual(['概要设计', '详细设计']);
  });
});
