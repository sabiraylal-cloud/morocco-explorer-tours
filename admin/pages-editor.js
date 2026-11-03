/* Texts of the main website pages (Website Text > Main pages). First page: About us.
 * The words of the page are kept in data/ui.json (French and English); the page is built from them, so only the
 * words change. A field that is not touched is saved exactly as it was. */
(function () {
	'use strict';
	var MX = window.MX;
	if (!MX || !MX.frame || !MX.mutateFile) return;
	var el = MX.el, svg = MX.svg, F = MX.forms;
	var FILE = 'data/ui.json';

	// ---------- words <-> what the owner sees ----------
	// Big titles use <br> (new line) and <em> (italic) in the data. The owner sees a new line and *stars*.
	function titleToPlain(s) { return String(s).replace(/<br\s*\/?>/gi, '\n').replace(/<em>([\s\S]*?)<\/em>/g, '*$1*'); }
	function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
	function titleFromPlain(p) {
		return escapeHtml(p).replace(/\r?\n/g, '<br>').replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
	}
	// The big title of the home page: a new line and one word in the handwritten style (shown between stars).
	var SCRIPT_OPEN = '<span class="home-script">';
	function heroToPlain(s) { return String(s).replace(/<br\s*\/?>/gi, '\n').replace(/<span class="home-script">([\s\S]*?)<\/span>/g, '*$1*'); }
	function heroFromPlain(p) { return escapeHtml(p).replace(/\r?\n/g, '<br>').replace(/\*([^*\n]+)\*/g, SCRIPT_OPEN + '$1</span>'); }
	MX.aboutWords = { titleToPlain: titleToPlain, titleFromPlain: titleFromPlain, heroToPlain: heroToPlain, heroFromPlain: heroFromPlain, escapeHtml: escapeHtml };
	MX.pageKit = { escapeHtml: escapeHtml, buildField: function (spec, orig) { return buildField(spec, orig); } };

	// kind: text (one line), title (big title), area (several lines), paras (paragraphs), meta (Google / message: no markup),
	// list (items with columns).
	var ABOUT_SECTIONS = [
		{ id: 'top', title: 'Top of the page', icon: 'text', fields: [
			{ key: 'about_kicker', label: 'Small title above', kind: 'text' },
			{ key: 'about_title', label: 'Big title', kind: 'title' },
			{ key: 'about_lead', label: 'Introduction', kind: 'area' }
		], summary: function (u, l) { return flat(u.about_title[l]); } },
		{ id: 'who', title: 'Who we are', icon: 'text', fields: [
			{ key: 'about_who_kicker', label: 'Small title above', kind: 'text' },
			{ key: 'about_who_title', label: 'Title', kind: 'title' },
			{ key: 'about_who_text', label: 'Text', kind: 'paras' }
		], summary: function (u, l) { return count(u.about_who_text[l], 'paragraph'); } },
		{ id: 'why', title: 'Why we do it', icon: 'text', fields: [
			{ key: 'about_why_kicker', label: 'Small title above', kind: 'text' },
			{ key: 'about_why_title', label: 'Title', kind: 'title' },
			{ key: 'about_why_text', label: 'Text', kind: 'area' },
			{ key: 'about_places', label: 'Places', kind: 'list', cols: [['Place', 'text'], ['What we love there', 'area']], itemName: 'Place' }
		], summary: function (u, l) { return count(u.about_places[l], 'place'); } },
		{ id: 'walk', title: 'What we live together', icon: 'text', fields: [
			{ key: 'about_walk_kicker', label: 'Small title above', kind: 'text' },
			{ key: 'about_walk_title', label: 'Title', kind: 'title' },
			{ key: 'about_walk_text', label: 'Text', kind: 'paras' }
		], summary: function (u, l) { return count(u.about_walk_text[l], 'paragraph'); } },
		{ id: 'moments', title: 'Memorable moments', icon: 'text', fields: [
			{ key: 'about_moments_kicker', label: 'Small title above', kind: 'text' },
			{ key: 'about_moments_title', label: 'Title', kind: 'text' },
			{ key: 'about_moments_text', label: 'Short text', kind: 'area' },
			{ key: 'about_moments', label: 'Moments', kind: 'list', cols: [['Title', 'text'], ['Text', 'area']], itemName: 'Moment' }
		], summary: function (u, l) { return count(u.about_moments[l], 'moment'); } },
		{ id: 'values', title: 'Our values', icon: 'text', fields: [
			{ key: 'about_values_kicker', label: 'Small title above', kind: 'text' },
			{ key: 'about_values_title', label: 'Title', kind: 'text' },
			{ key: 'about_values', label: 'Values', kind: 'list', cols: [['Number and name', 'text'], ['Title', 'text'], ['Text', 'area']], itemName: 'Value' }
		], summary: function (u, l) { return count(u.about_values[l], 'value'); } },
		{ id: 'end', title: 'End of the page', icon: 'text', fields: [
			{ key: 'about_cta_kicker', label: 'Small title above', kind: 'text' },
			{ key: 'about_cta_title', label: 'Title', kind: 'title' },
			{ key: 'about_cta_text', label: 'Text', kind: 'area' },
			{ key: 'about_cta_plan', label: 'First button', kind: 'text' },
			{ key: 'about_cta_whatsapp', label: 'Second button (WhatsApp)', kind: 'text' },
			{ key: 'about_whatsapp_text', label: 'Message written in WhatsApp', kind: 'meta', hint: 'The first message the visitor sends you on WhatsApp.' }
		], summary: function (u, l) { return flat(u.about_cta_title[l]); } },
		{ id: 'google', title: 'How it looks on Google', icon: 'search', fields: [
			{ key: 'about_meta_title', label: 'Title on Google', kind: 'meta' },
			{ key: 'about_meta_description', label: 'Short text on Google', kind: 'meta', area: true, hint: 'One or two sentences.' }
		], summary: function (u, l) { return u.about_meta_title[l]; } }
	];


	// Contact page: the phone number, email address and social links come from "My Contact Info".
	var CONTACT_SECTIONS = [
		{ id: 'top', title: 'Top of the page', icon: 'text', fields: [
			{ key: 'contact_kicker', label: 'Small title above', kind: 'text' },
			{ key: 'contact_title', label: 'Big title', kind: 'title' },
			{ key: 'contact_lead', label: 'Introduction', kind: 'area' }
		], summary: function (u, l) { return flat(u.contact_title[l]); } },
		{ id: 'cards', title: 'The three contact cards', icon: 'text', fields: [
			{ key: 'email', label: 'Title of the email card', kind: 'text', hint: 'Also used on the Privacy policy and Terms and conditions pages.' },
			{ key: 'contact_email_text', label: 'Text under the email address', kind: 'area' },
			{ key: 'phone_whatsapp', label: 'Title of the phone card', kind: 'text' },
			{ key: 'contact_whatsapp', label: 'WhatsApp link', kind: 'text' },
			{ key: 'contact_follow', label: 'Title of the social media card', kind: 'text' }
		], summary: function (u, l) { return u.contact_email_text[l].slice(0, 56) + '\u2026'; } },
		{ id: 'google', title: 'How it looks on Google', icon: 'search', fields: [
			{ key: 'contact_meta_title', label: 'Title on Google', kind: 'meta' },
			{ key: 'contact_meta_description', label: 'Short text on Google', kind: 'meta', area: true, hint: 'One or two sentences.' }
		], summary: function (u, l) { return u.contact_meta_title[l]; } }
	];

	var SHARED_WORDS = ' Keep {privacy} and {terms} as they are: they become links.';
	var PLAN_SECTIONS = [
		{ id: 'top', title: 'Top of the page', icon: 'text', fields: [
			{ key: 'plan_kicker', label: 'Small title above', kind: 'text' },
			{ key: 'plan_title', label: 'Big title', kind: 'title' },
			{ key: 'plan_lead', label: 'Introduction', kind: 'area' }
		], summary: function (u, l) { return flat(u.plan_title[l]); } },
		{ id: 'side', title: 'The side text', icon: 'text', fields: [
			{ key: 'plan_aside_kicker', label: 'Small title above', kind: 'text' },
			{ key: 'plan_aside_title', label: 'Title', kind: 'text' },
			{ key: 'plan_aside_text', label: 'Text', kind: 'area' },
			{ key: 'plan_steps', label: 'Steps', kind: 'paras', hint: 'One step for each paragraph. Leave an empty line between steps.' },
			{ key: 'plan_notice', label: 'Notice', kind: 'area' }
		], summary: function (u, l) { return count(u.plan_steps[l], 'step'); } },
		{ id: 'labels', title: 'The form: questions', icon: 'text', fields: [
			{ key: 'form_name', label: 'Your name', kind: 'text' },
			{ key: 'form_month', label: 'Month of the trip', kind: 'text' },
			{ key: 'form_type', label: 'Kind of trip', kind: 'text' },
			{ key: 'form_travellers', label: 'Number of walkers', kind: 'text' },
			{ key: 'form_days', label: 'Number of days', kind: 'text' },
			{ key: 'form_level', label: 'Walking level', kind: 'text' },
			{ key: 'form_interest', label: 'Trek or day trip', kind: 'text' },
			{ key: 'form_interest_placeholder', label: 'Example shown in that box', kind: 'text' },
			{ key: 'form_notes', label: 'What would make the trip special', kind: 'text' },
			{ key: 'form_notes_placeholder', label: 'Example shown in that box', kind: 'text' },
			{ key: 'optional', label: 'The word "optional"', kind: 'text' }
		], summary: function (u, l) { return u.form_name[l] + ', ' + u.form_month[l] + '\u2026'; } },
		{ id: 'choices', title: 'The form: choices', icon: 'text', fields: [
			{ key: 'form_type_options', label: 'Kinds of trip', kind: 'fixed', itemName: 'Choice', hint: 'You can change the words, but not add or remove a choice.' },
			{ key: 'form_level_options', label: 'Walking levels', kind: 'fixed', itemName: 'Level', hint: 'You can change the words, but not add or remove a level.' }
		], summary: function (u, l) { return count(u.form_type_options[l], 'choice') + ' \u00b7 ' + count(u.form_level_options[l], 'level'); } },
		{ id: 'end', title: 'The form: end', icon: 'text', fields: [
			{ key: 'form_photo_consent', label: 'Photo consent', kind: 'area' },
			{ key: 'form_photo_consent_note', label: 'Note under the photo consent', kind: 'area', hint: 'Keep {terms} and {privacy} as they are: they become links.' },
			{ key: 'form_note', label: 'Note before the button', kind: 'area', hint: 'Keep {privacy} as it is: it becomes a link.' },
			{ key: 'form_privacy_link', label: 'Privacy link', kind: 'text' },
			{ key: 'form_submit', label: 'Button', kind: 'text' }
		], summary: function (u, l) { return u.form_submit[l]; } },
		{ id: 'google', title: 'How it looks on Google', icon: 'search', fields: [
			{ key: 'plan_meta_title', label: 'Title on Google', kind: 'meta' },
			{ key: 'plan_meta_description', label: 'Short text on Google', kind: 'meta', area: true, hint: 'One or two sentences.' }
		], summary: function (u, l) { return u.plan_meta_title[l]; } }
	];


	var HOME_SECTIONS = [
		{ id: 'top', title: 'Top of the page', icon: 'text', fields: [
			{ key: 'hero_kicker', label: 'Small title above', kind: 'text' },
			{ key: 'home_hero_title', label: 'Big title', kind: 'hero' },
			{ key: 'home_hero_text', label: 'Text', kind: 'area' },
			{ key: 'home_hero_treks', label: 'First button', kind: 'text' },
			{ key: 'hero_create', label: 'Second button', kind: 'text' },
			{ key: 'home_features', label: 'The four short lines under the photo', kind: 'fixed', itemName: 'Line', hint: 'You can change the words, but not add or remove a line.' }
		], summary: function (u, l) { return flat(u.home_hero_title[l]); } },
		{ id: 'welcome', title: 'Welcome', icon: 'text', fields: [
			{ key: 'home_intro_title', label: 'Title', kind: 'text' },
			{ key: 'home_intro_text', label: 'Text', kind: 'area' },
			{ key: 'promise_1', label: 'First promise', kind: 'text' },
			{ key: 'promise_2', label: 'Second promise', kind: 'text' },
			{ key: 'promise_3', label: 'Third promise', kind: 'text' }
		], summary: function (u, l) { return u.home_intro_title[l]; } },
		{ id: 'treks', title: 'Our treks', icon: 'text', fields: [
			{ key: 'treks_section_kicker', label: 'Small title above', kind: 'text' },
			{ key: 'treks_section_title', label: 'Title', kind: 'title' },
			{ key: 'treks_section_text', label: 'Text', kind: 'title', hint: 'Press Enter for a new line.' }
		], summary: function (u, l) { return flat(u.treks_section_title[l]); } },
		{ id: 'daytrips', title: 'Our day trips', icon: 'text', fields: [
			{ key: 'excursions_section_kicker', label: 'Small title above', kind: 'text' },
			{ key: 'excursions_section_title', label: 'Title', kind: 'title' },
			{ key: 'excursions_section_text', label: 'Text', kind: 'title', hint: 'Press Enter for a new line.' }
		], summary: function (u, l) { return flat(u.excursions_section_title[l]); } },
		{ id: 'story', title: 'Our story', icon: 'text', fields: [
			{ key: 'story_kicker', label: 'Small title above', kind: 'text' },
			{ key: 'story_title', label: 'Title', kind: 'title' },
			{ key: 'story_p1', label: 'First paragraph', kind: 'area' },
			{ key: 'story_p2', label: 'Second paragraph', kind: 'area' },
			{ key: 'story_link', label: 'Link', kind: 'text' },
			{ key: 'story_note', label: 'Words on the photo', kind: 'text' },
			{ key: 'story_values', label: 'The two short points', kind: 'list', cols: [['Title', 'text'], ['Text', 'area']], itemName: 'Point' }
		], summary: function (u, l) { return flat(u.story_title[l]); } },
		{ id: 'steps', title: 'How we work', icon: 'text', fields: [
			{ key: 'steps_kicker', label: 'Small title above', kind: 'text' },
			{ key: 'steps_title', label: 'Title', kind: 'text' },
			{ key: 'steps_text', label: 'Text', kind: 'title', hint: 'Press Enter for a new line.' },
			{ key: 'home_steps', label: 'The three steps', kind: 'list', cols: [['Number and name', 'text'], ['Title', 'text'], ['Text', 'area']], itemName: 'Step' }
		], summary: function (u, l) { return count(u.home_steps[l], 'step'); } },
		{ id: 'questions', title: 'Questions and answers', icon: 'text', fields: [
			{ key: 'faq_kicker', label: 'Small title above', kind: 'text' },
			{ key: 'faq_title', label: 'Title', kind: 'title' },
			{ key: 'faq_link', label: 'Link', kind: 'text' },
			{ key: 'faqs', label: 'Questions', kind: 'list', cols: [['Question', 'text'], ['Answer', 'area']], itemName: 'Question' }
		], summary: function (u, l) { return count(u.faqs[l], 'question'); } },
		{ id: 'reviews', title: 'Reviews block', icon: 'text', fields: [
			{ key: 'reviews_kicker', label: 'Small title above', kind: 'text' },
			{ key: 'reviews_title', label: 'Title', kind: 'text', hint: 'The reviews themselves are changed in Reviews.' },
			{ key: 'reviews_track', label: 'Name of the list (for screen readers)', kind: 'text' },
			{ key: 'reviews_choose', label: 'Choose a review (for screen readers)', kind: 'text' },
			{ key: 'reviews_prev', label: 'Previous button (for screen readers)', kind: 'text' },
			{ key: 'reviews_next', label: 'Next button (for screen readers)', kind: 'text' },
			{ key: 'reviews_show', label: 'See the review of a traveller', kind: 'text', hint: 'Keep {name} as it is: it becomes the traveller\u2019s name.' },
			{ key: 'reviews_slide', label: 'Review number', kind: 'text', hint: 'Keep {i} and {n} as they are: they become the numbers.' }
		], summary: function (u, l) { return u.reviews_title[l]; } },
		{ id: 'google', title: 'How it looks on Google', icon: 'search', fields: [
			{ key: 'home_meta_title', label: 'Title on Google', kind: 'meta' },
			{ key: 'home_meta_description', label: 'Short text on Google', kind: 'meta', area: true, hint: 'One or two sentences.' }
		], summary: function (u, l) { return u.home_meta_title[l]; } }
	];

	var PAGES = {
		home: { title: 'Home page', url: '/', en: '/en/', sections: HOME_SECTIONS, help: 'Change the words of your Home page. The tour cards come from My Tours, the reviews from Reviews, and the photos from Photos. The menu, the footer and the closing call-to-action appear on every page and are not changed here.' },
		about: { title: 'About us', url: '/about.html', en: '/en/about.html', sections: ABOUT_SECTIONS, help: 'Change the words of your About page. Tap a part to change it. The photos are changed in Photos.' },
		contact: { title: 'Contact page', url: '/contact.html', en: '/en/contact.html', sections: CONTACT_SECTIONS, help: 'Change the words of your Contact page. Your phone number, email and social links are changed in My Contact Info.' },
		plan: { title: 'Plan your trip', url: '/plan-your-trip.html', en: '/en/plan-your-trip.html', sections: PLAN_SECTIONS, help: 'Change the words of the Plan your trip page and its form. The message the form creates for the visitor is not changed here.' }
	};
	function flat(s) { var t = titleToPlain(s).replace(/\s*\n\s*/g, ' ').replace(/\*/g, ''); return t.length > 56 ? t.slice(0, 56) + '…' : t; }
	function count(a, w) { return a.length + ' ' + w + (a.length === 1 ? '' : 's'); }

	// ---------- routes ----------
	function pageRoute(key, parts, view) {
		var page = PAGES[key];
		MX.say('Loading\u2026');
		view.textContent = '';
		MX.loadFile(FILE).then(function (f) {
			if (MX.flash) { MX.say(MX.flash.text, MX.flash.bad); MX.flash = null; } else MX.say('');
			var section = null;
			page.sections.forEach(function (s) { if (s.id === parts[0]) section = s; });
			if (!parts[0]) return drawHub(view, f.data, page, key);
			if (!section) { MX.setHead('#/text/' + key, page.title, 'Page not found', 'This part does not exist.'); return; }
			drawSection(view, f.data, page, key, section, parts[1] === 'en' ? 'en' : 'fr');
		}).catch(function (err) { MX.say('We could not load the page. ' + MX.reason(err), true); });
	}
	MX.routes.aboutText = function (parts, view) { pageRoute('about', parts, view); };
	MX.routes.pageText = pageRoute;

	function drawHub(view, ui, page, key) {
		MX.setHead('#/text', 'Website Text', page.title, page.help);
		var row = el('div', 'mx-tour-actions');
		var see = el('a', 'mx-btn', svg('eye') + '<span>See the page</span>');
		see.href = MX.SITE_URL + page.url; see.target = '_blank'; see.rel = 'noopener noreferrer';
		row.appendChild(see);
		view.appendChild(row);
		var grid = el('div', 'mx-secgrid');
		grid.style.marginTop = '16px';
		page.sections.forEach(function (s) {
			var a = el('a', 'mx-sec'); a.href = '#/text/' + key + '/' + s.id;
			a.appendChild(el('span', 'mx-sec-icon', svg(s.icon)));
			var box = el('span', 'mx-sec-text');
			var t = el('strong'); t.textContent = s.title;
			var d = el('span'); d.textContent = s.summary(ui, 'fr');
			box.appendChild(t); box.appendChild(d); a.appendChild(box); grid.appendChild(a);
		});
		view.appendChild(grid);
		view.appendChild(el('p', 'mx-note', 'Each part has a French and an English tab.'));
	}

	// ---------- an edit page ----------
	function drawSection(view, ui, page, key, section, lang) {
		var parts = [];
		var editor = {
			render: function (box) {
				section.fields.forEach(function (spec) {
					var orig = ui[spec.key][lang];
					var part = buildField(spec, orig);
					parts.push({ spec: spec, orig: orig, part: part });
					box.appendChild(part.node);
				});
			},
			collect: function () {
				var changes = [];
				for (var i = 0; i < parts.length; i++) {
					var p = parts[i], r = p.part.read();
					if (r.error) return { error: r.error };
					if (r.changed) changes.push({ key: p.spec.key, value: r.value });
				}
				return { apply: function (d) { changes.forEach(function (c) { d[c.key][lang] = c.value; }); return changes.length; } };
			}
		};
		MX.frame(view, {
			back: ['#/text/' + key, page.title], title: section.title,
			intro: 'The ' + (lang === 'en' ? 'English' : 'French') + ' words of this part of the page.',
			lang: lang, langHref: function (l) { return '#/text/' + key + '/' + section.id + (l === 'fr' ? '' : '/en'); },
			previewUrl: MX.SITE_URL + (lang === 'en' ? page.en : page.url), editor: editor,
			save: function (apply) {
				var changed = 0;
				return MX.mutateFile(FILE, function (d) { changed = apply(d); if (!changed) return false; }, 'content: change ' + page.title.replace(/ page$/, '') + ' page (' + section.id + ', ' + lang + ')')
					.then(function (f) { return changed ? f : { note: 'Nothing was changed, so nothing was saved.' }; });
			}
		});
	}

	// One field of the form. read() returns { value, changed } with the value written the way the page needs it.
	function buildField(spec, orig) {
		var kind = spec.kind;
		if (kind === 'list') return listField(spec, orig);
		if (kind === 'fixed') return fixedField(spec, orig);
		var shown = kind === 'title' ? titleToPlain(orig) : kind === 'hero' ? heroToPlain(orig) : kind === 'paras' ? orig.join('\n\n') : orig;
		var type = kind === 'text' || (kind === 'meta' && !spec.area) ? 'text' : 'textarea';
		var f = F.makeField({ label: spec.label, type: type, hint: spec.hint ? spec.hint : kind === 'hero' ? 'Press Enter for a new line. Put *stars* around the word shown in the handwritten style.' : kind === 'title' ? 'Press Enter for a new line. Put *stars* around words that should be in italic.' : kind === 'paras' ? 'Leave an empty line between paragraphs.' : spec.hint }, shown);
		var input = f.node.querySelector('input,textarea');
		if (type === 'textarea') input.rows = kind === 'paras' ? 12 : (kind === 'title' || kind === 'hero') ? 3 : 5;
		return {
			node: f.node,
			read: function () {
				var v = f.get();
				if (!String(v).trim()) return { error: 'Please fill in "' + spec.label + '".' };
				if (v === shown) return { changed: false };
				if (kind === 'title') return { changed: true, value: titleFromPlain(v.trim()) };
				if (kind === 'hero') return { changed: true, value: heroFromPlain(v.trim()) };
				if (kind === 'paras') {
					var ps = v.split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean);
					return { changed: true, value: ps.map(escapeHtml) };
				}
				if (kind === 'meta') return { changed: true, value: v.trim() };
				return { changed: true, value: escapeHtml(v.trim()) };
			}
		};
	}

	// A list of items with columns (the words only; the number of items and the links stay as they are).
	function listField(spec, orig) {
		var node = el('div', 'mx-form');
		var title = el('h3', 'mx-h3'); title.textContent = spec.label; node.appendChild(title);
		var cells = [];
		orig.forEach(function (item, i) {
			var card = el('section', 'mx-card-form');
			var h = el('strong'); h.textContent = spec.itemName + ' ' + (i + 1); card.appendChild(h);
			spec.cols.forEach(function (c, n) {
				var f = F.makeField({ label: c[0], type: c[1] === 'area' ? 'textarea' : 'text' }, item[n]);
				var input = f.node.querySelector('input,textarea');
				if (c[1] === 'area') input.rows = 4;
				cells.push({ i: i, n: n, f: f, label: c[0], orig: item[n] });
				card.appendChild(f.node);
			});
			node.appendChild(card);
		});
		return {
			node: node,
			read: function () {
				var changed = false, out = orig.map(function (item) { return item.slice(); });
				for (var k = 0; k < cells.length; k++) {
					var c = cells[k], v = c.f.get();
					if (!String(v).trim()) return { error: 'Please fill in "' + c.label + '" of ' + spec.itemName.toLowerCase() + ' ' + (c.i + 1) + '.' };
					if (v !== c.orig) { out[c.i][c.n] = escapeHtml(v.trim()); changed = true; }
				}
				return { changed: changed, value: out };
			}
		};
	}

	// A list of plain strings where only the words change (the number and the order stay).
	function fixedField(spec, orig) {
		var node = el('div', 'mx-form');
		var title = el('h3', 'mx-h3'); title.textContent = spec.label; node.appendChild(title);
		if (spec.hint) { var hn = el('p', 'mx-hint'); hn.textContent = spec.hint; node.appendChild(hn); }
		var cells = orig.map(function (v, i) {
			var f = F.makeField({ label: spec.itemName + ' ' + (i + 1), type: 'text' }, v);
			node.appendChild(f.node);
			return { f: f, orig: v };
		});
		return {
			node: node,
			read: function () {
				var changed = false, out = orig.slice();
				for (var i = 0; i < cells.length; i++) {
					var v = cells[i].f.get();
					if (!String(v).trim()) return { error: 'Please fill in ' + spec.itemName.toLowerCase() + ' ' + (i + 1) + '.' };
					if (v !== cells[i].orig) { out[i] = escapeHtml(v.trim()); changed = true; }
				}
				return { changed: changed, value: out };
			}
		};
	}
})();
