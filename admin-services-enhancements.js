/* Route every legacy Studio 47 admin table reference to the real prefixed tables. */
const studio47TableMap={
  staff_profiles:'studio47-staff_profiles',
  site_content:'studio47-site_content',
  services:'studio47-services',
  reviews:'studio47-reviews',
  appointments:'studio47-appointments'
};
if(typeof db!=='undefined'&&db&&typeof db.from==='function'&&!db.__studio47PrefixedTables){
  const originalStudio47From=db.from.bind(db);
  db.from=function(table){return originalStudio47From(studio47TableMap[table]||table)};
  Object.defineProperty(db,'__studio47PrefixedTables',{value:true,configurable:false,enumerable:false,writable:false});
}

let servicesCompactEditMode=false;
function ownerServicesCompactFinal(){
  compactPageHeading('Menu & Pricing');
  const services=orderedServices();
  const rows=services.map((item,index)=>{
    const description=String(item.description||'').trim();
    const edit=servicesCompactEditMode;
    return `<article class="service-compact-row" data-search="${esc(`${item.name||''} ${item.price||''} ${description}`.toLowerCase())}"><div class="service-compact-name"><strong>${esc(item.name||'Untitled service')}</strong>${edit?`<small>${item.is_live?'Live':'Not live'} · #${index+1}</small>`:''}</div><span class="service-compact-price">${esc(displayPrice(item.price))}</span>${edit&&description?`<p class="service-compact-description">${esc(description)}</p>`:''}${edit?`<div class="service-compact-actions"><button class="service-action-icon" type="button" data-service-compact-edit="${item.id}" aria-label="Edit ${esc(item.name||'service')}"><i class="fa-solid fa-pen"></i></button><button class="service-action-icon ${item.is_live?'live':'draft'}" type="button" data-service-compact-live="${item.id}" data-live="${item.is_live}" aria-label="${item.is_live?'Hide':'Publish'} ${esc(item.name||'service')}"><i class="fa-solid ${item.is_live?'fa-eye':'fa-eye-slash'}"></i></button><button class="service-action-icon" type="button" data-service-compact-move="${item.id}" data-direction="-1" aria-label="Move ${esc(item.name||'service')} up" ${index===0?'disabled':''}><i class="fa-solid fa-arrow-up"></i></button><button class="service-action-icon" type="button" data-service-compact-move="${item.id}" data-direction="1" aria-label="Move ${esc(item.name||'service')} down" ${index===services.length-1?'disabled':''}><i class="fa-solid fa-arrow-down"></i></button><button class="service-action-icon danger" type="button" data-service-compact-delete="${item.id}" aria-label="Delete ${esc(item.name||'service')}"><i class="fa-solid fa-trash"></i></button></div>`:''}</article>`;
  }).join('');
  const subtitle=servicesCompactEditMode?'Edit, reorder, publish, or delete services.':`${services.length} service${services.length===1?'':'s'}.`;
  document.querySelector('#view').innerHTML=`<section class="services-compact-page"><div class="services-compact-head"><div><div class="eyebrow">Services</div><h1>Menu &amp; Pricing</h1><p>${subtitle}</p></div><div class="services-compact-tools"><button class="service-tool-btn" id="serviceCompactAdd" type="button" aria-label="Add service" title="Add service"><i class="fa-solid fa-plus"></i></button><button class="service-tool-btn ${servicesCompactEditMode?'active':''}" id="serviceCompactEditToggle" type="button" aria-label="${servicesCompactEditMode?'Finish editing':'Edit services'}" title="${servicesCompactEditMode?'Done':'Edit'}"><i class="fa-solid ${servicesCompactEditMode?'fa-check':'fa-pen'}"></i></button><button class="service-tool-btn" id="serviceCompactRefresh" type="button" aria-label="Refresh services" title="Refresh"><i class="fa-solid fa-rotate"></i></button></div></div>${servicesCompactEditMode?'<p class="service-edit-note">Use the arrows to change the website order. Tap the eye to publish or hide a service.</p>':''}<div class="services-compact-list">${rows||'<div class="empty">No services yet.</div>'}</div></section>`;
  document.querySelector('#serviceCompactAdd').onclick=()=>editor();
  document.querySelector('#serviceCompactEditToggle').onclick=()=>{servicesCompactEditMode=!servicesCompactEditMode;ownerServicesCompactFinal()};
  document.querySelector('#serviceCompactRefresh').onclick=()=>{servicesCompactEditMode=false;load(true)};
  if(!servicesCompactEditMode)return;
  document.querySelectorAll('[data-service-compact-edit]').forEach(button=>button.onclick=()=>editor(services.find(item=>item.id===button.dataset.serviceCompactEdit)));
  document.querySelectorAll('[data-service-compact-live]').forEach(button=>button.onclick=()=>toggle(button.dataset.serviceCompactLive,button.dataset.live!=='true'));
  document.querySelectorAll('[data-service-compact-move]').forEach(button=>button.onclick=()=>moveService(button.dataset.serviceCompactMove,Number(button.dataset.direction)));
  document.querySelectorAll('[data-service-compact-delete]').forEach(button=>button.onclick=()=>remove(button.dataset.serviceCompactDelete));
}
const renderBeforeServicesCompactFinal=render;
render=function(){if(isOwner()&&pageName==='services')return ownerServicesCompactFinal();return renderBeforeServicesCompactFinal()};

