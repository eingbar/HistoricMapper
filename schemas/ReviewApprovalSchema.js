var mongoose = require( 'mongoose' );
var Schema   = mongoose.Schema;
var _ = require('underscore');
var mailer = require('../config/mailer');

var ReviewApprovalSchema = new Schema({
    Type            : String, //Comment, Suggestion, Document, Image, Place, MaybeUser??
    Admin           : {type: Boolean, default: false}, //Is this a mod.(false) or admin(true) approval
    Description     : String,
    Note            : String,
    ItemID          : { type: Schema.Types.ObjectId }, //_id of item to be approved
    SiteID          : { type: Schema.Types.ObjectId }, //_id of the site that contains the ItemID
    Status          : { type: String, default: 'Pending'}, //Pending, Approved, Rejected
    DecisionUser    : Schema.Types.ObjectId,
    Obsolete        : {type: Boolean, default: false},
    RecEnterBy      : Schema.Types.ObjectId,
    RecEnterDate    : { type: Date, default: Date.now },
    RecModBy        : Schema.Types.ObjectId,
    RecModDate      : { type: Date, default: Date.now }
}, { collection: 'ReviewApproval' });

ReviewApprovalSchema.statics.createApproval = function (Type, Description, ItemID, SiteID, UserID, next) { //could add emailing in here also??
    var HistoricSite = mongoose.model( 'HistoricSite' );

    ReviewApproval.count({ItemID: ItemID, SiteID: SiteID, Status: 'Pending'}, function (err, count) {
        if( err ) return next( err );
        if (count == 0 || Type == "Suggestion") {
            approvalRecord = new ReviewApproval({
                Type            : Type,
                Description     : Description,
                ItemID          : ItemID,
                SiteID          : SiteID,
                RecEnterBy      : UserID,
                RecModBy        : UserID
            });
            approvalRecord.save(function (err) {});
        };
    });
    
    if (Type != "User") { //everything happens in the site
        switch(Type)
        {
        case 'Comment':
            next(null);
            break;
        case 'Suggestion':
            next(null);
            break;
        case 'Document':
        case 'Image':
            next(null);
            break;
        case 'Place':
            HistoricSite.update({"_id": SiteID}, {"$set": {"Status": "Pending Review", RecModBy: UserID, RecModDate: Date.now()}}, { multi: false }, function (err, numberAffected, raw) {
                if( err ) return next( err );
                next(null);
            });
            break;
        }
    } else if (Type == "User") {

    };
};

ReviewApprovalSchema.statics.finishApproval = function (Status, Type, ItemID, SiteID, UserID, next) { //could add emailing in here also??
    var HistoricSite = mongoose.model( 'HistoricSite' );
    var ReviewApproval = mongoose.model( 'ReviewApproval' );
    var DeletedItem = mongoose.model( 'DeletedItem' );

    if (Type != "User") { //everything happens in the site
        var approvalStatus;
        if (Status == "Published") {approvalStatus = 'Approved'}
        else if (Status == "Pending Review") {approvalStatus = "Pending"}
        else if (Status == 'Draft') {approvalStatus = "Rejected"}
        else if (Status == 'Rejected') {approvalStatus = "Rejected"}
        else if (Status == 'Deleted') {approvalStatus = "Deleted"}
        else {approvalStatus = "Pending"};

        switch(Type)
        {
        case 'Comment':
            var done = _.after(2, function () {
                next(null);
            });
            HistoricSite.update({"_id": SiteID, "Comments._id": ItemID}, {"$set": {"Comments.$.Approved": (Status == "Published"? true : false), "Comments.$.Obsolete": (Status == "Published"? false : true), "Comments.$.RecModBy": UserID, "Comments.$.RecModDate": Date.now(), RecModBy: UserID, RecModDate: Date.now()}}, { multi: false }, function (err, numberAffected, raw) {
                if( err ) return next( err );
                done();
            });            
            break;
        case 'Suggestion':
            ReviewApproval.update({"_id": ItemID}, {"$set": {"Status": Status, DecisionUser: UserID, RecModBy: UserID, RecModDate: Date.now()}}, { multi: true }, function (err) {
                if( err ) return next( err );
                next(null);
            });
            break;
        case 'Document':
        case 'Image':
            var done = _.after(2, function () {
                next(null);
            });
            HistoricSite.update({"_id": SiteID, "Files._id": ItemID}, {"$set": {"Files.$.Approved": (Status == "Published"? true : false), "Files.$.RecModBy": UserID, "Files.$.RecModDate": Date.now(), "Files.$.Obsolete": (Status == "Published"? false : true)}}, { multi: false }, function (err, numberAffected, raw) {
                if( err ) return next( err );
                done();
            });
            ReviewApproval.update({"SiteID": SiteID, "ItemID": ItemID, Type: Type}, {"$set": {"Status": Status, DecisionUser: UserID, RecModBy: UserID, RecModDate: Date.now()}}, { multi: true }, function (err) {
                if( err ) return next( err );
                done();
            });
            break;
        case 'Place':
            var site, dataOwner;
            var done = _.after(2, function () {
                if (site && dataOwner) {
                    if (Status == "Published") {
                        mailer.sendSiteApprovedEmail(dataOwner, site, function (err) {
                            //if( err ) return next( err );
                            next(null);
                        });
                    } else if (Status == 'Draft') {
                        mailer.sendSiteSentBackEmail(dataOwner, site, function (err) {
                            //if( err ) return next( err );
                            next(null);
                        });
                    };
                };                
            }); 
            HistoricSite.findOneAndUpdate({"_id": SiteID}, {"$set": {"Status": Status, RecModBy: UserID, RecModDate: Date.now()}}, { multi: false }, function (err, updatedSite) {
                if( err ) return next( err );
                site = updatedSite;
                if (updatedSite) {
                    var User = mongoose.model( 'User' );
                    User.findById(updatedSite.DataOwner, function (err, user) {
                        dataOwner = user;
                        done()
                    });
                } else {done()};       
            });
            ReviewApproval.update({"SiteID": SiteID, "ItemID": SiteID, Type: Type}, {"$set": {"Status": approvalStatus, DecisionUser: UserID, RecModBy: UserID, RecModDate: Date.now()}}, { multi: true }, function (err) {
                if( err ) return next( err );
                done();
            });
                    
            break;
        }
    } else if (Type == "User") {

    };
};

ReviewApprovalSchema.statics.finishAllForPlace = function (Status, SiteID, UserID, next) { //Used when deleting a place
    
    ReviewApproval.update({'SiteID': SiteID, 'Status': 'Pending'}, {"$set": {"Status": Status, "DecisionUser": UserID, RecModDate: Date.now(), RecModBy: UserID}}, { multi: true }, function (err, numberAffected, raw) {
        if( err ) return next( err );
        next(null);
    });
}

var ReviewApproval = mongoose.model( 'ReviewApproval', ReviewApprovalSchema );
module.exports = ReviewApproval;