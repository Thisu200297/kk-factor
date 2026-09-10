/**
 * When the show is next on, worked out in the presenter's own time zone.
 *
 * The show is "Tuesdays, 7.30 to 9.30pm" — a wall-clock time in Melbourne,
 * not an instant. Melbourne moves an hour twice a year (AEDT from the first
 * Sunday in October, AEST from the first Sunday in April), the server runs
 * wherever Render happens to put it, and a good number of the listeners are in
 * Greece. Three different clocks, and only one of them is right about when the
 * show starts.
 *
 * So the schedule is stored as a weekday and a wall-clock time with a zone,
 * and this turns it into an absolute instant. The browser then only has to
 * count down to a timestamp, which is a thing browsers are good at, rather
 * than reason about somebody else's daylight saving, which they are not.
 *
 * No library. Intl has the zone database, and using it directly is about
 * thirty lines — fewer than the lines of dependency policy that adding
 * date-fns-tz to a client project would cost.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

/** The default, until the client changes it from the dashboard. */
const DEFAULT_SCHEDULE = {
  enabled: true,
  weekday: 2, // Tuesday, matching Date#getDay
  startTime: '19:30',
  endTime: '21:30',
  timezone: 'Australia/Melbourne',
  title: 'The Greek Eurobeat Show',
  note: 'Live on RPP FM 98.7 / 98.3 and on YouTube',
};

/**
 * How far ahead of UTC the zone was at a given instant, in milliseconds.
 *
 * Formatting an instant into the zone and then reading those numbers back as
 * if they were UTC gives exactly the offset that applied at that instant —
 * daylight saving included, without a table of rules.
 */
function zoneOffsetMs(utcMs, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));

  const at = {};
  for (const part of parts) at[part.type] = part.value;

  const asIfUtc = Date.UTC(
    Number(at.year),
    Number(at.month) - 1,
    Number(at.day),
    Number(at.hour),
    Number(at.minute),
    Number(at.second)
  );
  return asIfUtc - utcMs;
}

/**
 * A wall-clock date and time in a zone, as an absolute instant.
 *
 * Done in two passes because the offset depends on the answer: the offset
 * that applies at 7.30pm is not necessarily the one that applied at the naive
 * guess, and on the two nights a year the clocks move it is not. The second
 * pass settles it.
 */
function zonedTimeToInstant({ year, month, day, hour, minute }, timeZone) {
  const naive = Date.UTC(year, month - 1, day, hour, minute, 0);

  const firstGuess = naive - zoneOffsetMs(naive, timeZone);
  const settled = naive - zoneOffsetMs(firstGuess, timeZone);

  return new Date(settled);
}

/** The calendar date it is right now in a zone — not the server's idea of today. */
function todayIn(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(now);

  const at = {};
  for (const part of parts) at[part.type] = part.value;

  const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(at.weekday);

  return {
    year: Number(at.year),
    month: Number(at.month),
    day: Number(at.day),
    weekday: weekdayIndex,
  };
}

/** "19:30" -> { hour: 19, minute: 30 }. Null for anything that is not a time. */
function parseTime(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;

  return { hour, minute };
}

/** The zone's short name at an instant — AEST or AEDT, whichever applies. */
function zoneAbbreviation(instant, timeZone) {
  try {
    const parts = new Intl.DateTimeFormat('en-AU', {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(instant);
    return parts.find((part) => part.type === 'timeZoneName')?.value || null;
  } catch {
    return null;
  }
}

/**
 * The next broadcast, as two absolute instants.
 *
 * "Next" means the next one that has not finished. Tuesday at 8pm the answer
 * is tonight's show, already under way — not next week's — because a listener
 * arriving mid-show should be told they can still catch it.
 *
 * An end time earlier than the start time means the show runs past midnight;
 * the end simply lands on the following day.
 */
function nextOccurrence(schedule, now = new Date()) {
  const start = parseTime(schedule.startTime);
  const end = parseTime(schedule.endTime);
  if (!start || !end) return null;

  const timeZone = schedule.timezone || DEFAULT_SCHEDULE.timezone;
  const weekday = Number(schedule.weekday);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return null;

  const today = todayIn(timeZone, now);

  // Look at this week's occurrence and next week's; the first one still to
  // finish is the answer. Eight days covers the case where today is the day
  // but the show has already ended.
  for (let ahead = 0; ahead <= 8; ahead += 1) {
    if ((today.weekday + ahead) % 7 !== weekday) continue;

    // Adding to the day number and letting Date.UTC normalise it is what
    // carries the answer over the end of a month or a year.
    const rolled = new Date(Date.UTC(today.year, today.month - 1, today.day + ahead));
    const date = {
      year: rolled.getUTCFullYear(),
      month: rolled.getUTCMonth() + 1,
      day: rolled.getUTCDate(),
    };

    const startsAt = zonedTimeToInstant({ ...date, ...start }, timeZone);

    const endsOnNextDay =
      end.hour < start.hour || (end.hour === start.hour && end.minute <= start.minute);
    const endDate = endsOnNextDay
      ? (() => {
          const next = new Date(startsAt.getTime() + DAY_MS);
          const inZone = todayIn(timeZone, next);
          return { year: inZone.year, month: inZone.month, day: inZone.day };
        })()
      : date;

    const endsAt = zonedTimeToInstant({ ...endDate, ...end }, timeZone);

    if (endsAt.getTime() > now.getTime()) {
      return {
        startsAt,
        endsAt,
        onAir: startsAt.getTime() <= now.getTime(),
        weekdayName: WEEKDAYS[weekday],
        timezone: timeZone,
        abbreviation: zoneAbbreviation(startsAt, timeZone),
      };
    }
  }

  return null;
}

/**
 * The schedule as the browser receives it: the settings the client edited,
 * plus the next broadcast already resolved to instants.
 */
function describeSchedule(stored, now = new Date()) {
  const schedule = { ...DEFAULT_SCHEDULE, ...(stored || {}) };

  if (!schedule.enabled) {
    return { ...schedule, next: null };
  }

  const next = nextOccurrence(schedule, now);
  if (!next) return { ...schedule, next: null };

  return {
    ...schedule,
    weekdayName: next.weekdayName,
    abbreviation: next.abbreviation,
    next: {
      startsAt: next.startsAt.toISOString(),
      endsAt: next.endsAt.toISOString(),
      onAir: next.onAir,
    },
  };
}

module.exports = {
  DEFAULT_SCHEDULE,
  WEEKDAYS,
  zoneOffsetMs,
  zonedTimeToInstant,
  todayIn,
  parseTime,
  zoneAbbreviation,
  nextOccurrence,
  describeSchedule,
};
