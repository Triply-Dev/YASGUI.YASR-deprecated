'use strict';
var $ = require('jquery');
module.exports = {
	uriToPrefixed: function(prefixes, uri) {
		if (prefixes) {
			for (var prefix in prefixes) {
				if (uri.indexOf(prefixes[prefix]) == 0) {
					uri = prefix + ':' + uri.substring(prefixes[prefix].length);
					break;
				}
			}
		}
		return uri;
	},
	getGoogleType: function(binding) {
		if (binding.type != null && (binding.type === 'typed-literal' || binding.type === 'literal')) {
			switch (binding.datatype) {
			case 'http://www.w3.org/2001/XMLSchema#float':
			case 'http://www.w3.org/2001/XMLSchema#decimal':
			case 'http://www.w3.org/2001/XMLSchema#int':
			case 'http://www.w3.org/2001/XMLSchema#integer':
			case 'http://www.w3.org/2001/XMLSchema#long':
			case 'http://www.w3.org/2001/XMLSchema#gYearMonth':
			case 'http://www.w3.org/2001/XMLSchema#gYear':
			case 'http://www.w3.org/2001/XMLSchema#gMonthDay':
			case 'http://www.w3.org/2001/XMLSchema#gDay':
			case 'http://www.w3.org/2001/XMLSchema#gMonth':
				return "number";
			case 'http://www.w3.org/2001/XMLSchema#date':
				return "date";
			case 'http://www.w3.org/2001/XMLSchema#dateTime':
				return "datetime";
			case 'http://www.w3.org/2001/XMLSchema#time':
				return "timeofday";
			default:
				return "string";
			}
		} else {
			return "string";
		}
	},
	castGoogleType: function(binding, prefixes){
		if (binding == null) {
			return null;
		}
		if (binding.type != null && (binding.type === 'typed-literal' || binding.type === 'literal')) {
			switch (binding.datatype) {
			case 'http://www.w3.org/2001/XMLSchema#float':
			case 'http://www.w3.org/2001/XMLSchema#decimal':
			case 'http://www.w3.org/2001/XMLSchema#int':
			case 'http://www.w3.org/2001/XMLSchema#integer':
			case 'http://www.w3.org/2001/XMLSchema#long':
			case 'http://www.w3.org/2001/XMLSchema#gYearMonth':
			case 'http://www.w3.org/2001/XMLSchema#gYear':
			case 'http://www.w3.org/2001/XMLSchema#gMonthDay':
			case 'http://www.w3.org/2001/XMLSchema#gDay':
			case 'http://www.w3.org/2001/XMLSchema#gMonth':
				return Number(binding.value);
			case 'http://www.w3.org/2001/XMLSchema#date':
			case 'http://www.w3.org/2001/XMLSchema#dateTime':
			case 'http://www.w3.org/2001/XMLSchema#time':
				return new Date(binding.value);
			default:
				return binding.value;
			}
		} else {
			if (binding.type = 'uri') {
				return module.exports.uriToPrefixed(prefixes, binding.value);
			} else {
				return binding.value;
			}
		}
	},
};