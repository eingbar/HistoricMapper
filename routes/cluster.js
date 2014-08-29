var _ = require('underscore');
var L = require('../server-side-leaflet/leaflet');
var clustering = require('../server-side-leaflet/clustering');
var mongoose = require( 'mongoose' );
var HistoricSite = mongoose.model( 'HistoricSite' );
var Cluster = mongoose.model( 'Cluster' );
var clusterLayer;
var disableClusteringAtZoom = 17;

// exports.checkThis = function (req, res, next) {
// 	refreshClusterData(function function_name (err, clusters) {
// 		res.writeHead(200, { 'Content-Type': 'application/json' });
// 		res.end(JSON.stringify({}));	
// 	});
// }

exports.getRefreshClusterData = function(req, res, next){
	refreshClusterData(function function_name (err, clusters) {
		// res.writeHead(200, { 'Content-Type': 'application/json' });
		// res.end(JSON.stringify(clusters));	
		next();
	});
};

exports.cluster = function(req, res, next){	
	var zoom = req.query.zoom; 
	var boundsArr = req.query.BBox.split(',');
	if (zoom < 18) {
		geoGetClusters(req.query.BBox, zoom, function (err, results) {
			if (err) {console.log(err)};
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify(results));
		});
	} else {
		geoSearchForPlaces (req.query.BBox, function (err, results) {
			if (err) {console.log(err)};
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify(results));
		});
	}
};

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
		    		loc: L.marker(L.latLng(site.geometry.coordinates[1], site.geometry.coordinates[0])).toGeoJSON().geometry,
		    		//loc: [site.geometry.coordinates[1], site.geometry.coordinates[0]],
		    		 feature_id: site.properties._id,
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

function geoGetClusters (BBox, zoom, next) {
	//[[[[0],[1]], [[2],[1]], [[2],[3]], [[0],[3]], [[0],[1]]]]	
	Cluster.count({}, function (err, count) {
		if (err) {return next(err)};
		var done = function () {
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
					zoomLevel: zoom,
					obsolete: false
				};
				Cluster.find(query).exec(function ( err, clusters, count ){
				    if( err ) {console.log(err);};		    
					next(null, clusters);
				});
			}
			catch(err){
				console.log(err);
			}
		};

		if (count == 0) {
			// refreshClusterData(function (argument) {
			// 	done();
			// });
			done();
		} 
		else {
			done();
		};
	});
}

function refreshClusterData (next) {	
	console.log('Loading Sites...');
	HistoricSite.find({Status: 'Published', Obsolete: false}).exec(function ( err, sites, count ){
	    if( err ) return next( err );
	    console.log('Done Loading Sites...');
	    console.log('Creating GeoJSON Sites...');	    
	    var data = createGeoJson(sites).features;
	    console.log('Done Creating GeoJSON Sites...');
	    sites = null;
	 //    console.log('Initing Map...');
		// initMap(data);
		// console.log('Done Initing Map...');
		// var CandM = [];
		// console.log('Processing Clusters...');
		// for(var zoomLevel in clusterLayer._gridClusters) {
		//    for(var row in clusterLayer._gridClusters[zoomLevel]._grid){
		//    		for(var column in clusterLayer._gridClusters[zoomLevel]._grid[row]){
		//    			for (var i = 0; i < clusterLayer._gridClusters[zoomLevel]._grid[row][column].length; i++) {
		//    				var cluster = clusterLayer._gridClusters[zoomLevel]._grid[row][column][i];
		//    				console.log('Zoom: ' + zoomLevel + ' / Row: ' + row + ' / Column: ' + column);
		//    				var boundBox = cluster.getBounds().toBBoxString().split(",");
		// 				var south = parseFloat(boundBox[1]);
		// 				var west = parseFloat(boundBox[0]);
		// 				var north = parseFloat(boundBox[3]);
		// 				var east = parseFloat(boundBox[2]);
		// 				//boundsArr = [[west, south], [west, north], [east, north], [east, south], [west, south]];
		// 				//bboxpolypoly = new L.Polygon(boundsArr);
		//    				CandM.push({type: "cluster", zoomLevel: parseInt(zoomLevel) + 1, count: cluster.getChildCount(), loc: L.marker(cluster.getLatLng()).toGeoJSON().geometry, convexHull: L.polygon(cluster.getConvexHull()).toGeoJSON().geometry, bbox: [[south, west], [north, east]]});
		//    			};		   			
		//    		}		   		
		//    }
		// }
		// console.log('Processing Markers...');
		// for(var zoomLevel in clusterLayer._gridUnclustered) {
		//    for(var row in clusterLayer._gridUnclustered[zoomLevel]._grid){
		//    		for(var column in clusterLayer._gridUnclustered[zoomLevel]._grid[row]){
		//    			for (var i = 0; i < clusterLayer._gridUnclustered[zoomLevel]._grid[row][column].length; i++) {
		//    				var cluster = clusterLayer._gridUnclustered[zoomLevel]._grid[row][column][i];
		//    				//console.log('Zoom: ' + zoomLevel + ' / Row: ' + row + ' / Column: ' + column + ' / ClusterCount: ' + cluster.getLatLng());
		//    				CandM.push({type: "marker", zoomLevel: parseInt(zoomLevel) + 1, loc: L.marker(cluster.getLatLng()).toGeoJSON().geometry, feature_id: cluster.feature.properties._id, ImageURL: cluster.feature.properties.ImageURL, Name: cluster.feature.properties.Name, Complete: cluster.feature.properties.Complete});
		//    			};		   			
		//    		}		   		
		//    }
		// }

		var CandM = [];			

		clustering(data, function (clusters) {
			CandM = clusters;

			var done = _.after(CandM.length, function () {
				CandM = null;
				data = null;
				Cluster.remove({obsolete: false}, function (err) {
					if (err) {return next(err);};
					Cluster.update({obsolete: true}, {$set: {obsolete: false}}, { multi: true }, function (err) {
						if (err) {return next(err);};
						if (typeof next === 'function'){							
							next(null);
						};
					});
				});
			});	

			console.log('Saving everything...');
			for (var i = 0; i < CandM.length; i++) {
				var cluster = CandM[i];
				cluster.obsolete = true;
				Cluster.create(cluster, function (err, savedCluster) {
					if (err) {console.log(err)};
					done();
				});
			};	
		});			
	});	
}
exports.refreshClusterData = refreshClusterData;


function initMap (data) {
	L.domReset();
	map = L.map('map', {
        center: [38.543869175876154, -92.5433349609375],
        zoom: 1,
        maxZoom: disableClusteringAtZoom,
        fadeAnimation: false,
        zoomAnimation: false,
        markerZoomAnimation: false
    });

    //need to clear all data and layers
    clusterLayer = new L.MarkerClusterGroup({disableClusteringAtZoom: disableClusteringAtZoom, maxClusterRadius: 80});	
	map.addLayer(clusterLayer);
	dataLayer = L.geoJson(data);
	var DOMDataLayer = dataLayer;
	clusterLayer.addLayer(DOMDataLayer);
}

function createGeoJson (sites) {
	try{
		var output = {};
		output.type = "FeatureCollection"
		output.features = new Array(sites.length);

		for (var i = 0; i < sites.length; i++) {
			//if (i % 1000 == 0){console.log(i);};			
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
			// //output.features.push(feature);
			output.features[i] = feature;
		};
		return output;
	}
	catch(err){console.log(err);}	
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