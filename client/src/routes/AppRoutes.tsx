import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell.js';
import { HomePage } from '../pages/HomePage.js';
import { DiscoverPage } from '../pages/DiscoverPage.js';
import { LibraryPage } from '../pages/LibraryPage.js';
import { ProfilePage } from '../pages/ProfilePage.js';
import { SearchPage } from '../pages/SearchPage.js';
import { LoginPage } from '../pages/LoginPage.js';
import { SignupPage } from '../pages/SignupPage.js';
import { OnboardingPage } from '../pages/OnboardingPage.js';
import { AnalyticsPage } from '../pages/AnalyticsPage.js';
import { PlaceholderPage } from '../pages/PlaceholderPage.js';
import { NotFoundPage } from '../pages/NotFoundPage.js';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* Default Redirect */}
        <Route path="/" element={<Navigate to="/home" replace />} />

        {/* Primary Core Navigation */}
        <Route path="/home" element={<HomePage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        {/* Stage 9 Analytics & Evaluation */}
        <Route path="/analytics" element={<AnalyticsPage />} />

        {/* Authentication & Onboarding Routes (Stage 4 & Stage 8) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* Active Stage 3 Music Catalogue Search */}
        <Route path="/search" element={<SearchPage />} />
        <Route path="/player" element={<PlaceholderPage />} />
        <Route path="/playlist/:id" element={<PlaceholderPage />} />
        <Route path="/song/:id" element={<PlaceholderPage />} />
        <Route path="/recommendations" element={<PlaceholderPage />} />

        {/* 404 Catch-All */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
