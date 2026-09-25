const E=require('./engine.js');
function gauss(r){return Math.sqrt(-2*Math.log(r()))*Math.cos(2*Math.PI*r());}
function cls(seed,n){const r=E.rng(seed);const a=[];for(let i=0;i<n;i++){const m=i%2==0;a.push(Math.min(11,Math.max(6.4,(m?7.8:8.9)+gauss(r)*(m?0.55:0.65))));}return a;}
// 一律に遅らせる方式の目印（比較用）
function uniformDet(seq,G,S,res,sd){const det=E.details(seq,G,res,{...S,jitter:0});let sA=E.MODEL.react,startA=0;
 for(let k=1;k<seq.length;k++){const A=seq[k-1],B=seq[k],zone=G.L*k-G.zb,startB=zone+res.u[k];
  const sB=sA+E.tAt(A,zone+res.eta[k]-G.g-startA)-E.tAt(B,res.eta[k]-res.u[k]);
  det[k].recv.mark=startB-(startA+E.dAtTime(A,sB+sd-S.reactRecv-sA));sA=sB;startA=startB;}return det;}
const t0=Date.now();
for(const J of [0.1,0.2,0.3]){
 const agg={uni:[0,0],pair:[0,0]};let n=0;
 for(let c=0;c<3;c++){
  const S={legLen:100,lastLen:'',zoneLen:20,zoneBefore:10,runup:0,margin:2,gain:1,footCm:25,reactRecv:0.15,jitter:J};
  const ts=cls(500+c,34),P=ts.map(t=>E.makeProfile(E.solveVm(t,50),220)),G=E.makeGeom(S,34);
  const fast=[...ts.keys()].sort((a,b)=>ts[a]-ts[b]);const alt=[];for(let i=0;i<17;i++){alt.push(fast[i]);alt.push(fast[33-i]);}
  const pp=alt.map(i=>P[i]),res=E.evaluate(pp,G);
  const dU=uniformDet(pp,G,S,res,J),dP=E.details(pp,G,res,S);
  for(const [k,d] of [['uni',dU],['pair',dP]]){const r=E.rng(5);for(let q=0;q<15;q++){const o=E.markRun(pp,G,S,res,d,J,r);agg[k][0]+=o.total;agg[k][1]+=o.fails;}}
  n+=15;}
 console.log(`ばらつき±${J}: 一律に遅らせる ${(agg.uni[0]/n).toFixed(1)}秒（ゾーン外${(agg.uni[1]/n).toFixed(2)}回） / 組ごと ${(agg.pair[0]/n).toFixed(1)}秒（ゾーン外${(agg.pair[1]/n).toFixed(2)}回）`);
}
console.log('計算時間',Date.now()-t0,'ms');
