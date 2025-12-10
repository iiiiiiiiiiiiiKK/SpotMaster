# 👾 Pixel Trader v33 (Cloud Edition)

![License](https://img.shields.io/badge/license-MIT-green)
![React](https://img.shields.io/badge/react-18.0-blue)
![Firebase](https://img.shields.io/badge/firebase-10.0-orange)
![Style](https://img.shields.io/badge/style-Pixel_Art-black)
![Privacy](https://img.shields.io/badge/privacy-BYOK-red)

> **"Trading is hard. Your portfolio tracker shouldn't be."**
>
> 一个极简、硬核、像素风的加密资产管理终端。集成 Google Firebase 实时同步与 Telegram 自动备份，彻底解决跨设备管理痛点，同时通过 **BYOK (Bring Your Own Keys)** 模式保障数据的绝对隐私。

---

## ✨ 核心特性 (Features)

### 🎨 极致像素体验
- **8-Bit UI**: 复古高对比度设计，专注于交易数据，无干扰，全响应式适配移动端与桌面端。
- **隐私模式**: 一键模糊敏感金额，截图分享无压力。

### ☁️ 智能云端同步 (New!)
- **Google Firebase 集成**: 实现毫秒级多端实时同步（电脑录入，手机秒现）。
- **🧠 智能配置解析**: 
  - 支持直接粘贴 Firebase 控制台的 `const firebaseConfig = { ... }` 原生 JavaScript 代码。
  - **自动容错**: 自动补全双引号、修正 JSON 格式，无需手动清洗数据。
  - **输入防抖**: 智能等待输入完成（800ms），告别配置时的红色报错闪烁。

### 🤖 Telegram 自动化
- **自动备份**: 每次数据变更，自动发送 `.json` 备份文件到您的 Telegram 私聊窗口。
- **Serverless 拉取**: 向机器人发送 JSON 数据，在 App 内一键拉取更新（适合应急数据恢复）。

### ⚔️ War Room (作战室)
内置专业交易员风控工具箱：
- **亏损定额反推仓位**: 设定止损额，自动计算开仓大小。
- **凯利公式 (Kelly Criterion)**: 科学计算下注比例。
- **破产风险计算**: 直面连败爆仓的数学概率。
- **补仓/复利推演**: 可视化计算均价摊平和复利增长。

### 📥 强大的数据导入
- **预览机制**: 导入前先预览像素风表格，拒绝盲导。
- **Excel/CSV 友好**: 直接从 Excel 复制粘贴，智能识别制表符、逗号，自动清洗货币符号（$ / ¥ / ,）。

---

## 🚀 快速部署 (Deployment)

Pixel Trader 是一个单文件 React 应用，推荐使用 **Vercel** 或 **Firebase Hosting** 进行零成本部署。

### 本地运行
```bash
# 1. 创建 Vite 项目
npm create vite@latest pixel-trader -- --template react
cd pixel-trader

# 2. 安装依赖 (Tailwind + Lucide + Firebase)
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install firebase lucide-react

# 3. 替换 src/App.jsx 为本项目代码
# 4. 运行
npm run dev
