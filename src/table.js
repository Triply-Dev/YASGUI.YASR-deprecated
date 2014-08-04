var $ = require("jquery");
require("./../lib/DataTables/media/js/jquery.dataTables.js");
var imgs = require("yasgui-utils").imgs;

/**
 * Constructor of plugin which displays results as a table
 * 
 * @param yasr {object}
 * @param parent {DOM element}
 * @param options {object}
 * @class YASR.plugins.table
 * @return yasr-table (doc)
 * 
 */
var root = module.exports = function(yasr,parent, options) {
	var plugin = {};
	plugin.options = $.extend(true, {}, root.defaults, options);
	plugin.yasr = yasr;
	plugin.parent = parent;
	plugin.draw = function() {
		root.draw(plugin);
	};
	/**
	 * Human-readable name of this plugin (used in selection widget)
	 * 
	 * @property pluginDoc.name
	 * @type string
	 * @default "Table"
	 */
	plugin.name = "Table";
	/**
	 * Check whether this plugin can handler the current results
	 * 
	 * @property canHandleResults
	 * @type function
	 * @default If resultset contains variables in the resultset, return true
	 */
	plugin.canHandleResults = function(yasr){
		return yasr.results && yasr.results.getVariables() && yasr.results.getVariables().length > 0;
	};
	/**
	 * If we need to dynamically check which plugin to use, we rank the possible plugins by priority, and select the highest one
	 * 
	 * @property getPriority
	 * @param yasrDoc
	 * @type int|function
	 * @default 10
	 */
	plugin.getPriority =  function(yasr){return 10;};
	
	plugin.getDownloadInfo = function() {
		if (!plugin.yasr.results) return null;
		return {
			getContent: function(){return require("./bindingsToCsv.js")(yasr.results.getAsJson());},
			filename: "queryResults.csv",
			contentType: "text/csv",
			buttonTitle: "Download as CSV"
		};
	};
	
	plugin.disableSelectorOn = function(yasr) {
		
	};
	return plugin;
};

root.draw = function(plugin) {
	plugin.table = $('<table cellpadding="0" cellspacing="0" border="0" class="resultsTable"></table>');
	$(plugin.parent).html(plugin.table);

	var dataTableConfig = plugin.options.datatable;
	dataTableConfig.aaData = getRows(plugin);
	dataTableConfig.aoColumns = getVariablesAsCols(plugin),
	plugin.table.dataTable(dataTableConfig); 
	
	
	drawSvgIcons(plugin);
	
	addEvents(plugin);
	
	//move the table upward, so the table options nicely aligns with the yasr header
	var headerHeight = plugin.yasr.header.outerHeight() - 5; //add some space of 5 px between table and yasr header
	if (headerHeight > 0) {
		plugin.yasr.container.find(".dataTables_wrapper")
		.css("position", "relative")
		.css("top", "-" + headerHeight + "px")
		.css("margin-bottom", "-" + headerHeight + "px");
	}
	
	
	//make sure we redraw the table on resize
	$(window).on('resize', function () {
		if (plugin.table) plugin.table.fnAdjustColumnSizing();
	});
};


var getVariablesAsCols = function(plugin) {
	var cols = [];
	cols.push({"sTitle": ""});//row numbers
	var sparqlVars = plugin.yasr.results.getVariables();
	for (var i = 0; i < sparqlVars.length; i++) {
		cols.push({"sTitle": sparqlVars[i]});
	}
	return cols;
};

var getRows = function(plugin) {
	var rows = [];
	var bindings = plugin.yasr.results.getBindings();
	var vars = plugin.yasr.results.getVariables();
	var usedPrefixes = null;
	if (plugin.yasr.options.getUsedPrefixes) {
		usedPrefixes = (typeof plugin.yasr.options.getUsedPrefixes == "function"? plugin.yasr.options.getUsedPrefixes(plugin.yasr):  plugin.yasr.options.getUsedPrefixes);
	}
	for (var rowId = 0; rowId < bindings.length; rowId++) {
		var row = [];
		row.push("");//row numbers
		var binding = bindings[rowId];
		for (var colId = 0; colId < vars.length; colId++) {
			var sparqlVar = vars[colId];
			if (sparqlVar in binding) {
				if (plugin.options.drawCellContent) {
					row.push(plugin.options.drawCellContent(rowId, colId, binding[sparqlVar], usedPrefixes));
				} else {
					row.push("");
				}
			} else {
				row.push("");
			}
		}
		rows.push(row);
	}
	return rows;
};


