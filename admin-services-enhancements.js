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

/* Improve saved-password / AutoFill support in installed web apps and browsers. */
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