/* 21.08. Яндекс Метрика — счётчик 111828954 (thermoconcept.by),
 * пользователь создал сам на metrika.yandex.ru, код прислал в чат.
 *
 * Не грузится безусловно, как в оригинальном сниппете Яндекса — ждёт
 * согласия на категорию "Аналитические" из cookie-баннера (см.
 * cookie-consent.njk/cookie-consent.js). Ровно та инфраструктура,
 * которую заранее заложили в баннер (window.TCE_CONSENT + событие
 * 'tce:consent-updated'), теперь используется по назначению — первый
 * реальный трекер на сайте.
 *
 * Порядок в base.njk важен: этот файл подключается СРАЗУ ПОСЛЕ
 * cookie-consent.js. Оба — defer, выполняются в порядке объявления в
 * разметке, поэтому к моменту запуска этого скрипта window.TCE_CONSENT
 * уже проставлен (cookie-consent.js читает localStorage синхронно в
 * своём IIFE, без ожидания DOMContentLoaded).
 *
 * Три сценария:
 *   1) Согласие на аналитику уже было дано в прошлый визит (лежит в
 *      localStorage) — грузим сразу при запуске скрипта.
 *   2) Баннер ещё не показан/на экране — ничего не грузим, ждём
 *      событие 'tce:consent-updated' (сработает при "Принять" или
 *      "Сохранить" с включённым тумблером "Аналитические").
 *   3) Человек явно отказался (aналитика=false) — не грузим вообще,
 *      событие просто ничего не даст сделать.
 *
 * <noscript>-пиксель из сниппета Яндекса СОЗНАТЕЛЬНО не переносим:
 * его смысл — трекинг для посетителей без JS, но без JS не работает и
 * сам cookie-баннер (он тоже держится на JS, без него остаётся
 * скрытым по умолчанию, см. [hidden] в cookie-consent.njk) — то есть
 * такой пиксель отправлял бы данные ДО и БЕЗ какого-либо согласия,
 * ровно то, что вся эта конструкция должна была предотвратить. */
(function () {
  var YM_COUNTER_ID = 111828954;
  var loaded = false;

  function loadMetrika() {
    if (loaded) return;
    loaded = true;

    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      for (var j = 0; j < document.scripts.length; j++) { if (document.scripts[j].src === r) { return; } }
      k = e.createElement(t); a = e.getElementsByTagName(t)[0]; k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=' + YM_COUNTER_ID, 'ym');

    window.ym(YM_COUNTER_ID, 'init', {
      ssr: true,
      webvisor: true,
      clickmap: true,
      ecommerce: 'dataLayer',
      referrer: document.referrer,
      url: location.href,
      accurateTrackBounce: true,
      trackLinks: true
    });
  }

  if (window.TCE_CONSENT && window.TCE_CONSENT.analytics) {
    loadMetrika();
  }

  document.addEventListener('tce:consent-updated', function (e) {
    if (e.detail && e.detail.analytics) {
      loadMetrika();
    }
  });
})();
