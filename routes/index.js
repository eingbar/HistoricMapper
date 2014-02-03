/**
 * Created by Adam on 10/4/13.
 */
var mongoose = require( 'mongoose' );
var HistoricDistrict = mongoose.model( 'HistoricDistrict' );
var HistoricSite = mongoose.model( 'HistoricSite' );
var Tour = mongoose.model( 'Tour' );
var await = require('await');
var _ = require('underscore');
var siteUtils = require('../util/siteUtils');
var request = require('request');
var fs = require('fs');
var path = require('path');
var FileStorage = require('../util/FileStorage');

exports.index = function(req, res, next){
	Tour.find({Obsolete: false}, function (err, Tours) {
		if (err) {return next(err);};
		if (Tours.length == 0) {
			var random = (req.query.random ? req.query.random : null);
    		res.render( 'index/index', {random: random, tours: []});
    		return next(null);
		};


		var tourArr = [];
		for (var i = 0; i < Tours.length; i++) {
			tourArr.push(Tours[i].Text);
		};
		var toursAwait = await(tourArr);
		var tours = [];
		//[ { Name: 'Sample', Count: 1 } ]
		var done = _.after(tourArr.length, function () {
			var random = (req.query.random ? req.query.random : null);
    		res.render( 'index/index', {random: random, tours: tours});
		});
		for (var i = 0; i < tourArr.length; i++) {
			var tourName = tourArr[i];
			HistoricSite.count({Tours:tourName}, function (err, count) {
				if (err) {
					return next(err);
				};
				if (count > 0) {
					tours.push({Name: tourName, Count: count});
				};				
				done();
			});
		};
	});	
};

exports.historicDistricts = function(req, res, next){
	HistoricDistrict.find({Obsolete: false}, function (err, districts) {
		if (err) {return next(err);};
		// res.writeHead(200, { 'Content-Type': 'application/json' });

		createGeoJson(districts, function (err, output) {
			if (err) {return next(err);};
			res.end('var districtsGeoJson = ' + JSON.stringify(output));
		});	    
	});    
};

exports.placesGeoJson = function(req, res, next){
	var HistoricSite = mongoose.model( 'HistoricSite' );
	if (!req.query.random) {
        var status = [{Status: 'Published'}];
        if (res.locals.user) {status.push({Status: 'Draft', "DataOwner": res.locals.user._id});};
        if (res.locals.user && res.locals.user.userLevel >= 50) {status.push({Status: 'Pending Review'});};    

        HistoricSite.
        find({$or: status, Obsolete: false}).sort({ RecModDate: 'desc'}).exec(function ( err, sites, count ){
            if( err ) return next( err );
			res.writeHead(200, { 'Content-Type': 'application/json' });
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
				feature.properties.Complete = (site.Description && (site.Files.length > 0 && siteUtils.getImageURLForSite(site.Files))? true : false);
				if (site.Files.length > 0) {
					feature.properties.ImageURL = siteUtils.getImageURLForSite(site.Files);
				} else {
					//var url = 'http://maps.googleapis.com/maps/api/streetview?size=200x150&location=' + site.Address + ' Eureka CA&sensor=false&key=AIzaSyB3ww0AdcfTz3b28cGCQ2islQxv0g964EE'
					var url = null;
					feature.properties.ImageURL = url;
				};
				output.features.push(feature);
			};
			if (req.query.pure) {
				res.end(JSON.stringify(output));
			} else {res.end('var placesGeoJson = ' + JSON.stringify(output));};			
        });
    } else {
        var sites = HistoricSite.generateRandomSites(req.query.random);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        createGeoJson(sites, function (err, output) {
			if (err) {return next(err);};
			res.end('var placesGeoJson = ' + JSON.stringify(output));
		});
    };  
};

function createGeoJson (obj, next) {
	try{
		var output = {};
		output.type = "FeatureCollection"
		output.features = [];
		var skipFields = ['__v'];

		for (var i = 0; i < obj.length; i++) {
			var district = obj[i];
			var feature = {"type": "Feature", "properties": {}, "geometry": {}};
			if (district.toObject) {
				district = district.toObject();
			};
			for (var property in district) {
				if (skipFields.indexOf(property) != -1) { continue; };
			    if (district.hasOwnProperty(property)) {
			    	if (property == "loc") {
			    		feature.geometry = district[property];
			    	} else {
			        	feature.properties[property] = district[property];
			    	};
			    }
			}
			output.features.push(feature);
		};
		next(null, output);
	}
	catch(err){next(err);}	
}

