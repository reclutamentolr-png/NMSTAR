'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import ToolBackLink from '@/components/ToolBackLink'
import {
  ShieldCheck,
  Search,
  LoaderCircle,
  Globe,
  Building,
  Lock,
  Eye,
  TrendingUp,
  ExternalLink,
  Download,
  Share2,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  QrCode,
} from 'lucide-react'
import QRCheckScanner from '@/components/QRCheckScanner'

interface SVATCheck {
  id: string
  name: string
  status: 'ok' | 'warning' | 'risk' | 'check'
  points: number
  details: string
  detailsKey?: string
  source?: string
  sourceUrl?: string
  detailsInterp?: Record<string, string>
}

interface SVATResult {
  input: string
  domain?: string
  score: number
  badge: 'green' | 'yellow' | 'red'
  checks: SVATCheck[]
  summary: {
    totalChecks: number
    okCount: number
    warningCount: number
    riskCount: number
  }
}

function StatusIcon({ status }: { status: 'ok' | 'warning' | 'risk' | 'check' }) {
  switch (status) {
    case 'ok':
      return <CheckCircle className="h-5 w-5 text-green-500" />
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    case 'risk':
      return <XCircle className="h-5 w-5 text-red-500" />
    case 'check':
      return <Clock className="h-5 w-5 text-blue-500" />
    default:
      return <Eye className="h-5 w-5 text-gray-400" />
  }
}

function BadgeColor({ badge }: { badge: 'green' | 'yellow' | 'red' }) {
  switch (badge) {
    case 'green':
      return 'bg-green-500'
    case 'yellow':
      return 'bg-yellow-500'
    case 'red':
      return 'bg-red-500'
    default:
      return 'bg-gray-500'
  }
}

