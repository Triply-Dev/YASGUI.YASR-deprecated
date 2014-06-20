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
var root = module.exports = function(parent, options, queryResults) {
	var yasr = {};
	yasr.options = $.extend(true, {}, root.defaults, options);
	yasr.container = $("<div class='yasr'></div>").appendTo(parent);
	yasr.header = $("<div class='yasr_header'></div>").appendTo(yasr.container);
	yasr.resultsContainer = $("<div class='yasr_results'></div>").appendTo(yasr.container);
	
	
	yasr.draw = function(output) {
		if (!yasr.results) return false;
		if (!output) output = yasr.options.output;
		
		if (output in yasr.plugins && yasr.plugins[output].canHandleResults(yasr)) {
			$(yasr.resultsContainer).empty();
			yasr.plugins[output].draw();
			return true;
		}
		//ah, our default output does not take our current results. Try to autodetect
		var selectedOutput = null;
		var selectedOutputPriority = -1;
		for (var tryOutput in yasr.plugins) {
			if (yasr.plugins[tryOutput].canHandleResults(yasr)) {
				var priority = yasr.plugins[tryOutput].getPriority;
				if (typeof priority == "function") priority = priority(yasr);
				if (priority != null && priority != undefined && priority > selectedOutputPriority) {
					selectedOutputPriority = priority;
					selectedOutput = tryOutput;
				}
			}
		}
		if (selectedOutput) {
			$(yasr.resultsContainer).empty();
			yasr.plugins[selectedOutput].draw();
			return true;
		}
		return false;
	};
	yasr.somethingDrawn = function() {
		return !yasr.resultsContainer.is(":empty");
	};
	yasr.setResponse = function(queryResults) {
		try {
			yasr.results = require("./parsers/wrapper.js")(queryResults);
		} catch(exception) {
			yasr.results = exception;
		}
		yasr.draw();
		
		//store if needed
		if (yasr.options.persistency && yasr.options.persistency.results) {
			if (yasr.results.getOriginalResponseAsString && yasr.results.getOriginalResponseAsString().length < yasr.options.persistency.results.maxSize) {
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
		if (id) {
			var selection = utils.storage.get(id);
			if (selection) yasr.options.output = selection;
		}
	}
	if (!queryResults && yasr.options.persistency && yasr.options.persistency.results) {
		var id = (typeof yasr.options.persistency.results.id == "string" ? yasr.options.persistency.results.id: yasr.options.persistency.results.id(yasr));
		queryResults = utils.storage.get(id);
	}
	
	root.drawHeader(yasr);
	
	if (queryResults) {
		yasr.setResponse(queryResults);
	} 
	root.updateHeader(yasr);
	return yasr;
};
root.updateHeader = function(yasr) {
	var downloadIcon = yasr.header.find(".yasr_downloadIcon");
		downloadIcon
			.removeAttr("title");//and remove previous titles
	
	var outputPlugin = yasr.plugins[yasr.options.output];
	if (outputPlugin) {
		var info = (outputPlugin.getDownloadInfo? outputPlugin.getDownloadInfo(): null);
		if (info) {
			if (info.buttonTitle) downloadIcon.attr(info.buttonTitle);
			downloadIcon.prop("disabled", false);
			downloadIcon.find("path").each(function(){
				this.style.fill = "black";
			});
		} else {
			downloadIcon.prop("disabled", true).prop("title", "Download not supported for this result representation");
			downloadIcon.find("path").each(function(){
				this.style.fill = "gray";
			});
		}
	}
};

root.drawHeader = function(yasr) {
	var drawOutputSelector = function() {
		var btnGroup = $('<div class="yasr_btnGroup"></div>');
		$.each(yasr.plugins, function(pluginName, plugin) {
			if (plugin.hideFromSelection) return;
			var name = plugin.name || pluginName;
			var button = $("<button class='yasr_btn'></button>")
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
				root.updateHeader(yasr);
			})
			.appendTo(btnGroup);
			if (yasr.options.output == pluginName) button.addClass("selected");
		});
		
		if (btnGroup.children().length > 1) yasr.header.append(btnGroup);
	};
	var drawDownloadIcon = function() {
		var stringToUrl = function(string, contentType) {
			var url = null;
			var windowUrl = window.URL || window.webkitURL || window.mozURL || window.msURL;
			if (windowUrl && Blob) {
				var blob = new Blob([string], {type: contentType});
				url = windowUrl.createObjectURL(blob);
			}
			return url;
		};
		var button = $("<button class='yasr_btn yasr_downloadIcon'></button>")
			.append(require("yasgui-utils").imgs.getElement({id: "download", width: "15px", height: "15px"}))
			.click(function() {
				var currentPlugin = yasr.plugins[yasr.options.output];
				if (currentPlugin && currentPlugin.getDownloadInfo) {
					var downloadInfo = currentPlugin.getDownloadInfo();
					var downloadUrl = stringToUrl(downloadInfo.getContent(), (downloadInfo.contentType? downloadInfo.contentType: "text/plain"));
					var downloadMockLink = $("<a></a>");
					downloadMockLink.attr("href", downloadUrl);
					downloadMockLink.attr("download", downloadInfo.filename);
					downloadMockLink.get(0).click();
				}
			});
		yasr.header.append(button);
	};
	if (yasr.options.drawOutputSelector) drawOutputSelector();
	if (yasr.options.drawDownloadIcon) drawDownloadIcon();
};




