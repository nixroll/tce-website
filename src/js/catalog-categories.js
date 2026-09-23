/* 23.09. Раскрытие строк категорий на /catalog/ (вид "Категории", см.
 * _includes/catalog-l.njk).
 *
 * Каждая строка открывается/закрывается независимо (в макете про
 * "одна открыта — остальные закрываются" ничего нет, а сравнивать
 * бренды двух категорий удобнее, когда обе открыты).
 *
 * Состояние — класс .is-open на .catalog-cat плюс aria-expanded у
 * кнопки; сама анимация высоты и скрытие закрытых панелей — в CSS.
 *
 * Прямая ссылка: /catalog/#gorelki сразу откроет "Горелки" (id строки
 * = slug из src/_data/catalogCategories.js). */
(function () {
  var rows = document.querySelectorAll('.catalog-cat');
  if (!rows.length) return;

  function setOpen(row, open) {
    var btn = row.querySelector('.catalog-cat__toggle');
    row.classList.toggle('is-open', open);
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  Array.prototype.forEach.call(rows, function (row) {
    var btn = row.querySelector('.catalog-cat__toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      setOpen(row, !row.classList.contains('is-open'));
    });
  });

  function openFromHash() {
    var id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    var row = document.getElementById(id);
    if (row && row.classList.contains('catalog-cat')) setOpen(row, true);
  }

  openFromHash();
  window.addEventListener('hashchange', openFromHash);
})();
