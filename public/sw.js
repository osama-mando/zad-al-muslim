const SHELL='zad-v161';
const DATA='zad-data-v1';
const AUDIO='zad-user-audio-v1';
const SHELL_FILES=['./','index.html','app2.js?v=161','extra.js?v=161','offline.js?v=161','chat.js?v=161','navy.css?v=161','manifest.json?v=161','icon-192-v18.png','icon-512-v18.png','icon-maskable-192-v18.png','icon-maskable-512-v18.png','apple-touch-icon-v18.png','vendor/leaflet.js','vendor/leaflet.css','pi-fajr.png?v=161','pi-shuruk.png?v=161','pi-duhr.png?v=161','pi-asr.png?v=161','pi-maghrib.png?v=161','pi-isha.png?v=161','pi-mosque.png?v=161','pi-cal.png?v=161','pray-footer-art.png?v=161','diyanet-konya-2026-11.json?v=161'];
const DATA_FILES=['quran-index.json','names.json','adhkar.json','radios.json','qduas.json','reciters.json','audio.json','media-map.json','media-manifest.json','fonts/arabic.ttf','quran/s001.json','quran/s002.json','quran/s003.json','quran/s004.json','quran/s005.json','quran/s006.json','quran/s007.json','quran/s008.json','quran/s009.json','quran/s010.json','quran/s011.json','quran/s012.json','quran/s013.json','quran/s014.json','quran/s015.json','quran/s016.json','quran/s017.json','quran/s018.json','quran/s019.json','quran/s020.json','quran/s021.json','quran/s022.json','quran/s023.json','quran/s024.json','quran/s025.json','quran/s026.json','quran/s027.json','quran/s028.json','quran/s029.json','quran/s030.json','quran/s031.json','quran/s032.json','quran/s033.json','quran/s034.json','quran/s035.json','quran/s036.json','quran/s037.json','quran/s038.json','quran/s039.json','quran/s040.json','quran/s041.json','quran/s042.json','quran/s043.json','quran/s044.json','quran/s045.json','quran/s046.json','quran/s047.json','quran/s048.json','quran/s049.json','quran/s050.json','quran/s051.json','quran/s052.json','quran/s053.json','quran/s054.json','quran/s055.json','quran/s056.json','quran/s057.json','quran/s058.json','quran/s059.json','quran/s060.json','quran/s061.json','quran/s062.json','quran/s063.json','quran/s064.json','quran/s065.json','quran/s066.json','quran/s067.json','quran/s068.json','quran/s069.json','quran/s070.json','quran/s071.json','quran/s072.json','quran/s073.json','quran/s074.json','quran/s075.json','quran/s076.json','quran/s077.json','quran/s078.json','quran/s079.json','quran/s080.json','quran/s081.json','quran/s082.json','quran/s083.json','quran/s084.json','quran/s085.json','quran/s086.json','quran/s087.json','quran/s088.json','quran/s089.json','quran/s090.json','quran/s091.json','quran/s092.json','quran/s093.json','quran/s094.json','quran/s095.json','quran/s096.json','quran/s097.json','quran/s098.json','quran/s099.json','quran/s100.json','quran/s101.json','quran/s102.json','quran/s103.json','quran/s104.json','quran/s105.json','quran/s106.json','quran/s107.json','quran/s108.json','quran/s109.json','quran/s110.json','quran/s111.json','quran/s112.json','quran/s113.json','quran/s114.json'];
const AUDIO_HOSTS=['d1.islamhouse.com'];
const QURAN_HOSTS=['cdn.mp3quran.net','cdn.islamic.network','everyayah.com','www.everyayah.com'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(SHELL).then(c=>c.addAll(SHELL_FILES)).catch(()=>{}))});
self.addEventListener('activate',e=>e.waitUntil((async()=>{
  const ks=await caches.keys();
  await Promise.all(ks.filter(x=>(x.startsWith('zad-v')&&x!==SHELL)||(x.startsWith('zad-data-')&&x!==DATA)).map(x=>caches.delete(x)));
  // conditional refresh of data files: 304 costs ~0 bytes, downloads only what changed
  try{const c=await caches.open(DATA);
    const one=async f=>{try{
      const old=await c.match(f);const h={};
      if(old){const et=old.headers.get('etag');const lm=old.headers.get('last-modified');if(et)h['If-None-Match']=et;else if(lm)h['If-Modified-Since']=lm}
      const r=await fetch(f,{headers:h,cache:'no-cache'});
      if(r.status===200)await c.put(f,r);
    }catch(e){}};
    for(let i=0;i<DATA_FILES.length;i+=6)await Promise.all(DATA_FILES.slice(i,i+6).map(one));
  }catch(e){}
  // self-heal: the precache during install may have been answered by the old
  // active worker's cache-first handler (stale content); re-fetch everything fresh.
  try{const c2=await caches.open(SHELL);
    for(const f of SHELL_FILES){try{const r=await fetch(f+(f.indexOf('?')>=0?'&':'?')+'_sh='+Date.now(),{cache:'reload'});if(r&&r.ok)await c2.put(f,r)}catch(e){}}
  }catch(e){}
  await clients.claim();
})()));
self.addEventListener('fetch',e=>{
  const req=e.request,u=new URL(req.url);
  if(req.method!=='GET')return;
  if(AUDIO_HOSTS.includes(u.hostname)){
    e.respondWith(caches.open(AUDIO).then(async c=>{
      const hit=await c.match(req,{ignoreSearch:true});
      if(hit)return hit;
      try{const r=await fetch(req);if(r.ok||r.type==='opaque')await c.put(req,r.clone()).catch(()=>{});return r}
      catch(err){return new Response('Offline resource unavailable',{status:503})}
    }));return}
  if(QURAN_HOSTS.includes(u.hostname)){
    e.respondWith(caches.open(AUDIO).then(async c=>{
      const hit=await c.match(req,{ignoreSearch:true});
      if(hit)return hit;
      try{return await fetch(req)}catch(err){return new Response('Offline resource unavailable',{status:503})}
    }));return}
  if(u.origin!==self.location.origin)return;
  if(u.pathname.includes('/download/')||u.pathname.endsWith('ver.json'))return;
  if(u.pathname.includes('/media/')||u.pathname.includes('/adhan/')||u.pathname.includes('/sounds/')){
    e.respondWith(caches.open(AUDIO).then(async c=>{
      const hit=await c.match(req,{ignoreSearch:true});
      if(hit)return hit;
      try{const r=await fetch(req);if(r.ok)await c.put(req,r.clone()).catch(()=>{});return r}
      catch(err){return new Response('Offline resource unavailable',{status:503})}
    }));return}
  if(req.mode==='navigate'){e.respondWith((async()=>{try{const r=await fetch(req);if(r.ok){try{const c=await caches.open(SHELL);await c.put('index.html',r.clone())}catch(e){}}return r}catch(err){const c=await caches.open(SHELL);const hit=await c.match('index.html');return hit||new Response('Offline resource unavailable',{status:503})}})());return}
  if(DATA_FILES.some(f=>u.pathname===('/'+f)||u.pathname.endsWith('/'+f))){
    e.respondWith(caches.open(DATA).then(async c=>{
      const hit=await c.match(req,{ignoreSearch:true})||await c.match(req.url.split('?')[0]);
      if(hit)return hit;
      try{const r=await fetch(req);if(r.ok)await c.put(req,r.clone()).catch(()=>{});return r}
      catch(err){return new Response('Offline resource unavailable',{status:503})}
    }));return}
  e.respondWith(caches.open(SHELL).then(async c=>{
    let hit=await c.match(req);
    if(!hit&&req.headers.has('range'))hit=await c.match(req.url);
    if(hit)return hit;
    try{const r=await fetch(req);if(r.ok&&r.status===200)await c.put(req,r.clone()).catch(()=>{});return r}
    catch(e2){return new Response('Offline resource unavailable',{status:503})}
  }));
});
self.addEventListener('message',e=>{if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting()});
