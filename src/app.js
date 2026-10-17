(function(){
'use strict';
var $=function(id){return document.getElementById(id)};
var BLANK=false,PFX='';
document.documentElement.classList.add('notis');
/* Notis: one-time copy of Jarvis notes (same origin), Jarvis data untouched */
var NS_IMPORTED=false;
var LS={get:function(k,d){try{var v=localStorage.getItem(PFX+k);return v?JSON.parse(v):d}catch(e){return d}},set:function(k,v){try{localStorage.setItem(PFX+k,JSON.stringify(v))}catch(e){}}};
/* v21: drop AI/search keys */
(function(){['ns_gkey','ns_skey','ns_chat','ns_gmodel','ns_gauto','ns_gnosearch'].forEach(function(k){try{localStorage.removeItem(PFX+k)}catch(e){}})})();
var ZILE=['Duminică','Luni','Marți','Miercuri','Joi','Vineri','Sâmbătă'];
var ZILE_S=['Dum','Lun','Mar','Mie','Joi','Vin','Sâm'];
var LUNI=['ianuarie','februarie','martie','aprilie','mai','iunie','iulie','august','septembrie','octombrie','noiembrie','decembrie'];
var LUNI_S=['ian','feb','mar','apr','mai','iun','iul','aug','sept','oct','nov','dec'];
function pad(n){return (n<10?'0':'')+n}
function dkey(d){d=d||new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function toast(m){var t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(function(){t.classList.remove('show')},3000)}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
var DEFAULT_STATUS='Agent local. Doar vreme și taskuri.';
function setStatus(m,err){var s=$('vstatus');s.textContent=m||(cfg&&!cfg.name?'Setează-ți numele în Setări.':DEFAULT_STATUS);s.className='status'+(err?' err':'')}

/* ---------- settings ---------- */
var cfg=null;cfg=Object.assign({name:BLANK?'':'Iosif',city:'Gherla',lat:47.03,lon:23.91,tz:'Europe/Bucharest',engine:'piper',rate:1.25,pitch:null,voiceURI:null,
 clockFont:'condensed',clockColor:'#3fd8ff',clockSize:56},LS.get('ns_cfg',{}));
if(cfg.engine==='piper'||!cfg.engine||(cfg.engine!=='browser'&&!TTS.voice(cfg.engine)))cfg.engine='mihai';if(cfg.tone==null)cfg.tone=1;if(cfg.remindUrgent==null)cfg.remindUrgent=true;
if(!LS.get('ns_v4',false)){cfg.clockFont='condensed';cfg.clockSize=56;cfg.clockColor='#3fd8ff';LS.set('ns_v4',true);LS.set('ns_cfg',cfg)}
if(!LS.get('ns_v3',false)){cfg.engine='mihai';if(cfg.rate==null||cfg.rate===1.3)cfg.rate=1.25;LS.set('ns_v3',true);LS.set('ns_cfg',cfg)}
function saveCfg(){LS.set('ns_cfg',cfg)}

/* ---------- clock ---------- */
var FONTS=[
 {id:'condensed',name:'Condensat (implicit)',css:'"Roboto Condensed",Oswald,"Arial Narrow",sans-serif-condensed,sans-serif',w:700,k:1},
 {id:'orbitron',name:'Orbitron',css:'Orbitron,monospace',w:700,k:1},
 {id:'rajdhani',name:'Rajdhani',css:'Rajdhani,sans-serif',w:700,k:1.25},
 {id:'sharetech',name:'Share Tech Mono',css:'"Share Tech Mono",monospace',w:400,k:1.2},
 {id:'audiowide',name:'Audiowide',css:'Audiowide,sans-serif',w:400,k:1},
 {id:'teko',name:'Teko',css:'Teko,sans-serif',w:500,k:1.45},
 {id:'oxanium',name:'Oxanium',css:'Oxanium,sans-serif',w:700,k:1.1},
 {id:'dseg7',name:'DSEG7 (7 segmente)',css:'"DSEG7 Classic",monospace',w:700,k:.9,seg:'88.88'},
 {id:'dseg14',name:'DSEG14 (14 segm.)',css:'"DSEG14 Classic",monospace',w:700,k:.9,seg:'~~.~~'},
 {id:'mono',name:'Monospace sistem',css:'ui-monospace,"Roboto Mono","Droid Sans Mono",Menlo,Consolas,monospace',w:700,k:1.15}];
function fontById(id){return FONTS.filter(function(f){return f.id===id})[0]||FONTS[0]}
function applyClock(c){c=c||cfg;var f=fontById(c.clockFont),el=$('clock');
 el.style.fontFamily=f.css;el.style.fontWeight=f.w;el.style.fontSize=Math.round(c.clockSize*f.k)+'px';
 document.documentElement.style.setProperty('--clock',c.clockColor);
 el.classList.toggle('seg',!!f.seg);if(f.seg)el.setAttribute('data-ghost',f.seg)}
applyClock();
var newsScale=+LS.get('ns_newssize',100)||100;
function applyNewsSize(p){p=Math.max(80,Math.min(160,+p||100));var s=String(p/100);var c=$('cNews');if(c)c.style.setProperty('--ns',s);var pv=$('newsSizePrev');if(pv)pv.style.setProperty('--ns',s)}
applyNewsSize(newsScale);

/* ---------- greeting ---------- */
function greeting(){var h=new Date().getHours();var g=h>=5&&h<12?'Bună dimineața':h>=12&&h<18?'Bună ziua':'Bună seara';return cfg.name?g+', '+cfg.name+'.':g+'!'}
function greetFull(){return greeting()+' Sunt Jarvis, asistentul tău. Cu ce te pot ajuta?'}
var greetBusy=false,greetRestoreT=null;
function renderGreet(force){if(greetBusy&&!force)return;greetBusy=false;
 var seg=prepSeg($('greet'),greetFull());var i=seg.words.length-1;
 greetStatic={seg:seg,span:seg.words[i]&&seg.words[i].span};
 requestAnimationFrame(function(){moveBar(seg,greetStatic.span,true)})} /* static underline under "ajuta" */
var greetStatic=null;
function reflowBars(){if(activeSeg&&activeSeg.cur>=0&&activeSeg.words[activeSeg.cur].span)moveBar(activeSeg,activeSeg.words[activeSeg.cur].span,true);
 if(greetStatic&&greetStatic.span&&greetStatic.span.isConnected&&activeSeg!==greetStatic.seg)moveBar(greetStatic.seg,greetStatic.span,true)}
if(document.fonts){if(document.fonts.ready)document.fonts.ready.then(reflowBars);if(document.fonts.addEventListener)document.fonts.addEventListener('loadingdone',reflowBars)}
var lastDay=dkey();
function dayCheck(){if(dkey()===lastDay)return;lastDay=dkey();rollTasks();renderTasks();renderShop();renderTabs()}
document.addEventListener('visibilitychange',function(){if(!document.hidden)dayCheck()});window.addEventListener('focus',dayCheck);
(function midnight(){var n=new Date(),m=new Date(n.getFullYear(),n.getMonth(),n.getDate()+1,0,0,2);setTimeout(function(){dayCheck();midnight()},Math.max(1000,m-n))})();
function tick(){var d=new Date();$('clock').textContent=pad(d.getHours())+'.'+pad(d.getMinutes());
 if(d.getSeconds()===0||!tick.done){if(!speaking)renderGreet();tick.done=1}
 dayCheck()}

/* ---------- karaoke core ---------- */
/* A segment = a piece of text shown in a DOM element; every word becomes a span, and the element gets its own glowing bar. */
function prepSeg(el,text){var seg={el:el,text:text,words:[],bar:null,cur:-1};
 var re=/\S+/g,m,last=0,html='';
 while((m=re.exec(text))){seg.words.push({s:m.index,e:m.index+m[0].length,w:m[0]});
  if(el)html+=esc(text.slice(last,m.index))+'<span class="w">'+esc(m[0])+'</span>';last=re.lastIndex}
 if(el){el.innerHTML=html+esc(text.slice(last))+'<span class="kbar"></span>';el.classList.add('kw');
  var sp=el.querySelectorAll('.w');seg.words.forEach(function(w,i){w.span=sp[i]});seg.bar=el.querySelector('.kbar')}
 return seg}
function moveBar(seg,span,instant){var b=seg&&seg.bar;if(!b)return;if(!span){b.classList.remove('show');return}
 if(instant)b.style.transition='none';
 b.style.width=span.offsetWidth+'px';b.style.transform='translate('+span.offsetLeft+'px,'+(span.offsetTop+span.offsetHeight)+'px)';b.classList.add('show');
 if(instant){void b.offsetWidth;b.style.transition=''}}
var activeSeg=null;
function hl(seg,i){if(!seg)return;
 if(activeSeg!==seg){if(activeSeg)clearSeg(activeSeg);activeSeg=seg;seg.cur=-1;
  if(seg.el&&!seg.el.classList.contains('nrMir')&&seg.el.scrollIntoView&&seg.el.isConnected){var r=seg.el.getBoundingClientRect();if(r.top<70||r.bottom>innerHeight-110)seg.el.scrollIntoView({block:'center',behavior:'smooth'})}}
 if(i===seg.cur||i<0||i>=seg.words.length)return;seg.cur=i;
 if(!seg.el)return;
 seg.words.forEach(function(w,j){if(w.span){w.span.classList.toggle('cur',j===i);w.span.classList.toggle('past',j<i)}});
 moveBar(seg,seg.words[i].span,false);var sp=seg.words[i].span;if(sp&&seg.el.classList.contains('nrMir')){var q=sp.getBoundingClientRect();if(q.top<80||q.bottom>innerHeight-120)sp.scrollIntoView({block:'center',behavior:'smooth'})}}
function clearSeg(seg){if(!seg)return;seg.words.forEach(function(w){if(w.span)w.span.classList.remove('cur','past')});moveBar(seg,null)}
function clearActive(){if(activeSeg)clearSeg(activeSeg);activeSeg=null}
addEventListener('resize',reflowBars);

/* ---------- weather ---------- */
var WMO={0:['Cer senin','clear','Senin'],1:['Predominant senin','clear','Senin'],2:['Parțial noros','partly','Parțial noros'],3:['Cer acoperit','cloud','Acoperit'],45:['Ceață','fog','Ceață'],48:['Ceață cu chiciură','fog','Chiciură'],
51:['Burniță slabă','drizzle','Burniță'],53:['Burniță','drizzle','Burniță'],55:['Burniță densă','drizzle','Burniță'],56:['Burniță înghețată','drizzle','Burniță'],57:['Burniță înghețată','drizzle','Burniță'],
61:['Ploaie slabă','rain','Ploaie'],63:['Ploaie','rain','Ploaie'],65:['Ploaie puternică','rain','Ploaie'],66:['Ploaie înghețată','rain','Ploaie'],67:['Ploaie înghețată','rain','Ploaie'],
71:['Ninsoare slabă','snow','Ninsoare'],73:['Ninsoare','snow','Ninsoare'],75:['Ninsoare abundentă','snow','Ninsoare'],77:['Fulgi de zăpadă','snow','Ninsoare'],
80:['Averse slabe','rain','Averse'],81:['Averse de ploaie','rain','Averse'],82:['Averse puternice','rain','Averse'],85:['Averse de ninsoare','snow','Ninsoare'],86:['Averse de ninsoare','snow','Ninsoare'],
95:['Furtună','storm','Furtună'],96:['Furtună cu grindină','storm','Furtună'],99:['Furtună cu grindină','storm','Furtună']};
var _iconN=0;
function iconDefs(u){return '<defs>'+
 '<radialGradient id="'+u+'sg" cx="38%" cy="35%" r="60%"><stop offset="0%" stop-color="#fff6c8"/><stop offset="45%" stop-color="#ffd24a"/><stop offset="100%" stop-color="#ff8a1a"/></radialGradient>'+
 '<radialGradient id="'+u+'sg2" cx="40%" cy="35%" r="55%"><stop offset="0%" stop-color="#ffe9a0"/><stop offset="100%" stop-color="#ffb020" stop-opacity="0"/></radialGradient>'+
 '<radialGradient id="'+u+'mg" cx="40%" cy="35%" r="65%"><stop offset="0%" stop-color="#f0f6ff"/><stop offset="55%" stop-color="#c5d4ea"/><stop offset="100%" stop-color="#7a90b0"/></radialGradient>'+
 '<linearGradient id="'+u+'cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="45%" stop-color="#e8eef5"/><stop offset="100%" stop-color="#9aafc0"/></linearGradient>'+
 '<linearGradient id="'+u+'cgd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#d8e0ea"/><stop offset="50%" stop-color="#a8b8c8"/><stop offset="100%" stop-color="#6a7f92"/></linearGradient>'+
 '<linearGradient id="'+u+'cgs" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5a6a7c"/><stop offset="100%" stop-color="#2a3544"/></linearGradient>'+
 '<linearGradient id="'+u+'rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7ad4ff"/><stop offset="100%" stop-color="#2a8fd4"/></linearGradient>'+
 '<linearGradient id="'+u+'lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff6a0"/><stop offset="50%" stop-color="#ffd020"/><stop offset="100%" stop-color="#ff8a00"/></linearGradient>'+
 '<filter id="'+u+'glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
 '<filter id="'+u+'soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.1"/></filter>'+
 '<filter id="'+u+'fluff" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".6"/></filter>'+
 '</defs>'}
function sunBody(u,cx,cy,r){return '<circle cx="'+cx+'" cy="'+cy+'" r="'+(r*1.55)+'" fill="url(#'+u+'sg2)" opacity=".55"/>'+
 '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="url(#'+u+'sg)" filter="url(#'+u+'glow)"/>'+
 '<circle cx="'+(cx-r*.28)+'" cy="'+(cy-r*.32)+'" r="'+(r*.28)+'" fill="#fff" opacity=".35"/>'}
function moonBody(u,cx,cy,r){return '<g filter="url(#'+u+'glow)"><path d="M'+(cx+r*.15)+' '+(cy-r)+'a'+r+' '+r+' 0 1 0 '+(r*.2)+' '+(r*1.85)+'a'+(r*.72)+' '+(r*.72)+' 0 1 1 -'+(r*.2)+' -'+(r*1.85)+'z" fill="url(#'+u+'mg)"/></g>'+
 '<circle cx="'+(cx+r*.35)+'" cy="'+(cy-r*.2)+'" r="'+(r*.12)+'" fill="#9eb0c8" opacity=".35"/>'+
 '<circle cx="'+(cx+r*.1)+'" cy="'+(cy+r*.25)+'" r="'+(r*.08)+'" fill="#9eb0c8" opacity=".28"/>'}
function cloudBody(u,x,y,sc,dark){sc=sc||1;var g=dark?(dark===2?u+'cgs':u+'cgd'):u+'cg';
 return '<g transform="translate('+x+' '+y+') scale('+sc+')" filter="url(#'+u+'fluff)">'+
 '<ellipse cx="22" cy="28" rx="14" ry="10" fill="url(#'+g+')"/><ellipse cx="36" cy="24" rx="16" ry="12" fill="url(#'+g+')"/>'+
 '<ellipse cx="50" cy="30" rx="12" ry="9" fill="url(#'+g+')"/><ellipse cx="36" cy="34" rx="22" ry="11" fill="url(#'+g+')"/>'+
 (dark?'':'<ellipse cx="30" cy="22" rx="10" ry="6" fill="#fff" opacity=".45"/>')+'</g>'}
function rainDrops(u,y){y=y||46;return '<g fill="url(#'+u+'rg)" opacity=".9">'+
 '<path d="M20 '+y+'q1.2 3 0 6q-1.2-3 0-6z"/><path d="M28 '+(y+3)+'q1.4 3.5 0 7q-1.4-3.5 0-7z"/><path d="M36 '+y+'q1.2 3 0 6q-1.2-3 0-6z"/>'+
 '<path d="M44 '+(y+4)+'q1.3 3.2 0 6.5q-1.3-3.3 0-6.5z"/><path d="M24 '+(y+8)+'q1 2.5 0 5q-1-2.5 0-5z"/><path d="M40 '+(y+9)+'q1 2.5 0 5q-1-2.5 0-5z"/></g>'}
function snowFlakes(y){y=y||48;return '<g fill="#eef6ff" opacity=".95">'+
 '<circle cx="22" cy="'+y+'" r="2.2"/><circle cx="32" cy="'+(y+4)+'" r="2.6"/><circle cx="42" cy="'+y+'" r="2.2"/>'+
 '<circle cx="27" cy="'+(y+10)+'" r="1.8"/><circle cx="37" cy="'+(y+11)+'" r="1.9"/>'+
 '<g stroke="#eef6ff" stroke-width="1.2" stroke-linecap="round" opacity=".7"><path d="M22 '+(y-3)+'v6M19 '+y+'h6"/><path d="M42 '+(y-3)+'v6M39 '+y+'h6"/></g></g>'}
function fogBands(u){return '<g stroke="#c8d6e4" stroke-width="3.2" stroke-linecap="round" opacity=".75" filter="url(#'+u+'soft)"><path d="M12 40h40"/><path d="M16 48h32" opacity=".85"/><path d="M14 56h36" opacity=".65"/></g>'}
function bolt(u){return '<path d="M36 34l-9 12h6.5l-4.5 12 13-16h-7l5.5-8z" fill="url(#'+u+'lg)" filter="url(#'+u+'glow)"/>'}
function icon(kind,day){var u='i'+(_iconN++),body='';
 if(kind==='clear')body=day?sunBody(u,32,32,14):moonBody(u,34,32,16);
 else if(kind==='partly')body=(day?sunBody(u,22,20,10):moonBody(u,22,18,11))+cloudBody(u,4,18,.95);
 else if(kind==='cloud')body=cloudBody(u,-2,8,1.05,1)+cloudBody(u,6,16,1);
 else if(kind==='fog')body=cloudBody(u,2,2,.9)+fogBands(u);
 else if(kind==='drizzle')body=cloudBody(u,2,4)+'<g opacity=".7">'+rainDrops(u,48)+'</g>';
 else if(kind==='rain')body=cloudBody(u,2,2,1,1)+rainDrops(u,46);
 else if(kind==='snow')body=cloudBody(u,2,2)+snowFlakes(48);
 else if(kind==='storm')body=cloudBody(u,0,0,1.05,2)+bolt(u)+'<g opacity=".55">'+rainDrops(u,50)+'</g>';
 else body=cloudBody(u,2,10);
 return '<svg viewBox="0 0 64 64" aria-hidden="true">'+iconDefs(u)+body+'</svg>'}
function windTxt(k){return k<6?'Vânt calm':k<20?'Vânt slab':k<39?'Vânt moderat':k<62?'Vânt puternic':'Vânt foarte puternic'}
var wx=LS.get('ns_wx',null);
function wxSentence(w){if(!w)return 'Nu am date despre vreme.';var d=WMO[w.code]||['Vreme variabilă','cloud','Variabil'];
 var s=d[0]+'. Acum '+Math.round(w.temp)+' grade. Maxima '+Math.round(w.max)+', minima '+Math.round(w.min)+'. Șanse de ploaie: '+w.pp+'%. '+windTxt(w.wind)+'.';
 var rainy=/rain|storm|drizzle/.test(d[1]);s+=(w.pp>=40||rainy)?' Ia umbrela cu tine.':' Nu ai nevoie de umbrelă.';return s}
function wxDayLabel(iso){var p=String(iso||'').split('-');if(p.length<3)return'—';
 var d=new Date(+p[0],+p[1]-1,+p[2]);return ZILE_S[d.getDay()]+' '+d.getDate()}
function renderWxDays(){var el=$('wxdays');if(!el)return;el.innerHTML='';
 var days=(wx&&wx.days)||[];if(!days.length){el.hidden=true;return}el.hidden=false;
 days.slice(0,5).forEach(function(day){var d=WMO[day.code]||['Vreme variabilă','cloud','Variabil'];
  var cell=document.createElement('div');cell.className='wxday';
  var lab=document.createElement('div');lab.className='wd';lab.textContent=wxDayLabel(day.date);cell.appendChild(lab);
  var ic=document.createElement('div');ic.className='wi';ic.innerHTML=icon(d[1],1);cell.appendChild(ic);
  el.appendChild(cell)})}
function renderWx(){$('wxlbl').textContent='Vremea · '+cfg.city;if($('wxcity'))$('wxcity').textContent=cfg.city;
 if(!wx){$('wxicon').innerHTML=icon('cloud',1);$('wxtemp').textContent='—°';if($('wxtempmini'))$('wxtempmini').textContent='—°';if($('wxiconmini'))$('wxiconmini').innerHTML=icon('cloud',1);$('wxcond').textContent='Se încarcă…';$('wxfeel').textContent='';$('wxline').textContent='';$('wxhi').textContent='';$('wxmeta').textContent='';renderWxDays();return}
 var d=WMO[wx.code]||['Vreme variabilă','cloud','Variabil'];$('wxicon').innerHTML=icon(d[1],wx.day);if($('wxiconmini'))$('wxiconmini').innerHTML=icon(d[1],wx.day);
 $('wxtemp').textContent=Math.round(wx.temp)+'°';if($('wxtempmini'))$('wxtempmini').textContent=Math.round(wx.temp)+'°';
 $('wxcond').textContent=d[2]||d[0];
 $('wxfeel').textContent=wx.feel!=null?'Se simte ca: '+Math.round(wx.feel)+'°C':'';
 $('wxhi').textContent=Math.round(wx.max)+'°/'+Math.round(wx.min)+'°';
 $('wxline').textContent='Ploaie '+wx.pp+'% · '+windTxt(wx.wind);
 if(!(speaking&&activeSeg&&activeSeg.el===$('wxtxt')))$('wxtxt').textContent=wxSentence(wx);
 var t=new Date(wx.ts),n=new Date();
 var when=dkey(t)===dkey(n)?'azi la '+pad(t.getHours())+':'+pad(t.getMinutes()):t.getDate()+' '+LUNI_S[t.getMonth()]+' '+pad(t.getHours())+':'+pad(t.getMinutes());
 $('wxmeta').textContent='Actualizat '+when+(wx.stale?' (offline)':'');
 renderWxDays()}
function loadWx(){
 var u='https://api.open-meteo.com/v1/forecast?latitude='+cfg.lat+'&longitude='+cfg.lon+'&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone='+encodeURIComponent(cfg.tz||'Europe/Bucharest')+'&forecast_days=5';
 return fetch(u).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()}).then(function(j){
  var days=[],time=(j.daily&&j.daily.time)||[],codes=(j.daily&&j.daily.weather_code)||[];
  for(var i=0;i<Math.min(5,time.length);i++)days.push({date:time[i],code:codes[i]});
  wx={temp:j.current.temperature_2m,feel:j.current.apparent_temperature,code:j.current.weather_code,wind:j.current.wind_speed_10m,day:j.current.is_day===1,
   max:j.daily.temperature_2m_max[0],min:j.daily.temperature_2m_min[0],pp:j.daily.precipitation_probability_max[0]||0,days:days,ts:Date.now(),city:cfg.city,lat:cfg.lat,lon:cfg.lon};
  LS.set('ns_wx',wx);renderWx()}).catch(function(){if(wx){wx.stale=true;renderWx()}else{$('wxcond').textContent='Fără date';$('wxtxt').textContent='Nu pot încărca vremea (fără internet?).';renderWx()}})}

/* ---------- tasks (never lost: open tasks carry over; done/deleted kept as history) ---------- */
var tasks=LS.get('ns_tasks',null);
if(!tasks&&BLANK)tasks=[];
if(!tasks){ /* first visit of the owner's page only; the shared blank copy never seeds */var y=new Date();y.setDate(y.getDate()-1);var yk=dkey(y),tk0=dkey(),i0=0;
 tasks=[['De comandat ață gri de 20. De vorbit cu Grig ori cu Alex',yk],['De curățat uleiul de sub mașina de cusut',yk],['Scaune Sorin',tk0],['Burete pat Leia, strada Dejului, de sunat',tk0],['Contor apă',tk0]]
  .map(function(a){return{id:Date.now()+'_'+(i0++),text:a[0],date:a[1],done:false,doneDate:null}});LS.set('ns_tasks',tasks)} /* (v15 migrate() below gives them dueDay) */
function save(){LS.set('ns_tasks',tasks);histPush()}
function live(t){return !t.deleted}
function visible(t){return live(t)&&(!t.done||t.doneDate===dkey())} /* done tasks stay visible until the end of the day they were completed */
function dayOff(n){var d=new Date();d.setDate(d.getDate()+n);return dkey(d)}
function shortDate(k){var p=k.split('-');return 'din '+(+p[2])+' '+LUNI_S[+p[1]-1]}
/* v15: Azi / Mâine. Each task has dueDay. Azi = dueDay <= today (open, or done today); Mâine = dueDay >= tomorrow.
   Open tasks whose dueDay passed roll to today (fromDay keeps the first day they were due -> "din 3 oct" note). */
function inList(t,which){var tk=dkey();return which==='maine'?t.dueDay>tk:t.dueDay<=tk}
function listFor(which){return tasks.filter(function(t){return visible(t)&&inList(t,which)}).sort(urgOrd(which==='maine'?'maine':'azi'))}
/* v14: explicit order set by drag & drop (ord + ordK = list it was ordered in); unordered items keep the old date order, after the ordered ones */
function ordCmp(k){return function(a,b){var oa=a.ord!=null&&a.ordK===k,ob=b.ord!=null&&b.ordK===k;
 if(oa&&ob)return a.ord-b.ord;if(oa!==ob)return oa?-1:1;return a.date<b.date?-1:a.date>b.date?1:0}}
function isDoneItem(x){return !!(x.done||x.bought)} /* v28: done/bought sink below open items */
function alphaCmp(a,b){return String(a.text||'').localeCompare(String(b.text||''),'ro',{sensitivity:'base'})} /* v40: alphabetical (ro, case/diacritics-insensitive) */
function urgOrd(k){return function(a,b){var da=!!a.done,db=!!b.done;if(da!==db)return da?1:-1;if(!!a.urgent!==!!b.urgent)return a.urgent?-1:1;return alphaCmp(a,b)}}
function urgAlpha(a,b){return urgSort(a,b)||alphaCmp(a,b)}
function urgSort(a,b){var da=isDoneItem(a),db=isDoneItem(b);if(da!==db)return da?1:-1;if(!!a.urgent!==!!b.urgent)return a.urgent?-1:1;return 0}
(function migrate(){var tk=dkey(),need=tasks.filter(function(t){return !t.dueDay});if(!need.length)return;
 /* keep what v14 showed: old "ieri" list, then "noi", in their on-screen order -> all open ones go to Azi */
 var vis=function(t){return !t.dueDay&&visible(t)},seen=tasks.filter(function(t){return vis(t)&&t.date<tk}).sort(ordCmp('old'))
  .concat(tasks.filter(function(t){return vis(t)&&!(t.date<tk)}).sort(ordCmp('new@'+tk)));
 need.forEach(function(t){if(live(t)&&!t.done){t.dueDay=tk;if(t.date&&t.date<tk)t.fromDay=t.date}else t.dueDay=t.date||tk;delete t.ord;delete t.ordK});
 seen.forEach(function(t,i){t.ord=i;t.ordK='azi'});LS.set('ns_tasks',tasks)})();
function rollTasks(){var tk=dkey(),ch=false;tasks.forEach(function(t){if(live(t)&&!t.done&&t.dueDay<tk){if(!t.fromDay)t.fromDay=t.dueDay;t.dueDay=tk;ch=true}});
 if(ch){LS.set('ns_tasks',tasks);if(typeof hCur!=='undefined'&&hCur!==null)hCur=snap()}return ch}
(function(){var ch=false;tasks.forEach(function(t){if(t.urgent==null){t.urgent=false;ch=true}});if(ch)LS.set('ns_tasks',tasks)})();
rollTasks();
function alBtn(t){var nx=alNext(t);return '<button class="al'+(nx?' on':'')+'" aria-label="Alarmă"><i>⏰</i>'+(nx?'<small>'+alShort(nx)+'</small>':'')+'</button>'}
function renderItem(t,stHtml,alarm){var li=document.createElement('li');li.className='task'+(t.done?' done':'')+(t.urgent?' urgent':'');li.dataset.id=t.id;
 var al=alarm?alBtn(t):'';
 li.innerHTML='<span class="dot"></span><span class="t kw">'+esc(t.text)+'</span>'+(stHtml?'<span class="st">'+stHtml+'</span>':'')+al+'<button class="ed" aria-label="Editează">✎</button><button class="x" aria-label="Șterge">×</button>';return li}
function fillList(ul,list,emptyTxt,makeLi){ul.innerHTML=list.length?'':'<li class="empty">'+emptyTxt+'</li>';if(!list.length)return;
 list.filter(function(x){return x.urgent&&!isDoneItem(x)}).forEach(function(x){ul.appendChild(makeLi(x))});
 var sep=document.createElement('li');sep.className='jv-sep';sep.setAttribute('aria-hidden','true');sep.innerHTML='<span>URGENT ↑</span>';ul.appendChild(sep);
 list.filter(function(x){return !x.urgent&&!isDoneItem(x)}).forEach(function(x){ul.appendChild(makeLi(x))});
 list.filter(isDoneItem).forEach(function(x){ul.appendChild(makeLi(x))})}
function placeBeforeDone(arr,item,doneFn){var i=arr.indexOf(item);if(i>=0)arr.splice(i,1);
 if(doneFn(item)){arr.push(item);return}
 var at=-1;for(var j=0;j<arr.length;j++)if(doneFn(arr[j])){at=j;break}
 if(at<0)arr.push(item);else arr.splice(at,0,item)}
function bumpOpenOrd(t){var which=inList(t,'maine')?'maine':'azi',kU=which+':u',kN=which+':n';
 delete t.ord;delete t.ordK;
 var peers=listFor(which).filter(function(x){return !x.done&&x!==t}),uI=0,nI=0;
 peers.forEach(function(x){if(x.urgent){x.ord=uI++;x.ordK=kU}else{x.ord=nI++;x.ordK=kN}});
 if(t.urgent){t.ord=uI;t.ordK=kU}else{t.ord=nI;t.ordK=kN}}
function renderTasks(){
 [['lAzi','azi'],['lMaine','maine']].forEach(function(p){
  var ul=$(p[0]),list=listFor(p[1]);
  fillList(ul,list,'Niciun task.',function(t){return renderItem(t,'',true)})});updCardCount('azi');updCardCount('maine')}
function findT(id){for(var i=0;i<tasks.length;i++)if(tasks[i].id===id)return i;return -1}
function delTask(id){var i=findT(id);if(i<0)return;jvConfirm(function(){tasks[i].deleted=new Date().toISOString();save();renderTasks()})}
function addTask(txt,which){txt=(txt||'').trim();if(!txt)return false;txt=txt.charAt(0).toUpperCase()+txt.slice(1);
 tasks.push({id:Date.now()+'_'+Math.random().toString(36).slice(2,6),text:txt,date:dkey(),dueDay:which==='maine'?dayOff(1):dkey(),done:false,doneDate:null,urgent:false,created:new Date().toISOString()});save();renderTasks();return true}
['lAzi','lMaine'].forEach(function(id){var ul=$(id);
 ul.addEventListener('click',function(e){var li=e.target.closest('.task');if(!li||li.classList.contains('editing'))return;
  if(e.target.closest('.ed')){var i=findT(li.dataset.id);if(i>=0)startEdit(li,tasks[i],save,renderTasks);return}
  if(e.target.classList.contains('x')){delTask(li.dataset.id);return}
  if(e.target.closest('.al')){openAlarm({k:'t',id:li.dataset.id});return}
  if(dndEat())return
  var i=findT(li.dataset.id);if(i<0)return;var t=tasks[i];t.done=!t.done;t.doneDate=t.done?dkey():null;t.doneAt=t.done?new Date().toISOString():null;if(!t.done)bumpOpenOrd(t);save();renderTasks()});
 ul.addEventListener('contextmenu',function(e){if(e.target.closest('.task'))e.preventDefault()})});
$('fAdd').addEventListener('submit',function(e){e.preventDefault();if(addTask($('iTask').value,'azi')){$('iTask').value='';toast('Task adăugat pentru azi')}});
$('fAddM').addEventListener('submit',function(e){e.preventDefault();if(addTask($('iTaskM').value,'maine')){$('iTaskM').value='';toast('Task adăugat pentru mâine')}});

/* ---------- inline edit (tasks + shopping): keeps id/date/done, records editedAt ---------- */
var editing=null;
function startEdit(li,item,saveFn,rerender){if(editing&&editing!==li&&editing.isConnected)return;
 if(speaking)stopSpeaking();editing=li;li.classList.add('editing');var t=li.querySelector('.t');t.classList.remove('kw');
 t.innerHTML='<textarea class="edin" rows="1" enterkeyhint="done" aria-label="Editează textul"></textarea><span class="edb"><button type="button" class="btn eok" aria-label="Salvează">✓</button><button type="button" class="btn eno" aria-label="Anulează">✕</button></span>';
 var ta=t.querySelector('textarea');ta.value=item.text;
 function grow(){ta.style.height='auto';ta.style.height=ta.scrollHeight+'px'}
 function close(){editing=null;rerender()}
 function ok(e){if(e){e.preventDefault();e.stopPropagation()}var v=saveFn===saveNotes?ta.value.replace(/[ \t]+\n/g,'\n').trim():ta.value.replace(/\s+/g,' ').trim();
  if(!v){toast('Textul nu poate fi gol');ta.focus();return}
  if(v!==item.text){item.text=v;item.editedAt=new Date().toISOString();saveFn();toast('Salvat')}close()}
 function no(e){if(e){e.preventDefault();e.stopPropagation()}close()}
 ta.addEventListener('input',grow);
 ta.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){ok(e)}else if(e.key==='Escape'){no(e)}});
 t.querySelector('.eok').addEventListener('click',ok);t.querySelector('.eno').addEventListener('click',no);
 ['click','pointerdown'].forEach(function(ev){t.addEventListener(ev,function(e){e.stopPropagation()})});
 grow();ta.focus();try{ta.setSelectionRange(ta.value.length,ta.value.length)}catch(_){}}

