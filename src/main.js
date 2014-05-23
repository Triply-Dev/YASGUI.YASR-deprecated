'use strict';
var $ = require("jquery");

console = console || {"log":function(){}};//make sure any console statements
var yasr = {};



/**
 * Main YASR constructor
 * 
 * @constructor
 * @param {DOM-Element} parent element to append editor to.
 * @param {object} settings
 * @class YASR
 * @return {doc} YASR document
 */
var root = module.exports = function(parent, queryResults, options) {
	parent = $(parent);
	
	yasr.options = $.extend(true, {}, root.defaults, options);
	if (queryResults) setResults(queryResults);
	
	yasr.draw = draw;
	yasr.parent = parent;
	
	
	
	/**
	 * postprocess
	 */
	if (yasr.results) {
//		yasr.setResponse(queryResponse);
		yasr.draw();
	};
	return yasr;
};
var setResults = function(queryResults) {
	yasr.results = require("./parsers/wrapper.js")(queryResults);
};
var draw = function(output) {
	if (!yasr.results) return false;
	if (!output) output = yasr.options.output;
	if (output in root.plugins) {
		yasr.parent.empty();
		root.plugins[output].draw(yasr);
		return true;
	}
	return false;
};


/**
 * Register plugins
 * 
 * @attribute YASR.plugins
 */
root.plugins = {
	boolean: require("./boolean.js"),
	
};

/**
 * The default options of YASR. Either change the default options by setting YASR.defaults, or by
 * passing your own options as second argument to the YASR constructor
 * 
 * @attribute YASR.defaults
 */
root.defaults = $.extend(root.defaults, {
	
	
	plugins: {
		boolean: {},
		
	},
	
	output: "boolean",
	
	
	
	
	
	
	
	
	
	
	mode : "sparql11",
	/**
	 * Query string
	 * 
	 * @property value
	 * @type String
	 * @default "SELECT * WHERE {\n  ?sub ?pred ?obj .\n} \nLIMIT 10"
	 */
	value : "SELECT * WHERE {\n  ?sub ?pred ?obj .\n} \nLIMIT 10",
	highlightSelectionMatches : {
		showToken : /\w/
	},
	tabMode : "indent",
	lineNumbers : true,
	gutters : [ "gutterErrorBar", "CodeMirror-linenumbers" ],
	matchBrackets : true,
	fixedGutter : true,

	/**
	 * Extra shortcut keys. Check the CodeMirror manual on how to add your own
	 * 
	 * @property extraKeys
	 * @type object
	 */
	extraKeys : {
		"Ctrl-Space" : root.autoComplete,
		"Cmd-Space" : root.autoComplete,
		"Ctrl-D" : root.deleteLine,
		"Ctrl-K" : root.deleteLine,
		"Cmd-D" : root.deleteLine,
		"Cmd-K" : root.deleteLine,
		"Ctrl-/" : root.commentLines,
		"Cmd-/" : root.commentLines,
		"Ctrl-Alt-Down" : root.copyLineDown,
		"Ctrl-Alt-Up" : root.copyLineUp,
		"Cmd-Alt-Down" : root.copyLineDown,
		"Cmd-Alt-Up" : root.copyLineUp,
		"Shift-Ctrl-F" : root.doAutoFormat,
		"Shift-Cmd-F" : root.doAutoFormat,
		"Ctrl-]" : root.indentMore,
		"Cmd-]" : root.indentMore,
		"Ctrl-[" : root.indentLess,
		"Cmd-[" : root.indentLess,
		"Ctrl-S" : root.storeQuery,
		"Cmd-S" : root.storeQuery,
		"Ctrl-Enter" : root.executeQuery,
		"Cmd-Enter" : root.executeQuery
	},
});