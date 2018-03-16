// Caching static files with service worker

self.addEventListener('install',(event)=>{
  event.waitUntil(
    caches.open('static')
      .then((cache)=>{
        cache.addAll([
          '/',
          '/index.html',
          '/restaurant.html',
          '/js/dbhelper.js',
          '/js/main.js',
          '/js/restaurant_info.js',
          '/data/restaurants.json',
          '/css/styles.css',
          '/css/responsive.css',
          '/css/responsive_restaurants.css',
          '/restaurant.html?id=2'
        ]);
      })
    );
});


self.addEventListener('fetch',(event)=>{
  event.respondWith(
    caches.match(event.request)
      .then((response)=>{
        if (response) {
          return response;
        } else {
          return fetch(event.request);
    }
  })
);
});
