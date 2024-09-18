import { description, repository } from './package.json';

export function logCardInfo(version) {
  const repo = repository.url;
  const sponsor = 'https://github.com/sponsors/ngocjohn';
  const line1 = '   🚘 VEHICLE-STATUS-CARD 🚘 ';
  const line2 = `   ${version}`;
  const length = Math.max(line1.length, line2.length) + 3;
  const pad = (text, length) => text + ' '.repeat(length - text.length);

  return `
    console.groupCollapsed(
      "%c${pad(line1, length)}\\n%c${pad(line2, length)}",
      'color: orange; font-weight: bold; background: transparent',
      'font-weight: bold; background: dimgray'
    );
    console.info('${description}');
    console.info('Github: ${repo}');
    console.info('If you like the card, consider supporting the developer: ${sponsor}');
    console.groupEnd();
  `;
}
