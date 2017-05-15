"use strict";
var $ = require("jquery");
var root = (module.exports = function(queryResponse) {
  return require("./dlv.js")(queryResponse, "\t", {
    mapVariable: function(variable) {
      if (variable[0] === "?") return variable.substring(1);
      return variable;
    },
    mapValue: function(val) {
      if (val[0] === "<" && val[val.length - 1] === ">") return val.substring(1, val.length - 1);
      return val;
    }
  });
});
