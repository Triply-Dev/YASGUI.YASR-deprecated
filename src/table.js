var $ = require("jquery");
require("./../lib/DataTables/media/js/jquery.dataTables.js");
var imgs = require("./imgs");
var table;
var yasr;
var options;
var root = module.exports = function(_yasr, _options) {
	options = $.extend(true, {}, root.defaults, _options);
	yasr = _yasr;
	
	
	table = $('<table cellpadding="0" cellspacing="0" border="0" class="resultsTable"></table>');
	$(yasr.parent).html( table );
	var dataTableConfig = options.datatable;
	dataTableConfig.aaData = getRows();
	dataTableConfig.aoColumns = getVariablesAsCols(),
	table.dataTable(dataTableConfig); 
	
	drawSvgIcons();
	table.on( 'order.dt', function () {
	    drawSvgIcons();
	} );
};

root.defaults = {
	datatable: {
		"aaSorting": [],//disable initial sorting
		"iDisplayLength": 50,//default page length
    	"aLengthMenu": [[10, 50, 100, 1000, -1], [10, 50, 100, 1000, "All"]],//possible page lengths
    	"bLengthChange": true,//allow changing page length
    	"sPaginationType": "full_numbers",//how to show the pagination options
        "fnDrawCallback": function ( oSettings ) {
        	//trick to show row numbers
        	for ( var i = 0; i < oSettings.aiDisplay.length; i++) {
				$('td:eq(0)',oSettings.aoData[oSettings.aiDisplay[i]].nTr).html(i + 1);
			}
        	
        	//Hide pagination when we have a single page
        	var activePaginateButton = false;
        	yasr.parent.find(".paginate_button").each(function() {
        		if ($(this).attr("class").indexOf("current") == -1 && $(this).attr("class").indexOf("disabled") == -1) {
        			activePaginateButton = true;
        		}
        	});
        	if (activePaginateButton) {
        		yasr.parent.find(".dataTables_paginate").show();
        	} else {
        		yasr.parent.find(".dataTables_paginate").hide();
        	}
		},
		"aoColumnDefs": [
			{ "sWidth": "12px", "bSortable": false, "aTargets": [ 0 ] }//disable row sorting for first col
		],
	},
};

var getVariablesAsCols = function() {
	var cols = [];
	cols.push({"sTitle": ""});//row numbers
	var sparqlVars = yasr.results.getVariables();
	for (var i = 0; i < sparqlVars.length; i++) {
		cols.push({"sTitle": sparqlVars[i]});
	}
	return cols;
};

var getRows = function() {
	var rows = [];
	var bindings = yasr.results.getBindings();
	var vars = yasr.results.getVariables();
	for (var rowId = 0; rowId < bindings.length; rowId++) {
		var row = [];
		row.push("");//row numbers
		var binding = bindings[rowId];
		for (var colId = 0; colId < vars.length; colId++) {
			var sparqlVar = vars[colId];
			if (sparqlVar in binding) {
				row.push(getFormattedValueFromBinding(binding[sparqlVar]));
			} else {
				row.push("");
			}
		}
		rows.push(row);
	}
	return rows;
};

var getFormattedValueFromBinding = function(binding) {
	var value = null;
	if (binding.type == "uri") {
		value = "<a class='snorqlLink' href='#'>" + binding.value + "</a>";
	} else {
		value = "<span class='regularValue'>" + binding.value + "</span>";
	}
	return value;
};
var getExternalLinkElement = function() {
	var element = $("#externalLink");
	if (element.length == 0) {
		element = $("<img id='externalLink' src='" + Yasgui.constants.imgs.externalLink.get() + "'></img>")
			.on("click", function(){
				window.open($(this).parent().text());
			});
	}
	return element;
};
var executeSnorqlQuery = function(uri) {
	console.log("exec snorql");
//	var newQuery = Yasgui.settings.defaults.tabularBrowsingTemplate;
//	newQuery = newQuery.replace(/<URI>/g, "<" + uri + ">");
//	Yasgui.settings.getCurrentTab().query = newQuery;
//	Yasgui.tabs.getCurrentTab().cm.reloadFromSettings();
//	Yasgui.sparql.query();
};

var addEvents = function() {
	table.delegate(".snorqlLink", "click", function() {
		executeSnorqlQuery(this.innerHTML);
		return false;
	});
	
	
	table.delegate("td",'mouseenter', function(event) {
		var extLinkElement = getExternalLinkElement();
		$(this).append(extLinkElement);
		extLinkElement.css("top", ($(this).height() - extLinkElement.height() / 2)); 
		extLinkElement.show();
	}).delegate("td",'mouseleave', function(event) {
		getExternalLinkElement().hide();
	});
};

var drawSvgIcons = function() {
	var sortings = {
		"sorting": "unsorted",
		"sorting_asc": "sortAsc",
		"sorting_desc": "sortDesc"
	};
	table.find(".sortIcons").remove();
	for (var sorting in sortings) {
		console.log(sorting);
		var svgDiv = $("<div class='sortIcons'></div>").css("float", "right").css("margin-right", "-12px").width(10).height(15);
		imgs.draw(svgDiv, {id: sortings[sorting], width: 12, height: 16});
		console.log(table.find("th." + sorting));
		table.find("th." + sorting).append(svgDiv);
	}
//	table.find("th.sorting").each(function(){
//		var svgDiv = $("<div class='sortIcons'></div>").css("float", "right").css("margin-right", "-12px").width(10).height(15);
//		imgs.draw(svgDiv, {id: "unsorted", width: 12, height: 16});
//		table.find("th.sorting").append(svgDiv);
//	});
//	var svgDiv = $("<div class='sortIcons'></div>").css("float", "right").css("margin-right", "-12px").width(10).height(15);
//	imgs.draw(svgDiv, {id: "unsorted", width: 12, height: 16});
//	table.find("th.sorting").append(svgDiv);
};