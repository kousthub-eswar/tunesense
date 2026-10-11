import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, AlertCircle } from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer.js';
import { Button } from '../components/ui/Button.js';

export const TermsAndConditionsPage: React.FC = () => {
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
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">
              Legal Documentation
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-content-primary tracking-tight">
            Terms and Conditions
          </h1>
          <p className="text-sm text-content-secondary mt-2 leading-relaxed">
            Please read these Terms and Conditions carefully before using the TuneSense music discovery and recommendation platform.
          </p>
        </header>

        {/* Notice of Unresolved Owner Details */}
        <div className="mb-8 p-4 rounded-xl bg-surface border border-surface-border text-xs text-content-secondary">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-content-primary">
                Legal Jurisdiction and Owner Review Notice
              </p>
              <p>
                The following governance terms reflect the technical implementation of TuneSense. Formal jurisdiction, registered entity details, and dispute resolution parameters require final review and confirmation by the repository owner:
              </p>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-content-muted">
                <li>Operating Entity: <span className="text-content-primary">[Operator Legal Name - Pending Owner Configuration]</span></li>
                <li>Governing Jurisdiction: <span className="text-content-primary">[Operator Jurisdiction - Pending Owner Configuration]</span></li>
                <li>Legal Notice Address: <span className="text-content-primary">[legal@yourdomain.com - Pending Owner Configuration]</span></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Terms Sections */}
        <div className="space-y-8 text-sm text-content-secondary leading-relaxed">
          {/* Section 1: Agreement to Terms */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-content-primary tracking-tight">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing, browsing, registering for, or streaming audio through TuneSense (the "Service"), you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree to these terms, you must discontinue using the Service.
            </p>
          </section>

          {/* Section 2: Description of Service */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-content-primary tracking-tight">
              2. Description of the Service
            </h2>
            <p>
              TuneSense provides a personalized, context-aware, and explainable music recommendation platform. Features include:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Algorithmic music recommendations using hybrid personalization strategies (R0 through R5).</li>
              <li>Interactive audio playback of music tracks sourced from the Jamendo music platform.</li>
              <li>Custom user library management, including track likes and personalized playlists.</li>
              <li>Acoustic analysis, listening analytics, and dynamic preference tuning.</li>
            </ul>
            <p className="text-xs">
              The Service is provided on an "as-is" and "as-available" basis. We reserve the right to modify, suspend, or discontinue any feature, algorithmic strategy, or catalogue availability at any time without prior liability.
            </p>
          </section>

          {/* Section 3: User Accounts */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-content-primary tracking-tight">
              3. User Accounts and Responsibilities
            </h2>
            <p>
              While guest browsing is available, certain personalized features (saving playlists, liking tracks, and receiving collaborative recommendations) require account registration:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs">
              <li><strong className="text-content-primary">Account Accuracy:</strong> You agree to provide a valid, functional email address and a non-infringing display name.</li>
              <li><strong className="text-content-primary">Credential Confidentiality:</strong> You are solely responsible for maintaining the confidentiality of your login credentials. You must notify us immediately if you suspect unauthorized access to your account.</li>
              <li><strong className="text-content-primary">Account Suspension:</strong> We reserve the right to suspend or terminate accounts that engage in unauthorized automated activity, rate limit abuse, or violation of these Terms.</li>
            </ul>
          </section>

          {/* Section 4: Third-Party Music & Audio Streaming */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-content-primary tracking-tight">
              4. Third-Party Music Catalogue & Intellectual Property
            </h2>
            <div className="p-3.5 rounded-xl bg-surface border border-surface-border text-xs space-y-2">
              <p>
                <strong className="text-content-primary">Jamendo Catalogue Integration:</strong> Music tracks, artist names, album titles, artwork images, and streaming audio files made available through TuneSense are catalogued through the Jamendo API (<code className="text-brand-300">api.jamendo.com</code>).
              </p>
              <p>
                <strong className="text-content-primary">Licensing:</strong> Audio content provided by Jamendo is released by original independent artists under various Creative Commons (CC) licenses or Jamendo licensing terms. TuneSense does not claim ownership of any musical recordings, sound assets, or artist images.
              </p>
              <p>
                <strong className="text-content-primary">Streaming Availability:</strong> Availability of individual songs, audio streams, and metadata is subject to Jamendo's third-party platform availability and catalog maintenance. TuneSense is not responsible for stream interruptions or tracks removed by their respective rights holders.
              </p>
            </div>
          </section>

          {/* Section 5: Proprietary Rights */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-content-primary tracking-tight">
              5. Intellectual Property Rights in TuneSense
            </h2>
            <p>
              All software, source code, recommendation algorithm implementations, interface designs, visual layouts, and logos associated with TuneSense are the proprietary intellectual property of the project operator.
            </p>
            <p className="text-xs">
              Users are granted a limited, non-exclusive, non-transferable, revocable license to access and use the Service strictly for personal, non-commercial music discovery and listening purposes.
            </p>
          </section>

          {/* Section 6: Prohibited Uses */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-content-primary tracking-tight">
              6. Prohibited Activities
            </h2>
            <p>
              When accessing or using TuneSense, you agree not to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Use automated tools, bots, scrapers, or crawlers to extract catalogue data or mass-download audio assets.</li>
              <li>Circumvent, bypass, or overload API rate limits or security mechanisms.</li>
              <li>Attempt to reverse-engineer, decompile, or extract the underlying source code of the application or recommendation engines without explicit authorization.</li>
              <li>Inject malicious scripts, viruses, or harmful payloads through form fields, playlist descriptions, or API requests.</li>
              <li>Use the Service for commercial redistribution, unauthorized broadcasting, or resale of music recommendations.</li>
            </ul>
          </section>

          {/* Section 7: Disclaimers & Limitation of Liability */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-content-primary tracking-tight">
              7. Disclaimers and Limitation of Liability
            </h2>
            <div className="p-3.5 rounded-xl bg-surface border border-surface-border text-xs space-y-2">
              <p>
                <strong className="text-content-primary">No Warranties:</strong> The Service is provided "as is" and "as available" without warranties of any kind, whether express or implied, including but not limited to merchantability, fitness for a particular purpose, uninterrupted availability, or accuracy of recommendation outputs.
              </p>
              <p>
                <strong className="text-content-primary">Limitation of Liability:</strong> To the fullest extent permitted by law, TuneSense and its developers, operators, and hosting providers shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Service, including playback failures, data loss, or server downtime.
              </p>
            </div>
          </section>

          {/* Section 8: Termination */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-content-primary tracking-tight">
              8. Termination
            </h2>
            <p>
              We reserve the right to terminate or suspend your access to TuneSense immediately, without prior notice or liability, for any reason, including without limitation breach of these Terms. Upon termination, your right to use the Service will immediately cease.
            </p>
          </section>

          {/* Section 9: Amendments */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-content-primary tracking-tight">
              9. Modifications to Terms
            </h2>
            <p>
              We reserve the right to revise or replace these Terms at any time. When modifications are made, the "Last Updated" date at the top of this document will be updated. Continued use of TuneSense following any changes indicates your acceptance of the revised Terms.
            </p>
          </section>

          {/* Section 10: Legal Contact */}
          <section className="space-y-3 pt-2">
            <h2 className="text-lg font-bold text-content-primary tracking-tight">
              10. Inquiries and Notice
            </h2>
            <p>
              For legal inquiries, copyright claims, or questions regarding these Terms, please contact the project administration:
            </p>
            <div className="p-3.5 rounded-xl bg-surface border border-surface-border text-xs">
              <p className="text-content-primary font-semibold">
                TuneSense Legal Inquiries
              </p>
              <p className="text-content-muted mt-1">
                Email: <span className="text-content-secondary">[legal@yourdomain.com - Pending Owner Configuration]</span>
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

export default TermsAndConditionsPage;
