/**
 * Created by Adam on 10/2/13.
 */

(function () {
    // Method signature matching $.fn.each()'s, for easy use in the .each loop later.
    var initialize = function (i, el) {
        // el is the input element that we need to initialize a map for, jQuery-ize it,
        //  and cache that since we'll be using it a few times.
        var $input = $(el);
        var mapName = $input.attr('name') + '_map';
        // Create the map div and insert it into the page.
        height = 400;
        var classList = $input.attr('class').split(/\s+/);
        $.each( classList, function(index, item){
            if (item.indexOf('height-') == 0) {
                height = String(item).split('-')[1];
            }
        });

        var $map = $('<div>', {
            css: {
                width: '100%',
                height: String(height) + 'px'
            }
        }).insertAfter($input);

        var map = L.map($map[0]);

        var osmLayer = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        var mapquestUrl = 'http://{s}.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.png';
        var subDomains = ['otile1', 'otile2', 'otile3', 'otile4'];
        var mapquestAttrib = 'Tiles Courtesy of <a href="http://www.mapquest.com/" target="_blank">MapQuest</a> <img src="http://developer.mapquest.com/content/osm/mq_logo.png">';
        var mapquest = new L.TileLayer(mapquestUrl, {maxZoom: 18, attribution: mapquestAttrib, subdomains: subDomains});

        var drawnItems = new L.FeatureGroup().addTo(map);

        var baseLayers = {
            "OSM": osmLayer,
            "MapQuest Satalite": mapquest
        };

        var overlays = {
            "DB Features": drawnItems
        };

        L.control.layers(baseLayers, overlays).addTo(map);

        if ($input.val()) {
            var valLayer = L.geoJson($.parseJSON($input.val()));

            valLayer.eachLayer(function (layer) {
                if (layer.eachLayer) {
                    layer.eachLayer(function (alayer) {
                        drawnItems.addLayer(alayer);
                    });
                }
                else {
                    drawnItems.addLayer(layer);
                }

            });

//$input.val(JSON.stringify(drawnItems.toGeoJSON()));
            try {
                map.fitBounds(valLayer.getBounds());
            } catch (e) {

            }
        }
        else {
            map.fitBounds([[40.80838485820714, -124.14679527282715], [40.79707995086174, -124.18284416198732]]);
        }

// If the input came from an EditorFor, initialize editing-related events.
        if ($input.hasClass('editor-for-dbgeography')) {
            // Initialize the draw control and pass it the FeatureGroup of editable layers
            //data-GISType="Polygon"
            var drawOptions = {
                polygon: false,
                polyline: false,
                circle: false,
                rectangle: false,
                marker: true
            }; //points only

            if ($input.attr('data-GISType')) {
                drawOptions.marker = false;
                drawOptions[$input.attr('data-GISType')] = true;
            };

            var drawControl = new L.Control.Draw({
                draw: drawOptions,
                edit: {
                    featureGroup: drawnItems
                }
            });
            map.addControl(drawControl);

            map.on('draw:created', function (e) {
                var type = e.layerType,
                    layer = e.layer;

                drawnItems.clearLayers();
                drawnItems.addLayer(layer);
                $input.val(JSON.stringify(layer.toGeoJSON().geometry));
            });

            map.on('draw:edited', function (e) {
                var features = drawnItems.toGeoJSON().features;
                layer = features[0];
                $input.val(JSON.stringify(layer.geometry));
            });

            map.on('draw:deleted', function (e) {
                $input.val('');
            });
        }
    };

// Find all DBGeography inputs and initialize maps for them.
    $('.editor-for-dbgeography, .display-for-dbgeography').each(initialize);
})();