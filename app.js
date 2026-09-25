// Red Line Fishing - application JavaScript extracted from FINAL VERIFIED
const firebaseConfig={apiKey:"AIzaSyCKLRKGwp5XBtEmwjMdrmDWg7-9S29ixgA",authDomain:"red-line-fishing.firebaseapp.com",projectId:"red-line-fishing",storageBucket:"red-line-fishing.firebasestorage.app",messagingSenderId:"1029157660725",appId:"1:1029157660725:web:2e1d308de2163f887ca97c"};
firebase.initializeApp(firebaseConfig);
var auth=firebase.auth(),db=firebase.firestore();
var lang='fr',isDark=true,zoneMarkers=[],waveGroup=null,currentLat=36.8,currentLon=11.5,currentUser=null,favs=[];

function showAuthMsg(t,col){var err=document.getElementById('authError');err.textContent=t;err.classList.remove('hidden');err.style.color=col||'#ef4444'}
function authMsgFr(e){var c=e.code||'';
if(c.indexOf('email-already')>-1)return'⚠️ البريد مسجل — ادخل مباشرة / Déjà inscrit';
if(c.indexOf('invalid-email')>-1)return'⚠️ بريد غير صالح / E-mail invalide';
if(c.indexOf('weak-password')>-1)return'⚠️ كلمة السر 6 أحرف على الأقل / 6 caractères min';
if(c.indexOf('user-not-found')>-1)return'⚠️ بريد غير مسجل / Introuvable';
if(c.indexOf('wrong-password')>-1||c.indexOf('invalid-credential')>-1)return'⚠️ كلمة السر خاطئة / Mot de passe faux';
if(c.indexOf('too-many-requests')>-1)return'⚠️ محاولات كثيرة، انتظر / Trop de tentatives';
return'⚠️ '+e.message}
function authRegister(){auth.createUserWithEmailAndPassword(document.getElementById('authEmail').value.trim(),document.getElementById('authPass').value).catch(function(e){showAuthMsg(authMsgFr(e))})}
function authEnter(){auth.signInWithEmailAndPassword(document.getElementById('authEmail').value.trim(),document.getElementById('authPass').value).catch(function(e){showAuthMsg(authMsgFr(e))})}
function resetPass(){var e=document.getElementById('authEmail').value.trim();
if(!e){showAuthMsg('⚠️ اكتب بريدك أولاً / Écris ton e-mail');return}
auth.sendPasswordResetEmail(e).then(function(){showAuthMsg('📧 رابط الاستعادة أُرسل لبريدك','#22c55e')}).catch(function(e){showAuthMsg(authMsgFr(e))})}
function logoutUser(){auth.signOut()}
auth.onAuthStateChanged(function(u){
if(u){currentUser=u;
document.getElementById('authScreen').style.display='none';
document.getElementById('logoutBtn').classList.remove('hidden');
document.getElementById('userSlot').innerHTML='👤 <b>'+u.email.split('@')[0]+'</b>';
map.invalidateSize();loadFavs();
}else{currentUser=null;
document.getElementById('authScreen').style.display='flex';
document.getElementById('logoutBtn').classList.add('hidden')}});

var map=L.map('map',{zoomControl:false}).setView([36.8,11.5],7);
var satLayer=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{attribution:'Esri'}).addTo(map);
var darkLayer=L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{attribution:'CARTO'});
var oceanLayer=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',{attribution:'Esri Ocean'});
L.control.scale({position:'bottomleft'}).addTo(map);

function toggleOcean(){if(map.hasLayer(oceanLayer))map.removeLayer(oceanLayer);else map.addLayer(oceanLayer)}

function openSeaStatus(){var el=document.getElementById('seaStatusPanel');el.classList.remove('hidden');loadSeaStatus();setTimeout(function(){map.invalidateSize()},150)}

var tunisiaSeaPoints=[
  {nameAr:'بنزرت',nameFr:'Bizerte',lat:37.30,lon:9.90},
  {nameAr:'قليبية',nameFr:'Kélibia',lat:36.85,lon:11.10},
  {nameAr:'الحمامات',nameFr:'Hammamet',lat:36.40,lon:10.70},
  {nameAr:'سوسة',nameFr:'Sousse',lat:35.84,lon:10.65},
  {nameAr:'المنستير',nameFr:'Monastir',lat:35.76,lon:10.82},
  {nameAr:'المهدية',nameFr:'Mahdia',lat:35.50,lon:11.07},
  {nameAr:'صفاقس',nameFr:'Sfax',lat:34.74,lon:10.77},
  {nameAr:'قرقنة',nameFr:'Kerkennah',lat:34.72,lon:11.25},
  {nameAr:'قابس',nameFr:'Gabès',lat:33.88,lon:10.10},
  {nameAr:'جرجيس',nameFr:'Zarzis',lat:33.50,lon:11.12}
];

function seaState(h){
  if(h==null) return ['⚪','--','#94a3b8'];
  if(h<0.5) return ['🟢',lang==='ar'?'هادئ':'Calme','#22c55e'];
  if(h<1.0) return ['🟢',lang==='ar'?'خفيف':'Faible','#4ade80'];
  if(h<1.5) return ['🟡',lang==='ar'?'متوسط':'Modéré','#facc15'];
  if(h<2.0) return ['🟠',lang==='ar'?'مضطرب':'Agité','#fb923c'];
  return ['🔴',lang==='ar'?'قوي':'Fort','#ef4444'];
}

function seaDir(deg){
  if(deg==null) return '--';
  var a=lang==='ar'?['شمال','شمال شرقي','شرق','جنوب شرقي','جنوب','جنوب غربي','غرب','شمال غربي']:['N','NE','E','SE','S','SO','O','NO'];
  return a[Math.round(Number(deg)/45)%8];
}

