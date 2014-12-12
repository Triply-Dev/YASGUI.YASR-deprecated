'use strict';
/**
 * todo: chart height as option
 * 
 */
var $ = require('jquery'),
	utils = require('./utils.js'),
	yUtils = require('yasgui-utils');

var root = module.exports = function(yasr){
	var options = $.extend(true, {}, root.defaults);
	var id = yasr.container.closest('[id]').attr('id');
	if (yasr.options.gchart == null) {
		yasr.options.gchart = {};
	}
	var persistencyIdMotionChart = yasr.getPersistencyId('motionchart');
	var persistencyIdChartConfig = yasr.getPersistencyId('chartConfig');
	if (yasr.options.gchart.motionChartState == null) {
		yasr.options.gchart.motionChartState = yUtils.storage.get(persistencyIdMotionChart);
	}
	if (yasr.options.gchart.chartConfig == null) {
		yasr.options.gchart.chartConfig = yUtils.storage.get(persistencyIdChartConfig);
	}
	
	
	var editor = null;
	
	var initEditor = function(callback) {
		var google = require('google');
		editor = new google.visualization.ChartEditor();
		google.visualization.events.addListener(editor, 'ok', function(){
				var chartWrapper, tmp;
				chartWrapper = editor.getChartWrapper();
				if (!deepEq$(chartWrapper.getChartType, "MotionChart", '===')) {
					yasr.options.gchart.motionChartState = chartWrapper.n;

					yUtils.storage.set(persistencyIdMotionChart, yasr.options.gchart.motionChartState);
					chartWrapper.setOption("state", yasr.options.gchart.motionChartState);
					
					google.visualization.events.addListener(chartWrapper, 'ready', function(){
						var motionChart;
						motionChart = chartWrapper.getChart();
						google.visualization.events.addListener(motionChart, 'statechange', function(){
							yasr.options.gchart.motionChartState = motionChart.getState();
							yUtils.storage.set(persistencyIdMotionChart, yasr.options.gchart.motionChartState);
						});
					});
				}
				tmp = chartWrapper.getDataTable();
				chartWrapper.setDataTable(null);
				yasr.options.gchart.chartConfig = chartWrapper.toJSON();
				
				yUtils.storage.set(persistencyIdChartConfig, yasr.options.gchart.chartConfig);
				chartWrapper.setDataTable(tmp);
				chartWrapper.draw();
			});
			if (callback) callback();
	};

	return {
		name: "Google Chart",
		hideFromSelection: false,
		priority: 7,
		canHandleResults: function(yasr){
			var results, variables;
			return (results = yasr.results) != null && (variables = results.getVariables()) && variables.length > 0;
		},
		getDownloadInfo: function() {
			if (!yasr.results) return null;
			var svgEl = yasr.resultsContainer.find('svg');
			if (svgEl.length == 0) return null;
			
			return {
				getContent: function(){return svgEl[0].outerHTML;},
				filename: "queryResults.svg",
				contentType: "image/svg+xml",
				buttonTitle: "Download SVG Image"
			};
		},
		draw: function(){
			var doDraw = function () {
				//clear previous results (if any)
				yasr.resultsContainer.empty();
				var wrapperId = id + '_gchartWrapper';
				var wrapper = null;

				yasr.resultsContainer.append(
					$('<button>', {class: 'openGchartBtn yasr_btn'})
						.text('Chart Config')
						.click(function() {
							editor.openDialog(wrapper);
						})
				).append(
					$('<div>', {id: wrapperId, class: 'gchartWrapper'})
				);
				var dataTable = new google.visualization.DataTable();
				var jsonResults = yasr.results.getAsJson();
				
				jsonResults.head.vars.forEach(function(variable) {
					var type = utils.getGoogleType(jsonResults.results.bindings[0][variable]);
					dataTable.addColumn(type, variable);
				});
				var usedPrefixes = null;
				if (yasr.options.getUsedPrefixes) {
					usedPrefixes = (typeof yasr.options.getUsedPrefixes == "function"? yasr.options.getUsedPrefixes(yasr):  yasr.options.getUsedPrefixes);
				}
				jsonResults.results.bindings.forEach(function(binding) {
					var row = [];
					jsonResults.head.vars.forEach(function(variable) {
						row.push(utils.castGoogleType(binding[variable], usedPrefixes));
					})
					dataTable.addRow(row);
				});

				if (yasr.options.gchart.chartConfig) {

					wrapper = new google.visualization.ChartWrapper(yasr.options.gchart.chartConfig);
					
					if (wrapper.getChartType() === "MotionChart" && yasr.options.gchart.motionChartState != null) {
						wrapper.setOption("state", yasr.options.gchart.motionChartState);
						google.visualization.events.addListener(wrapper, 'ready', function(){
							var motionChart;
							motionChart = wrapper.getChart();
							google.visualization.events.addListener(motionChart, 'statechange', function(){
								yasr.options.gchart.motionChartState = motionChart.getState();
								yUtils.storage.set(persistencyIdMotionChart, yasr.options.gchart.motionChartState);
							});
						});
					}
					wrapper.setDataTable(dataTable);
				} else {
					wrapper = new google.visualization.ChartWrapper({
						chartType: 'Table',
						dataTable: dataTable,
						containerId: wrapperId
					});
				}
				wrapper.setOption("width", options.width);
				wrapper.setOption("height", options.height);
				wrapper.draw();
				yasr.updateHeader();
			}
			
			if (!require('google') || !require('google').visualization || !editor) {
				require('./gChartLoader.js')
					.on('done', function() {
						initEditor();
						doDraw();
					})
					.on('error', function() {
						console.log('errorrr');
						//TODO: disable or something?
					})
					.googleLoad();
			} else {
				//everything (editor as well) is already initialized
				doDraw();
			}
		}
	};
};
root.defaults = {
	height: "600px",
	width: "100%",
	persistencyId: 'gchart',
};

