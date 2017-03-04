"use strict";
var $ = require("jquery"), CodeMirror = require("codemirror");

require("codemirror/addon/fold/foldcode.js");
require("codemirror/addon/fold/foldgutter.js");
require("codemirror/addon/fold/xml-fold.js");
require("codemirror/addon/fold/brace-fold.js");

require("codemirror/addon/edit/matchbrackets.js");
require("codemirror/mode/xml/xml.js");
require("codemirror/mode/javascript/javascript.js");
var imgs = require("./imgs.js");
var L = require("leaflet");
//Ugly... need to set this global, as wicket-leaflet tries to access this global variable
global.Wkt = require("wicket/wicket");
require("wicket/wicket-leaflet");
var root = module.exports = function(yasr) {
  var plugin = {};
  var options = $.extend(true, {}, root.defaults);
  var cm = null;
  var getOption = function(key) {
    // if (!options[key]) return {};
    if (options[key]) {
      if (typeof options[key] === "function") {
        return options[key](yasr, L);
      } else {
        return options[key];
      }
    } else {
      return undefined;
    }
  };

  var draw = function() {
    var zoomToEl = function(e) {
      map.setView(e.latlng, 15);
    };
    var plotVariables = getGeoVariables();
    if (plotVariables.length === 0)
      return $('<div class="leaflet">Nothing to draw</div>').appendTo(yasr.resultsContainer);
    var mapWrapper = $('<div class="leaflet"/>').appendTo(yasr.resultsContainer);
    var map = new L.Map(mapWrapper.get()[0], getOption("map"));
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
        var mySVGIcon = L.icon({
          iconUrl: svgURL,
          iconSize: [25, 41],
          shadowSize: [25, 45],
          iconAnchor: [12, 41],
          popupAnchor: [0, -41]
        });
        var feature = wicket.read(binding[plotVariable].value).toObject({ icon: mySVGIcon });
        var markerPos;
        if (feature.getBounds) {
          //get center of polygon or something
          markerPos = feature.getBounds().getCenter();
        } else if (feature.getLatLng) {
          //its a point, just get the lat/lng
          markerPos = feature.getLatLng();
        }

        function addPopupAndEventsToMarker(el) {
          el.on("dblclick", zoomToEl);
          var popupContent = options.formatPopup && options.formatPopup(yasr, L, plotVariable, binding);
          if (popupContent) {
            hasLabel = true;
            el.bindPopup(popupContent);
          }
        }

        if (markerPos) {
          var shouldDrawSeparateMarker = !!feature.getBounds; //a lat/lng is already a marker
          if (shouldDrawSeparateMarker) {
            addPopupAndEventsToMarker(L.marker(markerPos, { icon: mySVGIcon }).addTo(map));
          } else {
            addPopupAndEventsToMarker(feature);
          }
        }
        features.push(feature);
      }
    }
    if (features.length) {
      var group = new L.featureGroup(features).addTo(map);
      map.fitBounds(group.getBounds());
    }

    // missingPopupMsg: function(yasr, L, geoVariables, bindings) {
    if (!hasLabel && options.missingPopupMsg) {
      var msg = null;
      if (typeof options.missingPopupMsg === "string") {
        msg = options.missingPopupMsg;
      } else if (typeof options.missingPopupMsg === "function") {
        msg = options.missingPopupMsg(yasr, L, plotVariables);
      }
      if (msg) yasr.resultsContainer.prepend(msg);
    }
  };

  var geoKeywords = ["POINT", "POLYGON", "LINESTRING", "MULTIPOINT", "MULTILINESTRING", "MULTIPOLYGON"];
  var valueIsGeometric = function(val) {
    val = val.trim().toUpperCase();
    for (var i = 0; i < geoKeywords.length; i++) {
      if (val.indexOf(geoKeywords[i]) === 0) {
        return true;
      }
    }
    return false;
  };
  var getGeoVariables = function() {
    if (!yasr.results) return [];
    var bindings = yasr.results.getBindings();
    if (!bindings || bindings.length === 0) {
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
  };
  var canHandleResults = function() {
    return getGeoVariables().length > 0;
  };

  return {
    draw: draw,
    name: "Geo",
    canHandleResults: canHandleResults,
    getPriority: 2
  };
};

root.defaults = {
  map: function(yasr, L) {
    return {
      layers: [
        new L.tileLayer("http://{s}.tile.osm.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        })
      ]
    };
  },
  formatPopup: function(yasr, L, forVariable, bindings) {
    if (bindings[forVariable + "Label"] && bindings[forVariable + "Label"].value) {
      return bindings[forVariable + "Label"].value;
    }
  },
  missingPopupMsg: function(yasr, L, geoVariables) {
    if (geoVariables && geoVariables.length) {
      return "<small>Tip: Add a label variable prefixed with the geo variable name to show popups on the map. E.g. <code>" +
        geoVariables[0] +
        "Label</code></small>";
    }
  },
  disabledTitle: "Query for geo variables in WKT format to plot them on a map"
};

root.version = {
  leaflet: L.version
};
