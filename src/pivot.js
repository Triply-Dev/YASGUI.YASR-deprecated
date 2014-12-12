'use strict';
var $ = require("jquery"),
	utils = require('./utils.js'),
	yUtils = require('yasgui-utils'),
	imgs = require('./imgs.js');
require('jquery-ui/sortable');
require('pivottable');

if (!$.fn.pivotUI) throw new Error("Pivot lib not loaded");
var root = module.exports = function(yasr) {
	var plugin = {};
	var options = $.extend(true, {}, root.defaults);
	
	if (options.useD3Chart) {
		try {
			var d3 = require('d3');
			if (d3) require('../node_modules/pivottable/dist/d3_renderers.js');
		} catch (e) {
			//do nothing. just make sure we don't use this renderer
		}
		if ($.pivotUtilities.d3_renderers) $.extend(true,  $.pivotUtilities.renderers, $.pivotUtilities.d3_renderers);
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
					} else if (binding[variable].type == "uri") {
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
	
	var persistencyId = yasr.getPersistencyId(options.persistencyId);
	
	var getStoredSettings = function() {
		var settings = yUtils.storage.get(persistencyId);
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
			if (! $.pivotUtilities.renderers[settings.rendererName]) delete settings.rendererName;
		} else {
			settings = {};
		}
		return settings;
	};
	var draw = function() {
		var doDraw = function() {
			var onRefresh = function(pivotObj) {
				if (persistencyId) {
					var storeSettings = {
						cols: pivotObj.cols,
						rows: pivotObj.rows,
						rendererName: pivotObj.rendererName,
						aggregatorName: pivotObj.aggregatorName,
						vals: pivotObj.vals,
					}
					yUtils.storage.set(persistencyId, storeSettings, "month");
				}
				if (pivotObj.rendererName.toLowerCase().indexOf(' chart') >= 0) {
					openGchartBtn.show();
				} else {
					openGchartBtn.hide();
				}
				yasr.updateHeader();
			};
			
			
			var openGchartBtn = $('<button>', {class: 'openPivotGchart yasr_btn'})
			.text('Chart Config')
			.click(function() {
				$pivotWrapper.find('div[dir="ltr"]').dblclick();
			}).appendTo(yasr.resultsContainer);
			$pivotWrapper = $('<div>', {class: 'pivotTable'}).appendTo($(yasr.resultsContainer));
			
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
			
			//hmmm, directly after the callback finishes (i.e., directly after this line), the svg is draw.
			//just use a short timeout to update the header
			setTimeout(yasr.updateHeader, 400);
		}
		
		if (yasr.options.useGoogleCharts && options.useGoogleCharts && !$.pivotUtilities.gchart_renderers) {
			require('./gChartLoader.js')
				.on('done', function() {
					try {
						require('../node_modules/pivottable/dist/gchart_renderers.js');
						$.extend(true,  $.pivotUtilities.renderers, $.pivotUtilities.gchart_renderers);
					} catch (e) {
						//hmm, still something went wrong. forget about it;
						options.useGoogleCharts = false;
					}
					doDraw();
				})
				.on('error', function() {
					console.log('could not load gchart');
					options.useGoogleCharts = false;
					doDraw();
				})
				.googleLoad();
		} else {
			//everything is already loaded. just draw
			doDraw();
		}
	};
	var canHandleResults = function(){
		return yasr.results && yasr.results.getVariables && yasr.results.getVariables() && yasr.results.getVariables().length > 0;
	};
	
	var getDownloadInfo =  function() {
		if (!yasr.results) return null;
		var svgEl = yasr.resultsContainer.find('.pvtRendererArea svg');
		if (svgEl.length == 0) return null;
		
		return {
			getContent: function(){return svgEl[0].outerHTML;},
			filename: "queryResults.svg",
			contentType: "image/svg+xml",
			buttonTitle: "Download SVG Image"
		};
	};
	
	return {
		getDownloadInfo: getDownloadInfo,
		options: options,
		draw: draw,
		name: "Pivot Table",
		canHandleResults: canHandleResults,
		getPriority: 4,
	}
};



root.defaults = {
	mergeLabelsWithUris: false,
	useGoogleCharts: true,
	useD3Chart: true,
	persistencyId: 'pivot',
	pivotTable: {}
};

root.version = {
	"YASR-rawResponse" : require("../package.json").version,
	"jquery": $.fn.jquery,
};