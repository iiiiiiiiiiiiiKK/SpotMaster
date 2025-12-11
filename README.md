# 🕹️ Pixel Trader V3.3
> **极简像素风格的硬核加密货币交易终端 | Minimalist Pixel Art Crypto Terminal**

[![Vite](https://img.shields.io/badge/Framework-Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/Library-React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Backend-Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)

**Pixel Trader** 是一款专为硬核交易员设计的资产管理工具。它放弃了现代金融软件的冗余感，采用复古 8-bit 像素美学，将注意力重新聚焦于核心：**仓位管理与风控数学**。

---

## ✨ 核心特性

### 1. 🎨 复古像素美学 (Pixel Art UI)
* **物理点击感**：采用 4px 像素粗边框与 6px 偏移硬阴影设计，模拟物理按键的物理反馈。
* **黑白高对比度**：去除多余色彩干扰，仅保留关键涨跌信号。
* **隐私保护模式**：一键模糊敏感余额，保护交易员在公共场合的信息安全。

### 2. 🛡️ 作战室 (War Room) - 核心风控数学
作战室集成了一系列基于数学概率论的交易工具，帮助您在下单前看清风险。

#### 💀 破产/死亡计算器 (Risk of Ruin)
计算在特定胜率和亏损比例下，连续亏损导致账户归零的概率。
$$P_{\text{ruin}} = \left( \frac{1 - w}{w} \right)^n$$
*其中 $w$ 为胜率，$n$ 为破产所需的连续亏损单元。*

#### 📉 回本难度推演 (Recovery Table)
揭示亏损后的心理陷阱，直观展示账户回本所需的涨幅。
$$R = \left( \frac{1}{1 - L} \right) - 1$$
*其中 $L$ 为当前亏损百分比，$R$ 为回本所需涨幅。*

#### ⚖️ DCA 补仓神器 (Cost Average)
输入目标成本，自动计算在当前价位需要投入多少金额才能实现成本摊平。
$$Q_{\text{need}} = \frac{Q_{\text{hold}} \times (P_{\text{target}} - P_{\text{avg}})}{P_{\text{current}} - P_{\text{target}}}$$
*用于在左侧交易中精确控制仓位配比。*

#### 🚀 复利模拟器 (Compounding)
模拟在固定胜率与盈亏比下，资产随时间产生的指数级增长效应。
$$FV = PV \times (1 + r)^n$$
*帮助交易员建立长期主义视角。*

---

## 🌐 云端同步与提醒配置

本应用支持 **BYOK (Bring Your Own Key)** 模式，您的数据存储在您自己的服务器中。

### 1. Firebase 实时同步 (数据存储)
1.  前往 [Firebase Console](https://console.firebase.google.com/)。
2.  新建项目并添加一个 **Web 应用**。
3.  复制 `firebaseConfig` 对象（JSON 格式）。
4.  在应用 **LAB > Settings > Cloud** 中粘贴该 JSON。
5.  **注意**：需在 Firebase 控制台中开启 **Firestore Database** 并将 Rules 设置为 `allow read, write: if true;` 以完成初次连接。

### 2. Telegram 消息推送 (实时提醒)
1.  **获取 Token**：在 TG 搜索 `@BotFather`，发送 `/newbot` 获取 `API Token`。
2.  **获取 Chat ID**：搜索 `@userinfobot`，发送任意消息获取您的 `Id`（数字）。
3.  在应用设置中填入这两项，即可在每次保存记录时收到手机推送。

---

## 🛠️ 技术栈与部署

* **Frontend**: React 18 + Vite + Tailwind CSS
* **Icons**: Lucide-React (Pixel Optimized)
* **API**: CoinGecko Real-time Data
* **Storage**: LocalStorage + Firebase Firestore

### 快速启动
```bash
# 安装依赖
npm install

# 启动开发环境
npm run dev

# 构建生产版本
npm run build
