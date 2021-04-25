# mapData

## 概述

mapData 是一个对象映射函数，功能是用语义化的配置来对数据结构进行转换、裁剪、组装等工作。

函数接收两个参数，第一个参数是原始数据，第二个参数转换配置，输出是换后的对象。

## 安装

```bash
npm i @u10/map-data
```

## API
```ts
function mapData<S, T> (
  data: S,
  mapping: MappingConfig,
  ctx: Context<S> = {}
): T;

type Convertor<S = any, T = any> = (v: S, ctx: Context<T> & InnerContext) => T;

export type MappingConfig = string // key 值
  | boolean | number | symbol | Map<unknown, unknown> | Set<unknown> | BigInt | [unknown] // 原值
  | Convertor // 转换器
  | [string | Convertor, MappingConfig | Convertor | { [key: string]: MappingConfig }, (Filter | ExtraConfig)?] // 递归映射或数据转换
  | { [key: string]: string | MappingConfig } // 映射
```
## 基础使用
### 简单映射

```js
mapData({ a: 100, b: 200 }, { x: 'a', y: 'b' })
// 输出 { x: 100, y: 200 }

mapData(
  { a: 100, b: 200 },
  {
    val: {
      x: 'a',
      y: 'b'
    }
  }
)
// 输出 { val: { x: 100, y: 200 } }


mapData(
  {
    a: {
      b: {
        c: 666
     }
   }
  },
  'a.b.c'
)
// 输出 666
```

### 默认值

```js
mapData(
  { a: 100, b: 200 },
  {
    val: {
      x: 'a',
      y: 'b',
      z: ['z', undefined, { defaultValue: 300 }]
    }
  }
)
// 输出 { val: { x: 100, y: 200, z: 300 } }
```

### 数组映射
```js
mapData(
  [
    { val: 1 },
    { val: 2 },
    { val: 3 }
  ],
  ['', { value: 'val' }]
)
// 输出 [
//   { value: 1 },
//   { value: 2 },
//   { value: 3 }
// ]

mapData(
  [
    { val: 1 },
    { val: 2 },
    { val: 3 }
  ],
  ['', 'val']
)
// 输出 [ 1, 2, 3 ]

mapData(
  [ 1, 2, 3 ],
  ['', { value: '' }]
)
// 输出 [
//   { value: 1 },
//   { value: 2 },
//   { value: 3 }
// ]
```

### 数组元素过滤

```js
mapData(
  [
    { val: 1 },
    { val: 2 },
    { val: 3 }
  ],
  ['', { value: 'val' }, (item) => item.val % 2 === 1]
)
// 输出 [
//   { value: 1 },
//   { value: 3 }
// ]

mapData(
  [
    { val: 1 },
    { val: 2 },
    { val: 3 }
  ],
  ['', 'val', {
    filter: (item) => item.val < 3
  }]
)
// 输出 [
//   { value: 1 },
//   { value: 2 }
// ]
```
### 数组元素排序

```js
mapData(
  [
    { val: 1 },
    { val: 2 },
    { val: 3 }
  ],
  ['', 'val', {
    sorter: (a, b) => b.val - a.val
  }]
)
// 输出 [
//   { value: 3 },
//   { value: 2 },
//   { value: 1 }
// ]
```

### 数组元素统计

```js
mapData(
  [
    { val: 1 },
    { val: 2 },
    { val: 3 }
  ],
  {
    sum: ['', 'val', {
      reducer: (prev, cur, index) => prev + cur
    }]
  }
)
// 输出 {
//  sum: 6
// }

mapData(
  [
    { val: 1 },
    { val: 2 },
    { val: 3 }
  ],
  {
    sum: ['', 'val', {
      reducer: [(prev, cur, index) => prev + cur, 100]
    }]
  }
)
// 输出 {
//  sum: 106
// }
```

### 类型转换

使用以下映射前缀，可以进行基础数据类型转换

* ``@`` 转换为字符串
*  ``#`` 转换为数值
* ``&`` 转换为布尔

```js
mapData({ val: 100 }, '@val')
// 输出 ’100‘

mapData({ val: '100' }, '#val')
// 输出 100

mapData({ val: '100' }, '&val')
// 输出 true

mapData(100, '@')
// 输出 '100'

mapData('100', '#')
// 输出 100

mapData(100, '&')
// 输出 true
```

### 切换上下文

```js
mapData({
  a: {
    b: {
      c: {
        x: 100,
        y: 200
      }
    }
  }
}, ['a.b.c', {
  m: 'x',
  n: 'y',
}])
// 输出 { m: 100, n: 200 }

mapData({
  a: {
    b: {
      c: [
        {
          x: 100
        },
        {
          x: 200
        }
      ]
    }
  }
}, ['a.b.c', {
  val: 'x'
}])
// 输出 [{ val: 100 }, { val: 200 }]
```

## 复杂映射

### 使用模板语法

在模板中可以直接使用当前上下文的属性，另外内置两个特殊函数

* get(key) 返回当前上下文对象的指定属性
* root(key) 返回根上下文对象的指定属性

> 模板语法支持特殊前缀，前缀转义方法为双写
> 支持数组语法

```js
mapData({
  user: {
    name: '张三',
    age: 18
  },
  addr: {
    city: '北京市',
    area: '朝阳区'
  }
}, {
  userInfo: '${user.name} ${user.age}岁 家庭住址: ${addr.city}, ${addr.area}'
})
// 输出 { userInfo: '张三 18岁 家庭住址: 北京市, 朝阳区' }

mapData({
  user: {
    name: '张三',
    age: 18
  },
  addr: {
    city: '北京市',
    area: '朝阳区'
  }
}, {
  userInfo: [ 'user', '${name} ${age}岁 家庭住址: ${root("addr.city")}, ${root("addr.area")}' ]
})
// 输出 { userInfo: '张三 18岁 家庭住址: 北京市, 朝阳区' }

mapData({
  a: 100,
  b: 200
}, {
  'a+b': '#${a + b}'
})
// 输出 { 'a+b': 300 }

mapData({
  arr: [{
    name: '张三'
  }, {
    name: '李四'
  }]
}, {
  user2: 'arr[1].name'
})
// 输出 { user2: '李四' }

mapData({
  '#a': '100',
  '@b': 200,
  '&c': 300
}, {
  'x': '##a',
  'y': '@@b',
  'z': '&&c'
})
// 输出 { x: '100', y: 200, z: 300 }
```

### 使用转换函数

```js
mapData({
  a: 100,
  arr: [1, 2, 3]
}, {
  array: ['arr', (v, { root }) => ({
    'v*v': v * v,
    'a*v': root('a') * v
  })]
})
// 输出 { array: [{
//  'v*v': 1,
//  'a*v': 100
// }, {
//  'v*v': 4,
//  'a*v': 200
// }, {
//  'v*v': 9,
//  'a*v': 300
// }] }
```

### 扩展模板上下文

在扩展上下文中配置的函数，可在模板函数中调用

```js
mapData({
  a: 100,
  b: 200
}, {
  value: '#${add(a, b)}'
}, {
  add: (x, y) => x + y
})
// 输出 { value: 300 }
```
