//http://stackoverflow.com/questions/17930204/simple-file-upload-to-s3-using-aws-sdk-and-node-express
// Access Key ID:
// AKIAIKKTVLG7SVVXYVKQ
// Secret Access Key:
// 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

// files: Object
// 	Name: Object
// 		headers: Object
// 			content-disposition: "form-data; name="Name"; filename="DSCN0712.JPG""
// 			content-type: "image/jpeg"
// 		name: "DSCN0712.JPG"
// 		originalFilename: "DSCN0712.JPG"
// 		path: "C:\Users\ajohnson\AppData\Local\Temp\5584-1d9df2f.JPG"
// 		size: 1504102
// https://s3.amazonaws.com/EurekaHistoryUploads/site/123asdasd123123/A+lot+of+clocks.png
var AWS = require('aws-sdk'); 
var fs = require('fs');
var mime = require('mime');
var path = require('path');
var _ = require('underscore');

var config = new AWS.Config({
  accessKeyId: GLOBAL.AWSKey, secretAccessKey: GLOBAL.AWSSecret, region: 'us-east-1'
});

AWS.config = config;
var s3 = new AWS.S3();

exports.saveFile = function (file, newFileName, next) {
	newFileName = newFileName.replace(path.basename(newFileName), path.basename(file));
	fs.readFile(file, function(err, file_buffer){
		if (err) {
			return next(err)
		};
	    var params = {
			Bucket: GLOBAL.S3Bucket,
			Key: newFileName,
			ACL: "public-read",
			ContentType: mime.lookup(file),
			Body: file_buffer,  
		};
	    s3.putObject(params, function (err, data) {
	    	if (err) {return next(err)};
	    	next(null, 'https://s3.amazonaws.com/EurekaHistoryUploads/' + path.dirname(newFileName), path.dirname(newFileName), path.basename(newFileName));
	    });
	});
};

exports.deleteFile = function (path, next) {
	s3.deleteObject({Bucket: GLOBAL.S3Bucket, Key: path}, function (err, data) {
		if (err) {return next(err)};
		next(null);
	});
};

exports.deleteFolder = function (path, next) {
	s3.listObjects({Bucket: GLOBAL.S3Bucket, Prefix: path}, function (err, data) {
		if (err) {return next(err)};
		var done = _.after(data.Contents.length, function () {
			next(null);
		});
		for (var i = 0; i < data.Contents.length; i++) {
			var file = data.Contents[i];
			console.log(file.Key);

			s3.deleteObject({Bucket: GLOBAL.S3Bucket, Key: file.Key}, function (err, data) {
				if (err) {return next(err)};
				done();
			});
		};
	});
};

exports.generateThumb = function (inImage, width, height, next) {
	//need to install http://www.graphicsmagick.org/download.html
	var outImage = path.dirname(inImage) + '/' + path.basename(inImage, path.extname(inImage)) + '_thumb' + path.extname(inImage);
	var gm = require("gm");
	gm(inImage).resize(width, height).write(outImage, function (err) {
		if( err ) return next( err );
		next(null, path.dirname(outImage), path.basename(outImage));
	});
}