/* ---------- shopping list (unbought items carry over forever; bought ones vanish after their day; hidden = kept in storage) ---------- */
var shop=LS.get('ns_shop',[]);
function saveShop(){LS.set('ns_shop',shop);histPush()}
function shopVisible(s){return !s.hidden&&(!s.bought||s.boughtDate===dkey())}
function shopList(){return shop.filter(shopVisible).sort(urgSort)}
(function(){var ch=false;shop.forEach(function(s){if(s.urgent==null){s.urgent=false;ch=true}});if(ch)LS.set('ns_shop',shop)})();
function renderShop(){renderShop0();updCardCount('shop')}
function renderShop0(){var ul=$('lShop'),list=shopList();
 fillList(ul,list,'Lista e goală.',function(s){var li=document.createElement('li');li.className='task'+(s.bought?' done':'')+(s.urgent?' urgent':'');li.dataset.id=s.id;
  li.innerHTML='<span class="dot"></span><span class="t kw">'+esc(s.text)+'</span>'+alBtn(s)+'<button class="ed" aria-label="Editează">✎</button><button class="x" aria-label="Ascunde">×</button>';return li})}
function findS(id){for(var i=0;i<shop.length;i++)if(shop[i].id===id)return shop[i];return null}
function hideShop(id){var s=findS(id);if(!s)return;jvConfirm(function(){s.hidden=new Date().toISOString();saveShop();renderShop()})}
function addShop(txt){txt=(txt||'').trim();if(!txt)return false;txt=txt.charAt(0).toUpperCase()+txt.slice(1);
 shop.push({id:Date.now()+'_'+Math.random().toString(36).slice(2,6),text:txt,date:dkey(),bought:false,boughtDate:null,urgent:false,created:new Date().toISOString()});saveShop();renderShop();return true}
(function(){var ul=$('lShop');
 ul.addEventListener('click',function(e){var li=e.target.closest('.task');if(!li||li.classList.contains('editing'))return;
  if(e.target.closest('.ed')){var s=findS(li.dataset.id);if(s)startEdit(li,s,saveShop,renderShop);return}
  if(e.target.classList.contains('x')){hideShop(li.dataset.id);return}
  if(e.target.closest('.al')){openAlarm({k:'s',id:li.dataset.id});return}
  if(dndEat())return
  var s=findS(li.dataset.id);if(!s)return;s.bought=!s.bought;s.boughtDate=s.bought?dkey():null;s.boughtAt=s.bought?new Date().toISOString():null;placeBeforeDone(shop,s,function(x){return x.bought});saveShop();renderShop()});
 ul.addEventListener('contextmenu',function(e){if(e.target.closest('.task'))e.preventDefault()})})();
$('fShop').addEventListener('submit',function(e){e.preventDefault();if(addShop($('iShop').value)){$('iShop').value='';toast('Produs adăugat')}});
$('bMicShop').onclick=function(){var i=$('iShop');i.focus();try{i.click()}catch(e){}};


/* ---------- custom tabs (list cards like Cumpărături; open items carry over, done ones vanish after their day; deleted tab/items = hidden, kept in storage) ---------- */
var tabs=LS.get('ns_tabs',[]),TCOL=['#3fd8ff','#4ade80','#facc15','#ffb547','#ff6b6b','#f472b6','#c084fc','#94a3b8'];
var MIC_SVG='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/></svg>';
var SPK_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
var TRASH_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>';
function uid(){return Date.now()+'_'+Math.random().toString(36).slice(2,6)}
function saveTabs(){LS.set('ns_tabs',tabs);histPush()}
function visTabs(){return tabs.filter(function(t){return !t.hidden})}
function findTab(id){for(var i=0;i<tabs.length;i++)if(tabs[i].id===id)return tabs[i];return null}
function findTI(tab,id){for(var i=0;i<tab.items.length;i++)if(tab.items[i].id===id)return tab.items[i];return null}
function tiVisible(x){return !x.hidden&&(!x.done||x.doneDate===dkey())}
function tabList(tab){return tab.items.filter(tiVisible).sort(urgAlpha)}
(function(){var ch=false;tabs.forEach(function(tab){(tab.items||[]).forEach(function(s){if(s.urgent==null){s.urgent=false;ch=true}})});if(ch)LS.set('ns_tabs',tabs)})();
var tabCol=LS.get('ns_tabcol',{});if(!tabCol||typeof tabCol!=='object')tabCol={}; /* v25: collapsed custom tabs (not in undo history) */
function tabOpenCount(tab){return tabList(tab).filter(function(x){return !x.done}).length}
function updTabCount(tab){var n=document.querySelector('#ct_'+tab.id+' .tcnt');if(n)n.textContent='· '+tabOpenCount(tab)}
function toggleTabCol(tab){var c=$('ct_'+tab.id);if(!c)return;var col=!c.classList.contains('col');c.classList.toggle('col',col);
 if(col)tabCol[tab.id]=1;else delete tabCol[tab.id];LS.set('ns_tabcol',tabCol);
 var b=c.querySelector('.tcol');if(b){b.setAttribute('aria-expanded',col?'false':'true');b.setAttribute('aria-label',col?'Extinde tabul':'Restrânge tabul')}updTabCount(tab)}
function renderTabItems(tab){var ul=document.querySelector('#ct_'+tab.id+' ul');if(!ul)return;updTabCount(tab);
 fillList(ul,tabList(tab),'Lista e goală.',function(s){return renderItem(s,'',true)})}
function renderTabs(){var box=$('customCards');if(!box)return;box.innerHTML='';
 visTabs().forEach(function(tab){var c=document.createElement('section');c.className='card ctab'+(tabCol[tab.id]?' col':'');c.id='ct_'+tab.id;c.dataset.tab=tab.id;
  if(tab.color)c.style.setProperty('--tc',tab.color);
  c.innerHTML='<div class="lbl"><span class="lt kw">'+esc(tab.name)+'</span><span class="tcnt" aria-hidden="true"></span><span class="hgrp"><button class="hb ren" aria-label="Redenumește tabul">✎</button><button class="hb del" aria-label="Șterge tabul">'+TRASH_SVG+'</button><button class="spk" data-read="tab:'+tab.id+'" aria-label="Citește">'+SPK_SVG+'</button><button type="button" class="hb tcol" aria-expanded="'+(tabCol[tab.id]?'false':'true')+'" aria-label="'+(tabCol[tab.id]?'Extinde tabul':'Restrânge tabul')+'"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4.2 8.1a1.5 1.5 0 0 1 2.1 0L12 13.8l5.7-5.7a1.5 1.5 0 1 1 2.1 2.1l-6.75 6.75a1.5 1.5 0 0 1-2.1 0L4.2 10.2a1.5 1.5 0 0 1 0-2.1z"/></svg></button></span></div><ul class="tasks ctl"></ul>'+
   '<form class="add"><input placeholder="Scrie un element" autocomplete="off" aria-label="Element nou"><button type="button" class="btn mic tmic" title="Scrie sau dictează cu tastatura" aria-label="Deschide tastatura">'+MIC_SVG+'</button><button class="btn" type="submit">Adaugă</button></form>';
  box.appendChild(c);renderTabItems(tab)});
 if(typeof updEq==='function')updEq()}
function hideTI(tab,id){var s=findTI(tab,id);if(!s)return;jvConfirm(function(){s.hidden=new Date().toISOString();saveTabs();renderTabItems(tab)})}
function addTI(tab,txt){txt=(txt||'').trim();if(!txt)return false;txt=txt.charAt(0).toUpperCase()+txt.slice(1);
 tab.items.push({id:uid(),text:txt,date:dkey(),done:false,doneDate:null,urgent:false,created:new Date().toISOString()});saveTabs();renderTabItems(tab);return true}
function delTab(tab){jvConfirm(function(){
 if(speaking&&speakKey==='tab:'+tab.id)stopSpeaking();tab.hidden=new Date().toISOString();saveTabs();renderTabs();toast('Tab șters')})}
(function(){var box=$('customCards');
 function ctx(e){var c=e.target.closest('.ctab');return c?findTab(c.dataset.tab):null}
 box.addEventListener('click',function(e){var tab=ctx(e);if(!tab)return;
  if(e.target.closest('.spk')){readCard('tab:'+tab.id);return}
  if(e.target.closest('.ren')){openTabModal(tab);return}
  if(e.target.closest('.del')){delTab(tab);return}
  if(e.target.closest('.lbl')){toggleTabCol(tab);return}
  if(e.target.closest('.tmic')){var i=e.target.closest('form').querySelector('input');i.focus();try{i.click()}catch(_){}return}
  var li=e.target.closest('.task');if(!li||li.classList.contains('editing')||!li.dataset.id)return;
  if(e.target.closest('.ed')){var s=findTI(tab,li.dataset.id);if(s)startEdit(li,s,saveTabs,function(){renderTabItems(tab)});return}
  if(e.target.classList.contains('x')){hideTI(tab,li.dataset.id);return}
  if(e.target.closest('.al')){openAlarm({k:'b',tab:tab.id,id:li.dataset.id});return}
  if(dndEat())return
  var s=findTI(tab,li.dataset.id);if(!s)return;s.done=!s.done;s.doneDate=s.done?dkey():null;s.doneAt=s.done?new Date().toISOString():null;placeBeforeDone(tab.items,s,function(x){return x.done});saveTabs();renderTabItems(tab)});
 box.addEventListener('submit',function(e){e.preventDefault();var tab=ctx(e);if(!tab)return;var i=e.target.querySelector('input');if(addTI(tab,i.value)){i.value='';toast('Adăugat în '+tab.name)}});
 box.addEventListener('contextmenu',function(e){if(e.target.closest('.task'))e.preventDefault()})})();
/* v27: collapsible built-in cards (Taskuri azi/mâine, Cumpărături, Știri); state in ns_cardcol, not in undo history */
var cardCol=LS.get('ns_cardcol',{});if(!cardCol||typeof cardCol!=='object')cardCol={};
function ccEl(k){return $({voice:'cVoice',wx:'cWx',azi:'cAzi',maine:'cMaine',shop:'cShop',news:'cNews'}[k])}
function cardCount(k){if(k==='azi'||k==='maine')return listFor(k).filter(function(t){return !t.done}).length;
 if(k==='shop')return shopList().filter(function(x){return !x.bought}).length;var n=0;document.querySelectorAll('#newsBody .news-item').forEach(function(a){if(a.style.display!=='none')n++});return n}
function updCardCount(k){var c=ccEl(k),n=c&&c.querySelector('.tcnt');if(n)n.textContent='· '+cardCount(k)}
function setCardCol(k,col){var c=ccEl(k);if(!c)return;c.classList.toggle('col',col);
 var b=c.querySelector('.tcol');if(b){b.setAttribute('aria-expanded',col?'false':'true');b.setAttribute('aria-label',col?'Extinde cardul':'Restrânge cardul')}}
['voice','wx','azi','maine','shop','news'].forEach(function(k){var c=ccEl(k);if(!c)return;setCardCol(k,!!cardCol[k]);
 c.querySelector('.lbl').addEventListener('click',function(e){if(e.target.closest('.spk,.nrf,.hb.ren,.hb.del'))return;
  var col=!c.classList.contains('col');setCardCol(k,col);if(col)cardCol[k]=1;else delete cardCol[k];LS.set('ns_cardcol',cardCol);updCardCount(k)})});
/* create / rename modal */
var tmTab=null,tmColor='';
function buildTabColors(){var row=$('tmColors');row.innerHTML='';
 [''].concat(TCOL).forEach(function(c){var b=document.createElement('button');b.type='button';b.className='sw'+(c?'':' none')+(c===tmColor?' sel':'');
  if(c)b.style.background=c;else b.textContent='—';b.setAttribute('aria-label',c?'Culoare '+c:'Fără culoare');b.dataset.c=c;
  b.onclick=function(){tmColor=c;buildTabColors()};row.appendChild(b)})}
function openTabModal(tab){tmTab=tab||null;tmColor=tab?(tab.color||''):'';$('tmTitle').textContent=tab?'Redenumește tabul':'Tab nou';$('tmSave').textContent=tab?'Salvează':'Creează';
 $('tmName').value=tab?tab.name:'';buildTabColors();$('tabModal').classList.add('show');setTimeout(function(){$('tmName').focus()},30)}
function closeTabModal(){$('tabModal').classList.remove('show');tmTab=null}
$('bNewTab').onclick=function(){openTabModal(null)};
$('tmCancel').onclick=closeTabModal;
$('tabModal').addEventListener('click',function(e){if(e.target===this)closeTabModal()});
$('tmName').addEventListener('keydown',function(e){if(e.key==='Escape')closeTabModal()});
$('tmForm').addEventListener('submit',function(e){e.preventDefault();var n=$('tmName').value.replace(/\s+/g,' ').trim();
 if(!n){toast('Numele tabului e obligatoriu');$('tmName').focus();return}
 if(tmTab){tmTab.name=n;tmTab.color=tmColor;tmTab.editedAt=new Date().toISOString();saveTabs();renderTabs();closeTabModal();toast('Tab redenumit');return}
 var t={id:uid(),name:n,color:tmColor,created:new Date().toISOString(),items:[]};tabs.push(t);saveTabs();renderTabs();closeTabModal();
 var c=$('ct_'+t.id);if(c){c.scrollIntoView({behavior:'smooth',block:'center'})}toast('Tab „'+n+'" creat')});

/* ---------- undo / redo: snapshot history of tasks + shopping + tabs (session only, max 50 steps) ---------- */
var HMAX=50,hUndo=[],hRedo=[],hCur=null;
function snap(){return JSON.stringify({tasks:tasks,shop:shop,tabs:tabs})}
function histBtns(){var u=$('bUndo'),r=$('bRedo');if(u)u.disabled=!hUndo.length;if(r)r.disabled=!hRedo.length}
function histPush(){if(hCur===null)return;var s=snap();if(s===hCur)return;hUndo.push(hCur);if(hUndo.length>HMAX)hUndo.shift();hRedo=[];hCur=s;histBtns()}
function histApply(s){var d=JSON.parse(s);if(speaking)stopSpeaking();editing=null;if($('tabModal').classList.contains('show'))closeTabModal();
 tasks=d.tasks;shop=d.shop;tabs=d.tabs;LS.set('ns_tasks',tasks);LS.set('ns_shop',shop);LS.set('ns_tabs',tabs);hCur=s;
 renderTasks();renderShop();renderTabs();histBtns()}
function undo(){if(!hUndo.length)return;hRedo.push(hCur);histApply(hUndo.pop());toast('Anulat')}
function redo(){if(!hRedo.length)return;hUndo.push(hCur);histApply(hRedo.pop());toast('Refăcut')}
$('bUndo').onclick=undo;$('bRedo').onclick=redo;
document.addEventListener('keydown',function(e){if(!(e.ctrlKey||e.metaKey)||e.altKey)return;var t=e.target,tag=t&&t.tagName;
 if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(t&&t.isContentEditable)||document.querySelector('.modal.show'))return;
 var k=e.key.toLowerCase();if(k==='z'&&!e.shiftKey){e.preventDefault();undo()}else if(k==='y'||(k==='z'&&e.shiftKey)){e.preventDefault();redo()}});
/* ---------- v14: drag & drop for list items (Pointer Events: touch + mouse; nothing new visible unless a drag is in progress)
   long-press ~480 ms arms the drag (haptic + lift); moving then = drag; holding still >= 900 ms and releasing = old delete/hide confirm;
   a move before arming cancels (page scrolls normally); short tap still toggles. Each drop = one undo step. ---------- */
var DND_ARM=480,DND_DEL=900,DND_SLOP=10,DND_EDGE=70;
var dnd=null,dndEatClick=false;
function dndEat(){if(dndEatClick){dndEatClick=false;return true}return false}
function dndListOf(ul){if(!ul)return null;
 if(ul.id==='lAzi')return{kind:'azi',key:'azi'};if(ul.id==='lMaine')return{kind:'maine',key:'maine'};if(ul.id==='lShop')return{kind:'shop',key:'shop'};
 var c=ul.closest&&ul.closest('.ctab');if(c&&ul.classList.contains('ctl')){var tb=findTab(c.dataset.tab);if(tb)return{kind:'tab',key:'tab:'+tb.id,tab:tb}}return null}
function dndUL(el){if(!el||!el.closest)return null;var ul=el.closest('#lAzi,#lMaine,#lShop,.ctab ul.ctl');if(ul)return ul;
 var c=el.closest('#cAzi,#cMaine,#cShop,.ctab');return c&&!c.classList.contains('col')?c.querySelector('#lAzi,#lMaine,#lShop,ul.ctl'):null}
function dndYest(){var y=new Date();y.setDate(y.getDate()-1);return dkey(y)}
function dndClasses(on){var r=document.documentElement;r.classList.toggle('jv-press',!!on);if(!on)r.classList.remove('jv-dragging')}
function dndReset(){if(!dnd)return;clearTimeout(dnd.armT);clearTimeout(dnd.delT);if(dnd.raf)cancelAnimationFrame(dnd.raf);
 if(dnd.li)dnd.li.classList.remove('jv-lift','jv-hide');if(dnd.ghost&&dnd.ghost.parentNode)dnd.ghost.parentNode.removeChild(dnd.ghost);
 if(dnd.ph&&dnd.ph.parentNode)dnd.ph.parentNode.removeChild(dnd.ph);if(dnd.over){dnd.over.classList.remove('jv-over');var c=dnd.over.closest('.card');if(c)c.classList.remove('jv-tgt')}
 dnd=null;dndClasses(false)}
function dndArm(){if(!dnd)return;if(editing&&editing.isConnected){dndReset();return}dnd.armed=true;if(navigator.vibrate)try{navigator.vibrate(15)}catch(_){}
 dnd.li.classList.add('jv-lift');dnd.delT=setTimeout(function(){if(dnd&&dnd.armed&&!dnd.drag&&navigator.vibrate)try{navigator.vibrate(30)}catch(_){}},DND_DEL-DND_ARM)}
function dndStart(){var d=dnd,li=d.li,r=li.getBoundingClientRect();d.drag=true;clearTimeout(d.delT);d.ox=d.sx-r.left+12;d.oy=d.sy-r.top;
 var g=document.createElement('ul');g.className=d.ul.className+(d.src.kind==='tab'?' ctab':'')+' jv-ghost';g.setAttribute('aria-hidden','true');
 var tc=getComputedStyle(d.ul).getPropertyValue('--tc');if(tc&&tc.trim())g.style.setProperty('--tc',tc.trim());
 g.style.width=(r.width+24)+'px';var c=li.cloneNode(true);c.classList.remove('jv-lift');g.appendChild(c);document.body.appendChild(g);d.ghost=g;
 var ph=document.createElement('li');ph.className='jv-ph';ph.style.height=r.height+'px';d.ph=ph;li.parentNode.insertBefore(ph,li);
 li.classList.remove('jv-lift');li.classList.add('jv-hide');document.documentElement.classList.add('jv-dragging');
 dndPlace();d.raf=requestAnimationFrame(dndTick)}
function dndNextSlot(n,skip){n=n.nextSibling;while(n&&(n===skip||!(n.classList&&((n.classList.contains('task')&&n.dataset.id)||n.classList.contains('jv-sep')))))n=n.nextSibling;return n}
function dndPlace(){var d=dnd;if(!d||!d.drag)return;d.ghost.style.transform='translate('+(d.x-d.ox)+'px,'+(d.y-d.oy)+'px) scale(1.03)';
 var ul=dndUL(document.elementFromPoint(d.x,d.y));if(!ul||!dndListOf(ul))return;
 if(d.over!==ul){if(d.over){d.over.classList.remove('jv-over');var oc=d.over.closest('.card');if(oc)oc.classList.remove('jv-tgt')}
  d.over=ul;ul.classList.add('jv-over');var nc=ul.closest('.card');if(nc)nc.classList.add('jv-tgt')}
 var before=null,ch=ul.children;
 for(var i=0;i<ch.length;i++){var n=ch[i];if(n===d.li||n===d.ph)continue;
  if(n.classList.contains('jv-sep')){var rs=n.getBoundingClientRect();if(d.y<rs.top+rs.height/2){before=n;break}continue}
  if(!n.classList.contains('task')||!n.dataset.id)continue;var r=n.getBoundingClientRect();if(d.y<r.top+r.height/2){before=n;break}}
 if(d.ph.parentNode===ul&&dndNextSlot(d.ph,d.li)===before)return;
 if(before)ul.insertBefore(d.ph,before);else ul.appendChild(d.ph)}
function dndTick(){var d=dnd;if(!d||!d.drag)return;var h=window.innerHeight,v=0;
 if(d.y<DND_EDGE)v=-Math.ceil((DND_EDGE-d.y)/4);else if(d.y>h-DND_EDGE)v=Math.ceil((d.y-(h-DND_EDGE))/4);
 if(v){var y0=window.scrollY;window.scrollBy(0,v);if(window.scrollY!==y0)dndPlace()}d.raf=requestAnimationFrame(dndTick)}
function dndObj(L,id){if(L.kind==='azi'||L.kind==='maine'){var i=findT(id);return i<0?null:tasks[i]}return L.kind==='shop'?findS(id):findTI(L.tab,id)}
function dndArr(L){return L.kind==='shop'?shop:L.kind==='tab'?L.tab.items:tasks}
function dndConv(o,toShop,date){var done=o.done!=null?!!o.done:!!o.bought,dd=done?(o.doneDate||o.boughtDate||dkey()):null,da=done?(o.doneAt||o.boughtAt||null):null,n={};
 for(var k in o)if(['done','doneDate','doneAt','bought','boughtDate','boughtAt','ord','ordK'].indexOf(k)<0)n[k]=o[k];
 n.date=date;if(toShop){n.bought=done;n.boughtDate=dd;n.boughtAt=da}else{n.done=done;n.doneDate=dd;n.doneAt=da}n.movedAt=new Date().toISOString();return n}
function dndApply(S,T,id,ids,urgMap){var o=dndObj(S,id);if(!o)return;var isT=function(L){return L.kind==='azi'||L.kind==='maine'},today=dkey();
 if(S.key===T.key){var cur=(isT(S)?listFor(S.kind):S.kind==='shop'?shopList():tabList(S.tab)).map(function(x){return x.id});
  if(cur.join('|')===ids.join('|')&&cur.every(function(x){var it=dndObj(S,x);return !!it.urgent===!!urgMap[x]}))return}
 var date=isT(T)?(isT(S)?o.date:(o.date||today)):(isT(S)?(o.fromDay||o.date||today):(o.date||today)),due=T.kind==='maine'?dayOff(1):today;
 if(isT(S)&&isT(T)){if(T.kind!==S.kind){o.dueDay=due;if(T.kind==='maine')delete o.fromDay}}
 else{var sa=dndArr(S),si=sa.indexOf(o);if(si<0)return;sa.splice(si,1);
  var n=(isT(S)===isT(T)&&(S.kind==='shop')===(T.kind==='shop'))?o:dndConv(o,T.kind==='shop',date);if(n===o){o.date=date;o.movedAt=new Date().toISOString()}
  if(isT(T)){n.dueDay=due;delete n.fromDay;if(T.kind==='azi'&&n.date<today)n.fromDay=n.date}else{delete n.dueDay;delete n.fromDay}
  var ta=dndArr(T);if(isT(T))ta.push(n);else{var p=ids.indexOf(id),at=-1,j;
   for(j=p+1;j<ids.length&&at<0;j++)at=ta.findIndex(function(x){return x.id===ids[j]});
   if(at<0){for(j=p-1;j>=0&&at<0;j--){at=ta.findIndex(function(x){return x.id===ids[j]});if(at>=0)at++}}
   if(at<0)ta.push(n);else ta.splice(at,0,n)}}
 if(isT(T)){var k=T.kind,uI=0,nI=0;ids.forEach(function(x){var t=tasks[findT(x)];if(!t)return;t.urgent=!!urgMap[x];if(t.urgent){t.ord=uI++;t.ordK=k+':u'}else{t.ord=nI++;t.ordK=k+':n'}})}
 else ids.forEach(function(x){var it=dndObj(T,x);if(it)it.urgent=!!urgMap[x]});
 LS.set('ns_tasks',tasks);LS.set('ns_shop',shop);LS.set('ns_tabs',tabs);histPush();
 [S,T].forEach(function(L){if(isT(L))renderTasks();else if(L.kind==='shop')renderShop();else renderTabItems(L.tab)})}
function dndDrop(){var d=dnd,ul=d.ph&&d.ph.parentNode,T=ul&&dndListOf(ul),id=d.li.dataset.id,ids=[],urgMap={},S=d.src,sec=true;
 if(ul)[].forEach.call(ul.children,function(n){if(n.classList&&n.classList.contains('jv-sep')){sec=false;return}
  if(n===d.ph){ids.push(id);urgMap[id]=sec}else if(n!==d.li&&n.classList.contains('task')&&n.dataset.id){ids.push(n.dataset.id);urgMap[n.dataset.id]=sec}});
 dndReset();if(T)dndApply(S,T,id,ids,urgMap)}
/* v42: long-press (~450 ms) opens an item menu (Alarmă / Editează / Mută / Șterge); replaces drag. Movement/scroll cancels. */
var lp=null,LP_MS=450,lpJust=false;
function lpUnsel(){try{var sl=window.getSelection();if(sl)sl.removeAllRanges()}catch(_){}}
function lpNoSel(e){var t=e.target;if(t.nodeType!==1)t=t.parentNode;if(!t||!t.closest||t.closest('input,textarea,[contenteditable]'))return;if(t.closest('.task,.lbl,#lpMenu,.note'))e.preventDefault()}
document.addEventListener('selectstart',lpNoSel);document.addEventListener('contextmenu',lpNoSel);
function lpCancel(){if(lp){clearTimeout(lp.t);lp=null}}
document.addEventListener('pointerdown',function(e){dndEatClick=false;lpJust=false;lpCancel();if(ndrag||Date.now()-ndragT<400)return;
 if(e.pointerType==='mouse'&&e.button!==0)return;
 var hd=e.target.closest&&e.target.closest('.ctab .lbl');if(hd&&!e.target.closest('.spk,.tcol')&&!document.querySelector('.modal.show')&&!$('lpMenu').classList.contains('show')){
  lp={id:e.pointerId,x:e.clientX,y:e.clientY,t:setTimeout(function(){lp=null;try{if(navigator.vibrate)navigator.vibrate(20)}catch(_){}lpJust=true;lpUnsel();lpTabOpen(hd)},LP_MS)};return}
 var np=e.target.closest&&e.target.closest('#noteTabs .ntab:not(.nadd1)');if(np){lp={id:e.pointerId,x:e.clientX,y:e.clientY,t:setTimeout(function(){lp=null;try{if(navigator.vibrate)navigator.vibrate(20)}catch(_){}lpJust=true;lpUnsel();lpNTOpen(np)},LP_MS)};return}
 var nl=e.target.closest&&e.target.closest('#notesList .note');if(nl&&!nl.classList.contains('editing')&&!e.target.closest('textarea,.edb')){
  lp={id:e.pointerId,x:e.clientX,y:e.clientY,t:setTimeout(function(){lp=null;try{if(navigator.vibrate)navigator.vibrate(20)}catch(_){}lpJust=true;lpUnsel();lpNoteOpen(nl)},LP_MS)};return}var li=e.target.closest&&e.target.closest('.task');
 if(!li||!li.dataset.id||li.classList.contains('editing')||e.target.closest('textarea,.edb'))return;
 var S=dndListOf(li.parentNode);if(!S||(editing&&editing.isConnected)||document.querySelector('.modal.show')||$('lpMenu').classList.contains('show'))return;
 lp={id:e.pointerId,li:li,S:S,x:e.clientX,y:e.clientY,t:setTimeout(function(){var d=lp;lp=null;if(!d)return;dndEatClick=true;try{if(navigator.vibrate)navigator.vibrate(20)}catch(_){}lpJust=true;lpUnsel();lpOpen(d.li,d.S)},LP_MS)}});
window.addEventListener('pointermove',function(e){if(lp&&e.pointerId===lp.id&&(Math.abs(e.clientX-lp.x)>10||Math.abs(e.clientY-lp.y)>10))lpCancel()});
window.addEventListener('pointerup',function(e){if(lp&&e.pointerId===lp.id)lpCancel()});
window.addEventListener('scroll',lpCancel,{passive:true});
window.addEventListener('pointercancel',lpCancel);
var lpCur=null;
function lpLists(){var a=[{kind:'azi',key:'azi',n:'Taskuri azi'},{kind:'maine',key:'maine',n:'Taskuri mâine'},{kind:'shop',key:'shop',n:'Cumpărături'}];
 tabs.forEach(function(tb){a.push({kind:'tab',key:'tab:'+tb.id,tab:tb,n:tb.name})});return a}
function lpIds(T){var ul=T.kind==='azi'?$('lAzi'):T.kind==='maine'?$('lMaine'):T.kind==='shop'?$('lShop'):document.querySelector('#ct_'+T.tab.id+' ul.ctl'),ids=[],u={},sec=true;
 if(ul)[].forEach.call(ul.children,function(n){if(n.classList.contains('jv-sep')){sec=false;return}if(n.classList.contains('task')&&n.dataset.id){ids.push(n.dataset.id);u[n.dataset.id]=sec}});return{ids:ids,u:u}}