function deepEq$(x, y, type){
	var toString = {}.toString, hasOwnProperty = {}.hasOwnProperty,
	    has = function (obj, key) { return hasOwnProperty.call(obj, key); };
  var first = true;
  return eq(x, y, []);
  function eq(a, b, stack) {
    var className, length, size, result, alength, blength, r, key, ref, sizeB;
    if (a == null || b == null) { return a === b; }
    if (a.__placeholder__ || b.__placeholder__) { return true; }
    if (a === b) { return a !== 0 || 1 / a == 1 / b; }
    className = toString.call(a);
    if (toString.call(b) != className) { return false; }
    switch (className) {
      case '[object String]': return a == String(b);
      case '[object Number]':
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        return +a == +b;
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') { return false; }
    length = stack.length;
    while (length--) { if (stack[length] == a) { return true; } }
    stack.push(a);
    size = 0;
    result = true;
    if (className == '[object Array]') {
      alength = a.length;
      blength = b.length;
      if (first) {
        switch (type) {
        case '===': result = alength === blength; break;
        case '<==': result = alength <= blength; break;
        case '<<=': result = alength < blength; break;
        }
        size = alength;
        first = false;
      } else {
        result = alength === blength;
        size = alength;
      }
      if (result) {
        while (size--) {
          if (!(result = size in a == size in b && eq(a[size], b[size], stack))){ break; }
        }
      }
    } else {
      if ('constructor' in a != 'constructor' in b || a.constructor != b.constructor) {
        return false;
      }
      for (key in a) {
        if (has(a, key)) {
          size++;
          if (!(result = has(b, key) && eq(a[key], b[key], stack))) { break; }
        }
      }
      if (result) {
        sizeB = 0;
        for (key in b) {
          if (has(b, key)) { ++sizeB; }
        }
        if (first) {
          if (type === '<<=') {
            result = size < sizeB;
          } else if (type === '<==') {
            result = size <= sizeB
          } else {
            result = size === sizeB;
          }
        } else {
          first = false;
          result = size === sizeB;
        }
      }
    }
    stack.pop();
    return result;
  }
}