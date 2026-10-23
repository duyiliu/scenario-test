#!/usr/bin/env node
/*! scenario-test v0.7.1 */
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

// src/cli.js
var import_node_fs6 = __toESM(require("node:fs"), 1);
var import_node_http = __toESM(require("node:http"), 1);
var import_node_https = __toESM(require("node:https"), 1);
var import_node_path6 = __toESM(require("node:path"), 1);
var import_node_crypto2 = __toESM(require("node:crypto"), 1);
var import_promises = require("node:readline/promises");
var import_node_url = require("node:url");

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
  normalizeEnumDefinition: () => normalizeEnumDefinition,
  normalizeGlobalParam: () => normalizeGlobalParam,
  normalizeWhenDefinition: () => normalizeWhenDefinition,
  parseBody: () => parseBody,
  parseTimestampOffset: () => parseTimestampOffset,
  pickWeightedIndex: () => pickWeightedIndex,
  registerAdapter: () => registerAdapter,
  registerConfig: () => registerConfig,
  registerScenario: () => registerScenario,
  renderCapabilitiesText: () => renderCapabilitiesText,
  resolve: () => resolve,
  resolveString: () => resolveString,
  runScenario: () => runScenario,
  sanitizeSensitive: () => sanitizeSensitive,
  seedToIndex: () => seedToIndex,
  seedToUnit: () => seedToUnit,
  tokenizePath: () => tokenizePath,
  unregisterAdapter: () => unregisterAdapter,
  usccCheckChar: () => usccCheckChar,
  validateAdapter: () => validateAdapter,
  validateAdapterResponse: () => validateAdapterResponse,
  validateAssertion: () => validateAssertion
});

// src/core.js
var import_blueimp_md5 = __toESM(require_md5(), 1);

// src/version.generated.js
var VERSION = "0.7.1";

// src/contract.js
var CONTRACT_VERSION = 10;
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
    // 配置中 scenarios 清单项的字段（file/path 为 url 的兼容回退，不写入契约字段）
    scenarioItemKeys: Object.freeze(["id", "name", "url", "manual"]),
    environmentKeys: Object.freeze(["key", "name", "baseUrl", "globals"]),
    variableKeys: Object.freeze(["name", "label", "env", "required", "defaultValue"]),
    manual: Object.freeze({
      type: "boolean",
      note: "manual: true \u8868\u793A\u573A\u666F\u9700\u8981\u4EBA\u5DE5\u51C6\u5907\u6570\u636E\u6216\u5199\u6570\u636E\uFF0C--all \u9ED8\u8BA4\u6392\u9664\uFF0C--scenario <id> \u53EF\u663E\u5F0F\u6267\u884C"
    })
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
      port: { kind: "value", prop: "port", parse: "number", description: "\u6D4F\u89C8\u5668\u670D\u52A1\u7AEF\u53E3\uFF0C\u9ED8\u8BA4 4300" },
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
var PATH_SEGMENT = /[^.\[\]]+/y;
var PATH_BRACKET = /\[(?:-?\d+|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\]/y;
var PATH_TOKEN_CACHE_LIMIT = 256;
var pathTokenCache = /* @__PURE__ */ new Map();
function tokenizePath(valuePath) {
  const rest = String(valuePath);
  if (pathTokenCache.has(rest)) return pathTokenCache.get(rest);
  const tokens = tokenizePathStrict(rest);
  if (pathTokenCache.size >= PATH_TOKEN_CACHE_LIMIT) {
    pathTokenCache.delete(pathTokenCache.keys().next().value);
  }
  pathTokenCache.set(rest, tokens === null ? null : Object.freeze(tokens));
  return tokens;
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
  if (/^https?:\/\//i.test(requestPath || "")) return requestPath;
  const base = String(baseUrl || "").replace(/\/+$/, "");
  const tail = String(requestPath || "").replace(/^\/+/, "");
  return base ? `${base}/${tail}` : tail;
}
function buildUrl(requestPath, params, runtime) {
  const rawPath = resolveString(requestPath || "", runtime);
  if (!params || !isPlainObject(params)) return rawPath;
  const resolved = resolve(params, runtime);
  const query = Object.entries(resolved).filter(([, value]) => value !== void 0 && value !== null).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join("&");
  if (!query) return rawPath;
  return `${rawPath}${rawPath.includes("?") ? "&" : "?"}${query}`;
}
function parseBody(text, contentType2) {
  if (!text) return null;
  const value = String(text);
  if (String(contentType2 || "").toLowerCase().includes("json") || /^[\[{]/.test(value.trim())) {
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
function evaluateAssertion(definition, response, runtime, context) {
  validateAssertion(definition, context);
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
      const expectedText = stableStringify(expected);
      passed = passed && actual.some((item) => stableStringify(item) === expectedText);
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
        passed = passed && new RegExp(String(expected)).test(String(actual == null ? "" : actual));
      } catch {
        passed = false;
      }
    }
  }
  if (definition.oneOf !== void 0) {
    expected = resolve(definition.oneOf, runtime);
    if (Array.isArray(expected)) {
      const actualText = stableStringify(actual);
      passed = passed && expected.some((item) => stableStringify(item) === actualText);
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
        runtime.vars[definition.name] = resolve(definition.default, runtime);
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
    runtime.vars[definition.name] = value;
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
      vars[name] = formatTimestamp(base, definition.format);
    } else if (definition.unit != null && definition.unit !== "ms") {
      if (definition.unit !== "s") {
        throw new Error(`generatedVars timestamp \u7684 unit \u53EA\u652F\u6301 ms\uFF08\u9ED8\u8BA4\uFF09/s: ${definition.unit}`);
      }
      vars[name] = Math.floor(base / 1e3);
    } else {
      vars[name] = base;
    }
    return;
  }
  if (definition.type === "uuid") {
    if (!globalThis.crypto?.randomUUID) throw new Error("\u5F53\u524D\u73AF\u5883\u4E0D\u652F\u6301 crypto.randomUUID");
    vars[name] = globalThis.crypto.randomUUID();
    return;
  }
  if (definition.type === "uuidHex") {
    vars[name] = uuidHex();
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
    vars[name] = buildChinaIdNumber({
      regionCode,
      birthDate: definition.birthDate,
      sequence: seqBase * 2 + (gender === "MALE" ? 1 : 0)
    });
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
    vars[name] = `${first}${luhnCheckDigit(first)}`;
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
    vars[name] = `${prefix}${tail}`;
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
    vars[name] = buildUsccCode({ categoryCode: "91", regionCode, orgCode });
    return;
  }
  if (definition.type === "md5") {
    const source = (definition.parts || []).map((part) => vars[part] == null ? "" : String(vars[part])).join("");
    vars[name] = md5(source);
    return;
  }
  if (definition.type === "signature") {
    const params = Object.fromEntries(Object.entries(definition.params || {}).map(([key, variableName]) => [key, vars[variableName]]));
    const secret = vars[definition.secretVar || "apiSecret"];
    if (!secret) {
      throw new Error(`\u7B7E\u540D\u751F\u6210\u5931\u8D25: \u7F3A\u5C11\u5BC6\u94A5\u53D8\u91CF vars.${definition.secretVar || "apiSecret"}`);
    }
    vars[name] = generateSignature(params, secret);
    return;
  }
  if (definition.type === "enum") {
    const { values, weights } = normalizeEnumDefinition(definition);
    vars[name] = values[pickWeightedIndex(`${identifiers.runId}|${name}`, weights)];
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
var SHORT_VALUE_LIMIT = 80;
var MAX_LINES = 20;
var CONTEXT_RADIUS = 40;
var MAX_LINE_WIDTH = 240;
var LINE_TRUNCATED_MARK = "\u2026\uFF08\u672C\u884C\u5DF2\u622A\u65AD\uFF09";
function isShortValue(value) {
  if (value === void 0) return true;
  try {
    const serialized = JSON.stringify(value ?? null) ?? String(value);
    return serialized.length <= SHORT_VALUE_LIMIT;
  } catch {
    return false;
  }
}
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
function formatFailureValue(value) {
  if (!isShortValue(value)) return "\uFF08\u957F\u503C\uFF0C\u89C1\u4E0B\u65B9\uFF09";
  return defuseCiCommandMarkers(escapeC1(JSON.stringify(value) ?? String(value)));
}
function splitStringLines(text, prefix) {
  const raw = String(text).split(/\r\n|\n|\r/);
  const width = String(raw.length).length;
  return raw.map((line, index) => `${prefix}${String(index + 1).padStart(width)} | ${defuseCiCommandMarkers(escapeC1(JSON.stringify(line).slice(1, -1)))}`);
}
function prettyLines(value) {
  let text;
  try {
    text = defuseCiCommandMarkers(escapeC1(JSON.stringify(value, null, 2) ?? String(value)));
  } catch {
    text = defuseCiCommandMarkers(String(value));
  }
  const lines = text.split("\n");
  if (lines.length > MAX_LINES) {
    return [
      ...lines.slice(0, MAX_LINES),
      `\u2026\uFF08\u5171 ${lines.length} \u884C\uFF0C\u5DF2\u622A\u65AD\uFF09`
    ];
  }
  return lines;
}
function firstDifferenceLines(expected, actual, prefix) {
  if (typeof expected !== "string" || typeof actual !== "string" || expected === actual) return [];
  const maxLength = Math.max(expected.length, actual.length);
  let index = 0;
  while (index < maxLength && expected[index] === actual[index]) {
    index += 1;
  }
  const window2 = (text) => {
    const start = Math.max(0, index - CONTEXT_RADIUS);
    const end = Math.min(text.length, index + CONTEXT_RADIUS);
    const head = start > 0 ? "\u2026" : "";
    const tail = end < text.length ? "\u2026" : "";
    const escape = (part) => defuseCiCommandMarkers(escapeC1(JSON.stringify(part).slice(1, -1)));
    return `${head}${escape(text.slice(start, index))}\xAB${escape(text.slice(index, index + 1))}\xBB${escape(text.slice(index + 1, end))}${tail}`;
  };
  return [
    `${prefix}\u2191 \u9996\u4E2A\u5DEE\u5F02\u5728\u7B2C ${index + 1} \u4E2A\u5B57\u7B26\uFF08\u957F\u5EA6 ${expected.length} vs ${actual.length}\uFF09\uFF1A`,
    `${prefix}\u2191 \u671F\u671B ${window2(expected)}`,
    `${prefix}\u2191 \u5B9E\u9645 ${window2(actual)}`
  ];
}
function failureDiffLines(expected, actual, prefix = "") {
  if (isShortValue(expected) && isShortValue(actual)) return [];
  const lines = [];
  if (!isShortValue(expected)) {
    lines.push(`${prefix}  \u671F\u671B\u503C\uFF08expected\uFF09:`);
    lines.push(...expandValueLines(expected, `${prefix}    `, prefix.length));
  }
  if (!isShortValue(actual)) {
    lines.push(`${prefix}  \u5B9E\u9645\u503C\uFF08actual\uFF09:`);
    lines.push(...expandValueLines(actual, `${prefix}    `, prefix.length));
  }
  lines.push(...firstDifferenceLines(
    typeof expected === "string" ? expected : void 0,
    typeof actual === "string" ? actual : void 0,
    `${prefix}  `
  ));
  return lines;
}
function expandValueLines(value, prefix, baseLength) {
  if (typeof value === "string") {
    const lines = splitStringLines(value, `${prefix}| `).map((line) => capContentLine(line, baseLength));
    if (lines.length > MAX_LINES) {
      return [
        ...lines.slice(0, MAX_LINES),
        `${prefix}\u2026\uFF08\u5171 ${lines.length} \u884C\uFF0C\u5DF2\u622A\u65AD\uFF09`
      ];
    }
    return lines;
  }
  return prettyLines(value).map((line) => capContentLine(`${prefix}${line}`, baseLength));
}
function capContentLine(line, baseLength) {
  if (line.length <= baseLength + MAX_LINE_WIDTH) return line;
  return `${line.slice(0, baseLength + MAX_LINE_WIDTH - LINE_TRUNCATED_MARK.length)}${LINE_TRUNCATED_MARK}`;
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
  if (actualResponse.headers !== void 0 && typeof actualResponse.headers !== "object") {
    throw new TypeError(`\u9002\u914D\u5668 ${adapterName} \u54CD\u5E94\u7684 headers \u5FC5\u987B\u662F\u5BF9\u8C61`);
  }
  return true;
}

// src/registry.js
var scenarioRegistry = /* @__PURE__ */ new Map();
var adapterRegistry = /* @__PURE__ */ new Map();
var currentConfig = null;
function invariant(condition, message) {
  if (!condition) throw new TypeError(message);
}
function nonEmptyString(value) {
  return typeof value === "string" && Boolean(value.trim());
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
  assertNoReservedVars(input.vars, `\u573A\u666F ${input.name} \u7684 vars`);
  assertTemplatePathsOnly(input, `\u573A\u666F ${input.name}`);
  for (const definition of input.generatedVars || []) {
    invariant(isPlainObject(definition), `\u573A\u666F ${input.name} \u7684 generatedVars \u9879\u5FC5\u987B\u662F\u5BF9\u8C61`);
    invariant(nonEmptyString(definition.name), `\u573A\u666F ${input.name} \u7684 generatedVars \u9879\u7F3A\u5C11 name`);
    invariant(
      contract.generatedVars.types.includes(definition.type),
      `\u573A\u666F ${input.name} \u7684 generatedVars \u7C7B\u578B\u4E0D\u652F\u6301: ${definition.type}\uFF08\u652F\u6301 ${contract.generatedVars.types.join("/")}\uFF09`
    );
  }
  input.steps.forEach((step, index) => {
    invariant(isPlainObject(step), `\u573A\u666F ${input.name} \u7B2C ${index + 1} \u6B65\u5FC5\u987B\u662F\u5BF9\u8C61`);
    invariant(nonEmptyString(step.name), `\u573A\u666F ${input.name} \u7B2C ${index + 1} \u6B65\u7F3A\u5C11 name`);
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
      const maxAttempts = Number(step.retryUntil.maxAttempts ?? 10);
      const intervalMs = Number(step.retryUntil.intervalMs ?? 2e3);
      const maxElapsedMs = Number(step.retryUntil.maxElapsedMs ?? 3e5);
      invariant(Number.isInteger(maxAttempts) && maxAttempts >= 1, `\u6B65\u9AA4 ${step.name} \u7684 maxAttempts \u5FC5\u987B\u662F\u6B63\u6574\u6570`);
      invariant(Number.isFinite(intervalMs) && intervalMs >= 0, `\u6B65\u9AA4 ${step.name} \u7684 intervalMs \u4E0D\u80FD\u4E3A\u8D1F\u6570`);
      invariant(Number.isFinite(maxElapsedMs) && maxElapsedMs > 0, `\u6B65\u9AA4 ${step.name} \u7684 maxElapsedMs \u5FC5\u987B\u662F\u6B63\u6570`);
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
  });
  const failurePolicy = input.failurePolicy || "stop";
  invariant(contract.scenario.failurePolicies.includes(failurePolicy), "failurePolicy \u53EA\u80FD\u662F stop \u6216 continue");
  return { ...input, failurePolicy, steps: [...input.steps] };
}
function defineConfig(input) {
  invariant(isPlainObject(input), "\u914D\u7F6E\u5FC5\u987B\u662F\u5BF9\u8C61");
  assertTemplatePathsOnly(input, "\u914D\u7F6E");
  const globals = normalizeGlobals(input.globals, "\u5168\u5C40");
  const envs = Array.isArray(input.envs) ? input.envs.map((env) => ({
    ...env,
    globals: normalizeGlobals(env.globals, `\u73AF\u5883 ${env.key} \u7684`)
  })) : [];
  for (const env of envs) {
    invariant(nonEmptyString(env.key) && nonEmptyString(env.name), "\u6BCF\u4E2A\u73AF\u5883\u5FC5\u987B\u5305\u542B\u975E\u7A7A key \u548C name");
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
    if (item.env !== void 0) invariant(nonEmptyString(item.env), `\u53D8\u91CF ${item.name} \u7684 env \u65E0\u6548`);
    return { ...item };
  }) : [];
  assertUnique(variables, "name", "\u53D8\u91CF name");
  const defaultEnvKey = input.defaultEnvKey || envs[0]?.key || "";
  invariant(!defaultEnvKey || envs.some((env) => env.key === defaultEnvKey), `defaultEnvKey \u4E0D\u5B58\u5728: ${defaultEnvKey}`);
  const requestTimeoutMs = Number(input.requestTimeoutMs ?? 3e4);
  invariant(Number.isFinite(requestTimeoutMs) && requestTimeoutMs > 0, "requestTimeoutMs \u5FC5\u987B\u662F\u6B63\u6570");
  return {
    ...input,
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
function createRequestSignal(parentSignal, timeoutMs) {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort(abortReason(parentSignal));
  if (parentSignal?.aborted) abort();
  else parentSignal?.addEventListener("abort", abort, { once: true });
  const timer = timeoutMs > 0 ? setTimeout(() => {
    timedOut = true;
    controller.abort(createTimeoutError(timeoutMs));
  }, timeoutMs) : null;
  return {
    signal: controller.signal,
    timedOut() {
      return timedOut;
    },
    dispose() {
      if (timer) clearTimeout(timer);
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
    vars[name] = value;
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
function readBodyChunks(response, signal) {
  if (!response.body) return Promise.resolve([]);
  const reader = response.body.getReader();
  const chunks = [];
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
function decoderForContentType(contentType2) {
  const match = /charset\s*=\s*"?([^;"\s]+)"?/i.exec(String(contentType2 || ""));
  if (!match) return new TextDecoder();
  try {
    return new TextDecoder(match[1]);
  } catch {
    return new TextDecoder();
  }
}
async function readResponse(response, step, io, runtime, signal) {
  const headers = headersToObject(response.headers);
  const contentType2 = String(headers["content-type"] || "");
  const chunks = await readBodyChunks(response, signal);
  if (step.saveResponseAs && io?.saveResponse) {
    const data = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.length;
    }
    const saved = await io.saveResponse(resolveString(step.saveResponseAs, runtime), data, { contentType: contentType2, headers });
    return { status: response.status, headers, body: saved, bodyText: null };
  }
  const decoder = decoderForContentType(contentType2);
  const bodyText = chunks.map((chunk) => decoder.decode(chunk, { stream: true })).join("") + decoder.decode();
  return { status: response.status, headers, body: parseBody(bodyText, contentType2), bodyText };
}
async function executeHttp(step, runtime, options) {
  const request = resolve(clone(step.request || {}), runtime) || {};
  const method = String(step.method || request.method || "GET").toUpperCase();
  let requestPath = buildUrl(step.path || request.path || "", step.params || request.params, runtime);
  const headers = { ...request.headers || {} };
  const absoluteUrl = /^https?:\/\//i.test(requestPath);
  const allowEnvironmentAuthorization = !absoluteUrl || request.useEnvironmentAuthorization === true;
  const globals = options.globals || [];
  if (allowEnvironmentAuthorization && globals.length) {
    const existingKeys = /* @__PURE__ */ new Set();
    const queryIndex = requestPath.indexOf("?");
    if (queryIndex >= 0) {
      for (const pair of requestPath.slice(queryIndex + 1).split("&")) {
        const key = pair.split("=")[0];
        if (key) existingKeys.add(decodeURIComponent(key));
      }
    }
    const queryPairs = [];
    for (const global of globals) {
      if (global.type !== "query" || existingKeys.has(global.name)) continue;
      queryPairs.push(`${encodeURIComponent(global.name)}=${encodeURIComponent(String(resolveString(global.value, runtime)))}`);
    }
    if (queryPairs.length) requestPath = `${requestPath}${queryIndex >= 0 ? "&" : "?"}${queryPairs.join("&")}`;
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
    const upload = await options.io.createUploadBody(resolve(request.fileUpload, runtime), runtime);
    fetchOptions.body = upload.body;
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
  const rawTimeoutMs = Number(step.timeoutMs || request.timeoutMs || options.requestTimeoutMs || 3e4);
  const timeoutMs = Number.isFinite(rawTimeoutMs) && rawTimeoutMs > 0 ? rawTimeoutMs : 3e4;
  const requestSignal = createRequestSignal(options.signal, timeoutMs);
  fetchOptions.signal = requestSignal.signal;
  try {
    const response = await options.fetch(joinUrl(options.baseUrl, requestPath), fetchOptions);
    const responseData = await readResponse(response, step, options.io, runtime, requestSignal.signal);
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
    const message = `\u9002\u914D\u5668 ${adapterName} \u6267\u884C\u5931\u8D25: ${originalError.message}`;
    super(message, { cause: originalError });
    this.name = "AdapterExecutionError";
    this.adapterName = adapterName;
    this.originalError = originalError;
    this.stepName = step?.name || "\u672A\u547D\u540D\u6B65\u9AA4";
    if (originalError?.scenarioTimedOut) this.scenarioTimedOut = true;
    if (originalError?.scenarioContext) this.scenarioContext = originalError.scenarioContext;
  }
};
async function executeAdapter(adapter, adapterName, step, runtime, options) {
  if (!adapter) throw new Error(`\u672A\u6CE8\u518C\u6B65\u9AA4\u9002\u914D\u5668: ${adapterName || "unknown"}`);
  let output;
  try {
    if (typeof adapter.beforeExecute === "function") {
      await adapter.beforeExecute({ step, runtime, options });
    }
    output = await adapter.execute({ step: resolve(clone(step), runtime), runtime, options });
    if (typeof adapter.afterExecute === "function") {
      output = await adapter.afterExecute({ step, runtime, options, output }) || output;
    }
  } catch (error) {
    if (typeof adapter.onError === "function") {
      try {
        await adapter.onError({ step, runtime, options, error });
      } catch (hookError) {
        console.warn(`\u9002\u914D\u5668 ${escapeInlineText(adapterName)} \u9519\u8BEF\u94A9\u5B50\u5931\u8D25: ${escapeInlineText(hookError?.message || hookError)}`);
      }
    }
    throw new AdapterExecutionError(adapterName, error, step);
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
    const retryStartTime = now();
    const maxElapsedMs = retry?.maxElapsedMs || 3e5;
    try {
      for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
        if (options.signal?.aborted) throw abortReason(options.signal);
        if (retry && now() - retryStartTime > maxElapsedMs) {
          throw createTimeoutError(
            maxElapsedMs,
            `\u91CD\u8BD5\u8D85\u65F6: \u5DF2\u5C1D\u8BD5 ${attempt - 1} \u6B21\uFF0C\u8017\u65F6\u8D85\u8FC7 ${maxElapsedMs}ms
\u63D0\u793A: \u8003\u8651\u8C03\u6574 retryUntil.maxElapsedMs \u6216\u68C0\u67E5\u63A5\u53E3\u54CD\u5E94`
          );
        }
        const selection = chooseAdapter(step, adapters);
        const attemptStartedAt = now();
        lastExecution = selection ? await executeAdapter(selection.adapter, selection.name, step, runtime, options) : await executeHttp(step, runtime, options);
        if (lastExecution.response && typeof lastExecution.response === "object" && lastExecution.response.durationMs === void 0) {
          lastExecution.response.durationMs = now() - attemptStartedAt;
        }
        runtime.lastResponse = lastExecution.response;
        runtime.lastResponseBody = lastExecution.response.body;
        const extractResult = applyExtract(step, lastExecution.response, runtime);
        stepWarnings = extractResult.warnings;
        assertions = buildAssertions(step, lastExecution.response, runtime, { stepName: step.name });
        if (extractResult.failures.length) assertions.push(...extractResult.failures);
        if (assertions.every((item) => item.passed) || attempt === totalAttempts) break;
        const rawIntervalMs = Number(retry.intervalMs);
        const intervalMs = Math.max(100, Number.isFinite(rawIntervalMs) ? rawIntervalMs : 2e3);
        await (runOptions.onAttempt ?? engineOptions.onAttempt)?.({
          step,
          attempt,
          totalAttempts,
          intervalMs,
          status: lastExecution.response?.status ?? null,
          failedAssertion: assertions.find((item) => !item.passed)?.name || ""
        });
        await delay(intervalMs, options.signal);
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
      const path7 = context && context.path || resolveString(step.path || "", runtime);
      return {
        name: step.name || "\u672A\u547D\u540D\u6B65\u9AA4",
        method,
        path: path7,
        status: cancelled ? "CANCELLED" : timedOut ? "TIMEOUT" : "ERROR",
        duration: now() - startedAt,
        passed: false,
        cancelled,
        timedOut,
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
  const { assertions, when, extract, reservedVars, generatedVars, globals, config, scenario, cli } = inputContract;
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
      scenarioItemKeys: [...config.scenarioItemKeys],
      environmentKeys: [...config.environmentKeys],
      variableKeys: [...config.variableKeys],
      manual: { ...config.manual }
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
          { kind: spec.kind, description: spec.description, ...spec.aliases ? { aliases: [...spec.aliases] } : {} }
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
  lines.push(`config.scenarios \u9879\u5B57\u6BB5: ${capabilities.config.scenarioItemKeys.join(" / ")}`);
  lines.push(`  manual\uFF08${capabilities.config.manual.type}\uFF09: ${capabilities.config.manual.note}`);
  lines.push("");
  lines.push(`\u573A\u666F\u7ED3\u6784: ${capabilities.scenario.keys.join(" / ")}\uFF1B\u6B65\u9AA4\u5B57\u6BB5: ${capabilities.scenario.stepKeys.join(" / ")}`);
  lines.push(`failurePolicy: ${capabilities.scenario.failurePolicies.join(" / ")}`);
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

// src/browser/ui/ui-utils.js
function esc(s) {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function fmt(ms) {
  if (!isFinite(ms)) return "-";
  return ms >= 1e3 ? (ms / 1e3).toFixed(2) + " s" : ms.toFixed(2) + "ms";
}
function safeJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch (e) {
    return String(value);
  }
}
function sanitizeSensitive2(value) {
  return value;
}
function copyTextFallback(text) {
  if (typeof document === "undefined" || !document.body || typeof document.createElement !== "function") return false;
  var textarea;
  var activeElement = document.activeElement;
  try {
    textarea = document.createElement("textarea");
    textarea.value = String(text);
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    return typeof document.execCommand === "function" && document.execCommand("copy") === true;
  } catch (error) {
    return false;
  } finally {
    if (textarea && textarea.parentNode) textarea.parentNode.removeChild(textarea);
    if (activeElement && typeof activeElement.focus === "function") {
      try {
        activeElement.focus();
      } catch (error) {
      }
    }
  }
}
function copyText(text) {
  var value = String(text == null ? "" : text);
  if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
    return Promise.resolve().then(function() {
      return navigator.clipboard.writeText(value);
    }).then(function() {
      return true;
    }).catch(function() {
      return copyTextFallback(value);
    });
  }
  return Promise.resolve().then(function() {
    return copyTextFallback(value);
  });
}

// src/browser/ui/ui-style.js
var workbenchStyle = function() {
  "use strict";
  function getWorkspaceStyleBlock() {
    return `
            :root {
                --workspace-bg: #f8fafc;
                --workspace-surface: #ffffff;
                --workspace-text: #0f172a;
                --workspace-muted: #64748b;
                --workspace-line: #e2e8f0;
                --workspace-hover: #f1f5f9;
                --workspace-selected: #e2e8f0;
                --workspace-selected-line: #cbd5e1;
                --workspace-primary: #0f172a;
                --workspace-primary-hover: #1e293b;
                --workspace-danger: #e11d48;
                --workspace-success: #10b981;
                --workspace-warning: #d97706;
                --workspace-focus: rgba(15, 23, 42, 0.18);
                --workspace-overlay: rgba(15, 23, 42, 0.38);
                --workspace-code: #0f172a;
                --workspace-radius: 8px;
            }

            #scenario-test-root { height: 100%; }

            #scenario-test-root {
                min-width: 0;
                overflow: hidden;
                background: var(--workspace-bg) !important;
                color: var(--workspace-text) !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }

            #scenario-test-root > header {
                min-height: 48px;
                padding: 6px 16px !important;
                background: var(--workspace-surface) !important;
                border-bottom: 1px solid var(--workspace-line) !important;
                box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.02) !important;
            }

            #scenario-test-root > header #envNameLabel { color: var(--workspace-muted) !important; font-size: 11px !important; font-weight: 600; }
            #scenario-test-root > header #scenarioTitle { color: var(--workspace-text) !important; font-size: 13px !important; font-weight: 700; }

            #scenario-test-root.theme-claude-code {
                --workspace-bg: #f5f0ea;
                --workspace-surface: #fbf8f4;
                --workspace-text: #2c2520;
                --workspace-muted: #7c7066;
                --workspace-line: #e8dacf;
                --workspace-hover: #efe5dc;
                --workspace-selected: #e5d5c6;
                --workspace-selected-line: #d4bfad;
                --workspace-primary: #245244;
                --workspace-primary-hover: #1b3e33;
                --workspace-danger: #b94c4a;
                --workspace-success: #245244;
                --workspace-warning: #a65f2d;
                --workspace-focus: rgba(36, 82, 68, 0.2);
                --workspace-overlay: rgba(44, 37, 32, 0.34);
                --workspace-code: #2c2520;
                --workspace-radius: 8px;
            }

            #scenario-test-root.theme-claude-code > header {
                background: #fdfaf6 !important;
                box-shadow: 0 1px 3px rgba(91, 67, 49, .06) !important;
                border-bottom-color: var(--workspace-line) !important;
            }

            .scenario-workspace { height: calc(100vh - 48px); padding: 8px !important; }
            .scenario-grid { height: 100%; gap: 8px !important; margin: 0 !important; }
            .scenario-pane {
                min-height: 0;
                background: var(--workspace-surface) !important;
                border: 1px solid var(--workspace-line) !important;
                border-radius: var(--workspace-radius) !important;
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.03), 0 1px 2px -1px rgba(0, 0, 0, 0.03) !important;
                transition: border-color 0.15s ease, box-shadow 0.15s ease;
            }
            .scenario-pane > div:first-child,
            #scenarioList,
            #stepsList,
            #reportPanel { background: var(--workspace-surface) !important; }

            .scenario-header-actions { display: flex; align-items: center; gap: 6px !important; flex-wrap: nowrap !important; }
            .scenario-header-context-actions,
            .scenario-header-run-actions,
            .scenario-header-secondary-actions {
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }
            .scenario-header-run-actions {
                padding-left: 4px;
                border-left: 1px solid var(--workspace-line);
            }
            .scenario-header-secondary-actions {
                padding-left: 2px;
            }
            .scenario-header-select,
            .scenario-header-step,
            .scenario-header-button {
                height: 32px;
                border: 1px solid var(--workspace-line);
                border-radius: 7px;
                background: var(--workspace-surface);
                box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.02) !important;
                transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .scenario-header-select {
                position: relative;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 0 8px 0 10px;
                background: var(--workspace-hover) !important;
                border: 1px solid var(--workspace-line) !important;
                color: var(--workspace-muted);
                cursor: pointer;
            }
            .scenario-header-select:hover {
                background: var(--workspace-selected) !important;
                border-color: var(--workspace-selected-line) !important;
            }
            .scenario-header-select__icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                color: var(--workspace-muted);
            }
            .scenario-header-select__label {
                font-size: 11px;
                font-weight: 700;
                color: var(--workspace-muted);
                white-space: nowrap;
                user-select: none;
            }
            .scenario-header-select select {
                -webkit-appearance: none !important;
                -moz-appearance: none !important;
                appearance: none !important;
                background: transparent !important;
                border: 0 !important;
                outline: none !important;
                box-shadow: none !important;
                min-width: 60px;
                height: 100% !important;
                padding: 0 16px 0 2px !important;
                color: var(--workspace-text) !important;
                font-size: 11.5px !important;
                font-weight: 700 !important;
                cursor: pointer !important;
            }
            .scenario-header-select select option {
                background: var(--workspace-surface) !important;
                color: var(--workspace-text) !important;
                padding: 6px 10px !important;
                font-size: 12px !important;
                font-weight: 500 !important;
            }
            .scenario-header-select:focus-within {
                border-color: var(--workspace-primary) !important;
                box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.12) !important;
                background: var(--workspace-surface) !important;
            }
            .scenario-header-select__arrow {
                position: absolute;
                top: 50%;
                right: 7px;
                transform: translateY(-50%);
                width: 12px;
                height: 12px;
                color: var(--workspace-muted);
                pointer-events: none;
                transition: transform 0.15s ease;
            }
            .scenario-header-select:focus-within .scenario-header-select__arrow {
                color: var(--workspace-text);
                transform: translateY(-50%) rotate(180deg);
            }
            
            /* \u81EA\u5B9A\u4E49 Shadcn \u98CE\u683C Dropdown Menu */
            .custom-dropdown {
                position: relative;
                display: inline-flex;
            }
            .custom-dropdown__trigger {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                height: 32px;
                padding: 0 10px 0 8px;
                border: 1px solid var(--workspace-line);
                border-radius: 7px;
                background: var(--workspace-hover);
                color: var(--workspace-text);
                font-size: 11.5px;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.02);
                transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
                user-select: none;
            }
            .custom-dropdown__trigger:hover {
                background: var(--workspace-selected);
                border-color: var(--workspace-selected-line);
            }
            .custom-dropdown__trigger:active {
                transform: scale(0.98);
            }
            .custom-dropdown.open .custom-dropdown__trigger {
                border-color: var(--workspace-primary);
                box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.12);
                background: var(--workspace-surface);
            }
            .custom-dropdown.open .custom-dropdown__arrow {
                transform: rotate(180deg);
                color: var(--workspace-text);
            }
            .custom-dropdown__arrow {
                width: 12px;
                height: 12px;
                color: var(--workspace-muted);
                transition: transform 0.15s ease, color 0.15s ease;
                margin-left: 2px;
            }
            .custom-dropdown__menu {
                display: none;
                position: absolute;
                top: calc(100% + 5px);
                left: 0;
                min-width: 130px;
                z-index: 50;
                padding: 4px;
                background: var(--workspace-surface);
                border: 1px solid var(--workspace-line);
                border-radius: 8px;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
                backdrop-filter: blur(8px);
                animation: custom-dropdown-in 0.15s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .custom-dropdown.open .custom-dropdown__menu {
                display: block;
            }
            .custom-dropdown__item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                width: 100%;
                padding: 6px 9px;
                border-radius: 6px;
                font-size: 11.5px;
                font-weight: 500;
                color: var(--workspace-text);
                cursor: pointer;
                transition: background-color 0.15s ease, color 0.15s ease, transform 0.1s ease;
                text-align: left;
                border: 0;
                background: transparent;
                white-space: nowrap;
            }
            .custom-dropdown__item:hover {
                background: var(--workspace-hover);
                color: var(--workspace-text);
                transform: translateX(2px);
            }
            .custom-dropdown__item:active {
                transform: translateX(2px) scale(0.98);
            }
            .custom-dropdown__item.active {
                font-weight: 700;
                background: var(--workspace-selected);
            }
            .custom-dropdown__check {
                width: 13px;
                height: 13px;
                color: var(--workspace-primary);
                flex-shrink: 0;
            }
            @keyframes custom-dropdown-in {
                from { opacity: 0; transform: translateY(-4px) scale(0.97); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            
            #scenario-test-root.theme-claude-code .custom-dropdown__trigger {
                background: #f1e4d8 !important;
                border-color: #dfcebf !important;
            }
            #scenario-test-root.theme-claude-code .custom-dropdown__trigger:hover {
                background: #ebdbce !important;
            }
            #scenario-test-root.theme-claude-code .custom-dropdown.open .custom-dropdown__trigger {
                background: #fcf8f3 !important;
                border-color: var(--workspace-primary) !important;
                box-shadow: 0 0 0 2px rgba(36, 82, 68, 0.15) !important;
            }
            
            .scenario-header-step { display: flex; align-items: stretch; overflow: hidden; }
            .scenario-header-button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                padding: 0 12px;
                font-size: 12px !important;
                font-weight: 600;
                color: var(--workspace-text);
                cursor: pointer;
                transition: transform 0.15s ease, box-shadow 0.15s ease;
            }
            .scenario-header-button:hover:not(:disabled) {
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06);
            }
            .scenario-header-button:active:not(:disabled) {
                transform: scale(0.97) translateY(0);
                transition-duration: 0.1s;
            }
            .scenario-header-button:disabled { cursor: not-allowed; opacity: 0.6; }
            .scenario-header-button--secondary { border: 0; border-radius: 0; }
            .scenario-header-step__arrow { display: inline-flex; align-items: center; justify-content: center; width: 24px; border-left: 1px solid var(--workspace-line); color: var(--workspace-muted); }
            .scenario-header-button--primary {
                border-color: var(--workspace-primary) !important;
                background: var(--workspace-primary) !important;
                color: #ffffff !important;
                box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.15) !important;
            }
            .scenario-header-button--primary:hover:not(:disabled) {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0, 0, 0, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.2) !important;
                filter: brightness(1.05);
            }
            .scenario-header-button--primary:active:not(:disabled) {
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12), inset 0 1px 0 0 rgba(255, 255, 255, 0.1) !important;
                filter: brightness(0.98);
            }
            .scenario-header-button--primary:disabled { cursor: wait; opacity: .78; }
            .scenario-header-button--running { background: #334155 !important; border-color: #334155 !important; }
            .scenario-header-button--config, .scenario-header-button--report { padding: 0 10px; }
            .scenario-header-text-action {
                height: 32px;
                padding: 0 6px;
                border: 0;
                background: transparent;
                color: var(--workspace-muted);
                font-size: 12px !important;
                font-weight: 600;
                cursor: pointer;
                border-radius: 4px;
                transition: all 0.15s ease;
            }
            .scenario-header-text-action:active:not(:disabled) { transform: scale(0.96); }
            .scenario-header-text-action--danger { color: var(--workspace-danger); }
            .scenario-header-text-action:disabled { opacity: .4; cursor: not-allowed; }
            .scenario-header-actions button:hover:not(:disabled), .scenario-header-select:hover { background: var(--workspace-hover); }
            .scenario-header-button--primary:hover:not(:disabled) { background: var(--workspace-primary-hover) !important; border-color: var(--workspace-primary-hover) !important; }
            
            #scenario-test-root.theme-claude-code .scenario-header-select { background: #fdfaf6; }
            #scenario-test-root.theme-claude-code .scenario-header-button--config,
            #scenario-test-root.theme-claude-code .scenario-header-button--report { background: #fdfaf6; border-color: var(--workspace-line); }

            .scenario-pane--scenarios > div:first-child { padding: 12px 14px !important; border-bottom: 1px solid var(--workspace-line) !important; }
            .scenario-pane--scenarios > div:first-child > div:first-child { font-size: 14px !important; font-weight: 700; }
            .scenario-pane--scenarios > div:first-child > div:nth-child(2) { font-size: 11px !important; color: var(--workspace-muted); }
            #scenarioSearchInput {
                padding: 6px 10px 6px 32px !important;
                border: 1px solid var(--workspace-line) !important;
                border-radius: 6px !important;
                font-size: 12px !important;
                transition: all 0.2s ease;
                background: var(--workspace-surface);
            }
            #scenarioSearchInput:hover {
                border-color: var(--workspace-selected-line) !important;
            }
            #scenarioSearchInput:focus {
                border-color: var(--workspace-primary) !important;
                box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(0, 0, 0, 0.05) !important;
                background: var(--workspace-bg);
            }
            .scenario-search-clear {
                position: absolute;
                top: 50%;
                right: 6px;
                display: inline-flex;
                width: 24px;
                height: 24px;
                align-items: center;
                justify-content: center;
                transform: translateY(-50%);
                border: 0;
                border-radius: 5px;
                background: transparent;
                color: var(--workspace-muted);
                transition: all 0.15s ease;
                cursor: pointer;
            }
            .scenario-search-clear svg { width: 13px; height: 13px; }
            .scenario-search-clear:hover { background: var(--workspace-hover); color: var(--workspace-text); }
            .scenario-search-clear[hidden],
            .step-filter-reset[hidden] { display: none; }
            #scenarioList > .scenario-search-empty {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 16px 12px;
                color: var(--workspace-muted);
                font-size: 11px;
                text-align: center;
                border-radius: 8px !important;
                background: color-mix(in srgb, var(--workspace-hover) 50%, transparent) !important;
                border: 1px dashed var(--workspace-line) !important;
                margin: 8px 0;
            }
            .scenario-search-empty button {
                padding: 4px 8px;
                border: 1px solid var(--workspace-line);
                border-radius: 5px;
                background: var(--workspace-surface);
                color: var(--workspace-primary);
                font-size: 10px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
            }
            .scenario-search-empty button:hover {
                background: var(--workspace-hover);
                border-color: var(--workspace-selected-line);
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
            }
            .scenario-search-empty button:active {
                transform: translateY(0) scale(0.98);
            }

            #filterBar { gap: 12px; flex-wrap: wrap; }
            .step-filter-options {
                display: inline-flex;
                flex: 0 0 auto;
                align-items: center;
                gap: 2px;
                padding: 2px;
                border: 1px solid var(--workspace-line);
                border-radius: 8px;
                background: var(--workspace-hover);
            }
            .step-filter-tools { display: flex; min-width: 0; flex: 1 1 220px; align-items: center; justify-content: flex-end; gap: 8px; }
            .step-filter-summary { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; color: var(--workspace-muted); font-size: 10px; font-variant-numeric: tabular-nums; white-space: nowrap; }
            #stepSearchInput { width: 160px; }
            .step-filter-reset {
                flex: 0 0 auto;
                padding: 5px 7px;
                border: 1px solid var(--workspace-line);
                border-radius: 6px;
                background: var(--workspace-surface);
                color: var(--workspace-muted);
                font-size: 10px;
                font-weight: 600;
                white-space: nowrap;
                cursor: pointer;
                transition: background-color .15s ease, color .15s ease, border-color .15s ease;
            }
            .step-filter-reset:hover { border-color: var(--workspace-selected-line); background: var(--workspace-hover); color: var(--workspace-text); }
            .steps-filter-empty {
                display: flex;
                flex: 1;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 10px;
                min-height: 140px;
                padding: 32px 24px;
                color: var(--workspace-muted);
                font-size: 12px;
                text-align: center;
                border-radius: 8px !important;
                background: color-mix(in srgb, var(--workspace-hover) 40%, transparent) !important;
                border: 1px dashed var(--workspace-line) !important;
                margin: 8px;
            }
            .steps-filter-empty button {
                padding: 6px 12px;
                border: 1px solid var(--workspace-line);
                border-radius: 6px;
                background: var(--workspace-surface);
                color: var(--workspace-primary);
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
            }
            .steps-filter-empty button:hover {
                background: var(--workspace-hover);
                border-color: var(--workspace-selected-line);
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
            }
            .steps-filter-empty button:active {
                transform: translateY(0) scale(0.98);
            }
            #scenarioList { padding: 6px !important; gap: 4px !important; }
            #scenarioList > div {
                border-radius: 7px !important;
                border: 1px solid transparent !important;
                box-shadow: none !important;
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }
            #scenarioList > div:hover {
                background: var(--workspace-hover) !important;
                border-color: color-mix(in srgb, var(--workspace-line) 80%, transparent) !important;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04) !important;
            }
            #scenarioList > div:active {
                transform: translateY(0);
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
                transition-duration: 0.1s;
            }
            #scenarioList > div.bg-slate-100 {
                background: var(--workspace-selected) !important;
                border-color: var(--workspace-selected-line) !important;
                box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05), 0 0 0 1px color-mix(in srgb, var(--workspace-primary) 20%, transparent) !important;
            }
            #scenarioList > div:has([data-scenario-file]) { min-height: 56px; }
            #scenarioList [data-scenario-file] { padding: 8px 10px !important; }
            #scenarioList [data-scenario-file] > div:first-child { font-size: 12.5px !important; font-weight: 600 !important; line-height: 1.35 !important; color: var(--workspace-text); }
            #scenarioList [data-scenario-file] > div:last-child { margin-top: 3px !important; font-size: 10.5px !important; line-height: 1.3 !important; }
            #scenarioList .scenario-pin-control {
                display: inline-flex;
                flex: 0 0 auto;
                align-items: center;
                justify-content: center;
                align-self: center;
                width: 24px;
                height: 24px;
                margin-right: 6px;
                border: 0;
                border-radius: 4px;
                background: transparent;
                color: #94a3b8;
                opacity: 0;
                cursor: pointer;
                transition: all 0.15s ease;
            }
            #scenarioList .scenario-pin-control svg { width: 13px; height: 13px; }
            #scenarioList > div:hover .scenario-pin-control, #scenarioList .scenario-pin-control--active { opacity: 1; }
            #scenarioList .scenario-pin-control:hover { background: var(--workspace-hover); color: var(--workspace-text); }
            #scenarioList .scenario-pin-control--active { color: #0d9488; }
            #scenarioList .scenario-pin-control--active:hover { background: rgba(13, 148, 136, 0.1); color: #0f766e; }

            .stats-action-btn {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 4px 10px;
                border: 1px solid var(--workspace-line);
                border-radius: 6px;
                background: var(--workspace-surface);
                color: var(--workspace-muted);
                font-size: 11.5px;
                font-weight: 600;
                line-height: 1.35;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                user-select: none;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
            }
            .stats-action-btn:hover:not(:disabled) {
                background: var(--workspace-hover);
                color: var(--workspace-text);
                border-color: var(--workspace-selected-line);
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
            }
            .stats-action-btn:active:not(:disabled) {
                transform: scale(0.97) translateY(0);
            }
            .stats-action-btn:disabled {
                opacity: 0.45;
                cursor: not-allowed;
            }
            .stats-action-btn--primary {
                border-color: rgba(99, 102, 241, 0.25);
                background: rgba(99, 102, 241, 0.06);
                color: #4f46e5;
            }
            .stats-action-btn--primary:hover:not(:disabled) {
                background: rgba(99, 102, 241, 0.14);
                border-color: rgba(99, 102, 241, 0.4);
                color: #4338ca;
                box-shadow: 0 2px 6px rgba(99, 102, 241, 0.15);
            }
            #scenario-test-root.theme-claude-code .stats-action-btn {
                background: #fdfaf6;
                border-color: var(--workspace-line);
                color: var(--workspace-text);
            }
            #scenario-test-root.theme-claude-code .stats-action-btn--primary {
                background: #f3eae0;
                border-color: #dfcebf;
                color: #245244;
            }

            .scenario-side-tabs {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 4px 10px;
                border-bottom: 1px solid var(--workspace-line);
                background: color-mix(in srgb, var(--workspace-hover) 58%, transparent);
            }
            .scenario-side-tab {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                min-height: 28px;
                flex: 1;
                padding: 0 8px;
                border: 1px solid transparent;
                border-radius: 6px;
                background: transparent;
                color: var(--workspace-muted);
                font-size: 11.5px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .scenario-side-tab:hover:not(:disabled):not(.is-active) {
                color: var(--workspace-text);
                background: var(--workspace-surface);
                border-color: var(--workspace-line);
                transform: translateY(-1px);
            }
            .scenario-side-tab:active:not(:disabled) {
                transform: translateY(0) scale(0.98);
            }
            .scenario-side-tab.is-active {
                color: var(--workspace-text);
                background: var(--workspace-surface);
                border-color: var(--workspace-line);
                box-shadow: 0 2px 4px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.1);
            }
            .scenario-side-tab:disabled {
                opacity: 0.48;
                cursor: not-allowed;
            }
            .scenario-side-tab__badge {
                display: inline-flex;
                min-width: 17px;
                height: 17px;
                align-items: center;
                justify-content: center;
                padding: 0 4px;
                border-radius: 999px;
                background: var(--workspace-selected);
                color: var(--workspace-muted);
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                font-size: 10px;
                font-variant-numeric: tabular-nums;
                line-height: 1;
            }
            .scenario-side-tab__badge.is-alert {
                background: #fff1f2;
                color: #e11d48;
            }
            .scenario-side-panel.hidden,
            .scenario-side-panel[hidden] { display: none !important; }
            #scenario-test-root.theme-claude-code .scenario-side-tab__badge.is-alert {
                background: #f8e2df;
                color: #a9403d;
            }
            .scenario-pane--steps #filterBar {
                min-height: 36px;
                padding: 5px 12px !important;
                background: var(--workspace-surface) !important;
                border-bottom: 1px solid var(--workspace-line) !important;
            }
            #stepsList > li {
                border-bottom: 1px solid var(--workspace-line) !important;
                transition: background-color 0.2s ease, box-shadow 0.2s ease;
            }
            #stepsList > li:hover {
                background: var(--workspace-hover) !important;
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
            }
            #stepsList > li[data-passed="false"][data-skipped="false"] {
                box-shadow: inset 3px 0 0 var(--workspace-danger);
                background: rgba(225, 29, 72, 0.025) !important;
            }
            #stepsList > li[data-passed="false"][data-skipped="false"]:hover {
                background: rgba(225, 29, 72, 0.055) !important;
                box-shadow: inset 3px 0 0 var(--workspace-danger), inset 0 1px 0 rgba(255, 255, 255, 0.03);
            }
            #stepsList > li[data-passed="true"] {
                transition: background-color 0.3s ease;
            }
            .step-row-action {
                opacity: 0.65;
                transition: opacity 0.2s ease, background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
            }
            .step-row-action:hover {
                transform: scale(1.08);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
            }
            .step-row-action:active {
                transform: scale(1.02);
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
            }
            #stepsList > li:hover .step-row-action,
            #stepsList > li:focus-within .step-row-action,
            .step-row-action:focus-visible {
                opacity: 1;
            }
            #stepsList > li > div:first-child { min-height: 40px; padding: 7px 14px !important; }
            #stepsList .w-5.h-5 { width: 20px !important; height: 20px !important; font-size: 11px !important; }
            #stepsList .text-sm { font-size: 13px !important; }
            #stepsList .text-\\[10px\\], #stepsList .text-\\[11px\\], #stepsList .text-\\[12px\\] { font-size: 11px !important; }
            #stepsList [data-adhoc-step] { border-radius: 4px !important; padding: 3px 7px !important; font-size: 11px !important; box-shadow: none !important; }
            .step-run-actions {
                display: inline-flex;
                align-items: center;
                overflow: hidden;
                border: 1px solid var(--workspace-line);
                border-radius: 4px;
                background: var(--workspace-surface);
                box-shadow: 0 1px 2px rgba(0,0,0,0.02);
            }
            .step-run-actions button {
                padding: 3px 7px;
                border: 0;
                border-right: 1px solid var(--workspace-line);
                background: transparent;
                color: var(--workspace-muted);
                font-size: 11px;
                font-weight: 700;
                line-height: 1;
                cursor: pointer;
                transition: color 0.15s ease, background-color 0.15s ease;
            }
            .step-run-actions button:last-child { border-right: 0; color: #0d9488; }
            .step-run-actions button:hover { background: var(--workspace-hover); color: var(--workspace-text); }
            
            .details-panel {
                display: none;
                opacity: 0;
            }
            .details-panel.open {
                display: block;
                opacity: 1;
                padding-top: 0.75rem;
                padding-bottom: 0.75rem;
            }
            #stepsList .details-panel { background: var(--workspace-hover) !important; border-color: var(--workspace-line) !important; }

            pre {
                background: var(--workspace-code) !important;
                border: 1px solid #1e293b !important;
                border-radius: 6px !important;
                color: #e2e8f0 !important;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            }
            .font-mono {
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                font-variant-numeric: tabular-nums;
            }

            .code-editor-block {
                background: #090d16 !important;
                border: 1px solid #1e293b !important;
                border-radius: 8px !important;
                max-height: 260px;
                overflow-y: auto;
            }
            .code-gutter {
                display: flex;
                flex-direction: column;
                color: #475569;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                font-size: 10.5px;
                line-height: 1.45;
                user-select: none;
                position: sticky;
                left: 0;
            }
            .code-content {
                background: transparent !important;
                border: none !important;
                border-radius: 0 !important;
                color: #cbd5e1 !important;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                font-size: 11px;
                line-height: 1.45;
            }
            #scenario-test-root.theme-claude-code .code-editor-block {
                background: #1c1815 !important;
                border-color: #3b312b !important;
            }
            #scenario-test-root.theme-claude-code .code-gutter {
                color: #78695d !important;
                background: #151210 !important;
                border-color: #3b312b !important;
            }
            #scenario-test-root.theme-claude-code .code-content {
                color: #e6dfd8 !important;
            }

            .scenario-header-button--report {
                border-color: rgba(99, 102, 241, 0.22) !important;
                background: rgba(99, 102, 241, 0.06) !important;
                color: #4f46e5 !important;
            }
            .scenario-header-button--report:hover:not(:disabled) {
                background: rgba(99, 102, 241, 0.12) !important;
                border-color: rgba(99, 102, 241, 0.35) !important;
            }
            #scenario-test-root.theme-claude-code .scenario-header-button--report {
                background: #fdfaf6 !important;
                border-color: var(--workspace-line) !important;
                color: var(--workspace-text) !important;
            }
            
            .report-content { display: flex; flex-direction: column; gap: 10px; padding: 12px; }
            .report-overview {
                padding: 12px;
                border: 1px solid var(--workspace-line);
                border-radius: 8px;
                background: linear-gradient(145deg, var(--workspace-surface), var(--workspace-hover));
            }
            .report-overview__top { display: flex; min-width: 0; align-items: center; justify-content: space-between; gap: 8px; }
            .report-overview__title { min-width: 0; overflow: hidden; color: var(--workspace-text); font-size: 12px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
            .report-status {
                display: inline-flex;
                flex: 0 0 auto;
                align-items: center;
                min-height: 22px;
                padding: 0 8px;
                border: 1px solid transparent;
                border-radius: 999px;
                font-size: 10px;
                font-weight: 700;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
            }
            .report-status--passed {
                background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
                border-color: #bbf7d0;
                color: #047857;
                box-shadow: 0 1px 3px rgba(16, 185, 129, 0.15);
            }
            .report-status--failed {
                background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%);
                border-color: #fecdd3;
                color: #be123c;
                box-shadow: 0 1px 3px rgba(225, 29, 72, 0.15);
            }
            .report-status--cancelled {
                background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
                border-color: #fed7aa;
                color: #c2410c;
                box-shadow: 0 1px 3px rgba(234, 88, 12, 0.15);
            }
            .report-status--skipped,
            .report-status--running {
                background: var(--workspace-selected);
                border-color: var(--workspace-selected-line);
                color: var(--workspace-muted);
            }
            .report-overview__meta { display: flex; flex-wrap: wrap; gap: 5px 10px; margin-top: 8px; color: var(--workspace-muted); font-size: 10px; line-height: 1.4; }
            .report-overview__meta span { position: relative; }
            .report-overview__meta span + span::before { content: '\xB7'; position: absolute; left: -7px; color: var(--workspace-selected-line); }
            .report-progress { margin-top: 11px; }
            .report-progress__labels { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--workspace-muted); font-size: 10px; }
            .report-progress__labels strong { color: var(--workspace-text); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-variant-numeric: tabular-nums; }
            .report-progress__outcome { margin-top: 8px; }
            .report-progress__track {
                height: 6px;
                margin-top: 5px;
                overflow: hidden;
                border-radius: 999px;
                background: var(--workspace-selected);
                box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
            }
            .report-progress__track span {
                display: block;
                height: 100%;
                border-radius: inherit;
                background: linear-gradient(90deg, var(--workspace-success) 0%, color-mix(in srgb, var(--workspace-success) 85%, white) 100%);
                transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 0 8px rgba(16, 185, 129, 0.25);
            }
            .report-progress__track--failed span {
                background: linear-gradient(90deg, var(--workspace-danger) 0%, color-mix(in srgb, var(--workspace-danger) 85%, white) 100%);
                box-shadow: 0 0 8px rgba(225, 29, 72, 0.25);
            }
            .report-diagnosis { overflow: hidden; border: 1px solid var(--workspace-line); border-radius: 8px; background: var(--workspace-surface); }
            .report-diagnosis > summary { display: flex; align-items: center; justify-content: space-between; min-height: 34px; padding: 0 10px; cursor: pointer; color: var(--workspace-text); font-size: 11px; font-weight: 700; list-style: none; }
            .report-diagnosis > summary::-webkit-details-marker { display: none; }
            .report-diagnosis > summary::after { content: '\u2304'; color: var(--workspace-muted); font-size: 14px; transition: transform 0.15s ease; }
            .report-diagnosis[open] > summary::after { transform: rotate(180deg); }
            .report-diagnosis__body { padding: 0 10px 10px; border-top: 1px solid var(--workspace-line); }
            .report-steps__title { padding: 9px 0 2px; color: var(--workspace-muted); font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
            .report-healthy { margin-top: 8px; padding: 10px; border: 1px solid #bbf7d0; border-radius: 7px; background: #f0fdf4; }
            .report-healthy__title { color: #047857; font-size: 11px; font-weight: 700; }
            .report-healthy__hint { margin-top: 3px; color: #4b7a68; font-size: 10px; line-height: 1.45; }
            .report-step { position: relative; display: flex; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--workspace-line); }
            .report-step:last-child { border-bottom: 0; }
            .report-step__marker { display: flex; flex: 0 0 16px; align-items: center; justify-content: center; width: 16px; height: 16px; margin-top: 1px; border-radius: 999px; font-size: 10px; font-weight: 800; }
            .report-step--passed .report-step__marker { background: #ecfdf5; color: #059669; }
            .report-step--failed .report-step__marker { background: #fff1f2; color: #e11d48; }
            .report-step__content { min-width: 0; flex: 1; }
            .report-step__heading { display: flex; min-width: 0; align-items: baseline; gap: 5px; }
            .report-step__number { flex: 0 0 auto; color: var(--workspace-muted); font-size: 10px; font-weight: 600; }
            .report-step__name { overflow: hidden; color: var(--workspace-text); font-size: 11.5px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
            .report-step__request { display: flex; min-width: 0; align-items: center; gap: 5px; margin-top: 3px; }
            .report-method { flex: 0 0 auto; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 9px; font-weight: 800; }
            .report-method--get { color: #059669; }
            .report-method--post { color: #d97706; }
            .report-method--put { color: #a16207; }
            .report-method--delete { color: #e11d48; }
            .report-method--patch { color: #7c3aed; }
            .report-step__path { overflow: hidden; color: var(--workspace-muted); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
            .report-step__issue { margin-top: 4px; color: #e11d48; font-size: 10.5px; line-height: 1.4; }
            .report-step__locate {
                display: inline-flex;
                align-items: center;
                margin-top: 4px;
                padding: 2px 0;
                border: 0;
                background: transparent;
                color: var(--workspace-primary);
                font-size: 10px;
                font-weight: 700;
                cursor: pointer;
            }
            .report-step__locate:hover { text-decoration: underline; }
            .report-step__locate:focus-visible { outline: 2px solid var(--workspace-primary); outline-offset: 2px; }
            .report-step__response { margin-top: 6px; }
            .report-step__response summary { cursor: pointer; color: #0d9488; font-size: 10px; font-weight: 700; }
            .report-step__response-section { margin-top: 6px; color: var(--workspace-muted); font-size: 10px; font-weight: 600; }
            .report-step__response pre { max-height: 260px; margin-top: 4px; overflow: auto; padding: 8px; background: #0f172a; border: 0; border-radius: 6px; color: #e2e8f0; font-size: 10px; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }
            .report-step__result { display: flex; flex: 0 0 auto; flex-direction: column; align-items: flex-end; gap: 3px; padding-top: 1px; }
            .report-step__code { color: var(--workspace-muted); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 10px; font-weight: 700; }
            .report-step__duration { color: var(--workspace-muted); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 10px; }
            .scenario-step--located { background: var(--workspace-hover) !important; box-shadow: inset 3px 0 0 var(--workspace-primary); }
            
            .report-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 120px;
                padding: 24px 16px;
                text-align: center;
                color: var(--workspace-muted);
                border-radius: 8px !important;
                background: color-mix(in srgb, var(--workspace-hover) 35%, transparent) !important;
                border: 1px dashed var(--workspace-line) !important;
                margin: 12px;
            }
            .report-empty__title {
                color: var(--workspace-text);
                font-size: 13px;
                font-weight: 700;
                margin-bottom: 4px;
            }
            .report-empty__hint {
                margin-top: 4px;
                font-size: 11px;
                line-height: 1.5;
            }

            #configModal {
                backdrop-filter: blur(6px);
                animation: modal-fade-in 0.2s ease-out;
            }
            @keyframes modal-fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            #configModal > div {
                background: #0f172a !important;
                border: 1px solid #1e293b !important;
                border-radius: 12px !important;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3) !important;
                animation: modal-slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            }
            @keyframes modal-slide-in {
                from { opacity: 0; transform: scale(0.96) translateY(-8px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }
            #configModal input, #configModal select {
                border-radius: 6px !important;
                transition: all 0.2s ease;
            }
            #configModal input:focus, #configModal select:focus {
                box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25) !important;
                transform: translateY(-1px);
            }

            #adhocModal {
                backdrop-filter: blur(6px);
                animation: modal-fade-in 0.2s ease-out;
            }
            #adhocModal > div {
                background: var(--workspace-surface) !important;
                border: 1px solid var(--workspace-line) !important;
                border-radius: 12px !important;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.15) !important;
                animation: modal-slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            }
            #adhocModal input, #adhocModal select, #adhocModal textarea {
                border-radius: 6px !important;
                transition: all 0.2s ease;
            }
            #adhocModal input:focus, #adhocModal select:focus, #adhocModal textarea:focus {
                border-color: var(--workspace-primary) !important;
                box-shadow: 0 0 0 3px color-mix(in srgb, var(--workspace-primary) 20%, transparent) !important;
                transform: translateY(-1px);
            }

            .scenario-step-loading { display: none; position: fixed; z-index: 40; top: 54px; right: 16px; pointer-events: none; }
            .scenario-step-loading--visible { display: block; animation: scenario-step-loading-fade-in 0.2s ease-out; }
            .scenario-step-loading__content {
                display: flex;
                align-items: center;
                gap: 10px;
                min-width: 240px;
                max-width: 420px;
                padding: 10px 14px;
                border: 1px solid var(--workspace-line);
                border-radius: 9px;
                background: var(--workspace-surface);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04);
                backdrop-filter: blur(8px);
            }
            @keyframes scenario-step-loading-fade-in {
                from { opacity: 0; transform: translateY(-4px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .scenario-step-loading__spinner {
                width: 16px;
                height: 16px;
                border: 2px solid var(--workspace-line);
                border-top-color: var(--workspace-primary);
                border-radius: 50%;
                animation: scenario-step-loading-spin 0.8s cubic-bezier(0.4, 0.15, 0.6, 0.85) infinite,
                           scenario-step-loading-pulse 2s ease-in-out infinite;
            }
            @keyframes scenario-step-loading-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
            .scenario-step-loading__title { color: var(--workspace-text); font-size: 12px; font-weight: 700; }
            .scenario-step-loading__text { margin-top: 1px; overflow: hidden; color: var(--workspace-muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
            @keyframes scenario-step-loading-spin { to { transform: rotate(360deg); } }

            .code-copy-btn {
                border: 1px solid #334155;
                background: #1e293b;
                color: #94a3b8;
                border-radius: 4px;
                padding: 2px 7px;
                font-size: 10px;
                font-weight: 600;
                cursor: pointer;
                transition: all .15s ease;
            }
            .code-copy-btn:hover { color: #ffffff; background: #334155; }
            .code-copy-btn--success { color: #34d399 !important; border-color: #059669 !important; }

            .custom-dropdown__trigger,
            .scenario-header-button,
            .scenario-header-text-action { height: 36px; }
            .scenario-header-button { font-size: 12.5px !important; }
            #scenarioSearchInput { min-height: 34px; font-size: 12.5px !important; }
            #scenarioList [data-scenario-file] > div:first-child { font-size: 13px !important; }
            #scenarioList [data-scenario-file] > div:last-child { font-size: 11px !important; }
            #stepsList > li > div:first-child { min-height: 44px; padding-top: 8px !important; padding-bottom: 8px !important; }
            .report-metric__label, .report-progress__labels { font-size: 11px; }
            .report-metric__value { font-size: 16px; }

            #scenario-test-root :where(button, input, select, textarea, summary, [data-scenario-file]):focus-visible {
                outline: 2px solid var(--workspace-primary) !important;
                outline-offset: 2px;
                box-shadow: 0 0 0 4px color-mix(in srgb, var(--workspace-primary) 15%, transparent);
                transition: box-shadow 0.2s ease;
            }
            #stepsList [role="button"][tabindex]:focus-visible {
                outline: 2px solid var(--workspace-primary) !important;
                outline-offset: -3px;
                border-radius: 3px;
                box-shadow: 0 0 0 4px color-mix(in srgb, var(--workspace-primary) 12%, transparent);
            }
            .custom-dropdown__item:focus-visible {
                background: var(--workspace-hover);
                outline-offset: -1px !important;
                box-shadow: inset 0 0 0 1px var(--workspace-primary);
            }
            #scenarioList .scenario-pin-control:focus-visible { opacity: 1; }
            #cancelBtn:disabled { display: none; }
            #configModal, #adhocModal { background: var(--workspace-overlay) !important; }

            .scenario-grid {
                display: grid;
                grid-template-columns: minmax(200px, 260px) 1fr minmax(250px, 290px);
                gap: 8px;
                height: 100%;
                min-height: 0;
            }
            .scenario-pane {
                height: 100%;
                min-height: 0;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            @media (min-width: 1440px) {
                .scenario-grid {
                    grid-template-columns: minmax(220px, 270px) 1fr minmax(260px, 300px) !important;
                }
            }

            @media (max-width: 1439px) and (min-width: 1080px) {
                .scenario-grid {
                    grid-template-columns: minmax(190px, 230px) 1fr minmax(240px, 270px) !important;
                }
            }

            @media (max-width: 1079px) {
                #scenario-test-root { overflow: auto; }
                .scenario-workspace { height: auto; min-height: calc(100vh - 48px); overflow: visible; }
                .scenario-grid {
                    height: auto;
                    min-height: calc(100vh - 64px);
                    display: flex !important;
                    flex-direction: column;
                }
                .scenario-pane { max-height: none !important; }
                .scenario-pane--scenarios { height: min(30vh, 260px); }
                .scenario-pane--steps { height: max(500px, 60vh); }
                .scenario-pane--stats { height: auto; }
            }

            @media (max-width: 820px) {
                #scenario-test-root > header {
                    min-height: auto;
                    align-items: stretch;
                    flex-direction: column;
                    gap: 6px;
                    padding: 8px 12px !important;
                }
                .scenario-header-context { width: 100%; }
                .scenario-header-theme .custom-dropdown__prefix,
                .scenario-header-environment .custom-dropdown__prefix,
                .scenario-header-config-label,
                .scenario-environment-badge { display: none; }
                .scenario-header-actions { width: 100%; max-width: none; align-items: center; justify-content: flex-end; gap: 4px !important; overflow: visible; padding-bottom: 1px; }
                .scenario-header-context-actions { margin-right: auto; }
                .scenario-header-run-actions { margin-left: 0; }
                .scenario-header-secondary-actions { margin-left: 0; }
                .scenario-header-reset { padding: 0 6px !important; font-size: 11px !important; }
                .scenario-header-environment .custom-dropdown__trigger { max-width: 132px; }
                .scenario-header-environment .custom-dropdown__label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .scenario-header-theme .custom-dropdown__trigger { max-width: 108px; }
                .scenario-header-theme .custom-dropdown__label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .custom-dropdown__trigger,
                .scenario-header-button,
                .scenario-header-text-action { height: 36px; }
                #filterBar { gap: 8px; overflow-x: auto; }
                #filterBar > div:last-child { min-width: 150px; }
                #stepsList > li > div:first-child { padding-left: 12px !important; padding-right: 12px !important; }
                #stepsList > li > div:first-child > div:last-child { gap: 4px !important; }
                .step-row-action { padding: 1px 5px !important; font-size: 10px !important; }
            }

            @media (pointer: coarse) {
                #scenarioList .scenario-pin-control { opacity: .72; }
                .scenario-header-button,
                .scenario-header-text-action,
                .custom-dropdown__trigger { min-height: 40px; }
                #stepsList > li > div:first-child { min-height: 48px; }
                .step-row-action { opacity: .85; pointer-events: auto; transform: none; }
            }

            @media (prefers-reduced-motion: reduce) {
                #scenario-test-root *,
                #scenario-test-root *::before,
                #scenario-test-root *::after {
                    scroll-behavior: auto !important;
                    animation: none !important;
                    transition-duration: 0.01ms !important;
                }
                .scenario-header-button:hover,
                .scenario-header-button:active,
                #scenarioList > div:hover,
                #scenarioList > div:active,
                .stats-action-btn:hover,
                .stats-action-btn:active,
                .scenario-side-tab:hover,
                .scenario-side-tab:active,
                .step-row-action:hover,
                .step-row-action:active,
                .custom-dropdown__item:hover,
                .custom-dropdown__item:active,
                .scenario-search-empty button:hover,
                .scenario-search-empty button:active,
                .steps-filter-empty button:hover,
                .steps-filter-empty button:active,
                #configModal input:focus,
                #configModal select:focus,
                #adhocModal input:focus,
                #adhocModal select:focus,
                #adhocModal textarea:focus {
                    transform: none !important;
                }
            }

            ::-webkit-scrollbar { width: 8px; height: 8px; }
            ::-webkit-scrollbar-track {
                background: transparent;
                margin: 2px;
            }
            ::-webkit-scrollbar-thumb {
                background: color-mix(in srgb, #cbd5e1 70%, transparent);
                border-radius: 999px;
                border: 2px solid transparent;
                background-clip: padding-box;
                transition: background-color 0.2s ease;
            }
            ::-webkit-scrollbar-thumb:hover {
                background: color-mix(in srgb, #94a3b8 85%, transparent);
                background-clip: padding-box;
            }
            ::-webkit-scrollbar-thumb:active {
                background: #94a3b8;
                background-clip: padding-box;
            }
            #scenario-test-root.theme-claude-code ::-webkit-scrollbar-thumb {
                background: color-mix(in srgb, #d9af8d 70%, transparent);
                background-clip: padding-box;
            }
            #scenario-test-root.theme-claude-code ::-webkit-scrollbar-thumb:hover {
                background: color-mix(in srgb, #d9af8d 85%, transparent);
                background-clip: padding-box;
            }
        `;
  }
  function getClaudeStyleBlock() {
    return "";
  }
  function injectStyles() {
    var existing = document.getElementById("scenarioDynamicStyles");
    if (existing) return;
    var style = document.createElement("style");
    style.id = "scenarioDynamicStyles";
    style.textContent = getWorkspaceStyleBlock();
    document.head.appendChild(style);
  }
  function applyTheme(theme) {
    var selectedTheme = theme === "claude-code" ? "claude-code" : "default";
    var root = document.getElementById("scenario-test-root");
    if (root) root.classList.toggle("theme-claude-code", selectedTheme === "claude-code");
    document.body.classList.toggle("theme-claude-code", selectedTheme === "claude-code");
    var select = document.getElementById("themeSelect");
    if (select) {
      select.value = selectedTheme;
      var selectedOption = select.options[select.selectedIndex];
      var themeLabel = document.getElementById("themeDropdownLabel");
      if (themeLabel) themeLabel.textContent = selectedOption ? selectedOption.textContent : "-";
    }
    injectStyles();
  }
  return {
    getClaudeStyleBlock,
    injectStyles,
    applyTheme
  };
}();
var ui_style_default = workbenchStyle;

// src/browser/ui/ui-view.js
var workbenchView = function() {
  "use strict";
  function stringify(value) {
    if (value === void 0 || value === null || value === "") return "";
    return typeof value === "string" ? value : JSON.stringify(value, null, 2);
  }
  function mdInline(value) {
    var text = typeof value === "string" ? value : JSON.stringify(value);
    if (text === void 0 || text === null || text === "") return "";
    return text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\r\n|\r|\n/g, "\\n");
  }
  function mdCode(value) {
    var text = String(value).replace(/\r\n|\r|\n/g, "\\n");
    var runs = text.match(/`+/g) || [];
    var maxRun = runs.reduce(function(max, run) {
      return run.length > max ? run.length : max;
    }, 0);
    var fence = "`".repeat(Math.max(1, maxRun + 1));
    var pad = /^`|`$/.test(text) || text[0] === " " && text[text.length - 1] === " " && /[^ ]/.test(text);
    var sp = pad ? " " : "";
    return fence + sp + text + sp + fence;
  }
  function eachDetailRows2(detail, prefix) {
    var html = "";
    (Array.isArray(detail) ? detail : []).forEach(function(d) {
      var label = (prefix ? prefix + " \u203A " : "") + "\u7B2C " + (d.index + 1) + " \u9879";
      d.assertions.forEach(function(sub) {
        if (sub.passed) return;
        html += '<tr class="bg-rose-50/40"><td class="px-3.5 py-1.5 font-mono text-[11px] whitespace-nowrap text-rose-600">\u21B3 ' + label + '</td><td class="px-3.5 py-1.5 font-mono text-[11px] text-rose-700">' + esc(stringify(sub.expected)) + '</td><td class="px-3.5 py-1.5 font-mono text-[11px] text-rose-900">' + esc(stringify(sub.actual)) + '</td><td class="px-3.5 py-1.5"></td></tr>';
        if (sub.reason) {
          html += '<tr class="bg-rose-50/40"><td class="px-3.5 py-1.5"></td><td colspan="3" class="px-3.5 py-1.5 text-[11px] text-rose-700 break-all">\u539F\u56E0: ' + esc(sub.reason) + "</td></tr>";
        }
        html += eachDetailRows2(sub.detail, label);
      });
    });
    return html;
  }
  function pushEachDetailLines(lines, detail, prefix, depth) {
    (Array.isArray(detail) ? detail : []).forEach(function(d) {
      var label = (prefix ? prefix + " \u203A " : "") + "\u7B2C " + (d.index + 1) + " \u9879";
      d.assertions.forEach(function(sub) {
        if (sub.passed) return;
        lines.push("    ".repeat(depth) + "- " + label + "\u5931\u8D25: \u671F\u671B " + mdInline(sub.expected) + ",\u5B9E\u5F97 " + mdInline(sub.actual));
        if (sub.reason) lines.push("    ".repeat(depth + 1) + "- \u539F\u56E0: " + mdInline(sub.reason));
        pushEachDetailLines(lines, sub.detail, label, depth + 1);
      });
    });
  }
  function fenceFor(content) {
    var runs = String(content).match(/`+/g) || [];
    var maxRun = runs.reduce(function(max, run) {
      return run.length > max ? run.length : max;
    }, 0);
    return "`".repeat(Math.max(3, maxRun + 1));
  }
  function formatReportPayload(value, options) {
    var text = stringify(value);
    if (!text) return "(\u7A7A)";
    return options && options.full ? text : truncateForDisplay(text);
  }
  var DISPLAY_PAYLOAD_LIMIT = 65536;
  function truncateForDisplay(text) {
    var value = String(text);
    if (value.length <= DISPLAY_PAYLOAD_LIMIT) return value;
    return value.slice(0, DISPLAY_PAYLOAD_LIMIT) + "\n\u2026\uFF08\u5C55\u793A\u5DF2\u622A\u65AD\uFF0C\u5171 " + value.length + " \u5B57\u7B26\uFF1B\u5B8C\u6574\u5185\u5BB9\u8BF7\u7528 saveResponseAs \u4FDD\u5B58\u540E\u67E5\u770B\uFF09";
  }
  function setRunState(type, text) {
    var node = document.getElementById("runState");
    if (!node) return;
    node.className = "sr-only";
    node.setAttribute("aria-live", "polite");
    node.textContent = text;
  }
  function setStepLoading(visible, text) {
    var modal = document.getElementById("stepLoadingModal");
    if (!modal) return;
    var message = document.getElementById("stepLoadingText");
    if (message && text) message.textContent = text;
    modal.classList.toggle("scenario-step-loading--visible", Boolean(visible));
    modal.setAttribute("aria-hidden", visible ? "false" : "true");
  }
  function buildSkeleton(mount) {
    (mount || document.body).innerHTML = `
        <header class="scenario-toolbar bg-white border-b border-slate-200 px-4 py-2 flex gap-3 justify-between items-center sticky top-0 z-10 shadow-xs">
            <div class="scenario-header-context flex items-center gap-2 min-w-0">
                <div class="scenario-environment-badge flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100/80 border border-slate-200/60">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span id="envNameLabel" class="text-[11px] font-semibold text-slate-500 whitespace-nowrap"></span>
                </div>
                <span class="text-slate-300 select-none" aria-hidden="true">\u203A</span>
                <h1 id="scenarioTitle" class="text-xs font-bold text-slate-800 tracking-tight truncate max-w-[280px] sm:max-w-xl">\u672A\u52A0\u8F7D\u573A\u666F</h1>
            </div>
            <div class="scenario-header-actions flex items-center">
                <div class="scenario-header-context-actions">
                <div class="custom-dropdown scenario-header-environment" id="envDropdown" title="\u5FEB\u901F\u5207\u6362\u8FD0\u884C\u73AF\u5883">
                    <button type="button" class="custom-dropdown__trigger" id="envDropdownTrigger" aria-haspopup="listbox" aria-expanded="false">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20"></span>
                        <span class="custom-dropdown__prefix text-slate-400 text-[10.5px] font-semibold">\u73AF\u5883</span>
                        <span class="custom-dropdown__label font-bold text-slate-800" id="envDropdownLabel">-</span>
                        <svg class="custom-dropdown__arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    <div class="custom-dropdown__menu" id="envDropdownMenu" role="listbox" aria-label="\u8FD0\u884C\u73AF\u5883"></div>
                    <select id="environmentSelect" class="sr-only" aria-label="\u5FEB\u901F\u5207\u6362\u73AF\u5883" tabindex="-1"></select>
                </div>
                <div class="custom-dropdown scenario-header-theme" id="themeDropdown" title="\u5207\u6362\u754C\u9762\u89C6\u89C9\u98CE\u683C">
                    <button type="button" class="custom-dropdown__trigger" id="themeDropdownTrigger" aria-haspopup="listbox" aria-expanded="false">
                        <svg class="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4 5 5 0 015-5h4l4-4a2.828 2.828 0 114 4l-4 4v4a5 5 0 01-5 5H7z"></path></svg>
                        <span class="custom-dropdown__prefix text-slate-400 text-[10.5px] font-semibold">\u98CE\u683C</span>
                        <span class="custom-dropdown__label font-bold text-slate-800" id="themeDropdownLabel">\u73B0\u4EE3\u7B80\u7EA6</span>
                        <svg class="custom-dropdown__arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                    <div class="custom-dropdown__menu" id="themeDropdownMenu" role="listbox" aria-label="\u754C\u9762\u98CE\u683C"></div>
                    <select id="themeSelect" class="sr-only" aria-label="\u5207\u6362\u754C\u9762\u98CE\u683C" tabindex="-1">
                        <option value="default" selected>\u73B0\u4EE3\u7B80\u7EA6</option>
                        <option value="claude-code">\u6E29\u6696\u7EB8\u97F5</option>
                    </select>
                </div>
                </div>
                <div class="scenario-header-run-actions">
                <button id="stepBtn" class="scenario-header-button scenario-header-button--secondary" title="\u5355\u6B65\u6267\u884C\u4E0B\u4E00\u6761\u7528\u4F8B\uFF08Alt+Enter\uFF1B\u975E\u7F16\u8F91\u72B6\u6001\u4E5F\u53EF\u6309\u7A7A\u683C\uFF09">\u4E0B\u4E00\u6B65</button>
                <button id="runBtn" class="scenario-header-button scenario-header-button--primary" title="\u6267\u884C\u5F53\u524D\u573A\u666F\u4E2D\u7684\u5168\u90E8\u6B65\u9AA4\uFF08Ctrl+Enter / \u2318+Enter\uFF09">
                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span id="runBtnLabel">\u6267\u884C\u5168\u90E8</span>
                </button>
                <button id="cancelBtn" disabled class="scenario-header-text-action scenario-header-text-action--danger">\u505C\u6B62</button>
                </div>
                <div class="scenario-header-secondary-actions">
                <button id="resetBtn" class="scenario-header-text-action scenario-header-reset" title="\u6E05\u9664\u5F53\u524D\u573A\u666F\u7684\u6267\u884C\u7ED3\u679C\uFF08Alt+R\uFF09">\u6E05\u9664\u7ED3\u679C</button>
                <button id="configToggleBtn" class="scenario-header-button scenario-header-button--config" title="\u914D\u7F6E\u73AF\u5883\u53C2\u6570\u4E0E\u5168\u5C40\u53D8\u91CF" aria-haspopup="dialog" aria-controls="configModal">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    <span class="scenario-header-config-label">\u914D\u7F6E</span>
                </button>
                </div>
                <span id="runState" aria-live="polite" class="sr-only">\u5F85\u6267\u884C</span>
            </div>
        </header>
        <main class="scenario-workspace max-w-full mx-auto px-2 py-2">
            <datalist id="globalHeaderNameList">
                <option value="Accept"></option>
                <option value="Accept-Charset"></option>
                <option value="Accept-Encoding"></option>
                <option value="Accept-Language"></option>
                <option value="Authorization"></option>
                <option value="Cache-Control"></option>
                <option value="Connection"></option>
                <option value="Content-Encoding"></option>
                <option value="Content-Length"></option>
                <option value="Content-Type"></option>
                <option value="Cookie"></option>
                <option value="Host"></option>
                <option value="Origin"></option>
                <option value="Referer"></option>
                <option value="User-Agent"></option>
                <option value="X-Client-Id"></option>
                <option value="X-Project"></option>
                <option value="X-Request-Id"></option>
                <option value="X-Token"></option>
            </datalist>
            <div class="scenario-grid grid grid-cols-1 xl:grid-cols-[minmax(200px,260px)_1fr_minmax(250px,290px)] gap-2 h-full min-h-0">
                <aside class="scenario-pane scenario-pane--scenarios bg-white rounded-lg shadow-xs border border-slate-200 overflow-hidden flex flex-col h-full min-h-0">
                    <div class="px-3.5 py-3 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                        <div class="flex items-center justify-between">
                            <div class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                                <span>\u573A\u666F\u5217\u8868</span>
                            </div>
                            <button id="quickAdhocBtn" type="button" class="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 bg-white text-[10.5px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95 shadow-2xs">
                                <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                                <span>\u65B0\u5EFA\u573A\u666F</span>
                            </button>
                        </div>
                        <div class="relative mt-2">
                            <svg class="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" style="top:50%;transform:translateY(-50%)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                            <input id="scenarioSearchInput" type="text" aria-label="\u641C\u7D22\u573A\u666F\u540D\u79F0\u6216\u8DEF\u5F84" aria-controls="scenarioList" title="\u641C\u7D22\u573A\u666F\uFF08Ctrl+K / \u2318+K\uFF1B\u975E\u7F16\u8F91\u72B6\u6001\u4E5F\u53EF\u6309 /\uFF09" placeholder="\u641C\u7D22\u573A\u666F\u540D\u79F0\u6216\u8DEF\u5F84..." class="w-full pl-8 pr-8 py-1.5 rounded-md border border-slate-200 bg-white text-xs text-slate-700 placeholder-slate-400 outline-hidden transition-all focus:border-slate-800 focus:ring-1 focus:ring-slate-800">
                            <button id="scenarioSearchClearBtn" type="button" class="scenario-search-clear" aria-label="\u6E05\u9664\u573A\u666F\u641C\u7D22" title="\u6E05\u9664\u641C\u7D22" hidden>
                                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" stroke-linecap="round"/></svg>
                            </button>
                        </div>
                    </div>
                    <div id="scenarioList" class="p-2 space-y-1 overflow-y-auto flex-1 min-h-0"></div>
                </aside>
                <div class="scenario-pane scenario-pane--steps bg-white rounded-lg shadow-xs border border-slate-200 flex flex-col overflow-hidden h-full min-h-0">
                    <div id="scenarioHeaderBar" class="px-4 py-2.5 border-b border-slate-100 bg-white flex items-center justify-between flex-shrink-0">
                        <div class="min-w-0">
                            <div class="flex items-center gap-2">
                                <h2 id="scenarioMainTitle" class="text-sm font-bold text-slate-900 tracking-tight truncate">\u672A\u52A0\u8F7D\u573A\u666F</h2>
                                <span id="scenarioStatusBadge"><span class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200/60">\u5F85\u6267\u884C</span></span>
                            </div>
                            <div id="scenarioFilePath" class="mt-0.5 text-xs text-slate-400 font-mono truncate"></div>
                        </div>
                    </div>
                    <div id="filterBar" class="flex items-center justify-between bg-slate-50/50 px-3 py-1.5 border-b border-slate-100 flex-shrink-0">
                        <div class="text-xs text-slate-400 py-1">\u672A\u52A0\u8F7D\u573A\u666F</div>
                    </div>
                    <ul id="stepsList" class="divide-y divide-slate-100 bg-white flex-1 overflow-y-auto min-h-0"></ul>
                    <div id="stepsFilterEmpty" class="steps-filter-empty" role="status" aria-live="polite" style="display:none"></div>
                    <div id="executionFooter" class="px-4 py-2 bg-slate-50/70 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap items-center gap-4 sm:gap-6 font-mono text-[11px] flex-shrink-0">
                        <div class="flex items-center gap-1.5">
                            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <span>\u5F00\u59CB\u65F6\u95F4: <span id="execStartTime" class="text-slate-700 font-semibold">-</span></span>
                        </div>
                        <div>\u7ED3\u675F\u65F6\u95F4: <span id="execEndTime" class="text-slate-700 font-semibold">-</span></div>
                        <div>\u603B\u8017\u65F6: <span id="execTotalDuration" class="text-slate-500 font-bold">0.00 ms</span></div>
                    </div>
                </div>
                <aside class="scenario-pane scenario-pane--stats bg-white rounded-lg shadow-xs border border-slate-200 overflow-hidden flex flex-col h-full min-h-0">
                    <div class="px-3.5 py-3 border-b border-slate-100 bg-slate-50/50 flex-shrink-0 flex items-center justify-between">
                        <div class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                            <span>\u6267\u884C\u7ED3\u679C</span>
                        </div>
                    </div>
                    <div class="scenario-side-tabs" role="tablist" aria-label="\u6267\u884C\u7ED3\u679C\u89C6\u56FE">
                        <button id="statsTab" class="scenario-side-tab is-active" type="button" role="tab" aria-selected="true" aria-controls="statsPanel">\u6267\u884C\u6458\u8981</button>
                        <button id="reportTab" class="scenario-side-tab" type="button" role="tab" aria-selected="false" aria-controls="reportPanel" disabled>
                            \u5931\u8D25\u8BCA\u65AD <span id="reportTabBadge" class="scenario-side-tab__badge" style="display:none">0</span>
                        </button>
                    </div>
                    <div id="statsPanel" class="scenario-side-panel p-3 overflow-y-auto flex-1 min-h-0" role="tabpanel" aria-labelledby="statsTab">
                        <div class="text-xs text-slate-400 text-center py-4">\u573A\u666F\u672A\u52A0\u8F7D\u6216\u672A\u6267\u884C</div>
                    </div>
                    <div id="reportPanel" class="scenario-side-panel hidden overflow-y-auto flex-1 min-h-0" role="tabpanel" aria-labelledby="reportTab" aria-live="polite">
                        <div class="report-empty"><div class="report-empty__title">\u6267\u884C\u540E\u751F\u6210\u62A5\u544A</div><div class="report-empty__hint">\u5931\u8D25\u6B65\u9AA4\u548C\u54CD\u5E94\u6458\u8981\u5C06\u5728\u8FD9\u91CC\u5C55\u793A</div></div>
                    </div>
                </aside>
            </div>
        </main>
        <div id="configModal" class="hidden fixed inset-0 z-40 bg-slate-950/30 p-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="configModalTitle">
            <div class="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl bg-slate-900 shadow-2xl border border-slate-700/80 text-slate-200">
                <div class="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                    <div>
                        <div id="configModalTitle" class="text-sm font-bold text-white tracking-tight">\u73AF\u5883\u53C2\u6570\u914D\u7F6E</div>
                        <div class="mt-0.5 text-[11px] text-slate-400">\u6D4B\u8BD5\u73AF\u5883\u3001\u5168\u5C40\u53C2\u6570\u4E0E\u573A\u666F\u53D8\u91CF\uFF0C\u4FDD\u5B58\u540E\u6309\u73AF\u5883\u81EA\u52A8\u751F\u6548\u3002</div>
                    </div>
                    <button id="configCloseBtn" type="button" class="rounded-lg px-2.5 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">\u5173\u95ED</button>
                </div>
                <div class="space-y-4 p-5">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label class="flex flex-col gap-1.5">
                            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">\u6D4B\u8BD5\u73AF\u5883</span>
                            <select id="environmentInput" class="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"></select>
                        </label>
                        <label class="flex flex-col gap-1.5">
                            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">\u63A5\u53E3\u57FA\u7840\u5730\u5740</span>
                            <input id="baseUrlInput" type="text" placeholder="\u7559\u7A7A\u9ED8\u8BA4\u4F7F\u7528\u5F53\u524D\u9875\u9762\u670D\u52A1\u5730\u5740" class="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all">
                        </label>
                    </div>
                    <div class="border-t border-slate-800 pt-4">
                        <div class="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">\u5168\u5C40\u53C2\u6570 <span class="normal-case font-normal text-slate-500">\uFF08\u8FFD\u52A0\u5230\u6BCF\u4E2A\u8BF7\u6C42\uFF0C\u652F\u6301 header / cookie / query\uFF09</span></div>
                        <div id="globalsInput" class="space-y-2"></div>
                        <button type="button" id="addGlobalBtn" class="mt-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-all active:scale-[0.98]">+ \u6DFB\u52A0\u5168\u5C40\u53C2\u6570</button>
                    </div>
                    <div class="border-t border-slate-800 pt-4">
                        <div class="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">\u573A\u666F\u53D8\u91CF</div>
                        <div id="scenarioVarsInput" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
                    </div>
                    <div class="flex flex-wrap items-center justify-between border-t border-slate-800 pt-4">
                        <div class="text-[11px] text-slate-400 flex items-center gap-2"><span>\u5F53\u524D\u751F\u6548\u63A5\u53E3\u5730\u5740:</span> <span id="baseUrlLabel" class="font-mono text-emerald-400 font-semibold"></span><span id="authLabel" class="font-mono text-amber-400 border-l border-slate-700 pl-2" style="display:none">\u5168\u5C40\u53C2\u6570: <span id="authValue"></span></span></div>
                        <div class="flex flex-wrap items-center justify-end gap-2 mt-2 sm:mt-0">
                            <span id="settingsNotice" role="status" aria-live="polite" class="hidden text-xs font-medium text-emerald-400"></span>
                            <button id="saveSettingsBtn" class="px-4 py-2 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-all shadow-sm active:scale-[0.98]">\u4FDD\u5B58\u5E76\u751F\u6548</button>
                            <button id="clearSettingsBtn" class="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-all active:scale-[0.98]">\u6E05\u9664\u5F53\u524D\u73AF\u5883\u8986\u76D6</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div id="adhocModal" class="hidden fixed inset-0 z-30 bg-slate-950/40 p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="adhocModalTitle">
            <div class="mx-auto my-8 max-w-3xl rounded-xl bg-white shadow-2xl border border-slate-200">
                <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                        <div id="adhocModalTitle" class="text-sm font-bold text-slate-800">\u4E34\u65F6\u8BF7\u6C42\u8C03\u8BD5</div>
                        <div class="mt-0.5 text-[11px] text-slate-400">\u4EC5\u6267\u884C\u5F53\u524D\u7F16\u8F91\u5185\u5BB9\uFF0C\u4E0D\u4FDD\u5B58\u4E5F\u4E0D\u5F71\u54CD\u573A\u666F\u8FDB\u5EA6\u3002</div>
                    </div>
                    <button id="adhocCloseBtn" type="button" class="rounded-lg px-2.5 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">\u5173\u95ED</button>
                </div>
                <div class="space-y-4 p-5">
                    <div id="adhocError" class="hidden rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"></div>
                    <label class="block"><span class="text-xs font-bold text-slate-600">\u8BF7\u6C42\u540D\u79F0</span><input id="adhocNameInput" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-hidden focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all" type="text"></label>
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-[120px_1fr]">
                        <label class="block"><span class="text-xs font-bold text-slate-600">\u65B9\u6CD5</span><select id="adhocMethodInput" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-hidden focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all"><option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option></select></label>
                        <label class="block"><span class="text-xs font-bold text-slate-600">\u8BF7\u6C42\u8DEF\u5F84</span><input id="adhocPathInput" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm outline-hidden focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all" type="text"></label>
                    </div>
                    <div class="block">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-slate-600">\u67E5\u8BE2\u53C2\u6570</span>
                            <button id="adhocAddParamBtn" type="button" class="text-xs font-bold text-emerald-600 hover:text-emerald-700">+ \u6DFB\u52A0\u53C2\u6570</button>
                        </div>
                        <div id="adhocParamsContainer" class="mt-2 space-y-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-2"></div>
                    </div>
                    <label class="block"><span class="text-xs font-bold text-slate-600">\u8BF7\u6C42\u5934 JSON</span><textarea id="adhocHeadersInput" class="mt-1 h-28 w-full rounded-lg border border-slate-200 p-3 font-mono text-xs outline-hidden focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all" spellcheck="false"></textarea></label>
                    <label class="block"><span class="text-xs font-bold text-slate-600">\u8BF7\u6C42\u4F53 JSON</span><textarea id="adhocBodyInput" class="mt-1 h-40 w-full rounded-lg border border-slate-200 p-3 font-mono text-xs outline-hidden focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all" spellcheck="false"></textarea></label>
                    <div class="flex justify-end gap-2"><button id="adhocCancelBtn" type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-[0.98]">\u53D6\u6D88</button><button id="adhocExecuteBtn" type="button" class="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition-all active:scale-[0.98]">\u6267\u884C\u4E00\u6B21</button></div>
                    <div id="adhocResult" class="hidden rounded-lg border border-slate-200 bg-slate-50 p-4"></div>
                </div>
            </div>
        </div>
        <div id="stepLoadingModal" class="scenario-step-loading" role="status" aria-live="assertive" aria-hidden="true">
            <div class="scenario-step-loading__content">
                <span class="scenario-step-loading__spinner" aria-hidden="true"></span>
                <div>
                    <div class="scenario-step-loading__title">\u6B63\u5728\u6267\u884C\u5355\u6B65\u8BF7\u6C42</div>
                    <div id="stepLoadingText" class="scenario-step-loading__text">\u8BF7\u7A0D\u5019\u2026</div>
                </div>
            </div>
        </div>`;
    setupCustomDropdowns();
  }
  function setupCustomDropdowns() {
    var configs = [
      {
        dropdownId: "envDropdown",
        triggerId: "envDropdownTrigger",
        labelId: "envDropdownLabel",
        menuId: "envDropdownMenu",
        selectId: "environmentSelect"
      },
      {
        dropdownId: "themeDropdown",
        triggerId: "themeDropdownTrigger",
        labelId: "themeDropdownLabel",
        menuId: "themeDropdownMenu",
        selectId: "themeSelect"
      }
    ];
    configs.forEach(function(cfg) {
      var dropdown = document.getElementById(cfg.dropdownId);
      var trigger = document.getElementById(cfg.triggerId);
      var label = document.getElementById(cfg.labelId);
      var menu = document.getElementById(cfg.menuId);
      var select = document.getElementById(cfg.selectId);
      if (!dropdown || !trigger || !label || !menu || !select) return;
      function syncFromSelect() {
        var val = select.value;
        var options = Array.from(select.options || []);
        if (!options.length) {
          menu.innerHTML = '<div class="px-3 py-1.5 text-[11px] text-slate-400">\u6682\u65E0\u53EF\u7528\u9879</div>';
          label.textContent = "-";
          return;
        }
        var activeOpt = options.find(function(o) {
          return o.value === val;
        }) || options[0];
        label.textContent = activeOpt ? activeOpt.textContent : "-";
        menu.innerHTML = options.map(function(opt) {
          var isActive = opt.value === val;
          return '<button type="button" role="option" aria-selected="' + (isActive ? "true" : "false") + '" tabindex="-1" class="custom-dropdown__item' + (isActive ? " active" : "") + '" data-value="' + esc(opt.value) + '"><span>' + esc(opt.textContent) + '</span><svg class="custom-dropdown__check' + (isActive ? "" : " hidden") + '" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg></button>';
        }).join("");
      }
      function closeDropdown(restoreFocus) {
        dropdown.classList.remove("open");
        trigger.setAttribute("aria-expanded", "false");
        if (restoreFocus) trigger.focus();
      }
      function openDropdown(focusItem) {
        if (trigger.disabled || trigger.getAttribute("aria-disabled") === "true") return;
        document.querySelectorAll(".custom-dropdown.open").forEach(function(node) {
          node.classList.remove("open");
          var otherTrigger = node.querySelector(".custom-dropdown__trigger");
          if (otherTrigger) otherTrigger.setAttribute("aria-expanded", "false");
        });
        syncFromSelect();
        dropdown.classList.add("open");
        trigger.setAttribute("aria-expanded", "true");
        if (focusItem) {
          var activeItem = menu.querySelector('[aria-selected="true"]') || menu.querySelector(".custom-dropdown__item");
          if (activeItem) activeItem.focus();
        }
      }
      trigger.addEventListener("click", function(e) {
        e.stopPropagation();
        if (dropdown.classList.contains("open")) closeDropdown(false);
        else openDropdown(false);
      });
      trigger.addEventListener("keydown", function(e) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openDropdown(true);
        }
      });
      menu.addEventListener("click", function(e) {
        var item = e.target.closest(".custom-dropdown__item");
        if (!item) return;
        var val = item.dataset.value;
        select.value = val;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        closeDropdown(true);
        syncFromSelect();
      });
      menu.addEventListener("keydown", function(e) {
        var items = Array.from(menu.querySelectorAll(".custom-dropdown__item"));
        var index = items.indexOf(document.activeElement);
        if (e.key === "Escape") {
          e.preventDefault();
          closeDropdown(true);
          return;
        }
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (document.activeElement && document.activeElement.click) document.activeElement.click();
          return;
        }
        if (e.key === "Tab") {
          closeDropdown(false);
          return;
        }
        if (e.key === "Home" || e.key === "End" || e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          if (!items.length) return;
          if (e.key === "Home") index = 0;
          else if (e.key === "End") index = items.length - 1;
          else if (e.key === "ArrowDown") index = (index + 1 + items.length) % items.length;
          else index = (index - 1 + items.length) % items.length;
          items[index].focus();
        }
      });
      select.addEventListener("change", syncFromSelect);
      if (typeof MutationObserver !== "undefined") {
        var observer = new MutationObserver(function() {
          syncFromSelect();
        });
        observer.observe(select, { childList: true, subtree: true, attributes: true });
      }
      syncFromSelect();
    });
    if (!window.__customDropdownGlobalInit) {
      window.__customDropdownGlobalInit = true;
      document.addEventListener("click", function(e) {
        if (!e.target.closest(".custom-dropdown")) {
          document.querySelectorAll(".custom-dropdown.open").forEach(function(d) {
            d.classList.remove("open");
            var trg = d.querySelector(".custom-dropdown__trigger");
            if (trg) trg.setAttribute("aria-expanded", "false");
          });
        }
      });
      document.addEventListener("keydown", function(e) {
        if (e.key !== "Escape") return;
        document.querySelectorAll(".custom-dropdown.open").forEach(function(d) {
          d.classList.remove("open");
          var trg = d.querySelector(".custom-dropdown__trigger");
          if (trg) {
            trg.setAttribute("aria-expanded", "false");
            trg.focus();
          }
        });
      });
    }
  }
  function renderCodeBlockWithLines(id, codeStr, customColorClass) {
    if (!codeStr) return "";
    var lines = String(codeStr).split("\n");
    var gutterHtml = lines.map(function(_, i) {
      return '<span class="code-line-number">' + (i + 1) + "</span>";
    }).join("\n");
    return '<div class="code-editor-block relative bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex font-mono text-[11px] leading-relaxed shadow-inner"><div class="code-gutter py-2 pl-3 pr-2 select-none text-slate-600 bg-slate-950/90 border-r border-slate-800/80 text-right leading-relaxed font-mono">' + gutterHtml + '</div><pre id="' + id + '" class="code-content py-2 px-3 text-slate-300 overflow-x-auto flex-1 font-mono leading-relaxed ' + (customColorClass || "") + '">' + esc(codeStr) + "</pre></div>";
  }
  function fmtVarValue(value) {
    var text;
    if (value === void 0) text = "undefined";
    else if (typeof value === "string") text = value;
    else {
      try {
        text = JSON.stringify(value);
      } catch (e) {
        text = String(value);
      }
    }
    text = String(text);
    if (text.length > 512) text = text.slice(0, 512) + "\u2026\uFF08\u5171 " + text.length + " \u5B57\u7B26\uFF09";
    return text;
  }
  function renderVarsSection(view) {
    if (!view || !view.vars) return "";
    var keys = Object.keys(view.vars);
    if (!keys.length) return "";
    var changed = view.changedKeys || [];
    var rows = keys.map(function(key) {
      var isChanged = changed.indexOf(key) >= 0;
      return '<tr class="' + (isChanged ? "bg-emerald-50/60" : "") + '"><td class="px-3 py-1.5 font-mono text-[11px] text-slate-700 whitespace-nowrap align-top">' + esc(key) + (isChanged ? '<span class="ml-1.5 px-1 py-px rounded bg-emerald-100 text-emerald-700 text-[9.5px] font-bold">\u672C\u6B65\u53D8\u66F4</span>' : "") + '</td><td class="px-3 py-1.5 font-mono text-[11px] text-slate-600 break-all">' + esc(fmtVarValue(view.vars[key])) + "</td></tr>";
    }).join("");
    return '<details class="report-step__response mt-4 pt-3.5 border-t border-slate-200/80"><summary>\u8FD0\u884C\u65F6\u53D8\u91CF \xB7 ' + keys.length + " \u9879" + (changed.length ? "\uFF08\u672C\u6B65\u53D8\u66F4 " + changed.length + "\uFF09" : "") + '</summary><div class="border border-slate-200/80 rounded-md overflow-hidden bg-white shadow-2xs mt-2"><table class="w-full text-left text-xs"><thead class="bg-slate-50 text-[10px] text-slate-500 font-semibold border-b border-slate-200/60 uppercase tracking-wider"><tr><th class="px-3 py-1.5">\u53D8\u91CF\u540D</th><th class="px-3 py-1.5">\u503C\uFF08\u672C\u6B65\u9AA4\u6267\u884C\u540E\uFF09</th></tr></thead><tbody class="divide-y divide-slate-100">' + rows + "</tbody></table></div></details>";
  }
  function extractQueryParams(pathStr, queryObj) {
    var params = [];
    if (queryObj && typeof queryObj === "object") {
      Object.keys(queryObj).forEach(function(k) {
        params.push({ name: k, value: stringify(queryObj[k]) });
      });
    } else if (pathStr && pathStr.indexOf("?") >= 0) {
      var queryPart = pathStr.split("?")[1] || "";
      queryPart.split("&").forEach(function(pair) {
        if (!pair) return;
        var parts = pair.split("=");
        var key = decodeURIComponent(parts[0] || "");
        var val = decodeURIComponent(parts.slice(1).join("=") || "");
        params.push({ name: key, value: val });
      });
    }
    return params;
  }
  function renderScenarioSelect(discoveredFiles, scenarioFile, keyword, pinOrder) {
    var list = document.getElementById("scenarioList");
    if (!list) return;
    pinOrder = pinOrder || {};
    var normalizedKeyword = String(keyword || "").trim().toLowerCase();
    var clearSearchButton = document.getElementById("scenarioSearchClearBtn");
    if (clearSearchButton) clearSearchButton.hidden = !normalizedKeyword;
    var items = (discoveredFiles || []).filter(function(item) {
      var text = ((item.name || "") + " " + (item.file || "")).toLowerCase();
      return !normalizedKeyword || text.indexOf(normalizedKeyword) >= 0;
    }).sort(function(left, right) {
      var leftOrder = Object.prototype.hasOwnProperty.call(pinOrder, left.file) ? pinOrder[left.file] : Number.MAX_SAFE_INTEGER;
      var rightOrder = Object.prototype.hasOwnProperty.call(pinOrder, right.file) ? pinOrder[right.file] : Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    });
    if (!items.length) {
      list.innerHTML = normalizedKeyword ? '<div class="scenario-search-empty" role="status"><span>\u672A\u627E\u5230\u5339\u914D\u573A\u666F</span><button type="button" data-clear-scenario-search>\u6E05\u9664\u641C\u7D22</button></div>' : '<div class="p-3 text-xs text-slate-400 text-center" role="status">\u6682\u65E0\u53EF\u7528\u573A\u666F</div>';
      return;
    }
    list.innerHTML = items.map(function(item) {
      var name = item.name || item.file;
      var active = scenarioFile === item.file;
      var pinned = Object.prototype.hasOwnProperty.call(pinOrder, item.file);
      var classes = active ? "bg-blue-50/80 border-blue-200/90 text-blue-900 shadow-2xs font-semibold" : "bg-white border-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-200/60";
      var pinLabel = pinned ? "\u53D6\u6D88\u7F6E\u9876" : "\u7F6E\u9876";
      return '<div class="flex items-center gap-1 rounded-lg border transition-all ' + classes + '"><button type="button" data-scenario-file="' + esc(item.file) + '" title="' + esc(item.file) + '" class="min-w-0 flex-1 text-left px-2.5 py-2 flex items-center gap-2"><svg class="w-3.5 h-3.5 ' + (active ? "text-blue-500" : "text-slate-400") + ' flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg><div class="min-w-0 flex-1"><div class="text-xs font-semibold truncate leading-snug">' + esc(name) + '</div><div class="mt-0.5 text-[10px] font-mono truncate ' + (active ? "text-blue-500/80" : "text-slate-400") + '">' + esc(item.file) + "</div></div>" + (active ? '<svg class="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>' : "") + '</button><button type="button" data-pin-file="' + esc(item.file) + '" title="' + pinLabel + '" aria-label="' + pinLabel + '" class="scenario-pin-control' + (pinned ? " scenario-pin-control--active" : "") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4V3z" fill="' + (pinned ? "currentColor" : "none") + '" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"></path></svg></button></div>';
    }).join("");
  }
  function renderStatsAll(steps, iterations, scenario, scenarioFile) {
    steps = steps || [];
    var statsPanel = document.getElementById("statsPanel");
    if (!statsPanel) return;
    var scenarioStepsList = scenario && Array.isArray(scenario.steps) ? scenario.steps : [];
    var scenarioTotal = scenarioStepsList.length || steps.length || 0;
    var executedCount = steps.length;
    var skipped = steps.filter(function(s) {
      return s.skipped;
    }).length;
    var cancelledCount = steps.filter(function(s) {
      return s.cancelled;
    }).length;
    var executed = executedCount - skipped;
    var passed = steps.filter(function(s) {
      return !s.skipped && !s.cancelled && s.passed;
    }).length;
    var failed = steps.filter(function(s) {
      return !s.skipped && !s.cancelled && !s.passed;
    }).length;
    var passRate = executed ? (passed / executed * 100).toFixed(1) : "0.0";
    var failRate = executed ? (failed / executed * 100).toFixed(1) : "0.0";
    var progressPct = scenarioTotal ? (executedCount / scenarioTotal * 100).toFixed(1) : "0.0";
    var totalMs = steps.reduce(function(a, s) {
      return a + (s.duration || 0);
    }, 0);
    var avgMs = executed ? totalMs / executed : 0;
    var assertTotal = steps.reduce(function(a, s) {
      return a + (s.assertions ? s.assertions.length : 0);
    }, 0);
    var assertPassed = steps.reduce(function(a, s) {
      return a + (s.assertions ? s.assertions.filter(function(x) {
        return x.passed;
      }).length : 0);
    }, 0);
    var title = scenario && (scenario.name || scenario.id) || (scenarioFile ? scenarioFile.split("/").pop().replace(/\.js$/, "") : "\u672A\u52A0\u8F7D\u573A\u666F");
    var filePath = scenarioFile || "";
    var isDone = scenarioTotal > 0 && executedCount >= scenarioTotal;
    var statusBadge = "";
    if (executedCount === 0) {
      statusBadge = '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200/60">\u5F85\u6267\u884C</span>';
    } else if (cancelledCount > 0) {
      statusBadge = '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-600 border border-amber-200">\u5DF2\u53D6\u6D88</span>';
    } else if (failed > 0) {
      statusBadge = '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200">' + (isDone ? "\u5B58\u5728\u5931\u8D25" : "\u6267\u884C\u4E2D (" + executedCount + "/" + scenarioTotal + ")") + "</span>";
    } else if (isDone) {
      statusBadge = '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">\u5DF2\u5B8C\u6210</span>';
    } else {
      statusBadge = '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-200">\u6267\u884C\u4E2D (' + executedCount + "/" + scenarioTotal + ")</span>";
    }
    var midTitle = document.getElementById("scenarioMainTitle");
    var midBadge = document.getElementById("scenarioStatusBadge");
    var midPath = document.getElementById("scenarioFilePath");
    if (midTitle) midTitle.textContent = title;
    if (midBadge) midBadge.innerHTML = statusBadge;
    if (midPath) midPath.textContent = filePath;
    var segmentsHtml = "";
    if (scenarioTotal > 0 && scenarioTotal <= 24) {
      for (var idx = 0; idx < scenarioTotal; idx++) {
        var stepResult = steps && steps[idx];
        var isStepCancelled = stepResult && stepResult.cancelled;
        var isPassed = stepResult && !stepResult.skipped && !stepResult.cancelled && stepResult.passed;
        var isFailed = stepResult && !stepResult.skipped && !stepResult.cancelled && !stepResult.passed;
        var isSkipped = stepResult && stepResult.skipped;
        var segClass = isPassed ? "bg-emerald-500 shadow-2xs" : isFailed ? "bg-rose-500 shadow-2xs" : isStepCancelled ? "bg-amber-400 shadow-2xs" : isSkipped ? "bg-slate-300" : "bg-slate-200/80 border border-slate-300/60";
        segmentsHtml += '<div class="flex-1 h-2 rounded-full ' + segClass + ' transition-all duration-300" title="\u6B65\u9AA4 ' + (idx + 1) + (isPassed ? ": \u6210\u529F" : isFailed ? ": \u5931\u8D25" : isStepCancelled ? ": \u5DF2\u53D6\u6D88" : isSkipped ? ": \u8DF3\u8FC7" : ": \u5F85\u6267\u884C") + '"></div>';
      }
    }
    if (!executedCount) {
      var pendingHint = scenarioTotal > 0 ? '<div class="p-3 rounded-lg border border-dashed border-slate-300/80 bg-white text-center space-y-1.5"><div class="text-xs font-bold text-slate-600">\u5C1A\u672A\u6267\u884C</div><div class="text-[11px] text-slate-400 leading-relaxed">\u70B9\u51FB\u9876\u90E8\u300C\u6267\u884C\u5168\u90E8\u300D\u8FD0\u884C\u6574\u4E2A\u573A\u666F\uFF0C\u6216\u7528\u300C\u4E0B\u4E00\u6B65\u300D\u9010\u6761\u6267\u884C\uFF1B\u6267\u884C\u540E\u8FD9\u91CC\u5C55\u793A\u901A\u8FC7\u7387\u4E0E\u8017\u65F6\u7EDF\u8BA1\u3002</div></div>' : '<div class="text-xs text-slate-400 text-center py-4">\u573A\u666F\u672A\u52A0\u8F7D\u6216\u672A\u6267\u884C</div>';
      statsPanel.innerHTML = '<div class="space-y-3">' + (scenarioTotal > 0 ? '<div class="p-3 rounded-lg border border-slate-200/80 bg-slate-50/60 space-y-2"><div class="flex items-center justify-between"><span class="text-xs font-bold text-slate-700">\u603B\u6B65\u9AA4\u8FDB\u5EA6</span><span class="text-xs font-mono font-bold text-slate-900">0 / ' + scenarioTotal + ' <span class="text-slate-400 font-semibold font-sans">(0.0%)</span></span></div><div class="flex items-center gap-1 w-full">' + segmentsHtml + "</div></div>" : "") + pendingHint + "</div>";
      return;
    }
    statsPanel.innerHTML = '<div class="space-y-3"><!-- \u8FDB\u5EA6\u5361\u7247 --><div class="p-3 rounded-lg border border-slate-200/80 bg-slate-50/60 space-y-2"><div class="flex items-center justify-between"><span class="text-xs font-bold text-slate-700">\u603B\u6B65\u9AA4\u8FDB\u5EA6</span><span class="text-xs font-mono font-bold text-slate-900">' + executedCount + " / " + scenarioTotal + ' <span class="text-emerald-600 font-semibold font-sans">(' + progressPct + '%)</span></span></div><div class="flex items-center gap-1 w-full">' + segmentsHtml + '</div></div><!-- \u6838\u5FC3\u6307\u6807\u7F51\u683C --><div class="grid grid-cols-2 gap-2"><div class="p-2.5 rounded-lg border border-slate-200/70 bg-white"><div class="text-[10px] font-semibold text-slate-400">\u6210\u529F\u6B65\u9AA4</div><div class="text-base font-bold text-emerald-600 font-mono mt-0.5">' + passed + (executed ? ' <span class="text-[10px] text-emerald-600/70 font-normal">(' + passRate + "%)</span>" : "") + '</div></div><div class="p-2.5 rounded-lg border border-slate-200/70 bg-white"><div class="text-[10px] font-semibold text-slate-400">\u5931\u8D25\u6B65\u9AA4</div><div class="text-base font-bold ' + (failed ? "text-rose-600" : "text-slate-700") + ' font-mono mt-0.5">' + failed + (executed && failed ? ' <span class="text-[10px] text-rose-600/70 font-normal">(' + failRate + "%)</span>" : "") + '</div></div><div class="p-2.5 rounded-lg border border-slate-200/70 bg-white"><div class="text-[10px] font-semibold text-slate-400">\u65AD\u8A00\u901A\u8FC7</div><div class="text-base font-bold text-slate-800 font-mono mt-0.5">' + assertPassed + ' <span class="text-xs font-normal text-slate-400">/ ' + assertTotal + '</span></div></div><div class="p-2.5 rounded-lg border border-slate-200/70 bg-white"><div class="text-[10px] font-semibold text-slate-400">\u8DF3\u8FC7\u6B65\u9AA4</div><div class="text-base font-bold text-slate-600 font-mono mt-0.5">' + skipped + '</div></div><div class="p-2.5 rounded-lg border border-slate-200/70 bg-white"><div class="text-[10px] font-semibold text-slate-400">\u603B\u8017\u65F6</div><div class="text-sm font-bold text-slate-900 font-mono mt-0.5">' + totalMs.toFixed(2) + ' <span class="text-[10px] font-normal text-slate-400">ms</span></div></div><div class="p-2.5 rounded-lg border border-slate-200/70 bg-white"><div class="text-[10px] font-semibold text-slate-400">\u5E73\u5747\u8017\u65F6</div><div class="text-sm font-bold text-slate-900 font-mono mt-0.5">' + avgMs.toFixed(2) + ' <span class="text-[10px] font-normal text-slate-400">ms</span></div></div></div><!-- \u64CD\u4F5C\u6309\u94AE\u5361\u7247 --><div class="space-y-2 pt-1"><button id="copyReportMarkdownBtn" type="button" class="w-full stats-action-btn stats-action-btn--primary justify-center py-2 text-xs" ' + (executedCount ? "" : "disabled") + ' title="\u590D\u5236\u683C\u5F0F\u5316 Markdown \u62A5\u544A (\u53EF\u76F4\u63A5\u6295\u5582\u7ED9 AI \u63D0\u95EE/\u6392\u67E5)"><svg class="w-3.5 h-3.5 text-indigo-500 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg><span>\u590D\u5236\u4E3A Markdown</span></button><button id="copyReportJsonBtn" type="button" class="w-full stats-action-btn justify-center py-2 text-xs" ' + (executedCount ? "" : "disabled") + ' title="\u5BFC\u51FA\u6267\u884C\u7ED3\u679C JSON"><svg class="w-3.5 h-3.5 text-slate-500 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg><span>\u5BFC\u51FA JSON</span></button></div></div>';
  }
  function renderFilterAll(steps, scenarioSteps) {
    steps = steps || [];
    scenarioSteps = scenarioSteps || [];
    var filterBar = document.getElementById("filterBar");
    if (!filterBar) return;
    if (!steps.length && !scenarioSteps.length) {
      filterBar.innerHTML = '<div class="text-xs text-slate-400 py-1">\u672A\u52A0\u8F7D\u573A\u666F</div>';
      var stepsList = document.getElementById("stepsList");
      var emptyState = document.getElementById("stepsFilterEmpty");
      if (stepsList) stepsList.style.display = "";
      if (emptyState) {
        emptyState.style.display = "none";
        emptyState.innerHTML = "";
      }
      return;
    }
    var filterState = window.__R && window.__R.getFilterState ? window.__R.getFilterState() : { type: "all", keyword: "" };
    var total = scenarioSteps.length || steps.length;
    var skipped = steps.filter(function(s) {
      return s.skipped;
    }).length;
    var passed = steps.filter(function(s) {
      return !s.skipped && s.passed;
    }).length;
    var failed = steps.filter(function(s) {
      return !s.skipped && !s.passed;
    }).length;
    var curType = filterState.type || "all";
    var curKw = filterState.keyword || "";
    function btnCls(type) {
      return curType === type ? "filter-btn px-2.5 py-1 text-xs font-bold text-slate-900 bg-white rounded-md shadow-2xs transition-all" : "filter-btn px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white/60 rounded-md transition-all";
    }
    function filterButton(type, label, count) {
      return '<button type="button" data-f="' + type + '" aria-pressed="' + (curType === type ? "true" : "false") + `" onclick="window.__R.filter('` + type + `')" class="` + btnCls(type) + '">' + label + " (" + count + ")</button>";
    }
    filterBar.innerHTML = `
            <div class="step-filter-options" role="group" aria-label="\u6309\u6267\u884C\u7ED3\u679C\u7B5B\u9009\u6B65\u9AA4">
                ${filterButton("all", "\u5168\u90E8", total)}
                ${filterButton("pass", "\u6210\u529F", passed)}
                ${filterButton("fail", "\u5931\u8D25", failed)}
                ${skipped ? filterButton("skip", "\u8DF3\u8FC7", skipped) : ""}
            </div>
            <div class="step-filter-tools">
                <span id="stepFilterSummary" class="step-filter-summary" aria-live="off"></span>
                <input id="stepSearchInput" type="search" value="${esc(curKw)}" aria-label="\u641C\u7D22\u6B65\u9AA4\u540D\u79F0\u3001\u8BF7\u6C42\u65B9\u6CD5\u6216\u8DEF\u5F84" placeholder="\u641C\u7D22\u6B65\u9AA4/\u8DEF\u5F84..." oninput="window.__R.search(this.value)" class="px-2.5 py-1 rounded-md border border-slate-200 text-xs bg-white focus:outline-hidden focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-all w-40">
                <button id="resetStepFiltersBtn" type="button" class="step-filter-reset" onclick="window.__R.resetFilters()" ${curType === "all" && !curKw ? "hidden" : ""}>\u6E05\u9664\u7B5B\u9009</button>
            </div>
        `;
    if (window.__R && window.__R.applyFilter) {
      window.__R.applyFilter();
    }
  }
  function renderPendingSteps(scenarioSteps, startIndex) {
    if (!Array.isArray(scenarioSteps) || startIndex >= scenarioSteps.length) return "";
    return scenarioSteps.slice(startIndex).map(function(step, idx) {
      var stepIndex = startIndex + idx;
      var seqNum = stepIndex + 1;
      var method = String(step.method || "GET").toUpperCase();
      var stepPath = step.path || "";
      var methodColor = { GET: "text-emerald-600 bg-emerald-50 border-emerald-200/80", POST: "text-amber-600 bg-amber-50 border-amber-200/80", PUT: "text-yellow-600 bg-yellow-50 border-yellow-200/80", DELETE: "text-rose-600 bg-rose-50 border-rose-200/80", PATCH: "text-indigo-600 bg-indigo-50 border-indigo-200/80" }[method] || "text-slate-600 bg-slate-50 border-slate-200";
      var assertCount = Array.isArray(step.assertions) ? step.assertions.length : 0;
      var extractCount = Array.isArray(step.extract) ? step.extract.length : 0;
      var tags = "";
      if (assertCount) tags += '<span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/80 text-[10px] font-semibold"> ' + assertCount + " \u65AD\u8A00</span>";
      if (extractCount) tags += '<span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/80 text-[10px] font-semibold ml-1">' + extractCount + " \u63D0\u53D6</span>";
      var reqHeaders = step.headers ? truncateForDisplay(typeof step.headers === "string" ? step.headers : JSON.stringify(step.headers, null, 2)) : "";
      var reqBody = step.request && step.request.body ? truncateForDisplay(typeof step.request.body === "string" ? step.request.body : JSON.stringify(step.request.body, null, 2)) : step.body ? truncateForDisplay(typeof step.body === "string" ? step.body : JSON.stringify(step.body, null, 2)) : "";
      var queryParams = extractQueryParams(stepPath, step.query);
      return '<li class="hover:bg-slate-50/70 group transition-all duration-150 border-b border-slate-100 bg-white" data-passed="pending" data-step-idx="' + stepIndex + '" data-search="' + esc(((step.name || "") + " " + method + " " + stepPath).toLowerCase()) + '"><div class="px-4 py-2.5 flex items-center justify-between cursor-pointer select-none" role="button" tabindex="0" aria-expanded="false" onclick="window.__R.toggle(this, event)" onkeydown="window.__R.toggleKey(this, event)"><div class="flex items-center space-x-2.5 min-w-0 flex-1 pr-3"><div class="flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 text-[10.5px] font-bold bg-slate-100 border border-slate-200 text-slate-500 font-mono">' + seqNum + '</div><span class="text-xs text-slate-700 font-medium truncate group-hover:text-slate-900" title="' + esc(step.name || "") + '">' + esc(step.name || "\u672A\u547D\u540D\u6B65\u9AA4") + '</span><span class="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border uppercase ' + methodColor + '">' + method + '</span><span class="text-xs text-slate-400 font-mono truncate max-w-[40%]" title="' + esc(stepPath) + '">' + esc(stepPath) + '</span></div><div class="flex items-center space-x-1.5 flex-shrink-0">' + tags + '<button type="button" data-copy-step="' + stepIndex + '" class="step-row-action rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10.5px] font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-all active:scale-[0.96]" title="\u590D\u5236\u6B65\u9AA4\u6807\u9898\u4E0E\u63A5\u53E3\u8DEF\u5F84">\u590D\u5236</button><button type="button" data-curl-step="' + stepIndex + '" class="step-row-action rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10.5px] font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-all active:scale-[0.96]" title="\u590D\u5236\u4E3A cURL \u547D\u4EE4\u884C">cURL</button><button type="button" data-adhoc-step="' + stepIndex + '" class="step-row-action rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10.5px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-[0.96]">\u8C03\u8BD5</button><span class="text-[10.5px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/50">\u5F85\u6267\u884C</span><svg class="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></div></div><div class="details-panel px-4 py-3 bg-slate-50/70 border-t border-slate-200/60 text-[13px]"><div class="space-y-3">' + (reqHeaders ? '<div><div class="text-slate-500 text-[10.5px] font-bold uppercase tracking-wider mb-1">\u8BF7\u6C42\u5934 (Headers)</div>' + renderCodeBlockWithLines("pending-req-headers-" + stepIndex, reqHeaders) + "</div>" : "") + (reqBody ? '<div><div class="text-slate-500 text-[10.5px] font-bold uppercase tracking-wider mb-1">\u8BF7\u6C42\u4F53 (Body)</div>' + renderCodeBlockWithLines("pending-req-body-" + stepIndex, reqBody) + "</div>" : '<div class="text-xs text-slate-400 py-1">\u65E0\u8BF7\u6C42\u4F53\u53C2\u6570</div>') + "</div></div></li>";
    }).join("");
  }
  function renderStepItem(s, i, executionMode, varsView) {
    var ok = s.passed;
    var skipped = s.skipped;
    var seqNum = i + 1;
    var seqIcon = skipped ? '<div class="flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 text-[10.5px] font-bold bg-slate-400 text-white font-mono">' + seqNum + "</div>" : ok ? '<div class="flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 bg-emerald-500 text-white shadow-2xs"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg></div>' : '<div class="flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 bg-rose-500 text-white shadow-2xs"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path></svg></div>';
    var nameCls = ok ? "text-slate-800 font-medium" : "text-slate-900 font-bold";
    var statusBadgeCls = ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : skipped ? "bg-slate-100 text-slate-600 border border-slate-200" : "bg-rose-50 text-rose-700 border border-rose-200";
    var method = String(s.method || "GET").toUpperCase();
    var methodColor = { GET: "text-emerald-600 bg-emerald-50 border-emerald-200/80", POST: "text-amber-600 bg-amber-50 border-amber-200/80", PUT: "text-yellow-600 bg-yellow-50 border-yellow-200/80", DELETE: "text-rose-600 bg-rose-50 border-rose-200/80", PATCH: "text-indigo-600 bg-indigo-50 border-indigo-200/80" }[method] || "text-slate-600 bg-slate-50 border-slate-200";
    var reqHeaders = s.request && s.request.headers ? truncateForDisplay(typeof s.request.headers === "string" ? s.request.headers : JSON.stringify(s.request.headers, null, 2)) : "";
    var reqBody = s.request && s.request.body ? truncateForDisplay(typeof s.request.body === "string" ? s.request.body : JSON.stringify(s.request.body, null, 2)) : "";
    var resHeaders = s.response && s.response.headers ? truncateForDisplay(typeof s.response.headers === "string" ? s.response.headers : JSON.stringify(s.response.headers, null, 2)) : "";
    var resBody = s.response && s.response.body ? truncateForDisplay(typeof s.response.body === "string" ? s.response.body : JSON.stringify(s.response.body, null, 2)) : "";
    var queryParams = extractQueryParams(s.path, s.request && s.request.query);
    var errorHtml = "";
    if (!ok && s.error) {
      var isNetworkErr = /Failed to fetch|NetworkError|ECONNREFUSED|ENOTFOUND/i.test(s.error);
      if (isNetworkErr) {
        errorHtml = '<div class="mb-3 p-2.5 bg-rose-50 rounded-lg border border-rose-200 flex items-start space-x-2.5"><svg class="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg><div class="text-xs text-rose-800"><div class="font-bold">\u7F51\u7EDC\u8FDE\u63A5\u5931\u8D25 (Failed to fetch)</div><div class="text-rose-600 mt-0.5">\u76EE\u6807\u670D\u52A1\u672A\u54CD\u5E94\u3002\u8BF7\u68C0\u67E5\u672C\u5730\u63A5\u53E3\u670D\u52A1\uFF08\u5982 ' + esc(s.path) + "\uFF09\u662F\u5426\u5DF2\u542F\u52A8\uFF0C\u6216\u70B9\u51FB\u53F3\u4E0A\u89D2\u300C\u914D\u7F6E\u300D\u8C03\u6574\u5730\u5740\u3002</div></div></div>";
      } else {
        errorHtml = '<div class="mb-3 p-2.5 bg-rose-50 rounded-lg border border-rose-200 flex items-center space-x-2"><svg class="w-4 h-4 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><span class="text-rose-800 font-bold text-xs">\u6267\u884C\u9519\u8BEF:</span><span class="text-rose-600 text-xs font-mono break-all">' + esc(s.error) + "</span></div>";
      }
    }
    var assertHtml = "";
    if (s.assertions && s.assertions.length) {
      var failedCount = s.assertions.filter(function(a) {
        return !a.passed;
      }).length;
      var passedCount = s.assertions.length - failedCount;
      var assertRows = s.assertions.map(function(a) {
        var rowOk = a.passed;
        var rowCls = rowOk ? "hover:bg-slate-50/60" : "bg-rose-50/80 border-rose-100 text-rose-900";
        var resLabel = rowOk ? '<span class="text-emerald-600 font-bold flex items-center gap-1"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg> \u901A\u8FC7</span>' : '<span class="text-rose-600 font-bold flex items-center gap-1"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg> \u5931\u8D25</span>';
        var detailRows = !rowOk && Array.isArray(a.detail) ? eachDetailRows2(a.detail, "") : "";
        var reasonRow = !rowOk && a.reason ? '<tr class="bg-rose-50/60"><td class="px-3.5 py-1.5"></td><td colspan="3" class="px-3.5 py-1.5 text-[11px] text-rose-700 break-all">\u539F\u56E0: ' + esc(a.reason) + "</td></tr>" : "";
        return '<tr class="' + rowCls + ' transition-colors"><td class="px-3.5 py-2 font-medium ' + (rowOk ? "text-slate-700" : "text-rose-800 font-bold") + '">' + esc(a.name) + '</td><td class="px-3.5 py-2 font-mono text-[11px] ' + (rowOk ? "text-slate-600" : "text-rose-700") + '">' + esc(stringify(a.expected)) + '</td><td class="px-3.5 py-2 font-mono text-[11px] ' + (rowOk ? "text-slate-600" : "text-rose-900 font-bold") + '">' + esc(stringify(a.actual)) + '</td><td class="px-3.5 py-2 text-xs">' + resLabel + "</td></tr>" + reasonRow + detailRows;
      }).join("");
      assertHtml = '<div class="mt-4 pt-3.5 border-t border-slate-200/80"><div class="flex items-center gap-2 mb-2"><span class="text-xs font-bold text-slate-800">\u65AD\u8A00 (Assertions)</span><span class="text-xs font-mono font-bold ' + (failedCount ? "text-rose-600" : "text-emerald-600") + '">' + passedCount + " / " + s.assertions.length + '</span></div><div class="border border-slate-200/80 rounded-lg overflow-hidden bg-white shadow-2xs"><table class="w-full text-left text-xs"><thead class="bg-slate-50 text-[10.5px] text-slate-500 font-semibold border-b border-slate-200/70 uppercase tracking-wider"><tr><th class="px-3.5 py-2">\u65AD\u8A00\u9879</th><th class="px-3.5 py-2">\u9884\u671F\u503C (EXPECTED)</th><th class="px-3.5 py-2">\u5B9E\u9645\u503C (ACTUAL)</th><th class="px-3.5 py-2 w-24">\u7ED3\u679C</th></tr></thead><tbody class="divide-y divide-slate-100">' + assertRows + "</tbody></table></div></div>";
    }
    var queryHtml = "";
    if (queryParams && queryParams.length) {
      var qRows = queryParams.map(function(p) {
        return '<tr><td class="px-3 py-1.5 text-slate-600 font-mono">' + esc(p.name) + '</td><td class="px-3 py-1.5 text-slate-900 font-mono font-medium">' + esc(p.value) + "</td></tr>";
      }).join("");
      queryHtml = '<div class="mt-3"><div class="text-slate-500 text-[10.5px] font-bold uppercase tracking-wider mb-1.5">\u67E5\u8BE2\u53C2\u6570 (Query)</div><div class="border border-slate-200/80 rounded-md overflow-hidden bg-white shadow-2xs"><table class="w-full text-left text-xs"><thead class="bg-slate-50 text-[10px] text-slate-500 font-semibold border-b border-slate-200/60 uppercase tracking-wider"><tr><th class="px-3 py-1.5">\u53C2\u6570\u540D</th><th class="px-3 py-1.5">\u53C2\u6570\u503C</th></tr></thead><tbody class="divide-y divide-slate-100 font-mono text-[11px]">' + qRows + "</tbody></table></div></div>";
    }
    var leftColumn = '<div class="space-y-3"><div class="flex items-center justify-between"><div class="text-xs font-bold text-slate-800">\u8BF7\u6C42 (Request)</div><button type="button" class="code-copy-btn inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 bg-white text-[10.5px] text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all" data-code-copy="step-' + i + '-req-all" title="\u590D\u5236\u5B8C\u6574\u8BF7\u6C42\u53C2\u6570"><svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg><span>\u590D\u5236</span></button></div><div class="font-mono text-xs text-slate-800 break-all bg-white p-2.5 rounded-lg border border-slate-200/80 flex items-center gap-2"><span class="font-bold ' + methodColor + ' px-1.5 py-0.5 rounded text-[10px] uppercase">' + method + '</span><span class="text-slate-700 font-medium">' + esc(s.path) + "</span></div>" + (reqHeaders ? '<div><div class="text-slate-500 text-[10.5px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between"><span>\u8BF7\u6C42\u5934 (Headers)</span><button type="button" class="code-copy-btn text-[10px] text-slate-400 hover:text-slate-600" data-code-copy="step-' + i + '-req-headers">\u590D\u5236</button></div>' + renderCodeBlockWithLines("step-" + i + "-req-headers", reqHeaders) + "</div>" : "") + queryHtml + (reqBody ? '<div><div class="text-slate-500 text-[10.5px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between"><span>\u8BF7\u6C42\u4F53 (Body)</span><button type="button" class="code-copy-btn text-[10px] text-slate-400 hover:text-slate-600" data-code-copy="step-' + i + '-req-body">\u590D\u5236</button></div>' + renderCodeBlockWithLines("step-" + i + "-req-body", reqBody) + "</div>" : "") + '<pre id="step-' + i + '-req-all" class="sr-only">' + esc(method + " " + s.path + (reqHeaders ? "\n\nHeaders:\n" + reqHeaders : "") + (reqBody ? "\n\nBody:\n" + reqBody : "")) + "</pre></div>";
    var rightColumn = '<div class="space-y-3"><div class="flex items-center justify-between"><div class="text-xs font-bold text-slate-800">\u54CD\u5E94 (Response)</div><button type="button" class="code-copy-btn inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 bg-white text-[10.5px] text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all" data-code-copy="step-' + i + '-res-all" title="\u590D\u5236\u5B8C\u6574\u54CD\u5E94\u53C2\u6570"><svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg><span>\u590D\u5236</span></button></div><div class="font-mono text-xs flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200/80"><div class="flex items-center gap-2"><span class="font-bold text-emerald-600">' + esc(String(s.status || 200)) + ' OK</span><span class="text-slate-400 text-[11px]">' + fmt(s.duration) + "</span></div></div>" + (resHeaders ? '<div><div class="text-slate-500 text-[10.5px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between"><span>\u54CD\u5E94\u5934 (Headers)</span><button type="button" class="code-copy-btn text-[10px] text-slate-400 hover:text-slate-600" data-code-copy="step-' + i + '-res-headers">\u590D\u5236</button></div>' + renderCodeBlockWithLines("step-" + i + "-res-headers", resHeaders) + "</div>" : "") + (resBody ? '<div><div class="text-slate-500 text-[10.5px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between"><span>\u54CD\u5E94\u4F53 (Body)</span><button type="button" class="code-copy-btn text-[10px] text-slate-400 hover:text-slate-600" data-code-copy="step-' + i + '-res-body">\u590D\u5236</button></div>' + renderCodeBlockWithLines("step-" + i + "-res-body", resBody) + "</div>" : "") + '<pre id="step-' + i + '-res-all" class="sr-only">' + esc("Status: " + (s.status || 200) + " (" + fmt(s.duration) + ")" + (resHeaders ? "\n\nHeaders:\n" + resHeaders : "") + (resBody ? "\n\nBody:\n" + resBody : "")) + "</pre></div>";
    var detailPanelCls = ok ? "details-panel px-4 py-3 bg-slate-50/50 border-t border-slate-100 text-[13px]" : "details-panel open px-4 py-3 bg-slate-50/50 border-t border-rose-100 text-[13px]";
    var chevronCls = ok ? "" : " rotate-180";
    var stepActions = executionMode === "step" ? '<span class="step-run-actions"><button type="button" data-step-action="rewind" data-step-index="' + i + '" title="\u4EC5\u56DE\u9000\u6D4B\u8BD5\u8FD0\u884C\u65F6\u4E0E\u62A5\u544A\uFF0C\u4E0D\u64A4\u9500\u5DF2\u53D1\u51FA\u7684\u4E1A\u52A1\u8BF7\u6C42">\u56DE\u9000</button><button type="button" data-step-action="rerun" data-step-index="' + i + '" title="\u4ECE\u672C\u6B65\u9AA4\u6267\u884C\u524D\u7684\u53D8\u91CF\u5FEB\u7167\u91CD\u65B0\u6267\u884C">\u91CD\u8DD1</button></span>' : "";
    return '<li class="group transition-colors border-b border-slate-100 bg-white" data-passed="' + ok + '" data-skipped="' + skipped + '" data-step-idx="' + i + '" data-search="' + esc((s.name + " " + s.method + " " + s.path).toLowerCase()) + '"><div class="px-4 py-2.5 flex items-center justify-between cursor-pointer select-none hover:bg-slate-50/80 transition-colors" role="button" tabindex="0" aria-expanded="' + (!ok ? "true" : "false") + '" onclick="window.__R.toggle(this, event)" onkeydown="window.__R.toggleKey(this, event)"><div class="flex items-center space-x-2.5 min-w-0 flex-1 pr-3">' + seqIcon + '<span class="text-xs font-bold ' + nameCls + ' truncate" title="' + esc(s.name) + '">' + esc(s.name) + '</span><span class="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border uppercase ' + methodColor + '">' + method + '</span><span class="text-xs text-slate-500 font-mono truncate max-w-[40%]" title="' + esc(s.path) + '">' + esc(s.path) + '</span></div><div class="flex items-center space-x-2 flex-shrink-0"><button type="button" data-copy-step="' + i + '" class="step-row-action rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10.5px] font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-all active:scale-[0.96]" title="\u590D\u5236\u6B65\u9AA4\u6807\u9898\u4E0E\u63A5\u53E3\u8DEF\u5F84">\u590D\u5236</button><button type="button" data-curl-step="' + i + '" class="step-row-action rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10.5px] font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-all active:scale-[0.96]" title="\u590D\u5236\u4E3A cURL \u547D\u4EE4\u884C">cURL</button><button type="button" data-adhoc-step="' + i + '" class="step-row-action rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10.5px] font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-all active:scale-[0.96]">\u8C03\u8BD5</button>' + stepActions + '<span class="text-[10.5px] font-bold font-mono px-2 py-0.5 rounded-md ' + statusBadgeCls + '">' + esc(String(s.status || "-")) + '</span><span class="text-slate-400 text-xs font-mono w-16 text-right">' + fmt(s.duration) + '</span><svg class="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 chevron' + chevronCls + '" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></div></div><div class="' + detailPanelCls + '">' + errorHtml + '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">' + leftColumn + rightColumn + "</div>" + assertHtml + renderVarsSection(varsView) + "</div></li>";
  }
  function renderStepsAll(steps, scenarioSteps, executionMode, varsViews) {
    var ul = document.getElementById("stepsList");
    if (!ul) return;
    steps = steps || [];
    scenarioSteps = scenarioSteps || [];
    if (!steps.length && !scenarioSteps.length) {
      ul.innerHTML = '<li class="p-8 text-center text-slate-400 text-xs">\u70B9\u51FB\u300C\u6267\u884C\u5168\u90E8\u300D\u5F00\u59CB\u53D1\u8D77\u8BF7\u6C42</li>';
      return;
    }
    varsViews = varsViews || [];
    ul.innerHTML = steps.map(function(s, i) {
      return renderStepItem(s, i, executionMode, varsViews[i]);
    }).join("") + renderPendingSteps(scenarioSteps, steps.length);
    if (window.__R && window.__R.applyFilter) {
      window.__R.applyFilter();
    }
  }
  function appendStepResult(result, index, scenarioSteps, executionMode, varsView) {
    var ul = document.getElementById("stepsList");
    if (!ul) return;
    ul.querySelectorAll('li[data-passed="pending"]').forEach(function(node) {
      node.remove();
    });
    var template = document.createElement("template");
    template.innerHTML = renderStepItem(result, index, executionMode, varsView) + renderPendingSteps(scenarioSteps, index + 1);
    ul.appendChild(template.content);
    if (window.__R && window.__R.applyFilter) {
      window.__R.applyFilter();
    }
  }
  function buildOverallReport(steps, scenario, scenarioFile, executionMode, environment) {
    steps = steps || [];
    var total = steps.length;
    var skipped = steps.filter(function(item) {
      return item.skipped;
    }).length;
    var cancelledCount = steps.filter(function(item) {
      return item.cancelled;
    }).length;
    var executed = total - skipped;
    var passed = steps.filter(function(item) {
      return !item.skipped && !item.cancelled && item.passed;
    }).length;
    var failed = steps.filter(function(item) {
      return !item.skipped && !item.cancelled && !item.passed;
    }).length;
    var duration = steps.reduce(function(sum, item) {
      return sum + (item.duration || 0);
    }, 0);
    var cancelled = cancelledCount > 0;
    var status = cancelled ? "CANCELLED" : failed > 0 ? "FAILED" : executed === 0 ? "SKIPPED" : "PASSED";
    return {
      title: scenario && scenario.name || scenarioFile || "\u6D4B\u8BD5\u62A5\u544A",
      scenarioFile: scenarioFile || "",
      executionMode: executionMode || "full",
      environment: environment ? environment.name || environment.key : "\u9ED8\u8BA4",
      status,
      summary: {
        totalSteps: scenario && scenario.steps && scenario.steps.length || total,
        plannedSteps: scenario && scenario.steps && scenario.steps.length || total,
        executedSteps: executed,
        passedSteps: passed,
        failedSteps: failed,
        skippedSteps: skipped,
        cancelledSteps: cancelledCount,
        passRate: executed ? (passed / executed * 100).toFixed(1) + "%" : "0.0%",
        totalDurationMs: duration,
        totalDurationFmt: fmt(duration)
      },
      steps: steps.map(function(item, index) {
        return {
          stepNo: item.stepNo || index + 1,
          name: item.name,
          method: item.method,
          path: item.path,
          status: item.status,
          passed: item.passed,
          skipped: Boolean(item.skipped),
          durationMs: item.duration,
          durationFmt: fmt(item.duration),
          error: item.error || "",
          warnings: item.warnings || [],
          request: item.request,
          response: item.response,
          assertions: item.assertions || []
        };
      })
    };
  }
  function buildMarkdownReport2(report) {
    if (!report) return "";
    var summary = report.summary || {};
    var lines = [];
    lines.push("# " + mdInline(report.title || "\u6D4B\u8BD5\u62A5\u544A"));
    lines.push("");
    lines.push("- **\u573A\u666F\u6587\u4EF6**: " + mdCode(report.scenarioFile || "-"));
    lines.push("- **\u6D4B\u8BD5\u73AF\u5883**: " + mdInline(report.environment || "-"));
    lines.push("- **\u6267\u884C\u6A21\u5F0F**: " + mdInline(report.executionMode || "-"));
    var resultText = report.status === "CANCELLED" ? "\u{1F6AB} \u5DF2\u53D6\u6D88" : summary.failedSteps ? "\u274C \u5B58\u5728\u5931\u8D25" : summary.skippedSteps && summary.executedSteps === 0 ? "\u23ED\uFE0F \u5168\u90E8\u8DF3\u8FC7" : "\u2705 \u5168\u90E8\u901A\u8FC7";
    lines.push("- **\u7ED3\u679C**: " + resultText + " (" + summary.passedSteps + "/" + summary.executedSteps + ")");
    lines.push("- **\u901A\u8FC7\u7387**: " + summary.passRate);
    lines.push("- **\u7EDF\u8BA1**: \u901A\u8FC7 " + summary.passedSteps + " / \u5931\u8D25 " + summary.failedSteps + " / \u8DF3\u8FC7 " + summary.skippedSteps + " / \u6267\u884C " + summary.executedSteps + " / \u8BA1\u5212 " + summary.plannedSteps);
    lines.push("- **\u603B\u8017\u65F6**: " + summary.totalDurationFmt);
    lines.push("");
    lines.push("## \u6B65\u9AA4\u660E\u7EC6");
    lines.push("");
    (report.steps || []).forEach(function(step) {
      var icon = step.skipped ? "\u23ED\uFE0F" : step.passed ? "\u2705" : "\u274C";
      lines.push("### " + icon + " \u6B65\u9AA4 " + step.stepNo + ": " + mdInline(step.name));
      lines.push("- **\u8BF7\u6C42**: " + mdCode(step.method + " " + step.path));
      lines.push("- **\u72B6\u6001**: " + step.status + " | **\u8017\u65F6**: " + step.durationFmt);
      if (step.error) lines.push("- **\u5931\u8D25\u539F\u56E0**: " + mdInline(step.error));
      (step.warnings || []).forEach(function(warning) {
        lines.push("- **\u8B66\u544A**: " + mdInline(warning));
      });
      if (step.assertions && step.assertions.length) {
        lines.push("- **\u65AD\u8A00\u7ED3\u679C**:");
        step.assertions.forEach(function(a) {
          lines.push("  - [" + (a.passed ? "x" : " ") + "] " + mdInline(a.name));
          if (a.reason) lines.push("    - \u539F\u56E0: " + mdInline(a.reason));
          pushEachDetailLines(lines, a.detail, "", 1);
        });
      }
      var response = step.response || {};
      lines.push("- **\u5B8C\u6574\u54CD\u5E94**:");
      lines.push("  - **\u54CD\u5E94\u5934**:");
      var headersPayload = formatReportPayload(response.headers || {}, { full: true });
      var headersFence = fenceFor(headersPayload);
      lines.push(headersFence + "json");
      lines.push(headersPayload);
      lines.push(headersFence);
      lines.push("  - **\u54CD\u5E94\u4F53**:");
      var bodyPayload = formatReportPayload(response.bodyText !== void 0 ? response.bodyText : response.body, { full: true });
      var bodyFence = fenceFor(bodyPayload);
      lines.push(bodyFence);
      lines.push(bodyPayload);
      lines.push(bodyFence);
      lines.push("");
    });
    return lines.join("\n");
  }
  function renderReportPanel(steps, scenario, scenarioFile, executionMode, environment) {
    steps = steps || [];
    var report = buildOverallReport(steps, scenario, scenarioFile, executionMode, environment);
    var node = document.getElementById("reportPanel");
    var reportTab = document.getElementById("reportTab");
    var reportTabBadge = document.getElementById("reportTabBadge");
    var failedCount = steps.filter(function(step) {
      return !step.passed && !step.skipped && !step.cancelled;
    }).length;
    if (reportTab) reportTab.disabled = !steps.length;
    if (reportTabBadge) {
      reportTabBadge.textContent = String(failedCount);
      reportTabBadge.classList.toggle("is-alert", failedCount > 0);
      reportTabBadge.style.display = failedCount > 0 ? "" : "none";
    }
    if (!node) return report;
    if (!steps.length) {
      node.innerHTML = '<div class="report-empty"><div class="report-empty__title">\u6267\u884C\u540E\u751F\u6210\u62A5\u544A</div><div class="report-empty__hint">\u7ED3\u679C\u6458\u8981\u4E0E\u5931\u8D25\u8BCA\u65AD\u5C06\u5728\u8FD9\u91CC\u5C55\u793A</div></div>';
      return report;
    }
    var summary = report.summary;
    var pending = summary.totalSteps - summary.executedSteps;
    var cancelled = report.status === "CANCELLED";
    var hasFailure = summary.failedSteps > 0;
    var allSkipped = !hasFailure && summary.executedSteps === 0 && summary.skippedSteps > 0;
    var completed = pending <= 0;
    var statusClass = cancelled ? "report-status--cancelled" : hasFailure ? "report-status--failed" : allSkipped ? "report-status--skipped" : completed ? "report-status--passed" : "report-status--running";
    var statusText = cancelled ? "\u5DF2\u53D6\u6D88" : hasFailure ? "\u5B58\u5728\u5931\u8D25" : allSkipped ? "\u5168\u90E8\u8DF3\u8FC7" : completed ? "\u5168\u90E8\u901A\u8FC7" : "\u6267\u884C\u4E2D";
    var modeText = report.executionMode === "step" ? "\u5355\u6B65\u6267\u884C" : "\u5168\u91CF\u6267\u884C";
    var progressText = summary.executedSteps + " / " + summary.totalSteps;
    var progressPercent = summary.totalSteps ? summary.executedSteps / summary.totalSteps * 100 : 0;
    var reportSteps = report.steps.filter(function(step) {
      return !step.passed && !step.skipped && !step.cancelled;
    });
    var hasRealFailure = reportSteps.length > 0;
    var stepHtml = reportSteps.map(function(step) {
      var method = String(step.method || "GET").toUpperCase();
      var methodClass = "report-method--" + method.toLowerCase();
      var stepIndex = Number(step.stepNo) - 1;
      var canLocateStep = Number.isInteger(stepIndex) && stepIndex >= 0;
      var failedAssertions = (step.assertions || []).filter(function(assertion) {
        return !assertion.passed;
      });
      var issue = step.error || failedAssertions[0] && failedAssertions[0].name || "";
      var response = step.response || {};
      var responseBody = response.bodyText !== void 0 ? response.bodyText : response.body;
      var responseHtml = '<details class="report-step__response"><summary>\u5B8C\u6574\u54CD\u5E94</summary><div class="report-step__response-section">\u54CD\u5E94\u5934</div><pre>' + esc(formatReportPayload(response.headers || {})) + '</pre><div class="report-step__response-section">\u54CD\u5E94\u4F53</div><pre>' + esc(formatReportPayload(responseBody)) + "</pre></details>";
      return '<div class="report-step ' + (step.passed ? "report-step--passed" : "report-step--failed") + '"><div class="report-step__marker" aria-hidden="true">' + (step.passed ? "\u2713" : "!") + '</div><div class="report-step__content"><div class="report-step__heading"><span class="report-step__number">\u6B65\u9AA4 ' + step.stepNo + '</span><span class="report-step__name" title="' + esc(step.name || "") + '">' + esc(step.name || "\u672A\u547D\u540D\u6B65\u9AA4") + '</span></div><div class="report-step__request"><span class="report-method ' + methodClass + '">' + esc(method) + '</span><span class="report-step__path" title="' + esc(step.path || "") + '">' + esc(step.path || "-") + "</span></div>" + (canLocateStep ? '<button type="button" class="report-step__locate" data-locate-step-index="' + stepIndex + '" aria-label="' + esc("\u5B9A\u4F4D\u5230\u6B65\u9AA4 " + step.stepNo + "\uFF1A" + (step.name || "\u672A\u547D\u540D\u6B65\u9AA4")) + '">\u5B9A\u4F4D\u6B65\u9AA4</button>' : "") + (issue ? '<div class="report-step__issue">' + esc(issue) + "</div>" : "") + responseHtml + '</div><div class="report-step__result"><span class="report-step__code">' + esc(String(step.status || "-")) + '</span><span class="report-step__duration">' + esc(step.durationFmt || "-") + "</span></div></div>";
    }).join("");
    var diagnosisHtml = hasRealFailure ? '<div class="report-steps"><div class="report-steps__title">\u5931\u8D25\u6B65\u9AA4</div>' + stepHtml + "</div>" : cancelled ? '<div class="report-healthy"><div class="report-healthy__title">\u6267\u884C\u5DF2\u53D6\u6D88</div><div class="report-healthy__hint">\u53D6\u6D88\u7684\u6B65\u9AA4\u4E0D\u8BA1\u5165\u5931\u8D25\uFF1B\u8BE6\u7EC6\u8BF7\u6C42\u4E0E\u54CD\u5E94\u8BF7\u5728\u5DE6\u4FA7\u6B65\u9AA4\u5217\u8868\u67E5\u770B\u3002</div></div>' : allSkipped ? '<div class="report-healthy"><div class="report-healthy__title">\u6240\u6709\u6B65\u9AA4\u5747\u56E0\u6761\u4EF6\u4E0D\u6EE1\u8DB3\u800C\u8DF3\u8FC7</div><div class="report-healthy__hint">\u672C\u6B21\u6267\u884C\u672A\u53D1\u8D77\u4EFB\u4F55\u8BF7\u6C42\uFF0C\u8BE6\u7EC6\u8DF3\u8FC7\u539F\u56E0\u8BF7\u5728\u5DE6\u4FA7\u6B65\u9AA4\u5217\u8868\u67E5\u770B\u3002</div></div>' : '<div class="report-healthy"><div class="report-healthy__title">' + (completed ? "\u6240\u6709\u6B65\u9AA4\u5747\u5DF2\u901A\u8FC7" : "\u5F53\u524D\u5DF2\u6267\u884C\u6B65\u9AA4\u5747\u901A\u8FC7") + '</div><div class="report-healthy__hint">\u8BE6\u7EC6\u8BF7\u6C42\u4E0E\u54CD\u5E94\u8BF7\u5728\u5DE6\u4FA7\u6B65\u9AA4\u5217\u8868\u67E5\u770B\uFF1B\u53EF\u901A\u8FC7\u4E0B\u65B9\u64CD\u4F5C\u590D\u5236\u5B8C\u6574\u62A5\u544A\u3002</div></div>';
    var diagnosisTitle = hasRealFailure ? "\u5931\u8D25\u8BCA\u65AD \xB7 " + reportSteps.length : "\u6267\u884C\u7ED3\u8BBA";
    node.innerHTML = '<div class="report-content"><div class="report-overview"><div class="report-overview__top"><div class="report-overview__title">' + esc(report.title || "\u6D4B\u8BD5\u62A5\u544A") + '</div><span class="report-status ' + statusClass + '">' + statusText + '</span></div><div class="report-overview__meta"><span>' + esc(report.environment || "\u9ED8\u8BA4\u73AF\u5883") + "</span><span>" + modeText + "</span><span>\u901A\u8FC7 " + summary.passedSteps + "</span><span>\u5931\u8D25 " + summary.failedSteps + "</span>" + (summary.skippedSteps > 0 ? "<span>\u8DF3\u8FC7 " + summary.skippedSteps + "</span>" : "") + "<span>" + esc(summary.totalDurationFmt) + '</span></div><div class="report-progress"><div class="report-progress__labels"><span>\u6267\u884C\u8FDB\u5EA6 ' + progressText + "</span><strong>" + progressPercent.toFixed(1) + '%</strong></div><div class="report-progress__track' + (hasFailure ? " report-progress__track--failed" : "") + '" role="progressbar" aria-label="\u6B65\u9AA4\u6267\u884C\u8FDB\u5EA6" aria-valuemin="0" aria-valuemax="' + (summary.totalSteps || 1) + '" aria-valuenow="' + summary.executedSteps + '" aria-valuetext="\u5DF2\u6267\u884C ' + summary.executedSteps + " / " + summary.totalSteps + ' \u4E2A\u6B65\u9AA4"><span style="width:' + progressPercent + '%"></span></div><div class="report-progress__labels report-progress__outcome"><span>\u901A\u8FC7\u7387</span><strong>' + esc(summary.passRate) + '</strong></div></div></div><details class="report-diagnosis"' + (hasRealFailure ? " open" : "") + "><summary>" + diagnosisTitle + '</summary><div class="report-diagnosis__body">' + diagnosisHtml + '</div></details><div class="report-actions flex flex-col gap-2 pt-1"><button id="copyDiagnosisMarkdownBtn" type="button" class="w-full stats-action-btn stats-action-btn--primary justify-center py-2 text-xs" title="\u590D\u5236\u683C\u5F0F\u5316 Markdown \u62A5\u544A (\u53EF\u76F4\u63A5\u6295\u5582\u7ED9 AI \u63D0\u95EE/\u6392\u67E5)"><svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg><span>\u590D\u5236\u8BCA\u65AD\u62A5\u544A (AI \u6392\u67E5)</span></button><button id="copyDiagnosisJsonBtn" type="button" class="w-full stats-action-btn justify-center py-2 text-xs" title="\u5BFC\u51FA\u6267\u884C\u7ED3\u679C JSON"><svg class="w-3.5 h-3.5 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg><span>\u5BFC\u51FA\u7ED3\u679C JSON</span></button></div></div>';
    return report;
  }
  return {
    setRunState,
    setStepLoading,
    buildSkeleton,
    renderScenarioSelect,
    renderStatsAll,
    renderFilterAll,
    renderPendingSteps,
    renderStepsAll,
    appendStepResult,
    buildOverallReport,
    buildMarkdownReport: buildMarkdownReport2,
    eachDetailRows: eachDetailRows2,
    renderReportPanel
  };
}();
var ui_view_default = workbenchView;
var buildMarkdownReport = workbenchView.buildMarkdownReport;
var eachDetailRows = workbenchView.eachDetailRows;

// src/browser/ui/ui-adhoc.js
var workbenchAdhoc = function() {
  "use strict";
  var appConfig = {};
  var adhocReturnFocus = null;
  var adhocState = {
    request: null,
    result: null,
    running: false
  };
  function parseJsonEditor(value, fieldName) {
    var text = String(value || "").trim();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error(fieldName + " \u5FC5\u987B\u662F\u5408\u6CD5 JSON");
    }
  }
  function resolveAdhocValue(value, runtime) {
    if (Array.isArray(value)) return value.map(function(item) {
      return resolveAdhocValue(item, runtime);
    });
    if (isPlainObject(value)) {
      return Object.keys(value).reduce(function(result, key) {
        result[key] = resolveAdhocValue(value[key], runtime);
        return result;
      }, {});
    }
    if (typeof value !== "string") return value;
    return value.replace(/\{\{\s*(.+?)\s*\}\}/g, function(template, expr) {
      var resolved = evalExpression(expr, runtime);
      if (resolved === void 0 || resolved === null || resolved === "") return template;
      return typeof resolved === "object" ? JSON.stringify(resolved) : String(resolved);
    });
  }
  function hasAdhocTemplate(value) {
    if (typeof value === "string") return /\{\{\s*.+?\s*\}\}/.test(value);
    if (Array.isArray(value)) return value.some(hasAdhocTemplate);
    if (isPlainObject(value)) return Object.keys(value).some(function(key) {
      return hasAdhocTemplate(value[key]);
    });
    return false;
  }
  function parseQueryParamsFromUrl(fullPath) {
    var pathStr = String(fullPath || "");
    var qIdx = pathStr.indexOf("?");
    if (qIdx < 0) return { basePath: pathStr, params: {} };
    var basePath = pathStr.substring(0, qIdx);
    var searchStr = pathStr.substring(qIdx + 1);
    var params = {};
    if (searchStr) {
      searchStr.split("&").forEach(function(pair) {
        if (!pair) return;
        var parts = pair.split("=");
        var key = decodeURIComponent(parts[0] || "");
        var val = decodeURIComponent(parts.slice(1).join("=") || "");
        if (key) params[key] = val;
      });
    }
    return { basePath, params };
  }
  function buildAdhocRequest(step, activeRuntime, currentScenario) {
    var runtime = activeRuntime || {
      vars: Object.assign({}, (currentScenario || {}).vars || {}, appConfig.vars || {}),
      lastResponse: null,
      lastResponseBody: null
    };
    var request = resolveAdhocValue(clone(step.request || {}), runtime) || {};
    var resolvedPath = resolveAdhocValue(step.path || request.path || "", runtime);
    var parsed = parseQueryParamsFromUrl(resolvedPath);
    var rawParams = step.params || request.params;
    var resolvedParams = rawParams ? resolveAdhocValue(rawParams, runtime) : {};
    var mergedParams = Object.assign({}, parsed.params, isPlainObject(resolvedParams) ? resolvedParams : {});
    return {
      name: (step.name || "\u672A\u547D\u540D\u6B65\u9AA4") + "\uFF08\u4E34\u65F6\u8C03\u8BD5\uFF09",
      method: String(step.method || request.method || "GET").toUpperCase(),
      path: parsed.basePath,
      params: Object.keys(mergedParams).length > 0 ? mergedParams : null,
      headers: request.headers && isPlainObject(request.headers) ? request.headers : {},
      body: request.body === void 0 ? null : request.body
    };
  }
  function buildAdhocStep(values) {
    var path7 = String(values.path || "").trim();
    if (!path7) throw new Error("\u8BF7\u6C42\u8DEF\u5F84\u4E0D\u80FD\u4E3A\u7A7A");
    var params = values.params;
    var headers = parseJsonEditor(values.headers, "\u8BF7\u6C42\u5934");
    var bodyText = String(values.body || "").trim();
    var body = bodyText ? parseJsonEditor(bodyText, "\u8BF7\u6C42\u4F53") : void 0;
    if (params && !isPlainObject(params)) throw new Error("Query \u53C2\u6570\u5FC5\u987B\u662F Key-Value \u5BF9\u8C61");
    if (!isPlainObject(headers)) throw new Error("\u8BF7\u6C42\u5934\u5FC5\u987B\u662F JSON \u5BF9\u8C61");
    if (hasAdhocTemplate(path7) || hasAdhocTemplate(params) || hasAdhocTemplate(headers) || hasAdhocTemplate(body)) {
      throw new Error("\u4ECD\u6709\u672A\u89E3\u6790\u7684 {{vars.xxx}} \u53C2\u6570\uFF0C\u8BF7\u586B\u5199\u5B9E\u9645\u503C\u540E\u518D\u6267\u884C");
    }
    return {
      name: values.name || "\u4E34\u65F6\u8BF7\u6C42",
      method: String(values.method || "GET").toUpperCase(),
      path: path7,
      params,
      request: { headers, body },
      timeoutMs: Number(appConfig.requestTimeoutMs || 3e4)
    };
  }
  function showAdhocError(message) {
    var node = document.getElementById("adhocError");
    if (!node) return;
    node.textContent = message || "";
    node.classList.toggle("hidden", !message);
  }
  function renderAdhocResult(result) {
    var node = document.getElementById("adhocResult");
    if (!node) return;
    if (!result) {
      node.classList.add("hidden");
      node.innerHTML = "";
      return;
    }
    var statusClass = result.passed ? "text-emerald-700" : "text-rose-700";
    var response = result.response || { headers: {}, body: null };
    node.classList.remove("hidden");
    node.innerHTML = '<div class="flex items-center justify-between"><div class="text-sm font-bold ' + statusClass + '">' + (result.passed ? "\u8BF7\u6C42\u5B8C\u6210" : "\u8BF7\u6C42\u5931\u8D25") + '</div><div class="text-xs text-slate-500">\u72B6\u6001\uFF1A' + esc(result.status) + " \uFF5C \u8017\u65F6\uFF1A" + esc(fmt(result.duration)) + "</div></div>" + (result.error ? '<div class="mt-3 rounded border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">' + esc(result.error) + "</div>" : "") + '<div class="mt-3 grid gap-3 md:grid-cols-2"><div><div class="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">\u54CD\u5E94\u5934</div><pre class="overflow-x-auto rounded bg-slate-900 p-3 text-xs leading-tight text-slate-300">' + esc(safeJson(sanitizeSensitive2(response.headers, ""))) + '</pre></div><div><div class="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">\u54CD\u5E94\u4F53</div><pre class="overflow-x-auto rounded bg-slate-900 p-3 text-xs leading-tight text-slate-300">' + esc(safeJson(sanitizeSensitive2(response.body, ""))) + "</pre></div></div>";
  }
  function syncAdhocFormDisabled(disabled) {
    ["adhocNameInput", "adhocMethodInput", "adhocPathInput", "adhocAddParamBtn", "adhocHeadersInput", "adhocBodyInput", "adhocExecuteBtn"].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.disabled = disabled;
    });
    var container = document.getElementById("adhocParamsContainer");
    if (container) {
      container.querySelectorAll("input, button").forEach(function(el) {
        el.disabled = disabled;
      });
    }
    var execBtn = document.getElementById("adhocExecuteBtn");
    if (execBtn) execBtn.textContent = disabled ? "\u6267\u884C\u4E2D..." : "\u6267\u884C\u4E00\u6B21";
  }
  function renderAdhocParamsRows(paramsObj) {
    var container = document.getElementById("adhocParamsContainer");
    if (!container) return;
    container.innerHTML = "";
    var keys = paramsObj && isPlainObject(paramsObj) ? Object.keys(paramsObj) : [];
    if (keys.length === 0) {
      addAdhocParamRow("", "");
      return;
    }
    keys.forEach(function(k) {
      addAdhocParamRow(k, paramsObj[k]);
    });
  }
  function addAdhocParamRow(key, value) {
    var container = document.getElementById("adhocParamsContainer");
    if (!container) return;
    var row = document.createElement("div");
    row.className = "flex items-center gap-2 adhoc-param-row";
    row.innerHTML = '<input type="checkbox" checked class="param-enable rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" title="\u662F\u5426\u542F\u7528"><input type="text" class="param-key w-1/3 rounded border border-slate-200 px-2 py-1 font-mono text-xs placeholder:text-slate-300" placeholder="\u53C2\u6570\u540D (Key)" value="' + esc(key || "") + '"><input type="text" class="param-value flex-1 rounded border border-slate-200 px-2 py-1 font-mono text-xs placeholder:text-slate-300" placeholder="\u53C2\u6570\u503C (Value)" value="' + esc(value !== void 0 && value !== null ? String(value) : "") + '"><button type="button" class="param-remove text-slate-400 hover:text-rose-600 px-1 text-xs" title="\u5220\u9664\u884C">\u2715</button>';
    row.querySelector(".param-remove").addEventListener("click", function() {
      row.remove();
      if (container.querySelectorAll(".adhoc-param-row").length === 0) {
        addAdhocParamRow("", "");
      }
    });
    container.appendChild(row);
  }
  function collectAdhocParams() {
    var container = document.getElementById("adhocParamsContainer");
    if (!container) return void 0;
    var result = {};
    var count = 0;
    container.querySelectorAll(".adhoc-param-row").forEach(function(row) {
      var enable = row.querySelector(".param-enable").checked;
      var key = row.querySelector(".param-key").value.trim();
      var val = row.querySelector(".param-value").value;
      if (enable && key) {
        result[key] = val;
        count++;
      }
    });
    return count > 0 ? result : void 0;
  }
  function openAdhocModal(step, activeRuntime, currentScenario) {
    if (!step) return;
    var request = buildAdhocRequest(step, activeRuntime, currentScenario);
    adhocState.request = request;
    adhocState.result = null;
    adhocState.running = false;
    document.getElementById("adhocNameInput").value = request.name;
    document.getElementById("adhocMethodInput").value = request.method;
    document.getElementById("adhocPathInput").value = request.path;
    renderAdhocParamsRows(request.params);
    document.getElementById("adhocHeadersInput").value = safeJson(request.headers);
    document.getElementById("adhocBodyInput").value = request.body === null ? "" : safeJson(request.body);
    showAdhocError("");
    renderAdhocResult(null);
    syncAdhocFormDisabled(false);
    var modal = document.getElementById("adhocModal");
    adhocReturnFocus = document.activeElement;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    window.requestAnimationFrame(function() {
      document.getElementById("adhocNameInput").focus();
    });
  }
  function closeAdhocModal() {
    if (adhocState.running) return;
    adhocState.request = null;
    var modal = document.getElementById("adhocModal");
    if (!modal || modal.classList.contains("hidden")) return;
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    if (adhocReturnFocus && adhocReturnFocus.focus) adhocReturnFocus.focus();
    adhocReturnFocus = null;
  }
  async function executeAdhocRequest(executeStepFn, getEnvFn, getBaseUrlFn, getAuthFn, getGlobalsFn, getVarsFn) {
    if (adhocState.running) return;
    try {
      var step = buildAdhocStep({
        name: document.getElementById("adhocNameInput").value,
        method: document.getElementById("adhocMethodInput").value,
        path: document.getElementById("adhocPathInput").value,
        params: collectAdhocParams(),
        headers: document.getElementById("adhocHeadersInput").value,
        body: document.getElementById("adhocBodyInput").value
      });
      var environment = getEnvFn ? getEnvFn() : null;
      var runtimeVars = getVarsFn ? getVarsFn() : {};
      var runtime = {
        vars: clone(runtimeVars),
        lastResponse: null,
        lastResponseBody: null,
        baseUrl: getBaseUrlFn ? getBaseUrlFn() : "",
        authorization: getAuthFn ? getAuthFn() : "",
        globals: getGlobalsFn ? getGlobalsFn() : [],
        environment: environment ? clone(environment) : null,
        startedAt: Date.now(),
        abortController: new AbortController(),
        cancelled: false
      };
      adhocState.running = true;
      showAdhocError("");
      syncAdhocFormDisabled(true);
      var result = await executeStepFn(step, runtime, appConfig);
      adhocState.result = result;
      renderAdhocResult(result);
    } catch (error) {
      showAdhocError(error && error.message ? error.message : "\u4E34\u65F6\u8BF7\u6C42\u6267\u884C\u5931\u8D25");
    } finally {
      adhocState.running = false;
      syncAdhocFormDisabled(false);
    }
  }
  function bindAdhocRequestEvents(getStepByIdxFn, getRuntimeByIdxFn, executeStepFn, getEnvFn, getBaseUrlFn, getAuthFn, getGlobalsFn, getVarsFn) {
    document.getElementById("stepsList").addEventListener("click", function(event) {
      var button = event.target.closest("[data-adhoc-step]");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      var index = Number(button.dataset.adhocStep);
      var step = getStepByIdxFn ? getStepByIdxFn(index) : null;
      var runtime = getRuntimeByIdxFn ? getRuntimeByIdxFn(index) : null;
      openAdhocModal(step, runtime);
    });
    document.getElementById("adhocCloseBtn").addEventListener("click", closeAdhocModal);
    document.getElementById("adhocCancelBtn").addEventListener("click", closeAdhocModal);
    var modal = document.getElementById("adhocModal");
    if (modal) {
      modal.addEventListener("click", function(event) {
        if (event.target === modal) closeAdhocModal();
      });
      modal.addEventListener("keydown", function(event) {
        if (event.key !== "Tab") return;
        var focusable = Array.from(modal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(function(element) {
          return element.offsetParent !== null;
        });
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      });
    }
    document.addEventListener("keydown", function(event) {
      if (event.key === "Escape" && modal && !modal.classList.contains("hidden")) {
        closeAdhocModal();
      }
    });
    document.getElementById("adhocExecuteBtn").addEventListener("click", function() {
      executeAdhocRequest(executeStepFn, getEnvFn, getBaseUrlFn, getAuthFn, getGlobalsFn, getVarsFn);
    });
    var addBtn = document.getElementById("adhocAddParamBtn");
    if (addBtn) {
      addBtn.addEventListener("click", function() {
        addAdhocParamRow("", "");
      });
    }
  }
  return {
    setConfig: function(config) {
      appConfig = config || {};
    },
    buildAdhocRequest,
    buildAdhocStep,
    openAdhocModal,
    closeAdhocModal,
    executeAdhocRequest,
    bindAdhocRequestEvents
  };
}();
var ui_adhoc_default = workbenchAdhoc;

// src/browser/ui/runtime.js
function createWorkbenchRuntime(options) {
  "use strict";
  var uiStyle = ui_style_default;
  var uiView = ui_view_default;
  var uiAdhoc = ui_adhoc_default;
  var clone2 = clone;
  var isPlainObject2 = isPlainObject;
  var assertNotReservedVar2 = assertNotReservedVar;
  var assertNoReservedVars2 = assertNoReservedVars;
  var mergeGlobals2 = mergeGlobals;
  var GLOBAL_TYPES2 = ["header", "cookie", "query"];
  var HEADER_VALUE_OPTIONS = {
    "Authorization": ["Bearer {{vars.token}}", "Token {{vars.token}}", "Basic dXNlcjpwYXNz"],
    "Content-Type": ["application/json", "application/x-www-form-urlencoded", "multipart/form-data", "text/plain", "application/xml"],
    "Accept": ["application/json", "text/plain", "*/*", "application/xml"],
    "Accept-Language": ["zh-CN", "zh-CN,zh;q=0.9", "en-US", "en"],
    "Cache-Control": ["no-cache", "no-store", "max-age=0"],
    "X-Request-Id": ["{{vars.runId}}", "{{vars.runNo}}"]
  };
  var globalValueListSeq = 0;
  var locatedStepHighlightTimer = null;
  var appConfig = options.config || {};
  var getRegisteredScenario = options.getScenario || function() {
    return null;
  };
  if (uiAdhoc.setConfig) uiAdhoc.setConfig(appConfig);
  var stepsFilterState = {
    type: "all",
    keyword: ""
  };
  function applyStepsFilter() {
    var type = stepsFilterState.type || "all";
    var keyword = String(stepsFilterState.keyword || "").trim().toLowerCase();
    document.querySelectorAll(".filter-btn").forEach(function(b) {
      var active = b.dataset.f === type;
      b.setAttribute("aria-pressed", active ? "true" : "false");
      if (active) {
        b.className = "filter-btn px-2.5 py-1 text-xs font-bold text-slate-900 bg-white rounded-md shadow-2xs transition-all";
      } else {
        b.className = "filter-btn px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white/60 rounded-md transition-all";
      }
    });
    var stepItems = Array.from(document.querySelectorAll("#stepsList li[data-step-idx]"));
    var visibleCount = 0;
    stepItems.forEach(function(li) {
      var searchData = String(li.dataset.search || "").toLowerCase();
      var matchSearch = !keyword || searchData.indexOf(keyword) >= 0;
      var passedAttr = li.dataset.passed;
      var skipped = li.dataset.skipped === "true";
      var matchFilter = false;
      if (type === "all") {
        matchFilter = true;
      } else if (type === "pass") {
        matchFilter = passedAttr === "true" && !skipped;
      } else if (type === "fail") {
        matchFilter = passedAttr === "false" && !skipped;
      } else if (type === "skip") {
        matchFilter = skipped;
      }
      var visible = matchSearch && matchFilter;
      li.style.display = visible ? "" : "none";
      if (visible) visibleCount += 1;
    });
    var summary = document.getElementById("stepFilterSummary");
    if (summary) summary.textContent = "\u663E\u793A " + visibleCount + " / " + stepItems.length + " \u4E2A\u6B65\u9AA4";
    var resetButton = document.getElementById("resetStepFiltersBtn");
    if (resetButton) resetButton.hidden = type === "all" && !stepsFilterState.keyword;
    var stepsList = document.getElementById("stepsList");
    var emptyState = document.getElementById("stepsFilterEmpty");
    var hasNoMatches = stepItems.length > 0 && visibleCount === 0;
    if (stepsList) stepsList.style.display = hasNoMatches ? "none" : "";
    if (emptyState) {
      emptyState.style.display = hasNoMatches ? "flex" : "none";
      emptyState.innerHTML = hasNoMatches ? '<span>\u6CA1\u6709\u5339\u914D\u7684\u6B65\u9AA4</span><button type="button" onclick="window.__R.resetFilters()">\u6E05\u9664\u641C\u7D22\u548C\u7B5B\u9009</button>' : "";
    }
  }
  window.__R = {
    toggle: function(el, event) {
      if (event && event.target.closest("button, input, textarea, select, a")) return;
      var selection = window.getSelection && window.getSelection();
      if (selection && !selection.isCollapsed && selection.toString().trim()) return;
      var panel = el.nextElementSibling;
      var chevron = el.querySelector(".chevron");
      if (panel.classList.contains("open")) {
        panel.classList.remove("open");
        el.setAttribute("aria-expanded", "false");
        if (chevron) chevron.classList.remove("rotate-180");
      } else {
        panel.classList.add("open");
        el.setAttribute("aria-expanded", "true");
        if (chevron) chevron.classList.add("rotate-180");
      }
    },
    toggleKey: function(el, event) {
      if (event.target !== el || event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      window.__R.toggle(el);
    },
    filter: function(type) {
      stepsFilterState.type = type;
      applyStepsFilter();
    },
    search: function(q) {
      stepsFilterState.keyword = q;
      applyStepsFilter();
    },
    resetFilters: function() {
      stepsFilterState.type = "all";
      stepsFilterState.keyword = "";
      var searchInput = document.getElementById("stepSearchInput");
      if (searchInput) {
        searchInput.value = "";
      }
      applyStepsFilter();
      if (searchInput) searchInput.focus();
    },
    getFilterState: function() {
      return stepsFilterState;
    },
    applyFilter: applyStepsFilter
  };
  var state = {
    scenario: null,
    scenarioFile: "",
    scenarioScript: null,
    steps: [],
    running: false,
    activeRuntime: null,
    executionMode: "idle",
    stepRuntime: null,
    stepCheckpoints: [],
    debugRuntimes: [],
    nextStepIndex: 0,
    scenarioSearch: "",
    discoveredFiles: [],
    lastReport: null,
    startTime: null,
    endTime: null,
    // varsTrail[i] = 第 i 步执行后的 runtime.vars 浅拷贝；与 debugRuntimes[i]（执行前快照）做差集
    // 供工作台「运行时变量」面板展示每步执行后的变量与 extract 变更项
    varsTrail: []
  };
  function getStorageKeys() {
    var cfg = appConfig;
    var keys = cfg.storageKeys || {};
    return {
      baseUrl: keys.baseUrl || "scenario.testing.baseUrl",
      authorization: keys.authorization || "scenario.testing.authorization",
      globals: keys.globals || "scenario.testing.globals",
      environment: keys.environment || "scenario.testing.environment",
      theme: keys.theme || "scenario.testing.theme",
      scenarioVars: keys.scenarioVars || "scenario.testing.scenarioVars",
      pinnedScenarios: keys.pinnedScenarios || "scenario.testing.pinnedScenarios"
    };
  }
  function getEnvironments() {
    var cfg = appConfig;
    return (Array.isArray(cfg.envs) ? cfg.envs : []).filter(function(env) {
      return env && env.key;
    });
  }
  function getDefaultEnvironment() {
    var cfg = appConfig;
    var environments = getEnvironments();
    var defaultKey = cfg.defaultEnvKey;
    return environments.filter(function(env) {
      return env.key === defaultKey;
    })[0] || environments[0] || null;
  }
  function getSelectedEnvironment() {
    var keys = getStorageKeys();
    var environments = getEnvironments();
    var selectedKey = "";
    try {
      selectedKey = window.localStorage.getItem(keys.environment) || "";
    } catch (e) {
      selectedKey = "";
    }
    return environments.filter(function(env) {
      return env.key === selectedKey;
    })[0] || getDefaultEnvironment();
  }
  function getEnvironmentStorageKey(key, environment) {
    return key + "." + (environment ? environment.key : "default");
  }
  function getPinnedScenarioFiles() {
    try {
      var value = JSON.parse(window.localStorage.getItem(getStorageKeys().pinnedScenarios) || "[]");
      return Array.isArray(value) ? value.filter(function(file) {
        return typeof file === "string";
      }) : [];
    } catch (e) {
      return [];
    }
  }
  function toggleScenarioPin(file) {
    var pins = getPinnedScenarioFiles();
    var index = pins.indexOf(file);
    if (index >= 0) pins.splice(index, 1);
    else pins.unshift(file);
    persistSetting(getStorageKeys().pinnedScenarios, JSON.stringify(pins));
    renderScenarioSelect();
  }
  function getScenarioVariableDefinitions() {
    var definitions = {};
    (Array.isArray(appConfig.variables) ? appConfig.variables : []).forEach(function(definition) {
      if (!definition || !definition.name) return;
      definitions[definition.name] = {
        name: definition.name,
        label: definition.label || definition.name,
        required: Boolean(definition.required)
      };
    });
    if (state.scenario && isPlainObject2(state.scenario.envVars)) {
      Object.keys(state.scenario.envVars).forEach(function(name) {
        definitions[name] = Object.assign({}, definitions[name] || {}, {
          name,
          label: state.scenario.envVars[name] || name,
          required: true
        });
      });
    }
    return Object.keys(definitions).map(function(name) {
      return definitions[name];
    });
  }
  function getScenarioVariableStorageKey(name, environment) {
    var keys = getStorageKeys();
    return getEnvironmentStorageKey(keys.scenarioVars + "." + name, environment);
  }
  function getConfiguredScenarioVariables() {
    var config = appConfig;
    return isPlainObject2(config.scenarioVars) ? config.scenarioVars : {};
  }
  function getStoredScenarioVariables() {
    var environment = getSelectedEnvironment();
    var configuredVariables = getConfiguredScenarioVariables();
    return getScenarioVariableDefinitions().reduce(function(vars, def) {
      try {
        vars[def.name] = window.localStorage.getItem(getScenarioVariableStorageKey(def.name, environment)) || configuredVariables[def.name] || "";
      } catch (e) {
        vars[def.name] = configuredVariables[def.name] || "";
      }
      return vars;
    }, {});
  }
  function persistScenarioVariables() {
    var environment = getSelectedEnvironment();
    getScenarioVariableDefinitions().forEach(function(def) {
      var input = document.getElementById("scenarioVar_" + def.name);
      persistSetting(getScenarioVariableStorageKey(def.name, environment), input ? String(input.value || "").trim() : "");
    });
  }
  function getScenarioVariableValues() {
    var stored = getStoredScenarioVariables();
    getScenarioVariableDefinitions().forEach(function(def) {
      var input = document.getElementById("scenarioVar_" + def.name);
      if (input) stored[def.name] = String(input.value || "").trim();
    });
    return stored;
  }
  function getEffectiveBaseUrl() {
    var cfg = appConfig;
    var keys = getStorageKeys();
    var environment = getSelectedEnvironment();
    var stored = "";
    try {
      stored = window.localStorage.getItem(getEnvironmentStorageKey(keys.baseUrl, environment)) || "";
    } catch (e) {
      stored = "";
    }
    return String(stored || environment && environment.baseUrl || cfg.baseUrl || window.location.origin || "").replace(/\/+$/, "");
  }
  function getRequestBaseUrl() {
    if (window.__SCENARIO_TEST_SERVE_PROXY__) {
      return String(window.location.origin || "").replace(/\/+$/, "");
    }
    return getEffectiveBaseUrl();
  }
  function getEffectiveAuthorization() {
    var cfg = appConfig;
    var keys = getStorageKeys();
    var environment = getSelectedEnvironment();
    try {
      return window.localStorage.getItem(getEnvironmentStorageKey(keys.authorization, environment)) || environment && environment.authorization || cfg.authorization || "";
    } catch (e) {
      return environment && environment.authorization || cfg.authorization || "";
    }
  }
  function getEffectiveGlobals() {
    var cfg = appConfig;
    var keys = getStorageKeys();
    var environment = getSelectedEnvironment();
    var stored = [];
    try {
      var raw = window.localStorage.getItem(getEnvironmentStorageKey(keys.globals, environment));
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) stored = parsed;
      }
    } catch (e) {
      stored = [];
    }
    var merged = mergeGlobals2(cfg.globals, environment && environment.globals, stored);
    var authorization = getEffectiveAuthorization();
    if (authorization && !merged.some(function(g) {
      return g.type === "header" && g.name.toLowerCase() === "authorization";
    })) {
      merged = merged.concat([{ type: "header", name: "Authorization", value: authorization }]);
    }
    return merged;
  }
  function persistSetting(key, value) {
    try {
      if (!value) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn("\u4FDD\u5B58\u914D\u7F6E\u5931\u8D25", e);
    }
  }
  function getEffectiveTheme() {
    try {
      return window.localStorage.getItem(getStorageKeys().theme) || "default";
    } catch (e) {
      return "default";
    }
  }
  function createUuidHex() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID().replace(/-/g, "");
    if (window.crypto && window.crypto.getRandomValues) {
      var values = new Uint32Array(4);
      window.crypto.getRandomValues(values);
      return Array.prototype.map.call(values, function(value) {
        return ("00000000" + value.toString(16)).slice(-8);
      }).join("");
    }
    return String(Date.now()) + String(Math.random()).slice(2);
  }
  function createRunIdentifiers2() {
    var timestamp = String(Date.now());
    var random = window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID().replace(/-/g, "").slice(0, 8) : Math.random().toString(16).slice(2, 10).padEnd(8, "0");
    return {
      runId: timestamp + "-" + random,
      runNo: timestamp.slice(-6) + "-" + random.slice(0, 4)
    };
  }
  function buildScenarioRuntimeVars() {
    var cfg = appConfig;
    var scenario = state.scenario || {};
    var scenarioVars = getScenarioVariableValues();
    var missing = getScenarioVariableDefinitions().filter(function(def) {
      return def.required && !scenarioVars[def.name];
    });
    if (missing.length) {
      throw new Error("\u7F3A\u5C11\u573A\u666F\u51ED\u636E\uFF1A" + missing.map(function(def) {
        return def.label;
      }).join("\u3001") + "\u3002\u8BF7\u5728\u201C\u914D\u7F6E\u53C2\u6570 \u2192 \u5F53\u524D\u573A\u666F\u51ED\u636E\u201D\u4E2D\u586B\u5199\u5E76\u4FDD\u5B58\u3002");
    }
    var identifiers = createRunIdentifiers2();
    assertNoReservedVars2(scenario.vars, "\u573A\u666F vars");
    assertNoReservedVars2(cfg.vars, "\u914D\u7F6E vars");
    assertNoReservedVars2(scenarioVars, "\u9875\u9762\u573A\u666F\u53D8\u91CF");
    var vars = Object.assign({}, scenario.vars || {}, cfg.vars || {}, scenarioVars, identifiers);
    (scenario.generatedVars || []).forEach(function(def) {
      if (!def || !def.name) return;
      assertNotReservedVar2(def.name, "generatedVars");
      applyGeneratedVar(def, vars, identifiers, { uuidHex: createUuidHex });
    });
    return vars;
  }
  function renderScenarioSelect() {
    uiView.renderScenarioSelect(state.discoveredFiles, state.scenarioFile, state.scenarioSearch, getPinnedScenarioFiles());
  }
  function clearScenarioSearch() {
    var input = document.getElementById("scenarioSearchInput");
    if (!input) return;
    input.value = "";
    state.scenarioSearch = "";
    renderScenarioSelect();
    input.focus();
  }
  function formatTime(date) {
    if (!date) return "-";
    var d = new Date(date);
    var pad = function(n) {
      return n < 10 ? "0" + n : n;
    };
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }
  function updateExecutionFooter() {
    var startEl = document.getElementById("execStartTime");
    var endEl = document.getElementById("execEndTime");
    var durEl = document.getElementById("execTotalDuration");
    if (!startEl) return;
    var executed = (state.steps || []).length;
    var totalMs = (state.steps || []).reduce(function(sum, s) {
      return sum + (s.duration || 0);
    }, 0);
    startEl.textContent = state.startTime ? formatTime(state.startTime) : "-";
    if (endEl) endEl.textContent = state.endTime ? formatTime(state.endTime) : "-";
    if (durEl) {
      durEl.textContent = totalMs.toFixed(2) + " ms";
      durEl.classList.toggle("text-emerald-600", executed > 0);
      durEl.classList.toggle("text-slate-500", executed === 0);
    }
  }
  function renderStepsAll() {
    var varsViews = (state.steps || []).map(function(_, idx) {
      return buildVarsView(idx);
    });
    uiView.renderStepsAll(state.steps, state.scenario && state.scenario.steps ? state.scenario.steps : [], state.executionMode, varsViews);
    updateExecutionFooter();
  }
  function renderStatsAll(iterations) {
    uiView.renderStatsAll(state.steps, iterations, state.scenario, state.scenarioFile);
    updateExecutionFooter();
  }
  function renderFilterAll() {
    uiView.renderFilterAll(state.steps, state.scenario && state.scenario.steps ? state.scenario.steps : []);
  }
  function renderReportPanel() {
    state.lastReport = uiView.renderReportPanel(state.steps, state.scenario, state.scenarioFile, state.executionMode, getSelectedEnvironment());
  }
  function setSidePanelTab(tabName) {
    var showReport = tabName === "report";
    var statsTab = document.getElementById("statsTab");
    var reportTab = document.getElementById("reportTab");
    var statsPanel = document.getElementById("statsPanel");
    var reportPanel = document.getElementById("reportPanel");
    if (showReport && reportTab && reportTab.disabled) showReport = false;
    if (statsPanel) statsPanel.classList.toggle("hidden", showReport);
    if (reportPanel) reportPanel.classList.toggle("hidden", !showReport);
    if (statsTab) {
      statsTab.classList.toggle("is-active", !showReport);
      statsTab.setAttribute("aria-selected", showReport ? "false" : "true");
    }
    if (reportTab) {
      reportTab.classList.toggle("is-active", showReport);
      reportTab.setAttribute("aria-selected", showReport ? "true" : "false");
    }
  }
  function bindSidePanelTabs() {
    var statsTab = document.getElementById("statsTab");
    var reportTab = document.getElementById("reportTab");
    if (statsTab) statsTab.addEventListener("click", function() {
      setSidePanelTab("stats");
    });
    if (reportTab) reportTab.addEventListener("click", function() {
      setSidePanelTab("report");
    });
    setSidePanelTab("stats");
  }
  function expandStepDetails(stepIndex) {
    var items = document.querySelectorAll("#stepsList li");
    var item = items[stepIndex];
    if (!item) return;
    var panel = item.querySelector(".details-panel");
    var chevron = item.querySelector(".chevron");
    if (panel) panel.classList.add("open");
    if (chevron) chevron.classList.add("rotate-180");
  }
  var engine = createEngine({ config: appConfig });
  async function executeStep(step, runtime, cfg) {
    var request = step.request || {};
    return await engine.runStep(step, runtime, {
      signal: runtime.abortController.signal,
      baseUrl: runtime.baseUrl,
      authorization: runtime.authorization,
      globals: runtime.globals,
      requestTimeoutMs: Number(step.timeoutMs || request.timeoutMs || cfg.requestTimeoutMs || 3e4),
      // 轮询进度反馈：重试间隔内更新运行状态位（aria-live），避免长时间看似卡死
      onAttempt: function(info) {
        var detail = "status " + info.status + (info.failedAssertion ? "\uFF0C" + info.failedAssertion : "");
        uiView.setRunState(
          "running",
          "\u8F6E\u8BE2 " + (info.step && info.step.name || "\u672A\u547D\u540D\u6B65\u9AA4") + " \u7B2C " + info.attempt + "/" + info.totalAttempts + " \u6B21\u672A\u901A\u8FC7\uFF08" + detail + "\uFF09\uFF0C" + info.intervalMs + "ms \u540E\u91CD\u8BD5"
        );
      }
    });
  }
  function createExecutionRuntime() {
    var environment = getSelectedEnvironment();
    var runtime = {
      vars: buildScenarioRuntimeVars(),
      lastResponse: null,
      lastResponseBody: null,
      baseUrl: getRequestBaseUrl(),
      authorization: getEffectiveAuthorization(),
      globals: getEffectiveGlobals(),
      environment: environment ? clone2(environment) : null,
      startedAt: Date.now(),
      abortController: new AbortController(),
      cancelled: false
    };
    persistScenarioVariables();
    return runtime;
  }
  function snapshotStepRuntime(runtime) {
    return {
      vars: { ...runtime.vars },
      lastResponse: runtime.lastResponse,
      lastResponseBody: runtime.lastResponseBody
    };
  }
  function rememberDebugRuntime(stepIndex, runtime) {
    state.debugRuntimes[stepIndex] = snapshotStepRuntime(runtime);
  }
  function getDebugRuntime(stepIndex) {
    var snapshot = state.debugRuntimes[stepIndex];
    if (!snapshot) return null;
    return {
      vars: { ...snapshot.vars },
      lastResponse: snapshot.lastResponse,
      lastResponseBody: snapshot.lastResponseBody
    };
  }
  function diffVars(before, after) {
    var changed = [];
    Object.keys(after || {}).forEach(function(key) {
      var had = Object.prototype.hasOwnProperty.call(before || {}, key);
      if (!had || JSON.stringify(before[key]) !== JSON.stringify(after[key])) changed.push(key);
    });
    return changed;
  }
  function buildVarsView(stepIndex) {
    var before = state.debugRuntimes[stepIndex];
    if (!before) return null;
    var after = state.varsTrail[stepIndex] || before.vars;
    return { vars: after, changedKeys: diffVars(before.vars, after) };
  }
  function restoreStepRuntime(runtime, snapshot) {
    runtime.vars = { ...snapshot.vars };
    runtime.lastResponse = snapshot.lastResponse;
    runtime.lastResponseBody = snapshot.lastResponseBody;
    runtime.abortController = new AbortController();
    runtime.cancelled = false;
  }
  function refreshStepSessionView() {
    renderStatsAll(state.scenario && state.scenario.iterations || { run: 1, failed: 0 });
    renderFilterAll();
    renderStepsAll();
    renderReportPanel();
  }
  function rewindToStep(stepIndex) {
    if (state.running || state.executionMode !== "step" || !state.stepRuntime || !state.stepCheckpoints[stepIndex]) return false;
    restoreStepRuntime(state.stepRuntime, state.stepCheckpoints[stepIndex]);
    state.steps = state.steps.slice(0, stepIndex);
    state.stepCheckpoints = state.stepCheckpoints.slice(0, stepIndex + 1);
    state.debugRuntimes = state.debugRuntimes.slice(0, stepIndex);
    state.varsTrail = state.varsTrail.slice(0, stepIndex);
    state.nextStepIndex = stepIndex;
    state.lastReport = null;
    state.endTime = null;
    refreshStepSessionView();
    uiView.setRunState("idle", "\u5DF2\u56DE\u9000\u5230\u7B2C " + (stepIndex + 1) + " \u6B65");
    return true;
  }
  function rerunStep(stepIndex) {
    if (rewindToStep(stepIndex)) runNextStep();
  }
  function setExecutionButtonsDisabled(disabled) {
    var runBtn = document.getElementById("runBtn");
    var runBtnLabel = document.getElementById("runBtnLabel");
    var fullRunActive = disabled && state.executionMode === "full";
    runBtn.disabled = disabled;
    if (runBtnLabel) runBtnLabel.textContent = fullRunActive ? "\u6267\u884C\u4E2D\u2026" : "\u6267\u884C\u5168\u90E8";
    runBtn.classList.toggle("scenario-header-button--running", fullRunActive);
    runBtn.setAttribute("aria-busy", fullRunActive ? "true" : "false");
    document.getElementById("stepBtn").disabled = disabled;
    var resetBtn = document.getElementById("resetBtn");
    if (resetBtn) resetBtn.disabled = disabled;
    document.getElementById("cancelBtn").disabled = !disabled;
    ["environmentSelect", "configToggleBtn", "envDropdownTrigger", "themeDropdownTrigger"].forEach(function(id) {
      var element = document.getElementById(id);
      if (element) {
        element.disabled = disabled;
        element.setAttribute("aria-disabled", disabled ? "true" : "false");
        element.classList.toggle("opacity-50", disabled);
        element.classList.toggle("pointer-events-none", disabled);
      }
    });
    document.querySelectorAll("#configModal input, #configModal select, #configModal button").forEach(function(element) {
      element.disabled = disabled;
    });
  }
  function cancelExecution() {
    var runtime = state.activeRuntime || state.stepRuntime;
    if (!state.running || !runtime || !runtime.abortController) return;
    runtime.cancelled = true;
    runtime.abortController.abort(new Error("\u7528\u6237\u5DF2\u53D6\u6D88\u6267\u884C"));
    uiView.setRunState("cancelled", "\u6B63\u5728\u53D6\u6D88");
  }
  function resetExecution() {
    if (state.running) return;
    state.steps = [];
    state.stepRuntime = null;
    state.stepCheckpoints = [];
    state.debugRuntimes = [];
    state.varsTrail = [];
    state.activeRuntime = null;
    state.nextStepIndex = 0;
    state.lastReport = null;
    state.startTime = null;
    state.endTime = null;
    state.executionMode = "full";
    stepsFilterState.type = "all";
    stepsFilterState.keyword = "";
    renderStatsAll(state.scenario && state.scenario.iterations || { run: 1, failed: 0 });
    renderFilterAll();
    renderStepsAll();
    renderReportPanel();
    setSidePanelTab("stats");
    uiView.setRunState("idle", "\u5F85\u6267\u884C");
  }
  function showDiagnosticError(error, customState) {
    var message = error && error.message ? String(error.message) : error ? String(error) : "\u6267\u884C\u5F02\u5E38";
    var runState = customState || (/缺少场景凭据|配置/.test(message) ? "\u914D\u7F6E\u7F3A\u5931" : "\u6267\u884C\u524D\u5931\u8D25");
    if (state.startTime) state.endTime = /* @__PURE__ */ new Date();
    uiView.setRunState("failed", runState);
    var reportTab = document.getElementById("reportTab");
    var reportTabBadge = document.getElementById("reportTabBadge");
    if (reportTab) reportTab.disabled = false;
    if (reportTabBadge) {
      reportTabBadge.textContent = "!";
      reportTabBadge.classList.add("is-alert");
      reportTabBadge.style.display = "";
    }
    var reportPanel = document.getElementById("reportPanel");
    if (reportPanel) {
      reportPanel.innerHTML = '<div class="report-content"><div class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-800 space-y-2"><div class="font-bold text-xs flex items-center gap-1.5 text-rose-700"><svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg><span>' + esc(runState) + '</span></div><div class="text-xs text-rose-700 leading-relaxed font-mono whitespace-pre-wrap break-all">' + esc(message) + '</div><div class="text-[11px] text-rose-600/80 pt-1 border-t border-rose-200/60">\u53EF\u70B9\u51FB\u53F3\u4E0A\u89D2\u300C\u914D\u7F6E\u300D\u6309\u94AE\u68C0\u67E5\u73AF\u5883\u53C2\u6570\uFF0C\u6216\u67E5\u770B\u63A7\u5236\u53F0\u65E5\u5FD7\u3002</div></div></div>';
    }
    setSidePanelTab("report");
  }
  function showExecutionConfigError(error) {
    showDiagnosticError(error, /缺少场景凭据|配置/.test(error && error.message ? error.message : "") ? "\u914D\u7F6E\u7F3A\u5931" : "\u6267\u884C\u524D\u5931\u8D25");
  }
  function finishExecutionState(runtime) {
    if (state.startTime) state.endTime = /* @__PURE__ */ new Date();
    var cancelled = Boolean(runtime && runtime.cancelled) || state.steps.some(function(item) {
      return item.cancelled;
    });
    if (cancelled) {
      uiView.setRunState("cancelled", "\u5DF2\u53D6\u6D88");
      renderReportPanel();
      updateExecutionFooter();
      return;
    }
    var skipped = state.steps.filter(function(item) {
      return item.skipped;
    }).length;
    var failed = state.steps.filter(function(item) {
      return !item.skipped && !item.passed && !item.cancelled;
    }).length;
    var executed = state.steps.length - skipped;
    uiView.setRunState(failed ? "failed" : executed === 0 ? "skipped" : "success", failed ? "\u5B58\u5728\u5931\u8D25" : executed === 0 ? "\u5168\u90E8\u8DF3\u8FC7" : "\u6267\u884C\u6210\u529F");
    renderReportPanel();
    updateExecutionFooter();
    if (failed > 0) {
      setSidePanelTab("report");
    } else {
      setSidePanelTab("stats");
    }
  }
  function highlightActiveStep(stepIndex) {
    var ul = document.getElementById("stepsList");
    if (!ul) return;
    ul.querySelectorAll(".scenario-step--running").forEach(function(node) {
      node.classList.remove("scenario-step--running");
    });
    var stepNode = ul.querySelector('li[data-step-idx="' + stepIndex + '"]') || ul.children[stepIndex];
    if (stepNode) {
      stepNode.classList.add("scenario-step--running");
      if (typeof stepNode.scrollIntoView === "function") {
        stepNode.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }
  function clearActiveStepHighlight() {
    var ul = document.getElementById("stepsList");
    if (!ul) return;
    ul.querySelectorAll(".scenario-step--running").forEach(function(node) {
      node.classList.remove("scenario-step--running");
    });
  }
  function expandStepDetails(stepIndex) {
    var ul = document.getElementById("stepsList");
    if (!ul) return;
    var stepNode = ul.querySelector('li[data-step-idx="' + stepIndex + '"]') || ul.children[stepIndex];
    if (!stepNode) return;
    var panel = stepNode.querySelector(".details-panel");
    var chevron = stepNode.querySelector(".chevron");
    if (panel) panel.classList.add("open");
    if (chevron) chevron.classList.add("rotate-180");
    var header = stepNode.querySelector('[role="button"][tabindex]');
    if (header) header.setAttribute("aria-expanded", "true");
  }
  function locateScenarioStep(stepIndex) {
    if (!Number.isInteger(stepIndex) || stepIndex < 0) return;
    stepsFilterState.type = "all";
    stepsFilterState.keyword = "";
    var searchInput = document.getElementById("stepSearchInput");
    if (searchInput) searchInput.value = "";
    applyStepsFilter();
    var ul = document.getElementById("stepsList");
    var stepNode = ul && ul.querySelector('li[data-step-idx="' + stepIndex + '"]');
    if (!ul || !stepNode) return;
    expandStepDetails(stepIndex);
    ul.querySelectorAll(".scenario-step--located").forEach(function(node) {
      node.classList.remove("scenario-step--located");
    });
    stepNode.classList.add("scenario-step--located");
    if (locatedStepHighlightTimer) window.clearTimeout(locatedStepHighlightTimer);
    locatedStepHighlightTimer = window.setTimeout(function() {
      stepNode.classList.remove("scenario-step--located");
      locatedStepHighlightTimer = null;
    }, 2400);
    var listRect = ul.getBoundingClientRect();
    var stepRect = stepNode.getBoundingClientRect();
    var top = ul.scrollTop + stepRect.top - listRect.top - Math.max(0, (ul.clientHeight - stepNode.offsetHeight) / 2);
    var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (typeof ul.scrollTo === "function") {
      ul.scrollTo({ top: Math.max(0, top), behavior: reducedMotion ? "auto" : "smooth" });
    } else {
      ul.scrollTop = Math.max(0, top);
    }
    var stepHeader = stepNode.querySelector('[role="button"][tabindex]');
    if (stepHeader) stepHeader.focus({ preventScroll: true });
  }
  async function runScenario2() {
    if (!state.scenario || state.running) return;
    var cfg = appConfig;
    var runtime;
    try {
      runtime = createExecutionRuntime();
    } catch (error) {
      showExecutionConfigError(error);
      return;
    }
    var list = Array.isArray(state.scenario.steps) ? state.scenario.steps : [];
    var iterations = state.scenario.iterations || { run: 1, failed: 0 };
    var failurePolicy = state.scenario.failurePolicy || "stop";
    state.running = true;
    state.activeRuntime = runtime;
    state.executionMode = "full";
    state.stepRuntime = null;
    state.stepCheckpoints = [];
    state.debugRuntimes = [];
    state.nextStepIndex = 0;
    state.steps = [];
    state.lastReport = null;
    state.startTime = /* @__PURE__ */ new Date();
    state.endTime = null;
    state.varsTrail = [];
    setExecutionButtonsDisabled(true);
    uiView.setRunState("running", "\u6267\u884C\u4E2D");
    renderStepsAll();
    setSidePanelTab("stats");
    try {
      for (var i = 0; i < list.length; i += 1) {
        highlightActiveStep(i);
        rememberDebugRuntime(i, runtime);
        var result = await executeStep(list[i], runtime, cfg);
        result.stepNo = i + 1;
        state.steps.push(result);
        state.varsTrail[i] = { ...runtime.vars };
        renderStatsAll(iterations);
        renderFilterAll();
        uiView.appendStepResult(result, i, list, state.executionMode, buildVarsView(i));
        renderReportPanel();
        if (!result.passed && failurePolicy !== "continue" || runtime.abortController.signal.aborted) break;
      }
      clearActiveStepHighlight();
      finishExecutionState(runtime);
    } catch (error) {
      clearActiveStepHighlight();
      showDiagnosticError(error, "\u6267\u884C\u5F02\u5E38");
    } finally {
      clearActiveStepHighlight();
      state.running = false;
      state.activeRuntime = null;
      setExecutionButtonsDisabled(false);
    }
  }
  async function runNextStep() {
    if (!state.scenario || state.running) return;
    var cfg = appConfig;
    var list = Array.isArray(state.scenario.steps) ? state.scenario.steps : [];
    if (!list.length) return;
    if (!state.stepRuntime || state.nextStepIndex >= list.length) {
      try {
        state.stepRuntime = createExecutionRuntime();
      } catch (error) {
        showExecutionConfigError(error);
        return;
      }
      state.nextStepIndex = 0;
      state.steps = [];
      state.stepCheckpoints = [snapshotStepRuntime(state.stepRuntime)];
      state.debugRuntimes = [];
      state.lastReport = null;
      state.startTime = /* @__PURE__ */ new Date();
      state.endTime = null;
      state.varsTrail = [];
      renderStepsAll();
      setSidePanelTab("stats");
    }
    var runtime = state.stepRuntime;
    var stepIndex = state.nextStepIndex;
    state.running = true;
    state.activeRuntime = runtime;
    state.executionMode = "step";
    setExecutionButtonsDisabled(true);
    highlightActiveStep(stepIndex);
    uiView.setRunState("running", "\u6267\u884C\u7B2C " + (stepIndex + 1) + " \u6B65");
    uiView.setStepLoading(true, "\u6B63\u5728\u6267\u884C\u7B2C " + (stepIndex + 1) + " \u6B65\uFF1A" + (list[stepIndex].name || "\u672A\u547D\u540D\u6B65\u9AA4"));
    try {
      rememberDebugRuntime(stepIndex, runtime);
      var result = await executeStep(list[stepIndex], runtime, cfg);
      result.stepNo = stepIndex + 1;
      state.steps.push(result);
      state.varsTrail[stepIndex] = { ...runtime.vars };
      state.nextStepIndex += 1;
      state.stepCheckpoints[state.nextStepIndex] = snapshotStepRuntime(runtime);
      renderStatsAll(state.scenario.iterations || { run: 1, failed: 0 });
      renderFilterAll();
      uiView.appendStepResult(result, stepIndex, list, state.executionMode, buildVarsView(stepIndex));
      expandStepDetails(stepIndex);
      renderReportPanel();
      if (runtime.cancelled || result.cancelled || result.timedOut) {
        state.stepRuntime = null;
        finishExecutionState(runtime);
      } else if (state.nextStepIndex >= list.length) {
        finishExecutionState(runtime);
      } else {
        uiView.setRunState(result.passed ? "idle" : "failed", (result.passed ? "\u5F85\u6267\u884C\u7B2C " : "\u7B2C " + (stepIndex + 1) + " \u6B65\u5931\u8D25\uFF0C\u4E0B\u4E00\u6B65\u4E3A\u7B2C ") + (state.nextStepIndex + 1) + " \u6B65");
      }
    } catch (error) {
      state.stepRuntime = null;
      showDiagnosticError(error, "\u6267\u884C\u5F02\u5E38");
    } finally {
      clearActiveStepHighlight();
      uiView.setStepLoading(false);
      state.running = false;
      state.activeRuntime = null;
      setExecutionButtonsDisabled(false);
    }
  }
  function renderEnvironmentSelects() {
    var environments = getEnvironments();
    var selectedEnv = getSelectedEnvironment();
    var selectedKey = selectedEnv ? selectedEnv.key : "";
    ["environmentSelect", "environmentInput"].forEach(function(id) {
      var select = document.getElementById(id);
      if (!select) return;
      select.innerHTML = environments.map(function(env) {
        var selectedAttr = env.key === selectedKey ? " selected" : "";
        return '<option value="' + esc(env.key) + '"' + selectedAttr + ">" + esc(env.name || env.key) + "</option>";
      }).join("");
    });
  }
  var SECRET_VAR_PATTERN = /(token|secret|password|passwd|auth|credential|api[-_]?key)/i;
  function renderScenarioVariableInputs() {
    var container = document.getElementById("scenarioVarsInput");
    if (!container) return;
    var defs = getScenarioVariableDefinitions();
    if (!defs.length) {
      container.innerHTML = '<div class="text-xs text-slate-400 col-span-2">\u672A\u58F0\u660E\u53EF\u914D\u7F6E\u53D8\u91CF</div>';
      return;
    }
    var stored = getStoredScenarioVariables();
    container.innerHTML = defs.map(function(def) {
      var value = stored[def.name] || "";
      var isSecret = SECRET_VAR_PATTERN.test(def.name);
      return '<label class="flex flex-col gap-1.5"><span class="text-[11px] font-bold uppercase tracking-wider text-slate-400">' + esc(def.label) + " (" + esc(def.name) + ")" + (isSecret ? ' <button type="button" data-toggle-var="' + esc(def.name) + '" class="font-normal normal-case tracking-normal text-emerald-500 hover:text-emerald-400">\u663E\u793A</button>' : "") + '</span><input id="scenarioVar_' + esc(def.name) + '" type="' + (isSecret ? "password" : "text") + '" value="' + esc(value) + '" placeholder="\u8BF7\u8F93\u5165 ' + esc(def.label) + '" autocomplete="off" class="px-3 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-white placeholder-slate-500 outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"></label>';
    }).join("");
  }
  function buildGlobalInputAttrs(g, index) {
    if (g.type !== "header") return { nameList: "", valueList: "", valueDatalist: "" };
    var valueOptions = HEADER_VALUE_OPTIONS[g.name];
    var nameList = ' list="globalHeaderNameList"';
    if (!valueOptions || !valueOptions.length) return { nameList, valueList: "", valueDatalist: "" };
    var listId = "globalValueList_" + ++globalValueListSeq;
    var valueDatalist = '<datalist id="' + listId + '">' + valueOptions.map(function(value) {
      return '<option value="' + esc(value) + '"></option>';
    }).join("") + "</datalist>";
    return { nameList, valueList: ' list="' + listId + '"', valueDatalist };
  }
  function refreshHeaderValueDatalist(row, name) {
    var valueInput = row.querySelector(".global-value");
    var existing = row.querySelector(".global-value-datalist");
    var options2 = HEADER_VALUE_OPTIONS[name] || [];
    if (!options2.length) {
      if (existing) existing.remove();
      if (valueInput) valueInput.removeAttribute("list");
      return;
    }
    var listId = "globalValueList_" + ++globalValueListSeq;
    if (!existing) {
      existing = document.createElement("datalist");
      existing.className = "global-value-datalist";
      row.appendChild(existing);
    }
    existing.id = listId;
    existing.innerHTML = options2.map(function(value) {
      return '<option value="' + esc(value) + '"></option>';
    }).join("");
    if (valueInput) valueInput.setAttribute("list", listId);
  }
  function renderGlobalsInput() {
    var container = document.getElementById("globalsInput");
    if (!container) return;
    var globals = getEffectiveGlobals();
    container.innerHTML = globals.map(function(g, index) {
      var typeOptions = GLOBAL_TYPES2.map(function(type) {
        return '<option value="' + type + '"' + (g.type === type ? " selected" : "") + ">" + type + "</option>";
      }).join("");
      var attrs = buildGlobalInputAttrs(g, index);
      return '<div class="global-param-row flex items-center gap-2" data-index="' + index + '"><select class="global-type flex-shrink-0 px-2 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-white outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500">' + typeOptions + '</select><input class="global-name flex-1 min-w-0 px-2 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-white placeholder-slate-500 outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"' + attrs.nameList + ' placeholder="\u53C2\u6570\u540D" value="' + esc(g.name) + '" /><input class="global-value flex-1 min-w-0 px-2 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-white placeholder-slate-500 outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"' + attrs.valueList + ' placeholder="\u53C2\u6570\u503C\uFF0C\u652F\u6301 {{vars.xxx}}" value="' + esc(g.value) + '" /><button type="button" class="global-remove flex-shrink-0 px-2.5 py-2 rounded-md bg-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-600 transition-colors" title="\u5220\u9664\u8BE5\u53C2\u6570">\u2715</button>' + attrs.valueDatalist + "</div>";
    }).join("");
  }
  function collectGlobalsFromInput() {
    var list = [];
    var rows = document.querySelectorAll("#globalsInput .global-param-row");
    rows.forEach(function(row) {
      var type = row.querySelector(".global-type").value;
      var name = String(row.querySelector(".global-name").value || "").trim();
      if (!name) return;
      list.push({ type, name, value: row.querySelector(".global-value").value });
    });
    return list;
  }
  function bindGlobalsEvents() {
    var addBtn = document.getElementById("addGlobalBtn");
    if (!addBtn) return;
    addBtn.addEventListener("click", function() {
      var container = document.getElementById("globalsInput");
      if (!container) return;
      var row = document.createElement("div");
      row.className = "global-param-row flex items-center gap-2";
      row.innerHTML = '<select class="global-type flex-shrink-0 px-2 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-white outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500">' + GLOBAL_TYPES2.map(function(type) {
        return '<option value="' + type + '">' + type + "</option>";
      }).join("") + '</select><input class="global-name flex-1 min-w-0 px-2 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-white placeholder-slate-500 outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" list="globalHeaderNameList" placeholder="\u53C2\u6570\u540D" /><input class="global-value flex-1 min-w-0 px-2 py-2 bg-slate-900 border border-slate-600 rounded-md text-sm text-white placeholder-slate-500 outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" placeholder="\u53C2\u6570\u503C\uFF0C\u652F\u6301 {{vars.xxx}}" /><button type="button" class="global-remove flex-shrink-0 px-2.5 py-2 rounded-md bg-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-600 transition-colors" title="\u5220\u9664\u8BE5\u53C2\u6570">\u2715</button>';
      container.appendChild(row);
    });
    document.addEventListener("click", function(event) {
      var target = event.target;
      if (!target || !target.classList || !target.classList.contains("global-remove")) return;
      var row = target.closest(".global-param-row");
      if (row) row.parentNode.removeChild(row);
    });
    document.addEventListener("input", function(event) {
      var target = event.target;
      if (!target || !target.classList || !target.classList.contains("global-name")) return;
      var row = target.closest(".global-param-row");
      if (!row || row.querySelector(".global-type").value !== "header") return;
      refreshHeaderValueDatalist(row, String(target.value || "").trim());
    });
    document.addEventListener("change", function(event) {
      var target = event.target;
      if (!target || !target.classList || !target.classList.contains("global-type")) return;
      var row = target.closest(".global-param-row");
      if (!row) return;
      var nameInput = row.querySelector(".global-name");
      var valueInput = row.querySelector(".global-value");
      var existing = row.querySelector(".global-value-datalist");
      if (target.value === "header") {
        if (nameInput) nameInput.setAttribute("list", "globalHeaderNameList");
        if (valueInput) refreshHeaderValueDatalist(row, String(nameInput ? nameInput.value : "").trim());
      } else {
        if (nameInput) nameInput.removeAttribute("list");
        if (existing) existing.remove();
        if (valueInput) valueInput.removeAttribute("list");
      }
    });
  }
  function syncSettingsInputs() {
    var keys = getStorageKeys();
    var environment = getSelectedEnvironment();
    renderEnvironmentSelects();
    renderScenarioVariableInputs();
    renderGlobalsInput();
    var baseUrlInput = document.getElementById("baseUrlInput");
    try {
      if (baseUrlInput) baseUrlInput.value = window.localStorage.getItem(getEnvironmentStorageKey(keys.baseUrl, environment)) || "";
    } catch (e) {
      if (baseUrlInput) baseUrlInput.value = "";
    }
  }
  function updateHeader() {
    var titleNode = document.getElementById("scenarioTitle");
    var envNode = document.getElementById("envNameLabel");
    var baseLabel = document.getElementById("baseUrlLabel");
    var authLabel = document.getElementById("authLabel");
    var authValue = document.getElementById("authValue");
    var environment = getSelectedEnvironment();
    var title = state.scenario ? state.scenario.name || state.scenarioFile : "\u672A\u52A0\u8F7D\u573A\u666F";
    if (titleNode) titleNode.textContent = title;
    if (envNode) envNode.textContent = environment ? environment.name || environment.key : "\u9ED8\u8BA4\u73AF\u5883";
    var effectiveBaseUrl = getEffectiveBaseUrl();
    var globals = getEffectiveGlobals();
    if (baseLabel) baseLabel.textContent = effectiveBaseUrl || "(\u672A\u914D\u7F6E)";
    if (authLabel && authValue) {
      if (globals.length) {
        authLabel.style.display = "inline";
        var summary = globals.slice(0, 3).map(function(g) {
          return g.type + ":" + g.name;
        }).join(", ");
        authValue.textContent = summary + (globals.length > 3 ? " \u7B49 " + globals.length + " \u9879" : "");
        authLabel.title = safeJson(globals);
      } else {
        authLabel.style.display = "none";
        authValue.textContent = "";
        authLabel.title = "";
      }
    }
  }
  function bindThemeEvents() {
    var select = document.getElementById("themeSelect");
    if (!select) return;
    select.addEventListener("change", function(event) {
      persistSetting(getStorageKeys().theme, event.target.value);
      uiStyle.applyTheme(event.target.value);
      renderScenarioSelect();
    });
  }
  function bindSettingsEvents() {
    var envSelectHeader = document.getElementById("environmentSelect");
    var envSelectPanel = document.getElementById("environmentInput");
    var saveBtn = document.getElementById("saveSettingsBtn");
    var clearBtn = document.getElementById("clearSettingsBtn");
    var configToggleBtn = document.getElementById("configToggleBtn");
    var configCloseBtn = document.getElementById("configCloseBtn");
    var keys = getStorageKeys();
    var noticeTimer = null;
    var configReturnFocus = null;
    function showSettingsNotice(message) {
      var notice = document.getElementById("settingsNotice");
      if (!notice) return;
      if (noticeTimer) window.clearTimeout(noticeTimer);
      notice.textContent = message;
      notice.classList.remove("hidden");
      noticeTimer = window.setTimeout(function() {
        notice.textContent = "";
        notice.classList.add("hidden");
      }, 2500);
    }
    function openConfigModal() {
      var modal = document.getElementById("configModal");
      if (!modal) return;
      configReturnFocus = document.activeElement;
      syncSettingsInputs();
      modal.classList.remove("hidden");
      modal.setAttribute("aria-hidden", "false");
      window.requestAnimationFrame(function() {
        var firstInput = document.getElementById("environmentInput");
        if (firstInput) firstInput.focus();
      });
    }
    function closeConfigModal() {
      var modal = document.getElementById("configModal");
      if (!modal || modal.classList.contains("hidden")) return;
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
      if (configReturnFocus && configReturnFocus.focus) configReturnFocus.focus();
      configReturnFocus = null;
    }
    if (configToggleBtn) {
      configToggleBtn.addEventListener("click", openConfigModal);
    }
    if (configCloseBtn) {
      configCloseBtn.addEventListener("click", closeConfigModal);
    }
    var configModal = document.getElementById("configModal");
    configModal.addEventListener("keydown", function(event) {
      if (event.key !== "Tab") return;
      var focusable = Array.from(configModal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(function(element) {
        return element.offsetParent !== null;
      });
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    document.addEventListener("keydown", function(event) {
      if (event.key === "Escape") closeConfigModal();
    });
    configModal.addEventListener("click", function(event) {
      if (event.target === configModal) closeConfigModal();
    });
    function selectEnvironment2(envKey) {
      persistSetting(keys.environment, envKey);
      syncSettingsInputs();
      updateHeader();
      renderStatsAll(state.scenario ? state.scenario.iterations : { run: 1, failed: 0 });
      renderFilterAll();
      renderStepsAll();
    }
    if (envSelectHeader) {
      envSelectHeader.addEventListener("change", function(e) {
        selectEnvironment2(e.target.value);
      });
    }
    if (envSelectPanel) {
      envSelectPanel.addEventListener("change", function(e) {
        selectEnvironment2(e.target.value);
      });
    }
    if (saveBtn) {
      saveBtn.addEventListener("click", function() {
        var environment = getSelectedEnvironment();
        var baseUrlInput = document.getElementById("baseUrlInput");
        var baseUrl = String(baseUrlInput.value || "").trim().replace(/\/+$/, "");
        var globals = collectGlobalsFromInput();
        persistSetting(getEnvironmentStorageKey(keys.baseUrl, environment), baseUrl);
        persistSetting(getEnvironmentStorageKey(keys.globals, environment), globals.length ? JSON.stringify(globals) : "");
        persistScenarioVariables();
        updateHeader();
        showSettingsNotice("\u5F53\u524D\u73AF\u5883\u8BBE\u7F6E\u5DF2\u4FDD\u5B58\u5E76\u751F\u6548");
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener("click", function() {
        var environment = getSelectedEnvironment();
        persistSetting(getEnvironmentStorageKey(keys.baseUrl, environment), "");
        persistSetting(getEnvironmentStorageKey(keys.globals, environment), "");
        getScenarioVariableDefinitions().forEach(function(def) {
          persistSetting(getScenarioVariableStorageKey(def.name, environment), "");
        });
        syncSettingsInputs();
        updateHeader();
        showSettingsNotice("\u5F53\u524D\u73AF\u5883\u8986\u76D6\u5DF2\u6E05\u9664\uFF0C\u5DF2\u6062\u590D\u914D\u7F6E\u503C");
      });
    }
  }
  function bindReportActions() {
    function flashCopyFeedback(btn, ok) {
      if (!btn) return;
      if (btn.__copyFeedbackTimer) window.clearTimeout(btn.__copyFeedbackTimer);
      if (btn.__copyOriginalHtml == null) btn.__copyOriginalHtml = btn.innerHTML;
      var label = ok ? "\u5DF2\u590D\u5236" : "\u590D\u5236\u5931\u8D25";
      btn.innerHTML = '<span style="color:' + (ok ? "#059669" : "#dc2626") + ';font-weight:700">' + label + "</span>";
      btn.__copyFeedbackTimer = window.setTimeout(function() {
        btn.innerHTML = btn.__copyOriginalHtml;
        btn.__copyFeedbackTimer = null;
      }, 1500);
    }
    function handleCopy(btn, getText) {
      var report = state.lastReport || uiView.buildOverallReport(state.steps, state.scenario, state.scenarioFile, state.executionMode, getSelectedEnvironment());
      if (!report) return;
      Promise.resolve().then(function() {
        return getText(report);
      }).then(copyText).then(function(ok) {
        flashCopyFeedback(btn, ok);
      }).catch(function() {
        flashCopyFeedback(btn, false);
      });
    }
    document.addEventListener("click", function(event) {
      var target = event.target;
      if (!target || !target.closest) return;
      var mdBtn = target.closest("#copyReportMarkdownBtn") || target.closest("#copyDiagnosisMarkdownBtn");
      if (mdBtn) {
        event.preventDefault();
        handleCopy(mdBtn, function(report) {
          return uiView.buildMarkdownReport(report);
        });
        return;
      }
      var jsonBtn = target.closest("#copyReportJsonBtn") || target.closest("#copyDiagnosisJsonBtn");
      if (jsonBtn) {
        event.preventDefault();
        handleCopy(jsonBtn, function(report) {
          return safeJson(report);
        });
        return;
      }
    });
  }
  function bindStepCopyActions() {
    var ul = document.getElementById("stepsList");
    if (!ul) return;
    ul.addEventListener("click", function(event) {
      var button = event.target && event.target.closest ? event.target.closest("[data-copy-step]") : null;
      if (!button) return;
      var index = Number(button.getAttribute("data-copy-step"));
      if (!Number.isInteger(index)) return;
      var step = state.scenario && Array.isArray(state.scenario.steps) ? state.scenario.steps[index] : null;
      if (!step) return;
      var text = (step.name ? step.name : "\u6B65\u9AA4 " + (index + 1)) + "\n" + String(step.method || "GET").toUpperCase() + " " + (step.path || "");
      Promise.resolve().then(function() {
        return copyText(text);
      }).then(function(ok) {
        showStepCopyFeedback(button, ok);
      }).catch(function() {
        showStepCopyFeedback(button, false);
      });
    });
    function showStepCopyFeedback(button, ok) {
      if (button.__copyFeedbackTimer) window.clearTimeout(button.__copyFeedbackTimer);
      if (button.__copyOriginalText == null) button.__copyOriginalText = button.textContent;
      button.textContent = ok ? "\u5DF2\u590D\u5236" : "\u5931\u8D25";
      button.__copyFeedbackTimer = window.setTimeout(function() {
        button.textContent = button.__copyOriginalText;
        button.__copyFeedbackTimer = null;
      }, 1500);
    }
  }
  function generateStepCurl(step, stepIndex) {
    if (!step) return "";
    var method = String(step.method || step.request && step.request.method || "GET").toUpperCase();
    var baseUrl = getRequestBaseUrl();
    var rawVars = Object.assign({}, getConfiguredScenarioVariables(), getStoredScenarioVariables());
    var resolvedVars = clone2(rawVars);
    if (state.activeRuntime && state.activeRuntime.vars) {
      Object.assign(resolvedVars, state.activeRuntime.vars);
    } else if (state.stepRuntime && state.stepRuntime.vars) {
      Object.assign(resolvedVars, state.stepRuntime.vars);
    }
    var runtime = { vars: resolvedVars };
    var stepPath = step.path || step.request && step.request.path || "";
    var stepParams = step.params || step.request && step.request.params;
    var requestPath = buildUrl(stepPath, stepParams, runtime);
    var globals = getEffectiveGlobals();
    var headers = {};
    var queryIndex = requestPath.indexOf("?");
    var existingKeys = /* @__PURE__ */ new Set();
    if (queryIndex >= 0) {
      requestPath.slice(queryIndex + 1).split("&").forEach(function(pair) {
        var key = pair.split("=")[0];
        if (key) existingKeys.add(decodeURIComponent(key));
      });
    }
    var queryPairs = [];
    globals.forEach(function(global) {
      if (global.type !== "query" || existingKeys.has(global.name)) return;
      queryPairs.push(encodeURIComponent(global.name) + "=" + encodeURIComponent(String(resolveString(global.value, runtime))));
    });
    if (queryPairs.length) {
      requestPath += (queryIndex >= 0 ? "&" : "?") + queryPairs.join("&");
    }
    var cookieParts = globals.filter(function(global) {
      return global.type === "cookie";
    }).map(function(global) {
      return global.name + "=" + resolveString(global.value, runtime);
    });
    globals.forEach(function(g) {
      if (g.type === "header" && g.name) {
        headers[g.name] = resolveString(g.value || "", runtime);
      }
    });
    if (step.request && step.request.headers) {
      var reqHeaders = step.request.headers;
      if (typeof reqHeaders === "object" && reqHeaders !== null) {
        Object.keys(reqHeaders).forEach(function(k) {
          headers[k] = resolveString(String(reqHeaders[k]), runtime);
        });
      }
    }
    if (cookieParts.length) {
      var cookieKey = Object.keys(headers).find(function(key) {
        return key.toLowerCase() === "cookie";
      });
      var mergedCookie = cookieKey ? headers[cookieKey] + "; " + cookieParts.join("; ") : cookieParts.join("; ");
      if (cookieKey) headers[cookieKey] = mergedCookie;
      else headers.Cookie = mergedCookie;
    }
    var fullUrl = joinUrl(baseUrl, requestPath);
    var parts = ["curl -X " + method + ' "' + fullUrl + '"'];
    Object.keys(headers).forEach(function(key) {
      parts.push('-H "' + key + ": " + String(headers[key]).replace(/"/g, '\\"') + '"');
    });
    if (step.request && step.request.body != null) {
      var bodyVal = step.request.body;
      var bodyStr = typeof bodyVal === "string" ? bodyVal : JSON.stringify(bodyVal);
      bodyStr = resolveString(bodyStr, runtime);
      parts.push("-d '" + bodyStr.replace(/'/g, "'\\''") + "'");
    }
    return parts.join(" \\\n  ");
  }
  function bindStepCurlActions() {
    var ul = document.getElementById("stepsList");
    if (!ul) return;
    ul.addEventListener("click", function(event) {
      var button = event.target && event.target.closest ? event.target.closest("[data-curl-step]") : null;
      if (!button) return;
      var index = Number(button.getAttribute("data-curl-step"));
      if (!Number.isInteger(index)) return;
      var step = state.scenario && Array.isArray(state.scenario.steps) ? state.scenario.steps[index] : null;
      if (!step) return;
      var curlCmd = generateStepCurl(step, index);
      Promise.resolve().then(function() {
        return copyText(curlCmd);
      }).then(function(ok) {
        if (button.__copyFeedbackTimer) window.clearTimeout(button.__copyFeedbackTimer);
        if (button.__copyOriginalText == null) button.__copyOriginalText = button.textContent;
        button.textContent = ok ? "\u5DF2\u590D\u5236" : "\u5931\u8D25";
        button.__copyFeedbackTimer = window.setTimeout(function() {
          button.textContent = button.__copyOriginalText;
          button.__copyFeedbackTimer = null;
        }, 1500);
      }).catch(function() {
        button.textContent = "\u5931\u8D25";
      });
    });
  }
  function bindCodeCopyActions() {
    document.addEventListener("click", function(event) {
      var button = event.target && event.target.closest ? event.target.closest("[data-code-copy]") : null;
      if (!button) return;
      var targetId = button.getAttribute("data-code-copy");
      var targetEl = document.getElementById(targetId);
      if (!targetEl) return;
      var text = targetEl.textContent || "";
      Promise.resolve().then(function() {
        return copyText(text);
      }).then(function(ok) {
        if (button.__copyFeedbackTimer) window.clearTimeout(button.__copyFeedbackTimer);
        if (button.__copyOriginalText == null) button.__copyOriginalText = button.textContent;
        button.textContent = ok ? "\u5DF2\u590D\u5236" : "\u590D\u5236\u5931\u8D25";
        button.classList.toggle("code-copy-btn--success", ok);
        button.__copyFeedbackTimer = window.setTimeout(function() {
          button.textContent = button.__copyOriginalText;
          button.classList.remove("code-copy-btn--success");
          button.__copyFeedbackTimer = null;
        }, 1500);
      }).catch(function() {
        button.textContent = "\u590D\u5236\u5931\u8D25";
      });
    });
  }
  function bindGlobalShortcuts() {
    document.addEventListener("keydown", function(event) {
      if (event.defaultPrevented || event.isComposing) return;
      if (document.querySelector('#scenario-test-root [role="dialog"][aria-hidden="false"], #scenario-test-root .custom-dropdown.open')) return;
      var activeEl = document.activeElement;
      var isEditing = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.tagName === "SELECT" || activeEl.tagName === "BUTTON" || activeEl.isContentEditable);
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        var runBtn = document.getElementById("runBtn");
        if (runBtn && !runBtn.disabled) runBtn.click();
        return;
      }
      if (event.key === "Enter" && event.altKey) {
        event.preventDefault();
        var stepBtn = document.getElementById("stepBtn");
        if (stepBtn && !stepBtn.disabled) stepBtn.click();
        return;
      }
      if ((event.key === "r" || event.key === "R") && event.altKey) {
        event.preventDefault();
        var resetBtn = document.getElementById("resetBtn");
        if (resetBtn && !resetBtn.disabled) resetBtn.click();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" || !isEditing && event.key === "/") {
        event.preventDefault();
        var searchInput = document.getElementById("scenarioSearchInput");
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }
      if (!isEditing) {
        if (event.key === " " || event.code === "Space") {
          event.preventDefault();
          var stepBtn2 = document.getElementById("stepBtn");
          if (stepBtn2 && !stepBtn2.disabled) stepBtn2.click();
          return;
        }
      }
    });
  }
  function extractScenarioDisplayName(sourceText) {
    var text = String(sourceText || "");
    var head = text;
    var stepsAt = text.search(/\n\s*steps\s*:/);
    if (stepsAt >= 0) head = text.slice(0, stepsAt);
    var m = head.match(/\bname\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (m) return m[1].replace(/\\"/g, '"');
    m = head.match(/\bname\s*:\s*'((?:[^'\\]|\\.)*)'/);
    if (m) return m[1].replace(/\\'/g, "'");
    return null;
  }
  async function enrichDiscoveredScenarioNames() {
    var list = state.discoveredFiles;
    if (!list || !list.length) return;
    if (window.location.protocol === "file:") return;
    var results = await Promise.all(
      list.map(async function(item, i) {
        var path7 = String(item.file || "").replace(/^\.\//, "");
        if (!path7) return { i, displayName: null };
        var url = "./" + path7 + (path7.indexOf("?") >= 0 ? "&" : "?") + "ts=" + Date.now();
        try {
          var response = await fetch(url);
          if (!response.ok) throw new Error("fetch " + path7);
          var text = await response.text();
          return { i, displayName: extractScenarioDisplayName(text) };
        } catch (error) {
          return { i, displayName: null };
        }
      })
    );
    results.forEach(function(r) {
      var row = list[r.i];
      if (!row) return;
      if (r.displayName) {
        row.name = r.displayName;
      } else if (!row.name) {
        row.name = row.file;
      }
    });
  }
  async function fetchDiscoveredScenarios() {
    var cfg = appConfig;
    if (!Array.isArray(cfg.scenarios) || cfg.scenarios.length === 0) {
      return;
    }
    state.discoveredFiles = cfg.scenarios.map(function(entry) {
      if (typeof entry === "string") {
        return { name: entry, file: entry };
      }
      return {
        name: entry.name || entry.file || "",
        file: entry.file || entry.path || entry.url || ""
      };
    });
    await enrichDiscoveredScenarioNames();
    renderScenarioSelect();
  }
  function setScenarioQuery(file) {
    var url = new URL(window.location.href);
    url.searchParams.set("scenario", file);
    window.history.replaceState({}, "", url.toString());
  }
  function loadScenario(file) {
    return new Promise(function(resolveLoad, rejectLoad) {
      if (!file) {
        rejectLoad(new Error("\u672A\u6307\u5B9A\u6587\u4EF6"));
        return;
      }
      var known = (appConfig.scenarios || []).some(function(entry) {
        return entry && ["url", "file", "path"].some(function(key) {
          return entry[key] === file;
        });
      });
      if (!known) {
        rejectLoad(new Error("\u573A\u666F\u6587\u4EF6\u4E0D\u5728\u914D\u7F6E\u6E05\u5355\u4E2D\uFF0C\u5DF2\u62D2\u7EDD\u52A0\u8F7D: " + file));
        return;
      }
      if (state.scenarioScript) {
        state.scenarioScript.remove();
        state.scenarioScript = null;
      }
      var script = document.createElement("script");
      script.src = "./" + file + "?ts=" + Date.now();
      script.onload = function() {
        state.scenarioScript = script;
        state.scenarioFile = file;
        var entry = (appConfig.scenarios || []).filter(function(item) {
          return (item.url || item.file || item.path) === file;
        })[0];
        var scenario = getRegisteredScenario(entry && entry.id);
        if (!scenario) {
          rejectLoad(new Error("\u573A\u666F\u6587\u4EF6\u5FC5\u987B\u901A\u8FC7 ScenarioTest.registerScenario \u6CE8\u518C: " + file));
          return;
        }
        state.scenario = clone2(scenario);
        state.steps = [];
        state.stepRuntime = null;
        state.stepCheckpoints = [];
        state.debugRuntimes = [];
        state.nextStepIndex = 0;
        state.lastReport = null;
        syncSettingsInputs();
        updateHeader();
        renderScenarioSelect();
        renderStatsAll(state.scenario.iterations || { run: 1, failed: 0 });
        renderFilterAll();
        renderStepsAll();
        renderReportPanel();
        setSidePanelTab("stats");
        uiView.setRunState("idle", "\u5F85\u6267\u884C");
        setScenarioQuery(file);
        resolveLoad(state.scenario);
      };
      script.onerror = function() {
        rejectLoad(new Error("\u573A\u666F\u6587\u4EF6\u52A0\u8F7D\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u8DEF\u5F84\u662F\u5426\u6B63\u786E: " + file));
      };
      document.head.appendChild(script);
    });
  }
  function init() {
    uiStyle.injectStyles();
    uiView.buildSkeleton(options.mount);
    uiStyle.applyTheme(getEffectiveTheme());
    bindThemeEvents();
    syncSettingsInputs();
    bindSettingsEvents();
    bindGlobalsEvents();
    bindReportActions();
    bindSidePanelTabs();
    bindStepCopyActions();
    bindStepCurlActions();
    bindCodeCopyActions();
    bindGlobalShortcuts();
    uiAdhoc.bindAdhocRequestEvents(
      function(idx) {
        return state.scenario && Array.isArray(state.scenario.steps) ? state.scenario.steps[idx] : null;
      },
      function(idx) {
        var debugRt = getDebugRuntime(idx);
        if (debugRt) return debugRt;
        var rawVars = Object.assign({}, getConfiguredScenarioVariables(), getStoredScenarioVariables(), state.scenario && state.scenario.vars || {});
        return { vars: rawVars, lastResponse: null, lastResponseBody: null };
      },
      executeStep,
      getSelectedEnvironment,
      getRequestBaseUrl,
      getEffectiveAuthorization,
      getEffectiveGlobals,
      function() {
        var rawVars = Object.assign({}, getConfiguredScenarioVariables(), getStoredScenarioVariables(), state.scenario && state.scenario.vars || {});
        if (state.activeRuntime && state.activeRuntime.vars) {
          Object.assign(rawVars, state.activeRuntime.vars);
        } else if (state.stepRuntime && state.stepRuntime.vars) {
          Object.assign(rawVars, state.stepRuntime.vars);
        }
        return rawVars;
      }
    );
    updateHeader();
    renderScenarioSelect();
    var reportPanel = document.getElementById("reportPanel");
    if (reportPanel) {
      reportPanel.addEventListener("click", function(event) {
        var target = event.target.closest("[data-locate-step-index]");
        if (!target) return;
        var stepIndex = Number(target.dataset.locateStepIndex);
        if (!Number.isInteger(stepIndex) || stepIndex < 0) return;
        locateScenarioStep(stepIndex);
      });
    }
    var stepsList = document.getElementById("stepsList");
    stepsList.addEventListener("click", function(event) {
      var target = event.target.closest("[data-step-action]");
      if (!target) return;
      var stepIndex = Number(target.dataset.stepIndex);
      if (!isFinite(stepIndex) || stepIndex < 0) return;
      if (target.dataset.stepAction === "rewind") rewindToStep(stepIndex);
      if (target.dataset.stepAction === "rerun") rerunStep(stepIndex);
    });
    var scenarioList = document.getElementById("scenarioList");
    scenarioList.addEventListener("click", function(event) {
      if (event.target.closest("[data-clear-scenario-search]")) {
        clearScenarioSearch();
        return;
      }
      var pinTarget = event.target.closest("[data-pin-file]");
      if (pinTarget) {
        toggleScenarioPin(pinTarget.dataset.pinFile);
        return;
      }
      var target = event.target.closest("[data-scenario-file]");
      var file = target && target.dataset.scenarioFile;
      if (!file || state.running || file === state.scenarioFile) return;
      loadScenario(file).catch(function(error) {
        uiView.setRunState("failed", "\u52A0\u8F7D\u5931\u8D25");
        document.getElementById("statsPanel").innerHTML = '<div class="text-sm text-rose-500 p-4">' + esc(error.message) + "</div>";
      });
    });
    var scenarioSearchInput = document.getElementById("scenarioSearchInput");
    scenarioSearchInput.addEventListener("input", function(event) {
      state.scenarioSearch = event.target.value;
      renderScenarioSelect();
    });
    scenarioSearchInput.addEventListener("keydown", function(event) {
      if (event.key === "Escape" && scenarioSearchInput.value) {
        event.preventDefault();
        clearScenarioSearch();
      }
    });
    var scenarioSearchClearButton = document.getElementById("scenarioSearchClearBtn");
    if (scenarioSearchClearButton) scenarioSearchClearButton.addEventListener("click", clearScenarioSearch);
    var varsInputContainer = document.getElementById("scenarioVarsInput");
    if (varsInputContainer) {
      varsInputContainer.addEventListener("click", function(event) {
        var toggleButton = event.target.closest("[data-toggle-var]");
        if (!toggleButton) return;
        var input = document.getElementById("scenarioVar_" + toggleButton.dataset.toggleVar);
        if (!input) return;
        var reveal = input.type === "password";
        input.type = reveal ? "text" : "password";
        toggleButton.textContent = reveal ? "\u9690\u85CF" : "\u663E\u793A";
      });
    }
    document.getElementById("runBtn").addEventListener("click", runScenario2);
    document.getElementById("stepBtn").addEventListener("click", runNextStep);
    document.getElementById("resetBtn").addEventListener("click", resetExecution);
    document.getElementById("cancelBtn").addEventListener("click", cancelExecution);
    function tryLoadInitial() {
      var initial = new URLSearchParams(window.location.search).get("scenario");
      if (!initial && state.discoveredFiles && state.discoveredFiles.length > 0) {
        initial = state.discoveredFiles[0].file;
      }
      if (!initial) {
        document.getElementById("statsPanel").innerHTML = '<div class="text-sm text-slate-500 p-4">\u8BF7\u5728 URL \u4E2D\u63D0\u4F9B ?scenario=scenarios/xxx.js \u8BBF\u95EE\uFF0C\u6216\u8005\u5728\u4E0A\u65B9\u9009\u62E9\u52A0\u8F7D\u3002</div>';
        return;
      }
      loadScenario(initial).catch(function(error) {
        uiView.setRunState("failed", "\u52A0\u8F7D\u5931\u8D25");
        document.getElementById("statsPanel").innerHTML = '<div class="text-sm text-rose-500 p-4">' + esc(error.message) + "</div>";
      });
    }
    fetchDiscoveredScenarios().then(tryLoadInitial).catch(function(e) {
      console.warn(e);
      tryLoadInitial();
    });
  }
  init();
  return {
    loadScenario,
    runAll: runScenario2,
    runNext: runNextStep,
    reset: resetExecution,
    cancel: cancelExecution,
    rewindToStep,
    rerunStep,
    getState: function() {
      return state;
    }
  };
}

// src/browser/tailwind.generated.js
var TAILWIND_CSS = '/*! tailwindcss v4.3.3 | MIT License | https://tailwindcss.com */\n@layer properties;\n@layer theme, base, components, utilities;\n@layer theme {\n  :root, :host {\n    --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",\n      "Noto Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji",\n      "Segoe UI Symbol", "Noto Color Emoji";\n    --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",\n      "Courier New", monospace;\n    --color-amber-50: oklch(98.7% 0.022 95.277);\n    --color-amber-200: oklch(92.4% 0.12 95.746);\n    --color-amber-400: oklch(82.8% 0.189 84.429);\n    --color-amber-600: oklch(66.6% 0.179 58.318);\n    --color-yellow-50: oklch(98.7% 0.026 102.212);\n    --color-yellow-200: oklch(94.5% 0.129 101.54);\n    --color-yellow-600: oklch(68.1% 0.162 75.834);\n    --color-emerald-50: oklch(97.9% 0.021 166.113);\n    --color-emerald-100: oklch(95% 0.052 163.051);\n    --color-emerald-200: oklch(90.5% 0.093 164.15);\n    --color-emerald-400: oklch(76.5% 0.177 163.223);\n    --color-emerald-500: oklch(69.6% 0.17 162.48);\n    --color-emerald-600: oklch(59.6% 0.145 163.225);\n    --color-emerald-700: oklch(50.8% 0.118 165.612);\n    --color-blue-50: oklch(97% 0.014 254.604);\n    --color-blue-200: oklch(88.2% 0.059 254.128);\n    --color-blue-500: oklch(62.3% 0.214 259.815);\n    --color-blue-600: oklch(54.6% 0.245 262.881);\n    --color-blue-900: oklch(37.9% 0.146 265.522);\n    --color-indigo-50: oklch(96.2% 0.018 272.314);\n    --color-indigo-200: oklch(87% 0.065 274.039);\n    --color-indigo-500: oklch(58.5% 0.233 277.117);\n    --color-indigo-600: oklch(51.1% 0.262 276.966);\n    --color-rose-50: oklch(96.9% 0.015 12.422);\n    --color-rose-100: oklch(94.1% 0.03 12.58);\n    --color-rose-200: oklch(89.2% 0.058 10.001);\n    --color-rose-500: oklch(64.5% 0.246 16.439);\n    --color-rose-600: oklch(58.6% 0.253 17.585);\n    --color-rose-700: oklch(51.4% 0.222 16.935);\n    --color-rose-800: oklch(45.5% 0.188 13.697);\n    --color-rose-900: oklch(41% 0.159 10.272);\n    --color-slate-50: oklch(98.4% 0.003 247.858);\n    --color-slate-100: oklch(96.8% 0.007 247.896);\n    --color-slate-200: oklch(92.9% 0.013 255.508);\n    --color-slate-300: oklch(86.9% 0.022 252.894);\n    --color-slate-400: oklch(70.4% 0.04 256.788);\n    --color-slate-500: oklch(55.4% 0.046 257.417);\n    --color-slate-600: oklch(44.6% 0.043 257.281);\n    --color-slate-700: oklch(37.2% 0.044 257.287);\n    --color-slate-800: oklch(27.9% 0.041 260.031);\n    --color-slate-900: oklch(20.8% 0.042 265.755);\n    --color-slate-950: oklch(12.9% 0.042 264.695);\n    --color-gray-200: oklch(92.8% 0.006 264.531);\n    --color-white: #fff;\n    --spacing: 0.25rem;\n    --container-xl: 36rem;\n    --container-3xl: 48rem;\n    --text-xs: 0.75rem;\n    --text-xs--line-height: calc(1 / 0.75);\n    --text-sm: 0.875rem;\n    --text-sm--line-height: calc(1.25 / 0.875);\n    --text-base: 1rem;\n    --text-base--line-height: calc(1.5 / 1);\n    --font-weight-normal: 400;\n    --font-weight-medium: 500;\n    --font-weight-semibold: 600;\n    --font-weight-bold: 700;\n    --tracking-tight: -0.025em;\n    --tracking-normal: 0em;\n    --tracking-wider: 0.05em;\n    --leading-tight: 1.25;\n    --leading-snug: 1.375;\n    --leading-relaxed: 1.625;\n    --radius-md: 0.375rem;\n    --radius-lg: 0.5rem;\n    --radius-xl: 0.75rem;\n    --default-transition-duration: 150ms;\n    --default-transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);\n    --default-font-family: var(--font-sans);\n    --default-mono-font-family: var(--font-mono);\n  }\n}\n@layer base {\n  *, ::after, ::before, ::backdrop, ::file-selector-button {\n    box-sizing: border-box;\n    margin: 0;\n    padding: 0;\n    border: 0 solid;\n  }\n  html, :host {\n    line-height: 1.5;\n    -webkit-text-size-adjust: 100%;\n    tab-size: 4;\n    font-family: var(--default-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji");\n    font-feature-settings: var(--default-font-feature-settings, normal);\n    font-variation-settings: var(--default-font-variation-settings, normal);\n    -webkit-tap-highlight-color: transparent;\n  }\n  hr {\n    height: 0;\n    color: inherit;\n    border-top-width: 1px;\n  }\n  abbr:where([title]) {\n    -webkit-text-decoration: underline dotted;\n    text-decoration: underline dotted;\n  }\n  h1, h2, h3, h4, h5, h6 {\n    font-size: inherit;\n    font-weight: inherit;\n  }\n  a {\n    color: inherit;\n    -webkit-text-decoration: inherit;\n    text-decoration: inherit;\n  }\n  b, strong {\n    font-weight: bolder;\n  }\n  code, kbd, samp, pre {\n    font-family: var(--default-mono-font-family, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace);\n    font-feature-settings: var(--default-mono-font-feature-settings, normal);\n    font-variation-settings: var(--default-mono-font-variation-settings, normal);\n    font-size: 1em;\n  }\n  small {\n    font-size: 80%;\n  }\n  sub, sup {\n    font-size: 75%;\n    line-height: 0;\n    position: relative;\n    vertical-align: baseline;\n  }\n  sub {\n    bottom: -0.25em;\n  }\n  sup {\n    top: -0.5em;\n  }\n  table {\n    text-indent: 0;\n    border-color: inherit;\n    border-collapse: collapse;\n  }\n  :-moz-focusring:where(:not(iframe)) {\n    outline: auto;\n  }\n  progress {\n    vertical-align: baseline;\n  }\n  summary {\n    display: list-item;\n  }\n  ol, ul, menu {\n    list-style: none;\n  }\n  img, svg, video, canvas, audio, iframe, embed, object {\n    display: block;\n    vertical-align: middle;\n  }\n  img, video {\n    max-width: 100%;\n    height: auto;\n  }\n  button, input, select, optgroup, textarea, ::file-selector-button {\n    font: inherit;\n    font-feature-settings: inherit;\n    font-variation-settings: inherit;\n    letter-spacing: inherit;\n    color: inherit;\n    border-radius: 0;\n    background-color: transparent;\n    opacity: 1;\n  }\n  :where(select:is([multiple], [size])) optgroup {\n    font-weight: bolder;\n  }\n  :where(select:is([multiple], [size])) optgroup option {\n    padding-inline-start: 20px;\n  }\n  ::file-selector-button {\n    margin-inline-end: 4px;\n  }\n  ::placeholder {\n    opacity: 1;\n  }\n  @supports (not (-webkit-appearance: -apple-pay-button))  or (contain-intrinsic-size: 1px) {\n    ::placeholder {\n      color: currentcolor;\n      @supports (color: color-mix(in lab, red, red)) {\n        color: color-mix(in oklab, currentcolor 50%, transparent);\n      }\n    }\n  }\n  textarea {\n    resize: vertical;\n  }\n  ::-webkit-search-decoration {\n    -webkit-appearance: none;\n  }\n  ::-webkit-date-and-time-value {\n    min-height: 1lh;\n    text-align: inherit;\n  }\n  ::-webkit-datetime-edit {\n    display: inline-flex;\n  }\n  ::-webkit-datetime-edit-fields-wrapper {\n    padding: 0;\n  }\n  ::-webkit-datetime-edit, ::-webkit-datetime-edit-year-field, ::-webkit-datetime-edit-month-field, ::-webkit-datetime-edit-day-field, ::-webkit-datetime-edit-hour-field, ::-webkit-datetime-edit-minute-field, ::-webkit-datetime-edit-second-field, ::-webkit-datetime-edit-millisecond-field, ::-webkit-datetime-edit-meridiem-field {\n    padding-block: 0;\n  }\n  ::-webkit-calendar-picker-indicator {\n    line-height: 1;\n  }\n  :-moz-ui-invalid {\n    box-shadow: none;\n  }\n  button, input:where([type="button"], [type="reset"], [type="submit"]), ::file-selector-button {\n    appearance: button;\n  }\n  ::-webkit-inner-spin-button, ::-webkit-outer-spin-button {\n    height: auto;\n  }\n  [hidden]:where(:not([hidden="until-found"])) {\n    display: none !important;\n  }\n}\n@layer utilities {\n  #scenario-test-root .pointer-events-none {\n    pointer-events: none;\n  }\n  #scenario-test-root .visible {\n    visibility: visible;\n  }\n  #scenario-test-root .sr-only {\n    position: absolute;\n    width: 1px;\n    height: 1px;\n    padding: 0;\n    margin: -1px;\n    overflow: hidden;\n    clip-path: inset(50%);\n    white-space: nowrap;\n    border-width: 0;\n  }\n  #scenario-test-root .absolute {\n    position: absolute;\n  }\n  #scenario-test-root .fixed {\n    position: fixed;\n  }\n  #scenario-test-root .relative {\n    position: relative;\n  }\n  #scenario-test-root .sticky {\n    position: sticky;\n  }\n  #scenario-test-root .inset-0 {\n    inset: 0px;\n  }\n  #scenario-test-root .top-0 {\n    top: 0px;\n  }\n  #scenario-test-root .left-2\\.5 {\n    left: calc(var(--spacing) * 2.5);\n  }\n  #scenario-test-root .z-10 {\n    z-index: 10;\n  }\n  #scenario-test-root .z-30 {\n    z-index: 30;\n  }\n  #scenario-test-root .z-40 {\n    z-index: 40;\n  }\n  #scenario-test-root .col-span-2 {\n    grid-column: span 2 / span 2;\n  }\n  #scenario-test-root .container {\n    width: 100%;\n    @media (width >= 40rem) {\n      max-width: 40rem;\n    }\n    @media (width >= 48rem) {\n      max-width: 48rem;\n    }\n    @media (width >= 64rem) {\n      max-width: 64rem;\n    }\n    @media (width >= 80rem) {\n      max-width: 80rem;\n    }\n    @media (width >= 96rem) {\n      max-width: 96rem;\n    }\n  }\n  #scenario-test-root .mx-auto {\n    margin-inline: auto;\n  }\n  #scenario-test-root .my-8 {\n    margin-block: calc(var(--spacing) * 8);\n  }\n  #scenario-test-root .mt-0\\.5 {\n    margin-top: calc(var(--spacing) * 0.5);\n  }\n  #scenario-test-root .mt-1 {\n    margin-top: var(--spacing);\n  }\n  #scenario-test-root .mt-2 {\n    margin-top: calc(var(--spacing) * 2);\n  }\n  #scenario-test-root .mt-3 {\n    margin-top: calc(var(--spacing) * 3);\n  }\n  #scenario-test-root .mt-4 {\n    margin-top: calc(var(--spacing) * 4);\n  }\n  #scenario-test-root .mr-1 {\n    margin-right: var(--spacing);\n  }\n  #scenario-test-root .mr-1\\.5 {\n    margin-right: calc(var(--spacing) * 1.5);\n  }\n  #scenario-test-root .mb-1 {\n    margin-bottom: var(--spacing);\n  }\n  #scenario-test-root .mb-1\\.5 {\n    margin-bottom: calc(var(--spacing) * 1.5);\n  }\n  #scenario-test-root .mb-2 {\n    margin-bottom: calc(var(--spacing) * 2);\n  }\n  #scenario-test-root .mb-3 {\n    margin-bottom: calc(var(--spacing) * 3);\n  }\n  #scenario-test-root .ml-1 {\n    margin-left: var(--spacing);\n  }\n  #scenario-test-root .ml-1\\.5 {\n    margin-left: calc(var(--spacing) * 1.5);\n  }\n  #scenario-test-root .block {\n    display: block;\n  }\n  #scenario-test-root .flex {\n    display: flex;\n  }\n  #scenario-test-root .grid {\n    display: grid;\n  }\n  #scenario-test-root .hidden {\n    display: none;\n  }\n  #scenario-test-root .inline {\n    display: inline;\n  }\n  #scenario-test-root .inline-flex {\n    display: inline-flex;\n  }\n  #scenario-test-root .h-1\\.5 {\n    height: calc(var(--spacing) * 1.5);\n  }\n  #scenario-test-root .h-2 {\n    height: calc(var(--spacing) * 2);\n  }\n  #scenario-test-root .h-3 {\n    height: calc(var(--spacing) * 3);\n  }\n  #scenario-test-root .h-3\\.5 {\n    height: calc(var(--spacing) * 3.5);\n  }\n  #scenario-test-root .h-4 {\n    height: calc(var(--spacing) * 4);\n  }\n  #scenario-test-root .h-5 {\n    height: calc(var(--spacing) * 5);\n  }\n  #scenario-test-root .h-28 {\n    height: calc(var(--spacing) * 28);\n  }\n  #scenario-test-root .h-40 {\n    height: calc(var(--spacing) * 40);\n  }\n  #scenario-test-root .h-full {\n    height: 100%;\n  }\n  #scenario-test-root .max-h-48 {\n    max-height: calc(var(--spacing) * 48);\n  }\n  #scenario-test-root .max-h-\\[85vh\\] {\n    max-height: 85vh;\n  }\n  #scenario-test-root .min-h-0 {\n    min-height: 0px;\n  }\n  #scenario-test-root .w-1\\.5 {\n    width: calc(var(--spacing) * 1.5);\n  }\n  #scenario-test-root .w-1\\/3 {\n    width: calc(1 / 3 * 100%);\n  }\n  #scenario-test-root .w-3 {\n    width: calc(var(--spacing) * 3);\n  }\n  #scenario-test-root .w-3\\.5 {\n    width: calc(var(--spacing) * 3.5);\n  }\n  #scenario-test-root .w-4 {\n    width: calc(var(--spacing) * 4);\n  }\n  #scenario-test-root .w-5 {\n    width: calc(var(--spacing) * 5);\n  }\n  #scenario-test-root .w-16 {\n    width: calc(var(--spacing) * 16);\n  }\n  #scenario-test-root .w-24 {\n    width: calc(var(--spacing) * 24);\n  }\n  #scenario-test-root .w-40 {\n    width: calc(var(--spacing) * 40);\n  }\n  #scenario-test-root .w-full {\n    width: 100%;\n  }\n  #scenario-test-root .max-w-3xl {\n    max-width: var(--container-3xl);\n  }\n  #scenario-test-root .max-w-\\[40\\%\\] {\n    max-width: 40%;\n  }\n  #scenario-test-root .max-w-\\[280px\\] {\n    max-width: 280px;\n  }\n  #scenario-test-root .max-w-full {\n    max-width: 100%;\n  }\n  #scenario-test-root .min-w-0 {\n    min-width: 0px;\n  }\n  #scenario-test-root .flex-1 {\n    flex: 1;\n  }\n  #scenario-test-root .flex-shrink-0 {\n    flex-shrink: 0;\n  }\n  #scenario-test-root .rotate-180 {\n    rotate: 180deg;\n  }\n  #scenario-test-root .cursor-pointer {\n    cursor: pointer;\n  }\n  #scenario-test-root .grid-cols-1 {\n    grid-template-columns: repeat(1, minmax(0, 1fr));\n  }\n  #scenario-test-root .grid-cols-2 {\n    grid-template-columns: repeat(2, minmax(0, 1fr));\n  }\n  #scenario-test-root .flex-col {\n    flex-direction: column;\n  }\n  #scenario-test-root .flex-wrap {\n    flex-wrap: wrap;\n  }\n  #scenario-test-root .items-center {\n    align-items: center;\n  }\n  #scenario-test-root .items-start {\n    align-items: flex-start;\n  }\n  #scenario-test-root .justify-between {\n    justify-content: space-between;\n  }\n  #scenario-test-root .justify-center {\n    justify-content: center;\n  }\n  #scenario-test-root .justify-end {\n    justify-content: flex-end;\n  }\n  #scenario-test-root .gap-1 {\n    gap: var(--spacing);\n  }\n  #scenario-test-root .gap-1\\.5 {\n    gap: calc(var(--spacing) * 1.5);\n  }\n  #scenario-test-root .gap-2 {\n    gap: calc(var(--spacing) * 2);\n  }\n  #scenario-test-root .gap-3 {\n    gap: calc(var(--spacing) * 3);\n  }\n  #scenario-test-root .gap-4 {\n    gap: calc(var(--spacing) * 4);\n  }\n  #scenario-test-root :where(.space-y-1 > :not(:last-child)) {\n    --tw-space-y-reverse: 0;\n    margin-block-start: calc(var(--spacing) * var(--tw-space-y-reverse));\n    margin-block-end: calc(var(--spacing) * calc(1 - var(--tw-space-y-reverse)));\n  }\n  #scenario-test-root :where(.space-y-1\\.5 > :not(:last-child)) {\n    --tw-space-y-reverse: 0;\n    margin-block-start: calc(calc(var(--spacing) * 1.5) * var(--tw-space-y-reverse));\n    margin-block-end: calc(calc(var(--spacing) * 1.5) * calc(1 - var(--tw-space-y-reverse)));\n  }\n  #scenario-test-root :where(.space-y-2 > :not(:last-child)) {\n    --tw-space-y-reverse: 0;\n    margin-block-start: calc(calc(var(--spacing) * 2) * var(--tw-space-y-reverse));\n    margin-block-end: calc(calc(var(--spacing) * 2) * calc(1 - var(--tw-space-y-reverse)));\n  }\n  #scenario-test-root :where(.space-y-3 > :not(:last-child)) {\n    --tw-space-y-reverse: 0;\n    margin-block-start: calc(calc(var(--spacing) * 3) * var(--tw-space-y-reverse));\n    margin-block-end: calc(calc(var(--spacing) * 3) * calc(1 - var(--tw-space-y-reverse)));\n  }\n  #scenario-test-root :where(.space-y-4 > :not(:last-child)) {\n    --tw-space-y-reverse: 0;\n    margin-block-start: calc(calc(var(--spacing) * 4) * var(--tw-space-y-reverse));\n    margin-block-end: calc(calc(var(--spacing) * 4) * calc(1 - var(--tw-space-y-reverse)));\n  }\n  #scenario-test-root :where(.space-x-1\\.5 > :not(:last-child)) {\n    --tw-space-x-reverse: 0;\n    margin-inline-start: calc(calc(var(--spacing) * 1.5) * var(--tw-space-x-reverse));\n    margin-inline-end: calc(calc(var(--spacing) * 1.5) * calc(1 - var(--tw-space-x-reverse)));\n  }\n  #scenario-test-root :where(.space-x-2 > :not(:last-child)) {\n    --tw-space-x-reverse: 0;\n    margin-inline-start: calc(calc(var(--spacing) * 2) * var(--tw-space-x-reverse));\n    margin-inline-end: calc(calc(var(--spacing) * 2) * calc(1 - var(--tw-space-x-reverse)));\n  }\n  #scenario-test-root :where(.space-x-2\\.5 > :not(:last-child)) {\n    --tw-space-x-reverse: 0;\n    margin-inline-start: calc(calc(var(--spacing) * 2.5) * var(--tw-space-x-reverse));\n    margin-inline-end: calc(calc(var(--spacing) * 2.5) * calc(1 - var(--tw-space-x-reverse)));\n  }\n  #scenario-test-root :where(.divide-y > :not(:last-child)) {\n    --tw-divide-y-reverse: 0;\n    border-bottom-style: var(--tw-border-style);\n    border-top-style: var(--tw-border-style);\n    border-top-width: calc(1px * var(--tw-divide-y-reverse));\n    border-bottom-width: calc(1px * calc(1 - var(--tw-divide-y-reverse)));\n  }\n  #scenario-test-root :where(.divide-slate-100 > :not(:last-child)) {\n    border-color: var(--color-slate-100);\n  }\n  #scenario-test-root .truncate {\n    overflow: hidden;\n    text-overflow: ellipsis;\n    white-space: nowrap;\n  }\n  #scenario-test-root .overflow-hidden {\n    overflow: hidden;\n  }\n  #scenario-test-root .overflow-x-auto {\n    overflow-x: auto;\n  }\n  #scenario-test-root .overflow-y-auto {\n    overflow-y: auto;\n  }\n  #scenario-test-root .rounded {\n    border-radius: 0.25rem;\n  }\n  #scenario-test-root .rounded-full {\n    border-radius: calc(infinity * 1px);\n  }\n  #scenario-test-root .rounded-lg {\n    border-radius: var(--radius-lg);\n  }\n  #scenario-test-root .rounded-md {\n    border-radius: var(--radius-md);\n  }\n  #scenario-test-root .rounded-xl {\n    border-radius: var(--radius-xl);\n  }\n  #scenario-test-root .border {\n    border-style: var(--tw-border-style);\n    border-width: 1px;\n  }\n  #scenario-test-root .border-t {\n    border-top-style: var(--tw-border-style);\n    border-top-width: 1px;\n  }\n  #scenario-test-root .border-r {\n    border-right-style: var(--tw-border-style);\n    border-right-width: 1px;\n  }\n  #scenario-test-root .border-b {\n    border-bottom-style: var(--tw-border-style);\n    border-bottom-width: 1px;\n  }\n  #scenario-test-root .border-l {\n    border-left-style: var(--tw-border-style);\n    border-left-width: 1px;\n  }\n  #scenario-test-root .border-dashed {\n    --tw-border-style: dashed;\n    border-style: dashed;\n  }\n  #scenario-test-root .border-amber-200 {\n    border-color: var(--color-amber-200);\n  }\n  #scenario-test-root .border-amber-200\\/80 {\n    border-color: color-mix(in srgb, oklch(92.4% 0.12 95.746) 80%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      border-color: color-mix(in oklab, var(--color-amber-200) 80%, transparent);\n    }\n  }\n  #scenario-test-root .border-blue-200 {\n    border-color: var(--color-blue-200);\n  }\n  #scenario-test-root .border-blue-200\\/90 {\n    border-color: color-mix(in srgb, oklch(88.2% 0.059 254.128) 90%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      border-color: color-mix(in oklab, var(--color-blue-200) 90%, transparent);\n    }\n  }\n  #scenario-test-root .border-emerald-200 {\n    border-color: var(--color-emerald-200);\n  }\n  #scenario-test-root .border-emerald-200\\/80 {\n    border-color: color-mix(in srgb, oklch(90.5% 0.093 164.15) 80%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      border-color: color-mix(in oklab, var(--color-emerald-200) 80%, transparent);\n    }\n  }\n  #scenario-test-root .border-indigo-200\\/80 {\n    border-color: color-mix(in srgb, oklch(87% 0.065 274.039) 80%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      border-color: color-mix(in oklab, var(--color-indigo-200) 80%, transparent);\n    }\n  }\n  #scenario-test-root .border-rose-100 {\n    border-color: var(--color-rose-100);\n  }\n  #scenario-test-root .border-rose-200 {\n    border-color: var(--color-rose-200);\n  }\n  #scenario-test-root .border-rose-200\\/60 {\n    border-color: color-mix(in srgb, oklch(89.2% 0.058 10.001) 60%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      border-color: color-mix(in oklab, var(--color-rose-200) 60%, transparent);\n    }\n  }\n  #scenario-test-root .border-rose-200\\/80 {\n    border-color: color-mix(in srgb, oklch(89.2% 0.058 10.001) 80%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      border-color: color-mix(in oklab, var(--color-rose-200) 80%, transparent);\n    }\n  }\n  #scenario-test-root .border-slate-100 {\n    border-color: var(--color-slate-100);\n  }\n  #scenario-test-root .border-slate-200 {\n    border-color: var(--color-slate-200);\n  }\n  #scenario-test-root .border-slate-200\\/50 {\n    border-color: color-mix(in srgb, oklch(92.9% 0.013 255.508) 50%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      border-color: color-mix(in oklab, var(--color-slate-200) 50%, transparent);\n    }\n  }\n  #scenario-test-root .border-slate-200\\/60 {\n    border-color: color-mix(in srgb, oklch(92.9% 0.013 255.508) 60%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      border-color: color-mix(in oklab, var(--color-slate-200) 60%, transparent);\n    }\n  }\n  #scenario-test-root .border-slate-200\\/70 {\n    border-color: color-mix(in srgb, oklch(92.9% 0.013 255.508) 70%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      border-color: color-mix(in oklab, var(--color-slate-200) 70%, transparent);\n    }\n  }\n  #scenario-test-root .border-slate-200\\/80 {\n    border-color: color-mix(in srgb, oklch(92.9% 0.013 255.508) 80%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      border-color: color-mix(in oklab, var(--color-slate-200) 80%, transparent);\n    }\n  }\n  #scenario-test-root .border-slate-300 {\n    border-color: var(--color-slate-300);\n  }\n  #scenario-test-root .border-slate-300\\/60 {\n    border-color: color-mix(in srgb, oklch(86.9% 0.022 252.894) 60%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      border-color: color-mix(in oklab, var(--color-slate-300) 60%, transparent);\n    }\n  }\n  #scenario-test-root .border-slate-300\\/80 {\n    border-color: color-mix(in srgb, oklch(86.9% 0.022 252.894) 80%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      border-color: color-mix(in oklab, var(--color-slate-300) 80%, transparent);\n    }\n  }\n  #scenario-test-root .border-slate-600 {\n    border-color: var(--color-slate-600);\n  }\n  #scenario-test-root .border-slate-700 {\n    border-color: var(--color-slate-700);\n  }\n  #scenario-test-root .border-slate-700\\/80 {\n    border-color: color-mix(in srgb, oklch(37.2% 0.044 257.287) 80%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      border-color: color-mix(in oklab, var(--color-slate-700) 80%, transparent);\n    }\n  }\n  #scenario-test-root .border-slate-800 {\n    border-color: var(--color-slate-800);\n  }\n  #scenario-test-root .border-slate-800\\/80 {\n    border-color: color-mix(in srgb, oklch(27.9% 0.041 260.031) 80%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      border-color: color-mix(in oklab, var(--color-slate-800) 80%, transparent);\n    }\n  }\n  #scenario-test-root .border-transparent {\n    border-color: transparent;\n  }\n  #scenario-test-root .border-yellow-200\\/80 {\n    border-color: color-mix(in srgb, oklch(94.5% 0.129 101.54) 80%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      border-color: color-mix(in oklab, var(--color-yellow-200) 80%, transparent);\n    }\n  }\n  #scenario-test-root .bg-amber-50 {\n    background-color: var(--color-amber-50);\n  }\n  #scenario-test-root .bg-amber-400 {\n    background-color: var(--color-amber-400);\n  }\n  #scenario-test-root .bg-blue-50 {\n    background-color: var(--color-blue-50);\n  }\n  #scenario-test-root .bg-blue-50\\/80 {\n    background-color: color-mix(in srgb, oklch(97% 0.014 254.604) 80%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      background-color: color-mix(in oklab, var(--color-blue-50) 80%, transparent);\n    }\n  }\n  #scenario-test-root .bg-emerald-50 {\n    background-color: var(--color-emerald-50);\n  }\n  #scenario-test-root .bg-emerald-50\\/60 {\n    background-color: color-mix(in srgb, oklch(97.9% 0.021 166.113) 60%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      background-color: color-mix(in oklab, var(--color-emerald-50) 60%, transparent);\n    }\n  }\n  #scenario-test-root .bg-emerald-100 {\n    background-color: var(--color-emerald-100);\n  }\n  #scenario-test-root .bg-emerald-500 {\n    background-color: var(--color-emerald-500);\n  }\n  #scenario-test-root .bg-emerald-600 {\n    background-color: var(--color-emerald-600);\n  }\n  #scenario-test-root .bg-indigo-50 {\n    background-color: var(--color-indigo-50);\n  }\n  #scenario-test-root .bg-rose-50 {\n    background-color: var(--color-rose-50);\n  }\n  #scenario-test-root .bg-rose-50\\/40 {\n    background-color: color-mix(in srgb, oklch(96.9% 0.015 12.422) 40%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      background-color: color-mix(in oklab, var(--color-rose-50) 40%, transparent);\n    }\n  }\n  #scenario-test-root .bg-rose-50\\/60 {\n    background-color: color-mix(in srgb, oklch(96.9% 0.015 12.422) 60%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      background-color: color-mix(in oklab, var(--color-rose-50) 60%, transparent);\n    }\n  }\n  #scenario-test-root .bg-rose-50\\/80 {\n    background-color: color-mix(in srgb, oklch(96.9% 0.015 12.422) 80%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      background-color: color-mix(in oklab, var(--color-rose-50) 80%, transparent);\n    }\n  }\n  #scenario-test-root .bg-rose-500 {\n    background-color: var(--color-rose-500);\n  }\n  #scenario-test-root .bg-slate-50 {\n    background-color: var(--color-slate-50);\n  }\n  #scenario-test-root .bg-slate-50\\/50 {\n    background-color: color-mix(in srgb, oklch(98.4% 0.003 247.858) 50%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      background-color: color-mix(in oklab, var(--color-slate-50) 50%, transparent);\n    }\n  }\n  #scenario-test-root .bg-slate-50\\/60 {\n    background-color: color-mix(in srgb, oklch(98.4% 0.003 247.858) 60%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      background-color: color-mix(in oklab, var(--color-slate-50) 60%, transparent);\n    }\n  }\n  #scenario-test-root .bg-slate-50\\/70 {\n    background-color: color-mix(in srgb, oklch(98.4% 0.003 247.858) 70%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      background-color: color-mix(in oklab, var(--color-slate-50) 70%, transparent);\n    }\n  }\n  #scenario-test-root .bg-slate-100 {\n    background-color: var(--color-slate-100);\n  }\n  #scenario-test-root .bg-slate-100\\/80 {\n    background-color: color-mix(in srgb, oklch(96.8% 0.007 247.896) 80%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      background-color: color-mix(in oklab, var(--color-slate-100) 80%, transparent);\n    }\n  }\n  #scenario-test-root .bg-slate-200\\/80 {\n    background-color: color-mix(in srgb, oklch(92.9% 0.013 255.508) 80%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      background-color: color-mix(in oklab, var(--color-slate-200) 80%, transparent);\n    }\n  }\n  #scenario-test-root .bg-slate-300 {\n    background-color: var(--color-slate-300);\n  }\n  #scenario-test-root .bg-slate-400 {\n    background-color: var(--color-slate-400);\n  }\n  #scenario-test-root .bg-slate-700 {\n    background-color: var(--color-slate-700);\n  }\n  #scenario-test-root .bg-slate-800 {\n    background-color: var(--color-slate-800);\n  }\n  #scenario-test-root .bg-slate-900 {\n    background-color: var(--color-slate-900);\n  }\n  #scenario-test-root .bg-slate-950 {\n    background-color: var(--color-slate-950);\n  }\n  #scenario-test-root .bg-slate-950\\/30 {\n    background-color: color-mix(in srgb, oklch(12.9% 0.042 264.695) 30%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      background-color: color-mix(in oklab, var(--color-slate-950) 30%, transparent);\n    }\n  }\n  #scenario-test-root .bg-slate-950\\/40 {\n    background-color: color-mix(in srgb, oklch(12.9% 0.042 264.695) 40%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      background-color: color-mix(in oklab, var(--color-slate-950) 40%, transparent);\n    }\n  }\n  #scenario-test-root .bg-slate-950\\/90 {\n    background-color: color-mix(in srgb, oklch(12.9% 0.042 264.695) 90%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      background-color: color-mix(in oklab, var(--color-slate-950) 90%, transparent);\n    }\n  }\n  #scenario-test-root .bg-white {\n    background-color: var(--color-white);\n  }\n  #scenario-test-root .bg-yellow-50 {\n    background-color: var(--color-yellow-50);\n  }\n  #scenario-test-root .p-2 {\n    padding: calc(var(--spacing) * 2);\n  }\n  #scenario-test-root .p-2\\.5 {\n    padding: calc(var(--spacing) * 2.5);\n  }\n  #scenario-test-root .p-3 {\n    padding: calc(var(--spacing) * 3);\n  }\n  #scenario-test-root .p-4 {\n    padding: calc(var(--spacing) * 4);\n  }\n  #scenario-test-root .p-5 {\n    padding: calc(var(--spacing) * 5);\n  }\n  #scenario-test-root .p-8 {\n    padding: calc(var(--spacing) * 8);\n  }\n  #scenario-test-root .px-1 {\n    padding-inline: var(--spacing);\n  }\n  #scenario-test-root .px-1\\.5 {\n    padding-inline: calc(var(--spacing) * 1.5);\n  }\n  #scenario-test-root .px-2 {\n    padding-inline: calc(var(--spacing) * 2);\n  }\n  #scenario-test-root .px-2\\.5 {\n    padding-inline: calc(var(--spacing) * 2.5);\n  }\n  #scenario-test-root .px-3 {\n    padding-inline: calc(var(--spacing) * 3);\n  }\n  #scenario-test-root .px-3\\.5 {\n    padding-inline: calc(var(--spacing) * 3.5);\n  }\n  #scenario-test-root .px-4 {\n    padding-inline: calc(var(--spacing) * 4);\n  }\n  #scenario-test-root .px-5 {\n    padding-inline: calc(var(--spacing) * 5);\n  }\n  #scenario-test-root .py-0\\.5 {\n    padding-block: calc(var(--spacing) * 0.5);\n  }\n  #scenario-test-root .py-1 {\n    padding-block: var(--spacing);\n  }\n  #scenario-test-root .py-1\\.5 {\n    padding-block: calc(var(--spacing) * 1.5);\n  }\n  #scenario-test-root .py-2 {\n    padding-block: calc(var(--spacing) * 2);\n  }\n  #scenario-test-root .py-2\\.5 {\n    padding-block: calc(var(--spacing) * 2.5);\n  }\n  #scenario-test-root .py-3 {\n    padding-block: calc(var(--spacing) * 3);\n  }\n  #scenario-test-root .py-4 {\n    padding-block: calc(var(--spacing) * 4);\n  }\n  #scenario-test-root .py-px {\n    padding-block: 1px;\n  }\n  #scenario-test-root .pt-1 {\n    padding-top: var(--spacing);\n  }\n  #scenario-test-root .pt-3\\.5 {\n    padding-top: calc(var(--spacing) * 3.5);\n  }\n  #scenario-test-root .pt-4 {\n    padding-top: calc(var(--spacing) * 4);\n  }\n  #scenario-test-root .pr-2 {\n    padding-right: calc(var(--spacing) * 2);\n  }\n  #scenario-test-root .pr-3 {\n    padding-right: calc(var(--spacing) * 3);\n  }\n  #scenario-test-root .pr-8 {\n    padding-right: calc(var(--spacing) * 8);\n  }\n  #scenario-test-root .pl-2 {\n    padding-left: calc(var(--spacing) * 2);\n  }\n  #scenario-test-root .pl-3 {\n    padding-left: calc(var(--spacing) * 3);\n  }\n  #scenario-test-root .pl-8 {\n    padding-left: calc(var(--spacing) * 8);\n  }\n  #scenario-test-root .text-center {\n    text-align: center;\n  }\n  #scenario-test-root .text-left {\n    text-align: left;\n  }\n  #scenario-test-root .text-right {\n    text-align: right;\n  }\n  #scenario-test-root .align-top {\n    vertical-align: top;\n  }\n  #scenario-test-root .font-mono {\n    font-family: var(--font-mono);\n  }\n  #scenario-test-root .font-sans {\n    font-family: var(--font-sans);\n  }\n  #scenario-test-root .text-base {\n    font-size: var(--text-base);\n    line-height: var(--tw-leading, var(--text-base--line-height));\n  }\n  #scenario-test-root .text-sm {\n    font-size: var(--text-sm);\n    line-height: var(--tw-leading, var(--text-sm--line-height));\n  }\n  #scenario-test-root .text-xs {\n    font-size: var(--text-xs);\n    line-height: var(--tw-leading, var(--text-xs--line-height));\n  }\n  #scenario-test-root .text-\\[9\\.5px\\] {\n    font-size: 9.5px;\n  }\n  #scenario-test-root .text-\\[10\\.5px\\] {\n    font-size: 10.5px;\n  }\n  #scenario-test-root .text-\\[10px\\] {\n    font-size: 10px;\n  }\n  #scenario-test-root .text-\\[11px\\] {\n    font-size: 11px;\n  }\n  #scenario-test-root .text-\\[13px\\] {\n    font-size: 13px;\n  }\n  #scenario-test-root .leading-relaxed {\n    --tw-leading: var(--leading-relaxed);\n    line-height: var(--leading-relaxed);\n  }\n  #scenario-test-root .leading-snug {\n    --tw-leading: var(--leading-snug);\n    line-height: var(--leading-snug);\n  }\n  #scenario-test-root .leading-tight {\n    --tw-leading: var(--leading-tight);\n    line-height: var(--leading-tight);\n  }\n  #scenario-test-root .font-bold {\n    --tw-font-weight: var(--font-weight-bold);\n    font-weight: var(--font-weight-bold);\n  }\n  #scenario-test-root .font-medium {\n    --tw-font-weight: var(--font-weight-medium);\n    font-weight: var(--font-weight-medium);\n  }\n  #scenario-test-root .font-normal {\n    --tw-font-weight: var(--font-weight-normal);\n    font-weight: var(--font-weight-normal);\n  }\n  #scenario-test-root .font-semibold {\n    --tw-font-weight: var(--font-weight-semibold);\n    font-weight: var(--font-weight-semibold);\n  }\n  #scenario-test-root .tracking-normal {\n    --tw-tracking: var(--tracking-normal);\n    letter-spacing: var(--tracking-normal);\n  }\n  #scenario-test-root .tracking-tight {\n    --tw-tracking: var(--tracking-tight);\n    letter-spacing: var(--tracking-tight);\n  }\n  #scenario-test-root .tracking-wider {\n    --tw-tracking: var(--tracking-wider);\n    letter-spacing: var(--tracking-wider);\n  }\n  #scenario-test-root .break-all {\n    word-break: break-all;\n  }\n  #scenario-test-root .whitespace-nowrap {\n    white-space: nowrap;\n  }\n  #scenario-test-root .whitespace-pre-wrap {\n    white-space: pre-wrap;\n  }\n  #scenario-test-root .text-amber-400 {\n    color: var(--color-amber-400);\n  }\n  #scenario-test-root .text-amber-600 {\n    color: var(--color-amber-600);\n  }\n  #scenario-test-root .text-blue-500 {\n    color: var(--color-blue-500);\n  }\n  #scenario-test-root .text-blue-500\\/80 {\n    color: color-mix(in srgb, oklch(62.3% 0.214 259.815) 80%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      color: color-mix(in oklab, var(--color-blue-500) 80%, transparent);\n    }\n  }\n  #scenario-test-root .text-blue-600 {\n    color: var(--color-blue-600);\n  }\n  #scenario-test-root .text-blue-900 {\n    color: var(--color-blue-900);\n  }\n  #scenario-test-root .text-emerald-400 {\n    color: var(--color-emerald-400);\n  }\n  #scenario-test-root .text-emerald-500 {\n    color: var(--color-emerald-500);\n  }\n  #scenario-test-root .text-emerald-600 {\n    color: var(--color-emerald-600);\n  }\n  #scenario-test-root .text-emerald-600\\/70 {\n    color: color-mix(in srgb, oklch(59.6% 0.145 163.225) 70%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      color: color-mix(in oklab, var(--color-emerald-600) 70%, transparent);\n    }\n  }\n  #scenario-test-root .text-emerald-700 {\n    color: var(--color-emerald-700);\n  }\n  #scenario-test-root .text-indigo-500 {\n    color: var(--color-indigo-500);\n  }\n  #scenario-test-root .text-indigo-600 {\n    color: var(--color-indigo-600);\n  }\n  #scenario-test-root .text-rose-500 {\n    color: var(--color-rose-500);\n  }\n  #scenario-test-root .text-rose-600 {\n    color: var(--color-rose-600);\n  }\n  #scenario-test-root .text-rose-600\\/70 {\n    color: color-mix(in srgb, oklch(58.6% 0.253 17.585) 70%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      color: color-mix(in oklab, var(--color-rose-600) 70%, transparent);\n    }\n  }\n  #scenario-test-root .text-rose-600\\/80 {\n    color: color-mix(in srgb, oklch(58.6% 0.253 17.585) 80%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      color: color-mix(in oklab, var(--color-rose-600) 80%, transparent);\n    }\n  }\n  #scenario-test-root .text-rose-700 {\n    color: var(--color-rose-700);\n  }\n  #scenario-test-root .text-rose-800 {\n    color: var(--color-rose-800);\n  }\n  #scenario-test-root .text-rose-900 {\n    color: var(--color-rose-900);\n  }\n  #scenario-test-root .text-slate-200 {\n    color: var(--color-slate-200);\n  }\n  #scenario-test-root .text-slate-300 {\n    color: var(--color-slate-300);\n  }\n  #scenario-test-root .text-slate-400 {\n    color: var(--color-slate-400);\n  }\n  #scenario-test-root .text-slate-500 {\n    color: var(--color-slate-500);\n  }\n  #scenario-test-root .text-slate-600 {\n    color: var(--color-slate-600);\n  }\n  #scenario-test-root .text-slate-700 {\n    color: var(--color-slate-700);\n  }\n  #scenario-test-root .text-slate-800 {\n    color: var(--color-slate-800);\n  }\n  #scenario-test-root .text-slate-900 {\n    color: var(--color-slate-900);\n  }\n  #scenario-test-root .text-white {\n    color: var(--color-white);\n  }\n  #scenario-test-root .text-yellow-600 {\n    color: var(--color-yellow-600);\n  }\n  #scenario-test-root .normal-case {\n    text-transform: none;\n  }\n  #scenario-test-root .uppercase {\n    text-transform: uppercase;\n  }\n  #scenario-test-root .placeholder-slate-400::placeholder {\n    color: var(--color-slate-400);\n  }\n  #scenario-test-root .placeholder-slate-500::placeholder {\n    color: var(--color-slate-500);\n  }\n  #scenario-test-root .opacity-50 {\n    opacity: 50%;\n  }\n  #scenario-test-root .shadow-2xl {\n    --tw-shadow: 0 25px 50px -12px var(--tw-shadow-color, rgb(0 0 0 / 0.25));\n    box-shadow: var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow);\n  }\n  #scenario-test-root .shadow-2xs {\n    --tw-shadow: 0 1px var(--tw-shadow-color, rgb(0 0 0 / 0.05));\n    box-shadow: var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow);\n  }\n  #scenario-test-root .shadow-inner {\n    --tw-shadow: inset 0 2px 4px 0 var(--tw-shadow-color, rgb(0 0 0 / 0.05));\n    box-shadow: var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow);\n  }\n  #scenario-test-root .shadow-sm {\n    --tw-shadow: 0 1px 3px 0 var(--tw-shadow-color, rgb(0 0 0 / 0.1)), 0 1px 2px -1px var(--tw-shadow-color, rgb(0 0 0 / 0.1));\n    box-shadow: var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow);\n  }\n  #scenario-test-root .shadow-xs {\n    --tw-shadow: 0 1px 2px 0 var(--tw-shadow-color, rgb(0 0 0 / 0.05));\n    box-shadow: var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow);\n  }\n  #scenario-test-root .ring-2 {\n    --tw-ring-shadow: var(--tw-ring-inset,) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color, rgb(59 130 246 / 0.5));\n    box-shadow: var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow);\n  }\n  #scenario-test-root .ring-emerald-500\\/20 {\n    --tw-ring-color: color-mix(in srgb, oklch(69.6% 0.17 162.48) 20%, transparent);\n    @supports (color: color-mix(in lab, red, red)) {\n      --tw-ring-color: color-mix(in oklab, var(--color-emerald-500) 20%, transparent);\n    }\n  }\n  #scenario-test-root .outline-hidden {\n    --tw-outline-style: none;\n    outline-style: none;\n    @media (forced-colors: active) {\n      outline: 2px solid transparent;\n      outline-offset: 2px;\n    }\n  }\n  #scenario-test-root .filter {\n    filter: var(--tw-blur,) var(--tw-brightness,) var(--tw-contrast,) var(--tw-grayscale,) var(--tw-hue-rotate,) var(--tw-invert,) var(--tw-saturate,) var(--tw-sepia,) var(--tw-drop-shadow,);\n  }\n  #scenario-test-root .transition-all {\n    transition-property: all;\n    transition-timing-function: var(--tw-ease, var(--default-transition-timing-function));\n    transition-duration: var(--tw-duration, var(--default-transition-duration));\n  }\n  #scenario-test-root .transition-colors {\n    transition-property: color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --tw-gradient-from, --tw-gradient-via, --tw-gradient-to;\n    transition-timing-function: var(--tw-ease, var(--default-transition-timing-function));\n    transition-duration: var(--tw-duration, var(--default-transition-duration));\n  }\n  #scenario-test-root .transition-transform {\n    transition-property: transform, translate, scale, rotate;\n    transition-timing-function: var(--tw-ease, var(--default-transition-timing-function));\n    transition-duration: var(--tw-duration, var(--default-transition-duration));\n  }\n  #scenario-test-root .duration-150 {\n    --tw-duration: 150ms;\n    transition-duration: 150ms;\n  }\n  #scenario-test-root .duration-200 {\n    --tw-duration: 200ms;\n    transition-duration: 200ms;\n  }\n  #scenario-test-root .duration-300 {\n    --tw-duration: 300ms;\n    transition-duration: 300ms;\n  }\n  #scenario-test-root .select-none {\n    -webkit-user-select: none;\n    user-select: none;\n  }\n  @media (hover: hover) {\n    #scenario-test-root .group-hover\\:text-slate-600:is(:where(.group):hover *) {\n      color: var(--color-slate-600);\n    }\n    #scenario-test-root .group-hover\\:text-slate-900:is(:where(.group):hover *) {\n      color: var(--color-slate-900);\n    }\n  }\n  #scenario-test-root .placeholder\\:text-slate-300::placeholder {\n    color: var(--color-slate-300);\n  }\n  @media (hover: hover) {\n    #scenario-test-root .hover\\:border-slate-200\\/60:hover {\n      border-color: color-mix(in srgb, oklch(92.9% 0.013 255.508) 60%, transparent);\n    }\n    @supports (color: color-mix(in lab, red, red)) {\n      #scenario-test-root .hover\\:border-slate-200\\/60:hover {\n        border-color: color-mix(in oklab, var(--color-slate-200) 60%, transparent);\n      }\n    }\n    #scenario-test-root .hover\\:border-slate-300:hover {\n      border-color: var(--color-slate-300);\n    }\n    #scenario-test-root .hover\\:bg-emerald-600:hover {\n      background-color: var(--color-emerald-600);\n    }\n    #scenario-test-root .hover\\:bg-emerald-700:hover {\n      background-color: var(--color-emerald-700);\n    }\n    #scenario-test-root .hover\\:bg-slate-50:hover {\n      background-color: var(--color-slate-50);\n    }\n    #scenario-test-root .hover\\:bg-slate-50\\/60:hover {\n      background-color: color-mix(in srgb, oklch(98.4% 0.003 247.858) 60%, transparent);\n    }\n    @supports (color: color-mix(in lab, red, red)) {\n      #scenario-test-root .hover\\:bg-slate-50\\/60:hover {\n        background-color: color-mix(in oklab, var(--color-slate-50) 60%, transparent);\n      }\n    }\n    #scenario-test-root .hover\\:bg-slate-50\\/70:hover {\n      background-color: color-mix(in srgb, oklch(98.4% 0.003 247.858) 70%, transparent);\n    }\n    @supports (color: color-mix(in lab, red, red)) {\n      #scenario-test-root .hover\\:bg-slate-50\\/70:hover {\n        background-color: color-mix(in oklab, var(--color-slate-50) 70%, transparent);\n      }\n    }\n    #scenario-test-root .hover\\:bg-slate-50\\/80:hover {\n      background-color: color-mix(in srgb, oklch(98.4% 0.003 247.858) 80%, transparent);\n    }\n    @supports (color: color-mix(in lab, red, red)) {\n      #scenario-test-root .hover\\:bg-slate-50\\/80:hover {\n        background-color: color-mix(in oklab, var(--color-slate-50) 80%, transparent);\n      }\n    }\n    #scenario-test-root .hover\\:bg-slate-100:hover {\n      background-color: var(--color-slate-100);\n    }\n    #scenario-test-root .hover\\:bg-slate-600:hover {\n      background-color: var(--color-slate-600);\n    }\n    #scenario-test-root .hover\\:bg-slate-700:hover {\n      background-color: var(--color-slate-700);\n    }\n    #scenario-test-root .hover\\:bg-slate-800:hover {\n      background-color: var(--color-slate-800);\n    }\n    #scenario-test-root .hover\\:bg-white\\/60:hover {\n      background-color: color-mix(in srgb, #fff 60%, transparent);\n    }\n    @supports (color: color-mix(in lab, red, red)) {\n      #scenario-test-root .hover\\:bg-white\\/60:hover {\n        background-color: color-mix(in oklab, var(--color-white) 60%, transparent);\n      }\n    }\n    #scenario-test-root .hover\\:text-emerald-400:hover {\n      color: var(--color-emerald-400);\n    }\n    #scenario-test-root .hover\\:text-emerald-700:hover {\n      color: var(--color-emerald-700);\n    }\n    #scenario-test-root .hover\\:text-rose-600:hover {\n      color: var(--color-rose-600);\n    }\n    #scenario-test-root .hover\\:text-slate-600:hover {\n      color: var(--color-slate-600);\n    }\n    #scenario-test-root .hover\\:text-slate-700:hover {\n      color: var(--color-slate-700);\n    }\n    #scenario-test-root .hover\\:text-slate-900:hover {\n      color: var(--color-slate-900);\n    }\n    #scenario-test-root .hover\\:text-white:hover {\n      color: var(--color-white);\n    }\n  }\n  #scenario-test-root .focus\\:border-emerald-500:focus {\n    border-color: var(--color-emerald-500);\n  }\n  #scenario-test-root .focus\\:border-slate-800:focus {\n    border-color: var(--color-slate-800);\n  }\n  #scenario-test-root .focus\\:ring-1:focus {\n    --tw-ring-shadow: var(--tw-ring-inset,) 0 0 0 calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color, rgb(59 130 246 / 0.5));\n    box-shadow: var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow);\n  }\n  #scenario-test-root .focus\\:ring-emerald-500:focus {\n    --tw-ring-color: var(--color-emerald-500);\n  }\n  #scenario-test-root .focus\\:ring-slate-800:focus {\n    --tw-ring-color: var(--color-slate-800);\n  }\n  #scenario-test-root .focus\\:outline-hidden:focus {\n    --tw-outline-style: none;\n    outline-style: none;\n    @media (forced-colors: active) {\n      outline: 2px solid transparent;\n      outline-offset: 2px;\n    }\n  }\n  #scenario-test-root .active\\:scale-95:active {\n    --tw-scale-x: 95%;\n    --tw-scale-y: 95%;\n    --tw-scale-z: 95%;\n    scale: var(--tw-scale-x) var(--tw-scale-y);\n  }\n  #scenario-test-root .active\\:scale-\\[0\\.96\\]:active {\n    scale: 0.96;\n  }\n  #scenario-test-root .active\\:scale-\\[0\\.98\\]:active {\n    scale: 0.98;\n  }\n  @media (width >= 40rem) {\n    #scenario-test-root .sm\\:mt-0 {\n      margin-top: 0px;\n    }\n    #scenario-test-root .sm\\:max-w-xl {\n      max-width: var(--container-xl);\n    }\n    #scenario-test-root .sm\\:grid-cols-\\[120px_1fr\\] {\n      grid-template-columns: 120px 1fr;\n    }\n    #scenario-test-root .sm\\:gap-6 {\n      gap: calc(var(--spacing) * 6);\n    }\n  }\n  @media (width >= 48rem) {\n    #scenario-test-root .md\\:grid-cols-2 {\n      grid-template-columns: repeat(2, minmax(0, 1fr));\n    }\n  }\n  @media (width >= 64rem) {\n    #scenario-test-root .lg\\:grid-cols-2 {\n      grid-template-columns: repeat(2, minmax(0, 1fr));\n    }\n  }\n  @media (width >= 80rem) {\n    #scenario-test-root .xl\\:grid-cols-\\[minmax\\(200px\\,260px\\)_1fr_minmax\\(250px\\,290px\\)\\] {\n      grid-template-columns: minmax(200px,260px) 1fr minmax(250px,290px);\n    }\n  }\n}\n@layer base {\n  *, ::before, ::after, ::backdrop, ::file-selector-button {\n    border-color: var(--color-gray-200);\n  }\n}\n@property --tw-space-y-reverse {\n  syntax: "*";\n  inherits: false;\n  initial-value: 0;\n}\n@property --tw-space-x-reverse {\n  syntax: "*";\n  inherits: false;\n  initial-value: 0;\n}\n@property --tw-divide-y-reverse {\n  syntax: "*";\n  inherits: false;\n  initial-value: 0;\n}\n@property --tw-border-style {\n  syntax: "*";\n  inherits: false;\n  initial-value: solid;\n}\n@property --tw-leading {\n  syntax: "*";\n  inherits: false;\n}\n@property --tw-font-weight {\n  syntax: "*";\n  inherits: false;\n}\n@property --tw-tracking {\n  syntax: "*";\n  inherits: false;\n}\n@property --tw-shadow {\n  syntax: "*";\n  inherits: false;\n  initial-value: 0 0 #0000;\n}\n@property --tw-shadow-color {\n  syntax: "*";\n  inherits: false;\n}\n@property --tw-shadow-alpha {\n  syntax: "<percentage>";\n  inherits: false;\n  initial-value: 100%;\n}\n@property --tw-inset-shadow {\n  syntax: "*";\n  inherits: false;\n  initial-value: 0 0 #0000;\n}\n@property --tw-inset-shadow-color {\n  syntax: "*";\n  inherits: false;\n}\n@property --tw-inset-shadow-alpha {\n  syntax: "<percentage>";\n  inherits: false;\n  initial-value: 100%;\n}\n@property --tw-ring-color {\n  syntax: "*";\n  inherits: false;\n}\n@property --tw-ring-shadow {\n  syntax: "*";\n  inherits: false;\n  initial-value: 0 0 #0000;\n}\n@property --tw-inset-ring-color {\n  syntax: "*";\n  inherits: false;\n}\n@property --tw-inset-ring-shadow {\n  syntax: "*";\n  inherits: false;\n  initial-value: 0 0 #0000;\n}\n@property --tw-ring-inset {\n  syntax: "*";\n  inherits: false;\n}\n@property --tw-ring-offset-width {\n  syntax: "<length>";\n  inherits: false;\n  initial-value: 0px;\n}\n@property --tw-ring-offset-color {\n  syntax: "*";\n  inherits: false;\n  initial-value: #fff;\n}\n@property --tw-ring-offset-shadow {\n  syntax: "*";\n  inherits: false;\n  initial-value: 0 0 #0000;\n}\n@property --tw-blur {\n  syntax: "*";\n  inherits: false;\n}\n@property --tw-brightness {\n  syntax: "*";\n  inherits: false;\n}\n@property --tw-contrast {\n  syntax: "*";\n  inherits: false;\n}\n@property --tw-grayscale {\n  syntax: "*";\n  inherits: false;\n}\n@property --tw-hue-rotate {\n  syntax: "*";\n  inherits: false;\n}\n@property --tw-invert {\n  syntax: "*";\n  inherits: false;\n}\n@property --tw-opacity {\n  syntax: "*";\n  inherits: false;\n}\n@property --tw-saturate {\n  syntax: "*";\n  inherits: false;\n}\n@property --tw-sepia {\n  syntax: "*";\n  inherits: false;\n}\n@property --tw-drop-shadow {\n  syntax: "*";\n  inherits: false;\n}\n@property --tw-drop-shadow-color {\n  syntax: "*";\n  inherits: false;\n}\n@property --tw-drop-shadow-alpha {\n  syntax: "<percentage>";\n  inherits: false;\n  initial-value: 100%;\n}\n@property --tw-drop-shadow-size {\n  syntax: "*";\n  inherits: false;\n}\n@property --tw-duration {\n  syntax: "*";\n  inherits: false;\n}\n@property --tw-scale-x {\n  syntax: "*";\n  inherits: false;\n  initial-value: 1;\n}\n@property --tw-scale-y {\n  syntax: "*";\n  inherits: false;\n  initial-value: 1;\n}\n@property --tw-scale-z {\n  syntax: "*";\n  inherits: false;\n  initial-value: 1;\n}\n@layer properties {\n  @supports ((-webkit-hyphens: none) and (not (margin-trim: inline))) or ((-moz-orient: inline) and (not (color:rgb(from red r g b)))) {\n    *, ::before, ::after, ::backdrop {\n      --tw-space-y-reverse: 0;\n      --tw-space-x-reverse: 0;\n      --tw-divide-y-reverse: 0;\n      --tw-border-style: solid;\n      --tw-leading: initial;\n      --tw-font-weight: initial;\n      --tw-tracking: initial;\n      --tw-shadow: 0 0 #0000;\n      --tw-shadow-color: initial;\n      --tw-shadow-alpha: 100%;\n      --tw-inset-shadow: 0 0 #0000;\n      --tw-inset-shadow-color: initial;\n      --tw-inset-shadow-alpha: 100%;\n      --tw-ring-color: initial;\n      --tw-ring-shadow: 0 0 #0000;\n      --tw-inset-ring-color: initial;\n      --tw-inset-ring-shadow: 0 0 #0000;\n      --tw-ring-inset: initial;\n      --tw-ring-offset-width: 0px;\n      --tw-ring-offset-color: #fff;\n      --tw-ring-offset-shadow: 0 0 #0000;\n      --tw-blur: initial;\n      --tw-brightness: initial;\n      --tw-contrast: initial;\n      --tw-grayscale: initial;\n      --tw-hue-rotate: initial;\n      --tw-invert: initial;\n      --tw-opacity: initial;\n      --tw-saturate: initial;\n      --tw-sepia: initial;\n      --tw-drop-shadow: initial;\n      --tw-drop-shadow-color: initial;\n      --tw-drop-shadow-alpha: 100%;\n      --tw-drop-shadow-size: initial;\n      --tw-duration: initial;\n      --tw-scale-x: 1;\n      --tw-scale-y: 1;\n      --tw-scale-z: 1;\n    }\n  }\n}';

// src/browser/app.js
function resolveMount(mount) {
  return typeof mount === "string" ? document.querySelector(mount) : mount;
}
function toRuntimeConfig(config) {
  const prefix = config.storagePrefix || "scenario-test";
  const scenarioVars = { ...config.vars || {} };
  for (const definition of config.variables || []) {
    if (scenarioVars[definition.name] === void 0 && definition.defaultValue !== void 0) {
      scenarioVars[definition.name] = definition.defaultValue;
    }
  }
  return {
    ...config,
    scenarioVars,
    scenarios: config.scenarios.map((entry) => ({
      ...entry,
      file: entry.url || entry.file || entry.path || ""
    })),
    storageKeys: {
      baseUrl: `${prefix}.baseUrl`,
      authorization: `${prefix}.authorization`,
      globals: `${prefix}.globals`,
      environment: `${prefix}.environment`,
      theme: `${prefix}.theme`,
      scenarioVars: `${prefix}.scenarioVars`,
      pinnedScenarios: `${prefix}.pinnedScenarios`,
      ...config.storageKeys || {}
    }
  };
}
function ensureTailwindStyles() {
  let style = document.getElementById("scenarioTailwindStyles");
  if (!style) {
    style = document.createElement("style");
    style.id = "scenarioTailwindStyles";
    style.textContent = TAILWIND_CSS;
    document.head.appendChild(style);
  }
  return style;
}
function createApp(options = {}) {
  const mount = resolveMount(options.mount);
  if (!mount) throw new Error("createApp \u7F3A\u5C11\u6709\u6548\u7684 mount \u5BB9\u5668");
  if (document.getElementById("scenario-test-root") && mount.id !== "scenario-test-root") {
    throw new Error("\u5F53\u524D\u9875\u9762\u53EA\u80FD\u6302\u8F7D\u4E00\u4E2A\u573A\u666F\u6D4B\u8BD5\u5DE5\u4F5C\u53F0");
  }
  const config = defineConfig(options.config || getConfig() || {});
  const previousId = mount.id;
  mount.id = "scenario-test-root";
  mount.classList.add("scenario-test-root");
  ensureTailwindStyles();
  const runtime = createWorkbenchRuntime({ mount, config: toRuntimeConfig(config), getScenario });
  let destroyed = false;
  function loadScenario(idOrUrl) {
    const entry = config.scenarios.find((item) => item.id === idOrUrl || item.url === idOrUrl || item.file === idOrUrl);
    return runtime.loadScenario(entry ? entry.url || entry.file : idOrUrl);
  }
  function destroy() {
    if (destroyed) return;
    runtime.cancel();
    mount.replaceChildren();
    mount.classList.remove("scenario-test-root");
    mount.id = previousId;
    destroyed = true;
  }
  return {
    loadScenario,
    runAll: runtime.runAll,
    runNext: runtime.runNext,
    reset: runtime.reset,
    cancel: runtime.cancel,
    rewindToStep: runtime.rewindToStep,
    rerunStep: runtime.rerunStep,
    destroy,
    getState: runtime.getState
  };
}

// src/node/io.js
var import_node_fs2 = __toESM(require("node:fs"), 1);
var import_node_path2 = __toESM(require("node:path"), 1);

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
function isRealPathWithinRoot(root, resolved) {
  try {
    assertRealPathWithinRoot(root, resolved, resolved);
    return true;
  } catch {
    return false;
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
function createNodeIo(workspace = process.cwd()) {
  const root = import_node_path2.default.resolve(workspace);
  return {
    async createUploadBody(definition) {
      const filePath = typeof definition === "string" ? definition : definition.filePath;
      let absolutePath;
      try {
        absolutePath = validatePath(root, filePath);
      } catch (error) {
        throw new Error(
          `\u6587\u4EF6\u4E0A\u4F20\u8DEF\u5F84\u4E0D\u5B89\u5168: ${filePath}
\u539F\u56E0: ${error.message}
\u63D0\u793A: \u4E0A\u4F20\u6587\u4EF6\u5FC5\u987B\u5728\u5DE5\u4F5C\u533A\u5185 (${root})`
        );
      }
      if (!import_node_fs2.default.existsSync(absolutePath)) throw new Error(`\u4E0A\u4F20\u6587\u4EF6\u4E0D\u5B58\u5728: ${absolutePath}`);
      const fieldName = definition.fieldName || "file";
      const filename = definition.filename || import_node_path2.default.basename(absolutePath);
      const form = new FormData();
      form.append(fieldName, new Blob([import_node_fs2.default.readFileSync(absolutePath)]), filename);
      for (const [name, value] of Object.entries(definition.fields || {})) form.append(name, String(value));
      return { body: form, omitContentType: true };
    },
    async saveResponse(relativePath, data, metadata = {}) {
      let absolutePath;
      try {
        absolutePath = validatePath(root, relativePath);
      } catch (error) {
        throw new Error(
          `\u54CD\u5E94\u4FDD\u5B58\u8DEF\u5F84\u4E0D\u5B89\u5168: ${relativePath}
\u539F\u56E0: ${error.message}
\u63D0\u793A: \u4FDD\u5B58\u8DEF\u5F84\u5FC5\u987B\u5728\u5DE5\u4F5C\u533A\u5185 (${root})`
        );
      }
      import_node_fs2.default.mkdirSync(import_node_path2.default.dirname(absolutePath), { recursive: true });
      import_node_fs2.default.writeFileSync(absolutePath, data);
      return { savedTo: absolutePath, size: data.byteLength, contentType: metadata.contentType || "", [SAVED_RESPONSE]: true };
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
function loadScenarioFile(filePath, id, api) {
  const existing = getScenario(id);
  if (existing) return existing;
  const loaded = executeDefinitionFile(filePath, api);
  let scenario = getScenario(id);
  const exported = loaded.exports?.default || loaded.exports;
  if (!scenario && exported && Array.isArray(exported.steps)) scenario = registerScenario(id, exported);
  if (!scenario) throw new Error(`\u573A\u666F\u6587\u4EF6\u672A\u6CE8\u518C ${id}: ${filePath}`);
  return scenario;
}

// src/init-templates.js
var DEFAULT_LIBRARY_URL = `https://raw.githubusercontent.com/youzhikeji/scenario-test/v${VERSION}/dist/`;
var OPERATOR_NAMES = Object.keys(contract.assertions.operators);
var OPERATORS_TEXT = OPERATOR_NAMES.join("\u3001");
var OPERATORS_BACKTICK = OPERATOR_NAMES.map((name) => `\`${name}\``).join("\u3001");
var GLOBALS_TYPES_BACKTICK = contract.globals.types.map((type) => `\`${type}\``).join(" / ");
var AUTHORING_PROMPT = `# AI \u4E1A\u52A1\u529F\u80FD\u573A\u666F\u751F\u6210\u89C4\u5219

\u672C\u6587\u4EF6\u7531\u5B89\u88C5\u4F1A\u8BDD\u4E2D\u7684 AI \u81EA\u52A8\u8BFB\u53D6\uFF1B\u65B0\u4F1A\u8BDD\u4E2D\u7684 AI \u5E94\u6309\u7528\u6237\u8981\u6C42\u4ECE\u9879\u76EE\u76EE\u5F55\u76F4\u63A5\u8BFB\u53D6\u3002\u7528\u6237\u4E0D\u9700\u8981\u590D\u5236\u6216\u7C98\u8D34\u672C\u6587\u4EF6\u3002\u5F00\u59CB\u524D\u5FC5\u987B\u5DF2\u5B8C\u6210\u5B89\u88C5\uFF08npm \u6216\u514D npm \u6A21\u5F0F\uFF09\u548C doctor\u3002

\u672C\u9636\u6BB5\u53EA\u6839\u636E\u5F53\u524D\u9879\u76EE\u4E2D\u4E0E\u76EE\u6807\u4E1A\u52A1\u529F\u80FD\u76F4\u63A5\u76F8\u5173\u7684\u771F\u5B9E\u8BC1\u636E\u751F\u6210\u6216\u7EF4\u62A4 HTTP \u573A\u666F\uFF0C\u4E0D\u8D1F\u8D23\u5B89\u88C5\u3001\u5347\u7EA7\u6216\u6784\u5EFA scenario-test\uFF0C\u4E0D\u542F\u52A8\u670D\u52A1\uFF0C\u4E5F\u4E0D\u5B9E\u9645\u8C03\u7528\u4E1A\u52A1\u63A5\u53E3\u3002

\u8BF7\u9488\u5BF9\u7528\u6237\u672C\u6B21\u6307\u5B9A\u7684\u4E00\u4E2A\u4E1A\u52A1\u529F\u80FD\u751F\u6210 scenario-test \u573A\u666F\u7528\u4F8B\u3002\u672C\u6587\u4EF6\u4F4D\u4E8E\u9879\u76EE\u573A\u666F\u6D4B\u8BD5\u6839\u76EE\u5F55\u7684 \`.scenario-test/\`\uFF0C\u6839\u76EE\u5F55\u662F\u4E0A\u4E00\u7EA7\u3002\u968F\u540E\u8BFB\u53D6\u6839\u76EE\u5F55\u7684 \`README.md\`\u3001\`scenario.config.js\` \u548C\u5DF2\u6709 \`scenarios/\`\uFF0C\u5E76\u8BFB\u53D6\u672C\u6587\u4EF6\u540C\u76EE\u5F55\u7684 \`SCENARIO_PATTERNS.md\`\uFF0C\u518D\u5206\u6790\u4E0E\u76EE\u6807\u529F\u80FD\u76F4\u63A5\u76F8\u5173\u7684 Controller\u3001OpenAPI/Swagger\u3001\u524D\u7AEF API \u8C03\u7528\u3001\u63A5\u53E3\u6587\u6863\u548C\u5DF2\u6709\u81EA\u52A8\u5316\u6D4B\u8BD5\u3002\u82E5\u7528\u6237\u5C1A\u672A\u660E\u786E\u6307\u5B9A\u4E1A\u52A1\u529F\u80FD\uFF0C\u5148\u8BE2\u95EE\u529F\u80FD\u540D\u79F0\u53CA\u53EF\u5B9A\u4F4D\u7684\u4EE3\u7801\u3001\u9875\u9762\u6216\u63A5\u53E3\u5165\u53E3\uFF1B\u5F97\u5230\u7B54\u590D\u524D\u4E0D\u626B\u63CF\u6574\u4E2A\u9879\u76EE\u3001\u4E0D\u521B\u5EFA\u573A\u666F\u6587\u4EF6\u3002

\u4E0D\u8981\u731C\u6D4B\u63A5\u53E3\u8DEF\u5F84\u3001\u5B57\u6BB5\u3001\u8BA4\u8BC1\u65B9\u5F0F\u3001\u54CD\u5E94\u7ED3\u6784\u3001\u72B6\u6001\u679A\u4E3E\u3001\u8BF7\u6C42\u679A\u4E3E\u6216\u9519\u8BEF\u54CD\u5E94\u5B57\u6BB5\uFF1B\u6CA1\u6709\u4EE3\u7801\u6216\u6587\u6863\u4F9D\u636E\u65F6\u5217\u4E3A\u5F85\u786E\u8BA4\u9879\u3002\u793A\u4F8B\u4E2D\u7684 SUCCESS\u3001PDF\u3001pdf\u3001\u9519\u8BEF\u7801\u7B49\u90FD\u53EA\u662F\u5360\u4F4D\u7ED3\u6784\uFF0C\u4E0D\u662F\u53EF\u76F4\u63A5\u91C7\u7528\u7684\u9ED8\u8BA4\u503C\uFF0C\u4E5F\u4E0D\u80FD\u6539\u6210\u53E6\u4E00\u79CD\u5927\u5C0F\u5199\u540E\u4F7F\u7528\u3002

## \u5B9E\u65BD\u8981\u6C42

1. \u53EA\u5904\u7406\u672C\u6B21\u6307\u5B9A\u7684\u4E00\u4E2A\u4E1A\u52A1\u529F\u80FD\u3002\u5148\u7ED9\u51FA\u529F\u80FD\u5361\u7247\uFF1A\u529F\u80FD\u76EE\u6807\u3001\u53C2\u4E0E\u89D2\u8272\u3001\u89E6\u53D1\u5165\u53E3\u3001\u524D\u7F6E\u6761\u4EF6\u3001\u5173\u952E\u4E1A\u52A1\u89C4\u5219\u3001\u72B6\u6001\u53D8\u5316\u3001\u76F4\u63A5\u76F8\u5173\u63A5\u53E3\u3001\u6D4B\u8BD5\u6570\u636E\u4E0E\u6E05\u7406\u6761\u4EF6\uFF1B\u518D\u7ED9\u51FA\u8BE5\u529F\u80FD\u7684\u573A\u666F\u77E9\u9635\uFF0C\u5217\u660E\u6BCF\u4E2A\u573A\u666F\u7684\u9A8C\u8BC1\u76EE\u6807\u3001\u524D\u7F6E\u6761\u4EF6\u3001\u6B65\u9AA4\u3001\u9884\u671F\u7ED3\u679C\u548C\u662F\u5426\u5199\u6570\u636E\u3002\u65E0\u6CD5\u786E\u8BA4\u7684\u5185\u5BB9\u5217\u4E3A\u5F85\u786E\u8BA4\u9879\uFF0C\u4E0D\u5F97\u628A\u8303\u56F4\u6269\u5C55\u5230\u76F8\u90BB\u529F\u80FD\u3002
2. \u4E1A\u52A1\u529F\u80FD\u662F\u8BBE\u8BA1\u8FB9\u754C\uFF0C\u573A\u666F\u662F\u8BE5\u529F\u80FD\u4E0B\u7684\u4E00\u6761\u72EC\u7ACB\u9A8C\u8BC1\u8DEF\u5F84\u3002\u6309\u8BC1\u636E\u8986\u76D6\u6210\u529F\u8DEF\u5F84\u3001\u4E1A\u52A1\u89C4\u5219/\u53C2\u6570\u6821\u9A8C\u3001\u6743\u9650\u3001\u8FB9\u754C\u503C\u3001\u91CD\u590D\u64CD\u4F5C\u6216\u5E42\u7B49\u3001\u5408\u6CD5\u4E0E\u975E\u6CD5\u72B6\u6001\u6D41\u8F6C\uFF1B\u6CA1\u6709\u8BC1\u636E\u7684\u7C7B\u522B\u4E0D\u751F\u6210\u3002\u4E00\u4E2A\u573A\u666F\u53EF\u4EE5\u5305\u542B\u51C6\u5907\u3001\u6267\u884C\u3001\u67E5\u8BE2\u9A8C\u8BC1\u548C\u7CBE\u786E\u6E05\u7406\u7B49\u591A\u4E2A HTTP \u6B65\u9AA4\uFF0C\u4F46\u8FD9\u4E9B\u6B65\u9AA4\u53EA\u670D\u52A1\u4E8E\u76EE\u6807\u529F\u80FD\uFF0C\u4E0D\u628A\u591A\u4E2A\u4E1A\u52A1\u529F\u80FD\u4E32\u6210\u4E00\u4E2A\u5927\u573A\u666F\u3002\u8BA4\u8BC1\u7B49\u516C\u5171\u524D\u7F6E\u53EA\u4F5C\u4E3A\u51C6\u5907\u6B65\u9AA4\uFF0C\u4E0D\u6539\u53D8\u573A\u666F\u5F52\u5C5E\u3002
3. \u5728 \`scenario.config.js\` \u7EF4\u62A4 \`envs\`\u3001\`vars\`\u3001\`variables\` \u548C \`scenarios\`\u3002\u79C1\u6709\u9879\u76EE\u53EF\u5728 \`vars\` \u4FDD\u5B58\u8054\u8C03\u51ED\u636E\uFF1B\`variables\` \u53EA\u58F0\u660E\u6807\u7B7E\u3001\`required\` \u4E0E\u53EF\u9009 \`env\` \u6620\u5C04\u3002\u6E90\u7801\u80FD\u786E\u8BA4\u8BF7\u6C42\u5B57\u6BB5\u4F46\u4E0D\u80FD\u786E\u8BA4\u5FC5\u586B\u53D6\u503C\u65F6\uFF0C\u5728\u914D\u7F6E \`vars\` \u4E2D\u7559\u7A7A\uFF0C\u5E76\u5728 \`variables\` \u4E2D\u58F0\u660E\u4E3A \`required: true\`\uFF1B\u573A\u666F\u53EA\u5F15\u7528\u8BE5\u53D8\u91CF\uFF0C\u7981\u6B62\u586B\u5165\u731C\u6D4B\u503C\u6216\u6D4B\u8BD5\u6807\u8BB0\u3002
4. \u5148\u53C2\u7167 \`SCENARIO_PATTERNS.md\` \u7684\u6B65\u9AA4\u7EC4\u5408\u6A21\u5F0F\uFF0C\u518D\u6309\u672C\u9879\u76EE\u8BC1\u636E\u66FF\u6362\u8DEF\u5F84\u3001\u5B57\u6BB5\u548C\u54CD\u5E94\u65AD\u8A00\uFF1B\u6A21\u5F0F\u4E2D\u7684\u5C16\u62EC\u53F7\u5360\u4F4D\u5185\u5BB9\u4E0D\u5F97\u76F4\u63A5\u5199\u5165\u573A\u666F\u3002\u573A\u666F\u5FC5\u987B\u4F7F\u7528 \`ScenarioTest.registerScenario(id, ScenarioTest.defineScenario({...}))\`\uFF0C\u914D\u7F6E\u4E2D\u7684\u573A\u666F id\u3001\u6587\u4EF6\u6CE8\u518C id \u5FC5\u987B\u4E00\u81F4\u3002
5. \u6BCF\u4E00\u6B65\u5199 \`name\`\u3001\`method\`\u3001\`path\`\u3001\`status\`\uFF0C\u5E76\u4E3A\u5173\u952E\u4E1A\u52A1\u7ED3\u679C\u5199 \`assertions\`\u3002Query \u53C2\u6570\u53EA\u80FD\u5199\u5728\u6B65\u9AA4\u9876\u5C42 \`params\`\uFF0C\u4E0D\u80FD\u5199\u6210 \`request.params\`\uFF1BGET/HEAD \u4E0D\u80FD\u643A\u5E26\u8BF7\u6C42\u4F53\uFF08\`request.body\`\u3001\`request.fileUpload\` \u5B9A\u4E49\u671F\u5373\u88AB\u62D2\uFF09\uFF0C\u8BF7\u6C42\u53C2\u6570\u4E00\u5F8B\u653E \`params\`\u3002\u7528 \`extract\` \u4FDD\u5B58\u54CD\u5E94 ID\u3001Token \u6216\u72B6\u6001\uFF0C\u518D\u7528 \`{{vars.name}}\` \u4E32\u8054\u540E\u7EED\u6B65\u9AA4\uFF1B\`from: "headers"\` \u7684 path \u9996\u6BB5\u6309\u5934\u540D\u5927\u5C0F\u5199\u4E0D\u654F\u611F\u5339\u914D\uFF08\u4EFB\u610F\u5927\u5C0F\u5199\u547D\u4E2D\u540C\u4E00\u54CD\u5E94\u5934\uFF0C\u65E0\u9700\u4E3A\u5927\u5C0F\u5199\u53D8\u4F53\u91CD\u590D\u914D\u7F6E\uFF09\uFF0C\u9996\u6BB5\u4E4B\u540E\u7684\u5B50\u8DEF\u5F84\u5728\u5934\u503C\u4E0A\u53D6\u3002\u65AD\u8A00\u64CD\u4F5C\u7B26\uFF1A${OPERATORS_BACKTICK}\uFF1B\u6570\u503C\u6BD4\u8F83\uFF08\u5982\u603B\u6570\u5B57\u6BB5\u4E0D\u5C11\u4E8E 5\uFF09\u7528 \`gte: 5\`\uFF08\u4EC5\u6570\u5B57\u4E0D\u505A\u5B57\u7B26\u4E32\u8F6C\u6362\uFF09\uFF0C\u5217\u8868\u6761\u6570/\u5B57\u7B26\u4E32\u957F\u5EA6/\u5BF9\u8C61\u952E\u6570\u7528 \`length: N\`\uFF08\u6570\u7EC4\u5143\u7D20\u6570\u3001\u5B57\u7B26\u4E32\u5B57\u7B26\u6570\u3001\u5BF9\u8C61\u952E\u6570\uFF0C\u975E\u5BB9\u5668\u7C7B\u578B\u76F4\u63A5\u5931\u8D25\uFF09\uFF0C"\u975E\u8D1F\u6574\u6570"\u8FD9\u7C7B\u683C\u5F0F\u6821\u9A8C\u7528 \`matches: "^\\\\d+$"\`\uFF0C\u63A5\u53E3\u8017\u65F6\u4E0A\u9650\u7528 \`{ target: "duration", lte: 800 }\`\uFF08\u6BEB\u79D2\uFF0C\u5355\u6B21\u8BF7\u6C42\u8017\u65F6\uFF09\u3002\`extract\` \u9879\u53EF\u52A0 \`required: true\`\uFF0C\u8DEF\u5F84\u4E0D\u5B58\u5728\u65F6\u8BE5\u6B65\u9AA4\u5931\u8D25\uFF1B\u53EF\u52A0 \`default\` \u7ED9\u53EF\u9009\u5B57\u6BB5\u58F0\u660E\u515C\u5E95\u503C\uFF08\u652F\u6301\u6A21\u677F\uFF0C\u4E0E required \u4E92\u65A5\uFF0C\u58F0\u660E\u540E\u7F3A\u5931\u4E0D\u4EA7\u751F warning\uFF09\u3002\u8DEF\u5F84\u4E2D\u7684\u6570\u7EC4\u4E0B\u6807\u652F\u6301\u8D1F\u6570\u53D6\u5012\u6570\u9879\uFF08\u5982 \`records[-1]\` \u4E3A\u672B\u9879\uFF0C\`records[-2]\` \u4E3A\u5012\u6570\u7B2C\u4E8C\u9879\uFF09\u3002\`when\` \u5BF9\u8C61\u5F62\u5F0F\u6765\u6E90\u4E3A \`from: "vars"\`\uFF08\u5DF2\u63D0\u53D6\u53D8\u91CF\uFF09\u3001\`from: "lastResponse"\`\uFF08\u4E0A\u4E00\u6B65\u54CD\u5E94 body\uFF0Cpath \u5B50\u8DEF\u5F84\u53D6\u503C\u540C extract from:"body"\uFF09\u6216 \`from: "status"\`\uFF08\u4E0A\u4E00\u6B65 HTTP \u72B6\u6001\u7801\uFF0C\u6570\u503C\uFF09\uFF0C\u4E5F\u53EF\u7528 \`target: "status"\` \u8BFB\u4E0A\u4E00\u6B65\u72B6\u6001\u7801\uFF1B\u7B2C\u4E00\u6B65\u65E0\u4E0A\u4E00\u6B65\u54CD\u5E94\u65F6\u6309\u6765\u6E90\u7F3A\u5931\u5904\u7406\u3001\u6761\u4EF6\u4E0D\u6210\u7ACB\uFF0C\u4E0D\u4E2D\u65AD\u573A\u666F\u3002\u6A21\u677F \`{{ }}\` \u53EA\u505A\u8DEF\u5F84\u53D6\u503C\uFF0C\u4E0D\u652F\u6301\u6BD4\u8F83\u3001\u4E09\u5143\u3001\u903B\u8F91\u8FD0\u7B97\u6216\u51FD\u6570\u8C03\u7528\uFF08\u5982 \`{{vars.a > 0}}\` \u5B9A\u4E49\u671F\u5373\u88AB\u62D2\uFF09\uFF0C\u6761\u4EF6\u5224\u65AD\u7528 \`assertions\` \u6216 \`when\` \u5BF9\u8C61\u5F62\u5F0F\u3002
6. \u8BA4\u8BC1\u662F\u666E\u901A\u9879\u76EE\u6B65\u9AA4\uFF1A\u786E\u8BA4\u767B\u5F55\u63A5\u53E3\u65F6\u5148\u767B\u5F55\u5E76\u63D0\u53D6 Token\uFF1B\u65E0\u6CD5\u786E\u8BA4\u65F6\u4EC5\u58F0\u660E\u53D8\u91CF\u5E76\u5728\u5177\u4F53 Header\u3001Query \u6216 Body \u4E2D\u5F15\u7528\uFF0C\u4E0D\u865A\u6784\u6846\u67B6\u7EA7\u8BA4\u8BC1\u3002\u6D4F\u89C8\u5668 Cookie \u4F1A\u8BDD\u5FC5\u987B\u6709\u9879\u76EE\u8BC1\u636E\u5E76\u663E\u5F0F\u8BBE\u7F6E request.credentials \u4E3A include\uFF1BNode CLI \u5F53\u524D\u4E0D\u63D0\u4F9B\u81EA\u52A8 Cookie Jar\u3002
7. \`runId\` \u548C \`runNo\` \u662F\u6BCF\u6B21\u6267\u884C\u81EA\u52A8\u751F\u6210\u7684\u5185\u7F6E\u53D8\u91CF\uFF0C\u7981\u6B62\u5728\u914D\u7F6E vars\u3001\u573A\u666F vars\u3001envVars\u3001generatedVars \u6216 extract \u4E2D\u91CD\u65B0\u5B9A\u4E49\u6216\u8986\u76D6\u3002\u5199\u5165\u573A\u666F\u4F7F\u7528 \`scenario-{{vars.runNo}}\` \u7B49\u6D4B\u8BD5\u6807\u8BB0\u3002\u6E05\u7406\u53EA\u80FD\u6309\u521A\u63D0\u53D6\u7684 ID \u6216\u6D4B\u8BD5\u6807\u8BB0\u7CBE\u786E\u5B9A\u4F4D\uFF0C\u5E76\u7528 \`when\` \u9632\u6B62\u7A7A\u503C\u5220\u9664\uFF1B\u65E0\u6CD5\u786E\u8BA4\u5B89\u5168\u6E05\u7406\u6761\u4EF6\u65F6\u4E0D\u751F\u6210\u5220\u9664\u6B65\u9AA4\u3002 \u9700\u8981\u552F\u4E00\u8BC1\u4EF6/\u5361\u53F7/\u53F7\u7801\u7684\u6D4B\u8BD5\u6570\u636E\uFF08\u8EAB\u4EFD\u8BC1\u53F7\u3001\u94F6\u884C\u5361\u53F7\u3001\u624B\u673A\u53F7\u3001\u7EDF\u4E00\u793E\u4F1A\u4FE1\u7528\u4EE3\u7801\u7B49\u5E26\u683C\u5F0F\u6216\u6821\u9A8C\u4F4D\u7EA6\u675F\u7684\u5B57\u6BB5\uFF09\u7528 \`generatedVars\` \u6309\u8F6E\u6B21\u751F\u6210\uFF1A\`idcard\`\uFF08\u58F0\u660E birthDate \u4E0E gender\uFF09\u3001\`luhn\`\uFF08\u53EF\u9009 length/prefix\uFF09\u3001\`phone\`\uFF08\u53EF\u9009 prefix\uFF09\u3001\`uscc\`\uFF08\u53EF\u9009 regionCode\uFF09\uFF0C\u7981\u6B62\u5199\u6B7B\u56FA\u5B9A\u6216\u771F\u5B9E\u53F7\u7801\u5BFC\u81F4\u91CD\u8DD1\u649E\u552F\u4E00\u6027\u3002 \u65F6\u95F4\u7A97/\u8FC7\u671F\u7C7B\u53C2\u6570\uFF08startTime\u3001expiredAt \u7B49\uFF09\u7528 \`timestamp\` \u7C7B\u578B\u76F8\u5BF9\u5F53\u524D\u65F6\u95F4\u751F\u6210\uFF1A\`offset\`\uFF08\u5982 "-7d"\u3001"+8d"\uFF0C\u6570\u5B57+\u5355\u4F4D ms/s/m/h/d/w\uFF09\u3001\`unit: 's'\` \u79D2\u7EA7\u6570\u503C\u3001\`format: 'YYYY-MM-DD HH:mm:ss'\` \u672C\u5730\u65F6\u95F4\u5B57\u7B26\u4E32\uFF08format \u4E0E unit \u4E92\u65A5\uFF09\uFF0C\u7981\u6B62\u5916\u90E8\u811A\u672C\u62FC\u503C\u6216\u5199\u6B7B\u8FC7\u671F\u65F6\u95F4\u3002\u4E1A\u52A1\u4E3B\u952E\u4E3A UUID \u7684\u5B57\u6BB5\u7528 \`uuid\` \u7C7B\u578B\uFF08\u5E26\u8FDE\u5B57\u7B26\u6807\u51C6\u5F62\u6001\uFF09\uFF0C\u65E0\u8FDE\u5B57\u7B26 32 \u4F4D\u7528 \`uuidHex\`\u3002\u6E20\u9053\u3001\u72B6\u6001\u7B49\u679A\u4E3E\u7C7B\u53C2\u6570\u9700\u8981\u968F\u673A\u4F46\u53EF\u590D\u73B0\u7684\u53D6\u503C\u65F6\u7528 \`enum\` \u7C7B\u578B\uFF1A\`values\` \u5019\u9009\u6570\u7EC4 + \u53EF\u9009 \`weights\` \u975E\u8D1F\u6743\u91CD\uFF08\u7F3A\u7701\u7B49\u6743\uFF0C\u6743\u91CD\u4E3A 0 \u7684\u5019\u9009\u6C38\u4E0D\u88AB\u9009\u4E2D\uFF09\uFF0C\u6309\u8F6E\u6B21\u786E\u5B9A\u6027\u62BD\u53D6\uFF08\u8F6E\u5185\u7A33\u5B9A\u3001\u8DE8\u8F6E\u53D8\u5316\uFF09\uFF1B\u679A\u4E3E\u53D6\u503C\u5FC5\u987B\u6709\u9879\u76EE\u8BC1\u636E\uFF0C\u4E0D\u5F97\u51ED\u7A7A\u7F16\u9020\u5019\u9009\u3002
8. \u9ED8\u8BA4\u4FDD\u6301 \`failurePolicy: "stop"\`\u3002\u4E0D\u540C\u9A8C\u8BC1\u76EE\u6807\u62C6\u6210\u72EC\u7ACB\u573A\u666F\uFF1B\u53EA\u6709\u540C\u4E00\u9A8C\u8BC1\u8DEF\u5F84\u786E\u5B9E\u9700\u8981\u7EE7\u7EED\u6536\u96C6\u540E\u7EED\u6B65\u9AA4\u7ED3\u679C\u65F6\u624D\u8BBE\u7F6E \`failurePolicy: "continue"\`\u3002\u53EA\u6709\u5728\u5B8C\u6210\u72B6\u6001\u5B57\u6BB5\u548C\u7EC8\u6001\u503C\u90FD\u6709\u8BC1\u636E\u65F6\u624D\u4F7F\u7528 \`retryUntil\`\uFF0C\u4E14 assertions \u5FC5\u987B\u65AD\u8A00\u8BE5\u7EC8\u6001\u503C\uFF1B\u53EA\u65AD\u8A00\u5B57\u6BB5\u5B58\u5728\u4F1A\u7ACB\u5373\u901A\u8FC7\uFF0C\u7981\u6B62\u914D\u5408 \`retryUntil\`\u3002\u5B8C\u6210\u72B6\u6001\u672A\u77E5\u65F6\u6700\u591A\u751F\u6210\u4E00\u6B21\u72B6\u6001\u67E5\u8BE2\u3002\u4E0D\u8981\u5199\u56FA\u5B9A sleep\u3002
9. \u9519\u8BEF\u54CD\u5E94\u4F53\u6CA1\u6709\u4EE3\u7801\u3001\u6587\u6863\u6216\u65E2\u6709\u6D4B\u8BD5\u4F9D\u636E\u65F6\uFF0C\u53EA\u65AD\u8A00\u5DF2\u786E\u8BA4\u7684 HTTP status\uFF0C\u4E0D\u80FD\u731C\u6D4B\u6216\u65AD\u8A00 code\u3001message\u3001error \u7B49\u5B57\u6BB5\u5B58\u5728\u3002
10. \u4E0D\u4FEE\u6539\u4E1A\u52A1\u4EE3\u7801\u3001\u6784\u5EFA\u914D\u7F6E\u6216\u516C\u5171\u8FD0\u884C\u65F6\uFF1B\u4E0D\u5199\u5165\u751F\u4EA7\u5730\u5740\u3001\u4E2A\u4EBA\u6570\u636E\u3001\u56FA\u5B9A Token \u6216\u975E\u6D4B\u8BD5\u51ED\u636E\u3002
11. \u843D\u76D8\u540E\u9010\u6587\u4EF6\u81EA\u68C0\uFF1A\u4E0D\u5F97\u51FA\u73B0\u65E0\u8BC1\u636E\u7684 SUCCESS\u3001PDF\u3001pdf\u3001\u9519\u8BEF\u5B57\u6BB5\u65AD\u8A00\u6216 \`retryUntil + exists\`\uFF1B\u6240\u6709\u5916\u90E8\u8F93\u5165\u53D8\u91CF\u5FC5\u987B\u5728\u914D\u7F6E\u4E2D\u58F0\u660E\uFF0C\u573A\u666F vars \u53EA\u4FDD\u5B58\u6D4B\u8BD5\u6807\u8BB0\u3001\u63D0\u53D6\u7ED3\u679C\u6216\u5185\u90E8\u72B6\u6001\u3002\u53D1\u73B0\u8FDD\u89C4\u5FC5\u987B\u5148\u4FEE\u6B63\u518D\u62A5\u544A\u3002
12. \u6700\u540E\u8BF4\u660E\u672C\u6B21\u76EE\u6807\u4E1A\u52A1\u529F\u80FD\u3001\u65B0\u589E/\u4FEE\u6539\u6587\u4EF6\u3001\u573A\u666F\u77E9\u9635\u3001\u5F85\u786E\u8BA4\u9879\u548C\u6BCF\u4E2A\u573A\u666F\u7684\u672C\u5730\u8FD0\u884C\u547D\u4EE4\uFF1B\u4E0D\u8981\u5B9E\u9645\u6267\u884C\u573A\u666F\u3002
`;
var SCENARIO_PATTERNS = [
  "# \u4E1A\u52A1\u529F\u80FD\u573A\u666F\u6A21\u5F0F\u5E93",
  "",
  "\u672C\u6587\u4EF6\u63D0\u4F9B\u4E3A\u5355\u4E2A\u4E1A\u52A1\u529F\u80FD\u7F16\u6392\u573A\u666F\u65F6\u53EF\u590D\u7528\u7684\u6B65\u9AA4\u7EC4\u5408\uFF0C\u4E0D\u662F\u8DE8\u529F\u80FD\u7AEF\u5230\u7AEF\u6D41\u7A0B\u6216\u63A5\u53E3\u6587\u6863\u3002\u6BCF\u6B21\u5148\u9009\u5B9A\u4E00\u4E2A\u660E\u786E\u4E1A\u52A1\u529F\u80FD\uFF0C\u518D\u6309\u771F\u5B9E\u4E1A\u52A1\u89C4\u5219\u7EC4\u5408\u8BE5\u529F\u80FD\u4E0B\u7684\u573A\u666F\u3002\u6240\u6709 <\u5360\u4F4D\u5185\u5BB9> \u5FC5\u987B\u4ECE\u5F53\u524D\u9879\u76EE\u4E2D\u4E0E\u8BE5\u529F\u80FD\u76F4\u63A5\u76F8\u5173\u7684 Controller\u3001OpenAPI\u3001\u524D\u7AEF API \u8C03\u7528\u3001\u63A5\u53E3\u6587\u6863\u6216\u65E2\u6709\u6D4B\u8BD5\u786E\u8BA4\u540E\u518D\u66FF\u6362\uFF0C\u4E0D\u80FD\u539F\u6837\u6267\u884C\u3002",
  "",
  "## \u4F7F\u7528\u65B9\u5F0F\uFF1A\u5148\u5B9A\u529F\u80FD\uFF0C\u518D\u8BBE\u8BA1\u573A\u666F\u77E9\u9635",
  "",
  "1. \u4E00\u6B21\u53EA\u5904\u7406\u4E00\u4E2A\u4E1A\u52A1\u529F\u80FD\uFF0C\u5148\u660E\u786E\u529F\u80FD\u76EE\u6807\u3001\u53C2\u4E0E\u89D2\u8272\u3001\u89E6\u53D1\u5165\u53E3\u3001\u524D\u7F6E\u6761\u4EF6\u3001\u4E1A\u52A1\u89C4\u5219\u3001\u72B6\u6001\u53D8\u5316\uFF0C\u4EE5\u53CA\u76F4\u63A5\u76F8\u5173\u7684\u63A5\u53E3\uFF1B\u8303\u56F4\u4E0D\u6E05\u65F6\u5148\u8BE2\u95EE\uFF0C\u4E0D\u626B\u63CF\u6574\u4E2A\u9879\u76EE\u6279\u91CF\u751F\u6210\u3002",
  "2. \u4E1A\u52A1\u529F\u80FD\u662F\u8FB9\u754C\uFF0C\u573A\u666F\u662F\u8BE5\u529F\u80FD\u4E0B\u7684\u4E00\u6761\u72EC\u7ACB\u9A8C\u8BC1\u8DEF\u5F84\u3002\u6309\u8BC1\u636E\u8003\u8651\u6210\u529F\u8DEF\u5F84\u3001\u4E1A\u52A1\u89C4\u5219/\u53C2\u6570\u6821\u9A8C\u3001\u6743\u9650\u3001\u8FB9\u754C\u503C\u3001\u91CD\u590D\u64CD\u4F5C\u6216\u5E42\u7B49\u3001\u5408\u6CD5\u4E0E\u975E\u6CD5\u72B6\u6001\u6D41\u8F6C\uFF1B\u6CA1\u6709\u4F9D\u636E\u7684\u7C7B\u522B\u4E0D\u751F\u6210\u3002",
  "3. \u4E00\u4E2A\u573A\u666F\u53EF\u4EE5\u5305\u542B\u51C6\u5907\u3001\u6267\u884C\u3001\u67E5\u8BE2\u9A8C\u8BC1\u548C\u7CBE\u786E\u6E05\u7406\u7B49\u591A\u4E2A\u6B65\u9AA4\uFF0C\u4F46\u6240\u6709\u6B65\u9AA4\u53EA\u670D\u52A1\u4E8E\u76EE\u6807\u529F\u80FD\u3002\u4E0D\u8981\u4E3A\u4E86\u8FFD\u6C42\u201C\u5B8C\u6574\u6D41\u7A0B\u201D\u628A\u76F8\u90BB\u4E1A\u52A1\u529F\u80FD\u4E32\u5165\u540C\u4E00\u573A\u666F\u3002\u8BA4\u8BC1\u7B49\u516C\u5171\u524D\u7F6E\u53EF\u4EE5\u4F5C\u4E3A\u51C6\u5907\u6B65\u9AA4\u3002",
  "4. \u5EFA\u8BAE\u4F7F\u7528 scenarios/<\u529F\u80FD\u6807\u8BC6>/<\u9A8C\u8BC1\u8DEF\u5F84>.js \u7EC4\u7EC7\u6587\u4EF6\uFF0C\u5E76\u4F7F\u7528 <\u529F\u80FD\u6807\u8BC6>-<\u9A8C\u8BC1\u8DEF\u5F84> \u4F5C\u4E3A\u7A33\u5B9A\u573A\u666F id\uFF0C\u4F8B\u5982 order-review-success\u3001order-review-forbidden\uFF1B\u8FD0\u884C\u65F6\u4ECD\u4F7F\u7528\u6241\u5E73 scenarios \u6E05\u5355\uFF0C\u4E0D\u9700\u8981\u65B0\u589E\u529F\u80FD\u5206\u7EC4\u5B57\u6BB5\u3002",
  "5. \u6BCF\u4E2A\u573A\u666F\u72EC\u7ACB\u8FD0\u884C\uFF1A\u81EA\u5DF1\u6EE1\u8DB3\u524D\u7F6E\u6761\u4EF6\u6216\u8BFB\u53D6\u914D\u7F6E\u53D8\u91CF\uFF0C\u81EA\u5DF1\u63D0\u53D6 ID\uFF0C\u4E0D\u80FD\u4F9D\u8D56\u5176\u4ED6\u573A\u666F\u6216\u4E0A\u6B21\u8FD0\u884C\u7559\u4E0B\u7684\u6570\u636E\u3002",
  "6. \u786E\u8BA4\u573A\u666F\u5185\u6BCF\u4E2A\u63A5\u53E3\u7684\u65B9\u6CD5\u3001\u8DEF\u5F84\u3001\u8BA4\u8BC1\u4F4D\u7F6E\u3001\u8BF7\u6C42\u5B57\u6BB5\u3001\u54CD\u5E94\u7ED3\u6784\u3001\u662F\u5426\u5199\u6570\u636E\u548C\u5B89\u5168\u6E05\u7406\u65B9\u5F0F\u3002\u5728 scenario.config.js \u6CE8\u518C\u573A\u666F id\u3001\u540D\u79F0\u548C\u6587\u4EF6\u5730\u5740\uFF1B\u6587\u4EF6\u6CE8\u518C id \u5FC5\u987B\u4E00\u81F4\u3002",
  "7. \u6BCF\u4E00\u6B65\u90FD\u5199 name\u3001method\u3001path\u3001status\uFF1B\u5173\u952E\u4E1A\u52A1\u7ED3\u679C\u5199 assertions\uFF1B\u8DE8\u6B65\u9AA4\u6570\u636E\u901A\u8FC7 extract \u4FDD\u5B58\uFF1Bfrom: 'headers' \u7684 path \u9996\u6BB5\u5934\u540D\u5927\u5C0F\u5199\u4E0D\u654F\u611F\u5339\u914D\uFF08\u4E0E\u65AD\u8A00 from: 'headers'\u3001header \u7B80\u5199\u540C\u53E3\u5F84\uFF09\uFF0C\u9996\u6BB5\u540E\u7684\u5B50\u8DEF\u5F84\u5728\u5934\u503C\u4E0A\u53D6\u3002Query \u53C2\u6570\u5199\u5728\u6B65\u9AA4\u9876\u5C42 params\uFF0C\u4E0D\u5199 request.params\uFF1BGET/HEAD \u4E0D\u5199\u8BF7\u6C42\u4F53\uFF08request.body\u3001request.fileUpload \u5B9A\u4E49\u671F\u5373\u88AB\u62D2\uFF09\uFF0C\u53C2\u6570\u4E00\u5F8B\u653E params\u3002",
  "8. runId \u548C runNo \u7531\u8FD0\u884C\u65F6\u81EA\u52A8\u751F\u6210\uFF0C\u4E0D\u8981\u5728 vars\u3001variables\u3001envVars\u3001generatedVars \u6216 extract \u4E2D\u5B9A\u4E49\u3002\u6A21\u5F0F\u4E2D\u7684\u72B6\u6001\u3001\u683C\u5F0F\u3001\u9519\u8BEF\u7801\u548C\u54CD\u5E94\u5B57\u6BB5\u90FD\u662F\u7ED3\u6784\u5360\u4F4D\uFF0C\u5FC5\u987B\u6709\u9879\u76EE\u8BC1\u636E\u624D\u80FD\u91C7\u7528\u3002 \u9700\u8981\u552F\u4E00\u53F7\u7801/\u8BC1\u53F7\u7684\u6D4B\u8BD5\u6570\u636E\u5728 generatedVars \u58F0\u660E\uFF1A\u8EAB\u4EFD\u8BC1 { name, type: 'idcard', birthDate, gender }\u3001\u94F6\u884C\u5361 { name, type: 'luhn', length, prefix }\u3001\u624B\u673A\u53F7 { name, type: 'phone', prefix }\u3001\u7EDF\u4E00\u793E\u4F1A\u4FE1\u7528\u4EE3\u7801 { name, type: 'uscc', regionCode }\uFF0C\u5F15\u64CE\u6309\u8F6E\u6B21\u751F\u6210\u6821\u9A8C\u4F4D\u5408\u6CD5\u4E14\u8DE8\u8F6E\u552F\u4E00\u7684\u503C\uFF0C\u7528 {{vars.<name>}} \u5F15\u7528\u3002 \u65F6\u95F4\u7A97/\u8FC7\u671F\u7C7B\u53C2\u6570\u7528 timestamp \u7C7B\u578B\uFF1A{ name, type: 'timestamp', offset: '-7d', unit: 's' } \u6216 { name, type: 'timestamp', offset: '+30d', format: 'YYYY-MM-DD HH:mm:ss' }\uFF08offset \u6570\u5B57+\u5355\u4F4D ms/s/m/h/d/w\uFF1Bformat \u4E0E unit \u4E92\u65A5\uFF09\uFF0C\u7981\u6B62\u5199\u6B7B\u65F6\u95F4\u6233\u6216\u65E5\u671F\u5B57\u7B26\u4E32\u3002\u4E1A\u52A1\u4E3B\u952E UUID \u7528 { name, type: 'uuid' }\uFF08\u5E26\u8FDE\u5B57\u7B26\uFF09\uFF0C32 \u4F4D\u65E0\u8FDE\u5B57\u7B26\u7528 uuidHex\u3002\u6E20\u9053/\u72B6\u6001\u7B49\u679A\u4E3E\u53C2\u6570\u9700\u8981\u968F\u673A\u4F46\u53EF\u590D\u73B0\u7684\u53D6\u503C\u65F6\u7528 enum\uFF1A{ name, type: 'enum', values: [<\u5019\u9009>], weights: [<\u975E\u8D1F\u6743\u91CD\uFF0C\u53EF\u9009>] }\uFF0C\u7F3A\u7701\u7B49\u6743\u3001\u6743\u91CD 0 \u7684\u5019\u9009\u6C38\u4E0D\u9009\u4E2D\uFF0C\u6309\u8F6E\u6B21\u786E\u5B9A\u6027\u62BD\u53D6\uFF1B\u5019\u9009\u5FC5\u987B\u6709\u9879\u76EE\u8BC1\u636E\u3002",
  "9. \u65E0\u6CD5\u786E\u8BA4\u7684\u5FC5\u586B\u8BF7\u6C42\u503C\u653E\u5165\u914D\u7F6E vars \u7559\u7A7A\uFF0C\u5E76\u5728 variables \u58F0\u660E required: true\uFF1B\u4E0D\u5F97\u7528 PDF\u3001pdf\u3001SUCCESS \u6216 scenario-{{vars.runNo}} \u5145\u5F53\u672A\u77E5\u679A\u4E3E\u3002",
  `10. \u65AD\u8A00\u64CD\u4F5C\u7B26\uFF1A${OPERATORS_TEXT}\uFF1B\u6570\u503C\u6BD4\u8F83\uFF08\u6761\u6570\u4E0D\u5C11\u4E8E N\uFF09\u7528 gte: N\uFF0C\u683C\u5F0F\u6821\u9A8C\uFF08\u975E\u8D1F\u6574\u6570\uFF09\u7528 matches: '^\\\\d+$'\uFF0C\u5217\u8868\u6761\u6570/\u5B57\u7B26\u4E32\u957F\u5EA6/\u5BF9\u8C61\u952E\u6570\u7528 length: N\uFF08\u6570\u7EC4\u5143\u7D20\u6570\u3001\u5B57\u7B26\u4E32\u5B57\u7B26\u6570\u3001\u5BF9\u8C61\u952E\u6570\uFF09\u3002\u63A5\u53E3\u8017\u65F6\u4E0A\u9650\u7528 { target: 'duration', lte: 800 }\uFF08\u6BEB\u79D2\uFF0C\u5355\u6B21\u8BF7\u6C42\u8017\u65F6\uFF09\u3002when \u5BF9\u8C61\u5F62\u5F0F\u6765\u6E90\u4E3A from: 'vars'\uFF08\u5DF2\u63D0\u53D6\u53D8\u91CF\uFF09\u3001from: 'lastResponse'\uFF08\u4E0A\u4E00\u6B65\u54CD\u5E94 body\uFF09\u6216 from: 'status'\uFF08\u4E0A\u4E00\u6B65 HTTP \u72B6\u6001\u7801\uFF09\uFF0C\u4E5F\u53EF\u7528 target: 'status' \u8BFB\u4E0A\u4E00\u6B65\u72B6\u6001\u7801\uFF1B\u7B2C\u4E00\u6B65\u65E0\u4E0A\u4E00\u6B65\u54CD\u5E94\u65F6\u6761\u4EF6\u4E0D\u6210\u7ACB\u3001\u4E0D\u4E2D\u65AD\u573A\u666F\u3002extract \u53EF\u52A0 required: true \u5F3A\u5236\u8DEF\u5F84\u5B58\u5728\uFF1Bfrom: 'headers' \u914D path \u65F6\u9996\u6BB5\u5934\u540D\u6309\u5927\u5C0F\u5199\u4E0D\u654F\u611F\u5339\u914D\uFF08\u4E0E\u65AD\u8A00 from: 'headers'\u3001header \u7B80\u5199\u540C\u53E3\u5F84\uFF0C\u65E0\u9700\u4E3A\u5927\u5C0F\u5199\u53D8\u4F53\u91CD\u590D\u914D\u7F6E\uFF09\uFF0C\u9996\u6BB5\u540E\u7684\u5B50\u8DEF\u5F84\u5728\u5934\u503C\u4E0A\u53D6\u3002\u6A21\u677F {{ }} \u53EA\u505A\u8DEF\u5F84\u53D6\u503C\uFF0C\u4E0D\u652F\u6301\u6BD4\u8F83/\u4E09\u5143/\u903B\u8F91\u8FD0\u7B97/\u51FD\u6570\u8C03\u7528\uFF08\u5982 {{vars.a > 0}} \u5B9A\u4E49\u671F\u5373\u88AB\u62D2\uFF09\uFF0C\u6761\u4EF6\u5224\u65AD\u7528 assertions \u6216 when \u5BF9\u8C61\u5F62\u5F0F\u3002`,
  "",
  "\u4EE5\u4E0B\u6A21\u5F0F\u662F\u529F\u80FD\u573A\u666F\u5185\u90E8\u7684\u6B65\u9AA4\u7EC4\u5408\u3002\u6309\u76EE\u6807\u529F\u80FD\u6240\u9700\u9009\u7528\uFF0C\u4E0D\u8981\u6C42\u5168\u90E8\u4F7F\u7528\uFF0C\u4E5F\u4E0D\u8981\u628A\u6240\u6709\u6A21\u5F0F\u62FC\u6210\u4E00\u4E2A\u5927\u573A\u666F\u3002",
  "",
  "## \u6A21\u5F0F\u4E00\uFF1A\u767B\u5F55\u3001\u63D0\u53D6 Token\u3001\u540E\u7EED\u8BF7\u6C42\u5F15\u7528",
  "",
  "\u9002\u7528\uFF1A\u767B\u5F55\u63A5\u53E3\u548C Token \u54CD\u5E94\u8DEF\u5F84\u5DF2\u5728\u9879\u76EE\u4E2D\u786E\u8BA4\u3002\u8BA4\u8BC1\u662F\u666E\u901A\u573A\u666F\u6B65\u9AA4\uFF0C\u4E0D\u662F\u6846\u67B6\u914D\u7F6E\u3002",
  "",
  '    ScenarioTest.registerScenario("login-and-profile", ScenarioTest.defineScenario({',
  '        name: "\u767B\u5F55\u5E76\u67E5\u8BE2\u5F53\u524D\u7528\u6237", vars: { accessToken: "" }, steps: [',
  '            { name: "\u767B\u5F55\u83B7\u53D6\u4EE4\u724C", method: "POST", path: "<\u767B\u5F55\u8DEF\u5F84>",',
  '              request: { body: { username: "{{vars.username}}", password: "{{vars.password}}" } }, status: 200,',
  '              assertions: [{ name: "\u4EE4\u724C\u5B58\u5728", path: "data.accessToken", exists: true }],',
  '              extract: [{ name: "accessToken", path: "data.accessToken" }] },',
  '            { name: "\u67E5\u8BE2\u5F53\u524D\u7528\u6237", method: "GET", path: "<\u5F53\u524D\u7528\u6237\u8DEF\u5F84>",',
  '              request: { headers: { Authorization: "Bearer {{vars.accessToken}}" } }, status: 200,',
  '              assertions: [{ name: "\u7528\u6237 ID \u5B58\u5728", path: "data.id", exists: true }] }',
  "        ]",
  "    }));",
  "",
  '\u8BA4\u8BC1\u4F4D\u4E8E Query\u3001Header \u6216 Body \u65F6\uFF0C\u76F4\u63A5\u5728 params\u3001request.headers \u6216 request.body \u5F15\u7528\u53D8\u91CF\u3002\u6D4F\u89C8\u5668 Cookie \u4F1A\u8BDD\u5FC5\u987B\u6709\u4EE3\u7801\u4F9D\u636E\u5E76\u663E\u5F0F\u8BBE\u7F6E request.credentials: "include"\uFF1BNode CLI \u5F53\u524D\u4E0D\u63D0\u4F9B\u81EA\u52A8 Cookie Jar\u3002\u6CA1\u6709\u53EF\u786E\u8BA4\u767B\u5F55\u63A5\u53E3\u65F6\uFF0C\u53EA\u5728 vars \u548C variables \u4E2D\u58F0\u660E\u5DF2\u6709\u51ED\u636E\uFF0C\u4E0D\u80FD\u865A\u6784\u767B\u5F55\u6D41\u7A0B\u3002',
  "",
  "## \u6A21\u5F0F\u4E8C\uFF1A\u53EA\u8BFB\u5217\u8868\u3001\u63D0\u53D6 ID\u3001\u8BE6\u60C5\u6821\u9A8C",
  "",
  '    ScenarioTest.registerScenario("record-list-detail", ScenarioTest.defineScenario({',
  '        name: "\u67E5\u8BE2\u8BB0\u5F55\u5217\u8868\u548C\u8BE6\u60C5", vars: { recordId: "" }, steps: [',
  '            { name: "\u67E5\u8BE2\u7B2C\u4E00\u9875\u8BB0\u5F55", method: "GET", path: "<\u5217\u8868\u8DEF\u5F84>",',
  '              params: { pageNo: 1, pageSize: 10, keyword: "{{vars.keyword}}" }, status: 200,',
  '              assertions: [{ name: "\u5217\u8868\u5B58\u5728", path: "data.records", exists: true }],',
  '              extract: [{ name: "recordId", path: "data.records[0].id" }] },',
  '            { name: "\u67E5\u8BE2\u7B2C\u4E00\u6761\u8BB0\u5F55\u8BE6\u60C5", when: { from: "vars", path: "recordId", exists: true },',
  '              method: "GET", path: "<\u8BE6\u60C5\u8DEF\u5F84>/{{vars.recordId}}", status: 200,',
  '              assertions: [{ name: "\u8BE6\u60C5 ID \u5339\u914D", path: "data.id", equals: "{{vars.recordId}}" }] }',
  "        ]",
  "    }));",
  "",
  "\u5217\u8868\u5141\u8BB8\u4E3A\u7A7A\u65F6\u4FDD\u7559 when \u8BA9\u8BE6\u60C5\u8DF3\u8FC7\uFF0C\u6216\u5728\u786E\u8BA4\u5B89\u5168\u524D\u7F6E\u6761\u4EF6\u540E\u5148\u521B\u5EFA\u4E13\u5C5E\u6D4B\u8BD5\u6570\u636E\uFF1B\u4E0D\u8981\u5047\u5B9A\u4EFB\u4F55\u73AF\u5883\u4E00\u5B9A\u6709\u6570\u636E\u3002",
  "",
  "\u9700\u8981\u6309\u4E0A\u4E00\u6B65\u54CD\u5E94\u51B3\u5B9A\u662F\u5426\u7EE7\u7EED\u65F6\uFF0C\u76F4\u63A5\u7528 when \u7684\u54CD\u5E94\u6765\u6E90\uFF0C\u4E0D\u5FC5\u5148 extract \u4E00\u4E2A\u4E34\u65F6\u53D8\u91CF\uFF1A",
  "",
  "    // \u4E0A\u4E00\u6B65\u54CD\u5E94 body \u7684 data.ready \u4E3A true \u624D\u7EE7\u7EED\uFF08\u5B50\u8DEF\u5F84\u53E3\u5F84\u540C extract from: 'body'\uFF09",
  '    { name: "\u7EE7\u7EED\u6821\u9A8C", method: "GET", path: "<\u8BE6\u60C5\u8DEF\u5F84>", when: { from: "lastResponse", path: "data.ready", equals: true } }',
  "    // \u4E0A\u4E00\u6B65 HTTP \u72B6\u6001\u7801\u4E3A 202 \u624D\u7EE7\u7EED\uFF1Bfrom: 'status' \u4E0E target: 'status' \u7B49\u4EF7",
  '    { name: "\u67E5\u8BE2\u5904\u7406\u7ED3\u679C", method: "GET", path: "<\u7ED3\u679C\u8DEF\u5F84>", when: { from: "status", equals: 202 } }',
  "",
  "\u7B2C\u4E00\u6B65\u6CA1\u6709\u4E0A\u4E00\u6B65\u54CD\u5E94\uFF1A\u5F15\u7528 lastResponse/status \u65F6\u6309\u6765\u6E90\u7F3A\u5931\u5904\u7406\uFF0C\u6761\u4EF6\u4E0D\u6210\u7ACB\uFF08\u6B65\u9AA4 SKIP\uFF09\uFF0C\u4E0D\u4F1A\u629B\u9519\u4E2D\u65AD\u573A\u666F\u3002",
  "",
  "## \u6A21\u5F0F\u4E09\uFF1A\u521B\u5EFA\u3001\u67E5\u8BE2\u3001\u7CBE\u786E\u6E05\u7406",
  "",
  '    ScenarioTest.registerScenario("record-create-query-cleanup", ScenarioTest.defineScenario({',
  '        name: "\u521B\u5EFA\u3001\u67E5\u8BE2\u5E76\u6E05\u7406\u6D4B\u8BD5\u8BB0\u5F55",',
  '        vars: { recordId: "", recordName: "scenario-{{vars.runNo}}" }, steps: [',
  '            { name: "\u521B\u5EFA\u6D4B\u8BD5\u8BB0\u5F55", method: "POST", path: "<\u521B\u5EFA\u8DEF\u5F84>", request: { body: { name: "{{vars.recordName}}" } }, status: 201, extract: [{ name: "recordId", path: "data.id" }] },',
  '            { name: "\u67E5\u8BE2\u521A\u521B\u5EFA\u7684\u8BB0\u5F55", method: "GET", path: "<\u8BE6\u60C5\u8DEF\u5F84>/{{vars.recordId}}", status: 200, assertions: [{ name: "\u540D\u79F0\u5339\u914D\u672C\u6B21\u6807\u8BB0", path: "data.name", equals: "{{vars.recordName}}" }] },',
  '            { name: "\u5220\u9664\u672C\u6B21\u521B\u5EFA\u7684\u8BB0\u5F55", when: { from: "vars", path: "recordId", exists: true }, method: "DELETE", path: "<\u5220\u9664\u8DEF\u5F84>/{{vars.recordId}}", status: 204 }',
  "        ]",
  "    }));",
  "",
  "\u6570\u636E\u540D\u5FC5\u987B\u6709 scenario-{{vars.runNo}} \u4E00\u7C7B\u6D4B\u8BD5\u6807\u8BB0\u3002\u53EA\u6709\u5220\u9664\u63A5\u53E3\u3001\u6743\u9650\u548C\u6761\u4EF6\u5747\u5DF2\u786E\u8BA4\u65F6\u624D\u52A0\u5165\u6E05\u7406\uFF1B\u4E25\u7981\u6309\u540D\u79F0\u6A21\u7CCA\u5339\u914D\u6216\u5220\u9664\u672A\u5E26\u573A\u666F\u6807\u8BB0\u7684\u6570\u636E\u3002",
  "",
  "## \u6A21\u5F0F\u56DB\uFF1A\u63D0\u4EA4\u5F02\u6B65\u4EFB\u52A1\u5E76\u8F6E\u8BE2",
  "",
  '    ScenarioTest.registerScenario("task-submit-poll", ScenarioTest.defineScenario({',
  '        name: "\u63D0\u4EA4\u4EFB\u52A1\u5E76\u7B49\u5F85\u5B8C\u6210", vars: { taskId: "" }, steps: [',
  '            { name: "\u63D0\u4EA4\u4EFB\u52A1", method: "POST", path: "<\u63D0\u4EA4\u8DEF\u5F84>", status: 202, extract: [{ name: "taskId", path: "data.taskId" }] },',
  '            { name: "\u8F6E\u8BE2\u76F4\u5230\u4EFB\u52A1\u6210\u529F", method: "GET", path: "<\u4EFB\u52A1\u8BE6\u60C5\u8DEF\u5F84>/{{vars.taskId}}", status: 200, retryUntil: { maxAttempts: 10, intervalMs: 1000 }, assertions: [{ name: "\u4EFB\u52A1\u6210\u529F", path: "<\u72B6\u6001\u5B57\u6BB5>", equals: "<\u5DF2\u786E\u8BA4\u7684\u5B8C\u6210\u72B6\u6001>" }] }',
  "        ]",
  "    }));",
  "",
  "\u7981\u6B62\u56FA\u5B9A sleep\uFF0C\u4F7F\u7528 retryUntil\u3002maxAttempts \u662F\u6700\u5927\u5C1D\u8BD5\u603B\u6B21\u6570\uFF08\u542B\u9996\u6B21\u8BF7\u6C42\uFF09\uFF1B\u91CD\u8BD5\u6B21\u6570\u3001\u95F4\u9694\u3001\u72B6\u6001\u5B57\u6BB5\u548C\u5B8C\u6210\u72B6\u6001\u5FC5\u987B\u4ECE\u9879\u76EE\u5B9E\u73B0\u3001\u679A\u4E3E\u3001\u6587\u6863\u6216\u65E2\u6709\u6D4B\u8BD5\u786E\u8BA4\uFF1B\u65E0\u6CD5\u786E\u8BA4\u7EC8\u6001\u65F6\u6700\u591A\u751F\u6210\u4E00\u6B21\u72B6\u6001\u67E5\u8BE2\uFF0C\u4E0D\u751F\u6210 retryUntil\u3002retryUntil \u7684\u65AD\u8A00\u5FC5\u987B\u6BD4\u8F83\u5DF2\u786E\u8BA4\u7EC8\u6001\uFF0C\u4E0D\u80FD\u53EA\u68C0\u67E5 exists\u3002",
  "",
  "## \u6A21\u5F0F\u4E94\uFF1A\u4E3A\u6821\u9A8C\u5931\u8D25\u4E0E\u6743\u9650\u62D2\u7EDD\u5206\u522B\u5EFA\u573A\u666F",
  "",
  "\u540C\u4E00\u4E1A\u52A1\u529F\u80FD\u7684\u4E0D\u540C\u9A8C\u8BC1\u8DEF\u5F84\u4F7F\u7528\u72EC\u7ACB\u573A\u666F\uFF0C\u4E0D\u628A\u53C2\u6570\u6821\u9A8C\u3001\u6743\u9650\u3001\u8FB9\u754C\u503C\u7B49\u4E92\u4E0D\u4F9D\u8D56\u7684\u5931\u8D25\u5206\u652F\u585E\u8FDB\u4E00\u4E2A failurePolicy: continue \u573A\u666F\u3002\u793A\u4F8B\uFF1A",
  "",
  '    ScenarioTest.registerScenario("record-create-required-field", ScenarioTest.defineScenario({',
  '        name: "\u8BB0\u5F55\u521B\u5EFA / \u7F3A\u5C11\u5FC5\u586B\u5B57\u6BB5", steps: [',
  '            { name: "\u7F3A\u5C11\u5FC5\u586B\u5B57\u6BB5\u65F6\u521B\u5EFA\u88AB\u62D2\u7EDD", method: "POST", path: "<\u521B\u5EFA\u8DEF\u5F84>", request: { body: {} }, status: 400, assertions: [{ name: "\u8FD4\u56DE\u5DF2\u786E\u8BA4\u9519\u8BEF\u7801", path: "code", equals: "<\u9519\u8BEF\u7801>" }] }',
  "        ]",
  "    }));",
  "",
  '    ScenarioTest.registerScenario("record-create-unauthorized", ScenarioTest.defineScenario({',
  '        name: "\u8BB0\u5F55\u521B\u5EFA / \u672A\u8BA4\u8BC1\u62D2\u7EDD", steps: [',
  '            { name: "\u672A\u8BA4\u8BC1\u65F6\u521B\u5EFA\u88AB\u62D2\u7EDD", method: "POST", path: "<\u521B\u5EFA\u8DEF\u5F84>", request: { body: { "<\u5DF2\u786E\u8BA4\u5B57\u6BB5\u540D>": "<\u5DF2\u786E\u8BA4\u5408\u6CD5\u503C>" } }, status: 401 }',
  "        ]",
  "    }));",
  "",
  "\u72B6\u6001\u7801\u548C\u4E1A\u52A1\u9519\u8BEF\u7801\u5FC5\u987B\u6765\u81EA\u771F\u5B9E\u4EE3\u7801\u6216\u6587\u6863\u3002\u9519\u8BEF\u54CD\u5E94\u4F53\u6CA1\u6709\u8BC1\u636E\u65F6\u53EA\u65AD\u8A00 HTTP status\uFF0C\u4E0D\u65AD\u8A00 code\u3001message\u3001error \u7B49\u5B57\u6BB5\u3002failurePolicy: continue \u53EA\u7528\u4E8E\u540C\u4E00\u9A8C\u8BC1\u8DEF\u5F84\u4E2D\u9700\u8981\u7EE7\u7EED\u6536\u96C6\u7684\u6B65\u9AA4\u5931\u8D25\uFF0C\u4E0D\u80FD\u7528\u6765\u5408\u5E76\u4E0D\u540C\u573A\u666F\u3002",
  "",
  "## \u7ED9 AI \u7684\u6700\u5C0F\u8F93\u5165",
  "",
  "AI \u65E0\u6CD5\u5B9A\u4F4D\u63A5\u53E3\u65F6\uFF0C\u63D0\u4F9B Controller \u6587\u4EF6\u8DEF\u5F84\u3001OpenAPI \u5BFC\u51FA\u3001\u524D\u7AEF API \u6A21\u5757\u8DEF\u5F84\u3001\u5DF2\u6709\u8BF7\u6C42\u54CD\u5E94\u6837\u4F8B\u3001\u8BA4\u8BC1\u63A5\u53E3\u6837\u4F8B\u6216\u6D4B\u8BD5\u53D8\u91CF\u540D\u4E2D\u7684\u4EFB\u4E00\u9879\u3002\u4E0D\u8981\u63D0\u4F9B\u751F\u4EA7\u51ED\u636E\u6216\u4E2A\u4EBA\u6570\u636E\u3002"
].join("\n");
function createProjectFiles(directory = "scenario-test", options = {}) {
  const storagePrefix = options.storagePrefix || "scenario-test.project";
  const frameworkPrefix = `${directory}/.scenario-test`;
  const frameworkDisplay = `.scenario-test/`;
  const authoringPromptPath = `${frameworkPrefix}/AI_SCENARIO_PROMPT.md`;
  return {
    [`${directory}/index.html`]: `<!doctype html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>\u573A\u666F\u6D4B\u8BD5</title>
</head>
<body style="margin:0">
    <div id="scenario-test" style="height:100vh"></div>
    <!-- \u8FD0\u884C\u65F6\u4E3A\u9879\u76EE\u5185\u526F\u672C .scenario-test/scenario-test.umd.js\uFF08init \u843D\u76D8\uFF0C\u79BB\u7EBF\u53EF\u7528\uFF09\uFF1B\u63A5\u53E3\u901A\u8FC7 serve \u4EE3\u7406\u8BBF\u95EE -->
    <script src="./.scenario-test/scenario-test.umd.js"></script>
    <script src="./scenario.config.js"></script>
    <script>
        ScenarioTest.createApp({ mount: "#scenario-test", config: ScenarioTest.getConfig() });
    </script>
</body>
</html>
`,
    [`${directory}/start-scenario-test.cmd`]: `@echo off
setlocal
cd /d "%~dp0"

rem Ask Windows for a random free loopback port so projects can run together.
for /f "usebackq delims=" %%P in (\`powershell.exe -NoProfile -Command "$listener=[System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,0); $listener.Start(); $port=($listener.LocalEndpoint).Port; $listener.Stop(); Write-Output $port"\`) do set "SCENARIO_TEST_PORT=%%P"
if not defined SCENARIO_TEST_PORT (
    echo Scenario Test failed to allocate a free port.
    exit /b 1
)

set "SCENARIO_TEST_URL=http://127.0.0.1:%SCENARIO_TEST_PORT%/"
start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Milliseconds 700; Start-Process '%SCENARIO_TEST_URL%'"
call node "%~dp0.scenario-test\\scenario-test-cli.cjs" serve --config "%~dp0scenario.config.js" --port %SCENARIO_TEST_PORT%

if errorlevel 1 (
    echo.
    echo Scenario Test failed to start. Run init first to generate runtime files.
    pause
)
`,
    [`${directory}/scenario.config.js`]: `/// <reference path="./.scenario-test/scenario-test.d.ts" />
ScenarioTest.registerConfig(ScenarioTest.defineConfig({
    envs: [
        {
            key: "local",
            name: "\u672C\u5730\u5F00\u53D1",
            baseUrl: "http://localhost:8080",
            // \u672A\u786E\u8BA4\u524D\u4FDD\u6301\u4E3A\u7A7A\uFF1B\u6309\u771F\u5B9E\u9879\u76EE\u9700\u8981\u6DFB\u52A0 header / cookie / query
            globals: []
        }
    ],
    defaultEnvKey: "local",
    storagePrefix: ${JSON.stringify(storagePrefix)},
    requestTimeoutMs: 30000,
    vars: {},
    variables: [],
    scenarios: []
}));
`,
    [`${frameworkPrefix}/AI_SCENARIO_PROMPT.md`]: AUTHORING_PROMPT,
    [`${frameworkPrefix}/SCENARIO_PATTERNS.md`]: SCENARIO_PATTERNS,
    [`${directory}/README.md`]: `# \u573A\u666F\u6D4B\u8BD5

\u672C\u76EE\u5F55\u662F\u5F53\u524D\u9879\u76EE\u7684\u573A\u666F\u6D4B\u8BD5\u5165\u53E3\u3002\u5B83\u4E0E\u4E1A\u52A1\u4EE3\u7801\u540C\u4ED3\u7EF4\u62A4\uFF1A\u73AF\u5883\u5730\u5740\u3001\u6D4B\u8BD5\u53D8\u91CF\u3001\u573A\u666F\u6587\u4EF6\u548C\u9879\u76EE\u4E13\u5C5E\u63D2\u4EF6\u653E\u5728\u8FD9\u91CC\uFF1B\u6D4F\u89C8\u5668\u5DE5\u4F5C\u53F0\u4E0E CLI \u7531 @yc_yzkj/scenario-test \u63D0\u4F9B\uFF08\u8FD0\u884C\u65F6\u526F\u672C\u5728 \`${frameworkDisplay}\`\uFF0C\u7531 init \u6216\u5B89\u88C5\u811A\u672C\u843D\u76D8\uFF09\u3002

\u9ED8\u8BA4\u514D npm \u63A5\u5165\uFF1A\u4E0D\u5B89\u88C5 npm \u5305\u3001\u4E0D\u6539 package.json\uFF0C\u76F4\u63A5\u4F7F\u7528 \`${frameworkDisplay}\` \u5185\u7684\u8FD0\u884C\u65F6\u526F\u672C\uFF08\u4ECD\u9700 Node.js 18+\uFF09\u3002\u504F\u597D\u5305\u7BA1\u7406\u7684\u56E2\u961F\u53EF\u663E\u5F0F\u9009\u62E9 npm \u6A21\u5F0F\uFF08\`npm install -D @yc_yzkj/scenario-test\` + \`npx @yc_yzkj/scenario-test\`\uFF09\uFF1B\u4E24\u79CD\u65B9\u5F0F\u4E0D\u6DF7\u7528\u3001\u4E0D\u81EA\u52A8\u5207\u6362\u3002\u9879\u76EE\u5185 \`${frameworkDisplay}\` \u4FDD\u5B58 AI \u89C4\u5219\u3001\u6A21\u5F0F\u5E93\u4E0E\u8FD0\u884C\u65F6\u526F\u672C\uFF08CLI\u3001UMD\u3001d.ts\u3001\u80FD\u529B\u6E05\u5355\uFF09\uFF0C\u4E1A\u52A1\u4EBA\u5458\u901A\u5E38\u4E0D\u9700\u8981\u6253\u5F00\u6216\u4FEE\u6539\u3002

## \u5F00\u59CB\u4F7F\u7528

\u5982\u679C\u5B89\u88C5\u4F1A\u8BDD\u8FD8\u5728\u7EE7\u7EED\uFF0C\u76F4\u63A5\u56DE\u7B54 AI \u63D0\u51FA\u7684\u4E1A\u52A1\u529F\u80FD\u95EE\u9898\u5373\u53EF\uFF1BAI \u5DF2\u8BFB\u53D6\u672C\u76EE\u5F55\u7684\u89C4\u5219\uFF0C\u4E0D\u9700\u8981\u518D\u6B21\u590D\u5236\u4EFB\u4F55 Prompt\u3002

\u5982\u679C\u65B0\u5F00\u4E86 AI \u4F1A\u8BDD\uFF0C\u53EA\u9700\u8F93\u5165\uFF1A

\`\`\`text
\u8BF7\u8BFB\u53D6 ${authoringPromptPath}\uFF0C\u4E3A\u201C<\u4E1A\u52A1\u529F\u80FD\u540D\u79F0>\u201D\u8BBE\u8BA1\u573A\u666F\u6D4B\u8BD5\u3002\u5165\u53E3\uFF1A<\u9875\u9762\u3001Controller\u3001\u63A5\u53E3\u6216\u5DF2\u6709\u6D4B\u8BD5\u8DEF\u5F84>\u3002
\`\`\`

\u63A5\u4E0B\u6765\uFF1A

1. AI \u5148\u8F93\u51FA\u529F\u80FD\u5361\u7247\u548C\u573A\u666F\u77E9\u9635\uFF1B\u7528\u6237\u53EA\u9700\u786E\u8BA4\u4E1A\u52A1\u89C4\u5219\uFF0C\u5E76\u5728 AI \u8BE2\u95EE\u65F6\u63D0\u4F9B\u73AF\u5883\u5730\u5740\u3001\u5B89\u5168\u6D4B\u8BD5\u8D26\u53F7\u3001Token\u3001\u679A\u4E3E\u503C\u6216\u6D4B\u8BD5\u6570\u636E\u3002
2. AI \u8D1F\u8D23\u7EF4\u62A4 \`scenario.config.js\` \u548C \`scenarios/\`\u3002\u4E00\u6B21\u53EA\u5904\u7406\u4E00\u4E2A\u4E1A\u52A1\u529F\u80FD\uFF0C\u4E0D\u626B\u63CF\u6574\u4E2A\u9879\u76EE\u6279\u91CF\u751F\u6210\u3002
3. AI \u7ED9\u51FA\u547D\u4EE4\u540E\uFF0C\u518D\u9010\u4E2A\u8C03\u8BD5\u8BE5\u529F\u80FD\u4E0B\u7684\u573A\u666F\u3002\u521D\u59CB\u573A\u666F\u6E05\u5355\u4E3A\u7A7A\u65F6\u4E0D\u8981\u8FD0\u884C \`--all\`\u3002

## \u76EE\u5F55\u8BF4\u660E

| \u8DEF\u5F84 | \u4F5C\u7528 | \u662F\u5426\u5E94\u4FEE\u6539 |
| --- | --- | --- |
| \`index.html\` | \u6D4F\u89C8\u5668\u5DE5\u4F5C\u53F0\u5165\u53E3 | \u901A\u5E38\u4E0D\u9700\u8981 |
| \`start-scenario-test.cmd\` | Windows \u4EBA\u5DE5\u6D4B\u8BD5\u5165\u53E3\uFF1B\u53CC\u51FB\u540E\u542F\u52A8 HTTP Server \u5E76\u6253\u5F00\u5DE5\u4F5C\u53F0 | \u901A\u5E38\u4E0D\u9700\u8981 |
| \`scenario.config.js\` | \u73AF\u5883\u3001\u6D4B\u8BD5\u53D8\u91CF\u548C\u573A\u666F\u6E05\u5355\uFF1B\u901A\u5E38\u7531 AI \u6309\u7528\u6237\u63D0\u4F9B\u7684\u4FE1\u606F\u7EF4\u62A4 | \u6309\u9700 |
| \`scenarios/\` | \u6309\u4E1A\u52A1\u529F\u80FD\u5EFA\u5B50\u76EE\u5F55\uFF1B\u76EE\u5F55\u5185\u4E00\u4E2A\u6587\u4EF6\u5BF9\u5E94\u8BE5\u529F\u80FD\u7684\u4E00\u6761\u72EC\u7ACB\u9A8C\u8BC1\u8DEF\u5F84 | \u7531 AI \u7EF4\u62A4 |
| \`plugins/\` | \u4EC5\u5F53\u524D\u9879\u76EE\u9700\u8981\u7684\u6587\u4EF6\u3001Excel \u6216\u4E1A\u52A1\u6269\u5C55 | \u6309\u9700\u65B0\u5EFA |
| \`${frameworkDisplay}\` | AI \u89C4\u5219\u3001\u6A21\u5F0F\u5E93\u4E0E\u8FD0\u884C\u65F6\u526F\u672C\uFF08CLI/UMD/d.ts/\u80FD\u529B\u6E05\u5355\uFF09 | \u4E0D\u9700\u8981\u7528\u6237\u4FEE\u6539 |

## \u914D\u7F6E\u73AF\u5883\u548C\u53D8\u91CF

\`scenario.config.js\` \u53EA\u6709\u4E94\u4E2A\u6838\u5FC3\u6982\u5FF5\uFF1A

- \`envs\`\uFF1A\u73AF\u5883\u540D\u79F0\u548C\u63A5\u53E3\u57FA\u7840\u5730\u5740\u3002\u6BCF\u4E2A\u73AF\u5883\u5FC5\u987B\u6709\u552F\u4E00\u7684 \`key\`\u3002
- \`globals\`\uFF1A\u5168\u5C40\u53C2\u6570\uFF0C\u8FFD\u52A0\u5230\u6BCF\u4E2A\u8BF7\u6C42\u3002\u652F\u6301 ${GLOBALS_TYPES_BACKTICK} \u4E09\u79CD\u7C7B\u578B\uFF0C\u53EF\u914D\u7F6E\u5728\u9876\u5C42\uFF08\u6240\u6709\u73AF\u5883\u751F\u6548\uFF09\u6216\u5355\u4E2A\u73AF\u5883\u5185\u3002\u503C\u652F\u6301 \`{{vars.xxx}}\` \u6A21\u677F\uFF1B\u6B65\u9AA4\u663E\u5F0F\u58F0\u660E\u7684\u540C\u540D\u53C2\u6570\u4F18\u5148\u4E8E\u5168\u5C40\u53C2\u6570\u3002CLI \u53EF\u7528 \`SCENARIO_GLOBALS\` \u73AF\u5883\u53D8\u91CF\uFF08JSON \u6570\u7EC4\uFF09\u8986\u76D6\uFF0C\u5982 \`[{"type":"header","name":"Authorization","value":"Bearer x"}]\`\u3002
- \`vars\`\uFF1A\u672C\u9879\u76EE\u542F\u52A8\u65F6\u4F7F\u7528\u7684\u9ED8\u8BA4\u53D8\u91CF\u3002\u79C1\u6709\u9879\u76EE\u53EF\u5728\u8FD9\u91CC\u4FDD\u5B58\u56E2\u961F\u8054\u8C03 Key\u3001Secret\u3001Token\u3001\u6D4B\u8BD5\u8D26\u53F7\u7B49\u3002
- \`variables\`\uFF1A\u9875\u9762\u4E0A\u9700\u8981\u5C55\u793A\u6216\u5141\u8BB8\u8986\u76D6\u7684\u53D8\u91CF\u5143\u6570\u636E\uFF0C\u5305\u62EC\u6807\u7B7E\u3001\u662F\u5426\u5FC5\u586B\uFF0C\u4EE5\u53CA\u53EF\u9009\u7684 CLI \u73AF\u5883\u53D8\u91CF\u540D\u3002\u5B9E\u9645\u9ED8\u8BA4\u503C\u4F18\u5148\u5199\u5728 \`vars\`\uFF0C\u4E0D\u8981\u91CD\u590D\u7EF4\u62A4\u3002
- \`scenarios\`\uFF1A\u573A\u666F id\u3001\u540D\u79F0\u548C\u5BF9\u5E94 JS \u6587\u4EF6\u5730\u5740\u3002\u9700\u8981\u4EBA\u5DE5\u524D\u7F6E\u6761\u4EF6\u6216\u5199\u6570\u636E\u7684\u573A\u666F\u53EF\u52A0 \`manual: true\`\uFF1A\`--all\` \u9ED8\u8BA4\u6392\u9664\uFF0C\`--scenario <id>\` \u53EF\u663E\u5F0F\u6267\u884C\u3002

\u6700\u5C0F\u914D\u7F6E\u793A\u4F8B\uFF1A

\`\`\`js
ScenarioTest.registerConfig(ScenarioTest.defineConfig({
    globals: [
        { type: "header", name: "X-Project", value: "project-test" }
    ],
    envs: [
        { key: "local", name: "\u672C\u5730\u5F00\u53D1", baseUrl: "http://localhost:8080" },
        { key: "test", name: "\u6D4B\u8BD5\u73AF\u5883", baseUrl: "https://test.example.com" }
    ],
    defaultEnvKey: "local",
    requestTimeoutMs: 30000,
    vars: {
        clientId: "project-test-client",
        clientSecret: "replace-with-private-value"
    },
    variables: [
        { name: "clientId", label: "\u5BA2\u6237\u7AEF ID", required: true },
        { name: "clientSecret", label: "\u5BA2\u6237\u7AEF\u5BC6\u94A5", required: true, env: "SCENARIO_CLIENT_SECRET" }
    ],
    scenarios: [
        { id: "order-create-success", name: "\u8BA2\u5355\u521B\u5EFA / \u6210\u529F", url: "scenarios/order-create/success.js" },
        { id: "order-create-required-field", name: "\u8BA2\u5355\u521B\u5EFA / \u7F3A\u5C11\u5FC5\u586B\u5B57\u6BB5", url: "scenarios/order-create/required-field.js" }
    ]
}));
\`\`\`

\u53D8\u91CF\u4F18\u5148\u7EA7\u56FA\u5B9A\u5982\u4E0B\uFF1A

\`CLI \u73AF\u5883\u53D8\u91CF / \u6D4F\u89C8\u5668\u9875\u9762\u8986\u76D6 > scenario.config.js \u7684 vars > \u573A\u666F vars > variables[].defaultValue\`

\u6D4F\u89C8\u5668\u4E2D\u4FDD\u5B58\u7684\u53D8\u91CF\u4F1A\u6309\u9879\u76EE \`storagePrefix\` \u548C\u73AF\u5883\u4FDD\u5B58\u5230 LocalStorage\uFF1B\u70B9\u51FB\u6E05\u9664\u5F53\u524D\u73AF\u5883\u8986\u76D6\u540E\uFF0C\u7ACB\u5373\u56DE\u9000\u5230 \`vars\`\u3002CLI \u53EA\u8BFB\u53D6\u7CFB\u7EDF\u73AF\u5883\u53D8\u91CF\u548C\u914D\u7F6E\u6587\u4EF6\uFF0C\u4E0D\u8BFB\u53D6\u6D4F\u89C8\u5668 LocalStorage\u3002 \`init\` \u4F1A\u6839\u636E\u9879\u76EE\u76EE\u5F55\u540D\u751F\u6210\u9694\u79BB\u524D\u7F00\u3002

## \u7F16\u5199\u573A\u666F

\u5148\u786E\u5B9A\u4E00\u4E2A\u4E1A\u52A1\u529F\u80FD\uFF0C\u518D\u4E3A\u5B83\u8BBE\u8BA1\u573A\u666F\u77E9\u9635\u3002\u4E1A\u52A1\u529F\u80FD\u662F\u8BBE\u8BA1\u4E0E\u76EE\u5F55\u8FB9\u754C\uFF0C\u573A\u666F\u662F\u8BE5\u529F\u80FD\u4E0B\u7684\u4E00\u6761\u72EC\u7ACB\u9A8C\u8BC1\u8DEF\u5F84\uFF0C\u4F8B\u5982\u6210\u529F\u3001\u4E1A\u52A1\u89C4\u5219\u6821\u9A8C\u3001\u6743\u9650\u62D2\u7EDD\u3001\u8FB9\u754C\u503C\u3001\u91CD\u590D\u64CD\u4F5C\u6216\u72B6\u6001\u6D41\u8F6C\u3002\u53EA\u751F\u6210\u6709\u4EE3\u7801\u6216\u6587\u6863\u4F9D\u636E\u7684\u8DEF\u5F84\u3002

\u5EFA\u8BAE\u4F7F\u7528 \`scenarios/<\u529F\u80FD\u6807\u8BC6>/<\u9A8C\u8BC1\u8DEF\u5F84>.js\`\uFF0C\u573A\u666F id \u4F7F\u7528 \`<\u529F\u80FD\u6807\u8BC6>-<\u9A8C\u8BC1\u8DEF\u5F84>\`\uFF0C\u540D\u79F0\u4F7F\u7528 \`\u529F\u80FD\u540D / \u9A8C\u8BC1\u8DEF\u5F84\`\u3002\u8FD0\u884C\u65F6\u4ECD\u4F7F\u7528\u6241\u5E73\u7684 \`scenarios\` \u6E05\u5355\uFF0C\u4E0D\u9700\u8981\u65B0\u589E\u529F\u80FD\u5206\u7EC4\u5B57\u6BB5\u3002\u4E00\u4E2A\u573A\u666F\u53EF\u4EE5\u5305\u542B\u51C6\u5907\u6570\u636E\u3001\u6267\u884C\u76EE\u6807\u64CD\u4F5C\u3001\u67E5\u8BE2\u7ED3\u679C\u548C\u7CBE\u786E\u6E05\u7406\u7B49\u591A\u4E2A\u6B65\u9AA4\uFF0C\u4F46\u8FD9\u4E9B\u6B65\u9AA4\u5FC5\u987B\u53EA\u670D\u52A1\u4E8E\u76EE\u6807\u529F\u80FD\uFF0C\u4E0D\u80FD\u628A\u76F8\u90BB\u4E1A\u52A1\u529F\u80FD\u4E32\u6210\u4E00\u4E2A\u5927\u573A\u666F\u3002\u6BCF\u4E2A\u573A\u666F\u5FC5\u987B\u72EC\u7ACB\u8FD0\u884C\uFF0C\u6587\u4EF6\u6CE8\u518C id \u4E0E\u914D\u7F6E id \u4FDD\u6301\u4E00\u81F4\u3002

\u4E0B\u9762\u662F\u201C\u8BA2\u5355\u521B\u5EFA\u201D\u529F\u80FD\u7684\u6210\u529F\u573A\u666F\uFF1B\u201C\u7F3A\u5C11\u5FC5\u586B\u5B57\u6BB5\u201D\u201C\u672A\u8BA4\u8BC1\u62D2\u7EDD\u201D\u7B49\u5E94\u5206\u522B\u5EFA\u7ACB\u540C\u529F\u80FD\u4E0B\u7684\u5176\u4ED6\u573A\u666F\u6587\u4EF6\uFF1A

\`\`\`js
ScenarioTest.registerScenario("order-create-success", ScenarioTest.defineScenario({
    name: "\u8BA2\u5355\u521B\u5EFA / \u6210\u529F",
    vars: { orderName: "scenario-{{vars.runNo}}" },
    steps: [
        {
            name: "\u521B\u5EFA\u8BA2\u5355",
            method: "POST",
            path: "api/orders",
            request: {
                headers: { Authorization: "Bearer {{vars.token}}" },
                body: { name: "{{vars.orderName}}" }
            },
            status: 201,
            extract: [{ name: "orderId", path: "data.id" }]
        },
        {
            name: "\u67E5\u8BE2\u521A\u521B\u5EFA\u7684\u8BA2\u5355",
            method: "GET",
            path: "api/orders/{{vars.orderId}}",
            status: 200,
            assertions: [
                { path: "data.name", equals: "{{vars.orderName}}" }
            ]
        }
    ]
}));
\`\`\`

\u5199\u64CD\u4F5C\u4F7F\u7528\u53EF\u8BC6\u522B\u7684\u6D4B\u8BD5\u6807\u8BB0\uFF0C\u5E76\u53EA\u6309\u672C\u573A\u666F\u521A\u521B\u5EFA\u6216\u63D0\u53D6\u5230\u7684 ID \u7CBE\u786E\u6E05\u7406\u3002\u4E0D\u540C\u9A8C\u8BC1\u76EE\u6807\u5E94\u62C6\u6210\u540C\u4E00\u529F\u80FD\u4E0B\u7684\u72EC\u7ACB\u573A\u666F\uFF0C\u4E0D\u901A\u8FC7 \`failurePolicy: "continue"\` \u628A\u65E0\u5173\u5931\u8D25\u5206\u652F\u5408\u5E76\u8D77\u6765\u3002

\u5E38\u7528\u80FD\u529B\uFF1A

- \u7528 \`{{vars.name}}\` \u5728 path\u3001Query\u3001Header\u3001Body \u4E2D\u5F15\u7528\u53D8\u91CF\u3002
- \u7528 \`extract\` \u4ECE\u54CD\u5E94\u63D0\u53D6 ID\u3001Token \u6216\u72B6\u6001\uFF0C\u518D\u4F9B\u540E\u7EED\u6B65\u9AA4\u4F7F\u7528\uFF1B\u8DEF\u5F84\u5FC5\u586B\u65F6\u52A0 \`required: true\`\uFF0C\u7F3A\u5931\u4F1A\u5931\u8D25\uFF0C\u9ED8\u8BA4\u7F3A\u5931\u53EA\u4EA7\u751F warning\uFF1B\u53EF\u9009\u5B57\u6BB5\u53EF\u58F0\u660E \`default\` \u515C\u5E95\u503C\uFF08\u4E0E required \u4E92\u65A5\uFF09\u3002\u6570\u7EC4\u4E0B\u6807\u652F\u6301\u8D1F\u6570\u53D6\u5012\u6570\u9879\uFF08\`records[-1]\` \u4E3A\u672B\u9879\uFF09\u3002\`from: "headers"\` \u914D \`path\` \u65F6\u9996\u6BB5\u5934\u540D\u6309\u5927\u5C0F\u5199\u4E0D\u654F\u611F\u5339\u914D\uFF08\u4E0E\u65AD\u8A00 \`from: "headers"\`\u3001\`header\` \u7B80\u5199\u540C\u53E3\u5F84\uFF0C\u4EFB\u610F\u5927\u5C0F\u5199\u547D\u4E2D\u540C\u4E00\u54CD\u5E94\u5934\uFF09\uFF0C\u9996\u6BB5\u540E\u7684\u5B50\u8DEF\u5F84\u5728\u5934\u503C\u4E0A\u53D6\u3002
- \u65AD\u8A00\u64CD\u4F5C\u7B26\uFF1A${OPERATORS_BACKTICK}\uFF1B\u6570\u503C\u6BD4\u8F83\u7528 \`gte: 5\`\uFF0C\u5217\u8868\u6761\u6570/\u5B57\u7B26\u4E32\u957F\u5EA6/\u5BF9\u8C61\u952E\u6570\u7528 \`length: N\`\uFF0C\u975E\u8D1F\u6574\u6570\u7B49\u683C\u5F0F\u6821\u9A8C\u7528 \`matches: "^\\\\d+$"\`\uFF0C\u63A5\u53E3\u8017\u65F6\u4E0A\u9650\u7528 \`{ target: "duration", lte: 800 }\`\uFF08\u6BEB\u79D2\uFF09\u3002
- \u767B\u5F55\u3001\u6362 Token\u3001\u7B7E\u540D\u90FD\u6309\u666E\u901A\u6B65\u9AA4\u548C\u53D8\u91CF\u5B9E\u73B0\uFF1B\u6D4F\u89C8\u5668 Cookie \u4F1A\u8BDD\u663E\u5F0F\u4F7F\u7528 \`request.credentials: "include"\`\uFF0CNode CLI \u5F53\u524D\u4E0D\u63D0\u4F9B\u81EA\u52A8 Cookie Jar\u3002
- \u6BCF\u4E00\u6B65\u81F3\u5C11\u5199 \`name\`\u3001\`method\`\u3001\`path\`\u3001\`status\`\uFF1B\u5173\u952E\u7ED3\u679C\u8865\u5145 \`assertions\`\u3002
- \u672A\u5199 \`status\` \u548C \`assertions\` \u65F6\u8FD0\u884C\u65F6\u9ED8\u8BA4\u8981\u6C42 HTTP 2xx\uFF0C\u4E0D\u80FD\u628A\u5F02\u5E38\u54CD\u5E94\u5F53\u6210\u529F\u3002
- \u6700\u7EC8\u4E00\u81F4\u6027\u4F7F\u7528 \`retryUntil\`\uFF0C\u907F\u514D\u56FA\u5B9A\u7B49\u5F85\uFF1B\u524D\u7F6E\u53D8\u91CF\u53EF\u80FD\u4E3A\u7A7A\u7684\u5220\u9664\u64CD\u4F5C\u4F7F\u7528 \`when\` \u4FDD\u62A4\uFF08\`when\` \u5BF9\u8C61\u5F62\u5F0F\u652F\u6301 \`from: "vars"\` / \`from: "lastResponse"\` / \`from: "status"\`\uFF0C\u6216\u7528 \`target: "status"\` \u8BFB\u53D6\u4E0A\u4E00\u6B65\u72B6\u6001\u7801\uFF09\u3002
- \`runId\` / \`runNo\` \u662F\u8FD0\u884C\u65F6\u4FDD\u7559\u53D8\u91CF\uFF0C\u7981\u6B62\u5728\u914D\u7F6E\u6216\u573A\u666F\u4E2D\u58F0\u660E\u6216\u8986\u76D6\u3002
- \u9ED8\u8BA4\u5931\u8D25\u5373\u505C\u6B62\uFF1B\u53EA\u6709\u540C\u4E00\u9A8C\u8BC1\u8DEF\u5F84\u786E\u5B9E\u9700\u8981\u7EE7\u7EED\u6536\u96C6\u540E\u7EED\u6B65\u9AA4\u7ED3\u679C\u65F6\uFF0C\u624D\u5728\u573A\u666F\u4E0A\u8BBE \`failurePolicy: "continue"\`\u3002
- SKIP \u6B65\u9AA4\u4E0D\u8BA1\u5165\u901A\u8FC7/\u6267\u884C\u7EDF\u8BA1\uFF0C\u5168\u8DF3\u8FC7\u65F6\u573A\u666F\u72B6\u6001\u4E3A SKIPPED\uFF1B\u5199\u6570\u636E\u7C7B\u573A\u666F\u5728\u914D\u7F6E\u6E05\u5355\u4E2D\u52A0 \`manual: true\`\uFF0C\`--all\` \u4F1A\u9ED8\u8BA4\u6392\u9664\uFF0C\u9700\u7528 \`--scenario <id>\` \u663E\u5F0F\u6267\u884C\u3002

\u5B8C\u6574 DSL \u4E0E\u793A\u4F8B\u89C1\u516C\u5171\u5E93 README\uFF1B\u9879\u76EE\u5185\u65B0\u589E\u7528\u4F8B\u7531 AI \u8BFB\u53D6 \`${frameworkDisplay}AI_SCENARIO_PROMPT.md\` \u548C\u540C\u76EE\u5F55\u7684\u6A21\u5F0F\u5E93\u540E\u751F\u6210\u3002

## \u6D4F\u89C8\u5668\u5DE5\u4F5C\u53F0

\u53CC\u51FB\u672C\u76EE\u5F55\u4E2D\u7684 \`start-scenario-test.cmd\` \u542F\u52A8\u5DE5\u4F5C\u53F0\uFF1A\u811A\u672C\u4F7F\u7528\u9879\u76EE\u5185\u8FD0\u884C\u65F6\u526F\u672C\u542F\u52A8\u672C\u5730 HTTP Server\uFF0C\u81EA\u52A8\u6253\u5F00 \`index.html\`\u3002\`serve\` \u4F1A\u5728\u9875\u9762\u4E2D\u542F\u7528\u540C\u6E90\u4EE3\u7406\u6A21\u5F0F\uFF0C\u6D4F\u89C8\u5668\u8BF7\u6C42\u5148\u53D1\u9001\u5230\u5F53\u524D\u5DE5\u4F5C\u53F0\u5730\u5740\uFF0C\u518D\u8F6C\u53D1\u5230\u6240\u9009\u73AF\u5883\u7684 \`baseUrl\`\uFF0C\u65E0\u9700\u540E\u7AEF\u653E\u884C CORS\uFF0C\u4E5F\u65E0\u9700\u624B\u5DE5\u6E05\u7A7A\u6216\u8986\u76D6\u9875\u9762\u5730\u5740\u3002\u4EBA\u5DE5\u6D4B\u8BD5\u7ED3\u675F\u540E\u6309 \`Ctrl+C\` \u505C\u6B62\u670D\u52A1\u3002

\u4E5F\u53EF\u4EE5\u5728\u9879\u76EE\u6839\u76EE\u5F55\u6267\u884C\uFF1A

\`\`\`powershell
.\\scenario-test\\start-scenario-test.cmd
\`\`\`

\u4E0D\u8981\u76F4\u63A5\u53CC\u51FB \`index.html\`\uFF1A\u9875\u9762\u867D\u53EF\u52A0\u8F7D\uFF0C\u4F46\u63A5\u53E3\u8BF7\u6C42\u4F1A\u88AB\u6D4F\u89C8\u5668 CORS \u62E6\u622A\uFF0C\u5FC5\u987B\u901A\u8FC7 \`serve\` \u7684\u540C\u6E90\u4EE3\u7406\u6267\u884C\u3002

## CLI \u6267\u884C

\u9ED8\u8BA4\u4F7F\u7528\u9879\u76EE\u5185\u8FD0\u884C\u65F6\u526F\u672C\uFF08\u514D npm \u6A21\u5F0F\uFF09\uFF0C\u65E0\u9700\u5B89\u88C5 npm \u5305\u3002\u504F\u597D npm \u7684\u56E2\u961F\u53EF\u5148 \`npm install -D @yc_yzkj/scenario-test\`\uFF0C\u628A \`node ${frameworkDisplay}scenario-test-cli.cjs\` \u6362\u6210 \`npx @yc_yzkj/scenario-test\` \u5373 npm \u6A21\u5F0F\uFF0C\u5176\u4F59\u53C2\u6570\u4E00\u81F4\u3002\u6267\u884C\u914D\u7F6E\u4E2D\u5168\u90E8\u573A\u666F\uFF1A

\`\`\`powershell
node ${frameworkDisplay}scenario-test-cli.cjs run --config ${directory}/scenario.config.js --env local --all
\`\`\`

\u6267\u884C\u5355\u4E2A\u573A\u666F\u65F6\uFF0C\u4F7F\u7528\u914D\u7F6E\u4E2D\u7684\u573A\u666F id\uFF08\u547D\u4EE4 \`run\` \u7D27\u8DDF\u811A\u672C\u540D\uFF09\uFF1A

\`\`\`powershell
node ${frameworkDisplay}scenario-test-cli.cjs run --config ${directory}/scenario.config.js --env local --scenario order-create-success
\`\`\`

\u5728 PowerShell \u4E2D\u4E3A\u4E00\u6B21\u6267\u884C\u4E34\u65F6\u8986\u76D6\u51ED\u636E\uFF1A

\`\`\`powershell
$env:SCENARIO_CLIENT_SECRET = "temporary-value"
node ${frameworkDisplay}scenario-test-cli.cjs run --config ${directory}/scenario.config.js --env local --all
Remove-Item Env:SCENARIO_CLIENT_SECRET
\`\`\`

\u524D\u63D0\u662F\u53D8\u91CF\u5B9A\u4E49\u4E2D\u58F0\u660E\u4E86 \`env: "SCENARIO_CLIENT_SECRET"\`\u3002CLI \u53C2\u6570\u4EE5\u5F53\u524D\u7248\u672C\u7684 \`--help\` \u8F93\u51FA\u4E3A\u51C6\u3002

## \u5E38\u89C1\u95EE\u9898

### \u9875\u9762\u63D0\u793A ScenarioTest \u672A\u5B9A\u4E49\u6216\u811A\u672C\u52A0\u8F7D\u5931\u8D25

\u786E\u8BA4\u9879\u76EE \`${frameworkDisplay}\` \u4E2D\u5B58\u5728 \`scenario-test.umd.js\`\uFF08\u8FD0\u884C\u65F6\u526F\u672C\uFF0C\u7531 init/\u5B89\u88C5\u811A\u672C\u843D\u76D8\uFF09\uFF1B\`index.html\` \u52A0\u8F7D\u7684\u662F \`./.scenario-test/scenario-test.umd.js\`\u3002\u6587\u4EF6\u7F3A\u5931\u65F6\u91CD\u8DD1\u5B89\u88C5\u811A\u672C\uFF08\u6216\u5E26 \`--library-url\` \u7684 init\uFF09\u8865\u9F50\uFF0C\u518D\u901A\u8FC7 \`start-scenario-test.cmd\` \u542F\u52A8\u5DE5\u4F5C\u53F0\u3002

### \u9875\u9762\u80FD\u6253\u5F00\u4F46\u573A\u666F\u6CA1\u6709\u52A0\u8F7D

\u901A\u8FC7 \`start-scenario-test.cmd\` \u542F\u52A8\u5DE5\u4F5C\u53F0\uFF0C\u4E0D\u8981\u4ECE \`file:///\` \u76F4\u63A5\u6253\u5F00\u9875\u9762\uFF1B\u518D\u68C0\u67E5 \`scenario.config.js\` \u7684\u573A\u666F \`id\`\u3001\`url\` \u4E0E\u573A\u666F\u6587\u4EF6\u91CC\u7684 \`registerScenario(id, ...)\` \u662F\u5426\u4E00\u81F4\u3002

### CLI \u7684\u53D8\u91CF\u548C\u9875\u9762\u4E0D\u4E00\u81F4

\u8FD9\u662F\u9884\u671F\u884C\u4E3A\uFF1A\u9875\u9762\u8BFB\u53D6\u6D4F\u89C8\u5668\u5F53\u524D\u73AF\u5883\u7684 LocalStorage \u8986\u76D6\uFF1BCLI \u4E0D\u8BFB\u53D6\u5B83\u3002\u9700\u8981\u5728 CLI \u4E34\u65F6\u66FF\u6362\u503C\u65F6\uFF0C\u4E3A \`variables\` \u914D\u7F6E \`env\` \u5E76\u8BBE\u7F6E\u5BF9\u5E94\u7CFB\u7EDF\u73AF\u5883\u53D8\u91CF\u3002

### \u65B0\u4E1A\u52A1\u529F\u80FD\u4E0D\u77E5\u9053\u5982\u4F55\u8BBE\u8BA1\u573A\u666F

\u4E0D\u8981\u5148\u626B\u63CF\u6574\u4E2A\u9879\u76EE\u6216\u6309\u63A5\u53E3\u6279\u91CF\u5EFA\u6587\u4EF6\u3002\u5148\u9009\u5B9A\u4E00\u4E2A\u4E1A\u52A1\u529F\u80FD\uFF0C\u5E76\u628A\u529F\u80FD\u540D\u79F0\u53CA\u53EF\u5B9A\u4F4D\u7684\u9875\u9762\u3001Controller\u3001OpenAPI \u8282\u70B9\u3001\u524D\u7AEF API \u6A21\u5757\u6216\u5DF2\u6709\u6D4B\u8BD5\u5165\u53E3\u4EA4\u7ED9 AI\uFF1BAI \u4F1A\u8BFB\u53D6 \`${frameworkDisplay}\` \u4E2D\u7684\u9879\u76EE\u89C4\u5219\uFF0C\u5148\u8F93\u51FA\u529F\u80FD\u5361\u7247\u548C\u573A\u666F\u77E9\u9635\u3002\u6CA1\u6709\u4F9D\u636E\u7684\u4E1A\u52A1\u89C4\u5219\u3001\u63A5\u53E3\u548C\u5B57\u6BB5\u5217\u4E3A\u5F85\u786E\u8BA4\u9879\u3002

## \u5347\u7EA7\u8FD0\u884C\u65F6

\u573A\u666F\u3001\u914D\u7F6E\u548C\u9879\u76EE\u63D2\u4EF6\u5C5E\u4E8E\u672C\u9879\u76EE\uFF0C\u5347\u7EA7\u65F6\u4E0D\u8981\u8986\u76D6\u5B83\u4EEC\u3002\u4F7F\u7528\u65B0\u7248 CLI \u5BF9\u5F53\u524D\u76EE\u5F55\u6267\u884C \`init\`\uFF08npm \u6A21\u5F0F\u5148\u5347\u7EA7\u5305\uFF1B\u514D npm \u6A21\u5F0F\u628A\u4E0B\u8F7D\u6E90\u5207\u6362\u5230\u65B0\u7684\u56FA\u5B9A\u7248\u672C\u540E\u91CD\u8DD1\u5B89\u88C5\u811A\u672C\uFF09\uFF1BCLI \u4F1A\u5237\u65B0 \`${frameworkDisplay}\` \u4E2D\u7684 AI \u89C4\u5219\u4E0E\u8FD0\u884C\u65F6\u526F\u672C\uFF0C\u4E0D\u8986\u76D6\u9879\u76EE\u914D\u7F6E\u4E0E\u573A\u666F\u3002\u5347\u7EA7\u540E\u5148\u8FD0\u884C doctor \u548C\u4E00\u4E2A\u4EE3\u8868\u6027\u4E1A\u52A1\u573A\u666F\uFF0C\u518D\u63D0\u4EA4\u672C\u9879\u76EE\u6539\u52A8\u3002

\u516C\u5171\u8FD0\u884C\u65F6\u4E0D\u4FDD\u5B58\u4E1A\u52A1\u5730\u5740\u3001\u8D26\u53F7\u3001Token\u3001Secret \u6216\u6D4B\u8BD5\u6570\u636E\uFF1B\u8FD9\u4E9B\u4EC5\u80FD\u653E\u5728\u5F53\u524D\u79C1\u6709\u9879\u76EE\u7684\u914D\u7F6E\u548C\u53D7\u63A7\u73AF\u5883\u53D8\u91CF\u4E2D\u3002
`
  };
}

// src/doctor.js
var import_node_fs5 = __toESM(require("node:fs"), 1);
var import_node_path5 = __toESM(require("node:path"), 1);
var import_node_crypto = __toESM(require("node:crypto"), 1);

// src/project-layout.js
var import_node_fs4 = __toESM(require("node:fs"), 1);
var import_node_path4 = __toESM(require("node:path"), 1);
var INTERNAL_DIRECTORY = ".scenario-test";
var FRAMEWORK_FILES = Object.freeze({
  authoringPrompt: "AI_SCENARIO_PROMPT.md",
  patterns: "SCENARIO_PATTERNS.md",
  cli: "scenario-test-cli.cjs",
  umd: "scenario-test.umd.js",
  dts: "scenario-test.d.ts",
  capabilities: "scenario-test-capabilities.json",
  versionLock: ".scenario-test-version.json"
});
function toRelativePath(...segments) {
  return import_node_path4.default.join(...segments).replace(/\\/g, "/");
}
function createProjectLayout(projectRoot, directory) {
  const publicDir = import_node_path4.default.resolve(projectRoot, directory);
  const frameworkDir = import_node_path4.default.join(publicDir, INTERNAL_DIRECTORY);
  const frameworkRelativeDir = toRelativePath(directory, INTERNAL_DIRECTORY);
  return Object.freeze({
    publicDir,
    frameworkDir,
    frameworkRelativeDir,
    publicRelativePath: (fileName) => toRelativePath(directory, fileName),
    frameworkRelativePath: (fileName) => toRelativePath(frameworkRelativeDir, fileName),
    frameworkPath: (fileName) => import_node_path4.default.join(frameworkDir, fileName)
  });
}
function isDirectory(target) {
  return import_node_fs4.default.existsSync(target) && import_node_fs4.default.statSync(target).isDirectory();
}
function resolveProjectLayout(projectRoot, directory) {
  const layout = createProjectLayout(projectRoot, directory);
  if (import_node_fs4.default.existsSync(layout.frameworkDir) && !isDirectory(layout.frameworkDir)) {
    throw new Error(`${layout.frameworkDir} \u5FC5\u987B\u662F\u76EE\u5F55\uFF1B\u8BF7\u79FB\u8D70\u540C\u540D\u6587\u4EF6\u540E\u91CD\u8BD5`);
  }
  return layout;
}
function resolveLayoutFromConfigDir(configDir) {
  return resolveProjectLayout(import_node_path4.default.dirname(configDir), import_node_path4.default.basename(configDir));
}

// src/doctor.js
var UMD_VERSION_PATTERN = /\/\*! scenario-test v(\d+\.\d+\.\d+) \*\//;
var DTS_VERSION_PATTERN = /scenario-test v(\d+\.\d+\.\d+)/;
function extractArtifactVersion(filePath, pattern) {
  const head = import_node_fs5.default.readFileSync(filePath, "utf8").slice(0, 4096);
  const match = pattern.exec(head);
  return match ? match[1] : null;
}
function sha256Of(filePath) {
  return import_node_crypto.default.createHash("sha256").update(import_node_fs5.default.readFileSync(filePath)).digest("hex");
}
function checkRuntimeArtifact(filePath, fileName, key, pattern) {
  if (!import_node_fs5.default.existsSync(filePath)) {
    return {
      name: key,
      status: "WARN",
      message: `\u7F3A\u5C11\u8FD0\u884C\u65F6\u526F\u672C ${fileName}\uFF08${filePath}\uFF09`,
      fix: "\u8FD0\u884C init \u8865\u9F50\uFF08\u4E0D\u4F20 --force \u4E0D\u4F1A\u8986\u76D6\u9879\u76EE\u6587\u4EF6\uFF09"
    };
  }
  try {
    const stat = import_node_fs5.default.statSync(filePath);
    if (!stat.isFile()) throw new Error("\u8DEF\u5F84\u4E0D\u662F\u666E\u901A\u6587\u4EF6");
    const version = pattern ? extractArtifactVersion(filePath, pattern) : null;
    if (pattern === null) import_node_fs5.default.accessSync(filePath, import_node_fs5.default.constants.R_OK);
    if (version !== null && version !== VERSION) {
      return {
        name: key,
        status: "FAIL",
        message: `\u7248\u672C\u4E0D\u4E00\u81F4\uFF1A${fileName} \u662F v${version}\uFF0C\u5F53\u524D CLI \u662F v${VERSION}`,
        fix: `\u7528 v${VERSION} \u7684 CLI \u91CD\u65B0 init \u5237\u65B0\u8FD0\u884C\u65F6\u526F\u672C`
      };
    }
    return {
      name: key,
      status: "PASS",
      message: `\u8FD0\u884C\u65F6\u526F\u672C\u5C31\u7EEA: ${fileName}${version ? `\uFF08v${version}\uFF09` : ""}`,
      fix: ""
    };
  } catch (error) {
    return {
      name: key,
      status: "FAIL",
      message: `\u8FD0\u884C\u65F6\u526F\u672C\u4E0D\u53EF\u8BFB\u53D6: ${fileName}\uFF08${filePath}\uFF0C\u539F\u56E0: ${error.message}\uFF09`,
      fix: "\u79FB\u8D70\u65E0\u6548\u8DEF\u5F84\u6216\u4FEE\u590D\u6587\u4EF6\u8BFB\u53D6\u6743\u9650\u540E\uFF0C\u7528\u5F53\u524D\u7248\u672C CLI \u91CD\u65B0 init"
    };
  }
}
function checkCapabilitiesFile(filePath) {
  if (!import_node_fs5.default.existsSync(filePath)) {
    return {
      name: "capabilities",
      status: "WARN",
      message: "\u7F3A\u5C11\u8FD0\u884C\u65F6\u526F\u672C scenario-test-capabilities.json",
      fix: "\u8FD0\u884C init \u8865\u9F50\uFF08\u4E0D\u4F20 --force \u4E0D\u4F1A\u8986\u76D6\u9879\u76EE\u6587\u4EF6\uFF09"
    };
  }
  try {
    const parsed = JSON.parse(import_node_fs5.default.readFileSync(filePath, "utf8"));
    if (parsed.schema !== "scenario-test-capabilities") {
      return {
        name: "capabilities",
        status: "FAIL",
        message: "scenario-test-capabilities.json \u4E0D\u662F\u5408\u6CD5\u7684\u80FD\u529B\u6E05\u5355\uFF08schema \u4E0D\u5339\u914D\uFF09",
        fix: "\u7528\u5F53\u524D\u7248\u672C CLI \u91CD\u65B0 init \u751F\u6210"
      };
    }
    if (parsed.version !== VERSION || parsed.contractVersion !== CONTRACT_VERSION) {
      return {
        name: "capabilities",
        status: "FAIL",
        message: `\u7248\u672C\u4E0D\u4E00\u81F4\uFF1Acapabilities.json \u662F v${parsed.version}\uFF08contract v${parsed.contractVersion}\uFF09\uFF0C\u5F53\u524D CLI \u662F v${VERSION}\uFF08contract v${CONTRACT_VERSION}\uFF09`,
        fix: `\u7528 v${VERSION} \u7684 CLI \u91CD\u65B0 init \u751F\u6210 scenario-test-capabilities.json`
      };
    }
    return { name: "capabilities", status: "PASS", message: `\u7248\u672C\u4E00\u81F4\uFF08v${parsed.version}\uFF0Ccontract v${parsed.contractVersion}\uFF09`, fix: "" };
  } catch (error) {
    return {
      name: "capabilities",
      status: "FAIL",
      message: `scenario-test-capabilities.json \u89E3\u6790\u5931\u8D25: ${error.message}`,
      fix: "\u7528\u5F53\u524D\u7248\u672C CLI \u91CD\u65B0 init \u751F\u6210"
    };
  }
}
function checkVersionLock(filePath) {
  if (!import_node_fs5.default.existsSync(filePath)) {
    return {
      name: "version-lock",
      status: "WARN",
      message: "\u7F3A\u5C11\u9879\u76EE\u7248\u672C\u9501 .scenario-test-version.json",
      fix: "\u8FD0\u884C init \u5199\u5165\u7248\u672C\u9501\uFF08\u4E0D\u4F20 --force \u4E0D\u4F1A\u8986\u76D6\u9879\u76EE\u6587\u4EF6\uFF09"
    };
  }
  let lock;
  try {
    lock = JSON.parse(import_node_fs5.default.readFileSync(filePath, "utf8"));
  } catch (error) {
    return {
      name: "version-lock",
      status: "FAIL",
      message: `.scenario-test-version.json \u89E3\u6790\u5931\u8D25: ${error.message}`,
      fix: "\u4FEE\u590D\u6216\u5220\u9664\u7248\u672C\u9501\u540E\u7528\u5F53\u524D\u7248\u672C CLI \u91CD\u65B0 init \u751F\u6210"
    };
  }
  if (!lock || typeof lock !== "object" || Array.isArray(lock)) {
    return {
      name: "version-lock",
      status: "FAIL",
      message: "\u7248\u672C\u9501\u5FC5\u987B\u662F JSON \u5BF9\u8C61",
      fix: "\u4FEE\u590D\u7248\u672C\u9501\u540E\u7528\u5F53\u524D\u7248\u672C CLI \u91CD\u65B0 init \u751F\u6210"
    };
  }
  if (lock.runtimeVersion !== VERSION || lock.contractVersion !== CONTRACT_VERSION) {
    return {
      name: "version-lock",
      status: "FAIL",
      message: `\u7248\u672C\u4E0D\u4E00\u81F4\uFF1A\u7248\u672C\u9501\u8BB0\u5F55 v${lock.runtimeVersion}\uFF08contract v${lock.contractVersion}\uFF09\uFF0C\u5F53\u524D CLI \u662F v${VERSION}\uFF08contract v${CONTRACT_VERSION}\uFF09`,
      fix: `\u4F7F\u7528 v${VERSION} \u7684 CLI \u91CD\u65B0 init\uFF08\u81EA\u52A8\u5237\u65B0\u8FD0\u884C\u65F6\u526F\u672C\u4E0E\u7248\u672C\u9501\uFF0C\u4E0D\u8986\u76D6\u9879\u76EE\u914D\u7F6E/\u573A\u666F\uFF09`
    };
  }
  const extras = [];
  const files = lock.files && typeof lock.files === "object" ? lock.files : null;
  if (!files) {
    extras.push({
      name: "version-lock",
      status: "WARN",
      message: "\u7248\u672C\u9501\u7F3A\u5C11 files \u5B57\u6BB5\uFF08\u9884\u671F\u6587\u4EF6\u540D\u6E05\u5355\uFF09",
      fix: "\u7528\u5F53\u524D\u7248\u672C CLI \u91CD\u65B0 init \u5237\u65B0\u7248\u672C\u9501"
    });
  } else {
    for (const [kind, fileName] of Object.entries(files)) {
      const target = import_node_path5.default.join(import_node_path5.default.dirname(filePath), String(fileName));
      if (!import_node_fs5.default.existsSync(target)) {
        extras.push({
          name: "version-lock",
          status: "WARN",
          message: `\u7248\u672C\u9501\u58F0\u660E ${kind} \u6587\u4EF6 ${fileName} \u4E0D\u5B58\u5728`,
          fix: `\u8FD0\u884C init \u8865\u9F50 ${fileName}\uFF08\u4E0D\u4F20 --force \u4E0D\u4F1A\u8986\u76D6\u9879\u76EE\u6587\u4EF6\uFF09`
        });
      }
    }
  }
  const sha256 = lock.sha256 && typeof lock.sha256 === "object" ? lock.sha256 : null;
  if (!sha256) {
    extras.push({
      name: "version-lock",
      status: "WARN",
      message: "\u7248\u672C\u9501\u7F3A\u5C11 sha256 \u6307\u7EB9\u8BB0\u5F55\uFF0C\u65E0\u6CD5\u6821\u9A8C\u8FD0\u884C\u65F6\u6587\u4EF6\u5B8C\u6574\u6027",
      fix: "\u7528\u5F53\u524D\u7248\u672C CLI \u91CD\u65B0 init \u5237\u65B0\u7248\u672C\u9501"
    });
  } else {
    const declaredFiles = files ? new Set(Object.values(files)) : null;
    for (const [fileName, expected] of Object.entries(sha256)) {
      if (declaredFiles && !declaredFiles.has(fileName)) continue;
      const target = import_node_path5.default.join(import_node_path5.default.dirname(filePath), fileName);
      if (!import_node_fs5.default.existsSync(target)) continue;
      let actual;
      try {
        if (!import_node_fs5.default.statSync(target).isFile()) throw new Error("\u8DEF\u5F84\u4E0D\u662F\u666E\u901A\u6587\u4EF6");
        actual = sha256Of(target);
      } catch (error) {
        extras.push({
          name: "version-lock",
          status: "FAIL",
          message: `${fileName} \u65E0\u6CD5\u6821\u9A8C SHA256\uFF08\u539F\u56E0: ${error.message}\uFF09`,
          fix: "\u79FB\u8D70\u65E0\u6548\u8DEF\u5F84\u6216\u4FEE\u590D\u6587\u4EF6\u8BFB\u53D6\u6743\u9650\u540E\uFF0C\u7528\u5F53\u524D\u7248\u672C CLI \u91CD\u65B0 init"
        });
        continue;
      }
      if (actual !== expected) {
        extras.push({
          name: "version-lock",
          status: "FAIL",
          message: `${fileName} \u7684 SHA256 \u4E0E\u7248\u672C\u9501\u8BB0\u5F55\u4E0D\u4E00\u81F4\uFF08\u6587\u4EF6\u53EF\u80FD\u88AB\u66FF\u6362\uFF09`,
          fix: "\u82E5\u662F\u6709\u610F\u66FF\u6362\u8FD0\u884C\u65F6\u6587\u4EF6\uFF0C\u7528\u5F53\u524D\u7248\u672C CLI \u91CD\u65B0 init \u5237\u65B0\u7248\u672C\u9501\uFF1B\u5426\u5219\u68C0\u67E5\u6587\u4EF6\u6765\u6E90"
        });
      }
    }
    if (files) {
      const uncovered = [...new Set(Object.values(files))].filter((fileName) => !(fileName in sha256));
      if (uncovered.length) {
        extras.push({
          name: "version-lock",
          status: "WARN",
          message: `\u7248\u672C\u9501 sha256 \u672A\u8986\u76D6\u6587\u4EF6: ${uncovered.join(", ")}`,
          fix: "\u7528\u5F53\u524D\u7248\u672C CLI \u91CD\u65B0 init \u5237\u65B0\u7248\u672C\u9501"
        });
      }
    }
  }
  return {
    name: "version-lock",
    status: "PASS",
    message: `\u7248\u672C\u4E00\u81F4\uFF08v${lock.runtimeVersion}\uFF0Ccontract v${lock.contractVersion}\uFF09`,
    fix: "",
    extra: extras
  };
}
function satisfiesNodeEngine(version, range) {
  const match = /^>=\s*(\d+)(?:\.(\d+)(?:\.(\d+))?)?/.exec(String(range || "").trim());
  if (!match) return false;
  const [major, minor, patch] = match.slice(1).map((segment) => Number(segment ?? 0));
  const current = /^v?(\d+)(?:\.(\d+)(?:\.(\d+))?)?/.exec(String(version).trim());
  if (!current) return false;
  const [curMajor, curMinor, curPatch] = current.slice(1).map((segment) => Number(segment ?? 0));
  if (curMajor !== major) return curMajor > major;
  if (curMinor !== minor) return curMinor > minor;
  return curPatch >= patch;
}
function checkReadableFile(filePath, key, fileName) {
  if (!import_node_fs5.default.existsSync(filePath)) {
    return {
      name: key,
      status: "FAIL",
      message: `\u7F3A\u5C11 AI \u89C4\u5219\u6587\u4EF6 ${fileName}\uFF08${filePath}\uFF09`,
      fix: "\u8FD0\u884C init \u8865\u9F50\uFF08\u4E0D\u4F1A\u8986\u76D6\u9879\u76EE\u914D\u7F6E/\u573A\u666F\uFF09"
    };
  }
  try {
    const stat = import_node_fs5.default.statSync(filePath);
    if (!stat.isFile()) throw new Error("\u8DEF\u5F84\u4E0D\u662F\u666E\u901A\u6587\u4EF6");
    import_node_fs5.default.readFileSync(filePath, "utf8");
    return { name: key, status: "PASS", message: `AI \u89C4\u5219\u5C31\u7EEA: ${fileName}`, fix: "" };
  } catch (error) {
    return {
      name: key,
      status: "FAIL",
      message: `AI \u89C4\u5219\u6587\u4EF6\u4E0D\u53EF\u8BFB\u53D6: ${fileName}\uFF08\u539F\u56E0: ${error.message}\uFF09`,
      fix: "\u79FB\u8D70\u65E0\u6548\u8DEF\u5F84\u540E\u91CD\u65B0\u8FD0\u884C init"
    };
  }
}
function buildDoctorReport(options) {
  const { configPath, api, configDir } = options;
  const checks = [];
  const info = [];
  const engineRange = contract.engines?.node || ">=18";
  checks.push(satisfiesNodeEngine(process.version, engineRange) ? { name: "node-version", status: "PASS", message: `Node ${process.version} \u6EE1\u8DB3 engines.node ${engineRange}`, fix: "" } : {
    name: "node-version",
    status: "FAIL",
    message: `Node ${process.version} \u4E0D\u6EE1\u8DB3 engines.node ${engineRange}`,
    fix: "\u5347\u7EA7 Node.js \u5230\u6EE1\u8DB3 engines \u7684\u7248\u672C\u540E\u91CD\u8BD5"
  });
  let config = null;
  if (!import_node_fs5.default.existsSync(configPath)) {
    checks.push({
      name: "config",
      status: "FAIL",
      message: `\u914D\u7F6E\u6587\u4EF6\u4E0D\u5B58\u5728: ${configPath}`,
      fix: "\u521B\u5EFA scenario.config.js\uFF08\u53EF\u7528 init \u751F\u6210\u6A21\u677F\uFF09\uFF0C\u6216\u901A\u8FC7 --config \u6307\u5B9A\u6B63\u786E\u7684\u914D\u7F6E\u6587\u4EF6"
    });
  } else {
    try {
      config = loadConfigFile(configPath, api);
      checks.push({ name: "config-load", status: "PASS", message: `\u914D\u7F6E\u53EF\u52A0\u8F7D: ${configPath}`, fix: "" });
    } catch (error) {
      checks.push({
        name: "config-load",
        status: "FAIL",
        message: `\u914D\u7F6E\u6587\u4EF6\u52A0\u8F7D\u5931\u8D25: ${configPath}\uFF08\u539F\u56E0: ${error.message}\uFF09`,
        fix: "\u68C0\u67E5\u914D\u7F6E\u8BED\u6CD5\u4E0E defineConfig \u8C03\u7528\uFF1B\u4FEE\u590D\u540E\u91CD\u65B0\u8FD0\u884C doctor"
      });
    }
  }
  if (config) {
    const entries = config.scenarios || [];
    if (entries.length === 0) {
      checks.push({ name: "scenario-list", status: "PASS", message: "\u914D\u7F6E\u4E2D\u6682\u65E0\u53EF\u68C0\u67E5\u7684\u573A\u666F\uFF08scenarios \u4E3A\u7A7A\uFF09", fix: "" });
    } else {
      let listOk = true;
      for (const entry of entries) {
        if (!entry.id || !entry.url) {
          listOk = false;
          checks.push({
            name: "scenario-list",
            status: "FAIL",
            message: `\u573A\u666F\u6E05\u5355\u9879\u7F3A\u5C11 id \u6216 url\uFF08${JSON.stringify(entry)}\uFF09`,
            fix: "\u5728 scenario.config.js \u4E2D\u4E3A\u6BCF\u4E2A\u573A\u666F\u9879\u63D0\u4F9B id\u3001name\u3001url"
          });
          continue;
        }
        if (entry.manual === true) {
          info.push({
            name: "manual-scenario",
            scenarioId: entry.id,
            message: `\u573A\u666F ${entry.id} \u6807\u8BB0\u4E3A manual:true\uFF08\u9700\u8981\u4EBA\u5DE5\u51C6\u5907\u6570\u636E\u6216\u5199\u6570\u636E\uFF09\uFF0C--all \u9ED8\u8BA4\u6392\u9664\uFF0C\u8BF7\u7528 --scenario ${entry.id} \u663E\u5F0F\u6267\u884C`
          });
        }
        let scenarioPath;
        try {
          scenarioPath = import_node_path5.default.isAbsolute(entry.url) ? entry.url : validatePath(configDir, entry.url);
        } catch (error) {
          listOk = false;
          checks.push({
            name: "scenario-list",
            status: "FAIL",
            message: `\u573A\u666F ${entry.id} \u7684 url \u4E0D\u5B89\u5168: ${entry.url}\uFF08\u539F\u56E0: ${error.message}\uFF09`,
            fix: "url \u5FC5\u987B\u662F\u914D\u7F6E\u76EE\u5F55\u5185\u7684\u76F8\u5BF9\u8DEF\u5F84"
          });
          continue;
        }
        if (import_node_path5.default.isAbsolute(entry.url)) {
          checks.push({
            name: "absolute-scenario-path",
            status: "WARN",
            message: `\u573A\u666F ${entry.id} \u4F7F\u7528\u7EDD\u5BF9\u8DEF\u5F84: ${entry.url}\uFF08run \u53EF\u6B63\u5E38\u6267\u884C\uFF0C\u4F46\u5EFA\u8BAE\u4F7F\u7528\u914D\u7F6E\u76EE\u5F55\u5185\u76F8\u5BF9\u8DEF\u5F84\uFF0C\u4FBF\u4E8E\u9879\u76EE\u8FC1\u79FB\uFF09`,
            fix: "\u5C06 scenario.config.js \u4E2D\u8BE5\u573A\u666F\u7684 url \u6539\u4E3A\u76F8\u5BF9\u8DEF\u5F84"
          });
        }
        if (!import_node_fs5.default.existsSync(scenarioPath)) {
          listOk = false;
          checks.push({
            name: "scenario-list",
            status: "FAIL",
            message: `\u573A\u666F\u6587\u4EF6\u4E0D\u5B58\u5728: ${scenarioPath}\uFF08\u573A\u666F ${entry.id}\uFF09`,
            fix: `\u521B\u5EFA\u8BE5\u6587\u4EF6\uFF0C\u6216\u5728 scenario.config.js \u4E2D\u4FEE\u6B63 url`
          });
          continue;
        }
        try {
          const scenario = loadScenarioFile(scenarioPath, entry.id, api);
          if (scenario.name) {
            checks.push({
              name: "scenario-register",
              status: "PASS",
              message: `\u573A\u666F ${entry.id} \u52A0\u8F7D\u5E76\u6CE8\u518C\u6210\u529F\uFF08${scenarioPath}\uFF09`,
              fix: ""
            });
          }
        } catch (error) {
          listOk = false;
          checks.push({
            name: "scenario-register",
            status: "FAIL",
            message: `\u573A\u666F ${entry.id} \u52A0\u8F7D/\u6CE8\u518C\u5931\u8D25: ${scenarioPath}\uFF08\u539F\u56E0: ${error.message}\uFF09`,
            fix: "\u68C0\u67E5\u573A\u666F\u6587\u4EF6\uFF1AregisterScenario(id, ...) \u7684 id \u5FC5\u987B\u4E0E scenario.config.js \u6E05\u5355 id \u4E00\u81F4\uFF1B\u65AD\u8A00/when/\u4FDD\u7559\u53D8\u91CF\u987B\u901A\u8FC7 defineScenario \u6821\u9A8C"
          });
        }
      }
      if (listOk) {
        checks.push({ name: "scenario-list", status: "PASS", message: `\u573A\u666F\u6E05\u5355\u5408\u6CD5\uFF08${entries.length} \u9879\uFF0C\u6587\u4EF6\u5747\u5B58\u5728\uFF09`, fix: "" });
      }
    }
  }
  let layout;
  try {
    layout = resolveLayoutFromConfigDir(configDir);
  } catch (error) {
    layout = createProjectLayout(import_node_path5.default.dirname(configDir), import_node_path5.default.basename(configDir));
    checks.push({
      name: "framework-directory",
      status: "FAIL",
      message: error.message,
      fix: "\u79FB\u8D70\u65E0\u6548\u8DEF\u5F84\u6216\u4FEE\u590D\u8BFB\u53D6\u6743\u9650\u540E\u91CD\u65B0\u8FD0\u884C init"
    });
  }
  checks.push({
    name: "cli",
    status: "PASS",
    message: `CLI \u7248\u672C v${VERSION}\uFF08contract v${CONTRACT_VERSION}\uFF09`,
    fix: ""
  });
  for (const [key, fileName] of Object.entries({ authoringPrompt: FRAMEWORK_FILES.authoringPrompt, patterns: FRAMEWORK_FILES.patterns })) {
    checks.push(checkReadableFile(layout.frameworkPath(fileName), key, fileName));
  }
  checks.push(checkRuntimeArtifact(layout.frameworkPath(FRAMEWORK_FILES.cli), FRAMEWORK_FILES.cli, "runtime-cli", null));
  checks.push(checkRuntimeArtifact(layout.frameworkPath(FRAMEWORK_FILES.umd), FRAMEWORK_FILES.umd, "umd", UMD_VERSION_PATTERN));
  checks.push(checkRuntimeArtifact(layout.frameworkPath(FRAMEWORK_FILES.dts), FRAMEWORK_FILES.dts, "dts", DTS_VERSION_PATTERN));
  checks.push(checkCapabilitiesFile(layout.frameworkPath(FRAMEWORK_FILES.capabilities)));
  const lockResult = checkVersionLock(layout.frameworkPath(FRAMEWORK_FILES.versionLock));
  checks.push({ name: lockResult.name, status: lockResult.status, message: lockResult.message, fix: lockResult.fix });
  if (lockResult.extra) checks.push(...lockResult.extra);
  const summary = { passed: 0, warned: 0, failed: 0, info: info.length };
  for (const check of checks) {
    if (check.status === "PASS") summary.passed += 1;
    else if (check.status === "WARN") summary.warned += 1;
    else summary.failed += 1;
  }
  const exitCode = summary.failed > 0 ? 1 : 0;
  return {
    tool: "scenario-test doctor",
    runtimeVersion: VERSION,
    contractVersion: CONTRACT_VERSION,
    status: exitCode === 0 ? "OK" : "FAILED",
    checks,
    info,
    summary,
    exitCode
  };
}
var STATUS_MARK = { PASS: "[PASS]", WARN: "[WARN]", FAIL: "[FAIL]", INFO: "[INFO]" };
function renderDoctorText(report) {
  const lines = [];
  lines.push(`\u573A\u666F\u6D4B\u8BD5 Doctor`);
  lines.push(`\u7248\u672C: v${report.runtimeVersion}\uFF08contract v${report.contractVersion}\uFF09`);
  lines.push("");
  for (const check of report.checks) {
    lines.push(`${STATUS_MARK[check.status] || check.status} ${check.name}: ${check.message}`);
    if (check.fix) lines.push(`       \u5982\u4F55\u4FEE: ${check.fix}`);
  }
  for (const item of report.info) {
    lines.push(`[INFO] ${item.name}: ${item.message}`);
  }
  lines.push("");
  lines.push(`\u6458\u8981: ${report.summary.passed} PASS, ${report.summary.warned} WARN, ${report.summary.failed} FAIL, ${report.summary.info} INFO`);
  lines.push(report.exitCode === 0 ? "\u7ED3\u679C: OK\uFF08\u9000\u51FA\u7801 0\uFF09" : "\u7ED3\u679C: FAILED\uFF08\u9000\u51FA\u7801 1\uFF09");
  return lines.join("\n");
}

// src/cli.js
var CliUsageError = class extends Error {
  constructor(message, hint) {
    super(message);
    this.name = "CliUsageError";
    this.hint = hint || "\u8FD0\u884C node scenario-test-cli.cjs --help \u67E5\u770B\u7528\u6CD5\u3002";
  }
};
function argumentValue(argv, index, option) {
  const value = argv[index + 1];
  if (!value || value === "-h" || value.startsWith("--")) {
    throw new CliUsageError(`${option} \u7F3A\u5C11\u53C2\u6570\u503C`, `\u8BF7\u4E3A ${option} \u63D0\u4F9B\u4E00\u4E2A\u503C\uFF0C\u518D\u91CD\u65B0\u8FD0\u884C\u3002`);
  }
  return value;
}
var FLAG_OPTIONS = /* @__PURE__ */ new Map();
var VALUE_OPTIONS = /* @__PURE__ */ new Map();
for (const [name, spec] of Object.entries(contract.cli.options)) {
  const target = `--${name}`;
  if (spec.kind === "flag") {
    FLAG_OPTIONS.set(target, spec.prop);
  } else {
    VALUE_OPTIONS.set(target, { prop: spec.prop, spec });
    for (const alias of spec.aliases || []) VALUE_OPTIONS.set(`--${alias}`, { prop: spec.prop, spec });
  }
}
function optionEditDistance(left, right) {
  const rows = Array.from({ length: left.length + 1 }, () => []);
  for (let row = 0; row <= left.length; row += 1) rows[row][0] = row;
  for (let column = 0; column <= right.length; column += 1) rows[0][column] = column;
  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const replacement = left[row - 1] === right[column - 1] ? 0 : 1;
      rows[row][column] = Math.min(
        rows[row - 1][column] + 1,
        rows[row][column - 1] + 1,
        rows[row - 1][column - 1] + replacement
      );
    }
  }
  return rows[left.length][right.length];
}
function suggestOption(input) {
  const knownOptions = /* @__PURE__ */ new Set([...FLAG_OPTIONS.keys(), ...VALUE_OPTIONS.keys(), "--help"]);
  const ranked = Array.from(knownOptions).map((option) => ({
    option,
    distance: optionEditDistance(input, option)
  })).sort((left, right) => left.distance - right.distance || left.option.localeCompare(right.option));
  if (!ranked.length) return null;
  const best = ranked[0];
  const threshold = Math.max(1, Math.floor(Math.max(input.length, best.option.length) * 0.18));
  if (best.distance > threshold || ranked[1] && ranked[1].distance === best.distance) return null;
  return best.option;
}
function parseArgs(argv) {
  const args = { command: "run", all: false, config: "", scenario: "", env: "", baseUrl: "", authorization: "", port: 4300, project: "", dir: "", force: false, noInput: false, allowExternalPlugins: false, failOnSkip: false, json: false, help: false };
  let start = 0;
  if (contract.cli.commands.includes(argv[0])) {
    args.command = argv[0];
    start = 1;
  }
  let deprecatedAuthUsed = false;
  for (let index = start; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === "--help" || item === "-h") {
      args.help = true;
      continue;
    }
    const valueOption = VALUE_OPTIONS.get(item);
    if (valueOption) {
      const raw = argumentValue(argv, index++, item);
      args[valueOption.prop] = valueOption.spec.parse === "number" ? Number(raw) : raw;
      if (item === "--token" || item === "--authorization") deprecatedAuthUsed = true;
      continue;
    }
    const flagProp = FLAG_OPTIONS.get(item);
    if (flagProp) {
      args[flagProp] = true;
      continue;
    }
    if (item.startsWith("-")) {
      const suggestion = suggestOption(item);
      throw new CliUsageError(
        `\u672A\u77E5\u53C2\u6570: ${item}`,
        suggestion ? `\u662F\u5426\u60F3\u4F7F\u7528 ${suggestion}\uFF1F\u8FD0\u884C node scenario-test-cli.cjs --help \u67E5\u770B\u5168\u90E8\u9009\u9879\u3002` : "\u8FD0\u884C node scenario-test-cli.cjs --help \u67E5\u770B\u652F\u6301\u7684\u53C2\u6570\u3002"
      );
    } else if (start === 0 && contract.cli.commands.includes(item)) {
      throw new CliUsageError(
        `\u547D\u4EE4 ${item} \u5FC5\u987B\u653E\u5728\u7B2C\u4E00\u4E2A\u53C2\u6570\u4F4D\u7F6E`,
        `\u6B63\u786E\u793A\u4F8B\uFF1Anode scenario-test-cli.cjs ${item} --config scenario.config.js\uFF1B\u82E5\u786E\u9700\u6267\u884C\u540C\u540D\u573A\u666F\uFF0C\u8BF7\u4F7F\u7528 --scenario "${item}"\u3002`
      );
    } else if (!args.scenario && args.command === "run") args.scenario = item;
    else throw new CliUsageError(`\u65E0\u6CD5\u8BC6\u522B\u7684\u53C2\u6570: ${item}`, "\u8BF7\u8FD0\u884C node scenario-test-cli.cjs --help \u67E5\u770B\u547D\u4EE4\u4E0E\u53C2\u6570\u7528\u6CD5\u3002");
  }
  if (args.all && args.scenario) throw new CliUsageError("--all \u4E0E --scenario \u4E0D\u80FD\u540C\u65F6\u4F7F\u7528", "\u8BF7\u79FB\u9664\u5176\u4E2D\u4E00\u4E2A\u9009\u9879\u540E\u91CD\u8BD5\u3002");
  if (!Number.isInteger(args.port) || args.port < 1 || args.port > 65535) {
    throw new CliUsageError("--port \u5FC5\u987B\u662F 1-65535 \u7684\u6574\u6570", "\u8BF7\u4E3A --port \u9009\u62E9 1 \u5230 65535 \u4E4B\u95F4\u7684\u6574\u6570\u3002");
  }
  if (process.env.SCENARIO_AUTH) {
    args.authorization = process.env.SCENARIO_AUTH;
    if (deprecatedAuthUsed) {
      console.warn(
        "\n\u26A0\uFE0F  \u8B66\u544A: \u540C\u65F6\u68C0\u6D4B\u5230 SCENARIO_AUTH \u73AF\u5883\u53D8\u91CF\u548C --authorization \u53C2\u6570\n   \u73AF\u5883\u53D8\u91CF\u4F18\u5148\u7EA7\u66F4\u9AD8\uFF0C--authorization \u53C2\u6570\u5C06\u88AB\u5FFD\u7565\n"
      );
    }
  } else if (deprecatedAuthUsed) {
    console.warn(
      '\n\u26A0\uFE0F  \u5F03\u7528\u8B66\u544A: --authorization \u53C2\u6570\u5C06\u5728\u672A\u6765\u7248\u672C\u4E2D\u79FB\u9664\n   \u63A8\u8350\u4F7F\u7528\u73AF\u5883\u53D8\u91CF: export SCENARIO_AUTH="Bearer your-token"\n   \u539F\u56E0: \u547D\u4EE4\u884C\u53C2\u6570\u5728\u8FDB\u7A0B\u5217\u8868\u4E2D\u53EF\u89C1\uFF0C\u5B58\u5728\u5B89\u5168\u98CE\u9669\n'
    );
  }
  return args;
}
function parseGlobalsEnv() {
  const raw = process.env.SCENARIO_GLOBALS;
  if (!raw) return [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CliUsageError("SCENARIO_GLOBALS \u5FC5\u987B\u662F\u5408\u6CD5\u7684 JSON \u6570\u7EC4", '\u8BF7\u68C0\u67E5\u53D8\u91CF\u503C\u683C\u5F0F\uFF0C\u4F8B\u5982 [{"type":"header","name":"X-Token","value":"abc"}]\u3002');
  }
  if (!Array.isArray(parsed)) throw new CliUsageError("SCENARIO_GLOBALS \u5FC5\u987B\u662F JSON \u6570\u7EC4");
  const types = contract.globals.types;
  return parsed.map((item, index) => {
    if (!item || typeof item !== "object" || !types.includes(item.type) || typeof item.name !== "string" || !item.name.trim()) {
      throw new CliUsageError(`SCENARIO_GLOBALS \u7B2C ${index + 1} \u9879\u65E0\u6548\uFF0C\u683C\u5F0F\u5E94\u4E3A { type: "${types.join("|")}", name, value }`);
    }
    return normalizeGlobalParam(item);
  });
}
function printHelp() {
  const optionEntries = Object.entries(contract.cli.options).map(([name, spec]) => {
    const optionNames = [`--${name}`, ...(spec.aliases || []).map((alias) => `--${alias}`)].join(", ");
    const valueName = spec.kind === "value" ? ` <${spec.parse === "number" ? "number" : "value"}>` : "";
    return { label: `${optionNames}${valueName}`, description: spec.description };
  });
  const labelWidth = Math.max(...optionEntries.map((item) => item.label.length));
  const optionHelp = optionEntries.map((item) => `  ${item.label.padEnd(labelWidth)}  ${item.description}`).join("\n");
  const commandList = contract.cli.commands.map((command) => `  ${command}`).join("\n");
  console.log(`scenario-test ${VERSION}

Usage:
  node scenario-test-cli.cjs [run] [options]
  node scenario-test-cli.cjs <command> [options]

Commands:
${commandList}

\u5E2E\u52A9:
  \u5728\u4EFB\u4E00\u547D\u4EE4\u540E\u8FFD\u52A0 --help \u6216 -h \u67E5\u770B\u7528\u6CD5\uFF0C\u4F8B\u5982 node scenario-test-cli.cjs run --help\u3002

Options:
${optionHelp}

\u8FD0\u884C\u8BF4\u660E:
  \u9ED8\u8BA4 run \u672A\u6307\u5B9A --all/--scenario \u65F6\u4EC5\u6267\u884C\u6E05\u5355\u7B2C\u4E00\u4E2A\u573A\u666F\u3002
  --all \u6267\u884C\u914D\u7F6E\u4E2D\u7684\u5168\u90E8\u81EA\u52A8\u573A\u666F\uFF1Bmanual:true \u573A\u666F\u987B\u901A\u8FC7 --scenario \u663E\u5F0F\u9009\u62E9\u3002
  --scenario \u652F\u6301\u9017\u53F7\u5206\u9694\u591A\u9009\uFF08\u5982 --scenario login,order\uFF09\uFF0C\u6309 id/name/url \u5339\u914D\u3002
  --json \u65F6 stdout \u53EA\u8F93\u51FA\u7ED3\u6784\u5316\u7ED3\u679C\uFF1A\u5355\u573A\u666F\u8F93\u51FA\u8BE5\u573A\u666F report\uFF0C\u591A\u573A\u666F\u8F93\u51FA
  {"scenarios":[...]}\uFF1B\u8FDB\u5EA6\u884C\u4E0E\u7ED3\u8BBA\u6539\u8D70 stderr\uFF0C\u5931\u8D25\u573A\u666F\u4ECD\u8F93\u51FA\u5B8C\u6574 JSON \u4E14\u9000\u51FA\u7801\u975E\u96F6\u3002

\u80FD\u529B\u53D1\u73B0\u547D\u4EE4:
  capabilities          \u8F93\u51FA DSL \u80FD\u529B\u6E05\u5355\uFF08\u4EBA\u7C7B\u6587\u672C\uFF1B--json \u8F93\u51FA\u673A\u5668\u53EF\u8BFB JSON\uFF0C
                        \u5185\u5BB9\u4E0E dist/scenario-test-capabilities.json \u4E00\u81F4\uFF09
  doctor                \u9879\u76EE\u9759\u6001\u4F53\u68C0\uFF1ANode \u7248\u672C\u3001\u914D\u7F6E/\u573A\u666F\u52A0\u8F7D\u3001DSL \u6821\u9A8C
                        \u4E0E AI \u89C4\u5219\u5C31\u7EEA\u68C0\u67E5\uFF1B\u6709 FAIL \u65F6\u9000\u51FA\u7801 1

\u8BA4\u8BC1\u9009\u9879:
  \u73AF\u5883\u53D8\u91CF SCENARIO_AUTH       \u63A8\u8350\u65B9\u5F0F\uFF0C\u8BBE\u7F6E\u6388\u6743\u4EE4\u724C\uFF1B\u907F\u514D\u4EE4\u724C\u8FDB\u5165\u8FDB\u7A0B\u53C2\u6570\u3002

\u5168\u5C40\u53C2\u6570\u9009\u9879\uFF08\u8FFD\u52A0\u5230\u6BCF\u4E2A\u8BF7\u6C42\uFF09:
  \u73AF\u5883\u53D8\u91CF SCENARIO_GLOBALS    JSON \u6570\u7EC4\uFF0C\u5982 [{"type":"header","name":"X-Token","value":"abc"}]
                               \u652F\u6301 header / cookie / query \u4E09\u79CD\u7C7B\u578B\uFF0C\u8986\u76D6\u914D\u7F6E\u4E2D\u7684\u540C\u540D\u53C2\u6570

\u521D\u59CB\u5316\u8BF4\u660E:
  \u76EE\u6807\u76EE\u5F55\u5DF2\u5B58\u5728\u65F6\uFF0C\u4EA4\u4E92\u6A21\u5F0F\u53EF\u9009\u62E9\u8986\u76D6\u3001\u4FDD\u7559\u6216\u53D6\u6D88\uFF1B\u975E\u4EA4\u4E92\u6A21\u5F0F\u9ED8\u8BA4\u4FDD\u7559\u73B0\u6709\u914D\u7F6E\u4E0E\u573A\u666F\u3002

\u793A\u4F8B:
  # Bash
  export SCENARIO_AUTH="Bearer your-token"
  node scenario-test-cli.cjs --config scenario.config.js --all

  # PowerShell
  $env:SCENARIO_AUTH = "Bearer your-token"
  node scenario-test-cli.cjs --config "./scenario.config.js" --all`);
}
function writeProjectFile(projectRoot, relativePath, content, force) {
  const target = import_node_path6.default.resolve(projectRoot, relativePath);
  if (import_node_fs6.default.existsSync(target) && !force) return false;
  import_node_fs6.default.mkdirSync(import_node_path6.default.dirname(target), { recursive: true });
  import_node_fs6.default.writeFileSync(target, content, "utf8");
  return true;
}
function resolveInitDirectory(projectRoot, value) {
  const directory = String(value || "scenario-test").trim().replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/\/+$/, "");
  const target = import_node_path6.default.resolve(projectRoot, directory);
  const relative = import_node_path6.default.relative(projectRoot, target);
  if (!directory || import_node_path6.default.isAbsolute(directory) || relative.startsWith("..") || import_node_path6.default.isAbsolute(relative)) {
    throw new Error("--dir \u5FC5\u987B\u662F\u9879\u76EE\u5185\u7684\u76F8\u5BF9\u76EE\u5F55");
  }
  return directory;
}
async function askInitMode(directory) {
  if (!process.stdin.isTTY) return "keep";
  const rl = (0, import_promises.createInterface)({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(
      `\u76EE\u6807\u76EE\u5F55 ${directory} \u5DF2\u5B58\u5728\u3002
  [o] \u8986\u76D6\u5DF2\u6709\u6587\u4EF6\uFF08\u7B49\u4EF7 --force\uFF09
  [k] \u4FDD\u7559\u73B0\u6709\u6587\u4EF6\uFF0C\u4EC5\u5237\u65B0 AI \u89C4\u5219\uFF08\u9ED8\u8BA4\uFF09
  [c] \u53D6\u6D88
\u8BF7\u9009\u62E9 (k): `
    );
    const choice = answer.trim().toLowerCase();
    if (choice === "o") return "overwrite";
    if (choice === "c") return "cancel";
    return "keep";
  } finally {
    rl.close();
  }
}
function sha256File(filePath) {
  return import_node_crypto2.default.createHash("sha256").update(import_node_fs6.default.readFileSync(filePath)).digest("hex");
}
function runtimeSourceCandidates(fileName) {
  return [
    import_node_path6.default.resolve(import_node_path6.default.dirname(process.argv[1]), fileName),
    import_node_path6.default.resolve(import_node_path6.default.dirname(process.argv[1]), "../dist", fileName)
  ];
}
function copyRuntimeCli(layout, force) {
  const target = layout.frameworkPath(FRAMEWORK_FILES.cli);
  if (import_node_fs6.default.existsSync(target) && !force) return false;
  const source = import_node_path6.default.resolve(process.argv[1]);
  if (!source.endsWith(".cjs")) return null;
  import_node_fs6.default.mkdirSync(import_node_path6.default.dirname(target), { recursive: true });
  import_node_fs6.default.copyFileSync(source, target);
  return true;
}
async function ensureRuntimeFile(layout, fileName, libraryUrl, force) {
  const target = layout.frameworkPath(fileName);
  if (import_node_fs6.default.existsSync(target) && !force) return false;
  const source = runtimeSourceCandidates(fileName).find((candidate) => import_node_fs6.default.existsSync(candidate));
  import_node_fs6.default.mkdirSync(import_node_path6.default.dirname(target), { recursive: true });
  if (source) {
    import_node_fs6.default.copyFileSync(source, target);
    return true;
  }
  if (!libraryUrl) return null;
  const base = libraryUrl.replace(/\/+$/, "") + "/";
  const downloadSignal = AbortSignal.timeout(3e4);
  try {
    const response = await fetch(`${base}${fileName}`, { signal: downloadSignal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    import_node_fs6.default.writeFileSync(target, Buffer.from(await response.arrayBuffer()));
    return true;
  } catch (error) {
    console.warn(`\u8B66\u544A: ${fileName} \u4E0B\u8F7D\u5931\u8D25\uFF08${downloadSignal.aborted ? "\u4E0B\u8F7D\u8D85\u65F6\uFF0830 \u79D2\uFF09" : escapeInlineText(error.message)}\uFF09`);
    return null;
  }
}
function writeVersionLock(layout) {
  const target = layout.frameworkPath(FRAMEWORK_FILES.versionLock);
  const fileNames = [FRAMEWORK_FILES.cli, FRAMEWORK_FILES.umd, FRAMEWORK_FILES.dts, FRAMEWORK_FILES.capabilities];
  const sha256 = {};
  for (const fileName of fileNames) {
    const filePath = layout.frameworkPath(fileName);
    if (import_node_fs6.default.existsSync(filePath)) sha256[fileName] = sha256File(filePath);
  }
  const lock = {
    runtimeVersion: VERSION,
    contractVersion: CONTRACT_VERSION,
    files: {
      cli: FRAMEWORK_FILES.cli,
      umd: FRAMEWORK_FILES.umd,
      dts: FRAMEWORK_FILES.dts,
      capabilities: FRAMEWORK_FILES.capabilities
    },
    sha256
  };
  import_node_fs6.default.mkdirSync(import_node_path6.default.dirname(target), { recursive: true });
  import_node_fs6.default.writeFileSync(target, `${JSON.stringify(lock, null, 2)}
`, "utf8");
  return true;
}
function shouldRefreshFramework(layout, force) {
  if (force) return true;
  const runtimeFileNames = [FRAMEWORK_FILES.cli, FRAMEWORK_FILES.umd, FRAMEWORK_FILES.dts, FRAMEWORK_FILES.capabilities];
  if (runtimeFileNames.some((fileName) => !import_node_fs6.default.existsSync(layout.frameworkPath(fileName)))) return true;
  const lockPath = layout.frameworkPath(FRAMEWORK_FILES.versionLock);
  if (!import_node_fs6.default.existsSync(lockPath)) return true;
  let lock;
  try {
    lock = JSON.parse(import_node_fs6.default.readFileSync(lockPath, "utf8"));
  } catch {
    return true;
  }
  if (lock.runtimeVersion !== VERSION || lock.contractVersion !== CONTRACT_VERSION) return true;
  return runtimeFileNames.some((fileName) => {
    const expected = lock.sha256?.[fileName];
    return !!expected && sha256File(layout.frameworkPath(fileName)) !== expected;
  });
}
function recordRuntimeResult(created, skipped, relativePath, status, failed) {
  if (status === true) created.push(relativePath);
  else if (status === false) skipped.push(relativePath);
  else if (failed) failed.push(relativePath);
}
async function initCommand(args) {
  const projectRoot = import_node_path6.default.resolve(args.project || process.cwd());
  const directory = resolveInitDirectory(projectRoot, args.dir);
  const projectName = import_node_path6.default.basename(projectRoot).trim() || "project";
  const storagePrefix = `scenario-test.${projectName.replace(/[^\p{L}\p{N}._-]+/gu, "-")}`;
  const layout = resolveProjectLayout(projectRoot, directory);
  const frameworkDirectory = ".scenario-test";
  let force = args.force;
  if (!force && import_node_fs6.default.existsSync(import_node_path6.default.join(projectRoot, directory)) && !args.noInput) {
    const mode = await askInitMode(directory);
    if (mode === "cancel") {
      console.log("\u5DF2\u53D6\u6D88\u521D\u59CB\u5316\u3002");
      return;
    }
    force = mode === "overwrite";
  }
  const refreshFramework = shouldRefreshFramework(layout, force);
  const frameworkTemplatePaths = /* @__PURE__ */ new Set([
    layout.frameworkRelativePath(FRAMEWORK_FILES.authoringPrompt),
    layout.frameworkRelativePath(FRAMEWORK_FILES.patterns)
  ]);
  const created = [];
  const skipped = [];
  const failedRuntimeFiles = [];
  for (const [relativePath, content] of Object.entries(createProjectFiles(directory, { storagePrefix, frameworkDirectory }))) {
    const overwrite = force || frameworkTemplatePaths.has(relativePath);
    (writeProjectFile(projectRoot, relativePath, content, overwrite) ? created : skipped).push(relativePath);
  }
  const libraryUrl = args.libraryUrl || DEFAULT_LIBRARY_URL;
  recordRuntimeResult(created, skipped, layout.frameworkRelativePath(FRAMEWORK_FILES.cli), copyRuntimeCli(layout, refreshFramework) ?? await ensureRuntimeFile(layout, FRAMEWORK_FILES.cli, libraryUrl, refreshFramework), failedRuntimeFiles);
  recordRuntimeResult(created, skipped, layout.frameworkRelativePath(FRAMEWORK_FILES.umd), await ensureRuntimeFile(layout, FRAMEWORK_FILES.umd, libraryUrl, refreshFramework), failedRuntimeFiles);
  recordRuntimeResult(created, skipped, layout.frameworkRelativePath(FRAMEWORK_FILES.dts), await ensureRuntimeFile(layout, FRAMEWORK_FILES.dts, libraryUrl, refreshFramework), failedRuntimeFiles);
  recordRuntimeResult(created, skipped, layout.frameworkRelativePath(FRAMEWORK_FILES.capabilities), await ensureRuntimeFile(layout, FRAMEWORK_FILES.capabilities, libraryUrl, refreshFramework), failedRuntimeFiles);
  if (failedRuntimeFiles.length) {
    throw new Error(
      `\u8FD0\u884C\u65F6\u526F\u672C\u66F4\u65B0\u5931\u8D25: ${failedRuntimeFiles.join(", ")}
\u8BF7\u68C0\u67E5\u4E0B\u8F7D\u6E90\u6216\u7F51\u7EDC\u540E\u91CD\u8DD1 init\uFF1B\u73B0\u6709\u7248\u672C\u9501\u672A\u66F4\u65B0\u3002`
    );
  }
  const runtimeFileNames = [FRAMEWORK_FILES.cli, FRAMEWORK_FILES.umd, FRAMEWORK_FILES.dts, FRAMEWORK_FILES.capabilities];
  const missingRuntimeFiles = runtimeFileNames.filter((fileName) => !import_node_fs6.default.existsSync(layout.frameworkPath(fileName)));
  if (missingRuntimeFiles.length) {
    throw new Error(
      `\u8FD0\u884C\u65F6\u526F\u672C\u4E0D\u5B8C\u6574\uFF0C\u7F3A\u5C11: ${missingRuntimeFiles.join(", ")}
\u8BF7\u68C0\u67E5 --library-url\uFF08${libraryUrl}\uFF09\u6307\u5411\u7684\u76EE\u5F55\u662F\u5426\u5305\u542B\u5168\u90E8 4 \u4E2A\u6587\u4EF6\uFF0C\u6216\u786E\u8BA4\u672C\u673A dist \u53EF\u7528\u540E\u91CD\u8DD1 init`
    );
  }
  recordRuntimeResult(created, skipped, layout.frameworkRelativePath(FRAMEWORK_FILES.versionLock), writeVersionLock(layout));
  console.log(`\u5DF2\u521D\u59CB\u5316\u9879\u76EE: ${projectRoot}`);
  console.log(`\u9879\u76EE\u5E03\u5C40: \u5185\u90E8\u6587\u4EF6\u4F4D\u4E8E ${layout.frameworkRelativeDir}`);
  if (created.length) console.log(`\u5DF2\u521B\u5EFA: ${created.join(", ")}`);
  if (skipped.length) console.log(`\u5DF2\u4FDD\u7559\u73B0\u6709\u6587\u4EF6: ${skipped.join(", ")}`);
  console.log(`\u6D4F\u89C8\u5668\u5DE5\u4F5C\u53F0: ${import_node_path6.default.join(projectRoot, directory, "index.html")}`);
  console.log("\u63D0\u793A: \u53CC\u51FB start-scenario-test.cmd \u542F\u52A8\u5DE5\u4F5C\u53F0\uFF1Bserve \u4F1A\u81EA\u52A8\u542F\u7528\u540C\u6E90\u63A5\u53E3\u4EE3\u7406\uFF0C\u7ED5\u5F00\u6D4F\u89C8\u5668 CORS\u3002");
}
function resolveConfigPath(value) {
  const candidate = import_node_path6.default.resolve(value || "scenario.config.js");
  if (!import_node_fs6.default.existsSync(candidate)) {
    throw new CliUsageError(
      `${value ? "\u914D\u7F6E\u6587\u4EF6\u4E0D\u5B58\u5728" : "\u672A\u627E\u5230\u9ED8\u8BA4\u914D\u7F6E\u6587\u4EF6"}\uFF1A${candidate}`,
      [
        `\u4F7F\u7528 --config "<\u5B9E\u9645\u914D\u7F6E\u6587\u4EF6\u8DEF\u5F84>" \u6307\u5411\u5DF2\u6709\u914D\u7F6E\uFF0C\u4F8B\u5982\uFF1Anode scenario-test-cli.cjs run --config "<\u5B9E\u9645\u914D\u7F6E\u6587\u4EF6\u8DEF\u5F84>"`,
        `\u521D\u59CB\u5316\u9879\u76EE\u6A21\u677F\uFF1Anode scenario-test-cli.cjs init --project "."`
      ].join("\n  ")
    );
  }
  return candidate;
}
async function loadPlugins(config, configDir, options = {}) {
  const plugins = [];
  for (const pluginPath of config.nodePlugins || []) {
    let absolutePath;
    try {
      absolutePath = validatePath(configDir, pluginPath);
    } catch (error) {
      if (options.allowExternalPlugins) {
        console.warn(`\u26A0\uFE0F  \u52A0\u8F7D\u5916\u90E8\u63D2\u4EF6: ${escapeInlineText(pluginPath)}`);
        absolutePath = import_node_path6.default.isAbsolute(pluginPath) ? pluginPath : import_node_path6.default.resolve(configDir, pluginPath);
      } else {
        throw new Error(
          `\u63D2\u4EF6\u8DEF\u5F84\u4E0D\u5B89\u5168: ${pluginPath}
\u539F\u56E0: ${error.message}
\u63D0\u793A: \u63D2\u4EF6\u5FC5\u987B\u5728\u914D\u7F6E\u76EE\u5F55\u5185 (${configDir})\uFF0C\u6216\u4F7F\u7528 --allow-external-plugins \u6807\u5FD7`
        );
      }
    }
    const imported = await import((0, import_node_url.pathToFileURL)(absolutePath).href);
    const factory = imported.default || imported;
    const pluginApi = { ...node_exports };
    const plugin = typeof factory === "function" ? await factory(pluginApi) : factory;
    plugins.push(plugin);
  }
  return plugins;
}
async function transformScenario(scenario, context, plugins) {
  let transformed = scenario;
  for (const plugin of plugins) {
    if (typeof plugin?.transformScenario === "function") transformed = await plugin.transformScenario(transformed, context);
  }
  return transformed;
}
function selectEnvironment(config, key) {
  if (!config.envs.length) return { key: "default", name: "\u9ED8\u8BA4", baseUrl: config.baseUrl || "" };
  const selectedKey = key || config.defaultEnvKey;
  const environment = config.envs.find((item) => item.key === selectedKey);
  if (!environment) {
    const keys = config.envs.map((item) => item.key);
    throw new CliUsageError(
      `\u672A\u627E\u5230\u73AF\u5883 ${selectedKey}\uFF0C\u53EF\u7528\u503C: ${keys.join(", ")}`,
      "\u8BF7\u5C06 --env \u8BBE\u7F6E\u4E3A\u4E0A\u9762\u5217\u51FA\u7684\u73AF\u5883 key \u540E\u91CD\u8BD5\u3002"
    );
  }
  return environment;
}
function configVariables(config) {
  const values = { ...config.vars || {} };
  for (const definition of config.variables || []) {
    const environmentName = definition.env;
    const value = environmentName ? process.env[environmentName] : void 0;
    if (value !== void 0) values[definition.name] = value;
    else if (values[definition.name] === void 0 && definition.defaultValue !== void 0) values[definition.name] = definition.defaultValue;
    if (definition.required && (values[definition.name] === void 0 || values[definition.name] === "")) {
      throw new CliUsageError(
        `\u7F3A\u5C11\u53D8\u91CF ${definition.name}${environmentName ? `\uFF0C\u8BF7\u8BBE\u7F6E\u73AF\u5883\u53D8\u91CF ${environmentName}` : ""}`,
        environmentName ? `\u8BBE\u7F6E ${environmentName} \u540E\u91CD\u65B0\u8FD0\u884C\u3002` : "\u8BF7\u5728\u914D\u7F6E\u7684 vars \u6216 variables.defaultValue \u4E2D\u63D0\u4F9B\u8BE5\u53D8\u91CF\u3002"
      );
    }
  }
  return values;
}
async function runCommand(args) {
  const configPath = resolveConfigPath(args.config);
  const configDir = import_node_path6.default.dirname(configPath);
  const config = loadConfigFile(configPath, node_exports);
  const envGlobals = parseGlobalsEnv();
  const environment = selectEnvironment(config, args.env);
  const requested = args.scenario ? String(args.scenario).split(",").map((item) => item.trim()).filter(Boolean) : [];
  if (args.scenario && !requested.length) {
    throw new CliUsageError("--scenario \u7684\u503C\u4E3A\u7A7A", "\u8BF7\u63D0\u4F9B\u573A\u666F id/name/url\uFF1B\u591A\u4E2A\u573A\u666F\u7528\u9017\u53F7\u5206\u9694\u3002");
  }
  const missing = requested.filter((token) => !config.scenarios.some((item) => [item.id, item.name, item.url].includes(token)));
  if (missing.length) {
    const limit = 12;
    const choices = config.scenarios.slice(0, limit).map((item) => {
      const name = item.name && item.name !== item.id ? ` \u2014 ${item.name}` : "";
      return `  - ${item.id || "(\u65E0 id)"}${name}${item.manual ? "\uFF08manual:true\uFF09" : ""}`;
    });
    const remaining = config.scenarios.length - choices.length;
    const hasManualScenarios = config.scenarios.some((item) => item.manual);
    const list = config.scenarios.length ? `\u53EF\u7528\u573A\u666F\uFF08\u663E\u793A ${choices.length}/${config.scenarios.length} \u9879\uFF09\uFF1A
${choices.join("\n")}${remaining > 0 ? `
  \u2026 \u5176\u4F59 ${remaining} \u9879\u672A\u663E\u793A\u3002` : ""}${hasManualScenarios ? "\nmanual:true \u573A\u666F\u9700\u901A\u8FC7 --scenario <id> \u663E\u5F0F\u9009\u62E9\u3002" : ""}` : "\u914D\u7F6E\u4E2D\u6CA1\u6709\u53EF\u9009\u573A\u666F\uFF0C\u8BF7\u68C0\u67E5 scenarios \u5217\u8868\u3002";
    throw new CliUsageError(`\u672A\u627E\u5230\u573A\u666F: ${missing.join(", ")}`, list);
  }
  const entries = args.all ? config.scenarios.filter((item) => !item.manual) : requested.length ? config.scenarios.filter((item) => [item.id, item.name, item.url].some((key) => requested.includes(key))) : config.scenarios.filter((item) => [item.id, item.name, item.url].includes(config.scenarios[0]?.id));
  if (!entries.length) {
    if (args.all && config.scenarios.length > 0 && config.scenarios.every((item) => item.manual)) {
      throw new CliUsageError(
        "\u914D\u7F6E\u4E2D\u7684\u573A\u666F\u5168\u90E8\u6807\u8BB0\u4E3A manual:true\uFF0C--all \u9ED8\u8BA4\u6392\u9664\u624B\u52A8\u573A\u666F",
        "\u8BF7\u5148\u786E\u8BA4\u6570\u636E\u5DF2\u51C6\u5907\u597D\uFF0C\u518D\u901A\u8FC7 --scenario <id> \u663E\u5F0F\u9009\u62E9\u8981\u6267\u884C\u7684\u624B\u52A8\u573A\u666F\u3002"
      );
    }
    throw new CliUsageError(
      "\u914D\u7F6E\u4E2D\u6CA1\u6709\u53EF\u81EA\u52A8\u6267\u884C\u7684\u573A\u666F",
      "\u8BF7\u68C0\u67E5\u914D\u7F6E\u4E2D\u7684 scenarios \u5217\u8868\uFF1B\u5982\u573A\u666F\u5747\u4E3A manual:true\uFF0C\u8BF7\u786E\u8BA4\u6570\u636E\u51C6\u5907\u5B8C\u6210\u540E\u7528 --scenario <id> \u663E\u5F0F\u9009\u62E9\u3002"
    );
  }
  const plugins = await loadPlugins(config, configDir, { allowExternalPlugins: args.allowExternalPlugins });
  const adapters = {};
  for (const plugin of plugins) Object.assign(adapters, plugin?.adapters || {});
  const baseOptions = {
    config,
    baseUrl: String(args.baseUrl || environment.baseUrl || config.baseUrl || "").replace(/\/+$/, ""),
    authorization: args.authorization || environment.authorization || config.authorization || "",
    globals: mergeGlobals(config.globals, environment.globals, envGlobals),
    requestTimeoutMs: config.requestTimeoutMs,
    vars: configVariables(config),
    environmentVariables: process.env,
    io: createNodeIo(configDir),
    adapters
  };
  if (!baseOptions.baseUrl) {
    throw new CliUsageError(
      "\u7F3A\u5C11 Base URL",
      '\u8BF7\u5728\u914D\u7F6E\u73AF\u5883\u4E2D\u8BBE\u7F6E baseUrl\uFF0C\u6216\u4F7F\u7528 --base-url "https://api.example.com" \u4E34\u65F6\u6307\u5B9A\u3002'
    );
  }
  let total = 0;
  let passedTotal = 0;
  let failedTotal = 0;
  let actualFailedTotal = 0;
  let skippedTotal = 0;
  let stoppedUnexecutedTotal = 0;
  const print = args.json ? (...values) => console.error(...values) : (...values) => console.log(...values);
  const reports = [];
  for (const entry of entries) {
    if (!entry.url) throw new Error(`\u573A\u666F ${entry.id} \u7F3A\u5C11 url`);
    let scenarioPath;
    if (import_node_path6.default.isAbsolute(entry.url)) scenarioPath = entry.url;
    else {
      try {
        scenarioPath = validatePath(configDir, entry.url);
      } catch (error) {
        throw new Error(
          `\u573A\u666F ${entry.id} \u7684 url \u4E0D\u5B89\u5168: ${entry.url}
\u539F\u56E0: ${error.message}
url \u5FC5\u987B\u662F\u914D\u7F6E\u76EE\u5F55\u5185\u7684\u76F8\u5BF9\u8DEF\u5F84`
        );
      }
    }
    let scenario = loadScenarioFile(scenarioPath, entry.id, node_exports);
    scenario = await transformScenario(scenario, { config, configDir, entry, environment }, plugins);
    print(`
# ${escapeInlineText(scenario.name)} (${escapeInlineText(entry.id)})`);
    const report = await createEngine(baseOptions).runScenario(scenario, {
      ...baseOptions,
      // 重试进度：retryUntil 轮询在间隔内长时间静默，输出每次失败重试防「挂死」观感；
      // 带步骤名——同场景多个轮询步骤（等订单→等发货）时进度行需能归属
      async onAttempt(info) {
        const detail = `status ${escapeInlineText(info.status)}${info.failedAssertion ? `\uFF0C${escapeInlineText(info.failedAssertion)}` : ""}`;
        print(`  [RETRY] ${escapeInlineText(info.step?.name || "\u672A\u547D\u540D\u6B65\u9AA4")} \u7B2C ${info.attempt}/${info.totalAttempts} \u6B21\u672A\u901A\u8FC7\uFF08${detail}\uFF09\uFF0C${formatDuration(info.intervalMs)}\u540E\u91CD\u8BD5`);
      },
      async onStep(result) {
        const mark = result.skipped ? "SKIP" : result.passed ? "PASS" : "FAIL";
        print(`[${mark}] ${escapeInlineText(result.name)} ${escapeInlineText(result.method)} ${escapeInlineText(result.path)} -> ${escapeInlineText(result.status)} (${formatDuration(result.duration)})`);
        for (const warning of result.warnings || []) {
          print(`  [WARN] ${escapeInlineText(warning)}`);
        }
        const printEachDetail = (detail, prefix) => {
          for (const item of detail || []) {
            const label = `${prefix}\u7B2C ${item.index + 1} \u9879`;
            for (const sub of item.assertions) {
              if (sub.passed) continue;
              print(`      \u21B3 ${label} ${escapeInlineText(sub.name)}: expected=${formatFailureValue(sub.expected)} actual=${formatFailureValue(sub.actual)}`);
              if (sub.reason) print(`        \u539F\u56E0: ${escapeInlineText(sub.reason)}`);
              for (const line of failureDiffLines(sub.expected, sub.actual, "        ")) {
                print(line);
              }
              printEachDetail(sub.detail, `${label} \u203A `);
            }
          }
        };
        for (const assertion of result.assertions.filter((item) => !item.passed)) {
          print(`  - ${escapeInlineText(assertion.name)}: expected=${formatFailureValue(assertion.expected)} actual=${formatFailureValue(assertion.actual)}`);
          if (assertion.reason) print(`      \u539F\u56E0: ${escapeInlineText(assertion.reason)}`);
          for (const line of failureDiffLines(assertion.expected, assertion.actual, "    ")) {
            print(line);
          }
          printEachDetail(assertion.detail, "");
        }
        if (!result.passed && !result.skipped && !process.env.SCENARIO_NO_BODY_PRINT) printFailedStepBody(result, print);
      }
    });
    for (const plugin of plugins) {
      await plugin?.afterScenario?.(report, { config, configDir, entry, environment, scenario });
    }
    reports.push(report);
    total += report.planned;
    passedTotal += report.passedSteps;
    const stoppedUnexecuted = report.planned - report.executed - report.skipped;
    actualFailedTotal += report.failed;
    stoppedUnexecutedTotal += stoppedUnexecuted;
    failedTotal += report.failed + stoppedUnexecuted;
    skippedTotal += report.skipped;
    print(`Summary: passed=${report.passedSteps} failed=${report.failed} skipped=${report.skipped} executed=${report.executed}/${report.planned} planned (\u72B6\u6001 ${report.status})`);
  }
  print(`
Overall: ${passedTotal}/${total} passed`);
  if (failedTotal) process.exitCode = 1;
  if (args.failOnSkip && skippedTotal > 0) {
    print(`
--fail-on-skip \u5DF2\u5F00\u542F\uFF0C\u5B58\u5728 ${skippedTotal} \u4E2A SKIP \u6B65\u9AA4\uFF0C\u9000\u51FA\u7801\u7F6E\u4E3A 1`);
    process.exitCode = 1;
  }
  const countSummary = `\u901A\u8FC7 ${passedTotal} \u6B65\uFF0C\u5B9E\u9645\u5931\u8D25 ${actualFailedTotal} \u6B65\uFF0C\u6761\u4EF6\u8DF3\u8FC7 ${skippedTotal} \u6B65\uFF0C\u56E0 stop \u7B56\u7565\u672A\u6267\u884C ${stoppedUnexecutedTotal} \u6B65`;
  if (actualFailedTotal > 0) {
    print(`
\u7ED3\u8BBA\uFF1A\u6267\u884C\u5931\u8D25\u3002${countSummary}\uFF1B\u672A\u6267\u884C\u6B65\u9AA4\u4E0D\u8BA1\u5165\u901A\u8FC7\u3002`);
  } else if (passedTotal === 0 && skippedTotal > 0) {
    const exitText = args.failOnSkip ? "\u56E0 --fail-on-skip \u5F00\u542F\uFF0C\u9000\u51FA\u7801\u4E3A 1" : "\u6309\u9ED8\u8BA4\u7B56\u7565\u9000\u51FA\u7801\u4E3A 0";
    print(`
\u7ED3\u8BBA\uFF1A\u5168\u90E8\u8DF3\u8FC7\uFF0C\u672A\u53D1\u8D77\u8BF7\u6C42\u3002${countSummary}\uFF1B${exitText}\u3002`);
  } else if (stoppedUnexecutedTotal > 0) {
    print(`
\u7ED3\u8BBA\uFF1A\u6267\u884C\u672A\u5B8C\u6210\u3002${countSummary}\u3002`);
  } else {
    print(`
\u7ED3\u8BBA\uFF1A\u6267\u884C\u5B8C\u6210\u3002${countSummary}${skippedTotal > 0 ? "\uFF1B\u6761\u4EF6\u8DF3\u8FC7\u7684\u6B65\u9AA4\u672A\u53D1\u8D77\u8BF7\u6C42" : ""}\u3002`);
  }
  if (args.json) {
    const payload = reports.length === 1 ? reports[0] : { scenarios: reports };
    process.stdout.write(`${JSON.stringify(payload, null, 2)}
`);
  }
}
var FAILURE_BODY_LIMIT = 2e3;
var BODY_CTRL_CHARS = /[\x00-\x1f\x7f-\x9f]/;
var CI_LINE_START = /^\s*::/;
var CI_ANYWHERE = /##\[|##vso\[|##teamcity\[/i;
function escapeBodyLine(line) {
  if (!BODY_CTRL_CHARS.test(line) && !CI_LINE_START.test(line) && !CI_ANYWHERE.test(line)) return line;
  return escapeC1(defuseCiCommandMarkers(JSON.stringify(line)));
}
function escapeErrorText(error) {
  return String(error?.stack || error).split("\n").map(escapeBodyLine).join("\n");
}
function printFailedStepBody(result, print = console.log) {
  const response = result?.response;
  if (!response || typeof response !== "object") return;
  const body = response.body;
  const bodyText = typeof response.bodyText === "string" ? response.bodyText : null;
  if (bodyText === null && body && typeof body === "object" && body[SAVED_RESPONSE] === true) {
    print(`  \u54CD\u5E94\u4F53\u5DF2\u4FDD\u5B58\u81F3 ${escapeBodyLine(body.savedTo)}`);
    return;
  }
  let raw = bodyText ?? "";
  if (raw.trim() === "" && body !== null && body !== void 0) {
    if (typeof body === "string") raw = body;
    else {
      try {
        raw = JSON.stringify(body) ?? String(body);
      } catch {
        raw = String(body);
      }
    }
  }
  const text = raw.replace(/\r\n/g, "\n").trimEnd();
  if (text === "") return;
  const truncated = text.length > FAILURE_BODY_LIMIT;
  const shown = truncated ? text.slice(0, FAILURE_BODY_LIMIT) : text;
  const note = truncated ? `\uFF08\u5171 ${text.length} \u5B57\u7B26\uFF0C\u622A\u65AD\u663E\u793A\u524D ${FAILURE_BODY_LIMIT}\uFF09` : "";
  print(`  \u54CD\u5E94\u4F53${note}:`);
  for (const line of shown.split("\n")) print(`    ${escapeBodyLine(line)}`);
}
function safeFile(root, relativePath) {
  const candidate = import_node_path6.default.resolve(root, relativePath);
  const relative = import_node_path6.default.relative(root, candidate);
  if (!relative || relative.startsWith("..") || import_node_path6.default.isAbsolute(relative)) return null;
  return isRealPathWithinRoot(root, candidate) ? candidate : null;
}
function contentType(filePath) {
  return {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".txt": "text/plain; charset=utf-8"
  }[import_node_path6.default.extname(filePath).toLowerCase()] || "application/octet-stream";
}
function serveStaticFile(response, filePath) {
  const headers = { "Cache-Control": "no-store", "Content-Type": contentType(filePath) };
  if (import_node_path6.default.extname(filePath).toLowerCase() !== ".html") {
    const stream = import_node_fs6.default.createReadStream(filePath);
    stream.on("error", () => {
      if (response.headersSent) {
        response.destroy();
        return;
      }
      response.writeHead(500);
      response.end("Internal Server Error");
    });
    stream.on("open", () => {
      response.writeHead(200, headers);
      stream.pipe(response);
    });
    return;
  }
  import_node_fs6.default.readFile(filePath, "utf8", function(error, html) {
    if (error) {
      response.writeHead(500);
      response.end("Internal Server Error");
      return;
    }
    const marker = "<script>window.__SCENARIO_TEST_SERVE_PROXY__ = true;</script>";
    const headPattern = /<head(?:\s[^>]*)?>/i;
    const content = headPattern.test(html) ? html.replace(headPattern, function(head) {
      return head + marker;
    }) : marker + html;
    response.writeHead(200, headers);
    response.end(content);
  });
}
function resolveServeProxyTarget(config, envKey, baseUrlOverride) {
  if (config.envs?.length) {
    const environment = selectEnvironment(config, envKey);
    const overridden = Boolean(baseUrlOverride);
    return {
      key: overridden ? `${environment.key}\uFF08--base-url \u8986\u76D6\uFF09` : environment.key,
      target: String(overridden ? baseUrlOverride : environment.baseUrl || "").replace(/\/+$/, "")
    };
  }
  return {
    key: config.defaultEnvKey || "default",
    target: String(baseUrlOverride || config.baseUrl || "").replace(/\/+$/, "")
  };
}
var HOP_BY_HOP_HEADERS = /* @__PURE__ */ new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host"
]);
function respondProxyError(response, message) {
  if (response.headersSent) {
    response.destroy();
    return;
  }
  response.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(message);
}
function proxyTransport(targetUrl) {
  try {
    const protocol = new URL(targetUrl).protocol;
    if (protocol === "https:") return import_node_https.default;
    if (protocol === "http:") return import_node_http.default;
  } catch {
    return null;
  }
  return null;
}
function connectionNamedHeaders(connectionValue) {
  return String(connectionValue || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}
function proxyRequest(request, response, targetUrl) {
  const transport = proxyTransport(targetUrl);
  if (!transport) {
    respondProxyError(
      response,
      `Bad Gateway: \u63A5\u53E3\u4EE3\u7406\u76EE\u6807\u65E0\u6548: ${targetUrl}
\u8BF7\u68C0\u67E5\u73AF\u5883 baseUrl\uFF0C\u5FC5\u987B\u5E26\u534F\u8BAE\u524D\u7F00\uFF08http:// \u6216 https://\uFF09`
    );
    return;
  }
  const headers = {};
  const requestCloseNamed = new Set(connectionNamedHeaders(request.headers.connection));
  for (const [name, value] of Object.entries(request.headers)) {
    const lower = String(name).toLowerCase();
    if (!HOP_BY_HOP_HEADERS.has(lower) && !requestCloseNamed.has(lower)) headers[name] = value;
  }
  let upstream;
  try {
    upstream = transport.request(targetUrl + request.url, {
      method: request.method,
      headers,
      // serve 是本地联调代理，内网 https 后端普遍使用自签证书；
      // 与 vite/webpack-dev-server 的 proxy secure:false 同语义，放宽上游证书校验
      ...transport === import_node_https.default ? { rejectUnauthorized: false } : {}
    }, (upstreamResponse) => {
      const responseHeaders = {};
      const upstreamCloseNamed = new Set(connectionNamedHeaders(upstreamResponse.headers.connection));
      for (const [name, value] of Object.entries(upstreamResponse.headers)) {
        const lower = String(name).toLowerCase();
        if (!HOP_BY_HOP_HEADERS.has(lower) && !upstreamCloseNamed.has(lower)) responseHeaders[name] = value;
      }
      response.writeHead(upstreamResponse.statusCode || 502, responseHeaders);
      upstreamResponse.pipe(response);
    });
  } catch (error) {
    respondProxyError(response, `Bad Gateway: \u63A5\u53E3\u4EE3\u7406\u8BF7\u6C42\u6784\u9020\u5931\u8D25: ${error.message}`);
    return;
  }
  upstream.setTimeout(3e4, () => {
    upstream.destroy(new Error("\u63A5\u53E3\u4EE3\u7406\u8D85\u65F6"));
  });
  upstream.on("error", () => {
    respondProxyError(response, "Bad Gateway: \u65E0\u6CD5\u8FDE\u63A5\u63A5\u53E3\u4EE3\u7406\u76EE\u6807\u6216\u4EE3\u7406\u8D85\u65F6");
  });
  request.pipe(upstream);
}
function isAllowedServeHost(hostHeader, port) {
  const host = String(hostHeader || "").trim().toLowerCase();
  return [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`, "127.0.0.1", "localhost", "[::1]"].includes(host);
}
async function serveCommand(args) {
  const configPath = resolveConfigPath(args.config);
  const workspace = import_node_path6.default.dirname(configPath);
  const libraryDist = import_node_path6.default.dirname(import_node_path6.default.resolve(process.argv[1]));
  const config = loadConfigFile(configPath, node_exports);
  const { key: proxyEnvKey, target: proxyTarget } = resolveServeProxyTarget(config, args.env, args.baseUrl);
  const server = import_node_http.default.createServer((request, response) => {
    try {
      if (!isAllowedServeHost(request.headers.host, args.port)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }
      const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
      let filePath;
      if (pathname === "/__scenario-test__/scenario-test.umd.js") filePath = import_node_path6.default.join(libraryDist, "scenario-test.umd.js");
      else if (pathname === "/dist/scenario-test.umd.js") {
        filePath = import_node_path6.default.join(libraryDist, "scenario-test.umd.js");
      } else if (pathname === "/node_modules/@yc_yzkj/scenario-test/dist/scenario-test.umd.js") {
        filePath = import_node_path6.default.join(libraryDist, "scenario-test.umd.js");
      } else {
        const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
        filePath = safeFile(workspace, relativePath);
      }
      if (!filePath) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }
      import_node_fs6.default.stat(filePath, (error, stat) => {
        if (error || !stat.isFile()) {
          if (proxyTarget) {
            proxyRequest(request, response, proxyTarget);
            return;
          }
          response.writeHead(404);
          response.end("Not Found");
          return;
        }
        serveStaticFile(response, filePath);
      });
    } catch {
      response.writeHead(400);
      response.end("Bad Request");
    }
  });
  server.on("error", (error) => {
    if (error?.code === "EADDRINUSE") {
      console.error(`\u9519\u8BEF\uFF1A\u7AEF\u53E3 ${args.port} \u5DF2\u88AB\u5360\u7528`);
      console.error("\u63D0\u793A\uFF1A\u8BF7\u4F7F\u7528 --port <\u5176\u4ED6\u7A7A\u95F2\u7AEF\u53E3> \u6307\u5B9A\u7AEF\u53E3\u540E\u91CD\u8BD5\uFF1B\u6216\u53CC\u51FB start-scenario-test.cmd \u91CD\u65B0\u7533\u8BF7\u7A7A\u95F2\u7AEF\u53E3\u3002");
      process.exitCode = 1;
      return;
    }
    console.error(`\u573A\u666F\u6D4B\u8BD5\u5DE5\u4F5C\u53F0\u542F\u52A8\u5931\u8D25: ${escapeInlineText(error?.message || String(error))}`);
    process.exitCode = 1;
  });
  server.listen(args.port, "127.0.0.1", () => {
    console.log(`\u573A\u666F\u6D4B\u8BD5\u5DE5\u4F5C\u53F0: http://127.0.0.1:${args.port}/`);
    console.log(`\u914D\u7F6E\u76EE\u5F55: ${workspace}`);
    if (proxyTarget) console.log(`\u63A5\u53E3\u4EE3\u7406: ${proxyEnvKey} -> ${proxyTarget}`);
    console.log("\u63D0\u793A: serve \u5DF2\u81EA\u52A8\u542F\u7528\u540C\u6E90\u63A5\u53E3\u4EE3\u7406\uFF1B\u6D4F\u89C8\u5668\u8BF7\u6C42\u4F1A\u5148\u5230\u5F53\u524D\u5DE5\u4F5C\u53F0\u5730\u5740\u3002\u53CC\u51FB\u9879\u76EE\u5185 start-scenario-test.cmd \u53EF\u4E00\u952E\u542F\u52A8\u3002");
  });
}
function capabilitiesCommand(args) {
  const capabilities = buildCapabilities(contract);
  if (args.json) {
    process.stdout.write(`${JSON.stringify(capabilities, null, 2)}
`);
  } else {
    console.log(renderCapabilitiesText(capabilities));
  }
}
function doctorCommand(args) {
  let configPath;
  let configDir;
  try {
    configPath = resolveConfigPath(args.config);
    configDir = import_node_path6.default.dirname(configPath);
  } catch (error) {
    configPath = import_node_path6.default.resolve(args.config || "scenario.config.js");
    configDir = import_node_path6.default.dirname(configPath);
  }
  const report = buildDoctorReport({ configPath, api: node_exports, configDir });
  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}
`);
  } else {
    console.log(renderDoctorText(report));
  }
  process.exitCode = report.exitCode;
}
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (args.command === "init") await initCommand(args);
  else if (args.command === "serve") await serveCommand(args);
  else if (args.command === "capabilities") capabilitiesCommand(args);
  else if (args.command === "doctor") doctorCommand(args);
  else await runCommand(args);
}
main().catch((error) => {
  if (error instanceof CliUsageError) {
    console.error(`\u9519\u8BEF\uFF1A${escapeInlineText(error.message)}`);
    if (error.hint) console.error(`\u63D0\u793A\uFF1A${escapeInlineText(error.hint)}`);
  } else {
    console.error(escapeErrorText(error));
  }
  process.exitCode = 1;
});
//# sourceMappingURL=scenario-test-cli.cjs.map
