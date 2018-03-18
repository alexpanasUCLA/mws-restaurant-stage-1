
// Trying to get numberRestaurants

const shellToPrecach = [
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
  '/restaurant.html?id=9'
];


let imgsCach=[];
let restaurantPages=[];
let staticFilesToPrecach =[];


fetch('/data/restaurants.json')
  .then((response)=>{
    return response.json();})
    .then((json_file)=>{
      numberRestaurants=json_file.restaurants.length;
      for (var i = 1; i < numberRestaurants+1; i++) {
          imgsCach.push(`/img/${i}.jpg`);
          restaurantPages.push(`/restaurant.html?id=${i}`);
      }
      console.log(imgsCach);
      staticFilesToPrecach = [...imgsCach,...shellToPrecach,...restaurantPages];
      console.log(staticFilesToPrecach);
    });


// Caching static files with service worker

self.addEventListener('install',(event)=>{
  event.waitUntil(
    caches.open('static')
      .then((cache)=>{
        cache.addAll(staticFilesToPrecach);
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
          return fetch(event.request)
            .then((res)=>{
              return caches.open('dynamic')
                .then((cache)=>{
                  cache.put(event.request.url,res.clone());
                  return res;
                })
            })
    }
  })
);
});
