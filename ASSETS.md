# 素材来源与使用说明

## 月球表面

本项目使用 NASA Scientific Visualization Studio 的 **CGI Moon Kit** 地图作为浏览器端月球表面素材，下载时间为 2026-10-26。图片随项目本地提供，运行时无需访问 NASA 服务器。

| 本地文件 | 原始文件 | 规格与用途 |
| --- | --- | --- |
| `public/assets/moon-texture.jpg` | [lroc_color_2k.jpg](https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg) | 2048 × 1024，2025 年版全局等距柱状投影彩色地图；作为未受定向照明的月球表面底色。 |
| `public/assets/moon-height.jpg` | [ldem_3_8bit.jpg](https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_3_8bit.jpg) | 1024 × 512，LOLA 高程地图的 8-bit JPEG 预览，用于表现地形细节。 |

来源页：[NASA SVS — CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/)。素材注明来源：**NASA's Scientific Visualization Studio**；Visualizer: Ernie Wright (USRA)；Scientist: Noah Petro (NASA/GSFC)。颜色数据主要来自 Lunar Reconnaissance Orbiter Camera（LROC）；高程数据来自 Lunar Orbiter Laser Altimeter（LOLA）。

地图以月面 0° 经度为中心。应用应将等距柱状地图投影至球体，不应直接将矩形拉伸成圆形。正面球体投影可用 `u = 0.5 + atan2(x, z) / (2π)`、`v = 0.5 - asin(y) / π`，其中 `x, y, z` 为单位球面坐标，`y` 向上。由太阳方向与球面法线的点积产生日期相关的照明。

NASA 说明该颜色图为视觉呈现优化；研究用途应使用原始科学数据。本项目的渲染和天文计算由项目自身实现，不代表 NASA 审核或背书。

使用依据：[NASA Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)。该指南允许将通常不受美国版权保护的 NASA 内容用于教育、信息和互联网网页，并要求标明来源；第三方版权素材与 NASA 标识存在另外规定。本项目不使用 NASA 标识。

## 城市与星空

城市天际线和星空由项目代码绘制，无外部城市摄影素材。
