/* 21.08. Три доработки мобильного меню по прямой просьбе пользователя
 * (см. скриншоты в чате):
 *
 * 1) Открытая .header__mobile-panel по высоте меньше экрана (так и в
 *    Figma, node 384:2287) — часть страницы под ней раньше оставалась
 *    видна и по-прежнему кликабельна/скроллируема, хотя меню формально
 *    открыто. Теперь: блокируем скролл фона (lockScroll/unlockScroll —
 *    классический для iOS Safari приём position:fixed + сохранение/
 *    восстановление scrollY, обычного overflow:hidden на body одного
 *    не хватает — iOS всё равно "резиново" скроллит под фиксированным
 *    контентом) и добавляем клик-перехватчик (.header-overlay, см.
 *    header-home.njk/style.css) — тап по оставшейся видимой части
 *    страницы закрывает меню, а не уводит на ссылку/скроллит.
 * 2) Escape тоже закрывает — стандартное поведение для всплывающих
 *    панелей, мелочь, но ожидаемая (говорим об этом пользователю
 *    отдельно, как о "так делают топовые студии": полная блокировка
 *    фона + закрытие по клику вне/Escape, БЕЗ закрытия по попытке
 *    скролла — эта попытка теперь просто ничего не делает благодаря
 *    lockScroll, отдельно её перехватывать как триггер закрытия не
 *    стали: слишком легко закрыть меню случайно, чуть дрогнувшим
 *    пальцем).
 * 3) Общий openMenu/closeMenu вместо прямого toggle классов — резайз
 *    до десктopной раскладки (mq-обработчик ниже) теперь тоже всегда
 *    идёт через closeMenu(), иначе после добавления scroll-lock он бы
 *    закрывал панель, но забывал разлочить body/вернуть scroll.
 *
 * header-overlay в разметке есть только у header-home.njk (живой
 * Header, используется на всех страницах) — у архивного header.njk
 * (только /old-home/, сознательно не трогаем) его нет, поэтому overlay
 * ищем через querySelector и проверяем на null перед использованием:
 * там будет работать всё, кроме клика по фону — это ожидаемо,
 * страница архивная. */
document.addEventListener('DOMContentLoaded', function () {
  var header = document.querySelector('.site-header');
  var burger = document.querySelector('.header__burger');
  if (!header || !burger) return;

  var overlay = document.querySelector('.header-overlay');
  var savedScrollY = 0;

  function lockScroll() {
    savedScrollY = window.scrollY;
    document.body.style.top = '-' + savedScrollY + 'px';
    document.body.classList.add('is-menu-locked');
  }

  function unlockScroll() {
    document.body.classList.remove('is-menu-locked');
    document.body.style.top = '';
    window.scrollTo(0, savedScrollY);
  }

  function openMenu() {
    header.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    lockScroll();
  }

  function closeMenu() {
    header.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    unlockScroll();
  }

  burger.addEventListener('click', function () {
    if (header.classList.contains('is-open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  if (overlay) {
    overlay.addEventListener('click', closeMenu);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && header.classList.contains('is-open')) {
      closeMenu();
    }
  });

  // Закрываем мобильное меню, если окно расширили до планшетной/десктопной раскладки
  var mq = window.matchMedia('(min-width: 768px)');
  mq.addEventListener('change', function (e) {
    if (e.matches && header.classList.contains('is-open')) {
      closeMenu();
    }
  });
});
