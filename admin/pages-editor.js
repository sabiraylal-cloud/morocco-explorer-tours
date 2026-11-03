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
	MX.aboutWords = { titleToPlain: titleToPlain, titleFromPlain: titleFromPlain, escapeHtml: escapeHtml };

	// kind: text (one line), title (big title), area (several lines), paras (paragraphs), meta (Google / message: no markup),
	// list (items with columns).
	var SECTIONS = [
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

	function flat(s) { var t = titleToPlain(s).replace(/\s*\n\s*/g, ' ').replace(/\*/g, ''); return t.length > 56 ? t.slice(0, 56) + '…' : t; }
	function count(a, w) { return a.length + ' ' + w + (a.length === 1 ? '' : 's'); }

	// ---------- routes ----------
	MX.routes.aboutText = function (parts, view) {
		MX.say('Loading…');
		view.textContent = '';
		MX.loadFile(FILE).then(function (f) {
			if (MX.flash) { MX.say(MX.flash.text, MX.flash.bad); MX.flash = null; } else MX.say('');
			var section = null;
			SECTIONS.forEach(function (s) { if (s.id === parts[0]) section = s; });
			if (!parts[0]) return drawHub(view, f.data);
			if (!section) { MX.setHead('#/text/about', 'About us', 'Page not found', 'This part does not exist.'); return; }
			drawSection(view, f.data, section, parts[1] === 'en' ? 'en' : 'fr');
		}).catch(function (err) { MX.say('We could not load the page. ' + MX.reason(err), true); });
	};

	function drawHub(view, ui) {
		MX.setHead('#/text', 'Website Text', 'About us', 'Change the words of your About page. Tap a part to change it. The photos are changed in Photos.');
		var row = el('div', 'mx-tour-actions');
		var see = el('a', 'mx-btn', svg('eye') + '<span>See the page</span>');
		see.href = MX.SITE_URL + '/about.html'; see.target = '_blank'; see.rel = 'noopener noreferrer';
		row.appendChild(see);
		view.appendChild(row);
		var grid = el('div', 'mx-secgrid');
		grid.style.marginTop = '16px';
		SECTIONS.forEach(function (s) {
			var a = el('a', 'mx-sec'); a.href = '#/text/about/' + s.id;
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
	function drawSection(view, ui, section, lang) {
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
			back: ['#/text/about', 'About us'], title: section.title,
			intro: 'The ' + (lang === 'en' ? 'English' : 'French') + ' words of this part of your About page.',
			lang: lang, langHref: function (l) { return '#/text/about/' + section.id + (l === 'fr' ? '' : '/en'); },
			previewUrl: MX.SITE_URL + (lang === 'en' ? '/en' : '') + '/about.html', editor: editor,
			save: function (apply) {
				var changed = 0;
				return MX.mutateFile(FILE, function (d) { changed = apply(d); if (!changed) return false; }, 'content: change About page (' + section.id + ', ' + lang + ')')
					.then(function (f) { return changed ? f : { note: 'Nothing was changed, so nothing was saved.' }; });
			}
		});
	}

	// One field of the form. read() returns { value, changed } with the value written the way the page needs it.
	function buildField(spec, orig) {
		var kind = spec.kind;
		if (kind === 'list') return listField(spec, orig);
		var shown = kind === 'title' ? titleToPlain(orig) : kind === 'paras' ? orig.join('\n\n') : orig;
		var type = kind === 'text' || (kind === 'meta' && !spec.area) ? 'text' : 'textarea';
		var f = F.makeField({ label: spec.label, type: type, hint: kind === 'title' ? 'Press Enter for a new line. Put *stars* around words that should be in italic.' : kind === 'paras' ? 'Leave an empty line between paragraphs.' : spec.hint }, shown);
		var input = f.node.querySelector('input,textarea');
		if (type === 'textarea') input.rows = kind === 'paras' ? 12 : kind === 'title' ? 3 : 5;
		return {
			node: f.node,
			read: function () {
				var v = f.get();
				if (!String(v).trim()) return { error: 'Please fill in "' + spec.label + '".' };
				if (v === shown) return { changed: false };
				if (kind === 'title') return { changed: true, value: titleFromPlain(v.trim()) };
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
})();
