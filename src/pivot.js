'use strict';
var $ = require("jquery"),
	utils = require('./utils.js'),
	yUtils = require('yasgui-utils'),
	imgs = require('./imgs.js');
require('jquery-ui/sortable');
require('pivottable');


var root = module.exports = function(yasr) {
	var drawOnGChartCallback = false;
	var loadingGChart = false;
	var renderers = $.pivotUtilities.renderers;
	var plugin = {};
	var options = $.extend(true, {}, root.defaults);
	
	if (options.useD3Chart) {
		try {
			var d3 = require('d3');
			require('../node_modules/pivottable/dist/d3_renderers.js');
		} catch (e) {
			//do nothing. just make sure we don't use this renderer
		}
		if ($.pivotUtilities.d3_renderers) $.extend(true, renderers, $.pivotUtilities.d3_renderers);
	}
	
	var loadGoogleApi = function() {
		var finishAjax = function() {
			try {
				require('../node_modules/pivottable/dist/gchart_renderers.js');
				$.extend(true, renderers, $.pivotUtilities.gchart_renderers);
			} catch (e) {
				//hmm, something went wrong. forget about it;
			}
			loadingGChart = false;
			if (drawOnGChartCallback) draw();
			drawOnGChartCallback = false;
		};
		
		
		//cannot package google loader via browserify...
		$.ajax({
			  cache: true,
			  dataType: "script",
			  url: "//google.com/jsapi",
			})
			.done(function(data, textStatus, jqxhr) {
				var googleLoader = require('google');// shimmed to global google variable
				googleLoader.load("visualization", "1", {
					packages : [ "corechart", "charteditor" ],
					callback : finishAjax
				})
			})
			.fail(finishAjax);
	};
	
	
	
	//only load this script 
	if (options.useGChart && !$.pivotUtilities.gchart_renderers) {
		loadingGChart = true;
		//gchart not loaded yet. load them!
		loadGoogleApi();
	}
	
	
	var $pivotWrapper;
	var mergeLabelPostfix = null;
	var getShownVariables = function() {
		var variables = yasr.results.getVariables();
		if (!options.mergeLabelsWithUris) return variables;
		var shownVariables = [];
		
		mergeLabelPostfix = (typeof options.mergeLabelsWithUris == "string"? options.mergeLabelsWithUris: "Label");
		variables.forEach(function(variable){
			if (variable.indexOf(mergeLabelPostfix, variable.length - mergeLabelPostfix.length) !== -1) {
				//this one ends with a postfix
				if (variables.indexOf(variable.substring(0, variable.length - mergeLabelPostfix.length)) >= 0) {
					//we have a shorter version of this variable. So, do not include the ..<postfix> variable in the table
					return;
				}
			}
			shownVariables.push(variable);
		});
		return shownVariables;
	};
	
	var formatForPivot = function(callback) {
		
		var vars = getShownVariables();
		var usedPrefixes = null;
		if (yasr.options.getUsedPrefixes) {
			usedPrefixes = (typeof yasr.options.getUsedPrefixes == "function"? yasr.options.getUsedPrefixes(yasr):  yasr.options.getUsedPrefixes);
		}
		yasr.results.getBindings().forEach(function(binding) {
			var rowObj = {};
			vars.forEach(function(variable) {
				if (variable in binding) {
					var val = binding[variable].value;
					if (mergeLabelPostfix && binding[variable + mergeLabelPostfix]) {
						val = binding[variable + mergeLabelPostfix].value;
					} else if (binding.type == "uri") {
						val = utils.uriToPrefixed(usedPrefixes, val);
					}
					rowObj[variable] = val;
				} else {
					rowObj[variable] = null;
				}
			});
			callback(rowObj);
		});
	} 
	var settingsPersistencyId = null
	var getPersistencyId = function() {
		if (settingsPersistencyId === null) {
			if (typeof options.persistency == "string") {
				settingsPersistencyId = options.persistency;
			} else if (typeof options.persistency == "function") {
				settingsPersistencyId = options.persistency(yasr);
			} else {
				settingsPersistencyId = false;
			}
		}
		return settingsPersistencyId;
	};
	var onRefresh = function(pivotObj) {
		if (getPersistencyId()) {
			var storeSettings = {
				cols: pivotObj.cols,
				rows: pivotObj.rows,
				rendererName: pivotObj.rendererName,
			}
			yUtils.storage.set(getPersistencyId(), storeSettings, "month");
		}
	};
	var getStoredSettings = function() {
		var settings = yUtils.storage.get(getPersistencyId());
		//validate settings. we may have different variables, or renderers might be gone
		if (settings) {
			var vars = yasr.results.getVariables();
			var keepColsAndRows = true;
			settings.cols.forEach(function(variable) {
				if (vars.indexOf(variable) < 0) keepColsAndRows = false; 
			});
			if (keepColsAndRows) {
				settings.rows.forEach(function(variable) {
					if (vars.indexOf(variable) < 0) keepColsAndRows = false; 
				});
			}
			if (!keepColsAndRows) {
				settings.cols = [];
				settings.rows = [];
			}
			if (!renderers[settings.rendererName]) delete settings.rendererName;
		} else {
			settings = {};
		}
		return settings;
	};
	var draw = function() {
		if (loadingGChart) {
			//postpone drawing until we've loaded everything
			drawOnGChartCallback = true;
			return;
		}
		
		
		$pivotWrapper = $('<div>', {class: 'pivotTable'}).appendTo($(yasr.resultsContainer));
		
		var renderers = $.pivotUtilities.renderers;
		var settings = $.extend(true, {}, getStoredSettings(), root.defaults.pivotTable);
		
		settings.onRefresh = (function() {
		    var originalRefresh = settings.onRefresh;
		    return function(pivotObj) {
		    	onRefresh(pivotObj);
		    	if (originalRefresh) originalRefresh(pivotObj);
		    };
		})();
		
		window.pivot = $pivotWrapper.pivotUI(formatForPivot, settings);

		/**
		 * post process
		 */
		//use 'move' handler for variables
		var icon = $(yUtils.svg.getElement(imgs.move));
		$pivotWrapper.find('.pvtTriangle').replaceWith(icon);
		
		//add headers to selector rows
		$('.pvtCols').prepend($('<div>', {class: 'containerHeader'}).text("Columns"));
		$('.pvtRows').prepend($('<div>', {class: 'containerHeader'}).text("Rows"));
		$('.pvtUnused').prepend($('<div>', {class: 'containerHeader'}).text("Available Variables"));
		$('.pvtVals').prepend($('<div>', {class: 'containerHeader'}).text("Cells"));
		
	};
	var canHandleResults = function(){
		return yasr.results && yasr.results.getVariables && yasr.results.getVariables() && yasr.results.getVariables().length > 0;
	};
	
	
	
	return {
		draw: draw,
		name: "Pivot Table",
		canHandleResults: canHandleResults,
		getPriority: 4,
	}
};



root.defaults = {
	mergeLabelsWithUris: false,
	useGChart: true,
	useD3Chart: true,
	persistency: function(yasr) {return "yasr_pivot_" + $(yasr.container).closest('[id]').attr('id')},
	pivotTable: {}
};

root.version = {
	"YASR-rawResponse" : require("../package.json").version,
	"jquery": $.fn.jquery,
};