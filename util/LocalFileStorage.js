//file move (upload)
//file delete (remove)

var fs = require('fs.extra'); //https://npmjs.org/package/fs.extra
var path = require('path');

// files: Object
// 	Name: Object
// 		headers: Object
// 			content-disposition: "form-data; name="Name"; filename="DSCN0712.JPG""
// 			content-type: "image/jpeg"
// 		name: "DSCN0712.JPG"
// 		originalFilename: "DSCN0712.JPG"
// 		path: "C:\Users\ajohnson\AppData\Local\Temp\5584-1d9df2f.JPG"
// 		size: 1504102

var destDir = path.resolve(__dirname, '..', 'public/uploads/');

function saveFile (file, newFileName, next) {
	//__dirname	
	newFileName = newFileName.replace(path.basename(newFileName), path.basename(file));
	var newPath = destDir + '\\' +  newFileName;	
	var destURL = '/uploads/' + newFileName;

	fs.mkdirp(path.dirname(newPath), function (err) {
		if( err ) return next( err );
		
		fs.readFile(file, function (err, data) {
            if( err ) return next( err );
            fs.writeFile (newPath, data, function(err) {
                if( err ) return next( err );
                next(null, path.dirname(destURL), path.dirname(newPath), path.basename(newPath));
            });
        });
		// fs.copy(file, newPath, function (err) {
		// 	if( err ) return next( err );
						
		// });
	});
};
exports.saveFile = saveFile;

function deleteFile (path, next) {
	fs.unlink(path, function (err) {
		if (err) {return next(err);};
		return next(null);
	});	
};
exports.deleteFile = deleteFile;

function deleteFolder (path, next) {
	fs.rmrf(path, function (err) {
		if (err) {return next(err);};
		return next(null);
	});	
};
exports.deleteFolder = deleteFolder;;

function generateThumb(inImage, width, height, next) {
	//need to install http://www.graphicsmagick.org/download.html
	var outImage = path.dirname(inImage) + '/' + path.basename(inImage, path.extname(inImage)) + '_thumb' + path.extname(inImage);
	var gm = require("gm");
	gm(inImage).resize(width, height).write(outImage, function (err) {
		if( err ) return next( err );
		next(null, path.dirname(outImage), path.basename(outImage));
	});
		
}
exports.generateThumb = generateThumb