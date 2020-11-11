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


      setTimeout(() => {

        let el = document.querySelector('#banner-loggedin-btn');
        if(!el) { return }
        el.addEventListener('click', () => {
          let element = document.querySelector('#schedule-1');
          let elementPosition = element.getBoundingClientRect().top;
          let offsetPosition = elementPosition - 100;

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
          });
        });
      },500);
    }

    if (showCategoiesPage && isEnabled) {
      component.set('showCategoryPage', true);
    }

    if(!showLandingPage && !showCategoiesPage) {
      clearTimeout(clockTimeout);
      clearTimeout(dataTimeout);
      //console.log('Clearing Timeouts -> onPageChange');
    }
	});
}


///
///
///
///


// GLOBAL VARS
let loggedIn = false;
let clockTimeout = null;
let dataTimeout = null;
let CATEGORIES = null;


//
//
//
//
function startProcess(component) {
	component.set('showCountdown', true);

  if (clockTimeout) {
    clearTimeout(clockTimeout);
    //console.log('Clearing clockTimeout -> startProcess');
	}
  if (dataTimeout) {
    clearTimeout(dataTimeout);
    //console.log('Clearing dataTimeout -> startProcess');
  }

	startTime(component);
  startData(component);
}

function startTime(component) {
  let remainingTime = getRemainingTime(component);

  if (remainingTime > 0) {
    component.set('showCountdown', true);
  } else {
    component.set('showCountdown', false);
  }

  let p = processTime(component);

  p.then( () => {
    clockTimeout = setTimeout(() => {
      //console.log('clocktimeout');
      startTime(component)
    }, 500);
  });
}

function startData(component) {

	let p = processData(component);

	p.then( () => {
    dataTimeout = setTimeout(() => {
      //console.log('datatimeout');
      startData(component)
    }, 30000);
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

          addInfoToMetaTopicsAndSort(metaTopics, component);
          extractLiveTopics(metaTopics, component);
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

function addInfoToMetaTopicsAndSort(metaTopics) {
	metaTopics.forEach( t => {

    t.live = t.live === 'true'? true : false;
    t.hidden = t.hidden === 'true' ? true : false;

		let category = CATEGORIES.find( c => c.id == t.categoryId );

		if(category) {
			t.color = category.color;
		} else {
			t.color = '000000';
		}
	});

  sortMetaTopics(metaTopics);
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

function extractLiveTopics(metaTopics, component) {

  let liveTopics = metaTopics.filter( mt => mt.live ).filter(mt => !mt.hidden);

  if(liveTopics.length > 0) {
    component.set('showLive', true);
    component.set('liveTopics', liveTopics);
  } else {
    component.set('showLive', false);
    component.set('liveTopics', []);
  }
}

function extractSchedule(metaTopics, component) {
  let split = {};

  metaTopics.forEach(mt => {
    if (!split[mt.date]) {
      split[mt.date] = [];
    }

    split[mt.date].push(mt);
  });

  if (split['2020/11/10']) {
    component.set('scheduleOne', split['2020/11/10']);
  }
  if (split['2020/11/11']) {
    component.set('scheduleTwo', split['2020/11/11']);
  }
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
