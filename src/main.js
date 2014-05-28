'use strict';
var $ = require("jquery");
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
var root = module.exports = function(parent, queryResults, options) {
	var yasr = {};
	yasr.options = $.extend(true, {}, root.defaults, options);
	yasr.container = $("<div class='yasr'></div>").appendTo(parent);
	yasr.header = $("<div class='yasr_header'></div>").appendTo(yasr.container);
	yasr.resultsContainer = $("<div class='yasr_results'></div>").appendTo(yasr.container);
	
	
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
		
		//store if needed
		if (yasr.options.persistency && yasr.options.persistency.results) {
			if (yasr.results.getOriginalResponse().length < yasr.options.persistency.results.maxSize) {
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
		yasr.options.output = utils.storage.get(id);
	}
	if (!queryResults && yasr.options.persistency && yasr.options.persistency.results) {
		var id = (typeof yasr.options.persistency.results.id == "string" ? yasr.options.persistency.results.id: yasr.options.persistency.results.id(yasr));
		queryResults = utils.storage.get(id);
	}
	if (queryResults) {
		yasr.setResults(queryResults);
	} 
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
			
			//store if needed
			if (yasr.options.persistency && yasr.options.persistency.outputSelector) {
				var id = (typeof yasr.options.persistency.outputSelector == "string"? yasr.options.persistency.outputSelector: yasr.options.persistency.outputSelector(yasr));
				utils.storage.set(id, yasr.options.output, "month");
			}
			
			
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
	drawOutputSelector: true,
	/**
	 * Make output selector and the query results persistent. Setting the value
	 * to null, will disable persistancy: nothing is stored between browser
	 * sessions Setting the values to a string (or a function which returns a
	 * string), will store the query in localstorage using the specified string.
	 * By default, the ID is dynamically generated using the determineID
	 * function, to avoid collissions when using multiple YASR items on one
	 * page
	 * 
	 * @property persistent
	 * @type function|string
	 */
	persistency: {
		outputSelector: function(yasr) {
			return "selector_" + utils.determineId(yasr.container);
		},
		results: {
			id: function(yasr){
				return "results_" + utils.determineId(yasr.container);
			},
			maxSize: 2000 //char count
		}
		
	},
	
	
	
	
};

//handlers in plugin:
//drawInSelector: function(results){};
//canHandleResults: function(results){};
//priority: function(results){};