const pullRefreshIndicator=document.createElement('div');
pullRefreshIndicator.className='pull-refresh-indicator';
pullRefreshIndicator.innerHTML='<i class="fa-solid fa-arrow-down"></i><span>Pull to refresh</span>';
document.body.appendChild(pullRefreshIndicator);
let pullStartY=null,pullDistance=0,pullEligible=false,pullRefreshing=false;
const currentScrollTop=()=>document.scrollingElement?.scrollTop||document.documentElement.scrollTop||document.body.scrollTop||0;
document.addEventListener('touchstart',event=>{
  if(!window.matchMedia('(max-width:760px)').matches||pullRefreshing||document.querySelector('.modal-bg')||document.querySelector('.app.drawer-open'))return;
  if(currentScrollTop()>0)return;
  pullStartY=event.touches[0]?.clientY??null;pullDistance=0;pullEligible=pullStartY!==null;
},{passive:true});
document.addEventListener('touchmove',event=>{
  if(!pullEligible||pullStartY===null||pullRefreshing)return;
  const y=event.touches[0]?.clientY??pullStartY,delta=Math.max(0,y-pullStartY);
  if(delta<=0)return;
  pullDistance=Math.min(delta,110);
  if(pullDistance>6)event.preventDefault();
  const progress=Math.min(pullDistance/76,1),offset=-140+(progress*155);
  pullRefreshIndicator.classList.add('visible');
  pullRefreshIndicator.classList.toggle('ready',pullDistance>=76);
  pullRefreshIndicator.style.transform=`translate(-50%,${offset}%)`;
  pullRefreshIndicator.querySelector('span').textContent=pullDistance>=76?'Release to refresh':'Pull to refresh';
},{passive:false});
document.addEventListener('touchend',async()=>{
  if(!pullEligible){pullStartY=null;return}
  const shouldRefresh=pullDistance>=76;
  pullEligible=false;pullStartY=null;
  if(!shouldRefresh){pullRefreshIndicator.classList.remove('visible','ready');pullRefreshIndicator.style.transform='translate(-50%,-140%)';return}
  pullRefreshing=true;servicesCompactEditMode=false;pullRefreshIndicator.classList.remove('ready');pullRefreshIndicator.classList.add('visible','refreshing');pullRefreshIndicator.style.transform='translate(-50%,12%)';pullRefreshIndicator.querySelector('span').textContent='Refreshing…';
  try{await load(true)}finally{setTimeout(()=>{pullRefreshing=false;pullDistance=0;pullRefreshIndicator.classList.remove('visible','refreshing');pullRefreshIndicator.style.transform='translate(-50%,-140%)';pullRefreshIndicator.querySelector('span').textContent='Pull to refresh'},350)}
},{passive:true});

