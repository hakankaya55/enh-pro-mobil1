(()=>{
const q=id=>document.getElementById(id); let raw=null,last=null,busy=false,revision=0;
const block=document.createElement('div');block.className='panel';block.style.marginTop='20px';
block.innerHTML=`<h2>Fotoğraftan Direk Tanıma <small>· Tek Devre</small></h2>
<p class="muted">Üst travers düzeninden tip adayı, gövde çaprazlarından boy kodu. İlk arazi denemesi sürümü.</p>
<div style="display:flex;gap:10px;flex-wrap:wrap"><button id="pCamera" class="green" style="width:auto">📷 FOTOĞRAF ÇEK</button><button id="pChoose" style="width:auto">FOTOĞRAF SEÇ</button></div>
<input id="pCameraFile" type="file" accept="image/*" capture="environment" hidden><input id="pGalleryFile" type="file" accept="image/*" hidden>
<img id="pPreview" alt="Seçilen direk fotoğrafı" hidden style="max-width:100%;max-height:460px;display:block;margin:16px auto;object-fit:contain">
<p class="muted">Tip için üst kısmı net çekin. Boy için direğin zeminden tepeye kadar tamamı ve çaprazları görünmeli.</p>
<details><summary>Analiz bağlantısı</summary><p>Otomatik analiz internet bağlantısı ve kurulmuş analiz hizmeti gerektirir. Fotoğraf ANALİZ ET ile gönderilir; API kullanım ücreti olabilir.</p><label>Analiz hizmeti adresi (HTTPS)</label><input id="pUrl" type="url" placeholder="https://…"><label>Bağlantı parolası</label><input id="pToken" type="password" autocomplete="off"><p class="muted">OpenAI anahtarı burada kullanılmaz. Parola bu oturumda tutulur.</p></details>
<button id="pAnalyze" class="green" style="margin-top:16px">FOTOĞRAFI ANALİZ ET</button><div id="pResult" class="result" style="margin-top:16px;white-space:pre-wrap" role="status">Fotoğraf bekleniyor.</div>
<button id="pApply" hidden style="margin-top:10px">SONUCU KONTROL ETTİM · ASİSTANA AKTAR</button>
<details style="margin-top:18px"><summary>Etiketli tek devre referansları</summary><label>Direk tipi</label><select id="pRefType"></select><label>Görsel</label><select id="pRefMode"><option value="field">Arazi fotoğrafı</option><option value="technical">Teknik şema</option></select><img id="pRef" alt="Etiketli referans" style="max-width:100%;max-height:650px;display:block;margin:auto;object-fit:contain"></details>`;
q('boy').appendChild(block);
q('pUrl').value=localStorage.getItem('enh-analysis-url')||'';
q('pCamera').onclick=()=>q('pCameraFile').click();q('pChoose').onclick=()=>q('pGalleryFile').click();
function status(s){q('pResult').textContent=s;}
async function pick(e){
 const file=e.target.files[0];if(!file)return; if(file.size>20*1024*1024){status('Fotoğraf en fazla 20 MB olabilir.');return;}
 const current=++revision;raw=null;last=null;q('pApply').hidden=true;q('pPreview').hidden=true;
 try{const url=URL.createObjectURL(file);const im=new Image();await new Promise((ok,no)=>{im.onload=ok;im.onerror=no;im.src=url;});URL.revokeObjectURL(url);
 const scale=Math.min(1,2000/im.width,2600/im.height);const c=document.createElement('canvas');c.width=Math.round(im.width*scale);c.height=Math.round(im.height*scale);c.getContext('2d').drawImage(im,0,0,c.width,c.height);
 if(current!==revision)return;raw=c.toDataURL('image/jpeg',.9);q('pPreview').src=raw;q('pPreview').hidden=false;status('Fotoğraf hazır. Üst kısmı ve gövdeyi kontrol edip analizi başlatın.');
 }catch{status('Fotoğraf açılamadı. JPEG veya PNG olarak tekrar seçin.');}
}
q('pCameraFile').onchange=pick;q('pGalleryFile').onchange=pick;
q('pAnalyze').onclick=async()=>{
 if(busy)return;if(!raw){status('Önce fotoğraf çekin veya seçin.');return;}
 const address=q('pUrl').value.trim().replace(/\/$/,'');const token=q('pToken').value.trim();let url;
 try{url=new URL(address);if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error();}catch{status('Otomatik analiz için HTTPS analiz hizmeti adresini bağlantı ayarlarına girin.');return;}
 if(!token){status('Analiz hizmetinin bağlantı parolası gerekli.');return;}
 localStorage.setItem('enh-analysis-url',address);busy=true;last=null;q('pAnalyze').disabled=true;q('pApply').hidden=true;status('Üst traversler referanslarla karşılaştırılıyor; ardından çaprazlar incelenecek…');
 const current=revision;const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),330000);
 try{const response=await fetch(address+'/analyze',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({image:raw}),signal:controller.signal});const r=await response.json();if(!response.ok)throw Error(r.error||'Analiz tamamlanamadı.');if(current!==revision)return;
 last=r;const code=r.boy_code;status(`Tip adayı: ${r.tip||'Belirlenemedi'}\nGörsel değerlendirme: ${r.confidence}\n${r.reason}\nÇapraz sayısı: ${r.cross_count??'Belirlenemedi'}\nBoy kodu: ${code==null?'Belirlenemedi':(code>=0?'+':'')+code}\n${r.count_reason}\nSonuç metre cinsinden boy değildir; arazide kontrol edin.`);
 q('pApply').hidden=!(r.tip&&code!=null&&POLE_REFS.poles[r.tip]?.cross_to_code[String(r.cross_count)]===code);
 }catch(e){if(current===revision)status(e.name==='AbortError'?'Analiz zaman aşımına uğradı.':(e.message==='Failed to fetch'?'Analiz hizmetine ulaşılamadı. İnternet, HTTPS adresi ve hizmet ayarlarını kontrol edin.':e.message));}
 finally{clearTimeout(timer);busy=false;q('pAnalyze').disabled=false;}
};
q('pApply').onclick=()=>{if(!last)return;q('boyTip').value=last.tip;updateCross();q('cross').value=String(last.cross_count);calculateBoy();q('boyTip').scrollIntoView({behavior:'smooth'});};
Object.keys(POLE_REFS.poles).forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=t;q('pRefType').appendChild(o);});
function ref(){q('pRef').src=POLE_REFS.poles[q('pRefType').value][q('pRefMode').value];q('pRef').alt=q('pRefType').value+' · '+q('pRefMode').selectedOptions[0].textContent;}
q('pRefType').onchange=ref;q('pRefMode').onchange=ref;ref();
})();
