# 月球视角 · Moon Phase Viewer

一个基于 **Vue 3 + Vite** 的生日与历史月相查询网页。采用近黑色繁星夜空、写实月球、城市天际线与低反光导航，支持移动端与桌面端。完整源代码与月球贴图均在本项目内，无须配置 API Key 或后端服务。最新五项界面修复、具体交互、色值与验证记录见 [CHANGES.md](./CHANGES.md)。

## 1. 安装与运行

推荐安装 **Node.js 24 LTS**；本项目使用 Vite 7，最低要求为 Node.js **20.19+ 或 22.12+**。可从 [Node.js 官网](https://nodejs.org/en/download)安装，Vite 版本要求见[官方入门文档](https://vite.dev/guide/)。

在 PowerShell 中打开本项目目录：

```powershell
cd "C:\Users\16705\Documents\Codex\2026-10-26\vue3-web-moon-ph\outputs\moon-phase-viewer"
node --version
npm.cmd install
npm.cmd run dev
```

打开终端显示的 Local 地址，通常为 `http://localhost:5173`。开发服务已在 `vite.config.js` 中配置为监听 `0.0.0.0:5173`，启动时同时列出 Network 地址，可供同一 Wi-Fi 的手机访问。使用 `npm.cmd` 可避免部分 Windows 环境对 `npm.ps1` 的执行策略限制。

### 手机在同一 Wi-Fi 下访问

电脑和手机连接同一个可相互通信的 Wi-Fi。若当前已经运行开发服务，先在它的终端按 `Ctrl+C` 停止，然后在本项目目录运行：

```powershell
npm.cmd run dev
```

普通启动命令已默认支持局域网，`npm.cmd run dev:lan` 也可继续使用。设置位于 `vite.config.js` 的 `server.host`，不在 `src/main.js`。已移除 `package.json` 中 `dev` 原有的 `--host 127.0.0.1`，防止命令行参数覆盖配置文件。手机浏览器访问终端 Network 中与电脑 WLAN 地址一致的 `http://电脑的Wi-Fi IPv4地址:5173`；电脑用网线接入同一路由器也可以。电脑端的 `127.0.0.1` 和 `localhost` 只能用于电脑本机，手机不要填写这两个地址。

在电脑终端运行 `ipconfig`，查找当前 WLAN 或有线网卡的 IPv4 地址，不要选 VPN / 虚拟网卡地址。开发服务器需保持运行。若防火墙提示阻止 Node.js 通信，可允许其在可信的专用网络中通信；若仍无法打开，检查访客网络或路由器是否启用了客户端隔离。这里不需要公网部署或路由器端口转发。

`--strictPort` 会在端口被占用时明确报错，避免悄悄切到另一个端口。先停止原先的 5173 服务即可；也可以执行 `npm.cmd run dev:lan -- --port 5175`，手机地址相应改为 `:5175`。

项目已经提供全部依赖声明和锁文件；拿到源码后只需要执行上述安装命令。若从零创建同类项目，依赖安装方式为：

```powershell
npm.cmd install vue@^3.5.22 lunar-javascript@^1.7.7 suncalc@1.9.0 lucide-vue-next@^0.468.0
npm.cmd install -D vite@^7.1.12 @vitejs/plugin-vue@^6.0.1
```

生产构建、预览和计算测试：

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

`npm.cmd run build` 生成 `dist/`，可以部署至支持静态文件的服务器。开发服务默认支持局域网访问；`npm.cmd run preview` 仍仅监听 `127.0.0.1`，用于电脑本机预览构建结果。

## 2. 完整实现思路

### 数据层：日期 → 农历与月球状态

1. 将用户输入存为 `YYYY-MM-DD` 公历日期字符串，严格检查闰年、月份天数与支持范围，避免 JavaScript 自动把 2 月 30 日转换为 3 月。
2. 使用 `lunar-javascript` 的 `Solar.fromYmd(year, month, day).getLunar()` 得到农历月、日，保留闰月信息。
3. 使用 `SunCalc.getMoonIllumination()` 得到照亮比例 `fraction`、周期位置 `phase` 和亮面位置角 `angle`。据周期位置判断盈亏及展示名称。
4. 使用 `SunCalc.getMoonPosition()` 得到地月距离、月球位置和视差角；使用 `getMoonTimes()` 得到指定城市的月出月落。
5. 所有数据通过 Vue `computed` 随所选日期与城市更新。日期箭头按公历天加减，按钮在支持区间边缘禁用。

### 图形层：真实地图 → 球体投影 → 日期相关照明

月球使用 NASA SVS 的本地月面地图。等距柱状地图先投影至可见球面，再按当天太阳光方向逐像素着色，不能把一张满月照片简单叠加半圆阴影。

Canvas 中，设屏幕归一化坐标为 `x、y`（右、下为正），球面可见点的法线为：

```js
const z = Math.sqrt(Math.max(0, 1 - x * x - y * y))
const normal = { x, y, z }
```

设 SunCalc 照亮比例为 `f`，亮面位置角为 `a`。本项目采用**月面北向上、东向左**的图示约定，光源方向为：

```js
const lz = 2 * f - 1
const transverse = Math.sqrt(Math.max(0, 1 - lz * lz))
const light = {
  x: -Math.sin(a) * transverse,
  y: -Math.cos(a) * transverse,
  z: lz,
}
const lambert = Math.max(0,
  normal.x * light.x + normal.y * light.y + normal.z * light.z,
)
// 再与月面颜色、地照光和边缘处理组合，而非把 fraction 当作透明度。
```

这样，明暗分界线随相位自然从弯月变化为弦月、凸月、满月；`fraction` 控制球体上的几何亮区面积，位置角控制亮区朝向。NASA LOLA 高程预览图的有限差分用于微调表面法线，让分界线附近的环形山产生细微凹凸光照；这是视觉近似，不是地形投影星历。地照光让暗部仍可辨认轮廓，外层柔光形成轻微月晕。核心逐像素着色代码见 `src/lib/moonRenderer.js`，Vue 封装见 `src/components/MoonCanvas.vue`。

图示默认不模拟某城市某时刻的地平线倾斜。计算模块另外返回 `observerAngle = illuminationAngle - parallacticAngle`，可供后续“望远镜 / 地平线视角”使用。两种角度不能混为一谈。

### 视觉层：参考图的结构与桌面适配

- 背景使用 `#020304 → #050609 → #090B10` 近黑色渐变。星数按实际天空面积 / 420 计算，最多 4500 颗，带宽缓的疏密变化；仅少量星点缓慢闪烁。
- 以大尺寸月球为视觉中心，在移动端保持单列构图；桌面端增加留白与信息层次。
- 日期控件位于月球下方，农历、出没时间、距离与亮面比例采用紧凑信息排版。
- 底部以程序生成的多层城市轮廓、窗口灯光和雾气营造城市夜景；无需外部城市照片。
- 左上角不设置品牌、返回或顶部导航，留作夜空；右上角保留城市、搜索、分享等工具。底部 Dock 提供月相、日历、图库与个人收藏入口，活动项使用低饱和暖金色。

## 3. 可运行核心代码与入口

源码已完整提供，可直接修改，不需要从本文拼接零散片段：

| 文件 | 职责 |
| --- | --- |
| `src/App.vue` | 主界面、日期和城市选择、Dock、弹层及交互状态 |
| `src/components/DatePicker.vue` | 年、月、日独立下拉列表、草稿日期、闰日与短月自动校正 |
| `src/components/` | 月球 Canvas、星空与城市视觉组件 |
| `src/lib/astronomy.js` | 日期校验、农历转换、月相命名、月出月落与地月距离 |
| `src/main.js` | Vue 应用启动入口 |
| `src/style.css` | 响应式布局、夜空配色、玻璃面板与动效 |
| `tests/astronomy.test.js` | 历法、闰日、相位、出没时间和时区独立性测试 |
| `public/assets/` | 随项目提供的 NASA 月面地图 |
| `ASSETS.md` | 素材来源、署名和使用说明 |

以下是数据计算与 Vue 响应式联动的最小核心用法；完整界面见 `src/App.vue`：

```vue
<script setup>
import { computed, ref, watch } from 'vue'
import DatePicker from './components/DatePicker.vue'
import {
  MIN_DATE, MAX_DATE, cities, todayKey, addDays, buildMoonData,
} from './lib/astronomy.js'

const selectedDate = ref(todayKey())
const draftDate = ref(selectedDate.value)
watch(selectedDate, value => { draftDate.value = value })
const cityId = ref('beijing')
const city = computed(() => cities.find(item => item.id === cityId.value) || cities[0])
const moon = computed(() => buildMoonData(selectedDate.value, city.value))

function step(delta) {
  selectedDate.value = addDays(selectedDate.value, delta)
}
</script>

<template>
  <main>
    <h1>{{ moon.phaseName }}</h1>
    <button :disabled="selectedDate === MIN_DATE" @click="step(-1)">前一天</button>
    <form @submit.prevent="selectedDate = draftDate">
      <DatePicker v-model="draftDate" />
      <button type="submit">查看月相</button>
    </form>
    <button :disabled="selectedDate === MAX_DATE" @click="step(1)">后一天</button>
    <button @click="selectedDate = todayKey()">今</button>
    <p>{{ moon.lunarText }}</p>
    <p>月出 {{ moon.rise }} · 月落 {{ moon.set }}</p>
    <p>地月距离 {{ moon.distance }} km</p>
    <p>照亮比例 {{ (moon.fraction * 100).toFixed(1) }}%</p>
  </main>
</template>
```

这个片段用于说明核心 API 与年、月、日下拉组件。完整应用把组件放入日期面板：选择只更新草稿，确认后才更新主页；日期列表会排除非法年月日。

`buildMoonData(dateKey, city)` 的主要输出：

| 字段 | 含义 |
| --- | --- |
| `lunarText` | 如 `农历十月初二`，包括闰月 |
| `phaseName` / `englishName` | 展示名称 / 英文名称 |
| `fraction` | 可见圆盘照亮比例，0 至 1 |
| `phase` | 周期位置：0 新月、0.25 上弦、0.5 满月、0.75 下弦 |
| `illuminationAngle` | 月球北向参考下的亮面位置角，弧度 |
| `observerAngle` | 扣除视差角后的观测者天顶参考角，弧度 |
| `rise` / `set` | 该城市当天 UTC+8 的 `HH:mm` 或明确缺失说明 |
| `distance` / `distanceKm` | 两位小数字符串 / 未格式化的距离，km |
| `age` | 用周期位置 × 朔望月长度估算的月龄，天 |
| `sampleTime` | 本次相位与距离计算的完整时间戳 |

日历中的小月相可使用轻量的 `getMoonPreview(dateKey)`，避免重复计算月出月落；`parseDate()` 遇到非法日期会抛出 `RangeError`。

## 4. 功能与存储

- 主日期的“年 / 月 / 日”均有独立下拉入口；点击对应字段或箭头打开日期面板并展开该字段。年份为 1901—2099，月份为 1—12，日期根据年月动态生成。先修改草稿，点击“查看月相”后提交；取消、关闭或点击遮罩均不提交。保留前一天、后一天、回到今天和月历选日。
- 默认观测城市为北京，可切换上海、广州、成都、杭州、深圳；城市影响月出月落，地心月相和地月距离不随城市变化。
- 图库用于快速查看并选择不同日期对应的月相。
- 个人入口提供本机的生日 / 日期收藏，使用浏览器 `localStorage`；没有账号系统或云端同步，清除浏览器数据会清除收藏。
- 分享入口可保存月相纪念卡 PNG 或复制链接；链接中的日期和城市可用于重新打开同一天。本地预览链接仅本机可访问，部署后才能让他人访问。
- 全屏依赖浏览器 Fullscreen API；不支持的浏览器会保留正常页面显示。
- 农历与天文计算在浏览器本地完成，不调用远程计算 API；月面素材由随项目提供的静态文件加载。所选日期与城市会写入 URL，用于刷新恢复与链接分享；部署后访问该 URL 时，服务器会收到其中的日期参数。收藏名称只存于当前浏览器。

## 5. 计算口径与精度边界

**支持范围：1901-01-01 至 2099-12-31。** 本项目统一使用现代中国标准时间 **UTC+8**，包括历史日期，不复原历史夏令时和各地旧时制。

一个公历日内月相与距离持续变化，因此页面统一以该日 **12:00 UTC+8** 作为相位、月龄和距离的采样时刻。用户参考图未注明采样时刻和城市，计算结果不应被要求逐位匹配截图。

月出月落按所选城市的 **00:00 至次日 00:00 UTC+8** 计算。SunCalc 的 `inUTC=true` 计算的是 UTC 公历日，本项目收集相邻 UTC 日的事件，再按 UTC+8 日期筛选，以免运行设备的时区改变结果。某些日子没有月出或月落，页面会明确显示“本日无月出 / 本日无月落”；整日位于地平线上下时也提供说明。

SunCalc 使用简化的天文模型，适合本项目的月相展示与一般观测参考，**不是高精度星历引擎**。距离显示到两位小数仅表示格式，不表示实际误差达到 0.01 km；月出月落也受地形、海拔和大气折射等因素影响。

“新月、上弦、满月、下弦”有相应天文意义；“既朔、九夜、既望、晦”等细分名称是本应用的展示区间，不是统一的精确天文事件定义。具体规则在 `phaseLabel()` 中集中维护：

| 周期位置 `phase` | 名称 |
| --- | --- |
| `[0, .018)` 或 `[.982, 1]` | 新月 / 朔 |
| `[.018, .075)` | 既朔月 |
| `[.075, .225)` | 蛾眉月 |
| `[.225, .275)` | 上弦月 |
| `[.275, .33)` | 九夜月 |
| `[.33, .475)` | 渐盈凸月 |
| `[.475, .525)` | 满月 / 望 |
| `[.525, .58)` | 既望月 |
| `[.58, .725)` | 渐亏凸月 |
| `[.725, .775)` | 下弦月 |
| `[.775, .95)` | 残月 |
| `[.95, .982)` | 晦月 |

月龄采用 `phase × 29.530588853` 的近似值，不是数值求解上一次朔时后的严格时间差。月球渲染采用静态朝向地图与球面照明；不模拟真实天平动、地形遮挡阴影、月食或照片级逐日环形山光影。地图的纹理细节和真实地形星历应加以区分。

## 6. 官方资料

- [Vue 官方指南](https://vuejs.org/guide/introduction.html)：组件、响应式与组合式 API。
- [Vite 官方指南](https://vite.dev/guide/)：开发与生产构建。
- [SunCalc v1.9.0 官方文档](https://github.com/mourner/suncalc/tree/v1.9.0)：相位、照亮比例、位置角、距离与月出月落 API。
- [lunar-javascript 官方仓库](https://github.com/6tail/lunar-javascript)与[日历 API 文档](https://6tail.cn/calendar/api.html)：公历与农历转换。
- [NASA SVS — CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/)：月面颜色与高程素材，完整署名及使用说明见 `ASSETS.md`。

## 7. 验证范围

`tests/astronomy.test.js` 包含有效与非法日期、闰日与年末切换、1901 / 2099 边界、春节与闰月、参考图两天的农历日期、近新月与近满月照亮比例、出没事件的 UTC+8 日期归属、城市差异，以及不同运行时区下结果一致性的测试。使用上面的 `npm.cmd test` 执行；构建检查使用 `npm.cmd run build`。

本次交付在 Windows / Node.js 24.15.0 上运行，8 项测试通过，Vite 生产构建通过。已在浏览器检查窄屏与 1440 × 960 桌面布局，以及日期输入、闰日跨月、前后切日、城市切换、月历选日、图鉴和收藏刷新保留。纪念卡下载按钮已点击检查且没有观察到 JavaScript 错误，但自动下载事件捕获超时，未确认最终文件落盘；复制链接和全屏未做跨浏览器兼容验证。

若当前受限环境的默认 npm 缓存不可写，可仅为本次安装指定可写目录，例如 `npm.cmd install --cache .npm-cache`，无需修改系统配置。项目使用 Vite 的 `--configLoader native` 读取 JavaScript 配置，避免配置打包器额外遍历 Windows 上级目录；普通环境仍通过同一组 npm 脚本运行。