async function loadSeaStatus(){
  var grid=document.getElementById('seaStatusGrid');
  var summary=document.getElementById('seaStatusSummary');
  grid.innerHTML='';
  summary.textContent=lang==='ar'?'⏳ جاري جلب حالة البحر...':'⏳ Chargement de l’état de la mer...';
  try{
    var lats=tunisiaSeaPoints.map(function(p){return p.lat}).join(',');
    var lons=tunisiaSeaPoints.map(function(p){return p.lon}).join(',');
    var url='https://marine-api.open-meteo.com/v1/marine?latitude='+lats+'&longitude='+lons+'&current=wave_height,wave_direction,wave_period,sea_surface_temperature&timezone=auto';
    var res=await fetch(url);
    if(!res.ok) throw new Error('marine '+res.status);
    var data=await res.json();
    var arr=Array.isArray(data)?data:[data];
    var good=0, valid=0;
    grid.innerHTML=arr.map(function(d,i){
      var p=tunisiaSeaPoints[i]||{};
      var c=d.current||{};
      var h=c.wave_height!=null?Number(c.wave_height):null;
      var st=seaState(h); if(h!=null){valid++;if(h<1.5)good++;}
      var temp=c.sea_surface_temperature!=null?Number(c.sea_surface_temperature).toFixed(1)+' °C':'--';
      var period=c.wave_period!=null?Number(c.wave_period).toFixed(1)+' s':'--';
      var dir=seaDir(c.wave_direction);
      return '<div class="rounded-xl p-3" style="background:#ffffff08;border:1px solid #ffffff10">'+
        '<div class="flex justify-between items-center gap-2"><b>📍 '+(lang==='ar'?p.nameAr:p.nameFr)+'</b><span style="color:'+st[2]+'">'+st[0]+' '+st[1]+'</span></div>'+
        '<div class="grid grid-cols-2 gap-2 mt-2 text-xs">'+
          '<div>🌊 <small class="text-gray-400">'+(lang==='ar'?'الموج':'Vagues')+'</small><br><b>'+ (h!=null?h.toFixed(2)+' m':'--') +'</b></div>'+
          '<div>🧭 <small class="text-gray-400">'+(lang==='ar'?'الاتجاه':'Direction')+'</small><br><b>'+dir+'</b></div>'+
          '<div>〰️ <small class="text-gray-400">'+(lang==='ar'?'الفترة':'Période')+'</small><br><b>'+period+'</b></div>'+
          '<div>🌡️ <small class="text-gray-400">'+(lang==='ar'?'حرارة البحر':'Temp. mer')+'</small><br><b>'+temp+'</b></div>'+
        '</div></div>';
    }).join('');
    var stamp=new Date().toLocaleTimeString(lang==='ar'?'ar-TN':'fr-TN',{hour:'2-digit',minute:'2-digit'});
    summary.textContent=(lang==='ar'?'🌊 البيانات الحالية • ':'🌊 Données actuelles • ')+stamp+(valid?' • '+good+'/'+valid+' '+(lang==='ar'?'نقاط ببحر أقل من 1.5م':'points avec vagues < 1,5 m'):'');
  }catch(e){
    summary.textContent=lang==='ar'?'❌ تعذر تحميل بيانات البحر.':'❌ Impossible de charger les données marines.';
    grid.innerHTML='<div class="text-sm text-gray-400">'+(lang==='ar'?'تحقق من الاتصال بالإنترنت ثم أعد المحاولة.':'Vérifiez la connexion puis réessayez.')+'</div>';
  }
}


var species=[
{fr:"Daurade Royale",ar:"الدنيس الملكي",icon:"🐟",season:"Sep → Déc",size:"35 cm",regions:"n,c,s",desc:"أشهر سمك في تونس، يعيش قرب الصخور."},
{fr:"Loup de Mer",ar:"القاروص",icon:"🐠",season:"Oct → Mar",size:"30 cm",regions:"n,c",desc:"يفضّل مصبات الأنهار والخلجان."},
{fr:"Sar Commune",ar:"السار",icon:"🐟",season:"Mai → Sep",size:"25 cm",regions:"c",desc:"قوي المقاومة، يعيش فوق الرمال."},
{fr:"Mérou",ar:"الهامور",icon:"🐡",season:"Jun → Oct",size:"45 cm",regions:"s",desc:"ضخم، يعيش في الكهوف والصخور."},
{fr:"Mulet",ar:"البوري",icon:"🐟",season:"Aoû → Nov",size:"30 cm",regions:"n,c,s",desc:"يتجمع في أسراب قرب السطح."},
{fr:"Sardinne",ar:"السردين",icon:"🐟",season:"Nov → Avr",size:"15 cm",regions:"n,c,s",desc:"يُصطاد بالشباك."},
{fr:"Pageot",ar:"البغروق",icon:"🐠",season:"Avr → Juin",size:"20 cm",regions:"c",desc:"يعيش في الأعماق."},
{fr:"Calamar",ar:"الكلمار",icon:"🦑",season:"Oct → Fév",size:"20 cm",regions:"s",desc:"يُصطاد ليلاً باللمبة."}];
var regNames={n:["Nord","الشمال"],c:["Centre","الوسط"],s:["Sud","الجنوب"]};
var wavePts=[[37.3,9.9],[37.0,10.5],[36.7,11.0],[36.4,11.4],[36.0,11.5],[35.6,11.3],[35.2,11.2],[34.7,11.1],[34.1,11.0],[33.5,11.0]];
function toggleWaves(){
    if(waveGroup && map.hasLayer(waveGroup)){
        map.removeLayer(waveGroup);
        waveGroup=null;
        return;
    }

    var url='https://marine-api.open-meteo.com/v1/marine?'+
        'latitude=37.3,37,36.7,36.4,36,35.6,35.2,34.7,34.1,33.5&'+
        'longitude=9.9,10.5,11,11.4,11.5,11.3,11.2,11.1,11,11&'+
        'current=wave_height&timezone=auto';

    fetch(url)
        .then(function(r){
            if(!r.ok) throw new Error('Marine API '+r.status);
            return r.json();
        })
        .then(function(res){
            var arr=Array.isArray(res)?res:[res];

            waveGroup=L.layerGroup(
                arr.map(function(d,i){
                    var h=(d.current && d.current.wave_height!=null)
                        ? Number(d.current.wave_height)
                        : 0;

                    var col=
                        h<0.5 ? '#22c55e' :
                        h<1.0 ? '#eab308' :
                        h<1.5 ? '#f97316' :
                        '#dc2626';

                    return L.circleMarker(wavePts[i],{
                        radius:16,
                        color:col,
                        fillColor:col,
                        fillOpacity:.45,
                        weight:2
                    }).bindPopup(
                        '🌊 '+h.toFixed(2)+' m'
                    );
                })
            ).addTo(map);
        })
        .catch(function(e){
            console.log('Wave API error:',e);
            alert(
                lang==='ar'
                ? '❌ تعذر تحميل بيانات الأمواج'
                : '❌ Impossible de charger les données des vagues'
            );
        });
}


var portsLayer=L.layerGroup(), portsVisible=false, activePort=null;
var tunisianPorts=[
{ar:'ميناء بنزرت',fr:'Port de Bizerte',lat:37.27,lon:9.87},
{ar:'ميناء حلق الوادي',fr:'Port de La Goulette',lat:36.81,lon:10.30},
 {ar:'ميناء قليبية',fr:'Port de Kélibia',lat:36.85,lon:11.10},
 {ar:'ميناء الحمامات',fr:'Port de Hammamet',lat:36.40,lon:10.62},
 {ar:'ميناء سوسة',fr:'Port de Sousse',lat:35.83,lon:10.64},
 {ar:'ميناء المنستير',fr:'Port de Monastir',lat:35.77,lon:10.83},
 {ar:'ميناء المهدية',fr:'Port de Mahdia',lat:35.50,lon:11.06},
 {ar:'ميناء صفاقس',fr:'Port de Sfax',lat:34.74,lon:10.76},
 {ar:'ميناء قرقنة',fr:'Port de Kerkennah',lat:34.72,lon:11.25},
 {ar:'ميناء قابس',fr:'Port de Gabès',lat:33.88,lon:10.10},
 {ar:'ميناء جرجيس',fr:'Port de Zarzis',lat:33.50,lon:11.12}
];

