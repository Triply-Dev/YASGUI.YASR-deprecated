'use strict';
var $ = require("jquery");
var map = require('lodash/map');
var reduce = require('lodash/reduce')

var getAsObject = function(entity) {
	if (typeof entity == "object") {
		if ("bnode" == entity.type) {
			entity.value = entity.value.slice(2);
		}
		return entity;
	}
	if (entity.indexOf("_:") == 0) {
		return {
			type: "bnode",
			value: entity.slice(2)
		}
	}
	return {
			type: "uri",
			value: entity
		}
}
var root = module.exports = function(responseJson) {
	if (responseJson) {
		var hasContext = false;
		var mapped = map(responseJson, function(value, subject) {
			return map(value, function (value1, predicate) {
				return map(value1, function(object) {
					if (object.graphs) {
						hasContext = true;
						return map(object.graphs, function(context){
							return [
									getAsObject(subject),
									getAsObject(predicate),
									getAsObject(object),
									getAsObject(context)
								]
						})
					} else {
						return [
									getAsObject(subject),
									getAsObject(predicate),
									getAsObject(object)
								]
					}
				})
			})
		});
		var reduced = reduce(mapped, function(memo, el) {return memo.concat(el)}, []);
		reduced = reduce(reduced, function(memo, el) {return memo.concat(el)}, []);
		var bindings;
		if (!hasContext) {
			bindings = reduced.map(function(triple) {return {subject : triple[0], predicate: triple[1], object: triple[2]}});
		} else {
			reduced = reduce(reduced, function(memo, el) {return memo.concat(el)}, []);
			bindings = reduced.map(function(triple) {return {subject : triple[0], predicate: triple[1], object: triple[2], context: triple[3]}});
		}
		var variables = (hasContext) ? [ "subject", "predicate", "object", "context" ] : [ "subject", "predicate", "object"];
		return {
			"head" : {
				"vars" : variables
				},
				"results" : {
					"bindings": bindings
				}
			};

	}
	return false;

};
