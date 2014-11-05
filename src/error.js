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
var root = module.exports = function(yasr) {
	var container = $("<div class='errorResult'></div>");
	var options = $.extend(true, {}, root.defaults);
	
	var draw = function() {
		container.empty().appendTo(yasr.resultsContainer);
		$("<span class='exception'>ERROR</span>").appendTo(container);
		$("<p></p>").html(yasr.results.getException()).appendTo(container);
	};
	
	
	var  canHandleResults = function(yasr){return yasr.results.getException() || false;};
	
	return {
		name: null,//don't need to set this: we don't show it in the selection widget anyway, so don't need a human-friendly name
		draw: draw,
		getPriority: 20,
		hideFromSelection: true,
		canHandleResults: canHandleResults,
	}
};

/**
 * Defaults for error plugin
 * 
 * @type object
 * @attribute YASR.plugins.error.defaults
 */
root.defaults = {
	
};