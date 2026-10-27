<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { Moon, ChevronDown, ChevronLeft, ChevronRight, ArrowUpRight, Search, Share2, Maximize2, X, MapPin, CalendarDays, Images, UserRound, Sunrise, Sunset, MoveHorizontal, Plus, Heart, Check, Download, Info, Bookmark, ArrowRight } from 'lucide-vue-next'
import MoonCanvas from './components/MoonCanvas.vue'
import StarField from './components/StarField.vue'
import CitySkyline from './components/CitySkyline.vue'
import DatePicker from './components/DatePicker.vue'
import { cities, MIN_DATE, MAX_DATE, todayKey, addDays, parseDate, buildMoonData, getMoonPreview } from './lib/astronomy'

function readSaved() { try { const value = JSON.parse(localStorage.getItem('moon-memories') || '[]'); return Array.isArray(value) ? value.filter(v => { try { parseDate(v.date); return typeof v.name === 'string' } catch { return false } }).slice(0, 30) : [] } catch { return [] } }
function initialDate() { try { const value = new URLSearchParams(location.search).get('date'); if (value) return parseDate(value).key } catch {} return todayKey() }
const selectedDate = ref(initialDate())
const selectedCity = ref(cities.find(city => city.id === new URLSearchParams(location.search).get('city')) || cities[0])
const data = computed(() => buildMoonData(selectedDate.value, selectedCity.value))
const moon = ref(null)
const panel = ref(null)
const panelElement = ref(null)
const dateInput = ref(selectedDate.value)
const datePicker = ref(null)
const dateFields = [{ key: 'year', label: '年份', suffix: '年' }, { key: 'month', label: '月份', suffix: '月' }, { key: 'day', label: '日期', suffix: '日' }]
const formError = ref('')
const toast = ref('')
const memories = ref(readSaved())
const memoryName = ref('我的生日')
const copied = ref(false)
const calendarMonth = ref(selectedDate.value.slice(0, 7))
let toastTimer, oldFocus
const phasePercent = computed(() => (data.value.fraction * 100).toFixed(1))
const dateParts = computed(() => parseDate(selectedDate.value))
const dateLabel = computed(() => `${dateParts.value.year}年 ${dateParts.value.month}月${dateParts.value.day}日`)
const dateWeek = computed(() => new Intl.DateTimeFormat('zh-CN', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${selectedDate.value}T12:00:00Z`)))
const monthLabel = computed(() => `${Number(calendarMonth.value.slice(0, 4))}年 ${Number(calendarMonth.value.slice(5))}月`)
const calendarDays = computed(() => {
  const [year, month] = calendarMonth.value.split('-').map(Number)
  const first = new Date(Date.UTC(year, month - 1, 1))
  const offset = (first.getUTCDay() + 6) % 7
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(first.getTime() + (i - offset) * 86400000)
    const key = date.toISOString().slice(0, 10)
    if (key < MIN_DATE || key > MAX_DATE) return { key, disabled: true, day: date.getUTCDate() }
    return { key, day: date.getUTCDate(), muted: key.slice(0, 7) !== calendarMonth.value, ...getMoonPreview(key) }
  })
})
const gallery = computed(() => {
  const targets = [0, .125, .25, .375, .5, .625, .75, .875]
  const samples = Array.from({ length: 60 }, (_, i) => { const key = addDays(selectedDate.value, i - 29); return { key, ...getMoonPreview(key) } })
  const phaseDistance = (a, b) => { const delta = Math.abs(a - b); return Math.min(delta, 1 - delta) }
  return targets.map(target => samples.reduce((best, item) => phaseDistance(item.phase, target) < phaseDistance(best.phase, target) ? item : best))
})
const shareUrl = computed(() => { const url = new URL(location.href); url.searchParams.set('date', selectedDate.value); url.searchParams.set('city', selectedCity.value.id); return url.href })

function notify(message) { toast.value = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.value = '', 3300) }
function moveDate(delta) { selectedDate.value = addDays(selectedDate.value, delta) }
function goToday() { selectedDate.value = todayKey(); closePanel(); notify('已回到今天的月亮') }
function openPanel(name, dateField = 'year') {
  oldFocus = document.activeElement
  panel.value = name
  dateInput.value = selectedDate.value
  calendarMonth.value = selectedDate.value.slice(0, 7)
  formError.value = ''
  copied.value = false
  nextTick(() => {
    if (name === 'date') datePicker.value?.openField(dateField)
    else panelElement.value?.querySelector('button, input')?.focus()
  })
}
function closePanel() { panel.value = null; nextTick(() => oldFocus?.focus()) }
function chooseDate(value) { try { parseDate(value); selectedDate.value = value; closePanel() } catch (e) { formError.value = e.message } }
function shiftMonth(delta) { const [year, month] = calendarMonth.value.split('-').map(Number); const next = new Date(Date.UTC(year, month - 1 + delta, 1)).toISOString().slice(0, 7); if (next >= MIN_DATE.slice(0, 7) && next <= MAX_DATE.slice(0, 7)) calendarMonth.value = next }
function saveMemory() {
  if (!memoryName.value.trim()) return notify('先为这一天起个名字吧')
  const entry = { name: memoryName.value.trim().slice(0, 24), date: selectedDate.value }
  const next = [entry, ...memories.value.filter(item => item.date !== entry.date)].slice(0, 30)
  try { localStorage.setItem('moon-memories', JSON.stringify(next)); memories.value = next; notify('这一天的月亮，已收藏在此浏览器') } catch { notify('浏览器无法保存，请检查存储权限') }
}
function removeMemory(date) { const next = memories.value.filter(item => item.date !== date); try { localStorage.setItem('moon-memories', JSON.stringify(next)); memories.value = next } catch { notify('浏览器无法更新收藏') } }
async function share() { openPanel('share') }
async function copyLink() { try { await navigator.clipboard.writeText(shareUrl.value); copied.value = true; notify('月相链接已复制') } catch { notify('请选中下方链接，手动复制') } }
async function fullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen() } catch { notify('当前浏览器不支持全屏显示') } }
async function savePoster() {
  const source = moon.value?.getCanvas()
  if (!source || !source.width) return notify('月球贴图仍在载入，请稍后重试')
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1440
  const c = canvas.getContext('2d')
  const gradient = c.createLinearGradient(0, 0, 0, 1440); gradient.addColorStop(0, '#020304'); gradient.addColorStop(1, '#090b10'); c.fillStyle = gradient; c.fillRect(0, 0, 1080, 1440)
  for (let i = 0; i < 210; i++) { c.fillStyle = `rgba(225,233,255,${.15 + (i % 6) / 12})`; c.fillRect((i * 433) % 1080, (i * 379) % 1440, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1) }
  c.textAlign = 'center'; c.fillStyle = '#cfbc8d'; c.font = '22px sans-serif'; c.fillText('月 球 视 角  /  YOUR MOON, YOUR MOMENT', 540, 130)
  c.fillStyle = '#f4f5f8'; c.font = '56px sans-serif'; c.fillText(data.value.phaseName, 540, 260); c.drawImage(source, 165, 340, 750, 750)
  c.font = '34px sans-serif'; c.fillText(dateLabel.value, 540, 1160); c.fillStyle = '#abb6cc'; c.font = '24px sans-serif'; c.fillText(`${data.value.lunarText}  ·  照亮 ${phasePercent.value}%`, 540, 1220)
  c.font = '18px sans-serif'; c.fillText(`${selectedCity.value.name} · 当日12:00 UTC+8 · 北向上`, 540, 1300); c.fillText("Moon texture: NASA's Scientific Visualization Studio", 540, 1360)
  canvas.toBlob(blob => { if (!blob) return notify('图片保存失败'); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `我的月亮-${selectedDate.value}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000); notify('月相纪念卡已生成') }, 'image/png')
}
function keyHandler(event) {
  if (panel.value) {
    if (event.key === 'Escape') closePanel()
    if (event.key === 'Tab') { const elements = [...panelElement.value.querySelectorAll('button:not(:disabled),input,select,a[href]')]; const first = elements[0], last = elements.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() } }
    return
  }
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return
  if (event.key === 'ArrowLeft') moveDate(-1)
  if (event.key === 'ArrowRight') moveDate(1)
}
watch(panel, value => { document.body.style.overflow = value ? 'hidden' : '' })
watch([selectedDate, selectedCity], () => { const url = new URL(location.href); url.searchParams.set('date', selectedDate.value); url.searchParams.set('city', selectedCity.value.id); history.replaceState(null, '', url) })
onMounted(() => window.addEventListener('keydown', keyHandler))
onUnmounted(() => { clearTimeout(toastTimer); window.removeEventListener('keydown', keyHandler); document.body.style.overflow = '' })
</script>

