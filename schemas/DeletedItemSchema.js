var mongoose = require( 'mongoose' );
var Schema   = mongoose.Schema;

var DeletedItemSchema = new Schema({
    Type            : String, //Comment, Suggestion, Document, Image, Place
    Text            : String,
    ItemID          : { type: Schema.Types.ObjectId }, //_id of item to be deleted
    SiteID          : { type: Schema.Types.ObjectId }, //_id of the site that contains the ItemID
    Status          : { type: String, default: 'Pending'},
    UserName        : String,
    KeepUntil       : { type: Date, default: function () {
                                                var days = 30; 
                                                return new Date(Date.now() + days*24*60*60*1000);
                                            } },
    Obsolete        : {type: Boolean, default: false},
    RecEnterBy      : Schema.Types.ObjectId,
    RecEnterDate    : { type: Date, default: Date.now },
    RecModBy        : Schema.Types.ObjectId,
    RecModDate      : { type: Date, default: Date.now }
}, { collection: 'DeletedItem' });

DeletedItemSchema.statics.createDeletedItem = function (Type, Text, ItemID, SiteID, UserID, UserName, next) {
    var HistoricSite = mongoose.model( 'HistoricSite' );
    var ReviewApproval = mongoose.model( 'ReviewApproval' );

    deletedItem = new DeletedItem({
        Type            : Type,
        Text            : Text,
        ItemID          : ItemID,
        SiteID          : SiteID,
        UserName        : UserName,
        RecEnterBy      : UserID,
        RecModBy        : UserID
    });
    DeletedItem.count({ItemID: ItemID, SiteID: SiteID, Status: 'Pending'}, function (err, count) {
        if (count == 0) {
            deletedItem.save(function (err) {});
        };
        
    });
    

    if (Type != "User") { //everything happens in the site
        switch(Type)
        {
        case 'Comment':
            HistoricSite.update({"_id": SiteID, "Comments._id": ItemID}, {"$set": {"Comments.$.Obsolete": true, "Comments.$.RecModBy": UserID, "Comments.$.RecModDate": Date.now()}}, { multi: false }, function (err, numberAffected, raw) {
                if( err ) return next( err );
                next(null);
            });
            ReviewApproval.update({"SiteID": SiteID, "ItemID": ItemID}, {"$set": {"Status": "Deleted", DecisionUser: UserID, RecModBy: UserID, RecModDate: Date.now()}}, { multi: true }, function (err) {
                
            });
            break;
        case 'Suggestion':
            break;
        case 'Document':
        case 'Image':
            HistoricSite.update({"_id": SiteID, "Files._id": ItemID}, {"$set": {"Files.$.Obsolete": true, "Files.$.RecModBy": UserID, "Files.$.RecModDate": Date.now()}}, { multi: false }, function (err, numberAffected, raw) {
                if( err ) return next( err );
                next(null);
            });
            ReviewApproval.update({"SiteID": SiteID, "ItemID": ItemID}, {"$set": {"Status": "Deleted", DecisionUser: UserID, RecModBy: UserID, RecModDate: Date.now()}}, { multi: true }, function (err) {
                
            });
            break;
        case 'Place':
            HistoricSite.update({"_id": SiteID}, {"$set": {"Obsolete": true, RecModBy: UserID, RecModDate: Date.now()}}, { multi: false }, function (err, numberAffected, raw) {
                if( err ) return next( err );
                next(null);
            });
            break;
        }        
    } else if (Type == "User") {
        next('This is not implimented yet');
    };
};

DeletedItemSchema.statics.unDoDeletedItem = function (ItemID, UserID, next) {
    var HistoricSite = mongoose.model( 'HistoricSite' );
    DeletedItem.findById( ItemID, function ( err, item ){
        if(err) {return next( err );}
        if (!item) {return next('Deleted Item Not Found')};
        
        item.Status = 'Undone';
        item.RecModBy = UserID;
        item.RecModDate = Date.now();
        item.save(function () {});

        if (item.Type != "User") { //everything happens in the site
            switch(item.Type)
            {
            case 'Comment':
                HistoricSite.update({"_id": item.SiteID, "Comments._id": item.ItemID}, {"$set": {"Comments.$.Obsolete": false, "Comments.$.RecModBy": UserID, "Comments.$.RecModDate": Date.now()}}, { multi: false }, function (err, numberAffected, raw) {
                    if( err ) return next( err );
                    next(null);
                });
                break;
            case 'Suggestion':
                break;
            case 'Document':
            case 'Image':
                HistoricSite.update({"_id": item.SiteID, "Files._id": item.ItemID}, {"$set": {"Files.$.Obsolete": false, "Files.$.RecModBy": UserID, "Files.$.RecModDate": Date.now()}}, { multi: false }, function (err, numberAffected, raw) {
                    if( err ) return next( err );
                    next(null);
                });
                break;
            case 'Place':
                HistoricSite.update({"_id": item.SiteID}, {"$set": {"Obsolete": false, RecModBy: UserID, RecModDate: Date.now()}}, { multi: false }, function (err, numberAffected, raw) {
                    if( err ) return next( err );
                    next(null);
                });
                break;
            }
        } else if (Type == "User") {
            next('This is not implimented yet');
        };
    });
};

