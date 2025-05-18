const loadCache = new Map<string, Promise<string>>();

const _load = (tag: 'link' | 'script' | 'img', url: string, type?: 'module') => {
  if (loadCache.has(url)) return loadCache.get(url)!;

  const promise = new Promise<string>((resolve, reject) => {
    // If already in DOM, resolve immediately
    if (
      (tag === 'script' && !!document.querySelector(`script[src="${url}"]`)) ||
      (tag === 'link' && !!document.querySelector(`link[href="${url}"]`)) ||
      (tag === 'img' && !!document.querySelector(`img[src="${url}"]`))
    ) {
      return resolve(url);
    }

    const element = document.createElement(tag);
    let attr = 'src';
    let parent = 'body';

    element.onload = () => resolve(url);
    element.onerror = () => reject(url);

    switch (tag) {
      case 'script':
        (element as HTMLScriptElement).async = true;
        if (type) {
          (element as HTMLScriptElement).type = type;
        }
        break;
      case 'link':
        (element as HTMLLinkElement).type = 'text/css';
        (element as HTMLLinkElement).rel = 'stylesheet';
        attr = 'href';
        parent = 'head';
    }

    element[attr] = url;
    document[parent].appendChild(element);
  });

  loadCache.set(url, promise);
  return promise;
};

export const loadCSS = (url: string) => _load('link', url);
export const loadJS = (url: string) => _load('script', url);
export const loadImg = (url: string) => _load('img', url);
export const loadModule = (url: string) => _load('script', url, 'module');
