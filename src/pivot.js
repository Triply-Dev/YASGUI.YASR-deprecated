'use strict';
var $ = require("jquery"),
	utils = require('./utils.js'),
	yUtils = require('yasgui-utils'),
	imgs = require('./imgs.js');
require('jquery-ui/sortable');
require('pivottable');

try {
	var d3 = require('d3');
	require('../node_modules/pivottable/dist/d3_renderers.js');
} catch (e) {
	//do nothing. just make sure we don't use this renderer
}

var root = module.exports = function(yasr) {
	var drawOnGChartCallback = false;
	var loadingGChart = false;
	var renderers = $.pivotUtilities.renderers;
	if ($.pivotUtilities.d3_renderers) $.extend(true, renderers, $.pivotUtilities.d3_renderers);
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
	
	var plugin = {};
	var options = $.extend(true, {}, root.defaults);
	
	//only load this script 
	if (options.useGChart && !$.pivotUtilities.gchart_renderers) {
		loadingGChart = true;
		//gchart not loaded yet. load them!
		loadGoogleApi();
	}
	
	
	var $pivotWrapper;
	
	
	var formatForPivot = function(callback) {
		var vars = yasr.results.getVariables();
		var usedPrefixes = null;
		if (yasr.options.getUsedPrefixes) {
			usedPrefixes = (typeof yasr.options.getUsedPrefixes == "function"? yasr.options.getUsedPrefixes(yasr):  yasr.options.getUsedPrefixes);
		}
		yasr.results.getBindings().forEach(function(binding) {
			var rowObj = {};
			vars.forEach(function(variable) {
				if (variable in binding) {
					var val = binding[variable].value;
					if (binding.type == "uri") val = utils.uriToPrefixed(usedPrefixes, val);
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
		var settings = getStoredSettings();
		settings.onRefresh = onRefresh;
		window.pivot = $pivotWrapper.pivotUI(formatForPivot, settings);

		/**
		 * post process
		 */
		//use 'move' handler for variables
		var icon = $(yUtils.svg.getElement(imgs.move, {width: '14px', height: '14px'}));
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
	useGChart: true,
	persistency: function(yasr) {return "yasr_pivot_" + $(yasr.container).closest('[id]').attr('id')}
};

root.version = {
	"YASR-rawResponse" : require("../package.json").version,
	"jquery": $.fn.jquery,
};