<template>
  <div class="observatory">
    <StarField />
    <header class="utility-bar" aria-label="观测工具">
      <div class="header-actions"><button class="location-button" @click="openPanel('location')"><MapPin :size="14"/><span>{{ selectedCity.name }}</span><ChevronDown :size="12"/></button><span class="action-divider"></span><button class="icon-button search-button" aria-label="搜索日期" title="搜索日期" @click="openPanel('date')"><Search :size="19"/></button><button class="icon-button" aria-label="分享月相" title="分享月相" @click="share"><Share2 :size="18"/></button><button class="icon-button fullscreen-button" aria-label="切换全屏" title="切换全屏" @click="fullscreen"><Maximize2 :size="18"/></button></div>
    </header>

    <main class="moon-page">
      <div class="phase-heading"><h1>{{ data.phaseName }}</h1><p>{{ data.waxing ? '月渐盈' : '月渐亏' }}<span class="heading-dot">·</span>照亮 {{ phasePercent }}%</p></div>
      <section class="moon-stage" aria-label="所选日期的月相">
        <MoonCanvas ref="moon" :fraction="data.fraction" :angle="data.illuminationAngle" :label="data.phaseName"/>
        <span class="orientation-label">月面北向上</span>
      </section>

      <section class="moon-information" aria-label="日期与天文信息">
        <div class="date-navigator">
          <button class="day-arrow" aria-label="前一天" :disabled="selectedDate === MIN_DATE" @click="moveDate(-1)"><ChevronLeft :size="20"/></button>
          <div class="date-segments" role="group" aria-label="公历日期">
            <button v-for="field in dateFields" :key="field.key" class="date-segment" :aria-label="`展开${field.label}选择`" aria-haspopup="dialog" :aria-expanded="panel === 'date'" @click="openPanel('date', field.key)"><span>{{ dateParts[field.key] }}{{ field.suffix }}</span><ChevronDown :size="12"/></button>
          </div>
          <button class="today-button" aria-label="回到今天" title="回到今天" @click="goToday">今</button>
          <button class="day-arrow" aria-label="后一天" :disabled="selectedDate === MAX_DATE" @click="moveDate(1)"><ChevronRight :size="20"/></button>
        </div>
        <p class="lunar-date">{{ data.lunarText }}<span>·</span>{{ dateWeek }}</p>
        <div class="astronomy-row"><div class="astro-item"><Sunrise :size="19" :stroke-width="1.3"/><div><small>月出时间</small><strong>{{ data.rise }}</strong></div></div><span class="astro-separator"></span><div class="astro-item"><Sunset :size="19" :stroke-width="1.3"/><div><small>月落时间</small><strong>{{ data.set }}</strong></div></div><span class="astro-separator"></span><div class="astro-item distance-item"><MoveHorizontal :size="18" :stroke-width="1.3"/><div><small>地月距离</small><strong>{{ Number(data.distance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}<em>km</em></strong></div></div></div>
        <button class="calculation-note" @click="openPanel('about')"><span></span>{{ selectedCity.name }}观测 · 当日 12:00 · UTC+8<Info :size="11"/></button>
      </section>
    </main>

    <CitySkyline />
    <footer class="bottom-area"><div class="footer-coordinate"><span class="live-dot"></span>{{ selectedCity.lat.toFixed(2) }}° N &nbsp; {{ selectedCity.lon.toFixed(2) }}° E<small>观测坐标</small></div><nav class="bottom-dock" aria-label="功能导航"><button :class="{ selected: !panel || ['date','location','about','share'].includes(panel) }" @click="closePanel"><Moon :size="21" :stroke-width="1.5"/><span>月相</span></button><button :class="{ selected: panel === 'calendar' }" @click="openPanel('calendar')"><CalendarDays :size="21" :stroke-width="1.5"/><span>月历</span></button><button :class="{ selected: panel === 'gallery' }" @click="openPanel('gallery')"><Images :size="21" :stroke-width="1.5"/><span>月相图鉴</span></button><button :class="{ selected: panel === 'memories' }" @click="openPanel('memories')"><UserRound :size="21" :stroke-width="1.5"/><span>我的</span></button></nav><button class="footer-credit" @click="openPanel('about')">月相与时间说明<Info :size="13"/></button></footer>

    <Transition name="toast"><div v-if="toast" class="toast-message" role="status"><Check :size="15"/>{{ toast }}</div></Transition>
    <Transition name="modal"><div v-if="panel" class="modal-backdrop" @click.self="closePanel"><section ref="panelElement" class="dialog-panel" :class="`panel-${panel}`" role="dialog" aria-modal="true" :aria-labelledby="`title-${panel}`"><button class="dialog-close icon-button" aria-label="关闭弹窗" @click="closePanel"><X :size="21"/></button>
      <template v-if="panel === 'date'">
        <h2 id="title-date">选择日期</h2>
        <p class="dialog-description">生日、纪念日，或你想回看的某一天。</p>
        <form @submit.prevent="chooseDate(dateInput)">
          <DatePicker ref="datePicker" v-model="dateInput" />
          <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
          <div class="date-form-actions"><button class="secondary-button" type="button" @click="closePanel">取消</button><button class="primary-button" type="submit">查看月相<ArrowRight :size="16"/></button></div>
        </form>
        <div class="date-panel-footer"><button type="button" @click="dateInput = todayKey()">填入今天</button><span>1901—2099 年 · 公历</span></div>
      </template>

      <template v-else-if="panel === 'location'"><h2 id="title-location">你在哪座城市看月亮</h2><p class="dialog-description">月出与月落随观测地点变化。</p><div class="city-options"><button v-for="city in cities" :key="city.id" :class="{ chosen: selectedCity.id === city.id }" @click="selectedCity = city; closePanel()"><MapPin :size="17"/><span>{{ city.name }}<small>{{ city.lat.toFixed(2) }}° N, {{ city.lon.toFixed(2) }}° E</small></span><Check v-if="selectedCity.id === city.id" :size="16"/></button></div><p class="dialog-footnote">各城市均使用 UTC+8；天际线为艺术化城市剪影。</p></template>

      <template v-else-if="panel === 'calendar'"><h2 id="title-calendar">月光日历</h2><div class="calendar-toolbar"><button class="icon-button" aria-label="上个月" :disabled="calendarMonth === '1901-01'" @click="shiftMonth(-1)"><ChevronLeft :size="20"/></button><strong>{{ monthLabel }}</strong><button class="icon-button" aria-label="下个月" :disabled="calendarMonth === '2099-12'" @click="shiftMonth(1)"><ChevronRight :size="20"/></button></div><div class="calendar-grid weekdays"><span v-for="day in ['一','二','三','四','五','六','日']" :key="day">{{ day }}</span></div><div class="calendar-grid"><button v-for="day in calendarDays" :key="day.key" :disabled="day.disabled" :class="{ muted: day.muted, current: day.key === selectedDate }" :aria-label="`${day.key} ${day.phaseName || ''}`" @click="chooseDate(day.key)"><span class="mini-moon" :style="{ '--light': `${(day.fraction || 0) * 100}%`, '--direction': day.waxing ? '90deg' : '270deg' }"></span><span>{{ day.day }}</span></button></div><p class="dialog-footnote">点击日期，回到那一晚。小月亮为照亮比例示意。</p></template>

      <template v-else-if="panel === 'gallery'"><h2 id="title-gallery">月相图鉴</h2><p class="dialog-description">一轮盈亏，八种相遇。</p><div class="phase-gallery"><button v-for="item in gallery" :key="item.key+item.phaseName" @click="chooseDate(item.key)"><MoonCanvas :fraction="item.fraction" :angle="item.illuminationAngle" :label="item.phaseName"/><strong>{{ item.phaseName }}</strong><small>{{ item.key }}</small></button></div><p class="dialog-footnote">展示当前日期前后约一月内的代表月相。</p></template>

      <template v-else-if="panel === 'memories'"><h2 id="title-memories">收藏一片月光</h2><p class="dialog-description">让特别的日子，有一轮专属的月亮。</p><div class="save-current"><Bookmark :size="22"/><div><strong>{{ dateLabel }}</strong><small>{{ data.lunarText }} · {{ data.phaseName }}</small></div></div><form class="memory-form" @submit.prevent="saveMemory"><label class="field-label" for="memory-name">为这一天命名</label><div><input id="memory-name" v-model="memoryName" maxlength="24" placeholder="例如：我的生日" required/><button type="submit" aria-label="收藏这一天"><Plus :size="20"/></button></div></form><div v-if="memories.length" class="memory-list"><div v-for="item in memories" :key="item.date"><button @click="chooseDate(item.date)"><Heart :size="15"/><span>{{ item.name }}<small>{{ item.date }}</small></span><ArrowUpRight :size="15"/></button><button class="remove-memory" :aria-label="`删除收藏 ${item.name}`" @click="removeMemory(item.date)"><X :size="14"/></button></div></div><div v-else class="empty-memory"><Moon :size="24"/><p>第一轮收藏的月亮，会属于哪一天？</p></div><p class="dialog-footnote">收藏仅保存在当前浏览器，无需登录。</p></template>

      <template v-else-if="panel === 'share'"><h2 id="title-share">把这轮月亮送给你</h2><p class="dialog-description">{{ dateLabel }} · {{ data.phaseName }}</p><div class="share-preview"><MoonCanvas :fraction="data.fraction" :angle="data.illuminationAngle" :label="data.phaseName"/></div><button class="primary-button" @click="savePoster"><Download :size="17"/>保存月相纪念卡</button><button class="secondary-button" @click="copyLink"><Check v-if="copied" :size="16"/><Share2 v-else :size="16"/>{{ copied ? '已复制链接' : '复制这一天的链接' }}</button><label class="field-label" for="share-link">月相链接</label><input id="share-link" :value="shareUrl" readonly @focus="$event.target.select()"/><p class="dialog-footnote">本地预览链接仅本机可访问；部署后可分享给他人。</p></template>

      <template v-else-if="panel === 'about'"><h2 id="title-about">关于这轮月亮</h2><div class="about-copy"><p>月相、照亮比例与地月距离统一取所选日期 <strong>12:00（UTC+8）</strong>。月出、月落按所选城市的当天 00:00—24:00 计算。</p><p>月球以<strong>北向上、东向左</strong>显示。NASA 真实底色贴图经球面投影，再由太阳方向计算光影；弱地照光为视觉模拟。未模拟天平动、山体投影与大气折射变化。</p><p>SunCalc 提供近似天文算法。距离的小数位仅为格式化显示，不代表厘米或十米级测量精度。传统月相名称按应用区间命名，精确朔望时刻与名称区间不同。</p><p>历史日期统一使用现代 UTC+8，不重建历史夏令时。适用范围 1901—2099 年，用于日常观赏和科普。</p><p class="asset-credit">Moon texture: NASA's Scientific Visualization Studio<br/>农历：lunar-javascript · 天文：SunCalc<br/>城市天际线：程序化矢量绘制</p></div><button class="secondary-button" @click="closePanel">继续看月亮<Moon :size="16"/></button></template>
    </section></div></Transition>
  </div>
</template>