DeletedItemSchema.statics.processFullDelete = function (ItemID, next) {
    var HistoricSite = mongoose.model( 'HistoricSite' );
    var FileStorage = require('../util/FileStorage');
    var _ = require('underscore');
    var await = require('await');
    DeletedItem.findById( ItemID, function ( err, item ){
        if(err) {return next( err );}
        if (!item) {return next('Deleted Item Not Found')};

        item.Status = 'Deleted';
        item.Obsolete = true;
        item.RecModDate = Date.now();
        //item.save(function () {});

        if (item.Type != "User") { //everything happens in the site
            switch(item.Type)
            {
            case 'Comment':
                HistoricSite.update({"_id": item.SiteID, "Comments._id": item.ItemID}, {"$pull" : {"Comments" : { _id : item.ItemID}}}, { multi: false }, function (err, numberAffected, raw) {
                    if( err ) return next( err );
                    item.save(function () {
                        if( err ) return next( err );
                        return next(null, item);
                    });                    
                });
                break;
            case 'Suggestion':
                return next('Tried to delete a Suggestion: This is not implimented yet');
                break;
            case 'Document':
            case 'Image':
                HistoricSite.findById(item.SiteID, function (err, site) {
                    var file = _.find(site.Files, function(file){ return file._id.toString() == item.ItemID.toString(); });
                    if (file) {
                        deleteFile(file, function (err) {
                            if( err ) return next( err );
                            HistoricSite.update({"_id": item.SiteID, "Files._id": item.ItemID}, {"$pull" : {"Files" : { _id : item.ItemID}}}, { multi: false }, function (err, numberAffected, raw) {
                                if( err ) return next( err );
                                item.save(function () {
                                    if( err ) return next( err );
                                    return next(null, item);
                                });                    
                            });
                        });
                    } else {
                        return next("File Not Found in Site");
                    };
                });
                break;
            case 'Place':
                //delete files
                //delete Place
                HistoricSite.findById(item.SiteID, function (err, site) {
                    if( err ) return next( err );
                    if (!site) {item.save(function () {}); return next("Site Not Found");};

                    if (site.Files.length > 0) {

                        var saveSite = _.after(site.Files.length, function () {
                            site.remove(function (err) {
                                if( err ) return next(err);
                                item.save(function () {
                                    if( err ) return next(err);
                                    return next(null, item);
                                }); 
                            });
                        });

                        for (var i = 0; i < site.Files.length; i++) {
                            var file = site.Files[i];
                            FileStorage.deleteFolder(file.RealFolder + '/', function (err) {
                                if( err ) return next(err);
                                saveSite();
                            });
                        };
                    } else {
                        site.remove(function (err) {
                            if( err ) return next(err);
                            item.save(function () {
                                if( err ) return next(err);
                                return next(null, item);
                            }); 
                        });  
                    };                                        
                });
                break;
            }
        } else if (Type == "User") {
            return next('Tried to delete a user: This is not implimented yet');
        };

    });
};

function deleteFile (file, next) {
    var FileStorage;
    if (file.FileStorage) {
        FileStorage = require('../util/' + file.FileStorage + 'FileStorage');
    } else {
        FileStorage = require('../util/FileStorage');
    };
    
    var _ = require('underscore');

    if (file.DocumentType == "Image") {
        //delete file and thumb
        var done = _.after(2, function () {
            return next(null);
        });

        FileStorage.deleteFile(file.RealFolder + '/' + file.FileName, function (err) {
            if( err ) return next( err );
            done();
        });

        FileStorage.deleteFile(file.RealFolder + '/' + file.ThumbName, function (err) {
            if( err ) return next( err );
            done();
        }); 
    } else {
        //delete file
        FileStorage.deleteFile(file.RealFolder + '/' + file.FileName, function (err) {
            if( err ) return next( err );
            return next(null);
        });
    };
}


var DeletedItem = mongoose.model( 'DeletedItem', DeletedItemSchema );
module.exports = DeletedItem;