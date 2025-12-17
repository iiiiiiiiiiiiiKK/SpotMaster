import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc } from "firebase/firestore";
import { 
  Plus, 
  Trash2, 
  RefreshCw, 
  X,
  Save,
  History,
  Search,
  Zap,
  Wifi,
  WifiOff,
  Calculator,
  CheckCircle2,
  Calendar,
  Settings,
  Upload,
  FileSpreadsheet,
  FileJson,
  FileText,
  ExternalLink,
  Trophy,
  AlertTriangle,
  Anchor,
  Eye,
  EyeOff,
  Activity,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  Briefcase,
  Target,
  Skull,
  Percent,
  Scale,
  Rocket,
  Cloud,
  Database,
  MessageSquare,
  Key,
  DownloadCloud,
  Loader2,
  Check,
  Sun,
  Moon,
  Camera,
  Hash,
  Bot,
  BarChart3,
  ArrowUpDown,
  Layout 
} from 'lucide-react';

// 【修改点 1】：引入 FileB 组件
import FileB from './FileB';

/* =========================================
   PART 1: BINANCE PRICE PANEL CORE (Ported)
   ========================================= */

// --- ICONS for Price Panel ---
const IconBinance = ({ className }) => (
  <svg viewBox="0 0 32 32" className={className} fill="currentColor"><path d="M16 0l-6 6 6 6 6-6-6-6zM6 6l-6 6 6 6 6-6-6-6zM26 6l-6 6 6 6 6-6-6-6zM16 12l-6 6 6 6 6-6-6-6zM6 18l-6 6 6 6 6-6-6-6zM26 18l-6 6 6 6 6-6-6-6zM16 24l-6 6 6 6 6-6-6-6z" /></svg>
);
const IconTradingView = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor"><path d="M21 4H3a1 1 0 00-1 1v14a1 1 0 001 1h18a1 1 0 001-1V5a1 1 0 00-1-1zm-1 14H4V6h16v12z" /><path d="M6 13h3v4H6zm4-5h3v9h-3zm4 3h3v6h-3z" /></svg>
);
const IconX = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
);

// --- THEME DEFINITIONS ---
const PANEL_THEMES = {
  // Dark Pixel Theme
  pixel: {
    id: 'pixel',
    bg: 'bg-slate-900',
    card: 'bg-slate-900',
    textMain: 'text-green-400',
    textSub: 'text-green-600',
    border: 'border-green-500 border-b-4 border-r-4 border-t-2 border-l-2',
    headerBg: 'bg-slate-900 border-b-4 border-green-500',
    radius: 'rounded-none',
    font: "font-mono tracking-tight text-xs", 
    iconMain: 'text-green-600',
    iconHover: 'hover:text-green-300',
    button: 'bg-slate-900 hover:bg-green-900 border-green-600 text-green-400 border-2',
    buttonActive: 'bg-green-500 text-slate-900 border-green-500 border-2',
    rowBorder: 'border-green-900 border-dashed',
    rowHover: 'hover:bg-green-900/30',
    dropdownBg: 'bg-slate-900 border-4 border-green-500',
  },
  // Light Pixel Theme
  lightPixel: {
    id: 'lightPixel',
    bg: 'bg-gray-100',
    card: 'bg-white',
    textMain: 'text-gray-900',
    textSub: 'text-gray-500',
    border: 'border-gray-900 border-b-4 border-r-4 border-t-2 border-l-2',
    headerBg: 'bg-white border-b-4 border-gray-900',
    radius: 'rounded-none',
    font: "font-mono tracking-tight text-xs",
    iconMain: 'text-gray-900',
    iconHover: 'hover:text-gray-600',
    button: 'bg-white hover:bg-gray-200 border-gray-900 text-gray-900 border-2',
    buttonActive: 'bg-gray-900 text-white border-gray-900 border-2',
    rowBorder: 'border-gray-300 border-dashed',
    rowHover: 'hover:bg-gray-100',
    dropdownBg: 'bg-white border-4 border-gray-900',
  }
};

// --- BINANCE SERVICE ---
const KNOWN_QUOTE_ASSETS = ['USDT', 'FDUSD', 'USDC', 'TUSD', 'BUSD', 'BTC', 'ETH', 'BNB', 'EUR', 'TRY', 'BRL', 'JPY'];
const getQuoteAsset = (symbol) => {
  for (const asset of KNOWN_QUOTE_ASSETS) {
    if (symbol.endsWith(asset)) return asset;
  }
  return null;
};

class BinanceService {
  constructor() {
    this.ws = null;
    this.subscribers = [];
    this.tickerMap = new Map();
    this.reconnectAttempt = 0;
    this.endpointIndex = 0;
    this.pendingFetches = new Set();
    this.BASE_WS_URLS = [
      `wss://data-stream.binance.vision/stream?streams=!ticker@arr`,
      `wss://stream.binance.com:9443/stream?streams=!ticker@arr`,
    ];
  }

  connect() {
    this.fetchInitialSnapshot();
    this.connectWebSocket();
  }

  async fetchInitialSnapshot() {
    const domains = ['https://data-api.binance.vision', 'https://api.binance.com'];
    for (const domain of domains) {
      try {
        const [tickerRes, infoRes] = await Promise.all([
          fetch(`${domain}/api/v3/ticker/24hr`),
          fetch(`${domain}/api/v3/exchangeInfo?permissions=SPOT`)
        ]);
        if (!tickerRes.ok || !infoRes.ok) continue;

        const tickerData = await tickerRes.json();
        const infoData = await infoRes.json();
        
        const tradingSymbols = new Set(infoData.symbols.filter(s => s.status === 'TRADING').map(s => s.symbol));
        
        tickerData.forEach(item => {
          if (!tradingSymbols.has(item.symbol) || item.count === 0) return;
          this.tickerMap.set(item.symbol, {
            symbol: item.symbol,
            price: parseFloat(item.lastPrice),
            volume: parseFloat(item.quoteVolume),
            changePercent24h: parseFloat(item.priceChangePercent),
          });
        });
        this.notify();
        return;
      } catch (e) { /* continue */ }
    }
    this.notify();
  }

  async fetchDetailedStats(symbol) {
    if (this.pendingFetches.has(symbol)) return;
    this.pendingFetches.add(symbol);
    try {
      const baseUrl = 'https://data-api.binance.vision/api/v3';
      const tickerStatsPromise = Promise.all([
         fetch(`${baseUrl}/ticker?symbol=${symbol}&windowSize=1h`).then(r => r.ok ? r.json() : null),
         fetch(`${baseUrl}/ticker?symbol=${symbol}&windowSize=4h`).then(r => r.ok ? r.json() : null)
      ]);
      const klinePromise = fetch(`${baseUrl}/klines?symbol=${symbol}&interval=1d&limit=32`).then(r => r.ok ? r.json() : null);

      const [tickerResults, klines] = await Promise.all([tickerStatsPromise, klinePromise]);
      const [res1h, res4h] = tickerResults;

      const item = this.tickerMap.get(symbol);
      if (item) {
        if (res1h) item.changePercent1h = parseFloat(res1h.priceChangePercent);
        if (res4h) item.changePercent4h = parseFloat(res4h.priceChangePercent);

        if (klines && Array.isArray(klines) && klines.length >= 8) {
             const currentPrice = item.price;
             const index7d = klines.length - 1 - 7; 
             if (index7d >= 0) {
                 const close7d = parseFloat(klines[index7d][4]);
                 if (close7d > 0) item.changePercent7d = ((currentPrice - close7d) / close7d) * 100;
             }
             const index30d = klines.length - 1 - 30;
             if (index30d >= 0) {
                 const close30d = parseFloat(klines[index30d][4]);
                 if (close30d > 0) item.changePercent30d = ((currentPrice - close30d) / close30d) * 100;
             }
        }
        this.tickerMap.set(symbol, item);
        this.notify();
      }
    } catch(e) { } finally { this.pendingFetches.delete(symbol); }
  }

  connectWebSocket() {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return;
    this.ws = new WebSocket(this.BASE_WS_URLS[this.endpointIndex]);
    this.ws.onopen = () => { this.reconnectAttempt = 0; };
    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (!msg.data) return;
        const data = Array.isArray(msg.data) ? msg.data : [msg.data];
        data.forEach(item => {
          const existing = this.tickerMap.get(item.s) || { symbol: item.s, price: 0, volume: 0, changePercent24h: 0 };
          existing.price = parseFloat(item.c);
          existing.volume = parseFloat(item.q);
          existing.changePercent24h = parseFloat(item.P);
          this.tickerMap.set(item.s, existing);
        });
        this.notify();
      } catch (e) {}
    };
    this.ws.onclose = () => {
      this.ws = null;
      this.endpointIndex = (this.endpointIndex + 1) % this.BASE_WS_URLS.length;
      setTimeout(() => this.connectWebSocket(), Math.min(1000 * 1.5 ** this.reconnectAttempt++, 10000));
    };
  }

  subscribe(cb) {
    this.subscribers.push(cb);
    if (this.tickerMap.size > 0) cb(new Map(this.tickerMap));
    return () => { this.subscribers = this.subscribers.filter(s => s !== cb); };
  }
  
  disconnect() { this.ws?.close(); }
  notify() { const snap = new Map(this.tickerMap); this.subscribers.forEach(cb => cb(snap)); }
}

const binanceService = new BinanceService();

// --- HEATMAP COLOR LOGIC ---
const getHeatmapColor = (pct) => {
  if (pct === undefined) return 'transparent';
  if (pct > 0) return '#00aa00'; // Green
  if (pct < 0) return '#aa0000'; // Red
  return '#555555'; // Neutral
};

