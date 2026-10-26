/*! scenario-test v0.8.0 */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/blueimp-md5/js/md5.js
var require_md5 = __commonJS({
  "node_modules/blueimp-md5/js/md5.js"(exports2, module2) {
    (function($) {
      "use strict";
      function safeAdd(x, y) {
        var lsw = (x & 65535) + (y & 65535);
        var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return msw << 16 | lsw & 65535;
      }
      function bitRotateLeft(num, cnt) {
        return num << cnt | num >>> 32 - cnt;
      }
      function md5cmn(q, a, b, x, s, t) {
        return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
      }
      function md5ff(a, b, c, d, x, s, t) {
        return md5cmn(b & c | ~b & d, a, b, x, s, t);
      }
      function md5gg(a, b, c, d, x, s, t) {
        return md5cmn(b & d | c & ~d, a, b, x, s, t);
      }
      function md5hh(a, b, c, d, x, s, t) {
        return md5cmn(b ^ c ^ d, a, b, x, s, t);
      }
      function md5ii(a, b, c, d, x, s, t) {
        return md5cmn(c ^ (b | ~d), a, b, x, s, t);
      }
      function binlMD5(x, len) {
        x[len >> 5] |= 128 << len % 32;
        x[(len + 64 >>> 9 << 4) + 14] = len;
        var i;
        var olda;
        var oldb;
        var oldc;
        var oldd;
        var a = 1732584193;
        var b = -271733879;
        var c = -1732584194;
        var d = 271733878;
        for (i = 0; i < x.length; i += 16) {
          olda = a;
          oldb = b;
          oldc = c;
          oldd = d;
          a = md5ff(a, b, c, d, x[i], 7, -680876936);
          d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
          c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
          b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
          a = md5ff(a, b, c, d, x[i + 4], 7, -176418897);
          d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
          c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341);
          b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
          a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416);
          d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
          c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
          b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
          a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
          d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
          c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
          b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);
          a = md5gg(a, b, c, d, x[i + 1], 5, -165796510);
          d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
          c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
          b = md5gg(b, c, d, a, x[i], 20, -373897302);
          a = md5gg(a, b, c, d, x[i + 5], 5, -701558691);
          d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
          c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
          b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
          a = md5gg(a, b, c, d, x[i + 9], 5, 568446438);
          d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
          c = md5gg(c, d, a, b, x[i + 3], 14, -187363961);
          b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
          a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467);
          d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
          c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473);
          b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);
          a = md5hh(a, b, c, d, x[i + 5], 4, -378558);
          d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
          c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562);
          b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
          a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060);
          d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
          c = md5hh(c, d, a, b, x[i + 7], 16, -155497632);
          b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
          a = md5hh(a, b, c, d, x[i + 13], 4, 681279174);
          d = md5hh(d, a, b, c, x[i], 11, -358537222);
          c = md5hh(c, d, a, b, x[i + 3], 16, -722521979);
          b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
          a = md5hh(a, b, c, d, x[i + 9], 4, -640364487);
          d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
          c = md5hh(c, d, a, b, x[i + 15], 16, 530742520);
          b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);
          a = md5ii(a, b, c, d, x[i], 6, -198630844);
          d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
          c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905);
          b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
          a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571);
          d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
          c = md5ii(c, d, a, b, x[i + 10], 15, -1051523);
          b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
          a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359);
          d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
          c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380);
          b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
          a = md5ii(a, b, c, d, x[i + 4], 6, -145523070);
          d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
          c = md5ii(c, d, a, b, x[i + 2], 15, 718787259);
          b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);
          a = safeAdd(a, olda);
          b = safeAdd(b, oldb);
          c = safeAdd(c, oldc);
          d = safeAdd(d, oldd);
        }
        return [a, b, c, d];
      }
      function binl2rstr(input) {
        var i;
        var output = "";
        var length32 = input.length * 32;
        for (i = 0; i < length32; i += 8) {
          output += String.fromCharCode(input[i >> 5] >>> i % 32 & 255);
        }
        return output;
      }
      function rstr2binl(input) {
        var i;
        var output = [];
        output[(input.length >> 2) - 1] = void 0;
        for (i = 0; i < output.length; i += 1) {
          output[i] = 0;
        }
        var length8 = input.length * 8;
        for (i = 0; i < length8; i += 8) {
          output[i >> 5] |= (input.charCodeAt(i / 8) & 255) << i % 32;
        }
        return output;
      }
      function rstrMD5(s) {
        return binl2rstr(binlMD5(rstr2binl(s), s.length * 8));
      }
      function rstrHMACMD5(key, data) {
        var i;
        var bkey = rstr2binl(key);
        var ipad = [];
        var opad = [];
        var hash;
        ipad[15] = opad[15] = void 0;
        if (bkey.length > 16) {
          bkey = binlMD5(bkey, key.length * 8);
        }
        for (i = 0; i < 16; i += 1) {
          ipad[i] = bkey[i] ^ 909522486;
          opad[i] = bkey[i] ^ 1549556828;
        }
        hash = binlMD5(ipad.concat(rstr2binl(data)), 512 + data.length * 8);
        return binl2rstr(binlMD5(opad.concat(hash), 512 + 128));
      }
      function rstr2hex(input) {
        var hexTab = "0123456789abcdef";
        var output = "";
        var x;
        var i;
        for (i = 0; i < input.length; i += 1) {
          x = input.charCodeAt(i);
          output += hexTab.charAt(x >>> 4 & 15) + hexTab.charAt(x & 15);
        }
        return output;
      }
      function str2rstrUTF8(input) {
        return unescape(encodeURIComponent(input));
      }
      function rawMD5(s) {
        return rstrMD5(str2rstrUTF8(s));
      }
      function hexMD5(s) {
        return rstr2hex(rawMD5(s));
      }
      function rawHMACMD5(k, d) {
        return rstrHMACMD5(str2rstrUTF8(k), str2rstrUTF8(d));
      }
      function hexHMACMD5(k, d) {
        return rstr2hex(rawHMACMD5(k, d));
      }
      function md52(string, key, raw) {
        if (!key) {
          if (!raw) {
            return hexMD5(string);
          }
          return rawMD5(string);
        }
        if (!raw) {
          return hexHMACMD5(key, string);
        }
        return rawHMACMD5(key, string);
      }
      if (typeof define === "function" && define.amd) {
        define(function() {
          return md52;
        });
      } else if (typeof module2 === "object" && module2.exports) {
        module2.exports = md52;
      } else {
        $.md5 = md52;
      }
    })(exports2);
  }
});

// src/node.js
var node_exports = {};
__export(node_exports, {
  ASSERTION_META_KEYS: () => ASSERTION_META_KEYS,
  ASSERTION_OPERATORS: () => ASSERTION_OPERATORS,
  CONTRACT_VERSION: () => CONTRACT_VERSION,
  GLOBAL_TYPES: () => GLOBAL_TYPES,
  IDCARD_TEST_REGIONS: () => IDCARD_TEST_REGIONS,
  PHONE_TEST_PREFIXES: () => PHONE_TEST_PREFIXES,
  RESERVED_VARS: () => RESERVED_VARS,
  SAVED_RESPONSE: () => SAVED_RESPONSE,
  TIMESTAMP_FORMAT_PATTERN: () => TIMESTAMP_FORMAT_PATTERN,
  TIMESTAMP_OFFSET_UNITS: () => TIMESTAMP_OFFSET_UNITS,
  USCC_ALPHABET: () => USCC_ALPHABET,
  VERSION: () => VERSION,
  appendGlobalQuery: () => appendGlobalQuery,
  appendQueryPairs: () => appendQueryPairs,
  applyExtract: () => applyExtract,
  applyGeneratedVar: () => applyGeneratedVar,
  assertNoReservedVars: () => assertNoReservedVars,
  assertNotReservedVar: () => assertNotReservedVar,
  buildAssertions: () => buildAssertions,
  buildCapabilities: () => buildCapabilities,
  buildChinaIdNumber: () => buildChinaIdNumber,
  buildUrl: () => buildUrl,
  buildUsccCode: () => buildUsccCode,
  clearAdapters: () => clearAdapters,
  clearScenarios: () => clearScenarios,
  clone: () => clone,
  contract: () => contract,
  createApp: () => createApp,
  createEngine: () => createEngine,
  createNodeIo: () => createNodeIo,
  createRuntime: () => createRuntime,
  defineConfig: () => defineConfig,
  defineScenario: () => defineScenario,
  evalExpression: () => evalExpression,
  evaluateAssertion: () => evaluateAssertion,
  evaluateWhen: () => evaluateWhen,
  executeDefinitionFile: () => executeDefinitionFile,
  formatAssertionContext: () => formatAssertionContext,
  formatDuration: () => formatDuration,
  formatTimestamp: () => formatTimestamp,
  gb11643Checksum: () => gb11643Checksum,
  generateSignature: () => generateSignature,
  getAdapter: () => getAdapter,
  getByPath: () => getByPath,
  getConfig: () => getConfig,
  getHeaderByPath: () => getHeaderByPath,
  getScenario: () => getScenario,
  hasHeader: () => hasHeader,
  headerValue: () => headerValue,
  headersToObject: () => headersToObject,
  isGlobalParam: () => isGlobalParam,
  isPlainObject: () => isPlainObject,
  joinUrl: () => joinUrl,
  listAdapters: () => listAdapters,
  loadConfigFile: () => loadConfigFile,
  loadScenarioFile: () => loadScenarioFile,
  luhnCheckDigit: () => luhnCheckDigit,
  maskSecret: () => maskSecret,
  md5: () => md5,
  mergeGlobals: () => mergeGlobals,
  normalizeByteLimit: () => normalizeByteLimit,
  normalizeEnumDefinition: () => normalizeEnumDefinition,
  normalizeGlobalParam: () => normalizeGlobalParam,
  normalizeWhenDefinition: () => normalizeWhenDefinition,
  parseBody: () => parseBody,
  parseTimestampOffset: () => parseTimestampOffset,
  pickWeightedIndex: () => pickWeightedIndex,
  queryKeys: () => queryKeys,
  queryPairs: () => queryPairs,
  registerAdapter: () => registerAdapter,
  registerConfig: () => registerConfig,
  registerScenario: () => registerScenario,
  renderCapabilitiesText: () => renderCapabilitiesText,
  resolve: () => resolve,
  resolveClone: () => resolveClone,
  resolveString: () => resolveString,
  runScenario: () => runScenario,
  sanitizeSensitive: () => sanitizeSensitive,
  seedToIndex: () => seedToIndex,
  seedToUnit: () => seedToUnit,
  setRuntimeVar: () => setRuntimeVar,
  splitUrlFragment: () => splitUrlFragment,
  tokenizePath: () => tokenizePath,
  unregisterAdapter: () => unregisterAdapter,
  usccCheckChar: () => usccCheckChar,
  validateAdapter: () => validateAdapter,
  validateAdapterResponse: () => validateAdapterResponse,
  validateAssertion: () => validateAssertion
});
module.exports = __toCommonJS(node_exports);

// src/core.js
var import_blueimp_md5 = __toESM(require_md5(), 1);

// src/version.generated.js
var VERSION = "0.8.0";

