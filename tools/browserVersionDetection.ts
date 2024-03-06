import { userInfo } from "../../store/userInfo";
import { lxTrack } from "../public_service";

type BrowserBrand = 'IE' | 'Chrome' | 'Firefox' | 'Opera' | 'Safari' | 'Edge';

type TestCase = { brand: BrowserBrand, is: (...args) => boolean, version: () => string }

type Theme = 'dark' | 'light';

export type CheckConfig = {
    /** 浏览器品牌 */
    brandVersionMap?: { [k in BrowserBrand]?: number }
    /** 页面主题 */
    theme?: Theme;
}

interface CheckForAppMountConfig extends CheckConfig {
    mountFn: () => void;
}

interface CheckForTipsConfig extends Omit<CheckConfig, 'theme'> {
    callback: () => void;
}
const SYSTEM_OS_URL = (() => {
    const agent = navigator.userAgent.toLowerCase();
    const urls = {
        'linux': 'https://google.cn/intl/zh-CN/chrome',
        'mac': 'https://update-assets.sankuai.com/it/%E5%8A%9E%E5%85%AC%E8%BD%AF%E4%BB%B6/%E7%AC%AC%E4%B8%89%E6%96%B9%E8%BD%AF%E4%BB%B6/Chrome/GoogleChrome-107.0.5304.87.pkg',
        'win32': 'https://update-assets.sankuai.com/it/%E5%8A%9E%E5%85%AC%E8%BD%AF%E4%BB%B6/%E7%AC%AC%E4%B8%89%E6%96%B9%E8%BD%AF%E4%BB%B6/Chrome/googlechromestandaloneenterprise-107.0.5304.88.msi',
        'win64': 'https://update-assets.sankuai.com/it/%E5%8A%9E%E5%85%AC%E8%BD%AF%E4%BB%B6/%E7%AC%AC%E4%B8%89%E6%96%B9%E8%BD%AF%E4%BB%B6/Chrome/googlechromestandaloneenterprise64-107.0.5304.88.msi',
    };
    if (agent.indexOf('win32') >= 0 || agent.indexOf('wow32') >= 0) {
        return urls['win32'];
    }
    if (agent.indexOf('win64') >= 0 || agent.indexOf('wow64') >= 0) {
        return urls['win64'];
    }
    if (/macintosh|mac os x/i.test(agent)) {
        return urls['mac'];
    }
    return urls['linux'];
})();
class Browser {
    private platform = '';
    private version = '';
    private minVersion = -1;
    private brand = '' as BrowserBrand;
    private UserAgent = '';
    static USERAGENT_INFO = window.navigator.userAgent;
    private testCases: TestCase[] = [
        {
            brand: 'IE',
            is: () => "ActiveXObject" in window,
            version: () => this.UserAgent.match(/(msie\s|trident.*rv:)([\w.]+)/)[2]
        },
        {
            brand: 'Chrome',
            is: () => this.UserAgent.indexOf('chrome') > -1 && this.UserAgent.indexOf('safari') > -1,
            version: () => this.UserAgent.match(/chrome\/([\d.]+)/)[1]
        },
        {
            brand: 'Firefox',
            is: () => this.UserAgent.indexOf('firefox') > -1,
            version: () => this.UserAgent.match(/firefox\/([\d.]+)/)[1]
        },
        {
            brand: 'Opera',
            is: () => this.UserAgent.indexOf('opera') > -1,
            version: () => this.UserAgent.match(/opera\/([\d.]+)/)[1]
        },
        {
            brand: 'Safari',
            is: () => this.UserAgent.indexOf('safari') > -1 && this.UserAgent.indexOf('chrome') == -1,
            version: () => this.UserAgent.match(/safari\/([\d.]+)/)[1]
        },
        {
            brand: 'Edge',
            is: () => this.UserAgent.indexOf('edg') > -1,
            version: () => this.UserAgent.match(/edg\/([\d.]+)/)[1]
        },
    ]

    constructor() {
        this.setUserAgent();
        this.setCurrent();
    }

    /**
     * 手动设置userAgent信息
     * @param ua
     */
    setUserAgent(ua: string = Browser.USERAGENT_INFO) {
        this.UserAgent = ua.toLowerCase();
    }

    private setCurrent() {
        const target = this.testCases.find(v => v.is());
        if (target) {
            this.brand = target.brand;
            this.version = target.version().split('.')[0];
            this.platform = window.navigator.platform;
        } else {
            this.brand = 'Unknown' as BrowserBrand;
            this.version = '-1';
            this.platform = 'Unknown';
        }
    }

    /**
     * 灵犀track事件，用于track用户点击按钮事件
     */
    lxTrack() {
        lxTrack('moduleClick', this.eventBID, {
            custom: { ...this.current, mis_id: userInfo.user.misId, biz_id: this.lxname },
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            mis_id: userInfo.user.misId,
        }, { cid: this.eventCID });
    }

    /**
     * 判断是不是指定品牌的浏览器 且大于等于指定版本号
     * @param brand 品牌
     * @param minVersion 最小的版本号
     * @returns true | false
     */
    test(brand: BrowserBrand, minVersion?: number) {
        const target = this.testCases.find(v => v.brand === brand);
        if (target) {
            if (minVersion !== undefined) {
                return target.is() && Number(target.version().split('.')[0]) >= minVersion;
            }
            return target.is();
        }

        throw new Error("not found specified brand and version browser!");

    }