// --- VIRTUAL TABLE COMPONENT ---
const VirtualTable = ({ data, favorites, onToggleFavorite, onSortedIdsChange, theme }) => {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [sortField, setSortField] = useState('volume');
  const [sortDirection, setSortDirection] = useState('desc');
  const t = theme; 

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onScroll = () => requestAnimationFrame(() => container && setScrollTop(container.scrollTop));
    container.addEventListener('scroll', onScroll);
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const getVal = (obj, field) => {
         if (field === 'change1h') return obj.changePercent1h;
         if (field === 'change4h') return obj.changePercent4h;
         if (field === 'change24h') return obj.changePercent24h;
         if (field === 'change7d') return obj.changePercent7d;
         if (field === 'change30d') return obj.changePercent30d;
         return obj[field];
      };
      let valA = getVal(a, sortField) ?? -999999;
      let valB = getVal(b, sortField) ?? -999999;
      if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = valB.toLowerCase(); }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortField, sortDirection]);

  useEffect(() => { onSortedIdsChange?.(sortedData.map(d => d.symbol)); }, [sortedData, onSortedIdsChange]);

  const ROW_HEIGHT = 45; 
  const totalHeight = sortedData.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 10);
  const visibleCount = Math.ceil((containerRef.current?.clientHeight || 600) / ROW_HEIGHT) + 20;
  const visibleData = sortedData.slice(startIndex, startIndex + visibleCount);

  const handleSort = (field) => {
    if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('desc'); }
  };

  const SortIcon = ({ field }) => (
    <span className={`ml-0.5 ${sortField !== field ? 'opacity-0' : ''}`}>{sortDirection === 'asc' ? '↑' : '↓'}</span>
  );

  const handleExtLink = (e, type, symbol) => {
    e.stopPropagation();
    const q = getQuoteAsset(symbol);
    if (!q) return;
    const b = symbol.slice(0, symbol.length - q.length);
    let url = '';
    if (type === 'binance') url = `https://www.binance.com/en/trade/${b}_${q}?type=spot`;
    if (type === 'tv') url = `https://www.tradingview.com/chart/?symbol=BINANCE:${symbol}`;
    if (type === 'x') url = `https://twitter.com/search?q=%24${b}`;
    window.open(url, '_blank');
  };

  return (
    <div className={`flex flex-col border ${t.border} ${t.radius} overflow-hidden ${t.card} w-full h-full ${t.font} relative`}>
      {/* Table Header */}
      <div className={`flex items-center ${t.headerBg} ${t.textSub} flex-shrink-0 z-10 font-bold`} style={{ height: 40 }}>
        <div className="w-8 flex-shrink-0"></div>
        {/* Adjusted column widths for mobile */}
        <button className="w-16 sm:w-20 px-1 text-left h-full flex items-center hover:opacity-80 truncate" onClick={() => handleSort('symbol')}>TKN<SortIcon field="symbol" /></button>
        <button className="w-16 sm:w-20 px-1 text-right h-full flex items-center justify-end hover:opacity-80 truncate" onClick={() => handleSort('price')}>PRICE<SortIcon field="price" /></button>
        <button className="hidden md:flex w-24 px-2 text-right h-full items-center justify-end hover:opacity-80" onClick={() => handleSort('volume')}>VOL<SortIcon field="volume" /></button>
        <button className="flex-1 px-0.5 text-right h-full flex items-center justify-end hover:opacity-80" onClick={() => handleSort('change1h')}>1H<SortIcon field="change1h" /></button>
        <button className="flex-1 px-0.5 text-right h-full flex items-center justify-end hover:opacity-80" onClick={() => handleSort('change4h')}>4H<SortIcon field="change4h" /></button>
        <button className="w-12 px-0.5 text-center h-full flex items-center justify-center hover:opacity-80" onClick={() => handleSort('change24h')}>24H<SortIcon field="change24h" /></button>
        {/* 7D and 30D restored */}
        <button className="flex-1 px-0.5 text-right h-full flex items-center justify-end hover:opacity-80 pr-2" onClick={() => handleSort('change7d')}>7D<SortIcon field="change7d" /></button>
        <button className="flex-1 px-0.5 text-right h-full flex items-center justify-end hover:opacity-80 pr-2" onClick={() => handleSort('change30d')}>30D<SortIcon field="change30d" /></button>
      </div>

      {/* Table Body */}
      <div ref={containerRef} className="flex-1 overflow-y-auto relative scroll-container">
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleData.map((item, index) => {
            const quoteAsset = getQuoteAsset(item.symbol);
            const baseAsset = quoteAsset ? item.symbol.substring(0, item.symbol.length - quoteAsset.length) : item.symbol;
            const isFav = favorites.has(item.symbol);

            const renderPctCell = (val, isBoxed = false, isFlex = true, isLast = false, extraClass = '') => {
                const color = val !== undefined && val > 0 ? '#00aa00' : '#aa0000';
                let boxStyle = {};
                if (isBoxed) {
                    const bgColor = getHeatmapColor(val);
                    const textColor = t.id === 'lightPixel' ? '#ffffff' : '#000000';
                    boxStyle = { backgroundColor: bgColor, color: textColor };
                }
                const style = isBoxed ? boxStyle : { color };
                // Removed hidden logic
                const wrapperClass = `${isBoxed ? 'w-12' : (isFlex ? 'flex-1' : 'w-auto')} ${isLast ? 'pr-1.5' : 'px-0.5'} h-full flex items-center justify-end ${extraClass}`;
                // Compact font size for mobile
                let innerClass = isBoxed ? 'w-full rounded py-0.5 font-bold text-[10px] sm:text-xs text-center' : 'w-full text-[10px] sm:text-xs font-mono text-right';

                return (
                    <div className={wrapperClass}>
                        <div className={innerClass} style={style}>
                           {/* CHANGED: Use toFixed(2) instead of Math.round to show decimals */}
                           {val !== undefined ? `${val > 0 ? '+' : ''}${val.toFixed(2)}%` : '-'}
                        </div>
                    </div>
                );
            };

            // Slightly more precision for 24h box
            // Increased font size here
            const renderBoxedCell = (val) => {
                const bgColor = getHeatmapColor(val);
                const textColor = t.id === 'lightPixel' ? '#ffffff' : '#000000';
                return (
                    // 👇 【外层容器】 w-12 控制这一列的宽度 (Width)
                    <div className="w-12 px-0.5 h-full flex items-center justify-center">
                        {/* 👇 【内层方块】 text-[10px] 控制手机端字号, sm:text-sm 控制电脑端字号 */}
                        <div className="w-full rounded py-0.5 font-bold text-[10px] sm:text-sm text-center" style={{ backgroundColor: bgColor, color: textColor }}>
                           {val !== undefined ? `${val > 0 ? '+' : ''}${val.toFixed(2)}%` : '-'}
                        </div>
                    </div>
                )
            }

            return (
              <div
                key={item.symbol}
                className={`absolute top-0 left-0 w-full flex items-center border-b ${t.rowBorder} ${t.rowHover} transition-colors group`}
                style={{ height: ROW_HEIGHT, transform: `translateY(${(startIndex + index) * ROW_HEIGHT}px)` }}
              >
                <div className="w-8 flex items-center justify-center h-full flex-shrink-0 cursor-pointer z-10" onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.symbol); }}>
                  <span className={`text-xs ${isFav ? 'text-yellow-400' : 'opacity-20'}`}>★</span>
                </div>
                
                <div className={`w-16 sm:w-20 px-0.5 flex flex-col justify-center h-full ${t.textMain} overflow-hidden`}>
                     <div className="flex items-baseline"><span className="font-bold text-[10px] sm:text-sm truncate">{baseAsset}</span></div>
                     <div className={`flex items-center gap-1 mt-0.5 ${t.iconMain}`}>
                        <div onClick={(e) => handleExtLink(e, 'binance', item.symbol)} className={`cursor-pointer ${t.iconHover}`}><IconBinance className="w-3 h-3" /></div>
                        <div onClick={(e) => handleExtLink(e, 'tv', item.symbol)} className={`cursor-pointer ${t.iconHover}`}><IconTradingView className="w-3 h-3" /></div>
                        {/* X Icon Restored */}
                        <div onClick={(e) => handleExtLink(e, 'x', item.symbol)} className={`cursor-pointer ${t.iconHover}`}><IconX className="w-3 h-3" /></div>
                     </div>
                </div>
                
                <div className={`w-16 sm:w-20 px-0.5 text-right font-mono text-[8px] sm:text-sm font-medium h-full flex items-center justify-end ${t.textMain}`}>
                  {item.price < 1 ? item.price.toFixed(5) : item.price.toFixed(2)}
                </div>
                
                <div className={`hidden md:flex w-24 px-2 text-right font-mono text-xs h-full items-center justify-end ${t.textSub}`}>
                  {Number(item.volume).toLocaleString(undefined, { maximumFractionDigits: 0, notation: 'compact' })}
                </div>
                
                {renderPctCell(item.changePercent1h, false, true)}
                {/* 4H Column Adjustment: Added pr-4 to move data left */}
                {renderPctCell(item.changePercent4h, false, true, false, 'pr-4')}
                {renderBoxedCell(item.changePercent24h)}
                {/* 7D and 30D Added Padding pr-2 */}
                {renderPctCell(item.changePercent7d, false, true, false, 'pr-2')}
                {renderPctCell(item.changePercent30d, false, true, true, 'pr-2')}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// --- PRICE PANEL CONTAINER (The new button's content) ---
const PricePanel = ({ isDarkMode, onClose }) => {
  const [tickerDataMap, setTickerDataMap] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssets, setSelectedAssets] = useState(['USDT']);
  const [favorites, setFavorites] = useState(new Set());
  const [viewMode, setViewMode] = useState('market');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortedSymbols, setSortedSymbols] = useState([]);
  
  // Map PixelTrader theme to Panel Theme
  const theme = isDarkMode ? PANEL_THEMES.pixel : PANEL_THEMES.lightPixel;
  const t = theme;
  const filterRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('binance_favorites');
    if (saved) try { setFavorites(new Set(JSON.parse(saved))); } catch (e) {}
    
    binanceService.connect();
    const sub = binanceService.subscribe((data) => {
      setTickerDataMap(data);
      if (data.size > 0) setIsLoading(false);
    });
    const timeout = setTimeout(() => setIsLoading(false), 10000);
    const clickOut = (e) => filterRef.current && !filterRef.current.contains(e.target) && setIsFilterOpen(false);
    document.addEventListener('mousedown', clickOut);
    // REMOVED binanceService.disconnect() to allow main panel data continuity
    return () => { clearTimeout(timeout); sub(); document.removeEventListener('mousedown', clickOut); };
  }, []);

  useEffect(() => { localStorage.setItem('binance_favorites', JSON.stringify(Array.from(favorites))); }, [favorites]);

  useEffect(() => {
    if (!sortedSymbols.length) return;
    const interval = setInterval(() => {
      const target = sortedSymbols.find(s => {
        const item = tickerDataMap.get(s);
        return item && (item.changePercent7d === undefined || item.changePercent30d === undefined);
      });
      if (target) binanceService.fetchDetailedStats(target);
    }, 200);
    return () => clearInterval(interval);
  }, [sortedSymbols, tickerDataMap]);

  const { availableQuoteAssets } = useMemo(() => {
    const assets = new Set();
    tickerDataMap.forEach(item => {
      const q = getQuoteAsset(item.symbol);
      if (q) assets.add(q);
    });
    const priority = ['USDT', 'FDUSD', 'USDC', 'BTC', 'BNB', 'ETH'];
    return { 
      availableQuoteAssets: ['ALL', ...Array.from(assets).sort((a, b) => {
        const pA = priority.indexOf(a), pB = priority.indexOf(b);
        return (pA !== -1 && pB !== -1) ? pA - pB : (pA !== -1 ? -1 : (pB !== -1 ? 1 : a.localeCompare(b)));
      })]
    };
  }, [tickerDataMap]);

  const filteredData = useMemo(() => {
    let data = Array.from(tickerDataMap.values());
    if (viewMode === 'favorites') data = data.filter(i => favorites.has(i.symbol));
    if (!selectedAssets.includes('ALL')) data = data.filter(i => selectedAssets.some(a => i.symbol.endsWith(a)));
    if (searchQuery) {
      const q = searchQuery.toUpperCase();
      data = data.filter(i => i.symbol.includes(q));
    }
    return data;
  }, [tickerDataMap, selectedAssets, searchQuery, viewMode, favorites]);

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col ${t.bg} ${t.textMain} ${t.font} animate-in slide-in-from-bottom-10`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2 ${t.headerBg} flex-shrink-0`}>
        <div className="flex items-center gap-2">
           <BarChart3 size={20} />
           <span className="font-bold text-sm sm:text-base">SPOTDATE 推特@oAdam</span>
           <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`}></div>
        </div>
        <button onClick={onClose} className={`pixel-btn w-8 h-8 flex items-center justify-center ${t.button}`}>
           <X size={18}/>
        </button>
      </div>

      {/* Controls */}
      <div className={`p-2 flex flex-col sm:flex-row gap-2 ${t.bg} border-b ${t.border} flex-shrink-0`}>
          <div className="flex gap-2">
             <div className={`flex p-1 ${t.border} ${t.card} gap-1`}>
                <button onClick={() => setViewMode('market')} className={`px-2 py-1 text-[10px] font-bold ${viewMode === 'market' ? t.buttonActive : 'opacity-50'}`}>MARKET</button>
                <button onClick={() => setViewMode('favorites')} className={`px-2 py-1 text-[10px] font-bold ${viewMode === 'favorites' ? t.buttonActive : 'opacity-50'}`}>FAVS</button>
             </div>
             <div className="flex items-center text-[10px] opacity-70">
                COUNT: {filteredData.length}
             </div>
          </div>

          <div className="flex gap-2 relative z-30" ref={filterRef}>
             <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`px-2 py-1 text-[10px] border ${t.border} flex items-center gap-1 min-w-[80px] justify-between ${t.card}`}>
                {selectedAssets.includes('ALL') ? 'ALL' : selectedAssets[0]} ▾
             </button>
             {isFilterOpen && (
                <div className={`absolute top-full left-0 mt-1 w-64 ${t.dropdownBg} p-2 grid grid-cols-4 gap-2 z-50 shadow-xl`}>
                   {availableQuoteAssets.map(asset => (
                      <button key={asset} onClick={() => { setSelectedAssets([asset]); setIsFilterOpen(false); }} className={`p-1 text-[10px] font-bold border ${selectedAssets.includes(asset) ? t.buttonActive : t.button}`}>
                         {asset}
                      </button>
                   ))}
                </div>
             )}
             <input 
                className={`flex-1 px-2 py-1 text-[10px] border ${t.border} ${t.card} focus:outline-none`}
                placeholder="SEARCH..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
             />
          </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 min-h-0 relative p-2">
          {isLoading && tickerDataMap.size === 0 ? (
             <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-green-500" />
             </div>
          ) : (
             <VirtualTable 
               data={filteredData} 
               favorites={favorites} 
               onToggleFavorite={(s) => setFavorites(prev => { const n = new Set(prev); if (n.has(s)) n.delete(s); else n.add(s); return n; })}
               onSortedIdsChange={setSortedSymbols}
               theme={theme}
             />
          )}
      </div>
    </div>
  );
};

/* =========================================
   PART 2: ORIGINAL APP LOGIC (Preserved)
   ========================================= */

/* --- 1. 静态热门币 --- */
const POPULAR_COINS = [
  { symbol: 'BTC', name: 'Bitcoin', id: 'bitcoin' },
  { symbol: 'ETH', name: 'Ethereum', id: 'ethereum' },
  { symbol: 'USDT', name: 'Tether', id: 'tether' },
  { symbol: 'BNB', name: 'BNB', id: 'binancecoin' },
  { symbol: 'SOL', name: 'Solana', id: 'solana' },
  { symbol: 'XRP', name: 'XRP', id: 'ripple' },
  { symbol: 'USDC', name: 'USDC', id: 'usd-coin' },
  { symbol: 'DOGE', name: 'Dogecoin', id: 'dogecoin' },
  { symbol: 'ADA', name: 'Cardano', id: 'cardano' },
  { symbol: 'AVAX', name: 'Avalanche', id: 'avalanche-2' },
  { symbol: 'SHIB', name: 'Shiba Inu', id: 'shiba-inu' },
  { symbol: 'DOT', name: 'Polkadot', id: 'polkadot' },
  { symbol: 'LINK', name: 'Chainlink', id: 'chainlink' },
  { symbol: 'TRX', name: 'TRON', id: 'tron' },
  { symbol: 'MATIC', name: 'Polygon', id: 'matic-network' },
  { symbol: 'LTC', name: 'Litecoin', id: 'litecoin' },
  { symbol: 'NEAR', name: 'NEAR Protocol', id: 'near' },
  { symbol: 'UNI', name: 'Uniswap', id: 'uniswap' },
  { symbol: 'ICP', name: 'Internet Computer', id: 'internet-computer' },
  { symbol: 'APT', name: 'Aptos', id: 'aptos' },
  { symbol: 'FIL', name: 'Filecoin', id: 'filecoin' },
  { symbol: 'ATOM', name: 'Cosmos Hub', id: 'cosmos' },
  { symbol: 'ARB', name: 'Arbitrum', id: 'arbitrum' },
  { symbol: 'RNDR', name: 'Render', id: 'render-token' },
  { symbol: 'OP', name: 'Optimism', id: 'optimism' },
  { symbol: 'PEPE', name: 'Pepe', id: 'pepe' },
  { symbol: 'ORDI', name: 'Ordinals', id: 'ordinals' },
  { symbol: 'SATS', name: 'SATS', id: 'sats-ordinals' },
  { symbol: 'WIF', name: 'dogwifhat', id: 'dogwifhat' },
  { symbol: 'BONK', name: 'Bonk', id: 'bonk' },
  { symbol: 'FLOKI', name: 'Floki', id: 'floki' },
  { symbol: 'CFX', name: 'Conflux', id: 'conflux-token' },
  { symbol: 'OPEN', name: 'Open', id: 'open-platform' },
  { symbol: 'DOLO', name: 'Dolomite', id: 'dolomite' },
  { symbol: 'TURBO', name: 'Turbo', id: 'turbo' },
];

/* --- 2. 颜色映射表 --- */
const COIN_COLORS = {
  BTC: '#F7931A', // Bitcoin Orange
  ETH: '#627EEA', // Ethereum Blue
  USDT: '#26A17B', // Cash Green
  USDC: '#26A17B', // Cash Green
  DAI: '#26A17B',  // Cash Green
  SOL: '#9945FF', // Solana Purple
  BNB: '#F3BA2F',
  XRP: '#23292F',
  ADA: '#0033AD',
  DOGE: '#C2A633',
  DOT: '#E6007A',
};

const DEFAULT_PALETTE = [
  '#FF0055', '#0033FF', '#FFCC00', '#00CC66', '#CC00FF', '#00FFFF', '#FF6600',
];

/* --- 3. 策略标签定义 --- */
const STRATEGY_TAGS = [
  { id: 'DCA', label: '定投', color: '#10B981', icon: Activity },
  { id: 'SWING', label: '波段', color: '#3B82F6', icon: TrendingUp },
  { id: 'FOMO', label: '追涨', color: '#F59E0B', icon: Zap },
  { id: 'YOLO', label: '梭哈', color: '#EF4444', icon: Skull },
];

/* --- 智能数值格式化 --- */
const smartFmt = (val, type = 'price') => {
  if (val === undefined || val === null || val === '') return '---';
  const num = parseFloat(val);
  if (isNaN(num)) return '---';
  if (num === 0) return '0';

  const absVal = Math.abs(num);

  // 极小数值 (如 SHIB, PEPE): 保留8位小数，去除末尾0
  if (absVal < 0.01) {
    return num.toFixed(8).replace(/\.?0+$/, "");
  }
  
  // 较小数值 (< 1): 保留4位小数
  if (absVal < 1) {
    return num.toFixed(4).replace(/\.?0+$/, "");
  }

  // 大数值: 标准货币格式
  return num.toLocaleString(undefined, { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: type === 'amt' ? 4 : 2 
  });
};

/* --- 像素风 CSS --- */
const PixelStyles = ({ isDarkMode }) => (
  <style>{`
    :root {
      --px-bg: ${isDarkMode ? '#1e293b' : '#ffffff'};
      --px-border: ${isDarkMode ? '#e2e8f0' : '#1a1a1a'};
      --px-shadow: ${isDarkMode ? '#000000' : '#1a1a1a'};
      --px-text: ${isDarkMode ? '#f1f5f9' : '#1a1a1a'};
      --px-input-bg: ${isDarkMode ? '#0f172a' : '#ffffff'};
      --px-input-focus: ${isDarkMode ? '#1e293b' : '#f8fafc'};
      --px-btn-primary: ${isDarkMode ? '#f1f5f9' : '#1a1a1a'};
      --px-btn-primary-text: ${isDarkMode ? '#000000' : '#ffffff'};
    }

    /* Scrollbar for Price Panel */
    .scroll-container::-webkit-scrollbar { width: 6px; height: 6px; }
    .scroll-container::-webkit-scrollbar-thumb { background: #4ade80; border: 2px solid ${isDarkMode ? '#0f172a' : '#ffffff'}; }
    .scroll-container::-webkit-scrollbar-track { background: ${isDarkMode ? '#0f172a' : '#f3f4f6'}; }

    .pixel-box {
      background: var(--px-bg);
      border: 4px solid var(--px-border);
      box-shadow: 6px 6px 0px 0px var(--px-shadow);
      border-radius: 8px;
      position: relative;
      color: var(--px-text);
      transition: all 0.3s ease;
    }
    
    .pixel-btn {
      border: 2px solid var(--px-border);
      box-shadow: 3px 3px 0px 0px var(--px-shadow);
      transition: transform 0.1s, box-shadow 0.1s;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
      border-radius: 6px;
      background: var(--px-bg);
      color: var(--px-text);
    }
    
    .pixel-btn:active {
      transform: translate(3px, 3px);
      box-shadow: 0px 0px 0px 0px var(--px-shadow);
    }

    .pixel-btn.primary {
      background: var(--px-btn-primary);
      color: var(--px-btn-primary-text);
      border-color: var(--px-border);
    }

    .pixel-input {
      border: 2px solid var(--px-border);
      background: var(--px-input-bg);
      color: var(--px-text);
      padding: 0 10px; 
      height: 40px;    
      line-height: 36px;
      outline: none;
      width: 100%;
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 1rem;
      display: block; 
      border-radius: 6px;
      box-shadow: 3px 3px 0px 0px var(--px-shadow); 
      transition: all 0.1s;
    }
    
    .pixel-input:focus {
      background: var(--px-input-focus);
      border-color: var(--px-border);
      transform: translate(1px, 1px);
      box-shadow: 2px 2px 0px 0px var(--px-shadow);
    }
    
    .alloc-segment {
      height: 100%;
      border-right: 2px solid var(--px-border); 
    }
    .alloc-segment:last-child { border-right: none; }
    
    input[type=range] {
      -webkit-appearance: none;
      width: 100%;
      background: transparent;
    }
    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      height: 20px;
      width: 20px;
      border: 2px solid var(--px-border);
      background: var(--px-bg);
      cursor: pointer;
      margin-top: -8px;
      box-shadow: 2px 2px 0px 0px var(--px-shadow);
    }
    input[type=range]::-webkit-slider-runnable-track {
      width: 100%;
      height: 4px;
      background: var(--px-border);
      border-radius: 2px;
    }

    .wr-tab {
      padding: 8px;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      opacity: 0.5;
      transition: all 0.2s;
      color: var(--px-text);
    }
    .wr-tab.active {
      opacity: 1;
      border-bottom: 2px solid var(--px-border);
      font-weight: bold;
    }
  `}</style>
);

const INITIAL_ASSETS = [
  { 
    id: 1, 
    symbol: 'BTC', 
    cgId: 'bitcoin', 
    transactions: [
      { id: 't1', type: 'BUY', price: 68000, amount: 0.1, date: '2024-12-01', strategy: 'DCA' },
    ]
  },
  { 
    id: 2, 
    symbol: 'USDT', 
    cgId: 'tether', 
    transactions: [
      { id: 't2', type: 'BUY', price: 1, amount: 5000, date: '2024-12-01', strategy: 'DCA' },
    ]
  }
];

// --- Helper: Smart JSON Parser for Firebase Config ---
const smartParseFirebaseConfig = (input) => {
  if (!input) return null;
  let clean = input.trim();
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) throw new Error("No object found ({...})");
  clean = clean.substring(firstBrace, lastBrace + 1);
  clean = clean.replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":');
  clean = clean.replace(/:\s*'([^']+)'/g, ': "$1"');
  clean = clean.replace(/,\s*}/g, '}');
  return JSON.parse(clean);
};

// --- War Room Sub-Components ---
const WarRoomTool_Position = () => {
  const [riskAmt, setRiskAmt] = useState('');
  const [entry, setEntry] = useState('');
  const [stop, setStop] = useState('');
  
  const size = useMemo(() => {
    if(!riskAmt || !entry || !stop) return 0;
    const r = parseFloat(riskAmt);
    const e = parseFloat(entry);
    const s = parseFloat(stop);
    const diff = Math.abs(e - s);
    if(diff === 0) return 0;
    return r / diff; 
  }, [riskAmt, entry, stop]);

  return (
    <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
      <div className="bg-yellow-50 dark:bg-yellow-900/30 p-3 border-2 border-yellow-200 dark:border-yellow-700 text-xs text-yellow-800 dark:text-yellow-200 font-bold flex items-center gap-2">
        <Scale size={16}/> 亏损定额反推仓位
      </div>
      <div className="grid grid-cols-2 gap-4">
         <div><label className="text-[10px] font-bold text-gray-500">风险金额 ($)</label><input type="number" className="pixel-input" placeholder="100" value={riskAmt} onChange={e=>setRiskAmt(e.target.value)} /></div>
         <div><label className="text-[10px] font-bold text-gray-500">开仓价格</label><input type="number" className="pixel-input" placeholder="60000" value={entry} onChange={e=>setEntry(e.target.value)} /></div>
         <div className="col-span-2"><label className="text-[10px] font-bold text-gray-500">止损价格</label><input type="number" className="pixel-input" placeholder="58000" value={stop} onChange={e=>setStop(e.target.value)} /></div>
      </div>
      <div className="bg-black dark:bg-gray-800 text-white p-4 border-2 border-black dark:border-white mt-4">
         <div className="text-xs opacity-70 mb-1">建议开仓数量 (Units)</div>
         <div className="text-3xl font-black text-green-400">{size > 0 ? smartFmt(size, 'amt') : '---'}</div>
      </div>
    </div>
  )
};

const WarRoomTool_Kelly = () => {
  const [winRate, setWinRate] = useState(50);
  const [odds, setOdds] = useState(2); 
  
  const kelly = useMemo(() => {
    const p = winRate / 100;
    const q = 1 - p;
    const b = odds;
    return ((b * p - q) / b) * 100;
  }, [winRate, odds]);

  return (
    <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
      <div className="bg-blue-50 dark:bg-blue-900/30 p-3 border-2 border-blue-200 dark:border-blue-700 text-xs text-blue-800 dark:text-blue-200 font-bold flex items-center gap-2">
        <Percent size={16}/> 凯利公式
      </div>
      <div className="grid grid-cols-2 gap-4">
         <div>
            <label className="text-[10px] font-bold text-gray-500 mb-1 block">胜率: {winRate}%</label>
            <input type="range" min="1" max="99" value={winRate} onChange={e=>setWinRate(parseInt(e.target.value))} />
         </div>
         <div><label className="text-[10px] font-bold text-gray-500 block mb-1">赔率 (1:N)</label><input type="number" className="pixel-input" placeholder="2" value={odds} onChange={e=>setOdds(e.target.value)} /></div>
      </div>
      <div className="bg-black dark:bg-gray-800 text-white p-4 border-2 border-black dark:border-white mt-4 text-center">
         <div className="text-xs opacity-70 mb-1">建议仓位 %</div>
         <div className={`text-3xl font-black ${kelly > 0 ? 'text-green-400' : 'text-red-500'}`}>{kelly.toFixed(2)}%</div>
      </div>
    </div>
  )
};

const WarRoomTool_Drawdown = () => {
  const [loss, setLoss] = useState(10);
  const gainNeeded = useMemo(() => {
    if (loss >= 100) return '💀';
    return (1 / (1 - (loss / 100)) - 1) * 100;
  }, [loss]);

  return (
    <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
      <div className="bg-red-50 dark:bg-red-900/30 p-3 border-2 border-red-200 dark:border-red-700 text-xs text-red-800 dark:text-red-200 font-bold flex items-center gap-2">
        <TrendingDown size={16}/> 回本难度计算
      </div>
      <div className="py-4">
         <label className="text-xs font-bold text-gray-500 mb-2 block flex justify-between">
            <span>当前亏损</span>
            <span className="text-red-600">-{loss}%</span>
         </label>
         <input type="range" min="1" max="99" value={loss} onChange={e=>setLoss(parseInt(e.target.value))} />
      </div>
      <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-4 border-2 border-gray-300 dark:border-gray-600">
          <div className="text-sm font-bold text-gray-500 dark:text-gray-400">需涨幅</div>
          <div className="text-3xl font-black text-black dark:text-white">{typeof gainNeeded === 'string' ? gainNeeded : '+' + gainNeeded.toFixed(1) + '%'}</div>
      </div>
    </div>
  )
};

const WarRoomTool_AvgDown = () => {
  const [curQty, setCurQty] = useState('');
  const [curAvg, setCurAvg] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [targetAvg, setTargetAvg] = useState(''); 
  
  const neededQty = useMemo(() => {
    const q = parseFloat(curQty);
    const a = parseFloat(curAvg);
    const p = parseFloat(buyPrice);
    const t = parseFloat(targetAvg);
    if (!q || !a || !p || !t) return null;
    if (p >= a) return 0;
    if (t <= p) return 'Impossible';
    if (t >= a) return 0;

    const num = q * (t - a);
    const den = p - t;
    if (den === 0) return 0;
    const result = num / den;
    return result > 0 ? result : 0;
  }, [curQty, curAvg, buyPrice, targetAvg]);

  return (
    <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
      <div className="bg-gray-50 dark:bg-gray-800 p-3 border-2 border-gray-200 dark:border-gray-600 text-xs text-gray-800 dark:text-gray-200 font-bold flex items-center gap-2">
        <Target size={16}/> 补仓计算器
      </div>
      <div className="grid grid-cols-2 gap-3">
         <div><label className="text-[10px] font-bold text-gray-500">持仓</label><input type="number" className="pixel-input" placeholder="1000" value={curQty} onChange={e=>setCurQty(e.target.value)} /></div>
         <div><label className="text-[10px] font-bold text-gray-500">均价</label><input type="number" className="pixel-input" placeholder="10" value={curAvg} onChange={e=>setCurAvg(e.target.value)} /></div>
         <div><label className="text-[10px] font-bold text-gray-500">补仓价</label><input type="number" className="pixel-input" placeholder="5" value={buyPrice} onChange={e=>setBuyPrice(e.target.value)} /></div>
         <div><label className="text-[10px] font-bold text-gray-500 dark:text-gray-300">目标均价</label><input type="number" className="pixel-input border-black" placeholder="8" value={targetAvg} onChange={e=>setTargetAvg(e.target.value)} /></div>
      </div>
      <div className="bg-black dark:bg-gray-900 text-white p-4 border-2 border-black dark:border-white mt-4">
         <div className="text-xs opacity-70 mb-1">需要买入数量</div>
         <div className="text-3xl font-black text-white">
           {neededQty === 'Impossible' ? '无法实现' : (neededQty ? smartFmt(neededQty, 'amt') : '---')}
         </div>
      </div>
    </div>
  )
};

const WarRoomTool_Compound = () => {
  const [principal, setPrincipal] = useState('10000');
  const [rate, setRate] = useState('1'); 
  const [days, setDays] = useState('365');
  
  const result = useMemo(() => {
    const p = parseFloat(principal);
    const r = parseFloat(rate) / 100;
    const t = parseFloat(days);
    if (!p || !t) return 0;
    return p * Math.pow((1 + r), t);
  }, [principal, rate, days]);

  return (
    <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
      <div className="bg-purple-50 dark:bg-purple-900/30 p-3 border-2 border-purple-200 dark:border-purple-700 text-xs text-purple-800 dark:text-purple-200 font-bold flex items-center gap-2">
        <Rocket size={16}/> 复利推演
      </div>
      <div className="grid grid-cols-3 gap-3">
         <div className="col-span-1"><label className="text-[10px] font-bold text-gray-500">本金</label><input type="number" className="pixel-input" value={principal} onChange={e=>setPrincipal(e.target.value)} /></div>
         <div className="col-span-1"><label className="text-[10px] font-bold text-gray-500">日收益%</label><input type="number" className="pixel-input" value={rate} onChange={e=>setRate(e.target.value)} /></div>
         <div className="col-span-1"><label className="text-[10px] font-bold text-gray-500">天数</label><input type="number" className="pixel-input" value={days} onChange={e=>setDays(e.target.value)} /></div>
      </div>
      <div className="bg-black dark:bg-gray-900 text-white p-4 border-2 border-black dark:border-white mt-4">
         <div className="flex justify-between items-end mb-2">
            <div className="text-xs opacity-70">最终资金</div>
            <div className="text-3xl font-black text-purple-300">${result.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
         </div>
      </div>
    </div>
  )
};

const WarRoomTool_Ruin = () => {
  const [winRate, setWinRate] = useState(40);
  const [riskPerTrade, setRiskPerTrade] = useState(5);
  const [rewardRatio, setRewardRatio] = useState(2); 
  
  const stats = useMemo(() => {
    const w = winRate / 100;
    const l = 1 - w;
    const r = rewardRatio; 
    const ev = (w * r) - (l * 1);
    const stepsToDeath = Math.floor(100 / riskPerTrade);
    return { ev, stepsToDeath, danger: stepsToDeath < 10 ? 'HIGH' : (stepsToDeath < 20 ? 'MED' : 'LOW') };
  }, [winRate, riskPerTrade, rewardRatio]);

  return (
    <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
      <div className="bg-gray-900 text-white p-3 border-2 border-black dark:border-white text-xs font-bold flex items-center gap-2">
        <Skull size={16}/> 死亡计算器
      </div>
      <div className="grid grid-cols-2 gap-4">
         <div>
            <label className="text-[10px] font-bold text-gray-500 block mb-1">胜率 (%)</label>
            <input type="number" className="pixel-input" value={winRate} onChange={e=>setWinRate(e.target.value)} />
         </div>
         <div>
            <label className="text-[10px] font-bold text-gray-500 block mb-1">盈亏比</label><input type="number" className="pixel-input" value={rewardRatio} onChange={e=>setRewardRatio(e.target.value)} />
         </div>
         <div className="col-span-2">
            <label className="text-[10px] font-bold text-gray-500 block mb-1">单笔风险 ({riskPerTrade}%)</label>
            <input type="range" min="1" max="20" step="1" value={riskPerTrade} onChange={e=>setRiskPerTrade(e.target.value)} className="w-full" />
         </div>
      </div>
      <div className={`p-4 border-2 border-black dark:border-white mt-4 ${stats.ev > 0 ? 'bg-white dark:bg-gray-800' : 'bg-red-50 dark:bg-red-900/30'}`}>
         <div className="flex justify-between items-center mb-2">
           <div className="text-xs font-bold text-gray-500 dark:text-gray-400">期望值 (EV)</div>
           <div className={`font-bold ${stats.ev > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{stats.ev > 0 ? '+' : ''}{stats.ev.toFixed(2)} R</div>
         </div>
         <div className="flex justify-between items-center">
            <div className="text-xs font-bold text-gray-500 dark:text-gray-400">连败爆仓步数</div>
            <div className="font-black text-2xl text-black dark:text-white">{stats.ev <= 0 ? '必死' : `${stats.stepsToDeath} 步`}</div>
         </div>
      </div>
    </div>
  )
};

