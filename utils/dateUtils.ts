export type DateFilterType = 'all' | 'today' | 'tomorrow' | 'weekend' | 'week' | 'month' | 'past' | 'custom';

/**
 * Safely parses various date formats (YYYY-MM-DD, MM/DD/YYYY, ISO-8601) into a local Date object.
 */
export const parseEventDate = (dateStr?: string): Date | null => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  try {
    let clean = dateStr.trim();
    if (clean.includes('T')) clean = clean.split('T')[0];

    const parts = clean.includes('-') ? clean.split('-') : clean.split('/');
    if (parts.length === 3) {
      let y: number, m: number, d: number;
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        y = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
        d = parseInt(parts[2], 10);
      } else {
        // MM/DD/YYYY
        m = parseInt(parts[0], 10);
        d = parseInt(parts[1], 10);
        y = parseInt(parts[2], 10);
      }
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m - 1, d, 0, 0, 0, 0);
      }
    }

    const fallback = new Date(dateStr);
    if (!isNaN(fallback.getTime())) {
      return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate(), 0, 0, 0, 0);
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

