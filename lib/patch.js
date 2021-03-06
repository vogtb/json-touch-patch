"use strict";

var createAPI = require("./utils/createAPI");
var exit = require("./utils/exit");
var toBoolean = require("./utils/toBoolean");
var throwException = require("./utils/throwException");
var pluckWithShallowCopy = require("./utils/pluckWithShallowCopy");
var pluckWithCachedShallowCopy = require("./utils/pluckWithCachedShallowCopy");

var add = require("./add");
var remove = require("./remove");
var replace = require("./replace");
var move = require("./move");
var copy = require("./copy");
var test = require("./test");

var Cache = global.Set || function() {
  var set = [];
  set.has = function(value) {
    return this.indexOf(value) !== -1;
  };
  set.add = function(value) {
    this.push(value);
  }
  return set;
};

function patchFn(object, patches, opts) {
  if (patches.length === 0) {
    return object;
  }
  opts = opts || {};

  var hasError = opts.strict ? throwException : toBoolean;
  var pluckFn = patches.length === 1 ? pluckWithShallowCopy : function(cache) {
    return function(object, keys) {
      return pluckWithCachedShallowCopy(object, keys, cache);
    };
  }(new Cache());
  var root = { "": object };
  var api;

  for (var i = 0, imax = patches.length; i < imax; i++) {
    var patch = patches[i];

    switch (patch.op) {
    case "add":
      if (hasError(add(root, "" + patch.path, patch.value, pluckFn))) {
        return exit(object, root, patch, opts);
      }
      break;
    case "remove":
      if (hasError(remove(root, "" + patch.path, pluckFn))) {
        return exit(object, root, patch, opts);
      }
      break;
    case "replace":
      if (hasError(replace(root, "" + patch.path, patch.value, pluckFn))) {
        return exit(object, root, patch, opts);
      }
      break;
    case "move":
      if (hasError(move(root, "" + patch.from, "" + patch.path, pluckFn))) {
        return exit(object, root, patch, opts);
      }
      break;
    case "copy":
      if (hasError(copy(root, "" + patch.from, "" + patch.path, pluckFn))) {
        return exit(object, root, patch, opts);
      }
      break;
    case "test":
      if (hasError(test(root, "" + patch.path, patch.value))) {
        return exit(object, root, patch, opts);
      }
      break;
    default:
      if (opts.custom && opts.custom[patch.op]) {
        api = api || createAPI(root, pluckFn);
        if (hasError(opts.custom[patch.op](api, patch, i, patches))) {
          return exit(object, root, patch, opts);
        }
      } else {
        hasError("[op:" + patch.op + "] unknown");
        return exit(object, root, patch, opts);
      }
      break;
    }
  }

  return root[""];
}

module.exports = patchFn;
