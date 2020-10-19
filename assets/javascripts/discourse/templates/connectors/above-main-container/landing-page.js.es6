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

		let isEnabled = component.siteSettings.covidfuse_enabled;
		let metaTopicId = component.siteSettings.covidfuse_meta_topic;
		let apiUser = component.siteSettings.covidfuse_api_user;
		let apiKey = component.siteSettings.covidfuse_api_key;

		component.set('cat_economy', component.siteSettings.covidfuse_cat_economy);
		component.set('cat_health', component.siteSettings.covidfuse_cat_health);
		component.set('cat_social', component.siteSettings.covidfuse_cat_social);
		component.set('cat_environment', component.siteSettings.covidfuse_cat_environment);
		component.set('cat_education', component.siteSettings.covidfuse_cat_education);
		component.set('cat_technology', component.siteSettings.covidfuse_cat_technology);
		 
		// lets check if we show show or hide the complenent
    if( !isEnabled || !isCorrectUrl( url ) ) {
      component.set('showLandingPage', false);
    } else {
			component.set('showLandingPage', true);

			//
	    startCountdown(component, isCorrectUrl( url ));

	    //

	    getCategories()
				.then( async (categories) => {
					CATEGORIES = categories;

					let metaTopics = await getMetaTopics(metaTopicId, apiUser, apiKey);
					setMetaTopics(metaTopics, component);
	    	});
    }

	});
}


///
///
///
///


// GLOBAL VARS

let interval = null;
let CATEGORIES = null;

function isCorrectUrl( url ) {

  if( url === '/' ) {
    return true;
  }

  return false;
}

function startCountdown(component, show) {
	component.set('showCountdown', true);
	component.set('showTopics', false);
	
	if(interval) {
		clearInterval(interval);
	}
	
	if(!show) {
		return null;
	}

	let done = checkRemainingTime(component)
	
	if(done) {
		hideCountdown(component);
	}

	interval = setInterval( () => {
		let toClear = changeCountdownTime(component);

		if(toClear) {
			clearInterval(interval);
			hideCountdown(component);
		}
	}, 1000);
}

function changeCountdownTime(component) {
	let countdownDate = new Date( component.siteSettings.covidfuse_deadline);
	let now = new Date();

	let remaining = countdownDate - now;

	if(remaining <= 0) {
		return true;
	}
	
	let days = Math.floor(remaining / (1000*60*60*24));
	let hours = Math.floor((remaining % (1000*60*60*24)) / (1000*60*60));
	let minutes = Math.floor((remaining % (1000*60*60)) / (1000*60));

	days = days.toString().padStart(2, '0');
	hours = hours.toString().padStart(2, '0');
	minutes = minutes.toString().padStart(2, '0');

	document.querySelector('.days-wrapper').querySelector('.time').innerHTML = days;
	document.querySelector('.hours-wrapper').querySelector('.time').innerHTML = hours;
	document.querySelector('.minutes-wrapper').querySelector('.time').innerHTML = minutes;
}

function checkRemainingTime(component) {
	let countdownDate = new Date( component.siteSettings.covidfuse_deadline);
	let now = new Date();

	let remaining = countdownDate - now;

	if(remaining <= 0) {
		return true;
	}  

	return false;
}

function hideCountdown(component) {
	component.set('showCountdown', false);
	component.set('showTopics', true);
}

//
async function getCategories() {
	let url = '/categories.json';

	let data = await fetch(url)
		.then(response => response.json())
		.catch( err => Object.assign({},{}));

	let categories = data.category_list.categories.map( c => {
		return { id: c.id, color: c.color };
	})
	
	return categories;
}

async function getMetaTopics(tId, apiUser, apiKey) {
	let url = `/t/${tId}.json`;

	let data = await fetch(url, {
		headers: {
			'Api-Key': apiKey,
      'Api-Username': apiUser
		}
	})
		.then(response => response.json())
		.catch( err => Object.assign({},{}));

	try{
		let cooked = data.post_stream.posts[0].cooked;
		
		let raw = cooked
			.replace( /(<([^>]+)>)/ig, '')
			.replaceAll('“', '"')
			.replaceAll('”', '"');

		
		let parsed = JSON.parse(raw);

		return parsed;
	} catch(err) {
		return [];
	}
}

async function setMetaTopics(metaTopics, component) {

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