// src/contract.js
var CONTRACT_VERSION = 14;
var contract = Object.freeze({
  contractVersion: CONTRACT_VERSION,
  runtimeVersion: VERSION,
  // 运行时要求（与 package.json engines 保持一致，doctor 据此校验 Node 版本）
  engines: Object.freeze({ node: ">=18" }),
  assertions: Object.freeze({
    // 断言对象允许的元数据键（非操作符键）
    metaKeys: Object.freeze(["name", "path", "from", "target", "header", "implicit"]),
    // 断言目标 target 的取值：status=HTTP 状态码，duration=本次请求耗时（毫秒，引擎挂载在 response.durationMs）
    targets: Object.freeze(["status", "duration"]),
    // 断言数据来源 from 的取值（缺省按 body 取值）
    from: Object.freeze(["body", "vars", "headers", "bodyText"]),
    // from:"headers" 配 path 时首段按 HTTP 头名大小写不敏感匹配（HTTP 头名不区分大小写，
    // HTTP/2 响应头全小写），与 header 简写、extract 的 from:"headers" 同口径；
    // 首段之后的子路径在头值上取，from:"response" 与模板 lastResponse.headers.* 仍按精确键匹配
    note: 'from: "headers" \u914D path \u65F6\u9996\u6BB5\u5934\u540D\u5927\u5C0F\u5199\u4E0D\u654F\u611F\u5339\u914D\uFF08\u4E0E header \u7B80\u5199\u3001extract \u540C\u53E3\u5F84\uFF09\uFF1B\u9996\u6BB5\u540E\u7684\u5B50\u8DEF\u5F84\u5728\u5934\u503C\u4E0A\u53D6\uFF0Cfrom: "response" \u4E0E\u6A21\u677F lastResponse.headers.* \u4ECD\u6309\u7CBE\u786E\u952E\u5339\u914D',
    // 断言操作符：键为操作符名；valueType 描述期望值类型约束，
    // finiteNumber 表示实际值与期望值都必须是有限 number（不做字符串隐式转换）
    operators: Object.freeze({
      exists: Object.freeze({
        description: "\u5B57\u6BB5\u5B58\u5728\u4E14\u975E null/\u7A7A\u4E32\uFF08exists: true\uFF09\uFF0C\u6216\u4E0D\u5B58\u5728\uFF08exists: false\uFF09",
        valueType: "boolean"
      }),
      equals: Object.freeze({
        description: "\u5B9E\u9645\u503C\u4E0E\u671F\u671B\u503C JSON \u6DF1\u6BD4\u8F83\u76F8\u7B49",
        valueType: "any"
      }),
      notEquals: Object.freeze({
        description: "\u5B9E\u9645\u503C\u4E0E\u671F\u671B\u503C JSON \u6DF1\u6BD4\u8F83\u540E\u53D6\u53CD",
        valueType: "any"
      }),
      includes: Object.freeze({
        description: "\u6570\u7EC4\u5305\u542B\u671F\u671B\u9879\uFF0C\u6216\u5B57\u7B26\u4E32\u5305\u542B\u671F\u671B\u5B50\u4E32",
        valueType: "any"
      }),
      each: Object.freeze({
        description: "\u6570\u7EC4\u9010\u9879\u65AD\u8A00\uFF1A\u5B9E\u9645\u503C\u5FC5\u987B\u662F\u6570\u7EC4\uFF0Cexpected \u4E3A\u5B50\u65AD\u8A00\u5B9A\u4E49\u5BF9\u8C61\u6216\u5176\u6570\u7EC4\uFF0C\u5BF9\u6BCF\u4E2A\u5143\u7D20\u5957\u7528\u5B50\u65AD\u8A00\uFF08\u5B50\u65AD\u8A00 path \u76F8\u5BF9\u5143\u7D20\u81EA\u8EAB\uFF0C\u671F\u671B\u503C\u652F\u6301\u6A21\u677F\u53D8\u91CF\uFF09\uFF1B\u4EFB\u4E00\u5143\u7D20\u4EFB\u4E00\u5B50\u65AD\u8A00\u5931\u8D25\u5219\u6574\u4F53\u5931\u8D25\uFF0C\u7A7A\u6570\u7EC4\u6052\u901A\u8FC7\uFF0C\u975E\u6570\u7EC4\u5B9E\u9645\u503C\u76F4\u63A5\u5931\u8D25",
        valueType: "assertion"
      }),
      matches: Object.freeze({
        description: "\u6B63\u5219\u8868\u8FBE\u5F0F\u5339\u914D\u5B57\u7B26\u4E32\u5316\u540E\u7684\u5B9E\u9645\u503C",
        valueType: "string"
      }),
      oneOf: Object.freeze({
        description: "\u5B9E\u9645\u503C\u5C5E\u4E8E\u671F\u671B\u5019\u9009\u6570\u7EC4\u4E4B\u4E00\uFF08\u6DF1\u6BD4\u8F83\uFF09",
        valueType: "array"
      }),
      startsWith: Object.freeze({
        description: "\u5B57\u7B26\u4E32\u5316\u540E\u7684\u5B9E\u9645\u503C\u4EE5\u671F\u671B\u503C\u5F00\u5934\uFF08\u5927\u5C0F\u5199\u654F\u611F\uFF1Bnull/undefined \u5B9E\u9645\u503C\u89C6\u4E3A\u7A7A\u4E32\uFF09",
        valueType: "string"
      }),
      endsWith: Object.freeze({
        description: "\u5B57\u7B26\u4E32\u5316\u540E\u7684\u5B9E\u9645\u503C\u4EE5\u671F\u671B\u503C\u7ED3\u5C3E\uFF08\u5927\u5C0F\u5199\u654F\u611F\uFF1Bnull/undefined \u5B9E\u9645\u503C\u89C6\u4E3A\u7A7A\u4E32\uFF09",
        valueType: "string"
      }),
      length: Object.freeze({
        description: "\u6570\u7EC4\u5143\u7D20\u4E2A\u6570 / \u5B57\u7B26\u4E32\u5B57\u7B26\u6570 / \u5BF9\u8C61\u952E\u6570\u7B49\u4E8E\u671F\u671B\u503C\uFF1B\u975E\u5BB9\u5668\u7C7B\u578B\uFF08number/boolean/null\uFF09\u76F4\u63A5\u5931\u8D25",
        valueType: "finiteNumber"
      }),
      gt: Object.freeze({
        description: "\u5B9E\u9645\u503C\u5927\u4E8E\u671F\u671B\u503C",
        valueType: "finiteNumber"
      }),
      gte: Object.freeze({
        description: "\u5B9E\u9645\u503C\u5927\u4E8E\u7B49\u4E8E\u671F\u671B\u503C",
        valueType: "finiteNumber"
      }),
      lt: Object.freeze({
        description: "\u5B9E\u9645\u503C\u5C0F\u4E8E\u671F\u671B\u503C",
        valueType: "finiteNumber"
      }),
      lte: Object.freeze({
        description: "\u5B9E\u9645\u503C\u5C0F\u4E8E\u7B49\u4E8E\u671F\u671B\u503C",
        valueType: "finiteNumber"
      })
    }),
    // 只接受有限 number 的操作符（与 operators 中 valueType: "finiteNumber" 一致）
    numericOperators: Object.freeze(["gt", "gte", "lt", "lte"])
  }),
  when: Object.freeze({
    // when 对象形式的来源：vars=已提取变量；lastResponse=上一步响应 body（path 子路径取值口径同 extract from:"body"）；status=上一步 HTTP 状态码（数值）
    sources: Object.freeze(["vars", "lastResponse", "status"]),
    // when 对象形式也可用 target 读取上一步响应级通道，目前仅 status（与断言 target 白名单的 status 对齐）
    targets: Object.freeze(["status"]),
    note: 'when \u5BF9\u8C61\u5F62\u5F0F\u652F\u6301 from: vars / lastResponse / status\uFF08lastResponse \u53D6\u4E0A\u4E00\u6B65\u54CD\u5E94 body\uFF0Cstatus \u53D6\u4E0A\u4E00\u6B65 HTTP \u72B6\u6001\u7801\uFF09\uFF0C\u4E5F\u53EF\u7528 target: "status" \u8BFB\u53D6\u4E0A\u4E00\u6B65\u72B6\u6001\u7801\uFF1B\u7B2C\u4E00\u6B65\u65E0\u4E0A\u4E00\u6B65\u54CD\u5E94\u65F6\u6309\u6765\u6E90\u7F3A\u5931\u5904\u7406\u3001\u6761\u4EF6\u4E0D\u6210\u7ACB\uFF0C\u4E0D\u4E2D\u65AD\u573A\u666F\u3002\u975E\u5BF9\u8C61\u5F62\u5F0F\uFF08\u6A21\u677F\u5B57\u7B26\u4E32/\u5E03\u5C14\uFF09\u4FDD\u6301\u771F\u503C\u8BED\u4E49'
  }),
  extract: Object.freeze({
    // extract 项允许的键（与断言 metaKeys 同思路：未识别键定义期即拒，
    // 防止 heder/fromm 等拼错静默落到默认 body 来源）
    metaKeys: Object.freeze(["name", "path", "from", "target", "header", "required", "default"]),
    // extract 支持的来源（默认 body）
    // from:"headers" 配 path 时首段头名按大小写不敏感匹配（与断言 from:"headers"、header 简写同口径）；
    // 首段之后的子路径在头值上取，from:"response" 仍按精确键匹配
    from: Object.freeze(["body", "headers", "bodyText", "response"]),
    // extract 支持的目标（与断言 targets 的子集：status=HTTP 状态码）
    targets: Object.freeze(["status"]),
    // required 语义：路径不存在时 required: true 使当前步骤失败，默认缺失产生 warning
    required: "boolean",
    // default 语义：路径不存在时取声明的兜底值（支持模板），与 required 互斥
    default: "any",
    note: 'required: true \u4E14\u8DEF\u5F84\u4E0D\u5B58\u5728\u65F6\u5F53\u524D\u6B65\u9AA4\u5931\u8D25\uFF1B\u58F0\u660E default \u65F6\u7F3A\u5931\u53D6\u515C\u5E95\u503C\uFF08\u652F\u6301\u6A21\u677F\u3001\u4E0D\u4EA7\u751F warning\uFF09\uFF1B\u5426\u5219\u7F3A\u5931\u4EA7\u751F warning\uFF08\u4E0D\u542B\u54CD\u5E94\u5185\u5BB9\uFF09\uFF0C\u53D8\u91CF\u4E3A undefined\uFF1Brequired \u4E0E default \u4E92\u65A5\uFF0C\u53EA\u80FD\u58F0\u660E\u5176\u4E00\uFF1Bfrom: "headers" \u914D path \u65F6\u9996\u6BB5\u5934\u540D\u5927\u5C0F\u5199\u4E0D\u654F\u611F\u5339\u914D\uFF08\u4E0E\u65AD\u8A00 from: "headers"\u3001header \u7B80\u5199\u540C\u53E3\u5F84\uFF09\uFF0C\u9996\u6BB5\u540E\u7684\u5B50\u8DEF\u5F84\u5728\u5934\u503C\u4E0A\u53D6\uFF0Cfrom: "response" \u4ECD\u6309\u7CBE\u786E\u952E\u5339\u914D'
  }),
  // 运行时自动生成的保留变量：禁止在 vars/envVars/generatedVars/extract 中声明或覆盖。
  // __proto__/constructor/prototype 为原型链安全键：声明同名变量会触发对象原型
  // 改写（写入）或取到继承成员（读取），使断言结果被污染，一并禁止
  reservedVars: Object.freeze(["runId", "runNo", "__proto__", "constructor", "prototype"]),
  generatedVars: Object.freeze({
    types: Object.freeze(["timestamp", "uuidHex", "md5", "signature", "idcard", "luhn", "phone", "uscc", "uuid", "enum"]),
    note: "\u8BC1\u4EF6/\u5361\u53F7/\u53F7\u7801\u7C7B\u6D4B\u8BD5\u9020\u6570\uFF08\u987A\u5E8F\u7801\u4E0E\u4E2D\u95F4\u6570\u5B57\u5747\u7531 runId \u4E0E\u53D8\u91CF\u540D\u786E\u5B9A\u6027\u6D3E\u751F\uFF1A\u6BCF\u8F6E\u53D8\u5316\u3001\u8F6E\u5185\u4E0D\u540C\u540D\u53D8\u91CF\u4E92\u5F02\uFF0C\u649E\u4E1A\u52A1\u552F\u4E00\u7EA6\u675F\u65F6\u91CD\u8DD1\u5373\u6362\u53F7\uFF09\u3002 idcard\uFF1A\u4E2D\u56FD\u5927\u9646 18 \u4F4D\u8EAB\u4EFD\u8BC1\u53F7\uFF0CbirthDate \u5FC5\u586B\uFF08YYYY-MM-DD \u5408\u6CD5\u65E5\u5386\u65E5\u671F\uFF09\u3001gender \u53EF\u9009\uFF08MALE/FEMALE\uFF0C\u9ED8\u8BA4 MALE\uFF09\u3001regionCode \u53EF\u9009\uFF086 \u4F4D\u6570\u5B57\uFF0C\u7F3A\u7701\u4ECE\u771F\u5B9E\u6D4B\u8BD5\u533A\u5212\u6C60\u6309\u8F6E\u6B21\u6D3E\u751F\uFF09\uFF0C\u6821\u9A8C\u4F4D\u6309 GB 11643 \u8BA1\u7B97\u3002 luhn\uFF1A\u94F6\u884C\u5361\u53F7\uFF0Clength \u53EF\u9009\uFF0812-19\uFF0C\u9ED8\u8BA4 16\uFF09\u3001prefix \u53EF\u9009\uFF08\u6570\u5B57\u5361\u5934\uFF0C\u9ED8\u8BA4 62\uFF09\uFF0C\u672B\u4F4D\u6309 Luhn \u7B97\u6CD5\u6821\u9A8C\u3002 phone\uFF1A\u5927\u9646\u624B\u673A\u53F7\uFF081[3-9] \u5F00\u5934 11 \u4F4D\uFF09\uFF0Cprefix \u53EF\u9009\uFF083 \u4F4D\u53F7\u6BB5\uFF0C\u7F3A\u7701\u4ECE\u6D4B\u8BD5\u53F7\u6BB5\u6C60\u6309\u8F6E\u6B21\u6D3E\u751F\uFF09\u3002 uscc\uFF1A\u7EDF\u4E00\u793E\u4F1A\u4FE1\u7528\u4EE3\u7801\uFF0818 \u4F4D\uFF09\uFF0CregionCode \u53EF\u9009\uFF086 \u4F4D\u6570\u5B57\uFF0C\u9ED8\u8BA4 110100\uFF09\uFF0C\u767B\u8BB0\u7BA1\u7406/\u673A\u6784\u7C7B\u522B\u56FA\u5B9A 91\uFF08\u4F01\u4E1A\u6CD5\u4EBA\uFF09\uFF0C\u6821\u9A8C\u4F4D\u6309 GB 32100-2015 \u8BA1\u7B97\u3002 timestamp\uFF1A\u53EF\u9009 offset\uFF08\u76F8\u5BF9\u5F53\u524D\u65F6\u95F4\u7684\u504F\u79FB\uFF0C\u5982 -7d/+8d/30m\uFF0C\u6570\u5B57+\u5355\u4F4D ms/s/m/h/d/w\uFF09\u3001unit\uFF08ms \u9ED8\u8BA4/s\uFF0C\u6570\u503C\u7C92\u5EA6\uFF09\u6216 format\uFF08\u672C\u5730\u65F6\u95F4 token \u7EC4\u5408 YYYY/MM/DD/HH/mm/ss\uFF0C\u5982 YYYY-MM-DD HH:mm:ss\uFF0C\u8F93\u51FA\u5B57\u7B26\u4E32\uFF0C\u4E0E unit \u4E92\u65A5\uFF09\uFF0C\u65F6\u95F4\u7A97\u4E0E\u8FC7\u671F\u7C7B\u53C2\u6570\u65E0\u9700\u5916\u90E8\u62FC\u503C\u3002 uuid\uFF1A\u5E26\u8FDE\u5B57\u7B26 UUID v4\uFF08uuidHex \u4E3A 32 \u4F4D\u65E0\u8FDE\u5B57\u7B26\u5341\u516D\u8FDB\u5236\uFF09\uFF0C\u9002\u914D\u4EE5 UUID \u4E3A\u4E1A\u52A1\u4E3B\u952E\u7684\u63A5\u53E3\u3002 enum\uFF1A\u4ECE values \u5019\u9009\u96C6\u4E2D\u6309 weights\uFF08\u53EF\u9009\u975E\u8D1F\u6570\u5B57\uFF0C\u7F3A\u7701\u7B49\u6743\uFF0C\u6743\u91CD\u4E3A 0 \u8005\u6C38\u4E0D\u88AB\u9009\u4E2D\uFF09\u786E\u5B9A\u6027\u62BD\u53D6\u4E00\u4E2A\u503C\u2014\u2014\u6309 runId \u4E0E\u53D8\u91CF\u540D\u6D3E\u751F\uFF0C\u8F6E\u5185\u7A33\u5B9A\u3001\u8DE8\u8F6E\u53D8\u5316\uFF0C\u9002\u914D\u6E20\u9053/\u72B6\u6001\u7B49\u679A\u4E3E\u7C7B\u53C2\u6570\u9700\u8981\u968F\u673A\u4F46\u53EF\u590D\u73B0\u7684\u573A\u666F"
  }),
  globals: Object.freeze({
    // 全局参数类型：追加到每个请求的 header / cookie / query
    types: Object.freeze(["header", "cookie", "query"]),
    note: "\u5168\u5C40\u53C2\u6570\u652F\u6301 header / cookie / query \u4E09\u79CD\u7C7B\u578B\uFF0C\u6B65\u9AA4\u663E\u5F0F\u58F0\u660E\u6216 URL \u5DF2\u6709\u540C\u540D\u53C2\u6570\u4F18\u5148"
  }),
  config: Object.freeze({
    // 配置对象顶层允许的键：defineConfig 按此名单拒绝拼写错误（requestTimeoutsMs/
    // baseUrll 等），勿在运行时另写第二份名单。envVars 仅保留历史配置兼容，
    // 运行时实际消费的是场景级 envVars。
    configKeys: Object.freeze([
      "envs",
      "defaultEnvKey",
      "globals",
      "vars",
      "scenarioVars",
      "variables",
      "scenarios",
      "requestTimeoutMs",
      "maxResponseBytes",
      "maxUploadBytes",
      "storagePrefix",
      "storageKeys",
      "baseUrl",
      "authorization",
      "nodePlugins",
      "envVars"
    ]),
    // 配置中 scenarios 清单项的字段（file/path 为 url 的兼容回退，不写入契约字段）
    scenarioItemKeys: Object.freeze(["id", "name", "url", "manual"]),
    environmentKeys: Object.freeze(["key", "name", "baseUrl", "globals", "authorization"]),
    variableKeys: Object.freeze(["name", "label", "env", "required", "defaultValue"]),
    baseUrl: Object.freeze({
      protocol: "http(s)",
      note: "\u73AF\u5883 baseUrl \u58F0\u660E\u65F6\u5FC5\u987B\u662F http(s):// URL\uFF1B\u672A\u58F0\u660E\uFF08\u6216\u4E3A\u7A7A\uFF09\u65F6\u56DE\u9000\u9876\u5C42 baseUrl\uFF0C\u4E24\u8005\u90FD\u4E3A\u7A7A\u65F6\u6D4F\u89C8\u5668\u5DE5\u4F5C\u53F0\u4F7F\u7528\u5F53\u524D\u9875\u9762\u5730\u5740\uFF0CCLI run \u4ECD\u9700 --base-url \u6216\u914D\u7F6E baseUrl"
    }),
    manual: Object.freeze({
      type: "boolean",
      note: "manual: true \u8868\u793A\u573A\u666F\u9700\u8981\u4EBA\u5DE5\u51C6\u5907\u6570\u636E\u6216\u5199\u6570\u636E\uFF0C--all \u9ED8\u8BA4\u6392\u9664\uFF0C--scenario <id> \u53EF\u663E\u5F0F\u6267\u884C"
    })
  }),
  retryUntil: Object.freeze({
    keys: Object.freeze(["maxAttempts", "intervalMs", "maxElapsedMs", "retryOn", "intervalFactor", "maxIntervalMs"]),
    // 可重试的失败类型：assertion=断言未通过（历史默认），error=网络/适配器执行异常，timeout=单次请求超时
    retryOn: Object.freeze(["assertion", "error", "timeout"]),
    defaultRetryOn: Object.freeze(["assertion"]),
    note: 'retryOn \u58F0\u660E\u54EA\u4E9B\u5931\u8D25\u7C7B\u578B\u53C2\u4E0E retryUntil \u8F6E\u8BE2\uFF0C\u9ED8\u8BA4 ["assertion"]\uFF08\u4FDD\u6301\u65E2\u6709\u8BED\u4E49\uFF09\u3002\u5305\u542B error/timeout \u65F6\uFF0C\u5355\u6B21\u6267\u884C\u5F02\u5E38/\u8BF7\u6C42\u8D85\u65F6\u4E0D\u518D\u7ACB\u5373\u8DF3\u51FA\uFF0C\u800C\u662F\u8BB0\u5F55\u6700\u8FD1\u4E00\u6B21\u9519\u8BEF\u540E\u7EE7\u7EED\u8F6E\u8BE2\uFF0C\u76F4\u5230 maxAttempts \u6216 maxElapsedMs \u7528\u5C3D\uFF1B\u7528\u6237\u53D6\u6D88\u59CB\u7EC8\u7ACB\u5373\u7EC8\u6B62\u3001\u4E0D\u53C2\u4E0E\u91CD\u8BD5\u3002onAttempt \u56DE\u8C03\u4F1A\u643A\u5E26 errorType/errorMessage\u3002intervalFactor \u53EF\u9009\uFF08\u9ED8\u8BA4 1\uFF0C\u56FA\u5B9A\u95F4\u9694\uFF09\uFF0C\u7B2C n \u6B21\u91CD\u8BD5\u7B49\u5F85 = intervalMs \xD7 intervalFactor^(n-1)\uFF1BmaxIntervalMs \u53EF\u9009\u5C01\u9876\uFF0C\u6700\u7EC8\u4ECD\u53D7 100ms \u4E0B\u9650\u4E0E maxElapsedMs \u603B\u65F6\u957F\u7EA6\u675F'
  }),
  scenario: Object.freeze({
    keys: Object.freeze(["name", "steps", "vars", "envVars", "generatedVars", "failurePolicy"]),
    stepKeys: Object.freeze([
      "name",
      "method",
      "path",
      "params",
      "request",
      "status",
      "assertions",
      "extract",
      "when",
      "retryUntil",
      "timeoutMs",
      "saveResponseAs",
      "adapter"
    ]),
    failurePolicies: Object.freeze(["stop", "continue"])
  }),
  cli: Object.freeze({
    commands: Object.freeze(["run", "serve", "init", "capabilities", "doctor"]),
    options: Object.freeze({
      config: { kind: "value", prop: "config", description: "\u573A\u666F\u914D\u7F6E\u6587\u4EF6" },
      env: { kind: "value", prop: "env", description: "\u914D\u7F6E\u4E2D\u7684\u73AF\u5883 key" },
      "base-url": { kind: "value", prop: "baseUrl", description: "\u4E34\u65F6\u8986\u76D6 Base URL" },
      scenario: { kind: "value", prop: "scenario", description: "\u6267\u884C\u6307\u5B9A\u573A\u666F\uFF08\u53EF\u6267\u884C manual:true \u573A\u666F\uFF09" },
      vars: {
        kind: "value",
        prop: "vars",
        parse: "keyValue",
        repeatable: true,
        description: "\u4E34\u65F6\u6CE8\u5165/\u8986\u76D6\u914D\u7F6E\u53D8\u91CF\uFF08key=value\uFF0C\u53EF\u91CD\u590D\uFF1B\u4F18\u5148\u7EA7\u6700\u9AD8\uFF0C\u503C\u652F\u6301 {{ }} \u6A21\u677F\uFF09"
      },
      timeout: { kind: "value", prop: "timeout", parse: "number", description: "\u672C\u6B21\u6267\u884C\u5168\u5C40\u8BF7\u6C42\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09\uFF0C\u8986\u76D6\u914D\u7F6E requestTimeoutMs" },
      port: { kind: "value", prop: "port", parse: "number", description: "\u6D4F\u89C8\u5668\u670D\u52A1\u7AEF\u53E3\uFF0C\u9ED8\u8BA4 4300" },
      concurrency: { kind: "value", prop: "concurrency", parse: "number", description: "run \u591A\u573A\u666F\u5E76\u53D1\u6570\uFF0C\u9ED8\u8BA4 1\uFF08\u4E32\u884C\uFF09\uFF1B\u573A\u666F\u5185\u6B65\u9AA4\u59CB\u7EC8\u4FDD\u6301\u4E32\u884C" },
      project: { kind: "value", prop: "project", description: "init \u76EE\u6807\u9879\u76EE\u6839\u76EE\u5F55" },
      dir: { kind: "value", prop: "dir", description: "init \u573A\u666F\u6D4B\u8BD5\u76EE\u5F55\u540D" },
      "library-url": { kind: "value", prop: "libraryUrl", description: "init \u8FD0\u884C\u65F6\u526F\u672C\u4E0B\u8F7D\u76EE\u5F55\uFF08CLI/UMD/d.ts/capabilities\uFF0C\u9ED8\u8BA4 GitHub Tag dist\uFF09" },
      all: { kind: "flag", prop: "all", description: "\u6267\u884C\u914D\u7F6E\u4E2D\u7684\u5168\u90E8\u81EA\u52A8\u573A\u666F\uFF08\u9ED8\u8BA4\u6392\u9664 manual:true\uFF09" },
      force: { kind: "flag", prop: "force", description: "init \u8986\u76D6\u5DF2\u6709\u6587\u4EF6\uFF08\u76EE\u6807\u76EE\u5F55\u5DF2\u5B58\u5728\u65F6\u53EF\u4EA4\u4E92\u9009\u62E9\uFF09" },
      "no-input": { kind: "flag", prop: "noInput", description: "init \u975E\u4EA4\u4E92\uFF1A\u76EE\u5F55\u5DF2\u5B58\u5728\u65F6\u6309 keep\uFF08\u4FDD\u7559\u914D\u7F6E\u4E0E\u573A\u666F\uFF0C\u4EC5\u5237\u65B0 AI \u89C4\u5219\u548C\u8FD0\u884C\u65F6\u526F\u672C\uFF09" },
      "fail-on-skip": { kind: "flag", prop: "failOnSkip", description: "\u5B58\u5728\u4EFB\u4F55 SKIP \u6B65\u9AA4\u65F6\u6700\u7EC8\u9000\u51FA\u7801\u4E3A 1" },
      "allow-external-plugins": { kind: "flag", prop: "allowExternalPlugins", description: "\u5141\u8BB8\u52A0\u8F7D\u5916\u90E8\u63D2\u4EF6\uFF08\u6709\u5B89\u5168\u98CE\u9669\uFF09" },
      json: { kind: "flag", prop: "json", description: "run/capabilities/doctor \u8F93\u51FA\u673A\u5668\u53EF\u8BFB JSON\uFF08stdout \u7EAF\u51C0\uFF0C\u4EBA\u7C7B\u53EF\u8BFB\u8FDB\u5EA6\u4E0E\u7ED3\u8BBA\u8D70 stderr\uFF09" },
      token: {
        kind: "value",
        prop: "authorization",
        aliases: ["authorization"],
        description: "\uFF08\u5DF2\u5F03\u7528\uFF09\u547D\u4EE4\u884C\u4F20\u9012\u6388\u6743\u4EE4\u724C\uFF1B\u63A8\u8350 SCENARIO_AUTH \u73AF\u5883\u53D8\u91CF"
      }
    })
  })
});

