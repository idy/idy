import {
  initSite, enhance, createHeader, createFooter, setTheme, setLanguage,
  loadRelease, asset, type HeaderOptions, type FooterOptions,
} from '@idy/site-sdk';

const options: HeaderOptions = {
  siteName: 'Example', siteHref: '/',
  navLinks: [{ label: 'Guide', href: '#guide', i18n: 'guide' }],
  action: { label: 'Source', href: 'https://github.com/idy', newTab: true },
};
const footerOptions: FooterOptions = { note: 'A project page', links: [] };
const site = initSite({ en: { guide: 'Guide' }, zh: { guide: '指南' } });
const header: HTMLElement = createHeader(options);
const footer: HTMLElement = createFooter(footerOptions);
document.body.append(header, footer);
enhance(header);
site.setTheme('dark');
site.setLanguage('zh');
setTheme('system');
setLanguage('auto');
loadRelease('idy/nootify').then(release => asset(release, /\.dmg$/));
// @ts-expect-error Unknown theme values should not type-check.
setTheme('blue');
// @ts-expect-error Link destinations are required.
createHeader({ navLinks: [{ label: 'Broken' }] });
