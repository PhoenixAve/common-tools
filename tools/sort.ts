/**
 * 比较两个值的大小
 * '' < 数字 < 字符 < null < undefined
 * @param v1
 * @param v2
 * @returns
 */
const handleSort = (v1, v2) => {
    if (typeof v1 === 'undefined') {
        return 1;
    }
    if (v1 === null) {
        return typeof v2 === 'undefined' ? -1 : 1;
    }
    return v1 && v1.localeCompare ? v1.localeCompare(v2) : v1 > v2 ? 1 : -1;
};

/**
 * 根据排序规则获取排序函数
 * @param name
 * @param order
 * @returns
 */
export function getSortFn(
    path: string,
    order: 'desc' | 'asc',
    options?: { transform: (item, path) => unknown },
) {
    const { transform } = options || {};
    return function(item1, item2) {
        let v1, v2;
        if (typeof transform === 'function') {
            // 需要处理数据，例如字符串类型的数字，需要变为数字后进行排序
            v1 = transform(item1, path);
            v2 = transform(item2, path);
        } else {
            v1 = get(item1, path);
            v2 = get(item2, path);
        }
        if (v1 === v2) {
            return 0;
        }
        return order === 'desc' ? handleSort(v2, v1) : handleSort(v1, v2);
    };
}
