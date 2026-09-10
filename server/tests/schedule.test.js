/**
 * When the show is next on.
 *
 * The show is Tuesdays 7.30-9.30pm Melbourne time. Melbourne moves an hour
 * twice a year, the server runs in UTC somewhere in the United States, and a
 * good share of the audience is in Greece. These are the cases where an
 * hour goes missing.
 */
const {
  DEFAULT_SCHEDULE,
  zoneOffsetMs,
  zonedTimeToInstant,
  todayIn,
  parseTime,
  zoneAbbreviation,
  nextOccurrence,
  describeSchedule,
} = require('../utils/schedule');

const MELBOURNE = 'Australia/Melbourne';
const HOUR = 3600 * 1000;

describe('zoneOffsetMs', () => {
  it('is +10 in the southern winter and +11 in the southern summer', () => {
    expect(zoneOffsetMs(Date.parse('2026-07-15T00:00:00Z'), MELBOURNE)).toBe(10 * HOUR);
    expect(zoneOffsetMs(Date.parse('2026-01-15T00:00:00Z'), MELBOURNE)).toBe(11 * HOUR);
  });

  it('is 0 for UTC', () => {
    expect(zoneOffsetMs(Date.parse('2026-07-15T00:00:00Z'), 'UTC')).toBe(0);
  });
});

describe('zonedTimeToInstant', () => {
  it('turns a winter evening in Melbourne into the right instant', () => {
    // 7.30pm AEST (+10) on 15 July 2026 is 09:30 UTC.
    const at = zonedTimeToInstant(
      { year: 2026, month: 7, day: 15, hour: 19, minute: 30 },
      MELBOURNE
    );
    expect(at.toISOString()).toBe('2026-07-15T09:30:00.000Z');
  });

  it('turns a summer evening into the right instant — an hour earlier in UTC', () => {
    // 7.30pm AEDT (+11) on 15 January 2026 is 08:30 UTC.
    const at = zonedTimeToInstant(
      { year: 2026, month: 1, day: 15, hour: 19, minute: 30 },
      MELBOURNE
    );
    expect(at.toISOString()).toBe('2026-01-15T08:30:00.000Z');
  });

  it('is right on the evening the clocks go forward', () => {
    // Daylight saving starts on the first Sunday in October — 4 October 2026.
    // That evening is already AEDT, so 7.30pm is 08:30 UTC, not 09:30.
    const at = zonedTimeToInstant(
      { year: 2026, month: 10, day: 4, hour: 19, minute: 30 },
      MELBOURNE
    );
    expect(at.toISOString()).toBe('2026-10-04T08:30:00.000Z');
  });

  it('is right on the evening the clocks go back', () => {
    // Daylight saving ends on the first Sunday in April — 5 April 2026.
    // That evening is AEST, so 7.30pm is 09:30 UTC.
    const at = zonedTimeToInstant(
      { year: 2026, month: 4, day: 5, hour: 19, minute: 30 },
      MELBOURNE
    );
    expect(at.toISOString()).toBe('2026-04-05T09:30:00.000Z');
  });
});

describe('parseTime', () => {
  it('reads a 24-hour time', () => {
    expect(parseTime('19:30')).toEqual({ hour: 19, minute: 30 });
    expect(parseTime('7:05')).toEqual({ hour: 7, minute: 5 });
    expect(parseTime('00:00')).toEqual({ hour: 0, minute: 0 });
    expect(parseTime('23:59')).toEqual({ hour: 23, minute: 59 });
  });

  it('refuses anything that is not one', () => {
    for (const bad of ['24:00', '19:60', '7.30pm', '1930', '', null, undefined, 'abc']) {
      expect(parseTime(bad)).toBeNull();
    }
  });
});

describe('todayIn', () => {
  it('knows it is already tomorrow in Melbourne', () => {
    // 23:00 UTC on Monday is 10am Tuesday in Melbourne. A server that used
    // its own idea of the day would announce the show a day late, every week.
    const at = todayIn(MELBOURNE, new Date('2026-09-07T23:00:00Z')); // Monday UTC
    expect(at.weekday).toBe(2); // Tuesday
    expect(at.day).toBe(8);
  });
});

describe('zoneAbbreviation', () => {
  it('says AEST in winter and AEDT in summer', () => {
    expect(zoneAbbreviation(new Date('2026-07-15T09:30:00Z'), MELBOURNE)).toBe('AEST');
    expect(zoneAbbreviation(new Date('2026-01-15T08:30:00Z'), MELBOURNE)).toBe('AEDT');
  });
});

