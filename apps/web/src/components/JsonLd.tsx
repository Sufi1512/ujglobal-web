/**
 * Structured data for search engines. `<` is escaped so text in the data can never close the script tag
 * and start real HTML, whatever an editor types into the admin.
 */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
