/**
 * @format
 */

import { describe, it, expect } from '@jest/globals';

// 基础测试，验证框架配置
describe('Telos Mobile App', () => {
  it('should have basic configuration', () => {
    expect(true).toBe(true);
  });

  it('should support TypeScript', () => {
    const testValue: string = 'Hello Telos';
    expect(testValue).toBe('Hello Telos');
  });
});
