# 📉 Pixel Trader V33: 像素风加密投资组合追踪与风险管理工具

[span_0](start_span)Pixel Trader V33 是一个专为加密货币交易者设计的现代化投资组合追踪应用[span_0](end_span)[span_1](start_span)。它结合了独特的像素艺术 UI 风格[span_1](end_span)[span_2](start_span)，实时数据流[span_2](end_span)[span_3](start_span)[span_4](start_span)[span_5](start_span)[span_6](start_span)[span_7](start_span)[span_8](start_span)，以及强大的风险和仓位计算工具[span_3](end_span)[span_4](end_span)[span_5](end_span)[span_6](end_span)[span_7](end_span)[span_8](end_span)[span_9](start_span)[span_10](start_span)，同时提供 Firebase 和 Telegram 云备份功能[span_9](end_span)[span_10](end_span)，确保您的交易数据安全且可同步。

## ✨ 核心特性

* **[span_11](start_span)投资组合与实时追踪**：管理多种加密货币资产的交易记录[span_11](end_span)[span_12](start_span)[span_13](start_span)，计算平均成本、市值和实时盈亏[span_12](end_span)[span_13](end_span)。
* **[span_14](start_span)多源价格数据**：支持从 **Binance (WebSocket 实时)**[span_14](end_span)[span_15](start_span)、**CoinGecko (API)**[span_15](end_span) [span_16](start_span)或 **CryptoCompare (API)**[span_16](end_span) 获取价格数据。
* **[span_17](start_span)[span_18](start_span)[span_19](start_span)War Room (交易计算室)**：内置专业的仓位计算、凯利公式、回本难度、补仓推演等风险管理工具 [cite: 275-279]。
* [cite_start]**Stress Test (压力测试)**：模拟市场大幅上涨或暴跌情景，一键评估对总资产价值的影响，并对稳定币进行特殊处理[span_17](end_span)[span_18](end_span)[span_19](end_span)。
* **云同步与备份**：
    * **[span_20](start_span)[span_21](start_span)Firebase Sync (BYOK)**：通过粘贴 Firebase 配置实现实时、双向的数据同步[span_20](end_span)[span_21](end_span)。
    * **[span_22](start_span)[span_23](start_span)[span_24](start_span)Telegram Bot Backup**：配置 Bot Token 和 Chat ID，实现自动备份和手动拉取 JSON 数据[span_22](end_span)[span_23](end_span)[span_24](end_span)。
* **[span_25](start_span)[span_26](start_span)交易记录批量导入/导出**：支持 CSV/TSV/JSON 格式的交易记录导入[span_25](end_span)[span_26](end_span)[span_27](start_span)，以及 JSON/Markdown 格式的导出[span_27](end_span)。

## [span_28](start_span)🛠️ War Room 计算工具详解[span_28](end_span)

[span_29](start_span)War Room 模块集成了六大实用工具[span_29](end_span)，帮助您在交易前做出科学决策：

| 工具名称 | 核心功能 | 计算公式 (数学核心) | 来源 |
| :--- | :--- | :--- | :--- |
| **仓位计算** | [span_30](start_span)根据风险金额、入场价、止损价，反推出最大可开仓数量[span_30](end_span)。 | [span_31](start_span)$$\text{Size} = \frac{\text{Risk Amount}}{|\text{Entry Price} - \text{Stop Price}|}$$ |[span_31](end_span) |
| **凯利公式** | [span_32](start_span)[span_33](start_span)根据交易系统的胜率 ($P$) 和赔率 ($B$)，计算最优的建议仓位百分比 ($f^*$)[span_32](end_span)[span_33](end_span)。 | [span_34](start_span)$$f^* = \left(\frac{B \cdot P - Q}{B}\right) \times 100\% \quad (\text{其中 } Q = 1 - P)$$ |[span_34](end_span) |
| **回本计算** | [span_35](start_span)计算当前资产亏损百分比下，需要多少涨幅才能回本[span_35](end_span)。 | [span_36](start_span)$$\text{Gain Needed} = \left(\frac{1}{1 - (\text{Loss}/100)} - 1\right) \times 100\%$$ |[span_36](end_span) |
| **补仓计算器** | [span_37](start_span)计算在特定补仓价格下，要达到目标均价所需的买入数量[span_37](end_span)。 | [span_38](start_span)$$\text{Qty Needed} = \frac{\text{Cur Qty} \times (\text{Target Avg} - \text{Cur Avg})}{\text{Buy Price} - \text{Target Avg}}$$ |[span_38](end_span) |
| **复利推演** | [span_39](start_span)模拟在给定日收益率和天数下的资金增长情况[span_39](end_span)。 | [span_40](start_span)$$\text{Final} = \text{Principal} \times (1 + \text{Daily Rate})^{\text{Days}}$$ |[span_40](end_span) |
| **死亡计算器** | [span_41](start_span)[span_42](start_span)根据胜率、盈亏比和单笔风险百分比，计算交易期望值 (EV) 和连续亏损的爆仓步数[span_41](end_span)[span_42](end_span)。 | [span_43](start_span)$$\text{EV} = (\text{Win Rate} \times \text{Reward Ratio}) - (\text{Loss Rate} \times 1)$$ |[span_43](end_span) |

