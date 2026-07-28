var e=[{call:`CN two-two-zero-four, this is the conductor on the ground, west end. Over.`,ack:`Conductor, CN two-two-zero-four, go ahead.`,rule:`Rule 121 — Positive identification`,note:`Commence with railway initials and engine number, digit by digit — 'C-N, two-two-zero-four' — then identify yourself. Both parties identify; initiator ends the initial call with 'over' (121b).`,feet:500,read:`10 cars to the joint`},{call:`I'm on the ground and in the clear, I can see your tail — okay, back ten cars to a joint. Over.`,ack:`Back ten cars to a joint.`,rule:`Rule 123.2 (i, ii) · 115 · 123(c)`,note:`Confirm you're clear with a visual on the tail (115), then the move — direction is off the front of the locomotive, so 'back', with a distance (123.2). Ends with 'over'; the engineer repeats it back (123c).`,feet:500,read:`10 cars`},{call:`Five cars, five, CN two-two-zero-four.`,ack:`Five cars.`,rule:`Rule 123.2(ii) — distance each call`,note:`A distance every call — said twice and tagged with the engine number (Rule 122). The engineer repeats each count back (123c). No 'over' on the running count (120b).`,feet:250,read:`5 cars`},{call:`Three cars, three, CN two-two-zero-four.`,ack:`Three cars.`,rule:`Point protection — Rule 115`,note:`Watching the tail car close on the joint; calls tighten as the gap shrinks.`,feet:150,read:`3 cars`},{call:`Two cars, two.`,ack:`Two cars.`,rule:`Rule 123.2(ii)`,note:`At or below two car lengths you drop the engine number and keep it short (123.2(ii)). Engineer still repeats it back (123c).`,feet:100,read:`2 cars`},{call:`Last car, one.`,ack:`Last car.`,rule:`Last car count`,note:`'Last car, one' is the final car-length count before you switch to feet — engine number stays off, calls are quick now.`,feet:50,read:`last car (1)`},{call:`Half a car.`,rule:`Distance counts take over · 123.2(vi)`,note:`Now you count distance, not cars. A car length is 50 ft (123.2(vi)), so a half car is about 25 ft. From here it's feet to the joint.`,feet:25,read:`½ car (~25 ft)`},{call:`Twenty feet.`,rule:`Closing — feet to the joint`,note:`Distance to the joint, in feet — short and steady so the engineer can ease it in.`,feet:20,read:`20 ft`},{call:`Ten feet.`,rule:`Closing`,note:`Almost there — ready to bring it to a stop on the joint.`,feet:10,read:`10 ft`},{call:`Five feet.`,rule:`Closing`,note:`Last call before the stop.`,feet:5,read:`5 ft`},{call:`That'll do — stop and stretch.`,ack:`Stretching.`,rule:`113.0(i) · 113.2(a) — stop, drift, prove the joint`,note:`One call: 'that'll do' is brakes on and stop (the drift completes the joint), then 'stop and stretch' — the engineer pulls against the coupling with tractive effort to prove it's a proper joint (113.0(i), 113.2(a)). Watch it; the cars must not pull apart.`,feet:0,status:`Stretching…`},{call:`Stop, CN two-two-zero-four, good stretch — set and center.`,ack:`Set and centered, CN two-two-zero-four.`,rule:`113.2(b) coupled · GOI`,goi:`Set & center = CN 3-step protection (a General Operating Instruction), NOT a CROR rule.`,note:`Good stretch confirms it's coupled (113.2(b)). You call 'set and center' and WAIT for the engineer to confirm before going between to couple the air. Nearest CROR precaution is Rule 109. Exact words are CN practice, not CROR.`,feet:0,status:`Set & center — confirmed`},{call:`Hoses are coupled, air's cut in, CN two-two-zero-four.`,ack:`Copied — air's cut in.`,rule:`Operational — report back`,goi:`Going-between protection & 'cut the air in' are operational (CN GOI), not CROR-worded.`,note:`Under set-and-center protection you went between, coupled the air hoses and opened the angle cocks, and reported it.`,feet:0,status:`Air cut in — charging`},{pre:`Air to the tail.`,call:`Air to the tail — going for hand brakes.`,ack:`Copied.`,rule:`Rule 113.2(c) · 123(c)`,note:`The engineer confirms the air has charged to the tail; you repeat it back (123c) and tell him you're going for the hand brakes. 113.2(c): hand brakes aren't released until the air is sufficiently charged and an effective automatic brake application is made — air to the tail is how you know it's charged.`,feet:0,status:`Charged — going for hand brakes`}];function t(){if(document.getElementById(`radio-style`))return;let e=document.createElement(`style`);e.id=`radio-style`,e.textContent=`
.radio-wrap{ --rbg:#14181d; --rcard:#1d222b; --rcard2:#232a34; --rline:#2c3340; --rink:#eef2f6;
  --rmuted:#9aa3b0; --ryellow:#36d07f; --rblue:#4aa3ff; --rgreen:#33c27f; --rorange:#ff8a3d;
  color:var(--rink); }
.radio-wrap *{ box-sizing:border-box }
.radio-wrap .scenario{ background:var(--rcard); border:1px solid var(--rline); border-left:3px solid var(--ryellow); border-radius:8px; padding:10px 14px; font-size:13.5px; margin-bottom:14px }
.radio-wrap .rhead{ display:flex; align-items:center; gap:12px; margin:6px 0 14px }
.radio-wrap .sigmark{ width:34px; height:48px; border-radius:9px; flex:none; background:var(--rcard2); border:1px solid var(--rline); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:5px }
.radio-wrap .sigmark span{ width:8px; height:8px; border-radius:50%; background:#262b34 }
.radio-wrap .rtitle{ font-size:17px; font-weight:700 } .radio-wrap .rsub{ font-size:12.5px; color:var(--rmuted) }
.radio-wrap .stage{ display:block; background:#10131a; border:1px solid var(--rline); border-radius:12px; padding:8px; margin-bottom:14px }
.radio-wrap .stage svg{ display:block; width:100%; height:auto }
.radio-wrap .cols{ display:flex; gap:14px; flex-wrap:wrap }
.radio-wrap .radio{ flex:1 1 420px; background:var(--rcard); border:1px solid var(--rline); border-radius:12px; padding:14px }
.radio-wrap .radio h3, .radio-wrap .note h3{ margin:0 0 8px; font-size:13px; color:var(--rmuted) }
.radio-wrap .log{ min-height:90px; max-height:240px; overflow:auto; margin-bottom:10px }
.radio-wrap .tx{ background:#1d222b; border:1px solid var(--rline); border-left:3px solid var(--rblue); border-radius:7px; padding:7px 10px; margin-bottom:6px; font-size:13.5px }
.radio-wrap .tx.eng{ border-left-color:var(--rgreen) }
.radio-wrap .tx .who{ font-size:10.5px; color:var(--rmuted); text-transform:uppercase; letter-spacing:.4px }
.radio-wrap .next{ font-size:14px; margin:8px 0 } .radio-wrap .next .lbl{ font-size:11px; color:var(--rmuted); text-transform:uppercase; letter-spacing:.4px; display:block; margin-bottom:4px }
.radio-wrap .call{ background:#0e1a28; border:1px dashed var(--rblue); border-radius:8px; padding:9px 12px; font-size:14.5px }
.radio-wrap button.rbtn{ font:inherit; border:none; border-radius:8px; padding:10px 14px; font-weight:700; cursor:pointer; font-size:14px; margin-top:10px }
.radio-wrap button.key{ background:var(--ryellow); color:#06301c } .radio-wrap button.again{ background:transparent; color:var(--rmuted); border:1px solid var(--rline) }
.radio-wrap .note{ flex:1 1 320px; background:var(--rcard); border:1px solid var(--rline); border-radius:12px; padding:14px; font-size:13.5px }
.radio-wrap .note .rule{ color:var(--ryellow); font-weight:700; font-size:12px; margin-bottom:4px }
.radio-wrap .note .goi{ color:var(--rorange); font-weight:700; font-size:12px; margin-bottom:4px }
.radio-wrap .done{ background:#123326; border:1px solid var(--rgreen); border-radius:9px; padding:12px; margin-top:10px; font-size:13.5px; display:none }
.radio-wrap .done.show{ display:block }
.radio-wrap .tip{ font-size:12px; color:var(--rmuted); margin-top:10px; border-top:1px solid var(--rline); padding-top:9px }`,document.head.appendChild(e)}function n(n,r){t(),n.innerHTML=`<button class="back" data-go="">← Home</button>
<div class="radio-wrap">
  <div class="rhead">
    <div class="sigmark" id="sigmark" aria-label="Signal aspect"><span></span><span></span><span></span></div>
    <div><div class="rtitle">Radio &amp; Steps — Back to a Joint</div>
      <div class="rsub">Guided · car counts to feet, couple, verify, protect, cut the air, release</div></div>
  </div>
  <div class="scenario">Engine <b>CN 2204</b> backs its cut up to couple onto a car on AS73. You're on the ground, in the clear, watching the tail car and the joint. Count it down — cars, then feet — verify the coupling, protect, couple the air, release.</div>
  <div class="stage">
    <svg viewBox="0 0 760 240" xmlns="http://www.w3.org/2000/svg">
      <line x1="0" y1="168" x2="760" y2="168" stroke="#2c3340" stroke-width="2"/>
      <line x1="0" y1="176" x2="760" y2="176" stroke="#2c3340" stroke-width="2"/>
      <rect x="566" y="120" width="92" height="46" rx="3" fill="#2c3a4c" stroke="#5878a0"/>
      <text x="612" y="113" fill="#93a6bd" font-size="11" text-anchor="middle" font-family="monospace">standing car · AS73</text>
      <text id="gaptxt" x="360" y="84" fill="#e8eef6" font-size="14" text-anchor="middle" font-weight="700">10 cars to the joint</text>
      <text id="status" x="360" y="84" fill="#33c27f" font-size="13.5" text-anchor="middle" font-weight="700" opacity="0"></text>
      <circle cx="560" cy="190" r="6" fill="#36d07f"/>
      <line x1="560" y1="196" x2="560" y2="210" stroke="#36d07f" stroke-width="2.5"/>
      <line x1="560" y1="200" x2="552" y2="206" stroke="#36d07f" stroke-width="2.5"/>
      <line x1="560" y1="200" x2="568" y2="206" stroke="#36d07f" stroke-width="2.5"/>
      <line x1="560" y1="210" x2="554" y2="222" stroke="#36d07f" stroke-width="2.5"/>
      <line x1="560" y1="210" x2="566" y2="222" stroke="#36d07f" stroke-width="2.5"/>
      <text x="560" y="233" fill="#36d07f" font-size="10.5" text-anchor="middle">you — in the clear, watching the tail car</text>
      <g id="consist">
        <rect x="20" y="108" width="110" height="58" rx="4" fill="#232a34" stroke="#5878a0"/>
        <rect x="20" y="92" width="40" height="20" rx="3" fill="#2a323d" stroke="#5878a0"/>
        <text x="40" y="104" fill="#93a6bd" font-size="9" text-anchor="middle">front</text>
        <text x="88" y="142" fill="#cfe0f2" font-size="11" text-anchor="middle" font-family="monospace">CN 2204</text>
        <rect x="134" y="120" width="58" height="46" rx="3" fill="#3a4a5e" stroke="#5878a0"/>
        <rect x="196" y="120" width="58" height="46" rx="3" fill="#3a4a5e" stroke="#5878a0"/>
        <rect x="258" y="120" width="58" height="46" rx="3" fill="#46586e" stroke="#7fd0a0"/>
        <text x="287" y="148" fill="#bfe8cf" font-size="10" text-anchor="middle">tail car</text>
      </g>
    </svg>
  </div>
  <div class="cols">
    <div class="radio"><h3>Radio</h3><div class="log" id="log"></div><div class="next" id="next"></div></div>
    <div class="note" id="notebox">
      <h3>Why this call</h3>
      <div id="notebody" style="color:var(--rmuted)">Make your first call to begin — identify the engine, railway initials and number digit by digit, and wait for the engineer to answer up.</div>
      <div class="done" id="done"></div>
      <div class="tip"><span style="color:var(--rorange)">CN GOI</span> = operational practice, not a CROR rule. Green lines are the engineer; he repeats the car counts and calls the air to the tail.</div>
    </div>
  </div>
</div>`,n.querySelectorAll(`[data-go]`).forEach(e=>e.addEventListener(`click`,()=>r.go(e.dataset.go)));let i=e=>n.querySelector(`#`+e),a=i(`consist`),o=i(`gaptxt`),s=i(`status`),c=i(`log`),l=i(`next`),u=i(`notebody`),d=i(`done`),f=0,p=[],m=i(`sigmark`);if(m){let e=m.getElementsByTagName(`span`)[0];e.style.background=`#36d07f`,e.style.boxShadow=`0 0 7px #36d07f`}function h(e){let t=e.feet===void 0?500:e.feet;a.setAttribute(`transform`,`translate(`+(500-t)*.5+`,0)`),e.status?(o.setAttribute(`opacity`,`0`),s.setAttribute(`opacity`,`1`),s.textContent=e.status):(s.setAttribute(`opacity`,`0`),o.setAttribute(`opacity`,`1`),o.textContent=e.read||``)}function g(){c.innerHTML=p.map(e=>e.who===`Eng`?`<div class="tx eng"><span class="who">Engineer &middot; CN 2204</span><br>`+e.text+`</div>`:`<div class="tx"><span class="who">You &middot; conductor</span><br>`+e.text+`</div>`).join(``),c.scrollTop=c.scrollHeight}function _(){if(f<e.length){let t=e[f];l.innerHTML=(t.pre?`<div class="tx eng" style="margin-bottom:8px"><span class="who">Engineer &middot; CN 2204 (incoming)</span><br>`+t.pre+`</div>`:``)+`<span class="lbl">Your `+(t.pre?`reply`:`next call`)+`</span><div class="call">`+t.call+`</div><button class="rbtn key" id="keyBtn">Key the radio &#9654;</button>`,i(`keyBtn`).addEventListener(`click`,v)}else l.innerHTML=`<button class="rbtn again" id="againBtn">Run it again</button>`,i(`againBtn`).addEventListener(`click`,y)}function v(){if(f>=e.length)return;let t=e[f];t.pre&&p.push({who:`Eng`,text:t.pre}),p.push({who:`You`,text:t.call}),t.ack&&p.push({who:`Eng`,text:t.ack}),h(t),u.innerHTML=(t.goi?`<div class="goi">`+t.goi+`</div>`:``)+`<div class="rule">`+t.rule+`</div>`+t.note,r.settings&&r.settings.audio&&r.speak(t.call),f++,g(),_(),f>=e.length&&(d.className=`done show`,d.innerHTML=`<b>Coupled, proven, protected, air to the tail.</b> Counted cars then feet, made the joint, stretched it, set &amp; centered, cut the air in; the engineer called air to the tail, you repeated it and called "going for hand brakes." The move/departure is the next layer.`)}function y(){f=0,p=[],h({feet:500,read:`10 cars to the joint`}),c.innerHTML=``,d.className=`done`,u.innerHTML=`Make your first call to begin.`,_()}h({feet:500,read:`10 cars to the joint`}),_()}export{e as STEPS,n as mount};