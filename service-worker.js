self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{}}catch{data={body:event.data?.text()||''}}
  event.waitUntil(self.registration.showNotification(data.title||'Studio 47 appointment reminder',{
    body:data.body||'You have an upcoming appointment at Studio 47.',
    icon:'studio47-app-icon.png',
    badge:'studio47-app-icon.png',
    tag:data.tag||'studio47-appointment',
    renotify:true,
    data:{url:data.url||'./'}
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>{
    const target=new URL(event.notification.data?.url||'./',self.location.origin).href;
    const existing=windows.find(client=>client.url.startsWith(self.location.origin));
    return existing?(existing.navigate(target),existing.focus()):clients.openWindow(target);
  }));
});
