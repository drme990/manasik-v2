/**
 * Google Tag Manager container.
 *
 * Loaded once in the root layout. The script goes in <head> and the
 * <noscript> iframe goes right after the opening <body> tag — both are
 * rendered here so the component can be placed at the top of <body>.
 * Container ID from env var.
 */

const GTM_CONTAINER_ID = process.env.NEXT_PUBLIC_GTM_CONTAINER_ID;

const gtmScript = `
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_CONTAINER_ID}');
`;

export default function GTM() {
  if (!GTM_CONTAINER_ID) return null;

  return (
    <>
      {/* Google Tag Manager */}
      <script dangerouslySetInnerHTML={{ __html: gtmScript }} />
      {/* End Google Tag Manager */}
    </>
  );
}

/**
 * GTM <noscript> iframe — must be placed immediately after the opening
 * <body> tag in the layout for non-JS browsers.
 */
export function GTMNoScript() {
  if (!GTM_CONTAINER_ID) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
      />
    </noscript>
  );
}
