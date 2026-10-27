<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ChevronDown, Check } from 'lucide-vue-next'
import { MIN_DATE, MAX_DATE, parseDate } from '../lib/astronomy'

const props = defineProps({ modelValue: { type: String, required: true } })
const emit = defineEmits(['update:modelValue'])
const picker = ref(null)
const activeField = ref(null)
const adjustment = ref('')
const draft = ref(parseDate(props.modelValue))
const fields = [
  { key: 'year', label: '年份', suffix: '年', columns: 4 },
  { key: 'month', label: '月份', suffix: '月', columns: 3 },
  { key: 'day', label: '日期', suffix: '日', columns: 7 },
]
const daysInMonth = computed(() => new Date(Date.UTC(draft.value.year, draft.value.month, 0)).getUTCDate())
const field = computed(() => fields.find(item => item.key === activeField.value))
const options = computed(() => {
  if (activeField.value === 'year') return Array.from({ length: Number(MAX_DATE.slice(0, 4)) - Number(MIN_DATE.slice(0, 4)) + 1 }, (_, i) => Number(MIN_DATE.slice(0, 4)) + i)
  if (activeField.value === 'month') return Array.from({ length: 12 }, (_, i) => i + 1)
  if (activeField.value === 'day') return Array.from({ length: daysInMonth.value }, (_, i) => i + 1)
  return []
})
const preview = computed(() => `${draft.value.year}年${draft.value.month}月${draft.value.day}日`)

watch(() => props.modelValue, value => {
  const current = `${draft.value.year}-${String(draft.value.month).padStart(2, '0')}-${String(draft.value.day).padStart(2, '0')}`
  if (value !== current) adjustment.value = ''
  draft.value = parseDate(value)
})

async function focusOption(value) {
  await nextTick()
  const option = picker.value?.querySelector(`[data-date-option="${value}"]`)
  option?.focus({ preventScroll: true })
  option?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

function openField(key) {
  activeField.value = key
  focusOption(draft.value[key])
}

function toggleField(key) {
  if (activeField.value === key) activeField.value = null
  else openField(key)
}

function closeList() {
  const key = activeField.value
  activeField.value = null
  nextTick(() => picker.value?.querySelector(`[data-date-field="${key}"]`)?.focus())
}

function chooseOption(value) {
  const key = activeField.value
  const oldDay = draft.value.day
  const next = { ...draft.value, [key]: value }
  const maxDay = new Date(Date.UTC(next.year, next.month, 0)).getUTCDate()
  next.day = Math.min(next.day, maxDay)
  draft.value = next
  adjustment.value = next.day !== oldDay ? `该月有 ${maxDay} 天，已调整为 ${next.month}月${next.day}日。` : ''
  const dateKey = `${next.year}-${String(next.month).padStart(2, '0')}-${String(next.day).padStart(2, '0')}`
  emit('update:modelValue', dateKey)
  closeList()
}

function onListKey(event) {
  if (!activeField.value) return
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeList(); return }
  const current = Number(document.activeElement?.dataset.dateOption)
  if (!options.value.includes(current)) return
  const index = options.value.indexOf(current)
  let next = index
  if (event.key === 'ArrowDown') next += field.value.columns
  else if (event.key === 'ArrowUp') next -= field.value.columns
  else if (event.key === 'ArrowRight') next++
  else if (event.key === 'ArrowLeft') next--
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = options.value.length - 1
  else return
  event.preventDefault()
  event.stopPropagation()
  focusOption(options.value[Math.max(0, Math.min(options.value.length - 1, next))])
}

function onOutsidePointer(event) {
  if (!picker.value?.contains(event.target)) activeField.value = null
}

onMounted(() => document.addEventListener('pointerdown', onOutsidePointer))
onUnmounted(() => document.removeEventListener('pointerdown', onOutsidePointer))
defineExpose({ openField })
</script>

<template>
  <div ref="picker" class="birthday-picker" @keydown="onListKey">
    <div class="date-fields">
      <div v-for="item in fields" :key="item.key" class="date-field">
        <span class="field-label">{{ item.label }}</span>
        <button
          type="button"
          class="date-field-trigger"
          :class="{ expanded: activeField === item.key }"
          :data-date-field="item.key"
          :aria-label="`选择${item.label}`"
          aria-haspopup="listbox"
          :aria-expanded="activeField === item.key"
          :aria-controls="activeField === item.key ? 'birthday-options' : undefined"
          @click="toggleField(item.key)"
          @keydown.down.prevent="openField(item.key)"
        >
          <span>{{ draft[item.key] }}{{ item.suffix }}</span>
          <ChevronDown :size="15" />
        </button>
      </div>
    </div>
    <div
      v-if="field"
      id="birthday-options"
      class="date-options"
      :class="`date-options-${field.key}`"
      role="listbox"
      :aria-label="`${field.label}选项`"
      :style="{ '--option-columns': field.columns }"
    >
      <button
        v-for="value in options"
        :key="`${field.key}-${value}`"
        type="button"
        role="option"
        :data-date-option="value"
        :aria-label="`${value}${field.suffix}`"
        :aria-selected="value === draft[field.key]"
        :tabindex="value === draft[field.key] ? 0 : -1"
        @click="chooseOption(value)"
      >
        {{ value }}<span v-if="field.key !== 'day'">{{ field.suffix }}</span>
        <Check v-if="value === draft[field.key]" :size="11" />
      </button>
    </div>
    <p class="date-selection-preview">将查看：<strong>{{ preview }}</strong></p>
    <p v-if="adjustment" class="date-adjustment" role="status">{{ adjustment }}</p>
  </div>
</template>
