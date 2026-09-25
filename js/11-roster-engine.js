(function (root) {
  'use strict';

  const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function clampInt(value, min, max, fallback) {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function parseIsoDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) throw new Error('Invalid date: ' + iso);
    return { year: +m[1], month: +m[2], day: +m[3] };
  }

  function makeUtcDate(iso) {
    const p = parseIsoDate(iso);
    return new Date(Date.UTC(p.year, p.month - 1, p.day));
  }

  function formatIsoDate(date) {
    return [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, '0'),
      String(date.getUTCDate()).padStart(2, '0')
    ].join('-');
  }

  function addDays(iso, days) {
    const d = makeUtcDate(iso);
    d.setUTCDate(d.getUTCDate() + days);
    return formatIsoDate(d);
  }

  function weekCommencing(iso) {
    const d = makeUtcDate(iso);
    d.setUTCDate(d.getUTCDate() - d.getUTCDay());
    return formatIsoDate(d);
  }

  function compareIsoDates(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  function wrapAdvance(line, amount, lineCount) {
    if (!Number.isInteger(lineCount) || lineCount < 1) throw new Error('Invalid roster line count');
    if (!Number.isInteger(line) || line < 1 || line > lineCount) throw new Error('Invalid roster line');
    return ((line - 1 + amount) % lineCount + lineCount) % lineCount + 1;
  }

  function validateSelection(data, rosterName, line) {
    const roster = data.rosters[rosterName];
    if (!roster) throw new Error('Unknown roster: ' + rosterName);
    if (!Number.isInteger(line) || line < 1 || line > roster.lineCount) {
      throw new Error(`Line ${line} is not valid for roster ${rosterName}`);
    }
  }

  function generateLineSequence(data, startRoster, startLine, weeks, swapRoster, swapLine) {
    validateSelection(data, startRoster, startLine);
    const hasSwap = Boolean(swapRoster);
    if (hasSwap) validateSelection(data, swapRoster, swapLine);

    const result = [];
    let track1 = startLine;
    let track2 = swapLine;

    for (let i = 0; i < weeks; i++) {
      if (!hasSwap) {
        result.push({ roster: startRoster, line: track1 });
        track1 = wrapAdvance(track1, 1, data.rosters[startRoster].lineCount);
      } else if (i % 2 === 0) {
        result.push({ roster: startRoster, line: track1 });
        track1 = wrapAdvance(track1, 2, data.rosters[startRoster].lineCount);
      } else {
        result.push({ roster: swapRoster, line: track2 });
        track2 = wrapAdvance(track2, 2, data.rosters[swapRoster].lineCount);
      }
    }
    return result;
  }

  function safeJsonStorage(key, fallback) {
    try {
      if (typeof localStorage === 'undefined') return fallback;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) { return fallback; }
  }

  function basicArrangement(settings) {
    if(settings.scheduleMode && settings.scheduleMode!=='official')return {id:'basic',startWC:weekCommencing(settings.rotationStartDate||settings.startDate),mode:'manual',manualType:settings.scheduleMode==='pattern'?'pattern':'adhoc',manualPattern:settings.scheduleMode==='pattern'?(settings.manualPattern||safeJsonStorage('rosterbot-manual-schedule-v1',null)):null,trackA:{depot:'PERSONAL',roster:'MANUAL',line:1},trackB:null};
    return {
      id: 'basic',
      startWC: weekCommencing(settings.rotationStartDate || settings.startDate),
      mode: settings.hasSwap ? 'swap' : 'single',
      trackA: { depot:settings.startDepot||'SCS', roster: settings.startRoster, line: Number(settings.startLine) },
      trackB: settings.hasSwap ? { depot:settings.swapDepot||settings.startDepot||'SCS', roster: settings.swapRoster, line: Number(settings.swapLine) } : null
    };
  }

  function timelineFor(settings) {
    const supplied = Array.isArray(settings.rosterTimeline) ? settings.rosterTimeline : safeJsonStorage('rosterbot-timeline-v1', []);
    const clean = supplied.filter(x => x && x.startWC && x.trackA?.roster && Number(x.trackA?.line)).map(x => ({...x, startWC:weekCommencing(x.startWC)})).sort((a,b)=>a.startWC.localeCompare(b.startWC));
    if (clean.length) return clean;
    if (settings.timelineMode === 'diary') return [];
    return [basicArrangement(settings)];
  }

  function positionForArrangement(data, arrangement, wcDate) {
    if (!arrangement || wcDate < arrangement.startWC) return null;
    const weeks = Math.floor((makeUtcDate(wcDate) - makeUtcDate(arrangement.startWC)) / (7 * 86400000));
    if(arrangement.mode==='manual')return {roster:'MANUAL',line:1,depot:'PERSONAL',track:'MANUAL',manual:true,manualType:arrangement.manualType||'pattern',manualPattern:arrangement.manualPattern||null,arrangementId:arrangement.id||''};
    function resolved(track,advance,trackName){const depot=track?.depot||'SCS',roster=track?.roster,count=Number(root.RosterOfficial?.lineCount?.(wcDate,depot,roster)||data.rosters?.[roster]?.lineCount||0);if(!count)return null;return {roster,line:wrapAdvance(Number(track.line),advance,count),depot,track:trackName,arrangementId:arrangement.id||''}}
    if (arrangement.mode === 'swap' && arrangement.trackB) {
      const isA = weeks % 2 === 0,track = isA ? arrangement.trackA : arrangement.trackB,advance = isA ? weeks : weeks - 1;
      return resolved(track,advance,isA?'A':'B');
    }
    return resolved(arrangement.trackA,weeks,'A');
  }

  function timelinePosition(data, timeline, wcDate) {
    let active = null;
    for (const item of timeline) { if (item.startWC <= wcDate) active = item; else break; }
    return active ? positionForArrangement(data, active, wcDate) : null;
  }

  function paybotCellForDate(roster, line, dayIndex, dateIso, depot='SCS') { return root.RosterOfficial?.resolveCell?.(dateIso,depot,roster,line,dayIndex)||null; }

  function rosterCellForDate(data, roster, line, dayKey, dayIndex, dateIso, depot='SCS') { return root.RosterOfficial?.resolveCell?.(dateIso,depot,roster,line,dayIndex)||{type:'unknown',raw:['NO DATA','Historical roster data unavailable']}; }

  function manualPattern(settings){return settings.manualPattern||safeJsonStorage('rosterbot-manual-schedule-v1',null)||{days:{}}}
  function manualCellForDate(settings,dayKey,patternSnapshot=null,manualType='pattern'){if(manualType==='adhoc')return {type:'unknown',raw:['ENTER MANUALLY','No default work pattern'],sourceDataset:'PERSONAL',userEntered:true,manualAdhoc:true};const d=(patternSnapshot||manualPattern(settings))?.days?.[dayKey]||{};if(!d.on)return {type:'off',raw:['OR','Personal work pattern'],sourceDataset:'PERSONAL',userEntered:true};const start=String(d.start||''),finish=String(d.end||'');return {type:'shift',shift:'WORK',start,finish,exact:!!(start&&finish),finishSource:'personal-work-pattern',bookHours:'',sourceDataset:'PERSONAL',details:['Personal work pattern · user entered'],raw:['WORK',start,finish],userEntered:true}}

  function buildWeeks(data, settings, weeksRequested) {
    const parsed = Number.parseInt(weeksRequested, 10);
    const count = Math.min(5200, Math.max(1, Number.isFinite(parsed) ? parsed : 12));
    const wc0 = weekCommencing(settings.viewStartDate || settings.startDate);
    const leaveWeeks = new Set((settings.annualLeaveWeeks || []).map(weekCommencing));
    const timeline = timelineFor(settings);
    const weekOverrides = settings.weekOverrides || safeJsonStorage('rosterbot-week-overrides-v1', {});
    const dayOverrides = settings.dayOverrides || safeJsonStorage('rosterbot-day-overrides-v1', {});
    const weekLocks = settings.weekLocks || safeJsonStorage('rosterbot-week-locks-v1', {});

    return Array.from({length:count}, (_, weekIndex) => {
      const wcDate = addDays(wc0, weekIndex * 7);
      const base = timelinePosition(data, timeline, wcDate);
      const manualOverride = weekOverrides?.[wcDate];
      const overrideDepot=manualOverride?.depot||'SCS',overrideCount=manualOverride?Number(root.RosterOfficial?.lineCount?.(wcDate,overrideDepot,manualOverride.roster)||data.rosters?.[manualOverride.roster]?.lineCount||0):0;
      const item = manualOverride && overrideCount ? {roster:manualOverride.roster,line:Number(manualOverride.line),depot:overrideDepot,track:'OVERRIDE',arrangementId:base?.arrangementId||''} : base;
      if (!item) {
        const days = DAY_KEYS.map((dayKey,dayIndex)=>{const date=addDays(wcDate,dayIndex);return {dayKey,dayLabel:DAY_LABELS[dayIndex],date,cell:{type:'unknown',raw:['NO DATA','Before first roster-history arrangement']},holidayName:root.ROSTERBOT_HOLIDAYS?.[date]||'',actualOverride:dayOverrides?.[date]||null};});
        return {weekIndex,wcDate,roster:'NO DATA',line:'—',days,hasAlr:false,isAnnualLeave:leaveWeeks.has(wcDate),futureWarning:false,timelineMissing:true,locked:!!weekLocks?.[wcDate]};
      }
      const days = DAY_KEYS.map((dayKey, dayIndex) => {
        const date = addDays(wcDate, dayIndex),cell=item.manual?manualCellForDate(settings,dayKey,item.manualPattern,item.manualType):rosterCellForDate(data,item.roster,item.line,dayKey,dayIndex,date,item.depot||'SCS');
        return { dayKey, dayLabel: DAY_LABELS[dayIndex], date, cell, holidayName:root.ROSTERBOT_HOLIDAYS?.[date]||'', actualOverride:dayOverrides?.[date]||null };
      });
      return {
        weekIndex, wcDate, roster:item.roster, line:item.manual?'':item.line, depot:item.depot||'SCS', track:item.track, manualType:item.manualType||'', arrangementId:item.arrangementId,
        isWeekOverride: !!manualOverride, days, hasAlr:days.some(d=>d.cell.type==='alr'), isAnnualLeave:leaveWeeks.has(wcDate),
        locked: !!weekLocks?.[wcDate], futureWarning: item.manual?false:wcDate >= '2026-11-01'
      };
    });
  }

  function formatDateLong(iso) {
    const d = makeUtcDate(iso);
    return new Intl.DateTimeFormat('en-AU', {
      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'
    }).format(d);
  }

  function formatDateShort(iso) {
    const d = makeUtcDate(iso);
    return new Intl.DateTimeFormat('en-AU', {
      day: 'numeric', month: 'short', timeZone: 'UTC'
    }).format(d);
  }

  function formatDateDayOnly(iso) {
    const d = makeUtcDate(iso);
    return String(d.getUTCDate());
  }

  function yyyymmdd(iso) {
    return iso.replaceAll('-', '');
  }

  function localDateTimeToken(iso, hhmm) {
    return `${yyyymmdd(iso)}T${hhmm.replace(':', '')}00`;
  }

  function addMinutesNaive(iso, hhmm, minutes) {
    const p = parseIsoDate(iso);
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date(Date.UTC(p.year, p.month - 1, p.day, h, m));
    d.setUTCMinutes(d.getUTCMinutes() + minutes);
    const outDate = formatIsoDate(d);
    const outTime = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    return { date: outDate, time: outTime };
  }

  function escapeIcsText(value) {
    return String(value ?? '')
      .replaceAll('\\', '\\\\')
      .replaceAll('\n', '\\n')
      .replaceAll(';', '\\;')
      .replaceAll(',', '\\,');
  }

  function foldIcsLine(line) {
    // Our content is overwhelmingly ASCII. Folding at 73 characters keeps us
    // safely below the 75-octet recommendation for generated lines.
    if (line.length <= 73) return line;
    const parts = [];
    let rest = line;
    while (rest.length > 73) {
      parts.push(rest.slice(0, 73));
      rest = ' ' + rest.slice(73);
    }
    parts.push(rest);
    return parts.join('\r\n');
  }

  function stampUtc() {
    const d = new Date();
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  }

  function eventLines(fields) {
    const lines = ['BEGIN:VEVENT'];
    for (const [key, value] of fields) lines.push(`${key}:${value}`);
    lines.push('END:VEVENT');
    return lines;
  }

  function generateIcsDocument(data, settings, options = {}) {
    const exportWeeks = clampInt(options.exportWeeks, 1, 5200, 8);
    const weeks = buildWeeks(data, settings, exportWeeks);
    const requestedKinds = options.eventKinds || ['shift', 'alr', 'annualLeave'].concat(options.includeOr ? ['or'] : []);
    const eventKinds = new Set(requestedKinds);
    const weekParity = Number.isInteger(options.weekParity) ? options.weekParity : null;
    const calendarName = options.calendarName || 'Roster';
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//RosterBot//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
      'X-WR-TIMEZONE:Australia/Melbourne'
    ];
    const stamp = stampUtc();
    let eventCount = 0;

    function pushEvent(fields) {
      lines.push(...eventLines(fields));
      eventCount += 1;
    }

    for (const week of weeks) {
      if (weekParity !== null && week.weekIndex % 2 !== weekParity) continue;

      // User-entered Annual Leave overrides every underlying roster event in
      // that week while leaving the rotation itself untouched.
      if (week.isAnnualLeave) {
        if (eventKinds.has('annualLeave')) {
          const desc = `Annual Leave
Roster position: ${week.roster} ${week.line}
WC: ${formatDateLong(week.wcDate)}`;
          pushEvent([
            ['UID', `roster-annual-leave-${yyyymmdd(week.wcDate)}@rosterbot`],
            ['DTSTAMP', stamp],
            ['DTSTART;VALUE=DATE', yyyymmdd(week.wcDate)],
            ['DTEND;VALUE=DATE', yyyymmdd(addDays(week.wcDate, 7))],
            ['SUMMARY', escapeIcsText('Annual Leave')],
            ['DESCRIPTION', escapeIcsText(desc)]
          ]);
        }
        continue;
      }

      // ALR is treated as a week-level state: one event only, no individual
      // shifts or weekend OR entries for that week.
      if (week.hasAlr) {
        if (eventKinds.has('alr')) {
          const alrStart = compareIsoDates(settings.startDate, week.wcDate) > 0 ? settings.startDate : week.wcDate;
          const desc = `Roster: ${week.roster} ${week.line}
WC: ${formatDateLong(week.wcDate)}`;
          pushEvent([
            ['UID', `roster-alr-${yyyymmdd(week.wcDate)}@rosterbot`],
            ['DTSTAMP', stamp],
            ['DTSTART;VALUE=DATE', yyyymmdd(alrStart)],
            ['DTEND;VALUE=DATE', yyyymmdd(addDays(week.wcDate, 7))],
            ['SUMMARY', escapeIcsText('Annual Leave Relief')],
            ['DESCRIPTION', escapeIcsText(desc)]
          ]);
        }
        continue;
      }

      for (const day of week.days) {
        if (compareIsoDates(day.date, settings.startDate) < 0) continue;
        const cell = day.cell;

        if (cell.type === 'off') {
          if (!eventKinds.has('or')) continue;
          pushEvent([
            ['UID', `roster-or-${yyyymmdd(day.date)}@rosterbot`],
            ['DTSTAMP', stamp],
            ['DTSTART;VALUE=DATE', yyyymmdd(day.date)],
            ['DTEND;VALUE=DATE', yyyymmdd(addDays(day.date, 1))],
            ['SUMMARY', 'OR'],
            ['DESCRIPTION', escapeIcsText(`Off Roster
Roster: ${week.roster} ${week.line}
WC: ${formatDateLong(week.wcDate)}`)]
          ]);
          continue;
        }

        if (!eventKinds.has('shift') || cell.type !== 'shift' || !cell.start) continue;

        const rosterLineLabel = week.roster === 'FLEX' ? `FLEX ${week.line}` : `${week.roster}${week.line}`;
        const summary = cell.shift
          ? `${cell.start} - ${cell.shift} - ${rosterLineLabel}`
          : `${cell.start} - ${rosterLineLabel}`;
        const descriptionParts = [
          `Roster: ${week.roster} ${week.line}`,
          `WC: ${formatDateLong(week.wcDate)}`,
          `Sign-on: ${cell.start}`
        ];
        if (cell.finish) descriptionParts.push(`Sign-off: ${cell.finish}${cell.finishSource === 'assumed-8h-old-d' ? ' (8h assumed — older D roster)' : ''}`);
        if (cell.details && cell.details.length) descriptionParts.push(`Rotation details: ${cell.details.join(' / ')}`);
        if (cell.bookCorridor) descriptionParts.push(`Roster book: ${cell.bookCorridor}`);
        if (cell.bookDays && cell.bookDays.length) descriptionParts.push(`Book days: ${cell.bookDays.join(' ')}`);
        if (cell.bookContents) descriptionParts.push(`Shift contents: ${cell.bookContents}`);

        const startToken = localDateTimeToken(day.date, cell.start);
        let endDate = day.date;
        let endTime = cell.start;

        if (options.durationMode === '8h') {
          const end = addMinutesNaive(day.date, cell.start, 8 * 60);
          endDate = end.date;
          endTime = end.time;
        } else if (options.durationMode === 'actual') {
          if (cell.finish) {
            endDate = cell.finish <= cell.start ? addDays(day.date, 1) : day.date;
            endTime = cell.finish;
          } else {
            const end = addMinutesNaive(day.date, cell.start, 8 * 60);
            endDate = end.date;
            endTime = end.time;
            descriptionParts.push('Sign-off: 8 hours after sign-on (Flex fallback)');
          }
        }

        pushEvent([
          ['UID', `roster-shift-${yyyymmdd(day.date)}-${escapeIcsText(cell.shift || rosterLineLabel)}@rosterbot`],
          ['DTSTAMP', stamp],
          ['DTSTART;TZID=Australia/Melbourne', startToken],
          ['DTEND;TZID=Australia/Melbourne', localDateTimeToken(endDate, endTime)],
          ['SUMMARY', escapeIcsText(summary)],
          ['DESCRIPTION', escapeIcsText(descriptionParts.join('\n'))]
        ]);
      }
    }

    lines.push('END:VCALENDAR');
    return {
      ics: lines.map(foldIcsLine).join('\r\n') + '\r\n',
      eventCount
    };
  }

  function generateIcs(data, settings, options) {
    return generateIcsDocument(data, settings, options).ics;
  }

  const api = {
    DAY_KEYS,
    DAY_LABELS,
    clampInt,
    addDays,
    weekCommencing,
    compareIsoDates,
    wrapAdvance,
    generateLineSequence,
    buildWeeks,
    formatDateLong,
    formatDateShort,
    formatDateDayOnly,
    generateIcsDocument,
    generateIcs
  };

  root.RosterEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
