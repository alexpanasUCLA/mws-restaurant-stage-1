
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
  '/restaurant.html?id=2'
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
          imgsCach.push(Array.of(`/img/${i}.jpg`));
      }
      console.log(imgsCach);
      staticFilesToPrecach = [...imgsCach,...shellToPrecach];
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
          return fetch(event.request);
    }
  })
);
});
