# Changelog

## 1.1.3

- 修复增量翻译时 strictKeySync 过滤掉新增 key 的问题，确保新增/变更 key 能正确写入目标语言文件。

## 1.1.2

- 新增 incremental 参数：可控制是否只翻译新增/变更的 key。
- 新增 strictKeySync 参数：可控制是否严格同步 key，去除多余 key。
- incremental 和 strictKeySync 均作为构造函数参数传入。
- 完善构造函数参数 JSDoc 注释，详细说明各参数类型和用途。
- 更新 README，补充参数说明和用法示例。

---

> 本 Changelog 从 1.1.2 版本开始记录。
