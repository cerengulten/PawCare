import { i18n } from './i18n';

export type ScheduleLine = {
  days: string;
  hours: string;
  isClosed?: boolean;
  isToday?: boolean;
};

export type FormattedHours = {
  summary: string;
  lines: ScheduleLine[];
  isOpenNow?: boolean | null;
};

const DAY_CODES: Record<string, { en: string; tr: string; it: string; dayIndex: number }> = {
  mo: { en: 'Monday', tr: 'Pazartesi', it: 'Lunedì', dayIndex: 1 },
  tu: { en: 'Tuesday', tr: 'Salı', it: 'Martedì', dayIndex: 2 },
  we: { en: 'Wednesday', tr: 'Çarşamba', it: 'Mercoledì', dayIndex: 3 },
  th: { en: 'Thursday', tr: 'Perşembe', it: 'Giovedì', dayIndex: 4 },
  fr: { en: 'Friday', tr: 'Cuma', it: 'Venerdì', dayIndex: 5 },
  sa: { en: 'Saturday', tr: 'Cumartesi', it: 'Sabato', dayIndex: 6 },
  su: { en: 'Sunday', tr: 'Pazar', it: 'Domenica', dayIndex: 0 },
};

function getLocale(): 'en' | 'tr' | 'it' {
  const loc = (i18n.locale || 'en').toLowerCase();
  if (loc.startsWith('tr')) return 'tr';
  if (loc.startsWith('it')) return 'it';
  return 'en';
}

function getLocalizedClosed(): string {
  const loc = getLocale();
  if (loc === 'tr') return 'Kapalı';
  if (loc === 'it') return 'Chiuso';
  return 'Closed';
}

function getLocalized247(): string {
  const loc = getLocale();
  if (loc === 'tr') return '7/24 Açık';
  if (loc === 'it') return 'Aperto 24/7';
  return 'Open 24/7';
}

function getLocalizedWeekend(): string {
  const loc = getLocale();
  if (loc === 'tr') return 'Hafta sonu (Cmt - Paz)';
  if (loc === 'it') return 'Weekend (Sab - Dom)';
  return 'Weekend (Sat - Sun)';
}

function getLocalizedWeekdays(): string {
  const loc = getLocale();
  if (loc === 'tr') return 'Hafta içi (Pzt - Cum)';
  if (loc === 'it') return 'Lun - Ven';
  return 'Mon - Fri';
}

function tokenMatchesDayIndex(token: string, targetDayIdx: number): boolean {
  const lower = token.trim().toLowerCase();
  if (lower === 'mo-su') return true;
  if (lower === 'mo-fr') return targetDayIdx >= 1 && targetDayIdx <= 5;
  if (lower === 'mo-sa') return targetDayIdx >= 1 && targetDayIdx <= 6;
  if (lower === 'sa-su' || lower === 'sa,su' || lower === 'su,sa') {
    return targetDayIdx === 6 || targetDayIdx === 0;
  }
  if (DAY_CODES[lower]) {
    return DAY_CODES[lower].dayIndex === targetDayIdx;
  }
  const rangeMatch = lower.match(/^([a-z]{2})-([a-z]{2})$/);
  if (rangeMatch && DAY_CODES[rangeMatch[1]] && DAY_CODES[rangeMatch[2]]) {
    const s = DAY_CODES[rangeMatch[1]].dayIndex === 0 ? 7 : DAY_CODES[rangeMatch[1]].dayIndex;
    const e = DAY_CODES[rangeMatch[2]].dayIndex === 0 ? 7 : DAY_CODES[rangeMatch[2]].dayIndex;
    const t = targetDayIdx === 0 ? 7 : targetDayIdx;
    return t >= s && t <= e;
  }
  const commaParts = lower.split(',').map((p) => p.trim());
  if (commaParts.length > 1) {
    return commaParts.some((p) => DAY_CODES[p]?.dayIndex === targetDayIdx);
  }
  return false;
}

function checkTimeRangeOpen(hoursRaw: string, nowMins: number): boolean | null {
  const ranges = hoursRaw.split(',').map((r) => r.trim());
  let matchedFormat = false;
  for (const r of ranges) {
    const m = r.match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/);
    if (m) {
      matchedFormat = true;
      const startMins = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
      let endMins = parseInt(m[3], 10) * 60 + parseInt(m[4], 10);
      if (endMins <= startMins) endMins += 24 * 60;
      if (nowMins >= startMins && nowMins <= endMins) {
        return true;
      }
    }
  }
  return matchedFormat ? false : null;
}

