// Convert an explicit wall-clock service date without depending on the server's local zone.
// DST gaps/overlaps require caller clarification instead of silent time shifts.
export function serviceTimeToInstant(date: string, time: string, timezone = 'Africa/Cairo'): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
        throw new Error('INVALID_SERVICE_TIME');
    const naive = Date.parse(`${date}T${time}:00Z`);
    if (!Number.isFinite(naive) || new Date(naive).toISOString().slice(0, 10) !== date)
        throw new Error('INVALID_SERVICE_DATE');
    const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    const matches: Date[] = [];
    for (let offset = -14 * 60; offset <= 14 * 60; offset += 15) {
        const candidate = new Date(naive - offset * 60000);
        const parts = Object.fromEntries(formatter.formatToParts(candidate).map(p => [p.type, p.value]));
        if (`${parts.year}-${parts.month}-${parts.day}` === date && `${parts.hour}:${parts.minute}` === time)
            matches.push(candidate);
    }
    if (!matches.length)
        throw new Error('NONEXISTENT_SERVICE_TIME');
    if (matches.length !== 1)
        throw new Error('AMBIGUOUS_SERVICE_TIME');
    return matches[0];
}
