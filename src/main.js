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
	
	
	yasr.draw = draw;
	yasr.parent = parent;
	yasr.setResults = setResults;
	
	
	/**
	 * postprocess
	 */
	if (queryResults) setResults(queryResults);
	return yasr;
};
var setResults = function(queryResults) {
	yasr.results = require("./parsers/wrapper.js")(queryResults);
	yasr.draw();
};
var draw = function(output) {
	if (!yasr.results) return false;
	if (!output) output = yasr.options.output;
	if (output in root.plugins) {
		yasr.parent.empty();
		root.plugins[output](yasr);
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
	table: require("./table.js")
	
};

/**
 * The default options of YASR. Either change the default options by setting YASR.defaults, or by
 * passing your own options as second argument to the YASR constructor
 * 
 * @attribute YASR.defaults
 */
root.defaults = {
	
	
	
	output: "table",
	
	
	
	
	
	
};