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
		 
		// lets check if we show show or hide the complenent
    if( !isEnabled || !isCorrectUrl( url ) ) {
      component.set('showLandingPage', false);
    } else {
			component.set('showLandingPage', true);    	
    }

    //
    startCountdown(component, isCorrectUrl( url ));
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
