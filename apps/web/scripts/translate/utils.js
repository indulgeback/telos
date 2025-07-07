const fs = require('fs');
const colors = require('colors');

// 文件路径配置
const sourceFile = 'src/lang/en.json';
const targetFile = 'src/lang/zh.json';
const Source = 'en';
const Target = 'zh';

/**
 * 将嵌套的 JSON 对象扁平化
 * @param {Object} obj - 要扁平化的对象
 * @param {string} prefix - 键前缀
 * @param {Object} res - 结果对象
 * @returns {Object} 扁平化的对象
 */
function flatten(obj, prefix = '', res = {}) {
  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      flatten(value, newKey, res);
    } else {
      res[newKey] = value;
    }
  }
  return res;
}

/**
 * 将扁平化的对象重新构建为嵌套结构
 * @param {Object} data - 扁平化的数据
 * @returns {Object} 嵌套结构的对象
 */
function unflatten(data) {
  const result = {};
  for (const flatKey in data) {
    const keys = flatKey.split('.');
    keys.reduce((acc, key, i) => {
      if (i === keys.length - 1) {
        acc[key] = data[flatKey];
      } else {
        acc[key] = acc[key] || {};
      }
      return acc[key];
    }, result);
  }
  return result;
}

/**
 * 读取源语言文件
 * @returns {Object} 解析后的 JSON 对象
 */
function readSourceFile() {
  try {
    return JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
  } catch (error) {
    console.error(colors.red('错误: 无法读取源文件'), sourceFile);
    console.error('错误详情:', error.message);
    process.exit(1);
  }
}

/**
 * 写入翻译结果到目标文件
 * @param {Object} result - 翻译结果对象
 */
function writeTargetFile(result) {
  try {
    fs.writeFileSync(targetFile, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`${colors.green('✓')} 翻译完成，已写入 ${targetFile}`);
  } catch (error) {
    console.error(colors.red('错误: 无法写入目标文件'), targetFile);
    console.error('错误详情:', error.message);
    process.exit(1);
  }
}

/**
 * 翻译单个文本的通用函数
 * @param {Function} translateFunction - 翻译函数
 * @param {string} text - 要翻译的文本
 * @param {string} source - 源语言
 * @param {string} target - 目标语言
 * @returns {Promise<string>} 翻译结果
 */
async function translateText(translateFunction, text, source, target) {
  try {
    return await translateFunction(text, source, target);
  } catch (error) {
    console.error('翻译 API 错误:', error.message);
    throw error;
  }
}

/**
 * 执行翻译流程的通用函数
 * @param {Function} translateFunction - 翻译函数
 * @param {string} translatorName - 翻译器名称
 * @param {number} delay - API 调用间隔（毫秒）
 */
async function executeTranslation(translateFunction, translatorName, delay = 0) {
  try {
    console.log(`开始使用 ${translatorName} 进行翻译...`);

    const source = readSourceFile();
    const flat = flatten(source);
    const translated = {};

    for (const key of Object.keys(flat)) {
      try {
        console.log(`正在翻译: ${key}`);
        const res = await translateText(translateFunction, flat[key], Source, Target);
        translated[key] = res;
        console.log(`${colors.green('✓')} ${flat[key]} => ${res}`);

        // 添加延迟以避免 API 限制
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (e) {
        console.error(`${colors.red('✗')} 翻译失败: ${key}: ${flat[key]}`);
        console.log('失败原因:', e.message);
        translated[key] = flat[key]; // 保留原文
      }
    }

    const result = unflatten(translated);
    writeTargetFile(result);

  } catch (error) {
    console.error('翻译过程中发生错误:', error.message);
    process.exit(1);
  }
}

/**
 * 找出 source 有但 target 没有的 key（扁平化后）
 * @param {Object} sourceFlat
 * @param {Object} targetFlat
 * @returns {Object} 只包含缺失 key 的对象
 */
function findMissingKeys(sourceFlat, targetFlat) {
  const missing = {};
  for (const key in sourceFlat) {
    if (!(key in targetFlat)) {
      missing[key] = sourceFlat[key];
    }
  }
  return missing;
}

/**
 * 只翻译 target 缺失的字段
 * @param {Function} translateFunction
 * @param {string} translatorName
 * @param {number} delay
 */
async function executeIncrementalTranslation(translateFunction, translatorName, delay = 0) {
  try {
    console.log(`开始使用 ${translatorName} 进行增量翻译...`);

    const source = readSourceFile();
    const target = JSON.parse(fs.readFileSync(targetFile, 'utf-8'));
    const sourceFlat = flatten(source);
    const targetFlat = flatten(target);

    const missingFlat = findMissingKeys(sourceFlat, targetFlat);

    if (Object.keys(missingFlat).length === 0) {
      console.log('没有需要增量翻译的字段');
      return;
    }

    const translated = {};
    for (const key of Object.keys(missingFlat)) {
      let res = null;
      let success = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`正在翻译: ${key} (第${attempt}次尝试)`);
          res = await translateText(translateFunction, missingFlat[key], Source, Target);
          translated[key] = res;
          console.log(`${colors.green('✓')} ${missingFlat[key]} => ${res}`);
          success = true;
          break;
        } catch (e) {
          console.error(`${colors.red('✗')} 翻译失败: ${key}: ${missingFlat[key]} (第${attempt}次)`);
          console.log('失败原因:', e.message);
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 失败后延迟1秒重试
          }
        }
      }
      if (!success) {
        translated[key] = missingFlat[key]; // 三次都失败，保留原文
        console.error(`${colors.red('✗')} ${key} 翻译三次均失败，保留原文`);
      }
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // 合并翻译结果到 targetFlat
    const mergedFlat = { ...targetFlat, ...translated };
    const result = unflatten(mergedFlat);
    writeTargetFile(result);

  } catch (error) {
    console.error('增量翻译过程中发生错误:', error.message);
    process.exit(1);
  }
}

module.exports = {
  flatten,
  unflatten,
  readSourceFile,
  writeTargetFile,
  translateText,
  executeTranslation,
  sourceFile,
  targetFile,
  Source,
  Target,
  findMissingKeys,
  executeIncrementalTranslation
}; 