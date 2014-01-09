var mongoose = require( 'mongoose' );
var textSearch = require('mongoose-text-search');
var Schema   = mongoose.Schema;

var HistoricSiteSchema = new Schema({
    Name            : String,
    Address         : String,
    Description     : String,
    RegistrationNum : String,
    // Keywords        : [{ type: Schema.Types.ObjectId, ref: 'Keywords' }],
    Keywords        : [String], //EI and AJ decided to keep a array of strings
    Tours           : [String],
    Files           : [
                        { 
                            Name: String,  //Uploaded File Name
                            DocumentType: String, 
                            Credit: String, 
                            Caption: String, 
                            Approved: Boolean, 
                            URLFolder: String, 
                            ThumbName: String, 
                            RealFolder: String, 
                            FileName: String, 
                            FileStorage: String,
                            Obsolete:{type: Boolean, default: false},
                            RecEnterBy: Schema.Types.ObjectId,
                            RecEnterDate: { type: Date, default: Date.now },
                            RecModBy: Schema.Types.ObjectId,
                            RecModDate: { type: Date, default: Date.now }                            
                        }],
    Comments        : [
                        { 
                            Author: 
                            { 
                                Username: String, 
                                Email: String,
                                id: Schema.Types.ObjectId
                            }, 
                            Text: String, 
                            Approved: Boolean, 
                            CommentDate: Date, 
                            Obsolete:{type: Boolean, default: false},
                            RecEnterBy: Schema.Types.ObjectId,
                            RecEnterDate: { type: Date, default: Date.now },
                            RecModBy: Schema.Types.ObjectId,
                            RecModDate: { type: Date, default: Date.now } 
                        }],
    loc: {
        type: { type: String, default: null },
        coordinates: []
    },
    InternalNotes   : String,
    Status          : { type: String, default: 'Draft'}, //Draft, Pending Approval, Published
    DataOwner       : Schema.Types.ObjectId,
    Obsolete        : {type: Boolean, default: false},
    RecEnterBy      : Schema.Types.ObjectId,
    RecEnterDate    : { type: Date, default: Date.now },
    RecModBy        : Schema.Types.ObjectId,
    RecModDate      : { type: Date, default: Date.now }
}, { collection: 'HistoricSite' });

HistoricSiteSchema.plugin(textSearch);

HistoricSiteSchema.index({ loc : '2dsphere' }, { sparse: true });

//Full Text Indexs
HistoricSiteSchema.index({
        Name: 'text',
        Address: 'text',
        Description: 'text',
        RegistrationNum: 'text',
        Keywords: 'text',
        Tours: 'text'
    },
   {
        name: "FullTextSearchIndex",
        weights: {
        }
    }
);

HistoricSiteSchema.pre('save', function(next){
    var doc = this;
    if(doc.loc.coordinates.length == 0)
        doc.loc = undefined;
    next();
});

function getRandomArbitary (min, max) {
    return Math.random() * (max - min) + min;
}

var bounds = {minLat: 40.78674792083604, minLon:-124.19559001922607, maxLat:40.80786513458269, maxLon:-124.12349224090575};

HistoricSiteSchema.statics.generateRandomSites = function (numberOfSites) {
    var sites = [];
    for (var i = 0; i < numberOfSites; i++) {
        var site = new HistoricSite({Address: "Random Point", Name: "Random Point " + i, Status: "Published"});
        site.Description = "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quae, praesentium, non, natus aut perspiciatis ipsa quos nesciunt corporis velit magni ea perferendis minus commodi animi sapiente quod vitae nostrum eum.";
        var x = getRandomArbitary(bounds.minLat, bounds.maxLat);
        var y = getRandomArbitary(bounds.minLon, bounds.maxLon);
        site.loc = {type: 'Point', coordinates: [y, x]};
        sites.push(site);
    };
    return sites;
}

HistoricSiteSchema.statics.getAuthSingleSite = function (siteID, authLevel, user, next) {
    /*
    Auth Levels
    0 - Unauthenicated
    1 - Authenicated
    2 - Draft Data Owner
    2 - Published
    3 - Moderator
    4 - Administrator
    */
    HistoricSite.findById( siteID, function ( err, site ){
        if( err ) return next( err );
        try{
            var notFoundString = 'Place ID ' + siteID + ' not found';
            if (!site) {return next({status: 404, description: notFoundString});};
            if (site.Obsolete && !(user.userLevel >= 100)) {return next({status: 404, description: notFoundString});}

            if (site.Status == "Draft") {authLevel = 2;};

            var userAuthLevel = 0;
            if (!user) {userAuthLevel = 0;}
            else if (user.userLevel == 100) {userAuthLevel = 4;}
            else if (user.userLevel == 50) {userAuthLevel = 3;}
            else if (site.Status == "Draft" && site.DataOwner.equals(user._id)) {userAuthLevel = 2;}
            else {userAuthLevel = 1;};

            if (userAuthLevel >= authLevel) {next(null, site);}
            else { return next({status: 403, description: 'Forbidden (' + userAuthLevel + ',' + authLevel + ')'}); };
        }
        catch(err){
            next(err);
        }            
    });
};

// HistoricSiteSchema.statics.getSingleSite = function (siteID, res, next) { //used for editing sites
//     try
//     {
//         HistoricSite.findById( siteID, function ( err, site ){
//             if( err ) return next( err );
//             try{
//                 var notFoundString = 'Place ID ' + siteID + ' not found';
//                 if (!site) {return next({status: 404, description: notFoundString});};

//                 if (site.Status == "Draft" && !site.DataOwner.equals(res.locals.user._id)) {return next({status: 403, description: 'Forbidden'});}
//                 else if ((site.Status == "Pending Review") && !(res.locals.user.userLevel >= 50)) {return next({status: 403, description: 'Forbidden'});}
//                 else if ((site.Status == "Published") && !(res.locals.user.userLevel >= 50)) {return next({status: 403, description: 'Forbidden'});};
                
//                 if (site.Obsolete && !(res.locals.user.userLevel >= 100)) {return next({status: 404, description: notFoundString});};
//                 next(null, site)
//             }
//             catch(err){
//                 next(err);
//             }            
//         });
//     }
//     catch(err)
//     {
//         next(err);
//     }    
// }

// HistoricSiteSchema.statics.getSingleSiteDetails = function (siteID, res, next) { //rules used for viewing details sites and posting uploads
//     try
//     {
//         HistoricSite.findById( siteID, function ( err, site ){
//             if( err ) return next( err );
//             try{
//                 var notFoundString = 'Place ID ' + siteID + ' not found';
//                 if (!site) {return next({status: 404, description: notFoundString});};

//                 if (site.Status == "Draft" && !site.DataOwner.equals(res.locals.user._id)) {return next({status: 403, description: 'Forbidden1'});}
//                 else if ((site.Status == "Pending Review") && !(res.locals.user.userLevel >= 50)) {return next({status: 403, description: 'Forbidden2'});}
//                 //else if ((site.Status == "Published") && !(res.locals.user.userLevel >= 50)) {return next({status: 403, description: 'Forbidden3'});};
                
//                 if (site.Obsolete && !(res.locals.user.userLevel >= 100)) {return next({status: 404, description: notFoundString});};
//                 next(null, site)
//             }
//             catch(err){
//                 next(err);
//             }            
//         });
//     }
//     catch(err)
//     {
//         next(err);
//     }    
// }

var HistoricSite = mongoose.model( 'HistoricSite', HistoricSiteSchema );
module.exports = HistoricSite;