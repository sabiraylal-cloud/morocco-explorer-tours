/* Blog articles: list, one article's home page, simple edit pages, copy, delete and "Write a new article".
 * Every save writes data/articles.json through GitHub (this publishes the site). */
(function () {
	'use strict';
	var MX = window.MX;
	if (!MX || !MX.frame) return;
	var el = MX.el, svg = MX.svg, F = MX.forms;
	var FILE = 'data/articles.json';
	var busy = false;

	Object.assign(MX.ICONS, {
		list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
		chat: '<path d="M4 5h16v11H9l-5 4V5Z"/>',
		flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>'
	});

	function bad(err) { MX.say('Not saved. ' + MX.reason(err), true); }
	function publicUrl(a) { return MX.SITE_URL + '/blog/' + a.slug + '.html'; }
	function shown(a) { return a.visible !== false; }
	function mutate(fn, message) { return MX.mutateFile(FILE, fn, message); }
	function byslug(list, slug) { return F.find(list, slug); }
	function today() { return new Date().toISOString().slice(0, 10); }

	function stats(a) {
		var fr = a.fr || {}, en = a.en || {};
		return {
			sections: (fr.sections || []).length,
			tips: fr.tips && fr.tips.items ? fr.tips.items.length : 0,
			faq: (fr.faq || []).length,
			translated: !!(en.title && en.intro && en.intro !== fr.intro)
		};
	}

	// ---------- routes ----------
	MX.routes.blog = function (parts, view) {
		MX.say('');
		view.textContent = '';
		if (!parts[0]) return drawList(view);
		if (parts[0] === 'new') return drawNew(view);
		MX.say('Loading…');
		MX.loadFile(FILE).then(function (f) {
			if (MX.flash) { MX.say(MX.flash.text, MX.flash.bad); MX.flash = null; } else MX.say('');
			var a = byslug(f.data.articles, parts[0]);
			if (!a) { MX.setHead('#/blog', 'Blog articles', 'Article not found', 'This article is not in your list any more.'); return; }
			if (!parts[1]) drawHub(view, a);
			else drawSection(view, a, parts[1], parts[2] === 'en' ? 'en' : 'fr');
		}).catch(function (err) { MX.say('We could not load this article. ' + MX.reason(err), true); });
	};

	// ---------- the list ----------
	function drawList(view) {
		MX.setHead('#/text', 'Website Text', 'Blog articles', 'Your articles, in the same order as on the website. Tap Change to edit one.');
		var add = el('a', 'mx-primary', svg('plus') + '<span>Write a new article</span>');
		add.href = '#/blog/new';
		var list = el('div', 'mx-tour-list');
		view.appendChild(add); view.appendChild(list);
		var images = {};

		function thumb(a) {
			var k = a.uploaded_image || a.image;
			if (!k) return '';
			if (String(k).indexOf('images/uploads/') === 0) return '../' + k;
			var w = images[k] && images[k].widths ? Math.min.apply(null, images[k].widths) : 480;
			return '../assets/images/' + k + '-' + w + '.webp';
		}
		function draw(data) {
			list.textContent = '';
			var items = data.articles;
			items.forEach(function (a, i) {
				var on = shown(a);
				var c = el('article', 'mx-tour');
				var ph = el('div', 'mx-tour-photo');
				var src = thumb(a);
				if (src) { var im = el('img'); im.src = src; im.alt = ''; im.loading = 'lazy'; ph.appendChild(im); }
				var info = el('div', 'mx-tour-info');
				var h = el('h2', 'mx-tour-name'); h.textContent = (a.fr && a.fr.title) || a.slug;
				var m = el('p', 'mx-tour-meta');
				m.textContent = [(a.fr && a.fr.category) || '', a.date || ''].filter(Boolean).join('  ·  ');
				m.appendChild(el('span', 'mx-badge ' + (on ? 'mx-on-site' : 'mx-off-site'), on ? svg('eye') + '<span>On the website</span>' : '<span>Hidden</span>'));
				var row = el('div', 'mx-tour-actions');
				var change = el('a', 'mx-btn mx-btn-main', svg('pencil') + '<span>Change</span>'); change.href = '#/blog/' + a.slug;
				var pv = el(on ? 'a' : 'span', 'mx-btn', svg('eye') + '<span>Preview</span>');
				if (on) { pv.href = publicUrl(a); pv.target = '_blank'; pv.rel = 'noopener noreferrer'; } else { pv.className += ' mx-btn-off'; pv.setAttribute('aria-disabled', 'true'); }
				function btn(icon, label, off, fn) { var b = el('button', 'mx-btn' + (off ? ' mx-btn-off' : ''), svg(icon) + '<span>' + label + '</span>'); b.type = 'button'; b.disabled = !!off; b.addEventListener('click', fn); return b; }
				[change, pv, btn('up', 'Up', i === 0, function () { move(i, -1); }), btn('down', 'Down', i === items.length - 1, function () { move(i, 1); })].forEach(function (n) { row.appendChild(n); });
				[h, m, row].forEach(function (n) { info.appendChild(n); });
				c.appendChild(ph); c.appendChild(info);
				list.appendChild(c);
			});
		}
		function move(i, d) {
			if (busy) return; busy = true; MX.say('Saving…');
			mutate(function (data) {
				var a = data.articles, j = i + d; if (j < 0 || j >= a.length) return false;
				var x = a[i]; a[i] = a[j]; a[j] = x;
			}, 'content: change article order').then(function (f) { busy = false; draw(f.data); MX.say('Saved. The new order will be on the website in a few minutes.'); })
				.catch(function (err) { busy = false; bad(err); MX.loadFile(FILE).then(function (f) { draw(f.data); }); });
		}
		MX.say('Loading…');
		Promise.all([MX.loadFile(FILE), MX.loadFile('data/images.json')]).then(function (r) {
			images = r[1].data;
			if (MX.flash) { MX.say(MX.flash.text, MX.flash.bad); MX.flash = null; } else MX.say('');
			draw(r[0].data);
		}).catch(function (err) { MX.say('We could not load the articles. ' + MX.reason(err), true); });
	}

	// ---------- one article's home page ----------
	function drawHub(view, a) {
		var slug = a.slug, on = shown(a), s = stats(a);
		MX.setHead('#/blog', 'Blog articles', (a.fr && a.fr.title) || slug, 'What would you like to change? Tap one of the buttons.');

		var status = el('section', 'mx-status ' + (on ? 'mx-status-on' : 'mx-status-off'));
		var words = el('div');
		var h = el('h2'); h.textContent = on ? 'Visitors can read this article' : 'Visitors cannot read this article';
		var p = el('p'); p.textContent = on ? 'It is on your website now.' : 'It is hidden. Nothing has been deleted.';
		words.appendChild(h); words.appendChild(p);
		var acts = el('div', 'mx-tour-actions');
		var toggle = el('button', 'mx-btn', svg(on ? 'x' : 'eye') + '<span>' + (on ? 'Hide from website' : 'Show on website') + '</span>');
		toggle.type = 'button';
		toggle.addEventListener('click', function () {
			if (busy) return; busy = true; MX.say('Saving…');
			mutate(function (d) { var t = byslug(d.articles, slug); if (!t) throw { status: 404 }; if (on) t.visible = false; else delete t.visible; }, 'content: ' + (on ? 'hide' : 'show') + ' article ' + slug)
				.then(function (f) { busy = false; view.textContent = ''; drawHub(view, byslug(f.data.articles, slug)); MX.say(on ? 'Saved. The article will be hidden from the website in a few minutes.' : 'Saved. The article will be on the website in a few minutes.'); })
				.catch(function (err) { busy = false; bad(err); });
		});
		var pv = el(on ? 'a' : 'span', 'mx-btn', svg('eye') + '<span>Preview</span>');
		if (on) { pv.href = publicUrl(a); pv.target = '_blank'; pv.rel = 'noopener noreferrer'; } else { pv.className += ' mx-btn-off'; pv.setAttribute('aria-disabled', 'true'); }
		acts.appendChild(toggle); acts.appendChild(pv);
		status.appendChild(words); status.appendChild(acts);
		view.appendChild(status);

		var cards = [
			['details', 'pencil', 'Title and basics', 'Title, category, date and the tour it is about'],
			['cover', 'photo', 'Cover photo', 'The photo at the top of the article'],
			['text', 'list', 'Introduction and sections', s.sections + ' sections'],
			['tips', 'info', 'Practical tips box', s.tips ? s.tips + ' tips' : 'Not used'],
			['faq', 'chat', 'Questions and answers', s.faq + ' questions'],
			['cta', 'flag', 'End of the article', 'The title, text and button at the bottom'],
			['google', 'search', 'How it looks on Google', 'Title, short text, card text and web address'],
			['details/en', 'text', 'English', s.translated ? 'Published' : 'Not translated yet']
		];
		var grid = el('div', 'mx-secgrid');
		cards.forEach(function (c) {
			var link = el('a', 'mx-sec'); link.href = '#/blog/' + slug + '/' + c[0];
			link.appendChild(el('span', 'mx-sec-icon', svg(c[1])));
			var box = el('span', 'mx-sec-text');
			var t = el('strong'); t.textContent = c[2];
			var d = el('span'); d.textContent = c[3];
			box.appendChild(t); box.appendChild(d); link.appendChild(box); grid.appendChild(link);
		});
		view.appendChild(grid);

		view.appendChild(el('hr', 'mx-divider'));
		var row = el('div', 'mx-tour-actions');
		var copy = el('button', 'mx-btn', svg('plus') + '<span>Make a copy of this article</span>'); copy.type = 'button';
		copy.addEventListener('click', function () { createFrom(a, null); });
		var del = el('button', 'mx-btn mx-btn-danger', svg('trash') + '<span>Delete this article</span>'); del.type = 'button';
		del.addEventListener('click', function () { removeArticle(a); });
		row.appendChild(copy); row.appendChild(del);
		view.appendChild(row);
	}

	// A copy (or a new article built from an existing one) is created hidden.
	function createFrom(src, title, trip) {
		if (busy) return; busy = true; MX.say('Saving…');
		var made = '';
		mutate(function (d) {
			var from = byslug(d.articles, src.slug); if (!from) throw { status: 404 };
			var c = F.clone(from);
			var base = title ? F.slugify(title) : src.slug + '-copy';
			if (!base) throw { status: -1 };
			c.slug = made = F.uniqueSlug(base, d.articles);
			c.visible = false;
			c.date = today();
			['fr', 'en'].forEach(function (l) { c[l].title = title || (c[l].title + ' (copy)'); c[l].meta_title = ''; });
			if (trip) c.trip = trip;
			d.articles.splice(d.articles.indexOf(from) + 1, 0, c);
		}, 'content: ' + (title ? 'add' : 'copy') + ' article ' + src.slug).then(function () {
			busy = false;
			MX.flash = { text: 'Saved. The new article is hidden and has sample text. Change each part, then press "Show on website".' };
			window.location.hash = '#/blog/' + made;
		}).catch(function (err) {
			busy = false;
			if (err && err.status === -1) MX.say('Please use letters or numbers in the title.', true); else bad(err);
		});
	}

	function removeArticle(a) {
		if (busy) return;
		if (!window.confirm('Delete "' + ((a.fr && a.fr.title) || a.slug) + '"?\n\nIt will disappear from the website. This cannot be undone here.')) return;
		busy = true; MX.say('Deleting…');
		mutate(function (d) { var i = d.articles.indexOf(byslug(d.articles, a.slug)); if (i < 0) throw { status: 404 }; d.articles.splice(i, 1); }, 'content: delete article ' + a.slug)
			.then(function () { busy = false; MX.flash = { text: 'Deleted. It will be gone from the website in a few minutes.' }; window.location.hash = '#/blog'; })
			.catch(function (err) { busy = false; bad(err); });
	}

	function drawNew(view) {
		MX.setHead('#/blog', 'Blog articles', 'Write a new article', 'Give it a title and choose the tour it is about. It stays hidden until you press "Show on website".');
		MX.say('Loading…');
		Promise.all([MX.loadFile(FILE), MX.loadTrips()]).then(function (r) {
			MX.say('');
			var box = el('section', 'mx-card-form');
			var title = F.makeField({ label: 'Title of the article', type: 'text', hint: 'You can change it later.' }, '');
			var trip = F.makeField({ label: 'Tour it is about', type: 'select', options: r[1].data.trips.map(function (t) { return [t.slug, (t.fr && t.fr.name) || t.slug]; }) }, '');
			var go = el('button', 'mx-primary', svg('plus') + '<span>Create the article</span>'); go.type = 'button';
			go.addEventListener('click', function () {
				var t = title.get().trim();
				if (!t) { MX.say('Please write a title.', true); return; }
				var tpl = r[0].data.articles[0];
				if (!tpl) { MX.say('We need one article to start from. Please tell the person who manages the website.', true); return; }
				createFrom(tpl, t, trip.get());
			});
			box.appendChild(title.node); box.appendChild(trip.node); box.appendChild(go);
			view.appendChild(box);
		}).catch(function (err) { MX.say('We could not load the articles. ' + MX.reason(err), true); });
	}

	// ---------- edit pages ----------
	// A form where some fields live in the article itself (scope "item") and some in its French/English text.
	function mixedEditor(specs, a, lang, intro) {
		var fields = [];
		return {
			intro: intro,
			render: function (box) {
				specs.forEach(function (s) {
					var src = s.scope === 'item' ? a : (a[lang] || {});
					var f = F.makeField(s, src[s.key]);
					fields.push({ s: s, f: f }); box.appendChild(f.node);
				});
				if (specs.some(function (s) { return s.note; })) specs.forEach(function (s) { if (s.note) box.appendChild(el('p', 'mx-note', s.note)); });
			},
			collect: function () {
				var out = [];
				for (var i = 0; i < fields.length; i++) {
					var s = fields[i].s, v = fields[i].f.get();
					if (typeof v === 'string') v = v.trim();
					if (s.required && !v) return { error: 'Please fill in "' + s.label + '".' };
					if (v && s.pattern && !s.pattern.test(v)) return { error: s.patternMessage };
					if (s.words && v && v.split(/\s+/).length !== s.words) return { error: '"' + s.label + '" must have exactly ' + s.words + ' words. Now it has ' + v.split(/\s+/).length + '.' };
					out.push([s, v]);
				}
				return { apply: function (t) { out.forEach(function (p) { if (p[0].scope === 'item') t[p[0].key] = p[1]; else t[lang][p[0].key] = p[1]; }); } };
			}
		};
	}

	function tripOptions(cb) { return MX.loadTrips().then(function (f) { return f.data.trips.map(function (t) { return [t.slug, (t.fr && t.fr.name) || t.slug]; }); }); }

	// Items shared by French and English (sections, questions): adding, removing and moving apply to both.
	function mirrored(a, lang, kind, build) {
		var data = { fr: F.clone((a.fr || {})[kind] || []), en: F.clone((a.en || {})[kind] || []) };
		return { data: data, build: build };
	}

	function textEditor(a, lang) {
		var m = mirrored(a, lang, 'sections');
		var intro = F.makeField({ label: 'Introduction', type: 'textarea', hint: 'A few lines at the top of the article.' }, (a[lang] || {}).intro);
		var photos = [];
		return {
			intro: 'The introduction and the sections of the article. Adding, removing or moving a section changes it in French and English.',
			lang: true,
			render: function (box) {
				MX.photoList().then(function (l) { photos = l; draw(); }, function () { draw(); });
				var holder = el('div', 'mx-form');
				box.appendChild(intro.node); box.appendChild(holder);
				function ping() { box.dispatchEvent(new Event('input', { bubbles: true })); }
				function draw() {
					holder.textContent = '';
					var cur = m.data[lang];
					cur.forEach(function (sec, i) {
						var c = el('section', 'mx-card-form mx-day');
						var hd = el('div', 'mx-day-head');
						var t = el('strong'); t.textContent = 'Section ' + (i + 1); hd.appendChild(t);
						var tools = el('div', 'mx-tour-actions');
						function tool(icon, label, off, fn) { var b = el('button', 'mx-btn' + (off ? ' mx-btn-off' : ''), svg(icon) + '<span>' + label + '</span>'); b.type = 'button'; b.disabled = !!off; b.addEventListener('click', fn); tools.appendChild(b); }
						function swap(j) { ['fr', 'en'].forEach(function (l) { var arr = m.data[l]; if (arr[i] && arr[j]) { var x = arr[i]; arr[i] = arr[j]; arr[j] = x; } }); ping(); draw(); }
						tool('up', 'Up', i === 0, function () { swap(i - 1); });
						tool('down', 'Down', i === cur.length - 1, function () { swap(i + 1); });
						tool('trash', 'Remove', false, function () { if (!window.confirm('Remove section ' + (i + 1) + '?')) return; ['fr', 'en'].forEach(function (l) { m.data[l].splice(i, 1); }); ping(); draw(); });
						hd.appendChild(tools); c.appendChild(hd);
						var fh = F.makeField({ label: 'Heading', type: 'text' }, sec.heading);
						fh.node.querySelector('input').addEventListener('input', function (e) { sec.heading = e.target.value; });
						var fp = F.makeField({ label: 'Text', type: 'textarea', hint: 'Leave an empty line between paragraphs. To add a link write [link text](treks/page-name.html).' }, (sec.paragraphs || []).join('\n\n'));
						fp.node.querySelector('textarea').rows = 9;
						fp.node.querySelector('textarea').addEventListener('input', function (e) { sec.paragraphs = e.target.value.split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean); });
						c.appendChild(fh.node); c.appendChild(fp.node);
						var sel = el('label', 'mx-field');
						var lab = el('span', 'mx-label'); lab.textContent = 'Photo in this section (optional)'; sel.appendChild(lab);
						var s = el('select');
						var none = el('option'); none.value = ''; none.textContent = 'No photo'; s.appendChild(none);
						photos.forEach(function (p) { var o = el('option'); o.value = p.value; o.textContent = p.label; s.appendChild(o); });
						s.value = sec.image || '';
						s.addEventListener('change', function () { ['fr', 'en'].forEach(function (l) { if (m.data[l][i]) { if (s.value) m.data[l][i].image = s.value; else delete m.data[l][i].image; } }); });
						sel.appendChild(s); c.appendChild(sel);
						var fc = F.makeField({ label: 'Photo caption (optional)', type: 'text' }, sec.caption);
						fc.node.querySelector('input').addEventListener('input', function (e) { sec.caption = e.target.value; });
						c.appendChild(fc.node);
						holder.appendChild(c);
					});
					var add = el('button', 'mx-primary', svg('plus') + '<span>Add a section</span>'); add.type = 'button';
					add.addEventListener('click', function () { ['fr', 'en'].forEach(function (l) { m.data[l].push({ heading: '', paragraphs: [] }); }); ping(); draw(); });
					holder.appendChild(add);
				}
			},
			collect: function () {
				var introText = intro.get().trim();
				if (!introText) return { error: 'Please fill in "Introduction".' };
				var cur = m.data[lang];
				if (!cur.length) return { error: 'An article needs at least one section.' };
				for (var i = 0; i < cur.length; i++) if (!String(cur[i].heading).trim() || !(cur[i].paragraphs || []).length) return { error: 'Section ' + (i + 1) + ' is not finished. It needs a heading and some text.' };
				return {
					apply: function (t) {
						var other = lang === 'fr' ? 'en' : 'fr';
						m.data[other].forEach(function (sec, i) {
							var from = m.data[lang][i];
							if (!String(sec.heading).trim()) sec.heading = from.heading;
							if (!(sec.paragraphs || []).length) sec.paragraphs = from.paragraphs.slice();
						});
						t[lang].intro = introText;
						t.fr.sections = m.data.fr; t.en.sections = m.data.en;
					}
				};
			}
		};
	}

	function tipsEditor(a, lang) {
		var tips = (a[lang] || {}).tips || {};
		var title = F.makeField({ label: 'Box title', type: 'text', hint: 'For example: Practical tips. Leave the title and the tips empty if you do not want this box.' }, tips.title);
		var items = F.makeField({ label: 'Tips', type: 'lines', hint: 'One tip per line.' }, tips.items || []);
		return {
			intro: 'A box with practical tips at the end of the article.', lang: true,
			render: function (box) { box.appendChild(title.node); box.appendChild(items.node); },
			collect: function () {
				var t = title.get().trim(), list = items.get();
				if (!t && !list.length) return { apply: function (x) { delete x[lang].tips; } };
				if (!t || !list.length) return { error: 'Please write both the box title and at least one tip, or leave both empty.' };
				return { apply: function (x) { x[lang].tips = { title: t, items: list }; } };
			}
		};
	}

	function faqEditor(a, lang) {
		var m = mirrored(a, lang, 'faq');
		return {
			intro: 'Questions and answers at the end of the article. Adding, removing or moving a question changes it in French and English.', lang: true,
			render: function (box) {
				var holder = el('div', 'mx-form'); box.appendChild(holder);
				function ping() { box.dispatchEvent(new Event('input', { bubbles: true })); }
				function draw() {
					holder.textContent = '';
					var cur = m.data[lang];
					cur.forEach(function (qa, i) {
						var c = el('section', 'mx-card-form mx-day');
						var hd = el('div', 'mx-day-head');
						var t = el('strong'); t.textContent = 'Question ' + (i + 1); hd.appendChild(t);
						var tools = el('div', 'mx-tour-actions');
						function tool(icon, label, off, fn) { var b = el('button', 'mx-btn' + (off ? ' mx-btn-off' : ''), svg(icon) + '<span>' + label + '</span>'); b.type = 'button'; b.disabled = !!off; b.addEventListener('click', fn); tools.appendChild(b); }
						function swap(j) { ['fr', 'en'].forEach(function (l) { var arr = m.data[l]; if (arr[i] && arr[j]) { var x = arr[i]; arr[i] = arr[j]; arr[j] = x; } }); ping(); draw(); }
						tool('up', 'Up', i === 0, function () { swap(i - 1); });
						tool('down', 'Down', i === cur.length - 1, function () { swap(i + 1); });
						tool('trash', 'Remove', false, function () { if (!window.confirm('Remove question ' + (i + 1) + '?')) return; ['fr', 'en'].forEach(function (l) { m.data[l].splice(i, 1); }); ping(); draw(); });
						hd.appendChild(tools); c.appendChild(hd);
						var fq = F.makeField({ label: 'Question', type: 'text' }, qa[0]); fq.node.querySelector('input').addEventListener('input', function (e) { qa[0] = e.target.value; });
						var fa = F.makeField({ label: 'Answer', type: 'textarea' }, qa[1]); fa.node.querySelector('textarea').addEventListener('input', function (e) { qa[1] = e.target.value; });
						c.appendChild(fq.node); c.appendChild(fa.node); holder.appendChild(c);
					});
					var add = el('button', 'mx-primary', svg('plus') + '<span>Add a question</span>'); add.type = 'button';
					add.addEventListener('click', function () { ['fr', 'en'].forEach(function (l) { m.data[l].push(['', '']); }); ping(); draw(); });
					holder.appendChild(add);
				}
				draw();
			},
			collect: function () {
				var cur = m.data[lang];
				for (var i = 0; i < cur.length; i++) if (!String(cur[i][0]).trim() || !String(cur[i][1]).trim()) return { error: 'Question ' + (i + 1) + ' is not finished. It needs a question and an answer.' };
				return {
					apply: function (t) {
						var other = lang === 'fr' ? 'en' : 'fr';
						m.data[other].forEach(function (qa, i) { [0, 1].forEach(function (n) { if (!String(qa[n]).trim()) qa[n] = m.data[lang][i][n]; }); });
						if (!m.data.fr.length && !m.data.en.length) { delete t.fr.faq; delete t.en.faq; } else { t.fr.faq = m.data.fr; t.en.faq = m.data.en; }
					}
				};
			}
		};
	}

	function coverEditor(a) {
		var value = a.uploaded_image || a.image || '';
		return {
			intro: 'Choose the photo shown at the top of the article and on its card. To add your own photos, use the Photos page on Home.',
			render: function (box) {
				var holder = el('div'); box.appendChild(holder);
				MX.pickPhoto(holder, value, function (v) { value = v; box.dispatchEvent(new Event('input', { bubbles: true })); });
			},
			collect: function () {
				if (!value) return { error: 'Please choose a cover photo.' };
				return { apply: function (t) { if (String(value).indexOf('images/uploads/') === 0) t.uploaded_image = value; else { delete t.uploaded_image; t.image = value; } } };
			}
		};
	}

	function drawSection(view, a, section, lang) {
		var slug = a.slug;
		function open(title, ed, withLang) {
			MX.frame(view, {
				back: ['#/blog/' + slug, (a.fr && a.fr.title) || 'Back'], title: title, intro: ed.intro, lang: withLang ? lang : null,
				langHref: function (l) { return '#/blog/' + slug + '/' + section.split('/')[0] + (l === 'fr' ? '' : '/en'); },
				previewUrl: shown(a) ? publicUrl(a) : '', editor: ed,
				save: function (apply) {
					return mutate(function (d) { var t = byslug(d.articles, slug); if (!t) throw { status: 404 }; apply(t); }, 'content: change ' + section.split('/')[0] + ' of article ' + slug);
				}
			});
		}
		switch (section) {
			case 'details':
				MX.say('Loading…');
				tripOptions().then(function (opts) {
					MX.say('');
					open('Title and basics', mixedEditor([
						{ key: 'title', scope: 'lang', label: 'Title', type: 'text', required: true, hint: 'The big title of the article.' },
						{ key: 'category', scope: 'lang', label: 'Category', type: 'text', required: true, hint: 'For example: Seasons and weather.' },
						{ key: 'date', scope: 'item', label: 'Date', type: 'text', required: true, pattern: /^\d{4}-\d{2}-\d{2}$/, patternMessage: 'Please write the date like this: 2026-10-26 (year, month, day).', hint: 'Year-month-day, for example 2026-10-26.' },
						{ key: 'trip', scope: 'item', label: 'Tour it is about', type: 'select', options: opts, hint: 'The button at the end of the article goes to this tour.' }
					], a, lang, 'The title, category, date and the tour this article is about.'), true);
				}).catch(function (err) { MX.say('We could not load the tours. ' + MX.reason(err), true); });
				return;
			case 'cover': return open('Cover photo', coverEditor(a), false);
			case 'text': return open('Introduction and sections', textEditor(a, lang), true);
			case 'tips': return open('Practical tips box', tipsEditor(a, lang), true);
			case 'faq': return open('Questions and answers', faqEditor(a, lang), true);
			case 'cta': return open('End of the article', mixedEditor([
				{ key: 'cta_title', scope: 'lang', label: 'Title', type: 'text', required: true },
				{ key: 'cta_text', scope: 'lang', label: 'Text', type: 'textarea', required: true },
				{ key: 'tour_label', scope: 'lang', label: 'Button text', type: 'text', required: true, hint: 'For example: See the Toubkal trek.' }
			], a, lang, 'The message and the button at the bottom of the article.'), true);
			case 'google': return open('How it looks on Google', mixedEditor([
				{ key: 'meta_title', scope: 'lang', label: 'Title on Google', type: 'text', hint: 'Optional. If empty, the article title is used.' },
				{ key: 'description', scope: 'lang', label: 'Short text', type: 'textarea', required: true, hint: 'One or two sentences shown on Google.' },
				{ key: 'teaser', scope: 'lang', label: 'Text on the article card', type: 'text', required: true, words: 5, hint: 'Exactly five words.', note: 'Web address: ' + MX.SITE_URL.replace('https://', '') + '/blog/' + slug + '.html (it cannot be changed here, so existing links keep working).' }
			], a, lang, 'What people see on Google and on the article card.'), true);
			default:
				MX.setHead('#/blog/' + slug, 'Back', 'Page not found', 'This page does not exist for this article.');
		}
	}
})();
