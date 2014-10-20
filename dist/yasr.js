!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.YASR=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
'use strict';
var $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null);
var utils = require("yasgui-utils");
console = console || {"log":function(){}};//make sure any console statements don't break in IE




/**
 * Main YASR constructor
 * 
 * @constructor
 * @param {DOM-Element} parent element to append editor to.
 * @param {object} settings
 * @class YASR
 * @return {doc} YASR document
 */
var root = module.exports = function(parent, options, queryResults) {
	var yasr = {};
	yasr.options = $.extend(true, {}, root.defaults, options);
	yasr.container = $("<div class='yasr'></div>").appendTo(parent);
	yasr.header = $("<div class='yasr_header'></div>").appendTo(yasr.container);
	yasr.resultsContainer = $("<div class='yasr_results'></div>").appendTo(yasr.container);
	
	
	yasr.draw = function(output) {
		if (!yasr.results) return false;
		if (!output) output = yasr.options.output;
		
		if (output in yasr.plugins && yasr.plugins[output].canHandleResults(yasr)) {
			$(yasr.resultsContainer).empty();
			yasr.plugins[output].draw();
			return true;
		}
		//ah, our default output does not take our current results. Try to autodetect
		var selectedOutput = null;
		var selectedOutputPriority = -1;
		for (var tryOutput in yasr.plugins) {
			if (yasr.plugins[tryOutput].canHandleResults(yasr)) {
				var priority = yasr.plugins[tryOutput].getPriority;
				if (typeof priority == "function") priority = priority(yasr);
				if (priority != null && priority != undefined && priority > selectedOutputPriority) {
					selectedOutputPriority = priority;
					selectedOutput = tryOutput;
				}
			}
		}
		if (selectedOutput) {
			$(yasr.resultsContainer).empty();
			yasr.plugins[selectedOutput].draw();
			return true;
		}
		return false;
	};
	yasr.somethingDrawn = function() {
		return !yasr.resultsContainer.is(":empty");
	};
	yasr.setResponse = function(queryResults) {
		try {
			yasr.results = require("./parsers/wrapper.js")(queryResults);
		} catch(exception) {
			yasr.results = exception;
		}
		yasr.draw();
		
		//store if needed
		if (yasr.options.persistency && yasr.options.persistency.results) {
			if (yasr.results.getOriginalResponseAsString && yasr.results.getOriginalResponseAsString().length < yasr.options.persistency.results.maxSize) {
				var id = (typeof yasr.options.persistency.results.id == "string" ? yasr.options.persistency.results.id: yasr.options.persistency.results.id(yasr));
				utils.storage.set(id, yasr.results.getOriginalResponse(), "month");
			}
		}
	};
	
	yasr.plugins = {};
	for (var plugin in root.plugins) {
		yasr.plugins[plugin] = root.plugins[plugin](yasr, yasr.resultsContainer);
	}
	/**
	 * postprocess
	 */
	if (yasr.options.persistency && yasr.options.persistency.outputSelector) {
		var id = (typeof yasr.options.persistency.outputSelector == "string"? yasr.options.persistency.outputSelector: yasr.options.persistency.outputSelector(yasr));
		if (id) {
			var selection = utils.storage.get(id);
			if (selection) yasr.options.output = selection;
		}
	}
	if (!queryResults && yasr.options.persistency && yasr.options.persistency.results) {
		var id = (typeof yasr.options.persistency.results.id == "string" ? yasr.options.persistency.results.id: yasr.options.persistency.results.id(yasr));
		queryResults = utils.storage.get(id);
	}
	
	root.drawHeader(yasr);
	
	if (queryResults) {
		yasr.setResponse(queryResults);
	} 
	root.updateHeader(yasr);
	return yasr;
};
root.updateHeader = function(yasr) {
	var downloadIcon = yasr.header.find(".yasr_downloadIcon");
		downloadIcon
			.removeAttr("title");//and remove previous titles
	
	var outputPlugin = yasr.plugins[yasr.options.output];
	if (outputPlugin) {
		var info = (outputPlugin.getDownloadInfo? outputPlugin.getDownloadInfo(): null);
		if (info) {
			if (info.buttonTitle) downloadIcon.attr(info.buttonTitle);
			downloadIcon.prop("disabled", false);
			downloadIcon.find("path").each(function(){
				this.style.fill = "black";
			});
		} else {
			downloadIcon.prop("disabled", true).prop("title", "Download not supported for this result representation");
			downloadIcon.find("path").each(function(){
				this.style.fill = "gray";
			});
		}
	}
};

root.drawHeader = function(yasr) {
	var drawOutputSelector = function() {
		var btnGroup = $('<div class="yasr_btnGroup"></div>');
		$.each(yasr.plugins, function(pluginName, plugin) {
			if (plugin.hideFromSelection) return;
			var name = plugin.name || pluginName;
			var button = $("<button class='yasr_btn'></button>")
			.text(name)
			.addClass("select_" + pluginName)
			.click(function() {
				//update buttons
				btnGroup.find("button.selected").removeClass("selected");
				$(this).addClass("selected");
				//set and draw output
				yasr.options.output = pluginName;
				
				//store if needed
				if (yasr.options.persistency && yasr.options.persistency.outputSelector) {
					var id = (typeof yasr.options.persistency.outputSelector == "string"? yasr.options.persistency.outputSelector: yasr.options.persistency.outputSelector(yasr));
					utils.storage.set(id, yasr.options.output, "month");
				}
				
				
				yasr.draw();
				root.updateHeader(yasr);
			})
			.appendTo(btnGroup);
			if (yasr.options.output == pluginName) button.addClass("selected");
		});
		
		if (btnGroup.children().length > 1) yasr.header.append(btnGroup);
	};
	var drawDownloadIcon = function() {
		var stringToUrl = function(string, contentType) {
			var url = null;
			var windowUrl = window.URL || window.webkitURL || window.mozURL || window.msURL;
			if (windowUrl && Blob) {
				var blob = new Blob([string], {type: contentType});
				url = windowUrl.createObjectURL(blob);
			}
			return url;
		};
		var button = $("<button class='yasr_btn yasr_downloadIcon'></button>")
			.append(require("yasgui-utils").imgs.getElement({id: "download", width: "15px", height: "15px"}))
			.click(function() {
				var currentPlugin = yasr.plugins[yasr.options.output];
				if (currentPlugin && currentPlugin.getDownloadInfo) {
					var downloadInfo = currentPlugin.getDownloadInfo();
					var downloadUrl = stringToUrl(downloadInfo.getContent(), (downloadInfo.contentType? downloadInfo.contentType: "text/plain"));
					var downloadMockLink = $("<a></a>");
					downloadMockLink.attr("href", downloadUrl);
					downloadMockLink.attr("download", downloadInfo.filename);
					downloadMockLink.get(0).click();
				}
			});
		yasr.header.append(button);
	};
	if (yasr.options.drawOutputSelector) drawOutputSelector();
	if (yasr.options.drawDownloadIcon) drawDownloadIcon();
};




/**
 * Registered plugins. Add a plugin by adding it to this object. 
 * Each plugin -must- return an object from the constructor with the following keys: draw (function) and 
 * options (object with keys hideFromSelection, canHandlerResults, getPriority and name)
 * Want to add your own plugin? I'd advice you use the boolean plugin as a template
 * 
 * @type object
 * @attribute YASR.plugins
 */
root.plugins = {
	boolean: require("./boolean.js"),
	table: require("./table.js"),
	rawResponse: require("./rawResponse.js"),
	error: require("./error.js")
};

/**
 * The default options of YASR. Either change the default options by setting YASR.defaults, or by
 * passing your own options as second argument to the YASR constructor
 * 
 * @attribute YASR.defaults
 */
root.defaults = {
	/**
	 * key of default plugin to use
	 * @property output
	 * @type string
	 * @default "table"
	 */
	output: "table",
	
	/**
	 * Draw the output selector widget
	 * 
	 * @property drawOutputSelector
	 * @type boolean
	 * @default true
	 */
	drawOutputSelector: true,
	/**
	 * Draw download icon. This issues html5 download functionality to 'download' files created on the client-side.
	 *  This allows the user to download results already queried for, such as a CSV when a table is shown, or the original response when the raw response output is selected
	 * 
	 * @property drawDownloadIcon
	 * @type boolean
	 * @default true
	 */
	drawDownloadIcon: true,
	
	
	getUsedPrefixes: null,
	/**
	 * Make certain settings and values of YASR persistent. Setting a key
	 * to null, will disable persistancy: nothing is stored between browser
	 * sessions Setting the values to a string (or a function which returns a
	 * string), will store the query in localstorage using the specified string.
	 * By default, the ID is dynamically generated by finding the nearest DOM element with an "id" set,
	 * to avoid collissions when using multiple YASR items on one page
	 * 
	 * @property persistency
	 * @type object
	 */
	persistency: {
		/**
		 * Persistency setting for the selected output
		 * 
		 * @property persistency.outputSelector
		 * @type string|function
		 * @default function (determine unique id)
		 */
		outputSelector: function(yasr) {
			return "selector_" + utils.determineId(yasr.container);
		},
		/**
		 * Persistency setting for query results.
		 * 
		 * @property persistency.results
		 * @type object
		 */
		results: {
			/**
			 * Get the key to store results in
			 * 
			 * @property persistency.results.id
			 * @type string|function
			 * @default function (determine unique id)
			 */
			id: function(yasr){
				return "results_" + utils.determineId(yasr.container);
			},
			/**
			 * The result set might too large to fit in local storage. 
			 * It is impossible to detect how large the local storage is.
			 * Therefore, we do not store all results in local storage, depending on a max number of characters in the SPARQL result serialization.
			 * Set this function conservitavely. (especially when using multiple YASR instances on one page)
			 * 
			 * @property persistency.results.maxSize
			 * @type int
			 * @default 100000
			 */
			maxSize: 100000 //char count
		}
		
	},
	
	
};
root.version = {
	"YASR" : require("../package.json").version,
	"jquery": $.fn.jquery,
	"yasgui-utils": require("yasgui-utils").version
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../package.json":12,"./boolean.js":14,"./error.js":15,"./parsers/wrapper.js":20,"./rawResponse.js":22,"./table.js":23,"yasgui-utils":10}],2:[function(require,module,exports){
/**
 * jQuery-csv (jQuery Plugin)
 * version: 0.71 (2012-11-19)
 *
 * This document is licensed as free software under the terms of the
 * MIT License: http://www.opensource.org/licenses/mit-license.php
 *
 * Acknowledgements:
 * The original design and influence to implement this library as a jquery
 * plugin is influenced by jquery-json (http://code.google.com/p/jquery-json/).
 * If you're looking to use native JSON.Stringify but want additional backwards
 * compatibility for browsers that don't support it, I highly recommend you
 * check it out.
 *
 * A special thanks goes out to rwk@acm.org for providing a lot of valuable
 * feedback to the project including the core for the new FSM
 * (Finite State Machine) parsers. If you're looking for a stable TSV parser
 * be sure to take a look at jquery-tsv (http://code.google.com/p/jquery-tsv/).

 * For legal purposes I'll include the "NO WARRANTY EXPRESSED OR IMPLIED.
 * USE AT YOUR OWN RISK.". Which, in 'layman's terms' means, by using this
 * library you are accepting responsibility if it breaks your code.
 *
 * Legal jargon aside, I will do my best to provide a useful and stable core
 * that can effectively be built on.
 *
 * Copyrighted 2012 by Evan Plaice.
 */

RegExp.escape= function(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

(function( $ ) {
  'use strict'
  /**
   * jQuery.csv.defaults
   * Encapsulates the method paramater defaults for the CSV plugin module.
   */

  $.csv = {
    defaults: {
      separator:',',
      delimiter:'"',
      headers:true
    },

    hooks: {
      castToScalar: function(value, state) {
        var hasDot = /\./;
        if (isNaN(value)) {
          return value;
        } else {
          if (hasDot.test(value)) {
            return parseFloat(value);
          } else {
            var integer = parseInt(value);
            if(isNaN(integer)) {
              return null;
            } else {
              return integer;
            }
          }
        }
      }
    },

    parsers: {
      parse: function(csv, options) {
        // cache settings
        var separator = options.separator;
        var delimiter = options.delimiter;

        // set initial state if it's missing
        if(!options.state.rowNum) {
          options.state.rowNum = 1;
        }
        if(!options.state.colNum) {
          options.state.colNum = 1;
        }

        // clear initial state
        var data = [];
        var entry = [];
        var state = 0;
        var value = ''
        var exit = false;

        function endOfEntry() {
          // reset the state
          state = 0;
          value = '';

          // if 'start' hasn't been met, don't output
          if(options.start && options.state.rowNum < options.start) {
            // update global state
            entry = [];
            options.state.rowNum++;
            options.state.colNum = 1;
            return;
          }
          
          if(options.onParseEntry === undefined) {
            // onParseEntry hook not set
            data.push(entry);
          } else {
            var hookVal = options.onParseEntry(entry, options.state); // onParseEntry Hook
            // false skips the row, configurable through a hook
            if(hookVal !== false) {
              data.push(hookVal);
            }
          }
          //console.log('entry:' + entry);
          
          // cleanup
          entry = [];

          // if 'end' is met, stop parsing
          if(options.end && options.state.rowNum >= options.end) {
            exit = true;
          }
          
          // update global state
          options.state.rowNum++;
          options.state.colNum = 1;
        }

        function endOfValue() {
          if(options.onParseValue === undefined) {
            // onParseValue hook not set
            entry.push(value);
          } else {
            var hook = options.onParseValue(value, options.state); // onParseValue Hook
            // false skips the row, configurable through a hook
            if(hook !== false) {
              entry.push(hook);
            }
          }
          //console.log('value:' + value);
          // reset the state
          value = '';
          state = 0;
          // update global state
          options.state.colNum++;
        }

        // escape regex-specific control chars
        var escSeparator = RegExp.escape(separator);
        var escDelimiter = RegExp.escape(delimiter);

        // compile the regEx str using the custom delimiter/separator
        var match = /(D|S|\n|\r|[^DS\r\n]+)/;
        var matchSrc = match.source;
        matchSrc = matchSrc.replace(/S/g, escSeparator);
        matchSrc = matchSrc.replace(/D/g, escDelimiter);
        match = RegExp(matchSrc, 'gm');

        // put on your fancy pants...
        // process control chars individually, use look-ahead on non-control chars
        csv.replace(match, function (m0) {
          if(exit) {
            return;
          }
          switch (state) {
            // the start of a value
            case 0:
              // null last value
              if (m0 === separator) {
                value += '';
                endOfValue();
                break;
              }
              // opening delimiter
              if (m0 === delimiter) {
                state = 1;
                break;
              }
              // null last value
              if (m0 === '\n') {
                endOfValue();
                endOfEntry();
                break;
              }
              // phantom carriage return
              if (/^\r$/.test(m0)) {
                break;
              }
              // un-delimited value
              value += m0;
              state = 3;
              break;

            // delimited input
            case 1:
              // second delimiter? check further
              if (m0 === delimiter) {
                state = 2;
                break;
              }
              // delimited data
              value += m0;
              state = 1;
              break;

            // delimiter found in delimited input
            case 2:
              // escaped delimiter?
              if (m0 === delimiter) {
                value += m0;
                state = 1;
                break;
              }
              // null value
              if (m0 === separator) {
                endOfValue();
                break;
              }
              // end of entry
              if (m0 === '\n') {
                endOfValue();
                endOfEntry();
                break;
              }
              // phantom carriage return
              if (/^\r$/.test(m0)) {
                break;
              }
              // broken paser?
              throw new Error('CSVDataError: Illegal State [Row:' + options.state.rowNum + '][Col:' + options.state.colNum + ']');

            // un-delimited input
            case 3:
              // null last value
              if (m0 === separator) {
                endOfValue();
                break;
              }
              // end of entry
              if (m0 === '\n') {
                endOfValue();
                endOfEntry();
                break;
              }
              // phantom carriage return
              if (/^\r$/.test(m0)) {
                break;
              }
              if (m0 === delimiter) {
              // non-compliant data
                throw new Error('CSVDataError: Illegal Quote [Row:' + options.state.rowNum + '][Col:' + options.state.colNum + ']');
              }
              // broken parser?
              throw new Error('CSVDataError: Illegal Data [Row:' + options.state.rowNum + '][Col:' + options.state.colNum + ']');
            default:
              // shenanigans
              throw new Error('CSVDataError: Unknown State [Row:' + options.state.rowNum + '][Col:' + options.state.colNum + ']');
          }
          //console.log('val:' + m0 + ' state:' + state);
        });

        // submit the last entry
        // ignore null last line
        if(entry.length !== 0) {
          endOfValue();
          endOfEntry();
        }

        return data;
      },

      // a csv-specific line splitter
      splitLines: function(csv, options) {
        // cache settings
        var separator = options.separator;
        var delimiter = options.delimiter;

        // set initial state if it's missing
        if(!options.state.rowNum) {
          options.state.rowNum = 1;
        }

        // clear initial state
        var entries = [];
        var state = 0;
        var entry = '';
        var exit = false;

        function endOfLine() {          
          // reset the state
          state = 0;
          
          // if 'start' hasn't been met, don't output
          if(options.start && options.state.rowNum < options.start) {
            // update global state
            entry = '';
            options.state.rowNum++;
            return;
          }
          
          if(options.onParseEntry === undefined) {
            // onParseEntry hook not set
            entries.push(entry);
          } else {
            var hookVal = options.onParseEntry(entry, options.state); // onParseEntry Hook
            // false skips the row, configurable through a hook
            if(hookVal !== false) {
              entries.push(hookVal);
            }
          }

          // cleanup
          entry = '';

          // if 'end' is met, stop parsing
          if(options.end && options.state.rowNum >= options.end) {
            exit = true;
          }
          
          // update global state
          options.state.rowNum++;
        }

        // escape regex-specific control chars
        var escSeparator = RegExp.escape(separator);
        var escDelimiter = RegExp.escape(delimiter);

        // compile the regEx str using the custom delimiter/separator
        var match = /(D|S|\n|\r|[^DS\r\n]+)/;
        var matchSrc = match.source;
        matchSrc = matchSrc.replace(/S/g, escSeparator);
        matchSrc = matchSrc.replace(/D/g, escDelimiter);
        match = RegExp(matchSrc, 'gm');
        
        // put on your fancy pants...
        // process control chars individually, use look-ahead on non-control chars
        csv.replace(match, function (m0) {
          if(exit) {
            return;
          }
          switch (state) {
            // the start of a value/entry
            case 0:
              // null value
              if (m0 === separator) {
                entry += m0;
                state = 0;
                break;
              }
              // opening delimiter
              if (m0 === delimiter) {
                entry += m0;
                state = 1;
                break;
              }
              // end of line
              if (m0 === '\n') {
                endOfLine();
                break;
              }
              // phantom carriage return
              if (/^\r$/.test(m0)) {
                break;
              }
              // un-delimit value
              entry += m0;
              state = 3;
              break;

            // delimited input
            case 1:
              // second delimiter? check further
              if (m0 === delimiter) {
                entry += m0;
                state = 2;
                break;
              }
              // delimited data
              entry += m0;
              state = 1;
              break;

            // delimiter found in delimited input
            case 2:
              // escaped delimiter?
              var prevChar = entry.substr(entry.length - 1);
              if (m0 === delimiter && prevChar === delimiter) {
                entry += m0;
                state = 1;
                break;
              }
              // end of value
              if (m0 === separator) {
                entry += m0;
                state = 0;
                break;
              }
              // end of line
              if (m0 === '\n') {
                endOfLine();
                break;
              }
              // phantom carriage return
              if (m0 === '\r') {
                break;
              }
              // broken paser?
              throw new Error('CSVDataError: Illegal state [Row:' + options.state.rowNum + ']');

            // un-delimited input
            case 3:
              // null value
              if (m0 === separator) {
                entry += m0;
                state = 0;
                break;
              }
              // end of line
              if (m0 === '\n') {
                endOfLine();
                break;
              }
              // phantom carriage return
              if (m0 === '\r') {
                break;
              }
              // non-compliant data
              if (m0 === delimiter) {
                throw new Error('CSVDataError: Illegal quote [Row:' + options.state.rowNum + ']');
              }
              // broken parser?
              throw new Error('CSVDataError: Illegal state [Row:' + options.state.rowNum + ']');
            default:
              // shenanigans
              throw new Error('CSVDataError: Unknown state [Row:' + options.state.rowNum + ']');
          }
          //console.log('val:' + m0 + ' state:' + state);
        });

        // submit the last entry
        // ignore null last line
        if(entry !== '') {
          endOfLine();
        }

        return entries;
      },

      // a csv entry parser
      parseEntry: function(csv, options) {
        // cache settings
        var separator = options.separator;
        var delimiter = options.delimiter;
        
        // set initial state if it's missing
        if(!options.state.rowNum) {
          options.state.rowNum = 1;
        }
        if(!options.state.colNum) {
          options.state.colNum = 1;
        }

        // clear initial state
        var entry = [];
        var state = 0;
        var value = '';

        function endOfValue() {
          if(options.onParseValue === undefined) {
            // onParseValue hook not set
            entry.push(value);
          } else {
            var hook = options.onParseValue(value, options.state); // onParseValue Hook
            // false skips the value, configurable through a hook
            if(hook !== false) {
              entry.push(hook);
            }
          }
          // reset the state
          value = '';
          state = 0;
          // update global state
          options.state.colNum++;
        }

        // checked for a cached regEx first
        if(!options.match) {
          // escape regex-specific control chars
          var escSeparator = RegExp.escape(separator);
          var escDelimiter = RegExp.escape(delimiter);
          
          // compile the regEx str using the custom delimiter/separator
          var match = /(D|S|\n|\r|[^DS\r\n]+)/;
          var matchSrc = match.source;
          matchSrc = matchSrc.replace(/S/g, escSeparator);
          matchSrc = matchSrc.replace(/D/g, escDelimiter);
          options.match = RegExp(matchSrc, 'gm');
        }

        // put on your fancy pants...
        // process control chars individually, use look-ahead on non-control chars
        csv.replace(options.match, function (m0) {
          switch (state) {
            // the start of a value
            case 0:
              // null last value
              if (m0 === separator) {
                value += '';
                endOfValue();
                break;
              }
              // opening delimiter
              if (m0 === delimiter) {
                state = 1;
                break;
              }
              // skip un-delimited new-lines
              if (m0 === '\n' || m0 === '\r') {
                break;
              }
              // un-delimited value
              value += m0;
              state = 3;
              break;

            // delimited input
            case 1:
              // second delimiter? check further
              if (m0 === delimiter) {
                state = 2;
                break;
              }
              // delimited data
              value += m0;
              state = 1;
              break;

            // delimiter found in delimited input
            case 2:
              // escaped delimiter?
              if (m0 === delimiter) {
                value += m0;
                state = 1;
                break;
              }
              // null value
              if (m0 === separator) {
                endOfValue();
                break;
              }
              // skip un-delimited new-lines
              if (m0 === '\n' || m0 === '\r') {
                break;
              }
              // broken paser?
              throw new Error('CSVDataError: Illegal State [Row:' + options.state.rowNum + '][Col:' + options.state.colNum + ']');

            // un-delimited input
            case 3:
              // null last value
              if (m0 === separator) {
                endOfValue();
                break;
              }
              // skip un-delimited new-lines
              if (m0 === '\n' || m0 === '\r') {
                break;
              }
              // non-compliant data
              if (m0 === delimiter) {
                throw new Error('CSVDataError: Illegal Quote [Row:' + options.state.rowNum + '][Col:' + options.state.colNum + ']');
              }
              // broken parser?
              throw new Error('CSVDataError: Illegal Data [Row:' + options.state.rowNum + '][Col:' + options.state.colNum + ']');
            default:
              // shenanigans
              throw new Error('CSVDataError: Unknown State [Row:' + options.state.rowNum + '][Col:' + options.state.colNum + ']');
          }
          //console.log('val:' + m0 + ' state:' + state);
        });

        // submit the last value
        endOfValue();

        return entry;
      }
    },

    /**
     * $.csv.toArray(csv)
     * Converts a CSV entry string to a javascript array.
     *
     * @param {Array} csv The string containing the CSV data.
     * @param {Object} [options] An object containing user-defined options.
     * @param {Character} [separator] An override for the separator character. Defaults to a comma(,).
     * @param {Character} [delimiter] An override for the delimiter character. Defaults to a double-quote(").
     *
     * This method deals with simple CSV strings only. It's useful if you only
     * need to parse a single entry. If you need to parse more than one line,
     * use $.csv2Array instead.
     */
    toArray: function(csv, options, callback) {
      var options = (options !== undefined ? options : {});
      var config = {};
      config.callback = ((callback !== undefined && typeof(callback) === 'function') ? callback : false);
      config.separator = 'separator' in options ? options.separator : $.csv.defaults.separator;
      config.delimiter = 'delimiter' in options ? options.delimiter : $.csv.defaults.delimiter;
      var state = (options.state !== undefined ? options.state : {});

      // setup
      var options = {
        delimiter: config.delimiter,
        separator: config.separator,
        onParseEntry: options.onParseEntry,
        onParseValue: options.onParseValue,
        state: state
      }

      var entry = $.csv.parsers.parseEntry(csv, options);

      // push the value to a callback if one is defined
      if(!config.callback) {
        return entry;
      } else {
        config.callback('', entry);
      }
    },

    /**
     * $.csv.toArrays(csv)
     * Converts a CSV string to a javascript array.
     *
     * @param {String} csv The string containing the raw CSV data.
     * @param {Object} [options] An object containing user-defined options.
     * @param {Character} [separator] An override for the separator character. Defaults to a comma(,).
     * @param {Character} [delimiter] An override for the delimiter character. Defaults to a double-quote(").
     *
     * This method deals with multi-line CSV. The breakdown is simple. The first
     * dimension of the array represents the line (or entry/row) while the second
     * dimension contains the values (or values/columns).
     */
    toArrays: function(csv, options, callback) {
      var options = (options !== undefined ? options : {});
      var config = {};
      config.callback = ((callback !== undefined && typeof(callback) === 'function') ? callback : false);
      config.separator = 'separator' in options ? options.separator : $.csv.defaults.separator;
      config.delimiter = 'delimiter' in options ? options.delimiter : $.csv.defaults.delimiter;
      
      // setup
      var data = [];
      var options = {
        delimiter: config.delimiter,
        separator: config.separator,
        onParseEntry: options.onParseEntry,
        onParseValue: options.onParseValue,
        start: options.start,
        end: options.end,
        state: {
          rowNum: 1,
          colNum: 1
        }
      };

      // break the data down to lines
      data = $.csv.parsers.parse(csv, options);

      // push the value to a callback if one is defined
      if(!config.callback) {
        return data;
      } else {
        config.callback('', data);
      }
    },

    /**
     * $.csv.toObjects(csv)
     * Converts a CSV string to a javascript object.
     * @param {String} csv The string containing the raw CSV data.
     * @param {Object} [options] An object containing user-defined options.
     * @param {Character} [separator] An override for the separator character. Defaults to a comma(,).
     * @param {Character} [delimiter] An override for the delimiter character. Defaults to a double-quote(").
     * @param {Boolean} [headers] Indicates whether the data contains a header line. Defaults to true.
     *
     * This method deals with multi-line CSV strings. Where the headers line is
     * used as the key for each value per entry.
     */
    toObjects: function(csv, options, callback) {
      var options = (options !== undefined ? options : {});
      var config = {};
      config.callback = ((callback !== undefined && typeof(callback) === 'function') ? callback : false);
      config.separator = 'separator' in options ? options.separator : $.csv.defaults.separator;
      config.delimiter = 'delimiter' in options ? options.delimiter : $.csv.defaults.delimiter;
      config.headers = 'headers' in options ? options.headers : $.csv.defaults.headers;
      options.start = 'start' in options ? options.start : 1;
      
      // account for headers
      if(config.headers) {
        options.start++;
      }
      if(options.end && config.headers) {
        options.end++;
      }
      
      // setup
      var lines = [];
      var data = [];
      
      var options = {
        delimiter: config.delimiter,
        separator: config.separator,
        onParseEntry: options.onParseEntry,
        onParseValue: options.onParseValue,
        start: options.start,
        end: options.end,
        state: {
          rowNum: 1,
          colNum: 1
        },
        match: false
      };

      // fetch the headers
      var headerOptions = {
        delimiter: config.delimiter,
        separator: config.separator,
        start: 1,
        end: 1,
        state: {
          rowNum:1,
          colNum:1
        }
      }
      var headerLine = $.csv.parsers.splitLines(csv, headerOptions);
      var headers = $.csv.toArray(headerLine[0], options);

      // fetch the data
      var lines = $.csv.parsers.splitLines(csv, options);
      
      // reset the state for re-use
      options.state.colNum = 1;
      if(headers){
        options.state.rowNum = 2;
      } else {
        options.state.rowNum = 1;
      }
      
      // convert data to objects
      for(var i=0, len=lines.length; i<len; i++) {
        var entry = $.csv.toArray(lines[i], options);
        var object = {};
        for(var j in headers) {
          object[headers[j]] = entry[j];
        }
        data.push(object);
        
        // update row state
        options.state.rowNum++;
      }

      // push the value to a callback if one is defined
      if(!config.callback) {
        return data;
      } else {
        config.callback('', data);
      }
    },

     /**
     * $.csv.fromArrays(arrays)
     * Converts a javascript array to a CSV String.
     *
     * @param {Array} array An array containing an array of CSV entries.
     * @param {Object} [options] An object containing user-defined options.
     * @param {Character} [separator] An override for the separator character. Defaults to a comma(,).
     * @param {Character} [delimiter] An override for the delimiter character. Defaults to a double-quote(").
     *
     * This method generates a CSV file from an array of arrays (representing entries).
     */
    fromArrays: function(arrays, options, callback) {
      var options = (options !== undefined ? options : {});
      var config = {};
      config.callback = ((callback !== undefined && typeof(callback) === 'function') ? callback : false);
      config.separator = 'separator' in options ? options.separator : $.csv.defaults.separator;
      config.delimiter = 'delimiter' in options ? options.delimiter : $.csv.defaults.delimiter;
      config.escaper = 'escaper' in options ? options.escaper : $.csv.defaults.escaper;
      config.experimental = 'experimental' in options ? options.experimental : false;

      if(!config.experimental) {
        throw new Error('not implemented');
      }

      var output = [];
      for(i in arrays) {
        output.push(arrays[i]);
      }

      // push the value to a callback if one is defined
      if(!config.callback) {
        return output;
      } else {
        config.callback('', output);
      }
    },

    /**
     * $.csv.fromObjects(objects)
     * Converts a javascript dictionary to a CSV string.
     * @param {Object} objects An array of objects containing the data.
     * @param {Object} [options] An object containing user-defined options.
     * @param {Character} [separator] An override for the separator character. Defaults to a comma(,).
     * @param {Character} [delimiter] An override for the delimiter character. Defaults to a double-quote(").
     *
     * This method generates a CSV file from an array of objects (name:value pairs).
     * It starts by detecting the headers and adding them as the first line of
     * the CSV file, followed by a structured dump of the data.
     */
    fromObjects2CSV: function(objects, options, callback) {
      var options = (options !== undefined ? options : {});
      var config = {};
      config.callback = ((callback !== undefined && typeof(callback) === 'function') ? callback : false);
      config.separator = 'separator' in options ? options.separator : $.csv.defaults.separator;
      config.delimiter = 'delimiter' in options ? options.delimiter : $.csv.defaults.delimiter;
      config.experimental = 'experimental' in options ? options.experimental : false;

      if(!config.experimental) {
        throw new Error('not implemented');
      }

      var output = [];
      for(i in objects) {
        output.push(arrays[i]);
      }

      // push the value to a callback if one is defined
      if(!config.callback) {
        return output;
      } else {
        config.callback('', output);
      }
    }
  };

  // Maintenance code to maintain backward-compatibility
  // Will be removed in release 1.0
  $.csvEntry2Array = $.csv.toArray;
  $.csv2Array = $.csv.toArrays;
  $.csv2Dictionary = $.csv.toObjects;

})( jQuery );

},{}],3:[function(require,module,exports){
(function (global){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod((typeof window !== "undefined" ? window.CodeMirror : typeof global !== "undefined" ? global.CodeMirror : null));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  var ie_lt8 = /MSIE \d/.test(navigator.userAgent) &&
    (document.documentMode == null || document.documentMode < 8);

  var Pos = CodeMirror.Pos;

  var matching = {"(": ")>", ")": "(<", "[": "]>", "]": "[<", "{": "}>", "}": "{<"};

  function findMatchingBracket(cm, where, strict, config) {
    var line = cm.getLineHandle(where.line), pos = where.ch - 1;
    var match = (pos >= 0 && matching[line.text.charAt(pos)]) || matching[line.text.charAt(++pos)];
    if (!match) return null;
    var dir = match.charAt(1) == ">" ? 1 : -1;
    if (strict && (dir > 0) != (pos == where.ch)) return null;
    var style = cm.getTokenTypeAt(Pos(where.line, pos + 1));

    var found = scanForBracket(cm, Pos(where.line, pos + (dir > 0 ? 1 : 0)), dir, style || null, config);
    if (found == null) return null;
    return {from: Pos(where.line, pos), to: found && found.pos,
            match: found && found.ch == match.charAt(0), forward: dir > 0};
  }

  // bracketRegex is used to specify which type of bracket to scan
  // should be a regexp, e.g. /[[\]]/
  //
  // Note: If "where" is on an open bracket, then this bracket is ignored.
  //
  // Returns false when no bracket was found, null when it reached
  // maxScanLines and gave up
  function scanForBracket(cm, where, dir, style, config) {
    var maxScanLen = (config && config.maxScanLineLength) || 10000;
    var maxScanLines = (config && config.maxScanLines) || 1000;

    var stack = [];
    var re = config && config.bracketRegex ? config.bracketRegex : /[(){}[\]]/;
    var lineEnd = dir > 0 ? Math.min(where.line + maxScanLines, cm.lastLine() + 1)
                          : Math.max(cm.firstLine() - 1, where.line - maxScanLines);
    for (var lineNo = where.line; lineNo != lineEnd; lineNo += dir) {
      var line = cm.getLine(lineNo);
      if (!line) continue;
      var pos = dir > 0 ? 0 : line.length - 1, end = dir > 0 ? line.length : -1;
      if (line.length > maxScanLen) continue;
      if (lineNo == where.line) pos = where.ch - (dir < 0 ? 1 : 0);
      for (; pos != end; pos += dir) {
        var ch = line.charAt(pos);
        if (re.test(ch) && (style === undefined || cm.getTokenTypeAt(Pos(lineNo, pos + 1)) == style)) {
          var match = matching[ch];
          if ((match.charAt(1) == ">") == (dir > 0)) stack.push(ch);
          else if (!stack.length) return {pos: Pos(lineNo, pos), ch: ch};
          else stack.pop();
        }
      }
    }
    return lineNo - dir == (dir > 0 ? cm.lastLine() : cm.firstLine()) ? false : null;
  }

  function matchBrackets(cm, autoclear, config) {
    // Disable brace matching in long lines, since it'll cause hugely slow updates
    var maxHighlightLen = cm.state.matchBrackets.maxHighlightLineLength || 1000;
    var marks = [], ranges = cm.listSelections();
    for (var i = 0; i < ranges.length; i++) {
      var match = ranges[i].empty() && findMatchingBracket(cm, ranges[i].head, false, config);
      if (match && cm.getLine(match.from.line).length <= maxHighlightLen) {
        var style = match.match ? "CodeMirror-matchingbracket" : "CodeMirror-nonmatchingbracket";
        marks.push(cm.markText(match.from, Pos(match.from.line, match.from.ch + 1), {className: style}));
        if (match.to && cm.getLine(match.to.line).length <= maxHighlightLen)
          marks.push(cm.markText(match.to, Pos(match.to.line, match.to.ch + 1), {className: style}));
      }
    }

    if (marks.length) {
      // Kludge to work around the IE bug from issue #1193, where text
      // input stops going to the textare whever this fires.
      if (ie_lt8 && cm.state.focused) cm.display.input.focus();

      var clear = function() {
        cm.operation(function() {
          for (var i = 0; i < marks.length; i++) marks[i].clear();
        });
      };
      if (autoclear) setTimeout(clear, 800);
      else return clear;
    }
  }

  var currentlyHighlighted = null;
  function doMatchBrackets(cm) {
    cm.operation(function() {
      if (currentlyHighlighted) {currentlyHighlighted(); currentlyHighlighted = null;}
      currentlyHighlighted = matchBrackets(cm, false, cm.state.matchBrackets);
    });
  }

  CodeMirror.defineOption("matchBrackets", false, function(cm, val, old) {
    if (old && old != CodeMirror.Init)
      cm.off("cursorActivity", doMatchBrackets);
    if (val) {
      cm.state.matchBrackets = typeof val == "object" ? val : {};
      cm.on("cursorActivity", doMatchBrackets);
    }
  });

  CodeMirror.defineExtension("matchBrackets", function() {matchBrackets(this, true);});
  CodeMirror.defineExtension("findMatchingBracket", function(pos, strict, config){
    return findMatchingBracket(this, pos, strict, config);
  });
  CodeMirror.defineExtension("scanForBracket", function(pos, dir, style, config){
    return scanForBracket(this, pos, dir, style, config);
  });
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],4:[function(require,module,exports){
(function (global){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

// TODO actually recognize syntax of TypeScript constructs

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod((typeof window !== "undefined" ? window.CodeMirror : typeof global !== "undefined" ? global.CodeMirror : null));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.defineMode("javascript", function(config, parserConfig) {
  var indentUnit = config.indentUnit;
  var statementIndent = parserConfig.statementIndent;
  var jsonldMode = parserConfig.jsonld;
  var jsonMode = parserConfig.json || jsonldMode;
  var isTS = parserConfig.typescript;
  var wordRE = parserConfig.wordCharacters || /[\w$]/;

  // Tokenizer

  var keywords = function(){
    function kw(type) {return {type: type, style: "keyword"};}
    var A = kw("keyword a"), B = kw("keyword b"), C = kw("keyword c");
    var operator = kw("operator"), atom = {type: "atom", style: "atom"};

    var jsKeywords = {
      "if": kw("if"), "while": A, "with": A, "else": B, "do": B, "try": B, "finally": B,
      "return": C, "break": C, "continue": C, "new": C, "delete": C, "throw": C, "debugger": C,
      "var": kw("var"), "const": kw("var"), "let": kw("var"),
      "function": kw("function"), "catch": kw("catch"),
      "for": kw("for"), "switch": kw("switch"), "case": kw("case"), "default": kw("default"),
      "in": operator, "typeof": operator, "instanceof": operator,
      "true": atom, "false": atom, "null": atom, "undefined": atom, "NaN": atom, "Infinity": atom,
      "this": kw("this"), "module": kw("module"), "class": kw("class"), "super": kw("atom"),
      "yield": C, "export": kw("export"), "import": kw("import"), "extends": C
    };

    // Extend the 'normal' keywords with the TypeScript language extensions
    if (isTS) {
      var type = {type: "variable", style: "variable-3"};
      var tsKeywords = {
        // object-like things
        "interface": kw("interface"),
        "extends": kw("extends"),
        "constructor": kw("constructor"),

        // scope modifiers
        "public": kw("public"),
        "private": kw("private"),
        "protected": kw("protected"),
        "static": kw("static"),

        // types
        "string": type, "number": type, "bool": type, "any": type
      };

      for (var attr in tsKeywords) {
        jsKeywords[attr] = tsKeywords[attr];
      }
    }

    return jsKeywords;
  }();

  var isOperatorChar = /[+\-*&%=<>!?|~^]/;
  var isJsonldKeyword = /^@(context|id|value|language|type|container|list|set|reverse|index|base|vocab|graph)"/;

  function readRegexp(stream) {
    var escaped = false, next, inSet = false;
    while ((next = stream.next()) != null) {
      if (!escaped) {
        if (next == "/" && !inSet) return;
        if (next == "[") inSet = true;
        else if (inSet && next == "]") inSet = false;
      }
      escaped = !escaped && next == "\\";
    }
  }

  // Used as scratch variables to communicate multiple values without
  // consing up tons of objects.
  var type, content;
  function ret(tp, style, cont) {
    type = tp; content = cont;
    return style;
  }
  function tokenBase(stream, state) {
    var ch = stream.next();
    if (ch == '"' || ch == "'") {
      state.tokenize = tokenString(ch);
      return state.tokenize(stream, state);
    } else if (ch == "." && stream.match(/^\d+(?:[eE][+\-]?\d+)?/)) {
      return ret("number", "number");
    } else if (ch == "." && stream.match("..")) {
      return ret("spread", "meta");
    } else if (/[\[\]{}\(\),;\:\.]/.test(ch)) {
      return ret(ch);
    } else if (ch == "=" && stream.eat(">")) {
      return ret("=>", "operator");
    } else if (ch == "0" && stream.eat(/x/i)) {
      stream.eatWhile(/[\da-f]/i);
      return ret("number", "number");
    } else if (/\d/.test(ch)) {
      stream.match(/^\d*(?:\.\d*)?(?:[eE][+\-]?\d+)?/);
      return ret("number", "number");
    } else if (ch == "/") {
      if (stream.eat("*")) {
        state.tokenize = tokenComment;
        return tokenComment(stream, state);
      } else if (stream.eat("/")) {
        stream.skipToEnd();
        return ret("comment", "comment");
      } else if (state.lastType == "operator" || state.lastType == "keyword c" ||
               state.lastType == "sof" || /^[\[{}\(,;:]$/.test(state.lastType)) {
        readRegexp(stream);
        stream.eatWhile(/[gimy]/); // 'y' is "sticky" option in Mozilla
        return ret("regexp", "string-2");
      } else {
        stream.eatWhile(isOperatorChar);
        return ret("operator", "operator", stream.current());
      }
    } else if (ch == "`") {
      state.tokenize = tokenQuasi;
      return tokenQuasi(stream, state);
    } else if (ch == "#") {
      stream.skipToEnd();
      return ret("error", "error");
    } else if (isOperatorChar.test(ch)) {
      stream.eatWhile(isOperatorChar);
      return ret("operator", "operator", stream.current());
    } else if (wordRE.test(ch)) {
      stream.eatWhile(wordRE);
      var word = stream.current(), known = keywords.propertyIsEnumerable(word) && keywords[word];
      return (known && state.lastType != ".") ? ret(known.type, known.style, word) :
                     ret("variable", "variable", word);
    }
  }

  function tokenString(quote) {
    return function(stream, state) {
      var escaped = false, next;
      if (jsonldMode && stream.peek() == "@" && stream.match(isJsonldKeyword)){
        state.tokenize = tokenBase;
        return ret("jsonld-keyword", "meta");
      }
      while ((next = stream.next()) != null) {
        if (next == quote && !escaped) break;
        escaped = !escaped && next == "\\";
      }
      if (!escaped) state.tokenize = tokenBase;
      return ret("string", "string");
    };
  }

  function tokenComment(stream, state) {
    var maybeEnd = false, ch;
    while (ch = stream.next()) {
      if (ch == "/" && maybeEnd) {
        state.tokenize = tokenBase;
        break;
      }
      maybeEnd = (ch == "*");
    }
    return ret("comment", "comment");
  }

  function tokenQuasi(stream, state) {
    var escaped = false, next;
    while ((next = stream.next()) != null) {
      if (!escaped && (next == "`" || next == "$" && stream.eat("{"))) {
        state.tokenize = tokenBase;
        break;
      }
      escaped = !escaped && next == "\\";
    }
    return ret("quasi", "string-2", stream.current());
  }

  var brackets = "([{}])";
  // This is a crude lookahead trick to try and notice that we're
  // parsing the argument patterns for a fat-arrow function before we
  // actually hit the arrow token. It only works if the arrow is on
  // the same line as the arguments and there's no strange noise
  // (comments) in between. Fallback is to only notice when we hit the
  // arrow, and not declare the arguments as locals for the arrow
  // body.
  function findFatArrow(stream, state) {
    if (state.fatArrowAt) state.fatArrowAt = null;
    var arrow = stream.string.indexOf("=>", stream.start);
    if (arrow < 0) return;

    var depth = 0, sawSomething = false;
    for (var pos = arrow - 1; pos >= 0; --pos) {
      var ch = stream.string.charAt(pos);
      var bracket = brackets.indexOf(ch);
      if (bracket >= 0 && bracket < 3) {
        if (!depth) { ++pos; break; }
        if (--depth == 0) break;
      } else if (bracket >= 3 && bracket < 6) {
        ++depth;
      } else if (wordRE.test(ch)) {
        sawSomething = true;
      } else if (sawSomething && !depth) {
        ++pos;
        break;
      }
    }
    if (sawSomething && !depth) state.fatArrowAt = pos;
  }

  // Parser

  var atomicTypes = {"atom": true, "number": true, "variable": true, "string": true, "regexp": true, "this": true, "jsonld-keyword": true};

  function JSLexical(indented, column, type, align, prev, info) {
    this.indented = indented;
    this.column = column;
    this.type = type;
    this.prev = prev;
    this.info = info;
    if (align != null) this.align = align;
  }

  function inScope(state, varname) {
    for (var v = state.localVars; v; v = v.next)
      if (v.name == varname) return true;
    for (var cx = state.context; cx; cx = cx.prev) {
      for (var v = cx.vars; v; v = v.next)
        if (v.name == varname) return true;
    }
  }

  function parseJS(state, style, type, content, stream) {
    var cc = state.cc;
    // Communicate our context to the combinators.
    // (Less wasteful than consing up a hundred closures on every call.)
    cx.state = state; cx.stream = stream; cx.marked = null, cx.cc = cc; cx.style = style;

    if (!state.lexical.hasOwnProperty("align"))
      state.lexical.align = true;

    while(true) {
      var combinator = cc.length ? cc.pop() : jsonMode ? expression : statement;
      if (combinator(type, content)) {
        while(cc.length && cc[cc.length - 1].lex)
          cc.pop()();
        if (cx.marked) return cx.marked;
        if (type == "variable" && inScope(state, content)) return "variable-2";
        return style;
      }
    }
  }

  // Combinator utils

  var cx = {state: null, column: null, marked: null, cc: null};
  function pass() {
    for (var i = arguments.length - 1; i >= 0; i--) cx.cc.push(arguments[i]);
  }
  function cont() {
    pass.apply(null, arguments);
    return true;
  }
  function register(varname) {
    function inList(list) {
      for (var v = list; v; v = v.next)
        if (v.name == varname) return true;
      return false;
    }
    var state = cx.state;
    if (state.context) {
      cx.marked = "def";
      if (inList(state.localVars)) return;
      state.localVars = {name: varname, next: state.localVars};
    } else {
      if (inList(state.globalVars)) return;
      if (parserConfig.globalVars)
        state.globalVars = {name: varname, next: state.globalVars};
    }
  }

  // Combinators

  var defaultVars = {name: "this", next: {name: "arguments"}};
  function pushcontext() {
    cx.state.context = {prev: cx.state.context, vars: cx.state.localVars};
    cx.state.localVars = defaultVars;
  }
  function popcontext() {
    cx.state.localVars = cx.state.context.vars;
    cx.state.context = cx.state.context.prev;
  }
  function pushlex(type, info) {
    var result = function() {
      var state = cx.state, indent = state.indented;
      if (state.lexical.type == "stat") indent = state.lexical.indented;
      else for (var outer = state.lexical; outer && outer.type == ")" && outer.align; outer = outer.prev)
        indent = outer.indented;
      state.lexical = new JSLexical(indent, cx.stream.column(), type, null, state.lexical, info);
    };
    result.lex = true;
    return result;
  }
  function poplex() {
    var state = cx.state;
    if (state.lexical.prev) {
      if (state.lexical.type == ")")
        state.indented = state.lexical.indented;
      state.lexical = state.lexical.prev;
    }
  }
  poplex.lex = true;

  function expect(wanted) {
    function exp(type) {
      if (type == wanted) return cont();
      else if (wanted == ";") return pass();
      else return cont(exp);
    };
    return exp;
  }

  function statement(type, value) {
    if (type == "var") return cont(pushlex("vardef", value.length), vardef, expect(";"), poplex);
    if (type == "keyword a") return cont(pushlex("form"), expression, statement, poplex);
    if (type == "keyword b") return cont(pushlex("form"), statement, poplex);
    if (type == "{") return cont(pushlex("}"), block, poplex);
    if (type == ";") return cont();
    if (type == "if") {
      if (cx.state.lexical.info == "else" && cx.state.cc[cx.state.cc.length - 1] == poplex)
        cx.state.cc.pop()();
      return cont(pushlex("form"), expression, statement, poplex, maybeelse);
    }
    if (type == "function") return cont(functiondef);
    if (type == "for") return cont(pushlex("form"), forspec, statement, poplex);
    if (type == "variable") return cont(pushlex("stat"), maybelabel);
    if (type == "switch") return cont(pushlex("form"), expression, pushlex("}", "switch"), expect("{"),
                                      block, poplex, poplex);
    if (type == "case") return cont(expression, expect(":"));
    if (type == "default") return cont(expect(":"));
    if (type == "catch") return cont(pushlex("form"), pushcontext, expect("("), funarg, expect(")"),
                                     statement, poplex, popcontext);
    if (type == "module") return cont(pushlex("form"), pushcontext, afterModule, popcontext, poplex);
    if (type == "class") return cont(pushlex("form"), className, poplex);
    if (type == "export") return cont(pushlex("form"), afterExport, poplex);
    if (type == "import") return cont(pushlex("form"), afterImport, poplex);
    return pass(pushlex("stat"), expression, expect(";"), poplex);
  }
  function expression(type) {
    return expressionInner(type, false);
  }
  function expressionNoComma(type) {
    return expressionInner(type, true);
  }
  function expressionInner(type, noComma) {
    if (cx.state.fatArrowAt == cx.stream.start) {
      var body = noComma ? arrowBodyNoComma : arrowBody;
      if (type == "(") return cont(pushcontext, pushlex(")"), commasep(pattern, ")"), poplex, expect("=>"), body, popcontext);
      else if (type == "variable") return pass(pushcontext, pattern, expect("=>"), body, popcontext);
    }

    var maybeop = noComma ? maybeoperatorNoComma : maybeoperatorComma;
    if (atomicTypes.hasOwnProperty(type)) return cont(maybeop);
    if (type == "function") return cont(functiondef, maybeop);
    if (type == "keyword c") return cont(noComma ? maybeexpressionNoComma : maybeexpression);
    if (type == "(") return cont(pushlex(")"), maybeexpression, comprehension, expect(")"), poplex, maybeop);
    if (type == "operator" || type == "spread") return cont(noComma ? expressionNoComma : expression);
    if (type == "[") return cont(pushlex("]"), arrayLiteral, poplex, maybeop);
    if (type == "{") return contCommasep(objprop, "}", null, maybeop);
    if (type == "quasi") { return pass(quasi, maybeop); }
    return cont();
  }
  function maybeexpression(type) {
    if (type.match(/[;\}\)\],]/)) return pass();
    return pass(expression);
  }
  function maybeexpressionNoComma(type) {
    if (type.match(/[;\}\)\],]/)) return pass();
    return pass(expressionNoComma);
  }

  function maybeoperatorComma(type, value) {
    if (type == ",") return cont(expression);
    return maybeoperatorNoComma(type, value, false);
  }
  function maybeoperatorNoComma(type, value, noComma) {
    var me = noComma == false ? maybeoperatorComma : maybeoperatorNoComma;
    var expr = noComma == false ? expression : expressionNoComma;
    if (type == "=>") return cont(pushcontext, noComma ? arrowBodyNoComma : arrowBody, popcontext);
    if (type == "operator") {
      if (/\+\+|--/.test(value)) return cont(me);
      if (value == "?") return cont(expression, expect(":"), expr);
      return cont(expr);
    }
    if (type == "quasi") { return pass(quasi, me); }
    if (type == ";") return;
    if (type == "(") return contCommasep(expressionNoComma, ")", "call", me);
    if (type == ".") return cont(property, me);
    if (type == "[") return cont(pushlex("]"), maybeexpression, expect("]"), poplex, me);
  }
  function quasi(type, value) {
    if (type != "quasi") return pass();
    if (value.slice(value.length - 2) != "${") return cont(quasi);
    return cont(expression, continueQuasi);
  }
  function continueQuasi(type) {
    if (type == "}") {
      cx.marked = "string-2";
      cx.state.tokenize = tokenQuasi;
      return cont(quasi);
    }
  }
  function arrowBody(type) {
    findFatArrow(cx.stream, cx.state);
    return pass(type == "{" ? statement : expression);
  }
  function arrowBodyNoComma(type) {
    findFatArrow(cx.stream, cx.state);
    return pass(type == "{" ? statement : expressionNoComma);
  }
  function maybelabel(type) {
    if (type == ":") return cont(poplex, statement);
    return pass(maybeoperatorComma, expect(";"), poplex);
  }
  function property(type) {
    if (type == "variable") {cx.marked = "property"; return cont();}
  }
  function objprop(type, value) {
    if (type == "variable" || cx.style == "keyword") {
      cx.marked = "property";
      if (value == "get" || value == "set") return cont(getterSetter);
      return cont(afterprop);
    } else if (type == "number" || type == "string") {
      cx.marked = jsonldMode ? "property" : (cx.style + " property");
      return cont(afterprop);
    } else if (type == "jsonld-keyword") {
      return cont(afterprop);
    } else if (type == "[") {
      return cont(expression, expect("]"), afterprop);
    }
  }
  function getterSetter(type) {
    if (type != "variable") return pass(afterprop);
    cx.marked = "property";
    return cont(functiondef);
  }
  function afterprop(type) {
    if (type == ":") return cont(expressionNoComma);
    if (type == "(") return pass(functiondef);
  }
  function commasep(what, end) {
    function proceed(type) {
      if (type == ",") {
        var lex = cx.state.lexical;
        if (lex.info == "call") lex.pos = (lex.pos || 0) + 1;
        return cont(what, proceed);
      }
      if (type == end) return cont();
      return cont(expect(end));
    }
    return function(type) {
      if (type == end) return cont();
      return pass(what, proceed);
    };
  }
  function contCommasep(what, end, info) {
    for (var i = 3; i < arguments.length; i++)
      cx.cc.push(arguments[i]);
    return cont(pushlex(end, info), commasep(what, end), poplex);
  }
  function block(type) {
    if (type == "}") return cont();
    return pass(statement, block);
  }
  function maybetype(type) {
    if (isTS && type == ":") return cont(typedef);
  }
  function typedef(type) {
    if (type == "variable"){cx.marked = "variable-3"; return cont();}
  }
  function vardef() {
    return pass(pattern, maybetype, maybeAssign, vardefCont);
  }
  function pattern(type, value) {
    if (type == "variable") { register(value); return cont(); }
    if (type == "[") return contCommasep(pattern, "]");
    if (type == "{") return contCommasep(proppattern, "}");
  }
  function proppattern(type, value) {
    if (type == "variable" && !cx.stream.match(/^\s*:/, false)) {
      register(value);
      return cont(maybeAssign);
    }
    if (type == "variable") cx.marked = "property";
    return cont(expect(":"), pattern, maybeAssign);
  }
  function maybeAssign(_type, value) {
    if (value == "=") return cont(expressionNoComma);
  }
  function vardefCont(type) {
    if (type == ",") return cont(vardef);
  }
  function maybeelse(type, value) {
    if (type == "keyword b" && value == "else") return cont(pushlex("form", "else"), statement, poplex);
  }
  function forspec(type) {
    if (type == "(") return cont(pushlex(")"), forspec1, expect(")"), poplex);
  }
  function forspec1(type) {
    if (type == "var") return cont(vardef, expect(";"), forspec2);
    if (type == ";") return cont(forspec2);
    if (type == "variable") return cont(formaybeinof);
    return pass(expression, expect(";"), forspec2);
  }
  function formaybeinof(_type, value) {
    if (value == "in" || value == "of") { cx.marked = "keyword"; return cont(expression); }
    return cont(maybeoperatorComma, forspec2);
  }
  function forspec2(type, value) {
    if (type == ";") return cont(forspec3);
    if (value == "in" || value == "of") { cx.marked = "keyword"; return cont(expression); }
    return pass(expression, expect(";"), forspec3);
  }
  function forspec3(type) {
    if (type != ")") cont(expression);
  }
  function functiondef(type, value) {
    if (value == "*") {cx.marked = "keyword"; return cont(functiondef);}
    if (type == "variable") {register(value); return cont(functiondef);}
    if (type == "(") return cont(pushcontext, pushlex(")"), commasep(funarg, ")"), poplex, statement, popcontext);
  }
  function funarg(type) {
    if (type == "spread") return cont(funarg);
    return pass(pattern, maybetype);
  }
  function className(type, value) {
    if (type == "variable") {register(value); return cont(classNameAfter);}
  }
  function classNameAfter(type, value) {
    if (value == "extends") return cont(expression, classNameAfter);
    if (type == "{") return cont(pushlex("}"), classBody, poplex);
  }
  function classBody(type, value) {
    if (type == "variable" || cx.style == "keyword") {
      cx.marked = "property";
      if (value == "get" || value == "set") return cont(classGetterSetter, functiondef, classBody);
      return cont(functiondef, classBody);
    }
    if (value == "*") {
      cx.marked = "keyword";
      return cont(classBody);
    }
    if (type == ";") return cont(classBody);
    if (type == "}") return cont();
  }
  function classGetterSetter(type) {
    if (type != "variable") return pass();
    cx.marked = "property";
    return cont();
  }
  function afterModule(type, value) {
    if (type == "string") return cont(statement);
    if (type == "variable") { register(value); return cont(maybeFrom); }
  }
  function afterExport(_type, value) {
    if (value == "*") { cx.marked = "keyword"; return cont(maybeFrom, expect(";")); }
    if (value == "default") { cx.marked = "keyword"; return cont(expression, expect(";")); }
    return pass(statement);
  }
  function afterImport(type) {
    if (type == "string") return cont();
    return pass(importSpec, maybeFrom);
  }
  function importSpec(type, value) {
    if (type == "{") return contCommasep(importSpec, "}");
    if (type == "variable") register(value);
    return cont();
  }
  function maybeFrom(_type, value) {
    if (value == "from") { cx.marked = "keyword"; return cont(expression); }
  }
  function arrayLiteral(type) {
    if (type == "]") return cont();
    return pass(expressionNoComma, maybeArrayComprehension);
  }
  function maybeArrayComprehension(type) {
    if (type == "for") return pass(comprehension, expect("]"));
    if (type == ",") return cont(commasep(expressionNoComma, "]"));
    return pass(commasep(expressionNoComma, "]"));
  }
  function comprehension(type) {
    if (type == "for") return cont(forspec, comprehension);
    if (type == "if") return cont(expression, comprehension);
  }

  // Interface

  return {
    startState: function(basecolumn) {
      var state = {
        tokenize: tokenBase,
        lastType: "sof",
        cc: [],
        lexical: new JSLexical((basecolumn || 0) - indentUnit, 0, "block", false),
        localVars: parserConfig.localVars,
        context: parserConfig.localVars && {vars: parserConfig.localVars},
        indented: 0
      };
      if (parserConfig.globalVars && typeof parserConfig.globalVars == "object")
        state.globalVars = parserConfig.globalVars;
      return state;
    },

    token: function(stream, state) {
      if (stream.sol()) {
        if (!state.lexical.hasOwnProperty("align"))
          state.lexical.align = false;
        state.indented = stream.indentation();
        findFatArrow(stream, state);
      }
      if (state.tokenize != tokenComment && stream.eatSpace()) return null;
      var style = state.tokenize(stream, state);
      if (type == "comment") return style;
      state.lastType = type == "operator" && (content == "++" || content == "--") ? "incdec" : type;
      return parseJS(state, style, type, content, stream);
    },

    indent: function(state, textAfter) {
      if (state.tokenize == tokenComment) return CodeMirror.Pass;
      if (state.tokenize != tokenBase) return 0;
      var firstChar = textAfter && textAfter.charAt(0), lexical = state.lexical;
      // Kludge to prevent 'maybelse' from blocking lexical scope pops
      if (!/^\s*else\b/.test(textAfter)) for (var i = state.cc.length - 1; i >= 0; --i) {
        var c = state.cc[i];
        if (c == poplex) lexical = lexical.prev;
        else if (c != maybeelse) break;
      }
      if (lexical.type == "stat" && firstChar == "}") lexical = lexical.prev;
      if (statementIndent && lexical.type == ")" && lexical.prev.type == "stat")
        lexical = lexical.prev;
      var type = lexical.type, closing = firstChar == type;

      if (type == "vardef") return lexical.indented + (state.lastType == "operator" || state.lastType == "," ? lexical.info + 1 : 0);
      else if (type == "form" && firstChar == "{") return lexical.indented;
      else if (type == "form") return lexical.indented + indentUnit;
      else if (type == "stat")
        return lexical.indented + (state.lastType == "operator" || state.lastType == "," ? statementIndent || indentUnit : 0);
      else if (lexical.info == "switch" && !closing && parserConfig.doubleIndentSwitch != false)
        return lexical.indented + (/^(?:case|default)\b/.test(textAfter) ? indentUnit : 2 * indentUnit);
      else if (lexical.align) return lexical.column + (closing ? 0 : 1);
      else return lexical.indented + (closing ? 0 : indentUnit);
    },

    electricChars: ":{}",
    blockCommentStart: jsonMode ? null : "/*",
    blockCommentEnd: jsonMode ? null : "*/",
    lineComment: jsonMode ? null : "//",
    fold: "brace",

    helperType: jsonMode ? "json" : "javascript",
    jsonldMode: jsonldMode,
    jsonMode: jsonMode
  };
});

CodeMirror.registerHelper("wordChars", "javascript", /[\w$]/);

CodeMirror.defineMIME("text/javascript", "javascript");
CodeMirror.defineMIME("text/ecmascript", "javascript");
CodeMirror.defineMIME("application/javascript", "javascript");
CodeMirror.defineMIME("application/x-javascript", "javascript");
CodeMirror.defineMIME("application/ecmascript", "javascript");
CodeMirror.defineMIME("application/json", {name: "javascript", json: true});
CodeMirror.defineMIME("application/x-json", {name: "javascript", json: true});
CodeMirror.defineMIME("application/ld+json", {name: "javascript", jsonld: true});
CodeMirror.defineMIME("text/typescript", { name: "javascript", typescript: true });
CodeMirror.defineMIME("application/typescript", { name: "javascript", typescript: true });

});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],5:[function(require,module,exports){
(function (global){
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod((typeof window !== "undefined" ? window.CodeMirror : typeof global !== "undefined" ? global.CodeMirror : null));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.defineMode("xml", function(config, parserConfig) {
  var indentUnit = config.indentUnit;
  var multilineTagIndentFactor = parserConfig.multilineTagIndentFactor || 1;
  var multilineTagIndentPastTag = parserConfig.multilineTagIndentPastTag;
  if (multilineTagIndentPastTag == null) multilineTagIndentPastTag = true;

  var Kludges = parserConfig.htmlMode ? {
    autoSelfClosers: {'area': true, 'base': true, 'br': true, 'col': true, 'command': true,
                      'embed': true, 'frame': true, 'hr': true, 'img': true, 'input': true,
                      'keygen': true, 'link': true, 'meta': true, 'param': true, 'source': true,
                      'track': true, 'wbr': true, 'menuitem': true},
    implicitlyClosed: {'dd': true, 'li': true, 'optgroup': true, 'option': true, 'p': true,
                       'rp': true, 'rt': true, 'tbody': true, 'td': true, 'tfoot': true,
                       'th': true, 'tr': true},
    contextGrabbers: {
      'dd': {'dd': true, 'dt': true},
      'dt': {'dd': true, 'dt': true},
      'li': {'li': true},
      'option': {'option': true, 'optgroup': true},
      'optgroup': {'optgroup': true},
      'p': {'address': true, 'article': true, 'aside': true, 'blockquote': true, 'dir': true,
            'div': true, 'dl': true, 'fieldset': true, 'footer': true, 'form': true,
            'h1': true, 'h2': true, 'h3': true, 'h4': true, 'h5': true, 'h6': true,
            'header': true, 'hgroup': true, 'hr': true, 'menu': true, 'nav': true, 'ol': true,
            'p': true, 'pre': true, 'section': true, 'table': true, 'ul': true},
      'rp': {'rp': true, 'rt': true},
      'rt': {'rp': true, 'rt': true},
      'tbody': {'tbody': true, 'tfoot': true},
      'td': {'td': true, 'th': true},
      'tfoot': {'tbody': true},
      'th': {'td': true, 'th': true},
      'thead': {'tbody': true, 'tfoot': true},
      'tr': {'tr': true}
    },
    doNotIndent: {"pre": true},
    allowUnquoted: true,
    allowMissing: true,
    caseFold: true
  } : {
    autoSelfClosers: {},
    implicitlyClosed: {},
    contextGrabbers: {},
    doNotIndent: {},
    allowUnquoted: false,
    allowMissing: false,
    caseFold: false
  };
  var alignCDATA = parserConfig.alignCDATA;

  // Return variables for tokenizers
  var type, setStyle;

  function inText(stream, state) {
    function chain(parser) {
      state.tokenize = parser;
      return parser(stream, state);
    }

    var ch = stream.next();
    if (ch == "<") {
      if (stream.eat("!")) {
        if (stream.eat("[")) {
          if (stream.match("CDATA[")) return chain(inBlock("atom", "]]>"));
          else return null;
        } else if (stream.match("--")) {
          return chain(inBlock("comment", "-->"));
        } else if (stream.match("DOCTYPE", true, true)) {
          stream.eatWhile(/[\w\._\-]/);
          return chain(doctype(1));
        } else {
          return null;
        }
      } else if (stream.eat("?")) {
        stream.eatWhile(/[\w\._\-]/);
        state.tokenize = inBlock("meta", "?>");
        return "meta";
      } else {
        type = stream.eat("/") ? "closeTag" : "openTag";
        state.tokenize = inTag;
        return "tag bracket";
      }
    } else if (ch == "&") {
      var ok;
      if (stream.eat("#")) {
        if (stream.eat("x")) {
          ok = stream.eatWhile(/[a-fA-F\d]/) && stream.eat(";");
        } else {
          ok = stream.eatWhile(/[\d]/) && stream.eat(";");
        }
      } else {
        ok = stream.eatWhile(/[\w\.\-:]/) && stream.eat(";");
      }
      return ok ? "atom" : "error";
    } else {
      stream.eatWhile(/[^&<]/);
      return null;
    }
  }

  function inTag(stream, state) {
    var ch = stream.next();
    if (ch == ">" || (ch == "/" && stream.eat(">"))) {
      state.tokenize = inText;
      type = ch == ">" ? "endTag" : "selfcloseTag";
      return "tag bracket";
    } else if (ch == "=") {
      type = "equals";
      return null;
    } else if (ch == "<") {
      state.tokenize = inText;
      state.state = baseState;
      state.tagName = state.tagStart = null;
      var next = state.tokenize(stream, state);
      return next ? next + " tag error" : "tag error";
    } else if (/[\'\"]/.test(ch)) {
      state.tokenize = inAttribute(ch);
      state.stringStartCol = stream.column();
      return state.tokenize(stream, state);
    } else {
      stream.match(/^[^\s\u00a0=<>\"\']*[^\s\u00a0=<>\"\'\/]/);
      return "word";
    }
  }

  function inAttribute(quote) {
    var closure = function(stream, state) {
      while (!stream.eol()) {
        if (stream.next() == quote) {
          state.tokenize = inTag;
          break;
        }
      }
      return "string";
    };
    closure.isInAttribute = true;
    return closure;
  }

  function inBlock(style, terminator) {
    return function(stream, state) {
      while (!stream.eol()) {
        if (stream.match(terminator)) {
          state.tokenize = inText;
          break;
        }
        stream.next();
      }
      return style;
    };
  }
  function doctype(depth) {
    return function(stream, state) {
      var ch;
      while ((ch = stream.next()) != null) {
        if (ch == "<") {
          state.tokenize = doctype(depth + 1);
          return state.tokenize(stream, state);
        } else if (ch == ">") {
          if (depth == 1) {
            state.tokenize = inText;
            break;
          } else {
            state.tokenize = doctype(depth - 1);
            return state.tokenize(stream, state);
          }
        }
      }
      return "meta";
    };
  }

  function Context(state, tagName, startOfLine) {
    this.prev = state.context;
    this.tagName = tagName;
    this.indent = state.indented;
    this.startOfLine = startOfLine;
    if (Kludges.doNotIndent.hasOwnProperty(tagName) || (state.context && state.context.noIndent))
      this.noIndent = true;
  }
  function popContext(state) {
    if (state.context) state.context = state.context.prev;
  }
  function maybePopContext(state, nextTagName) {
    var parentTagName;
    while (true) {
      if (!state.context) {
        return;
      }
      parentTagName = state.context.tagName;
      if (!Kludges.contextGrabbers.hasOwnProperty(parentTagName) ||
          !Kludges.contextGrabbers[parentTagName].hasOwnProperty(nextTagName)) {
        return;
      }
      popContext(state);
    }
  }

  function baseState(type, stream, state) {
    if (type == "openTag") {
      state.tagStart = stream.column();
      return tagNameState;
    } else if (type == "closeTag") {
      return closeTagNameState;
    } else {
      return baseState;
    }
  }
  function tagNameState(type, stream, state) {
    if (type == "word") {
      state.tagName = stream.current();
      setStyle = "tag";
      return attrState;
    } else {
      setStyle = "error";
      return tagNameState;
    }
  }
  function closeTagNameState(type, stream, state) {
    if (type == "word") {
      var tagName = stream.current();
      if (state.context && state.context.tagName != tagName &&
          Kludges.implicitlyClosed.hasOwnProperty(state.context.tagName))
        popContext(state);
      if (state.context && state.context.tagName == tagName) {
        setStyle = "tag";
        return closeState;
      } else {
        setStyle = "tag error";
        return closeStateErr;
      }
    } else {
      setStyle = "error";
      return closeStateErr;
    }
  }

  function closeState(type, _stream, state) {
    if (type != "endTag") {
      setStyle = "error";
      return closeState;
    }
    popContext(state);
    return baseState;
  }
  function closeStateErr(type, stream, state) {
    setStyle = "error";
    return closeState(type, stream, state);
  }

  function attrState(type, _stream, state) {
    if (type == "word") {
      setStyle = "attribute";
      return attrEqState;
    } else if (type == "endTag" || type == "selfcloseTag") {
      var tagName = state.tagName, tagStart = state.tagStart;
      state.tagName = state.tagStart = null;
      if (type == "selfcloseTag" ||
          Kludges.autoSelfClosers.hasOwnProperty(tagName)) {
        maybePopContext(state, tagName);
      } else {
        maybePopContext(state, tagName);
        state.context = new Context(state, tagName, tagStart == state.indented);
      }
      return baseState;
    }
    setStyle = "error";
    return attrState;
  }
  function attrEqState(type, stream, state) {
    if (type == "equals") return attrValueState;
    if (!Kludges.allowMissing) setStyle = "error";
    return attrState(type, stream, state);
  }
  function attrValueState(type, stream, state) {
    if (type == "string") return attrContinuedState;
    if (type == "word" && Kludges.allowUnquoted) {setStyle = "string"; return attrState;}
    setStyle = "error";
    return attrState(type, stream, state);
  }
  function attrContinuedState(type, stream, state) {
    if (type == "string") return attrContinuedState;
    return attrState(type, stream, state);
  }

  return {
    startState: function() {
      return {tokenize: inText,
              state: baseState,
              indented: 0,
              tagName: null, tagStart: null,
              context: null};
    },

    token: function(stream, state) {
      if (!state.tagName && stream.sol())
        state.indented = stream.indentation();

      if (stream.eatSpace()) return null;
      type = null;
      var style = state.tokenize(stream, state);
      if ((style || type) && style != "comment") {
        setStyle = null;
        state.state = state.state(type || style, stream, state);
        if (setStyle)
          style = setStyle == "error" ? style + " error" : setStyle;
      }
      return style;
    },

    indent: function(state, textAfter, fullLine) {
      var context = state.context;
      // Indent multi-line strings (e.g. css).
      if (state.tokenize.isInAttribute) {
        if (state.tagStart == state.indented)
          return state.stringStartCol + 1;
        else
          return state.indented + indentUnit;
      }
      if (context && context.noIndent) return CodeMirror.Pass;
      if (state.tokenize != inTag && state.tokenize != inText)
        return fullLine ? fullLine.match(/^(\s*)/)[0].length : 0;
      // Indent the starts of attribute names.
      if (state.tagName) {
        if (multilineTagIndentPastTag)
          return state.tagStart + state.tagName.length + 2;
        else
          return state.tagStart + indentUnit * multilineTagIndentFactor;
      }
      if (alignCDATA && /<!\[CDATA\[/.test(textAfter)) return 0;
      var tagAfter = textAfter && /^<(\/)?([\w_:\.-]*)/.exec(textAfter);
      if (tagAfter && tagAfter[1]) { // Closing tag spotted
        while (context) {
          if (context.tagName == tagAfter[2]) {
            context = context.prev;
            break;
          } else if (Kludges.implicitlyClosed.hasOwnProperty(context.tagName)) {
            context = context.prev;
          } else {
            break;
          }
        }
      } else if (tagAfter) { // Opening tag spotted
        while (context) {
          var grabbers = Kludges.contextGrabbers[context.tagName];
          if (grabbers && grabbers.hasOwnProperty(tagAfter[2]))
            context = context.prev;
          else
            break;
        }
      }
      while (context && !context.startOfLine)
        context = context.prev;
      if (context) return context.indent + indentUnit;
      else return 0;
    },

    electricInput: /<\/[\s\w:]+>$/,
    blockCommentStart: "<!--",
    blockCommentEnd: "-->",

    configuration: parserConfig.htmlMode ? "html" : "xml",
    helperType: parserConfig.htmlMode ? "html" : "xml"
  };
});

CodeMirror.defineMIME("text/xml", "xml");
CodeMirror.defineMIME("application/xml", "xml");
if (!CodeMirror.mimeModes.hasOwnProperty("text/html"))
  CodeMirror.defineMIME("text/html", {name: "xml", htmlMode: true});

});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],6:[function(require,module,exports){
;(function(win){
	var store = {},
		doc = win.document,
		localStorageName = 'localStorage',
		scriptTag = 'script',
		storage

	store.disabled = false
	store.set = function(key, value) {}
	store.get = function(key) {}
	store.remove = function(key) {}
	store.clear = function() {}
	store.transact = function(key, defaultVal, transactionFn) {
		var val = store.get(key)
		if (transactionFn == null) {
			transactionFn = defaultVal
			defaultVal = null
		}
		if (typeof val == 'undefined') { val = defaultVal || {} }
		transactionFn(val)
		store.set(key, val)
	}
	store.getAll = function() {}
	store.forEach = function() {}

	store.serialize = function(value) {
		return JSON.stringify(value)
	}
	store.deserialize = function(value) {
		if (typeof value != 'string') { return undefined }
		try { return JSON.parse(value) }
		catch(e) { return value || undefined }
	}

	// Functions to encapsulate questionable FireFox 3.6.13 behavior
	// when about.config::dom.storage.enabled === false
	// See https://github.com/marcuswestin/store.js/issues#issue/13
	function isLocalStorageNameSupported() {
		try { return (localStorageName in win && win[localStorageName]) }
		catch(err) { return false }
	}

	if (isLocalStorageNameSupported()) {
		storage = win[localStorageName]
		store.set = function(key, val) {
			if (val === undefined) { return store.remove(key) }
			storage.setItem(key, store.serialize(val))
			return val
		}
		store.get = function(key) { return store.deserialize(storage.getItem(key)) }
		store.remove = function(key) { storage.removeItem(key) }
		store.clear = function() { storage.clear() }
		store.getAll = function() {
			var ret = {}
			store.forEach(function(key, val) {
				ret[key] = val
			})
			return ret
		}
		store.forEach = function(callback) {
			for (var i=0; i<storage.length; i++) {
				var key = storage.key(i)
				callback(key, store.get(key))
			}
		}
	} else if (doc.documentElement.addBehavior) {
		var storageOwner,
			storageContainer
		// Since #userData storage applies only to specific paths, we need to
		// somehow link our data to a specific path.  We choose /favicon.ico
		// as a pretty safe option, since all browsers already make a request to
		// this URL anyway and being a 404 will not hurt us here.  We wrap an
		// iframe pointing to the favicon in an ActiveXObject(htmlfile) object
		// (see: http://msdn.microsoft.com/en-us/library/aa752574(v=VS.85).aspx)
		// since the iframe access rules appear to allow direct access and
		// manipulation of the document element, even for a 404 page.  This
		// document can be used instead of the current document (which would
		// have been limited to the current path) to perform #userData storage.
		try {
			storageContainer = new ActiveXObject('htmlfile')
			storageContainer.open()
			storageContainer.write('<'+scriptTag+'>document.w=window</'+scriptTag+'><iframe src="/favicon.ico"></iframe>')
			storageContainer.close()
			storageOwner = storageContainer.w.frames[0].document
			storage = storageOwner.createElement('div')
		} catch(e) {
			// somehow ActiveXObject instantiation failed (perhaps some special
			// security settings or otherwse), fall back to per-path storage
			storage = doc.createElement('div')
			storageOwner = doc.body
		}
		function withIEStorage(storeFunction) {
			return function() {
				var args = Array.prototype.slice.call(arguments, 0)
				args.unshift(storage)
				// See http://msdn.microsoft.com/en-us/library/ms531081(v=VS.85).aspx
				// and http://msdn.microsoft.com/en-us/library/ms531424(v=VS.85).aspx
				storageOwner.appendChild(storage)
				storage.addBehavior('#default#userData')
				storage.load(localStorageName)
				var result = storeFunction.apply(store, args)
				storageOwner.removeChild(storage)
				return result
			}
		}

		// In IE7, keys cannot start with a digit or contain certain chars.
		// See https://github.com/marcuswestin/store.js/issues/40
		// See https://github.com/marcuswestin/store.js/issues/83
		var forbiddenCharsRegex = new RegExp("[!\"#$%&'()*+,/\\\\:;<=>?@[\\]^`{|}~]", "g")
		function ieKeyFix(key) {
			return key.replace(/^d/, '___$&').replace(forbiddenCharsRegex, '___')
		}
		store.set = withIEStorage(function(storage, key, val) {
			key = ieKeyFix(key)
			if (val === undefined) { return store.remove(key) }
			storage.setAttribute(key, store.serialize(val))
			storage.save(localStorageName)
			return val
		})
		store.get = withIEStorage(function(storage, key) {
			key = ieKeyFix(key)
			return store.deserialize(storage.getAttribute(key))
		})
		store.remove = withIEStorage(function(storage, key) {
			key = ieKeyFix(key)
			storage.removeAttribute(key)
			storage.save(localStorageName)
		})
		store.clear = withIEStorage(function(storage) {
			var attributes = storage.XMLDocument.documentElement.attributes
			storage.load(localStorageName)
			for (var i=0, attr; attr=attributes[i]; i++) {
				storage.removeAttribute(attr.name)
			}
			storage.save(localStorageName)
		})
		store.getAll = function(storage) {
			var ret = {}
			store.forEach(function(key, val) {
				ret[key] = val
			})
			return ret
		}
		store.forEach = withIEStorage(function(storage, callback) {
			var attributes = storage.XMLDocument.documentElement.attributes
			for (var i=0, attr; attr=attributes[i]; ++i) {
				callback(attr.name, store.deserialize(storage.getAttribute(attr.name)))
			}
		})
	}

	try {
		var testKey = '__storejs__'
		store.set(testKey, testKey)
		if (store.get(testKey) != testKey) { store.disabled = true }
		store.remove(testKey)
	} catch(e) {
		store.disabled = true
	}
	store.enabled = !store.disabled

	if (typeof module != 'undefined' && module.exports && this.module !== module) { module.exports = store }
	else if (typeof define === 'function' && define.amd) { define(store) }
	else { win.store = store }

})(Function('return this')());

},{}],7:[function(require,module,exports){
module.exports={
  "name": "yasgui-utils",
  "version": "1.3.1",
  "description": "Utils for YASGUI libs",
  "main": "src/main.js",
  "repository": {
    "type": "git",
    "url": "git://github.com/YASGUI/Utils.git"
  },
  "licenses": [
    {
      "type": "MIT",
      "url": "http://yasgui.github.io/license.txt"
    }
  ],
  "author": {
    "name": "Laurens Rietveld"
  },
  "maintainers": [
    {
      "name": "Laurens Rietveld",
      "email": "laurens.rietveld@gmail.com",
      "url": "http://laurensrietveld.nl"
    }
  ],
  "bugs": {
    "url": "https://github.com/YASGUI/Utils/issues"
  },
  "homepage": "https://github.com/YASGUI/Utils",
  "dependencies": {
    "store": "^1.3.14"
  },
  "readme": "A simple utils repo for the YASGUI tools\n",
  "readmeFilename": "README.md",
  "_id": "yasgui-utils@1.3.1",
  "dist": {
    "shasum": "37776ecd4f25eb709b37952ad0675c6d0faea408"
  },
  "_from": "yasgui-utils@1.3.1",
  "_resolved": "https://registry.npmjs.org/yasgui-utils/-/yasgui-utils-1.3.1.tgz"
}

},{}],8:[function(require,module,exports){
(function (global){
/**
 * Determine unique ID of the YASQE object. Useful when several objects are
 * loaded on the same page, and all have 'persistency' enabled. Currently, the
 * ID is determined by selecting the nearest parent in the DOM with an ID set
 * 
 * @param doc {YASQE}
 * @method YASQE.determineId
 */
var root = module.exports = function(element) {
	return (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null)(element).closest('[id]').attr('id');
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],9:[function(require,module,exports){
var root = module.exports = {
	cross: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" width="30px" height="30px" viewBox="0 0 100 100" enable-background="new 0 0 100 100" xml:space="preserve"><g>	<path d="M83.288,88.13c-2.114,2.112-5.575,2.112-7.689,0L53.659,66.188c-2.114-2.112-5.573-2.112-7.687,0L24.251,87.907   c-2.113,2.114-5.571,2.114-7.686,0l-4.693-4.691c-2.114-2.114-2.114-5.573,0-7.688l21.719-21.721c2.113-2.114,2.113-5.573,0-7.686   L11.872,24.4c-2.114-2.113-2.114-5.571,0-7.686l4.842-4.842c2.113-2.114,5.571-2.114,7.686,0L46.12,33.591   c2.114,2.114,5.572,2.114,7.688,0l21.721-21.719c2.114-2.114,5.573-2.114,7.687,0l4.695,4.695c2.111,2.113,2.111,5.571-0.003,7.686   L66.188,45.973c-2.112,2.114-2.112,5.573,0,7.686L88.13,75.602c2.112,2.111,2.112,5.572,0,7.687L83.288,88.13z"/></g></svg>',
	check: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" width="30px" height="30px" viewBox="0 0 100 100" enable-background="new 0 0 100 100" xml:space="preserve"><path fill="#000000" d="M14.301,49.982l22.606,17.047L84.361,4.903c2.614-3.733,7.76-4.64,11.493-2.026l0.627,0.462  c3.732,2.614,4.64,7.758,2.025,11.492l-51.783,79.77c-1.955,2.791-3.896,3.762-7.301,3.988c-3.405,0.225-5.464-1.039-7.508-3.084  L2.447,61.814c-3.263-3.262-3.263-8.553,0-11.814l0.041-0.019C5.75,46.718,11.039,46.718,14.301,49.982z"/></svg>',
	unsorted: '<svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   version="1.1"   id="Layer_1"   x="0px"   y="0px"   width="100%"   height="100%"   viewBox="0 0 54.552711 113.78478"   enable-background="new 0 0 100 100"   xml:space="preserve"><g     id="g5"     transform="matrix(-0.70522156,-0.70898699,-0.70898699,0.70522156,97.988199,55.081205)"><path       style="fill:#000000"       inkscape:connector-curvature="0"       id="path7"       d="M 57.911,66.915 45.808,55.063 42.904,52.238 31.661,41.25 31.435,41.083 31.131,40.775 30.794,40.523 30.486,40.3 30.069,40.05 29.815,39.911 29.285,39.659 29.089,39.576 28.474,39.326 28.363,39.297 H 28.336 L 27.665,39.128 27.526,39.1 26.94,38.99 26.714,38.961 26.212,38.934 h -0.31 -0.444 l -0.339,0.027 c -1.45,0.139 -2.876,0.671 -4.11,1.564 l -0.223,0.141 -0.279,0.25 -0.335,0.308 -0.054,0.029 -0.171,0.194 -0.334,0.364 -0.224,0.279 -0.25,0.336 -0.225,0.362 -0.192,0.308 -0.197,0.421 -0.142,0.279 -0.193,0.477 -0.084,0.222 -12.441,38.414 c -0.814,2.458 -0.313,5.029 1.115,6.988 v 0.026 l 0.418,0.532 0.17,0.165 0.251,0.281 0.084,0.079 0.283,0.281 0.25,0.194 0.474,0.367 0.083,0.053 c 2.015,1.371 4.641,1.874 7.131,1.094 L 55.228,80.776 c 4.303,-1.342 6.679,-5.814 5.308,-10.006 -0.387,-1.259 -1.086,-2.35 -1.979,-3.215 l -0.368,-0.337 -0.278,-0.303 z m -6.318,5.896 0.079,0.114 -37.369,11.57 11.854,-36.538 10.565,10.317 2.876,2.825 11.995,11.712 z" /></g><path     style="fill:#000000"     inkscape:connector-curvature="0"     id="path7-9"     d="m 8.8748339,52.571766 16.9382111,-0.222584 4.050851,-0.06665 15.719154,-0.222166 0.27778,-0.04246 0.43276,0.0017 0.41632,-0.06121 0.37532,-0.0611 0.47132,-0.119342 0.27767,-0.08206 0.55244,-0.198047 0.19707,-0.08043 0.61095,-0.259721 0.0988,-0.05825 0.019,-0.01914 0.59303,-0.356548 0.11787,-0.0788 0.49125,-0.337892 0.17994,-0.139779 0.37317,-0.336871 0.21862,-0.219786 0.31311,-0.31479 0.21993,-0.259387 c 0.92402,-1.126057 1.55249,-2.512251 1.78961,-4.016904 l 0.0573,-0.25754 0.0195,-0.374113 0.0179,-0.454719 0.0175,-0.05874 -0.0169,-0.258049 -0.0225,-0.493503 -0.0398,-0.355569 -0.0619,-0.414201 -0.098,-0.414812 -0.083,-0.353334 L 53.23955,41.1484 53.14185,40.850967 52.93977,40.377742 52.84157,40.161628 34.38021,4.2507375 C 33.211567,1.9401875 31.035446,0.48226552 28.639484,0.11316952 l -0.01843,-0.01834 -0.671963,-0.07882 -0.236871,0.0042 L 27.335984,-4.7826577e-7 27.220736,0.00379952 l -0.398804,0.0025 -0.313848,0.04043 -0.594474,0.07724 -0.09611,0.02147 C 23.424549,0.60716252 21.216017,2.1142355 20.013025,4.4296865 L 0.93967491,40.894479 c -2.08310801,3.997178 -0.588125,8.835482 3.35080799,10.819749 1.165535,0.613495 2.43199,0.88731 3.675026,0.864202 l 0.49845,-0.02325 0.410875,0.01658 z M 9.1502369,43.934401 9.0136999,43.910011 27.164145,9.2564625 44.70942,43.42818 l -14.765289,0.214677 -4.031106,0.0468 -16.7627881,0.244744 z" /></svg>',
	sortDesc: '<svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   version="1.1"   id="Layer_1"   x="0px"   y="0px"   width="100%"   height="100%"   viewBox="0 0 54.552711 113.78478"   enable-background="new 0 0 100 100"   xml:space="preserve"><g     id="g5"     transform="matrix(-0.70522156,-0.70898699,-0.70898699,0.70522156,97.988199,55.081205)"><path       style="fill:#000000"       inkscape:connector-curvature="0"       id="path7"       d="M 57.911,66.915 45.808,55.063 42.904,52.238 31.661,41.25 31.435,41.083 31.131,40.775 30.794,40.523 30.486,40.3 30.069,40.05 29.815,39.911 29.285,39.659 29.089,39.576 28.474,39.326 28.363,39.297 H 28.336 L 27.665,39.128 27.526,39.1 26.94,38.99 26.714,38.961 26.212,38.934 h -0.31 -0.444 l -0.339,0.027 c -1.45,0.139 -2.876,0.671 -4.11,1.564 l -0.223,0.141 -0.279,0.25 -0.335,0.308 -0.054,0.029 -0.171,0.194 -0.334,0.364 -0.224,0.279 -0.25,0.336 -0.225,0.362 -0.192,0.308 -0.197,0.421 -0.142,0.279 -0.193,0.477 -0.084,0.222 -12.441,38.414 c -0.814,2.458 -0.313,5.029 1.115,6.988 v 0.026 l 0.418,0.532 0.17,0.165 0.251,0.281 0.084,0.079 0.283,0.281 0.25,0.194 0.474,0.367 0.083,0.053 c 2.015,1.371 4.641,1.874 7.131,1.094 L 55.228,80.776 c 4.303,-1.342 6.679,-5.814 5.308,-10.006 -0.387,-1.259 -1.086,-2.35 -1.979,-3.215 l -0.368,-0.337 -0.278,-0.303 z m -6.318,5.896 0.079,0.114 -37.369,11.57 11.854,-36.538 10.565,10.317 2.876,2.825 11.995,11.712 z" /></g><path     style="fill:#000000"     inkscape:connector-curvature="0"     id="path9"     d="m 27.813273,0.12823506 0.09753,0.02006 c 2.39093,0.458209 4.599455,1.96811104 5.80244,4.28639004 L 52.785897,40.894525 c 2.088044,4.002139 0.590949,8.836902 -3.348692,10.821875 -1.329078,0.688721 -2.766603,0.943695 -4.133174,0.841768 l -0.454018,0.02 L 27.910392,52.354171 23.855313,52.281851 8.14393,52.061827 7.862608,52.021477 7.429856,52.021738 7.014241,51.959818 6.638216,51.900838 6.164776,51.779369 5.889216,51.699439 5.338907,51.500691 5.139719,51.419551 4.545064,51.145023 4.430618,51.105123 4.410168,51.084563 3.817138,50.730843 3.693615,50.647783 3.207314,50.310611 3.028071,50.174369 2.652795,49.833957 2.433471,49.613462 2.140099,49.318523 1.901127,49.041407 C 0.97781,47.916059 0.347935,46.528448 0.11153,45.021676 L 0.05352,44.766255 0.05172,44.371683 0.01894,43.936017 0,43.877277 0.01836,43.62206 0.03666,43.122889 0.0765,42.765905 0.13912,42.352413 0.23568,41.940425 0.32288,41.588517 0.481021,41.151945 0.579391,40.853806 0.77369,40.381268 0.876097,40.162336 19.338869,4.2542801 c 1.172169,-2.308419 3.34759,-3.76846504 5.740829,-4.17716604 l 0.01975,0.01985 0.69605,-0.09573 0.218437,0.0225 0.490791,-0.02132 0.39809,0.0046 0.315972,0.03973 0.594462,0.08149 z" /></svg>',
	sortAsc: '<svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   version="1.1"   id="Layer_1"   x="0px"   y="0px"   width="100%"   height="100%"   viewBox="0 0 54.552711 113.78478"   enable-background="new 0 0 100 100"   xml:space="preserve"><g     id="g5"     transform="matrix(-0.70522156,0.70898699,-0.70898699,-0.70522156,97.988199,58.704807)"><path       style="fill:#000000"       inkscape:connector-curvature="0"       id="path7"       d="M 57.911,66.915 45.808,55.063 42.904,52.238 31.661,41.25 31.435,41.083 31.131,40.775 30.794,40.523 30.486,40.3 30.069,40.05 29.815,39.911 29.285,39.659 29.089,39.576 28.474,39.326 28.363,39.297 H 28.336 L 27.665,39.128 27.526,39.1 26.94,38.99 26.714,38.961 26.212,38.934 h -0.31 -0.444 l -0.339,0.027 c -1.45,0.139 -2.876,0.671 -4.11,1.564 l -0.223,0.141 -0.279,0.25 -0.335,0.308 -0.054,0.029 -0.171,0.194 -0.334,0.364 -0.224,0.279 -0.25,0.336 -0.225,0.362 -0.192,0.308 -0.197,0.421 -0.142,0.279 -0.193,0.477 -0.084,0.222 -12.441,38.414 c -0.814,2.458 -0.313,5.029 1.115,6.988 v 0.026 l 0.418,0.532 0.17,0.165 0.251,0.281 0.084,0.079 0.283,0.281 0.25,0.194 0.474,0.367 0.083,0.053 c 2.015,1.371 4.641,1.874 7.131,1.094 L 55.228,80.776 c 4.303,-1.342 6.679,-5.814 5.308,-10.006 -0.387,-1.259 -1.086,-2.35 -1.979,-3.215 l -0.368,-0.337 -0.278,-0.303 z m -6.318,5.896 0.079,0.114 -37.369,11.57 11.854,-36.538 10.565,10.317 2.876,2.825 11.995,11.712 z" /></g><path     style="fill:#000000"     inkscape:connector-curvature="0"     id="path9"     d="m 27.813273,113.65778 0.09753,-0.0201 c 2.39093,-0.45821 4.599455,-1.96811 5.80244,-4.28639 L 52.785897,72.891487 c 2.088044,-4.002139 0.590949,-8.836902 -3.348692,-10.821875 -1.329078,-0.688721 -2.766603,-0.943695 -4.133174,-0.841768 l -0.454018,-0.02 -16.939621,0.223997 -4.055079,0.07232 -15.711383,0.220024 -0.281322,0.04035 -0.432752,-2.61e-4 -0.415615,0.06192 -0.376025,0.05898 -0.47344,0.121469 -0.27556,0.07993 -0.550309,0.198748 -0.199188,0.08114 -0.594655,0.274528 -0.114446,0.0399 -0.02045,0.02056 -0.59303,0.35372 -0.123523,0.08306 -0.486301,0.337172 -0.179243,0.136242 -0.375276,0.340412 -0.219324,0.220495 -0.293372,0.294939 -0.238972,0.277116 C 0.97781,65.869953 0.347935,67.257564 0.11153,68.764336 L 0.05352,69.019757 0.05172,69.414329 0.01894,69.849995 0,69.908735 l 0.01836,0.255217 0.0183,0.499171 0.03984,0.356984 0.06262,0.413492 0.09656,0.411988 0.0872,0.351908 0.158141,0.436572 0.09837,0.298139 0.194299,0.472538 0.102407,0.218932 18.462772,35.908054 c 1.172169,2.30842 3.34759,3.76847 5.740829,4.17717 l 0.01975,-0.0199 0.69605,0.0957 0.218437,-0.0225 0.490791,0.0213 0.39809,-0.005 0.315972,-0.0397 0.594462,-0.0815 z" /></svg>',
	loader: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="100%" height="100%" fill="black">  <circle cx="16" cy="3" r="0">    <animate attributeName="r" values="0;3;0;0" dur="1s" repeatCount="indefinite" begin="0" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" />  </circle>  <circle transform="rotate(45 16 16)" cx="16" cy="3" r="0">    <animate attributeName="r" values="0;3;0;0" dur="1s" repeatCount="indefinite" begin="0.125s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" />  </circle>  <circle transform="rotate(90 16 16)" cx="16" cy="3" r="0">    <animate attributeName="r" values="0;3;0;0" dur="1s" repeatCount="indefinite" begin="0.25s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" />  </circle>  <circle transform="rotate(135 16 16)" cx="16" cy="3" r="0">    <animate attributeName="r" values="0;3;0;0" dur="1s" repeatCount="indefinite" begin="0.375s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" />  </circle>  <circle transform="rotate(180 16 16)" cx="16" cy="3" r="0">    <animate attributeName="r" values="0;3;0;0" dur="1s" repeatCount="indefinite" begin="0.5s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" />  </circle>  <circle transform="rotate(225 16 16)" cx="16" cy="3" r="0">    <animate attributeName="r" values="0;3;0;0" dur="1s" repeatCount="indefinite" begin="0.625s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" />  </circle>  <circle transform="rotate(270 16 16)" cx="16" cy="3" r="0">    <animate attributeName="r" values="0;3;0;0" dur="1s" repeatCount="indefinite" begin="0.75s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" />  </circle>  <circle transform="rotate(315 16 16)" cx="16" cy="3" r="0">    <animate attributeName="r" values="0;3;0;0" dur="1s" repeatCount="indefinite" begin="0.875s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" />  </circle>  <circle transform="rotate(180 16 16)" cx="16" cy="3" r="0">    <animate attributeName="r" values="0;3;0;0" dur="1s" repeatCount="indefinite" begin="0.5s" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" />  </circle></svg>',
	query: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" width="100%" height="100%" viewBox="0 0 80 80" enable-background="new 0 0 80 80" xml:space="preserve"><g id="Layer_1"></g><g id="Layer_2">	<path d="M64.622,2.411H14.995c-6.627,0-12,5.373-12,12v49.897c0,6.627,5.373,12,12,12h49.627c6.627,0,12-5.373,12-12V14.411   C76.622,7.783,71.249,2.411,64.622,2.411z M24.125,63.906V15.093L61,39.168L24.125,63.906z"/></g></svg>',
	queryInvalid: '<svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   version="1.1"   x="0px"   y="0px"   width="100%"   height="100%"   viewBox="0 0 73.627 73.897"   enable-background="new 0 0 80 80"   xml:space="preserve"   ><g     id="Layer_1"     transform="translate(-2.995,-2.411)" /><g     id="Layer_2"     transform="translate(-2.995,-2.411)"><path       d="M 64.622,2.411 H 14.995 c -6.627,0 -12,5.373 -12,12 v 49.897 c 0,6.627 5.373,12 12,12 h 49.627 c 6.627,0 12,-5.373 12,-12 V 14.411 c 0,-6.628 -5.373,-12 -12,-12 z M 24.125,63.906 V 15.093 L 61,39.168 24.125,63.906 z"       id="path6"       inkscape:connector-curvature="0" /></g><g     transform="matrix(0.76805408,0,0,0.76805408,-0.90231954,-2.0060895)"     id="g3"><path       style="fill:#c02608;fill-opacity:1"       inkscape:connector-curvature="0"       d="m 88.184,81.468 c 1.167,1.167 1.167,3.075 0,4.242 l -2.475,2.475 c -1.167,1.167 -3.076,1.167 -4.242,0 l -69.65,-69.65 c -1.167,-1.167 -1.167,-3.076 0,-4.242 l 2.476,-2.476 c 1.167,-1.167 3.076,-1.167 4.242,0 l 69.649,69.651 z"       id="path5" /></g><g     transform="matrix(0.76805408,0,0,0.76805408,-0.90231954,-2.0060895)"     id="g7"><path       style="fill:#c02608;fill-opacity:1"       inkscape:connector-curvature="0"       d="m 18.532,88.184 c -1.167,1.166 -3.076,1.166 -4.242,0 l -2.475,-2.475 c -1.167,-1.166 -1.167,-3.076 0,-4.242 l 69.65,-69.651 c 1.167,-1.167 3.075,-1.167 4.242,0 l 2.476,2.476 c 1.166,1.167 1.166,3.076 0,4.242 l -69.651,69.65 z"       id="path9" /></g></svg>',
	download: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" baseProfile="tiny" x="0px" y="0px" width="100%" height="100%" viewBox="0 0 100 100" xml:space="preserve"><g id="Captions"></g><g id="Your_Icon">	<path fill-rule="evenodd" fill="#000000" d="M88,84v-2c0-2.961-0.859-4-4-4H16c-2.961,0-4,0.98-4,4v2c0,3.102,1.039,4,4,4h68   C87.02,88,88,87.039,88,84z M58,12H42c-5,0-6,0.941-6,6v22H16l34,34l34-34H64V18C64,12.941,62.939,12,58,12z"/></g></svg>',
	share: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Icons" x="0px" y="0px" width="100%" height="100%" viewBox="0 0 100 100" style="enable-background:new 0 0 100 100;" xml:space="preserve"><path id="ShareThis" d="M36.764,50c0,0.308-0.07,0.598-0.088,0.905l32.247,16.119c2.76-2.338,6.293-3.797,10.195-3.797  C87.89,63.228,95,70.338,95,79.109C95,87.89,87.89,95,79.118,95c-8.78,0-15.882-7.11-15.882-15.891c0-0.316,0.07-0.598,0.088-0.905  L31.077,62.085c-2.769,2.329-6.293,3.788-10.195,3.788C12.11,65.873,5,58.771,5,50c0-8.78,7.11-15.891,15.882-15.891  c3.902,0,7.427,1.468,10.195,3.797l32.247-16.119c-0.018-0.308-0.088-0.598-0.088-0.914C63.236,12.11,70.338,5,79.118,5  C87.89,5,95,12.11,95,20.873c0,8.78-7.11,15.891-15.882,15.891c-3.911,0-7.436-1.468-10.195-3.806L36.676,49.086  C36.693,49.394,36.764,49.684,36.764,50z"/></svg>',
	draw: function(parent, config) {
		if (!parent) return;
		var el = root.getElement(config);
		if (el) {
			$(parent).append(el);
		}
	},
	getElement: function(config) {
		var svgString = (config.id? root[config.id]: config.value);
		if (svgString && svgString.indexOf("<svg") == 0) {
			if (!config.width) config.width = "100%";
			if (!config.height) config.height = "100%";
			
			var parser = new DOMParser();
			var dom = parser.parseFromString(svgString, "text/xml");
			var svg = dom.documentElement;
			
			var svgContainer = document.createElement("div");
			svgContainer.style.display = "inline-block";
			svgContainer.style.width = config.width;
			svgContainer.style.height = config.height;
			svgContainer.appendChild(svg);
			return svgContainer;
		}
		return false;
	}
};
},{}],10:[function(require,module,exports){
window.console = window.console || {"log":function(){}};//make sure any console statements don't break IE
module.exports = {
	storage: require("./storage.js"),
	determineId: require("./determineId.js"),
	imgs: require("./imgs.js"),
	version: {
		"yasgui-utils" : require("../package.json").version,
	}
};

},{"../package.json":7,"./determineId.js":8,"./imgs.js":9,"./storage.js":11}],11:[function(require,module,exports){
var store = require("store");
var times = {
	day: function() {
		return 1000 * 3600 * 24;//millis to day
	},
	month: function() {
		times.day() * 30;
	},
	year: function() {
		times.month() * 12;
	}
};

var root = module.exports = {
	set : function(key, val, exp) {
		if (typeof exp == "string") {
			exp = times[exp]();
		}
		store.set(key, {
			val : val,
			exp : exp,
			time : new Date().getTime()
		});
	},
	get : function(key) {
		var info = store.get(key);
		if (!info) {
			return null;
		}
		if (info.exp && new Date().getTime() - info.time > info.exp) {
			return null;
		}
		return info.val;
	}

};
},{"store":6}],12:[function(require,module,exports){
module.exports={
  "name": "yasgui-yasr",
  "description": "Yet Another SPARQL Resultset GUI",
  "version": "1.2.1",
  "main": "src/main.js",
  "licenses": [
    {
      "type": "MIT",
      "url": "http://yasr.yasgui.org/license.txt"
    }
  ],
  "author": "Laurens Rietveld",
  "homepage": "http://yasr.yasgui.org",
  "devDependencies": {
    "browserify": "^6.1.0",
    "gulp": "~3.6.0",
    "gulp-bump": "^0.1.11",
    "gulp-concat": "^2.4.1",
    "gulp-connect": "^2.0.5",
    "gulp-embedlr": "^0.5.2",
    "gulp-filter": "^1.0.2",
    "gulp-git": "^0.5.2",
    "gulp-jsvalidate": "^0.2.0",
    "gulp-livereload": "^1.3.1",
    "gulp-minify-css": "^0.3.0",
    "gulp-notify": "^1.2.5",
    "gulp-rename": "^1.2.0",
    "gulp-streamify": "0.0.5",
    "gulp-tag-version": "^1.1.0",
    "gulp-uglify": "^0.2.1",
    "require-dir": "^0.1.0",
    "run-sequence": "^1.0.1",
    "vinyl-buffer": "0.0.0",
    "vinyl-source-stream": "~0.1.1",
    "watchify": "^0.6.4",
    "browserify-shim": "^3.8.0"
  },
  "bugs": "https://github.com/YASGUI/YASR/issues/",
  "keywords": [
    "JavaScript",
    "SPARQL",
    "Editor",
    "Semantic Web",
    "Linked Data"
  ],
  "homepage": "http://yasr.yasgui.org",
  "maintainers": [
    {
      "name": "Laurens Rietveld",
      "email": "laurens.rietveld@gmail.com",
      "web": "http://laurensrietveld.nl"
    }
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/YASGUI/YASR.git"
  },
  "dependencies": {
    "jquery": "~ 1.11.0",
    "codemirror": "^4.2.0",
    "twitter-bootstrap-3.0.0": "^3.0.0",
    "yasgui-utils": "^1.3.0",
    "yasgui-yasqe": "^1.5.1"
  },
  "browserify-shim": {
    "jquery": "global:jQuery",
    "codemirror": "global:CodeMirror",
    "../../lib/codemirror": "global:CodeMirror"
  }
}

},{}],13:[function(require,module,exports){
module.exports = function(result) {
	var quote = "\"";
	var delimiter = ",";
	var lineBreak= "\n";
	
	var variables = result.head.vars;
	
	var querySolutions= result.results.bindings;
	
	
	
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
			if(querySolution.hasOwnProperty(variable)){
				addValueToString(querySolution[variable]["value"]);
			} else {
				addValueToString("");
			}
		}
	};
	var addValueToString = function(value) {
		//Quotes in the string need to be escaped
		value.replace(quote, quote + quote);
		if (needToQuoteString(value)) {
			value = quote + value + quote;
		}
		csvString += " " + value + " " + delimiter;
	};
	
	var needToQuoteString = function(value) {
		//quote when it contains whitespace or the delimiter
		var needQuoting = false;
		if (value.match("[\\w|"+ delimiter + "|" + quote + "]")) {
			needQuoting = true;
		}
		return needQuoting;
	};
	
	csvString = "";
	createHeader();
	createBody();
	return csvString;
};
},{}],14:[function(require,module,exports){
(function (global){
var $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null);

/**
 * Constructor of plugin which displays boolean info
 * 
 * @param yasr {object}
 * @param parent {DOM element}
 * @param options {object}
 * @class YASR.plugins.boolean
 * @return yasr-boolean (doc)
 * 
 */
var root = module.exports = function(yasr, parent, options) {
	var plugin = {};
	plugin.container = $("<div class='booleanResult'></div>");
	plugin.options = $.extend(true, {}, root.defaults, options);
	plugin.parent = parent;
	plugin.yasr = yasr;
	
	plugin.draw = function() {
		root.draw(plugin);
	};
	
	plugin.name =  null;//don't need to set this: we don't show it in the selection widget anyway, so don't need a human-friendly name
	/**
	 * Hide this plugin from selection widget
	 * 
	 * @property hideFromSelection
	 * @type boolean
	 * @default true
	 */
	plugin.hideFromSelection = true;
	/**
	 * Check whether this plugin can handler the current results
	 * 
	 * @property canHandleResults
	 * @type function
	 * @default If resultset contains boolean val, return true
	 */
	plugin.canHandleResults = function(yasr){return yasr.results.getBoolean() === true || yasr.results.getBoolean() == false;};
	/**
	 * If we need to dynamically check which plugin to use, we rank the possible plugins by priority, and select the highest one
	 * 
	 * @property getPriority
	 * @param yasrDoc
	 * @type int|function
	 * @default 10
	 */
	plugin.getPriority = 10;
	
	
	return plugin;
};

root.draw = function(plugin) {
	plugin.container.empty().appendTo(plugin.parent);
	var booleanVal = plugin.yasr.results.getBoolean();
	
	var imgId = null;
	var textVal = null;
	if (booleanVal === true) {
		imgId = "check";
		textVal = "True";
	} else if (booleanVal === false) {
		imgId = "cross";
		textVal = "False";
	} else {
		plugin.container.width("140");
		textVal = "Could not find boolean value in response";
	}
	
	//add icon
	if (imgId) require("yasgui-utils").imgs.draw(plugin.container, {
		width: 25,
		height: 25,
		id: imgId,
	});
	
	$("<span></span>").text(textVal).appendTo(plugin.container);
};

root.version = {
	"YASR-boolean" : require("../package.json").version,
	"jquery": $.fn.jquery,
};


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../package.json":12,"yasgui-utils":10}],15:[function(require,module,exports){
(function (global){
var $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null);

/**
 * Constructor of plugin which displays SPARQL errors
 * 
 * @param yasr {object}
 * @param parent {DOM element}
 * @param options {object}
 * @class YASR.plugins.boolean
 * @return yasr-erro (doc)
 * 
 */
var root = module.exports = function(yasr, parent, options) {
	var plugin = {};
	plugin.container = $("<div class='errorResult'></div>");
	plugin.options = $.extend(true, {}, root.defaults, options);
	plugin.parent = parent;
	plugin.yasr = yasr;
	
	plugin.draw = function() {
		plugin.container.empty().appendTo(plugin.parent);
		$("<span class='exception'>ERROR</span>").appendTo(plugin.container);
		$("<p></p>").html(plugin.yasr.results.getException()).appendTo(plugin.container);
	};
	
	plugin.name =  null;//don't need to set this: we don't show it in the selection widget anyway, so don't need a human-friendly name
	/**
	 * Hide this plugin from selection widget
	 * 
	 * @property hideFromSelection
	 * @type boolean
	 * @default true
	 */
	plugin.hideFromSelection = true;
	/**
	 * Check whether this plugin can handler the current results
	 * 
	 * @property canHandleResults
	 * @type function
	 * @default If resultset contains an exception, return true
	 */
	plugin.canHandleResults = function(yasr){return yasr.results.getException() || false;};
	/**
	 * If we need to dynamically check which plugin to use, we rank the possible plugins by priority, and select the highest one
	 * 
	 * @property getPriority
	 * @param yasrDoc
	 * @type int|function
	 * @default 10
	 */
	plugin.getPriority = 20;
	
	
	return plugin;
};

/**
 * Defaults for error plugin
 * 
 * @type object
 * @attribute YASR.plugins.error.defaults
 */
root.defaults = {
	
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],16:[function(require,module,exports){
(function (global){
var $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null);
var root = module.exports = function(queryResponse) {
	return require("./dlv.js")(queryResponse, ",");
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./dlv.js":17}],17:[function(require,module,exports){
(function (global){
var $ = jQuery = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null);
require("../../lib/jquery.csv-0.71.js");
var root = module.exports = function(queryResponse, separator) {
	var json = {};
	var arrays =  $.csv.toArrays(queryResponse, {separator: separator});
	var detectType = function(value) {
		if (value.indexOf("http") == 0) {
			return "uri";
		} else {
			return null;
		}
	};
	
	var getBoolean = function() {
		if (arrays.length == 2 && arrays[0].length == 1 && arrays[1].length == 1
				&& arrays[0][0] == "boolean" && (arrays[1][0] == "1" || arrays[1][0] == "0")) {
			json.boolean = (arrays[1][0] == "1"? true: false);
			return true;
		}
		return false;
	};
	
	var getVariables = function() {
		if (arrays.length > 0 && arrays[0].length > 0) {
			json.head = {vars: arrays[0]};
			return true;
		}
		return false;
	};
	
	var getBindings = function() {
		if (arrays.length > 1) {
			json.results = {bindings: []};
			for (var rowIt = 1; rowIt < arrays.length; rowIt++) {
				var binding = {};
				for (var colIt = 0; colIt < arrays[rowIt].length; colIt++) {
					var varName = json.head.vars[colIt];
					if (varName) {
						var value = arrays[rowIt][colIt];
						var detectedType = detectType(value);
						binding[varName] = {value: value};
						if (detectedType) binding[varName].type = detectedType;
					}
				}
				
				json.results.bindings.push(binding);
			}
			json.head = {vars: arrays[0]};
			return true;
		}
		return false;
	};
	var isBoolean = getBoolean();
	if (!isBoolean) {
		var varsFetched = getVariables();
		if (varsFetched) getBindings();
	}
	
	return json;
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../../lib/jquery.csv-0.71.js":2}],18:[function(require,module,exports){
(function (global){
var $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null);
var root = module.exports = function(queryResponse) {
	
	if (typeof queryResponse == "string") {
		try {
			return JSON.parse(queryResponse);
	    } catch (e) {
	        return false;
	    }
	}
	if (typeof queryResponse == "object" && queryResponse.constructor === {}.constructor) {
		return queryResponse;
	}
	return false;
	
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],19:[function(require,module,exports){
(function (global){
var $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null);
var root = module.exports = function(queryResponse) {
	return require("./dlv.js")(queryResponse, "\t");
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./dlv.js":17}],20:[function(require,module,exports){
(function (global){
var $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null);

var root = module.exports = function(queryResponse) {
	var parsers = {
		xml: require("./xml.js"),
		json: require("./json.js"),
		tsv: require("./tsv.js"),
		csv: require("./csv.js")
	};
	var contentType;
	var origResponse;
	var json = null;
	var type = null;//json, xml, csv, or tsv
	var exception = (typeof queryResponse == "object" && queryResponse.exception? queryResponse.exception: null);
		
	contentType = (typeof queryResponse == "object" && queryResponse.contentType? queryResponse.contentType.toLowerCase(): null);
	origResponse = (typeof queryResponse == "object" && queryResponse.response? queryResponse.response: queryResponse);
	
	

	var getAsJson = function() {
		if (json) return json;
		if (json === false || exception) return false;//already tried parsing this, and failed. do not try again... 
		var getParserFromContentType = function() {
			if (contentType) {
				if (contentType.indexOf("json") > -1) {
					try {
						json = parsers.json(origResponse);
					} catch (e) {
						exception = e;
					}
					type = "json";
				} else if (contentType.indexOf("xml") > -1) {
					try {
						json = parsers.xml(origResponse);
					} catch (e) {
						exception = e;
					}
					type = "xml";
				} else if (contentType.indexOf("csv") > -1) {
					try {
						json = parsers.csv(origResponse);
					} catch (e) {
						exception = e;
					}
					type = "csv";
				} else if (contentType.indexOf("tab-separated") > -1) {
					try {
						json = parsers.tsv(origResponse);
					} catch (e) {
						exception = e;
					}
					type = "tsv";
				}
			}
		};
		

		var doLuckyGuess = function() {
			json = parsers.json(origResponse);
			if (json)  {
				type = "json";
			} else {
				try {
					json = parsers.xml(origResponse);
					if (json) type="xml";
				} catch(err){};
			}
		};

		
		getParserFromContentType();
		if (!json) {
			doLuckyGuess();
		}
		if (!json) json = false;//explicitly set to false, so we don't try to parse this thing again..
		return json;
	};


	var getVariables = function() {
		var json = getAsJson();
		if (json && "head" in json) {
			return json.head.vars;
		} else {
			return null;
		}
	};

	var getBindings = function() {
		var json = getAsJson();
		if (json && "results" in json) {
			return json.results.bindings;
		} else {
			return null;
		}
	};

	var getBoolean = function() {
		var json = getAsJson();
		if (json && "boolean" in json) {
			return json.boolean;
		} else {
			return null;
		}
	};
	var getOriginalResponse = function() {
		return origResponse;
	};
	var getOriginalResponseAsString = function() {
		var responseString = "";
		if (typeof origResponse == "string") {
			responseString = origResponse;
		} else if (type == "json") {
			responseString = JSON.stringify(origResponse, undefined, 2);//prettifies as well
		} else if (type == "xml") {
			responseString = new XMLSerializer().serializeToString(origResponse);
		}
		return responseString;
	};
	var getException = function() {
		return exception;
	};
	var getType = function() {
		if (type == null) getAsJson();//detects type as well
		return type;
	};
	json = getAsJson();
	
	return {
		getAsJson: getAsJson,
		getOriginalResponse: getOriginalResponse,
		getOriginalResponseAsString: getOriginalResponseAsString,
		getOriginalContentType: function(){return contentType;},
		getVariables: getVariables,
		getBindings: getBindings,
		getBoolean: getBoolean,
		getType: getType,
		getException: getException
	};
};




}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./csv.js":16,"./json.js":18,"./tsv.js":19,"./xml.js":21}],21:[function(require,module,exports){
(function (global){
var $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null);
var root = module.exports = function(xml) {

	
	
	/**
	 * head
	 */
	var parseHead = function(node) {
		json.head = {};
		for (var headNodeIt = 0; headNodeIt < node.childNodes.length; headNodeIt++) {
			var headNode = node.childNodes[headNodeIt];
			if (headNode.nodeName == "variable") {
				if (!json.head.vars) json.head.vars = [];
				var name = headNode.getAttribute("name");
				if (name) json.head.vars.push(name);
			}
		}
	};
	
	var parseResults = function(node) {
		json.results = {};
		json.results.bindings = [];
		for (var resultIt = 0; resultIt < node.childNodes.length; resultIt++) {
			var resultNode = node.childNodes[resultIt];
			var jsonResult = null;
			
			for (var bindingIt = 0; bindingIt < resultNode.childNodes.length; bindingIt++) {
				var bindingNode = resultNode.childNodes[bindingIt];
				if (bindingNode.nodeName == "binding") {
					var varName = bindingNode.getAttribute("name");
					if (varName) {
						jsonResult = jsonResult || {};
						jsonResult[varName] = {};
						for (var bindingInfIt = 0; bindingInfIt < bindingNode.childNodes.length; bindingInfIt++) {
							var bindingInf = bindingNode.childNodes[bindingInfIt];
 							var type = bindingInf.nodeName;
							if (type == "#text") continue;
							jsonResult[varName].type = type;
							jsonResult[varName].value = bindingInf.innerHTML;
							var dataType = bindingInf.getAttribute("datatype");
							if (dataType) jsonResult[varName].datatype = dataType;
							
						}
					}
				}
			}
			if (jsonResult) json.results.bindings.push(jsonResult);
		}
	};
	
	var parseBoolean = function(node) {
		if (node.innerHTML == "true") {
			json.boolean = true;
		} else {
			json.boolean = false;
		}
	};
	
	if (typeof xml == "string") mainXml = $.parseXML(xml);
	var xml = null;
	if (mainXml.childNodes.length > 0) {
		//enter the main 'sparql' node
		xml = mainXml.childNodes[0];
	} else {
		return null;
	}
	var json = {};
	
	
    for(var i = 0; i < xml.childNodes.length; i++) {
    	var node = xml.childNodes[i];
    	if (node.nodeName == "head") parseHead(node);
    	if (node.nodeName == "results") parseResults(node);
    	if (node.nodeName == "boolean") parseBoolean(node);
    }
    
	return json;
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],22:[function(require,module,exports){
(function (global){
var $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null);
var CodeMirror = (typeof window !== "undefined" ? window.CodeMirror : typeof global !== "undefined" ? global.CodeMirror : null);

require('codemirror/addon/edit/matchbrackets.js');
require('codemirror/mode/xml/xml.js');
require('codemirror/mode/javascript/javascript.js');
var root = module.exports = function(yasr,parent, options) {
	var plugin = {};
	plugin.options = $.extend(true, {}, root.defaults, options);
	plugin.yasr = yasr;
	plugin.parent = parent;
	plugin.draw = function() {
		root.draw(plugin);
	};
	plugin.name = "Raw Response";
	plugin.canHandleResults = function(yasr){
		if (!yasr.results) return false;
		var response = yasr.results.getOriginalResponseAsString();
		if ((!response || response.length == 0) && yasr.results.getException()) return false;//in this case, show exception instead, as we have nothing to show anyway
		return true;
	};
	plugin.getPriority = 2;
	
	plugin.getDownloadInfo = function() {
		if (!plugin.yasr.results) return null;
		var contentType = plugin.yasr.results.getOriginalContentType();
		return {
			getContent: function() {return yasr.results.getOriginalResponse();},
			filename: "queryResults." + plugin.yasr.results.getType(),
			contentType: (contentType? contentType: "text/plain"),
			buttonTitle: "Download raw response"
		};
	};
	
	return plugin;
};

root.draw = function(plugin) {
	var cmOptions = plugin.options.CodeMirror;
	cmOptions.value = plugin.yasr.results.getOriginalResponseAsString();
	
	var mode = plugin.yasr.results.getType();
	if (mode) {
		if (mode == "json") {
			mode = {name: "javascript", json: true};
		}
		cmOptions.mode = mode;
	}
	
	CodeMirror(plugin.parent.get()[0], cmOptions);
	
};


root.defaults = {
	
	CodeMirror: {
		readOnly: true,
	}
};

root.version = {
	"YASR-rawResponse" : require("../package.json").version,
	"jquery": $.fn.jquery,
	"CodeMirror" : CodeMirror.version
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../package.json":12,"codemirror/addon/edit/matchbrackets.js":3,"codemirror/mode/javascript/javascript.js":4,"codemirror/mode/xml/xml.js":5}],23:[function(require,module,exports){
(function (global){
var $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null);
require("./../lib/DataTables/media/js/jquery.dataTables.js");
var imgs = require("yasgui-utils").imgs;

/**
 * Constructor of plugin which displays results as a table
 * 
 * @param yasr {object}
 * @param parent {DOM element}
 * @param options {object}
 * @class YASR.plugins.table
 * @return yasr-table (doc)
 * 
 */
var root = module.exports = function(yasr,parent, options) {
	var plugin = {};
	plugin.options = $.extend(true, {}, root.defaults, options);
	plugin.yasr = yasr;
	plugin.parent = parent;
	plugin.draw = function() {
		root.draw(plugin);
	};
	/**
	 * Human-readable name of this plugin (used in selection widget)
	 * 
	 * @property pluginDoc.name
	 * @type string
	 * @default "Table"
	 */
	plugin.name = "Table";
	/**
	 * Check whether this plugin can handler the current results
	 * 
	 * @property canHandleResults
	 * @type function
	 * @default If resultset contains variables in the resultset, return true
	 */
	plugin.canHandleResults = function(yasr){
		return yasr.results && yasr.results.getVariables() && yasr.results.getVariables().length > 0;
	};
	/**
	 * If we need to dynamically check which plugin to use, we rank the possible plugins by priority, and select the highest one
	 * 
	 * @property getPriority
	 * @param yasrDoc
	 * @type int|function
	 * @default 10
	 */
	plugin.getPriority =  function(yasr){return 10;};
	
	plugin.getDownloadInfo = function() {
		if (!plugin.yasr.results) return null;
		return {
			getContent: function(){return require("./bindingsToCsv.js")(yasr.results.getAsJson());},
			filename: "queryResults.csv",
			contentType: "text/csv",
			buttonTitle: "Download as CSV"
		};
	};
	
	plugin.disableSelectorOn = function(yasr) {
		
	};
	return plugin;
};

root.draw = function(plugin) {
	plugin.table = $('<table cellpadding="0" cellspacing="0" border="0" class="resultsTable"></table>');
	$(plugin.parent).html(plugin.table);

	var dataTableConfig = plugin.options.datatable;
	dataTableConfig.data = getRows(plugin);
	dataTableConfig.columns = getVariablesAsCols(plugin);
	plugin.table.DataTable($.extend(true, {}, dataTableConfig));//make copy. datatables adds properties for backwards compatability reasons, and don't want this cluttering our own 
	
	
	drawSvgIcons(plugin);
	
	addEvents(plugin);
	
	//move the table upward, so the table options nicely aligns with the yasr header
	var headerHeight = plugin.yasr.header.outerHeight() - 5; //add some space of 5 px between table and yasr header
	if (headerHeight > 0) {
		plugin.yasr.container.find(".dataTables_wrapper")
		.css("position", "relative")
		.css("top", "-" + headerHeight + "px")
		.css("margin-bottom", "-" + headerHeight + "px");
	}
	
	
};


var getVariablesAsCols = function(plugin) {
	var cols = [];
	cols.push({"title": ""});//row numbers
	var sparqlVars = plugin.yasr.results.getVariables();
	for (var i = 0; i < sparqlVars.length; i++) {
		cols.push({"title": sparqlVars[i]});
	}
	return cols;
};

var getRows = function(plugin) {
	var rows = [];
	var bindings = plugin.yasr.results.getBindings();
	var vars = plugin.yasr.results.getVariables();
	var usedPrefixes = null;
	if (plugin.yasr.options.getUsedPrefixes) {
		usedPrefixes = (typeof plugin.yasr.options.getUsedPrefixes == "function"? plugin.yasr.options.getUsedPrefixes(plugin.yasr):  plugin.yasr.options.getUsedPrefixes);
	}
	for (var rowId = 0; rowId < bindings.length; rowId++) {
		var row = [];
		row.push("");//row numbers
		var binding = bindings[rowId];
		for (var colId = 0; colId < vars.length; colId++) {
			var sparqlVar = vars[colId];
			if (sparqlVar in binding) {
				if (plugin.options.drawCellContent) {
					row.push(plugin.options.drawCellContent(rowId, colId, binding[sparqlVar], usedPrefixes));
				} else {
					row.push("");
				}
			} else {
				row.push("");
			}
		}
		rows.push(row);
	}
	return rows;
};


root.getFormattedValueFromBinding = function(rowId, colId, binding, usedPrefixes) {
	var value = null;
	if (binding.type == "uri") {
		var href = visibleString = binding.value;
		if (usedPrefixes) {
			for (var prefix in usedPrefixes) {
				if (visibleString.indexOf(usedPrefixes[prefix]) == 0) {
					visibleString = prefix + href.substring(usedPrefixes[prefix].length);
					break;
				}
			}
		}
		value = "<a class='uri' target='_blank' href='" + href + "'>" + visibleString + "</a>";
	} else {
		var stringRepresentation = binding.value;
		if (binding["xml:lang"]) {
			stringRepresentation = '"' + binding.value + '"@' + binding["xml:lang"];
		} else if (binding.datatype) {
			var xmlSchemaNs = "http://www.w3.org/2001/XMLSchema#";
			var dataType = binding.datatype;
			if (dataType.indexOf(xmlSchemaNs) == 0) {
				dataType = "xsd:" + dataType.substring(xmlSchemaNs.length);
			} else {
				dataType = "<" + dataType + ">";
			}
			
			stringRepresentation = '"' + stringRepresentation + '"^^' + dataType;
		}
		
		value = "<span class='nonUri'>" + stringRepresentation + "</span>";
	}
	return value;
};
var getExternalLinkElement = function() {
	var element = $("#externalLink");
	if (element.length == 0) {
		element = $("<img id='externalLink' src='" + Yasgui.constants.imgs.externalLink.get() + "'></img>")
			.on("click", function(){
				window.open($(this).parent().text());
			});
	}
	return element;
};
var executeSnorqlQuery = function(uri) {
	console.log("exec snorql");
//	var newQuery = Yasgui.settings.defaults.tabularBrowsingTemplate;
//	newQuery = newQuery.replace(/<URI>/g, "<" + uri + ">");
//	Yasgui.settings.getCurrentTab().query = newQuery;
//	Yasgui.tabs.getCurrentTab().cm.reloadFromSettings();
//	Yasgui.sparql.query();
};

var addEvents = function(plugin) {
	plugin.table.on( 'order.dt', function () {
	    drawSvgIcons(plugin);
	});
	
	plugin.table.delegate("td", "click", function(event) {
		if (plugin.options.handlers && plugin.options.handlers.onCellClick) {
			var result = plugin.options.handlers.onCellClick(this, event);
			if (result === false) return false;
		}
	}).delegate("td",'mouseenter', function(event) {
		if (plugin.options.handlers && plugin.options.handlers.onCellMouseEnter) {
			plugin.options.handlers.onCellMouseEnter(this, event);
		}
		var tdEl = $(this);
		if (plugin.options.fetchTitlesFromPreflabel 
				&& tdEl.attr("title") === undefined
				&& tdEl.text().trim().indexOf("http") == 0) {
			addPrefLabel(tdEl);
		}
	}).delegate("td",'mouseleave', function(event) {
		if (plugin.options.handlers && plugin.options.handlers.onCellMouseLeave) {
			plugin.options.handlers.onCellMouseLeave(this, event);
			
		}
	});
};

var addPrefLabel = function(td) {
	var addEmptyTitle = function() {
		td.attr("title","");//this avoids trying to fetch the label again on next hover
	};
	$.get("http://preflabel.org/api/v1/label/" + encodeURIComponent(td.text()) + "?silent=true")
		.success(function(data) {
			if (typeof data == "object" && data.label) {
				td.attr("title", data.label);
			} else if (typeof data == "string" && data.length > 0 ) {
				td.attr("title", data);
			} else {
				addEmptyTitle();
			}
			
		})
		.fail(addEmptyTitle);
};

var drawSvgIcons = function(plugin) {
	var sortings = {
		"sorting": "unsorted",
		"sorting_asc": "sortAsc",
		"sorting_desc": "sortDesc"
	};
	plugin.table.find(".sortIcons").remove();
	for (var sorting in sortings) {
		var svgDiv = $("<div class='sortIcons'></div>").css("float", "right").css("margin-right", "-12px").width(10).height(15);
		imgs.draw(svgDiv, {id: sortings[sorting], width: 12, height: 16});
		plugin.table.find("th." + sorting).append(svgDiv);
	}
};
root.openCellUriInNewWindow = function(cell) {
	if (cell.className.indexOf("uri") >= 0) {
		window.open(this.innerHTML);
	}
};

/**
 * Defaults for table plugin
 * 
 * @type object
 * @attribute YASR.plugins.table.defaults
 */
root.defaults = {
	
	/**
	 * Draw the cell content, from a given binding
	 * 
	 * @property drawCellContent
	 * @param binding {object}
	 * @type function
	 * @return string
	 * @default YASR.plugins.table.getFormattedValueFromBinding
	 */
	drawCellContent: root.getFormattedValueFromBinding,
	
	/**
	 * Try to fetch the label representation for each URI, using the preflabel.org services. (fetching occurs when hovering over the cell)
	 * 
	 * @property fetchTitlesFromPreflabel
	 * @type boolean
	 * @default true
	 */
	fetchTitlesFromPreflabel: true,
	/**
	 * Set a number of handlers for the table
	 * 
	 * @property handlers
	 * @type object
	 */
	handlers: {
		/**
		 * Mouse-enter-cell event
		 * 
		 * @property handlers.onCellMouseEnter
		 * @type function
		 * @param td-element
		 * @default null
		 */
		onCellMouseEnter: null,
		/**
		 * Mouse-leave-cell event
		 * 
		 * @property handlers.onCellMouseLeave
		 * @type function
		 * @param td-element
		 * @default null
		 */
		onCellMouseLeave: null,
		/**
		 * Cell clicked event
		 * 
		 * @property handlers.onCellClick
		 * @type function
		 * @param td-element
		 * @default null
		 */
		onCellClick: null
	},
	/**
	 * This plugin uses the datatables jquery plugin (See datatables.net). For any datatables specific defaults, change this object. 
	 * See the datatables reference for more information
	 * 
	 * @property datatable
	 * @type object
	 */
	datatable: {
		"order": [],//disable initial sorting
		"pageLength": 50,//default page length
    	"lengthMenu": [[10, 50, 100, 1000, -1], [10, 50, 100, 1000, "All"]],//possible page lengths
    	"lengthChange": true,//allow changing page length
    	"pagingType": "full_numbers",//how to show the pagination options
        "drawCallback": function ( oSettings ) {
        	//trick to show row numbers
        	for ( var i = 0; i < oSettings.aiDisplay.length; i++) {
				$('td:eq(0)',oSettings.aoData[oSettings.aiDisplay[i]].nTr).html(i + 1);
			}
        	
        	//Hide pagination when we have a single page
        	var activePaginateButton = false;
        	$(oSettings.nTableWrapper).find(".paginate_button").each(function() {
        		if ($(this).attr("class").indexOf("current") == -1 && $(this).attr("class").indexOf("disabled") == -1) {
        			activePaginateButton = true;
        		}
        	});
        	if (activePaginateButton) {
        		$(oSettings.nTableWrapper).find(".dataTables_paginate").show();
        	} else {
        		$(oSettings.nTableWrapper).find(".dataTables_paginate").hide();
        	}
		},
		"columnDefs": [
			{ "width": "12px", "orderable": false, "targets": 0  }//disable row sorting for first col
		],
	},
};

root.version = {
	"YASR-table" : require("../package.json").version,
	"jquery": $.fn.jquery,
	"jquery-datatables": $.fn.DataTable.version
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../package.json":12,"./../lib/DataTables/media/js/jquery.dataTables.js":undefined,"./bindingsToCsv.js":13,"yasgui-utils":10}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvbWFpbi5qcyIsImxpYi9qcXVlcnkuY3N2LTAuNzEuanMiLCJub2RlX21vZHVsZXMvY29kZW1pcnJvci9hZGRvbi9lZGl0L21hdGNoYnJhY2tldHMuanMiLCJub2RlX21vZHVsZXMvY29kZW1pcnJvci9tb2RlL2phdmFzY3JpcHQvamF2YXNjcmlwdC5qcyIsIm5vZGVfbW9kdWxlcy9jb2RlbWlycm9yL21vZGUveG1sL3htbC5qcyIsIm5vZGVfbW9kdWxlcy95YXNndWktdXRpbHMvbm9kZV9tb2R1bGVzL3N0b3JlL3N0b3JlLmpzIiwibm9kZV9tb2R1bGVzL3lhc2d1aS11dGlscy9wYWNrYWdlLmpzb24iLCJub2RlX21vZHVsZXMveWFzZ3VpLXV0aWxzL3NyYy9kZXRlcm1pbmVJZC5qcyIsIm5vZGVfbW9kdWxlcy95YXNndWktdXRpbHMvc3JjL2ltZ3MuanMiLCJub2RlX21vZHVsZXMveWFzZ3VpLXV0aWxzL3NyYy9tYWluLmpzIiwibm9kZV9tb2R1bGVzL3lhc2d1aS11dGlscy9zcmMvc3RvcmFnZS5qcyIsInBhY2thZ2UuanNvbiIsInNyYy9iaW5kaW5nc1RvQ3N2LmpzIiwic3JjL2Jvb2xlYW4uanMiLCJzcmMvZXJyb3IuanMiLCJzcmMvcGFyc2Vycy9jc3YuanMiLCJzcmMvcGFyc2Vycy9kbHYuanMiLCJzcmMvcGFyc2Vycy9qc29uLmpzIiwic3JjL3BhcnNlcnMvdHN2LmpzIiwic3JjL3BhcnNlcnMvd3JhcHBlci5qcyIsInNyYy9wYXJzZXJzL3htbC5qcyIsInNyYy9yYXdSZXNwb25zZS5qcyIsInNyYy90YWJsZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2gxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOXFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4ndXNlIHN0cmljdCc7XG52YXIgJCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LmpRdWVyeSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwualF1ZXJ5IDogbnVsbCk7XG52YXIgdXRpbHMgPSByZXF1aXJlKFwieWFzZ3VpLXV0aWxzXCIpO1xuY29uc29sZSA9IGNvbnNvbGUgfHwge1wibG9nXCI6ZnVuY3Rpb24oKXt9fTsvL21ha2Ugc3VyZSBhbnkgY29uc29sZSBzdGF0ZW1lbnRzIGRvbid0IGJyZWFrIGluIElFXG5cblxuXG5cbi8qKlxuICogTWFpbiBZQVNSIGNvbnN0cnVjdG9yXG4gKiBcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtET00tRWxlbWVudH0gcGFyZW50IGVsZW1lbnQgdG8gYXBwZW5kIGVkaXRvciB0by5cbiAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5nc1xuICogQGNsYXNzIFlBU1JcbiAqIEByZXR1cm4ge2RvY30gWUFTUiBkb2N1bWVudFxuICovXG52YXIgcm9vdCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocGFyZW50LCBvcHRpb25zLCBxdWVyeVJlc3VsdHMpIHtcblx0dmFyIHlhc3IgPSB7fTtcblx0eWFzci5vcHRpb25zID0gJC5leHRlbmQodHJ1ZSwge30sIHJvb3QuZGVmYXVsdHMsIG9wdGlvbnMpO1xuXHR5YXNyLmNvbnRhaW5lciA9ICQoXCI8ZGl2IGNsYXNzPSd5YXNyJz48L2Rpdj5cIikuYXBwZW5kVG8ocGFyZW50KTtcblx0eWFzci5oZWFkZXIgPSAkKFwiPGRpdiBjbGFzcz0neWFzcl9oZWFkZXInPjwvZGl2PlwiKS5hcHBlbmRUbyh5YXNyLmNvbnRhaW5lcik7XG5cdHlhc3IucmVzdWx0c0NvbnRhaW5lciA9ICQoXCI8ZGl2IGNsYXNzPSd5YXNyX3Jlc3VsdHMnPjwvZGl2PlwiKS5hcHBlbmRUbyh5YXNyLmNvbnRhaW5lcik7XG5cdFxuXHRcblx0eWFzci5kcmF3ID0gZnVuY3Rpb24ob3V0cHV0KSB7XG5cdFx0aWYgKCF5YXNyLnJlc3VsdHMpIHJldHVybiBmYWxzZTtcblx0XHRpZiAoIW91dHB1dCkgb3V0cHV0ID0geWFzci5vcHRpb25zLm91dHB1dDtcblx0XHRcblx0XHRpZiAob3V0cHV0IGluIHlhc3IucGx1Z2lucyAmJiB5YXNyLnBsdWdpbnNbb3V0cHV0XS5jYW5IYW5kbGVSZXN1bHRzKHlhc3IpKSB7XG5cdFx0XHQkKHlhc3IucmVzdWx0c0NvbnRhaW5lcikuZW1wdHkoKTtcblx0XHRcdHlhc3IucGx1Z2luc1tvdXRwdXRdLmRyYXcoKTtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblx0XHQvL2FoLCBvdXIgZGVmYXVsdCBvdXRwdXQgZG9lcyBub3QgdGFrZSBvdXIgY3VycmVudCByZXN1bHRzLiBUcnkgdG8gYXV0b2RldGVjdFxuXHRcdHZhciBzZWxlY3RlZE91dHB1dCA9IG51bGw7XG5cdFx0dmFyIHNlbGVjdGVkT3V0cHV0UHJpb3JpdHkgPSAtMTtcblx0XHRmb3IgKHZhciB0cnlPdXRwdXQgaW4geWFzci5wbHVnaW5zKSB7XG5cdFx0XHRpZiAoeWFzci5wbHVnaW5zW3RyeU91dHB1dF0uY2FuSGFuZGxlUmVzdWx0cyh5YXNyKSkge1xuXHRcdFx0XHR2YXIgcHJpb3JpdHkgPSB5YXNyLnBsdWdpbnNbdHJ5T3V0cHV0XS5nZXRQcmlvcml0eTtcblx0XHRcdFx0aWYgKHR5cGVvZiBwcmlvcml0eSA9PSBcImZ1bmN0aW9uXCIpIHByaW9yaXR5ID0gcHJpb3JpdHkoeWFzcik7XG5cdFx0XHRcdGlmIChwcmlvcml0eSAhPSBudWxsICYmIHByaW9yaXR5ICE9IHVuZGVmaW5lZCAmJiBwcmlvcml0eSA+IHNlbGVjdGVkT3V0cHV0UHJpb3JpdHkpIHtcblx0XHRcdFx0XHRzZWxlY3RlZE91dHB1dFByaW9yaXR5ID0gcHJpb3JpdHk7XG5cdFx0XHRcdFx0c2VsZWN0ZWRPdXRwdXQgPSB0cnlPdXRwdXQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0aWYgKHNlbGVjdGVkT3V0cHV0KSB7XG5cdFx0XHQkKHlhc3IucmVzdWx0c0NvbnRhaW5lcikuZW1wdHkoKTtcblx0XHRcdHlhc3IucGx1Z2luc1tzZWxlY3RlZE91dHB1dF0uZHJhdygpO1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fTtcblx0eWFzci5zb21ldGhpbmdEcmF3biA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiAheWFzci5yZXN1bHRzQ29udGFpbmVyLmlzKFwiOmVtcHR5XCIpO1xuXHR9O1xuXHR5YXNyLnNldFJlc3BvbnNlID0gZnVuY3Rpb24ocXVlcnlSZXN1bHRzKSB7XG5cdFx0dHJ5IHtcblx0XHRcdHlhc3IucmVzdWx0cyA9IHJlcXVpcmUoXCIuL3BhcnNlcnMvd3JhcHBlci5qc1wiKShxdWVyeVJlc3VsdHMpO1xuXHRcdH0gY2F0Y2goZXhjZXB0aW9uKSB7XG5cdFx0XHR5YXNyLnJlc3VsdHMgPSBleGNlcHRpb247XG5cdFx0fVxuXHRcdHlhc3IuZHJhdygpO1xuXHRcdFxuXHRcdC8vc3RvcmUgaWYgbmVlZGVkXG5cdFx0aWYgKHlhc3Iub3B0aW9ucy5wZXJzaXN0ZW5jeSAmJiB5YXNyLm9wdGlvbnMucGVyc2lzdGVuY3kucmVzdWx0cykge1xuXHRcdFx0aWYgKHlhc3IucmVzdWx0cy5nZXRPcmlnaW5hbFJlc3BvbnNlQXNTdHJpbmcgJiYgeWFzci5yZXN1bHRzLmdldE9yaWdpbmFsUmVzcG9uc2VBc1N0cmluZygpLmxlbmd0aCA8IHlhc3Iub3B0aW9ucy5wZXJzaXN0ZW5jeS5yZXN1bHRzLm1heFNpemUpIHtcblx0XHRcdFx0dmFyIGlkID0gKHR5cGVvZiB5YXNyLm9wdGlvbnMucGVyc2lzdGVuY3kucmVzdWx0cy5pZCA9PSBcInN0cmluZ1wiID8geWFzci5vcHRpb25zLnBlcnNpc3RlbmN5LnJlc3VsdHMuaWQ6IHlhc3Iub3B0aW9ucy5wZXJzaXN0ZW5jeS5yZXN1bHRzLmlkKHlhc3IpKTtcblx0XHRcdFx0dXRpbHMuc3RvcmFnZS5zZXQoaWQsIHlhc3IucmVzdWx0cy5nZXRPcmlnaW5hbFJlc3BvbnNlKCksIFwibW9udGhcIik7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXHRcblx0eWFzci5wbHVnaW5zID0ge307XG5cdGZvciAodmFyIHBsdWdpbiBpbiByb290LnBsdWdpbnMpIHtcblx0XHR5YXNyLnBsdWdpbnNbcGx1Z2luXSA9IHJvb3QucGx1Z2luc1twbHVnaW5dKHlhc3IsIHlhc3IucmVzdWx0c0NvbnRhaW5lcik7XG5cdH1cblx0LyoqXG5cdCAqIHBvc3Rwcm9jZXNzXG5cdCAqL1xuXHRpZiAoeWFzci5vcHRpb25zLnBlcnNpc3RlbmN5ICYmIHlhc3Iub3B0aW9ucy5wZXJzaXN0ZW5jeS5vdXRwdXRTZWxlY3Rvcikge1xuXHRcdHZhciBpZCA9ICh0eXBlb2YgeWFzci5vcHRpb25zLnBlcnNpc3RlbmN5Lm91dHB1dFNlbGVjdG9yID09IFwic3RyaW5nXCI/IHlhc3Iub3B0aW9ucy5wZXJzaXN0ZW5jeS5vdXRwdXRTZWxlY3RvcjogeWFzci5vcHRpb25zLnBlcnNpc3RlbmN5Lm91dHB1dFNlbGVjdG9yKHlhc3IpKTtcblx0XHRpZiAoaWQpIHtcblx0XHRcdHZhciBzZWxlY3Rpb24gPSB1dGlscy5zdG9yYWdlLmdldChpZCk7XG5cdFx0XHRpZiAoc2VsZWN0aW9uKSB5YXNyLm9wdGlvbnMub3V0cHV0ID0gc2VsZWN0aW9uO1xuXHRcdH1cblx0fVxuXHRpZiAoIXF1ZXJ5UmVzdWx0cyAmJiB5YXNyLm9wdGlvbnMucGVyc2lzdGVuY3kgJiYgeWFzci5vcHRpb25zLnBlcnNpc3RlbmN5LnJlc3VsdHMpIHtcblx0XHR2YXIgaWQgPSAodHlwZW9mIHlhc3Iub3B0aW9ucy5wZXJzaXN0ZW5jeS5yZXN1bHRzLmlkID09IFwic3RyaW5nXCIgPyB5YXNyLm9wdGlvbnMucGVyc2lzdGVuY3kucmVzdWx0cy5pZDogeWFzci5vcHRpb25zLnBlcnNpc3RlbmN5LnJlc3VsdHMuaWQoeWFzcikpO1xuXHRcdHF1ZXJ5UmVzdWx0cyA9IHV0aWxzLnN0b3JhZ2UuZ2V0KGlkKTtcblx0fVxuXHRcblx0cm9vdC5kcmF3SGVhZGVyKHlhc3IpO1xuXHRcblx0aWYgKHF1ZXJ5UmVzdWx0cykge1xuXHRcdHlhc3Iuc2V0UmVzcG9uc2UocXVlcnlSZXN1bHRzKTtcblx0fSBcblx0cm9vdC51cGRhdGVIZWFkZXIoeWFzcik7XG5cdHJldHVybiB5YXNyO1xufTtcbnJvb3QudXBkYXRlSGVhZGVyID0gZnVuY3Rpb24oeWFzcikge1xuXHR2YXIgZG93bmxvYWRJY29uID0geWFzci5oZWFkZXIuZmluZChcIi55YXNyX2Rvd25sb2FkSWNvblwiKTtcblx0XHRkb3dubG9hZEljb25cblx0XHRcdC5yZW1vdmVBdHRyKFwidGl0bGVcIik7Ly9hbmQgcmVtb3ZlIHByZXZpb3VzIHRpdGxlc1xuXHRcblx0dmFyIG91dHB1dFBsdWdpbiA9IHlhc3IucGx1Z2luc1t5YXNyLm9wdGlvbnMub3V0cHV0XTtcblx0aWYgKG91dHB1dFBsdWdpbikge1xuXHRcdHZhciBpbmZvID0gKG91dHB1dFBsdWdpbi5nZXREb3dubG9hZEluZm8/IG91dHB1dFBsdWdpbi5nZXREb3dubG9hZEluZm8oKTogbnVsbCk7XG5cdFx0aWYgKGluZm8pIHtcblx0XHRcdGlmIChpbmZvLmJ1dHRvblRpdGxlKSBkb3dubG9hZEljb24uYXR0cihpbmZvLmJ1dHRvblRpdGxlKTtcblx0XHRcdGRvd25sb2FkSWNvbi5wcm9wKFwiZGlzYWJsZWRcIiwgZmFsc2UpO1xuXHRcdFx0ZG93bmxvYWRJY29uLmZpbmQoXCJwYXRoXCIpLmVhY2goZnVuY3Rpb24oKXtcblx0XHRcdFx0dGhpcy5zdHlsZS5maWxsID0gXCJibGFja1wiO1xuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGRvd25sb2FkSWNvbi5wcm9wKFwiZGlzYWJsZWRcIiwgdHJ1ZSkucHJvcChcInRpdGxlXCIsIFwiRG93bmxvYWQgbm90IHN1cHBvcnRlZCBmb3IgdGhpcyByZXN1bHQgcmVwcmVzZW50YXRpb25cIik7XG5cdFx0XHRkb3dubG9hZEljb24uZmluZChcInBhdGhcIikuZWFjaChmdW5jdGlvbigpe1xuXHRcdFx0XHR0aGlzLnN0eWxlLmZpbGwgPSBcImdyYXlcIjtcblx0XHRcdH0pO1xuXHRcdH1cblx0fVxufTtcblxucm9vdC5kcmF3SGVhZGVyID0gZnVuY3Rpb24oeWFzcikge1xuXHR2YXIgZHJhd091dHB1dFNlbGVjdG9yID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGJ0bkdyb3VwID0gJCgnPGRpdiBjbGFzcz1cInlhc3JfYnRuR3JvdXBcIj48L2Rpdj4nKTtcblx0XHQkLmVhY2goeWFzci5wbHVnaW5zLCBmdW5jdGlvbihwbHVnaW5OYW1lLCBwbHVnaW4pIHtcblx0XHRcdGlmIChwbHVnaW4uaGlkZUZyb21TZWxlY3Rpb24pIHJldHVybjtcblx0XHRcdHZhciBuYW1lID0gcGx1Z2luLm5hbWUgfHwgcGx1Z2luTmFtZTtcblx0XHRcdHZhciBidXR0b24gPSAkKFwiPGJ1dHRvbiBjbGFzcz0neWFzcl9idG4nPjwvYnV0dG9uPlwiKVxuXHRcdFx0LnRleHQobmFtZSlcblx0XHRcdC5hZGRDbGFzcyhcInNlbGVjdF9cIiArIHBsdWdpbk5hbWUpXG5cdFx0XHQuY2xpY2soZnVuY3Rpb24oKSB7XG5cdFx0XHRcdC8vdXBkYXRlIGJ1dHRvbnNcblx0XHRcdFx0YnRuR3JvdXAuZmluZChcImJ1dHRvbi5zZWxlY3RlZFwiKS5yZW1vdmVDbGFzcyhcInNlbGVjdGVkXCIpO1xuXHRcdFx0XHQkKHRoaXMpLmFkZENsYXNzKFwic2VsZWN0ZWRcIik7XG5cdFx0XHRcdC8vc2V0IGFuZCBkcmF3IG91dHB1dFxuXHRcdFx0XHR5YXNyLm9wdGlvbnMub3V0cHV0ID0gcGx1Z2luTmFtZTtcblx0XHRcdFx0XG5cdFx0XHRcdC8vc3RvcmUgaWYgbmVlZGVkXG5cdFx0XHRcdGlmICh5YXNyLm9wdGlvbnMucGVyc2lzdGVuY3kgJiYgeWFzci5vcHRpb25zLnBlcnNpc3RlbmN5Lm91dHB1dFNlbGVjdG9yKSB7XG5cdFx0XHRcdFx0dmFyIGlkID0gKHR5cGVvZiB5YXNyLm9wdGlvbnMucGVyc2lzdGVuY3kub3V0cHV0U2VsZWN0b3IgPT0gXCJzdHJpbmdcIj8geWFzci5vcHRpb25zLnBlcnNpc3RlbmN5Lm91dHB1dFNlbGVjdG9yOiB5YXNyLm9wdGlvbnMucGVyc2lzdGVuY3kub3V0cHV0U2VsZWN0b3IoeWFzcikpO1xuXHRcdFx0XHRcdHV0aWxzLnN0b3JhZ2Uuc2V0KGlkLCB5YXNyLm9wdGlvbnMub3V0cHV0LCBcIm1vbnRoXCIpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRcblx0XHRcdFx0eWFzci5kcmF3KCk7XG5cdFx0XHRcdHJvb3QudXBkYXRlSGVhZGVyKHlhc3IpO1xuXHRcdFx0fSlcblx0XHRcdC5hcHBlbmRUbyhidG5Hcm91cCk7XG5cdFx0XHRpZiAoeWFzci5vcHRpb25zLm91dHB1dCA9PSBwbHVnaW5OYW1lKSBidXR0b24uYWRkQ2xhc3MoXCJzZWxlY3RlZFwiKTtcblx0XHR9KTtcblx0XHRcblx0XHRpZiAoYnRuR3JvdXAuY2hpbGRyZW4oKS5sZW5ndGggPiAxKSB5YXNyLmhlYWRlci5hcHBlbmQoYnRuR3JvdXApO1xuXHR9O1xuXHR2YXIgZHJhd0Rvd25sb2FkSWNvbiA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzdHJpbmdUb1VybCA9IGZ1bmN0aW9uKHN0cmluZywgY29udGVudFR5cGUpIHtcblx0XHRcdHZhciB1cmwgPSBudWxsO1xuXHRcdFx0dmFyIHdpbmRvd1VybCA9IHdpbmRvdy5VUkwgfHwgd2luZG93LndlYmtpdFVSTCB8fCB3aW5kb3cubW96VVJMIHx8IHdpbmRvdy5tc1VSTDtcblx0XHRcdGlmICh3aW5kb3dVcmwgJiYgQmxvYikge1xuXHRcdFx0XHR2YXIgYmxvYiA9IG5ldyBCbG9iKFtzdHJpbmddLCB7dHlwZTogY29udGVudFR5cGV9KTtcblx0XHRcdFx0dXJsID0gd2luZG93VXJsLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB1cmw7XG5cdFx0fTtcblx0XHR2YXIgYnV0dG9uID0gJChcIjxidXR0b24gY2xhc3M9J3lhc3JfYnRuIHlhc3JfZG93bmxvYWRJY29uJz48L2J1dHRvbj5cIilcblx0XHRcdC5hcHBlbmQocmVxdWlyZShcInlhc2d1aS11dGlsc1wiKS5pbWdzLmdldEVsZW1lbnQoe2lkOiBcImRvd25sb2FkXCIsIHdpZHRoOiBcIjE1cHhcIiwgaGVpZ2h0OiBcIjE1cHhcIn0pKVxuXHRcdFx0LmNsaWNrKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgY3VycmVudFBsdWdpbiA9IHlhc3IucGx1Z2luc1t5YXNyLm9wdGlvbnMub3V0cHV0XTtcblx0XHRcdFx0aWYgKGN1cnJlbnRQbHVnaW4gJiYgY3VycmVudFBsdWdpbi5nZXREb3dubG9hZEluZm8pIHtcblx0XHRcdFx0XHR2YXIgZG93bmxvYWRJbmZvID0gY3VycmVudFBsdWdpbi5nZXREb3dubG9hZEluZm8oKTtcblx0XHRcdFx0XHR2YXIgZG93bmxvYWRVcmwgPSBzdHJpbmdUb1VybChkb3dubG9hZEluZm8uZ2V0Q29udGVudCgpLCAoZG93bmxvYWRJbmZvLmNvbnRlbnRUeXBlPyBkb3dubG9hZEluZm8uY29udGVudFR5cGU6IFwidGV4dC9wbGFpblwiKSk7XG5cdFx0XHRcdFx0dmFyIGRvd25sb2FkTW9ja0xpbmsgPSAkKFwiPGE+PC9hPlwiKTtcblx0XHRcdFx0XHRkb3dubG9hZE1vY2tMaW5rLmF0dHIoXCJocmVmXCIsIGRvd25sb2FkVXJsKTtcblx0XHRcdFx0XHRkb3dubG9hZE1vY2tMaW5rLmF0dHIoXCJkb3dubG9hZFwiLCBkb3dubG9hZEluZm8uZmlsZW5hbWUpO1xuXHRcdFx0XHRcdGRvd25sb2FkTW9ja0xpbmsuZ2V0KDApLmNsaWNrKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdHlhc3IuaGVhZGVyLmFwcGVuZChidXR0b24pO1xuXHR9O1xuXHRpZiAoeWFzci5vcHRpb25zLmRyYXdPdXRwdXRTZWxlY3RvcikgZHJhd091dHB1dFNlbGVjdG9yKCk7XG5cdGlmICh5YXNyLm9wdGlvbnMuZHJhd0Rvd25sb2FkSWNvbikgZHJhd0Rvd25sb2FkSWNvbigpO1xufTtcblxuXG5cblxuLyoqXG4gKiBSZWdpc3RlcmVkIHBsdWdpbnMuIEFkZCBhIHBsdWdpbiBieSBhZGRpbmcgaXQgdG8gdGhpcyBvYmplY3QuIFxuICogRWFjaCBwbHVnaW4gLW11c3QtIHJldHVybiBhbiBvYmplY3QgZnJvbSB0aGUgY29uc3RydWN0b3Igd2l0aCB0aGUgZm9sbG93aW5nIGtleXM6IGRyYXcgKGZ1bmN0aW9uKSBhbmQgXG4gKiBvcHRpb25zIChvYmplY3Qgd2l0aCBrZXlzIGhpZGVGcm9tU2VsZWN0aW9uLCBjYW5IYW5kbGVyUmVzdWx0cywgZ2V0UHJpb3JpdHkgYW5kIG5hbWUpXG4gKiBXYW50IHRvIGFkZCB5b3VyIG93biBwbHVnaW4/IEknZCBhZHZpY2UgeW91IHVzZSB0aGUgYm9vbGVhbiBwbHVnaW4gYXMgYSB0ZW1wbGF0ZVxuICogXG4gKiBAdHlwZSBvYmplY3RcbiAqIEBhdHRyaWJ1dGUgWUFTUi5wbHVnaW5zXG4gKi9cbnJvb3QucGx1Z2lucyA9IHtcblx0Ym9vbGVhbjogcmVxdWlyZShcIi4vYm9vbGVhbi5qc1wiKSxcblx0dGFibGU6IHJlcXVpcmUoXCIuL3RhYmxlLmpzXCIpLFxuXHRyYXdSZXNwb25zZTogcmVxdWlyZShcIi4vcmF3UmVzcG9uc2UuanNcIiksXG5cdGVycm9yOiByZXF1aXJlKFwiLi9lcnJvci5qc1wiKVxufTtcblxuLyoqXG4gKiBUaGUgZGVmYXVsdCBvcHRpb25zIG9mIFlBU1IuIEVpdGhlciBjaGFuZ2UgdGhlIGRlZmF1bHQgb3B0aW9ucyBieSBzZXR0aW5nIFlBU1IuZGVmYXVsdHMsIG9yIGJ5XG4gKiBwYXNzaW5nIHlvdXIgb3duIG9wdGlvbnMgYXMgc2Vjb25kIGFyZ3VtZW50IHRvIHRoZSBZQVNSIGNvbnN0cnVjdG9yXG4gKiBcbiAqIEBhdHRyaWJ1dGUgWUFTUi5kZWZhdWx0c1xuICovXG5yb290LmRlZmF1bHRzID0ge1xuXHQvKipcblx0ICoga2V5IG9mIGRlZmF1bHQgcGx1Z2luIHRvIHVzZVxuXHQgKiBAcHJvcGVydHkgb3V0cHV0XG5cdCAqIEB0eXBlIHN0cmluZ1xuXHQgKiBAZGVmYXVsdCBcInRhYmxlXCJcblx0ICovXG5cdG91dHB1dDogXCJ0YWJsZVwiLFxuXHRcblx0LyoqXG5cdCAqIERyYXcgdGhlIG91dHB1dCBzZWxlY3RvciB3aWRnZXRcblx0ICogXG5cdCAqIEBwcm9wZXJ0eSBkcmF3T3V0cHV0U2VsZWN0b3Jcblx0ICogQHR5cGUgYm9vbGVhblxuXHQgKiBAZGVmYXVsdCB0cnVlXG5cdCAqL1xuXHRkcmF3T3V0cHV0U2VsZWN0b3I6IHRydWUsXG5cdC8qKlxuXHQgKiBEcmF3IGRvd25sb2FkIGljb24uIFRoaXMgaXNzdWVzIGh0bWw1IGRvd25sb2FkIGZ1bmN0aW9uYWxpdHkgdG8gJ2Rvd25sb2FkJyBmaWxlcyBjcmVhdGVkIG9uIHRoZSBjbGllbnQtc2lkZS5cblx0ICogIFRoaXMgYWxsb3dzIHRoZSB1c2VyIHRvIGRvd25sb2FkIHJlc3VsdHMgYWxyZWFkeSBxdWVyaWVkIGZvciwgc3VjaCBhcyBhIENTViB3aGVuIGEgdGFibGUgaXMgc2hvd24sIG9yIHRoZSBvcmlnaW5hbCByZXNwb25zZSB3aGVuIHRoZSByYXcgcmVzcG9uc2Ugb3V0cHV0IGlzIHNlbGVjdGVkXG5cdCAqIFxuXHQgKiBAcHJvcGVydHkgZHJhd0Rvd25sb2FkSWNvblxuXHQgKiBAdHlwZSBib29sZWFuXG5cdCAqIEBkZWZhdWx0IHRydWVcblx0ICovXG5cdGRyYXdEb3dubG9hZEljb246IHRydWUsXG5cdFxuXHRcblx0Z2V0VXNlZFByZWZpeGVzOiBudWxsLFxuXHQvKipcblx0ICogTWFrZSBjZXJ0YWluIHNldHRpbmdzIGFuZCB2YWx1ZXMgb2YgWUFTUiBwZXJzaXN0ZW50LiBTZXR0aW5nIGEga2V5XG5cdCAqIHRvIG51bGwsIHdpbGwgZGlzYWJsZSBwZXJzaXN0YW5jeTogbm90aGluZyBpcyBzdG9yZWQgYmV0d2VlbiBicm93c2VyXG5cdCAqIHNlc3Npb25zIFNldHRpbmcgdGhlIHZhbHVlcyB0byBhIHN0cmluZyAob3IgYSBmdW5jdGlvbiB3aGljaCByZXR1cm5zIGFcblx0ICogc3RyaW5nKSwgd2lsbCBzdG9yZSB0aGUgcXVlcnkgaW4gbG9jYWxzdG9yYWdlIHVzaW5nIHRoZSBzcGVjaWZpZWQgc3RyaW5nLlxuXHQgKiBCeSBkZWZhdWx0LCB0aGUgSUQgaXMgZHluYW1pY2FsbHkgZ2VuZXJhdGVkIGJ5IGZpbmRpbmcgdGhlIG5lYXJlc3QgRE9NIGVsZW1lbnQgd2l0aCBhbiBcImlkXCIgc2V0LFxuXHQgKiB0byBhdm9pZCBjb2xsaXNzaW9ucyB3aGVuIHVzaW5nIG11bHRpcGxlIFlBU1IgaXRlbXMgb24gb25lIHBhZ2Vcblx0ICogXG5cdCAqIEBwcm9wZXJ0eSBwZXJzaXN0ZW5jeVxuXHQgKiBAdHlwZSBvYmplY3Rcblx0ICovXG5cdHBlcnNpc3RlbmN5OiB7XG5cdFx0LyoqXG5cdFx0ICogUGVyc2lzdGVuY3kgc2V0dGluZyBmb3IgdGhlIHNlbGVjdGVkIG91dHB1dFxuXHRcdCAqIFxuXHRcdCAqIEBwcm9wZXJ0eSBwZXJzaXN0ZW5jeS5vdXRwdXRTZWxlY3RvclxuXHRcdCAqIEB0eXBlIHN0cmluZ3xmdW5jdGlvblxuXHRcdCAqIEBkZWZhdWx0IGZ1bmN0aW9uIChkZXRlcm1pbmUgdW5pcXVlIGlkKVxuXHRcdCAqL1xuXHRcdG91dHB1dFNlbGVjdG9yOiBmdW5jdGlvbih5YXNyKSB7XG5cdFx0XHRyZXR1cm4gXCJzZWxlY3Rvcl9cIiArIHV0aWxzLmRldGVybWluZUlkKHlhc3IuY29udGFpbmVyKTtcblx0XHR9LFxuXHRcdC8qKlxuXHRcdCAqIFBlcnNpc3RlbmN5IHNldHRpbmcgZm9yIHF1ZXJ5IHJlc3VsdHMuXG5cdFx0ICogXG5cdFx0ICogQHByb3BlcnR5IHBlcnNpc3RlbmN5LnJlc3VsdHNcblx0XHQgKiBAdHlwZSBvYmplY3Rcblx0XHQgKi9cblx0XHRyZXN1bHRzOiB7XG5cdFx0XHQvKipcblx0XHRcdCAqIEdldCB0aGUga2V5IHRvIHN0b3JlIHJlc3VsdHMgaW5cblx0XHRcdCAqIFxuXHRcdFx0ICogQHByb3BlcnR5IHBlcnNpc3RlbmN5LnJlc3VsdHMuaWRcblx0XHRcdCAqIEB0eXBlIHN0cmluZ3xmdW5jdGlvblxuXHRcdFx0ICogQGRlZmF1bHQgZnVuY3Rpb24gKGRldGVybWluZSB1bmlxdWUgaWQpXG5cdFx0XHQgKi9cblx0XHRcdGlkOiBmdW5jdGlvbih5YXNyKXtcblx0XHRcdFx0cmV0dXJuIFwicmVzdWx0c19cIiArIHV0aWxzLmRldGVybWluZUlkKHlhc3IuY29udGFpbmVyKTtcblx0XHRcdH0sXG5cdFx0XHQvKipcblx0XHRcdCAqIFRoZSByZXN1bHQgc2V0IG1pZ2h0IHRvbyBsYXJnZSB0byBmaXQgaW4gbG9jYWwgc3RvcmFnZS4gXG5cdFx0XHQgKiBJdCBpcyBpbXBvc3NpYmxlIHRvIGRldGVjdCBob3cgbGFyZ2UgdGhlIGxvY2FsIHN0b3JhZ2UgaXMuXG5cdFx0XHQgKiBUaGVyZWZvcmUsIHdlIGRvIG5vdCBzdG9yZSBhbGwgcmVzdWx0cyBpbiBsb2NhbCBzdG9yYWdlLCBkZXBlbmRpbmcgb24gYSBtYXggbnVtYmVyIG9mIGNoYXJhY3RlcnMgaW4gdGhlIFNQQVJRTCByZXN1bHQgc2VyaWFsaXphdGlvbi5cblx0XHRcdCAqIFNldCB0aGlzIGZ1bmN0aW9uIGNvbnNlcnZpdGF2ZWx5LiAoZXNwZWNpYWxseSB3aGVuIHVzaW5nIG11bHRpcGxlIFlBU1IgaW5zdGFuY2VzIG9uIG9uZSBwYWdlKVxuXHRcdFx0ICogXG5cdFx0XHQgKiBAcHJvcGVydHkgcGVyc2lzdGVuY3kucmVzdWx0cy5tYXhTaXplXG5cdFx0XHQgKiBAdHlwZSBpbnRcblx0XHRcdCAqIEBkZWZhdWx0IDEwMDAwMFxuXHRcdFx0ICovXG5cdFx0XHRtYXhTaXplOiAxMDAwMDAgLy9jaGFyIGNvdW50XG5cdFx0fVxuXHRcdFxuXHR9LFxuXHRcblx0XG59O1xucm9vdC52ZXJzaW9uID0ge1xuXHRcIllBU1JcIiA6IHJlcXVpcmUoXCIuLi9wYWNrYWdlLmpzb25cIikudmVyc2lvbixcblx0XCJqcXVlcnlcIjogJC5mbi5qcXVlcnksXG5cdFwieWFzZ3VpLXV0aWxzXCI6IHJlcXVpcmUoXCJ5YXNndWktdXRpbHNcIikudmVyc2lvblxufTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiLyoqXG4gKiBqUXVlcnktY3N2IChqUXVlcnkgUGx1Z2luKVxuICogdmVyc2lvbjogMC43MSAoMjAxMi0xMS0xOSlcbiAqXG4gKiBUaGlzIGRvY3VtZW50IGlzIGxpY2Vuc2VkIGFzIGZyZWUgc29mdHdhcmUgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZVxuICogTUlUIExpY2Vuc2U6IGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UucGhwXG4gKlxuICogQWNrbm93bGVkZ2VtZW50czpcbiAqIFRoZSBvcmlnaW5hbCBkZXNpZ24gYW5kIGluZmx1ZW5jZSB0byBpbXBsZW1lbnQgdGhpcyBsaWJyYXJ5IGFzIGEganF1ZXJ5XG4gKiBwbHVnaW4gaXMgaW5mbHVlbmNlZCBieSBqcXVlcnktanNvbiAoaHR0cDovL2NvZGUuZ29vZ2xlLmNvbS9wL2pxdWVyeS1qc29uLykuXG4gKiBJZiB5b3UncmUgbG9va2luZyB0byB1c2UgbmF0aXZlIEpTT04uU3RyaW5naWZ5IGJ1dCB3YW50IGFkZGl0aW9uYWwgYmFja3dhcmRzXG4gKiBjb21wYXRpYmlsaXR5IGZvciBicm93c2VycyB0aGF0IGRvbid0IHN1cHBvcnQgaXQsIEkgaGlnaGx5IHJlY29tbWVuZCB5b3VcbiAqIGNoZWNrIGl0IG91dC5cbiAqXG4gKiBBIHNwZWNpYWwgdGhhbmtzIGdvZXMgb3V0IHRvIHJ3a0BhY20ub3JnIGZvciBwcm92aWRpbmcgYSBsb3Qgb2YgdmFsdWFibGVcbiAqIGZlZWRiYWNrIHRvIHRoZSBwcm9qZWN0IGluY2x1ZGluZyB0aGUgY29yZSBmb3IgdGhlIG5ldyBGU01cbiAqIChGaW5pdGUgU3RhdGUgTWFjaGluZSkgcGFyc2Vycy4gSWYgeW91J3JlIGxvb2tpbmcgZm9yIGEgc3RhYmxlIFRTViBwYXJzZXJcbiAqIGJlIHN1cmUgdG8gdGFrZSBhIGxvb2sgYXQganF1ZXJ5LXRzdiAoaHR0cDovL2NvZGUuZ29vZ2xlLmNvbS9wL2pxdWVyeS10c3YvKS5cblxuICogRm9yIGxlZ2FsIHB1cnBvc2VzIEknbGwgaW5jbHVkZSB0aGUgXCJOTyBXQVJSQU5UWSBFWFBSRVNTRUQgT1IgSU1QTElFRC5cbiAqIFVTRSBBVCBZT1VSIE9XTiBSSVNLLlwiLiBXaGljaCwgaW4gJ2xheW1hbidzIHRlcm1zJyBtZWFucywgYnkgdXNpbmcgdGhpc1xuICogbGlicmFyeSB5b3UgYXJlIGFjY2VwdGluZyByZXNwb25zaWJpbGl0eSBpZiBpdCBicmVha3MgeW91ciBjb2RlLlxuICpcbiAqIExlZ2FsIGphcmdvbiBhc2lkZSwgSSB3aWxsIGRvIG15IGJlc3QgdG8gcHJvdmlkZSBhIHVzZWZ1bCBhbmQgc3RhYmxlIGNvcmVcbiAqIHRoYXQgY2FuIGVmZmVjdGl2ZWx5IGJlIGJ1aWx0IG9uLlxuICpcbiAqIENvcHlyaWdodGVkIDIwMTIgYnkgRXZhbiBQbGFpY2UuXG4gKi9cblxuUmVnRXhwLmVzY2FwZT0gZnVuY3Rpb24ocykge1xuICAgIHJldHVybiBzLnJlcGxhY2UoL1stXFwvXFxcXF4kKis/LigpfFtcXF17fV0vZywgJ1xcXFwkJicpO1xufTtcblxuKGZ1bmN0aW9uKCAkICkge1xuICAndXNlIHN0cmljdCdcbiAgLyoqXG4gICAqIGpRdWVyeS5jc3YuZGVmYXVsdHNcbiAgICogRW5jYXBzdWxhdGVzIHRoZSBtZXRob2QgcGFyYW1hdGVyIGRlZmF1bHRzIGZvciB0aGUgQ1NWIHBsdWdpbiBtb2R1bGUuXG4gICAqL1xuXG4gICQuY3N2ID0ge1xuICAgIGRlZmF1bHRzOiB7XG4gICAgICBzZXBhcmF0b3I6JywnLFxuICAgICAgZGVsaW1pdGVyOidcIicsXG4gICAgICBoZWFkZXJzOnRydWVcbiAgICB9LFxuXG4gICAgaG9va3M6IHtcbiAgICAgIGNhc3RUb1NjYWxhcjogZnVuY3Rpb24odmFsdWUsIHN0YXRlKSB7XG4gICAgICAgIHZhciBoYXNEb3QgPSAvXFwuLztcbiAgICAgICAgaWYgKGlzTmFOKHZhbHVlKSkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoaGFzRG90LnRlc3QodmFsdWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VGbG9hdCh2YWx1ZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBpbnRlZ2VyID0gcGFyc2VJbnQodmFsdWUpO1xuICAgICAgICAgICAgaWYoaXNOYU4oaW50ZWdlcikpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gaW50ZWdlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuXG4gICAgcGFyc2Vyczoge1xuICAgICAgcGFyc2U6IGZ1bmN0aW9uKGNzdiwgb3B0aW9ucykge1xuICAgICAgICAvLyBjYWNoZSBzZXR0aW5nc1xuICAgICAgICB2YXIgc2VwYXJhdG9yID0gb3B0aW9ucy5zZXBhcmF0b3I7XG4gICAgICAgIHZhciBkZWxpbWl0ZXIgPSBvcHRpb25zLmRlbGltaXRlcjtcblxuICAgICAgICAvLyBzZXQgaW5pdGlhbCBzdGF0ZSBpZiBpdCdzIG1pc3NpbmdcbiAgICAgICAgaWYoIW9wdGlvbnMuc3RhdGUucm93TnVtKSB7XG4gICAgICAgICAgb3B0aW9ucy5zdGF0ZS5yb3dOdW0gPSAxO1xuICAgICAgICB9XG4gICAgICAgIGlmKCFvcHRpb25zLnN0YXRlLmNvbE51bSkge1xuICAgICAgICAgIG9wdGlvbnMuc3RhdGUuY29sTnVtID0gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNsZWFyIGluaXRpYWwgc3RhdGVcbiAgICAgICAgdmFyIGRhdGEgPSBbXTtcbiAgICAgICAgdmFyIGVudHJ5ID0gW107XG4gICAgICAgIHZhciBzdGF0ZSA9IDA7XG4gICAgICAgIHZhciB2YWx1ZSA9ICcnXG4gICAgICAgIHZhciBleGl0ID0gZmFsc2U7XG5cbiAgICAgICAgZnVuY3Rpb24gZW5kT2ZFbnRyeSgpIHtcbiAgICAgICAgICAvLyByZXNldCB0aGUgc3RhdGVcbiAgICAgICAgICBzdGF0ZSA9IDA7XG4gICAgICAgICAgdmFsdWUgPSAnJztcblxuICAgICAgICAgIC8vIGlmICdzdGFydCcgaGFzbid0IGJlZW4gbWV0LCBkb24ndCBvdXRwdXRcbiAgICAgICAgICBpZihvcHRpb25zLnN0YXJ0ICYmIG9wdGlvbnMuc3RhdGUucm93TnVtIDwgb3B0aW9ucy5zdGFydCkge1xuICAgICAgICAgICAgLy8gdXBkYXRlIGdsb2JhbCBzdGF0ZVxuICAgICAgICAgICAgZW50cnkgPSBbXTtcbiAgICAgICAgICAgIG9wdGlvbnMuc3RhdGUucm93TnVtKys7XG4gICAgICAgICAgICBvcHRpb25zLnN0YXRlLmNvbE51bSA9IDE7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIGlmKG9wdGlvbnMub25QYXJzZUVudHJ5ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIG9uUGFyc2VFbnRyeSBob29rIG5vdCBzZXRcbiAgICAgICAgICAgIGRhdGEucHVzaChlbnRyeSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBob29rVmFsID0gb3B0aW9ucy5vblBhcnNlRW50cnkoZW50cnksIG9wdGlvbnMuc3RhdGUpOyAvLyBvblBhcnNlRW50cnkgSG9va1xuICAgICAgICAgICAgLy8gZmFsc2Ugc2tpcHMgdGhlIHJvdywgY29uZmlndXJhYmxlIHRocm91Z2ggYSBob29rXG4gICAgICAgICAgICBpZihob29rVmFsICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICBkYXRhLnB1c2goaG9va1ZhbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vY29uc29sZS5sb2coJ2VudHJ5OicgKyBlbnRyeSk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gY2xlYW51cFxuICAgICAgICAgIGVudHJ5ID0gW107XG5cbiAgICAgICAgICAvLyBpZiAnZW5kJyBpcyBtZXQsIHN0b3AgcGFyc2luZ1xuICAgICAgICAgIGlmKG9wdGlvbnMuZW5kICYmIG9wdGlvbnMuc3RhdGUucm93TnVtID49IG9wdGlvbnMuZW5kKSB7XG4gICAgICAgICAgICBleGl0ID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gdXBkYXRlIGdsb2JhbCBzdGF0ZVxuICAgICAgICAgIG9wdGlvbnMuc3RhdGUucm93TnVtKys7XG4gICAgICAgICAgb3B0aW9ucy5zdGF0ZS5jb2xOdW0gPSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZW5kT2ZWYWx1ZSgpIHtcbiAgICAgICAgICBpZihvcHRpb25zLm9uUGFyc2VWYWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBvblBhcnNlVmFsdWUgaG9vayBub3Qgc2V0XG4gICAgICAgICAgICBlbnRyeS5wdXNoKHZhbHVlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGhvb2sgPSBvcHRpb25zLm9uUGFyc2VWYWx1ZSh2YWx1ZSwgb3B0aW9ucy5zdGF0ZSk7IC8vIG9uUGFyc2VWYWx1ZSBIb29rXG4gICAgICAgICAgICAvLyBmYWxzZSBza2lwcyB0aGUgcm93LCBjb25maWd1cmFibGUgdGhyb3VnaCBhIGhvb2tcbiAgICAgICAgICAgIGlmKGhvb2sgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgIGVudHJ5LnB1c2goaG9vayk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vY29uc29sZS5sb2coJ3ZhbHVlOicgKyB2YWx1ZSk7XG4gICAgICAgICAgLy8gcmVzZXQgdGhlIHN0YXRlXG4gICAgICAgICAgdmFsdWUgPSAnJztcbiAgICAgICAgICBzdGF0ZSA9IDA7XG4gICAgICAgICAgLy8gdXBkYXRlIGdsb2JhbCBzdGF0ZVxuICAgICAgICAgIG9wdGlvbnMuc3RhdGUuY29sTnVtKys7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBlc2NhcGUgcmVnZXgtc3BlY2lmaWMgY29udHJvbCBjaGFyc1xuICAgICAgICB2YXIgZXNjU2VwYXJhdG9yID0gUmVnRXhwLmVzY2FwZShzZXBhcmF0b3IpO1xuICAgICAgICB2YXIgZXNjRGVsaW1pdGVyID0gUmVnRXhwLmVzY2FwZShkZWxpbWl0ZXIpO1xuXG4gICAgICAgIC8vIGNvbXBpbGUgdGhlIHJlZ0V4IHN0ciB1c2luZyB0aGUgY3VzdG9tIGRlbGltaXRlci9zZXBhcmF0b3JcbiAgICAgICAgdmFyIG1hdGNoID0gLyhEfFN8XFxufFxccnxbXkRTXFxyXFxuXSspLztcbiAgICAgICAgdmFyIG1hdGNoU3JjID0gbWF0Y2guc291cmNlO1xuICAgICAgICBtYXRjaFNyYyA9IG1hdGNoU3JjLnJlcGxhY2UoL1MvZywgZXNjU2VwYXJhdG9yKTtcbiAgICAgICAgbWF0Y2hTcmMgPSBtYXRjaFNyYy5yZXBsYWNlKC9EL2csIGVzY0RlbGltaXRlcik7XG4gICAgICAgIG1hdGNoID0gUmVnRXhwKG1hdGNoU3JjLCAnZ20nKTtcblxuICAgICAgICAvLyBwdXQgb24geW91ciBmYW5jeSBwYW50cy4uLlxuICAgICAgICAvLyBwcm9jZXNzIGNvbnRyb2wgY2hhcnMgaW5kaXZpZHVhbGx5LCB1c2UgbG9vay1haGVhZCBvbiBub24tY29udHJvbCBjaGFyc1xuICAgICAgICBjc3YucmVwbGFjZShtYXRjaCwgZnVuY3Rpb24gKG0wKSB7XG4gICAgICAgICAgaWYoZXhpdCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzd2l0Y2ggKHN0YXRlKSB7XG4gICAgICAgICAgICAvLyB0aGUgc3RhcnQgb2YgYSB2YWx1ZVxuICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAvLyBudWxsIGxhc3QgdmFsdWVcbiAgICAgICAgICAgICAgaWYgKG0wID09PSBzZXBhcmF0b3IpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSArPSAnJztcbiAgICAgICAgICAgICAgICBlbmRPZlZhbHVlKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gb3BlbmluZyBkZWxpbWl0ZXJcbiAgICAgICAgICAgICAgaWYgKG0wID09PSBkZWxpbWl0ZXIpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZSA9IDE7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gbnVsbCBsYXN0IHZhbHVlXG4gICAgICAgICAgICAgIGlmIChtMCA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICBlbmRPZlZhbHVlKCk7XG4gICAgICAgICAgICAgICAgZW5kT2ZFbnRyeSgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vIHBoYW50b20gY2FycmlhZ2UgcmV0dXJuXG4gICAgICAgICAgICAgIGlmICgvXlxcciQvLnRlc3QobTApKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gdW4tZGVsaW1pdGVkIHZhbHVlXG4gICAgICAgICAgICAgIHZhbHVlICs9IG0wO1xuICAgICAgICAgICAgICBzdGF0ZSA9IDM7XG4gICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAvLyBkZWxpbWl0ZWQgaW5wdXRcbiAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgLy8gc2Vjb25kIGRlbGltaXRlcj8gY2hlY2sgZnVydGhlclxuICAgICAgICAgICAgICBpZiAobTAgPT09IGRlbGltaXRlcikge1xuICAgICAgICAgICAgICAgIHN0YXRlID0gMjtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLyBkZWxpbWl0ZWQgZGF0YVxuICAgICAgICAgICAgICB2YWx1ZSArPSBtMDtcbiAgICAgICAgICAgICAgc3RhdGUgPSAxO1xuICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgLy8gZGVsaW1pdGVyIGZvdW5kIGluIGRlbGltaXRlZCBpbnB1dFxuICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAvLyBlc2NhcGVkIGRlbGltaXRlcj9cbiAgICAgICAgICAgICAgaWYgKG0wID09PSBkZWxpbWl0ZXIpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSArPSBtMDtcbiAgICAgICAgICAgICAgICBzdGF0ZSA9IDE7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gbnVsbCB2YWx1ZVxuICAgICAgICAgICAgICBpZiAobTAgPT09IHNlcGFyYXRvcikge1xuICAgICAgICAgICAgICAgIGVuZE9mVmFsdWUoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLyBlbmQgb2YgZW50cnlcbiAgICAgICAgICAgICAgaWYgKG0wID09PSAnXFxuJykge1xuICAgICAgICAgICAgICAgIGVuZE9mVmFsdWUoKTtcbiAgICAgICAgICAgICAgICBlbmRPZkVudHJ5KCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gcGhhbnRvbSBjYXJyaWFnZSByZXR1cm5cbiAgICAgICAgICAgICAgaWYgKC9eXFxyJC8udGVzdChtMCkpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLyBicm9rZW4gcGFzZXI/XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ1NWRGF0YUVycm9yOiBJbGxlZ2FsIFN0YXRlIFtSb3c6JyArIG9wdGlvbnMuc3RhdGUucm93TnVtICsgJ11bQ29sOicgKyBvcHRpb25zLnN0YXRlLmNvbE51bSArICddJyk7XG5cbiAgICAgICAgICAgIC8vIHVuLWRlbGltaXRlZCBpbnB1dFxuICAgICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgICAvLyBudWxsIGxhc3QgdmFsdWVcbiAgICAgICAgICAgICAgaWYgKG0wID09PSBzZXBhcmF0b3IpIHtcbiAgICAgICAgICAgICAgICBlbmRPZlZhbHVlKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gZW5kIG9mIGVudHJ5XG4gICAgICAgICAgICAgIGlmIChtMCA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICBlbmRPZlZhbHVlKCk7XG4gICAgICAgICAgICAgICAgZW5kT2ZFbnRyeSgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vIHBoYW50b20gY2FycmlhZ2UgcmV0dXJuXG4gICAgICAgICAgICAgIGlmICgvXlxcciQvLnRlc3QobTApKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKG0wID09PSBkZWxpbWl0ZXIpIHtcbiAgICAgICAgICAgICAgLy8gbm9uLWNvbXBsaWFudCBkYXRhXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDU1ZEYXRhRXJyb3I6IElsbGVnYWwgUXVvdGUgW1JvdzonICsgb3B0aW9ucy5zdGF0ZS5yb3dOdW0gKyAnXVtDb2w6JyArIG9wdGlvbnMuc3RhdGUuY29sTnVtICsgJ10nKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLyBicm9rZW4gcGFyc2VyP1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NTVkRhdGFFcnJvcjogSWxsZWdhbCBEYXRhIFtSb3c6JyArIG9wdGlvbnMuc3RhdGUucm93TnVtICsgJ11bQ29sOicgKyBvcHRpb25zLnN0YXRlLmNvbE51bSArICddJyk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAvLyBzaGVuYW5pZ2Fuc1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NTVkRhdGFFcnJvcjogVW5rbm93biBTdGF0ZSBbUm93OicgKyBvcHRpb25zLnN0YXRlLnJvd051bSArICddW0NvbDonICsgb3B0aW9ucy5zdGF0ZS5jb2xOdW0gKyAnXScpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvL2NvbnNvbGUubG9nKCd2YWw6JyArIG0wICsgJyBzdGF0ZTonICsgc3RhdGUpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBzdWJtaXQgdGhlIGxhc3QgZW50cnlcbiAgICAgICAgLy8gaWdub3JlIG51bGwgbGFzdCBsaW5lXG4gICAgICAgIGlmKGVudHJ5Lmxlbmd0aCAhPT0gMCkge1xuICAgICAgICAgIGVuZE9mVmFsdWUoKTtcbiAgICAgICAgICBlbmRPZkVudHJ5KCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgIH0sXG5cbiAgICAgIC8vIGEgY3N2LXNwZWNpZmljIGxpbmUgc3BsaXR0ZXJcbiAgICAgIHNwbGl0TGluZXM6IGZ1bmN0aW9uKGNzdiwgb3B0aW9ucykge1xuICAgICAgICAvLyBjYWNoZSBzZXR0aW5nc1xuICAgICAgICB2YXIgc2VwYXJhdG9yID0gb3B0aW9ucy5zZXBhcmF0b3I7XG4gICAgICAgIHZhciBkZWxpbWl0ZXIgPSBvcHRpb25zLmRlbGltaXRlcjtcblxuICAgICAgICAvLyBzZXQgaW5pdGlhbCBzdGF0ZSBpZiBpdCdzIG1pc3NpbmdcbiAgICAgICAgaWYoIW9wdGlvbnMuc3RhdGUucm93TnVtKSB7XG4gICAgICAgICAgb3B0aW9ucy5zdGF0ZS5yb3dOdW0gPSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY2xlYXIgaW5pdGlhbCBzdGF0ZVxuICAgICAgICB2YXIgZW50cmllcyA9IFtdO1xuICAgICAgICB2YXIgc3RhdGUgPSAwO1xuICAgICAgICB2YXIgZW50cnkgPSAnJztcbiAgICAgICAgdmFyIGV4aXQgPSBmYWxzZTtcblxuICAgICAgICBmdW5jdGlvbiBlbmRPZkxpbmUoKSB7ICAgICAgICAgIFxuICAgICAgICAgIC8vIHJlc2V0IHRoZSBzdGF0ZVxuICAgICAgICAgIHN0YXRlID0gMDtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBpZiAnc3RhcnQnIGhhc24ndCBiZWVuIG1ldCwgZG9uJ3Qgb3V0cHV0XG4gICAgICAgICAgaWYob3B0aW9ucy5zdGFydCAmJiBvcHRpb25zLnN0YXRlLnJvd051bSA8IG9wdGlvbnMuc3RhcnQpIHtcbiAgICAgICAgICAgIC8vIHVwZGF0ZSBnbG9iYWwgc3RhdGVcbiAgICAgICAgICAgIGVudHJ5ID0gJyc7XG4gICAgICAgICAgICBvcHRpb25zLnN0YXRlLnJvd051bSsrO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICBpZihvcHRpb25zLm9uUGFyc2VFbnRyeSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBvblBhcnNlRW50cnkgaG9vayBub3Qgc2V0XG4gICAgICAgICAgICBlbnRyaWVzLnB1c2goZW50cnkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgaG9va1ZhbCA9IG9wdGlvbnMub25QYXJzZUVudHJ5KGVudHJ5LCBvcHRpb25zLnN0YXRlKTsgLy8gb25QYXJzZUVudHJ5IEhvb2tcbiAgICAgICAgICAgIC8vIGZhbHNlIHNraXBzIHRoZSByb3csIGNvbmZpZ3VyYWJsZSB0aHJvdWdoIGEgaG9va1xuICAgICAgICAgICAgaWYoaG9va1ZhbCAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgZW50cmllcy5wdXNoKGhvb2tWYWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGNsZWFudXBcbiAgICAgICAgICBlbnRyeSA9ICcnO1xuXG4gICAgICAgICAgLy8gaWYgJ2VuZCcgaXMgbWV0LCBzdG9wIHBhcnNpbmdcbiAgICAgICAgICBpZihvcHRpb25zLmVuZCAmJiBvcHRpb25zLnN0YXRlLnJvd051bSA+PSBvcHRpb25zLmVuZCkge1xuICAgICAgICAgICAgZXhpdCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICAgIC8vIHVwZGF0ZSBnbG9iYWwgc3RhdGVcbiAgICAgICAgICBvcHRpb25zLnN0YXRlLnJvd051bSsrO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gZXNjYXBlIHJlZ2V4LXNwZWNpZmljIGNvbnRyb2wgY2hhcnNcbiAgICAgICAgdmFyIGVzY1NlcGFyYXRvciA9IFJlZ0V4cC5lc2NhcGUoc2VwYXJhdG9yKTtcbiAgICAgICAgdmFyIGVzY0RlbGltaXRlciA9IFJlZ0V4cC5lc2NhcGUoZGVsaW1pdGVyKTtcblxuICAgICAgICAvLyBjb21waWxlIHRoZSByZWdFeCBzdHIgdXNpbmcgdGhlIGN1c3RvbSBkZWxpbWl0ZXIvc2VwYXJhdG9yXG4gICAgICAgIHZhciBtYXRjaCA9IC8oRHxTfFxcbnxcXHJ8W15EU1xcclxcbl0rKS87XG4gICAgICAgIHZhciBtYXRjaFNyYyA9IG1hdGNoLnNvdXJjZTtcbiAgICAgICAgbWF0Y2hTcmMgPSBtYXRjaFNyYy5yZXBsYWNlKC9TL2csIGVzY1NlcGFyYXRvcik7XG4gICAgICAgIG1hdGNoU3JjID0gbWF0Y2hTcmMucmVwbGFjZSgvRC9nLCBlc2NEZWxpbWl0ZXIpO1xuICAgICAgICBtYXRjaCA9IFJlZ0V4cChtYXRjaFNyYywgJ2dtJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBwdXQgb24geW91ciBmYW5jeSBwYW50cy4uLlxuICAgICAgICAvLyBwcm9jZXNzIGNvbnRyb2wgY2hhcnMgaW5kaXZpZHVhbGx5LCB1c2UgbG9vay1haGVhZCBvbiBub24tY29udHJvbCBjaGFyc1xuICAgICAgICBjc3YucmVwbGFjZShtYXRjaCwgZnVuY3Rpb24gKG0wKSB7XG4gICAgICAgICAgaWYoZXhpdCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzd2l0Y2ggKHN0YXRlKSB7XG4gICAgICAgICAgICAvLyB0aGUgc3RhcnQgb2YgYSB2YWx1ZS9lbnRyeVxuICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAvLyBudWxsIHZhbHVlXG4gICAgICAgICAgICAgIGlmIChtMCA9PT0gc2VwYXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgZW50cnkgKz0gbTA7XG4gICAgICAgICAgICAgICAgc3RhdGUgPSAwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vIG9wZW5pbmcgZGVsaW1pdGVyXG4gICAgICAgICAgICAgIGlmIChtMCA9PT0gZGVsaW1pdGVyKSB7XG4gICAgICAgICAgICAgICAgZW50cnkgKz0gbTA7XG4gICAgICAgICAgICAgICAgc3RhdGUgPSAxO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vIGVuZCBvZiBsaW5lXG4gICAgICAgICAgICAgIGlmIChtMCA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICBlbmRPZkxpbmUoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLyBwaGFudG9tIGNhcnJpYWdlIHJldHVyblxuICAgICAgICAgICAgICBpZiAoL15cXHIkLy50ZXN0KG0wKSkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vIHVuLWRlbGltaXQgdmFsdWVcbiAgICAgICAgICAgICAgZW50cnkgKz0gbTA7XG4gICAgICAgICAgICAgIHN0YXRlID0gMztcbiAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIC8vIGRlbGltaXRlZCBpbnB1dFxuICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAvLyBzZWNvbmQgZGVsaW1pdGVyPyBjaGVjayBmdXJ0aGVyXG4gICAgICAgICAgICAgIGlmIChtMCA9PT0gZGVsaW1pdGVyKSB7XG4gICAgICAgICAgICAgICAgZW50cnkgKz0gbTA7XG4gICAgICAgICAgICAgICAgc3RhdGUgPSAyO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vIGRlbGltaXRlZCBkYXRhXG4gICAgICAgICAgICAgIGVudHJ5ICs9IG0wO1xuICAgICAgICAgICAgICBzdGF0ZSA9IDE7XG4gICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAvLyBkZWxpbWl0ZXIgZm91bmQgaW4gZGVsaW1pdGVkIGlucHV0XG4gICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgIC8vIGVzY2FwZWQgZGVsaW1pdGVyP1xuICAgICAgICAgICAgICB2YXIgcHJldkNoYXIgPSBlbnRyeS5zdWJzdHIoZW50cnkubGVuZ3RoIC0gMSk7XG4gICAgICAgICAgICAgIGlmIChtMCA9PT0gZGVsaW1pdGVyICYmIHByZXZDaGFyID09PSBkZWxpbWl0ZXIpIHtcbiAgICAgICAgICAgICAgICBlbnRyeSArPSBtMDtcbiAgICAgICAgICAgICAgICBzdGF0ZSA9IDE7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gZW5kIG9mIHZhbHVlXG4gICAgICAgICAgICAgIGlmIChtMCA9PT0gc2VwYXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgZW50cnkgKz0gbTA7XG4gICAgICAgICAgICAgICAgc3RhdGUgPSAwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vIGVuZCBvZiBsaW5lXG4gICAgICAgICAgICAgIGlmIChtMCA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICBlbmRPZkxpbmUoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLyBwaGFudG9tIGNhcnJpYWdlIHJldHVyblxuICAgICAgICAgICAgICBpZiAobTAgPT09ICdcXHInKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gYnJva2VuIHBhc2VyP1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NTVkRhdGFFcnJvcjogSWxsZWdhbCBzdGF0ZSBbUm93OicgKyBvcHRpb25zLnN0YXRlLnJvd051bSArICddJyk7XG5cbiAgICAgICAgICAgIC8vIHVuLWRlbGltaXRlZCBpbnB1dFxuICAgICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgICAvLyBudWxsIHZhbHVlXG4gICAgICAgICAgICAgIGlmIChtMCA9PT0gc2VwYXJhdG9yKSB7XG4gICAgICAgICAgICAgICAgZW50cnkgKz0gbTA7XG4gICAgICAgICAgICAgICAgc3RhdGUgPSAwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vIGVuZCBvZiBsaW5lXG4gICAgICAgICAgICAgIGlmIChtMCA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICBlbmRPZkxpbmUoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLyBwaGFudG9tIGNhcnJpYWdlIHJldHVyblxuICAgICAgICAgICAgICBpZiAobTAgPT09ICdcXHInKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gbm9uLWNvbXBsaWFudCBkYXRhXG4gICAgICAgICAgICAgIGlmIChtMCA9PT0gZGVsaW1pdGVyKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDU1ZEYXRhRXJyb3I6IElsbGVnYWwgcXVvdGUgW1JvdzonICsgb3B0aW9ucy5zdGF0ZS5yb3dOdW0gKyAnXScpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIC8vIGJyb2tlbiBwYXJzZXI/XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ1NWRGF0YUVycm9yOiBJbGxlZ2FsIHN0YXRlIFtSb3c6JyArIG9wdGlvbnMuc3RhdGUucm93TnVtICsgJ10nKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgIC8vIHNoZW5hbmlnYW5zXG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ1NWRGF0YUVycm9yOiBVbmtub3duIHN0YXRlIFtSb3c6JyArIG9wdGlvbnMuc3RhdGUucm93TnVtICsgJ10nKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy9jb25zb2xlLmxvZygndmFsOicgKyBtMCArICcgc3RhdGU6JyArIHN0YXRlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gc3VibWl0IHRoZSBsYXN0IGVudHJ5XG4gICAgICAgIC8vIGlnbm9yZSBudWxsIGxhc3QgbGluZVxuICAgICAgICBpZihlbnRyeSAhPT0gJycpIHtcbiAgICAgICAgICBlbmRPZkxpbmUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBlbnRyaWVzO1xuICAgICAgfSxcblxuICAgICAgLy8gYSBjc3YgZW50cnkgcGFyc2VyXG4gICAgICBwYXJzZUVudHJ5OiBmdW5jdGlvbihjc3YsIG9wdGlvbnMpIHtcbiAgICAgICAgLy8gY2FjaGUgc2V0dGluZ3NcbiAgICAgICAgdmFyIHNlcGFyYXRvciA9IG9wdGlvbnMuc2VwYXJhdG9yO1xuICAgICAgICB2YXIgZGVsaW1pdGVyID0gb3B0aW9ucy5kZWxpbWl0ZXI7XG4gICAgICAgIFxuICAgICAgICAvLyBzZXQgaW5pdGlhbCBzdGF0ZSBpZiBpdCdzIG1pc3NpbmdcbiAgICAgICAgaWYoIW9wdGlvbnMuc3RhdGUucm93TnVtKSB7XG4gICAgICAgICAgb3B0aW9ucy5zdGF0ZS5yb3dOdW0gPSAxO1xuICAgICAgICB9XG4gICAgICAgIGlmKCFvcHRpb25zLnN0YXRlLmNvbE51bSkge1xuICAgICAgICAgIG9wdGlvbnMuc3RhdGUuY29sTnVtID0gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNsZWFyIGluaXRpYWwgc3RhdGVcbiAgICAgICAgdmFyIGVudHJ5ID0gW107XG4gICAgICAgIHZhciBzdGF0ZSA9IDA7XG4gICAgICAgIHZhciB2YWx1ZSA9ICcnO1xuXG4gICAgICAgIGZ1bmN0aW9uIGVuZE9mVmFsdWUoKSB7XG4gICAgICAgICAgaWYob3B0aW9ucy5vblBhcnNlVmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gb25QYXJzZVZhbHVlIGhvb2sgbm90IHNldFxuICAgICAgICAgICAgZW50cnkucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBob29rID0gb3B0aW9ucy5vblBhcnNlVmFsdWUodmFsdWUsIG9wdGlvbnMuc3RhdGUpOyAvLyBvblBhcnNlVmFsdWUgSG9va1xuICAgICAgICAgICAgLy8gZmFsc2Ugc2tpcHMgdGhlIHZhbHVlLCBjb25maWd1cmFibGUgdGhyb3VnaCBhIGhvb2tcbiAgICAgICAgICAgIGlmKGhvb2sgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgIGVudHJ5LnB1c2goaG9vayk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIHJlc2V0IHRoZSBzdGF0ZVxuICAgICAgICAgIHZhbHVlID0gJyc7XG4gICAgICAgICAgc3RhdGUgPSAwO1xuICAgICAgICAgIC8vIHVwZGF0ZSBnbG9iYWwgc3RhdGVcbiAgICAgICAgICBvcHRpb25zLnN0YXRlLmNvbE51bSsrO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY2hlY2tlZCBmb3IgYSBjYWNoZWQgcmVnRXggZmlyc3RcbiAgICAgICAgaWYoIW9wdGlvbnMubWF0Y2gpIHtcbiAgICAgICAgICAvLyBlc2NhcGUgcmVnZXgtc3BlY2lmaWMgY29udHJvbCBjaGFyc1xuICAgICAgICAgIHZhciBlc2NTZXBhcmF0b3IgPSBSZWdFeHAuZXNjYXBlKHNlcGFyYXRvcik7XG4gICAgICAgICAgdmFyIGVzY0RlbGltaXRlciA9IFJlZ0V4cC5lc2NhcGUoZGVsaW1pdGVyKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBjb21waWxlIHRoZSByZWdFeCBzdHIgdXNpbmcgdGhlIGN1c3RvbSBkZWxpbWl0ZXIvc2VwYXJhdG9yXG4gICAgICAgICAgdmFyIG1hdGNoID0gLyhEfFN8XFxufFxccnxbXkRTXFxyXFxuXSspLztcbiAgICAgICAgICB2YXIgbWF0Y2hTcmMgPSBtYXRjaC5zb3VyY2U7XG4gICAgICAgICAgbWF0Y2hTcmMgPSBtYXRjaFNyYy5yZXBsYWNlKC9TL2csIGVzY1NlcGFyYXRvcik7XG4gICAgICAgICAgbWF0Y2hTcmMgPSBtYXRjaFNyYy5yZXBsYWNlKC9EL2csIGVzY0RlbGltaXRlcik7XG4gICAgICAgICAgb3B0aW9ucy5tYXRjaCA9IFJlZ0V4cChtYXRjaFNyYywgJ2dtJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBwdXQgb24geW91ciBmYW5jeSBwYW50cy4uLlxuICAgICAgICAvLyBwcm9jZXNzIGNvbnRyb2wgY2hhcnMgaW5kaXZpZHVhbGx5LCB1c2UgbG9vay1haGVhZCBvbiBub24tY29udHJvbCBjaGFyc1xuICAgICAgICBjc3YucmVwbGFjZShvcHRpb25zLm1hdGNoLCBmdW5jdGlvbiAobTApIHtcbiAgICAgICAgICBzd2l0Y2ggKHN0YXRlKSB7XG4gICAgICAgICAgICAvLyB0aGUgc3RhcnQgb2YgYSB2YWx1ZVxuICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAvLyBudWxsIGxhc3QgdmFsdWVcbiAgICAgICAgICAgICAgaWYgKG0wID09PSBzZXBhcmF0b3IpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSArPSAnJztcbiAgICAgICAgICAgICAgICBlbmRPZlZhbHVlKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gb3BlbmluZyBkZWxpbWl0ZXJcbiAgICAgICAgICAgICAgaWYgKG0wID09PSBkZWxpbWl0ZXIpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZSA9IDE7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gc2tpcCB1bi1kZWxpbWl0ZWQgbmV3LWxpbmVzXG4gICAgICAgICAgICAgIGlmIChtMCA9PT0gJ1xcbicgfHwgbTAgPT09ICdcXHInKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gdW4tZGVsaW1pdGVkIHZhbHVlXG4gICAgICAgICAgICAgIHZhbHVlICs9IG0wO1xuICAgICAgICAgICAgICBzdGF0ZSA9IDM7XG4gICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAvLyBkZWxpbWl0ZWQgaW5wdXRcbiAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgLy8gc2Vjb25kIGRlbGltaXRlcj8gY2hlY2sgZnVydGhlclxuICAgICAgICAgICAgICBpZiAobTAgPT09IGRlbGltaXRlcikge1xuICAgICAgICAgICAgICAgIHN0YXRlID0gMjtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLyBkZWxpbWl0ZWQgZGF0YVxuICAgICAgICAgICAgICB2YWx1ZSArPSBtMDtcbiAgICAgICAgICAgICAgc3RhdGUgPSAxO1xuICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgLy8gZGVsaW1pdGVyIGZvdW5kIGluIGRlbGltaXRlZCBpbnB1dFxuICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAvLyBlc2NhcGVkIGRlbGltaXRlcj9cbiAgICAgICAgICAgICAgaWYgKG0wID09PSBkZWxpbWl0ZXIpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSArPSBtMDtcbiAgICAgICAgICAgICAgICBzdGF0ZSA9IDE7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gbnVsbCB2YWx1ZVxuICAgICAgICAgICAgICBpZiAobTAgPT09IHNlcGFyYXRvcikge1xuICAgICAgICAgICAgICAgIGVuZE9mVmFsdWUoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLyBza2lwIHVuLWRlbGltaXRlZCBuZXctbGluZXNcbiAgICAgICAgICAgICAgaWYgKG0wID09PSAnXFxuJyB8fCBtMCA9PT0gJ1xccicpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLyBicm9rZW4gcGFzZXI/XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ1NWRGF0YUVycm9yOiBJbGxlZ2FsIFN0YXRlIFtSb3c6JyArIG9wdGlvbnMuc3RhdGUucm93TnVtICsgJ11bQ29sOicgKyBvcHRpb25zLnN0YXRlLmNvbE51bSArICddJyk7XG5cbiAgICAgICAgICAgIC8vIHVuLWRlbGltaXRlZCBpbnB1dFxuICAgICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgICAvLyBudWxsIGxhc3QgdmFsdWVcbiAgICAgICAgICAgICAgaWYgKG0wID09PSBzZXBhcmF0b3IpIHtcbiAgICAgICAgICAgICAgICBlbmRPZlZhbHVlKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gc2tpcCB1bi1kZWxpbWl0ZWQgbmV3LWxpbmVzXG4gICAgICAgICAgICAgIGlmIChtMCA9PT0gJ1xcbicgfHwgbTAgPT09ICdcXHInKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgLy8gbm9uLWNvbXBsaWFudCBkYXRhXG4gICAgICAgICAgICAgIGlmIChtMCA9PT0gZGVsaW1pdGVyKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDU1ZEYXRhRXJyb3I6IElsbGVnYWwgUXVvdGUgW1JvdzonICsgb3B0aW9ucy5zdGF0ZS5yb3dOdW0gKyAnXVtDb2w6JyArIG9wdGlvbnMuc3RhdGUuY29sTnVtICsgJ10nKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAvLyBicm9rZW4gcGFyc2VyP1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NTVkRhdGFFcnJvcjogSWxsZWdhbCBEYXRhIFtSb3c6JyArIG9wdGlvbnMuc3RhdGUucm93TnVtICsgJ11bQ29sOicgKyBvcHRpb25zLnN0YXRlLmNvbE51bSArICddJyk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAvLyBzaGVuYW5pZ2Fuc1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NTVkRhdGFFcnJvcjogVW5rbm93biBTdGF0ZSBbUm93OicgKyBvcHRpb25zLnN0YXRlLnJvd051bSArICddW0NvbDonICsgb3B0aW9ucy5zdGF0ZS5jb2xOdW0gKyAnXScpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvL2NvbnNvbGUubG9nKCd2YWw6JyArIG0wICsgJyBzdGF0ZTonICsgc3RhdGUpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBzdWJtaXQgdGhlIGxhc3QgdmFsdWVcbiAgICAgICAgZW5kT2ZWYWx1ZSgpO1xuXG4gICAgICAgIHJldHVybiBlbnRyeTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogJC5jc3YudG9BcnJheShjc3YpXG4gICAgICogQ29udmVydHMgYSBDU1YgZW50cnkgc3RyaW5nIHRvIGEgamF2YXNjcmlwdCBhcnJheS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGNzdiBUaGUgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIENTViBkYXRhLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gQW4gb2JqZWN0IGNvbnRhaW5pbmcgdXNlci1kZWZpbmVkIG9wdGlvbnMuXG4gICAgICogQHBhcmFtIHtDaGFyYWN0ZXJ9IFtzZXBhcmF0b3JdIEFuIG92ZXJyaWRlIGZvciB0aGUgc2VwYXJhdG9yIGNoYXJhY3Rlci4gRGVmYXVsdHMgdG8gYSBjb21tYSgsKS5cbiAgICAgKiBAcGFyYW0ge0NoYXJhY3Rlcn0gW2RlbGltaXRlcl0gQW4gb3ZlcnJpZGUgZm9yIHRoZSBkZWxpbWl0ZXIgY2hhcmFjdGVyLiBEZWZhdWx0cyB0byBhIGRvdWJsZS1xdW90ZShcIikuXG4gICAgICpcbiAgICAgKiBUaGlzIG1ldGhvZCBkZWFscyB3aXRoIHNpbXBsZSBDU1Ygc3RyaW5ncyBvbmx5LiBJdCdzIHVzZWZ1bCBpZiB5b3Ugb25seVxuICAgICAqIG5lZWQgdG8gcGFyc2UgYSBzaW5nbGUgZW50cnkuIElmIHlvdSBuZWVkIHRvIHBhcnNlIG1vcmUgdGhhbiBvbmUgbGluZSxcbiAgICAgKiB1c2UgJC5jc3YyQXJyYXkgaW5zdGVhZC5cbiAgICAgKi9cbiAgICB0b0FycmF5OiBmdW5jdGlvbihjc3YsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgb3B0aW9ucyA9IChvcHRpb25zICE9PSB1bmRlZmluZWQgPyBvcHRpb25zIDoge30pO1xuICAgICAgdmFyIGNvbmZpZyA9IHt9O1xuICAgICAgY29uZmlnLmNhbGxiYWNrID0gKChjYWxsYmFjayAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZihjYWxsYmFjaykgPT09ICdmdW5jdGlvbicpID8gY2FsbGJhY2sgOiBmYWxzZSk7XG4gICAgICBjb25maWcuc2VwYXJhdG9yID0gJ3NlcGFyYXRvcicgaW4gb3B0aW9ucyA/IG9wdGlvbnMuc2VwYXJhdG9yIDogJC5jc3YuZGVmYXVsdHMuc2VwYXJhdG9yO1xuICAgICAgY29uZmlnLmRlbGltaXRlciA9ICdkZWxpbWl0ZXInIGluIG9wdGlvbnMgPyBvcHRpb25zLmRlbGltaXRlciA6ICQuY3N2LmRlZmF1bHRzLmRlbGltaXRlcjtcbiAgICAgIHZhciBzdGF0ZSA9IChvcHRpb25zLnN0YXRlICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLnN0YXRlIDoge30pO1xuXG4gICAgICAvLyBzZXR1cFxuICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgIGRlbGltaXRlcjogY29uZmlnLmRlbGltaXRlcixcbiAgICAgICAgc2VwYXJhdG9yOiBjb25maWcuc2VwYXJhdG9yLFxuICAgICAgICBvblBhcnNlRW50cnk6IG9wdGlvbnMub25QYXJzZUVudHJ5LFxuICAgICAgICBvblBhcnNlVmFsdWU6IG9wdGlvbnMub25QYXJzZVZhbHVlLFxuICAgICAgICBzdGF0ZTogc3RhdGVcbiAgICAgIH1cblxuICAgICAgdmFyIGVudHJ5ID0gJC5jc3YucGFyc2Vycy5wYXJzZUVudHJ5KGNzdiwgb3B0aW9ucyk7XG5cbiAgICAgIC8vIHB1c2ggdGhlIHZhbHVlIHRvIGEgY2FsbGJhY2sgaWYgb25lIGlzIGRlZmluZWRcbiAgICAgIGlmKCFjb25maWcuY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIGVudHJ5O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uZmlnLmNhbGxiYWNrKCcnLCBlbnRyeSk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqICQuY3N2LnRvQXJyYXlzKGNzdilcbiAgICAgKiBDb252ZXJ0cyBhIENTViBzdHJpbmcgdG8gYSBqYXZhc2NyaXB0IGFycmF5LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IGNzdiBUaGUgc3RyaW5nIGNvbnRhaW5pbmcgdGhlIHJhdyBDU1YgZGF0YS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIEFuIG9iamVjdCBjb250YWluaW5nIHVzZXItZGVmaW5lZCBvcHRpb25zLlxuICAgICAqIEBwYXJhbSB7Q2hhcmFjdGVyfSBbc2VwYXJhdG9yXSBBbiBvdmVycmlkZSBmb3IgdGhlIHNlcGFyYXRvciBjaGFyYWN0ZXIuIERlZmF1bHRzIHRvIGEgY29tbWEoLCkuXG4gICAgICogQHBhcmFtIHtDaGFyYWN0ZXJ9IFtkZWxpbWl0ZXJdIEFuIG92ZXJyaWRlIGZvciB0aGUgZGVsaW1pdGVyIGNoYXJhY3Rlci4gRGVmYXVsdHMgdG8gYSBkb3VibGUtcXVvdGUoXCIpLlxuICAgICAqXG4gICAgICogVGhpcyBtZXRob2QgZGVhbHMgd2l0aCBtdWx0aS1saW5lIENTVi4gVGhlIGJyZWFrZG93biBpcyBzaW1wbGUuIFRoZSBmaXJzdFxuICAgICAqIGRpbWVuc2lvbiBvZiB0aGUgYXJyYXkgcmVwcmVzZW50cyB0aGUgbGluZSAob3IgZW50cnkvcm93KSB3aGlsZSB0aGUgc2Vjb25kXG4gICAgICogZGltZW5zaW9uIGNvbnRhaW5zIHRoZSB2YWx1ZXMgKG9yIHZhbHVlcy9jb2x1bW5zKS5cbiAgICAgKi9cbiAgICB0b0FycmF5czogZnVuY3Rpb24oY3N2LCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgICAgdmFyIG9wdGlvbnMgPSAob3B0aW9ucyAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucyA6IHt9KTtcbiAgICAgIHZhciBjb25maWcgPSB7fTtcbiAgICAgIGNvbmZpZy5jYWxsYmFjayA9ICgoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YoY2FsbGJhY2spID09PSAnZnVuY3Rpb24nKSA/IGNhbGxiYWNrIDogZmFsc2UpO1xuICAgICAgY29uZmlnLnNlcGFyYXRvciA9ICdzZXBhcmF0b3InIGluIG9wdGlvbnMgPyBvcHRpb25zLnNlcGFyYXRvciA6ICQuY3N2LmRlZmF1bHRzLnNlcGFyYXRvcjtcbiAgICAgIGNvbmZpZy5kZWxpbWl0ZXIgPSAnZGVsaW1pdGVyJyBpbiBvcHRpb25zID8gb3B0aW9ucy5kZWxpbWl0ZXIgOiAkLmNzdi5kZWZhdWx0cy5kZWxpbWl0ZXI7XG4gICAgICBcbiAgICAgIC8vIHNldHVwXG4gICAgICB2YXIgZGF0YSA9IFtdO1xuICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgIGRlbGltaXRlcjogY29uZmlnLmRlbGltaXRlcixcbiAgICAgICAgc2VwYXJhdG9yOiBjb25maWcuc2VwYXJhdG9yLFxuICAgICAgICBvblBhcnNlRW50cnk6IG9wdGlvbnMub25QYXJzZUVudHJ5LFxuICAgICAgICBvblBhcnNlVmFsdWU6IG9wdGlvbnMub25QYXJzZVZhbHVlLFxuICAgICAgICBzdGFydDogb3B0aW9ucy5zdGFydCxcbiAgICAgICAgZW5kOiBvcHRpb25zLmVuZCxcbiAgICAgICAgc3RhdGU6IHtcbiAgICAgICAgICByb3dOdW06IDEsXG4gICAgICAgICAgY29sTnVtOiAxXG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIC8vIGJyZWFrIHRoZSBkYXRhIGRvd24gdG8gbGluZXNcbiAgICAgIGRhdGEgPSAkLmNzdi5wYXJzZXJzLnBhcnNlKGNzdiwgb3B0aW9ucyk7XG5cbiAgICAgIC8vIHB1c2ggdGhlIHZhbHVlIHRvIGEgY2FsbGJhY2sgaWYgb25lIGlzIGRlZmluZWRcbiAgICAgIGlmKCFjb25maWcuY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25maWcuY2FsbGJhY2soJycsIGRhdGEpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiAkLmNzdi50b09iamVjdHMoY3N2KVxuICAgICAqIENvbnZlcnRzIGEgQ1NWIHN0cmluZyB0byBhIGphdmFzY3JpcHQgb2JqZWN0LlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBjc3YgVGhlIHN0cmluZyBjb250YWluaW5nIHRoZSByYXcgQ1NWIGRhdGEuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBBbiBvYmplY3QgY29udGFpbmluZyB1c2VyLWRlZmluZWQgb3B0aW9ucy5cbiAgICAgKiBAcGFyYW0ge0NoYXJhY3Rlcn0gW3NlcGFyYXRvcl0gQW4gb3ZlcnJpZGUgZm9yIHRoZSBzZXBhcmF0b3IgY2hhcmFjdGVyLiBEZWZhdWx0cyB0byBhIGNvbW1hKCwpLlxuICAgICAqIEBwYXJhbSB7Q2hhcmFjdGVyfSBbZGVsaW1pdGVyXSBBbiBvdmVycmlkZSBmb3IgdGhlIGRlbGltaXRlciBjaGFyYWN0ZXIuIERlZmF1bHRzIHRvIGEgZG91YmxlLXF1b3RlKFwiKS5cbiAgICAgKiBAcGFyYW0ge0Jvb2xlYW59IFtoZWFkZXJzXSBJbmRpY2F0ZXMgd2hldGhlciB0aGUgZGF0YSBjb250YWlucyBhIGhlYWRlciBsaW5lLiBEZWZhdWx0cyB0byB0cnVlLlxuICAgICAqXG4gICAgICogVGhpcyBtZXRob2QgZGVhbHMgd2l0aCBtdWx0aS1saW5lIENTViBzdHJpbmdzLiBXaGVyZSB0aGUgaGVhZGVycyBsaW5lIGlzXG4gICAgICogdXNlZCBhcyB0aGUga2V5IGZvciBlYWNoIHZhbHVlIHBlciBlbnRyeS5cbiAgICAgKi9cbiAgICB0b09iamVjdHM6IGZ1bmN0aW9uKGNzdiwgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgICAgIHZhciBvcHRpb25zID0gKG9wdGlvbnMgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMgOiB7fSk7XG4gICAgICB2YXIgY29uZmlnID0ge307XG4gICAgICBjb25maWcuY2FsbGJhY2sgPSAoKGNhbGxiYWNrICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mKGNhbGxiYWNrKSA9PT0gJ2Z1bmN0aW9uJykgPyBjYWxsYmFjayA6IGZhbHNlKTtcbiAgICAgIGNvbmZpZy5zZXBhcmF0b3IgPSAnc2VwYXJhdG9yJyBpbiBvcHRpb25zID8gb3B0aW9ucy5zZXBhcmF0b3IgOiAkLmNzdi5kZWZhdWx0cy5zZXBhcmF0b3I7XG4gICAgICBjb25maWcuZGVsaW1pdGVyID0gJ2RlbGltaXRlcicgaW4gb3B0aW9ucyA/IG9wdGlvbnMuZGVsaW1pdGVyIDogJC5jc3YuZGVmYXVsdHMuZGVsaW1pdGVyO1xuICAgICAgY29uZmlnLmhlYWRlcnMgPSAnaGVhZGVycycgaW4gb3B0aW9ucyA/IG9wdGlvbnMuaGVhZGVycyA6ICQuY3N2LmRlZmF1bHRzLmhlYWRlcnM7XG4gICAgICBvcHRpb25zLnN0YXJ0ID0gJ3N0YXJ0JyBpbiBvcHRpb25zID8gb3B0aW9ucy5zdGFydCA6IDE7XG4gICAgICBcbiAgICAgIC8vIGFjY291bnQgZm9yIGhlYWRlcnNcbiAgICAgIGlmKGNvbmZpZy5oZWFkZXJzKSB7XG4gICAgICAgIG9wdGlvbnMuc3RhcnQrKztcbiAgICAgIH1cbiAgICAgIGlmKG9wdGlvbnMuZW5kICYmIGNvbmZpZy5oZWFkZXJzKSB7XG4gICAgICAgIG9wdGlvbnMuZW5kKys7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIHNldHVwXG4gICAgICB2YXIgbGluZXMgPSBbXTtcbiAgICAgIHZhciBkYXRhID0gW107XG4gICAgICBcbiAgICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgICBkZWxpbWl0ZXI6IGNvbmZpZy5kZWxpbWl0ZXIsXG4gICAgICAgIHNlcGFyYXRvcjogY29uZmlnLnNlcGFyYXRvcixcbiAgICAgICAgb25QYXJzZUVudHJ5OiBvcHRpb25zLm9uUGFyc2VFbnRyeSxcbiAgICAgICAgb25QYXJzZVZhbHVlOiBvcHRpb25zLm9uUGFyc2VWYWx1ZSxcbiAgICAgICAgc3RhcnQ6IG9wdGlvbnMuc3RhcnQsXG4gICAgICAgIGVuZDogb3B0aW9ucy5lbmQsXG4gICAgICAgIHN0YXRlOiB7XG4gICAgICAgICAgcm93TnVtOiAxLFxuICAgICAgICAgIGNvbE51bTogMVxuICAgICAgICB9LFxuICAgICAgICBtYXRjaDogZmFsc2VcbiAgICAgIH07XG5cbiAgICAgIC8vIGZldGNoIHRoZSBoZWFkZXJzXG4gICAgICB2YXIgaGVhZGVyT3B0aW9ucyA9IHtcbiAgICAgICAgZGVsaW1pdGVyOiBjb25maWcuZGVsaW1pdGVyLFxuICAgICAgICBzZXBhcmF0b3I6IGNvbmZpZy5zZXBhcmF0b3IsXG4gICAgICAgIHN0YXJ0OiAxLFxuICAgICAgICBlbmQ6IDEsXG4gICAgICAgIHN0YXRlOiB7XG4gICAgICAgICAgcm93TnVtOjEsXG4gICAgICAgICAgY29sTnVtOjFcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdmFyIGhlYWRlckxpbmUgPSAkLmNzdi5wYXJzZXJzLnNwbGl0TGluZXMoY3N2LCBoZWFkZXJPcHRpb25zKTtcbiAgICAgIHZhciBoZWFkZXJzID0gJC5jc3YudG9BcnJheShoZWFkZXJMaW5lWzBdLCBvcHRpb25zKTtcblxuICAgICAgLy8gZmV0Y2ggdGhlIGRhdGFcbiAgICAgIHZhciBsaW5lcyA9ICQuY3N2LnBhcnNlcnMuc3BsaXRMaW5lcyhjc3YsIG9wdGlvbnMpO1xuICAgICAgXG4gICAgICAvLyByZXNldCB0aGUgc3RhdGUgZm9yIHJlLXVzZVxuICAgICAgb3B0aW9ucy5zdGF0ZS5jb2xOdW0gPSAxO1xuICAgICAgaWYoaGVhZGVycyl7XG4gICAgICAgIG9wdGlvbnMuc3RhdGUucm93TnVtID0gMjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9wdGlvbnMuc3RhdGUucm93TnVtID0gMTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gY29udmVydCBkYXRhIHRvIG9iamVjdHNcbiAgICAgIGZvcih2YXIgaT0wLCBsZW49bGluZXMubGVuZ3RoOyBpPGxlbjsgaSsrKSB7XG4gICAgICAgIHZhciBlbnRyeSA9ICQuY3N2LnRvQXJyYXkobGluZXNbaV0sIG9wdGlvbnMpO1xuICAgICAgICB2YXIgb2JqZWN0ID0ge307XG4gICAgICAgIGZvcih2YXIgaiBpbiBoZWFkZXJzKSB7XG4gICAgICAgICAgb2JqZWN0W2hlYWRlcnNbal1dID0gZW50cnlbal07XG4gICAgICAgIH1cbiAgICAgICAgZGF0YS5wdXNoKG9iamVjdCk7XG4gICAgICAgIFxuICAgICAgICAvLyB1cGRhdGUgcm93IHN0YXRlXG4gICAgICAgIG9wdGlvbnMuc3RhdGUucm93TnVtKys7XG4gICAgICB9XG5cbiAgICAgIC8vIHB1c2ggdGhlIHZhbHVlIHRvIGEgY2FsbGJhY2sgaWYgb25lIGlzIGRlZmluZWRcbiAgICAgIGlmKCFjb25maWcuY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25maWcuY2FsbGJhY2soJycsIGRhdGEpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAgLyoqXG4gICAgICogJC5jc3YuZnJvbUFycmF5cyhhcnJheXMpXG4gICAgICogQ29udmVydHMgYSBqYXZhc2NyaXB0IGFycmF5IHRvIGEgQ1NWIFN0cmluZy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IEFuIGFycmF5IGNvbnRhaW5pbmcgYW4gYXJyYXkgb2YgQ1NWIGVudHJpZXMuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBBbiBvYmplY3QgY29udGFpbmluZyB1c2VyLWRlZmluZWQgb3B0aW9ucy5cbiAgICAgKiBAcGFyYW0ge0NoYXJhY3Rlcn0gW3NlcGFyYXRvcl0gQW4gb3ZlcnJpZGUgZm9yIHRoZSBzZXBhcmF0b3IgY2hhcmFjdGVyLiBEZWZhdWx0cyB0byBhIGNvbW1hKCwpLlxuICAgICAqIEBwYXJhbSB7Q2hhcmFjdGVyfSBbZGVsaW1pdGVyXSBBbiBvdmVycmlkZSBmb3IgdGhlIGRlbGltaXRlciBjaGFyYWN0ZXIuIERlZmF1bHRzIHRvIGEgZG91YmxlLXF1b3RlKFwiKS5cbiAgICAgKlxuICAgICAqIFRoaXMgbWV0aG9kIGdlbmVyYXRlcyBhIENTViBmaWxlIGZyb20gYW4gYXJyYXkgb2YgYXJyYXlzIChyZXByZXNlbnRpbmcgZW50cmllcykuXG4gICAgICovXG4gICAgZnJvbUFycmF5czogZnVuY3Rpb24oYXJyYXlzLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgICAgdmFyIG9wdGlvbnMgPSAob3B0aW9ucyAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucyA6IHt9KTtcbiAgICAgIHZhciBjb25maWcgPSB7fTtcbiAgICAgIGNvbmZpZy5jYWxsYmFjayA9ICgoY2FsbGJhY2sgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YoY2FsbGJhY2spID09PSAnZnVuY3Rpb24nKSA/IGNhbGxiYWNrIDogZmFsc2UpO1xuICAgICAgY29uZmlnLnNlcGFyYXRvciA9ICdzZXBhcmF0b3InIGluIG9wdGlvbnMgPyBvcHRpb25zLnNlcGFyYXRvciA6ICQuY3N2LmRlZmF1bHRzLnNlcGFyYXRvcjtcbiAgICAgIGNvbmZpZy5kZWxpbWl0ZXIgPSAnZGVsaW1pdGVyJyBpbiBvcHRpb25zID8gb3B0aW9ucy5kZWxpbWl0ZXIgOiAkLmNzdi5kZWZhdWx0cy5kZWxpbWl0ZXI7XG4gICAgICBjb25maWcuZXNjYXBlciA9ICdlc2NhcGVyJyBpbiBvcHRpb25zID8gb3B0aW9ucy5lc2NhcGVyIDogJC5jc3YuZGVmYXVsdHMuZXNjYXBlcjtcbiAgICAgIGNvbmZpZy5leHBlcmltZW50YWwgPSAnZXhwZXJpbWVudGFsJyBpbiBvcHRpb25zID8gb3B0aW9ucy5leHBlcmltZW50YWwgOiBmYWxzZTtcblxuICAgICAgaWYoIWNvbmZpZy5leHBlcmltZW50YWwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKTtcbiAgICAgIH1cblxuICAgICAgdmFyIG91dHB1dCA9IFtdO1xuICAgICAgZm9yKGkgaW4gYXJyYXlzKSB7XG4gICAgICAgIG91dHB1dC5wdXNoKGFycmF5c1tpXSk7XG4gICAgICB9XG5cbiAgICAgIC8vIHB1c2ggdGhlIHZhbHVlIHRvIGEgY2FsbGJhY2sgaWYgb25lIGlzIGRlZmluZWRcbiAgICAgIGlmKCFjb25maWcuY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIG91dHB1dDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbmZpZy5jYWxsYmFjaygnJywgb3V0cHV0KTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogJC5jc3YuZnJvbU9iamVjdHMob2JqZWN0cylcbiAgICAgKiBDb252ZXJ0cyBhIGphdmFzY3JpcHQgZGljdGlvbmFyeSB0byBhIENTViBzdHJpbmcuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdHMgQW4gYXJyYXkgb2Ygb2JqZWN0cyBjb250YWluaW5nIHRoZSBkYXRhLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gQW4gb2JqZWN0IGNvbnRhaW5pbmcgdXNlci1kZWZpbmVkIG9wdGlvbnMuXG4gICAgICogQHBhcmFtIHtDaGFyYWN0ZXJ9IFtzZXBhcmF0b3JdIEFuIG92ZXJyaWRlIGZvciB0aGUgc2VwYXJhdG9yIGNoYXJhY3Rlci4gRGVmYXVsdHMgdG8gYSBjb21tYSgsKS5cbiAgICAgKiBAcGFyYW0ge0NoYXJhY3Rlcn0gW2RlbGltaXRlcl0gQW4gb3ZlcnJpZGUgZm9yIHRoZSBkZWxpbWl0ZXIgY2hhcmFjdGVyLiBEZWZhdWx0cyB0byBhIGRvdWJsZS1xdW90ZShcIikuXG4gICAgICpcbiAgICAgKiBUaGlzIG1ldGhvZCBnZW5lcmF0ZXMgYSBDU1YgZmlsZSBmcm9tIGFuIGFycmF5IG9mIG9iamVjdHMgKG5hbWU6dmFsdWUgcGFpcnMpLlxuICAgICAqIEl0IHN0YXJ0cyBieSBkZXRlY3RpbmcgdGhlIGhlYWRlcnMgYW5kIGFkZGluZyB0aGVtIGFzIHRoZSBmaXJzdCBsaW5lIG9mXG4gICAgICogdGhlIENTViBmaWxlLCBmb2xsb3dlZCBieSBhIHN0cnVjdHVyZWQgZHVtcCBvZiB0aGUgZGF0YS5cbiAgICAgKi9cbiAgICBmcm9tT2JqZWN0czJDU1Y6IGZ1bmN0aW9uKG9iamVjdHMsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgb3B0aW9ucyA9IChvcHRpb25zICE9PSB1bmRlZmluZWQgPyBvcHRpb25zIDoge30pO1xuICAgICAgdmFyIGNvbmZpZyA9IHt9O1xuICAgICAgY29uZmlnLmNhbGxiYWNrID0gKChjYWxsYmFjayAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZihjYWxsYmFjaykgPT09ICdmdW5jdGlvbicpID8gY2FsbGJhY2sgOiBmYWxzZSk7XG4gICAgICBjb25maWcuc2VwYXJhdG9yID0gJ3NlcGFyYXRvcicgaW4gb3B0aW9ucyA/IG9wdGlvbnMuc2VwYXJhdG9yIDogJC5jc3YuZGVmYXVsdHMuc2VwYXJhdG9yO1xuICAgICAgY29uZmlnLmRlbGltaXRlciA9ICdkZWxpbWl0ZXInIGluIG9wdGlvbnMgPyBvcHRpb25zLmRlbGltaXRlciA6ICQuY3N2LmRlZmF1bHRzLmRlbGltaXRlcjtcbiAgICAgIGNvbmZpZy5leHBlcmltZW50YWwgPSAnZXhwZXJpbWVudGFsJyBpbiBvcHRpb25zID8gb3B0aW9ucy5leHBlcmltZW50YWwgOiBmYWxzZTtcblxuICAgICAgaWYoIWNvbmZpZy5leHBlcmltZW50YWwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKTtcbiAgICAgIH1cblxuICAgICAgdmFyIG91dHB1dCA9IFtdO1xuICAgICAgZm9yKGkgaW4gb2JqZWN0cykge1xuICAgICAgICBvdXRwdXQucHVzaChhcnJheXNbaV0pO1xuICAgICAgfVxuXG4gICAgICAvLyBwdXNoIHRoZSB2YWx1ZSB0byBhIGNhbGxiYWNrIGlmIG9uZSBpcyBkZWZpbmVkXG4gICAgICBpZighY29uZmlnLmNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiBvdXRwdXQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25maWcuY2FsbGJhY2soJycsIG91dHB1dCk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIC8vIE1haW50ZW5hbmNlIGNvZGUgdG8gbWFpbnRhaW4gYmFja3dhcmQtY29tcGF0aWJpbGl0eVxuICAvLyBXaWxsIGJlIHJlbW92ZWQgaW4gcmVsZWFzZSAxLjBcbiAgJC5jc3ZFbnRyeTJBcnJheSA9ICQuY3N2LnRvQXJyYXk7XG4gICQuY3N2MkFycmF5ID0gJC5jc3YudG9BcnJheXM7XG4gICQuY3N2MkRpY3Rpb25hcnkgPSAkLmNzdi50b09iamVjdHM7XG5cbn0pKCBqUXVlcnkgKTtcbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8vIENvZGVNaXJyb3IsIGNvcHlyaWdodCAoYykgYnkgTWFyaWpuIEhhdmVyYmVrZSBhbmQgb3RoZXJzXG4vLyBEaXN0cmlidXRlZCB1bmRlciBhbiBNSVQgbGljZW5zZTogaHR0cDovL2NvZGVtaXJyb3IubmV0L0xJQ0VOU0VcblxuKGZ1bmN0aW9uKG1vZCkge1xuICBpZiAodHlwZW9mIGV4cG9ydHMgPT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgbW9kdWxlID09IFwib2JqZWN0XCIpIC8vIENvbW1vbkpTXG4gICAgbW9kKCh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LkNvZGVNaXJyb3IgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLkNvZGVNaXJyb3IgOiBudWxsKSk7XG4gIGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIC8vIEFNRFxuICAgIGRlZmluZShbXCIuLi8uLi9saWIvY29kZW1pcnJvclwiXSwgbW9kKTtcbiAgZWxzZSAvLyBQbGFpbiBicm93c2VyIGVudlxuICAgIG1vZChDb2RlTWlycm9yKTtcbn0pKGZ1bmN0aW9uKENvZGVNaXJyb3IpIHtcbiAgdmFyIGllX2x0OCA9IC9NU0lFIFxcZC8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSAmJlxuICAgIChkb2N1bWVudC5kb2N1bWVudE1vZGUgPT0gbnVsbCB8fCBkb2N1bWVudC5kb2N1bWVudE1vZGUgPCA4KTtcblxuICB2YXIgUG9zID0gQ29kZU1pcnJvci5Qb3M7XG5cbiAgdmFyIG1hdGNoaW5nID0ge1wiKFwiOiBcIik+XCIsIFwiKVwiOiBcIig8XCIsIFwiW1wiOiBcIl0+XCIsIFwiXVwiOiBcIls8XCIsIFwie1wiOiBcIn0+XCIsIFwifVwiOiBcIns8XCJ9O1xuXG4gIGZ1bmN0aW9uIGZpbmRNYXRjaGluZ0JyYWNrZXQoY20sIHdoZXJlLCBzdHJpY3QsIGNvbmZpZykge1xuICAgIHZhciBsaW5lID0gY20uZ2V0TGluZUhhbmRsZSh3aGVyZS5saW5lKSwgcG9zID0gd2hlcmUuY2ggLSAxO1xuICAgIHZhciBtYXRjaCA9IChwb3MgPj0gMCAmJiBtYXRjaGluZ1tsaW5lLnRleHQuY2hhckF0KHBvcyldKSB8fCBtYXRjaGluZ1tsaW5lLnRleHQuY2hhckF0KCsrcG9zKV07XG4gICAgaWYgKCFtYXRjaCkgcmV0dXJuIG51bGw7XG4gICAgdmFyIGRpciA9IG1hdGNoLmNoYXJBdCgxKSA9PSBcIj5cIiA/IDEgOiAtMTtcbiAgICBpZiAoc3RyaWN0ICYmIChkaXIgPiAwKSAhPSAocG9zID09IHdoZXJlLmNoKSkgcmV0dXJuIG51bGw7XG4gICAgdmFyIHN0eWxlID0gY20uZ2V0VG9rZW5UeXBlQXQoUG9zKHdoZXJlLmxpbmUsIHBvcyArIDEpKTtcblxuICAgIHZhciBmb3VuZCA9IHNjYW5Gb3JCcmFja2V0KGNtLCBQb3Mod2hlcmUubGluZSwgcG9zICsgKGRpciA+IDAgPyAxIDogMCkpLCBkaXIsIHN0eWxlIHx8IG51bGwsIGNvbmZpZyk7XG4gICAgaWYgKGZvdW5kID09IG51bGwpIHJldHVybiBudWxsO1xuICAgIHJldHVybiB7ZnJvbTogUG9zKHdoZXJlLmxpbmUsIHBvcyksIHRvOiBmb3VuZCAmJiBmb3VuZC5wb3MsXG4gICAgICAgICAgICBtYXRjaDogZm91bmQgJiYgZm91bmQuY2ggPT0gbWF0Y2guY2hhckF0KDApLCBmb3J3YXJkOiBkaXIgPiAwfTtcbiAgfVxuXG4gIC8vIGJyYWNrZXRSZWdleCBpcyB1c2VkIHRvIHNwZWNpZnkgd2hpY2ggdHlwZSBvZiBicmFja2V0IHRvIHNjYW5cbiAgLy8gc2hvdWxkIGJlIGEgcmVnZXhwLCBlLmcuIC9bW1xcXV0vXG4gIC8vXG4gIC8vIE5vdGU6IElmIFwid2hlcmVcIiBpcyBvbiBhbiBvcGVuIGJyYWNrZXQsIHRoZW4gdGhpcyBicmFja2V0IGlzIGlnbm9yZWQuXG4gIC8vXG4gIC8vIFJldHVybnMgZmFsc2Ugd2hlbiBubyBicmFja2V0IHdhcyBmb3VuZCwgbnVsbCB3aGVuIGl0IHJlYWNoZWRcbiAgLy8gbWF4U2NhbkxpbmVzIGFuZCBnYXZlIHVwXG4gIGZ1bmN0aW9uIHNjYW5Gb3JCcmFja2V0KGNtLCB3aGVyZSwgZGlyLCBzdHlsZSwgY29uZmlnKSB7XG4gICAgdmFyIG1heFNjYW5MZW4gPSAoY29uZmlnICYmIGNvbmZpZy5tYXhTY2FuTGluZUxlbmd0aCkgfHwgMTAwMDA7XG4gICAgdmFyIG1heFNjYW5MaW5lcyA9IChjb25maWcgJiYgY29uZmlnLm1heFNjYW5MaW5lcykgfHwgMTAwMDtcblxuICAgIHZhciBzdGFjayA9IFtdO1xuICAgIHZhciByZSA9IGNvbmZpZyAmJiBjb25maWcuYnJhY2tldFJlZ2V4ID8gY29uZmlnLmJyYWNrZXRSZWdleCA6IC9bKCl7fVtcXF1dLztcbiAgICB2YXIgbGluZUVuZCA9IGRpciA+IDAgPyBNYXRoLm1pbih3aGVyZS5saW5lICsgbWF4U2NhbkxpbmVzLCBjbS5sYXN0TGluZSgpICsgMSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgOiBNYXRoLm1heChjbS5maXJzdExpbmUoKSAtIDEsIHdoZXJlLmxpbmUgLSBtYXhTY2FuTGluZXMpO1xuICAgIGZvciAodmFyIGxpbmVObyA9IHdoZXJlLmxpbmU7IGxpbmVObyAhPSBsaW5lRW5kOyBsaW5lTm8gKz0gZGlyKSB7XG4gICAgICB2YXIgbGluZSA9IGNtLmdldExpbmUobGluZU5vKTtcbiAgICAgIGlmICghbGluZSkgY29udGludWU7XG4gICAgICB2YXIgcG9zID0gZGlyID4gMCA/IDAgOiBsaW5lLmxlbmd0aCAtIDEsIGVuZCA9IGRpciA+IDAgPyBsaW5lLmxlbmd0aCA6IC0xO1xuICAgICAgaWYgKGxpbmUubGVuZ3RoID4gbWF4U2NhbkxlbikgY29udGludWU7XG4gICAgICBpZiAobGluZU5vID09IHdoZXJlLmxpbmUpIHBvcyA9IHdoZXJlLmNoIC0gKGRpciA8IDAgPyAxIDogMCk7XG4gICAgICBmb3IgKDsgcG9zICE9IGVuZDsgcG9zICs9IGRpcikge1xuICAgICAgICB2YXIgY2ggPSBsaW5lLmNoYXJBdChwb3MpO1xuICAgICAgICBpZiAocmUudGVzdChjaCkgJiYgKHN0eWxlID09PSB1bmRlZmluZWQgfHwgY20uZ2V0VG9rZW5UeXBlQXQoUG9zKGxpbmVObywgcG9zICsgMSkpID09IHN0eWxlKSkge1xuICAgICAgICAgIHZhciBtYXRjaCA9IG1hdGNoaW5nW2NoXTtcbiAgICAgICAgICBpZiAoKG1hdGNoLmNoYXJBdCgxKSA9PSBcIj5cIikgPT0gKGRpciA+IDApKSBzdGFjay5wdXNoKGNoKTtcbiAgICAgICAgICBlbHNlIGlmICghc3RhY2subGVuZ3RoKSByZXR1cm4ge3BvczogUG9zKGxpbmVObywgcG9zKSwgY2g6IGNofTtcbiAgICAgICAgICBlbHNlIHN0YWNrLnBvcCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBsaW5lTm8gLSBkaXIgPT0gKGRpciA+IDAgPyBjbS5sYXN0TGluZSgpIDogY20uZmlyc3RMaW5lKCkpID8gZmFsc2UgOiBudWxsO1xuICB9XG5cbiAgZnVuY3Rpb24gbWF0Y2hCcmFja2V0cyhjbSwgYXV0b2NsZWFyLCBjb25maWcpIHtcbiAgICAvLyBEaXNhYmxlIGJyYWNlIG1hdGNoaW5nIGluIGxvbmcgbGluZXMsIHNpbmNlIGl0J2xsIGNhdXNlIGh1Z2VseSBzbG93IHVwZGF0ZXNcbiAgICB2YXIgbWF4SGlnaGxpZ2h0TGVuID0gY20uc3RhdGUubWF0Y2hCcmFja2V0cy5tYXhIaWdobGlnaHRMaW5lTGVuZ3RoIHx8IDEwMDA7XG4gICAgdmFyIG1hcmtzID0gW10sIHJhbmdlcyA9IGNtLmxpc3RTZWxlY3Rpb25zKCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCByYW5nZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBtYXRjaCA9IHJhbmdlc1tpXS5lbXB0eSgpICYmIGZpbmRNYXRjaGluZ0JyYWNrZXQoY20sIHJhbmdlc1tpXS5oZWFkLCBmYWxzZSwgY29uZmlnKTtcbiAgICAgIGlmIChtYXRjaCAmJiBjbS5nZXRMaW5lKG1hdGNoLmZyb20ubGluZSkubGVuZ3RoIDw9IG1heEhpZ2hsaWdodExlbikge1xuICAgICAgICB2YXIgc3R5bGUgPSBtYXRjaC5tYXRjaCA/IFwiQ29kZU1pcnJvci1tYXRjaGluZ2JyYWNrZXRcIiA6IFwiQ29kZU1pcnJvci1ub25tYXRjaGluZ2JyYWNrZXRcIjtcbiAgICAgICAgbWFya3MucHVzaChjbS5tYXJrVGV4dChtYXRjaC5mcm9tLCBQb3MobWF0Y2guZnJvbS5saW5lLCBtYXRjaC5mcm9tLmNoICsgMSksIHtjbGFzc05hbWU6IHN0eWxlfSkpO1xuICAgICAgICBpZiAobWF0Y2gudG8gJiYgY20uZ2V0TGluZShtYXRjaC50by5saW5lKS5sZW5ndGggPD0gbWF4SGlnaGxpZ2h0TGVuKVxuICAgICAgICAgIG1hcmtzLnB1c2goY20ubWFya1RleHQobWF0Y2gudG8sIFBvcyhtYXRjaC50by5saW5lLCBtYXRjaC50by5jaCArIDEpLCB7Y2xhc3NOYW1lOiBzdHlsZX0pKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobWFya3MubGVuZ3RoKSB7XG4gICAgICAvLyBLbHVkZ2UgdG8gd29yayBhcm91bmQgdGhlIElFIGJ1ZyBmcm9tIGlzc3VlICMxMTkzLCB3aGVyZSB0ZXh0XG4gICAgICAvLyBpbnB1dCBzdG9wcyBnb2luZyB0byB0aGUgdGV4dGFyZSB3aGV2ZXIgdGhpcyBmaXJlcy5cbiAgICAgIGlmIChpZV9sdDggJiYgY20uc3RhdGUuZm9jdXNlZCkgY20uZGlzcGxheS5pbnB1dC5mb2N1cygpO1xuXG4gICAgICB2YXIgY2xlYXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgY20ub3BlcmF0aW9uKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWFya3MubGVuZ3RoOyBpKyspIG1hcmtzW2ldLmNsZWFyKCk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICAgIGlmIChhdXRvY2xlYXIpIHNldFRpbWVvdXQoY2xlYXIsIDgwMCk7XG4gICAgICBlbHNlIHJldHVybiBjbGVhcjtcbiAgICB9XG4gIH1cblxuICB2YXIgY3VycmVudGx5SGlnaGxpZ2h0ZWQgPSBudWxsO1xuICBmdW5jdGlvbiBkb01hdGNoQnJhY2tldHMoY20pIHtcbiAgICBjbS5vcGVyYXRpb24oZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoY3VycmVudGx5SGlnaGxpZ2h0ZWQpIHtjdXJyZW50bHlIaWdobGlnaHRlZCgpOyBjdXJyZW50bHlIaWdobGlnaHRlZCA9IG51bGw7fVxuICAgICAgY3VycmVudGx5SGlnaGxpZ2h0ZWQgPSBtYXRjaEJyYWNrZXRzKGNtLCBmYWxzZSwgY20uc3RhdGUubWF0Y2hCcmFja2V0cyk7XG4gICAgfSk7XG4gIH1cblxuICBDb2RlTWlycm9yLmRlZmluZU9wdGlvbihcIm1hdGNoQnJhY2tldHNcIiwgZmFsc2UsIGZ1bmN0aW9uKGNtLCB2YWwsIG9sZCkge1xuICAgIGlmIChvbGQgJiYgb2xkICE9IENvZGVNaXJyb3IuSW5pdClcbiAgICAgIGNtLm9mZihcImN1cnNvckFjdGl2aXR5XCIsIGRvTWF0Y2hCcmFja2V0cyk7XG4gICAgaWYgKHZhbCkge1xuICAgICAgY20uc3RhdGUubWF0Y2hCcmFja2V0cyA9IHR5cGVvZiB2YWwgPT0gXCJvYmplY3RcIiA/IHZhbCA6IHt9O1xuICAgICAgY20ub24oXCJjdXJzb3JBY3Rpdml0eVwiLCBkb01hdGNoQnJhY2tldHMpO1xuICAgIH1cbiAgfSk7XG5cbiAgQ29kZU1pcnJvci5kZWZpbmVFeHRlbnNpb24oXCJtYXRjaEJyYWNrZXRzXCIsIGZ1bmN0aW9uKCkge21hdGNoQnJhY2tldHModGhpcywgdHJ1ZSk7fSk7XG4gIENvZGVNaXJyb3IuZGVmaW5lRXh0ZW5zaW9uKFwiZmluZE1hdGNoaW5nQnJhY2tldFwiLCBmdW5jdGlvbihwb3MsIHN0cmljdCwgY29uZmlnKXtcbiAgICByZXR1cm4gZmluZE1hdGNoaW5nQnJhY2tldCh0aGlzLCBwb3MsIHN0cmljdCwgY29uZmlnKTtcbiAgfSk7XG4gIENvZGVNaXJyb3IuZGVmaW5lRXh0ZW5zaW9uKFwic2NhbkZvckJyYWNrZXRcIiwgZnVuY3Rpb24ocG9zLCBkaXIsIHN0eWxlLCBjb25maWcpe1xuICAgIHJldHVybiBzY2FuRm9yQnJhY2tldCh0aGlzLCBwb3MsIGRpciwgc3R5bGUsIGNvbmZpZyk7XG4gIH0pO1xufSk7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8vIENvZGVNaXJyb3IsIGNvcHlyaWdodCAoYykgYnkgTWFyaWpuIEhhdmVyYmVrZSBhbmQgb3RoZXJzXG4vLyBEaXN0cmlidXRlZCB1bmRlciBhbiBNSVQgbGljZW5zZTogaHR0cDovL2NvZGVtaXJyb3IubmV0L0xJQ0VOU0VcblxuLy8gVE9ETyBhY3R1YWxseSByZWNvZ25pemUgc3ludGF4IG9mIFR5cGVTY3JpcHQgY29uc3RydWN0c1xuXG4oZnVuY3Rpb24obW9kKSB7XG4gIGlmICh0eXBlb2YgZXhwb3J0cyA9PSBcIm9iamVjdFwiICYmIHR5cGVvZiBtb2R1bGUgPT0gXCJvYmplY3RcIikgLy8gQ29tbW9uSlNcbiAgICBtb2QoKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuQ29kZU1pcnJvciA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuQ29kZU1pcnJvciA6IG51bGwpKTtcbiAgZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkgLy8gQU1EXG4gICAgZGVmaW5lKFtcIi4uLy4uL2xpYi9jb2RlbWlycm9yXCJdLCBtb2QpO1xuICBlbHNlIC8vIFBsYWluIGJyb3dzZXIgZW52XG4gICAgbW9kKENvZGVNaXJyb3IpO1xufSkoZnVuY3Rpb24oQ29kZU1pcnJvcikge1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbkNvZGVNaXJyb3IuZGVmaW5lTW9kZShcImphdmFzY3JpcHRcIiwgZnVuY3Rpb24oY29uZmlnLCBwYXJzZXJDb25maWcpIHtcbiAgdmFyIGluZGVudFVuaXQgPSBjb25maWcuaW5kZW50VW5pdDtcbiAgdmFyIHN0YXRlbWVudEluZGVudCA9IHBhcnNlckNvbmZpZy5zdGF0ZW1lbnRJbmRlbnQ7XG4gIHZhciBqc29ubGRNb2RlID0gcGFyc2VyQ29uZmlnLmpzb25sZDtcbiAgdmFyIGpzb25Nb2RlID0gcGFyc2VyQ29uZmlnLmpzb24gfHwganNvbmxkTW9kZTtcbiAgdmFyIGlzVFMgPSBwYXJzZXJDb25maWcudHlwZXNjcmlwdDtcbiAgdmFyIHdvcmRSRSA9IHBhcnNlckNvbmZpZy53b3JkQ2hhcmFjdGVycyB8fCAvW1xcdyRdLztcblxuICAvLyBUb2tlbml6ZXJcblxuICB2YXIga2V5d29yZHMgPSBmdW5jdGlvbigpe1xuICAgIGZ1bmN0aW9uIGt3KHR5cGUpIHtyZXR1cm4ge3R5cGU6IHR5cGUsIHN0eWxlOiBcImtleXdvcmRcIn07fVxuICAgIHZhciBBID0ga3coXCJrZXl3b3JkIGFcIiksIEIgPSBrdyhcImtleXdvcmQgYlwiKSwgQyA9IGt3KFwia2V5d29yZCBjXCIpO1xuICAgIHZhciBvcGVyYXRvciA9IGt3KFwib3BlcmF0b3JcIiksIGF0b20gPSB7dHlwZTogXCJhdG9tXCIsIHN0eWxlOiBcImF0b21cIn07XG5cbiAgICB2YXIganNLZXl3b3JkcyA9IHtcbiAgICAgIFwiaWZcIjoga3coXCJpZlwiKSwgXCJ3aGlsZVwiOiBBLCBcIndpdGhcIjogQSwgXCJlbHNlXCI6IEIsIFwiZG9cIjogQiwgXCJ0cnlcIjogQiwgXCJmaW5hbGx5XCI6IEIsXG4gICAgICBcInJldHVyblwiOiBDLCBcImJyZWFrXCI6IEMsIFwiY29udGludWVcIjogQywgXCJuZXdcIjogQywgXCJkZWxldGVcIjogQywgXCJ0aHJvd1wiOiBDLCBcImRlYnVnZ2VyXCI6IEMsXG4gICAgICBcInZhclwiOiBrdyhcInZhclwiKSwgXCJjb25zdFwiOiBrdyhcInZhclwiKSwgXCJsZXRcIjoga3coXCJ2YXJcIiksXG4gICAgICBcImZ1bmN0aW9uXCI6IGt3KFwiZnVuY3Rpb25cIiksIFwiY2F0Y2hcIjoga3coXCJjYXRjaFwiKSxcbiAgICAgIFwiZm9yXCI6IGt3KFwiZm9yXCIpLCBcInN3aXRjaFwiOiBrdyhcInN3aXRjaFwiKSwgXCJjYXNlXCI6IGt3KFwiY2FzZVwiKSwgXCJkZWZhdWx0XCI6IGt3KFwiZGVmYXVsdFwiKSxcbiAgICAgIFwiaW5cIjogb3BlcmF0b3IsIFwidHlwZW9mXCI6IG9wZXJhdG9yLCBcImluc3RhbmNlb2ZcIjogb3BlcmF0b3IsXG4gICAgICBcInRydWVcIjogYXRvbSwgXCJmYWxzZVwiOiBhdG9tLCBcIm51bGxcIjogYXRvbSwgXCJ1bmRlZmluZWRcIjogYXRvbSwgXCJOYU5cIjogYXRvbSwgXCJJbmZpbml0eVwiOiBhdG9tLFxuICAgICAgXCJ0aGlzXCI6IGt3KFwidGhpc1wiKSwgXCJtb2R1bGVcIjoga3coXCJtb2R1bGVcIiksIFwiY2xhc3NcIjoga3coXCJjbGFzc1wiKSwgXCJzdXBlclwiOiBrdyhcImF0b21cIiksXG4gICAgICBcInlpZWxkXCI6IEMsIFwiZXhwb3J0XCI6IGt3KFwiZXhwb3J0XCIpLCBcImltcG9ydFwiOiBrdyhcImltcG9ydFwiKSwgXCJleHRlbmRzXCI6IENcbiAgICB9O1xuXG4gICAgLy8gRXh0ZW5kIHRoZSAnbm9ybWFsJyBrZXl3b3JkcyB3aXRoIHRoZSBUeXBlU2NyaXB0IGxhbmd1YWdlIGV4dGVuc2lvbnNcbiAgICBpZiAoaXNUUykge1xuICAgICAgdmFyIHR5cGUgPSB7dHlwZTogXCJ2YXJpYWJsZVwiLCBzdHlsZTogXCJ2YXJpYWJsZS0zXCJ9O1xuICAgICAgdmFyIHRzS2V5d29yZHMgPSB7XG4gICAgICAgIC8vIG9iamVjdC1saWtlIHRoaW5nc1xuICAgICAgICBcImludGVyZmFjZVwiOiBrdyhcImludGVyZmFjZVwiKSxcbiAgICAgICAgXCJleHRlbmRzXCI6IGt3KFwiZXh0ZW5kc1wiKSxcbiAgICAgICAgXCJjb25zdHJ1Y3RvclwiOiBrdyhcImNvbnN0cnVjdG9yXCIpLFxuXG4gICAgICAgIC8vIHNjb3BlIG1vZGlmaWVyc1xuICAgICAgICBcInB1YmxpY1wiOiBrdyhcInB1YmxpY1wiKSxcbiAgICAgICAgXCJwcml2YXRlXCI6IGt3KFwicHJpdmF0ZVwiKSxcbiAgICAgICAgXCJwcm90ZWN0ZWRcIjoga3coXCJwcm90ZWN0ZWRcIiksXG4gICAgICAgIFwic3RhdGljXCI6IGt3KFwic3RhdGljXCIpLFxuXG4gICAgICAgIC8vIHR5cGVzXG4gICAgICAgIFwic3RyaW5nXCI6IHR5cGUsIFwibnVtYmVyXCI6IHR5cGUsIFwiYm9vbFwiOiB0eXBlLCBcImFueVwiOiB0eXBlXG4gICAgICB9O1xuXG4gICAgICBmb3IgKHZhciBhdHRyIGluIHRzS2V5d29yZHMpIHtcbiAgICAgICAganNLZXl3b3Jkc1thdHRyXSA9IHRzS2V5d29yZHNbYXR0cl07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGpzS2V5d29yZHM7XG4gIH0oKTtcblxuICB2YXIgaXNPcGVyYXRvckNoYXIgPSAvWytcXC0qJiU9PD4hP3x+Xl0vO1xuICB2YXIgaXNKc29ubGRLZXl3b3JkID0gL15AKGNvbnRleHR8aWR8dmFsdWV8bGFuZ3VhZ2V8dHlwZXxjb250YWluZXJ8bGlzdHxzZXR8cmV2ZXJzZXxpbmRleHxiYXNlfHZvY2FifGdyYXBoKVwiLztcblxuICBmdW5jdGlvbiByZWFkUmVnZXhwKHN0cmVhbSkge1xuICAgIHZhciBlc2NhcGVkID0gZmFsc2UsIG5leHQsIGluU2V0ID0gZmFsc2U7XG4gICAgd2hpbGUgKChuZXh0ID0gc3RyZWFtLm5leHQoKSkgIT0gbnVsbCkge1xuICAgICAgaWYgKCFlc2NhcGVkKSB7XG4gICAgICAgIGlmIChuZXh0ID09IFwiL1wiICYmICFpblNldCkgcmV0dXJuO1xuICAgICAgICBpZiAobmV4dCA9PSBcIltcIikgaW5TZXQgPSB0cnVlO1xuICAgICAgICBlbHNlIGlmIChpblNldCAmJiBuZXh0ID09IFwiXVwiKSBpblNldCA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgZXNjYXBlZCA9ICFlc2NhcGVkICYmIG5leHQgPT0gXCJcXFxcXCI7XG4gICAgfVxuICB9XG5cbiAgLy8gVXNlZCBhcyBzY3JhdGNoIHZhcmlhYmxlcyB0byBjb21tdW5pY2F0ZSBtdWx0aXBsZSB2YWx1ZXMgd2l0aG91dFxuICAvLyBjb25zaW5nIHVwIHRvbnMgb2Ygb2JqZWN0cy5cbiAgdmFyIHR5cGUsIGNvbnRlbnQ7XG4gIGZ1bmN0aW9uIHJldCh0cCwgc3R5bGUsIGNvbnQpIHtcbiAgICB0eXBlID0gdHA7IGNvbnRlbnQgPSBjb250O1xuICAgIHJldHVybiBzdHlsZTtcbiAgfVxuICBmdW5jdGlvbiB0b2tlbkJhc2Uoc3RyZWFtLCBzdGF0ZSkge1xuICAgIHZhciBjaCA9IHN0cmVhbS5uZXh0KCk7XG4gICAgaWYgKGNoID09ICdcIicgfHwgY2ggPT0gXCInXCIpIHtcbiAgICAgIHN0YXRlLnRva2VuaXplID0gdG9rZW5TdHJpbmcoY2gpO1xuICAgICAgcmV0dXJuIHN0YXRlLnRva2VuaXplKHN0cmVhbSwgc3RhdGUpO1xuICAgIH0gZWxzZSBpZiAoY2ggPT0gXCIuXCIgJiYgc3RyZWFtLm1hdGNoKC9eXFxkKyg/OltlRV1bK1xcLV0/XFxkKyk/LykpIHtcbiAgICAgIHJldHVybiByZXQoXCJudW1iZXJcIiwgXCJudW1iZXJcIik7XG4gICAgfSBlbHNlIGlmIChjaCA9PSBcIi5cIiAmJiBzdHJlYW0ubWF0Y2goXCIuLlwiKSkge1xuICAgICAgcmV0dXJuIHJldChcInNwcmVhZFwiLCBcIm1ldGFcIik7XG4gICAgfSBlbHNlIGlmICgvW1xcW1xcXXt9XFwoXFwpLDtcXDpcXC5dLy50ZXN0KGNoKSkge1xuICAgICAgcmV0dXJuIHJldChjaCk7XG4gICAgfSBlbHNlIGlmIChjaCA9PSBcIj1cIiAmJiBzdHJlYW0uZWF0KFwiPlwiKSkge1xuICAgICAgcmV0dXJuIHJldChcIj0+XCIsIFwib3BlcmF0b3JcIik7XG4gICAgfSBlbHNlIGlmIChjaCA9PSBcIjBcIiAmJiBzdHJlYW0uZWF0KC94L2kpKSB7XG4gICAgICBzdHJlYW0uZWF0V2hpbGUoL1tcXGRhLWZdL2kpO1xuICAgICAgcmV0dXJuIHJldChcIm51bWJlclwiLCBcIm51bWJlclwiKTtcbiAgICB9IGVsc2UgaWYgKC9cXGQvLnRlc3QoY2gpKSB7XG4gICAgICBzdHJlYW0ubWF0Y2goL15cXGQqKD86XFwuXFxkKik/KD86W2VFXVsrXFwtXT9cXGQrKT8vKTtcbiAgICAgIHJldHVybiByZXQoXCJudW1iZXJcIiwgXCJudW1iZXJcIik7XG4gICAgfSBlbHNlIGlmIChjaCA9PSBcIi9cIikge1xuICAgICAgaWYgKHN0cmVhbS5lYXQoXCIqXCIpKSB7XG4gICAgICAgIHN0YXRlLnRva2VuaXplID0gdG9rZW5Db21tZW50O1xuICAgICAgICByZXR1cm4gdG9rZW5Db21tZW50KHN0cmVhbSwgc3RhdGUpO1xuICAgICAgfSBlbHNlIGlmIChzdHJlYW0uZWF0KFwiL1wiKSkge1xuICAgICAgICBzdHJlYW0uc2tpcFRvRW5kKCk7XG4gICAgICAgIHJldHVybiByZXQoXCJjb21tZW50XCIsIFwiY29tbWVudFwiKTtcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGUubGFzdFR5cGUgPT0gXCJvcGVyYXRvclwiIHx8IHN0YXRlLmxhc3RUeXBlID09IFwia2V5d29yZCBjXCIgfHxcbiAgICAgICAgICAgICAgIHN0YXRlLmxhc3RUeXBlID09IFwic29mXCIgfHwgL15bXFxbe31cXCgsOzpdJC8udGVzdChzdGF0ZS5sYXN0VHlwZSkpIHtcbiAgICAgICAgcmVhZFJlZ2V4cChzdHJlYW0pO1xuICAgICAgICBzdHJlYW0uZWF0V2hpbGUoL1tnaW15XS8pOyAvLyAneScgaXMgXCJzdGlja3lcIiBvcHRpb24gaW4gTW96aWxsYVxuICAgICAgICByZXR1cm4gcmV0KFwicmVnZXhwXCIsIFwic3RyaW5nLTJcIik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHJlYW0uZWF0V2hpbGUoaXNPcGVyYXRvckNoYXIpO1xuICAgICAgICByZXR1cm4gcmV0KFwib3BlcmF0b3JcIiwgXCJvcGVyYXRvclwiLCBzdHJlYW0uY3VycmVudCgpKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGNoID09IFwiYFwiKSB7XG4gICAgICBzdGF0ZS50b2tlbml6ZSA9IHRva2VuUXVhc2k7XG4gICAgICByZXR1cm4gdG9rZW5RdWFzaShzdHJlYW0sIHN0YXRlKTtcbiAgICB9IGVsc2UgaWYgKGNoID09IFwiI1wiKSB7XG4gICAgICBzdHJlYW0uc2tpcFRvRW5kKCk7XG4gICAgICByZXR1cm4gcmV0KFwiZXJyb3JcIiwgXCJlcnJvclwiKTtcbiAgICB9IGVsc2UgaWYgKGlzT3BlcmF0b3JDaGFyLnRlc3QoY2gpKSB7XG4gICAgICBzdHJlYW0uZWF0V2hpbGUoaXNPcGVyYXRvckNoYXIpO1xuICAgICAgcmV0dXJuIHJldChcIm9wZXJhdG9yXCIsIFwib3BlcmF0b3JcIiwgc3RyZWFtLmN1cnJlbnQoKSk7XG4gICAgfSBlbHNlIGlmICh3b3JkUkUudGVzdChjaCkpIHtcbiAgICAgIHN0cmVhbS5lYXRXaGlsZSh3b3JkUkUpO1xuICAgICAgdmFyIHdvcmQgPSBzdHJlYW0uY3VycmVudCgpLCBrbm93biA9IGtleXdvcmRzLnByb3BlcnR5SXNFbnVtZXJhYmxlKHdvcmQpICYmIGtleXdvcmRzW3dvcmRdO1xuICAgICAgcmV0dXJuIChrbm93biAmJiBzdGF0ZS5sYXN0VHlwZSAhPSBcIi5cIikgPyByZXQoa25vd24udHlwZSwga25vd24uc3R5bGUsIHdvcmQpIDpcbiAgICAgICAgICAgICAgICAgICAgIHJldChcInZhcmlhYmxlXCIsIFwidmFyaWFibGVcIiwgd29yZCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gdG9rZW5TdHJpbmcocXVvdGUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oc3RyZWFtLCBzdGF0ZSkge1xuICAgICAgdmFyIGVzY2FwZWQgPSBmYWxzZSwgbmV4dDtcbiAgICAgIGlmIChqc29ubGRNb2RlICYmIHN0cmVhbS5wZWVrKCkgPT0gXCJAXCIgJiYgc3RyZWFtLm1hdGNoKGlzSnNvbmxkS2V5d29yZCkpe1xuICAgICAgICBzdGF0ZS50b2tlbml6ZSA9IHRva2VuQmFzZTtcbiAgICAgICAgcmV0dXJuIHJldChcImpzb25sZC1rZXl3b3JkXCIsIFwibWV0YVwiKTtcbiAgICAgIH1cbiAgICAgIHdoaWxlICgobmV4dCA9IHN0cmVhbS5uZXh0KCkpICE9IG51bGwpIHtcbiAgICAgICAgaWYgKG5leHQgPT0gcXVvdGUgJiYgIWVzY2FwZWQpIGJyZWFrO1xuICAgICAgICBlc2NhcGVkID0gIWVzY2FwZWQgJiYgbmV4dCA9PSBcIlxcXFxcIjtcbiAgICAgIH1cbiAgICAgIGlmICghZXNjYXBlZCkgc3RhdGUudG9rZW5pemUgPSB0b2tlbkJhc2U7XG4gICAgICByZXR1cm4gcmV0KFwic3RyaW5nXCIsIFwic3RyaW5nXCIpO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiB0b2tlbkNvbW1lbnQoc3RyZWFtLCBzdGF0ZSkge1xuICAgIHZhciBtYXliZUVuZCA9IGZhbHNlLCBjaDtcbiAgICB3aGlsZSAoY2ggPSBzdHJlYW0ubmV4dCgpKSB7XG4gICAgICBpZiAoY2ggPT0gXCIvXCIgJiYgbWF5YmVFbmQpIHtcbiAgICAgICAgc3RhdGUudG9rZW5pemUgPSB0b2tlbkJhc2U7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgbWF5YmVFbmQgPSAoY2ggPT0gXCIqXCIpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0KFwiY29tbWVudFwiLCBcImNvbW1lbnRcIik7XG4gIH1cblxuICBmdW5jdGlvbiB0b2tlblF1YXNpKHN0cmVhbSwgc3RhdGUpIHtcbiAgICB2YXIgZXNjYXBlZCA9IGZhbHNlLCBuZXh0O1xuICAgIHdoaWxlICgobmV4dCA9IHN0cmVhbS5uZXh0KCkpICE9IG51bGwpIHtcbiAgICAgIGlmICghZXNjYXBlZCAmJiAobmV4dCA9PSBcImBcIiB8fCBuZXh0ID09IFwiJFwiICYmIHN0cmVhbS5lYXQoXCJ7XCIpKSkge1xuICAgICAgICBzdGF0ZS50b2tlbml6ZSA9IHRva2VuQmFzZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBlc2NhcGVkID0gIWVzY2FwZWQgJiYgbmV4dCA9PSBcIlxcXFxcIjtcbiAgICB9XG4gICAgcmV0dXJuIHJldChcInF1YXNpXCIsIFwic3RyaW5nLTJcIiwgc3RyZWFtLmN1cnJlbnQoKSk7XG4gIH1cblxuICB2YXIgYnJhY2tldHMgPSBcIihbe31dKVwiO1xuICAvLyBUaGlzIGlzIGEgY3J1ZGUgbG9va2FoZWFkIHRyaWNrIHRvIHRyeSBhbmQgbm90aWNlIHRoYXQgd2UncmVcbiAgLy8gcGFyc2luZyB0aGUgYXJndW1lbnQgcGF0dGVybnMgZm9yIGEgZmF0LWFycm93IGZ1bmN0aW9uIGJlZm9yZSB3ZVxuICAvLyBhY3R1YWxseSBoaXQgdGhlIGFycm93IHRva2VuLiBJdCBvbmx5IHdvcmtzIGlmIHRoZSBhcnJvdyBpcyBvblxuICAvLyB0aGUgc2FtZSBsaW5lIGFzIHRoZSBhcmd1bWVudHMgYW5kIHRoZXJlJ3Mgbm8gc3RyYW5nZSBub2lzZVxuICAvLyAoY29tbWVudHMpIGluIGJldHdlZW4uIEZhbGxiYWNrIGlzIHRvIG9ubHkgbm90aWNlIHdoZW4gd2UgaGl0IHRoZVxuICAvLyBhcnJvdywgYW5kIG5vdCBkZWNsYXJlIHRoZSBhcmd1bWVudHMgYXMgbG9jYWxzIGZvciB0aGUgYXJyb3dcbiAgLy8gYm9keS5cbiAgZnVuY3Rpb24gZmluZEZhdEFycm93KHN0cmVhbSwgc3RhdGUpIHtcbiAgICBpZiAoc3RhdGUuZmF0QXJyb3dBdCkgc3RhdGUuZmF0QXJyb3dBdCA9IG51bGw7XG4gICAgdmFyIGFycm93ID0gc3RyZWFtLnN0cmluZy5pbmRleE9mKFwiPT5cIiwgc3RyZWFtLnN0YXJ0KTtcbiAgICBpZiAoYXJyb3cgPCAwKSByZXR1cm47XG5cbiAgICB2YXIgZGVwdGggPSAwLCBzYXdTb21ldGhpbmcgPSBmYWxzZTtcbiAgICBmb3IgKHZhciBwb3MgPSBhcnJvdyAtIDE7IHBvcyA+PSAwOyAtLXBvcykge1xuICAgICAgdmFyIGNoID0gc3RyZWFtLnN0cmluZy5jaGFyQXQocG9zKTtcbiAgICAgIHZhciBicmFja2V0ID0gYnJhY2tldHMuaW5kZXhPZihjaCk7XG4gICAgICBpZiAoYnJhY2tldCA+PSAwICYmIGJyYWNrZXQgPCAzKSB7XG4gICAgICAgIGlmICghZGVwdGgpIHsgKytwb3M7IGJyZWFrOyB9XG4gICAgICAgIGlmICgtLWRlcHRoID09IDApIGJyZWFrO1xuICAgICAgfSBlbHNlIGlmIChicmFja2V0ID49IDMgJiYgYnJhY2tldCA8IDYpIHtcbiAgICAgICAgKytkZXB0aDtcbiAgICAgIH0gZWxzZSBpZiAod29yZFJFLnRlc3QoY2gpKSB7XG4gICAgICAgIHNhd1NvbWV0aGluZyA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKHNhd1NvbWV0aGluZyAmJiAhZGVwdGgpIHtcbiAgICAgICAgKytwb3M7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoc2F3U29tZXRoaW5nICYmICFkZXB0aCkgc3RhdGUuZmF0QXJyb3dBdCA9IHBvcztcbiAgfVxuXG4gIC8vIFBhcnNlclxuXG4gIHZhciBhdG9taWNUeXBlcyA9IHtcImF0b21cIjogdHJ1ZSwgXCJudW1iZXJcIjogdHJ1ZSwgXCJ2YXJpYWJsZVwiOiB0cnVlLCBcInN0cmluZ1wiOiB0cnVlLCBcInJlZ2V4cFwiOiB0cnVlLCBcInRoaXNcIjogdHJ1ZSwgXCJqc29ubGQta2V5d29yZFwiOiB0cnVlfTtcblxuICBmdW5jdGlvbiBKU0xleGljYWwoaW5kZW50ZWQsIGNvbHVtbiwgdHlwZSwgYWxpZ24sIHByZXYsIGluZm8pIHtcbiAgICB0aGlzLmluZGVudGVkID0gaW5kZW50ZWQ7XG4gICAgdGhpcy5jb2x1bW4gPSBjb2x1bW47XG4gICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICB0aGlzLnByZXYgPSBwcmV2O1xuICAgIHRoaXMuaW5mbyA9IGluZm87XG4gICAgaWYgKGFsaWduICE9IG51bGwpIHRoaXMuYWxpZ24gPSBhbGlnbjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGluU2NvcGUoc3RhdGUsIHZhcm5hbWUpIHtcbiAgICBmb3IgKHZhciB2ID0gc3RhdGUubG9jYWxWYXJzOyB2OyB2ID0gdi5uZXh0KVxuICAgICAgaWYgKHYubmFtZSA9PSB2YXJuYW1lKSByZXR1cm4gdHJ1ZTtcbiAgICBmb3IgKHZhciBjeCA9IHN0YXRlLmNvbnRleHQ7IGN4OyBjeCA9IGN4LnByZXYpIHtcbiAgICAgIGZvciAodmFyIHYgPSBjeC52YXJzOyB2OyB2ID0gdi5uZXh0KVxuICAgICAgICBpZiAodi5uYW1lID09IHZhcm5hbWUpIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlSlMoc3RhdGUsIHN0eWxlLCB0eXBlLCBjb250ZW50LCBzdHJlYW0pIHtcbiAgICB2YXIgY2MgPSBzdGF0ZS5jYztcbiAgICAvLyBDb21tdW5pY2F0ZSBvdXIgY29udGV4dCB0byB0aGUgY29tYmluYXRvcnMuXG4gICAgLy8gKExlc3Mgd2FzdGVmdWwgdGhhbiBjb25zaW5nIHVwIGEgaHVuZHJlZCBjbG9zdXJlcyBvbiBldmVyeSBjYWxsLilcbiAgICBjeC5zdGF0ZSA9IHN0YXRlOyBjeC5zdHJlYW0gPSBzdHJlYW07IGN4Lm1hcmtlZCA9IG51bGwsIGN4LmNjID0gY2M7IGN4LnN0eWxlID0gc3R5bGU7XG5cbiAgICBpZiAoIXN0YXRlLmxleGljYWwuaGFzT3duUHJvcGVydHkoXCJhbGlnblwiKSlcbiAgICAgIHN0YXRlLmxleGljYWwuYWxpZ24gPSB0cnVlO1xuXG4gICAgd2hpbGUodHJ1ZSkge1xuICAgICAgdmFyIGNvbWJpbmF0b3IgPSBjYy5sZW5ndGggPyBjYy5wb3AoKSA6IGpzb25Nb2RlID8gZXhwcmVzc2lvbiA6IHN0YXRlbWVudDtcbiAgICAgIGlmIChjb21iaW5hdG9yKHR5cGUsIGNvbnRlbnQpKSB7XG4gICAgICAgIHdoaWxlKGNjLmxlbmd0aCAmJiBjY1tjYy5sZW5ndGggLSAxXS5sZXgpXG4gICAgICAgICAgY2MucG9wKCkoKTtcbiAgICAgICAgaWYgKGN4Lm1hcmtlZCkgcmV0dXJuIGN4Lm1hcmtlZDtcbiAgICAgICAgaWYgKHR5cGUgPT0gXCJ2YXJpYWJsZVwiICYmIGluU2NvcGUoc3RhdGUsIGNvbnRlbnQpKSByZXR1cm4gXCJ2YXJpYWJsZS0yXCI7XG4gICAgICAgIHJldHVybiBzdHlsZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBDb21iaW5hdG9yIHV0aWxzXG5cbiAgdmFyIGN4ID0ge3N0YXRlOiBudWxsLCBjb2x1bW46IG51bGwsIG1hcmtlZDogbnVsbCwgY2M6IG51bGx9O1xuICBmdW5jdGlvbiBwYXNzKCkge1xuICAgIGZvciAodmFyIGkgPSBhcmd1bWVudHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGN4LmNjLnB1c2goYXJndW1lbnRzW2ldKTtcbiAgfVxuICBmdW5jdGlvbiBjb250KCkge1xuICAgIHBhc3MuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBmdW5jdGlvbiByZWdpc3Rlcih2YXJuYW1lKSB7XG4gICAgZnVuY3Rpb24gaW5MaXN0KGxpc3QpIHtcbiAgICAgIGZvciAodmFyIHYgPSBsaXN0OyB2OyB2ID0gdi5uZXh0KVxuICAgICAgICBpZiAodi5uYW1lID09IHZhcm5hbWUpIHJldHVybiB0cnVlO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB2YXIgc3RhdGUgPSBjeC5zdGF0ZTtcbiAgICBpZiAoc3RhdGUuY29udGV4dCkge1xuICAgICAgY3gubWFya2VkID0gXCJkZWZcIjtcbiAgICAgIGlmIChpbkxpc3Qoc3RhdGUubG9jYWxWYXJzKSkgcmV0dXJuO1xuICAgICAgc3RhdGUubG9jYWxWYXJzID0ge25hbWU6IHZhcm5hbWUsIG5leHQ6IHN0YXRlLmxvY2FsVmFyc307XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChpbkxpc3Qoc3RhdGUuZ2xvYmFsVmFycykpIHJldHVybjtcbiAgICAgIGlmIChwYXJzZXJDb25maWcuZ2xvYmFsVmFycylcbiAgICAgICAgc3RhdGUuZ2xvYmFsVmFycyA9IHtuYW1lOiB2YXJuYW1lLCBuZXh0OiBzdGF0ZS5nbG9iYWxWYXJzfTtcbiAgICB9XG4gIH1cblxuICAvLyBDb21iaW5hdG9yc1xuXG4gIHZhciBkZWZhdWx0VmFycyA9IHtuYW1lOiBcInRoaXNcIiwgbmV4dDoge25hbWU6IFwiYXJndW1lbnRzXCJ9fTtcbiAgZnVuY3Rpb24gcHVzaGNvbnRleHQoKSB7XG4gICAgY3guc3RhdGUuY29udGV4dCA9IHtwcmV2OiBjeC5zdGF0ZS5jb250ZXh0LCB2YXJzOiBjeC5zdGF0ZS5sb2NhbFZhcnN9O1xuICAgIGN4LnN0YXRlLmxvY2FsVmFycyA9IGRlZmF1bHRWYXJzO1xuICB9XG4gIGZ1bmN0aW9uIHBvcGNvbnRleHQoKSB7XG4gICAgY3guc3RhdGUubG9jYWxWYXJzID0gY3guc3RhdGUuY29udGV4dC52YXJzO1xuICAgIGN4LnN0YXRlLmNvbnRleHQgPSBjeC5zdGF0ZS5jb250ZXh0LnByZXY7XG4gIH1cbiAgZnVuY3Rpb24gcHVzaGxleCh0eXBlLCBpbmZvKSB7XG4gICAgdmFyIHJlc3VsdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHN0YXRlID0gY3guc3RhdGUsIGluZGVudCA9IHN0YXRlLmluZGVudGVkO1xuICAgICAgaWYgKHN0YXRlLmxleGljYWwudHlwZSA9PSBcInN0YXRcIikgaW5kZW50ID0gc3RhdGUubGV4aWNhbC5pbmRlbnRlZDtcbiAgICAgIGVsc2UgZm9yICh2YXIgb3V0ZXIgPSBzdGF0ZS5sZXhpY2FsOyBvdXRlciAmJiBvdXRlci50eXBlID09IFwiKVwiICYmIG91dGVyLmFsaWduOyBvdXRlciA9IG91dGVyLnByZXYpXG4gICAgICAgIGluZGVudCA9IG91dGVyLmluZGVudGVkO1xuICAgICAgc3RhdGUubGV4aWNhbCA9IG5ldyBKU0xleGljYWwoaW5kZW50LCBjeC5zdHJlYW0uY29sdW1uKCksIHR5cGUsIG51bGwsIHN0YXRlLmxleGljYWwsIGluZm8pO1xuICAgIH07XG4gICAgcmVzdWx0LmxleCA9IHRydWU7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICBmdW5jdGlvbiBwb3BsZXgoKSB7XG4gICAgdmFyIHN0YXRlID0gY3guc3RhdGU7XG4gICAgaWYgKHN0YXRlLmxleGljYWwucHJldikge1xuICAgICAgaWYgKHN0YXRlLmxleGljYWwudHlwZSA9PSBcIilcIilcbiAgICAgICAgc3RhdGUuaW5kZW50ZWQgPSBzdGF0ZS5sZXhpY2FsLmluZGVudGVkO1xuICAgICAgc3RhdGUubGV4aWNhbCA9IHN0YXRlLmxleGljYWwucHJldjtcbiAgICB9XG4gIH1cbiAgcG9wbGV4LmxleCA9IHRydWU7XG5cbiAgZnVuY3Rpb24gZXhwZWN0KHdhbnRlZCkge1xuICAgIGZ1bmN0aW9uIGV4cCh0eXBlKSB7XG4gICAgICBpZiAodHlwZSA9PSB3YW50ZWQpIHJldHVybiBjb250KCk7XG4gICAgICBlbHNlIGlmICh3YW50ZWQgPT0gXCI7XCIpIHJldHVybiBwYXNzKCk7XG4gICAgICBlbHNlIHJldHVybiBjb250KGV4cCk7XG4gICAgfTtcbiAgICByZXR1cm4gZXhwO1xuICB9XG5cbiAgZnVuY3Rpb24gc3RhdGVtZW50KHR5cGUsIHZhbHVlKSB7XG4gICAgaWYgKHR5cGUgPT0gXCJ2YXJcIikgcmV0dXJuIGNvbnQocHVzaGxleChcInZhcmRlZlwiLCB2YWx1ZS5sZW5ndGgpLCB2YXJkZWYsIGV4cGVjdChcIjtcIiksIHBvcGxleCk7XG4gICAgaWYgKHR5cGUgPT0gXCJrZXl3b3JkIGFcIikgcmV0dXJuIGNvbnQocHVzaGxleChcImZvcm1cIiksIGV4cHJlc3Npb24sIHN0YXRlbWVudCwgcG9wbGV4KTtcbiAgICBpZiAodHlwZSA9PSBcImtleXdvcmQgYlwiKSByZXR1cm4gY29udChwdXNobGV4KFwiZm9ybVwiKSwgc3RhdGVtZW50LCBwb3BsZXgpO1xuICAgIGlmICh0eXBlID09IFwie1wiKSByZXR1cm4gY29udChwdXNobGV4KFwifVwiKSwgYmxvY2ssIHBvcGxleCk7XG4gICAgaWYgKHR5cGUgPT0gXCI7XCIpIHJldHVybiBjb250KCk7XG4gICAgaWYgKHR5cGUgPT0gXCJpZlwiKSB7XG4gICAgICBpZiAoY3guc3RhdGUubGV4aWNhbC5pbmZvID09IFwiZWxzZVwiICYmIGN4LnN0YXRlLmNjW2N4LnN0YXRlLmNjLmxlbmd0aCAtIDFdID09IHBvcGxleClcbiAgICAgICAgY3guc3RhdGUuY2MucG9wKCkoKTtcbiAgICAgIHJldHVybiBjb250KHB1c2hsZXgoXCJmb3JtXCIpLCBleHByZXNzaW9uLCBzdGF0ZW1lbnQsIHBvcGxleCwgbWF5YmVlbHNlKTtcbiAgICB9XG4gICAgaWYgKHR5cGUgPT0gXCJmdW5jdGlvblwiKSByZXR1cm4gY29udChmdW5jdGlvbmRlZik7XG4gICAgaWYgKHR5cGUgPT0gXCJmb3JcIikgcmV0dXJuIGNvbnQocHVzaGxleChcImZvcm1cIiksIGZvcnNwZWMsIHN0YXRlbWVudCwgcG9wbGV4KTtcbiAgICBpZiAodHlwZSA9PSBcInZhcmlhYmxlXCIpIHJldHVybiBjb250KHB1c2hsZXgoXCJzdGF0XCIpLCBtYXliZWxhYmVsKTtcbiAgICBpZiAodHlwZSA9PSBcInN3aXRjaFwiKSByZXR1cm4gY29udChwdXNobGV4KFwiZm9ybVwiKSwgZXhwcmVzc2lvbiwgcHVzaGxleChcIn1cIiwgXCJzd2l0Y2hcIiksIGV4cGVjdChcIntcIiksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrLCBwb3BsZXgsIHBvcGxleCk7XG4gICAgaWYgKHR5cGUgPT0gXCJjYXNlXCIpIHJldHVybiBjb250KGV4cHJlc3Npb24sIGV4cGVjdChcIjpcIikpO1xuICAgIGlmICh0eXBlID09IFwiZGVmYXVsdFwiKSByZXR1cm4gY29udChleHBlY3QoXCI6XCIpKTtcbiAgICBpZiAodHlwZSA9PSBcImNhdGNoXCIpIHJldHVybiBjb250KHB1c2hsZXgoXCJmb3JtXCIpLCBwdXNoY29udGV4dCwgZXhwZWN0KFwiKFwiKSwgZnVuYXJnLCBleHBlY3QoXCIpXCIpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlbWVudCwgcG9wbGV4LCBwb3Bjb250ZXh0KTtcbiAgICBpZiAodHlwZSA9PSBcIm1vZHVsZVwiKSByZXR1cm4gY29udChwdXNobGV4KFwiZm9ybVwiKSwgcHVzaGNvbnRleHQsIGFmdGVyTW9kdWxlLCBwb3Bjb250ZXh0LCBwb3BsZXgpO1xuICAgIGlmICh0eXBlID09IFwiY2xhc3NcIikgcmV0dXJuIGNvbnQocHVzaGxleChcImZvcm1cIiksIGNsYXNzTmFtZSwgcG9wbGV4KTtcbiAgICBpZiAodHlwZSA9PSBcImV4cG9ydFwiKSByZXR1cm4gY29udChwdXNobGV4KFwiZm9ybVwiKSwgYWZ0ZXJFeHBvcnQsIHBvcGxleCk7XG4gICAgaWYgKHR5cGUgPT0gXCJpbXBvcnRcIikgcmV0dXJuIGNvbnQocHVzaGxleChcImZvcm1cIiksIGFmdGVySW1wb3J0LCBwb3BsZXgpO1xuICAgIHJldHVybiBwYXNzKHB1c2hsZXgoXCJzdGF0XCIpLCBleHByZXNzaW9uLCBleHBlY3QoXCI7XCIpLCBwb3BsZXgpO1xuICB9XG4gIGZ1bmN0aW9uIGV4cHJlc3Npb24odHlwZSkge1xuICAgIHJldHVybiBleHByZXNzaW9uSW5uZXIodHlwZSwgZmFsc2UpO1xuICB9XG4gIGZ1bmN0aW9uIGV4cHJlc3Npb25Ob0NvbW1hKHR5cGUpIHtcbiAgICByZXR1cm4gZXhwcmVzc2lvbklubmVyKHR5cGUsIHRydWUpO1xuICB9XG4gIGZ1bmN0aW9uIGV4cHJlc3Npb25Jbm5lcih0eXBlLCBub0NvbW1hKSB7XG4gICAgaWYgKGN4LnN0YXRlLmZhdEFycm93QXQgPT0gY3guc3RyZWFtLnN0YXJ0KSB7XG4gICAgICB2YXIgYm9keSA9IG5vQ29tbWEgPyBhcnJvd0JvZHlOb0NvbW1hIDogYXJyb3dCb2R5O1xuICAgICAgaWYgKHR5cGUgPT0gXCIoXCIpIHJldHVybiBjb250KHB1c2hjb250ZXh0LCBwdXNobGV4KFwiKVwiKSwgY29tbWFzZXAocGF0dGVybiwgXCIpXCIpLCBwb3BsZXgsIGV4cGVjdChcIj0+XCIpLCBib2R5LCBwb3Bjb250ZXh0KTtcbiAgICAgIGVsc2UgaWYgKHR5cGUgPT0gXCJ2YXJpYWJsZVwiKSByZXR1cm4gcGFzcyhwdXNoY29udGV4dCwgcGF0dGVybiwgZXhwZWN0KFwiPT5cIiksIGJvZHksIHBvcGNvbnRleHQpO1xuICAgIH1cblxuICAgIHZhciBtYXliZW9wID0gbm9Db21tYSA/IG1heWJlb3BlcmF0b3JOb0NvbW1hIDogbWF5YmVvcGVyYXRvckNvbW1hO1xuICAgIGlmIChhdG9taWNUeXBlcy5oYXNPd25Qcm9wZXJ0eSh0eXBlKSkgcmV0dXJuIGNvbnQobWF5YmVvcCk7XG4gICAgaWYgKHR5cGUgPT0gXCJmdW5jdGlvblwiKSByZXR1cm4gY29udChmdW5jdGlvbmRlZiwgbWF5YmVvcCk7XG4gICAgaWYgKHR5cGUgPT0gXCJrZXl3b3JkIGNcIikgcmV0dXJuIGNvbnQobm9Db21tYSA/IG1heWJlZXhwcmVzc2lvbk5vQ29tbWEgOiBtYXliZWV4cHJlc3Npb24pO1xuICAgIGlmICh0eXBlID09IFwiKFwiKSByZXR1cm4gY29udChwdXNobGV4KFwiKVwiKSwgbWF5YmVleHByZXNzaW9uLCBjb21wcmVoZW5zaW9uLCBleHBlY3QoXCIpXCIpLCBwb3BsZXgsIG1heWJlb3ApO1xuICAgIGlmICh0eXBlID09IFwib3BlcmF0b3JcIiB8fCB0eXBlID09IFwic3ByZWFkXCIpIHJldHVybiBjb250KG5vQ29tbWEgPyBleHByZXNzaW9uTm9Db21tYSA6IGV4cHJlc3Npb24pO1xuICAgIGlmICh0eXBlID09IFwiW1wiKSByZXR1cm4gY29udChwdXNobGV4KFwiXVwiKSwgYXJyYXlMaXRlcmFsLCBwb3BsZXgsIG1heWJlb3ApO1xuICAgIGlmICh0eXBlID09IFwie1wiKSByZXR1cm4gY29udENvbW1hc2VwKG9ianByb3AsIFwifVwiLCBudWxsLCBtYXliZW9wKTtcbiAgICBpZiAodHlwZSA9PSBcInF1YXNpXCIpIHsgcmV0dXJuIHBhc3MocXVhc2ksIG1heWJlb3ApOyB9XG4gICAgcmV0dXJuIGNvbnQoKTtcbiAgfVxuICBmdW5jdGlvbiBtYXliZWV4cHJlc3Npb24odHlwZSkge1xuICAgIGlmICh0eXBlLm1hdGNoKC9bO1xcfVxcKVxcXSxdLykpIHJldHVybiBwYXNzKCk7XG4gICAgcmV0dXJuIHBhc3MoZXhwcmVzc2lvbik7XG4gIH1cbiAgZnVuY3Rpb24gbWF5YmVleHByZXNzaW9uTm9Db21tYSh0eXBlKSB7XG4gICAgaWYgKHR5cGUubWF0Y2goL1s7XFx9XFwpXFxdLF0vKSkgcmV0dXJuIHBhc3MoKTtcbiAgICByZXR1cm4gcGFzcyhleHByZXNzaW9uTm9Db21tYSk7XG4gIH1cblxuICBmdW5jdGlvbiBtYXliZW9wZXJhdG9yQ29tbWEodHlwZSwgdmFsdWUpIHtcbiAgICBpZiAodHlwZSA9PSBcIixcIikgcmV0dXJuIGNvbnQoZXhwcmVzc2lvbik7XG4gICAgcmV0dXJuIG1heWJlb3BlcmF0b3JOb0NvbW1hKHR5cGUsIHZhbHVlLCBmYWxzZSk7XG4gIH1cbiAgZnVuY3Rpb24gbWF5YmVvcGVyYXRvck5vQ29tbWEodHlwZSwgdmFsdWUsIG5vQ29tbWEpIHtcbiAgICB2YXIgbWUgPSBub0NvbW1hID09IGZhbHNlID8gbWF5YmVvcGVyYXRvckNvbW1hIDogbWF5YmVvcGVyYXRvck5vQ29tbWE7XG4gICAgdmFyIGV4cHIgPSBub0NvbW1hID09IGZhbHNlID8gZXhwcmVzc2lvbiA6IGV4cHJlc3Npb25Ob0NvbW1hO1xuICAgIGlmICh0eXBlID09IFwiPT5cIikgcmV0dXJuIGNvbnQocHVzaGNvbnRleHQsIG5vQ29tbWEgPyBhcnJvd0JvZHlOb0NvbW1hIDogYXJyb3dCb2R5LCBwb3Bjb250ZXh0KTtcbiAgICBpZiAodHlwZSA9PSBcIm9wZXJhdG9yXCIpIHtcbiAgICAgIGlmICgvXFwrXFwrfC0tLy50ZXN0KHZhbHVlKSkgcmV0dXJuIGNvbnQobWUpO1xuICAgICAgaWYgKHZhbHVlID09IFwiP1wiKSByZXR1cm4gY29udChleHByZXNzaW9uLCBleHBlY3QoXCI6XCIpLCBleHByKTtcbiAgICAgIHJldHVybiBjb250KGV4cHIpO1xuICAgIH1cbiAgICBpZiAodHlwZSA9PSBcInF1YXNpXCIpIHsgcmV0dXJuIHBhc3MocXVhc2ksIG1lKTsgfVxuICAgIGlmICh0eXBlID09IFwiO1wiKSByZXR1cm47XG4gICAgaWYgKHR5cGUgPT0gXCIoXCIpIHJldHVybiBjb250Q29tbWFzZXAoZXhwcmVzc2lvbk5vQ29tbWEsIFwiKVwiLCBcImNhbGxcIiwgbWUpO1xuICAgIGlmICh0eXBlID09IFwiLlwiKSByZXR1cm4gY29udChwcm9wZXJ0eSwgbWUpO1xuICAgIGlmICh0eXBlID09IFwiW1wiKSByZXR1cm4gY29udChwdXNobGV4KFwiXVwiKSwgbWF5YmVleHByZXNzaW9uLCBleHBlY3QoXCJdXCIpLCBwb3BsZXgsIG1lKTtcbiAgfVxuICBmdW5jdGlvbiBxdWFzaSh0eXBlLCB2YWx1ZSkge1xuICAgIGlmICh0eXBlICE9IFwicXVhc2lcIikgcmV0dXJuIHBhc3MoKTtcbiAgICBpZiAodmFsdWUuc2xpY2UodmFsdWUubGVuZ3RoIC0gMikgIT0gXCIke1wiKSByZXR1cm4gY29udChxdWFzaSk7XG4gICAgcmV0dXJuIGNvbnQoZXhwcmVzc2lvbiwgY29udGludWVRdWFzaSk7XG4gIH1cbiAgZnVuY3Rpb24gY29udGludWVRdWFzaSh0eXBlKSB7XG4gICAgaWYgKHR5cGUgPT0gXCJ9XCIpIHtcbiAgICAgIGN4Lm1hcmtlZCA9IFwic3RyaW5nLTJcIjtcbiAgICAgIGN4LnN0YXRlLnRva2VuaXplID0gdG9rZW5RdWFzaTtcbiAgICAgIHJldHVybiBjb250KHF1YXNpKTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gYXJyb3dCb2R5KHR5cGUpIHtcbiAgICBmaW5kRmF0QXJyb3coY3guc3RyZWFtLCBjeC5zdGF0ZSk7XG4gICAgcmV0dXJuIHBhc3ModHlwZSA9PSBcIntcIiA/IHN0YXRlbWVudCA6IGV4cHJlc3Npb24pO1xuICB9XG4gIGZ1bmN0aW9uIGFycm93Qm9keU5vQ29tbWEodHlwZSkge1xuICAgIGZpbmRGYXRBcnJvdyhjeC5zdHJlYW0sIGN4LnN0YXRlKTtcbiAgICByZXR1cm4gcGFzcyh0eXBlID09IFwie1wiID8gc3RhdGVtZW50IDogZXhwcmVzc2lvbk5vQ29tbWEpO1xuICB9XG4gIGZ1bmN0aW9uIG1heWJlbGFiZWwodHlwZSkge1xuICAgIGlmICh0eXBlID09IFwiOlwiKSByZXR1cm4gY29udChwb3BsZXgsIHN0YXRlbWVudCk7XG4gICAgcmV0dXJuIHBhc3MobWF5YmVvcGVyYXRvckNvbW1hLCBleHBlY3QoXCI7XCIpLCBwb3BsZXgpO1xuICB9XG4gIGZ1bmN0aW9uIHByb3BlcnR5KHR5cGUpIHtcbiAgICBpZiAodHlwZSA9PSBcInZhcmlhYmxlXCIpIHtjeC5tYXJrZWQgPSBcInByb3BlcnR5XCI7IHJldHVybiBjb250KCk7fVxuICB9XG4gIGZ1bmN0aW9uIG9ianByb3AodHlwZSwgdmFsdWUpIHtcbiAgICBpZiAodHlwZSA9PSBcInZhcmlhYmxlXCIgfHwgY3guc3R5bGUgPT0gXCJrZXl3b3JkXCIpIHtcbiAgICAgIGN4Lm1hcmtlZCA9IFwicHJvcGVydHlcIjtcbiAgICAgIGlmICh2YWx1ZSA9PSBcImdldFwiIHx8IHZhbHVlID09IFwic2V0XCIpIHJldHVybiBjb250KGdldHRlclNldHRlcik7XG4gICAgICByZXR1cm4gY29udChhZnRlcnByb3ApO1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PSBcIm51bWJlclwiIHx8IHR5cGUgPT0gXCJzdHJpbmdcIikge1xuICAgICAgY3gubWFya2VkID0ganNvbmxkTW9kZSA/IFwicHJvcGVydHlcIiA6IChjeC5zdHlsZSArIFwiIHByb3BlcnR5XCIpO1xuICAgICAgcmV0dXJuIGNvbnQoYWZ0ZXJwcm9wKTtcbiAgICB9IGVsc2UgaWYgKHR5cGUgPT0gXCJqc29ubGQta2V5d29yZFwiKSB7XG4gICAgICByZXR1cm4gY29udChhZnRlcnByb3ApO1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PSBcIltcIikge1xuICAgICAgcmV0dXJuIGNvbnQoZXhwcmVzc2lvbiwgZXhwZWN0KFwiXVwiKSwgYWZ0ZXJwcm9wKTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gZ2V0dGVyU2V0dGVyKHR5cGUpIHtcbiAgICBpZiAodHlwZSAhPSBcInZhcmlhYmxlXCIpIHJldHVybiBwYXNzKGFmdGVycHJvcCk7XG4gICAgY3gubWFya2VkID0gXCJwcm9wZXJ0eVwiO1xuICAgIHJldHVybiBjb250KGZ1bmN0aW9uZGVmKTtcbiAgfVxuICBmdW5jdGlvbiBhZnRlcnByb3AodHlwZSkge1xuICAgIGlmICh0eXBlID09IFwiOlwiKSByZXR1cm4gY29udChleHByZXNzaW9uTm9Db21tYSk7XG4gICAgaWYgKHR5cGUgPT0gXCIoXCIpIHJldHVybiBwYXNzKGZ1bmN0aW9uZGVmKTtcbiAgfVxuICBmdW5jdGlvbiBjb21tYXNlcCh3aGF0LCBlbmQpIHtcbiAgICBmdW5jdGlvbiBwcm9jZWVkKHR5cGUpIHtcbiAgICAgIGlmICh0eXBlID09IFwiLFwiKSB7XG4gICAgICAgIHZhciBsZXggPSBjeC5zdGF0ZS5sZXhpY2FsO1xuICAgICAgICBpZiAobGV4LmluZm8gPT0gXCJjYWxsXCIpIGxleC5wb3MgPSAobGV4LnBvcyB8fCAwKSArIDE7XG4gICAgICAgIHJldHVybiBjb250KHdoYXQsIHByb2NlZWQpO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGUgPT0gZW5kKSByZXR1cm4gY29udCgpO1xuICAgICAgcmV0dXJuIGNvbnQoZXhwZWN0KGVuZCkpO1xuICAgIH1cbiAgICByZXR1cm4gZnVuY3Rpb24odHlwZSkge1xuICAgICAgaWYgKHR5cGUgPT0gZW5kKSByZXR1cm4gY29udCgpO1xuICAgICAgcmV0dXJuIHBhc3Mod2hhdCwgcHJvY2VlZCk7XG4gICAgfTtcbiAgfVxuICBmdW5jdGlvbiBjb250Q29tbWFzZXAod2hhdCwgZW5kLCBpbmZvKSB7XG4gICAgZm9yICh2YXIgaSA9IDM7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspXG4gICAgICBjeC5jYy5wdXNoKGFyZ3VtZW50c1tpXSk7XG4gICAgcmV0dXJuIGNvbnQocHVzaGxleChlbmQsIGluZm8pLCBjb21tYXNlcCh3aGF0LCBlbmQpLCBwb3BsZXgpO1xuICB9XG4gIGZ1bmN0aW9uIGJsb2NrKHR5cGUpIHtcbiAgICBpZiAodHlwZSA9PSBcIn1cIikgcmV0dXJuIGNvbnQoKTtcbiAgICByZXR1cm4gcGFzcyhzdGF0ZW1lbnQsIGJsb2NrKTtcbiAgfVxuICBmdW5jdGlvbiBtYXliZXR5cGUodHlwZSkge1xuICAgIGlmIChpc1RTICYmIHR5cGUgPT0gXCI6XCIpIHJldHVybiBjb250KHR5cGVkZWYpO1xuICB9XG4gIGZ1bmN0aW9uIHR5cGVkZWYodHlwZSkge1xuICAgIGlmICh0eXBlID09IFwidmFyaWFibGVcIil7Y3gubWFya2VkID0gXCJ2YXJpYWJsZS0zXCI7IHJldHVybiBjb250KCk7fVxuICB9XG4gIGZ1bmN0aW9uIHZhcmRlZigpIHtcbiAgICByZXR1cm4gcGFzcyhwYXR0ZXJuLCBtYXliZXR5cGUsIG1heWJlQXNzaWduLCB2YXJkZWZDb250KTtcbiAgfVxuICBmdW5jdGlvbiBwYXR0ZXJuKHR5cGUsIHZhbHVlKSB7XG4gICAgaWYgKHR5cGUgPT0gXCJ2YXJpYWJsZVwiKSB7IHJlZ2lzdGVyKHZhbHVlKTsgcmV0dXJuIGNvbnQoKTsgfVxuICAgIGlmICh0eXBlID09IFwiW1wiKSByZXR1cm4gY29udENvbW1hc2VwKHBhdHRlcm4sIFwiXVwiKTtcbiAgICBpZiAodHlwZSA9PSBcIntcIikgcmV0dXJuIGNvbnRDb21tYXNlcChwcm9wcGF0dGVybiwgXCJ9XCIpO1xuICB9XG4gIGZ1bmN0aW9uIHByb3BwYXR0ZXJuKHR5cGUsIHZhbHVlKSB7XG4gICAgaWYgKHR5cGUgPT0gXCJ2YXJpYWJsZVwiICYmICFjeC5zdHJlYW0ubWF0Y2goL15cXHMqOi8sIGZhbHNlKSkge1xuICAgICAgcmVnaXN0ZXIodmFsdWUpO1xuICAgICAgcmV0dXJuIGNvbnQobWF5YmVBc3NpZ24pO1xuICAgIH1cbiAgICBpZiAodHlwZSA9PSBcInZhcmlhYmxlXCIpIGN4Lm1hcmtlZCA9IFwicHJvcGVydHlcIjtcbiAgICByZXR1cm4gY29udChleHBlY3QoXCI6XCIpLCBwYXR0ZXJuLCBtYXliZUFzc2lnbik7XG4gIH1cbiAgZnVuY3Rpb24gbWF5YmVBc3NpZ24oX3R5cGUsIHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09IFwiPVwiKSByZXR1cm4gY29udChleHByZXNzaW9uTm9Db21tYSk7XG4gIH1cbiAgZnVuY3Rpb24gdmFyZGVmQ29udCh0eXBlKSB7XG4gICAgaWYgKHR5cGUgPT0gXCIsXCIpIHJldHVybiBjb250KHZhcmRlZik7XG4gIH1cbiAgZnVuY3Rpb24gbWF5YmVlbHNlKHR5cGUsIHZhbHVlKSB7XG4gICAgaWYgKHR5cGUgPT0gXCJrZXl3b3JkIGJcIiAmJiB2YWx1ZSA9PSBcImVsc2VcIikgcmV0dXJuIGNvbnQocHVzaGxleChcImZvcm1cIiwgXCJlbHNlXCIpLCBzdGF0ZW1lbnQsIHBvcGxleCk7XG4gIH1cbiAgZnVuY3Rpb24gZm9yc3BlYyh0eXBlKSB7XG4gICAgaWYgKHR5cGUgPT0gXCIoXCIpIHJldHVybiBjb250KHB1c2hsZXgoXCIpXCIpLCBmb3JzcGVjMSwgZXhwZWN0KFwiKVwiKSwgcG9wbGV4KTtcbiAgfVxuICBmdW5jdGlvbiBmb3JzcGVjMSh0eXBlKSB7XG4gICAgaWYgKHR5cGUgPT0gXCJ2YXJcIikgcmV0dXJuIGNvbnQodmFyZGVmLCBleHBlY3QoXCI7XCIpLCBmb3JzcGVjMik7XG4gICAgaWYgKHR5cGUgPT0gXCI7XCIpIHJldHVybiBjb250KGZvcnNwZWMyKTtcbiAgICBpZiAodHlwZSA9PSBcInZhcmlhYmxlXCIpIHJldHVybiBjb250KGZvcm1heWJlaW5vZik7XG4gICAgcmV0dXJuIHBhc3MoZXhwcmVzc2lvbiwgZXhwZWN0KFwiO1wiKSwgZm9yc3BlYzIpO1xuICB9XG4gIGZ1bmN0aW9uIGZvcm1heWJlaW5vZihfdHlwZSwgdmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT0gXCJpblwiIHx8IHZhbHVlID09IFwib2ZcIikgeyBjeC5tYXJrZWQgPSBcImtleXdvcmRcIjsgcmV0dXJuIGNvbnQoZXhwcmVzc2lvbik7IH1cbiAgICByZXR1cm4gY29udChtYXliZW9wZXJhdG9yQ29tbWEsIGZvcnNwZWMyKTtcbiAgfVxuICBmdW5jdGlvbiBmb3JzcGVjMih0eXBlLCB2YWx1ZSkge1xuICAgIGlmICh0eXBlID09IFwiO1wiKSByZXR1cm4gY29udChmb3JzcGVjMyk7XG4gICAgaWYgKHZhbHVlID09IFwiaW5cIiB8fCB2YWx1ZSA9PSBcIm9mXCIpIHsgY3gubWFya2VkID0gXCJrZXl3b3JkXCI7IHJldHVybiBjb250KGV4cHJlc3Npb24pOyB9XG4gICAgcmV0dXJuIHBhc3MoZXhwcmVzc2lvbiwgZXhwZWN0KFwiO1wiKSwgZm9yc3BlYzMpO1xuICB9XG4gIGZ1bmN0aW9uIGZvcnNwZWMzKHR5cGUpIHtcbiAgICBpZiAodHlwZSAhPSBcIilcIikgY29udChleHByZXNzaW9uKTtcbiAgfVxuICBmdW5jdGlvbiBmdW5jdGlvbmRlZih0eXBlLCB2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PSBcIipcIikge2N4Lm1hcmtlZCA9IFwia2V5d29yZFwiOyByZXR1cm4gY29udChmdW5jdGlvbmRlZik7fVxuICAgIGlmICh0eXBlID09IFwidmFyaWFibGVcIikge3JlZ2lzdGVyKHZhbHVlKTsgcmV0dXJuIGNvbnQoZnVuY3Rpb25kZWYpO31cbiAgICBpZiAodHlwZSA9PSBcIihcIikgcmV0dXJuIGNvbnQocHVzaGNvbnRleHQsIHB1c2hsZXgoXCIpXCIpLCBjb21tYXNlcChmdW5hcmcsIFwiKVwiKSwgcG9wbGV4LCBzdGF0ZW1lbnQsIHBvcGNvbnRleHQpO1xuICB9XG4gIGZ1bmN0aW9uIGZ1bmFyZyh0eXBlKSB7XG4gICAgaWYgKHR5cGUgPT0gXCJzcHJlYWRcIikgcmV0dXJuIGNvbnQoZnVuYXJnKTtcbiAgICByZXR1cm4gcGFzcyhwYXR0ZXJuLCBtYXliZXR5cGUpO1xuICB9XG4gIGZ1bmN0aW9uIGNsYXNzTmFtZSh0eXBlLCB2YWx1ZSkge1xuICAgIGlmICh0eXBlID09IFwidmFyaWFibGVcIikge3JlZ2lzdGVyKHZhbHVlKTsgcmV0dXJuIGNvbnQoY2xhc3NOYW1lQWZ0ZXIpO31cbiAgfVxuICBmdW5jdGlvbiBjbGFzc05hbWVBZnRlcih0eXBlLCB2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PSBcImV4dGVuZHNcIikgcmV0dXJuIGNvbnQoZXhwcmVzc2lvbiwgY2xhc3NOYW1lQWZ0ZXIpO1xuICAgIGlmICh0eXBlID09IFwie1wiKSByZXR1cm4gY29udChwdXNobGV4KFwifVwiKSwgY2xhc3NCb2R5LCBwb3BsZXgpO1xuICB9XG4gIGZ1bmN0aW9uIGNsYXNzQm9keSh0eXBlLCB2YWx1ZSkge1xuICAgIGlmICh0eXBlID09IFwidmFyaWFibGVcIiB8fCBjeC5zdHlsZSA9PSBcImtleXdvcmRcIikge1xuICAgICAgY3gubWFya2VkID0gXCJwcm9wZXJ0eVwiO1xuICAgICAgaWYgKHZhbHVlID09IFwiZ2V0XCIgfHwgdmFsdWUgPT0gXCJzZXRcIikgcmV0dXJuIGNvbnQoY2xhc3NHZXR0ZXJTZXR0ZXIsIGZ1bmN0aW9uZGVmLCBjbGFzc0JvZHkpO1xuICAgICAgcmV0dXJuIGNvbnQoZnVuY3Rpb25kZWYsIGNsYXNzQm9keSk7XG4gICAgfVxuICAgIGlmICh2YWx1ZSA9PSBcIipcIikge1xuICAgICAgY3gubWFya2VkID0gXCJrZXl3b3JkXCI7XG4gICAgICByZXR1cm4gY29udChjbGFzc0JvZHkpO1xuICAgIH1cbiAgICBpZiAodHlwZSA9PSBcIjtcIikgcmV0dXJuIGNvbnQoY2xhc3NCb2R5KTtcbiAgICBpZiAodHlwZSA9PSBcIn1cIikgcmV0dXJuIGNvbnQoKTtcbiAgfVxuICBmdW5jdGlvbiBjbGFzc0dldHRlclNldHRlcih0eXBlKSB7XG4gICAgaWYgKHR5cGUgIT0gXCJ2YXJpYWJsZVwiKSByZXR1cm4gcGFzcygpO1xuICAgIGN4Lm1hcmtlZCA9IFwicHJvcGVydHlcIjtcbiAgICByZXR1cm4gY29udCgpO1xuICB9XG4gIGZ1bmN0aW9uIGFmdGVyTW9kdWxlKHR5cGUsIHZhbHVlKSB7XG4gICAgaWYgKHR5cGUgPT0gXCJzdHJpbmdcIikgcmV0dXJuIGNvbnQoc3RhdGVtZW50KTtcbiAgICBpZiAodHlwZSA9PSBcInZhcmlhYmxlXCIpIHsgcmVnaXN0ZXIodmFsdWUpOyByZXR1cm4gY29udChtYXliZUZyb20pOyB9XG4gIH1cbiAgZnVuY3Rpb24gYWZ0ZXJFeHBvcnQoX3R5cGUsIHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09IFwiKlwiKSB7IGN4Lm1hcmtlZCA9IFwia2V5d29yZFwiOyByZXR1cm4gY29udChtYXliZUZyb20sIGV4cGVjdChcIjtcIikpOyB9XG4gICAgaWYgKHZhbHVlID09IFwiZGVmYXVsdFwiKSB7IGN4Lm1hcmtlZCA9IFwia2V5d29yZFwiOyByZXR1cm4gY29udChleHByZXNzaW9uLCBleHBlY3QoXCI7XCIpKTsgfVxuICAgIHJldHVybiBwYXNzKHN0YXRlbWVudCk7XG4gIH1cbiAgZnVuY3Rpb24gYWZ0ZXJJbXBvcnQodHlwZSkge1xuICAgIGlmICh0eXBlID09IFwic3RyaW5nXCIpIHJldHVybiBjb250KCk7XG4gICAgcmV0dXJuIHBhc3MoaW1wb3J0U3BlYywgbWF5YmVGcm9tKTtcbiAgfVxuICBmdW5jdGlvbiBpbXBvcnRTcGVjKHR5cGUsIHZhbHVlKSB7XG4gICAgaWYgKHR5cGUgPT0gXCJ7XCIpIHJldHVybiBjb250Q29tbWFzZXAoaW1wb3J0U3BlYywgXCJ9XCIpO1xuICAgIGlmICh0eXBlID09IFwidmFyaWFibGVcIikgcmVnaXN0ZXIodmFsdWUpO1xuICAgIHJldHVybiBjb250KCk7XG4gIH1cbiAgZnVuY3Rpb24gbWF5YmVGcm9tKF90eXBlLCB2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PSBcImZyb21cIikgeyBjeC5tYXJrZWQgPSBcImtleXdvcmRcIjsgcmV0dXJuIGNvbnQoZXhwcmVzc2lvbik7IH1cbiAgfVxuICBmdW5jdGlvbiBhcnJheUxpdGVyYWwodHlwZSkge1xuICAgIGlmICh0eXBlID09IFwiXVwiKSByZXR1cm4gY29udCgpO1xuICAgIHJldHVybiBwYXNzKGV4cHJlc3Npb25Ob0NvbW1hLCBtYXliZUFycmF5Q29tcHJlaGVuc2lvbik7XG4gIH1cbiAgZnVuY3Rpb24gbWF5YmVBcnJheUNvbXByZWhlbnNpb24odHlwZSkge1xuICAgIGlmICh0eXBlID09IFwiZm9yXCIpIHJldHVybiBwYXNzKGNvbXByZWhlbnNpb24sIGV4cGVjdChcIl1cIikpO1xuICAgIGlmICh0eXBlID09IFwiLFwiKSByZXR1cm4gY29udChjb21tYXNlcChleHByZXNzaW9uTm9Db21tYSwgXCJdXCIpKTtcbiAgICByZXR1cm4gcGFzcyhjb21tYXNlcChleHByZXNzaW9uTm9Db21tYSwgXCJdXCIpKTtcbiAgfVxuICBmdW5jdGlvbiBjb21wcmVoZW5zaW9uKHR5cGUpIHtcbiAgICBpZiAodHlwZSA9PSBcImZvclwiKSByZXR1cm4gY29udChmb3JzcGVjLCBjb21wcmVoZW5zaW9uKTtcbiAgICBpZiAodHlwZSA9PSBcImlmXCIpIHJldHVybiBjb250KGV4cHJlc3Npb24sIGNvbXByZWhlbnNpb24pO1xuICB9XG5cbiAgLy8gSW50ZXJmYWNlXG5cbiAgcmV0dXJuIHtcbiAgICBzdGFydFN0YXRlOiBmdW5jdGlvbihiYXNlY29sdW1uKSB7XG4gICAgICB2YXIgc3RhdGUgPSB7XG4gICAgICAgIHRva2VuaXplOiB0b2tlbkJhc2UsXG4gICAgICAgIGxhc3RUeXBlOiBcInNvZlwiLFxuICAgICAgICBjYzogW10sXG4gICAgICAgIGxleGljYWw6IG5ldyBKU0xleGljYWwoKGJhc2Vjb2x1bW4gfHwgMCkgLSBpbmRlbnRVbml0LCAwLCBcImJsb2NrXCIsIGZhbHNlKSxcbiAgICAgICAgbG9jYWxWYXJzOiBwYXJzZXJDb25maWcubG9jYWxWYXJzLFxuICAgICAgICBjb250ZXh0OiBwYXJzZXJDb25maWcubG9jYWxWYXJzICYmIHt2YXJzOiBwYXJzZXJDb25maWcubG9jYWxWYXJzfSxcbiAgICAgICAgaW5kZW50ZWQ6IDBcbiAgICAgIH07XG4gICAgICBpZiAocGFyc2VyQ29uZmlnLmdsb2JhbFZhcnMgJiYgdHlwZW9mIHBhcnNlckNvbmZpZy5nbG9iYWxWYXJzID09IFwib2JqZWN0XCIpXG4gICAgICAgIHN0YXRlLmdsb2JhbFZhcnMgPSBwYXJzZXJDb25maWcuZ2xvYmFsVmFycztcbiAgICAgIHJldHVybiBzdGF0ZTtcbiAgICB9LFxuXG4gICAgdG9rZW46IGZ1bmN0aW9uKHN0cmVhbSwgc3RhdGUpIHtcbiAgICAgIGlmIChzdHJlYW0uc29sKCkpIHtcbiAgICAgICAgaWYgKCFzdGF0ZS5sZXhpY2FsLmhhc093blByb3BlcnR5KFwiYWxpZ25cIikpXG4gICAgICAgICAgc3RhdGUubGV4aWNhbC5hbGlnbiA9IGZhbHNlO1xuICAgICAgICBzdGF0ZS5pbmRlbnRlZCA9IHN0cmVhbS5pbmRlbnRhdGlvbigpO1xuICAgICAgICBmaW5kRmF0QXJyb3coc3RyZWFtLCBzdGF0ZSk7XG4gICAgICB9XG4gICAgICBpZiAoc3RhdGUudG9rZW5pemUgIT0gdG9rZW5Db21tZW50ICYmIHN0cmVhbS5lYXRTcGFjZSgpKSByZXR1cm4gbnVsbDtcbiAgICAgIHZhciBzdHlsZSA9IHN0YXRlLnRva2VuaXplKHN0cmVhbSwgc3RhdGUpO1xuICAgICAgaWYgKHR5cGUgPT0gXCJjb21tZW50XCIpIHJldHVybiBzdHlsZTtcbiAgICAgIHN0YXRlLmxhc3RUeXBlID0gdHlwZSA9PSBcIm9wZXJhdG9yXCIgJiYgKGNvbnRlbnQgPT0gXCIrK1wiIHx8IGNvbnRlbnQgPT0gXCItLVwiKSA/IFwiaW5jZGVjXCIgOiB0eXBlO1xuICAgICAgcmV0dXJuIHBhcnNlSlMoc3RhdGUsIHN0eWxlLCB0eXBlLCBjb250ZW50LCBzdHJlYW0pO1xuICAgIH0sXG5cbiAgICBpbmRlbnQ6IGZ1bmN0aW9uKHN0YXRlLCB0ZXh0QWZ0ZXIpIHtcbiAgICAgIGlmIChzdGF0ZS50b2tlbml6ZSA9PSB0b2tlbkNvbW1lbnQpIHJldHVybiBDb2RlTWlycm9yLlBhc3M7XG4gICAgICBpZiAoc3RhdGUudG9rZW5pemUgIT0gdG9rZW5CYXNlKSByZXR1cm4gMDtcbiAgICAgIHZhciBmaXJzdENoYXIgPSB0ZXh0QWZ0ZXIgJiYgdGV4dEFmdGVyLmNoYXJBdCgwKSwgbGV4aWNhbCA9IHN0YXRlLmxleGljYWw7XG4gICAgICAvLyBLbHVkZ2UgdG8gcHJldmVudCAnbWF5YmVsc2UnIGZyb20gYmxvY2tpbmcgbGV4aWNhbCBzY29wZSBwb3BzXG4gICAgICBpZiAoIS9eXFxzKmVsc2VcXGIvLnRlc3QodGV4dEFmdGVyKSkgZm9yICh2YXIgaSA9IHN0YXRlLmNjLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgICAgIHZhciBjID0gc3RhdGUuY2NbaV07XG4gICAgICAgIGlmIChjID09IHBvcGxleCkgbGV4aWNhbCA9IGxleGljYWwucHJldjtcbiAgICAgICAgZWxzZSBpZiAoYyAhPSBtYXliZWVsc2UpIGJyZWFrO1xuICAgICAgfVxuICAgICAgaWYgKGxleGljYWwudHlwZSA9PSBcInN0YXRcIiAmJiBmaXJzdENoYXIgPT0gXCJ9XCIpIGxleGljYWwgPSBsZXhpY2FsLnByZXY7XG4gICAgICBpZiAoc3RhdGVtZW50SW5kZW50ICYmIGxleGljYWwudHlwZSA9PSBcIilcIiAmJiBsZXhpY2FsLnByZXYudHlwZSA9PSBcInN0YXRcIilcbiAgICAgICAgbGV4aWNhbCA9IGxleGljYWwucHJldjtcbiAgICAgIHZhciB0eXBlID0gbGV4aWNhbC50eXBlLCBjbG9zaW5nID0gZmlyc3RDaGFyID09IHR5cGU7XG5cbiAgICAgIGlmICh0eXBlID09IFwidmFyZGVmXCIpIHJldHVybiBsZXhpY2FsLmluZGVudGVkICsgKHN0YXRlLmxhc3RUeXBlID09IFwib3BlcmF0b3JcIiB8fCBzdGF0ZS5sYXN0VHlwZSA9PSBcIixcIiA/IGxleGljYWwuaW5mbyArIDEgOiAwKTtcbiAgICAgIGVsc2UgaWYgKHR5cGUgPT0gXCJmb3JtXCIgJiYgZmlyc3RDaGFyID09IFwie1wiKSByZXR1cm4gbGV4aWNhbC5pbmRlbnRlZDtcbiAgICAgIGVsc2UgaWYgKHR5cGUgPT0gXCJmb3JtXCIpIHJldHVybiBsZXhpY2FsLmluZGVudGVkICsgaW5kZW50VW5pdDtcbiAgICAgIGVsc2UgaWYgKHR5cGUgPT0gXCJzdGF0XCIpXG4gICAgICAgIHJldHVybiBsZXhpY2FsLmluZGVudGVkICsgKHN0YXRlLmxhc3RUeXBlID09IFwib3BlcmF0b3JcIiB8fCBzdGF0ZS5sYXN0VHlwZSA9PSBcIixcIiA/IHN0YXRlbWVudEluZGVudCB8fCBpbmRlbnRVbml0IDogMCk7XG4gICAgICBlbHNlIGlmIChsZXhpY2FsLmluZm8gPT0gXCJzd2l0Y2hcIiAmJiAhY2xvc2luZyAmJiBwYXJzZXJDb25maWcuZG91YmxlSW5kZW50U3dpdGNoICE9IGZhbHNlKVxuICAgICAgICByZXR1cm4gbGV4aWNhbC5pbmRlbnRlZCArICgvXig/OmNhc2V8ZGVmYXVsdClcXGIvLnRlc3QodGV4dEFmdGVyKSA/IGluZGVudFVuaXQgOiAyICogaW5kZW50VW5pdCk7XG4gICAgICBlbHNlIGlmIChsZXhpY2FsLmFsaWduKSByZXR1cm4gbGV4aWNhbC5jb2x1bW4gKyAoY2xvc2luZyA/IDAgOiAxKTtcbiAgICAgIGVsc2UgcmV0dXJuIGxleGljYWwuaW5kZW50ZWQgKyAoY2xvc2luZyA/IDAgOiBpbmRlbnRVbml0KTtcbiAgICB9LFxuXG4gICAgZWxlY3RyaWNDaGFyczogXCI6e31cIixcbiAgICBibG9ja0NvbW1lbnRTdGFydDoganNvbk1vZGUgPyBudWxsIDogXCIvKlwiLFxuICAgIGJsb2NrQ29tbWVudEVuZDoganNvbk1vZGUgPyBudWxsIDogXCIqL1wiLFxuICAgIGxpbmVDb21tZW50OiBqc29uTW9kZSA/IG51bGwgOiBcIi8vXCIsXG4gICAgZm9sZDogXCJicmFjZVwiLFxuXG4gICAgaGVscGVyVHlwZToganNvbk1vZGUgPyBcImpzb25cIiA6IFwiamF2YXNjcmlwdFwiLFxuICAgIGpzb25sZE1vZGU6IGpzb25sZE1vZGUsXG4gICAganNvbk1vZGU6IGpzb25Nb2RlXG4gIH07XG59KTtcblxuQ29kZU1pcnJvci5yZWdpc3RlckhlbHBlcihcIndvcmRDaGFyc1wiLCBcImphdmFzY3JpcHRcIiwgL1tcXHckXS8pO1xuXG5Db2RlTWlycm9yLmRlZmluZU1JTUUoXCJ0ZXh0L2phdmFzY3JpcHRcIiwgXCJqYXZhc2NyaXB0XCIpO1xuQ29kZU1pcnJvci5kZWZpbmVNSU1FKFwidGV4dC9lY21hc2NyaXB0XCIsIFwiamF2YXNjcmlwdFwiKTtcbkNvZGVNaXJyb3IuZGVmaW5lTUlNRShcImFwcGxpY2F0aW9uL2phdmFzY3JpcHRcIiwgXCJqYXZhc2NyaXB0XCIpO1xuQ29kZU1pcnJvci5kZWZpbmVNSU1FKFwiYXBwbGljYXRpb24veC1qYXZhc2NyaXB0XCIsIFwiamF2YXNjcmlwdFwiKTtcbkNvZGVNaXJyb3IuZGVmaW5lTUlNRShcImFwcGxpY2F0aW9uL2VjbWFzY3JpcHRcIiwgXCJqYXZhc2NyaXB0XCIpO1xuQ29kZU1pcnJvci5kZWZpbmVNSU1FKFwiYXBwbGljYXRpb24vanNvblwiLCB7bmFtZTogXCJqYXZhc2NyaXB0XCIsIGpzb246IHRydWV9KTtcbkNvZGVNaXJyb3IuZGVmaW5lTUlNRShcImFwcGxpY2F0aW9uL3gtanNvblwiLCB7bmFtZTogXCJqYXZhc2NyaXB0XCIsIGpzb246IHRydWV9KTtcbkNvZGVNaXJyb3IuZGVmaW5lTUlNRShcImFwcGxpY2F0aW9uL2xkK2pzb25cIiwge25hbWU6IFwiamF2YXNjcmlwdFwiLCBqc29ubGQ6IHRydWV9KTtcbkNvZGVNaXJyb3IuZGVmaW5lTUlNRShcInRleHQvdHlwZXNjcmlwdFwiLCB7IG5hbWU6IFwiamF2YXNjcmlwdFwiLCB0eXBlc2NyaXB0OiB0cnVlIH0pO1xuQ29kZU1pcnJvci5kZWZpbmVNSU1FKFwiYXBwbGljYXRpb24vdHlwZXNjcmlwdFwiLCB7IG5hbWU6IFwiamF2YXNjcmlwdFwiLCB0eXBlc2NyaXB0OiB0cnVlIH0pO1xuXG59KTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLy8gQ29kZU1pcnJvciwgY29weXJpZ2h0IChjKSBieSBNYXJpam4gSGF2ZXJiZWtlIGFuZCBvdGhlcnNcbi8vIERpc3RyaWJ1dGVkIHVuZGVyIGFuIE1JVCBsaWNlbnNlOiBodHRwOi8vY29kZW1pcnJvci5uZXQvTElDRU5TRVxuXG4oZnVuY3Rpb24obW9kKSB7XG4gIGlmICh0eXBlb2YgZXhwb3J0cyA9PSBcIm9iamVjdFwiICYmIHR5cGVvZiBtb2R1bGUgPT0gXCJvYmplY3RcIikgLy8gQ29tbW9uSlNcbiAgICBtb2QoKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuQ29kZU1pcnJvciA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuQ29kZU1pcnJvciA6IG51bGwpKTtcbiAgZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkgLy8gQU1EXG4gICAgZGVmaW5lKFtcIi4uLy4uL2xpYi9jb2RlbWlycm9yXCJdLCBtb2QpO1xuICBlbHNlIC8vIFBsYWluIGJyb3dzZXIgZW52XG4gICAgbW9kKENvZGVNaXJyb3IpO1xufSkoZnVuY3Rpb24oQ29kZU1pcnJvcikge1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbkNvZGVNaXJyb3IuZGVmaW5lTW9kZShcInhtbFwiLCBmdW5jdGlvbihjb25maWcsIHBhcnNlckNvbmZpZykge1xuICB2YXIgaW5kZW50VW5pdCA9IGNvbmZpZy5pbmRlbnRVbml0O1xuICB2YXIgbXVsdGlsaW5lVGFnSW5kZW50RmFjdG9yID0gcGFyc2VyQ29uZmlnLm11bHRpbGluZVRhZ0luZGVudEZhY3RvciB8fCAxO1xuICB2YXIgbXVsdGlsaW5lVGFnSW5kZW50UGFzdFRhZyA9IHBhcnNlckNvbmZpZy5tdWx0aWxpbmVUYWdJbmRlbnRQYXN0VGFnO1xuICBpZiAobXVsdGlsaW5lVGFnSW5kZW50UGFzdFRhZyA9PSBudWxsKSBtdWx0aWxpbmVUYWdJbmRlbnRQYXN0VGFnID0gdHJ1ZTtcblxuICB2YXIgS2x1ZGdlcyA9IHBhcnNlckNvbmZpZy5odG1sTW9kZSA/IHtcbiAgICBhdXRvU2VsZkNsb3NlcnM6IHsnYXJlYSc6IHRydWUsICdiYXNlJzogdHJ1ZSwgJ2JyJzogdHJ1ZSwgJ2NvbCc6IHRydWUsICdjb21tYW5kJzogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAnZW1iZWQnOiB0cnVlLCAnZnJhbWUnOiB0cnVlLCAnaHInOiB0cnVlLCAnaW1nJzogdHJ1ZSwgJ2lucHV0JzogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAna2V5Z2VuJzogdHJ1ZSwgJ2xpbmsnOiB0cnVlLCAnbWV0YSc6IHRydWUsICdwYXJhbSc6IHRydWUsICdzb3VyY2UnOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICd0cmFjayc6IHRydWUsICd3YnInOiB0cnVlLCAnbWVudWl0ZW0nOiB0cnVlfSxcbiAgICBpbXBsaWNpdGx5Q2xvc2VkOiB7J2RkJzogdHJ1ZSwgJ2xpJzogdHJ1ZSwgJ29wdGdyb3VwJzogdHJ1ZSwgJ29wdGlvbic6IHRydWUsICdwJzogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgJ3JwJzogdHJ1ZSwgJ3J0JzogdHJ1ZSwgJ3Rib2R5JzogdHJ1ZSwgJ3RkJzogdHJ1ZSwgJ3Rmb290JzogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgJ3RoJzogdHJ1ZSwgJ3RyJzogdHJ1ZX0sXG4gICAgY29udGV4dEdyYWJiZXJzOiB7XG4gICAgICAnZGQnOiB7J2RkJzogdHJ1ZSwgJ2R0JzogdHJ1ZX0sXG4gICAgICAnZHQnOiB7J2RkJzogdHJ1ZSwgJ2R0JzogdHJ1ZX0sXG4gICAgICAnbGknOiB7J2xpJzogdHJ1ZX0sXG4gICAgICAnb3B0aW9uJzogeydvcHRpb24nOiB0cnVlLCAnb3B0Z3JvdXAnOiB0cnVlfSxcbiAgICAgICdvcHRncm91cCc6IHsnb3B0Z3JvdXAnOiB0cnVlfSxcbiAgICAgICdwJzogeydhZGRyZXNzJzogdHJ1ZSwgJ2FydGljbGUnOiB0cnVlLCAnYXNpZGUnOiB0cnVlLCAnYmxvY2txdW90ZSc6IHRydWUsICdkaXInOiB0cnVlLFxuICAgICAgICAgICAgJ2Rpdic6IHRydWUsICdkbCc6IHRydWUsICdmaWVsZHNldCc6IHRydWUsICdmb290ZXInOiB0cnVlLCAnZm9ybSc6IHRydWUsXG4gICAgICAgICAgICAnaDEnOiB0cnVlLCAnaDInOiB0cnVlLCAnaDMnOiB0cnVlLCAnaDQnOiB0cnVlLCAnaDUnOiB0cnVlLCAnaDYnOiB0cnVlLFxuICAgICAgICAgICAgJ2hlYWRlcic6IHRydWUsICdoZ3JvdXAnOiB0cnVlLCAnaHInOiB0cnVlLCAnbWVudSc6IHRydWUsICduYXYnOiB0cnVlLCAnb2wnOiB0cnVlLFxuICAgICAgICAgICAgJ3AnOiB0cnVlLCAncHJlJzogdHJ1ZSwgJ3NlY3Rpb24nOiB0cnVlLCAndGFibGUnOiB0cnVlLCAndWwnOiB0cnVlfSxcbiAgICAgICdycCc6IHsncnAnOiB0cnVlLCAncnQnOiB0cnVlfSxcbiAgICAgICdydCc6IHsncnAnOiB0cnVlLCAncnQnOiB0cnVlfSxcbiAgICAgICd0Ym9keSc6IHsndGJvZHknOiB0cnVlLCAndGZvb3QnOiB0cnVlfSxcbiAgICAgICd0ZCc6IHsndGQnOiB0cnVlLCAndGgnOiB0cnVlfSxcbiAgICAgICd0Zm9vdCc6IHsndGJvZHknOiB0cnVlfSxcbiAgICAgICd0aCc6IHsndGQnOiB0cnVlLCAndGgnOiB0cnVlfSxcbiAgICAgICd0aGVhZCc6IHsndGJvZHknOiB0cnVlLCAndGZvb3QnOiB0cnVlfSxcbiAgICAgICd0cic6IHsndHInOiB0cnVlfVxuICAgIH0sXG4gICAgZG9Ob3RJbmRlbnQ6IHtcInByZVwiOiB0cnVlfSxcbiAgICBhbGxvd1VucXVvdGVkOiB0cnVlLFxuICAgIGFsbG93TWlzc2luZzogdHJ1ZSxcbiAgICBjYXNlRm9sZDogdHJ1ZVxuICB9IDoge1xuICAgIGF1dG9TZWxmQ2xvc2Vyczoge30sXG4gICAgaW1wbGljaXRseUNsb3NlZDoge30sXG4gICAgY29udGV4dEdyYWJiZXJzOiB7fSxcbiAgICBkb05vdEluZGVudDoge30sXG4gICAgYWxsb3dVbnF1b3RlZDogZmFsc2UsXG4gICAgYWxsb3dNaXNzaW5nOiBmYWxzZSxcbiAgICBjYXNlRm9sZDogZmFsc2VcbiAgfTtcbiAgdmFyIGFsaWduQ0RBVEEgPSBwYXJzZXJDb25maWcuYWxpZ25DREFUQTtcblxuICAvLyBSZXR1cm4gdmFyaWFibGVzIGZvciB0b2tlbml6ZXJzXG4gIHZhciB0eXBlLCBzZXRTdHlsZTtcblxuICBmdW5jdGlvbiBpblRleHQoc3RyZWFtLCBzdGF0ZSkge1xuICAgIGZ1bmN0aW9uIGNoYWluKHBhcnNlcikge1xuICAgICAgc3RhdGUudG9rZW5pemUgPSBwYXJzZXI7XG4gICAgICByZXR1cm4gcGFyc2VyKHN0cmVhbSwgc3RhdGUpO1xuICAgIH1cblxuICAgIHZhciBjaCA9IHN0cmVhbS5uZXh0KCk7XG4gICAgaWYgKGNoID09IFwiPFwiKSB7XG4gICAgICBpZiAoc3RyZWFtLmVhdChcIiFcIikpIHtcbiAgICAgICAgaWYgKHN0cmVhbS5lYXQoXCJbXCIpKSB7XG4gICAgICAgICAgaWYgKHN0cmVhbS5tYXRjaChcIkNEQVRBW1wiKSkgcmV0dXJuIGNoYWluKGluQmxvY2soXCJhdG9tXCIsIFwiXV0+XCIpKTtcbiAgICAgICAgICBlbHNlIHJldHVybiBudWxsO1xuICAgICAgICB9IGVsc2UgaWYgKHN0cmVhbS5tYXRjaChcIi0tXCIpKSB7XG4gICAgICAgICAgcmV0dXJuIGNoYWluKGluQmxvY2soXCJjb21tZW50XCIsIFwiLS0+XCIpKTtcbiAgICAgICAgfSBlbHNlIGlmIChzdHJlYW0ubWF0Y2goXCJET0NUWVBFXCIsIHRydWUsIHRydWUpKSB7XG4gICAgICAgICAgc3RyZWFtLmVhdFdoaWxlKC9bXFx3XFwuX1xcLV0vKTtcbiAgICAgICAgICByZXR1cm4gY2hhaW4oZG9jdHlwZSgxKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoc3RyZWFtLmVhdChcIj9cIikpIHtcbiAgICAgICAgc3RyZWFtLmVhdFdoaWxlKC9bXFx3XFwuX1xcLV0vKTtcbiAgICAgICAgc3RhdGUudG9rZW5pemUgPSBpbkJsb2NrKFwibWV0YVwiLCBcIj8+XCIpO1xuICAgICAgICByZXR1cm4gXCJtZXRhXCI7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0eXBlID0gc3RyZWFtLmVhdChcIi9cIikgPyBcImNsb3NlVGFnXCIgOiBcIm9wZW5UYWdcIjtcbiAgICAgICAgc3RhdGUudG9rZW5pemUgPSBpblRhZztcbiAgICAgICAgcmV0dXJuIFwidGFnIGJyYWNrZXRcIjtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGNoID09IFwiJlwiKSB7XG4gICAgICB2YXIgb2s7XG4gICAgICBpZiAoc3RyZWFtLmVhdChcIiNcIikpIHtcbiAgICAgICAgaWYgKHN0cmVhbS5lYXQoXCJ4XCIpKSB7XG4gICAgICAgICAgb2sgPSBzdHJlYW0uZWF0V2hpbGUoL1thLWZBLUZcXGRdLykgJiYgc3RyZWFtLmVhdChcIjtcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb2sgPSBzdHJlYW0uZWF0V2hpbGUoL1tcXGRdLykgJiYgc3RyZWFtLmVhdChcIjtcIik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9rID0gc3RyZWFtLmVhdFdoaWxlKC9bXFx3XFwuXFwtOl0vKSAmJiBzdHJlYW0uZWF0KFwiO1wiKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvayA/IFwiYXRvbVwiIDogXCJlcnJvclwiO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHJlYW0uZWF0V2hpbGUoL1teJjxdLyk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBpblRhZyhzdHJlYW0sIHN0YXRlKSB7XG4gICAgdmFyIGNoID0gc3RyZWFtLm5leHQoKTtcbiAgICBpZiAoY2ggPT0gXCI+XCIgfHwgKGNoID09IFwiL1wiICYmIHN0cmVhbS5lYXQoXCI+XCIpKSkge1xuICAgICAgc3RhdGUudG9rZW5pemUgPSBpblRleHQ7XG4gICAgICB0eXBlID0gY2ggPT0gXCI+XCIgPyBcImVuZFRhZ1wiIDogXCJzZWxmY2xvc2VUYWdcIjtcbiAgICAgIHJldHVybiBcInRhZyBicmFja2V0XCI7XG4gICAgfSBlbHNlIGlmIChjaCA9PSBcIj1cIikge1xuICAgICAgdHlwZSA9IFwiZXF1YWxzXCI7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2UgaWYgKGNoID09IFwiPFwiKSB7XG4gICAgICBzdGF0ZS50b2tlbml6ZSA9IGluVGV4dDtcbiAgICAgIHN0YXRlLnN0YXRlID0gYmFzZVN0YXRlO1xuICAgICAgc3RhdGUudGFnTmFtZSA9IHN0YXRlLnRhZ1N0YXJ0ID0gbnVsbDtcbiAgICAgIHZhciBuZXh0ID0gc3RhdGUudG9rZW5pemUoc3RyZWFtLCBzdGF0ZSk7XG4gICAgICByZXR1cm4gbmV4dCA/IG5leHQgKyBcIiB0YWcgZXJyb3JcIiA6IFwidGFnIGVycm9yXCI7XG4gICAgfSBlbHNlIGlmICgvW1xcJ1xcXCJdLy50ZXN0KGNoKSkge1xuICAgICAgc3RhdGUudG9rZW5pemUgPSBpbkF0dHJpYnV0ZShjaCk7XG4gICAgICBzdGF0ZS5zdHJpbmdTdGFydENvbCA9IHN0cmVhbS5jb2x1bW4oKTtcbiAgICAgIHJldHVybiBzdGF0ZS50b2tlbml6ZShzdHJlYW0sIHN0YXRlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyZWFtLm1hdGNoKC9eW15cXHNcXHUwMGEwPTw+XFxcIlxcJ10qW15cXHNcXHUwMGEwPTw+XFxcIlxcJ1xcL10vKTtcbiAgICAgIHJldHVybiBcIndvcmRcIjtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBpbkF0dHJpYnV0ZShxdW90ZSkge1xuICAgIHZhciBjbG9zdXJlID0gZnVuY3Rpb24oc3RyZWFtLCBzdGF0ZSkge1xuICAgICAgd2hpbGUgKCFzdHJlYW0uZW9sKCkpIHtcbiAgICAgICAgaWYgKHN0cmVhbS5uZXh0KCkgPT0gcXVvdGUpIHtcbiAgICAgICAgICBzdGF0ZS50b2tlbml6ZSA9IGluVGFnO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gXCJzdHJpbmdcIjtcbiAgICB9O1xuICAgIGNsb3N1cmUuaXNJbkF0dHJpYnV0ZSA9IHRydWU7XG4gICAgcmV0dXJuIGNsb3N1cmU7XG4gIH1cblxuICBmdW5jdGlvbiBpbkJsb2NrKHN0eWxlLCB0ZXJtaW5hdG9yKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHN0cmVhbSwgc3RhdGUpIHtcbiAgICAgIHdoaWxlICghc3RyZWFtLmVvbCgpKSB7XG4gICAgICAgIGlmIChzdHJlYW0ubWF0Y2godGVybWluYXRvcikpIHtcbiAgICAgICAgICBzdGF0ZS50b2tlbml6ZSA9IGluVGV4dDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBzdHJlYW0ubmV4dCgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0eWxlO1xuICAgIH07XG4gIH1cbiAgZnVuY3Rpb24gZG9jdHlwZShkZXB0aCkge1xuICAgIHJldHVybiBmdW5jdGlvbihzdHJlYW0sIHN0YXRlKSB7XG4gICAgICB2YXIgY2g7XG4gICAgICB3aGlsZSAoKGNoID0gc3RyZWFtLm5leHQoKSkgIT0gbnVsbCkge1xuICAgICAgICBpZiAoY2ggPT0gXCI8XCIpIHtcbiAgICAgICAgICBzdGF0ZS50b2tlbml6ZSA9IGRvY3R5cGUoZGVwdGggKyAxKTtcbiAgICAgICAgICByZXR1cm4gc3RhdGUudG9rZW5pemUoc3RyZWFtLCBzdGF0ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoY2ggPT0gXCI+XCIpIHtcbiAgICAgICAgICBpZiAoZGVwdGggPT0gMSkge1xuICAgICAgICAgICAgc3RhdGUudG9rZW5pemUgPSBpblRleHQ7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3RhdGUudG9rZW5pemUgPSBkb2N0eXBlKGRlcHRoIC0gMSk7XG4gICAgICAgICAgICByZXR1cm4gc3RhdGUudG9rZW5pemUoc3RyZWFtLCBzdGF0ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gXCJtZXRhXCI7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIENvbnRleHQoc3RhdGUsIHRhZ05hbWUsIHN0YXJ0T2ZMaW5lKSB7XG4gICAgdGhpcy5wcmV2ID0gc3RhdGUuY29udGV4dDtcbiAgICB0aGlzLnRhZ05hbWUgPSB0YWdOYW1lO1xuICAgIHRoaXMuaW5kZW50ID0gc3RhdGUuaW5kZW50ZWQ7XG4gICAgdGhpcy5zdGFydE9mTGluZSA9IHN0YXJ0T2ZMaW5lO1xuICAgIGlmIChLbHVkZ2VzLmRvTm90SW5kZW50Lmhhc093blByb3BlcnR5KHRhZ05hbWUpIHx8IChzdGF0ZS5jb250ZXh0ICYmIHN0YXRlLmNvbnRleHQubm9JbmRlbnQpKVxuICAgICAgdGhpcy5ub0luZGVudCA9IHRydWU7XG4gIH1cbiAgZnVuY3Rpb24gcG9wQ29udGV4dChzdGF0ZSkge1xuICAgIGlmIChzdGF0ZS5jb250ZXh0KSBzdGF0ZS5jb250ZXh0ID0gc3RhdGUuY29udGV4dC5wcmV2O1xuICB9XG4gIGZ1bmN0aW9uIG1heWJlUG9wQ29udGV4dChzdGF0ZSwgbmV4dFRhZ05hbWUpIHtcbiAgICB2YXIgcGFyZW50VGFnTmFtZTtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgaWYgKCFzdGF0ZS5jb250ZXh0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHBhcmVudFRhZ05hbWUgPSBzdGF0ZS5jb250ZXh0LnRhZ05hbWU7XG4gICAgICBpZiAoIUtsdWRnZXMuY29udGV4dEdyYWJiZXJzLmhhc093blByb3BlcnR5KHBhcmVudFRhZ05hbWUpIHx8XG4gICAgICAgICAgIUtsdWRnZXMuY29udGV4dEdyYWJiZXJzW3BhcmVudFRhZ05hbWVdLmhhc093blByb3BlcnR5KG5leHRUYWdOYW1lKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBwb3BDb250ZXh0KHN0YXRlKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBiYXNlU3RhdGUodHlwZSwgc3RyZWFtLCBzdGF0ZSkge1xuICAgIGlmICh0eXBlID09IFwib3BlblRhZ1wiKSB7XG4gICAgICBzdGF0ZS50YWdTdGFydCA9IHN0cmVhbS5jb2x1bW4oKTtcbiAgICAgIHJldHVybiB0YWdOYW1lU3RhdGU7XG4gICAgfSBlbHNlIGlmICh0eXBlID09IFwiY2xvc2VUYWdcIikge1xuICAgICAgcmV0dXJuIGNsb3NlVGFnTmFtZVN0YXRlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gYmFzZVN0YXRlO1xuICAgIH1cbiAgfVxuICBmdW5jdGlvbiB0YWdOYW1lU3RhdGUodHlwZSwgc3RyZWFtLCBzdGF0ZSkge1xuICAgIGlmICh0eXBlID09IFwid29yZFwiKSB7XG4gICAgICBzdGF0ZS50YWdOYW1lID0gc3RyZWFtLmN1cnJlbnQoKTtcbiAgICAgIHNldFN0eWxlID0gXCJ0YWdcIjtcbiAgICAgIHJldHVybiBhdHRyU3RhdGU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNldFN0eWxlID0gXCJlcnJvclwiO1xuICAgICAgcmV0dXJuIHRhZ05hbWVTdGF0ZTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gY2xvc2VUYWdOYW1lU3RhdGUodHlwZSwgc3RyZWFtLCBzdGF0ZSkge1xuICAgIGlmICh0eXBlID09IFwid29yZFwiKSB7XG4gICAgICB2YXIgdGFnTmFtZSA9IHN0cmVhbS5jdXJyZW50KCk7XG4gICAgICBpZiAoc3RhdGUuY29udGV4dCAmJiBzdGF0ZS5jb250ZXh0LnRhZ05hbWUgIT0gdGFnTmFtZSAmJlxuICAgICAgICAgIEtsdWRnZXMuaW1wbGljaXRseUNsb3NlZC5oYXNPd25Qcm9wZXJ0eShzdGF0ZS5jb250ZXh0LnRhZ05hbWUpKVxuICAgICAgICBwb3BDb250ZXh0KHN0YXRlKTtcbiAgICAgIGlmIChzdGF0ZS5jb250ZXh0ICYmIHN0YXRlLmNvbnRleHQudGFnTmFtZSA9PSB0YWdOYW1lKSB7XG4gICAgICAgIHNldFN0eWxlID0gXCJ0YWdcIjtcbiAgICAgICAgcmV0dXJuIGNsb3NlU3RhdGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzZXRTdHlsZSA9IFwidGFnIGVycm9yXCI7XG4gICAgICAgIHJldHVybiBjbG9zZVN0YXRlRXJyO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzZXRTdHlsZSA9IFwiZXJyb3JcIjtcbiAgICAgIHJldHVybiBjbG9zZVN0YXRlRXJyO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNsb3NlU3RhdGUodHlwZSwgX3N0cmVhbSwgc3RhdGUpIHtcbiAgICBpZiAodHlwZSAhPSBcImVuZFRhZ1wiKSB7XG4gICAgICBzZXRTdHlsZSA9IFwiZXJyb3JcIjtcbiAgICAgIHJldHVybiBjbG9zZVN0YXRlO1xuICAgIH1cbiAgICBwb3BDb250ZXh0KHN0YXRlKTtcbiAgICByZXR1cm4gYmFzZVN0YXRlO1xuICB9XG4gIGZ1bmN0aW9uIGNsb3NlU3RhdGVFcnIodHlwZSwgc3RyZWFtLCBzdGF0ZSkge1xuICAgIHNldFN0eWxlID0gXCJlcnJvclwiO1xuICAgIHJldHVybiBjbG9zZVN0YXRlKHR5cGUsIHN0cmVhbSwgc3RhdGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gYXR0clN0YXRlKHR5cGUsIF9zdHJlYW0sIHN0YXRlKSB7XG4gICAgaWYgKHR5cGUgPT0gXCJ3b3JkXCIpIHtcbiAgICAgIHNldFN0eWxlID0gXCJhdHRyaWJ1dGVcIjtcbiAgICAgIHJldHVybiBhdHRyRXFTdGF0ZTtcbiAgICB9IGVsc2UgaWYgKHR5cGUgPT0gXCJlbmRUYWdcIiB8fCB0eXBlID09IFwic2VsZmNsb3NlVGFnXCIpIHtcbiAgICAgIHZhciB0YWdOYW1lID0gc3RhdGUudGFnTmFtZSwgdGFnU3RhcnQgPSBzdGF0ZS50YWdTdGFydDtcbiAgICAgIHN0YXRlLnRhZ05hbWUgPSBzdGF0ZS50YWdTdGFydCA9IG51bGw7XG4gICAgICBpZiAodHlwZSA9PSBcInNlbGZjbG9zZVRhZ1wiIHx8XG4gICAgICAgICAgS2x1ZGdlcy5hdXRvU2VsZkNsb3NlcnMuaGFzT3duUHJvcGVydHkodGFnTmFtZSkpIHtcbiAgICAgICAgbWF5YmVQb3BDb250ZXh0KHN0YXRlLCB0YWdOYW1lKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1heWJlUG9wQ29udGV4dChzdGF0ZSwgdGFnTmFtZSk7XG4gICAgICAgIHN0YXRlLmNvbnRleHQgPSBuZXcgQ29udGV4dChzdGF0ZSwgdGFnTmFtZSwgdGFnU3RhcnQgPT0gc3RhdGUuaW5kZW50ZWQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGJhc2VTdGF0ZTtcbiAgICB9XG4gICAgc2V0U3R5bGUgPSBcImVycm9yXCI7XG4gICAgcmV0dXJuIGF0dHJTdGF0ZTtcbiAgfVxuICBmdW5jdGlvbiBhdHRyRXFTdGF0ZSh0eXBlLCBzdHJlYW0sIHN0YXRlKSB7XG4gICAgaWYgKHR5cGUgPT0gXCJlcXVhbHNcIikgcmV0dXJuIGF0dHJWYWx1ZVN0YXRlO1xuICAgIGlmICghS2x1ZGdlcy5hbGxvd01pc3NpbmcpIHNldFN0eWxlID0gXCJlcnJvclwiO1xuICAgIHJldHVybiBhdHRyU3RhdGUodHlwZSwgc3RyZWFtLCBzdGF0ZSk7XG4gIH1cbiAgZnVuY3Rpb24gYXR0clZhbHVlU3RhdGUodHlwZSwgc3RyZWFtLCBzdGF0ZSkge1xuICAgIGlmICh0eXBlID09IFwic3RyaW5nXCIpIHJldHVybiBhdHRyQ29udGludWVkU3RhdGU7XG4gICAgaWYgKHR5cGUgPT0gXCJ3b3JkXCIgJiYgS2x1ZGdlcy5hbGxvd1VucXVvdGVkKSB7c2V0U3R5bGUgPSBcInN0cmluZ1wiOyByZXR1cm4gYXR0clN0YXRlO31cbiAgICBzZXRTdHlsZSA9IFwiZXJyb3JcIjtcbiAgICByZXR1cm4gYXR0clN0YXRlKHR5cGUsIHN0cmVhbSwgc3RhdGUpO1xuICB9XG4gIGZ1bmN0aW9uIGF0dHJDb250aW51ZWRTdGF0ZSh0eXBlLCBzdHJlYW0sIHN0YXRlKSB7XG4gICAgaWYgKHR5cGUgPT0gXCJzdHJpbmdcIikgcmV0dXJuIGF0dHJDb250aW51ZWRTdGF0ZTtcbiAgICByZXR1cm4gYXR0clN0YXRlKHR5cGUsIHN0cmVhbSwgc3RhdGUpO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzdGFydFN0YXRlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB7dG9rZW5pemU6IGluVGV4dCxcbiAgICAgICAgICAgICAgc3RhdGU6IGJhc2VTdGF0ZSxcbiAgICAgICAgICAgICAgaW5kZW50ZWQ6IDAsXG4gICAgICAgICAgICAgIHRhZ05hbWU6IG51bGwsIHRhZ1N0YXJ0OiBudWxsLFxuICAgICAgICAgICAgICBjb250ZXh0OiBudWxsfTtcbiAgICB9LFxuXG4gICAgdG9rZW46IGZ1bmN0aW9uKHN0cmVhbSwgc3RhdGUpIHtcbiAgICAgIGlmICghc3RhdGUudGFnTmFtZSAmJiBzdHJlYW0uc29sKCkpXG4gICAgICAgIHN0YXRlLmluZGVudGVkID0gc3RyZWFtLmluZGVudGF0aW9uKCk7XG5cbiAgICAgIGlmIChzdHJlYW0uZWF0U3BhY2UoKSkgcmV0dXJuIG51bGw7XG4gICAgICB0eXBlID0gbnVsbDtcbiAgICAgIHZhciBzdHlsZSA9IHN0YXRlLnRva2VuaXplKHN0cmVhbSwgc3RhdGUpO1xuICAgICAgaWYgKChzdHlsZSB8fCB0eXBlKSAmJiBzdHlsZSAhPSBcImNvbW1lbnRcIikge1xuICAgICAgICBzZXRTdHlsZSA9IG51bGw7XG4gICAgICAgIHN0YXRlLnN0YXRlID0gc3RhdGUuc3RhdGUodHlwZSB8fCBzdHlsZSwgc3RyZWFtLCBzdGF0ZSk7XG4gICAgICAgIGlmIChzZXRTdHlsZSlcbiAgICAgICAgICBzdHlsZSA9IHNldFN0eWxlID09IFwiZXJyb3JcIiA/IHN0eWxlICsgXCIgZXJyb3JcIiA6IHNldFN0eWxlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN0eWxlO1xuICAgIH0sXG5cbiAgICBpbmRlbnQ6IGZ1bmN0aW9uKHN0YXRlLCB0ZXh0QWZ0ZXIsIGZ1bGxMaW5lKSB7XG4gICAgICB2YXIgY29udGV4dCA9IHN0YXRlLmNvbnRleHQ7XG4gICAgICAvLyBJbmRlbnQgbXVsdGktbGluZSBzdHJpbmdzIChlLmcuIGNzcykuXG4gICAgICBpZiAoc3RhdGUudG9rZW5pemUuaXNJbkF0dHJpYnV0ZSkge1xuICAgICAgICBpZiAoc3RhdGUudGFnU3RhcnQgPT0gc3RhdGUuaW5kZW50ZWQpXG4gICAgICAgICAgcmV0dXJuIHN0YXRlLnN0cmluZ1N0YXJ0Q29sICsgMTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHJldHVybiBzdGF0ZS5pbmRlbnRlZCArIGluZGVudFVuaXQ7XG4gICAgICB9XG4gICAgICBpZiAoY29udGV4dCAmJiBjb250ZXh0Lm5vSW5kZW50KSByZXR1cm4gQ29kZU1pcnJvci5QYXNzO1xuICAgICAgaWYgKHN0YXRlLnRva2VuaXplICE9IGluVGFnICYmIHN0YXRlLnRva2VuaXplICE9IGluVGV4dClcbiAgICAgICAgcmV0dXJuIGZ1bGxMaW5lID8gZnVsbExpbmUubWF0Y2goL14oXFxzKikvKVswXS5sZW5ndGggOiAwO1xuICAgICAgLy8gSW5kZW50IHRoZSBzdGFydHMgb2YgYXR0cmlidXRlIG5hbWVzLlxuICAgICAgaWYgKHN0YXRlLnRhZ05hbWUpIHtcbiAgICAgICAgaWYgKG11bHRpbGluZVRhZ0luZGVudFBhc3RUYWcpXG4gICAgICAgICAgcmV0dXJuIHN0YXRlLnRhZ1N0YXJ0ICsgc3RhdGUudGFnTmFtZS5sZW5ndGggKyAyO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgcmV0dXJuIHN0YXRlLnRhZ1N0YXJ0ICsgaW5kZW50VW5pdCAqIG11bHRpbGluZVRhZ0luZGVudEZhY3RvcjtcbiAgICAgIH1cbiAgICAgIGlmIChhbGlnbkNEQVRBICYmIC88IVxcW0NEQVRBXFxbLy50ZXN0KHRleHRBZnRlcikpIHJldHVybiAwO1xuICAgICAgdmFyIHRhZ0FmdGVyID0gdGV4dEFmdGVyICYmIC9ePChcXC8pPyhbXFx3XzpcXC4tXSopLy5leGVjKHRleHRBZnRlcik7XG4gICAgICBpZiAodGFnQWZ0ZXIgJiYgdGFnQWZ0ZXJbMV0pIHsgLy8gQ2xvc2luZyB0YWcgc3BvdHRlZFxuICAgICAgICB3aGlsZSAoY29udGV4dCkge1xuICAgICAgICAgIGlmIChjb250ZXh0LnRhZ05hbWUgPT0gdGFnQWZ0ZXJbMl0pIHtcbiAgICAgICAgICAgIGNvbnRleHQgPSBjb250ZXh0LnByZXY7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9IGVsc2UgaWYgKEtsdWRnZXMuaW1wbGljaXRseUNsb3NlZC5oYXNPd25Qcm9wZXJ0eShjb250ZXh0LnRhZ05hbWUpKSB7XG4gICAgICAgICAgICBjb250ZXh0ID0gY29udGV4dC5wcmV2O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodGFnQWZ0ZXIpIHsgLy8gT3BlbmluZyB0YWcgc3BvdHRlZFxuICAgICAgICB3aGlsZSAoY29udGV4dCkge1xuICAgICAgICAgIHZhciBncmFiYmVycyA9IEtsdWRnZXMuY29udGV4dEdyYWJiZXJzW2NvbnRleHQudGFnTmFtZV07XG4gICAgICAgICAgaWYgKGdyYWJiZXJzICYmIGdyYWJiZXJzLmhhc093blByb3BlcnR5KHRhZ0FmdGVyWzJdKSlcbiAgICAgICAgICAgIGNvbnRleHQgPSBjb250ZXh0LnByZXY7XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHdoaWxlIChjb250ZXh0ICYmICFjb250ZXh0LnN0YXJ0T2ZMaW5lKVxuICAgICAgICBjb250ZXh0ID0gY29udGV4dC5wcmV2O1xuICAgICAgaWYgKGNvbnRleHQpIHJldHVybiBjb250ZXh0LmluZGVudCArIGluZGVudFVuaXQ7XG4gICAgICBlbHNlIHJldHVybiAwO1xuICAgIH0sXG5cbiAgICBlbGVjdHJpY0lucHV0OiAvPFxcL1tcXHNcXHc6XSs+JC8sXG4gICAgYmxvY2tDb21tZW50U3RhcnQ6IFwiPCEtLVwiLFxuICAgIGJsb2NrQ29tbWVudEVuZDogXCItLT5cIixcblxuICAgIGNvbmZpZ3VyYXRpb246IHBhcnNlckNvbmZpZy5odG1sTW9kZSA/IFwiaHRtbFwiIDogXCJ4bWxcIixcbiAgICBoZWxwZXJUeXBlOiBwYXJzZXJDb25maWcuaHRtbE1vZGUgPyBcImh0bWxcIiA6IFwieG1sXCJcbiAgfTtcbn0pO1xuXG5Db2RlTWlycm9yLmRlZmluZU1JTUUoXCJ0ZXh0L3htbFwiLCBcInhtbFwiKTtcbkNvZGVNaXJyb3IuZGVmaW5lTUlNRShcImFwcGxpY2F0aW9uL3htbFwiLCBcInhtbFwiKTtcbmlmICghQ29kZU1pcnJvci5taW1lTW9kZXMuaGFzT3duUHJvcGVydHkoXCJ0ZXh0L2h0bWxcIikpXG4gIENvZGVNaXJyb3IuZGVmaW5lTUlNRShcInRleHQvaHRtbFwiLCB7bmFtZTogXCJ4bWxcIiwgaHRtbE1vZGU6IHRydWV9KTtcblxufSk7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIjsoZnVuY3Rpb24od2luKXtcblx0dmFyIHN0b3JlID0ge30sXG5cdFx0ZG9jID0gd2luLmRvY3VtZW50LFxuXHRcdGxvY2FsU3RvcmFnZU5hbWUgPSAnbG9jYWxTdG9yYWdlJyxcblx0XHRzY3JpcHRUYWcgPSAnc2NyaXB0Jyxcblx0XHRzdG9yYWdlXG5cblx0c3RvcmUuZGlzYWJsZWQgPSBmYWxzZVxuXHRzdG9yZS5zZXQgPSBmdW5jdGlvbihrZXksIHZhbHVlKSB7fVxuXHRzdG9yZS5nZXQgPSBmdW5jdGlvbihrZXkpIHt9XG5cdHN0b3JlLnJlbW92ZSA9IGZ1bmN0aW9uKGtleSkge31cblx0c3RvcmUuY2xlYXIgPSBmdW5jdGlvbigpIHt9XG5cdHN0b3JlLnRyYW5zYWN0ID0gZnVuY3Rpb24oa2V5LCBkZWZhdWx0VmFsLCB0cmFuc2FjdGlvbkZuKSB7XG5cdFx0dmFyIHZhbCA9IHN0b3JlLmdldChrZXkpXG5cdFx0aWYgKHRyYW5zYWN0aW9uRm4gPT0gbnVsbCkge1xuXHRcdFx0dHJhbnNhY3Rpb25GbiA9IGRlZmF1bHRWYWxcblx0XHRcdGRlZmF1bHRWYWwgPSBudWxsXG5cdFx0fVxuXHRcdGlmICh0eXBlb2YgdmFsID09ICd1bmRlZmluZWQnKSB7IHZhbCA9IGRlZmF1bHRWYWwgfHwge30gfVxuXHRcdHRyYW5zYWN0aW9uRm4odmFsKVxuXHRcdHN0b3JlLnNldChrZXksIHZhbClcblx0fVxuXHRzdG9yZS5nZXRBbGwgPSBmdW5jdGlvbigpIHt9XG5cdHN0b3JlLmZvckVhY2ggPSBmdW5jdGlvbigpIHt9XG5cblx0c3RvcmUuc2VyaWFsaXplID0gZnVuY3Rpb24odmFsdWUpIHtcblx0XHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkodmFsdWUpXG5cdH1cblx0c3RvcmUuZGVzZXJpYWxpemUgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdGlmICh0eXBlb2YgdmFsdWUgIT0gJ3N0cmluZycpIHsgcmV0dXJuIHVuZGVmaW5lZCB9XG5cdFx0dHJ5IHsgcmV0dXJuIEpTT04ucGFyc2UodmFsdWUpIH1cblx0XHRjYXRjaChlKSB7IHJldHVybiB2YWx1ZSB8fCB1bmRlZmluZWQgfVxuXHR9XG5cblx0Ly8gRnVuY3Rpb25zIHRvIGVuY2Fwc3VsYXRlIHF1ZXN0aW9uYWJsZSBGaXJlRm94IDMuNi4xMyBiZWhhdmlvclxuXHQvLyB3aGVuIGFib3V0LmNvbmZpZzo6ZG9tLnN0b3JhZ2UuZW5hYmxlZCA9PT0gZmFsc2Vcblx0Ly8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9tYXJjdXN3ZXN0aW4vc3RvcmUuanMvaXNzdWVzI2lzc3VlLzEzXG5cdGZ1bmN0aW9uIGlzTG9jYWxTdG9yYWdlTmFtZVN1cHBvcnRlZCgpIHtcblx0XHR0cnkgeyByZXR1cm4gKGxvY2FsU3RvcmFnZU5hbWUgaW4gd2luICYmIHdpbltsb2NhbFN0b3JhZ2VOYW1lXSkgfVxuXHRcdGNhdGNoKGVycikgeyByZXR1cm4gZmFsc2UgfVxuXHR9XG5cblx0aWYgKGlzTG9jYWxTdG9yYWdlTmFtZVN1cHBvcnRlZCgpKSB7XG5cdFx0c3RvcmFnZSA9IHdpbltsb2NhbFN0b3JhZ2VOYW1lXVxuXHRcdHN0b3JlLnNldCA9IGZ1bmN0aW9uKGtleSwgdmFsKSB7XG5cdFx0XHRpZiAodmFsID09PSB1bmRlZmluZWQpIHsgcmV0dXJuIHN0b3JlLnJlbW92ZShrZXkpIH1cblx0XHRcdHN0b3JhZ2Uuc2V0SXRlbShrZXksIHN0b3JlLnNlcmlhbGl6ZSh2YWwpKVxuXHRcdFx0cmV0dXJuIHZhbFxuXHRcdH1cblx0XHRzdG9yZS5nZXQgPSBmdW5jdGlvbihrZXkpIHsgcmV0dXJuIHN0b3JlLmRlc2VyaWFsaXplKHN0b3JhZ2UuZ2V0SXRlbShrZXkpKSB9XG5cdFx0c3RvcmUucmVtb3ZlID0gZnVuY3Rpb24oa2V5KSB7IHN0b3JhZ2UucmVtb3ZlSXRlbShrZXkpIH1cblx0XHRzdG9yZS5jbGVhciA9IGZ1bmN0aW9uKCkgeyBzdG9yYWdlLmNsZWFyKCkgfVxuXHRcdHN0b3JlLmdldEFsbCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHJldCA9IHt9XG5cdFx0XHRzdG9yZS5mb3JFYWNoKGZ1bmN0aW9uKGtleSwgdmFsKSB7XG5cdFx0XHRcdHJldFtrZXldID0gdmFsXG5cdFx0XHR9KVxuXHRcdFx0cmV0dXJuIHJldFxuXHRcdH1cblx0XHRzdG9yZS5mb3JFYWNoID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcblx0XHRcdGZvciAodmFyIGk9MDsgaTxzdG9yYWdlLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHZhciBrZXkgPSBzdG9yYWdlLmtleShpKVxuXHRcdFx0XHRjYWxsYmFjayhrZXksIHN0b3JlLmdldChrZXkpKVxuXHRcdFx0fVxuXHRcdH1cblx0fSBlbHNlIGlmIChkb2MuZG9jdW1lbnRFbGVtZW50LmFkZEJlaGF2aW9yKSB7XG5cdFx0dmFyIHN0b3JhZ2VPd25lcixcblx0XHRcdHN0b3JhZ2VDb250YWluZXJcblx0XHQvLyBTaW5jZSAjdXNlckRhdGEgc3RvcmFnZSBhcHBsaWVzIG9ubHkgdG8gc3BlY2lmaWMgcGF0aHMsIHdlIG5lZWQgdG9cblx0XHQvLyBzb21laG93IGxpbmsgb3VyIGRhdGEgdG8gYSBzcGVjaWZpYyBwYXRoLiAgV2UgY2hvb3NlIC9mYXZpY29uLmljb1xuXHRcdC8vIGFzIGEgcHJldHR5IHNhZmUgb3B0aW9uLCBzaW5jZSBhbGwgYnJvd3NlcnMgYWxyZWFkeSBtYWtlIGEgcmVxdWVzdCB0b1xuXHRcdC8vIHRoaXMgVVJMIGFueXdheSBhbmQgYmVpbmcgYSA0MDQgd2lsbCBub3QgaHVydCB1cyBoZXJlLiAgV2Ugd3JhcCBhblxuXHRcdC8vIGlmcmFtZSBwb2ludGluZyB0byB0aGUgZmF2aWNvbiBpbiBhbiBBY3RpdmVYT2JqZWN0KGh0bWxmaWxlKSBvYmplY3Rcblx0XHQvLyAoc2VlOiBodHRwOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvYWE3NTI1NzQodj1WUy44NSkuYXNweClcblx0XHQvLyBzaW5jZSB0aGUgaWZyYW1lIGFjY2VzcyBydWxlcyBhcHBlYXIgdG8gYWxsb3cgZGlyZWN0IGFjY2VzcyBhbmRcblx0XHQvLyBtYW5pcHVsYXRpb24gb2YgdGhlIGRvY3VtZW50IGVsZW1lbnQsIGV2ZW4gZm9yIGEgNDA0IHBhZ2UuICBUaGlzXG5cdFx0Ly8gZG9jdW1lbnQgY2FuIGJlIHVzZWQgaW5zdGVhZCBvZiB0aGUgY3VycmVudCBkb2N1bWVudCAod2hpY2ggd291bGRcblx0XHQvLyBoYXZlIGJlZW4gbGltaXRlZCB0byB0aGUgY3VycmVudCBwYXRoKSB0byBwZXJmb3JtICN1c2VyRGF0YSBzdG9yYWdlLlxuXHRcdHRyeSB7XG5cdFx0XHRzdG9yYWdlQ29udGFpbmVyID0gbmV3IEFjdGl2ZVhPYmplY3QoJ2h0bWxmaWxlJylcblx0XHRcdHN0b3JhZ2VDb250YWluZXIub3BlbigpXG5cdFx0XHRzdG9yYWdlQ29udGFpbmVyLndyaXRlKCc8JytzY3JpcHRUYWcrJz5kb2N1bWVudC53PXdpbmRvdzwvJytzY3JpcHRUYWcrJz48aWZyYW1lIHNyYz1cIi9mYXZpY29uLmljb1wiPjwvaWZyYW1lPicpXG5cdFx0XHRzdG9yYWdlQ29udGFpbmVyLmNsb3NlKClcblx0XHRcdHN0b3JhZ2VPd25lciA9IHN0b3JhZ2VDb250YWluZXIudy5mcmFtZXNbMF0uZG9jdW1lbnRcblx0XHRcdHN0b3JhZ2UgPSBzdG9yYWdlT3duZXIuY3JlYXRlRWxlbWVudCgnZGl2Jylcblx0XHR9IGNhdGNoKGUpIHtcblx0XHRcdC8vIHNvbWVob3cgQWN0aXZlWE9iamVjdCBpbnN0YW50aWF0aW9uIGZhaWxlZCAocGVyaGFwcyBzb21lIHNwZWNpYWxcblx0XHRcdC8vIHNlY3VyaXR5IHNldHRpbmdzIG9yIG90aGVyd3NlKSwgZmFsbCBiYWNrIHRvIHBlci1wYXRoIHN0b3JhZ2Vcblx0XHRcdHN0b3JhZ2UgPSBkb2MuY3JlYXRlRWxlbWVudCgnZGl2Jylcblx0XHRcdHN0b3JhZ2VPd25lciA9IGRvYy5ib2R5XG5cdFx0fVxuXHRcdGZ1bmN0aW9uIHdpdGhJRVN0b3JhZ2Uoc3RvcmVGdW5jdGlvbikge1xuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMClcblx0XHRcdFx0YXJncy51bnNoaWZ0KHN0b3JhZ2UpXG5cdFx0XHRcdC8vIFNlZSBodHRwOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvbXM1MzEwODEodj1WUy44NSkuYXNweFxuXHRcdFx0XHQvLyBhbmQgaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L21zNTMxNDI0KHY9VlMuODUpLmFzcHhcblx0XHRcdFx0c3RvcmFnZU93bmVyLmFwcGVuZENoaWxkKHN0b3JhZ2UpXG5cdFx0XHRcdHN0b3JhZ2UuYWRkQmVoYXZpb3IoJyNkZWZhdWx0I3VzZXJEYXRhJylcblx0XHRcdFx0c3RvcmFnZS5sb2FkKGxvY2FsU3RvcmFnZU5hbWUpXG5cdFx0XHRcdHZhciByZXN1bHQgPSBzdG9yZUZ1bmN0aW9uLmFwcGx5KHN0b3JlLCBhcmdzKVxuXHRcdFx0XHRzdG9yYWdlT3duZXIucmVtb3ZlQ2hpbGQoc3RvcmFnZSlcblx0XHRcdFx0cmV0dXJuIHJlc3VsdFxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIEluIElFNywga2V5cyBjYW5ub3Qgc3RhcnQgd2l0aCBhIGRpZ2l0IG9yIGNvbnRhaW4gY2VydGFpbiBjaGFycy5cblx0XHQvLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL21hcmN1c3dlc3Rpbi9zdG9yZS5qcy9pc3N1ZXMvNDBcblx0XHQvLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL21hcmN1c3dlc3Rpbi9zdG9yZS5qcy9pc3N1ZXMvODNcblx0XHR2YXIgZm9yYmlkZGVuQ2hhcnNSZWdleCA9IG5ldyBSZWdFeHAoXCJbIVxcXCIjJCUmJygpKissL1xcXFxcXFxcOjs8PT4/QFtcXFxcXV5ge3x9fl1cIiwgXCJnXCIpXG5cdFx0ZnVuY3Rpb24gaWVLZXlGaXgoa2V5KSB7XG5cdFx0XHRyZXR1cm4ga2V5LnJlcGxhY2UoL15kLywgJ19fXyQmJykucmVwbGFjZShmb3JiaWRkZW5DaGFyc1JlZ2V4LCAnX19fJylcblx0XHR9XG5cdFx0c3RvcmUuc2V0ID0gd2l0aElFU3RvcmFnZShmdW5jdGlvbihzdG9yYWdlLCBrZXksIHZhbCkge1xuXHRcdFx0a2V5ID0gaWVLZXlGaXgoa2V5KVxuXHRcdFx0aWYgKHZhbCA9PT0gdW5kZWZpbmVkKSB7IHJldHVybiBzdG9yZS5yZW1vdmUoa2V5KSB9XG5cdFx0XHRzdG9yYWdlLnNldEF0dHJpYnV0ZShrZXksIHN0b3JlLnNlcmlhbGl6ZSh2YWwpKVxuXHRcdFx0c3RvcmFnZS5zYXZlKGxvY2FsU3RvcmFnZU5hbWUpXG5cdFx0XHRyZXR1cm4gdmFsXG5cdFx0fSlcblx0XHRzdG9yZS5nZXQgPSB3aXRoSUVTdG9yYWdlKGZ1bmN0aW9uKHN0b3JhZ2UsIGtleSkge1xuXHRcdFx0a2V5ID0gaWVLZXlGaXgoa2V5KVxuXHRcdFx0cmV0dXJuIHN0b3JlLmRlc2VyaWFsaXplKHN0b3JhZ2UuZ2V0QXR0cmlidXRlKGtleSkpXG5cdFx0fSlcblx0XHRzdG9yZS5yZW1vdmUgPSB3aXRoSUVTdG9yYWdlKGZ1bmN0aW9uKHN0b3JhZ2UsIGtleSkge1xuXHRcdFx0a2V5ID0gaWVLZXlGaXgoa2V5KVxuXHRcdFx0c3RvcmFnZS5yZW1vdmVBdHRyaWJ1dGUoa2V5KVxuXHRcdFx0c3RvcmFnZS5zYXZlKGxvY2FsU3RvcmFnZU5hbWUpXG5cdFx0fSlcblx0XHRzdG9yZS5jbGVhciA9IHdpdGhJRVN0b3JhZ2UoZnVuY3Rpb24oc3RvcmFnZSkge1xuXHRcdFx0dmFyIGF0dHJpYnV0ZXMgPSBzdG9yYWdlLlhNTERvY3VtZW50LmRvY3VtZW50RWxlbWVudC5hdHRyaWJ1dGVzXG5cdFx0XHRzdG9yYWdlLmxvYWQobG9jYWxTdG9yYWdlTmFtZSlcblx0XHRcdGZvciAodmFyIGk9MCwgYXR0cjsgYXR0cj1hdHRyaWJ1dGVzW2ldOyBpKyspIHtcblx0XHRcdFx0c3RvcmFnZS5yZW1vdmVBdHRyaWJ1dGUoYXR0ci5uYW1lKVxuXHRcdFx0fVxuXHRcdFx0c3RvcmFnZS5zYXZlKGxvY2FsU3RvcmFnZU5hbWUpXG5cdFx0fSlcblx0XHRzdG9yZS5nZXRBbGwgPSBmdW5jdGlvbihzdG9yYWdlKSB7XG5cdFx0XHR2YXIgcmV0ID0ge31cblx0XHRcdHN0b3JlLmZvckVhY2goZnVuY3Rpb24oa2V5LCB2YWwpIHtcblx0XHRcdFx0cmV0W2tleV0gPSB2YWxcblx0XHRcdH0pXG5cdFx0XHRyZXR1cm4gcmV0XG5cdFx0fVxuXHRcdHN0b3JlLmZvckVhY2ggPSB3aXRoSUVTdG9yYWdlKGZ1bmN0aW9uKHN0b3JhZ2UsIGNhbGxiYWNrKSB7XG5cdFx0XHR2YXIgYXR0cmlidXRlcyA9IHN0b3JhZ2UuWE1MRG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmF0dHJpYnV0ZXNcblx0XHRcdGZvciAodmFyIGk9MCwgYXR0cjsgYXR0cj1hdHRyaWJ1dGVzW2ldOyArK2kpIHtcblx0XHRcdFx0Y2FsbGJhY2soYXR0ci5uYW1lLCBzdG9yZS5kZXNlcmlhbGl6ZShzdG9yYWdlLmdldEF0dHJpYnV0ZShhdHRyLm5hbWUpKSlcblx0XHRcdH1cblx0XHR9KVxuXHR9XG5cblx0dHJ5IHtcblx0XHR2YXIgdGVzdEtleSA9ICdfX3N0b3JlanNfXydcblx0XHRzdG9yZS5zZXQodGVzdEtleSwgdGVzdEtleSlcblx0XHRpZiAoc3RvcmUuZ2V0KHRlc3RLZXkpICE9IHRlc3RLZXkpIHsgc3RvcmUuZGlzYWJsZWQgPSB0cnVlIH1cblx0XHRzdG9yZS5yZW1vdmUodGVzdEtleSlcblx0fSBjYXRjaChlKSB7XG5cdFx0c3RvcmUuZGlzYWJsZWQgPSB0cnVlXG5cdH1cblx0c3RvcmUuZW5hYmxlZCA9ICFzdG9yZS5kaXNhYmxlZFxuXG5cdGlmICh0eXBlb2YgbW9kdWxlICE9ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzICYmIHRoaXMubW9kdWxlICE9PSBtb2R1bGUpIHsgbW9kdWxlLmV4cG9ydHMgPSBzdG9yZSB9XG5cdGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkgeyBkZWZpbmUoc3RvcmUpIH1cblx0ZWxzZSB7IHdpbi5zdG9yZSA9IHN0b3JlIH1cblxufSkoRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKSk7XG4iLCJtb2R1bGUuZXhwb3J0cz17XG4gIFwibmFtZVwiOiBcInlhc2d1aS11dGlsc1wiLFxuICBcInZlcnNpb25cIjogXCIxLjMuMVwiLFxuICBcImRlc2NyaXB0aW9uXCI6IFwiVXRpbHMgZm9yIFlBU0dVSSBsaWJzXCIsXG4gIFwibWFpblwiOiBcInNyYy9tYWluLmpzXCIsXG4gIFwicmVwb3NpdG9yeVwiOiB7XG4gICAgXCJ0eXBlXCI6IFwiZ2l0XCIsXG4gICAgXCJ1cmxcIjogXCJnaXQ6Ly9naXRodWIuY29tL1lBU0dVSS9VdGlscy5naXRcIlxuICB9LFxuICBcImxpY2Vuc2VzXCI6IFtcbiAgICB7XG4gICAgICBcInR5cGVcIjogXCJNSVRcIixcbiAgICAgIFwidXJsXCI6IFwiaHR0cDovL3lhc2d1aS5naXRodWIuaW8vbGljZW5zZS50eHRcIlxuICAgIH1cbiAgXSxcbiAgXCJhdXRob3JcIjoge1xuICAgIFwibmFtZVwiOiBcIkxhdXJlbnMgUmlldHZlbGRcIlxuICB9LFxuICBcIm1haW50YWluZXJzXCI6IFtcbiAgICB7XG4gICAgICBcIm5hbWVcIjogXCJMYXVyZW5zIFJpZXR2ZWxkXCIsXG4gICAgICBcImVtYWlsXCI6IFwibGF1cmVucy5yaWV0dmVsZEBnbWFpbC5jb21cIixcbiAgICAgIFwidXJsXCI6IFwiaHR0cDovL2xhdXJlbnNyaWV0dmVsZC5ubFwiXG4gICAgfVxuICBdLFxuICBcImJ1Z3NcIjoge1xuICAgIFwidXJsXCI6IFwiaHR0cHM6Ly9naXRodWIuY29tL1lBU0dVSS9VdGlscy9pc3N1ZXNcIlxuICB9LFxuICBcImhvbWVwYWdlXCI6IFwiaHR0cHM6Ly9naXRodWIuY29tL1lBU0dVSS9VdGlsc1wiLFxuICBcImRlcGVuZGVuY2llc1wiOiB7XG4gICAgXCJzdG9yZVwiOiBcIl4xLjMuMTRcIlxuICB9LFxuICBcInJlYWRtZVwiOiBcIkEgc2ltcGxlIHV0aWxzIHJlcG8gZm9yIHRoZSBZQVNHVUkgdG9vbHNcXG5cIixcbiAgXCJyZWFkbWVGaWxlbmFtZVwiOiBcIlJFQURNRS5tZFwiLFxuICBcIl9pZFwiOiBcInlhc2d1aS11dGlsc0AxLjMuMVwiLFxuICBcImRpc3RcIjoge1xuICAgIFwic2hhc3VtXCI6IFwiMzc3NzZlY2Q0ZjI1ZWI3MDliMzc5NTJhZDA2NzVjNmQwZmFlYTQwOFwiXG4gIH0sXG4gIFwiX2Zyb21cIjogXCJ5YXNndWktdXRpbHNAMS4zLjFcIixcbiAgXCJfcmVzb2x2ZWRcIjogXCJodHRwczovL3JlZ2lzdHJ5Lm5wbWpzLm9yZy95YXNndWktdXRpbHMvLS95YXNndWktdXRpbHMtMS4zLjEudGd6XCJcbn1cbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qKlxuICogRGV0ZXJtaW5lIHVuaXF1ZSBJRCBvZiB0aGUgWUFTUUUgb2JqZWN0LiBVc2VmdWwgd2hlbiBzZXZlcmFsIG9iamVjdHMgYXJlXG4gKiBsb2FkZWQgb24gdGhlIHNhbWUgcGFnZSwgYW5kIGFsbCBoYXZlICdwZXJzaXN0ZW5jeScgZW5hYmxlZC4gQ3VycmVudGx5LCB0aGVcbiAqIElEIGlzIGRldGVybWluZWQgYnkgc2VsZWN0aW5nIHRoZSBuZWFyZXN0IHBhcmVudCBpbiB0aGUgRE9NIHdpdGggYW4gSUQgc2V0XG4gKiBcbiAqIEBwYXJhbSBkb2Mge1lBU1FFfVxuICogQG1ldGhvZCBZQVNRRS5kZXRlcm1pbmVJZFxuICovXG52YXIgcm9vdCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZWxlbWVudCkge1xuXHRyZXR1cm4gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cualF1ZXJ5IDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5qUXVlcnkgOiBudWxsKShlbGVtZW50KS5jbG9zZXN0KCdbaWRdJykuYXR0cignaWQnKTtcbn07XG59KS5jYWxsKHRoaXMsdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJ2YXIgcm9vdCA9IG1vZHVsZS5leHBvcnRzID0ge1xuXHRjcm9zczogJzxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHhtbG5zOnhsaW5rPVwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiIHZlcnNpb249XCIxLjFcIiB4PVwiMHB4XCIgeT1cIjBweFwiIHdpZHRoPVwiMzBweFwiIGhlaWdodD1cIjMwcHhcIiB2aWV3Qm94PVwiMCAwIDEwMCAxMDBcIiBlbmFibGUtYmFja2dyb3VuZD1cIm5ldyAwIDAgMTAwIDEwMFwiIHhtbDpzcGFjZT1cInByZXNlcnZlXCI+PGc+XHQ8cGF0aCBkPVwiTTgzLjI4OCw4OC4xM2MtMi4xMTQsMi4xMTItNS41NzUsMi4xMTItNy42ODksMEw1My42NTksNjYuMTg4Yy0yLjExNC0yLjExMi01LjU3My0yLjExMi03LjY4NywwTDI0LjI1MSw4Ny45MDcgICBjLTIuMTEzLDIuMTE0LTUuNTcxLDIuMTE0LTcuNjg2LDBsLTQuNjkzLTQuNjkxYy0yLjExNC0yLjExNC0yLjExNC01LjU3MywwLTcuNjg4bDIxLjcxOS0yMS43MjFjMi4xMTMtMi4xMTQsMi4xMTMtNS41NzMsMC03LjY4NiAgIEwxMS44NzIsMjQuNGMtMi4xMTQtMi4xMTMtMi4xMTQtNS41NzEsMC03LjY4Nmw0Ljg0Mi00Ljg0MmMyLjExMy0yLjExNCw1LjU3MS0yLjExNCw3LjY4NiwwTDQ2LjEyLDMzLjU5MSAgIGMyLjExNCwyLjExNCw1LjU3MiwyLjExNCw3LjY4OCwwbDIxLjcyMS0yMS43MTljMi4xMTQtMi4xMTQsNS41NzMtMi4xMTQsNy42ODcsMGw0LjY5NSw0LjY5NWMyLjExMSwyLjExMywyLjExMSw1LjU3MS0wLjAwMyw3LjY4NiAgIEw2Ni4xODgsNDUuOTczYy0yLjExMiwyLjExNC0yLjExMiw1LjU3MywwLDcuNjg2TDg4LjEzLDc1LjYwMmMyLjExMiwyLjExMSwyLjExMiw1LjU3MiwwLDcuNjg3TDgzLjI4OCw4OC4xM3pcIi8+PC9nPjwvc3ZnPicsXG5cdGNoZWNrOiAnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgeG1sbnM6eGxpbms9XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIgdmVyc2lvbj1cIjEuMVwiIHg9XCIwcHhcIiB5PVwiMHB4XCIgd2lkdGg9XCIzMHB4XCIgaGVpZ2h0PVwiMzBweFwiIHZpZXdCb3g9XCIwIDAgMTAwIDEwMFwiIGVuYWJsZS1iYWNrZ3JvdW5kPVwibmV3IDAgMCAxMDAgMTAwXCIgeG1sOnNwYWNlPVwicHJlc2VydmVcIj48cGF0aCBmaWxsPVwiIzAwMDAwMFwiIGQ9XCJNMTQuMzAxLDQ5Ljk4MmwyMi42MDYsMTcuMDQ3TDg0LjM2MSw0LjkwM2MyLjYxNC0zLjczMyw3Ljc2LTQuNjQsMTEuNDkzLTIuMDI2bDAuNjI3LDAuNDYyICBjMy43MzIsMi42MTQsNC42NCw3Ljc1OCwyLjAyNSwxMS40OTJsLTUxLjc4Myw3OS43N2MtMS45NTUsMi43OTEtMy44OTYsMy43NjItNy4zMDEsMy45ODhjLTMuNDA1LDAuMjI1LTUuNDY0LTEuMDM5LTcuNTA4LTMuMDg0ICBMMi40NDcsNjEuODE0Yy0zLjI2My0zLjI2Mi0zLjI2My04LjU1MywwLTExLjgxNGwwLjA0MS0wLjAxOUM1Ljc1LDQ2LjcxOCwxMS4wMzksNDYuNzE4LDE0LjMwMSw0OS45ODJ6XCIvPjwvc3ZnPicsXG5cdHVuc29ydGVkOiAnPHN2ZyAgIHhtbG5zOmRjPVwiaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS9cIiAgIHhtbG5zOmNjPVwiaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvbnMjXCIgICB4bWxuczpyZGY9XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjXCIgICB4bWxuczpzdmc9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiICAgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiICAgeG1sbnM6c29kaXBvZGk9XCJodHRwOi8vc29kaXBvZGkuc291cmNlZm9yZ2UubmV0L0RURC9zb2RpcG9kaS0wLmR0ZFwiICAgeG1sbnM6aW5rc2NhcGU9XCJodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy9uYW1lc3BhY2VzL2lua3NjYXBlXCIgICB2ZXJzaW9uPVwiMS4xXCIgICBpZD1cIkxheWVyXzFcIiAgIHg9XCIwcHhcIiAgIHk9XCIwcHhcIiAgIHdpZHRoPVwiMTAwJVwiICAgaGVpZ2h0PVwiMTAwJVwiICAgdmlld0JveD1cIjAgMCA1NC41NTI3MTEgMTEzLjc4NDc4XCIgICBlbmFibGUtYmFja2dyb3VuZD1cIm5ldyAwIDAgMTAwIDEwMFwiICAgeG1sOnNwYWNlPVwicHJlc2VydmVcIj48ZyAgICAgaWQ9XCJnNVwiICAgICB0cmFuc2Zvcm09XCJtYXRyaXgoLTAuNzA1MjIxNTYsLTAuNzA4OTg2OTksLTAuNzA4OTg2OTksMC43MDUyMjE1Niw5Ny45ODgxOTksNTUuMDgxMjA1KVwiPjxwYXRoICAgICAgIHN0eWxlPVwiZmlsbDojMDAwMDAwXCIgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT1cIjBcIiAgICAgICBpZD1cInBhdGg3XCIgICAgICAgZD1cIk0gNTcuOTExLDY2LjkxNSA0NS44MDgsNTUuMDYzIDQyLjkwNCw1Mi4yMzggMzEuNjYxLDQxLjI1IDMxLjQzNSw0MS4wODMgMzEuMTMxLDQwLjc3NSAzMC43OTQsNDAuNTIzIDMwLjQ4Niw0MC4zIDMwLjA2OSw0MC4wNSAyOS44MTUsMzkuOTExIDI5LjI4NSwzOS42NTkgMjkuMDg5LDM5LjU3NiAyOC40NzQsMzkuMzI2IDI4LjM2MywzOS4yOTcgSCAyOC4zMzYgTCAyNy42NjUsMzkuMTI4IDI3LjUyNiwzOS4xIDI2Ljk0LDM4Ljk5IDI2LjcxNCwzOC45NjEgMjYuMjEyLDM4LjkzNCBoIC0wLjMxIC0wLjQ0NCBsIC0wLjMzOSwwLjAyNyBjIC0xLjQ1LDAuMTM5IC0yLjg3NiwwLjY3MSAtNC4xMSwxLjU2NCBsIC0wLjIyMywwLjE0MSAtMC4yNzksMC4yNSAtMC4zMzUsMC4zMDggLTAuMDU0LDAuMDI5IC0wLjE3MSwwLjE5NCAtMC4zMzQsMC4zNjQgLTAuMjI0LDAuMjc5IC0wLjI1LDAuMzM2IC0wLjIyNSwwLjM2MiAtMC4xOTIsMC4zMDggLTAuMTk3LDAuNDIxIC0wLjE0MiwwLjI3OSAtMC4xOTMsMC40NzcgLTAuMDg0LDAuMjIyIC0xMi40NDEsMzguNDE0IGMgLTAuODE0LDIuNDU4IC0wLjMxMyw1LjAyOSAxLjExNSw2Ljk4OCB2IDAuMDI2IGwgMC40MTgsMC41MzIgMC4xNywwLjE2NSAwLjI1MSwwLjI4MSAwLjA4NCwwLjA3OSAwLjI4MywwLjI4MSAwLjI1LDAuMTk0IDAuNDc0LDAuMzY3IDAuMDgzLDAuMDUzIGMgMi4wMTUsMS4zNzEgNC42NDEsMS44NzQgNy4xMzEsMS4wOTQgTCA1NS4yMjgsODAuNzc2IGMgNC4zMDMsLTEuMzQyIDYuNjc5LC01LjgxNCA1LjMwOCwtMTAuMDA2IC0wLjM4NywtMS4yNTkgLTEuMDg2LC0yLjM1IC0xLjk3OSwtMy4yMTUgbCAtMC4zNjgsLTAuMzM3IC0wLjI3OCwtMC4zMDMgeiBtIC02LjMxOCw1Ljg5NiAwLjA3OSwwLjExNCAtMzcuMzY5LDExLjU3IDExLjg1NCwtMzYuNTM4IDEwLjU2NSwxMC4zMTcgMi44NzYsMi44MjUgMTEuOTk1LDExLjcxMiB6XCIgLz48L2c+PHBhdGggICAgIHN0eWxlPVwiZmlsbDojMDAwMDAwXCIgICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9XCIwXCIgICAgIGlkPVwicGF0aDctOVwiICAgICBkPVwibSA4Ljg3NDgzMzksNTIuNTcxNzY2IDE2LjkzODIxMTEsLTAuMjIyNTg0IDQuMDUwODUxLC0wLjA2NjY1IDE1LjcxOTE1NCwtMC4yMjIxNjYgMC4yNzc3OCwtMC4wNDI0NiAwLjQzMjc2LDAuMDAxNyAwLjQxNjMyLC0wLjA2MTIxIDAuMzc1MzIsLTAuMDYxMSAwLjQ3MTMyLC0wLjExOTM0MiAwLjI3NzY3LC0wLjA4MjA2IDAuNTUyNDQsLTAuMTk4MDQ3IDAuMTk3MDcsLTAuMDgwNDMgMC42MTA5NSwtMC4yNTk3MjEgMC4wOTg4LC0wLjA1ODI1IDAuMDE5LC0wLjAxOTE0IDAuNTkzMDMsLTAuMzU2NTQ4IDAuMTE3ODcsLTAuMDc4OCAwLjQ5MTI1LC0wLjMzNzg5MiAwLjE3OTk0LC0wLjEzOTc3OSAwLjM3MzE3LC0wLjMzNjg3MSAwLjIxODYyLC0wLjIxOTc4NiAwLjMxMzExLC0wLjMxNDc5IDAuMjE5OTMsLTAuMjU5Mzg3IGMgMC45MjQwMiwtMS4xMjYwNTcgMS41NTI0OSwtMi41MTIyNTEgMS43ODk2MSwtNC4wMTY5MDQgbCAwLjA1NzMsLTAuMjU3NTQgMC4wMTk1LC0wLjM3NDExMyAwLjAxNzksLTAuNDU0NzE5IDAuMDE3NSwtMC4wNTg3NCAtMC4wMTY5LC0wLjI1ODA0OSAtMC4wMjI1LC0wLjQ5MzUwMyAtMC4wMzk4LC0wLjM1NTU2OSAtMC4wNjE5LC0wLjQxNDIwMSAtMC4wOTgsLTAuNDE0ODEyIC0wLjA4MywtMC4zNTMzMzQgTCA1My4yMzk1NSw0MS4xNDg0IDUzLjE0MTg1LDQwLjg1MDk2NyA1Mi45Mzk3Nyw0MC4zNzc3NDIgNTIuODQxNTcsNDAuMTYxNjI4IDM0LjM4MDIxLDQuMjUwNzM3NSBDIDMzLjIxMTU2NywxLjk0MDE4NzUgMzEuMDM1NDQ2LDAuNDgyMjY1NTIgMjguNjM5NDg0LDAuMTEzMTY5NTIgbCAtMC4wMTg0MywtMC4wMTgzNCAtMC42NzE5NjMsLTAuMDc4ODIgLTAuMjM2ODcxLDAuMDA0MiBMIDI3LjMzNTk4NCwtNC43ODI2NTc3ZS03IDI3LjIyMDczNiwwLjAwMzc5OTUyIGwgLTAuMzk4ODA0LDAuMDAyNSAtMC4zMTM4NDgsMC4wNDA0MyAtMC41OTQ0NzQsMC4wNzcyNCAtMC4wOTYxMSwwLjAyMTQ3IEMgMjMuNDI0NTQ5LDAuNjA3MTYyNTIgMjEuMjE2MDE3LDIuMTE0MjM1NSAyMC4wMTMwMjUsNC40Mjk2ODY1IEwgMC45Mzk2NzQ5MSw0MC44OTQ0NzkgYyAtMi4wODMxMDgwMSwzLjk5NzE3OCAtMC41ODgxMjUsOC44MzU0ODIgMy4zNTA4MDc5OSwxMC44MTk3NDkgMS4xNjU1MzUsMC42MTM0OTUgMi40MzE5OSwwLjg4NzMxIDMuNjc1MDI2LDAuODY0MjAyIGwgMC40OTg0NSwtMC4wMjMyNSAwLjQxMDg3NSwwLjAxNjU4IHogTSA5LjE1MDIzNjksNDMuOTM0NDAxIDkuMDEzNjk5OSw0My45MTAwMTEgMjcuMTY0MTQ1LDkuMjU2NDYyNSA0NC43MDk0Miw0My40MjgxOCBsIC0xNC43NjUyODksMC4yMTQ2NzcgLTQuMDMxMTA2LDAuMDQ2OCAtMTYuNzYyNzg4MSwwLjI0NDc0NCB6XCIgLz48L3N2Zz4nLFxuXHRzb3J0RGVzYzogJzxzdmcgICB4bWxuczpkYz1cImh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvXCIgICB4bWxuczpjYz1cImh0dHA6Ly9jcmVhdGl2ZWNvbW1vbnMub3JnL25zI1wiICAgeG1sbnM6cmRmPVwiaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zI1wiICAgeG1sbnM6c3ZnPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiAgIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiAgIHhtbG5zOnNvZGlwb2RpPVwiaHR0cDovL3NvZGlwb2RpLnNvdXJjZWZvcmdlLm5ldC9EVEQvc29kaXBvZGktMC5kdGRcIiAgIHhtbG5zOmlua3NjYXBlPVwiaHR0cDovL3d3dy5pbmtzY2FwZS5vcmcvbmFtZXNwYWNlcy9pbmtzY2FwZVwiICAgdmVyc2lvbj1cIjEuMVwiICAgaWQ9XCJMYXllcl8xXCIgICB4PVwiMHB4XCIgICB5PVwiMHB4XCIgICB3aWR0aD1cIjEwMCVcIiAgIGhlaWdodD1cIjEwMCVcIiAgIHZpZXdCb3g9XCIwIDAgNTQuNTUyNzExIDExMy43ODQ3OFwiICAgZW5hYmxlLWJhY2tncm91bmQ9XCJuZXcgMCAwIDEwMCAxMDBcIiAgIHhtbDpzcGFjZT1cInByZXNlcnZlXCI+PGcgICAgIGlkPVwiZzVcIiAgICAgdHJhbnNmb3JtPVwibWF0cml4KC0wLjcwNTIyMTU2LC0wLjcwODk4Njk5LC0wLjcwODk4Njk5LDAuNzA1MjIxNTYsOTcuOTg4MTk5LDU1LjA4MTIwNSlcIj48cGF0aCAgICAgICBzdHlsZT1cImZpbGw6IzAwMDAwMFwiICAgICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9XCIwXCIgICAgICAgaWQ9XCJwYXRoN1wiICAgICAgIGQ9XCJNIDU3LjkxMSw2Ni45MTUgNDUuODA4LDU1LjA2MyA0Mi45MDQsNTIuMjM4IDMxLjY2MSw0MS4yNSAzMS40MzUsNDEuMDgzIDMxLjEzMSw0MC43NzUgMzAuNzk0LDQwLjUyMyAzMC40ODYsNDAuMyAzMC4wNjksNDAuMDUgMjkuODE1LDM5LjkxMSAyOS4yODUsMzkuNjU5IDI5LjA4OSwzOS41NzYgMjguNDc0LDM5LjMyNiAyOC4zNjMsMzkuMjk3IEggMjguMzM2IEwgMjcuNjY1LDM5LjEyOCAyNy41MjYsMzkuMSAyNi45NCwzOC45OSAyNi43MTQsMzguOTYxIDI2LjIxMiwzOC45MzQgaCAtMC4zMSAtMC40NDQgbCAtMC4zMzksMC4wMjcgYyAtMS40NSwwLjEzOSAtMi44NzYsMC42NzEgLTQuMTEsMS41NjQgbCAtMC4yMjMsMC4xNDEgLTAuMjc5LDAuMjUgLTAuMzM1LDAuMzA4IC0wLjA1NCwwLjAyOSAtMC4xNzEsMC4xOTQgLTAuMzM0LDAuMzY0IC0wLjIyNCwwLjI3OSAtMC4yNSwwLjMzNiAtMC4yMjUsMC4zNjIgLTAuMTkyLDAuMzA4IC0wLjE5NywwLjQyMSAtMC4xNDIsMC4yNzkgLTAuMTkzLDAuNDc3IC0wLjA4NCwwLjIyMiAtMTIuNDQxLDM4LjQxNCBjIC0wLjgxNCwyLjQ1OCAtMC4zMTMsNS4wMjkgMS4xMTUsNi45ODggdiAwLjAyNiBsIDAuNDE4LDAuNTMyIDAuMTcsMC4xNjUgMC4yNTEsMC4yODEgMC4wODQsMC4wNzkgMC4yODMsMC4yODEgMC4yNSwwLjE5NCAwLjQ3NCwwLjM2NyAwLjA4MywwLjA1MyBjIDIuMDE1LDEuMzcxIDQuNjQxLDEuODc0IDcuMTMxLDEuMDk0IEwgNTUuMjI4LDgwLjc3NiBjIDQuMzAzLC0xLjM0MiA2LjY3OSwtNS44MTQgNS4zMDgsLTEwLjAwNiAtMC4zODcsLTEuMjU5IC0xLjA4NiwtMi4zNSAtMS45NzksLTMuMjE1IGwgLTAuMzY4LC0wLjMzNyAtMC4yNzgsLTAuMzAzIHogbSAtNi4zMTgsNS44OTYgMC4wNzksMC4xMTQgLTM3LjM2OSwxMS41NyAxMS44NTQsLTM2LjUzOCAxMC41NjUsMTAuMzE3IDIuODc2LDIuODI1IDExLjk5NSwxMS43MTIgelwiIC8+PC9nPjxwYXRoICAgICBzdHlsZT1cImZpbGw6IzAwMDAwMFwiICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPVwiMFwiICAgICBpZD1cInBhdGg5XCIgICAgIGQ9XCJtIDI3LjgxMzI3MywwLjEyODIzNTA2IDAuMDk3NTMsMC4wMjAwNiBjIDIuMzkwOTMsMC40NTgyMDkgNC41OTk0NTUsMS45NjgxMTEwNCA1LjgwMjQ0LDQuMjg2MzkwMDQgTCA1Mi43ODU4OTcsNDAuODk0NTI1IGMgMi4wODgwNDQsNC4wMDIxMzkgMC41OTA5NDksOC44MzY5MDIgLTMuMzQ4NjkyLDEwLjgyMTg3NSAtMS4zMjkwNzgsMC42ODg3MjEgLTIuNzY2NjAzLDAuOTQzNjk1IC00LjEzMzE3NCwwLjg0MTc2OCBsIC0wLjQ1NDAxOCwwLjAyIEwgMjcuOTEwMzkyLDUyLjM1NDE3MSAyMy44NTUzMTMsNTIuMjgxODUxIDguMTQzOTMsNTIuMDYxODI3IDcuODYyNjA4LDUyLjAyMTQ3NyA3LjQyOTg1Niw1Mi4wMjE3MzggNy4wMTQyNDEsNTEuOTU5ODE4IDYuNjM4MjE2LDUxLjkwMDgzOCA2LjE2NDc3Niw1MS43NzkzNjkgNS44ODkyMTYsNTEuNjk5NDM5IDUuMzM4OTA3LDUxLjUwMDY5MSA1LjEzOTcxOSw1MS40MTk1NTEgNC41NDUwNjQsNTEuMTQ1MDIzIDQuNDMwNjE4LDUxLjEwNTEyMyA0LjQxMDE2OCw1MS4wODQ1NjMgMy44MTcxMzgsNTAuNzMwODQzIDMuNjkzNjE1LDUwLjY0Nzc4MyAzLjIwNzMxNCw1MC4zMTA2MTEgMy4wMjgwNzEsNTAuMTc0MzY5IDIuNjUyNzk1LDQ5LjgzMzk1NyAyLjQzMzQ3MSw0OS42MTM0NjIgMi4xNDAwOTksNDkuMzE4NTIzIDEuOTAxMTI3LDQ5LjA0MTQwNyBDIDAuOTc3ODEsNDcuOTE2MDU5IDAuMzQ3OTM1LDQ2LjUyODQ0OCAwLjExMTUzLDQ1LjAyMTY3NiBMIDAuMDUzNTIsNDQuNzY2MjU1IDAuMDUxNzIsNDQuMzcxNjgzIDAuMDE4OTQsNDMuOTM2MDE3IDAsNDMuODc3Mjc3IDAuMDE4MzYsNDMuNjIyMDYgMC4wMzY2Niw0My4xMjI4ODkgMC4wNzY1LDQyLjc2NTkwNSAwLjEzOTEyLDQyLjM1MjQxMyAwLjIzNTY4LDQxLjk0MDQyNSAwLjMyMjg4LDQxLjU4ODUxNyAwLjQ4MTAyMSw0MS4xNTE5NDUgMC41NzkzOTEsNDAuODUzODA2IDAuNzczNjksNDAuMzgxMjY4IDAuODc2MDk3LDQwLjE2MjMzNiAxOS4zMzg4NjksNC4yNTQyODAxIGMgMS4xNzIxNjksLTIuMzA4NDE5IDMuMzQ3NTksLTMuNzY4NDY1MDQgNS43NDA4MjksLTQuMTc3MTY2MDQgbCAwLjAxOTc1LDAuMDE5ODUgMC42OTYwNSwtMC4wOTU3MyAwLjIxODQzNywwLjAyMjUgMC40OTA3OTEsLTAuMDIxMzIgMC4zOTgwOSwwLjAwNDYgMC4zMTU5NzIsMC4wMzk3MyAwLjU5NDQ2MiwwLjA4MTQ5IHpcIiAvPjwvc3ZnPicsXG5cdHNvcnRBc2M6ICc8c3ZnICAgeG1sbnM6ZGM9XCJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xL1wiICAgeG1sbnM6Y2M9XCJodHRwOi8vY3JlYXRpdmVjb21tb25zLm9yZy9ucyNcIiAgIHhtbG5zOnJkZj1cImh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyNcIiAgIHhtbG5zOnN2Zz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgICB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgICB4bWxuczpzb2RpcG9kaT1cImh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkXCIgICB4bWxuczppbmtzY2FwZT1cImh0dHA6Ly93d3cuaW5rc2NhcGUub3JnL25hbWVzcGFjZXMvaW5rc2NhcGVcIiAgIHZlcnNpb249XCIxLjFcIiAgIGlkPVwiTGF5ZXJfMVwiICAgeD1cIjBweFwiICAgeT1cIjBweFwiICAgd2lkdGg9XCIxMDAlXCIgICBoZWlnaHQ9XCIxMDAlXCIgICB2aWV3Qm94PVwiMCAwIDU0LjU1MjcxMSAxMTMuNzg0NzhcIiAgIGVuYWJsZS1iYWNrZ3JvdW5kPVwibmV3IDAgMCAxMDAgMTAwXCIgICB4bWw6c3BhY2U9XCJwcmVzZXJ2ZVwiPjxnICAgICBpZD1cImc1XCIgICAgIHRyYW5zZm9ybT1cIm1hdHJpeCgtMC43MDUyMjE1NiwwLjcwODk4Njk5LC0wLjcwODk4Njk5LC0wLjcwNTIyMTU2LDk3Ljk4ODE5OSw1OC43MDQ4MDcpXCI+PHBhdGggICAgICAgc3R5bGU9XCJmaWxsOiMwMDAwMDBcIiAgICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPVwiMFwiICAgICAgIGlkPVwicGF0aDdcIiAgICAgICBkPVwiTSA1Ny45MTEsNjYuOTE1IDQ1LjgwOCw1NS4wNjMgNDIuOTA0LDUyLjIzOCAzMS42NjEsNDEuMjUgMzEuNDM1LDQxLjA4MyAzMS4xMzEsNDAuNzc1IDMwLjc5NCw0MC41MjMgMzAuNDg2LDQwLjMgMzAuMDY5LDQwLjA1IDI5LjgxNSwzOS45MTEgMjkuMjg1LDM5LjY1OSAyOS4wODksMzkuNTc2IDI4LjQ3NCwzOS4zMjYgMjguMzYzLDM5LjI5NyBIIDI4LjMzNiBMIDI3LjY2NSwzOS4xMjggMjcuNTI2LDM5LjEgMjYuOTQsMzguOTkgMjYuNzE0LDM4Ljk2MSAyNi4yMTIsMzguOTM0IGggLTAuMzEgLTAuNDQ0IGwgLTAuMzM5LDAuMDI3IGMgLTEuNDUsMC4xMzkgLTIuODc2LDAuNjcxIC00LjExLDEuNTY0IGwgLTAuMjIzLDAuMTQxIC0wLjI3OSwwLjI1IC0wLjMzNSwwLjMwOCAtMC4wNTQsMC4wMjkgLTAuMTcxLDAuMTk0IC0wLjMzNCwwLjM2NCAtMC4yMjQsMC4yNzkgLTAuMjUsMC4zMzYgLTAuMjI1LDAuMzYyIC0wLjE5MiwwLjMwOCAtMC4xOTcsMC40MjEgLTAuMTQyLDAuMjc5IC0wLjE5MywwLjQ3NyAtMC4wODQsMC4yMjIgLTEyLjQ0MSwzOC40MTQgYyAtMC44MTQsMi40NTggLTAuMzEzLDUuMDI5IDEuMTE1LDYuOTg4IHYgMC4wMjYgbCAwLjQxOCwwLjUzMiAwLjE3LDAuMTY1IDAuMjUxLDAuMjgxIDAuMDg0LDAuMDc5IDAuMjgzLDAuMjgxIDAuMjUsMC4xOTQgMC40NzQsMC4zNjcgMC4wODMsMC4wNTMgYyAyLjAxNSwxLjM3MSA0LjY0MSwxLjg3NCA3LjEzMSwxLjA5NCBMIDU1LjIyOCw4MC43NzYgYyA0LjMwMywtMS4zNDIgNi42NzksLTUuODE0IDUuMzA4LC0xMC4wMDYgLTAuMzg3LC0xLjI1OSAtMS4wODYsLTIuMzUgLTEuOTc5LC0zLjIxNSBsIC0wLjM2OCwtMC4zMzcgLTAuMjc4LC0wLjMwMyB6IG0gLTYuMzE4LDUuODk2IDAuMDc5LDAuMTE0IC0zNy4zNjksMTEuNTcgMTEuODU0LC0zNi41MzggMTAuNTY1LDEwLjMxNyAyLjg3NiwyLjgyNSAxMS45OTUsMTEuNzEyIHpcIiAvPjwvZz48cGF0aCAgICAgc3R5bGU9XCJmaWxsOiMwMDAwMDBcIiAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT1cIjBcIiAgICAgaWQ9XCJwYXRoOVwiICAgICBkPVwibSAyNy44MTMyNzMsMTEzLjY1Nzc4IDAuMDk3NTMsLTAuMDIwMSBjIDIuMzkwOTMsLTAuNDU4MjEgNC41OTk0NTUsLTEuOTY4MTEgNS44MDI0NCwtNC4yODYzOSBMIDUyLjc4NTg5Nyw3Mi44OTE0ODcgYyAyLjA4ODA0NCwtNC4wMDIxMzkgMC41OTA5NDksLTguODM2OTAyIC0zLjM0ODY5MiwtMTAuODIxODc1IC0xLjMyOTA3OCwtMC42ODg3MjEgLTIuNzY2NjAzLC0wLjk0MzY5NSAtNC4xMzMxNzQsLTAuODQxNzY4IGwgLTAuNDU0MDE4LC0wLjAyIC0xNi45Mzk2MjEsMC4yMjM5OTcgLTQuMDU1MDc5LDAuMDcyMzIgLTE1LjcxMTM4MywwLjIyMDAyNCAtMC4yODEzMjIsMC4wNDAzNSAtMC40MzI3NTIsLTIuNjFlLTQgLTAuNDE1NjE1LDAuMDYxOTIgLTAuMzc2MDI1LDAuMDU4OTggLTAuNDczNDQsMC4xMjE0NjkgLTAuMjc1NTYsMC4wNzk5MyAtMC41NTAzMDksMC4xOTg3NDggLTAuMTk5MTg4LDAuMDgxMTQgLTAuNTk0NjU1LDAuMjc0NTI4IC0wLjExNDQ0NiwwLjAzOTkgLTAuMDIwNDUsMC4wMjA1NiAtMC41OTMwMywwLjM1MzcyIC0wLjEyMzUyMywwLjA4MzA2IC0wLjQ4NjMwMSwwLjMzNzE3MiAtMC4xNzkyNDMsMC4xMzYyNDIgLTAuMzc1Mjc2LDAuMzQwNDEyIC0wLjIxOTMyNCwwLjIyMDQ5NSAtMC4yOTMzNzIsMC4yOTQ5MzkgLTAuMjM4OTcyLDAuMjc3MTE2IEMgMC45Nzc4MSw2NS44Njk5NTMgMC4zNDc5MzUsNjcuMjU3NTY0IDAuMTExNTMsNjguNzY0MzM2IEwgMC4wNTM1Miw2OS4wMTk3NTcgMC4wNTE3Miw2OS40MTQzMjkgMC4wMTg5NCw2OS44NDk5OTUgMCw2OS45MDg3MzUgbCAwLjAxODM2LDAuMjU1MjE3IDAuMDE4MywwLjQ5OTE3MSAwLjAzOTg0LDAuMzU2OTg0IDAuMDYyNjIsMC40MTM0OTIgMC4wOTY1NiwwLjQxMTk4OCAwLjA4NzIsMC4zNTE5MDggMC4xNTgxNDEsMC40MzY1NzIgMC4wOTgzNywwLjI5ODEzOSAwLjE5NDI5OSwwLjQ3MjUzOCAwLjEwMjQwNywwLjIxODkzMiAxOC40NjI3NzIsMzUuOTA4MDU0IGMgMS4xNzIxNjksMi4zMDg0MiAzLjM0NzU5LDMuNzY4NDcgNS43NDA4MjksNC4xNzcxNyBsIDAuMDE5NzUsLTAuMDE5OSAwLjY5NjA1LDAuMDk1NyAwLjIxODQzNywtMC4wMjI1IDAuNDkwNzkxLDAuMDIxMyAwLjM5ODA5LC0wLjAwNSAwLjMxNTk3MiwtMC4wMzk3IDAuNTk0NDYyLC0wLjA4MTUgelwiIC8+PC9zdmc+Jyxcblx0bG9hZGVyOiAnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgdmlld0JveD1cIjAgMCAzMiAzMlwiIHdpZHRoPVwiMTAwJVwiIGhlaWdodD1cIjEwMCVcIiBmaWxsPVwiYmxhY2tcIj4gIDxjaXJjbGUgY3g9XCIxNlwiIGN5PVwiM1wiIHI9XCIwXCI+ICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XCJyXCIgdmFsdWVzPVwiMDszOzA7MFwiIGR1cj1cIjFzXCIgcmVwZWF0Q291bnQ9XCJpbmRlZmluaXRlXCIgYmVnaW49XCIwXCIga2V5U3BsaW5lcz1cIjAuMiAwLjIgMC40IDAuODswLjIgMC4yIDAuNCAwLjg7MC4yIDAuMiAwLjQgMC44XCIgY2FsY01vZGU9XCJzcGxpbmVcIiAvPiAgPC9jaXJjbGU+ICA8Y2lyY2xlIHRyYW5zZm9ybT1cInJvdGF0ZSg0NSAxNiAxNilcIiBjeD1cIjE2XCIgY3k9XCIzXCIgcj1cIjBcIj4gICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cInJcIiB2YWx1ZXM9XCIwOzM7MDswXCIgZHVyPVwiMXNcIiByZXBlYXRDb3VudD1cImluZGVmaW5pdGVcIiBiZWdpbj1cIjAuMTI1c1wiIGtleVNwbGluZXM9XCIwLjIgMC4yIDAuNCAwLjg7MC4yIDAuMiAwLjQgMC44OzAuMiAwLjIgMC40IDAuOFwiIGNhbGNNb2RlPVwic3BsaW5lXCIgLz4gIDwvY2lyY2xlPiAgPGNpcmNsZSB0cmFuc2Zvcm09XCJyb3RhdGUoOTAgMTYgMTYpXCIgY3g9XCIxNlwiIGN5PVwiM1wiIHI9XCIwXCI+ICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XCJyXCIgdmFsdWVzPVwiMDszOzA7MFwiIGR1cj1cIjFzXCIgcmVwZWF0Q291bnQ9XCJpbmRlZmluaXRlXCIgYmVnaW49XCIwLjI1c1wiIGtleVNwbGluZXM9XCIwLjIgMC4yIDAuNCAwLjg7MC4yIDAuMiAwLjQgMC44OzAuMiAwLjIgMC40IDAuOFwiIGNhbGNNb2RlPVwic3BsaW5lXCIgLz4gIDwvY2lyY2xlPiAgPGNpcmNsZSB0cmFuc2Zvcm09XCJyb3RhdGUoMTM1IDE2IDE2KVwiIGN4PVwiMTZcIiBjeT1cIjNcIiByPVwiMFwiPiAgICA8YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPVwiclwiIHZhbHVlcz1cIjA7MzswOzBcIiBkdXI9XCIxc1wiIHJlcGVhdENvdW50PVwiaW5kZWZpbml0ZVwiIGJlZ2luPVwiMC4zNzVzXCIga2V5U3BsaW5lcz1cIjAuMiAwLjIgMC40IDAuODswLjIgMC4yIDAuNCAwLjg7MC4yIDAuMiAwLjQgMC44XCIgY2FsY01vZGU9XCJzcGxpbmVcIiAvPiAgPC9jaXJjbGU+ICA8Y2lyY2xlIHRyYW5zZm9ybT1cInJvdGF0ZSgxODAgMTYgMTYpXCIgY3g9XCIxNlwiIGN5PVwiM1wiIHI9XCIwXCI+ICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XCJyXCIgdmFsdWVzPVwiMDszOzA7MFwiIGR1cj1cIjFzXCIgcmVwZWF0Q291bnQ9XCJpbmRlZmluaXRlXCIgYmVnaW49XCIwLjVzXCIga2V5U3BsaW5lcz1cIjAuMiAwLjIgMC40IDAuODswLjIgMC4yIDAuNCAwLjg7MC4yIDAuMiAwLjQgMC44XCIgY2FsY01vZGU9XCJzcGxpbmVcIiAvPiAgPC9jaXJjbGU+ICA8Y2lyY2xlIHRyYW5zZm9ybT1cInJvdGF0ZSgyMjUgMTYgMTYpXCIgY3g9XCIxNlwiIGN5PVwiM1wiIHI9XCIwXCI+ICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XCJyXCIgdmFsdWVzPVwiMDszOzA7MFwiIGR1cj1cIjFzXCIgcmVwZWF0Q291bnQ9XCJpbmRlZmluaXRlXCIgYmVnaW49XCIwLjYyNXNcIiBrZXlTcGxpbmVzPVwiMC4yIDAuMiAwLjQgMC44OzAuMiAwLjIgMC40IDAuODswLjIgMC4yIDAuNCAwLjhcIiBjYWxjTW9kZT1cInNwbGluZVwiIC8+ICA8L2NpcmNsZT4gIDxjaXJjbGUgdHJhbnNmb3JtPVwicm90YXRlKDI3MCAxNiAxNilcIiBjeD1cIjE2XCIgY3k9XCIzXCIgcj1cIjBcIj4gICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cInJcIiB2YWx1ZXM9XCIwOzM7MDswXCIgZHVyPVwiMXNcIiByZXBlYXRDb3VudD1cImluZGVmaW5pdGVcIiBiZWdpbj1cIjAuNzVzXCIga2V5U3BsaW5lcz1cIjAuMiAwLjIgMC40IDAuODswLjIgMC4yIDAuNCAwLjg7MC4yIDAuMiAwLjQgMC44XCIgY2FsY01vZGU9XCJzcGxpbmVcIiAvPiAgPC9jaXJjbGU+ICA8Y2lyY2xlIHRyYW5zZm9ybT1cInJvdGF0ZSgzMTUgMTYgMTYpXCIgY3g9XCIxNlwiIGN5PVwiM1wiIHI9XCIwXCI+ICAgIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9XCJyXCIgdmFsdWVzPVwiMDszOzA7MFwiIGR1cj1cIjFzXCIgcmVwZWF0Q291bnQ9XCJpbmRlZmluaXRlXCIgYmVnaW49XCIwLjg3NXNcIiBrZXlTcGxpbmVzPVwiMC4yIDAuMiAwLjQgMC44OzAuMiAwLjIgMC40IDAuODswLjIgMC4yIDAuNCAwLjhcIiBjYWxjTW9kZT1cInNwbGluZVwiIC8+ICA8L2NpcmNsZT4gIDxjaXJjbGUgdHJhbnNmb3JtPVwicm90YXRlKDE4MCAxNiAxNilcIiBjeD1cIjE2XCIgY3k9XCIzXCIgcj1cIjBcIj4gICAgPGFuaW1hdGUgYXR0cmlidXRlTmFtZT1cInJcIiB2YWx1ZXM9XCIwOzM7MDswXCIgZHVyPVwiMXNcIiByZXBlYXRDb3VudD1cImluZGVmaW5pdGVcIiBiZWdpbj1cIjAuNXNcIiBrZXlTcGxpbmVzPVwiMC4yIDAuMiAwLjQgMC44OzAuMiAwLjIgMC40IDAuODswLjIgMC4yIDAuNCAwLjhcIiBjYWxjTW9kZT1cInNwbGluZVwiIC8+ICA8L2NpcmNsZT48L3N2Zz4nLFxuXHRxdWVyeTogJzxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHhtbG5zOnhsaW5rPVwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiIHZlcnNpb249XCIxLjFcIiB4PVwiMHB4XCIgeT1cIjBweFwiIHdpZHRoPVwiMTAwJVwiIGhlaWdodD1cIjEwMCVcIiB2aWV3Qm94PVwiMCAwIDgwIDgwXCIgZW5hYmxlLWJhY2tncm91bmQ9XCJuZXcgMCAwIDgwIDgwXCIgeG1sOnNwYWNlPVwicHJlc2VydmVcIj48ZyBpZD1cIkxheWVyXzFcIj48L2c+PGcgaWQ9XCJMYXllcl8yXCI+XHQ8cGF0aCBkPVwiTTY0LjYyMiwyLjQxMUgxNC45OTVjLTYuNjI3LDAtMTIsNS4zNzMtMTIsMTJ2NDkuODk3YzAsNi42MjcsNS4zNzMsMTIsMTIsMTJoNDkuNjI3YzYuNjI3LDAsMTItNS4zNzMsMTItMTJWMTQuNDExICAgQzc2LjYyMiw3Ljc4Myw3MS4yNDksMi40MTEsNjQuNjIyLDIuNDExeiBNMjQuMTI1LDYzLjkwNlYxNS4wOTNMNjEsMzkuMTY4TDI0LjEyNSw2My45MDZ6XCIvPjwvZz48L3N2Zz4nLFxuXHRxdWVyeUludmFsaWQ6ICc8c3ZnICAgeG1sbnM6ZGM9XCJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xL1wiICAgeG1sbnM6Y2M9XCJodHRwOi8vY3JlYXRpdmVjb21tb25zLm9yZy9ucyNcIiAgIHhtbG5zOnJkZj1cImh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyNcIiAgIHhtbG5zOnN2Zz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgICB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgICB4bWxuczpzb2RpcG9kaT1cImh0dHA6Ly9zb2RpcG9kaS5zb3VyY2Vmb3JnZS5uZXQvRFREL3NvZGlwb2RpLTAuZHRkXCIgICB4bWxuczppbmtzY2FwZT1cImh0dHA6Ly93d3cuaW5rc2NhcGUub3JnL25hbWVzcGFjZXMvaW5rc2NhcGVcIiAgIHZlcnNpb249XCIxLjFcIiAgIHg9XCIwcHhcIiAgIHk9XCIwcHhcIiAgIHdpZHRoPVwiMTAwJVwiICAgaGVpZ2h0PVwiMTAwJVwiICAgdmlld0JveD1cIjAgMCA3My42MjcgNzMuODk3XCIgICBlbmFibGUtYmFja2dyb3VuZD1cIm5ldyAwIDAgODAgODBcIiAgIHhtbDpzcGFjZT1cInByZXNlcnZlXCIgICA+PGcgICAgIGlkPVwiTGF5ZXJfMVwiICAgICB0cmFuc2Zvcm09XCJ0cmFuc2xhdGUoLTIuOTk1LC0yLjQxMSlcIiAvPjxnICAgICBpZD1cIkxheWVyXzJcIiAgICAgdHJhbnNmb3JtPVwidHJhbnNsYXRlKC0yLjk5NSwtMi40MTEpXCI+PHBhdGggICAgICAgZD1cIk0gNjQuNjIyLDIuNDExIEggMTQuOTk1IGMgLTYuNjI3LDAgLTEyLDUuMzczIC0xMiwxMiB2IDQ5Ljg5NyBjIDAsNi42MjcgNS4zNzMsMTIgMTIsMTIgaCA0OS42MjcgYyA2LjYyNywwIDEyLC01LjM3MyAxMiwtMTIgViAxNC40MTEgYyAwLC02LjYyOCAtNS4zNzMsLTEyIC0xMiwtMTIgeiBNIDI0LjEyNSw2My45MDYgViAxNS4wOTMgTCA2MSwzOS4xNjggMjQuMTI1LDYzLjkwNiB6XCIgICAgICAgaWQ9XCJwYXRoNlwiICAgICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9XCIwXCIgLz48L2c+PGcgICAgIHRyYW5zZm9ybT1cIm1hdHJpeCgwLjc2ODA1NDA4LDAsMCwwLjc2ODA1NDA4LC0wLjkwMjMxOTU0LC0yLjAwNjA4OTUpXCIgICAgIGlkPVwiZzNcIj48cGF0aCAgICAgICBzdHlsZT1cImZpbGw6I2MwMjYwODtmaWxsLW9wYWNpdHk6MVwiICAgICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9XCIwXCIgICAgICAgZD1cIm0gODguMTg0LDgxLjQ2OCBjIDEuMTY3LDEuMTY3IDEuMTY3LDMuMDc1IDAsNC4yNDIgbCAtMi40NzUsMi40NzUgYyAtMS4xNjcsMS4xNjcgLTMuMDc2LDEuMTY3IC00LjI0MiwwIGwgLTY5LjY1LC02OS42NSBjIC0xLjE2NywtMS4xNjcgLTEuMTY3LC0zLjA3NiAwLC00LjI0MiBsIDIuNDc2LC0yLjQ3NiBjIDEuMTY3LC0xLjE2NyAzLjA3NiwtMS4xNjcgNC4yNDIsMCBsIDY5LjY0OSw2OS42NTEgelwiICAgICAgIGlkPVwicGF0aDVcIiAvPjwvZz48ZyAgICAgdHJhbnNmb3JtPVwibWF0cml4KDAuNzY4MDU0MDgsMCwwLDAuNzY4MDU0MDgsLTAuOTAyMzE5NTQsLTIuMDA2MDg5NSlcIiAgICAgaWQ9XCJnN1wiPjxwYXRoICAgICAgIHN0eWxlPVwiZmlsbDojYzAyNjA4O2ZpbGwtb3BhY2l0eToxXCIgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT1cIjBcIiAgICAgICBkPVwibSAxOC41MzIsODguMTg0IGMgLTEuMTY3LDEuMTY2IC0zLjA3NiwxLjE2NiAtNC4yNDIsMCBsIC0yLjQ3NSwtMi40NzUgYyAtMS4xNjcsLTEuMTY2IC0xLjE2NywtMy4wNzYgMCwtNC4yNDIgbCA2OS42NSwtNjkuNjUxIGMgMS4xNjcsLTEuMTY3IDMuMDc1LC0xLjE2NyA0LjI0MiwwIGwgMi40NzYsMi40NzYgYyAxLjE2NiwxLjE2NyAxLjE2NiwzLjA3NiAwLDQuMjQyIGwgLTY5LjY1MSw2OS42NSB6XCIgICAgICAgaWQ9XCJwYXRoOVwiIC8+PC9nPjwvc3ZnPicsXG5cdGRvd25sb2FkOiAnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgeG1sbnM6eGxpbms9XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIgdmVyc2lvbj1cIjEuMVwiIGJhc2VQcm9maWxlPVwidGlueVwiIHg9XCIwcHhcIiB5PVwiMHB4XCIgd2lkdGg9XCIxMDAlXCIgaGVpZ2h0PVwiMTAwJVwiIHZpZXdCb3g9XCIwIDAgMTAwIDEwMFwiIHhtbDpzcGFjZT1cInByZXNlcnZlXCI+PGcgaWQ9XCJDYXB0aW9uc1wiPjwvZz48ZyBpZD1cIllvdXJfSWNvblwiPlx0PHBhdGggZmlsbC1ydWxlPVwiZXZlbm9kZFwiIGZpbGw9XCIjMDAwMDAwXCIgZD1cIk04OCw4NHYtMmMwLTIuOTYxLTAuODU5LTQtNC00SDE2Yy0yLjk2MSwwLTQsMC45OC00LDR2MmMwLDMuMTAyLDEuMDM5LDQsNCw0aDY4ICAgQzg3LjAyLDg4LDg4LDg3LjAzOSw4OCw4NHogTTU4LDEySDQyYy01LDAtNiwwLjk0MS02LDZ2MjJIMTZsMzQsMzRsMzQtMzRINjRWMThDNjQsMTIuOTQxLDYyLjkzOSwxMiw1OCwxMnpcIi8+PC9nPjwvc3ZnPicsXG5cdHNoYXJlOiAnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgeG1sbnM6eGxpbms9XCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIgdmVyc2lvbj1cIjEuMVwiIGlkPVwiSWNvbnNcIiB4PVwiMHB4XCIgeT1cIjBweFwiIHdpZHRoPVwiMTAwJVwiIGhlaWdodD1cIjEwMCVcIiB2aWV3Qm94PVwiMCAwIDEwMCAxMDBcIiBzdHlsZT1cImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMTAwIDEwMDtcIiB4bWw6c3BhY2U9XCJwcmVzZXJ2ZVwiPjxwYXRoIGlkPVwiU2hhcmVUaGlzXCIgZD1cIk0zNi43NjQsNTBjMCwwLjMwOC0wLjA3LDAuNTk4LTAuMDg4LDAuOTA1bDMyLjI0NywxNi4xMTljMi43Ni0yLjMzOCw2LjI5My0zLjc5NywxMC4xOTUtMy43OTcgIEM4Ny44OSw2My4yMjgsOTUsNzAuMzM4LDk1LDc5LjEwOUM5NSw4Ny44OSw4Ny44OSw5NSw3OS4xMTgsOTVjLTguNzgsMC0xNS44ODItNy4xMS0xNS44ODItMTUuODkxYzAtMC4zMTYsMC4wNy0wLjU5OCwwLjA4OC0wLjkwNSAgTDMxLjA3Nyw2Mi4wODVjLTIuNzY5LDIuMzI5LTYuMjkzLDMuNzg4LTEwLjE5NSwzLjc4OEMxMi4xMSw2NS44NzMsNSw1OC43NzEsNSw1MGMwLTguNzgsNy4xMS0xNS44OTEsMTUuODgyLTE1Ljg5MSAgYzMuOTAyLDAsNy40MjcsMS40NjgsMTAuMTk1LDMuNzk3bDMyLjI0Ny0xNi4xMTljLTAuMDE4LTAuMzA4LTAuMDg4LTAuNTk4LTAuMDg4LTAuOTE0QzYzLjIzNiwxMi4xMSw3MC4zMzgsNSw3OS4xMTgsNSAgQzg3Ljg5LDUsOTUsMTIuMTEsOTUsMjAuODczYzAsOC43OC03LjExLDE1Ljg5MS0xNS44ODIsMTUuODkxYy0zLjkxMSwwLTcuNDM2LTEuNDY4LTEwLjE5NS0zLjgwNkwzNi42NzYsNDkuMDg2ICBDMzYuNjkzLDQ5LjM5NCwzNi43NjQsNDkuNjg0LDM2Ljc2NCw1MHpcIi8+PC9zdmc+Jyxcblx0ZHJhdzogZnVuY3Rpb24ocGFyZW50LCBjb25maWcpIHtcblx0XHRpZiAoIXBhcmVudCkgcmV0dXJuO1xuXHRcdHZhciBlbCA9IHJvb3QuZ2V0RWxlbWVudChjb25maWcpO1xuXHRcdGlmIChlbCkge1xuXHRcdFx0JChwYXJlbnQpLmFwcGVuZChlbCk7XG5cdFx0fVxuXHR9LFxuXHRnZXRFbGVtZW50OiBmdW5jdGlvbihjb25maWcpIHtcblx0XHR2YXIgc3ZnU3RyaW5nID0gKGNvbmZpZy5pZD8gcm9vdFtjb25maWcuaWRdOiBjb25maWcudmFsdWUpO1xuXHRcdGlmIChzdmdTdHJpbmcgJiYgc3ZnU3RyaW5nLmluZGV4T2YoXCI8c3ZnXCIpID09IDApIHtcblx0XHRcdGlmICghY29uZmlnLndpZHRoKSBjb25maWcud2lkdGggPSBcIjEwMCVcIjtcblx0XHRcdGlmICghY29uZmlnLmhlaWdodCkgY29uZmlnLmhlaWdodCA9IFwiMTAwJVwiO1xuXHRcdFx0XG5cdFx0XHR2YXIgcGFyc2VyID0gbmV3IERPTVBhcnNlcigpO1xuXHRcdFx0dmFyIGRvbSA9IHBhcnNlci5wYXJzZUZyb21TdHJpbmcoc3ZnU3RyaW5nLCBcInRleHQveG1sXCIpO1xuXHRcdFx0dmFyIHN2ZyA9IGRvbS5kb2N1bWVudEVsZW1lbnQ7XG5cdFx0XHRcblx0XHRcdHZhciBzdmdDb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuXHRcdFx0c3ZnQ29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSBcImlubGluZS1ibG9ja1wiO1xuXHRcdFx0c3ZnQ29udGFpbmVyLnN0eWxlLndpZHRoID0gY29uZmlnLndpZHRoO1xuXHRcdFx0c3ZnQ29udGFpbmVyLnN0eWxlLmhlaWdodCA9IGNvbmZpZy5oZWlnaHQ7XG5cdFx0XHRzdmdDb250YWluZXIuYXBwZW5kQ2hpbGQoc3ZnKTtcblx0XHRcdHJldHVybiBzdmdDb250YWluZXI7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fVxufTsiLCJ3aW5kb3cuY29uc29sZSA9IHdpbmRvdy5jb25zb2xlIHx8IHtcImxvZ1wiOmZ1bmN0aW9uKCl7fX07Ly9tYWtlIHN1cmUgYW55IGNvbnNvbGUgc3RhdGVtZW50cyBkb24ndCBicmVhayBJRVxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdHN0b3JhZ2U6IHJlcXVpcmUoXCIuL3N0b3JhZ2UuanNcIiksXG5cdGRldGVybWluZUlkOiByZXF1aXJlKFwiLi9kZXRlcm1pbmVJZC5qc1wiKSxcblx0aW1nczogcmVxdWlyZShcIi4vaW1ncy5qc1wiKSxcblx0dmVyc2lvbjoge1xuXHRcdFwieWFzZ3VpLXV0aWxzXCIgOiByZXF1aXJlKFwiLi4vcGFja2FnZS5qc29uXCIpLnZlcnNpb24sXG5cdH1cbn07XG4iLCJ2YXIgc3RvcmUgPSByZXF1aXJlKFwic3RvcmVcIik7XG52YXIgdGltZXMgPSB7XG5cdGRheTogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIDEwMDAgKiAzNjAwICogMjQ7Ly9taWxsaXMgdG8gZGF5XG5cdH0sXG5cdG1vbnRoOiBmdW5jdGlvbigpIHtcblx0XHR0aW1lcy5kYXkoKSAqIDMwO1xuXHR9LFxuXHR5ZWFyOiBmdW5jdGlvbigpIHtcblx0XHR0aW1lcy5tb250aCgpICogMTI7XG5cdH1cbn07XG5cbnZhciByb290ID0gbW9kdWxlLmV4cG9ydHMgPSB7XG5cdHNldCA6IGZ1bmN0aW9uKGtleSwgdmFsLCBleHApIHtcblx0XHRpZiAodHlwZW9mIGV4cCA9PSBcInN0cmluZ1wiKSB7XG5cdFx0XHRleHAgPSB0aW1lc1tleHBdKCk7XG5cdFx0fVxuXHRcdHN0b3JlLnNldChrZXksIHtcblx0XHRcdHZhbCA6IHZhbCxcblx0XHRcdGV4cCA6IGV4cCxcblx0XHRcdHRpbWUgOiBuZXcgRGF0ZSgpLmdldFRpbWUoKVxuXHRcdH0pO1xuXHR9LFxuXHRnZXQgOiBmdW5jdGlvbihrZXkpIHtcblx0XHR2YXIgaW5mbyA9IHN0b3JlLmdldChrZXkpO1xuXHRcdGlmICghaW5mbykge1xuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fVxuXHRcdGlmIChpbmZvLmV4cCAmJiBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIGluZm8udGltZSA+IGluZm8uZXhwKSB7XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cdFx0cmV0dXJuIGluZm8udmFsO1xuXHR9XG5cbn07IiwibW9kdWxlLmV4cG9ydHM9e1xuICBcIm5hbWVcIjogXCJ5YXNndWkteWFzclwiLFxuICBcImRlc2NyaXB0aW9uXCI6IFwiWWV0IEFub3RoZXIgU1BBUlFMIFJlc3VsdHNldCBHVUlcIixcbiAgXCJ2ZXJzaW9uXCI6IFwiMS4yLjFcIixcbiAgXCJtYWluXCI6IFwic3JjL21haW4uanNcIixcbiAgXCJsaWNlbnNlc1wiOiBbXG4gICAge1xuICAgICAgXCJ0eXBlXCI6IFwiTUlUXCIsXG4gICAgICBcInVybFwiOiBcImh0dHA6Ly95YXNyLnlhc2d1aS5vcmcvbGljZW5zZS50eHRcIlxuICAgIH1cbiAgXSxcbiAgXCJhdXRob3JcIjogXCJMYXVyZW5zIFJpZXR2ZWxkXCIsXG4gIFwiaG9tZXBhZ2VcIjogXCJodHRwOi8veWFzci55YXNndWkub3JnXCIsXG4gIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImJyb3dzZXJpZnlcIjogXCJeNi4xLjBcIixcbiAgICBcImd1bHBcIjogXCJ+My42LjBcIixcbiAgICBcImd1bHAtYnVtcFwiOiBcIl4wLjEuMTFcIixcbiAgICBcImd1bHAtY29uY2F0XCI6IFwiXjIuNC4xXCIsXG4gICAgXCJndWxwLWNvbm5lY3RcIjogXCJeMi4wLjVcIixcbiAgICBcImd1bHAtZW1iZWRsclwiOiBcIl4wLjUuMlwiLFxuICAgIFwiZ3VscC1maWx0ZXJcIjogXCJeMS4wLjJcIixcbiAgICBcImd1bHAtZ2l0XCI6IFwiXjAuNS4yXCIsXG4gICAgXCJndWxwLWpzdmFsaWRhdGVcIjogXCJeMC4yLjBcIixcbiAgICBcImd1bHAtbGl2ZXJlbG9hZFwiOiBcIl4xLjMuMVwiLFxuICAgIFwiZ3VscC1taW5pZnktY3NzXCI6IFwiXjAuMy4wXCIsXG4gICAgXCJndWxwLW5vdGlmeVwiOiBcIl4xLjIuNVwiLFxuICAgIFwiZ3VscC1yZW5hbWVcIjogXCJeMS4yLjBcIixcbiAgICBcImd1bHAtc3RyZWFtaWZ5XCI6IFwiMC4wLjVcIixcbiAgICBcImd1bHAtdGFnLXZlcnNpb25cIjogXCJeMS4xLjBcIixcbiAgICBcImd1bHAtdWdsaWZ5XCI6IFwiXjAuMi4xXCIsXG4gICAgXCJyZXF1aXJlLWRpclwiOiBcIl4wLjEuMFwiLFxuICAgIFwicnVuLXNlcXVlbmNlXCI6IFwiXjEuMC4xXCIsXG4gICAgXCJ2aW55bC1idWZmZXJcIjogXCIwLjAuMFwiLFxuICAgIFwidmlueWwtc291cmNlLXN0cmVhbVwiOiBcIn4wLjEuMVwiLFxuICAgIFwid2F0Y2hpZnlcIjogXCJeMC42LjRcIixcbiAgICBcImJyb3dzZXJpZnktc2hpbVwiOiBcIl4zLjguMFwiXG4gIH0sXG4gIFwiYnVnc1wiOiBcImh0dHBzOi8vZ2l0aHViLmNvbS9ZQVNHVUkvWUFTUi9pc3N1ZXMvXCIsXG4gIFwia2V5d29yZHNcIjogW1xuICAgIFwiSmF2YVNjcmlwdFwiLFxuICAgIFwiU1BBUlFMXCIsXG4gICAgXCJFZGl0b3JcIixcbiAgICBcIlNlbWFudGljIFdlYlwiLFxuICAgIFwiTGlua2VkIERhdGFcIlxuICBdLFxuICBcImhvbWVwYWdlXCI6IFwiaHR0cDovL3lhc3IueWFzZ3VpLm9yZ1wiLFxuICBcIm1haW50YWluZXJzXCI6IFtcbiAgICB7XG4gICAgICBcIm5hbWVcIjogXCJMYXVyZW5zIFJpZXR2ZWxkXCIsXG4gICAgICBcImVtYWlsXCI6IFwibGF1cmVucy5yaWV0dmVsZEBnbWFpbC5jb21cIixcbiAgICAgIFwid2ViXCI6IFwiaHR0cDovL2xhdXJlbnNyaWV0dmVsZC5ubFwiXG4gICAgfVxuICBdLFxuICBcInJlcG9zaXRvcnlcIjoge1xuICAgIFwidHlwZVwiOiBcImdpdFwiLFxuICAgIFwidXJsXCI6IFwiaHR0cHM6Ly9naXRodWIuY29tL1lBU0dVSS9ZQVNSLmdpdFwiXG4gIH0sXG4gIFwiZGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcImpxdWVyeVwiOiBcIn4gMS4xMS4wXCIsXG4gICAgXCJjb2RlbWlycm9yXCI6IFwiXjQuMi4wXCIsXG4gICAgXCJ0d2l0dGVyLWJvb3RzdHJhcC0zLjAuMFwiOiBcIl4zLjAuMFwiLFxuICAgIFwieWFzZ3VpLXV0aWxzXCI6IFwiXjEuMy4wXCIsXG4gICAgXCJ5YXNndWkteWFzcWVcIjogXCJeMS41LjFcIlxuICB9LFxuICBcImJyb3dzZXJpZnktc2hpbVwiOiB7XG4gICAgXCJqcXVlcnlcIjogXCJnbG9iYWw6alF1ZXJ5XCIsXG4gICAgXCJjb2RlbWlycm9yXCI6IFwiZ2xvYmFsOkNvZGVNaXJyb3JcIixcbiAgICBcIi4uLy4uL2xpYi9jb2RlbWlycm9yXCI6IFwiZ2xvYmFsOkNvZGVNaXJyb3JcIlxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHJlc3VsdCkge1xuXHR2YXIgcXVvdGUgPSBcIlxcXCJcIjtcblx0dmFyIGRlbGltaXRlciA9IFwiLFwiO1xuXHR2YXIgbGluZUJyZWFrPSBcIlxcblwiO1xuXHRcblx0dmFyIHZhcmlhYmxlcyA9IHJlc3VsdC5oZWFkLnZhcnM7XG5cdFxuXHR2YXIgcXVlcnlTb2x1dGlvbnM9IHJlc3VsdC5yZXN1bHRzLmJpbmRpbmdzO1xuXHRcblx0XG5cdFxuXHR2YXIgY3JlYXRlSGVhZGVyID0gZnVuY3Rpb24oKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB2YXJpYWJsZXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdGFkZFZhbHVlVG9TdHJpbmcodmFyaWFibGVzW2ldKTtcblx0XHR9XG5cdFx0Y3N2U3RyaW5nICs9IGxpbmVCcmVhaztcblx0fTtcblx0XG5cdHZhciBjcmVhdGVCb2R5ID0gZnVuY3Rpb24oKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBxdWVyeVNvbHV0aW9ucy5sZW5ndGg7IGkrKykge1xuXHRcdFx0YWRkUXVlcnlTb2x1dGlvblRvU3RyaW5nKHF1ZXJ5U29sdXRpb25zW2ldKTtcblx0XHRcdGNzdlN0cmluZyArPSBsaW5lQnJlYWs7XG5cdFx0fVxuXHR9O1xuXHRcblx0dmFyIGFkZFF1ZXJ5U29sdXRpb25Ub1N0cmluZyA9IGZ1bmN0aW9uKHF1ZXJ5U29sdXRpb24pIHtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHZhcmlhYmxlcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIHZhcmlhYmxlID0gdmFyaWFibGVzW2ldO1xuXHRcdFx0aWYocXVlcnlTb2x1dGlvbi5oYXNPd25Qcm9wZXJ0eSh2YXJpYWJsZSkpe1xuXHRcdFx0XHRhZGRWYWx1ZVRvU3RyaW5nKHF1ZXJ5U29sdXRpb25bdmFyaWFibGVdW1widmFsdWVcIl0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YWRkVmFsdWVUb1N0cmluZyhcIlwiKTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cdHZhciBhZGRWYWx1ZVRvU3RyaW5nID0gZnVuY3Rpb24odmFsdWUpIHtcblx0XHQvL1F1b3RlcyBpbiB0aGUgc3RyaW5nIG5lZWQgdG8gYmUgZXNjYXBlZFxuXHRcdHZhbHVlLnJlcGxhY2UocXVvdGUsIHF1b3RlICsgcXVvdGUpO1xuXHRcdGlmIChuZWVkVG9RdW90ZVN0cmluZyh2YWx1ZSkpIHtcblx0XHRcdHZhbHVlID0gcXVvdGUgKyB2YWx1ZSArIHF1b3RlO1xuXHRcdH1cblx0XHRjc3ZTdHJpbmcgKz0gXCIgXCIgKyB2YWx1ZSArIFwiIFwiICsgZGVsaW1pdGVyO1xuXHR9O1xuXHRcblx0dmFyIG5lZWRUb1F1b3RlU3RyaW5nID0gZnVuY3Rpb24odmFsdWUpIHtcblx0XHQvL3F1b3RlIHdoZW4gaXQgY29udGFpbnMgd2hpdGVzcGFjZSBvciB0aGUgZGVsaW1pdGVyXG5cdFx0dmFyIG5lZWRRdW90aW5nID0gZmFsc2U7XG5cdFx0aWYgKHZhbHVlLm1hdGNoKFwiW1xcXFx3fFwiKyBkZWxpbWl0ZXIgKyBcInxcIiArIHF1b3RlICsgXCJdXCIpKSB7XG5cdFx0XHRuZWVkUXVvdGluZyA9IHRydWU7XG5cdFx0fVxuXHRcdHJldHVybiBuZWVkUXVvdGluZztcblx0fTtcblx0XG5cdGNzdlN0cmluZyA9IFwiXCI7XG5cdGNyZWF0ZUhlYWRlcigpO1xuXHRjcmVhdGVCb2R5KCk7XG5cdHJldHVybiBjc3ZTdHJpbmc7XG59OyIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbnZhciAkID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cualF1ZXJ5IDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5qUXVlcnkgOiBudWxsKTtcblxuLyoqXG4gKiBDb25zdHJ1Y3RvciBvZiBwbHVnaW4gd2hpY2ggZGlzcGxheXMgYm9vbGVhbiBpbmZvXG4gKiBcbiAqIEBwYXJhbSB5YXNyIHtvYmplY3R9XG4gKiBAcGFyYW0gcGFyZW50IHtET00gZWxlbWVudH1cbiAqIEBwYXJhbSBvcHRpb25zIHtvYmplY3R9XG4gKiBAY2xhc3MgWUFTUi5wbHVnaW5zLmJvb2xlYW5cbiAqIEByZXR1cm4geWFzci1ib29sZWFuIChkb2MpXG4gKiBcbiAqL1xudmFyIHJvb3QgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHlhc3IsIHBhcmVudCwgb3B0aW9ucykge1xuXHR2YXIgcGx1Z2luID0ge307XG5cdHBsdWdpbi5jb250YWluZXIgPSAkKFwiPGRpdiBjbGFzcz0nYm9vbGVhblJlc3VsdCc+PC9kaXY+XCIpO1xuXHRwbHVnaW4ub3B0aW9ucyA9ICQuZXh0ZW5kKHRydWUsIHt9LCByb290LmRlZmF1bHRzLCBvcHRpb25zKTtcblx0cGx1Z2luLnBhcmVudCA9IHBhcmVudDtcblx0cGx1Z2luLnlhc3IgPSB5YXNyO1xuXHRcblx0cGx1Z2luLmRyYXcgPSBmdW5jdGlvbigpIHtcblx0XHRyb290LmRyYXcocGx1Z2luKTtcblx0fTtcblx0XG5cdHBsdWdpbi5uYW1lID0gIG51bGw7Ly9kb24ndCBuZWVkIHRvIHNldCB0aGlzOiB3ZSBkb24ndCBzaG93IGl0IGluIHRoZSBzZWxlY3Rpb24gd2lkZ2V0IGFueXdheSwgc28gZG9uJ3QgbmVlZCBhIGh1bWFuLWZyaWVuZGx5IG5hbWVcblx0LyoqXG5cdCAqIEhpZGUgdGhpcyBwbHVnaW4gZnJvbSBzZWxlY3Rpb24gd2lkZ2V0XG5cdCAqIFxuXHQgKiBAcHJvcGVydHkgaGlkZUZyb21TZWxlY3Rpb25cblx0ICogQHR5cGUgYm9vbGVhblxuXHQgKiBAZGVmYXVsdCB0cnVlXG5cdCAqL1xuXHRwbHVnaW4uaGlkZUZyb21TZWxlY3Rpb24gPSB0cnVlO1xuXHQvKipcblx0ICogQ2hlY2sgd2hldGhlciB0aGlzIHBsdWdpbiBjYW4gaGFuZGxlciB0aGUgY3VycmVudCByZXN1bHRzXG5cdCAqIFxuXHQgKiBAcHJvcGVydHkgY2FuSGFuZGxlUmVzdWx0c1xuXHQgKiBAdHlwZSBmdW5jdGlvblxuXHQgKiBAZGVmYXVsdCBJZiByZXN1bHRzZXQgY29udGFpbnMgYm9vbGVhbiB2YWwsIHJldHVybiB0cnVlXG5cdCAqL1xuXHRwbHVnaW4uY2FuSGFuZGxlUmVzdWx0cyA9IGZ1bmN0aW9uKHlhc3Ipe3JldHVybiB5YXNyLnJlc3VsdHMuZ2V0Qm9vbGVhbigpID09PSB0cnVlIHx8IHlhc3IucmVzdWx0cy5nZXRCb29sZWFuKCkgPT0gZmFsc2U7fTtcblx0LyoqXG5cdCAqIElmIHdlIG5lZWQgdG8gZHluYW1pY2FsbHkgY2hlY2sgd2hpY2ggcGx1Z2luIHRvIHVzZSwgd2UgcmFuayB0aGUgcG9zc2libGUgcGx1Z2lucyBieSBwcmlvcml0eSwgYW5kIHNlbGVjdCB0aGUgaGlnaGVzdCBvbmVcblx0ICogXG5cdCAqIEBwcm9wZXJ0eSBnZXRQcmlvcml0eVxuXHQgKiBAcGFyYW0geWFzckRvY1xuXHQgKiBAdHlwZSBpbnR8ZnVuY3Rpb25cblx0ICogQGRlZmF1bHQgMTBcblx0ICovXG5cdHBsdWdpbi5nZXRQcmlvcml0eSA9IDEwO1xuXHRcblx0XG5cdHJldHVybiBwbHVnaW47XG59O1xuXG5yb290LmRyYXcgPSBmdW5jdGlvbihwbHVnaW4pIHtcblx0cGx1Z2luLmNvbnRhaW5lci5lbXB0eSgpLmFwcGVuZFRvKHBsdWdpbi5wYXJlbnQpO1xuXHR2YXIgYm9vbGVhblZhbCA9IHBsdWdpbi55YXNyLnJlc3VsdHMuZ2V0Qm9vbGVhbigpO1xuXHRcblx0dmFyIGltZ0lkID0gbnVsbDtcblx0dmFyIHRleHRWYWwgPSBudWxsO1xuXHRpZiAoYm9vbGVhblZhbCA9PT0gdHJ1ZSkge1xuXHRcdGltZ0lkID0gXCJjaGVja1wiO1xuXHRcdHRleHRWYWwgPSBcIlRydWVcIjtcblx0fSBlbHNlIGlmIChib29sZWFuVmFsID09PSBmYWxzZSkge1xuXHRcdGltZ0lkID0gXCJjcm9zc1wiO1xuXHRcdHRleHRWYWwgPSBcIkZhbHNlXCI7XG5cdH0gZWxzZSB7XG5cdFx0cGx1Z2luLmNvbnRhaW5lci53aWR0aChcIjE0MFwiKTtcblx0XHR0ZXh0VmFsID0gXCJDb3VsZCBub3QgZmluZCBib29sZWFuIHZhbHVlIGluIHJlc3BvbnNlXCI7XG5cdH1cblx0XG5cdC8vYWRkIGljb25cblx0aWYgKGltZ0lkKSByZXF1aXJlKFwieWFzZ3VpLXV0aWxzXCIpLmltZ3MuZHJhdyhwbHVnaW4uY29udGFpbmVyLCB7XG5cdFx0d2lkdGg6IDI1LFxuXHRcdGhlaWdodDogMjUsXG5cdFx0aWQ6IGltZ0lkLFxuXHR9KTtcblx0XG5cdCQoXCI8c3Bhbj48L3NwYW4+XCIpLnRleHQodGV4dFZhbCkuYXBwZW5kVG8ocGx1Z2luLmNvbnRhaW5lcik7XG59O1xuXG5yb290LnZlcnNpb24gPSB7XG5cdFwiWUFTUi1ib29sZWFuXCIgOiByZXF1aXJlKFwiLi4vcGFja2FnZS5qc29uXCIpLnZlcnNpb24sXG5cdFwianF1ZXJ5XCI6ICQuZm4uanF1ZXJ5LFxufTtcblxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG52YXIgJCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LmpRdWVyeSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwualF1ZXJ5IDogbnVsbCk7XG5cbi8qKlxuICogQ29uc3RydWN0b3Igb2YgcGx1Z2luIHdoaWNoIGRpc3BsYXlzIFNQQVJRTCBlcnJvcnNcbiAqIFxuICogQHBhcmFtIHlhc3Ige29iamVjdH1cbiAqIEBwYXJhbSBwYXJlbnQge0RPTSBlbGVtZW50fVxuICogQHBhcmFtIG9wdGlvbnMge29iamVjdH1cbiAqIEBjbGFzcyBZQVNSLnBsdWdpbnMuYm9vbGVhblxuICogQHJldHVybiB5YXNyLWVycm8gKGRvYylcbiAqIFxuICovXG52YXIgcm9vdCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oeWFzciwgcGFyZW50LCBvcHRpb25zKSB7XG5cdHZhciBwbHVnaW4gPSB7fTtcblx0cGx1Z2luLmNvbnRhaW5lciA9ICQoXCI8ZGl2IGNsYXNzPSdlcnJvclJlc3VsdCc+PC9kaXY+XCIpO1xuXHRwbHVnaW4ub3B0aW9ucyA9ICQuZXh0ZW5kKHRydWUsIHt9LCByb290LmRlZmF1bHRzLCBvcHRpb25zKTtcblx0cGx1Z2luLnBhcmVudCA9IHBhcmVudDtcblx0cGx1Z2luLnlhc3IgPSB5YXNyO1xuXHRcblx0cGx1Z2luLmRyYXcgPSBmdW5jdGlvbigpIHtcblx0XHRwbHVnaW4uY29udGFpbmVyLmVtcHR5KCkuYXBwZW5kVG8ocGx1Z2luLnBhcmVudCk7XG5cdFx0JChcIjxzcGFuIGNsYXNzPSdleGNlcHRpb24nPkVSUk9SPC9zcGFuPlwiKS5hcHBlbmRUbyhwbHVnaW4uY29udGFpbmVyKTtcblx0XHQkKFwiPHA+PC9wPlwiKS5odG1sKHBsdWdpbi55YXNyLnJlc3VsdHMuZ2V0RXhjZXB0aW9uKCkpLmFwcGVuZFRvKHBsdWdpbi5jb250YWluZXIpO1xuXHR9O1xuXHRcblx0cGx1Z2luLm5hbWUgPSAgbnVsbDsvL2Rvbid0IG5lZWQgdG8gc2V0IHRoaXM6IHdlIGRvbid0IHNob3cgaXQgaW4gdGhlIHNlbGVjdGlvbiB3aWRnZXQgYW55d2F5LCBzbyBkb24ndCBuZWVkIGEgaHVtYW4tZnJpZW5kbHkgbmFtZVxuXHQvKipcblx0ICogSGlkZSB0aGlzIHBsdWdpbiBmcm9tIHNlbGVjdGlvbiB3aWRnZXRcblx0ICogXG5cdCAqIEBwcm9wZXJ0eSBoaWRlRnJvbVNlbGVjdGlvblxuXHQgKiBAdHlwZSBib29sZWFuXG5cdCAqIEBkZWZhdWx0IHRydWVcblx0ICovXG5cdHBsdWdpbi5oaWRlRnJvbVNlbGVjdGlvbiA9IHRydWU7XG5cdC8qKlxuXHQgKiBDaGVjayB3aGV0aGVyIHRoaXMgcGx1Z2luIGNhbiBoYW5kbGVyIHRoZSBjdXJyZW50IHJlc3VsdHNcblx0ICogXG5cdCAqIEBwcm9wZXJ0eSBjYW5IYW5kbGVSZXN1bHRzXG5cdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdCAqIEBkZWZhdWx0IElmIHJlc3VsdHNldCBjb250YWlucyBhbiBleGNlcHRpb24sIHJldHVybiB0cnVlXG5cdCAqL1xuXHRwbHVnaW4uY2FuSGFuZGxlUmVzdWx0cyA9IGZ1bmN0aW9uKHlhc3Ipe3JldHVybiB5YXNyLnJlc3VsdHMuZ2V0RXhjZXB0aW9uKCkgfHwgZmFsc2U7fTtcblx0LyoqXG5cdCAqIElmIHdlIG5lZWQgdG8gZHluYW1pY2FsbHkgY2hlY2sgd2hpY2ggcGx1Z2luIHRvIHVzZSwgd2UgcmFuayB0aGUgcG9zc2libGUgcGx1Z2lucyBieSBwcmlvcml0eSwgYW5kIHNlbGVjdCB0aGUgaGlnaGVzdCBvbmVcblx0ICogXG5cdCAqIEBwcm9wZXJ0eSBnZXRQcmlvcml0eVxuXHQgKiBAcGFyYW0geWFzckRvY1xuXHQgKiBAdHlwZSBpbnR8ZnVuY3Rpb25cblx0ICogQGRlZmF1bHQgMTBcblx0ICovXG5cdHBsdWdpbi5nZXRQcmlvcml0eSA9IDIwO1xuXHRcblx0XG5cdHJldHVybiBwbHVnaW47XG59O1xuXG4vKipcbiAqIERlZmF1bHRzIGZvciBlcnJvciBwbHVnaW5cbiAqIFxuICogQHR5cGUgb2JqZWN0XG4gKiBAYXR0cmlidXRlIFlBU1IucGx1Z2lucy5lcnJvci5kZWZhdWx0c1xuICovXG5yb290LmRlZmF1bHRzID0ge1xuXHRcbn07XG59KS5jYWxsKHRoaXMsdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG52YXIgJCA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LmpRdWVyeSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwualF1ZXJ5IDogbnVsbCk7XG52YXIgcm9vdCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocXVlcnlSZXNwb25zZSkge1xuXHRyZXR1cm4gcmVxdWlyZShcIi4vZGx2LmpzXCIpKHF1ZXJ5UmVzcG9uc2UsIFwiLFwiKTtcbn07XG59KS5jYWxsKHRoaXMsdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG52YXIgJCA9IGpRdWVyeSA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LmpRdWVyeSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwualF1ZXJ5IDogbnVsbCk7XG5yZXF1aXJlKFwiLi4vLi4vbGliL2pxdWVyeS5jc3YtMC43MS5qc1wiKTtcbnZhciByb290ID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihxdWVyeVJlc3BvbnNlLCBzZXBhcmF0b3IpIHtcblx0dmFyIGpzb24gPSB7fTtcblx0dmFyIGFycmF5cyA9ICAkLmNzdi50b0FycmF5cyhxdWVyeVJlc3BvbnNlLCB7c2VwYXJhdG9yOiBzZXBhcmF0b3J9KTtcblx0dmFyIGRldGVjdFR5cGUgPSBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdGlmICh2YWx1ZS5pbmRleE9mKFwiaHR0cFwiKSA9PSAwKSB7XG5cdFx0XHRyZXR1cm4gXCJ1cmlcIjtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fVxuXHR9O1xuXHRcblx0dmFyIGdldEJvb2xlYW4gPSBmdW5jdGlvbigpIHtcblx0XHRpZiAoYXJyYXlzLmxlbmd0aCA9PSAyICYmIGFycmF5c1swXS5sZW5ndGggPT0gMSAmJiBhcnJheXNbMV0ubGVuZ3RoID09IDFcblx0XHRcdFx0JiYgYXJyYXlzWzBdWzBdID09IFwiYm9vbGVhblwiICYmIChhcnJheXNbMV1bMF0gPT0gXCIxXCIgfHwgYXJyYXlzWzFdWzBdID09IFwiMFwiKSkge1xuXHRcdFx0anNvbi5ib29sZWFuID0gKGFycmF5c1sxXVswXSA9PSBcIjFcIj8gdHJ1ZTogZmFsc2UpO1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fTtcblx0XG5cdHZhciBnZXRWYXJpYWJsZXMgPSBmdW5jdGlvbigpIHtcblx0XHRpZiAoYXJyYXlzLmxlbmd0aCA+IDAgJiYgYXJyYXlzWzBdLmxlbmd0aCA+IDApIHtcblx0XHRcdGpzb24uaGVhZCA9IHt2YXJzOiBhcnJheXNbMF19O1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fTtcblx0XG5cdHZhciBnZXRCaW5kaW5ncyA9IGZ1bmN0aW9uKCkge1xuXHRcdGlmIChhcnJheXMubGVuZ3RoID4gMSkge1xuXHRcdFx0anNvbi5yZXN1bHRzID0ge2JpbmRpbmdzOiBbXX07XG5cdFx0XHRmb3IgKHZhciByb3dJdCA9IDE7IHJvd0l0IDwgYXJyYXlzLmxlbmd0aDsgcm93SXQrKykge1xuXHRcdFx0XHR2YXIgYmluZGluZyA9IHt9O1xuXHRcdFx0XHRmb3IgKHZhciBjb2xJdCA9IDA7IGNvbEl0IDwgYXJyYXlzW3Jvd0l0XS5sZW5ndGg7IGNvbEl0KyspIHtcblx0XHRcdFx0XHR2YXIgdmFyTmFtZSA9IGpzb24uaGVhZC52YXJzW2NvbEl0XTtcblx0XHRcdFx0XHRpZiAodmFyTmFtZSkge1xuXHRcdFx0XHRcdFx0dmFyIHZhbHVlID0gYXJyYXlzW3Jvd0l0XVtjb2xJdF07XG5cdFx0XHRcdFx0XHR2YXIgZGV0ZWN0ZWRUeXBlID0gZGV0ZWN0VHlwZSh2YWx1ZSk7XG5cdFx0XHRcdFx0XHRiaW5kaW5nW3Zhck5hbWVdID0ge3ZhbHVlOiB2YWx1ZX07XG5cdFx0XHRcdFx0XHRpZiAoZGV0ZWN0ZWRUeXBlKSBiaW5kaW5nW3Zhck5hbWVdLnR5cGUgPSBkZXRlY3RlZFR5cGU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0XHRqc29uLnJlc3VsdHMuYmluZGluZ3MucHVzaChiaW5kaW5nKTtcblx0XHRcdH1cblx0XHRcdGpzb24uaGVhZCA9IHt2YXJzOiBhcnJheXNbMF19O1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdHJldHVybiBmYWxzZTtcblx0fTtcblx0dmFyIGlzQm9vbGVhbiA9IGdldEJvb2xlYW4oKTtcblx0aWYgKCFpc0Jvb2xlYW4pIHtcblx0XHR2YXIgdmFyc0ZldGNoZWQgPSBnZXRWYXJpYWJsZXMoKTtcblx0XHRpZiAodmFyc0ZldGNoZWQpIGdldEJpbmRpbmdzKCk7XG5cdH1cblx0XG5cdHJldHVybiBqc29uO1xufTtcbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbnZhciAkID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cualF1ZXJ5IDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5qUXVlcnkgOiBudWxsKTtcbnZhciByb290ID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihxdWVyeVJlc3BvbnNlKSB7XG5cdFxuXHRpZiAodHlwZW9mIHF1ZXJ5UmVzcG9uc2UgPT0gXCJzdHJpbmdcIikge1xuXHRcdHRyeSB7XG5cdFx0XHRyZXR1cm4gSlNPTi5wYXJzZShxdWVyeVJlc3BvbnNlKTtcblx0ICAgIH0gY2F0Y2ggKGUpIHtcblx0ICAgICAgICByZXR1cm4gZmFsc2U7XG5cdCAgICB9XG5cdH1cblx0aWYgKHR5cGVvZiBxdWVyeVJlc3BvbnNlID09IFwib2JqZWN0XCIgJiYgcXVlcnlSZXNwb25zZS5jb25zdHJ1Y3RvciA9PT0ge30uY29uc3RydWN0b3IpIHtcblx0XHRyZXR1cm4gcXVlcnlSZXNwb25zZTtcblx0fVxuXHRyZXR1cm4gZmFsc2U7XG5cdFxufTtcbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbnZhciAkID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cualF1ZXJ5IDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5qUXVlcnkgOiBudWxsKTtcbnZhciByb290ID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihxdWVyeVJlc3BvbnNlKSB7XG5cdHJldHVybiByZXF1aXJlKFwiLi9kbHYuanNcIikocXVlcnlSZXNwb25zZSwgXCJcXHRcIik7XG59O1xufSkuY2FsbCh0aGlzLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xudmFyICQgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5qUXVlcnkgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLmpRdWVyeSA6IG51bGwpO1xuXG52YXIgcm9vdCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocXVlcnlSZXNwb25zZSkge1xuXHR2YXIgcGFyc2VycyA9IHtcblx0XHR4bWw6IHJlcXVpcmUoXCIuL3htbC5qc1wiKSxcblx0XHRqc29uOiByZXF1aXJlKFwiLi9qc29uLmpzXCIpLFxuXHRcdHRzdjogcmVxdWlyZShcIi4vdHN2LmpzXCIpLFxuXHRcdGNzdjogcmVxdWlyZShcIi4vY3N2LmpzXCIpXG5cdH07XG5cdHZhciBjb250ZW50VHlwZTtcblx0dmFyIG9yaWdSZXNwb25zZTtcblx0dmFyIGpzb24gPSBudWxsO1xuXHR2YXIgdHlwZSA9IG51bGw7Ly9qc29uLCB4bWwsIGNzdiwgb3IgdHN2XG5cdHZhciBleGNlcHRpb24gPSAodHlwZW9mIHF1ZXJ5UmVzcG9uc2UgPT0gXCJvYmplY3RcIiAmJiBxdWVyeVJlc3BvbnNlLmV4Y2VwdGlvbj8gcXVlcnlSZXNwb25zZS5leGNlcHRpb246IG51bGwpO1xuXHRcdFxuXHRjb250ZW50VHlwZSA9ICh0eXBlb2YgcXVlcnlSZXNwb25zZSA9PSBcIm9iamVjdFwiICYmIHF1ZXJ5UmVzcG9uc2UuY29udGVudFR5cGU/IHF1ZXJ5UmVzcG9uc2UuY29udGVudFR5cGUudG9Mb3dlckNhc2UoKTogbnVsbCk7XG5cdG9yaWdSZXNwb25zZSA9ICh0eXBlb2YgcXVlcnlSZXNwb25zZSA9PSBcIm9iamVjdFwiICYmIHF1ZXJ5UmVzcG9uc2UucmVzcG9uc2U/IHF1ZXJ5UmVzcG9uc2UucmVzcG9uc2U6IHF1ZXJ5UmVzcG9uc2UpO1xuXHRcblx0XG5cblx0dmFyIGdldEFzSnNvbiA9IGZ1bmN0aW9uKCkge1xuXHRcdGlmIChqc29uKSByZXR1cm4ganNvbjtcblx0XHRpZiAoanNvbiA9PT0gZmFsc2UgfHwgZXhjZXB0aW9uKSByZXR1cm4gZmFsc2U7Ly9hbHJlYWR5IHRyaWVkIHBhcnNpbmcgdGhpcywgYW5kIGZhaWxlZC4gZG8gbm90IHRyeSBhZ2Fpbi4uLiBcblx0XHR2YXIgZ2V0UGFyc2VyRnJvbUNvbnRlbnRUeXBlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoY29udGVudFR5cGUpIHtcblx0XHRcdFx0aWYgKGNvbnRlbnRUeXBlLmluZGV4T2YoXCJqc29uXCIpID4gLTEpIHtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0anNvbiA9IHBhcnNlcnMuanNvbihvcmlnUmVzcG9uc2UpO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0XHRcdGV4Y2VwdGlvbiA9IGU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHR5cGUgPSBcImpzb25cIjtcblx0XHRcdFx0fSBlbHNlIGlmIChjb250ZW50VHlwZS5pbmRleE9mKFwieG1sXCIpID4gLTEpIHtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0anNvbiA9IHBhcnNlcnMueG1sKG9yaWdSZXNwb25zZSk7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRcdFx0ZXhjZXB0aW9uID0gZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dHlwZSA9IFwieG1sXCI7XG5cdFx0XHRcdH0gZWxzZSBpZiAoY29udGVudFR5cGUuaW5kZXhPZihcImNzdlwiKSA+IC0xKSB7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGpzb24gPSBwYXJzZXJzLmNzdihvcmlnUmVzcG9uc2UpO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0XHRcdGV4Y2VwdGlvbiA9IGU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHR5cGUgPSBcImNzdlwiO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGNvbnRlbnRUeXBlLmluZGV4T2YoXCJ0YWItc2VwYXJhdGVkXCIpID4gLTEpIHtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0anNvbiA9IHBhcnNlcnMudHN2KG9yaWdSZXNwb25zZSk7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRcdFx0ZXhjZXB0aW9uID0gZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dHlwZSA9IFwidHN2XCI7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXHRcdFxuXG5cdFx0dmFyIGRvTHVja3lHdWVzcyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0anNvbiA9IHBhcnNlcnMuanNvbihvcmlnUmVzcG9uc2UpO1xuXHRcdFx0aWYgKGpzb24pICB7XG5cdFx0XHRcdHR5cGUgPSBcImpzb25cIjtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0anNvbiA9IHBhcnNlcnMueG1sKG9yaWdSZXNwb25zZSk7XG5cdFx0XHRcdFx0aWYgKGpzb24pIHR5cGU9XCJ4bWxcIjtcblx0XHRcdFx0fSBjYXRjaChlcnIpe307XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdFxuXHRcdGdldFBhcnNlckZyb21Db250ZW50VHlwZSgpO1xuXHRcdGlmICghanNvbikge1xuXHRcdFx0ZG9MdWNreUd1ZXNzKCk7XG5cdFx0fVxuXHRcdGlmICghanNvbikganNvbiA9IGZhbHNlOy8vZXhwbGljaXRseSBzZXQgdG8gZmFsc2UsIHNvIHdlIGRvbid0IHRyeSB0byBwYXJzZSB0aGlzIHRoaW5nIGFnYWluLi5cblx0XHRyZXR1cm4ganNvbjtcblx0fTtcblxuXG5cdHZhciBnZXRWYXJpYWJsZXMgPSBmdW5jdGlvbigpIHtcblx0XHR2YXIganNvbiA9IGdldEFzSnNvbigpO1xuXHRcdGlmIChqc29uICYmIFwiaGVhZFwiIGluIGpzb24pIHtcblx0XHRcdHJldHVybiBqc29uLmhlYWQudmFycztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fVxuXHR9O1xuXG5cdHZhciBnZXRCaW5kaW5ncyA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBqc29uID0gZ2V0QXNKc29uKCk7XG5cdFx0aWYgKGpzb24gJiYgXCJyZXN1bHRzXCIgaW4ganNvbikge1xuXHRcdFx0cmV0dXJuIGpzb24ucmVzdWx0cy5iaW5kaW5ncztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fVxuXHR9O1xuXG5cdHZhciBnZXRCb29sZWFuID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGpzb24gPSBnZXRBc0pzb24oKTtcblx0XHRpZiAoanNvbiAmJiBcImJvb2xlYW5cIiBpbiBqc29uKSB7XG5cdFx0XHRyZXR1cm4ganNvbi5ib29sZWFuO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gbnVsbDtcblx0XHR9XG5cdH07XG5cdHZhciBnZXRPcmlnaW5hbFJlc3BvbnNlID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIG9yaWdSZXNwb25zZTtcblx0fTtcblx0dmFyIGdldE9yaWdpbmFsUmVzcG9uc2VBc1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuXHRcdHZhciByZXNwb25zZVN0cmluZyA9IFwiXCI7XG5cdFx0aWYgKHR5cGVvZiBvcmlnUmVzcG9uc2UgPT0gXCJzdHJpbmdcIikge1xuXHRcdFx0cmVzcG9uc2VTdHJpbmcgPSBvcmlnUmVzcG9uc2U7XG5cdFx0fSBlbHNlIGlmICh0eXBlID09IFwianNvblwiKSB7XG5cdFx0XHRyZXNwb25zZVN0cmluZyA9IEpTT04uc3RyaW5naWZ5KG9yaWdSZXNwb25zZSwgdW5kZWZpbmVkLCAyKTsvL3ByZXR0aWZpZXMgYXMgd2VsbFxuXHRcdH0gZWxzZSBpZiAodHlwZSA9PSBcInhtbFwiKSB7XG5cdFx0XHRyZXNwb25zZVN0cmluZyA9IG5ldyBYTUxTZXJpYWxpemVyKCkuc2VyaWFsaXplVG9TdHJpbmcob3JpZ1Jlc3BvbnNlKTtcblx0XHR9XG5cdFx0cmV0dXJuIHJlc3BvbnNlU3RyaW5nO1xuXHR9O1xuXHR2YXIgZ2V0RXhjZXB0aW9uID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIGV4Y2VwdGlvbjtcblx0fTtcblx0dmFyIGdldFR5cGUgPSBmdW5jdGlvbigpIHtcblx0XHRpZiAodHlwZSA9PSBudWxsKSBnZXRBc0pzb24oKTsvL2RldGVjdHMgdHlwZSBhcyB3ZWxsXG5cdFx0cmV0dXJuIHR5cGU7XG5cdH07XG5cdGpzb24gPSBnZXRBc0pzb24oKTtcblx0XG5cdHJldHVybiB7XG5cdFx0Z2V0QXNKc29uOiBnZXRBc0pzb24sXG5cdFx0Z2V0T3JpZ2luYWxSZXNwb25zZTogZ2V0T3JpZ2luYWxSZXNwb25zZSxcblx0XHRnZXRPcmlnaW5hbFJlc3BvbnNlQXNTdHJpbmc6IGdldE9yaWdpbmFsUmVzcG9uc2VBc1N0cmluZyxcblx0XHRnZXRPcmlnaW5hbENvbnRlbnRUeXBlOiBmdW5jdGlvbigpe3JldHVybiBjb250ZW50VHlwZTt9LFxuXHRcdGdldFZhcmlhYmxlczogZ2V0VmFyaWFibGVzLFxuXHRcdGdldEJpbmRpbmdzOiBnZXRCaW5kaW5ncyxcblx0XHRnZXRCb29sZWFuOiBnZXRCb29sZWFuLFxuXHRcdGdldFR5cGU6IGdldFR5cGUsXG5cdFx0Z2V0RXhjZXB0aW9uOiBnZXRFeGNlcHRpb25cblx0fTtcbn07XG5cblxuXG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbnZhciAkID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cualF1ZXJ5IDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5qUXVlcnkgOiBudWxsKTtcbnZhciByb290ID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih4bWwpIHtcblxuXHRcblx0XG5cdC8qKlxuXHQgKiBoZWFkXG5cdCAqL1xuXHR2YXIgcGFyc2VIZWFkID0gZnVuY3Rpb24obm9kZSkge1xuXHRcdGpzb24uaGVhZCA9IHt9O1xuXHRcdGZvciAodmFyIGhlYWROb2RlSXQgPSAwOyBoZWFkTm9kZUl0IDwgbm9kZS5jaGlsZE5vZGVzLmxlbmd0aDsgaGVhZE5vZGVJdCsrKSB7XG5cdFx0XHR2YXIgaGVhZE5vZGUgPSBub2RlLmNoaWxkTm9kZXNbaGVhZE5vZGVJdF07XG5cdFx0XHRpZiAoaGVhZE5vZGUubm9kZU5hbWUgPT0gXCJ2YXJpYWJsZVwiKSB7XG5cdFx0XHRcdGlmICghanNvbi5oZWFkLnZhcnMpIGpzb24uaGVhZC52YXJzID0gW107XG5cdFx0XHRcdHZhciBuYW1lID0gaGVhZE5vZGUuZ2V0QXR0cmlidXRlKFwibmFtZVwiKTtcblx0XHRcdFx0aWYgKG5hbWUpIGpzb24uaGVhZC52YXJzLnB1c2gobmFtZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXHRcblx0dmFyIHBhcnNlUmVzdWx0cyA9IGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRqc29uLnJlc3VsdHMgPSB7fTtcblx0XHRqc29uLnJlc3VsdHMuYmluZGluZ3MgPSBbXTtcblx0XHRmb3IgKHZhciByZXN1bHRJdCA9IDA7IHJlc3VsdEl0IDwgbm9kZS5jaGlsZE5vZGVzLmxlbmd0aDsgcmVzdWx0SXQrKykge1xuXHRcdFx0dmFyIHJlc3VsdE5vZGUgPSBub2RlLmNoaWxkTm9kZXNbcmVzdWx0SXRdO1xuXHRcdFx0dmFyIGpzb25SZXN1bHQgPSBudWxsO1xuXHRcdFx0XG5cdFx0XHRmb3IgKHZhciBiaW5kaW5nSXQgPSAwOyBiaW5kaW5nSXQgPCByZXN1bHROb2RlLmNoaWxkTm9kZXMubGVuZ3RoOyBiaW5kaW5nSXQrKykge1xuXHRcdFx0XHR2YXIgYmluZGluZ05vZGUgPSByZXN1bHROb2RlLmNoaWxkTm9kZXNbYmluZGluZ0l0XTtcblx0XHRcdFx0aWYgKGJpbmRpbmdOb2RlLm5vZGVOYW1lID09IFwiYmluZGluZ1wiKSB7XG5cdFx0XHRcdFx0dmFyIHZhck5hbWUgPSBiaW5kaW5nTm9kZS5nZXRBdHRyaWJ1dGUoXCJuYW1lXCIpO1xuXHRcdFx0XHRcdGlmICh2YXJOYW1lKSB7XG5cdFx0XHRcdFx0XHRqc29uUmVzdWx0ID0ganNvblJlc3VsdCB8fCB7fTtcblx0XHRcdFx0XHRcdGpzb25SZXN1bHRbdmFyTmFtZV0gPSB7fTtcblx0XHRcdFx0XHRcdGZvciAodmFyIGJpbmRpbmdJbmZJdCA9IDA7IGJpbmRpbmdJbmZJdCA8IGJpbmRpbmdOb2RlLmNoaWxkTm9kZXMubGVuZ3RoOyBiaW5kaW5nSW5mSXQrKykge1xuXHRcdFx0XHRcdFx0XHR2YXIgYmluZGluZ0luZiA9IGJpbmRpbmdOb2RlLmNoaWxkTm9kZXNbYmluZGluZ0luZkl0XTtcbiBcdFx0XHRcdFx0XHRcdHZhciB0eXBlID0gYmluZGluZ0luZi5ub2RlTmFtZTtcblx0XHRcdFx0XHRcdFx0aWYgKHR5cGUgPT0gXCIjdGV4dFwiKSBjb250aW51ZTtcblx0XHRcdFx0XHRcdFx0anNvblJlc3VsdFt2YXJOYW1lXS50eXBlID0gdHlwZTtcblx0XHRcdFx0XHRcdFx0anNvblJlc3VsdFt2YXJOYW1lXS52YWx1ZSA9IGJpbmRpbmdJbmYuaW5uZXJIVE1MO1xuXHRcdFx0XHRcdFx0XHR2YXIgZGF0YVR5cGUgPSBiaW5kaW5nSW5mLmdldEF0dHJpYnV0ZShcImRhdGF0eXBlXCIpO1xuXHRcdFx0XHRcdFx0XHRpZiAoZGF0YVR5cGUpIGpzb25SZXN1bHRbdmFyTmFtZV0uZGF0YXR5cGUgPSBkYXRhVHlwZTtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAoanNvblJlc3VsdCkganNvbi5yZXN1bHRzLmJpbmRpbmdzLnB1c2goanNvblJlc3VsdCk7XG5cdFx0fVxuXHR9O1xuXHRcblx0dmFyIHBhcnNlQm9vbGVhbiA9IGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRpZiAobm9kZS5pbm5lckhUTUwgPT0gXCJ0cnVlXCIpIHtcblx0XHRcdGpzb24uYm9vbGVhbiA9IHRydWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGpzb24uYm9vbGVhbiA9IGZhbHNlO1xuXHRcdH1cblx0fTtcblx0XG5cdGlmICh0eXBlb2YgeG1sID09IFwic3RyaW5nXCIpIG1haW5YbWwgPSAkLnBhcnNlWE1MKHhtbCk7XG5cdHZhciB4bWwgPSBudWxsO1xuXHRpZiAobWFpblhtbC5jaGlsZE5vZGVzLmxlbmd0aCA+IDApIHtcblx0XHQvL2VudGVyIHRoZSBtYWluICdzcGFycWwnIG5vZGVcblx0XHR4bWwgPSBtYWluWG1sLmNoaWxkTm9kZXNbMF07XG5cdH0gZWxzZSB7XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cblx0dmFyIGpzb24gPSB7fTtcblx0XG5cdFxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCB4bWwuY2hpbGROb2Rlcy5sZW5ndGg7IGkrKykge1xuICAgIFx0dmFyIG5vZGUgPSB4bWwuY2hpbGROb2Rlc1tpXTtcbiAgICBcdGlmIChub2RlLm5vZGVOYW1lID09IFwiaGVhZFwiKSBwYXJzZUhlYWQobm9kZSk7XG4gICAgXHRpZiAobm9kZS5ub2RlTmFtZSA9PSBcInJlc3VsdHNcIikgcGFyc2VSZXN1bHRzKG5vZGUpO1xuICAgIFx0aWYgKG5vZGUubm9kZU5hbWUgPT0gXCJib29sZWFuXCIpIHBhcnNlQm9vbGVhbihub2RlKTtcbiAgICB9XG4gICAgXG5cdHJldHVybiBqc29uO1xufTtcbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbnZhciAkID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cualF1ZXJ5IDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5qUXVlcnkgOiBudWxsKTtcbnZhciBDb2RlTWlycm9yID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuQ29kZU1pcnJvciA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuQ29kZU1pcnJvciA6IG51bGwpO1xuXG5yZXF1aXJlKCdjb2RlbWlycm9yL2FkZG9uL2VkaXQvbWF0Y2hicmFja2V0cy5qcycpO1xucmVxdWlyZSgnY29kZW1pcnJvci9tb2RlL3htbC94bWwuanMnKTtcbnJlcXVpcmUoJ2NvZGVtaXJyb3IvbW9kZS9qYXZhc2NyaXB0L2phdmFzY3JpcHQuanMnKTtcbnZhciByb290ID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih5YXNyLHBhcmVudCwgb3B0aW9ucykge1xuXHR2YXIgcGx1Z2luID0ge307XG5cdHBsdWdpbi5vcHRpb25zID0gJC5leHRlbmQodHJ1ZSwge30sIHJvb3QuZGVmYXVsdHMsIG9wdGlvbnMpO1xuXHRwbHVnaW4ueWFzciA9IHlhc3I7XG5cdHBsdWdpbi5wYXJlbnQgPSBwYXJlbnQ7XG5cdHBsdWdpbi5kcmF3ID0gZnVuY3Rpb24oKSB7XG5cdFx0cm9vdC5kcmF3KHBsdWdpbik7XG5cdH07XG5cdHBsdWdpbi5uYW1lID0gXCJSYXcgUmVzcG9uc2VcIjtcblx0cGx1Z2luLmNhbkhhbmRsZVJlc3VsdHMgPSBmdW5jdGlvbih5YXNyKXtcblx0XHRpZiAoIXlhc3IucmVzdWx0cykgcmV0dXJuIGZhbHNlO1xuXHRcdHZhciByZXNwb25zZSA9IHlhc3IucmVzdWx0cy5nZXRPcmlnaW5hbFJlc3BvbnNlQXNTdHJpbmcoKTtcblx0XHRpZiAoKCFyZXNwb25zZSB8fCByZXNwb25zZS5sZW5ndGggPT0gMCkgJiYgeWFzci5yZXN1bHRzLmdldEV4Y2VwdGlvbigpKSByZXR1cm4gZmFsc2U7Ly9pbiB0aGlzIGNhc2UsIHNob3cgZXhjZXB0aW9uIGluc3RlYWQsIGFzIHdlIGhhdmUgbm90aGluZyB0byBzaG93IGFueXdheVxuXHRcdHJldHVybiB0cnVlO1xuXHR9O1xuXHRwbHVnaW4uZ2V0UHJpb3JpdHkgPSAyO1xuXHRcblx0cGx1Z2luLmdldERvd25sb2FkSW5mbyA9IGZ1bmN0aW9uKCkge1xuXHRcdGlmICghcGx1Z2luLnlhc3IucmVzdWx0cykgcmV0dXJuIG51bGw7XG5cdFx0dmFyIGNvbnRlbnRUeXBlID0gcGx1Z2luLnlhc3IucmVzdWx0cy5nZXRPcmlnaW5hbENvbnRlbnRUeXBlKCk7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGdldENvbnRlbnQ6IGZ1bmN0aW9uKCkge3JldHVybiB5YXNyLnJlc3VsdHMuZ2V0T3JpZ2luYWxSZXNwb25zZSgpO30sXG5cdFx0XHRmaWxlbmFtZTogXCJxdWVyeVJlc3VsdHMuXCIgKyBwbHVnaW4ueWFzci5yZXN1bHRzLmdldFR5cGUoKSxcblx0XHRcdGNvbnRlbnRUeXBlOiAoY29udGVudFR5cGU/IGNvbnRlbnRUeXBlOiBcInRleHQvcGxhaW5cIiksXG5cdFx0XHRidXR0b25UaXRsZTogXCJEb3dubG9hZCByYXcgcmVzcG9uc2VcIlxuXHRcdH07XG5cdH07XG5cdFxuXHRyZXR1cm4gcGx1Z2luO1xufTtcblxucm9vdC5kcmF3ID0gZnVuY3Rpb24ocGx1Z2luKSB7XG5cdHZhciBjbU9wdGlvbnMgPSBwbHVnaW4ub3B0aW9ucy5Db2RlTWlycm9yO1xuXHRjbU9wdGlvbnMudmFsdWUgPSBwbHVnaW4ueWFzci5yZXN1bHRzLmdldE9yaWdpbmFsUmVzcG9uc2VBc1N0cmluZygpO1xuXHRcblx0dmFyIG1vZGUgPSBwbHVnaW4ueWFzci5yZXN1bHRzLmdldFR5cGUoKTtcblx0aWYgKG1vZGUpIHtcblx0XHRpZiAobW9kZSA9PSBcImpzb25cIikge1xuXHRcdFx0bW9kZSA9IHtuYW1lOiBcImphdmFzY3JpcHRcIiwganNvbjogdHJ1ZX07XG5cdFx0fVxuXHRcdGNtT3B0aW9ucy5tb2RlID0gbW9kZTtcblx0fVxuXHRcblx0Q29kZU1pcnJvcihwbHVnaW4ucGFyZW50LmdldCgpWzBdLCBjbU9wdGlvbnMpO1xuXHRcbn07XG5cblxucm9vdC5kZWZhdWx0cyA9IHtcblx0XG5cdENvZGVNaXJyb3I6IHtcblx0XHRyZWFkT25seTogdHJ1ZSxcblx0fVxufTtcblxucm9vdC52ZXJzaW9uID0ge1xuXHRcIllBU1ItcmF3UmVzcG9uc2VcIiA6IHJlcXVpcmUoXCIuLi9wYWNrYWdlLmpzb25cIikudmVyc2lvbixcblx0XCJqcXVlcnlcIjogJC5mbi5qcXVlcnksXG5cdFwiQ29kZU1pcnJvclwiIDogQ29kZU1pcnJvci52ZXJzaW9uXG59O1xufSkuY2FsbCh0aGlzLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xudmFyICQgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5qUXVlcnkgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLmpRdWVyeSA6IG51bGwpO1xucmVxdWlyZShcIi4vLi4vbGliL0RhdGFUYWJsZXMvbWVkaWEvanMvanF1ZXJ5LmRhdGFUYWJsZXMuanNcIik7XG52YXIgaW1ncyA9IHJlcXVpcmUoXCJ5YXNndWktdXRpbHNcIikuaW1ncztcblxuLyoqXG4gKiBDb25zdHJ1Y3RvciBvZiBwbHVnaW4gd2hpY2ggZGlzcGxheXMgcmVzdWx0cyBhcyBhIHRhYmxlXG4gKiBcbiAqIEBwYXJhbSB5YXNyIHtvYmplY3R9XG4gKiBAcGFyYW0gcGFyZW50IHtET00gZWxlbWVudH1cbiAqIEBwYXJhbSBvcHRpb25zIHtvYmplY3R9XG4gKiBAY2xhc3MgWUFTUi5wbHVnaW5zLnRhYmxlXG4gKiBAcmV0dXJuIHlhc3ItdGFibGUgKGRvYylcbiAqIFxuICovXG52YXIgcm9vdCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oeWFzcixwYXJlbnQsIG9wdGlvbnMpIHtcblx0dmFyIHBsdWdpbiA9IHt9O1xuXHRwbHVnaW4ub3B0aW9ucyA9ICQuZXh0ZW5kKHRydWUsIHt9LCByb290LmRlZmF1bHRzLCBvcHRpb25zKTtcblx0cGx1Z2luLnlhc3IgPSB5YXNyO1xuXHRwbHVnaW4ucGFyZW50ID0gcGFyZW50O1xuXHRwbHVnaW4uZHJhdyA9IGZ1bmN0aW9uKCkge1xuXHRcdHJvb3QuZHJhdyhwbHVnaW4pO1xuXHR9O1xuXHQvKipcblx0ICogSHVtYW4tcmVhZGFibGUgbmFtZSBvZiB0aGlzIHBsdWdpbiAodXNlZCBpbiBzZWxlY3Rpb24gd2lkZ2V0KVxuXHQgKiBcblx0ICogQHByb3BlcnR5IHBsdWdpbkRvYy5uYW1lXG5cdCAqIEB0eXBlIHN0cmluZ1xuXHQgKiBAZGVmYXVsdCBcIlRhYmxlXCJcblx0ICovXG5cdHBsdWdpbi5uYW1lID0gXCJUYWJsZVwiO1xuXHQvKipcblx0ICogQ2hlY2sgd2hldGhlciB0aGlzIHBsdWdpbiBjYW4gaGFuZGxlciB0aGUgY3VycmVudCByZXN1bHRzXG5cdCAqIFxuXHQgKiBAcHJvcGVydHkgY2FuSGFuZGxlUmVzdWx0c1xuXHQgKiBAdHlwZSBmdW5jdGlvblxuXHQgKiBAZGVmYXVsdCBJZiByZXN1bHRzZXQgY29udGFpbnMgdmFyaWFibGVzIGluIHRoZSByZXN1bHRzZXQsIHJldHVybiB0cnVlXG5cdCAqL1xuXHRwbHVnaW4uY2FuSGFuZGxlUmVzdWx0cyA9IGZ1bmN0aW9uKHlhc3Ipe1xuXHRcdHJldHVybiB5YXNyLnJlc3VsdHMgJiYgeWFzci5yZXN1bHRzLmdldFZhcmlhYmxlcygpICYmIHlhc3IucmVzdWx0cy5nZXRWYXJpYWJsZXMoKS5sZW5ndGggPiAwO1xuXHR9O1xuXHQvKipcblx0ICogSWYgd2UgbmVlZCB0byBkeW5hbWljYWxseSBjaGVjayB3aGljaCBwbHVnaW4gdG8gdXNlLCB3ZSByYW5rIHRoZSBwb3NzaWJsZSBwbHVnaW5zIGJ5IHByaW9yaXR5LCBhbmQgc2VsZWN0IHRoZSBoaWdoZXN0IG9uZVxuXHQgKiBcblx0ICogQHByb3BlcnR5IGdldFByaW9yaXR5XG5cdCAqIEBwYXJhbSB5YXNyRG9jXG5cdCAqIEB0eXBlIGludHxmdW5jdGlvblxuXHQgKiBAZGVmYXVsdCAxMFxuXHQgKi9cblx0cGx1Z2luLmdldFByaW9yaXR5ID0gIGZ1bmN0aW9uKHlhc3Ipe3JldHVybiAxMDt9O1xuXHRcblx0cGx1Z2luLmdldERvd25sb2FkSW5mbyA9IGZ1bmN0aW9uKCkge1xuXHRcdGlmICghcGx1Z2luLnlhc3IucmVzdWx0cykgcmV0dXJuIG51bGw7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGdldENvbnRlbnQ6IGZ1bmN0aW9uKCl7cmV0dXJuIHJlcXVpcmUoXCIuL2JpbmRpbmdzVG9Dc3YuanNcIikoeWFzci5yZXN1bHRzLmdldEFzSnNvbigpKTt9LFxuXHRcdFx0ZmlsZW5hbWU6IFwicXVlcnlSZXN1bHRzLmNzdlwiLFxuXHRcdFx0Y29udGVudFR5cGU6IFwidGV4dC9jc3ZcIixcblx0XHRcdGJ1dHRvblRpdGxlOiBcIkRvd25sb2FkIGFzIENTVlwiXG5cdFx0fTtcblx0fTtcblx0XG5cdHBsdWdpbi5kaXNhYmxlU2VsZWN0b3JPbiA9IGZ1bmN0aW9uKHlhc3IpIHtcblx0XHRcblx0fTtcblx0cmV0dXJuIHBsdWdpbjtcbn07XG5cbnJvb3QuZHJhdyA9IGZ1bmN0aW9uKHBsdWdpbikge1xuXHRwbHVnaW4udGFibGUgPSAkKCc8dGFibGUgY2VsbHBhZGRpbmc9XCIwXCIgY2VsbHNwYWNpbmc9XCIwXCIgYm9yZGVyPVwiMFwiIGNsYXNzPVwicmVzdWx0c1RhYmxlXCI+PC90YWJsZT4nKTtcblx0JChwbHVnaW4ucGFyZW50KS5odG1sKHBsdWdpbi50YWJsZSk7XG5cblx0dmFyIGRhdGFUYWJsZUNvbmZpZyA9IHBsdWdpbi5vcHRpb25zLmRhdGF0YWJsZTtcblx0ZGF0YVRhYmxlQ29uZmlnLmRhdGEgPSBnZXRSb3dzKHBsdWdpbik7XG5cdGRhdGFUYWJsZUNvbmZpZy5jb2x1bW5zID0gZ2V0VmFyaWFibGVzQXNDb2xzKHBsdWdpbik7XG5cdHBsdWdpbi50YWJsZS5EYXRhVGFibGUoJC5leHRlbmQodHJ1ZSwge30sIGRhdGFUYWJsZUNvbmZpZykpOy8vbWFrZSBjb3B5LiBkYXRhdGFibGVzIGFkZHMgcHJvcGVydGllcyBmb3IgYmFja3dhcmRzIGNvbXBhdGFiaWxpdHkgcmVhc29ucywgYW5kIGRvbid0IHdhbnQgdGhpcyBjbHV0dGVyaW5nIG91ciBvd24gXG5cdFxuXHRcblx0ZHJhd1N2Z0ljb25zKHBsdWdpbik7XG5cdFxuXHRhZGRFdmVudHMocGx1Z2luKTtcblx0XG5cdC8vbW92ZSB0aGUgdGFibGUgdXB3YXJkLCBzbyB0aGUgdGFibGUgb3B0aW9ucyBuaWNlbHkgYWxpZ25zIHdpdGggdGhlIHlhc3IgaGVhZGVyXG5cdHZhciBoZWFkZXJIZWlnaHQgPSBwbHVnaW4ueWFzci5oZWFkZXIub3V0ZXJIZWlnaHQoKSAtIDU7IC8vYWRkIHNvbWUgc3BhY2Ugb2YgNSBweCBiZXR3ZWVuIHRhYmxlIGFuZCB5YXNyIGhlYWRlclxuXHRpZiAoaGVhZGVySGVpZ2h0ID4gMCkge1xuXHRcdHBsdWdpbi55YXNyLmNvbnRhaW5lci5maW5kKFwiLmRhdGFUYWJsZXNfd3JhcHBlclwiKVxuXHRcdC5jc3MoXCJwb3NpdGlvblwiLCBcInJlbGF0aXZlXCIpXG5cdFx0LmNzcyhcInRvcFwiLCBcIi1cIiArIGhlYWRlckhlaWdodCArIFwicHhcIilcblx0XHQuY3NzKFwibWFyZ2luLWJvdHRvbVwiLCBcIi1cIiArIGhlYWRlckhlaWdodCArIFwicHhcIik7XG5cdH1cblx0XG5cdFxufTtcblxuXG52YXIgZ2V0VmFyaWFibGVzQXNDb2xzID0gZnVuY3Rpb24ocGx1Z2luKSB7XG5cdHZhciBjb2xzID0gW107XG5cdGNvbHMucHVzaCh7XCJ0aXRsZVwiOiBcIlwifSk7Ly9yb3cgbnVtYmVyc1xuXHR2YXIgc3BhcnFsVmFycyA9IHBsdWdpbi55YXNyLnJlc3VsdHMuZ2V0VmFyaWFibGVzKCk7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgc3BhcnFsVmFycy5sZW5ndGg7IGkrKykge1xuXHRcdGNvbHMucHVzaCh7XCJ0aXRsZVwiOiBzcGFycWxWYXJzW2ldfSk7XG5cdH1cblx0cmV0dXJuIGNvbHM7XG59O1xuXG52YXIgZ2V0Um93cyA9IGZ1bmN0aW9uKHBsdWdpbikge1xuXHR2YXIgcm93cyA9IFtdO1xuXHR2YXIgYmluZGluZ3MgPSBwbHVnaW4ueWFzci5yZXN1bHRzLmdldEJpbmRpbmdzKCk7XG5cdHZhciB2YXJzID0gcGx1Z2luLnlhc3IucmVzdWx0cy5nZXRWYXJpYWJsZXMoKTtcblx0dmFyIHVzZWRQcmVmaXhlcyA9IG51bGw7XG5cdGlmIChwbHVnaW4ueWFzci5vcHRpb25zLmdldFVzZWRQcmVmaXhlcykge1xuXHRcdHVzZWRQcmVmaXhlcyA9ICh0eXBlb2YgcGx1Z2luLnlhc3Iub3B0aW9ucy5nZXRVc2VkUHJlZml4ZXMgPT0gXCJmdW5jdGlvblwiPyBwbHVnaW4ueWFzci5vcHRpb25zLmdldFVzZWRQcmVmaXhlcyhwbHVnaW4ueWFzcik6ICBwbHVnaW4ueWFzci5vcHRpb25zLmdldFVzZWRQcmVmaXhlcyk7XG5cdH1cblx0Zm9yICh2YXIgcm93SWQgPSAwOyByb3dJZCA8IGJpbmRpbmdzLmxlbmd0aDsgcm93SWQrKykge1xuXHRcdHZhciByb3cgPSBbXTtcblx0XHRyb3cucHVzaChcIlwiKTsvL3JvdyBudW1iZXJzXG5cdFx0dmFyIGJpbmRpbmcgPSBiaW5kaW5nc1tyb3dJZF07XG5cdFx0Zm9yICh2YXIgY29sSWQgPSAwOyBjb2xJZCA8IHZhcnMubGVuZ3RoOyBjb2xJZCsrKSB7XG5cdFx0XHR2YXIgc3BhcnFsVmFyID0gdmFyc1tjb2xJZF07XG5cdFx0XHRpZiAoc3BhcnFsVmFyIGluIGJpbmRpbmcpIHtcblx0XHRcdFx0aWYgKHBsdWdpbi5vcHRpb25zLmRyYXdDZWxsQ29udGVudCkge1xuXHRcdFx0XHRcdHJvdy5wdXNoKHBsdWdpbi5vcHRpb25zLmRyYXdDZWxsQ29udGVudChyb3dJZCwgY29sSWQsIGJpbmRpbmdbc3BhcnFsVmFyXSwgdXNlZFByZWZpeGVzKSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cm93LnB1c2goXCJcIik7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJvdy5wdXNoKFwiXCIpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyb3dzLnB1c2gocm93KTtcblx0fVxuXHRyZXR1cm4gcm93cztcbn07XG5cblxucm9vdC5nZXRGb3JtYXR0ZWRWYWx1ZUZyb21CaW5kaW5nID0gZnVuY3Rpb24ocm93SWQsIGNvbElkLCBiaW5kaW5nLCB1c2VkUHJlZml4ZXMpIHtcblx0dmFyIHZhbHVlID0gbnVsbDtcblx0aWYgKGJpbmRpbmcudHlwZSA9PSBcInVyaVwiKSB7XG5cdFx0dmFyIGhyZWYgPSB2aXNpYmxlU3RyaW5nID0gYmluZGluZy52YWx1ZTtcblx0XHRpZiAodXNlZFByZWZpeGVzKSB7XG5cdFx0XHRmb3IgKHZhciBwcmVmaXggaW4gdXNlZFByZWZpeGVzKSB7XG5cdFx0XHRcdGlmICh2aXNpYmxlU3RyaW5nLmluZGV4T2YodXNlZFByZWZpeGVzW3ByZWZpeF0pID09IDApIHtcblx0XHRcdFx0XHR2aXNpYmxlU3RyaW5nID0gcHJlZml4ICsgaHJlZi5zdWJzdHJpbmcodXNlZFByZWZpeGVzW3ByZWZpeF0ubGVuZ3RoKTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHR2YWx1ZSA9IFwiPGEgY2xhc3M9J3VyaScgdGFyZ2V0PSdfYmxhbmsnIGhyZWY9J1wiICsgaHJlZiArIFwiJz5cIiArIHZpc2libGVTdHJpbmcgKyBcIjwvYT5cIjtcblx0fSBlbHNlIHtcblx0XHR2YXIgc3RyaW5nUmVwcmVzZW50YXRpb24gPSBiaW5kaW5nLnZhbHVlO1xuXHRcdGlmIChiaW5kaW5nW1wieG1sOmxhbmdcIl0pIHtcblx0XHRcdHN0cmluZ1JlcHJlc2VudGF0aW9uID0gJ1wiJyArIGJpbmRpbmcudmFsdWUgKyAnXCJAJyArIGJpbmRpbmdbXCJ4bWw6bGFuZ1wiXTtcblx0XHR9IGVsc2UgaWYgKGJpbmRpbmcuZGF0YXR5cGUpIHtcblx0XHRcdHZhciB4bWxTY2hlbWFOcyA9IFwiaHR0cDovL3d3dy53My5vcmcvMjAwMS9YTUxTY2hlbWEjXCI7XG5cdFx0XHR2YXIgZGF0YVR5cGUgPSBiaW5kaW5nLmRhdGF0eXBlO1xuXHRcdFx0aWYgKGRhdGFUeXBlLmluZGV4T2YoeG1sU2NoZW1hTnMpID09IDApIHtcblx0XHRcdFx0ZGF0YVR5cGUgPSBcInhzZDpcIiArIGRhdGFUeXBlLnN1YnN0cmluZyh4bWxTY2hlbWFOcy5sZW5ndGgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZGF0YVR5cGUgPSBcIjxcIiArIGRhdGFUeXBlICsgXCI+XCI7XG5cdFx0XHR9XG5cdFx0XHRcblx0XHRcdHN0cmluZ1JlcHJlc2VudGF0aW9uID0gJ1wiJyArIHN0cmluZ1JlcHJlc2VudGF0aW9uICsgJ1wiXl4nICsgZGF0YVR5cGU7XG5cdFx0fVxuXHRcdFxuXHRcdHZhbHVlID0gXCI8c3BhbiBjbGFzcz0nbm9uVXJpJz5cIiArIHN0cmluZ1JlcHJlc2VudGF0aW9uICsgXCI8L3NwYW4+XCI7XG5cdH1cblx0cmV0dXJuIHZhbHVlO1xufTtcbnZhciBnZXRFeHRlcm5hbExpbmtFbGVtZW50ID0gZnVuY3Rpb24oKSB7XG5cdHZhciBlbGVtZW50ID0gJChcIiNleHRlcm5hbExpbmtcIik7XG5cdGlmIChlbGVtZW50Lmxlbmd0aCA9PSAwKSB7XG5cdFx0ZWxlbWVudCA9ICQoXCI8aW1nIGlkPSdleHRlcm5hbExpbmsnIHNyYz0nXCIgKyBZYXNndWkuY29uc3RhbnRzLmltZ3MuZXh0ZXJuYWxMaW5rLmdldCgpICsgXCInPjwvaW1nPlwiKVxuXHRcdFx0Lm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcblx0XHRcdFx0d2luZG93Lm9wZW4oJCh0aGlzKS5wYXJlbnQoKS50ZXh0KCkpO1xuXHRcdFx0fSk7XG5cdH1cblx0cmV0dXJuIGVsZW1lbnQ7XG59O1xudmFyIGV4ZWN1dGVTbm9ycWxRdWVyeSA9IGZ1bmN0aW9uKHVyaSkge1xuXHRjb25zb2xlLmxvZyhcImV4ZWMgc25vcnFsXCIpO1xuLy9cdHZhciBuZXdRdWVyeSA9IFlhc2d1aS5zZXR0aW5ncy5kZWZhdWx0cy50YWJ1bGFyQnJvd3NpbmdUZW1wbGF0ZTtcbi8vXHRuZXdRdWVyeSA9IG5ld1F1ZXJ5LnJlcGxhY2UoLzxVUkk+L2csIFwiPFwiICsgdXJpICsgXCI+XCIpO1xuLy9cdFlhc2d1aS5zZXR0aW5ncy5nZXRDdXJyZW50VGFiKCkucXVlcnkgPSBuZXdRdWVyeTtcbi8vXHRZYXNndWkudGFicy5nZXRDdXJyZW50VGFiKCkuY20ucmVsb2FkRnJvbVNldHRpbmdzKCk7XG4vL1x0WWFzZ3VpLnNwYXJxbC5xdWVyeSgpO1xufTtcblxudmFyIGFkZEV2ZW50cyA9IGZ1bmN0aW9uKHBsdWdpbikge1xuXHRwbHVnaW4udGFibGUub24oICdvcmRlci5kdCcsIGZ1bmN0aW9uICgpIHtcblx0ICAgIGRyYXdTdmdJY29ucyhwbHVnaW4pO1xuXHR9KTtcblx0XG5cdHBsdWdpbi50YWJsZS5kZWxlZ2F0ZShcInRkXCIsIFwiY2xpY2tcIiwgZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRpZiAocGx1Z2luLm9wdGlvbnMuaGFuZGxlcnMgJiYgcGx1Z2luLm9wdGlvbnMuaGFuZGxlcnMub25DZWxsQ2xpY2spIHtcblx0XHRcdHZhciByZXN1bHQgPSBwbHVnaW4ub3B0aW9ucy5oYW5kbGVycy5vbkNlbGxDbGljayh0aGlzLCBldmVudCk7XG5cdFx0XHRpZiAocmVzdWx0ID09PSBmYWxzZSkgcmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fSkuZGVsZWdhdGUoXCJ0ZFwiLCdtb3VzZWVudGVyJywgZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRpZiAocGx1Z2luLm9wdGlvbnMuaGFuZGxlcnMgJiYgcGx1Z2luLm9wdGlvbnMuaGFuZGxlcnMub25DZWxsTW91c2VFbnRlcikge1xuXHRcdFx0cGx1Z2luLm9wdGlvbnMuaGFuZGxlcnMub25DZWxsTW91c2VFbnRlcih0aGlzLCBldmVudCk7XG5cdFx0fVxuXHRcdHZhciB0ZEVsID0gJCh0aGlzKTtcblx0XHRpZiAocGx1Z2luLm9wdGlvbnMuZmV0Y2hUaXRsZXNGcm9tUHJlZmxhYmVsIFxuXHRcdFx0XHQmJiB0ZEVsLmF0dHIoXCJ0aXRsZVwiKSA9PT0gdW5kZWZpbmVkXG5cdFx0XHRcdCYmIHRkRWwudGV4dCgpLnRyaW0oKS5pbmRleE9mKFwiaHR0cFwiKSA9PSAwKSB7XG5cdFx0XHRhZGRQcmVmTGFiZWwodGRFbCk7XG5cdFx0fVxuXHR9KS5kZWxlZ2F0ZShcInRkXCIsJ21vdXNlbGVhdmUnLCBmdW5jdGlvbihldmVudCkge1xuXHRcdGlmIChwbHVnaW4ub3B0aW9ucy5oYW5kbGVycyAmJiBwbHVnaW4ub3B0aW9ucy5oYW5kbGVycy5vbkNlbGxNb3VzZUxlYXZlKSB7XG5cdFx0XHRwbHVnaW4ub3B0aW9ucy5oYW5kbGVycy5vbkNlbGxNb3VzZUxlYXZlKHRoaXMsIGV2ZW50KTtcblx0XHRcdFxuXHRcdH1cblx0fSk7XG59O1xuXG52YXIgYWRkUHJlZkxhYmVsID0gZnVuY3Rpb24odGQpIHtcblx0dmFyIGFkZEVtcHR5VGl0bGUgPSBmdW5jdGlvbigpIHtcblx0XHR0ZC5hdHRyKFwidGl0bGVcIixcIlwiKTsvL3RoaXMgYXZvaWRzIHRyeWluZyB0byBmZXRjaCB0aGUgbGFiZWwgYWdhaW4gb24gbmV4dCBob3ZlclxuXHR9O1xuXHQkLmdldChcImh0dHA6Ly9wcmVmbGFiZWwub3JnL2FwaS92MS9sYWJlbC9cIiArIGVuY29kZVVSSUNvbXBvbmVudCh0ZC50ZXh0KCkpICsgXCI/c2lsZW50PXRydWVcIilcblx0XHQuc3VjY2VzcyhmdW5jdGlvbihkYXRhKSB7XG5cdFx0XHRpZiAodHlwZW9mIGRhdGEgPT0gXCJvYmplY3RcIiAmJiBkYXRhLmxhYmVsKSB7XG5cdFx0XHRcdHRkLmF0dHIoXCJ0aXRsZVwiLCBkYXRhLmxhYmVsKTtcblx0XHRcdH0gZWxzZSBpZiAodHlwZW9mIGRhdGEgPT0gXCJzdHJpbmdcIiAmJiBkYXRhLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdHRkLmF0dHIoXCJ0aXRsZVwiLCBkYXRhKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGFkZEVtcHR5VGl0bGUoKTtcblx0XHRcdH1cblx0XHRcdFxuXHRcdH0pXG5cdFx0LmZhaWwoYWRkRW1wdHlUaXRsZSk7XG59O1xuXG52YXIgZHJhd1N2Z0ljb25zID0gZnVuY3Rpb24ocGx1Z2luKSB7XG5cdHZhciBzb3J0aW5ncyA9IHtcblx0XHRcInNvcnRpbmdcIjogXCJ1bnNvcnRlZFwiLFxuXHRcdFwic29ydGluZ19hc2NcIjogXCJzb3J0QXNjXCIsXG5cdFx0XCJzb3J0aW5nX2Rlc2NcIjogXCJzb3J0RGVzY1wiXG5cdH07XG5cdHBsdWdpbi50YWJsZS5maW5kKFwiLnNvcnRJY29uc1wiKS5yZW1vdmUoKTtcblx0Zm9yICh2YXIgc29ydGluZyBpbiBzb3J0aW5ncykge1xuXHRcdHZhciBzdmdEaXYgPSAkKFwiPGRpdiBjbGFzcz0nc29ydEljb25zJz48L2Rpdj5cIikuY3NzKFwiZmxvYXRcIiwgXCJyaWdodFwiKS5jc3MoXCJtYXJnaW4tcmlnaHRcIiwgXCItMTJweFwiKS53aWR0aCgxMCkuaGVpZ2h0KDE1KTtcblx0XHRpbWdzLmRyYXcoc3ZnRGl2LCB7aWQ6IHNvcnRpbmdzW3NvcnRpbmddLCB3aWR0aDogMTIsIGhlaWdodDogMTZ9KTtcblx0XHRwbHVnaW4udGFibGUuZmluZChcInRoLlwiICsgc29ydGluZykuYXBwZW5kKHN2Z0Rpdik7XG5cdH1cbn07XG5yb290Lm9wZW5DZWxsVXJpSW5OZXdXaW5kb3cgPSBmdW5jdGlvbihjZWxsKSB7XG5cdGlmIChjZWxsLmNsYXNzTmFtZS5pbmRleE9mKFwidXJpXCIpID49IDApIHtcblx0XHR3aW5kb3cub3Blbih0aGlzLmlubmVySFRNTCk7XG5cdH1cbn07XG5cbi8qKlxuICogRGVmYXVsdHMgZm9yIHRhYmxlIHBsdWdpblxuICogXG4gKiBAdHlwZSBvYmplY3RcbiAqIEBhdHRyaWJ1dGUgWUFTUi5wbHVnaW5zLnRhYmxlLmRlZmF1bHRzXG4gKi9cbnJvb3QuZGVmYXVsdHMgPSB7XG5cdFxuXHQvKipcblx0ICogRHJhdyB0aGUgY2VsbCBjb250ZW50LCBmcm9tIGEgZ2l2ZW4gYmluZGluZ1xuXHQgKiBcblx0ICogQHByb3BlcnR5IGRyYXdDZWxsQ29udGVudFxuXHQgKiBAcGFyYW0gYmluZGluZyB7b2JqZWN0fVxuXHQgKiBAdHlwZSBmdW5jdGlvblxuXHQgKiBAcmV0dXJuIHN0cmluZ1xuXHQgKiBAZGVmYXVsdCBZQVNSLnBsdWdpbnMudGFibGUuZ2V0Rm9ybWF0dGVkVmFsdWVGcm9tQmluZGluZ1xuXHQgKi9cblx0ZHJhd0NlbGxDb250ZW50OiByb290LmdldEZvcm1hdHRlZFZhbHVlRnJvbUJpbmRpbmcsXG5cdFxuXHQvKipcblx0ICogVHJ5IHRvIGZldGNoIHRoZSBsYWJlbCByZXByZXNlbnRhdGlvbiBmb3IgZWFjaCBVUkksIHVzaW5nIHRoZSBwcmVmbGFiZWwub3JnIHNlcnZpY2VzLiAoZmV0Y2hpbmcgb2NjdXJzIHdoZW4gaG92ZXJpbmcgb3ZlciB0aGUgY2VsbClcblx0ICogXG5cdCAqIEBwcm9wZXJ0eSBmZXRjaFRpdGxlc0Zyb21QcmVmbGFiZWxcblx0ICogQHR5cGUgYm9vbGVhblxuXHQgKiBAZGVmYXVsdCB0cnVlXG5cdCAqL1xuXHRmZXRjaFRpdGxlc0Zyb21QcmVmbGFiZWw6IHRydWUsXG5cdC8qKlxuXHQgKiBTZXQgYSBudW1iZXIgb2YgaGFuZGxlcnMgZm9yIHRoZSB0YWJsZVxuXHQgKiBcblx0ICogQHByb3BlcnR5IGhhbmRsZXJzXG5cdCAqIEB0eXBlIG9iamVjdFxuXHQgKi9cblx0aGFuZGxlcnM6IHtcblx0XHQvKipcblx0XHQgKiBNb3VzZS1lbnRlci1jZWxsIGV2ZW50XG5cdFx0ICogXG5cdFx0ICogQHByb3BlcnR5IGhhbmRsZXJzLm9uQ2VsbE1vdXNlRW50ZXJcblx0XHQgKiBAdHlwZSBmdW5jdGlvblxuXHRcdCAqIEBwYXJhbSB0ZC1lbGVtZW50XG5cdFx0ICogQGRlZmF1bHQgbnVsbFxuXHRcdCAqL1xuXHRcdG9uQ2VsbE1vdXNlRW50ZXI6IG51bGwsXG5cdFx0LyoqXG5cdFx0ICogTW91c2UtbGVhdmUtY2VsbCBldmVudFxuXHRcdCAqIFxuXHRcdCAqIEBwcm9wZXJ0eSBoYW5kbGVycy5vbkNlbGxNb3VzZUxlYXZlXG5cdFx0ICogQHR5cGUgZnVuY3Rpb25cblx0XHQgKiBAcGFyYW0gdGQtZWxlbWVudFxuXHRcdCAqIEBkZWZhdWx0IG51bGxcblx0XHQgKi9cblx0XHRvbkNlbGxNb3VzZUxlYXZlOiBudWxsLFxuXHRcdC8qKlxuXHRcdCAqIENlbGwgY2xpY2tlZCBldmVudFxuXHRcdCAqIFxuXHRcdCAqIEBwcm9wZXJ0eSBoYW5kbGVycy5vbkNlbGxDbGlja1xuXHRcdCAqIEB0eXBlIGZ1bmN0aW9uXG5cdFx0ICogQHBhcmFtIHRkLWVsZW1lbnRcblx0XHQgKiBAZGVmYXVsdCBudWxsXG5cdFx0ICovXG5cdFx0b25DZWxsQ2xpY2s6IG51bGxcblx0fSxcblx0LyoqXG5cdCAqIFRoaXMgcGx1Z2luIHVzZXMgdGhlIGRhdGF0YWJsZXMganF1ZXJ5IHBsdWdpbiAoU2VlIGRhdGF0YWJsZXMubmV0KS4gRm9yIGFueSBkYXRhdGFibGVzIHNwZWNpZmljIGRlZmF1bHRzLCBjaGFuZ2UgdGhpcyBvYmplY3QuIFxuXHQgKiBTZWUgdGhlIGRhdGF0YWJsZXMgcmVmZXJlbmNlIGZvciBtb3JlIGluZm9ybWF0aW9uXG5cdCAqIFxuXHQgKiBAcHJvcGVydHkgZGF0YXRhYmxlXG5cdCAqIEB0eXBlIG9iamVjdFxuXHQgKi9cblx0ZGF0YXRhYmxlOiB7XG5cdFx0XCJvcmRlclwiOiBbXSwvL2Rpc2FibGUgaW5pdGlhbCBzb3J0aW5nXG5cdFx0XCJwYWdlTGVuZ3RoXCI6IDUwLC8vZGVmYXVsdCBwYWdlIGxlbmd0aFxuICAgIFx0XCJsZW5ndGhNZW51XCI6IFtbMTAsIDUwLCAxMDAsIDEwMDAsIC0xXSwgWzEwLCA1MCwgMTAwLCAxMDAwLCBcIkFsbFwiXV0sLy9wb3NzaWJsZSBwYWdlIGxlbmd0aHNcbiAgICBcdFwibGVuZ3RoQ2hhbmdlXCI6IHRydWUsLy9hbGxvdyBjaGFuZ2luZyBwYWdlIGxlbmd0aFxuICAgIFx0XCJwYWdpbmdUeXBlXCI6IFwiZnVsbF9udW1iZXJzXCIsLy9ob3cgdG8gc2hvdyB0aGUgcGFnaW5hdGlvbiBvcHRpb25zXG4gICAgICAgIFwiZHJhd0NhbGxiYWNrXCI6IGZ1bmN0aW9uICggb1NldHRpbmdzICkge1xuICAgICAgICBcdC8vdHJpY2sgdG8gc2hvdyByb3cgbnVtYmVyc1xuICAgICAgICBcdGZvciAoIHZhciBpID0gMDsgaSA8IG9TZXR0aW5ncy5haURpc3BsYXkubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0JCgndGQ6ZXEoMCknLG9TZXR0aW5ncy5hb0RhdGFbb1NldHRpbmdzLmFpRGlzcGxheVtpXV0ublRyKS5odG1sKGkgKyAxKTtcblx0XHRcdH1cbiAgICAgICAgXHRcbiAgICAgICAgXHQvL0hpZGUgcGFnaW5hdGlvbiB3aGVuIHdlIGhhdmUgYSBzaW5nbGUgcGFnZVxuICAgICAgICBcdHZhciBhY3RpdmVQYWdpbmF0ZUJ1dHRvbiA9IGZhbHNlO1xuICAgICAgICBcdCQob1NldHRpbmdzLm5UYWJsZVdyYXBwZXIpLmZpbmQoXCIucGFnaW5hdGVfYnV0dG9uXCIpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgIFx0XHRpZiAoJCh0aGlzKS5hdHRyKFwiY2xhc3NcIikuaW5kZXhPZihcImN1cnJlbnRcIikgPT0gLTEgJiYgJCh0aGlzKS5hdHRyKFwiY2xhc3NcIikuaW5kZXhPZihcImRpc2FibGVkXCIpID09IC0xKSB7XG4gICAgICAgIFx0XHRcdGFjdGl2ZVBhZ2luYXRlQnV0dG9uID0gdHJ1ZTtcbiAgICAgICAgXHRcdH1cbiAgICAgICAgXHR9KTtcbiAgICAgICAgXHRpZiAoYWN0aXZlUGFnaW5hdGVCdXR0b24pIHtcbiAgICAgICAgXHRcdCQob1NldHRpbmdzLm5UYWJsZVdyYXBwZXIpLmZpbmQoXCIuZGF0YVRhYmxlc19wYWdpbmF0ZVwiKS5zaG93KCk7XG4gICAgICAgIFx0fSBlbHNlIHtcbiAgICAgICAgXHRcdCQob1NldHRpbmdzLm5UYWJsZVdyYXBwZXIpLmZpbmQoXCIuZGF0YVRhYmxlc19wYWdpbmF0ZVwiKS5oaWRlKCk7XG4gICAgICAgIFx0fVxuXHRcdH0sXG5cdFx0XCJjb2x1bW5EZWZzXCI6IFtcblx0XHRcdHsgXCJ3aWR0aFwiOiBcIjEycHhcIiwgXCJvcmRlcmFibGVcIjogZmFsc2UsIFwidGFyZ2V0c1wiOiAwICB9Ly9kaXNhYmxlIHJvdyBzb3J0aW5nIGZvciBmaXJzdCBjb2xcblx0XHRdLFxuXHR9LFxufTtcblxucm9vdC52ZXJzaW9uID0ge1xuXHRcIllBU1ItdGFibGVcIiA6IHJlcXVpcmUoXCIuLi9wYWNrYWdlLmpzb25cIikudmVyc2lvbixcblx0XCJqcXVlcnlcIjogJC5mbi5qcXVlcnksXG5cdFwianF1ZXJ5LWRhdGF0YWJsZXNcIjogJC5mbi5EYXRhVGFibGUudmVyc2lvblxufTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIl19
