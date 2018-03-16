// pre-cashing static files on installation of service worker

self.addEventListener('install',(event)=>{
  event.waitUntil(
    caches.open('static')
      .then((cache)=>{
        cache.add('/js/main.js');
      })
  )

});