// src/utils/safe-decode.js
function safeDecodeComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// src/core.js
var GLOBAL_TYPES = [...contract.globals.types];
function isGlobalParam(item) {
  return Boolean(item && GLOBAL_TYPES.includes(item.type) && typeof item.name === "string" && item.name.trim());
}
function normalizeGlobalParam(item) {
  return { type: item.type, name: item.name, value: item.value == null ? "" : String(item.value) };
}
function mergeGlobals(...lists) {
  const merged = /* @__PURE__ */ new Map();
  for (const list of lists) {
    for (const item of list || []) {
      if (!isGlobalParam(item)) continue;
      merged.set(`${item.type}:${item.name}`, normalizeGlobalParam(item));
    }
  }
  return [...merged.values()];
}
function clone(value) {
  return value === void 0 ? void 0 : JSON.parse(JSON.stringify(value));
}
function isPlainObject(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}
var SAVED_RESPONSE = Symbol.for("scenario-test.savedResponse");
function normalizeByteLimit(value) {
  const limit = Number(value);
  return Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0;
}
var PATH_SEGMENT = /[^.\[\]]+/y;
var PATH_BRACKET = /\[(?:-?\d+|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\]/y;
var PATH_TOKEN_CACHE_LIMIT = 256;
var pathTokenCache = /* @__PURE__ */ new Map();
function tokenizePath(valuePath) {
  const rest = String(valuePath);
  if (!pathTokenCache.has(rest)) {
    const tokens = tokenizePathStrict(rest);
    if (pathTokenCache.size >= PATH_TOKEN_CACHE_LIMIT) {
      pathTokenCache.delete(pathTokenCache.keys().next().value);
    }
    pathTokenCache.set(rest, tokens === null ? null : Object.freeze(tokens));
  }
  const cached = pathTokenCache.get(rest);
  return cached === null ? null : [...cached];
}
function tokenizePathStrict(rest) {
  const tokens = [];
  let index = rest.startsWith(".") ? 1 : 0;
  let prevBracket = false;
  while (index < rest.length) {
    const isBracket = rest[index] === "[";
    if (!isBracket && prevBracket) return null;
    const pattern = isBracket ? PATH_BRACKET : PATH_SEGMENT;
    pattern.lastIndex = index;
    const match = pattern.exec(rest);
    if (!match) return null;
    tokens.push(match[0]);
    index += match[0].length;
    prevBracket = isBracket;
    if (rest[index] === ".") {
      index += 1;
      if (index >= rest.length || rest[index] === ".") return null;
      prevBracket = false;
    }
  }
  return tokens.length ? tokens : null;
}
function getByPath(source, valuePath) {
  if (!valuePath) return source;
  const tokens = tokenizePath(valuePath);
  if (!tokens) return void 0;
  let cursor = source;
  for (const token of tokens) {
    if (cursor === void 0 || cursor === null) return void 0;
    const inner = token.startsWith("[") ? token.slice(1, -1) : null;
    if (inner !== null && /^-\d+$/.test(inner) && Array.isArray(cursor)) {
      cursor = cursor[cursor.length + Number(inner)];
      continue;
    }
    const key = inner === null ? token : inner.replace(/^['"]|['"]$/g, "").replace(/\\(["'\\])/g, "$1");
    cursor = Object.prototype.hasOwnProperty.call(cursor, key) ? cursor[key] : void 0;
  }
  return cursor;
}
function evalExpression(expression, runtime) {
  const text = String(expression || "").trim();
  if (!text) return "";
  if (text === "vars") return runtime.vars;
  if (text === "lastResponse") return runtime.lastResponse;
  if (text === "lastResponseBody") return runtime.lastResponseBody;
  if (text.startsWith("vars.")) {
    const sub = text.slice(5);
    return sub && !sub.startsWith(".") ? getByPath(runtime.vars, sub) : void 0;
  }
  if (text.startsWith("vars[")) return getByPath(runtime.vars, text.slice(4));
  if (text.startsWith("lastResponse.")) {
    const sub = text.slice(13);
    return sub && !sub.startsWith(".") ? getByPath(runtime.lastResponse, sub) : void 0;
  }
  if (text.startsWith("lastResponse[")) return getByPath(runtime.lastResponse, text.slice(12));
  if (text.startsWith("lastResponseBody.")) {
    const sub = text.slice(17);
    return sub && !sub.startsWith(".") ? getByPath(runtime.lastResponseBody, sub) : void 0;
  }
  if (text.startsWith("lastResponseBody[")) return getByPath(runtime.lastResponseBody, text.slice(16));
  if (Object.prototype.hasOwnProperty.call(runtime.vars || {}, text)) return runtime.vars[text];
  return getByPath(runtime.vars, text);
}
function resolveString(value, runtime) {
  if (typeof value !== "string") return value;
  if (!value.includes("{{")) return value;
  let current = value;
  const seen = /* @__PURE__ */ new Set();
  for (let depth = 0; depth < 10; depth += 1) {
    if (seen.has(current)) return current;
    seen.add(current);
    const whole = current.match(/^\s*\{\{\s*(.+?)\s*\}\}\s*$/);
    if (whole) {
      const direct = evalExpression(whole[1], runtime);
      if (direct === void 0) return "";
      if (typeof direct !== "string") return direct;
      current = direct;
      continue;
    }
    const replaced = current.replace(/\{\{\s*(.+?)\s*\}\}/g, (_, expression) => {
      const resolved = evalExpression(expression, runtime);
      if (resolved === void 0 || resolved === null) return "";
      return typeof resolved === "object" ? JSON.stringify(resolved) : String(resolved);
    });
    if (replaced === current || !/\{\{\s*.+?\s*\}\}/.test(replaced)) return replaced;
    current = replaced;
  }
  return current;
}
function resolve(value, runtime) {
  if (Array.isArray(value)) return value.map((item) => resolve(item, runtime));
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolve(item, runtime)]));
  }
  return resolveString(value, runtime);
}
var RESOLVE_CLONE_FALLBACK = Symbol("resolveCloneFallback");
function resolveClone(value, runtime) {
  const fast = resolveCloneFast(value, runtime, /* @__PURE__ */ new Set());
  return fast === RESOLVE_CLONE_FALLBACK ? resolve(clone(value), runtime) : fast;
}
function resolveCloneFast(value, runtime, ancestors) {
  if (typeof value === "string") return resolveString(value, runtime);
  if (value === null) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return value === 0 ? 0 : value;
  }
  if (typeof value === "boolean") return value;
  if (value === void 0) return void 0;
  if (typeof value !== "object") return RESOLVE_CLONE_FALLBACK;
  if (ancestors.has(value)) return RESOLVE_CLONE_FALLBACK;
  if (Array.isArray(value)) {
    if (typeof value.toJSON === "function") return RESOLVE_CLONE_FALLBACK;
    ancestors.add(value);
    try {
      const result = new Array(value.length);
      for (let index = 0; index < value.length; index += 1) {
        const item = resolveCloneFast(value[index], runtime, ancestors);
        if (item === RESOLVE_CLONE_FALLBACK) return RESOLVE_CLONE_FALLBACK;
        result[index] = item === void 0 ? null : item;
      }
      return result;
    } finally {
      ancestors.delete(value);
    }
  }
  if (!isPlainObject(value) || typeof value.toJSON === "function") return RESOLVE_CLONE_FALLBACK;
  ancestors.add(value);
  try {
    const result = {};
    for (const key of Object.keys(value)) {
      const item = value[key];
      if (item === void 0) continue;
      const resolved = resolveCloneFast(item, runtime, ancestors);
      if (resolved === RESOLVE_CLONE_FALLBACK) return RESOLVE_CLONE_FALLBACK;
      if (resolved === void 0) continue;
      if (key === "__proto__") {
        Object.defineProperty(result, key, { value: resolved, enumerable: true, writable: true, configurable: true });
      } else {
        result[key] = resolved;
      }
    }
    return result;
  } finally {
    ancestors.delete(value);
  }
}
function headerKey(headers, name) {
  const target = String(name || "").toLowerCase();
  return Object.keys(headers || {}).find((item) => item.toLowerCase() === target);
}
function headerValue(headers, name) {
  const key = headerKey(headers, name);
  return key === void 0 ? void 0 : headers[key];
}
function getHeaderByPath(headers, valuePath) {
  if (!valuePath) return headers;
  const text = String(valuePath);
  const match = text.match(/[^.\[\]]+|\[(?:-?\d+|".*?"|'.*?')\]/);
  if (!match) return getByPath(headers, text);
  const token = match[0];
  const key = token.startsWith("[") ? token.slice(1, -1).replace(/^['"]|['"]$/g, "") : token;
  const matched = headerKey(headers, key);
  if (matched === void 0) return void 0;
  const rest = text.slice(match.index + token.length);
  return rest ? getByPath(headers[matched], rest) : headers[matched];
}
function hasHeader(headers, name) {
  return headerValue(headers, name) !== void 0;
}
function headersToObject(headers) {
  const result = {};
  if (headers && typeof headers.forEach === "function") {
    headers.forEach((value, key) => {
      result[key] = value;
    });
  }
  return result;
}
function joinUrl(baseUrl, requestPath) {
  if (/^(?:https?:)?\/\//i.test(requestPath || "")) return requestPath;
  const base = String(baseUrl || "").replace(/\/+$/, "");
  const tail = String(requestPath || "").replace(/^\/+/, "");
  return base ? `${base}/${tail}` : tail;
}
function queryPairs(key, value) {
  const encodedKey = encodeURIComponent(key);
  if (Array.isArray(value)) {
    return value.filter((item) => item !== void 0 && item !== null).map((item) => `${encodedKey}=${encodeURIComponent(String(item))}`);
  }
  if (value === void 0 || value === null) return [];
  return [`${encodedKey}=${encodeURIComponent(String(value))}`];
}
function splitUrlFragment(url) {
  const text = String(url || "");
  const fragmentIndex = text.indexOf("#");
  return fragmentIndex < 0 ? { path: text, fragment: "" } : { path: text.slice(0, fragmentIndex), fragment: text.slice(fragmentIndex) };
}
function queryKeys(url) {
  const keys = /* @__PURE__ */ new Set();
  const { path: path4 } = splitUrlFragment(url);
  const queryIndex = path4.indexOf("?");
  if (queryIndex < 0) return keys;
  for (const pair of path4.slice(queryIndex + 1).split("&")) {
    const key = pair.split("=")[0];
    if (key) keys.add(safeDecodeComponent(key));
  }
  return keys;
}
function appendQueryPairs(url, pairs) {
  const text = String(url || "");
  if (!pairs || !pairs.length) return text;
  const { path: path4, fragment } = splitUrlFragment(text);
  return `${path4}${path4.includes("?") ? "&" : "?"}${pairs.join("&")}${fragment}`;
}
function appendGlobalQuery(url, globals, runtime) {
  const existingKeys = queryKeys(url);
  const pairs = [];
  for (const global of globals || []) {
    if (global.type !== "query" || existingKeys.has(global.name)) continue;
    pairs.push(...queryPairs(global.name, resolve(global.value, runtime)));
  }
  return appendQueryPairs(url, pairs);
}
function buildUrl(requestPath, params, runtime) {
  const rawPath = resolveString(requestPath || "", runtime);
  if (!params || !isPlainObject(params)) return rawPath;
  const resolved = resolve(params, runtime);
  const pairs = Object.entries(resolved).flatMap(([key, value]) => queryPairs(key, value));
  return appendQueryPairs(rawPath, pairs);
}
function parseBody(text, contentType) {
  if (!text) return null;
  const value = String(text);
  if (String(contentType || "").toLowerCase().includes("json") || /^[\[{]/.test(value.trim())) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}
var ASSERTION_OPERATORS = Object.keys(contract.assertions.operators);
var ASSERTION_META_KEYS = [...contract.assertions.metaKeys];
var ASSERTION_OPERATOR_SET = new Set(ASSERTION_OPERATORS);
var ASSERTION_META_KEY_SET = new Set(ASSERTION_META_KEYS);
var STRING_EDGE_OPERATORS = ["startsWith", "endsWith"];
function formatAssertionContext(context) {
  if (!context) return "";
  if (typeof context === "string") return context;
  const parts = [];
  if (context.scenarioName) parts.push(`\u573A\u666F ${context.scenarioName}`);
  if (context.stepNo !== void 0) parts.push(`\u7B2C ${context.stepNo} \u6B65`);
  if (context.stepName) parts.push(`\u6B65\u9AA4 ${context.stepName}`);
  if (context.assertionNo !== void 0) parts.push(`\u7B2C ${context.assertionNo} \u6761`);
  return parts.join(" ");
}
function validateAssertion(definition, context, options = {}) {
  const where = formatAssertionContext(context);
  const prefix = where ? `${where}\u65AD\u8A00\u65E0\u6548` : "\u65AD\u8A00\u65E0\u6548";
  if (!isPlainObject(definition)) throw new TypeError(`${prefix}: \u65AD\u8A00\u5FC5\u987B\u662F\u5BF9\u8C61`);
  const keys = Object.keys(definition);
  const operators = keys.filter((key) => ASSERTION_OPERATOR_SET.has(key));
  const unknown = keys.filter((key) => !ASSERTION_OPERATOR_SET.has(key) && !ASSERTION_META_KEY_SET.has(key));
  if (unknown.length) {
    throw new TypeError(
      `${prefix}: \u5305\u542B\u672A\u77E5\u952E ${unknown.map((key) => `"${key}"`).join(", ")}\uFF0C\u5141\u8BB8\u7684\u5143\u6570\u636E\u952E\u4E3A ${ASSERTION_META_KEYS.join("/")}\uFF0C\u64CD\u4F5C\u7B26\u4E3A ${ASSERTION_OPERATORS.join("/")}`
    );
  }
  if (!operators.length) {
    throw new TypeError(`${prefix}: \u5FC5\u987B\u81F3\u5C11\u5305\u542B\u4E00\u4E2A\u64CD\u4F5C\u7B26\uFF08${ASSERTION_OPERATORS.join("/")}\uFF09`);
  }
  if (definition.target !== void 0 && !contract.assertions.targets.includes(definition.target)) {
    throw new TypeError(`${prefix}: target \u53EA\u652F\u6301 ${contract.assertions.targets.join("/")}\uFF08\u5F53\u524D ${JSON.stringify(definition.target)}\uFF09`);
  }
  if (definition.from !== void 0 && !contract.assertions.from.includes(definition.from)) {
    throw new TypeError(`${prefix}: from \u53EA\u652F\u6301 ${contract.assertions.from.join("/")}\uFF08\u5F53\u524D ${JSON.stringify(definition.from)}\uFF0C\u7F3A\u7701\u6309 body \u53D6\u503C\uFF09`);
  }
  if (definition.path !== void 0) {
    if (typeof definition.path !== "string") {
      throw new TypeError(`${prefix}: path \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\uFF08\u5F53\u524D ${JSON.stringify(definition.path)}\uFF09`);
    }
    if (definition.path.includes("{{") && !options.inEach) {
      throw new TypeError(
        `${prefix}: path \u4E0D\u652F\u6301 {{ }} \u6A21\u677F\u2014\u2014\u65AD\u8A00\u7684 path \u6309\u5B57\u9762\u53D6\u952E\u4E0D\u505A\u89E3\u6790\uFF0C{{vars.x}} \u4F1A\u88AB\u5F53\u6210\u5B57\u9762\u952E\u540D\u67E5\u627E\u4E0D\u5230\uFF08exists:false \u56E0\u6B64\u6052\u771F\u7684\u5047\u7EFF\uFF09\u3002\u52A8\u6001\u952E\u540D\u4EC5 each \u5B50\u65AD\u8A00\u5185\u6709\u6548\uFF08\u671F\u671B\u503C\u6574\u4F53\u5148\u505A\u6A21\u677F\u89E3\u6790\uFF09\uFF0C\u6216\u6539\u7528 vars \u6765\u6E90\u65AD\u8A00`
      );
    }
    if (definition.path !== "" && !definition.path.includes("{{") && tokenizePath(definition.path) === null) {
      throw new TypeError(`${prefix}: path \u4E0D\u662F\u5408\u6CD5\u8DEF\u5F84\u5199\u6CD5\uFF08\u652F\u6301 \u70B9\u6BB5/\u6574\u6570\u4E0B\u6807/\u5F15\u53F7\u952E\uFF0C\u5982 a.b\u3001list[-1]\u3001a["x>y"]\uFF1B\u5F53\u524D ${JSON.stringify(definition.path)}\uFF09`);
    }
  }
  if (options.inEach && (definition.header !== void 0 || definition.target !== void 0 || definition.from !== void 0 && definition.from !== "body" && definition.from !== "vars")) {
    throw new TypeError(`${prefix}: each \u5B50\u65AD\u8A00\u4F5C\u7528\u5728\u6570\u7EC4\u5143\u7D20\u4E0A\uFF0C\u4E0D\u652F\u6301 header/target \u53CA from:"headers"/"bodyText" \u54CD\u5E94\u7EA7\u901A\u9053\uFF08\u6052\u53D6\u6B7B\u503C\uFF09\u2014\u2014\u8BF7\u63D0\u5347\u5230\u9876\u5C42\u65AD\u8A00`);
  }
  if (definition.header !== void 0) {
    if (typeof definition.header !== "string" || definition.header.trim() === "") {
      throw new TypeError(`${prefix}: header \u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32\uFF08\u5F53\u524D ${JSON.stringify(definition.header)}\uFF09`);
    }
    if (definition.header.includes("{{") && !options.inEach) {
      throw new TypeError(`${prefix}: header \u4E0D\u652F\u6301 {{ }} \u6A21\u677F\u2014\u2014\u5934\u540D\u6309\u5B57\u9762\u5339\u914D\u4E0D\u505A\u89E3\u6790`);
    }
  }
  if (definition.matches !== void 0 && !String(definition.matches).includes("{{")) {
    try {
      new RegExp(String(definition.matches));
    } catch (error) {
      throw new TypeError(`${prefix}: matches \u671F\u671B\u503C\u4E0D\u662F\u5408\u6CD5\u6B63\u5219\u8868\u8FBE\u5F0F\uFF08${definition.matches}\uFF09: ${error.message}`);
    }
  }
  if (definition.each !== void 0) {
    const eachLabel = `${prefix}: each \u7684\u671F\u671B\u503C\u5FC5\u987B\u662F\u5B50\u65AD\u8A00\u5BF9\u8C61\u6216\u5176\u6570\u7EC4`;
    if (Array.isArray(definition.each)) {
      definition.each.forEach((sub, subIndex) => {
        if (!isPlainObject(sub)) throw new TypeError(`${eachLabel}\uFF08\u7B2C ${subIndex + 1} \u9879\u4E0D\u662F\u5BF9\u8C61\uFF09`);
        validateAssertion(sub, context, { inEach: true });
      });
    } else if (isPlainObject(definition.each)) {
      validateAssertion(definition.each, context, { inEach: true });
    } else {
      throw new TypeError(eachLabel);
    }
  }
  return definition;
}
function assertionActual(definition, response, runtime) {
  if (definition.target === "status") return response.status;
  if (definition.target === "duration") return response && typeof response === "object" ? response.durationMs : void 0;
  if (definition.header) return headerValue(response.headers, definition.header);
  if (definition.from === "vars") return definition.path ? getByPath(runtime.vars, definition.path) : runtime.vars;
  if (definition.from === "headers") return definition.path ? getHeaderByPath(response.headers, definition.path) : response.headers;
  if (definition.from === "bodyText") return response.bodyText;
  return definition.path ? getByPath(response.body, definition.path) : response.body;
}
function stableStringify(value) {
  if (value === void 0) return "undefined";
  if (typeof value === "bigint") return `bigint:${value.toString()}`;
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  const entries = [];
  for (const key of Object.keys(value).sort()) {
    const text = stableStringify(value[key]);
    if (text !== "undefined") entries.push(`${JSON.stringify(key)}:${text}`);
  }
  return `{${entries.join(",")}}`;
}
var INCLUDES_OBJECT_ACTUAL_REASON = 'includes \u4E0D\u652F\u6301\u5BF9\u8C61\u7C7B\u578B\u7684\u5B9E\u9645\u503C\uFF08String(actual) \u6052\u4E3A "[object Object]"\uFF0C\u65AD\u8A00\u5FC5\u7136\u5931\u8D25\uFF09\uFF1A\u5BF9\u8C61\u6DF1\u6BD4\u8F83\u8BF7\u6539\u7528 equals\uFF0C\u6216\u5BF9\u5177\u4F53\u5B57\u6BB5\u7528 path \u65AD\u8A00\uFF08\u5982 path: "data.id"\uFF09';
var validatedAssertions = /* @__PURE__ */ new WeakSet();
var MATCHES_PATTERN_CACHE_LIMIT = 128;
var matchesPatternCache = /* @__PURE__ */ new Map();
function compiledMatchesPattern(expected) {
  const key = String(expected);
  let compiled = matchesPatternCache.get(key);
  if (!compiled) {
    compiled = new RegExp(key);
    if (matchesPatternCache.size >= MATCHES_PATTERN_CACHE_LIMIT) {
      matchesPatternCache.delete(matchesPatternCache.keys().next().value);
    }
    matchesPatternCache.set(key, compiled);
  }
  return compiled;
}
function evaluateAssertion(definition, response, runtime, context) {
  if (!validatedAssertions.has(definition)) {
    validateAssertion(definition, context);
    validatedAssertions.add(definition);
  }
  return evaluateValidatedAssertion(definition, response, runtime, context);
}
function evaluateValidatedAssertion(definition, response, runtime, context) {
  let actual = assertionActual(definition, response, runtime);
  let expected;
  let passed = true;
  let reason = "";
  let eachFailures = null;
  if (definition.exists !== void 0) {
    expected = Boolean(definition.exists);
    const exists = actual !== void 0 && actual !== null && actual !== "";
    passed = passed && exists === expected;
  }
  if (Object.prototype.hasOwnProperty.call(definition, "equals")) {
    expected = resolve(definition.equals, runtime);
    passed = passed && stableStringify(actual) === stableStringify(expected);
  }
  if (Object.prototype.hasOwnProperty.call(definition, "notEquals")) {
    expected = resolve(definition.notEquals, runtime);
    passed = passed && stableStringify(actual) !== stableStringify(expected);
  }
  if (Object.prototype.hasOwnProperty.call(definition, "includes")) {
    expected = resolve(definition.includes, runtime);
    if (isPlainObject(actual)) {
      passed = false;
      reason = INCLUDES_OBJECT_ACTUAL_REASON;
    } else if (Array.isArray(actual)) {
      passed = passed && actual.length > 0;
      if (passed) {
        const expectedText = stableStringify(expected);
        passed = actual.some((item) => stableStringify(item) === expectedText);
      }
    } else {
      passed = passed && String(actual == null ? "" : actual).includes(String(expected));
    }
  }
  if (Object.prototype.hasOwnProperty.call(definition, "each")) {
    expected = resolve(definition.each, runtime);
    const subDefinitions = Array.isArray(expected) ? expected : isPlainObject(expected) ? [expected] : null;
    passed = passed && Array.isArray(actual) && subDefinitions !== null;
    if (passed) {
      for (const sub of subDefinitions) validateAssertion(sub, context);
      actual.forEach((element, index) => {
        const elementResponse = { status: void 0, headers: {}, body: element, bodyText: "" };
        const subResults = subDefinitions.map((sub) => evaluateValidatedAssertion(sub, elementResponse, runtime, context));
        if (subResults.some((result) => !result.passed)) {
          (eachFailures ??= []).push({ index, actual: element, assertions: subResults });
          passed = false;
        }
      });
    }
  }
  if (definition.matches !== void 0) {
    expected = resolve(definition.matches, runtime);
    if (!(definition.implicit === true && typeof actual !== "number")) {
      try {
        passed = passed && compiledMatchesPattern(expected).test(String(actual == null ? "" : actual));
      } catch {
        passed = false;
      }
    }
  }
  if (definition.oneOf !== void 0) {
    expected = resolve(definition.oneOf, runtime);
    if (Array.isArray(expected)) {
      passed = passed && expected.length > 0;
      if (passed) {
        const actualText = stableStringify(actual);
        passed = expected.some((item) => stableStringify(item) === actualText);
      }
    } else {
      passed = false;
    }
  }
  for (const op of STRING_EDGE_OPERATORS) {
    if (!Object.prototype.hasOwnProperty.call(definition, op)) continue;
    expected = resolve(definition[op], runtime);
    const text = String(actual == null ? "" : actual);
    passed = passed && (op === "startsWith" ? text.startsWith(String(expected)) : text.endsWith(String(expected)));
  }
  if (Object.prototype.hasOwnProperty.call(definition, "length")) {
    expected = resolve(definition.length, runtime);
    const lengthOf = Array.isArray(actual) ? actual.length : typeof actual === "string" ? actual.length : isPlainObject(actual) ? Object.keys(actual).length : null;
    if (lengthOf !== null) actual = lengthOf;
    passed = passed && lengthOf !== null && typeof expected === "number" && Number.isFinite(expected) && lengthOf === expected;
  }
  for (const op of contract.assertions.numericOperators) {
    if (!Object.prototype.hasOwnProperty.call(definition, op)) continue;
    expected = resolve(definition[op], runtime);
    const comparable = typeof actual === "number" && Number.isFinite(actual) && typeof expected === "number" && Number.isFinite(expected);
    if (!comparable) {
      passed = false;
      continue;
    }
    if (op === "gt") passed = passed && actual > expected;
    else if (op === "gte") passed = passed && actual >= expected;
    else if (op === "lt") passed = passed && actual < expected;
    else passed = passed && actual <= expected;
  }
  return {
    name: definition.name || definition.path || "\u65AD\u8A00",
    passed,
    actual,
    expected,
    // reason 仅在 includes 命中对象实际值时出现；通过时保持既有四字段形状
    ...reason ? { reason } : {},
    // detail 仅在 each 存在失败元素时出现；通过时保持既有四字段形状（旧消费方不受影响）
    ...eachFailures ? { detail: eachFailures } : {}
  };
}
function normalizeWhenDefinition(definition) {
  if (!isPlainObject(definition)) return definition;
  const normalized = { ...definition };
  if (normalized.from === "lastResponse") normalized.from = "body";
  else if (normalized.from === "status") {
    delete normalized.from;
    normalized.target = "status";
  }
  return normalized;
}
function evaluateWhen(definition, runtime, context) {
  if (!isPlainObject(definition)) return Boolean(resolve(definition, runtime));
  const usesPreviousResponse = definition.from === "lastResponse" || definition.from === "status" || definition.target === "status";
  const previous = runtime ? runtime.lastResponse : null;
  if (usesPreviousResponse && (previous === void 0 || previous === null)) return false;
  const response = previous && typeof previous === "object" ? {
    status: previous.status,
    headers: previous.headers || {},
    body: previous.body,
    bodyText: previous.bodyText || ""
  } : { status: void 0, headers: {}, body: void 0, bodyText: "" };
  return evaluateAssertion(normalizeWhenDefinition(definition), response, runtime, context).passed;
}
function buildAssertions(step, response, runtime, context) {
  const definitions = Array.isArray(step.assertions) ? [...step.assertions] : [];
  if (step.status !== void 0 && !definitions.some((item) => item.target === "status")) {
    definitions.unshift({ name: `\u8FD4\u56DE HTTP ${step.status}`, target: "status", equals: step.status });
  } else if (step.status === void 0 && definitions.length === 0) {
    definitions.push({ name: "\u8FD4\u56DE HTTP 2xx", target: "status", matches: "^2\\d\\d$", implicit: true });
  }
  return definitions.map((definition, index) => evaluateAssertion(definition, response, runtime, { ...context || {}, assertionNo: index + 1 }));
}
var RESERVED_VARS = [...contract.reservedVars];
function assertNotReservedVar(name, label) {
  if (RESERVED_VARS.includes(name)) {
    throw new Error(`${label || "\u53D8\u91CF"} "${name}" \u662F\u8FD0\u884C\u65F6\u81EA\u52A8\u751F\u6210\u7684\u4FDD\u7559\u53D8\u91CF\uFF0C\u7981\u6B62\u58F0\u660E\u6216\u8986\u76D6`);
  }
}
function assertNoReservedVars(source, label) {
  for (const name of Object.keys(source || {})) {
    assertNotReservedVar(name, label);
  }
}
function setRuntimeVar(vars, name, value) {
  Object.defineProperty(vars, name, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
  return value;
}
function applyExtract(step, response, runtime) {
  const warnings = [];
  const failures = [];
  for (const definition of step.extract || []) {
    if (!definition || !definition.name) continue;
    assertNotReservedVar(definition.name, "extract \u53D8\u91CF");
    const hasDefault = definition.default !== void 0;
    if (definition.required === true && hasDefault) {
      throw new TypeError(`extract \u53D8\u91CF ${definition.name}: required: true \u4E0E default \u4E92\u65A5\uFF0C\u53EA\u80FD\u58F0\u660E\u5176\u4E00`);
    }
    let source = response.body;
    if (definition.target === "status") source = response.status;
    else if (definition.header) source = headerValue(response.headers, definition.header);
    else if (definition.from === "headers") source = response.headers;
    else if (definition.from === "bodyText") source = response.bodyText;
    else if (definition.from === "response") source = response;
    const value = definition.path ? definition.from === "headers" ? getHeaderByPath(source, definition.path) : getByPath(source, definition.path) : source;
    if (value === void 0) {
      if (hasDefault) {
        setRuntimeVar(runtime.vars, definition.name, resolve(definition.default, runtime));
        continue;
      }
      if (definition.required === true) {
        failures.push({
          name: `\u63D0\u53D6 ${definition.name}\uFF08\u8DEF\u5F84\u4E0D\u5B58\u5728\uFF09`,
          passed: false,
          actual: void 0,
          expected: `\u8DEF\u5F84 ${definition.path || "(\u6574\u4E2A\u54CD\u5E94)"} \u5B58\u5728`
        });
      } else {
        warnings.push(`\u63D0\u53D6\u53D8\u91CF ${definition.name}\uFF1A\u8DEF\u5F84 ${definition.path || "(\u6574\u4E2A\u54CD\u5E94)"} \u4E0D\u5B58\u5728\uFF0C\u53D8\u91CF\u503C\u4E3A undefined\uFF08required \u672A\u5F00\u542F\uFF0C\u4E0D\u5F71\u54CD\u6267\u884C\uFF09`);
      }
    }
    setRuntimeVar(runtime.vars, definition.name, value);
  }
  return { warnings, failures };
}
function md5(value) {
  return (0, import_blueimp_md5.default)(String(value));
}
function generateSignature(params, secretValue) {
  const pairs = Object.keys(params || {}).sort().map((key) => `${key}=${params[key] == null ? "" : params[key]}`);
  pairs.push(`apiSecret=${secretValue == null ? "" : secretValue}`);
  return md5(pairs.join("&")).toUpperCase();
}
var GB11643_WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
var GB11643_CHECK_CODES = "10X98765432";
function gb11643Checksum(first17Digits) {
  const text = String(first17Digits || "");
  if (!/^\d{17}$/.test(text)) {
    throw new Error(`GB11643 \u6821\u9A8C\u4F4D\u8F93\u5165\u5FC5\u987B\u662F 17 \u4F4D\u6570\u5B57: ${text}`);
  }
  let sum = 0;
  for (let i = 0; i < 17; i += 1) {
    sum += (text.charCodeAt(i) - 48) * GB11643_WEIGHTS[i];
  }
  return GB11643_CHECK_CODES[sum % 11];
}
function buildChinaIdNumber({ regionCode, birthDate, sequence }) {
  const dateText = String(birthDate || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
    throw new Error(`\u8EAB\u4EFD\u8BC1\u51FA\u751F\u65E5\u671F\u5FC5\u987B\u662F YYYY-MM-DD: ${dateText}`);
  }
  const normalized = dateText.replace(/-/g, "");
  const year = Number(normalized.slice(0, 4));
  const month = Number(normalized.slice(4, 6));
  const day = Number(normalized.slice(6, 8));
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    throw new Error(`\u8EAB\u4EFD\u8BC1\u51FA\u751F\u65E5\u671F\u4E0D\u662F\u5408\u6CD5\u65E5\u5386\u65E5\u671F: ${dateText}`);
  }
  const seq = Number(sequence);
  if (!Number.isInteger(seq) || seq < 0 || seq > 999) {
    throw new Error(`\u8EAB\u4EFD\u8BC1\u987A\u5E8F\u7801\u5FC5\u987B\u662F 0-999 \u6574\u6570: ${sequence}`);
  }
  const first17 = `${regionCode}${normalized}${String(seq).padStart(3, "0")}`;
  return `${first17}${gb11643Checksum(first17)}`;
}
function seedToIndex(seed, maxExclusive) {
  const hex = md5(String(seed == null ? "" : seed)).slice(0, 8);
  return Number.parseInt(hex, 16) % maxExclusive;
}
function seedToUnit(seed) {
  const hex = md5(String(seed == null ? "" : seed)).slice(0, 12);
  return Number.parseInt(hex, 16) / 16 ** 12;
}
function pickWeightedIndex(seed, weights) {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let threshold = seedToUnit(seed) * total;
  for (let index = 0; index < weights.length; index += 1) {
    threshold -= weights[index];
    if (threshold < 0) return index;
  }
  return weights.length - 1;
}
function luhnCheckDigit(firstDigits) {
  const text = String(firstDigits || "");
  if (!/^\d+$/.test(text)) {
    throw new Error(`Luhn \u6821\u9A8C\u4F4D\u8F93\u5165\u5FC5\u987B\u662F\u7EAF\u6570\u5B57: ${text}`);
  }
  let sum = 0;
  let double = true;
  for (let i = text.length - 1; i >= 0; i -= 1) {
    let digit = text.charCodeAt(i) - 48;
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return String((10 - sum % 10) % 10);
}
var USCC_ALPHABET = "0123456789ABCDEFGHJKLMNPQRTUWXY";
var IDCARD_TEST_REGIONS = ["110101", "110105", "310101", "440103", "510107", "330102", "420102", "610103"];
var PHONE_TEST_PREFIXES = ["138", "139", "150", "155", "158", "159", "176", "177", "185", "186", "187", "199"];
var USCC_WEIGHTS = [1, 3, 9, 27, 19, 26, 16, 17, 20, 29, 25, 13, 8, 24, 10, 30, 28];
function usccCheckChar(first17Chars) {
  const text = String(first17Chars || "").toUpperCase();
  if (text.length !== 17) {
    throw new Error(`USCC \u6821\u9A8C\u4F4D\u8F93\u5165\u5FC5\u987B\u662F 17 \u4F4D\u5B57\u7B26: ${text}`);
  }
  let sum = 0;
  for (let i = 0; i < 17; i += 1) {
    const value = USCC_ALPHABET.indexOf(text[i]);
    if (value < 0) {
      throw new Error(`USCC \u542B\u975E\u6CD5\u5B57\u7B26 ${text[i]}\uFF08\u5141\u8BB8\u5B57\u7B26\u96C6: ${USCC_ALPHABET}\uFF09`);
    }
    sum += value * USCC_WEIGHTS[i];
  }
  return USCC_ALPHABET[(31 - sum % 31) % 31];
}
function buildUsccCode({ categoryCode, regionCode, orgCode }) {
  const category = String(categoryCode || "");
  const region = String(regionCode || "");
  const org = String(orgCode || "").toUpperCase();
  if (!/^\d{2}$/.test(category)) {
    throw new Error(`USCC \u767B\u8BB0\u7BA1\u7406\u90E8\u95E8+\u673A\u6784\u7C7B\u522B\u5FC5\u987B\u662F 2 \u4F4D\u6570\u5B57: ${category}`);
  }
  if (!/^\d{6}$/.test(region)) {
    throw new Error(`USCC \u884C\u653F\u533A\u5212\u5FC5\u987B\u662F 6 \u4F4D\u6570\u5B57: ${region}`);
  }
  if (!new RegExp(`^[0-9A-HJ-NP-RTUWXY]{9}$`).test(org)) {
    throw new Error(`USCC \u4E3B\u4F53\u6807\u8BC6\u7801\u5FC5\u987B\u662F 9 \u4F4D\uFF08\u5B57\u7B26\u96C6 ${USCC_ALPHABET}\uFF09: ${org}`);
  }
  const first17 = `${category}${region}${org}`;
  return `${first17}${usccCheckChar(first17)}`;
}
var TIMESTAMP_OFFSET_UNITS = Object.freeze({ ms: 1, s: 1e3, m: 6e4, h: 36e5, d: 864e5, w: 6048e5 });
var TIMESTAMP_FORMAT_PATTERN = /^(?:YYYY|MM|DD|HH|mm|ss|[^A-Za-z])*$/;
function parseTimestampOffset(offset) {
  const match = /^([+-]?\d+)(ms|s|m|h|d|w)$/.exec(String(offset));
  if (!match) {
    throw new Error(`generatedVars timestamp \u7684 offset \u5FC5\u987B\u5F62\u5982 "-7d"/"+8d"/"30m"\uFF08\u6570\u5B57+\u5355\u4F4D ms/s/m/h/d/w\uFF09: ${offset}`);
  }
  return Number(match[1]) * TIMESTAMP_OFFSET_UNITS[match[2]];
}
function formatTimestamp(ms, format) {
  const date = new Date(ms);
  const pad = (value) => String(value).padStart(2, "0");
  const tokens = {
    YYYY: String(date.getFullYear()).padStart(4, "0"),
    MM: pad(date.getMonth() + 1),
    DD: pad(date.getDate()),
    HH: pad(date.getHours()),
    mm: pad(date.getMinutes()),
    ss: pad(date.getSeconds())
  };
  return String(format).replace(/YYYY|MM|DD|HH|mm|ss/g, (token) => tokens[token]);
}
function normalizeEnumDefinition(definition) {
  const values = definition.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(`generatedVars enum \u7684 values \u5FC5\u987B\u662F\u975E\u7A7A\u6570\u7EC4: ${definition.name}`);
  }
  const weights = definition.weights == null ? values.map(() => 1) : Array.isArray(definition.weights) ? definition.weights : null;
  if (!weights) {
    throw new Error(`generatedVars enum \u7684 weights \u5FC5\u987B\u662F\u6570\u5B57\u6570\u7EC4: ${definition.name}`);
  }
  if (weights.length !== values.length) {
    throw new Error(`generatedVars enum \u7684 weights \u957F\u5EA6\u5FC5\u987B\u4E0E values \u4E00\u81F4\uFF08${weights.length} vs ${values.length}\uFF09: ${definition.name}`);
  }
  const normalized = weights.map((weight, index) => {
    const value = Number(weight);
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`generatedVars enum \u7684 weights \u7B2C ${index + 1} \u9879\u5FC5\u987B\u662F\u975E\u8D1F\u6709\u9650\u6570\u5B57: ${weight}`);
    }
    return value;
  });
  if (!normalized.some((weight) => weight > 0)) {
    throw new Error(`generatedVars enum \u7684 weights \u81F3\u5C11\u9700\u8981\u4E00\u9879\u5927\u4E8E 0: ${definition.name}`);
  }
  return { values, weights: normalized };
}
function defaultUuidHex() {
  if (!globalThis.crypto?.randomUUID) throw new Error("\u5F53\u524D\u73AF\u5883\u4E0D\u652F\u6301 crypto.randomUUID");
  return globalThis.crypto.randomUUID().replace(/-/g, "");
}
function applyGeneratedVar(definition, vars, identifiers, deps = {}) {
  const name = definition.name;
  const uuidHex = deps.uuidHex || defaultUuidHex;
  if (definition.type === "timestamp") {
    const base = Date.now() + (definition.offset == null ? 0 : parseTimestampOffset(definition.offset));
    if (definition.format != null) {
      if (definition.unit != null) {
        throw new Error(`generatedVars timestamp \u7684 format \u4E0E unit \u4E92\u65A5\uFF0C\u53EA\u80FD\u58F0\u660E\u5176\u4E00: ${name}`);
      }
      if (!/(?:YYYY|MM|DD|HH|mm|ss)/.test(definition.format) || !TIMESTAMP_FORMAT_PATTERN.test(definition.format)) {
        throw new Error(`generatedVars timestamp \u7684 format \u4EC5\u652F\u6301 YYYY/MM/DD/HH/mm/ss \u7684\u672C\u5730\u65F6\u95F4\u7EC4\u5408\uFF08\u5982 YYYY-MM-DD HH:mm:ss\uFF09: ${definition.format}`);
      }
      setRuntimeVar(vars, name, formatTimestamp(base, definition.format));
    } else if (definition.unit != null && definition.unit !== "ms") {
      if (definition.unit !== "s") {
        throw new Error(`generatedVars timestamp \u7684 unit \u53EA\u652F\u6301 ms\uFF08\u9ED8\u8BA4\uFF09/s: ${definition.unit}`);
      }
      setRuntimeVar(vars, name, Math.floor(base / 1e3));
    } else {
      setRuntimeVar(vars, name, base);
    }
    return;
  }
  if (definition.type === "uuid") {
    if (!globalThis.crypto?.randomUUID) throw new Error("\u5F53\u524D\u73AF\u5883\u4E0D\u652F\u6301 crypto.randomUUID");
    setRuntimeVar(vars, name, globalThis.crypto.randomUUID());
    return;
  }
  if (definition.type === "uuidHex") {
    setRuntimeVar(vars, name, uuidHex());
    return;
  }
  if (definition.type === "idcard") {
    const gender = definition.gender == null ? "MALE" : definition.gender;
    if (gender !== "MALE" && gender !== "FEMALE") {
      throw new Error(`generatedVars idcard \u7684 gender \u53EA\u652F\u6301 MALE/FEMALE: ${gender}`);
    }
    const regionCode = definition.regionCode == null ? IDCARD_TEST_REGIONS[seedToIndex(identifiers.runId, IDCARD_TEST_REGIONS.length)] : String(definition.regionCode);
    if (!/^\d{6}$/.test(regionCode)) {
      throw new Error(`generatedVars idcard \u7684 regionCode \u5FC5\u987B\u662F 6 \u4F4D\u6570\u5B57: ${regionCode}`);
    }
    const seqBase = seedToIndex(`${identifiers.runId}|${name}`, 500);
    setRuntimeVar(vars, name, buildChinaIdNumber({
      regionCode,
      birthDate: definition.birthDate,
      sequence: seqBase * 2 + (gender === "MALE" ? 1 : 0)
    }));
    return;
  }
  if (definition.type === "luhn") {
    const length = definition.length == null ? 16 : Number(definition.length);
    if (!Number.isInteger(length) || length < 12 || length > 19) {
      throw new Error(`generatedVars luhn \u7684 length \u5FC5\u987B\u662F 12-19 \u6574\u6570: ${definition.length}`);
    }
    const prefix = definition.prefix == null ? "62" : String(definition.prefix);
    if (!/^\d{1,16}$/.test(prefix) || prefix.length >= length) {
      throw new Error(`generatedVars luhn \u7684 prefix \u5FC5\u987B\u662F\u77ED\u4E8E\u5361\u53F7\u957F\u5EA6\u7684\u6570\u5B57\u5361\u5934: ${definition.prefix}`);
    }
    let body = "";
    for (let i = 0; i < length - 1 - prefix.length; i += 1) {
      body += seedToIndex(`${identifiers.runId}|${name}|${i}`, 10);
    }
    const first = `${prefix}${body}`;
    setRuntimeVar(vars, name, `${first}${luhnCheckDigit(first)}`);
    return;
  }
  if (definition.type === "phone") {
    const prefix = definition.prefix == null ? PHONE_TEST_PREFIXES[seedToIndex(identifiers.runId, PHONE_TEST_PREFIXES.length)] : String(definition.prefix);
    if (!/^1[3-9]\d$/.test(prefix)) {
      throw new Error(`generatedVars phone \u7684 prefix \u5FC5\u987B\u662F 1[3-9] \u5F00\u5934\u7684 3 \u4F4D\u53F7\u6BB5: ${definition.prefix}`);
    }
    let tail = "";
    for (let i = 0; i < 8; i += 1) {
      tail += seedToIndex(`${identifiers.runId}|${name}|${i}`, 10);
    }
    setRuntimeVar(vars, name, `${prefix}${tail}`);
    return;
  }
  if (definition.type === "uscc") {
    const regionCode = definition.regionCode == null ? "110100" : String(definition.regionCode);
    if (!/^\d{6}$/.test(regionCode)) {
      throw new Error(`generatedVars uscc \u7684 regionCode \u5FC5\u987B\u662F 6 \u4F4D\u6570\u5B57: ${definition.regionCode}`);
    }
    let orgCode = "";
    for (let i = 0; i < 9; i += 1) {
      orgCode += USCC_ALPHABET[seedToIndex(`${identifiers.runId}|${name}|${i}`, USCC_ALPHABET.length)];
    }
    setRuntimeVar(vars, name, buildUsccCode({ categoryCode: "91", regionCode, orgCode }));
    return;
  }
  if (definition.type === "md5") {
    const source = (definition.parts || []).map((part) => vars[part] == null ? "" : String(vars[part])).join("");
    setRuntimeVar(vars, name, md5(source));
    return;
  }
  if (definition.type === "signature") {
    const params = Object.fromEntries(Object.entries(definition.params || {}).map(([key, variableName]) => [key, vars[variableName]]));
    const secret = vars[definition.secretVar || "apiSecret"];
    if (!secret) {
      throw new Error(`\u7B7E\u540D\u751F\u6210\u5931\u8D25: \u7F3A\u5C11\u5BC6\u94A5\u53D8\u91CF vars.${definition.secretVar || "apiSecret"}`);
    }
    setRuntimeVar(vars, name, generateSignature(params, secret));
    return;
  }
  if (definition.type === "enum") {
    const { values, weights } = normalizeEnumDefinition(definition);
    setRuntimeVar(vars, name, values[pickWeightedIndex(`${identifiers.runId}|${name}`, weights)]);
    return;
  }
  throw new Error(`\u4E0D\u652F\u6301\u7684 generatedVars \u7C7B\u578B: ${definition.type}`);
}
function maskSecret(value) {
  if (value === void 0 || value === null || value === "") return "";
  const text = String(value);
  return text.length > 12 ? `${text.slice(0, 4)}...${text.slice(-4)}` : "***";
}
function sanitizeSensitive(value, key = "", sensitiveNames = []) {
  return value;
}
function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds)) return "-";
  return milliseconds >= 1e3 ? `${(milliseconds / 1e3).toFixed(2)} s` : `${milliseconds.toFixed(0)} ms`;
}