## ⚙️ 部署与设置

### 1. 本地运行

该应用是一个独立的 React 组件，通常集成在一个 React 环境中运行。

* **[span_44](start_span)依赖**：`react`[span_44](end_span)[span_45](start_span)，`firebase` 及其模块 (`initializeApp`, `getFirestore`, `doc`, `onSnapshot`, `setDoc`)[span_45](end_span)[span_46](start_span)，`lucide-react` (图标库)[span_46](end_span)。
* **[span_47](start_span)样式**：内置了 `<PixelStyles />` 组件，包含了所有像素风格的 CSS 规则，如 `pixel-box` 和 `pixel-btn`[span_47](end_span)。

### 2. 云同步配置

[span_48](start_span)[span_49](start_span)通过右上角的 **⚙️ SETTINGS** 按钮进入配置[span_48](end_span)[span_49](end_span)：

#### A. Firebase Sync

* **[span_50](start_span)[span_51](start_span)功能**：实现资产数据的实时、双向同步[span_50](end_span)[span_51](end_span)。
* **设置步骤**：
    1.  [span_52](start_span)复制您的 Firebase 配置对象（`const firebaseConfig = { ... }`）[span_52](end_span)。
    2.  [span_53](start_span)[span_54](start_span)在 **SETTINGS -> CLOUD & SYNC** 选项卡下，将配置粘贴到 **Firebase Sync** 区域的文本框中[span_53](end_span)[span_54](end_span)。
* **[span_55](start_span)注意**：应用内置智能解析器 (`smartParseFirebaseConfig`)[span_55](end_span)[span_56](start_span)，支持直接粘贴 JavaScript 对象格式，无需手动转换为严格 JSON[span_56](end_span)。

#### B. Telegram Bot 备份

* **[span_57](start_span)功能**：定期将您的资产数据自动备份为一个 JSON 文件发送到 Telegram 聊天[span_57](end_span)[span_58](start_span)，并支持手动拉取最新备份[span_58](end_span)。
* **设置步骤**：
    1.  [span_59](start_span)[span_60](start_span)输入您的 **BOT TOKEN** 和 **CHAT ID**[span_59](end_span)[span_60](end_span)。
    2.  [span_61](start_span)应用将在资产变动后自动尝试备份[span_61](end_span)。

## [span_62](start_span)💾 数据导入/导出 (DATA MANAGER)[span_62](end_span)

### 1. 本地备份与恢复

* **[span_63](start_span)[span_64](start_span)备份**：点击 **DOWNLOAD JSON** 将整个投资组合导出为本地 JSON 文件[span_63](end_span)[span_64](end_span)。
* **[span_65](start_span)[span_66](start_span)恢复**：通过 **SELECT FILE** 上传 JSON 文件以覆盖当前所有资产数据[span_65](end_span)[span_66](end_span)。

### 2. 交易记录批量导入

[span_67](start_span)进入资产的 **交易记录 (History)** 模块[span_67](end_span)[span_68](start_span)[span_69](start_span)，点击 **BULK IMPORT**[span_68](end_span)[span_69](end_span)。

* **[span_70](start_span)[span_71](start_span)支持格式**：JSON 数组或 CSV/TSV/分号分隔的纯文本[span_70](end_span)[span_71](end_span)。
* **[span_72](start_span)必需列**：`日期, 类型, 价格, 数量`[span_72](end_span)。

## 📚 策略标签

[span_73](start_span)应用内置了常用的交易策略标签[span_73](end_span)[span_74](start_span)，用于标记每笔交易[span_74](end_span)：

* **[span_75](start_span)DCA** (定投)[span_75](end_span)
* **[span_76](start_span)SWING** (波段)[span_76](end_span)
* **[span_77](start_span)FOMO** (追涨)[span_77](end_span)
* **[span_78](start_span)YOLO** (梭哈)[span_78](end_span)

## 隐私模式

[span_79](start_span)点击右上角的 **👁️ Eye / 👁️‍🗨️ EyeOff** 图标[span_79](end_span)[span_80](start_span)，可以开启**隐私模式** (`isPrivacyMode`)[span_80](end_span)[span_81](start_span)，将所有金额数值（包括总资产、盈亏、价格）模糊化显示为 `****`[span_81](end_span)[span_82](start_span)，适用于公共场合使用[span_82](end_span)。
