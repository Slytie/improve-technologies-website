/* Recurion / Möbius Colony
 * Self-contained WebGL2. No external libraries, fonts, textures or network requests.
 * Analytic surface locomotion, not a biological or general-purpose physics model.
 */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const viewer=document.documentElement.dataset.viewer==='true';
const embedded = document.documentElement.dataset.embedded === 'true' || new URLSearchParams(location.search).has('embed');
let hostVisible = true;
if (embedded) document.body.classList.add('embedded');if(viewer)document.body.classList.add('viewer');
const TAU = Math.PI * 2, PERIOD = Math.PI * 4, R = 3.10, W = 1.08;
const MAX_ANTS = 144, TRAIL_LENGTH = 32, STEP = 1 / 60;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = {count:64, speed:1, light:.88, stars:.40, trails:true, edge:false, drift:false, hero:!embedded&&!viewer, wire:false, running:!reduced, follow:false, ant:0, ambient:false};
const world = {t:0, ticks:0, seed:7401, agents:[], trailTime:0};
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const mix = (a,b,t) => a + (b-a)*t;
const wrap = (x,p=PERIOD) => ((x%p)+p)%p;
function randomGenerator(seed) {return () => {seed|=0;seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};}
const add = (a,b) => [a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const sub = (a,b) => [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const mul = (a,s) => [a[0]*s,a[1]*s,a[2]*s];
const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const length = a => Math.hypot(...a);
const norm = a => mul(a,1/Math.max(1e-12,length(a)));
const vMix = (a,b,t) => [mix(a[0],b[0],t),mix(a[1],b[1],t),mix(a[2],b[2],t)];
function surface(u,v) {
 // Smoothly concentrated half-twist: θ(u + 2π) = θ(u) + π.
 // This is still one Möbius strip, not an infinity tube or two intersecting bands.
 const c=Math.cos(u),s=Math.sin(u),theta=.5*u+.26+.36*Math.sin(u),rate=.5+.36*Math.cos(u);
 const ch=Math.cos(theta),sh=Math.sin(theta),rad=R+v*ch;
 const center=.16*Math.sin(2*u+.6),dc=.32*Math.cos(2*u+.6);
 const p=[rad*c,v*sh+center,rad*s];
 const du=[-rad*s-rate*v*sh*c,rate*v*ch+dc,rad*c-rate*v*sh*s];
 const dv=[ch*c,sh,ch*s];
 return {p,du,dv,n:norm(cross(du,dv)),g:length(du)};
}
function frame(a) {
 const f=surface(a.u,a.v), t=norm(add(mul(f.du,a.dir),mul(f.dv,a.vRate*f.g/Math.max(.05,a.speedActual))));
 const z=norm(cross(t,f.n)),n=norm(cross(z,t));
 return {p:add(f.p,mul(n,.013)),t,n,z};
}
function newAgents(count=64) {
 const rng=randomGenerator(world.seed); const out=[];
 // Samples on the orientation double cover. Only 4π repeats both point AND frame.
 for(let i=0;i<count;i++) {
  const u=PERIOD*(i+.21*rng())/count;
  const lane=(rng()-.5)*1.62;
  out.push({u,v:lane,lane,dir:rng()>.18?1:-1,speed:.30+rng()*.17,speedActual:.4,phase:rng()*TAU,seed:rng()*TAU,vRate:0,distance:0,angleTravel:0,scale:.95+rng()*.23,history:[],travelStart:u});
 }
 world.agents=out;
 if(state.ant>=count)state.ant=0;
 for(const a of out) {a.f=frame(a);a.history.push([...a.f.p]);}
}
function tick(dt) {
 world.t+=dt;world.ticks++;
 const arr=world.agents;
 for(let i=0;i<arr.length;i++) {
  const a=arr[i],f=surface(a.u,a.v);
  let avoid=0,slow=1;
  for(let j=0;j<arr.length;j++) {
   if(i===j)continue; const b=arr[j];
   let du=wrap((b.u-a.u)+PERIOD/2)-PERIOD/2;
   if(Math.abs(du)>.105)continue;
   const across=a.v-b.v, ahead=du*a.dir;
   if(Math.abs(across)<.17 && ahead>0 && ahead<.09) {
    slow=Math.min(slow,.50+.5*clamp(ahead/.09,0,1));
    avoid+=(across>=0?1:-1)*.032*(1-Math.abs(across)/.17);
   }
  }
  const desired=clamp(a.lane+.035*Math.sin(a.u*1.5+a.seed)+avoid,-.88,.88);
  a.vRate=(desired-a.v)*1.6;
  a.speedActual=a.speed*slow;
 }
 for(const a of arr) {
  const f=surface(a.u,a.v), da=a.dir*a.speedActual*dt/f.g;
  a.u=wrap(a.u+da);a.angleTravel+=Math.abs(da);a.v=clamp(a.v+a.vRate*dt,-.89,.89);
  const ds=Math.hypot(a.speedActual,a.vRate)*dt;
  a.distance+=ds;a.phase=wrap(a.phase+ds/.132*TAU,TAU);a.f=frame(a);
 }
 world.trailTime+=dt;
 if(world.trailTime>=.095) {
  world.trailTime%=.095;
  for(const a of arr){a.history.unshift(add(a.f.p,mul(a.f.n,.004)));if(a.history.length>TRAIL_LENGTH)a.history.pop();}
 }
}
newAgents();

const canvas=$('scene');
let gl;
try {gl=canvas.getContext('webgl2',{antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:true});} catch(e) {}
function fallback(msg) {$('fallback').hidden=false;$('fallbackDetail').textContent=msg||'';$('loading').hidden=true;}
if(!gl){fallback('WebGL 2 was not available.');return;}
let lost=false;
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;fallback('The graphics context was interrupted. Reload to restore the study.');});
canvas.addEventListener('webglcontextrestored',()=>location.reload());
function program(vs,fs) {
 const compile=(type,code)=>{const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
 const p=gl.createProgram(),v=compile(gl.VERTEX_SHADER,vs),f=compile(gl.FRAGMENT_SHADER,fs);gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));gl.deleteShader(v);gl.deleteShader(f);
 return {p,loc:{},u(name){return this.loc[name]??(this.loc[name]=gl.getUniformLocation(p,name));}};
}
const head='#version 300 es\nprecision highp float;\n';
let programs;
try {
programs={
 background:program(head+`out vec2 uv;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);uv=p;gl_Position=vec4(p*2.-1.,0,1);}`,head+`
 in vec2 uv;out vec4 color;uniform vec2 res;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 void main(){vec2 p=(uv-.5)*vec2(res.x/res.y,1.);float halo=exp(-dot(p-vec2(.35,.08),p-vec2(.35,.08))*1.4);float cloud=exp(-pow(p.y+.3*p.x-.09,2.)*18.);float grain=(hash(gl_FragCoord.xy)-.5)*.003;vec3 c=vec3(.009,.021,.019)+halo*vec3(.009,.019,.016)+cloud*vec3(.002,.004,.003);color=vec4(c+grain,1.);}`),
 ribbon:program(head+`
 layout(location=0)in vec3 pos;layout(location=1)in vec3 normal;layout(location=2)in vec2 param;
 uniform mat4 vp;uniform mat4 lightVP;out vec3 wPos;out vec3 n;out vec2 uv;out vec4 shadowPos;
 void main(){wPos=pos;n=normal;uv=param;shadowPos=lightVP*vec4(pos,1.);gl_Position=vp*vec4(pos,1.);}`,head+`
 in vec3 wPos;in vec3 n;in vec2 uv;in vec4 shadowPos;out vec4 color;
 uniform vec3 eye;uniform float illumination;uniform bool wire;uniform sampler2D shadowMap;
 float visibility(vec3 N,vec3 L){
  vec3 p=shadowPos.xyz/shadowPos.w*.5+.5;
  if(any(lessThan(p,vec3(0.)))||any(greaterThan(p,vec3(1.))))return 1.;
  float bias=max(.0015,.0045*(1.-abs(dot(N,L))));float s=0.;vec2 px=1./vec2(textureSize(shadowMap,0));
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++)s+=(p.z-bias<=texture(shadowMap,p.xy+vec2(x,y)*px).r)?1.:0.;
  return mix(.16,1.,s/9.);
 }
 void main(){
  vec3 N=normalize(n)*(gl_FrontFacing?1.:-1.);vec3 V=normalize(eye-wPos);
  vec3 L=normalize(vec3(-4.,8.,6.));float d=max(dot(N,L),0.);float s=visibility(N,L);
  float fill=max(dot(N,normalize(vec3(4.,1.,-6.))),0.);
  float rim=pow(1.-abs(dot(N,V)),3.);float spec=pow(max(dot(N,normalize(L+V)),0.),48.);
  // 34 clear longitudinal ribs are enough to describe the folding surface.
  float lane=(uv.y/1.08*.5+.5)*34.;float f=abs(fract(lane+.5)-.5);
  float aa=max(fwidth(lane)*.75,.012);float line=1.-smoothstep(.10-aa,.10+aa,f);
  float edge=smoothstep(1.059,1.079,abs(uv.y));
  if(wire&&max(line,edge)<.17)discard;
  vec3 jade=vec3(.42,.51,.43);vec3 lit=jade*(.12+1.05*d*s+.20*fill);
  lit+=vec3(.79,.85,.71)*spec*.35*s;
  lit*=1.-line*.46;
  lit+=rim*vec3(.09,.13,.10)+edge*vec3(.12,.17,.13);
  // Restrained exposure; dark return face remains visibly distinct from lit folds.
  lit*=mix(.45,1.55,illumination);
  color=vec4(lit,1.);
 }`),
 depth:program(head+`layout(location=0)in vec3 pos;uniform mat4 vp;void main(){gl_Position=vp*vec4(pos,1.);}`,head+`void main(){}`),
 ant:program(head+`
 layout(location=0)in vec3 pos;layout(location=1)in vec3 normal;layout(location=2)in vec4 tint;layout(location=3)in vec3 kind;layout(location=4)in vec4 m0;layout(location=5)in vec4 m1;layout(location=6)in vec4 m2;layout(location=7)in vec4 m3;layout(location=8)in vec2 motion;
 uniform mat4 vp;out vec3 wPos;out vec3 n;out vec4 col;
 void main(){vec3 p=pos,nn=normal;float type=kind.x,side=kind.y,j=kind.z;
 if(type>.5){float phase=motion.x+((mod(j,2.)<.5)==(side>0.)?0.:3.14159265);float swing=max(0.,sin(phase));float back=cos(phase)*.031;float bx=(1.-j)*.034;
 vec3 shoulder=vec3(bx,.047,side*.019),knee=vec3(bx+(1.-j)*.014+back*.42,.067+swing*.011,side*.062),foot=vec3(bx+(1.-j)*.032+back,.002+swing*.033,side*.094);
 vec3 a=shoulder,b=knee;float radius=.0031;
 if(type>1.5&&type<2.5){a=knee;b=foot;radius=.0021;}
 if(type>2.5&&type<3.5){a=vec3(.087,.070,side*.014);b=vec3(.132+sin(motion.x*.45+side)*.009,.083,side*(.030+.006*sin(motion.x*.62)));radius=.0015;}
 if(type>3.5&&type<4.5){p=knee+pos*.0046;nn=normal;}
 else if(type>4.5){p=foot+pos*.0037;nn=normal;}
 else {vec3 axis=normalize(b-a);vec3 right=normalize(cross(axis,vec3(0,1,0)));vec3 up=cross(axis,right);p=mix(a,b,pos.y)+radius*(right*pos.x+up*pos.z);nn=normalize(right*normal.x+up*normal.z);}}
 mat4 M=mat4(m0,m1,m2,m3);wPos=(M*vec4(p,1)).xyz;n=normalize(mat3(M)*nn);col=tint;gl_Position=vp*vec4(wPos,1.);}`,head+`
 in vec3 wPos;in vec3 n;in vec4 col;uniform vec3 eye;out vec4 color;
 void main(){vec3 N=normalize(n),V=normalize(eye-wPos);vec3 L=normalize(vec3(-3,7,5));float d=max(dot(N,L),0.);float rim=pow(1.-abs(dot(N,V)),2.);float spec=pow(max(dot(N,normalize(L+V)),0.),32.);vec3 c=col.rgb*(.33+d*.83)+spec*vec3(.65,.78,.60)+rim*col.rgb*.40;c=mix(c,col.rgb*1.35,col.a);color=vec4(c,1);}`),
 stars:program(head+`
 layout(location=0)in vec3 pos;layout(location=1)in vec2 data;uniform mat4 vp;uniform float px;uniform float time;out float a;
 void main(){vec4 p=vp*vec4(pos,1);gl_Position=p;gl_PointSize=data.x*px;a=data.y*(.90+.10*sin(time*.27+pos.x));}`,head+`
 in float a;out vec4 color;uniform float strength;
 void main(){float r=length(gl_PointCoord-.5)*2.;float v=smoothstep(1.,.06,r);color=vec4(vec3(.74,.84,.74),a*v*strength);}`),
 trail:program(head+`
 layout(location=0)in vec3 pos;layout(location=1)in float opacity;uniform mat4 vp;out float a;void main(){gl_Position=vp*vec4(pos,1);a=opacity;}`,head+`in float a;out vec4 color;void main(){color=vec4(.57,.77,.54,a);}`),
 glow:program(head+`
 layout(location=0)in vec3 pos;layout(location=1)in float a0;uniform mat4 vp;uniform float pixelScale;out float a;void main(){vec4 p=vp*vec4(pos,1);gl_Position=p;gl_PointSize=clamp(pixelScale*.17/p.w,3.,90.);a=a0;}`,head+`
 in float a;out vec4 color;void main(){float r=length(gl_PointCoord-.5)*2.;float light=exp(-r*r*7.)*smoothstep(1.,.8,r);color=vec4(.70,.91,.62,light*a);}`)
};
} catch(e) {fallback('Renderer initialization: '+e.message);console.error(e);return;}
function buffer(data,dynamic=false){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,dynamic?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);return b;}
function attrib(loc,size,stride,offset,div=0){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,stride,offset);if(div)gl.vertexAttribDivisor(loc,div);}
function upload(b,data){gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferSubData(gl.ARRAY_BUFFER,0,data);}
const bgVao=gl.createVertexArray();
// Surface mesh: deliberately not seam-welded. There is no global oriented normal.
const strip=[];const NU=480,NV=64;
function surfVertex(i,j){const u=i/NU*TAU,v=(j/NV*2-1)*W,f=surface(u,v);return [...f.p,...f.n,u,v];}
for(let i=0;i<NU;i++)for(let j=0;j<NV;j++){let a=surfVertex(i,j),b=surfVertex(i+1,j),c=surfVertex(i,j+1),d=surfVertex(i+1,j+1);strip.push(...a,...b,...c,...b,...d,...c);}
const ribbonVao=gl.createVertexArray();gl.bindVertexArray(ribbonVao);buffer(new Float32Array(strip));attrib(0,3,32,0);attrib(1,3,32,12);attrib(2,2,32,24);const ribbonCount=strip.length/8;
// One instanced ant mesh. Six legs articulate in the GPU; bodies follow analytic frames.
const antGeo=[];
function vertex(p,n,c,k=[0,0,0]){antGeo.push(...p,...n,...c,...k);}
function sphere(center,scale,c,k=[0,0,0],nx=12,ny=8){
 const point=(i,j)=>{let a=i/nx*TAU,b=j/ny*Math.PI;let q=[Math.sin(b)*Math.cos(a),Math.cos(b),Math.sin(b)*Math.sin(a)];return {p:[center[0]+scale[0]*q[0],center[1]+scale[1]*q[1],center[2]+scale[2]*q[2]],n:norm([q[0]/scale[0],q[1]/scale[1],q[2]/scale[2]])};};
 for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const a=point(i,j),b=point(i+1,j),d=point(i+1,j+1),e=point(i,j+1);for(const q of [a,b,e,b,d,e])vertex(q.p,q.n,c,k);}
}
function box(center,size,c){const corners=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];const faces=[[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]];for(const face of faces){const n=norm(cross(sub(corners[face[1]],corners[face[0]]),sub(corners[face[2]],corners[face[0]])));for(const idx of [face[0],face[1],face[2],face[0],face[2],face[3]])vertex(corners[idx].map((v,i)=>center[i]+v*size[i]*.5),n,c);}}
const shell=[.18,.24,.20,0],headColor=[.28,.35,.28,0],metal=[.43,.51,.39,0],led=[.65,.90,.47,.9];
sphere([-.066,.062,0],[.052,.038,.038],shell);
sphere([-.009,.055,0],[.032,.025,.023],metal);
sphere([.053,.064,0],[.034,.028,.028],headColor);
box([-.007,.079,0],[.032,.007,.024],[.055,.095,.064,0]);
box([.001,.084,0],[.008,.002,.018],led);
for(let i=0;i<3;i++)box([-.088+i*.016,.098,0],[.007,.003,.015],[.57,.74,.43,.75]);
for(const side of [-1,1])sphere([.077,.072,side*.021],[.008,.007,.008],led,[0,0,0],8,6);
function cylinder(k,c){const sides=6;for(let i=0;i<sides;i++){let a=i/sides*TAU,b=(i+1)/sides*TAU;const v=(ang,h)=>({p:[Math.cos(ang),h,Math.sin(ang)],n:[Math.cos(ang),0,Math.sin(ang)]});for(const q of [v(a,0),v(b,0),v(a,1),v(b,0),v(b,1),v(a,1)])vertex(q.p,q.n,c,k);}}
for(const side of [-1,1]){for(let j=0;j<3;j++){cylinder([1,side,j],metal);cylinder([2,side,j],[.38,.49,.35,0]);sphere([0,0,0],[1,1,1],[.23,.33,.24,.1],[4,side,j],6,4);sphere([0,0,0],[1,1,1],[.65,.81,.50,.4],[5,side,j],6,4);}cylinder([3,side,0],[.73,.79,.59,.3]);}
const antVao=gl.createVertexArray();gl.bindVertexArray(antVao);buffer(new Float32Array(antGeo));attrib(0,3,52,0);attrib(1,3,52,12);attrib(2,4,52,24);attrib(3,3,52,40);const antVertexCount=antGeo.length/13;
const instanceData=new Float32Array(MAX_ANTS*18);const instanceBuffer=buffer(instanceData,true);for(let i=0;i<4;i++)attrib(4+i,4,72,i*16,1);attrib(8,2,72,64,1);
const starData=[];const rng=randomGenerator(937);for(let i=0;i<2600;i++){const a=rng()*TAU,z=rng()*2-1,rr=25+rng()*70,s=Math.sqrt(1-z*z);starData.push(rr*s*Math.cos(a),rr*z,rr*s*Math.sin(a),.55+Math.pow(rng(),4)*2.1,.12+Math.pow(rng(),2)*.75);}
const starVao=gl.createVertexArray();gl.bindVertexArray(starVao);buffer(new Float32Array(starData));attrib(0,3,20,0);attrib(1,2,20,12);
const edgeData=new Float32Array(961*4);const edgePositions=[];
for(let i=0;i<=960;i++){const f=surface(PERIOD*i/960,W);edgePositions.push(add(f.p,mul(f.n,.004)));}
const edgeVao=gl.createVertexArray();gl.bindVertexArray(edgeVao);const edgeBuffer=buffer(edgeData,true);attrib(0,3,16,0);attrib(1,1,16,12);
const trailData=new Float32Array(MAX_ANTS*(TRAIL_LENGTH-1)*2*4);const trailVao=gl.createVertexArray();gl.bindVertexArray(trailVao);const trailBuffer=buffer(trailData,true);attrib(0,3,16,0);attrib(1,1,16,12);
const glowData=new Float32Array(MAX_ANTS*4);const glowVao=gl.createVertexArray();gl.bindVertexArray(glowVao);const glowBuffer=buffer(glowData,true);attrib(0,3,16,0);attrib(1,1,16,12);
let viewWidth=innerWidth,viewHeight=innerHeight,dpr=1,small=innerWidth<701;
const camera={yaw:.45,pitch:.84,distance:12.4,targetDistance:12.4,eye:[5,7,9],target:[0,0,0],up:[0,1,0],followZoom:1,offset:[-.27,0],initialized:false};
function overviewDistance(){if(viewer&&small)return Math.max(25,11.6*viewHeight/viewWidth);if(embedded)return small?Math.max(13.2,10.9*viewHeight/viewWidth):Math.max(15.0,21.0*viewHeight/viewWidth);return innerWidth<701?clamp(20.8*(innerHeight/844)*(390/innerWidth),16,28):Math.max(13.2,14*innerHeight/innerWidth);}
function resetCamera(){small=innerWidth<701;camera.yaw=.45;camera.pitch=.84;camera.targetDistance=overviewDistance();camera.followZoom=1;state.follow=false;syncFollow();}
function perspective(fov,aspect,near,far,offX,offY){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,offX,offY,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
function lookAt(eye,at,up){const z=norm(sub(eye,at)),x=norm(cross(up,z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
function mm(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
function resize(){viewWidth=innerWidth;viewHeight=innerHeight;const prev=small;small=viewWidth<701;dpr=Math.min(devicePixelRatio||1,small?1.75:1.65);canvas.width=Math.round(viewWidth*dpr);canvas.height=Math.round(viewHeight*dpr);gl.viewport(0,0,canvas.width,canvas.height);if(prev!==small&&!state.follow)camera.targetDistance=overviewDistance();}
function orthographic(l,r,b,t,n,f){return new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]);}
const lightVP=mm(orthographic(-5.5,5.5,-5.5,5.5,.5,26),lookAt([-7,14,10.5],[0,0,0],[0,1,0]));
const shadowTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,shadowTexture);
gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,1024,1024,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
const shadowFramebuffer=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,shadowFramebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,shadowTexture,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);
if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){fallback('Shadow framebuffer could not be initialized.');return;}
gl.viewport(0,0,1024,1024);gl.enable(gl.DEPTH_TEST);gl.clear(gl.DEPTH_BUFFER_BIT);gl.disable(gl.CULL_FACE);gl.useProgram(programs.depth.p);gl.uniformMatrix4fv(programs.depth.u('vp'),false,lightVP);gl.bindVertexArray(ribbonVao);gl.drawArrays(gl.TRIANGLES,0,ribbonCount);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
resize();resetCamera();camera.distance=camera.targetDistance;
let vp,frames=0,drawCalls=0;
function render(dt=1/60){if(lost)return;const smooth=1-Math.exp(-dt*4);camera.distance=mix(camera.distance,camera.targetDistance,smooth);
 let desiredEye,desiredTarget,desiredUp,ox,oy;
 if(state.follow){const a=world.agents[state.ant],f=a.f;const z=camera.followZoom;desiredTarget=add(f.p,add(mul(f.t,.08),mul(f.n,.065)));desiredEye=add(f.p,add(mul(f.n,.78*z),add(mul(f.t,-.82*z),mul(f.z,.48*z))));desiredUp=f.n;ox=small?0:-.21;oy=small?-.18:0;}
 else {if(state.drift&&state.running&&!dragging)camera.yaw+=dt*.010;const d=camera.distance;desiredTarget=[0,0,0];desiredEye=[d*Math.cos(camera.pitch)*Math.sin(camera.yaw),d*Math.sin(camera.pitch),d*Math.cos(camera.pitch)*Math.cos(camera.yaw)];desiredUp=[.32,1,.08];ox=embedded?(small?0:-.40):(state.ambient||!state.hero?0:(small?0:-.40));oy=embedded?(small?-.23:0):(small&&!state.ambient&&!viewer?-.29:0);}
 if(!camera.initialized){camera.eye=desiredEye;camera.target=desiredTarget;camera.up=desiredUp;camera.offset=[ox,oy];camera.initialized=true;}
 else {camera.eye=vMix(camera.eye,desiredEye,smooth);camera.target=vMix(camera.target,desiredTarget,smooth);camera.up=norm(vMix(camera.up,desiredUp,smooth));camera.offset=vMix([...camera.offset,0],[ox,oy,0],smooth).slice(0,2);}
 vp=mm(perspective(Math.PI/4.3,viewWidth/viewHeight,.015,160,...camera.offset),lookAt(camera.eye,camera.target,camera.up));
 gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.clearColor(.02,.04,.03,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 let p=programs.background;gl.useProgram(p.p);gl.bindVertexArray(bgVao);gl.uniform2f(p.u('res'),canvas.width,canvas.height);gl.drawArrays(gl.TRIANGLES,0,3);
 gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);p=programs.stars;gl.useProgram(p.p);gl.bindVertexArray(starVao);gl.uniformMatrix4fv(p.u('vp'),false,vp);gl.uniform1f(p.u('px'),dpr);gl.uniform1f(p.u('time'),world.t);gl.uniform1f(p.u('strength'),.78);gl.drawArrays(gl.POINTS,0,Math.floor(2600*state.stars));
 gl.disable(gl.BLEND);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);
 p=programs.ribbon;gl.useProgram(p.p);gl.bindVertexArray(ribbonVao);gl.uniformMatrix4fv(p.u('vp'),false,vp);gl.uniform3fv(p.u('eye'),camera.eye);gl.uniform1f(p.u('illumination'),state.light);gl.uniform1i(p.u('wire'),+state.wire);gl.uniformMatrix4fv(p.u('lightVP'),false,lightVP);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,shadowTexture);gl.uniform1i(p.u('shadowMap'),0);gl.drawArrays(gl.TRIANGLES,0,ribbonCount);
 for(let i=0;i<world.agents.length;i++) {const a=world.agents[i],f=a.f,s=a.scale,o=i*18;instanceData.set([f.t[0]*s,f.t[1]*s,f.t[2]*s,0,f.n[0]*s,f.n[1]*s,f.n[2]*s,0,f.z[0]*s,f.z[1]*s,f.z[2]*s,0,...f.p,1,a.phase,i===state.ant?1:0],o);const gp=add(f.p,add(mul(f.n,.092*s),mul(f.t,.011*s)));glowData.set([...gp,.30],i*4);}
 upload(instanceBuffer,instanceData.subarray(0,state.count*18));p=programs.ant;gl.useProgram(p.p);gl.bindVertexArray(antVao);gl.uniformMatrix4fv(p.u('vp'),false,vp);gl.uniform3fv(p.u('eye'),camera.eye);gl.drawArraysInstanced(gl.TRIANGLES,0,antVertexCount,state.count);
 gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.depthMask(false);drawCalls=5;
 if(state.trails){let v=0;for(const a of world.agents){const h=a.history;for(let j=0;j<h.length-1;j++){const alpha=.18*Math.pow(1-j/(TRAIL_LENGTH-1),1.6);trailData.set([...h[j],alpha,...h[j+1],alpha*.91],v);v+=8;}}if(v){upload(trailBuffer,trailData.subarray(0,v));p=programs.trail;gl.useProgram(p.p);gl.bindVertexArray(trailVao);gl.uniformMatrix4fv(p.u('vp'),false,vp);gl.drawArrays(gl.LINES,0,v/4);drawCalls++;}}
 if(state.edge){
  const at=wrap(world.t*.17)/PERIOD;
  for(let i=0;i<=960;i++){const behind=wrap(at-i/960,1);const alpha=.20+.80*Math.exp(-behind*25.);edgeData.set([...edgePositions[i],alpha],i*4);}
  upload(edgeBuffer,edgeData);p=programs.trail;gl.useProgram(p.p);gl.bindVertexArray(edgeVao);gl.uniformMatrix4fv(p.u('vp'),false,vp);gl.drawArrays(gl.LINE_STRIP,0,961);drawCalls++;
 }
 upload(glowBuffer,glowData.subarray(0,state.count*4));p=programs.glow;gl.useProgram(p.p);gl.bindVertexArray(glowVao);gl.uniformMatrix4fv(p.u('vp'),false,vp);gl.uniform1f(p.u('pixelScale'),canvas.height/(2*Math.tan(Math.PI/8.6)));gl.drawArrays(gl.POINTS,0,state.count);gl.depthMask(true);gl.disable(gl.BLEND);frames++;
}
// User interaction: DOM UI is independent from simulation and rendering.
let dragging=false,lastPointer=null,pinchDistance=0,pointers=new Map(),toastTimer;
function toast(msg){$('toast').textContent=msg;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3300);}
function setSettings(open){$('settings').hidden=!open;$('settingsBtn').setAttribute('aria-expanded',String(open));}
function syncPlay(){document.body.classList.toggle('paused',!state.running);$('pauseIcon').hidden=!state.running;$('playIcon').hidden=state.running;$('play').setAttribute('aria-label',state.running?'Pause simulation':'Play simulation');$('stateLabel').textContent=state.running?'LIVE':'PAUSED';}
function syncFollow(){document.body.classList.toggle('following',state.follow);$('followInfo').hidden=!state.follow;$('follow').setAttribute('aria-pressed',String(state.follow));$('followText').textContent=state.follow?'Leave traveler':'Follow an ant';$('antId').textContent=String(state.ant+1).padStart(2,'0');$('gestureHint').textContent=state.follow?'SCROLL TO MOVE CLOSER · R TO RETURN':'DRAG TO ORBIT · SCROLL TO EXPLORE';}
function follow(toggle=true){state.follow=toggle?!state.follow:true;camera.followZoom=1;syncFollow();if(state.follow){setSettings(false);toast('Following traveler '+String(state.ant+1).padStart(2,'0')+'. Scroll to move closer.');}}
function setAmbient(v){state.ambient=v;document.body.classList.toggle('ambient',v);$('restoreUI').hidden=!v;setSettings(false);if(v){state.follow=false;syncFollow();}resize();}
function resetAll(){Object.assign(state,{count:64,speed:1,light:.88,stars:.40,trails:true,edge:false,drift:false,hero:!embedded&&!viewer,wire:false,running:!reduced,follow:false,ant:0});world.t=0;world.ticks=0;world.trailTime=0;newAgents(64);for(const [id,val]of Object.entries({count:64,speed:1,light:88,stars:40}))$(id).value=val;for(const id of ['trails','edge','drift','hero','wire'])$(id).checked=state[id];document.body.classList.remove('no-copy');updateOutputs();syncPlay();resetCamera();toast('Study reset. Same initial colony.');}
function updateOutputs(){$('countOut').textContent=state.count;$('speedOut').textContent=state.speed.toFixed(1)+'×';$('lightOut').textContent=Math.round(state.light*100)+'%';$('starsOut').textContent=Math.round(state.stars*100)+'%';$('statCount').textContent=state.count;}
$('settingsBtn').onclick=()=>setSettings($('settings').hidden);$('closeSettings').onclick=()=>setSettings(false);
$('play').onclick=()=>{state.running=!state.running;syncPlay();};$('home').onclick=resetCamera;$('brandHome').onclick=e=>{e.preventDefault();resetCamera();};$('follow').onclick=()=>follow();$('introFollow').onclick=()=>follow(false);$('nextAnt').onclick=()=>{state.ant=(state.ant+1)%state.count;syncFollow();};$('ambient').onclick=()=>setAmbient(true);$('restoreUI').onclick=()=>setAmbient(false);$('resetAll').onclick=resetAll;
$('aboutBtn').onclick=()=>{$('about').showModal();};$('closeAbout').onclick=()=>$('about').close();$('about').addEventListener('click',e=>{const r=$('about').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('about').close();});
$('count').oninput=e=>{state.count=+e.target.value;newAgents(state.count);updateOutputs();syncFollow();};
$('speed').oninput=e=>{state.speed=+e.target.value;updateOutputs();};$('light').oninput=e=>{state.light=+e.target.value/100;updateOutputs();};$('stars').oninput=e=>{state.stars=+e.target.value/100;updateOutputs();};
for(const key of ['trails','edge','drift','hero','wire'])$(key).onchange=e=>{state[key]=e.target.checked;if(key==='hero')document.body.classList.toggle('no-copy',!state.hero);};
$('snapshot').onclick=()=>{render(0);canvas.toBlob(blob=>{if(!blob){toast('This browser could not save a frame.');return;}const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='Recurion-Mobius-'+String(Math.floor(world.t)).padStart(4,'0')+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('Saved the scene without interface.');},'image/png');};
canvas.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,[e.clientX,e.clientY]);canvas.setPointerCapture(e.pointerId);dragging=true;lastPointer=[e.clientX,e.clientY];if(pointers.size===2){const [a,b]=[...pointers.values()];pinchDistance=Math.hypot(a[0]-b[0],a[1]-b[1]);}});
canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const prev=pointers.get(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2){const [a,b]=[...pointers.values()],pd=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinchDistance>0){if(state.follow)camera.followZoom=clamp(camera.followZoom*pinchDistance/pd,.35,4);else camera.targetDistance=clamp(camera.targetDistance*pinchDistance/pd,5,30);}pinchDistance=pd;}else if(!state.follow){camera.yaw-=(e.clientX-prev[0])*.005;camera.pitch=clamp(camera.pitch+(e.clientY-prev[1])*.005,-1.43,1.43);} });
const release=e=>{pointers.delete(e.pointerId);dragging=pointers.size>0;pinchDistance=0;lastPointer=null;};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
canvas.addEventListener('wheel',e=>{e.preventDefault();const z=Math.exp(clamp(e.deltaY,-100,100)*.0017);if(state.follow)camera.followZoom=clamp(camera.followZoom*z,.35,4);else camera.targetDistance=clamp(camera.targetDistance*z,4.5,30);},{passive:false});
window.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select')||$('about').open)return;if(e.code==='Space'){e.preventDefault();state.running=!state.running;syncPlay();}else if(e.key.toLowerCase()==='f'){follow();}else if(e.key.toLowerCase()==='h'){setAmbient(!state.ambient);}else if(e.key.toLowerCase()==='r'){resetCamera();}else if(e.key==='Escape'){if(state.ambient)setAmbient(false);else if(!$('settings').hidden)setSettings(false);else if(state.follow)resetCamera();else if(viewer)parent.postMessage({type:'improve-viewer-close'},'*');}});
window.addEventListener('message',event=>{
 if(event.source!==parent||!event.data||event.data.type!=='improve-scene')return;
 const d=event.data;
 if(d.action==='visibility'){hostVisible=!!d.value;last=performance.now();accumulator=0;}
 if(d.action==='running'){state.running=!!d.value;syncPlay();}
 if(d.action==='follow'){follow(false);}
 if(d.action==='overview'){resetCamera();}
 if(d.action==='fold'){foldView();}
});
function foldView(){state.follow=false;syncFollow();camera.yaw=.52;camera.pitch=.71;camera.targetDistance=small?Math.max(25,11.6*viewHeight/viewWidth):(state.ambient?11.5:12.4);state.edge=true;$('edge').checked=true;state.drift=false;$('drift').checked=false;toast('Follow the light: both apparent rims are one continuous edge.');}
$('foldView').onclick=()=>foldView();
window.addEventListener('resize',resize);
let last=performance.now(),accumulator=0,uiTime=0,external=false;
document.addEventListener('visibilitychange',()=>{last=performance.now();accumulator=0;});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>{state.running=!e.matches;state.drift=false;$('drift').checked=false;syncPlay();});
function animate(now){requestAnimationFrame(animate);if(external||document.hidden||lost||!hostVisible)return;let dt=Math.min((now-last)/1000,.10);last=now;
 if(state.running){accumulator+=dt*state.speed;let steps=0;while(accumulator>=STEP&&steps<20){tick(STEP);accumulator-=STEP;steps++;}}else accumulator=0;
 render(dt);uiTime+=dt;if(uiTime>.18){updateReadouts();uiTime=0;}
 if(frames===2){$('loading').classList.add('done');setTimeout(()=>$('loading').hidden=true,650);}
}
function updateReadouts(){const sec=Math.floor(world.t),mins=Math.floor(sec/60);$('clock').textContent=String(mins).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');if(state.follow){const progress=wrap(world.agents[state.ant].angleTravel)/PERIOD;$('lapProgress').style.width=(progress*100)+'%';$('lapReadout').textContent=(progress*2).toFixed(2)+' / 2 laps';}}
syncPlay();updateOutputs();$('drift').checked=state.drift;
const query=new URLSearchParams(location.search);
if(location.hash==='#background' || query.get('background')==='1')setAmbient(true);
if(location.hash==='#embed' || query.get('embed')==='1'){setAmbient(true);document.body.classList.add('embed');canvas.tabIndex=-1;}
requestAnimationFrame(animate);
// Deterministic review hooks: inspect state, step the simulation, save exact frames.
window.MobiusStudy={
 getState:()=>({settings:{...state},time:world.t,ticks:world.ticks,frames,drawCalls,antVertices:antVertexCount,ribbonVertices:ribbonCount,viewport:[viewWidth,viewHeight],camera:{...camera},agents:world.agents.map((a,i)=>({id:i,u:a.u,v:a.v,phase:a.phase,position:a.f.p,normal:a.f.n,tangent:a.f.t,distance:a.distance,angleTravel:a.angleTravel,history:a.history.length}))}),
 surface,frame,
 setPaused(v){state.running=!v;syncPlay();},
 setFollow(i=0){state.ant=clamp(i,0,state.count-1);state.follow=true;syncFollow();},
 setAmbient,
 setExternal(v=true){external=v;last=performance.now();$('loading').hidden=true;},
 step(seconds=1/60){let remain=seconds;while(remain>1e-9){const dt=Math.min(STEP,remain);tick(dt);remain-=dt;}render(Math.max(1/60,seconds));updateReadouts();},
 render:()=>render(1/60),
 settle(){render(2);updateReadouts();},
 reset:resetAll,
 setCamera(yaw,pitch,distance){state.follow=false;syncFollow();camera.yaw=yaw;camera.pitch=pitch;camera.distance=camera.targetDistance=distance;camera.initialized=false;render(1/60);},
 error:()=>gl.getError(),
 topologyCheck(){const max=(a,b)=>Math.max(...a.map((x,i)=>Math.abs(x-b[i])));let closure=0,normal=0,twist=0;for(const v of [-.6,0,.6]){const a=surface(.47,v),b=surface(.47+PERIOD,v),c=surface(.47+TAU,-v);closure=Math.max(closure,max(a.p,b.p),max(a.n,b.n));normal=Math.max(normal,Math.abs(length(a.n)-1),Math.abs(dot(a.n,a.du)),Math.abs(dot(a.n,a.dv)));twist=Math.max(twist,max(a.p,c.p),max(a.n,mul(c.n,-1)));}return {closure,normal,twist};}
};
window.ImproveRefined={state,camera,world,surface,foldView,resetCamera,render,
 projectedBounds(){let lo=[Infinity,Infinity],hi=[-Infinity,-Infinity];for(let i=0;i<480;i++)for(const v of [-W,0,W]){const p=surface(i/480*TAU,v).p;const q=[0,0,0,0];for(let j=0;j<4;j++)q[j]=vp[j]*p[0]+vp[4+j]*p[1]+vp[8+j]*p[2]+vp[12+j];for(let j=0;j<2;j++){lo[j]=Math.min(lo[j],q[j]/q[3]);hi[j]=Math.max(hi[j],q[j]/q[3]);}}return {lo,hi};},
 view(yaw,pitch,distance){camera.yaw=yaw;camera.pitch=pitch;camera.distance=camera.targetDistance=distance;camera.initialized=false;state.drift=false;render(0);},
 setTime(seconds){world.t=0;world.ticks=0;world.trailTime=0;newAgents(state.count);for(let i=0;i<Math.round(seconds/STEP);i++)tick(STEP);render(1);}
};
if(embedded){parent.postMessage({type:'improve-scene-ready'},'*');}
})();
