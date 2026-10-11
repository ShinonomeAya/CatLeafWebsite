// React Bits Animated Content / Click Spark 的本站原生适配。
// 参考与完整许可见 /licenses/；不用 React 或 GSAP 运行时。
export {};
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const targets = [...document.querySelectorAll<HTMLElement>([
  '.a .value-strip>div', '.a .section-head', '.a .story-screen', '.a .story-list>li',
  '.a .feature', '.a .gallery-copy', '.a .gallery-stage', '.a .step', '.a .optional',
  '.a .faq-layout>div:first-child', '.a .faq details', '.a .download',
  '.doc main>h2', '.doc main>h3', '.doc main>p', '.doc main>ul', '.doc main>ol', '.doc main>pre', '.doc .download',
  '.footer-top', '.footer-bottom',
].join(','))];
const entrances = new Map<HTMLElement, Animation>();
let observer: IntersectionObserver | undefined;

function show(target: HTMLElement) {
  target.dataset.reveal = 'shown';
  entrances.get(target)?.cancel();
  entrances.delete(target);
  observer?.unobserve(target);
}

if (!preference.matches && 'IntersectionObserver' in window && 'animate' in Element.prototype) {
  observer = new IntersectionObserver(entries => {
    const entering = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
    const stagger = Math.min(180, 900 / Math.max(1, entering.length - 1));
    entering.forEach((entry, index) => {
      const target = entry.target as HTMLElement;
      observer!.unobserve(target);
      target.dataset.reveal = 'entering';
      const animation = target.animate([
        { opacity: 0, transform: 'translateY(28px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 1100, delay: index * stagger, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'backwards' });
      entrances.set(target, animation);
      animation.addEventListener('finish', () => show(target), { once: true });
    });
  }, { threshold: 0 });
  targets.forEach(target => {
    // 首屏及通过锚点/返回恢复位置的已可见内容不等待入场。
    if (target.getBoundingClientRect().top < innerHeight) return;
    target.classList.add('scroll-reveal');
    target.dataset.reveal = 'pending';
    observer!.observe(target);
  });
}
document.addEventListener('focusin', event => {
  // 鼠标按下后的聚焦不改变坐标，否则移入中的链接会错过随后点击。
  if (!(event.target as Element).matches(':focus-visible')) return;
  const target = (event.target as Element).closest<HTMLElement>('.scroll-reveal');
  if (target) show(target);
});
document.addEventListener('keydown', event => {
  const target = (event.target as Element).closest<HTMLElement>('.scroll-reveal');
  if (target) show(target);
});

const canvas = document.querySelector<HTMLCanvasElement>('#click-spark')!;
const context = canvas.getContext('2d');
const green = getComputedStyle(document.documentElement).getPropertyValue('--green').trim();
type Burst = { x: number; y: number; start: number; color: string };
let bursts: Burst[] = [];
let frame = 0;

function clearSparks() {
  cancelAnimationFrame(frame);
  frame = 0;
  bursts = [];
  context?.clearRect(0, 0, innerWidth, innerHeight);
}
function sizeCanvas() {
  const scale = Math.min(devicePixelRatio || 1, 2);
  const width = Math.round(innerWidth * scale), height = Math.round(innerHeight * scale);
  if (canvas.width === width && canvas.height === height) return;
  clearSparks();
  canvas.width = width;
  canvas.height = height;
  context?.setTransform(scale, 0, 0, scale, 0, 0);
}
function draw(timestamp: number) {
  frame = 0;
  if (!context) return;
  context.clearRect(0, 0, innerWidth, innerHeight);
  bursts = bursts.filter(burst => timestamp - burst.start < 480);
  for (const burst of bursts) {
    const progress = Math.max(0, (timestamp - burst.start) / 480);
    const eased = progress * (2 - progress);
    const distance = 26 * eased, length = 10 * (1 - eased);
    context.strokeStyle = burst.color;
    context.lineWidth = 1.8;
    context.lineCap = 'round';
    context.globalAlpha = 1 - progress;
    for (let ray = 0; ray < 8; ray++) {
      const angle = ray * Math.PI / 4;
      context.beginPath();
      context.moveTo(burst.x + distance * Math.cos(angle), burst.y + distance * Math.sin(angle));
      context.lineTo(burst.x + (distance + length) * Math.cos(angle), burst.y + (distance + length) * Math.sin(angle));
      context.stroke();
    }
  }
  // 火花结束即停止绘制，不保留空闲动画循环。
  if (bursts.length) frame = requestAnimationFrame(draw);
}
document.addEventListener('click', event => {
  if (!context || preference.matches || event.detail === 0 || event.button !== 0 || !getSelection()?.isCollapsed) return;
  const target = event.target as Element;
  if (target.closest('button:disabled,[aria-disabled="true"]')) return;
  sizeCanvas();
  bursts.push({ x: event.clientX, y: event.clientY, start: performance.now(), color: target.closest('.download') ? '#d5dfcf' : green });
  bursts = bursts.slice(-12);
  if (!frame) frame = requestAnimationFrame(draw);
});
window.addEventListener('resize', sizeCanvas, { passive: true });
window.addEventListener('pagehide', clearSparks);
document.addEventListener('visibilitychange', () => { if (document.hidden) clearSparks(); });
preference.addEventListener('change', () => {
  if (!preference.matches) return;
  observer?.disconnect();
  targets.forEach(show);
  clearSparks();
});