// src/utils/failure-diff.js
function escapeC1(text) {
  return text.replace(/[\x7f-\x9f\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
}
var CI_COMMAND_MARKER = /##\[|##vso\[|##teamcity\[/gi;
function defuseCiCommandMarkers(text) {
  return String(text).replace(CI_COMMAND_MARKER, (m) => `${m.slice(0, -1)}\\u005b`);
}
function escapeInlineText(value) {
  return escapeC1(defuseCiCommandMarkers(JSON.stringify(String(value ?? "")).slice(1, -1)));
}

// src/adapter-types.js
function validateAdapter(adapter, name = "unknown") {
  const errors = [];
  if (!adapter || typeof adapter !== "object") {
    errors.push("\u9002\u914D\u5668\u5FC5\u987B\u662F\u5BF9\u8C61");
  } else {
    if (typeof adapter.execute !== "function") {
      errors.push("\u7F3A\u5C11\u5FC5\u9700\u7684 execute \u65B9\u6CD5");
    }
    const optionalMethods = ["initialize", "matches", "beforeExecute", "afterExecute", "onError", "dispose"];
    for (const method of optionalMethods) {
      if (adapter[method] !== void 0 && typeof adapter[method] !== "function") {
        errors.push(`${method} \u5FC5\u987B\u662F\u51FD\u6570`);
      }
    }
  }
  if (errors.length > 0) {
    throw new TypeError(`\u9002\u914D\u5668 ${name} \u9A8C\u8BC1\u5931\u8D25:
${errors.map((e) => `  - ${e}`).join("\n")}`);
  }
}
function validateAdapterResponse(response, adapterName = "unknown") {
  if (!response || typeof response !== "object") {
    throw new TypeError(`\u9002\u914D\u5668 ${adapterName} \u8FD4\u56DE\u503C\u5FC5\u987B\u662F\u5BF9\u8C61`);
  }
  const actualResponse = response.response || response;
  if (actualResponse.status === void 0 || actualResponse.status === null) {
    throw new TypeError(`\u9002\u914D\u5668 ${adapterName} \u54CD\u5E94\u7F3A\u5C11 status \u5B57\u6BB5`);
  }
  if (actualResponse.headers !== void 0 && (actualResponse.headers === null || typeof actualResponse.headers !== "object")) {
    throw new TypeError(`\u9002\u914D\u5668 ${adapterName} \u54CD\u5E94\u7684 headers \u5FC5\u987B\u662F\u5BF9\u8C61`);
  }
  return true;
}

// src/registry.js
var scenarioRegistry = /* @__PURE__ */ new Map();
var adapterRegistry = /* @__PURE__ */ new Map();
var currentConfig = null;
function invariant(condition, message, code) {
  if (!condition) {
    const error = new TypeError(message);
    if (code) error.code = code;
    throw error;
  }
}
function nonEmptyString(value) {
  return typeof value === "string" && Boolean(value.trim());
}
function describeValue(value) {
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return "\u6570\u7EC4";
  if (isPlainObject(value)) return "\u5BF9\u8C61";
  return String(value);
}
function inheritedEnumerableKey(value) {
  for (const key in value) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) return key;
  }
  return null;
}
function isPlainHeadersObject(value) {
  if (!isPlainObject(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype === null) return true;
  if (Object.getPrototypeOf(prototype) !== null) return false;
  if (typeof prototype.constructor !== "function" || prototype.constructor.name !== "Object") return false;
  if (prototype.constructor.prototype !== prototype) return false;
  return inheritedEnumerableKey(value) === null;
}
function describeUnknownKeys(input, allowed) {
  const allowedSet = new Set(allowed);
  return Object.keys(input).filter((key) => !allowedSet.has(key));
}
function editDistance(a, b) {
  const rows = Array.from({ length: a.length + 1 }, (_, index) => [index]);
  for (let column = 1; column <= b.length; column += 1) rows[0][column] = column;
  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      rows[row][column] = Math.min(
        rows[row - 1][column] + 1,
        rows[row][column - 1] + 1,
        rows[row - 1][column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1)
      );
    }
  }
  return rows[a.length][b.length];
}
function findKeySuggestion(key, allowed) {
  const lower = key.toLowerCase();
  return allowed.find((candidate) => {
    const target = candidate.toLowerCase();
    return target === lower || editDistance(lower, target) <= 1;
  });
}
function looksLikeKeyTypo(key, allowed) {
  return findKeySuggestion(key, allowed) !== void 0;
}
var HTTP_STEP_KEYS = contract.scenario.stepKeys.filter((key) => key !== "name" && key !== "adapter");
function unknownKeysMessage(label, unknownKeys, allowed, hint = "") {
  const described = unknownKeys.map((key) => {
    const suggestion = findKeySuggestion(key, allowed);
    return suggestion ? `"${key}"\uFF08\u662F\u5426\u60F3\u5199 "${suggestion}"\uFF1F\uFF09` : `"${key}"`;
  });
  return `${label} \u5305\u542B\u672A\u77E5\u952E ${described.join(", ")}\uFF0C\u5141\u8BB8\u7684\u952E\u4E3A ${allowed.join("/")}${hint}`;
}
function assertKnownKeys(input, allowed, label, hint = "") {
  const unknownKeys = describeUnknownKeys(input, allowed);
  invariant(
    unknownKeys.length === 0,
    unknownKeysMessage(label, unknownKeys, allowed, hint),
    "SCENARIO_CONFIG_UNKNOWN_KEY"
  );
}
function normalizeBaseUrl(value, label) {
  if (value === void 0 || value === null) return value;
  invariant(
    typeof value === "string",
    `${label} \u5FC5\u987B\u662F http(s):// URL \u5B57\u7B26\u4E32\uFF08\u5F53\u524D ${JSON.stringify(value)}\uFF09`,
    "SCENARIO_CONFIG_BASE_URL"
  );
  const trimmed = value.trim();
  if (!trimmed) return "";
  invariant(
    /^https?:\/\//i.test(trimmed),
    `${label} \u5FC5\u987B\u4EE5 http:// \u6216 https:// \u5F00\u5934\uFF08\u5F53\u524D ${JSON.stringify(value)}\uFF09`,
    "SCENARIO_CONFIG_BASE_URL"
  );
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    invariant(false, `${label} \u4E0D\u662F\u5408\u6CD5\u7684 http(s) URL\uFF08\u5F53\u524D ${JSON.stringify(value)}\uFF09`, "SCENARIO_CONFIG_BASE_URL");
  }
  invariant(
    (parsed.protocol === "http:" || parsed.protocol === "https:") && Boolean(parsed.hostname),
    `${label} \u4E0D\u662F\u5408\u6CD5\u7684 http(s) URL\uFF08\u5F53\u524D ${JSON.stringify(value)}\uFF09`,
    "SCENARIO_CONFIG_BASE_URL"
  );
  return trimmed;
}
function assertUnique(items, field, label) {
  const seen = /* @__PURE__ */ new Set();
  for (const item of items) {
    const value = item[field];
    invariant(!seen.has(value), `${label}\u91CD\u590D: ${value}`);
    seen.add(value);
  }
}
var TEMPLATE_EXPR_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g;
var TEMPLATE_OPERATOR_CHARS = /[><=!&|?:()]/;
var TEMPLATE_PATH_HINT = '\u6A21\u677F\u53EA\u505A\u8DEF\u5F84\u53D6\u503C\uFF08vars.* / lastResponse.* / lastResponseBody.*\uFF09\uFF0C\u6BD4\u8F83/\u4E09\u5143/\u903B\u8F91\u5224\u65AD\u8BF7\u6539\u7528\u65AD\u8A00\u6216 when \u5BF9\u8C61\u5F62\u5F0F\uFF1B\u82E5\u952E\u540D\u672C\u8EAB\u542B\u8FD0\u7B97\u7B26\u5B57\u7B26\uFF0C\u8BF7\u6539\u7528\u5F15\u53F7\u952E\u5199\u6CD5 vars["a:b"]';
function assertTemplatePathsOnly(value, trail, seen = /* @__PURE__ */ new WeakSet()) {
  if (typeof value === "string") {
    if (!value.includes("{{")) return;
    for (const match of value.matchAll(TEMPLATE_EXPR_PATTERN)) {
      const expression = match[1].trim();
      const tokens = tokenizePath(expression);
      if (tokens === null) {
        invariant(
          !TEMPLATE_OPERATOR_CHARS.test(expression),
          `${trail} \u7684\u6A21\u677F {{${expression}}} \u4E0D\u5141\u8BB8\u4F7F\u7528\u8FD0\u7B97\u7B26\uFF1A${TEMPLATE_PATH_HINT}`
        );
        invariant(false, `${trail} \u7684\u6A21\u677F {{${expression}}} \u4E0D\u662F\u5408\u6CD5\u8DEF\u5F84\u5199\u6CD5\uFF1A\u652F\u6301 \u70B9\u6BB5/\u6574\u6570\u4E0B\u6807/\u5F15\u53F7\u952E\uFF08vars.a\u3001list[-1]\u3001vars["a>b"]\uFF09\uFF0C\u4E0D\u5141\u8BB8\u7A7A\u4E0B\u6807\u6216\u672A\u95ED\u5408\u62EC\u53F7`);
        continue;
      }
      for (const token of tokens) {
        if (token.startsWith("[")) continue;
        invariant(
          !TEMPLATE_OPERATOR_CHARS.test(token),
          `${trail} \u7684\u6A21\u677F {{${expression}}} \u4E0D\u5141\u8BB8\u4F7F\u7528\u8FD0\u7B97\u7B26\uFF1A${TEMPLATE_PATH_HINT}`
        );
      }
    }
    return;
  }
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertTemplatePathsOnly(item, `${trail}[${index}]`, seen));
    return;
  }
  if (isPlainObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      assertTemplatePathsOnly(item, `${trail}.${key}`, seen);
    }
  }
}
function normalizeGlobals(globals, label) {
  const types = contract.globals.types;
  const result = Array.isArray(globals) ? globals.map((item, index) => {
    invariant(isPlainObject(item), `${label}\u7B2C ${index + 1} \u4E2A\u5168\u5C40\u53C2\u6570\u5FC5\u987B\u662F\u5BF9\u8C61`);
    invariant(types.includes(item.type), `${label}\u7B2C ${index + 1} \u4E2A\u5168\u5C40\u53C2\u6570 type \u5FC5\u987B\u662F ${types.join("/")}`);
    invariant(nonEmptyString(item.name), `${label}\u7B2C ${index + 1} \u4E2A\u5168\u5C40\u53C2\u6570\u7F3A\u5C11 name`);
    return normalizeGlobalParam(item);
  }) : [];
  const seen = /* @__PURE__ */ new Set();
  for (const item of result) {
    const key = `${item.type}:${item.name}`;
    invariant(!seen.has(key), `${label}\u5168\u5C40\u53C2\u6570\u91CD\u590D: ${key}`);
    seen.add(key);
  }
  return result;
}
function defineScenario(input) {
  invariant(isPlainObject(input), "\u573A\u666F\u5FC5\u987B\u662F\u5BF9\u8C61");
  invariant(typeof input.name === "string" && input.name.trim(), "\u573A\u666F\u7F3A\u5C11 name");
  invariant(Array.isArray(input.steps), `\u573A\u666F ${input.name} \u7F3A\u5C11 steps \u6570\u7EC4`);
  const unknownScenarioKeys = describeUnknownKeys(input, contract.scenario.keys);
  invariant(
    unknownScenarioKeys.length === 0,
    unknownKeysMessage(`\u573A\u666F ${input.name}`, unknownScenarioKeys, contract.scenario.keys, "\uFF08\u573A\u666F\u9876\u5C42\u53EA\u63A5\u53D7\u5951\u7EA6\u58F0\u660E\u7684\u5B57\u6BB5\uFF09")
  );
  assertNoReservedVars(input.vars, `\u573A\u666F ${input.name} \u7684 vars`);
  assertNoReservedVars(input.envVars, `\u573A\u666F ${input.name} \u7684 envVars`);
  assertTemplatePathsOnly(input, `\u573A\u666F ${input.name}`);
  let generatedVarIndex = 0;
  for (const definition of input.generatedVars || []) {
    generatedVarIndex += 1;
    const label = `\u573A\u666F ${input.name} \u7684 generatedVars \u7B2C ${generatedVarIndex} \u9879`;
    invariant(isPlainObject(definition), `${label} \u5FC5\u987B\u662F\u5BF9\u8C61`);
    invariant(nonEmptyString(definition.name), `${label} \u7F3A\u5C11 name`);
    assertNotReservedVar(definition.name, `${label} name`);
    invariant(
      contract.generatedVars.types.includes(definition.type),
      `\u573A\u666F ${input.name} \u7684 generatedVars \u7C7B\u578B\u4E0D\u652F\u6301: ${definition.type}\uFF08\u652F\u6301 ${contract.generatedVars.types.join("/")}\uFF09`
    );
  }
  input.steps.forEach((step, index) => {
    invariant(isPlainObject(step), `\u573A\u666F ${input.name} \u7B2C ${index + 1} \u6B65\u5FC5\u987B\u662F\u5BF9\u8C61`);
    invariant(nonEmptyString(step.name), `\u573A\u666F ${input.name} \u7B2C ${index + 1} \u6B65\u7F3A\u5C11 name`);
    const stepLabel = `\u573A\u666F ${input.name} \u7B2C ${index + 1} \u6B65\uFF08\u6B65\u9AA4 ${step.name}\uFF09`;
    if (step.request !== void 0) {
      invariant(
        isPlainObject(step.request),
        `\u6B65\u9AA4 ${step.name} \u7684 request \u5FC5\u987B\u662F\u5BF9\u8C61\uFF08\u5F53\u524D ${JSON.stringify(step.request)}\uFF0C\u975E\u5BF9\u8C61\u4F1A\u5728\u8FD0\u884C\u671F\u88AB\u9759\u9ED8\u5FFD\u7565\uFF09`
      );
      const inheritedRequestKey = inheritedEnumerableKey(step.request);
      invariant(
        inheritedRequestKey === null,
        `${stepLabel} \u7684 request \u5305\u542B\u7EE7\u627F\u7684\u53EF\u679A\u4E3E\u5B57\u6BB5 "${inheritedRequestKey}"\uFF08\u8FD0\u884C\u671F clone \u53EA\u4FDD\u7559\u81EA\u6709\u5B57\u6BB5\uFF0C\u4F1A\u9759\u9ED8\u4E22\u5931\uFF1B\u8BF7\u6539\u4E3A\u5BF9\u8C61\u81EA\u6709\u5B57\u6BB5\uFF09`
      );
      if (step.request.params !== void 0) {
        invariant(
          isPlainObject(step.request.params),
          `\u6B65\u9AA4 ${step.name} \u7684 request.params \u5FC5\u987B\u662F\u5BF9\u8C61\uFF08\u5F53\u524D ${JSON.stringify(step.request.params)}\uFF0C\u975E\u5BF9\u8C61\u4F1A\u5BFC\u81F4\u6574\u4E2A query \u88AB\u9759\u9ED8\u4E22\u5F03\uFF09`
        );
      }
    }
    if (step.params !== void 0) {
      invariant(
        isPlainObject(step.params),
        `\u6B65\u9AA4 ${step.name} \u7684 params \u5FC5\u987B\u662F\u5BF9\u8C61\uFF08\u5F53\u524D ${JSON.stringify(step.params)}\uFF0C\u975E\u5BF9\u8C61\u4F1A\u5BFC\u81F4\u6574\u4E2A query \u88AB\u9759\u9ED8\u4E22\u5F03\uFF09`
      );
    }
    if (step.params !== void 0 && isPlainObject(step.request) && step.request.params !== void 0) {
      invariant(
        false,
        `\u6B65\u9AA4 ${step.name} \u540C\u65F6\u58F0\u660E\u4E86 params \u4E0E request.params\uFF0C\u8FD0\u884C\u671F\u53EA\u53D6 params\uFF08request.params \u4F1A\u88AB\u9759\u9ED8\u5FFD\u7565\uFF09\uFF0C\u8BF7\u4E8C\u9009\u4E00`
      );
    }
    if (step.method !== void 0) invariant(nonEmptyString(step.method), `\u6B65\u9AA4 ${step.name} \u7684 method \u65E0\u6548`);
    const isAdapterStep = step.adapter !== void 0;
    if (isAdapterStep) {
      invariant(
        typeof step.adapter === "string" && step.adapter.trim() !== "",
        `\u6B65\u9AA4 ${step.name} \u7684 adapter \u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32\uFF08\u5DF2\u6CE8\u518C\u9002\u914D\u5668\u540D\uFF09\uFF0C\u5F53\u524D\u503C\u8FD0\u884C\u671F\u4F1A\u88AB\u5F53\u6210\u65E0\u9002\u914D\u5668\u8D70 HTTP`
      );
    }
    if (typeof step.method === "string" && step.method.includes("{{") && !isAdapterStep) {
      invariant(false, `\u6B65\u9AA4 ${step.name} \u7684 method \u4E0D\u652F\u6301\u6A21\u677F\u5199\u6CD5\uFF08step.method \u4E0D\u505A {{ }} \u89E3\u6790\uFF0C\u4F1A\u6309\u5B57\u9762\u91CF\u53D1\u9001\uFF09\uFF0C\u8BF7\u5199\u5177\u4F53\u65B9\u6CD5\u540D\u6216\u6539\u7528 request.method \u6A21\u677F\uFF1B\u9002\u914D\u5668\u6B65\u9AA4\u8BF7\u663E\u5F0F\u58F0\u660E adapter \u5B57\u6BB5`);
    }
    const requestDef = isPlainObject(step.request) ? step.request : {};
    const rawMethod = String(step.method || requestDef.method || "GET");
    const effectiveMethod = rawMethod.toUpperCase();
    const methodIsTemplate = step.method === void 0 && String(requestDef.method || "").includes("{{");
    if (!isAdapterStep && !methodIsTemplate && (effectiveMethod === "GET" || effectiveMethod === "HEAD")) {
      invariant(
        (requestDef.body === void 0 || requestDef.body === null) && (requestDef.fileUpload === void 0 || requestDef.fileUpload === null),
        `\u6B65\u9AA4 ${step.name} \u7684 ${effectiveMethod} \u8BF7\u6C42\u4E0D\u80FD\u643A\u5E26\u8BF7\u6C42\u4F53\uFF08request.body / request.fileUpload \u4F1A\u88AB\u4E22\u5F03\uFF09\uFF0C\u8BF7\u6539\u7528 POST/PUT/PATCH \u7B49\u65B9\u6CD5\u3001\u628A\u53C2\u6570\u653E\u8FDB params\uFF0C\u6216\u663E\u5F0F\u58F0\u660E adapter \u4EA4\u7ED9\u9002\u914D\u5668\u5904\u7406`
      );
    }
    const stepContext = { scenarioName: input.name, stepNo: index + 1, stepName: step.name };
    if (step.assertions !== void 0) {
      invariant(Array.isArray(step.assertions), `\u6B65\u9AA4 ${step.name} \u7684 assertions \u5FC5\u987B\u662F\u6570\u7EC4`);
      step.assertions.forEach((definition, assertionIndex) => {
        validateAssertion(definition, { ...stepContext, assertionNo: assertionIndex + 1 });
      });
    }
    if (step.retryUntil !== void 0) {
      invariant(isPlainObject(step.retryUntil), `\u6B65\u9AA4 ${step.name} \u7684 retryUntil \u5FC5\u987B\u662F\u5BF9\u8C61`);
      invariant(
        step.retryUntil.assertions === void 0,
        `\u6B65\u9AA4 ${step.name} \u7684 retryUntil \u4E0D\u652F\u6301 assertions \u5B57\u6BB5\uFF08\u91CD\u8BD5\u5224\u5B9A\u4F7F\u7528\u6B65\u9AA4\u9876\u5C42 assertions\uFF09\uFF0C\u8BF7\u628A\u65AD\u8A00\u79FB\u5230\u6B65\u9AA4\u7684 assertions`
      );
      const unknownRetryKeys = Object.keys(step.retryUntil).filter((key) => !contract.retryUntil.keys.includes(key));
      invariant(
        unknownRetryKeys.length === 0,
        `\u6B65\u9AA4 ${step.name} \u7684 retryUntil \u5305\u542B\u672A\u77E5\u952E ${unknownRetryKeys.map((key) => `"${key}"`).join(", ")}\uFF0C\u5141\u8BB8\u7684\u952E\u4E3A ${contract.retryUntil.keys.join("/")}`
      );
      const maxAttempts = Number(step.retryUntil.maxAttempts ?? 10);
      const intervalMs = Number(step.retryUntil.intervalMs ?? 2e3);
      const maxElapsedMs = Number(step.retryUntil.maxElapsedMs ?? 3e5);
      invariant(Number.isInteger(maxAttempts) && maxAttempts >= 1, `\u6B65\u9AA4 ${step.name} \u7684 maxAttempts \u5FC5\u987B\u662F\u6B63\u6574\u6570`);
      invariant(Number.isFinite(intervalMs) && intervalMs >= 0, `\u6B65\u9AA4 ${step.name} \u7684 intervalMs \u4E0D\u80FD\u4E3A\u8D1F\u6570`);
      invariant(Number.isFinite(maxElapsedMs) && maxElapsedMs > 0, `\u6B65\u9AA4 ${step.name} \u7684 maxElapsedMs \u5FC5\u987B\u662F\u6B63\u6570`);
      if (step.retryUntil.intervalFactor !== void 0) {
        const intervalFactor = Number(step.retryUntil.intervalFactor);
        invariant(
          Number.isFinite(intervalFactor) && intervalFactor >= 1,
          `\u6B65\u9AA4 ${step.name} \u7684 intervalFactor \u5FC5\u987B\u662F \u22651 \u7684\u6709\u9650\u6570\u5B57\uFF08\u5F53\u524D ${String(step.retryUntil.intervalFactor)}\uFF09`
        );
      }
      if (step.retryUntil.maxIntervalMs !== void 0) {
        const maxIntervalMs = Number(step.retryUntil.maxIntervalMs);
        invariant(
          Number.isFinite(maxIntervalMs) && maxIntervalMs >= intervalMs,
          `\u6B65\u9AA4 ${step.name} \u7684 maxIntervalMs \u5FC5\u987B\u662F \u2265 intervalMs \u7684\u6709\u9650\u6570\u5B57\uFF08\u5F53\u524D ${String(step.retryUntil.maxIntervalMs)}\uFF0CintervalMs=${intervalMs}\uFF09`
        );
      }
      if (step.retryUntil.retryOn !== void 0) {
        invariant(
          Array.isArray(step.retryUntil.retryOn),
          `\u6B65\u9AA4 ${step.name} \u7684 retryOn \u5FC5\u987B\u662F\u6570\u7EC4\uFF08\u652F\u6301 ${contract.retryUntil.retryOn.join("/")}\uFF09`
        );
        for (const retryType of step.retryUntil.retryOn) {
          invariant(
            contract.retryUntil.retryOn.includes(retryType),
            `\u6B65\u9AA4 ${step.name} \u7684 retryOn \u9879\u53EA\u652F\u6301 ${contract.retryUntil.retryOn.join("/")}\uFF08\u5F53\u524D ${JSON.stringify(retryType)}\uFF09`
          );
        }
      }
    }
    if (step.extract !== void 0) {
      invariant(Array.isArray(step.extract), `\u6B65\u9AA4 ${step.name} \u7684 extract \u5FC5\u987B\u662F\u6570\u7EC4`);
      step.extract.forEach((item, extractIndex) => {
        const label = `\u6B65\u9AA4 ${step.name} \u7684 extract \u7B2C ${extractIndex + 1} \u9879`;
        invariant(isPlainObject(item), `${label} \u5FC5\u987B\u662F\u5BF9\u8C61\uFF08{ name, path?, from?, required?, default? }\uFF09`);
        const unknownKeys = Object.keys(item).filter((key) => !contract.extract.metaKeys.includes(key));
        invariant(
          unknownKeys.length === 0,
          `${label} \u5305\u542B\u672A\u77E5\u952E ${unknownKeys.map((key) => `"${key}"`).join(", ")}\uFF0C\u5141\u8BB8\u7684\u952E\u4E3A ${contract.extract.metaKeys.join("/")}`
        );
        invariant(nonEmptyString(item.name), `${label} \u7F3A\u5C11 name`);
        invariant(
          !item.name.includes("{{"),
          `${label} \u7684 name \u4E0D\u652F\u6301 {{ }} \u6A21\u677F\u2014\u2014\u53D8\u91CF\u540D\u6309\u5B57\u9762\u4F7F\u7528\u4E0D\u89E3\u6790\uFF0C\u4F1A\u5199\u6210\u6B7B\u53D8\u91CF\uFF08\u5F53\u524D ${JSON.stringify(item.name)}\uFF09`
        );
        assertNotReservedVar(item.name, `${label} name`);
        invariant(
          item.required === void 0 || typeof item.required === "boolean",
          `${label} \u7684 required \u5FC5\u987B\u662F\u5E03\u5C14\u503C\uFF08\u5F53\u524D ${JSON.stringify(item.required)}\u2014\u2014\u975E true \u503C\u4F1A\u9759\u9ED8\u964D\u7EA7\u4E3A\u300C\u975E\u5FC5\u9700\u300D\uFF09`
        );
        invariant(
          !(item.required === true && item.default !== void 0),
          `${label} \u7684 required: true \u4E0E default \u4E92\u65A5\uFF0C\u53EA\u80FD\u58F0\u660E\u5176\u4E00`
        );
        if (item.header !== void 0) {
          invariant(
            typeof item.header === "string" && item.header.trim() !== "" && !item.header.includes("{{"),
            `${label} \u7684 header \u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32\u4E14\u4E0D\u652F\u6301 {{ }} \u6A21\u677F\uFF08\u5934\u540D\u6309\u5B57\u9762\u5339\u914D\u4E0D\u89E3\u6790\uFF1B\u5F53\u524D ${JSON.stringify(item.header)}\uFF09`
          );
        }
        if (item.target !== void 0) {
          invariant(
            contract.extract.targets.includes(item.target),
            `${label} \u7684 target \u53EA\u652F\u6301 ${contract.extract.targets.join("/")}\uFF08\u5F53\u524D ${JSON.stringify(item.target)}\uFF09`
          );
        }
        if (item.from !== void 0) {
          invariant(
            contract.extract.from.includes(item.from),
            `${label} \u7684 from \u53EA\u652F\u6301 ${contract.extract.from.join("/")}\uFF08\u5F53\u524D ${JSON.stringify(item.from)}\uFF0C\u7F3A\u7701\u6309 body \u53D6\u503C\uFF09`
          );
        }
        if (item.path !== void 0) {
          invariant(
            typeof item.path === "string" && !item.path.includes("{{") && (item.path === "" || tokenizePath(item.path) !== null),
            `${label} \u7684 path \u4E0D\u662F\u5408\u6CD5\u8DEF\u5F84\u5199\u6CD5\uFF08\u652F\u6301 \u70B9\u6BB5/\u6574\u6570\u4E0B\u6807/\u5F15\u53F7\u952E\uFF0C\u4E0D\u652F\u6301 {{ }} \u6A21\u677F\uFF1B\u5F53\u524D ${JSON.stringify(item.path)}\uFF09`
          );
        }
      });
    }
    if (step.when !== void 0) {
      if (isPlainObject(step.when)) {
        const hasFrom = step.when.from !== void 0;
        if (hasFrom && !contract.when.sources.includes(step.when.from)) {
          throw new TypeError(
            `\u6B65\u9AA4 ${step.name} \u7684 when \u5BF9\u8C61\u5F62\u5F0F\u6765\u6E90\u53EA\u652F\u6301 ${contract.when.sources.join("/")}\uFF08\u5F53\u524D\u4E3A ${JSON.stringify(step.when.from)}\uFF09\uFF0C\u4E0D\u5141\u8BB8\u4ECE\u5176\u4ED6\u54CD\u5E94\u6765\u6E90\u53D6\u6761\u4EF6`
          );
        }
        if (!hasFrom && step.when.target === void 0) {
          throw new TypeError(
            `\u6B65\u9AA4 ${step.name} \u7684 when \u5BF9\u8C61\u5F62\u5F0F\u5FC5\u987B\u58F0\u660E\u6765\u6E90 from\uFF08${contract.when.sources.join("/")}\uFF09\u6216 target: "${contract.when.targets.join("/")}"`
          );
        }
        if (step.when.target !== void 0 && !contract.when.targets.includes(step.when.target)) {
          throw new TypeError(
            `\u6B65\u9AA4 ${step.name} \u7684 when \u5BF9\u8C61\u5F62\u5F0F target \u53EA\u652F\u6301 ${contract.when.targets.join("/")}\uFF08\u5F53\u524D ${JSON.stringify(step.when.target)}\uFF09\uFF1Bduration \u7B49\u5176\u4F59\u54CD\u5E94\u7EA7\u901A\u9053\u4EC5\u7528\u4E8E assertions`
          );
        }
        if (hasFrom && step.when.target !== void 0) {
          throw new TypeError(
            `\u6B65\u9AA4 ${step.name} \u7684 when \u5BF9\u8C61\u5F62\u5F0F\u4E0D\u5141\u8BB8\u4F7F\u7528 target/header \u6761\u4EF6\u4E0E from \u6DF7\u7528\uFF08target: "${contract.when.targets.join("/")}" \u5355\u72EC\u4F7F\u7528\u5373\u53EF\uFF09`
          );
        }
        if (step.when.header !== void 0) {
          throw new TypeError(`\u6B65\u9AA4 ${step.name} \u7684 when \u5BF9\u8C61\u5F62\u5F0F\u4E0D\u5141\u8BB8\u4F7F\u7528 header \u6761\u4EF6`);
        }
        validateAssertion(normalizeWhenDefinition(step.when), stepContext);
      } else {
        invariant(
          typeof step.when === "boolean" || typeof step.when === "string" && /^\s*\{\{[^{}]*\S[^{}]*\}\}\s*$/.test(step.when),
          `\u6B65\u9AA4 ${step.name} \u7684 when \u53EA\u652F\u6301\u5BF9\u8C61\u65AD\u8A00\u3001\u6574\u4E32 {{ }} \u6A21\u677F\uFF08\u5982 "{{vars.flag}}"\uFF0Cresolve \u4FDD\u771F\u503C\uFF09\u6216\u5E03\u5C14\u503C\uFF08\u5F53\u524D ${JSON.stringify(step.when)}\u2014\u2014\u88F8\u5B57\u7B26\u4E32\u6309\u771F\u503C\u5224\u5B9A\u3001\u90E8\u5206\u6A21\u677F\u5982 "pre {{vars.x}}" \u89E3\u6790\u6210\u975E\u7A7A\u4E32\u6052\u771F\uFF0C\u5747\u975E\u672C\u610F\uFF09`
        );
      }
    }
    const unknownStepKeys = describeUnknownKeys(step, contract.scenario.stepKeys);
    const hasHttpExecution = step.adapter === void 0 && HTTP_STEP_KEYS.some((key) => step[key] !== void 0);
    const rejectedKeys = hasHttpExecution ? unknownStepKeys : unknownStepKeys.filter((key) => looksLikeKeyTypo(key, contract.scenario.stepKeys));
    invariant(
      rejectedKeys.length === 0,
      unknownKeysMessage(`\u573A\u666F ${input.name} \u7B2C ${index + 1} \u6B65\uFF08\u6B65\u9AA4 ${step.name}\uFF09`, rejectedKeys, contract.scenario.stepKeys)
    );
    if (step.timeoutMs !== void 0) {
      invariant(
        typeof step.timeoutMs === "number" && Number.isFinite(step.timeoutMs) && step.timeoutMs > 0,
        `${stepLabel} \u7684 timeoutMs \u5FC5\u987B\u662F\u6B63\u6570\uFF08\u6BEB\u79D2\uFF0C\u4E14\u4E0D\u652F\u6301 {{ }} \u6A21\u677F\uFF1B\u5F53\u524D ${describeValue(step.timeoutMs)}\u2014\u2014\u975E\u6CD5\u503C\u4F1A\u88AB\u8FD0\u884C\u671F\u9759\u9ED8\u94B3\u5236\u4E3A 30000ms\uFF09`
      );
    }
    if (requestDef.timeoutMs !== void 0) {
      const requestTimeoutMs = requestDef.timeoutMs;
      const isWholeTemplate = typeof requestTimeoutMs === "string" && /^\s*\{\{[^{}]*\S[^{}]*\}\}\s*$/.test(requestTimeoutMs);
      invariant(
        isWholeTemplate || typeof requestTimeoutMs === "number" && Number.isFinite(requestTimeoutMs) && requestTimeoutMs > 0,
        `${stepLabel} \u7684 request.timeoutMs \u5FC5\u987B\u662F\u6B63\u6570\u6216\u6574\u4E32 {{ }} \u6A21\u677F\uFF08\u5F53\u524D ${describeValue(requestTimeoutMs)}\u2014\u2014\u975E\u6CD5\u503C\u4F1A\u88AB\u8FD0\u884C\u671F\u9759\u9ED8\u94B3\u5236\u4E3A 30000ms\uFF09`
      );
    }
    if (step.saveResponseAs !== void 0) {
      invariant(
        nonEmptyString(step.saveResponseAs),
        `${stepLabel} \u7684 saveResponseAs \u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32\uFF08\u5141\u8BB8 {{ }} \u6A21\u677F\uFF1B\u5F53\u524D ${describeValue(step.saveResponseAs)}\u2014\u2014\u7A7A\u4E32\u4F1A\u9759\u9ED8\u4E0D\u4FDD\u5B58\uFF09`
      );
    }
    if (step.path !== void 0) {
      invariant(
        typeof step.path === "string",
        `${stepLabel} \u7684 path \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\uFF08\u5141\u8BB8 {{ }} \u6A21\u677F\uFF1B\u5F53\u524D ${describeValue(step.path)}\uFF09`
      );
    }
    if (requestDef.path !== void 0) {
      invariant(
        typeof requestDef.path === "string",
        `${stepLabel} \u7684 request.path \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\uFF08\u5141\u8BB8 {{ }} \u6A21\u677F\uFF1B\u5F53\u524D ${describeValue(requestDef.path)}\uFF09`
      );
    }
    if (requestDef.headers !== void 0) {
      invariant(
        isPlainHeadersObject(requestDef.headers),
        `${stepLabel} \u7684 request.headers \u5FC5\u987B\u662F\u666E\u901A\u5BF9\u8C61\uFF08\u5F53\u524D ${describeValue(requestDef.headers)}\u2014\u2014\u975E\u5BF9\u8C61\u4F1A\u88AB\u5C55\u5F00\u6210\u5B57\u7B26\u4E32\u4E0B\u6807\u952E\uFF0C\u4EA7\u751F\u65E0\u6548\u8BF7\u6C42\u5934\uFF09`
      );
    }
  });
  const failurePolicy = input.failurePolicy || "stop";
  invariant(contract.scenario.failurePolicies.includes(failurePolicy), "failurePolicy \u53EA\u80FD\u662F stop \u6216 continue");
  return { ...input, failurePolicy, steps: [...input.steps] };
}
function defineConfig(input) {
  invariant(isPlainObject(input), "\u914D\u7F6E\u5FC5\u987B\u662F\u5BF9\u8C61");
  assertKnownKeys(input, contract.config.configKeys, "\u914D\u7F6E", "\uFF08\u914D\u7F6E\u9876\u5C42\u53EA\u63A5\u53D7\u5951\u7EA6\u58F0\u660E\u7684\u5B57\u6BB5\uFF09");
  assertTemplatePathsOnly(input, "\u914D\u7F6E");
  const baseUrl = normalizeBaseUrl(input.baseUrl, "\u914D\u7F6E\u9876\u5C42 baseUrl");
  const globals = normalizeGlobals(input.globals, "\u5168\u5C40");
  const envs = Array.isArray(input.envs) ? input.envs.map((env, index) => {
    invariant(isPlainObject(env), `\u7B2C ${index + 1} \u4E2A\u73AF\u5883\u5B9A\u4E49\u65E0\u6548`);
    assertKnownKeys(env, contract.config.environmentKeys, `\u7B2C ${index + 1} \u4E2A\u73AF\u5883`, "\uFF08\u73AF\u5883\u53EA\u63A5\u53D7\u5951\u7EA6\u58F0\u660E\u7684\u5B57\u6BB5\uFF09");
    return {
      ...env,
      globals: normalizeGlobals(env.globals, `\u73AF\u5883 ${env.key} \u7684`)
    };
  }) : [];
  for (const env of envs) {
    invariant(nonEmptyString(env.key) && nonEmptyString(env.name), "\u6BCF\u4E2A\u73AF\u5883\u5FC5\u987B\u5305\u542B\u975E\u7A7A key \u548C name");
    env.baseUrl = normalizeBaseUrl(env.baseUrl, `\u73AF\u5883 ${env.key} \u7684 baseUrl`);
  }
  assertUnique(envs, "key", "\u73AF\u5883 key");
  const scenarios = (Array.isArray(input.scenarios) ? input.scenarios : []).map((entry, index) => {
    if (typeof entry === "string") {
      invariant(nonEmptyString(entry), `\u7B2C ${index + 1} \u4E2A\u573A\u666F\u5730\u5740\u4E0D\u80FD\u4E3A\u7A7A`);
      return { id: entry, name: entry, url: entry };
    }
    invariant(isPlainObject(entry), `\u7B2C ${index + 1} \u4E2A\u573A\u666F\u6E05\u5355\u9879\u65E0\u6548`);
    const url = entry.url || entry.file || entry.path || "";
    const id = entry.id || url || `scenario-${index + 1}`;
    invariant(nonEmptyString(id), `\u7B2C ${index + 1} \u4E2A\u573A\u666F\u7F3A\u5C11 id`);
    invariant(nonEmptyString(url), `\u573A\u666F ${id} \u7F3A\u5C11 url`);
    if (entry.manual !== void 0) {
      invariant(typeof entry.manual === "boolean", `\u573A\u666F ${id} \u7684 manual \u5FC5\u987B\u662F\u5E03\u5C14\u503C`);
    }
    return { ...entry, id, name: entry.name || id, url };
  });
  assertUnique(scenarios, "id", "\u573A\u666F id");
  const variables = Array.isArray(input.variables) ? input.variables.map((item, index) => {
    invariant(isPlainObject(item), `\u7B2C ${index + 1} \u4E2A\u53D8\u91CF\u5B9A\u4E49\u65E0\u6548`);
    invariant(nonEmptyString(item.name), `\u7B2C ${index + 1} \u4E2A\u53D8\u91CF\u7F3A\u5C11 name`);
    assertKnownKeys(item, contract.config.variableKeys, `\u53D8\u91CF ${item.name}`, "\uFF08\u53D8\u91CF\u53EA\u63A5\u53D7\u5951\u7EA6\u58F0\u660E\u7684\u5B57\u6BB5\uFF09");
    if (item.label !== void 0) invariant(typeof item.label === "string", `\u53D8\u91CF ${item.name} \u7684 label \u5FC5\u987B\u662F\u5B57\u7B26\u4E32`);
    if (item.env !== void 0) invariant(nonEmptyString(item.env), `\u53D8\u91CF ${item.name} \u7684 env \u65E0\u6548`);
    if (item.required !== void 0) invariant(typeof item.required === "boolean", `\u53D8\u91CF ${item.name} \u7684 required \u5FC5\u987B\u662F\u5E03\u5C14\u503C`);
    return { ...item };
  }) : [];
  assertUnique(variables, "name", "\u53D8\u91CF name");
  const defaultEnvKey = input.defaultEnvKey || envs[0]?.key || "";
  invariant(!defaultEnvKey || envs.some((env) => env.key === defaultEnvKey), `defaultEnvKey \u4E0D\u5B58\u5728: ${defaultEnvKey}`);
  const requestTimeoutMs = Number(input.requestTimeoutMs ?? 3e4);
  invariant(Number.isFinite(requestTimeoutMs) && requestTimeoutMs > 0, "requestTimeoutMs \u5FC5\u987B\u662F\u6B63\u6570");
  return {
    ...input,
    baseUrl,
    globals,
    envs,
    scenarios,
    variables,
    defaultEnvKey,
    requestTimeoutMs,
    vars: { ...input.scenarioVars || {}, ...input.vars || {} },
    storagePrefix: input.storagePrefix || "scenario-test"
  };
}
function registerConfig(config) {
  currentConfig = defineConfig(config);
  return currentConfig;
}
function getConfig() {
  return currentConfig;
}
function registerScenario(id, scenario) {
  invariant(typeof id === "string" && id.trim(), "\u573A\u666F id \u4E0D\u80FD\u4E3A\u7A7A");
  const normalized = defineScenario(scenario);
  scenarioRegistry.set(id, normalized);
  return normalized;
}
function getScenario(id) {
  return scenarioRegistry.get(id);
}
function clearScenarios() {
  scenarioRegistry.clear();
}
function registerAdapter(name, adapter) {
  invariant(typeof name === "string" && name.trim(), "\u9002\u914D\u5668\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A");
  validateAdapter(adapter, name);
  if (typeof adapter.initialize === "function") {
    try {
      adapter.initialize();
    } catch (error) {
      throw new TypeError(`\u9002\u914D\u5668 ${name} \u521D\u59CB\u5316\u5931\u8D25: ${error.message}`);
    }
  }
  adapterRegistry.set(name, adapter);
  return adapter;
}
function getAdapter(name) {
  return adapterRegistry.get(name);
}
function listAdapters() {
  return new Map(adapterRegistry);
}
function unregisterAdapter(name) {
  const adapter = adapterRegistry.get(name);
  if (adapter && typeof adapter.dispose === "function") {
    try {
      adapter.dispose();
    } catch (error) {
      console.warn(`\u9002\u914D\u5668 ${escapeInlineText(name)} \u6E05\u7406\u5931\u8D25: ${escapeInlineText(error?.message || error)}`);
    }
  }
  return adapterRegistry.delete(name);
}
function clearAdapters() {
  for (const [name, adapter] of adapterRegistry.entries()) {
    if (typeof adapter.dispose === "function") {
      try {
        adapter.dispose();
      } catch (error) {
        console.warn(`\u9002\u914D\u5668 ${escapeInlineText(name)} \u6E05\u7406\u5931\u8D25: ${escapeInlineText(error?.message || error)}`);
      }
    }
  }
  adapterRegistry.clear();
}

