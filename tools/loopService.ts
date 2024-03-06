const config = {
    id: 0,
    taskCount: 0,
    maxSize: 60 * 1000,
};
const callbacks: Map<
    string,
    {
        vo: LoopServiceVo;
        callback: (vo: LoopServiceVo) => void;
    }
> = new Map();
const Run = (task: { vo: LoopServiceVo; callback: (vo: LoopServiceVo) => void }) => {
    const { vo, callback } = task;
    vo.now = Date.now();
    callback(vo);
};
const guid = () => {
    // 产生ID
    return 'xxxxxx4xxyxxxxx'
        .replace(/[xy]/g, (c: string) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        })
        .toUpperCase();
};
/**
 * 停止定时器任务（当无轮询任务停止定时器）
 */
const stopLoopService = () => {
    clearTimeout(config.id);
    document.removeEventListener('visibilitychange', visibilityChange);
};
/**
 * 后台唤起执行一次对非冻结任务全部执行一次，并且启动定时器轮询
 */
const startLoopService = () => {
    document.addEventListener('visibilitychange', visibilityChange);
    runLoopService(); //启动更新
};
/**
 * 轮询检测执行任务
 */
const runLoopService = () => {
    const now = Date.now();
    clearTimeout(config.id);
    if (!(document.visibilityState === 'visible')) return;
    //页面激活状态
    console.log('执行轮询', new Date().toLocaleTimeString());
    for (const task of callbacks.values()) {
        const vo = task.vo;
        // 命中触发规则 防止时间段重复触发（例如：分钟取模5执行 12:05 01 ~ 12:05 59 5秒轮询会触发多次，所以控制执行间隔大于设定）
        if (!vo.isFreeze && vo.rule(vo) && now - vo.now > vo.maxSize) {
            Run(task);
        }
    }
    // setInterval可能发生积压
    config.id = window.setTimeout(runLoopService, 5000);
    if (config.taskCount < 1) {
        // 当没有任务时停止轮询
        console.log('无执行任务停止定时轮询');
        stopLoopService();
    }
};
/**
 * 页面状态处理
 */
const visibilityChange = () => {
    if (document.visibilityState !== 'visible') {
        //清理定时器
        console.log('页面冻结停止定时轮询', new Date().toLocaleTimeString());
        clearTimeout(config.id);
        return;
    }
    for (const item of callbacks.values()) {
        const { vo, callback } = item;
        if (!vo.isFreeze) {
            callback(vo);
        }
    }
    runLoopService();
    //页面激活启动定时轮询
    console.log('页面激活启动定时轮询', new Date().toLocaleTimeString());
};
export interface LoopServiceVo {
    id: string;
    now: number;
    maxSize: number;
    isFreeze: boolean;
    rule: (vo: LoopServiceVo) => boolean;
}
export const LoopService = {
    /**
     * 自定义规则校验执行定时器 例如分钟取模5执行
     * @param callback 任务回调
     * @param rule 校验规则
     * @param maxSize 执行任务时间差，避免时间段内重复触发
     * @returns
     */
    addRule(
        callback: (vo: LoopServiceVo) => void,
        rule: (vo: LoopServiceVo) => boolean,
        maxSize = config.maxSize,
    ): string {
        const id = guid();
        callbacks.set(id, {
            callback,
            vo: {
                id,
                rule,
                maxSize,
                now: Date.now(),
                isFreeze: false,
            },
        });
        config.taskCount++;
        if (config.taskCount === 1) {
            // 添加任务开启定时轮询
            startLoopService();
        }
        return id;
    },
    /**
     * 间隔定时器执行例如 5秒 10秒
     * @param callback 任务回调
     * @param time 时间间隔，最小间隔5秒钟
     * @returns
     */
    addInterval(callback: (vo: LoopServiceVo) => void, time = 5000) {
        return this.addRule(callback, () => true, time);
    },
    run(id: string) {
        if (this.has(id)) {
            const { vo, callback } = callbacks.get(id);
            callback(vo);
        }
    },
    delete(id: string): boolean {
        if (this.has(id)) {
            config.taskCount--;
            return callbacks.delete(id);
        }
        return false;
    },
    has(id: string): boolean {
        return callbacks.has(id);
    },
    freeze(id: string, isAct = true) {
        if (this.has(id)) {
            callbacks.get(id).vo.isFreeze = isAct;
        }
    },
};
