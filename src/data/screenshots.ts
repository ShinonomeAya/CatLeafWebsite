import { getImage } from 'astro:assets';
import manifest from './phone-manifest.json';
import reader from '../assets/phone/02-reader-light.png';
import reading from '../assets/phone/01-reading-light.png';
import subscriptions from '../assets/phone/03-subscriptions-light.png';
import search from '../assets/phone/09-search-light.png';
import date from '../assets/phone/04-date-filter-light.png';
import discovery from '../assets/phone/05-discovery-light.png';
import preferences from '../assets/phone/11-reading-preferences-light.png';
import offline from '../assets/phone/10-offline-options-light.png';
import dark from '../assets/phone/08-reader-dark.png';

const originals = [
  { id: 'reader', label: '浅色阅读', file: '02-reader-light.png', image: reader, note: '正文与阅读工具栏；文章及寒露配图来自中国国家地理，保留原来源标识。' },
  { id: 'reading', label: '阅读列表', file: '01-reading-light.png', image: reading, note: '少数派文章列表，日期与未读入口。' },
  { id: 'subscriptions', label: '订阅选择', file: '03-subscriptions-light.png', image: subscriptions, note: '选择单个订阅，或一起浏览全部订阅。' },
  { id: 'search', label: '文章搜索', file: '09-search-light.png', image: search, note: '搜索已保存的文章；画面为“相机”查询实际结果。' },
  { id: 'date', label: '日期筛选', file: '04-date-filter-light.png', image: date, note: '选择全部日期、今天、指定日期或未知日期，再看想读的内容。' },
  { id: 'discovery', label: '精选订阅', file: '05-discovery-light.png', image: discovery, note: '浏览真实精选目录，选择感兴趣的来源；来源可用性受提供方影响。' },
  { id: 'preferences', label: '阅读偏好', file: '11-reading-preferences-light.png', image: preferences, note: '选择浅深主题与四档正文字号，让阅读适应自己的习惯。' },
  { id: 'offline', label: '离线选项', file: '10-offline-options-light.png', image: offline, note: '仅为保存前的正文与图片选项，不代表保存成功或完整离线；素材未创建新离线包。' },
  { id: 'reader-dark', label: '深色阅读', file: '08-reader-dark.png', image: dark, note: '与浅色图展示同一篇中国国家地理文章；切换选项可比较主题。' },
] as const;

export type ScreenshotId = typeof originals[number]['id'];
export const screenshots = await Promise.all(originals.map(async item => {
  const meta = manifest.images.find(image => image.file === item.file)!;
  const [small, large] = await Promise.all([330, 660].map(width => getImage({ src: item.image, width, format: 'webp', quality: 80 })));
  return { ...item, src: large.src, srcset: `${small.src} 330w, ${large.src} 660w`, alt: meta.alt,
    caption: `真实测试手机 · ${manifest.version}/code${manifest.versionCode} · ${manifest.captured_date}。${item.note}`,
    width: meta.width, height: meta.height, original: `/screenshots/phone/${item.file}` };
}));
export const galleryShots = screenshots.filter(shot => !['reading', 'subscriptions'].includes(shot.id));
