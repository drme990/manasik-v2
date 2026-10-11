const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID ;

export default function MetaPixel() {
  if (!FB_PIXEL_ID) return null;

  const pixelCode = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    var mvid;
    try {
      var mvidCookie = document.cookie.match(/(?:^|;\\s*)mvid=([^;]*)/);
      mvid = mvidCookie && mvidCookie[1];
      if (!mvid) { try { mvid = localStorage.getItem('mvid'); } catch (e) {} }
      if (!mvid) { mvid = (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).toLowerCase(); }
      document.cookie = 'mvid=' + mvid + '; max-age=31536000; path=/; SameSite=Lax';
      try { localStorage.setItem('mvid', mvid); } catch (e) {}
    } catch (e) {}
    fbq('init', '${FB_PIXEL_ID}', mvid ? { external_id: mvid } : {});
    fbq('track', 'PageView');
  `;

  return (
    <>
      {/* Meta Pixel Code */}
      <script dangerouslySetInnerHTML={{ __html: pixelCode }} />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
      {/* End Meta Pixel Code */}
    </>
  );
}
