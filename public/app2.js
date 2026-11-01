/* prayer times, qibla, adhan */
let _lfP=null;function loadLeaflet(){if(typeof L!=='undefined')return Promise.resolve();if(_lfP)return _lfP;_lfP=new Promise((res,rej)=>{const l=document.createElement('link');l.rel='stylesheet';l.href='vendor/leaflet.css';document.head.appendChild(l);const sc=document.createElement('script');sc.src='vendor/leaflet.js';sc.onload=()=>res();sc.onerror=()=>{_lfP=null;rej(new Error('leaflet'))};document.head.appendChild(sc)});return _lfP}

const PN={fajr:'الفجر',sunrise:'الشروق',dhuhr:'الظهر',asr:'العصر',maghrib:'المغرب',isha:'العشاء'};
const PK=['fajr','dhuhr','asr','maghrib','isha'];
const METH=[['13','ديانت (تركيا)'],['3','رابطة العالم الإسلامي'],['4','أم القرى (مكة)'],['5','الهيئة المصرية'],['2','أمريكا الشمالية ISNA'],['1','جامعة كراتشي'],['8','الخليج'],['9','الكويت'],['10','قطر']];
const PT_=ls=>0;
const g=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}};
const sv=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const HOST='https://praytimes.org/audio/sunni/',GA='https://guidetoazan.com/storage/posts/meta/';
const VOICES={
 doha:{n:'مؤذن الدوحة (قطر) - لكل صلاة، وأذان الفجر فيه الصلاة خير من النوم',u:p=>`adhan/${p}.mp3`,fajrLine:true},
 saba:{n:'مقام الصبا',u:()=>GA+'azan-in-maqam-saba-athan-mkam-sba370.mp3'},
 bayati:{n:'مقام البياتي',u:()=>GA+'azan-in-maqam-bayati-alathan-bmkam-albyat376.mp3'},
 hijaz:{n:'مقام الحجاز',u:()=>GA+'azan-in-maqam-hijaz-athan-mkam-alhjaz365.mp3'},
 nahawand:{n:'مقام النهاوند',u:()=>GA+'azan-in-maqam-nahawand-athan-mkam-nhond361.mp3'},
 sika:{n:'مقام السيكا',u:()=>GA+'azan-in-maqam-sika-athan-mkam-syka367.mp3'},
 rast:{n:'مقام الراست',u:()=>GA+'azan-in-maqam-rast-athan-mkam-alrst372.mp3'},
 ajam:{n:'مقام العجم',u:()=>GA+'azan-in-maqam-ajam-athan-mkam-alaajm374.mp3'},
 makkah:{n:'أذان مكة',u:()=>HOST+'Adhan-Makkah.mp3'},
 madinah:{n:'أذان المدينة',u:()=>HOST+'Adhan-Madinah.mp3'},
 aqsa:{n:'أذان الأقصى',u:()=>HOST+'Adhan-Alaqsa.mp3'},
 egypt:{n:'أذان مصر',u:()=>HOST+'Adhan-Egypt.mp3'},
 basit:{n:'الشيخ عبد الباسط',u:()=>HOST+'Abdul-Basit.mp3'},
 minshawi:{n:'الشيخ المنشاوي',u:()=>HOST+'Minshawi.mp3'},
 none:{n:'بدون صوت (إشعار فقط)',u:null}
};
let LOC=g('loc',null),METHOD=g('method',(Intl.DateTimeFormat().resolvedOptions().timeZone==='Europe/Istanbul')?'13':'3');
let VS=g('voices',{fajr:'doha',dhuhr:'doha',asr:'doha',maghrib:'doha',isha:'doha'}),ADHAN_ON=g('adhanOn',false),TODAY=null,fired=g('fired',{}),adAu=null,wake=null;
function dk(d){return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`}
function tzOff(ms,tz){const f=new Intl.DateTimeFormat('en-US',{timeZone:tz,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(new Date(ms)).reduce((a,p)=>(a[p.type]=p.value,a),{});return Date.UTC(+f.year,f.month-1,+f.day,+f.hour,+f.minute,+f.second)-ms}
function atZ(dd,mm,yy,hhmm,tz){const [h,m]=hhmm.split(':').map(Number);const guess=Date.UTC(yy,mm-1,dd,h,m);return guess-tzOff(guess-tzOff(guess,tz),tz)}
let DIY=null;
async function diyanetKonya(){if(DIY)return DIY;try{const r=await fetch('diyanet-konya-2026-11.json?v=158');DIY=r.ok?await r.json():null}catch(e){DIY=null}return DIY}
const nearKonya=()=>LOC&&Math.abs(LOC.lat-37.871)<0.08&&Math.abs(LOC.lon-32.485)<0.08;
const diyKey=(dd,mm,yy)=>`${yy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
async function officialKonyaFallback(date){if(METHOD!=='13'||!nearKonya())return null;const d=await diyanetKonya();if(!d)return null;const [dd,mm,yy]=dk(date).split('-').map(Number);const t=d.times[diyKey(dd,mm,yy)];if(!t)return null;const o={tz:'Europe/Istanbul',h:null,ms:{},src:'diyanet-official-konya',srcLabel:'المصدر: ديانات الرسمية — قونيا: كاراتاي (تشرين الثاني 2026)'};['fajr','sunrise','dhuhr','asr','maghrib','isha'].forEach(k=>o.ms[k]=atZ(dd,mm,yy,t[k],'Europe/Istanbul'));return o}
async function loadTimes(date){
 if(!LOC)return null;const key=`pt_${dk(date)}_${LOC.lat.toFixed(2)}_${LOC.lon.toFixed(2)}_${METHOD}`;let c=g(key,null);
 if(!c){try{const ac=new AbortController();const tm=setTimeout(()=>ac.abort(),12000);let r;try{r=await fetch(`https://api.aladhan.com/v1/timings/${dk(date)}?latitude=${LOC.lat}&longitude=${LOC.lon}&method=${METHOD}`,{signal:ac.signal})}finally{clearTimeout(tm)}if(!r.ok)throw Error('timings');const j=await r.json();if(!j.data||!j.data.timings)throw Error('timings');c={t:j.data.timings,tz:j.data.meta.timezone,h:j.data.date.hijri};sv(key,c);
  Object.keys(localStorage).filter(k=>k.startsWith('pt_')&&k!==key).slice(0,-12).forEach(k=>localStorage.removeItem(k))}catch(e){const ok=await officialKonyaFallback(date);if(ok)return ok;return null}}
 const [dd,mm,yy]=dk(date).split('-').map(Number);const o={tz:c.tz,h:c.h,ms:{}};['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'].forEach(k=>o.ms[k.toLowerCase()]=atZ(dd,mm,yy,c.t[k].slice(0,5),c.tz));if(METHOD==='13'){if(nearKonya()){const d=await diyanetKonya();const t=d&&d.times[diyKey(dd,mm,yy)];if(t){['fajr','sunrise','dhuhr','asr','maghrib','isha'].forEach(k=>o.ms[k]=atZ(dd,mm,yy,t[k],'Europe/Istanbul'));o.src='diyanet-official-konya';o.srcLabel='المصدر: ديانات الرسمية — قونيا: كاراتاي (تشرين الثاني 2026)'}else{o.srcLabel='حساب تقريبي بطريقة ديانات (Aladhan) — غير رسمي'}}else{o.srcLabel='حساب تقريبي بطريقة ديانات (Aladhan) — غير رسمي'}}return o}
async function refreshToday(){TODAY=await loadTimes(new Date());const n=new Date(Date.now()+864e5);window.TOM=await loadTimes(n);return TODAY}
const fmt=(ms,tz)=>new Date(ms).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:tz||undefined});
const LOC_HELP='في Chrome: افتح رابط التطبيق في Chrome ← رمز إعدادات الموقع بجانب العنوان ← الأذونات ← الموقع ← السماح. أو الإعدادات ← إعدادات المواقع ← الموقع ← اختر هذا الموقع. إذا فتحت التطبيق من الأيقونة: اضغط مطولاً على أيقونة زاد المسلم ← معلومات التطبيق ← الأذونات ← الموقع ← السماح أثناء الاستخدام، وفعّل الموقع الدقيق إن ظهر. وفي إعدادات الهاتف: التطبيقات ← Chrome ← الأذونات ← الموقع ← السماح أثناء الاستخدام، وفعّل الموقع الدقيق وخدمة الموقع. ارجع واضغط إعادة المحاولة. لا تمسح بيانات الموقع كي لا تفقد التنزيلات.';
const LOC_ERRORS={denied:'إذن الموقع مرفوض أو محظور. '+LOC_HELP,unavailable:'تعذر الحصول على الموقع. فعّل خدمة الموقع في الهاتف، وافتح المكان قرب نافذة أو في الخارج ثم أعد المحاولة. يمكنك اختيار المدينة يدوياً.',timeout:'انتهت مهلة تحديد الموقع. تأكد من تشغيل GPS والموقع الدقيق ثم أعد المحاولة أو اختر المدينة.',secure:'الموقع والبوصلة يحتاجان رابط HTTPS آمناً. افتح الرابط الرسمي في Chrome.',unsupported:'هذا المتصفح لا يدعم تحديد الموقع. افتح الرابط في Chrome أو اختر المدينة يدوياً.'};
let locBusy=false,locRun=0,locStarted=0;
function locStatus(t){document.querySelectorAll('#locStatus').forEach(e=>e.textContent=t);}
function locDetail(){if(!LOC)return '';if(!LOC.gps)return LOC.map?'موقع اخترته يدوياً على الخريطة، وليس قياس GPS':'موقع تقريبي حسب مركز المدينة، وليس GPS';const a=Number.isFinite(LOC.accuracy)?'دقة الموقع المبلّغ عنها: ±'+Math.round(LOC.accuracy)+' متر. ':'';const age=LOC.timestamp?Date.now()-LOC.timestamp:Infinity;return a+(age>900000?'موقع محفوظ قديم؛ حدّث GPS إن انتقلت. ':'موقع GPS حديث. ')+(LOC.approx?'تحديد تقريبي بديل. ':'')+'لا يمكن ضمان دقة ١٠٠٪.'}
function locControls(){return `<div class="z"><div id="gpsPermission" class="d"></div><div id="locDetail" class="d">${locDetail()}</div><div id="locStatus" role="status" aria-live="polite" style="line-height:1.9"></div><div class="cnt"><button data-gps onclick="locatePage()">📍 تفعيل / تحديث الموقع</button></div><details><summary>مساعدة إذن الموقع</summary><div class="d" style="line-height:1.9">${LOC_HELP}</div></details></div>`}
function locationPage(msg){qStop();app.innerHTML=locControls()+mapMarkup('picker')+'<div class="d">اضغط على الخريطة أو اسحب العلامة ثم احفظ الموقع. لا يلزم كتابة اسم المدينة.</div><details><summary>بحث اختياري باسم المدينة</summary>'+cityBox(msg||'يمكنك اختيار المدينة بدلاً من الخريطة.')+'</details>';initLocationMap('picker')}
function locatePage(){gpsTapFeedback();if(locBusy&&Date.now()-locStarted<40000){locStatus('طلب الموقع جارٍ بالفعل... انتظر حتى ٣٨ ثانية.');return}getLoc(()=>{gpsDone();route();gpsNotice('✓ تم تحديث الموقع، دقة '+(Math.round(LOC.accuracy||0))+' متر')},code=>{gpsDone();locStatus(LOC_ERRORS[code]||LOC_ERRORS.unavailable);gpsNotice(code==='denied'?'الموقع محظور من إعدادات Android أو Chrome. افتح مساعدة إذن الموقع أدناه.':LOC_ERRORS[code]||LOC_ERRORS.unavailable)})}
async function getLoc(cb,err){
 if(!window.isSecureContext){err('secure');return}if(!navigator.geolocation){err('unsupported');return}
 if(locBusy&&Date.now()-locStarted<40000){locStatus('جاري تحديد الموقع... انتظر قليلاً.');return}locBusy=true;locStarted=Date.now();const run=++locRun;const page=location.hash;
 const state=t=>{if(location.hash===page)locStatus(t)};
 state('جاري التحقق من إذن الموقع...');
 // Call geolocation during the tap, without awaiting Permissions API (which can hang or disagree in installed apps).
 state('جاري طلب موقعك الآن... وافق على الإذن إن ظهر. قد يستغرق حتى ٣٨ ثانية.');
 try{navigator.permissions?.query({name:'geolocation'}).then(p=>{if(!locBusy||run!==locRun)return;const e=$('#gpsPermission');if(e)e.textContent='حالة إذن المتصفح: '+({denied:'محظور؛ راجع أذونات Android وChrome',prompt:'بانتظار الموافقة',granted:'مسموح'}[p.state]||p.state)}).catch(()=>{})}catch(e){}
 let finished=false,guard;
 const fail=code=>{if(finished||run!==locRun)return;finished=true;clearTimeout(guard);locBusy=false;gpsDone();if(location.hash===page)err(code)};
 const ok=p=>{if(finished||run!==locRun)return;const {latitude:lat,longitude:lon,accuracy}=p.coords;if(!Number.isFinite(lat)||!Number.isFinite(lon)){fail('unavailable');return}finished=true;clearTimeout(guard);locBusy=false;
 const l={lat,lon,name:'موقعك الحالي',gps:true,accuracy:Number.isFinite(accuracy)?accuracy:null,timestamp:p.timestamp||Date.now(),approx:usingFallback};LOC=l;sv('loc',l);gpsDone();if(location.hash===page)cb();
 // Naming is optional and never delays using the coordinates.
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),5000);
 fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ar`,{signal:ac.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(j=>{if(LOC!==l)return;l.name=(j.city||j.locality||l.name)+(j.countryName?' - '+j.countryName:'');sv('loc',l);const label=$('#locName');if(label)label.textContent=l.name}).catch(()=>{}).finally(()=>clearTimeout(timer));
 };
 let usingFallback=false;guard=setTimeout(()=>fail('timeout'),38000);
 navigator.geolocation.getCurrentPosition(ok,e=>{if(finished)return;if(e.code===1){fail('denied');return}usingFallback=true;state('تعذر GPS الدقيق؛ نجرب تحديداً تقريبياً حديثاً...');navigator.geolocation.getCurrentPosition(ok,e2=>fail(e2.code===1?'denied':e2.code===3?'timeout':'unavailable'),{enableHighAccuracy:false,timeout:10000,maximumAge:0})},{enableHighAccuracy:true,timeout:20000,maximumAge:0});
}
function cityBox(msg){return `<div class="z"><div class="t" style="font-size:16px;line-height:1.8">${msg}</div><input class="s" id="city" placeholder="اكتب اسم المدينة (مثال: قونية)" onkeydown="if(event.key==='Enter')cityGo()"><div class="cnt"><button onclick="cityGo()">بحث</button></div><div id="cres"></div></div>`}
async function cityGo(){const v=$('#city').value.trim();if(!v)return;$('#cres').innerHTML='...';try{const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(v)}&count=6&language=ar`);const j=await r.json();window._cr=j.results||[];$('#cres').innerHTML=_cr.length?_cr.map((c,i)=>`<div class="sr" onclick="pickCity(${i})"><div class="nm">${c.name}</div><div class="m">${[c.admin1,c.country].filter(Boolean).join(' - ')}</div></div>`).join(''):'لا نتائج'}catch(e){$('#cres').innerHTML='تعذر البحث، تأكد من الإنترنت'}}
function pickCity(i){const c=_cr[i];LOC={lat:c.latitude,lon:c.longitude,name:c.name+(c.country?' - '+c.country:''),gps:false};sv('loc',LOC);route()}
async function prayer(){setT('المواقيت والأذان',1);
 if(!LOC){locationPage();return}
 app.innerHTML='<div class="z">جاري تحميل المواقيت...</div>'+locControls();const T=await refreshToday();
 if(!T){app.innerHTML='<div class="z">تم حفظ الموقع، لكن تعذر تحميل المواقيت من خدمة الإنترنت. تأكد من الاتصال ثم <button onclick="prayer()">أعد تحميل المواقيت</button></div>'+locControls()+cityBox('يمكنك أيضاً اختيار مدينتك.');return}
 const now=Date.now();let nx=PK.concat(['sunrise']).filter(k=>T.ms[k]>now).sort((a,b)=>T.ms[a]-T.ms[b])[0];let nt=nx?T.ms[nx]:(TOM?TOM.ms.fajr:0);if(!nx)nx='fajr';
 const hij=T.h?`${T.h.day} ${T.h.month.ar} ${T.h.year} هـ`:'';
 const PIC={fajr:'pi-fajr.png',sunrise:'pi-shuruk.png',dhuhr:'pi-duhr.png',asr:'pi-asr.png',maghrib:'pi-maghrib.png',isha:'pi-isha.png'};
 const rows=['fajr','sunrise','dhuhr','asr','maghrib','isha'].map(k=>`<div class="prow ${k===nx?'pnext':''}"><span class="pchev">‹</span><div class="ptime">${fmt(T.ms[k],T.tz)}</div><div class="pname"><img class="pico" src="${PIC[k]}" alt=""> ${PN[k]}</div></div>`).join('');
 const vs=PK.map(k=>`<div class="sr" style="cursor:default"><div class="nm" style="font-size:16px;flex:none;width:60px">${PN[k]}</div><select class="chip" style="flex:1;min-width:0" onchange="VS['${k}']=this.value;sv('voices',VS);vwarn()">${Object.entries(VOICES).map(([id,v])=>`<option value="${id}" ${VS[k]===id?'selected':''}>${v.n}</option>`).join('')}</select><button class="lb" onclick="testAdhan('${k}')">▶</button></div>`).join('');
 const greg=new Date().toLocaleDateString('ar',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
 app.innerHTML=`<div class="z pdate"><div style="display:flex;justify-content:space-between;align-items:center"><div><b id="locName" style="color:var(--gold);font-size:17px">${esc(LOC.name)}</b><div class="d" style="color:#f3e3b0">${greg}</div><div class="d" style="color:#f3e3b0">${hij}</div>${T.srcLabel?`<div class="d" style="color:#b9d9a0;font-size:12px">${T.srcLabel}</div>`:''}</div><div style="display:flex;align-items:center;gap:8px"><img class="calico" src="pi-cal.png" alt=""><button class="chip" onclick="locationPage()">تغيير الموقع</button></div></div></div>
 ${rows}
 <div class="cdwrap"><div class="cdplaque"><div style="font-size:14px;color:#f3e3b0">✦ متبقي على صلاة ${PN[nx]} ✦</div><div style="display:flex;justify-content:center;align-items:center;gap:8px"><div id="cd" style="font-size:30px;font-weight:700;direction:ltr;color:var(--gold)"></div><span style="color:#e1be72;font-size:22px">🕐</span></div></div></div>${locControls()}
 <div class="cat">طريقة الحساب</div><select class="chip" style="width:100%" onchange="METHOD=this.value;sv('method',METHOD);prayer()">${METH.map(m=>`<option value="${m[0]}" ${m[0]===METHOD?'selected':''}>${m[1]}</option>`).join('')}</select>
 <div class="cat">الأذان والإشعارات</div>
 <div class="z"><label style="display:flex;gap:10px;align-items:center;font-size:16px"><input type="checkbox" ${ADHAN_ON?'checked':''} onchange="ADHAN_ON=this.checked;sv('adhanOn',ADHAN_ON);if(ADHAN_ON)askNotif()"> تفعيل الأذان والإشعار عند دخول الوقت</label>
 <label style="display:flex;gap:10px;align-items:center;font-size:16px;margin-top:10px"><input type="checkbox" onchange="keepAwake(this.checked)"> إبقاء الشاشة مفتوحة (ليعمل الأذان)</label>
 <div class="d" style="margin-top:10px;line-height:1.8">⚠️ حدود المتصفح: الأذان والإشعار يعملان فقط والتطبيق مفتوح (حتى لو في الخلفية قليلاً). إذا أُغلق التطبيق أو قُفلت الشاشة لفترة قد لا يصل شيء، خاصة على الآيفون. للأذان المضمون نحتاج نسخة أندرويد (APK).</div></div>
 <div class="cat">اختيار المؤذن / المقام لكل صلاة</div>${vs}<div id="vw" class="d"></div>`;
 vwarn();tickCd(nt)}
function vwarn(){const e=$('#vw');if(!e)return;e.textContent=VS.fajr!=='doha'&&VS.fajr!=='none'?'ملاحظة: تسجيل هذا المؤذن/المقام لا يتضمن "الصلاة خير من النوم" للفجر. اختر مؤذن الدوحة للفجر إن أردتها.':''}
let cdT=null;function tickCd(nt){clearInterval(cdT);const f=()=>{const e=$('#cd');if(!e){clearInterval(cdT);return}let s=Math.max(0,Math.round((nt-Date.now())/1000));e.textContent=[Math.floor(s/3600),Math.floor(s%3600/60),s%60].map(x=>String(x).padStart(2,'0')).join(':');if(s===0){clearInterval(cdT);setTimeout(prayer,3000)}};f();cdT=setInterval(f,1000)}
function askNotif(){if('Notification'in window&&Notification.permission==='default')Notification.requestPermission()}
async function keepAwake(on){try{if(on){wake=await navigator.wakeLock.request('screen')}else if(wake){wake.release();wake=null}}catch(e){alert('المتصفح لا يدعم إبقاء الشاشة')}}
function playAdhan(k){if(!APP_SOUND){soundBlocked();return}const id=VS[k],v=VOICES[id];if(!v||!v.u)return;if(adAu)adAu.pause();adAu=new Audio(v.u(k));adAu.play().catch(()=>{});showStop(k)}
function testAdhan(k){playAdhan(k)}
function showStop(k){let b=$('#adbar');if(!b){b=document.createElement('div');b.id='adbar';b.style.cssText='position:fixed;top:70px;left:10px;right:10px;background:#d4af37;color:#222;border-radius:12px;padding:12px;z-index:20;display:flex;align-items:center;gap:10px;font-weight:700';document.body.appendChild(b)}
 b.innerHTML=`<span style="flex:1">🕌 أذان ${PN[k]}</span><button style="border:0;border-radius:8px;padding:8px 14px;background:#0b5d3b;color:#fff" onclick="stopAdhan()">إيقاف</button>`;if(adAu)adAu.onended=stopAdhan}
function stopAdhan(){if(adAu){adAu.pause();adAu=null}const b=$('#adbar');if(b)b.remove()}
async function notify(k){if(!('Notification'in window)||Notification.permission!=='granted')return;try{const r=await navigator.serviceWorker.getRegistration();const o={body:'حان الآن وقت صلاة '+PN[k],icon:'icon-192.png',tag:'adhan-'+k};r?r.showNotification('🕌 '+PN[k],o):new Notification('🕌 '+PN[k],o)}catch(e){}}
setInterval(()=>{if(!ADHAN_ON||!TODAY)return;const n=Date.now();PK.forEach(k=>{const t=TODAY.ms[k];if(n>=t&&n<t+60000){const id=dk(new Date())+k;if(!fired[id]){fired[id]=1;sv('fired',fired);notify(k);if(APP_SOUND)playAdhan(k)}}})},1000);
if(LOC)refreshToday();
setInterval(()=>{if(LOC&&TODAY&&Date.now()>TODAY.ms.isha+3600e3)refreshToday()},600000);
/* qibla */
const KAABA=[21.4225,39.8262];
function qBearing(la,lo){const r=Math.PI/180,p1=la*r,p2=KAABA[0]*r,dl=(KAABA[1]-lo)*r;const y=Math.sin(dl)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl);return(Math.atan2(y,x)/r+360)%360}
function qDist(la,lo){const r=Math.PI/180,dl=(KAABA[1]-lo)*r,a=Math.sin((KAABA[0]-la)*r/2)**2+Math.cos(la*r)*Math.cos(KAABA[0]*r)*Math.sin(dl/2)**2;return Math.round(6371*2*Math.asin(Math.sqrt(a)))}
let qHead=null,qHandler=null,qTimer=null,qRaw=null,qOffset=null,qMode='static',qLast=0;
function norm(a){return (a%360+360)%360}
function screenAngle(){return Number(screen.orientation?.angle??window.orientation??0)||0}
function qStop(){if(qHandler){window.removeEventListener('deviceorientationabsolute',qHandler,true);window.removeEventListener('deviceorientation',qHandler,true)}qHandler=null;clearTimeout(qTimer);qMode='static';qRaw=null;qOffset=null;qHead=null}
window.addEventListener('hashchange',()=>{qStop();if(typeof qCamStop==='function')qCamStop()});
function qibla(){qStop();setT('اتجاه القبلة',1);
 if(!LOC){locationPage();return}
 const b=qBearing(LOC.lat,LOC.lon);
 app.innerHTML=`<div class="z" style="text-align:center"><b id="locName">${esc(LOC.name)}</b><div class="d">اتجاه القبلة: ${b.toFixed(1)}° من الشمال باتجاه عقارب الساعة (المسافة ${qDist(LOC.lat,LOC.lon)} كم)</div></div>${locControls()}${mapMarkup('qibla')}
 <div style="position:relative;width:250px;height:250px;margin:20px auto;border-radius:50%;border:6px solid var(--gold);background:var(--card)"><div id="dial" style="position:absolute;inset:0"><div style="position:absolute;top:4px;left:50%;transform:translateX(-50%);font-weight:700;color:var(--gold)">N · شمال</div><div id="needle" style="position:absolute;left:50%;top:18px;bottom:50%;width:0;transform-origin:50% 100%"><div style="position:absolute;left:-15px;top:0;font-size:30px;color:var(--gold)">▲</div><div style="position:absolute;left:-2px;top:34px;bottom:0;width:4px;background:var(--gold);border-radius:2px"></div></div></div><div style="position:absolute;left:50%;top:50%;width:14px;height:14px;margin:-7px;border-radius:50%;background:var(--gold)"></div></div>
 <div id="qs" role="status" aria-live="polite" style="text-align:center;font-size:16px;line-height:1.9"></div>
 <div class="cnt"><button onclick="qStart()">تشغيل / إعادة تشغيل البوصلة</button><button onclick="qiblaCam()">▣ القبلة بالكاميرا (تجريبي)</button></div>
 <div id="relativeControls" hidden class="z"><p>الحساس يعطي دوراناً نسبياً فقط، ولا يعرف الشمال. لتجربته: وجّه أعلى الشاشة نحو الشمال باستخدام بوصلة موثوقة، ثم اضغط الزر. بدون هذه الخطوة يبقى السهم ثابتاً.</p><button onclick="qAlignNorth()">أعلى الشاشة نحو الشمال الآن</button></div>
 <div class="d" style="margin-top:12px;line-height:1.9;text-align:center">ضع الهاتف أفقياً والشاشة للأعلى، بعيداً عن المعادن والمغناطيس. للمعايرة حرّك الهاتف بشكل الرقم 8. الزاوية محسوبة من موقعك، لكن دقة الحساس ليست مضمونة وقد يستخدم الشمال المغناطيسي. عند غياب الحساس: السهم ثابت، أعلى الرسم هو الشمال، وليس اتجاه الهاتف. حدد الشمال ببوصلة موثوقة ثم اتبع الزاوية. <a href="#prayer">اختيار الموقع على الخريطة</a>.</div>`;
 initLocationMap('qibla');rotNeedle(b,null);qText('سهم ثابت: أعلى الرسم شمال. اضغط تشغيل البوصلة لتجربة حساس الهاتف.');
 if(LOC.gps&&(!LOC.timestamp||Date.now()-LOC.timestamp>900000))locStatus('هذا موقع محفوظ قديم. اضغط تحديث الموقع للحصول على موقعك الحالي.');
}
function qText(t){const e=$('#qs');if(e)e.textContent=t}
function rotNeedle(b,h){const n=$('#needle');if(!n)return;n.style.transform=`rotate(${b}deg)`;const d=$('#dial');if(d)d.style.transform=`rotate(${h==null?0:-h}deg)`;
 if(h!=null){const diff=Math.abs(norm(b-h+180)-180);const prefix=qMode==='relative'?'دوران نسبي بعد ضبط الشمال يدوياً · ':'';qText(prefix+`اتجاه أعلى الشاشة ${Math.round(h)}° · الفرق ${Math.round(diff)}°`+(diff<5?' · قريب من القبلة (بحسب الحساس)':''));}}
