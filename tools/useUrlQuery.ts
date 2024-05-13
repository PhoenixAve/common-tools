import { get, set } from 'lodash-es';
import VueRouter, { Route } from 'vue-router';

/**
 * 存储页面查询参数的状态钩子函数，路由下多个组件公用参数
 * @returns
 */
export const usePageQueryInfo = (() => {
    let queryParams = {};
    return (router: VueRouter, route: Route) => {
        const getQueryParamsValue = (path: string): string => {
            const params = route.query.params as string;
            queryParams = JSON.parse(params || '{}');
            return get(queryParams, path);
        };
        const setQueryParamsValue = (path: string, value: unknown) => {
            set(queryParams, path, value);
            replaceRouter();
        };
        const resetQueryParams = () => {
            queryParams = {};
            replaceRouter();
        };
        const replaceRouter = () => {
            const query = { ...route.query };
            if (Object.keys(queryParams).length > 0) {
                query.params = JSON.stringify(queryParams);
            } else {
                delete query.params;
            }
            router.replace({
                path: route.path,
                query,
            });
        };
        return {
            getQueryParamsValue,
            setQueryParamsValue,
            resetQueryParams,
            replaceRouter,
        };
    };
})();
