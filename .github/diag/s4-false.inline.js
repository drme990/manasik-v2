
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    (function(){
      var held=false;
      
      var choice=null;
      try{
        var raw=localStorage.getItem('manasik-consent');
        if(raw){
          var parsed=JSON.parse(raw);
          var ts=parsed?Date.parse(parsed.decidedAt):NaN;
          if(parsed&&(parsed.ad_storage==='granted'||parsed.ad_storage==='denied')&&
            !isNaN(ts)&&(Date.now()-ts)/864e5<=365)choice=parsed.ad_storage;
        }
      }catch(e){}
      if(choice){fbq('consent', choice==='granted'?'grant':'revoke');}
      else if(false){fbq('consent', 'revoke');held=true;}
      else{fbq('consent', 'grant');}
      fbq('init', '1545349236553470');
      if(held){window.__manasikMetaPageViewHeld=true;}
      else{fbq('track', 'PageView');}
    })();
  