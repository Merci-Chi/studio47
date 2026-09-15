(() => {
  const style=document.createElement('style');
  style.textContent=`
  .appointment-time-custom{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;position:relative}
  .appointment-time-part{position:relative;min-width:0}
  .appointment-time-trigger{width:100%;min-height:44px;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--ink);display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 11px;font-weight:800}
  .appointment-time-trigger i{font-size:.72rem;color:var(--muted)}
  .appointment-time-menu{position:absolute;z-index:120;left:0;right:0;top:calc(100% + 6px);max-height:230px;overflow:auto;padding:6px;border:1px solid var(--line);border-radius:12px;background:#fff;box-shadow:0 14px 34px #2a101c24}
  .appointment-time-menu[hidden]{display:none}
  .appointment-time-option{width:100%;min-height:40px;border:0;border-radius:8px;background:transparent;color:var(--ink);display:flex;align-items:center;justify-content:center;padding:8px;font-weight:800}
  .appointment-time-option:hover,.appointment-time-option:focus-visible,.appointment-time-option.selected{background:var(--blush);color:var(--wine)}
  .appointment-time-error{display:none;margin-top:5px;color:var(--red);font-size:.68rem;font-weight:800}
  .appointment-time-error.show{display:block}
  html[data-theme="dark"] .appointment-time-trigger,html[data-theme="dark"] .appointment-time-menu,html[data-theme="dark"] .appointment-time-option{background:#191216;color:#fff5fa;border-color:#55313f}
  html[data-theme="dark"] .appointment-time-option:hover,html[data-theme="dark"] .appointment-time-option:focus-visible,html[data-theme="dark"] .appointment-time-option.selected{background:#2b1822;color:#fff}
  @media(max-width:520px){.appointment-time-custom{grid-template-columns:1fr 1fr 1fr;gap:6px}.appointment-time-trigger{padding:10px 8px;font-size:.9rem}}
  `;
  document.head.appendChild(style);

  const hourValues=Array.from({length:12},(_,i)=>String(i+1));
  const minuteValues=['00','15','30','45'];
  const meridiemValues=['AM','PM'];

  function parseExistingTime(value){
    const match=String(value||'').match(/^(\d{1,2}):(\d{2})/);
    if(!match)return {hour:'',minute:'',meridiem:'AM'};
    let h=Number(match[1]),m=Number(match[2]);
    const rounded=Math.round(m/15)*15;
    if(rounded===60){h=(h+1)%24;m=0}else m=rounded;
    const meridiem=h>=12?'PM':'AM';
    const hour=String(h%12||12);
    return {hour,minute:String(m).padStart(2,'0'),meridiem};
  }

  function to24Hour(hour,minute,meridiem){
    let h=Number(hour);
    if(!h||!minute||!meridiem)return '';
    if(meridiem==='AM'&&h===12)h=0;
    if(meridiem==='PM'&&h!==12)h+=12;
    return `${String(h).padStart(2,'0')}:${minute}`;
  }

  function timePickerMarkup(value){
    const current=parseExistingTime(value);
    const part=(key,label,values)=>`<div class="appointment-time-part" data-time-part="${key}"><button type="button" class="appointment-time-trigger" aria-haspopup="listbox" aria-expanded="false"><span data-time-label="${key}">${esc(current[key]||label)}</span><i class="fa-solid fa-chevron-down"></i></button><div class="appointment-time-menu" role="listbox" hidden>${values.map(v=>`<button type="button" class="appointment-time-option ${current[key]===v?'selected':''}" data-time-value="${esc(v)}">${esc(v)}</button>`).join('')}</div></div>`;
    return `<div class="appointment-time-custom">${part('hour','Hour',hourValues)}${part('minute','Min',minuteValues)}${part('meridiem','AM/PM',meridiemValues)}</div><input type="hidden" name="appointment_time" value="${esc(to24Hour(current.hour,current.minute,current.meridiem))}"><div class="appointment-time-error">Choose an hour, minutes, and AM or PM.</div>`;
  }

  function bindTimePicker(form){
    const hidden=form.querySelector('input[name="appointment_time"]');
    const error=form.querySelector('.appointment-time-error');
    const state={hour:'',minute:'',meridiem:''};
    form.querySelectorAll('[data-time-part]').forEach(part=>{
      const key=part.dataset.timePart;
      const selected=part.querySelector('.appointment-time-option.selected');
      if(selected)state[key]=selected.dataset.timeValue;
    });
    const closeAll=except=>form.querySelectorAll('.appointment-time-menu').forEach(menu=>{if(menu!==except){menu.hidden=true;menu.previousElementSibling?.setAttribute('aria-expanded','false')}});
    form.querySelectorAll('[data-time-part]').forEach(part=>{
      const key=part.dataset.timePart,trigger=part.querySelector('.appointment-time-trigger'),menu=part.querySelector('.appointment-time-menu'),label=part.querySelector(`[data-time-label="${key}"]`);
      trigger.addEventListener('click',()=>{const willOpen=menu.hidden;closeAll(menu);menu.hidden=!willOpen;trigger.setAttribute('aria-expanded',String(willOpen))});
      part.querySelectorAll('.appointment-time-option').forEach(option=>option.addEventListener('click',()=>{
        state[key]=option.dataset.timeValue;
        part.querySelectorAll('.appointment-time-option').forEach(btn=>btn.classList.toggle('selected',btn===option));
        label.textContent=state[key];
        menu.hidden=true;trigger.setAttribute('aria-expanded','false');
        hidden.value=to24Hour(state.hour,state.minute,state.meridiem);
        error?.classList.remove('show');
      }));
    });
    const outside=event=>{if(!form.contains(event.target)||!event.target.closest('.appointment-time-custom'))closeAll()};
    document.addEventListener('pointerdown',outside);
    form._cleanupCustomTimePicker=()=>document.removeEventListener('pointerdown',outside);
    return ()=>{
      hidden.value=to24Hour(state.hour,state.minute,state.meridiem);
      const valid=!!hidden.value;
      error?.classList.toggle('show',!valid);
      return valid;
    };
  }

  const oldAppointmentEditor=window.appointmentEditor;
  window.appointmentEditor=function(appointment={}){
    const owner=isOwner();
    if(!owner){
      if(!staffProfile?.stylist_name)return alert('This account is not linked to a team member.');
      if(appointment.id&&appointment.staff_user_id!==session.user.id)return alert('You can only edit your own appointments.');
    }
    const stylistField=owner?`<select name="stylist" required>${stylistOptions(appointment.stylist)}</select>`:`<input value="${esc(staffProfile.stylist_name)}" readonly><input name="stylist" type="hidden" value="${esc(staffProfile.stylist_name)}">`;
    const statusField=owner?`<div class="field full"><label>Status</label><select name="status"><option value="confirmed" ${appointment.status!=='cancelled'?'selected':''}>Confirmed</option><option value="cancelled" ${appointment.status==='cancelled'?'selected':''}>Cancelled</option></select></div>`:'';
    overlay.innerHTML=`<div class="modal-bg"><div class="modal"><div class="modal-head"><h2>${appointment.id?'Edit':'Set'}${owner?'':' my'} appointment</h2><button class="close">×</button></div><form id="appointmentEdit"><div class="form-grid"><div class="field"><label>Client name</label><input name="client_name" required maxlength="80" value="${esc(appointment.client_name||'')}"></div><div class="field"><label>Phone number</label><input name="phone" type="tel" required maxlength="30" value="${esc(appointment.phone||'')}"></div><div class="field"><label>Date</label><input name="appointment_date" type="date" required value="${esc(appointment.appointment_date||'')}"></div><div class="field"><label>Time</label>${timePickerMarkup(appointment.appointment_time)}</div><div class="field"><label>Service</label><select name="service_type" required>${serviceOptions(appointment.service_type)}</select></div><div class="field"><label>Stylist</label>${stylistField}</div>${statusField}<div class="field full"><label>Notes</label><textarea name="notes" maxlength="500">${esc(appointment.notes||'')}</textarea></div></div><div class="modal-actions"><button type="button" class="ghost cancel">Cancel</button><button class="primary">Save appointment</button></div></form></div></div>`;
    const form=overlay.querySelector('#appointmentEdit');
    const validateTime=bindTimePicker(form);
    const close=()=>{form._cleanupCustomTimePicker?.();overlay.innerHTML=''};
    overlay.querySelector('.close').onclick=overlay.querySelector('.cancel').onclick=close;
    form.onsubmit=async event=>{
      event.preventDefault();
      if(!validateTime())return;
      const record=Object.fromEntries(new FormData(form));
      if(owner){
        record.status=record.status||'confirmed';
        const query=appointment.id?db.from('studio47-appointments').update(record).eq('id',appointment.id):db.from('studio47-appointments').insert(record);
        const {error}=await query;
        if(error)return alert(error.code==='23505'?'That stylist is already booked at that time.':error.message);
      }else{
        record.stylist=staffProfile.stylist_name;
        record.staff_user_id=session.user.id;
        record.status=appointment.status||'confirmed';
        const query=appointment.id?db.from('studio47-appointments').update(record).eq('id',appointment.id).eq('staff_user_id',session.user.id):db.from('studio47-appointments').insert(record);
        const {error}=await query;
        if(error)return alert(error.message);
      }
      close();toast('Appointment saved');load();
    };
  };
})();