// src/engine.js
function now() {
  return globalThis.performance?.now ? globalThis.performance.now() : Date.now();
}
function abortReason(signal) {
  return signal?.reason || new Error("\u6267\u884C\u5DF2\u53D6\u6D88");
}
function timeoutErrorMessage(timeoutMs) {
  return `\u8BF7\u6C42\u8D85\u65F6\uFF08${timeoutMs}ms\uFF09`;
}
function isTimeoutError(error) {
  return Boolean(error?.scenarioTimedOut || error?.scenarioContext?.timedOut);
}
function describeError(error) {
  const message = String(error?.message || error || "\u8BF7\u6C42\u6267\u884C\u5931\u8D25");
  const causeDetail = error?.cause ? error.cause.code || error.cause.message || String(error.cause) : "";
  return causeDetail && !message.includes(causeDetail) ? `${message}\uFF08${causeDetail}\uFF09` : message;
}
function retryBackoffIntervalMs(retry, attempt, maxElapsedMs) {
  const rawIntervalMs = Number(retry?.intervalMs);
  const baseIntervalMs = Number.isFinite(rawIntervalMs) ? rawIntervalMs : 2e3;
  const rawFactor = Number(retry?.intervalFactor);
  const intervalFactor = Number.isFinite(rawFactor) && rawFactor >= 1 ? rawFactor : 1;
  const rawMaxIntervalMs = Number(retry?.maxIntervalMs);
  const maxIntervalMs = Number.isFinite(rawMaxIntervalMs) && rawMaxIntervalMs >= 0 ? rawMaxIntervalMs : Infinity;
  let computed = baseIntervalMs * Math.pow(intervalFactor, Math.max(0, attempt - 1));
  if (!Number.isFinite(computed)) {
    computed = Number.isFinite(maxIntervalMs) ? maxIntervalMs : maxElapsedMs;
  }
  computed = Math.min(computed, maxIntervalMs);
  return Math.max(100, computed);
}
function delay(milliseconds, signal) {
  if (!milliseconds) return Promise.resolve();
  if (signal?.aborted) return Promise.reject(abortReason(signal));
  return new Promise((resolveDelay, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortReason(signal));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolveDelay();
    }, milliseconds);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
