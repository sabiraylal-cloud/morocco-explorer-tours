/* Recent changes: the latest changes made from this dashboard, each with an Undo button.
 * Undo puts the files of that change back the way they were just before it. It is only offered when the files were
 * not changed again afterwards, so it can never erase a newer change. */
(function () {
	'use strict';
	var MX = window.MX;
	if (!MX) return;
	var el = MX.el, svg = MX.svg;
	var JSON_HEADER = { 'Content-Type': 'application/json' };
	var busy = false;

	Object.assign(MX.ICONS, { undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>' });

	var SECTION_WORDS = {
		price: 'the price', details: 'the name and details', photos: 'the photos', days: 'the days', route: 'the route map',
		lists: 'the highlights and lists', note: 'the extra information', google: 'the Google text', cover: 'the cover photo',
		text: 'the text', tips: 'the tips box', faq: 'the questions', cta: 'the end of the article'
	};

	// Plain words for the commit messages written by the dashboard.
	function describe(message) {
		var m = String(message).split('\n')[0].replace(/^content:\s*/, '');
		var r;
		if (/^change tour order$/.test(m)) return 'Changed the order of the tours';
		if (r = m.match(/^(hide|show) tour (.+)$/)) return (r[1] === 'hide' ? 'Hid the tour ' : 'Showed the tour ') + r[2];
		if (r = m.match(/^copy tour (.+)$/)) return 'Made a copy of the tour ' + r[1];
		if (r = m.match(/^add tour (.+)$/)) return 'Added the tour ' + r[1];
		if (r = m.match(/^delete tour (.+)$/)) return 'Deleted the tour ' + r[1];
		if (r = m.match(/^change (\w+) of article (.+)$/)) return 'Changed ' + (SECTION_WORDS[r[1]] || r[1]) + ' of the article ' + r[2];
		if (r = m.match(/^change (\w+) of (.+)$/)) return 'Changed ' + (SECTION_WORDS[r[1]] || r[1]) + ' of the tour ' + r[2];
		if (/^change article order$/.test(m)) return 'Changed the order of the articles';
		if (r = m.match(/^(hide|show) article (.+)$/)) return (r[1] === 'hide' ? 'Hid the article ' : 'Showed the article ') + r[2];
		if (r = m.match(/^(copy|add|delete) article (.+)$/)) return { copy: 'Made a copy of the article ', add: 'Added the article ', 'delete': 'Deleted the article ' }[r[1]] + r[2];
		if (/^change review order$/.test(m)) return 'Changed the order of the reviews';
		if (r = m.match(/^(change|add|delete) review of (.+)$/)) return { change: 'Changed the review of ', add: 'Added a review by ', 'delete': 'Deleted the review of ' }[r[1]] + r[2];
		if (/^change contact information$/.test(m)) return 'Changed the contact information';
		if (r = m.match(/^add (\d+) photos?$/)) return 'Added ' + r[1] + ' photo' + (r[1] === '1' ? '' : 's');
		if (r = m.match(/^change description of photo (.+)$/)) return 'Changed the description of the photo ' + r[1];
		if (r = m.match(/^(replace|delete) photo (.+)$/)) return (r[1] === 'replace' ? 'Replaced the photo ' : 'Deleted the photo ') + r[2];
		if (r = m.match(/^change (Privacy policy|Terms and conditions) \((\w+), (\w+)\)$/)) return 'Changed the ' + r[1] + ' (' + (r[3] === 'en' ? 'English' : 'French') + ')';
		if (r = m.match(/^change (.+) page \((\w+), (\w+)\)$/)) return 'Changed the ' + r[1] + ' page (' + (r[3] === 'en' ? 'English' : 'French') + ')';
		if (r = m.match(/^undo "(.+)"$/)) return 'Undid: ' + r[1];
		return m.charAt(0).toUpperCase() + m.slice(1);
	}

	function when(iso) {
		var d = new Date(iso), s = (Date.now() - d.getTime()) / 1000;
		if (s < 60) return 'just now';
		if (s < 3600) return Math.round(s / 60) + ' minutes ago';
		if (s < 86400) return Math.round(s / 3600) + ' hour' + (Math.round(s / 3600) === 1 ? '' : 's') + ' ago';
		return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) + ', ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
	}

	MX.routes.history = function (parts, view) {
		MX.say('');
		view.textContent = '';
		MX.setHead(MX.HOME, 'Home', 'Recent changes', 'The latest changes made from this dashboard. Tap Undo to go back to how it was before a change.');
		var list = el('div', 'mx-tour-list');
		view.appendChild(list);
		MX.say('Loading…');
		load();

		function load(keepMessage) {
			MX.api('/commits?sha=main&per_page=60').then(function (commits) {
				if (!keepMessage) MX.say('');
				var items = commits.filter(function (c) { return /^content:/.test(c.commit.message) && !/^content: regenerate/.test(c.commit.message); }).slice(0, 25);
				draw(items);
			}).catch(function (err) { MX.say('We could not load the changes. ' + MX.reason(err), true); });
		}

		function draw(items) {
			list.textContent = '';
			if (!items.length) list.appendChild(el('p', 'mx-note', 'No changes made from the dashboard yet.'));
			items.forEach(function (c) {
				var card = el('article', 'mx-tour mx-change');
				var info = el('div', 'mx-tour-info');
				var h = el('h2', 'mx-tour-name'); h.textContent = describe(c.commit.message);
				var m = el('p', 'mx-tour-meta'); m.textContent = when(c.commit.author.date) + ((c.commit.author && c.commit.author.name) ? '  ·  ' + c.commit.author.name : '');
				var row = el('div', 'mx-tour-actions');
				var undo = el('button', 'mx-btn', svg('undo') + '<span>Undo</span>'); undo.type = 'button';
				undo.addEventListener('click', function () { undoChange(c); });
				row.appendChild(undo);
				info.appendChild(h); info.appendChild(m); info.appendChild(row);
				card.appendChild(info); list.appendChild(card);
			});
		}

		function undoChange(c) {
			if (busy) return;
			busy = true; MX.say('Checking…');
			var plan;
			MX.api('/commits/' + c.sha).then(function (d) {
				var files = d.files || [];
				if (!files.length || files.length > 40 || !d.parents || d.parents.length !== 1) throw { status: -10 };
				if (files.some(function (f) { return f.status === 'renamed'; })) throw { status: -10 };
				plan = { parent: d.parents[0].sha, files: files };
				// Safe only if every file is still exactly as this change left it.
				return Promise.all(files.map(function (f) {
					return MX.api('/contents/' + f.filename + '?ref=main').then(function (now) {
						return f.status !== 'removed' && now.sha === f.sha ? null : f.filename;
					}, function (err) {
						if (err && err.status === 404) return f.status === 'removed' ? null : f.filename;
						throw err;
					});
				}));
			}).then(function (moved) {
				var changedLater = moved.filter(Boolean);
				if (changedLater.length) throw { status: -11 };
				if (!window.confirm('Undo this change?\n\n' + describe(c.commit.message) + '\n\nEverything it changed goes back to how it was before.')) { busy = false; MX.say(''); return null; }
				MX.say('Undoing…');
				return Promise.all(plan.files.map(function (f) {
					if (f.status === 'added') return { path: f.filename, sha: null };
					return MX.api('/contents/' + f.filename + '?ref=' + plan.parent).then(function (before) { return { path: f.filename, sha: before.sha }; });
				})).then(function (entries) {
					var msg = 'content: undo "' + String(c.commit.message).split('\n')[0].replace(/^content:\s*/, '') + '"';
					return commitTree(msg, entries);
				}).then(function () {
					busy = false;
					MX.say('Done. The change was undone. The website will show it in a few minutes.');
					load(true);
				});
			}).catch(function (err) {
				busy = false;
				if (err && err.status === -10) MX.say('This change cannot be undone from here.', true);
				else if (err && err.status === -11) MX.say('This change cannot be undone any more, because the same information was changed again afterwards. Undo the newer change first.', true);
				else MX.say('Not undone. ' + MX.reason(err), true);
			});
		}
	};

	// One commit that sets (or removes) files to existing contents: entries are { path, sha | null }.
	function commitTree(message, entries) {
		function go() {
			return MX.api('/git/ref/heads/main').then(function (ref) {
				var head = ref.object.sha;
				return MX.api('/git/commits/' + head).then(function (c) { return { head: head, tree: c.tree.sha }; });
			}).then(function (base) {
				var tree = entries.map(function (e) { return { path: e.path, mode: '100644', type: 'blob', sha: e.sha }; });
				return MX.api('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: base.tree, tree: tree }), headers: JSON_HEADER }).then(function (t) {
					return MX.api('/git/commits', { method: 'POST', body: JSON.stringify({ message: message, tree: t.sha, parents: [base.head] }), headers: JSON_HEADER });
				}).then(function (commit) {
					return MX.api('/git/refs/heads/main', { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }), headers: JSON_HEADER });
				});
			});
		}
		return go().catch(function (e) { if (e && (e.status === 409 || e.status === 422)) return go(); throw e; });
	}
})();
