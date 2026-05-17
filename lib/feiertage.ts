function getEaster(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1
  const day   = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month, day)
}

function offset(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function key(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export function getGermanHolidays(year: number): Map<string, string> {
  const map = new Map<string, string>()
  const add = (d: Date, name: string) => map.set(key(d), name)

  const easter = getEaster(year)

  // Bundesweite Feiertage
  add(new Date(year, 0,  1),          'Neujahr')
  add(offset(easter, -2),             'Karfreitag')
  add(offset(easter,  0),             'Ostersonntag')
  add(offset(easter,  1),             'Ostermontag')
  add(new Date(year, 4,  1),          'Tag der Arbeit')
  add(offset(easter, 39),             'Christi Himmelfahrt')
  add(offset(easter, 49),             'Pfingstsonntag')
  add(offset(easter, 50),             'Pfingstmontag')
  add(offset(easter, 60),             'Fronleichnam')
  add(new Date(year, 9,  3),          'Tag der dt. Einheit')
  add(new Date(year, 10, 1),          'Allerheiligen')
  add(new Date(year, 11, 25),         '1. Weihnachtstag')
  add(new Date(year, 11, 26),         '2. Weihnachtstag')

  return map
}

export function holidayKey(date: Date): string {
  return key(date)
}

export function addWorkingDays(start: Date, numDays: number, holidays: Map<string, string>): Date {
  let current = new Date(start)
  current.setHours(0, 0, 0, 0)
  let remaining = numDays
  while (remaining > 0) {
    const dow = current.getDay()
    if (dow !== 0 && dow !== 6 && !holidays.has(key(current))) {
      remaining--
    }
    if (remaining > 0) current = offset(current, 1)
  }
  return offset(current, 1)
}