    private getPageTemplate(theme: Theme) {
        return `
        <div class="browser-inner-box">
            <img class="pic" src="${theme === 'dark' ? this.imgSrcDark : this.imgSrcLight}" alt="${this.btnTxt}"  theme="${theme}"/>
            <div class="title" theme="${theme}">${this.title}</div>
            <div class="desc" theme="${theme}">${this.desc}</div>
            <a class="btn" href="${this.downloadUrl}" target="_blank" type="upBrowser">${this.btnTxt}</a>
        </div>
        `;
    }

    private createDownloadPage(theme: Theme) {
        const styleNode = document.createElement('style');
        styleNode.innerText = `
        .browser-container{
            text-align:center;
            height:100vh;
            display:flex;
            align-items:center;
            justify-content:center;
            background-color:transparent;
        }
        .browser-container .browser-inner-box .pic{
            display:inline-block;
        }
        .browser-container .browser-inner-box .title{
            font-weight: 500;
            font-family: PingFangSC-Medium;
            font-size: 18px;
            letter-spacing: 0;
            line-height: 1.4;
               color: rgba(0,0,0,0.84);
        }
        .browser-container .browser-inner-box .desc{
            font-weight: 400;
            font-family: PingFangSC-Regular;
            font-size: 14px;
            text-align: center;
            line-height: 22px;
            margin-top:18px;
            color: rgba(0,0,0,0.84);
        }
        .browser-container .browser-inner-box .title[theme=dark]{
            color: rgba(255,255,255,0.84);
        }
        .browser-container .browser-inner-box .desc[theme=dark]{
            color: rgba(255,255,255,0.84);
        }
        .browser-container .browser-inner-box .btn{
            width:220px;
            height:32px;
            line-height:32px;
            background: #166FF7;
            display:inline-block;
            border-radius:4px;
            font-weight: 500;
            font-family: PingFangSC-Medium;
            font-size: 14px;
            color: rgba(255,255,255,0.88) !important;
            letter-spacing: 0;
            text-align: center;
            text-decoration: none !important;
            margin-top:24px;
        }
        `;
        const head = document.querySelector('head');
        head.append(styleNode);

        const container = document.createElement('div');
        container.classList.add('browser-container');
        container.innerHTML = this.getPageTemplate(theme);
        container.addEventListener('click', this.doTrack.bind(this), false);

        document.body.append(container);
    }

    private doTrack(e) {
        if (e.target.getAttribute('type') === 'upBrowser') {
            this.lxTrack();
        }
    }
    /**
     * 检查是否符合浏览器版本和品牌 符合才执行mountFn
     * 目标是在app挂在前拦截挂载，用于提示用户更新浏览器
     * @param config
     */
    checkForAppMount(config: CheckForAppMountConfig) {
        const { brandVersionMap, theme = 'light', mountFn } = config;
        let shouldMount = true;
        for (const brand in brandVersionMap) {
            this.minVersion = Number(brandVersionMap[brand]);
            if (brand === this.current.brand) {
                shouldMount = this.test(brand as BrowserBrand, this.minVersion);
            }
        }

        if (shouldMount) {
            mountFn();
        } else {
            this.createDownloadPage(theme);
        }
    }
    /**
     * 检查是否符合浏览器版本和品牌 不符合才执行callback
     * 目标是在app挂在后，用于提示用户更新浏览器
     * @param config
     */
    checkForTips(config: CheckForTipsConfig) {
        const { brandVersionMap, callback } = config;
        let noTips = true;
        for (const brand in brandVersionMap) {
            const version = brandVersionMap[brand];
            if (brand === this.current.brand) {
                noTips = this.test(brand as BrowserBrand, version);
            }
        }

        if (!noTips) {
            callback();
        }
    }

    get lxname() {
        const name = document.querySelector('head').querySelector('meta[name=appName]').getAttribute('content');
        const title = document.querySelector('title').innerText.trim();
        return name || title;
    }
    get title() {
        return '当前浏览器版本较低';
    }
    get desc() {
        return `很抱歉，您当前的浏览器版本（版本${this.current.version}）较低，这可能会影响系统功能的正常使用。<br/>为获得更好的体验，建议升级至新版的Chrome浏览器（至少版本${this.minVersion}）。感谢您的理解与支持！`;
    }
    get btnTxt() {
        return '升级Chrome';
    }
    get downloadUrl() {
        return SYSTEM_OS_URL;
    }
    get imgSrcDark() {
        return 'https://s3plus.meituan.net/v1/mss_0a7f4c7b6e8342d9985d10a078f28f6f/production/images/browser_dark.svg';
    }
    get imgSrcLight() {
        return 'https://s3plus.meituan.net/v1/mss_0a7f4c7b6e8342d9985d10a078f28f6f/production/images/browser_light.svg';
    }
    get eventCID() {
        return 'c_databp_tnjss36d';
    }
    get eventBID() {
        return 'b_databp_06t7izhb_mc';
    }
    get current() {
        return {
            platform: this.platform,
            version: Number(this.version),
            brand: this.brand,
        };
    }
}

export const browser = new Browser();

