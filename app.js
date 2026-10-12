
(() => {
'use strict';
const TYPES = {anime:'Anime',manga:'Manga',book:'Kitap',movie:'Film',series:'Dizi',kdrama:'K-Drama'};
const ICONS = {anime:'◉',manga:'◫',book:'▤',movie:'▶',series:'▣',kdrama:'◇'};
const STATUSES = {planned:'Planlandı',in_progress:'Devam Ediyor',completed:'Tamamlandı',on_hold:'Beklemede',dropped:'Bırakıldı'};
const state = {items:[],stats:{},config:{},view:'dashboard',type:'',query:'',status:'',genre:'',sort:'updated',layout:localStorage.getItem('mv-layout')||'grid',calendar:[]};
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const esc = value => String(value == null ? '' : value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const attr = esc;
const safeUrl = value => {try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}};

function server(fn, ...args) { return window.MediaVault.call(fn, ...args); }

async function init() {
bindShell();
try {
const data = await server('getBootstrapData');
state.items = data.items || []; state.stats = data.stats || {}; state.config = data.config || {};
$('#user-email').textContent = state.config.userEmail || 'Bu tarayıcıda kayıtlı';
$('#user-avatar').textContent = (state.config.userEmail || 'S').charAt(0).toUpperCase();
updateCounts(); render();
} catch (err) { showFatal(err); }
}

function bindShell() {
$('#menu-toggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
$('#add-btn').addEventListener('click', () => openEditor());
$('#global-search').addEventListener('input', e => { state.query=e.target.value; if(state.view==='dashboard') {state.view='library';state.type='';} render(); });
$('#nav').addEventListener('click', e => {
const btn=e.target.closest('.nav-item'); if(!btn)return;
$$('.nav-item').forEach(x=>x.classList.remove('active')); btn.classList.add('active');
state.type=btn.dataset.type||''; state.view=btn.dataset.view||(state.type?'library':'dashboard'); state.status=''; state.genre='';
$('#sidebar').classList.remove('open'); if(state.view==='calendar'){server('getCalendarData',120).then(x=>{state.calendar=x||[];render()}).catch(err=>toast(err.message,'error'));} else render();
});
$('#content').addEventListener('click', handleContentClick);
}

function handleContentClick(e) {
const action=e.target.closest('[data-action]');
if(action){
const a=action.dataset.action;
if(a==='open-type'){state.view='library';state.type=action.dataset.type;activateTypeNav(state.type);render();}
if(a==='add')openEditor(null,action.dataset.type);
if(a==='layout'){state.layout=action.dataset.layout;localStorage.setItem('mv-layout',state.layout);renderLibrary();}
if(a==='export')doExport(action.dataset.format);
if(a==='backup')doBackup();
if(a==='calendar'){state.view='calendar';render();}
if(a==='refresh-schedule')refreshSchedule();

if(a==='reminder')toggleReminder(action.dataset.id,action.dataset.kind,action.dataset.enabled!=='true');
if(a==='import-mal')pickFile('mal');
if(a==='enrich-covers')enrichCovers();
if(a==='restore-json')pickFile('json');
if(a==='save-token')saveToken();
return;
}
const card=e.target.closest('[data-item-id]'); if(card) openDetail(card.dataset.itemId);
}

function activateTypeNav(type){$$('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.type===type));}
function render(){
if(state.view==='dashboard')renderDashboard();
else if(state.view==='library'||state.view==='favorites')renderLibrary();
else if(state.view==='calendar')renderCalendar();
else if(state.view==='import')renderImport();
else if(state.view==='settings')renderSettings();
else if(state.view==='statistics')renderStatistics();
else if(state.view==='year')renderYear();
else if(state.view==='activity')renderActivity();
else if(state.view==='recommend')renderRecommend();
}

function renderDashboard(){
const s=state.stats, max=Math.max(1,...Object.values(s.byType||{}));
const recent=[...state.items].sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)).slice(0,6);
$('#content').innerHTML=`
<section class="hero"><div><span class="eyebrow">KİŞİSEL MEDYA ARŞİVİ</span><h1>Tekrar hoş geldin.</h1><p>İzlediğin, okuduğun ve keşfetmek istediğin her şey tek bir özel koleksiyonda.</p></div></section>
<div class="stats-grid">
${statCard('Toplam içerik',s.total||0,'Tüm koleksiyon')}${statCard('Tamamlanan',s.completed||0,'Bitirilen içerik')}${statCard('Ortalama puan',s.averageScore||'—','10 üzerinden')}${statCard('Favoriler',s.favorites||0,'Özel seçimlerin')}
</div>
<div class="section-head"><h2>Kategoriler</h2></div>
<div class="quick-types">${Object.keys(TYPES).map(t=>`<button class="quick-type" data-action="open-type" data-type="${t}"><i>${ICONS[t]}</i><strong>${TYPES[t]}</strong><small>${(s.byType||{})[t]||0} kayıt</small></button>`).join('')}</div>
<div class="settings-grid" style="margin-top:30px">
<section><div class="section-head"><h2>Son güncellenenler</h2><a data-action="open-type" data-type="">Tümünü gör</a></div>${recent.length?`<div class="media-grid">${recent.map(cardHtml).join('')}</div>`:emptyHtml('Henüz kayıt yok','İlk içeriğini ekleyerek arşivini oluşturmaya başla.')}</section>
<section class="panel"><h2>Kategori dağılımı</h2><p>Koleksiyonunun türlere göre görünümü.</p><div class="type-bars">${Object.keys(TYPES).map(t=>{const n=(s.byType||{})[t]||0;return `<div class="bar-col"><b>${n}</b><i style="height:${Math.max(3,n/max*100)}px"></i><span>${TYPES[t]}</span></div>`}).join('')}</div></section>
</div>`;
}

function statCard(label,value,hint){return `<div class="stat-card"><span>${label}</span><strong>${value}</strong><em>${hint}</em></div>`;}

function filteredItems(){
let arr=state.items.filter(x=>(!state.type||x.type===state.type)&&(!state.status||x.status===state.status)&&(!state.genre||genresForItem(x).includes(state.genre)));
if(state.view==='favorites')arr=arr.filter(x=>x.favorite);
if(state.query){const q=state.query.toLocaleLowerCase('tr');arr=arr.filter(x=>[x.title,x.originalTitle,x.tags,x.notes].join(' ').toLocaleLowerCase('tr').includes(q));}
const sorters={updated:(a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt),title:(a,b)=>a.title.localeCompare(b.title,'tr'),score:(a,b)=>Number(b.score)-Number(a.score),year:(a,b)=>Number(b.year)-Number(a.year)};
return [...arr].sort(sorters[state.sort]||sorters.updated);
}

function renderLibrary(){
const items=filteredItems(); const title=state.view==='favorites'?'Favoriler':(state.type?TYPES[state.type]:'Tüm Kütüphane');
$('#content').innerHTML=`
<div class="page-head"><div><span class="eyebrow">KÜTÜPHANE</span><h1>${title}</h1><p>${items.length} içerik gösteriliyor</p></div><button class="btn btn-primary" data-action="add" data-type="${state.type||''}">＋ İçerik Ekle</button></div>
<div class="toolbar"><select id="status-filter"><option value="">Tüm durumlar</option>${Object.entries(STATUSES).map(([v,l])=>`<option value="${v}" ${state.status===v?'selected':''}>${l}</option>`).join('')}</select><select id="genre-filter"><option value="">Tüm türler</option>${allGenres().map(g=>`<option value="${esc(g)}" ${state.genre===g?'selected':''}>${esc(g)}</option>`).join('')}</select><select id="sort-select"><option value="updated">Son güncellenen</option><option value="title">Ada göre</option><option value="score">Puana göre</option><option value="year">Yıla göre</option></select><span class="spacer"></span><div class="view-toggle"><button data-action="layout" data-layout="grid" class="${state.layout==='grid'?'active':''}">▦</button><button data-action="layout" data-layout="list" class="${state.layout==='list'?'active':''}">☷</button></div></div>
<div id="library-results">${items.length?(state.layout==='grid'?`<div class="media-grid">${items.map(cardHtml).join('')}</div>`:`<div class="media-list">${items.map(listHtml).join('')}</div>`):emptyHtml('Burada henüz içerik yok','Yeni bir kayıt ekleyebilir veya filtreleri değiştirebilirsin.')}</div>`;
$('#status-filter').addEventListener('change',e=>{state.status=e.target.value;renderLibrary();});
$('#genre-filter').addEventListener('change',e=>{state.genre=e.target.value;renderLibrary();});
$('#sort-select').value=state.sort; $('#sort-select').addEventListener('change',e=>{state.sort=e.target.value;renderLibrary();});
}

function cardHtml(x){const pct=x.totalProgress?Math.min(100,Number(x.progress)/Number(x.totalProgress)*100):0;return `<article class="media-card" data-item-id="${attr(x.id)}"><div class="poster">${x.imageUrl?`<img src="${attr(safeUrl(x.imageUrl))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'poster-fallback',textContent:'${ICONS[x.type]||'◆'}'}))">`:`<div class="poster-fallback">${ICONS[x.type]||'◆'}</div>`}<span class="badge">${TYPES[x.type]||x.type}</span>${x.favorite?'<span class="heart">♥</span>':''}</div><div class="card-body"><h3 title="${attr(x.title)}">${esc(x.title)}</h3><div class="meta">${x.score?`<span class="score">★ ${x.score}</span><span>•</span>`:''}<span>${x.year||STATUSES[x.status]||''}</span></div>${x.totalProgress?`<div class="progress-bar" title="${x.progress}/${x.totalProgress}"><i style="width:${pct}%"></i></div>`:''}</div></article>`;}
function listHtml(x){return `<article class="list-row" data-item-id="${attr(x.id)}">${x.imageUrl?`<img src="${attr(safeUrl(x.imageUrl))}" alt="" loading="lazy">`:'<div class="mini-poster"></div>'}<div class="list-title"><strong>${esc(x.title)}</strong><small>${x.year||'Yıl yok'} · ${TYPES[x.type]}</small></div><span class="pill">${STATUSES[x.status]||x.status}</span><span>${x.progress||0}${x.totalProgress?' / '+x.totalProgress:''}</span><span class="score">${x.score?'★ '+x.score:'—'}</span><span>${x.favorite?'♥':''}</span></article>`;}
function emptyHtml(title,text){return `<div class="empty"><span class="big">◇</span><h3>${title}</h3><p>${text}</p></div>`;}

function renderImport(){
$('#content').innerHTML=`<div class="page-head"><div><span class="eyebrow">VERİ YÖNETİMİ</span><h1>İçe / Dışa Aktar</h1><p>Arşivini taşı ve dosya olarak yedekle.</p></div></div>
<div class="settings-grid">
<section class="panel"><h2>MyAnimeList içe aktar</h2><p>MAL'den indirdiğin anime veya manga XML dosyasını yükle. <b>.xml.gz</b> dosyası da tarayıcıda açılır.</p><div class="dropzone" id="mal-drop"><div style="font-size:32px">⇧</div><strong>XML veya XML.GZ dosyanı seç</strong><p>Mevcut kayıtlar MAL kimliğine göre güncellenir.</p><div class="action-row" style="justify-content:center"><button class="btn btn-primary" data-action="import-mal">Dosya Seç</button><button class="btn" data-action="enrich-covers">Eksik kapakları getir</button></div></div></section>
<section class="panel"><h2>Dışa aktar</h2><p>Kütüphanenin tamamını taşınabilir JSON veya tablo uyumlu CSV olarak indir.</p><div class="action-row"><button class="btn" data-action="export" data-format="json">JSON indir</button><button class="btn" data-action="export" data-format="csv">CSV indir</button></div></section>
<section class="panel"><h2>Tam yedek</h2><p>Kütüphaneni ve aktivite günlüğünü JSON dosyası olarak indir. Tarayıcı verilerini temizlemeden önce yedek al.</p><div class="action-row"><button class="btn btn-primary" data-action="backup">Şimdi Yedekle</button></div></section>
<section class="panel"><h2>JSON yedeğini geri yükle</h2><p>Daha önce dışa aktardığın JSON dosyasını birleştirir. Aynı kaynak kimliğine sahip kayıtlar güncellenir.</p><button class="btn" data-action="restore-json">JSON Seç</button></section>
</div>`;
const drop=$('#mal-drop'); ['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('drag')})); ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('drag')})); drop.addEventListener('drop',e=>{const f=e.dataTransfer.files[0];if(f)readImportFile(f,'mal')});
}

function renderSettings(){
$('#content').innerHTML=`<div class="page-head"><div><span class="eyebrow">YAPILANDIRMA</span><h1>Ayarlar</h1><p>Dış servis bağlantıları ve uygulama bilgileri.</p></div></div><div class="settings-grid">
<section class="panel"><h2>TMDB bağlantısı</h2><p>Film, dizi ve K-Drama araması için ücretsiz TMDB Read Access Token kullanılır. Token yalnızca bu sekmenin oturumunda tutulur; sekmeyi kapattığında silinir. Kaynak dosyalarına veya GitHub’a gönderilmez.</p><div class="setting-field"><input class="field" id="tmdb-token" type="password" placeholder="eyJhbGciOiJIUzI1NiJ9…"><button class="btn btn-primary" data-action="save-token">Kaydet</button></div><p class="hint">Durum: ${state.config.tmdbConfigured?'<span style="color:var(--green)">Bağlı</span>':'<span style="color:#fbbf24">Token bekleniyor</span>'}</p></section>
<section class="panel"><h2>Gizlilik</h2><p>Site bağlantısı herkese açıktır. Kütüphane yalnızca bu tarayıcının yerel veritabanında saklanır; GitHub’a yüklenmez. Cihazlar arasında otomatik eşitleme yoktur. JSON yedeği ile taşıyabilirsin.</p><p class="hint">Depolama: Bu cihaz · Bu tarayıcı</p></section></div>`;
}

function openEditor(item, preferredType, template){
const x=item||template||{type:preferredType||state.type||'anime',status:'planned',score:0,progress:0,totalProgress:0,favorite:false};
modal(`<div class="modal wide"><div class="modal-head"><h2>${item?'Kaydı Düzenle':'Yeni İçerik'}</h2><button class="close" data-close>×</button></div><div class="modal-body"><form id="item-form" class="form-grid">
<input type="hidden" name="id" value="${attr(x.id||'')}"><input type="hidden" name="source" value="${attr(x.source||'manual')}"><input type="hidden" name="sourceId" value="${attr(x.sourceId||'')}"><input type="hidden" name="externalUrl" value="${attr(x.externalUrl||'')}"><input type="hidden" name="metadataJson" value="${attr(x.metadataJson||'{}')}">
<div class="form-group"><label>Tür</label><select name="type">${Object.entries(TYPES).map(([v,l])=>`<option value="${v}" ${x.type===v?'selected':''}>${l}</option>`).join('')}</select></div>
<div class="form-group"><label for="metadata-provider">Arama kaynağı</label><select id="metadata-provider"><option value="auto">Otomatik · ücretsiz yedekli</option><option value="backup">Ücretsiz yedek kaynak</option></select><small class="hint">Servis çalışmasa da başlığı girip manuel kaydedebilirsiniz.</small><button type="button" class="btn" id="metadata-btn">⌕ Metadata ve kapak ara</button></div>
<div class="form-group full" id="selected-source" style="display:${x.imageUrl?'block':'none'}">${x.imageUrl?selectedSourceHtml(x):''}</div>
<div class="form-group full"><label>Başlık *</label><input name="title" required value="${attr(x.title||'')}"></div>
<div class="form-group"><label>Orijinal başlık</label><input name="originalTitle" value="${attr(x.originalTitle||'')}"></div><div class="form-group"><label>Yıl</label><input name="year" type="number" min="0" max="2200" value="${x.year||''}"></div>
<div class="form-group"><label>Durum</label><select name="status">${Object.entries(STATUSES).map(([v,l])=>`<option value="${v}" ${x.status===v?'selected':''}>${l}</option>`).join('')}</select></div>
<div class="form-group"><label>Puan (0–10)</label><input name="score" type="number" min="0" max="10" step="0.5" value="${x.score||0}"></div>
<div class="form-group"><label>İlerleme</label><input name="progress" type="number" min="0" value="${x.progress||0}"></div><div class="form-group"><label>Toplam bölüm / sayfa</label><input name="totalProgress" type="number" min="0" value="${x.totalProgress||0}"></div>
<div class="form-group"><label>Bitirme tarihi</label><input name="completedAt" type="date" value="${attr(parseMeta(x).completedAt||'')}"><small class="hint">Tamamlanan içeriklerde kullanılır.</small></div><div class="form-group"><label>Süre (dakika)</label><input name="durationMinutes" type="number" min="0" step="1" value="${Number(parseMeta(x).durationMinutes)||''}"><small class="hint">Film toplamı; anime / dizi bölüm başına. Kitap / manga için boş bırak.</small></div><div class="form-group full"><label>Etiketler (virgülle)</label><input name="tags" value="${attr(x.tags||'')}"></div><div class="form-group full"><label>Notlar</label><textarea name="notes">${esc(x.notes||'')}</textarea></div>
<div class="form-group"><label>Kapak URL</label><input name="imageUrl" value="${attr(x.imageUrl||'')}"></div><label class="check"><input name="favorite" type="checkbox" ${x.favorite?'checked':''}> Favorilere ekle</label>
<div class="modal-actions">${item?'<button type="button" class="btn btn-danger" id="delete-btn">Sil</button>':''}<span style="flex:1"></span><button type="button" class="btn btn-ghost" data-close>Vazgeç</button><button type="submit" class="btn btn-primary">Kaydet</button></div>
</form></div></div>`);
const form=$('#item-form'); $('#metadata-btn').addEventListener('click',()=>openMetadataSearch(form)); form.addEventListener('submit',e=>saveForm(e,form));
if(item)$('#delete-btn').addEventListener('click',()=>removeItem(item.id));
}

function selectedSourceHtml(x){return `<div class="selected-source">${x.imageUrl?`<img src="${attr(safeUrl(x.imageUrl))}" alt="">`:''}<div><strong>${esc(x.title||'Kapak seçildi')}</strong><p>${esc(x.source||'manual')} ${x.sourceId?'#'+esc(x.sourceId):''}</p></div></div>`;}

function openMetadataSearch(form){
const title=form.elements.title.value; const type=form.elements.type.value;
const overlay=document.createElement('div');overlay.className='modal-backdrop';overlay.style.zIndex='60';overlay.innerHTML=`<div class="modal"><div class="modal-head"><h2>İnternetten ara · ${TYPES[type]}</h2><button class="close" data-search-close>×</button></div><div class="modal-body"><div class="metadata-search"><input class="field" id="metadata-query" value="${attr(title)}" placeholder="Başlık yaz…"><button class="btn btn-primary" id="metadata-go">Ara</button></div><div id="search-results">${title?'<div class="loading-card" style="min-height:180px"><span class="spinner"></span></div>':emptyHtml('Aramaya başla','En az iki karakter yaz.')}</div></div></div>`;document.body.appendChild(overlay);
const close=()=>overlay.remove();$('[data-search-close]',overlay).onclick=close;overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
const run=async()=>{const q=$('#metadata-query',overlay).value.trim();if(q.length<2)return;$('#search-results',overlay).innerHTML='<div class="loading-card" style="min-height:180px"><span class="spinner"></span></div>';try{const response=await server('searchMetadataWithStatus',q,type,$('#metadata-provider',form).value,form.elements.id.value);const results=response.items||[];if(!overlay.isConnected)return;$('#search-results',overlay).innerHTML=results.length?`<div class="search-results">${results.map((x,i)=>`<button class="search-result" data-result="${i}">${x.imageUrl?`<img src="${attr(safeUrl(x.imageUrl))}" alt="">`:'<div class="poster-fallback" style="aspect-ratio:2/3">◇</div>'}<div><strong>${esc(x.title)}</strong><small>${x.year||''}</small></div></button>`).join('')}</div>`:emptyHtml('Sonuç bulunamadı','Başka bir adla tekrar deneyebilirsin.');if(response.notice)$('#search-results',overlay).insertAdjacentHTML('afterbegin','<p class="hint">'+esc(response.notice)+'</p>');$$('[data-result]',overlay).forEach(btn=>btn.onclick=()=>{applyMetadata(form,results[Number(btn.dataset.result)]);close()});}catch(err){$('#search-results',overlay).innerHTML=emptyHtml('Arama yapılamadı',esc(err.message));}};
$('#metadata-go',overlay).onclick=run;$('#metadata-query',overlay).addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();run()}});if(title)run();
}

function applyMetadata(form,x){['title','originalTitle','year','totalProgress','imageUrl','source','sourceId','externalUrl'].forEach(k=>{if(form.elements[k]&&x[k]!==undefined)form.elements[k].value=x[k]||''});form.elements.metadataJson.value=JSON.stringify(x.metadataJson||{});const box=$('#selected-source');box.style.display='block';box.innerHTML=selectedSourceHtml(x);toast('Kapak ve bilgiler forma eklendi.','success');}

async function saveForm(e,form){e.preventDefault();const btn=form.querySelector('[type=submit]');btn.disabled=true;btn.textContent='Kaydediliyor…';const fd=new FormData(form),x=Object.fromEntries(fd.entries());const tracking=parseMeta(x);tracking.completedAt=x.completedAt;tracking.durationMinutes=Number(x.durationMinutes||0);x.metadataJson=JSON.stringify(tracking);delete x.completedAt;delete x.durationMinutes;x.favorite=form.elements.favorite.checked;x.year=Number(x.year||0);x.score=Number(x.score||0);x.progress=Number(x.progress||0);x.totalProgress=Number(x.totalProgress||0);try{await server('saveItem',x);closeModal();await refresh();toast('Kayıt kaydedildi.','success');}catch(err){toast(err.message,'error');btn.disabled=false;btn.textContent='Kaydet';}}

function openDetail(id){const x=state.items.find(i=>i.id===id);if(!x)return;let meta={};try{meta=JSON.parse(x.metadataJson||'{}')}catch(e){}modal(`<div class="modal"><div class="modal-head"><h2>İçerik Detayı</h2><button class="close" data-close>×</button></div><div class="modal-body"><div style="display:grid;grid-template-columns:150px 1fr;gap:22px">${x.imageUrl?`<img src="${attr(safeUrl(x.imageUrl))}" style="width:150px;border-radius:12px;aspect-ratio:2/3;object-fit:cover">`:`<div class="poster-fallback" style="border-radius:12px">${ICONS[x.type]}</div>`}<div><span class="eyebrow">${TYPES[x.type]}</span><h1 style="font-size:25px;margin:7px 0">${esc(x.title)}</h1><p class="hint">${esc(x.originalTitle||'')}${x.year?' · '+x.year:''}</p><div class="action-row" style="margin:16px 0"><span class="pill">${STATUSES[x.status]}</span>${x.score?`<span class="score">★ ${x.score}/10</span>`:''}${x.favorite?'<span style="color:#ff7790">♥ Favori</span>':''}</div><p class="hint">İlerleme: <b style="color:#fff">${x.progress||0}${x.totalProgress?' / '+x.totalProgress:''}</b></p>${meta.synopsis?`<p style="line-height:1.6;color:#b6bdcc;font-size:13px">${esc(meta.synopsis)}</p>`:''}${x.tags?`<p class="hint">Etiketler: ${esc(x.tags)}</p>`:''}${x.notes?`<div class="panel" style="padding:13px;margin-top:12px"><small class="hint">NOTLAR</small><p style="white-space:pre-wrap;margin:7px 0">${esc(x.notes)}</p></div>`:''}</div></div><div class="action-row" style="justify-content:flex-end;margin-top:22px">${x.externalUrl?`<a class="btn" href="${attr(safeUrl(x.externalUrl))}" target="_blank" rel="noopener">Kaynağı aç ↗</a>`:''}<button class="btn btn-primary" id="edit-detail">Düzenle</button></div></div></div>`);$('#edit-detail').onclick=()=>{closeModal();openEditor(x)};}

async function removeItem(id){if(!confirm('Bu kaydı kalıcı olarak silmek istediğine emin misin?'))return;try{await server('deleteItem',id);closeModal();await refresh();toast('Kayıt silindi.','success')}catch(err){toast(err.message,'error')}}
function modal(html){$('#modal-root').innerHTML=`<div class="modal-backdrop">${html}</div>`;const root=$('#modal-root');$$('[data-close]',root).forEach(x=>x.onclick=closeModal);$('.modal-backdrop',root).addEventListener('click',e=>{if(e.target.classList.contains('modal-backdrop'))closeModal()});}
function closeModal(){$('#modal-root').innerHTML='';}

function pickFile(mode){const input=$('#file-input');input.accept=mode==='mal'?'.xml,.gz,.xml.gz,application/xml,application/gzip':'.json,application/json';input.value='';input.onchange=()=>{if(input.files[0])readImportFile(input.files[0],mode)};input.click();}
async function readImportFile(file,mode){try{toast('Dosya okunuyor…');let text;if(mode==='mal'&&(file.name.toLowerCase().endsWith('.gz')||file.type.includes('gzip'))){if(typeof DecompressionStream==='undefined')throw new Error('Bu tarayıcı GZIP açamıyor. Dosyayı çıkarıp XML olarak seçin.');const stream=file.stream().pipeThrough(new DecompressionStream('gzip'));text=await new Response(stream).text();}else text=await file.text();const result=await server(mode==='mal'?'importMalXml':'restoreJsonBackup',text);await refresh();toast(`${result.total} kayıt işlendi: ${result.added} yeni, ${result.updated} güncellendi${result.skipped?' · '+result.skipped+' tekrar atlandı':''}.`,'success');}catch(err){toast(err.message,'error');}}
async function doExport(format){try{const out=await server('exportLibrary',format);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([out.content],{type:out.mimeType}));a.download=out.filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Dosya indirildi.','success')}catch(err){toast(err.message,'error')}}
async function doBackup(){try{const out=await server('createLocalBackup');downloadFile(out);toast('Tam yedek indirildi.','success')}catch(err){toast(err.message,'error')}}
async function enrichCovers(){try{toast('Eksik kapaklar AniList üzerinden getiriliyor…');const out=await server('enrichMissingCovers');await refresh();toast(`${out.updated} kapak güncellendi${out.remaining?' · '+out.remaining+' kayıt kaldı':''}.`,'success')}catch(err){toast(err.message,'error')}}
function parseMeta(x){try{return JSON.parse(x.metadataJson||'{}')||{}}catch(e){return {}}}
function genresForItem(x){const m=parseMeta(x);const values=[...(m.genres||[]),...(m.categories||[]),...(String(x.tags||'').split(',').map(v=>v.trim()).filter(Boolean))];return values.filter((v,i,a)=>v&&a.indexOf(v)===i)}
function allGenres(){return [...new Set(state.items.flatMap(genresForItem))].sort((a,b)=>a.localeCompare(b,'tr'))}
function renderCalendar(){
const rows=state.calendar||[];
$('#content').innerHTML=`<div class="page-head"><div><span class="eyebrow">YAYIN TAKVİMİ</span><h1>Bölüm ve sezon takvimi</h1><p>Takip ettiğin içeriklerin yaklaşan yayınlarını ve hatırlatmalarını yönet.</p></div><div class="action-row"><button class="btn" data-action="refresh-schedule">Yayın bilgilerini yenile</button></div></div><div class="panel"><p class="hint">Takvim verisi AniList ve TMDB'den alınır. Bir kaydın yayın tarihi varsa ICS dosyası indirip Google Takvim, Apple Takvim veya Outlook’a aktarabilirsin. İşaretini kapatmak dış takvimdeki etkinliği silmez.</p>${rows.length?`<div class="schedule-list">${rows.map(r=>{const d=new Date(r.date);const date=d.toLocaleString('tr-TR',{dateStyle:'medium',timeStyle:'short'});return `<div class="schedule-row"><div class="schedule-date"><strong>${d.toLocaleDateString('tr-TR',{day:'2-digit'})}</strong><span>${d.toLocaleDateString('tr-TR',{month:'short'})}</span></div><div class="schedule-info"><strong>${esc(r.title)}</strong><small>${TYPES[r.type]||r.type}${r.episode?' · Bölüm '+r.episode:''}${r.season?' · Sezon '+r.season:''} · ${date}</small><small>${(r.genres||[]).map(esc).join(' · ')}</small></div><div class="schedule-actions">${r.episode?`<button class="btn btn-small" data-action="reminder" data-id="${attr(r.id)}" data-kind="episode" data-enabled="${r.reminderEpisode}">${r.reminderEpisode?'✓ Bölüm hatırlatması':'Bölüm hatırlat'}</button>`:''}${r.season?`<button class="btn btn-small" data-action="reminder" data-id="${attr(r.id)}" data-kind="season" data-enabled="${r.reminderSeason}">${r.reminderSeason?'✓ Sezon hatırlatması':'Sezon hatırlat'}</button>`:''}</div></div>`}).join('')}</div>`:emptyHtml('Yaklaşan yayın bulunamadı','Yayın bilgilerini yenile düğmesine basarak kayıtlarını kontrol edebilirsin.')}</div>`;
}
async function refreshSchedule(){try{toast('Yayın bilgileri güncelleniyor…');const out=await server('refreshReleaseData',50);state.calendar=await server('getCalendarData',120);await refresh();toast(`${out.updated} kayıt güncellendi.`,'success');renderCalendar()}catch(err){toast(err.message,'error')}}
async function toggleReminder(id,kind,enabled){try{const out=await server('saveReminder',id,kind,enabled);if(out.file)downloadFile(out.file);state.calendar=await server('getCalendarData',120);renderCalendar();toast(enabled?'Takvim dosyası indirildi; takvim uygulamana aktar.':'Hatırlatma kapatıldı.','success')}catch(err){toast(err.message,'error')}}

async function saveToken(){const input=$('#tmdb-token');const token=input.value.trim();if(!token){toast('Token alanı boş.','error');return}try{await server('setTmdbToken',token);state.config.tmdbConfigured=true;input.value='';renderSettings();toast('TMDB bağlantısı kaydedildi.','success')}catch(err){toast(err.message,'error')}}
async function refresh(){const data=await server('getBootstrapData');state.items=data.items||[];state.stats=data.stats||{};state.config=data.config||state.config;document.dispatchEvent(new CustomEvent('mv-items',{detail:state.items}));if(state.view==='calendar')state.calendar=await server('getCalendarData',120);updateCounts();render();}
function updateCounts(){Object.keys(TYPES).forEach(t=>{const el=$('#count-'+t);if(el)el.textContent=state.items.filter(x=>x.type===t).length})}
function toast(message,type=''){const el=document.createElement('div');el.className='toast '+type;el.textContent=message;$('#toast-region').appendChild(el);setTimeout(()=>el.remove(),4200)}
function showFatal(err){$('#content').innerHTML=`<div class="empty"><span class="big">!</span><h3>Uygulama başlatılamadı</h3><p>${esc(err.message)}</p><button class="btn" onclick="location.reload()">Tekrar dene</button></div>`;}
let insightYear=new Date().getFullYear(), activityRequest=0, lastRecommendation='';
const videoTypes=['anime','series','kdrama','movie'];
function completionDate(x){const value=parseMeta(x).completedAt||'';return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!isNaN(new Date(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value?value:'';}
function consumedUnits(x){return Number(x.progress)|| (x.status==='completed'?Number(x.totalProgress)||(x.type==='movie'?1:0):0);}
function durationOf(x){return Math.max(0,Number(parseMeta(x).durationMinutes)||0);}
function totalMinutes(x){return x.type==='movie'?(x.status==='completed'||x.progress>0?durationOf(x):0):durationOf(x)*consumedUnits(x);}
function yearOptions(){const years=[...new Set([new Date().getFullYear(),insightYear,...state.items.map(completionDate).filter(Boolean).map(d=>Number(d.slice(0,4)))])].sort((a,b)=>b-a);return `<label>Yıl <select id="insight-year">${years.map(y=>`<option ${y===insightYear?'selected':''}>${y}</option>`).join('')}</select></label>`;}
function bindYear(fn){$('#insight-year').onchange=e=>{insightYear=Number(e.target.value);fn();};}
function annualItems(){return state.items.filter(x=>x.status==='completed'&&completionDate(x).slice(0,4)===String(insightYear));}
function chartHtml(labels,counts){const max=Math.max(1,...counts);return `<div class="insights-chart">${labels.map((l,i)=>`<div class="insights-col"><b>${counts[i]}</b><i style="height:${Math.max(2,counts[i]/max*130)}px"></i><span>${esc(l)}</span></div>`).join('')}</div>`;}
function renderStatistics(){
const done=annualItems(), monthly=Array(12).fill(0), scores=Array(20).fill(0);done.forEach(x=>monthly[Number(completionDate(x).slice(5,7))-1]++);state.items.filter(x=>x.score>0).forEach(x=>scores[Math.round(x.score*2)-1]++);
const videos=state.items.filter(x=>videoTypes.includes(x.type)), episodes=videos.filter(x=>x.type!=='movie').reduce((n,x)=>n+consumedUnits(x),0), hours=videos.reduce((n,x)=>n+totalMinutes(x),0)/60;
const missing=videos.filter(x=>consumedUnits(x)>0&&!durationOf(x)).length, unknown=state.items.filter(x=>x.status==='completed'&&!completionDate(x)).length;
const genres={};videos.filter(x=>consumedUnits(x)>0).forEach(x=>genresForItem(x).forEach(g=>genres[g]=(genres[g]||0)+1));const ranked=Object.entries(genres).sort((a,b)=>b[1]-a[1]).slice(0,10), max=Math.max(1,...ranked.map(x=>x[1]));
$('#content').innerHTML=`<div class="page-head"><div><span class="eyebrow">ARŞİVİN SAYILARLA</span><h1>İstatistikler</h1><p>Bölüm ve saat toplamları tüm zamanları kapsar. Saatler kayıtlı sürelerden hesaplanır.</p></div>${yearOptions()}</div><div class="stats-grid">${statCard('Toplam bölüm',episodes,'Anime, dizi ve K-Drama')}${statCard('İzleme saati',hours.toFixed(1),'Süre bilgisi olan içerikler')}${statCard('Bu yıl tamamlanan',done.length,String(insightYear))}${statCard('Puanlanmış içerik',state.items.filter(x=>x.score>0).length,'Tüm zamanlar')}</div><p class="hint">${missing} izlenen içerikte süre bilgisi eksik. ${unknown} tamamlanmış içerikte bitirme tarihi yok; aylık ve yıllık sayımlara katılmaz.</p><div class="settings-grid"><section class="panel"><h2>Aylık tamamlananlar · ${insightYear}</h2>${chartHtml(['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'],monthly)}</section><section class="panel"><h2>Puan dağılımı · Tüm zamanlar</h2><p class="hint">0 puan / puanlanmamış kayıtlar dahil değildir.</p>${chartHtml(scores.map((_,i)=>(i+1)/2),scores)}</section><section class="panel"><h2>En çok izlenen türler</h2><p class="hint">İzlemeye başladığın içerik sayısı; bir içerik birden fazla türde sayılabilir. Etiketler de dahildir.</p>${ranked.length?ranked.map(([g,n])=>`<div class="genre-row"><span>${esc(g)}</span><i style="width:${n/max*100}%"></i><b>${n}</b></div>`).join(''):emptyHtml('Tür verisi yok','Kayıtlarına tür veya etiket ekle.')}</section></div>`;bindYear(renderStatistics);
}
function annualSummary(){const items=annualItems(),scored=items.filter(x=>x.score>0),hours=items.filter(x=>videoTypes.includes(x.type)).reduce((n,x)=>n+totalMinutes(x),0)/60;return {items,average:scored.length?(scored.reduce((n,x)=>n+x.score,0)/scored.length).toFixed(1):'—',hours:hours.toFixed(1)};}
function renderYear(){const s=annualSummary();$('#content').innerHTML=`<div class="page-head"><div><span class="eyebrow">SENİN YILIN</span><h1>Yıllık Özet</h1><p>Bitirme tarihi kayıtlı içeriklerden oluşturulur.</p></div>${yearOptions()}</div><section class="annual-card"><span class="eyebrow">MEDIA VAULT · ${insightYear}</span><h2>${insightYear}'da ${s.items.length} içerik bitirdin.</h2><p>İzlediğin hikâyeler, okuduğun dünyalar.</p><div class="stats-grid">${statCard('Ortalama puanın',s.average,'10 üzerinden')}${statCard('İzleme saati',s.hours,'Kayıtlı sürelerden')}${statCard('Favorilerin',s.items.filter(x=>x.favorite).length,'Bu yıl bitirilenler')}</div><p>${Object.keys(TYPES).map(t=>`${TYPES[t]}: ${s.items.filter(x=>x.type===t).length}`).join(' · ')}</p></section><button class="btn btn-primary" id="share-year">Paylaşılabilir görsel indir</button><p class="hint">Görsel hesap bilgilerini içermez. Saatler yalnızca süre bilgisi bulunan içeriklerin toplamıdır.</p><div class="media-grid">${s.items.slice().sort((a,b)=>b.score-a.score).slice(0,6).map(cardHtml).join('')}</div>`;bindYear(renderYear);$('#share-year').onclick=downloadYear;}
async function downloadYear(){try{await document.fonts.ready;const s=annualSummary(),canvas=document.createElement('canvas');canvas.width=1200;canvas.height=800;const c=canvas.getContext('2d'),g=c.createLinearGradient(0,0,1200,800);g.addColorStop(0,'#2d2046');g.addColorStop(1,'#101823');c.fillStyle=g;c.fillRect(0,0,1200,800);c.fillStyle='#c4b5fd';c.font='bold 24px sans-serif';c.fillText('MEDIA VAULT  /  '+insightYear,70,90);c.fillStyle='#fff';c.font='bold 58px sans-serif';c.fillText(insightYear+"’da "+s.items.length+' içerik bitirdin.',70,225);c.font='28px sans-serif';c.fillStyle='#cbd5e1';c.fillText('İzlediğin hikâyeler, okuduğun dünyalar.',70,285);c.font='bold 38px sans-serif';c.fillText('★ '+s.average+' / 10',70,405);c.fillText(s.hours+' saat',440,405);c.fillText(s.items.filter(x=>x.favorite).length+' favori',810,405);c.font='22px sans-serif';Object.keys(TYPES).forEach((t,i)=>c.fillText(TYPES[t]+': '+s.items.filter(x=>x.type===t).length,70+(i%3)*370,510+Math.floor(i/3)*60));c.font='18px sans-serif';c.fillText('Bitirme tarihi kayıtlı içerikler · Saatler kayıtlı sürelerden hesaplanır',70,725);canvas.toBlob(blob=>{if(!blob){toast('Görsel oluşturulamadı.','error');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='media-vault-'+insightYear+'-ozet.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},'image/png');}catch(e){toast(e.message,'error');}}
async function renderActivity(){const request=++activityRequest;$('#content').innerHTML=`<div class="page-head"><div><span class="eyebrow">ZAMAN ÇİZELGESİ</span><h1>Aktivite Günlüğü</h1><p>Bu sürümden sonraki eklemeler, düzenlemeler ve silmeler burada tutulur.</p></div></div><div id="activity-list" class="panel"><p>Yükleniyor…</p></div><button class="btn" id="activity-more" hidden>Daha eski aktiviteler</button>`;let offset=0;const load=async()=>{const button=$('#activity-more');button.disabled=true;try{const page=await server('getActivityPage',offset,50);if(request!==activityRequest||state.view!=='activity')return;const list=$('#activity-list');if(!offset)list.innerHTML='';list.insertAdjacentHTML('beforeend',page.entries.map(activityHtml).join(''));if(!page.total)list.innerHTML=emptyHtml('Henüz aktivite yok','İçerik eklediğinde veya güncellediğinde burada görünecek.');offset=page.nextOffset;button.hidden=offset>=page.total;}catch(e){if(request===activityRequest&&state.view==='activity')toast(e.message,'error');}finally{button.disabled=false;}};$('#activity-more').onclick=load;await load();}
function activityHtml(r){let changes={};try{changes=JSON.parse(r.changesJson||'{}')}catch(e){}const labels={title:'Başlık',type:'Kategori',status:'Durum',score:'Puan',progress:'İlerleme',totalProgress:'Toplam',favorite:'Favori',tags:'Etiketler',notes:'Notlar',imageUrl:'Kapak',completedAt:'Bitirme tarihi',durationMinutes:'Süre'};const value=(k,v)=>k==='status'?STATUSES[v]||v:k==='type'?TYPES[v]||v:k==='favorite'?(v===true?'Evet':'Hayır'):v;return `<article class="activity-entry"><small class="hint">${esc(new Date(r.at).toLocaleString('tr-TR'))}</small><p><strong>${esc(r.title)}</strong> · ${({added:'Eklendi',deleted:'Silindi',updated:'Güncellendi'})[r.action]||esc(r.action)}</p>${Object.entries(changes).map(([k,v])=>`<p class="hint">${labels[k]||esc(k)}: ${k==='imageUrl'?'Kapak değiştirildi':esc(value(k,v.from))+' → '+esc(value(k,v.to))}</p>`).join('')}</article>`;}
function recommendationScore(x){const m=parseMeta(x);return Number(x.score)||Number(m.malScore)||Number(m.tmdbScore)||Number(m.anilistScore)/10||0;}
function recommendationPool(f){return state.items.filter(x=>['planned','in_progress','on_hold'].includes(x.status)&&(!f.type||x.type===f.type)&&(!f.genre||genresForItem(x).includes(f.genre))&&(!f.minScore||recommendationScore(x)>=f.minScore)&&(!f.maxMinutes||(durationOf(x)>0&&durationOf(x)<=f.maxMinutes)));}
let recommendationResults=[], recommendationRequest=0;
function renderRecommend(){
$('#content').innerHTML=`<div class="page-head"><div><span class="eyebrow">ZEVKİNE GÖRE KEŞFET</span><h1>Ne izlesem / okusam?</h1><p>Puanların, favorilerin ve bıraktığın içeriklerden sana özel öneriler.</p></div></div><section class="panel"><form id="recommend-form" class="recommend-form"><label>Kategori<select name="type">${Object.entries(TYPES).map(([t,l])=>`<option value="${t}">${l}</option>`).join('')}</select></label><label>Nereden?<select name="scope"><option value="new">Yeni içerikler keşfet</option><option value="library">Planlananlarım arasından</option></select></label><label>Tür / etiket<select name="genre"><option value="">Tümü</option>${allGenres().map(g=>`<option value="${attr(g)}">${esc(g)}</option>`).join('')}</select></label><label>En fazla dakika<input name="maxMinutes" type="number" min="1" placeholder="Sınır yok"></label><label>Minimum kaynak puanı<input name="minScore" type="number" min="0" max="10" step="0.5" value="0"></label><label class="check"><input name="useGemini" type="checkbox"> Gemini ile sırala</label><button class="btn btn-primary" type="submit">Bana özel öneriler getir</button></form><p class="hint">Yeni içeriklerde kaynak puanı; planlananlarında varsa kendi puanın kullanılır. Süre film toplamı veya bölüm başına dakikadır. Süresi bilinmeyenler süre filtresinde elenir. Tür listesinde kendi etiketlerin de vardır; yeni içeriklerde eşleşmeyebilir.</p><details><summary>İsteğe bağlı Gemini bağlantısı</summary><p class="hint">Gemini öğrenci / Pro üyeliği API kotasından ayrıdır. AI Studio’da faturalandırma bağlı olmayan Free Tier projesinden anahtar oluştur. Uygulama anahtardan faturalandırma durumunu doğrulayamaz. Ücretli projeye ait anahtar kullanma. Gemini’ye yalnızca sevdiğin içeriklerin başlık, puan, tür bilgileri ve adayların özetleri gönderilir; notların ve hesap bilgilerin gönderilmez. Ücretsiz API verileri Google tarafından ürünleri iyileştirmek için kullanılabilir. Anahtar yalnızca bu sekmenin oturumunda tutulur. Bu cihazda günde en fazla 10 yeni sıralama isteği yapılır.</p><div class="action-row"><input id="gemini-key" class="field" type="password" autocomplete="off" placeholder="AI Studio API anahtarı"><button class="btn" id="gemini-save" type="button">Kaydet</button><button class="btn" id="gemini-remove" type="button">Bağlantıyı kaldır</button></div><label class="check"><input id="gemini-free" type="checkbox"> Projemin Free Tier olduğunu ve faturalandırma bağlı olmadığını doğruladım.</label><p id="gemini-status" class="hint"></p><a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener">AI Studio API anahtarı oluştur ↗</a></details></section><div id="recommend-result" aria-live="polite">${emptyHtml('Yeni hikâyeler seni bekliyor','Kategori seçip sana özel önerileri getir.')}</div>`;
const form=$('#recommend-form');form.elements.type.onchange=()=>{form.elements.genre.value='';};
const req=++recommendationRequest;server('getGeminiRecommendationConfig').then(config=>{if(req!==recommendationRequest||state.view!=='recommend')return;$('#gemini-status').textContent=config.configured?'Gemini anahtarı kayıtlı. Model: '+config.model:'Gemini bağlı değil; ücretsiz benzerlik önerileri hazır.';}).catch(()=>{});
$('#gemini-save').onclick=async()=>{const btn=$('#gemini-save');btn.disabled=true;try{await server('setGeminiRecommendationKey',$('#gemini-key').value,$('#gemini-free').checked);$('#gemini-key').value='';$('#gemini-status').textContent='Anahtar kaydedildi. Gemini ile sırala seçeneğini kullanabilirsin.';}catch(e){toast(e.message,'error');}finally{btn.disabled=false;}};
$('#gemini-remove').onclick=async()=>{try{await server('removeGeminiRecommendationKey');$('#gemini-status').textContent='Gemini bağlantısı kaldırıldı.';form.elements.useGemini.checked=false;}catch(e){toast(e.message,'error');}};
form.onsubmit=async e=>{e.preventDefault();const btn=form.querySelector('[type=submit]'),request=++recommendationRequest;btn.disabled=true;btn.textContent='Zevkine uygun içerikler aranıyor…';const values=Object.fromEntries(new FormData(form));values.useGemini=form.elements.useGemini.checked;const isLibrary=values.scope==='library';try{const out=await server('getPersonalRecommendations',values);if(request!==recommendationRequest||state.view!=='recommend')return;recommendationResults=out.recommendations||[];$('#recommend-result').innerHTML=`<section class="panel"><h2>${out.aiUsed?'Gemini ile sıralandı':'Sana özel benzerlik önerileri'}</h2><p class="hint">${esc((out.profile.genres||[]).length?'Öne çıkan zevklerin: '+out.profile.genres.join(' · '):'Tercih profilin henüz oluşuyor.')}</p>${out.notice?`<p class="hint">${esc(out.notice)}</p>`:''}</section>${recommendationResults.length?`<div class="media-grid">${recommendationResults.map((r,i)=>{const x=r.item;return `<article class="media-card${out.aiUsed?' gemini-recommendation':''}"><div class="poster">${x.imageUrl?`<img src="${attr(safeUrl(x.imageUrl))}" alt="" loading="lazy" referrerpolicy="no-referrer">`:`<div class="poster-fallback">${ICONS[x.type]}</div>`}<span class="badge">${TYPES[x.type]}</span></div><div class="card-body"><h3>${esc(x.title)}</h3><div class="meta">${x.year||''} · ★ ${Number(r.sourceScore).toFixed(1)}</div><p class="hint">${esc(r.reason)}</p><div class="action-row"><button class="btn btn-small" data-rec-add="${i}">${isLibrary?'Kaydı aç':'Planlananlara ekle'}</button>${x.externalUrl?`<a class="btn btn-small" href="${attr(safeUrl(x.externalUrl))}" target="_blank" rel="noopener">Kaynak ↗</a>`:''}</div></div></article>`;}).join('')}</div>`:emptyHtml('Uygun yeni içerik bulunamadı','Filtreleri genişlet; süre veya puan bilgisi bulunmayan adaylar elenmiş olabilir.')}`;$$('[data-rec-add]').forEach(b=>b.onclick=()=>{const x=recommendationResults[Number(b.dataset.recAdd)].item;if(isLibrary){openDetail(x.id);return;}const exists=state.items.find(item=>item.source===x.source&&item.sourceId===x.sourceId&&item.type===x.type);if(exists){openDetail(exists.id);return;}openEditor(null,x.type,{...x,id:'',status:'planned',score:0,progress:0,favorite:false});});}catch(err){if(request===recommendationRequest&&state.view==='recommend')$('#recommend-result').innerHTML=emptyHtml('Öneriler getirilemedi',esc(err.message));}finally{btn.disabled=false;btn.textContent='Bana özel öneriler getir';}};
}

function downloadFile(out){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([out.content],{type:out.mimeType}));a.download=out.filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
window.mvRefresh = refresh;
init();
})();


(() => {
'use strict';
const q = (s, r) => (r || document).querySelector(s);
const qa = (s, r) => Array.from((r || document).querySelectorAll(s));
const call = (fn, ...args) => window.MediaVault.call(fn, ...args);
const cache = { items: [], loaded: false, selected: new Set() };
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function loadItems(){  return call('getBootstrapData').then(d => { cache.items=d.items || []; cache.loaded=true; return cache.items; }); }
function setField(form, name, value){ const el=form.elements[name] || q('[name="'+name+'"]',form); if(!el) return; el.value=value == null ? '' : value; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }
function attachForm(form){
if(!form || form.dataset.mvAutoSearch) return;
const title=form.elements.title || q('input[placeholder*="Başlık"],input[name="title"]',form); const type=form.elements.type || q('select[name="type"]',form);
if(!title || !type) return; form.dataset.mvAutoSearch='1';
const box=document.createElement('div'); box.id='mv-auto-results'; box.style.cssText='grid-column:1/-1;display:none;margin:-4px 0 12px';
(title.closest('.form-group') || title.parentElement).after(box);
let timer=0, request=0;
const run=()=>{ const n=++request; const text=title.value.trim(); if(text.length<2){box.style.display='none';box.innerHTML='';return;} box.style.display='block'; box.innerHTML='<div class="hint">İnternetten aranıyor…</div>'; call('searchMetadataWithStatus',text,type.value,(q('#metadata-provider',form)||{}).value||'auto',form.elements.id.value).then(response=>{ const results=response.items||[]; if(n!==request || !form.isConnected)return; if(!results.length){box.innerHTML='<div class="hint">'+esc(response.notice||'Sonuç bulunamadı. Manuel kayıt yapabilirsiniz.')+'</div>';return;} box.innerHTML='<div class="hint" style="margin-bottom:6px">Doğru içeriği seç:</div><div style="display:flex;flex-wrap:wrap;gap:8px">'+results.slice(0,8).map((x,i)=>'<button type="button" class="btn mv-result" data-i="'+i+'" style="display:flex;align-items:center;gap:8px;text-align:left">'+(x.imageUrl?'<img src="'+esc(x.imageUrl)+'" style="width:28px;height:40px;object-fit:cover;border-radius:4px">':'')+'<span><strong>'+esc(x.title)+'</strong><small style="display:block;color:#aeb5c5">'+esc(x.year || '')+(x.totalProgress?' · '+x.totalProgress+' bölüm':'')+'</small></span></button>').join('')+'</div>'; if(response.notice)box.insertAdjacentHTML('afterbegin','<p class="hint">'+esc(response.notice)+'</p>');qa('.mv-result',box).forEach(btn=>btn.addEventListener('click',()=>{const x=results[Number(btn.dataset.i)]; ['title','originalTitle','year','totalProgress','imageUrl','source','sourceId','externalUrl'].forEach(k=>{const field=form.elements[k];if(x[k]!==undefined && field)field.value=x[k];}); setField(form,'metadataJson',JSON.stringify(x.metadataJson || {})); box.style.display='none'; form.dataset.metadataSelected='true'; })); }).catch(err=>{if(n!==request || !form.isConnected)return;box.innerHTML='<div class="hint">Arama yapılamadı: '+esc(err.message || err)+'</div>';}); };
q('#metadata-provider',form).addEventListener('change',()=>{request++;clearTimeout(timer);run();});
title.addEventListener('input',()=>{request++;clearTimeout(timer);timer=setTimeout(run,550);}); type.addEventListener('change',()=>{request++;clearTimeout(timer);['sourceId','externalUrl','metadataJson','imageUrl','originalTitle','year','totalProgress'].forEach(k=>{if(form.elements[k])form.elements[k].value=k==='metadataJson'?'{}':'';});form.elements.source.value='manual';timer=setTimeout(run,200);});

}
function applyFilters(){
const results=q('#library-results'); if(!results || !cache.loaded) return;
const tag=(q('#mv-tag-filter')||{}).value || ''; const min=Number((q('#mv-score-filter')||{}).value || 0); const year=(q('#mv-year-filter')||{}).value || '';
const byId={}; cache.items.forEach(x=>byId[String(x.id)]=x);
qa('[data-item-id]',results).forEach(row=>{const x=byId[String(row.dataset.itemId)];if(!x)return;const tags=String(x.tags||'').split(',').map(v=>v.trim().toLocaleLowerCase('tr'));const visible=(!tag||tags.indexOf(tag.toLocaleLowerCase('tr'))>=0)&&(!min||Number(x.score||0)>=min)&&(!year||String(x.year||'')===year);row.style.display=visible?'':'none';});
}
function attachLibrary(results){
if(!results || results.dataset.mvEnhanced) return; results.dataset.mvEnhanced='1';
const toolbar=q('.toolbar'); if(!toolbar)return;
loadItems().then(items=>{
const tags=Array.from(new Set(items.flatMap(x=>String(x.tags||'').split(',').map(v=>v.trim()).filter(Boolean)))).sort((a,b)=>a.localeCompare(b,'tr'));
const years=Array.from(new Set(items.map(x=>Number(x.year||0)).filter(Boolean))).sort((a,b)=>b-a);
if(!q('#mv-tag-filter')){ const tag=document.createElement('select');tag.id='mv-tag-filter';tag.className='toolbar-select';tag.innerHTML='<option value="">Tüm etiketler</option>'+tags.map(t=>'<option value="'+esc(t)+'">'+esc(t)+'</option>').join('');toolbar.insertBefore(tag,toolbar.firstChild);tag.addEventListener('change',applyFilters); }
if(!q('#mv-score-filter')){ const score=document.createElement('select');score.id='mv-score-filter';score.className='toolbar-select';score.innerHTML='<option value="">Min. puan</option>'+[5,6,7,8,9].map(n=>'<option value="'+n+'">'+n+'+ puan</option>').join('');toolbar.insertBefore(score,toolbar.firstChild);score.addEventListener('change',applyFilters); }
if(!q('#mv-year-filter')){ const yr=document.createElement('select');yr.id='mv-year-filter';yr.className='toolbar-select';yr.innerHTML='<option value="">Tüm yıllar</option>'+years.map(y=>'<option value="'+y+'">'+y+'</option>').join('');toolbar.insertBefore(yr,toolbar.firstChild);yr.addEventListener('change',applyFilters); }
qa('[data-item-id]',results).forEach(row=>{if(q('.mv-check',row))return;const wrap=document.createElement('label');wrap.className='mv-check';wrap.style.cssText='position:absolute;left:8px;top:8px;z-index:4';wrap.innerHTML='<input type="checkbox" style="width:18px;height:18px;accent-color:#7c5cc9"><span></span>';wrap.querySelector('input').addEventListener('click',e=>{e.stopPropagation();const id=String(row.dataset.itemId);if(e.target.checked)cache.selected.add(id);else cache.selected.delete(id);updateBulk();});row.style.position='relative';wrap.addEventListener('click',e=>e.stopPropagation());row.appendChild(wrap);});
updateBulk(); applyFilters();
}).catch(err=>{results.dataset.mvEnhanced='';console.error(err);});
}
function updateBulk(){let bar=q('#mv-bulk-bar'); if(!bar){const toolbar=q('.toolbar');if(!toolbar)return;bar=document.createElement('div');bar.id='mv-bulk-bar';bar.style.cssText='display:none;align-items:center;gap:8px;flex-wrap:wrap;background:#1a1730;border:1px solid #493777;border-radius:12px;padding:10px 12px;margin:-6px 0 18px';toolbar.after(bar);} bar.style.display=cache.selected.size?'flex':'none';bar.innerHTML='<strong>'+cache.selected.size+' seçili</strong><select id="mv-bulk-status"><option value="">Durum</option><option value="planned">Planlandı</option><option value="in_progress">Devam Ediyor</option><option value="completed">Tamamlandı</option><option value="on_hold">Beklemede</option><option value="dropped">Bırakıldı</option></select><input id="mv-bulk-score" type="number" min="0" max="10" step="0.5" placeholder="Puan"><input id="mv-bulk-tags" placeholder="Etiket"><button type="button" class="btn btn-primary" id="mv-bulk-apply">Uygula</button><button type="button" class="btn" id="mv-bulk-clear">Temizle</button>';q('#mv-bulk-apply').onclick=async()=>{const patch={};const s=q('#mv-bulk-status').value;const sc=q('#mv-bulk-score').value;const t=q('#mv-bulk-tags').value.trim();if(s)patch.status=s;if(sc!=='')patch.score=Number(sc);if(t)patch.tags=t;if(!Object.keys(patch).length)return;if(window.__mvBusy)return;window.__mvBusy=true;try{await call('bulkUpdateItems',Array.from(cache.selected),patch);cache.selected.clear();await window.mvRefresh();}catch(e){alert(e.message||e);}finally{window.__mvBusy=false;}};q('#mv-bulk-clear').onclick=()=>{cache.selected.clear();qa('.mv-check input').forEach(x=>x.checked=false);updateBulk();};}
document.addEventListener('mv-items',e=>{cache.items=e.detail;cache.loaded=true;cache.selected.clear();});
const observer=new MutationObserver(()=>{const form=q('#item-form,form.item-form');if(form)attachForm(form);const results=q('#library-results');if(results)attachLibrary(results);}); observer.observe(document.body,{childList:true,subtree:true});
setTimeout(()=>{const form=q('#item-form,form.item-form');if(form)attachForm(form);const results=q('#library-results');if(results)attachLibrary(results);},300);
})();

