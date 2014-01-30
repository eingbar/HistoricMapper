exports.getImageURLForSite = function(Files){
	for (var i = 0; i < Files.length; i++) {
		var item = Files[i];
		if (item.DocumentType != 'Image') continue;
		if (item.Obsolete) continue;
		if (!item.Approved) continue;

		return item.URLFolder + '/' + item.ThumbName;
	};
	return null;
};