function formatDaysToken(token: string): string {
  const loc = getLocale();
  const lower = token.trim().toLowerCase();

  if (lower === 'mo-fr') return getLocalizedWeekdays();
  if (lower === 'sa-su' || lower === 'sa,su' || lower === 'su,sa') return getLocalizedWeekend();
  if (lower === 'mo-sa') {
    if (loc === 'tr') return 'Pzt - Cmt';
    if (loc === 'it') return 'Lun - Sab';
    return 'Mon - Sat';
  }
  if (lower === 'mo-su') {
    if (loc === 'tr') return 'Her gün';
    if (loc === 'it') return 'Tutti i giorni';
    return 'Every day';
  }
  if (lower === 'ph') {
    if (loc === 'tr') return 'Resmi Tatiller';
    if (loc === 'it') return 'Festivi';
    return 'Public Holidays';
  }

  if (DAY_CODES[lower]) {
    return DAY_CODES[lower][loc];
  }

  const rangeMatch = lower.match(/^([a-z]{2})-([a-z]{2})$/);
  if (rangeMatch) {
    const start = DAY_CODES[rangeMatch[1]]?.[loc];
    const end = DAY_CODES[rangeMatch[2]]?.[loc];
    if (start && end) return `${start} - ${end}`;
  }

  const commaParts = lower.split(',').map((p) => p.trim());
  if (commaParts.length > 1 && commaParts.every((p) => DAY_CODES[p])) {
    return commaParts.map((p) => DAY_CODES[p][loc]).join(', ');
  }

  return token.trim();
}

export function formatOpeningHours(raw?: string | null): FormattedHours {
  if (!raw || !raw.trim()) {
    return { summary: '', lines: [], isOpenNow: null };
  }

  const trimmed = raw.trim();

  if (trimmed.toLowerCase().includes('24/7')) {
    const text247 = getLocalized247();
    return {
      summary: text247,
      lines: [{ days: getLocale() === 'tr' ? 'Tüm günler' : 'All days', hours: text247, isToday: true }],
      isOpenNow: true,
    };
  }

  const now = new Date();
  const todayDayIdx = now.getDay();
  const nowMins = now.getHours() * 60 + now.getMinutes();

  const segments = trimmed
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  const lines: ScheduleLine[] = [];
  const closedText = getLocalizedClosed();
  let evaluatedOpenNow: boolean | null = null;

  for (const seg of segments) {
    const match = seg.match(/^([A-Za-z,-]+)\s+(.+)$/);
    if (match) {
      const rawToken = match[1];
      const daysPart = formatDaysToken(rawToken);
      let hoursPart = match[2].trim();
      const isToday = tokenMatchesDayIndex(rawToken, todayDayIdx);

      const isClosed = /^(off|closed|kapalı|chiuso)$/i.test(hoursPart);
      if (isClosed) {
        hoursPart = closedText;
        if (isToday) evaluatedOpenNow = false;
      } else {
        hoursPart = hoursPart.replace(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/g, '$1 – $2');
        if (isToday) {
          evaluatedOpenNow = checkTimeRangeOpen(hoursPart, nowMins);
        }
      }

      lines.push({
        days: daysPart,
        hours: hoursPart,
        isClosed,
        isToday,
      });
    } else {
      if (/^(off|closed)$/i.test(seg)) {
        lines.push({ days: getLocalizedWeekend(), hours: closedText, isClosed: true });
      } else {
        const formatted = seg.replace(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/g, '$1 – $2');
        const maybeOpen = checkTimeRangeOpen(formatted, nowMins);
        if (maybeOpen !== null) evaluatedOpenNow = maybeOpen;
        lines.push({ days: formatted, hours: '' });
      }
    }
  }

  if (lines.length === 0) {
    return { summary: trimmed, lines: [], isOpenNow: null };
  }

  const summaryParts = lines
    .filter((l) => !l.isClosed || lines.length <= 2)
    .map((l) => (l.hours ? `${l.days}: ${l.hours}` : l.days));

  const summary =
    summaryParts.length > 0 ? summaryParts.join(' · ') : lines[0].days + ': ' + lines[0].hours;

  return { summary, lines, isOpenNow: evaluatedOpenNow };
}
