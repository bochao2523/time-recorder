---
name: "时间站 · Time Depot"
description: "把一天的时间记录做成一扇稳定、可操作的铁路车厂目的地窗。"
colors:
  depot-green: "#0e3a2e"
  depot-deep: "#082b22"
  chrome-yellow: "#ffd200"
  calico: "#f2efe6"
  calico-deep: "#e5dcc5"
  cream-dark: "#cfc2a4"
  depot-ink: "#171a18"
  stone-light: "#5f5a4c"
  stitch: "#b69a4a"
  sage: "#2f6b4f"
  teal: "#1d5747"
  amber: "#b18f18"
  steel: "#496859"
  category-gaming: "#765f22"
typography:
  display:
    fontFamily: '"Barlow Condensed", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "2.7rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", sans-serif'
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", sans-serif'
    fontSize: "1rem"
    fontWeight: 800
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", sans-serif'
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: '"Barlow Condensed", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "0.75rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.08em"
rounded:
  control: "10px"
  action-course: "12px"
  surface: "14px"
  modal-mobile-top: "20px"
  modal-desktop: "18px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  compact: "10px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.chrome-yellow}"
    textColor: "{colors.depot-green}"
    typography: "{typography.title}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "48px"
  button-primary-active:
    backgroundColor: "#e8bf00"
    textColor: "{colors.depot-green}"
    typography: "{typography.title}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.calico}"
    textColor: "{colors.depot-green}"
    typography: "{typography.title}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "48px"
  input-standard:
    backgroundColor: "{colors.calico}"
    textColor: "{colors.depot-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "48px"
  surface-depot:
    backgroundColor: "{colors.depot-green}"
    textColor: "{colors.chrome-yellow}"
    rounded: "{rounded.surface}"
    padding: "16px"
  surface-calico:
    backgroundColor: "{colors.calico}"
    textColor: "{colors.depot-ink}"
    rounded: "{rounded.surface}"
    padding: "16px"
  status-saved:
    backgroundColor: "{colors.depot-green}"
    textColor: "{colors.chrome-yellow}"
    rounded: "{rounded.control}"
    padding: "0 8px"
    width: "5.5rem"
    height: "2rem"
  navigation-active:
    backgroundColor: "{colors.chrome-yellow}"
    textColor: "{colors.depot-green}"
    typography: "{typography.label}"
    height: "4.5rem"
---

# Design System: 时间站 · Time Depot

## Overview

**Creative North Star: "一天是一扇 Depot Window"**

界面借用中国铁路车厂目的地牌的秩序感：每一天像一扇固定的 depot window，时间总数、当前计时和任务课程在各自槽位里清楚呈现。它不是交通主题装饰，而是一套服务于短时、单手操作的控制面板；用户进入页面后先完成补记或计时，再阅读解释。

瓶绿色鸭帆布承载状态与关键读数，暖色原坯棉布承载输入和内容，铬黄色像压印在站牌上的功能图例。缝线、边框和黄铜感孔眼提供材料线索，但所有信息仍由语义文本、原生控件和内联 SVG 构成。整体是触感明确、紧凑而不拥挤的移动优先工具，手动补记与实时计时始终平等。

**Key Characteristics:**

- 控制优先：今日总量紧凑呈现，两条主入口并列处于首屏拇指热区。
- 材料有来源：只使用瓶绿色鸭帆布与暖色原坯棉布两种固定纹理。
- 状态有槽位：标题、帮助文案、保存状态和计时数字先预留尺寸，再更新内容。
- 度量有口音：中文使用系统无衬线，读数和小型车厂图例使用窄体字与等宽数字。
- 运动受约束：反馈只改变颜色、背景、边框或不透明度，不移动布局。

## Colors

配色像一块经久使用的车厂控制牌：深绿负责承重，铬黄负责信号，暖棉布负责长时间阅读，低饱和类别色只在数据分组中出现。

### Primary

- **瓶绿色鸭帆布** (`colors.depot-green`): 用于今日总量、计时课程、图标底座、非激活导航和结构性操作面。
- **车厂深绿** (`colors.depot-deep`): 用于深色边缘、遮罩和绿色表面的低位层级，不作为大段正文底色。
- **铬黄色图例** (`colors.chrome-yellow`): 用于关键数字、激活导航、主要操作和清晰焦点；它是稀缺的信号色，而不是普通高亮色。

### Secondary

- **鼠尾草绿** (`colors.sage`): 表示冥想分类与正向继续状态。
- **车库青绿** (`colors.teal`): 表示阅读之外的绿色数据层级与图表变化。
- **旧铜琥珀** (`colors.amber`): 表示运动分类与保存中的小状态点。
- **灰钢绿** (`colors.steel`): 表示阅读分类与次级图表系列。
- **游戏黄褐** (`colors.category-gaming`): 只用于游戏分类的识别，不与主铬黄竞争。

### Tertiary

- **缝线黄铜** (`colors.stitch`): 只用于内嵌缝线、孔眼和材料边缘提示，不能承担交互状态。

