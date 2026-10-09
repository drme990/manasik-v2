/**
 * The script that puts `mo` on <html> before the first paint, on the home page only (see home-motion.tsx).
 *
 * It lives in this plain module, not in the 'use client' one: a value a server component imports from a client module
 * reaches the browser as a reference to that module, so the <head> script waited on the module's chunk while the page
 * was hydrating, and on slow connections React's hydration failed (error #418, 2026-10-09).
 */
export const HOME_MOTION_BOOT = `(function(){try{var d=document.documentElement;if(!/^\\/(ar|en)?\\/?$/.test(location.pathname))return;if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;d.classList.add('mo');setTimeout(function(){if(!d.classList.contains('mo-live'))d.classList.remove('mo')},3000)}catch(e){}})();`;
