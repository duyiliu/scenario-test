#!/usr/bin/env node
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
var import_node_fs9 = __toESM(require("node:fs"), 1);
var import_node_path9 = __toESM(require("node:path"), 1);
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
  SECRET_VAR_PATTERN: () => SECRET_VAR_PATTERN,
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
  collectMissingTemplateVars: () => collectMissingTemplateVars,
  collectSecretValues: () => collectSecretValues,
  contract: () => contract,
  createApp: () => createApp,
  createEngine: () => createEngine,
  createNodeIo: () => createNodeIo,
  createRuntime: () => createRuntime,
  defineConfig: () => defineConfig,
  defineScenario: () => defineScenario,
  evalExpression: () => evalExpression,
  evaluateAssertion: () => evaluateAssertion,
  evaluateShape: () => evaluateShape,
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
  isSecretVarName: () => isSecretVarName,
  joinUrl: () => joinUrl,
  listAdapters: () => listAdapters,
  loadConfigFile: () => loadConfigFile,
  loadScenarioFile: () => loadScenarioFile,
  luhnCheckDigit: () => luhnCheckDigit,
  maskSecret: () => maskSecret,
  md5: () => md5,
  mergeGlobals: () => mergeGlobals,
  missingTemplateVarWarnings: () => missingTemplateVarWarnings,
  normalizeEnumDefinition: () => normalizeEnumDefinition,
  normalizeGlobalParam: () => normalizeGlobalParam,
  normalizeWhenDefinition: () => normalizeWhenDefinition,
  parseBody: () => parseBody,
  parseTimestampOffset: () => parseTimestampOffset,
  pickWeightedIndex: () => pickWeightedIndex,
  queryPairs: () => queryPairs,
  redactSecrets: () => redactSecrets,
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
  templateExpressionRoot: () => templateExpressionRoot,
  tokenizePath: () => tokenizePath,
  unregisterAdapter: () => unregisterAdapter,
  usccCheckChar: () => usccCheckChar,
  validateAdapter: () => validateAdapter,
  validateAdapterResponse: () => validateAdapterResponse,
  validateAssertion: () => validateAssertion,
  validateShapeSchema: () => validateShapeSchema
});

// src/core.js
var import_blueimp_md5 = __toESM(require_md5(), 1);

// src/version.generated.js
var VERSION = "0.8.0";

