/* Photos page of the dashboard: all photos, add several at once (made smaller automatically), descriptions,
 * replace and delete. New photos are saved in images/uploads; their descriptions in data/uploads.json.
 * Photos that came with the website (data/images.json) keep their files: only their description can change here. */
(function () {
	'use strict';
	var MX = window.MX;
	if (!MX) return;
	var el = MX.el, svg = MX.svg;

	Object.assign(MX.ICONS, {
		camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4V8Z"/><circle cx="12" cy="13.5" r="3.5"/>',
		swap: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>'
	});

	var DIR = 'images/uploads';
	var ALT_FILE = 'data/uploads.json';
	var MAX_EDGE = 1600, QUALITY = 0.82;
	var JSON_HEADER = { 'Content-Type': 'application/json' };
	var busy = false;

	function isImageName(n) { return /\.(jpe?g|png|webp|gif)$/i.test(n); }
	function slugify(text) {
		return String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
	}

	// ---------- data ----------
	MX.listUploads = function () {
		return MX.api('/contents/' + DIR + '?ref=main').then(function (items) {
			return items.filter(function (i) { return i.type === 'file' && isImageName(i.name); }).map(function (i) { return { name: i.name, path: i.path }; });
		}, function (err) { if (err && err.status === 404) return []; throw err; });
	};

	function loadAlt() {
		return MX.loadFile(ALT_FILE).catch(function (err) {
			if (err && err.status === 404) return { sha: null, data: {} };
			throw err;
		});
	}

	function libThumb(key, images) {
		var w = images[key] && images[key].widths ? Math.min.apply(null, images[key].widths) : 480;
		return '../assets/images/' + key + '-' + w + '.webp';
	}

	// Everything the page needs: library photos, uploaded photos, descriptions.
	function loadPhotos() {
		return Promise.all([MX.loadFile('data/images.json'), MX.listUploads(), loadAlt()]).then(function (r) {
			var images = r[0].data, files = r[1], alts = r[2].data, out = [];
			files.forEach(function (f) {
				var a = alts[f.path] || {};
				out.push({ id: 'up/' + f.name, kind: 'up', key: f.path, name: f.name, thumb: '../' + f.path, alt: { fr: a.fr || '', en: a.en || '' } });
			});
			Object.keys(images).forEach(function (k) {
				var a = images[k].alt || {};
				out.push({ id: 'lib/' + k, kind: 'lib', key: k, name: k, thumb: libThumb(k, images), alt: { fr: a.fr || '', en: a.en || '' } });
			});
			return { items: out, images: images, imagesFile: r[0], altFile: r[2] };
		});
	}

	// Where a photo is used on tours and blog articles.
	function usageOf(key) {
		return Promise.all([MX.loadTrips(), MX.loadFile('data/articles.json')]).then(function (r) {
			var used = [];
			r[0].data.trips.forEach(function (t) {
				var name = (t.fr && t.fr.name) || t.slug;
				if (t.uploaded_image === key || t.image === key) used.push(name + ' (main photo)');
				else if ((t.gallery || []).indexOf(key) >= 0) used.push(name + ' (photos at the bottom of the page)');
			});
			r[1].data.articles.forEach(function (a) {
				var title = (a.fr && a.fr.title) || a.slug;
				var inSections = ((a.fr && a.fr.sections) || []).some(function (s) { return s.image === key; });
				if (a.uploaded_image === key || a.image === key || inSections) used.push('Blog: ' + title);
			});
			return used;
		});
	}

	// ---------- saving ----------
	function putFile(path, text, sha, message) {
		var body = { message: message, content: MX.encode(text), branch: 'main' };
		if (sha) body.sha = sha;
		return MX.api('/contents/' + path, { method: 'PUT', body: JSON.stringify(body), headers: JSON_HEADER });
	}

	// One commit for several files (adds and removals), so a batch of photos is one change.
	function commitFiles(message, adds, removes) {
		function go() {
			return MX.api('/git/ref/heads/main').then(function (ref) {
				var head = ref.object.sha;
				return MX.api('/git/commits/' + head).then(function (c) { return { head: head, tree: c.tree.sha }; });
			}).then(function (base) {
				return Promise.all(adds.map(function (a) {
					return MX.api('/git/blobs', { method: 'POST', body: JSON.stringify({ content: a.base64, encoding: 'base64' }), headers: JSON_HEADER });
				})).then(function (blobs) {
					var entries = adds.map(function (a, i) { return { path: a.path, mode: '100644', type: 'blob', sha: blobs[i].sha }; })
						.concat(removes.map(function (p) { return { path: p, mode: '100644', type: 'blob', sha: null }; }));
					return MX.api('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: base.tree, tree: entries }), headers: JSON_HEADER });
				}).then(function (tree) {
					return MX.api('/git/commits', { method: 'POST', body: JSON.stringify({ message: message, tree: tree.sha, parents: [base.head] }), headers: JSON_HEADER });
				}).then(function (commit) {
					return MX.api('/git/refs/heads/main', { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }), headers: JSON_HEADER });
				});
			});
		}
		return go().catch(function (e) { if (e && (e.status === 409 || e.status === 422)) return go(); throw e; });
	}

	function jsonText(obj) { return JSON.stringify(obj, null, 2) + '\n'; }
	function bad(err) { MX.say('Not saved. ' + MX.reason(err), true); }

	// ---------- making photos smaller ----------
	function toBase64(blob) {
		return new Promise(function (resolve, reject) {
			var r = new FileReader();
			r.onload = function () { resolve(String(r.result).split(',')[1]); };
			r.onerror = reject;
			r.readAsDataURL(blob);
		});
	}

	function shrink(file) {
		return new Promise(function (resolve, reject) {
			var url = URL.createObjectURL(file);
			var im = new Image();
			im.onload = function () {
				var w = im.naturalWidth, h = im.naturalHeight;
				if (!w || !h) { URL.revokeObjectURL(url); return reject(); }
				var s = Math.min(1, MAX_EDGE / Math.max(w, h));
				var cw = Math.round(w * s), ch = Math.round(h * s);
				var c = document.createElement('canvas');
				c.width = cw; c.height = ch;
				var ctx = c.getContext('2d');
				ctx.fillStyle = '#fff';
				ctx.fillRect(0, 0, cw, ch);
				ctx.drawImage(im, 0, 0, cw, ch);
				c.toBlob(function (b) { URL.revokeObjectURL(url); if (b) resolve(b); else reject(); }, 'image/jpeg', QUALITY);
			};
			im.onerror = function () { URL.revokeObjectURL(url); reject(); };
			im.src = url;
		});
	}

	function pickFiles(multiple, onFiles) {
		var input = el('input');
		input.type = 'file';
		input.accept = 'image/*';
		input.multiple = !!multiple;
		input.style.display = 'none';
		input.addEventListener('change', function () { var f = Array.prototype.slice.call(input.files || []); if (f.length) onFiles(f); input.remove(); });
		document.body.appendChild(input);
		input.click();
	}

	// ---------- routes ----------
	MX.routes.photos = function (parts, view) { MX.photosRoute(parts[0], parts[1], view); };
	MX.photosRoute = function (kind, id, view) {
		MX.say('');
		view.textContent = '';
		if (!kind) return drawList(view);
		drawOne(view, kind, decodeURIComponent(id));
	};

	function drawList(view) {
		MX.setHead(MX.HOME, 'Home', 'Photos', 'All your photos. Add new ones here, then use them on your tours and pages. Big photos are made smaller automatically.');
		var card = el('section', 'mx-addcard');
		var add = el('button', 'mx-primary mx-wide', svg('camera') + '<span>Add photos</span>');
		add.type = 'button';
		var help = el('p', 'mx-addhelp');
		help.textContent = 'On a phone you can take a new photo or choose from your gallery. You can choose several photos at once.';
		card.appendChild(add); card.appendChild(help);
		view.appendChild(card);
		var grid = el('div', 'mx-pics');
		view.appendChild(grid);

		var data = null;
		function draw() {
			grid.textContent = '';
			data.items.forEach(function (p) {
				var a = el('a', 'mx-pic');
				a.href = '#/photos/' + p.id.split('/')[0] + '/' + encodeURIComponent(p.id.split('/').slice(1).join('/'));
				var im = el('img'); im.src = p.thumb; im.alt = p.alt.en || p.alt.fr || ''; im.loading = 'lazy';
				a.appendChild(im);
				if (!p.alt.en && !p.alt.fr) a.appendChild(el('span', 'mx-nodesc', 'No description'));
				grid.appendChild(a);
			});
		}
		MX.say('Loading photos…');
		loadPhotos().then(function (d) { data = d; MX.say(''); draw(); }).catch(function (err) { MX.say('We could not load the photos. ' + MX.reason(err), true); });

		add.addEventListener('click', function () {
			if (busy || !data) return;
			pickFiles(true, function (files) { addPhotos(files, data, function (fresh) { data = fresh; draw(); }); });
		});
	}

	function addPhotos(files, data, done) {
		busy = true;
		var taken = {};
		data.items.forEach(function (p) { if (p.kind === 'up') taken[p.name] = true; });
		var adds = [], skipped = 0, i = 0;
		function next() {
			if (i >= files.length) return Promise.resolve();
			var f = files[i++];
			MX.say('Making photo ' + i + ' of ' + files.length + ' smaller…');
			return shrink(f).then(toBase64).then(function (b64) {
				var base = slugify(f.name.replace(/\.[^.]+$/, '')).slice(0, 40) || 'photo';
				var name = base + '.jpg', n = 2;
				while (taken[name]) name = base + '-' + n++ + '.jpg';
				taken[name] = true;
				adds.push({ path: DIR + '/' + name, base64: b64 });
			}, function () { skipped++; }).then(next);
		}
		next().then(function () {
			if (!adds.length) { busy = false; MX.say('We could not read ' + (skipped > 1 ? 'these files' : 'this file') + '. Please choose photos (JPG, PNG or WebP).', true); return null; }
			MX.say('Saving ' + adds.length + ' photo' + (adds.length > 1 ? 's' : '') + '…');
			return commitFiles('content: add ' + adds.length + ' photo' + (adds.length > 1 ? 's' : ''), adds, []).then(function () { return loadPhotos(); }).then(function (fresh) {
				busy = false;
				done(fresh);
				MX.say('Saved. ' + adds.length + ' photo' + (adds.length > 1 ? 's are' : ' is') + ' in your library.' + (skipped ? ' ' + skipped + ' could not be read.' : '') + ' Tap a photo to add a description.');
			});
		}).catch(function (err) { busy = false; bad(err); });
	}

	// ---------- one photo ----------
	function drawOne(view, kind, id) {
		MX.say('Loading…');
		loadPhotos().then(function (data) {
			MX.say('');
			var item = null;
			data.items.forEach(function (p) { if (p.id === kind + '/' + id) item = p; });
			if (!item) { MX.setHead('#/photos', 'Photos', 'Photo not found', 'This photo is not in your library any more.'); return; }
			MX.setHead('#/photos', 'Photos', item.kind === 'up' ? 'Your photo' : 'Website photo', 'Write what the photo shows, in French and English. It helps people who cannot see it, and Google.');

			var box = el('section', 'mx-card-form');
			var big = el('img', 'mx-bigpic'); big.src = item.thumb; big.alt = item.alt.en || '';
			box.appendChild(big);
			var fr = fieldFor('Description in French', item.alt.fr, 'For example: Randonneurs sur un sentier du Haut Atlas.');
			var en = fieldFor('Description in English', item.alt.en, 'For example: Hikers on a High Atlas trail.');
			box.appendChild(fr.node); box.appendChild(en.node);
			var used = el('p', 'mx-note'); used.textContent = 'Checking where this photo is used…';
			box.appendChild(used);
			var save = el('button', 'mx-primary', svg('check') + '<span>Save</span>');
			save.type = 'button';
			box.appendChild(save);
			view.appendChild(box);

			var other = el('div', 'mx-tour-actions');
			if (item.kind === 'up') {
				var rep = el('button', 'mx-btn', svg('swap') + '<span>Replace photo</span>'); rep.type = 'button';
				var del = el('button', 'mx-btn mx-btn-danger', svg('trash') + '<span>Delete photo</span>'); del.type = 'button';
				other.appendChild(rep); other.appendChild(del);
				view.appendChild(other);
				rep.addEventListener('click', function () { if (!busy) pickFiles(false, function (f) { replacePhoto(item, f[0], big); }); });
				del.addEventListener('click', function () { deletePhoto(item); });
			} else {
				view.appendChild(el('p', 'mx-note', 'This photo came with your website. You can change its description. To use a different photo, add a new one.'));
			}

			usageOf(item.key).then(function (list) {
				used.textContent = list.length ? 'Used on: ' + list.join('; ') + '.' : 'This photo is not used on a tour or blog article yet.';
			}, function () { used.textContent = ''; });

			save.addEventListener('click', function () { saveAlt(item, data, fr.get().trim(), en.get().trim()); });
		}).catch(function (err) { MX.say('We could not load the photo. ' + MX.reason(err), true); });
	}

	function fieldFor(label, value, hint) {
		var wrap = el('label', 'mx-field');
		var l = el('span', 'mx-label'); l.textContent = label;
		var input = el('input'); input.type = 'text'; input.value = value || '';
		var h = el('span', 'mx-hint'); h.textContent = hint;
		wrap.appendChild(l); wrap.appendChild(input); wrap.appendChild(h);
		return { node: wrap, get: function () { return input.value; } };
	}

	function saveAlt(item, data, fr, en) {
		if (busy) return;
		if ((fr && !en) || (!fr && en)) { MX.say('Please write the description in both French and English, or leave both empty.', true); return; }
		busy = true; MX.say('Saving…');
		var p;
		if (item.kind === 'lib') {
			p = MX.loadFile('data/images.json').then(function (f) {
				if (!f.data[item.key]) throw { status: 404 };
				if (fr) f.data[item.key].alt = { fr: fr, en: en }; else delete f.data[item.key].alt;
				return putFile('data/images.json', jsonText(f.data), f.sha, 'content: change description of photo ' + item.key);
			});
		} else {
			p = loadAlt().then(function (f) {
				if (fr) f.data[item.key] = { fr: fr, en: en }; else delete f.data[item.key];
				return putFile(ALT_FILE, jsonText(f.data), f.sha, 'content: change description of photo ' + item.name);
			});
		}
		p.then(function () { busy = false; MX.say('Saved. The description will be on the website in a few minutes.'); })
			.catch(function (err) { busy = false; bad(err); });
	}

	function replacePhoto(item, file, big) {
		busy = true; MX.say('Making the photo smaller…');
		shrink(file).then(toBase64).then(function (b64) {
			MX.say('Saving…');
			return commitFiles('content: replace photo ' + item.name, [{ path: item.key, base64: b64 }], []);
		}).then(function () {
			busy = false;
			big.src = item.thumb + '?t=' + Date.now();
			MX.say('Saved. The new photo will be on the website in a few minutes.');
		}).catch(function (err) {
			busy = false;
			if (err === undefined) MX.say('We could not read this file. Please choose a photo (JPG, PNG or WebP).', true); else bad(err);
		});
	}

	function deletePhoto(item) {
		if (busy) return;
		busy = true; MX.say('Checking…');
		usageOf(item.key).then(function (list) {
			if (list.length) {
				busy = false;
				MX.say('This photo is used on: ' + list.join('; ') + '. Choose another photo there first, then delete this one.', true);
				return null;
			}
			if (!window.confirm('Delete this photo?\n\nIt will be removed from your library. This cannot be undone here.')) { busy = false; MX.say(''); return null; }
			MX.say('Deleting…');
			return loadAlt().then(function (f) {
				var adds = [];
				if (f.data[item.key]) { delete f.data[item.key]; adds.push({ path: ALT_FILE, base64: MX.encode(jsonText(f.data)) }); }
				return commitFiles('content: delete photo ' + item.name, adds, [item.key]);
			}).then(function () {
				busy = false;
				window.location.hash = '#/photos';
			});
		}).catch(function (err) { busy = false; bad(err); });
	}

	// ---------- helpers for other pages (blog covers and photos in articles) ----------
	function photoList() {
		return Promise.all([MX.loadFile('data/images.json'), MX.listUploads()]).then(function (r) {
			var images = r[0].data, out = [];
			r[1].forEach(function (u) { out.push({ value: u.path, label: 'Your photo: ' + u.name, thumb: '../' + u.path }); });
			Object.keys(images).forEach(function (k) {
				out.push({ value: k, label: (images[k].alt && images[k].alt.en) || k, thumb: libThumb(k, images) });
			});
			return out;
		});
	}
	MX.photoList = photoList;

	// A grid where one photo can be chosen. onChange(value) is called on every tap.
	MX.pickPhoto = function (box, current, onChange) {
		box.textContent = '';
		box.appendChild(el('p', 'mx-note', 'Loading photos\u2026'));
		return photoList().then(function (list) {
			var value = current;
			function draw() {
				box.textContent = '';
				var g = el('div', 'mx-photos');
				list.forEach(function (p) {
					var b = el('button', 'mx-photo' + (p.value === value ? ' mx-photo-on' : ''));
					b.type = 'button';
					var im = el('img'); im.src = p.thumb; im.alt = ''; im.loading = 'lazy';
					b.appendChild(im);
					b.appendChild(el('span', 'mx-photo-mark', p.value === value ? svg('check') : ''));
					b.title = p.label; b.setAttribute('aria-label', p.label); b.setAttribute('aria-pressed', p.value === value ? 'true' : 'false');
					b.addEventListener('click', function () { value = p.value; onChange(value); draw(); });
					g.appendChild(b);
				});
				box.appendChild(g);
			}
			draw();
		}, function (err) { box.textContent = ''; box.appendChild(el('p', 'mx-note', 'We could not load the photos. ' + MX.reason(err))); });
	};
})();
