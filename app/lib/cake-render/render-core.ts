/* eslint-disable */
// @ts-nocheck
/**
 * VENDORED — Saadeddin cake builder renderer, render-core
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
 * Source: Saadeddin_CakeBuilder_Server_Files/website/assets/js/render-core.183ca8f026d0.js
 */
/* Pure software renderer. Centimetre geometry, one orthographic camera.
   Texture sources are supplied filling photos and generated fondant photographs.
   The same geometry buffers are reused for every filling/color. No background keying. */
const PI=Math.PI;
export const CAMERAS=[
 {id:'original',ar:'زاوية المرجع',elevation:28,sliceElevation:44,sliceRound:-50.6,round:0,box:22,roundCut:0,boxCut:120},
 {id:'front',ar:'أمام الطبقات',elevation:18,round:-60,box:0,roundCut:55,boxCut:135},
 {id:'side',ar:'جانبية',elevation:32,round:-95,box:-45,roundCut:100,boxCut:85},
 {id:'high',ar:'من أعلى',elevation:52,round:-35,box:22,roundCut:40,boxCut:115}
];
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
// Affine cameras measured on the newly generated white product photographs.
const PHOTO_PRESETS={
 round8:{w:15,d:15,h:8,A:70.4,B:0,C:0,D:-27.6,Z:49.7,ox:627,oy:430},
 round14:{w:15,d:15,h:14,A:58.4,B:0,C:0,D:-17.1,Z:51.0,ox:624,oy:274},
 square:{w:15,d:15,h:8,A:51.1,B:21.6,C:8.7,D:-25.9,Z:43.0,ox:644,oy:488},
 rectangle:{w:30,d:20,h:8,A:29.0,B:11.35,C:2.83,D:-10.60,Z:33.0,ox:646,oy:535}
};
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function triangulate(poly){
 const ids=poly.map((_,i)=>i),out=[];let guard=0;
 while(ids.length>3&&guard++<poly.length*poly.length){let found=false;
  for(let j=0;j<ids.length;j++){const ia=ids[(j+ids.length-1)%ids.length],ib=ids[j],ic=ids[(j+1)%ids.length];const a=poly[ia],b=poly[ib],c=poly[ic];if(cross(a,b,c)<1e-7)continue;
   let contains=false;for(const k of ids){if(k===ia||k===ib||k===ic)continue;const p=poly[k];if(cross(a,b,p)>1e-7&&cross(b,c,p)>1e-7&&cross(c,a,p)>1e-7){contains=true;break;}}
   if(!contains){out.push([ia,ib,ic]);ids.splice(j,1);found=true;break;}
  }if(!found)break;
 }if(ids.length===3)out.push([...ids]);return out;
}
function contour(cfg,part){
 const w=cfg.width,d=cfg.depth,r=w/2,p=[];
 if(cfg.shape==='round'){
  const a=-65*PI/180,b=5*PI/180;
  if(part==='full'){for(let i=0;i<144;i++){const t=i/144*2*PI;p.push([r*Math.cos(t),r*Math.sin(t)]);}}
  else{p.push([0,0]);let lo=part==='piece'?a:b,hi=part==='piece'?b:a+2*PI,steps=Math.ceil((hi-lo)/(2*PI)*144);for(let i=0;i<=steps;i++){const t=mix(lo,hi,i/steps);p.push([r*Math.cos(t),r*Math.sin(t)]);}}
 }else{
  const cr=Math.min(w,d)*.024;
  // A rounded outer rectangle. Cutting preserves the outer corner of the removed piece.
  const whole=[];
  for(const [x,y,start] of [[w/2-cr,d/2-cr,0],[-w/2+cr,d/2-cr,90],[-w/2+cr,-d/2+cr,180],[w/2-cr,-d/2+cr,270]]){
   for(let k=0;k<=12;k++){const t=(start+k/12*90)*PI/180;whole.push([x+cr*Math.cos(t),y+cr*Math.sin(t)]);}
  }
  const cutX=w*.19,cutY=-d*.08;
  if(part==='full')p.push(...whole);
  else if(part==='piece'){
   p.push([cutX,-d/2]);for(const pt of whole)if(pt[0]>cutX&&pt[1]<cutY)p.push(pt);
   p.push([w/2,cutY],[cutX,cutY]);
  }else{
   p.push([w/2,cutY]);for(const pt of whole)if(!(pt[0]>cutX&&pt[1]<cutY))p.push(pt);
   p.push([cutX,-d/2],[cutX,cutY]);
  }
 }
 if(cfg.shape!=='round'&&part!=='full'){for(const pt of p)pt[1]=-pt[1];p.reverse();}
 // Remove duplicate adjoining points.
 return p.filter((v,i)=>!i||Math.hypot(v[0]-p[i-1][0],v[1]-p[i-1][1])>1e-6);
}
function isOuter(a,b,cfg){
 if(cfg.shape==='round')return Math.hypot(...a)>cfg.width*.49&&Math.hypot(...b)>cfg.width*.49;
 const w=cfg.width/2,d=cfg.depth/2;return Math.abs(a[0]-b[0])<1e-5&&Math.abs(Math.abs(a[0])-w)<1e-5||Math.abs(a[1]-b[1])<1e-5&&Math.abs(Math.abs(a[1])-d)<1e-5||Math.abs(a[0])>w-cfg.width*.027&&Math.abs(b[0])>w-cfg.width*.027&&Math.abs(a[1])>d-cfg.depth*.027&&Math.abs(b[1])>d-cfg.depth*.027;
}
function bilinearQuad(q,u,v){return [mix(mix(q[0][0],q[1][0],u),mix(q[3][0],q[2][0],u),v),mix(mix(q[0][1],q[1][1],u),mix(q[3][1],q[2][1],u),v)];}
function photoUV(cfg,x,y,z,top,face){
 const ux=clamp(x/cfg.width+.5),uy=clamp(y/cfg.depth+.5),v=clamp(1-z/cfg.height);
 if(top)return [10+ux*1003,6+(1-uy)*499];
 const u=cfg.shape==='round'?ux:(face==='right'?.73+uy*.25:.02+ux*.66);
 return [8+u*1007,519+v*496];
}
function buildMesh(cfg,part,style,offset=[0,0]){
 const poly=contour(cfg,part),count=poly.length,bevel=Math.min(.30,cfg.height*.038),triangles=[];
 const normals=poly.map((p,i)=>{const a=poly[(i+count-1)%count],b=poly[(i+1)%count];let nx=(p[1]-a[1])/Math.hypot(p[0]-a[0],p[1]-a[1])+(b[1]-p[1])/Math.hypot(b[0]-p[0],b[1]-p[1]);let ny=-(p[0]-a[0])/Math.hypot(p[0]-a[0],p[1]-a[1])-(b[0]-p[0])/Math.hypot(b[0]-p[0],b[1]-p[1]);const n=Math.hypot(nx,ny)||1;return[nx/n,ny/n];});
 const outerV=poly.map((p,i)=>isOuter(poly[(i+count-1)%count],p,cfg)||isOuter(p,poly[(i+1)%count],cfg));
 const rings=[{z:0,off:bevel*.45,nz:-.6},{z:bevel*.3,off:bevel*.10,nz:-.25},{z:bevel,off:0,nz:0},{z:cfg.height-bevel,off:0,nz:0},{z:cfg.height-bevel*.5,off:bevel*.134,nz:.5},{z:cfg.height-bevel*.134,off:bevel*.5,nz:.866},{z:cfg.height,off:bevel,nz:1}];
 const vert=(i,ring,kind,face,u)=>{
  const p=poly[i],n=normals[i],off=outerV[i]?ring.off:0,x=p[0]-n[0]*off,y=p[1]-n[1]*off;
  let uv=kind===1?[u,clamp((cfg.height-.13-ring.z)/(cfg.height-.13))]:photoUV(cfg,x,y,ring.z,face==='top',face);
  if(kind===0&&ring.nz>0&&face!=='top'){
   const topUV=photoUV(cfg,x,y,cfg.height,true,'top');uv=[mix(uv[0],topUV[0],ring.nz),mix(uv[1],topUV[1],ring.nz)];
  }
  let light=1;
  if(kind===1){let nx=n[0],ny=n[1];if(face==='cut')light=part==='piece'?.98:(.80+.18*u);else light=cfg.shape==='round'?.84+.16*Math.max(0,-nx*.35-ny*.8):face==='right'?.92:1;}
  // Broad bevel lighting retains the small irregularities of the fondant photographs.
  if(kind===0&&ring.nz>0&&face!=='top')light=1+ring.nz*.016;
  if(kind===0&&ring.z<bevel)light*=.965+.035*ring.z/bevel;
  return {x:x+offset[0],y:y+offset[1],z:ring.z,tx:x,ty:y,u:uv[0],v:uv[1],light};
 };
 for(let i=0;i<count;i++){
  const j=(i+1)%count,a=poly[i],b=poly[j],outer=isOuter(a,b,cfg),right=Math.abs(b[1]-a[1])>Math.abs(b[0]-a[0]);
  let face=outer?(right?'right':'front'):'cut';if(cfg.shape==='round'&&outer)face='front';
  const food=style!=='blank'&&(!outer||style==='filling');
  let u1,u2;
  if(outer&&cfg.shape==='round'){u1=a[0]/cfg.width+.5;u2=b[0]/cfg.width+.5;}
  else if(!outer){u1=0;u2=1;if(Math.hypot(...a)>Math.hypot(...b)){u1=1;u2=0;}}
  else{u1=right?a[1]/cfg.depth+.5:a[0]/cfg.width+.5;u2=right?b[1]/cfg.depth+.5:b[0]/cfg.width+.5;}
  if(food){
   const lo={z:0,off:0,nz:0},hi={z:cfg.height-.13,off:0,nz:0};
   const vs=[vert(i,lo,1,face,u1),vert(j,lo,1,face,u2),vert(j,hi,1,face,u2),vert(i,hi,1,face,u1)];
   triangles.push({v:[vs[0],vs[1],vs[2]],kind:1},{v:[vs[0],vs[2],vs[3]],kind:1});
   const capLo={z:cfg.height-.13,off:0,nz:0},capHi=rings[rings.length-1];
   const cv=[vert(i,capLo,0,face),vert(j,capLo,0,face),vert(j,capHi,0,'top'),vert(i,capHi,0,'top')];
   triangles.push({v:[cv[0],cv[1],cv[2]],kind:0},{v:[cv[0],cv[2],cv[3]],kind:0});
  }else{
   for(let k=0;k<rings.length-1;k++){
    const lo=rings[k],hi=rings[k+1],vs=[vert(i,lo,0,face),vert(j,lo,0,face),vert(j,hi,0,face),vert(i,hi,0,face)];
    triangles.push({v:[vs[0],vs[1],vs[2]],kind:0},{v:[vs[0],vs[2],vs[3]],kind:0});
   }
  }
 }
 const top=rings[rings.length-1];
 for(const t of triangulate(poly))triangles.push({v:t.map(i=>vert(i,top,0,'top')),kind:0,top:true});
 return triangles;
}
function referenceEdge(x){return x<=950?402+135*(x-190)/760:537-.00645*(x-950)*(x-950);}
function prepareReferenceSlice(cfg,image,size){
 const ws=cfg.width/15,hs=cfg.height/8,sourceSize=image.width,read=(x,y,c)=>{if(x<0||y<0||x>=sourceSize||y>=sourceSize)return 0;return image.data[(Math.floor(y)*sourceSize+Math.floor(x))*4+c];};
 let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
 for(let y=0;y<sourceSize;y+=2)for(let x=0;x<sourceSize;x+=2)if(read(x,y,3)>16){const edge=referenceEdge(x),px=x*ws,py=y<=edge?y*ws:edge*ws+(y-edge)*hs;xmin=Math.min(xmin,px);xmax=Math.max(xmax,px);ymin=Math.min(ymin,py);ymax=Math.max(ymax,py);}
 const sc=Math.min(size*.80/(xmax-xmin),size*.80/(ymax-ymin)),cx=size*.5-(xmin+xmax)*sc*.5,cy=size*.505-(ymin+ymax)*sc*.5;
 const total=size*size,kind=new Uint8Array(total),u=new Float32Array(total),v=new Float32Array(total),alpha=new Uint8Array(total),top=new Uint8Array(total),tx=new Float32Array(total),ty=new Float32Array(total),depth=new Float32Array(total).fill(-Infinity);
 const ax=7.5*Math.cos(-65*PI/180),ay=7.5*Math.sin(-65*PI/180),bx=7.5*Math.cos(5*PI/180),by=7.5*Math.sin(5*PI/180),det=ax*by-bx*ay;
 const A=(760*by-635*ay)/det,B=(635*ax-760*bx)/det,C=(135*by+302*ay)/det,D=(-302*ax-135*bx)/det,inv=A*D-B*C;
 const cp=Math.cos(-50.6*PI/180),sp=Math.sin(-50.6*PI/180),S=Math.sin(44*PI/180),CC=Math.cos(44*PI/180);
 for(let yy=0;yy<size;yy++)for(let xx=0;xx<size;xx++){
  const i=yy*size+xx,X=(xx+.5-cx)/sc,Y=(yy+.5-cy)/sc,sx=X/ws,edge=referenceEdge(sx),sy=Y<=edge*ws?Y/ws:edge+(Y-edge*ws)/hs;
  const a=read(sx,sy,3);if(!a)continue;u[i]=sx;v[i]=sy;alpha[i]=a;
  const fu=(sx-190)/760,ft=402+135*fu,fb=991+164*fu;const food=fu>=0&&fu<=1.008&&sy>=ft&&sy<=fb+4;
  kind[i]=food?2:1;top[i]=!food&&sy<edge-2?1:0;
  const px=X-190*ws,py=Y-402*ws,z=top[i]?cfg.height:clamp(1-(sy-edge)/600)*cfg.height;
  const surfaceY=py-75*(cfg.height-z);tx[i]=(px*D-B*surfaceY)/inv;ty[i]=(A*surfaceY-px*C)/inv;depth[i]=-(-sp*tx[i]+cp*ty[i])*CC+z*S;
 }
 return {size,kind,u,v,alpha,light:new Float32Array(total).fill(1),top,tx,ty,depth,photographic:true,camera:{scale:sc*75,cx,cy,cp,sp,S,C:CC,id:'original',elevation:44,affine:[A*sc,B*sc,C*sc,D*sc,75*sc,cx+190*ws*sc,cy+(402*ws+75*cfg.height)*sc]},material:cfg.height===14?'round14':'round8',bounds:[xmin,xmax,ymin,ymax],scale:sc*75,config:cfg,view:'slice'};
}

