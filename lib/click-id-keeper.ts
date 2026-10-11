/**
 * Keeps the ad platforms' click ids from the address of the page a visitor lands on (owner, 2026-10-10): Snapchat's
 * `ScCid`, TikTok's `ttclid` and OpenAI's `oppref` are only in the address of the first page after the ad, but the
 * order is made pages later at checkout — so they are kept in first-party cookies (30 days) for checkout to store on
 * the order (lib/attribution.ts) and the server's Purchase to send back to the platform.
 *
 * A plain module (not 'use client'): the root layout puts this text in <head> as an inline script.
 */
export const CLICK_ID_KEEPER = `(function(){try{var q=new URLSearchParams(location.search);var k=[['ScCid','sc_click_id'],['ScClickID','sc_click_id'],['ttclid','ttclid'],['oppref','oppref']];for(var i=0;i<k.length;i++){var v=q.get(k[i][0]);if(v&&/^[A-Za-z0-9._~-]{1,500}$/.test(v)){document.cookie=k[i][1]+'='+v+'; max-age=2592000; path=/; SameSite=Lax'}}}catch(e){}})();`;
