/* Enhancements for the existing Supabase-backed public site. */
(()=>{
 'use strict';
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 const revealSelector='#services .service-card,#reviews .review-card,#gallery figure,#services .heading,#reviews .heading,.visitgrid > div,.hero-copy > .eyebrow,.hero-copy > h1,.hero-copy > p,.hero-copy > .actions,footer .foot > *';
 let revealObserver;
 if(!motion.matches&&'IntersectionObserver' in window){
   revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
     if(entry.isIntersecting){entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target)}
   }),{threshold:.12,rootMargin:'0px 0px -25px 0px'});
 }
 const reveal=()=>{
   if(!revealObserver)return;
   document.querySelectorAll(revealSelector).forEach((element,index)=>{
     if(element.dataset.revealReady)return;
     element.dataset.revealReady='1';
     element.style.setProperty('--reveal-delay',((index%4)*85)+'ms');
     element.classList.add('studio-reveal');
     revealObserver.observe(element);
   });
 };
 reveal();
 // Supabase renders the gallery, reviews and services asynchronously.
 for(const id of ['galleryGrid','reviewGrid','serviceGrid']){
   const node=document.getElementById(id);
   if(node)new MutationObserver(reveal).observe(node,{childList:true});
 }
 const pointer=matchMedia('(hover: hover) and (pointer: fine)');
 if(!pointer.matches||motion.matches)return;
 const dot=document.createElement('div');dot.className='studio-cursor';dot.setAttribute('aria-hidden','true');document.body.append(dot);document.body.classList.add('studio-cursor-on');
 let x=-100,y=-100,raf=0;
 const interactive='a,button,[role="button"],input[type="submit"],input[type="button"],select,summary,label,.service-card,.gallery figure[data-media],.review-card,[tabindex]:not([tabindex="-1"])';
 const sampleColor=target=>{
   let node=target;
   while(node&&node!==document.documentElement){
     const style=getComputedStyle(node);
     const color=style.backgroundColor;
     const match=color.match(/rgba?\(([^)]+)\)/);
     if(match){
       const values=match[1].split(/[ ,/]+/).map(Number);
       if(values.length<4||values[3]>.78){
         const [r,g,b]=values;
         const lum=(.2126*r+.7152*g+.0722*b);
         return lum>145?'#d30b78':'#ffffff';
       }
     }
     node=node.parentElement;
   }
   return document.body.classList.contains('dark')?'#ffffff':'#d30b78';
 };
 const update=()=>{
   raf=0;dot.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;
   const target=document.elementFromPoint(x,y);
   if(!target)return;
   dot.style.setProperty('--cursor-color',sampleColor(target));
   dot.classList.toggle('is-clickable',!!target.closest(interactive));
   // Show the system text caret and pointer around controls requiring precision.
   const editing=!!target.closest('input:not([type="button"]):not([type="submit"]),textarea,[contenteditable="true"]');
   dot.style.opacity=editing?'0':'';
 };
 document.addEventListener('pointermove',event=>{
   if(event.pointerType!=='mouse')return;
   x=event.clientX;y=event.clientY;dot.classList.add('is-active');
   if(!raf)raf=requestAnimationFrame(update);
 },{passive:true});
 document.addEventListener('pointerdown',()=>dot.classList.add('is-pressed'));
 document.addEventListener('pointerup',()=>dot.classList.remove('is-pressed'));
 document.addEventListener('pointerleave',()=>dot.classList.remove('is-active'));
 window.addEventListener('blur',()=>dot.classList.remove('is-active'));
})();
