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
	
	return plugin;
};

root.draw = function(plugin) {
	var cmOptions = plugin.options.CodeMirror;
	cmOptions.value = plugin.yasr.results.getOriginalResponse();
	
	var mode = plugin.yasr.results.getType();
	console.log(mode);
	if (mode) {
		if (mode == "json") {
			mode = {name: "javascript", json: true};
		}
		cmOptions.mode = mode;
	}
	
	CodeMirror(plugin.parent.get()[0], cmOptions);
	
};


root.defaults = {
	name: "Raw Response",
	canHandleResults: function(){return true;},
	getPriority: function(yasr){return 5;},
	CodeMirror: {
		readOnly: true,
	}
};