import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Headphones,
  Clock,
  Music,
  Star,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Layers,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.js';
import { Card } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { useAuth } from '../contexts/AuthContext.js';
import { analyticsService } from '../services/analyticsService.js';
import type {
  UserListeningAnalyticsDto,
  RecommendationAnalyticsDto,
  StrategyComparisonDto,
  FeedbackSummaryDto,
} from '../types/index.js';

type ActiveTab = 'listening' | 'recommendations' | 'evaluation' | 'feedback';

export const AnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('listening');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analytics states
  const [userStats, setUserStats] = useState<UserListeningAnalyticsDto | null>(null);
  const [recStats, setRecStats] = useState<RecommendationAnalyticsDto | null>(null);
  const [evaluationData, setEvaluationData] = useState<StrategyComparisonDto | null>(null);
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummaryDto | null>(null);

  // Feedback form state
  const [moodFeedbackMood, setMoodFeedbackMood] = useState('energetic');
  const [moodRating, setMoodRating] = useState<number>(5);
  const [moodSubmitted, setMoodSubmitted] = useState(false);

  const [explanationReasonType, setExplanationReasonType] = useState('genre');
  const [explanationRating, setExplanationRating] = useState<number>(5);
  const [explanationSubmitted, setExplanationSubmitted] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [uStats, rStats, evalData, fbData] = await Promise.allSettled([
          analyticsService.getUserAnalytics(),
          analyticsService.getRecommendationAnalytics(),
          analyticsService.getEvaluation('all', 10),
          analyticsService.getFeedbackSummary(),
        ]);

        if (uStats.status === 'fulfilled') setUserStats(uStats.value);
        if (rStats.status === 'fulfilled') setRecStats(rStats.value);
        if (evalData.status === 'fulfilled') setEvaluationData(evalData.value as StrategyComparisonDto);
        if (fbData.status === 'fulfilled') setFeedbackSummary(fbData.value);
      } catch (err: any) {
        setError(err.message || 'Failed to load analytics data.');
      } finally {
        setLoading(false);
      }
    }

    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, authLoading]);

  const handleMoodSubmit = async () => {
    try {
      await analyticsService.submitMoodFeedback({
        recommendationRequestId: 'ui-feedback-' + Date.now(),
        mood: moodFeedbackMood,
        rating: moodRating,
      });
      setMoodSubmitted(true);
      // Refresh summary
      const updated = await analyticsService.getFeedbackSummary();
      setFeedbackSummary(updated);
      setTimeout(() => setMoodSubmitted(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to submit feedback');
    }
  };

  const handleExplanationSubmit = async () => {
    try {
      await analyticsService.submitExplanationFeedback({
        recommendationRequestId: 'ui-feedback-' + Date.now(),
        reasonType: explanationReasonType,
        rating: explanationRating,
      });
      setExplanationSubmitted(true);
      // Refresh summary
      const updated = await analyticsService.getFeedbackSummary();
      setFeedbackSummary(updated);
      setTimeout(() => setExplanationSubmitted(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to submit feedback');
    }
  };

  if (!isAuthenticated && !authLoading) {
    return (
      <PageContainer>
        <Card className="text-center py-12 px-6">
          <Headphones className="w-12 h-12 text-brand-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-content-primary mb-2">Analytics & Evaluation</h2>
          <p className="text-sm text-content-secondary max-w-sm mx-auto mb-6">
            Sign in to inspect your telemetry, recommendation conversion metrics, and academic offline benchmarks.
          </p>
          <Button variant="primary" onClick={() => navigate('/login')}>
            Sign In
          </Button>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <Badge variant="brand" size="sm">
            Stage 9 • Evaluation & Analytics
          </Badge>
          <span className="text-[11px] text-content-muted font-mono">NoSQL Telemetry</span>
        </div>
        <h1 className="text-2xl font-bold text-content-primary">System Analytics</h1>
        <p className="text-xs text-content-secondary mt-1">
          Server-side MongoDB aggregation & reproducible offline recommendation evaluation.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-surface rounded-xl p-1 mb-5 border border-surface-border">
        <button
          onClick={() => setActiveTab('listening')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'listening'
              ? 'bg-brand-500 text-white shadow'
              : 'text-content-secondary hover:text-content-primary'
          }`}
        >
          Your Listening
        </button>
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'recommendations'
              ? 'bg-brand-500 text-white shadow'
              : 'text-content-secondary hover:text-content-primary'
          }`}
        >
          Recommendations
        </button>
        <button
          onClick={() => setActiveTab('evaluation')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'evaluation'
              ? 'bg-brand-500 text-white shadow'
              : 'text-content-secondary hover:text-content-primary'
          }`}
        >
          Offline Benchmarks
        </button>
        <button
          onClick={() => setActiveTab('feedback')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'feedback'
              ? 'bg-brand-500 text-white shadow'
              : 'text-content-secondary hover:text-content-primary'
          }`}
        >
          Feedback
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-28 rounded-card bg-surface/50 border border-surface-border animate-pulse" />
          <div className="h-44 rounded-card bg-surface/50 border border-surface-border animate-pulse" />
        </div>
      ) : error ? (
        <Card className="p-4 border-vibe-rose/30 bg-vibe-rose/10 text-vibe-rose text-xs">
          <div className="flex items-center gap-2 mb-1 font-semibold">
            <AlertCircle className="w-4 h-4" />
            <span>Analytics Loading Error</span>
          </div>
          <p>{error}</p>
        </Card>
      ) : (
        <>
          {/* TAB 1: YOUR LISTENING */}
          {activeTab === 'listening' && (
            <div className="space-y-4">
              {/* Stat Highlights */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-3.5 bg-surface/60 border-surface-border">
                  <div className="flex items-center gap-1.5 text-content-muted text-[11px] mb-1">
                    <Headphones className="w-3.5 h-3.5 text-brand-400" />
                    <span>Total Plays</span>
                  </div>
                  <div className="text-xl font-bold text-content-primary">
                    {userStats?.totalPlays ?? 0}
                  </div>
                  <div className="text-[10px] text-content-muted mt-1">
                    {userStats?.completedTracks ?? 0} full completions
                  </div>
                </Card>

                <Card className="p-3.5 bg-surface/60 border-surface-border">
                  <div className="flex items-center gap-1.5 text-content-muted text-[11px] mb-1">
                    <Clock className="w-3.5 h-3.5 text-brand-400" />
                    <span>Listening Time</span>
                  </div>
                  <div className="text-xl font-bold text-content-primary">
                    {userStats?.listeningMinutes ?? 0} <span className="text-xs font-normal">min</span>
                  </div>
                  <div className="text-[10px] text-content-muted mt-1">
                    {userStats?.averageCompletionPercent ?? 0}% avg progress
                  </div>
                </Card>

                <Card className="p-3.5 bg-surface/60 border-surface-border">
                  <div className="flex items-center gap-1.5 text-content-muted text-[11px] mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-vibe-emerald" />
                    <span>Completion Rate</span>
                  </div>
                  <div className="text-xl font-bold text-content-primary">
                    {userStats?.completionRate ?? 0}%
                  </div>
                  <div className="text-[10px] text-content-muted mt-1">
                    Skip rate: {userStats?.skipRate ?? 0}%
                  </div>
                </Card>

                <Card className="p-3.5 bg-surface/60 border-surface-border">
                  <div className="flex items-center gap-1.5 text-content-muted text-[11px] mb-1">
                    <Music className="w-3.5 h-3.5 text-brand-400" />
                    <span>Repertoire</span>
                  </div>
                  <div className="text-xl font-bold text-content-primary">
                    {userStats?.uniqueSongs ?? 0}
                  </div>
                  <div className="text-[10px] text-content-muted mt-1">
                    Across {userStats?.uniqueArtists ?? 0} unique artists
                  </div>
                </Card>
              </div>

              {/* Top Genres */}
              <Card className="p-4 bg-surface/60 border-surface-border">
                <h3 className="text-xs font-bold text-content-primary mb-3 uppercase tracking-wider">
                  Top Discovered Genres
                </h3>
                {userStats?.topGenres && userStats.topGenres.length > 0 ? (
                  <div className="space-y-2">
                    {userStats.topGenres.map((g, idx) => {
                      const maxPlays = userStats.topGenres[0]?.playCount || 1;
                      const pct = Math.round((g.playCount / maxPlays) * 100);
                      return (
                        <div key={idx}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-content-secondary capitalize">{g.genre}</span>
                            <span className="text-content-muted">{g.playCount} plays</span>
                          </div>
                          <div className="w-full h-1.5 bg-surface-border rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-500 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-content-muted">No genre listening data recorded yet.</p>
                )}
              </Card>

              {/* Time of Day Distribution */}
              <Card className="p-4 bg-surface/60 border-surface-border">
                <h3 className="text-xs font-bold text-content-primary mb-3 uppercase tracking-wider">
                  Listening by Time of Day
                </h3>
                {userStats?.timeOfDayDistribution ? (
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {['morning', 'afternoon', 'evening', 'late_night'].map((tod) => {
                      const count = userStats.timeOfDayDistribution[tod] || 0;
                      return (
                        <div key={tod} className="p-2 bg-surface-border/30 rounded-lg">
                          <div className="text-sm font-bold text-content-primary">{count}</div>
                          <div className="text-[10px] text-content-muted capitalize mt-0.5">
                            {tod.replace('_', ' ')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-content-muted">No temporal distribution available.</p>
                )}
              </Card>

              {/* Recent Activity */}
              {userStats?.recentActivity && userStats.recentActivity.length > 0 && (
                <Card className="p-4 bg-surface/60 border-surface-border">
                  <h3 className="text-xs font-bold text-content-primary mb-3 uppercase tracking-wider">
                    Recent Telemetry Events
                  </h3>
                  <div className="divide-y divide-surface-border/50">
                    {userStats.recentActivity.map((act, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between text-xs">
                        <div className="truncate pr-2">
                          <p className="font-medium text-content-primary truncate">{act.title || 'Track'}</p>
                          <p className="text-[10px] text-content-muted truncate">{act.artistName}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <Badge
                            variant={
                              act.eventType === 'complete'
                                ? 'emerald'
                                : act.eventType === 'skip'
                                ? 'rose'
                                : 'brand'
                            }
                            size="sm"
                          >
                            {act.eventType}
                          </Badge>
                          {act.completionPercent !== undefined && (
                            <div className="text-[10px] text-content-muted mt-0.5">
                              {act.completionPercent}%
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* TAB 2: RECOMMENDATION PERFORMANCE */}
          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              {/* CTR and Conversion Cards */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-3.5 bg-surface/60 border-surface-border">
                  <div className="text-content-muted text-[11px] mb-1">Play-Through Rate</div>
                  <div className="text-xl font-bold text-brand-400">
                    {recStats?.playThroughRate ?? 0}%
                  </div>
                  <div className="text-[10px] text-content-muted mt-1">
                    {recStats?.recommendationPlays ?? 0} plays / {recStats?.recommendationImpressions ?? 0} views
                  </div>
                </Card>

                <Card className="p-3.5 bg-surface/60 border-surface-border">
                  <div className="text-content-muted text-[11px] mb-1">Rec Completion Rate</div>
                  <div className="text-xl font-bold text-vibe-emerald">
                    {recStats?.recommendationCompletionRate ?? 0}%
                  </div>
                  <div className="text-[10px] text-content-muted mt-1">
                    Skip rate: {recStats?.recommendationSkipRate ?? 0}%
                  </div>
                </Card>
              </div>

              <Card className="p-3.5 bg-surface/60 border-surface-border">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-content-secondary">
                    Average Position Before Click
                  </div>
                  <div className="text-sm font-bold text-content-primary">
                    Position #{recStats?.averagePositionBeforePlay ?? 0}
                  </div>
                </div>
              </Card>

              {/* Mood Performance */}
              {recStats?.moodPerformance && Object.keys(recStats.moodPerformance).length > 0 && (
                <Card className="p-4 bg-surface/60 border-surface-border">
                  <h3 className="text-xs font-bold text-content-primary mb-3 uppercase tracking-wider">
                    Performance by Active Mood
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(recStats.moodPerformance).map(([mood, data]) => (
                      <div key={mood} className="p-2.5 bg-surface-border/20 rounded-lg">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold capitalize text-content-primary">{mood}</span>
                          <span className="font-bold text-brand-400">{data.ctr}% CTR</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-content-muted mt-1">
                          <span>{data.impressions} impressions</span>
                          <span>{data.plays} plays</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Top Clicked Recommendations */}
              {recStats?.topClickedRecommendations && recStats.topClickedRecommendations.length > 0 && (
                <Card className="p-4 bg-surface/60 border-surface-border">
                  <h3 className="text-xs font-bold text-content-primary mb-3 uppercase tracking-wider">
                    Most Played Recommendations
                  </h3>
                  <div className="divide-y divide-surface-border/50">
                    {recStats.topClickedRecommendations.map((item, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between text-xs">
                        <div className="truncate pr-2">
                          <p className="font-medium text-content-primary truncate">{item.title}</p>
                          <p className="text-[10px] text-content-muted truncate">{item.artistName}</p>
                        </div>
                        <Badge variant="brand" size="sm">
                          {item.plays} plays
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* TAB 3: OFFLINE BENCHMARKS */}
          {activeTab === 'evaluation' && (
            <div className="space-y-4">
              <div className="p-3 rounded-card bg-surface/40 border border-surface-border text-xs text-content-secondary leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-brand-400 mb-1">
                  <Layers className="w-4 h-4" />
                  <span>Academic Methodology</span>
                </div>
                Temporal train/test split. Evaluation uses only historical data before split date to strictly eliminate future data leakage. No fabricated metrics are reported.
              </div>

              {evaluationData?.insufficientData ? (
                <Card className="p-6 text-center bg-surface/60 border-surface-border">
                  <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-content-primary mb-1">
                    Not Enough Listening Data Yet
                  </h3>
                  <p className="text-xs text-content-muted max-w-xs mx-auto mb-3">
                    {evaluationData.message || 'Offline evaluation requires a minimum of 3 training interactions and 1 held-out test event per user.'}
                  </p>
                  <p className="text-[11px] text-content-secondary font-mono">
                    Eligible users: {evaluationData.eligibleUsersCount}
                  </p>
                </Card>
              ) : evaluationData?.strategies ? (
                <div className="overflow-x-auto -mx-4 px-4 pb-2">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-surface-border text-content-muted uppercase tracking-wider text-[10px]">
                        <th className="py-2 pr-3">Metric</th>
                        <th className="py-2 px-2 text-center">R0 (Pop)</th>
                        <th className="py-2 px-2 text-center">R1 (Cont)</th>
                        <th className="py-2 px-2 text-center">R2 (Beh)</th>
                        <th className="py-2 px-2 text-center">R3 (Ctx)</th>
                        <th className="py-2 px-2 text-center font-bold text-brand-400">R4 (Hyb)</th>
                        <th className="py-2 pl-2 text-center font-bold text-purple-400">R5 (Collab)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border/40 text-content-secondary">
                      {[
                        { label: 'Precision@10', key: 'precisionAtK' },
                        { label: 'Recall@10', key: 'recallAtK' },
                        { label: 'HitRate@10', key: 'hitRateAtK' },
                        { label: 'NDCG@10', key: 'ndcgAtK' },
                        { label: 'Diversity (ILD)', key: 'diversity' },
                        { label: 'Novelty@10', key: 'novelty' },
                        { label: 'Catalog Coverage', key: 'catalogCoverage' },
                        { label: 'Collab Coverage', key: 'collaborativeCoverage' },
                      ].map((row) => (
                        <tr key={row.key} className="hover:bg-surface/30">
                          <td className="py-2.5 pr-3 font-medium text-content-primary">{row.label}</td>
                          {['R0_popularity', 'R1_content', 'R2_behaviour', 'R3_context', 'R4_hybrid', 'R5_collaborative_hybrid'].map(
                            (strat) => {
                              const stratObj = (evaluationData.strategies[strat] || (strat === 'R5_collaborative_hybrid' ? evaluationData.strategies['collaborativeHybrid'] : undefined)) as any;
                              const val = stratObj?.[row.key];
                              return (
                                <td
                                  key={strat}
                                  className={`py-2.5 px-2 text-center font-mono ${
                                    strat === 'R5_collaborative_hybrid'
                                      ? 'font-bold text-purple-400'
                                      : strat === 'R4_hybrid'
                                      ? 'font-bold text-brand-400'
                                      : ''
                                  }`}
                                >
                                  {val !== undefined ? Number(val).toFixed(2) : '—'}
                                </td>
                              );
                            }
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-3 p-3 rounded-card bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-200 leading-relaxed">
                    <strong>Note:</strong> Collaborative recommendations use anonymized aggregate listening patterns from users with similar tastes. Individual listener identities and private histories are strictly protected.
                  </div>
                </div>
              ) : (
                <Card className="p-4 text-center text-xs text-content-muted">
                  No benchmark results available.
                </Card>
              )}
            </div>
          )}

          {/* TAB 4: SUBJECTIVE FEEDBACK */}
          {activeTab === 'feedback' && (
            <div className="space-y-4">
              {/* Mood Feedback Form */}
              <Card className="p-4 bg-surface/60 border-surface-border">
                <h3 className="text-xs font-bold text-content-primary mb-2 uppercase tracking-wider">
                  Rate Mood Relevance
                </h3>
                <p className="text-xs text-content-muted mb-3">
                  Did TuneSense's recommendations match your desired emotional state?
                </p>

                <div className="flex gap-2 mb-3">
                  {['energetic', 'calm', 'focus', 'melancholic'].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMoodFeedbackMood(m)}
                      className={`px-2.5 py-1 text-xs rounded-md capitalize transition-all ${
                        moodFeedbackMood === m
                          ? 'bg-brand-500 text-white font-semibold'
                          : 'bg-surface-border/40 text-content-secondary'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setMoodRating(star)}
                      className="p-1 text-amber-400 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          moodRating >= star ? 'fill-amber-400' : 'text-surface-border'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs text-content-muted ml-2 font-mono">{moodRating} / 5</span>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleMoodSubmit}
                  disabled={moodSubmitted}
                >
                  {moodSubmitted ? 'Submitted!' : 'Submit Mood Rating'}
                </Button>
              </Card>

              {/* Explanation Feedback Form */}
              <Card className="p-4 bg-surface/60 border-surface-border">
                <h3 className="text-xs font-bold text-content-primary mb-2 uppercase tracking-wider">
                  Rate Explanation Helpfulness
                </h3>
                <p className="text-xs text-content-muted mb-3">
                  Did the rationale ("Because you enjoy...") improve your trust?
                </p>

                <div className="flex gap-2 mb-3">
                  {['genre', 'artist', 'recentTaste', 'context'].map((rt) => (
                    <button
                      key={rt}
                      onClick={() => setExplanationReasonType(rt)}
                      className={`px-2.5 py-1 text-xs rounded-md capitalize transition-all ${
                        explanationReasonType === rt
                          ? 'bg-brand-500 text-white font-semibold'
                          : 'bg-surface-border/40 text-content-secondary'
                      }`}
                    >
                      {rt}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setExplanationRating(star)}
                      className="p-1 text-amber-400 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          explanationRating >= star ? 'fill-amber-400' : 'text-surface-border'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs text-content-muted ml-2 font-mono">{explanationRating} / 5</span>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleExplanationSubmit}
                  disabled={explanationSubmitted}
                >
                  {explanationSubmitted ? 'Submitted!' : 'Submit Explanation Rating'}
                </Button>
              </Card>

              {/* Feedback Summary */}
              {feedbackSummary && (
                <Card className="p-4 bg-surface/60 border-surface-border">
                  <h3 className="text-xs font-bold text-content-primary mb-3 uppercase tracking-wider">
                    Community Feedback Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-surface-border/20 rounded-lg">
                      <div className="text-content-muted text-[11px]">Avg Mood Rating</div>
                      <div className="text-base font-bold text-amber-400 mt-0.5">
                        {feedbackSummary.moodFeedback.averageScore.toFixed(1)} / 5.0
                      </div>
                      <div className="text-[10px] text-content-muted mt-0.5">
                        {feedbackSummary.moodFeedback.totalRatings} ratings
                      </div>
                    </div>

                    <div className="p-2.5 bg-surface-border/20 rounded-lg">
                      <div className="text-content-muted text-[11px]">Avg Explanation Trust</div>
                      <div className="text-base font-bold text-amber-400 mt-0.5">
                        {feedbackSummary.explanationFeedback.averageScore.toFixed(1)} / 5.0
                      </div>
                      <div className="text-[10px] text-content-muted mt-0.5">
                        {feedbackSummary.explanationFeedback.totalRatings} ratings
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
};