function lpMove(T,urg){var c=lpCur;lpClose();if(!c)return;var o=dndObj(c.S,c.id);if(!o)return;var U=urg==null?!!o.urgent:urg,r=lpIds(T);
 if(T.key===c.S.key){r.u[c.id]=U}else{if(U)r.ids.unshift(c.id);else r.ids.push(c.id);r.u[c.id]=U}
 dndApply(c.S,T,c.id,r.ids,r.u);toast(urg==null?'Mutat în '+(T.n||''):(U?'Marcat urgent':'Marcat normal'))}
function lpOpen(li,S){var o=dndObj(S,li.dataset.id);if(!o)return;lpCur={li:li,S:S,id:li.dataset.id};var m=$('lpMenu'),box=$('lpBox');
 box.innerHTML='<button data-a="al">⏰ Alarmă</button><button data-a="ed">✎ Editează</button><button data-a="mv">↕ Mută</button><button data-a="x" class="dng">× Șterge</button>';
 m.classList.add('show');li.classList.add('jv-lpon');lpPos()}
function lpPos(){var c=lpCur;if(!c)return;var r=c.li.getBoundingClientRect(),box=$('lpBox'),h=box.offsetHeight,w=box.offsetWidth,vh=window.innerHeight;
 var top=r.bottom+6;if(top+h>vh-10)top=Math.max(10,r.top-h-6);box.style.top=top+'px';box.style.left=Math.max(12,Math.min(window.innerWidth-w-12,r.left+24))+'px'}
function lpMoveMenu(){var c=lpCur,o=dndObj(c.S,c.id),box=$('lpBox'),h='<div class="lph">Mută în</div>';
 lpLists().forEach(function(L,i){h+='<button data-mv="'+i+'"'+(L.key===c.S.key?' class="cur"':'')+'>'+esc(L.n)+(L.key===c.S.key?' ✓':'')+'</button>'});
 h+='<button data-a="urg">'+(o.urgent?'● Normal':'● Urgent')+'</button>';box.innerHTML=h;lpPos()}
function lpTabOpen(hd){lpCur={li:hd,tabHd:true};$('lpBox').innerHTML='<button data-a="ren">✎ Redenumește</button><button data-a="tdel" class="dng">🗑 Șterge tabul</button>';$('lpMenu').classList.add('show');hd.classList.add('jv-lpon');lpPos()}
function lpNTOpen(b){lpCur={li:b,nt:b.dataset.id};$('lpBox').innerHTML='<button data-a="ntren">✎ Redenumește</button><button data-a="ntmv">↔ Mută</button><button data-a="ntcol">🎨 Culoare</button><button data-a="ntdel" class="dng">🗑 Șterge tabul</button>';$('lpMenu').classList.add('show');b.classList.add('jv-lpon');lpPos()}
function lpNoteOpen(li){if((findN(li.dataset.id)||{}).del){lpCur={li:li,note:true};$('lpBox').innerHTML='<button data-a="nrest">↩ Reface</button><button data-a="npurge" class="dng">× Șterge definitiv</button>';$('lpMenu').classList.add('show');lpPos();return}lpCur={li:li,note:true};try{var _sn=findN(li.dataset.id);nShP=_sn&&!(_sn.lock&&!_sn._key)?nSharePrep(_sn):null}catch(_){nShP=null}$('lpBox').innerHTML='<button data-a="nal">⏰ Alarmă</button><button data-a="ned">✎ Editează</button><button data-a="nshr">📤 Trimite</button><button data-a="ndrag">✥ Mută (drag &amp; drop)</button><button data-a="nmv">↕ Mută în alt tab</button>'+((findN(li.dataset.id)||{}).lock?'<button data-a="nunl">🔓 Deblochează</button>':'<button data-a="nlock">🔒 Blochează</button>')+'<button data-a="ndel" class="dng">× Șterge</button>';$('lpMenu').classList.add('show');li.classList.add('jv-lpon');lpPos()}
function lpClose(){$('lpMenu').classList.remove('show');if(lpCur&&lpCur.li)lpCur.li.classList.remove('jv-lpon');lpCur=null}
$('lpMenu').addEventListener('click',function(e){if(lpJust){lpJust=false;return}var c=lpCur;if(!c){lpClose();return}var b=e.target.closest('button');if(!b){lpClose();return}
 if(b.dataset.mv!=null){var T=lpLists()[+b.dataset.mv];if(T.key===c.S.key){lpClose();return}lpMove(T);return}
 var a=b.dataset.a;
 if(b.dataset.ncl!=null){var cn3=edNote(true);lpClose();if(cn3){nHistPush&&saveNotes();if(b.dataset.ncl)cn3.color=b.dataset.ncl;else delete cn3.color;cn3.updatedAt=new Date().toISOString();nFlush();edState()}return}
 if(b.dataset.nmt!=null){var cn4=edNote(true);lpClose();if(cn4&&cn4.tab!==b.dataset.nmt){saveNotes();cn4.tab=b.dataset.nmt;if(!fullIsNew)nInsertAlpha(cn4);noteTab=cn4.tab;nFlush();renderNotes();toast('Mutat în '+findNT(cn4.tab).name)}return}
 if(b.dataset.isrt!=null){var cn2=chkNote();lpClose();if(cn2){if(b.dataset.isrt==='alpha')delete cn2.isort;else cn2.isort=b.dataset.isrt;cn2.updatedAt=new Date().toISOString();nFlush();if(cn2.type==='mix')mRender();else chkRender()}return}
 if(b.dataset.srt!=null){var tS=findNT(noteTab);lpClose();if(tS){if(b.dataset.srt==='manual')delete tS.sort;else tS.sort=b.dataset.srt;saveNotes();renderNotes()}return}
 if(b.dataset.ntc!=null){var tt=findNT(c.nt);lpClose();if(tt){tt.color=b.dataset.ntc==='#3fd8ff'?null:b.dataset.ntc;if(!tt.color)delete tt.color;saveNotes();renderNotes()}return}
 if(b.dataset.nt!=null){var nn=findN(c.li.dataset.id);lpClose();if(nn&&nn.tab!==b.dataset.nt){nn.tab=b.dataset.nt;nInsertAlpha(nn);saveNotes();renderNotes();toast('Mutat în '+findNT(b.dataset.nt).name)}return}
 if(a==='nmv'){var cur=(findN(c.li.dataset.id)||{}).tab,h='<div class="lph">Mută în</div>';noteTabs.forEach(function(t){h+='<button data-nt="'+t.id+'"'+(t.id===cur?' class="cur"':'')+'>'+esc(t.name)+(t.id===cur?' ✓':'')+'</button>'});$('lpBox').innerHTML=h;lpPos();return}
 if(a==='nlock'||a==='nunl'){var id5=c.li.dataset.id;lpClose();if(a==='nlock')lkLock(id5);else lkUnlock(id5);return}
 if(a==='ndrag'){var li2=c.li;lpClose();if(ntSortOf()!=='manual'){var tM=findNT(noteTab);if(tM)delete tM.sort;saveNotes();renderNotes();toast('Sortare: Manual');setTimeout(function(){var l3=document.querySelector('#notesList .note[data-id="'+li2.dataset.id+'"]');if(l3)ndArm(l3)},700)}else ndArm(li2);return}
 if(a==='nrest'||a==='npurge'){var id9=c.li.dataset.id;lpClose();if(a==='nrest')nRestore(id9);else nPurge(id9);return}if(a==='trash'){lpClose();nTrashOpen(true);return}if(a==='nal'){var id0=c.li.dataset.id;lpClose();openAlarm({k:'n',id:id0});return}
 if(a==='ntcol'){var ct=findNT(c.nt)||{},hh='<div class="lph">Culoare</div><div class="npal">';NT_COLORS.forEach(function(k){hh+='<button data-ntc="'+k[0]+'" class="'+((ct.color||'#3fd8ff')===k[0]?'cur':'')+'" style="--nc:'+k[0]+'" aria-label="'+k[1]+'"><i></i></button>'});$('lpBox').innerHTML=hh+'</div>';lpPos();return}
 if(a==='ntmv'){$('lpBox').innerHTML='<button data-a="ntl">← Mută la stânga</button><button data-a="ntr">Mută la dreapta →</button>';lpPos();return}
 if(a==='ntl'||a==='ntr'||a==='ntren'||a==='ntdel'){var tid=c.nt;lpClose();if(a==='ntl')ntShift(tid,-1);else if(a==='ntr')ntShift(tid,1);else if(a==='ntren')ntRename(tid);else ntDelete(tid);return}
 if(a==='nshr'){var sli=c.li;lpClose();nShare(sli.dataset.id);return}if(a==='ned'||a==='ndel'){var nli=c.li;lpClose();if(a==='ned')noteEdit(nli);else noteDel(nli.dataset.id);return}if(a==='ren'||a==='tdel'){var hd=c.li;lpClose();var hb=hd.querySelector(a==='ren'?'.hb.ren':'.hb.del');if(hb)hb.click();return}if(a==='mv'){lpMoveMenu();return}if(a==='urg'){var o=dndObj(c.S,c.id);lpMove(c.S,!(o&&o.urgent));return}
 var li=c.li;lpClose();var btn=li.querySelector(a==='al'?'.al':a==='ed'?'.ed':'.x');if(btn){dndEatClick=false;btn.click()}});
document.addEventListener('touchmove',function(e){if(dnd&&dnd.armed&&e.cancelable)e.preventDefault()},{passive:false});
['contextmenu','selectstart','dragstart'].forEach(function(ev){document.addEventListener(ev,function(e){if(dnd)e.preventDefault()})});
window.addEventListener('blur',dndReset);document.addEventListener('visibilitychange',function(){if(document.hidden)dndReset()});
/* ---------- speech output ---------- */
var speaking=false,listening=false,kGen=0,speakKey=null;
function updEq(){$('eq').classList.toggle('on',speaking||listening);$('orb').classList.toggle('active',speaking||listening);
 document.querySelectorAll('.spk').forEach(function(b){b.classList.toggle('on',speaking&&b.dataset.read===speakKey)});
 $('bRead').classList.toggle('on',speaking&&speakKey==='all');if($('nfRead')){var nr=speaking&&speakKey==='note';if(!nr&&!nrBusy&&nrMir&&nrMir.length)nrClear();$('nfRead').classList.toggle('on',nr);$('nfRead').textContent=nr?'🔊 Citește…':'Citește'}$('bReadAll').classList.toggle('on',speaking&&speakKey==='below')}
var actx=null,sources=[];
function unlockAudio(){try{if(!actx){var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;actx=new AC()}
 if(actx.state==='suspended')actx.resume();
 if(!unlockAudio.done){var b=actx.createBuffer(1,1,22050),s=actx.createBufferSource();s.buffer=b;s.connect(actx.destination);s.start(0);unlockAudio.done=1}}catch(e){}}
document.addEventListener('pointerdown',unlockAudio,true);
function curRate(){return cfg.rate!=null?+cfg.rate:1.25}

/* browser voices (fallback engine) */
var roVoice=null,autoMale=false,allVoices=[];
var MALE_RE=/\bmale\b|barbat|bărbat|masculin|emil|andrei|ion\b|ioan|mihai|alexandru|bogdan|adrian|marius/i;
function maleScore(v){var n=(v.name+' '+v.voiceURI).toLowerCase(),s=0;
 if(/female|femeie|feminin|ioana|alina|carmen|maria|elena|andreea|irina/.test(n))return -10;
 if(MALE_RE.test(n))s+=10;if(/-x-/.test(n))s+=2;if(!v.default)s+=1;if(/local/.test(n))s+=.5;return s}
function loadVoices(){if(!window.speechSynthesis)return;allVoices=speechSynthesis.getVoices()||[];
 var ro=allVoices.filter(function(v){return /^ro/i.test(v.lang)});roVoice=null;autoMale=false;
 if(cfg.voiceURI)roVoice=allVoices.filter(function(v){return v.voiceURI===cfg.voiceURI})[0]||null;
 if(!roVoice&&ro.length){roVoice=ro.slice().sort(function(a,b){return maleScore(b)-maleScore(a)})[0];autoMale=MALE_RE.test(roVoice.name+' '+roVoice.voiceURI)&&!/female/i.test(roVoice.name)}
 if($('modal').classList.contains('show'))fillVoiceSelect()}
function curPitch(){return cfg.pitch!=null?+cfg.pitch:(autoMale?1:.75)}
if(window.speechSynthesis){loadVoices();if(speechSynthesis.addEventListener)speechSynthesis.addEventListener('voiceschanged',loadVoices);else speechSynthesis.onvoiceschanged=loadVoices;setTimeout(loadVoices,500);setTimeout(loadVoices,2000)}

/* word weight ≈ how long it takes to say (used for timing inside a known-duration chunk) */
function spokenLen(w){var core=w.replace(/[^0-9a-zăâîșțşţáéíóúàèìòùäëïöü%]/gi,'');var n=0;
 core.replace(/\d+/g,function(d){n+=d.length*4.5+1;return ''}).replace(/%/g,function(){n+=6;return ''}).replace(/[a-zăâîșțşţáéíóúàèìòùäëïöü]/gi,function(){n+=1;return ''});
 return Math.max(1,n)}
function pauseW(w){return /[.!?…]$/.test(w)?5:/[,;:]$/.test(w)?3:0}
function wordMs(w,rate){return (110+52*spokenLen(w)+pauseW(w)*65)/rate}

/* --- Piper engine: sentence chunks, exact duration per chunk, words placed proportionally, driven by AudioContext clock --- */
function buildChunks(segs){var out=[];
 segs.forEach(function(seg){var n=seg.words.length,a=0;
  for(var i=0;i<n;i++){var w=seg.words[i].w,len=i-a+1;
   if(/[.!?;…]$/.test(w)||i===n-1||(len>=14&&/[,:]$/.test(w))||len>=22){
    var txt=seg.text.slice(seg.words[a].s,seg.words[i].e);if(!/[.!?…,;:]$/.test(txt))txt+='.';
    out.push({seg:seg,a:a,b:i+1,text:txt});a=i+1}}});
 return out}
function chunkTimes(ch,pcm,sr){var win=Math.max(1,Math.round(sr*.01)),n=Math.floor(pcm.length/win),en=new Float32Array(n),peak=0;
 for(var i=0;i<n;i++){var s=0;for(var j=i*win,e=j+win;j<e;j++)s+=pcm[j]*pcm[j];en[i]=Math.sqrt(s/win);if(en[i]>peak)peak=en[i]}
 var thr=peak*.08,f=0,l=n-1;while(f<n&&en[f]<thr)f++;while(l>f&&en[l]<thr)l--;
 var t0=f*win/sr,t1=(l+1)*win/sr;if(t1-t0<.1){t0=0;t1=pcm.length/sr}
 var ws=[],tot=0;for(var k=ch.a;k<ch.b;k++){var w=ch.seg.words[k].w,x=spokenLen(w)+1.5+(k<ch.b-1?pauseW(w):0);ws.push(x);tot+=x}
 var times=[],c=0;ws.forEach(function(x){times.push(t0+(t1-t0)*c/tot);c+=x});return times}
function waitUntil(t,gen){return new Promise(function(res){(function chk(){if(gen!==kGen||!actx||actx.currentTime>=t)res();else setTimeout(chk,40)})()})}
function selVoice(){return cfg.engine==='browser'?null:(TTS.voice(cfg.engine)||TTS.voice('mihai'))}
function speakNeural(segs,gen,v){
 var chunks=buildChunks(segs);if(!chunks.length)return Promise.resolve();
 unlockAudio();if(!actx)return Promise.reject(new Error('AudioContext indisponibil'));
 var rate=curRate(),tone=+cfg.tone||1,proms=[],timeline=[],cursor=0;
 var nat=rate,post=1;
 function get(i){if(!proms[i])proms[i]=TTS.synth(v.id,chunks[i].text,{speed:nat}).then(function(r){return {pcm:TTS.fx(r.pcm,r.sr,post,tone),sr:r.sr}});return proms[i]}
 function lat(){return (actx.outputLatency||0)+(actx.baseLatency||0)}
 (function anim(){if(gen!==kGen)return;var now=actx.currentTime-lat();
  for(var j=timeline.length-1;j>=0;j--){var e=timeline[j];if(now>=e.start){var rel=now-e.start,k=0;while(k+1<e.times.length&&rel>=e.times[k+1])k++;hl(e.c.seg,e.c.a+k);break}}
  requestAnimationFrame(anim)})();
 var i=0;
 function step(){if(gen!==kGen)return;if(i>=chunks.length)return waitUntil(cursor,gen);
  get(i);if(i+1<chunks.length)get(i+1);                       /* prefetch next chunk while this one plays */
  return get(i).then(function(r){if(gen!==kGen)return;
   var ch=chunks[i],buf=actx.createBuffer(1,r.pcm.length,r.sr);
   if(buf.copyToChannel)buf.copyToChannel(r.pcm,0);else buf.getChannelData(0).set(r.pcm);
   var src=actx.createBufferSource();src.buffer=buf;src.connect(actx.destination);
   var start=Math.max(actx.currentTime+.04,cursor);src.start(start);sources.push(src);
   var dur=r.pcm.length/r.sr;timeline.push({c:ch,start:start,times:chunkTimes(ch,r.pcm,r.sr)});
   var nextSame=chunks[i+1]&&chunks[i+1].seg===ch.seg;cursor=start+dur+(nextSame?0:.12);
   i++;return waitUntil(start,gen).then(step)})}
 return step()}

/* --- phone voice engine (speechSynthesis): boundary events or timer estimate --- */
function speakBrowserSeg(seg,gen){return new Promise(function(resolve){
 if(!window.speechSynthesis||gen!==kGen){resolve();return}
 var u=new SpeechSynthesisUtterance(seg.text);u.lang='ro-RO';if(roVoice){u.voice=roVoice;u.lang=roVoice.lang}
 var rate=curRate();u.rate=rate;u.pitch=curPitch();
 var got=false,started=false,done=false,timer=null,est=0;seg.words.forEach(function(w){est+=wordMs(w.w,rate)});
 function fin(){if(done)return;done=true;clearTimeout(timer);clearTimeout(safety);resolve()}
 function run(i){if(gen!==kGen||got||done||i>=seg.words.length)return;hl(seg,i);timer=setTimeout(function(){run(i+1)},wordMs(seg.words[i].w,rate))}
 function onStart(){if(started||gen!==kGen)return;started=true;hl(seg,0);setTimeout(function(){if(!got&&!done&&gen===kGen)run(Math.max(0,seg.cur))},700)}
 u.onstart=onStart;
 u.onboundary=function(e){if(gen!==kGen||(e.name&&e.name!=='word'))return;if(!got){got=true;clearTimeout(timer)}
  var ci=e.charIndex||0,k=0;while(k<seg.words.length-1&&ci>=seg.words[k].e)k++;hl(seg,k)};
 u.onend=u.onerror=fin;
 speechSynthesis.speak(u);
 setTimeout(function(){if(!started&&!done&&gen===kGen&&speechSynthesis.speaking)onStart()},1200);
 var safety=setTimeout(fin,est*2.5+8000)})}
function speakBrowser(segs,gen){
 if(!window.speechSynthesis){toast('Sinteza vocală nu e disponibilă');return Promise.resolve()}
 var p=Promise.resolve();segs.forEach(function(s){p=p.then(function(){if(gen===kGen)return speakBrowserSeg(s,gen)})});return p}

function stopSpeaking(){kGen++;sources.forEach(function(s){try{s.stop()}catch(e){}});sources=[];
 if(window.speechSynthesis)speechSynthesis.cancel();clearActive();speaking=false;speakKey=null;updEq()}
function speak(segs,key){
 stopSpeaking();var gen=++kGen;speaking=true;speakKey=key||null;updEq();unlockAudio();
 var v=selVoice(),e=v&&v.engine,useN=!!v&&TTS.state(e)==='ready';
 if(v&&!useN){ensureVoice().catch(function(){});
  toast(TTS.state(e)==='loading'?'Vocea '+v.short+' se pregătește ('+Math.round(TTS.progress(e)*100)+'%). Până atunci folosesc vocea telefonului.':'Vocea '+v.short+' nu e disponibilă. Folosesc vocea telefonului.')}
 setStatus(useN?'Vorbesc ('+v.short+')…':'Vorbesc…');
 var p=useN?speakNeural(segs,gen,v).catch(function(err){console.warn(err);if(gen!==kGen)return;
   setStatus('Eroare voce '+v.short+': '+(err&&err.message||err)+'. Folosesc vocea telefonului.',true);return speakBrowser(segs,gen)}):speakBrowser(segs,gen);
 function fin(){if(gen!==kGen)return;speaking=false;speakKey=null;updEq();clearActive();setStatus();if(!greetBusy)renderGreet(true)}
 return p.then(fin,fin)}

/* what each card says */
function segsVoice(){greetBusy=false;return [prepSeg($('greet'),greetFull())]}
function segsWx(){var s=[prepSeg(null,'Vremea în '+cfg.city+'.')];if(wx)s.push(prepSeg($('wxtxt'),wxSentence(wx)));else s.push(prepSeg(null,'Nu am date despre vreme.'));return s}
function segsUrg(open,getEl,emptyMsg){var s=[],urg=open.filter(function(x){return x.urgent}),norm=open.filter(function(x){return !x.urgent});
 if(!open.length){s.push(prepSeg(null,emptyMsg));return s}
 if(urg.length){s.push(prepSeg(null,'Urgent:'));urg.forEach(function(x){s.push(prepSeg(getEl(x),x.text))})}
 norm.forEach(function(x){s.push(prepSeg(getEl(x),x.text))});return s}
function segsTasks(which){var lt=which==='maine'?$('ltMaine'):$('ltAzi'),title=which==='maine'?'Taskuri pentru mâine':'Taskuri pentru azi',ul=which==='maine'?'lMaine':'lAzi';
 return [prepSeg(lt,title)].concat(segsUrg(listFor(which).filter(function(t){return !t.done}),function(t){return document.querySelector('#'+ul+' li[data-id="'+t.id+'"] .t')},'Niciun task deschis.'))}
function segsShop(){return [prepSeg($('ltShop'),'Cumpărături')].concat(segsUrg(shopList().filter(function(x){return !x.bought}),function(x){return document.querySelector('#lShop li[data-id="'+x.id+'"] .t')},'Lista de cumpărături e goală.'))}
function segsTab(tab){var c=$('ct_'+tab.id);return [prepSeg(c&&c.querySelector('.lt'),tab.name)].concat(segsUrg(tabList(tab).filter(function(x){return !x.done}),function(x){return document.querySelector('#ct_'+tab.id+' li[data-id="'+x.id+'"] .t')},'Lista e goală.'))}
function readCard(key){if(speaking&&speakKey===key){stopSpeaking();return}
 if(/^tab:/.test(key)){var tb=findTab(key.slice(4));if(!tb)return;return speak(segsTab(tb),key)}
 if(key==='below')return speak(segsTasks('azi').concat(segsTasks('maine'),segsShop(),[].concat.apply([],visTabs().map(segsTab))),key);
 var segs=key==='voice'?segsVoice():key==='wx'?segsWx():key==='azi'?segsTasks('azi'):key==='maine'?segsTasks('maine'):key==='shop'?segsShop():
  segsWx().concat(segsTasks('azi'),segsTasks('maine'),segsShop(),[].concat.apply([],visTabs().map(segsTab))); /* bottom Citește: weather + tasks only */
 return speak(segs,key)}
function say(text){greetBusy=true;clearTimeout(greetRestoreT);var seg=prepSeg($('greet'),text);
 return speak([seg],'voice').then(function(){greetRestoreT=setTimeout(function(){greetBusy=false;if(!speaking)renderGreet()},10000)})}
document.querySelectorAll('.spk').forEach(function(b){b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
 b.addEventListener('click',function(){readCard(b.dataset.read)})});
$('bRead').onclick=function(){readCard('all')};
$('bReadAll').querySelector('.rai').innerHTML=SPK_SVG;$('bReadAll').onclick=function(){readCard('below')};
function openVoice(){$('cVoice').classList.remove('col');$('voiceModal').classList.add('show')}function closeVoice(){$('voiceModal').classList.remove('show')}
$('cVoice').addEventListener('click',function(e){if(e.target.closest('.lbl')&&!e.target.closest('.spk,.vclose'))e.stopPropagation()},true);
$('voiceClose').addEventListener('click',function(e){e.stopPropagation();closeVoice()});$('voiceModal').addEventListener('click',function(e){if(e.target===this)closeVoice()});
$('bHi').onclick=function(){openVoice();if(speaking&&speakKey==='voice'){stopSpeaking();return}readCard('voice')};

/* ---------- neural voice download / init with progress in the voice card ---------- */
function showProg(frac,phase,v){var p=$('vprog');
 if(phase==='ready'||frac>=1){p.classList.remove('show');return}
 p.classList.add('show');var mb=TTS.sizeMB(v.engine);
 $('vprogTxt').textContent=phase==='init'?'Pregătesc vocea '+v.short+'…':'Descarc vocea '+v.short+'… '+Math.round(frac*100)+'% ('+Math.round(frac*mb)+'/'+mb+' MB)';
 $('vprogBar').style.width=Math.round(frac*100)+'%';if($('modal').classList.contains('show'))updVoiceRow()}
function ensureVoice(id){var v=TTS.voice(id||cfg.engine)||TTS.voice('mihai'),e=v.engine;
 if(TTS.state(e)==='ready'||TTS.state(e)==='loading')return TTS.init(e);
 return TTS.init(e,function(f,ph){showProg(f,ph,v)}).then(function(){showProg(1,'ready',v);if(!speaking){setStatus('Vocea '+v.short+' e gata (funcționează și offline).');setTimeout(function(){if(!speaking)setStatus()},4000)}updVoiceRow()},
  function(err){$('vprog').classList.remove('show');console.warn(err);if(!speaking)setStatus('Nu am putut încărca vocea '+v.short+' ('+(err&&err.message||err)+'). Folosesc vocea telefonului.',true);updVoiceRow();throw err})}
function bootVoice(){var v=selVoice();if(!v)return;
 TTS.isDownloaded(v.engine).then(function(have){var c=navigator.connection;
  if(have||(v.engine==='piper'&&!(c&&c.saveData)))ensureVoice().catch(function(){});
  else setStatus('Vocea '+v.short+' nu e descărcată: Setări → Descarcă.',true)})}

/* ---------- task input: just open the keyboard (dictate with the keyboard's own mic) ---------- */
$('bMic').onclick=function(){var i=$('iTask');i.focus();try{i.click()}catch(e){}};
$('bMicM').onclick=function(){var i=$('iTaskM');i.focus();try{i.click()}catch(e){}};

/* ---------- settings modal ---------- */
var pending=null,draft=null;
function fillVoiceSelect(){var sel=$('sVoice'),cur=sel.value||cfg.voiceURI||'';sel.innerHTML='';
 var o=document.createElement('option');o.value='';o.textContent='Automat'+(roVoice&&!cfg.voiceURI?' ('+roVoice.name+')':'');sel.appendChild(o);
 var ro=allVoices.filter(function(v){return /^ro/i.test(v.lang)}),rest=allVoices.filter(function(v){return !/^ro/i.test(v.lang)});
 function grp(label,list){if(!list.length)return;var g=document.createElement('optgroup');g.label=label;
  list.forEach(function(v){var op=document.createElement('option');op.value=v.voiceURI;op.textContent=v.name+' ('+v.lang+')'+(v.default?' ★':'');g.appendChild(op)});sel.appendChild(g)}
 grp('Română',ro);grp('Toate vocile',rest);sel.value=cur;if(sel.value!==cur)sel.value=''}
function fillEngineSelect(){var sel=$('sEngine');if(sel.options.length)return;
 TTS.VOICES.forEach(function(v){var o=document.createElement('option');o.value=v.id;o.textContent=v.label+' · ~'+TTS.sizeMB(v.engine)+' MB';sel.appendChild(o)});
 var o=document.createElement('option');o.value='browser';o.textContent='Vocea telefonului';sel.appendChild(o)}
var NOTES={piper:TTS.opaque?'Fișier deschis local: vocea poate fi descărcată la fiecare deschidere. Deschide linkul online ca să rămână salvată.':'Rapidă. Se descarcă o singură dată și merge offline.'};
function updVoiceRow(){var id=$('sEngine').value;if(id==='browser')return;var v=TTS.voice(id),e=v.engine,s=TTS.state(e),el=$('pState');
 $('pMB').textContent=TTS.sizeMB(e);$('pNote').textContent=NOTES[e];
 if(s==='ready'){el.textContent='✓ '+TTS.engineName(e)+' e descărcată și gata.';$('pDl').style.display='none';$('pDel').style.display=''}
 else if(s==='loading'){el.textContent='Se descarcă… '+Math.round(TTS.progress(e)*100)+'%';$('pDl').style.display='none';$('pDel').style.display='none'}
 else TTS.isDownloaded(e).then(function(h){if($('sEngine').value!==id)return;el.textContent=h?'Descărcată (se încarcă la nevoie).':(s==='error'?'Eroare la descărcare. Reîncearcă.':'Nedescărcată.');
  $('pDl').style.display='';$('pDl').textContent=h?'Încarcă':'Descarcă';$('pDel').style.display=h?'':'none'})}
function updEngineUI(){var b=$('sEngine').value==='browser';$('fVoice').style.display=b?'':'none';$('fPitch').style.display=b?'':'none';$('fPiper').style.display=b?'none':'';$('fTone').style.display=b?'none':''}
function showVals(){$('vRate').textContent=(+$('sRate').value).toFixed(2)+'×';$('vPitch').textContent=(+$('sPitch').value).toFixed(2);$('vSize').textContent=$('sSize').value+' px';$('vNewsSize').textContent=$('sNewsSize').value+'%';$('vTone').textContent=(+$('sTone').value).toFixed(2)+((+$('sTone').value)<.99?' (mai grav)':(+$('sTone').value)>1.01?' (mai subțire)':' (natural)')}
function buildFontGrid(){var g=$('fontGrid'),d=new Date(),t=pad(d.getHours())+'.'+pad(d.getMinutes());g.innerHTML='';
 FONTS.forEach(function(f){var b=document.createElement('button');b.type='button';b.className='fopt'+(draft.clockFont===f.id?' sel':'');
  b.innerHTML='<b style="font-family:'+esc(f.css)+';font-weight:'+f.w+';font-size:'+Math.round(26*f.k)+'px">'+t+'</b><span>'+esc(f.name)+'</span>';
  b.onclick=function(){draft.clockFont=f.id;applyClock(draft);g.querySelectorAll('.fopt').forEach(function(x){x.classList.remove('sel')});b.classList.add('sel')};g.appendChild(b)})}
var COLORS=['#3fd8ff','#4ade80','#f5b84a','#ff6b6b','#c084fc','#ffffff'];
function buildColors(){var r=$('colorRow');r.innerHTML='';
 COLORS.forEach(function(c){var b=document.createElement('button');b.type='button';b.className='sw'+(draft.clockColor.toLowerCase()===c?' sel':'');b.style.background=c;b.setAttribute('aria-label',c);
  b.onclick=function(){draft.clockColor=c;$('cPick').value=c;applyClock(draft);buildColors()};r.appendChild(b)});
 var p=document.createElement('input');p.type='color';p.id='cPick';p.value=draft.clockColor;p.oninput=function(){draft.clockColor=p.value;applyClock(draft);r.querySelectorAll('.sw').forEach(function(x){x.classList.remove('sel')})};r.appendChild(p)}
