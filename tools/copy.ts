import Vue from 'vue';
import { DirectiveBinding } from 'vue/types/options';

// copy方法
export const copyToClipBoard = (value: string): boolean => {
    try {
        const textarea = document.createElement('textarea'); // 直接构建textarea
        textarea.value = value; // 设置内容
        textarea.style.position = 'absolute';
        textarea.style.zIndex = '-10';
        document.body.appendChild(textarea); // 添加临时实例
        textarea.select(); // 选择实例内容
        const result = document.execCommand('Copy'); // 执行复制
        document.body.removeChild(textarea); // 删除临时实例
        return result;
    } catch (error) {
        return false;
    }
};

// copy指令对象
export const copyDirective = {
    // 第一次绑定时调用，可以在这里做初始化设置
    bind: (el: HTMLElement, { value }: DirectiveBinding) => {
        // console.log('value', value);
        el.dataset.copyValue = value;
        el['_copyHandler'] = e => {
            e.stopPropagation();
            const copyValue = el.dataset.copyValue;
            const Message = Vue.prototype.$mtd.message;
            if (!copyValue) {
                return Message.error('复制内容不存在');
            }
            // ev.stopPropagation();
            if (copyToClipBoard(copyValue)) {
                Message.success('已复制到剪切板');
            } else {
                Message.error('复制失败');
            }
        };
        el.addEventListener('click', el['_copyHandler']);
    },
    // 当传进来的值更新的时候触发
    componentUpdated(el: HTMLElement, { value }: DirectiveBinding) {
        el.dataset.copyValue = value;
    },
    // 指令与元素解绑的时候，移除事件绑定
    unbind(el) {
        el.removeEventListener('click', el['_copyHandler']);
    },
};
