/* Website Text page, My Contact Info and Reviews. Every save writes a data file through GitHub (this publishes the site). */
(function () {
	'use strict';
	var MX = window.MX;
	if (!MX || !MX.forms) return;
	var el = MX.el, svg = MX.svg, F = MX.forms;
	var SAVED = 'Saved. It will be on the website in a few minutes.';
	var JSON_HEADER = { 'Content-Type': 'application/json' };
	var busy = false;

	Object.assign(MX.ICONS, {
		mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>'
	});

	function bad(err) { MX.say('Not saved. ' + MX.reason(err), true); }
	function jsonText(o) { return JSON.stringify(o, null, 2) + '\n'; }
	function top() { var m = document.querySelector('.mx-tours'); if (m) m.scrollTop = 0; }

	function putFile(path, data, sha, message) {
		var body = { message: message, content: MX.encode(jsonText(data)), branch: 'main', sha: sha };
		return MX.api('/contents/' + path, { method: 'PUT', body: JSON.stringify(body), headers: JSON_HEADER });
	}

	// Read the freshest copy of a data file, change it, save it. Returns { sha, data }.
	function mutateFile(path, mutate, message) {
		return MX.loadFile(path).then(function (f) {
			if (mutate(f.data) === false) return f;
			return putFile(path, f.data, f.sha, message).then(function (res) { return { sha: res.content.sha, data: f.data }; });
		});
	}
	MX.putFile = putFile;
	MX.mutateFile = mutateFile;
	MX.jsonText = jsonText;

	// ---------- a simple edit page: back button, title, language tabs, form, Save and Preview ----------
	// opts: { back: [href, label], title, intro, lang, langHref(l), previewUrl, editor, save(apply) -> promise }
	MX.frame = function (view, opts) {
		MX.setHead(opts.back[0], opts.back[1], opts.title, opts.intro);
		var dirty = false;
		if (opts.lang) {
			var tabs = el('div', 'mx-tabs');
			['fr', 'en'].forEach(function (l) {
				var a = el('a', 'mx-tab' + (l === opts.lang ? ' mx-tab-on' : ''));
				a.textContent = l === 'en' ? 'English' : 'French';
				a.href = opts.langHref(l);
				a.addEventListener('click', function (e) { if (dirty && !window.confirm('You have changes that are not saved. Leave without saving?')) e.preventDefault(); });
				tabs.appendChild(a);
			});
			view.appendChild(tabs);
		}
		var box = el('div', 'mx-form');
		view.appendChild(box);
		opts.editor.render(box);
		view.addEventListener('input', function () { dirty = true; });
		var bar = el('div', 'mx-savebar');
		var save = el('button', 'mx-primary', svg('check') + '<span>Save</span>');
		save.type = 'button';
		bar.appendChild(save);
		if (opts.previewUrl !== undefined) {
			var pv = el(opts.previewUrl ? 'a' : 'span', 'mx-btn', svg('eye') + '<span>Preview</span>');
			if (opts.previewUrl) { pv.href = opts.previewUrl; pv.target = '_blank'; pv.rel = 'noopener noreferrer'; pv.title = 'Shows the version that is on the website now'; }
			else { pv.className += ' mx-btn-off'; pv.setAttribute('aria-disabled', 'true'); }
			bar.appendChild(pv);
		}
		view.appendChild(bar);
		save.addEventListener('click', function () {
			if (busy) return;
			var r = opts.editor.collect();
			if (r.error) { MX.say(r.error, true); top(); return; }
			busy = true; MX.say('Saving…');
			opts.save(r.apply).then(function (res) { busy = false; dirty = false; MX.say(res && res.note ? res.note : SAVED); })
				.catch(function (err) { busy = false; bad(err); top(); });
		});
	};

	// A form made of fields. specs: { key, label, type, hint, required, pattern, patternMessage, options }.
	MX.fieldsEditor = function (specs, values, intro) {
		var fields = [];
		return {
			intro: intro,
			render: function (box) {
				specs.forEach(function (s) {
					var f = F.makeField(s, values[s.key]);
					fields.push({ s: s, f: f });
					box.appendChild(f.node);
				});
			},
			collect: function () {
				var out = {};
				for (var i = 0; i < fields.length; i++) {
					var s = fields[i].s, v = fields[i].f.get();
					if (typeof v === 'string') v = v.trim();
					if (s.required && !v) return { error: 'Please fill in "' + s.label + '".' };
					if (v && s.pattern && !s.pattern.test(v)) return { error: s.patternMessage || ('Please check "' + s.label + '".') };
					out[s.key] = v;
				}
				return { values: out, apply: function (target) { Object.keys(out).forEach(function (k) { target[k] = out[k]; }); } };
			}
		};
	};

	function card(href, icon, title, text, soon) {
		var a = el(soon ? 'div' : 'a', 'mx-sec' + (soon ? ' mx-card-soon' : ''));
		if (!soon) a.href = href; else a.setAttribute('aria-disabled', 'true');
		a.appendChild(el('span', 'mx-sec-icon', svg(icon)));
		var box = el('span', 'mx-sec-text');
		var t = el('strong'); t.textContent = title;
		var d = el('span'); d.textContent = text;
		box.appendChild(t); box.appendChild(d);
		if (soon) box.appendChild(el('span', 'mx-soon', 'Coming soon'));
		a.appendChild(box);
		return a;
	}
	function heading(text) { var h = el('h2', 'mx-h2'); h.textContent = text; return h; }

	// ---------- Website Text ----------
	MX.routes.text = function (parts, view) {
		if (parts[0] === 'about' && MX.routes.aboutText) return MX.routes.aboutText(parts.slice(1), view);
		MX.say('');
		view.textContent = '';
		MX.setHead(MX.HOME, 'Home', 'Website Text', 'Choose the page you want to change.');
		var note = el('p', 'mx-sub-text');
		note.appendChild(document.createTextNode('Tours have their own place: '));
		var link = el('a'); link.href = '#/tours'; link.textContent = 'My Tours'; note.appendChild(link);
		note.appendChild(document.createTextNode('.'));
		view.appendChild(note);
		var blog = card('#/blog', 'blog', 'Blog articles', 'Write a new article or change one', false);
		blog.className += ' mx-sec-wide';
		view.appendChild(blog);
		MX.loadFile('data/articles.json').then(function (f) {
			var n = f.data.articles.length;
			blog.querySelector('.mx-sec-text span').textContent = n + ' article' + (n === 1 ? '' : 's') + ' — write a new one or change one';
		}, function () { });
		view.appendChild(heading('Reviews and contact'));
		var g1 = el('div', 'mx-secgrid');
		g1.appendChild(card('#/reviews', 'star', 'Reviews', 'What your travellers say about you', false));
		g1.appendChild(card('#/contact', 'phone', 'Contact information', 'Phone, WhatsApp, email and social pages', false));
		view.appendChild(g1);
		view.appendChild(heading('Main pages'));
		var g2 = el('div', 'mx-secgrid');
		[['About us', '/about.html', true], ['Home page', '/'], ['Plan your trip', '/plan-your-trip.html'], ['Contact page', '/contact.html'], ['Privacy policy', '/privacy.html'], ['Terms and conditions', '/terms-and-conditions.html']].forEach(function (p) {
			g2.appendChild(p[2] ? card('#/text/about', 'text', p[0], p[1], false) : card('', 'text', p[0], p[1], true));
		});
		view.appendChild(g2);
	};

	// ---------- My Contact Info ----------
	var HTTPS = /^https:\/\//;
	var EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
	MX.routes.contact = function (parts, view) {
		MX.say('Loading…');
		view.textContent = '';
		MX.loadFile('data/site.json').then(function (f) {
			MX.say('');
			var specs = [
				{ key: 'name', label: 'Business name', type: 'text', required: true, hint: 'The name shown on your website.' },
				{ key: 'url', label: 'Website address', type: 'text', required: true, pattern: HTTPS, patternMessage: 'The website address must start with https://', hint: 'Starts with https://' },
				{ key: 'email', label: 'Email', type: 'text', required: true, pattern: EMAIL, patternMessage: 'Please write a valid email address.', hint: 'Where customers write to you.' },
				{ key: 'whatsapp', label: 'WhatsApp number', type: 'text', required: true, pattern: /^\+[1-9][0-9]{7,14}$/, patternMessage: 'The WhatsApp number must start with + and the country code, with no spaces, for example +212700000000.', hint: 'Start with + and the country code, no spaces, for example +212700000000.' },
				{ key: 'phone', label: 'Phone number (as shown)', type: 'text', required: true, hint: 'Written the way you want customers to see it.' },
				{ key: 'legal_email', label: 'Email for the legal pages', type: 'text', required: true, pattern: EMAIL, patternMessage: 'Please write a valid email address for the legal pages.', hint: 'Shown on the terms and privacy pages.' },
				{ key: 'location', label: 'Town', type: 'text', hint: 'Kept for your records. It is not shown on the website pages.' },
				{ key: 'facebook', label: 'Facebook page', type: 'text', required: true, pattern: HTTPS, patternMessage: 'The Facebook link must start with https://', hint: 'Paste the full link of your page.' },
				{ key: 'instagram', label: 'Instagram page', type: 'text', required: true, pattern: HTTPS, patternMessage: 'The Instagram link must start with https://', hint: 'Paste the full link of your page.' },
				{ key: 'youtube', label: 'YouTube channel', type: 'text', required: true, pattern: HTTPS, patternMessage: 'The YouTube link must start with https://', hint: 'Paste the full link of your channel.' }
			];
			var ed = MX.fieldsEditor(specs, f.data, 'Your phone, WhatsApp, email and social pages.');
			MX.frame(view, {
				back: [MX.HOME, 'Home'], title: 'My Contact Info', intro: ed.intro, editor: ed,
				save: function (apply) { return mutateFile('data/site.json', function (d) { apply(d); }, 'content: change contact information'); }
			});
		}).catch(function (err) { MX.say('We could not load your contact information. ' + MX.reason(err), true); });
	};

	// ---------- Reviews ----------
	var tripsCache = [];
	function tripName(slug) {
		for (var i = 0; i < tripsCache.length; i++) if (tripsCache[i].slug === slug) return (tripsCache[i].fr && tripsCache[i].fr.name) || slug;
		return slug;
	}

	MX.routes.reviews = function (parts, view) {
		MX.say('');
		view.textContent = '';
		if (parts[0]) return drawReview(view, parts[0]);
		MX.setHead(MX.HOME, 'Home', 'Reviews', 'What your travellers say about you. Tap Change to edit a review.');
		var add = el('a', 'mx-primary', svg('plus') + '<span>Add a review</span>');
		add.href = '#/reviews/new';
		var list = el('div', 'mx-tour-list');
		view.appendChild(add); view.appendChild(list);

		function draw(data) {
			list.textContent = '';
			var items = data.reviews;
			items.forEach(function (r, i) {
				var c = el('article', 'mx-tour');
				var av = el('div', 'mx-avatar'); av.textContent = (r.initials || r.name || '?').slice(0, 2).toUpperCase();
				var info = el('div', 'mx-tour-info');
				var h = el('h2', 'mx-tour-name'); h.textContent = r.name;
				var m = el('p', 'mx-tour-meta');
				m.textContent = tripName(r.trip) + (r.country && r.country.en ? '  ·  ' + r.country.en : '');
				var q = el('p', 'mx-quote'); var t = (r.fr && r.fr.text) || ''; q.textContent = t.length > 150 ? t.slice(0, 150) + '…' : t;
				var row = el('div', 'mx-tour-actions');
				var change = el('a', 'mx-btn mx-btn-main', svg('pencil') + '<span>Change</span>'); change.href = '#/reviews/' + i;
				function btn(icon, label, off, fn, cls) {
					var b = el('button', 'mx-btn' + (cls ? ' ' + cls : '') + (off ? ' mx-btn-off' : ''), svg(icon) + '<span>' + label + '</span>');
					b.type = 'button'; b.disabled = !!off; b.addEventListener('click', fn); return b;
				}
				row.appendChild(change);
				row.appendChild(btn('up', 'Up', i === 0, function () { move(i, -1); }));
				row.appendChild(btn('down', 'Down', i === items.length - 1, function () { move(i, 1); }));
				row.appendChild(btn('trash', 'Delete', false, function () { remove(i, r); }, 'mx-btn-danger'));
				[h, m, q, row].forEach(function (n) { info.appendChild(n); });
				c.appendChild(av); c.appendChild(info);
				list.appendChild(c);
			});
			if (!items.length) list.appendChild(el('p', 'mx-note', 'No reviews yet. Tap "Add a review".'));
		}
		function move(i, d) {
			if (busy) return; busy = true; MX.say('Saving…');
			mutateFile('data/testimonials.json', function (data) {
				var a = data.reviews, j = i + d; if (j < 0 || j >= a.length) return false;
				var x = a[i]; a[i] = a[j]; a[j] = x;
			}, 'content: change review order').then(function (f) { busy = false; draw(f.data); MX.say('Saved. The new order will be on the website in a few minutes.'); })
				.catch(function (err) { busy = false; bad(err); reload(); });
		}
		function remove(i, r) {
			if (busy) return;
			if (!window.confirm('Delete the review by ' + r.name + '?\n\nIt will disappear from the website. This cannot be undone here.')) return;
			busy = true; MX.say('Deleting…');
			mutateFile('data/testimonials.json', function (data) { data.reviews.splice(i, 1); }, 'content: delete review of ' + r.name)
				.then(function (f) { busy = false; draw(f.data); MX.say('Deleted. It will be gone from the website in a few minutes.'); })
				.catch(function (err) { busy = false; bad(err); reload(); });
		}
		function reload() { MX.loadFile('data/testimonials.json').then(function (f) { draw(f.data); }); }
		MX.say('Loading…');
		Promise.all([MX.loadFile('data/testimonials.json'), MX.loadTrips()]).then(function (r) { tripsCache = r[1].data.trips; if (MX.flash) { MX.say(MX.flash.text, MX.flash.bad); MX.flash = null; } else MX.say(''); draw(r[0].data); })
			.catch(function (err) { MX.say('We could not load the reviews. ' + MX.reason(err), true); });
	};

	function drawReview(view, id) {
		var isNew = id === 'new', index = Number(id);
		MX.say('Loading…');
		Promise.all([MX.loadFile('data/testimonials.json'), MX.loadTrips()]).then(function (r) {
			MX.say('');
			tripsCache = r[1].data.trips;
			var reviews = r[0].data.reviews;
			var cur = isNew ? { name: '', initials: '', trip: tripsCache[0] && tripsCache[0].slug, country: { fr: '', en: '' }, fr: {}, en: {} } : reviews[index];
			if (!cur) { MX.setHead('#/reviews', 'Reviews', 'Review not found', 'This review is not in your list any more.'); return; }
			var tripOptions = tripsCache.map(function (t) { return [t.slug, (t.fr && t.fr.name) || t.slug]; });
			var specs = [
				{ key: 'name', label: 'Traveller name', type: 'text', required: true },
				{ key: 'initials', label: 'Initials', type: 'text', hint: 'Two letters shown in the circle, for example SD. Leave empty to make them from the name.' },
				{ key: 'trip', label: 'Trip', type: 'select', options: tripOptions },
				{ key: 'country_fr', label: 'Country in French', type: 'text', hint: 'Optional. Shown under the name.' },
				{ key: 'country_en', label: 'Country in English', type: 'text', hint: 'Optional.' },
				{ key: 'fr_trip_label', label: 'French: trip name', type: 'text', required: true },
				{ key: 'fr_title', label: 'French: review title', type: 'text', required: true },
				{ key: 'fr_text', label: 'French: review', type: 'textarea', required: true, hint: 'Copy the traveller’s words exactly.' },
				{ key: 'en_trip_label', label: 'English: trip name', type: 'text', required: true },
				{ key: 'en_title', label: 'English: review title', type: 'text', required: true },
				{ key: 'en_text', label: 'English: review', type: 'textarea', required: true, hint: 'If you do not have an English version yet, copy the French one.' }
			];
			var values = {
				name: cur.name, initials: cur.initials, trip: cur.trip, country_fr: (cur.country || {}).fr, country_en: (cur.country || {}).en,
				fr_trip_label: cur.fr.trip_label, fr_title: cur.fr.title, fr_text: cur.fr.text, en_trip_label: cur.en.trip_label, en_title: cur.en.title, en_text: cur.en.text
			};
			var ed = MX.fieldsEditor(specs, values, isNew ? 'Write what the traveller said. It is added at the end of the list.' : 'Change what the traveller said.');
			MX.frame(view, {
				back: ['#/reviews', 'Reviews'], title: isNew ? 'Add a review' : cur.name, intro: ed.intro, editor: ed,
				save: function (apply) {
					var v = {}; apply(v);
					if ((v.country_fr && !v.country_en) || (!v.country_fr && v.country_en)) return Promise.reject({ status: -3 });
					return mutateFile('data/testimonials.json', function (data) {
						var item = isNew ? { name: '', initials: '', trip: '', fr: {}, en: {} } : data.reviews[index];
						if (!item) throw { status: 404 };
						item.name = v.name;
						item.initials = (v.initials || v.name.split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2)).toUpperCase();
						item.trip = v.trip;
						if (v.country_fr) item.country = { fr: v.country_fr, en: v.country_en }; else delete item.country;
						item.fr = { trip_label: v.fr_trip_label, title: v.fr_title, text: v.fr_text };
						item.en = { trip_label: v.en_trip_label, title: v.en_title, text: v.en_text };
						if (isNew) data.reviews.push(item);
					}, (isNew ? 'content: add review of ' : 'content: change review of ') + v.name).then(function () {
						if (isNew) { MX.flash = { text: 'Saved. The review will be on the website in a few minutes.' }; window.location.hash = '#/reviews'; }
					});
				}
			});
		}).catch(function (err) { MX.say('We could not load the review. ' + MX.reason(err), true); });
	}

	var oldReason = MX.reason;
	MX.reason = function (err) {
		if (err && err.status === -3) return 'Please write the country in both French and English, or leave both empty.';
		return oldReason(err);
	};
})();
