var $ = require("jquery");
var CodeMirror = require("codemirror");

require('codemirror/addon/edit/matchbrackets.js');
require('codemirror/mode/xml/xml.js');
require('codemirror/mode/javascript/javascript.js');
var root = module.exports = function(yasr,parent, options) {
	var plugin = {};
	plugin.options = $.extend(true, {}, root.defaults, options);
	plugin.yasr = yasr;
	plugin.parent = parent;
	plugin.draw = function() {
		root.draw(plugin);
	};
	plugin.name = "Raw Response";
	plugin.canHandleResults = function(yasr){
		if (!yasr.results) return false;
		var response = yasr.results.getOriginalResponseAsString();
		if ((!response || response.length == 0) && yasr.results.getException()) return false;//in this case, show exception instead, as we have nothing to show anyway
		return true;
	};
	plugin.getPriority = 2;
	
	plugin.getDownloadInfo = function() {
		if (!plugin.yasr.results) return null;
		var contentType = plugin.yasr.results.getOriginalContentType();
		return {
			getContent: function() {return yasr.results.getOriginalResponse();},
			filename: "queryResults." + plugin.yasr.results.getType(),
			contentType: (contentType? contentType: "text/plain"),
			buttonTitle: "Download raw response"
		};
	};
	
	return plugin;
};

root.draw = function(plugin) {
	var cmOptions = plugin.options.CodeMirror;
	cmOptions.value = plugin.yasr.results.getOriginalResponseAsString();
	
	var mode = plugin.yasr.results.getType();
	if (mode) {
		if (mode == "json") {
			mode = {name: "javascript", json: true};
		}
		cmOptions.mode = mode;
	}
	
	CodeMirror(plugin.parent.get()[0], cmOptions);
	
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