function portIcon(){
  return L.divIcon({className:'',html:'<div class="port-pin">⚓</div>',iconSize:[36,36],iconAnchor:[18,18],popupAnchor:[0,-18]});
}
function portPopup(p){
  var n=lang==='ar'?p.ar:p.fr;
  var safeName=String(n).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  return '<div class="port-card"><div class="port-head"><b>⚓ '+rlEsc(n)+'</b><div class="port-sub">'+p.lat.toFixed(4)+'° • '+p.lon.toFixed(4)+'°</div></div>'+
    '<div class="port-body"><div class="port-grid">'+
    '<div class="port-m"><small>🌬️ '+(lang==='ar'?'الرياح':'Vent')+'</small><b id="pw_'+p.lat+'">⏳</b></div>'+
    '<div class="port-m"><small>🌊 '+(lang==='ar'?'الأمواج':'Vagues')+'</small><b id="ps_'+p.lat+'">⏳</b></div>'+
    '<div class="port-m"><small>🌡️ '+(lang==='ar'?'الحرارة':'Temp.')+'</small><b id="pt_'+p.lat+'">⏳</b></div>'+
    '<div class="port-m"><small>🧭 '+(lang==='ar'?'اتجاه الرياح':'Dir. vent')+'</small><b id="pd_'+p.lat+'">⏳</b></div>'+
    '</div><a class="port-action" href="fishing-planner.html?lat='+p.lat+'&lon='+p.lon+'&name='+encodeURIComponent(n)+'">🎣 '+
    (lang==='ar'?'تحليل الصيد من هنا':'Analyser la pêche ici')+'</a></div></div>';
}
function loadPortWeather(p){
  var url='https://api.open-meteo.com/v1/forecast?latitude='+p.lat+'&longitude='+p.lon+
    '&current=temperature_2m,wind_speed_10m,wind_direction_10m&timezone=auto';
  var marine='https://marine-api.open-meteo.com/v1/marine?latitude='+p.lat+'&longitude='+p.lon+
    '&current=wave_height&timezone=auto';
  Promise.all([fetch(url).then(r=>r.json()),fetch(marine).then(r=>r.json())]).then(function(x){
    var w=x[0].current||{},m=x[1].current||{};
    var ws=w.wind_speed_10m!=null?(Number(w.wind_speed_10m)/1.852).toFixed(1)+' nd':'--';
    var wh=m.wave_height!=null?Number(m.wave_height).toFixed(2)+' m':'--';
    var tp=w.temperature_2m!=null?Number(w.temperature_2m).toFixed(1)+' °C':'--';
    var wd=w.wind_direction_10m!=null?windDirName(w.wind_direction_10m):'--';
    var a=document.getElementById('pw_'+p.lat),b=document.getElementById('ps_'+p.lat),c=document.getElementById('pt_'+p.lat),d=document.getElementById('pd_'+p.lat);
    if(a)a.textContent=ws;if(b)b.textContent=wh;if(c)c.textContent=tp;if(d)d.textContent=wd;
  }).catch(function(){});
}
function togglePorts(){
  portsVisible=!portsVisible;
  if(portsVisible){
    portsLayer.clearLayers();
    tunisianPorts.forEach(function(p){
      var m=L.marker([p.lat,p.lon],{icon:portIcon(),title:lang==='ar'?p.ar:p.fr});
      m.on('click',function(){
        m.bindPopup(portPopup(p),{className:'redline-popup',maxWidth:320,closeButton:true}).openPopup();
        setTimeout(function(){loadPortWeather(p)},80);
      });
      portsLayer.addLayer(m);
    });
    portsLayer.addTo(map);
  }else map.removeLayer(portsLayer);
}


var personalSpotsKey='redline_personal_spots_v1', personalSpotMarkers=L.layerGroup().addTo(map);

function getPersonalSpots(){
  try{return JSON.parse(localStorage.getItem(personalSpotsKey)||'[]')}catch(e){return []}
}
function savePersonalSpots(a){localStorage.setItem(personalSpotsKey,JSON.stringify(a))}
function togglePersonalSpots(){
  var p=document.getElementById('personalSpotPanel');
  if(!p)return;
  p.classList.toggle('show');
  renderPersonalSpots();
}
function renderPersonalSpots(){
  var box=document.getElementById('savedSpots'); if(!box)return;
  var a=getPersonalSpots();
  box.innerHTML=a.length?a.map(function(s,i){
    return '<div class="saved-spot" onclick="goPersonalSpot('+i+')"><b>📍 '+rlEsc(s.name)+'</b><small>'+s.lat.toFixed(4)+' • '+s.lon.toFixed(4)+'</small></div>';
  }).join(''):'<small style="color:#94a3b8">لا توجد نقاط محفوظة بعد.</small>';
  personalSpotMarkers.clearLayers();
  a.forEach(function(s,i){
    var m=L.marker([s.lat,s.lon],{icon:L.divIcon({className:'',html:'<div class="port-pin active">📍</div>',iconSize:[36,36],iconAnchor:[18,18]})});
    m.bindPopup('<b>📍 '+rlEsc(s.name)+'</b><br><small>'+s.lat.toFixed(5)+', '+s.lon.toFixed(5)+'</small><br><button style="margin-top:7px;background:#dc2626;color:#fff;border:0;border-radius:7px;padding:6px 9px;cursor:pointer" onclick="deletePersonalSpot('+i+')">حذف</button>');
    personalSpotMarkers.addLayer(m);
  });
}
function savePersonalSpot(){
  if(!map)return;
  var center=map.getCenter(), name=(document.getElementById('spotName').value||'نقطة صيد').trim();
  var a=getPersonalSpots();
  a.push({name:name||'نقطة صيد',lat:center.lat,lon:center.lng,created:new Date().toISOString()});
  savePersonalSpots(a);
  document.getElementById('spotName').value='';
  renderPersonalSpots();
}
function goPersonalSpot(i){
  var s=getPersonalSpots()[i]; if(!s)return;
  map.setView([s.lat,s.lon],11);
}
function deletePersonalSpot(i){
  var a=getPersonalSpots(); a.splice(i,1); savePersonalSpots(a); renderPersonalSpots();
}


