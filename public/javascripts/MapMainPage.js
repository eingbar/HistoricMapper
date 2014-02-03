var map;  
var clust; 
var searchResultsLyr; 
$(function(){
    map = L.map('map');
    
    var osmLayer = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    });

    var esriStreets = L.esri.basemapLayer("Streets").addTo(map);
    var esriImagryWithLabels = L.layerGroup([L.esri.basemapLayer("Imagery"), L.esri.basemapLayer("ImageryLabels"), L.esri.basemapLayer("ImageryTransportation")]);        
    var mapquestUrl = 'http://{s}.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.png';
    var subDomains = ['otile1', 'otile2', 'otile3', 'otile4'];
    var mapquestAttrib = 'Tiles Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png">';
    var mapquest = new L.TileLayer(mapquestUrl, {maxZoom: 18, attribution: mapquestAttrib, subdomains: subDomains});
    searchResultsLyr = L.featureGroup();
    var dbItems = L.geoJson(null /*placesGeoJson*/, {
                        onEachFeature: function (feature, layer) {
                            setClickHandlerForSites (feature, layer);
                        }
                    });
    var playLayer = L.featureGroup().addTo(map);
    var historicDistricts = L.geoJson(districtsGeoJson, {
                            onEachFeature: function (feature, layer) {
                                layer.bindPopup(feature.properties.Name);
                            }
                        });
    // var itemClusters = L.markerClusterGroup({
    //     disableClusteringAtZoom: 18,
    //     iconCreateFunction: function (cluster) {
    //         var childCount = cluster.getChildCount();

    //         var c = ' marker-cluster-';
    //         if (childCount <= 5) {
    //             c += 'small';
    //         } else if (childCount <= 10 ) {
    //             c += 'medium';
    //         } else {
    //             c += 'large';
    //         }

    //         return new L.DivIcon({ html: '<div><span>' + childCount + '</span></div>', className: 'marker-cluster' + c, iconSize: new L.Point(40, 40) });
    //     }
    // });
    //itemClusters.addLayer(dbItems);

    var rawDBItems = [];
    var drawnItems = new L.FeatureGroup().addTo(map);

    var baseLayers = {
        "ESRI Streets": esriStreets,
        "OSM Streets": osmLayer,
        "ESRI Satellite": esriImagryWithLabels
    };

    var overlays = {
        "Historic Places": playLayer,
        "Historic Districts": historicDistricts
    };

    var defaultLayer = "Historic Places";
    overlays[defaultLayer].addTo(map);

    L.control.layers(baseLayers, overlays).addTo(map);

    //loadSitesIntoMap();
    map.on('moveend', function(e) {
        $.ajax({
            dataType: "json",
            url: '/cluster',
            data: {BBox: map.getBounds().toBBoxString(), zoom: map.getZoom()},
            success: function(data){
                refreshMap(data);
            }
        });

        // clust = itemClusters._featureGroup.getLayers().map(function (cluster) {
        //     var f = cluster.toGeoJSON();
        //     var count = 0;
            
        //     if (cluster.getAllChildMarkers) { // markercluster plugin call
        //         var children = cluster.getAllChildMarkers();
        //         for (var i = 0; i < children.length; i++) {
        //             if (children[i].count)
        //                 count += children[i].count;
        //             else
        //                 count++;
        //         }
        //     }
        //     else if(cluster.count) { // custom call
        //         count = cluster.count;
        //     }

        //     if (count > 1) {
        //         return {type: "cluster", count: count, loc: [cluster.getLatLng().lat, cluster.getLatLng().lng], convexHull: cluster.getConvexHull()}
        //     } else {
        //         return {type: "marker", loc: [cluster.getLatLng().lat, cluster.getLatLng().lng]}
        //     };
        //     f.properties.featureCount = count;
        //     return f;
        //     //return iconCreateFunction(cluster);
        // });
        var sam = 4;
    });

    map.on('baselayerchange', function(e) {
        if (e.layer.options) {map.options.maxZoom = e.layer.options.maxZoom;}
        else {map.options.maxZoom = 19;};
    });

    map.on('overlayadd', function(e) {            
        var layerName = e.name;
        if (layerName == defaultLayer) {clearSearchResults();};
    });

    map.on('overlayremove', function(e) {
    });

    $('button.searchBtn').click(onSearchSites);
    $('.searchField').keypress(function(event){
        if (event.keyCode == 10 || event.keyCode == 13) {
            $(event.currentTarget).parent().parent().find('button.searchBtn').click();
            event.preventDefault();
        }
    });

    $("#searchResults .close").click(clearSearchResults);
    $("a.thematicTour").click(showThematicTour);

    var bbstring = configInitialZoom.split(',');
    var southWest = L.latLng(bbstring[1], bbstring[0]),
        northEast = L.latLng(bbstring[3], bbstring[2]),
        bounds = L.latLngBounds(southWest, northEast);
    map.fitBounds(bounds);
    //map.fitBounds([[40.79464126562503, -124.18081641197203],[40.79596113137117, -124.17631030082701]]);//no places test view
    var hash = new L.Hash(map);
    lazyLoadPlaceImages();
    
    function refreshMap (data) {
        playLayer.clearLayers();
        for (var i = 0; i < data.length; i++) {
            var point = data[i];
            if (!point) {continue;};
            if (!map.getBounds().contains(new L.LatLng(point.loc.coordinates[1], point.loc.coordinates[0]))) {
                continue;
            };
            playLayer.addLayer(generateMapMarkerCluster(point));
        };
        refreshList(function () {
            lazyLoadPlaceImages();
        }); 
    }

    function generateMapMarkerCluster (point) {            
        //within the ajax response handler            
        var c = new L.Marker(new L.LatLng(point.loc.coordinates[1], point.loc.coordinates[0]), {
            icon: iconCreateFunction(point) // ensures single markers are rendered as clusters
        });
        c.pointData = point;
        if (c.pointData.type == "marker" && selectedFeature) {
            if (selectedFeature.feature_id == c.pointData.feature_id) {
                c.setIcon(setPlaceIcon(c.pointData, null, 'red'));
            };
        } else if (c.pointData.type == "marker" && !selectedFeature) {
            c.setIcon(setPlaceIcon(c.pointData, null));
        };
        c.on("click", function (e) {                            
            if (e.target.pointData.type == "cluster") {
                // var boundsArr = e.target.pointData.bbox;
                // var southWest = L.latLng(boundsArr[0], boundsArr[1]),
                //     northEast = L.latLng(boundsArr[2], boundsArr[3]),
                //     bounds = L.latLngBounds(southWest, northEast);
                map.fitBounds(new L.Polygon((new L.GeoJSON(e.target.pointData.convexHull)).getLayers()[0].getLatLngs()));
            } else if (e.target.pointData.type == "marker") {                        
                popupPlaceDetails(e);
            };
        });
        c.on("mouseover", function (e) {                            
            if (e.target.pointData.type == "cluster") {
                if (window._shownPolygon) {
                    map.removeLayer(window._shownPolygon);
                }
                window._shownPolygon = new L.Polygon((new L.GeoJSON(e.target.pointData.convexHull)).getLayers()[0].getLatLngs());
                map.addLayer(window._shownPolygon);
            };
        });
        c.on("mouseout", function (e) {                            
            if (e.target.pointData.type == "cluster") {
                if (window._shownPolygon) {
                    map.removeLayer(window._shownPolygon);
                    window._shownPolygon = null;
                }
            };
        });
        return c;
    }

    // also used as MarkerClusterGroup option iconCreateFunction
    var iconCreateFunction = function (cluster) {

        var count = 1;

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

        if (count == 1) { // actual marker
            //return new L.Icon.Default();
            return setPlaceIcon (cluster);
        }

        // cluster icon
        var c = 'marker-cluster-';
        if (count < 10) {
            c += 'small';
        } else if (count < 100) {
            c += 'medium';
        } else {
            c += 'large';
        }

        return new L.DivIcon({
            html: '<div><span>' + count + '</span></div>',
            className: 'marker-cluster ' + c,
            iconSize: new L.Point(40, 40)
        });
    };

    function showThematicTour (event) {
        event.preventDefault();

        $.ajax({
            dataType: "json",
            url: '/sites/ThematicTour/' + $(this).text(),
            success: function(data){                    
                //searchResultsLyr
                var results = data;
                showSiteResults(results, 'thematic tour sites');
            }
        });
    }

    function onSearchSites (event) {
        searchVal = $(event.currentTarget).parent().find('.searchField').val();
        $('.searchField').val(searchVal);
        searchSites(searchVal);
    }

    function clearSearchResults (event) {
        $("#searchResults").hide();
        map.removeLayer(searchResultsLyr);
        overlays[defaultLayer].addTo(map);
        refreshList(function () {
            lazyLoadPlaceImages();
        });
    }

    function searchSites (value) {
        map.removeLayer(searchResultsLyr);
        if (!value) {
            handlePlaceTileClick();
            clearSearchResults();
            return;
        };
        $.ajax({
            dataType: "json",
            url: '/sites/TextSearch/' + value,
            success: function(data){                    
                //searchResultsLyr
                var results = data.results;
                showSiteResults(results);
            }
        });
    }

    function showSiteResults (results, resultsTitle) {
        searchResultsLyr.clearLayers();
        $('div#featureList').html("");
        for (var i = 0; i < results.length; i++) {
            var result = results[i];
            var _id = result.obj.feature_id;
            searchResultsLyr.addLayer(generateMapMarkerCluster(result.obj));
        };
        
        for (var i = results.length - 1; i >= 0; i--) {
            var result = results[i];
            var _id = result.obj.feature_id;
            var tile = $("div#featureList div#ListItem_" + _id)[0];
            $("#featureList").find(tile).prependTo("#featureList");
        };            
        
        if (results.length > 0) {
            //overlays
            var visLayers = getVisiableOverlays();
            for (var i = 0; i < visLayers.length; i++) {
                var l = visLayers[i];
                map.removeLayer(l);
            };
            searchResultsLyr.addTo(map);                
        } else {
            overlays[defaultLayer].addTo(map);
        };
        refreshList(function () {
            lazyLoadPlaceImages();
            $("#searchResults").show().find(".text").text(results.length + (resultsTitle ? ' ' + resultsTitle + ' found.' : " search results found."));
        });
    }

    function setPlaceIcon (feature, layer, color) {
        var icon = L.AwesomeMarkers.icon({
            icon: '',
            prefix: 'fa',
            markerColor: 'blue'
        });
        if (!color) {
            if (feature.Status == 'Draft') {icon.options.markerColor = 'darkgreen'}
            else if (feature.Status == 'Pending Review') {icon.options.markerColor = 'orange'};
        } else {
            icon.options.markerColor = color;
        };
        if (!feature.Complete) {icon.options.icon = 'fa-question-circle'};
        
        if (layer) {layer.setIcon(icon);};
        return icon;
    }

    function lazyLoadPlaceImages () {
        $("img.lazy").lazyload({
             container: $("#featurePanel")
        });
    }
    
    var selectedFeature;
    function handlePlaceTileClick (event) {
        selectedFeature = null;
        if (!event) {
            $.each(playLayer.getLayers(),function(index,value){
                var layer = value;
                var feature = layer.feature;
                //generateMapMarkerCluster(feature, layer);                    
            });
            $("#featureList .currentItem").removeClass("currentItem");
            return;
        };
        var id = $(event.currentTarget).attr('data-id');
        $.each(playLayer.getLayers(),function(index,value){
            var layer = value;
            var feature = value.pointData;
            if (feature.type != "cluster") {
                if (id == feature.feature_id) {
                    setPlaceIcon(feature, layer, 'red');
                    selectedFeature = feature;
                } else {
                    setPlaceIcon(feature, layer);
                };
            };                    
        });

        if (map.hasLayer(searchResultsLyr)) {
            $.each(searchResultsLyr.getLayers(),function(index,value){
                var layer = value;
                var feature = layer.pointData;
                if (id == feature.feature_id) {
                    setPlaceIcon(feature, layer, 'red');
                    selectedFeature = feature;
                } else {
                    setPlaceIcon(feature, layer);
                };
            });  
        };
        if (selectedFeature) {
            $("#featurePanel").scrollTop(0);
            map.setView([selectedFeature.loc.coordinates[1], selectedFeature.loc.coordinates[0]], map.options.maxZoom);
        };     
    }

    function popupPlaceDetails(event){
        var _id = (event.target.pointData ? event.target.pointData.feature_id : event.target.feature.properties._id);
        $.ajax({
            dataType: "json",
            url: '/sites/sitePopupData/' + _id,
            success: function(data){                    
                $("#sitePopupModal #myModalLabel").text(data.Name);
                if (data.Status != "Published") {
                    // data.Description += '<span class="pull-right label label-danger">Status: ' + data.Status + '</span>'
                    $("#sitePopupModal #draftFlag").text('Status: ' + data.Status);
                };
                var imagesHtml = '<br><div class=""><strong>Images:</strong></div><div class="row">';
                var b = 0;
                if (b % 4 == 0) { imagesHtml += '<div class="row"></div>'; b = 0;};
                for (var i = 0; i < data.Files.length; i++) {
                    var file = data.Files[i];
                    if (file.DocumentType != 'Image') continue;
                    if (file.Obsolete) continue;
                    if (!file.Approved) continue;
                    imagesHtml += '<div class="col-md-3 col-sm-3">\
                                    <a href="' + file.URLFolder + '/' + file.FileName + '" data-lightbox="PlaceImages" title="' + file.Caption + ' (Credit: ' + file.Credit + ')">\
                                    <img style="margin-bottom: 5px;" class="thumbnail" src="' + file.URLFolder + '/' + file.ThumbName + '">\
                                </a></div>';
                    b++;
                };
                imagesHtml += '</div>';
                $("#sitePopupModal .modal-view-btn").attr('href', '/sites/details/' + data._id);
                
                $("#sitePopupModal .modal-body").html('\
                    <div class="media">\
                    <div class="media-body">' + (data.Description ? data.Description : '<span style="font-style:italic">No Description Available</span>') + '</div>\
                    ' + (data.Files.length > 0 ? imagesHtml:'') + '\
                </div>');
                $('#sitePopupModal').modal();
            }
        });
    };

    function getVisiableOverlays () {
        var output = [];
        for (var property in overlays) {
            var l = overlays[property];
            if (map.hasLayer(l)) {output.push(l)};
        }
        return output;
    }

    function createTile (feature) {
        //layer.setIcon('http://placehold.it/100X100');
        //setPlaceIcon(feature, layer);
        var listIetmTemplate = '';
        var imageHtml = '';
        if (feature.ImageURL) {
            // imageHtml = '<div class="featureListThumbWrapper"><div data-src="' + feature.ImageURL + '" class="imagePlaceHolder"><i class="fa fa-camera"></i></div></div>';
            imageHtml = '<div class="featureListThumbWrapper"><img class="featureThumb lazy" data-original="' + feature.ImageURL + '"></div>';
        } else {                                    
            imageHtml = '<div class="noImageAvailable"><i class="fa fa-camera"></i></div>';
        };
        listIetmTemplate += '<div style="" class="siteTile' + (selectedFeature && (selectedFeature.feature_id == feature.feature_id)? ' currentItem' : '') + '" data-id="' + feature.feature_id + '" id="ListItem_' + feature.feature_id + '"><div class="col-md-6"><figure class="thumbnail">' + imageHtml + '<div class="ellipsis"><div><figcaption style="font-size: 8pt;">' + feature.Name + '</figcaption></div></div></figure></div></div>';
        var item = $('div#featureList').append(listIetmTemplate);
        $('#ListItem_' + feature.feature_id).click(handlePlaceTileClick);

        //layer.on('click', popupPlaceDetails);
    };

    function refreshList(next) {
        if ($("#featurePanel").css("display") != "none") {
            var layer;
            if (!map.hasLayer(searchResultsLyr)) {
                layer = playLayer
            } else {
                layer = searchResultsLyr;
            };   
            $("#featureList .currentItem").removeClass("currentItem");
            $('div#featureList').html("");
            $.each(layer.getLayers(),function(index,value){
                //find the corresponding tile
                if (value.pointData.type != "cluster") {
                    var feature = value.pointData;
                    createTile(feature);
                };
            });
            if (selectedFeature) {
                $("#featureList").find(".currentItem").prependTo("#featureList");
            };             
            next();
        } else {
            next();
        };            
    }
});

function openHelpModal () {        
    $('#AppHelpPopupModal').modal();
}

$('#AppHelpPopupModal').on('hidden.bs.modal', function (e) {
    if (localStorageSupported()) {
        localStorage.setItem("SkipHelpPopup", "true");
    };
});

if (localStorageSupported() && localStorage.getItem("SkipHelpPopup") == "true") {
    //Do nothing
} else {
    openHelpModal();  
};   