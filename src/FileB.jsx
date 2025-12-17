// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc, collection } from 'firebase/firestore';

// --- 全局配置 ---
const APP_ID = typeof window.__app_id !== 'undefined' ? window.__app_id : 'v42-terminal-demo';
// 更换更稳定的 Proxy 或备用列表
const PROXY = 'https://api.allorigins.win/raw?url='; 
const HL_BASE_URL = 'https://hyperliquid.xyz/user/';
const HL_API_URL = 'https://api.hyperliquid.xyz/info';
const CG_MAP = { 'ETH':'ethereum','BTC':'bitcoin','SOL':'solana','BNB':'binancecoin','DOGE':'dogecoin','XRP':'ripple', 'PEPE':'pepe','ORDI':'ordi','SATS':'sats-ordinals','WIF':'dogwifhat','BONK':'bonk' };

// --- Firebase 初始化 (安全模式) ---
// 检查是否已存在 App 实例，避免重复初始化报错
let db, auth;
try {
    const localConfig = localStorage.getItem('cht_v42_firebase_config');
    const globalConfig = typeof window.__firebase_config !== 'undefined' ? window.__firebase_config : null;
    let configToUse = localConfig ? JSON.parse(localConfig) : (globalConfig ? JSON.parse(globalConfig) : null);

    if (configToUse) {
        let app;
        if (getApps().length > 0) {
            app = getApp(); // 使用已存在的 App (可能是 App5 初始化的)
        } else {
            app = initializeApp(configToUse);
        }
        auth = getAuth(app);
        db = getFirestore(app);
    } else {
        console.warn("No Firebase config found for FileB. Running in offline/demo mode.");
    }
} catch (e) { console.error("Firebase Init Failed in FileB", e); }

// --- 工具函数 ---
const fetchSafe = async (url) => {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error('Network response was not ok');
    return await r.json();
  } catch (e) {
    // Fallback to proxy
    try {
        const r = await fetch('https://corsproxy.io/?' + encodeURIComponent(url));
        return await r.json();
    } catch(err) {
        return null;
    }
  }
};

const avg = (a, n) => a.slice(-n).reduce((x, y) => x + y, 0) / n;
const calcRSI = (p, n) => {
  let g = 0, l = 0;
  for (let i = p.length - n; i < p.length; i++) {
    let d = p[i] - p[i - 1];
    if (d >= 0) g += d; else l -= d;
  }
  let rs = (g / n) / (l / n);
  return 100 - (100 / (1 + rs));
};
const calcATR = (k, n) => {
  let trs = [];
  for (let i = 1; i < k.length; i++) {
    const h = parseFloat(k[i][2]), l = parseFloat(k[i][3]), c = parseFloat(k[i - 1][4]);
    trs.push(Math.max(h - l, Math.abs(h - c), Math.abs(l - c)));
  }
  return avg(trs, n);
};
const calcBOLL = (p, n, k) => {
  const sma = avg(p, n);
  const sd = Math.sqrt(p.slice(-n).reduce((a, b) => a + Math.pow(b - sma, 2), 0) / n);
  return { up: sma + k * sd, low: sma - k * sd };
};

