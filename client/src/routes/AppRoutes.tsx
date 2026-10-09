import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell.js';
import { ProtectedRoute } from '../components/auth/ProtectedRoute.js';
import { LandingPage } from '../pages/LandingPage.js';
import { HomePage } from '../pages/HomePage.js';
import { DiscoverPage } from '../pages/DiscoverPage.js';
import { SearchPage } from '../pages/SearchPage.js';
import { SongDetailPage } from '../pages/SongDetailPage.js';
import { RecommendationsPage } from '../pages/RecommendationsPage.js';
import { LibraryPage } from '../pages/LibraryPage.js';
import { PlaylistPage } from '../pages/PlaylistPage.js';
import { ProfilePage } from '../pages/ProfilePage.js';
import { AnalyticsPage } from '../pages/AnalyticsPage.js';
import { LoginPage } from '../pages/LoginPage.js';
import { SignupPage } from '../pages/SignupPage.js';
import { OnboardingPage } from '../pages/OnboardingPage.js';
import { PlayerPage } from '../pages/PlayerPage.js';
import { NotFoundPage } from '../pages/NotFoundPage.js';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Landing Page for unauthenticated listeners */}
      <Route path="/" element={<LandingPage />} />

      {/* Main Application Shell */}
      <Route element={<AppShell />}>
        {/* Core Discovery & Browsing (accessible to all listeners) */}
        <Route path="/home" element={<HomePage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/song/:id" element={<SongDetailPage />} />
        <Route path="/player" element={<PlayerPage />} />

        {/* Authentication Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected User Routes (Require Authenticated Session) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/playlist/:id" element={<PlaylistPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Route>

        {/* 404 Catch-All */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
