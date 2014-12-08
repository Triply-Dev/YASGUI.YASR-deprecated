'use strict';
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
	var $container = $("<div class='errorResult'></div>");
	var options = $.extend(true, {}, root.defaults);
	
	var draw = function() {
		var error = yasr.results.getException();
		$container.empty().appendTo(yasr.resultsContainer);

		var statusText = 'Error';
		if (error.statusText && error.statusText.length < 100) {
			//use a max: otherwise the alert span will look ugly
			statusText = error.statusText;
		}
		if (error.status != undefined) {
			statusText += ' (#' + error.status + ')';
		}
		$container
			.append(
				$("<span>", {class:'exception'})
				.text(statusText)
			);
		var responseText = null;
		if (error.responseText) {
			responseText = error.responseText;
		} else if (typeof error == "string") {
			//for backwards compatability (when creating the error string was done externally
			responseText = error;
		}
		if (responseText) $container.append($("<pre>").text(responseText));
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