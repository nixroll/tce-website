/* 10.08 (пользователь, скриншот с iPad: "Hover эффект странно работает
 * с Apple Pencil, не подсвечивает желтым рамочку").
 *
 * Наши hover-стили (.btn/.btn--primary/.btn--secondary, .form__input,
 * .form__checkbox-row, .projects__nav-btn) намеренно обёрнуты в
 * @media (hover: hover) — это фикс более раннего бага, когда обычный
 * тап пальцем эмулирует :hover и тот "залипает" до следующего тапа по
 * другому месту (см. комментарии рядом с каждым из этих правил в
 * style.2.css).
 *
 * Проблема: @media (hover: hover) смотрит на ОСНОВНОЙ указатель
 * устройства, а не на то, чем водят по экрану прямо сейчас. У iPad
 * основной указатель — палец, поэтому hover:none ВСЕГДА, даже когда
 * в руке Apple Pencil, который физически умеет наводиться над экраном
 * без касания (честный hover, pressure=0) — просто CSS в принципе не
 * может это увидеть, это видно только через JS Pointer Events
 * (event.pointerType === 'pen').
 *
 * Поэтому здесь навешиваем класс is-pencil-hover вручную по
 * pointerenter/pointerleave, отфильтрованным по pointerType — CSS-
 * правила для него лежат в style.2.css рядом с каждым обычным hover,
 * но БЕЗ media-обёртки (это не эмуляция тапом, а настоящее наведение,
 * бага залипания тут нет: pointerleave гарантированно приходит, когда
 * Pencil уходит от поверхности). */
(function () {
  /* 14.08, багфикс (пользователь: "на iPad на всех страницах не
     работает hover с Apple Pencil") — список селекторов не пополнялся
     с 10.08: с тех пор появились карусели Docs - L (/about/),
     Gallery - L (/about/) и Portfolio - D (/services/) со своими
     кнопками-стрелками, а также отдельный класс .form__submit у
     кнопки формы (/contact/). CSS-правила .is-pencil-hover для
     docs-l/gallery-l/form__submit в style уже БЫЛИ (добавлялись
     вместе с самими секциями), но скрипт на эти элементы просто не
     вешал слушатели — класс не появлялся, hover не срабатывал. Для
     .portfolio-d__nav-btn добавлено и CSS-правило (его не было). */
  var selector = [
    '.btn',
    '.form__input',
    '.form__checkbox-row',
    '.form__submit',
    '.projects__nav-btn',
    '.docs-l__nav-btn',
    '.gallery-l__nav-btn',
    '.portfolio-d__nav-btn',
    '.catalog-l__btn'
  ].join(', ');
  var els = document.querySelectorAll(selector);
  if (!els.length) return;

  Array.prototype.forEach.call(els, function (el) {
    el.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'pen') el.classList.add('is-pencil-hover');
    });
    el.addEventListener('pointerleave', function (e) {
      if (e.pointerType === 'pen') el.classList.remove('is-pencil-hover');
    });
  });
})();
