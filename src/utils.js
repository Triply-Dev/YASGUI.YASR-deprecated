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
	}
};