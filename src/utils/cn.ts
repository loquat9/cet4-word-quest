export type ClassValue = string | false | null | undefined;

/**
 * 轻量 className 合并工具，避免为阶段 0 引入额外依赖。
 */
export function cn(...values: ClassValue[]): string {
  return values.filter((value): value is string => Boolean(value)).join(' ');
}
