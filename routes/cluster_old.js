var fs = require('fs'),
    L = require('../server-side-leaflet/leaflet');
var _ = require('underscore');
var siteUtils = require('../util/siteUtils');
var mongoose = require( 'mongoose' );
var HistoricDistrict = mongoose.model( 'HistoricDistrict' );
var HistoricSite = mongoose.model( 'HistoricSite' );

function createGeoJson (sites) {
	try{
		var output = {};
		output.type = "FeatureCollection"
		output.features = [];

		for (var i = 0; i < sites.length; i++) {
			var site = sites[i];
			var feature = {"type": "Feature", "properties": {}, "geometry": {}};
			feature.geometry = site.loc;
			feature.properties._id = site._id;
			feature.properties.Name = site.Name;
			feature.properties.Status = site.Status;
			feature.properties.Complete = (site.Description && (site.Files.length > 0 && getImageURLForSite(site.Files))? true : false);
			if (site.Files.length > 0) {
				feature.properties.ImageURL = getImageURLForSite(site.Files);
			} else {
				//var url = 'http://maps.googleapis.com/maps/api/streetview?size=200x150&location=' + site.Address + ' Eureka CA&sensor=false&key=AIzaSyB3ww0AdcfTz3b28cGCQ2islQxv0g964EE'
				var url = null;
				feature.properties.ImageURL = url;
			};
			output.features.push(feature);
		};
		return output
	}
	catch(err){console.log(err);}	
}
var data, dataLayer = {},
	clusterLayer = {};

var map = {};

function refreshClusterData () {
	HistoricSite.find({Status: 'Published', Obsolete: false}).sort({ RecModDate: 'desc'}).exec(function ( err, sites, count ){
	    if( err ) return next( err );
		//res.writeHead(200, { 'Content-Type': 'application/json' });
		data = createGeoJson(sites);
		try{map.remove()}catch(err){}
		map = {};
		//initMap();	
	});
}

function geoSearchForPlaces (BBox, next) {
	//[[[[0],[1]], [[2],[1]], [[2],[3]], [[0],[3]], [[0],[1]]]]	
	try{
		var boundsArr = BBox.split(',');
		var south = parseFloat(boundsArr[1]);
		var west = parseFloat(boundsArr[0]);
		var north = parseFloat(boundsArr[3]);
		var east = parseFloat(boundsArr[2]);
		boundsArr = [[[west, south], [west, north], [east, north], [east, south], [west, south]]];
		var query = {
			loc: {
				$geoWithin: {
					$geometry:{
						type: "Polygon",
						coordinates: boundsArr
					}
				}
			},			
			Status: 'Published',
			Obsolete: false
		};
		HistoricSite.find(query).sort({ RecModDate: 'desc'}).exec(function ( err, sites, count ){
		    if( err ) {console.log(err);};
		    var geoSites = createGeoJson(sites).features;
		    var output = [];
		    for (var i = 0; i < geoSites.length; i++) {
		    	var site = geoSites[i];
		    	var marker = {type: "marker", 
		    		loc: [site.geometry.coordinates[1], site.geometry.coordinates[0]],
		    		 _id: site.properties._id,
		    		 ImageURL: site.properties.ImageURL,
		    		 Name: site.properties.Name,
		    		 Complete: site.properties.Complete
		    	};
		    	output.push(marker);
		    };
			next(null, output);
		});
	}
	catch(err){
		console.log(err);
	}
}

refreshClusterData();

function initMap () {
	//L.domReset();
	map = L.map('map', {
        center: [38.543869175876154, -92.5433349609375],
        zoom: 1,
        maxZoom: 17,
        fadeAnimation: false,
        zoomAnimation: false,
        markerZoomAnimation: false
    });

    //need to clear all data and layers
    clusterLayer = new L.MarkerClusterGroup({disableClusteringAtZoom: 17, maxClusterRadius: 80});	
	map.addLayer(clusterLayer);
	dataLayer = L.geoJson(data);
	var DOMDataLayer = dataLayer;
	clusterLayer.addLayer(DOMDataLayer);
}

exports.refreshClusterData = refreshClusterData;

exports.cluster = function(req, res, next){	
	var zoom = req.query.zoom; 
	var boundsArr = req.query.BBox.split(',');

	var southWest = L.latLng(boundsArr[1], boundsArr[0]),
	    northEast = L.latLng(boundsArr[3], boundsArr[2]),
	    bounds = L.latLngBounds(southWest, northEast);

	if (zoom < 18) {
		//try{map.remove()}catch(err){}
		//map = {};
		try{
			if (!map.remove) {
				initMap();
			};
		}
		catch(err){
			console.log(err)
		}	
		
		map.fitBounds(bounds);

	    var features = {};	
	    features = clusterLayer._featureGroup.getLayers().map(function (cluster) {
	        var f = cluster.toGeoJSON();
			var count = 0;
			
	        if (cluster.getAllChildMarkers) { // markercluster plugin call
		        var children = cluster.getAllChildMarkers();
		        for (var i = 0; i < children.length; i++) {
		            if (children[i].count)
		                count += children[i].count;
		            else
		                count++;
		        }
		    }
		    else if(cluster.count) { // custom call
		        count = cluster.count;
		    }
		    if (!bounds.contains(cluster.getLatLng())) {
	    		return;
		    };
		    if (count > 1) {
		    	var boundBox = cluster.getBounds().toBBoxString().split(",");
		    	return {type: "cluster", count: count, loc: [cluster.getLatLng().lat, cluster.getLatLng().lng], convexHull: cluster.getConvexHull(), bbox: [boundBox[1],boundBox[0],boundBox[3],boundBox[2]]}
		    } else {
		    	try{
				    var marker = {type: "marker", loc: [cluster.getLatLng().lat, cluster.getLatLng().lng], _id: cluster.feature.properties._id, ImageURL: cluster.feature.properties.ImageURL, Name: cluster.feature.properties.Name, Complete: cluster.feature.properties.Complete};
			    	return marker;
		    	}
		    	catch(err){console.log(f);}		    	
		    };
	        f.properties.featureCount = count;
	        return f;
	        //return iconCreateFunction(cluster);
	    });

	    var outFeatures = [];
	    for (var i = 0; i < features.length; i++) {
	    	if (features[i]) {outFeatures.push(features[i]);};
	    };
	    
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify(outFeatures));
	} else {
		geoSearchForPlaces (req.query.BBox, function (err, results) {
			if (err) {console.log(err)};
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify(results));
		});
	};	
};

function getImageURLForSite(Files){
	for (var i = 0; i < Files.length; i++) {
		var item = Files[i];
		if (item.DocumentType != 'Image') continue;
		if (item.Obsolete) continue;
		if (!item.Approved) continue;

		return item.URLFolder + '/' + item.ThumbName;
	};
	return null;
};