var file = '../import.geojson';
exports.importSites = function(req, res, next){
	var HistoricSite = mongoose.model( 'HistoricSite' );	
	fs.readFile(file, 'utf8', function (err, data) {
		if (err) {
			res.redirect( '/');
			return;
		}
		var data = JSON.parse(data);
		
		for (var i = 0; i < data.features.length; i++) {
			var jsonSite = data.features[i];
			var siteNum;
			if (jsonSite.properties.RegistrationNum.indexOf(';') == -1) {
				siteNum = jsonSite.properties.RegistrationNum;
			} else {
				siteNum = jsonSite.properties.RegistrationNum.substring(0, jsonSite.properties.RegistrationNum.indexOf(';'));
			};
			if (siteNum) {
				siteNum = siteNum.replace('.', '_');
				//getPhoto(jsonSite.properties.Town, siteNum);
			};
			var newSite = new HistoricSite({
		        Name            : (jsonSite.properties.Name ? jsonSite.properties.Name : jsonSite.properties.Address),
		        Address         : jsonSite.properties.Address,
		        loc 			: jsonSite.geometry,
		        Description 	: jsonSite.properties.Description,
		        RegistrationNum : jsonSite.properties.RegistrationNum,
		        Keywords		: jsonSite.properties.Keywords,
		        Status 			: "Published"
		    });
		    newSite.save(function (err, site) {	
		    });
		};
		res.redirect( '/');
	});
};

exports.importPhotos = function(req, res, next){
	var HistoricSite = mongoose.model( 'HistoricSite' );	
	HistoricSite.find({Files: []}, function (err, sites) {
		for (var i = 0; i < sites.length; i++) {
			var site = sites[i];
			var siteNum;
			if (site.RegistrationNum.indexOf(';') == -1) {
				siteNum = site.RegistrationNum;
			} else {
				siteNum = site.RegistrationNum.substring(0, site.RegistrationNum.indexOf(';'));
			};
			if (siteNum) {
				siteNum = siteNum.replace('.', '_');				
				generateThumbAndSave(siteNum, site);
			};
		};
		res.redirect( '/');
	});
};

function generateThumbAndSave (siteNum, newSite) {
	fs.exists('C:/Temp/HistoricPhotos/' + siteNum + '.jpg', function (exists) {
		if (exists) {
			var fileRec = {
	            Name: siteNum + '.jpg', 
	            DocumentType: 'Image', 
	            Credit: 'Massachusetts Historical Commission', 
	            Caption: 'Image of Location', 
	            Approved: true, 
	            URLFolder: null, 
	            ThumbName: null, 
	            FileName: null, 
	            FileStorage: GLOBAL.FileStorage,
	            RealFolder: null
	        };

			var imageFolder = newSite._id + '/';	    		
			var fileName = 'C:/Temp/HistoricPhotos/' + siteNum + '.jpg';
			var saveThumb = {};
			var saveFile = {};
			var done = _.after(2, function () {
	            if (saveThumb.FileName) {fileRec.ThumbName = saveThumb.FileName}; //its an image with a thumbnail
	            fileRec.URLFolder = saveFile.URLFolder;
	            fileRec.RealFolder = saveFile.RealFolder;
	            fileRec.FileName = saveFile.FileName;

	            newSite.Files.push(fileRec);            
	            newSite.save(function (err, savedSite) {
	                if( err ) return next( err );
	            });
	        });
	        FileStorage.generateThumb(fileName, 150, 150, function (err, RealFolder, FileName){
	            if( err ) { return console.log(err); };

	            var outThumb = imageFolder + FileName
	            var inImage = RealFolder + '/' + FileName;

	            FileStorage.saveFile(inImage, outThumb, function (err, URLFolder, RealFolder, FileName) {
	                if( err ) { return console.log(err); };
	                FileStorage.deleteLocalFile(inImage , function () {});
	                saveThumb = {URLFolder: URLFolder, RealFolder: RealFolder, FileName: FileName};
	                done();
	            });
	        });
	        FileStorage.saveFile(fileName, imageFolder + path.basename(fileName), function (err, URLFolder, RealFolder, FileName) {
	            if( err ) { return console.log(err); };
	            saveFile = {URLFolder: URLFolder, RealFolder: RealFolder, FileName: FileName};
	            done();
	        });		
		};
	});
}
function getPhoto (town, siteNum) {
	var url = 'http://mhc-macris.net/Documents/' + town + '/Photos/' + siteNum + '.jpg';
	var filename = path.basename(url);
	console.log('C:/Temp/HistoricPhotos/' + filename);
	fs.exists('C:/Temp/HistoricPhotos/' + siteNum + '.jpg', function (exists) {
		if (!exists) {
			request(url).pipe(fs.createWriteStream('C:/Temp/HistoricPhotos/' + filename));	
		};
	});	
	// request(url, function (err, response, body) {
	// 	if (!err && response.statusCode == 200) {	
	// 		console.log('C:/Temp/HistoricPhotos/' + filename);
	// 		request(url).pipe(fs.createWriteStream('C:/Temp/HistoricPhotos/' + filename));
	// 	}
	// });
}
