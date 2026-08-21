/* 21.08. Cookie Consent — своя лёгкая реализация (разметка/CSS —
 * cookie-consent.njk/style.css), подключена безусловно на КАЖДОЙ
 * странице через base.njk.
 *
 * Согласие хранится в localStorage под ключом STORAGE_KEY. Формат:
 *   { necessary: true, functional: bool, analytics: bool,
 *     updatedAt: "<ISO-строка>" }
 *
 * 21.08, четвёртый раунд: категорию "Рекламные" (marketing) убрали из
 * разметки (дублировала "Функциональные") — ключ marketing здесь тоже
 * убран из hardcoded-объектов accept/reject, чтобы согласие не хранило
 * несуществующую больше категорию. collectFromToggles() трогать не
 * пришлось — она и так собирает состав категорий по факту найденных
 * в DOM [data-cookie-category], а не по жёсткому списку ключей.
 *
 * window.TCE_CONSENT всегда содержит последнее сохранённое согласие
 * (или null, если человек ещё не отвечал), при каждом сохранении на
 * document летит CustomEvent 'tce:consent-updated' с тем же объектом
 * в event.detail — вся эта заготовка сделана заранее именно под
 * условную загрузку трекеров.
 *
 * 21.08: заготовка использована по назначению — Яндекс Метрика
 * (см. yandex-metrika.js, подключается в base.njk сразу следующим
 * тегом после этого файла) грузится, только если TCE_CONSENT.analytics
 * истинно — при чтении localStorage на старте или по событию
 * 'tce:consent-updated', если согласие дали уже после открытия
 * страницы. Разметку и этот файл трогать не пришлось, как и
 * планировалось.
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
    var consent = { necessary: true, functional: false, analytics: false };
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

  // 21.08, второй раунд (пользователь, скриншот: "нужно нажимным
  // сделать весь пункт, чтобы не целиться в переключатель") — клик
  // вешаем на ВЕСЬ .cookie-consent__category, а не на сам тумблер.
  // Клик по самому тумблеру тоже срабатывает — событие всё равно
  // всплывает до строки, отдельный обработчик на toggle не нужен (и
  // не должен: с ним клик сработал бы дважды). Keydown (Space/Enter)
  // остаётся на самом тумблере — это обычный фокусируемый элемент
  // (tabindex="0", role="switch"), клавиатурная активация именно на
  // нём ожидаема и не требует делегирования на всю строку.
  banner.querySelectorAll('.cookie-consent__category').forEach(function (row) {
    var toggle = row.querySelector('[data-cookie-category]');
    if (!toggle) return; // строка "Необходимые" — некликабельна, без data-cookie-category
    row.addEventListener('click', function () {
      setToggle(toggle, !toggle.classList.contains('cookie-consent__toggle--on'));
    });
  });

  toggles.forEach(function (el) {
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
      writeConsent({ necessary: true, functional: false, analytics: false });
      hide();
    } else if (action === 'accept') {
      writeConsent({ necessary: true, functional: true, analytics: true });
      hide();
    } else if (action === 'settings') {
      banner.classList.add('is-expanded');
    } else if (action === 'back') {
      // возврат к свёрнутому виду БЕЗ сохранения (кнопка "Назад" в
      // развёрнутой панели, node 1731:13925/14740 в Figma)
      banner.classList.remove('is-expanded');
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