/**
 * Registered plugins. Add a plugin by adding it to this object. 
 * Each plugin -must- return an object from the constructor with the following keys: draw (function) and 
 * options (object with keys hideFromSelection, canHandlerResults, getPriority and name)
 * Want to add your own plugin? I'd advice you use the boolean plugin as a template
 * 
 * @type object
 * @attribute YASR.plugins
 */
root.plugins = {
	boolean: require("./boolean.js"),
	table: require("./table.js"),
	rawResponse: require("./rawResponse.js"),
	error: require("./error.js")
};

/**
 * The default options of YASR. Either change the default options by setting YASR.defaults, or by
 * passing your own options as second argument to the YASR constructor
 * 
 * @attribute YASR.defaults
 */
root.defaults = {
	/**
	 * key of default plugin to use
	 * @property output
	 * @type string
	 * @default "table"
	 */
	output: "table",
	
	/**
	 * Draw the output selector widget
	 * 
	 * @property drawOutputSelector
	 * @type boolean
	 * @default true
	 */
	drawOutputSelector: true,
	/**
	 * Draw download icon. This issues html5 download functionality to 'download' files created on the client-side.
	 *  This allows the user to download results already queried for, such as a CSV when a table is shown, or the original response when the raw response output is selected
	 * 
	 * @property drawDownloadIcon
	 * @type boolean
	 * @default true
	 */
	drawDownloadIcon: true,
	
	
	getUsedPrefixes: null,
	/**
	 * Make certain settings and values of YASR persistent. Setting a key
	 * to null, will disable persistancy: nothing is stored between browser
	 * sessions Setting the values to a string (or a function which returns a
	 * string), will store the query in localstorage using the specified string.
	 * By default, the ID is dynamically generated by finding the nearest DOM element with an "id" set,
	 * to avoid collissions when using multiple YASR items on one page
	 * 
	 * @property persistency
	 * @type object
	 */
	persistency: {
		/**
		 * Persistency setting for the selected output
		 * 
		 * @property persistency.outputSelector
		 * @type string|function
		 * @default function (determine unique id)
		 */
		outputSelector: function(yasr) {
			return "selector_" + utils.determineId(yasr.container);
		},
		/**
		 * Persistency setting for query results.
		 * 
		 * @property persistency.results
		 * @type object
		 */
		results: {
			/**
			 * Get the key to store results in
			 * 
			 * @property persistency.results.id
			 * @type string|function
			 * @default function (determine unique id)
			 */
			id: function(yasr){
				return "results_" + utils.determineId(yasr.container);
			},
			/**
			 * The result set might too large to fit in local storage. 
			 * It is impossible to detect how large the local storage is.
			 * Therefore, we do not store all results in local storage, depending on a max number of characters in the SPARQL result serialization.
			 * Set this function conservitavely. (especially when using multiple YASR instances on one page)
			 * 
			 * @property persistency.results.maxSize
			 * @type int
			 * @default 100000
			 */
			maxSize: 100000 //char count
		}
		
	},
	
	
};
root.version = {
	"YASR" : require("../package.json").version,
	"jquery": $.fn.jquery,
	"yasgui-utils": require("yasgui-utils").version
};