function qAlignNorth(){if(qRaw==null){qText('لم تصل بيانات دوران صالحة بعد. السهم ثابت.');return}qOffset=-norm(qRaw+screenAngle());qMode='relative';qHead=0;rotNeedle(qBearing(LOC.lat,LOC.lon),0)}
async function qStart(){qStop();if(!LOC)return;const b=qBearing(LOC.lat,LOC.lon);rotNeedle(b,null);
 if(!window.isSecureContext){qText(LOC_ERRORS.secure);return}
 if(typeof DeviceOrientationEvent==='undefined'){qText('هذا المتصفح لا يدعم حساس الاتجاه. السهم ثابت؛ استخدم زاوية القبلة من الشمال.');return}
 qText('جاري انتظار حساس البوصلة...');
 try{if(typeof DeviceOrientationEvent.requestPermission==='function'){const r=await DeviceOrientationEvent.requestPermission(true);if(r!=='granted'){qText('إذن حساس الاتجاه مرفوض. فعّل إذن الحركة والاتجاه في إعدادات Safari ثم أعد التشغيل. السهم ثابت.');return}}}catch(e){qText('تعذر طلب إذن الحساس. اضغط زر تشغيل البوصلة مباشرة، وراجع إذن الحركة والاتجاه في المتصفح. السهم ثابت.');return}
 if(!$('#needle'))return;qLast=Date.now();
 qHandler=e=>{if(!$('#needle')){qStop();return}let hd=null,absolute=false;
 if(Number.isFinite(e.webkitCompassHeading)&&e.webkitCompassHeading>=0){if(Number.isFinite(e.webkitCompassAccuracy)&&(e.webkitCompassAccuracy<0||e.webkitCompassAccuracy>50)){qText('الحساس غير معاير أو ضعيف الدقة. حرّك الهاتف بشكل 8 وابتعد عن المعادن. السهم ثابت.');rotNeedle(b,null);return}hd=e.webkitCompassHeading;absolute=true}
 else if(Number.isFinite(e.alpha)){hd=norm(360-e.alpha);absolute=e.absolute===true||e.type==='deviceorientationabsolute'}
 if(hd==null)return;
 if(!absolute){if(qMode==='absolute')return;qRaw=hd;const c=$('#relativeControls');if(c)c.hidden=false;if(qOffset==null){qText('وصل حساس دوران نسبي، لا يحدد الشمال. السهم ثابت؛ استخدم الزاوية أو اضبط الشمال يدوياً أدناه.');return}hd=norm(hd+screenAngle()+qOffset);qMode='relative'}
 else{qMode='absolute';qOffset=null;const c=$('#relativeControls');if(c)c.hidden=true;hd=norm(hd+screenAngle())}
 qHead=hd;qLast=Date.now();rotNeedle(b,hd);
 };
 window.addEventListener('deviceorientationabsolute',qHandler,true);window.addEventListener('deviceorientation',qHandler,true);
 qTimer=setInterval(()=>{if(!$('#needle')){qStop();return}if(Date.now()-qLast>4500){rotNeedle(b,null);if(qRaw==null)qText('لم تصل بيانات بوصلة. قد يكون الحساس غائباً أو محظوراً: في Chrome فعّل إعدادات المواقع ← حساسات الحركة. السهم ثابت؛ استخدم الزاوية من الشمال.');else if(qOffset!=null)qText('توقفت بيانات الحساس. السهم ثابت؛ أعد تشغيل البوصلة.')}},1500);
}