function createTimeoutError(timeoutMs, message) {
  const error = new Error(message || timeoutErrorMessage(timeoutMs));
  error.scenarioTimedOut = true;
  return error;
}
var MAX_TIMER_DELAY_MS = 2147483647;
function scheduleTimeout(callback, timeoutMs) {
  let timer = null;
  let disposed = false;
  const deadline = now() + timeoutMs;
  const tick = () => {
    if (disposed) return;
    const remaining = deadline - now();
    if (remaining <= 0) {
      callback();
      return;
    }
    timer = setTimeout(tick, Math.min(remaining, MAX_TIMER_DELAY_MS));
  };
  tick();
  return {
    clear() {
      disposed = true;
      if (timer) clearTimeout(timer);
    }
  };
}
function resolveTimeoutMs(step, request, options) {
  const stepTimeoutSource = step.timeoutMs || void 0;
  if (stepTimeoutSource !== void 0) {
    const stepTimeout = Number(stepTimeoutSource);
    return Number.isFinite(stepTimeout) && stepTimeout > 0 ? stepTimeout : 3e4;
  }
  if (request.timeoutMs !== void 0) {
    const requestTimeoutSource = request.timeoutMs;
    const hasNumericType = typeof requestTimeoutSource === "number" || typeof requestTimeoutSource === "string" && requestTimeoutSource.trim() !== "";
    const requestTimeout = hasNumericType ? Number(requestTimeoutSource) : NaN;
    if (!hasNumericType || !Number.isFinite(requestTimeout) || requestTimeout <= 0) {
      const value = typeof requestTimeoutSource === "string" || typeof requestTimeoutSource === "object" && requestTimeoutSource !== null ? JSON.stringify(requestTimeoutSource) : String(requestTimeoutSource);
      throw new Error(
        `\u6B65\u9AA4 ${step.name || "\u672A\u547D\u540D\u6B65\u9AA4"} \u7684 request.timeoutMs \u89E3\u6790\u540E\u4E0D\u662F\u6709\u6548\u7684\u6B63\u6570\u6BEB\u79D2\uFF08\u5F53\u524D ${value}\uFF09\uFF0C\u8BF7\u68C0\u67E5\u53D8\u91CF\u503C`
      );
    }
    return requestTimeout;
  }
  const configuredTimeout = Number(options.requestTimeoutMs);
  return Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 3e4;
}
function createRequestSignal(parentSignal, timeoutMs) {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort(abortReason(parentSignal));
  if (parentSignal?.aborted) abort();
  else parentSignal?.addEventListener("abort", abort, { once: true });
  const timer = timeoutMs > 0 ? scheduleTimeout(() => {
    timedOut = true;
    controller.abort(createTimeoutError(timeoutMs));
  }, timeoutMs) : null;
  return {
    signal: controller.signal,
    timedOut() {
      return timedOut;
    },
    dispose() {
      if (timer) timer.clear();
      parentSignal?.removeEventListener("abort", abort);
    }
  };
}
function createRunIdentifiers() {
  const timestamp = String(Date.now());
  const random = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 8) : Math.random().toString(16).slice(2, 10).padEnd(8, "0");
  return {
    runId: `${timestamp}-${random}`,
    runNo: `${timestamp.slice(-6)}-${random.slice(0, 4)}`
  };
}
function buildGeneratedVars(scenario, baseVars, environmentVariables, options = {}) {
  const identifiers = createRunIdentifiers();
  assertNoReservedVars(scenario.vars, "\u573A\u666F vars");
  assertNoReservedVars(baseVars, "\u914D\u7F6E/\u9009\u9879 vars");
  const vars = { ...scenario.vars || {}, ...baseVars || {}, ...identifiers };
  const verboseErrors = options.verboseErrors || typeof process !== "undefined" && process.env?.SCENARIO_VERBOSE_ERRORS === "true";
  for (const [name, environmentName] of Object.entries(scenario.envVars || {})) {
    assertNotReservedVar(name, `\u573A\u666F envVars`);
    const value = environmentVariables?.[environmentName] ?? vars[name];
    if (value === void 0 || value === null || value === "") {
      if (verboseErrors) {
        throw new Error(
          `\u7F3A\u5C11\u573A\u666F\u53D8\u91CF: vars.${name}
\u73AF\u5883\u53D8\u91CF\u6620\u5C04: ${environmentName}
\u63D0\u793A: \u5728\u914D\u7F6E\u4E2D\u8BBE\u7F6E vars.${name} \u6216\u8BBE\u7F6E\u73AF\u5883\u53D8\u91CF ${environmentName}`
        );
      } else {
        throw new Error(
          `\u7F3A\u5C11\u5FC5\u9700\u7684\u573A\u666F\u53D8\u91CF: vars.${name}
\u63D0\u793A: \u8BF7\u5728\u914D\u7F6E\u6587\u4EF6\u7684 vars \u4E2D\u8BBE\u7F6E\u8BE5\u53D8\u91CF\uFF0C\u6216\u901A\u8FC7\u73AF\u5883\u53D8\u91CF\u63D0\u4F9B
\u8BE6\u7EC6\u4FE1\u606F\u53EF\u901A\u8FC7\u8BBE\u7F6E SCENARIO_VERBOSE_ERRORS=true \u67E5\u770B`
        );
      }
    }
    setRuntimeVar(vars, name, value);
  }
  for (const definition of scenario.generatedVars || []) {
    if (!definition?.name) continue;
    assertNotReservedVar(definition.name, "generatedVars");
    if (!contract.generatedVars.types.includes(definition.type)) {
      throw new Error(`\u4E0D\u652F\u6301\u7684 generatedVars \u7C7B\u578B: ${definition.type}`);
    }
    applyGeneratedVar(definition, vars, identifiers);
  }
  return vars;
}
function createRuntime(scenario, options = {}) {
  const config = options.config || {};
  return {
    vars: buildGeneratedVars(
      scenario,
      { ...config.vars || {}, ...options.vars || {} },
      options.environmentVariables || {}
    ),
    lastResponse: null,
    lastResponseBody: null
  };
}
function chooseAdapter(step, adapters) {
  if (step.adapter !== void 0) {
    const name = typeof step.adapter === "string" ? step.adapter : String(step.adapter);
    return { name, adapter: adapters.get(name) };
  }
  for (const [name, adapter] of adapters.entries()) {
    if (typeof adapter.matches === "function" && adapter.matches(step)) return { name, adapter };
  }
  return null;
}
function readBodyChunks(response, signal, maxBytes = 0) {
  if (signal?.aborted) return Promise.reject(abortReason(signal));
  if (!response.body) return Promise.resolve([]);
  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  return new Promise((resolve2, reject) => {
    const onAbort = () => {
      reader.cancel().catch(() => {
      });
      reject(abortReason(signal));
    };
    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          totalBytes += value.byteLength;
          if (maxBytes > 0 && totalBytes > maxBytes) {
            reader.cancel().catch(() => {
            });
            throw createResponseTooLargeError(totalBytes, maxBytes);
          }
          chunks.push(value);
        }
        resolve2(chunks);
      } catch (error) {
        reject(error);
      } finally {
        if (signal) signal.removeEventListener("abort", onAbort);
      }
    })();
  });
}
function createResponseTooLargeError(bytesRead, limitBytes) {
  const error = new Error(`\u54CD\u5E94\u4F53\u8D85\u8FC7\u5927\u5C0F\u4E0A\u9650: \u5DF2\u8BFB\u53D6 ${bytesRead} \u5B57\u8282\uFF0C\u9650\u5236 ${limitBytes} \u5B57\u8282`);
  error.scenarioResponseTooLarge = true;
  error.responseTooLarge = { bytesRead, limitBytes };
  return error;
}
function resolveMaxResponseBytes(options = {}) {
  const value = options.maxResponseBytes === void 0 ? options.config?.maxResponseBytes : options.maxResponseBytes;
  return normalizeByteLimit(value);
}
function resolveMaxUploadBytes(options = {}) {
  const value = options.maxUploadBytes === void 0 ? options.config?.maxUploadBytes : options.maxUploadBytes;
  return value === void 0 ? void 0 : normalizeByteLimit(value);
}
function createSaveBodyStream(body, signal, maxBytes) {
  if (!body) {
    return new ReadableStream({
      start(controller) {
        if (signal?.aborted) controller.error(abortReason(signal));
        else controller.close();
      }
    });
  }
  const reader = body.getReader();
  let totalBytes = 0;
  let finished = false;
  let onAbort = null;
  const cleanup = () => {
    finished = true;
    if (onAbort && signal) signal.removeEventListener("abort", onAbort);
    onAbort = null;
  };
  const cancelReader = (reason) => reader.cancel(reason).catch(() => {
  });
  return new ReadableStream({
    start(controller) {
      if (!signal) return;
      onAbort = () => {
        if (finished) return;
        cleanup();
        cancelReader(abortReason(signal));
        controller.error(abortReason(signal));
      };
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
    },
    async pull(controller) {
      if (finished) return;
      try {
        const { done, value } = await reader.read();
        if (finished) return;
        if (done) {
          cleanup();
          controller.close();
          return;
        }
        totalBytes += value.byteLength;
        if (maxBytes > 0 && totalBytes > maxBytes) {
          cleanup();
          cancelReader();
          controller.error(createResponseTooLargeError(totalBytes, maxBytes));
          return;
        }
        controller.enqueue(value);
      } catch (error) {
        if (finished) return;
        cleanup();
        controller.error(error);
      }
    },
    cancel(reason) {
      cleanup();
      return cancelReader(reason);
    }
  });
}
function decoderForContentType(contentType) {
  const match = /charset\s*=\s*"?([^;"\s]+)"?/i.exec(String(contentType || ""));
  if (!match) return new TextDecoder();
  try {
    return new TextDecoder(match[1]);
  } catch {
    return new TextDecoder();
  }
}
async function readResponse(response, step, io, runtime, signal, options = {}) {
  const headers = headersToObject(response.headers);
  const contentType = String(headers["content-type"] || "");
  const maxResponseBytes = resolveMaxResponseBytes(options);
  if (step.saveResponseAs) {
    const relativePath = resolveString(step.saveResponseAs, runtime);
    const metadata = { contentType, headers, maxResponseBytes };
    if (io?.saveResponseStream) {
      const saved = await io.saveResponseStream(
        relativePath,
        createSaveBodyStream(response.body, signal, maxResponseBytes),
        metadata
      );
      return { status: response.status, headers, body: saved, bodyText: null };
    }
    if (io?.saveResponse) {
      const chunks2 = await readBodyChunks(response, signal, maxResponseBytes);
      const total = chunks2.reduce((sum, chunk) => sum + chunk.byteLength, 0);
      const data = chunks2.length === 1 ? chunks2[0] : new Uint8Array(total);
      if (chunks2.length > 1) {
        let offset = 0;
        for (const chunk of chunks2) {
          data.set(chunk, offset);
          offset += chunk.byteLength;
        }
      }
      const saved = await io.saveResponse(relativePath, data, metadata);
      return { status: response.status, headers, body: saved, bodyText: null };
    }
  }
  const chunks = await readBodyChunks(response, signal, maxResponseBytes);
  const decoder = decoderForContentType(contentType);
  const bodyText = chunks.map((chunk) => decoder.decode(chunk, { stream: true })).join("") + decoder.decode();
  return { status: response.status, headers, body: parseBody(bodyText, contentType), bodyText };
}
async function executeHttp(step, runtime, options) {
  const request = resolveClone(step.request || {}, runtime) || {};
  const method = String(step.method || request.method || "GET").toUpperCase();
  let requestPath = buildUrl(step.path || request.path || "", step.params || request.params, runtime);
  const headers = { ...request.headers || {} };
  const absoluteUrl = /^(?:https?:)?\/\//i.test(requestPath);
  const allowEnvironmentAuthorization = !absoluteUrl || request.useEnvironmentAuthorization === true;
  const globals = options.globals || [];
  if (allowEnvironmentAuthorization && globals.length) {
    requestPath = appendGlobalQuery(requestPath, globals, runtime);
    const cookieParts = globals.filter((global) => global.type === "cookie").map((global) => `${global.name}=${resolveString(global.value, runtime)}`);
    if (cookieParts.length) {
      const cookieKey = Object.keys(headers).find((key) => key.toLowerCase() === "cookie");
      const mergedCookie = cookieKey ? `${headers[cookieKey]}; ${cookieParts.join("; ")}` : cookieParts.join("; ");
      if (cookieKey) headers[cookieKey] = mergedCookie;
      else headers.Cookie = mergedCookie;
    }
    for (const global of globals) {
      if (global.type !== "header" || hasHeader(headers, global.name)) continue;
      headers[global.name] = resolveString(global.value, runtime);
    }
  }
  if (options.authorization && allowEnvironmentAuthorization && !hasHeader(headers, "Authorization")) {
    headers.Authorization = options.authorization;
  }
  const fetchOptions = { method, headers };
  if (request.credentials !== void 0) fetchOptions.credentials = request.credentials;
  if (request.redirect !== void 0) fetchOptions.redirect = request.redirect;
  if (request.fileUpload) {
    if (!options.io?.createUploadBody) throw new Error("\u5F53\u524D\u8FD0\u884C\u73AF\u5883\u4E0D\u652F\u6301 fileUpload");
    const upload = await options.io.createUploadBody(
      resolve(request.fileUpload, runtime),
      runtime,
      { maxUploadBytes: resolveMaxUploadBytes(options) }
    );
    fetchOptions.body = upload.body;
    if (upload.body && (typeof upload.body.getReader === "function" || typeof upload.body[Symbol.asyncIterator] === "function")) {
      fetchOptions.duplex = "half";
    }
    for (const [name, value] of Object.entries(upload.headers || {})) headers[name] = value;
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === "content-type" && upload.omitContentType) delete headers[key];
    }
  } else if (request.body !== void 0 && request.body !== null && !["GET", "HEAD"].includes(method)) {
    if (typeof request.body === "string") fetchOptions.body = request.body;
    else {
      if (!hasHeader(headers, "Content-Type")) headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(request.body);
    }
  }
  const timeoutMs = resolveTimeoutMs(step, request, options);
  const requestSignal = createRequestSignal(options.signal, timeoutMs);
  fetchOptions.signal = requestSignal.signal;
  try {
    const response = await options.fetch(joinUrl(options.baseUrl, requestPath), fetchOptions);
    const responseData = await readResponse(response, step, options.io, runtime, requestSignal.signal, options);
    return { method, path: requestPath, request: { headers, body: request.body }, response: responseData };
  } catch (error) {
    if (error && typeof error === "object" && !error.scenarioContext) {
      error.scenarioContext = {
        method,
        path: requestPath,
        request: { headers, body: request.body },
        timedOut: requestSignal.timedOut(),
        timeoutMs
      };
    }
    throw error;
  } finally {
    requestSignal.dispose();
  }
}
var AdapterExecutionError = class extends Error {
  constructor(adapterName, originalError, step) {
    const detail = originalError?.message || (originalError === void 0 ? "undefined" : String(originalError));
    const message = `\u9002\u914D\u5668 ${adapterName} \u6267\u884C\u5931\u8D25: ${detail}`;
    super(message, { cause: originalError });
    this.name = "AdapterExecutionError";
    this.adapterName = adapterName;
    this.originalError = originalError;
    this.stepName = step?.name || "\u672A\u547D\u540D\u6B65\u9AA4";
    if (originalError?.scenarioTimedOut) this.scenarioTimedOut = true;
    if (originalError?.scenarioContext) this.scenarioContext = originalError.scenarioContext;
    if (originalError?.responseTooLarge) this.responseTooLarge = originalError.responseTooLarge;
    if (originalError?.uploadTooLarge) this.uploadTooLarge = originalError.uploadTooLarge;
  }
};
function raceWithSignal(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) {
    promise.catch(() => {
    });
    return Promise.reject(abortReason(signal));
  }
  return new Promise((resolveRace, rejectRace) => {
    const onAbort = () => rejectRace(abortReason(signal));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolveRace(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        rejectRace(error);
      }
    );
  });
}
async function executeAdapter(adapter, adapterName, step, runtime, options) {
  if (!adapter) throw new Error(`\u672A\u6CE8\u518C\u6B65\u9AA4\u9002\u914D\u5668: ${adapterName || "unknown"}`);
  let output;
  const request = isPlainObject(step.request) ? resolveClone(step.request, runtime) : {};
  const timeoutMs = resolveTimeoutMs(step, request, options);
  const requestSignal = createRequestSignal(options.signal, timeoutMs);
  const adapterOptions = { ...options, signal: requestSignal.signal, timeoutMs };
  try {
    output = await raceWithSignal((async () => {
      if (typeof adapter.beforeExecute === "function") {
        await adapter.beforeExecute({ step, runtime, options: adapterOptions });
      }
      let result = await adapter.execute({ step: resolveClone(step, runtime), runtime, options: adapterOptions });
      if (typeof adapter.afterExecute === "function") {
        result = await adapter.afterExecute({ step, runtime, options: adapterOptions, output: result }) || result;
      }
      return result;
    })(), requestSignal.signal);
  } catch (error) {
    if (requestSignal.timedOut() && error && typeof error === "object" && !error.scenarioContext) {
      error.scenarioContext = {
        method: "ADAPTER",
        path: adapterName || step.adapter || "adapter",
        request: null,
        timedOut: true,
        timeoutMs
      };
    }
    if (typeof adapter.onError === "function") {
      try {
        await adapter.onError({ step, runtime, options: adapterOptions, error });
      } catch (hookError) {
        console.warn(`\u9002\u914D\u5668 ${escapeInlineText(adapterName)} \u9519\u8BEF\u94A9\u5B50\u5931\u8D25: ${escapeInlineText(hookError?.message || hookError)}`);
      }
    }
    throw new AdapterExecutionError(adapterName, error, step);
  } finally {
    requestSignal.dispose();
  }
  validateAdapterResponse(output, adapterName);
  const response = output?.response || output;
  return {
    method: output.method || "ADAPTER",
    path: output.path || step.adapter || "adapter",
    request: output.request || null,
    response: {
      status: response.status,
      headers: response.headers || {},
      body: response.body ?? null,
      bodyText: response.bodyText ?? null
    }
  };
}
function createEngine(engineOptions = {}) {
  const scopedAdapters = engineOptions.isolateAdapters !== false ? new Map([...listAdapters()]) : listAdapters();
  if (engineOptions.adapters) {
    for (const [name, adapter] of Object.entries(engineOptions.adapters)) {
      if (adapter && typeof adapter.execute === "function") {
        scopedAdapters.set(name, adapter);
      }
    }
  }
  const adapters = scopedAdapters;
  const fetchImpl = engineOptions.fetch || (typeof globalThis.fetch === "function" ? (...args) => globalThis.fetch(...args) : null);
  if (typeof fetchImpl !== "function") throw new Error("\u7F3A\u5C11 fetch \u5B9E\u73B0");
  async function runStep(step, runtime, runOptions = {}) {
    const startedAt = now();
    const options = {
      ...engineOptions,
      ...runOptions,
      fetch: fetchImpl,
      adapters,
      requestTimeoutMs: runOptions.requestTimeoutMs || engineOptions.requestTimeoutMs || 3e4
    };
    if (options.maxResponseBytes === void 0) options.maxResponseBytes = engineOptions.maxResponseBytes;
    if (options.maxUploadBytes === void 0) options.maxUploadBytes = engineOptions.maxUploadBytes;
    if (step.when !== void 0) {
      const shouldRun = evaluateWhen(step.when, runtime, { stepName: step.name });
      if (!shouldRun) {
        return {
          name: step.name || "\u672A\u547D\u540D\u6B65\u9AA4",
          method: "SKIP",
          path: resolveString(step.path || "", runtime),
          status: "SKIPPED",
          duration: now() - startedAt,
          passed: true,
          skipped: true,
          error: "",
          warnings: [],
          assertions: [],
          request: null,
          response: null
        };
      }
    }
    let lastExecution;
    let assertions = [];
    let stepWarnings = [];
    const retry = step.retryUntil || null;
    const totalAttempts = retry ? Math.max(1, Number(retry.maxAttempts || 10)) : 1;
    const retryOn = new Set(
      retry ? (retry.retryOn === void 0 ? contract.retryUntil.defaultRetryOn : Array.isArray(retry.retryOn) ? retry.retryOn : []).filter((type) => contract.retryUntil.retryOn.includes(type)) : []
    );
    const enforceAttemptDeadline = retryOn.has("error") || retryOn.has("timeout");
    const retryStartTime = now();
    const maxElapsedMs = retry?.maxElapsedMs || 3e5;
    let lastAttemptError = null;
    const retryTimeoutError = (attemptCount) => {
      const lastErrorText = lastAttemptError ? `
\u6700\u540E\u9519\u8BEF: ${describeError(lastAttemptError)}` : "";
      return createTimeoutError(
        maxElapsedMs,
        `\u91CD\u8BD5\u8D85\u65F6: \u5DF2\u5C1D\u8BD5 ${attemptCount} \u6B21\uFF0C\u8017\u65F6\u8D85\u8FC7 ${maxElapsedMs}ms${lastErrorText}
\u63D0\u793A: \u8003\u8651\u8C03\u6574 retryUntil.maxElapsedMs \u6216\u68C0\u67E5\u63A5\u53E3\u54CD\u5E94`
      );
    };
    try {
      for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
        if (options.signal?.aborted) throw abortReason(options.signal);
        if (retry) {
          const elapsedMs = now() - retryStartTime;
          const expired = enforceAttemptDeadline ? elapsedMs >= maxElapsedMs : elapsedMs > maxElapsedMs;
          if (expired) throw retryTimeoutError(attempt - 1);
        }
        let attemptDeadline = null;
        if (enforceAttemptDeadline) {
          const remainingMs = maxElapsedMs - (now() - retryStartTime);
          if (remainingMs <= 0) throw retryTimeoutError(attempt - 1);
          attemptDeadline = createRequestSignal(options.signal, remainingMs);
        }
        let attemptError = null;
        let attemptErrorType = "";
        try {
          const selection = chooseAdapter(step, adapters);
          const attemptStartedAt = now();
          const attemptOptions = attemptDeadline ? { ...options, signal: attemptDeadline.signal } : options;
          const execution = selection ? executeAdapter(selection.adapter, selection.name, step, runtime, attemptOptions) : executeHttp(step, runtime, attemptOptions);
          lastExecution = attemptDeadline ? await raceWithSignal(execution, attemptDeadline.signal) : await execution;
          if (lastExecution.response && typeof lastExecution.response === "object" && lastExecution.response.durationMs === void 0) {
            lastExecution.response.durationMs = now() - attemptStartedAt;
          }
          runtime.lastResponse = lastExecution.response;
          runtime.lastResponseBody = lastExecution.response.body;
          const extractResult = applyExtract(step, lastExecution.response, runtime);
          stepWarnings = extractResult.warnings;
          assertions = buildAssertions(step, lastExecution.response, runtime, { stepName: step.name });
          if (extractResult.failures.length) assertions.push(...extractResult.failures);
        } catch (error) {
          if (options.signal?.aborted) throw error;
          if (enforceAttemptDeadline && (attemptDeadline?.timedOut() || now() - retryStartTime >= maxElapsedMs)) {
            throw retryTimeoutError(attempt);
          }
          const errorType = isTimeoutError(error) ? "timeout" : "error";
          if (!retry || !retryOn.has(errorType) || attempt === totalAttempts) throw error;
          attemptError = error;
          attemptErrorType = errorType;
          lastAttemptError = error;
          stepWarnings = [];
          assertions = [];
        } finally {
          attemptDeadline?.dispose();
        }
        if (enforceAttemptDeadline && (attemptDeadline?.timedOut() || now() - retryStartTime >= maxElapsedMs)) {
          throw retryTimeoutError(attempt);
        }
        const failedAssertion = attemptError ? "" : assertions.find((item) => !item.passed)?.name || "";
        if (!attemptError && (assertions.every((item) => item.passed) || attempt === totalAttempts || !retryOn.has("assertion"))) break;
        const intervalMs = retryBackoffIntervalMs(retry, attempt, maxElapsedMs);
        if (enforceAttemptDeadline && now() - retryStartTime >= maxElapsedMs) {
          throw retryTimeoutError(attempt);
        }
        const remainingForWait = Math.max(0, maxElapsedMs - (now() - retryStartTime));
        const waitBeforeCallback = Math.max(0, Math.min(intervalMs, remainingForWait));
        const attemptCallback = runOptions.onAttempt ?? engineOptions.onAttempt;
        if (attemptCallback) {
          const callbackInfo = {
            step,
            attempt,
            totalAttempts,
            intervalMs: waitBeforeCallback,
            status: attemptError ? null : lastExecution.response?.status ?? null,
            failedAssertion,
            errorType: attemptErrorType,
            errorMessage: attemptError ? describeError(attemptError) : ""
          };
          const callbackPromise = Promise.resolve().then(() => attemptCallback(callbackInfo));
          if (enforceAttemptDeadline) {
            const callbackRemainingMs = maxElapsedMs - (now() - retryStartTime);
            if (callbackRemainingMs <= 0) throw retryTimeoutError(attempt);
            const callbackDeadline = createRequestSignal(options.signal, callbackRemainingMs);
            try {
              await raceWithSignal(callbackPromise, callbackDeadline.signal);
            } catch (error) {
              if (options.signal?.aborted) throw error;
              if (callbackDeadline.timedOut() || now() - retryStartTime >= maxElapsedMs) {
                throw retryTimeoutError(attempt);
              }
              throw error;
            } finally {
              callbackDeadline.dispose();
            }
          } else {
            await callbackPromise;
          }
        }
        if (enforceAttemptDeadline && now() - retryStartTime >= maxElapsedMs) {
          throw retryTimeoutError(attempt);
        }
        const waitMs = Math.max(0, Math.min(intervalMs, maxElapsedMs - (now() - retryStartTime)));
        await delay(waitMs, options.signal);
      }
      const failed = assertions.find((item) => !item.passed);
      return {
        name: step.name || "\u672A\u547D\u540D\u6B65\u9AA4",
        method: lastExecution.method,
        path: lastExecution.path,
        status: lastExecution.response.status,
        duration: now() - startedAt,
        passed: !failed,
        error: failed?.name || "",
        warnings: stepWarnings,
        assertions,
        request: lastExecution.request,
        response: lastExecution.response
      };
    } catch (error) {
      const context = error?.scenarioContext || null;
      const cancelled = Boolean(options.signal?.aborted);
      const timedOut = !cancelled && Boolean(error?.scenarioTimedOut || context?.timedOut);
      const causeDetail = error?.cause ? error.cause.code || error.cause.message || String(error.cause) : "";
      const causeText = causeDetail && !String(error?.message || "").includes(causeDetail) ? `\uFF08${causeDetail}\uFF09` : "";
      const errorMessage = cancelled ? "\u7528\u6237\u5DF2\u53D6\u6D88\u6267\u884C" : timedOut ? error?.message?.includes("\u8D85\u65F6") ? error.message : context?.timeoutMs ? timeoutErrorMessage(context.timeoutMs) : "\u8BF7\u6C42\u8D85\u65F6" : `${error?.message || "\u8BF7\u6C42\u6267\u884C\u5931\u8D25"}${causeText}`;
      const method = context && context.method || String(step.method || step.request && step.request.method || "GET").toUpperCase();
      const path4 = context && context.path || resolveString(step.path || "", runtime);
      const responseTooLarge = error?.responseTooLarge || null;
      const uploadTooLarge = error?.uploadTooLarge || null;
      const errorCode = responseTooLarge ? "responseTooLarge" : uploadTooLarge ? "uploadTooLarge" : "";
      return {
        name: step.name || "\u672A\u547D\u540D\u6B65\u9AA4",
        method,
        path: path4,
        status: cancelled ? "CANCELLED" : timedOut ? "TIMEOUT" : "ERROR",
        duration: now() - startedAt,
        passed: false,
        cancelled,
        timedOut,
        errorCode,
        ...responseTooLarge ? { responseTooLarge } : {},
        ...uploadTooLarge ? { uploadTooLarge } : {},
        error: errorMessage,
        warnings: [],
        assertions: [{ name: cancelled ? "\u6267\u884C\u672A\u53D6\u6D88" : timedOut ? "\u8BF7\u6C42\u672A\u8D85\u65F6" : "\u8BF7\u6C42\u6267\u884C\u6210\u529F", passed: false, actual: errorMessage, expected: "\u65E0\u5F02\u5E38" }],
        request: context && context.request || null,
        response: null
      };
    }
  }
  async function runScenario2(input, runOptions = {}) {
    const scenario = defineScenario(input);
    const config = runOptions.config || engineOptions.config || {};
    const runtime = createRuntime(scenario, {
      config,
      vars: { ...engineOptions.vars || {}, ...runOptions.vars || {} },
      environmentVariables: runOptions.environmentVariables || engineOptions.environmentVariables
    });
    const results = [];
    for (let index = 0; index < scenario.steps.length; index += 1) {
      const result = await runStep(scenario.steps[index], runtime, { ...runOptions, config });
      result.stepNo = index + 1;
      results.push(result);
      try {
        await (runOptions.onStep ?? engineOptions.onStep)?.(result, index, runtime);
      } catch (hookError) {
        const message = `onStep \u56DE\u8C03\u629B\u9519: ${hookError?.message || hookError}`;
        result.passed = false;
        result.skipped = false;
        result.status = "ERROR";
        result.error = message;
        result.assertions.push({ name: "onStep \u56DE\u8C03\u65E0\u5F02\u5E38", passed: false, actual: escapeInlineText(hookError?.message || hookError), expected: "\u65E0\u5F02\u5E38" });
      }
      if (!result.passed && scenario.failurePolicy !== "continue") break;
      if (runOptions.signal?.aborted) break;
    }
    const skipped = results.filter((item) => item.skipped).length;
    const executed = results.length - skipped;
    const failed = results.filter((item) => !item.skipped && !item.passed).length;
    const passedSteps = results.filter((item) => !item.skipped && item.passed).length;
    const cancelled = results.some((item) => item.cancelled) || Boolean(runOptions.signal?.aborted) && results.length < scenario.steps.length;
    const status = cancelled ? "CANCELLED" : failed > 0 ? "FAILED" : executed === 0 ? "SKIPPED" : "PASSED";
    return {
      scenarioName: scenario.name,
      passed: failed === 0 && results.length === scenario.steps.length,
      status,
      planned: scenario.steps.length,
      executed,
      passedSteps,
      failed,
      skipped,
      results,
      vars: runtime.vars
    };
  }
  return { runStep, runScenario: runScenario2, createRuntime };
}
async function runScenario(scenario, options = {}) {
  return createEngine(options).runScenario(scenario, options);
}

