var $ = require("jquery");
var booleanVal = null;
var container = $("<div class='booleanResult'></div>");
var root = module.exports = function(yasr, parent, options) {
	options = $.extend(true, {}, root.defaults, options);
	container.appendTo(parent);
	booleanVal = yasr.results.getBoolean();
	
	var imgId = null;
	var textVal = null;
	if (booleanVal === true) {
		imgId = "check";
		textVal = "True";
	} else if (booleanVal === false) {
		imgId = "cross";
		textVal = "False";
	} else {
		container.width("140");
		textVal = "Could not find boolean value in response";
	}
	
	//add icon
	if (imgId) require("./imgs").draw(container, {
		width: 25,
		height: 25,
		id: imgId,
	});
	
	$("<span></span>").text(textVal).appendTo(container);
};
root.defaults = {
		
};