import type { CalendarExportEvent } from '../types';
import { addDays, parseDateInput } from './date';

function escapeICS(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function toICSDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function toUTCStamp(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function buildEventBlock(event: CalendarExportEvent) {
  const start = parseDateInput(event.date);
  const end = addDays(start, 1);
  const lines = [
    'BEGIN:VEVENT',
    `UID:${event.id}@dad-to-be`,
    `DTSTAMP:${toUTCStamp(new Date())}`,
    `DTSTART;VALUE=DATE:${toICSDate(start)}`,
    `DTEND;VALUE=DATE:${toICSDate(end)}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${escapeICS(event.description)}`,
  ];

  if (event.location) {
    lines.push(`LOCATION:${escapeICS(event.location)}`);
  }

  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

function buildCalendar(events: CalendarExportEvent[]) {
  const blocks = events.map(buildEventBlock).join('\r\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dad To Be//Pregnancy Companion//ZH-CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    blocks,
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadCalendarFile(events: CalendarExportEvent[], filename: string) {
  if (!events.length) {
    return;
  }

  const file = new Blob([buildCalendar(events)], {
    type: 'text/calendar;charset=utf-8',
  });

  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
