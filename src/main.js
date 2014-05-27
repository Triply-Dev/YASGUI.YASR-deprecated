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
	yasr.header = $("<div class='yasr_header'></div>").appendTo(yasr.container);
	yasr.resultsContainer = $("<div class='yasr_results'></div>").appendTo(yasr.container);
//	yasr.parent = parent;
	
	
	yasr.draw = function(output) {
		if (!yasr.results) return false;
		if (!output) output = yasr.options.output;
		if (output in yasr.plugins) {
			$(yasr.resultsContainer).empty();
			yasr.plugins[output].draw();
			return true;
		}
		return false;
	};
	
	yasr.setResults = function(queryResults) {
		yasr.results = require("./parsers/wrapper.js")(queryResults);
		yasr.draw();
	};
	
	yasr.plugins = {};
	for (var plugin in root.plugins) {
		yasr.plugins[plugin] = root.plugins[plugin](yasr, yasr.resultsContainer);
	}
	/**
	 * postprocess
	 */
	if (queryResults) yasr.setResults(queryResults);
	if (yasr.options.drawOutputSelector) root.drawSelector(yasr);
	root.updateSelector(yasr);
	
	return yasr;
};

root.drawSelector = function(yasr) {
	var btnGroup = $('<div class="yasr_btnGroup"></div>').appendTo(yasr.header);
	$.each(yasr.plugins, function(pluginName, plugin) {
		if (plugin.options.hideFromSelection) return;
		var name = plugin.options.name || pluginName;
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
	
	if (btnGroup.children().length == 1) btnGroup.hide();
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
	table: require("./table.js"),
	rawResponse: require("./rawResponse.js")
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