// src/capabilities.js
function buildCapabilities(inputContract = contract) {
  const { assertions, when, extract, reservedVars, generatedVars, globals, config, retryUntil, scenario, cli } = inputContract;
  return {
    schema: "scenario-test-capabilities",
    version: inputContract.runtimeVersion,
    contractVersion: inputContract.contractVersion,
    assertions: {
      operators: Object.fromEntries(
        Object.entries(assertions.operators).map(([name, meta]) => [name, { description: meta.description, valueType: meta.valueType }])
      ),
      metaKeys: [...assertions.metaKeys],
      targets: [...assertions.targets || []],
      from: [...assertions.from || []],
      note: assertions.note,
      numericOperators: [...assertions.numericOperators]
    },
    when: {
      sources: [...when.sources],
      targets: [...when.targets || []],
      note: when.note
    },
    extract: {
      metaKeys: [...extract.metaKeys || []],
      from: [...extract.from],
      targets: [...extract.targets || []],
      required: extract.required,
      default: extract.default,
      note: extract.note
    },
    reservedVars: [...reservedVars],
    generatedVars: {
      types: [...generatedVars.types]
    },
    globals: {
      types: [...globals.types],
      note: globals.note
    },
    config: {
      configKeys: [...config.configKeys],
      scenarioItemKeys: [...config.scenarioItemKeys],
      environmentKeys: [...config.environmentKeys],
      variableKeys: [...config.variableKeys],
      baseUrl: {
        protocol: config.baseUrl.protocol,
        note: config.baseUrl.note
      },
      manual: { ...config.manual }
    },
    retryUntil: {
      keys: [...retryUntil.keys],
      retryOn: [...retryUntil.retryOn],
      defaultRetryOn: [...retryUntil.defaultRetryOn],
      note: retryUntil.note
    },
    scenario: {
      keys: [...scenario.keys],
      stepKeys: [...scenario.stepKeys],
      failurePolicies: [...scenario.failurePolicies]
    },
    cli: {
      commands: [...cli.commands],
      options: Object.fromEntries(
        Object.entries(cli.options).map(([name, spec]) => [
          name,
          {
            kind: spec.kind,
            description: spec.description,
            ...spec.parse ? { parse: spec.parse } : {},
            ...spec.repeatable ? { repeatable: true } : {},
            ...spec.aliases ? { aliases: [...spec.aliases] } : {}
          }
        ])
      )
    }
  };
}
function operatorLine(name, meta) {
  const typeHint = meta.valueType === "finiteNumber" ? "\uFF08\u4EC5\u6709\u9650 number\uFF09" : meta.valueType === "any" ? "" : `\uFF08${meta.valueType}\uFF09`;
  return `  ${name.padEnd(10)}${meta.description}${typeHint}`;
}
function renderCapabilitiesText(capabilities) {
  const lines = [];
  lines.push(`scenario-test v${capabilities.version} \u2014 \u80FD\u529B\u6E05\u5355\uFF08contract v${capabilities.contractVersion}\uFF09`);
  lines.push("");
  lines.push("\u65AD\u8A00\u64CD\u4F5C\u7B26\uFF08assertions.operators\uFF09:");
  for (const [name, meta] of Object.entries(capabilities.assertions.operators)) {
    lines.push(operatorLine(name, meta));
  }
  lines.push(`  \u5143\u6570\u636E\u952E: ${capabilities.assertions.metaKeys.join(" / ")}`);
  if (capabilities.assertions.targets?.length) {
    lines.push(`  \u65AD\u8A00\u76EE\u6807 target: ${capabilities.assertions.targets.join(" / ")}\uFF08duration \u4E3A\u5355\u6B21\u8BF7\u6C42\u8017\u65F6\u6BEB\u79D2\uFF0C\u89C1 response.durationMs\uFF09`);
  }
  if (capabilities.assertions.from?.length) {
    lines.push(`  \u65AD\u8A00\u6765\u6E90 from: ${capabilities.assertions.from.join(" / ")}\uFF08\u9ED8\u8BA4 body\uFF09`);
  }
  if (capabilities.assertions.note) {
    lines.push(`  ${capabilities.assertions.note}`);
  }
  lines.push("");
  lines.push(`when \u6761\u4EF6\u6765\u6E90: ${capabilities.when.sources.join(" / ")}`);
  if (capabilities.when.targets?.length) {
    lines.push(`  when \u54CD\u5E94\u7EA7 target: ${capabilities.when.targets.join(" / ")}\uFF08\u8BFB\u4E0A\u4E00\u6B65\u54CD\u5E94\uFF09`);
  }
  lines.push(`  ${capabilities.when.note}`);
  lines.push("");
  lines.push(`extract: from = ${capabilities.extract.from.join(" | ")}\uFF08\u9ED8\u8BA4 body\uFF09, required: ${capabilities.extract.required}`);
  if (capabilities.extract.targets?.length) {
    lines.push(`  \u63D0\u53D6\u76EE\u6807 target: ${capabilities.extract.targets.join(" / ")}\uFF1B\u5141\u8BB8\u5B57\u6BB5: ${capabilities.extract.metaKeys.join(" / ")}`);
  }
  lines.push(`  ${capabilities.extract.note}`);
  lines.push("");
  lines.push(`\u4FDD\u7559\u53D8\u91CF: ${capabilities.reservedVars.join(" / ")}`);
  lines.push("");
  lines.push(`generatedVars \u7C7B\u578B: ${capabilities.generatedVars.types.join(" / ")}`);
  lines.push("");
  lines.push(`globals \u7C7B\u578B: ${capabilities.globals.types.join(" / ")}`);
  lines.push("");
  lines.push(`config \u9876\u5C42\u5B57\u6BB5: ${capabilities.config.configKeys.join(" / ")}`);
  lines.push(`config.scenarios \u9879\u5B57\u6BB5: ${capabilities.config.scenarioItemKeys.join(" / ")}`);
  lines.push(`  baseUrl\uFF08${capabilities.config.baseUrl.protocol}\uFF09: ${capabilities.config.baseUrl.note}`);
  lines.push(`  manual\uFF08${capabilities.config.manual.type}\uFF09: ${capabilities.config.manual.note}`);
  lines.push("");
  lines.push(`\u573A\u666F\u7ED3\u6784: ${capabilities.scenario.keys.join(" / ")}\uFF1B\u6B65\u9AA4\u5B57\u6BB5: ${capabilities.scenario.stepKeys.join(" / ")}`);
  lines.push(`failurePolicy: ${capabilities.scenario.failurePolicies.join(" / ")}`);
  if (capabilities.retryUntil) {
    lines.push(`retryUntil \u5B57\u6BB5: ${capabilities.retryUntil.keys.join(" / ")}\uFF1BretryOn: ${capabilities.retryUntil.retryOn.join(" / ")}\uFF08\u9ED8\u8BA4 ${capabilities.retryUntil.defaultRetryOn.join(" / ")}\uFF09`);
    lines.push(`  ${capabilities.retryUntil.note}`);
  }
  lines.push("");
  lines.push("CLI \u547D\u4EE4:");
  for (const command of capabilities.cli.commands) {
    lines.push(`  node scenario-test-cli.cjs ${command}`);
  }
  lines.push("\u5173\u952E\u9009\u9879:");
  for (const [name, spec] of Object.entries(capabilities.cli.options)) {
    const flags = [`--${name}`, ...(spec.aliases || []).map((alias) => `--${alias}`)].join(" / ");
    lines.push(`  ${flags.padEnd(36)}${spec.description}`);
  }
  return lines.join("\n");
}