/* Improve saved-password / AutoFill support and optionally remember only the username on this device. */
const STUDIO47_SAVED_USERNAME_KEY='studio47_saved_username';
if(!document.querySelector('#studio47-device-save-style')){
  const rememberStyle=document.createElement('style');
  rememberStyle.id='studio47-device-save-style';
  rememberStyle.textContent=`.save-device-row{display:flex;align-items:center;gap:9px;margin:-2px 0 2px;color:var(--muted);font-size:.78rem;font-weight:700;cursor:pointer;user-select:none}.save-device-row input{width:18px;height:18px;margin:0;accent-color:var(--pink);flex:0 0 auto}.save-device-row span{line-height:1.2}`;
  document.head.appendChild(rememberStyle);
}
function enhanceStudio47CredentialAutofill(){
  const form=document.querySelector('#login');
  if(!form)return;
  form.setAttribute('autocomplete','on');
  form.setAttribute('method','post');
  form.setAttribute('action',location.href);
  const email=form.querySelector('input[name="email"]');
  const password=form.querySelector('input[name="password"]');
  if(email){
    email.id='studio47-username';
    email.setAttribute('autocomplete','username');
    email.setAttribute('autocapitalize','none');
    email.setAttribute('spellcheck','false');
    email.setAttribute('inputmode','email');
  }
  if(password){
    password.id='studio47-current-password';
    password.setAttribute('autocomplete','current-password');
  }

  let remember=form.querySelector('#studio47SaveToDevice');
  if(!remember&&password){
    const label=document.createElement('label');
    label.className='save-device-row';
    label.innerHTML='<input id="studio47SaveToDevice" type="checkbox"><span>Save email to device</span>';
    password.insertAdjacentElement('afterend',label);
    remember=label.querySelector('input');
  }

  let saved='';
  try{saved=localStorage.getItem(STUDIO47_SAVED_USERNAME_KEY)||''}catch{}
  if(email&&saved&&!email.value)email.value=saved;
  if(remember)remember.checked=!!saved;

  if(!form.dataset.localUsernameBound){
    form.dataset.localUsernameBound='true';
    form.addEventListener('submit',()=>{
      const emailField=form.querySelector('input[name="email"]');
      const saveBox=form.querySelector('#studio47SaveToDevice');
      const value=String(emailField?.value||'').trim().toLowerCase();
      try{
        if(saveBox?.checked&&value)localStorage.setItem(STUDIO47_SAVED_USERNAME_KEY,value);
        else localStorage.removeItem(STUDIO47_SAVED_USERNAME_KEY);
      }catch{}
    },true);
  }
}
const originalStudio47Login=window.login;
if(typeof originalStudio47Login==='function'){
  window.login=function(){
    const result=originalStudio47Login.apply(this,arguments);
    queueMicrotask(enhanceStudio47CredentialAutofill);
    return result;
  };
}
new MutationObserver(enhanceStudio47CredentialAutofill).observe(document.querySelector('#root')||document.body,{childList:true,subtree:true});
enhanceStudio47CredentialAutofill();

/* Show the current star rating inside review add/edit popups. */
function enhanceReviewStarRatingDisplay(){
  document.querySelectorAll('.star-picker').forEach(picker=>{
    if(picker.dataset.currentRatingReady)return;
    picker.dataset.currentRatingReady='true';
    const readout=document.createElement('div');
    readout.className='review-current-rating';
    const paint=()=>{
      const checked=picker.querySelector('input[name="rating"]:checked');
      const rating=Math.max(1,Math.min(5,Number(checked?.value)||5));
      readout.innerHTML=`<span>Current rating: ${rating} / 5</span><span class="admin-stars">${'★'.repeat(rating)}${'☆'.repeat(5-rating)}</span>`;
    };
    picker.insertAdjacentElement('afterend',readout);
    picker.addEventListener('change',paint);
    paint();
  });
}
new MutationObserver(enhanceReviewStarRatingDisplay).observe(document.querySelector('#overlay')||document.body,{childList:true,subtree:true});
enhanceReviewStarRatingDisplay();

