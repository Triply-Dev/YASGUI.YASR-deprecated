var $ = require("jquery");

var root = module.exports = function(queryResponse) {
	var parsers = {
			xml: require("./xml.js"),
			json: require("./json.js"),
			tsv: require("./tsv.js"),
			csv: require("./csv.js")
		};
		var contentType;
		var origResponse;
		var json = null;
		
		
	contentType = (typeof queryResponse == "object" && queryResponse.contentType? queryResponse.contentType.toLowerCase(): null);
	origResponse = (typeof queryResponse == "object" && queryResponse.response? queryResponse.response: queryResponse);
	
	var getQueryResponseObject = function(queryResponse) {
		var returnObj = {};
		if (typeof queryResponse == "string") {
			returnObj.response = queryResponse;
		} else {
			returnObj = queryResponse;
		}
		return returnObj;
	};

	var getAsJson = function() {
		if (json) return json;
		if (json === false) return false;//already tried parsing this, and failed. do not try again... 
		var getParserFromContentType = function() {
			if (contentType) {
				if (contentType.indexOf("json") > -1) {
					json = parsers.json(origResponse);
				} else if (contentType.indexOf("xml") > -1) {
					json = parsers.xml(origResponse);
				} else if (contentType.indexOf("csv") > -1) {
					json = parsers.csv(origResponse);
				} else if (contentType.indexOf("tab-separated") > -1) {
					json = parsers.tsv(origResponse);
				}
			}
		};
		

		var doLuckyGuess = function() {
			json = parsers.json(origResponse);
			if (!json) json = parsers.xml(origResponse);
		};

		
		getParserFromContentType();
		if (!json) {
			doLuckyGuess();
		}
		if (!json) json = false;//explicitly set to false, so we don't try to parse this thing again..
		return json;
	};


	var getVariables = function() {
		var json = getAsJson();
		if ("head" in json) {
			return json.head.vars;
		} else {
			return null;
		}
	};

	var getBindings = function() {
		var json = getAsJson();
		if ("results" in json) {
			return json.results.bindings;
		} else {
			return null;
		}
	};

	var getBoolean = function() {
		var json = getAsJson();
		if ("boolean" in json) {
			return json.boolean;
		} else {
			return null;
		}
	};
	var getOriginalResponse = function() {
		return origResponse;
	};
	
	return {
		getAsJson: getAsJson,
		getOriginalResponse: getOriginalResponse,
		getVariables: getVariables,
		getBindings: getBindings,
		getBoolean: getBoolean
	};
};



