(function(){
const C=window.Chess, AI=window.ChessAI;
const GLYPH={p:'♟',n:'♞',b:'♝',r:'♜',q:'♛',k:'♚'};
const $=s=>document.querySelector(s);
const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;};
const today=()=>new Date().toISOString().slice(0,10);
const weekId=()=>{const d=new Date();const o=new Date(d.getFullYear(),0,1);return d.getFullYear()+'-'+Math.floor((((d-o)/86400000)+o.getDay()+1)/7);};

/* ---------------- progress ---------------- */
const PKEY='chessTrainer.progress.v2';
function loadProg(){try{return JSON.parse(localStorage.getItem(PKEY))||{};}catch(e){return{};}}
function saveProg(){try{localStorage.setItem(PKEY,JSON.stringify(P));}catch(e){}}
let P=loadProg();
P.openings=P.openings||{};P.olines=P.olines||{};P.structures=P.structures||{};P.advanced=P.advanced||{};P.puzzles=P.puzzles||{};
P.endgames=P.endgames||{};P.games=P.games||{};P.course=P.course||{};
P.xp=P.xp||0;P.streak=P.streak||0;P.lastActive=P.lastActive||'';P.playGames=P.playGames||0;
P.correct=P.correct||0;P.attempts=P.attempts||0;
P.read=P.read||{};P.plan=P.plan||{date:'',checked:{}};P.planW=P.planW||{week:'',checked:{}};
function lessonDone(ref){if(!ref)return false;
  if(ref.mode==='thinking')return !!P.read.thinking;
  if(ref.mode==='puzzles')return !!P.puzzles[ref.theme];
  if(ref.mode==='structures')return !!P.structures[ref.id];
  if(ref.mode==='advanced')return !!P.advanced[ref.id];
  if(ref.mode==='endgames')return !!P.endgames[ref.id];
  if(ref.mode==='openings')return !!P.openings[ref.id];
  if(ref.mode==='games')return !!P.games[ref.id];
  return false;}
P.quiz=P.quiz||{lastDate:'',best:0,last:0,taken:0};
function markActive(){const t=today();if(P.lastActive!==t){const y=new Date(Date.now()-86400000).toISOString().slice(0,10);P.streak=(P.lastActive===y)?P.streak+1:1;P.lastActive=t;}}
function addXP(n){P.xp+=n;markActive();saveProg();renderHeader();}

/* ---------------- state ---------------- */
const S={mode:'home',st:null,orientation:'w',sel:-1,targets:[],last:null,hl:[],history:[],locked:false,
  interact:'none', _coach:null,
  op:null,opView:null,opLine:null,opPly:0,opMistake:false,opColorFilter:'all',opDone:false,opCont:null,opContPly:0,
  ideaTab:'structures', struct:null, structDone:false, adv:null, advDone:false,
  pz:null,pzSolved:false, pzQueue:null,
  eg:null,egDepth:2,
  thinkView:'method', game:null,gamePly:0,gameGuessing:false,
  playSide:'w',playDepth:2,gameOver:false,
  quiz:null };

/* ---------------- board ---------------- */
function cells(){const a=[];for(let i=0;i<64;i++)a.push(i);if(S.orientation==='b')a.reverse();return a;}
function checkSq(){if(!S.st||!C.inCheck(S.st))return -1;return C.kingSquare(S.st.board,S.st.turn);}
function hlFor(idx){const n=C.sqName(idx);const h=S.hl.find(x=>x.sq===n);return h?h.c:null;}
function renderBoard(){
  const b=$('#board');if(!b)return;b.innerHTML='';
  const chk=checkSq();const cs=cells();
  cs.forEach((idx)=>{
    const f=idx%8,r=(idx/8)|0,dark=(f+r)%2===1;
    const sq=el('div','sq '+(dark?'dark':'light'));sq.dataset.i=idx;
    if(idx===S.sel)sq.classList.add('sel');
    if(S.last&&(idx===S.last.from||idx===S.last.to))sq.classList.add('last');
    if(idx===chk)sq.classList.add('check');
    const h=hlFor(idx);if(h)sq.classList.add('hl',h);
    if(S.targets.includes(idx)){if(S.st.board[idx])sq.classList.add('cap');sq.appendChild(el('div','dot'));}
    const vi=cs.indexOf(idx),vr=(vi/8)|0,vc=vi%8;
    if(vr===7){const c=el('div','coord file');c.textContent='abcdefgh'[f];c.style.color=dark?'rgba(246,239,220,.9)':'rgba(60,80,64,.72)';sq.appendChild(c);}
    if(vc===0){const c=el('div','coord rank');c.textContent=(8-r);c.style.color=dark?'rgba(246,239,220,.9)':'rgba(60,80,64,.72)';sq.appendChild(c);}
    const p=S.st.board[idx];
    if(p){const pc=el('div','piece '+(p===p.toUpperCase()?'w':'b'));pc.textContent=GLYPH[p.toLowerCase()];sq.appendChild(pc);}
    b.appendChild(sq);
  });
}

/* ---------------- interaction ---------------- */
function onCellClick(e){
  const cell=e.target.closest('.sq');if(!cell)return;const idx=+cell.dataset.i;
  if(S.interact==='identify'){return handleIdentify(idx);}
  if(S.locked||S.gameOver)return;
  if(!moveInteract()||!humanToMove())return;
  const turn=S.st.turn,p=S.st.board[idx];
  if(S.sel===-1){if(p&&C.colorOf(p)===turn)selectSquare(idx);}
  else{
    if(idx===S.sel){clearSel();return;}
    if(p&&C.colorOf(p)===turn){selectSquare(idx);return;}
    if(S.targets.includes(idx))attemptMove(S.sel,idx);else clearSel();
  }
}
function moveInteract(){return ['openingMove','puzzleMove','freeMove','gameGuess','quizMove','advMove'].includes(S.interact);}
function humanToMove(){
  if(S.interact==='openingMove')return S.opLine&&S.st.turn===S.op.side&&S.opPly<S.opLine.line.length&&!S.opDone;
  if(S.interact==='puzzleMove')return S.pz&&!S.pzSolved;
  if(S.interact==='quizMove')return S.quiz&&!S.quiz.answered;
  if(S.interact==='advMove')return S.adv&&!S.advDone;
  if(S.interact==='freeMove'){const side=S.mode==='play'?S.playSide:S.eg.side;return S.st.turn===side&&!S.gameOver;}
  if(S.interact==='gameGuess')return S.gameGuessing;
  return false;
}
function selectSquare(idx){S.sel=idx;S.targets=C.legalMoves(S.st).filter(m=>m.from===idx).map(m=>m.to);renderBoard();}
function clearSel(){S.sel=-1;S.targets=[];renderBoard();}
function attemptMove(from,to){
  const ms=C.legalMoves(S.st).filter(m=>m.from===from&&m.to===to);
  if(!ms.length){clearSel();return;}
  if(ms.length>1&&ms[0].promo){return showPromo(from,to,ms);}
  finishAttempt(ms[0]);
}
function finishAttempt(move){
  clearSel();
  if(S.interact==='openingMove')return handleOpeningMove(move);
  if(S.interact==='puzzleMove')return handlePuzzleMove(move);
  if(S.interact==='quizMove')return handleQuizMove(move);
  if(S.interact==='advMove')return handleAdvMove(move);
  if(S.interact==='gameGuess')return handleGameGuess(move);
  commit(move);afterFree();
}
function commit(move){
  const san=C.moveToSAN(S.st,move);
  S.history.push({fen:C.toFEN(S.st),san,from:move.from,to:move.to});
  S.st=C.applyMove(S.st,move);S.last={from:move.from,to:move.to};
  renderBoard();renderMoveList();
}
function afterFree(){
  if(endCheck())return;
  if((S.mode==='play'&&S.st.turn!==S.playSide)||(S.mode==='endgames'&&S.st.turn!==S.eg.side))aiMove();
}
function aiMove(){
  S.locked=true;renderPanel();
  setTimeout(()=>{const d=S.mode==='endgames'?S.egDepth:S.playDepth;const m=AI.bestMove(S.st,d);if(m)commit(m);S.locked=false;if(!endCheck())renderPanel();},260);
}
function endCheck(){
  const mv=C.legalMoves(S.st);if(mv.length>0)return false;S.gameOver=true;
  if(C.inCheck(S.st)){const loser=S.st.turn;const won=(S.mode==='play'&&loser!==S.playSide)||(S.mode==='endgames'&&loser!==S.eg.side);onGameEnd(won?'win':'loss');}
  else onGameEnd('draw');
  return true;
}
function onGameEnd(res){
  renderBoard();
  if(S.mode==='play'){P.playGames++;if(res==='win')addXP(20);markActive();saveProg();
    coach(res==='win'?'good':res==='loss'?'bad':'info',res==='win'?'ניצחון! ♛':res==='loss'?'הפסד':'תיקו',res==='win'?'מט! כל הכבוד.':res==='loss'?'מט. המשך להתאמן — נתח מה קרה.':'פט — תיקו.');}
  else if(S.mode==='endgames'){
    if(res==='win'){if(!P.endgames[S.eg.id]){P.endgames[S.eg.id]=1;addXP(25);}else addXP(5);markActive();saveProg();coach('good','הצלחת! ✔','השלמת: '+S.eg.name+'. '+S.eg.tip);}
    else coach('bad',res==='draw'?'תיקו':'לא הושג','נסה שוב — '+S.eg.tip);
  }
  renderPanel();
}
function showPromo(from,to,moves){
  S.locked=true;const side=S.st.turn;
  const modal=el('div','modal'),box=el('div','box');box.appendChild(el('h3',null,'בחר כלי להכתרה'));
  const row=el('div','promo-row');
  ['Q','R','B','N'].forEach(pr=>{const bt=el('button','piece '+side);bt.textContent=GLYPH[pr.toLowerCase()];bt.onclick=()=>{document.body.removeChild(modal);S.locked=false;finishAttempt(moves.find(m=>m.promo===pr));};row.appendChild(bt);});
  box.appendChild(row);modal.appendChild(box);document.body.appendChild(modal);
}
function shake(){const b=$('#board');b.classList.remove('shake');void b.offsetWidth;b.classList.add('shake');}
function coach(kind,tag,txt){S._coach={kind,tag,txt};}
function coachCard(){const c=S._coach;if(!c)return '';return '<div class="coach '+c.kind+'"><div class="tag">'+(c.kind==='good'?'✔ ':c.kind==='bad'?'✕ ':'♟ ')+c.tag+'</div>'+c.txt+'</div>';}

/* ================= OPENINGS ================= */
function openingList(){return OPENINGS.filter(o=>S.opColorFilter==='all'||o.side===S.opColorFilter);}
function viewOpening(o){S.op=null;S.opView=o;S.opLine=null;S.st=C.parseFEN(C.START);S.orientation=o.side;S.history=[];S.last=null;S.hl=[];S.sel=-1;S.targets=[];S.interact='none';renderBoard();renderMoveList();S._coach=null;renderPanel();}
function startOpening(o,ln){
  ln=ln||o.lines[0];
  S.op=o;S.opView=o;S.opLine=ln;S.opPly=0;S.opMistake=false;S.interact='openingMove';S.gameOver=false;
  S.opDone=false;S.opCont=OPENING_CONT[o.id+'/'+ln.id]||null;S.opContPly=0;
  S.st=C.parseFEN(C.START);S.history=[];S.last=null;S.hl=[];S.sel=-1;S.targets=[];S.orientation=o.side;
  renderBoard();renderMoveList();coach('info',ln.name,ln.note);maybeBook();renderPanel();
}
function maybeBook(){
  const L=S.opLine.line;
  if(S.opPly<L.length&&S.st.turn!==S.op.side){
    const m=C.parseSAN(S.st,L[S.opPly]);S.locked=true;renderPanel();
    setTimeout(()=>{commit(m);S.opPly++;S.locked=false;if(S.opPly>=L.length)completeLine();renderPanel();},300);
  }
}
function completeLine(){
  if(S.opDone)return;
  const key=S.op.id+'/'+S.opLine.id;
  if(!P.olines[key]){P.olines[key]=1; if(!P.openings[S.op.id]){P.openings[S.op.id]=1;addXP(30);}else addXP(15);}else addXP(6);
  markActive();saveProg();S.opDone=true;S.opContPly=0;
  coach('good','סיימת את הקו! ✔','עברת את "'+S.opLine.name+'". '+(S.opCont?'לחץ "המשך אופייני ›" כדי לראות לאן זה מוביל.':(S.opMistake?'תרגל שוב לשליטה מלאה.':'מעולה!')));
  renderHeader();
}
function handleOpeningMove(move){
  const L=S.opLine.line,exp=C.parseSAN(S.st,L[S.opPly]);P.attempts++;
  if(exp&&exp.from===move.from&&exp.to===move.to&&(!exp.promo||exp.promo===move.promo)){
    P.correct++;commit(move);S.opPly++;
    if(S.opPly>=L.length){completeLine();}
    else{coach('good','נכון! ✔',S.opLine.ideas[S.opPly]||'מהלך נכון — המשך לפי הרעיון של הקו.');maybeBook();}
    saveProg();renderHeader();
  }else{S.opMistake=true;saveProg();coach('bad','לא המהלך של הקו','זה מהלך חוקי, אבל לא זה שמלמד הקו. נסה שוב, או לחץ "רמז".');shake();}
  renderPanel();
}
function hintOpening(){if(!humanToMove())return;const L=S.opLine.line,m=C.parseSAN(S.st,L[S.opPly]);S.sel=m.from;S.targets=[m.to];renderBoard();coach('info','רמז','המהלך הבא בקו: '+L[S.opPly]+'. לחץ עליו לביצוע.');renderPanel();}
function contNext(){
  if(!S.opCont||S.opContPly>=S.opCont.cont.length)return;
  const m=C.parseSAN(S.st,S.opCont.cont[S.opContPly]);if(!m)return;
  commit(m);S.opContPly++;
  if(S.opContPly>=S.opCont.cont.length)coach('good','לאן זה מוביל ✔','זה ההמשך האופייני. '+S.opCont.leadsTo+' עכשיו נסה את זה במשחק חי!');
  else coach('info','המשך אופייני','ממשיכים בכיוון הטבעי של הפתיחה…');
  renderPanel();
}

/* ================= IDEAS: structures ================= */
function startStructure(st){
  S.struct=st;S.structDone=false;S.interact=st.kind==='identify'?'identify':'none';
  S.st=C.parseFEN(st.fen);S.orientation=st.orient||'w';S.history=[];S.last=null;S.sel=-1;S.targets=[];
  S.hl=[];renderBoard();
  S._coach=null;renderPanel();
}
function handleIdentify(idx){
  if(S.structDone)return;const name=C.sqName(idx);
  if(S.struct.answer.includes(name)){
    S.structDone=true;S.hl=S.struct.hl||[{sq:name,c:'good'}];renderBoard();
    if(!P.structures[S.struct.id]){P.structures[S.struct.id]=1;addXP(12);}markActive();saveProg();
    coach('good','נכון! ✔',S.struct.explain);renderHeader();
  }else{coach('bad','לא הריבוע הנכון','נסה שוב — או לחץ "רמז" כדי לראות.');shake();}
  renderPanel();
}
function answerChoice(i){
  if(S.structDone)return;
  if(i===S.struct.answer){S.structDone=true;S.hl=S.struct.hl||[];renderBoard();if(!P.structures[S.struct.id]){P.structures[S.struct.id]=1;addXP(12);}markActive();saveProg();coach('good','נכון! ✔',S.struct.explain);renderHeader();}
  else{coach('bad','לא מדויק','חשוב שוב על העמדה.');}
  renderPanel();
}
function hintStructure(){if(S.struct.kind==='identify'){S.hl=S.struct.hl||[];S.structDone=true;renderBoard();coach('info','רמז',S.struct.explain);renderPanel();}}

/* ================= IDEAS: advanced strategy ================= */
function startAdvanced(a){
  S.adv=a;S.advDone=false;S.advDemoing=false;S.advDemoPly=0;S.mode='ideas';S.ideaTab='advanced';
  S.interact=a.kind==='move'?'advMove':'none';
  S.st=C.parseFEN(a.fen);S.orientation=a.orient||'w';S.history=[];S.last=null;S.sel=-1;S.targets=[];S.hl=[];
  renderBoard();renderMoveList();
  S._coach=null;renderPanel();
}
function advSolved(a){
  S.advDone=true;S.hl=a.hl||[];renderBoard();
  if(!P.advanced[a.id]){P.advanced[a.id]=1;addXP(18);}else addXP(5);markActive();saveProg();
  coach('good','נכון! ✔',a.explain+' <b>לזכור:</b> '+a.takeaway);renderHeader();renderPanel();
}
function handleAdvMove(move){
  const a=S.adv;P.attempts++;const san=C.moveToSAN(S.st,move).replace(/[+#]/g,'');
  const canon=a.solutions.map(x=>{const s=C.parseFEN(a.fen);const m=C.parseSAN(s,x);return m?C.moveToSAN(s,m).replace(/[+#]/g,''):x;});
  if(canon.includes(san)){P.correct++;commit(move);advSolved(a);}
  else{saveProg();coach('bad','לא המהלך','זה לא הרעיון כאן. חשוב שוב על העיקרון, או לחץ "רמז".');shake();}
  renderHeader();renderPanel();
}
function answerAdvChoice(i){
  if(S.advDone)return;const a=S.adv;
  if(i===a.answer){advSolved(a);}
  else{coach('bad','לא מדויק','חשוב שוב על העיקרון שלמעלה.');renderPanel();}
}
function hintAdvanced(){
  const a=S.adv;if(S.advDone)return;
  if(a.kind==='move'){const m=C.parseSAN(S.st,a.solutions[0]);if(m){S.sel=m.from;S.targets=[m.to];renderBoard();}coach('info','רמז','נסה '+a.solutions[0]+'. '+a.takeaway);}
  else{S.hl=a.hl||[];renderBoard();coach('info','רמז',a.explain);}
  renderPanel();
}
function advDemoStart(){const a=S.adv;if(!a||!a.demo)return;
  S.advDemoing=true;S.advDemoPly=0;S.interact='none';
  S.st=C.parseFEN(a.fen);S.orientation=a.orient||'w';S.history=[];S.last=null;S.hl=[];S.sel=-1;S.targets=[];
  renderBoard();renderMoveList();coach('info','הדגמה — '+a.title,a.demo.intro);renderPanel();}
function advDemoNext(){const a=S.adv;if(!a||!a.demo)return;const line=a.demo.line;
  if(S.advDemoPly>=line.length)return;
  const m=C.parseSAN(S.st,line[S.advDemoPly]);if(!m)return;commit(m);
  const note=a.demo.notes&&a.demo.notes[S.advDemoPly];S.advDemoPly++;
  if(S.advDemoPly>=line.length)coach('good','לאן זה מוביל ✔',(note?note+' ':'')+a.demo.leadsTo);
  else coach('info','הדגמה',note||'ממשיכים לפי העיקרון…');
  renderPanel();}

/* ================= IDEAS: puzzles ================= */
function startPuzzle(p){
  S.pz=p;S.pzSolved=false;S.pzDemoing=false;S.pzDemoPly=0;S.interact='puzzleMove';S.gameOver=false;
  S.st=C.parseFEN(p.fen);S.orientation=S.st.turn;S.history=[];S.last=null;S.hl=[];S.sel=-1;S.targets=[];
  renderBoard();renderMoveList();
  coach('info',p.theme,'תור '+(S.st.turn==='w'?'הלבן':'השחור')+'. מצא את המהלך שממחיש: '+p.theme+'.');renderPanel();
}
function canon(p){const s=C.parseFEN(p.fen);return p.solutions.map(x=>{const m=C.parseSAN(s,x);return m?C.moveToSAN(s,m).replace(/[+#]/g,''):x;});}
function handlePuzzleMove(move){
  P.attempts++;const san=C.moveToSAN(S.st,move).replace(/[+#]/g,'');
  if(canon(S.pz).includes(san)){P.correct++;S.pzSolved=true;commit(move);if(!P.puzzles[S.pz.theme]){P.puzzles[S.pz.theme]=1;addXP(15);}else addXP(4);markActive();saveProg();coach('good','פתרת! ✔',S.pz.idea);}
  else{saveProg();coach('bad','לא המהלך','זה לא הרעיון כאן. נסה שוב, או לחץ "רמז".');shake();}
  renderHeader();renderPanel();
}
function hintPuzzle(){if(S.pzSolved)return;const s=C.parseFEN(S.pz.fen),m=C.parseSAN(s,S.pz.solutions[0]);S.sel=m.from;S.targets=[m.to];renderBoard();coach('info','רמז','הפתרון: '+S.pz.solutions[0]+'. '+S.pz.idea);renderPanel();}
function nextPuzzle(){const i=PUZZLES.indexOf(S.pz);startPuzzle(PUZZLES[(i+1)%PUZZLES.length]);}
function pzDemoStart(){const p=S.pz;if(!p||!p.demo)return;
  S.pzDemoing=true;S.pzDemoPly=0;S.interact='none';
  S.st=C.parseFEN(p.fen);S.orientation=S.st.turn;S.history=[];S.last=null;S.hl=[];S.sel=-1;S.targets=[];
  renderBoard();renderMoveList();coach('info','הדגמה — '+p.theme,p.demo.intro);renderPanel();}
function pzDemoNext(){const p=S.pz;if(!p||!p.demo)return;const line=p.demo.line;
  if(S.pzDemoPly>=line.length)return;
  const m=C.parseSAN(S.st,line[S.pzDemoPly]);if(!m)return;commit(m);
  const note=p.demo.notes&&p.demo.notes[S.pzDemoPly];S.pzDemoPly++;
  if(S.pzDemoPly>=line.length)coach('good','לאן זה מוביל ✔',(note?note+' ':'')+p.demo.leadsTo);
  else coach('info','הדגמה',note||'ממשיכים לפי הרעיון…');
  renderPanel();}

/* ================= ENDGAMES ================= */
function startEndgame(e){
  S.eg=e;S.mode='endgames';S.interact='freeMove';S.gameOver=false;
  S.st=C.parseFEN(e.fen);S.orientation=e.side;S.history=[];S.last=null;S.hl=[];S.sel=-1;S.targets=[];
  renderBoard();renderMoveList();coach('info',e.name,e.goal+' טיפ: '+e.tip);renderPanel();
}

/* ================= THINKING + GAMES ================= */
function startGame(g){
  S.game=g;S.gamePly=0;S.gameGuessing=false;S.interact='gameGuess';S.gameOver=false;S.thinkView=g.id;
  S.st=C.parseFEN(C.START);S.orientation='w';S.history=[];S.last=null;S.hl=[];S.sel=-1;S.targets=[];
  renderBoard();renderMoveList();coach('info',g.title,g.intro);advanceGamePrompt();renderPanel();
}
function advanceGamePrompt(){
  if(S.gamePly>=S.game.line.length){coach('good','סוף המשחק ✔','ניתחת את כל המשחק. '+(!P.games[S.game.id]?'':'')); if(!P.games[S.game.id]){P.games[S.game.id]=1;addXP(20);markActive();saveProg();renderHeader();} S.gameGuessing=false;renderPanel();return;}
  if(S.game.guessPlies.includes(S.gamePly)){S.gameGuessing=true;coach('info','נחש את המהלך','תור הלבן — נסה למצוא את מהלך האלוף. שחק על הלוח.');}
  else S.gameGuessing=false;
}
function gameNext(){
  if(S.gameGuessing)return;
  if(S.gamePly>=S.game.line.length)return;
  const m=C.parseSAN(S.st,S.game.line[S.gamePly]);commit(m);
  const note=S.game.notes&&S.game.notes[S.gamePly+1];
  S.gamePly++;
  if(note)coach('info','הערה',note);else S._coach=null;
  advanceGamePrompt();renderPanel();
}
function handleGameGuess(move){
  const exp=C.parseSAN(S.st,S.game.line[S.gamePly]);
  if(exp&&exp.from===move.from&&exp.to===move.to){
    commit(move);const note=S.game.notes&&S.game.notes[S.gamePly+1];S.gamePly++;S.gameGuessing=false;
    coach('good','מצאת! ✔',note||'בדיוק המהלך של האלוף.');addXP(6);
    advanceGamePrompt();
  }else{coach('bad','לא המהלך שנבחר','נסה שוב, או לחץ "רמז" לראות מה שוחק.');shake();}
  renderPanel();
}
function hintGame(){if(!S.gameGuessing)return;const m=C.parseSAN(S.st,S.game.line[S.gamePly]);S.sel=m.from;S.targets=[m.to];renderBoard();coach('info','רמז','שוחק: '+S.game.line[S.gamePly]+'.');renderPanel();}

/* ================= PLAY ================= */
function startPlay(fen,side){
  const fromPos=(typeof fen==='string');
  S.mode='play';S.interact='freeMove';S.gameOver=false;
  if(fromPos){S.st=C.parseFEN(fen);S.playSide=side||S.st.turn;}
  else{S.st=C.parseFEN(C.START);}
  S.orientation=S.playSide;S.history=[];S.last=null;S.hl=[];S.sel=-1;S.targets=[];
  renderBoard();renderMoveList();
  coach('info',fromPos?'שחק מכאן מול המחשב':'משחק חדש',(fromPos?'בצע את התוכנית בעצמך מול המחשב. ':'')+'אתה משחק ב'+(S.playSide==='w'?'לבן':'שחור')+'.'+(fromPos?'':' בהצלחה!'));
  if(S.st.turn!==S.playSide)aiMove();renderPanel();
}

/* ================= QUIZ ================= */
function startQuiz(){
  S.mode='quiz';const pool=PUZZLES.slice();for(let i=pool.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[pool[i],pool[j]]=[pool[j],pool[i]];}
  S.quiz={list:pool.slice(0,5),i:0,correct:0,answered:false};loadQuizItem();
}
function loadQuizItem(){
  const p=S.quiz.list[S.quiz.i];S.pz=p;S.quiz.answered=false;S.interact='quizMove';S.gameOver=false;
  S.st=C.parseFEN(p.fen);S.orientation=S.st.turn;S.history=[];S.last=null;S.hl=[];S.sel=-1;S.targets=[];
  renderBoard();renderMoveList();coach('info','מבחן — שאלה '+(S.quiz.i+1)+'/5',p.theme+'. תור '+(S.st.turn==='w'?'הלבן':'השחור')+'. מצא את המהלך.');renderPanel();
}
function handleQuizMove(move){
  const san=C.moveToSAN(S.st,move).replace(/[+#]/g,'');S.quiz.answered=true;
  const good=canon(S.pz).includes(san);
  if(good){S.quiz.correct++;commit(move);coach('good','נכון! ✔',S.pz.idea);}
  else{const m=C.parseSAN(S.st,S.pz.solutions[0]);coach('bad','טעות','הפתרון היה '+S.pz.solutions[0]+'. '+S.pz.idea);}
  renderPanel();
}
function quizNext(){
  if(S.quiz.i<4){S.quiz.i++;loadQuizItem();}
  else{const score=S.quiz.correct;P.quiz.last=score;P.quiz.best=Math.max(P.quiz.best||0,score);P.quiz.lastDate=today();P.quiz.taken=(P.quiz.taken||0)+1;addXP(score*5);markActive();saveProg();
    S.mode='home';coach(score>=4?'good':score>=2?'info':'bad','סיימת את המבחן!','ציון: '+score+'/5. '+(score>=4?'מצוין!':score>=2?'ממשיכים להשתפר.':'שווה לחזור על המוטיבים.'));renderAll();}
}

/* ================= rendering: header / movelist ================= */
function renderHeader(){const acc=P.attempts?Math.round(100*P.correct/P.attempts):0;$('#xp').textContent=P.xp;$('#hstat').innerHTML='<b>'+P.xp+' XP</b><small>🔥 '+P.streak+' · דיוק '+acc+'%</small>';}
function renderMoveList(){const box=$('#movelist');if(!box)return;box.innerHTML='';if(!S.history.length){box.appendChild(el('div','empty','אין מהלכים עדיין'));return;}const s=S.history.map(h=>h.san);for(let i=0;i<s.length;i+=2){const row=el('div','mvrow');row.appendChild(el('div','num',(i/2+1)+'.'));row.appendChild(el('div','mv'+(i===s.length-1?' on':''),s[i]||''));row.appendChild(el('div','mv'+(i+1===s.length-1?' on':''),s[i+1]||''));box.appendChild(row);}box.scrollTop=box.scrollHeight;}

/* ================= controls ================= */
function undo(){
  if(S.locked)return;
  if(S.mode==='play'||S.mode==='endgames'){const side=S.mode==='play'?S.playSide:S.eg.side;let pop=false;while(S.history.length){const h=S.history.pop();S.st=C.parseFEN(h.fen);pop=true;if(S.st.turn===side)break;}if(pop){S.gameOver=false;S.last=null;S.sel=-1;S.targets=[];renderBoard();renderMoveList();renderPanel();}}
  else if(S.interact==='openingMove'){const t=Math.max(0,S.history.length-2);if(S.history.length){const h=S.history[t];S.st=C.parseFEN(h.fen);S.history=S.history.slice(0,t);S.opPly=Math.min(t,S.opLine.line.length);S.opDone=t>=S.opLine.line.length;S.opContPly=Math.max(0,t-S.opLine.line.length);S.last=null;renderBoard();renderMoveList();coach('info','חזרה','המשך מכאן.');renderPanel();}}
}
function flip(){S.orientation=S.orientation==='w'?'b':'w';renderBoard();}
function hint(){if(S.interact==='openingMove')hintOpening();else if(S.interact==='puzzleMove')hintPuzzle();else if(S.mode==='ideas'&&S.ideaTab==='advanced'&&S.adv)hintAdvanced();else if(S.mode==='ideas'&&S.struct)hintStructure();else if(S.interact==='gameGuess')hintGame();else if(S.interact==='freeMove'&&S.mode==='endgames'){const m=AI.bestMove(S.st,3);if(m){S.sel=m.from;S.targets=[m.to];renderBoard();coach('info','רמז','נסה '+C.moveToSAN(S.st,m)+'.');renderPanel();}}}
function resetCur(){if(S.interact==='openingMove')startOpening(S.op,S.opLine);else if(S.mode==='ideas'&&S.ideaTab==='advanced'&&S.adv)startAdvanced(S.adv);else if(S.mode==='ideas'&&S.struct)startStructure(S.struct);else if(S.interact==='puzzleMove')startPuzzle(S.pz);else if(S.mode==='endgames')startEndgame(S.eg);else if(S.mode==='play')startPlay();else if(S.thinkView&&S.game&&S.mode==='thinking')startGame(S.game);}

function renderControls(){
  const undoB=$('#c-undo'),hintB=$('#c-hint'),nextB=$('#c-next'),flipB=$('#c-flip'),resetB=$('#c-reset');
  const showBoard=S.mode!=='home';
  $('#boardarea').classList.toggle('hidden',!showBoard);
  $('#main').classList.toggle('noboard',!showBoard);
  if(!showBoard)return;
  const showUndo=(S.mode==='play'||S.mode==='endgames'||S.interact==='openingMove');
  undoB.classList.toggle('hidden',!showUndo);undoB.disabled=S.history.length===0;
  const showHint=(S.interact==='openingMove'||S.interact==='puzzleMove'||S.interact==='gameGuess'||S.interact==='advMove'||(S.mode==='ideas'&&S.ideaTab==='advanced'&&S.adv&&S.adv.kind==='choice'&&!S.advDone)||(S.mode==='ideas'&&S.struct&&S.struct.kind==='identify')||(S.mode==='endgames'));
  hintB.classList.toggle('hidden',!showHint);
  // next button: puzzles, game step, quiz
  let nextTxt='',nextFn=null;
  if(S.mode==='openings'&&S.opDone&&S.opCont&&S.opContPly<S.opCont.cont.length){nextTxt='המשך אופייני ›';nextFn=contNext;}
  else if(S.mode==='ideas'&&S.ideaTab==='puzzles'&&S.pz&&S.pzDemoing){nextTxt=S.pzDemoPly<S.pz.demo.line.length?'המשך ›':'תרגיל הבא ›';nextFn=S.pzDemoPly<S.pz.demo.line.length?pzDemoNext:nextPuzzle;}
  else if(S.interact==='puzzleMove'){nextTxt='תרגיל הבא ›';nextFn=nextPuzzle;}
  else if(S.mode==='thinking'&&S.game){nextTxt=S.gamePly>=S.game.line.length?'':'המשך ›';nextFn=gameNext;}
  else if(S.mode==='ideas'&&S.ideaTab==='advanced'&&S.adv&&S.adv.demo){
    if(S.advDemoing){if(S.advDemoPly<S.adv.demo.line.length){nextTxt='המשך ›';nextFn=advDemoNext;}}
    else if(S.advDone){nextTxt='הדגם את ההמשך ›';nextFn=advDemoStart;}
  }
  else if(S.mode==='quiz'){nextTxt=S.quiz&&S.quiz.answered?(S.quiz.i<4?'שאלה הבאה ›':'סיים מבחן ›'):'';nextFn=quizNext;}
  nextB.classList.toggle('hidden',!nextTxt);nextB.textContent=nextTxt;nextB.onclick=nextFn||(()=>{});
  if(S.mode==='thinking'&&S.game&&S.gameGuessing)nextB.classList.add('hidden');
  resetB.classList.toggle('hidden',S.mode==='thinking'&&!S.game);
}

/* ================= panels ================= */
function wrap(){return el('div','panel');}
function pill(side){return '<span class="pill '+side+'">'+(side==='w'?'אתה הלבן ♔':'אתה השחור ♚')+'</span>';}
function bar(done,total){const pct=total?Math.round(100*done/total):0;return '<div class="pbar"><div style="width:'+pct+'%"></div></div>';}

function renderCtx(){
  const bar=$('#ctxbar');if(!bar)return;
  const hide=(S.mode==='home')||(S.mode==='thinking'&&(!S.game||S.thinkView==='method'));
  bar.classList.toggle('hidden',hide);if(hide){bar.innerHTML='';return;}
  let h='';
  const head=(title,extra)=>'<div class="ctx-head"><div class="ctx-title">'+title+'</div>'+(extra||'')+'</div>';
  if(S.mode==='openings'){
    if(S.op&&S.opLine){const prog=Math.min(S.opPly,S.opLine.line.length);
      h=head(S.op.name+' · '+S.opLine.name,pill(S.op.side)+'<span class="lvl">'+S.opLine.level+'</span><span class="ctx-prog">'+prog+'/'+S.opLine.line.length+'</span>')+coachCard()+
        ((S.opDone&&S.opCont)?'<div class="ctx-study leads"><div><b>לאן זה מוביל:</b> '+S.opCont.leadsTo+'</div></div>':'')+
        '<button class="ctx-link" id="ctxBack">‹ פרטי הפתיחה והמצבים</button>';
    }else if(S.opView){const o=S.opView;
      let btns='<div class="sit-label">בחר מצב / רמה לתרגול:</div><div class="sit-list">';
      o.lines.forEach((ln,i)=>{const done=P.olines[o.id+'/'+ln.id];
        btns+='<button class="sit" data-li="'+i+'"><span class="sit-lvl">'+ln.level+'</span><span class="sit-name">'+ln.name+'</span><span class="sit-chk">'+(done?'✔':'▶')+'</span></button>';});
      btns+='</div>';
      h=head(o.name+' <span class="eco">'+o.eco+'</span>','<span class="ctx-vs">'+o.vs+'</span>')+
        '<div class="ctx-study"><div><b>הרעיון:</b> '+o.summary+'</div><div><b>מבנה:</b> '+o.structure+'</div><div><b>התוכנית שלך:</b> '+o.plan+'</div><div><b>שים לב:</b> '+o.whatToWatch+'</div></div>'+btns;
    }else{h='<div class="ctx-hint">בחר פתיחה מהרשימה כדי ללמוד ולתרגל 👇</div>';}
  }else if(S.mode==='ideas'){
    if(S.ideaTab==='advanced'&&S.adv){const a=S.adv;const deep=ADV_DEEP[a.id];
      const body=deep?'<div class="deep">'+deep.map(s=>'<div class="deep-sec"><b>'+s.h+'</b><span>'+s.t+'</span></div>').join('')+'</div>':'<div class="ctx-study"><div>'+a.concept+'</div></div>';
      h=head(a.title,'<span class="lvl">'+a.level+'</span>')+body+'<div class="ctx-prompt">🎯 '+a.prompt+'</div>'+coachCard();
      if(a.kind==='choice'&&!S.advDone){h+='<div class="ctx-choices">';a.choices.forEach((ch,i)=>h+='<button class="choice" data-ai="'+i+'">'+ch+'</button>');h+='</div>';}
      if(S.advDone){h+='<div class="ctx-actions">'+(a.demo&&!S.advDemoing?'<button class="ctx-link" id="advDemo">▶ הדגם את ההמשך</button>':'')+'<button class="ctx-link" id="advPlay">♟ שחק מכאן מול המחשב</button></div>';}
    }
    else if(S.ideaTab==='structures'&&S.struct){const st=S.struct;const deep=STRUCT_DEEP[st.id];
      h=head(st.title,'<span class="lvl">מבנה</span>')+
        (deep?'<div class="deep">'+deep.map(s=>'<div class="deep-sec"><b>'+s.h+'</b><span>'+s.t+'</span></div>').join('')+'</div>':'')+
        '<div class="ctx-prompt">🎯 '+st.prompt+'</div>'+coachCard();
      if(st.kind==='choice'&&!S.structDone){h+='<div class="ctx-choices">';st.choices.forEach((ch,i)=>h+='<button class="choice" data-ci="'+i+'">'+ch+'</button>');h+='</div>';}
    }else if(S.pz){h=head(S.pz.theme,(S.pz.lvl?'<span class="lvl">'+S.pz.lvl+'</span>':'')+'<span class="pill '+(S.pz.group==='טקטיקה'?'w':'b')+'">'+S.pz.group+'</span>')+coachCard();
      if(S.pzSolved){h+='<div class="ctx-actions">'+(S.pz.demo&&!S.pzDemoing?'<button class="ctx-link" id="pzDemo">▶ הדגם את ההמשך</button>':'')+'<button class="ctx-link" id="pzPlay">♟ שחק מכאן מול המחשב</button></div>';}
    }
  }else if(S.mode==='endgames'&&S.eg){h=head(S.eg.name,'<span class="ctx-prog">'+S.eg.level+'</span>')+coachCard();}
  else if(S.mode==='thinking'&&S.game){const prog=Math.min(S.gamePly,S.game.line.length);h=head(S.game.title,'<span class="ctx-prog">מהלך '+Math.ceil((prog+1)/2)+'</span>')+coachCard();}
  else if(S.mode==='play'){h=head('משחק מול המחשב',pill(S.playSide))+coachCard();}
  else if(S.mode==='quiz'&&S.quiz){h=head('מבחן — שאלה '+(S.quiz.i+1)+' מתוך 5','<span class="ctx-prog">✔ '+S.quiz.correct+'</span>')+coachCard();}
  bar.innerHTML=h;
  bar.querySelectorAll('.sit').forEach(b=>b.onclick=()=>startOpening(S.opView,S.opView.lines[+b.dataset.li]));
  const bk=$('#ctxBack');if(bk)bk.onclick=()=>viewOpening(S.op);
  bar.querySelectorAll('.ctx-choices .choice').forEach(b=>{if(b.dataset.ai!=null)b.onclick=()=>answerAdvChoice(+b.dataset.ai);else b.onclick=()=>answerChoice(+b.dataset.ci);});
  const adB=$('#advDemo');if(adB)adB.onclick=advDemoStart;
  const apB=$('#advPlay');if(apB)apB.onclick=()=>startPlay(S.adv.fen);
  const pdB=$('#pzDemo');if(pdB)pdB.onclick=pzDemoStart;
  const ppB=$('#pzPlay');if(ppB)ppB.onclick=()=>startPlay(S.pz.fen);
}
function renderPanel(){renderCtx();const p=$('#panel');p.innerHTML='';
  if(S.mode==='home')p.appendChild(panelHome());
  else if(S.mode==='openings')p.appendChild(panelOpenings());
  else if(S.mode==='ideas')p.appendChild(panelIdeas());
  else if(S.mode==='endgames')p.appendChild(panelEndgames());
  else if(S.mode==='thinking')p.appendChild(panelThinking());
  else if(S.mode==='play')p.appendChild(panelPlay());
  else if(S.mode==='quiz')p.appendChild(panelQuiz());
  renderControls();
}

/* ---- HOME ---- */
function panelHome(){
  const w=wrap();
  // progress summary
  const totals={openings:OPENINGS.length,structures:STRUCTURES.length,advanced:ADVANCED.length,puzzles:PUZZLES.length,endgames:ENDGAMES.length,course:COURSE.length};
  const done={openings:Object.keys(P.openings).length,structures:Object.keys(P.structures).length,advanced:Object.keys(P.advanced).length,puzzles:Object.keys(P.puzzles).length,endgames:Object.keys(P.endgames).length,course:Object.keys(P.course).length};
  let pathT=0,pathD=0;STAGES.forEach(s=>s.lessons.forEach(L=>{pathT++;if(lessonDone(L.ref))pathD++;}));
  const c1=el('div','card');
  c1.innerHTML='<h2><span class="k">התקדמות</span> הסיכום שלך</h2>'+
    '<div class="statrow"><div class="stat"><b>'+P.xp+'</b><small>XP</small></div><div class="stat"><b>🔥 '+P.streak+'</b><small>רצף ימים</small></div><div class="stat"><b>'+(P.attempts?Math.round(100*P.correct/P.attempts):0)+'%</b><small>דיוק</small></div></div>'+
    '<div class="prow"><span>פתיחות</span>'+bar(done.openings,totals.openings)+'<em>'+done.openings+'/'+totals.openings+'</em></div>'+
    '<div class="prow"><span>מבנים</span>'+bar(done.structures,totals.structures)+'<em>'+done.structures+'/'+totals.structures+'</em></div>'+
    '<div class="prow"><span>אסטרטגיה</span>'+bar(done.advanced,totals.advanced)+'<em>'+done.advanced+'/'+totals.advanced+'</em></div>'+
    '<div class="prow"><span>מוטיבים</span>'+bar(done.puzzles,totals.puzzles)+'<em>'+done.puzzles+'/'+totals.puzzles+'</em></div>'+
    '<div class="prow"><span>סיומים</span>'+bar(done.endgames,totals.endgames)+'<em>'+done.endgames+'/'+totals.endgames+'</em></div>'+
    '<div class="prow"><span>מסלול</span>'+bar(pathD,pathT)+'<em>'+pathD+'/'+pathT+'</em></div>';
  if(S._coach)c1.insertAdjacentHTML('beforeend',coachCard());
  w.appendChild(c1);
  // quiz
  const q=el('div','card');const took=P.quiz.lastDate===today();
  q.innerHTML='<h2><span class="k">מבחן</span> בדיקה עצמית</h2><div class="sub">חמש שאלות אקראיות שבודקות את המוטיבים שלמדת.'+(P.quiz.best?' שיא: '+P.quiz.best+'/5.':'')+'</div>';
  const qb=el('button','ctrl primary');qb.style.width='100%';qb.textContent=took?'עשית היום ('+P.quiz.last+'/5) — למבחן נוסף':'התחל מבחן יומי';qb.onclick=startQuiz;q.appendChild(qb);
  if(!took)q.insertAdjacentHTML('beforeend','<div class="nudge">🔔 עדיין לא נבחנת היום</div>');
  w.appendChild(q);
  // plan
  if(P.plan.date!==today()){P.plan.date=today();P.plan.checked={};saveProg();}
  if(P.planW.week!==weekId()){P.planW.week=weekId();P.planW.checked={};saveProg();}
  const pl=el('div','card');pl.innerHTML='<h2><span class="k">תוכנית</span> משימות</h2>';
  const dl=el('div',null,'<div class="plabel">היום</div>');PLAN.daily.forEach(t=>dl.appendChild(taskRow(t,'plan')));pl.appendChild(dl);
  const wl=el('div',null,'<div class="plabel">השבוע</div>');PLAN.weekly.forEach(t=>wl.appendChild(taskRow(t,'planW')));pl.appendChild(wl);
  w.appendChild(pl);
  // learning path (staged roadmap)
  const rc=el('div','card');
  rc.innerHTML='<h2><span class="k">מסלול</span> מסלול הלימוד המדורג</h2><div class="sub">שישה שלבים שמתפתחים זה על זה, בסדר הנכון ללמידה. לחץ שיעור כדי לעבור לתרגול.</div>';
  let nextL=null,nextStage=null;
  for(const st of STAGES){for(const L of st.lessons){if(!lessonDone(L.ref)){nextL=L;nextStage=st;break;}}if(nextL)break;}
  if(nextL){const cbtn=el('button','ctrl primary');cbtn.style.width='100%';cbtn.style.marginBottom='6px';cbtn.innerHTML='▶ המשך מכאן — '+nextL.t+' · שלב '+nextStage.num;cbtn.onclick=()=>gotoRef(nextL.ref);rc.appendChild(cbtn);}
  else rc.insertAdjacentHTML('beforeend','<div class="nudge">🏆 סיימת את כל המסלול — כל הכבוד!</div>');
  if(S.openStage===undefined)S.openStage=nextStage?nextStage.id:'s1';
  const road=el('div','roadmap');
  STAGES.forEach(st=>{
    const done=st.lessons.filter(L=>lessonDone(L.ref)).length,total=st.lessons.length,complete=done===total,open=S.openStage===st.id;
    const stage=el('div','stage'+(complete?' done':'')+(st===nextStage?' current':''));
    const head=el('button','stage-head');
    head.innerHTML='<div class="stage-num" style="background:'+st.color+'">'+(complete?'✔':st.num)+'</div>'+
      '<div class="stage-info"><b>'+st.title+'</b><small>'+st.goal+'</small></div>'+
      '<div class="stage-side"><span class="stage-prog">'+done+'/'+total+'</span><span class="stage-caret">'+(open?'▾':'‹')+'</span></div>';
    head.onclick=()=>{S.openStage=open?null:st.id;renderPanel();};
    stage.appendChild(head);
    if(open){const ll=el('div','stage-lessons');
      st.lessons.forEach(L=>{const d=lessonDone(L.ref);const b=el('button','plesson'+(d?' done':''));
        b.innerHTML='<span class="pl-chk">'+(d?'✔':'○')+'</span><span class="pl-t">'+L.t+'</span><span class="pl-go">תרגל ›</span>';
        b.onclick=()=>gotoRef(L.ref);ll.appendChild(b);});
      stage.appendChild(ll);}
    road.appendChild(stage);
  });
  rc.appendChild(road);w.appendChild(rc);
  return w;
}
function taskRow(t,key){const on=P[key].checked[t.id];const r=el('button','task'+(on?' on':''));r.innerHTML='<span class="tbox">'+(on?'✓':'')+'</span>'+t.txt;r.onclick=()=>{if(P[key].checked[t.id])delete P[key].checked[t.id];else{P[key].checked[t.id]=1;addXP(3);}markActive();saveProg();renderPanel();};return r;}
function gotoRef(ref){
  if(!ref)return;
  if(ref.mode==='openings'){setTab('openings');const o=OPENINGS.find(x=>x.id===ref.id);if(o){S.opColorFilter='all';viewOpening(o);}return;}
  if(ref.mode==='structures'){setTab('ideas');S.ideaTab='structures';if(ref.id){const st=STRUCTURES.find(x=>x.id===ref.id);if(st)startStructure(st);else renderPanel();}else renderPanel();return;}
  if(ref.mode==='puzzles'){setTab('ideas');S.ideaTab='puzzles';const p=PUZZLES.find(x=>x.theme===ref.theme);if(p)startPuzzle(p);else renderPanel();return;}
  if(ref.mode==='advanced'){setTab('ideas');S.ideaTab='advanced';const a=ADVANCED.find(x=>x.id===ref.id);if(a)startAdvanced(a);else renderPanel();return;}
  if(ref.mode==='endgames'){setTab('endgames');const e=ENDGAMES.find(x=>x.id===ref.id);if(e)startEndgame(e);return;}
  if(ref.mode==='thinking'){setTab('thinking');S.thinkView='method';renderPanel();return;}
  if(ref.mode==='games'){setTab('thinking');const g=GAMES.find(x=>x.id===ref.id);if(g)startGame(g);return;}
  if(ref.mode==='play'){setTab('play');return;}
  if(ref.mode==='home'){setTab('home');return;}
}

/* ---- OPENINGS ---- */
function panelOpenings(){
  const w=wrap();const card=el('div','card');
  card.appendChild(el('h2',null,'<span class="k">פתיחות</span> בחר פתיחה ללימוד'));
  const seg=el('div','seg');[['all','הכל'],['w','עם הלבן ♔'],['b','עם השחור ♚']].forEach(([v,l])=>{const b=el('button',S.opColorFilter===v?'on':'');b.innerHTML=l;b.onclick=()=>{S.opColorFilter=v;renderPanel();};seg.appendChild(b);});
  card.appendChild(seg);
  const list=el('div','select-list');list.style.marginTop='10px';
  openingList().forEach(o=>{const b=el('button','opt'+(S.opView&&S.opView.id===o.id?' active':''));
    const dl=o.lines.filter(ln=>P.olines[o.id+'/'+ln.id]).length;
    b.innerHTML='<div class="badge'+(dl?' done':'')+'">'+(o.side==='w'?'♔':'♚')+'</div><div class="txt"><b>'+o.name+'</b><small>'+o.vs+' · '+o.lines.length+' מצבים'+(dl?' · '+dl+' הושלמו':'')+'</small></div><div class="chev">'+(dl?'✔':'‹')+'</div>';
    b.onclick=()=>viewOpening(o);list.appendChild(b);});
  card.appendChild(list);w.appendChild(card);
  return w;
}

/* ---- IDEAS (structures + puzzles) ---- */
function panelIdeas(){
  const w=wrap();const card=el('div','card');
  card.appendChild(el('h2',null,'<span class="k">רעיונות</span> מבנים · מוטיבים · אסטרטגיה'));
  const seg=el('div','seg');[['structures','מבנים'],['puzzles','מוטיבים'],['advanced','אסטרטגיה']].forEach(([v,l])=>{const b=el('button',S.ideaTab===v?'on':'');b.textContent=l;b.onclick=()=>{S.ideaTab=v;S.struct=null;S.pz=null;S.adv=null;if(v==='structures')startStructure(STRUCTURES[0]);else if(v==='puzzles')startPuzzle(PUZZLES[0]);else startAdvanced(ADVANCED[0]);};seg.appendChild(b);});
  card.appendChild(seg);
  if(S.ideaTab==='structures'){
    const list=el('div','select-list');list.style.marginTop='10px';
    STRUCTURES.forEach(st=>{const b=el('button','opt'+(S.struct&&S.struct.id===st.id?' active':''));const done=P.structures[st.id];
      b.innerHTML='<div class="badge'+(done?' done':'')+'">'+(done?'✔':'♟')+'</div><div class="txt"><b>'+st.title+'</b></div><div class="chev">‹</div>';
      b.onclick=()=>startStructure(st);list.appendChild(b);});
    card.appendChild(list);w.appendChild(card);
  }else if(S.ideaTab==='puzzles'){
    const groups={};PUZZLES.forEach(p=>{(groups[p.group]=groups[p.group]||[]).push(p);});
    Object.keys(groups).forEach(g=>{card.appendChild(el('div','sub','<b style="color:var(--green-2)">'+g+'</b>'));const list=el('div','select-list');
      groups[g].forEach(p=>{const b=el('button','opt'+(S.pz&&S.pz.theme===p.theme?' active':''));const done=P.puzzles[p.theme];
        b.innerHTML='<div class="badge'+(done?' done':'')+'">'+(done?'✔':'?')+'</div><div class="txt"><b>'+p.theme+'</b><small>'+(p.lvl||'')+'</small></div><div class="chev">‹</div>';
        b.onclick=()=>startPuzzle(p);list.appendChild(b);});card.appendChild(list);});
    w.appendChild(card);
  }else{
    card.appendChild(el('div','sub',ADV_INTRO));
    const list=el('div','select-list');
    ADVANCED.forEach(a=>{const b=el('button','opt'+(S.adv&&S.adv.id===a.id?' active':''));const done=P.advanced[a.id];
      b.innerHTML='<div class="badge'+(done?' done':'')+'">'+(done?'✔':'★')+'</div><div class="txt"><b>'+a.title+'</b><small>'+a.level+'</small></div><div class="chev">‹</div>';
      b.onclick=()=>startAdvanced(a);list.appendChild(b);});
    card.appendChild(list);w.appendChild(card);
  }
  return w;
}

/* ---- ENDGAMES ---- */
function panelEndgames(){
  const w=wrap();const card=el('div','card');
  card.appendChild(el('h2',null,'<span class="k">סיומים</span> תרגול מול המחשב'));
  card.appendChild(el('div','sub','שחק עד להשגת המטרה. המחשב מתגונן.'));
  const list=el('div','select-list');
  ENDGAMES.forEach(e=>{const b=el('button','opt'+(S.eg&&S.eg.id===e.id?' active':''));const done=P.endgames[e.id];
    b.innerHTML='<div class="badge'+(done?' done':'')+'">'+(done?'✔':'♜')+'</div><div class="txt"><b>'+e.name+'</b><small>'+e.level+' · '+e.goal+'</small></div><div class="chev">‹</div>';
    b.onclick=()=>startEndgame(e);list.appendChild(b);});
  card.appendChild(list);w.appendChild(card);
  if(S.eg&&ENDGAME_DEEP[S.eg.id]){const tc=el('div','card');tc.innerHTML='<h2><span class="k">טכניקה</span> '+S.eg.name+' — שלב אחר שלב</h2>';
    ENDGAME_DEEP[S.eg.id].forEach((s,i)=>tc.insertAdjacentHTML('beforeend','<div class="qitem"><div class="qn">'+(i+1)+'</div><div><span class="stepd">'+s+'</span></div></div>'));w.appendChild(tc);}
  const tips=el('div','card');tips.innerHTML='<h2>טכניקות להכיר</h2>';ENDGAME_TIPS.forEach(t=>tips.insertAdjacentHTML('beforeend','<div class="tip"><b>'+t.name+':</b> '+t.txt+'</div>'));w.appendChild(tips);
  return w;
}

/* ---- THINKING + GAMES ---- */
function panelThinking(){
  const w=wrap();const card=el('div','card');
  card.appendChild(el('h2',null,'<span class="k">חשיבה</span> שיטה וניתוח משחקים'));
  const seg=el('div','seg');[['method','שיטת החשיבה'],['games','ניתוח משחקים']].forEach(([v,l])=>{const on=(v==='method'&&S.thinkView==='method')||(v==='games'&&S.thinkView!=='method');const b=el('button',on?'on':'');b.textContent=l;b.onclick=()=>{S.game=null;S.interact='none';S.hl=[];S.st=C.parseFEN(C.START);S.thinkView=(v==='method'?'method':'games');renderBoard();renderMoveList();renderPanel();};seg.appendChild(b);});
  card.appendChild(seg);w.appendChild(card);
  if(S.thinkView==='method'){
    if(!P.read.thinking){P.read.thinking=1;markActive();saveProg();renderHeader();}
    const c=el('div','card');c.innerHTML='<h2>'+THINKING.title+'</h2><div class="sub">'+THINKING.intro+'</div>';
    THINKING.process.forEach(p=>c.insertAdjacentHTML('beforeend','<div class="qitem"><div class="qn">'+p.t.split('.')[0]+'</div><div><b>'+p.t.replace(/^\d+\.\s*/,'')+'</b><small>'+p.d+'</small></div></div>'));
    w.appendChild(c);
    const c2=el('div','card');c2.innerHTML='<h2>ארבע השאלות לפני כל מסע</h2>';
    THINKING.questions.forEach((q,i)=>c2.insertAdjacentHTML('beforeend','<div class="qitem"><div class="qn gold">'+(i+1)+'</div><div><b>'+q.q+'</b><small>'+q.d+'</small></div></div>'));
    c2.insertAdjacentHTML('beforeend','<div class="coach info"><div class="tag">♟ בדיקת בלאנדר</div>'+THINKING.blunderCheck+'</div>');
    w.appendChild(c2);
  }else{
    const gc=el('div','card');gc.innerHTML='<h2>משחקי אמן לניתוח</h2><div class="sub">בחר משחק, צעד בו עם "המשך", ובמהלכים המסומנים נסה לנחש. כל משחק קשור לשלב בשיטת החשיבה.</div>';
    const list=el('div','select-list');
    GAMES.forEach(g=>{const b=el('button','opt'+(S.game&&S.game.id===g.id?' active':''));const done=P.games[g.id];
      b.innerHTML='<div class="badge'+(done?' done':'')+'">'+(done?'✔':'♞')+'</div><div class="txt"><b>'+g.title+'</b><small>'+g.level+' · '+g.theme+'</small></div><div class="chev">‹</div>';
      b.onclick=()=>startGame(g);list.appendChild(b);});
    gc.appendChild(list);w.appendChild(gc);
    if(S.game){const c=el('div','card');c.innerHTML='<h2>איך זה עובד</h2><div class="sub">לחץ <b>"המשך ›"</b> כדי לצעוד ולקרוא הערות. במהלכים מסומנים — נחש על הלוח, והמשוב יופיע מעל הלוח.</div>';w.appendChild(c);}
  }
  return w;
}

/* ---- PLAY ---- */
function panelPlay(){
  const w=wrap();const card=el('div','card');
  card.appendChild(el('h2',null,'<span class="k">משחק חי</span> שחק מול המחשב'));
  card.appendChild(el('div','sub','משחק מלא לתרגול "חי". בחר צבע ורמת קושי.'));
  const cw=el('div',null,'<div class="sub" style="margin-bottom:6px">צבע</div>');const s1=el('div','seg');
  [['w','לבן ♔'],['b','שחור ♚']].forEach(([v,l])=>{const b=el('button',S.playSide===v?'on':'');b.innerHTML=l;b.onclick=()=>{S.playSide=v;startPlay();};s1.appendChild(b);});cw.appendChild(s1);card.appendChild(cw);
  const lw=el('div',null,'<div class="sub" style="margin:12px 0 6px">רמת קושי</div>');const s2=el('div','seg');
  [[1,'קל'],[2,'בינוני'],[3,'מאתגר']].forEach(([v,l])=>{const b=el('button',S.playDepth===v?'on':'');b.textContent=l;b.onclick=()=>{S.playDepth=v;s2.querySelectorAll('button').forEach(x=>x.classList.remove('on'));b.classList.add('on');};s2.appendChild(b);});lw.appendChild(s2);card.appendChild(lw);
  const nb=el('button','ctrl primary','משחק חדש');nb.style.marginTop='14px';nb.style.width='100%';nb.onclick=startPlay;card.appendChild(nb);
  w.appendChild(card);
  return w;
}

/* ---- QUIZ ---- */
function panelQuiz(){
  const w=wrap();const c=el('div','card');
  c.innerHTML='<h2><span class="k">מבחן יומי</span> חמש שאלות</h2><div class="sub">המידע והמשוב מופיעים מעל הלוח. ענה על הלוח, ואז "הבא ›".</div>';
  w.appendChild(c);return w;
}

/* ================= tabs / init ================= */
const TABS=[['home','🏠','בית'],['openings','♙','פתיחות'],['ideas','♟','רעיונות'],['endgames','♜','סיומים'],['thinking','🧠','חשיבה'],['play','♛','משחק']];
function setTab(m){
  S.mode=m;S._coach=null;S.sel=-1;S.targets=[];S.gameOver=false;S.hl=[];S.interact='none';
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.m===m));
  if(m==='home'){S.st=C.parseFEN(C.START);renderBoard&&renderBoard();renderPanel();}
  else if(m==='openings'){if(S.opView)viewOpening(S.opView);else{S.st=C.parseFEN(C.START);S.orientation='w';renderBoard();renderMoveList();renderPanel();}}
  else if(m==='ideas'){if(S.ideaTab==='advanced'){if(S.adv)startAdvanced(S.adv);else startAdvanced(ADVANCED[0]);}else if(S.ideaTab==='puzzles'){if(S.pz)startPuzzle(S.pz);else startPuzzle(PUZZLES[0]);}else{if(S.struct)startStructure(S.struct);else startStructure(STRUCTURES[0]);}}
  else if(m==='endgames'){if(S.eg)startEndgame(S.eg);else startEndgame(ENDGAMES[0]);}
  else if(m==='thinking'){S.st=C.parseFEN(C.START);S.hl=[];S.interact='none';if(S.game)startGame(S.game);else{if(S.thinkView!=='games')S.thinkView='method';renderBoard();renderMoveList();renderPanel();}}
  else if(m==='play')startPlay();
}
function renderAll(){renderHeader();renderBoard();renderMoveList();renderPanel();}
function init(){
  const bar=$('#tabs');TABS.forEach(([m,ic,l])=>{const b=el('button','tab'+(m==='home'?' active':''));b.dataset.m=m;b.innerHTML='<span class="ti">'+ic+'</span>'+l;b.onclick=()=>setTab(m);bar.appendChild(b);});
  $('#board').addEventListener('click',onCellClick);
  $('#c-undo').onclick=undo;$('#c-hint').onclick=hint;$('#c-flip').onclick=flip;$('#c-reset').onclick=resetCur;
  $('#themeBtn').onclick=toggleTheme;initTheme();
  S.st=C.parseFEN(C.START);renderHeader();setTab('home');
}
function initTheme(){const t=localStorage.getItem('chessTrainer.theme');if(t)document.documentElement.setAttribute('data-theme',t);updateThemeBtn();}
function toggleTheme(){const cur=document.documentElement.getAttribute('data-theme');const dark=cur?cur==='dark':window.matchMedia('(prefers-color-scheme:dark)').matches;const nx=dark?'light':'dark';document.documentElement.setAttribute('data-theme',nx);try{localStorage.setItem('chessTrainer.theme',nx);}catch(e){}updateThemeBtn();}
function updateThemeBtn(){const cur=document.documentElement.getAttribute('data-theme');const dark=cur?cur==='dark':window.matchMedia('(prefers-color-scheme:dark)').matches;$('#themeBtn').textContent=dark?'☀':'☾';}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