var tripKey='redline_trip_log_v1';
function getTrips(){try{return JSON.parse(localStorage.getItem(tripKey)||'[]')}catch(e){return []}}
function setTrips(a){localStorage.setItem(tripKey,JSON.stringify(a))}
function toggleTripLog(){var p=document.getElementById('tripPanel');if(!p)return;p.classList.toggle('show');renderTrips()}
function saveTrip(){
  var a=getTrips();
  a.unshift({
    name:(document.getElementById('tripName').value||'رحلة صيد').trim()||'رحلة صيد',
    date:document.getElementById('tripDate').value||new Date().toISOString().slice(0,10),
    place:(document.getElementById('tripPlace').value||'').trim()||'--',
    result:document.getElementById('tripResult').value,
    notes:(document.getElementById('tripNotes').value||'').trim()||'--'
  });
  setTrips(a);document.getElementById('tripName').value='';document.getElementById('tripPlace').value='';document.getElementById('tripNotes').value='';renderTrips()
}
function renderTrips(){
  var box=document.getElementById('tripList');if(!box)return;
  var a=getTrips();
  box.innerHTML=a.length?a.map(function(t,i){
    return '<div class="trip-item"><button class="trip-delete" onclick="deleteTrip('+i+')">حذف</button><b>🎣 '+rlEsc(t.name)+'</b><small>📅 '+rlEsc(t.date)+' • 📍 '+rlEsc(t.place)+' • '+rlEsc(t.result)+'</small><small>📝 '+rlEsc(t.notes)+'</small></div>';
  }).join(''):'<small style="color:#94a3b8;display:block;margin-top:9px">لا توجد رحلات محفوظة.</small>';
}
function deleteTrip(i){var a=getTrips();a.splice(i,1);setTrips(a);renderTrips()}


var forecast7Open=false;
function toggle7Day(){
  forecast7Open=!forecast7Open;
  var p=document.getElementById('forecast7Panel');if(!p)return;
  p.classList.toggle('show',forecast7Open);
  if(forecast7Open) load7Day();
}
function load7Day(){
  var c=map&&map.getCenter?map.getCenter():{lat:35.8,lng:10.7};
  var box=document.getElementById('forecast7Grid');if(!box)return;
  box.innerHTML='<small style="color:#94a3b8">⏳ جاري تحميل التوقعات...</small>';
  var url='https://api.open-meteo.com/v1/forecast?latitude='+c.lat+'&longitude='+c.lng+'&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_gusts_10m_max&timezone=auto&forecast_days=7';
  fetch(url).then(r=>r.json()).then(function(d){
    var x=d.daily||{};
    box.innerHTML=(x.time||[]).map(function(day,i){
      var code=Number(x.weather_code?.[i]??0), icon=code<=3?'☀️':code<=48?'🌫️':code<=67?'🌧️':code<=77?'❄️':code<=82?'🌦️':'⛈️';
      var max=x.temperature_2m_max?.[i],min=x.temperature_2m_min?.[i],wind=x.wind_speed_10m_max?.[i],gust=x.wind_gusts_10m_max?.[i];
      return '<div class="day7"><b>'+day+'</b><strong>'+icon+'</strong><small>🌡️ '+(max!=null?Number(max).toFixed(0):'--')+'° / '+(min!=null?Number(min).toFixed(0):'--')+'°</small><small>🌬️ '+(wind!=null?Number(wind).toFixed(0):'--')+' km/h</small><small>💨 '+(gust!=null?Number(gust).toFixed(0):'--')+' km/h</small></div>';
    }).join('');
  }).catch(function(){box.innerHTML='<small style="color:#fca5a5">❌ تعذر تحميل التوقعات.</small>'});
}


function updateMobileStatus(){
  var el=document.getElementById('mobileStatus'),co=document.getElementById('mobileCoords');
  if(!el||!co||!map)return;
  var c=map.getCenter();co.textContent=c.lat.toFixed(4)+', '+c.lng.toFixed(4);
}
function setupMobileUX(){
  var m=document.getElementById('mobileStatus');
  if(m && window.innerWidth<=760)m.style.display='block';
  if(map){
    map.on('moveend',updateMobileStatus);
    updateMobileStatus();
  }
}
window.addEventListener('resize',function(){
  var m=document.getElementById('mobileStatus');
  if(m)m.style.display=window.innerWidth<=760?'block':'none';
  if(map)setTimeout(function(){map.invalidateSize()},150);
});
setTimeout(setupMobileUX,800);


var aiOpen=false;function toggleAI(){aiOpen=!aiOpen;var p=document.getElementById("aiPanel");if(!p)return;p.classList.toggle("show",aiOpen);if(aiOpen&&!document.getElementById("aiMessages").children.length)addAI("bot","مرحبًا 👋 أنا مساعد الصياد في Red Line Fishing.\nأستطيع شرح البحر والرياح والموانئ ومخطط الصيد.");}function addAI(t,x){var b=document.getElementById("aiMessages"),d=document.createElement("div");d.className="ai-msg "+t;d.textContent=x;b.appendChild(d);b.scrollTop=b.scrollHeight;}function askAI(q){document.getElementById("aiInput").value=q;sendAI();}function sendAI(){var i=document.getElementById("aiInput"),q=i.value.trim();if(!q)return;i.value="";addAI("user",q);setTimeout(function(){addAI("bot",localAIAnswer(q));},120);}function localAIAnswer(q){var s=q.toLowerCase();if(s.includes("بحر")||s.includes("موج")||s.includes("mer")||s.includes("vague"))return"🌊 افتح «حالة البحر» لعرض الأمواج واتجاهها وفترة الموج وحرارة البحر.";if(s.includes("ريح")||s.includes("vent"))return"🌬️ افتح لوحة الطقس لعرض سرعة الرياح واتجاهها والهبات.";if(s.includes("ميناء")||s.includes("port"))return"⚓ فعّل «الموانئ» ثم اضغط على أي ميناء لعرض بياناته وتحليل الصيد.";if(s.includes("مخطط")||s.includes("صيد")||s.includes("pêche"))return"🎣 افتح «مخطط الصيد الذكي»، اختر المنطقة والتاريخ ثم اضغط «تحليل الصيد».";if(s.includes("توقع")||s.includes("prévision"))return"🌤️ افتح «توقعات 7 أيام» لعرض الحرارة والرياح والهبات.";if(s.includes("نقط")||s.includes("point"))return"📍 «نقاطي» تسمح لك بحفظ مواقعك والعودة إليها لاحقًا.";return"أستطيع مساعدتك في 🌊 البحر، 🌬️ الرياح، ⚓ الموانئ، 🎣 مخطط الصيد، 📍 نقاطك و🌤️ توقعات 7 أيام.";}
function toggleTheme(){isDark=!isDark;
document.body.classList.toggle('light',!isDark);
document.getElementById('themeBtn').textContent=isDark?'🌙':'☀️';
map.removeLayer(isDark?darkLayer:satLayer);(isDark?satLayer:darkLayer).addTo(map)}

