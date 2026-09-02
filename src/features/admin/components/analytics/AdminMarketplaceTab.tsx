import { useState, useMemo, useEffect } from 'react';
import {
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  BarChart3,
  BriefcaseBusiness,
  Compass,
  Flame,
  Inbox,
} from 'lucide-react';
import type {
  MarketplaceAnalyticsResponse,
} from '../../../../types/adminAnalytics';
import {
  formatNumber,
  opportunityMeaning,
  useTablePage,
  type OpportunityMode,
  type OpportunityPoint,
} from '../../utils/analyticsUtils';
import { AnalyticsChartPanel } from './AnalyticsChartPanel';
import { AnalyticsPagination } from './AnalyticsPagination';
import { AnalyticsFormulaTooltip } from './AnalyticsFormulaTooltip';
import { useTranslation } from '../../../../hooks/useTranslation';

export interface AdminMarketplaceTabProps {
  data: MarketplaceAnalyticsResponse;
}

function OpportunityTooltip({
  active,
  payload,
  mode,
}: {
  active?: boolean;
  payload?: Array<{ payload: OpportunityPoint }>;
  mode: OpportunityMode;
}) {
  const { t } = useTranslation('admin');
  if (!active || !payload?.[0]) return null;
  const item = payload[0].payload;

  return (
    <div className="analytics-opportunity-tooltip">
      <strong className="analytics-opp-title">{item.label}</strong>
      <span className="analytics-opp-score">
        {t('adminAnalytics.market.gapScore', { defaultValue: 'Gap Score' })}: <strong>{formatNumber(item.score)}</strong>
      </span>
      <div className="analytics-opp-meta">
        {mode === 'skill' ? (
          <>
            <span>{item.demand} {t('adminAnalytics.market.openJobs', { defaultValue: 'Open Job Requests' })}</span>
            <span>{item.supply} {t('adminAnalytics.market.talent', { defaultValue: 'Available Talent Profiles' })}</span>
          </>
        ) : (
          <>
            <span>{item.demand.toLocaleString()} {t('adminAnalytics.market.searches', { defaultValue: 'Search Inquiries' })}</span>
            <span>{formatNumber(item.resultCount)} {t('adminAnalytics.market.avgResults', { defaultValue: 'Avg Matching Results' })}</span>
          </>
        )}
      </div>
    </div>
  );
}

