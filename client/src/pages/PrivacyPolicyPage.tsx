import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, AlertCircle } from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.js';
import { Button } from '../components/ui/Button.js';

export const PrivacyPolicyPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageContainer className="py-6 sm:py-10">
      <div className="max-w-4xl mx-auto">
        {/* Navigation Bar */}
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="text-content-secondary hover:text-white"
          >
            Back
          </Button>
          <span className="text-xs text-content-muted">
            Last Updated: October 2026
          </span>
        </div>

        {/* Page Header */}
        <header className="mb-8 pb-6 border-b border-surface-border">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="w-8 h-8 rounded-xl bg-surface border border-surface-border flex items-center justify-center text-brand-400 shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">
              Legal Documentation
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-content-primary tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-content-secondary mt-2 leading-relaxed">
            This Privacy Policy describes the actual data collection, processing, and storage practices of TuneSense.
            This document reflects the verified implementation of our software systems and database models.
          </p>
        </header>

        {/* Notice of Unresolved Owner Details */}
        <div className="mb-8 p-4 rounded-xl bg-surface border border-surface-border text-xs text-content-secondary">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-content-primary">
                Operator Details Awaiting Owner Confirmation
              </p>
              <p>
                Certain formal administrative and jurisdictional entities are designated as pending configuration by the repository operator:
              </p>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-content-muted">
                <li>Legal Entity Name: <span className="text-content-primary">[Operator Legal Name - Pending Owner Configuration]</span></li>
                <li>Designated Contact Email: <span className="text-content-primary">[privacy@yourdomain.com - Pending Owner Configuration]</span></li>
                <li>Legal Jurisdiction: <span className="text-content-primary">[Operator Jurisdiction - Pending Owner Configuration]</span></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Policy Content Sections */}
        <div className="space-y-8 text-sm text-content-secondary leading-relaxed">
          {/* Section 1: Overview & Scope */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-content-primary tracking-tight">
              1. Overview & Principles
            </h2>
            <p>
              TuneSense is an explainable, personalized music discovery and recommendation application. To deliver context-aware music recommendations, manage personalized playlists, and generate taste profiles, TuneSense processes specific user information as detailed in this policy.
            </p>
            <p>
              We adhere to the principle of documenting only verified data processing mechanisms. We do not claim compliance with statutory frameworks (such as GDPR or CCPA) that have not undergone formal independent legal audit, nor do we state that user data is never shared if external infrastructure providers are actively involved in service delivery.
            </p>
          </section>

          {/* Section 2: Information Collected */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-content-primary tracking-tight">
              2. Information We Collect
            </h2>
            <p>
              When you interact with TuneSense, data is collected directly from your inputs and automatically through your playback interactions:
            </p>

            <div className="space-y-4 pt-1">
              <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
                <h3 className="text-xs font-bold text-content-primary uppercase tracking-wider mb-1.5">
                  A. Account & Credential Information
                </h3>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li><strong className="text-content-primary">Display Name:</strong> Stored to personalize interface elements and playlist authorship.</li>
                  <li><strong className="text-content-primary">Email Address:</strong> Normalized to lowercase, trimmed, and indexed uniquely for account identification and authentication.</li>
                  <li><strong className="text-content-primary">Password Security:</strong> Passwords submitted during registration or authentication are processed over HTTPS and one-way salted and hashed using bcrypt with 12 salt rounds (<code className="text-brand-300 bg-surface-secondary px-1 py-0.5 rounded">bcrypt.genSalt(12)</code>). Passwords are never stored in plaintext and are never encrypted via two-way reversible ciphers.</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
                <h3 className="text-xs font-bold text-content-primary uppercase tracking-wider mb-1.5">
                  B. Explicit Music Preferences
                </h3>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li><strong className="text-content-primary">Genres & Moods:</strong> Preferred, favorite, and disliked genres and moods submitted during onboarding or through your profile settings.</li>
                  <li><strong className="text-content-primary">Artists & Languages:</strong> Preferred and disliked artist identifiers, along with language preferences (defaults to English).</li>
                  <li><strong className="text-content-primary">Algorithmic Tuning Settings:</strong> Numeric tuning parameters for recommendation exploration level (0 to 1) and diversity level (0 to 1).</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
                <h3 className="text-xs font-bold text-content-primary uppercase tracking-wider mb-1.5">
                  C. Playback Telemetry & Listening Events
                </h3>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li><strong className="text-content-primary">Playback Actions:</strong> Discrete telemetry events recorded for <code className="text-brand-300">play</code>, <code className="text-brand-300">complete</code>, <code className="text-brand-300">skip</code>, and <code className="text-brand-300">pause</code>.</li>
                  <li><strong className="text-content-primary">Temporal Context:</strong> Time-of-day classification (morning, afternoon, evening, late_night, night) and day-of-week for context-aware recommendation weighting.</li>
                  <li><strong className="text-content-primary">Playback Metrics:</strong> Dwell duration in seconds, track completion rate (0 to 1), playback position, playback duration, and device type descriptor.</li>
                  <li><strong className="text-content-primary">Recommendation Impressions:</strong> Exposure logging capturing recommendation request identifiers, algorithmic strategy (R0 through R5), track position in recommendation trays, and acoustic matching scores.</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-surface border border-surface-border">
                <h3 className="text-xs font-bold text-content-primary uppercase tracking-wider mb-1.5">
                  D. Library & User Collections
                </h3>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li><strong className="text-content-primary">Liked Songs:</strong> Track identifiers associated with your user library.</li>
                  <li><strong className="text-content-primary">Playlists:</strong> Custom playlists created by you, including playlist name, optional description, ordered song identifiers (up to 500 songs per playlist), and public or private visibility flags.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3: Cookies & Authentication Tokens */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-content-primary tracking-tight">
              3. Cookies and Session Management
            </h2>
            <p>
              TuneSense utilizes a single functional cookie strictly required for authenticated session maintenance:
            </p>
            <div className="p-3.5 rounded-xl bg-surface border border-surface-border text-xs space-y-2">
              <p>
                <strong className="text-content-primary">Cookie Name:</strong> <code className="text-brand-300 bg-surface-secondary px-1 py-0.5 rounded">tunesense_token</code>
              </p>
              <p>
                <strong className="text-content-primary">Mechanism:</strong> The application uses a signed JSON Web Token (JWT) stored in an HTTP-only cookie. The token is cryptographically signed to help verify its integrity and authenticity. Signing does not, by itself, encrypt the token's contents.
              </p>
              <p>
                <strong className="text-content-primary">Security Attributes:</strong> Configured with <code className="text-brand-300">httpOnly: true</code> (inaccessible to client-side JavaScript to protect against XSS credential theft), <code className="text-brand-300">secure: true</code> in production environments (transmitted exclusively over HTTPS), and a 7-day expiration lifespan.
              </p>
              <p className="text-content-muted">
                TuneSense does not employ third-party advertising cookies, cross-site behavioral marketing pixels, or decorative consent trackers.
              </p>
            </div>
          </section>

          {/* Section 4: Third-Party Services & Hosting */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-content-primary tracking-tight">
              4. Third-Party Infrastructure and Content Providers
            </h2>
            <p>
              To deliver music discovery and streaming, TuneSense relies on the following infrastructure providers:
            </p>
            <ul className="list-disc list-inside space-y-2 text-xs">
              <li>
                <strong className="text-content-primary">MongoDB Atlas:</strong> Cloud database service providing persistent storage for user accounts, taste profiles, listening events, library likes, and playlist data.
              </li>
              <li>
                <strong className="text-content-primary">Jamendo API & Audio CDN:</strong> TuneSense catalogues and streams music licensed through Jamendo (Creative Commons). When streaming tracks or viewing album art, your browser requests audio files and image assets directly from Jamendo servers (<code className="text-brand-300">api.jamendo.com</code> and <code className="text-brand-300">usercontent.jamendo.com</code>). Your TuneSense account credentials, email, and password hashes are never transmitted to Jamendo.
              </li>
              <li>
                <strong className="text-content-primary">Hosting Platforms:</strong> The web client application is deployed on Vercel, and the API server is hosted on Render.
              </li>
            </ul>
          </section>

          {/* Section 5: Data Retention & Deletion */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-content-primary tracking-tight">
              5. Data Retention, Modification, and Deletion
            </h2>
            <p>
              We maintain data according to current technical capabilities implemented within the system:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs">
              <li>
                <strong className="text-content-primary">Self-Service Actions:</strong> You can modify your genre and artist preferences, create or delete playlists (<code className="text-brand-300">DELETE /api/playlists/:id</code>), add or remove tracks from playlists, and like or unlike songs (<code className="text-brand-300">DELETE /api/library/likes/:songId</code>) at any time.
              </li>
              <li>
                <strong className="text-content-primary">Account Deletion Capability:</strong> Automated self-service account deletion is currently not implemented in the application interface. If you wish to request full account erasure and removal of associated listening telemetry from the database, you must submit a manual request to the operator contact address below.
              </li>
              <li>
                <strong className="text-content-primary">Retention Period:</strong> Account data and listening interaction records remain in the database for the active duration of your account to compute ongoing collaborative filtering and taste profile models.
              </li>
            </ul>
          </section>

          {/* Section 6: Security */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-content-primary tracking-tight">
              6. Security Safeguards
            </h2>
            <p>
              TuneSense applies standard engineering safeguards to protect user information:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Bcrypt password hashing with work factor 12 and constant-time dummy comparisons to mitigate user enumeration timing attacks.</li>
              <li>Cryptographic JWT signature verification with strict secret enforcement.</li>
              <li>Input schema validation on all incoming request bodies using Zod schemas.</li>
              <li>Rate limiting on sensitive authentication endpoints (<code className="text-brand-300">/api/auth/login</code> and <code className="text-brand-300">/api/auth/signup</code>) to defend against credential brute-forcing.</li>
            </ul>
          </section>

          {/* Section 7: Contact */}
          <section className="space-y-3 pt-2">
            <h2 className="text-lg font-bold text-content-primary tracking-tight">
              7. Contact Information
            </h2>
            <p>
              For privacy inquiries, manual data removal requests, or questions regarding our data practices, please reach out to the project operator:
            </p>
            <div className="p-3.5 rounded-xl bg-surface border border-surface-border text-xs">
              <p className="text-content-primary font-semibold">
                TuneSense Privacy Administration
              </p>
              <p className="text-content-muted mt-1">
                Email: <span className="text-content-secondary">[privacy@yourdomain.com - Pending Owner Configuration]</span>
              </p>
              <p className="text-content-muted mt-0.5">
                Operator: <span className="text-content-secondary">[Operator Legal Name - Pending Owner Configuration]</span>
              </p>
            </div>
          </section>
        </div>
      </div>
    </PageContainer>
  );
};

export default PrivacyPolicyPage;
