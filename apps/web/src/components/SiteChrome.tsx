import { JsonLd } from "@/components/JsonLd";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { site } from "@/lib/site";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: site.name,
  url: site.url,
  email: site.email,
  description: site.description,
  areaServed: "Worldwide",
};

/** Header, footer and site-wide structured data for every public page. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={organizationJsonLd} />
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
