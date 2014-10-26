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
			.append(require("yasgui-utils").svg.getElement(require('./imgs.js').download, {width: "15px", height: "15px"}))
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
			return "selector_" + $(yasr.container).closest('[id]').attr('id');
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
				return "results_" +  $(yasr.container).closest('[id]').attr('id');
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
},{"../package.json":11,"./boolean.js":13,"./error.js":14,"./imgs.js":15,"./parsers/wrapper.js":20,"./rawResponse.js":22,"./table.js":23,"yasgui-utils":8}],2:[function(require,module,exports){
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
  var wordRE = parserConfig.wordCharacters || /[\w$\xa1-\uffff]/;

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
    if (type == ",") return cont(commasep(maybeexpressionNoComma, "]"));
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

    electricInput: /^\s*(?:case .*?:|default:|\{|\})$/,
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
  "version": "1.4.1",
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
  "author": "Laurens Rietveld",
  "maintainers": [
    {
      "name": "Laurens Rietveld",
      "email": "laurens.rietveld@gmail.com",
      "web": "http://laurensrietveld.nl"
    }
  ],
  "bugs": {
    "url": "https://github.com/YASGUI/Utils/issues"
  },
  "homepage": "https://github.com/YASGUI/Utils",
  "dependencies": {
    "store": "^1.3.14"
  }
}

},{}],8:[function(require,module,exports){
window.console = window.console || {"log":function(){}};//make sure any console statements don't break IE
module.exports = {
	storage: require("./storage.js"),
	svg: require("./svg.js"),
	version: {
		"yasgui-utils" : require("../package.json").version,
	}
};

},{"../package.json":7,"./storage.js":9,"./svg.js":10}],9:[function(require,module,exports){
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
		//try to store string for dom objects (e.g. XML result). Otherwise, we might get a circular reference error when stringifying this
		if (val.documentElement) val = new XMLSerializer().serializeToString(val.documentElement);
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

},{"store":6}],10:[function(require,module,exports){
module.exports = {
	draw: function(parent, svgString, config) {
		if (!parent) return;
		var el = module.exports.getElement(svgString, config);
		if (el) {
			if (parent.append) {
				parent.append(el);
			} else {
				//regular dom doc
				parent.appendChild(el);
			}
		}
	},
	getElement: function(svgString, config) {
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
},{}],11:[function(require,module,exports){
module.exports={
  "name": "yasgui-yasr",
  "description": "Yet Another SPARQL Resultset GUI",
  "version": "1.2.3",
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
    "vinyl-buffer": "^1.0.0",
    "vinyl-source-stream": "~0.1.1",
    "watchify": "^0.6.4",
    "browserify-shim": "^3.8.0",
    "gulp-sourcemaps": "^1.2.4",
    "exorcist": "^0.1.6",
    "vinyl-transform": "0.0.1"
  },
  "bugs": "https://github.com/YASGUI/YASR/issues/",
  "keywords": [
    "JavaScript",
    "SPARQL",
    "Editor",
    "Semantic Web",
    "Linked Data"
  ],
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
    "yasgui-utils": "^1.4.1",
    "yasgui-yasqe": "^1.5.1"
  },
  "browserify-shim": {
    "jquery": "global:jQuery",
    "codemirror": "global:CodeMirror",
    "../../lib/codemirror": "global:CodeMirror"
  }
}

},{}],12:[function(require,module,exports){
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
},{}],13:[function(require,module,exports){
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
	if (imgId) require("yasgui-utils").svg.draw(plugin.container, require('./imgs.js')[imgId], {
		width: 25,
		height: 25,
	});
	
	$("<span></span>").text(textVal).appendTo(plugin.container);
};

root.version = {
	"YASR-boolean" : require("../package.json").version,
	"jquery": $.fn.jquery,
};


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../package.json":11,"./imgs.js":15,"yasgui-utils":8}],14:[function(require,module,exports){
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
},{}],15:[function(require,module,exports){
module.exports = {
	cross: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" width="30px" height="30px" viewBox="0 0 100 100" enable-background="new 0 0 100 100" xml:space="preserve"><g>	<path d="M83.288,88.13c-2.114,2.112-5.575,2.112-7.689,0L53.659,66.188c-2.114-2.112-5.573-2.112-7.687,0L24.251,87.907   c-2.113,2.114-5.571,2.114-7.686,0l-4.693-4.691c-2.114-2.114-2.114-5.573,0-7.688l21.719-21.721c2.113-2.114,2.113-5.573,0-7.686   L11.872,24.4c-2.114-2.113-2.114-5.571,0-7.686l4.842-4.842c2.113-2.114,5.571-2.114,7.686,0L46.12,33.591   c2.114,2.114,5.572,2.114,7.688,0l21.721-21.719c2.114-2.114,5.573-2.114,7.687,0l4.695,4.695c2.111,2.113,2.111,5.571-0.003,7.686   L66.188,45.973c-2.112,2.114-2.112,5.573,0,7.686L88.13,75.602c2.112,2.111,2.112,5.572,0,7.687L83.288,88.13z"/></g></svg>',
	check: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" width="30px" height="30px" viewBox="0 0 100 100" enable-background="new 0 0 100 100" xml:space="preserve"><path fill="#000000" d="M14.301,49.982l22.606,17.047L84.361,4.903c2.614-3.733,7.76-4.64,11.493-2.026l0.627,0.462  c3.732,2.614,4.64,7.758,2.025,11.492l-51.783,79.77c-1.955,2.791-3.896,3.762-7.301,3.988c-3.405,0.225-5.464-1.039-7.508-3.084  L2.447,61.814c-3.263-3.262-3.263-8.553,0-11.814l0.041-0.019C5.75,46.718,11.039,46.718,14.301,49.982z"/></svg>',
	unsorted: '<svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   version="1.1"   id="Layer_1"   x="0px"   y="0px"   width="100%"   height="100%"   viewBox="0 0 54.552711 113.78478"   enable-background="new 0 0 100 100"   xml:space="preserve"><g     id="g5"     transform="matrix(-0.70522156,-0.70898699,-0.70898699,0.70522156,97.988199,55.081205)"><path       style="fill:#000000"       inkscape:connector-curvature="0"       id="path7"       d="M 57.911,66.915 45.808,55.063 42.904,52.238 31.661,41.25 31.435,41.083 31.131,40.775 30.794,40.523 30.486,40.3 30.069,40.05 29.815,39.911 29.285,39.659 29.089,39.576 28.474,39.326 28.363,39.297 H 28.336 L 27.665,39.128 27.526,39.1 26.94,38.99 26.714,38.961 26.212,38.934 h -0.31 -0.444 l -0.339,0.027 c -1.45,0.139 -2.876,0.671 -4.11,1.564 l -0.223,0.141 -0.279,0.25 -0.335,0.308 -0.054,0.029 -0.171,0.194 -0.334,0.364 -0.224,0.279 -0.25,0.336 -0.225,0.362 -0.192,0.308 -0.197,0.421 -0.142,0.279 -0.193,0.477 -0.084,0.222 -12.441,38.414 c -0.814,2.458 -0.313,5.029 1.115,6.988 v 0.026 l 0.418,0.532 0.17,0.165 0.251,0.281 0.084,0.079 0.283,0.281 0.25,0.194 0.474,0.367 0.083,0.053 c 2.015,1.371 4.641,1.874 7.131,1.094 L 55.228,80.776 c 4.303,-1.342 6.679,-5.814 5.308,-10.006 -0.387,-1.259 -1.086,-2.35 -1.979,-3.215 l -0.368,-0.337 -0.278,-0.303 z m -6.318,5.896 0.079,0.114 -37.369,11.57 11.854,-36.538 10.565,10.317 2.876,2.825 11.995,11.712 z" /></g><path     style="fill:#000000"     inkscape:connector-curvature="0"     id="path7-9"     d="m 8.8748339,52.571766 16.9382111,-0.222584 4.050851,-0.06665 15.719154,-0.222166 0.27778,-0.04246 0.43276,0.0017 0.41632,-0.06121 0.37532,-0.0611 0.47132,-0.119342 0.27767,-0.08206 0.55244,-0.198047 0.19707,-0.08043 0.61095,-0.259721 0.0988,-0.05825 0.019,-0.01914 0.59303,-0.356548 0.11787,-0.0788 0.49125,-0.337892 0.17994,-0.139779 0.37317,-0.336871 0.21862,-0.219786 0.31311,-0.31479 0.21993,-0.259387 c 0.92402,-1.126057 1.55249,-2.512251 1.78961,-4.016904 l 0.0573,-0.25754 0.0195,-0.374113 0.0179,-0.454719 0.0175,-0.05874 -0.0169,-0.258049 -0.0225,-0.493503 -0.0398,-0.355569 -0.0619,-0.414201 -0.098,-0.414812 -0.083,-0.353334 L 53.23955,41.1484 53.14185,40.850967 52.93977,40.377742 52.84157,40.161628 34.38021,4.2507375 C 33.211567,1.9401875 31.035446,0.48226552 28.639484,0.11316952 l -0.01843,-0.01834 -0.671963,-0.07882 -0.236871,0.0042 L 27.335984,-4.7826577e-7 27.220736,0.00379952 l -0.398804,0.0025 -0.313848,0.04043 -0.594474,0.07724 -0.09611,0.02147 C 23.424549,0.60716252 21.216017,2.1142355 20.013025,4.4296865 L 0.93967491,40.894479 c -2.08310801,3.997178 -0.588125,8.835482 3.35080799,10.819749 1.165535,0.613495 2.43199,0.88731 3.675026,0.864202 l 0.49845,-0.02325 0.410875,0.01658 z M 9.1502369,43.934401 9.0136999,43.910011 27.164145,9.2564625 44.70942,43.42818 l -14.765289,0.214677 -4.031106,0.0468 -16.7627881,0.244744 z" /></svg>',
	sortDesc: '<svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   version="1.1"   id="Layer_1"   x="0px"   y="0px"   width="100%"   height="100%"   viewBox="0 0 54.552711 113.78478"   enable-background="new 0 0 100 100"   xml:space="preserve"><g     id="g5"     transform="matrix(-0.70522156,-0.70898699,-0.70898699,0.70522156,97.988199,55.081205)"><path       style="fill:#000000"       inkscape:connector-curvature="0"       id="path7"       d="M 57.911,66.915 45.808,55.063 42.904,52.238 31.661,41.25 31.435,41.083 31.131,40.775 30.794,40.523 30.486,40.3 30.069,40.05 29.815,39.911 29.285,39.659 29.089,39.576 28.474,39.326 28.363,39.297 H 28.336 L 27.665,39.128 27.526,39.1 26.94,38.99 26.714,38.961 26.212,38.934 h -0.31 -0.444 l -0.339,0.027 c -1.45,0.139 -2.876,0.671 -4.11,1.564 l -0.223,0.141 -0.279,0.25 -0.335,0.308 -0.054,0.029 -0.171,0.194 -0.334,0.364 -0.224,0.279 -0.25,0.336 -0.225,0.362 -0.192,0.308 -0.197,0.421 -0.142,0.279 -0.193,0.477 -0.084,0.222 -12.441,38.414 c -0.814,2.458 -0.313,5.029 1.115,6.988 v 0.026 l 0.418,0.532 0.17,0.165 0.251,0.281 0.084,0.079 0.283,0.281 0.25,0.194 0.474,0.367 0.083,0.053 c 2.015,1.371 4.641,1.874 7.131,1.094 L 55.228,80.776 c 4.303,-1.342 6.679,-5.814 5.308,-10.006 -0.387,-1.259 -1.086,-2.35 -1.979,-3.215 l -0.368,-0.337 -0.278,-0.303 z m -6.318,5.896 0.079,0.114 -37.369,11.57 11.854,-36.538 10.565,10.317 2.876,2.825 11.995,11.712 z" /></g><path     style="fill:#000000"     inkscape:connector-curvature="0"     id="path9"     d="m 27.813273,0.12823506 0.09753,0.02006 c 2.39093,0.458209 4.599455,1.96811104 5.80244,4.28639004 L 52.785897,40.894525 c 2.088044,4.002139 0.590949,8.836902 -3.348692,10.821875 -1.329078,0.688721 -2.766603,0.943695 -4.133174,0.841768 l -0.454018,0.02 L 27.910392,52.354171 23.855313,52.281851 8.14393,52.061827 7.862608,52.021477 7.429856,52.021738 7.014241,51.959818 6.638216,51.900838 6.164776,51.779369 5.889216,51.699439 5.338907,51.500691 5.139719,51.419551 4.545064,51.145023 4.430618,51.105123 4.410168,51.084563 3.817138,50.730843 3.693615,50.647783 3.207314,50.310611 3.028071,50.174369 2.652795,49.833957 2.433471,49.613462 2.140099,49.318523 1.901127,49.041407 C 0.97781,47.916059 0.347935,46.528448 0.11153,45.021676 L 0.05352,44.766255 0.05172,44.371683 0.01894,43.936017 0,43.877277 0.01836,43.62206 0.03666,43.122889 0.0765,42.765905 0.13912,42.352413 0.23568,41.940425 0.32288,41.588517 0.481021,41.151945 0.579391,40.853806 0.77369,40.381268 0.876097,40.162336 19.338869,4.2542801 c 1.172169,-2.308419 3.34759,-3.76846504 5.740829,-4.17716604 l 0.01975,0.01985 0.69605,-0.09573 0.218437,0.0225 0.490791,-0.02132 0.39809,0.0046 0.315972,0.03973 0.594462,0.08149 z" /></svg>',
	sortAsc: '<svg   xmlns:dc="http://purl.org/dc/elements/1.1/"   xmlns:cc="http://creativecommons.org/ns#"   xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"   xmlns:svg="http://www.w3.org/2000/svg"   xmlns="http://www.w3.org/2000/svg"   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"   version="1.1"   id="Layer_1"   x="0px"   y="0px"   width="100%"   height="100%"   viewBox="0 0 54.552711 113.78478"   enable-background="new 0 0 100 100"   xml:space="preserve"><g     id="g5"     transform="matrix(-0.70522156,0.70898699,-0.70898699,-0.70522156,97.988199,58.704807)"><path       style="fill:#000000"       inkscape:connector-curvature="0"       id="path7"       d="M 57.911,66.915 45.808,55.063 42.904,52.238 31.661,41.25 31.435,41.083 31.131,40.775 30.794,40.523 30.486,40.3 30.069,40.05 29.815,39.911 29.285,39.659 29.089,39.576 28.474,39.326 28.363,39.297 H 28.336 L 27.665,39.128 27.526,39.1 26.94,38.99 26.714,38.961 26.212,38.934 h -0.31 -0.444 l -0.339,0.027 c -1.45,0.139 -2.876,0.671 -4.11,1.564 l -0.223,0.141 -0.279,0.25 -0.335,0.308 -0.054,0.029 -0.171,0.194 -0.334,0.364 -0.224,0.279 -0.25,0.336 -0.225,0.362 -0.192,0.308 -0.197,0.421 -0.142,0.279 -0.193,0.477 -0.084,0.222 -12.441,38.414 c -0.814,2.458 -0.313,5.029 1.115,6.988 v 0.026 l 0.418,0.532 0.17,0.165 0.251,0.281 0.084,0.079 0.283,0.281 0.25,0.194 0.474,0.367 0.083,0.053 c 2.015,1.371 4.641,1.874 7.131,1.094 L 55.228,80.776 c 4.303,-1.342 6.679,-5.814 5.308,-10.006 -0.387,-1.259 -1.086,-2.35 -1.979,-3.215 l -0.368,-0.337 -0.278,-0.303 z m -6.318,5.896 0.079,0.114 -37.369,11.57 11.854,-36.538 10.565,10.317 2.876,2.825 11.995,11.712 z" /></g><path     style="fill:#000000"     inkscape:connector-curvature="0"     id="path9"     d="m 27.813273,113.65778 0.09753,-0.0201 c 2.39093,-0.45821 4.599455,-1.96811 5.80244,-4.28639 L 52.785897,72.891487 c 2.088044,-4.002139 0.590949,-8.836902 -3.348692,-10.821875 -1.329078,-0.688721 -2.766603,-0.943695 -4.133174,-0.841768 l -0.454018,-0.02 -16.939621,0.223997 -4.055079,0.07232 -15.711383,0.220024 -0.281322,0.04035 -0.432752,-2.61e-4 -0.415615,0.06192 -0.376025,0.05898 -0.47344,0.121469 -0.27556,0.07993 -0.550309,0.198748 -0.199188,0.08114 -0.594655,0.274528 -0.114446,0.0399 -0.02045,0.02056 -0.59303,0.35372 -0.123523,0.08306 -0.486301,0.337172 -0.179243,0.136242 -0.375276,0.340412 -0.219324,0.220495 -0.293372,0.294939 -0.238972,0.277116 C 0.97781,65.869953 0.347935,67.257564 0.11153,68.764336 L 0.05352,69.019757 0.05172,69.414329 0.01894,69.849995 0,69.908735 l 0.01836,0.255217 0.0183,0.499171 0.03984,0.356984 0.06262,0.413492 0.09656,0.411988 0.0872,0.351908 0.158141,0.436572 0.09837,0.298139 0.194299,0.472538 0.102407,0.218932 18.462772,35.908054 c 1.172169,2.30842 3.34759,3.76847 5.740829,4.17717 l 0.01975,-0.0199 0.69605,0.0957 0.218437,-0.0225 0.490791,0.0213 0.39809,-0.005 0.315972,-0.0397 0.594462,-0.0815 z" /></svg>',
	download: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" baseProfile="tiny" x="0px" y="0px" width="100%" height="100%" viewBox="0 0 100 100" xml:space="preserve"><g id="Captions"></g><g id="Your_Icon">	<path fill-rule="evenodd" fill="#000000" d="M88,84v-2c0-2.961-0.859-4-4-4H16c-2.961,0-4,0.98-4,4v2c0,3.102,1.039,4,4,4h68   C87.02,88,88,87.039,88,84z M58,12H42c-5,0-6,0.941-6,6v22H16l34,34l34-34H64V18C64,12.941,62.939,12,58,12z"/></g></svg>',
};
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
	var mainXml = null;
	if (typeof xml == "string") {
		mainXml = $.parseXML(xml);
	} else if ($.isXMLDoc(xml)) {
		mainXml = xml;
	}
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
},{"../package.json":11,"codemirror/addon/edit/matchbrackets.js":3,"codemirror/mode/javascript/javascript.js":4,"codemirror/mode/xml/xml.js":5}],23:[function(require,module,exports){
(function (global){
var $ = (typeof window !== "undefined" ? window.jQuery : typeof global !== "undefined" ? global.jQuery : null),
	yutils = require("yasgui-utils"),
	imgs = require('./imgs.js');
require("./../lib/DataTables/media/js/jquery.dataTables.js");



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
		yutils.svg.draw(svgDiv, imgs[sortings[sorting]], {width: 12, height: 16});
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
},{"../package.json":11,"./../lib/DataTables/media/js/jquery.dataTables.js":undefined,"./bindingsToCsv.js":12,"./imgs.js":15,"yasgui-utils":8}]},{},[1])(1)
});


//# sourceMappingURL=yasr.js.map