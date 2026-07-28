/* Simple negamax alpha-beta AI on top of engine.js */
(function(global){
  const C = (typeof require!=='undefined') ? require('./engine.js') : global.Chess;
  const VAL={P:100,N:320,B:330,R:500,Q:900,K:20000};
  // piece-square tables (from white's view, index 0=a8..63=h1)
  const PST_P=[0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0];
  const PST_N=[-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50];
  const PST_B=[-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20];
  const PST_R=[0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0];
  const PST_Q=[-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20];
  const PST_K=[-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20];
  const PST_KE=[-50,-40,-30,-20,-20,-30,-40,-50, -30,-20,-10,0,0,-10,-20,-30, -30,-10,20,30,30,20,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,20,30,30,20,-10,-30, -30,-30,0,0,0,0,-30,-30, -50,-30,-30,-30,-30,-30,-30,-50];
  const PST={P:PST_P,N:PST_N,B:PST_B,R:PST_R,Q:PST_Q};
  function mirror(i){ const r=(i/8)|0, f=i%8; return (7-r)*8+f; }
  function isEndgame(board){ let q=0,pieces=0; for(const p of board){ if(!p)continue; const t=p.toUpperCase(); if(t==='Q')q++; if(t!=='P'&&t!=='K')pieces++; } return q===0 || pieces<=6; }
  function evaluate(s){
    const b=s.board; let score=0; const eg=isEndgame(b);
    for(let i=0;i<64;i++){ const p=b[i]; if(!p)continue; const t=p.toUpperCase(); const white=p===p.toUpperCase();
      let v=VAL[t]; let ps;
      if(t==='K') ps=(eg?PST_KE:PST_K)[white?i:mirror(i)];
      else ps=PST[t][white?i:mirror(i)];
      score += white ? (v+ps) : -(v+ps);
    }
    return s.turn==='w'? score : -score;
  }
  function orderMoves(s,moves){
    return moves.map(m=>{ let sc=0; const cap=s.board[m.to]; if(cap) sc=VAL[cap.toUpperCase()]*10 - VAL[s.board[m.from].toUpperCase()]; if(m.promo) sc+=800; return {m,sc}; })
      .sort((a,b)=>b.sc-a.sc).map(x=>x.m);
  }
  function negamax(s,depth,alpha,beta){
    const moves=C.legalMoves(s);
    if(moves.length===0){ return C.inCheck(s)? -100000-depth : 0; }
    if(depth===0) return evaluate(s);
    let best=-Infinity;
    for(const m of orderMoves(s,moves)){
      const val=-negamax(C.applyMove(s,m),depth-1,-beta,-alpha);
      if(val>best) best=val;
      if(best>alpha) alpha=best;
      if(alpha>=beta) break;
    }
    return best;
  }
  function bestMove(s,depth){
    const moves=orderMoves(s,C.legalMoves(s));
    if(!moves.length) return null;
    let best=moves[0], bestVal=-Infinity;
    const scored=[];
    for(const m of moves){
      const val=-negamax(C.applyMove(s,m),depth-1,-Infinity,Infinity);
      scored.push({m,val});
      if(val>bestVal){ bestVal=val; best=m; }
    }
    // pick randomly among near-best for variety (beginner feel) at low depth
    const top=scored.filter(x=>x.val>=bestVal-15);
    return top[(Math.random()*top.length)|0].m;
  }
  const API={bestMove,evaluate};
  if(typeof module!=='undefined'&&module.exports) module.exports=API;
  global.ChessAI=API;
})(typeof window!=='undefined'?window:globalThis);
