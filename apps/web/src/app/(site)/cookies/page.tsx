import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/LegalPage";
import { legal } from "@/lib/site";

export const metadata: Metadata = {
  title: "Cookie policy",
  description: "The cookies ujglobal.tech uses: only strictly necessary ones, no analytics or advertising.",
  alternates: { canonical: "/cookies" },
};

/*
 * Keep this list exactly in step with what the site sets. The API sets `ujg_refresh`
 * (apps/api/app/routers/auth.py); Cloudflare may set its own. Analytics (GA4, Phase 2) must not load
 * until a consent banner exists and this page lists its cookies.
 */
const COOKIES = [
  {
    name: "ujg_refresh",
    by: "UJ Global",
    who: "Only our team members, after they sign in to the admin panel",
    why: "Keeps a team member signed in securely",
    lasts: "14 days, or until they sign out",
  },
  {
    name: "__cf_bm",
    by: "Cloudflare",
    who: "Visitors, when Cloudflare's bot protection is active",
    why: "Tells people apart from automated bots, to protect the site",
    lasts: "30 minutes",
  },
  {
    name: "cf_clearance",
    by: "Cloudflare",
    who: "Visitors who complete a Cloudflare security check",
    why: "Remembers that you passed the check, so you aren't asked again",
    lasts: "Up to 30 minutes, as we've configured it",
  },
];

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie policy"
      intro="We only use cookies the site can't work or stay secure without. There are no analytics, advertising or tracking cookies, so you won't see a cookie banner."
    >
      <LegalSection id="what" title="What cookies are">
        <p>
          Cookies are small files a website stores in your browser. Strictly necessary cookies make a site work or keep it
          secure; the law doesn&apos;t require your consent for those. Analytics and advertising cookies do need your consent,
          and we don&apos;t use any.
        </p>
      </LegalSection>

      <LegalSection id="list" title="The cookies we use">
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line bg-mist">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Cookie</th>
                <th scope="col" className="px-4 py-3 font-semibold">Set by</th>
                <th scope="col" className="px-4 py-3 font-semibold">Who gets it</th>
                <th scope="col" className="px-4 py-3 font-semibold">Why</th>
                <th scope="col" className="px-4 py-3 font-semibold">How long</th>
              </tr>
            </thead>
            <tbody>
              {COOKIES.map((c) => (
                <tr key={c.name} className="border-b border-line align-top last:border-0">
                  <th scope="row" className="px-4 py-3 font-mono text-xs font-medium">
                    {c.name}
                  </th>
                  <td className="px-4 py-3">{c.by}</td>
                  <td className="px-4 py-3 text-muted">{c.who}</td>
                  <td className="px-4 py-3 text-muted">{c.why}</td>
                  <td className="px-4 py-3 text-muted">{c.lasts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>All of them are strictly necessary. None are used to track you across other websites.</p>
      </LegalSection>

      <LegalSection id="future" title="If this changes">
        <p>
          If we ever add analytics, we&apos;ll ask for your permission first with a clear choice to say no, and we&apos;ll list the
          new cookies here before they&apos;re used.
        </p>
      </LegalSection>

      <LegalSection id="control" title="Controlling cookies">
        <p>
          You can block or delete cookies in your browser settings. Blocking Cloudflare&apos;s cookies may mean you&apos;re asked to
          complete a security check more often.
        </p>
        <p>
          Questions? Email{" "}
          <a href={`mailto:${legal.contactEmail}`} className="text-link underline">
            {legal.contactEmail}
          </a>
          . How we handle personal data is explained in our{" "}
          <Link href="/privacy" className="text-link underline">
            privacy policy
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
