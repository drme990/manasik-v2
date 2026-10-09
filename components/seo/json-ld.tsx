// Injects a JSON-LD <script> tag. Escapes '<' so HTML/script content
// inside the schema can never break out of the script element.
export default function JsonLd({ data }: { data: object | null }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
