var $ = require("jquery");
var root = module.exports = function(queryResponse) {
	
	if (typeof queryResponse == string) {
		try {
			queryResponse.wrapped = JSON.parse(queryResponse.response);
			return true;
	    } catch (e) {
	        return false;
	    }
	}
	if (typeof queryResponse.response == "object" && queryResponse.response.constructor === {}.constructor) {
		queryResponse.wrapped = queryResponse.response;
		return true;
	}
	
	return false;
	
};