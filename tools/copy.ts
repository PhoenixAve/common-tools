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

export default {
    async copyImg(url: string, onSuccess, onError): Promise<void> {
        try {
            const base64Url: string = await this.urlToBase64(url);
            const data = await fetch(base64Url);
            const blob = await data.blob();
            const item = new window.ClipboardItem({
                [blob.type]: blob,
            });
            const clipboard = navigator.clipboard;
            if (clipboard) {
                await clipboard.write([item]);
                onSuccess();
            } else {
                throw new Error("浏览器不支持clipboard，请点击图片右键使用复制图片功能或者使用谷歌浏览器");
            }
        } catch (error) {
            onError(error);
        }
    },
    async copy(url: string, onSuccess, onError): Promise<void> {
        const clipboard = navigator.clipboard;
        if (clipboard) {
            await clipboard.writeText(url);
            onSuccess();
        } else {
            this.execCommandCopy(url, onSuccess, onError);
        }
    },
    execCommandCopy(url: string, onSuccess, onError): void {
        try {
            // 创建一个input框
            const hiddenInput: HTMLInputElement = document.createElement('input');
            // 赋值
            hiddenInput.setAttribute('value', url);
            // 把input添加到body中
            document.body.appendChild(hiddenInput);
            // 选中input框，取值复制
            hiddenInput.select();
            document.execCommand('copy', false);
            // 删除input框
            document.body.removeChild(hiddenInput);
            onSuccess();
        } catch (error) {
            onError();
        }
    },
    async downloadImg(url: string, fileName: string): Promise<void> {
        const base64Url: string = await this.urlToBase64(url);
        const a = document.createElement('a');
        const event = new MouseEvent('click');
        a.download = fileName;
        a.href = base64Url;
        a.dispatchEvent(event);
    },
    urlToBase64(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = function () {
                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                (canvas.getContext('2d') as CanvasRenderingContext2D).drawImage(image, 0, 0);
                const result = canvas.toDataURL('image/png');
                resolve(result);
            };
            image.setAttribute("crossOrigin", 'Anonymous');
            image.src = url;
            image.onerror = () => {
                reject(new Error('图片流异常，有可能是图片地址无效'));
            };
        });
    }
};