export default function FileB() {
  // --- 状态管理 ---
  const [user, setUser] = useState(null);
  const [statusMsg, setStatusMsg] = useState("> System Ready. V43 Online.");
  const [statusClass, setStatusClass] = useState("");
  
  // 核心市场数据
  const [token, setToken] = useState('ETH');
  const [price, setPrice] = useState(0);
  const [dailyChangePercent, setDailyChangePercent] = useState(0);
  const [openPrice, setOpenPrice] = useState(0);
  
  const [fundingRate, setFundingRate] = useState("--");
  const [fearGreed, setFearGreed] = useState("--");
  const [lsRatio, setLsRatio] = useState("1.04");
  const [openInt, setOpenInt] = useState("--");
  const [dxyVal, setDxyVal] = useState("104.2");
  const [goldVal, setGoldVal] = useState("--");
  const [usdtRate, setUsdtRate] = useState("--");
  
  // 用户设置与输入
  const [source, setSource] = useState('binance');
  const [theme, setTheme] = useState('pixel');
  const [wallet, setWallet] = useState(2800);
  const [lev, setLev] = useState(52);
  const [lPrice, setLPrice] = useState("");
  const [lSize, setLSize] = useState("");
  const [sPrice, setSPrice] = useState("");
  const [sSize, setSSize] = useState("");
  
  // 模拟计算
  const [simPrice, setSimPrice] = useState("");
  const [simAmt, setSimAmt] = useState("0.2");
  
  // 模块数据
  const [stratData, setStratData] = useState([]);
  const [dailyGrid, setDailyGrid] = useState([]);
  const [netFlows, setNetFlows] = useState([]);
  const [analysisHtml, setAnalysisHtml] = useState(null);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState('1h');
  const [news, setNews] = useState([]);
  const [customSources, setCustomSources] = useState([]); 
  
  // 巨鲸追踪
  const [whaleAddresses, setWhaleAddresses] = useState([]);
  const [whaleData, setWhaleData] = useState([]);
  const [whaleCache, setWhaleCache] = useState({});
  const [whaleLoading, setWhaleLoading] = useState(false);
  
  // 世界资产排行榜
  const [topAssets, setTopAssets] = useState([]);

  // 系统与云同步
  const [lastAnalysisTime, setLastAnalysisTime] = useState({'1h':0, '4h':0, '1d':0});
  const [isSyncing, setIsSyncing] = useState(false);
  const [useProxy, setUseProxy] = useState(true);
  const [firebaseConfigInput, setFirebaseConfigInput] = useState("");
  
  // Modals
  const [showTgModal, setShowTgModal] = useState(false);
  const [showWhaleModal, setShowWhaleModal] = useState(false); 
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetAddr, setDeleteTargetAddr] = useState(null);
  
  // Add Whale State
  const [whaleMode, setWhaleMode] = useState('single'); 
  const [newWhaleAddr, setNewWhaleAddr] = useState("");
  const [newWhaleName, setNewWhaleName] = useState("");
  const [batchWhaleText, setBatchWhaleText] = useState("");
  
  // Add Source State
  const [newSourceUrl, setNewSourceUrl] = useState("");

  // 周期回报
  const [retPeriod, setRetPeriod] = useState("Q");
  const [retToken, setRetToken] = useState("BTC");
  const [retData, setRetData] = useState({ headers: [], rows: [] });
  const [retYear, setRetYear] = useState(new Date().getFullYear());
  const [retMonth, setRetMonth] = useState(new Date().getMonth() + 1);

  // Refs
  const wsRef = useRef(null);
  const geckoIntRef = useRef(null);
  const chartContainerRef = useRef(null);
  const [tvScriptLoaded, setTvScriptLoaded] = useState(false);

  // --- Effects ---

  useEffect(() => {
    let meta = document.querySelector("meta[name=viewport]");
    if (!meta) {
        meta = document.createElement("meta");
        meta.name = "viewport";
        document.head.appendChild(meta);
    }
    meta.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
    const preventZoom = (e) => { e.preventDefault(); };
    document.addEventListener('gesturestart', preventZoom);
    return () => document.removeEventListener('gesturestart', preventZoom);
  }, []);

  useEffect(() => {
    // OCR Script
    if (!document.querySelector(`script[src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"]`)) {
        const s = document.createElement('script'); s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"; s.async = true;
        document.head.appendChild(s);
    }
    if (!document.querySelector(`script[src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"]`)) {
        const s = document.createElement('script'); s.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js"; s.async = true;
        document.head.appendChild(s);
    }

    // TradingView Script - 增强加载检测
    const tvSrc = 'https://s3.tradingview.com/tv.js';
    if (!document.querySelector(`script[src="${tvSrc}"]`)) {
        const s = document.createElement('script');
        s.src = tvSrc;
        s.async = true;
        s.onload = () => {
             console.log("TV Script Loaded");
             setTvScriptLoaded(true);
        };
        document.head.appendChild(s);
    } else {
        if (window.TradingView) setTvScriptLoaded(true);
        else {
            const checkTv = setInterval(() => {
                if (window.TradingView) { setTvScriptLoaded(true); clearInterval(checkTv); }
            }, 500);
        }
    }
  }, []);

  // Auth Init
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      if (typeof window.__initial_auth_token !== 'undefined' && window.__initial_auth_token) {
        try {
            await signInWithCustomToken(auth, window.__initial_auth_token);
        } catch(e) {
            console.error("Custom token auth failed", e);
            await signInAnonymously(auth);
        }
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubAuth = onAuthStateChanged(auth, setUser);
    return () => unsubAuth();
  }, []);

  // Cloud Sync Load (User Data)
  useEffect(() => {
    if (!user || !db) return;
    
    // 使用 strict path rule: /artifacts/{appId}/users/{userId}/{collectionName}/{docId}
    const docRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'data', 'file_b_settings');
    
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setIsSyncing(true);
        if (d.lP !== undefined) setLPrice(d.lP);
        if (d.lS !== undefined) setLSize(d.lS);
        if (d.sP !== undefined) setSPrice(d.sP);
        if (d.sS !== undefined) setSSize(d.sS);
        if (d.w !== undefined) setWallet(d.w);
        if (d.lev !== undefined) setLev(d.lev);
        if (d.t && d.t !== token) setToken(d.t);
        if (d.src) setSource(d.src);
        if (d.th) setTheme(d.th);
        if (d.wA) setWhaleAddresses(d.wA);
        if (d.cS) setCustomSources(d.cS);
        setIsSyncing(false);
      }
    }, (err) => {
      logAI("Sync Error", "c-dan");
      console.error(err);
    });
    return () => unsub();
  }, [user]);

  // Cloud Save & Local Storage Logic
  useEffect(() => {
    const saveData = {
      lP: lPrice, lS: lSize, sP: sPrice, sS: sSize, w: wallet, lev,
      t: token, src: source, th: theme, px: useProxy,
      wA: whaleAddresses, cS: customSources,
      lAT: lastAnalysisTime
    };
    // 仍然保留本地存储作为备份，以便快速加载
    localStorage.setItem('cht_v42', JSON.stringify(saveData));
    
    // 自动保存到 Firebase
    if (user && db && !isSyncing) {
       const docRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, 'data', 'file_b_settings');
       setDoc(docRef, saveData, { merge: true }).catch(e => console.error("Cloud push failed", e));
    }
  }, [lPrice, lSize, sPrice, sSize, wallet, lev, token, source, theme, useProxy, whaleAddresses, customSources, lastAnalysisTime, user, isSyncing]);

  // Initial Load (Local backup)
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem('cht_v42'));
      if (d) {
        if(d.lP) setLPrice(d.lP); if(d.lS) setLSize(d.lS); if(d.sP) setSPrice(d.sP); if(d.sS) setSSize(d.sS);
        if(d.w) setWallet(d.w); if(d.lev) setLev(d.lev);
        if(d.t) setToken(d.t); if(d.src) setSource(d.src);
        if(d.th) setTheme(d.th); 
        if(d.px !== undefined) setUseProxy(d.px);
        if(d.wA) setWhaleAddresses(d.wA);
        if(d.cS) setCustomSources(d.cS);
        if(d.lAT) setLastAnalysisTime(d.lAT);
      }
      const fbConfig = localStorage.getItem('cht_v42_firebase_config');
      if (fbConfig) {
          setFirebaseConfigInput(fbConfig);
      }
    } catch(e) {}
    fetchAllData();
    fetchRealMacro();
    reloadNews();
    renderReturnsTable();
  }, []);

  useEffect(() => {
    document.body.className = theme === 'dark' ? '' : theme + '-mode';
  }, [theme]);

  // --- Chart Fix ---
  useEffect(() => {
    if (tvScriptLoaded && window.TradingView && chartContainerRef.current) {
        chartContainerRef.current.innerHTML = ""; // Clean up
        const symbol = "BINANCE:" + token.toUpperCase() + "USDT";
        try {
          new window.TradingView.widget({
              "autosize": true,
              "symbol": symbol,
              "interval": "60",
              "timezone": "Etc/UTC",
              "theme": theme === 'light' ? 'light' : 'dark',
              "style": "1",
              "locale": "zh_CN",
              "toolbar_bg": "#f1f3f6",
              "enable_publishing": false,
              "allow_symbol_change": true,
              "container_id": "tv_chart_container",
              "hide_side_toolbar": false,
              "studies": [],
              "disabled_features": ["header_symbol_search"]
          });
        } catch(e) { console.error("TV Init Error", e); }
    }
  }, [token, theme, tvScriptLoaded]);

  useEffect(() => {
    if (wsRef.current) wsRef.current.close();
    if (geckoIntRef.current) clearInterval(geckoIntRef.current);
    const s = token.toLowerCase();
    
    const updatePrice = (newPrice) => {
        setPrice(newPrice);
        if (openPrice > 0) {
            setDailyChangePercent(((newPrice - openPrice) / openPrice) * 100);
        }
    };

    if (source === 'gecko') {
      const geckoId = CG_MAP[token] || 'ethereum';
      const fetchGecko = async () => {
        try {
          const r = await fetchSafe(`https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd&include_24hr_change=true`);
          if (r[geckoId]) { 
              updatePrice(r[geckoId].usd); 
              if(openPrice === 0) setDailyChangePercent(r[geckoId].usd_24h_change);
          }
        } catch(e) {}
      };
      fetchGecko(); geckoIntRef.current = setInterval(fetchGecko, 10000);
    } else if (source === 'binance') {
      const ws = new WebSocket(`wss://fstream.binance.com/stream?streams=${s}usdt@ticker/${s}usdt@markPrice`);
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.stream.includes('ticker')) { updatePrice(parseFloat(m.data.c)); }
        if (m.stream.includes('markPrice')) { setFundingRate((parseFloat(m.data.r) * 100).toFixed(4) + '%'); }
      };
      wsRef.current = ws;
    } else { 
       const ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');
       ws.onopen = () => ws.send(JSON.stringify({"op":"subscribe","args":[{"channel":"tickers","instId":`${token.toUpperCase()}-USDT-SWAP`},{"channel":"funding-rate","instId":`${token.toUpperCase()}-USDT-SWAP`}]}));
       ws.onmessage = (e) => {
           const m = JSON.parse(e.data);
           if (m.data && m.data[0]) {
               if (m.arg.channel === 'tickers') updatePrice(parseFloat(m.data[0].last));
               if (m.arg.channel === 'funding-rate') setFundingRate((parseFloat(m.data[0].fundingRate)*100).toFixed(4) + '%');
           }
       };
       wsRef.current = ws;
    }
    return () => { if (wsRef.current) wsRef.current.close(); if (geckoIntRef.current) clearInterval(geckoIntRef.current); };
  }, [token, source, openPrice]);

  useEffect(() => {
    const macroInt = setInterval(fetchRealMacro, 60000);
    const whaleInt = setInterval(() => { refreshWhaleData(); }, 60000);
    const aiInt = setInterval(checkScheduledAnalysis, 60000);
    refreshWhaleData();
    return () => { clearInterval(macroInt); clearInterval(whaleInt); clearInterval(aiInt); };
  }, [whaleAddresses, token]);

  // --- World Assets Data Init ---
  useEffect(() => {
      // API 升级：增加 24h, 7d, 30d 数据
      const fetchTopAssets = async () => {
          try {
              let allData = [];
              for (let page = 1; page <= 4; page++) {
                  // 请求更多时间维度的价格变化数据
                  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}&sparkline=false&price_change_percentage=1h,24h,7d,30d`;
                  const data = await fetchSafe(url);
                  
                  if (Array.isArray(data) && data.length > 0) {
                      allData = [...allData, ...data];
                  } else {
                      break; 
                  }
                  await new Promise(resolve => setTimeout(resolve, 300));
              }
              
              if (allData.length > 0) {
                  const formatted = allData.map((item) => {
                      const fmtPct = (p) => p ? `${p > 0 ? '+' : ''}${p.toFixed(1)}%` : '--';
                      return {
                          name: item.symbol.toUpperCase(),
                          cap: item.market_cap >= 1e12 
                               ? `$${(item.market_cap / 1e12).toFixed(2)} T` 
                               : (item.market_cap >= 1e9 
                                   ? `$${(item.market_cap / 1e9).toFixed(2)} B`
                                   : `$${(item.market_cap / 1e6).toFixed(2)} M`),
                          price: item.current_price < 1 
                                 ? `$${item.current_price?.toFixed(6)}` 
                                 : `$${item.current_price?.toLocaleString()}`,
                          // 增加 1d 和 30d
                          chg1d: fmtPct(item.price_change_percentage_24h_in_currency),
                          chg7d: fmtPct(item.price_change_percentage_7d_in_currency),
                          chg30d: fmtPct(item.price_change_percentage_30d_in_currency),
                          rawChg1d: item.price_change_percentage_24h_in_currency || 0
                      };
                  });
                  setTopAssets(formatted);
              }
          } catch (e) {
              console.error("Top Assets Fetch Error", e);
          }
      };

      fetchTopAssets();
      const interval = setInterval(fetchTopAssets, 300000); 
      return () => clearInterval(interval);
  }, []);

  const logAI = (msg, cls = '') => {
    const now = new Date().toLocaleTimeString('zh-CN', {timeZone: 'Asia/Shanghai', hour12: false});
    setStatusMsg(`> [${now}] ${msg}`); setStatusClass(cls);
    setTimeout(() => setStatusClass(''), 3000);
  };

  const calculated = useMemo(() => {
    const p = price || parseFloat(lPrice) || 0;
    const lPVal = parseFloat(lPrice)||0; const lSVal = parseFloat(lSize)||0;
    const sPVal = parseFloat(sPrice)||0; const sSVal = parseFloat(sSize)||0;
    const wVal = parseFloat(wallet)||0;
    const net = (p - lPVal) * lSVal + (sPVal - p) * sSVal;
    const eq = wVal + net; const delta = lSVal - sSVal;
    const mmr = 0.01; const den = delta - (Math.max(lSVal, sSVal) * mmr);
    let liq = 0; if (Math.abs(den) > 0.0001) liq = ((lPVal * lSVal) - (sPVal * sSVal) - wVal) / den; if (liq < 0) liq = 0;
    const riskPct = liq === 0 ? 5 : Math.min(100, Math.max(5, Math.abs(p - liq) / p > 0.2 ? 20 : (1 - Math.abs(p - liq) / (p*0.2)) * 100));
    return {
      netPnl: net.toFixed(2), isProfitable: net >= 0,
      equity: eq.toFixed(2), isSafeEq: eq >= 500,
      lPnl: ((p - lPVal) * lSVal).toFixed(0), sPnl: ((sPVal - p) * sSVal).toFixed(0),
      netDelta: Math.abs(delta).toFixed(3) + (delta > 0 ? ' LONG' : ' SHORT'),
      liq: liq === 0 ? "SAFE" : liq.toFixed(2),
      riskPct: riskPct, riskLevel: riskPct > 80 ? "CRITICAL" : "LOW"
    };
  }, [price, lPrice, lSize, sPrice, sSize, wallet]);

  const simResult = useMemo(() => {
    const p = parseFloat(simPrice); const a = parseFloat(simAmt);
    if (!p || !a) return { avg: '--', liq: '--' };
    const lPVal = parseFloat(lPrice)||0; const lSVal = parseFloat(lSize)||0;
    const sPVal = parseFloat(sPrice)||0; const sSVal = parseFloat(sSize)||0;
    const wVal = parseFloat(wallet)||0;
    let nLS = lSVal, nSS = sSVal, nLP = lPVal, nSP = sPVal;
    if (a > 0) { nLS += a; nLP = ((lPVal * lSVal) + (p * a)) / nLS; } 
    else { const abs = Math.abs(a); nSS += abs; nSP = ((sPVal * sSVal) + (p * abs)) / nSS; }
    const delta = nLS - nSS; const den = delta - (Math.max(nLS, nSS) * 0.01);
    let liq = 0; if (Math.abs(den) > 0.0001) liq = ((nLP * nLS) - (nSP * nSS) - wVal) / den; if (liq < 0) liq = 0;
    return { avg: (a > 0 ? nLP : nSP).toFixed(2), liq: liq > 0 ? liq.toFixed(2) : "SAFE" };
  }, [simPrice, simAmt, lPrice, lSize, sPrice, sSize, wallet]);

  useEffect(() => {
    if (price > 0 && openPrice > 0) {
       const p = price; const lS = parseFloat(lSize)||1; const sS = parseFloat(sSize)||1;
       const res = [{r:1.05,m:0.3},{r:1.025,m:0.2},{r:1.01,m:0.1}]; 
       const sup = [{r:0.99,m:0.1},{r:0.975,m:0.2},{r:0.95,m:0.3}];
       const newStrat = [];
       res.forEach(i => newStrat.push({ p: (p*i.r).toFixed(2), type: '阻力', typeClass: 'c-dan', dist: (((p*i.r)-p)/p*100).toFixed(2)+'%', sugg: (sS*i.m).toFixed(2), act: '做空', rawP: p*i.r, rawS: 'short', rawA: sS*i.m }));
       newStrat.push({ isSep: true, val: p.toFixed(2) });
       sup.forEach(i => newStrat.push({ p: (p*i.r).toFixed(2), type: '支撑', typeClass: 'c-safe', dist: ((p-(p*i.r))/p*100).toFixed(2)+'%', sugg: (lS*i.m).toFixed(2), act: '开多', rawP: p*i.r, rawS: 'long', rawA: lS*i.m }));
       setStratData(newStrat);
       const op = openPrice; const r = [0.01,0.02,0.03,0.05,0.07,0.1,0.15];
       const newGrid = [];
       r.slice().reverse().forEach(v => newGrid.push({ p: (op*(1+v)).toFixed(2), dist: `+${(v*100).toFixed(0)}%`, distClass: 'c-dan', act: 'S', rawP: op*(1+v), rawS: 'short' }));
       newGrid.push({ isSep: true, val: `Open: ${op.toFixed(2)}` });
       r.forEach(v => newGrid.push({ p: (op*(1-v)).toFixed(2), dist: `-${(v*100).toFixed(0)}%`, distClass: 'c-safe', act: 'B', rawP: op*(1-v), rawS: 'long' }));
       setDailyGrid(newGrid);
    }
  }, [price, openPrice, lSize, sSize]);

  async function fetchAllData() {
    const s = token.toUpperCase() + 'USDT';
    try { const fngRes = await fetch('https://api.alternative.me/fng/'); const fngD = await fngRes.json(); setFearGreed(fngD.data[0].value); } catch(e) {}
    setTimeout(async () => { try { const r = await fetchSafe(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${s}`); setFundingRate((parseFloat(r.lastFundingRate)*100).toFixed(4)+'%'); } catch(e) {} }, 3000);
    try {
        const klines = await fetchSafe(`https://api.binance.com/api/v3/klines?symbol=${s}&interval=1d&limit=15`);
        if(klines.length) {
            const today = klines[klines.length - 1];
            const op = parseFloat(today[1]);
            setOpenPrice(op);
            if(price === 0) setPrice(parseFloat(today[4]));
            if (price > 0 && op > 0) setDailyChangePercent(((price - op)/op)*100);
            const flows = klines.slice(0, 10).map(k => ({ flow: (2 * parseFloat(k[10])) - parseFloat(k[7]) }));
            const max = Math.max(...flows.map(f => Math.abs(f.flow)));
            setNetFlows(flows.map(f => ({ h: Math.min(20, Math.abs(f.flow) / max * 20), isBuy: f.flow > 0 })));
            loadAnalysis('1h');
        }
    } catch(e) {}
  }

  // 修复：持仓量重新检查逻辑 (尝试直连 + 代理)
  async function fetchRealMacro() {
    try { const r = await fetchSafe('https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT'); if(r.price) setGoldVal(parseFloat(r.price).toFixed(0)); } catch(e) {}
    try { const r = await fetchSafe('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=cny'); if(r.tether) setUsdtRate(r.tether.cny.toFixed(2)); } catch(e) {}
    
    // 增强的 OI 获取
    const s = token.toUpperCase() + 'USDT';
    const trySetOI = (data, p) => {
        // Binance 返回的是数量，不是金额，需要乘以价格
        const rawOI = parseFloat(data.openInterest);
        const currentPrice = p || price;
        if (!isNaN(rawOI) && currentPrice > 0) {
            setOpenInt(((rawOI * currentPrice) / 1000000).toFixed(2) + 'M');
        }
    };

    try { 
        // 1. 尝试直连 Binance FAPI (openInterestStatistics 其实更准，但这里沿用 openInterest 逻辑)
        // 使用 simple ticker 获取最新价格以确保计算准确
        const pRes = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${s}`).then(r=>r.json()).catch(()=>null);
        const refPrice = pRes ? parseFloat(pRes.price) : price;

        const url = `https://fapi.binance.com/fapi/v1/openInterest?symbol=${s}`;
        const r = await fetch(url).then(res => res.json());
        if(r.openInterest) { trySetOI(r, refPrice); return; }
    } catch(e) { 
        // 2. 失败则尝试代理
        try {
            const url = `https://fapi.binance.com/fapi/v1/openInterest?symbol=${s}`;
            const r = await fetch(PROXY + encodeURIComponent(url)).then(res => res.json());
            if(r.openInterest) trySetOI(r, price);
        } catch(err) { console.log('OI Fetch All Failed'); }
    }
  }

  // --- Whale Fix ---
  async function refreshWhaleData() {
      setWhaleLoading(true);
      const defaultAddr = '0xb317d2bc2d3d2df5fa441b5bae0ab9d8b07283ae';
      const currentList = [...whaleAddresses];
      if (!currentList.some(w => w.address === defaultAddr)) currentList.push({address: defaultAddr, name: '内幕大佬'});
      
      const newData = [];
      
      // 使用更可靠的 CORS 代理逻辑
      const fetchWhale = async (whale) => {
          // 尝试主要代理
          let uUrl = 'https://corsproxy.io/?' + encodeURIComponent(HL_API_URL);
          // 备用：如果用户关闭了代理，尝试直连（虽然通常会失败，但在某些环境可能可行）
          if (!useProxy) uUrl = HL_API_URL;
          
          try {
             const res = await fetch(uUrl, { 
                 method: 'POST', 
                 headers: { 'Content-Type': 'application/json' }, 
                 body: JSON.stringify({ "type": "clearinghouseState", "user": whale.address }) 
             });
             if(!res.ok) throw new Error("API Error");
             const d = await res.json();
             return { ...whale, data: d };
          } catch(e) {
              // 失败时返回错误状态
              return { ...whale, error: true };
          }
      };

      // 并行请求加速
      const results = await Promise.all(currentList.map(w => fetchWhale(w)));
      setWhaleData(results);
      setWhaleLoading(false);
      
      // Cache logic
      results.forEach(w => {
          if(w.data && w.data.assetPositions) {
             const prev = whaleCache[w.address] || [];
             w.data.assetPositions.forEach(cp => {
                 const isNew = !prev.find(pp => pp.position.coin === cp.position.coin);
                 // REMOVED TG ALERT
             });
          }
      });
      setWhaleCache(results.reduce((acc, curr) => {
          if(curr.data && curr.data.assetPositions) acc[curr.address] = curr.data.assetPositions;
          return acc;
      }, {}));
  }

  function handleAddWhale() {
      if(whaleMode === 'batch') {
          if(!batchWhaleText) return;
          const lines = batchWhaleText.split('\n');
          let addedCount = 0;
          let newWhales = [...whaleAddresses];
          lines.forEach(line => {
              const clean = line.trim();
              if(!clean) return;
              const parts = clean.split(/[\s,]+/);
              const addr = parts[0];
              const name = parts.slice(1).join(' ');
              if(addr.startsWith('0x') && addr.length === 42) {
                  if(!newWhales.some(w => w.address.toLowerCase() === addr.toLowerCase())) {
                      newWhales.push({address: addr, name: name || ''});
                      addedCount++;
                  }
              }
          });
          if(addedCount > 0) {
              setWhaleAddresses(newWhales); setBatchWhaleText(""); setShowWhaleModal(false);
              logAI(`Batch added ${addedCount} whales.`, "c-safe");
          } else alert("未找到有效的新地址。");
          return;
      }
      const addr = newWhaleAddr;
      if (!addr) return;
      if (!addr.startsWith('0x') || addr.length !== 42) { alert("地址格式错误！"); return; }
      if (whaleAddresses.some(w => w.address.toLowerCase() === addr.toLowerCase())) { alert("地址已存在！"); return; }
      setWhaleAddresses([...whaleAddresses, { address: addr, name: newWhaleName }]);
      setNewWhaleAddr(""); setNewWhaleName(""); setShowWhaleModal(false);
      logAI(`Added: ${newWhaleName || addr.substring(0,6)}`, "c-safe");
  }

  function requestDeleteWhale(e, addr) {
      e.stopPropagation();
      setDeleteTargetAddr(addr);
      setShowDeleteModal(true);
  }

  function confirmDeleteWhale() {
      if(deleteTargetAddr) {
          setWhaleAddresses(prev => prev.filter(w => w.address.toLowerCase() !== deleteTargetAddr.toLowerCase()));
          logAI("Removed.", "c-warn");
      }
      setShowDeleteModal(false);
      setDeleteTargetAddr(null);
  }

  function handleAddSource() {
      if(!newSourceUrl) return;
      setCustomSources([...customSources, newSourceUrl]);
      setNewSourceUrl(""); 
      logAI("Source added.", "c-safe");
      reloadNews();
  }

  function removeSource(src) {
      setCustomSources(prev => prev.filter(s => s !== src));
      reloadNews();
  }

  async function getAnalysisData(tf) {
      try {
        const k = await fetchSafe(`https://api.binance.com/api/v3/klines?symbol=${token.toUpperCase()}USDT&interval=${tf}&limit=60`);
        const closes = k.map(x => parseFloat(x[4]));
        const last = closes[closes.length - 1]; const ma5 = avg(closes, 5); const ma20 = avg(closes, 20);
        const rsi = calcRSI(closes, 14); const atr = calcATR(k, 14); const boll = calcBOLL(closes, 20, 2);
        const trend = last < ma20 ? "空头排列" : "多头排列";
        const bollSig = last < boll.low ? "贴下轨(超卖)" : (last > boll.up ? "触上轨(超买)" : "中轨震荡");
        const rsiSig = rsi < 30 ? "严重超卖" : (rsi > 70 ? "严重超买" : "中性");
        let action = "观望"; if (trend === "空头排列" && rsi < 35) action = "反弹做空"; else if (trend === "多头排列" && rsi > 65) action = "回调做多";
        const entry = action.includes("空") ? (ma5 * 1.005).toFixed(2) : (ma5 * 0.995).toFixed(2);
        const stop = action.includes("空") ? (parseFloat(entry) + atr * 2).toFixed(2) : (parseFloat(entry) - atr * 2).toFixed(2);
        const target = action.includes("空") ? (parseFloat(entry) - atr * 3).toFixed(2) : (parseFloat(entry) + atr * 3).toFixed(2);
        const trendColor = trend === "空头排列" ? "ana-down" : "ana-up";
        const actionColor = action === "观望" ? "ana-neu" : (action.includes("空") ? "ana-down" : "ana-up");
        const rsiColor = rsi < 30 || rsi > 70 ? (trend === "空头排列" ? 'ana-down' : 'ana-up') : '';
        const summary = `代币: ${token}\nMA趋势: ${trend}\nRSI: ${rsi.toFixed(1)}\n建议: ${action}`;
        return { summary, data: { trend, trendColor, ma5, bollSig, rsi, rsiSig, atr, action, actionColor, entry, stop, target, rsiColor } };
      } catch(e) { return { summary: "Analysis Failed", data: null }; }
  }

  async function loadAnalysis(tf) {
      setActiveAnalysisTab(tf); setAnalysisHtml(<div className="c-dim text-center">Thinking...</div>);
      const res = await getAnalysisData(tf);
      if (res.data) {
          const d = res.data;
          setAnalysisHtml(<>
            <div className="ana-sec"><span className="ana-title">📌 技术综合</span>• <strong>MA趋势</strong>: <span className={d.trendColor}>{d.trend}</span> (MA5={d.ma5.toFixed(2)})<br/>• <strong>BOLL</strong>: {d.bollSig}<br/>• <strong>RSI(14)</strong>: <span className={`bold ${d.rsiColor}`}>{d.rsi.toFixed(1)}</span> ({d.rsiSig})</div>
            <div className="ana-sec"><span className="ana-title">📊 关键数据</span>• <strong>资金费率</strong>: {fundingRate}<br/>• <strong>波动率(ATR)</strong>: {d.atr.toFixed(2)}</div>
            <div className="ana-sec" style={{border:'none', paddingBottom:0}}><span className="ana-title">💡 策略建议: <span className={d.actionColor}>{d.action}</span></span>• <strong>参考入场</strong>: {d.entry}<br/>• <strong>止损保护</strong>: {d.stop}<br/>• <strong>获利目标</strong>: {d.target}<br/><div className="c-dim text-right mt-1">* 仅供参考</div></div>
          </>);
      } else setAnalysisHtml(res.summary);
  }

  function checkScheduledAnalysis() {
      const now = new Date(); const h = now.getUTCHours(); const m = now.getMinutes();
      if(m===0 && (Date.now()-lastAnalysisTime['1h']) >= 3300000) triggerAP('1h');
      if(m===0 && h%4===0 && (Date.now()-lastAnalysisTime['4h']) >= 12600000) triggerAP('4h');
      if(h===8 && m===0 && (Date.now()-lastAnalysisTime['1d']) >= 82800000) triggerAP('1d');
  }
  async function triggerAP(tf) { setLastAnalysisTime({...lastAnalysisTime, [tf]: Date.now()}); const res = await getAnalysisData(tf); 
    // REMOVED TG SEND
  }

  function reloadNews() {
      setNews([]); 
      setTimeout(() => {
          const t = token;
          let list = [];
          customSources.forEach(s => {
              const now = new Date();
              list.push({src: `Source: ${s.substring(0,10)}...`, text: `Connected to external node ${s}`, link: s, time: now.toLocaleTimeString('en-US', {hour12:false, hour:'2-digit', minute:'2-digit'})});
          });
          const templates = [
              { src: 'Twitter @WhaleAlert', isTw: true, text: `🚨 12,000 ${t} transferred from unknown wallet to Binance.` },
              { src: 'Twitter @WatcherGuru', isTw: true, text: `JUST IN: BlackRock's ${t} ETF sees $200M inflow today.` },
              { src: 'Bloomberg', isTw: false, text: `Analyst predicts ${t} consolidation phase.` },
              { src: 'CoinDesk', isTw: false, text: `${t} network activity hits all-time high.` },
              { src: 'The Block', isTw: false, text: `New proposal for ${t} governance approved by community.` },
              { src: 'Twitter @Tree_of_Alpha', isTw: true, text: `Breaking: ${t} devs announce major upgrade timeline.` },
              { src: 'Decrypt', isTw: false, text: `Institutions are accumulating ${t} at these levels.` }
          ];
          for(let i=0; i<20; i++) {
              const temp = templates[i % templates.length];
              const time = new Date(Date.now() - i * 15 * 60000).toLocaleTimeString('en-US', {hour12:false, hour:'2-digit', minute:'2-digit'});
              list.push({ ...temp, text: `${temp.text}`, time }); 
          }
          setNews(list);
      }, 800);
  }

  function renderReturnsTable() {
    const years = Array.from({ length: new Date().getFullYear() - 2013 + 1 }, (_, i) => new Date().getFullYear() - i);
    const monthsInChinese = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    let headers = [], rows = [];
    const mockCell = (min = -15, max = 40) => { const v = (Math.random() * (max - min) + min).toFixed(2); return { val: v, cls: v >= 0 ? 'bg-g' : 'bg-r' }; };
    if (retPeriod === 'Q') { headers = ['Q1', 'Q2', 'Q3', 'Q4']; rows = years.map(y => ({ label: y, cells: headers.map(() => mockCell()) })); }
    else if (retPeriod === 'M') { headers = monthsInChinese; rows = years.map(y => ({ label: y, cells: headers.map(() => mockCell(-10, 25)) })); }
    else if (retPeriod === 'W') { headers = Array.from({ length: 52 }, (_, i) => `W${i + 1}`); rows = years.map(y => ({ label: y, cells: headers.map(() => mockCell(-8, 15)) })); }
    else if (retPeriod === 'D') { const days = new Date(retYear, retMonth, 0).getDate(); headers = Array.from({ length: days }, (_, i) => `${i + 1}日`); rows = [{ label: `${retYear}/${retMonth}`, cells: headers.map(() => mockCell(-4, 10)) }]; }
    setRetData({ headers, rows });
  }
  
  async function runOCR(file) {
      if(!file || !window.Tesseract) return;
      logAI("Scanning...");
      try {
          const worker = await window.Tesseract.createWorker('chi_sim'); const ret = await worker.recognize(file); await worker.terminate();
          const t = ret.data.text.replace(/,/g,'').replace(/\s+/g,' ');
          const sM = [...t.matchAll(/(?:数量|Size)[^\d]*(\d+\.?\d*)/gi)]; const pM = [...t.matchAll(/(?:价格|Price|Entry)[^\d]*(\d+\.?\d*)/gi)];
          if(sM.length && pM.length) { setLSize(sM[0][1]); setLPrice(pM[0][1]); if(sM[1]) setSSize(sM[1][1]); if(pM[1]) setSPrice(pM[1][1]); logAI("OCR Done.", "c-safe"); }
      } catch(e) { logAI("OCR Fail.", "c-dan"); }
  }

  function captureElement(id, name) {
      const el = document.getElementById(id); if(!el || !window.html2canvas) return;
      window.html2canvas(el, { useCORS: true, backgroundColor: null }).then(canvas => {
          const link = document.createElement('a'); link.download = `${name}_${Date.now()}.png`; link.href = canvas.toDataURL(); link.click();
          logAI("Saved.", "c-safe");
      });
  }

  function saveSystemConfig() {
      if (firebaseConfigInput) {
          try {
              JSON.parse(firebaseConfigInput); 
              localStorage.setItem('cht_v42_firebase_config', firebaseConfigInput);
              logAI("Firebase Config Saved. Refresh to apply.", "c-safe");
          } catch(e) {
              logAI("Invalid JSON format!", "c-dan");
              return;
          }
      }
      setShowTgModal(false);
      logAI("Settings Saved.", "c-safe");
  }

  return (
    <>
      <style>{`
        @font-face { font-family: 'TechMono'; src: local('Courier New'), monospace; }
        :root { --bg: #050505; --text: #ccc; --head: #888; --panel: rgba(18, 18, 22, 0.95); --pri: #00f3ff; --dan: #ff003c; --safe: #00ff9f; --warn: #ffcc00; --dim: #666; --border: 1px solid rgba(255,255,255,0.12); --input-border: #333; --dock-bg: rgba(8,8,8,0.98); --ai-bg: rgba(0,0,0,0.95); --hero-bg: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48ZyBmaWxsLXJ1bGU9ImV2ZW5vZGkiPjxnIGZpbGw9IiMzMzMiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMCAwaDQwdjQwSDBWMHptMjAgMjBoMjB2MjBIMjAyMHoiLz48L2c+PC9nPjwvc3ZnPg=='); --rad: 6px; }
        html, body { touch-action: pan-x pan-y; } /* 关键：禁止双指缩放 */
        
        body.light-mode { --bg: #f2f4f7; --text: #333; --head: #555; --panel: #ffffff; --pri: #0066cc; --dan: #d32f2f; --safe: #00994d; --warn: #f57c00; --dim: #888; --border: 1px solid #ddd; --input-border: #ddd; --dock-bg: rgba(255,255,255,0.98); --ai-bg: #eee; --hero-bg: none; }
        
        body.pixel-mode { --bg: #e0e0e0; --text: #000; --head: #000; --panel: #fff; --pri: #000; --dan: #000; --safe: #000; --warn: #000; --dim: #555; --border: 2px solid #000; --input-border: #000; --dock-bg: #fff; --ai-bg: #fff; --hero-bg: radial-gradient(#000 15%, transparent 16%) 0 0, radial-gradient(#000 15%, transparent 16%) 4px 4px; background-size: 8px 8px; --rad: 0px; }
        body.pixel-mode .c-pri, body.pixel-mode .c-dan { text-shadow: none; font-weight: 900; }
        body.pixel-mode .btn:active { transform: translate(2px, 2px); box-shadow: none; }
        body.pixel-mode .source-tag, body.pixel-mode .tab-btn, body.pixel-mode .ret-sel { background: #fff; color: #000; border: 2px solid #000; }
        body.pixel-mode .source-tag.active, body.pixel-mode .tab-btn.active { background: #000; color: #fff; border: 2px solid #000; }
        
        /* DOS Mode: Blue Screen Style */
        body.dos-mode { --bg: #000084; --text: #fff; --head: #ffff55; --panel: #000084; --pri: #ffff55; --dan: #ff5555; --safe: #55ff55; --warn: #ffff55; --dim: #aaa; --border: 2px double #fff; --input-border: #fff; --dock-bg: #000084; --ai-bg: #0000AA; --hero-bg: none; --rad: 0px; }
        body.dos-mode .panel { box-shadow: 6px 6px 0px rgba(0,0,0,0.5); }
        body.dos-mode .btn, body.dos-mode .tab-btn, body.dos-mode .d-btn { border: 1px solid #fff; }
        /* 针对 DOS 模式下头部标签的特殊处理：黑色字体+浅色背景 */
        body.dos-mode .source-tag { background: #ccc; color: #000; border: 1px solid #fff; font-weight: bold; }
        body.dos-mode .source-tag.active { background: #000084; color: #fff; border: 1px solid #ffff55; }

        body.dos-mode .tab-btn.active { background: #fff; color: #000084; font-weight: bold; }
        body.dos-mode input { border-bottom: 1px dashed #fff; }
        body.dos-mode .c-pri, body.dos-mode .c-dan { text-shadow: none; }
        body.dos-mode .ret-sel { color: #000; }

        /* Win98 Mode: Classic Teal & Grey */
        body.win98-mode { --bg: #008080; --text: #000; --head: #fff; --panel: #c0c0c0; --pri: #000080; --dan: #ff0000; --safe: #008000; --warn: #808000; --dim: #555; --border: 2px outset #fff; --input-border: #808080; --dock-bg: #c0c0c0; --ai-bg: #c0c0c0; --hero-bg: none; --rad: 0px; }
        body.win98-mode .panel { border: 2px outset #dfdfdf; box-shadow: 1px 1px 0 #000; }
        body.win98-mode .panel-head { background: linear-gradient(90deg, #000080, #1084d0); padding: 2px 4px; margin: -2px -2px 8px -2px; border: 1px solid #fff; }
        body.win98-mode input { background: #fff; border: 2px inset #dfdfdf; color: #000; padding-left:4px; }
        body.win98-mode .source-tag, body.win98-mode .tab-btn, body.win98-mode .ret-sel, body.win98-mode .d-btn { background: #c0c0c0; border: 2px outset #fff; color: #000; }
        body.win98-mode .source-tag.active, body.win98-mode .tab-btn.active { border: 2px inset #fff; background: #dfdfdf; font-weight:bold; }
        body.win98-mode .c-pri { color: #000080; text-shadow:none; }
        body.win98-mode .c-dan { text-shadow:none; }

        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { background-color: var(--bg); color: var(--text); font-family: 'TechMono', monospace; margin: 0; padding: 12px; font-size: 13px; padding-bottom: 120px; background-image: var(--hero-bg); background-repeat: repeat; transition: background 0.3s, color 0.3s; }
        .flex { display: flex; } .j-between { justify-content: space-between; } .a-center { align-items: center; } .j-end { justify-content: flex-end; }
        .gap-1 { gap: 5px; } .gap-2 { gap: 10px; } .col { flex-direction: column; } .full-w { width: 100%; }
        .mb-1 { margin-bottom: 6px; } .mb-2 { margin-bottom: 10px; } .mt-1 { margin-top: 6px; }
        .bold { font-weight: 800; } .pointer { cursor: pointer; } .text-center { text-align: center; } .text-right { text-align: right; }
        .c-pri { color: var(--pri); } .c-dan { color: var(--dan); } .c-safe { color: var(--safe); } .c-warn { color: var(--warn); } .c-dim { color: var(--dim); }
        body:not(.light-mode):not(.pixel-mode):not(.dos-mode):not(.win98-mode) .c-pri { text-shadow: 0 0 8px rgba(0,243,255,0.25); }
        body:not(.light-mode):not(.pixel-mode):not(.dos-mode):not(.win98-mode) .c-dan { text-shadow: 0 0 8px rgba(255,0,60,0.25); }
        .panel { background: var(--panel); border: var(--border); padding: 12px; margin-bottom: 12px; border-radius: var(--rad); transition: 0.3s; box-shadow: 0 3px 12px rgba(0,0,0,0.1); }
        .panel-head { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--input-border); padding-bottom: 6px; margin-bottom: 8px; font-size: 11px; color: var(--head); letter-spacing: 0.5px; }
        .header-area { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; padding: 0 4px; }
        .header-left { display: flex; flex-direction: column; gap: 6px; }
        .brand-logo { font-size: 22px; letter-spacing: -0.5px; font-weight: 900; line-height: 1; color: var(--pri); text-decoration: none; margin-right: 30px; }
        .source-row { display: flex; align-items: center; gap: 4px; }
        .source-tag { font-size: 9px; padding: 2px 6px; background: var(--input-border); border-radius: 4px; cursor: pointer; border: 1px solid transparent; color: var(--head); display: inline-flex; align-items: center; justify-content: center; opacity: 0.8; transition: 0.2s; }
        .source-tag.active { border-color: var(--safe); color: var(--safe); background: rgba(0,255,159,0.1); opacity: 1; font-weight: bold; }
        .theme-btn { width: 18px; height: 18px; border-radius: 50%; border: 1px solid var(--dim); display: flex; align-items: center; justify-content: center; font-size: 10px; cursor: pointer; background: var(--input-border); color: var(--text); margin-left: 4px; }
        .screenshot-btn, .panel-shot-btn { border-radius: 50%; border: 1px solid var(--dim); display: flex; align-items: center; justify-content: center; cursor: pointer; background: var(--input-border); color: var(--text); font-weight: bold; }
        .screenshot-btn { width: 18px; height: 18px; font-size: 10px; margin-right: 10px; } .panel-shot-btn { width: 16px; height: 16px; font-size: 9px; margin-left: 8px; }
        .screenshot-btn:hover, .panel-shot-btn:hover { border-color: var(--pri); color: var(--pri); }
        .add-btn { width: 16px; height: 16px; border-radius: 2px; border: 1px solid var(--safe); color: var(--safe); display: flex; align-items: center; justify-content: center; font-size: 12px; cursor: pointer; background: transparent; font-weight: bold; margin-left: 8px; }
        .add-btn:hover { background: var(--safe); color: #000; }
        .header-right { display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; width: 100%; gap: 4px; }
        .header-top-buttons { display: flex; align-items: center; justify-content: flex-end; width: 100%; height: 18px; margin-bottom: 4px; }
        .price-row-controls { display: flex; align-items: baseline; justify-content: flex-end; width: 100%; gap: 12px; }
        select#tokenSelect { -webkit-appearance: none; background: transparent; border: none; color: var(--pri); font-weight: 900; font-size: 22px; text-align: right; cursor: pointer; padding: 0; margin: 0; width: auto; font-family: inherit; line-height: 1; }
        .price-hero { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; transition: color 0.2s; line-height: 1; margin-right: 12px; }
        .percent { font-size: 13px; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.08); text-align: center; transform: translateY(-2px); }
        .market-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; font-size: 10px; }
        .market-item { background: rgba(128,128,128,0.05); border: 1px solid var(--input-border); padding: 8px 4px; border-radius: 4px; text-align: center; display: flex; flex-direction: column; justify-content: center; }
        .market-label { color: var(--dim); font-size: 9px; margin-bottom: 3px; white-space: nowrap; transform: scale(0.9); }
        .market-val { font-weight: bold; font-size: 11px; color: var(--text); }
        @media (max-width: 400px) { .market-grid { grid-template-columns: repeat(2, 1fr); } }
        .ret-controls { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
        .ret-sel { flex: 1; background: var(--input-border); border: none; color: var(--text); font-size: 11px; padding: 6px; border-radius: 4px; font-family: inherit; text-align: center; font-weight: bold; cursor: pointer; outline: none; -webkit-appearance: none; min-width: 80px; }
        body.light-mode .ret-sel, body.light-mode .tab-btn.active { background: #000 !important; color: #fff !important; border-color: #000; }
        .ret-grid-container { max-height: 400px; overflow-y: auto; overflow-x: hidden; }
        .ret-table-wrap { overflow-x: auto; padding-bottom: 5px; }
        .ret-table { width: 100%; border-collapse: collapse; font-size: 11px; text-align: center; white-space: nowrap; min-width: 100%; }
        .ret-table th { color: var(--dim); font-weight: normal; padding-bottom: 6px; border-bottom: 1px solid var(--input-border); padding: 6px; }
        .ret-table td { padding: 4px; border-bottom: 1px dashed var(--input-border); }
        .ret-cell { display: inline-block; padding: 3px 0px; border-radius: 3px; color: #fff; font-weight: bold; width: 46px; text-align: center; font-size: 10px; }
        .bg-g { background: var(--safe); color: #F5E9E9; } .bg-r { background: var(--dan); color: #fff; }
        .ret-table td:first-child { text-align: right; }
        .whale-list-container { max-height: 250px; overflow-y: auto; padding-right: 4px; }
        .whale-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; max-height: 250px; } 
        .whale-table { width: 100%; border-collapse: collapse; font-size: 10px; white-space: nowrap; }
        /* Sticky Header */
        .whale-table th { 
            color: var(--head); font-weight: normal; padding: 4px 2px; border-bottom: 1px solid var(--input-border); text-align: left; 
            position: sticky; top: 0; background: var(--panel); z-index: 5;
        }
        
        /* Adjusted World Assets Panel: Higher rows, specific height for top 10 */
        #worldAssetsPanel .whale-table th { padding: 3px 4px; font-size: 10px; }
        #worldAssetsPanel .whale-table td { padding: 6px 4px; font-size: 9px; }
        #worldAssetsPanel .whale-list-container, #worldAssetsPanel .whale-table-wrap { max-height: 618px; }
        
        .whale-table td { padding: 4px 2px; border-bottom: 1px dashed var(--input-border); text-align: left; }
        .whale-table tr:hover { background: rgba(128,128,128,0.05); }
        .whale-address-link { font-size: 9px; color: var(--dim); cursor: pointer; text-decoration: underline; }
        .flow-chart { display: flex; align-items: center; justify-content: space-between; height: 50px; position: relative; padding-top: 10px; margin-top: 10px; border-top: 1px dashed var(--input-border); }
        .flow-chart::before { content:''; position: absolute; top: 50%; left: 0; width: 100%; height: 1px; background: var(--input-border); z-index: 0; }
        .bar-wrapper { height: 100%; width: 100%; display: flex; align-items: center; justify-content: center; position: relative; }
        .bar-visual { width: 5px; background: var(--dim); position: absolute; border-radius: 2px; } 
        .input-box { position: relative; width: 100%; }
        .input-lbl { font-size: 10px; color: var(--dim); position: absolute; top: 0; left: 0; }
        /* 修复 iOS 输入框缩放问题：强制 16px */
        input, .modal-input { font-size: 16px !important; }
        input { background: transparent; border: none; border-bottom: 1px solid var(--input-border); color: var(--text); width: 100%; text-align: right; font-family: inherit; padding-top: 14px; padding-bottom: 4px; font-weight: bold; outline: none; }
        input:focus { border-color: var(--pri); } .short input:focus { border-color: var(--dan); }
        .center-input input { text-align: center; font-size: 18px !important; } .center-input .input-lbl { width: 100%; text-align: center; }
        .strat-table { width: 100%; font-size: 12px; border-collapse: collapse; }
        .strat-table td { padding: 6px 3px; border-bottom: 1px dashed var(--input-border); cursor: pointer; }
        .strat-table th { transform: translateX(-13px); }
        .strat-table tr:hover { background: rgba(128,128,128,0.1); }
        .btn-xs { font-size: 10px; padding: 2px 6px; border: 1px solid var(--dim); border-radius: 4px; color: var(--dim); }
        .sim-box { background: rgba(128,128,128,0.05); border: 1px dashed var(--dim); padding: 10px; border-radius: var(--rad); }
        .analysis-box { font-size: 11px; line-height: 1.6; color: var(--text); max-height: 250px; overflow-y: auto; padding-right: 4px; min-height: 120px; }
        .ana-sec { margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed var(--input-border); }
        .ana-title { font-weight: bold; color: var(--dim); display: block; margin-bottom: 4px; font-size: 12px; }
        .ana-up { color: var(--safe); } .ana-down { color: var(--dan); } .ana-neu { color: var(--warn); }
        .tab-group { display: flex; gap: 4px; margin-bottom: 8px; }
        .tab-btn { flex: 1; padding: 4px; text-align: center; border: 1px solid var(--input-border); color: var(--dim); font-size: 11px; cursor: pointer; border-radius: 4px; }
        .tab-btn.active { background: var(--input-border); color: var(--pri); border-color: var(--pri); font-weight: bold; }
        .news-container { max-height: 250px; overflow-y: auto; padding-right: 4px; scroll-behavior: smooth; }
        .news-card { background: rgba(128,128,128,0.03); border: 1px solid var(--input-border); padding: 12px; margin-bottom: 8px; border-radius: 4px; cursor: pointer; transition: 0.2s; position: relative; }
        .news-card:hover { border-color: var(--pri); background: rgba(128,128,128,0.08); transform: translateX(2px); }
        .news-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .news-src { font-weight: bold; font-size: 11px; color: var(--pri); display: flex; align-items: center; gap: 4px; }
        .news-time { font-size: 9px; color: var(--dim); }
        .news-content { font-size: 12px; line-height: 1.5; color: var(--text); opacity: 0.9; }
        .news-src.twitter { color: #1da1f2; }
        .refresh-btn { font-size: 10px; color: var(--dim); cursor: pointer; border: 1px solid var(--dim); padding: 3px 8px; border-radius: 3px; background: transparent; }
        .refresh-btn:hover { color: var(--pri); border-color: var(--pri); }
        #chartPanel { height: 500px; display: flex; flex-direction: column; }
        .tradingview-widget-container { flex: 1; width: 100%; border-radius: 4px; overflow: hidden; }
        .bottom-fix { position: fixed; bottom: 0; left: 0; width: 100%; z-index: 90; padding-bottom: 0px; }
        .ai-bar { height: 18px; background: var(--ai-bg); border-top: 1px solid var(--input-border); display: flex; align-items: center; padding: 0 10px; font-size: 9px; color: var(--dim); font-family: monospace; backdrop-filter: blur(4px); white-space: nowrap; overflow: hidden; justify-content: space-between; }
        .dock { display: flex; gap: 8px; padding: 8px 12px 10px 12px; background: var(--dock-bg); border-top: 1px solid var(--input-border); height: 70px; align-items: center; justify-content: space-around; }
        .d-btn { flex: 1; padding: 0; height: 100%; background: var(--panel); border: 1px solid var(--input-border); color: var(--dim); cursor: pointer; border-radius: var(--rad); font-size: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0; }
        .d-btn:active { border-color: var(--pri); color: var(--pri); transform: scale(0.98); }
        .d-btn i { font-style: normal; font-size: 24px; line-height: 1; margin: 0; display: block; }
        .modal-mask { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 99; display: none; justify-content: center; align-items: center; }
        .modal-mask.show { display: flex !important; }
        .modal-body { background: var(--panel); border: 1px solid var(--pri); width: 85%; max-width: 340px; padding: 24px; border-radius: var(--rad); color: var(--text); }
        .modal-input { padding: 10px 0; border-bottom: 1px solid var(--dim); width: 100%; background: transparent; border:none; border-bottom:1px solid var(--dim); color:var(--text); margin-bottom: 18px;}
        .sync-active { animation: pulse-green 2s infinite; border-color: var(--safe) !important; color: var(--safe) !important; }
        .modal-tabs { display:flex; gap:10px; margin-bottom:15px; border-bottom:1px solid var(--input-border); }
        .modal-tab { padding:8px 12px; cursor:pointer; font-size:12px; color:var(--dim); border-bottom:2px solid transparent; }
        .modal-tab.active { color:var(--pri); border-bottom-color:var(--pri); font-weight:bold; }
        .source-item { display:flex; justify-content:space-between; align-items:center; font-size:11px; padding:6px 0; border-bottom:1px dashed var(--input-border); }
        @keyframes pulse-green { 0% { box-shadow: 0 0 0 0 rgba(0, 255, 159, 0.4); } 70% { box-shadow: 0 0 0 4px rgba(0, 255, 159, 0); } 100% { box-shadow: 0 0 0 0 rgba(0, 255, 159, 0); } }
      `}</style>

      {/* Header */}
      <div className="flex j-between a-end header-area">
          <div className="header-left">
              <a href="https://x.com/0xkillcoin" target="_blank" rel="noreferrer" className="brand-logo c-pri">@oAdam</a>
              <div className="source-row">
                  <div className={`source-tag ${source==='binance'?'active':''}`} onClick={()=>setSource('binance')}>BIN</div>
                  <div className={`source-tag ${source==='okx'?'active':''}`} onClick={()=>setSource('okx')}>OKX</div>
                  <div className={`source-tag ${source==='gecko'?'active':''}`} onClick={()=>setSource('gecko')}>GCK</div>
                  <div className="theme-btn" onClick={() => setTheme(prev => { const m = ['dark', 'light', 'pixel', 'dos', 'win98']; return m[(m.indexOf(prev) + 1) % 5]; })} id="themeIcon">
                      {theme==='dark'?'☀️':(theme==='light'?'👾':(theme==='pixel'?'📟':(theme==='dos'?'🪟':'🌙')))}
                  </div>
              </div>
          </div>
          <div className="header-right">
              {/* Removed Screenshot Button */}
              <div className="price-row-controls">
                  <select id="tokenSelect" value={token} onChange={(e)=>setToken(e.target.value)}>
                      {Object.keys(CG_MAP).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div id="priceDisplay" className="price-hero c-pri">{price.toFixed(2)}</div>
                  <div id="percentDisplay" className={`percent ${dailyChangePercent>=0?'c-safe':'c-dan'}`}>{dailyChangePercent>0?'+':''}{dailyChangePercent.toFixed(2)}%</div>
              </div>
          </div>
      </div>

      {/* 0. Market Sense */}
      <div className="panel">
          <div className="panel-head"><span>MARKET SENSE</span><span className="c-acc" style={{fontSize:9}}>MACRO</span></div>
          <div className="market-grid">
              <div className="market-item"><span className="market-label">资金费率</span><span className={`market-val ${fundingRate.includes('-')?'c-dan':'c-safe'}`}>{fundingRate}</span></div>
              <div className="market-item"><span className="market-label">贪婪指数</span><span className={`market-val ${fearGreed>75?'c-dan':(fearGreed<25?'c-safe':'c-warn')}`}>{fearGreed}</span></div>
              <div className="market-item"><span className="market-label">多空比L/S</span><span className="market-val">{lsRatio}</span></div>
              <div className="market-item"><span className="market-label">持仓量OI</span><span className="market-val">{openInt}</span></div>
              <div className="market-item"><span className="market-label">山寨指数</span><span className="market-val">32</span></div>
              <div className="market-item"><span className="market-label">美元DXY</span><span className="market-val">{dxyVal}</span></div>
              <div className="market-item"><span className="market-label">黄金Gold</span><span className="market-val">{goldVal}</span></div>
              <div className="market-item"><span className="market-label">USDT汇率</span><span className="market-val">{usdtRate}</span></div>
          </div>
      </div>

      {/* 1. Core Monitor */}
      <div className="panel">
          <div className="panel-head"><span>CORE MONITOR @oAdam</span><span className="c-dim bold">{lev}X</span></div>
          <div className="flex j-between mb-1"><span className="c-dim">未结盈亏</span><span className={`bold ${calculated.isProfitable?'c-safe':'c-dan'}`} style={{fontSize:18}}>{calculated.isProfitable?'+':''}{calculated.netPnl}</span></div>
          <div className="flex j-between mb-1" style={{borderBottom:'1px dashed var(--input-border)', paddingBottom:6}}><span className="c-dim">实时净值</span><span className={`bold ${calculated.isSafeEq?'c-safe':'c-dan'}`} style={{fontSize:18}}>{calculated.equity}</span></div>
          <div className="flex j-between mt-1"><span className="c-dim">风险敞口</span><span>{calculated.netDelta}</span></div>
          <div style={{marginTop:8, height:4, background:'var(--input-border)', borderRadius:2, overflow:'hidden'}}>
              <div style={{height:'100%', width:`${calculated.riskPct}%`, background: calculated.riskPct>80?'var(--dan)':'var(--safe)', transition:'0.5s'}}></div>
          </div>
          <div className="flex j-between mt-1" style={{fontSize:9}}><span>LIQ: {calculated.liq}</span><span>RISK: {calculated.riskLevel}</span></div>
      </div>

      {/* 2. Wallet & Lev */}
      <div className="flex gap-2 mb-2">
          <div className="panel flex-1" style={{margin:0, padding:10}}>
              <div className="input-box center-input"><span className="input-lbl">保证金 (U)</span><input type="number" value={wallet} onChange={(e)=>setWallet(e.target.value)} /></div>
          </div>
          <div className="panel flex-1" style={{margin:0, padding:10}}>
              <div className="input-box center-input"><span className="input-lbl">杠杆 (X)</span><input type="number" value={lev} onChange={(e)=>setLev(e.target.value)} /></div>
          </div>
      </div>

      {/* 3. Positions */}
      <div className="flex gap-2 mb-2">
          <div className="panel flex-1" style={{margin:0}}>
              <div className="flex j-between mb-1"><span className="c-pri bold">LONG</span><span className="c-dim" style={{fontSize:10}}>{calculated.lPnl}</span></div>
              <div className="col gap-1">
                  <div className="input-box"><span className="input-lbl">均价</span><input value={lPrice} onChange={(e)=>setLPrice(e.target.value)} /></div>
                  <div className="input-box"><span className="input-lbl">数量</span><input value={lSize} onChange={(e)=>setLSize(e.target.value)} /></div>
              </div>
          </div>
          <div className="panel flex-1" style={{margin:0, borderColor:'rgba(255,0,60,0.3)'}}>
              <div className="flex j-between mb-1"><span className="c-dan bold">SHORT</span><span className="c-dim" style={{fontSize:10}}>{calculated.sPnl}</span></div>
              <div className="col gap-1 short">
                  <div className="input-box"><span className="input-lbl">均价</span><input value={sPrice} onChange={(e)=>setSPrice(e.target.value)} /></div>
                  <div className="input-box"><span className="input-lbl">数量</span><input value={sSize} onChange={(e)=>setSSize(e.target.value)} /></div>
              </div>
          </div>
      </div>

      {/* 4. Sim */}
      <div className="panel">
          <div className="panel-head"><span>TACTICAL SIM</span><span className="c-warn" style={{fontSize:10}}>PREVIEW</span></div>
          <div className="sim-box mb-2">
              <div className="flex gap-2 mb-1">
                  <div className="flex-1 input-box"><span className="input-lbl">虚拟价格</span><input placeholder="0.00" value={simPrice} onChange={(e)=>setSimPrice(e.target.value)} /></div>
                  <div className="flex-1 input-box"><span className="input-lbl">数量 (+多/-空)</span><input placeholder="0.2" value={simAmt} onChange={(e)=>setSimAmt(e.target.value)} /></div>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', fontSize:12, paddingTop:6, borderTop:'1px dashed var(--input-border)'}}>
                  <span>New AVG: <span className="bold c-dim">{simResult.avg}</span></span>
                  <span>New LIQ: <span className="bold c-dim">{simResult.liq}</span></span>
              </div>
          </div>
      </div>

      {/* 5. Strategy Matrix */}
      <div className="panel" id="stratPanel">
          <div className="panel-head">
              <span>STRATEGY MATRIX <span className="c-pri" style={{fontSize:'10px', marginLeft:'4px'}}>@oAdam</span></span>
              <div className="flex a-center">
                  <span className="c-safe" style={{fontSize:10, marginRight:5}}>AUTO</span>
                  <button className="panel-shot-btn" onClick={()=>captureElement('stratPanel', 'Strategy_Matrix')}>📝</button>
              </div>
          </div>
          {stratData.length === 0 ? <div className="c-dim text-center py-2">Loading...</div> : 
           <table className="strat-table">
               <thead><tr><th>点位</th><th>类型</th><th>距离</th><th>仓位</th><th>方向</th></tr></thead>
               <tbody>
                   {stratData.map((r, i) => r.isSep ? 
                       <tr key={i}><td colSpan="5" className="text-center c-dim" style={{padding:2}}>--- {r.val} ---</td></tr> :
                       <tr key={i} onClick={()=>{setSimPrice(r.rawP); setSimAmt(r.rawA);}}>
                           <td className="bold">{r.p}</td><td className={r.typeClass}>{r.type}</td><td className="c-dim">{r.dist}</td><td className="bold">{r.sugg}</td><td><span className="btn-xs">{r.act}</span></td>
                       </tr>
                   )}
               </tbody>
           </table>
          }
      </div>

      {/* 6. Daily Grid */}
      <div className="panel" id="dailyGridPanel">
          <div className="panel-head">
              <span>DAILY GRID <span className="c-pri" style={{fontSize:'10px', marginLeft:'4px'}}>@oAdam</span></span>
              <div className="flex a-center">
                  <span className="c-pri" style={{fontSize:10}}>OPEN: <span>{openPrice.toFixed(2)}</span> (UTC)</span>
                  <button className="panel-shot-btn" onClick={()=>captureElement('dailyGridPanel', 'DailyGrid')}>📝</button>
              </div>
          </div>
          <table className="strat-table">
            <thead><tr><th style={{transform:'translateX(-70px)'}}>Grid</th><th style={{transform:'translateX(-45px)'}}>Dist</th><th style={{transform:'translateX(-30px)'}}>Act</th></tr></thead>
            <tbody>
              {dailyGrid.map((r, i) => r.isSep ?
                 <tr key={i}><td colSpan="3" className="text-center c-pri">{r.val}</td></tr> :
                 <tr key={i} onClick={()=>{setSimPrice(r.rawP); setSimAmt(r.rawS==='long'?0.2:-0.2);}}><td>{r.p}</td><td className={r.distClass}>{r.dist}</td><td><span className="btn-xs">{r.act}</span></td></tr>
              )}
            </tbody>
          </table>
      </div>

      {/* Chart Panel */}
      <div className="panel" id="chartPanel">
          <div className="panel-head">
              <span>MARKET CHART @oAdam</span>
              <div className="flex a-center"><span className="c-pri" style={{fontSize:10, marginRight:8}}>TRADINGVIEW</span></div>
          </div>
          <div className="tradingview-widget-container" id="tv_chart_container" ref={chartContainerRef}></div>
      </div>

      {/* 7. Net Flow */}
      <div className="panel">
          <div className="panel-head"><span>NET FLOW (10D)</span><span className="c-dim" style={{fontSize:10}}>Net Taker Buy (Quote)</span></div>
          <div className="flow-chart">
              {netFlows.length === 0 ? <div className="c-dim text-center full-w" style={{fontSize:11}}>Loading...</div> :
                netFlows.map((f, i) => (
                    <div key={i} className="bar-wrapper">
                        <div className="bar-visual" style={{height: f.h, [f.isBuy?'bottom':'top']: '50%', background: f.isBuy?'var(--safe)':'var(--dan)'}}></div>
                    </div>
                ))
              }
          </div>
      </div>

      {/* 8. Analysis */}
      <div className="panel" id="analysisPanel">
          <div className="panel-head">
              <span>AI ANALYSIS <span className="c-pri" style={{fontSize:'10px', marginLeft:'4px'}}>@oAdam</span></span>
              <div className="flex a-center">
                  <span className="c-acc" style={{fontSize:10}}>DEEP SCAN</span>
                  <button className="panel-shot-btn" onClick={()=>captureElement('analysisPanel', 'Analysis')}>📝</button>
              </div>
          </div>
          <div className="tab-group">
              {['1h','4h','1d'].map(tf => <div key={tf} className={`tab-btn ${activeAnalysisTab===tf?'active':''}`} onClick={()=>loadAnalysis(tf)}>{tf.toUpperCase()}</div>)}
          </div>
          <div className="analysis-box">
              {analysisHtml || <div className="c-dim text-center">Initializing...</div>}
          </div>
      </div>

      {/* 9. Intelligence */}
      <div className="panel">
          <div className="panel-head">
              <span>INTELLIGENCE</span>
              <div className="flex a-center">
                  <button className="add-btn" onClick={()=>setShowSourceModal(true)} style={{marginRight: '8px'}}>[+]</button>
                  <button className="refresh-btn" onClick={reloadNews}>REFRESH</button>
              </div>
          </div>
          <div className="news-container">
              {news.length===0 ? <div className="c-dim text-center py-4">Connecting to nodes...</div> : 
               news.map((n,i) => (
                   <div key={i} className="news-card" onClick={()=>window.open(n.link,'_blank')}>
                       <div className="news-head">
                           <span className={`news-src ${n.isTw?'twitter':''}`}>{n.src}</span>
                           <span className="news-time">{n.time}</span>
                       </div>
                       <div className="news-content">{n.text}</div>
                   </div>
               ))
              }
          </div>
      </div>

      {/* 10. Periodic Returns */}
      <div className="panel">
          <div className="panel-head"><span>PERIODIC RETURNS V</span><span className="c-safe" style={{fontSize:9}}>HEATMAP</span></div>
          <div className="ret-controls">
              <select className="ret-sel" value={retToken} onChange={(e)=>setRetToken(e.target.value)}>{['BTC','ETH','SOL'].map(t=><option key={t} value={t}>{t}</option>)}</select>
              <select className="ret-sel" value={retPeriod} onChange={(e)=>{setRetPeriod(e.target.value); setTimeout(renderReturnsTable,0);}}>
                  <option value="Q">Quarter</option><option value="M">Month</option><option value="W">Week</option><option value="D">Day</option>
              </select>
              {retPeriod === 'D' && (
                  <>
                    <select className="ret-sel" value={retYear} onChange={(e)=>{setRetYear(parseInt(e.target.value)); setTimeout(renderReturnsTable,0);}}>{Array.from({length: new Date().getFullYear()-2013+1}, (_,i)=>new Date().getFullYear()-i).map(y=><option key={y} value={y}>{y}</option>)}</select>
                    <select className="ret-sel" value={retMonth} onChange={(e)=>{setRetMonth(parseInt(e.target.value)); setTimeout(renderReturnsTable,0);}}>{['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'].map((m,i)=><option key={i} value={i+1}>{m}</option>)}</select>
                  </>
              )}
          </div>
          <div className="ret-grid-container">
              {retData.rows.length === 0 ? <div className="c-dim text-center py-2">Select Period.</div> :
               <div className="ret-table-wrap">
                   <table className="ret-table">
                       <thead><tr><th>{retPeriod==='D'?'Date':'Year'}</th>{retData.headers.map(h=><th key={h}>{h}</th>)}</tr></thead>
                       <tbody>
                           {retData.rows.map((r, i) => (
                               <tr key={i}><td className="bold c-dim">{r.label}</td>{r.cells.map((c, j) => <td key={j} style={{padding:2}}><div className={`ret-cell ${c.cls}`}>{c.val}%</div></td>)}</tr>
                           ))}
                       </tbody>
                   </table>
               </div>
              }
          </div>
      </div>

      {/* 11. Whale Tracker */}
      <div className="panel" id="whaleTrackerPanel">
          <div className="panel-head">
              <span>HYPERLIQUID WHALE TRACKER @oAdam</span>
              <div className="flex a-center">
                  <span className="c-pri" style={{fontSize:9}}>MONITOR: {whaleAddresses.length}</span>
                  <button className="panel-shot-btn" onClick={()=>captureElement('whaleTrackerPanel', 'WhaleTracker')}>📝</button>
                  <button className="add-btn" onClick={()=>{setWhaleMode('single'); setShowWhaleModal(true);}} title="Add Whale">[+]</button>
              </div>
          </div>
          <div className="whale-list-container">
              {whaleLoading ? <div className="c-dim text-center py-4">Loading Data...</div> : (
              <div className="whale-table-wrap">
                   <table className="whale-table">
                       <thead><tr><th>Addr/Remark</th><th>Pair</th><th>Dir</th><th>uPnL</th><th>Lev</th><th>Size</th><th>Entry</th><th>Price</th><th>Value</th><th>Margin</th><th>Liq.</th><th>Act</th></tr></thead>
                       <tbody>
                           {whaleData.map((w, i) => {
                               // 错误状态渲染
                               if(w.error || !w.data) return <tr key={i}>
                                   <td colSpan="11" className="c-dim"><span className="whale-address-link" onClick={()=>window.open(HL_BASE_URL+w.address, '_blank')}>{w.address.slice(0,4)}..{w.address.slice(-4)}{w.name?`[${w.name}]`:''}</span> (Connection/API Error)</td>
                                   <td style={{textAlign:'center', position: 'relative', zIndex: 10}} onClick={(e)=>requestDeleteWhale(e, w.address)}><span className="pointer c-dan" style={{fontSize:'14px', fontWeight:'bold', padding:'10px', display:'inline-block'}}>✕</span></td>
                               </tr>;

                               const pos = w.data.assetPositions;
                               if(!pos || pos.length === 0) return <tr key={i}>
                                   <td><span className="whale-address-link" onClick={()=>window.open(HL_BASE_URL+w.address, '_blank')}>{w.address.slice(0,4)}..{w.address.slice(-4)}{w.name?`[${w.name}]`:''}</span></td>
                                   <td colSpan="10" className="c-dim">No Open Positions {w.data.crossMarginSummary ? `(Eq: $${Math.round(w.data.crossMarginSummary.accountValue)})` : ''}</td>
                                   <td style={{textAlign:'center', position: 'relative', zIndex: 10}} onClick={(e)=>requestDeleteWhale(e, w.address)}><span className="pointer c-dan" style={{fontSize:'14px', fontWeight:'bold', padding:'10px', display:'inline-block'}}>✕</span></td>
                               </tr>;

                               return pos.map((p, j) => {
                                   const cp = p.position; const size = parseFloat(cp.szi); const side = size > 0 ? 'L' : 'S';
                                   const entry = parseFloat(cp.entryPx); const upnl = parseFloat(cp.unrealizedPnl); const levVal = cp.leverage.value; const val = Math.abs(size * entry);
                                   return (
                                     <tr key={`${i}-${j}`}>
                                         <td style={{maxWidth:120}} onClick={()=>window.open(HL_BASE_URL+w.address, '_blank')}>
                                            <span className="whale-address-link" title={w.address}>{w.address.slice(0,4)}..{w.address.slice(-4)}{w.name?`[${w.name}]`:''}</span>
                                         </td>
                                         <td>{cp.coin}</td><td className={`bold ${side==='L'?'c-safe':'c-dan'}`}>{side}</td><td className={`bold ${upnl>=0?'c-safe':'c-dan'}`}>{upnl>0?'+':''}${upnl.toFixed(2)}</td><td>{levVal}x</td><td>{size.toFixed(2)}</td><td>{entry.toFixed(4)}</td><td>--</td><td className="c-dim">${val.toFixed(0)}</td><td>${(val/levVal).toFixed(2)}</td><td className="c-dan">{parseFloat(cp.liquidationPx)?parseFloat(cp.liquidationPx).toFixed(4):'Safe'}</td>
                                         {j===0 ? (
                                            <td style={{textAlign:'center', position: 'relative', zIndex: 10}} onClick={(e)=>requestDeleteWhale(e, w.address)}>
                                                <span className="pointer c-dan" style={{fontSize:'14px', fontWeight:'bold', padding:'10px', display:'inline-block'}}>✕</span>
                                            </td>
                                         ) : <td></td>}
                                     </tr>
                                   );
                               });
                           })}
                       </tbody>
                   </table>
              </div>
              )}
          </div>
      </div>

      {/* 12. World Assets Leaderboard */}
      <div className="panel" id="worldAssetsPanel">
          <div className="panel-head">
              <span>WORLD TOP 1000 CRYPTO ASSETS @oAdam</span>
              <div className="flex a-center">
                  <span className="c-acc" style={{fontSize:9}}>LIVE RANKING</span>
                  <button className="panel-shot-btn" onClick={()=>captureElement('worldAssetsPanel', 'WorldAssets')}>📝</button>
              </div>
          </div>
          <div className="whale-list-container">
              <div className="whale-table-wrap">
                   <table className="whale-table">
                       <thead><tr><th>Rank</th><th>Name</th><th>M. Cap</th><th>Price</th><th>1d %</th><th>7d %</th><th>30d %</th></tr></thead>
                       <tbody>
                           {topAssets.length === 0 ? 
                               <tr><td colSpan="7" className="text-center c-dim">Loading Live Data (0/1000)...</td></tr> :
                               topAssets.map((a, i) => (
                               <tr key={i}>
                                   <td className="c-dim">#{i+1}</td>
                                   <td className="bold">{a.name}</td>
                                   <td>{a.cap}</td>
                                   <td className="bold">{a.price}</td>
                                   <td className={a.rawChg1d > 0 ? 'c-safe' : (a.rawChg1d < 0 ? 'c-dan' : '')}>{a.chg1d}</td>
                                   <td className={a.chg7d.includes('+') ? 'c-safe' : (a.chg7d.includes('-') ? 'c-dan' : '')}>{a.chg7d}</td>
                                   <td className={a.chg30d.includes('+') ? 'c-safe' : (a.chg30d.includes('-') ? 'c-dan' : '')}>{a.chg30d}</td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
              </div>
          </div>
      </div>

      {/* Bottom Fix */}
      <div className="bottom-fix">
          <div className="ai-bar"><span className={statusClass}>{statusMsg}</span>{isSyncing && <span className="sync-active" style={{color:'var(--safe)'}}>☁️ SYNC</span>}</div>
          <div className="dock">
              <button className="d-btn" onClick={()=>document.getElementById('ocrInput').click()}><i>📷</i></button>
              <button className="d-btn" onClick={()=>setShowTgModal(true)}><i>⚙️</i></button>
              {/* Removed TG Send Button */}
              <button className="d-btn" onClick={()=>setSource(prev => prev==='binance'?'okx':(prev==='okx'?'gecko':'binance'))}><i>🔄</i></button>
          </div>
      </div>
      <input type="file" id="ocrInput" style={{display:'none'}} accept="image/*" onChange={(e)=>runOCR(e.target.files[0])} />

      {/* Settings Modal (Simplified) */}
      <div className={`modal-mask ${showTgModal?'show':''}`}>
          <div className="modal-body">
              <div className="flex j-between mb-2"><span className="bold c-pri">System Config</span><span onClick={()=>setShowTgModal(false)} className="pointer">✕</span></div>
              
              {/* Removed Cloud Sync & TG Config Inputs */}
              
              <div className="c-dim mb-1" style={{fontSize:10}}>FIREBASE CONFIG (JSON)</div>
              <textarea 
                  className="modal-input" 
                  style={{height:'80px', resize:'none', border:'1px solid var(--input-border)', padding:'8px', fontSize:'12px', fontFamily:'monospace'}} 
                  placeholder={`{"apiKey": "...", ...}`}
                  value={firebaseConfigInput}
                  onChange={(e)=>setFirebaseConfigInput(e.target.value)}
              ></textarea>

              <div className="flex a-center gap-2 mb-2 c-dim" style={{fontSize:11}} onClick={()=>setUseProxy(!useProxy)}>
                  <div style={{width:32,height:16,background:'var(--input-border)',borderRadius:8,position:'relative'}}>
                      <div style={{width:12,height:12,background:'#fff',borderRadius:'50%',position:'absolute',top:2,left:useProxy?18:2,transition:'0.3s'}}></div>
                  </div><span>CORS Proxy (Whale)</span>
              </div>
              
              <button onClick={saveSystemConfig} style={{width:'100%',padding:10,background:'var(--pri)',color:'#000',border:'none',borderRadius:4, fontWeight:'bold'}}>SAVE & APPLY</button>
          </div>
      </div>

      {/* Add Whale Modal */}
      <div className={`modal-mask ${showWhaleModal?'show':''}`}>
          <div className="modal-body">
              <div className="flex j-between mb-2"><span className="bold c-pri">Add Whale</span><span onClick={()=>setShowWhaleModal(false)} className="pointer">✕</span></div>
              
              <div className="modal-tabs">
                  <div className={`modal-tab ${whaleMode==='single'?'active':''}`} onClick={()=>setWhaleMode('single')}>Single</div>
                  <div className={`modal-tab ${whaleMode==='batch'?'active':''}`} onClick={()=>setWhaleMode('batch')}>Batch Import</div>
              </div>

              {whaleMode === 'single' ? (
                  <>
                    <div className="c-dim mb-1" style={{fontSize:10}}>ADDRESS</div>
                    <input className="modal-input" placeholder="0x..." value={newWhaleAddr} onChange={(e)=>setNewWhaleAddr(e.target.value)} />
                    <div className="c-dim mb-1" style={{fontSize:10}}>REMARK</div>
                    <input className="modal-input" placeholder="Name" value={newWhaleName} onChange={(e)=>setNewWhaleName(e.target.value)} />
                  </>
              ) : (
                  <>
                    <div className="c-dim mb-1" style={{fontSize:10}}>BATCH INPUT (Address Remark)</div>
                    <textarea 
                        className="modal-input" 
                        style={{height:'100px', resize:'none', border:'1px solid var(--input-border)', padding:'8px'}} 
                        placeholder={`0x123... Whale1\n0x456... Whale2`}
                        value={batchWhaleText}
                        onChange={(e)=>setBatchWhaleText(e.target.value)}
                    ></textarea>
                  </>
              )}
              
              <button onClick={handleAddWhale} style={{width:'100%',marginTop:'10px',padding:10,background:'var(--safe)',color:'#fff',border:'none',borderRadius:4,fontWeight:'bold'}}>ADD MONITOR</button>
          </div>
      </div>

      {/* Delete Confirmation Modal */}
      <div className={`modal-mask ${showDeleteModal?'show':''}`}>
          <div className="modal-body">
              <div className="flex j-between mb-2"><span className="bold c-dan">Delete Monitor?</span><span onClick={()=>setShowDeleteModal(false)} className="pointer">✕</span></div>
              <div className="c-dim mb-4" style={{fontSize:12}}>
                  Are you sure you want to remove this address?<br/>
                  <span className="c-text bold">{deleteTargetAddr}</span>
              </div>
              <button onClick={confirmDeleteWhale} style={{width:'100%',padding:10,background:'var(--dan)',color:'#fff',border:'none',borderRadius:4,fontWeight:'bold'}}>CONFIRM DELETE</button>
          </div>
      </div>

      {/* Add Source Modal */}
      <div className={`modal-mask ${showSourceModal?'show':''}`}>
          <div className="modal-body">
              <div className="flex j-between mb-2"><span className="bold c-pri">Manage Sources</span><span onClick={()=>setShowSourceModal(false)} className="pointer">✕</span></div>
              <div className="c-dim mb-1" style={{fontSize:10}}>ADD NEW SOURCE</div>
              <input className="modal-input" placeholder="https://..." value={newSourceUrl} onChange={(e)=>setNewSourceUrl(e.target.value)} />
              <button onClick={handleAddSource} style={{width:'100%',padding:10,background:'var(--safe)',color:'#fff',border:'none',borderRadius:4,fontWeight:'bold',marginBottom:'15px'}}>ADD SOURCE</button>
              
              <div className="c-dim mb-1" style={{fontSize:10}}>EXISTING SOURCES</div>
              <div style={{maxHeight:'150px', overflowY:'auto'}}>
                  {customSources.length === 0 ? <div className="c-dim" style={{fontSize:9, fontStyle:'italic'}}>No custom sources.</div> : 
                   customSources.map((s, i) => (
                       <div key={i} className="source-item">
                           <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'200px'}}>{s}</span>
                           <span className="pointer c-dan" onClick={()=>removeSource(s)}>✕</span>
                       </div>
                   ))
                  }
              </div>
          </div>
      </div>
    </>
  );
}


