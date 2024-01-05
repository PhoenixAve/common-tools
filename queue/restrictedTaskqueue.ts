/**
 * 按指定最大执行数量在空闲时间执行函数，避免影响主线程渲染
 */

"use strict";

// requestIdleCallback的兼容性处理
if (typeof window.requestIdleCallback !== 'function') {
    window.requestIdleCallback = function (handler) {
        const startTime = Date.now();
        return setTimeout(() => {
            handler({
                didTimeout: false,
                timeRemaining: () => {
                    return Math.max(0, 50.0 - (Date.now() - startTime));
                }
            });
        }, 1) as unknown as number;
    };
}

// 每个任务函数的callback参数类型
type RTQTaskCallbackVo = (result: unknown) => void
// runByBatch的回调函数类型
type RTQBantchResultCallbackVo = (result: Array<unknown>, start: number, end: number) => void
// runByStream的回调函数类型
type RTQStreamResultCallbackVo = (result: unknown, index: number) => void
// 每个任务函数的类型
type RTQTaskVo = (callback: RTQTaskCallbackVo) => unknown | Promise<unknown>
// 运行方式类型
type RTQRunType = 'requestIdleCallback' | 'setTimeout' | 'requestAnimationFrame';
// 实例配置
interface RTQOptionsVo {
    // 执行方式
    runType?: RTQRunType,
    // 当runType=requestIdleCallback时，可以设置timeout，指定任务的强制执行时间
    timeout?: number
}
// 运行参数
interface RTQRunOptionsVo extends RTQOptionsVo {
    limit?: number
}

/**
 * 按照最大并行执行数量批量执行非主要任务
 * 文档：https://km.sankuai.com/collabpage/1387072510
 */
export class RestrictedTaskQueue {
    #tasks: Array<RTQTaskVo> = [];
    #limit = 1;
    #options: RTQOptionsVo = {
        runType: 'requestIdleCallback',
    };
    #results: Array<unknown> = [];
    #isAbort = false;
    constructor(limit = 1, options?: RTQOptionsVo) {
        this.#limit = limit || 1;
        Object.assign(this.#options, options);
    }
    // 一次性设置任务
    setTasks(tasks: RTQTaskVo[]) {
        this.#tasks = tasks;
        this.#results = [];
    }
    // 一个个添加任务
    add(task: RTQTaskVo) {
        this.#tasks.push(task);
    }
    // 停止队列的执行
    abort() {
        this.#isAbort = true;
        this.#empty();
    }
    #empty() {
        this.#tasks = [];
        this.#results = [];
    }
    #runBefore() {
        this.#results = [];
        this.#isAbort = false;
    }
    #runFinished(resolve: (value: unknown[] | PromiseLike<unknown[]>) => void) {
        resolve(this.#results);
        this.#empty();
    }
    // 流式执行，不会因为某一个任务的阻塞而阻塞整个流程
    runByStream(callback?: RTQStreamResultCallbackVo, options?: RTQRunOptionsVo): Promise<unknown[]> {
        const limit = options?.limit || this.#limit;
        this.#runBefore();
        return new Promise((resolve, reject) => {
            try {
                let offset = 0;
                let finishedCount = 0;
                const taskLength = this.#tasks.length;
                const highWaterMark = Math.min(limit, taskLength);
                const runTask = (index: number) => {
                    if (this.#isAbort) return this.#runFinished(resolve);
                    const task = this.#tasks[index];
                    const next = (result: unknown) => {
                        // 说明当前任务已经执行完毕
                        this.#runCallback(callback, result, index);
                        this.#results[index] = result;
                        finishedCount++;
                        if (finishedCount >= taskLength) {
                            this.#runFinished(resolve);
                            return;
                        }
                        if (offset < taskLength && !this.#isAbort) {
                            runTask(offset++);
                        }
                    };
                    this.#runTask(task, next, options);
                };
                // 确保同步队列可以按照预期顺利执行
                offset = highWaterMark;
                for (let index = 0; index < highWaterMark; index++) {
                    runTask(index);
                }
            } catch (error) {
                reject(error);
            }
        });
    }
    // 批量执行，如果某一个任务比较耗时，会导致后续任务一直等待
    runByBatch(callback?: RTQBantchResultCallbackVo, options?: RTQRunOptionsVo): Promise<unknown[]> {
        const limit = options?.limit || this.#limit;
        this.#runBefore();
        return new Promise((resolve, reject) => {
            try {
                const taskLength = this.#tasks.length;
                const start = 0;
                const end = Math.min(limit, taskLength);
                const runTask = (start: number, end: number) => {
                    if (this.#isAbort) return this.#runFinished(resolve);
                    if (start >= end) {
                        this.#runFinished(resolve);
                        return;
                    }
                    const needRunTasks = this.#tasks.slice(start, end);
                    const taskResult: Array<unknown> = [];
                    let finishedCount = 0;
                    const next = (index) => (result) => {
                        taskResult[index] = result;
                        finishedCount++;
                        // 这里不能用taskResult.length去进行比较，因为可能数组先执行完最后一个，此时数组只有一个数，但是长度等于needRunTasks.length
                        if (needRunTasks.length === finishedCount) {
                            // 本轮任务执行完成， 开始进行下一轮
                            this.#runCallback(callback, taskResult, start, end - 1);
                            this.#results.push(...taskResult);
                            start = end;
                            end += Math.min(limit, taskLength - end);
                            runTask(start, end);
                        }
                    };
                    needRunTasks.forEach((task, index) => {
                        this.#runTask(task, next(index));
                    });
                };
                runTask(start, end);
            } catch (error) {
                reject(error);
            }
        });
    }
    // 执行每一个任务
    #runTask(task: RTQTaskVo, next: RTQTaskCallbackVo, options?: RTQOptionsVo) {
        if (this.#isAbort || typeof task !== 'function') return;
        const callback = () => {
            task(next);
        };
        const { runType, timeout } = Object.assign({}, this.#options, options);
        switch (runType) {
            case 'setTimeout':
                setTimeout(callback, 0);
                break;
            case 'requestAnimationFrame':
                requestAnimationFrame(callback);
                break;
            case 'requestIdleCallback':
            default:
                requestIdleCallback(callback, { timeout });
                break;
        }
    }
    // 确保用户传入的回调为函数
    #runCallback(callback: unknown, ...args: unknown[]) {
        if (typeof callback === 'function') {
            callback(...args);
        }
    }
}
