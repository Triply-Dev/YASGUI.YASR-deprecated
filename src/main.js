'use strict';
var $ = require("jquery");

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
var root = module.exports = function(parent, queryResults, options) {
	var yasr = {};
	yasr.options = $.extend(true, {}, root.defaults, options);
	yasr.container = $("<div class='yasr'></div>").appendTo(parent);
//	yasr.parent = parent;
	
	
	yasr.draw = function(output) {
		if (!yasr.results) return false;
		if (!output) output = yasr.options.output;
		if (output in root.plugins) {
			$(yasr.resultsContainer).empty();
			getPluginDoc(yasr, output).draw();
			return true;
		}
		return false;
	};
	
	yasr.setResults = function(queryResults) {
		yasr.results = require("./parsers/wrapper.js")(queryResults);
		yasr.draw();
	};
	
	
	if (yasr.options.drawOutputSelector) root.drawSelector(yasr);
	yasr.resultsContainer = $("<div class='yasr_results'></div>").appendTo(yasr.container);
	yasr.pluginDocs = {};
	
	/**
	 * postprocess
	 */
	if (queryResults) yasr.setResults(queryResults);
	root.updateSelector(yasr);
	
	return yasr;
};
var getPluginDoc = function(yasr, plugin) {
	if (!yasr.pluginDocs[plugin]) yasr.pluginDocs[plugin] = root.plugins[plugin](yasr,yasr.resultsContainer);
	return yasr.pluginDocs[plugin];
};

root.drawSelector = function(yasr) {
	var btnGroup = $('<div class="yasr_btnGroup"></div>').appendTo(yasr.container);
	$.each(root.plugins, function(pluginName, plugin) {
		var name = plugin.name || pluginName;
		var button = $("<button></button>")
		.text(name)
		.addClass("select_" + pluginName)
		.click(function() {
			//update buttons
			btnGroup.find("button.selected").removeClass("selected");
			$(this).addClass("selected");
			//set and draw output
			yasr.options.output = pluginName;
			yasr.draw();
		})
		.appendTo(btnGroup);
		if (yasr.options.output == pluginName) button.addClass("selected");
	});
};

root.updateSelector = function(yasr) {
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

//handlers in plugin:
//drawInSelector: function(results){};
//canHandleResults: function(results){};
//priority: function(results){};