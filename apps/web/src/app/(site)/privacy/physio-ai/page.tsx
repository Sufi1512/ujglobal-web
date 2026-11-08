import type { Metadata } from "next";
import Link from "next/link";
import { Bullets, LegalPage, LegalSection } from "@/components/LegalPage";
import { legal, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "PhysioAI Privacy Policy",
  description:
    "Privacy policy for PhysioAI (com.health.physioai.app): on-device camera pose detection, health and assessment data, AI companion processing, and user privacy rights.",
  alternates: { canonical: "/privacy/physio-ai" },
};

export default function PhysioAiPrivacyPage() {
  const supportEmail = "khansultan1@gmail.com";
  const mail = (
    <a href={`mailto:${supportEmail}`} className="text-link underline">
      {supportEmail}
    </a>
  );
  const generalMail = (
    <a href={`mailto:${legal.contactEmail}`} className="text-link underline">
      {legal.contactEmail}
    </a>
  );

  return (
    <LegalPage
      title="Privacy Policy for PhysioAI"
      intro="PhysioAI is an intelligent physiotherapy guidance, exercise coaching, and mobility recovery companion. We prioritize privacy by processing camera frames 100% on-device, offering local-first health storage, and never selling personal or health data."
    >
      <LegalSection id="who" title="1. Who We Are">
        <p>
          <strong>PhysioAI</strong> (Package ID: <code>com.health.physioai.app</code>) is developed and operated by{" "}
          <strong>{legal.entityName}</strong> (Individual Developer), trading as <strong>{site.name}</strong>, located in{" "}
          {legal.registeredAddress} (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;). All billing, developer accounts,
          and services belong to {legal.entityName}.
        </p>
        <p>
          For any questions or privacy inquiries regarding your personal or health data, please contact our developer support at{" "}
          {mail} or {generalMail}.
        </p>
      </LegalSection>

      <LegalSection id="disclaimer" title="2. Medical Disclaimer">
        <p className="rounded-xl border border-line bg-mist p-4 text-sm leading-relaxed">
          <strong>Important Clinical &amp; Safety Notice:</strong> PhysioAI is a wellness, physical mobility guidance,
          and exercise coaching tool. It does <strong>NOT</strong> provide medical diagnoses, clinical treatment plans, or
          emergency medical triage. Always consult a licensed physiotherapist, physician, or qualified medical specialist
          before starting or modifying any rehabilitation program. If you experience severe symptoms, red-flag indicators
          (such as acute numbness, sudden loss of motor control, or unexplained fever), stop exercising immediately and seek
          emergency medical attention.
        </p>
      </LegalSection>

      <LegalSection id="collect" title="3. Information We Collect">
        <p>
          <strong>Account &amp; Authentication:</strong>
        </p>
        <Bullets
          items={[
            "Guest Mode (Anonymous): You can use PhysioAI without signing in. Assessment results and plans remain stored strictly on your local device.",
            "Authenticated Accounts: If you choose to sign in via Google Sign-In or Sign in with Apple (powered by Firebase Authentication), we receive your basic profile identifier (name, email address, and unique user ID) solely to synchronize your recovery plan securely across devices.",
          ]}
        />

        <p className="mt-4">
          <strong>Health, Assessment &amp; Mobility Data:</strong>
        </p>
        <p>To generate tailored rehabilitation exercise recommendations, you may voluntarily input:</p>
        <Bullets
          items={[
            "Target body regions selected on the interactive anatomical body map (e.g., cervical neck, lumbar spine, shoulder, knee);",
            "Self-reported pain scores (0–10 numeric rating scale), pain characteristics, and duration;",
            "Clinical safety and red-flag screening answers to determine exercise suitability;",
            "Daily check-in logs, exercise completion tallies, and mobility streak records.",
          ]}
        />

        <p className="mt-4">
          <strong>Camera &amp; On-Device Pose Detection (No Video Uploads):</strong>
        </p>
        <Bullets
          items={[
            "Camera Access (android.permission.CAMERA): Used exclusively for the real-time AI Form Coach feature.",
            "100% On-Device Processing: Video frames from your camera are analyzed entirely in volatile device memory in real-time using Google ML Kit Pose Estimation to estimate joint angles and posture alignment.",
            "Zero Video or Photo Storage: PhysioAI NEVER records, saves, captures, or transmits video streams, photos, or facial biometric data to any external server or cloud service. Only calculated session metrics (repetition counts and posture scores) are saved to your local recovery history.",
          ]}
        />

        <p className="mt-4">
          <strong>AI Physio Companion Conversations:</strong>
        </p>
        <Bullets
          items={[
            "Cloud AI Mode (Google Gemini API): If using cloud-assisted guidance, your exercise questions and relevant recovery context (e.g., target region and current exercise phase) are transmitted securely over TLS/HTTPS to Google Gemini to generate rehabilitation answers. Do not enter personal identifiers or confidential medical records in chat prompts.",
            "Local On-Device AI Mode (Gemma 4): You can optionally download the Gemma 4 on-device model inside Profile Settings to process chat conversations 100% locally on your phone without sending queries to cloud servers.",
          ]}
        />

        <p className="mt-4">
          <strong>Device Diagnostics &amp; Crash Reporting:</strong>
        </p>
        <p>
          We use Google Firebase (Crashlytics and Analytics) to collect anonymous diagnostic events, system device models, and
          operating system versions to resolve crashes and improve application stability.
        </p>
      </LegalSection>

      <LegalSection id="use" title="4. How We Use Your Information">
        <Bullets
          items={[
            "To build, adapt, and update your personalized 14-day mobility and physiotherapy guidance plans;",
            "To screen for red-flag symptoms and trigger clinical safety stop guards when necessary;",
            "To deliver real-time posture coaching feedback during exercise routines;",
            "To provide interactive physiotherapy advice through the AI Physio Companion;",
            "To schedule local device notifications for daily exercise check-ins and posture micro-breaks;",
            "To generate downloadable, shareable Clinical PDF Recovery Reports at your explicit request.",
          ]}
        />
        <p className="font-semibold text-foreground">
          We NEVER sell, rent, trade, or monetize your personal health data to data brokers, advertisers, or third parties.
        </p>
      </LegalSection>

      <LegalSection id="security" title="5. Data Storage, Security &amp; PDF Exports">
        <Bullets
          items={[
            "Local-First Storage: By default, your assessments, exercise check-ins, and mobility history are stored locally on your device.",
            "Encrypted Cloud Synchronization: For signed-in users, recovery data is synced securely with Google Cloud Firestore using TLS/HTTPS encryption, strictly isolated by individual user ID.",
            "Clinical PDF Report Generation: When you tap 'Export My Health Records (PDF)', the document is compiled locally on your device. It is shared only with the destination you explicitly select through your operating system's native share sheet.",
          ]}
        />
      </LegalSection>

      <LegalSection id="third-parties" title="6. Third-Party Service Providers">
        <p>PhysioAI integrates with trusted technology infrastructure providers:</p>
        <Bullets
          items={[
            "Google Firebase (Authentication, Cloud Firestore, Crashlytics, Analytics) — privacy and security covered under Google Cloud terms;",
            "Google ML Kit (On-Device Pose Detection) — runs entirely on the client device;",
            "Google Gemini API (Cloud AI Assistant) — processes rehabilitation queries via encrypted API calls;",
            "Apple Sign-In (iOS Authentication) — privacy-preserving authentication on Apple devices.",
          ]}
        />
      </LegalSection>

      <LegalSection id="rights" title="7. Your Rights &amp; Data Deletion">
        <p>You have full ownership and control over your data within PhysioAI:</p>
        <Bullets
          items={[
            "Export Your Health Records: Use Profile → Export My Health Records (PDF) anytime to download an export of your assessments, pain trends, and exercise logs.",
            "In-App Data & Account Deletion: Use Profile → Delete My Data / Reset Account inside the app to permanently purge all local device records and synced cloud Firestore data.",
            "Direct Support Request: You can also email us at " + supportEmail + " with 'Data Deletion Request' and your user identifier to have your cloud records permanently erased within 30 days.",
            "Revoke Permissions: You may disable Camera or Notification access at any time in your device's system settings. The app will smoothly transition to illustrated exercise demonstrations.",
          ]}
        />
      </LegalSection>

      <LegalSection id="children" title="8. Children's Privacy">
        <p>
          PhysioAI is designed for general audiences aged <strong>16 and older</strong> (or the digital age of consent in
          your country). We do not knowingly collect personal or health information from children under 13 (or under 16 in
          the EEA/UK). If you believe a minor has submitted personal information, please notify us at {mail} and we will
          promptly delete the records.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="9. Contact Us">
        <p>
          If you have questions, feedback, or legal inquiries regarding this Privacy Policy or your data in PhysioAI, please contact:
        </p>
        <div className="rounded-xl border border-line bg-surface p-5 text-sm leading-relaxed">
          <p>
            <strong>Developer:</strong> {legal.entityName} (trading as {site.name})
          </p>
          <p>
            <strong>Location:</strong> {legal.registeredAddress}
          </p>
          <p>
            <strong>Support Email:</strong> {mail}
          </p>
          <p>
            <strong>General Inquiries:</strong> {generalMail}
          </p>
          <p>
            <strong>Official Website:</strong>{" "}
            <Link href="/" className="text-link underline">
              {site.url}
            </Link>
          </p>
        </div>
      </LegalSection>
    </LegalPage>
  );
}