/* Map UI: only viewport tiles, standard browser HTTP cache, no offline tile download. */
let locationMap=null,mapPin=null,mapAccuracy=null,mapCandidate=null,mapKind=null;
const MAP_TILES='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
function mapMarkup(kind){return `<div class="z"><b>${kind==='qibla'?'القبلة على الخريطة':'اختر موقعك على الخريطة'}</b><div class="d" style="line-height:1.8">${kind==='qibla'?'الخريطة ثابتة نحو الشمال. الخط والسهم من موقعك باتجاه الكعبة، لا يمثلان اتجاه الهاتف.':'اضغط على مكانك أو اسحب العلامة، ثم اضغط حفظ الموقع. يمكنك تحريك الخريطة وتكبيرها.'}</div><div id="locationMap" style="height:310px;margin-top:12px;border-radius:10px;direction:ltr;isolation:isolate"></div><div id="mapStatus" class="d" role="status" style="line-height:1.8"></div>${kind==='qibla'?'<div class="cnt"><button onclick="showKaabaRoute()">عرض المسار إلى الكعبة</button><button onclick="locationPage()">اختيار الموقع على الخريطة</button></div>':'<div id="mapCoords" class="d" style="direction:ltr;text-align:center"></div><div class="cnt"><button id="saveMap" disabled onclick="saveMapLocation()">حفظ الموقع المختار</button></div>'}<div class="d">الخريطة تحتاج الإنترنت. الموقع المحفوظ وزاوية القبلة يبقيان متاحين دون خريطة. <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener">الإبلاغ عن مشكلة بالخريطة</a></div></div>`}
function mapStatus(t){const e=$('#mapStatus');if(e)e.textContent=t}
function pinIcon(){return L.divIcon({className:'map-pin',html:'<div style="width:22px;height:22px;background:#087f80;border:3px solid white;border-radius:50%;box-shadow:0 1px 5px #222"></div>',iconSize:[28,28],iconAnchor:[14,14]})}
function initLocationMap(kind){if(locationMap){locationMap.remove();locationMap=null}mapPin=null;mapAccuracy=null;mapCandidate=null;mapKind=kind;const e=$('#locationMap');if(!e)return;if(typeof L==='undefined'){mapStatus('جاري تحميل الخريطة...');loadLeaflet().then(()=>{if(document.getElementById('locationMap'))initLocationMap(kind)}).catch(()=>{const x=$('#locationMap');if(x)x.style.height='auto';mapStatus('تعذر تحميل مكتبة الخريطة. أعد فتح التطبيق متصلاً؛ الموقع وزاوية القبلة لا يحتاجان الخريطة.')});return}
 locationMap=L.map(e,{zoomControl:true,maxZoom:19,minZoom:2}).setView(LOC?[LOC.lat,LOC.lon]:[20,20],LOC?14:2);
 if(navigator.onLine){const tiles=L.tileLayer(MAP_TILES,{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',updateWhenIdle:true,keepBuffer:1});let errors=0;tiles.on('tileerror',()=>{if(++errors>1)mapStatus('تعذر تحميل خلفية الخريطة. تحقق من الإنترنت؛ العلامة والخط يظهران فوق خلفية فارغة.')});tiles.on('load',()=>{if(!errors)mapStatus('الخريطة جاهزة. أعلى الخريطة هو الشمال.')});tiles.addTo(locationMap)}else mapStatus('أنت دون اتصال: خلفية الخريطة غير متاحة. يظهر الموقع المحفوظ والخط فقط؛ لا تُنزّل الخرائط للعمل دون إنترنت.');
 if(LOC){setMapPoint(LOC.lat,LOC.lon,false);if(LOC.gps&&Number.isFinite(LOC.accuracy))mapAccuracy=L.circle([LOC.lat,LOC.lon],{radius:LOC.accuracy,color:'#087f80',fillOpacity:.12,weight:1}).addTo(locationMap)}
 if(kind==='picker'){locationMap.on('click',e=>setMapPoint(e.latlng.lat,e.latlng.lng,true))}else if(LOC)drawQiblaMap(false);
}
function setMapPoint(lat,lon,manual){if(!locationMap)return;lat=Math.max(-85,Math.min(85,lat));lon=norm(lon+180)-180;mapCandidate={lat,lon,manual};if(mapPin)mapPin.setLatLng([lat,lon]);else{mapPin=L.marker([lat,lon],{icon:pinIcon(),draggable:mapKind==='picker'}).addTo(locationMap);mapPin.on('dragend',()=>{const a=mapPin.getLatLng();setMapPoint(a.lat,a.lng,true)})}if(manual&&mapAccuracy){mapAccuracy.remove();mapAccuracy=null}const c=$('#mapCoords');if(c)c.textContent=lat.toFixed(6)+', '+lon.toFixed(6);const b=$('#saveMap');if(b)b.disabled=false}
function saveMapLocation(){if(!mapCandidate)return;const c=mapCandidate;LOC={lat:c.lat,lon:c.lon,name:'موقع مختار على الخريطة',gps:false,map:true,timestamp:Date.now()};sv('loc',LOC);if(location.hash.includes('qibla'))qibla();else prayer()}
function qDestination(la,lo,b,km){const r=Math.PI/180,d=km/6371,p=la*r,l=lo*r,t=b*r;const p2=Math.asin(Math.sin(p)*Math.cos(d)+Math.cos(p)*Math.sin(d)*Math.cos(t));const l2=l+Math.atan2(Math.sin(t)*Math.sin(d)*Math.cos(p),Math.cos(d)-Math.sin(p)*Math.sin(p2));return [p2/r,norm(l2/r+180)-180]}
let qMapLayers=[];
function drawQiblaMap(full){if(!locationMap||!LOC)return;qMapLayers.forEach(l=>l.remove());qMapLayers=[];const b=qBearing(LOC.lat,LOC.lon),total=qDist(LOC.lat,LOC.lon),dist=full?total:Math.min(total,1.2);const line=[];for(let i=0;i<=32;i++)line.push(qDestination(LOC.lat,LOC.lon,b,dist*i/32));if(full)line[line.length-1]=KAABA;
 qMapLayers.push(L.polyline(line,{color:'#9b6500',weight:5,opacity:.95}).addTo(locationMap));const tip=line.at(-1),prev=line.at(-2);const hd=qBearingBetween(prev,tip);const size=full?Math.max(5,total*.025):.12;const wing1=qDestination(tip[0],tip[1],hd+150,size),wing2=qDestination(tip[0],tip[1],hd-150,size);qMapLayers.push(L.polygon([tip,wing1,wing2],{color:'#9b6500',fillColor:'#d6a928',fillOpacity:1}).addTo(locationMap));if(full){qMapLayers.push(L.marker(KAABA,{icon:L.divIcon({className:'kaaba-label',html:'<span style="background:white;color:#111;padding:3px;border:1px solid #555;white-space:nowrap">🕋 الكعبة</span>',iconSize:[65,24]})}).addTo(locationMap));locationMap.fitBounds(L.latLngBounds(line),{padding:[35,35]})}}
function qBearingBetween(a,b){const r=Math.PI/180,p1=a[0]*r,p2=b[0]*r,dl=(b[1]-a[1])*r;return norm(Math.atan2(Math.sin(dl)*Math.cos(p2),Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl))/r)}
function showKaabaRoute(){drawQiblaMap(true)}

function enterWithLocation(){playGreeting('enter');document.querySelector('#dedication')?.remove();document.querySelector('#entryLocation')?.remove();if(LOC){route();quietLocationRefresh();return}if(!$('#locStatus')){const box=document.createElement('div');box.id='entryGPS';box.innerHTML=locControls();app.prepend(box)}getLoc(()=>route(),code=>{locStatus(LOC_ERRORS[code]||LOC_ERRORS.unavailable);const e=$('#entryGPS');if(e)e.insertAdjacentHTML('beforeend','<button class="chip" onclick="locationPage()">اختيار الموقع على الخريطة</button>')})}
let quietGPSBusy=false;
async function quietLocationRefresh(){if(!LOC||!LOC.gps||locBusy||quietGPSBusy||!navigator.geolocation||!navigator.permissions)return;if(LOC.timestamp&&Date.now()-LOC.timestamp<900000)return;const saved=LOC;try{const permission=await Promise.race([navigator.permissions.query({name:'geolocation'}),new Promise(r=>setTimeout(()=>r(null),1500))]);if(!permission||permission.state!=='granted')return;quietGPSBusy=true;navigator.geolocation.getCurrentPosition(p=>{quietGPSBusy=false;if(LOC!==saved||locBusy)return;const lat=p.coords.latitude,lon=p.coords.longitude;if(!Number.isFinite(lat)||!Number.isFinite(lon))return;const moved=Math.abs(lat-saved.lat)+Math.abs(lon-saved.lon)>.02;LOC={...saved,lat,lon,accuracy:p.coords.accuracy,timestamp:p.timestamp||Date.now(),approx:false,name:moved?'موقعك الحالي':saved.name};sv('loc',LOC);const page=location.hash||'#home';if(page==='#home'){if(typeof updateHomePrayer==='function')updateHomePrayer();else if(typeof updateSimpleHomePrayer==='function')updateSimpleHomePrayer()}},()=>{quietGPSBusy=false},{enableHighAccuracy:true,timeout:10000,maximumAge:60000})}catch(e){quietGPSBusy=false}}

function showEntryLocationPrompt(){if(LOC){quietLocationRefresh();return}if(document.querySelector('#entryLocation'))return;const e=document.createElement('div');e.id='entryLocation';e.setAttribute('role','dialog');e.innerHTML='<div class="z"><h3>تحديد موقعك</h3><p>اسمح بالموقع لتحديد القبلة ومواقيت الصلاة، أو اختره على الخريطة. يُحفظ موقعك ويُستخدم عند الفتح؛ لا نطلبه في كل مرة. يمكنك تحديثه يدوياً ولا يلزم كتابة المدينة.</p><div class="cnt"><button onclick="enterWithLocation()">تفعيل الموقع</button><button onclick="document.querySelector(\'#entryLocation\').remove()">لاحقاً</button></div></div>';document.body.appendChild(e)}

function gpsNotice(t){let e=document.querySelector('#gpsFeedback');if(!e){e=document.createElement('div');e.id='gpsFeedback';e.setAttribute('role','status');e.style.cssText='position:fixed;top:66px;left:10px;right:10px;z-index:1000;background:#153457;color:white;border:1px solid #e1be72;border-radius:10px;padding:12px;font-size:15px;line-height:1.7;pointer-events:none';document.body.appendChild(e)}e.textContent=t;clearTimeout(gpsNotice.timer);gpsNotice.timer=setTimeout(()=>e.remove(),10000)}
function gpsTapFeedback(){gpsNotice('⏳ تم الضغط: جاري طلب موقعك...');document.querySelectorAll('[data-gps]').forEach(b=>{b.textContent='⏳ جاري تحديد الموقع...';b.setAttribute('aria-busy','true')})}
function gpsDone(){document.querySelectorAll('[data-gps]').forEach(b=>{b.textContent='📍 تفعيل / تحديث الموقع';b.removeAttribute('aria-busy')})}

let APP_SOUND=g('appSound',true);
function soundBlocked(){alert('الصوت مكتوم. فعّله من إعدادات الصوت إذا أردت الاستماع.')}
function setAppSound(on){APP_SOUND=on;sv('appSound',on);document.querySelectorAll('audio,video').forEach(a=>{a.muted=!on;if(!on)a.pause()});if(!on)stopAdhan()}
function soundSettingsHTML(){return `<div class="z"><h3>الصوت</h3><label style="display:flex;gap:10px;align-items:center;line-height:1.9"><input type="checkbox" ${APP_SOUND?'checked':''} onchange="setAppSound(this.checked)"> السماح بتشغيل الصوت</label><label style="display:flex;gap:10px;align-items:center;line-height:1.9"><input type="checkbox" ${GREET_SOUND?'checked':''} onchange="setGreetSound(this.checked)"> صوت الدخول والخروج</label><p class="d">عند فتح التطبيق والدخول إليه: «صلّوا على الحبيب محمد»، وعند الخروج منه: «لا تنسى ذكر الله». صوت الخروج قد لا يكتمل إذا أُغلق التطبيق فجأة؛ هذا حدّ المتصفح. عند الكتم تتوقف التلاوة والأذكار والأذان وهذه الأصوات. الأذان التلقائي لا يعمل إلا إذا فعّلته من المواقيت، وقد يمنعه المتصفح أو يتوقف عند إغلاق التطبيق.</p><div class="chips"><button class="chip" onclick="previewGreeting('enter')">▶ تجربة صوت الدخول</button><button class="chip" onclick="previewGreeting('exit')">▶ تجربة صوت الخروج</button></div><a href="#prayer">إعدادات الأذان</a></div>`}
window.addEventListener('DOMContentLoaded',()=>document.querySelectorAll('audio,video').forEach(a=>a.muted=!APP_SOUND));

let GREET_SOUND=g('greetSound',true),greetEnterDone=false,exitGreetDone=false,lastExitGreet=0;
function greetEl(){return document.getElementById('greetAu')}
function playGreeting(kind){if(!APP_SOUND||!GREET_SOUND)return;const au=greetEl();if(!au)return;const q=document.getElementById('au');if(q&&!q.paused)return;if(kind==='enter'){if(greetEnterDone)return;greetEnterDone=true}else{if(exitGreetDone)return;exitGreetDone=true}try{au.src='sounds/'+(kind==='enter'?'enter':'exit')+'.mp3';au.muted=false;au.volume=1;const pr=au.play();if(pr&&pr.catch)pr.catch(()=>{});(window.__greetLog=window.__greetLog||[]).push({kind,at:Date.now()})}catch(e){}}
function setGreetSound(on){GREET_SOUND=on;sv('greetSound',on);const au=greetEl();if(au&&!on)au.pause()}
function previewGreeting(kind){if(!APP_SOUND){soundBlocked();return}const au=greetEl();if(!au)return;try{au.src='sounds/'+(kind==='enter'?'enter':'exit')+'.mp3';au.muted=false;au.volume=1;const pr=au.play();if(pr&&pr.catch)pr.catch(()=>{})}catch(e){}}
window.addEventListener('pagehide',()=>{exitGreetDone=false;playGreeting('exit')});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){const n=Date.now();if(n-lastExitGreet>60000){lastExitGreet=n;exitGreetDone=false;playGreeting('exit')}}else exitGreetDone=false});

