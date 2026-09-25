export type DateFilterType = 'all' | 'today' | 'tomorrow' | 'weekend' | 'week' | 'month' | 'past' | 'custom';

/**
 * Normalizes 2-digit years to 4-digit years.
 * In 2026, 2-digit years like 26, 27, 28, 29, 30 are 2026, 2027, etc.
 * 00-69 -> 2000-2069 (e.g. 26 -> 2026)
 * 70-99 -> 1970-1999 (e.g. 99 -> 1999)
 */
export const normalizeTwoDigitYear = (yr: number): number => {
  if (yr < 100) {
    return yr < 70 ? 2000 + yr : 1900 + yr;
  }
  return yr;
};

/**
 * Safely parses all supported date formats into a local Date object:
 * - xx-xx-xxxx (e.g. 10-15-2026, 2026-10-15, 15-10-2026)
 * - xx-xx-xx   (e.g. 10-15-26, 26-10-15, 15-10-26)
 * - xx/xx/xxxx (e.g. 10/15/2026, 2026/10/15, 15/10/2026)
 * - xx/xx/xx   (e.g. 10/15/26, 26/10/15, 15/10/26)
 * - xx.xx.xxxx and xx.xx.xx
 * - ISO-8601 strings (e.g. 2026-10-15T19:00:00.000Z)
 * - Textual dates (e.g. "October 15, 2026", "Oct 15, 2026", "Oct 15, 26")
 */