export function prepareGeometry(cfg,view,size=1254,angle='original',reference=null){
 if(reference&&view==='slice'&&angle==='original'&&cfg.shape==='round')return prepareReferenceSlice(cfg,reference,size);
 if(['blank','slice_blank','combo_blank'].includes(view))throw new Error('Blank cut views are no longer available');
 let mesh=[];
 if(view==='slice')mesh=buildMesh(cfg,'piece','coated');
 else if(view==='combo'){
  const style='coated';
  const offset=cfg.shape==='round'?[cfg.width*.22,-cfg.depth*.09]:[cfg.width*.16,cfg.depth*.13];
  mesh=[...buildMesh(cfg,'cut',style),...buildMesh(cfg,'piece',style,offset)];
 }else mesh=buildMesh(cfg,view==='whole'||view==='filling'?'full':'cut',view==='whole'?'blank':view==='filling'?'filling':'coated');
 const camera=CAMERAS.find(c=>c.id===angle)||CAMERAS[0],referenceSlice=view==='slice'&&cfg.shape==='round'&&camera.id==='original',degrees=referenceSlice?camera.sliceElevation:camera.elevation,elevation=degrees*PI/180,S=Math.sin(elevation),C=Math.cos(elevation);
 const cutView=['cut','combo'].includes(view),phi=(referenceSlice?camera.sliceRound:cfg.shape==='round'?(cutView?camera.roundCut:camera.round):(cutView?camera.boxCut:camera.box))*PI/180,cp=Math.cos(phi),sp=Math.sin(phi);
 const materialKey=cfg.shape==='round'?(cfg.height===14?'round14':'round8'):cfg.shape,photoWhole=view==='whole'&&angle==='original',photo=photoWhole?PHOTO_PRESETS[materialKey]:null;
 let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
 for(const t of mesh)for(const v of t.v){const x=cp*v.x+sp*v.y,y=-sp*v.x+cp*v.y;v.px=x;v.py=-y*S-v.z*C;v.depth=-y*C+v.z*S;
  if(photo){v.px=photo.A*v.x+photo.B*v.y;v.py=photo.C*v.x+photo.D*v.y-photo.Z*v.z;v.u=photo.ox+photo.A*v.tx/cfg.width*photo.w+photo.B*v.ty/cfg.depth*photo.d;v.v=photo.oy+photo.C*v.tx/cfg.width*photo.w+photo.D*v.ty/cfg.depth*photo.d+photo.Z*(photo.h-v.z/cfg.height*photo.h);v.light=1;}
  xmin=Math.min(xmin,v.px);xmax=Math.max(xmax,v.px);ymin=Math.min(ymin,v.py);ymax=Math.max(ymax,v.py);}
 const frame=photoWhole&&cfg.height===14?.74:.79,sc=Math.min(size*frame/(xmax-xmin),size*frame/(ymax-ymin)),cx=size*.5-(xmin+xmax)*.5*sc,cy=size*.505-(ymin+ymax)*.5*sc;
 const length=size*size,depth=new Float32Array(length).fill(-Infinity),kind=new Uint8Array(length),u=new Float32Array(length),v=new Float32Array(length),light=new Float32Array(length),topMask=new Uint8Array(length),tx=new Float32Array(length),ty=new Float32Array(length);
 for(const t of mesh){
  const a=t.v[0],b=t.v[1],c=t.v[2];const ax=a.px*sc+cx,ay=a.py*sc+cy,bx=b.px*sc+cx,by=b.py*sc+cy,cx1=c.px*sc+cx,cy1=c.py*sc+cy;
  const den=(by-cy1)*(ax-cx1)+(cx1-bx)*(ay-cy1);if(Math.abs(den)<1e-7)continue;
  const x0=Math.max(0,Math.floor(Math.min(ax,bx,cx1))),x1=Math.min(size-1,Math.ceil(Math.max(ax,bx,cx1))),y0=Math.max(0,Math.floor(Math.min(ay,by,cy1))),y1=Math.min(size-1,Math.ceil(Math.max(ay,by,cy1)));
  for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++){
   const w1=((by-cy1)*(xx+.5-cx1)+(cx1-bx)*(yy+.5-cy1))/den,w2=((cy1-ay)*(xx+.5-cx1)+(ax-cx1)*(yy+.5-cy1))/den,w3=1-w1-w2;
   if(w1<-1e-5||w2<-1e-5||w3<-1e-5)continue;const at=yy*size+xx,z=a.depth*w1+b.depth*w2+c.depth*w3;if(z<depth[at]-1e-4)continue;
   depth[at]=z;kind[at]=t.kind+1;topMask[at]=t.top?1:0;tx[at]=a.tx*w1+b.tx*w2+c.tx*w3;ty[at]=a.ty*w1+b.ty*w2+c.ty*w3;u[at]=a.u*w1+b.u*w2+c.u*w3;v[at]=a.v*w1+b.v*w2+c.v*w3;light[at]=a.light*w1+b.light*w2+c.light*w3;
  }
 }
 return {size,kind,u,v,light,top:topMask,tx,ty,depth,photoWhole,camera:{scale:photo?sc*Math.hypot(photo.A,photo.B):sc,cx,cy,cp,sp,S,C,id:camera.id,elevation:degrees,affine:photo?[photo.A*sc,photo.B*sc,photo.C*sc,photo.D*sc,photo.Z*sc,cx,cy]:null},material:materialKey,bounds:[xmin,xmax,ymin,ymax],scale:sc,config:cfg,view};
}
export function paintGeometry(g,material,filling,color=undefined){
 const n=g.size,out=new Uint8ClampedArray(n*n*4),kd=g.kind,uu=g.u,vv=g.v,ll=g.light;
 const get=(tex,x,y,channel)=>{x=clamp(x,0,tex.width-1);y=clamp(y,0,tex.height-1);const ix=Math.floor(x),iy=Math.floor(y),jx=Math.min(ix+1,tex.width-1),jy=Math.min(iy+1,tex.height-1),fx=x-ix,fy=y-iy,dt=tex.data,cn=tex.channels||4;return mix(mix(dt[(iy*tex.width+ix)*cn+channel],dt[(iy*tex.width+jx)*cn+channel],fx),mix(dt[(jy*tex.width+ix)*cn+channel],dt[(jy*tex.width+jx)*cn+channel],fx),fy);};
 for(let i=0;i<kd.length;i++){
  if(!kd[i])continue;const at=i*4,food=kd[i]===2,tex=g.photographic?filling:food?filling:material;let x=uu[i],y=vv[i];
  if(food&&!g.photographic){x=clamp(x)*(tex.width-1);y=clamp(y)*(tex.height-1);}
  const rgb=[get(tex,x,y,0),get(tex,x,y,1),get(tex,x,y,2)];
  if(!food&&color&&g.view!=='filling'){
   const luminance=(rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722)/255,shade=Math.pow(luminance/.925,1.65),highlight=Math.max(0,luminance-.88)*36;
   for(let k=0;k<3;k++)rgb[k]=color[k]*shade+highlight;
  }
  for(let k=0;k<3;k++)out[at+k]=clamp(rgb[k]*ll[i],0,255);out[at+3]=g.photographic?g.alpha[i]:255;
 }
 // One subpixel contour filter. All colors/flavors use the exact same coverage mask.
 const src=out.slice();
 for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){
  const i=y*n+x;if(!kd[i]&&!kd[i-1]&&!kd[i+1]&&!kd[i-n]&&!kd[i+n])continue;
  if(kd[i]&&kd[i-1]&&kd[i+1]&&kd[i-n]&&kd[i+n])continue;
  const offsets=[i,i-1,i+1,i-n,i+n],weights=[4,1,1,1,1];let a=0,r=0,gr=0,b=0;
  for(let k=0;k<5;k++){const j=offsets[k]*4,w=weights[k]*src[j+3];a+=w;r+=src[j]*w;gr+=src[j+1]*w;b+=src[j+2]*w;}
  const at=i*4;if(a){out[at]=r/a;out[at+1]=gr/a;out[at+2]=b/a;out[at+3]=a/8;}
 }
 return out;
}

export function project(g,x,y,z){const c=g.camera;if(c.affine){const [a,b,d,e,h,ox,oy]=c.affine;return {x:a*x+b*y+ox,y:d*x+e*y-h*z+oy,depth:-(-c.sp*x+c.cp*y)*c.C+z*c.S};}const xx=c.cp*x+c.sp*y,yy=-c.sp*x+c.cp*y;return {x:xx*c.scale+c.cx,y:(-yy*c.S-z*c.C)*c.scale+c.cy,depth:-yy*c.C+z*c.S};}
export function isRemoved(cfg,x,y){if(cfg.shape==='round'){const a=Math.atan2(y,x)*180/Math.PI;return a>=-65&&a<=5;}return x>cfg.width*.19&&y>cfg.depth*.08;}
