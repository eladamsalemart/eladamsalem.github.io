/* Minimal, correct chess engine — board[0]=a8 ... board[63]=h1.
   Pieces: PNBRQK white, pnbrqk black, null empty. Verified via perft. */
(function(global){
  const FILES='abcdefgh';
  function sqName(i){ return FILES[i%8] + (8 - ((i/8)|0)); }
  function nameSq(s){ return (8-parseInt(s[1]))*8 + FILES.indexOf(s[0]); }
  const isW = p => p && p===p.toUpperCase();
  const isB = p => p && p===p.toLowerCase();
  const colorOf = p => !p ? null : (isW(p)?'w':'b');

  function parseFEN(fen){
    const parts = fen.trim().split(/\s+/);
    const board = new Array(64).fill(null);
    let i=0;
    for(const ch of parts[0]){
      if(ch==='/') continue;
      if(/\d/.test(ch)){ i += parseInt(ch); }
      else { board[i++] = ch; }
    }
    return {
      board,
      turn: parts[1]||'w',
      castling: parts[2]||'-',
      ep: (parts[3]&&parts[3]!=='-') ? nameSq(parts[3]) : -1,
      half: parseInt(parts[4]||'0'),
      full: parseInt(parts[5]||'1')
    };
  }
  function toFEN(s){
    let rows=[];
    for(let r=0;r<8;r++){
      let row='',empty=0;
      for(let f=0;f<8;f++){
        const p=s.board[r*8+f];
        if(!p){ empty++; }
        else { if(empty){row+=empty;empty=0;} row+=p; }
      }
      if(empty) row+=empty;
      rows.push(row);
    }
    return rows.join('/')+' '+s.turn+' '+(s.castling||'-')+' '+(s.ep<0?'-':sqName(s.ep))+' '+s.half+' '+s.full;
  }

  const N_OFF=[-17,-15,-10,-6,6,10,15,17];
  const K_OFF=[-9,-8,-7,-1,1,7,8,9];
  const B_DIR=[-9,-7,7,9];
  const R_DIR=[-8,-1,1,8];
  function onBoard(i){ return i>=0 && i<64; }
  // step with file-distance guard to avoid wrap
  function slide(board,from,dir,color,out){
    let cur=from;
    while(true){
      const nf=(cur%8), next=cur+dir;
      if(!onBoard(next)) break;
      const df=Math.abs((next%8)-nf);
      if(df>1) break; // wrapped horizontally
      const t=board[next];
      if(!t){ out.push({from,to:next}); }
      else { if(colorOf(t)!==color) out.push({from,to:next}); break; }
      cur=next;
    }
  }
  function knightK(board,from,offs,color,out){
    const ff=from%8;
    for(const o of offs){
      const to=from+o;
      if(!onBoard(to)) continue;
      const df=Math.abs((to%8)-ff);
      // knight max file dist 2, king max 1
      if(o===-17||o===-15||o===15||o===17){ if(df!==1) continue; }
      else if(o===-10||o===-6||o===6||o===10){ if(df!==2) continue; }
      else { if(df>1) continue; }
      const t=board[to];
      if(!t||colorOf(t)!==color) out.push({from,to});
    }
  }

  function isAttacked(board, sq, by){ // is sq attacked by color `by`
    const ff=sq%8;
    // pawns
    if(by==='w'){ // white pawns attack upward (toward rank 8 => lower index)
      for(const o of [7,9]){ const p=sq+o; if(onBoard(p)&&Math.abs((p%8)-ff)===1 && board[p]==='P') return true; }
    } else {
      for(const o of [-7,-9]){ const p=sq+o; if(onBoard(p)&&Math.abs((p%8)-ff)===1 && board[p]==='p') return true; }
    }
    // knights
    for(const o of N_OFF){ const p=sq+o; if(!onBoard(p))continue; const df=Math.abs((p%8)-ff);
      if(o===-17||o===-15||o===15||o===17){ if(df!==1)continue; } else { if(df!==2)continue; }
      const t=board[p]; if(t&&colorOf(t)===by&&t.toUpperCase()==='N') return true; }
    // king
    for(const o of K_OFF){ const p=sq+o; if(!onBoard(p))continue; if(Math.abs((p%8)-ff)>1)continue;
      const t=board[p]; if(t&&colorOf(t)===by&&t.toUpperCase()==='K') return true; }
    // sliding: bishop/queen diagonals
    for(const dir of B_DIR){ let cur=sq; while(true){ const nf=cur%8, nx=cur+dir; if(!onBoard(nx))break; if(Math.abs((nx%8)-nf)>1)break; const t=board[nx];
      if(t){ if(colorOf(t)===by&&(t.toUpperCase()==='B'||t.toUpperCase()==='Q')) return true; break; } cur=nx; } }
    // sliding: rook/queen lines
    for(const dir of R_DIR){ let cur=sq; while(true){ const nf=cur%8, nx=cur+dir; if(!onBoard(nx))break; if(Math.abs((nx%8)-nf)>1)break; const t=board[nx];
      if(t){ if(colorOf(t)===by&&(t.toUpperCase()==='R'||t.toUpperCase()==='Q')) return true; break; } cur=nx; } }
    return false;
  }

  function kingSquare(board,color){
    const k = color==='w'?'K':'k';
    for(let i=0;i<64;i++) if(board[i]===k) return i;
    return -1;
  }

  function pseudoMoves(s){
    const {board,turn,ep,castling}=s;
    const out=[];
    const me=turn, opp=turn==='w'?'b':'w';
    for(let i=0;i<64;i++){
      const p=board[i]; if(!p||colorOf(p)!==me) continue;
      const type=p.toUpperCase();
      const ff=i%8, rr=(i/8)|0;
      if(type==='P'){
        const dir = me==='w'? -8 : 8;
        const startRank = me==='w'? 6 : 1;
        const promoRank = me==='w'? 0 : 7;
        const one=i+dir;
        if(onBoard(one)&&!board[one]){
          if(((one/8)|0)===promoRank) for(const pr of ['Q','R','B','N']) out.push({from:i,to:one,promo:pr});
          else out.push({from:i,to:one});
          if(rr===startRank){ const two=i+2*dir; if(!board[two]) out.push({from:i,to:two,dbl:true}); }
        }
        for(const dc of [-1,1]){
          const cap=i+dir+dc; if(!onBoard(cap))continue; if(Math.abs((cap%8)-ff)!==1)continue;
          const t=board[cap];
          if(t&&colorOf(t)===opp){
            if(((cap/8)|0)===promoRank) for(const pr of ['Q','R','B','N']) out.push({from:i,to:cap,promo:pr,cap:true});
            else out.push({from:i,to:cap,cap:true});
          } else if(cap===ep){ out.push({from:i,to:cap,epCap:true}); }
        }
      } else if(type==='N'){ knightK(board,i,N_OFF,me,out); }
      else if(type==='K'){
        knightK(board,i,K_OFF,me,out);
        // castling
        if(me==='w'){
          if(castling.includes('K') && !board[61]&&!board[62] && board[63]==='R' && board[60]==='K'
             && !isAttacked(board,60,'b')&&!isAttacked(board,61,'b')&&!isAttacked(board,62,'b')) out.push({from:60,to:62,castle:'K'});
          if(castling.includes('Q') && !board[59]&&!board[58]&&!board[57] && board[56]==='R' && board[60]==='K'
             && !isAttacked(board,60,'b')&&!isAttacked(board,59,'b')&&!isAttacked(board,58,'b')) out.push({from:60,to:58,castle:'Q'});
        } else {
          if(castling.includes('k') && !board[5]&&!board[6] && board[7]==='r' && board[4]==='k'
             && !isAttacked(board,4,'w')&&!isAttacked(board,5,'w')&&!isAttacked(board,6,'w')) out.push({from:4,to:6,castle:'k'});
          if(castling.includes('q') && !board[3]&&!board[2]&&!board[1] && board[0]==='r' && board[4]==='k'
             && !isAttacked(board,4,'w')&&!isAttacked(board,3,'w')&&!isAttacked(board,2,'w')) out.push({from:4,to:2,castle:'q'});
        }
      }
      else if(type==='B'){ for(const d of B_DIR) slide(board,i,d,me,out); }
      else if(type==='R'){ for(const d of R_DIR) slide(board,i,d,me,out); }
      else if(type==='Q'){ for(const d of B_DIR.concat(R_DIR)) slide(board,i,d,me,out); }
    }
    return out;
  }

  function applyMove(s,m){
    const b=s.board.slice();
    const p=b[m.from];
    const me=colorOf(p);
    const captured = b[m.to];
    let castling=s.castling, ep=-1;
    b[m.to]= m.promo ? (me==='w'?m.promo:m.promo.toLowerCase()) : p;
    b[m.from]=null;
    if(m.epCap){ const capSq = me==='w'? m.to+8 : m.to-8; b[capSq]=null; }
    if(m.castle==='K'){ b[61]=b[63]; b[63]=null; }
    if(m.castle==='Q'){ b[59]=b[56]; b[56]=null; }
    if(m.castle==='k'){ b[5]=b[7]; b[7]=null; }
    if(m.castle==='q'){ b[3]=b[0]; b[0]=null; }
    if(m.dbl){ ep = me==='w'? m.from-8 : m.from+8; }
    // update castling rights
    const rm=(ch)=>{ castling=castling.replace(ch,''); };
    const P=p.toUpperCase();
    if(P==='K'){ if(me==='w'){rm('K');rm('Q');} else {rm('k');rm('q');} }
    if(m.from===63||m.to===63) rm('K');
    if(m.from===56||m.to===56) rm('Q');
    if(m.from===7||m.to===7) rm('k');
    if(m.from===0||m.to===0) rm('q');
    if(castling==='') castling='-';
    const half = (P==='P'||captured||m.epCap)?0:s.half+1;
    const full = me==='b'? s.full+1 : s.full;
    return {board:b, turn: me==='w'?'b':'w', castling, ep, half, full};
  }

  function legalMoves(s){
    const out=[];
    const me=s.turn;
    for(const m of pseudoMoves(s)){
      const ns=applyMove(s,m);
      if(!isAttacked(ns.board, kingSquare(ns.board,me), me==='w'?'b':'w')) out.push(m);
    }
    return out;
  }
  function inCheck(s,color){ color=color||s.turn; return isAttacked(s.board,kingSquare(s.board,color), color==='w'?'b':'w'); }

  function moveToSAN(s,m){
    const p=s.board[m.from], type=p.toUpperCase();
    if(m.castle==='K'||m.castle==='k') return 'O-O'+suffix(s,m);
    if(m.castle==='Q'||m.castle==='q') return 'O-O-O'+suffix(s,m);
    const capture = m.epCap || !!s.board[m.to];
    let san='';
    if(type==='P'){
      if(capture) san = FILES[m.from%8] + 'x';
      san += sqName(m.to);
      if(m.promo) san += '='+m.promo;
    } else {
      san = type;
      // disambiguation
      const others = legalMoves(s).filter(x=> x.to===m.to && x.from!==m.from && s.board[x.from] && s.board[x.from].toUpperCase()===type);
      if(others.length){
        const sameFile=others.some(x=> (x.from%8)===(m.from%8));
        const sameRank=others.some(x=> ((x.from/8)|0)===((m.from/8)|0));
        if(!sameFile) san+=FILES[m.from%8];
        else if(!sameRank) san+=(8-((m.from/8)|0));
        else san+=sqName(m.from);
      }
      if(capture) san+='x';
      san+=sqName(m.to);
    }
    return san+suffix(s,m);
  }
  function suffix(s,m){ const ns=applyMove(s,m); if(inCheck(ns, ns.turn)){ return legalMoves(ns).length? '+':'#'; } return ''; }

  function parseSAN(s, san){
    san=san.replace(/[+#!?]/g,'').trim();
    const moves=legalMoves(s);
    if(san==='O-O'||san==='0-0'){ return moves.find(m=>m.castle==='K'||m.castle==='k'); }
    if(san==='O-O-O'||san==='0-0-0'){ return moves.find(m=>m.castle==='Q'||m.castle==='q'); }
    for(const m of moves){ if(moveToSAN(s,m).replace(/[+#]/g,'')===san) return m; }
    // fallback loose match
    for(const m of moves){ if(moveToSAN(s,m).replace(/[+#=]/g,'')===san.replace(/[=]/g,'')) return m; }
    return null;
  }

  function perft(s,d){ if(d===0) return 1; let n=0; for(const m of legalMoves(s)){ n+=perft(applyMove(s,m),d-1); } return n; }

  const START='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const API={parseFEN,toFEN,legalMoves,applyMove,inCheck,moveToSAN,parseSAN,perft,sqName,nameSq,colorOf,kingSquare,isAttacked,START};
  if(typeof module!=='undefined'&&module.exports) module.exports=API;
  global.Chess = API;
})(typeof window!=='undefined'?window:globalThis);