var i18n={
fr:{carte:"Carte",meteo:"Météo",especes:"Espèces",previsions:"Prévisions 7 jours",favoris:"Favoris",couches:"Couches",fond:"Fond marin",habitat:"Habitat",meteoAct:"Météo actuelle",vaguesF:"Vagues",ventF:"Vent",windLabel:"🌬️ Vitesse du vent",search:"🔍 Rechercher...",slogan:"Plus qu'une carte...<br><b>votre allié en mer</b>",waves:"Vagues",favTitle:"Mes Favoris",gps:"GPS",seaStatus:"État de la mer",seaStatusTitle:"État de la mer sur le littoral tunisien",ports:"Ports",mySpots:"Mes points",tripLog:"Journal des sorties",forecast7:"Prévisions 7 jours",aiAssistant:"Assistant pêcheur AI"},
ar:{carte:"الخريطة",meteo:"الطقس",especes:"الأنواع",previsions:"توقعات 7 أيام",favoris:"المفضلة",couches:"الطبقات",fond:"قاع البحر",habitat:"الموطن",meteoAct:"الطقس الحالي",vaguesF:"الأمواج",ventF:"الرياح",windLabel:"🌬️ سرعة الرياح",search:"🔍 ابحث عن مكان...",slogan:"أكثر من خريطة...<br><b>رفيقك في البحر</b>",waves:"الأمواج",favTitle:"مفضلتي",seaStatus:"حالة البحر",seaStatusTitle:"حالة البحر على الساحل التونسي",ports:"الموانئ",mySpots:"نقاطي",tripLog:"سجل الرحلات",forecast7:"توقعات 7 أيام",aiAssistant:"مساعد الصياد AI",gps:"تحديد موقعي"}};
function toggleLang(){lang=(lang==='fr')?'ar':'fr';
document.getElementById('langBtn').textContent=(lang==='fr')?'🌐 FR':'🌐 AR';
document.documentElement.lang=lang;
document.getElementById('sidebar').setAttribute('dir',lang==='ar'?'rtl':'ltr');
var els=document.querySelectorAll('[data-i18n]');
for(var i=0;i<els.length;i++){els[i].textContent=i18n[lang][els[i].getAttribute('data-i18n')]}
var wl=document.getElementById('windLabel'); if(wl) wl.textContent=i18n[lang].windLabel;
document.getElementById('searchInput').placeholder=i18n[lang].search;
document.getElementById('speciesSearch').placeholder=(lang==='ar')?'🔍 ابحث...':'🔍 Filtrer...';if(document.getElementById('accuracyTitle'))document.getElementById('accuracyTitle').textContent=lang==='ar'?'دقة التوقع':'Fiabilité des prévisions';
document.getElementById('slogan').innerHTML=i18n[lang].slogan;
fetchWeather();renderSpecies('');renderFavs();if(!document.getElementById('seaStatusPanel').classList.contains('hidden'))loadSeaStatus()}

function weatherIcon(code){if(code===0)return'☀️';if(code<=3)return'⛅';if(code<=48)return'🌫️';if(code<=67)return'🌧️';if(code<=77)return'🌨️';if(code<=82)return'🌦️';return'⛈️'}
function windDirName(deg){var dirs=['N','NE','E','SE','S','SO','O','NO'];
return dirs[Math.round(deg/45)%8]}
function fetchHourly(){
fetch('https://api.open-meteo.com/v1/forecast?latitude='+currentLat+'&longitude='+currentLon+'&hourly=temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,precipitation&forecast_days=2&timezone=auto')
.then(function(r){return r.json()}).then(function(d){
var now=new Date(),h=now.getHours(),html='';
for(var i=0;i<24;i++){var idx=h+i;
if(idx>=d.hourly.time.length)break;
var t=d.hourly.time[idx].split('T')[1];
var ws=(d.hourly.wind_speed_10m[idx]/1.852).toFixed(0);
var gs=(d.hourly.wind_gusts_10m[idx]/1.852).toFixed(0);
var pr=d.hourly.precipitation[idx];
var col=ws<10?'text-green-400':ws<20?'text-yellow-400':'text-red-400';
var ic=pr>0?'🌧️':(idx>=7&&idx<=18?'☀️':'🌙');
html+='<div class="hourCell"><p class="text-gray-400">'+t+'</p><p>'+ic+'</p><p class="'+col+' font-bold">🌬️'+ws+'</p><p class="text-gray-400">💨'+gs+'</p><p class="text-blue-300">💧'+pr+'</p></div>'}
document.getElementById('hourlyBox').innerHTML=html;
document.getElementById('hourlyTitle').textContent=(lang==='ar')?'التوقعات ساعة بساعة':'Prévisions heure par heure';
}).catch(function(e){console.log(e)})}