$('sRate').oninput=$('sPitch').oninput=$('sTone').oninput=showVals;
$('sSize').oninput=function(){showVals();draft.clockSize=+this.value;applyClock(draft)};
$('sNewsSize').oninput=function(){showVals();draft.newsSize=+this.value;applyNewsSize(draft.newsSize)};
$('sEngine').onchange=function(){updEngineUI();updVoiceRow()};
$('pDl').onclick=function(){ensureVoice($('sEngine').value).catch(function(){});setTimeout(updVoiceRow,50)};
$('pDel').onclick=function(){var v=TTS.voice($('sEngine').value);if(!v||!confirm('Ștergi vocea '+TTS.engineName(v.engine)+' descărcată? (se poate descărca din nou)'))return;TTS.remove(v.engine).then(function(){toast('Vocea a fost ștearsă');updVoiceRow()})};
$('sTest').onclick=function(){var old={engine:cfg.engine,rate:cfg.rate,pitch:cfg.pitch,voiceURI:cfg.voiceURI,tone:cfg.tone};
 cfg.tone=+$('sTone').value;cfg.engine=$('sEngine').value;cfg.rate=+$('sRate').value;cfg.pitch=+$('sPitch').value;cfg.voiceURI=$('sVoice').value||null;loadVoices();
 greetBusy=true;clearTimeout(greetRestoreT);var seg=prepSeg($('greet'),'Salut, '+($('sName').value.trim()||cfg.name)+'. Așa sună vocea mea acum.');
 speak([seg],'voice').then(function(){greetBusy=false});setTimeout(function(){Object.assign(cfg,old);loadVoices()},0)};
$('bSettings').onclick=function(){draft={clockFont:cfg.clockFont,clockColor:cfg.clockColor,clockSize:cfg.clockSize,newsSize:newsScale,newsCats:newsCats.slice()};
 $('sName').value=cfg.name;$('sCity').value=cfg.city;$('cityList').innerHTML='';pending=null;$('citySel').textContent='';
 fillEngineSelect();$('sEngine').value=cfg.engine;$('sTone').value=cfg.tone;loadVoices();fillVoiceSelect();$('sVoice').value=cfg.voiceURI||'';$('sRate').value=curRate();$('sPitch').value=curPitch();$('sSize').value=cfg.clockSize;$('sNewsSize').value=newsScale;buildNewsCats(draft.newsCats);
 $('sRemindUrg').checked=cfg.remindUrgent!==false;showVals();updEngineUI();updVoiceRow();buildFontGrid();buildColors();renderBkList();$('modal').classList.add('show')};
function closeModal(){applyClock(cfg);applyNewsSize(newsScale);renderNews(newsCats);$('modal').classList.remove('show')}
$('sCancel').onclick=closeModal;
$('modal').addEventListener('click',function(e){if(e.target===this)closeModal()});
function geocode(q){return fetch('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(q)+'&count=5&language=ro&format=json').then(function(r){return r.json()}).then(function(j){return j.results||[]})}
var gT=null;
function citySel(p,sub){pending=p;$('sCity').value=p.city;$('cityList').innerHTML='';$('citySel').textContent='✓ '+p.city+(sub?' · '+sub:'')+' — apasă Salvează'}
$('sCity').addEventListener('input',function(){pending=null;$('citySel').textContent='';clearTimeout(gT);var q=this.value.trim();if(q.length<2){$('cityList').innerHTML='';return}
 gT=setTimeout(function(){geocode(q).then(function(res){var cl=$('cityList');cl.innerHTML='';
  if(!res.length){cl.innerHTML='<div class="hint">Niciun rezultat.</div>';return}
  res.forEach(function(c){var b=document.createElement('button');b.type='button';b.className='btn';var sub=[c.admin1,c.country].filter(Boolean).join(', ');
   b.innerHTML='<b>'+esc(c.name)+'</b>'+(sub?'<small>'+esc(sub)+'</small>':'');
   b.onclick=function(){citySel({city:c.name,lat:c.latitude,lon:c.longitude,tz:c.timezone||'auto'},sub)};cl.appendChild(b)})}).catch(function(){$('cityList').innerHTML='<div class="hint">Fără internet: nu pot căuta orașul.</div>'})},400)});
$('sGeo').onclick=function(){if(!navigator.geolocation){toast('Locația nu e disponibilă pe acest dispozitiv');return}
 var b=this;b.disabled=true;$('citySel').textContent='Caut locația…';
 navigator.geolocation.getCurrentPosition(function(pos){var lat=+pos.coords.latitude.toFixed(4),lon=+pos.coords.longitude.toFixed(4);
  fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude='+lat+'&longitude='+lon+'&localityLanguage=ro').then(function(r){return r.json()}).catch(function(){return{}}).then(function(j){
   var nm=(j&&(j.city||j.locality))||'Locația mea',sub=[j&&j.principalSubdivision,j&&j.countryName].filter(Boolean).join(', ');
   b.disabled=false;citySel({city:nm,lat:lat,lon:lon,tz:'auto'},sub)})},
  function(){b.disabled=false;$('citySel').textContent='';toast('Nu am acces la locație (permisiune refuzată)')},{enableHighAccuracy:false,timeout:12000,maximumAge:600000})};
$('sSave').onclick=function(){var name=$('sName').value.trim()||cfg.name,city=$('sCity').value.trim();
 function done(){saveCfg();$('modal').classList.remove('show');applyClock();renderGreet(true);renderWx();loadWx();toast('Setări salvate');if(cfg.engine!=='browser')ensureVoice().catch(function(){})}
 cfg.name=name;cfg.engine=$('sEngine').value;cfg.tone=+$('sTone').value;cfg.voiceURI=$('sVoice').value||null;cfg.rate=+$('sRate').value;cfg.pitch=+$('sPitch').value;
 cfg.remindUrgent=!!$('sRemindUrg').checked;cfg.clockFont=draft.clockFont;cfg.clockColor=draft.clockColor;cfg.clockSize=draft.clockSize;newsScale=draft.newsSize||100;LS.set('ns_newssize',newsScale);applyNewsSize(newsScale);newsCats=draft.newsCats.slice();LS.set('ns_newscats',newsCats);renderNews(newsCats);loadVoices();
 if(pending){var chg=pending.lat!==cfg.lat||pending.lon!==cfg.lon||pending.city!==cfg.city;cfg.city=pending.city;cfg.lat=pending.lat;cfg.lon=pending.lon;cfg.tz=pending.tz;if(chg){wx=null;LS.set('ns_wx',null)}done()}
 else if(city&&city!==cfg.city){geocode(city).then(function(r){if(!r.length){toast('Orașul nu a fost găsit');return}
   cfg.city=r[0].name;cfg.lat=r[0].latitude;cfg.lon=r[0].longitude;cfg.tz=r[0].timezone||'auto';wx=null;LS.set('ns_wx',null);done()}).catch(function(){toast('Fără internet: nu pot căuta orașul')})}
 else done()};



/* ---------- urgent reminder (v36) ---------- */
function urgentAzi(){return listFor('azi').filter(function(t){return !t.done&&t.urgent})}
function maybeRemindUrgent(){
 if(cfg.remindUrgent===false||document.querySelector('.modal.show'))return;
 var u=urgentAzi();if(!u.length)return;
 var day=dkey();if(LS.get('ns_urgday',null)===day)return;LS.set('ns_urgday',day);
 var n=u.length,tit=u.slice(0,2).map(function(t){return t.text}).join(' · ');
 var msg=(n===1?'Ai 1 task urgent azi: ':'Ai '+n+' taskuri urgente azi: ')+tit+(n>2?'…':'');
 toast(msg);clearTimeout(toast._t);toast._t=setTimeout(function(){$('toast').classList.remove('show')},5500)}
document.addEventListener('visibilitychange',function(){if(!document.hidden)setTimeout(maybeRemindUrgent,600)});
window.addEventListener('focus',function(){setTimeout(maybeRemindUrgent,600)});
/* ---------- backups (v32) ---------- */
var BK_KEYS=['ns_notes','ns_notetabs','ns_notetab','ns_cfg','ns_tasks','ns_shop','ns_tabs','ns_tabcol','ns_cardcol','ns_newscats','ns_newssize'],BK_MAX=20;
var BK_CFG_DEF={name:BLANK?'':'Iosif',city:'Gherla',lat:47.03,lon:23.91,tz:'Europe/Bucharest',engine:'mihai',rate:1.25,pitch:null,voiceURI:null,tone:1,clockFont:'condensed',clockColor:'#3fd8ff',clockSize:56,remindUrgent:true};
function bkLabel(d){d=d||new Date();return d.getDate()+' '+LUNI_S[d.getMonth()]+' '+d.getFullYear()+' · '+pad(d.getHours())+':'+pad(d.getMinutes())}
function bkList(){var a=LS.get('ns_backups',[]);return Array.isArray(a)?a:[]}
function bkSaveList(a){LS.set('ns_backups',a)}
function bkCollect(){return{ns_cfg:JSON.parse(JSON.stringify(cfg)),ns_tasks:JSON.parse(JSON.stringify(tasks)),ns_shop:JSON.parse(JSON.stringify(shop)),ns_tabs:JSON.parse(JSON.stringify(tabs)),ns_tabcol:JSON.parse(JSON.stringify(tabCol||{})),ns_cardcol:JSON.parse(JSON.stringify(cardCol||{})),ns_newscats:(newsCats||[]).slice(),ns_newssize:newsScale,ns_notes:JSON.parse(JSON.stringify(notes.map(nStore))),ns_notetabs:JSON.parse(JSON.stringify(noteTabs)),ns_notetab:noteTab}}
function bkUid(){return Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8)}
function bkCreate(){var now=new Date(),entry={id:bkUid(),ts:now.toISOString(),label:bkLabel(now),data:bkCollect()};
 var a=bkList();a.unshift(entry);if(a.length>BK_MAX)a=a.slice(0,BK_MAX);bkSaveList(a);renderBkList();toast('Backup salvat · '+entry.label);return entry}
function bkFind(id){var a=bkList();for(var i=0;i<a.length;i++)if(a[i].id===id)return a[i];return null}
function bkDelete(id){var e=bkFind(id);if(!e)return;if(!confirm('Ștergi backup-ul din '+e.label+'?'))return;bkSaveList(bkList().filter(function(x){return x.id!==id}));renderBkList();toast('Backup șters')}
var bkPhTmp=null;function bkExportPayload(e){return{jarvisBackup:1,version:1,exportedAt:new Date().toISOString(),id:e.id,ts:e.ts,label:e.label,data:bkPhTmp?Object.assign({},e.data,{ns_photos:bkPhTmp}):e.data}}
function bkFilename(e){var t=(e.ts||'').replace(/[:.]/g,'-').slice(0,19)||'backup';return 'notis-backup-'+t+'.json'}
function bkShare(id){if(!bkFind(id))return;phDump().then(function(p){bkPhTmp=p;try{bkShare0(id)}finally{bkPhTmp=null}})}
function bkShare0(id){var e=bkFind(id);if(!e)return;var json=JSON.stringify(bkExportPayload(e),null,2),file=new File([json],bkFilename(e),{type:'application/json'});
 function dl(){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([json],{type:'application/json'}));a.download=bkFilename(e);document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},800);toast('Backup descărcat')}
 if(navigator.share){var p={title:'Backup Notis · '+e.label,text:'Backup Notis din '+e.label,files:[file]};
  if(!navigator.canShare||navigator.canShare(p))return navigator.share(p).then(function(){toast('Backup trimis')}).catch(function(err){if(err&&err.name==='AbortError')return;dl()})}
 dl()}
function bkParseImport(raw){var j=typeof raw==='string'?JSON.parse(raw):raw;if(!j||typeof j!=='object')throw new Error('invalid');
 var data=j.data;if(!data||typeof data!=='object'){if(j.ns_tasks!=null||j.ns_cfg!=null)data=j;else throw new Error('no data')}
 if(data.ns_photos){phLoad(data.ns_photos).then(function(c){if(c&&fullId)phRender()}).catch(function(e){console.warn(e)});data=Object.assign({},data);delete data.ns_photos}
 var ts=j.ts||j.exportedAt||new Date().toISOString(),label=j.label||bkLabel(new Date(ts));
 return{id:bkUid(),ts:ts,label:label+(j.jarvisBackup||j.data?'':' (import)'),data:data,importedAt:new Date().toISOString()}}
function bkImportFile(file){return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){try{res(bkParseImport(r.result))}catch(e){rej(e)}};r.onerror=function(){rej(r.error)};r.readAsText(file)})}
function bkApply(data){if(!data||typeof data!=='object')throw new Error('empty');
 if(speaking)stopSpeaking();editing=null;if($('tabModal').classList.contains('show'))closeTabModal();
 var next=Object.assign({},BK_CFG_DEF,data.ns_cfg&&typeof data.ns_cfg==='object'?data.ns_cfg:{});
 Object.keys(cfg).forEach(function(k){delete cfg[k]});Object.assign(cfg,next);
 if(cfg.engine==='piper'||!cfg.engine||(cfg.engine!=='browser'&&!TTS.voice(cfg.engine)))cfg.engine='mihai';
 if(cfg.tone==null)cfg.tone=1;LS.set('ns_cfg',cfg);
 tasks=Array.isArray(data.ns_tasks)?JSON.parse(JSON.stringify(data.ns_tasks)):[];
 shop=Array.isArray(data.ns_shop)?JSON.parse(JSON.stringify(data.ns_shop)):[];
 tabs=Array.isArray(data.ns_tabs)?JSON.parse(JSON.stringify(data.ns_tabs)):[];
 tabCol=data.ns_tabcol&&typeof data.ns_tabcol==='object'?JSON.parse(JSON.stringify(data.ns_tabcol)):{};
 cardCol=data.ns_cardcol&&typeof data.ns_cardcol==='object'?JSON.parse(JSON.stringify(data.ns_cardcol)):{};
 newsCats=Array.isArray(data.ns_newscats)?data.ns_newscats.slice():(BLANK?['general','ai']:['ai']);
 notes=Array.isArray(data.ns_notes)?JSON.parse(JSON.stringify(data.ns_notes)):[];noteTabs=Array.isArray(data.ns_notetabs)?JSON.parse(JSON.stringify(data.ns_notetabs)):null;noteTab=data.ns_notetab||null;ntMigrate();renderNotes();newsScale=+data.ns_newssize||100;if(!(newsScale>=80&&newsScale<=160))newsScale=100;
 LS.set('ns_tasks',tasks);LS.set('ns_shop',shop);LS.set('ns_tabs',tabs);LS.set('ns_tabcol',tabCol);LS.set('ns_cardcol',cardCol);LS.set('ns_newscats',newsCats);LS.set('ns_newssize',newsScale);
 hUndo=[];hRedo=[];hCur=snap();histBtns();
 applyClock();applyNewsSize(newsScale);renderGreet(true);renderTasks();renderShop();renderTabs();
 ['voice','wx','azi','maine','shop','news'].forEach(function(k){setCardCol(k,!!cardCol[k]);updCardCount(k)});
 renderNews(newsCats);loadVoices();
 if($('modal').classList.contains('show')){draft={clockFont:cfg.clockFont,clockColor:cfg.clockColor,clockSize:cfg.clockSize,newsSize:newsScale,newsCats:newsCats.slice()};
  $('sName').value=cfg.name;$('sCity').value=cfg.city;$('cityList').innerHTML='';pending=null;
  fillEngineSelect();$('sEngine').value=cfg.engine;$('sTone').value=cfg.tone;fillVoiceSelect();$('sVoice').value=cfg.voiceURI||'';$('sRate').value=curRate();$('sPitch').value=curPitch();$('sSize').value=cfg.clockSize;$('sNewsSize').value=newsScale;buildNewsCats(draft.newsCats);
  showVals();updEngineUI();updVoiceRow();buildFontGrid();buildColors()}
 if(!wx||wx.city!==cfg.city||(wx.lat!=null&&(wx.lat!==cfg.lat||wx.lon!==cfg.lon))){wx=null;LS.set('ns_wx',null);renderWx();loadWx()}else renderWx()}
function bkRestore(id){var e=bkFind(id);if(!e)return;if(!confirm('Se înlocuiește tot ce e acum în aplicație cu backup-ul din '+e.label+'?'))return;
 try{bkApply(e.data);toast('Restaurat · '+e.label)}catch(err){console.warn(err);toast('Nu am putut restaura backup-ul')}}
function renderBkList(){var box=$('bkList');if(!box)return;var a=bkList();
 if(!a.length){box.innerHTML='<div class="bkempty">Niciun backup încă.</div>';return}
 box.innerHTML='';a.forEach(function(e){var row=document.createElement('div');row.className='bkrow';row.dataset.id=e.id;
  var lbl=document.createElement('div');lbl.className='bklbl';lbl.textContent=e.label+(e.importedAt?' · importat':'');row.appendChild(lbl);
  var acts=document.createElement('div');acts.className='bkacts';
  [['Refă',function(){bkRestore(e.id)}],['Trimite',function(){bkShare(e.id)}],['Șterge',function(){bkDelete(e.id)}]].forEach(function(x){
   var b=document.createElement('button');b.type='button';b.className='btn';b.textContent=x[0];b.onclick=x[1];acts.appendChild(b)});
  row.appendChild(acts);box.appendChild(row)})}
$('bBkSave').onclick=function(){bkCreate()};
$('bBkImport').onclick=function(){$('bBkFile').value='';$('bBkFile').click()};
$('bBkFile').onchange=function(){var f=this.files&&this.files[0];if(!f)return;
 bkImportFile(f).then(function(entry){var a=bkList();a.unshift(entry);if(a.length>BK_MAX)a=a.slice(0,BK_MAX);bkSaveList(a);renderBkList();toast('Backup importat · '+entry.label);
  if(confirm('Backup importat ('+entry.label+'). Restaurezi acum?')){try{bkApply(entry.data);toast('Restaurat · '+entry.label)}catch(err){console.warn(err);toast('Nu am putut restaura backup-ul')}}
 }).catch(function(err){console.warn(err);toast('Fișier invalid — nu e un backup Notis sau Jarvis')})};

/* ---------- share ---------- */
function summary(){var d=new Date(),tk=dkey(),o=tasks.filter(function(t){return live(t)&&!t.done});
 var L=['JARVIS · '+ZILE[d.getDay()]+', '+d.getDate()+' '+LUNI[d.getMonth()]+' '+d.getFullYear()+' '+pad(d.getHours())+':'+pad(d.getMinutes()),'','Vremea · '+cfg.city+': '+wxSentence(wx),''];
 var az=listFor('azi').filter(function(t){return !t.done}),mn=listFor('maine').filter(function(t){return !t.done});
 if(az.length){L.push('Taskuri pentru azi:');az.forEach(function(t){L.push('• '+t.text+(t.fromDay&&t.fromDay<tk?' ('+shortDate(t.fromDay)+')':''))});L.push('')}
 if(mn.length){L.push('Taskuri pentru mâine:');mn.forEach(function(t){L.push('• '+t.text)})}
 if(!o.length)L.push('Nu ai taskuri deschise.');return L.join('\n')}
function copy(text){if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(text);
 return new Promise(function(res,rej){var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();
  try{document.execCommand('copy')?res():rej()}catch(e){rej(e)}document.body.removeChild(ta)})}
function blankURL(){return 'https://cluj1313.github.io/jarvis/blank.html'}
$('bShare').onclick=function(){var url=blankURL(),text='JARVIS Command Center – aplicația goală (fără date).\n\n👉 Deschide linkul: '+url+'\n\nDin link o poți instala pe telefon ca aplicație (meniu ⋮ → „Instalează aplicația” / „Adaugă pe ecranul de pornire”). Fișierul atașat e doar o copie de rezervă.';
 function shareLink(){if(navigator.share)return navigator.share({title:'JARVIS',text:text,url:url}).catch(function(e){if(e&&e.name!=='AbortError')return copyLink()});return copyLink()}
 function copyLink(){return copy(url).then(function(){toast('Link copiat: '+url)},function(){prompt('Copiază linkul:',url)})}
 if(!/^https?:/.test(location.protocol)){copyLink();return}
 fetch(url,{cache:'no-cache'}).then(function(r){if(!r.ok)throw 0;return r.blob()}).then(function(b){
  var f=new File([b],'jarvis.html',{type:'text/html'});
  if(navigator.canShare&&navigator.canShare({files:[f]}))return navigator.share({files:[f],title:'JARVIS',text:text}).catch(function(e){if(e&&e.name!=='AbortError')return shareLink()});
  return shareLink()}).catch(shareLink)};


/* ---------- PWA: service worker + install helper ---------- */
(function(){
 var standalone=function(){try{return matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: minimal-ui)').matches||navigator.standalone===true}catch(e){return false}};
 if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')&&!TTS.opaque)
  window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(function(reg){var up=function(){try{reg.update()}catch(_){}};up();document.addEventListener('visibilitychange',function(){if(!document.hidden)up()});setInterval(up,30*60*1000)}).catch(function(e){console.warn('SW',e)});var hadC=!!navigator.serviceWorker.controller,rl=false;navigator.serviceWorker.addEventListener('controllerchange',function(){if(!hadC){hadC=true;return}if(rl)return;rl=true;try{if(typeof nFlushAll==='function')nFlushAll()}catch(_){}location.reload()})});
 var deferred=null;
 function upd(){var f=$('fInstall');if(!f)return;f.style.display=standalone()?'none':'';
  $('sInstall').style.display=deferred?'':'none';$('installHint').style.display=deferred?'none':''}
 window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferred=e;upd();
  if(!standalone()&&!LS.get('ns_installTip',false)){LS.set('ns_installTip',true);setTimeout(function(){toast('Poți instala JARVIS ca aplicație: Setări → Instalează aplicația')},2500)}});
 window.addEventListener('appinstalled',function(){deferred=null;upd();toast('JARVIS a fost instalat')});
 $('sInstall').onclick=function(){if(!deferred){upd();return}var d=deferred;d.prompt();
  (d.userChoice||Promise.resolve()).then(function(){deferred=null;upd()})};
 $('bSettings').addEventListener('click',upd);upd();
})();
/* ---------- boot ---------- */
if(wx&&(wx.city!==cfg.city||(wx.lat!=null&&(wx.lat!==cfg.lat||wx.lon!==cfg.lon))))wx=null;
(function(){if(!TTS.opaque)return;var u='https://cluj1313.github.io/jarvis/'+(BLANK?'blank.html':''),n=$('offNote');if(!n)return;
 n.innerHTML='Pentru cea mai bună experiență deschide <a href="'+u+'" target="_blank" rel="noopener">'+u.replace('https://','')+'</a> (vocea rămâne salvată, merge și offline).';n.hidden=false})();

/* ---------- AI news (news.json from GitHub Actions; same-origin) ---------- */
var NEWS_CATS=[{id:'ai',name:'AI'},{id:'general',name:'Știri generale'},{id:'economie',name:'Economie'},{id:'tech',name:'Tehnologie'},{id:'sport',name:'Sport'},{id:'stiinta',name:'Științe / Sănătate'}];
var newsCats=LS.get('ns_newscats',null);if(!Array.isArray(newsCats))newsCats=BLANK?['general','ai']:['ai'];
var newsData=LS.get('ns_news',null);
function newsNorm(j){if(!j)return null;var cats=j.categories;
 if(!Array.isArray(cats)||!cats.length)cats=(j.sources&&j.sources.length)?[{id:'ai',name:'AI',sources:j.sources}]:[];
 return{updated:j.updated,categories:cats,stale:!!j.stale}}
newsData=newsNorm(newsData);
function newsRelTime(iso){if(!iso)return'';
 var t=Date.parse(iso);if(!isFinite(t))return'';
 var s=Math.max(0,Math.round((Date.now()-t)/1000));
 if(s<60)return'acum';if(s<3600)return Math.floor(s/60)+' min';if(s<86400)return Math.floor(s/3600)+' h';
 var d=Math.floor(s/86400);return d===1?'1 zi':d+' zile'}
function newsFmtUpdated(iso){var t=iso?new Date(iso):null;if(!t||!isFinite(t.getTime()))t=new Date();
 return 'Actualizat la '+pad(t.getHours())+':'+pad(t.getMinutes())}
/* v38: in-card news search (titles+snippets; not persisted) */
var newsQ='';
function newsFold(s){try{return String(s||'').toLocaleLowerCase('ro')}catch(e){return String(s||'').toLowerCase()}}
function applyNewsFilter(){var body=$('newsBody');if(!body)return;
 var q=newsFold(newsQ).trim();
 var prev=body.querySelector('.news-empty.ns-none');if(prev)prev.remove();
 var items=body.querySelectorAll('.news-item'),any=false;
 items.forEach(function(a){var tt=a.querySelector('.news-t'),ss=a.querySelector('.news-s');
  var hay=newsFold(((tt&&tt.textContent)||'')+' '+((ss&&ss.textContent)||''));
  var ok=!q||hay.indexOf(q)>=0;a.style.display=ok?'':'none';if(ok)any=true});
 body.querySelectorAll('.news-src').forEach(function(sec){var has=false;sec.querySelectorAll('.news-item').forEach(function(a){if(a.style.display!=='none')has=true});sec.style.display=has?'':'none'});
 body.querySelectorAll('.news-catblk').forEach(function(blk){var has=false;blk.querySelectorAll('.news-src').forEach(function(sec){if(sec.style.display!=='none')has=true});blk.style.display=has?'':'none'});
 if(q&&items.length&&!any){var e=document.createElement('div');e.className='news-empty ns-none';e.textContent='Niciun rezultat';body.appendChild(e)}
 updCardCount('news')}
function bindNewsSearch(){var inp=$('newsSearch'),clr=$('newsSearchClear');if(!inp||inp._nsBound)return;inp._nsBound=1;
 var web=$('newsWebSearch'),webTxt=$('newsWebSearchTxt');
 function webUrl(){return 'https://www.google.com/search?q='+encodeURIComponent(String(newsQ).trim())}
 function sync(){newsQ=inp.value||'';if(clr)clr.hidden=!String(newsQ).length;
  if(web){var q=String(newsQ).trim();web.hidden=!q;web.href=q?webUrl():'#';if(webTxt)webTxt.textContent=q?'Caută pe web: \u201E'+q+'\u201D':''}
  applyNewsFilter()}
 if(web)web.addEventListener('click',function(ev){ev.preventDefault();if(!String(newsQ).trim())return;window.open(webUrl(),'_blank','noopener')});
 inp.addEventListener('input',sync);
 if(clr)clr.addEventListener('click',function(ev){ev.preventDefault();inp.value='';inp.focus();sync()})}
function renderNews(sel){renderNews0(sel);updCardCount('news')}
function renderNews0(sel){sel=sel||newsCats;var card=$('cNews'),body=$('newsBody'),meta=$('newsMeta');if(!body)return;
 if(card)card.style.display=sel.length?'':'none';if(!sel.length)return;
 var cats=(newsData&&newsData.categories)||[];
 var show=NEWS_CATS.filter(function(c){return sel.indexOf(c.id)>=0}).map(function(c){var d=cats.filter(function(x){return x.id===c.id})[0];return{id:c.id,name:c.name,sources:(d&&d.sources)||[]}}).filter(function(c){return c.sources.length});
 if(!show.length){if(meta)meta.textContent=newsData?newsFmtUpdated(newsData.updated):'Fără știri încă';body.innerHTML='<div class="news-empty">'+(newsData?'Nu am încă știri pentru categoriile alese.':'Știrile apar aici când news.json e disponibil.')+'</div>';applyNewsFilter();return}
 if(meta)meta.textContent=newsFmtUpdated(newsData.updated)+(newsData.stale?' (offline)':'');
 body.innerHTML='';
 show.forEach(function(cat){var blk=document.createElement('div');blk.className='news-catblk';blk.dataset.cat=cat.id;
  var cl=document.createElement('div');cl.className='news-cat';cl.textContent=cat.name;blk.appendChild(cl);
  cat.sources.forEach(function(src){
   var sec=document.createElement('div');sec.className='news-src';
   var h=document.createElement('div');h.className='news-ch';h.textContent=(src.name||src.id||'Canal').toUpperCase();sec.appendChild(h);
   (src.items||[]).forEach(function(it){
    var a=document.createElement('a');a.className='news-item';a.href=it.url;a.target='_blank';a.rel='noopener noreferrer';
    var t=document.createElement('div');t.className='news-t';t.textContent=it.title||'';a.appendChild(t);
    if(it.snippet){var s=document.createElement('div');s.className='news-s';s.textContent=it.snippet;a.appendChild(s)}
    var w=newsRelTime(it.published);if(w){var m=document.createElement('div');m.className='news-when';m.textContent=w;a.appendChild(m)}
    sec.appendChild(a)});
   blk.appendChild(sec)});
  body.appendChild(blk)});applyNewsFilter()}
function buildNewsCats(sel){var box=$('newsCats');if(!box)return;box.innerHTML='';
 NEWS_CATS.forEach(function(c){var l=document.createElement('label');l.className='ncat'+(sel.indexOf(c.id)>=0?' on':'');
  var i=document.createElement('input');i.type='checkbox';i.value=c.id;i.checked=sel.indexOf(c.id)>=0;
  i.onchange=function(){var k=sel.indexOf(c.id);if(i.checked&&k<0)sel.push(c.id);if(!i.checked&&k>=0)sel.splice(k,1);l.classList.toggle('on',i.checked);renderNews(sel)};
  l.appendChild(i);l.appendChild(document.createTextNode(c.name));box.appendChild(l)})}
function loadNews(manual){return (manual&&navigator.onLine===false?Promise.reject(new Error('offline')):fetch('news.json?'+(manual?'fresh=':'t=')+Date.now(),{cache:'no-store'})).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()}).then(function(j){
  var n=newsNorm(j);if(!n||!n.categories.length)throw new Error('bad news.json');
  newsData=n;LS.set('ns_news',newsData);renderNews(draft&&$('modal').classList.contains('show')?draft.newsCats:newsCats)
 }).catch(function(){if(newsData){newsData.stale=true;renderNews()}else{renderNews()}if(manual)toast(navigator.onLine?'Nu am putut actualiza știrile':'Ești offline — nu pot actualiza știrile')})}
var newsBusy=false;
$('newsRefresh').onclick=function(){if(newsBusy)return;newsBusy=true;var b=this;b.classList.add('spin');
 var t0=Date.now();loadNews(true).then(function(){setTimeout(function(){b.classList.remove('spin');newsBusy=false},Math.max(0,500-(Date.now()-t0)))})};
bindNewsSearch();

renderTasks();renderShop();renderTabs();hCur=snap();histBtns();renderWx();renderNews();tick();setInterval(tick,1000);
setTimeout(maybeRemindUrgent,3200);


document.addEventListener('visibilitychange',function(){if(!document.hidden){if(!wx||Date.now()-wx.ts>15*60*1000)loadWx();loadNews()}});
bootVoice();

/* test/preview hooks */
window.JARVIS={readCard:readCard,stop:stopSpeaking,say:say,get speaking(){return speaking},get activeWord(){return activeSeg&&activeSeg.cur>=0?activeSeg.words[activeSeg.cur].w:null},
 get activeEl(){return activeSeg&&activeSeg.el?activeSeg.el.id||activeSeg.el.className:null},ensureVoice:ensureVoice,TTS:TTS};