export function AdminMarketplaceTab({ data }: AdminMarketplaceTabProps) {
  const { t } = useTranslation('admin');
  const [trendSort, setTrendSort] = useState<
    'score' | 'uniqueViews' | 'saves' | 'proposals' | 'contracts' | 'conversionPercent'
  >('score');
  const [opportunityMode, setOpportunityMode] = useState<OpportunityMode>('skill');

  const funnelStages = useMemo(
    () => [
      { key: 'views', label: t('adminAnalytics.kpis.views', { defaultValue: 'Job Views' }), val: data.funnel?.views ?? 0, pct: '100%', color: 'var(--brand)' },
      { key: 'saves', label: t('adminAnalytics.kpis.saves', { defaultValue: 'Bookmarked / Saved' }), val: data.funnel?.saves ?? 0, pct: '78%', color: '#6366f1' },
      { key: 'proposals', label: t('adminAnalytics.kpis.proposals', { defaultValue: 'Proposals Submitted' }), val: data.funnel?.proposals ?? 0, pct: '52%', color: '#8b5cf6' },
      { key: 'contracts', label: t('adminAnalytics.kpis.contracts', { defaultValue: 'Contracts Formed' }), val: data.funnel?.contracts ?? 0, pct: '30%', color: '#10b981' },
    ],
    [data.funnel, t]
  );

  const sortedJobs = useMemo(
    () => [...(data.trendingJobs ?? [])].sort((a, b) => b[trendSort] - a[trendSort]),
    [data.trendingJobs, trendSort]
  );

  const filteredOpportunities = useMemo(
    () => (data.opportunities ?? []).filter(item => item.kind === opportunityMode),
    [data.opportunities, opportunityMode]
  );

  const scatterData: OpportunityPoint[] = useMemo(
    () =>
      filteredOpportunities.map(item => ({
        ...item,
        x: opportunityMode === 'skill' ? item.supply : item.resultCount,
        y: item.demand,
        z: Math.max(30, item.score),
      })),
    [filteredOpportunities, opportunityMode]
  );

  const topSearches = useMemo(() => data.topSearches ?? [], [data.topSearches]);
  const trendPagination = useTablePage(sortedJobs.length, 8);
  const opportunityPagination = useTablePage(filteredOpportunities.length, 8);

  const jobs = sortedJobs.slice(trendPagination.from, trendPagination.to);
  const opportunities = filteredOpportunities.slice(
    opportunityPagination.from,
    opportunityPagination.to
  );

  const searchDetails = useMemo(
    () => new Map(topSearches.map(s => [s.query.toLocaleLowerCase(), s])),
    [topSearches]
  );

  useEffect(() => {
    opportunityPagination.setPage(1);
  }, [opportunityMode]);

  return (
    <div className="analytics-stack">
      {/* Top Section Heading */}
      <section className="analytics-section-heading analytics-section-heading-first">
        <div>
          <span className="analytics-eyebrow">
            <Compass size={14} /> {t('adminAnalytics.market.eyebrow', { defaultValue: 'Market Discovery & Engagement' })}
          </span>
          <h2>{t('adminAnalytics.market.title', { defaultValue: 'Marketplace Discovery, Conversion & Opportunities' })}</h2>
          <p>
            {t('adminAnalytics.market.subtitle', { defaultValue: 'Understand high-intent search inquiries, hiring funnel conversion, and talent supply gaps.' })}
          </p>
        </div>
      </section>

      {/* Top Searches + Funnel Row */}
      <div className="analytics-grid analytics-grid-two">
        {/* Top Committed Searches */}
        <AnalyticsChartPanel
          title={t('adminAnalytics.market.topSearchesTitle', { defaultValue: 'Most Frequent Search Inquiries' })}
          subtitle={t('adminAnalytics.market.topSearchesSubtitle', { defaultValue: 'Intent-driven search queries (Minimum ≥5 committed queries from ≥3 distinct users)' })}
        >
          {topSearches.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={topSearches.slice(0, 10)}
                layout="vertical"
                margin={{ top: 10, right: 15, left: 15, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.6} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="query"
                  width={120}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                  tick={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    borderRadius: '0.75rem',
                    color: 'var(--text-primary)',
                  }}
                />
                <Bar dataKey="searches" name={t('adminAnalytics.market.searchVolume', { defaultValue: 'Search Volume' })} fill="#494be7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="analytics-chart-empty">
              <Inbox size={28} className="text-text-muted mb-2 opacity-50" />
              <span>{t('adminAnalytics.market.emptyTopSearches', { defaultValue: 'No search inquiry aggregations meeting discovery criteria in this timeframe.' })}</span>
            </div>
          )}
        </AnalyticsChartPanel>

        {/* Conversion Funnel */}
        <AnalyticsChartPanel
          title={t('adminAnalytics.market.conversionFunnelTitle', { defaultValue: 'Marketplace Conversion Funnel' })}
          subtitle={t('adminAnalytics.market.conversionFunnelSubtitle', { defaultValue: 'Aggregate journey from job impression to signed escrow contract' })}
        >
          <div className="analytics-funnel-container">
            {funnelStages.map(stage => (
              <div key={stage.key} className="analytics-funnel-row">
                <div className="analytics-funnel-label-row">
                  <span className="analytics-funnel-name">{stage.label}</span>
                  <strong className="analytics-funnel-val">{stage.val.toLocaleString()}</strong>
                </div>
                <div className="analytics-funnel-track">
                  <div
                    className="analytics-funnel-bar"
                    style={{ width: stage.pct, backgroundColor: stage.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </AnalyticsChartPanel>
      </div>

      {/* Trending Jobs Table */}
      <section className="analytics-panel">
        <header className="analytics-panel-header">
          <div className="analytics-panel-titles">
            <div className="flex items-center gap-2">
              <Flame size={18} className="text-amber-500" />
              <h2>{t('adminAnalytics.market.trendingJobsTitle', { defaultValue: 'Trending Job Posts' })}</h2>
              <AnalyticsFormulaTooltip label="How trending score is calculated">
                <span>
                  {t('adminAnalytics.market.trendingFormula', { defaultValue: 'Trending Score (0–100) combines 20% unique view percentile + 20% save percentile + 35% proposal rate + 25% contract completion.' })}
                </span>
              </AnalyticsFormulaTooltip>
            </div>
            <p className="analytics-panel-subtitle">
              {t('adminAnalytics.market.trendingJobsSubtitle', { defaultValue: 'Jobs ranked by composite marketplace engagement during the selected timeframe.' })}
            </p>
          </div>
        </header>

        <div className="analytics-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('adminAnalytics.market.jobPostTitle', { defaultValue: 'Job Post Title' })}</th>
                {(
                  [
                    ['score', t('adminAnalytics.market.scoreIndex', { defaultValue: 'Score Index' })],
                    ['uniqueViews', t('adminAnalytics.market.views', { defaultValue: 'Views' })],
                    ['saves', t('adminAnalytics.market.saves', { defaultValue: 'Saves' })],
                    ['proposals', t('adminAnalytics.market.proposals', { defaultValue: 'Proposals' })],
                    ['contracts', t('adminAnalytics.market.contracts', { defaultValue: 'Contracts' })],
                    ['conversionPercent', t('adminAnalytics.market.conversionPct', { defaultValue: 'Conversion %' })],
                  ] as const
                ).map(([key, label]) => (
                  <th key={key} className="text-right">
                    <button
                      type="button"
                      className={`analytics-sort-btn ${trendSort === key ? 'active' : ''}`}
                      onClick={() => setTrendSort(key)}
                    >
                      <span>{label}</span>
                      {trendSort === key && <span className="text-brand">↓</span>}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.jobPostId}>
                  <td>
                    <a
                      href={`/jobs/${job.jobPostId}`}
                      className="font-bold text-text-primary hover:text-brand hover:underline block max-w-md truncate"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {job.title}
                    </a>
                  </td>
                  <td className="text-right font-mono font-black text-brand">
                    {formatNumber(job.score)}
                  </td>
                  <td className="text-right font-mono">{(job.uniqueViews ?? 0).toLocaleString()}</td>
                  <td className="text-right font-mono">{(job.saves ?? 0).toLocaleString()}</td>
                  <td className="text-right font-mono">{(job.proposals ?? 0).toLocaleString()}</td>
                  <td className="text-right font-mono text-emerald-500 font-semibold">{(job.contracts ?? 0).toLocaleString()}</td>
                  <td className="text-right font-mono font-bold text-brand">
                    {formatNumber(job.conversionPercent)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(data.trendingJobs ?? []).length === 0 && (
          <div className="analytics-empty">
            <span>{t('adminAnalytics.market.emptyTrending', { defaultValue: 'Trending engagement history will populate as discovery actions occur.' })}</span>
          </div>
        )}

        <AnalyticsPagination
          page={trendPagination.page}
          pageCount={trendPagination.pageCount}
          from={trendPagination.from}
          to={trendPagination.to}
          total={sortedJobs.length}
          onPage={trendPagination.setPage}
          noun="jobs"
        />
      </section>

      {/* Underserved Opportunity Radar Header & Scope Toggle */}
      <section className="analytics-opportunity-guide">
        <div>
          <span className="analytics-control-label">{t('adminAnalytics.market.opportunityRadarLens', { defaultValue: 'Opportunity Radar Lens' })}</span>
          <div className="flex items-center gap-2 mt-1">
            <h2 className="text-lg font-bold text-text-primary">
              {t('adminAnalytics.market.demandUnderservedTitle', { defaultValue: 'Where Marketplace Demand Is Underserved' })}
            </h2>
            <AnalyticsFormulaTooltip label="How opportunity gap scores are calculated">
              {opportunityMode === 'skill' ? (
                <>
                  <span>{t('adminAnalytics.market.talentGapScoreFormula', { defaultValue: 'Talent Gap Score = Open job postings requiring skill ÷ max(1, Available talent).' })}</span>
                  <small className="block mt-1 text-text-muted">{t('adminAnalytics.market.talentGapScoreHint', { defaultValue: 'A score above 1.0 indicates unmet hiring demand.' })}</small>
                </>
              ) : (
                <>
                  <span>{t('adminAnalytics.market.searchGapScoreFormula', { defaultValue: 'Search Gap Score = Search count × (1 + zero-result rate) ÷ (1 + average results).' })}</span>
                  <small className="block mt-1 text-text-muted">{t('adminAnalytics.market.searchGapScoreHint', { defaultValue: 'High volume queries with zero or few matches score highest.' })}</small>
                </>
              )}
            </AnalyticsFormulaTooltip>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            {opportunityMode === 'skill'
              ? t('adminAnalytics.market.talentDeficitSubtitle', { defaultValue: 'Pinpoint highly sought-after skills where open jobs exceed available freelancer talent.' })
              : t('adminAnalytics.market.searchGapsSubtitle', { defaultValue: 'Identify repeated search terms where clients fail to find enough matching candidates.' })}
          </p>
        </div>

        <div className="analytics-scope-options" role="group" aria-label="Opportunity Mode">
          <button
            type="button"
            className={`analytics-scope-btn ${opportunityMode === 'skill' ? 'active' : ''}`}
            aria-pressed={opportunityMode === 'skill'}
            onClick={() => setOpportunityMode('skill')}
          >
            <BriefcaseBusiness size={14} />
            <span>{t('adminAnalytics.market.talentGaps', { defaultValue: 'Talent Gaps' })}</span>
          </button>
          <button
            type="button"
            className={`analytics-scope-btn ${opportunityMode === 'query' ? 'active' : ''}`}
            aria-pressed={opportunityMode === 'query'}
            onClick={() => setOpportunityMode('query')}
          >
            <BarChart3 size={14} />
            <span>{t('adminAnalytics.market.searchGaps', { defaultValue: 'Search Query Gaps' })}</span>
          </button>
        </div>
      </section>

      {/* Scatter Chart & Opportunity Details Table */}
      <div className="analytics-grid analytics-grid-two">
        {/* Scatter Chart Radar */}
        <AnalyticsChartPanel
          title={opportunityMode === 'skill' ? t('adminAnalytics.market.talentDeficitTitle', { defaultValue: 'Talent Supply vs. Demand Radar' }) : t('adminAnalytics.market.searchGapsTitle', { defaultValue: 'Search Result Deficit Radar' })}
          subtitle={
            opportunityMode === 'skill'
              ? t('adminAnalytics.market.talentRadarSubtitle', { defaultValue: 'Bubble = Skill. Higher (more jobs) & farther left (fewer talent) represents highest market opportunity.' })
              : t('adminAnalytics.market.searchRadarSubtitle', { defaultValue: 'Bubble = Query. Higher (more searches) & farther left (fewer results) represents severe unmet query demand.' })
          }
        >
          {scatterData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ top: 12, right: 18, bottom: 24, left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={opportunityMode === 'skill' ? t('adminAnalytics.market.availableTalentSupply', { defaultValue: 'Available Freelancers' }) : t('adminAnalytics.market.averageSearchResults', { defaultValue: 'Average Results per Query' })}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  label={{
                    value: opportunityMode === 'skill' ? t('adminAnalytics.market.availableTalentSupply', { defaultValue: 'Available Talent Supply →' }) : t('adminAnalytics.market.averageSearchResults', { defaultValue: 'Average Search Results →' }),
                    position: 'insideBottom',
                    offset: -12,
                    fill: 'var(--text-muted)',
                    fontSize: 11,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={opportunityMode === 'skill' ? t('adminAnalytics.market.openJobDemand', { defaultValue: 'Open Job Postings' }) : t('adminAnalytics.market.searchVolumeLabel', { defaultValue: 'Search Queries' })}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  label={{
                    value: opportunityMode === 'skill' ? t('adminAnalytics.market.openJobDemand', { defaultValue: 'Open Job Demand →' }) : t('adminAnalytics.market.searchVolumeLabel', { defaultValue: 'Search Volume →' }),
                    angle: -90,
                    position: 'insideLeft',
                    fill: 'var(--text-muted)',
                    fontSize: 11,
                  }}
                />
                <ZAxis type="number" dataKey="z" range={[80, 520]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={<OpportunityTooltip mode={opportunityMode} />}
                />
                <Scatter
                  name={opportunityMode === 'skill' ? t('adminAnalytics.market.talentGaps', { defaultValue: 'Skill Opportunity' }) : t('adminAnalytics.market.searchGaps', { defaultValue: 'Search Query Opportunity' })}
                  data={scatterData}
                  fill={opportunityMode === 'skill' ? '#494be7' : '#f59e0b'}
                />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="analytics-chart-empty">
              <span>{t('adminAnalytics.market.emptyRadar', { defaultValue: `No records for this timeframe.` })}</span>
            </div>
          )}
        </AnalyticsChartPanel>

        {/* Opportunity Details Table */}
        <section className="analytics-panel">
          <header className="analytics-panel-header">
            <div className="analytics-panel-titles">
              <h2>{opportunityMode === 'skill' ? t('adminAnalytics.market.talentDeficitTitle', { defaultValue: 'Talent Deficit Breakdown' }) : t('adminAnalytics.market.searchGapsTitle', { defaultValue: 'Search Result Gaps' })}</h2>
              <p className="analytics-panel-subtitle">
                {opportunityMode === 'skill'
                  ? t('adminAnalytics.market.talentDeficitSubtitle', { defaultValue: 'Compare open hiring demand directly with verified talent supply.' })
                  : t('adminAnalytics.market.searchGapsSubtitle', { defaultValue: 'Examine high-intent search terms with insufficient catalog matches.' })}
              </p>
            </div>
          </header>

          <div className="analytics-table-wrap">
            <table>
              <thead>
                {opportunityMode === 'skill' ? (
                  <tr>
                    <th>{t('adminAnalytics.market.skillFocus', { defaultValue: 'Skill Focus' })}</th>
                    <th className="text-right">{t('adminAnalytics.market.gapScore', { defaultValue: 'Gap Score' })}</th>
                    <th className="text-right">{t('adminAnalytics.market.openJobs', { defaultValue: 'Open Jobs' })}</th>
                    <th className="text-right">{t('adminAnalytics.market.talent', { defaultValue: 'Talent' })}</th>
                    <th className="text-right">{t('adminAnalytics.market.proposals', { defaultValue: 'Proposals' })}</th>
                    <th className="text-right">{t('adminAnalytics.market.contracts', { defaultValue: 'Contracts' })}</th>
                    <th>{t('adminAnalytics.market.marketDiagnostic', { defaultValue: 'Market Diagnostic' })}</th>
                  </tr>
                ) : (
                  <tr>
                    <th>{t('adminAnalytics.market.queryTerm', { defaultValue: 'Query Term' })}</th>
                    <th className="text-right">{t('adminAnalytics.market.gapScore', { defaultValue: 'Gap Score' })}</th>
                    <th className="text-right">{t('adminAnalytics.market.searches', { defaultValue: 'Searches' })}</th>
                    <th className="text-right">{t('adminAnalytics.market.avgResults', { defaultValue: 'Avg Results' })}</th>
                    <th className="text-right">{t('adminAnalytics.market.zeroRate', { defaultValue: 'Zero Rate' })}</th>
                    <th>{t('adminAnalytics.market.marketDiagnostic', { defaultValue: 'Market Diagnostic' })}</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {opportunities.map(item => {
                  const search = searchDetails.get(item.label.toLocaleLowerCase());
                  const zeroRate =
                    search && search.searches > 0
                      ? (search.zeroResultSearches * 100) / search.searches
                      : 0;

                  return opportunityMode === 'skill' ? (
                    <tr key={`${item.kind}-${item.key}`}>
                      <td>
                        <strong className="text-text-primary">{item.label}</strong>
                      </td>
                      <td className="text-right font-mono font-black text-brand">
                        {formatNumber(item.score)}
                      </td>
                      <td className="text-right font-mono">{item.demand}</td>
                      <td className="text-right font-mono">{item.supply}</td>
                      <td className="text-right font-mono">{item.proposalCount}</td>
                      <td className="text-right font-mono text-emerald-500 font-semibold">{item.contractCount}</td>
                      <td className="analytics-opportunity-meaning">{opportunityMeaning(item)}</td>
                    </tr>
                  ) : (
                    <tr key={`${item.kind}-${item.key}`}>
                      <td>
                        <strong className="text-text-primary">{item.label}</strong>
                      </td>
                      <td className="text-right font-mono font-black text-amber-500">
                        {formatNumber(item.score)}
                      </td>
                      <td className="text-right font-mono">{item.demand.toLocaleString()}</td>
                      <td className="text-right font-mono">{formatNumber(item.resultCount)}</td>
                      <td className="text-right font-mono font-bold text-rose-500">
                        {formatNumber(zeroRate)}%
                      </td>
                      <td className="analytics-opportunity-meaning">{opportunityMeaning(item)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <AnalyticsPagination
            page={opportunityPagination.page}
            pageCount={opportunityPagination.pageCount}
            from={opportunityPagination.from}
            to={opportunityPagination.to}
            total={filteredOpportunities.length}
            onPage={opportunityPagination.setPage}
            noun={opportunityMode === 'skill' ? 'skills' : 'queries'}
          />
        </section>
      </div>
    </div>
  );
}

export default AdminMarketplaceTab;
