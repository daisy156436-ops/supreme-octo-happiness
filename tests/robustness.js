const E=require('./engine.js');
const S={legLen:100,lastLen:'',zoneLen:20,zoneBefore:10,runup:0,margin:2,gain:1,footCm:25,reactRecv:0.15,safety:0.1};
function gauss(r){return Math.sqrt(-2*Math.log(r()))*Math.cos(2*Math.PI*r());}
function cls(seed,n){const r=E.rng(seed);const a=[];for(let i=0;i<n;i++){const m=i%2==0;a.push({g:m?'男':'女',t:Math.min(11,Math.max(6.4,(m?7.8:8.9)+gauss(r)*(m?0.55:0.65)))});}return a;}
const base={...E.MODEL};
function setM(o){Object.assign(E.MODEL,base,o);for(const k in E.__c)delete E.__c[k];}
function profsFor(ts){return ts.map(t=>E.makeProfile(E.solveVmNC(t,50),220));}
E.solveVmNC=function(time,dist){let lo=2,hi=14;const target=time-E.MODEL.react;for(let k=0;k<40;k++){const mid=(lo+hi)/2,p=E.makeProfile(mid,dist+1);if(E.tAt(p,dist)>target)lo=mid;else hi=mid;}return (lo+hi)/2;};
function opt(profs,N){const G=E.makeGeom(S,N);const M=E.pairMatrix(profs,G);const ctx={N,pattern:null,instances:profs.map((p,i)=>({id:i})),pins:{},minGap:12};let best=null,bt=1e9;for(let r=0;r<4;r++){const s=E.anneal(ctx,M,11+r*977,60000);const t=E.evaluate(s.map(i=>profs[i]),G).total;if(t<bt){bt=t;best=s;}}return {seq:best,t:bt,G,ctx};}
function ev(seq,profs,G){return E.evaluate(seq.map(i=>profs[i]),G).total;}
const variants=[['c低',{c:0.0008}],['c高',{c:0.0025}],['tau短',{tau:0.9}],['tau長',{tau:1.5}],['疲れ開始40m',{d0:40}]];
const out={};
for(let c=0;c<4;c++){
 const people=cls(300+c,34);const ts=people.map(p=>p.t);
 setM({}); const P0=profsFor(ts); const o0=opt(P0,34);
 const fast=[...ts.keys()].sort((a,b)=>ts[a]-ts[b]); const alt=[];for(let i=0;i<17;i++){alt.push(fast[i]);alt.push(fast[33-i]);}
 const rnd=E.rng(9+c); const rands=[];for(let q=0;q<15;q++)rands.push(E.randomSeq(o0.ctx,rnd));
 for(const [name,o] of variants){
  setM(o); const P=profsFor(ts); const G=E.makeGeom(S,34);
  const own=opt(P,34).t, ours=ev(o0.seq,P,G), a=ev(alt,P,G), rm=rands.map(s=>ev(s,P,G)).reduce((x,y)=>x+y)/15;
  (out[name]=out[name]||[]).push([rm-ours, rm-own, rm-a]);
 }
 // measurement noise: true times = measured + N(0,0.2)
 setM({}); const r2=E.rng(55+c); const tt=ts.map(t=>t+gauss(r2)*0.2); const PT=profsFor(tt); const G=E.makeGeom(S,34);
 const rm=rands.map(s=>ev(s,PT,G)).reduce((x,y)=>x+y)/15;
 (out['測定誤差0.2秒']=out['測定誤差0.2秒']||[]).push([rm-ev(o0.seq,PT,G), rm-opt(PT,34).t, rm-ev(alt,PT,G)]);
}
console.log('条件: くじ引きより速くなる秒数 [この案, その条件での本当の最適, 単純な交互]');
for(const k in out){const m=[0,1,2].map(j=>(out[k].reduce((s,r)=>s+r[j],0)/out[k].length).toFixed(2));console.log(k,m.join('  '));}
