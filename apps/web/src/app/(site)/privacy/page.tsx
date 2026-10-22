import type { Metadata } from "next";
import Link from "next/link";
import { Bullets, LegalPage, LegalSection } from "@/components/LegalPage";
import { legal, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What personal data UJ Global collects through ujglobal.tech, why, how long we keep it and your rights.",
  alternates: { canonical: "/privacy" },
};

/*
 * Written from what the site actually does (apps/api: leads, lead alerts, retention; apps/web: contact
 * form). If the data flows change, change this page in the same pull request.
 */
export default function PrivacyPage() {
  const mail = (
    <a href={`mailto:${legal.contactEmail}`} className="text-link underline">
      {legal.contactEmail}
    </a>
  );
  return (
    <LegalPage
      title="Privacy policy"
      intro="We collect as little personal data as we can: only what you send us when you get in touch, plus the minimum needed to run and protect the website. We don't sell it, and we don't use advertising or analytics trackers."
    >
      <LegalSection id="who" title="Who we are">
        <p>
          {site.name} is the trading name of {legal.entityName}, {legal.registeredAddress} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). We
          are responsible for (the &ldquo;controller&rdquo; of) the personal data described here. For anything about your
          data, email {mail}.
        </p>
        <p>This policy covers the website {site.url.replace(/^https?:\/\//, "")} and the enquiries you send through it.</p>
      </LegalSection>

      <LegalSection id="collect" title="What we collect">
        <p>
          <strong>When you contact us</strong> through the contact form:
        </p>
        <Bullets
          items={[
            "your name, email address and, if you give it, your company;",
            "your message;",
            "that you agreed to this policy, and when.",
          ]}
        />
        <p>
          <strong>Sent automatically with the form</strong>, to understand how people find us and to block spam:
        </p>
        <Bullets
          items={[
            "the page you sent the form from and the website that linked you to us (if your browser shares it);",
            "campaign tags in the link you used, if any (utm_source, utm_medium, utm_campaign, utm_term, utm_content);",
            "a scrambled code made from your IP address. It's one-way: we can tell when the same address sends many messages, but we never store the address itself.",
          ]}
        />
        <p>
          <strong>When you browse</strong>, our server and Cloudflare (our network and security provider) process your IP
          address and technical request details to deliver pages and protect the site from attacks. We don&apos;t run
          analytics or advertising tools, and we don&apos;t build profiles of visitors.
        </p>
      </LegalSection>

      <LegalSection id="why" title="Why we use it">
        <Bullets
          items={[
            <>
              <strong>To reply to your enquiry and prepare a quote.</strong> This is a step you asked us to take before any
              contract, and in our legitimate interest in answering people who contact us.
            </>,
            <>
              <strong>Because you agreed</strong> when you ticked the box on the form. You can withdraw that at any time by
              emailing {mail}; it doesn&apos;t affect anything we did before.
            </>,
            <>
              <strong>To keep the site safe and working</strong> (spam and attack protection), in our legitimate interest.
            </>,
            <>
              <strong>To meet legal obligations</strong>, for example tax records if you become a client.
            </>,
          ]}
        />
        <p>
          We won&apos;t send you marketing emails because you contacted us. If we ever offer a newsletter, it will be a separate
          sign-up that you confirm yourself.
        </p>
      </LegalSection>

      <LegalSection id="who-sees" title="Who sees it">
        <p>We never sell or rent your data. It is seen only by:</p>
        <Bullets
          items={[
            "our team members who handle enquiries, each with their own account;",
            `our own server, where enquiries are stored (hosted in ${legal.serverLocation});`,
            "Cloudflare, which carries traffic to the site and filters attacks;",
            "our email delivery provider, which sends our team a notification about each new enquiry, including what you wrote;",
            "authorities, if the law requires it.",
          ]}
        />
        <p>
          Our providers act on our instructions under data processing agreements. Some of them operate in other countries,
          including the United States; where data leaves your region, we rely on legal safeguards such as the European
          Commission&apos;s standard contractual clauses.
        </p>
      </LegalSection>

      <LegalSection id="keep" title="How long we keep it">
        <Bullets
          items={[
            <>
              <strong>Enquiries</strong> are deleted automatically {legal.leadRetentionMonths} months after our last contact
              with you, unless you become a client.
            </>,
            "If you become a client, we keep what we need for the length of our work together and for as long as the law requires afterwards (for example, for accounting).",
            "You can ask us to delete your enquiry sooner at any time.",
          ]}
        />
      </LegalSection>

      <LegalSection id="rights" title="Your rights">
        <p>Depending on where you live, you have the right to:</p>
        <Bullets
          items={[
            "see the personal data we hold about you and get a copy;",
            "have it corrected or deleted;",
            "object to or restrict how we use it;",
            "withdraw your consent;",
            "complain to your local data protection authority.",
          ]}
        />
        <p>
          These rights come from laws such as the EU and UK GDPR, India&apos;s Digital Personal Data Protection Act and
          California privacy law, but we offer them to everyone. Email {mail} and we&apos;ll reply within 30 days. We may ask you
          to confirm your identity first.
        </p>
      </LegalSection>

      <LegalSection id="security" title="How we protect it">
        <p>
          The site only works over encrypted connections (HTTPS). Enquiries are stored on our own server, which isn&apos;t
          reachable from the internet except through the website. Only signed-in team members can see them, and every
          change in our admin panel is logged. IP addresses are scrambled before they&apos;re stored.
        </p>
      </LegalSection>

      <LegalSection id="other" title="Children and changes">
        <p>Our services are for businesses. The site isn&apos;t meant for anyone under 18, and we don&apos;t knowingly collect their data.</p>
        <p>
          If we change how we use personal data, we&apos;ll update this page and its date. See also our{" "}
          <Link href="/cookies" className="text-link underline">
            cookie policy
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
