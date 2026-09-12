/* eslint-disable */
// @ts-nocheck
/**
 * VENDORED — Saadeddin cake builder renderer, finishing
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
 * Source: Saadeddin_CakeBuilder_Server_Files/website/assets/js/finishing.3d1a5bd4b5ea.js
 */
import {project,isRemoved} from './render-core';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const DECORATIONS=[
 {id:'none',ar:'بدون تزيين',category:'كلاسيك'},
 {id:'classic',ar:'حافة كريمة',category:'كلاسيك'},
 {id:'pearls',ar:'لآلئ ناعمة',category:'كلاسيك'},
 {id:'retro-cherries',ar:'ريترو كرز',category:'ريترو'},
 {id:'retro-rose',ar:'ريترو وردي',category:'ريترو'},
 {id:'retro-chocolate',ar:'ريترو شوكولاتة',category:'ريترو'},
 {id:'rose-garden',ar:'باقة ورود',category:'ورود'},
 {id:'ribbons',ar:'فيونكات',category:'فيونكات'},
 {id:'pearl-bows',ar:'فيونكات ولآلئ',category:'فيونكات'},
 {id:'strawberries',ar:'فراولة وكريمة',category:'فواكه'},
 {id:'berries',ar:'توت وكريمة',category:'فواكه'},
 {id:'mixed-fruit',ar:'فاكهة مشكّلة',category:'فواكه'},
 {id:'chocolate',ar:'لفائف شوكولاتة',category:'شوكولاتة'},
 {id:'macarons',ar:'ماكرون وورود',category:'حلويات'},
 {id:'sprinkles',ar:'رشّات ملونة',category:'رشّات'},
 {id:'stars',ar:'نجوم ذهبية',category:'احتفال'}
];
export const THEMES=[{id:'white',ar:'كريمة بيضاء',rgb:[1,1,1],hex:'#f4efe4'},{id:'pink',ar:'كريمة وردية',rgb:[1,.78,.82],hex:'#ec9daf'},{id:'chocolate',ar:'كريمة شوكولاتة',rgb:[.65,.43,.28],hex:'#66412c'}];
export const SPRITES=['cream-rosette','cherry','strawberry-half','blueberries','buttercream-rose','pink-macaron','chocolate-curls','sugar-pearl','edible-bow','gold-star','sprinkles','cream-dollop','piped-shell','fruit-cluster'];
function perimeter(cfg,t,inset=0){
 t=(t%1+1)%1;const w=cfg.width-2*inset,d=cfg.depth-2*inset;
 if(cfg.shape==='round'){const a=t*Math.PI*2;return [w*.5*Math.cos(a),d*.5*Math.sin(a),Math.cos(a),Math.sin(a)];}
 const q=t*2*(w+d);
 if(q<w)return[-w/2+q,-d/2,0,-1];if(q<w+d)return[w/2,-d/2+q-w,1,0];if(q<2*w+d)return[w/2-(q-w-d),d/2,0,1];return[-w/2,d/2-(q-2*w-d),-1,0];
}
export function decorationInstances(cfg,id,theme='white'){
 if(id==='none')return[];
 const all=[],small=Math.min(cfg.width,cfg.depth),unit=clamp(small/15,.8,1.7),H=cfg.height;
 const length=cfg.shape==='round'?Math.PI*small:2*(cfg.width+cfg.depth);
 const count=(spacing,min=8,max=220)=>clamp(Math.round(length/(spacing*unit)),min,max);
 const add=(sprite,x,y,z,width,extra={})=>all.push({sprite,x,y,z,width,surface:z>=H-.03?'top':'side',...extra});
 const ring=(sprite,N,z,width,inset,extra={})=>{for(let i=0;i<N;i++){const t=(i+.5)/N,[x,y,nx,ny]=perimeter(cfg,t,inset);add(sprite,x,y,z,width,{nx,ny,t,rotate:t*360+90,...extra});}};
 const topPearls=()=>ring('sugar-pearl',count(.70),H,.22*unit,.30*unit,{rotate:0});
 const shells=(tone=theme)=>ring('piped-shell',count(1.18),H+.06,1.45*unit,.58*unit,{surface:'flat',footprint:.84,tint:tone});
 const baseShells=(tone=theme)=>ring('piped-shell',count(1.1),.34*unit,1.25*unit,-.012,{surface:'side',tint:tone,rotate:0,anchor:.5});
 const rosettes=(N=8,inset=1.05*unit,tone=theme)=>ring('cream-rosette',N,H,1.55*unit,inset,{rotate:0,tint:tone});
 if(id==='classic'){shells();baseShells();}
 if(id==='pearls'){topPearls();ring('sugar-pearl',count(.63),.17*unit,.22*unit,-.014,{rotate:0,anchor:.5});}
 if(id.startsWith('retro')){
  const tone=id==='retro-rose'?'pink':id==='retro-chocolate'?'chocolate':theme;
  shells(tone);baseShells(tone);
  const swags=cfg.shape==='round'?8:8,perSwag=18;
  for(let s=0;s<swags;s++)for(let k=0;k<perSwag;k++){
   const f=k/(perSwag-1),t=(s+f)/swags,[x,y,nx,ny]=perimeter(cfg,t,-.025),fall=Math.sin(f*Math.PI),z=H*.80-fall*Math.min(1.35*unit,H*.18);
   add('piped-shell',x,y,z,.58*unit,{surface:'side',nx,ny,anchor:.5,tint:tone,rotate:Math.atan2(-Math.cos(f*Math.PI)*Math.PI*Math.min(1.35*unit,H*.18),length/swags)*180/Math.PI});
  }
  const N=cfg.shape==='round'?8:8;rosettes(N,.92*unit,tone);
  if(id==='retro-cherries')ring('cherry',N,H+1.25*unit,.96*unit,.95*unit,{rotate:0});
  if(id==='retro-rose')ring('buttercream-rose',N/2,H+.23*unit,1.65*unit,1.0*unit,{rotate:0});
  if(id==='retro-chocolate')ring('chocolate-curls',N/2,H+.30*unit,1.68*unit,1.08*unit,{rotate:0});
 }
 if(['strawberries','berries','mixed-fruit'].includes(id)){
  shells();const N=cfg.shape==='round'?6:8;
  for(let i=0;i<N;i++){const t=(i+.5)/N,[x,y]=perimeter(cfg,t,1.38*unit),sprite=id==='berries'?'blueberries':id==='strawberries'?'strawberry-half':'fruit-cluster';add(sprite,x,y,H,id==='mixed-fruit'?2.08*unit:1.70*unit,{rotate:0});}
  for(let i=0;i<N;i++){const [x,y]=perimeter(cfg,i/N,1.12*unit);add('cream-rosette',x,y,H,1.22*unit,{tint:theme});}
 }
 if(id==='rose-garden'||id==='macarons'){
  topPearls();const points=[[-.22,.15,2.9],[-.09,.24,2.15],[-.29,-.01,2.25],[-.08,.02,1.9]];
  points.forEach(([x,y,w],i)=>add(id==='macarons'&&i%2?'pink-macaron':'buttercream-rose',x*cfg.width,y*cfg.depth,H,w*unit));
 }
 if(id==='ribbons'||id==='pearl-bows'){
  if(id==='pearl-bows')topPearls();else shells();baseShells();
  const N=cfg.shape==='round'?5:4;for(let i=0;i<N;i++){const [x,y,nx,ny]=perimeter(cfg,(i+.5)/N,-.025);add('edible-bow',x,y,H*.71,2.55*unit,{surface:'side',nx,ny,anchor:.5,tint:theme});}
 }
 if(id==='chocolate'){shells('chocolate');for(let i=0;i<6;i++){const [x,y]=perimeter(cfg,(i+.5)/6,1.30*unit);add('chocolate-curls',x,y,H,2.05*unit);}}
 if(id==='sprinkles'){
  shells();for(let i=0;i<65;i++){const t=(i*.61803398875)%1,r=Math.sqrt((i+.5)/65)*.77,a=t*Math.PI*2;add('sprinkles',Math.cos(a)*cfg.width*.5*r,Math.sin(a)*cfg.depth*.5*r,H+.015,.40*unit,{surface:'flat',footprint:1,rotate:i*137.5});}
  for(let i=0;i<42;i++){const [x,y,nx,ny]=perimeter(cfg,i/42,-.014);add('sprinkles',x,y,H*(.24+((i*7)%13)/24),.38*unit,{surface:'side',nx,ny,rotate:i*53,anchor:.5});}
 }
 if(id==='stars'){topPearls();ring('gold-star',7,H+.025,1.12*unit,.94*unit,{surface:'flat',footprint:1});}
 return all;
}
function locationOnView(g,item){
 const removed=isRemoved(g.config,item.x,item.y),cut=g.view==='cut',slice=g.view==='slice',combo=g.view==='combo';
 if(cut&&removed||slice&&!removed)return null;
 let x=item.x,y=item.y;if(combo&&removed){x+=g.config.width*(g.config.shape==='round'?.22:.16);y+=g.config.depth*(g.config.shape==='round'?-.09:.13);}
 return {...project(g,x,y,item.z),wx:x,wy:y,removed};
}
function sampleRGBA(tex,u,v){
 const x=clamp(u*(tex.width-1),0,tex.width-1),y=clamp(v*(tex.height-1),0,tex.height-1),x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(x0+1,tex.width-1),y1=Math.min(y0+1,tex.height-1),fx=x-x0,fy=y-y0,out=[];
 for(let k=0;k<4;k++){const a=tex.data[(y0*tex.width+x0)*4+k]*(1-fx)+tex.data[(y0*tex.width+x1)*4+k]*fx,b=tex.data[(y1*tex.width+x0)*4+k]*(1-fx)+tex.data[(y1*tex.width+x1)*4+k]*fx;out[k]=a*(1-fy)+b*fy;}
 return out;
}
export function applyDecorations(raw,g,sprites,id,theme='white'){
 // Exposed filling is deliberately kept clear of exterior toppings.
 if(g.view==='filling'||id==='none')return raw;
 const items=decorationInstances(g.config,id,theme).map(item=>({...item,p:locationOnView(g,item)})).filter(i=>i.p).sort((a,b)=>a.p.depth-b.p.depth);
 const n=g.size,sc=g.camera.scale,depth=g.depth.slice();
 // Contact shadows follow the actual top surface, including a pulled-out slice.
 for(const item of items){if(item.surface==='side'||item.sprite==='sprinkles')continue;
  const p=project(g,item.p.wx,item.p.wy,g.config.height),radius=item.width*.48,rx=radius*sc,ry=radius*sc*g.camera.S;
  for(let y=Math.max(0,Math.floor(p.y-ry*1.8));y<Math.min(n,p.y+ry*1.8);y++)for(let x=Math.max(0,Math.floor(p.x-rx*1.8));x<Math.min(n,p.x+rx*1.8);x++){
   const i=y*n+x;if(!g.top[i])continue;if(isRemoved(g.config,g.tx[i],g.ty[i])!==item.p.removed&&g.view==='combo')continue;
   const dx=(g.tx[i]-item.x)/radius,dy=(g.ty[i]-item.y)/radius,q=dx*dx+dy*dy;if(q>3)continue;
   const a=Math.exp(-q*2.4)*.22,at=i*4;raw[at]*=1-a;raw[at+1]*=1-a;raw[at+2]*=1-a;
  }
 }
 for(const item of items){
  const tex=sprites[item.sprite];if(!tex)continue;const p=item.p,w=item.width;
  let ax,ay,bx,by,az,bz,anchor=.5,centerX=p.x,centerY=p.y;
  if(item.surface==='side'){
   const facing=item.nx*g.camera.sp-item.ny*g.camera.cp;if(facing<.05)continue;
   const t=[-item.ny,item.nx],height=w*tex.height/tex.width,rot=(item.rotate||0)*Math.PI/180,co=Math.cos(rot),si=Math.sin(rot);
   const pa=project(g,p.wx+t[0]*w*co,p.wy+t[1]*w*co,item.z+w*si),pb=project(g,p.wx+t[0]*height*si,p.wy+t[1]*height*si,item.z-height*co);
   ax=pa.x-p.x;ay=pa.y-p.y;az=pa.depth-p.depth;bx=pb.x-p.x;by=pb.y-p.y;bz=pb.depth-p.depth;
   if(ax<0){ax=-ax;ay=-ay;az=-az;}
  }else if(item.surface==='flat'){
   const rot=(item.rotate||0)*Math.PI/180,co=Math.cos(rot),si=Math.sin(rot),d=w*(item.footprint||.85);
   const pa=project(g,p.wx+w*co,p.wy+w*si,item.z),pb=project(g,p.wx+d*si,p.wy-d*co,item.z);
   ax=pa.x-p.x;ay=pa.y-p.y;az=pa.depth-p.depth;bx=pb.x-p.x;by=pb.y-p.y;bz=pb.depth-p.depth;
  }else{
   const h=w*tex.height/tex.width*(.70*g.camera.C+.78*g.camera.S)/(.70*.883+.78*.469);
   ax=w*sc;ay=0;az=0;bx=0;by=h*sc;bz=-h*g.camera.S;anchor=item.sprite==='sugar-pearl'?.74:.91;centerY=p.y+(.5-anchor)*by;
  }
  const determinant=ax*by-ay*bx;if(Math.abs(determinant)<.1)continue;
  const halfX=(Math.abs(ax)+Math.abs(bx))*.5,halfY=(Math.abs(ay)+Math.abs(by))*.5;
  const tint=THEMES.find(t=>t.id===item.tint)?.rgb||[1,1,1];
  for(let y=Math.max(0,Math.floor(centerY-halfY));y<Math.min(n,centerY+halfY+1);y++)for(let x=Math.max(0,Math.floor(centerX-halfX));x<Math.min(n,centerX+halfX+1);x++){
   const dx=x+.5-centerX,dy=y+.5-centerY,u=(dx*by-dy*bx)/determinant+.5,v=(dy*ax-dx*ay)/determinant+.5;if(u<0||u>1||v<0||v>1)continue;
   const color=sampleRGBA(tex,u,v),a=color[3]/255;if(a<.015)continue;
   const i=y*n+x,z=p.depth+(u-.5)*az+(v-anchor)*bz+(item.surface==='top'?w*.20:.035);
   if(z<(item.surface==='top'?g.depth[i]:depth[i])-.045)continue;if(a>.5)depth[i]=Math.max(depth[i],z);
   const at=i*4,old=raw[at+3]/255,total=a+old*(1-a);
   for(let k=0;k<3;k++)raw[at+k]=(color[k]*tint[k]*a+raw[at+k]*old*(1-a))/total;
   raw[at+3]=total*255;
  }
 }
 return raw;
}
export function applyPrint(raw,g,image,settings,textImage=null){
 const cfg=g.config,n=g.size,p=settings.photo,rotation=p.rotation*Math.PI/180,co=Math.cos(rotation),si=Math.sin(rotation);
 const pw=(p.shape==='circle'?Math.min(cfg.width,cfg.depth):cfg.width)*.72*p.scale,pd=p.shape==='circle'?pw:cfg.depth*.72*p.scale,cx=p.x*cfg.width,cy=p.y*cfg.depth;
 const sample=(tex,u,v)=>{const x=Math.min(tex.width-1,Math.max(0,Math.floor(u*tex.width))),y=Math.min(tex.height-1,Math.max(0,Math.floor(v*tex.height)));return (y*tex.width+x)*4;};
 function blend(at,tex,j,shade=1){const a=tex.data[j+3]/255;for(let k=0;k<3;k++)raw[at+k]=raw[at+k]*(1-a)+tex.data[j+k]*shade*a;}
 for(let i=0;i<g.kind.length;i++){
  if(!g.kind[i])continue;const at=i*4;
  if(image&&g.top[i]){
   const dx=g.tx[i]-cx,dy=g.ty[i]-cy;let u=(dx*co+dy*si)/pw+.5,v=(-dx*si+dy*co)/pd+.5;
   const inside=u>=0&&u<=1&&v>=0&&v<=1&&(p.shape!=='circle'||(u-.5)**2+(v-.5)**2<=.25);
   if(inside){const imageAR=image.width/image.height,targetAR=pw/pd;if(imageAR>targetAR)u=(u-.5)*targetAR/imageAR+.5;else v=(v-.5)*imageAR/targetAR+.5;blend(at,image,sample(image,u,1-v),.985);}
  }
  if(textImage&&g.top[i]){
   const tw=cfg.width*.67*settings.text.scale,th=cfg.depth*.18*settings.text.scale;
   const u=(g.tx[i]-settings.text.x*cfg.width)/tw+.5,v=(g.ty[i]-settings.text.y*cfg.depth)/th+.5;
   if(u>=0&&u<=1&&v>=0&&v<=1)blend(at,textImage,sample(textImage,u,1-v),.97);
  }
 }
 return raw;
}