export default function SVATPage() {
  const t = useTranslations('svat')
  const commonT = useTranslations('common')
  const [activeTab, setActiveTab] = useState<'website' | 'qr'>('website')
  const [input, setInput] = useState('')
  const [result, setResult] = useState<SVATResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/svat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim() }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(data.error || 'Verification failed')
      }

      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 40) return 'text-yellow-500'
    return 'text-red-500'
  }

  const exportToPDF = () => {
    if (!result) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html>
        <head>
          <title>SVAT Report - ${result.domain || result.input}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            .score { font-size: 48px; font-weight: bold; }
            .badge-${result.badge} { color: ${result.badge === 'green' ? '#16a34a' : result.badge === 'yellow' ? '#ca8a04' : '#dc2626'}; }
          </style>
        </head>
        <body>
          <h1>SVAT - Anti-Fraud Verification Report</h1>
          <h2>${result.domain || result.input}</h2>
          <p>Reliability Score: <span class="score badge-${result.badge}">${result.score}/100</span></p>
          <p>Badge: ${result.badge.toUpperCase()}</p>
          <h3>Checks Summary</h3>
          <ul>
            <li>Total checks: ${result.summary.totalChecks}</li>
            <li>OK: ${result.summary.okCount}</li>
            <li>Warnings: ${result.summary.warningCount}</li>
            <li>Risks: ${result.summary.riskCount}</li>
          </ul>
          <h3>Detailed Results</h3>
          ${result.checks.map((c) => `
            <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
              <strong>${t(c.name)}</strong> - Status: ${c.status.toUpperCase()}
              <p>${c.details}</p>
              ${c.source ? `<p>Source: ${c.source}</p>` : ''}
            </div>
          `).join('')}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const shareResult = async () => {
    if (!result) return
    const text = `SVAT Verification Report for ${result.domain || result.input}\nScore: ${result.score}/100 (${result.badge})`
    if (navigator.share) {
      navigator.share({ title: 'SVAT Report', text, url: window.location.href })
    } else {
      navigator.clipboard.writeText(text)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-[var(--gold-pale)]">
      {/* Header */}
      <header className="border-b border-[var(--gold)]/25 bg-[var(--ink)] sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <ToolBackLink
            className="flex items-center gap-2 text-white hover:text-[var(--gold-bright)] font-medium transition-colors"
            dashboardLabel={<><ShieldCheck className="w-5 h-5" /> {commonT('backToDashboard')}</>}
          >
            <ShieldCheck className="w-5 h-5" />
            {t('backToMarketplace')}
          </ToolBackLink>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
            <ShieldCheck className="h-5 w-5 text-[var(--gold-bright)]" />
            {t('title')}
          </h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-[var(--gold-pale)] text-[var(--ink)] px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <ShieldCheck className="w-4 h-4 text-[var(--gold)]" />
            {t('badge')}
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-3">{t('heroTitle')}</h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">{t('heroDescription')}</p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-8">
          <button
            onClick={() => setActiveTab('website')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'website'
                ? 'bg-[var(--ink)] text-white shadow'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Globe className="w-4 h-4" />
            {t('tabWebsiteCheck')}
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'qr'
                ? 'bg-[var(--ink)] text-white shadow'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <QrCode className="w-4 h-4" />
            {t('tabQrCheck')}
          </button>
        </div>

        {activeTab === 'qr' && <QRCheckScanner />}

        {activeTab === 'website' && (
        <>
        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('inputPlaceholder')}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all text-base"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-[var(--ink)] hover:bg-[var(--ink-soft)] text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <LoaderCircle className="w-5 h-5 animate-spin" />
                  {t('scanning')}
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  {t('submit')}
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-center">
            <XCircle className="w-5 h-5 text-red-600 mx-auto mb-2" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <LoaderCircle className="w-12 h-12 text-[var(--gold)] mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">{t('checksInProgress')}</p>
          </div>
        )}

        {result && (
          <div className="space-y-8">
            {/* Score Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
              <h3 className="text-lg font-semibold text-gray-600 mb-2">{t('scoreTitle')}</h3>
              <div className={`text-6xl font-bold mb-2 ${getScoreColor(result.score)}`}>
                {result.score}
                <span className="text-2xl text-gray-400">/{t('scoreRange')}</span>
              </div>
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className={`h-4 w-4 rounded-full ${BadgeColor({ badge: result.badge })}`} />
                <span className="text-xl font-semibold text-gray-700">
                  {result.badge === 'green' ? t('badgeGreen') : result.badge === 'yellow' ? t('badgeYellow') : t('badgeRed')}
                </span>
              </div>
              <p className="text-gray-500">
                {t('scoreTitle')}: {result.score}/100 — {result.badge === 'green' ? t('badgeGreen') : result.badge === 'yellow' ? t('badgeYellow') : t('badgeRed')}
              </p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow border border-gray-200 p-4 text-center">
                <div className="text-2xl font-bold text-gray-800">{result.summary.totalChecks}</div>
                <p className="text-xs text-gray-600">{t('totalChecks')}</p>
              </div>
              <div className="bg-white rounded-xl shadow border border-gray-200 p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{result.summary.okCount}</div>
                <p className="text-xs text-gray-600">{t('statusOK')}</p>
              </div>
              <div className="bg-white rounded-xl shadow border border-gray-200 p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{result.summary.warningCount}</div>
                <p className="text-xs text-gray-600">{t('statusWarning')}</p>
              </div>
              <div className="bg-white rounded-xl shadow border border-gray-200 p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{result.summary.riskCount}</div>
                <p className="text-xs text-gray-600">{t('statusRisk')}</p>
              </div>
            </div>

            {/* Results Grid */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Domain & DNS Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <Globe className="w-5 h-5 text-blue-600" />
                  {t('domainSection')}
                </div>
                {result.checks
                  .filter((c) => ['whois', 'domainAge', 'spf', 'dmarc', 'mx', 'ptr', 'httpHeaders'].includes(c.id))
                  .map((c) => (
                    <div key={c.id} className="bg-white rounded-xl shadow border border-gray-200 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <StatusIcon status={c.status} />
                          <div>
                            <p className="font-medium text-gray-800">{t(c.name)}</p>
                            <p className="text-sm text-gray-600 mt-1">{c.details}</p>
                            {c.source && (
                              <p className="text-xs text-gray-500 mt-1">
                                {c.sourceUrl ? (
                                  <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--gold)] hover:underline">
                                    {c.source} <ExternalLink className="w-3 h-3 inline" />
                                  </a>
                                ) : (
                                  c.source
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          c.status === 'ok' ? 'bg-green-100 text-green-800' :
                          c.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          c.status === 'risk' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {c.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Security & SSL Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <Lock className="w-5 h-5 text-green-600" />
                  {t('securitySection')}
                </div>
                {result.checks
                  .filter((c) => ['ssl', 'safeBrowsing', 'virusTotal', 'abuseIPDB'].includes(c.id))
                  .map((c) => (
                    <div key={c.id} className="bg-white rounded-xl shadow border border-gray-200 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <StatusIcon status={c.status} />
                          <div>
                            <p className="font-medium text-gray-800">{t(c.name)}</p>
                            <p className="text-sm text-gray-600 mt-1">{c.details}</p>
                            {c.source && (
                              <p className="text-xs text-gray-500 mt-1">
                                {c.sourceUrl ? (
                                  <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--gold)] hover:underline">
                                    {c.source} <ExternalLink className="w-3 h-3 inline" />
                                  </a>
                                ) : (
                                  c.source
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          c.status === 'ok' ? 'bg-green-100 text-green-800' :
                          c.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          c.status === 'risk' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {c.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Content, Legal, Reviews, Business Model Sections */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Content Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <Search className="w-5 h-5 text-orange-600" />
                  {t('contentSection')}
                </div>
                {result.checks
                  .filter((c) => ['contentScraping'].includes(c.id))
                  .map((c) => (
                    <div key={c.id} className="bg-white rounded-xl shadow border border-gray-200 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <StatusIcon status={c.status} />
                          <div>
                            <p className="font-medium text-gray-800">{t(c.name)}</p>
                            <p className="text-sm text-gray-600 mt-1">{c.details}</p>
                            {c.source && <p className="text-xs text-gray-500 mt-1">{c.source}</p>}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          c.status === 'ok' ? 'bg-green-100 text-green-800' :
                          c.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          c.status === 'risk' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {c.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Legal Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  {t('legalSection')}
                </div>
                {result.checks
                  .filter((c) => ['legalPages'].includes(c.id))
                  .map((c) => (
                    <div key={c.id} className="bg-white rounded-xl shadow border border-gray-200 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <StatusIcon status={c.status} />
                          <div>
                            <p className="font-medium text-gray-800">{t(c.name)}</p>
                            <p className="text-sm text-gray-600 mt-1">{c.details}</p>
                            {c.source && <p className="text-xs text-gray-500 mt-1">{c.source}</p>}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          c.status === 'ok' ? 'bg-green-100 text-green-800' :
                          c.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          c.status === 'risk' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {c.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Reviews Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <TrendingUp className="w-5 h-5 text-pink-600" />
                  {t('reviewsSection')}
                </div>
                {result.checks
                  .filter((c) => ['reviews'].includes(c.id))
                  .map((c) => (
                    <div key={c.id} className="bg-white rounded-xl shadow border border-gray-200 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <StatusIcon status={c.status} />
                          <div>
                            <p className="font-medium text-gray-800">{t(c.name)}</p>
                            <p className="text-sm text-gray-600 mt-1">{c.details}</p>
                            {c.source && <p className="text-xs text-gray-500 mt-1">{c.source}</p>}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          c.status === 'ok' ? 'bg-green-100 text-green-800' :
                          c.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          c.status === 'risk' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {c.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Business Model Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <Building className="w-5 h-5 text-amber-600" />
                  {t('businessSection')}
                </div>
                {result.checks
                  .filter((c) => ['businessModel'].includes(c.id))
                  .map((c) => (
                    <div key={c.id} className="bg-white rounded-xl shadow border border-gray-200 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <StatusIcon status={c.status} />
                          <div>
                            <p className="font-medium text-gray-800">{t(c.name)}</p>
                            <p className="text-sm text-gray-600 mt-1">{c.details}</p>
                            {c.source && <p className="text-xs text-gray-500 mt-1">{c.source}</p>}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          c.status === 'ok' ? 'bg-green-100 text-green-800' :
                          c.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          c.status === 'risk' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {c.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* All Checks List */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('allChecks')}</h3>
              <div className="space-y-3">
                {result.checks.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <StatusIcon status={c.status} />
                      <span className="font-medium text-gray-700">{t(c.name)}</span>
                    </div>
                    <span className="text-sm text-gray-500">{c.details}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('websiteSection')}</h3>
              <p className="text-sm text-gray-600">
                {result.checks.some((c) => ['ssl', 'httpHeaders', 'spf', 'dmarc', 'mx', 'safeBrowsing', 'virusTotal', 'abuseIPDB', 'ptr'].includes(c.id))
                  ? t('reputationSummary')
                  : 'Security checks incomplete'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-center gap-4">
              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all"
              >
                <Download className="w-5 h-5" />
                {t('exportPDF')}
              </button>
              <button
                onClick={shareResult}
                className="flex items-center gap-2 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all"
              >
                <Share2 className="w-5 h-5" />
                {t('viewSources')}
              </button>
              <button
                onClick={() => {
                  setResult(null)
                  setInput('')
                }}
                className="flex items-center gap-2 px-5 py-3 bg-[var(--gold-pale)] hover:bg-[var(--gold-pale)]/70 text-[var(--ink)] rounded-xl font-medium transition-all"
              >
                <RefreshCw className="w-5 h-5" />
                {t('backToMarketplace')}
              </button>
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-gray-500 text-center">
              {t('disclaimer')}
            </p>
          </div>
        )}

        {!loading && !result && !error && (
          <div className="text-center py-12 text-gray-400">
            <Search className="w-12 h-12 mx-auto mb-4" />
            <p>{t('inputPlaceholder')}</p>
          </div>
        )}
        </>
        )}
      </main>
    </div>
  )
}