var dm=location.hash.match(/demo-karaoke(?:=(\d+))?/);
if(dm)loadWx().then(function(){speaking=true;speakKey='wx';updEq();setStatus('Vorbesc (Mihai)…');var s=prepSeg($('wxtxt'),wxSentence(wx));setTimeout(function(){hl(s,+(dm[1]||6))},80)});
if(/demo-settings/.test(location.hash))setTimeout(function(){$('bSettings').click()},300);
/* ---------- v40: per-task alarms (t.alarm={at:ms,rep:min|0,until:ms|null,snz:ms|null}; stored in ns_tasks -> included in Backup) ---------- */
function alNext(t){var a=t&&t.alarm;if(!a||!a.at)return 0;return a.snz&&a.snz<a.at?a.snz:a.at}
function alShort(ms){var d=new Date(ms),n=new Date(),hm=pad(d.getHours())+':'+pad(d.getMinutes());return dkey(d)===dkey(n)?hm:d.getDate()+' '+LUNI_S[d.getMonth()]+' '+hm}
function alLocal(ms){var d=new Date(ms);return{d:dkey(d),t:pad(d.getHours())+':'+pad(d.getMinutes())}}
function alParse(d,t){if(!d||!t)return 0;var p=d.split('-'),q=t.split(':');return new Date(+p[0],+p[1]-1,+p[2],+q[0],+q[1],0,0).getTime()}
var alId=null,alRep=120;
function alGet(r){if(!r)return null;if(r.k==='t'){var i=findT(r.id);return i<0?null:tasks[i]}if(r.k==='s')return findS(r.id);if(r.k==='n')return findN(r.id);var tb=findTab(r.tab);return tb?findTI(tb,r.id):null}
function alPersist(r,quiet){if(r.k==='t'){quiet?LS.set('ns_tasks',tasks):save();renderTasks()}else if(r.k==='s'){quiet?LS.set('ns_shop',shop):saveShop();renderShop()}else if(r.k==='n'){saveNotes();renderNotes()}else{quiet?LS.set('ns_tabs',tabs):saveTabs();var tb=findTab(r.tab);if(tb)renderTabItems(tb)}}
function alAll(){var a=[];tasks.forEach(function(t){if(!t.deleted)a.push({r:{k:'t',id:t.id},o:t,off:t.done})});
 shop.forEach(function(s){if(!s.hidden)a.push({r:{k:'s',id:s.id},o:s,off:s.bought})});
 tabs.forEach(function(tb){(tb.items||[]).forEach(function(s){if(!s.hidden)a.push({r:{k:'b',tab:tb.id,id:s.id},o:s,off:s.done})})});
 if(typeof notes!=='undefined'&&notes)notes.forEach(function(n){if(!n.del)a.push({r:{k:'n',id:n.id},o:n,off:false})});return a}
function alChips(){var box=$('alChips');box.innerHTML='';[[30,'30 min'],[60,'1 oră'],[120,'2 ore'],[240,'4 ore'],[360,'6 ore'],[480,'8 ore'],[720,'12 ore'],[1440,'24 ore']].forEach(function(c){
 var b=document.createElement('button');b.type='button';b.className='alc'+(alRep===c[0]?' on':'');b.textContent=c[1];b.onclick=function(){alRep=c[0];$('alMin').value='';alChips()};box.appendChild(b)})}
function alType(rep){$('alT1').classList.toggle('on',!rep);$('alT2').classList.toggle('on',!!rep);$('alRepBox').style.display=rep?'':'none'}
function alEndUI(){$('alUntilBox').style.display=$('alEnd').value==='until'?'':'none'}
function openAlarm(r){var t=alGet(r);if(!t)return;var a=t.alarm||{};alId=r;$('alTask').textContent=t.lock?(t.ltitle||'Notiță blocată'):t.text;
 var at=a.at||(Date.now()+3600000-Date.now()%60000),L=alLocal(at);$('alDate').value=L.d;$('alTime').value=L.t;
 alRep=a.rep||120;var pre=[30,60,120,240,360,480,720,1440].indexOf(alRep)>=0;$('alMin').value=pre?'':alRep;alChips();alType(!!a.rep);
 $('alEnd').value=a.until?'until':'none';var U=alLocal(a.until||at+86400000);$('alUDate').value=U.d;$('alUTime').value=U.t;alEndUI();
 $('alDel').style.display=t.alarm?'':'none';$('alModal').classList.add('show')}
function closeAlarm(){$('alModal').classList.remove('show');alId=null}
function alSave(){var t=alGet(alId);if(!t)return closeAlarm();var at=alParse($('alDate').value,$('alTime').value);if(!at){toast('Alege data și ora');return}
 var rep=$('alT2').classList.contains('on')?(+$('alMin').value||alRep):0;if(rep&&rep<1){toast('Interval invalid');return}
 var until=rep&&$('alEnd').value==='until'?alParse($('alUDate').value,$('alUTime').value):null;
 if(rep&&at<Date.now())at=alRoll(at,rep);if(!rep&&at<Date.now()-30000){toast('Ora a trecut deja');return}
 t.alarm={at:at,rep:rep,until:until||null,snz:null};alPersist(alId);closeAlarm();toast('Alarmă setată · '+alShort(at));
 alPerm();alSchedule(t)}
function alRoll(at,rep){var now=Date.now(),st=rep*60000;if(at>now)return at;return at+Math.ceil((now-at+1)/st)*st}
function alPerm(){try{if(window.Notification&&Notification.permission==='default')Notification.requestPermission().catch(function(){})}catch(_){}}
function alSchedule(t){ /* Notification Triggers where supported (feature-detected) */
 try{if(!('showTrigger' in Notification.prototype)||typeof TimestampTrigger==='undefined'||Notification.permission!=='granted'||!navigator.serviceWorker)return;
  navigator.serviceWorker.ready.then(function(r){var nx=alNext(t);if(nx>Date.now())r.showNotification('⏰ JARVIS',{body:t.text,tag:'jv-al-'+t.id,showTrigger:new TimestampTrigger(nx),requireInteraction:true})})}catch(_){}}
function alDelete(){var t=alGet(alId);if(t){delete t.alarm;alPersist(alId);toast('Alarmă ștearsă')}closeAlarm()}
var alQueue=[],alCur=null,alBeepT=null;
function alBeep(on){clearInterval(alBeepT);alBeepT=null;if(!on)return;var one=function(){try{unlockAudio();if(!actx)return;var t0=actx.currentTime;[0,.25,.5].forEach(function(o){var g=actx.createGain(),os=actx.createOscillator();os.type='square';os.frequency.value=880;g.gain.setValueAtTime(.0001,t0+o);g.gain.exponentialRampToValueAtTime(.25,t0+o+.02);g.gain.exponentialRampToValueAtTime(.0001,t0+o+.18);os.connect(g);g.connect(actx.destination);os.start(t0+o);os.stop(t0+o+.2)})}catch(_){}
 try{if(navigator.vibrate)navigator.vibrate([400,200,400])}catch(_){}};one();alBeepT=setInterval(one,1500)}
function alShow(){if(alCur||!alQueue.length)return;alCur=alQueue.shift();$('alfTask').textContent=alCur.text;$('alFire').classList.add('show');alBeep(true)}
function alFire(t,r){if(t.lock)t={id:t.id,text:t.ltitle||'Notiță blocată'};alQueue.push({r:r,text:t.text});alShow();
 try{if(window.Notification&&Notification.permission==='granted'&&navigator.serviceWorker)navigator.serviceWorker.getRegistration().then(function(r){if(r)r.showNotification('⏰ JARVIS',{body:t.text,tag:'jv-al-'+t.id,renotify:true,requireInteraction:true,vibrate:[400,200,400],icon:'icons/icon-192.png'});else new Notification('⏰ JARVIS',{body:t.text})}).catch(function(){})}catch(_){}}
function alStop(snooze){alBeep(false);$('alFire').classList.remove('show');var c=alCur;alCur=null;
 if(c&&snooze){var t=alGet(c.r);if(t){if(!t.alarm)t.alarm={at:Date.now()+600000,rep:0,until:null};t.alarm.snz=Date.now()+600000;alPersist(c.r);alSchedule(t);toast('Amânat 10 min')}}
 setTimeout(alShow,300)}
function alCheck(){var now=Date.now(),chg=[];alAll().forEach(function(e){var t=e.o,a=t.alarm;if(!a||!a.at)return;
 var nx=alNext(t);if(nx>now)return;
 if(!e.off)alFire(t,e.r);chg.push(e.r);
 if(a.snz&&a.snz<=now){a.snz=null;if(a.at>now)return}
 if(a.rep){a.at=alRoll(a.at,a.rep);if(a.until&&a.at>a.until)delete t.alarm;else alSchedule(t)}else delete t.alarm});
 var ks={};chg.forEach(function(r){var key=r.k+(r.tab||'');if(!ks[key]){ks[key]=1;alPersist(r,true)}})}
function alInit(){$('alT1').onclick=function(){alType(false)};$('alT2').onclick=function(){alType(true)};$('alEnd').onchange=alEndUI;
 $('alMin').oninput=function(){if(+this.value>0){alRep=+this.value;alChips()}};
 $('alSave').onclick=alSave;$('alDel').onclick=alDelete;$('alCancel').onclick=closeAlarm;
 $('alOff').onclick=function(){alStop(false)};$('alSnz').onclick=function(){alStop(true)};
 alCheck();setInterval(alCheck,15000);document.addEventListener('visibilitychange',function(){if(!document.hidden)alCheck()});window.addEventListener('focus',alCheck)}
alInit();
var NT_COLORS=[['#3fd8ff','Cyan'],['#4ade80','Verde'],['#facc15','Galben'],['#fb923c','Portocaliu'],['#ff6b6b','Roșu'],['#f472b6','Roz'],['#a78bfa','Mov'],['#cbd5e1','Gri']];
/* v49: in-app confirm / prompt (replace browser dialogs) */
var jvDlgCb=null;
function jvConfirm(yes){$('cfOk').onclick=function(){jvClose('cfModal');yes()};$('cfNo').onclick=function(){jvClose('cfModal')};$('cfModal').classList.add('show')}
function jvClose(id){$(id).classList.remove('show')}
function jvPrompt(title,val,ok){$('prTitle').textContent=title;var i=$('prIn');i.value=val||'';$('prModal').classList.add('show');setTimeout(function(){try{i.focus();i.select()}catch(_){}},30);
 function done(){var v=i.value.trim();if(!v){i.focus();return}jvClose('prModal');ok(v)}
 $('prOk').onclick=done;$('prNo').onclick=function(){jvClose('prModal')};i.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();done()}}}
$('cfModal').addEventListener('click',function(e){if(e.target===this)jvClose('cfModal')});$('prModal').addEventListener('click',function(e){if(e.target===this)jvClose('prModal')});
/* ---------- v48: Notițe page with note tabs, one-line list, full-note editor, autosave ---------- */
var notes=LS.get('ns_notes',[]);if(!Array.isArray(notes))notes=[];
var noteTabs=LS.get('ns_notetabs',null),noteTab=LS.get('ns_notetab',null);
function nTitle0(n){if(n.type==='check'){var t=(n.title||'').trim();if(t)return t;var f=(n.items||[]).filter(function(x){return x.text.trim()})[0];return f?f.text.trim():''}return String(n.text||'').trim().split('\n')[0]}
function nFirst(n){if(n.lock)return n.ltitle||'';return String(n.text||'').trim().split('\n')[0]}
function nCmp(a,b){return nFirst(a).localeCompare(nFirst(b),'ro',{sensitivity:'base'})}
function nInsertAlpha(n){var i=notes.indexOf(n);if(i>=0)notes.splice(i,1);var at=-1,last=-1;
 for(var j=0;j<notes.length;j++){if(notes[j].tab!==n.tab)continue;last=j;if(at<0&&nCmp(n,notes[j])<0)at=j}
 if(at>=0)notes.splice(at,0,n);else if(last>=0)notes.splice(last+1,0,n);else notes.push(n)}
function nShift(id,d){var n=findN(id);if(!n)return;var i=notes.indexOf(n),j=i+d;while(j>=0&&j<notes.length&&(notes[j].tab!==n.tab||!notes[j].text.trim()))j+=d;
 if(j<0||j>=notes.length)return;notes[i]=notes[j];notes[j]=n;saveNotes();renderNotes()}
function ntUid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
function ntMigrate(){if(!Array.isArray(noteTabs)||!noteTabs.length)noteTabs=[{id:'general',name:'General'}];
 notes.forEach(function(n){if(!n.createdAt)n.createdAt=n.ts||new Date().toISOString();if(!n.updatedAt)n.updatedAt=n.editedAt||n.createdAt});
 notes.forEach(function(n){if(!n.tab||!noteTabs.some(function(t){return t.id===n.tab}))n.tab=noteTabs[0].id});
 if(!noteTabs.some(function(t){return t.id===noteTab}))noteTab=noteTabs[0].id;LS.set('ns_notes',notes);LS.set('ns_notetabs',noteTabs);LS.set('ns_notetab',noteTab)}
ntMigrate();
if(!LS.get('ns_notesort1',0)){notes.sort(nCmp);LS.set('ns_notes',notes);LS.set('ns_notesort1',1)} /* v52: one-time alphabetical sort */
function nStore(n){if(!n.lock)return n;var o={};['id','tab','ts','createdAt','updatedAt','editedAt','alarm','lock','ltitle','color','ph','isort'].forEach(function(k){if(n[k]!=null)o[k]=n[k]});o.text='';return o}
(function(){var lim=Date.now()-30*864e5,n0=notes.length;notes=notes.filter(function(n){return !n.del||new Date(n.del).getTime()>lim});if(notes.length!==n0)LS.set('ns_notes',notes)})();
var nTrash=false;
function saveNotes(soft){LS.set('ns_notes',notes.map(nStore));if(!soft&&typeof nHistPush==='function')nHistPush();LS.set('ns_notetabs',noteTabs);LS.set('ns_notetab',noteTab)}
function findN(id){for(var i=0;i<notes.length;i++)if(notes[i].id===id)return notes[i];return null}
function findNT(id){for(var i=0;i<noteTabs.length;i++)if(noteTabs[i].id===id)return noteTabs[i];return null}
function nDate(n){var d=new Date(n.ts);return d.getDate()+' '+LUNI_S[d.getMonth()]}
function setHTML(el,h){if(el.innerHTML!==h)el.innerHTML=h} /* v48: no rebuild when unchanged, so a tap that blurs the input still lands */
function renderNoteTabs(){var box=$('noteTabs');if(!box)return;var h='';
 noteTabs.forEach(function(t){h+='<button type="button" class="ntab'+(t.id===noteTab?' on':'')+'" data-id="'+esc(t.id)+'"'+(t.color?' style="--nc:'+esc(t.color)+'"':'')+'>'+esc(t.name)+'</button>'});
 setHTML(box,h+'<button type="button" class="ntab nadd1" aria-label="Tab nou">+</button>')}
function ntSortOf(id){var t=findNT(id||noteTab);return (t&&t.sort)||'manual'}
var nQ='';function nFold(x){return String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function nHay(n){if(n.lock)return nFold(n.ltitle||'');var t=[n.title||'',n.text||''];(n.items||[]).forEach(function(x){t.push(x.text||'')});(n.blocks||[]).forEach(function(b){if(b.t==='text')t.push(b.v||'');(b.items||[]).forEach(function(x){t.push(x.text||'')})});return nFold(t.join('\n'))}
function renderNotes(){renderNoteTabs();var ul=$('notesList');if(!ul)return;var q=nFold(nQ).trim(),srch=!!q;var list=notes.filter(function(n){return(srch||(nTrash?n.del:(!n.del&&n.tab===noteTab)))&&(n.lock||n.text.trim()||n.del)}),h='',m=ntSortOf();if(nTrash&&!srch){list.sort(function(a,b){return String(b.del).localeCompare(String(a.del))});m='trash';h='<li class="trbar"><span>🗑 Coș de gunoi · se golește după 30 de zile</span>'+(list.length?'<button type="button" class="btn pill" id="trEmpty">Golește</button>':'')+'<button type="button" class="hb" id="trX" aria-label="Închide coșul">×</button></li>'}
 if(srch){var qs=q.split(/\s+/);list=list.filter(function(n){var hy=nHay(n);return qs.every(function(w){return hy.indexOf(w)>=0})}).sort(nCmp);m='search'}
 if(m==='alpha')list=list.slice().sort(nCmp);else if(m==='created'||m==='updated'){var k=m==='created'?'createdAt':'updatedAt';list=list.slice().sort(function(a,b){return String(b[k]||'').localeCompare(String(a[k]||''))})}
 list.forEach(function(n){var pr='';if(n.type==='check'){var it=(n.items||[]).filter(function(x){return x.text.trim()});pr='☑ '+it.filter(function(x){return x.done}).length+'/'+it.length+' · '}else if(n.type==='mix'){var it2=[];(n.blocks||[]).forEach(function(b){if(b.t==='chk')it2=it2.concat((b.items||[]).filter(function(x){return x.text.trim()}))});if(it2.length)pr='☑ '+it2.filter(function(x){return x.done}).length+'/'+it2.length+' · '}
  if(n.lock)pr='';h+='<li class="note'+(n.lock&&!n.ltitle?' nlocked':'')+(n.color?' ncol':'')+(n.del?' ndel':'')+'" data-id="'+esc(n.id)+'"'+(n.color?' style="--nc:'+esc(ncT(n.color))+'"':'')+'><span class="t">'+(n.lock?esc(n.ltitle||'Notiță blocată'):srch?(nSnipHL(n.text.trim().split('\n')[0],q.split(/\s+/))||esc(n.text.trim().split('\n')[0])):esc(n.text.trim().split('\n')[0]))+'</span><small class="nts">'+(alNext(n)?'⏰ ':'')+(n.lock?'🔒 ':'')+pr+(n.del&&nTrash&&!srch?'șters '+nDateOf(n.del):nDate(n))+(srch&&n.del?' · <span class="nstab">🗑 Coș</span>':'')+(srch&&!n.del?(function(){var tb=findNT(n.tab);return tb?' · <span class="nstab"'+(tb.color?' style="--nc:'+esc(tb.color)+'"':'')+'>'+esc(tb.name)+'</span>':''})():'')+'</small>'+(srch&&!n.lock?nSnips(n,q):'')+'</li>'});
 setHTML(ul,h&&h.indexOf('class="note')>=0?h:(h||'')+'<li class="empty">'+(srch?'Niciun rezultat.':nTrash?'Coșul e gol.':'Nicio notiță.')+'</li>')}
function nDateOf(iso){try{var d=new Date(iso);return d.toLocaleDateString('ro-RO',{day:'numeric',month:'short'}).replace('.','')}catch(_){return ''}}
/* v21: search snippets — matching lines in context, matches underlined */
function nSnipHL(line,qs){var F=nHlFold(line),R=[];qs.forEach(function(w){var i=0;while((i=F.f.indexOf(w,i))>=0){R.push([F.map[i],F.map[i+w.length-1]+1]);i+=w.length}});if(!R.length)return null;
 R.sort(function(a,b){return a[0]-b[0]});var a0=Math.max(0,R[0][0]-40),cut=a0>0?line.lastIndexOf(' ',a0)+1||a0:0,end=Math.min(line.length,cut+150),h=cut>0?'…':'',last=cut;
 R.forEach(function(r){if(r[0]<last||r[1]>end)return;h+=esc(line.slice(last,r[0]))+'<span class="nhm">'+esc(line.slice(r[0],r[1]))+'</span>';last=r[1]});return h+esc(line.slice(last,end))+(end<line.length?'…':'')}
function nSnips(n,q){var qs=q.split(/\s+/).filter(Boolean),U=[],it=function(x){if((x.text||'').trim())U.push((x.done?'☑ ':'☐ ')+x.text.trim())},tl=function(v){String(v||'').split('\n').forEach(function(l){if(l.trim())U.push(l.trim())})};
 if(n.type==='mix')(n.blocks||[]).forEach(function(b){if(b.t==='text')tl(b.v);else if(b.t==='chk')(b.items||[]).forEach(it)});else if(n.type==='check'){tl(n.title);(n.items||[]).forEach(it)}else tl(n.text);
 var first=nTitle0(n).trim(),out=[];U.forEach(function(u,i){if(out.length>=3)return;if(i===0&&u===first)return;var h=nSnipHL(u,qs);if(h)out.push('<span class="nsl">'+h+'</span>')});
 return out.length?'<span class="nsnip">'+out.join('')+'</span>':''}
function nSearchOpen(){$('notesPg').classList.add('nsrch');var i=$('nSearchIn');i.value=nQ;i.focus()}
function nSearchClose(){nQ='';$('nSearchIn').value='';$('notesPg').classList.remove('nsrch');try{$('nSearchIn').blur()}catch(_){}renderNotes()}
$('nSearch').addEventListener('click',nSearchOpen);$('nSearchX').addEventListener('click',nSearchClose);
$('nSearchIn').addEventListener('input',function(){nQ=this.value;renderNotes()});$('nSearchIn').addEventListener('keydown',function(e){if(e.key==='Escape')nSearchClose();else if(e.key==='Enter'){e.preventDefault();this.blur()}});
var nSaveT=null;
function nSaveSoon(){clearTimeout(nSaveT);nSaveT=setTimeout(function(){nSaveT=null;saveNotes(true);var on=fullId&&findN(fullId);if(on&&on.lock&&on._key)lkReseal(on)},300)}
function nFlush(){clearTimeout(nSaveT);nSaveT=null;saveNotes();var on=fullId&&findN(fullId);if(on&&on.lock&&on._key)lkReseal(on)}
var draftId=null;
function draftInput(){var v=$('iNote').value,n=draftId&&findN(draftId);
 if(v.trim()){if(!n){n={id:ntUid(),text:v,ts:new Date().toISOString(),tab:noteTab};notes.push(n);draftId=n.id}else{n.text=v;n.editedAt=new Date().toISOString()}}
 else if(n){notes=notes.filter(function(x){return x!==n});draftId=null}
 nSaveSoon();renderNotes()}
function draftFinish(){if(!$('iNote')){draftId=null;return}var n=draftId&&findN(draftId);if(n){n.text=n.text.replace(/\s+$/,'');if(!n.text.trim())notes=notes.filter(function(x){return x!==n})}
 draftId=null;$('iNote').value='';noteGrow();nFlush();renderNotes()}
function noteGrow(){var i=$('iNote');if(!i)return;i.style.height='auto';i.style.height=i.scrollHeight+'px'}
/* v50: top input removed; new notes start from the + button in the full editor */
var fullId=null;
function fullOpen(id){if(draftId)draftFinish();var n=findN(id);if(!n)return;if(n.lock&&!n._key){lkOpen(id);return}$('noteFull').classList.toggle('nro',!!n.del);nHlClear();var hp=nHlPend&&nHlPend.id===id?nHlPend:null;nHlPend=null;if(hp)setTimeout(function(){if(fullId===id)nHlApply(hp.q)},250);fullId=id;fullIsNew=false;var ta=$('nfText');ta.value=n.text;mShow(n);$('noteFull').classList.toggle('chk',n.type==='check');phClear();if(n.type==='mix')mRender();edState();setTimeout(phRender,0);if(n.type==='check')chkRender();$('noteFull').classList.add('show');document.documentElement.classList.add('jv-nfull');try{history.pushState({jvNote:1},'')}catch(_){}}
function fullInput(){var n=fullId&&findN(fullId);if(!n){var v=$('nfText').value;if(!v.trim())return;var now=new Date().toISOString();n={id:ntUid(),text:v,ts:now,createdAt:now,updatedAt:now,tab:noteTab};notes.push(n);fullId=n.id;fullIsNew=true;nSaveSoon();return}if(n.type==='check'||n.type==='mix')return;n.text=$('nfText').value;n.editedAt=n.updatedAt=new Date().toISOString();nSaveSoon()}
function fullFlush(){if(!fullId)return;var n=findN(fullId);if(n){if(n.type==='check')chkSync(n);else if(n.type==='mix')mSync(n);else n.text=$('nfText').value;if(!n.text.trim()&&!n.ph)notes=notes.filter(function(x){return x!==n})}nFlush()}
var fullIsNew=false;
function fullNew(){var ta=$('nfText');ta.value='';$('noteFull').classList.remove('mix');ncApply(null);$('nfAlarm').classList.remove('on');phGen++;phClear();phFit();fullId=null;fullIsNew=false;$('noteFull').classList.remove('chk');$('noteFull').classList.add('show');document.documentElement.classList.add('jv-nfull');try{history.pushState({jvNote:1},'')}catch(_){}try{ta.focus()}catch(_){}}
$('noteFab').addEventListener('click',fullNew);
/* v57: separate undo/redo for Notițe (snapshots never hold more plaintext than storage; ciphertext comes from a cache) */
var nLockCache={},nH={u:[],r:[],cur:null},NH_MAX=60;
function nSnap(){notes.forEach(function(n){if(n.lock)nLockCache[n.id]=n.lock});return JSON.stringify({notes:notes.map(nStore),tabs:noteTabs,tab:noteTab},function(k,v){return k==='iv'||k==='ct'||k==='salt'?undefined:v})}
function nHistPush(){if(nH.cur===null)return;var s=nSnap();if(s===nH.cur)return;nH.u.push(nH.cur);if(nH.u.length>NH_MAX)nH.u.shift();nH.r=[];nH.cur=s;nHistBtns()}
function nHistReset(){nH.u=[];nH.r=[];nH.cur=nSnap();nHistBtns()}
function nHistBtns(){['nUndo','nfUndo'].forEach(function(i){var b=$(i);if(b)b.disabled=!nH.u.length});['nRedo','nfRedo'].forEach(function(i){var b=$(i);if(b)b.disabled=!nH.r.length})}
function nHistApply(s){var d=JSON.parse(s);d.notes.forEach(function(n){if(n.lock){var live=findN(n.id);n.lock=(live&&live.lock)||nLockCache[n.id];if(!n.lock){delete n.lock}}});
 var openId=fullId;notes=d.notes;noteTabs=d.tabs;noteTab=d.tab;LS.set('ns_notes',notes.map(nStore));LS.set('ns_notetabs',noteTabs);LS.set('ns_notetab',noteTab);
 if(openId){var n=findN(openId);if(!n){fullId=null;fullIsNew=false;$('noteFull').classList.remove('show');document.documentElement.classList.remove('jv-nfull');if(history.state&&history.state.jvNote)try{nIgnorePop=true;history.back()}catch(_){nIgnorePop=false}}
  else{mShow(n);$('noteFull').classList.toggle('chk',n.type==='check');if(n.type==='check')chkRender();else if(n.type==='mix')mRender();else $('nfText').value=n.text;edState()}}
 renderNotes();nHistBtns()}
function nStep(dir){var on=fullId&&findN(fullId);if(on&&on.lock){toast('Nu se poate într-o notiță blocată');return}
 if(nSaveT){clearTimeout(nSaveT);nSaveT=null}if(on){if(on.type==='check')chkSync(on);else on.text=$('nfText').value}saveNotes();
 var from=dir<0?nH.u:nH.r,to=dir<0?nH.r:nH.u;if(!from.length)return;to.push(nH.cur);nH.cur=from.pop();nHistApply(nH.cur);toast(dir<0?'Anulat':'Refăcut')}
['nUndo','nfUndo'].forEach(function(i){$(i).addEventListener('click',function(){nStep(-1)})});['nRedo','nfRedo'].forEach(function(i){$(i).addEventListener('click',function(){nStep(1)})});
/* v55: per-note PIN lock (PBKDF2-SHA256 150k -> AES-GCM); plaintext never stored for locked notes */
function b64e(u){var s='';u=new Uint8Array(u);for(var i=0;i<u.length;i++)s+=String.fromCharCode(u[i]);return btoa(s)}
function b64d(s){var b=atob(s),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
function lkDerive(pin,salt){var c=crypto.subtle;return c.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveKey']).then(function(k){return c.deriveKey({name:'PBKDF2',salt:salt,iterations:150000,hash:'SHA-256'},k,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])})}
function lkPayload(n){return JSON.stringify({type:n.type||null,text:n.text||'',title:n.title||'',items:n.items||null,blocks:n.blocks||null})}
function lkEnc(key,salt,n){var iv=crypto.getRandomValues(new Uint8Array(12));return crypto.subtle.encrypt({name:'AES-GCM',iv:iv},key,new TextEncoder().encode(lkPayload(n))).then(function(ct){return{v:1,salt:b64e(salt),iv:b64e(iv),ct:b64e(ct)}})}
function lkDec(key,lock){return crypto.subtle.decrypt({name:'AES-GCM',iv:b64d(lock.iv)},key,b64d(lock.ct)).then(function(b){return JSON.parse(new TextDecoder().decode(b))})}
function lkApply(n,o){if(o.type)n.type=o.type;else delete n.type;n.text=o.text||'';if(o.title)n.title=o.title;else delete n.title;if(o.items)n.items=o.items;else delete n.items;if(o.blocks)n.blocks=o.blocks;else delete n.blocks}
function lkStrip(n){delete n._key;delete n.title;delete n.items;delete n.blocks;delete n.type;n.text='';renderNotes()}
function lkReseal(n){var key=n._key;if(!key||!n.lock)return Promise.resolve();n.ltitle=nTitle0(n);return lkEnc(key,b64d(n.lock.salt),n).then(function(l){n.lock=l;saveNotes(true);nLockCache[n.id]=l})}
var pinSt=null;
function pinShow(o){pinSt=o;$('pinTitle').textContent=o.title;$('pinWarn').style.display=o.warn?'':'none';$('pinMsg').textContent=o.msg||'';var i=$('pinIn');i.value='';pinDots();$('pinModal').classList.add('show');setTimeout(function(){try{i.focus()}catch(_){}},50)}
function pinDots(){var v=$('pinIn').value;[].forEach.call($('pinDots').children,function(d,k){d.classList.toggle('on',k<v.length)})}
function pinHide(){$('pinModal').classList.remove('show');pinSt=null;try{$('pinIn').blur()}catch(_){}}
function pinErr(m){$('pinMsg').textContent=m;var b=$('pinBox');b.classList.remove('shake');void b.offsetWidth;b.classList.add('shake');try{if(navigator.vibrate)navigator.vibrate(120)}catch(_){}$('pinIn').value='';pinDots()}
$('pinIn').addEventListener('input',function(){this.value=this.value.replace(/\D/g,'').slice(0,4);pinDots();if(this.value.length===4&&pinSt&&!pinSt.busy){var o=pinSt,v=this.value;o.busy=true;$('pinMsg').textContent='…';Promise.resolve(o.done(v)).then(function(r){o.busy=false;if(r===true){if(pinSt===o)pinHide()}else if(pinSt===o)pinErr(r||'PIN greșit')},function(){o.busy=false;if(pinSt===o)pinErr('PIN greșit')})}});
$('pinDots').addEventListener('click',function(){try{$('pinIn').focus()}catch(_){}});
$('pinCancel').addEventListener('click',pinHide);$('pinModal').addEventListener('click',function(e){if(e.target===this)pinHide()});
function lkLock(id){var n=findN(id);if(!n||n.lock)return;if(!window.crypto||!crypto.subtle){toast('Criptarea nu e disponibilă aici');return}
 function step1(msg){pinShow({title:'Alege un PIN de 4 cifre',warn:true,msg:msg,done:function(p1){setTimeout(function(){step2(p1)},0);return true}})}
 function step2(p1){pinShow({title:'Confirmă PIN-ul',warn:true,done:function(p2){if(p2!==p1){setTimeout(function(){step1('PIN-urile nu se potrivesc')},0);return true}
  var salt=crypto.getRandomValues(new Uint8Array(16));var tt=nTitle0(n);var lkK=null;return lkDerive(p2,salt).then(function(k){lkK=k;return lkEnc(k,salt,n)}).then(function(l){var kk=l;return phLockAll(n.id,lkK).then(function(){return kk})}).then(function(l){n.lock=l;n.ltitle=tt;nHistReset();lkStrip(n);saveNotes();toast('Notiță blocată');return true})}})}
 step1()}
function lkTry(n,pin){return lkDerive(pin,b64d(n.lock.salt)).then(function(k){return lkDec(k,n.lock).then(function(o){return{k:k,o:o}})}).catch(function(){return null})}
/* share a note: text + photos via Web Share */
function nShareText(o){var L=[],it=function(x){if((x.text||'').trim())L.push((x.done?'☑ ':'☐ ')+x.text.trim())};
 if(o.type==='mix')(o.blocks||[]).forEach(function(b){if(b.t==='text'){if((b.v||'').trim())L.push(b.v.replace(/\s+$/,''))}else if(b.t==='chk')mOrder(o,b).forEach(it)});
 else if(o.type==='check'){if((o.title||'').trim())L.push(o.title.trim());chkOrder(o).forEach(it)}
 else if((o.text||'').trim())L.push(o.text.replace(/\s+$/,''));
 return L.join('\n')}
/* payload is prepared ahead (menu open) so navigator.share runs synchronously inside the tap; photos re-encoded small and split in batches */
var nShP=null,SH_MAXN=10,SH_MAXB=8e6;
function nShSmall(b,i){return (window.createImageBitmap?createImageBitmap(b):Promise.reject()).catch(function(){return new Promise(function(ok,no){var u=URL.createObjectURL(b),im=new Image();im.onload=function(){ok(im);setTimeout(function(){URL.revokeObjectURL(u)},0)};im.onerror=function(){URL.revokeObjectURL(u);no()};im.src=u})}).then(function(src){
 var w=src.width||src.naturalWidth,h=src.height||src.naturalHeight,k=Math.min(1,1280/Math.max(w,h)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*k));c.height=Math.max(1,Math.round(h*k));c.getContext('2d').drawImage(src,0,0,c.width,c.height);try{src.close&&src.close()}catch(_){}
 return new Promise(function(r){c.toBlob(function(x){r(x&&x.size<b.size?x:b)},'image/jpeg',0.75)})}).catch(function(){return b}).then(function(x){return new File([x],'notis-'+(i+1)+'.jpg',{type:'image/jpeg'})})}
function nSharePrep(o){var txt=nShareText(o),P={id:o.id,txt:txt,files:null,batches:[],ready:false};
 var ord=o.type==='mix'?[].concat.apply([],(o.blocks||[]).filter(function(b){return b.t==='img'}).map(function(b){return b.ph||[]})):null;
 P.p=phOf(o.id).then(function(a){if(ord)a=a.filter(function(r){return ord.indexOf(r.id)>=0}).sort(function(x,y){return ord.indexOf(x.id)-ord.indexOf(y.id)});
  return a.reduce(function(q,r,i){return q.then(function(acc){return phBlob(o,r).then(function(b){return nShSmall(b,i)},function(){return null}).then(function(f){if(f)acc.push(f);return acc})})},Promise.resolve([]))},function(){return[]}).then(function(fs){
  P.files=fs||[];var cur=[],sz=0;P.files.forEach(function(f){if(cur.length&&(cur.length>=SH_MAXN||sz+f.size>SH_MAXB)){P.batches.push(cur);cur=[];sz=0}cur.push(f);sz+=f.size});if(cur.length)P.batches.push(cur);P.ready=true;return P});
 return P}
function nCopySync(txt){var ok=false;try{var t=document.createElement('textarea');t.value=txt;t.setAttribute('readonly','');t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();ok=document.execCommand('copy');t.remove()}catch(_){}
 if(!ok)try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).catch(function(){});ok=true}}catch(_){}toast(ok?'Copiat':'Nu am putut copia')}