export default function PixelTraderV34_PriceBoard() {
  const [assets, setAssets] = useState(INITIAL_ASSETS);
  const [prices, setPrices] = useState({}); 
  const [source, setSource] = useState('binance');
  const [status, setStatus] = useState('idle');
  const [sortMode, setSortMode] = useState('value');
  
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [showStressTest, setShowStressTest] = useState(false);
  const [showPricePanel, setShowPricePanel] = useState(false);
  const [stressPercent, setStressPercent] = useState(0); 
  
  const [isWarRoomOpen, setIsWarRoomOpen] = useState(false);
  const [warRoomTab, setWarRoomTab] = useState('position');

  const [coinDb, setCoinDb] = useState(POPULAR_COINS); 
  const [isDbLoading, setIsDbLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState('basic'); 
  
  const [activeHistoryId, setActiveHistoryId] = useState(null); 
  const [activeCalcId, setActiveCalcId] = useState(null);
  const [isAddingNewCoin, setIsAddingNewCoin] = useState(false); 
  const [isImporting, setIsImporting] = useState(false); 
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('data'); 
  
  const [newCoinSearch, setNewCoinSearch] = useState('');
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [addError, setAddError] = useState('');
  const [importText, setImportText] = useState(''); 
  const [importPreview, setImportPreview] = useState(null); 
  
  // NEW STATE: Control FileB display
  const [showFileB, setShowFileB] = useState(false);

  const [txForm, setTxForm] = useState({ 
    type: 'BUY', 
    price: '', 
    amount: '', 
    date: new Date().toISOString().split('T')[0],
    strategy: 'DCA' 
  });
  
  // OCR State
  const fileInputRef = useRef(null);
  const [isOcrScanning, setIsOcrScanning] = useState(false);
  
  const [calcMode, setCalcMode] = useState('amount');
  const [calcInput, setCalcInput] = useState(''); 
  const [calcPrice, setCalcPrice] = useState('');

  const [deleteConfirmId, setDeleteConfirmId] = useState(null); 
  const [deleteTxConfirmId, setDeleteTxConfirmId] = useState(null); 

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Binance Data State (for main list)
  const [binanceData, setBinanceData] = useState(new Map());

  const wsRef = useRef(null);

  // --- CLOUD CONFIG STATE (BYOK) ---
  const [cloudConfig, setCloudConfig] = useState({
    firebaseConfig: '',
    tgToken: '',
    tgChatId: ''
  });
  
  const [firebaseConfigInput, setFirebaseConfigInput] = useState('');
  const [firebaseParseError, setFirebaseParseError] = useState(null);
  
  const [firebaseStatus, setFirebaseStatus] = useState('idle'); 
  const [tgLastBackup, setTgLastBackup] = useState(null);
  const [isPullingTg, setIsPullingTg] = useState(false);
  
  const dbRef = useRef(null);
  const isRemoteUpdate = useRef(false); 
  const assetsRef = useRef(assets); 

  // --- 1. Load User Data & Cloud Config & Theme ---
  useEffect(() => {
    try {
      const savedAssets = localStorage.getItem('pixel_trader_v22');
      if (savedAssets) setAssets(JSON.parse(savedAssets));
      
      const savedConfig = localStorage.getItem('pixel_trader_cloud_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setCloudConfig(parsed);
        if (parsed.firebaseConfig) setFirebaseConfigInput(parsed.firebaseConfig);
      }
      
      const savedTheme = localStorage.getItem('pixel_trader_theme');
      if (savedTheme === 'dark') setIsDarkMode(true);
    } catch (e) {}
  }, []);
  
  // --- Connect Binance Service for main list data ---
  useEffect(() => {
      binanceService.connect();
      const unsub = binanceService.subscribe(setBinanceData);
      return () => unsub();
  }, []);

  // --- Periodically fetch stats for current assets ---
  useEffect(() => {
      const fetchStats = () => {
          assets.forEach(asset => {
              // Assume USDT pair for main stats if not specified
              const symbol = asset.symbol.endsWith('USDT') ? asset.symbol : asset.symbol + 'USDT';
              binanceService.fetchDetailedStats(symbol);
          });
      };
      
      fetchStats(); // Initial fetch
      const interval = setInterval(fetchStats, 60000); // Refresh every minute
      return () => clearInterval(interval);
  }, [assets]);

  useEffect(() => {
    if(!isRemoteUpdate.current) {
        localStorage.setItem('pixel_trader_v22', JSON.stringify(assets));
    }
    assetsRef.current = assets; 
  }, [assets]);

  const toggleTheme = () => {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      localStorage.setItem('pixel_trader_theme', newMode ? 'dark' : 'light');
  };

  const saveCloudConfig = (newConfig) => {
    setCloudConfig(newConfig);
    localStorage.setItem('pixel_trader_cloud_config', JSON.stringify(newConfig));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
        if (!firebaseConfigInput.trim()) {
            setFirebaseParseError(null);
            return;
        }
        try {
            const parsedObj = smartParseFirebaseConfig(firebaseConfigInput);
            const standardJson = JSON.stringify(parsedObj);
            setFirebaseParseError(null);
            if (standardJson !== cloudConfig.firebaseConfig) {
                saveCloudConfig({ ...cloudConfig, firebaseConfig: standardJson });
            }
        } catch (e) {
            setFirebaseParseError("Invalid format: " + e.message);
        }
    }, 800);
    return () => clearTimeout(timer);
  }, [firebaseConfigInput, cloudConfig]);


  useEffect(() => {
    if (cloudConfig.firebaseConfig && cloudConfig.firebaseConfig.trim().startsWith('{')) {
      try {
        setFirebaseStatus('connecting');
        const config = JSON.parse(cloudConfig.firebaseConfig);
        let app;
        try {
            app = initializeApp(config);
        } catch(e) {
            if(e.code === 'app/duplicate-app') { 
                console.log("App exists");
            }
        }
        
        if (app) {
             const db = getFirestore(app);
             dbRef.current = db;
             const unsub = onSnapshot(doc(db, "pixel_trader", "user_data"), (doc) => {
                if (doc.exists()) {
                    const data = doc.data();
                    if (data.assets && JSON.stringify(data.assets) !== JSON.stringify(assetsRef.current)) {
                        console.log("🔥 Firebase: Received update");
                        isRemoteUpdate.current = true;
                        setAssets(data.assets);
                        setTimeout(() => { isRemoteUpdate.current = false; }, 100);
                    }
                }
             }, (error) => {
                 console.error("Firebase Listen Error:", error);
                 setFirebaseStatus('error');
             });
             setFirebaseStatus('connected');
             return () => unsub();
        }
      } catch (e) {
        console.error("Firebase Init Failed:", e);
        setFirebaseStatus('error');
      }
    } else {
        setFirebaseStatus('idle');
    }
  }, [cloudConfig.firebaseConfig]);

  useEffect(() => {
    if (firebaseStatus === 'connected' && dbRef.current && !isRemoteUpdate.current) {
        const timer = setTimeout(async () => {
            try {
                console.log("🔥 Firebase: Syncing up...");
                await setDoc(doc(dbRef.current, "pixel_trader", "user_data"), { 
                    assets, 
                    lastUpdated: new Date().toISOString() 
                });
            } catch (e) {
                console.error("Sync Up Failed", e);
            }
        }, 1000); 
        return () => clearTimeout(timer);
    }
  }, [assets, firebaseStatus]);

  useEffect(() => {
    if (cloudConfig.tgToken && cloudConfig.tgChatId && !isRemoteUpdate.current) {
        const timer = setTimeout(async () => {
            try {
                const blob = new Blob([JSON.stringify({ assets, date: new Date().toISOString() }, null, 2)], { type: 'application/json' });
                const formData = new FormData();
                formData.append('chat_id', cloudConfig.tgChatId);
                formData.append('document', blob, `backup_${Date.now()}.json`);
                formData.append('caption', `🤖 Auto-Backup: ${new Date().toLocaleTimeString()}`);
                await fetch(`https://api.telegram.org/bot${cloudConfig.tgToken}/sendDocument`, {
                    method: 'POST',
                    body: formData
                });
                setTgLastBackup(new Date());
            } catch (e) {}
        }, 3000); 
        return () => clearTimeout(timer);
    }
  }, [assets, cloudConfig.tgToken, cloudConfig.tgChatId]);

  const handleTgPull = async () => {
      if (!cloudConfig.tgToken) return;
      setIsPullingTg(true);
      try {
          const res = await fetch(`https://api.telegram.org/bot${cloudConfig.tgToken}/getUpdates?offset=-5`);
          const data = await res.json();
          if (data.ok && data.result.length > 0) {
              let foundData = null;
              for (let i = data.result.length - 1; i >= 0; i--) {
                  const text = data.result[i].message?.text;
                  if (text && (text.startsWith('{') || text.startsWith('['))) {
                      try {
                          const parsed = JSON.parse(text);
                          if (Array.isArray(parsed)) { foundData = parsed; break; }
                          if (parsed.assets && Array.isArray(parsed.assets)) { foundData = parsed.assets; break; }
                      } catch(e) {}
                  }
              }
              if (foundData) {
                  if(confirm(`Found data from TG! Overwrite current assets? (${foundData.length} coins)`)) {
                      isRemoteUpdate.current = true;
                      setAssets(foundData);
                      setTimeout(() => { isRemoteUpdate.current = false; }, 100);
                      alert("Successfully updated from Telegram!");
                  }
              } else {
                  alert("No valid JSON data found in recent Telegram messages.");
              }
          }
      } catch (e) {
          alert("Failed to pull from TG");
      } finally {
          setIsPullingTg(false);
      }
  };

  useEffect(() => {
    const cachedDb = localStorage.getItem('pixel_trader_full_coin_db');
    const cachedTime = localStorage.getItem('pixel_trader_db_time');
    const now = Date.now();
    if (cachedDb && cachedTime && (now - parseInt(cachedTime) < 24 * 60 * 60 * 1000)) {
      try {
        const fullList = JSON.parse(cachedDb);
        setCoinDb(fullList);
        setDbStatus('full');
      } catch(e) { fetchFullCoinList(); }
    } else { fetchFullCoinList(); }
  }, []);

  const fetchFullCoinList = async () => {
    setIsDbLoading(true);
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/coins/list?include_platform=false');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const popularIds = new Set(POPULAR_COINS.map(c => c.id));
      const others = data.filter(c => !popularIds.has(c.id));
      const fullList = [...POPULAR_COINS, ...others];
      setCoinDb(fullList);
      setDbStatus('full');
      localStorage.setItem('pixel_trader_full_coin_db', JSON.stringify(fullList));
      localStorage.setItem('pixel_trader_db_time', Date.now().toString());
    } catch (err) { } finally { setIsDbLoading(false); }
  };

  useEffect(() => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    setPrices({});
    if (source === 'binance') connectBinance();
    else if (source === 'coingecko') fetchCoinGecko();
    else if (source === 'cryptocompare') fetchCryptoCompare();
    return () => wsRef.current?.close();
  }, [source, assets]);

  const connectBinance = () => {
    setStatus('connecting');
    try {
      const ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');
      ws.onopen = () => setStatus('connected');
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const newPrices = {};
          const watchList = new Set(assets.map(a => `${a.symbol.toUpperCase()}USDT`));
          let hasUpdate = false;
          data.forEach(t => {
            if (watchList.has(t.s)) {
              newPrices[t.s.replace('USDT', '')] = parseFloat(t.c);
              hasUpdate = true;
            }
          });
          if (hasUpdate) setPrices(prev => ({ ...prev, ...newPrices }));
        } catch(e) {}
      };
      ws.onclose = () => setStatus('disconnected');
      wsRef.current = ws;
    } catch (e) { setStatus('error'); }
  };

  const fetchCoinGecko = async () => {
    setStatus('loading');
    try {
      const ids = assets.map(a => a.cgId).filter(id => id).join(',');
      if (!ids) { setStatus('idle'); return; }
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
      const data = await res.json();
      const newPrices = {};
      assets.forEach(asset => {
        if (asset.cgId && data[asset.cgId]?.usd) {
          newPrices[asset.symbol] = data[asset.cgId].usd;
        }
      });
      setPrices(newPrices);
      setStatus('connected');
    } catch (err) { setStatus('error'); }
  };

  const fetchCryptoCompare = async () => {
    setStatus('loading');
    try {
      const symbols = assets.map(a => a.symbol.toUpperCase()).join(',');
      if (!symbols) { setStatus('idle'); return; }
      const res = await fetch(`https://min-api.cryptocompare.com/data/pricemulti?fsyms=${symbols}&tsyms=USD`);
      const data = await res.json();
      const newPrices = {};
      assets.forEach(asset => {
        const sym = asset.symbol.toUpperCase();
        if (data[sym] && data[sym].USD) {
          newPrices[asset.symbol] = data[sym].USD;
        }
      });
      setPrices(newPrices);
      setStatus('connected');
    } catch (err) { setStatus('error'); }
  };

  const calculatePosition = (transactions) => {
    let currentAmount = 0;
    let totalCost = 0; 
    let realizedPnL = 0; 
    
    const sortedTxs = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

    sortedTxs.forEach(tx => {
      const price = parseFloat(tx.price);
      const amount = parseFloat(tx.amount);
      if (tx.type === 'BUY') {
        currentAmount += amount;
        totalCost += (price * amount);
      } else if (tx.type === 'SELL') {
        if (currentAmount > 0) {
          const avgCost = totalCost / currentAmount;
          realizedPnL += (price - avgCost) * amount;
          totalCost -= (avgCost * amount);
          currentAmount -= amount;
        }
      }
    });

    currentAmount = Math.max(0, currentAmount);
    const avgPrice = currentAmount > 0 ? totalCost / currentAmount : 0;
    return { currentAmount, avgPrice, realizedPnL, totalCost };
  };

  const getDCAProjection = (asset) => {
    if (!calcPrice || !calcInput) return null;
    const { currentAmount, avgPrice, totalCost } = calculatePosition(asset.transactions);
    const inputVal = parseFloat(calcInput);
    const priceVal = parseFloat(calcPrice);
    
    if (calcMode === 'risk_free') {
      if (priceVal <= 0) return null;
      const amountToSell = totalCost / priceVal;
      const isProfitable = priceVal > avgPrice;
      return { type: 'risk_free', amountToSell, remainingAmount: currentAmount - amountToSell, isProfitable };
    }

    let buyAmount = 0;
    let buyCost = 0;
    if (calcMode === 'amount') {
      buyCost = inputVal;
      buyAmount = inputVal / priceVal;
    } else {
      buyAmount = inputVal;
      buyCost = inputVal * priceVal;
    }
    const totalAmount = currentAmount + buyAmount;
    const newTotalCost = (currentAmount * avgPrice) + buyCost;
    const newAvg = newTotalCost / totalAmount;

    return {
      type: 'dca', newAvg, buyAmount, buyCost,
      drop: avgPrice > 0 ? ((avgPrice - newAvg) / avgPrice) * 100 : 0
    };
  };

  // --- AI Advisor Logic ---
  const getAiAdvice = (asset) => {
     const { roi, avgPrice } = asset;
     if(avgPrice === 0) return { text: "建仓观察期，寻找低点。", color: "text-gray-500" };
     if(roi === 0) return { text: "数据不足，无法分析。", color: "text-gray-500" };
     
     if(roi < 0.3) return { text: "深套！建议装死或极小额定投，切勿重仓抄底。", color: "text-red-600" };
     if(roi < 0.6) return { text: "亏损较大。若基本面未变，可考虑倍投摊平。", color: "text-orange-600" };
     if(roi < 0.9) return { text: "轻微浮亏。震荡区间，适合网格交易。", color: "text-yellow-600" };
     if(roi < 1.1) return { text: "成本线附近。多看少动，等待方向。", color: "text-blue-600" };
     if(roi < 1.5) return { text: "盈利状态。持有为主，跌破均价止损。", color: "text-green-600" };
     if(roi < 3.0) return { text: "大幅盈利！建议分批止盈，保留底仓。", color: "text-purple-600" };
     return { text: "To the Moon! 获利丰厚，注意回调风险。", color: "text-purple-500" };
  }

  const handleGlobalBackup = () => {
    const data = { version: 'v33_cloud', timestamp: new Date().toISOString(), assets: assets };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixel_trader_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleGlobalRestore = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.assets) {
          if (confirm(`Restore ${data.assets.length} assets?`)) {
            setAssets(data.assets);
            alert("Restored successfully!");
          }
        }
      } catch (err) { alert('Error parsing file'); }
    };
    reader.readAsText(file);
  };

  const selectCoin = (coin) => { setSelectedCoin(coin); setNewCoinSearch(''); setAddError(''); };
  const confirmAddCoin = () => {
    if (!selectedCoin) return;
    if (assets.find(a => a.symbol === selectedCoin.symbol)) { setAddError(`Asset Exists!`); return; }
    const newAsset = { id: Date.now(), symbol: selectedCoin.symbol.toUpperCase(), cgId: selectedCoin.id, transactions: [] };
    setAssets([...assets, newAsset]); setIsAddingNewCoin(false); setNewCoinSearch(''); setSelectedCoin(null); setActiveHistoryId(newAsset.id);
  };
  
  const handleAddTx = () => {
    if (!txForm.price || !txForm.amount) return;
    const newTx = { 
      id: Date.now().toString(), 
      type: txForm.type, 
      price: parseFloat(txForm.price), 
      amount: parseFloat(txForm.amount), 
      date: txForm.date,
      strategy: txForm.strategy || 'DCA'
    };
    setAssets(assets.map(a => a.id === activeHistoryId ? { ...a, transactions: [...a.transactions, newTx] } : a));
    setTxForm({ ...txForm, price: '', amount: '' }); 
  };
  
  // OCR Simulation Logic REPLACED with Real Tesseract.js
  const handleOcrClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      setIsOcrScanning(true);
      try {
        // --- 1. DYNAMICALLY LOAD TESSERACT IF NEEDED ---
        // This ensures the code works in environments where npm install isn't possible
        if (!window.Tesseract) {
           await new Promise((resolve, reject) => {
             const script = document.createElement('script');
             script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
             script.onload = resolve;
             script.onerror = reject;
             document.head.appendChild(script);
           });
        }
        
        // --- 2. PERFORM OCR ---
        // Load both Simplified Chinese (for "卖出"/"数量") and English (for numbers)
        const worker = await window.Tesseract.createWorker('chi_sim+eng'); 
        const ret = await worker.recognize(file);
        const text = ret.data.text;
        await worker.terminate();
        
        console.log("OCR Result:", text); // Debugging

        // --- 3. INTELLIGENT PARSING ---
        let type = 'BUY';
        if (text.includes('卖出') || text.includes('Sell') || text.includes('Short')) type = 'SELL';
        
        // Regex strategy for receipt formats like: "数量 94.7 / 94.7" or "价格 0.3944"
        // Matches "Keyword" followed by non-digits, then a number (integer or float)
        const amountMatch = text.match(/数量[^\d]*([\d.]+)/); 
        const priceMatch = text.match(/价格[^\d]*([\d.]+)/) || text.match(/成交均价[^\d]*([\d.]+)/);
        
        // Date detection (YYYY-MM-DD)
        const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
        
        setTxForm(prev => ({
            ...prev,
            type,
            amount: amountMatch ? amountMatch[1] : prev.amount,
            price: priceMatch ? priceMatch[1] : prev.price,
            date: dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0]
        }));

      } catch (err) {
        console.error("OCR Error", err);
        alert("OCR Failed. Please try again or enter manually.");
      } finally {
        setIsOcrScanning(false);
        if(fileInputRef.current) fileInputRef.current.value = '';
      }
  };
  
  const handleDeleteAsset = (id) => { if (deleteConfirmId === id) { setAssets(assets.filter(a => a.id !== id)); setDeleteConfirmId(null); setActiveHistoryId(null); } else { setDeleteConfirmId(id); setTimeout(() => setDeleteConfirmId(null), 3000); } };
  const handleDeleteTx = (assetId, txId) => { if (deleteTxConfirmId === txId) { setAssets(assets.map(a => a.id === assetId ? { ...a, transactions: a.transactions.filter(t => t.id !== txId) } : a)); setDeleteTxConfirmId(null); } else { setDeleteTxConfirmId(txId); setTimeout(() => setDeleteTxConfirmId(null), 3000); } };
  
  const handleExport = (format) => {
    const asset = assets.find(a => a.id === activeHistoryId);
    if (!asset) return;
    const data = asset.transactions.sort((a, b) => new Date(a.date) - new Date(b.date)).map(tx => ({
      date: tx.date, type: tx.type === 'BUY' ? '买' : '卖', price: tx.price, amount: tx.amount
    }));
    let content = format === 'json' ? JSON.stringify(data, null, 2) : 
      `| 日期 | 类型 | 价格 | 数量 |\n|---|---|---|---|\n` + data.map(row => `| ${row.date} | ${row.type} | ${row.price} | ${row.amount} |`).join('\n');
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${asset.symbol}.${format}`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const parseImportText = (text) => {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const parsed = [];
    try {
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
             json.forEach(item => {
                 if (item.date && item.price && item.amount) {
                     parsed.push({
                         id: Math.random().toString(),
                         date: item.date,
                         type: ['卖','SELL','sell'].includes(item.type) ? 'SELL' : 'BUY',
                         price: parseFloat(item.price),
                         amount: parseFloat(item.amount),
                         strategy: 'DCA'
                     });
                 }
             });
             return parsed;
        }
    } catch(e) {}
    lines.forEach(line => {
       if (line.toLowerCase().includes('date') && line.toLowerCase().includes('price')) return;
       const cols = line.split(/[,\t;]+/).map(s => s.trim());
       if (cols.length >= 4) {
           let type = 'BUY';
           const rawType = cols[1].toLowerCase();
           if (rawType.includes('sell') || rawType.includes('卖')) type = 'SELL';
           const cleanNum = (str) => parseFloat(str.replace(/[^\d.-]/g, ''));
           const price = cleanNum(cols[2]);
           const amount = cleanNum(cols[3]);
           if (!isNaN(price) && !isNaN(amount)) {
               parsed.push({
                   id: Math.random().toString(),
                   date: cols[0],
                   type,
                   price,
                   amount,
                   strategy: 'DCA'
               });
           }
       }
    });
    return parsed;
  };

  const handlePreview = () => {
    if (!importText) return;
    const result = parseImportText(importText);
    setImportPreview(result);
  };

  const handleConfirmImport = () => {
    if (importPreview && importPreview.length > 0) {
      setAssets(assets.map(a => a.id === activeHistoryId ? { ...a, transactions: [...a.transactions, ...importPreview] } : a));
      setIsImporting(false); 
      setImportText('');
      setImportPreview(null);
    }
  };

  const filteredCoins = useMemo(() => {
    if (!newCoinSearch || newCoinSearch.length < 2) return [];
    const search = newCoinSearch.toLowerCase();
    return coinDb.filter(c => c.symbol.toLowerCase().includes(search) || c.name.toLowerCase().includes(search))
      .sort((a, b) => 0).slice(0, 50);
  }, [newCoinSearch, coinDb]);

  const assetCalculations = useMemo(() => {
    return assets.map(asset => {
      const { currentAmount, avgPrice, realizedPnL } = calculatePosition(asset.transactions);
      const currentPrice = prices[asset.symbol] || 0;
      const marketValue = currentAmount * currentPrice;
      const unrealizedPnL = marketValue - (currentAmount * avgPrice);
      const roi = avgPrice > 0 ? (currentPrice / avgPrice) : 0;
      return { 
        ...asset, 
        currentAmount, 
        avgPrice, 
        realizedPnL, 
        currentPrice, 
        marketValue, 
        unrealizedPnL,
        roi 
      };
    });
  }, [assets, prices]);

  const totalStats = assetCalculations.reduce((acc, asset) => ({
    totalValue: acc.totalValue + asset.marketValue,
    totalRealized: acc.totalRealized + asset.realizedPnL,
    totalUnrealized: acc.totalUnrealized + asset.unrealizedPnL
  }), { totalValue: 0, totalRealized: 0, totalUnrealized: 0 });

  const simulatedStats = useMemo(() => {
    if (stressPercent === 0) return totalStats;
    const factor = 1 + (stressPercent / 100);
    const simulatedValue = assetCalculations.reduce((acc, asset) => {
       const isStable = ['USDT', 'USDC', 'DAI'].includes(asset.symbol);
       const assetFactor = isStable ? 1 : factor; 
       return acc + (asset.marketValue * assetFactor);
    }, 0);
    
    return {
       ...totalStats,
       projectedValue: simulatedValue,
       diff: simulatedValue - totalStats.totalValue
    };
  }, [totalStats, stressPercent, assetCalculations]);

  const sortedAssets = useMemo(() => {
    const list = [...assetCalculations];
    if (sortMode === 'value') return list.sort((a, b) => b.marketValue - a.marketValue);
    if (sortMode === 'pnl') return list.sort((a, b) => b.unrealizedPnL - a.unrealizedPnL);
    if (sortMode === 'name') return list.sort((a, b) => a.symbol.localeCompare(b.symbol));
    // Rank by ROI
    if (sortMode === 'rank') return list.sort((a, b) => a.roi - b.roi); 
    return list;
  }, [assetCalculations, sortMode]);

  const getAssetColor = (symbol, index) => {
    if (COIN_COLORS[symbol]) return COIN_COLORS[symbol];
    return DEFAULT_PALETTE[index % DEFAULT_PALETTE.length];
  };

  const MaskedValue = ({ value, prefix = '$', className = '' }) => {
    if (isPrivacyMode) return <span className={`text-gray-400 font-mono tracking-widest select-none ${className}`}>****</span>;
    return <span className={className}>{prefix}{value}</span>;
  };

  return (
    <div className={`min-h-screen p-4 font-mono flex justify-center items-start transition-colors duration-300 ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
      <PixelStyles isDarkMode={isDarkMode} />
      
      {/* --- PRICE PANEL OVERLAY --- */}
      {showPricePanel && <PricePanel isDarkMode={isDarkMode} onClose={() => setShowPricePanel(false)} />}
      
      {/* --- NEW FILE B OVERLAY (Updated) --- */}
      {showFileB && (
        <div className={`fixed inset-0 z-[200] flex flex-col ${isDarkMode ? 'bg-slate-900 text-gray-100' : 'bg-gray-100 text-gray-900'} animate-in slide-in-from-bottom-10`}>
          {/* 【修改点 3】 悬浮关闭按钮，不遮挡 FileB 自己的 Header */}
          <div className="absolute top-4 right-4 z-[300]">
            <button 
              onClick={() => setShowFileB(false)} 
              className={`pixel-btn w-8 h-8 flex items-center justify-center shadow-lg ${isDarkMode ? 'bg-red-900/80 border-red-500 text-white' : 'bg-red-100 border-red-500 text-red-900'}`}
              title="Close FileB"
            >
               <X size={18}/>
            </button>
          </div>

          {/* Main Content Area - Full Screen for FileB */}
          <div className="flex-1 w-full h-full overflow-hidden relative">
             {/* 【修改点 2】 渲染实际组件 */}
             <FileB />
          </div>
        </div>
      )}
      
      <div className="w-full max-w-2xl space-y-6 pb-20">
        
        {/* === Header === */}
        <div className="flex flex-col gap-4">
          <div className={`flex justify-between items-center border-b-4 pb-2 ${isDarkMode ? 'border-gray-100' : 'border-gray-900'}`}>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">Pixel Trader</h1>
              <div className="flex items-center gap-2">
                <a href="https://x.com/0xkillcoin" target="_blank" rel="noopener noreferrer"
                  className={`text-[10px] px-2 py-0.5 font-bold inline-flex items-center gap-1 hover:opacity-80 ${isDarkMode ? 'bg-gray-100 text-gray-900' : 'bg-black text-white'}`}>
                  @0xKillCoin <ExternalLink size={8} />
                </a>
                <button 
                  onClick={toggleTheme} 
                  className={`text-[10px] px-2 py-0.5 font-bold inline-flex items-center gap-1 border border-transparent hover:border-current rounded-sm ${isDarkMode ? 'text-yellow-300' : 'text-gray-500'}`}
                >
                  {isDarkMode ? <Sun size={12}/> : <Moon size={12}/>}
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
               <div className="flex items-center gap-1 text-xs font-bold">
                  {status === 'connected' ? <Wifi size={14}/> : <WifiOff size={14}/>}
                  <span className={status === 'connected' ? 'text-green-600' : 'text-red-500'}>
                    {status === 'connected' ? 'ON' : 'OFF'}
                  </span>
               </div>
               
               <button onClick={() => setIsWarRoomOpen(true)} className="pixel-btn w-8 h-8 flex items-center justify-center shadow-none hover:opacity-80" title="War Room">
                 <Briefcase size={18} />
               </button>

               <button onClick={() => setIsPrivacyMode(!isPrivacyMode)} className="pixel-btn w-8 h-8 flex items-center justify-center shadow-none hover:opacity-80" title={isPrivacyMode ? "Show Values" : "Hide Values (Privacy Mode)"}>
                 {isPrivacyMode ? <EyeOff size={18} /> : <Eye size={18} />}
               </button>

               <button onClick={() => setIsSettingsOpen(true)} className={`pixel-btn w-8 h-8 flex items-center justify-center shadow-none hover:opacity-80 ${firebaseStatus==='connected' ? (isDarkMode ? '!border-green-400 !text-green-400' : 'bg-green-100 border-green-500') : ''}`}>
                 <Settings size={18} className={firebaseStatus==='connected'?'text-green-700 dark:text-green-400':''}/>
               </button>
            </div>
          </div>
          
          <div className={`flex items-center justify-between border-2 p-2 ${isDarkMode ? 'bg-gray-800 border-gray-100' : 'bg-white border-gray-900'}`}>
            <div className="flex gap-2">
               <button onClick={() => setSource('binance')} className={`pixel-btn px-2 py-1 text-[10px] ${source === 'binance' ? 'primary' : ''}`}>[A] BINANCE</button>
               <button onClick={() => setSource('coingecko')} className={`pixel-btn px-2 py-1 text-[10px] ${source === 'coingecko' ? 'primary' : ''}`}>[B] GECKO</button>
               <button onClick={() => setSource('cryptocompare')} className={`pixel-btn px-2 py-1 text-[10px] ${source === 'cryptocompare' ? 'primary' : ''}`}>[C] CRYPTO</button>
            </div>
            {(source === 'coingecko' || source === 'cryptocompare') && <button onClick={source === 'coingecko' ? fetchCoinGecko : fetchCryptoCompare}><RefreshCw size={14}/></button>}
          </div>
        </div>

        {/* === Stress Test / Total Stats === */}
        <div className="pixel-box p-4 transition-all duration-300">
          <div className="flex justify-between items-start mb-2">
             <div className="opacity-50 text-xs font-bold">TOTAL EQUITY</div>
             
             {/* STRESS TEST & PRICE PANEL BUTTONS */}
             <div className="flex gap-2">
               <button 
                  onClick={() => { setShowStressTest(!showStressTest); setStressPercent(0); }} 
                  className={`pixel-btn px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 ${showStressTest ? 'primary' : 'opacity-50'}`}
               >
                  <Activity size={12}/> STRESS TEST
               </button>
               <button 
                  onClick={() => setShowPricePanel(true)} 
                  className={`pixel-btn px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 opacity-50 hover:opacity-100`}
               >
                  <BarChart3 size={12}/> PRICE BOARD
               </button>
             </div>
          </div>

          <div className="flex items-baseline gap-2 mb-4">
             <div className="text-4xl font-black">
                <MaskedValue value={showStressTest && stressPercent !== 0 ? simulatedStats.projectedValue.toLocaleString(undefined, { maximumFractionDigits: 0 }) : totalStats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} />
             </div>
             {showStressTest && stressPercent !== 0 && (
                <div className={`text-sm font-bold ${simulatedStats.diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                   ({simulatedStats.diff > 0 ? '+' : ''}<MaskedValue value={simulatedStats.diff.toLocaleString(undefined, { maximumFractionDigits: 0 })} prefix="$" />)
                </div>
             )}
          </div>
          
          {showStressTest && (
             <div className={`mb-4 border-2 p-4 animate-in slide-in-from-top-2 rounded-md flex flex-col items-center text-center ${isDarkMode ? 'bg-gray-800 border-gray-500' : 'bg-gray-50 border-black'}`}>
                <div className="text-xs font-bold mb-2 flex flex-col items-center">
                   <span className="opacity-50 mb-1">SCENARIO SIMULATION</span>
                   <span className={`text-xl ${stressPercent > 0 ? 'text-green-600' : (stressPercent < 0 ? 'text-red-600' : '')}`}>
                     {stressPercent > 0 ? '+' : ''}{stressPercent}%
                   </span>
                </div>
                
                <input 
                  type="range" 
                  min="-80" 
                  max="80" 
                  step="5"
                  value={stressPercent} 
                  onChange={(e) => setStressPercent(parseInt(e.target.value))} 
                  className="w-full mb-4 max-w-xs"
                />
                
                <div className="flex justify-center gap-2 w-full">
                   <button onClick={() => setStressPercent(-50)} className="pixel-btn px-3 py-1 text-[10px] hover:text-red-600 border-red-200 dark:border-red-900"><TrendingDown size={12} className="mr-1"/> CRASH -50%</button>
                   <button onClick={() => setStressPercent(0)} className="pixel-btn px-3 py-1 text-[10px] opacity-70">RESET 0%</button>
                   <button onClick={() => setStressPercent(50)} className="pixel-btn px-3 py-1 text-[10px] hover:text-green-600 border-green-200 dark:border-green-900"><TrendingUp size={12} className="mr-1"/> MOON +50%</button>
                </div>
             </div>
          )}

          <div className="mb-2">
            <div className="flex justify-between items-end mb-1">
               <div className="text-[10px] font-bold opacity-50">ALLOCATION</div>
               {(() => {
                  const stableValue = sortedAssets.filter(a => ['USDT','USDC','DAI'].includes(a.symbol)).reduce((acc,a)=>acc+a.marketValue,0);
                  const stablePct = totalStats.totalValue > 0 ? (stableValue / totalStats.totalValue) * 100 : 0;
                  if (totalStats.totalValue > 0 && stablePct < 10) {
                     return <div className="text-[10px] font-bold text-red-600 flex items-center gap-1 animate-pulse"><ShieldAlert size={10}/> LOW AMMO ({stablePct.toFixed(0)}%)</div>
                  }
               })()}
            </div>
            <div className={`flex w-full h-6 border-4 ${isDarkMode ? 'border-gray-500 bg-gray-800' : 'border-black bg-gray-100'} mb-2`}>
              {sortedAssets.filter(a => a.marketValue > 0).map((asset, idx) => {
                const percent = (asset.marketValue / totalStats.totalValue) * 100;
                if (percent < 1) return null;
                const bg = getAssetColor(asset.symbol, idx);
                return (
                  <div key={asset.id} className="alloc-segment relative group" style={{ width: `${percent}%`, backgroundColor: bg }}></div>
                );
              })}
            </div>

            <div className="flex gap-4 text-xs font-bold opacity-70 overflow-hidden h-5 items-center">
               <div className={`px-1 text-[6px] ${isDarkMode ? 'bg-gray-100 text-black' : 'bg-black text-white'}`}>KK</div>
               {sortedAssets.filter(a => a.marketValue > 0).slice(0, 4).map((asset, idx) => {
                  const percent = (asset.marketValue / totalStats.totalValue) * 100;
                  const color = getAssetColor(asset.symbol, idx);
                  return (
                    <div key={asset.id} className="flex items-center gap-1 whitespace-nowrap">
                       <div className="w-2 h-2" style={{backgroundColor: color}}></div>
                       <span>{Math.round(percent)}% {asset.symbol}</span>
                    </div>
                  )
               })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t-2 border-dashed border-gray-300 dark:border-gray-700 pt-4">
            <div>
              <div className="text-xs opacity-50 font-bold mb-1">UNREALIZED (浮盈)</div>
              <div className={`text-xl font-bold ${totalStats.totalUnrealized >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalStats.totalUnrealized >= 0 ? '+' : ''}{totalStats.totalUnrealized < 0 ? '-' : ''}<MaskedValue value={Math.abs(totalStats.totalUnrealized).toLocaleString(undefined, { maximumFractionDigits: 0 })} prefix="$" />
              </div>
            </div>
            <div>
              <div className="text-xs opacity-50 font-bold mb-1">REALIZED (已落袋)</div>
              <div className={`text-xl font-bold ${totalStats.totalRealized >= 0 ? '' : 'text-red-600'}`}>
                {totalStats.totalRealized >= 0 ? '+' : ''}{totalStats.totalRealized < 0 ? '-' : ''}<MaskedValue value={Math.abs(totalStats.totalRealized).toLocaleString(undefined, { maximumFractionDigits: 0 })} prefix="$" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar: Add & Sort */}
        <div className="flex justify-between items-center mb-4">
           {/* New Left-aligned ADD Button */}
           <div className="flex gap-2">
              <button onClick={() => setIsAddingNewCoin(true)} className={`pixel-btn px-3 py-1 text-[10px] font-bold ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <Plus size={12} className="mr-1"/> ADD
              </button>
              
              {/* NEW FILE B BUTTON */}
              <button onClick={() => setShowFileB(true)} className={`pixel-btn px-3 py-1 text-[10px] font-bold ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                <Layout size={12} className="mr-1"/> FileB
              </button>
           </div>

           <div className="flex gap-2">
              <button onClick={() => setSortMode('value')} className={`text-[10px] font-bold px-2 py-1 rounded border-2 border-transparent ${sortMode==='value' ? 'bg-black text-white border-black dark:bg-gray-100 dark:text-black' : 'opacity-50 hover:opacity-100'}`}>VALUE</button>
              <button onClick={() => setSortMode('pnl')} className={`text-[10px] font-bold px-2 py-1 rounded border-2 border-transparent ${sortMode==='pnl' ? 'bg-black text-white border-black dark:bg-gray-100 dark:text-black' : 'opacity-50 hover:opacity-100'}`}>PNL</button>
              <button onClick={() => setSortMode('rank')} className={`text-[10px] font-bold px-2 py-1 rounded border-2 border-transparent ${sortMode==='rank' ? 'bg-black text-white border-black dark:bg-gray-100 dark:text-black' : 'opacity-50 hover:opacity-100'}`}>RANK</button>
              <button onClick={() => setSortMode('name')} className={`text-[10px] font-bold px-2 py-1 rounded border-2 border-transparent ${sortMode==='name' ? 'bg-black text-white border-black dark:bg-gray-100 dark:text-black' : 'opacity-50 hover:opacity-100'}`}>NAME</button>
           </div>
        </div>

        {/* === Asset List === */}
        <div className="space-y-4">
          {sortedAssets.map(asset => {
            const unrealizedPercent = (asset.currentAmount * asset.avgPrice) > 0 ? (asset.unrealizedPnL / (asset.currentAmount * asset.avgPrice)) * 100 : 0;
            const isCalcOpen = activeCalcId === asset.id;
            const dca = isCalcOpen ? getDCAProjection(asset) : null;
            
            const allocationPct = totalStats.totalValue > 0 ? (asset.marketValue / totalStats.totalValue) * 100 : 0;
            const isWhale = allocationPct > 20;
            const isMooning = asset.roi >= 2;
            const isRekt = asset.roi > 0 && asset.roi < 0.5;

            // AI Advice for this asset
            const aiAdvice = getAiAdvice(asset);
            
            // New Detailed Stats Row Logic
            const symbolKey = asset.symbol.endsWith('USDT') ? asset.symbol : asset.symbol + 'USDT';
            const stats = binanceData.get(symbolKey) || {};
            const renderStatVal = (val) => val ? (val > 0 ? '+' + val.toFixed(1) : val.toFixed(1)) + '%' : '-';
            const getStatColor = (val) => val > 0 ? 'text-green-500' : (val < 0 ? 'text-red-500' : 'text-gray-500');

            return (
              <div key={asset.id} className="pixel-box p-0">
                <div className="p-4 relative">
                  <div className="absolute top-4 right-4 flex gap-1">
                     {isWhale && <span className={`text-[10px] px-1 font-bold border flex items-center gap-1 ${isDarkMode ? 'bg-gray-100 text-black border-white' : 'bg-black text-white border-black'}`}><Anchor size={8}/> {allocationPct.toFixed(0)}%</span>}
                     {isMooning && <span className="text-[10px] bg-green-100 text-green-700 px-1 font-bold border border-green-700 flex items-center gap-1"><Trophy size={8}/> {asset.roi.toFixed(1)}x</span>}
                     {isRekt && <span className="text-[10px] bg-red-100 text-red-700 px-1 font-bold border border-red-700 flex items-center gap-1"><AlertTriangle size={8}/> REKT</span>}
                  </div>

                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 flex items-center justify-center font-bold text-lg border-2 text-white ${isDarkMode ? 'border-gray-100' : 'border-black'}`} style={{backgroundColor: COIN_COLORS[asset.symbol] || '#000'}}>{asset.symbol[0]}</div>
                      <div>
                        <div className="font-black text-xl flex items-center gap-2">
                          {asset.symbol}
                        </div>
                        {/* Smart Precision & Operation Count */}
                        <div className="text-xs opacity-50 font-bold mt-1 flex items-center gap-2 flex-wrap">
                           <span><MaskedValue value={smartFmt(asset.currentPrice)} /></span>
                           <span className="opacity-50">|</span>
                           <span>Avg: <MaskedValue value={smartFmt(asset.avgPrice)} /></span>
                           <span className="opacity-50">|</span>
                           <span className="flex items-center gap-1"><Hash size={10}/>{asset.transactions.length} 次</span>
                        </div>
                        {/* NEW: Timeframe Percentage Row */}
                        <div className="flex flex-wrap gap-3 text-[10px] font-bold mt-2">
                           <span className={getStatColor(stats.changePercent1h)}>H {renderStatVal(stats.changePercent1h)}</span>
                           <span className={getStatColor(stats.changePercent4h)}>4H {renderStatVal(stats.changePercent4h)}</span>
                           <span className={getStatColor(stats.changePercent24h)}>D {renderStatVal(stats.changePercent24h)}</span>
                           <span className={getStatColor(stats.changePercent7d)}>W {renderStatVal(stats.changePercent7d)}</span>
                           <span className={getStatColor(stats.changePercent30d)}>M {renderStatVal(stats.changePercent30d)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`flex justify-between items-end border-t-2 border-dashed pt-3 mb-3 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                     <div>
                       <div className="text-[10px] font-bold opacity-50">HOLDINGS</div>
                       <div className="font-bold text-sm"><MaskedValue value={smartFmt(asset.currentAmount, 'amt')} prefix="" /></div>
                     </div>
                     <div className="text-right">
                       <div className="font-bold text-lg"><MaskedValue value={asset.marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} prefix="$" /></div>
                       <div className={`text-sm font-bold ${asset.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                         {asset.unrealizedPnL >= 0 ? '+' : ''}{asset.unrealizedPnL < 0 ? '-' : ''}{Math.abs(unrealizedPercent).toFixed(2)}%
                       </div>
                     </div>
                  </div>

                  <div className="flex gap-2">
                     <button onClick={() => setActiveHistoryId(asset.id)} className="flex-1 pixel-btn py-2 text-xs hover:opacity-80"><History size={14} /> 交易记录</button>
                     <button onClick={() => { if (activeCalcId === asset.id) { setActiveCalcId(null); } else { setActiveCalcId(asset.id); setCalcPrice(asset.currentPrice || asset.avgPrice); setCalcInput(''); setCalcMode('amount'); } }} className={`flex-1 pixel-btn py-2 text-xs ${isCalcOpen ? 'primary' : 'hover:opacity-80'}`}><Zap size={14} /> {isCalcOpen ? '关闭推演' : '补仓推演'}</button>
                  </div>
                </div>

                {isCalcOpen && (
                  <div className={`border-t-4 p-4 animate-in slide-in-from-top-2 ${isDarkMode ? 'bg-gray-800 border-gray-100' : 'bg-gray-50 border-black'}`}>
                    <div className="flex justify-between items-center mb-4">
                      <div className="text-xs font-bold flex items-center gap-1"><Calculator size={14} /> SIMULATOR</div>
                      <div className={`flex border-2 ${isDarkMode ? 'border-gray-500 bg-gray-900' : 'border-black bg-white'}`}>
                        <button onClick={() => setCalcMode('amount')} className={`px-2 py-1 text-[10px] font-bold ${calcMode === 'amount' ? (isDarkMode ? 'bg-gray-100 text-black' : 'bg-black text-white') : 'opacity-50'}`}>按金额</button>
                        <button onClick={() => setCalcMode('quantity')} className={`px-2 py-1 text-[10px] font-bold ${calcMode === 'quantity' ? (isDarkMode ? 'bg-gray-100 text-black' : 'bg-black text-white') : 'opacity-50'}`}>按数量</button>
                        <button onClick={() => setCalcMode('risk_free')} className={`px-2 py-1 text-[10px] font-bold ${calcMode === 'risk_free' ? (isDarkMode ? 'bg-gray-100 text-black' : 'bg-black text-white') : 'text-green-600'}`}>出本</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div><label className="text-[10px] font-bold opacity-50 block mb-1">价格 ($)</label><input type="number" className="pixel-input" value={calcPrice} onChange={e => setCalcPrice(e.target.value)} /></div>
                      <div>
                        <label className="text-[10px] font-bold opacity-50 block mb-1">{calcMode === 'risk_free' ? '目标' : (calcMode === 'amount' ? '投入 (U)' : '数量')}</label>
                        {calcMode === 'risk_free' ? (
                          <div className={`pixel-input text-xs flex justify-center items-center opacity-50 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>收回本金</div>
                        ) : (
                          <input type="number" className="pixel-input" value={calcInput} onChange={e => setCalcInput(e.target.value)} placeholder="500" />
                        )}
                      </div>
                    </div>
                    {dca && (
                       <div className={`border-2 p-3 ${isDarkMode ? 'bg-gray-900 border-gray-500' : 'bg-white border-black'}`}>
                          {dca.type === 'risk_free' ? (
                             <div className="text-center">
                                <div className="text-xs opacity-50 font-bold mb-1">回本需卖出</div>
                                <div className={`text-xl font-black ${dca.isProfitable ? 'text-green-600' : 'text-red-600'}`}>{dca.isProfitable ? dca.amountToSell.toFixed(4) : '无法出本'}</div>
                             </div>
                          ) : (
                             <>
                                <div className="flex justify-between items-end mb-2">
                                   <div className="text-xs opacity-50 font-bold">补仓后均价</div>
                                   <div className={`text-xl font-black px-2 ${isDarkMode ? 'bg-gray-100 text-black' : 'bg-black text-white'}`}>${smartFmt(dca.newAvg)}</div>
                                </div>
                                <div className={`flex justify-between text-xs opacity-50 border-t pt-2 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                   <span>获得: {smartFmt(dca.buyAmount, 'amt')}</span>
                                   <span className="text-green-600 font-bold">降幅: {dca.drop.toFixed(2)}%</span>
                                </div>
                             </>
                          )}
                       </div>
                    )}
                    
                    {/* NEW: AI Advisor */}
                    <div className={`mt-3 p-2 border-2 border-dashed flex items-start gap-2 ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                       <Bot size={16} className={`mt-0.5 ${isDarkMode ? 'text-gray-400' : 'text-black'}`} />
                       <div>
                          <div className="text-[10px] font-bold opacity-50">AI ADVISOR</div>
                          <div className={`text-xs font-bold ${aiAdvice.color}`}>{aiAdvice.text}</div>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* === Modals === */}

        {/* War Room Modal */}
        {isWarRoomOpen && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="pixel-box w-full max-w-lg h-[600px] flex flex-col relative animate-in zoom-in-95 duration-200">
               <div className={`p-3 flex justify-between items-center border-b-4 ${isDarkMode ? 'bg-gray-100 text-black border-white' : 'bg-black text-white border-black'}`}>
                 <div className="flex items-center gap-2">
                   <Briefcase size={20}/>
                   <span className="font-black text-xl tracking-tight">WAR ROOM</span>
                 </div>
                 <button onClick={() => setIsWarRoomOpen(false)} className="hover:opacity-70"><X size={24}/></button>
               </div>
               
               <div className={`flex overflow-x-auto border-b-2 no-scrollbar p-1 gap-1 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                  <div onClick={()=>setWarRoomTab('position')} className={`wr-tab ${warRoomTab==='position'?'active':''}`}>仓位</div>
                  <div onClick={()=>setWarRoomTab('kelly')} className={`wr-tab ${warRoomTab==='kelly'?'active':''}`}>凯利</div>
                  <div onClick={()=>setWarRoomTab('drawdown')} className={`wr-tab ${warRoomTab==='drawdown'?'active':''}`}>回本</div>
                  <div onClick={()=>setWarRoomTab('avgdown')} className={`wr-tab ${warRoomTab==='avgdown'?'active':''}`}>平均</div>
                  <div onClick={()=>setWarRoomTab('compound')} className={`wr-tab ${warRoomTab==='compound'?'active':''}`}>复利</div>
                  <div onClick={()=>setWarRoomTab('ruin')} className={`wr-tab ${warRoomTab==='ruin'?'active':''}`}>破产</div>
               </div>

               <div className="p-6 flex-1 overflow-y-auto">
                  {warRoomTab === 'position' && <WarRoomTool_Position />}
                  {warRoomTab === 'kelly' && <WarRoomTool_Kelly />}
                  {warRoomTab === 'drawdown' && <WarRoomTool_Drawdown />}
                  {warRoomTab === 'avgdown' && <WarRoomTool_AvgDown />}
                  {warRoomTab === 'compound' && <WarRoomTool_Compound />}
                  {warRoomTab === 'ruin' && <WarRoomTool_Ruin />}
               </div>
            </div>
          </div>
        )}

        {/* Global Settings / Backup / Cloud Modal */}
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="pixel-box w-full max-w-lg h-[600px] flex flex-col relative">
              <div className={`flex items-center justify-between p-4 border-b-2 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h2 className="text-xl font-black flex items-center gap-2"><Settings size={20}/> SETTINGS</h2>
                <button onClick={() => setIsSettingsOpen(false)} className="pixel-btn px-2 py-1 shadow-none border-0 hover:opacity-50"><X size={20}/></button>
              </div>

              {/* Settings Tabs */}
              <div className={`flex border-b-2 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                <button onClick={() => setSettingsTab('data')} className={`flex-1 py-3 text-xs font-bold ${settingsTab === 'data' ? (isDarkMode ? 'bg-gray-900 border-b-2 border-white -mb-[2px]' : 'bg-white border-b-2 border-black -mb-[2px]') : 'opacity-50'}`}>DATA MANAGER</button>
                <button onClick={() => setSettingsTab('cloud')} className={`flex-1 py-3 text-xs font-bold ${settingsTab === 'cloud' ? (isDarkMode ? 'bg-gray-900 border-b-2 border-white -mb-[2px]' : 'bg-white border-b-2 border-black -mb-[2px]') : 'opacity-50'}`}>CLOUD & SYNC</button>
              </div>
              
              <div className={`p-6 flex-1 overflow-y-auto ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                {settingsTab === 'data' ? (
                   <div className="space-y-4 animate-in slide-in-from-left-2">
                       <div className={`p-4 border-2 rounded ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                           <h3 className="font-bold mb-2 flex items-center gap-2"><Save size={16}/> Local Backup</h3>
                           <p className="text-xs opacity-50 mb-4">Download a .json file of your current portfolio state.</p>
                           <button onClick={handleGlobalBackup} className="pixel-btn w-full flex items-center justify-center gap-2 hover:opacity-80 py-3"><DownloadCloud size={16}/> DOWNLOAD JSON</button>
                       </div>
                       <div className={`p-4 border-2 rounded ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                           <h3 className="font-bold mb-2 flex items-center gap-2"><Upload size={16}/> Restore Data</h3>
                           <p className="text-xs opacity-50 mb-4">Overwrite current state with a backup file.</p>
                           <div className="relative"><button className="pixel-btn w-full flex items-center justify-center gap-2 hover:opacity-80 py-3"><Upload size={16}/> SELECT FILE</button><input type="file" accept=".json" onChange={handleGlobalRestore} className="absolute inset-0 opacity-0 cursor-pointer"/></div>
                       </div>
                   </div>
                ) : (
                   <div className="space-y-6 animate-in slide-in-from-right-2">
                       {/* Firebase Config Section */}
                       <div className={`p-4 border-2 rounded relative overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                           <div className="flex justify-between items-center mb-3">
                               <h3 className="font-bold flex items-center gap-2 text-orange-600"><Database size={16}/> Firebase Sync</h3>
                               <div className={`text-[10px] font-bold px-2 py-0.5 rounded ${firebaseStatus === 'connected' ? 'bg-green-100 text-green-700' : (isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500')}`}>{firebaseStatus.toUpperCase()}</div>
                           </div>
                           <p className="text-[10px] opacity-50 mb-2">Paste your Firebase Config below. Supports raw JS object pasting (no need to format as JSON).</p>
                           <textarea 
                             className="pixel-input h-24 text-[10px] font-mono mb-2 py-2" 
                             placeholder='const firebaseConfig = { apiKey: "..." };'
                             value={firebaseConfigInput}
                             onChange={(e) => setFirebaseConfigInput(e.target.value)}
                           />
                           
                           {firebaseParseError ? (
                               <div className="text-[10px] font-bold text-orange-500 flex items-center gap-1">
                                   <AlertTriangle size={10}/> {firebaseParseError}
                               </div>
                           ) : (
                               firebaseConfigInput && !firebaseParseError && (
                                   <div className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                                       <Check size={10}/> Valid Config (Parsed & Saved)
                                   </div>
                               )
                           )}

                           <div className="text-[10px] opacity-50 mt-1">Status: {firebaseStatus === 'connecting' ? 'Connecting...' : (firebaseStatus === 'connected' ? 'Real-time Sync Active' : 'Offline')}</div>
                       </div>

                       {/* Telegram Config Section */}
                       <div className={`p-4 border-2 rounded ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                           <h3 className="font-bold flex items-center gap-2 text-blue-500 mb-3"><MessageSquare size={16}/> Telegram Bot</h3>
                           
                           <div className="space-y-3 mb-4">
                               <div>
                                   <label className="text-[10px] font-bold opacity-50 flex items-center gap-1"><Key size={10}/> BOT TOKEN</label>
                                   <input className="pixel-input text-xs" placeholder="123456:ABC-DEF..." value={cloudConfig.tgToken} onChange={e=>saveCloudConfig({...cloudConfig, tgToken: e.target.value})}/>
                               </div>
                               <div>
                                   <label className="text-[10px] font-bold opacity-50 flex items-center gap-1"><MessageSquare size={10}/> CHAT ID</label>
                                   <input className="pixel-input text-xs" placeholder="12345678" value={cloudConfig.tgChatId} onChange={e=>saveCloudConfig({...cloudConfig, tgChatId: e.target.value})}/>
                               </div>
                           </div>
                           
                           <div className="flex gap-2">
                               <div className={`flex-1 border p-2 rounded flex flex-col justify-center items-center text-center ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                   <span className="text-[10px] font-bold opacity-50">AUTO BACKUP</span>
                                   <span className={`text-xs font-bold ${tgLastBackup ? 'text-green-600' : 'text-gray-400'}`}>{tgLastBackup ? 'ACTIVE' : 'IDLE'}</span>
                               </div>
                               <button 
                                 onClick={handleTgPull} 
                                 disabled={isPullingTg || !cloudConfig.tgToken}
                                 className="flex-1 pixel-btn text-xs font-bold flex flex-col justify-center gap-1 disabled:opacity-50"
                               >
                                  {isPullingTg ? <Loader2 size={16} className="animate-spin"/> : <Cloud size={16}/>}
                                  <span>PULL FROM TG</span>
                               </button>
                           </div>
                           <p className="text-[10px] opacity-50 mt-2 text-center">
                              Send a JSON message to your bot, then click "Pull" to sync it here.
                           </p>
                       </div>
                   </div>
                )}
              </div>
            </div>
          </div>
        )}

        {isImporting && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="pixel-box w-full max-w-lg p-6 relative animate-in zoom-in-95 duration-200 flex flex-col h-[500px]">
              <button onClick={()=>{setIsImporting(false);setImportPreview(null);setImportText('')}} className="absolute top-4 right-4 pixel-btn px-2 py-1 shadow-none border-0 hover:opacity-50"><X size={20}/></button>
              <h2 className="text-xl font-black mb-2 flex items-center gap-2"><FileSpreadsheet size={24}/> BULK IMPORT</h2>
              
              {!importPreview ? (
                <>
                  <p className="text-xs opacity-50 mb-4">Paste data from Excel, CSV, or JSON. Columns should be: <span className="font-bold">Date, Type, Price, Amount</span>.</p>
                  <textarea className="pixel-input w-full flex-1 font-mono text-xs mb-4 shadow-none focus:shadow-sm py-2 resize-none" placeholder={`Example:\n2024-01-01, BUY, 42000, 0.5\n2024-02-01, SELL, 45000, 0.1\n...`} value={importText} onChange={e=>setImportText(e.target.value)}/>
                  <div className="grid grid-cols-2 gap-3 mt-auto">
                      <button onClick={()=>setIsImporting(false)} className="pixel-btn h-[42px] font-bold text-xs hover:opacity-80">CANCEL</button>
                      <button onClick={handlePreview} disabled={!importText} className={`pixel-btn h-[42px] font-bold text-xs ${!importText ? 'opacity-50 cursor-not-allowed' : 'primary'}`}>NEXT: PREVIEW</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                     <p className="text-xs opacity-50">Found <span className="font-bold">{importPreview.length}</span> valid transactions.</p>
                     <button onClick={()=>setImportPreview(null)} className="text-[10px] font-bold underline">Edit Raw Text</button>
                  </div>
                  
                  <div className={`flex-1 overflow-y-auto border-2 p-2 mb-4 rounded ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                     {importPreview.length === 0 ? (
                         <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                             <AlertTriangle size={24}/>
                             <span className="text-xs">No valid data found. Check format.</span>
                         </div>
                     ) : (
                         <table className="w-full text-[10px] text-left">
                             <thead>
                                 <tr className={`border-b-2 ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                                     <th className="pb-1 pl-1">DATE</th>
                                     <th className="pb-1">TYPE</th>
                                     <th className="pb-1 text-right">PRICE</th>
                                     <th className="pb-1 text-right pr-1">AMOUNT</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 {importPreview.map((row, i) => (
                                     <tr key={i} className={`border-b last:border-0 hover:bg-black/5 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                         <td className="py-2 pl-1 font-mono">{row.date}</td>
                                         <td className="py-2">
                                             <span className={`px-1 rounded font-bold ${row.type==='BUY'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{row.type}</span>
                                         </td>
                                         <td className="py-2 text-right font-mono">${row.price.toLocaleString()}</td>
                                         <td className="py-2 text-right font-mono pr-1">{row.amount}</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-auto">
                      <button onClick={()=>setImportPreview(null)} className="pixel-btn h-[42px] font-bold text-xs hover:opacity-80">BACK</button>
                      <button onClick={handleConfirmImport} disabled={importPreview.length === 0} className={`pixel-btn h-[42px] font-bold text-xs ${importPreview.length === 0 ? 'opacity-50 cursor-not-allowed' : 'primary'}`}>CONFIRM IMPORT</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* The Add New Coin Modal */}
        {isAddingNewCoin && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="pixel-box w-full max-w-md p-6 relative">
              <button onClick={()=>setIsAddingNewCoin(false)} className="absolute top-4 right-4 pixel-btn px-2 py-1 shadow-none border-0 hover:opacity-50"><X size={20}/></button>
              <h2 className="text-xl font-black mb-4 flex items-center gap-2"><Search size={20}/> SELECT TOKEN</h2>
              <div className="relative mb-6">
                <input autoFocus className="pixel-input text-lg uppercase" value={newCoinSearch} onChange={e=>{setNewCoinSearch(e.target.value);setSelectedCoin(null);setAddError('');}}/>
                <div className={`absolute top-full left-0 w-full border-2 border-t-0 max-h-48 overflow-y-auto z-50 shadow-xl ${isDarkMode ? 'bg-gray-800 border-white' : 'bg-white border-black'}`}>
                  {filteredCoins.map(coin=>(
                    <div key={coin.id} onMouseDown={(e)=>{e.preventDefault();selectCoin(coin);}} className={`p-3 cursor-pointer border-b flex justify-between items-center ${isDarkMode ? 'hover:bg-gray-700 border-gray-700' : 'hover:bg-gray-100 border-gray-100'}`}>
                      <span className="font-bold flex items-center gap-2">{coin.symbol}</span>
                      <span className="text-xs opacity-70 truncate max-w-[150px]">{coin.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              {selectedCoin && (
                <div className={`mb-4 p-3 border-2 flex items-center gap-3 ${isDarkMode ? 'bg-gray-800 border-white' : 'bg-gray-100 border-black'}`}>
                  <CheckCircle2 className="text-green-600"/>
                  <div>
                    <div className="font-bold text-sm">SELECTED: {selectedCoin.symbol}</div>
                    <div className="text-xs opacity-50">{selectedCoin.name}</div>
                  </div>
                </div>
              )}
              {addError && <div className="mb-4 p-3 bg-red-50 text-red-600 border-2 border-red-200 text-xs font-bold">{addError}</div>}
              <button disabled={!selectedCoin} onClick={confirmAddCoin} className={`pixel-btn primary w-full py-3 ${!selectedCoin?'opacity-50':''}`}>CONFIRM ADDITION</button>
            </div>
          </div>
        )}
        
        {/* === HISTORY / TRANSACTION MODAL === */}
        {activeHistoryId && !isImporting && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center sm:p-4">
            <div className="pixel-box w-full max-w-lg h-[85vh] sm:h-auto sm:max-h-[85vh] flex flex-col relative animate-in slide-in-from-bottom-10">
              <div className={`p-4 border-b-4 flex justify-between items-center ${isDarkMode ? 'border-gray-100 bg-gray-900' : 'border-gray-900 bg-gray-50'}`}>
                 <div className="flex items-center gap-2"><h2 className="text-xl font-black">{assets.find(a=>a.id===activeHistoryId)?.symbol} HISTORY</h2></div>
                 <div className="flex gap-2 items-center">
                   <button onClick={() => setIsImporting(true)} className="pixel-btn w-9 h-9 flex items-center justify-center shadow-none hover:opacity-80"><FileSpreadsheet size={18} /></button>
                   <button onClick={() => handleExport('json')} className="pixel-btn w-9 h-9 flex items-center justify-center shadow-none hover:opacity-80"><FileJson size={18} /></button>
                   <button onClick={() => handleExport('md')} className="pixel-btn w-9 h-9 flex items-center justify-center shadow-none hover:opacity-80"><FileText size={18} /></button>
                   <div className="w-[1px] h-6 bg-gray-300 mx-1"></div>
                   <button onClick={() => handleDeleteAsset(activeHistoryId)} className={`pixel-btn w-9 h-9 flex items-center justify-center shadow-none transition-all ${deleteConfirmId === activeHistoryId ? '!bg-red-600 !text-white !border-red-600' : 'primary'}`}>{deleteConfirmId === activeHistoryId ? <span className="font-bold text-lg">?</span> : <Trash2 size={18}/>}</button>
                   <button onClick={()=>setActiveHistoryId(null)} className="pixel-btn w-9 h-9 flex items-center justify-center shadow-none hover:opacity-80"><X size={20} /></button>
                 </div>
              </div>
              <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                {assets.find(a=>a.id===activeHistoryId)?.transactions.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(tx => {
                   const tag = STRATEGY_TAGS.find(t => t.id === tx.strategy);
                   return (
                     <div key={tx.id} className={`border-2 p-3 flex justify-between items-center group ${isDarkMode ? 'bg-gray-900 border-gray-600 hover:border-white' : 'bg-white border-gray-300 hover:border-black'}`}>
                        <div className="flex items-center gap-3">
                           <div className={`w-8 h-8 flex items-center justify-center text-white font-bold text-xs border ${isDarkMode ? 'border-gray-400' : 'border-black'} ${tx.type==='BUY'?'bg-green-600':'bg-red-500'}`}>{tx.type==='BUY'?'买':'卖'}</div>
                           <div>
                              <div className="font-bold text-sm flex items-center gap-2">
                                 {tx.type==='BUY'?'买入':'卖出'} <MaskedValue value={smartFmt(tx.amount, 'amt')} prefix="" />
                                 {tag && <span className="text-[10px] px-1 border rounded text-white font-normal" style={{backgroundColor: tag.color, borderColor: tag.color}}>{tag.label}</span>}
                              </div>
                              <div className="text-xs opacity-50">@ <MaskedValue value={smartFmt(tx.price)} /> on {tx.date}</div>
                           </div>
                        </div>
                        <button onClick={() => handleDeleteTx(activeHistoryId, tx.id)} className={`text-xs font-bold px-2 py-1 rounded transition-all flex items-center ${deleteTxConfirmId === tx.id ? 'bg-red-600 text-white' : 'text-gray-300 hover:text-red-500'}`}>{deleteTxConfirmId === tx.id ? '?' : <Trash2 size={14}/>}</button>
                     </div>
                   )
                })}
              </div>
              
              <div className={`p-4 border-t-4 ${isDarkMode ? 'border-gray-100 bg-gray-900' : 'border-gray-900 bg-white'}`}>
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                      <button onClick={()=>setTxForm({...txForm, type:'BUY'})} className={`pixel-btn h-[42px] text-xs font-bold ${txForm.type==='BUY'?'primary':''}`}>BUY (买入)</button>
                      <button onClick={()=>setTxForm({...txForm, type:'SELL'})} className={`pixel-btn h-[42px] text-xs font-bold ${txForm.type==='SELL'?'primary':''}`}>SELL (卖出)</button>
                  </div>
                  <div className="flex gap-3">
                      <input type="number" className="pixel-input h-[42px] text-sm w-1/3" placeholder="Price ($)" value={txForm.price} onChange={e=>setTxForm({...txForm, price:e.target.value})}/>
                      <input type="number" className="pixel-input h-[42px] text-sm w-1/3" placeholder="Amount" value={txForm.amount} onChange={e=>setTxForm({...txForm, amount:e.target.value})}/>
                      
                      {/* === OCR BUTTON === */}
                      <div className="w-1/3 flex gap-2">
                         <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                         <button 
                            onClick={handleOcrClick} 
                            disabled={isOcrScanning}
                            className={`pixel-btn h-[42px] flex-1 flex items-center justify-center font-bold text-xs gap-1 ${isOcrScanning ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
                            title="Upload Receipt (OCR)"
                         >
                            {isOcrScanning ? <Loader2 size={16} className="animate-spin"/> : <Camera size={16}/>}
                            <span>{isOcrScanning ? 'SCAN' : 'OCR'}</span>
                         </button>
                      </div>
                  </div>
                  <div className="flex gap-2">
                     {STRATEGY_TAGS.map(tag => (
                       <button 
                         key={tag.id}
                         onClick={() => setTxForm({...txForm, strategy: tag.id})}
                         className={`flex-1 py-1 text-[10px] font-bold border-2 rounded ${txForm.strategy === tag.id ? 'text-white' : 'opacity-50 border-gray-200'}`}
                         style={txForm.strategy === tag.id ? { backgroundColor: tag.color, borderColor: tag.color } : {}}
                       >
                         {tag.label}
                       </button>
                     ))}
                  </div>
                  <div className="relative h-[42px] w-[80%] mx-auto">
                     <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none"><Calendar size={16}/></div>
                     <input type="date" className="pixel-input h-full w-full text-sm pl-10" value={txForm.date} onChange={e=>setTxForm({...txForm, date:e.target.value})}/>
                  </div>
                  <button onClick={handleAddTx} className="pixel-btn primary h-[42px] w-full text-xs font-bold flex items-center justify-center gap-2"><Save size={14}/> SAVE RECORD</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


