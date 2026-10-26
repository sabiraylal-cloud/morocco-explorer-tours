'use strict';
document.documentElement.classList.add('js');
const LANG = document.documentElement.lang === 'en' ? 'en' : 'fr';
const TEXT = {
  fr: {
    testimonial: 'Avis {i} sur {n} : {name}, {country}.',
    journey: 'voyage à découvrir',
    journeys: 'voyages à découvrir',
    briefTitle: 'MOROCCO EXPLORER TOURS — MON PROJET DE VOYAGE',
    name: 'Nom', month: 'Mois du voyage', arrival: 'Ville d’arrivée', travellers: 'Voyageurs', days: 'Jours au Maroc', comfort: 'Hébergement', interest: 'Circuit ou destination', ideas: 'Mes envies',
    notProvided: 'Non renseigné', flexible: 'Flexible', openToIdeas: 'Ouvert à toutes les idées', helpMe: 'Aidez-moi à trouver un itinéraire adapté.',
    notBooking: 'Ceci est une demande d’information, pas une réservation confirmée.',
    whatsappDraft: 'Ouvrir le message WhatsApp ↗', emailDraft: 'Ouvrir l’e-mail ↗', emailSubject: 'Mon projet de voyage au Maroc',
    copied: 'Copié. Vous pouvez coller votre projet dans un message. Il n’a pas encore été envoyé.',
    copyUnavailable: 'La copie n’est pas disponible dans ce navigateur. Sélectionnez le texte pour le copier, ou utilisez Télécharger (.txt).',
    downloadName: 'projet-voyage-maroc.txt', downloaded: 'Votre fichier est prêt. Ce projet n’a pas encore été envoyé.',
    social: 'Nos réseaux sociaux officiels', contact: 'Contact', chat: 'Discuter avec Morocco Explorer Tours sur WhatsApp'
  },
  en: {
    testimonial: 'Testimonial {i} of {n}: {name}, {country}.',
    journey: 'journey to explore',
    journeys: 'journeys to explore',
    briefTitle: 'MOROCCO EXPLORER TOURS — MY TRIP BRIEF',
    name: 'Name', month: 'Travel month', arrival: 'Arrival city', travellers: 'Travellers', days: 'Days in Morocco', comfort: 'Accommodation', interest: 'Tour or destination', ideas: 'My ideas',
    notProvided: 'Not provided', flexible: 'Flexible', openToIdeas: 'Open to ideas', helpMe: 'Help me find a route that fits.',
    notBooking: 'This is a planning enquiry, not a confirmed booking.',
    whatsappDraft: 'Open WhatsApp draft ↗', emailDraft: 'Open email draft ↗', emailSubject: 'My Morocco trip enquiry',
    copied: 'Copied. You can paste your brief into a message. It has not been sent.',
    copyUnavailable: 'Copy is unavailable in this browser. Select the brief text to copy it, or use Download .txt.',
    downloadName: 'morocco-trip-brief.txt', downloaded: 'Your download is ready. This brief has not been sent.',
    social: 'Official social media channels', contact: 'Contact', chat: 'Chat with Morocco Explorer Tours on WhatsApp'
  }
}[LANG];
const format = (text, values) => text.replace(/\{(\w+)\}/g, (match, key) => values[key] ?? match);
const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
menuButton.hidden = false;
function closeMenu(returnFocus = false) {
  menuButton.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('is-open');
  if (returnFocus) menuButton.focus();
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  navigation.classList.toggle('is-open', open);
  if (open) {
    header.classList.remove('is-hidden');
    header.classList.add('is-visible');
  }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navigation.classList.contains('is-open')) closeMenu(true);
});
document.addEventListener('click', event => {
  if (!event.target.closest('.site-header')) closeMenu();
});
navigation.addEventListener('click', event => {
  if (event.target.closest('a')) closeMenu();
});
const mobileQuery = matchMedia('(max-width: 800px)');
function updateMenu() {
  menuButton.hidden = !mobileQuery.matches;
  closeMenu();
}
mobileQuery.addEventListener('change', updateMenu);
updateMenu();
let lastScrollY = window.scrollY;
let scrollDirection = 0;
let scrollTravel = 0;
let headerTicking = false;
function updateHeader() {
  const currentScrollY = Math.max(window.scrollY, 0);
  const menuOpen = navigation.classList.contains('is-open');
  const delta = currentScrollY - lastScrollY;
  const direction = Math.sign(delta);
  if (direction && direction !== scrollDirection) scrollTravel = 0;
  if (direction) {
    scrollDirection = direction;
    scrollTravel += Math.abs(delta);
  }
  if (currentScrollY <= 10 || menuOpen) {
    header.classList.remove('is-hidden');
    header.classList.toggle('is-visible', currentScrollY > 4 || menuOpen);
    scrollTravel = 0;
  } else if (scrollDirection > 0 && scrollTravel > 6 && currentScrollY > header.offsetHeight + 24) {
    header.classList.add('is-hidden');
    header.classList.remove('is-visible');
  } else if (scrollDirection < 0 && scrollTravel > 6) {
    header.classList.remove('is-hidden');
    header.classList.add('is-visible');
  }
  lastScrollY = currentScrollY;
  headerTicking = false;
}
window.addEventListener('scroll', () => {
  if (!headerTicking) {
    requestAnimationFrame(updateHeader);
    headerTicking = true;
  }
}, { passive: true });
updateHeader();
header.addEventListener('focusin', () => {
  header.classList.remove('is-hidden');
  header.classList.add('is-visible');
});
document.querySelectorAll('.testimonials').forEach(carousel => {
  carousel.classList.add('is-enhanced');
  const track = carousel.querySelector('.testimonial-track');
  const slides = [...track.children];
  const dots = [...carousel.querySelectorAll('.testimonial-dot')];
  const previous = carousel.querySelector('.testimonial-prev');
  const next = carousel.querySelector('.testimonial-next');
  const status = carousel.querySelector('.testimonial-status');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0;
  let trackWidth = track.clientWidth;
  let announce = false;
  let ticking = false;
  const position = index => slides[index].offsetLeft - slides[0].offsetLeft;
  function update() {
    // Resize can fire a scroll event before ResizeObserver; preserve the selection.
    if (track.clientWidth !== trackWidth) {
      trackWidth = track.clientWidth;
      track.scrollTo({ left: position(active), behavior: 'instant' });
    }
    let nearest = 0;
    for (let index = 1; index < slides.length; index++) {
      if (Math.abs(position(index) - track.scrollLeft) < Math.abs(position(nearest) - track.scrollLeft)) nearest = index;
    }
    const changed = nearest !== active;
    active = nearest;
    dots.forEach((dot, index) => {
      if (index === active) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    // aria-disabled keeps focus on a navigation button at either end.
    previous.setAttribute('aria-disabled', String(active === 0));
    next.setAttribute('aria-disabled', String(active === slides.length - 1));
    if (changed && announce) {
      const name = slides[active].querySelector('.testimonial-name').textContent;
      const country = slides[active].querySelector('.testimonial-country').textContent;
      status.textContent = format(TEXT.testimonial, { i: active + 1, n: slides.length, name, country });
    }
    ticking = false;
  }
  function go(index) {
    announce = true;
    track.scrollTo({ left: position(Math.max(0, Math.min(slides.length - 1, index))), behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  }
  previous.addEventListener('click', () => go(active - 1));
  next.addEventListener('click', () => go(active + 1));
  dots.forEach((dot, index) => dot.addEventListener('click', () => go(index)));
  track.addEventListener('keydown', event => {
    const destinations = { ArrowLeft: active - 1, ArrowRight: active + 1, Home: 0, End: slides.length - 1 };
    if (Object.hasOwn(destinations, event.key)) {
      event.preventDefault();
      go(destinations[event.key]);
    }
  });
  track.addEventListener('pointerdown', () => { announce = true; }, { passive: true });
  track.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
  new ResizeObserver(update).observe(track);
  carousel.querySelector('.testimonial-controls').hidden = false;
  update();
});
const filters = document.querySelector('#tour-filters');
if (filters) {
  filters.hidden = false;
  const cards = [...document.querySelectorAll('.tour-card')];
  const params = new URLSearchParams(location.search);
  for (const name of ['start', 'category', 'days']) {
    const select = filters.elements.namedItem(name);
    if ([...select.options].some(option => option.value === params.get(name))) select.value = params.get(name);
  }
  function applyFilters(updateURL = true) {
    const data = new FormData(filters);
    let count = 0;
    for (const card of cards) {
      const visible = [...data].every(([key, value]) => !value || card.dataset[key] === value);
      card.hidden = !visible;
      if (visible) count++;
    }
    document.querySelector('#result-count').textContent = `${count} ${count === 1 ? TEXT.journey : TEXT.journeys}`;
    document.querySelector('#empty-results').hidden = count > 0;
    if (updateURL) {
      const query = new URLSearchParams([...data].filter(([, value]) => value));
      history.replaceState(null, '', location.pathname + (query.size ? '?' + query : ''));
    }
  }
  filters.addEventListener('change', () => applyFilters());
  filters.addEventListener('submit', event => event.preventDefault());
  filters.addEventListener('reset', () => setTimeout(() => applyFilters(), 0));
  applyFilters(false);
}
const form = document.querySelector('#trip-form');
if (form) {
  form.hidden = false;
  const params = new URLSearchParams(location.search);
  const arrival = form.elements.namedItem('arrival');
  if ([...arrival.options].some(option => option.value === params.get('arrival'))) arrival.value = params.get('arrival');
  form.elements.namedItem('interest').value = (params.get('tour') || params.get('destination') || '').slice(0, 200);
  const month = form.elements.namedItem('month');
  const now = new Date();
  month.min = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const result = document.querySelector('#trip-result');
  const status = document.querySelector('#brief-status');
  let brief = '';
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const value = name => String(data.get(name) || '').trim();
    const sep = LANG === 'fr' ? ' : ' : ': ';
    const line = (label, text) => `${label}${sep}${text}`;
    brief = [TEXT.briefTitle, '', line(TEXT.name, value('name') || TEXT.notProvided), line(TEXT.month, value('month') || TEXT.flexible), line(TEXT.arrival, value('arrival')), line(TEXT.travellers, value('travellers')), line(TEXT.days, value('days')), line(TEXT.comfort, value('comfort')), line(TEXT.interest, value('interest') || TEXT.openToIdeas), '', `${TEXT.ideas}${sep.trimEnd()}`, value('notes') || TEXT.helpMe, '', TEXT.notBooking].join('\n');
    document.querySelector('#brief-text').textContent = brief;
    const share = document.querySelector('#share-brief');
    const phone = form.dataset.whatsapp.replace(/\D/g, '');
    const email = form.dataset.email.trim();
    share.hidden = true;
    if (/^\d{8,15}$/.test(phone)) {
      share.href = `https://wa.me/${phone}?text=${encodeURIComponent(brief)}`;
      share.textContent = TEXT.whatsappDraft;
      share.hidden = false;
    } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      share.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(TEXT.emailSubject)}&body=${encodeURIComponent(brief)}`;
      share.textContent = TEXT.emailDraft;
      share.hidden = false;
    }
    status.textContent = '';
    form.hidden = true;
    result.hidden = false;
    document.querySelector('#brief-title').focus();
  });
  document.querySelector('#edit-brief').addEventListener('click', () => {
    result.hidden = true;
    form.hidden = false;
    form.elements.namedItem('name').focus();
  });
  document.querySelector('#copy-brief').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(brief);
      status.textContent = TEXT.copied;
    } catch {
      status.textContent = TEXT.copyUnavailable;
    }
  });
  document.querySelector('#download-brief').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([brief], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = TEXT.downloadName;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = TEXT.downloaded;
  });
}


/* Official Morocco Explorer Tours contact UI */
(() => {
  const official = {
    email: 'moroccoexploredtours@gmail.com',
    phoneDisplay: '+212 704 321 335',
    phoneTel: '+212704321335',
    whatsapp: 'https://wa.me/212704321335',
    facebook: 'https://www.facebook.com/share/1FFJ8rrrof/',
    instagram: 'https://www.instagram.com/moroccoexplorertours2026?stkn=MWNwOWpqbjNjdzNscg==',
    youtube: 'https://www.youtube.com/@MoroccoExplorerTours'
  };

  const socialIcons = `
    <div class="site-footer__social" aria-label="${TEXT.social}">
      <a href="${official.facebook}" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13.5 22v-8h2.7l.4-3h-3.1V7.6c0-.9.3-1.5 1.7-1.5H16V3.1c-.3-.1-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.4V11H7v3h2.3v8h4.2Z"/></svg>
      </a>
      <a href="${official.instagram}" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5Zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5Zm5.5-3.3a1.2 1.2 0 1 1-1.2-1.2 1.2 1.2 0 0 1 1.2 1.2Z"/></svg>
      </a>
      <a href="${official.youtube}" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M22.5 7.2a3 3 0 0 0-2.1-2.1C18.7 4.7 12 4.7 12 4.7s-6.7 0-8.4.4A3 3 0 0 0 1.5 7.2 31 31 0 0 0 1 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.7.4 8.4.4 8.4.4s6.7 0 8.4-.4a3 3 0 0 0 2.1-2.1A31 31 0 0 0 23 12a31 31 0 0 0-.5-4.8ZM10 15.5v-7l6 3.5-6 3.5Z"/></svg>
      </a>
    </div>`;

  const footer = document.querySelector('footer');
  if (footer && !footer.querySelector('.site-footer__contact-panel')) {
    const panel = document.createElement('div');
    panel.className = 'container site-footer__contact-panel';
    panel.innerHTML = `
      <div class="site-footer__contacts">
        <a href="mailto:${official.email}">${official.email}</a>
        <a href="tel:${official.phoneTel}">${official.phoneDisplay}</a>
        <a href="${official.whatsapp}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <a href="${location.pathname.includes('/tours/') || location.pathname.includes('/destinations/') || location.pathname.includes('/blog/') ? '../' : ''}contact.html">${TEXT.contact}</a>
      </div>
      ${socialIcons}`;
    const bottom = footer.querySelector('.footer-bottom');
    if (bottom) footer.insertBefore(panel, bottom);
    else footer.append(panel);
  }

  if (!document.querySelector('.whatsapp-float')) {
    const button = document.createElement('a');
    button.className = 'whatsapp-float';
    button.href = official.whatsapp;
    button.target = '_blank';
    button.rel = 'noopener noreferrer';
    button.setAttribute('aria-label', TEXT.chat);
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2a9.9 9.9 0 0 0-8.5 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3.1.8.8-3-.2-.3A8 8 0 1 1 12 20Zm4.5-6c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.3-.7.8-.8 1-.2.2-.3.2-.6.1-1.5-.7-2.5-1.3-3.5-3-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.6l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.4-.2.3-.9.9-.9 2.1 0 1.3.9 2.5 1 2.7.1.2 1.8 2.8 4.5 3.9 1.7.7 2.4.8 3.3.7 1-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1-.2-.3-.3-.7-.4Z"/></svg>';
    document.body.append(button);
  }
})();
