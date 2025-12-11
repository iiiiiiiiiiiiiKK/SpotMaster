# 🕹️ Pixel Trader V3.3
> **极简像素风格的硬核加密货币交易终端**

[![Vite](https://img.shields.io/badge/Framework-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/Library-React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Backend-Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)

**Pixel Trader** 是一款专为加密货币交易者设计的、具有 8-bit 复古像素风格的资产管理工具。它不仅能实时追踪您的投资组合，更集成了一系列硬核风控工具，帮助您在波诡云谲的市场中保持冷静。

---

## ✨ 核心特性

### 1. 🎨 复古像素美学 (Retro Aesthetics)
* **物理手感 UI**：所有按钮具有 4px 像素粗边框和 6px 黑色硬阴影，模拟 80 年代游戏机的物理按键反馈。
* **高对比度模式**：纯黑白配色方案，确保在任何光线环境下都能清晰阅读关键交易数据。
* **隐私模式 (Stealth Mode)**：点击“眼睛”图标可瞬间模糊（Blur）所有资产余额，在公共场合也能安全查看行情。

### 2. 📊 智能资产看板 (Smart Assets)
* **实时行情**：集成 CoinGecko API，实时刷新 BTC、ETH、SOL 等热门代币的价格。
* **盈亏实时计算**：自动计算每笔持仓的平均入场价（Avg Price）、实时回报率（ROI）及未实现盈亏（PNL）。
* **策略标签系统**：支持为每笔交易打上 `[定投]`、`[波段]`、`[追涨]`、`[梭哈]` 等像素标签，便于复盘。

### 3. 🛡️ 作战室 (War Room) - 核心风控工具
* **💀 死亡计算器 (Ruin Calculator)**：根据胜率与盈亏比，计算您的连续亏损概率及爆仓风险。
* **📉 回本难度计算**：实时展示当前亏损比例与需要上涨多少才能回本的关系。
* **⚖️ 补仓神器**：输入目标成本价，自动计算需要以当前价格补仓的数量。
* **🚀 复利模拟器**：推演在固定胜率下，资产随时间滚雪球的增长曲线。

### 4. ☁️ 云端同步与 BYOK (Bring Your Own Key)
* **Firebase 实时同步**：支持私有数据库绑定。只需填入您自己的 Firebase API Key，即可实现多端数据实时互通。
* **数据安全**：所有配置信息存储在您的私有云端或本地浏览器，项目开发者不触碰任何敏感数据。

---

## 🛠️ 技术栈

* **前端框架**: React 18 + Vite (极致的加载速度)
* **样式处理**: Tailwind CSS (自定义像素边框与阴影)
* **图标库**: Lucide React (高可辨识度图标)
* **后端/数据库**: Firebase Firestore (实时同步)
* **数据源**: CoinGecko API

---

## 🚀 快速开始

### 方式一：直接访问 (推荐)
点击下方链接即可直接打开公网演示版本：
👉 **[您的 Vercel/StackBlitz 链接]**

### 方式二：本地运行
1. **克隆项目**
   ```bash
   git clone [https://github.com/您的用户名/pixel-trader.git](https://github.com/您的用户名/pixel-trader.git)
   cd pixel-trader