// src/node/io.js
var import_node_fs2 = __toESM(require("node:fs"), 1);
var import_node_path2 = __toESM(require("node:path"), 1);
var import_node_stream = require("node:stream");
var import_promises = require("node:stream/promises");

// src/utils/path-validator.js
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);
function resolveToRealPath(candidate) {
  let probe = candidate;
  const pending = [];
  while (!import_node_fs.default.existsSync(probe)) {
    const parent = import_node_path.default.dirname(probe);
    if (parent === probe) break;
    pending.unshift(import_node_path.default.basename(probe));
    probe = parent;
  }
  const real = import_node_fs.default.realpathSync(probe);
  return pending.length ? import_node_path.default.join(real, ...pending) : real;
}
function assertRealPathWithinRoot(root, resolved, userPath) {
  let realRoot;
  try {
    realRoot = resolveToRealPath(root);
  } catch {
    realRoot = import_node_path.default.resolve(root);
  }
  let full;
  try {
    full = resolveToRealPath(resolved);
  } catch (error) {
    throw new Error(`\u65E0\u6CD5\u89E3\u6790\u8DEF\u5F84\u771F\u5B9E\u4F4D\u7F6E: ${userPath}\uFF08${error.message}\uFF09`);
  }
  const relative = import_node_path.default.relative(realRoot, full);
  if (!relative || relative.startsWith("..") || import_node_path.default.isAbsolute(relative)) {
    throw new Error(`\u8DEF\u5F84\u7ECF\u94FE\u63A5/\u8054\u63A5\u70B9\u8D8A\u754C: ${userPath}`);
  }
}
function validatePath(root, userPath, options = {}) {
  if (typeof userPath !== "string" || !userPath.trim()) {
    throw new Error("\u8DEF\u5F84\u4E0D\u80FD\u4E3A\u7A7A");
  }
  if (userPath.includes("\0")) {
    throw new Error(`\u8DEF\u5F84\u5305\u542B\u975E\u6CD5\u5B57\u7B26: ${userPath}`);
  }
  if (import_node_path.default.isAbsolute(userPath)) {
    if (!options.allowAbsolute) {
      throw new Error(`\u4E0D\u5141\u8BB8\u4F7F\u7528\u7EDD\u5BF9\u8DEF\u5F84: ${userPath}`);
    }
    const relative2 = import_node_path.default.relative(root, userPath);
    if (relative2.startsWith("..") || import_node_path.default.isAbsolute(relative2)) {
      throw new Error(`\u7EDD\u5BF9\u8DEF\u5F84\u8D8A\u754C: ${userPath}`);
    }
    assertRealPathWithinRoot(root, userPath, userPath);
    return userPath;
  }
  const resolved = import_node_path.default.resolve(root, userPath);
  const relative = import_node_path.default.relative(root, resolved);
  if (!relative || relative.startsWith("..") || import_node_path.default.isAbsolute(relative)) {
    throw new Error(`\u8DEF\u5F84\u8D8A\u754C: ${userPath}`);
  }
  assertRealPathWithinRoot(root, resolved, userPath);
  return resolved;
}

// src/node/io.js
function createNodeIo(workspace = process.cwd(), options = {}) {
  const root = import_node_path2.default.resolve(workspace);
  const defaultMaxUploadBytes = normalizeByteLimit(options.maxUploadBytes);
  function resolveUploadPath(filePath) {
    try {
      return validatePath(root, filePath);
    } catch (error) {
      throw new Error(
        `\u6587\u4EF6\u4E0A\u4F20\u8DEF\u5F84\u4E0D\u5B89\u5168: ${filePath}
\u539F\u56E0: ${error.message}
\u63D0\u793A: \u4E0A\u4F20\u6587\u4EF6\u5FC5\u987B\u5728\u5DE5\u4F5C\u533A\u5185 (${root})`
      );
    }
  }
  function resolveSavePath(relativePath) {
    try {
      return validatePath(root, relativePath);
    } catch (error) {
      throw new Error(
        `\u54CD\u5E94\u4FDD\u5B58\u8DEF\u5F84\u4E0D\u5B89\u5168: ${relativePath}
\u539F\u56E0: ${error.message}
\u63D0\u793A: \u4FDD\u5B58\u8DEF\u5F84\u5FC5\u987B\u5728\u5DE5\u4F5C\u533A\u5185 (${root})`
      );
    }
  }
  function resolveWriteTarget(absolutePath) {
    let current = absolutePath;
    const seen = /* @__PURE__ */ new Set();
    for (let depth = 0; depth < 32; depth += 1) {
      let stat;
      try {
        stat = import_node_fs2.default.lstatSync(current);
      } catch (error) {
        if (error.code === "ENOENT") return current;
        throw error;
      }
      if (!stat.isSymbolicLink()) return current;
      if (seen.has(current)) throw new Error(`\u54CD\u5E94\u4FDD\u5B58\u8DEF\u5F84\u5305\u542B\u7B26\u53F7\u94FE\u63A5\u5FAA\u73AF: ${absolutePath}`);
      seen.add(current);
      const linkTarget = import_node_fs2.default.readlinkSync(current);
      current = import_node_path2.default.resolve(import_node_path2.default.dirname(current), linkTarget);
    }
    throw new Error(`\u54CD\u5E94\u4FDD\u5B58\u8DEF\u5F84\u7B26\u53F7\u94FE\u63A5\u5C42\u7EA7\u8FC7\u6DF1: ${absolutePath}`);
  }
  return {
    async createUploadBody(definition, runtime, callOptions = {}) {
      const filePath = typeof definition === "string" ? definition : definition.filePath;
      const absolutePath = resolveUploadPath(filePath);
      if (!import_node_fs2.default.existsSync(absolutePath)) throw new Error(`\u4E0A\u4F20\u6587\u4EF6\u4E0D\u5B58\u5728: ${absolutePath}`);
      const stat = import_node_fs2.default.statSync(absolutePath);
      if (!stat.isFile()) throw new Error(`\u4E0A\u4F20\u8DEF\u5F84\u4E0D\u662F\u6587\u4EF6: ${absolutePath}`);
      const callMaxUploadBytes = callOptions?.maxUploadBytes;
      const maxUploadBytes = callMaxUploadBytes === void 0 || callMaxUploadBytes === null ? defaultMaxUploadBytes : normalizeByteLimit(callMaxUploadBytes);
      if (maxUploadBytes > 0 && stat.size > maxUploadBytes) {
        const error = new Error(`\u4E0A\u4F20\u6587\u4EF6\u8D85\u8FC7\u5927\u5C0F\u4E0A\u9650: \u5B9E\u9645 ${stat.size} \u5B57\u8282\uFF0C\u9650\u5236 ${maxUploadBytes} \u5B57\u8282`);
        error.scenarioUploadTooLarge = true;
        error.uploadTooLarge = { actualBytes: stat.size, limitBytes: maxUploadBytes };
        throw error;
      }
      const fieldName = definition.fieldName || "file";
      const filename = definition.filename || import_node_path2.default.basename(absolutePath);
      const form = new FormData();
      const blob = typeof import_node_fs2.default.openAsBlob === "function" ? await import_node_fs2.default.openAsBlob(absolutePath) : new Blob([import_node_fs2.default.readFileSync(absolutePath)]);
      form.append(fieldName, blob, filename);
      for (const [name, value] of Object.entries(definition.fields || {})) form.append(name, String(value));
      return { body: form, omitContentType: true };
    },
    async saveResponse(relativePath, data, metadata = {}) {
      const absolutePath = resolveSavePath(relativePath);
      import_node_fs2.default.mkdirSync(import_node_path2.default.dirname(absolutePath), { recursive: true });
      import_node_fs2.default.writeFileSync(absolutePath, data);
      return { savedTo: absolutePath, size: data.byteLength, contentType: metadata.contentType || "", [SAVED_RESPONSE]: true };
    },
    async saveResponseStream(relativePath, body, metadata = {}) {
      const absolutePath = resolveSavePath(relativePath);
      const writeTarget = resolveWriteTarget(absolutePath);
      if (writeTarget !== absolutePath) {
        try {
          validatePath(root, writeTarget, { allowAbsolute: true });
        } catch (error) {
          throw new Error(
            `\u54CD\u5E94\u4FDD\u5B58\u8DEF\u5F84\u4E0D\u5B89\u5168: ${relativePath}
\u539F\u56E0: ${error.message}
\u63D0\u793A: \u4FDD\u5B58\u8DEF\u5F84\u5FC5\u987B\u5728\u5DE5\u4F5C\u533A\u5185 (${root})`
          );
        }
      }
      const directory = import_node_path2.default.dirname(writeTarget);
      import_node_fs2.default.mkdirSync(directory, { recursive: true });
      const tempPath = import_node_path2.default.join(
        directory,
        `.${import_node_path2.default.basename(writeTarget)}.part-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`
      );
      const file = import_node_fs2.default.createWriteStream(tempPath);
      let size = 0;
      const counter = new import_node_stream.Transform({
        transform(chunk, _encoding, callback) {
          size += chunk.byteLength;
          callback(null, chunk);
        }
      });
      try {
        const source = body == null ? import_node_stream.Readable.from([]) : typeof body.getReader === "function" ? import_node_stream.Readable.fromWeb(body) : body;
        await (0, import_promises.pipeline)(source, counter, file);
        import_node_fs2.default.renameSync(tempPath, writeTarget);
      } catch (error) {
        if (!file.closed) {
          await new Promise((resolveClose) => {
            file.once("close", resolveClose);
            file.destroy();
          });
        }
        import_node_fs2.default.rmSync(tempPath, { force: true });
        throw error;
      }
      return { savedTo: absolutePath, size, contentType: metadata.contentType || "", [SAVED_RESPONSE]: true };
    }
  };
}

// src/node/loader.js
var import_node_fs3 = __toESM(require("node:fs"), 1);
var import_node_path3 = __toESM(require("node:path"), 1);
var import_node_vm = __toESM(require("node:vm"), 1);
function executeDefinitionFile(filePath, api) {
  const absolutePath = import_node_path3.default.resolve(filePath);
  const moduleObject = { exports: {} };
  const windowObject = { ScenarioTest: api };
  const context = {
    ScenarioTest: api,
    window: windowObject,
    module: moduleObject,
    exports: moduleObject.exports,
    console,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout
  };
  context.global = context;
  context.globalThis = context;
  import_node_vm.default.createContext(context);
  import_node_vm.default.runInContext(import_node_fs3.default.readFileSync(absolutePath, "utf8"), context, { filename: absolutePath });
  return { context, window: windowObject, exports: moduleObject.exports };
}
function loadConfigFile(filePath, api) {
  const previousConfig = getConfig();
  const loaded = executeDefinitionFile(filePath, api);
  const exported = loaded.exports?.default || loaded.exports;
  const registeredConfig = getConfig();
  const config = (registeredConfig !== previousConfig ? registeredConfig : null) || (exported && Object.keys(exported).length ? exported : null);
  if (!config) throw new Error(`\u914D\u7F6E\u6587\u4EF6\u672A\u6CE8\u518C\u914D\u7F6E: ${filePath}`);
  return api.defineConfig(config);
}
var loadedScenarioPaths = /* @__PURE__ */ new Map();
function loadScenarioFile(filePath, id, api) {
  const absolutePath = import_node_path3.default.resolve(filePath);
  const existing = getScenario(id);
  if (existing && loadedScenarioPaths.get(id) === absolutePath) return existing;
  const loaded = executeDefinitionFile(absolutePath, api);
  let scenario = getScenario(id);
  const exported = loaded.exports?.default || loaded.exports;
  if (!scenario && exported && Array.isArray(exported.steps)) scenario = registerScenario(id, exported);
  if (!scenario) throw new Error(`\u573A\u666F\u6587\u4EF6\u672A\u6CE8\u518C ${id}: ${filePath}`);
  loadedScenarioPaths.set(id, absolutePath);
  return scenario;
}

// src/node.js
function createApp() {
  throw new Error("createApp \u4EC5\u5728\u6D4F\u89C8\u5668\u73AF\u5883\u53EF\u7528\uFF1BNode \u5165\u53E3\u4E0D\u542B\u6D4F\u89C8\u5668\u5DE5\u4F5C\u53F0\uFF0C\u8BF7\u6539\u7528 dist/scenario-test.umd.js \u6216 scenario-test.esm.js");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ASSERTION_META_KEYS,
  ASSERTION_OPERATORS,
  CONTRACT_VERSION,
  GLOBAL_TYPES,
  IDCARD_TEST_REGIONS,
  PHONE_TEST_PREFIXES,
  RESERVED_VARS,
  SAVED_RESPONSE,
  TIMESTAMP_FORMAT_PATTERN,
  TIMESTAMP_OFFSET_UNITS,
  USCC_ALPHABET,
  VERSION,
  appendGlobalQuery,
  appendQueryPairs,
  applyExtract,
  applyGeneratedVar,
  assertNoReservedVars,
  assertNotReservedVar,
  buildAssertions,
  buildCapabilities,
  buildChinaIdNumber,
  buildUrl,
  buildUsccCode,
  clearAdapters,
  clearScenarios,
  clone,
  contract,
  createApp,
  createEngine,
  createNodeIo,
  createRuntime,
  defineConfig,
  defineScenario,
  evalExpression,
  evaluateAssertion,
  evaluateWhen,
  executeDefinitionFile,
  formatAssertionContext,
  formatDuration,
  formatTimestamp,
  gb11643Checksum,
  generateSignature,
  getAdapter,
  getByPath,
  getConfig,
  getHeaderByPath,
  getScenario,
  hasHeader,
  headerValue,
  headersToObject,
  isGlobalParam,
  isPlainObject,
  joinUrl,
  listAdapters,
  loadConfigFile,
  loadScenarioFile,
  luhnCheckDigit,
  maskSecret,
  md5,
  mergeGlobals,
  normalizeByteLimit,
  normalizeEnumDefinition,
  normalizeGlobalParam,
  normalizeWhenDefinition,
  parseBody,
  parseTimestampOffset,
  pickWeightedIndex,
  queryKeys,
  queryPairs,
  registerAdapter,
  registerConfig,
  registerScenario,
  renderCapabilitiesText,
  resolve,
  resolveClone,
  resolveString,
  runScenario,
  sanitizeSensitive,
  seedToIndex,
  seedToUnit,
  setRuntimeVar,
  splitUrlFragment,
  tokenizePath,
  unregisterAdapter,
  usccCheckChar,
  validateAdapter,
  validateAdapterResponse,
  validateAssertion
});
//# sourceMappingURL=scenario-test.cjs.map