/* in-app sheet with several choices; always closes on any tap */
function nShSheet(msg,opts){var m=$('shModal');if(!m){m=document.createElement('div');m.id='shModal';m.className='modal';m.style.zIndex='90';document.body.appendChild(m)}
 m.innerHTML='<div class="card jvdlg"><div class="cftxt">'+esc(msg)+'</div><div class="shcol"></div></div>';var col=m.querySelector('.shcol');
 opts.concat([{t:'Renunță',f:null}]).forEach(function(o){var b=document.createElement('button');b.type='button';b.className='btn'+(o.f?'':' shno');b.textContent=o.t;b.onclick=function(){m.classList.remove('show');m.innerHTML='';if(o.f)try{o.f()}catch(e){console.warn(e);toast('Telefonul a refuzat trimiterea')}};col.appendChild(b)});
 m.onclick=function(e){if(e.target===m){m.classList.remove('show');m.innerHTML=''}};m.classList.add('show')}
function nShRange(P,bi){var a=0;for(var k=0;k<bi;k++)a+=P.batches[k].length;return (a+1)+'–'+(a+P.batches[bi].length)}
function nShSend(d,ok,bad){var t=setTimeout(function(){t=null},60000);
 try{navigator.share(d).then(function(){if(t)clearTimeout(t);ok&&ok()},function(e){if(t)clearTimeout(t);if(e&&e.name==='AbortError')return;console.warn(e);toast('Telefonul a refuzat trimiterea'+(e&&e.name&&e.name!=='Error'?' ('+e.name+')':''));bad&&bad(e)})}catch(e){console.warn(e);toast('Telefonul a refuzat trimiterea');bad&&bad(e)}}
function nShBatch(P,bi){var fs=P.batches[bi],withTxt=bi===0&&P.txt,d={files:fs};if(withTxt)d.text=P.txt;
 var can=true;try{can=!navigator.canShare||navigator.canShare(d)}catch(_){can=false}
 if(!can){toast('Telefonul a refuzat trimiterea pozelor');return nShMenu(P,bi)}
 nShSend(d,function(){if(bi+1<P.batches.length)nShMenu(P,bi+1)},function(){nShMenu(P,bi)})}
function nShMenu(P,bi){var o=[{t:'📤 Trimite pozele '+nShRange(P,bi)+' din '+P.files.length+(bi===0&&P.txt?' + text':''),f:function(){nShBatch(P,bi)}}];
 if(P.txt)o.push({t:'Doar text',f:function(){nShSend({text:P.txt},null,function(){nCopySync(P.txt)})}});
 nShSheet(P.files.length>SH_MAXN&&bi===0?'Notița are '+P.files.length+' poze — le trimit pe rând, câte '+SH_MAXN+'.':'Trimite notița',o)}
function nShareNow(P){var txt=P.txt;if(!P.ready){if(txt&&navigator.share){nShSend({text:txt},null,function(){nCopySync(txt)});return}toast('Pregătesc pozele…');return}
 if(!txt&&!P.files.length){toast('Notița e goală');return}
 if(!navigator.share){if(txt)nCopySync(txt);else toast('Telefonul nu poate trimite');return}
 if(!P.files.length){nShSend({text:txt},null,function(){nCopySync(txt)});return}
 if(P.batches.length===1)return nShBatch(P,0);
 nShMenu(P,0)}
function nShareAsk(P){nShMenu(P,0)}
function nShare(id){var n=findN(id);if(!n)return;
 if(n.lock&&!n._key){pinShow({title:'Introdu PIN-ul',done:function(pin){return lkTry(n,pin).then(function(r){if(!r)return 'PIN greșit';var o={id:n.id,_key:r.k,isort:n.isort,createdAt:n.createdAt,ts:n.ts};lkApply(o,r.o);var P=nSharePrep(o);P.p.then(function(){setTimeout(function(){if(P.files.length)nShMenu(P,0);else if(P.txt)nShSheet('Trimite notița',[{t:'📤 Trimite',f:function(){nShSend({text:P.txt},null,function(){nCopySync(P.txt)})}}]);else toast('Notița e goală')},0)});return true})}});return}
 var P=nShP&&nShP.id===id?nShP:null;if(!P||P.txt!==nShareText(n))P=nSharePrep(n);nShareNow(P)}
function lkOpen(id){var n=findN(id);if(!n||!n.lock)return;pinShow({title:'Introdu PIN-ul',done:function(pin){return lkTry(n,pin).then(function(r){if(!r)return 'PIN greșit';lkApply(n,r.o);n._key=r.k;setTimeout(function(){fullOpen(id)},0);return true})}})}
function lkUnlock(id){var n=findN(id);if(!n||!n.lock)return;pinShow({title:'Introdu PIN-ul',done:function(pin){return lkTry(n,pin).then(function(r){if(!r)return 'PIN greșit';phUnlockAll(n.id,r.k).catch(function(e){console.warn(e)});lkApply(n,r.o);delete n.lock;delete n._key;delete n.ltitle;nHistReset();saveNotes();renderNotes();toast('Notiță deblocată');return true})}})}
/* v54: checklist notes */
function chkSync(n){n.text=[(n.title||'').trim()].concat((n.items||[]).map(function(x){return x.text.trim()})).filter(Boolean).join('\n')}
function ciNew(done){var now=new Date().toISOString();return{id:ntUid(),text:'',done:!!done,createdAt:now,updatedAt:now}}
function ciSort(n,list){var m=n.isort||'alpha',base=n.createdAt||n.ts||'';list=list.slice();var idx={};(n.items||[]).forEach(function(x,i){idx[x.id]=i});
 function ca(x){return x.createdAt||base}function ua(x){return x.updatedAt||x.createdAt||base}
 return list.sort(function(a,b){var ea=!a.text.trim(),eb=!b.text.trim();if(ea!==eb)return ea?1:-1;
  var r=0;if(m==='alpha')r=a.text.trim().localeCompare(b.text.trim(),'ro',{sensitivity:'base'});else if(m==='created')r=String(ca(b)).localeCompare(String(ca(a)));else if(m==='updated')r=String(ua(b)).localeCompare(String(ua(a)));
  return r||idx[a.id]-idx[b.id]})}
function chkOrder(n){var a=n.items||[];return ciSort(n,a.filter(function(x){return !x.done})).concat(ciSort(n,a.filter(function(x){return x.done})))}
function chkTouch(n){n.updatedAt=n.editedAt=new Date().toISOString();chkSync(n);nSaveSoon()}
function chkNote(){return fullId&&findN(fullId)}
function chkRow(x){return '<div class="ci'+(x.done?' done':'')+'" data-id="'+x.id+'"><input type="checkbox"'+(x.done?' checked':'')+' aria-label="Bifează"><textarea class="cit" enterkeyhint="next" autocomplete="off" data-lpignore="true" data-1p-ignore="true" data-form-type="other" rows="1" wrap="off">'+esc(x.text)+'</textarea><button type="button" class="cix" aria-label="Șterge rândul">×</button></div>'}
function chkRender(focusId,atEnd){var n=chkNote();if(!n)return;$('nfTitle').value=n.title||'';var a=n.items||[],un=ciSort(n,a.filter(function(x){return !x.done})),dn=ciSort(n,a.filter(function(x){return x.done}));if(!focusId){var ae=document.activeElement,ar=ae&&ae.closest&&ae.closest('#nfItems .ci');if(ar&&ae.classList.contains('cit')){focusId=ar.dataset.id;atEnd=true}}
 $('nfItems').innerHTML=un.map(chkRow).join('')+'<button type="button" class="ciadd" aria-label="Adaugă element"></button>'+(dn.length?'<div class="cisep"></div>'+dn.map(chkRow).join(''):'');
 if(focusId){var el=document.querySelector('#nfItems .ci[data-id="'+focusId+'"] .cit');if(el){el.focus();var L=atEnd?el.value.length:0;try{el.setSelectionRange(L,L)}catch(_){}}}}
function chkNew(){if(draftId)draftFinish();var now=new Date().toISOString(),it=ciNew(false);
 var n={id:ntUid(),type:'check',title:'',items:[it],text:'',ts:now,createdAt:now,updatedAt:now,tab:noteTab};notes.push(n);fullId=n.id;fullIsNew=true;
 $('nfText').value='';$('noteFull').classList.remove('mix');ncApply(null);$('nfAlarm').classList.remove('on');$('noteFull').classList.add('show','chk');document.documentElement.classList.add('jv-nfull');try{history.pushState({jvNote:1},'')}catch(_){}chkRender();setTimeout(function(){try{$('nfTitle').focus()}catch(_){}},60)}
$('nChkNew').addEventListener('click',chkNew);
$('nfTitle').addEventListener('input',function(){var n=chkNote();if(!n)return;n.title=this.value;chkTouch(n)});
$('nfTitle').addEventListener('keydown',function(e){if(e.key!=='Enter')return;e.preventDefault();var n=chkNote();if(!n)return;var f=chkOrder(n)[0];if(!f){f=ciNew(false);n.items.push(f);chkRender()}chkRender(f.id,true)});
function chkItem(el){var n=chkNote(),row=el.closest('.ci');if(!n||!row)return{};for(var i=0;i<n.items.length;i++)if(n.items[i].id===row.dataset.id)return{n:n,x:n.items[i],i:i};return{n:n}}
$('nfItems').addEventListener('input',function(e){if(!e.target.classList.contains('cit'))return;var r=chkItem(e.target);if(!r.x)return;r.x.text=e.target.value;r.x.updatedAt=new Date().toISOString();chkTouch(r.n)});
$('nfItems').addEventListener('focusout',function(e){if(!e.target.classList.contains('cit'))return;clearTimeout(chkResortT);chkResortT=setTimeout(function(){var ae=document.activeElement;if(imeOn||(ae&&ae.closest&&ae.closest('#nfItems')&&ae.classList.contains('cit')))return;if($('noteFull').classList.contains('chk'))chkRender()},250)});
var chkResortT=null;
$('nfItems').addEventListener('change',function(e){if(e.target.type!=='checkbox')return;var r=chkItem(e.target);if(!r.x)return;chkPre(r.n);r.x.done=e.target.checked;chkTouch(r.n);nFlush();chkRender()});
function chkPre(n){if(nSaveT){clearTimeout(nSaveT);nSaveT=null}chkSync(n);saveNotes()}
function chkAdd(){var n=chkNote();if(!n)return;chkPre(n);n.items=n.items||[];var un=n.items.filter(function(x){return !x.done}),last=un[un.length-1];
 var emp=un.filter(function(x){return !x.text.trim()})[0];if(emp){chkRender(emp.id,true);return}var it=ciNew(false),at=last?n.items.indexOf(last)+1:0;n.items.splice(at,0,it);chkTouch(n);nFlush();chkRender(it.id)}
$('nfChk').addEventListener('click',function(e){if(e.target.closest('.ciadd')){e.preventDefault();chkAdd();return}if(e.target===this||e.target.id==='nfItems')chkAdd()});
$('noteFull').addEventListener('click',function(e){if($('noteFull').classList.contains('chk')&&e.target.classList&&e.target.classList.contains('nfcard'))chkAdd()});
$('nfItems').addEventListener('click',function(e){if(!e.target.classList.contains('cix'))return;var r=chkItem(e.target);if(!r.x)return;chkPre(r.n);r.n.items.splice(r.i,1);chkTouch(r.n);nFlush();chkRender()});
function chkEnter(el,rest){var r=chkItem(el);if(!r.x)return;chkPre(r.n);var it=ciNew(r.x.done);if(rest){it.text=rest}r.n.items.splice(r.i+1,0,it);chkTouch(r.n);nFlush();chkRender(it.id,!!rest)}
function chkBack(el){var r=chkItem(el);if(!r.x)return;chkPre(r.n);var ord=chkOrder(r.n),k=ord.indexOf(r.x),prev=ord[k-1];r.n.items.splice(r.i,1);chkTouch(r.n);nFlush();chkRender(prev&&prev.id,true);if(!prev)try{$('nfTitle').focus()}catch(_){}}
/* v54: per-tab sort */
$('nfSort').addEventListener('click',function(){var n=chkNote();if(!n)return;var b=this,cur=n.isort||'alpha',h='<div class="lph">Sortare</div>';[['alpha','Alfabetic'],['manual','Manual'],['created','Data creării'],['updated','Data modificării']].forEach(function(k){h+='<button data-isrt="'+k[0]+'"'+(k[0]===cur?' class="cur"':'')+'>'+k[1]+(k[0]===cur?' ✓':'')+'</button>'});
 lpCur={li:b,sortMenu:true};$('lpBox').innerHTML=h;$('lpMenu').classList.add('show');lpPos();var bx=$('lpBox'),r=b.getBoundingClientRect();bx.style.left=Math.max(12,r.right-bx.offsetWidth)+'px'});
var NT_SORTS=[['alpha','Alfabetic'],['manual','Manual'],['created','Data creării'],['updated','Data modificării']];
$('nSort').addEventListener('click',function(){var b=this,cur=ntSortOf(),h='<div class="lph">Sortare</div>';NT_SORTS.forEach(function(k){h+='<button data-srt="'+k[0]+'"'+(k[0]===cur?' class="cur"':'')+'>'+k[1]+(k[0]===cur?' ✓':'')+'</button>'});var nt=nTrashed().length;h+='<button data-a="trash" class="trmi">🗑 Coș de gunoi'+(nt?' ('+nt+')':'')+'</button>';
 lpCur={li:b,sortMenu:true};$('lpBox').innerHTML=h;$('lpMenu').classList.add('show');lpPos();var bx=$('lpBox'),r=b.getBoundingClientRect();bx.style.left=Math.max(12,r.right-bx.offsetWidth)+'px'});
/* v53: note drag & drop (armed from the long-press menu) */
var ndrag=null,ndragT=0;
function ndArm(li){li=document.querySelector('#notesList .note[data-id="'+li.dataset.id+'"]')||li;ndrag={li:li,id:li.dataset.id,on:false,pid:null,y:0,raf:0};li.classList.add('ndrag');try{if(navigator.vibrate)navigator.vibrate(15)}catch(_){}toast('Trage notița unde vrei')}
function ndEnd(save){var d=ndrag;if(!d)return;ndrag=null;ndragT=Date.now();cancelAnimationFrame(d.raf);d.li.classList.remove('ndrag','ndon');
 if(save){var ids=[].map.call($('notesList').querySelectorAll('.note'),function(x){return x.dataset.id}),slots=[];
  notes.forEach(function(n,i){if(ids.indexOf(n.id)>=0)slots.push(i)});var sorted=ids.map(findN).filter(Boolean);
  if(sorted.length===slots.length){slots.forEach(function(si,k){notes[si]=sorted[k]});saveNotes()}lpJust=true}
 renderNotes()}
function ndPlace(y){var d=ndrag,ul=$('notesList'),items=[].filter.call(ul.querySelectorAll('.note'),function(x){return x!==d.li});
 var before=null;for(var i=0;i<items.length;i++){var r=items[i].getBoundingClientRect();if(y<r.top+r.height/2){before=items[i];break}}
 if(before){if(d.li.nextSibling!==before)ul.insertBefore(d.li,before)}else if(ul.lastElementChild!==d.li)ul.appendChild(d.li)}
function ndTick(){var d=ndrag;if(!d||!d.on)return;var pg=$('notesPg'),h=window.innerHeight,v=0;if(d.y<90)v=-Math.ceil((90-d.y)/6);else if(d.y>h-90)v=Math.ceil((d.y-(h-90))/6);
 if(v){var t0=pg.scrollTop;pg.scrollTop+=v;if(pg.scrollTop!==t0)ndPlace(d.y)}d.raf=requestAnimationFrame(ndTick)}
document.addEventListener('pointerdown',function(e){var d=ndrag;if(!d)return;var li=e.target.closest&&e.target.closest('.note');
 if(li!==d.li){e.preventDefault();e.stopPropagation();ndEnd(false);return}
 e.preventDefault();d.on=true;d.pid=e.pointerId;d.y=e.clientY;d.li.classList.add('ndon');try{d.li.setPointerCapture&&d.li.setPointerCapture(e.pointerId)}catch(_){}d.raf=requestAnimationFrame(ndTick)},true);
document.addEventListener('pointermove',function(e){var d=ndrag;if(!d||!d.on||e.pointerId!==d.pid)return;e.preventDefault();d.y=e.clientY;ndPlace(e.clientY)},{capture:true,passive:false});
document.addEventListener('pointerup',function(e){var d=ndrag;if(!d||!d.on||e.pointerId!==d.pid)return;ndEnd(true)},true);
document.addEventListener('pointercancel',function(e){var d=ndrag;if(d&&d.on&&e.pointerId===d.pid)ndEnd(true)},true);
document.addEventListener('touchmove',function(e){if(ndrag&&ndrag.on&&e.cancelable)e.preventDefault()},{passive:false});
document.addEventListener('click',function(e){if(Date.now()-ndragT<400&&e.target.closest&&e.target.closest('#notesPg')){e.stopPropagation();e.preventDefault()}},true);
/* read-aloud word bar over editor fields: mirror overlays, inputs untouched (read-only while reading) */
var nrMir=[],nrBusy=false;
function nrClear(){nrMir.forEach(function(m){if(m.d.parentNode)m.d.parentNode.removeChild(m.d);m.ta.readOnly=m.ro});nrMir=[]}
function nrMirror(ta){if(!ta||!ta.offsetParent)return null;for(var q=0;q<nrMir.length;q++)if(nrMir[q].ta===ta)return nrMir[q];
 var cs=getComputedStyle(ta),d=document.createElement('div'),op=ta.offsetParent;d.className='nrMir kw';
 ['fontFamily','fontSize','fontWeight','fontStyle','letterSpacing','lineHeight','whiteSpace','wordSpacing','overflowWrap','wordBreak','textAlign','tabSize','paddingTop','paddingRight','paddingBottom','paddingLeft','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','boxSizing','textTransform','textIndent'].forEach(function(k){d.style[k]=cs[k]});
 if(cs.whiteSpace==='normal')d.style.whiteSpace='pre-wrap';
 var r=ta.getBoundingClientRect(),pr=op.getBoundingClientRect();
 d.style.left=(r.left-pr.left-op.clientLeft+op.scrollLeft)+'px';d.style.top=(r.top-pr.top-op.clientTop+op.scrollTop)+'px';d.style.width=r.width+'px';d.style.height=r.height+'px';
 var v=ta.value,re=/\S+/g,m,last=0,h='',ws=[];while((m=re.exec(v))){ws.push({s:m.index,e:m.index+m[0].length});h+=esc(v.slice(last,m.index))+'<span class="w">'+esc(m[0])+'</span>';last=re.lastIndex}
 d.innerHTML=h+esc(v.slice(last))+'\u200b<span class="kbar"></span>';op.appendChild(d);d.scrollTop=ta.scrollTop;d.scrollLeft=ta.scrollLeft;
 var sp=d.querySelectorAll('.w');ws.forEach(function(w,k){w.span=sp[k]});var o={ta:ta,d:d,ws:ws,bar:d.querySelector('.kbar'),ro:ta.readOnly};ta.readOnly=true;nrMir.push(o);return o}
/* seg for one line of a field: spoken text = trimmed line (+extra), words mapped onto the mirror's spans */
function nrSeg(ta,ls,le,extra){var v=ta?ta.value:'',line=v.slice(ls,le),tr=line.trim();if(!tr)return null;var seg=prepSeg(null,tr+(extra||''));var mo=nrMirror(ta);
 if(mo){var lw=mo.ws.filter(function(w){return w.s>=ls&&w.e<=le});seg.el=mo.d;seg.bar=mo.bar;seg.words.forEach(function(w,k){if(lw[k])w.span=lw[k].span})}return seg}
function nrField(ta,text,out,extra){if(!ta||ta.value!==text){text.split('\n').forEach(function(l){if(l.trim())out.push(prepSeg(null,l.trim()+(extra||'')))});return}
 var a=0;text.split('\n').forEach(function(l){var sg=nrSeg(ta,a,a+l.length,extra);if(sg)out.push(sg);a+=l.length+1})}
function noteRead(){if(speaking&&speakKey==='note'){stopSpeaking();return}nrClear();var cn=fullId&&findN(fullId),sg=[];
 try{var ae=document.activeElement;if(ae&&ae.blur&&$('noteFull').contains(ae))ae.blur()}catch(_){}
 var Q=function(sel){return document.querySelector('#noteFull '+sel)};
 if(cn&&cn.type==='mix'){(cn.blocks||[]).forEach(function(b){if(b.t==='text')nrField(Q('.nbw[data-b="'+b.id+'"] .nbt'),b.v||'',sg);else if(b.t==='chk')mOrder(cn,b).forEach(function(x){if(x.text.trim())nrField(Q('[data-b="'+b.id+'"] .ci[data-id="'+x.id+'"] .cit'),x.text,sg,x.done?', bifat':'')})})}
 else if(cn&&cn.type==='check'){if((cn.title||'').trim())nrField($('nfTitle'),cn.title,sg);chkOrder(cn).forEach(function(x){if(x.text.trim())nrField(Q('#nfChk .ci[data-id="'+x.id+'"] .cit'),x.text,sg,x.done?', bifat':'')})}
 else nrField($('nfText'),$('nfText').value,sg);
 if(!sg.length){nrClear();toast('Notița e goală');return}nrBusy=true;try{return speak(sg,'note')}finally{nrBusy=false}}
$('nfRead').addEventListener('click',function(e){e.preventDefault();noteRead()});
function fullClose(fromPop){if(!$('noteFull').classList.contains('show'))return;if($('noteFull').classList.contains('nro')){$('noteFull').classList.remove('nro');var rn=fullId&&findN(fullId);if(rn&&rn.del){if(rn.lock&&rn._key){lkStrip(rn)}fullId=null;phGen++;phClear();phCacheClear();phViewClose(false);$('noteFull').classList.remove('show','mix','chk');ncApply(null);document.documentElement.classList.remove('jv-nfull');renderNotes();if(!fromPop&&history.state&&history.state.jvNote)try{nIgnorePop=true;history.back()}catch(_){nIgnorePop=false}return}}nHlClear();var cq=fullId&&findN(fullId);if(cq&&cq.type==='mix')mClean(cq);if(cq&&cq.type==='check'&&cq.items){cq.items=cq.items.filter(function(x){return x.text.trim()});chkSync(cq)}if(speaking&&speakKey==='note')stopSpeaking();fullFlush();if(fullIsNew){var nn=findN(fullId);if(nn){nInsertAlpha(nn);nFlush()}fullIsNew=false}var ln=fullId&&findN(fullId);if(ln&&ln.lock&&ln._key){var kk=ln._key;lkReseal(ln).then(function(){lkStrip(ln)});lkStrip(ln)}fullId=null;phGen++;phClear();phCacheClear();phViewClose(false);$('noteFull').classList.remove('show','mix');ncApply(null);document.documentElement.classList.remove('jv-nfull');try{$('nfText').blur()}catch(_){}renderNotes();
 if(!fromPop&&history.state&&history.state.jvNote)try{nIgnorePop=true;history.back()}catch(_){nIgnorePop=false}}
var nIgnorePop=false;
$('nfText').addEventListener('input',fullInput);$('nfText').addEventListener('blur',fullFlush);
$('nfBack').addEventListener('click',function(){fullClose()});
function nFlushAll(){if(fullId)fullFlush();if(draftId){var n=findN(draftId);if(n)n.text=$('iNote').value}nFlush()}
document.addEventListener('visibilitychange',function(){if(document.hidden)nFlushAll()});
window.addEventListener('pagehide',nFlushAll);window.addEventListener('beforeunload',nFlushAll);
$('notesList').addEventListener('click',function(e){if(e.target.closest('#trX')){nTrashOpen(false);return}if(e.target.closest('#trEmpty')){nTrashEmpty();return}if(lpJust)return;var li=e.target.closest('.note');if(li){nHlPend=nQ&&nQ.trim()?{id:li.dataset.id,q:nQ}:null;fullOpen(li.dataset.id)}});
/* v20: search matches in the editor — mirror overlays (inputs untouched), cyan bar under each match, jump to the first */
var nHlPend=null,nHlM=[];
function nHlClear(){nHlM.forEach(function(d){if(d._un)d._un();if(d.parentNode)d.parentNode.removeChild(d)});nHlM=[]}
function nHlFold(v){var f='',map=[];for(var i=0;i<v.length;i++){var c=nFold(v[i]);for(var k=0;k<c.length;k++){f+=c[k];map.push(i)}}return{f:f,map:map}}
function nHlField(ta,qs){if(!ta||!ta.offsetParent||!ta.value)return null;var v=ta.value,F=nHlFold(v),R=[];
 qs.forEach(function(w){var i=0;while((i=F.f.indexOf(w,i))>=0){R.push([F.map[i],F.map[i+w.length-1]+1]);i+=w.length}});if(!R.length)return null;
 R.sort(function(a,b){return a[0]-b[0]});var M=[];R.forEach(function(r){var l=M[M.length-1];if(l&&r[0]<=l[1])l[1]=Math.max(l[1],r[1]);else M.push(r.slice())});
 var cs=getComputedStyle(ta),d=document.createElement('div'),op=ta.offsetParent;d.className='nrMir nhlMir';
 ['fontFamily','fontSize','fontWeight','fontStyle','letterSpacing','lineHeight','whiteSpace','wordSpacing','overflowWrap','wordBreak','textAlign','tabSize','paddingTop','paddingRight','paddingBottom','paddingLeft','borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth','boxSizing','textTransform','textIndent'].forEach(function(k){d.style[k]=cs[k]});
 if(cs.whiteSpace==='normal')d.style.whiteSpace='pre-wrap';
 var r=ta.getBoundingClientRect(),pr=op.getBoundingClientRect();d.style.left=(r.left-pr.left-op.clientLeft+op.scrollLeft)+'px';d.style.top=(r.top-pr.top-op.clientTop+op.scrollTop)+'px';d.style.width=r.width+'px';d.style.height=r.height+'px';
 var h='',last=0;M.forEach(function(m){h+=esc(v.slice(last,m[0]))+'<span class="nhm">'+esc(v.slice(m[0],m[1]))+'</span>';last=m[1]});d.innerHTML=h+esc(v.slice(last))+'\u200b';op.appendChild(d);nHlM.push(d);d._ta=ta;if(ta.scrollHeight>ta.clientHeight+2){d.style.overflow='hidden';d.scrollTop=ta.scrollTop;var sy=function(){d.scrollTop=ta.scrollTop};ta.addEventListener('scroll',sy);d._un=function(){ta.removeEventListener('scroll',sy)}}var f1=d.querySelector('.nhm');if(f1)f1._d=d;return f1}
function nHlApply(q){nHlClear();var qs=nFold(q).trim().split(/\s+/).filter(Boolean);if(!qs.length)return;var n=fullId&&findN(fullId);if(!n)return;
 var fs=n.type==='mix'?[].slice.call(document.querySelectorAll('#nfBlocks .nbt,#nfBlocks .cit')):n.type==='check'?[$('nfTitle')].concat([].slice.call(document.querySelectorAll('#nfChk .cit'))):[$('nfText')];
 var first=null;fs.forEach(function(ta){var s1=nHlField(ta,qs);if(s1&&!first)first=s1});
 if(first){var d=first._d,ta=d._ta;if(d.style.overflow==='hidden'){ta.scrollTop=Math.max(0,first.offsetTop-ta.clientHeight/2);d.scrollTop=ta.scrollTop;var r=ta.getBoundingClientRect();if(r.top<70||r.bottom>innerHeight-80)ta.scrollIntoView({block:'nearest'})}else first.scrollIntoView({block:'center'})}}
