interface TableRowVo {
    value?: {
        [prop: string]: {
            value?: string | number;
        };
    };
}
/**
 * 获取行列合并配置的Map，map的每一项是一个有序的二维数组
 * 详细结构为：{prop: [[startIndex, endIndex]]}
 * @param rows 行数据集合
 * @param columns 需要跨行的列属性集合
 * @param judgment 判断是否相等的其他条件，默认只做连续值全等的判断
 * @returns
 */
export const getRowSpanMap = <T extends TableRowVo>(
    rows: T[],
    columns: string[],
    judgment?: (pre: T, cur: T, prop: string) => boolean,
): Record<string, [number, number]> => {
    // 如果judgment不是函数，则默认是一个返回true的函数
    if (typeof judgment !== 'function') judgment = () => true;
    const rowSpanMap = columns.reduce((spanMap, column) => {
        spanMap[column] = [];
        return spanMap;
    }, {});
    const pointerMap = columns.reduce((pointerMap, column) => {
        pointerMap[column] = {
            start: 0,
            end: 0,
        };
        return pointerMap;
    }, {});
    const setResultMap = (colRowSpanMap, colPointerMap) => {
        const { start, end } = colPointerMap;
        // 为了减小数据量，当不需要合并行列时，不保存对应的数据
        if (start === end) return;
        colRowSpanMap.push([start, end]);
    };
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
        const preRow = rows[rowIndex - 1];
        const curRow = rows[rowIndex];
        columns.forEach(column => {
            const colPointerMap = pointerMap[column];
            const colRowSpanMap = rowSpanMap[column];
            // 如果上下两行数据相等
            if (
                curRow.value?.[column]?.value !== '' &&
                curRow.value?.[column]?.value === preRow.value?.[column]?.value &&
                judgment(preRow, curRow, column)
            ) {
                colPointerMap.end = rowIndex;
            } else {
                setResultMap(colRowSpanMap, colPointerMap);
                colPointerMap.start = colPointerMap.end = rowIndex;
            }
            if (rowIndex === rows.length - 1 && colPointerMap.start !== colPointerMap.end) {
                // 当走到最后一行，而start!==end，则说明最后几行是一样的，需要再添加一次
                setResultMap(colRowSpanMap, colPointerMap);
            }
        });
    }
    return rowSpanMap;
};

/**
 * 获取行列合并配置
 * @param prop
 * @param rowIndex
 * @param rowSpanMap
 * @returns
 */
export const getRowSpan = (prop, rowIndex, rowSpanMap) => {
    const groups = rowSpanMap[prop];
    if (!groups) return;
    function isBetween(num, arr) {
        return num >= arr[0] && num <= arr[1];
    }
    function findArray(num, arrs) {
        let left = 0,
            right = arrs.length - 1;
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const item = arrs[mid];
            if (isBetween(num, item)) {
                return item;
            } else if (num <= item[0]) {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        }
        return null;
    }
    const group = findArray(rowIndex, groups);
    if (!group) {
        return;
    }
    if (rowIndex === group[0]) {
        return { rowspan: group[1] - group[0] + 1, colspan: 1 };
    } else {
        return { colspan: 0, rowspan: 0 };
    }
};

/**
 * 获取文字宽度
 * @param text
 * @param style
 * @returns
 */
export const getTextWidth = (text: string, style?: { fontStyle: string, fontSize: number, fontWeight: string, fontFamily: string }) => {
    style = Object.assign({ fontSize: 12, fontStyle: 'normal', fontWeight: 'normal', fontFamily: 'PingFang SC,serif' }, style);
    // 获取Canvas元素
    function createCanvas(): { canvas: HTMLCanvasElement, context: CanvasRenderingContext2D } {
        const canvas = document.createElement('canvas');
        canvas.width = 500;
        canvas.style.position = 'absolute';
        canvas.style.zIndex = '-1';
        canvas.style.left = '-9999px';
        canvas.setAttribute('id', 'myCanvas');
        document.body.appendChild(canvas);
        return {
            canvas,
            context: canvas.getContext('2d')
        };
    }
    if (!getTextWidth['context']) {
        const { canvas, context } = createCanvas();
        getTextWidth['canvas'] = canvas;
        getTextWidth['context'] = context;
    }
    const canvas: HTMLCanvasElement = getTextWidth['canvas'];
    const context: CanvasRenderingContext2D = getTextWidth['context'];
    context.clearRect(0, 0, canvas.width, canvas.height);
    // 设置字体样式
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
    // 输出文本宽度
    return Math.ceil(context.measureText(text).width);
};

/**
 * 获取某些列的值的最大文本宽度
 * @param rows
 * @param columns
 * @param getExtraWidth 额外需要增加的宽度，例如小图标
 * @returns
 */
export const getColumnValueMaxWidth = (rows: TableRowVo[], columns: string[], getExtraWidth?: (row: TableRowVo, column: string) => number) => {
    const result = {};
    rows.forEach(row => {
        columns.forEach(column => {
            const text: string | number = row.value[column].value;
            let extraWidth = 0;
            if (typeof getExtraWidth === 'function') {
                extraWidth = toSafeInteger(getExtraWidth(row, column));
            }
            result[column] = Math.max(result[column] || 0, getTextWidth(text.toString()) + extraWidth);
        });
    });
    return result;
};
