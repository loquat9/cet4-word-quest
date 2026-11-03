/**
 * 本地日期工具。
 *
 * 每日任务、连续学习天数与间隔重复都基于用户本地日历日，
 * 不能用 UTC 毫秒直接相减，否则跨时区/夏令时会错一天。
 */

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 生成 YYYY-MM-DD 形式的本地日期 key。
 */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 解析本地日期 key 为当天零点。
 * 非法格式或日历中不存在的日期（如 2026-02-30）返回 null。
 */
export function parseDateKey(key: string): Date | null {
  const match = DATE_KEY_PATTERN.exec(key);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/** 当天本地零点 */
export function startOfLocalDay(date: Date = new Date()): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
}

/**
 * 本地周一零点。周日归属上一个自然周。
 */
export function startOfLocalWeek(
  date: Date = new Date(),
): Date {
  const start = startOfLocalDay(date);
  const day = start.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + offset);
  return start;
}

/** 以每周一的 YYYY-MM-DD 作为周 key */
export function getWeekKey(date: Date = new Date()): string {
  return toDateKey(startOfLocalWeek(date));
}

/**
 * 加减本地自然日，保留原时间部分。
 * 使用 setDate 让浏览器/Node 处理月末与夏令时。
 */
export function addLocalDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * 两个时间点之间相差的本地自然日数（later - earlier）。
 * 只比较年月日，忽略时分秒，避免夏令时导致的 23/25 小时误差。
 */
export function diffLocalDays(later: Date, earlier: Date): number {
  const laterUtc = Date.UTC(
    later.getFullYear(),
    later.getMonth(),
    later.getDate(),
  );
  const earlierUtc = Date.UTC(
    earlier.getFullYear(),
    earlier.getMonth(),
    earlier.getDate(),
  );

  return Math.round((laterUtc - earlierUtc) / MS_PER_DAY);
}

export function isDateKeyToday(
  key: string,
  now: Date = new Date(),
): boolean {
  return key === toDateKey(now);
}

export function isDateKeyYesterday(
  key: string,
  now: Date = new Date(),
): boolean {
  const date = parseDateKey(key);
  if (!date) return false;
  return diffLocalDays(now, date) === 1;
}

/**
 * 把 ISO 时间格式化为 HH:mm:ss，用于展示“最近保存时间”。
 */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('zh-CN', { hour12: false });
}

/** 格式化为 YYYY/MM/DD，用于错词最近错误时间 */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/** 格式化为 MM/DD HH:mm，用于错词列表的紧凑展示 */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
