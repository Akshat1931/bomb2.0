/**
 * Circuit Module - KTaNE Solver
 * 6-node grid (A-F), 11 possible wire segments, all optional.
 * Click a wire → quick-entry bar appears below canvas → type Ω → Enter.
 * Click a node → set IN(+) / OUT(−).
 * MNA solver.
 */
(function () {

  /* ── Geometry ─────────────────────────────────────────── */
  const CW = 600, CH = 310;
  const NODES = {
    A: { x:110, y:85  }, B: { x:300, y:85  }, C: { x:490, y:85  },
    D: { x:110, y:225 }, E: { x:300, y:225 }, F: { x:490, y:225 }
  };
  const ALL_SEGS = [
    { id:"A-B",a:"A",b:"B" }, { id:"B-C",a:"B",b:"C" },
    { id:"D-E",a:"D",b:"E" }, { id:"E-F",a:"E",b:"F" },
    { id:"A-D",a:"A",b:"D" }, { id:"B-E",a:"B",b:"E" }, { id:"C-F",a:"C",b:"F" },
    { id:"A-E",a:"A",b:"E" }, { id:"D-B",a:"D",b:"B" },
    { id:"B-F",a:"B",b:"F" }, { id:"E-C",a:"E",b:"C" }
  ];
  const NIDX = { A:0,B:1,C:2,D:3,E:4,F:5 };
  const PAL  = ["#43a047","#1e88e5","#fdd835","#fb8c00","#e53935","#8e24aa","#00acc1","#6d4c41"];

  /* ── State ───────────────────────────────────────────── */
  const S = {
    active:  {},        // segId → { r, colorIdx }
    termIN:  null,
    termOUT: null,
    selSeg:  null,      // currently selected segment id
    palIdx:  0
  };

  /* ── MNA Solver ──────────────────────────────────────── */
  function solve() {
    if (!S.termIN || !S.termOUT || S.termIN === S.termOUT) return null;
    const N=6, G=Array.from({length:N},()=>new Array(N).fill(0));
    function stamp(a,b,g){ G[a][a]+=g;G[b][b]+=g;G[a][b]-=g;G[b][a]-=g; }
    Object.entries(S.active).forEach(([id,seg])=>{
      const [na,nb]=id.split('-');
      stamp(NIDX[na],NIDX[nb],seg.r>0?1/seg.r:1e9);
    });
    const ni=NIDX[S.termIN], no=NIDX[S.termOUT];
    const free=[0,1,2,3,4,5].filter(i=>i!==ni&&i!==no);
    const sz=free.length;
    const A=Array.from({length:sz},(_,i)=>Array.from({length:sz},(_,j)=>G[free[i]][free[j]]));
    const b=free.map(i=>-G[i][no]);
    for(let c=0;c<sz;c++){
      let mx=c; for(let r=c+1;r<sz;r++) if(Math.abs(A[r][c])>Math.abs(A[mx][c])) mx=r;
      [A[c],A[mx]]=[A[mx],A[c]]; [b[c],b[mx]]=[b[mx],b[c]];
      if(Math.abs(A[c][c])<1e-15) continue;
      for(let r=c+1;r<sz;r++){
        const f=A[r][c]/A[c][c];
        for(let j=c;j<sz;j++) A[r][j]-=f*A[c][j];
        b[r]-=f*b[c];
      }
    }
    const V=new Array(sz).fill(0);
    for(let i=sz-1;i>=0;i--){
      V[i]=b[i]; for(let j=i+1;j<sz;j++) V[i]-=A[i][j]*V[j];
      if(Math.abs(A[i][i])>1e-15) V[i]/=A[i][i];
    }
    const Vf=new Array(N).fill(0); Vf[no]=1;
    free.forEach((n,i)=>{ Vf[n]=V[i]; });
    let I=0; for(let j=0;j<N;j++) I+=G[no][j]*(Vf[no]-Vf[j]);
    const Req=Math.abs(1/(I||1e-9));
    return Req;
  }

  /* ── Draw ────────────────────────────────────────────── */
  function rrect(ctx,x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
  }
  function lu(hex){ const r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255; return 0.299*r+0.587*g+0.114*b; }

  function draw(){
    const canvas=document.getElementById('cktCanvas'); if(!canvas) return;
    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,CW,CH);
    ctx.fillStyle="#08080f"; ctx.fillRect(0,0,CW,CH);
    ctx.fillStyle="rgba(255,255,255,0.035)";
    for(let x=20;x<CW;x+=20) for(let y=20;y<CH;y+=20){ctx.beginPath();ctx.arc(x,y,1,0,2*Math.PI);ctx.fill();}

    // ── Inactive ghost segments ──
    ctx.setLineDash([5,5]); ctx.strokeStyle="rgba(255,255,255,0.09)"; ctx.lineWidth=1.5;
    ALL_SEGS.forEach(seg=>{
      if(S.active[seg.id]) return;
      const p1=NODES[seg.a],p2=NODES[seg.b];
      ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.stroke();
    });
    ctx.setLineDash([]);

    // ── Active segments ──
    Object.entries(S.active).forEach(([id,seg])=>{
      const [na,nb]=id.split('-');
      const p1=NODES[na], p2=NODES[nb];
      const col=PAL[seg.colorIdx%PAL.length];
      const isSel=S.selSeg===id;

      // Selection halo
      if(isSel){
        ctx.strokeStyle="rgba(255,255,255,0.35)"; ctx.lineWidth=10; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.stroke();
      }

      if(seg.r===0){
        // Plain wire
        ctx.strokeStyle=isSel?"#fff":"#90a4ae"; ctx.lineWidth=3; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.stroke();
        // "wire" label near midpoint
        const mx=(p1.x+p2.x)/2, my=(p1.y+p2.y)/2;
        ctx.fillStyle="rgba(144,164,174,0.7)"; ctx.font="10px monospace";
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText("wire", mx, my);
      } else {
        // Resistor
        const mx=(p1.x+p2.x)/2, my=(p1.y+p2.y)/2;
        const dx=p2.x-p1.x, dy=p2.y-p1.y, len=Math.sqrt(dx*dx+dy*dy);
        const ux=dx/len, uy=dy/len;
        const ang=Math.abs(Math.atan2(dy,dx));
        const isV=ang>Math.PI/4&&ang<3*Math.PI/4;
        const HW=isV?15:36, HH=isV?30:15;

        ctx.strokeStyle="#90a4ae"; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(mx-ux*(HW+3),my-uy*(HH+3)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx+ux*(HW+3),my+uy*(HH+3)); ctx.lineTo(p2.x,p2.y); ctx.stroke();

        ctx.save(); ctx.translate(mx,my); ctx.rotate(Math.atan2(dy,dx));
        ctx.shadowColor=col; ctx.shadowBlur=isSel?22:12;
        ctx.fillStyle=col; rrect(ctx,-HW,-HH,HW*2,HH*2,7); ctx.fill();
        ctx.shadowBlur=0;
        if(isSel){ ctx.strokeStyle="#fff"; ctx.lineWidth=2.5; rrect(ctx,-HW,-HH,HW*2,HH*2,7); ctx.stroke(); }
        ctx.fillStyle=lu(col)>0.36?"#111":"#fff";
        ctx.font="bold 11px 'Outfit',sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText(seg.r+"Ω",0,0);
        ctx.restore();
      }
    });

    // ── Nodes ──
    Object.entries(NODES).forEach(([name,pt])=>{
      const isIN=S.termIN===name, isOUT=S.termOUT===name;
      if(isIN||isOUT){
        ctx.beginPath(); ctx.arc(pt.x,pt.y,16,0,2*Math.PI);
        ctx.fillStyle="#ff8f00"; ctx.shadowColor="#ff8f00"; ctx.shadowBlur=20; ctx.fill(); ctx.shadowBlur=0;
        ctx.fillStyle="#fff"; ctx.font="bold 14px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText(isIN?"+":"−",pt.x,pt.y);
      } else {
        ctx.beginPath(); ctx.arc(pt.x,pt.y,8,0,2*Math.PI);
        ctx.fillStyle="#263238"; ctx.fill();
        ctx.strokeStyle="#546e7a"; ctx.lineWidth=2; ctx.stroke();
      }
      const above=pt.y<160;
      ctx.fillStyle=(isIN||isOUT)?"#ffb74d":"#78909c";
      ctx.font="bold 13px 'Outfit',sans-serif"; ctx.textAlign="center";
      ctx.textBaseline=above?"bottom":"top";
      ctx.fillText(name,pt.x,pt.y+(above?-20:20));
    });

    // Hint
    ctx.fillStyle="rgba(255,255,255,0.10)"; ctx.font="11px sans-serif";
    ctx.textAlign="center"; ctx.textBaseline="bottom";
    ctx.fillText("click wire = select & edit   ·   click node = set IN(+) / OUT(−)",CW/2,CH-6);
  }

  /* ── Quick-edit bar ──────────────────────────────────── */
  function showQuickEdit(id){
    S.selSeg=id;
    const bar=document.getElementById('cktQuickBar'); if(!bar) return;
    const seg=S.active[id];
    const col=PAL[seg.colorIdx%PAL.length];
    bar.style.display='flex';
    bar.innerHTML=`
      <span style="display:inline-flex;align-items:center;gap:7px;font-family:'Outfit',sans-serif;font-size:14px;font-weight:700;color:#ffd875;">
        <span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:${col};"></span>
        ${id}
      </span>
      <span style="color:#546e7a;font-size:12px;margin:0 6px;">resistance:</span>
      <input id="cktQI" type="number" min="0" step="1" value="${seg.r}"
        placeholder="0 = wire"
        style="width:80px;background:#060610;border:2px solid ${col};color:#00e676;
               font:700 18px monospace;text-align:center;border-radius:8px;padding:5px;outline:none;">
      <span style="color:#90a4ae;font-size:15px;font-weight:700;">Ω</span>
      <button id="cktQDoneBtn" style="padding:6px 16px;background:${col};border:none;color:${lu(col)>0.36?'#111':'#fff'};
              font:700 12px 'Outfit',sans-serif;border-radius:8px;cursor:pointer;">✓ Done</button>
      <button id="cktQRemBtn" style="padding:6px 12px;background:transparent;border:1px solid #c62828;color:#ef9a9a;
              font-size:12px;border-radius:8px;cursor:pointer;">✕ Remove</button>
    `;

    const inp=document.getElementById('cktQI');
    inp.focus(); inp.select();

    // Live update as they type
    inp.addEventListener('input',()=>{
      const v=parseFloat(inp.value); if(S.active[id]) S.active[id].r=isNaN(v)?0:Math.max(0,v);
      draw(); updateAnswer();
    });
    inp.addEventListener('keydown',e=>{
      if(e.key==='Enter'){ e.preventDefault(); commitQuickEdit(); }
      if(e.key==='Escape'){ hideQuickEdit(); }
    });

    document.getElementById('cktQDoneBtn').onclick=commitQuickEdit;
    document.getElementById('cktQRemBtn').onclick=()=>{
      delete S.active[id];
      hideQuickEdit();
      refreshChips();
      draw(); updateAnswer();
    };

    draw();
  }

  function commitQuickEdit(){
    const inp=document.getElementById('cktQI');
    if(inp&&S.selSeg&&S.active[S.selSeg]){
      const v=parseFloat(inp.value);
      S.active[S.selSeg].r=isNaN(v)?0:Math.max(0,v);
    }
    hideQuickEdit();
    refreshChips();
    draw(); updateAnswer();
  }

  function hideQuickEdit(){
    S.selSeg=null;
    const bar=document.getElementById('cktQuickBar');
    if(bar) bar.style.display='none';
    draw();
  }

  /* ── Chips (compact active wire summary) ─────────────── */
  function refreshChips(){
    const el=document.getElementById('cktChips'); if(!el) return;
    const entries=Object.entries(S.active);
    if(!entries.length){ el.innerHTML='<span style="color:#37474f;font-size:12px;font-style:italic;">No wires active yet</span>'; return; }
    el.innerHTML=entries.map(([id,seg])=>{
      const col=PAL[seg.colorIdx%PAL.length];
      return `<span class="ckt-chip" onclick="window._cktEditChip('${id}')"
        style="border-color:${col};background:${col}18;color:${col};">
        <span style="width:7px;height:7px;border-radius:50%;background:${col};display:inline-block;margin-right:4px;"></span>
        ${id}: ${seg.r===0?'wire':seg.r+'Ω'}
        <span style="opacity:0.5;margin-left:4px;">✎</span>
      </span>`;
    }).join('');
  }

  window._cktEditChip=function(id){
    if(S.active[id]) showQuickEdit(id);
  };

  /* ── Click handler ───────────────────────────────────── */
  function nearLine(px,py,p1,p2,t){
    const dx=p2.x-p1.x,dy=p2.y-p1.y,l2=dx*dx+dy*dy; if(!l2) return false;
    const u=Math.max(0,Math.min(1,((px-p1.x)*dx+(py-p1.y)*dy)/l2));
    return (px-p1.x-u*dx)**2+(py-p1.y-u*dy)**2<t*t;
  }
  function nearNode(px,py,pt,r){ return (px-pt.x)**2+(py-pt.y)**2<r*r; }

  function handleClick(e){
    const cv=document.getElementById('cktCanvas');
    const rc=cv.getBoundingClientRect();
    const px=(e.clientX-rc.left)*(CW/rc.width);
    const py=(e.clientY-rc.top)*(CH/rc.height);

    // Node?
    for(const [name,pt] of Object.entries(NODES)){
      if(nearNode(px,py,pt,24)){
        if(S.termIN===name)       S.termIN=null;
        else if(S.termOUT===name){ S.termIN=name; S.termOUT=null; }
        else if(!S.termIN)         S.termIN=name;
        else if(!S.termOUT)        S.termOUT=name;
        else                       S.termIN=name;
        hideQuickEdit();
        syncTermButtons(); draw(); updateAnswer(); return;
      }
    }

    // Wire?
    for(const seg of ALL_SEGS){
      const p1=NODES[seg.a], p2=NODES[seg.b];
      if(nearLine(px,py,p1,p2,14)){
        if(!S.active[seg.id]){
          // Activate it
          S.active[seg.id]={ r:0, colorIdx:S.palIdx++ };
        }
        // Always open quick edit when clicking a wire
        showQuickEdit(seg.id);
        refreshChips();
        updateAnswer(); return;
      }
    }

    // Clicked empty area → deselect
    hideQuickEdit();
  }

  /* ── Answer ──────────────────────────────────────────── */
  function updateAnswer(){
    const el=document.getElementById('cktAnswer'); if(!el) return;
    if(!S.termIN||!S.termOUT){
      el.innerHTML=`<span style="color:#37474f;">Click two nodes to set IN(+) and OUT(−)</span>`; return;
    }
    if(!Object.keys(S.active).length){
      el.innerHTML=`<span style="color:#37474f;">Click dashed wires on canvas to activate them</span>`; return;
    }
    const Req=solve();
    if(Req===null||!isFinite(Req)||Req>1e7){
      el.innerHTML=`<span style="color:#ef9a9a;font-size:13px;">No valid path — check connections</span>`; return;
    }
    el.innerHTML=`
      <div style="font-size:10px;color:#546e7a;letter-spacing:1px;text-transform:uppercase;margin-bottom:2px;">Equivalent Resistance</div>
      <div style="font-size:58px;font-weight:900;font-family:'Outfit',sans-serif;color:#00e676;line-height:1.1;">${Math.round(Req)}&thinsp;Ω</div>
      <div style="font-size:11px;color:#263238;margin-top:3px;">Exact: ${Req.toFixed(4)} Ω</div>
    `;
  }

  function syncTermButtons(){
    ["A","B","C","D","E","F"].forEach(n=>{
      const b=document.getElementById(`cktN-${n}`); if(!b) return;
      b.className="ckt-nbtn"+(S.termIN===n?" in":S.termOUT===n?" out":"");
      b.textContent=n+(S.termIN===n?" (+)":S.termOUT===n?" (−)":"");
    });
  }

  /* ── Global API ──────────────────────────────────────── */
  window._cktTerm=function(n){
    if(S.termIN===n)       S.termIN=null;
    else if(S.termOUT===n){ S.termIN=n; S.termOUT=null; }
    else if(!S.termIN)     S.termIN=n;
    else if(!S.termOUT)    S.termOUT=n;
    else                   S.termIN=n;
    syncTermButtons(); draw(); updateAnswer();
  };
  window._cktClear=function(){
    S.active={}; S.palIdx=0; S.termIN=null; S.termOUT=null; S.selSeg=null;
    hideQuickEdit(); syncTermButtons(); refreshChips(); draw(); updateAnswer();
  };

  /* ── Styles ──────────────────────────────────────────── */
  function css(){
    const id='cktCss5'; if(document.getElementById(id)) document.getElementById(id).remove();
    document.head.insertAdjacentHTML('beforeend',`<style id="${id}">
      #cktRoot{max-width:620px;margin:0 auto;display:flex;flex-direction:column;gap:12px;font-family:'Inter',sans-serif;}
      #cktCanvas{width:100%;border-radius:14px;cursor:crosshair;display:block;}
      #cktQuickBar{display:none;align-items:center;gap:10px;background:#0d0d20;
        border:1px solid #2a2a45;border-radius:12px;padding:12px 16px;flex-wrap:wrap;}
      #cktAnswer{text-align:center;padding:14px;background:#06060e;border:2px solid #00e676;border-radius:14px;min-height:50px;}
      .ckt-panel{background:#0d0d20;border:1px solid #1a1a30;border-radius:12px;padding:14px;}
      .ckt-pt{font-size:11px;font-weight:700;color:#ffd875;text-transform:uppercase;letter-spacing:1.2px;
        margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;}
      .ckt-nrow{display:flex;flex-wrap:wrap;gap:8px;}
      .ckt-nbtn{padding:7px 16px;background:#0d0d20;border:1px solid #2a2a45;color:#546e7a;
        border-radius:22px;font:600 12px 'Outfit',sans-serif;cursor:pointer;transition:all .15s;}
      .ckt-nbtn:hover{border-color:#78909c;color:#b0bec5;}
      .ckt-nbtn.in,.ckt-nbtn.out{background:rgba(255,143,0,.15);border-color:#ff8f00;color:#ffb74d;font-weight:700;}
      .ckt-rbtn{padding:4px 10px;background:transparent;border:1px solid #333;color:#555;
        border-radius:6px;font-size:11px;cursor:pointer;}
      .ckt-rbtn:hover{border-color:#ffd875;color:#ffd875;}
      #cktChips{display:flex;flex-wrap:wrap;gap:7px;min-height:24px;}
      .ckt-chip{display:inline-flex;align-items:center;padding:5px 10px;
        border:1px solid transparent;border-radius:20px;font:700 11px 'Outfit',sans-serif;
        cursor:pointer;transition:all .15s;user-select:none;}
      .ckt-chip:hover{filter:brightness(1.3);}
    </style>`);
  }

  /* ── Build UI ─────────────────────────────────────────── */
  function buildUI(){
    css();
    const sec=document.getElementById('circuitSection'); if(!sec) return;
    sec.innerHTML=`<div id="cktRoot">

      <!-- Canvas -->
      <div class="ckt-panel" style="padding:10px;">
        <canvas id="cktCanvas" width="${CW}" height="${CH}"></canvas>
      </div>

      <!-- Quick Edit Bar (appears when wire is clicked) -->
      <div id="cktQuickBar"></div>

      <!-- Answer -->
      <div id="cktAnswer">
        <span style="color:#263238;font-size:13px;">Click nodes for IN/OUT · click wires to add them</span>
      </div>

      <!-- Terminals -->
      <div class="ckt-panel">
        <div class="ckt-pt">Terminals <span style="font-size:10px;color:#37474f;font-weight:400;text-transform:none;">or click nodes on canvas</span></div>
        <div class="ckt-nrow">
          ${["A","B","C","D","E","F"].map(n=>`
            <button id="cktN-${n}" class="ckt-nbtn${S.termIN===n?" in":S.termOUT===n?" out":""}"
              onclick="window._cktTerm('${n}')">${n}${S.termIN===n?" (+)":S.termOUT===n?" (−)":""}</button>
          `).join('')}
          <button class="ckt-rbtn" onclick="window._cktClear()" style="margin-left:auto;">🗑 Clear all</button>
        </div>
      </div>

      <!-- Active wires summary -->
      <div class="ckt-panel">
        <div class="ckt-pt">Active Wires <span style="font-size:10px;color:#37474f;font-weight:400;text-transform:none;">click a chip to re-edit</span></div>
        <div id="cktChips"><span style="color:#37474f;font-size:12px;font-style:italic;">No wires active yet — click the dashed lines on canvas</span></div>
      </div>

    </div>`;

    document.getElementById('cktCanvas').addEventListener('click',handleClick);
    draw(); updateAnswer();
  }

  window.initCircuitModule=function(){ buildUI(); };

})();