### Neutral

- **暖色原坯棉布** (`colors.calico`): 字段、卡片和主内容表面的默认底色。
- **深色棉布底** (`colors.calico-deep`): 页面画布和滚动区域的底层。
- **棉布阴影边** (`colors.cream-dark`): 浅色边框、按下状态和分隔层。
- **车厂墨色** (`colors.depot-ink`): 浅色表面上的主要正文与图标。
- **旧石说明色** (`colors.stone-light`): 次级说明、占位和非关键元数据。

### Named Rules

**The Signal Yellow Rule.** 铬黄色只表达激活、关键读数、主要行动或焦点；如果一个元素只是装饰，就使用黄铜缝线色而不是铬黄。

**The Solid Backing Rule.** 所有纹理都覆盖在可独立满足可读性的纯色底上；纹理加载失败时，层级、状态和对比度不得改变。

## Typography

**Display Font:** Barlow Condensed（系统无衬线回退）  
**Body Font:** 系统中文无衬线（SF Pro Text / Segoe UI 回退）  
**Label Font:** Barlow Condensed（系统无衬线回退）

**Character:** 系统中文无衬线让输入与说明自然、快速可读；Barlow Condensed 只给时间、总量和小型 depot 图例一种机械但不复古的测量口音。所有持续变化的数字使用 tabular lining numerals，避免计时刷新改变宽度。

### Hierarchy

- **Display**（800，移动端 2.7rem，桌面端 3rem，行高 1）: 今日总量和大号计时读数；不得用于长句。
- **Headline**（800，1.25rem 至 1.5rem，行高 1.25）: 页面标题。
- **Title**（800，1rem，行高 1.4）: 课程标题、任务标题和主要中文操作标签。
- **Body**（400，1rem，行高 1.6）: 字段值、正文与移动端输入；输入保持至少 16px，避免 iOS Safari 自动缩放。
- **Label**（800，0.75rem，字距 0.08em）: depot 图例、状态眉题和紧凑导航文字；英文可大写，中文不强制转换大小写。

### Named Rules

**The Measurement Voice Rule.** 只有读数、时间和短图例使用窄体；任务名、说明与输入始终使用中文系统无衬线。

**The Stable Numeral Rule.** 所有计时与总量使用等宽数字，并为最长可信内容预留宽度。

## Layout

页面采用单列移动优先结构，内容容器最大宽度为 56rem。移动端主内容左右留白 12px、纵向留白 12px；从 640px 起改为 24px，并让底部导航收束为 28rem 宽的悬停车厂控制条。内容节奏以 8px、10px、12px、16px、20px 和 24px 为主，连续课程之间通常保持 12px。

首页是控制优先构图：日期课程在上，紧凑总量课程包含两块等权操作面，其后是固定高度的当前计时课程，再进入任务记录。手动补记和实时计时必须同时出现在首屏，不能把任一入口藏进溢出菜单或次级页面。

固定页头、底部导航和跨页面计时条都计算安全区。底部导航移动端高 4.5rem；主内容预留导航与安全区空间。输入聚焦时，移动端固定底栏和计时条让位于键盘；滚动区域阻断滚动链并保留惯性滚动。

**The Reserved Slot Rule.** 页头、帮助文案、保存状态和计时读数使用固定或最小尺寸槽位；状态变化只替换内容，不重新排版周围界面。

**The Equal Entry Rule.** 补记时间与开始计时在尺寸、视觉权重和首屏可达性上始终平等。

## Elevation & Depth

深度是结构性的，而不是漂浮式卡片堆叠。深色鸭帆布课程使用一条暗色结构边、一圈克制的黄铜内嵌缝线和柔和的绿黑下投影；浅色棉布课程使用绿色细边、浅色内嵌层和更轻的中性投影。普通内容保持平坦，阴影不响应按压，也不制造悬浮位移。

### Shadow Vocabulary

- **深色缝制课程** (`inset 0 0 0 5px rgba(255,210,0,0.025), inset 0 0 0 6px rgba(182,154,74,0.62), 0 10px 24px rgba(8,43,34,0.13)`): 今日总量、当前计时和跨页面计时条。
- **浅色缝制课程** (`inset 0 0 0 5px rgba(242,239,230,0.65), inset 0 0 0 6px rgba(14,58,46,0.18), 0 8px 20px rgba(23,26,24,0.08)`): 日期、任务分类、输入容器和次级操作面。
- **固定导航** (`0 -10px 26px rgba(8,43,34,0.18)`): 只用于底部导航与页面内容的分离。
- **计时弹层** (`0 -16px 42px rgba(8,43,34,0.28)`): 只用于移动端底部弹层；桌面同一弹层居中呈现。

### Named Rules

**The Sewn Depth Rule.** 先用边框与内嵌缝线定义材料边缘，最后才加一层柔和投影；不要用多层浮卡代替信息层级。

## Shapes

