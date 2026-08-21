/* 21.08. Cookie Consent — своя лёгкая реализация (разметка/CSS —
 * cookie-consent.njk/style.css), подключена безусловно на КАЖДОЙ
 * странице через base.njk.
 *
 * Согласие хранится в localStorage под ключом STORAGE_KEY. Формат:
 *   { necessary: true, functional: bool, analytics: bool,
 *     marketing: bool, updatedAt: "<ISO-строка>" }
 *
 * На сайте сейчас нет НИ ОДНОГО реального трекера (GA/метрики/пиксели)
 * — категории пока ничего не блокируют по-настоящему, это заглушка
 * (осознанное решение пользователя, см. комментарий в cookie-consent.njk).
 * Но инфраструктура на будущее уже здесь:
 *   - window.TCE_CONSENT всегда содержит последнее сохранённое согласие
 *     (или null, если человек ещё не отвечал);
 *   - при каждом сохранении на document летит CustomEvent
 *     'tce:consent-updated' с тем же объектом в event.detail.
 * Когда появится первый реальный скрипт аналитики/рекламы, его
 * достаточно грузить условно (проверка window.TCE_CONSENT?.analytics
 * при загрузке страницы) или подписавшись на событие (если согласие
 * дали уже после того, как страница открылась) — ни разметку, ни этот
 * файл трогать не придётся.
 */
(function () {
  var STORAGE_KEY = 'tce_cookie_consent';

  var banner = document.getElementById('cookie-consent');
  if (!banner) return;

  function readConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      // приватный режим/квота/битый JSON — считаем, что согласия ещё нет
      return null;
    }
  }

  function writeConsent(consent) {
    consent.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    } catch (e) {
      // не даём упасть баннеру целиком, если localStorage недоступен —
      // просто в следующий раз он покажется снова
    }
    window.TCE_CONSENT = consent;
    document.dispatchEvent(new CustomEvent('tce:consent-updated', { detail: consent }));
  }

  window.TCE_CONSENT = readConsent();

  var toggles = banner.querySelectorAll('[data-cookie-category]');

  function setToggle(el, on) {
    el.classList.toggle('cookie-consent__toggle--on', on);
    el.setAttribute('aria-checked', on ? 'true' : 'false');
  }

  function collectFromToggles() {
    var consent = { necessary: true, functional: false, analytics: false, marketing: false };
    toggles.forEach(function (el) {
      consent[el.dataset.cookieCategory] = el.classList.contains('cookie-consent__toggle--on');
    });
    return consent;
  }

  function show() {
    banner.hidden = false;
    // requestAnimationFrame — чтобы снятие [hidden] и добавление
    // .is-visible не схлопнулись в один кадр (иначе transition не
    // успевает отыграть, карточка появляется сразу без анимации).
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        banner.classList.add('is-visible');
      });
    });
  }

  function hide() {
    banner.classList.remove('is-visible');
    window.setTimeout(function () {
      banner.hidden = true;
    }, 250); // совпадает с transition в style.css
  }

  toggles.forEach(function (el) {
    el.addEventListener('click', function () {
      setToggle(el, !el.classList.contains('cookie-consent__toggle--on'));
    });
    el.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setToggle(el, !el.classList.contains('cookie-consent__toggle--on'));
      }
    });
  });

  banner.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-cookie-action]');
    if (!btn) return;
    var action = btn.dataset.cookieAction;

    if (action === 'reject') {
      writeConsent({ necessary: true, functional: false, analytics: false, marketing: false });
      hide();
    } else if (action === 'accept') {
      writeConsent({ necessary: true, functional: true, analytics: true, marketing: true });
      hide();
    } else if (action === 'settings') {
      banner.classList.add('is-expanded');
    } else if (action === 'save') {
      writeConsent(collectFromToggles());
      hide();
    }
  });

  // Показываем только тем, кто ещё не отвечал — сохранённое согласие
  // (любое, включая полный отказ) баннер больше не показывает.
  if (!window.TCE_CONSENT) {
    show();
  }
})();