var accuracyCache={};
function accuracyColor(s){return s>=80?'#22c55e':s>=60?'#eab308':'#ef4444'}
function accuracyLabel(s){if(lang==='ar')return s>=80?'🟢 ثقة عالية':s>=60?'🟡 ثقة متوسطة':'🔴 ثقة منخفضة';return s>=80?'🟢 Fiabilité élevée':s>=60?'🟡 Fiabilité moyenne':'🔴 Fiabilité faible'}
function updateAccuracyUI(score,windMAE,tempMAE){score=Math.max(0,Math.min(100,Math.round(score)));var c=accuracyColor(score);document.getElementById('accuracyScore').textContent=score+'%';document.getElementById('accuracyScore').style.color=c;document.getElementById('accuracyBar').style.width=score+'%';document.getElementById('accuracyBar').style.background=c;document.getElementById('accuracyStatus').textContent=accuracyLabel(score);document.getElementById('windError').textContent=windMAE==null?'--':windMAE.toFixed(1)+' nd';document.getElementById('tempError').textContent=tempMAE==null?'--':tempMAE.toFixed(1)+' °C'}
function calculateAccuracy(windMAE,tempMAE){if(windMAE==null&&tempMAE==null)return null;var ws=windMAE==null?50:Math.max(0,100-(windMAE/5)*100),ts=tempMAE==null?50:Math.max(0,100-(tempMAE/5)*100);return Math.round(ws*.65+ts*.35)}
async function measureForecastAccuracy(){
var lat=Number(currentLat),lon=Number(currentLon);if(!isFinite(lat)||!isFinite(lon))return;var key=lat.toFixed(2)+','+lon.toFixed(2);
if(accuracyCache[key]&&Date.now()-accuracyCache[key].time<3600000){updateAccuracyUI(accuracyCache[key].score,accuracyCache[key].windMAE,accuracyCache[key].tempMAE);return}
try{
var previousURL='https://previous-runs-api.open-meteo.com/v1/forecast?latitude='+encodeURIComponent(lat)+'&longitude='+encodeURIComponent(lon)+'&hourly=temperature_2m_previous_day1,wind_speed_10m_previous_day1&past_days=7&forecast_days=1&timezone=auto';
var actualURL='https://archive-api.open-meteo.com/v1/era5?latitude='+encodeURIComponent(lat)+'&longitude='+encodeURIComponent(lon)+'&start_date='+new Date(Date.now()-7*86400000).toISOString().slice(0,10)+'&end_date='+new Date(Date.now()-86400000).toISOString().slice(0,10)+'&hourly=temperature_2m,wind_speed_10m&timezone=auto';
var rr=await Promise.all([fetch(previousURL),fetch(actualURL)]);if(!rr[0].ok||!rr[1].ok)throw Error('verification api');
var p=await rr[0].json(),a=await rr[1].json();if(!p.hourly||!a.hourly)throw Error('verification data');
var ai={};(a.hourly.time||[]).forEach(function(t,i){ai[t]={temp:a.hourly.temperature_2m[i],wind:a.hourly.wind_speed_10m[i]}});
var we=[],te=[];(p.hourly.time||[]).forEach(function(t,i){var x=ai[t];if(!x)return;var pw=p.hourly.wind_speed_10m_previous_day1[i],pt=p.hourly.temperature_2m_previous_day1[i];if(pw!=null&&x.wind!=null)we.push(Math.abs(pw/1.852-x.wind/1.852));if(pt!=null&&x.temp!=null)te.push(Math.abs(pt-x.temp))});
if(!we.length&&!te.length)throw Error('no verification points');var wm=we.length?we.reduce((x,y)=>x+y,0)/we.length:null,tm=te.length?te.reduce((x,y)=>x+y,0)/te.length:null,score=calculateAccuracy(wm,tm);if(score==null)throw Error('no score');
accuracyCache[key]={time:Date.now(),score:score,windMAE:wm,tempMAE:tm};updateAccuracyUI(score,wm,tm)
}catch(e){console.log('Accuracy engine:',e);document.getElementById('accuracyScore').textContent='--%';document.getElementById('accuracyBar').style.width='0%';document.getElementById('accuracyStatus').textContent=lang==='ar'?'⚪ لا توجد بيانات تحقق كافية حالياً':'⚪ Données de vérification insuffisantes'}
}


function fetchWeather(){
var url='https://api.open-meteo.com/v1/forecast?latitude='+currentLat+'&longitude='+currentLon+'&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code&daily=wave_height_max,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,weather_code&timezone=auto';
fetch(url).then(function(r){return r.json()}).then(function(d){
var c=d.current,nd=(c.wind_speed_10m/1.852).toFixed(1);
document.getElementById('liveData').innerHTML='>🌬️ '+nd+' nd • 🌡️ '+c.temperature_2m+'°C • 💨 '+((c.wind_gusts_10m||0)/1.852).toFixed(0)+' nd</p>';
document.getElementById('tempVal').textContent=c.temperature_2m+'°C';
document.getElementById('windVal').textContent=nd+' nd';
document.getElementById('waveVal').textContent=(d.daily.wave_height_max[0]||'--')+' m';
var ar=document.getElementById('windArrow');
if(ar){ar.style.transform='translate(-50%,-100%) rotate('+c.wind_direction_10m+'deg)'}
var ci=document.getElementById('compassInfo');
if(ci){ci.innerHTML='<p class="font-bold text-sm">'+windDirName(c.wind_direction_10m)+' • '+nd+' nd</p><p class="text-gray-400">💨 الهبّات: '+((c.wind_gusts_10m||0)/1.852).toFixed(0)+' nd</p><p>'+(nd<15?'✅ ظروف آمنة للصيد':'⚠️ رياح قوية — احذر!')+'</p>'}
var days=(lang==='ar')?['أحد','إثن','ثلا','أرب','خمي','جمع','سبت']:['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'],html='';
for(var i=0;i<7;i++){var day=new Date(d.daily.time[i]);
html+='<div class="glass rounded-lg p-1.5"><p class="text-gray-400">'+days[day.getDay()]+'</p><p class="text-lg">'+weatherIcon(d.daily.weather_code[i])+'</p><p class="font-bold">'+d.daily.temperature_2m_max[i]+'°</p><p class="text-gray-400">'+d.daily.temperature_2m_min[i]+'°</p><p class="text-[10px] text-blue-300">🌬️'+(d.daily.wind_speed_10m_max[i]/1.852).toFixed(0)+'nd</p><p class="text-[10px] text-cyan-300">🌊'+(d.daily.wave_height_max[i]||'--')+'m</p></div>'}
document.getElementById('forecastContent').innerHTML=html;
fetchHourly();measureForecastAccuracy();
}).catch(function(){document.getElementById('liveData').innerHTML='<p class="text-red-400">⚠️ Erreur connexion</p>'})}
fetchWeather();setInterval(fetchWeather,600000);setInterval(function(){measureForecastAccuracy()},3600000);

function myLocation(){
if(!navigator.geolocation){alert('⚠️ GPS غير مدعوم');return}
var box=document.getElementById('sunBox');
box.classList.remove('hidden');
box.innerHTML='<p class="text-gray-400">📡 تحديد الموقع...</p>';
navigator.geolocation.getCurrentPosition(function(pos){
var la=pos.coords.latitude,lo=pos.coords.longitude;
currentLat=la;currentLon=lo;
map.setView([la,lo],13);
L.marker([la,lo]).addTo(map).bindPopup('📍 أنت هنا').openOn(map);
fetchWeather();
fetch('https://api.open-meteo.com/v1/forecast?latitude='+la+'&longitude='+lo+'&daily=sunrise,sunset&current=temperature_2m,wind_speed_10m&timezone=auto')
.then(function(r){return r.json()}).then(function(d){
var sr=d.daily.sunrise[0].split('T')[1],ss=d.daily.sunset[0].split('T')[1];
var nd=(d.current.wind_speed_10m/1.852).toFixed(1);
var safe=nd<15;
box.innerHTML='<p>🌅 شروق: <b>'+sr+'</b> — 🌇 غروب: <b>'+ss+'</b></p><p>📏 '+la.toFixed(3)+' , '+lo.toFixed(3)+'</p><p>'+(safe?'✅ الرياح آمنة للصيد':'⚠️ رياح قوية — احذر!')+'</p>';
var best=null,bd=1e9;
favs.forEach(function(f){var dx=f.lat-la,dy=f.lon-lo,dd=dx*dx+dy*dy;if(dd<bd){bd=dd;best=f}});
if(best){var km=Math.sqrt(bd)*111;
box.innerHTML+='<p>⭐ أقرب مفضلة: '+best.name+' ('+km.toFixed(1)+' كم)</p>'}
});
},function(){box.innerHTML='<p class="text-red-400">⚠️ فشل تحديد الموقع — فعّل GPS</p>'},{enableHighAccuracy:true,timeout:10000})}

