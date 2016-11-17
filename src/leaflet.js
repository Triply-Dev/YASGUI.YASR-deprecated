'use strict';
var $ = require("jquery"),
	CodeMirror = require("codemirror");

require('codemirror/addon/fold/foldcode.js');
require('codemirror/addon/fold/foldgutter.js');
require('codemirror/addon/fold/xml-fold.js');
require('codemirror/addon/fold/brace-fold.js');

require('codemirror/addon/edit/matchbrackets.js');
require('codemirror/mode/xml/xml.js');
require('codemirror/mode/javascript/javascript.js');
var imgs = require('./imgs.js')
var root = module.exports = function(yasr) {
	var plugin = {};
	var options = $.extend(true, {}, root.defaults);
	var cm = null;


	var draw = function() {
		var zoomToEl = function(e){map.setView(e.latlng, 15)}
		var plotVariables = getGeoVariables();
		if (plotVariables.length === 0) return $('<div class="leaflet">Nothing to draw</div>').appendTo(yasr.resultsContainer);
		var mapWrapper = $('<div class="leaflet"/>').appendTo(yasr.resultsContainer);
		var map = new L.Map(mapWrapper.get()[0]);
		L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
		    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(map);

		var features = [];
		var bindings = yasr.results.getBindings();
		var hasLabel = false;
		for (var varId = 0; varId < plotVariables.length; varId++) {
			var plotVariable = plotVariables[varId];
			for (var i = 0; i < bindings.length; i++) {

				var binding = bindings[i];

				if (!binding[plotVariable].value) continue;
				var wicket = new Wkt.Wkt();
				var svgURL = "data:image/svg+xml;base64," + btoa(imgs.marker);
				var mySVGIcon = L.icon( {
            iconUrl: svgURL,
            iconSize: [25, 41],
            shadowSize: [25, 45],
            iconAnchor: [12, 41],
            popupAnchor: [0, -41]
        } );
				var feature = wicket.read(binding[plotVariable].value).toObject({icon:mySVGIcon})
				var markerPos;
				if (feature.getBounds) {
					//get center of polygon or something
					markerPos = feature.getBounds().getCenter();
				} else if (feature.getLatLng) {
					//its a point, just get the lat/lng
					markerPos = feature.getLatLng();
				}

				function addPopupAndEventsToMarker(el) {
					el.on('dblclick', zoomToEl);
					if (binding[plotVariable+'Label'] && binding[plotVariable+'Label'].value) {
						hasLabel = true;

						el.bindPopup(binding[plotVariable+'Label'].value)
					}
				}

				if (markerPos) {
					var shouldDrawSeparateMarker = !!feature.getBounds;//a lat/lng is already a marker
					if (shouldDrawSeparateMarker) {
						addPopupAndEventsToMarker(L.marker(markerPos, { icon: mySVGIcon }).addTo(map))
					} else {
						addPopupAndEventsToMarker(feature)
					}

				}
				features.push(feature)
			}
		}
		if (features.length) {
			var group = new L.featureGroup(features).addTo(map)
			map.fitBounds(group.getBounds())
		}
		if (!hasLabel) yasr.resultsContainer.prepend('<small>Tip: Add a label variable prefixed with the geo variable name to show popups on the map. E.g. <code>'+ plotVariables[0] + 'Label</code></small>')
	};

	var geoKeywords = ['POINT', 'POLYGON', 'LINESTRING', 'MULTIPOINT', 'MULTILINESTRING', 'MULTIPOLYGON']
	var valueIsGeometric = function(val){
		val = val.trim().toUpperCase();
		for (var i = 0; i < geoKeywords.length; i++) {
			if (val.indexOf(geoKeywords[i]) === 0) {
				return true;
			}
		}
		return false;
	}
	var getGeoVariables = function() {
		if (!yasr.results) return [];
		var bindings = yasr.results.getBindings();
		if (bindings.length === 0) {
			return [];
		}
		var geoVars = [];
		var checkedVars = [];
		for (var i = 0; i < bindings.length; i++) {
			//we'd like to have checked at least 1 value for all variables. So keep looping
			//in case the first row does not contain values for all bound vars (e.g. optional)
			var binding = bindings[i];
			for (var bindingVar in binding) {
				if (checkedVars.indexOf(bindingVar) === -1 && binding[bindingVar].value) {
					checkedVars.push(bindingVar);
					if (valueIsGeometric(binding[bindingVar].value)) geoVars.push(bindingVar);
				}
			}
			if (checkedVars.length === yasr.results.getVariables().length) {
				//checked all vars. can break now
				break;
			}
		}
		return geoVars;
	}
	var canHandleResults = function() {
		return getGeoVariables().length > 0
	};

	// var getDownloadInfo = function() {
	// 	if (!yasr.results) return null;
	// 	var contentType = yasr.results.getOriginalContentType();
	// 	var type = yasr.results.getType();
	// 	return {
	// 		getContent: function() {
	// 			return yasr.results.getOriginalResponse();
	// 		},
	// 		filename: "queryResults" + (type ? "." + type : ""),
	// 		contentType: (contentType ? contentType : "text/plain"),
	// 		buttonTitle: "Download raw response"
	// 	};
	// };

	return {
		draw: draw,
		name: "Geo",
		canHandleResults: canHandleResults,
		getPriority: 2,
		// getDownloadInfo: getDownloadInfo,

	}
};



root.defaults = {

};

root.version = {

};
