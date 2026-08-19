# 每日时间追踪

纯本地、个人使用的每日时间追踪单页应用。支持手动填写、实时计时、自定义任务大类、历史查看、数据可视化与 JSON 备份导入导出。

## 技术栈

- Vite + React 18 + TypeScript
- Tailwind CSS
- ECharts（echarts + echarts-for-react）
- dayjs
- react-router-dom（Hash 路由）

## 开发

```bash
npm install
npm run dev
```

## 构建与部署

```bash
npm run build
```

构建产物在 `dist/` 目录，可直接上传到：

- 腾讯云 CloudBase 静态托管
- 阿里云 OSS 静态网站

### 路由说明

本项目使用 **Hash 路由**（URL 形如 `https://example.com/#/history`），刷新任意页面不会出现 404，**无需**配置 SPA 回退。

若将来改为 History 路由，需在托管平台配置「所有路径回退到 `index.html`」。

### 子目录部署

默认 `vite.config.ts` 中 `base: './'`，适合根目录或相对路径部署。

若部署到子目录（如 `https://example.com/time-tracker/`），请修改：

```ts
// vite.config.ts
export default defineConfig({
  base: '/time-tracker/',
  // ...
})
```

然后重新 `npm run build`，上传 `dist/` 内容到对应子目录。

## 数据存储

- 所有记录保存在浏览器 `localStorage`（key: `time-tracker:records`）
- 自定义大类保存在浏览器 `localStorage`（key: `time-tracker:categories`）
- 删除大类只会将其从录入和计时界面隐藏，历史记录不会被清除，可在设置中恢复
- 请在「设置」页定期导出 JSON 备份
- 换浏览器或清除站点数据会导致记录丢失

## 页面

| 路由 | 功能 |
|------|------|
| `#/` | 今日录入 |
| `#/history` | 历史记录 + 热力图 |
| `#/dashboard` | 数据可视化 |
| `#/settings` | 管理任务大类、导入 / 导出备份 |
