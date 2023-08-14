<template>
    <div
        class="fullscreen-container"
        ref="fullScreenContainerRef"
        :class="{ [`${fullScreenClassName} bg-white`]: isFullScreen }"
    >
        <slot :toggleFullScreen="toggleFullScreen" :isFullScreen="isFullScreen"></slot>
    </div>
</template>

<script lang="ts">
import { Component, Ref, Vue } from 'vue-property-decorator';

@Component
export default class FullScreenContainer extends Vue {
    @Ref() private readonly fullScreenContainerRef!: HTMLDivElement;
    private isFullScreen = false;
    private readonly fullScreenClassName = 'full-screen';
    // 当前元素是否需要处理全屏事件
    private isNeedFullScreenAction = false;
    // 是否是采用浏览器原生的全屏API
    private isNativeFullScreenAction = true;
    private mounted() {
        if (document.body.requestFullscreen) {
            document.addEventListener('fullscreenchange', this.changeFullscreenElement, false);
        }
    }
    private beforeDestroy() {
        document.removeEventListener('fullscreenchange', this.changeFullscreenElement, false);
    }
    private changeFullscreenElement() {
        if (!document.fullscreenElement) {
            // 退出了全屏，移除全屏样式
            this.isFullScreen = false;
            this.isNativeFullScreenAction = true;
            this.fullScreenContainerRef.classList.remove(this.fullScreenClassName);
        }
        // 不是原生的退出全屏，需要看是不是需要处理当前事件操作
        if (!this.isNeedFullScreenAction) return;
        if (this.isNativeFullScreenAction === false && this.isFullScreen) {
            // 说明是通过定位修改的样式，没有走浏览器原生的全屏API
            this.isFullScreen = false;
            this.fullScreenContainerRef.classList.remove(this.fullScreenClassName);
        } else if (document.fullscreenElement && !this.isFullScreen) {
            // 需要全屏，增加全屏的样式
            this.isFullScreen = true;
            this.fullScreenContainerRef.classList.add(this.fullScreenClassName);
        }
        this.isNeedFullScreenAction = false;
    }
    private toggleFullScreen() {
        this.isNeedFullScreenAction = true;
        if (!document.fullscreenElement) {
            // 没有全屏元素，直接采用浏览器原生的全屏API
            this.isNativeFullScreenAction = true;
            document.body.requestFullscreen();
        } else if (!this.isFullScreen) {
            // 当前已经有元素全屏了，此时只需要设置定位即可
            this.isNativeFullScreenAction = false;
            this.changeFullscreenElement();
        } else {
            // 退出全屏
            this.exitFullscreen();
        }
    }
    // 退出全屏
    private exitFullscreen() {
        if (this.isNativeFullScreenAction) {
            // 原生的全屏
            document.exitFullscreen();
        } else {
            // 直接修改定位即可
            this.changeFullscreenElement();
            // 退出全屏需要重置判断条件，需要重置判断条件
            this.isNativeFullScreenAction = true;
        }
    }
}
</script>

<style lang="less" scoped>
.fullscreen-container {
    ::v-deep {
        ::-webkit-scrollbar {
            display: none;
        }
    }
}
.fullscreen-container.full-screen {
    position: fixed !important;
    z-index: 999;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 12px;
    overflow: auto;
}
</style>
