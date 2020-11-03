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

		loggedIn = component.session.csrfToken ? true : false;

		component.set('userLoggedIn', loggedIn);

		component.set('cat_economy', component.siteSettings.covidfuse_cat_economy);
		component.set('cat_health', component.siteSettings.covidfuse_cat_health);
		component.set('cat_social', component.siteSettings.covidfuse_cat_social);
		component.set('cat_environment', component.siteSettings.covidfuse_cat_environment);
		component.set('cat_education', component.siteSettings.covidfuse_cat_education);
		component.set('cat_technology', component.siteSettings.covidfuse_cat_technology);

		let isEnabled = component.siteSettings.covidfuse_enabled;
		let showLandingPage = isCorrectUrl( url );
    let showCategoiesPage = isCategoriesUrl(url);

    component.set('showLandingPage', false);
    component.set('showCategoryPage', false);

    if (showLandingPage && isEnabled) {
      component.set('showLandingPage', true);
      startProcess(component);
    }

    if (showCategoiesPage && isEnabled) {
      component.set('showCategoryPage', true);
    }

    if(!showLandingPage && !showCategoiesPage) {
      if (mainTimeout) {
        clearTimeout(mainTimeout);
        //console.log('Clearing Timeout -> onPageChange');
      }
    }
	});
}


///
///
///
///


// GLOBAL VARS
let loggedIn = false;
let mainTimeout = null;
let CATEGORIES = null;


//
//
//
//
function startProcess(component) {
	component.set('showCountdown', true);
	component.set('showTopics', true);

	if(mainTimeout) {
		clearTimeout(mainTimeout);
		//console.log('Clearing Timeout -> startProcess');
	}

	process(component);
}

function process(component) {
	let remainingTime = getRemainingTime(component);

	let p = null;
	let which = null;

	if(remainingTime > 0) {
		which = 'time';
		component.set('showCountdown', true);
		component.set('showTopics', false);
		p = processTime(component);
	} else {
		which = 'data';
		component.set('showCountdown', false);
		//component.set('showTopics', true);
		p = processData(component);
	}

	p.then( () => {
		let timeout = 0;

		if(which === 'time') {
			timeout = 500;
		}
		if(which === 'data') {
			timeout = 20000;
		}

		mainTimeout = setTimeout( () => {
			process(component)
		}, timeout);
	});
}

function processTime(component) {
	let p = new Promise( (resolve) => {
		changeCountdownTime(component);

		resolve();
	});

	return p;
}

function processData(component) {
	let p = new Promise( (resolve) => {
		let metaTopicId = component.siteSettings.covidfuse_meta_topic;
		let apiUser = component.siteSettings.covidfuse_api_user;
		let apiKey = component.siteSettings.covidfuse_api_key;

		getCategories()
			.then( (categories) => {
				CATEGORIES = categories;

				getMetaTopics(metaTopicId, apiUser, apiKey).then( (metaTopics) => {

          setMetaTopics(metaTopics, component);
          extractSchedule(metaTopics, component);

					resolve();
				});
	  	});
	});

	return p;
}


//
//
//
//
function changeCountdownTime(component) {
	let remainingTime = getRemainingTime(component);

	let days = Math.floor(remainingTime / (1000*60*60*24));
	let hours = Math.floor((remainingTime % (1000*60*60*24)) / (1000*60*60));
	let minutes = Math.floor((remainingTime % (1000*60*60)) / (1000*60));
	let seconds = Math.floor((remainingTime % (1000*60)) / (1000));

	let daysText = days === 1 ? 'day' : 'days';
	let hoursText = hours === 1 ? 'hour' : 'hours';
	let minutesText = minutes === 1 ? 'minute' : 'minutes';
	let secondsText = seconds === 1 ? 'second' : 'seconds';

	days = days.toString().padStart(2, '0');
	hours = hours.toString().padStart(2, '0');
	minutes = minutes.toString().padStart(2, '0');
	seconds = seconds.toString().padStart(2, '0');

	component.set('countdownDays', days);
	component.set('countdownHours', hours);
	component.set('countdownMinutes', minutes);
	component.set('countdownSeconds', seconds);

	component.set('countdownDaysText', daysText);
	component.set('countdownHoursText', hoursText);
	component.set('countdownMinutesText', minutesText);
	component.set('countdownSecondsText', secondsText);
}

function getRemainingTime(component) {
	let countdownDate = new Date( component.siteSettings.covidfuse_deadline);
	let now = new Date();

	let remaining = countdownDate - now;

	return remaining;
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
			let parsed = [];

			try{
				let cooked = data.post_stream.posts[0].cooked;

				let split = cooked.split('<hr>');

				split.forEach( entry => {

          let p = parseRaw(entry);

					parsed.push(p);
				});
			} catch(err) {

			}

			resolve(parsed);
		})
		.catch( err => resolve({}));

	});

	return p;
}

function parseRaw(entry) {
  let raw = entry.replace(/(<([^>]+)>)/ig, '');

  let lines = raw.split('\n').filter(l => l.length > 0);

  let obj = {};

  lines.forEach(line => {

    let a = line.substring(0, line.indexOf(':')).trim();
    let b = line.substring(line.indexOf(':')).replace(':', '').trim();

    obj[a] = b;
  });

  obj.experts = obj.experts.split(',').map( entry => entry.trim() );
  obj.expertTopicIds = obj.expertTopicIds.split(',').map( entry => entry.trim() );

  return obj;
}

function setMetaTopics(metaTopics, component) {

	let comingUp = [];
	let nowOn = [];

	metaTopics.forEach( t => {

		if(!t.state) { return }

		let category = CATEGORIES.find( c => c.id == t.categoryId );

		if(category) {
			t.color = category.color;
		} else {
			t.color = '000000';
		}

    if (t.state === 'coming up' && t.hidden === 'false') {
      comingUp.push(t);
    }

    if (t.state === 'now on' && t.hidden === 'false') {
      nowOn.push(t);
    }
	});

  sortMetaTopics(comingUp);
  sortMetaTopics(nowOn);

	component.set('comingUp', comingUp);
	component.set('nowOn', nowOn);

  if (comingUp.length === 0 && nowOn.length === 0) {
    component.set('showTopics', false);
  }
  else {
    component.set('showTopics', true);
  }
}

function extractSchedule(metaTopics, component) {
  let split = {};

  metaTopics.forEach(mt => {
    if(!split[mt.date]) {
      split[mt.date] = [];
    }

    split[mt.date].push(mt);
  });

  if (split['2020/11/10']) {
    sortMetaTopics(split['2020/11/10']);
    component.set('scheduleOne', split['2020/11/10']);
  }
  if (split['2020/11/11']) {
    sortMetaTopics(split['2020/11/11']);
    component.set('scheduleTwo', split['2020/11/11']);
  }
}

function sortMetaTopics(topics) {
  topics.sort((a, b) => {
    let rawA = `${a.date} ${a.time.split('-')[0].trim()}`;
    let rawB = `${b.date} ${b.time.split('-')[0].trim()}`;

    let parsedA = new Date(rawA);
    let parsedB = new Date(rawB);

    return parsedA - parsedB;
  });
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

function isCategoriesUrl( url) {
  if (url === '/categories') {
    return true;
  }

  return false;
}