['input','keydown','focusin','click'].forEach(function(ev){$('noteFull').addEventListener(ev,function(){if(nHlM.length)nHlClear()},true)});
window.addEventListener('resize',function(){if(nHlM.length)nHlClear()});
$('noteTabs').addEventListener('click',function(e){var b=e.target.closest('.ntab');if(!b)return;if(draftId)draftFinish();
 if(b.classList.contains('nadd1')){jvPrompt('Tab nou','',function(nm){var t={id:ntUid(),name:nm};noteTabs.push(t);noteTab=t.id;saveNotes();renderNotes()});return}
 noteTab=b.dataset.id;saveNotes();renderNotes()});
/* v22: horizontal swipe on the list switches tabs */
function ntChipShow(){var c=document.querySelector('#noteTabs .ntab.on');if(c&&c.scrollIntoView)try{c.scrollIntoView({inline:'nearest',block:'nearest'})}catch(_){}}
function ntGo(d){var i=noteTabs.findIndex(function(t){return t.id===noteTab}),j=i+d;if(i<0||j<0||j>=noteTabs.length)return false;if(draftId)draftFinish();noteTab=noteTabs[j].id;saveNotes();renderNotes();ntChipShow();
 var ul=$('notesList');ul.classList.remove('nsw-l','nsw-r');void ul.offsetWidth;ul.classList.add(d>0?'nsw-l':'nsw-r');setTimeout(function(){ul.classList.remove('nsw-l','nsw-r')},200);return true}
(function(){var pg=$('notesPg'),S=null;
 function blocked(t){return nQ||nTrash||pg.classList.contains('nsrch')||ndrag||$('noteFull').classList.contains('show')||document.querySelector('.modal.show')||$('lpMenu').classList.contains('show')||(t.closest&&t.closest('#noteTabs,input,textarea,select,.ntop,#shModal,#crop,#phView'))}
 pg.addEventListener('touchstart',function(e){S=null;if(e.touches.length!==1)return;var t=e.touches[0];if(t.clientX<24||t.clientX>innerWidth-24||blocked(e.target))return;S={x:t.clientX,y:t.clientY,t:Date.now()}},{passive:true});
 pg.addEventListener('touchmove',function(e){if(!S)return;var t=e.touches[0];if(Math.abs(t.clientY-S.y)>40&&Math.abs(t.clientY-S.y)>Math.abs(t.clientX-S.x))S=null},{passive:true});
 pg.addEventListener('touchend',function(e){if(!S)return;var t=e.changedTouches[0],dx=t.clientX-S.x,dy=t.clientY-S.y,s0=S;S=null;if(Date.now()-s0.t>800||lpJust||ndrag)return;if(Math.abs(dx)>=60&&Math.abs(dx)>1.5*Math.abs(dy))ntGo(dx<0?1:-1)},{passive:true});
 pg.addEventListener('touchcancel',function(){S=null},{passive:true});
 setTimeout(ntChipShow,300)})();
function noteDel(id){var n=findN(id);if(!n)return;var cf=$('cfModal').querySelector('.cftxt'),t0=cf.textContent,ok=$('cfOk'),o0=ok.textContent;cf.textContent='Mută notița în coș?';ok.textContent='Mută în coș';var back=function(){cf.textContent=t0;ok.textContent=o0};
 jvConfirm(function(){back();saveNotes();n.del=new Date().toISOString();n.delTab=n.tab;nFlush();renderNotes();toast('Mutată în coș')});var no=$('cfNo').onclick;$('cfNo').onclick=function(){back();no&&no()}}
function nTrashed(){return notes.filter(function(n){return n.del})}
function nRestore(id){var n=findN(id);if(!n||!n.del)return;saveNotes();var t=n.delTab||n.tab;if(!findNT(t))t=(findNT('general')||noteTabs[0]).id;n.tab=t;delete n.del;delete n.delTab;nFlush();renderNotes();toast('Refăcută în '+findNT(t).name)}
function nPurge(id){jvConfirm(function(){notes=notes.filter(function(x){return x.id!==id});saveNotes();renderNotes();phGC();toast('Ștearsă definitiv')})}
function nTrashEmpty(){if(!nTrashed().length)return;var cf=$('cfModal').querySelector('.cftxt'),t0=cf.textContent;cf.textContent='Golești coșul? Notițele se șterg definitiv.';jvConfirm(function(){cf.textContent=t0;notes=notes.filter(function(x){return !x.del});saveNotes();renderNotes();phGC();toast('Coș golit')});var no=$('cfNo').onclick;$('cfNo').onclick=function(){cf.textContent=t0;no&&no()}}
function nTrashOpen(on){nTrash=on;if(on&&nQ)nSearchClose();$('notesPg').classList.toggle('ntrash',on);renderNotes()}
function noteEdit(li){fullOpen(li.dataset.id)}
function ntRename(id){var t=findNT(id);if(!t)return;jvPrompt('Redenumește tabul',t.name,function(nm){t.name=nm;saveNotes();renderNotes()})}
function ntDelete(id){var t=findNT(id);if(!t)return;var cnt=notes.filter(function(n){return n.tab===id&&!n.del}).length;
 jvConfirm(function(){
 notes=notes.filter(function(n){return n.tab!==id||n.del});noteTabs=noteTabs.filter(function(x){return x.id!==id});if(!noteTabs.length)noteTabs=[{id:'general',name:'General'}];
 if(noteTab===id)noteTab=noteTabs[0].id;saveNotes();renderNotes();toast('Tab șters')})}
function ntShift(id,d){var i=noteTabs.findIndex(function(t){return t.id===id}),j=i+d;if(i<0||j<0||j>=noteTabs.length)return;var x=noteTabs[i];noteTabs[i]=noteTabs[j];noteTabs[j]=x;saveNotes();renderNotes()}
function notesOpen(){var pg=$('notesPg');if(pg.classList.contains('show'))return;renderNotes();pg.classList.add('show');document.documentElement.classList.add('jv-notes');}
function notesClose(fromPop){return;var pg=$('notesPg');if(!pg.classList.contains('show'))return;if(draftId)draftFinish();nFlushAll();pg.classList.remove('show');document.documentElement.classList.remove('jv-notes');
 if(!fromPop&&history.state&&history.state.jvNotes)try{history.back()}catch(_){}}
window.addEventListener('popstate',function(){if($('phView').classList.contains('show')){phViewClose(false);return}if(nIgnorePop){nIgnorePop=false;return}if($('noteFull').classList.contains('show'))fullClose(true);else notesClose(true)});
$('notesBack').addEventListener('click',function(){notesClose()});
var sw=null;
document.addEventListener('touchstart',function(e){sw=null;if(e.touches.length!==1)return;var t=e.target;
 if(t.closest&&t.closest('input,textarea,select,.modal.show,#lpMenu,.news-search,#noteTabs'))return;if(document.querySelector('.modal.show')||$('lpMenu').classList.contains('show'))return;
 sw={x:e.touches[0].clientX,y:e.touches[0].clientY,t:Date.now()}},{passive:true});
document.addEventListener('touchend',function(e){var d=sw;sw=null;if(!d||lpJust||lpCur||ndrag||Date.now()-ndragT<600)return;var c=e.changedTouches[0],dx=c.clientX-d.x,dy=c.clientY-d.y;
 if(Math.abs(dx)<60||Math.abs(dx)<Math.abs(dy)*1.6)return;var open=$('notesPg').classList.contains('show');
 if(dx>0&&$('noteFull').classList.contains('show')){fullClose();return}
 if(dx<0&&!open)notesOpen();else if(dx>0&&open)notesClose()},{passive:true});
renderNotes();
nH.cur=nSnap();nHistBtns();
/* ---------- Notis v2: import notes from Jarvis (same-origin localStorage, Jarvis backups in jv_backups, Jarvis backup .json files) ---------- */
function nsReal(){return notes.filter(function(n){return n.lock||n.ph||(n.text||'').trim()||(n.title||'').trim()||(n.items||[]).some(function(x){return (x.text||'').trim()})}).length}
function nsJSON(v){if(v==null)return null;if(typeof v!=='string')return v;try{return JSON.parse(v)}catch(_){return null}}
function nsMerge(src){var ns=Array.isArray(src&&src.notes)?src.notes:[],ts=Array.isArray(src&&src.tabs)?src.tabs:[];if(!ns.length)return 0;
 if(draftId)try{draftFinish()}catch(_){}
 ts.forEach(function(t){if(t&&t.id&&!noteTabs.some(function(x){return x.id===t.id}))noteTabs.push(JSON.parse(JSON.stringify(t)))});
 var add=0;ns.forEach(function(n){if(!n||!n.id||findN(n.id))return;notes.push(JSON.parse(JSON.stringify(n)));add++});
 if(add){ntMigrate();saveNotes();renderNotes()}return add}
function nsFromData(d){d=d&&typeof d==='object'?(d.data&&typeof d.data==='object'?d.data:d):null;if(!d)return null;
 var p=['jv_','jvb_'].filter(function(x){return Array.isArray(nsJSON(d[x+'notes']))})[0];if(!p)return null;
 return{notes:nsJSON(d[p+'notes']),tabs:nsJSON(d[p+'notetabs'])||[]}}
function nsFromLS(){var out={notes:[],tabs:[]};['jv_','jvb_'].forEach(function(p){var n=nsJSON(localStorage.getItem(p+'notes')),t=nsJSON(localStorage.getItem(p+'notetabs'));
 if(Array.isArray(n))out.notes=out.notes.concat(n);if(Array.isArray(t))out.tabs=out.tabs.concat(t)});return out}
function nsJvBackups(){var a=[];['jv_','jvb_'].forEach(function(p){var l=nsJSON(localStorage.getItem(p+'backups'));if(Array.isArray(l))l.forEach(function(e){var s=e&&nsFromData(e.data);if(s&&s.notes.length)a.push({e:e,s:s})})});return a}
function nsMsg(add,found){toast(add?'Am importat '+add+(add===1?' notiță':' notițe')+' din Jarvis':found?'Notițele din Jarvis sunt deja aici':'Nu am găsit notițe Jarvis')}
function nsImportJarvis(){var s=nsFromLS(),add=nsMerge(s),found=s.notes.length;
 if(!found){var b=nsJvBackups()[0];if(b){add=nsMerge(b.s);found=b.s.notes.length}}
 if(found){try{localStorage.setItem('ns_impban','off')}catch(_){}}nsBanner();nsMsg(add,found);return found}
function nsRenderJv(){var box=$('jvBkList');if(!box)return;var a=nsJvBackups();box.innerHTML='';
 a.forEach(function(x){var row=document.createElement('div');row.className='bkrow';var l=document.createElement('div');l.className='bklbl';l.textContent='Backup Jarvis din '+(x.e.label||x.e.ts||'')+' · '+x.s.notes.length+' notițe';row.appendChild(l);
  var ac=document.createElement('div');ac.className='bkacts';var b=document.createElement('button');b.type='button';b.className='btn';b.textContent='Importă';b.onclick=function(){var n=nsMerge(x.s);try{localStorage.setItem('ns_impban','off')}catch(_){}nsBanner();nsMsg(n,1)};ac.appendChild(b);row.appendChild(ac);box.appendChild(row)})}
function nsBanner(){var el=$('nsImp');if(!el)return;var off=false;try{off=localStorage.getItem('ns_impban')==='off'}catch(_){}el.hidden=off||nsReal()>0}
$('sShareApp').onclick=function(){var U='https://cluj1313.github.io/notis/',d={title:'Notis',text:'Aplicația de notițe Notis — deschide linkul în Chrome/Brave și instalează:',url:U};
 function cp(){var ok=function(){toast('Link copiat')};try{if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(U).then(ok,leg)}catch(_){}leg();
  function leg(){var ta=document.createElement('textarea');ta.value=U;document.body.appendChild(ta);ta.select();try{document.execCommand('copy')}catch(_){}ta.remove();ok()}}
 if(navigator.share)navigator.share(d).catch(function(e){if(!e||e.name!=='AbortError')cp()});else cp()};
/* v10: IME-safe single-line fields. Never rewrite values while composing; a newline in a checklist item = Enter (Android IMEs send keyCode 229, no reliable keydown) */
var imeOn=false,imeEnter=null,lastKeyAct=0;
document.addEventListener('compositionstart',function(){imeOn=true},true);
document.addEventListener('compositionend',function(e){imeOn=false;var t=e.target;setTimeout(function(){if(imeEnter&&imeEnter===t){imeEnter=null;itemEnter(t)}else if(t&&(isItem(t)||t.id==='nfTitle'||t.id==='prIn')&&/[\r\n]/.test(t.value||''))nlFix(t)},0)},true);
function isItem(t){return t&&t.classList&&t.classList.contains('cit')}
function itemEnter(t,rest){if(!document.contains(t))return;if(t.closest('#nfBlocks'))mEnter(t,rest);else if(t.closest('#nfItems'))chkEnter(t,rest)}
function itemBack(t){if(Date.now()-lastKeyAct<120)return;lastKeyAct=Date.now();if(t.closest('#nfBlocks'))mBack(t);else if(t.closest('#nfItems'))chkBack(t)}
function nlFix(t){var v=t.value;if(!/[\r\n]/.test(v))return;var k=v.search(/[\r\n]/),bf=v.slice(0,k),af=v.slice(k).replace(/^[\r\n]+/,'').replace(/[\r\n]+/g,' ');
 if(isItem(t)){t.value=bf;t.dispatchEvent(new Event('input',{bubbles:true}));itemEnter(t,af);return}
 var p=t.selectionStart;t.value=v.replace(/[\r\n]+/g,' ');try{t.setSelectionRange(p,p)}catch(_){}
 if(t.id==='nfTitle'){t.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))}}
document.addEventListener('beforeinput',function(e){var t=e.target;if(!t||!(isItem(t)||t.id==='nfTitle'||t.id==='prIn'))return;
 if(e.inputType==='insertLineBreak'||e.inputType==='insertParagraph'){e.preventDefault();if(isItem(t)){if(imeOn||e.isComposing)imeEnter=t;else{lastKeyAct=Date.now();itemEnter(t)}}else t.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));return}
 if(e.inputType==='deleteContentBackward'&&isItem(t)&&!t.value&&!imeOn){e.preventDefault();itemBack(t)}},true);
document.addEventListener('keydown',function(e){var t=e.target;if(!isItem(t))return;if(e.isComposing||e.keyCode===229)return;
 if(e.key==='Enter'){e.preventDefault();e.stopPropagation();if(Date.now()-lastKeyAct<120)return;lastKeyAct=Date.now();itemEnter(t);return}
 if(e.key==='Backspace'&&!t.value){e.preventDefault();e.stopPropagation();itemBack(t)}},true);
document.addEventListener('input',function(e){var t=e.target;if(!t||!(isItem(t)||t.id==='nfTitle'||t.id==='prIn'))return;if(imeOn||e.isComposing)return;if(/[\r\n]/.test(t.value))nlFix(t)},true);
function fitSoon(t){if(t._fitq)return;t._fitq=1;requestAnimationFrame(function(){t._fitq=0;mFit(t)})}
/* ---------- v8: photos on notes (IndexedDB 'notis-photos'; locked notes: bytes AES-GCM encrypted with the note key) ---------- */
var phDB=null;function phOpen(){if(phDB)return phDB;phDB=new Promise(function(res,rej){var r=indexedDB.open('notis-photos',1);r.onupgradeneeded=function(){var s=r.result.createObjectStore('p',{keyPath:'id'});s.createIndex('note','note')};r.onsuccess=function(){res(r.result)};r.onerror=function(){rej(r.error)}});return phDB}
function phTx(mode,fn){return phOpen().then(function(db){return new Promise(function(res,rej){var t=db.transaction('p',mode),s=t.objectStore('p'),out=fn(s);t.oncomplete=function(){res(out&&out.result!==undefined?out.result:out)};t.onerror=function(){rej(t.error)}})})}
function phAll(){return phTx('readonly',function(s){return s.getAll()})}
function phOf(nid){return phTx('readonly',function(s){return s.index('note').getAll(nid)}).then(function(a){return(a||[]).sort(function(x,y){return x.ts-y.ts})})}
function phPut(r){return phTx('readwrite',function(s){s.put(r)})}
function phDel(id){return phTx('readwrite',function(s){s.delete(id)})}
function phCount(n){return phOf(n.id).then(function(a){var c=a.length;if((n.ph||0)!==c){if(c)n.ph=c;else delete n.ph;nFlush()}return a})}
function phCompress(file){return new Promise(function(res,rej){var u=URL.createObjectURL(file),im=new Image();im.onload=function(){var w=im.naturalWidth,h=im.naturalHeight,s=Math.min(1,1600/Math.max(w,h)),c=document.createElement('canvas');c.width=Math.round(w*s);c.height=Math.round(h*s);
 c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);c.toBlob(function(b){b?res(b):rej(new Error('blob'))},'image/jpeg',0.8)};im.onerror=function(){URL.revokeObjectURL(u);rej(new Error('img'))};im.src=u})}
function phSeal(key,buf){var iv=crypto.getRandomValues(new Uint8Array(12));return crypto.subtle.encrypt({name:'AES-GCM',iv:iv},key,buf).then(function(ct){return{iv:b64e(iv),buf:ct}})}
function phBlob(n,r){if(!r.iv)return Promise.resolve(new Blob([r.buf],{type:'image/jpeg'}));if(!n._key)return Promise.reject(new Error('locked'));
 return crypto.subtle.decrypt({name:'AES-GCM',iv:b64d(r.iv)},n._key,r.buf).then(function(b){return new Blob([b],{type:'image/jpeg'})})}
function phLockAll(nid,key){return phOf(nid).then(function(a){return Promise.all(a.filter(function(r){return !r.iv}).map(function(r){return phSeal(key,r.buf).then(function(x){r.iv=x.iv;r.buf=x.buf;return phPut(r)})}))})}
function phUnlockAll(nid,key){return phOf(nid).then(function(a){return Promise.all(a.filter(function(r){return r.iv}).map(function(r){return crypto.subtle.decrypt({name:'AES-GCM',iv:b64d(r.iv)},key,r.buf).then(function(b){delete r.iv;r.buf=b;return phPut(r)})}))})}
var phURLs=[],phGen=0;
function phClear(){if(!fullId)phCacheClear();phURLs.forEach(function(u){URL.revokeObjectURL(u)});phURLs=[];$('nfPh').innerHTML='';$('noteFull').classList.remove('hasph')}
function phFit(){var ta=$('nfText');if($('noteFull').classList.contains('hasph')){ta.style.height='auto';ta.style.height=ta.scrollHeight+'px'}else ta.style.height=''}
function phRender(){var g=++phGen,n=fullId&&findN(fullId);if(!n){phClear();phFit();return Promise.resolve()}if(n.type==='mix'){phClear();phFit();return phCount(n).then(function(a){if(g===phGen)mAdopt(n,a)})}
 return phCount(n).then(function(a){if(g!==phGen)return;return Promise.all(a.map(function(r){return phBlob(n,r).then(function(b){return{r:r,b:b}},function(){return null})})).then(function(xs){if(g!==phGen)return;phClear();var box=$('nfPh');
  xs.forEach(function(x){if(!x)return;var u=URL.createObjectURL(x.b);phURLs.push(u);var d=document.createElement('div');d.className='phi';d.dataset.id=x.r.id;d.dataset.u=u;d.style.backgroundImage='url('+u+')';box.appendChild(d)});
  $('noteFull').classList.toggle('hasph',box.children.length>0);phFit()})})}
function phAdd(files){var n=fullId&&findN(fullId);
 if(!n){var now=new Date().toISOString();n={id:ntUid(),text:$('nfText').value||'',ts:now,createdAt:now,updatedAt:now,tab:noteTab};notes.push(n);fullId=n.id;fullIsNew=true}
 var nid=n.id,key=n.lock?n._key:null;if(n.lock&&!key){toast('Notiță blocată');return}
 var list=[].slice.call(files||[]);if(!list.length)return;
 list.reduce(function(p,f,i){return p.then(function(){return phCompress(f).then(function(b){return b.arrayBuffer()}).then(function(buf){return key?phSeal(key,buf):{buf:buf}}).then(function(x){var r={id:ntUid(),note:nid,ts:Date.now()+i,buf:x.buf};if(x.iv)r.iv=x.iv;return phPut(r)}).catch(function(e){console.warn(e);toast('Nu am putut adăuga poza')})})},Promise.resolve())
  .then(function(){var m=findN(nid);if(m){m.updatedAt=new Date().toISOString();return phCount(m)}}).then(function(){nFlush();if(fullId===nid)phRender()})}
function phGC(){return phAll().then(function(a){var ids={};notes.forEach(function(n){ids[n.id]=1});return Promise.all(a.filter(function(r){return !ids[r.note]}).map(function(r){return phDel(r.id)}))}).catch(function(){})}
function phAb2b64(buf){var u=new Uint8Array(buf),s='',C=0x8000;for(var i=0;i<u.length;i+=C)s+=String.fromCharCode.apply(null,u.subarray(i,i+C));return btoa(s)}
function phB642ab(s){var b=atob(s),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u.buffer}
function phDump(){return phAll().then(function(a){var ids={};notes.forEach(function(n){ids[n.id]=1});return a.filter(function(r){return ids[r.note]}).map(function(r){var o={id:r.id,note:r.note,ts:r.ts,data:phAb2b64(r.buf)};if(r.iv)o.iv=r.iv;return o})}).catch(function(){return []})}
function phLoad(list){if(!Array.isArray(list)||!list.length)return Promise.resolve(0);return Promise.all(list.map(function(o){if(!o||!o.id||!o.note||!o.data)return null;var r={id:o.id,note:o.note,ts:o.ts||Date.now(),buf:phB642ab(o.data)};if(o.iv)r.iv=o.iv;return phPut(r)})).then(function(){return list.length})}
/* viewer */
var pvL=[],pvI=0,pvZ=1,pvX=0,pvY=0,pvP={},pvG=null,pvTap=null,pvTapT=null,pvMoved=false;
function pvApply(anim){var im=$('phImg');im.style.transition=anim?'transform .2s ease':'none';im.style.transform='translate('+pvX+'px,'+pvY+'px) scale('+pvZ+')'}
function pvShow(i){pvI=i;pvZ=1;pvX=0;pvY=0;$('phImg').src=pvL[i];pvApply();$('pvCount').textContent=pvL.length>1?(i+1)+' / '+pvL.length:''}
function phView(u,list){pvL=(list&&list.length?list:[u]).filter(Boolean);var i=pvL.indexOf(u);var v=$('phView');v.classList.add('show');pvShow(i<0?0:i);try{history.pushState({jvPh:1},'')}catch(_){}}
function phViewClose(back){var v=$('phView');if(!v.classList.contains('show'))return;v.classList.remove('show');clearTimeout(pvTapT);pvP={};$('phImg').removeAttribute('src');if(back){nIgnorePop=false;try{history.back()}catch(_){}}}
function pvClamp(){var r=$('phImg').getBoundingClientRect(),W=innerWidth,H=innerHeight;if(pvZ<=1){pvZ=1;pvX=0;pvY=0;return}
 var bw=r.width/((parseFloat(($('phImg').style.transform.match(/scale\(([^)]+)\)/)||[0,1])[1]))||1)*pvZ,bh=r.height/((parseFloat(($('phImg').style.transform.match(/scale\(([^)]+)\)/)||[0,1])[1]))||1)*pvZ,mx=Math.max(0,(bw-W)/2),my=Math.max(0,(bh-H)/2);pvX=Math.max(-mx,Math.min(mx,pvX));pvY=Math.max(-my,Math.min(my,pvY))}
(function(){var v=$('phView');
 v.addEventListener('pointerdown',function(e){e.preventDefault();try{v.setPointerCapture(e.pointerId)}catch(_){}pvP[e.pointerId]={x:e.clientX,y:e.clientY};var ids=Object.keys(pvP);pvMoved=false;
  if(ids.length===2){var a=pvP[ids[0]],b=pvP[ids[1]];pvG={pinch:1,d:Math.hypot(a.x-b.x,a.y-b.y)||1,m:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},z:pvZ,x:pvX,y:pvY}}else pvG={x0:e.clientX,y0:e.clientY,x:pvX,y:pvY}});
 v.addEventListener('pointermove',function(e){if(!pvP[e.pointerId]||!pvG)return;pvP[e.pointerId]={x:e.clientX,y:e.clientY};var ids=Object.keys(pvP);
  if(pvG.pinch&&ids.length>=2){var a=pvP[ids[0]],b=pvP[ids[1]],d=Math.hypot(a.x-b.x,a.y-b.y),m={x:(a.x+b.x)/2,y:(a.y+b.y)/2},cx=innerWidth/2,cy=innerHeight/2,nz=Math.max(1,Math.min(6,pvG.z*d/pvG.d)),k=nz/pvG.z;
   pvX=(m.x-cx)-((pvG.m.x-cx)-pvG.x)*k;pvY=(m.y-cy)-((pvG.m.y-cy)-pvG.y)*k;pvZ=nz;pvMoved=true;pvApply();return}
  var dx=e.clientX-pvG.x0,dy=e.clientY-pvG.y0;if(Math.abs(dx)>8||Math.abs(dy)>8)pvMoved=true;
  if(pvZ>1){pvX=pvG.x+dx;pvY=pvG.y+dy;pvApply()}else if(pvL.length>1){pvX=dx;pvApply()}});
 function up(e){if(!pvP[e.pointerId])return;delete pvP[e.pointerId];var ids=Object.keys(pvP);
  if(ids.length){var q=pvP[ids[0]];pvG={x0:q.x,y0:q.y,x:pvX,y:pvY};return}
  var g=pvG;pvG=null;if(!g)return;
  if(g.pinch||pvZ>1){if(pvZ<1.05){pvZ=1}pvClamp();pvApply(true);if(!pvMoved)tap(e);return}
  var dx=e.clientX-g.x0;
  if(pvL.length>1&&Math.abs(dx)>60){var n=pvI+(dx<0?1:-1);if(n>=0&&n<pvL.length){pvShow(n);return}}
  pvX=0;pvApply(true);if(!pvMoved)tap(e)}
 function tap(e){var now=Date.now();if(pvTap&&now-pvTap.t<300&&Math.hypot(e.clientX-pvTap.x,e.clientY-pvTap.y)<40){clearTimeout(pvTapT);pvTap=null;
   if(pvZ>1){pvZ=1;pvX=0;pvY=0}else{var cx=innerWidth/2,cy=innerHeight/2;pvZ=2.5;pvX=-(e.clientX-cx)*1.5;pvY=-(e.clientY-cy)*1.5;pvClamp()}pvApply(true);return}
  pvTap={t:now,x:e.clientX,y:e.clientY};clearTimeout(pvTapT);if(pvZ<=1)pvTapT=setTimeout(function(){pvTap=null;if(pvZ<=1)try{history.back()}catch(_){phViewClose(false)}},300)}
 v.addEventListener('pointerup',up);v.addEventListener('pointercancel',function(e){delete pvP[e.pointerId];if(!Object.keys(pvP).length){pvG=null;if(pvZ<=1){pvX=0;pvApply(true)}}});
 v.addEventListener('contextmenu',function(e){e.preventDefault()})})();

[['nfPh',1],['nfBlocks',0]].forEach(function(BX){var box=$(BX[0]),t=null,sx=0,sy=0,fired=false,tgt=null;
 function cancel(){clearTimeout(t);t=null}
 box.addEventListener('pointerdown',function(e){var d=e.target.closest('.phi');if(!d)return;tgt=d;fired=false;sx=e.clientX;sy=e.clientY;cancel();t=setTimeout(function(){t=null;fired=true;try{if(navigator.vibrate)navigator.vibrate(20)}catch(_){}
  var id=d.dataset.id;jvConfirm(function(){phDel(id).then(function(){var n=fullId&&findN(fullId);if(n){n.updatedAt=new Date().toISOString();return phCount(n)}}).then(function(){var m=fullId&&findN(fullId);if(m&&m.type==='mix'){(m.blocks||[]).forEach(function(b){if(b.t==='img')b.ph=(b.ph||[]).filter(function(x){return x!==id})});mNorm(m);mSync(m);nFlush();mRender()}else{nFlush();phRender()}})})},450)});
 box.addEventListener('pointermove',function(e){if(t&&(Math.abs(e.clientX-sx)>10||Math.abs(e.clientY-sy)>10))cancel()});
 box.addEventListener('pointerup',function(e){var d=e.target.closest('.phi');if(t){cancel();if(d&&d===tgt&&!fired)phView(d.dataset.u,[].map.call(d.parentNode.querySelectorAll('.phi'),function(x){return x.dataset.u}))}});
 box.addEventListener('pointercancel',cancel);box.addEventListener('contextmenu',function(e){e.preventDefault()});
 if(BX[1])box.addEventListener('click',function(e){e.stopPropagation()})});
$('nfPhoto').addEventListener('click',function(){var i=$('nfPhIn');i.value='';i.click()});
$('nfPhIn').addEventListener('change',function(){phPick(this.files)});$('nfPhoto').addEventListener('mousedown',function(e){e.preventDefault()});
$('nfText').addEventListener('input',function(){if($('noteFull').classList.contains('hasph')&&!phFit._q){phFit._q=1;requestAnimationFrame(function(){phFit._q=0;phFit()})}});
setTimeout(phGC,3000);
/* ---------- v9: mixed notes (type 'mix': blocks text/checklist), note color, editor move/alarm ---------- */
var NC=[['','Implicit'],['#103a3d','Turcoaz'],['#163a22','Verde'],['#3a3514','Galben'],['#3e2812','Portocaliu'],['#3d1a1c','Roșu'],['#3a1832','Roz'],['#291c48','Mov'],['#2b313b','Gri']];
function bUid(){return 'b'+ntUid()}
function mOrder(n,b){var a=b.items||[],P={isort:n.isort,items:a,createdAt:n.createdAt,ts:n.ts};return ciSort(P,a.filter(function(x){return !x.done})).concat(ciSort(P,a.filter(function(x){return x.done})))}
function mSync(n){if(n.type!=='mix')return;var L=[];(n.blocks||[]).forEach(function(b){if(b.t==='text')L.push(b.v||'');else mOrder(n,b).forEach(function(x){if(x.text.trim())L.push(x.text.trim())})});n.text=L.join('\n').replace(/^\s*\n/,'').replace(/\n{3,}/g,'\n\n')}
function mNorm(n){var a=[];(n.blocks||[]).forEach(function(b){if(b.t==='chk'&&!(b.items||[]).length)return;if(b.t==='img'&&!(b.ph||[]).length)return;var q=a[a.length-1];if(b.t!=='text'&&q&&q.t!=='text')a.push({id:bUid(),t:'text',v:''});var p=a[a.length-1];if(b.t==='text'&&p&&p.t==='text'){p.v=(p.v||'')+((p.v&&b.v)?'\n':'')+(b.v||'');return}a.push(b)});
 if(!a.length||a[a.length-1].t!=='text')a.push({id:bUid(),t:'text',v:''});n.blocks=a}
