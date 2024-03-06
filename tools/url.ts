/**
 * 更新url的参数，得到新的url
 * @param url
 * @param key
 * @param value
 * @param inHash 是否从hash中获取，默认是true
 * @returns
 */
export function generateNewUrl(url: string, key: string, value: unknown, inHash = true): string {
    if (!key) return url;
    const newUrl = new URL(url);
    const newValue = value.toString();
    if (inHash) {
        const hash = newUrl.hash;
        const [hashPath, queryStr] = hash.split('?');
        const searchParams = new URLSearchParams(queryStr);
        if (!newValue) {
            searchParams.delete(key);
        } else {
            searchParams.set(key, newValue);
        }
        const newQueryStr = searchParams.toString();
        const newHash = `${hashPath || '#/'}${newQueryStr ? '?' + newQueryStr : newQueryStr}`;
        newUrl.hash = hashPath || newQueryStr ? newHash : '';
    } else {
        if (!newValue) {
            newUrl.searchParams.delete(key);
        } else {
            newUrl.searchParams.set(key, newValue);
        }
    }
    return newUrl.toString();
}

/**
 * 获取url上的查询参数，返回URLSearchParams对象
 * @param url
 * @param inHash 是否从hash中获取，默认是true
 * @returns
 */
export function getSearchParams(url: string, inHash = true): URLSearchParams {
    if (inHash) {
        const hash = url.split('#')[1] || '';
        const queryStr = hash.split('?')[1] || '';
        return new URLSearchParams(queryStr);
    } else {
        return new URL(url).searchParams;
    }
}

/**
 * 获取查询参数对象
 * @param url
 * @param inHash 是否从hash中获取，默认是true
 * @returns
 */
export function getSearchObject(url: string, inHash = true): Record<string, string> {
    const searchParams = getSearchParams(url, inHash);
    const result: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
        result[key] = value;
    }
    return result;
}

/**
 * 根据url和key获取参数值
 * @param url
 * @param key
 * @param inHash 是否从hash中获取，默认是true
 * @returns
 */
export function getSearchValue(url: string, key: string, inHash = true): string {
    const searchParams = getSearchParams(url, inHash);
    return searchParams.get(key);
}

/**
 * 更新url上的查询字符串
 * @param url
 * @param key
 * @param value
 * @param inHash 是否从hash中获取，默认是true
 * @returns
 */
export function updateUrlQueryParam(url: string, key: string, value: unknown, inHash = true) {
    // value可能为0，所以不能直接用!value
    if (value === undefined || value === 'undefined') {
        return;
    }
    const newUrl = generateNewUrl(url, key, value, inHash);
    if (newUrl === url) {
        return;
    }
    window.history.replaceState({ path: newUrl }, '', newUrl);
}

/**
 * 将对象变为查询字符串 {a:1,b:2} => a=1&b=2
 * @param object
 * @returns
 */
export function objectToUrlQuery(object: Record<string, string>): string {
    return new URLSearchParams(object).toString();
}