function loadFavs(){if(!currentUser)return;
db.collection('favs').doc(currentUser.uid).collection('places').get().then(function(q){favs=[];q.forEach(function(doc){favs.push(doc.data())});renderFavs()}).catch(function(e){console.log(e)})}
function addFav(lat,lon,name){if(!currentUser)return;
for(var i=0;i<favs.length;i++){if(favs[i].name===name)return}
db.collection('favs').doc(currentUser.uid).collection('places').doc(encodeURIComponent(name)).set({lat:lat,lon:lon,name:name}).then(loadFavs)}
function delFav(name){db.collection('favs').doc(currentUser.uid).collection('places').doc(encodeURIComponent(name)).delete().then(loadFavs)}
function renderFavs(){var box=document.getElementById('favList');
if(!favs.length){box.innerHTML='<p class="text-gray-400 text-xs">Aucun favori / لا مفضلة بعد</p>';return}
var html='';
favs.forEach(function(f){var n=f.name.replace(/'/g,"");
html+='<div class="flex justify-between items-center glass rounded-xl p-2"><span class="cursor-pointer hover:text-red-400" onclick="goTo('+f.lat+','+f.lon+',\''+n+'\');closeModal(\'favModal\')">📍 '+f.name+'</span><button onclick="delFav(\''+n+'\')" class="text-red-500">🗑️</button></div>'});
box.innerHTML=html}
function openFavs(){renderFavs();openModal('favModal')}

var sTimeout;
function searchPlace(q){clearTimeout(sTimeout);
var box=document.getElementById('searchResults');
if(q.length<3){box.classList.add('hidden');return}
sTimeout=setTimeout(function(){
fetch('https://nominatim.openstreetmap.org/search?format=json&q='+encodeURIComponent(q+' Tunisia')+'&limit=6&accept-language=ar')
.then(function(r){return r.json()}).then(function(results){
if(!results||!results.length){box.innerHTML='<div class="px-3 py-2 text-xs text-gray-400">❌ لا نتائج</div>';box.classList.remove('hidden');return}
var html='';
results.forEach(function(r){var name=r.display_name.replace(/'/g,"");
html+='<div onclick="goTo('+r.lat+','+r.lon+',\''+name+'\')" class="px-3 py-2 hover:bg-red-600/30 cursor-pointer text-sm border-b border-white/5">📍 '+r.display_name+'</div>'});
box.innerHTML=html;box.classList.remove('hidden');
}).catch(function(){
fetch('https://photon.komoot.io/api/?q='+encodeURIComponent(q)+'&bbox=7.5,30,12.5,38&limit=6')
.then(function(r){return r.json()}).then(function(d){var html='';
(d.features||[]).forEach(function(f){var name=((f.properties.name||'')+' — '+(f.properties.city||f.properties.state||'Tunisie')).replace(/'/g,"");
html+='<div onclick="goTo('+f.geometry.coordinates[1]+','+f.geometry.coordinates[0]+',\''+name+'\')" class="px-3 py-2 hover:bg-red-600/30 cursor-pointer text-sm border-b border-white/5">📍 '+name+'</div>'});
box.innerHTML=html||'<div class="px-3 py-2 text-xs text-gray-400">❌ لا نتائج</div>';
box.classList.remove('hidden')})})},400)}
function goTo(lat,lon,name){map.setView([lat,lon],11);
var fav=(lang==='ar')?'أضف للمفضلة':'Ajouter aux favoris';
L.popup().setLatLng([lat,lon]).setContent('<b>'+name+'</b><br><button onclick="addFav('+lat+','+lon+',\''+name+'\')" class="mt-1 bg-red-600 rounded-full px-3 py-1 text-xs font-bold">⭐ '+fav+'</button>').openOn(map);
currentLat=lat;currentLon=lon;fetchWeather();
document.getElementById('searchResults').classList.add('hidden');
document.getElementById('searchInput').value=''}
document.addEventListener('click',function(e){if(!e.target.closest('.relative'))document.getElementById('searchResults').classList.add('hidden')});

function renderSpecies(filter){var html='';
species.forEach(function(s){var q=(s.fr+' '+s.ar).toLowerCase();
if(filter&&q.indexOf(filter.toLowerCase())===-1)return;
var regs=s.regions.split(',').map(function(r){return lang==='ar'?regNames[r][1]:regNames[r][0]}).join(' • ');
html+='<div class="glass rounded-xl p-3 text-sm"><div class="flex items-center gap-2 mb-1"><span class="text-3xl">'+s.icon+'</span><b>'+(lang==='ar'?s.ar:s.fr)+'</b></div><p class="text-xs text-gray-400">📍 '+regs+'</p><p class="text-xs text-blue-300">📅 '+s.season+'</p><p class="text-xs text-yellow-300">📏 '+s.size+'</p><p class="text-xs mt-1 text-gray-300">'+s.desc+'</p></div>'});
document.getElementById('speciesList').innerHTML=html}
function openSpecies(){renderSpecies('');
document.getElementById('speciesTitle').textContent=(lang==='ar')?'الأنواع البحرية':'Espèces marines';
openModal('speciesModal')}

function openModal(id){var m=document.getElementById(id);m.classList.remove('hidden');m.classList.add('flex')}
function closeModal(id){var m=document.getElementById(id);m.classList.add('hidden');m.classList.remove('flex')}
function togglePanel(id){var m=document.getElementById(id);m.classList.toggle('hidden');m.classList.toggle('md:block')}
function setLayer(mode){var btns=document.querySelectorAll('.layer-btn');
for(var i=0;i<btns.length;i++){btns[i].classList.remove('bg-red-600','font-bold')}
document.getElementById('btn-'+mode).classList.add('bg-red-600','font-bold')}


/* ===== MAP CLICK PRO ===== */
var clickMarker=null, geoCache={}, lastGeoRequest=0, geoTimer=null, geoController=null;
function rlEsc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
function rlPlace(a){return a&&(a.city||a.town||a.village||a.municipality||a.suburb||a.city_district||a.county||a.state||a.country)||null}
function rlReverse(lat,lon){var key=lat.toFixed(4)+','+lon.toFixed(4);if(geoCache[key])return Promise.resolve(geoCache[key]);var now=Date.now();if(now-lastGeoRequest<1100)return new Promise(function(resolve){clearTimeout(geoTimer);geoTimer=setTimeout(function(){rlReverse(lat,lon).then(resolve)},1100-(now-lastGeoRequest))});lastGeoRequest=Date.now();if(geoController){try{geoController.abort()}catch(e){}}geoController=new AbortController();var u='https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat='+encodeURIComponent(lat)+'&lon='+encodeURIComponent(lon)+'&zoom=18&addressdetails=1&accept-language='+(lang==='ar'?'ar':'fr');return fetch(u,{signal:geoController.signal,headers:{Accept:'application/json'}}).then(function(r){if(!r.ok)throw Error('geocode '+r.status);return r.json()}).then(function(d){geoCache[key]=d;return d})}
function copyCoordinates(lat,lon){var s=lat.toFixed(6)+', '+lon.toFixed(6);if(navigator.clipboard)navigator.clipboard.writeText(s).then(function(){alert(lang==='ar'?'✅ تم نسخ الإحداثيات':'✅ Coordonnées copiées')});else{var t=document.createElement('textarea');t.value=s;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove()}}
function rlPopup(lat,lon,g,w){var a=g&&g.address?g.address:{},name=rlPlace(a)||(lang==='ar'?'موقع بحري':'Position marine'),region=a.state||a.county||'',country=a.country||'',c=w.current||{},nd=c.wind_speed_10m!=null?(c.wind_speed_10m/1.852).toFixed(1):'--',gs=c.wind_gusts_10m!=null?(c.wind_gusts_10m/1.852).toFixed(0):'--',wd=c.wind_direction_10m!=null?windDirName(c.wind_direction_10m):'--',temp=c.temperature_2m!=null?Number(c.temperature_2m).toFixed(1)+'°C':'--',wave=w.daily&&w.daily.wave_height_max&&w.daily.wave_height_max[0]!=null?Number(w.daily.wave_height_max[0]).toFixed(2)+' m':'--',safe=nd!=='--'&&Number(nd)<15,fav=String(name).replace(/\\/g,'\\\\').replace(/'/g,"\\'");return '<div class="rl-map-popup"><div class="rl-popup-head"><div class="rl-popup-icon">📍</div><div class="rl-popup-title">📍 '+rlEsc(name)+'</div><button class="rl-popup-close" onclick="map.closePopup()">×</button><div class="rl-popup-sub">'+(region?rlEsc(region):'')+(region&&country?' • ':'')+(country?rlEsc(country):'')+'</div></div><div class="rl-popup-body"><div class="rl-coordinates"><div><span>Latitude</span><b>'+lat.toFixed(6)+'°</b></div><div><span>Longitude</span><b>'+lon.toFixed(6)+'°</b></div></div><button class="rl-copy-btn" onclick="copyCoordinates('+lat+','+lon+')">📋 '+(lang==='ar'?'نسخ الإحداثيات':'Copier les coordonnées')+'</button><div class="rl-section-title">🌊 '+(lang==='ar'?'الظروف البحرية':'Conditions marines')+'</div><div class="rl-grid"><div class="rl-data"><span>🌬️</span><small>الرياح</small><b>'+nd+' nd</b></div><div class="rl-data"><span>💨</span><small>الهبات</small><b>'+gs+' nd</b></div><div class="rl-data"><span>🧭</span><small>الاتجاه</small><b>'+rlEsc(wd)+'</b></div><div class="rl-data"><span>🌊</span><small>الأمواج</small><b>'+wave+'</b></div><div class="rl-data"><span>🌡️</span><small>الحرارة</small><b>'+temp+'</b></div></div><div class="'+(safe?'rl-safe':'rl-warning')+'">'+(safe?'🟢 '+(lang==='ar'?'ظروف مناسبة للصيد':'Conditions favorables'):'🟠 '+(lang==='ar'?'الحذر مطلوب في البحر':'Prudence en mer'))+'</div><button class="rl-fav-btn" onclick="addFav('+lat+','+lon+',\''+fav+'\')">⭐ '+(lang==='ar'?'إضافة إلى المفضلة':'Ajouter aux favoris')+'</button><div class="rl-source">© OpenStreetMap • Red Line Fishing</div></div></div>'}
map.on('click',function(e){var lat=e.latlng.lat,lon=e.latlng.lng;if(clickMarker)map.removeLayer(clickMarker);clickMarker=L.circleMarker([lat,lon],{radius:10,color:'#fff',weight:3,fillColor:'#2563eb',fillOpacity:1,className:'rl-selected-point'}).addTo(map);clickMarker.bindPopup('<div class="rl-map-popup"><div class="rl-popup-head"><div class="rl-popup-icon">📍</div><div class="rl-popup-title">'+(lang==='ar'?'جاري تحديد المكان...':'Localisation en cours...')+'</div></div><div class="rl-popup-body"><div class="rl-coordinates"><div><span>Latitude</span><b>'+lat.toFixed(6)+'°</b></div><div><span>Longitude</span><b>'+lon.toFixed(6)+'°</b></div></div><div class="rl-loading">⏳ '+(lang==='ar'?'جاري جلب اسم المنطقة والبيانات البحرية...':'Recherche du lieu et des données marines...')+'</div></div></div>',{className:'redline-popup',maxWidth:340,minWidth:300,closeButton:false}).openPopup();Promise.all([rlReverse(lat,lon),fetch('https://api.open-meteo.com/v1/forecast?latitude='+lat+'&longitude='+lon+'&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m&daily=wave_height_max,temperature_2m_max,temperature_2m_min&timezone=auto').then(function(r){if(!r.ok)throw Error('weather '+r.status);return r.json()})]).then(function(x){var g=x[0],w=x[1];currentLat=lat;currentLon=lon;if(w.current&&w.current.wind_direction_10m!=null){var wd=Number(w.current.wind_direction_10m),ar=document.getElementById('windArrow');if(ar)ar.style.transform='translate(-50%,-100%) rotate('+wd+'deg)';var ci=document.getElementById('compassInfo');if(ci){var sp=w.current.wind_speed_10m/1.852;ci.innerHTML='<p class="font-bold text-sm">'+windDirName(wd)+' • '+sp.toFixed(1)+' nd</p><p>'+(sp<15?'🟢 آمن':'🟠 احذر!')+'</p>'}}clickMarker.setPopupContent(rlPopup(lat,lon,g,w))}).catch(function(){clickMarker.setPopupContent('<div class="rl-map-popup"><div class="rl-popup-head"><div class="rl-popup-icon">📍</div><div class="rl-popup-title">'+(lang==='ar'?'الموقع المحدد':'Position sélectionnée')+'</div></div><div class="rl-popup-body"><div class="rl-coordinates"><div><span>Latitude</span><b>'+lat.toFixed(6)+'°</b></div><div><span>Longitude</span><b>'+lon.toFixed(6)+'°</b></div></div><div class="rl-warning">⚠️ '+(lang==='ar'?'تعذر جلب اسم المنطقة، لكن الإحداثيات صحيحة.':'Nom du lieu indisponible, coordonnées correctes.')+'</div></div></div>')})});
