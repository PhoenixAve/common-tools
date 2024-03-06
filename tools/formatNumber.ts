/* eslint-disable no-prototype-builtins */
import dayjs from 'dayjs';
import BigNumber from 'bignumber.js';

const valueCalculateConfig = {
    rounding: false,
};
// valueCalculateConfig.rounding默认 为 false，所以默认采用截断小数方式
BigNumber.config({ ROUNDING_MODE: BigNumber.ROUND_DOWN });

const baseUnits: UnitVo[] = [
    { max: 10000, quotient: 1, unit: '' },
    { max: 1000000, quotient: 10000, unit: '万' },
    { max: 10000000, quotient: 1000000, unit: '百万' },
    { max: 10000000000, quotient: 100000000, unit: '亿' },
    { max: 100000000000, quotient: 10000000000, unit: '百亿' }
];
const digitCalculates = (data: number | BigNumber, digit: number): string => {
    // 如果开启四舍五入，则按照四舍五入操作否则直接截取
    return new BigNumber(data).toFixed(digit);
};
const getStylesheet = () => {
    const links = {};
    document.querySelectorAll('link').forEach(dom => {
        if (dom.rel === 'stylesheet' && dom.crossOrigin !== 'anonymous') {
            links[dom.href] = true;
        }
    });
    return Array.from(document.styleSheets).filter(({ href }) => !links[href!]);
};
export interface UserInfoVo {
    uid: string;
    loginName: string;
    name: string;
    email: string;
    msg: string;
    avatar?: string;
}
export interface UnitVo {
    max: number;
    unit: string;
    quotient: number;
}
export const isProduction = () => (process.env.AWP_DEPLOY_ENV || 'production') === 'production';
export interface UnitVo {
    max: number;
    unit: string;
    quotient: number;
}
export enum DataTypeKey {
    STRING = 'string',
    NUMBER = 'number',
    SEPARATEBYK = 'separateByK',
    PERCENT = 'percent',
    PP = 'pp',
    DATE = 'date',
    TIME = 'time',
    ABBR = 'abbr',
    PADSTART = 'padstart',
    DIGIT = 'digit',
}
/**
 * 全局设置是否四舍五入，默认采用截断方式
 * @param rounding
 */
export const setDigitRounding = (rounding: boolean) => {
    valueCalculateConfig.rounding = rounding;
    // BigNumber.ROUND_HALF_UP: 四舍五入，BigNumber.ROUND_DOWN: 截断
    BigNumber.config({ ROUNDING_MODE: valueCalculateConfig.rounding ? BigNumber.ROUND_HALF_UP : BigNumber.ROUND_DOWN });

};
export interface NormalizedVo {
    /**  数据格式 */
    dataType?: string;
    /**  数值描述 */
    description?: string;
    /**  小数点数量 */
    digit?: number;
    /**  是否使用列的展示各式，false的话取自己本身的数据格式 */
    inheritStyle?: boolean;
    /**  值 */
    value?: string | number;
}
export const valueCalculates = {
    digit: digitCalculates,
    isNumber: data => {
        if (data !== '' && ['number', 'string'].includes(typeof data)) {
            return !isNaN(Number(data));
        }
        return false;
    },
    [DataTypeKey.DATE]: (data: string) => dayjs(data).format('YYYYMMDD'),
    [DataTypeKey.TIME]: (data: string) => dayjs(data).format('YYYY-MM-DD HH:mm:ss'),
    [DataTypeKey.PADSTART]: (data: number) => new BigNumber(data).toString().padStart(2, '0'),
    [DataTypeKey.PP]: (data: number, digit = 2) => digitCalculates(new BigNumber(data).multipliedBy(100), digit) + 'pp',
    [DataTypeKey.PERCENT]: (data: number, digit = 2) => digitCalculates(new BigNumber(data).multipliedBy(100), digit) + '%',
    [DataTypeKey.SEPARATEBYK]: (data: number, digit = 2) => new BigNumber(data).toFormat(digit),
    [DataTypeKey.ABBR]: (data: number, digit = 2, units: UnitVo[] = baseUnits) => {
        let vo = units[0];
        for (let i = 0; i < units.length; i++) {
            if (data <= units[i].max) {
                vo = units[i];
                break;
            }
        }
        return digitCalculates(new BigNumber(data).dividedBy(vo.quotient), digit) + vo.unit;
    },
};
/**
 * string 直接进行数字展示，不需要格式化，但对小数点位数敏感。
 * number 直接进行字符串内容展示，前端不需要处理数据格式，空串可根据需要显示为“-”
 */
export const valueNormalized = (vo: NormalizedVo, units = baseUnits) => {
    if (vo) {
        const { value, digit = 2 } = vo;
        const dataType = vo.dataType as DataTypeKey;
        if (![DataTypeKey.STRING].includes(dataType) && valueCalculates.isNumber(value)) {
            let method = DataTypeKey.DIGIT;
            const ages: unknown[] = [value, digit];
            if (Reflect.has(valueCalculates, dataType)) {
                method = dataType;
                if (dataType === DataTypeKey.ABBR) {
                    ages.push(units);
                }
            }
            return valueCalculates[method](...ages);
        }
        return value;
    }
    return '-';
};
export const replaceStylesheetRules = (style: { [key: string]: string[][] }) => {
    const styleSheets = getStylesheet();
    for (let i = 0; i < styleSheets.length; i++) {
        const styleSheet = styleSheets[i];
        const cssRules = styleSheet.cssRules;
        for (let k = 0; k < cssRules.length; k++) {
            const cssRule = cssRules.item(k);
            const styles = style[cssRule!['selectorText']];
            if (styles) {
                styles.forEach(style => {
                    cssRule!['style'].setProperty(style[0], style[1]);
                });
            }
        }
    }
};
export const upCssRules = (styles: { key: string; cssText: string }) => {
    const styleSheets = getStylesheet();
    for (let i = 0; i < styleSheets.length; i++) {
        const styleSheet = styleSheets[i];
        const cssRules = styleSheet.cssRules;
        for (let k = 0; k < cssRules.length; k++) {
            const cssRule = cssRules.item(k);
            if (cssRule!['selectorText'] === styles.key) {
                styleSheet.deleteRule(k);
                styleSheet.insertRule(styles.cssText, cssRules.length);
                return;
            }
        }
    }
};

/**
 * 配合ResizeObserver使用，规避【ResizeObserver - loop limit exceeded】error
 * 报错原因是监视器捕获不到在小于一帧以内发生的变化，这个错误并不会影响页面的正常加载和渲染
 * https://stackoverflow.com/questions/49384120/resizeobserver-loop-limit-exceeded
 * @param cb
 * @returns resize func
 */
export function makeSafelyResizeCallback(cb: () => void) {
    return (entries: Parameters<ResizeObserverCallback>[0]) => {
        window.requestAnimationFrame(() => {
            if (!Array.isArray(entries) || !entries.length) {
                return;
            }
            cb && cb();
        });
    };
}
