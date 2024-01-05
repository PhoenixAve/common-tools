## 目的

通过限制非高优先级任务的最大并行数量，以及任务执行时机，降低对页面渲染性能的影响

## 详细设计

### 思路

- 先对非高优先级任务进行收集，然后由用户手动执行
- 通过设置最大并行数，保证任务不会因为同时执行导致主线程阻塞
- 安排任务在合适时间执行，减少对渲染流程的干扰，减少页面卡顿
- 提供流式运行及批量运行两种情况，满足不同需求

### 核心

- 通过 requestIdleCallback / requestAnimationFrame / setTimeout 将任务放在浏览器合适的时间执行
  - requestIdleCallback ​默认执行方式
    - 执行时机：在浏览器空闲时间执行
    - 注意事项：https://developer.mozilla.org/zh-CN/docs/Web/API/Background_Tasks_API
      - 并不能保证每轮任务循环都会被执行，取决于浏览器是否有空闲时间，除非设置了timeout（表示多少秒后强制执行，非必要情况下不要设置）
      - 任务执行时间最好不要超过50ms，否则会让用户感觉到卡顿
      - 如果要在任务中做影响页面布局的事情，请放到requestAnimationFrame里进行修改
    - requestAnimationFrame
      - 执行时机：在浏览器下一帧开始绘制之前执行
      - 注意事项：当在后台标签页或者隐藏的 iframe 里运行时，会被暂停调用以提升性能和电池寿命。
    - setTimeout
      - 执行时机：下一轮eventLoop的开始执行
      - 注意事项：
        - 实际执行时间会比预期有最低4ms的延迟
        - 当浏览器不支持requestIdleCallback时，会采用该方式

- 两种执行模式
  - runByStream(callback?: (result: unknown, index: number) => void, options?: RunOptionsVo): Promise<Array<unknown>> ​推荐方式
    - 一开始按照设置的最大并行数量执行一批任务，当任务里的任何一个任务执行完成，会立即执行下一个任务，直到任务全部执行完成，如果有一个任务比较耗时，只会影响最终执行总时长，不会阻塞其他任务的执行
    - 每执行完成一个任务会通过callback返回任务的执行结果，以及本任务在队列中的位置
  - runByBatch(callback?: (result: Array<unknown>, start: number, end: number) => void, options?: RunOptionsVo): Promise<Array<unknown>>
    - 按照设置的最大并行数量批量执行任务，一批执行完成之后才会执行下一批，如果某一批里有一个任务比较耗时，会阻塞下一轮任务的执行
    - 每一轮执行完成会通过callback返回本轮任务的执行结果，以及本批任务在队列中的起始位置和结束位置
  - 两种执行方式的共同点
    - 函数会返回一个promise，等所有任务执行完成之后，会resolve所有任务的执行结果
    - 如果传入第二个参数options，则可以覆盖初始化实例时的options设置，让实例可以不断被复用，而无需重新初始化
  - 其他
    - 两种执行方式都无法保证任务的执行顺序
    - 如果对任务执行顺序没有要求的话，建议使用runByStream
    - 如果对顺序有严格要求，可以通过函数返回的结果一次性拿到，如果觉得全部执行完再拿结果比较慢，可以使用runByBatch的回调函数分批拿到带顺序的结果
   
## 使用方式

```javascript
// 设置最大并行数量为10，采用默认的运行方式:requestIdleCallback
const rtq = new RestrictedTaskQueue(10);

// 添加任务，还可以通过setTasks函数一次性设置任务
for (let index = 0; index < 10; index++) {
  rtq.add((callback) => {
    setTimeout(() => {
      // callback必须被调用，否则无法继续执行下一个任务，参数为任务执行的结果
      callback(index);
    })
  })
}
// 开始执行任务

// =============================runByStream 模式===============================
// 简单调用
rtq.runByStream().then(data => {
  console.log(`所有执行结果为${data}`);
});
// 每次任务执行完成，做一些操作，可以通过传入callback
rtq.runByStream((res, index) => {
  // runByStream模式下本函数的操作也可以放到任务执行callback(result)之前，没什么区别
  console.log(`任务${index}的执行结果为${res}`);
}, {
  // 重新设置配置，覆盖初始化时的配置
  limit: 3 // 重新指定最大并行数量为3
}).then(data => {
  console.log(`所有执行结果为${data}`);
})

// =============================runByBatch 模式===============================
// 每次任务执行完成，做一些操作，可以通过传入callback
rtq.runByBatch((res, start, end) => {
  console.log(`本批次任务的执行结果为${res}，从位置${start}到${end}`);
}, {
  // 重新设置配置，覆盖初始化时的配置
  limit: 3 // 重新指定最大并行数量为3
}).then(data => {
  console.log(`所有执行结果为${data}`);
})
```

