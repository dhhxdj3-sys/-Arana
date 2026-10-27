<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const canvas = ref(null)
let dispose = () => {}

onMounted(() => {
  const context = canvas.value.getContext('2d')
  if (!context) return

  const stillSky = document.createElement('canvas')
  const stillContext = stillSky.getContext('2d')
  if (!stillContext) return
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  let width = 0
  let height = 0
  let twinklingStars = []
  let frame = 0
  let previousFrame = 0

  function drawStar(target, star, alpha = star.alpha) {
    target.fillStyle = `rgba(${star.color},${alpha})`
    if (star.radius < 0.55) {
      const diameter = star.radius * 2
      target.fillRect(star.x - star.radius, star.y - star.radius, diameter, diameter)
    } else {
      target.beginPath()
      target.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
      target.fill()
    }
    if (star.radius > 1.05) {
      target.fillStyle = `rgba(${star.color},${alpha * 0.045})`
      target.beginPath()
      target.arc(star.x, star.y, star.radius * 2.5, 0, Math.PI * 2)
      target.fill()
    }
  }

  function draw(time) {
    context.clearRect(0, 0, width, height)
    context.drawImage(stillSky, 0, 0, width, height)
    for (const star of twinklingStars) {
      // Two slow, independent cycles avoid a synchronized field-wide pulse.
      const drift = Math.sin(time * star.speed + star.phase) * 0.12
        + Math.sin(time * star.speed * 0.43 + star.phase * 1.7) * 0.06
      drawStar(context, star, star.alpha * (0.82 + drift))
    }
  }

  function resize() {
    width = canvas.value.parentElement.clientWidth
    height = canvas.value.parentElement.clientHeight
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    for (const surface of [canvas.value, stillSky]) {
      surface.width = Math.round(width * ratio)
      surface.height = Math.round(height * ratio)
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    stillContext.setTransform(ratio, 0, 0, ratio, 0, 0)
    let seed = 96321
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }
    const count = Math.min(4500, Math.floor(width * height / 420))
    twinklingStars = []
    for (let i = 0; i < count; i++) {
      let x, y, acceptance
      do {
        x = random()
        y = random()
        // Broad patches keep the sky gently uneven, without a decorative grid.
        const band = Math.exp(-(((y - (0.25 + 0.34 * x)) / 0.25) ** 2))
        const patch = Math.exp(-(((x - 0.72) / 0.32) ** 2 + ((y - 0.3) / 0.22) ** 2))
        acceptance = 0.52 + 0.3 * band + 0.18 * patch
      } while (random() > acceptance)
      const sizeChoice = random()
      const tiny = sizeChoice < 0.8
      const medium = sizeChoice < 0.965
      const star = {
        x: x * width,
        y: y * height * 0.92,
        radius: tiny ? 0.22 + random() * 0.33 : medium ? 0.46 + random() * 0.39 : 0.9 + random() * 0.35,
        alpha: tiny ? 0.13 + random() * 0.27 : medium ? 0.32 + random() * 0.3 : 0.58 + random() * 0.23,
        color: random() < 0.13 ? '224,216,198' : '204,210,222',
        phase: random() * Math.PI * 2,
        speed: Math.PI * 2 / (12000 + random() * 20000),
      }
      if (!motionPreference.matches && random() < 0.065 && twinklingStars.length < Math.floor(count * 0.08)) twinklingStars.push(star)
      else drawStar(stillContext, star)
    }
    draw(0)
  }

  function animate(time) {
    if (time - previousFrame >= 50) {
      draw(time)
      previousFrame = time
    }
    frame = requestAnimationFrame(animate)
  }

  function updateAnimation() {
    cancelAnimationFrame(frame)
    if (!document.hidden && !motionPreference.matches) {
      previousFrame = 0
      frame = requestAnimationFrame(animate)
    }
  }

  function updateMotionPreference() {
    resize()
    updateAnimation()
  }

  resize()
  updateAnimation()
  const sizeObserver = new ResizeObserver(resize)
  sizeObserver.observe(canvas.value.parentElement)
  document.addEventListener('visibilitychange', updateAnimation)
  motionPreference.addEventListener('change', updateMotionPreference)
  dispose = () => {
    cancelAnimationFrame(frame)
    sizeObserver.disconnect()
    document.removeEventListener('visibilitychange', updateAnimation)
    motionPreference.removeEventListener('change', updateMotionPreference)
  }
})

onUnmounted(() => dispose())
</script>

<template>
  <canvas ref="canvas" class="star-field" aria-hidden="true"></canvas>
</template>
