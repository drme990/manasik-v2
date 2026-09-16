/**
 * OpenAI Pixel (oaiq) base code.
 *
 * Loaded once in the root layout's <head>. Pixel ID from env var.
 * Fires an automatic page view on load. Conversion events (e.g. order_created)
 * can be sent later via `window.oaiq("measure", "order_created", ...)`.
 */

const OPENAI_PIXEL_ID = process.env.NEXT_PUBLIC_OPENAI_PIXEL_ID ;

const pixelCode = `
!function(w,d,s,u){if(w.oaiq)return;var q=function(){q.q.push(arguments)};q.q=[];w.oaiq=q;var j=d.createElement(s);j.async=1;j.src=u;var f=d.getElementsByTagName(s)[0];f.parentNode.insertBefore(j,f)}(window,document,"script","https://bzrcdn.openai.com/sdk/oaiq.min.js");
oaiq("init",{pixelId:"${OPENAI_PIXEL_ID}",debug:false});
`;

export default function OpenAIPixel() {
  if (!OPENAI_PIXEL_ID) return null;

  return (
    <>
      {/* OpenAI Pixel Code Start */}
      <script dangerouslySetInnerHTML={{ __html: pixelCode }} />
      {/* OpenAI Pixel Code End */}
    </>
  );
}
