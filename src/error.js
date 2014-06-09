var $ = require("jquery");

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