document.addEventListener('play',e=>{if(!APP_SOUND&&e.target instanceof HTMLMediaElement){e.target.muted=true;e.target.pause()}},true);


let qCamStream=null,qCamHandler=null;
function qCamStop(){if(qCamStream){qCamStream.getTracks().forEach(t=>t.stop());qCamStream=null}if(qCamHandler){window.removeEventListener('deviceorientationabsolute',qCamHandler,true);window.removeEventListener('deviceorientation',qCamHandler,true);qCamHandler=null}const e=document.getElementById('qcam');if(e)e.remove()}
async function qiblaCam(){if(!LOC){locationPage();return}if(!window.isSecureContext){alert('الكاميرا تحتاج اتصالاً آمناً');return}
 try{if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){const r=await DeviceOrientationEvent.requestPermission(true);if(r!=='granted'){alert('إذن حساس الاتجاه مرفوض؛ فعّل إذن الحركة والاتجاه من إعدادات المتصفح ثم أعد المحاولة');return}}}catch(e){}
 let stream;try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false})}catch(e){alert('تعذر فتح الكاميرا؛ امنح الإذن وأعد المحاولة. البوصلة العادية تعمل بدون كاميرا.');return}
 qCamStop();qCamStream=stream;const b=qBearing(LOC.lat,LOC.lon);
 const ov=document.createElement('div');ov.id='qcam';ov.style.cssText='position:fixed;inset:0;z-index:1002;background:#000;direction:rtl';
 ov.innerHTML='<video id="qcamv" autoplay playsinline muted style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"></video>'
 +'<div id="qcamMarker" style="position:absolute;top:38%;left:50%;transform:translate(-50%,-50%);text-align:center;transition:left .15s linear;opacity:.35"><div style="font-size:46px;filter:drop-shadow(0 0 6px #000)">🕋</div><div style="background:#000b;color:#fff;font-size:13px;padding:3px 10px;border-radius:8px">القبلة</div></div>'
 +'<div style="position:absolute;left:50%;top:30%;transform:translateX(-50%);width:2px;height:40%;background:#ffffff55"></div>'
 +'<div id="qcamInfo" style="position:absolute;bottom:74px;left:0;right:0;text-align:center;color:#fff;text-shadow:0 1px 4px #000;font-size:15px;line-height:1.9;padding:0 16px">بانتظار حساس الاتجاه... القبلة عند '+b.toFixed(1)+'° من الشمال</div>'
 +'<div style="position:absolute;bottom:26px;left:0;right:0;text-align:center;color:#fffc;font-size:12px;text-shadow:0 1px 3px #000;padding:0 20px">تجريبي: الدقة تعتمد على حساس الهاتف وقد تختلف درجات؛ للصلاة تحقق ببوصلة معايرة. حرّك الهاتف بشكل 8 للمعايرة.</div>'
 +'<button onclick="qCamStop()" style="position:absolute;top:14px;left:14px;z-index:2">✕ إغلاق</button>';
 document.body.appendChild(ov);document.getElementById('qcamv').srcObject=stream;
 qCamHandler=e=>{let hd=null;if(Number.isFinite(e.webkitCompassHeading)&&e.webkitCompassHeading>=0)hd=e.webkitCompassHeading;else if(Number.isFinite(e.alpha))hd=norm(360-e.alpha);if(hd==null)return;const head=norm(hd+screenAngle());
  const diff=((b-head+540)%360)-180;const m=document.getElementById('qcamMarker');const info=document.getElementById('qcamInfo');if(!m){qCamStop();return}
  const w=window.innerWidth;const x=w/2+Math.max(-(w/2-30),Math.min(w/2-30,diff/60*w));m.style.left=x+'px';
  const aligned=Math.abs(diff)<=4;m.style.opacity=Math.abs(diff)>75?'0.35':'1';m.style.filter=aligned?'drop-shadow(0 0 12px #4dff88)':'';
  if(info)info.innerHTML=(aligned?'<b style="color:#7dff9b;font-size:18px">هذا اتجاه القبلة ✓</b>':(diff>0?'أدر هاتفك نحو اليمين ⬅ ':'أدر هاتفك نحو اليسار ➡ ')+Math.abs(diff).toFixed(0)+'°')+'<br>اتجاهك '+head.toFixed(0)+'° · القبلة '+b.toFixed(1)+'°'};
 window.addEventListener('deviceorientationabsolute',qCamHandler,true);window.addEventListener('deviceorientation',qCamHandler,true)}