/* Keep the installed Studio 47 web app in sync with GitHub Pages deployments. */
if('serviceWorker' in navigator){
  let reloadingForUpdate=false;
  const registerStudio47Updater=async()=>{
    try{
      const registration=await navigator.serviceWorker.register('./studio47-sw.js',{scope:'./',updateViaCache:'none'});
      const activateWaiting=()=>{if(registration.waiting)registration.waiting.postMessage({type:'SKIP_WAITING'})};
      activateWaiting();
      registration.addEventListener('updatefound',()=>{
        const worker=registration.installing;
        if(!worker)return;
        worker.addEventListener('statechange',()=>{
          if(worker.state==='installed'&&navigator.serviceWorker.controller)worker.postMessage({type:'SKIP_WAITING'});
        });
      });
      const check=()=>registration.update().catch(()=>{});
      check();
      document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()});
      window.addEventListener('pageshow',check);
      setInterval(check,5*60*1000);
    }catch(error){console.warn('Studio 47 update worker unavailable',error)}
  };
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(reloadingForUpdate)return;
    reloadingForUpdate=true;
    location.reload();
  });
  registerStudio47Updater();
}

/* Shared Help / Requests now uses the main wfxuxrvygyzonkflpwoq Supabase project. */
submitHelpRequest=async function(event){
  event.preventDefault();
  const form=event.currentTarget,button=form.querySelector('button[type="submit"]'),message=document.querySelector('#helpMessage'),fields=Object.fromEntries(new FormData(form));
  const request={request_type:fields.request_type,priority:fields.priority,page:fields.page,subject:String(fields.subject||'').trim(),details:String(fields.details||'').trim(),status:'new',submitted_by:session?.user?.email||'',submitted_at:new Date().toISOString(),source_site:'Studio 47',source_url:location.origin+location.pathname,browser:navigator.userAgent};
  if(!request.subject||!request.details)return;
  button.disabled=true;message.className='help-message';message.textContent='Sending…';
  try{
    const {data:remoteId,error}=await db.rpc('submit_website_request',{p_request_type:request.request_type,p_priority:request.priority,p_page:request.page,p_subject:request.subject,p_details:request.details,p_submitted_by:request.submitted_by,p_source_site:request.source_site,p_source_url:request.source_url,p_browser:request.browser});
    if(error)throw error;
    request.remote_id=remoteId;
    const {error:localError}=await db.from('studio47-site_content').insert({section:'website_requests',content_key:`website_request_${Date.now()}`,content_value:JSON.stringify(request),title:request.subject,image_url:'',sort_order:0,is_live:false});
    if(localError)throw new Error('Request was sent, but Recent Requests could not update: '+localError.message);
    form.reset();message.className='help-message success';message.textContent='Your request was sent.';toast('Request sent');await load();
  }catch(error){message.className='help-message error';message.textContent=error?.message||'The request could not be sent.'}
  finally{button.disabled=false}
};

deleteHelpRequest=async function(localId,remoteId){
  if(!confirm('Delete this request?'))return;
  if(remoteId){const {error}=await db.rpc('delete_website_request',{p_request_id:remoteId});if(error)return alert(error.message)}
  const {error}=await db.from('studio47-site_content').delete().eq('id',localId);if(error)return alert(error.message);toast('Request deleted');await load();
};

/* Rebuild the signed-in shell after the table routing is installed so access checks use only studio47-* tables. */
queueMicrotask(async()=>{
  if(typeof session==='undefined'||!session?.user?.id||typeof app!=='function')return;
  try{
    const {data:profile,error}=await db.from('studio47-staff_profiles').select('user_id,work_email,recovery_email,stylist_name,team_member_id,role,active').eq('user_id',session.user.id).maybeSingle();
    if(error)throw error;
    if(profile?.active){staffProfile=profile;await app();}
  }catch(error){console.error('Studio 47 access refresh failed',error)}
});
