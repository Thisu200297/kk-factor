import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '../common/Icon';
import { useFetch } from '../../hooks/useFetch';
import { showApi } from '../../utils/api';

/**
 * When the show is next on, and how to be reminded.
 *
 * The server sends an absolute instant, not "Tuesday 7.30pm", so nothing here
 * has to know that Melbourne moves an hour twice a year. It counts down to a
 * timestamp and formats it twice: once in the presenter's zone, which is the
 * answer she would give, and once in the reader's, which is the answer they
 * need. A listener in Athens should not have to work out that 7.30pm in
 * Melbourne is half past ten in the morning where they are.
 *
 * There is no "remind me" that asks for anything. A calendar entry is a file
 * the reader saves themselves: it works on every phone and every desktop, it
 * survives them clearing their browser, it needs no permission prompt, no
 * address, and nothing stored about them here. Browser push would reach fewer
 * people — Apple only allows it once a site has been added to the home screen
 * — and would cost a subscription record per reader.
 */

const MINUTE = 60 * 1000;

/** A weekly repeat, so one save covers every show. */
const ICS_RRULE = 'RRULE:FREQ=WEEKLY';

export default function NextShow({ variant = 'panel', className = '' }) {
  const fetcher = useCallback(() => showApi.getLive(), []);
  const { data } = useFetch(fetcher);

  const schedule = data?.schedule;
  const live = data?.live;
  const next = schedule?.next;

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!next?.startsAt) return undefined;
    const startsAt = Date.parse(next.startsAt);

    // Once a second in the last hour, once a minute before that. A countdown
    // reading "in 3 days" has no business re-rendering 86,400 times to get
    // there, and on a phone that is somebody's battery.
    let timer;
    const tick = () => {
      const remaining = startsAt - Date.now();
      timer = setTimeout(() => {
        setNow(Date.now());
        tick();
      }, remaining > 60 * MINUTE ? MINUTE : 1000);
    };
    tick();

    return () => clearTimeout(timer);
  }, [next?.startsAt]);

  const parts = useMemo(() => {
    if (!next?.startsAt) return null;
    return describe(next, schedule, now);
  }, [next, schedule, now]);

  // She is on air: the live banner is already saying so, in red, at the top of
  // every page. Saying it twice is noise.
  if (live?.isLive) return null;
  if (!schedule?.enabled || !parts) return null;

  const inline = variant === 'inline';

  return (
    <section
      className={
        inline
          ? `flex flex-wrap items-center gap-x-4 gap-y-2 ${className}`
          : `rounded-panel border border-line bg-surface-container-low p-5 md:p-6 ${className}`
      }
      aria-label="When the show is next on"
    >
      <div className="min-w-0 flex-1">
        <p className="text-label-md uppercase text-primary">
          {parts.onAir ? 'On air now' : 'Next show'}
        </p>

        <p className={`mt-1.5 ${inline ? 'text-headline-sm' : 'text-headline-md'} text-fg`}>
          {schedule.title || 'The Greek Eurobeat Show'}
        </p>

        <p className="mt-1.5 text-body-md text-fg-muted">
          <strong className="text-fg">{parts.homeTime}</strong>
          {parts.abbreviation && <> {parts.abbreviation}</>}
          {parts.localTime && (
            <>
              {' '}
              · <span title="In your time zone">{parts.localTime} your time</span>
            </>
          )}
        </p>

        {schedule.note && !inline && (
          <p className="mt-1 text-sm text-fg-subtle">{schedule.note}</p>
        )}

        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary-soft px-3.5 py-1.5 text-sm font-semibold text-primary">
          <Icon name="schedule" size={16} />
          {parts.countdown}
        </p>
      </div>

      <div className={inline ? '' : 'mt-5 flex flex-wrap gap-2.5'}>
        <AddToCalendar schedule={schedule} next={next} />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------ */

/**
 * "Add to calendar", which is two different things depending on where the
 * reader keeps their calendar: Google wants a URL, everything else wants an
 * .ics file. Offering both is a few lines and saves the third of the audience
 * on one from being told to use the other.
 */
function AddToCalendar({ schedule, next }) {
  const [open, setOpen] = useState(false);

  const onDownload = () => {
    const blob = new Blob([buildIcs(schedule, next)], {
      type: 'text/calendar;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'the-kk-factor.ics';
    document.body.appendChild(link);
    link.click();
    link.remove();

    // Revoking immediately can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button type="button" className="btn-secondary" onClick={() => setOpen((v) => !v)}>
        <Icon name="event" size={17} />
        Add to calendar
      </button>

      {open && (
        <div
          className="absolute left-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface shadow-lg"
          role="menu"
        >
          <a
            href={googleCalendarUrl(schedule, next)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 text-sm text-fg hover:bg-surface-2"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <Icon name="open_in_new" size={16} className="text-fg-subtle" />
            Google Calendar
          </a>
          <button
            type="button"
            onClick={onDownload}
            className="flex w-full items-center gap-2 border-t border-line px-4 py-3 text-left text-sm text-fg hover:bg-surface-2"
            role="menuitem"
          >
            <Icon name="download" size={16} className="text-fg-subtle" />
            Apple, Outlook, other
          </button>
        </div>
      )}
    </div>
  );
}

/* --- formatting ---------------------------------------------------------- */

function describe(next, schedule, now) {
  const startsAt = new Date(next.startsAt);
  const zone = schedule.timezone || 'Australia/Melbourne';

  const homeTime = new Intl.DateTimeFormat('en-AU', {
    timeZone: zone,
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
  }).format(startsAt);

  // Only worth showing when the reader is somewhere else.
  const viewerZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localTime =
    viewerZone && viewerZone !== zone
      ? new Intl.DateTimeFormat(undefined, {
          weekday: 'short',
          hour: 'numeric',
          minute: '2-digit',
        }).format(startsAt)
      : null;

  return {
    onAir: next.onAir,
    homeTime,
    localTime,
    abbreviation: schedule.abbreviation,
    countdown: next.onAir ? 'On air now' : countdownText(startsAt.getTime() - now),
  };
}

/** "in 2 days", "in 4 hours", "in 12 minutes", "in 40 seconds". */
function countdownText(ms) {
  if (ms <= 0) return 'Starting now';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days >= 1) {
    const remainingHours = hours - days * 24;
    return remainingHours
      ? `In ${days} ${plural(days, 'day')} ${remainingHours} ${plural(remainingHours, 'hour')}`
      : `In ${days} ${plural(days, 'day')}`;
  }
  if (hours >= 1) {
    const remainingMinutes = minutes - hours * 60;
    return remainingMinutes
      ? `In ${hours} ${plural(hours, 'hour')} ${remainingMinutes} min`
      : `In ${hours} ${plural(hours, 'hour')}`;
  }
  if (minutes >= 1) return `In ${minutes} ${plural(minutes, 'minute')}`;
  return `In ${seconds} ${plural(seconds, 'second')}`;
}

const plural = (n, word) => (n === 1 ? word : `${word}s`);

/* --- calendar entries ---------------------------------------------------- */

/** 2026-09-08T09:30:00.000Z -> 20260908T093000Z */
const icsStamp = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function buildIcs(schedule, next) {
  const title = schedule.title || 'The Greek Eurobeat Show';
  const site = window.location.origin;

  // Folded at 75 octets per RFC 5545 is what a strict parser wants; every
  // calendar in common use accepts unfolded lines, and unfolded is legible in
  // a bug report. Escaping the separators is not optional, though: an unescaped
  // comma silently truncates the description in Outlook.
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The KK Factor//Show schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:show-${icsStamp(next.startsAt)}@thekkfactor`,
    `DTSTAMP:${icsStamp(new Date().toISOString())}`,
    `DTSTART:${icsStamp(next.startsAt)}`,
    `DTEND:${icsStamp(next.endsAt)}`,
    ICS_RRULE,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(schedule.note || 'Live with Roula Krikellis.')}\\n${escapeIcs(site)}`,
    `URL:${escapeIcs(site)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcs(title)} starts in 15 minutes`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return `${lines.join('\r\n')}\r\n`;
}

/** RFC 5545 escaping. An unescaped comma truncates the field in Outlook. */
function escapeIcs(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function googleCalendarUrl(schedule, next) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: schedule.title || 'The Greek Eurobeat Show',
    dates: `${icsStamp(next.startsAt)}/${icsStamp(next.endsAt)}`,
    details: `${schedule.note || 'Live with Roula Krikellis.'}\n${window.location.origin}`,
    recur: ICS_RRULE,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
