/* Privacy policy and Terms and conditions (Website Text > Main pages).
 * The words are kept in data/legal.json (French and English); the pages are built from them, so only the words change.
 * A part that is not touched is saved exactly as it was. The two lines at the end of both pages (title "Contact details"
 * and the "Last updated" date) are in data/ui.json and are shared by both pages. */
(function () {
	'use strict';
	var MX = window.MX;
	if (!MX || !MX.frame || !MX.mutateFile || !MX.pageKit) return;
	var el = MX.el, svg = MX.svg, F = MX.forms;
	var LEGAL = 'data/legal.json', UI = 'data/ui.json';
	var DOCS = {
		privacy: { title: 'Privacy policy', url: '/privacy.html', en: '/en/privacy.html' },
		terms: { title: 'Terms and conditions', url: '/terms-and-conditions.html', en: '/en/terms-and-conditions.html' }
	};
	var escapeHtml = MX.pageKit.escapeHtml;

	// ---------- a section's blocks <-> text ----------
	// A block is a paragraph (a string) or a list ({ list: [...] }). In the form: paragraphs are separated by an
	// empty line; every line of a list starts with "- ".
	function blockToText(b) { return typeof b === 'string' ? b : b.list.map(function (i) { return '- ' + i; }).join('\n'); }
	function contentToText(content) { return content.map(blockToText).join('\n\n'); }
	function textToBlocks(text, orig) {
		var parts = String(text).split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean);
		return parts.map(function (part, i) {
			// A block that is the same as the original one at the same place is kept exactly as it was.
			if (orig[i] !== undefined && blockToText(orig[i]) === part) return orig[i];
			var lines = part.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
			if (lines.length && lines.every(function (l) { return /^-\s+/.test(l); })) return { list: lines.map(function (l) { return escapeHtml(l.replace(/^-\s+/, '')); }) };
			return escapeHtml(lines.join(' '));
		});
	}
	MX.legalWords = { contentToText: contentToText, textToBlocks: textToBlocks };

	function countBlocks(content) {
		var p = content.filter(function (b) { return typeof b === 'string'; }).length, l = content.length - p;
		return (p ? p + ' paragraph' + (p === 1 ? '' : 's') : '') + (p && l ? ' · ' : '') + (l ? l + ' list' + (l === 1 ? '' : 's') : '');
	}

	// ---------- routes ----------
	MX.routes.legalText = function (doc, parts, view) {
		MX.say('Loading…');
		view.textContent = '';
		Promise.all([MX.loadFile(LEGAL), MX.loadFile(UI)]).then(function (r) {
			if (MX.flash) { MX.say(MX.flash.text, MX.flash.bad); MX.flash = null; } else MX.say('');
			if (!parts[0]) return drawHub(view, doc, r[0].data, r[1].data);
			drawPart(view, doc, parts[0], parts[1] === 'en' ? 'en' : 'fr', r[0].data, r[1].data);
		}).catch(function (err) { MX.say('We could not load the page. ' + MX.reason(err), true); });
	};

	function drawHub(view, doc, legal, ui) {
		var d = DOCS[doc], fr = legal[doc].fr;
		MX.setHead('#/text', 'Website Text', d.title, 'Change the words of this page. Tap a part to change it. Each part has a French and an English tab.');
		var row = el('div', 'mx-tour-actions');
		var see = el('a', 'mx-btn', svg('eye') + '<span>See the page</span>');
		see.href = MX.SITE_URL + d.url; see.target = '_blank'; see.rel = 'noopener noreferrer';
		row.appendChild(see); view.appendChild(row);
		var cards = [['top', 'Top of the page', fr.title], ['intro', 'Introduction', fr.intro.length + ' paragraphs']];
		fr.sections.forEach(function (s, i) { cards.push(['s' + (i + 1), s.heading, countBlocks(s.content)]); });
		cards.push(['end', 'End of the page', ui.last_updated.fr + ' (shared with the other legal page)'], ['google', 'How it looks on Google', fr.meta_title]);
		var grid = el('div', 'mx-secgrid'); grid.style.marginTop = '16px';
		cards.forEach(function (c) {
			var a = el('a', 'mx-sec'); a.href = '#/text/' + doc + '/' + c[0];
			a.appendChild(el('span', 'mx-sec-icon', svg(c[0] === 'google' ? 'search' : 'text')));
			var box = el('span', 'mx-sec-text');
			var t = el('strong'); t.textContent = c[1];
			var s = el('span'); s.textContent = c[2];
			box.appendChild(t); box.appendChild(s); a.appendChild(box); grid.appendChild(a);
		});
		view.appendChild(grid);
	}

	// ---------- an edit page ----------
	function drawPart(view, doc, id, lang, legal, ui) {
		var d = DOCS[doc], node = legal[doc][lang], useUi = false, title = '', fields = [], sectionIndex = -1;
		if (id === 'top') { title = 'Top of the page'; fields = [
			{ spec: { key: 'kicker', label: 'Small title above', kind: 'text' }, get: function (l) { return legal[doc][l].kicker; }, set: function (x, l, v) { x[doc][l].kicker = v; } },
			{ spec: { key: 'title', label: 'Big title', kind: 'text' }, get: function (l) { return legal[doc][l].title; }, set: function (x, l, v) { x[doc][l].title = v; } },
			{ spec: { key: 'lead', label: 'Introduction', kind: 'area' }, get: function (l) { return legal[doc][l].lead; }, set: function (x, l, v) { x[doc][l].lead = v; } }]; }
		else if (id === 'intro') { title = 'Introduction'; fields = [
			{ spec: { key: 'intro', label: 'Text', kind: 'paras' }, get: function (l) { return legal[doc][l].intro; }, set: function (x, l, v) { x[doc][l].intro = v; } }]; }
		else if (id === 'google') { title = 'How it looks on Google'; fields = [
			{ spec: { key: 'meta_title', label: 'Title on Google', kind: 'meta' }, get: function (l) { return legal[doc][l].meta_title; }, set: function (x, l, v) { x[doc][l].meta_title = v; } },
			{ spec: { key: 'meta_description', label: 'Short text on Google', kind: 'meta', area: true, hint: 'One or two sentences.' }, get: function (l) { return legal[doc][l].meta_description; }, set: function (x, l, v) { x[doc][l].meta_description = v; } }]; }
		else if (id === 'end') { useUi = true; title = 'End of the page'; fields = [
			{ spec: { key: 'contact_details', label: 'Title of the contact block', kind: 'text' }, get: function (l) { return ui.contact_details[l]; }, set: function (x, l, v) { x.contact_details[l] = v; } },
			{ spec: { key: 'last_updated', label: 'Last update line', kind: 'text', hint: 'For example: Last updated: 26 October 2026. This line is shared by the Privacy policy and the Terms and conditions.' }, get: function (l) { return ui.last_updated[l]; }, set: function (x, l, v) { x.last_updated[l] = v; } }]; }
		else if (/^s\d+$/.test(id)) {
			sectionIndex = Number(id.slice(1)) - 1;
			var sec = node.sections[sectionIndex];
			if (!sec) { MX.setHead('#/text/' + doc, d.title, 'Part not found', 'This part does not exist.'); return; }
			title = legal[doc].fr.sections[sectionIndex] ? legal[doc].fr.sections[sectionIndex].heading : sec.heading;
		} else { MX.setHead('#/text/' + doc, d.title, 'Part not found', 'This part does not exist.'); return; }

		var parts = [];
		var editor = {
			render: function (box) {
				if (sectionIndex >= 0) {
					var sec = node.sections[sectionIndex];
					var head = MX.pageKit.buildField({ key: 'heading', label: 'Heading', kind: 'text' }, sec.heading);
					var shown = contentToText(sec.content);
					var f = F.makeField({ label: 'Text', type: 'textarea', hint: 'Leave an empty line between paragraphs. To make a list, start every line with a dash and a space ("- ").' + (/\{privacy_link\}/.test(shown) ? ' The words {privacy_link} become a link to the Privacy policy: keep them as they are.' : '') }, shown);
					f.node.querySelector('textarea').rows = Math.min(22, Math.max(8, shown.split('\n').length + 2));
					parts.push({ read: function () { return head.read(); }, kind: 'heading', head: head }, { kind: 'content', f: f, shown: shown, orig: sec.content });
					box.appendChild(head.node); box.appendChild(f.node);
					return;
				}
				fields.forEach(function (fd) {
					var orig = fd.get(lang), part = MX.pageKit.buildField(fd.spec, orig);
					parts.push({ fd: fd, part: part });
					box.appendChild(part.node);
				});
			},
			collect: function () {
				var changes = [];
				if (sectionIndex >= 0) {
					var h = parts[0].head.read();
					if (h.error) return { error: h.error };
					var c = parts[1], text = c.f.get();
					if (!String(text).trim()) return { error: 'Please fill in "Text".' };
					if (h.changed) changes.push(function (x) { x[doc][lang].sections[sectionIndex].heading = h.value; });
					if (text !== c.shown) { var blocks = textToBlocks(text, c.orig); changes.push(function (x) { x[doc][lang].sections[sectionIndex].content = blocks; }); }
				} else {
					for (var i = 0; i < parts.length; i++) {
						var r = parts[i].part.read();
						if (r.error) return { error: r.error };
						if (r.changed) (function (fd, v) { changes.push(function (x) { fd.set(x, lang, v); }); })(parts[i].fd, r.value);
					}
				}
				return { apply: function (x) { changes.forEach(function (fn) { fn(x); }); return changes.length; } };
			}
		};
		MX.frame(view, {
			back: ['#/text/' + doc, d.title], title: title.length > 60 ? title.slice(0, 60) + '…' : title,
			intro: 'The ' + (lang === 'en' ? 'English' : 'French') + ' words of this part of the page.',
			lang: lang, langHref: function (l) { return '#/text/' + doc + '/' + id + (l === 'fr' ? '' : '/en'); },
			previewUrl: MX.SITE_URL + (lang === 'en' ? d.en : d.url), editor: editor,
			save: function (apply) {
				var changed = 0;
				return MX.mutateFile(useUi ? UI : LEGAL, function (x) { changed = apply(x); if (!changed) return false; }, 'content: change ' + d.title + ' (' + id + ', ' + lang + ')')
					.then(function (f) { return changed ? f : { note: 'Nothing was changed, so nothing was saved.' }; });
			}
		});
	}
})();
