import { withPluginApi } from "discourse/lib/plugin-api";

// ---- ---- ---- ---- ---- ---- ---- ----
// ---- ---- ---- ---- ---- ---- ---- ----

export default {
  setupComponent(args, component) {
    withPluginApi('0.8.8', api => initializePlugin(api, component, args))
  },
};

function initializePlugin(api, component, args) {
	api.onPageChange( (url, title) => {
		component.set('cat_economy', component.siteSettings.covidfuse_cat_economy);
		component.set('cat_health', component.siteSettings.covidfuse_cat_health);
		component.set('cat_social', component.siteSettings.covidfuse_cat_social);
		component.set('cat_environment', component.siteSettings.covidfuse_cat_environment);
		component.set('cat_education', component.siteSettings.covidfuse_cat_education);
		component.set('cat_technology', component.siteSettings.covidfuse_cat_technology);
		
		let isEnabled = component.siteSettings.covidfuse_enabled;
		let show = isCorrectUrl( url );


		// lets check if we show show or hide the complenent
    if( !isEnabled || !show ) {
      component.set('showLandingPage', false);

      if(mainInterval) {
      	clearInterval(mainInterval);
      }
    } else {
			component.set('showLandingPage', true);

			startInterval(component);
    }

	});
}


///
///
///
///


// GLOBAL VARS
let mainInterval = null;
let CATEGORIES = null;


//
//
//
//
function startInterval(component) {
	component.set('showCountdown', true);
	component.set('showTopics', true);

	let skipInterval = false;
	let clockHidden = false;
	let topicsHidden = false;
	let intervalFrequency = 15000; //ms

	if(mainInterval) {
		clearInterval(mainInterval);
	}

	process(component, skipInterval);

	let mainInterval = setInterval( () => {
		process(component, skipInterval);
	}, intervalFrequency);
}

function process(component, skipInterval) {
	if(skipInterval) { return null };

	let remainingTime = getRemainingTime(component);

	if(remainingTime > 0) {
		skipInterval = false;
		component.set('showCountdown', true);
		component.set('showTopics', false);

		changeCountdownTime(component, remainingTime);
	} else {
		skipInterval = true;
		component.set('showTopics', true);
		component.set('showCountdown', false);

		let metaTopicId = component.siteSettings.covidfuse_meta_topic;
		let apiUser = component.siteSettings.covidfuse_api_user;
		let apiKey = component.siteSettings.covidfuse_api_key;

		getCategories()
			.then( (categories) => {
				CATEGORIES = categories;

				getMetaTopics(metaTopicId, apiUser, apiKey).then( (metaTopics) => {
					setMetaTopics(metaTopics, component);
					skipInterval = false;
				});
    	});
	}
}


//
//
//
//
function changeCountdownTime(component, remainingTime) {
	
	let days = Math.floor(remainingTime / (1000*60*60*24));
	let hours = Math.floor((remainingTime % (1000*60*60*24)) / (1000*60*60));
	let minutes = Math.floor((remainingTime % (1000*60*60)) / (1000*60));

	days = days.toString().padStart(2, '0');
	hours = hours.toString().padStart(2, '0');
	minutes = minutes.toString().padStart(2, '0');

	component.set('countdownDays', days);
	component.set('countdownHours', hours);
	component.set('countdownMinutes', minutes);
}

function getRemainingTime(component) {
	let countdownDate = new Date( component.siteSettings.covidfuse_deadline);
	let now = new Date();

	let remaining = countdownDate - now;

	return remaining;
}

function hideCountdown(component) {
	component.set('showCountdown', false);
	component.set('showTopics', true);
}



//
//
//
//
function getCategories() {
	let p = new Promise( (resolve) => {

		let url = '/categories.json';

		fetch(url)
			.then(response => response.json())
			.then( data => {
				let categories = data.category_list.categories.map( c => {
					return { id: c.id, color: c.color };
				})
				
				resolve(categories);
			})
			.catch( err => resolve([]) );
	});

	return p;
}

function getMetaTopics(tId, apiUser, apiKey) {
	let p = new Promise( resolve => {

		let url = `/t/${tId}.json`;

		fetch(url, {
			headers: {
				'Api-Key': apiKey,
	      'Api-Username': apiUser
			}
		})
		.then( response => response.json() )
		.then( (data) => {
			let parsed = {};
			
			try{
				let cooked = data.post_stream.posts[0].cooked;
				
				let raw = cooked
					.replace( /(<([^>]+)>)/ig, '')
					.replaceAll('“', '"')
					.replaceAll('”', '"');

				
				parsed = JSON.parse(raw);
			} catch(err) {
				
			}		

			resolve(parsed);
		})
		.catch( err => resolve({}));

	});

	return p;
}

function setMetaTopics(metaTopics, component) {

	let comingUp = [];
	let nowOn = [];

	metaTopics.forEach( t => {
		
		if(!t.state) { return }

		let category = CATEGORIES.find( c => c.id === t.cId );
		
		if(category) {
			t.color = category.color;
		} else {
			t.color = '000000';
		}
		
		if(t.state === 'coming up') {
			comingUp.push(t);
		}

		if(t.state === 'done') {
			nowOn.push(t);
		}
	});

	component.set('comingUp', comingUp);
	component.set('nowOn', nowOn);
}


//
//
//
//
function isCorrectUrl( url ) {

  if( url === '/' ) {
    return true;
  }

  return false;
}