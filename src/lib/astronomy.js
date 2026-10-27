import SunCalc from 'suncalc'
import LunarCalendar from 'lunar-javascript'

const { Solar } = LunarCalendar

export const MIN_DATE = '1901-01-01'
export const MAX_DATE = '2099-12-31'
const DAY_MS = 86_400_000
const CHINA_OFFSET_MS = 8 * 60 * 60 * 1000
const SYNODIC_MONTH = 29.530588853

// Every supplied location uses modern China Standard Time (UTC+08:00).
// Historical queries deliberately retain this fixed civil-time convention.
export const cities = Object.freeze([
  { id: 'beijing', name: '北京', label: '北京 · 中国', lat: 39.9042, lon: 116.4074, timeZone: 'Asia/Shanghai' },
  { id: 'shanghai', name: '上海', label: '上海 · 中国', lat: 31.2304, lon: 121.4737, timeZone: 'Asia/Shanghai' },
  { id: 'guangzhou', name: '广州', label: '广州 · 中国', lat: 23.1291, lon: 113.2644, timeZone: 'Asia/Shanghai' },
  { id: 'chengdu', name: '成都', label: '成都 · 中国', lat: 30.5728, lon: 104.0668, timeZone: 'Asia/Shanghai' },
  { id: 'hangzhou', name: '杭州', label: '杭州 · 中国', lat: 30.2741, lon: 120.1551, timeZone: 'Asia/Shanghai' },
  { id: 'shenzhen', name: '深圳', label: '深圳 · 中国', lat: 22.5431, lon: 114.0579, timeZone: 'Asia/Shanghai' },
])

/** Parse a Gregorian civil date without depending on the browser's timezone. */
export function parseDate(key) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    throw new RangeError('请输入 YYYY-MM-DD 格式的日期')
  }
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (key < MIN_DATE || key > MAX_DATE || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new RangeError(`请选择 ${MIN_DATE} 至 ${MAX_DATE} 之间的有效公历日期`)
  }
  return { year, month, day, key }
}

export function todayKey(timeZone = 'Asia/Shanghai') {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

/** Return the neighboring civil day, clamping at the app's documented bounds. */
export function addDays(key, delta) {
  const { year, month, day } = parseDate(key)
  if (!Number.isInteger(delta)) throw new RangeError('日期增量必须为整数')
  const result = new Date(Date.UTC(year, month - 1, day) + delta * DAY_MS).toISOString().slice(0, 10)
  return result < MIN_DATE ? MIN_DATE : result > MAX_DATE ? MAX_DATE : result
}

// Names such as 既朔 / 九夜 / 既望 are presentation categories, not official
// instantaneous astronomical events. Their exact thresholds are documented here.
export function phaseLabel(phase) {
  if (phase < 0.018 || phase >= 0.982) return { phaseName: '新月', englishName: 'NEW MOON', alias: '朔' }
  if (phase < 0.075) return { phaseName: '既朔月', englishName: 'WAXING CRESCENT', alias: '新月之后' }
  if (phase < 0.225) return { phaseName: '蛾眉月', englishName: 'WAXING CRESCENT', alias: '盈月' }
  if (phase < 0.275) return { phaseName: '上弦月', englishName: 'FIRST QUARTER', alias: '弦月' }
  if (phase < 0.33) return { phaseName: '九夜月', englishName: 'WAXING GIBBOUS', alias: '盈凸月' }
  if (phase < 0.475) return { phaseName: '渐盈凸月', englishName: 'WAXING GIBBOUS', alias: '盈凸月' }
  if (phase < 0.525) return { phaseName: '满月', englishName: 'FULL MOON', alias: '望' }
  if (phase < 0.58) return { phaseName: '既望月', englishName: 'WANING GIBBOUS', alias: '满月之后' }
  if (phase < 0.725) return { phaseName: '渐亏凸月', englishName: 'WANING GIBBOUS', alias: '亏凸月' }
  if (phase < 0.775) return { phaseName: '下弦月', englishName: 'LAST QUARTER', alias: '弦月' }
  if (phase < 0.95) return { phaseName: '残月', englishName: 'WANING CRESCENT', alias: '亏月' }
  return { phaseName: '晦月', englishName: 'WANING CRESCENT', alias: '晦' }
}

function sampleDate(key) {
  parseDate(key)
  // A historical day has no unique phase: all cards use 12:00 UTC+08:00.
  return new Date(`${key}T12:00:00+08:00`)
}

export function getMoonPreview(key) {
  const illumination = SunCalc.getMoonIllumination(sampleDate(key))
  return {
    ...phaseLabel(illumination.phase),
    fraction: illumination.fraction,
    phase: illumination.phase,
    illuminationAngle: illumination.angle,
    // Approximate age derived from phase; not elapsed time since a solved new moon.
    age: illumination.phase * SYNODIC_MONTH,
    waxing: illumination.phase < 0.5,
  }
}

function formatChinaTime(date) {
  return new Date(date.getTime() + CHINA_OFFSET_MS).toISOString().slice(11, 16)
}

/**
 * SunCalc's inUTC=true searches a UTC civil day. A China day spans two such
 * days; collect both and filter the actual instants into [local 00:00, 24:00).
 * Do not use getMoonTimes(..., false): that would use the *device* timezone.
 */
export function moonTimesForDate(key, city = cities[0]) {
  parseDate(key)
  const start = new Date(`${key}T00:00:00+08:00`).getTime()
  const end = start + DAY_MS
  const utcStart = Math.floor(start / DAY_MS) * DAY_MS
  const events = { rise: [], set: [] }
  for (let stamp = utcStart; stamp < end; stamp += DAY_MS) {
    const result = SunCalc.getMoonTimes(new Date(stamp), city.lat, city.lon, true)
    for (const kind of ['rise', 'set']) {
      const value = result[kind]
      if (value && Number.isFinite(value.getTime()) && value.getTime() >= start && value.getTime() < end) {
        events[kind].push(value)
      }
    }
  }
  for (const kind of ['rise', 'set']) events[kind].sort((a, b) => a - b)
  const bothAbsent = !events.rise.length && !events.set.length
  const above = SunCalc.getMoonPosition(new Date(start + DAY_MS / 2), city.lat, city.lon).altitude > 0
  const absent = bothAbsent ? (above ? '整日地平线上' : '整日地平线下') : null
  return {
    rise: events.rise.length ? formatChinaTime(events.rise[0]) : absent || '本日无月出',
    set: events.set.length ? formatChinaTime(events.set[0]) : absent || '本日无月落',
    riseInstant: events.rise[0]?.toISOString() ?? null,
    setInstant: events.set[0]?.toISOString() ?? null,
  }
}

export function buildMoonData(key, city = cities[0]) {
  const { year, month, day } = parseDate(key)
  const preview = getMoonPreview(key)
  const position = SunCalc.getMoonPosition(sampleDate(key), city.lat, city.lon)
  const lunar = Solar.fromYmd(year, month, day).getLunar()
  return {
    ...preview,
    ...moonTimesForDate(key, city),
    dateKey: key,
    city,
    lunarText: `农历${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    lunarMonth: lunar.getMonthInChinese(),
    lunarDay: lunar.getDayInChinese(),
    distance: position.distance.toFixed(2),
    distanceKm: position.distance,
    // Angle counterclockwise from local zenith; renderer may alternatively use
    // illuminationAngle for a north-up lunar disk, but must declare that mode.
    observerAngle: preview.illuminationAngle - position.parallacticAngle,
    sampleTime: `${key}T12:00:00+08:00`,
    samplingLabel: '当日 12:00 · UTC+8',
  }
}