export const parseEventDate = (dateStr?: string): Date | null => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  try {
    let clean = dateStr.trim();
    if (clean.includes('T')) clean = clean.split('T')[0];

    // Delimiters: -, /, .
    const parts = clean.split(/[-/.]/);
    if (parts.length === 3 && parts.every(p => /^\d+$/.test(p.trim()))) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);

      let y = 0, m = 0, d = 0;

      if (parts[0].length === 4) {
        // YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
        y = p0;
        m = p1;
        d = p2;
      } else if (parts[2].length === 4) {
        // MM-DD-YYYY, MM/DD/YYYY, or DD-MM-YYYY
        y = p2;
        if (p0 > 12 && p1 <= 12) {
          // e.g. 25-10-2026 -> day 25, month 10
          d = p0;
          m = p1;
        } else {
          // US standard: MM-DD-YYYY or MM/DD/YYYY
          m = p0;
          d = p1;
        }
      } else {
        // All parts are 1 or 2 digits: xx-xx-xx or xx/xx/xx
        const y0 = normalizeTwoDigitYear(p0);
        const y2 = normalizeTwoDigitYear(p2);
        const currentYear = new Date().getFullYear();

        if (p1 > 12) {
          // p1 cannot be a month, so p1 is the day: MM-DD-YY or MM/DD/YY
          y = y2;
          m = p0;
          d = p1;
        } else if (p0 > 12 && p2 > 12) {
          // One is day and one is year, p1 is month.
          // Choose the one that yields a current/future year (>= currentYear), or default to p2 as year
          if (y0 >= currentYear && y2 < currentYear) {
            // e.g. 26-10-25 -> Year 2026, Month 10, Day 25
            y = y0;
            m = p1;
            d = p2;
          } else {
            // e.g. 25-10-26 -> Day 25, Month 10, Year 2026
            y = y2;
            m = p1;
            d = p0;
          }
        } else if (p0 > 12) {
          // p0 cannot be month.
          // If p0 is a plausible 2-digit year (>= 20) and p2 is not a plausible 2-digit year (< 20)
          // e.g. 26-10-05 (YY-MM-DD)
          if (p0 >= 20 && p2 < 20) {
            y = y0;
            m = p1;
            d = p2;
          } else {
            // e.g. 15-10-26 (DD-MM-YY)
            y = y2;
            m = p1;
            d = p0;
          }
        } else if (p2 >= 20 && p2 <= 99) {
          // Standard US: MM-DD-YY or MM/DD/YY (e.g. 10-15-26, 05-08-26)
          y = y2;
          m = p0;
          d = p1;
        } else if (p0 >= 20 && p0 <= 99 && p2 <= 12) {
          // Short ISO: YY-MM-DD (e.g. 26-05-08)
          y = y0;
          m = p1;
          d = p2;
        } else {
          // Default to US standard MM-DD-YY
          y = y2;
          m = p0;
          d = p1;
        }
      }

      // If month > 12 and day <= 12, swap them
      if (m > 12 && d <= 12) {
        const temp = m;
        m = d;
        d = temp;
      }

      if (y >= 1970 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        const dateObj = new Date(y, m - 1, d, 0, 0, 0, 0);
        // Explicitly set the full year to prevent JS Date interpreting 0-99 as 1900s
        dateObj.setFullYear(y);
        return dateObj;
      }
    }

    // Fallback for written month names (e.g. "October 15, 2026", "Oct 15, 26")
    const fallback = new Date(dateStr);
    if (!isNaN(fallback.getTime())) {
      let yr = fallback.getFullYear();
      if (yr < 100) yr = normalizeTwoDigitYear(yr);
      const res = new Date(yr, fallback.getMonth(), fallback.getDate(), 0, 0, 0, 0);
      res.setFullYear(yr);
      return res;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Formats a Date object as YYYY-MM-DD in local time for HTML date inputs.
 */
export const toInputDateFormat = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Checks whether an event falls within a specific date filter type or custom date range.
 */
export const isEventInDateRange = (
  eventDateStr?: string,
  filterType: DateFilterType = 'all',
  customStart?: string,
  customEnd?: string,
  allowPastEvents: boolean = false
): boolean => {
  const eventDate = parseEventDate(eventDateStr);

  // If event has no valid date, treat according to filter
  if (!eventDate) {
    // If filtering by specific date range, events without dates don't match
    if (filterType !== 'all') return false;
    return true;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const eventTime = eventDate.getTime();
  const todayTime = today.getTime();

  switch (filterType) {
    case 'today': {
      return eventTime === todayTime;
    }

    case 'tomorrow': {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return eventTime === tomorrow.getTime();
    }

    case 'weekend': {
      // Find upcoming Friday, Saturday, Sunday
      const dayOfWeek = today.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
      const startWeekend = new Date(today);
      const endWeekend = new Date(today);

      if (dayOfWeek === 0) {
        // Today is Sunday - weekend is today
        startWeekend.setDate(today.getDate());
        endWeekend.setDate(today.getDate());
      } else if (dayOfWeek === 5) {
        // Today is Friday - weekend is today through Sunday
        startWeekend.setDate(today.getDate());
        endWeekend.setDate(today.getDate() + 2);
      } else if (dayOfWeek === 6) {
        // Today is Saturday - weekend is today through Sunday
        startWeekend.setDate(today.getDate());
        endWeekend.setDate(today.getDate() + 1);
      } else {
        // Monday through Thursday
        const daysToFriday = 5 - dayOfWeek;
        startWeekend.setDate(today.getDate() + daysToFriday);
        endWeekend.setDate(today.getDate() + daysToFriday + 2);
      }

      return eventTime >= startWeekend.getTime() && eventTime <= endWeekend.getTime();
    }

    case 'week': {
      // Today through 7 days from now
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return eventTime >= todayTime && eventTime <= weekEnd.getTime();
    }

    case 'month': {
      // Next 30 days
      const monthEnd = new Date(today);
      monthEnd.setDate(monthEnd.getDate() + 30);
      return eventTime >= todayTime && eventTime <= monthEnd.getTime();
    }

    case 'past': {
      return eventTime < todayTime;
    }

    case 'custom': {
      const start = customStart ? parseEventDate(customStart) : null;
      const end = customEnd ? parseEventDate(customEnd) : null;

      if (start && end) {
        return eventTime >= start.getTime() && eventTime <= end.getTime();
      }
      if (start) {
        return eventTime >= start.getTime();
      }
      if (end) {
        return eventTime <= end.getTime();
      }
      return true;
    }

    case 'all':
    default: {
      if (allowPastEvents) return true;
      // By default on feeds, show current & future events
      return eventTime >= todayTime;
    }
  }
};

/**
 * Determines whether an event has completed/passed based on date and time.
 * If no time is specified, the event expires at the end of its scheduled day (23:59:59).
 * If time or endTime is specified, it expires when that time has passed.
 */
export const isEventExpired = (
  dateStr?: string,
  timeStr?: string,
  endTimeStr?: string,
  now: Date = new Date()
): boolean => {
  const eventDate = parseEventDate(dateStr);
  if (!eventDate) return false; // If date cannot be parsed, don't delete to be safe

  // If the event calendar date is strictly before today (00:00:00), it's expired
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  if (eventDate.getTime() < startOfToday.getTime()) {
    return true;
  }

  // If the event is scheduled for a future calendar date, it's NOT expired
  if (eventDate.getTime() > startOfToday.getTime()) {
    return false;
  }

  // If the event is scheduled for TODAY, check time / endTime
  const targetTimeStr = endTimeStr || timeStr;
  if (!targetTimeStr) {
    // No time provided: keep active until the end of today
    return false;
  }

  // Parse 12-hour or 24-hour time string
  const cleanTime = targetTimeStr.trim().toUpperCase();
  const match = cleanTime.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/);
  if (!match) {
    // If time cannot be parsed, keep active until end of day
    return false;
  }

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3];
  if (ampm) {
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
  }

  const eventDateTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes,
    0,
    0
  );

  return now.getTime() > eventDateTime.getTime();
};

