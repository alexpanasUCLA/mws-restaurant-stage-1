// import idb plug-in
importScripts('/js/idb.js');


//create objectStore  //
const dbPromise = idb.open('restaurant-store',1,function (db) {
  if (!db.objectStoreNames.contains('restaurantsObj')) {
    db.createObjectStore('restaurantsObj',{keyPath:'id'})
  };
});

// Add variables for cache versions
const CACHE_STATIC = 'static-v4';
const CACHE_DYNAMIC = 'dynamic-v3';

// Trying to get numberRestaurants

const shellToPrecach = [
  '/',
  '/index.html',
  '/restaurant.html',
  '/js/dbhelper.js',
  '/js/main.js',
  '/js/idb.js',
  '/js/restaurant_info.js',
  // '/data/restaurants.json',
  '/css/styles.css',
  '/css/responsive.css',
  '/css/responsive_restaurants.css'
];


let imgsCach=[];
let restaurantPages=[];
let staticFilesToPrecach =[];


dbPromise.then((db)=>{
  const tx = db.transaction('restaurantsObj','readonly');
  const store = tx.objectStore('restaurantsObj');
  return store.getAll()
        .then (storedJSON =>{
                numberRestaurants = storedJSON.length;
                for (var i = 1; i < numberRestaurants+1; i++) {
                    imgsCach.push(`/img/medium_img/${i}_med.jpg`);
                    restaurantPages.push(`/restaurant.html?id=${i}`);
                }
                staticFilesToPrecach = [...imgsCach,...shellToPrecach,...restaurantPages];
                console.log(staticFilesToPrecach);
        })
});



// fetch('/data/restaurants.json')
//   .then((response)=>{
//     return response.json();})
//     .then((json_file)=>{
//       numberRestaurants=json_file.restaurants.length;
//       for (var i = 1; i < numberRestaurants+1; i++) {
//           imgsCach.push(`/img/medium_img/${i}_med.jpg`);
//           restaurantPages.push(`/restaurant.html?id=${i}`);
//       }
//       // console.log(imgsCach);
//       staticFilesToPrecach = [...imgsCach,...shellToPrecach,...restaurantPages];
//       console.log(staticFilesToPrecach);
//     });
//
//





// Caching static files with service worker

self.addEventListener('install',(event)=>{
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache)=>{
        cache.addAll(staticFilesToPrecach);
      })
    );
});

// Listening to activate event

  self.addEventListener('activate',(event)=>{
    console.log('Activating Service Worker',event);
    event.waitUntil(
      caches.keys()
        .then((keylist)=>{
          return Promise.all(keylist.map(key=>{
            if (key !== CACHE_STATIC && key !== CACHE_DYNAMIC) {
              console.log('Cleaning cache',key);
              return caches.delete(key);
            }
          }))
        })
    )
    return self.clients.claim();
  })





self.addEventListener('fetch',(event)=>{
  const urlDB = 'http://localhost:1337/restaurants';
  if (event.request.url.indexOf(urlDB) > -1) {
      console.log(urlDB,'it is JSON url');
      event.respondWith(fetch(event.request)
        .then(function (res) {
          const clonedRes = res.clone();
          clonedRes.json()
            .then((data)=>{
              for (let key in data){
                dbPromise
                  .then((db)=>{
                    const tx = db.transaction('restaurantsObj','readwrite');
                    const store = tx.objectStore('restaurantsObj');
                    store.put(data[key]);
                    return tx.complete;
                  });
              };
            });
          return res;
        }))
  } else {
    event.respondWith(
      caches.match(event.request)
        .then((response)=>{
          if (response) {
            return response;
          } else {
            return fetch(event.request)
              .then((res)=>{
                return caches.open(CACHE_DYNAMIC)
                  .then((cache)=>{
                    cache.put(event.request.url,res.clone());
                    return res;
                  })
              })
              .catch((err)=>{
              })
      }
    })
  );
  }


});