root.getFormattedValueFromBinding = function(rowId, colId, binding, usedPrefixes) {
	var value = null;
	if (binding.type == "uri") {
		var href = visibleString = binding.value;
		if (usedPrefixes) {
			for (var prefix in usedPrefixes) {
				if (visibleString.indexOf(usedPrefixes[prefix]) == 0) {
					visibleString = prefix + href.substring(usedPrefixes[prefix].length);
					break;
				}
			}
		}
		value = "<a class='uri' target='_blank' href='" + href + "'>" + visibleString + "</a>";
	} else {
		var stringRepresentation = binding.value;
		if (binding["xml:lang"]) {
			stringRepresentation = '"' + binding.value + '"@' + binding["xml:lang"];
		} else if (binding.datatype) {
			var xmlSchemaNs = "http://www.w3.org/2001/XMLSchema#";
			var dataType = binding.datatype;
			if (dataType.indexOf(xmlSchemaNs) == 0) {
				dataType = "xsd:" + dataType.substring(xmlSchemaNs.length);
			} else {
				dataType = "<" + dataType + ">";
			}
			
			stringRepresentation = '"' + stringRepresentation + '"^^' + dataType;
		}
		
		value = "<span class='nonUri'>" + stringRepresentation + "</span>";
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

var addEvents = function(plugin) {
	plugin.table.on( 'order.dt', function () {
	    drawSvgIcons(plugin);
	});
	
	plugin.table.delegate("td", "click", function(event) {
		if (plugin.options.handlers && plugin.options.handlers.onCellClick) {
			var result = plugin.options.handlers.onCellClick(this, event);
			if (result === false) return false;
		}
	}).delegate("td",'mouseenter', function(event) {
		if (plugin.options.handlers && plugin.options.handlers.onCellMouseEnter) {
			plugin.options.handlers.onCellMouseEnter(this, event);
		}
		var tdEl = $(this);
		if (plugin.options.fetchTitlesFromPreflabel 
				&& tdEl.attr("title") === undefined
				&& tdEl.text().trim().indexOf("http") == 0) {
			addPrefLabel(tdEl);
		}
	}).delegate("td",'mouseleave', function(event) {
		if (plugin.options.handlers && plugin.options.handlers.onCellMouseLeave) {
			plugin.options.handlers.onCellMouseLeave(this, event);
			
		}
	});
};

var addPrefLabel = function(td) {
	var addEmptyTitle = function() {
		td.attr("title","");//this avoids trying to fetch the label again on next hover
	};
	$.get("http://preflabel.org/api/v1/label/" + encodeURIComponent(td.text()) + "?silent=true")
		.success(function(data) {
			if (typeof data == "object" && data.label) {
				td.attr("title", data.label);
			} else if (typeof data == "string" && data.length > 0 ) {
				td.attr("title", data);
			} else {
				addEmptyTitle();
			}
			
		})
		.fail(addEmptyTitle);
};

var drawSvgIcons = function(plugin) {
	var sortings = {
		"sorting": "unsorted",
		"sorting_asc": "sortAsc",
		"sorting_desc": "sortDesc"
	};
	plugin.table.find(".sortIcons").remove();
	for (var sorting in sortings) {
		var svgDiv = $("<div class='sortIcons'></div>").css("float", "right").css("margin-right", "-12px").width(10).height(15);
		imgs.draw(svgDiv, {id: sortings[sorting], width: 12, height: 16});
		plugin.table.find("th." + sorting).append(svgDiv);
	}
};
root.openCellUriInNewWindow = function(cell) {
	if (cell.className.indexOf("uri") >= 0) {
		window.open(this.innerHTML);
	}
};

/**
 * Defaults for table plugin
 * 
 * @type object
 * @attribute YASR.plugins.table.defaults
 */
root.defaults = {
	
	/**
	 * Draw the cell content, from a given binding
	 * 
	 * @property drawCellContent
	 * @param binding {object}
	 * @type function
	 * @return string
	 * @default YASR.plugins.table.getFormattedValueFromBinding
	 */
	drawCellContent: root.getFormattedValueFromBinding,
	
	/**
	 * Try to fetch the label representation for each URI, using the preflabel.org services. (fetching occurs when hovering over the cell)
	 * 
	 * @property fetchTitlesFromPreflabel
	 * @type boolean
	 * @default true
	 */
	fetchTitlesFromPreflabel: true,
	/**
	 * Set a number of handlers for the table
	 * 
	 * @property handlers
	 * @type object
	 */
	handlers: {
		/**
		 * Mouse-enter-cell event
		 * 
		 * @property handlers.onCellMouseEnter
		 * @type function
		 * @param td-element
		 * @default null
		 */
		onCellMouseEnter: null,
		/**
		 * Mouse-leave-cell event
		 * 
		 * @property handlers.onCellMouseLeave
		 * @type function
		 * @param td-element
		 * @default null
		 */
		onCellMouseLeave: null,
		/**
		 * Cell clicked event
		 * 
		 * @property handlers.onCellClick
		 * @type function
		 * @param td-element
		 * @default null
		 */
//		onCellClick: root.openCellUriInNewWindow
		onCellClick: null
	},
	/**
	 * This plugin uses the datatables jquery plugin (See datatables.net). For any datatables specific defaults, change this object. 
	 * See the datatables reference for more information
	 * 
	 * @property datatable
	 * @type object
	 */
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
        	$(oSettings.nTableWrapper).find(".paginate_button").each(function() {
        		if ($(this).attr("class").indexOf("current") == -1 && $(this).attr("class").indexOf("disabled") == -1) {
        			activePaginateButton = true;
        		}
        	});
        	if (activePaginateButton) {
        		$(oSettings.nTableWrapper).find(".dataTables_paginate").show();
        	} else {
        		$(oSettings.nTableWrapper).find(".dataTables_paginate").hide();
        	}
		},
		"aoColumnDefs": [
			{ "sWidth": "12px", "bSortable": false, "aTargets": [ 0 ] }//disable row sorting for first col
		],
	},
};

root.version = {
	"YASR-table" : require("../package.json").version,
	"jquery": $.fn.jquery,
	"jquery-datatables": $.fn.DataTable.version
};