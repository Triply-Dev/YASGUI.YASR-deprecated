$ = jQuery = require("jquery");

require("../node_modules/twitter-bootstrap-3.0.0/dist/js/bootstrap.js");

//only draw when we're at the docs page
$.get("yuidoc.json", function(data) {
	drawDocs(data);
});

var drawDocs = function(data) {
	var yasrDocs = $("#yasrDocs");
	var pluginDocs = $("#pluginDocs");
	var docsToInsert = {};
	var attributesAndProperties = [];
	/**
	 * draw classes (i.e. constructors)
	 */
	if (data.classes) {
		for (className in data.classes) {
			var classInfo = data.classes[className];
//			console.log(data.classes[className]);
			var docWrapper = $("<div></div>").addClass("doc");
			var codeBit = className + "(";
			//add parameters
			if (classInfo.params) {
				for (var paramIt = 0; paramIt < classInfo.params.length; paramIt++) {
					var param = classInfo.params[paramIt];
					var description = param.description;
					var type = param.type;
					var name = param.name;
					if (paramIt > 0) codeBit += ", ";
					codeBit += name;
					if (type) codeBit += ": " + type;
				}
			}
			codeBit += ")";
			//add return type
			if (classInfo["return"]) {
				var description = classInfo["return"].description;
				var type = classInfo["return"].type;
				codeBit += " &rarr; ";
				if (description) codeBit += description + ": ";
				if (type) codeBit += type;
			}
			$("<code></code>").html(codeBit).appendTo(docWrapper);
			if (classInfo.description) $("<p></p>").text(classInfo.description).appendTo(docWrapper);
			if (className == "YASR") {
				yasrDocs.append(docWrapper);
			} else {
				
				pluginDocs.append(docWrapper);
			}
			
		}
	}
	/**
	 * draw classitems
	 */
	for (var methodIt = 0; methodIt < data.classitems.length; methodIt++) {
		var method = data.classitems[methodIt];
		if (method.access && method.access == "private") continue;
		if (method.itemtype && (method.itemtype == "property" || method.itemtype == "attribute")) {
			attributesAndProperties.push(method);
			continue;
		}
		/**
		 * parse method
		 */
		if (method.itemtype && method.name) {
			console.log(method.name);
			var docWrapper = $("<div></div>").addClass("doc");
			var codeBit = method.name + "(";
			//add parameters
			if (method.params) {
				for (var paramIt = 0; paramIt < method.params.length; paramIt++) {
					var param = method.params[paramIt];
					var description = param.description;
					var type = param.type;
					var name = param.name;
					if (paramIt > 0) codeBit += ", ";
					codeBit += name;
					if (type) codeBit += ": " + type;
				}
			}
			codeBit += ")";
			//add return type
			if (method["return"]) {
				var description = method["return"].description;
				var type = method["return"].type;
				codeBit += " &rarr; ";
				if (description) codeBit += description + ": ";
				if (type) codeBit += type;
			}
			$("<code></code>").html(codeBit).appendTo(docWrapper);
			if (method.description) $("<p></p>").text(method.description).appendTo(docWrapper);
	     	docsToInsert[method.name] = docWrapper;
		}
		
		
		
	}
	
	var keys = [];
	for (methodName in docsToInsert) {
	    if (docsToInsert.hasOwnProperty(methodName)) {
    		keys.push(methodName);
	        
	    }
	}
	keys.sort();
	
	//draw functions
	for (var i = 0; i < keys.length; i++) {
		var name = keys[i];
		if (name.indexOf("YASR.plugins.") === 0) {
			pluginDocs.append(docsToInsert[name]);
		} else {
			
			yasrDocs.append(docsToInsert[name]);
		}
	}
	
	
	/**
	 * draw props (often config objects)
	 */
	var docsToAppendTo = yasrDocs;
	for (var i = 0; i < attributesAndProperties.length; i++ ){
		var attrOrProp = attributesAndProperties[i];
		var prop = $("<div></div>").addClass("doc");
		var name = attrOrProp.name;
		if (name.indexOf("YASR.plugins.") === 0) {
			docsToAppendTo = pluginDocs;
		} else if (name.indexOf("YASR.") === 0){
			docsToAppendTo = yasrDocs;
		}
		if (attrOrProp.itemtype == "property") prop.css("margin-left", "30px");
		if (attrOrProp.itemtype == "property" && name.indexOf(".") > 0) {
			var splitted = name.split(".");
			prop.css("margin-left", ((splitted.length) * 30) + "px");
			name = splitted[splitted.length - 1];
		}
		var codeText = name;
		if (attrOrProp.type) codeText += ": " + attrOrProp.type;
		if (attrOrProp["default"]) codeText += " (default: " + attrOrProp["default"] +")";
		$("<code></code>").text(codeText).appendTo(prop);
		$("<p></p>").text(attrOrProp.description).appendTo(prop);
		
		
		docsToAppendTo.append(prop);
	}
};