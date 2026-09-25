const fs=require('fs');
const src=fs.readFileSync(require('path').join(__dirname,'..','リレー走順.html'),'utf8');
const eng=src.split('// ===ENGINE-START===')[1].split('// ===ENGINE-END===')[0];
module.exports=new Function(eng+';return {MODEL,makeProfile,tAt,vAt,dAtTime,solveVm,makeGeom,evaluate,details,pairMatrix,approxEnergy,anneal,randomSeq,rng,swapSteps,gapViolations,markRun,catchPos,earlyTolerance,jitterOf};')();
