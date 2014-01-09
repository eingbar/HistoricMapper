var storage = require('./' + GLOBAL.FileStorage + 'FileStorage')

exports.saveFile = function (file, newFileName, next) {
	storage.saveFile(file, newFileName, next);
};

exports.deleteFile = function (path, next) {
	storage.deleteFile(path, next);
};

exports.deleteFolder = function (path, next) {
	storage.deleteFolder(path, next);
};

exports.generateThumb = function (inImage, width, height, next) {
	storage.generateThumb(inImage, width, height, next);
}

exports.deleteLocalFile = function (path, next) {
	//used to delete local temp files only.
	var fs = require('fs.extra');
	fs.unlink(path, next); //delete temp file
}