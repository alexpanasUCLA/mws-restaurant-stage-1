importScripts('/js/idb.js');

const dbPromise = idb.open('restaurant-store',1,function (db) {
  if (!db.objectStoreNames.contains('restaurantsObj')) {
    db.createObjectStore('restaurantsObj',{keyPath:'id'})
  } 
  
  if (!db.objectStoreNames.contains('reviewsObj')) {
    db.createObjectStore('reviewsObj',{keyPath:'id'})
  }

});
//create objectStore  //
const populateExistingReviews =()=>{

  const urlDB_reviews = 'http://localhost:1337/reviews/';

  fetch(urlDB_reviews)
    .then(res=>res.json())
    .then(data=>{
      for (let key in data){
        dbPromise
          .then(db=>{
                          const tx = db.transaction('reviewsObj','readwrite');
                          const store = tx.objectStore('reviewsObj');
                          store.put(data[key]);
                          return tx.complete;
          })
      }
    })

      
  // populate IndexDB restaurant objectStore
  const urlDB = 'http://localhost:1337/restaurants';
  fetch(urlDB)
    .then(res=>res.json())
    .then(data=>{
      for (let key in data){
        dbPromise
          .then(db=>{
                          const tx = db.transaction('restaurantsObj','readwrite');
                          const store = tx.objectStore('restaurantsObj');
                          store.put(data[key]);
                          return tx.complete;
          })
      }
    })




}

const updateIndexDB = ()=>{
 
  
  // populate indexDB with added reviews objectStore 
  
    let count = 31; 
    
    while(count<100){
      fetch(`http://localhost:1337/reviews/${count}`)
      .then(res=>{
          if(res.status == 404) return;   
          return res.json()     
        
      })
      .then(comment =>{
        if(comment === undefined) return; 
        dbPromise
        .then(db=>{
                        const tx = db.transaction('reviewsObj','readwrite');
                        const store = tx.objectStore('reviewsObj');
                        store.put(comment);
                        return tx.complete;
        })

      })
      count++; 
    }
}


// Add variables for cache versions
const CACHE_STATIC = 'static-v8';
const CACHE_DYNAMIC = 'dynamic-v7';

// Trying to get numberRestaurants

const shellToPrecach = [
  '/',
  '/index.html',
  '/restaurant.html',
  '/js/dbhelper.js',
  '/js/main.js',
  '/js/idb.js',
  '/js/restaurant_info.js',
  '/manifest.json',
  '/css/styles.css',
  '/css/responsive.css',
  '/css/responsive_restaurants.css'
];


let imgsCach=[];
let restaurantPages=[];
let staticFilesToPrecach =[];


for (let i = 1; i < 11; i++) {
  imgsCach.push(`/img/medium_img/${i}_med.jpg`);
  restaurantPages.push(`/restaurant.html?id=${i}`);
}
staticFilesToPrecach = [...imgsCach,...shellToPrecach,...restaurantPages];
// console.log(staticFilesToPrecach);







// dbPromise.then((db)=>{
//   const tx = db.transaction('restaurantsObj','readonly');
//   const store = tx.objectStore('restaurantsObj');
//   return store.getAll()
//         .then (storedJSON =>{
//                 numberRestaurants = storedJSON.length;
//                 for (let i = 1; i < numberRestaurants+1; i++) {
//                     imgsCach.push(`/img/medium_img/${i}_med.jpg`);
//                     restaurantPages.push(`/restaurant.html?id=${i}`);
//                 }
//                 staticFilesToPrecach = [...imgsCach,...shellToPrecach,...restaurantPages];
//                 // staticFilesToPrecach = [...shellToPrecach,...restaurantPages];
//                 console.log(staticFilesToPrecach);
//         })
// });



// Caching static files with service worker

self.addEventListener('install',(event)=>{
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache)=>{
        cache.addAll(staticFilesToPrecach);
      })
    );
    event.waitUntil(
      populateExistingReviews()
    )
});

// Listening to activate event
// TODO - add creating database to activate event 

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
    event.waitUntil(
      updateIndexDB()
    )
    return self.clients.claim();
  })





self.addEventListener('fetch',(event)=>{

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
              .catch((err)=>{console.log(err);
              })
      }
    })
  );
  
});

// Registring sync event 

self.addEventListener('sync',(event)=>{
  console.log('Background syncing',event);
  if(event.tag === 'sync-new-comment'){
    console.log('Syncing new post');
  }
  event.waitUntil(
    // Use cursor to get through reviewsObj store and POST to server new comments
    dbPromise
    .then(db=>{
                
                const tx = db.transaction('reviewsObj','readonly');
                const store = tx.objectStore('reviewsObj');
                store.openCursor().then(function cursorIterate(cursor){
                  if (!cursor) return;
              
                    const commentToSync = cursor.value; 
                    if(commentToSync.fromForm) {
                      // POST to server 
                     console.log(commentToSync.comments);
                     console.log(commentToSync.restaurant_id);
                     console.log(commentToSync.rating);
                     fetch('http://localhost:1337/reviews/',{
                       method:'POST',
                       headers:{
                         'Content-Type':'application/json',
                         'Accept':'application/json'
                       },
                       body:JSON.stringify({
                         restaurant_id:commentToSync.restaurant_id,
                         name:commentToSync.name,
                         rating:commentToSync.rating,
                         comments:commentToSync.comments
                       })
                     })
                      .then((res)=>{
                        console.log('Sent to',res);
                    
                        // Delete sent data
                    
                        // dbPromise
                        //   .then(db=>{
                        //     const tx = db.transaction('reviewsObj','readwrite');
                        //     const store = tx.objectStore('reviewsObj');
                        //     store.delete(commentToSync.id);
                       
                        //     return tx.complete;
                        //   })
                      })
                      .catch(er=>console.log)
                    }
                  
              
                  return cursor.continue().then(cursorIterate);
                });
                tx.complete.then(() => console.log('finished'));
                updateIndexDB()
    })

  
  )

})
