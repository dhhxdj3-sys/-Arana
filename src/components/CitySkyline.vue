<script setup>
// Seeded vector buildings keep every window steady across Vue updates.
function layer(seed, count, min, max) {
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
  let x = -20
  return Array.from({ length: count }, (_, i) => {
    const width = 14 + random() * 27
    const height = min + random() * (max - min)
    const windows = []
    for (let wx = 4; wx < width - 3; wx += 6) for (let wy = 7; wy < height - 5; wy += 8) if (random() > 0.67) windows.push({ x: x + wx, y: 280 - height + wy, warm: random() > 0.7, opacity: 0.18 + random() * 0.46 })
    const building = { x, width, height, windows, antenna: i % 9 === 0 }
    x += width + random() * 6
    return building
  })
}
const back = layer(721, 62, 20, 87)
const middle = layer(8712, 62, 26, 164)
const front = layer(12212, 58, 18, 78)
</script>

<template>
  <div class="city-scene" aria-hidden="true">
    <div class="city-haze"></div>
    <svg viewBox="0 0 1600 280" preserveAspectRatio="xMidYMax slice">
      <defs>
        <linearGradient id="tower" x2="0" y2="1"><stop stop-color="#191c20"/><stop offset="1" stop-color="#040608"/></linearGradient>
        <linearGradient id="city-fade" x2="0" y2="1"><stop stop-color="#080b0d" stop-opacity="0"/><stop offset="1" stop-color="#020304"/></linearGradient>
      </defs>
      <path d="M0 207Q110 177 195 196T370 191T600 200T810 187T1010 194T1220 190T1450 197T1600 185V280H0" fill="#181c20" opacity=".5"/>
      <g opacity=".42"><g v-for="b in back" :key="b.x"><rect :x="b.x" :y="280-b.height" :width="b.width" :height="b.height" fill="#20252a"/><rect v-for="(w,i) in b.windows" :key="i" :x="w.x" :y="w.y" width="1.5" height="2" fill="#b9bdbb" :opacity="w.opacity"/></g></g>
      <g opacity=".88"><g v-for="b in middle" :key="b.x"><rect :x="b.x" :y="280-b.height" :width="b.width" :height="b.height" fill="url(#tower)"/><path v-if="b.antenna" :d="`M${b.x+b.width/2} ${280-b.height}v-10`" stroke="#303537"/><rect v-for="(w,i) in b.windows" :key="i" :x="w.x" :y="w.y" width="1.8" height="2.5" :fill="w.warm ? '#b7a37c' : '#9eaaa9'" :opacity="w.opacity"/></g></g>
      <g class="landmark" transform="translate(930 0)"><path d="M0 280V138h6v-12h14v-18h9V92h4v16h9v18h14v12h6v142" fill="#0c1012"/><path d="M31 92V62" stroke="#343b3c"/><path v-for="n in 16" :key="n" :d="`M8 ${144+n*7}h43`" stroke="#8d9796" :opacity="n%3 ? .19 : .4"/></g>
      <g transform="translate(670 0)"><path d="M0 280V146l15-23 15 23v134" fill="#0b1012"/><path d="M15 122V101" stroke="#303838"/><path v-for="n in 15" :key="n" :d="`M5 ${151+n*7}h20`" stroke="#99a3a1" opacity=".22"/></g>
      <g><g v-for="b in front" :key="b.x"><rect :x="b.x" :y="280-b.height" :width="b.width" :height="b.height" fill="#040608"/><rect v-for="(w,i) in b.windows" :key="i" :x="w.x" :y="w.y" width="1.6" height="2.3" :fill="w.warm ? '#b6a683' : '#a9b3b1'" :opacity="w.opacity*.7"/></g></g>
      <rect y="235" width="1600" height="45" fill="url(#city-fade)"/>
    </svg>
  </div>
</template>

