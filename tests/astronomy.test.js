import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import SunCalc from 'suncalc'
import { cities, MIN_DATE, MAX_DATE, parseDate, addDays, getMoonPreview, moonTimesForDate, buildMoonData } from '../src/lib/astronomy.js'

test('Gregorian validation rejects normalized and out-of-range dates', () => {
  assert.deepEqual(parseDate('2024-02-29'), { year: 2024, month: 2, day: 29, key: '2024-02-29' })
  for (const date of ['', '2023-02-29', '2024-02-30', '2024-13-01', '2024-00-01', '2024-1-01', '1900-12-31', '2100-01-01']) {
    assert.throws(() => parseDate(date), RangeError)
  }
  assert.throws(() => parseDate(null), RangeError)
})

test('day stepping handles leap days, years, and supported endpoints', () => {
  assert.equal(addDays('2024-02-28', 1), '2024-02-29')
  assert.equal(addDays('2024-03-01', -1), '2024-02-29')
  assert.equal(addDays('2023-12-31', 1), '2024-01-01')
  assert.equal(addDays(MIN_DATE, -1), MIN_DATE)
  assert.equal(addDays(MAX_DATE, 1), MAX_DATE)
})

test('Chinese New Year and reference screenshot dates convert correctly', () => {
  assert.equal(buildMoonData('2024-02-10').lunarText, '农历正月初一')
  assert.equal(buildMoonData('2012-11-15').lunarText, '农历十月初二')
  assert.equal(buildMoonData('2013-06-29').lunarText, '农历五月廿二')
  assert.equal(buildMoonData('2023-03-22').lunarText, '农历闰二月初一')
})

test('phase and distance use the declared noon instant rather than runtime clock', () => {
  const date = '2012-11-15'
  const instant = new Date(`${date}T12:00:00+08:00`)
  const illumination = SunCalc.getMoonIllumination(instant)
  const result = buildMoonData(date)
  assert.equal(result.fraction, illumination.fraction)
  assert.equal(result.phase, illumination.phase)
  assert.equal(result.illuminationAngle, illumination.angle)
  assert.equal(result.distanceKm, SunCalc.getMoonPosition(instant, cities[0].lat, cities[0].lon).distance)
  assert.match(result.distance, /^\d+\.\d{2}$/)
  assert.ok(result.distanceKm > 350000 && result.distanceKm < 410000)
})

test('near new/full dates and reference crescents have plausible illuminated areas', () => {
  assert.ok(getMoonPreview('2024-04-09').fraction < 0.02)
  assert.ok(getMoonPreview('2024-03-25').fraction > 0.98)
  assert.ok(getMoonPreview('2012-11-15').fraction < 0.1)
  assert.equal(getMoonPreview('2012-11-15').waxing, true)
  assert.equal(getMoonPreview('2013-06-29').waxing, false)
})

test('moonrise/set event instants stay within the selected China civil date', () => {
  // A whole lunation exercises early/late UTC times and days with a missing rise/set.
  for (const city of cities) {
    for (let day = 1; day <= 31; day++) {
      const date = `2026-10-${String(day).padStart(2, '0')}`
      const result = moonTimesForDate(date, city)
      for (const kind of ['rise', 'set']) {
        const iso = result[`${kind}Instant`]
        if (iso) {
          assert.equal(new Date(new Date(iso).getTime() + 8 * 3600000).toISOString().slice(0, 10), date)
          assert.match(result[kind], /^\d{2}:\d{2}$/)
        } else {
          assert.ok(/无月|整日/.test(result[kind]))
        }
      }
    }
  }
})

test('changing observation city changes rise/set but preserves geocentric phase/distance', () => {
  const beijing = buildMoonData('2026-10-26', cities[0])
  const chengdu = buildMoonData('2026-10-26', cities[3])
  assert.notEqual(beijing.rise, chengdu.rise)
  assert.equal(beijing.fraction, chengdu.fraction)
  assert.equal(beijing.distance, chengdu.distance)
})

test('results do not depend on host timezone', () => {
  const modulePath = new URL('../src/lib/astronomy.js', import.meta.url).href
  const code = `import { buildMoonData } from ${JSON.stringify(modulePath)}; console.log(JSON.stringify(buildMoonData('2013-06-29')))`
  const cwd = fileURLToPath(new URL('..', import.meta.url))
  const outputs = ['UTC', 'America/Los_Angeles', 'Asia/Shanghai'].map((TZ) => execFileSync(process.execPath, ['--input-type=module', '-e', code], { cwd, env: { ...process.env, TZ }, encoding: 'utf8' }))
  assert.equal(outputs[0], outputs[1])
  assert.equal(outputs[1], outputs[2])
})
