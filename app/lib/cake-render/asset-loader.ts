/* eslint-disable */
// @ts-nocheck
/**
 * VENDORED — Saadeddin cake builder renderer, asset-loader
 *
 * Copied verbatim from the vendor's server package. The ONLY edits are this
 * header and the import path below. Do not reformat, do not "clean up", do not
 * rename a variable: the projection maths, the UV atlas offsets and the camera
 * table are all tuned against their photographic masters, and a well-meant
 * tidy here shows up as a cake that no longer lines up with its own texture.
 *
 * Anything we want to change belongs in compose.ts or CakeRenderer.tsx, which
 * wrap this file rather than editing it. That keeps a future drop of their
 * next version a straight overwrite.
 *
 * Source: Saadeddin_CakeBuilder_Server_Files/website/assets/js/asset-loader.d8a383523955.js
 */
export function createAssetLoader(resolveURL,decode,{fetcher=fetch,limit=12}={}){
 const cache=new Map();
 function load(url){
  if(cache.has(url)){const hit=cache.get(url);cache.delete(url);cache.set(url,hit);return hit;}
  const pending=(async()=>{const r=await fetcher(resolveURL(url));if(!r.ok)throw Error('تعذّر تحميل الصورة');return decode(await r.blob());})().catch(error=>{if(cache.get(url)===pending)cache.delete(url);throw error;});
  cache.set(url,pending);while(cache.size>limit)cache.delete(cache.keys().next().value);return pending;
 }
 return load;
}
