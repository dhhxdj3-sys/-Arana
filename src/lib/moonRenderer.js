// NASA's unlit equirectangular map is projected onto an orthographic sphere.
// Canvas is north-up, east-left. Texture coordinates do not model libration.
let surfacePromise
const clamp = (v, low, high) => Math.max(low, Math.min(high, v))

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('月球贴图未能载入，请刷新重试。'))
    image.src = url
  })
}

async function prepareSurface() {
  const [image, heightImage] = await Promise.all([
    loadImage('/assets/moon-texture.jpg'),
    loadImage('/assets/moon-height.jpg'),
  ])
  const source = document.createElement('canvas')
  source.width = image.width
  source.height = image.height
  const context = source.getContext('2d', { willReadFrequently: true })
  context.drawImage(image, 0, 0)
  const pixels = context.getImageData(0, 0, image.width, image.height).data
  const heightCanvas = document.createElement('canvas')
  heightCanvas.width = heightImage.width; heightCanvas.height = heightImage.height
  const heightContext = heightCanvas.getContext('2d', { willReadFrequently: true })
  heightContext.drawImage(heightImage, 0, 0)
  const heights = heightContext.getImageData(0, 0, heightImage.width, heightImage.height).data
  const heightAt = (x, y) => heights[(clamp(y, 0, heightImage.height - 1) * heightImage.width + ((x + heightImage.width) % heightImage.width)) * 4] / 255
  const size = 900
  const normals = new Float32Array(size * size * 3)
  const shadingNormals = new Float32Array(size * size * 3)
  const albedo = new Uint8ClampedArray(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5 - size / 2) / (size / 2 - 1)
      const ny = (y + 0.5 - size / 2) / (size / 2 - 1)
      const r2 = nx * nx + ny * ny
      if (r2 >= 1) continue
      const nz = Math.sqrt(1 - r2)
      const u = 0.5 + Math.atan2(nx, nz) / (2 * Math.PI)
      const v = 0.5 + Math.asin(ny) / Math.PI
      const tx = clamp(Math.floor(u * image.width), 0, image.width - 1)
      const ty = clamp(Math.floor(v * image.height), 0, image.height - 1)
      const p = (ty * image.width + tx) * 4
      const i = y * size + x
      normals[i * 3] = nx
      normals[i * 3 + 1] = ny
      normals[i * 3 + 2] = nz
      // A small finite-difference bump from LOLA's 8-bit preview gives local
      // crater slopes. This is visual relief, not terrain self-shadow tracing.
      const hx = Math.floor(u * heightImage.width), hy = Math.floor(v * heightImage.height)
      const cosineLatitude = Math.max(0.08, Math.sqrt(1 - ny * ny))
      const longitude = Math.atan2(nx, nz)
      const slopeU = clamp((heightAt(hx + 1, hy) - heightAt(hx - 1, hy)) * 0.012 / (4 * Math.PI / heightImage.width) / cosineLatitude, -.25, .25)
      const slopeV = clamp((heightAt(hx, hy + 1) - heightAt(hx, hy - 1)) * 0.012 / (2 * Math.PI / heightImage.height), -.25, .25)
      const bx = nx - slopeU * Math.cos(longitude) + slopeV * ny * Math.sin(longitude)
      const by = ny - slopeV * cosineLatitude
      const bz = nz + slopeU * Math.sin(longitude) + slopeV * ny * Math.cos(longitude)
      const length = Math.hypot(bx, by, bz)
      shadingNormals[i * 3] = bx / length
      shadingNormals[i * 3 + 1] = by / length
      shadingNormals[i * 3 + 2] = bz / length
      albedo[i * 4] = pixels[p]
      albedo[i * 4 + 1] = pixels[p + 1]
      albedo[i * 4 + 2] = pixels[p + 2]
      albedo[i * 4 + 3] = Math.min(255, (1 - Math.sqrt(r2)) * size * 255)
    }
  }
  return { normals, shadingNormals, albedo, size }
}

export async function renderMoon(canvas, fraction, illuminationAngle) {
  surfacePromise ??= prepareSurface().catch(error => { surfacePromise = undefined; throw error })
  const { normals, shadingNormals, albedo, size } = await surfacePromise
  const zLight = clamp(2 * fraction - 1, -1, 1)
  const transverse = Math.sqrt(1 - zLight * zLight)
  const xLight = -Math.sin(illuminationAngle) * transverse
  const yLight = -Math.cos(illuminationAngle) * transverse
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  const output = context.createImageData(size, size)
  for (let i = 0; i < size * size; i++) {
    if (!albedo[i * 4 + 3]) continue
    const dot = shadingNormals[i * 3] * xLight + shadingNormals[i * 3 + 1] * yLight + shadingNormals[i * 3 + 2] * zLight
    // A narrow smooth terminator and perceptual Lambert response retain maria.
    const lit = Math.pow(Math.max(0, dot), 0.48)
    const earthshine = 0.055 + 0.024 * (1 - fraction)
    // Exposure compensation keeps a slender crescent readable on a night screen.
    const shade = earthshine + lit * (1.21 + 0.8 * (1 - fraction))
    const limb = 0.79 + 0.21 * Math.pow(normals[i * 3 + 2], 0.25)
    for (let c = 0; c < 3; c++) {
      output.data[i * 4 + c] = Math.min(255, albedo[i * 4 + c] * shade * limb * (c === 2 ? 1.035 : 1))
    }
    output.data[i * 4 + 3] = albedo[i * 4 + 3]
  }
  context.putImageData(output, 0, 0)
  return canvas
}
