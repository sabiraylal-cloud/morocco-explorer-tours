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
		clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>'
	};

	var CARDS = [
		{ icon: 'map', color: '#2f5d43', title: 'My Treks & excursions', text: 'Change days, descriptions and photos. Add a new trip.', href: '#/collections/trips' },
		{ icon: 'blog', color: '#4f8a3c', title: 'Blog articles', text: 'Write or change the stories on your blog.', href: '#/collections/blog' },
		{ icon: 'photo', color: '#2b6f8e', title: 'Photos', text: 'Add photos from your phone or computer to a trip.', href: '#/collections/trips' },
		{ icon: 'phone', color: '#a8742a', title: 'My Contact Info', text: 'Phone, WhatsApp, email and social pages.', href: '#/collections/settings' },
		{ icon: 'star', color: '#7a6a3a', title: 'Reviews', text: 'What your travellers say about you.', href: '#/collections/reviews' },
		{ icon: 'clock', color: '#3f4f4a', title: 'Waiting to publish', text: 'See your changes and put them on the website.', href: '#/workflow' }
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

	var bar, home;

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
			var a = el('a', 'mx-card');
			a.href = c.href;
			var icon = el('span', 'mx-icon', svg(c.icon));
			icon.style.background = c.color;
			var title = el('span', 'mx-card-title');
			title.textContent = c.title;
			var text = el('span', 'mx-card-text');
			text.textContent = c.text;
			a.appendChild(icon);
			a.appendChild(title);
			a.appendChild(text);
			grid.appendChild(a);
		});
		inner.appendChild(hello);
		inner.appendChild(lead);
		inner.appendChild(grid);
		home.appendChild(inner);

		document.body.appendChild(home);
		document.body.appendChild(bar);
	}

	function render() {
		var user = currentUser();
		var onHome = window.location.hash === HOME;
		// Only when Decap is showing its signed-in screen (it has a header), never over its login page.
		var loggedIn = !!user && !!document.querySelector('#nc-root header');
		document.body.classList.toggle('mx-on', loggedIn);
		document.body.classList.toggle('mx-home-open', loggedIn && onHome);
		if (loggedIn && onHome) {
			home.querySelector('#mx-hello').innerHTML = 'Hello ' + escapeHtml(firstName(user)) + ' <span aria-hidden="true">👋</span>';
		}
	}

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