function mTouch(n){n.updatedAt=n.editedAt=new Date().toISOString();mSync(n);nSaveSoon()}
function mPre(n){if(nSaveT){clearTimeout(nSaveT);nSaveT=null}mSync(n);saveNotes()}
function mBlk(id){var n=fullId&&findN(fullId);if(!n||!n.blocks)return{};for(var i=0;i<n.blocks.length;i++)if(n.blocks[i].id===id)return{n:n,b:n.blocks[i],i:i};return{n:n}}
function mFit(t){t.style.height='auto';t.style.height=t.scrollHeight+'px'}
function mRender(focus){var n=fullId&&findN(fullId);if(!n||n.type!=='mix')return;mNorm(n);var box=$('nfBlocks');
 if(!focus){var ae=document.activeElement;if(ae&&box.contains(ae)){var bb=ae.closest('[data-b]');if(ae.classList.contains('cit'))focus={b:bb.dataset.b,item:ae.closest('.ci').dataset.id,end:true};else if(ae.classList.contains('nbt'))focus={b:bb.dataset.b,pos:ae.selectionStart}}}
 var h='';n.blocks.forEach(function(b){h+=b.t==='img'?'<div class="nbi'+((b.ph||[]).length===1?' one':'')+'" data-b="'+b.id+'">'+(b.ph||[]).map(function(id){return '<div class="phi" data-id="'+esc(id)+'"'+(phCache[id]?' data-u="'+phCache[id]+'" style="background-image:url('+phCache[id]+')'+(phRatio[id]?';aspect-ratio:'+phRatio[id]:'')+'"':'')+'></div>'}).join('')+'</div>':'';if(b.t==='img');else if(b.t==='text')h+='<div class="nbw" data-b="'+b.id+'"><textarea class="nbt" rows="1" autocomplete="off" data-lpignore="true" data-1p-ignore="true" data-form-type="other" aria-label="Text">'+esc(b.v||'')+'</textarea></div>';
  else{var a=b.items||[],P={isort:n.isort,items:a,createdAt:n.createdAt,ts:n.ts},un=ciSort(P,a.filter(function(x){return !x.done})),dn=ciSort(P,a.filter(function(x){return x.done}));
   h+='<div class="nbc" data-b="'+b.id+'">'+un.map(chkRow).join('')+'<button type="button" class="ciadd" aria-label="Adaugă element"></button>'+(dn.length?'<div class="cisep"></div>'+dn.map(chkRow).join(''):'')+'</div>'}});
 box.innerHTML=h;box.querySelectorAll('.nbt').forEach(mFit);phFill();
 if(focus){var w=box.querySelector('[data-b="'+focus.b+'"]'),el=w&&(focus.item?w.querySelector('.ci[data-id="'+focus.item+'"] .cit'):w.querySelector('.nbt'));if(el){el.focus();var L=focus.pos!=null?focus.pos:(focus.end?el.value.length:0);try{el.setSelectionRange(L,L)}catch(_){}}}}
function mItem(el){var w=el.closest('.nbc'),row=el.closest('.ci');if(!w||!row)return{};var r=mBlk(w.dataset.b);if(!r.b)return{};for(var i=0;i<r.b.items.length;i++)if(r.b.items[i].id===row.dataset.id){r.x=r.b.items[i];r.xi=i;return r}return r}
var mCaret=null;/* last caret: {b:blockId,pos} or {plain:pos} or {chkb:blockId} */
document.addEventListener('focusin',function(e){var t=e.target;if(t===$('nfText'))mCaret={plain:1};else if(t.classList&&t.classList.contains('nbt'))mCaret={b:t.closest('[data-b]').dataset.b};else if(t.closest&&t.closest('.nbc'))mCaret={chkb:t.closest('.nbc').dataset.b};else if(t.closest&&t.closest('#nfChk'))mCaret={chk:1}});
document.addEventListener('selectionchange',function(){var t=document.activeElement;if(!mCaret||!t)return;if(t===$('nfText')||(t.classList&&t.classList.contains('nbt')))mCaret.pos=t.selectionStart});
function mInsert(){mInsertB({id:bUid(),t:'chk',items:[ciNew(false)]})}
function mInsertB(nb){var n=fullId&&findN(fullId);if(n&&n.lock&&!n._key)return;
 if(!n){var now=new Date().toISOString();n={id:ntUid(),text:'',ts:now,createdAt:now,updatedAt:now,tab:noteTab};notes.push(n);fullId=n.id;fullIsNew=true}
 else mPre(n);
 var it=nb.items?nb.items[0]:null;
 if(n.type!=='mix'){var bl=[];if(n.type==='check'){if((n.title||'').trim())bl.push({id:bUid(),t:'text',v:n.title.trim()});if((n.items||[]).length)bl.push({id:bUid(),t:'chk',items:n.items},{id:bUid(),t:'text',v:''});bl.push(nb)}
  else{var v=$('nfText').value||n.text||'',p=(mCaret&&mCaret.plain&&mCaret.pos!=null)?mCaret.pos:v.length;var bf=v.slice(0,p).replace(/\n$/,''),af=v.slice(p).replace(/^\n/,'');if(bf)bl.push({id:bUid(),t:'text',v:bf});bl.push(nb);bl.push({id:bUid(),t:'text',v:af})}
  n.type='mix';n.blocks=bl;delete n.title;delete n.items}
 else{var at=n.blocks.length,c=mCaret;
  if(c&&c.b){var r=mBlk(c.b);if(r.b){var v2=r.b.v||'',p2=c.pos!=null?c.pos:v2.length,bf2=v2.slice(0,p2).replace(/\n$/,''),af2=v2.slice(p2).replace(/^\n/,'');r.b.v=bf2;n.blocks.splice(r.i+1,0,nb,{id:bUid(),t:'text',v:af2});at=-1}}
  else if(c&&c.chkb){var r2=mBlk(c.chkb);if(r2.b){n.blocks.splice(r2.i+1,0,{id:bUid(),t:'text',v:''},nb);at=-1}}
  if(at>=0){var last=n.blocks[n.blocks.length-1];if(last&&last.t==='text'&&!(last.v||'').trim())n.blocks.splice(n.blocks.length-1,0,nb);else n.blocks.push(nb)}}
 mTouch(n);nFlush();mShow(n);mRender(it?{b:nb.id,item:it.id}:null);return n}
function mShow(n){var F=$('noteFull');F.classList.remove('chk');F.classList.toggle('mix',n.type==='mix')}
var B=$('nfBlocks');
B.addEventListener('input',function(e){var t=e.target;if(t.classList.contains('nbt')){var r=mBlk(t.closest('[data-b]').dataset.b);if(!r.b)return;r.b.v=t.value;fitSoon(t);mTouch(r.n);return}
 if(t.classList.contains('cit')){var q=mItem(t);if(!q.x)return;q.x.text=t.value;q.x.updatedAt=new Date().toISOString();mTouch(q.n)}});
var mResT=null;B.addEventListener('focusout',function(e){if(!e.target.classList.contains('cit'))return;clearTimeout(mResT);mResT=setTimeout(function(){var ae=document.activeElement;if(imeOn||(ae&&B.contains(ae)&&(ae.classList.contains('cit')||ae.classList.contains('nbt'))))return;if($('noteFull').classList.contains('mix'))mRender()},250)});
B.addEventListener('change',function(e){if(e.target.type!=='checkbox')return;var q=mItem(e.target);if(!q.x)return;mPre(q.n);q.x.done=e.target.checked;q.x.updatedAt=new Date().toISOString();mTouch(q.n);nFlush();mRender()});
function mAdd(w){var r=mBlk(w.dataset.b);if(!r.b)return;mPre(r.n);var un=r.b.items.filter(function(x){return !x.done}),emp=un.filter(function(x){return !x.text.trim()})[0];if(emp){mRender({b:r.b.id,item:emp.id,end:true});return}
 var last=un[un.length-1],it=ciNew(false),at=last?r.b.items.indexOf(last)+1:0;r.b.items.splice(at,0,it);mTouch(r.n);nFlush();mRender({b:r.b.id,item:it.id})}
B.addEventListener('click',function(e){var t=e.target;if(t.closest('.ciadd')){e.preventDefault();mAdd(t.closest('.nbc'));return}
 if(t.classList.contains('cix')){var q=mItem(t);if(!q.x)return;mPre(q.n);q.b.items.splice(q.xi,1);mTouch(q.n);nFlush();mRender();return}
 if(t===B){var tl=B.querySelectorAll('.nbt'),l=tl[tl.length-1];if(l){l.focus();try{l.setSelectionRange(l.value.length,l.value.length)}catch(_){}}}});
function mEnter(t,rest){var q=mItem(t);if(!q.x)return;mPre(q.n);var it=ciNew(q.x.done);if(rest)it.text=rest;q.b.items.splice(q.xi+1,0,it);mTouch(q.n);nFlush();mRender({b:q.b.id,item:it.id,end:!!rest})}
function mBack(t){var q=mItem(t);if(!q.x)return;mPre(q.n);var ord=mOrder(q.n,q.b),k=ord.indexOf(q.x),prev=ord[k-1];q.b.items.splice(q.xi,1);mTouch(q.n);nFlush();
 if(prev){mRender({b:q.b.id,item:prev.id,end:true});return}if(q.b.items.length){mRender({b:q.b.id,item:mOrder(q.n,q.b)[0].id});return}
 var pb=q.n.blocks[q.i-1];if(pb&&pb.t==='text'){mRender({b:pb.id,pos:(pb.v||'').length});return}mRender()}
$('noteFull').addEventListener('click',function(e){if($('noteFull').classList.contains('mix')&&e.target.classList&&e.target.classList.contains('nfcard')){var tl=B.querySelectorAll('.nbt'),l=tl[tl.length-1];if(l){l.focus();try{l.setSelectionRange(l.value.length,l.value.length)}catch(_){}}}});
function mClean(n){if(!n||n.type!=='mix')return;(n.blocks||[]).forEach(function(b){if(b.t==='chk')b.items=(b.items||[]).filter(function(x){return x.text.trim()})});mNorm(n);mSync(n)}
/* color */
function ncApply(n){var c=n&&n.color||'';c=ncT(c);$('noteFull').querySelector('.nfcard').style.background=c?'linear-gradient(180deg,'+c+'f2,'+c+'d9)':'';$('nfColor').classList.toggle('on',!!c)}
function edNote(create){var n=fullId&&findN(fullId);if(!n&&create){var now=new Date().toISOString();n={id:ntUid(),text:$('nfText').value||'',ts:now,createdAt:now,updatedAt:now,tab:noteTab};notes.push(n);fullId=n.id;fullIsNew=true}return n}
function edPop(btn,html,tag){lpCur={li:btn,edPop:tag};$('lpBox').innerHTML=html;$('lpMenu').classList.add('show');var bx=$('lpBox'),r=btn.getBoundingClientRect();bx.style.left=Math.max(10,Math.min(window.innerWidth-bx.offsetWidth-10,r.left))+'px';bx.style.top=Math.max(10,r.top-bx.offsetHeight-8)+'px';bx.style.bottom='auto';bx.style.right='auto'}
$('nfColor').addEventListener('click',function(){var n=fullId&&findN(fullId),cur=n&&n.color||'',h='<div class="lph">Culoare</div><div class="npal">';NC.forEach(function(k){h+='<button data-ncl="'+k[0]+'" class="'+(cur===k[0]?'cur':'')+'" style="--nc:'+(ncT(k[0])||'#0a1d30')+'" aria-label="'+k[1]+'"><i'+(k[0]?'':' class="ncdef"')+'></i></button>'});edPop(this,h+'</div>','col')});
$('nfMove').addEventListener('click',function(){var n=fullId&&findN(fullId),cur=n?n.tab:noteTab,h='<div class="lph">Mută în</div>';noteTabs.forEach(function(t){h+='<button data-nmt="'+t.id+'"'+(t.id===cur?' class="cur"':'')+'>'+esc(t.name)+(t.id===cur?' ✓':'')+'</button>'});edPop(this,h,'mv')});
$('nfAlarm').addEventListener('click',function(){var n=edNote(true);if(!n)return;nFlush();openAlarm({k:'n',id:n.id})});
$('nfChkIns').addEventListener('mousedown',function(e){e.preventDefault()});$('nfChkIns').addEventListener('click',mInsert);
function edState(){var n=fullId&&findN(fullId);$('nfAlarm').classList.toggle('on',!!(n&&alNext(n)));ncApply(n)}
new MutationObserver(function(){if(!$('alModal').classList.contains('show'))setTimeout(edState,50)}).observe($('alModal'),{attributes:true,attributeFilter:['class']});
/* ---------- v11: inline photo blocks (t:'img', ph:[photo ids]) + crop editor ---------- */
var phCache={},phRatio={};
function phAR(d,id,u){if(!d.closest('.nbi.one'))return;if(phRatio[id]){d.style.aspectRatio=phRatio[id];return}var im=new Image();im.onload=function(){var w=im.naturalWidth,h=Math.max(im.naturalHeight,im.naturalWidth/4);phRatio[id]=w+' / '+h;d.style.aspectRatio=phRatio[id]};im.src=u}
function phCacheClear(){for(var k in phCache)try{URL.revokeObjectURL(phCache[k])}catch(_){}phCache={}}
function phGet(id){return phTx('readonly',function(s){return s.get(id)})}
function phFill(){var n=fullId&&findN(fullId);if(!n)return;$('nfBlocks').querySelectorAll('.phi[data-id]').forEach(function(d){var id=d.dataset.id;
 if(phCache[id]){d.style.backgroundImage='url('+phCache[id]+')';d.dataset.u=phCache[id];phAR(d,id,phCache[id]);return}
 phGet(id).then(function(r){if(!r){d.remove();return}return phBlob(n,r).then(function(b){var u=URL.createObjectURL(b);phCache[id]=u;if(document.contains(d)){d.style.backgroundImage='url('+u+')';d.dataset.u=u;phAR(d,id,u)}})}).catch(function(){})})}
function mAdopt(n,list){if(!n||n.type!=='mix')return;var ref={};(n.blocks||[]).forEach(function(b){if(b.t==='img')(b.ph||[]).forEach(function(i){ref[i]=1})});
 var un=list.filter(function(r){return !ref[r.id]}).map(function(r){return r.id});if(!un.length){phFill();return}
 var bl=n.blocks,last=bl[bl.length-1],nb={id:bUid(),t:'img',ph:un};if(last&&last.t==='text'&&!(last.v||'').trim())bl.splice(bl.length-1,0,nb);else bl.push(nb);mNorm(n);mSync(n);saveNotes(true);mRender()}
function phStore(n,blobs){var key=n.lock?n._key:null,ids=[];return blobs.reduce(function(p,b,i){return p.then(function(){return b.arrayBuffer().then(function(buf){return key?phSeal(key,buf):{buf:buf}}).then(function(x){var r={id:ntUid(),note:n.id,ts:Date.now()+i,buf:x.buf};if(x.iv)r.iv=x.iv;ids.push(r.id);return phPut(r)})})},Promise.resolve()).then(function(){return ids})}
function phPick(files){var list=[].slice.call(files||[]);try{$('nfPhIn').value=''}catch(_){}if(!list.length)return;var n0=fullId&&findN(fullId);if(n0&&n0.lock&&!n0._key){toast('Notiță blocată');return}
 var caret=mCaret?JSON.parse(JSON.stringify(mCaret)):null,out=[];
 list.reduce(function(p,f,i){return p.then(function(){return cropEdit(f,i+1,list.length).then(function(b){if(b)out.push(b)},function(e){console.warn(e)})})},Promise.resolve()).then(function(){if(!out.length)return;
  mCaret=caret;var n=fullId&&findN(fullId);if(!n){var now=new Date().toISOString();n={id:ntUid(),text:$('nfText').value||'',ts:now,createdAt:now,updatedAt:now,tab:noteTab};notes.push(n);fullId=n.id;fullIsNew=true}
  return phStore(n,out).then(function(ids){mCaret=caret;var nb={id:bUid(),t:'img',ph:ids},m=mInsertB(nb);if(!m)return;var bi=m.blocks.indexOf(nb),nx=m.blocks[bi+1];mCaret=nx&&nx.t==='text'?{b:nx.id,pos:0}:null;return phCount(m).then(function(a){mAdopt(m,a);nFlush()})})}).catch(function(e){console.warn(e);toast('Nu am putut adăuga poza')})}
/* crop editor */
function cropSrc(file){var MX=2400;function fin(src,w,h){var k=Math.min(1,MX/Math.max(w,h));if(k===1&&src.tagName==='IMG')return Promise.resolve(null);var c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*k));c.height=Math.max(1,Math.round(h*k));c.getContext('2d').drawImage(src,0,0,c.width,c.height);try{src.close&&src.close()}catch(_){}return new Promise(function(r){c.toBlob(function(b){r(b)},'image/jpeg',0.92)})}
 function viaImg(){return new Promise(function(ok,no){var u=URL.createObjectURL(file),i=new Image();i.onload=function(){var w=i.naturalWidth,h=i.naturalHeight;fin(i,w,h).then(function(b){URL.revokeObjectURL(u);ok(b||file)},function(){URL.revokeObjectURL(u);ok(file)})};i.onerror=function(){URL.revokeObjectURL(u);no(new Error('decode'))};i.src=u})}
 var p=(window.createImageBitmap?createImageBitmap(file,{imageOrientation:'from-image'}).then(function(bm){return fin(bm,bm.width,bm.height)}).then(function(b){if(!b)throw 0;return b}):Promise.reject()).catch(viaImg);
 return Promise.race([p,new Promise(function(_,no){setTimeout(function(){no(new Error('timeout'))},20000)})])}
function cropEdit(file0,idx,tot){return cropSrc(file0).then(function(file){return cropEdit1(file,idx,tot)},function(e){console.warn(e);toast('Nu pot deschide poza '+(tot>1?idx+'/'+tot:''));return null})}
function cropEdit1(file,idx,tot){try{var ae=document.activeElement;if(ae&&ae.blur&&ae!==document.body)ae.blur()}catch(_){}return new Promise(function(done){var ov=$('crop'),st=$('cropStage'),im=$('cropImg'),fr=$('cropFrame'),u=URL.createObjectURL(file);
 var W=0,H=0,rot=0,s0=1,z=1,tx=0,ty=0,C={x:0,y:0,w:0,h:0},ptr={},mode=null,h0=null,c0=null,p0=null,g0=null;
 $('cropCount').textContent=tot>1?idx+' / '+tot:'';
 function dims(){return rot%180?{w:H,h:W}:{w:W,h:H}}
 function sb(){return st.getBoundingClientRect()}
 var dead=false,tries=0;function reset(){if(dead)return;var r=sb(),d=dims();if(r.width<50||r.height<50||!d.w||!d.h){if(++tries<40)setTimeout(reset,120);return}s0=(r.width-32)/d.w;z=1;tx=r.width/2;ty=r.height/2;var s=s0*z,iw=d.w*s,ih=d.h*s,x1=Math.max(16,tx-iw/2),y1=Math.max(16,ty-ih/2),x2=Math.min(r.width-16,tx+iw/2),y2=Math.min(r.height-16,ty+ih/2);C={x:x1,y:y1,w:x2-x1,h:y2-y1};draw()}
 function draw(){var s=s0*z;im.style.width=W+'px';im.style.height=H+'px';im.style.transform='translate('+(tx-W/2)+'px,'+(ty-H/2)+'px) rotate('+rot+'deg) scale('+s+')';
  fr.style.left=C.x+'px';fr.style.top=C.y+'px';fr.style.width=C.w+'px';fr.style.height=C.h+'px'}
 function pt(e){var r=sb();return{x:e.clientX-r.left,y:e.clientY-r.top}}
 function down(e){e.preventDefault();used=true;try{st.setPointerCapture(e.pointerId)}catch(_){}ptr[e.pointerId]=pt(e);var ids=Object.keys(ptr);
  if(ids.length===2){var a=ptr[ids[0]],b=ptr[ids[1]];mode='pinch';g0={d:Math.hypot(a.x-b.x,a.y-b.y)||1,m:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},z:z,tx:tx,ty:ty};return}
  var hd=e.target.closest('.ch');if(hd){mode='h';h0=hd.dataset.h;c0={x:C.x,y:C.y,w:C.w,h:C.h};p0=ptr[e.pointerId];return}
  mode='pan';p0=ptr[e.pointerId];g0={tx:tx,ty:ty}}
 function move(e){if(!ptr[e.pointerId])return;e.preventDefault();ptr[e.pointerId]=pt(e);var ids=Object.keys(ptr);
  if(mode==='pinch'&&ids.length>=2){var a=ptr[ids[0]],b=ptr[ids[1]],d=Math.hypot(a.x-b.x,a.y-b.y),m={x:(a.x+b.x)/2,y:(a.y+b.y)/2},nz=Math.max(0.3,Math.min(8,g0.z*d/g0.d)),k=nz/g0.z;
   z=nz;tx=m.x-(g0.m.x-g0.tx)*k;ty=m.y-(g0.m.y-g0.ty)*k;draw();return}
  var q=ptr[e.pointerId],dx=q.x-p0.x,dy=q.y-p0.y;
  if(mode==='pan'){tx=g0.tx+dx;ty=g0.ty+dy;draw();return}
  if(mode==='h'){var M=40,r=sb(),x1=c0.x,y1=c0.y,x2=c0.x+c0.w,y2=c0.y+c0.h;if(/l/.test(h0))x1=Math.min(x2-M,Math.max(0,c0.x+dx));if(/r/.test(h0))x2=Math.max(x1+M,Math.min(r.width,x2+dx));if(/t/.test(h0))y1=Math.min(y2-M,Math.max(0,c0.y+dy));if(/b/.test(h0))y2=Math.max(y1+M,Math.min(r.height,y2+dy));
   C={x:x1,y:y1,w:x2-x1,h:y2-y1};draw()}}
 function up(e){delete ptr[e.pointerId];var ids=Object.keys(ptr);if(!ids.length)mode=null;else if(mode==='pinch'){mode='pan';p0=ptr[ids[0]];g0={tx:tx,ty:ty}}}
 function out(){if(!(C.w>=20&&C.h>=20)){used=false;reset()}var s=s0*z,cw=C.w/s,chh=C.h/s,k=Math.min(1,1600/Math.max(cw,chh)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(cw*k));c.height=Math.max(1,Math.round(chh*k));var x=c.getContext('2d');
  x.fillStyle='#06121f';x.fillRect(0,0,c.width,c.height);x.scale(k,k);x.translate(-(C.x-tx)/s,-(C.y-ty)/s);x.rotate(rot*Math.PI/180);x.drawImage(im,-W/2,-H/2);
  return new Promise(function(r){c.toBlob(function(b){r(b)},'image/jpeg',0.8)})}
 var closed=false;function close(v){if(closed)return;closed=dead=true;st.removeEventListener('pointerdown',down);st.removeEventListener('pointermove',move);st.removeEventListener('pointerup',up);st.removeEventListener('pointercancel',up);
  $('cropOk').onclick=$('cropNo').onclick=$('cropRot').onclick=null;window.removeEventListener('resize',onRs);ov.classList.remove('show');im.removeAttribute('src');URL.revokeObjectURL(u);done(v)}
 var used=false;im.onload=function(){W=im.naturalWidth;H=im.naturalHeight;ov.classList.add('show');requestAnimationFrame(function(){requestAnimationFrame(reset)});setTimeout(function(){if(!used)reset()},350)};im.onerror=function(){toast('Nu pot deschide poza');close(null)};im.src=u;
 st.addEventListener('pointerdown',down);st.addEventListener('pointermove',move);st.addEventListener('pointerup',up);st.addEventListener('pointercancel',up);var onRs=function(){if(!used)reset()};window.addEventListener('resize',onRs);
 $('cropRot').onclick=function(){rot=(rot+90)%360;used=false;reset()};$('cropNo').onclick=function(){close(null)};var busy=false;$('cropOk').onclick=function(){if(busy)return;busy=true;out().then(function(b){busy=false;if(!b||b.size<200){toast('Nu am putut decupa poza');return}close(b)},function(){busy=false;toast('Nu am putut decupa poza')})}})}
$('bJvImport').onclick=function(){nsImportJarvis();nsRenderJv()};
$('nsImpGo').onclick=function(){if(!nsImportJarvis()){toast('Alege fișierul de backup Jarvis (.json)');$('bBkFile').value='';$('bBkFile').click()}};
$('nsImpX').onclick=function(){try{localStorage.setItem('ns_impban','off')}catch(_){}nsBanner()};
(function(){var orig=$('bBkFile').onchange;$('bBkFile').onchange=function(){var self=this,f=this.files&&this.files[0];if(!f)return;var r=new FileReader();
 r.onload=function(){var s=null;try{s=nsFromData(JSON.parse(r.result))}catch(_){}
  if(s){var n=nsMerge(s);try{localStorage.setItem('ns_impban','off')}catch(_){}nsBanner();nsMsg(n,s.notes.length||0);return}orig.call(self)};r.readAsText(f)}})();
(function(){var ob=$('bSettings').onclick;$('bSettings').onclick=function(){ob.apply(this,arguments);nsRenderJv()}})();
(function(){var _rn=renderNotes;renderNotes=function(){_rn.apply(this,arguments);nsBanner()}})();
/* auto-import: whenever Notis has no real notes yet and Jarvis notes exist on this origin */
if(!nsReal()){var s0=nsFromLS();if(s0.notes.length&&nsMerge(s0)){NS_IMPORTED=true;try{localStorage.setItem('ns_impban','off')}catch(_){}}}
nsBanner();
notesOpen();if(NS_IMPORTED)setTimeout(function(){toast('Am importat notițele din Jarvis')},400);
/* Notis: long-press on the NOTIȚE title opens Setări (voice + backup) */
(function(){var h=document.querySelector('#notesPg .ntop h2'),t=null;function go(){t=null;try{if(navigator.vibrate)navigator.vibrate(20)}catch(_){}$('bSettings').onclick()}
 h.addEventListener('touchstart',function(){t=setTimeout(go,450)},{passive:true});h.addEventListener('mousedown',function(){t=setTimeout(go,450)});['touchend','touchmove','mouseup','mouseleave'].forEach(function(ev){h.addEventListener(ev,function(){clearTimeout(t)})});h.addEventListener('contextmenu',function(e){e.preventDefault()})})();
/* v23: themes */
var TH_META={color:'#06111f',dark:'#000000',light:'#f3f5f8',vip:'#121110'};
function thHex(r,g,b){return '#'+[r,g,b].map(function(x){return ('0'+Math.round(x).toString(16)).slice(-2)}).join('')}
function vipMix(v){var k=v/100,lo=[20,19,18],hi=[244,242,238],c=lo.map(function(x,i){return x+(hi[i]-x)*k}),c2=c.map(function(x){return x*.9}),warm=k>.5?[(k-.5)*2*14,(k-.5)*2*6,-(k-.5)*2*6]:[0,0,0];
 c=[c[0]+warm[0]*.4,c[1]+warm[1]*.4,c[2]+warm[2]*.4].map(function(x){return Math.max(0,Math.min(255,x))});var L=(.2126*c[0]+.7152*c[1]+.0722*c[2])/255;
 return{bg:thHex(c[0],c[1],c[2]),bg2:thHex(c2[0],c2[1],c2[2]),out:L>.5?'#1d1b18':'#f6ead2',glow:L>.5?'rgba(255,255,255,.7)':'rgba(232,201,138,.14)'}}
/* v24: note colours per theme (stored value = Color-theme tint) */
var NC_TH={light:{'#103a3d':'#d3eff1','#163a22':'#dbf2e1','#3a3514':'#f8f0c4','#3e2812':'#fde3c8','#3d1a1c':'#fcdcdc','#3a1832':'#f9dcef','#291c48':'#e5ddfa','#2b313b':'#e3e7ec'},
 vip:{'#103a3d':'#14302f','#163a22':'#1b3123','#3a3514':'#3a3116','#3e2812':'#3d2916','#3d1a1c':'#3b1c1d','#3a1832':'#371b2e','#291c48':'#2a2140','#2b313b':'#2d2b29'}};
function ncT(c){var m=typeof NC_TH!=='undefined'&&NC_TH[thCur];return c&&m&&m[c.toLowerCase()]||c}
Object.assign(TH_META,{"jad": "#0f2a24", "lac": "#5a0f12", "tus": "#f2ece0", "neon": "#0a0a14"});var TH_LIGHT={light:1,tus:1};
Object.assign(NC_TH,{"jad": {"#103a3d": "#0f3d3c", "#163a22": "#1d4a30", "#3a3514": "#4a4318", "#3e2812": "#4d3217", "#3d1a1c": "#4b1f22", "#3a1832": "#47203b", "#291c48": "#2f2752", "#2b313b": "#2c3a37"}, "lac": {"#103a3d": "#12302e", "#163a22": "#1a3320", "#3a3514": "#3e3110", "#3e2812": "#45240e", "#3d1a1c": "#3d0c10", "#3a1832": "#3a0f27", "#291c48": "#2a1636", "#2b313b": "#2e2222"}, "tus": {"#103a3d": "#d6eae5", "#163a22": "#dde9d0", "#3a3514": "#f2e5b4", "#3e2812": "#f3d7ba", "#3d1a1c": "#f1cec7", "#3a1832": "#efd4df", "#291c48": "#dbd4ea", "#2b313b": "#e1dcd2"}, "neon": {"#103a3d": "#0b3340", "#163a22": "#0f3a2a", "#3a3514": "#3a3410", "#3e2812": "#40250f", "#3d1a1c": "#40101f", "#3a1832": "#3d0f33", "#291c48": "#2a1550", "#2b313b": "#22243a"}});
var thCur='color';
function thApply(t){if(!TH_META[t])t='color';thCur=t;var R0=document.documentElement;if(t==='color')R0.removeAttribute('data-theme');else R0.setAttribute('data-theme',t);
 var meta=TH_META[t];['--vbg','--vbg2','--vout','--vglow'].forEach(function(k){R0.style.removeProperty(k)});
 if(t==='vip'){var v=+LS.get('ns_vipint',85),x=vipMix(v);R0.style.setProperty('--vbg',x.bg);R0.style.setProperty('--vbg2',x.bg2);R0.style.setProperty('--vout',x.out);R0.style.setProperty('--vglow',x.glow);meta=x.bg;$('vipInt').value=v}
 var m=document.querySelector('meta[name=theme-color]');if(m)m.setAttribute('content',meta);var cs=document.querySelector('meta[name=color-scheme]');if(!cs&&t!=='color'){cs=document.createElement('meta');cs.name='color-scheme';document.head.appendChild(cs)}if(cs&&t==='color'){cs.remove();cs=null}if(cs)cs.setAttribute('content',(typeof TH_LIGHT!=='undefined'&&TH_LIGHT[t])||(t==='vip'&&+LS.get('ns_vipint',85)>50)?'light':'dark');
 document.querySelectorAll('#thRow .thc').forEach(function(b){b.classList.toggle('on',b.dataset.th===t)})}
thApply(LS.get('ns_theme','color'));if(thCur!=='color')try{renderNotes()}catch(_){}
$('thRow').addEventListener('click',function(e){var b=e.target.closest('.thc');if(!b)return;LS.set('ns_theme',b.dataset.th);thApply(b.dataset.th);try{renderNotes();edState()}catch(_){}});
$('vipInt').addEventListener('input',function(){LS.set('ns_vipint',+this.value);thApply('vip')});
alCheck(); /* notes are loaded after alInit: run the alarm catch-up again so note alarms fire on open */
/* v21: trashed note = read-only */
(function(){var nf=$('noteFull'),ro=function(){return nf.classList.contains('nro')};
 nf.addEventListener('focusin',function(e){if(ro()&&e.target.matches&&e.target.matches('textarea,input'))e.target.readOnly=true},true);
 nf.addEventListener('beforeinput',function(e){if(ro())e.preventDefault()},true);
 nf.addEventListener('click',function(e){if(!ro())return;if(e.target.closest('#nfRestore')){var id=fullId;fullClose();nRestore(id);return}if(e.target.closest('input[type=checkbox],.cix,.ciadd,.nbi .phx'))e.preventDefault(),e.stopPropagation()},true);
 var b=document.createElement('button');b.type='button';b.id='nfRestore';b.className='btn pill';b.textContent='↩ Reface';nf.appendChild(b)})();
})();

