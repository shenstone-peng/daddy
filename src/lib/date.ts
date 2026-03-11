const DAY_IN_MS = 24 * 60 * 60 * 1000;
const TOTAL_PREGNANCY_DAYS = 280;

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function startOfDay(input: Date) {
  const next = new Date(input);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function addDays(input: Date, days: number) {
  const next = new Date(input);
  next.setDate(next.getDate() + days);
  return next;
}

export function parseDateInput(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toDateInputValue(input: Date) {
  const year = input.getFullYear();
  const month = String(input.getMonth() + 1).padStart(2, '0');
  const day = String(input.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function diffInDays(left: Date, right: Date) {
  return Math.round((startOfDay(left).getTime() - startOfDay(right).getTime()) / DAY_IN_MS);
}

export function compareDateInputs(left: string, right: string) {
  return parseDateInput(left).getTime() - parseDateInput(right).getTime();
}

export function formatHeaderDate(input: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(input);
}

export function formatLongDate(input: string | Date) {
  const date = typeof input === 'string' ? parseDateInput(input) : input;
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
}

export function formatCompactDate(input: string | Date) {
  const date = typeof input === 'string' ? parseDateInput(input) : input;
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
  }).format(date);
}

export function formatMonthDay(input: string | Date) {
  const date = typeof input === 'string' ? parseDateInput(input) : input;
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatRelativeLabel(input: string) {
  const days = diffInDays(parseDateInput(input), new Date());
  if (days === 0) {
    return '今天';
  }

  if (days === 1) {
    return '明天';
  }

  if (days > 1) {
    return `${days} 天后`;
  }

  if (days === -1) {
    return '昨天';
  }

  return `逾期 ${Math.abs(days)} 天`;
}

export function formatRemainingDays(days: number) {
  if (days <= 0) {
    return '预产期已到';
  }

  return `还有 ${days} 天`;
}

export function getPregnancyWeekDate(dueDate: string, week: number, offsetDays = 0) {
  const due = parseDateInput(dueDate);
  return toDateInputValue(addDays(due, -((40 - week) * 7) + offsetDays));
}

export function getPregnancyOverview(dueDate: string) {
  const due = parseDateInput(dueDate);
  const pregnancyStart = addDays(due, -TOTAL_PREGNANCY_DAYS);
  const today = startOfDay(new Date());
  const daysElapsed = clamp(diffInDays(today, pregnancyStart), 0, TOTAL_PREGNANCY_DAYS);
  const currentWeek = clamp(Math.floor(daysElapsed / 7) + 1, 1, 40);
  const daysRemaining = Math.max(diffInDays(due, today), 0);
  const trimester = currentWeek <= 13 ? '孕早期' : currentWeek <= 27 ? '孕中期' : '孕晚期';
  const completion = Math.round((daysElapsed / TOTAL_PREGNANCY_DAYS) * 100);

  return {
    currentWeek,
    daysRemaining,
    trimester,
    completion,
    pregnancyStart,
  };
}

export function getDefaultDueDate() {
  return toDateInputValue(addDays(new Date(), 112));
}
