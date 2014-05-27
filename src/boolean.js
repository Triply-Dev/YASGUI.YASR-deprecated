var $ = require("jquery");

var root = module.exports = function(yasr, parent, options) {
	var plugin = {};
	plugin.container = $("<div class='booleanResult'></div>").appendTo(parent);
	plugin.options = $.extend(true, {}, root.defaults, options);
	plugin.yasr = yasr;
	
	plugin.draw = function() {
		root.draw(plugin);
	};
	return plugin;
};

root.draw = function(plugin) {
	var booleanVal = yasr.results.getBoolean();
	
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
	if (imgId) require("./imgs").draw(plugin.container, {
		width: 25,
		height: 25,
		id: imgId,
	});
	
	$("<span></span>").text(textVal).appendTo(plugin.container);
};

root.defaults = {
	hideFromSelection:true,
	canHandleResults: function(results){},
	getPriority: function(results){}
	
};