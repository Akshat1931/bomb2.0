/**
 * Circuit Module - KTaNE Solver
 * 6-node grid (A-F), 11 possible wire segments, all optional.
 * Click a wire → quick-entry bar appears below canvas → type Ω → Enter.
 * Click a node → set IN(+) / OUT(−).
 * Colour legend: paste this game's legend picture (colour → Ω, read by
 * circuit-legend.js), then give each wire its colour instead of typing Ω.
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
    palIdx:  0,
    legend:  null,      // { values: { red:'4', … }, unsure: [colours], at } — this game's colour → Ω
    chips:   null,      // last legend read, per colour (kept to learn corrected digits)
    legendMsg: ''
  };

  /* ── Colour legend (changes every game; read from its picture) ── */
  const LEGEND_KEY = 'ktane_circuit_legend', DIGITS_KEY = 'ktane_circuit_digits';
  const LCOLORS = ['red','orange','yellow','green','blue','violet','white','gray'];
  const SWATCH  = { red:'#e53935', orange:'#fb8c00', yellow:'#fdd835', green:'#43a047',
                    blue:'#1e88e5', violet:'#8e24aa', white:'#eceff1', gray:'#78909c' };
  function lsGet(k){ try{ return JSON.parse(localStorage.getItem(k)||'null'); }catch(e){ return null; } }
  function lsSet(k,v){ try{ if(v) localStorage.setItem(k,JSON.stringify(v)); else localStorage.removeItem(k); }catch(e){} }
  S.legend = lsGet(LEGEND_KEY);

  function segCol(seg){ return seg.color ? SWATCH[seg.color] : PAL[seg.colorIdx%PAL.length]; }
  function legendOhms(c){
    const v = S.legend && S.legend.values[c];
    return (v===undefined||v===null||v==='') ? null : Number(v);
  }
  // wires given a colour follow the legend
  function applyLegendToWires(){
    Object.values(S.active).forEach(seg=>{
      if(!seg.color) return;
      const v=legendOhms(seg.color); if(v!==null) seg.r=v;
    });
  }
  function storeLegend(values, unsure, at){
    S.legend={ values, unsure:unsure||[], at:at||Date.now() };
    lsSet(LEGEND_KEY,S.legend);
    applyLegendToWires();
  }

  function readLegendFile(file){
    if(!window.CircuitLegend){ S.legendMsg='⚠ Legend reader not loaded.'; renderLegend(); return; }
    const img=new Image();
    img.onload=()=>{
      const W=img.naturalWidth, H=img.naturalHeight;
      const cv=document.createElement('canvas'); cv.width=W; cv.height=H;
      const g=cv.getContext('2d',{willReadFrequently:true}); g.drawImage(img,0,0);
      const data=g.getImageData(0,0,W,H).data;
      URL.revokeObjectURL(img.src);
      const r=window.CircuitLegend.readLegend(data,W,H,lsGet(DIGITS_KEY)||{});
      const valued=r.ok ? r.chips.filter(ch=>ch.value!==null).length : 0;
      if(valued<3){ S.legendMsg='⚠ Could not read colour chips — is this the colour legend picture?'; renderLegend(); return; }
      const values={}, unsure=[]; S.chips={};
      r.chips.forEach(ch=>{
        if(!ch.color) return;
        S.chips[ch.color]={ ...ch, read:ch.value };
        values[ch.color]=ch.value===null?'':ch.value;
        if(!ch.sure) unsure.push(ch.color);
      });
      const dupes=r.chips.map(ch=>ch.color).filter((c,i,a)=>a.indexOf(c)!==i);
      storeLegend(values,unsure);
      S.legendMsg=`✓ Read ${Object.keys(values).length} colours`
        +(unsure.length?` · check ${unsure.join(', ')} against the picture`:'')
        +(dupes.length?` · ⚠ ${dupes.join(', ')} seen twice`:'');
      renderLegend(); refreshChips(); draw(); updateAnswer();
    };
    img.onerror=()=>{ S.legendMsg='⚠ Could not open that file as an image.'; renderLegend(); };
    img.src=URL.createObjectURL(file);
  }

  function renderLegend(){
    const st=document.getElementById('cktLegendState');
    const body=document.getElementById('cktLegendBody');
    if(!st||!body) return;
    const L=S.legend;
    if(L){
      const m=Math.round((Date.now()-L.at)/60000);
      st.innerHTML=`read ${m<1?'just now':m<60?m+' min ago':Math.round(m/60)+' h ago'} · <a href="#" onclick="window._cktLegendForget();return false;" style="color:#ef9a9a;">forget</a>`;
      body.innerHTML=`<div class="ckt-lgrid">${LCOLORS.map(c=>`
        <label class="ckt-lchip${L.unsure.includes(c)?' unsure':''}" title="${L.unsure.includes(c)?'Not sure about this value — check it against the picture':''}">
          <span class="ckt-sw" style="background:${SWATCH[c]};"></span>${c}
          <input type="text" inputmode="numeric" value="${L.values[c]===undefined?'':L.values[c]}" placeholder="?"
            oninput="window._cktLegendSet('${c}',this.value)" onchange="window._cktLegendLearn('${c}')">Ω
        </label>`).join('')}</div>`;
    } else {
      st.textContent='not read yet';
      body.innerHTML='';
    }
    const msg=document.getElementById('cktLegendMsg');
    if(msg){ msg.textContent=S.legendMsg; msg.style.color=S.legendMsg.startsWith('⚠')?'#ef9a9a':'#81c784'; }
  }

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
      const col=segCol(seg);
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
    const col=segCol(seg);
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
      <div class="ckt-colrow">
        <span style="color:#546e7a;font-size:12px;">or its colour${S.legend?'':' (paste the legend first)'}:</span>
        ${LCOLORS.map(c=>{ const v=legendOhms(c); return `<button type="button" class="ckt-colbtn${seg.color===c?' on':''}"
          style="--c:${SWATCH[c]};" title="${c}${v!==null?' = '+v+' Ω':' — not in the legend yet'}"
          onclick="window._cktSetColor('${c}')"><span></span>${v!==null?v+'Ω':'?'}</button>`; }).join('')}
      </div>
    `;

    const inp=document.getElementById('cktQI');
    inp.focus(); inp.select();

    // Live update as they type
    inp.addEventListener('input',()=>{
      const v=parseFloat(inp.value); if(S.active[id]){ S.active[id].r=isNaN(v)?0:Math.max(0,v); S.active[id].color=null; }
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
      const col=segCol(seg);
      return `<span class="ckt-chip" onclick="window._cktEditChip('${id}')"
        style="border-color:${col};background:${col}18;color:${col};">
        <span style="width:7px;height:7px;border-radius:50%;background:${col};display:inline-block;margin-right:4px;"></span>
        ${id}: ${seg.color?seg.color+' ':''}${seg.r===0?'wire':seg.r+'Ω'}
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
  window._cktSetColor=function(c){
    const seg=S.selSeg&&S.active[S.selSeg]; if(!seg) return;
    seg.color=c;
    const v=legendOhms(c); if(v!==null) seg.r=v;
    showQuickEdit(S.selSeg); refreshChips(); draw(); updateAnswer();
  };
  window._cktLegendSet=function(c,v){
    const clean=String(v).replace(/\D/g,'');
    const L=S.legend||{ values:{}, unsure:[], at:Date.now() };
    storeLegend({ ...L.values, [c]: clean?String(Number(clean)):'' }, L.unsure.filter(x=>x!==c), L.at);
    refreshChips(); draw(); updateAnswer();
  };
  // a corrected value teaches the reader that digit's shape
  window._cktLegendLearn=function(c){
    const ch=S.chips&&S.chips[c], typed=legendOhms(c);
    if(ch&&typed!==null&&window.CircuitLegend) lsSet(DIGITS_KEY, window.CircuitLegend.learnDigits(lsGet(DIGITS_KEY)||{}, ch, String(typed)));
    renderLegend();
  };
  window._cktLegendForget=function(){
    S.legend=null; S.chips=null; S.legendMsg='Legend forgotten — paste this game\'s legend picture.';
    lsSet(LEGEND_KEY,null); renderLegend();
  };
  window._cktLegendFile=function(input){
    const f=input.files&&input.files[0]; if(f) readLegendFile(f);
    input.value='';
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
      .ckt-drop{border:2px dashed #2a2a45;border-radius:10px;padding:12px;text-align:center;color:#90a4ae;
        font-size:13px;cursor:pointer;transition:all .15s;margin-bottom:10px;}
      .ckt-drop:hover,.ckt-drop.dragover{border-color:#ffd875;color:#ffd875;background:rgba(255,216,117,.05);}
      .ckt-lgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:7px;}
      .ckt-lchip{display:flex;align-items:center;gap:6px;background:#060610;border:1px solid #1a1a30;border-radius:8px;
        padding:5px 8px;font:600 12px 'Outfit',sans-serif;color:#b0bec5;text-transform:capitalize;}
      .ckt-lchip.unsure{border-color:#c62828;}
      .ckt-lchip input{width:42px;margin-left:auto;background:#0d0d20;border:1px solid #2a2a45;color:#00e676;
        font:700 13px monospace;text-align:center;border-radius:6px;padding:3px;outline:none;}
      .ckt-sw{width:12px;height:12px;border-radius:50%;display:inline-block;border:1px solid rgba(0,0,0,.4);}
      #cktLegendMsg{font-size:12px;margin-top:8px;min-height:1em;}
      .ckt-colrow{flex-basis:100%;display:flex;flex-wrap:wrap;align-items:center;gap:6px;}
      .ckt-colbtn{display:inline-flex;align-items:center;gap:5px;padding:4px 9px;background:#060610;border:1px solid #2a2a45;
        color:#b0bec5;border-radius:16px;font:700 11px 'Outfit',sans-serif;cursor:pointer;}
      .ckt-colbtn span{width:10px;height:10px;border-radius:50%;background:var(--c);display:inline-block;}
      .ckt-colbtn.on,.ckt-colbtn:hover{border-color:var(--c);color:#fff;}
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

      <!-- Colour legend (this game) -->
      <div class="ckt-panel">
        <div class="ckt-pt">Colour Legend (Ω) <span id="cktLegendState" style="font-size:10px;color:#37474f;font-weight:400;text-transform:none;"></span></div>
        <div id="cktLegendDrop" class="ckt-drop" onclick="document.getElementById('cktLegendFile').click()">
          <input type="file" id="cktLegendFile" accept="image/*" style="display:none;" onchange="window._cktLegendFile(this)">
          📋 Paste / drop this game's <b>colour legend</b> picture <span style="color:#546e7a;">(Ctrl+V or click)</span>
        </div>
        <div id="cktLegendBody"></div>
        <div id="cktLegendMsg"></div>
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
    setupLegendInputs();
    renderLegend();
    draw(); updateAnswer();
  }

  function setupLegendInputs(){
    const dz=document.getElementById('cktLegendDrop');
    if(dz){
      dz.addEventListener('dragover',e=>{ e.preventDefault(); dz.classList.add('dragover'); });
      dz.addEventListener('dragleave',()=>dz.classList.remove('dragover'));
      dz.addEventListener('drop',e=>{
        e.preventDefault(); e.stopPropagation(); dz.classList.remove('dragover');
        if(window.BombDragDrop) window.BombDragDrop.handleDataTransfer(e.dataTransfer,f=>{ if(f) readLegendFile(f); });
        else { const f=[...(e.dataTransfer?.files||[])].find(x=>x.type.startsWith('image/')); if(f) readLegendFile(f); }
      });
    }
    if(S.pasteBound) return;
    S.pasteBound=true;
    // Ctrl+V of the legend picture on this tab (Discord links go via dragdrop-helper.js)
    document.addEventListener('paste',e=>{
      if(!document.getElementById('circuitSection')?.classList.contains('active')) return;
      for(const item of (e.clipboardData?.items||[])){
        if(item.type.startsWith('image/')){
          e.preventDefault();
          const f=item.getAsFile(); if(f) readLegendFile(f);
          return;
        }
      }
    });
  }

  window.initCircuitModule=function(){ buildUI(); };

})();