// src/contract.js
var CONTRACT_VERSION = 13;
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
      shape: Object.freeze({
        description: "\u7ED3\u6784\u7EA7\u6821\u9A8C\uFF08jsonSchema-lite\uFF09\uFF1A\u6309 type/required/properties/items/enum/additionalProperties \u6821\u9A8C\u54CD\u5E94\u7ED3\u6784\uFF0C\u5931\u8D25\u660E\u7EC6\u5B9A\u4F4D\u5230\u5B57\u6BB5\u8DEF\u5F84\u4E0E\u671F\u671B/\u5B9E\u9645\u7C7B\u578B",
        valueType: "any"
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
    numericOperators: Object.freeze(["gt", "gte", "lt", "lte"]),
    // shape 断言支持的结构键与类型名（jsonSchema-lite，不引入依赖）
    shape: Object.freeze({
      keys: Object.freeze(["type", "required", "properties", "items", "enum", "additionalProperties"]),
      types: Object.freeze(["object", "array", "string", "number", "integer", "boolean", "null"])
    })
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
    metaKeys: Object.freeze(["name", "path", "from", "target", "header", "required", "default", "scope"]),
    // 提取作用域：step（默认，仅当前场景可见）/ suite（写入本次 run 的共享变量，后续场景可引用）
    scopes: Object.freeze(["step", "suite"]),
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
    note: 'required: true \u4E14\u8DEF\u5F84\u4E0D\u5B58\u5728\u65F6\u5F53\u524D\u6B65\u9AA4\u5931\u8D25\uFF1B\u58F0\u660E default \u65F6\u7F3A\u5931\u53D6\u515C\u5E95\u503C\uFF08\u652F\u6301\u6A21\u677F\u3001\u4E0D\u4EA7\u751F warning\uFF09\uFF1B\u5426\u5219\u7F3A\u5931\u4EA7\u751F warning\uFF08\u4E0D\u542B\u54CD\u5E94\u5185\u5BB9\uFF09\uFF0C\u53D8\u91CF\u4E3A undefined\uFF1Brequired \u4E0E default \u4E92\u65A5\uFF0C\u53EA\u80FD\u58F0\u660E\u5176\u4E00\uFF1Bfrom: "headers" \u914D path \u65F6\u9996\u6BB5\u5934\u540D\u5927\u5C0F\u5199\u4E0D\u654F\u611F\u5339\u914D\uFF08\u4E0E\u65AD\u8A00 from: "headers"\u3001header \u7B80\u5199\u540C\u53E3\u5F84\uFF09\uFF0C\u9996\u6BB5\u540E\u7684\u5B50\u8DEF\u5F84\u5728\u5934\u503C\u4E0A\u53D6\uFF0Cfrom: "response" \u4ECD\u6309\u7CBE\u786E\u952E\u5339\u914D\uFF1Bscope: "suite" \u65F6\u63D0\u53D6\u503C\u5199\u5165\u672C\u6B21 run \u5171\u4EAB\u53D8\u91CF\uFF0C\u540E\u7EED\u573A\u666F\u53EF\u76F4\u63A5\u7528 {{vars.<name>}} \u5F15\u7528\uFF08\u9ED8\u8BA4 step \u4EC5\u5F53\u524D\u573A\u666F\u53EF\u89C1\uFF09'
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
    scenarioItemKeys: Object.freeze(["id", "name", "url", "manual", "tags"]),
    environmentKeys: Object.freeze(["key", "name", "baseUrl", "globals", "authorization", "vars"]),
    variableKeys: Object.freeze(["name", "label", "env", "required", "defaultValue"]),
    manual: Object.freeze({
      type: "boolean",
      note: "manual: true \u8868\u793A\u573A\u666F\u9700\u8981\u4EBA\u5DE5\u51C6\u5907\u6570\u636E\u6216\u5199\u6570\u636E\uFF0C--all \u9ED8\u8BA4\u6392\u9664\uFF0C--scenario <id> \u53EF\u663E\u5F0F\u6267\u884C"
    }),
    tags: Object.freeze({
      type: "string[]",
      note: "\u914D\u7F6E\u6E05\u5355\u9879\u58F0\u660E tags \u7528\u4E8E run --tag \u7B5B\u9009\uFF08\u91CD\u590D\u53C2\u6570\u4E4B\u95F4\u4E3A OR\uFF0C\u5355\u4E2A\u53C2\u6570\u5185\u9017\u53F7\u5206\u9694\u4E3A AND\uFF1B\u4E0D\u4F1A\u81EA\u52A8\u653E\u884C manual:true \u573A\u666F\uFF09\uFF1B\u573A\u666F\u9876\u5C42 tags \u4E3A\u573A\u666F\u5143\u6570\u636E"
    })
  }),
  scenario: Object.freeze({
    keys: Object.freeze(["name", "steps", "vars", "envVars", "generatedVars", "failurePolicy", "tags"]),
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
      "adapter",
      "always"
    ]),
    failurePolicies: Object.freeze(["stop", "continue"]),
    // retryUntil 允许的键；intervalFactor/maxIntervalMs 控制指数退避
    retryUntilKeys: Object.freeze(["maxAttempts", "intervalMs", "maxElapsedMs", "intervalFactor", "maxIntervalMs"]),
    note: "always: true \u7684\u6B65\u9AA4\u5728\u524D\u7F6E\u666E\u901A\u6B65\u9AA4\u5931\u8D25\uFF08failurePolicy: stop\uFF09\u540E\u4ECD\u4F1A\u6267\u884C\uFF0C\u7528\u4E8E teardown\uFF1B\u7528\u6237\u53D6\u6D88\u6267\u884C\u65F6\u4E0D\u8FD0\u884C\u3002retryUntil \u7B2C n \u6B21\u91CD\u8BD5\u95F4\u9694 = intervalMs * intervalFactor^(n-1)\uFF0C\u5C01\u9876 maxIntervalMs\uFF0C\u4E14\u4E0D\u4F4E\u4E8E 100ms"
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
      "proxy-timeout": { kind: "value", prop: "proxyTimeout", parse: "number", description: "serve \u4EE3\u7406\u4E0A\u6E38\u7A7A\u95F2\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF0C\u9ED8\u8BA4 30000\uFF0C\u4E0A\u9650 600000\uFF09" },
      data: { kind: "value", prop: "dataFile", description: "\u6570\u636E\u9A71\u52A8\u6267\u884C\uFF1AJSON/JSONL/CSV \u6570\u636E\u96C6\u6587\u4EF6\uFF0C\u6BCF\u884C\u53D8\u91CF\u96C6\u6267\u884C\u4E00\u6B21\u573A\u666F" },
      junit: { kind: "value", prop: "junit", description: "\u8F93\u51FA JUnit XML \u62A5\u544A\u5230\u6307\u5B9A\u6587\u4EF6" },
      tag: {
        kind: "value",
        prop: "tags",
        repeatable: true,
        description: "\u6309\u6807\u7B7E\u7B5B\u9009\u573A\u666F\uFF08\u53EF\u91CD\u590D\uFF1B\u91CD\u590D\u53C2\u6570\u4E4B\u95F4\u4E3A OR\uFF0C\u5355\u4E2A\u53C2\u6570\u5185\u9017\u53F7\u5206\u9694\u4E3A AND\uFF09"
      },
      bail: { kind: "flag", prop: "bail", description: "\u4EFB\u4E00\u573A\u666F\u5931\u8D25\u540E\u4E0D\u518D\u542F\u52A8\u540E\u7EED\u573A\u666F\uFF08\u5DF2\u6267\u884C\u573A\u666F\u8DD1\u5B8C\uFF09" },
      "cookie-jar": { kind: "flag", prop: "cookieJar", description: "run \u4E3A\u6BCF\u4E2A\u573A\u666F\u542F\u7528\u5185\u5B58 Cookie Jar\uFF08\u81EA\u52A8\u643A\u5E26 Set-Cookie\uFF0C\u9ED8\u8BA4\u5173\u95ED\uFF09" },
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
function templateExpressionRoot(expression) {
  const text = String(expression || "").trim();
  if (!text || text === "vars") return null;
  if (text.startsWith("lastResponse")) return null;
  let pathText;
  if (text.startsWith("vars.")) pathText = text.slice(5);
  else if (text.startsWith("vars[")) pathText = text.slice(4);
  else pathText = text;
  if (!pathText || pathText.startsWith(".")) return null;
  const tokens = tokenizePath(pathText);
  if (!tokens || !tokens.length) return null;
  const token = tokens[0];
  if (token.startsWith("[")) {
    const inner = token.slice(1, -1).replace(/^['"]|['"]$/g, "");
    return inner || null;
  }
  return token;
}
function collectMissingTemplateVars(value, vars, missing = /* @__PURE__ */ new Set(), seen = /* @__PURE__ */ new WeakSet()) {
  if (typeof value === "string") {
    if (!value.includes("{{")) return missing;
    for (const match of value.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)) {
      const root = templateExpressionRoot(match[1]);
      if (root && !Object.prototype.hasOwnProperty.call(vars || {}, root)) missing.add(root);
    }
    return missing;
  }
  if (value === null || typeof value !== "object" || seen.has(value)) return missing;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) collectMissingTemplateVars(item, vars, missing, seen);
    return missing;
  }
  if (isPlainObject(value)) {
    for (const item of Object.values(value)) collectMissingTemplateVars(item, vars, missing, seen);
  }
  return missing;
}
function missingTemplateVarWarnings(missing) {
  return [...missing].map((name) => `\u6A21\u677F\u53D8\u91CF vars.${name} \u672A\u5B9A\u4E49\uFF0C\u5DF2\u6309\u7A7A\u4E32\u89E3\u6790\uFF08\u68C0\u67E5\u53D8\u91CF\u540D\u62FC\u5199\uFF0C\u6216\u8865\u5145 config/scenario vars\u3001extract \u4E0E --vars\uFF09`);
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
function buildUrl(requestPath, params, runtime) {
  const rawPath = resolveString(requestPath || "", runtime);
  if (!params || !isPlainObject(params)) return rawPath;
  const resolved = resolve(params, runtime);
  const pairs = Object.entries(resolved).flatMap(([key, value]) => queryPairs(key, value));
  if (!pairs.length) return rawPath;
  return `${rawPath}${rawPath.includes("?") ? "&" : "?"}${pairs.join("&")}`;
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
var SHAPE_KEYS = new Set(contract.assertions.shape.keys);
var SHAPE_TYPES = new Set(contract.assertions.shape.types);
function validateShapeSchema(schema, trail = "shape") {
  if (!isPlainObject(schema)) throw new TypeError(`${trail} \u5FC5\u987B\u662F\u5BF9\u8C61\uFF08jsonSchema-lite \u5B50\u96C6\uFF09`);
  const unknown = Object.keys(schema).filter((key) => !SHAPE_KEYS.has(key));
  if (unknown.length) {
    throw new TypeError(`${trail} \u5305\u542B\u672A\u77E5\u952E ${unknown.map((key) => `"${key}"`).join(", ")}\uFF0C\u5141\u8BB8\u7684\u952E\u4E3A ${[...SHAPE_KEYS].join("/")}`);
  }
  if (schema.type !== void 0 && !SHAPE_TYPES.has(schema.type)) {
    throw new TypeError(`${trail}.type \u53EA\u652F\u6301 ${[...SHAPE_TYPES].join("/")}\uFF08\u5F53\u524D ${JSON.stringify(schema.type)}\uFF09`);
  }
  if (schema.required !== void 0) {
    if (!Array.isArray(schema.required) || schema.required.some((name) => typeof name !== "string" || !name)) {
      throw new TypeError(`${trail}.required \u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32\u6570\u7EC4`);
    }
  }
  if (schema.properties !== void 0) {
    if (!isPlainObject(schema.properties)) throw new TypeError(`${trail}.properties \u5FC5\u987B\u662F\u5BF9\u8C61`);
    for (const [key, sub] of Object.entries(schema.properties)) {
      validateShapeSchema(sub, `${trail}.properties.${key}`);
    }
  }
  if (schema.items !== void 0) validateShapeSchema(schema.items, `${trail}.items`);
  if (schema.enum !== void 0 && !Array.isArray(schema.enum)) {
    throw new TypeError(`${trail}.enum \u5FC5\u987B\u662F\u6570\u7EC4`);
  }
  if (schema.additionalProperties !== void 0 && typeof schema.additionalProperties !== "boolean") {
    throw new TypeError(`${trail}.additionalProperties \u5FC5\u987B\u662F\u5E03\u5C14\u503C`);
  }
  if (schema.type === void 0 && schema.required === void 0 && schema.properties === void 0 && schema.items === void 0 && schema.enum === void 0 && schema.additionalProperties === void 0) {
    throw new TypeError(`${trail} \u81F3\u5C11\u9700\u8981\u58F0\u660E type/required/properties/items/enum/additionalProperties \u4E4B\u4E00`);
  }
  return schema;
}
function shapeActualType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  return typeof value;
}
function shapeTypeMatches(type, value) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return isPlainObject(value);
  if (type === "integer") return typeof value === "number" && Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  return typeof value === type;
}
function shapeErrors(schema, value, path10, errors) {
  const type = schema.type || (schema.properties !== void 0 || schema.required !== void 0 || schema.additionalProperties !== void 0 ? "object" : schema.items !== void 0 ? "array" : void 0);
  if (type && !shapeTypeMatches(type, value)) {
    errors.push({ path: path10 || "(\u6839)", expected: `type: ${type}`, actual: shapeActualType(value), value });
    return errors;
  }
  if (schema.enum !== void 0 && !schema.enum.some((candidate) => stableStringify(candidate) === stableStringify(value))) {
    errors.push({ path: path10 || "(\u6839)", expected: `enum: ${JSON.stringify(schema.enum)}`, actual: value, value });
  }
  if (isPlainObject(value)) {
    for (const name of schema.required || []) {
      if (!Object.prototype.hasOwnProperty.call(value, name)) {
        errors.push({ path: path10 ? `${path10}.${name}` : name, expected: "\u5FC5\u586B\u5B57\u6BB5\u5B58\u5728", actual: "\u7F3A\u5931", value: void 0 });
      }
    }
    const properties = schema.properties || {};
    for (const [name, subSchema] of Object.entries(properties)) {
      if (!Object.prototype.hasOwnProperty.call(value, name)) continue;
      shapeErrors(subSchema, value[name], path10 ? `${path10}.${name}` : name, errors);
    }
    if (schema.additionalProperties === false) {
      for (const name of Object.keys(value)) {
        if (!Object.prototype.hasOwnProperty.call(properties, name)) {
          errors.push({ path: path10 ? `${path10}.${name}` : name, expected: "\u4E0D\u5141\u8BB8\u7684\u989D\u5916\u5B57\u6BB5", actual: value[name], value: value[name] });
        }
      }
    }
  }
  if (Array.isArray(value) && schema.items !== void 0) {
    value.forEach((item, index) => {
      shapeErrors(schema.items, item, `${path10 || ""}[${index}]`, errors);
    });
  }
  return errors;
}
function evaluateShape(schema, actual) {
  return shapeErrors(schema, actual, "", []);
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
  if (definition.shape !== void 0) {
    validateShapeSchema(definition.shape, `${prefix}: shape`);
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
  let shapeFailures = null;
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
  if (Object.prototype.hasOwnProperty.call(definition, "shape")) {
    expected = resolve(definition.shape, runtime);
    if (isPlainObject(expected)) {
      shapeFailures = evaluateShape(expected, actual);
      if (shapeFailures.length) passed = false;
    } else {
      passed = false;
      shapeFailures = [{ path: "(\u6839)", expected: "shape \u5B9A\u4E49\u5BF9\u8C61", actual: shapeActualType(expected), value: expected }];
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
    // detail 仅在 each/shape 存在失败明细时出现；通过时保持既有四字段形状（旧消费方不受影响）
    ...eachFailures ? { detail: eachFailures } : {},
    ...shapeFailures ? { detail: shapeFailures } : {}
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
  const store = (name, value, suiteScope) => {
    runtime.vars[name] = value;
    if (suiteScope) {
      if (!isPlainObject(runtime.suiteVars)) runtime.suiteVars = {};
      runtime.suiteVars[name] = value;
    }
  };
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
        store(definition.name, resolve(definition.default, runtime), definition.scope === "suite");
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
    store(definition.name, value, definition.scope === "suite");
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
  const now2 = typeof deps.now === "function" ? deps.now : Date.now;
  if (definition.type === "timestamp") {
    const base = now2() + (definition.offset == null ? 0 : parseTimestampOffset(definition.offset));
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
var SECRET_VAR_PATTERN = /(token|secret|password|passwd|auth|credential|api[-_]?key|cookie)/i;
function isSecretVarName(name) {
  return SECRET_VAR_PATTERN.test(String(name || ""));
}
function maskSecret(value) {
  if (value === void 0 || value === null || value === "") return "";
  const text = String(value);
  return text.length > 12 ? `${text.slice(0, 4)}...${text.slice(-4)}` : "***";
}
function collectSecretValues(vars, extra = []) {
  const secrets = /* @__PURE__ */ new Set();
  for (const [name, value] of Object.entries(vars || {})) {
    if (!isSecretVarName(name)) continue;
    if (value === void 0 || value === null || value === "") continue;
    if (typeof value === "object") continue;
    secrets.add(String(value));
  }
  for (const value of extra || []) {
    if (value === void 0 || value === null || value === "") continue;
    secrets.add(String(value));
  }
  return [...secrets];
}
function redactSecrets(value, secrets, seen = /* @__PURE__ */ new WeakMap()) {
  if (typeof value === "string") {
    let text = value;
    for (const secret of secrets || []) {
      if (!secret) continue;
      if (text === secret) return maskSecret(secret);
      if (secret.length >= 4 && text.includes(secret)) {
        text = text.split(secret).join(maskSecret(secret));
      }
    }
    return text;
  }
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);
  if (Array.isArray(value)) {
    const result2 = [];
    seen.set(value, result2);
    for (const item of value) result2.push(redactSecrets(item, secrets, seen));
    return result2;
  }
  if (!isPlainObject(value)) return value;
  const result = {};
  seen.set(value, result);
  for (const [key, item] of Object.entries(value)) {
    if (isSecretVarName(key) && item !== void 0 && item !== null && item !== "") {
      if (Array.isArray(item)) result[key] = item.map((entry) => entry !== null && typeof entry === "object" ? "***" : maskSecret(entry));
      else if (typeof item === "object") result[key] = "***";
      else result[key] = maskSecret(item);
    } else {
      result[key] = redactSecrets(item, secrets, seen);
    }
  }
  return result;
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
  const window = (text) => {
    const start = Math.max(0, index - CONTEXT_RADIUS);
    const end = Math.min(text.length, index + CONTEXT_RADIUS);
    const head = start > 0 ? "\u2026" : "";
    const tail = end < text.length ? "\u2026" : "";
    const escape = (part) => defuseCiCommandMarkers(escapeC1(JSON.stringify(part).slice(1, -1)));
    return `${head}${escape(text.slice(start, index))}\xAB${escape(text.slice(index, index + 1))}\xBB${escape(text.slice(index + 1, end))}${tail}`;
  };
  return [
    `${prefix}\u2191 \u9996\u4E2A\u5DEE\u5F02\u5728\u7B2C ${index + 1} \u4E2A\u5B57\u7B26\uFF08\u957F\u5EA6 ${expected.length} vs ${actual.length}\uFF09\uFF1A`,
    `${prefix}\u2191 \u671F\u671B ${window(expected)}`,
    `${prefix}\u2191 \u5B9E\u9645 ${window(actual)}`
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
  if (actualResponse.headers !== void 0 && (actualResponse.headers === null || typeof actualResponse.headers !== "object")) {
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
function looksLikeKeyTypo(key, allowed) {
  const lower = key.toLowerCase();
  return allowed.some((candidate) => {
    const target = candidate.toLowerCase();
    return target === lower || editDistance(lower, target) <= 1;
  });
}
var HTTP_STEP_KEYS = contract.scenario.stepKeys.filter((key) => key !== "name" && key !== "adapter" && key !== "always");
function normalizeTags(tags, label) {
  if (tags === void 0) return [];
  invariant(Array.isArray(tags), `${label}\u7684 tags \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\u6570\u7EC4`);
  const normalized = tags.map((tag, index) => {
    invariant(nonEmptyString(tag), `${label}\u7684 tags \u7B2C ${index + 1} \u9879\u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32`);
    return tag.trim();
  });
  return [...new Set(normalized)];
}
function unknownKeysMessage(label, unknownKeys, allowed, hint = "") {
  return `${label} \u5305\u542B\u672A\u77E5\u952E ${unknownKeys.map((key) => `"${key}"`).join(", ")}\uFF0C\u5141\u8BB8\u7684\u952E\u4E3A ${allowed.join("/")}${hint}`;
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
  const scenarioTags = normalizeTags(input.tags, `\u573A\u666F ${input.name}`);
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
    if (step.request !== void 0) {
      invariant(
        isPlainObject(step.request),
        `\u6B65\u9AA4 ${step.name} \u7684 request \u5FC5\u987B\u662F\u5BF9\u8C61\uFF08\u5F53\u524D ${JSON.stringify(step.request)}\uFF0C\u975E\u5BF9\u8C61\u4F1A\u5728\u8FD0\u884C\u671F\u88AB\u9759\u9ED8\u5FFD\u7565\uFF09`
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
      const unknownRetryKeys = describeUnknownKeys(step.retryUntil, contract.scenario.retryUntilKeys);
      invariant(
        unknownRetryKeys.length === 0,
        `\u6B65\u9AA4 ${step.name} \u7684 retryUntil \u5305\u542B\u672A\u77E5\u952E ${unknownRetryKeys.map((key) => `"${key}"`).join(", ")}\uFF0C\u5141\u8BB8\u7684\u952E\u4E3A ${contract.scenario.retryUntilKeys.join("/")}`
      );
      const maxAttempts = Number(step.retryUntil.maxAttempts ?? 10);
      const intervalMs = Number(step.retryUntil.intervalMs ?? 2e3);
      const maxElapsedMs = Number(step.retryUntil.maxElapsedMs ?? 3e5);
      invariant(Number.isInteger(maxAttempts) && maxAttempts >= 1, `\u6B65\u9AA4 ${step.name} \u7684 maxAttempts \u5FC5\u987B\u662F\u6B63\u6574\u6570`);
      invariant(Number.isFinite(intervalMs) && intervalMs >= 0, `\u6B65\u9AA4 ${step.name} \u7684 intervalMs \u4E0D\u80FD\u4E3A\u8D1F\u6570`);
      invariant(Number.isFinite(maxElapsedMs) && maxElapsedMs > 0, `\u6B65\u9AA4 ${step.name} \u7684 maxElapsedMs \u5FC5\u987B\u662F\u6B63\u6570`);
      if (step.retryUntil.intervalFactor !== void 0) {
        const factor = Number(step.retryUntil.intervalFactor);
        invariant(Number.isFinite(factor) && factor >= 1, `\u6B65\u9AA4 ${step.name} \u7684 intervalFactor \u5FC5\u987B\u662F \u22651 \u7684\u6709\u9650\u6570\u5B57`);
      }
      if (step.retryUntil.maxIntervalMs !== void 0) {
        const maxIntervalMs = Number(step.retryUntil.maxIntervalMs);
        invariant(Number.isFinite(maxIntervalMs) && maxIntervalMs > 0, `\u6B65\u9AA4 ${step.name} \u7684 maxIntervalMs \u5FC5\u987B\u662F\u6B63\u6570`);
        invariant(
          maxIntervalMs >= intervalMs,
          `\u6B65\u9AA4 ${step.name} \u7684 maxIntervalMs\uFF08${maxIntervalMs}\uFF09\u4E0D\u80FD\u5C0F\u4E8E intervalMs\uFF08${intervalMs}\uFF09`
        );
      }
    }
    if (step.always !== void 0) {
      invariant(typeof step.always === "boolean", `\u6B65\u9AA4 ${step.name} \u7684 always \u5FC5\u987B\u662F\u5E03\u5C14\u503C`);
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
        if (item.scope !== void 0) {
          invariant(
            contract.extract.scopes.includes(item.scope),
            `${label} \u7684 scope \u53EA\u652F\u6301 ${contract.extract.scopes.join("/")}\uFF08\u5F53\u524D ${JSON.stringify(item.scope)}\uFF1B\u7F3A\u7701 step \u4EC5\u5F53\u524D\u573A\u666F\u53EF\u89C1\uFF09`
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
  });
  const failurePolicy = input.failurePolicy || "stop";
  invariant(contract.scenario.failurePolicies.includes(failurePolicy), "failurePolicy \u53EA\u80FD\u662F stop \u6216 continue");
  return { ...input, failurePolicy, tags: scenarioTags, steps: [...input.steps] };
}
function defineConfig(input) {
  invariant(isPlainObject(input), "\u914D\u7F6E\u5FC5\u987B\u662F\u5BF9\u8C61");
  assertTemplatePathsOnly(input, "\u914D\u7F6E");
  const globals = normalizeGlobals(input.globals, "\u5168\u5C40");
  const envs = Array.isArray(input.envs) ? input.envs.map((env) => {
    invariant(isPlainObject(env), "\u6BCF\u4E2A\u73AF\u5883\u5FC5\u987B\u662F\u5BF9\u8C61");
    if (env.vars !== void 0) {
      invariant(isPlainObject(env.vars), `\u73AF\u5883 ${env.key || "(\u672A\u547D\u540D)"} \u7684 vars \u5FC5\u987B\u662F\u5BF9\u8C61`);
      assertNoReservedVars(env.vars, `\u73AF\u5883 ${env.key || "(\u672A\u547D\u540D)"} \u7684 vars`);
    }
    return {
      ...env,
      globals: normalizeGlobals(env.globals, `\u73AF\u5883 ${env.key} \u7684`),
      vars: env.vars ? { ...env.vars } : {}
    };
  }) : [];
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
    return { ...entry, id, name: entry.name || id, url, tags: normalizeTags(entry.tags, `\u573A\u666F ${id}`) };
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
    applyGeneratedVar(definition, vars, identifiers, { now: options.now });
  }
  return vars;
}
function createRuntime(scenario, options = {}) {
  const config = options.config || {};
  const suiteVars = isPlainObject(options.suiteVars) ? options.suiteVars : {};
  const runtime = {
    vars: buildGeneratedVars(
      scenario,
      { ...suiteVars, ...config.vars || {}, ...options.vars || {} },
      options.environmentVariables || {},
      { now: options.now }
    ),
    suiteVars,
    lastResponse: null,
    lastResponseBody: null,
    // 每个运行时独立 Cookie Jar（#65）：不落盘、不跨场景共享；未开启时不会写入
    cookieJar: []
  };
  return runtime;
}
function collectStepMissingVars(step, runtime, missing) {
  collectMissingTemplateVars(step.path, runtime.vars, missing);
  collectMissingTemplateVars(step.params, runtime.vars, missing);
  collectMissingTemplateVars(step.request, runtime.vars, missing);
  collectMissingTemplateVars(step.when, runtime.vars, missing);
  collectMissingTemplateVars(step.assertions, runtime.vars, missing);
  collectMissingTemplateVars(step.extract, runtime.vars, missing);
  collectMissingTemplateVars(step.saveResponseAs, runtime.vars, missing);
  return missing;
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
var SET_COOKIES = Symbol("scenario-test.setCookies");
function defaultCookiePath(pathname) {
  const index = String(pathname || "/").lastIndexOf("/");
  if (index <= 0) return "/";
  return String(pathname).slice(0, index) || "/";
}
function parseSetCookie(line, requestUrl) {
  const text = String(line || "").trim();
  if (!text) return null;
  const parts = text.split(";");
  const pair = parts.shift() || "";
  const separator = pair.indexOf("=");
  if (separator <= 0) return null;
  const cookie = {
    name: pair.slice(0, separator).trim(),
    value: pair.slice(separator + 1).trim(),
    domain: requestUrl.hostname.toLowerCase(),
    path: defaultCookiePath(requestUrl.pathname),
    expiresAt: Infinity,
    secure: false
  };
  for (const attribute of parts) {
    const eq = attribute.indexOf("=");
    const key = (eq >= 0 ? attribute.slice(0, eq) : attribute).trim().toLowerCase();
    const value = eq >= 0 ? attribute.slice(eq + 1).trim() : "";
    if (key === "domain" && value) cookie.domain = value.replace(/^\./, "").toLowerCase();
    else if (key === "path" && value.startsWith("/")) cookie.path = value;
    else if (key === "max-age") {
      const seconds2 = Number(value);
      if (Number.isFinite(seconds2)) cookie.expiresAt = Date.now() + seconds2 * 1e3;
    } else if (key === "expires") {
      const timestamp = Date.parse(value);
      if (Number.isFinite(timestamp)) cookie.expiresAt = timestamp;
    } else if (key === "secure") cookie.secure = true;
  }
  return cookie;
}
function hostMatchesCookie(hostname, domain) {
  const host = String(hostname || "").toLowerCase();
  return host === domain || host.endsWith(`.${domain}`);
}
function pathMatchesCookie(pathname, cookiePath) {
  if (pathname === cookiePath) return true;
  const prefix = cookiePath.endsWith("/") ? cookiePath : `${cookiePath}/`;
  return pathname.startsWith(prefix);
}
function activeJarCookies(jar, url) {
  return (jar || []).filter((cookie) => cookie.expiresAt > Date.now() && hostMatchesCookie(url.hostname, cookie.domain) && pathMatchesCookie(url.pathname || "/", cookie.path) && (!cookie.secure || url.protocol === "https:"));
}
function storeSetCookies(runtime, lines, requestUrl) {
  if (!lines || !lines.length) return;
  if (!Array.isArray(runtime.cookieJar)) runtime.cookieJar = [];
  for (const line of lines) {
    const cookie = parseSetCookie(line, requestUrl);
    if (!cookie) continue;
    runtime.cookieJar = runtime.cookieJar.filter((item) => !(item.name === cookie.name && item.domain === cookie.domain && item.path === cookie.path));
    if (cookie.expiresAt > Date.now()) runtime.cookieJar.push(cookie);
  }
}
function applyCookieJar(headers, runtime, url) {
  const explicitKey = Object.keys(headers).find((key) => key.toLowerCase() === "cookie");
  const explicitText = explicitKey ? String(headers[explicitKey] || "") : "";
  const explicitNames = new Set(explicitText.split(";").map((pair) => pair.split("=")[0].trim().toLowerCase()).filter(Boolean));
  const jarText = activeJarCookies(runtime.cookieJar, url).filter((cookie) => !explicitNames.has(cookie.name.toLowerCase())).map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  if (!jarText) return;
  if (explicitKey) headers[explicitKey] = `${jarText}; ${explicitText}`;
  else headers.Cookie = jarText;
}
async function readResponse(response, step, io, runtime, signal) {
  const headers = headersToObject(response.headers);
  const contentType2 = String(headers["content-type"] || "");
  const setCookies = typeof response.headers?.getSetCookie === "function" ? response.headers.getSetCookie() : headers["set-cookie"] ? [headers["set-cookie"]] : [];
  const chunks = await readBodyChunks(response, signal);
  if (step.saveResponseAs && io?.saveResponse) {
    const data = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.length;
    }
    const saved = await io.saveResponse(resolveString(step.saveResponseAs, runtime), data, { contentType: contentType2, headers });
    const savedResponse = { status: response.status, headers, body: saved, bodyText: null };
    if (setCookies.length) savedResponse[SET_COOKIES] = setCookies;
    return savedResponse;
  }
  const decoder = decoderForContentType(contentType2);
  const bodyText = chunks.map((chunk) => decoder.decode(chunk, { stream: true })).join("") + decoder.decode();
  const responseData = { status: response.status, headers, body: parseBody(bodyText, contentType2), bodyText };
  if (setCookies.length) responseData[SET_COOKIES] = setCookies;
  return responseData;
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
    const existingKeys = /* @__PURE__ */ new Set();
    const queryIndex = requestPath.indexOf("?");
    if (queryIndex >= 0) {
      for (const pair of requestPath.slice(queryIndex + 1).split("&")) {
        const key = pair.split("=")[0];
        if (key) existingKeys.add(decodeURIComponent(key));
      }
    }
    const queryParts = [];
    for (const global of globals) {
      if (global.type !== "query" || existingKeys.has(global.name)) continue;
      queryParts.push(...queryPairs(global.name, resolve(global.value, runtime)));
    }
    if (queryParts.length) requestPath = `${requestPath}${queryIndex >= 0 ? "&" : "?"}${queryParts.join("&")}`;
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
  const requestUrl = joinUrl(options.baseUrl, requestPath);
  let parsedRequestUrl = null;
  if (options.cookieJar) {
    try {
      parsedRequestUrl = new URL(requestUrl);
    } catch {
      parsedRequestUrl = null;
    }
    if (parsedRequestUrl) applyCookieJar(headers, runtime, parsedRequestUrl);
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
    const response = await options.fetch(requestUrl, fetchOptions);
    const responseData = await readResponse(response, step, options.io, runtime, requestSignal.signal);
    if (options.cookieJar && parsedRequestUrl) {
      storeSetCookies(runtime, responseData[SET_COOKIES], parsedRequestUrl);
    }
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
function raceWithSignal(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortReason(signal));
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
  const request = isPlainObject(step.request) ? step.request : {};
  const rawTimeoutMs = Number(step.timeoutMs || request.timeoutMs || options.requestTimeoutMs || 3e4);
  const timeoutMs = Number.isFinite(rawTimeoutMs) && rawTimeoutMs > 0 ? rawTimeoutMs : 3e4;
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
    if (step.when !== void 0) {
      const shouldRun = evaluateWhen(step.when, runtime, { stepName: step.name });
      if (!shouldRun) {
        const missing = collectMissingTemplateVars(step.when, runtime.vars, /* @__PURE__ */ new Set());
        return {
          name: step.name || "\u672A\u547D\u540D\u6B65\u9AA4",
          method: "SKIP",
          path: resolveString(step.path || "", runtime),
          status: "SKIPPED",
          duration: now() - startedAt,
          passed: true,
          skipped: true,
          always: step.always === true,
          error: "",
          warnings: missingTemplateVarWarnings(missing),
          assertions: [],
          request: null,
          response: null
        };
      }
    }
    let lastExecution;
    let assertions = [];
    let stepWarnings = [];
    const missingVars = /* @__PURE__ */ new Set();
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
        collectStepMissingVars(step, runtime, missingVars);
        const selection = chooseAdapter(step, adapters);
        const attemptStartedAt = now();
        lastExecution = selection ? await executeAdapter(selection.adapter, selection.name, step, runtime, options) : await executeHttp(step, runtime, options);
        if (lastExecution.response && typeof lastExecution.response === "object" && lastExecution.response.durationMs === void 0) {
          lastExecution.response.durationMs = now() - attemptStartedAt;
        }
        runtime.lastResponse = lastExecution.response;
        runtime.lastResponseBody = lastExecution.response.body;
        const extractResult = applyExtract(step, lastExecution.response, runtime);
        stepWarnings = [...missingTemplateVarWarnings(missingVars), ...extractResult.warnings];
        assertions = buildAssertions(step, lastExecution.response, runtime, { stepName: step.name });
        if (extractResult.failures.length) assertions.push(...extractResult.failures);
        if (assertions.every((item) => item.passed) || attempt === totalAttempts) break;
        const rawIntervalMs = Number(retry.intervalMs);
        const baseIntervalMs = Math.max(100, Number.isFinite(rawIntervalMs) ? rawIntervalMs : 2e3);
        const factor = Number(retry.intervalFactor);
        const maxIntervalMs = Number(retry.maxIntervalMs);
        const backoff = Number.isFinite(factor) && factor >= 1 ? factor ** (attempt - 1) : 1;
        const intervalMs = Math.max(100, Math.min(
          baseIntervalMs * backoff,
          Number.isFinite(maxIntervalMs) && maxIntervalMs > 0 ? maxIntervalMs : Number.POSITIVE_INFINITY
        ));
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
        always: step.always === true,
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
      const path10 = context && context.path || resolveString(step.path || "", runtime);
      return {
        name: step.name || "\u672A\u547D\u540D\u6B65\u9AA4",
        method,
        path: path10,
        status: cancelled ? "CANCELLED" : timedOut ? "TIMEOUT" : "ERROR",
        duration: now() - startedAt,
        passed: false,
        always: step.always === true,
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
      environmentVariables: runOptions.environmentVariables || engineOptions.environmentVariables,
      suiteVars: runOptions.suiteVars || engineOptions.suiteVars,
      now: runOptions.now || engineOptions.now
    });
    const results = [];
    let halted = false;
    for (let index = 0; index < scenario.steps.length; index += 1) {
      const step = scenario.steps[index];
      if (halted && step.always !== true) {
        if (runOptions.signal?.aborted) break;
        const skipped2 = {
          name: step.name || "\u672A\u547D\u540D\u6B65\u9AA4",
          method: "SKIP",
          path: "",
          status: "SKIPPED",
          duration: 0,
          passed: true,
          skipped: true,
          error: "",
          warnings: ["\u524D\u7F6E\u6B65\u9AA4\u5931\u8D25\uFF08failurePolicy: stop\uFF09\uFF0C\u975E always \u6B65\u9AA4\u672A\u6267\u884C"],
          assertions: [],
          request: null,
          response: null,
          stepNo: index + 1
        };
        results.push(skipped2);
        try {
          await (runOptions.onStep ?? engineOptions.onStep)?.(skipped2, index, runtime);
        } catch (hookError) {
          skipped2.passed = false;
          skipped2.skipped = false;
          skipped2.status = "ERROR";
          skipped2.error = `onStep \u56DE\u8C03\u629B\u9519: ${hookError?.message || hookError}`;
        }
        continue;
      }
      const result = await runStep(step, runtime, { ...runOptions, config });
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
      if (!result.passed && scenario.failurePolicy !== "continue") halted = true;
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
      // 取消导致未进入循环的剩余步骤（供 JUnit/报告标注）
      unexecuted: scenario.steps.slice(results.length).map((step) => step.name || "\u672A\u547D\u540D\u6B65\u9AA4"),
      vars: runtime.vars,
      suiteVars: { ...runtime.suiteVars || {} }
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
      numericOperators: [...assertions.numericOperators],
      ...assertions.shape ? { shape: { keys: [...assertions.shape.keys], types: [...assertions.shape.types] } } : {}
    },
    when: {
      sources: [...when.sources],
      targets: [...when.targets || []],
      note: when.note
    },
    extract: {
      metaKeys: [...extract.metaKeys || []],
      from: [...extract.from],
      scopes: [...extract.scopes || []],
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
      manual: { ...config.manual },
      tags: { ...config.tags || {} }
    },
    scenario: {
      keys: [...scenario.keys],
      stepKeys: [...scenario.stepKeys],
      failurePolicies: [...scenario.failurePolicies],
      retryUntilKeys: [...scenario.retryUntilKeys || []],
      ...scenario.note ? { note: scenario.note } : {}
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
  if (capabilities.extract.scopes?.length) {
    lines.push(`  \u63D0\u53D6\u4F5C\u7528\u57DF scope: ${capabilities.extract.scopes.join(" / ")}\uFF08suite \u5199\u5165\u672C\u6B21 run \u5171\u4EAB\u53D8\u91CF\uFF09`);
  }
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
  if (capabilities.scenario.retryUntilKeys?.length) {
    lines.push(`retryUntil \u5B57\u6BB5: ${capabilities.scenario.retryUntilKeys.join(" / ")}`);
  }
  if (capabilities.scenario.note) lines.push(`  ${capabilities.scenario.note}`);
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
3. \u5728 \`scenario.config.js\` \u7EF4\u62A4 \`envs\`\u3001\`vars\`\u3001\`variables\` \u548C \`scenarios\`\u3002\u79C1\u6709\u9879\u76EE\u53EF\u5728 \`vars\` \u4FDD\u5B58\u8054\u8C03\u51ED\u636E\uFF1B\`variables\` \u53EA\u58F0\u660E\u6807\u7B7E\u3001\`required\` \u4E0E\u53EF\u9009 \`env\` \u6620\u5C04\u3002\u6E90\u7801\u80FD\u786E\u8BA4\u8BF7\u6C42\u5B57\u6BB5\u4F46\u4E0D\u80FD\u786E\u8BA4\u5FC5\u586B\u53D6\u503C\u65F6\uFF0C\u5728\u914D\u7F6E \`vars\` \u4E2D\u7559\u7A7A\uFF0C\u5E76\u5728 \`variables\` \u4E2D\u58F0\u660E\u4E3A \`required: true\`\uFF1B\u573A\u666F\u53EA\u5F15\u7528\u8BE5\u53D8\u91CF\uFF0C\u7981\u6B62\u586B\u5165\u731C\u6D4B\u503C\u6216\u6D4B\u8BD5\u6807\u8BB0\u3002\u4E34\u65F6\u8054\u8C03\u53EF\u7528 \`--vars key=value\`\uFF08\u53EF\u91CD\u590D\uFF0C\u4F18\u5148\u7EA7\u6700\u9AD8\uFF0C\u503C\u652F\u6301 \`{{ }}\` \u6A21\u677F\uFF09\u8986\u76D6\u914D\u7F6E\u53D8\u91CF\uFF0C\u7528 \`--timeout <ms>\` \u8986\u76D6\u914D\u7F6E \`requestTimeoutMs\`\uFF0C\u4E0D\u5FC5\u590D\u5236\u6216\u4FEE\u6539\u914D\u7F6E\u3002
4. \u5148\u53C2\u7167 \`SCENARIO_PATTERNS.md\` \u7684\u6B65\u9AA4\u7EC4\u5408\u6A21\u5F0F\uFF0C\u518D\u6309\u672C\u9879\u76EE\u8BC1\u636E\u66FF\u6362\u8DEF\u5F84\u3001\u5B57\u6BB5\u548C\u54CD\u5E94\u65AD\u8A00\uFF1B\u6A21\u5F0F\u4E2D\u7684\u5C16\u62EC\u53F7\u5360\u4F4D\u5185\u5BB9\u4E0D\u5F97\u76F4\u63A5\u5199\u5165\u573A\u666F\u3002\u573A\u666F\u5FC5\u987B\u4F7F\u7528 \`ScenarioTest.registerScenario(id, ScenarioTest.defineScenario({...}))\`\uFF0C\u914D\u7F6E\u4E2D\u7684\u573A\u666F id\u3001\u6587\u4EF6\u6CE8\u518C id \u5FC5\u987B\u4E00\u81F4\u3002
5. \u6BCF\u4E00\u6B65\u5199 \`name\`\u3001\`method\`\u3001\`path\`\u3001\`status\`\uFF0C\u5E76\u4E3A\u5173\u952E\u4E1A\u52A1\u7ED3\u679C\u5199 \`assertions\`\u3002Query \u53C2\u6570\u53EA\u80FD\u5199\u5728\u6B65\u9AA4\u9876\u5C42 \`params\`\uFF0C\u4E0D\u80FD\u5199\u6210 \`request.params\`\uFF1BGET/HEAD \u4E0D\u80FD\u643A\u5E26\u8BF7\u6C42\u4F53\uFF08\`request.body\`\u3001\`request.fileUpload\` \u5B9A\u4E49\u671F\u5373\u88AB\u62D2\uFF09\uFF0C\u8BF7\u6C42\u53C2\u6570\u4E00\u5F8B\u653E \`params\`\u3002\u7528 \`extract\` \u4FDD\u5B58\u54CD\u5E94 ID\u3001Token \u6216\u72B6\u6001\uFF0C\u518D\u7528 \`{{vars.name}}\` \u4E32\u8054\u540E\u7EED\u6B65\u9AA4\uFF1B\`scope: "suite"\` \u7684\u63D0\u53D6\u503C\u4F1A\u5728\u672C\u6B21 run \u7684\u540E\u7EED\u573A\u666F\u53EF\u89C1\uFF08\u767B\u5F55 token \u590D\u7528\uFF09\u3002\`from: "headers"\` \u7684 path \u9996\u6BB5\u6309\u5934\u540D\u5927\u5C0F\u5199\u4E0D\u654F\u611F\u5339\u914D\uFF08\u4EFB\u610F\u5927\u5C0F\u5199\u547D\u4E2D\u540C\u4E00\u54CD\u5E94\u5934\uFF0C\u65E0\u9700\u4E3A\u5927\u5C0F\u5199\u53D8\u4F53\u91CD\u590D\u914D\u7F6E\uFF09\uFF0C\u9996\u6BB5\u4E4B\u540E\u7684\u5B50\u8DEF\u5F84\u5728\u5934\u503C\u4E0A\u53D6\u3002\u65AD\u8A00\u64CD\u4F5C\u7B26\uFF1A${OPERATORS_BACKTICK}\uFF1B\u7ED3\u6784\u6821\u9A8C\u7528 \`shape: { type: "object", required: [...], properties: {...} }\`\uFF08jsonSchema-lite\uFF0C\u5931\u8D25\u5B9A\u4F4D\u5230\u5B57\u6BB5\u8DEF\u5F84\uFF09\uFF0C\u6570\u503C\u6BD4\u8F83\uFF08\u5982\u603B\u6570\u5B57\u6BB5\u4E0D\u5C11\u4E8E 5\uFF09\u7528 \`gte: 5\`\uFF08\u4EC5\u6570\u5B57\u4E0D\u505A\u5B57\u7B26\u4E32\u8F6C\u6362\uFF09\uFF0C\u5217\u8868\u6761\u6570/\u5B57\u7B26\u4E32\u957F\u5EA6/\u5BF9\u8C61\u952E\u6570\u7528 \`length: N\`\uFF08\u6570\u7EC4\u5143\u7D20\u6570\u3001\u5B57\u7B26\u4E32\u5B57\u7B26\u6570\u3001\u5BF9\u8C61\u952E\u6570\uFF0C\u975E\u5BB9\u5668\u7C7B\u578B\u76F4\u63A5\u5931\u8D25\uFF09\uFF0C"\u975E\u8D1F\u6574\u6570"\u8FD9\u7C7B\u683C\u5F0F\u6821\u9A8C\u7528 \`matches: "^\\\\d+$"\`\uFF0C\u63A5\u53E3\u8017\u65F6\u4E0A\u9650\u7528 \`{ target: "duration", lte: 800 }\`\uFF08\u6BEB\u79D2\uFF0C\u5355\u6B21\u8BF7\u6C42\u8017\u65F6\uFF09\u3002\`extract\` \u9879\u53EF\u52A0 \`required: true\`\uFF0C\u8DEF\u5F84\u4E0D\u5B58\u5728\u65F6\u8BE5\u6B65\u9AA4\u5931\u8D25\uFF1B\u53EF\u52A0 \`default\` \u7ED9\u53EF\u9009\u5B57\u6BB5\u58F0\u660E\u515C\u5E95\u503C\uFF08\u652F\u6301\u6A21\u677F\uFF0C\u4E0E required \u4E92\u65A5\uFF0C\u58F0\u660E\u540E\u7F3A\u5931\u4E0D\u4EA7\u751F warning\uFF09\u3002\u8DEF\u5F84\u4E2D\u7684\u6570\u7EC4\u4E0B\u6807\u652F\u6301\u8D1F\u6570\u53D6\u5012\u6570\u9879\uFF08\u5982 \`records[-1]\` \u4E3A\u672B\u9879\uFF0C\`records[-2]\` \u4E3A\u5012\u6570\u7B2C\u4E8C\u9879\uFF09\u3002\`when\` \u5BF9\u8C61\u5F62\u5F0F\u6765\u6E90\u4E3A \`from: "vars"\`\uFF08\u5DF2\u63D0\u53D6\u53D8\u91CF\uFF09\u3001\`from: "lastResponse"\`\uFF08\u4E0A\u4E00\u6B65\u54CD\u5E94 body\uFF0Cpath \u5B50\u8DEF\u5F84\u53D6\u503C\u540C extract from:"body"\uFF09\u6216 \`from: "status"\`\uFF08\u4E0A\u4E00\u6B65 HTTP \u72B6\u6001\u7801\uFF0C\u6570\u503C\uFF09\uFF0C\u4E5F\u53EF\u7528 \`target: "status"\` \u8BFB\u4E0A\u4E00\u6B65\u72B6\u6001\u7801\uFF1B\u7B2C\u4E00\u6B65\u65E0\u4E0A\u4E00\u6B65\u54CD\u5E94\u65F6\u6309\u6765\u6E90\u7F3A\u5931\u5904\u7406\u3001\u6761\u4EF6\u4E0D\u6210\u7ACB\uFF0C\u4E0D\u4E2D\u65AD\u573A\u666F\u3002\u6A21\u677F \`{{ }}\` \u53EA\u505A\u8DEF\u5F84\u53D6\u503C\uFF0C\u4E0D\u652F\u6301\u6BD4\u8F83\u3001\u4E09\u5143\u3001\u903B\u8F91\u8FD0\u7B97\u6216\u51FD\u6570\u8C03\u7528\uFF08\u5982 \`{{vars.a > 0}}\` \u5B9A\u4E49\u671F\u5373\u88AB\u62D2\uFF09\uFF0C\u6761\u4EF6\u5224\u65AD\u7528 \`assertions\` \u6216 \`when\` \u5BF9\u8C61\u5F62\u5F0F\u3002
6. \u8BA4\u8BC1\u662F\u666E\u901A\u9879\u76EE\u6B65\u9AA4\uFF1A\u786E\u8BA4\u767B\u5F55\u63A5\u53E3\u65F6\u5148\u767B\u5F55\u5E76\u63D0\u53D6 Token\uFF1B\u65E0\u6CD5\u786E\u8BA4\u65F6\u4EC5\u58F0\u660E\u53D8\u91CF\u5E76\u5728\u5177\u4F53 Header\u3001Query \u6216 Body \u4E2D\u5F15\u7528\uFF0C\u4E0D\u865A\u6784\u6846\u67B6\u7EA7\u8BA4\u8BC1\u3002\u6D4F\u89C8\u5668 Cookie \u4F1A\u8BDD\u5FC5\u987B\u6709\u9879\u76EE\u8BC1\u636E\u5E76\u663E\u5F0F\u8BBE\u7F6E request.credentials \u4E3A include\uFF1BCLI \u9700\u8981\u81EA\u52A8\u7EF4\u6301\u4F1A\u8BDD\u65F6\u53EF\u52A0 \`run --cookie-jar\`\uFF08\u5355\u573A\u666F\u5185\u5B58 Jar\uFF0C\u4E0D\u843D\u76D8\uFF09\u3002
7. \`runId\` \u548C \`runNo\` \u662F\u6BCF\u6B21\u6267\u884C\u81EA\u52A8\u751F\u6210\u7684\u5185\u7F6E\u53D8\u91CF\uFF0C\u7981\u6B62\u5728\u914D\u7F6E vars\u3001\u573A\u666F vars\u3001envVars\u3001generatedVars \u6216 extract \u4E2D\u91CD\u65B0\u5B9A\u4E49\u6216\u8986\u76D6\u3002\u5199\u5165\u573A\u666F\u4F7F\u7528 \`scenario-{{vars.runNo}}\` \u7B49\u6D4B\u8BD5\u6807\u8BB0\u3002\u6E05\u7406\u53EA\u80FD\u6309\u521A\u63D0\u53D6\u7684 ID \u6216\u6D4B\u8BD5\u6807\u8BB0\u7CBE\u786E\u5B9A\u4F4D\uFF0C\u5E76\u7528 \`when\` \u9632\u6B62\u7A7A\u503C\u5220\u9664\uFF1B\u65E0\u6CD5\u786E\u8BA4\u5B89\u5168\u6E05\u7406\u6761\u4EF6\u65F6\u4E0D\u751F\u6210\u5220\u9664\u6B65\u9AA4\u3002 \u9700\u8981\u552F\u4E00\u8BC1\u4EF6/\u5361\u53F7/\u53F7\u7801\u7684\u6D4B\u8BD5\u6570\u636E\uFF08\u8EAB\u4EFD\u8BC1\u53F7\u3001\u94F6\u884C\u5361\u53F7\u3001\u624B\u673A\u53F7\u3001\u7EDF\u4E00\u793E\u4F1A\u4FE1\u7528\u4EE3\u7801\u7B49\u5E26\u683C\u5F0F\u6216\u6821\u9A8C\u4F4D\u7EA6\u675F\u7684\u5B57\u6BB5\uFF09\u7528 \`generatedVars\` \u6309\u8F6E\u6B21\u751F\u6210\uFF1A\`idcard\`\uFF08\u58F0\u660E birthDate \u4E0E gender\uFF09\u3001\`luhn\`\uFF08\u53EF\u9009 length/prefix\uFF09\u3001\`phone\`\uFF08\u53EF\u9009 prefix\uFF09\u3001\`uscc\`\uFF08\u53EF\u9009 regionCode\uFF09\uFF0C\u7981\u6B62\u5199\u6B7B\u56FA\u5B9A\u6216\u771F\u5B9E\u53F7\u7801\u5BFC\u81F4\u91CD\u8DD1\u649E\u552F\u4E00\u6027\u3002 \u65F6\u95F4\u7A97/\u8FC7\u671F\u7C7B\u53C2\u6570\uFF08startTime\u3001expiredAt \u7B49\uFF09\u7528 \`timestamp\` \u7C7B\u578B\u76F8\u5BF9\u5F53\u524D\u65F6\u95F4\u751F\u6210\uFF1A\`offset\`\uFF08\u5982 "-7d"\u3001"+8d"\uFF0C\u6570\u5B57+\u5355\u4F4D ms/s/m/h/d/w\uFF09\u3001\`unit: 's'\` \u79D2\u7EA7\u6570\u503C\u3001\`format: 'YYYY-MM-DD HH:mm:ss'\` \u672C\u5730\u65F6\u95F4\u5B57\u7B26\u4E32\uFF08format \u4E0E unit \u4E92\u65A5\uFF09\uFF0C\u7981\u6B62\u5916\u90E8\u811A\u672C\u62FC\u503C\u6216\u5199\u6B7B\u8FC7\u671F\u65F6\u95F4\u3002\u4E1A\u52A1\u4E3B\u952E\u4E3A UUID \u7684\u5B57\u6BB5\u7528 \`uuid\` \u7C7B\u578B\uFF08\u5E26\u8FDE\u5B57\u7B26\u6807\u51C6\u5F62\u6001\uFF09\uFF0C\u65E0\u8FDE\u5B57\u7B26 32 \u4F4D\u7528 \`uuidHex\`\u3002\u6E20\u9053\u3001\u72B6\u6001\u7B49\u679A\u4E3E\u7C7B\u53C2\u6570\u9700\u8981\u968F\u673A\u4F46\u53EF\u590D\u73B0\u7684\u53D6\u503C\u65F6\u7528 \`enum\` \u7C7B\u578B\uFF1A\`values\` \u5019\u9009\u6570\u7EC4 + \u53EF\u9009 \`weights\` \u975E\u8D1F\u6743\u91CD\uFF08\u7F3A\u7701\u7B49\u6743\uFF0C\u6743\u91CD\u4E3A 0 \u7684\u5019\u9009\u6C38\u4E0D\u88AB\u9009\u4E2D\uFF09\uFF0C\u6309\u8F6E\u6B21\u786E\u5B9A\u6027\u62BD\u53D6\uFF08\u8F6E\u5185\u7A33\u5B9A\u3001\u8DE8\u8F6E\u53D8\u5316\uFF09\uFF1B\u679A\u4E3E\u53D6\u503C\u5FC5\u987B\u6709\u9879\u76EE\u8BC1\u636E\uFF0C\u4E0D\u5F97\u51ED\u7A7A\u7F16\u9020\u5019\u9009\u3002
8. \u9ED8\u8BA4\u4FDD\u6301 \`failurePolicy: "stop"\`\u3002\u4E0D\u540C\u9A8C\u8BC1\u76EE\u6807\u62C6\u6210\u72EC\u7ACB\u573A\u666F\uFF1B\u53EA\u6709\u540C\u4E00\u9A8C\u8BC1\u8DEF\u5F84\u786E\u5B9E\u9700\u8981\u7EE7\u7EED\u6536\u96C6\u540E\u7EED\u6B65\u9AA4\u7ED3\u679C\u65F6\u624D\u8BBE\u7F6E \`failurePolicy: "continue"\`\u3002\u5199\u6570\u636E\u573A\u666F\u7684\u6E05\u7406\u6B65\u9AA4\u53EF\u58F0\u660E \`always: true\`\uFF1A\u524D\u7F6E\u666E\u901A\u6B65\u9AA4\u5931\u8D25\u540E\u4ECD\u4F1A\u6267\u884C\uFF08\u7528\u6237\u53D6\u6D88\u65F6\u4E0D\u6267\u884C\uFF09\u3002\u53EA\u6709\u5728\u5B8C\u6210\u72B6\u6001\u5B57\u6BB5\u548C\u7EC8\u6001\u503C\u90FD\u6709\u8BC1\u636E\u65F6\u624D\u4F7F\u7528 \`retryUntil\`\uFF0C\u4E14 assertions \u5FC5\u987B\u65AD\u8A00\u8BE5\u7EC8\u6001\u503C\uFF1B\u53EA\u65AD\u8A00\u5B57\u6BB5\u5B58\u5728\u4F1A\u7ACB\u5373\u901A\u8FC7\uFF0C\u7981\u6B62\u914D\u5408 \`retryUntil\`\u3002\u957F\u8F6E\u8BE2\u53EF\u7528 \`intervalFactor\`\uFF08\u22651\uFF09\u4E0E \`maxIntervalMs\` \u6307\u6570\u9000\u907F\u3002\u5B8C\u6210\u72B6\u6001\u672A\u77E5\u65F6\u6700\u591A\u751F\u6210\u4E00\u6B21\u72B6\u6001\u67E5\u8BE2\u3002\u4E0D\u8981\u5199\u56FA\u5B9A sleep\u3002
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
  `10. \u65AD\u8A00\u64CD\u4F5C\u7B26\uFF1A${OPERATORS_TEXT}\uFF1B\u7ED3\u6784\u6821\u9A8C\u7528 shape: { type: 'object', required: [...], properties: {...} }\uFF08jsonSchema-lite\uFF0C\u5931\u8D25\u5B9A\u4F4D\u5230\u5B57\u6BB5\u8DEF\u5F84\uFF09\uFF1B\u6570\u503C\u6BD4\u8F83\uFF08\u6761\u6570\u4E0D\u5C11\u4E8E N\uFF09\u7528 gte: N\uFF0C\u683C\u5F0F\u6821\u9A8C\uFF08\u975E\u8D1F\u6574\u6570\uFF09\u7528 matches: '^\\\\d+$'\uFF0C\u5217\u8868\u6761\u6570/\u5B57\u7B26\u4E32\u957F\u5EA6/\u5BF9\u8C61\u952E\u6570\u7528 length: N\uFF08\u6570\u7EC4\u5143\u7D20\u6570\u3001\u5B57\u7B26\u4E32\u5B57\u7B26\u6570\u3001\u5BF9\u8C61\u952E\u6570\uFF09\u3002\u63A5\u53E3\u8017\u65F6\u4E0A\u9650\u7528 { target: 'duration', lte: 800 }\uFF08\u6BEB\u79D2\uFF0C\u5355\u6B21\u8BF7\u6C42\u8017\u65F6\uFF09\u3002when \u5BF9\u8C61\u5F62\u5F0F\u6765\u6E90\u4E3A from: 'vars'\uFF08\u5DF2\u63D0\u53D6\u53D8\u91CF\uFF09\u3001from: 'lastResponse'\uFF08\u4E0A\u4E00\u6B65\u54CD\u5E94 body\uFF09\u6216 from: 'status'\uFF08\u4E0A\u4E00\u6B65 HTTP \u72B6\u6001\u7801\uFF09\uFF0C\u4E5F\u53EF\u7528 target: 'status' \u8BFB\u4E0A\u4E00\u6B65\u72B6\u6001\u7801\uFF1B\u7B2C\u4E00\u6B65\u65E0\u4E0A\u4E00\u6B65\u54CD\u5E94\u65F6\u6761\u4EF6\u4E0D\u6210\u7ACB\u3001\u4E0D\u4E2D\u65AD\u573A\u666F\u3002extract \u53EF\u52A0 required: true \u5F3A\u5236\u8DEF\u5F84\u5B58\u5728\uFF1Bscope: 'suite' \u7684\u63D0\u53D6\u503C\u4F9B\u672C\u6B21 run \u540E\u7EED\u573A\u666F\u590D\u7528\uFF08\u5982\u767B\u5F55 token\uFF09\u3002from: 'headers' \u914D path \u65F6\u9996\u6BB5\u5934\u540D\u6309\u5927\u5C0F\u5199\u4E0D\u654F\u611F\u5339\u914D\uFF08\u4E0E\u65AD\u8A00 from: 'headers'\u3001header \u7B80\u5199\u540C\u53E3\u5F84\uFF0C\u65E0\u9700\u4E3A\u5927\u5C0F\u5199\u53D8\u4F53\u91CD\u590D\u914D\u7F6E\uFF09\uFF0C\u9996\u6BB5\u540E\u7684\u5B50\u8DEF\u5F84\u5728\u5934\u503C\u4E0A\u53D6\u3002\u6A21\u677F {{ }} \u53EA\u505A\u8DEF\u5F84\u53D6\u503C\uFF0C\u4E0D\u652F\u6301\u6BD4\u8F83/\u4E09\u5143/\u903B\u8F91\u8FD0\u7B97/\u51FD\u6570\u8C03\u7528\uFF08\u5982 {{vars.a > 0}} \u5B9A\u4E49\u671F\u5373\u88AB\u62D2\uFF09\uFF0C\u6761\u4EF6\u5224\u65AD\u7528 assertions \u6216 when \u5BF9\u8C61\u5F62\u5F0F\u3002`,
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
  '\u8BA4\u8BC1\u4F4D\u4E8E Query\u3001Header \u6216 Body \u65F6\uFF0C\u76F4\u63A5\u5728 params\u3001request.headers \u6216 request.body \u5F15\u7528\u53D8\u91CF\u3002\u6D4F\u89C8\u5668 Cookie \u4F1A\u8BDD\u5FC5\u987B\u6709\u4EE3\u7801\u4F9D\u636E\u5E76\u663E\u5F0F\u8BBE\u7F6E request.credentials: "include"\uFF1BCLI \u9700\u8981\u81EA\u52A8\u767B\u5F55\u4F1A\u8BDD\u65F6\u53EF\u7528 run --cookie-jar\uFF08\u5355\u573A\u666F\u5185\u5B58 Jar\uFF09\u3002\u6CA1\u6709\u53EF\u786E\u8BA4\u767B\u5F55\u63A5\u53E3\u65F6\uFF0C\u53EA\u5728 vars \u548C variables \u4E2D\u58F0\u660E\u5DF2\u6709\u51ED\u636E\uFF0C\u4E0D\u80FD\u865A\u6784\u767B\u5F55\u6D41\u7A0B\u3002',
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

- \`envs\`\uFF1A\u73AF\u5883\u540D\u79F0\u548C\u63A5\u53E3\u57FA\u7840\u5730\u5740\u3002\u6BCF\u4E2A\u73AF\u5883\u5FC5\u987B\u6709\u552F\u4E00\u7684 \`key\`\uFF1B\u53EF\u58F0\u660E\u73AF\u5883\u7EA7 \`vars\`\uFF0C\u540C\u4E00\u4EFD\u914D\u7F6E\u5207\u6362\u73AF\u5883\u5373\u53EF\u6362\u79DF\u6237/\u8D26\u53F7\u3002
- \`globals\`\uFF1A\u5168\u5C40\u53C2\u6570\uFF0C\u8FFD\u52A0\u5230\u6BCF\u4E2A\u8BF7\u6C42\u3002\u652F\u6301 ${GLOBALS_TYPES_BACKTICK} \u4E09\u79CD\u7C7B\u578B\uFF0C\u53EF\u914D\u7F6E\u5728\u9876\u5C42\uFF08\u6240\u6709\u73AF\u5883\u751F\u6548\uFF09\u6216\u5355\u4E2A\u73AF\u5883\u5185\u3002\u503C\u652F\u6301 \`{{vars.xxx}}\` \u6A21\u677F\uFF1B\u6B65\u9AA4\u663E\u5F0F\u58F0\u660E\u7684\u540C\u540D\u53C2\u6570\u4F18\u5148\u4E8E\u5168\u5C40\u53C2\u6570\u3002CLI \u53EF\u7528 \`SCENARIO_GLOBALS\` \u73AF\u5883\u53D8\u91CF\uFF08JSON \u6570\u7EC4\uFF09\u8986\u76D6\uFF0C\u5982 \`[{"type":"header","name":"Authorization","value":"Bearer x"}]\`\u3002
- \`vars\`\uFF1A\u672C\u9879\u76EE\u542F\u52A8\u65F6\u4F7F\u7528\u7684\u9ED8\u8BA4\u53D8\u91CF\u3002\u79C1\u6709\u9879\u76EE\u53EF\u5728\u8FD9\u91CC\u4FDD\u5B58\u56E2\u961F\u8054\u8C03 Key\u3001Secret\u3001Token\u3001\u6D4B\u8BD5\u8D26\u53F7\u7B49\u3002
- \`variables\`\uFF1A\u9875\u9762\u4E0A\u9700\u8981\u5C55\u793A\u6216\u5141\u8BB8\u8986\u76D6\u7684\u53D8\u91CF\u5143\u6570\u636E\uFF0C\u5305\u62EC\u6807\u7B7E\u3001\u662F\u5426\u5FC5\u586B\uFF0C\u4EE5\u53CA\u53EF\u9009\u7684 CLI \u73AF\u5883\u53D8\u91CF\u540D\u3002\u5B9E\u9645\u9ED8\u8BA4\u503C\u4F18\u5148\u5199\u5728 \`vars\`\uFF0C\u4E0D\u8981\u91CD\u590D\u7EF4\u62A4\u3002
- \`scenarios\`\uFF1A\u573A\u666F id\u3001\u540D\u79F0\u548C\u5BF9\u5E94 JS \u6587\u4EF6\u5730\u5740\u3002\u9700\u8981\u4EBA\u5DE5\u524D\u7F6E\u6761\u4EF6\u6216\u5199\u6570\u636E\u7684\u573A\u666F\u53EF\u52A0 \`manual: true\`\uFF1A\`--all\` \u9ED8\u8BA4\u6392\u9664\uFF0C\`--scenario <id>\` \u53EF\u663E\u5F0F\u6267\u884C\u3002\u53EF\u52A0 \`tags: ["smoke"]\`\uFF0C\u7528 \`run --tag smoke\` \u7B5B\u9009\u6267\u884C\uFF08\u91CD\u590D\u53C2\u6570 OR\uFF0C\u9017\u53F7\u5206\u9694 AND\uFF1B\u4E0D\u4F1A\u81EA\u52A8\u653E\u884C manual \u573A\u666F\uFF09\u3002

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

\`CLI \u73AF\u5883\u53D8\u91CF / \u6D4F\u89C8\u5668\u9875\u9762\u8986\u76D6 > --vars > \u9009\u4E2D\u73AF\u5883 envs[].vars > scenario.config.js \u7684 vars > \u573A\u666F vars > variables[].defaultValue\`

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
- \u767B\u5F55\u3001\u6362 Token\u3001\u7B7E\u540D\u90FD\u6309\u666E\u901A\u6B65\u9AA4\u548C\u53D8\u91CF\u5B9E\u73B0\uFF1B\u6D4F\u89C8\u5668 Cookie \u4F1A\u8BDD\u663E\u5F0F\u4F7F\u7528 \`request.credentials: "include"\`\uFF0CCLI \u9700\u8981\u81EA\u52A8\u7EF4\u6301\u4F1A\u8BDD\u65F6\u53EF\u52A0 \`run --cookie-jar\`\uFF08\u5355\u573A\u666F\u5185\u5B58 Jar\uFF0C\u4E0D\u843D\u76D8\u3001\u4E0D\u8DE8\u573A\u666F\uFF09\u3002
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

\u4E34\u65F6\u8986\u76D6\u914D\u7F6E\u53D8\u91CF\u6216\u8BF7\u6C42\u8D85\u65F6\uFF0C\u65E0\u9700\u4FEE\u6539\u914D\u7F6E\u6587\u4EF6\uFF1A

\`\`\`powershell
node ${frameworkDisplay}scenario-test-cli.cjs run --config ${directory}/scenario.config.js --env local \`
  --vars clientId=temporary-client \`
  --vars "clientSecret={{vars.defaultSecret}}" \`
  --timeout 5000 --all
\`\`\`

\`--vars key=value\` \u53EF\u91CD\u590D\uFF0C\u6309\u51FA\u73B0\u987A\u5E8F\u53E0\u52A0\uFF08\u540C\u540D\u540E\u8005\u8986\u76D6\uFF09\uFF0C\u4F18\u5148\u7EA7\u9AD8\u4E8E\u914D\u7F6E \`vars\` \u4E0E\u73AF\u5883\u53D8\u91CF\uFF0C\u503C\u4E2D\u7684 \`{{ }}\` \u6A21\u677F\u7167\u5E38\u89E3\u6790\uFF1B\`--timeout <ms>\` \u8986\u76D6\u914D\u7F6E \`requestTimeoutMs\`\u3002\`runId\` / \`runNo\` \u662F\u4FDD\u7559\u53D8\u91CF\uFF0C\u4E0D\u80FD\u7528 \`--vars\` \u8986\u76D6\u3002

\u5E38\u7528\u6279\u91CF\u4E0E CI \u9009\u9879\uFF1A\`--tag smoke\`\uFF08\u6309\u6807\u7B7E\u7B5B\u9009\uFF09\u3001\`--bail\`\uFF08\u9996\u4E2A\u5931\u8D25\u573A\u666F\u540E\u505C\u6B62\uFF09\u3001\`--data <json|jsonl|csv>\`\uFF08\u6309\u884C\u53D8\u91CF\u96C6\u6267\u884C\uFF09\u3001\`--junit <file>\`\uFF08JUnit XML \u62A5\u544A\uFF09\u3001\`--cookie-jar\`\uFF08\u5355\u573A\u666F\u5185\u5B58 Cookie \u4F1A\u8BDD\uFF09\u3002\`serve --proxy-timeout <ms>\` \u53EF\u8C03\u5927\u540C\u6E90\u4EE3\u7406\u7684\u4E0A\u6E38\u7A7A\u95F2\u8D85\u65F6\uFF08\u9ED8\u8BA4 30 \u79D2\uFF0C\u4E0A\u9650 10 \u5206\u949F\uFF09\u3002

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

// src/utils/data-file.js
var import_node_fs6 = __toESM(require("node:fs"), 1);
var import_node_path6 = __toESM(require("node:path"), 1);
function isPlainObject2(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const source = String(text).replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  row.push(cell);
  rows.push(row);
  while (rows.length && rows[rows.length - 1].every((value) => value === "")) rows.pop();
  return rows;
}
function normalizeRows(rows, source) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`\u6570\u636E\u96C6\u4E3A\u7A7A\u6216\u4E0D\u662F\u6570\u7EC4: ${source}`);
  }
  rows.forEach((row, index) => {
    if (!isPlainObject2(row) || Array.isArray(row)) {
      throw new Error(`\u6570\u636E\u96C6\u7B2C ${index + 1} \u884C\u5FC5\u987B\u662F\u5BF9\u8C61\uFF08\u5F53\u524D ${JSON.stringify(row)}\uFF09: ${source}`);
    }
  });
  return rows;
}
function parseJson(text, source) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`\u6570\u636E\u96C6 JSON \u89E3\u6790\u5931\u8D25\uFF08${source}\uFF09: ${error.message}`);
  }
  if (isPlainObject2(parsed) && Array.isArray(parsed.rows)) return normalizeRows(parsed.rows, source);
  return normalizeRows(parsed, source);
}
function parseJsonl(text, source) {
  const rows = [];
  String(text).split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      rows.push(JSON.parse(trimmed));
    } catch (error) {
      throw new Error(`\u6570\u636E\u96C6 JSONL \u7B2C ${index + 1} \u884C\u89E3\u6790\u5931\u8D25\uFF08${source}\uFF09: ${error.message}`);
    }
  });
  return normalizeRows(rows, source);
}
function parseDatasetText(text, format, source = "<dataset>") {
  if (format === "csv") {
    const table = parseCsv(text);
    if (!table.length) throw new Error(`\u6570\u636E\u96C6\u4E3A\u7A7A: ${source}`);
    const headers = table.shift().map((header) => String(header).trim());
    if (!headers.length || headers.some((header) => !header)) {
      throw new Error(`CSV \u8868\u5934\u4E0D\u80FD\u4E3A\u7A7A: ${source}`);
    }
    if (new Set(headers).size !== headers.length) {
      throw new Error(`CSV \u8868\u5934\u5B58\u5728\u91CD\u590D\u5217: ${source}`);
    }
    return table.map((cells, index) => {
      if (cells.length !== headers.length) {
        throw new Error(`CSV \u7B2C ${index + 2} \u884C\u5217\u6570\uFF08${cells.length}\uFF09\u4E0E\u8868\u5934\uFF08${headers.length}\uFF09\u4E0D\u4E00\u81F4: ${source}`);
      }
      return Object.fromEntries(headers.map((header, column) => [header, cells[column]]));
    });
  }
  return format === "jsonl" ? parseJsonl(text, source) : parseJson(text, source);
}
function loadDataset(filePath) {
  const source = import_node_path6.default.resolve(filePath);
  if (!import_node_fs6.default.existsSync(source)) throw new Error(`\u6570\u636E\u96C6\u6587\u4EF6\u4E0D\u5B58\u5728: ${source}`);
  const text = import_node_fs6.default.readFileSync(source, "utf8");
  const extension = import_node_path6.default.extname(source).toLowerCase();
  const format = extension === ".csv" ? "csv" : extension === ".jsonl" || extension === ".ndjson" ? "jsonl" : "json";
  const rows = parseDatasetText(text, format, source);
  return { rows, format, file: source };
}

// src/utils/junit.js
var import_node_fs7 = __toESM(require("node:fs"), 1);
var import_node_path7 = __toESM(require("node:path"), 1);
var INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;
function escapeXml(value) {
  return String(value == null ? "" : value).replace(INVALID_XML_CHARS, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function seconds(milliseconds) {
  const value = Number(milliseconds);
  return Number.isFinite(value) ? (value / 1e3).toFixed(3) : "0.000";
}
function failureMessage(step) {
  const failedAssertions = (step.assertions || []).filter((item) => !item.passed);
  const names = failedAssertions.map((item) => item.name).filter(Boolean);
  if (step.error) return String(step.error);
  if (names.length) return names.join("; ");
  return "\u6B65\u9AA4\u5931\u8D25";
}
function failureDetail(step) {
  const lines = [];
  for (const assertion of (step.assertions || []).filter((item) => !item.passed)) {
    lines.push(`${assertion.name}: expected=${safeJson(assertion.expected)} actual=${safeJson(assertion.actual)}`);
    if (assertion.reason) lines.push(`\u539F\u56E0: ${assertion.reason}`);
    for (const detail of assertion.detail || []) {
      if (Array.isArray(detail.assertions)) {
        for (const sub of detail.assertions.filter((item) => !item.passed)) {
          lines.push(`  \u7B2C ${detail.index + 1} \u9879 ${sub.name}: expected=${safeJson(sub.expected)} actual=${safeJson(sub.actual)}`);
        }
      } else if (detail.path) {
        lines.push(`  ${detail.path}: expected=${safeJson(detail.expected)} actual=${safeJson(detail.actual)}`);
      }
    }
  }
  return lines.join("\n");
}
function safeJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
function stepCase(step, scenarioId) {
  const name = escapeXml(step.name || "\u672A\u547D\u540D\u6B65\u9AA4");
  const classname = escapeXml(scenarioId || "scenario");
  const time = seconds(step.duration);
  if (step.skipped) {
    const message = (step.warnings || []).join("\uFF1B") || "\u6761\u4EF6\u8DF3\u8FC7";
    return `    <testcase name="${name}" classname="${classname}" time="${time}"><skipped message="${escapeXml(message)}"/></testcase>`;
  }
  if (!step.passed) {
    const message = failureMessage(step);
    const detail = failureDetail(step);
    return `    <testcase name="${name}" classname="${classname}" time="${time}"><failure message="${escapeXml(message)}">${escapeXml(detail)}</failure></testcase>`;
  }
  return `    <testcase name="${name}" classname="${classname}" time="${time}"/>`;
}
function buildJUnitXml(reports, options = {}) {
  const suites = [];
  let totalTests = 0;
  let totalFailures = 0;
  let totalSkipped = 0;
  let totalTime = 0;
  for (const report of reports || []) {
    const results = report.results || [];
    const unexecuted = report.unexecuted || [];
    const failures = results.filter((step) => !step.skipped && !step.passed).length;
    const skipped = results.filter((step) => step.skipped).length + unexecuted.length;
    const suiteTime = results.reduce((sum, step) => sum + (Number(step.duration) || 0), 0);
    const tests = results.length + unexecuted.length;
    totalTests += tests;
    totalFailures += failures;
    totalSkipped += skipped;
    totalTime += suiteTime;
    const scenarioId = report.scenarioId || report.scenarioName || "scenario";
    const cases = results.map((step) => stepCase(step, scenarioId));
    for (const stepName of unexecuted) {
      cases.push(`    <testcase name="${escapeXml(stepName)}" classname="${escapeXml(scenarioId)}" time="0.000"><skipped message="failurePolicy: stop \u672A\u6267\u884C"/></testcase>`);
    }
    suites.push(
      `  <testsuite name="${escapeXml(scenarioId)}" tests="${tests}" failures="${failures}" skipped="${skipped}" time="${seconds(suiteTime)}">
${cases.join("\n")}${cases.length ? "\n" : ""}  </testsuite>`
    );
  }
  const name = options.name || "scenario-test";
  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="${escapeXml(name)}" tests="${totalTests}" failures="${totalFailures}" skipped="${totalSkipped}" time="${seconds(totalTime)}">
${suites.join("\n")}${suites.length ? "\n" : ""}</testsuites>
`;
}
function writeJUnitReport(filePath, reports, options = {}) {
  const target = import_node_path7.default.resolve(filePath);
  import_node_fs7.default.mkdirSync(import_node_path7.default.dirname(target), { recursive: true });
  import_node_fs7.default.writeFileSync(target, buildJUnitXml(reports, options), "utf8");
  return target;
}

// src/cli/serve-server.js
var import_node_fs8 = __toESM(require("node:fs"), 1);
var import_node_http = __toESM(require("node:http"), 1);
var import_node_https = __toESM(require("node:https"), 1);
var import_node_path8 = __toESM(require("node:path"), 1);
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
var PROXY_ENV_HEADER = "x-scenario-test-env";
var DEFAULT_PROXY_TIMEOUT_MS = 3e4;
var MAX_PROXY_TIMEOUT_MS = 6e5;
function contentType(filePath) {
  return {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".txt": "text/plain; charset=utf-8"
  }[import_node_path8.default.extname(filePath).toLowerCase()] || "application/octet-stream";
}
function safeFile(root, relativePath) {
  const candidate = import_node_path8.default.resolve(root, relativePath);
  const relative = import_node_path8.default.relative(root, candidate);
  if (!relative || relative.startsWith("..") || import_node_path8.default.isAbsolute(relative)) return null;
  return isRealPathWithinRoot(root, candidate) ? candidate : null;
}
function serveStaticFile(response, filePath) {
  const headers = { "Cache-Control": "no-store", "Content-Type": contentType(filePath) };
  if (import_node_path8.default.extname(filePath).toLowerCase() !== ".html") {
    const stream = import_node_fs8.default.createReadStream(filePath);
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
  import_node_fs8.default.readFile(filePath, "utf8", function(error, html) {
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
function isAllowedServeHost(hostHeader, port) {
  const host = String(hostHeader || "").trim().toLowerCase();
  return [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`, "127.0.0.1", "localhost", "[::1]"].includes(host);
}
function connectionNamedHeaders(connectionValue) {
  return String(connectionValue || "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}
function trimUrl(url) {
  return String(url || "").replace(/\/+$/, "");
}
function resolveStartupProxyTarget(config, envKey, baseUrlOverride) {
  if (config.envs?.length) {
    const selectedKey = envKey || config.defaultEnvKey;
    const environment = config.envs.find((item) => item.key === selectedKey);
    if (!environment) {
      const keys = config.envs.map((item) => item.key);
      return { error: `\u672A\u627E\u5230\u73AF\u5883 ${selectedKey}\uFF0C\u53EF\u7528\u503C: ${keys.join(", ")}` };
    }
    const overridden = Boolean(baseUrlOverride);
    return {
      key: overridden ? `${environment.key}\uFF08--base-url \u8986\u76D6\uFF09` : environment.key,
      envKey: environment.key,
      target: trimUrl(overridden ? baseUrlOverride : environment.baseUrl || "")
    };
  }
  return {
    key: config.defaultEnvKey || "default",
    envKey: config.defaultEnvKey || "default",
    target: trimUrl(baseUrlOverride || config.baseUrl || "")
  };
}
function resolveRequestProxyTarget(options) {
  const { config, defaultTarget, defaultEnvKey, overrideBaseUrl, envKey } = options;
  if (overrideBaseUrl) return defaultTarget;
  if (config.envs?.length) {
    const selectedKey = String(envKey || defaultEnvKey || config.defaultEnvKey || "").trim();
    const environment = config.envs.find((item) => item.key === selectedKey);
    if (!environment) {
      const keys = config.envs.map((item) => item.key);
      throw new Error(`\u672A\u77E5\u73AF\u5883 ${selectedKey || "(\u7A7A)"}\uFF0C\u53EF\u7528\u503C: ${keys.join(", ")}`);
    }
    if (!environment.baseUrl) throw new Error(`\u73AF\u5883 ${environment.key} \u672A\u914D\u7F6E baseUrl`);
    return { key: environment.key, envKey: environment.key, target: trimUrl(environment.baseUrl) };
  }
  if (envKey && envKey !== defaultEnvKey) {
    throw new Error(`\u914D\u7F6E\u672A\u58F0\u660E\u73AF\u5883 ${envKey}\uFF0C\u65E0\u6CD5\u5207\u6362\u4EE3\u7406\u76EE\u6807`);
  }
  return defaultTarget;
}
function rewriteProxyOriginHeaders(headers, localHost, targetUrl) {
  let targetOrigin;
  try {
    targetOrigin = new URL(targetUrl).origin;
  } catch {
    return headers;
  }
  const local = String(localHost || "").trim().toLowerCase();
  for (const name of Object.keys(headers)) {
    const lower = name.toLowerCase();
    if (lower !== "origin" && lower !== "referer") continue;
    let parsed;
    try {
      parsed = new URL(String(headers[name]));
    } catch {
      continue;
    }
    if (parsed.host.toLowerCase() !== local) continue;
    headers[name] = lower === "origin" ? targetOrigin : `${targetOrigin}${parsed.pathname}${parsed.search}`;
  }
  return headers;
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
function abortProxyResponse(response) {
  if (response.destroyed || response.writableEnded) return;
  response.destroy();
}
function respondProxyError(response, message) {
  if (response.headersSent) {
    abortProxyResponse(response);
    return;
  }
  response.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(message);
}
function buildProxyRequestHeaders(request, targetUrl) {
  const headers = {};
  const requestCloseNamed = new Set(connectionNamedHeaders(request.headers.connection));
  for (const [name, value] of Object.entries(request.headers)) {
    const lower = String(name).toLowerCase();
    if (lower === PROXY_ENV_HEADER) continue;
    if (!HOP_BY_HOP_HEADERS.has(lower) && !requestCloseNamed.has(lower)) headers[name] = value;
  }
  rewriteProxyOriginHeaders(headers, request.headers.host, targetUrl);
  return headers;
}
function proxyRequest(request, response, targetUrl, options = {}) {
  const timeoutMs = Number.isFinite(Number(options.timeoutMs)) && Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : DEFAULT_PROXY_TIMEOUT_MS;
  const transport = proxyTransport(targetUrl);
  if (!transport) {
    respondProxyError(
      response,
      `Bad Gateway: \u63A5\u53E3\u4EE3\u7406\u76EE\u6807\u65E0\u6548: ${targetUrl}
\u8BF7\u68C0\u67E5\u73AF\u5883 baseUrl\uFF0C\u5FC5\u987B\u5E26\u534F\u8BAE\u524D\u7F00\uFF08http:// \u6216 https://\uFF09`
    );
    return;
  }
  const headers = buildProxyRequestHeaders(request, targetUrl);
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
      upstreamResponse.on("error", () => abortProxyResponse(response));
      upstreamResponse.on("aborted", () => abortProxyResponse(response));
      upstreamResponse.pipe(response);
    });
  } catch (error) {
    respondProxyError(response, `Bad Gateway: \u63A5\u53E3\u4EE3\u7406\u8BF7\u6C42\u6784\u9020\u5931\u8D25: ${error.message}`);
    return;
  }
  upstream.setTimeout(timeoutMs, () => {
    upstream.destroy(new Error("\u63A5\u53E3\u4EE3\u7406\u8D85\u65F6"));
  });
  upstream.on("error", () => {
    respondProxyError(response, "Bad Gateway: \u65E0\u6CD5\u8FDE\u63A5\u63A5\u53E3\u4EE3\u7406\u76EE\u6807\u6216\u4EE3\u7406\u8D85\u65F6");
  });
  request.pipe(upstream);
}
function createServeServer(options) {
  const {
    workspace,
    libraryDist,
    port,
    config,
    defaultTarget,
    overrideBaseUrl = "",
    proxyTimeoutMs = DEFAULT_PROXY_TIMEOUT_MS
  } = options;
  return import_node_http.default.createServer((request, response) => {
    try {
      if (!isAllowedServeHost(request.headers.host, port)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }
      const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
      let filePath;
      if (pathname === "/__scenario-test__/scenario-test.umd.js") filePath = import_node_path8.default.join(libraryDist, "scenario-test.umd.js");
      else if (pathname === "/dist/scenario-test.umd.js") {
        filePath = import_node_path8.default.join(libraryDist, "scenario-test.umd.js");
      } else if (pathname === "/node_modules/@yc_yzkj/scenario-test/dist/scenario-test.umd.js") {
        filePath = import_node_path8.default.join(libraryDist, "scenario-test.umd.js");
      } else {
        const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
        filePath = safeFile(workspace, relativePath);
      }
      if (!filePath) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }
      import_node_fs8.default.stat(filePath, (error, stat) => {
        if (error || !stat.isFile()) {
          if (!defaultTarget?.target) {
            response.writeHead(404);
            response.end("Not Found");
            return;
          }
          let target;
          try {
            target = resolveRequestProxyTarget({
              config,
              defaultTarget,
              defaultEnvKey: defaultTarget.envKey,
              overrideBaseUrl,
              envKey: request.headers[PROXY_ENV_HEADER]
            });
          } catch (targetError) {
            respondProxyError(response, `Bad Gateway: ${targetError.message}`);
            return;
          }
          proxyRequest(request, response, target.target, { timeoutMs: proxyTimeoutMs });
          return;
        }
        serveStaticFile(response, filePath);
      });
    } catch {
      response.writeHead(400);
      response.end("Bad Request");
    }
  });
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
function parseKeyValueOption(raw, option) {
  const separator = raw.indexOf("=");
  const key = separator > 0 ? raw.slice(0, separator).trim() : "";
  if (!key) {
    throw new CliUsageError(
      `${option} \u9700\u8981 key=value \u683C\u5F0F`,
      `\u793A\u4F8B\uFF1A${option} tenant=test ${option} expectedStatus=UP\uFF1B\u503C\u53EF\u5305\u542B = \u4E14\u652F\u6301 {{ }} \u6A21\u677F\u3002`
    );
  }
  return [key, raw.slice(separator + 1)];
}
function parseOptionValue(raw, spec, option) {
  if (spec.parse === "number") return Number(raw);
  if (spec.parse === "keyValue") return parseKeyValueOption(raw, option);
  return raw;
}
function parseArgs(argv) {
  const args = { command: "run", all: false, config: "", scenario: "", env: "", baseUrl: "", authorization: "", vars: {}, port: 4300, project: "", dir: "", force: false, noInput: false, allowExternalPlugins: false, failOnSkip: false, json: false, help: false, tags: [], bail: false, cookieJar: false, dataFile: "", junit: "", proxyTimeout: void 0 };
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
      const parsed = parseOptionValue(raw, valueOption.spec, item);
      if (valueOption.spec.repeatable) {
        if (valueOption.spec.parse === "keyValue") {
          args[valueOption.prop] = Object.fromEntries([
            ...Object.entries(args[valueOption.prop] || {}),
            parsed
          ]);
        } else {
          args[valueOption.prop] = [...Array.isArray(args[valueOption.prop]) ? args[valueOption.prop] : [], raw];
        }
      } else {
        args[valueOption.prop] = parsed;
      }
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
  if (args.timeout !== void 0 && (!Number.isFinite(args.timeout) || args.timeout <= 0)) {
    throw new CliUsageError(
      "--timeout \u5FC5\u987B\u662F\u5927\u4E8E 0 \u7684\u6BEB\u79D2\u6570",
      "\u793A\u4F8B\uFF1A--timeout 5000\uFF1B\u8BE5\u503C\u4F1A\u8986\u76D6\u914D\u7F6E\u4E2D\u7684 requestTimeoutMs\u3002"
    );
  }
  if (args.proxyTimeout !== void 0 && (!Number.isInteger(args.proxyTimeout) || args.proxyTimeout < 1 || args.proxyTimeout > MAX_PROXY_TIMEOUT_MS)) {
    throw new CliUsageError(
      `--proxy-timeout \u5FC5\u987B\u662F 1-${MAX_PROXY_TIMEOUT_MS} \u7684\u6574\u6570\u6BEB\u79D2\u6570\uFF08\u5F53\u524D ${args.proxyTimeout}\uFF09`,
      "\u793A\u4F8B\uFF1A--proxy-timeout 120000\uFF1B\u7F3A\u7701\u4E3A 30000\u3002"
    );
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
  const target = import_node_path9.default.resolve(projectRoot, relativePath);
  if (import_node_fs9.default.existsSync(target) && !force) return false;
  import_node_fs9.default.mkdirSync(import_node_path9.default.dirname(target), { recursive: true });
  import_node_fs9.default.writeFileSync(target, content, "utf8");
  return true;
}
function resolveInitDirectory(projectRoot, value) {
  const directory = String(value || "scenario-test").trim().replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/\/+$/, "");
  const target = import_node_path9.default.resolve(projectRoot, directory);
  const relative = import_node_path9.default.relative(projectRoot, target);
  if (!directory || import_node_path9.default.isAbsolute(directory) || relative.startsWith("..") || import_node_path9.default.isAbsolute(relative)) {
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
  return import_node_crypto2.default.createHash("sha256").update(import_node_fs9.default.readFileSync(filePath)).digest("hex");
}
function runtimeSourceCandidates(fileName) {
  return [
    import_node_path9.default.resolve(import_node_path9.default.dirname(process.argv[1]), fileName),
    import_node_path9.default.resolve(import_node_path9.default.dirname(process.argv[1]), "../dist", fileName)
  ];
}
function copyRuntimeCli(layout, force) {
  const target = layout.frameworkPath(FRAMEWORK_FILES.cli);
  if (import_node_fs9.default.existsSync(target) && !force) return false;
  const source = import_node_path9.default.resolve(process.argv[1]);
  if (!source.endsWith(".cjs")) return null;
  import_node_fs9.default.mkdirSync(import_node_path9.default.dirname(target), { recursive: true });
  import_node_fs9.default.copyFileSync(source, target);
  return true;
}
async function ensureRuntimeFile(layout, fileName, libraryUrl, force) {
  const target = layout.frameworkPath(fileName);
  if (import_node_fs9.default.existsSync(target) && !force) return false;
  const source = runtimeSourceCandidates(fileName).find((candidate) => import_node_fs9.default.existsSync(candidate));
  import_node_fs9.default.mkdirSync(import_node_path9.default.dirname(target), { recursive: true });
  if (source) {
    import_node_fs9.default.copyFileSync(source, target);
    return true;
  }
  if (!libraryUrl) return null;
  const base = libraryUrl.replace(/\/+$/, "") + "/";
  const downloadSignal = AbortSignal.timeout(3e4);
  try {
    const response = await fetch(`${base}${fileName}`, { signal: downloadSignal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    import_node_fs9.default.writeFileSync(target, Buffer.from(await response.arrayBuffer()));
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
    if (import_node_fs9.default.existsSync(filePath)) sha256[fileName] = sha256File(filePath);
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
  import_node_fs9.default.mkdirSync(import_node_path9.default.dirname(target), { recursive: true });
  import_node_fs9.default.writeFileSync(target, `${JSON.stringify(lock, null, 2)}
`, "utf8");
  return true;
}
function shouldRefreshFramework(layout, force) {
  if (force) return true;
  const runtimeFileNames = [FRAMEWORK_FILES.cli, FRAMEWORK_FILES.umd, FRAMEWORK_FILES.dts, FRAMEWORK_FILES.capabilities];
  if (runtimeFileNames.some((fileName) => !import_node_fs9.default.existsSync(layout.frameworkPath(fileName)))) return true;
  const lockPath = layout.frameworkPath(FRAMEWORK_FILES.versionLock);
  if (!import_node_fs9.default.existsSync(lockPath)) return true;
  let lock;
  try {
    lock = JSON.parse(import_node_fs9.default.readFileSync(lockPath, "utf8"));
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
  const projectRoot = import_node_path9.default.resolve(args.project || process.cwd());
  const directory = resolveInitDirectory(projectRoot, args.dir);
  const projectName = import_node_path9.default.basename(projectRoot).trim() || "project";
  const storagePrefix = `scenario-test.${projectName.replace(/[^\p{L}\p{N}._-]+/gu, "-")}`;
  const layout = resolveProjectLayout(projectRoot, directory);
  const frameworkDirectory = ".scenario-test";
  let force = args.force;
  if (!force && import_node_fs9.default.existsSync(import_node_path9.default.join(projectRoot, directory)) && !args.noInput) {
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
  const missingRuntimeFiles = runtimeFileNames.filter((fileName) => !import_node_fs9.default.existsSync(layout.frameworkPath(fileName)));
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
  console.log(`\u6D4F\u89C8\u5668\u5DE5\u4F5C\u53F0: ${import_node_path9.default.join(projectRoot, directory, "index.html")}`);
  console.log("\u63D0\u793A: \u53CC\u51FB start-scenario-test.cmd \u542F\u52A8\u5DE5\u4F5C\u53F0\uFF1Bserve \u4F1A\u81EA\u52A8\u542F\u7528\u540C\u6E90\u63A5\u53E3\u4EE3\u7406\uFF0C\u7ED5\u5F00\u6D4F\u89C8\u5668 CORS\u3002");
}
function resolveConfigPath(value) {
  const candidate = import_node_path9.default.resolve(value || "scenario.config.js");
  if (!import_node_fs9.default.existsSync(candidate)) {
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
        absolutePath = import_node_path9.default.isAbsolute(pluginPath) ? pluginPath : import_node_path9.default.resolve(configDir, pluginPath);
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
function configVariables(config, overrides = {}, environment = null) {
  const values = { ...config.vars || {}, ...environment?.vars || {} };
  const provided = overrides && typeof overrides === "object" ? overrides : {};
  for (const definition of config.variables || []) {
    const environmentName = definition.env;
    const value = environmentName ? process.env[environmentName] : void 0;
    if (value !== void 0) values[definition.name] = value;
    else if (values[definition.name] === void 0 && definition.defaultValue !== void 0) values[definition.name] = definition.defaultValue;
    const effective = Object.prototype.hasOwnProperty.call(provided, definition.name) ? provided[definition.name] : values[definition.name];
    if (definition.required && (effective === void 0 || effective === "")) {
      throw new CliUsageError(
        `\u7F3A\u5C11\u53D8\u91CF ${definition.name}${environmentName ? `\uFF0C\u8BF7\u8BBE\u7F6E\u73AF\u5883\u53D8\u91CF ${environmentName}` : ""}`,
        environmentName ? `\u8BBE\u7F6E ${environmentName} \u6216\u901A\u8FC7 --vars ${definition.name}=<value> \u540E\u91CD\u65B0\u8FD0\u884C\u3002` : `\u8BF7\u5728\u914D\u7F6E\u7684 vars \u6216 variables.defaultValue \u4E2D\u63D0\u4F9B\u8BE5\u53D8\u91CF\uFF0C\u6216\u901A\u8FC7 --vars ${definition.name}=<value> \u4E34\u65F6\u6CE8\u5165\u3002`
      );
    }
  }
  return { ...values, ...provided };
}
async function runCommand(args) {
  const configPath = resolveConfigPath(args.config);
  const configDir = import_node_path9.default.dirname(configPath);
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
  const entries = requested.length ? config.scenarios.filter((item) => [item.id, item.name, item.url].some((key) => requested.includes(key))) : args.all || (args.tags || []).length ? config.scenarios.filter((item) => !item.manual) : config.scenarios.filter((item) => [item.id, item.name, item.url].includes(config.scenarios[0]?.id));
  const tagGroups = (args.tags || []).map((raw) => String(raw).split(",").map((tag) => tag.trim()).filter(Boolean)).filter((group) => group.length);
  const filteredEntries = !tagGroups.length ? entries : entries.filter((entry) => tagGroups.some((group) => group.every((tag) => (entry.tags || []).includes(tag))));
  if (tagGroups.length && !filteredEntries.length) {
    const available = [...new Set(config.scenarios.flatMap((entry) => entry.tags || []))].sort();
    throw new CliUsageError(
      `\u6CA1\u6709\u573A\u666F\u5339\u914D\u6807\u7B7E: ${tagGroups.map((group) => group.join(",")).join(" \u6216 ")}`,
      available.length ? `\u53EF\u7528\u6807\u7B7E: ${available.join(", ")}` : "\u914D\u7F6E\u4E2D\u7684\u573A\u666F\u5747\u672A\u58F0\u660E tags\u3002"
    );
  }
  entries.splice(0, entries.length, ...filteredEntries);
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
  const baseVars = configVariables(config, args.vars, environment);
  const baseOptions = {
    config,
    baseUrl: String(args.baseUrl || environment.baseUrl || config.baseUrl || "").replace(/\/+$/, ""),
    authorization: args.authorization || environment.authorization || config.authorization || "",
    globals: mergeGlobals(config.globals, environment.globals, envGlobals),
    requestTimeoutMs: args.timeout ?? config.requestTimeoutMs,
    vars: baseVars,
    environmentVariables: process.env,
    io: createNodeIo(configDir),
    adapters,
    // #65：仅 run --cookie-jar 开启；Jar 在场景 runtime 内维护，不跨场景/不落盘
    cookieJar: Boolean(args.cookieJar),
    // #69：本次 run 的共享变量容器，跨场景/跨数据行复用
    suiteVars: {}
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
  const dataset = (() => {
    if (!args.dataFile) return null;
    try {
      return loadDataset(args.dataFile);
    } catch (error) {
      throw new CliUsageError(`\u6570\u636E\u96C6\u52A0\u8F7D\u5931\u8D25: ${error.message}`, "\u652F\u6301 JSON \u6570\u7EC4\u3001JSONL\uFF08\u6BCF\u884C\u4E00\u4E2A\u5BF9\u8C61\uFF09\u6216 CSV\uFF08\u9996\u884C\u8868\u5934\uFF09\uFF1B\u6BCF\u884C\u5FC5\u987B\u662F\u5BF9\u8C61\u3002");
    }
  })();
  const dataRows = dataset ? dataset.rows : [null];
  const rowResults = [];
  const notRun = [];
  let bailTriggered = false;
  const allSecrets = new Set(collectSecretValues(baseVars, [
    baseOptions.authorization,
    ...baseOptions.globals.filter((item) => isSecretVarName(item.name)).map((item) => item.value)
  ]));
  const rememberSecrets = (vars, extra = []) => {
    for (const secret of collectSecretValues(vars, [baseOptions.authorization, ...extra])) allSecrets.add(secret);
  };
  const reports = [];
  for (const [rowIndex, row] of dataRows.entries()) {
    if (bailTriggered) {
      for (const entry of entries) notRun.push({ id: entry.id, name: entry.name, url: entry.url, row: rowIndex + 1, reason: "bail" });
      continue;
    }
    const rowVars = row || {};
    baseOptions.vars = { ...baseVars, ...rowVars, ...args.vars || {} };
    const rowReports = [];
    if (dataset) print(`
## \u6570\u636E\u884C ${rowIndex + 1}/${dataRows.length}${Object.keys(rowVars).length ? ` (${Object.keys(rowVars).join(", ")})` : ""}`);
    for (const entry of entries) {
      if (bailTriggered) {
        notRun.push({ id: entry.id, name: entry.name, url: entry.url, reason: "bail" });
        continue;
      }
      if (!entry.url) throw new Error(`\u573A\u666F ${entry.id} \u7F3A\u5C11 url`);
      let scenarioPath;
      if (import_node_path9.default.isAbsolute(entry.url)) scenarioPath = entry.url;
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
        async onStep(result, _stepIndex, runtime) {
          const runtimeForResolve = runtime || { vars: {} };
          const stepSecrets = collectSecretValues(runtimeForResolve.vars, [
            baseOptions.authorization,
            ...baseOptions.globals.filter((item) => isSecretVarName(item.name)).map((item) => resolveString(item.value, runtimeForResolve))
          ]);
          for (const secret of stepSecrets) if (secret) allSecrets.add(secret);
          const redact = (value) => redactSecrets(value, stepSecrets);
          const mark = result.skipped ? "SKIP" : result.passed ? "PASS" : "FAIL";
          print(`[${mark}] ${escapeInlineText(redact(result.name))} ${escapeInlineText(redact(result.method))} ${escapeInlineText(redact(result.path))} -> ${escapeInlineText(redact(result.status))} (${formatDuration(result.duration)})`);
          for (const warning of result.warnings || []) {
            print(`  [WARN] ${escapeInlineText(redact(warning))}`);
          }
          const printEachDetail = (detail, prefix) => {
            for (const item of detail || []) {
              if (!item) continue;
              if (!Array.isArray(item.assertions) || item.index === void 0) {
                print(`      \u21B3 ${prefix}${escapeInlineText(item.path)}: expected=${formatFailureValue(redact(item.expected))} actual=${formatFailureValue(redact(item.actual))}`);
                continue;
              }
              const label = `${prefix}\u7B2C ${item.index + 1} \u9879`;
              for (const sub of item.assertions) {
                if (sub.passed) continue;
                print(`      \u21B3 ${label} ${escapeInlineText(redact(sub.name))}: expected=${formatFailureValue(redact(sub.expected))} actual=${formatFailureValue(redact(sub.actual))}`);
                if (sub.reason) print(`        \u539F\u56E0: ${escapeInlineText(redact(sub.reason))}`);
                for (const line of failureDiffLines(redact(sub.expected), redact(sub.actual), "        ")) {
                  print(line);
                }
                printEachDetail(sub.detail, `${label} \u203A `);
              }
            }
          };
          for (const assertion of result.assertions.filter((item) => !item.passed)) {
            print(`  - ${escapeInlineText(redact(assertion.name))}: expected=${formatFailureValue(redact(assertion.expected))} actual=${formatFailureValue(redact(assertion.actual))}`);
            if (assertion.reason) print(`      \u539F\u56E0: ${escapeInlineText(redact(assertion.reason))}`);
            for (const line of failureDiffLines(redact(assertion.expected), redact(assertion.actual), "    ")) {
              print(line);
            }
            printEachDetail(assertion.detail, "");
          }
          if (!result.passed && !result.skipped && !process.env.SCENARIO_NO_BODY_PRINT) printFailedStepBody(result, print, () => stepSecrets);
        }
      });
      for (const plugin of plugins) {
        await plugin?.afterScenario?.(report, { config, configDir, entry, environment, scenario });
      }
      rememberSecrets(report.vars, report.results.flatMap((step) => Object.entries(step.request?.headers || {}).filter(([name]) => isSecretVarName(name)).map(([, value]) => value).filter((value) => typeof value === "string")));
      report.scenarioId = entry.id;
      report.tags = entry.tags || [];
      reports.push(report);
      rowReports.push(report);
      total += report.planned;
      passedTotal += report.passedSteps;
      const stoppedUnexecuted = report.planned - report.executed - report.skipped;
      actualFailedTotal += report.failed;
      stoppedUnexecutedTotal += stoppedUnexecuted;
      failedTotal += report.failed + stoppedUnexecuted;
      skippedTotal += report.skipped;
      print(`Summary: passed=${report.passedSteps} failed=${report.failed} skipped=${report.skipped} executed=${report.executed}/${report.planned} planned (\u72B6\u6001 ${report.status})`);
      if (!report.passed && args.bail) bailTriggered = true;
    }
    if (dataset) rowResults.push({ index: rowIndex + 1, vars: rowVars, scenarios: rowReports });
  }
  print(`
Overall: ${passedTotal}/${total} passed`);
  if (bailTriggered) print(`
--bail \u5DF2\u5F00\u542F\uFF1A${notRun.length} \u4E2A\u540E\u7EED\u573A\u666F\u672A\u6267\u884C\uFF0C\u9000\u51FA\u7801\u4FDD\u6301\u975E\u96F6\u3002`);
  if (failedTotal) process.exitCode = 1;
  if (args.failOnSkip && skippedTotal > 0) {
    print(`
--fail-on-skip \u5DF2\u5F00\u542F\uFF0C\u5B58\u5728 ${skippedTotal} \u4E2A SKIP \u6B65\u9AA4\uFF0C\u9000\u51FA\u7801\u7F6E\u4E3A 1`);
    process.exitCode = 1;
  }
  const secretList = [...allSecrets];
  const safeReports = reports.map((report) => redactSecrets(report, secretList));
  if (args.junit) {
    const target = writeJUnitReport(args.junit, safeReports);
    print(`
JUnit \u62A5\u544A: ${target}`);
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
    const payload = dataset ? {
      data: { file: dataset.file, format: dataset.format, rows: dataset.rows.length },
      results: rowResults.map((row) => ({
        index: row.index,
        vars: redactSecrets(row.vars, secretList),
        scenarios: row.scenarios.map((report) => redactSecrets(report, secretList))
      })),
      ...notRun.length ? { notRun } : {}
    } : safeReports.length === 1 && !notRun.length ? safeReports[0] : { scenarios: safeReports, ...notRun.length ? { notRun } : {} };
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
function printFailedStepBody(result, print = console.log, secretsOf = []) {
  const redact = (value) => redactSecrets(value, typeof secretsOf === "function" ? secretsOf() : secretsOf);
  const response = result?.response;
  if (!response || typeof response !== "object") return;
  const body = response.body;
  const bodyText = typeof response.bodyText === "string" ? response.bodyText : null;
  if (bodyText === null && body && typeof body === "object" && body[SAVED_RESPONSE] === true) {
    print(`  \u54CD\u5E94\u4F53\u5DF2\u4FDD\u5B58\u81F3 ${escapeBodyLine(redact(body.savedTo))}`);
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
  const text = String(redact(raw)).replace(/\r\n/g, "\n").trimEnd();
  if (text === "") return;
  const truncated = text.length > FAILURE_BODY_LIMIT;
  const shown = truncated ? text.slice(0, FAILURE_BODY_LIMIT) : text;
  const note = truncated ? `\uFF08\u5171 ${text.length} \u5B57\u7B26\uFF0C\u622A\u65AD\u663E\u793A\u524D ${FAILURE_BODY_LIMIT}\uFF09` : "";
  print(`  \u54CD\u5E94\u4F53${note}:`);
  for (const line of shown.split("\n")) print(`    ${escapeBodyLine(line)}`);
}
async function serveCommand(args) {
  const configPath = resolveConfigPath(args.config);
  const workspace = import_node_path9.default.dirname(configPath);
  const libraryDist = import_node_path9.default.dirname(import_node_path9.default.resolve(process.argv[1]));
  const config = loadConfigFile(configPath, node_exports);
  const startup = resolveStartupProxyTarget(config, args.env, args.baseUrl);
  if (startup.error) {
    throw new CliUsageError(
      startup.error,
      "\u8BF7\u5C06 --env \u8BBE\u7F6E\u4E3A\u4E0A\u9762\u5217\u51FA\u7684\u73AF\u5883 key \u540E\u91CD\u8BD5\u3002"
    );
  }
  const server = createServeServer({
    workspace,
    libraryDist,
    port: args.port,
    config,
    defaultTarget: startup,
    // --base-url 固定覆盖所有请求的目标（与 run 模式一致）
    overrideBaseUrl: args.baseUrl || "",
    proxyTimeoutMs: args.proxyTimeout ?? void 0
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
    if (startup.target) console.log(`\u63A5\u53E3\u4EE3\u7406: ${startup.key} -> ${startup.target}`);
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
    configDir = import_node_path9.default.dirname(configPath);
  } catch (error) {
    configPath = import_node_path9.default.resolve(args.config || "scenario.config.js");
    configDir = import_node_path9.default.dirname(configPath);
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
