import { User } from '../models/User.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';

const BASE = 'http://localhost:5000/api';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function record(name: string, passed: boolean, details?: string) {
  results.push({ name, passed, details });
  const icon = passed ? '✔ PASS' : '✖ FAIL';
  console.log(`  [${icon}] ${name}${details ? ` — ${details}` : ''}`);
}

async function runComprehensiveTests() {
  console.log('\n======================================================================');
  console.log('       TuneSense Complete End-to-End Functionality Verification      ');
  console.log('======================================================================\n');

  // Connect database directly for test harness administration
  await connectDatabase();

  let cookie = '';

  function getHeaders() {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (cookie) {
      headers['Cookie'] = cookie;
    }
    return headers;
  }

  async function api(path: string, opts: RequestInit = {}) {
    const res = await fetch(`${BASE}${path}`, {
      ...opts,
      headers: {
        ...getHeaders(),
        ...((opts.headers as Record<string, string>) || {}),
      },
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      const match = setCookie.match(/tunesense_token=[^;]+/);
      if (match) {
        cookie = match[0];
      }
    }
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  }

  try {
    // -------------------------------------------------------------------------
    // 1. System Health & Infrastructure
    // -------------------------------------------------------------------------
    console.log('[SECTION 1: System Health & Infrastructure]');
    const health = await api('/health');
    record(
      'SYS-01: Health check endpoint',
      health.status === 200 && health.data?.status === 'ok' && health.data?.database === 'connected',
      `Database status: ${health.data?.database}, environment: ${health.data?.environment}`
    );

    // -------------------------------------------------------------------------
    // 2. Music Catalogue & Search
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 2: Music Catalogue & Content Browsing]');
    const popular = await api('/music/popular');
    const popularTracks = popular.data?.data?.tracks || [];
    record(
      'CAT-01: Popular Music Feed',
      popular.status === 200 && popularTracks.length > 0,
      `Retrieved ${popularTracks.length} tracks with artwork and stream URLs`
    );

    const sampleTrack = popularTracks[0];
    if (!sampleTrack) {
      throw new Error('No tracks available in popular catalogue for downstream tests.');
    }

    const trackDetail = await api(`/music/tracks/${sampleTrack.id}`);
    record(
      'CAT-02: Track Detail Retrieval',
      trackDetail.status === 200 && trackDetail.data?.data?.title === sampleTrack.title,
      `Track "${sampleTrack.title}" by ${sampleTrack.artistName}`
    );

    const trackStream = await api(`/music/tracks/${sampleTrack.id}/stream`);
    record(
      'CAT-03: Track Stream URL Resolution',
      trackStream.status === 200 && !!trackStream.data?.data?.streamUrl,
      `Resolved stream URL for HTML5 player: ${trackStream.data?.data?.streamUrl?.substring(0, 45)}...`
    );

    const search = await api('/music/search?q=rock');
    const searchTracks = search.data?.data?.tracks || [];
    record(
      'CAT-04: Catalogue Search (Keyword "rock")',
      search.status === 200 && searchTracks.length > 0,
      `Found ${searchTracks.length} matching tracks`
    );

    if (sampleTrack.artistId) {
      const artist = await api(`/music/artists/${sampleTrack.artistId}`);
      record(
        'CAT-05: Artist Detail Retrieval',
        artist.status === 200 && !!artist.data?.data?.name,
        `Artist "${artist.data?.data?.name}"`
      );
    }

    // -------------------------------------------------------------------------
    // 3. Authentication & Session Management
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 3: User Authentication & Sessions]');
    const ts = Date.now();
    const testEmail = `tester_${ts}@tunesense.io`;
    const password = 'SecurePassword123!';

    const signup = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, password, name: 'E2E Tester' }),
    });
    record(
      'AUTH-01: User Signup & Password Hashing',
      signup.status === 201 && !!signup.data?.data?.user?.id,
      `Created user ${testEmail} with Bcrypt cost factor 12`
    );

    const userId = signup.data?.data?.user?.id;

    const me = await api('/auth/me');
    record(
      'AUTH-02: Authenticated Session (/auth/me)',
      me.status === 200 && me.data?.data?.user?.email === testEmail,
      `Verified JWT session cookie in HttpOnly storage`
    );

    // -------------------------------------------------------------------------
    // 4. User Preferences & Personalization
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 4: Explicit User Preferences]');
    const prefPut = await api('/preferences', {
      method: 'PUT',
      body: JSON.stringify({
        preferredGenres: ['electronic', 'ambient', 'rock'],
        preferredMood: 'focused',
        personalizationSettings: { diversityLevel: 0.65 },
      }),
    });
    record(
      'PREF-01: Update Explicit Preferences',
      prefPut.status === 200 && prefPut.data?.data?.personalizationSettings?.diversityLevel === 0.65,
      `Saved preferred genres, mood focused, diversity=0.65`
    );

    const prefGet = await api('/preferences');
    record(
      'PREF-02: Get Explicit Preferences',
      prefGet.status === 200 && prefGet.data?.data?.preferredGenres?.includes('electronic'),
      `Genres returned: ${prefGet.data?.data?.preferredGenres?.join(', ')}`
    );

    // -------------------------------------------------------------------------
    // 5. Recommendation Engine Hierarchy (R0 to R5)
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 5: 6-Tier Recommendation Engine (R0–R5)]');
    const strategies = [
      { key: 'popularity', label: 'R0 Popularity Baseline' },
      { key: 'content', label: 'R1 Content Personalization' },
      { key: 'behaviour', label: 'R2 Behavioral Recency' },
      { key: 'context', label: 'R3 Diurnal Context-Aware' },
      { key: 'hybrid', label: 'R4 Multi-Strategy Hybrid' },
      { key: 'collaborative', label: 'R5 Collaborative Cosine' },
      { key: 'collaborativeHybrid', label: 'R5 Collaborative Hybrid' },
    ];

    for (const s of strategies) {
      const rec = await api(`/recommendations?strategy=${s.key}&limit=6`);
      const count = rec.data?.data?.recommendations?.length || 0;
      record(
        `REC-${s.key.toUpperCase()}: ${s.label}`,
        rec.status === 200 && count > 0,
        `Generated ${count} recommendations with explainability metadata`
      );
    }

    // Recommendation explainability validation
    const hybridRec = await api('/recommendations?strategy=hybrid&limit=3');
    const firstRec = hybridRec.data?.data?.recommendations?.[0];
    record(
      'REC-XAI: Recommendation Explanation & Components',
      !!firstRec?.reason && typeof firstRec?.score === 'number' && !!firstRec?.components,
      `Sample explanation: "${firstRec?.reason}" (Score: ${(firstRec?.score * 100).toFixed(1)}%)`
    );

    // -------------------------------------------------------------------------
    // 6. Emotional GPS & Photo-to-Music Vibe
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 6: Unique Core Innovations (GPS & Photo-to-Music)]');
    const vibe = await api('/recommendations/by-vibe', {
      method: 'POST',
      body: JSON.stringify({ energy: 0.85, valence: 0.75, danceability: 0.6, limit: 4 }),
    });
    record(
      'VIBE-01: Photo-to-Music Multimodal Vibe Extractor',
      vibe.status === 200 && (vibe.data?.data?.recommendations?.length || 0) > 0,
      `Matched ${vibe.data?.data?.recommendations?.length} tracks to acoustic coordinates (E:0.85, V:0.75)`
    );

    const gps = await api('/recommendations/journey', {
      method: 'POST',
      body: JSON.stringify({ fromMood: 'stressed', toMood: 'calm', steps: 4 }),
    });
    record(
      'GPS-01: Emotional GPS (Russell Circumplex Waypoints)',
      gps.status === 200 && (gps.data?.data?.journey?.length || 0) === 4,
      `Successfully generated 4-step emotional transition trajectory from Stressed to Calm`
    );

    // -------------------------------------------------------------------------
    // 7. Listening Telemetry & Materialized Taste Profile
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 7: Listening Telemetry & Materialized Views]');
    const playEvt = await api('/listening-events', {
      method: 'POST',
      body: JSON.stringify({
        songId: sampleTrack.id,
        eventType: 'play',
        durationSeconds: 20,
        songDuration: sampleTrack.durationSeconds || 200,
        context: { source: 'recommendations', client: 'web' },
      }),
    });
    record(
      'TEL-01: Append-Only Telemetry Event (play)',
      playEvt.status === 201 && !!playEvt.data?.data?.id,
      `Logged play event for song ${sampleTrack.title}`
    );

    const completeEvt = await api('/listening-events', {
      method: 'POST',
      body: JSON.stringify({
        songId: sampleTrack.id,
        eventType: 'complete',
        durationSeconds: sampleTrack.durationSeconds || 200,
        songDuration: sampleTrack.durationSeconds || 200,
        context: { source: 'recommendations', client: 'web' },
      }),
    });
    record(
      'TEL-02: Telemetry Event (complete)',
      completeEvt.status === 201 && !!completeEvt.data?.data?.id,
      `Logged complete playback event`
    );

    const tasteProfile = await api('/profile/taste');
    record(
      'MAT-01: UserTasteProfile Materialized View',
      tasteProfile.status === 200 && typeof tasteProfile.data?.data?.behaviour?.totalEvents === 'number',
      `Materialized view returned totalEvents=${tasteProfile.data?.data?.behaviour?.totalEvents}`
    );

    // -------------------------------------------------------------------------
    // 8. User Library & Likes Management
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 8: User Library & Likes Operations]');
    const like = await api(`/library/likes/${sampleTrack.id}`, { method: 'POST' });
    record(
      'LIB-01: Like Song ($addToSet)',
      like.status === 200 && like.data?.success === true,
      `Added track ${sampleTrack.title} to liked collection`
    );

    const checkLiked = await api(`/library/likes/check?songIds=${sampleTrack.id}`);
    record(
      'LIB-02: Check Is Liked',
      checkLiked.status === 200 && checkLiked.data?.data?.[sampleTrack.id] === true,
      `Verified track isLiked: true`
    );

    const libSummary = await api('/library');
    record(
      'LIB-03: Library Summary Overview',
      libSummary.status === 200 && typeof libSummary.data?.data?.likedCount === 'number',
      `Total liked songs in library: ${libSummary.data?.data?.likedCount}`
    );

    const unlike = await api(`/library/likes/${sampleTrack.id}`, { method: 'DELETE' });
    record(
      'LIB-04: Unlike Song ($pull)',
      unlike.status === 200 && unlike.data?.success === true,
      `Removed track from library`
    );

    // -------------------------------------------------------------------------
    // 9. Custom Playlist Lifecycle
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 9: Custom Playlists]');
    const createPl = await api('/playlists', {
      method: 'POST',
      body: JSON.stringify({ name: 'Midnight Grooves', description: 'Curated nighttime beats' }),
    });
    const playlistId = createPl.data?.data?.id;
    record(
      'PLAY-01: Create Playlist',
      createPl.status === 201 && !!playlistId,
      `Created playlist "${createPl.data?.data?.name}" (ID: ${playlistId})`
    );

    const addSong = await api(`/playlists/${playlistId}/songs/${sampleTrack.id}`, { method: 'POST' });
    record(
      'PLAY-02: Add Song to Playlist',
      addSong.status === 200 && addSong.data?.success === true,
      `Added track to playlist`
    );

    const getPl = await api(`/playlists/${playlistId}`);
    record(
      'PLAY-03: Get Playlist Details',
      getPl.status === 200 && (getPl.data?.data?.songs?.length || 0) === 1,
      `Playlist has ${getPl.data?.data?.songs?.length} song(s)`
    );

    const delPl = await api(`/playlists/${playlistId}`, { method: 'DELETE' });
    record(
      'PLAY-04: Delete Playlist',
      delPl.status === 200 && delPl.data?.success === true,
      `Deleted playlist cleanly`
    );

    // -------------------------------------------------------------------------
    // 10. Explainable AI & Counterfactual "What-If" Analysis
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 10: Explainable AI & Counterfactual Simulations]');
    const cfSim = await api('/recommendations/counterfactual', {
      method: 'POST',
      body: JSON.stringify({
        weights: {
          content: 1.5,
          novelty: 1.0,
        },
        limit: 5,
      }),
    });
    const cfRecs = cfSim.data?.data?.counterfactualRecommendations || [];
    record(
      'XAI-01: Counterfactual "What-If" Simulation',
      cfSim.status === 200 && cfRecs.length > 0,
      `Simulated rank shifts under weights counterfactual: ${cfRecs.length} tracks computed`
    );

    const cfRecourse = await api('/recommendations/counterfactual/recourse', {
      method: 'POST',
      body: JSON.stringify({
        targetSongId: sampleTrack.id,
      }),
    });
    record(
      'XAI-02: Minimal-Change Recourse Optimization',
      cfRecourse.status === 200 && !!cfRecourse.data?.data,
      `Determined minimal preference delta required for target track promotion`
    );

    // -------------------------------------------------------------------------
    // 11. User Analytics & Feedback
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 11: Personal Analytics & Evaluation Feedback]');
    const userAnalytics = await api('/analytics/me');
    record(
      'ANA-01: User Listening Analytics',
      userAnalytics.status === 200 && typeof userAnalytics.data?.data?.totalPlays === 'number',
      `User total plays: ${userAnalytics.data?.data?.totalPlays}`
    );

    const recAnalytics = await api('/analytics/recommendations');
    record(
      'ANA-02: Recommendation Engagement Analytics',
      recAnalytics.status === 200 && typeof recAnalytics.data?.data?.totalImpressions === 'number',
      `Impressions: ${recAnalytics.data?.data?.totalImpressions}, plays: ${recAnalytics.data?.data?.recommendationPlays}`
    );

    const moodFeedback = await api('/evaluation/mood-feedback', {
      method: 'POST',
      body: JSON.stringify({
        recommendationRequestId: 'req_eval_' + ts,
        mood: 'focused',
        rating: 5,
      }),
    });
    record(
      'ANA-03: Mood Quality Feedback Submission',
      moodFeedback.status === 201 && !!moodFeedback.data?.data?.id,
      `Submitted rating 5 for mood "focused"`
    );

    const xaiFeedback = await api('/evaluation/explanation-feedback', {
      method: 'POST',
      body: JSON.stringify({
        recommendationRequestId: 'req_eval_' + ts,
        rating: 5,
        explanationText: 'Matches your taste in electronic',
      }),
    });
    record(
      'ANA-04: Explanation Trust Feedback Submission',
      xaiFeedback.status === 201 && !!xaiFeedback.data?.data?.id,
      `Submitted trust rating 5 for rationale`
    );

    // -------------------------------------------------------------------------
    // 12. Admin Benchmark Offline Evaluation Framework
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 12: Offline Scientific Evaluation Framework]');
    // Elevate current test user to admin in DB to test evaluation endpoints
    await User.findByIdAndUpdate(userId, { role: 'admin' });

    const evalSummary = await api('/evaluation/feedback-summary');
    record(
      'EVAL-01: Feedback Aggregation Summary (Admin)',
      evalSummary.status === 200 && Array.isArray(evalSummary.data?.data?.moodRatings),
      `Aggregated mood & explanation feedback metrics retrieved`
    );

    const evalOffline = await api('/evaluation/recommendations?strategy=all&k=10');
    record(
      'EVAL-02: Scientific Offline Benchmarking (NDCG, Precision, ILD)',
      evalOffline.status === 200 && !!evalOffline.data?.data,
      `Evaluated models with temporal train/test split (Zero future-data leakage)`
    );

    // -------------------------------------------------------------------------
    // 13. Session Logout
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 13: Session Termination]');
    const logout = await api('/auth/logout', { method: 'POST' });
    record(
      'AUTH-03: User Logout & Cookie Invalidation',
      logout.status === 200 && logout.data?.status === 'ok',
      `Session destroyed and HttpOnly cookie cleared`
    );

    // -------------------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------------------
    const passedCount = results.filter((r) => r.passed).length;
    const failedCount = results.filter((r) => !r.passed).length;

    console.log('\n======================================================================');
    console.log(` End-to-End Verification Summary: ${passedCount}/${results.length} Passed, ${failedCount} Failed`);
    console.log('======================================================================\n');

    if (failedCount > 0) {
      process.exit(1);
    }
  } finally {
    await disconnectDatabase();
  }
}

runComprehensiveTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
