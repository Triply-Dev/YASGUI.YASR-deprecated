"use strict";
var $ = require("jquery");

var LibColor = require("color");
var wellknown = require('wellknown')
var colormap = require('colormap');
var _colorbrewer = require('colorbrewer')
var colorbrewer = {};
//postprocess colorbrower so we store the identifiers case insensitive.
//also make sure to only add 1 map per identifier (it has several maps, each with varying specificity)
for (var color in _colorbrewer) {
  var mostSpecificScale = [];
  $.each(_colorbrewer[color], function(i, scale) {
    if (scale.length > mostSpecificScale.length) mostSpecificScale = scale;
  })
  colorbrewer[color.toLowerCase()] = mostSpecificScale
}

var colorScales = require('colormap/colorScale');
function getHexFromScale(scaleType, scaleVal) {
  if (scaleVal > 1 || scaleVal < 0) return;
  if (!scaleType.length) return
  var hexScale;
  if (colorbrewer[scaleType.toLowerCase()]) {
    //colorbrewer: http://colorbrewer2.org/#type=sequential&scheme=BuGn&n=3
    hexScale = colorbrewer[scaleType.toLowerCase()];
  } else if (colorScales[scaleType]) {
    //colormap: https://github.com/bpostlethwaite/colormap
    hexScale = colormap({colormap: scaleType});
  }
  if (!hexScale || !hexScale.length) return;
  var index = Math.max(Math.round(scaleVal * hexScale.length) -1, 0);
  return hexScale[index];
}
var root = (module.exports = function(yasr) {
  var plugin = {};
  var options = $.extend(true, {}, root.defaults);
  var defaultColor = LibColor(options.defaultColor);
  var defaultStyle = options.defaultStyle;

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


  var getSvgMarker = function(Colors) {
    var fillColor2 = Colors.fill.lighten(0.3).toString();
    var borderColor2 = Colors.border.lighten(0.3).toString();
    var fillId=''+Math.random();
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="40"><defs><linearGradient id="' + fillId + 'c"><stop offset="0" stop-color="' +
      Colors.fill.toString() +
      '"/><stop offset="1" stop-color="' +
      fillColor2 +
      '"/></linearGradient><linearGradient id="' + fillId + 'd"><stop offset="0" stop-color="' +
      Colors.border.toString() +
      '"/><stop offset="1" stop-color="' +
      borderColor2 +
      '"/></linearGradient><linearGradient xlink:href="#a" x1="351.1" y1="551.6" x2="351.1" y2="512.9" gradientUnits="userSpaceOnUse" gradientTransform="translate(-2.715)"/><linearGradient xlink:href="#a" x1="318.6" y1="550.1" x2="318.6" y2="512.4" gradientUnits="userSpaceOnUse" gradientTransform="translate(94.732,2.054)"/><linearGradient xlink:href="#a" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-1,0,0,1,731.268,2.054)" x1="318.6" y1="550.1" x2="318.6" y2="512.4"/><linearGradient xlink:href="#a" gradientUnits="userSpaceOnUse" gradientTransform="translate(94.232,2.054)" x1="318.6" y1="550.1" x2="318.6" y2="512.4"/><linearGradient xlink:href="#a" gradientUnits="userSpaceOnUse" gradientTransform="translate(-28.58,-0.437)" x1="445.3" y1="541.3" x2="445.3" y2="503.7"/><linearGradient xlink:href="#b" gradientUnits="userSpaceOnUse" gradientTransform="translate(63,-0.438)" x1="351.7" y1="522.8" x2="351.7" y2="503.7"/><linearGradient xlink:href="#a" gradientUnits="userSpaceOnUse" gradientTransform="translate(-28.58,-0.437)" x1="445.3" y1="541.3" x2="445.3" y2="503.7"/><linearGradient xlink:href="#b" gradientUnits="userSpaceOnUse" gradientTransform="translate(63,-0.438)" x1="351.7" y1="522.8" x2="351.7" y2="503.7"/><linearGradient xlink:href="#a" gradientUnits="userSpaceOnUse" gradientTransform="translate(-28.58,-0.437)" x1="445.3" y1="541.3" x2="445.3" y2="503.7"/><linearGradient xlink:href="#b" gradientUnits="userSpaceOnUse" gradientTransform="translate(63,-0.438)" x1="351.7" y1="522.8" x2="351.7" y2="503.7"/><linearGradient xlink:href="#a" gradientUnits="userSpaceOnUse" gradientTransform="translate(-432.796,-503.349)" x1="445.3" y1="541.3" x2="445.3" y2="503.7"/><linearGradient xlink:href="#b" gradientUnits="userSpaceOnUse" gradientTransform="translate(-341.216,-503.35)" x1="351.7" y1="522.8" x2="351.7" y2="503.7"/><linearGradient xlink:href="#a" gradientUnits="userSpaceOnUse" gradientTransform="translate(-28.846,-0.287)" x1="445.3" y1="541.3" x2="445.3" y2="503.7"/><linearGradient xlink:href="#b" gradientUnits="userSpaceOnUse" gradientTransform="translate(62.734,-0.288)" x1="351.7" y1="522.8" x2="351.7" y2="503.7"/></defs><rect y="4.5" x="6.3" height="14.5" width="12.6" fill="#fff"/><path d="M12.6 0.6C6 0.6 0.6 6.2 0.6 12.4c0 2.8 1.6 6.3 2.7 8.7l9.3 17.9 9.3-17.9c1.1-2.4 2.7-5.8 2.7-8.7 0-6.2-5.4-11.9-12-11.9zm0 7.2c2.6 0 4.7 2.1 4.7 4.7 0 2.6-2.1 4.7-4.7 4.7-2.6 0-4.7-2.1-4.7-4.7 0-2.6 2.1-4.7 4.7-4.7z" style="fill:url(#' + fillId + 'c);stroke:url(#' + fillId + 'd)"/><path d="m12.6 1.7c-5.9 0-10.9 5.2-10.9 10.8 0 2.4 1.4 5.8 2.6 8.3l0 0 8.3 16 8.3-16 0 0c1.1-2.4 2.6-5.7 2.6-8.2 0-5.5-4.9-10.7-10.9-10.7zm0 5c3.2 0 5.8 2.6 5.8 5.8 0 3.2-2.6 5.8-5.8 5.8-3.2 0-5.7-2.6-5.7-5.8 0-3.2 2.6-5.8 5.8-5.8z" style="fill:none;stroke-opacity:0.1;stroke:#fff"/></svg>'
    );
  };
  var draw = function() {
    var _L = options.L;

    var zoomToEl = function(e) {
      map.setView(e.latlng, 15);
    };
    var plotVariables = getGeoVariables();
    if (plotVariables.length === 0)
      return $('<div class="leaflet">Nothing to draw</div>').appendTo(yasr.resultsContainer);
    var mapWrapper = $('<div class="leaflet"/>').appendTo(yasr.resultsContainer);
    var mapConstructor = options.map;
    if (!mapConstructor) mapConstructor = options.maps[options.defaultMap || "osm"];
    if (!mapConstructor) {
      console.error('Could not find leaflet configuration for map ' + options.defaultMap);
      return;
    }
    var map = new _L.Map(mapWrapper.get()[0], mapConstructor(yasr, L));

    var mapLayers = options.defaultOverlay;
    if(mapLayers) _L.control.layers(null, mapLayers).addTo(map);

    if (options.clickBeforeInteract) {
      map.scrollWheelZoom.disable();
      map.on('focus',  function() { map.scrollWheelZoom.enable(); });
      map.on('blur',  function() { map.scrollWheelZoom.disable(); });
    }
    var features = [];
    var bindings = yasr.results.getBindings();
    var hasLabel = false;
    for (var varId = 0; varId < plotVariables.length; varId++) {
      var plotVariable = plotVariables[varId];

      for (var i = 0; i < bindings.length; i++) {
        var binding = bindings[i];
        if (! binding[plotVariable] || !binding[plotVariable].value) continue;

        var getColor = function() {
          var colorBinding = binding[plotVariable + "Color"];
          if (colorBinding) {
            var colorVal = colorBinding.value;
            var scaleSettings = colorVal.split(',');


            if (scaleSettings.length === 2) {
              var colorFromScale = getHexFromScale(scaleSettings[0].trim(),scaleSettings[1].trim())
              if (colorFromScale) colorVal = colorFromScale;
            }
            try {
              return LibColor(colorVal);
            } catch(e) {
              //invalid color representation
              return LibColor('grey')
            }
          }
          return defaultColor;
        };
        var Colors = {
          fill: getColor()
        };
        Colors.border = Colors.fill.saturate(0.2);
        var mySVGIcon = _L.divIcon({
          iconSize: [25, 41],
          // shadowSize: [25, 45],
          iconAnchor: [12, 41],
          popupAnchor: [0, -41],
          html: getSvgMarker(Colors)
        });


        var style = $.extend({}, defaultStyle, { icon: mySVGIcon, color: Colors.fill.toString()})
        var wkt = wellknown(binding[plotVariable].value);
        if (!wkt) {
          console.error('Failed to read WKT value: ' + binding[plotVariable].value)
          continue;
        }
        var feature = _L.geoJson(wkt, {style:style});

        var popupContent = options.formatPopup && options.formatPopup(yasr, L, plotVariable, binding);
        if (popupContent) {
          function addPopupAndEventsToMarker(el) {
            el.on("dblclick", zoomToEl);
            var popupContent = options.formatPopup && options.formatPopup(yasr, L, plotVariable, binding);
            if (popupContent) {
              hasLabel = true;
              el.bindPopup(popupContent);
            }
          }

          var markerPos;
          if (feature.getBounds) {
            //get center of polygon or something
            markerPos = feature.getBounds().getCenter();
          } else if (feature.getLatLng) {
            //its a point, just get the lat/lng
            markerPos = feature.getLatLng();
          }
          if (markerPos) {
            var shouldDrawSeparateMarker = !!feature.getBounds; //a lat/lng is already a marker
            if (shouldDrawSeparateMarker) {
              addPopupAndEventsToMarker(_L.marker(markerPos, { icon: mySVGIcon }).addTo(map));
            } else {
              addPopupAndEventsToMarker(feature);
            }
          }
        }
        features.push(feature);
      }
    }
    if (features.length) {
      try {
        var group = new _L.featureGroup(features).addTo(map);
        map.fitBounds(group.getBounds());
      } catch(e) {
        //This is a strange issue. Depending on which leaflet instance was used (i.e. the window.L one, or the required one)
      	//we might run into issues where the returned bounds are undefined...
      	//solved it by simply preferring the global instance (though this can be turned off)
        throw e;
      }
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
        if (!wellknown(val)) {
          console.error('Failed to parse WKT value ' + val)
          continue;
        }
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
});

var maps = {
  osm: function(yasr, L) {
    return {
      layers: [
        new L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        })
      ]
    };
  },
  nlmaps: function(yasr, L) {
    return {
      layers: [
        new L.tileLayer("https://geodata.nationaalgeoregister.nl/tiles/service/wmts/brtachtergrondkaart/EPSG:3857/{z}/{x}/{y}.png", {
          attribution: 'NLMaps | Kaartgegevens © Kadaster | <a href="http://www.verbeterdekaart.nl/" target="_blank">verbeter de kaart</a>'
        })
      ]
    };
  },
  /* free only up to 25'000 megapixels/year see https://shop.swisstopo.admin.ch/en/products/geoservice/swisstopo_geoservices/WMTS_info for further informations */
  chmaps: function(yasr, L) {
    var url = 'https://wmts10.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg';
    var stopoAttr = 'Map data &copy; <a href="https://www.swisstopo.admin.ch/">swisstopo</a> , ';
    var tilelayer = new L.tileLayer(url,{id: 'stopo.light', attribution: stopoAttr, minZoom: 4, maxZoom: 19});

    return {
      layers: [tilelayer] ,
      crs: L.CRS.EPSG3857,
          continuousWorld: true,
          worldCopyJump: false
    };
  }
};
root.defaults = {
  maps: maps,
  L: require('leaflet'),
  formatPopup: function(yasr, L, forVariable, bindings) {
    var binding = bindings[forVariable+"Label"];
    if (binding && binding.value) {
      if (binding.type === 'uri') {
        //format as link
        return '<a href="' + binding.value + '" target="_blank">' + binding.value + '</a>'
      } else {
        return binding.value;
      }
    }
  },
  missingPopupMsg: function(yasr, L, geoVariables) {
    if (geoVariables && geoVariables.length) {
      return (
        "<small>Tip: Add a label variable prefixed with the geo variable name to show popups on the map. E.g. <code>" +
        geoVariables[0] +
        "Label</code>. Or, append <code>Color</code> to change the color of the shape or marker.</small>"
      );
    }
  },
  disabledTitle: "Query for geo variables in WKT format to plot them on a map",
  defaultColor: "#2e6c97",
  clickBeforeInteract: false,
  defaultStyle: {},
  defaultOverlay: null,
  defaultMap: "osm" //or nlmaps
};

root.version = {
  leaflet: root.defaults.L.version
};
