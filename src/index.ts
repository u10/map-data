// eslint-disable-next-line @typescript-eslint/no-explicit-any,no-underscore-dangle
function _get<T>(object: any | any[], path: string | string[], defaultValue: T) {
  const pathArray = Array.isArray(path) ? path : path.split('.').filter((key) => key);
  const pathArrayFlat = pathArray.reduce((res, item) => {
    res.push(...item.split('.'));
    return res;
  }, [] as string[]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = pathArrayFlat.reduce((obj: any, key: string) => obj && obj[key], object);
  return result === undefined ? defaultValue : result;
}

export function template(templateString?: string, ctx?: Record<string, unknown>): string {
  if (!templateString || !ctx) {
    return templateString || '';
  }
  const keys = Object.keys(ctx);
  // eslint-disable-next-line no-new-func
  const func = new Function(...keys, `return \`${templateString}\`;`);
  return func(...keys.map((key) => ctx[key]));
}

const safeContext: { [key: string]: undefined } = {};
// eslint-disable-next-line no-undef
Object.keys(window || global || {}).forEach((key) => {
  safeContext[key] = undefined;
});
safeContext.window = undefined;
safeContext.console = undefined;

type InnerContext = {
  get: (key: string) => unknown;
  root: (key: string) => unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Context<T> = Record<string, any> & { root?: T }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Convertor<S = any, T = any> = (v: S, ctx: Context<T> & InnerContext) => T;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Filter<T=any> = (item: T, index: number, array: T[]) => unknown;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sorter<T=any> = (a: T, b: T) => number;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReducerCallback<T=any> = <R> (
  previousValue: R,
  currentValue: T,
  currentIndex: number,
  array: T[]
) => R;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Reducer<T=any> = ReducerCallback<T> | [ReducerCallback<T>, any];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtraConfig<T=any> = {
  filter?: Filter<T>;
  sorter?: Sorter<T>;
  reducer?: Reducer<T>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultValue?: any;
}

export type MappingConfig = string // key 值
  | boolean | number | symbol | Map<unknown, unknown> | Set<unknown> | BigInt | [unknown] // 原值
  | Convertor // 转换器
  | [
      string
      | Convertor, MappingConfig
      | Convertor
      | { [key: string]: MappingConfig }, (Filter | ExtraConfig)?
  ] // 递归映射或数据转换
  | { [key: string]: string | MappingConfig } // 映射

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function get(object: unknown, path?: string, defaultValue?: unknown): any {
  return path === '' || path === undefined ? object : _get(object, path, defaultValue);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isMappingObject(obj: any): obj is { [key: string]: MappingConfig } {
  return obj && obj.constructor === Object;
}

function getContext<T>(data: T, ctx: Context<T>, isTemplateContext = false) {
  const baseContext = isTemplateContext
    ? {
      ...safeContext,
      ...(typeof data === 'object' ? data : undefined),
    }
    : undefined;
  return {
    ...baseContext,
    ...ctx,
    value: data,
    get: (key: string, defaultValue?: unknown) => get(data, key, defaultValue),
    root: (key: string, defaultValue?: unknown) => get(ctx.root, key, defaultValue),
  };
}
const convertors: { [key: string]: Convertor | undefined } = {
  '@': (v, ctx) => (ctx.convertorOptions && ctx.dayjs
    ? ctx.dayjs(v).format(ctx.convertorOptions)
    : String(v)),
  '#': Number,
  '&': (v: unknown) => v !== 'false' && Boolean(v),
};

export default function mapData<S, T>(
  data: S,
  mapping: MappingConfig,
  ctx: Context<S> = {},
): T {
  ctx.root = ctx.root || data;
  if (mapping === undefined) {
    // 未配置，返回源数据
    return data as unknown as T;
  } if (typeof mapping === 'string') {
    let convertor;
    let convertorOptions;
    if (mapping[0] !== mapping[1]) {
      // 无双写转义的情况
      const matchs = /^(@|#|&)(?:|{([^\\]*)})([^}]+)$/.exec(mapping);
      if (matchs) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [_, name, opts, key] = matchs;
        convertor = convertors[name];
        if (convertor) {
          // eslint-disable-next-line no-param-reassign
          mapping = key;
          convertorOptions = opts;
        }
      }
    } else {
      // 处理双写转义
      // eslint-disable-next-line no-param-reassign
      mapping = mapping.replace(/^([&#@]){2}/, '$1');
    }
    const ret = mapping.match(/\$\{[^}]+\}/)
      ? template(mapping, getContext(data, ctx, true))
      : get(data, mapping);
    return convertor ? convertor(ret, getContext(data, { ...ctx, convertorOptions })) : ret;
  } if (typeof mapping === 'function') {
    return mapping(data, getContext(data, ctx)) as unknown as T;
  } if (isMappingObject(mapping)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = {} as any;
    // eslint-disable-next-line no-restricted-syntax
    for (const key of Object.keys(mapping)) {
      result[key] = mapData(data, mapping[key], ctx);
    }
    return result;
  } if (Array.isArray(mapping)) {
    if (mapping.length === 1) {
      return mapping[0] as T;
    }
    const [dataKey, dataMapping] = mapping;
    // eslint-disable-next-line no-nested-ternary
    let value = typeof dataKey === 'string'
      ? get(data, dataKey)
      : typeof dataKey === 'function'
        ? dataKey(data, getContext(data, ctx))
        : dataKey;
    if (value === undefined) {
      // 源数据为 undefined，直接返回 undefined 或默认值
      const extraConfig = mapping[2];
      const defaultValue = typeof extraConfig === 'object' && extraConfig.defaultValue;
      return defaultValue || undefined as unknown as T;
    } if (Array.isArray(value)) {
      // 源数据为数组，递归处理数组内元素
      const extraConfig = mapping[2];
      let filter: Filter | undefined; // Filter
      let sorter: Sorter | undefined; // Sorter
      let reducer: Reducer | undefined; // Reducer
      if (extraConfig) {
        filter = typeof extraConfig === 'function' ? extraConfig : extraConfig.filter;
        sorter = typeof extraConfig === 'function' ? undefined : extraConfig.sorter;
        reducer = typeof extraConfig === 'function' ? undefined : extraConfig.reducer;
      }
      if (filter) {
        // 过滤
        value = value.filter(filter);
      }
      if (sorter) {
        // 排序
        value = value.sort(sorter);
      }
      // 映射
      let result = [];
      // eslint-disable-next-line no-restricted-syntax
      for (const item of value) {
        result.push(mapData(item, dataMapping, ctx));
      }
      if (reducer) {
        // 合成
        if (Array.isArray(reducer)) {
          result = result.reduce(reducer[0], reducer[1]);
        } else {
          result = result.reduce(reducer);
        }
      }
      return result as unknown as T;
    }
    return mapData(value, dataMapping, ctx);
  }
  // 原值
  return mapping as unknown as T;
}

export const mapping = {
  pick(keys: string | string[]): MappingConfig {
    const result: Record<string, string> = {};
    if (typeof keys === 'string') {
      // eslint-disable-next-line no-param-reassign
      keys = keys.split(',');
    }
    keys.forEach((key) => {
      // eslint-disable-next-line no-param-reassign
      key = key.trim();
      result[key] = key;
    });
    return result;
  },
};
