let restaurant;
var map;

const dbPromise = idb.open('restaurant-store',1,function (db) {
  if (!db.objectStoreNames.contains('restaurantsObj')) {
    console.log('There is no IndexDB');
  };
  if (!db.objectStoreNames.contains('reviewsObj')) {
    db.createObjectStore('reviewsObj',{keyPath:'id'})
  }
});

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  const srcsetText = `/img/small_img/${restaurant.id}_small.jpg 360w, /img/medium_img/${restaurant.id}_med.jpg 600w`;
  image.setAttribute('srcset',srcsetText);
  image.setAttribute('sizes','(max-width: 750px) 100vw,(min-width: 751px) 25vw');
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = `image of restaurant ${restaurant.name}`;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = () => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  const newReviewButton = document.createElement('button')

  newReviewButton.innerHTML = 'Write your review'
  newReviewButton.style.backgroundColor = 'red';
  newReviewButton.style.color = 'white';

  newReviewButton.onclick = (event)=>{
    event.preventDefault();
    modal.style.display = 'block';
  } 
  title.appendChild(newReviewButton)
  // title.innerHTML = 'Reviews';

  container.appendChild(title);

  const ul = document.getElementById('reviews-list');

  dbPromise
  .then(db=>{
              
              const tx = db.transaction('reviewsObj','readonly');
              const store = tx.objectStore('reviewsObj');
              store.openCursor().then(function cursorIterate(cursor){
                if (!cursor) return;
            
                  const entryRest = cursor.value; 
                  if(entryRest.restaurant_id === myID ) {
                    ul.appendChild(createReviewHTML(entryRest));
                  }
                
            
                return cursor.continue().then(cursorIterate);
              });
              tx.complete.then(() => console.log('finished'));
  })

  container.appendChild(ul);

  
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = new Date(review.createdAt);
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

// Get value is_favorite of the current restaurant 
// return promise (readable stream) so return is consumed only once 

const myID = Number(getParameterByName('id'))
const favStar = document.getElementById('fav-star')
const textFav = document.getElementById('par-fav-star')
const endpointFav = `http://localhost:1337/restaurants/${myID}/?is_favorite=true`
const endpointUnFav = `http://localhost:1337/restaurants/${myID}/?is_favorite=false`


const updateStar = ()=>{

  DBHelper.fetchRestaurantById(myID,(er,r)=>{

    let logicalLikeness; 
    if(r.is_favorite === 'true') {
      logicalLikeness = true;
    } else {
      logicalLikeness = false; 
    }
   

    if(logicalLikeness) {
      favStar.style.color = "red";
      textFav.innerHTML = ""
    } else {
      favStar.style.color = "black"
      textFav.innerText = "Mark as favorite"
    }
  })
}

updateStar()

// Listen to click event and toggle is_favorite at IndexedDB 
favStar.addEventListener('click',()=>{
  dbPromise
  .then(db=>{
              
              const tx = db.transaction('restaurantsObj','readwrite');
              const store = tx.objectStore('restaurantsObj');
              let range = IDBKeyRange.only(myID)
              store.openCursor(range).then(function cursorIterate(cursor) {
                if (!cursor) return;
                if(cursor.value.id === myID){
                  const entryMod = cursor.value

                  if(entryMod.is_favorite) {
          
                    if(entryMod.is_favorite === 'true') {
                      entryMod.is_favorite = 'false'
                      fetch(endpointUnFav,{method:'POST'})
                        // .then(res=>{
                        //   console.log('Got it',res)})
                        // .catch(e=>console.log)
                    } else {
                      entryMod.is_favorite = 'true'
                      fetch(endpointFav,{method:'POST'})
                      // .then(res=>{console.log(res)})
                    }
                    // entryMod.is_favorite = !entryMod.is_favorite
                    cursor.update(entryMod)
                  } else {
                    console.log('Missing');
                    entryMod.is_favorite = 'true'
                    cursor.update(entryMod)
                  }

                }
                // console.log(entryMod.is_favorite);
                return cursor.continue().then(cursorIterate);
              });
              tx.complete.then(() => console.log('finished'));

            
              })               
          
              updateStar()

})


// Create form using modal and handle data from form 

const close = document.getElementById('close');
const modal = document.getElementById('modal');
const submit = document.getElementById('submit');
const formName = document.querySelector('#reviewer_name');
const formComments = document.querySelector('#comments');
const formRating = document.querySelector('#rating');

close.addEventListener('click', (event)=> {
event.preventDefault();
modal.style.display = 'none';
});

submit.addEventListener('click',(event)=>{
    event.preventDefault();
    if(formComments.value.trim()=== '' || formRating.value.trim() === '' || formName.value.trim() === '') {
      alert('Please, fill all the fields')
      return 
    }
    modal.style.display = 'none';

    if('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready
        .then(sw=>{
          const newComment = {
            id: new Date().toISOString(),
            restaurant_id: myID,
            name: formName.value,
            rating:formRating.value,
            comments:formComments.value,
            createdAt: new Date().toDateString(),
            fromForm: true,
        };

        console.log(newComment);

          dbPromise
          .then(db=>{
                          const tx = db.transaction('reviewsObj','readwrite');
                          const store = tx.objectStore('reviewsObj');
                          store.put(newComment);
                          return tx.complete;
          }).then(()=>{
            sw.sync.register('sync-new-comment')

            const container1 = document.getElementById('reviews-container');
            const ul1 = document.getElementById('reviews-list');
            ul1.innerHTML ='';
      
            dbPromise
            .then(db=>{
                        
                        const tx = db.transaction('reviewsObj','readonly');
                        const store = tx.objectStore('reviewsObj');
                        store.openCursor().then(function cursorIterate(cursor){
                          if (!cursor) return;
                      
                            const entryRest = cursor.value; 
                            if(entryRest.restaurant_id === myID ) {
                              ul1.appendChild(createReviewHTML(entryRest));
                            }
                          
                      
                          return cursor.continue().then(cursorIterate);
                        });
                        tx.complete.then(() => console.log('finished'));
            })
          
            container1.appendChild(ul1);
         
          })

        })


    }



 






    }
)



 
  
    




