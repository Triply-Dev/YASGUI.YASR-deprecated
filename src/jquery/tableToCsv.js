'use strict';
var $ = require('jquery');


$.fn.tableToCsv = function(config) {
	var csvString = "";
	config = $.extend({
		quote: "\"",
		delimiter: ",",
		lineBreak: "\n",
	}, config)




	var needToQuoteString = function(value) {
		//quote when it contains whitespace or the delimiter
		var needQuoting = false;
		if (value.match("[\\w|" + config.delimiter + "|" + config.quote + "]")) {
			needQuoting = true;
		}
		return needQuoting;
	};
	var addValueToString = function(value) {
		//Quotes in the string need to be escaped
		value.replace(config.quote, config.quote + config.quote);
		if (needToQuoteString(value)) {
			value = config.quote + value + config.quote;
		}
		csvString += " " + value + " " + config.delimiter;
	};

	var addRowToString = function(rowArray) {
		rowArray.forEach(function(val) {
			addValueToString(val);
		});
		csvString += config.lineBreak;
	}

	var tableArrays = [];
	var $el = $(this);
	var rowSpans = {};



	var colCount = 0;
	$el.find('tr:first *').each(function() {
		if ($(this).attr('colspan')) {
			colCount += +$(this).attr('colspan');
		} else {
			colCount++;
		}
	});

	$el.find('tr').each(function(rowId, tr) {
		var $tr = $(tr);
		var rowArray = []

		var skippedCols = 0;
		for (var colId = 0;
			(colId + skippedCols) < colCount; colId++) {

			//for col Id, do we have a rowspan attr left? Then first add this one to rowArray
			if (rowSpans[colId]) {
				rowArray.push(rowSpans[colId].text);
				rowSpans[colId].rowSpan--;
				if (!rowSpans[colId].rowSpan) delete rowSpans[colId];
				continue;
			}

			var $cell = $tr.find(':nth-child(' + (colId + 1) + ')');
			console.log($cell);

			var colspan = $cell.attr('colspan');
			var rowspan = $cell.attr('rowspan');
			if (colspan && !isNaN(colspan)) {
				for (var i = 0; i < colspan; i++) {
					rowArray.push($cell.text());
				}
				skippedCols += (colspan - 1);
			} else if (rowspan && !isNaN(rowspan)) {
				rowSpans[colId + skippedCols] = {
					rowSpan: rowspan - 1,
					text: $cell.text()
				}
				rowArray.push($cell.text());
				skippedCols++;
			} else {
				rowArray.push($cell.text());
			}
		}
		addRowToString(rowArray);


	})

	return csvString;
}