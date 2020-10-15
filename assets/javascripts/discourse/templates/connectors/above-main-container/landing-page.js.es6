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
		let metaCatId = component.siteSettings.covidfuse_cat_meta;

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
    }

    //
    startCountdown(component, isCorrectUrl( url ));

    //
    
		getMetaCategoryTopics(metaCatId).then( async (metaTopics) => {

			metaTopics = await getAllMetaTopicsContent(metaTopics);


			sortOutEventGroups(metaTopics)
		});

	});
}


///
///
///
///


// GLOBAL VARS

let interval = null;

function isCorrectUrl( url ) {

  if( url === '/' ) {
    return true;
  }

  return false;
}

function startCountdown(component, show) {
	
	if(interval) {
		clearInterval(interval);
	}

	if(!show) {
		return null;
	}

	// need to call it once or else we have to wait 1000 ms
	//changeCountdownTime(component);

	interval = setInterval( () => {
		changeCountdownTime(component);
	}, 1000);
}

function changeCountdownTime(component) {
	let countdownDate = new Date( component.siteSettings.covidfuse_deadline);
		let now = new Date();

		let remaining = countdownDate - now;

		if(remaining === 0) {
			clearInterval(0);
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

//
async function getMetaCategoryTopics(cId) {
	let url = `/c/${cId}.json`;

	let data = await fetch(url)
		.then(response => response.json())
		.catch( err => Object.assign({},{}));

	let topics = data.topic_list.topics
		.map( (t) => {
			return { id: t.id, title: t.title };
		})
		.filter( (t) => t.title.startsWith('META') );

	return topics;
}

async function getMetaTopicContent(tId) {
	let url = `/t/${tId}.json`;

	let data = await fetch(url)
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
		return {};
	}
}

async function getAllMetaTopicsContent(metaTopics) {
	return await Promise.all(metaTopics.map( async (topic) => {

		let content = await getMetaTopicContent(topic.id);

		topic.content = content;

		return topic;
	}));
}

async function sortOutEventGroups(metaTopics) {

	let comingUp = [];
	let nowOn = [];

	metaTopics.forEach( t => {
		if(!t.content || !t.content.state) { return }

		if(t.content.state === 'cu') {
			comingUp.push(t.content);
		}

		if(t.content.state === 'do') {
			nowOn.push(t.content);
		}
	});

	console.log('setting comingUp', comingUp);
	console.log('setting nowOn', nowOn);

	component.set('comingUp', comingUp);
	component.set('nowOn', nowOn);
}



