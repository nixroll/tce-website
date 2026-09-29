/* 29.09. Возврат со страницы бренда туда, откуда пришли (пользователь:
 * «← Каталог» на странице бренда всегда вёл на /catalog/ с вкладкой
 * «Категории», даже если пришли из «Брендов», и раскрытая категория
 * терялась).
 *
 * Подключается на /catalog/, /catalog/brands/ и на страницах брендов
 * /catalog/<slug>/ (см. base.njk).
 *
 * На странице каталога: при клике по «Смотреть» в карточке
 *   - если карточка внутри категории, в адрес текущей страницы
 *     дописывается #<категория> (history.replaceState, без перехода).
 *     Кнопка «Назад» браузера тогда вернёт на /catalog/#gorelki, а
 *     catalog-categories.js по хэшу сам раскроет эту категорию;
 *   - в sessionStorage запоминается адрес возврата и адрес бренда.
 *
 * На странице бренда: если запомненный переход вёл именно на этот бренд,
 * ссылка «← Каталог» получает адрес возврата (нужная вкладка + категория).
 * А если пользователь пришёл на бренд прямо с этой страницы каталога,
 * клик делает history.back(): так браузер вернёт и позицию прокрутки,
 * и все раскрытые строки. Без JS или при прямом заходе на бренд ссылка
 * ведёт на /catalog/, как раньше. */
(function () {
  var KEY = 'tce:catalogReturn';

  function save(value) {
    try { sessionStorage.setItem(KEY, JSON.stringify(value)); } catch (e) {}
  }

  function load() {
    try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }

  /* Каталог: запоминаем, откуда ушли на бренд. */
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a.catalog-l__btn[href]');
    if (!link) return;
    var url = location.pathname + location.search;
    var cat = link.closest('.catalog-cat');
    if (cat && cat.id) {
      url += '#' + cat.id;
      if (location.hash !== '#' + cat.id) {
        try { history.replaceState(history.state, '', url); } catch (err) {}
      }
    } else {
      url += location.hash;
    }
    save({ url: url, target: new URL(link.href, location.href).pathname });
  });

  /* Страница бренда: ссылка «← Каталог». */
  var back = document.querySelector('[data-catalog-back]');
  if (!back) return;
  var state = load();
  if (!state || state.target !== location.pathname) return;

  back.setAttribute('href', state.url);

  back.addEventListener('click', function (e) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var ref = null;
    try { ref = document.referrer ? new URL(document.referrer) : null; } catch (err) {}
    var returnPath = state.url.split('#')[0].split('?')[0];
    if (ref && ref.origin === location.origin && ref.pathname === returnPath && history.length > 1) {
      e.preventDefault();
      history.back();
    }
  });
})();
