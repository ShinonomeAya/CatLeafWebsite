import './motion';
export {};
document.documentElement.classList.add('js');
const toggle = document.querySelector<HTMLButtonElement>('.menu-toggle')!;
const nav = document.querySelector<HTMLElement>('#navigation')!;

function closeMenu(returnFocus = false) {
  nav.classList.remove('is-open');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', '打开导航');
  toggle.textContent = '菜单';
  if (returnFocus) toggle.focus();
}
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  nav.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? '关闭导航' : '打开导航');
  toggle.textContent = open ? '关闭' : '菜单';
});
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') closeMenu(true);
});

const image = document.querySelector<HTMLImageElement>('#gallery-image');
const caption = document.querySelector<HTMLElement>('#gallery-caption');
const stage = document.querySelector<HTMLElement>('.gallery-stage');
const status = document.querySelector<HTMLElement>('#gallery-status');
const gallery = document.querySelector<HTMLElement>('#gallery');
const shotButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-shot]')];
let shotRequest = 0;
let galleryAnimation: Animation | undefined;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let rotating = !reducedMotion.matches;
let galleryVisible = false;
let rotationTimer: number | undefined;
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) {
    galleryAnimation?.cancel();
    stopAutoplay();
  }
});

async function selectShot(button: HTMLButtonElement) {
  if (!image || !caption || !stage || !status) return;
  const request = ++shotRequest;
  galleryAnimation?.cancel();
  shotButtons.forEach(item => item.removeAttribute('data-loading'));
  button.setAttribute('data-loading', '');
  stage.setAttribute('aria-busy', 'true');
  status.textContent = `正在加载${button.textContent}界面…`;
  const next = new Image();
  next.sizes = image.sizes;
  next.srcset = button.dataset.srcset!;
  next.src = button.dataset.src!;
  try {
    await next.decode();
  } catch {
    if (request !== shotRequest) return;
    stopAutoplay();
    status.textContent = '这张截图暂时未能加载，保留当前界面。请重新选择或稍后再试。';
    stage.setAttribute('aria-busy', 'false');
    button.removeAttribute('data-loading');
    return;
  }
  // 快速切换时，较早的请求不能覆盖最后一次选择。
  if (request !== shotRequest) return;
  if (!reducedMotion.matches) {
    galleryAnimation = image.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 220, easing: 'ease-in', fill: 'forwards',
    });
    await galleryAnimation.finished.catch(() => {});
    if (request !== shotRequest) return;
  }
  image.src = button.dataset.src!;
  image.srcset = button.dataset.srcset!;
  image.alt = button.dataset.alt!;
  image.width = Number(button.dataset.width);
  image.height = Number(button.dataset.height);
  caption.textContent = button.dataset.caption!;
  shotButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  stage.setAttribute('aria-busy', 'false');
  status.textContent = '';
  button.removeAttribute('data-loading');
  galleryAnimation?.cancel();
  if (!reducedMotion.matches) galleryAnimation = image.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 380, easing: 'ease-out',
  });
}

function scheduleRotation() {
  clearTimeout(rotationTimer);
  if (!caption || !status) return;
  caption.setAttribute('aria-live', rotating ? 'off' : 'polite');
  status.setAttribute('aria-live', rotating ? 'off' : 'polite');
  if (!rotating || !galleryVisible || document.hidden) return;
  rotationTimer = window.setTimeout(() => {
    const index = shotButtons.findIndex(button => button.getAttribute('aria-pressed') === 'true');
    void selectShot(shotButtons[(index + 1) % shotButtons.length]).finally(scheduleRotation);
  }, 6000);
}

function stopAutoplay() {
  rotating = false;
  scheduleRotation();
}

shotButtons.forEach(button => button.addEventListener('click', () => {
  stopAutoplay();
  void selectShot(button);
}));

if (gallery && stage && shotButtons.length) {
  gallery.addEventListener('focusin', event => {
    if (event.target instanceof HTMLButtonElement && event.target.matches(':focus-visible')) stopAutoplay();
  });
  document.addEventListener('visibilitychange', scheduleRotation);
  new IntersectionObserver(entries => {
    galleryVisible = entries[0].intersectionRatio >= 0.15;
    scheduleRotation();
  }, { threshold: 0.15 }).observe(stage);
  scheduleRotation();
}

document.querySelectorAll<HTMLDetailsElement>('.faq details').forEach(details => {
  const summary = details.querySelector('summary')!;
  let animation: Animation | undefined;
  let opening = details.open;
  function settle() {
    animation?.cancel();
    animation = undefined;
    details.open = opening;
    details.style.removeProperty('overflow');
  }
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches && animation) settle();
  });
  summary.addEventListener('click', event => {
    opening = !(animation ? opening : details.open);
    if (reducedMotion.matches) return;
    event.preventDefault();
    const from = details.getBoundingClientRect().height;
    animation?.cancel();
    details.open = true;
    const style = getComputedStyle(details);
    const to = opening ? details.getBoundingClientRect().height :
      summary.getBoundingClientRect().height + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    details.style.overflow = 'hidden';
    animation = details.animate([{ height: `${from}px` }, { height: `${to}px` }], {
      duration: 340, easing: 'cubic-bezier(.22,.61,.36,1)',
    });
    const current = animation;
    current.finished.then(() => {
      if (animation === current) settle();
    }).catch(() => {});
  });
});
