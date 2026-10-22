import type { Metadata } from "next";
import Link from "next/link";
import { Bullets, LegalPage, LegalSection } from "@/components/LegalPage";
import { legal, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The terms for using the ujglobal.tech website.",
  alternates: { canonical: "/terms" },
};

/*
 * Terms for using the website only. Client work is governed by each project's own proposal and contract.
 */
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      intro={`These terms cover your use of the ${site.name} website. Work we do for clients is covered separately, by the proposal and contract for each project.`}
    >
      <LegalSection id="about" title="About these terms">
        <p>
          The website is run by {legal.entityName}, trading as {site.name}, {legal.registeredAddress}. By using the site you
          agree to these terms. If you don&apos;t agree, please don&apos;t use it.
        </p>
      </LegalSection>

      <LegalSection id="information" title="Information on the site">
        <Bullets
          items={[
            "What we publish here describes our services in general and isn't an offer to contract.",
            "Scope, timelines and prices are agreed only in a written proposal for your project. A quote becomes binding only when both sides sign the proposal or contract.",
            "We work to keep the site accurate and up to date, but we can't promise it's always complete or free of errors.",
          ]}
        />
      </LegalSection>

      <LegalSection id="demos" title="Demo projects">
        <p>
          Projects marked &ldquo;Demo project&rdquo; are built by us, in-house, to show our approach. They aren&apos;t client work, and
          any results shown come from our own testing. Live demos are for trying out only: please don&apos;t enter real personal
          or business data into them.
        </p>
      </LegalSection>

      <LegalSection id="ip" title="Our content">
        <p>
          The text, design, logo and other material on this site belong to {legal.entityName} or are used with permission.
          You may view the site, link to it and share our pages. Please don&apos;t copy or reuse our material commercially without
          asking us first.
        </p>
      </LegalSection>

      <LegalSection id="use" title="Using the site fairly">
        <p>Please don&apos;t:</p>
        <Bullets
          items={[
            "try to break, overload or get unauthorised access to the site or our systems;",
            "send spam, malware or misleading information through our forms;",
            "collect data from the site with automated tools in a way that harms it or its users.",
          ]}
        />
        <p>We may block access from anyone who does.</p>
      </LegalSection>

      <LegalSection id="links" title="Links to other websites">
        <p>
          Where we link to other sites, including live demos hosted elsewhere, we aren&apos;t responsible for their content or how
          they handle your data.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="Our responsibility to you">
        <p>
          We provide the site as it is, free of charge. As far as the law allows, we aren&apos;t liable for losses that come from
          using it or relying on its general information, such as lost profits or business interruption. Nothing in these
          terms limits any liability that can&apos;t legally be limited, or any rights you have as a consumer in your country.
        </p>
      </LegalSection>

      <LegalSection id="law" title="Law and changes">
        <p>
          These terms are governed by the laws of {legal.governingLaw}, and the courts of {legal.courts} deal with any dispute,
          unless the law where you live gives you the right to bring a claim there.
        </p>
        <p>
          We may update these terms; the date at the top shows the latest version. Questions? Email{" "}
          <a href={`mailto:${legal.contactEmail}`} className="text-link underline">
            {legal.contactEmail}
          </a>
          . See also our{" "}
          <Link href="/privacy" className="text-link underline">
            privacy policy
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