普通按钮、字段、状态块和 44–48px 图标按钮使用紧凑控制圆角（10px）；主要课程、分类容器、桌面导航和浮动计时条使用表面圆角（14px）。首页两块大操作面是介于控制和课程之间的 12px 小型表面。移动端计时弹层只在顶部使用 20px 圆角，桌面改为 18px 全圆角；孔眼、状态点和短徽标可使用完全圆形。

每个主要表面只有一条深色结构边。虚线只在确实表达缝合、折页或弹层分隔时出现。黄铜感孔眼是装饰性几何，不携带状态、不接受点击，也不进入辅助技术树。

**The 10/14 Rule.** 控件以 10px 为默认圆角，承载一组信息的主要表面以 14px 为默认圆角；只有明确的中间层操作课程或弹层可偏离。

## Components

### Buttons

- **Shape:** 普通按钮为 10px 控制圆角且可见触控尺寸至少 44px；首页双入口是 12px 小型表面，高度至少 5.5rem。
- **Primary:** 铬黄底配瓶绿文字，用于开始、导出或当前激活的主要动作；正文按钮常用 48px 高。
- **Hover / Focus:** 悬停与按下只改变颜色、背景、边框或不透明度；键盘焦点为 3px 铬黄外框并留 3px 间距，容器内控件可使用内嵌 2px 铬黄环。
- **Secondary:** 原坯棉布底配瓶绿文字和绿色细边；危险或删除动作保持低调文本式，直到用户明确确认。

### Chips

- **Style:** 仅用于计数、分类或模式选择；小型圆点使用分类色，文本仍使用墨色或旧石说明色。
- **State:** 选中态使用实色底与高对比文字，未选中态留在棉布底；不得用脉冲或移动表达运行。

### Cards / Containers

- **Corner Style:** 主要课程和分类容器使用 14px 表面圆角。
- **Background:** 状态与读数使用瓶绿鸭帆布，输入与内容使用暖色原坯棉布。
- **Shadow Strategy:** 使用“深色缝制课程”或“浅色缝制课程”，不叠加额外浮层阴影。
- **Border:** 一条结构边加一条克制内嵌缝线；虚线仅表示缝合。
- **Internal Padding:** 移动端通常 12–16px，640px 起可增加到 20px。

### Inputs / Fields

- **Style:** 原生字段，10px 圆角，48px 最小高度，棉布底和半透明瓶绿边；移动端正文不小于 16px。
- **Focus:** 边框转为瓶绿，底色变白，并显示半透明铬黄 2px 焦点环；全局 `:focus-visible` 仍保留清晰外框。
- **Error / Disabled:** 错误用简洁中文状态提示；禁用通过不透明度与光标共同表达，不移除标签或尺寸。

### Navigation

底部主导航固定呈现四个等宽目的地格。未激活项为瓶绿底、浅色文字和低对比黄线分隔；激活项整格切换为铬黄底与瓶绿文字。移动端图标在上、标签在下；640px 起变为横向组合。每格覆盖完整导航高度并保留内嵌焦点环。

### Depot Timer Course

当前计时课程在所有状态下保持至少 5.5rem 高：左侧是状态与任务名，中间是至少 8.5ch 的窄体计时槽，右侧是 44px 播放/暂停按钮。空闲、运行和暂停只替换文案、数字与颜色，不改变列宽或触发滚动目的地牌效果。

### Category Course

每个分类是一个 14px 浅色缝制课程，折叠头部至少 4.5rem 高。44px 绿色图标底座、标题、项目数、总分钟和展开动作形成稳定一行；展开内容使用缝合虚线分隔，任务名、分钟、快捷计时和删除控件保持触控安全。

### Save Status

保存状态固定占用 5.5rem × 2rem。空闲时内容不可见但槽位保留；保存中和已保存只更换文本、圆点或勾选图标，不能通过位移、脉冲或宽度变化吸引注意。

## Do's and Don'ts

### Do:

- **Do** 保持补记时间与开始计时同时可见、同等大小、同等视觉权重。
- **Do** 为主要触控目标保留至少 44px，并让移动端输入字号保持 16px 或更大。
- **Do** 为计时数字、保存状态、帮助文案和页头内容预留固定槽位。
- **Do** 把两种固定纹理放在纯色可访问底色之上，并让装饰层不接收指针事件。
- **Do** 使用清晰的 `:focus-visible` 样式，并尊重减少动态效果偏好。
- **Do** 使用简洁、自然的中文标签和真实产品状态。

### Don't:

- **Don't** 添加页面加载动画、脉冲、闪烁、过冲或持续动效。
- **Don't** 使用 transform 按压反馈、背景毛玻璃或会引发布局位移的交互。
- **Don't** 让目的地牌滚动、翻页或模拟机械卷动；窗口必须稳定。
- **Don't** 让纹理随内容或滚动产生漂移，也不要叠加第三种纹理、噪点或滤镜。
- **Don't** 用通用白色 SaaS 卡片、交通工具插画或营销装饰稀释车厂材料世界。
- **Don't** 把文字、图标、图表、状态或控件栅格化进图片。
