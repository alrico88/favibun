import jsdom from 'jsdom';
import { stringifyParsedURL, $URL } from 'ufo';
import is from '@sindresorhus/is';

const { JSDOM } = jsdom;

function processFaviconUrl(originalUrl: string, faviconUrl: string): string {
  const parsedUrl = new $URL(faviconUrl);
  Reflect.set(parsedUrl, 'search', '');
  Reflect.set(parsedUrl, 'hash', '');

  if (is.falsy(parsedUrl.protocol)) {
    parsedUrl.protocol = 'https:';
  }

  if (is.falsy(parsedUrl.host)) {
    parsedUrl.host = new $URL(originalUrl).host;
  }

  if (parsedUrl.pathname.startsWith('.')) {
    parsedUrl.pathname = parsedUrl.pathname.replace(/^./, '');
  }

  if (
    is.nonEmptyStringAndNotWhitespace(parsedUrl.pathname) &&
    !parsedUrl.pathname.startsWith('/')
  ) {
    parsedUrl.pathname = `/${parsedUrl.pathname}`;
  }

  return stringifyParsedURL(parsedUrl);
}

async function fetchFavicon(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': process.env.USER_AGENT as string,
    },
  });
  const html = await res.text();

  const { document } = new JSDOM(html).window;

  const rels = [
    'apple-touch-icon-precomposed',
    'apple-touch-icon',
    'shortcut icon',
    'icon',
  ];

  for (const rel of rels) {
    const icon = document.querySelector(`link[rel="${rel}"]`);

    if (icon) {
      return processFaviconUrl(url, icon.getAttribute('href') as string);
    }
  }

  const parsedUrl = new $URL(url);

  return `${parsedUrl.protocol}//${parsedUrl.host}/favicon.ico`;
}

export function useFavicon() {
  function getDefaultFavicon(url: string): string {
    const parsedUrl = new $URL(url);

    return `https://ui-avatars.com/api/?name=${parsedUrl.host}`;
  }

  function resolveFavicon(url: string): Promise<string> {
    const parsedOriginalUrl = new $URL(url);

    return fetchFavicon(parsedOriginalUrl.href);
  }

  async function loadFavicon(url: string): Promise<ArrayBuffer> {
    try {
      const res = await fetch(url, {
        redirect: 'error',
      });

      return res.arrayBuffer();
    } catch {
      return loadFavicon(getDefaultFavicon(url));
    }
  }

  return {
    getDefaultFavicon,
    resolveFavicon,
    loadFavicon,
  };
}
