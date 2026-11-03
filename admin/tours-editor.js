/* Tour pages of the dashboard: one tour's home page, its simple edit pages, copy, delete and "Add a new tour".
 * Uses the helpers dashboard.js puts in window.MX. Every save writes data/trips.json through GitHub (this publishes the site). */
(function () {
	'use strict';
	var MX = window.MX;
	if (!MX) return;
	var el = MX.el, svg = MX.svg;

	Object.assign(MX.ICONS, {
		tag: '<path d="M3 12V4h8l10 10-8 8L3 12Z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
		calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
		route: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5Z"/>',
		check: '<path d="m5 12 5 5 9-10"/>',
		info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
		search: '<circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/>',
		x: '<path d="M6 6l12 12M18 6 6 18"/>',
		trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
		copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'
	});

	var SAVED = 'Saved. It will be on the website in a few minutes.';
	var busy = false;

	function clone(x) { return JSON.parse(JSON.stringify(x)); }
	function find(list, slug) { for (var i = 0; i < list.length; i++) if (list[i].slug === slug) return list[i]; return null; }
	function langName(code) { return code === 'en' ? 'English' : 'French'; }
	function publicUrl(trip) { return MX.SITE_URL + '/' + MX.SECTION[trip.type] + '/' + trip.slug + '.html'; }
	function trekWord(trip) { return trip.type === 'trek'; }

	function slugify(text) {
		return String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
			.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
	}

	// Load the freshest list, change one tour, save, and keep the new copy for the next save.
	function saveMutate(slug, mutate, message) {
		return MX.loadTrips().then(function (file) {
			var trip = find(file.data.trips, slug);
			if (!trip) throw { status: 404 };
			mutate(trip, file.data.trips);
			return MX.saveTrips(file, message).then(function (res) {
				var next = { sha: res.content.sha, data: file.data };
				MX.setState(next);
				return next;
			});
		});
	}

	function bad(err) { MX.say('Not saved. ' + MX.reason(err), true); }
	function top() { var m = document.querySelector('.mx-tours'); if (m) m.scrollTop = 0; }

	// ---------- routes ----------
	MX.tourRoute = function (slug, section, lang, view) {
		MX.say('');
		view.textContent = '';
		if (slug === 'new') return drawNew(view);
		MX.say('Loading…');
		MX.loadTrips().then(function (file) {
			if (MX.flash) { MX.say(MX.flash.text, MX.flash.bad); MX.flash = null; } else MX.say('');
			var trip = find(file.data.trips, slug);
			if (!trip) {
				MX.setHead('#/tours', 'My Tours', 'Tour not found', 'This tour is not in your list any more.');
				return;
			}
			if (!section) drawHub(view, trip);
			else drawSection(view, trip, section, lang === 'en' ? 'en' : 'fr');
		}).catch(function (err) { MX.say('We could not load this tour. ' + MX.reason(err), true); });
	};

	// ---------- one tour's home page ----------
	function sections(trip) {
		var fr = trip.fr || {}, en = trip.en || {};
		var trek = trekWord(trip);
		var list = [
			{ id: 'price', icon: 'tag', title: 'Price', text: MX.priceText(trip) || 'Price on request' },
			{ id: 'details', icon: 'pencil', title: 'Name and details', text: 'Name, length, level and the overview text' },
			{ id: 'photos', icon: 'photo', title: 'Photos', text: (trip.uploaded_image ? 'Your photo' : 'Main photo') + ' and ' + (trip.gallery || []).length + ' more' },
			{ id: 'days', icon: 'calendar', title: trek ? 'Day by day' : 'Timetable', text: trek ? (fr.days || []).length + ' days' : (fr.program || []).length + ' steps' }
		];
		if (trek) list.push({ id: 'route', icon: 'route', title: 'Route map', text: (fr.route || []).length + ' stops' });
		list.push(
			{ id: 'lists', icon: 'check', title: 'Highlights, included, not included', text: (fr.highlights || []).length + ' highlights · ' + (fr.included || []).length + ' included · ' + (fr.excluded || []).length + ' not included' },
			{ id: 'note', icon: 'info', title: 'Extra information', text: fr.note ? String(fr.note).slice(0, 48) + (fr.note.length > 48 ? '…' : '') : 'Nothing written yet' },
			{ id: 'google', icon: 'search', title: 'How it looks on Google', text: 'Title, short text and web address' }
		);
		var translated = !!(en.title && en.intro && en.intro !== fr.intro);
		list.push({ id: 'details/en', icon: 'text', title: 'English', text: translated ? 'Published' : 'Not translated yet' });
		return list;
	}

	function drawHub(view, trip) {
		var slug = trip.slug, shown = MX.isVisible(trip);
		MX.setHead('#/tours', 'My Tours', (trip.fr && trip.fr.name) || slug, 'What would you like to change? Tap one of the buttons.');

		var status = el('section', 'mx-status ' + (shown ? 'mx-status-on' : 'mx-status-off'));
		var words = el('div');
		var h = el('h2'); h.textContent = shown ? 'Visitors can see this tour' : 'Visitors cannot see this tour';
		var p = el('p'); p.textContent = shown ? 'It is on your website now.' : 'It is hidden. Nothing has been deleted.';
		words.appendChild(h); words.appendChild(p);
		var acts = el('div', 'mx-tour-actions');
		var toggle = el('button', 'mx-btn', svg(shown ? 'x' : 'eye') + '<span>' + (shown ? 'Hide from website' : 'Show on website') + '</span>');
		toggle.type = 'button';
		toggle.addEventListener('click', function () {
			if (busy) return;
			busy = true; MX.say('Saving…');
			saveMutate(slug, function (t) { if (shown) t.visible = false; else delete t.visible; },
				'content: ' + (shown ? 'hide' : 'show') + ' tour ' + slug).then(function (file) {
				busy = false; view.textContent = ''; drawHub(view, find(file.data.trips, slug));
				MX.say(shown ? 'Saved. The tour will be hidden from the website in a few minutes.' : 'Saved. The tour will be on the website in a few minutes.');
			}).catch(function (err) { busy = false; bad(err); });
		});
		var preview = el(shown ? 'a' : 'span', 'mx-btn', svg('eye') + '<span>Preview</span>');
		if (shown) { preview.href = publicUrl(trip); preview.target = '_blank'; preview.rel = 'noopener noreferrer'; }
		else { preview.className += ' mx-btn-off'; preview.setAttribute('aria-disabled', 'true'); }
		acts.appendChild(toggle); acts.appendChild(preview);
		status.appendChild(words); status.appendChild(acts);
		view.appendChild(status);

		var grid = el('div', 'mx-secgrid');
		sections(trip).forEach(function (s) {
			var a = el('a', 'mx-sec');
			a.href = '#/tours/' + slug + '/' + s.id;
			var ic = el('span', 'mx-sec-icon', svg(s.icon));
			var box = el('span', 'mx-sec-text');
			var t = el('strong'); t.textContent = s.title;
			var d = el('span'); d.textContent = s.text;
			box.appendChild(t); box.appendChild(d);
			a.appendChild(ic); a.appendChild(box);
			grid.appendChild(a);
		});
		view.appendChild(grid);

		view.appendChild(el('hr', 'mx-divider'));
		var row = el('div', 'mx-tour-actions');
		var copy = el('button', 'mx-btn', svg('plus') + '<span>Make a copy of this tour</span>');
		copy.type = 'button';
		copy.addEventListener('click', function () { copyTour(trip); });
		var del = el('button', 'mx-btn mx-btn-danger', svg('trash') + '<span>Delete this tour</span>');
		del.type = 'button';
		del.addEventListener('click', function () { deleteTour(trip); });
		row.appendChild(copy); row.appendChild(del);
		view.appendChild(row);
	}

	function uniqueSlug(base, trips) {
		var s = base, n = 2;
		while (find(trips, s)) s = base + '-' + n++;
		return s;
	}

	function copyTour(trip) {
		if (busy) return;
		busy = true; MX.say('Making a copy…');
		var made = '';
		MX.loadTrips().then(function (file) {
			var src = find(file.data.trips, trip.slug);
			if (!src) throw { status: 404 };
			var c = clone(src);
			c.slug = made = uniqueSlug(trip.slug + '-copy', file.data.trips);
			c.visible = false;
			c.fr.name = c.fr.name + ' (copy)';
			c.en.name = c.en.name + ' (copy)';
			file.data.trips.splice(file.data.trips.indexOf(src) + 1, 0, c);
			return MX.saveTrips(file, 'content: copy tour ' + trip.slug).then(function (res) {
				MX.setState({ sha: res.content.sha, data: file.data });
			});
		}).then(function () {
			busy = false;
			MX.flash = { text: 'Saved. Your copy is hidden. Change it, then press "Show on website".' };
			window.location.hash = '#/tours/' + made;
		}).catch(function (err) { busy = false; bad(err); });
	}

	function deleteTour(trip) {
		if (busy) return;
		busy = true; MX.say('Checking…');
		Promise.all([MX.loadFile('data/articles.json'), MX.loadFile('data/testimonials.json')]).then(function (r) {
			var used = r[0].data.articles.filter(function (a) { return a.trip === trip.slug; }).length
				+ r[1].data.reviews.filter(function (x) { return x.trip === trip.slug; }).length;
			if (used) {
				busy = false;
				MX.say('This tour cannot be deleted because ' + used + ' blog article' + (used > 1 ? 's or reviews use' : ' or review uses') + ' it. Hide it instead.', true);
				return null;
			}
			if (!window.confirm('Delete "' + ((trip.fr && trip.fr.name) || trip.slug) + '"?\n\nIt will disappear from the website. This cannot be undone here.')) { busy = false; MX.say(''); return null; }
			MX.say('Deleting…');
			return saveMutate(trip.slug, function (t, list) { list.splice(list.indexOf(t), 1); }, 'content: delete tour ' + trip.slug).then(function () {
				busy = false;
				MX.flash = { text: 'Deleted. It will be gone from the website in a few minutes.' };
				window.location.hash = '#/tours';
			});
		}).catch(function (err) { busy = false; bad(err); });
	}

	// ---------- add a new tour ----------
	function drawNew(view) {
		MX.setHead('#/tours', 'My Tours', 'Add a new tour', 'Choose the kind of tour and give it a name. It stays hidden until you press "Show on website".');
		var type = 'trek';
		var card = el('section', 'mx-card-form');
		var kinds = el('div', 'mx-tabs');
		var bTrek = el('button', 'mx-tab mx-tab-on', 'Trek (several days)');
		var bDay = el('button', 'mx-tab', 'Day trip (one day)');
		[bTrek, bDay].forEach(function (b) { b.type = 'button'; });
		function pick(t) { type = t; bTrek.className = 'mx-tab' + (t === 'trek' ? ' mx-tab-on' : ''); bDay.className = 'mx-tab' + (t === 'excursion' ? ' mx-tab-on' : ''); }
		bTrek.addEventListener('click', function () { pick('trek'); });
		bDay.addEventListener('click', function () { pick('excursion'); });
		kinds.appendChild(bTrek); kinds.appendChild(bDay);
		var f = makeField({ label: 'Name of the tour', type: 'text', hint: 'For example: Toubkal in 3 days.' }, '');
		var go = el('button', 'mx-primary', svg('plus') + '<span>Create the tour</span>');
		go.type = 'button';
		go.addEventListener('click', function () {
			var name = f.get().trim();
			if (!name) { MX.say('Please write a name for the tour.', true); return; }
			if (busy) return;
			busy = true; MX.say('Creating…');
			var made = '';
			MX.loadTrips().then(function (file) {
				var slug = slugify(name);
				if (!slug) throw { status: -1 };
				var template = null;
				file.data.trips.forEach(function (t) { if (t.type === type && (!template || (MX.isVisible(t) && !MX.isVisible(template)))) template = t; });
				if (!template) throw { status: -2 };
				var c = clone(template);
				c.slug = made = uniqueSlug(slug, file.data.trips);
				c.visible = false;
				delete c.price;
				['fr', 'en'].forEach(function (l) { c[l].name = name; c[l].title = name; });
				file.data.trips.push(c);
				return MX.saveTrips(file, 'content: add tour ' + made).then(function (res) { MX.setState({ sha: res.content.sha, data: file.data }); });
			}).then(function () {
				busy = false;
				MX.flash = { text: 'Saved. Your new tour is hidden. It has sample text: change each section, then press "Show on website".' };
				window.location.hash = '#/tours/' + made;
			}).catch(function (err) {
				busy = false;
				if (err && err.status === -1) MX.say('Please use letters or numbers in the name.', true);
				else if (err && err.status === -2) MX.say('We need one tour of this kind to start from. Please tell the person who manages the website.', true);
				else bad(err);
			});
		});
		card.appendChild(kinds);
		card.appendChild(f.node);
		card.appendChild(go);
		view.appendChild(card);
	}

	// ---------- form pieces ----------
	function makeField(spec, value) {
		var wrap = el('label', 'mx-field');
		var lab = el('span', 'mx-label'); lab.textContent = spec.label;
		wrap.appendChild(lab);
		var input;
		if (spec.type === 'textarea' || spec.type === 'lines') {
			input = el('textarea'); input.rows = spec.type === 'lines' ? 6 : 5;
			input.value = spec.type === 'lines' ? (value || []).join('\n') : (value || '');
		} else if (spec.type === 'select') {
			input = el('select');
			spec.options.forEach(function (o) { var op = el('option'); op.value = o[0]; op.textContent = o[1]; input.appendChild(op); });
			input.value = value || spec.options[0][0];
		} else {
			input = el('input'); input.type = spec.type === 'number' ? 'number' : 'text';
			if (spec.type === 'number') { input.min = '1'; input.step = '1'; input.inputMode = 'numeric'; }
			input.value = value == null ? '' : value;
		}
		wrap.appendChild(input);
		if (spec.hint) { var hint = el('span', 'mx-hint'); hint.textContent = spec.hint; wrap.appendChild(hint); }
		return {
			node: wrap,
			get: function () {
				if (spec.type === 'lines') return input.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
				return input.value;
			}
		};
	}

	// A simple page: a list of fields kept either in the tour itself or in its French / English text.
	function simpleEditor(specs, scope, lang, trip, intro) {
		var fields = [];
		return {
			intro: intro,
			lang: scope === 'lang',
			render: function (box) {
				specs.forEach(function (s) {
					var src = scope === 'lang' ? (trip[lang] || {}) : trip;
					var f = makeField(s, src[s.key]);
					fields.push({ spec: s, f: f });
					box.appendChild(f.node);
				});
			},
			collect: function () {
				var out = {};
				for (var i = 0; i < fields.length; i++) {
					var s = fields[i].spec, v = fields[i].f.get();
					if (s.type === 'lines') { if (!v.length) return { error: 'Please write at least one line in "' + s.label + '".' }; }
					else if (s.required && !String(v).trim()) return { error: 'Please fill in "' + s.label + '".' };
					out[s.key] = typeof v === 'string' ? v.trim() : v;
				}
				return { apply: function (t) { Object.keys(out).forEach(function (k) { if (scope === 'lang') t[lang][k] = out[k]; else t[k] = out[k]; }); } };
			}
		};
	}

	function priceEditor(trip) {
		var p = trip.price || {};
		var amount = makeField({ label: 'Price per person', type: 'number', hint: 'For example 450. Leave empty to show "Price on request".' }, p.amount);
		var cur = makeField({ label: 'Money', type: 'select', options: [['USD', 'US dollars (US$)'], ['EUR', 'Euros (€)'], ['MAD', 'Moroccan dirhams (MAD)']] }, p.currency || 'USD');
		return {
			intro: 'The price shown on the tour page and the tour card.',
			lang: false,
			render: function (box) { box.appendChild(amount.node); box.appendChild(cur.node); },
			collect: function () {
				var raw = String(amount.get()).trim();
				if (!raw) return { apply: function (t) { delete t.price; } };
				var n = Number(raw);
				if (!isFinite(n) || n <= 0 || Math.floor(n) !== n) return { error: 'Please write the price as a whole number, for example 450.' };
				var c = cur.get();
				return { apply: function (t) { t.price = { amount: n, currency: c }; } };
			}
		};
	}

	// ---------- photos ----------
	function photosEditor(trip) {
		var main = trip.image || '';
		var gallery = (trip.gallery || []).slice();
		var uploaded = trip.uploaded_image || '';
		var images = {};
		function tile(key, picked, onTap, label) {
			var b = el('button', 'mx-photo' + (picked ? ' mx-photo-on' : ''));
			b.type = 'button';
			var im = el('img'); im.alt = ''; im.loading = 'lazy';
			var w = images[key] && images[key].widths ? Math.min.apply(null, images[key].widths) : 480;
			im.src = '../assets/images/' + key + '-' + w + '.webp';
			b.appendChild(im);
			var mark = el('span', 'mx-photo-mark', picked ? svg('check') : '');
			b.appendChild(mark);
			var cap = (images[key] && images[key].alt && images[key].alt.en) || key;
			b.title = cap; b.setAttribute('aria-label', label + ': ' + cap);
			b.setAttribute('aria-pressed', picked ? 'true' : 'false');
			b.addEventListener('click', onTap);
			return b;
		}
		return {
			intro: 'Choose the main photo (shown on the card and at the top of the page) and the photos at the bottom of the page. To add your own photos, use the Photos page (coming soon).',
			lang: false,
			render: function (box) {
				box.appendChild(el('p', 'mx-note', 'Loading photos…'));
				MX.loadFile('data/images.json').then(function (f) {
					images = f.data;
					box.textContent = '';
					var keys = Object.keys(images);
					function draw() {
						box.textContent = '';
						if (uploaded) {
							var u = el('div', 'mx-note');
							u.textContent = 'A photo you uploaded is used as the main photo. ';
							var rm = el('button', 'mx-btn', '<span>Use a library photo instead</span>');
							rm.type = 'button';
							rm.addEventListener('click', function () { uploaded = ''; box.dispatchEvent(new Event('input', { bubbles: true })); draw(); });
							u.appendChild(rm);
							box.appendChild(u);
						}
						var h1 = el('h3', 'mx-h3'); h1.textContent = 'Main photo';
						var g1 = el('div', 'mx-photos');
						keys.forEach(function (k) { g1.appendChild(tile(k, !uploaded && k === main, function () { main = k; uploaded = ''; box.dispatchEvent(new Event('input', { bubbles: true })); draw(); }, 'Main photo')); });
						var h2 = el('h3', 'mx-h3'); h2.textContent = 'Photos at the bottom of the page (' + gallery.length + ')';
						var g2 = el('div', 'mx-photos');
						keys.forEach(function (k) {
							g2.appendChild(tile(k, gallery.indexOf(k) >= 0, function () {
								var i = gallery.indexOf(k);
								if (i >= 0) gallery.splice(i, 1); else gallery.push(k);
								box.dispatchEvent(new Event('input', { bubbles: true })); draw();
							}, 'Gallery photo'));
						});
						[h1, g1, h2, g2].forEach(function (n) { box.appendChild(n); });
					}
					draw();
				}).catch(function (err) { box.textContent = ''; box.appendChild(el('p', 'mx-note', 'We could not load the photos. ' + MX.reason(err))); });
			},
			collect: function () {
				if (!Object.keys(images).length) return { error: 'The photos are not loaded yet. Please wait a moment.' };
				if (!uploaded && !main) return { error: 'Please choose a main photo.' };
				return { apply: function (t) { if (!uploaded) { delete t.uploaded_image; t.image = main; } t.gallery = gallery.slice(); } };
			}
		};
	}

	// ---------- day by day (treks) and timetable (day trips) ----------
	function listEditor(trip, lang, kind) {
		var trek = kind === 'days';
		var data = { fr: clone((trip.fr || {})[kind] || []), en: clone((trip.en || {})[kind] || []) };
		var KEYS = [['title', 'Title of the day', 'text'], ['text', 'What happens this day', 'textarea'], ['walk', 'Walking time', 'text'], ['altitude', 'Altitude', 'text'], ['overnight', 'Where you sleep', 'text'], ['meals', 'Meals', 'text']];
		function blank() { return trek ? { title: '', text: '', walk: '', altitude: '', overnight: '', meals: '' } : ['', '']; }
		return {
			intro: trek ? 'One card for each day. Adding or removing a day changes it in French and English.' : 'For each step, write the time and what happens. Adding or removing a step changes it in French and English.',
			lang: true,
			render: function (box) {
				var cur = data[lang];
				function draw() {
					box.textContent = '';
					cur.forEach(function (item, i) {
						var card = el('section', 'mx-card-form mx-day');
						var hd = el('div', 'mx-day-head');
						var t = el('strong'); t.textContent = (trek ? 'Day ' : 'Step ') + (i + 1);
						hd.appendChild(t);
						var tools = el('div', 'mx-tour-actions');
						function tool(icon, label, off, fn) {
							var b = el('button', 'mx-btn' + (off ? ' mx-btn-off' : ''), svg(icon) + '<span>' + label + '</span>');
							b.type = 'button'; b.disabled = !!off;
							b.addEventListener('click', fn);
							tools.appendChild(b);
						}
						function swap(j) { ['fr', 'en'].forEach(function (l) { var a = data[l]; if (a[i] && a[j]) { var x = a[i]; a[i] = a[j]; a[j] = x; } }); box.dispatchEvent(new Event('input', { bubbles: true })); draw(); }
						tool('up', 'Up', i === 0, function () { swap(i - 1); });
						tool('down', 'Down', i === cur.length - 1, function () { swap(i + 1); });
						tool('trash', 'Remove', false, function () {
							if (!window.confirm('Remove ' + (trek ? 'day ' : 'step ') + (i + 1) + '?')) return;
							['fr', 'en'].forEach(function (l) { data[l].splice(i, 1); });
							box.dispatchEvent(new Event('input', { bubbles: true })); draw();
						});
						hd.appendChild(tools);
						card.appendChild(hd);
						if (trek) {
							KEYS.forEach(function (k) {
								var f = makeField({ label: k[1], type: k[2] }, item[k[0]]);
								f.node.querySelector('input,textarea').addEventListener('input', function (e) { item[k[0]] = e.target.value; });
								card.appendChild(f.node);
							});
						} else {
							[['Time', 0], ['What happens', 1]].forEach(function (k) {
								var f = makeField({ label: k[0], type: 'text' }, item[k[1]]);
								f.node.querySelector('input').addEventListener('input', function (e) { item[k[1]] = e.target.value; });
								card.appendChild(f.node);
							});
						}
						box.appendChild(card);
					});
					var add = el('button', 'mx-primary', svg('plus') + '<span>' + (trek ? 'Add a day' : 'Add a step') + '</span>');
					add.type = 'button';
					add.addEventListener('click', function () {
						['fr', 'en'].forEach(function (l) { data[l].push(blank()); });
						box.dispatchEvent(new Event('input', { bubbles: true })); draw();
					});
					box.appendChild(add);
				}
				draw();
			},
			collect: function () {
				var cur = data[lang];
				if (!cur.length) return { error: trek ? 'A trek needs at least one day.' : 'A day trip needs at least one step.' };
				for (var i = 0; i < cur.length; i++) {
					if (trek ? (!cur[i].title.trim() || !cur[i].text.trim()) : (!cur[i][0].trim() || !cur[i][1].trim()))
						return { error: (trek ? 'Day ' : 'Step ') + (i + 1) + ' is not finished. Please fill it in.' };
				}
				return {
					apply: function (t) {
						var other = lang === 'fr' ? 'en' : 'fr';
						// Anything still empty in the other language starts as a copy, so no page is left blank.
						data[other].forEach(function (item, i) {
							var from = data[lang][i];
							if (trek) Object.keys(item).forEach(function (k) { if (!String(item[k]).trim() && String(from[k]).trim()) item[k] = from[k]; });
							else item.forEach(function (v, n) { if (!String(v).trim()) item[n] = from[n]; });
						});
						t.fr[kind] = data.fr; t.en[kind] = data.en;
						if (trek) t.days = data.fr.length;
					}
				};
			}
		};
	}

	function editorFor(section, trip, lang) {
		var trek = trekWord(trip);
		switch (section) {
			case 'price': return { title: 'Price', ed: priceEditor(trip) };
			case 'details': {
				var specs = [
					{ key: 'name', label: 'Name of the tour', type: 'text', required: true, hint: 'Shown on the tour card.' },
					{ key: 'intro', label: 'Overview text', type: 'textarea', required: true, hint: 'A few lines at the top of the tour page.' },
					{ key: 'level', label: 'Difficulty', type: 'text', required: true, hint: 'For example: Moderate.' }
				];
				if (trek) specs.push({ key: 'key_fact', label: 'Key fact', type: 'text', required: true, hint: 'For example: 4 167 m (Toubkal).' });
				else specs.push({ key: 'duration', label: 'How long', type: 'text', required: true, hint: 'For example: 10 hours.' }, { key: 'distance', label: 'Distance and driving time', type: 'text', required: true });
				return { title: 'Name and details', ed: simpleEditor(specs, 'lang', lang, trip, 'The name, the difficulty and the overview text of this tour.') };
			}
			case 'photos': return { title: 'Photos', ed: photosEditor(trip) };
			case 'days': return { title: trek ? 'Day by day' : 'Timetable', ed: listEditor(trip, lang, trek ? 'days' : 'program') };
			case 'route':
				if (!trek) return null;
				return { title: 'Route map', ed: simpleEditor([{ key: 'route', label: 'Places on the route, in order', type: 'lines', hint: 'One place per line.' }], 'lang', lang, trip, 'The main places you pass, in order.') };
			case 'lists': return { title: 'Highlights, included, not included', ed: simpleEditor([
				{ key: 'highlights', label: 'Highlights', type: 'lines', hint: 'The best things about this tour. One per line.' },
				{ key: 'included', label: 'What is included', type: 'lines', hint: 'One per line, for example: Mountain guide.' },
				{ key: 'excluded', label: 'What is not included', type: 'lines', hint: 'One per line, for example: Travel insurance.' }
			], 'lang', lang, trip, 'The short lists on the tour page.') };
			case 'note': return { title: 'Extra information', ed: simpleEditor([{ key: 'note', label: 'Good to know', type: 'textarea', hint: 'Extra advice for travellers.' }], 'lang', lang, trip, 'Notes shown at the bottom of the tour page.') };
			case 'google': {
				var ed = simpleEditor([
					{ key: 'title', label: 'Title', type: 'text', required: true, hint: 'Shown on Google. It is also the big title at the top of the tour page.' },
					{ key: 'description', label: 'Short text', type: 'textarea', required: true, hint: 'One or two sentences shown on Google and on the tour card.' }
				], 'lang', lang, trip, 'What people see on Google when they find this tour.');
				var inner = ed.render;
				ed.render = function (box) {
					inner(box);
					var a = el('p', 'mx-note');
					a.textContent = 'Web address: ' + MX.SITE_URL.replace('https://', '') + '/' + MX.SECTION[trip.type] + '/' + trip.slug + '.html (it cannot be changed here, so existing links keep working).';
					box.appendChild(a);
				};
				return { title: 'How it looks on Google', ed: ed };
			}
			default: return null;
		}
	}

	// ---------- an edit page ----------
	function drawSection(view, trip, section, lang) {
		var slug = trip.slug;
		var found = editorFor(section, trip, lang);
		if (!found) {
			MX.setHead('#/tours/' + slug, 'Back', 'Page not found', 'This page does not exist for this tour.');
			return;
		}
		var ed = found.ed;
		MX.setHead('#/tours/' + slug, (trip.fr && trip.fr.name) || 'Back', found.title, ed.intro);

		var dirty = false;
		if (ed.lang) {
			var tabs = el('div', 'mx-tabs');
			['fr', 'en'].forEach(function (l) {
				var a = el('a', 'mx-tab' + (l === lang ? ' mx-tab-on' : ''));
				a.textContent = langName(l);
				a.href = '#/tours/' + slug + '/' + section + (l === 'fr' ? '' : '/en');
				a.addEventListener('click', function (e) {
					if (dirty && !window.confirm('You have changes that are not saved. Leave without saving?')) e.preventDefault();
				});
				tabs.appendChild(a);
			});
			view.appendChild(tabs);
		}
		var box = el('div', 'mx-form');
		view.appendChild(box);
		ed.render(box);
		view.addEventListener('input', function () { dirty = true; });

		var bar = el('div', 'mx-savebar');
		var save = el('button', 'mx-primary', svg('check') + '<span>Save</span>');
		save.type = 'button';
		var preview = el(MX.isVisible(trip) ? 'a' : 'span', 'mx-btn', svg('eye') + '<span>Preview</span>');
		if (MX.isVisible(trip)) { preview.href = publicUrl(trip); preview.target = '_blank'; preview.rel = 'noopener noreferrer'; preview.title = 'Shows the version that is on the website now'; }
		else { preview.className += ' mx-btn-off'; preview.setAttribute('aria-disabled', 'true'); }
		bar.appendChild(save); bar.appendChild(preview);
		view.appendChild(bar);

		save.addEventListener('click', function () {
			if (busy) return;
			var r = ed.collect();
			if (r.error) { MX.say(r.error, true); top(); return; }
			busy = true; MX.say('Saving…');
			saveMutate(slug, r.apply, 'content: change ' + section + ' of ' + slug).then(function () {
				busy = false; dirty = false;
				MX.say(SAVED);
			}).catch(function (err) { busy = false; bad(err); top(); });
		});
	}
})();
