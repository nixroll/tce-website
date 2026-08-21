document.addEventListener('DOMContentLoaded', function () {
  var header = document.querySelector('.site-header');
  var burger = document.querySelector('.header__burger');
  if (!header || !burger) return;

  burger.addEventListener('click', function () {
    var isOpen = header.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Закрываем мобильное меню, если окно расширили до планшетной/десктопной раскладки
  var mq = window.matchMedia('(min-width: 768px)');
  mq.addEventListener('change', function (e) {
    if (e.matches) {
      header.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    }
  });
});
