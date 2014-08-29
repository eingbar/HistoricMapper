var fs = require('fs'),
    L = require('./leaflet');

function cluster(data, callback) {
    callback = callback || function () {};
    
    //var data = JSON.parse(content);        
    var map = L.map('map', {
            center: [42.7325, -71.18752],
            zoom: 1,
            maxZoom: 17
        }),
        
    dataLayer = L.geoJson(data),
    clusterLayer = new L.MarkerClusterGroup();
    
    map.addLayer(clusterLayer);
    clusterLayer.addLayer(dataLayer);
    
    var features = clusterLayer._featureGroup.getLayers().map(function (cluster) {
        var f = cluster.toGeoJSON();
        f.properties.featureCount = cluster.__parent.getChildCount();
        return f;
    });
    var CandM = [];
    for(var zoomLevel in clusterLayer._gridClusters) {
       for(var row in clusterLayer._gridClusters[zoomLevel]._grid){
            for(var column in clusterLayer._gridClusters[zoomLevel]._grid[row]){
                for (var i = 0; i < clusterLayer._gridClusters[zoomLevel]._grid[row][column].length; i++) {
                    var cluster = clusterLayer._gridClusters[zoomLevel]._grid[row][column][i];
                    console.log('Zoom: ' + zoomLevel + ' / Row: ' + row + ' / Column: ' + column);
                    var boundBox = cluster.getBounds().toBBoxString().split(",");
                    var south = parseFloat(boundBox[1]);
                    var west = parseFloat(boundBox[0]);
                    var north = parseFloat(boundBox[3]);
                    var east = parseFloat(boundBox[2]);
                    //boundsArr = [[west, south], [west, north], [east, north], [east, south], [west, south]];
                    //bboxpolypoly = new L.Polygon(boundsArr);
                    CandM.push({type: "cluster", zoomLevel: parseInt(zoomLevel) + 1, count: cluster.getChildCount(), loc: L.marker(cluster.getLatLng()).toGeoJSON().geometry, convexHull: L.polygon(cluster.getConvexHull()).toGeoJSON().geometry, bbox: [[south, west], [north, east]]});
                };                  
            }               
       }
    }

    for(var zoomLevel in clusterLayer._gridUnclustered) {
       for(var row in clusterLayer._gridUnclustered[zoomLevel]._grid){
            for(var column in clusterLayer._gridUnclustered[zoomLevel]._grid[row]){
                for (var i = 0; i < clusterLayer._gridUnclustered[zoomLevel]._grid[row][column].length; i++) {
                    var cluster = clusterLayer._gridUnclustered[zoomLevel]._grid[row][column][i];
                    //console.log('Zoom: ' + zoomLevel + ' / Row: ' + row + ' / Column: ' + column + ' / ClusterCount: ' + cluster.getLatLng());
                    CandM.push({type: "marker", zoomLevel: parseInt(zoomLevel) + 1, loc: L.marker(cluster.getLatLng()).toGeoJSON().geometry, feature_id: cluster.feature.properties._id, ImageURL: cluster.feature.properties.ImageURL, Name: cluster.feature.properties.Name, Complete: cluster.feature.properties.Complete});
                };                  
            }               
       }
    }

    callback(CandM);
}

if (require.main === module) {
    // cluster(12, function (geojson) {
    //     //process.stdout.write(JSON.stringify(geojson));  
    // });
} else {
    module.exports = cluster;
}