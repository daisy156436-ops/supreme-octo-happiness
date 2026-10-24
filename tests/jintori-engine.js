// 陣取りクイズ.html から、陣地の計算部分だけを取り出して読み込む
const fs = require('fs');
const src = fs.readFileSync(require('path').join(__dirname, '..', '陣取りクイズ.html'), 'utf8');
const eng = src.split('// ===ENGINE-START===')[1].split('// ===ENGINE-END===')[0];
module.exports = new Function(eng + ';return {SIZE_PER,LOSS_CAP,PROTECT,STREAK_EVERY,rng,hexDist,makeBoard,initOwners,counts,ranksOf,resolveRound,placeTreasures,planGains,minorityLimit};')();
