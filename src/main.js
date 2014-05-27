'use strict';
var $ = require("jquery");

console = console || {"log":function(){}};//make sure any console statements don't break in IE
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
	yasr.options = $.extend(true, {}, root.defaults, options);
	yasr.parent = parent;
	yasr.draw = draw;
	yasr.parent = parent;
	yasr.setResults = setResults;
	if (yasr.options.drawOutputSelector) root.drawSelector();
	yasr.resultsContainer = $("<div class='resultsWrapper'></div>").appendTo(parent);
	
	
	/**
	 * postprocess
	 */
	if (queryResults) setResults(queryResults);
	root.updateSelector();
	
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
		$(yasr.resultsContainer).empty();
		root.plugins[output](yasr,yasr.resultsContainer);
		return true;
	}
	return false;
};

root.drawSelector = function() {
	var btnGroup = $('<div class="yasr_btnGroup"></div>').appendTo(yasr.parent);
//	style="margin: 9px 0 5px;">
//    <button type="button" class="btn btn-default">Left</button>
//    <button type="button" class="btn btn-default">Middle</button>
//    <button type="button" class="btn btn-default">Right</button>
//  </div>
	for (var pluginName in root.plugins) {
		var plugin = root.plugins[pluginName];
		var name = plugin.name || pluginName;
		$("<button></button>")
			.text(name)
			.click(function() {
				
			})
			.appendTo(btnGroup);
	}
};

root.updateSelector = function() {
	for (var plugin in root.plugins) {
		
	}
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
	drawOutputSelector: true
	
	
	
	
};