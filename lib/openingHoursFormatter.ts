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

  // Handle single days
  if (DAY_CODES[lower]) {
    return DAY_CODES[lower][loc];
  }

  // Handle combinations like "Tu-Sa" or "Sa, Su"
  const rangeMatch = lower.match(/^([a-z]{2})-([a-z]{2})$/);
  if (rangeMatch) {
    const start = DAY_CODES[rangeMatch[1]]?.[loc];
    const end = DAY_CODES[rangeMatch[2]]?.[loc];
    if (start && end) return `${start} - ${end}`;
  }

  const commaParts = lower.split(',').map(p => p.trim());
  if (commaParts.length > 1 && commaParts.every(p => DAY_CODES[p])) {
    return commaParts.map(p => DAY_CODES[p][loc]).join(', ');
  }

  return token.trim();
}

/**
 * Humanizes OpenStreetMap opening_hours strings (e.g. 'Mo-Fr 08:30-19:00; Sa 09:00-14:00; Su off')
 * into clean, localized lines with proper weekend formatting and closed labels.
 */
export function formatOpeningHours(raw?: string | null): FormattedHours {
  if (!raw || !raw.trim()) {
    return { summary: '', lines: [] };
  }

  const trimmed = raw.trim();

  // Check 24/7
  if (trimmed.toLowerCase().includes('24/7')) {
    const text247 = getLocalized247();
    return {
      summary: text247,
      lines: [{ days: getLocale() === 'tr' ? 'Tüm günler' : 'All days', hours: text247 }],
      isOpenNow: true,
    };
  }

  // Split by semicolon or comma where comma separates days
  // e.g. "Mo-Fr 08:00-18:00; Sa 09:00-13:00; Su off"
  const segments = trimmed.split(';').map(s => s.trim()).filter(Boolean);
  const lines: ScheduleLine[] = [];

  const closedText = getLocalizedClosed();

  for (const seg of segments) {
    // Look for day tokens and time/status
    // Typical pattern: "<days> <times/off>" e.g. "Mo-Fr 08:30-19:00", "Sa 09:00-13:00", "Su off"
    const match = seg.match(/^([A-Za-z,-]+)\s+(.+)$/);
    if (match) {
      const daysPart = formatDaysToken(match[1]);
      let hoursPart = match[2].trim();

      const isClosed = /^(off|closed|kapalı|chiuso)$/i.test(hoursPart);
      if (isClosed) {
        hoursPart = closedText;
      } else {
        // Replace single hyphen with formatted en-dash
        hoursPart = hoursPart.replace(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/g, '$1 – $2');
      }

      lines.push({
        days: daysPart,
        hours: hoursPart,
        isClosed,
      });
    } else {
      // Unstructured or single status (e.g. "closed" or "09:00-18:00")
      if (/^(off|closed)$/i.test(seg)) {
        lines.push({ days: getLocalizedWeekend(), hours: closedText, isClosed: true });
      } else {
        lines.push({ days: seg, hours: '' });
      }
    }
  }

  if (lines.length === 0) {
    return { summary: trimmed, lines: [] };
  }

  // Generate a clean summary string for preview cards
  // e.g. "Mon - Fri: 08:30 – 19:00 · Sat: 09:00 – 14:00"
  const summaryParts = lines
    .filter(l => !l.isClosed || lines.length <= 2)
    .map(l => (l.hours ? `${l.days}: ${l.hours}` : l.days));

  const summary = summaryParts.length > 0 ? summaryParts.join(' · ') : lines[0].days + ': ' + lines[0].hours;

  return { summary, lines };
}
