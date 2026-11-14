import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MarketPair, Timeframe, SMCSignal, PerformanceStats } from './types/market';
import { SUPPORTED_PAIRS, formatPrice } from './services/marketPairs';
import { Header } from './components/Header';
import { CandlestickChart } from './components/CandlestickChart';
import { SignalCard } from './components/SignalCard';
import { SignalScanner } from './components/SignalScanner';
import { TradeJournal } from './components/TradeJournal';
import { BacktestDashboard } from './components/BacktestDashboard';
import { signalStore } from './services/signalStore';
import { loadPairMarketState, scanAllMarkets, PairMarketState } from './services/marketData';
import {
  TrendingUp,
  TrendingDown,
  Info,
  Layers,
  ShieldCheck,
  Target,
  Clock,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  SlidersHorizontal,
  Activity,
  Zap,
} from 'lucide-react';

export default function App() {
  const [pairs, setPairs] = useState<MarketPair[]>(SUPPORTED_PAIRS);
  const [selectedPair, setSelectedPair] = useState<MarketPair>(SUPPORTED_PAIRS[0]); // EUR/USD or BTC/USD
  const [activeTab, setActiveTab] = useState<'terminal' | 'backtest' | 'journal' | 'rules'>('terminal');
  const [timeframe, setTimeframe] = useState<Timeframe>(SUPPORTED_PAIRS[0].defaultTimeframes.entry);

  const [pairState, setPairState] = useState<PairMarketState | null>(null);
  const [signals, setSignals] = useState<SMCSignal[]>(signalStore.getSignals());
  const [stats, setStats] = useState<PerformanceStats>(signalStore.getPerformanceStats());
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [scanIntervalSec, setScanIntervalSec] = useState<number>(30);
  const [lastScanTime, setLastScanTime] = useState<number>(Date.now());

  const autoScanTimerRef = useRef<any>(null);

  // Subscribe to signalStore updates
  useEffect(() => {
    const unsubscribe = signalStore.subscribe(() => {
      setSignals(signalStore.getSignals());
      setStats(signalStore.getPerformanceStats());
    });
    return unsubscribe;
  }, []);

  // Sync timeframe when pair changes
  useEffect(() => {
    setTimeframe(selectedPair.defaultTimeframes.entry);
  }, [selectedPair]);

  // Load active pair market data
  const loadActivePairData = useCallback(async (pair: MarketPair) => {
    const state = await loadPairMarketState(pair);
    setPairState(state);

    if (state.currentSignal) {
      setSelectedSignalId(state.currentSignal.id);
    }
  }, []);

  useEffect(() => {
    loadActivePairData(selectedPair);
  }, [selectedPair, loadActivePairData]);

  // Run full multi-asset scan
  const handleTriggerScan = useCallback(async () => {
    setIsScanning(true);
    try {
      await scanAllMarkets(pairs);
      await loadActivePairData(selectedPair);
      setLastScanTime(Date.now());
    } catch (err) {
      console.warn('Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  }, [pairs, selectedPair, loadActivePairData]);

  useEffect(() => {
    handleTriggerScan();
  }, []);

  // Background Auto-Scan Interval Loop
  useEffect(() => {
    if (autoScanTimerRef.current) {
      clearInterval(autoScanTimerRef.current);
      autoScanTimerRef.current = null;
    }

    if (scanIntervalSec > 0) {
      autoScanTimerRef.current = setInterval(() => {
        handleTriggerScan();
      }, scanIntervalSec * 1000);
    }

    return () => {
      if (autoScanTimerRef.current) {
        clearInterval(autoScanTimerRef.current);
      }
    };
  }, [scanIntervalSec, handleTriggerScan]);

  // Handle signal selection
  const handleSelectSignal = (sig: SMCSignal) => {
    setSelectedSignalId(sig.id);
    const targetPair = pairs.find((p) => p.id === sig.pairId);
    if (targetPair && targetPair.id !== selectedPair.id) {
      setSelectedPair(targetPair);
    }
    setActiveTab('terminal');
    setTimeframe(targetPair?.defaultTimeframes.entry || '15m');
  };

  const currentSignalForChart =
    signals.find((s) => s.id === selectedSignalId && s.pairId === selectedPair.id) ||
    pairState?.currentSignal ||
    signals.find((s) => s.pairId === selectedPair.id) ||
    null;

  return (
    <div className="min-h-screen bg-[#070a11] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30">
      {/* Institutional Top Header & Live Ticker */}
      <Header
        pairs={pairs}
        selectedPair={selectedPair}
        onSelectPair={(p) => {
          setSelectedPair(p);
          setSelectedSignalId(null);
        }}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {activeTab === 'terminal' && (
          <div className="space-y-6">
            {/* SMC Liquidity Sniper Market Overview Banner */}
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
              {/* Left: Asset Details */}
              <div className="flex items-center space-x-4">
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    <h2 className="text-2xl font-black text-white tracking-tight">{selectedPair.symbol}</h2>
                    <span className="text-xs text-slate-400 font-medium">{selectedPair.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase font-mono">
                      SMC SNIPER
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xl font-bold font-mono text-cyan-400">
                      {formatPrice(
                        pairState?.candles15M?.[pairState.candles15M.length - 1]?.close ||
                          selectedPair.fallbackBasePrice,
                        selectedPair.decimals
                      )}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">LIVE INSTITUTIONAL BID</span>
                  </div>
                </div>
              </div>

              {/* SMC Multi-Dimensional Analysis Badges */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* 1. Higher Timeframe Bias & EMAs */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex items-center space-x-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">
                      HTF Bias ({selectedPair.defaultTimeframes.htf.toUpperCase()})
                    </div>
                    <div
                      className={`font-bold flex items-center space-x-1 ${
                        pairState?.trendHTF.direction === 'BULLISH'
                          ? 'text-emerald-400'
                          : pairState?.trendHTF.direction === 'BEARISH'
                          ? 'text-rose-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {pairState?.trendHTF.direction === 'BULLISH' ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : pairState?.trendHTF.direction === 'BEARISH' ? (
                        <TrendingDown className="w-4 h-4" />
                      ) : (
                        <Info className="w-4 h-4" />
                      )}
                      <span>{pairState?.trendHTF.direction || 'ANALYZING...'}</span>
                    </div>
                  </div>
                  <div className="border-l border-slate-800 pl-3 hidden sm:block">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">EMA 50 / 200</div>
                    <div className="font-bold text-slate-200 font-mono text-[11px]">
                      {pairState?.trendHTF.ema50.toFixed(2)} / {pairState?.trendHTF.ema200.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* 2. Premium / Discount Zone */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex items-center space-x-2 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Dealing Range</div>
                    <div
                      className={`font-bold font-mono ${
                        pairState?.premiumDiscount.currentZone === 'DISCOUNT'
                          ? 'text-emerald-400'
                          : pairState?.premiumDiscount.currentZone === 'PREMIUM'
                          ? 'text-rose-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {pairState?.premiumDiscount.currentZone} ({pairState?.premiumDiscount.percentage}%)
                    </div>
                  </div>
                </div>

                {/* 3. Liquidity & FVG Status */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex items-center space-x-2 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Active Imbalances</div>
                    <div className="font-bold text-cyan-400 font-mono flex items-center space-x-1">
                      <Layers className="w-3.5 h-3.5" />
                      <span>{pairState?.activeFvgs.length || 0} FVGs • {pairState?.liquidityLevels.length || 0} Pools</span>
                    </div>
                  </div>
                </div>

                {/* 4. Risk / Reward Target */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex items-center space-x-2 text-xs">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Dynamic RR</div>
                    <div className="font-bold text-emerald-400 font-mono">
                      {currentSignalForChart ? `1:${currentSignalForChart.riskRewardRatio.toFixed(1)} RR` : 'Min 1:2.0 RR'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Candlestick Chart with SMC Overlays */}
            {pairState ? (
              <CandlestickChart
                pair={selectedPair}
                candles15M={pairState.candlesEntry}
                candles4H={pairState.candlesHTF}
                signal={currentSignalForChart}
                trend4H={pairState.trendHTF}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
                liquidityLevels={pairState.liquidityLevels}
                activeFvgs={pairState.activeFvgs}
              />
            ) : (
              <div className="w-full h-[450px] bg-[#111827] border border-slate-800 rounded-xl flex items-center justify-center">
                <div className="text-center space-y-2 text-slate-400 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
                  <p>Analyzing multi-timeframe liquidity sweeps, order blocks, and FVGs...</p>
                </div>
              </div>
            )}

            {/* Multi-Asset Live SMC Signal Scanner */}
            <SignalScanner
              pairs={pairs}
              signals={signals}
              selectedSignalId={selectedSignalId}
              onSelectSignal={handleSelectSignal}
              onSelectPair={(p) => {
                setSelectedPair(p);
                setSelectedSignalId(null);
              }}
              selectedPair={selectedPair}
              isScanning={isScanning}
              onTriggerScan={handleTriggerScan}
              scanIntervalSec={scanIntervalSec}
              onSetScanInterval={setScanIntervalSec}
            />
          </div>
        )}

        {/* Backtesting Engine & Dedicated 2-Month Mode Tab */}
        {activeTab === 'backtest' && (
          <BacktestDashboard pairs={pairs} selectedPair={selectedPair} />
        )}

        {/* Signal Record Book / Audit Ledger Tab */}
        {activeTab === 'journal' && (
          <TradeJournal
            signals={signals}
            stats={stats}
            onClearHistory={() => signalStore.clearAll()}
            onResetSeeds={() => signalStore.resetToSeeds()}
            onSelectSignal={handleSelectSignal}
          />
        )}
      </main>

      {/* Institutional Footer */}
      <footer className="border-t border-slate-800/80 bg-[#070a11] py-4 px-6 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>SMC Liquidity Sniper • Multi-Market Trading Strategy • Real Live Market Data</span>
        </div>
        <div className="flex items-center space-x-4 font-mono text-[11px]">
          <span>HTF Bias: ENFORCED</span>
          <span>Liquidity Sweeps: ACTIVE</span>
          <span>FVG Mitigation: TRACKED</span>
          <span>Risk Rule: 0.5% MAX</span>
        </div>
      </footer>
    </div>
  );
}
