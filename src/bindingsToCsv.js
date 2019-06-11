"use strict";
module.exports = function(result) {
  var quote = '"';
  var delimiter = ",";
  var lineBreak = "\n";

  var variables = result.head.vars;

  var querySolutions = result.results.bindings;

  var createHeader = function() {
    for (var i = 0; i < variables.length; i++) {
      addValueToString(variables[i]);
    }
    csvString += lineBreak;
  };

  var createBody = function() {
    for (var i = 0; i < querySolutions.length; i++) {
      addQuerySolutionToString(querySolutions[i]);
      csvString += lineBreak;
    }
  };

  var addQuerySolutionToString = function(querySolution) {
    for (var i = 0; i < variables.length; i++) {
      var variable = variables[i];
      if (querySolution.hasOwnProperty(variable)) {
        addValueToString(querySolution[variable]["value"]);
      } else {
        addValueToString("");
      }
    }
  };
  var addValueToString = function(value) {
    //Quotes in the string need to be escaped
    if (needToQuoteString(value)) {
      if (value.indexOf(quote) >= 0) {
        //use double quotes to escape these
        value = value.replace(new RegExp(quote, "g"), quote + quote);
      }
      //and finally add quotes all around
      value = quote + value + quote;
    }
    csvString += value + delimiter;
  };

  var needToQuoteString = function(value) {
    //quote when it contains whitespace or the delimiter
    var needQuoting = false;
    if (value.match("[\\w|" + delimiter + "|" + quote + "]")) {
      needQuoting = true;
    }
    return needQuoting;
  };

  var csvString = "";
  createHeader();
  createBody();
  return csvString;
};
