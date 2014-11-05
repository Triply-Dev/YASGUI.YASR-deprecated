var $ = require("jquery"),
	CodeMirror = require("codemirror");

require('codemirror/addon/edit/matchbrackets.js');
require('codemirror/mode/xml/xml.js');
require('codemirror/mode/javascript/javascript.js');

var root = module.exports = function(yasr) {
	var plugin = {};
	var options = $.extend(true, {}, root.defaults);
	var draw = function() {
		var cmOptions = options.CodeMirror;
		cmOptions.value = yasr.results.getOriginalResponseAsString();
		
		var mode = yasr.results.getType();
		if (mode) {
			if (mode == "json") {
				mode = {name: "javascript", json: true};
			}
			cmOptions.mode = mode;
		}
		
		CodeMirror(yasr.resultsContainer.get()[0], cmOptions);
		
	};
	var canHandleResults = function(){
		if (!yasr.results) return false;
		var response = yasr.results.getOriginalResponseAsString();
		if ((!response || response.length == 0) && yasr.results.getException()) return false;//in this case, show exception instead, as we have nothing to show anyway
		return true;
	};
	
	var getDownloadInfo = function() {
		if (!yasr.results) return null;
		var contentType = yasr.results.getOriginalContentType();
		var type = yasr.results.getType();
		return {
			getContent: function() {return yasr.results.getOriginalResponse();},
			filename: "queryResults" + (type? "." + type: ""),
			contentType: (contentType? contentType: "text/plain"),
			buttonTitle: "Download raw response"
		};
	};
	
	return {
		draw: draw,
		name: "Raw Response",
		canHandleResults: canHandleResults,
		getPriority: 2,
		getDownloadInfo: getDownloadInfo,
		
	}
};



root.defaults = {
	CodeMirror: {
		readOnly: true,
	}
};

root.version = {
	"YASR-rawResponse" : require("../package.json").version,
	"jquery": $.fn.jquery,
	"CodeMirror" : CodeMirror.version
};