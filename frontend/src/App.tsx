import { useState } from 'react'
import { translations, type Language } from './i18n'

interface SimulationResult {
  success: boolean
  buySuccess: boolean
  sellSuccess: boolean
  buyGasUsed: string
  sellGasUsed: string
  buyTaxPercent: string
  sellTaxPercent: string
  error?: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

function App() {
  const [lang, setLang] = useState<Language>('en')
  const [tokenAddress, setTokenAddress] = useState('')
  const [isV3, setIsV3] = useState(true)
  const [feeTier, setFeeTier] = useState(3000)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [error, setError] = useState('')

  const t = translations[lang]

  const handleSimulate = async () => {
    if (!tokenAddress || !tokenAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError(t.invalidAddress)
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('http://localhost:3000/simulation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenAddress,
          isV3,
          feeTier: isV3 ? feeTier : 0,
        }),
      })

      if (!response.ok) {
        throw new Error('Simulation failed')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW':
        return '#10b981'
      case 'MEDIUM':
        return '#f59e0b'
      case 'HIGH':
        return '#ef4444'
      case 'CRITICAL':
        return '#dc2626'
      default:
        return '#6b7280'
    }
  }

  const getRiskEmoji = (level: string) => {
    switch (level) {
      case 'LOW':
        return '✅'
      case 'MEDIUM':
        return '⚠️'
      case 'HIGH':
        return '🚨'
      case 'CRITICAL':
        return '☠️'
      default:
        return '❓'
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-chuizi-dark">
      <header className="relative text-center py-12 md:py-16 px-4 text-chuizi-green bg-gradient-to-b from-chuizi-green/5 to-transparent">
        <div className="absolute top-3 right-3 md:top-6 md:right-8 flex gap-2 z-10">
          <button
            className={`px-3 py-2 md:px-4 md:py-2 text-xs md:text-sm font-semibold rounded-md border transition-all ${
              lang === 'en'
                ? 'bg-chuizi-green text-chuizi-dark border-chuizi-green'
                : 'bg-chuizi-green/10 text-chuizi-text-muted border-chuizi-border hover:border-chuizi-green hover:text-chuizi-green'
            }`}
            onClick={() => setLang('en')}
          >
            EN
          </button>
          <button
            className={`px-3 py-2 md:px-4 md:py-2 text-xs md:text-sm font-semibold rounded-md border transition-all ${
              lang === 'zh'
                ? 'bg-chuizi-green text-chuizi-dark border-chuizi-green'
                : 'bg-chuizi-green/10 text-chuizi-text-muted border-chuizi-border hover:border-chuizi-green hover:text-chuizi-green'
            }`}
            onClick={() => setLang('zh')}
          >
            中文
          </button>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold m-0 drop-shadow-[0_0_20px_rgba(0,255,136,0.3)]">
          🔨 {t.title}
        </h1>
        <p className="text-base md:text-xl mt-2 text-chuizi-text-muted">{t.subtitle}</p>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 md:px-8 pb-8 md:pb-12 w-full flex flex-col items-center">
        <div className="w-full max-w-2xl">
          <div className="bg-chuizi-card rounded-xl p-6 md:p-10 shadow-2xl mb-6 md:mb-8 border border-chuizi-border">
            <div className="mb-6">
              <label htmlFor="tokenAddress" className="block mb-2 font-semibold text-chuizi-green text-sm uppercase tracking-wide">
                {t.tokenAddress}
              </label>
              <input
                id="tokenAddress"
                type="text"
                placeholder="0x..."
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 bg-chuizi-card-dark border border-chuizi-border rounded-lg text-base font-mono text-chuizi-text transition-all focus:outline-none focus:border-chuizi-green focus:ring-4 focus:ring-chuizi-green/10 disabled:bg-chuizi-card disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div className="mb-6">
              <label className="block mb-2 font-semibold text-chuizi-green text-sm uppercase tracking-wide">
                {t.routerType}
              </label>
              <div className="flex gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-chuizi-text-muted hover:text-chuizi-text">
                  <input
                    type="radio"
                    checked={isV3}
                    onChange={() => setIsV3(true)}
                    disabled={loading}
                    className="w-5 h-5 cursor-pointer accent-chuizi-green"
                  />
                  Uniswap V3
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium text-chuizi-text-muted hover:text-chuizi-text">
                  <input
                    type="radio"
                    checked={!isV3}
                    onChange={() => setIsV3(false)}
                    disabled={loading}
                    className="w-5 h-5 cursor-pointer accent-chuizi-green"
                  />
                  Uniswap V2
                </label>
              </div>
            </div>

            {isV3 && (
              <div className="mb-6">
                <label htmlFor="feeTier" className="block mb-2 font-semibold text-chuizi-green text-sm uppercase tracking-wide">
                  {t.feeTier}
                </label>
                <select
                  id="feeTier"
                  value={feeTier}
                  onChange={(e) => setFeeTier(Number(e.target.value))}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-chuizi-card-dark border border-chuizi-border rounded-lg text-base font-mono text-chuizi-text transition-all focus:outline-none focus:border-chuizi-green focus:ring-4 focus:ring-chuizi-green/10 disabled:bg-chuizi-card disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value={500}>0.05%</option>
                  <option value={3000}>0.3%</option>
                  <option value={10000}>1%</option>
                </select>
              </div>
            )}

            <button
              onClick={handleSimulate}
              disabled={loading}
              className="w-full py-4 bg-chuizi-green text-chuizi-dark rounded-lg text-lg font-bold uppercase tracking-wide cursor-pointer transition-all shadow-[0_4px_20px_rgba(0,255,136,0.3)] hover:bg-[#00dd77] hover:-translate-y-0.5 hover:shadow-[0_6px_30px_rgba(0,255,136,0.5)] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_20px_rgba(0,255,136,0.3)]"
            >
              {loading ? `${t.simulating}` : `${t.simulate}`}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-500/10 text-red-500 rounded-lg border-l-4 border-red-500">
                ❌ {error}
              </div>
            )}
          </div>

          {result && (
            <div className="bg-chuizi-card rounded-xl p-6 md:p-10 shadow-2xl border border-chuizi-border animate-[slideUp_0.4s_ease-out]">
              <div
                className="inline-block px-6 py-3 rounded-full text-white font-bold text-lg mb-6 uppercase tracking-wide shadow-lg"
                style={{ backgroundColor: getRiskColor(result.riskLevel) }}
              >
                {getRiskEmoji(result.riskLevel)} {result.riskLevel} {t.risk}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-5 bg-chuizi-card-dark rounded-lg border border-chuizi-border transition-all hover:-translate-y-0.5 hover:border-chuizi-green hover:shadow-[0_4px_12px_rgba(0,255,136,0.15)]">
                  <div className="text-xs text-chuizi-text-muted font-semibold mb-2 uppercase tracking-wide">
                    {t.buySuccess}
                  </div>
                  <div className="text-2xl font-bold text-chuizi-green">
                    {result.buySuccess ? `✅ ${t.yes}` : `❌ ${t.no}`}
                  </div>
                </div>

                <div className="p-5 bg-chuizi-card-dark rounded-lg border border-chuizi-border transition-all hover:-translate-y-0.5 hover:border-chuizi-green hover:shadow-[0_4px_12px_rgba(0,255,136,0.15)]">
                  <div className="text-xs text-chuizi-text-muted font-semibold mb-2 uppercase tracking-wide">
                    {t.sellSuccess}
                  </div>
                  <div className="text-2xl font-bold text-chuizi-green">
                    {result.sellSuccess ? `✅ ${t.yes}` : `❌ ${t.no}`}
                  </div>
                </div>

                <div className="p-5 bg-chuizi-card-dark rounded-lg border border-chuizi-border transition-all hover:-translate-y-0.5 hover:border-chuizi-green hover:shadow-[0_4px_12px_rgba(0,255,136,0.15)]">
                  <div className="text-xs text-chuizi-text-muted font-semibold mb-2 uppercase tracking-wide">
                    {t.buyTax}
                  </div>
                  <div className="text-2xl font-bold text-chuizi-green">
                    {result.buyTaxPercent}%
                  </div>
                </div>

                <div className="p-5 bg-chuizi-card-dark rounded-lg border border-chuizi-border transition-all hover:-translate-y-0.5 hover:border-chuizi-green hover:shadow-[0_4px_12px_rgba(0,255,136,0.15)]">
                  <div className="text-xs text-chuizi-text-muted font-semibold mb-2 uppercase tracking-wide">
                    {t.sellTax}
                  </div>
                  <div className="text-2xl font-bold text-chuizi-green">
                    {result.sellTaxPercent}%
                  </div>
                </div>

                <div className="p-5 bg-chuizi-card-dark rounded-lg border border-chuizi-border transition-all hover:-translate-y-0.5 hover:border-chuizi-green hover:shadow-[0_4px_12px_rgba(0,255,136,0.15)]">
                  <div className="text-xs text-chuizi-text-muted font-semibold mb-2 uppercase tracking-wide">
                    {t.buyGas}
                  </div>
                  <div className="text-2xl font-bold text-chuizi-green">
                    {Number(result.buyGasUsed).toLocaleString()}
                  </div>
                </div>

                <div className="p-5 bg-chuizi-card-dark rounded-lg border border-chuizi-border transition-all hover:-translate-y-0.5 hover:border-chuizi-green hover:shadow-[0_4px_12px_rgba(0,255,136,0.15)]">
                  <div className="text-xs text-chuizi-text-muted font-semibold mb-2 uppercase tracking-wide">
                    {t.sellGas}
                  </div>
                  <div className="text-2xl font-bold text-chuizi-green">
                    {Number(result.sellGasUsed).toLocaleString()}
                  </div>
                </div>
              </div>

              {result.error && (
                <div className="p-4 bg-yellow-500/10 border-l-4 border-yellow-500 rounded-lg mb-4 text-yellow-500">
                  <strong>{t.errorDetails}:</strong> {result.error}
                </div>
              )}

              {!result.sellSuccess && (
                <div className="p-4 bg-red-500/10 border-l-4 border-red-500 rounded-lg text-red-500">
                  <strong className="block mb-1">⚠️</strong> {t.honeypotWarning}
                </div>
              )}

              {result.riskLevel === 'HIGH' && result.sellSuccess && (
                <div className="p-4 bg-red-500/10 border-l-4 border-red-500 rounded-lg text-red-500">
                  <strong className="block mb-1">🚨</strong> {t.highTaxWarning}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="text-center py-8 px-4 text-chuizi-text-muted border-t border-chuizi-border">
        <p className="m-0">
          {t.poweredBy}
          {' · '}
          <a
            href="https://github.com/huicanvie/chuizi-token-doctor"
            target="_blank"
            rel="noopener noreferrer"
            className="text-chuizi-green no-underline font-semibold transition-opacity hover:opacity-80 hover:underline"
          >
            GitHub
          </a>
        </p>
      </footer>
    </div>
  )
}

export default App
