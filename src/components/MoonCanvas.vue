<script setup>
import { ref, watch, onMounted } from 'vue'
import { renderMoon } from '../lib/moonRenderer'

const props = defineProps({ fraction: { type: Number, required: true }, angle: { type: Number, required: true }, label: { type: String, default: '月相' } })
const canvas = ref(null)
const ready = ref(false)
const error = ref('')
let revision = 0
async function paint() {
  if (!canvas.value) return
  const current = ++revision
  try {
    await renderMoon(canvas.value, props.fraction, props.angle)
    if (current === revision) { ready.value = true; error.value = '' }
  } catch (e) { error.value = e.message }
}
watch(() => [props.fraction, props.angle], paint)
onMounted(paint)
defineExpose({ getCanvas: () => ready.value && !error.value ? canvas.value : null })
</script>

<template>
  <div class="moon-render" :class="{ 'moon-ready': ready }" :style="{ '--moon-glow': 0.08 + fraction * 0.18 }">
    <div class="moon-aura" aria-hidden="true"></div>
    <canvas ref="canvas" role="img" :aria-label="`${label}，照亮比例 ${(fraction * 100).toFixed(1)}%`"></canvas>
    <span v-if="error" class="moon-loading" role="alert">{{ error }}</span>
    <span v-else-if="!ready" class="moon-loading">正在唤醒月光…</span>
  </div>
</template>