describe('nextOccurrence', () => {
  const schedule = { ...DEFAULT_SCHEDULE };

  it('finds this coming Tuesday from a Sunday', () => {
    // Sunday 6 September 2026, midday Melbourne.
    const next = nextOccurrence(schedule, new Date('2026-09-06T02:00:00Z'));
    expect(next.startsAt.toISOString()).toBe('2026-09-08T09:30:00.000Z'); // Tue 7.30pm AEST
    expect(next.endsAt.toISOString()).toBe('2026-09-08T11:30:00.000Z');
    expect(next.onAir).toBe(false);
    expect(next.weekdayName).toBe('Tuesday');
    expect(next.abbreviation).toBe('AEST');
  });

  it('still points at tonight while the show is on the air', () => {
    // Tuesday 8.15pm Melbourne — mid-show. A listener arriving now can still
    // catch it, so the answer must not jump to next week.
    const next = nextOccurrence(schedule, new Date('2026-09-08T10:15:00Z'));
    expect(next.startsAt.toISOString()).toBe('2026-09-08T09:30:00.000Z');
    expect(next.onAir).toBe(true);
  });

  it('moves to next week once it has ended', () => {
    // Tuesday 9.31pm Melbourne, one minute after the end.
    const next = nextOccurrence(schedule, new Date('2026-09-08T11:31:00Z'));
    expect(next.startsAt.toISOString()).toBe('2026-09-15T09:30:00.000Z');
    expect(next.onAir).toBe(false);
  });

  it('carries over the end of a month', () => {
    // Wednesday 30 September 2026 -> Tuesday 6 October, by which point
    // daylight saving has started, so the same 7.30pm is an hour earlier UTC.
    const next = nextOccurrence(schedule, new Date('2026-09-30T02:00:00Z'));
    expect(next.startsAt.toISOString()).toBe('2026-10-06T08:30:00.000Z');
    expect(next.abbreviation).toBe('AEDT');
  });

  it('carries over the end of a year', () => {
    // Wednesday 30 December 2026 -> Tuesday 5 January 2027.
    const next = nextOccurrence(schedule, new Date('2026-12-30T02:00:00Z'));
    expect(next.startsAt.toISOString()).toBe('2027-01-05T08:30:00.000Z');
  });

  it('keeps the same wall-clock time across the daylight-saving change', () => {
    // The show is at 7.30pm Melbourne on both sides of the switch, even
    // though the two are an hour apart in UTC. This is the whole point of
    // storing a wall-clock time rather than an instant.
    const before = nextOccurrence(schedule, new Date('2026-09-29T02:00:00Z'));
    const after = nextOccurrence(schedule, new Date('2026-10-06T02:00:00Z'));

    const melbourneHour = (d) =>
      new Intl.DateTimeFormat('en-AU', {
        timeZone: MELBOURNE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      }).format(d);

    expect(melbourneHour(before.startsAt)).toBe(melbourneHour(after.startsAt));
    expect(before.abbreviation).toBe('AEST');
    expect(after.abbreviation).toBe('AEDT');
  });

  it('handles a show that runs past midnight', () => {
    const late = { ...schedule, startTime: '23:00', endTime: '01:00' };
    const next = nextOccurrence(late, new Date('2026-09-06T02:00:00Z'));
    expect(next.startsAt.toISOString()).toBe('2026-09-08T13:00:00.000Z'); // Tue 11pm
    // 1am Wednesday in Melbourne (AEST, +10) is 3pm Tuesday in UTC — the end
    // lands on the next Melbourne day while staying on the same UTC one.
    expect(next.endsAt.toISOString()).toBe('2026-09-08T15:00:00.000Z');
    expect(next.endsAt.getTime()).toBeGreaterThan(next.startsAt.getTime());
  });

  it('is null rather than a wrong answer when the schedule is nonsense', () => {
    expect(nextOccurrence({ ...schedule, startTime: 'half seven' })).toBeNull();
    expect(nextOccurrence({ ...schedule, weekday: 9 })).toBeNull();
    expect(nextOccurrence({ ...schedule, weekday: 'Tuesday' })).toBeNull();
  });
});

describe('describeSchedule', () => {
  it('resolves the next broadcast to instants the browser can count down to', () => {
    const out = describeSchedule({}, new Date('2026-09-06T02:00:00Z'));
    expect(out.next.startsAt).toBe('2026-09-08T09:30:00.000Z');
    expect(out.next.onAir).toBe(false);
    expect(out.weekdayName).toBe('Tuesday');
  });

  it('says nothing at all when the schedule is switched off', () => {
    const out = describeSchedule({ enabled: false }, new Date('2026-09-06T02:00:00Z'));
    expect(out.next).toBeNull();
  });

  it('lets the client move the show without a deploy', () => {
    const out = describeSchedule(
      { weekday: 5, startTime: '18:00', endTime: '20:00' },
      new Date('2026-09-06T02:00:00Z')
    );
    expect(out.weekdayName).toBe('Friday');
    expect(out.next.startsAt).toBe('2026-09-11T08:00:00.000Z'); // Fri 6pm AEST
  });
});
