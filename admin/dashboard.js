/* Friendly home page for the Decap CMS dashboard.
 * Draws a "Hello" page with big buttons over Decap when the address is /admin/#/home.
 * It only adds a page on top of Decap: login, saving and publishing are untouched. */
(function () {
	'use strict';

	var SITE_URL = 'https://moroccoexplorertours.com';
	var SITE_NAME = 'Morocco Explorer Tours';
	var HOME = '#/home';

	var ICONS = {
		home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
		eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
		out: '<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4"/><path d="M16 8l4 4-4 4"/><path d="M20 12H9"/>',
		map: '<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5Z"/><path d="M9 4v13.5M15 6.5V20"/>',
		blog: '<path d="M5 3h10l4 4v14H5V3Z"/><path d="M14 3v5h5"/><path d="M8 12h8M8 16h8"/>',
		photo: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m4 18 5.5-5 4 3.5 3-2.5L21 18"/>',
		phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z"/>',
		star: '<path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.3l1.1-6.2L3 9.7l6.2-.9L12 3Z"/>',
		back: '<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>',
		text: '<path d="M5 6V4h14v2"/><path d="M12 4v16"/><path d="M9 20h6"/>',
		pencil: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
		up: '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
		down: '<path d="M12 5v14"/><path d="m18 13-6 6-6-6"/>',
		plus: '<path d="M12 5v14M5 12h14"/>',
		clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>'
	};

	var CARDS = [
		{ icon: 'map', color: '#b4472b', title: 'My Tours', text: 'Add and change your treks and day trips.', href: '#/tours' },
		{ icon: 'photo', color: '#2b6f8e', title: 'Photos', text: 'Add photos from your phone or computer.', soon: true },
		{ icon: 'text', color: '#3f4f4a', title: 'Website Text', text: 'Words on your pages, and blog articles.', soon: true },
		{ icon: 'star', color: '#a8742a', title: 'Reviews', text: 'What your travellers say about you.', href: '#/collections/reviews' },
		{ icon: 'phone', color: '#d98a1a', title: 'My Contact Info', text: 'Phone, WhatsApp, email and social pages.', href: '#/collections/settings' },
		{ icon: 'clock', color: '#4a5560', title: 'Waiting to publish', text: 'See your changes and put them on the website.', href: '#/workflow' }
	];

	function svg(name) {
		return '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
	}

	function currentUser() {
		var keys = ['decap-cms-user', 'netlify-cms-user'];
		for (var i = 0; i < keys.length; i++) {
			try {
				var raw = window.localStorage.getItem(keys[i]);
				if (raw) return JSON.parse(raw) || {};
			} catch (e) { /* storage unavailable */ }
		}
		return null;
	}

	function firstName(user) {
		var name = (user && (user.name || user.login)) || '';
		name = String(name).trim().split(/\s+/)[0];
		return name || 'there';
	}

	function el(tag, cls, html) {
		var node = document.createElement(tag);
		if (cls) node.className = cls;
		if (html != null) node.innerHTML = html;
		return node;
	}

	function logout() {
		['decap-cms-user', 'netlify-cms-user'].forEach(function (k) {
			try { window.localStorage.removeItem(k); } catch (e) { /* ignore */ }
		});
		window.location.hash = '';
		window.location.reload();
	}

	var PAGES = {
		trips: ['My Treks & excursions', 'Your treks and day trips. Open the list, then tap a trip to change it.'],
		blog: ['Blog articles', 'The stories on your blog. Tap an article to change it, or add a new one.'],
		settings: ['My contact info', 'Your phone, WhatsApp, email and social pages.'],
		reviews: ['Reviews', 'What your travellers say about you.']
	};

	var REPO = 'sabiraylal-cloud/morocco-explorer-tours';
	var TRIPS_FILE = 'data/trips.json';
	var EDITOR = '#/collections/trips/entries/trips';
	var SECTION = { trek: 'treks', excursion: 'excursions' };

	var bar, home, head, headTitle, headText, backLink, backLabel, tours, toursList, toursMsg, toursListView, toursDetail, toursLoaded = false, lastRoute = '', listNote = null;

	function build() {
		bar = el('div', 'mx-bar');
		var homeBtn = el('a', 'mx-homebtn', svg('home') + '<span>Home</span>');
		homeBtn.href = HOME;
		var name = el('span', 'mx-sitename');
		name.textContent = SITE_NAME;
		var spacer = el('span', 'mx-spacer');
		var see = el('a', 'mx-pill', svg('eye') + '<span>See my website</span>');
		see.href = SITE_URL;
		see.target = '_blank';
		see.rel = 'noopener noreferrer';
		var out = el('button', 'mx-pill', svg('out') + '<span>Sign out</span>');
		out.type = 'button';
		out.addEventListener('click', logout);
		[homeBtn, name, spacer, see, out].forEach(function (n) { bar.appendChild(n); });

		home = el('main', 'mx-home');
		home.setAttribute('aria-label', 'Home');
		var inner = el('div', 'mx-home-inner');
		var hello = el('h1', 'mx-hello');
		hello.id = 'mx-hello';
		var lead = el('p', 'mx-lead');
		lead.textContent = 'What would you like to do today? Tap one of the big buttons.';
		var grid = el('div', 'mx-grid');
		CARDS.forEach(function (c) {
			var a = el(c.soon ? 'div' : 'a', 'mx-card' + (c.soon ? ' mx-card-soon' : ''));
			if (c.soon) a.setAttribute('aria-disabled', 'true');
			else a.href = c.href;
			var icon = el('span', 'mx-icon', svg(c.icon));
			icon.style.background = c.color;
			var title = el('span', 'mx-card-title');
			title.textContent = c.title;
			var text = el('span', 'mx-card-text');
			text.textContent = c.text;
			a.appendChild(icon);
			a.appendChild(title);
			a.appendChild(text);
			if (c.soon) a.appendChild(el('span', 'mx-soon', 'Coming soon'));
			grid.appendChild(a);
		});
		inner.appendChild(hello);
		inner.appendChild(lead);
		inner.appendChild(grid);
		home.appendChild(inner);

		head = el('div', 'mx-pagehead');
		var headIn = el('div', 'mx-pagehead-in');
		var back = el('a', 'mx-back', svg('back') + '<span>Home</span>');
		back.href = HOME;
		backLink = back;
		backLabel = back.querySelector('span');
		headTitle = el('h1', 'mx-title');
		headText = el('p', 'mx-sub-text');
		[back, headTitle, headText].forEach(function (n) { headIn.appendChild(n); });
		head.appendChild(headIn);

		tours = el('main', 'mx-home mx-tours');
		tours.setAttribute('aria-label', 'My Tours');
		var tin = el('div', 'mx-home-inner');
		var add = el('a', 'mx-primary', svg('plus') + '<span>Add a new tour</span>');
		add.href = '#/tours/new/new';
		toursMsg = el('p', 'mx-toast');
		toursMsg.setAttribute('role', 'status');
		toursList = el('div', 'mx-tour-list');
		toursListView = el('div');
		toursListView.appendChild(add);
		toursListView.appendChild(toursList);
		toursDetail = el('div');
		[toursMsg, toursListView, toursDetail].forEach(function (n) { tin.appendChild(n); });
		tours.appendChild(tin);

		document.body.appendChild(home);
		document.body.appendChild(tours);
		document.body.appendChild(head);
		document.body.appendChild(bar);
	}

	// ---- My Tours: read and save data/trips.json through GitHub (saving publishes the site) ----
	function api(path, options) {
		var user = currentUser();
		if (!user || !user.token) return Promise.reject({ status: 401 });
		options = options || {};
		// "no-store": GitHub lets the browser keep answers for 60 seconds, which made a second save use an old copy.
		options.cache = 'no-store';
		options.headers = Object.assign({ Authorization: 'token ' + user.token, Accept: 'application/vnd.github+json' }, options.headers || {});
		return fetch('https://api.github.com/repos/' + REPO + path, options).then(function (r) {
			if (!r.ok) {
				var limited = r.status === 403 && r.headers.get('x-ratelimit-remaining') === '0';
				throw { status: limited ? 429 : r.status };
			}
			return r.json();
		}, function () { throw { status: 0 }; });
	}

	// Plain words for every way saving can fail.
	function reason(err) {
		var s = err && err.status;
		if (s === 0) return 'There is no internet connection, or it is too slow. Check it and try again.';
		if (s === 401) return 'Your sign-in has ended. Press Sign out, sign in again, then try again.';
		if (s === 403) return 'Your account is not allowed to change the website. Ask the person who manages the website to give you access.';
		if (s === 404) return 'We could not find the list of tours. Please tell the person who manages the website.';
		if (s === 409 || s === 422) return 'The tours were changed somewhere else a moment ago. We reloaded them. Please try again.';
		if (s === 429) return 'Too many changes in a short time. Wait a minute, then try again.';
		if (s >= 500) return 'The website storage (GitHub) is not answering. Try again in a few minutes.';
		return 'Something went wrong. Please try again, and tell us if it keeps happening.';
	}

	function decode(b64) {
		var bin = atob(b64.replace(/\s/g, ''));
		var bytes = new Uint8Array(bin.length);
		for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
		return new TextDecoder('utf-8').decode(bytes);
	}

	function encode(text) {
		var bytes = new TextEncoder().encode(text), bin = '';
		for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
		return btoa(bin);
	}

	var state = null; // { sha, data } of data/trips.json as last read from or saved to GitHub

	function loadFile(path) {
		return api('/contents/' + path + '?ref=main').then(function (file) {
			return { sha: file.sha, data: JSON.parse(decode(file.content)) };
		});
	}

	function loadTrips() {
		return loadFile(TRIPS_FILE).then(function (file) { state = file; return state; });
	}

	function saveTrips(file, message) {
		var body = { message: message, content: encode(JSON.stringify(file.data, null, 2) + '\n'), sha: file.sha, branch: 'main' };
		return api('/contents/' + TRIPS_FILE, { method: 'PUT', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
	}

	function say(text, bad) {
		toursMsg.textContent = text;
		toursMsg.className = 'mx-toast' + (text ? (bad ? ' mx-bad' : ' mx-good') : '');
	}

	function isVisible(trip) { return trip.visible !== false; }

	function lengthText(trip) {
		if (trip.type === 'trek') return trip.days + ' Days / ' + (trip.days - 1) + ' Nights';
		return '1 Day';
	}

	function priceText(trip) {
		var p = trip.price || {};
		if (typeof p.amount !== 'number' || !(p.amount > 0)) return '';
		var cur = p.currency || 'USD';
		var shown = cur === 'USD' ? 'US$' + p.amount : cur === 'EUR' ? '\u20ac' + p.amount : p.amount + ' ' + cur;
		return 'From ' + shown + ' per person';
	}

	function thumb(trip) {
		var key = trip.uploaded_image ? '../' + trip.uploaded_image : trip.image ? '../assets/images/' + trip.image + '-480.webp' : '';
		return key;
	}

	var busy = false;

	function move(index, delta) {
		if (busy || !state) return;
		busy = true;
		var before = state;
		var list = before.data.trips, trip = list[index];
		var j = index + delta;
		while (j >= 0 && j < list.length && list[j].type !== trip.type) j += delta;
		if (j < 0 || j >= list.length) { busy = false; return; }
		var next = { sha: before.sha, data: { trips: list.slice() } };
		next.data.trips[index] = list[j];
		next.data.trips[j] = trip;
		say('Saving\u2026');
		drawTours(next); // show the new order right away, buttons off while saving
		saveTrips(next, 'content: change tour order').then(function (res) {
			state = { sha: res.content.sha, data: next.data };
			busy = false;
			drawTours(state);
			say('Saved. The new order will be on the website in a few minutes.');
		}).catch(function (err) {
			// Put the screen back to what is really saved, then say why.
			loadTrips().then(function (fresh) { busy = false; drawTours(fresh); }, function () { busy = false; drawTours(before); });
			say('Not saved. ' + reason(err), true);
		});
	}

	function drawTours(file) {
		var list = file.data.trips;
		toursList.textContent = '';
		list.forEach(function (trip, i) {
			var shown = isVisible(trip);
			var card = el('article', 'mx-tour');
			var photo = el('div', 'mx-tour-photo');
			var src = thumb(trip);
			if (src) {
				var im = el('img');
				im.src = src;
				im.alt = '';
				im.loading = 'lazy';
				photo.appendChild(im);
			}
			var info = el('div', 'mx-tour-info');
			var name = el('h2', 'mx-tour-name');
			name.textContent = (trip.fr && trip.fr.name) || trip.slug;
			var meta = el('p', 'mx-tour-meta');
			var parts = [lengthText(trip)];
			var price = priceText(trip);
			if (price) parts.push(price);
			meta.textContent = parts.join('  \u00b7  ');
			var badge = el('span', 'mx-badge ' + (shown ? 'mx-on-site' : 'mx-off-site'),
				shown ? svg('eye') + '<span>On the website</span>' : '<span>Hidden</span>');
			meta.appendChild(badge);
			var row = el('div', 'mx-tour-actions');
			var change = el('a', 'mx-btn mx-btn-main', svg('pencil') + '<span>Change</span>');
			change.href = '#/tours/' + trip.slug;
			var preview = el(shown ? 'a' : 'span', 'mx-btn', svg('eye') + '<span>Preview</span>');
			if (shown) {
				preview.href = SITE_URL + '/' + SECTION[trip.type] + '/' + trip.slug + '.html';
				preview.target = '_blank';
				preview.rel = 'noopener noreferrer';
			} else { preview.setAttribute('aria-disabled', 'true'); preview.className += ' mx-btn-off'; }
			var up = el('button', 'mx-btn', svg('up') + '<span>Up</span>');
			var down = el('button', 'mx-btn', svg('down') + '<span>Down</span>');
			up.type = down.type = 'button';
			var first = !list.some(function (o, k) { return k < i && o.type === trip.type; });
			var last = !list.some(function (o, k) { return k > i && o.type === trip.type; });
			if (first || busy) { up.disabled = true; up.className += ' mx-btn-off'; } else up.addEventListener('click', function () { move(i, -1); });
			if (last || busy) { down.disabled = true; down.className += ' mx-btn-off'; } else down.addEventListener('click', function () { move(i, 1); });
			[change, preview, up, down].forEach(function (n) { row.appendChild(n); });
			[name, meta, row].forEach(function (n) { info.appendChild(n); });
			card.appendChild(photo);
			card.appendChild(info);
			toursList.appendChild(card);
		});
	}

	function showTours() {
		if (toursLoaded) return;
		toursLoaded = true;
		say('Loading your tours\u2026');
		loadTrips().then(function (file) { if (listNote) { say(listNote.text, listNote.bad); listNote = null; } else say(''); drawTours(file); })
			.catch(function (err) { toursLoaded = false; say('We could not load your tours. ' + reason(err) + ' Then press Home and My Tours again.', true); });
	}

	function render() {
		var user = currentUser();
		var onHome = window.location.hash === HOME;
		// Only when Decap is showing its signed-in screen (it has a header), never over its login page.
		var loggedIn = !!user && !!document.querySelector('#nc-root header');
		document.body.classList.toggle('mx-on', loggedIn);
		document.body.classList.toggle('mx-home-open', loggedIn && onHome);
		// A list page (not the editor): show the "< Home" header with a plain title.
		var m = /^#\/collections\/([^\/?]+)\/?(?:\?.*)?$/.exec(window.location.hash);
		var page = m && PAGES[m[1]];
		var wf = window.location.hash.indexOf('#/workflow') === 0;
		var tm = /^#\/tours(?:\/([^\/?]+))?(?:\/([^\/?]+))?(?:\/([^\/?]+))?\/?$/.exec(window.location.hash);
		var onTours = !!tm;
		var onToursList = !!tm && !tm[1];
		document.body.classList.toggle('mx-tours-open', loggedIn && onTours);
		if (loggedIn && onTours) {
			if (window.location.hash !== lastRoute) {
				lastRoute = window.location.hash;
				toursListView.style.display = onToursList ? '' : 'none';
				toursDetail.style.display = onToursList ? 'none' : '';
				if (onToursList) { backLink.href = HOME; backLabel.textContent = 'Home'; toursLoaded = false; listNote = window.MX && window.MX.flash ? window.MX.flash : null; window.MX.flash = null; say(''); }
				else if (window.MX && window.MX.tourRoute) window.MX.tourRoute(tm[1], tm[2], tm[3], toursDetail);
			}
			if (onToursList) showTours();
		} else if (!onTours) { toursLoaded = false; lastRoute = ''; }
		var sub = loggedIn && (!!page || wf || onTours);
		document.body.classList.toggle('mx-sub', sub);
		if (sub) {
			if (onToursList) { headTitle.textContent = 'My Tours'; headText.textContent = 'All your tours, in the same order as on the website. Tap Change to edit a tour.'; }
			else if (!onTours) headTitle.textContent = page ? page[0] : 'Waiting to publish';
			if (!onTours) headText.textContent = page ? page[1] : 'Changes you saved that are not on the website yet.';
			document.documentElement.style.setProperty('--mx-head-h', (head.offsetHeight + 4) + 'px');
		}
		if (loggedIn && onHome) {
			home.querySelector('#mx-hello').innerHTML = 'Hello ' + escapeHtml(firstName(user)) + ' <span aria-hidden="true">👋</span>';
		}
	}

	function setHead(backHref, backText, title, text) {
		backLink.href = backHref;
		backLabel.textContent = backText;
		headTitle.textContent = title;
		headText.textContent = text;
	}

	window.MX = {
		el: el, svg: svg, ICONS: ICONS, api: api, reason: reason, say: say, loadFile: loadFile, loadTrips: loadTrips,
		encode: encode, saveTrips: saveTrips, getState: function () { return state; }, setState: function (s) { state = s; },
		priceText: priceText, lengthText: lengthText, thumb: thumb, isVisible: isVisible, setHead: setHead,
		SITE_URL: SITE_URL, SECTION: SECTION, HOME: HOME, TRIPS_FILE: TRIPS_FILE, REPO: REPO
	};

	function escapeHtml(s) {
		return String(s).replace(/[&<>"']/g, function (ch) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
		});
	}

	// Decap sends people from "/" straight to the first section. Send them to Home
	// instead, but only when they did not just click something themselves.
	var lastClick = 0;
	var prevHash = window.location.hash;
	window.addEventListener('pointerdown', function () { lastClick = Date.now(); }, true);
	window.addEventListener('keydown', function () { lastClick = Date.now(); }, true);

	function checkRedirect() {
		var hash = window.location.hash;
		var fromBlank = prevHash === '' || prevHash === '#' || prevHash === '#/';
		var redirected = fromBlank && hash.indexOf('#/collections') === 0 && Date.now() - lastClick > 800 && !!currentUser();
		prevHash = hash;
		if (redirected) {
			prevHash = HOME;
			window.location.replace(HOME);
		}
		render();
	}

	window.addEventListener('hashchange', checkRedirect);

	function start() {
		build();
		render();
		// Decap draws its screens after this script runs, so keep looking.
		window.setInterval(checkRedirect, 150);
		window.addEventListener('storage', render);
	}

	if (document.body) start();
	else document.addEventListener('DOMContentLoaded', start);
})();
