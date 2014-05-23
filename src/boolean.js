var $ = require("jquery");
var booleanVal = null;
var container = $("<div class='booleanResult'></div>");
var root = module.exports = {
	draw : function(yasqe) {
		container.appendTo(yasqe.parent);
		booleanVal = yasqe.results.getBoolean();
		booleanVal = true;
		
		var imgId = null;
		var textVal = null;
		if (booleanVal === true) {
			imgId = "check";
			textVal = "True";
		} else if (booleanVal === false) {
			imgId = "cross";
			textVal = "False";
		} else {
			textVal = "unknown";
		}
		
		//add icon
		if (imgId) require("./imgs").draw(container, {
			width: 25,
			height: 25,
			id: imgId,
		});
		
		$("<span></span>").text(textVal).appendTo(container);
	}
};
