
/*
 * GET home page.
 */

var mongoose = require( 'mongoose' );
var _ = require('underscore');
var HistoricSite = mongoose.model( 'HistoricSite' );
var ReviewApproval = mongoose.model( 'ReviewApproval' );
var DeletedItem = mongoose.model( 'DeletedItem' );
var Tour = mongoose.model( 'Tour' );
var Keyword = mongoose.model( 'Keyword' );
var FileStorage = require('../util/FileStorage');
var await = require('await');
var siteUtils = require('../util/siteUtils');
var cluster = require('./cluster');

exports.index = function(req, res, next){
    HistoricSite.
        find( function ( err, sites, count ){
            if( err ) return next( err );
            res.render( 'sites/index', { title : 'Index', results : sites });
        });
};

exports.thematicTour = function (req, res, next) {
    var filter = [{Status: 'Published'}];
    if (res.locals.user) {filter.push({Status: 'Draft', "DataOwner": res.locals.user._id});};
    if (res.locals.user && res.locals.user.userLevel >= 50) {filter.push({Status: 'Pending Review'});};    

    HistoricSite.
    find({$or: filter, Obsolete: false, Tours: req.params.text}, function ( err, sites, count ){
        if( err ) return next( err );
        var output = [];
        for (var i = 0; i < sites.length; i++) {
            var site = sites[i];
            var Complete = (site.Description && (site.Files.length > 0 && getImageURLForSite(site.Files))? true : false);
            var result = {type: "marker", loc: [site.loc.coordinates[1], site.loc.coordinates[0]], _id: site._id, ImageURL: getImageURLForSite(site.Files), Name: site.Name, Complete: Complete};
            output.push({obj: result});
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(output));
    });
}


exports.textSearch = function (req, res, next) {
    console.log(siteUtils);
    var filter = [{Status: 'Published'}];
    if (res.locals.user) {filter.push({Status: 'Draft', "DataOwner": res.locals.user._id});};
    if (res.locals.user && res.locals.user.userLevel >= 50) {filter.push({Status: 'Pending Review'});}

    var options = {
        filter: {$or: filter, Obsolete: false},
        //project: (req.query.project ? req.query.project : '_id, Name'),
        lean: true
    };

    //if (req.query.project && req.query.project == "ALL_PROPERTIES") {options.project = ''}    
    
    HistoricSite.textSearch(req.params.text, options, function (err, output) {
        if (err) {return next(err)};
        var results = [];
        for (var i = 0; i < output.results.length; i++) {
            var site = output.results[i].obj;
            var Complete = (site.Description && (site.Files.length > 0 && getImageURLForSite(site.Files))? true : false);
            var result = {type: "marker", loc: [site.loc.coordinates[1], site.loc.coordinates[0]], _id: site._id, ImageURL: getImageURLForSite(site.Files), Name: site.Name, Complete: Complete}
            var outSite = output.results[i];
            outSite.obj = result
            results.push(outSite);
        };
        output.results = results;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(output));
    });
};

function getImageURLForSite(Files){
    for (var i = 0; i < Files.length; i++) {
        var item = Files[i];
        if (item.DocumentType != 'Image') continue;
        if (item.Obsolete) continue;
        if (!item.Approved) continue;

        return item.URLFolder + '/' + item.ThumbName;
    };
    return null;
};

exports.getCreate = function(req, res, next){
    var newSite = new HistoricSite();
    newSite.loc = undefined;
    Tour.find({Obsolete: false}).sort('Text').exec(function (err, tours) {
        if (err) {return next(err)};
        Keyword.find({Obsolete: false}).sort('Text').exec(function (err, keywords) {
            if (err) {return next(err)};
            res.render('sites/create', { title: 'Create Place', model: newSite, tours: tours, keywords: keywords });
        }); 
    });
};

exports.postCreate = function(req, res, next){
    try {
        var loc = JSON.parse(req.body.loc);
    } catch (e) {
        var loc = {coordinates:[], type:''};
    }

    var newSite = new HistoricSite({
        Name            : (req.body.Name ? req.body.Name : req.body.Address),
        Address         : req.body.Address,
        Description     : req.body.Description,
        RegistrationNum : req.body.RegistrationNum,
        Keywords        : req.body.Keywords,
        Tours           : req.body.Tours,
        DataOwner       : res.locals.user._id,
        RecEnterBy      : res.locals.user._id,
        RecModBy        : res.locals.user._id,
        loc: loc
    });
    var bobe=5;

    newSite.save(function (err, site) {
        if( err ) throw err;
        req.flash('success', 'Place successfully created. You can now continue editing and upload documents.');
        res.redirect( '/sites/edit/' + site._id );
    });
    // var place = new HistoricSite({
    //     name    : req.body.name,
    //     loc: loc
    // }).save( function ( err, HistoricSite, count ){
    //     if( err ) return next( err );
    //     res.redirect( '/sites' );
    // });
};

exports.details = function(req, res, next){
    HistoricSite.getAuthSingleSite( req.params.id, 0, res.locals.user, function ( err, site ){
        if( err ) return next( err );
        res.render('sites/details', { title: 'Place Details - ' + site.Name, site: site });
    }); 
};

exports.postDetails = function(req, res, next){    
    if (req.body.submitValue == "Edit Place") {
        res.redirect( '/sites/edit/' + req.params.id );
    } else if (req.body.submitValue == "Upload New Document") {
        res.redirect( '/sites/details/' + req.params.id + '/document/upload' );
    } else if (req.body.submitValue == "Add Suggestion") {
        if (res.locals.user) {
            ReviewApproval.createApproval("Suggestion", req.body.newSuggestion, req.params.id, req.params.id, res.locals.user._id, function (err) {
                if( err ) return next( err );  
                req.flash('success', 'Your suggestion has been submitted to the moderators for review.');
                res.redirect( '/sites/details/' + req.params.id );
            });
        } else {
            req.flash('error', 'You must be logged in to make a suggestion');
            res.redirect( '/sites/details/' + req.params.id );
        };        
    } else if (req.body.submitValue == "Add Comment") {
        if (!req.body.newComment) {
            req.flash('error', 'Blank comments are not allowed');
            res.redirect( '/sites/details/' + req.params.id );
        };
        var approved = (res.locals.user ? true : false);
        HistoricSite.getAuthSingleSite( req.params.id, 0, res.locals.user, function ( err, site ){
            if( err ) return next( err );  
            var newComment = { 
                Author: 
                { 
                    Username: (res.locals.user ? res.locals.user.screenName : 'Anonymous'), 
                    Email: (res.locals.user ? res.locals.user.email : null),
                    id: (res.locals.user ? res.locals.user._id : null)
                }, 
                Text: req.body.newComment, 
                Approved: approved, 
                CommentDate: Date.now(),
                RecEnterBy: (res.locals.user ? res.locals.user._id : null),
                RecModBy: (res.locals.user ? res.locals.user._id : null),
            };
            site.Comments.push(newComment);

            site.save(function (err, savedSite) {
                if( err ) return next( err );                    
                if (!approved) {
                    ReviewApproval.createApproval("Comment", req.body.newComment, savedSite.Comments[savedSite.Comments.length - 1]._id, site._id, (res.locals.user ? res.locals.user._id : null), function (err) {
                        if( err ) return next( err );  
                        req.flash('success', 'Comment successfully submitted to the moderators for review.');
                        res.redirect( '/sites/details/' + site._id );
                    });
                }
                else {                                      
                    req.flash('success', 'Comment successfully submitted.');
                    res.redirect( '/sites/details/' + site._id );                                        
                };
            });
        });
    };
};

exports.getEdit= function(req, res, next){
    var User = mongoose.model( 'User' );
    HistoricSite.getAuthSingleSite( req.params.id, 2, res.locals.user, function ( err, site ){
        if( err ) return next( err );
        var siteTours, siteKeywords, RecModBy, RecEnterBy;

        var done = _.after(4, function () {
            res.render('sites/edit', { title: 'Edit Place', model: site, tours: siteTours, keywords: siteKeywords, userInfo: {RecModBy: RecModBy, RecEnterBy: RecEnterBy} });
        })
        Tour.find({Obsolete: false}).sort('Text').exec(function (err, tours) {
            if (err) {return next(err)};  
            siteTours = tours;
            done();          
        });
        Keyword.find({Obsolete: false}).sort('Text').exec(function (err, keywords) {
            if (err) {return next(err)};
            siteKeywords = keywords;
            done();
        });
        User.findById(site.RecModBy, function (err, user) {
            if (err) {return next(err)};
            RecModBy = user;
            done();
        });
        User.findById(site.RecEnterBy, function (err, user) {
            if (err) {return next(err)};
            RecEnterBy = user;
            done();
        });
    });
};
exports.postEdit = function(req, res, next){
    try {
        var loc = JSON.parse(req.body.loc);
    } catch (e) {
        var loc = {coordinates:[], type:''};
    }
    HistoricSite.getAuthSingleSite( req.params.id, 2, res.locals.user, function ( err, site ){
        if( err ) return next( err );
        
        if (!req.body.Keywords) { req.body.Keywords = [];}
        if (!req.body.Tours) { req.body.Tours = [];}

        site = _.extend(site, req.body);
        site.loc = loc;

        site.Name = (site.Name ? site.Name : site.Address);

        site.RecModBy = res.locals.user._id;
        site.RecModDate = Date.now();

        try{
            var refreshCluster = false;
            if (req.body.submitValue == "Publish Place" && site.Status != "Published") {refreshCluster = true;}
            else if (site.Status == 'Published' && (req.body.submitValue == "Submit Place to Moderators" || req.body.submitValue == "Send Back To User (Set Draft Status)" || req.body.submitValue == "Delete Place")) {refreshCluster = true;};            
        }
        catch(err){
            console.log(err);
        }
        
        if (req.body.submitValue == "Save Changes") {
            site.save( function ( err, site, count ){
                if( err ) return next( err );
                res.redirect( '/sites/edit/' + site._id );
            });
        } else if (req.body.submitValue == "Upload New Document") {
            res.redirect( '/sites/details/' + site._id + '/document/upload' );
        } else if (req.body.submitValue == "Delete Place") {
            DeletedItem.createDeletedItem('Place', site.Name, site._id, site._id, res.locals.user._id, res.locals.user.screenName, function (err) {
                if( err ) return next( err );
                ReviewApproval.finishAllForPlace('Rejected', site._id, res.locals.user._id, function (err) {
                    if( err ) return next( err );
                    if (refreshCluster) {
                        cluster.refreshClusterData();
                        console.log('refreshed');            
                    };
                    req.flash('success', 'Place successfully deleted');
                    res.redirect( '/user/drafts/' );
                }); 
            });
        } else if (req.body.submitValue == "Submit Place to Moderators") {
            site.save( function ( err, site, count ){
                if( err ) return next( err );

                ReviewApproval.createApproval('Place', site.Name, site._id, site._id, res.locals.user._id, function (err) {
                    if( err ) return next( err );                    
                    req.flash('success', 'Place successfully submitted to the moderators for review.');
                    res.redirect( '/user/drafts/' );
                });
            });
        } else if (req.body.submitValue == "Send Back To User (Set Draft Status)") {
            
            if ((res.locals.user.userLevel >= 50)) {
                site.save( function ( err, site, count ){
                    if( err ) return next( err );
                    ReviewApproval.finishApproval("Draft", "Place", site._id, site._id, res.locals.user._id, function (err) {
                        if( err ) return next( err );
                        try{
                            if (refreshCluster) {
                                cluster.refreshClusterData();
                                console.log('refreshed');            
                            };
                            req.flash('success', 'Place sent back to user.');                            
                            res.redirect( '/moderator/review' );
                        }
                        catch(err){
                            return next( err );
                        }                        
                    });
                });                
            } else {
                req.flash('error', 'You do not have permissions to publish a place.');
                res.redirect( '/sites/edit/' + site._id );
            }

        } else if (req.body.submitValue == "Publish Place") {

            if ((res.locals.user.userLevel >= 50)) {
                ReviewApproval.finishApproval("Published", "Place", site._id, site._id, res.locals.user._id, function (err) {
                    if( err ) return next( err );
                    if (refreshCluster) {
                        cluster.refreshClusterData();
                        console.log('refreshed');            
                    };
                    req.flash('success', 'Place successfully published');
                    res.redirect( '/moderator/review' );                
                });
            } else {
                req.flash('error', 'You do not have permissions to publish a place.');
                res.redirect( '/sites/edit/' + site._id );
            }

        } else {
            res.redirect( '/sites/edit/' + site._id );
        }
    });
};

exports.list = function(req, res, next){
    if (!req.query.random) {
        var status = [{Status: 'Published'}];
        if (res.locals.user) {status.push({Status: 'Draft', "DataOwner": res.locals.user._id});};
        if (res.locals.user && res.locals.user.userLevel >= 50) {status.push({Status: 'Pending Review'});};    

        HistoricSite.
        find({$or: status, Obsolete: false}, function ( err, sites, count ){
            if( err ) return next( err );
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(sites));
        });
    } else {
        var sites = HistoricSite.generateRandomSites(req.query.random);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(sites));
    };    
};

exports.getSitePopup = function(req, res, next){
    if (!req.query.random) {
        HistoricSite.getAuthSingleSite( req.params.id, 0, res.locals.user, function ( err, site ){
            if( err ) return next( err );
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(site));
        });
    } else {
        var sites = HistoricSite.generateRandomSites(1);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(sites[0]));
    }; 
};

var DeleteContentModel = function (model) {
    var self = this;
    self.title = model.title;
    self.siteID = model.siteID;
    self.contentID = model.contentID;
    self.contentType = model.contentType;
    self.content = model.content;
    self.credit = model.credit;
    self.URL = model.URL;
}


/*COMMENT MANAGEMENT*/
exports.getDeleteComment = function(req, res, next){    
    HistoricSite.getAuthSingleSite( req.params.id, 2, res.locals.user, function ( err, site ){
        if( err ) return next( err );
        
        var comment;
        for (var i = 0; i < site.Comments.length; i++) {
            tmpComment = site.Comments[i]
            if (tmpComment._id == req.params.CommentID) {
                comment = tmpComment;
                break;
            };
        };
        if (!comment) {res.render('404', { url: req.url, title:'Error 404: Comment Not Found' }); return;};
        
        var model = { title: 'Delete ' + comment.DocumentType,
            siteID: req.params.id,
            contentID: req.params.CommentID,
            contentType: "Comment",
            content: comment.Text,
            credit: "",            
            URL: comment.URLFolder + '/' + comment.CommentName,
        }
        res.render('utility/deleteContent', new DeleteContentModel(model));        
    });
};

exports.postDeleteComment = function(req, res, next){
    HistoricSite.getAuthSingleSite( req.params.id, 2, res.locals.user, function ( err, site ){
        if( err ) return next( err );
        
        var comment = '';
        for (var i = 0; i < site.Comments.length; i++) {
            if (site.Comments[i]._id == req.params.CommentID) {comment = site.Comments[i].Text};
            
        };

        DeletedItem.createDeletedItem('Comment', comment, req.params.CommentID, req.params.id, res.locals.user._id, res.locals.user.screenName, function (err) {
            if( err ) return next( err );
            req.flash('success', 'Comment successfully deleted');
            res.redirect( '/sites/details/' + req.params.id );
        });
    });
};


/*DOCUMENT MANAGEMENT*/
exports.getUploadDocument = function(req, res, next){        
    res.render('sites/uploadDocument', {title: 'Upload Document'});
};

exports.postUploadDocument = function(req, res, next){
    //get Place / Site record    
    var clamscan = require('../config/clamscanAV');
    var mime = require('mime');
    HistoricSite.getAuthSingleSite( req.params.id, 1, res.locals.user, function ( err, site ){
        if( err ) return next( err );
        var mimeType = mime.lookup(req.files.Name.path);
        if (_.indexOf(GLOBAL.AllowedMimeTypes, mimeType) == -1) {
            FileStorage.deleteLocalFile(req.files.Name.path , function () {});
            req.flash('error', 'The file type you uploaded (' + mimeType + ') is not approved. The file has been deleted.');
            return res.redirect( '/sites/details/' +  req.params.id + '/document/upload' );
        };
        if (req.files.Name.headers['content-type'] == 'application/octet-stream') {
            var ext = (/[.]/.exec(req.files.Name.originalFilename)) ? /[^.]+$/.exec(req.files.Name.originalFilename)[0] : undefined;
            if (!ext || _.indexOf(GLOBAL.AllowedBinaryFiles, ext) == -1) {
                req.flash('error', 'The file type you uploaded (' + req.files.Name.headers['content-type'] + ') is not approved. The file has been deleted.');
                return res.redirect( '/sites/details/' +  req.params.id + '/document/upload' );
            };
        };        
        if (req.files.Name.size > (GLOBAL.MaxUploadSize * 1024 * 1024)) {
            FileStorage.deleteLocalFile(req.files.Name.path , function () {});
            req.flash('error', 'The file you uploaded is to large (' + (req.files.Name.size / 1024 / 1024).toFixed(2) + 'MB). The file has been deleted.');
            return res.redirect( '/sites/details/' +  req.params.id + '/document/upload' );
        };
        var DocumentType = (_.indexOf(GLOBAL.ImageMimeTypes, req.files.Name.headers['content-type']) > -1 ? 'Image':'Document')
        var approved = ((site.Status == "Draft" && site.DataOwner.equals(res.locals.user._id)) || (res.locals.user.userLevel >= 50) ? true : false);
        var imageFolder = site._id + '/';
        var SiteID = site._id;

        var fileRec = {
                Name: req.files.Name.originalFilename, 
                DocumentType: DocumentType, 
                Credit: req.body.Credit, 
                Caption: req.body.Caption, 
                Approved: approved, 
                URLFolder: null, 
                ThumbName: null, 
                FileName: null, 
                FileStorage: GLOBAL.FileStorage,
                RealFolder: null, 
                RecEnterBy: res.locals.user._id,
                RecModBy: res.locals.user._id
            };

        var num = (DocumentType == 'Image' ? 2: 1);
        var saveThumb = {};
        var saveFile = {};
        var done = _.after(num, function () {
            if (saveThumb.FileName) {fileRec.ThumbName = saveThumb.FileName}; //its an image with a thumbnail
            fileRec.URLFolder = saveFile.URLFolder;
            fileRec.RealFolder = saveFile.RealFolder;
            fileRec.FileName = saveFile.FileName;

            site.Files.push(fileRec);            
            site.save(function (err, savedSite) {
                if( err ) return next( err );
                FileStorage.deleteLocalFile(req.files.Name.path , function () {});
                if (!approved) {
                    ReviewApproval.createApproval(DocumentType, fileRec.Caption, savedSite.Files[savedSite.Files.length - 1]._id, SiteID, res.locals.user._id, function (err) {
                        if( err ) return next( err );  
                        req.flash('success', 'Document successfully submitted to the moderators for review.');
                        res.redirect( '/sites/details/' + site._id );
                    });
                }
                else {                                      
                    req.flash('success', 'Document successfully uploaded.');
                    res.redirect( '/sites/edit/' + site._id );                                        
                };
            });
        });

        clamscan.is_infected(req.files.Name.path, function (err, file, is_infected, virusName) {
            if (err) {return handleFileError(req, res, err, next);};
            if (is_infected) {
                var error = 'The file you uploaded is INFECTED with a virus (' + virusName + '). It has been deleted and will not be processed further.';
                return handleFileError(req, res, error, next);
            } else {
                //file is virus free
                if (DocumentType == 'Image') {
                    FileStorage.generateThumb(req.files.Name.path, 150, 150, function (err, RealFolder, FileName){
                        if( err ) { return handleFileError(req, res, err, next) };

                        var outThumb = imageFolder + FileName
                        var inImage = RealFolder + '/' + FileName;

                        FileStorage.saveFile(inImage, outThumb, function (err, URLFolder, RealFolder, FileName) {
                            if( err ) { return handleFileError(req, res, err, next) };
                            FileStorage.deleteLocalFile(inImage , function () {});
                            saveThumb = {URLFolder: URLFolder, RealFolder: RealFolder, FileName: FileName};
                            done();
                        });
                    });            
                }
                FileStorage.saveFile(req.files.Name.path, imageFolder + req.files.Name.originalFilename, function (err, URLFolder, RealFolder, FileName) {
                    if( err ) { return handleFileError(req, res, err, next) };
                    saveFile = {URLFolder: URLFolder, RealFolder: RealFolder, FileName: FileName};
                    done();
                });
            };
        });
    });
    // res.render('sites/uploadDocument', {title: 'Upload Document'});
};

function handleFileError (req, res, err, next) {
    try{
        if ((new String(err).indexOf('Error: EPERM, open') == 0)) {
            req.flash('error', 'The file you uploaded is invalid and has been removed by the system. The file may contain malicious computer code.');
            return res.redirect( '/sites/details/' +  req.params.id + '/document/upload' );
        } else if ((new String(err).indexOf('The file you uploaded is INFECTED with a virus') == 0)) {
            req.flash('error', err);
            return res.redirect( '/sites/details/' +  req.params.id + '/document/upload' );
        } else {
            return next(err);
        }
    }
    catch(errr){
        return next(err);
    }
}

exports.getEditDocument = function(req, res, next){    
    HistoricSite.getAuthSingleSite( req.params.id, 2, res.locals.user, function ( err, site ){
        if( err ) return next( err );
        
        var file;
        for (var i = 0; i < site.Files.length; i++) {
            tmpFile = site.Files[i]
            if (tmpFile._id == req.params.DocumentID) {
                file = tmpFile;
                break;
            };
        };
        if (!file) {res.render('404', { url: req.url, title:'Error 404: File Not Found' }); return;};
        res.render('sites/editDocument', {title: 'Edit Document', model:file});
    });    
};

exports.postEditDocument = function(req, res, next){
    HistoricSite.getAuthSingleSite( req.params.id, 2, res.locals.user, function ( err, site ){
        if( err ) return next( err );
        
        var file;
        for (var i = 0; i < site.Files.length; i++) {
            tmpFile = site.Files[i]
            if (tmpFile._id == req.params.DocumentID) {
                file = tmpFile;
                break;
            };
        };
        if (!file) {res.render('404', { url: req.url, title:'Error 404: File Not Found' }); return;};

        file = _.extend(file, req.body);
        file.RecModBy = res.locals.user._id;
        file.RecModDate = Date.now();
        site.save(function (err, savedSite) {
            if( err ) return next( err );
            res.redirect( '/sites/edit/' + savedSite._id );
        });
    });
};

exports.getDeleteDocument = function(req, res, next){    
    HistoricSite.getAuthSingleSite( req.params.id, 2, res.locals.user, function ( err, site ){
        if( err ) return next( err );
        
        var file;
        for (var i = 0; i < site.Files.length; i++) {
            tmpFile = site.Files[i]
            if (tmpFile._id == req.params.DocumentID) {
                file = tmpFile;
                break;
            };
        };
        if (!file) {res.render('404', { url: req.url, title:'Error 404: File Not Found' }); return;};
        
        var model = { title: 'Delete ' + file.DocumentType,
            siteID: req.params.id,
            contentID: req.params.DommentID,
            contentType: file.DocumentType,
            content: file.Caption,
            credit: file.Credit,            
            URL: file.URLFolder + '/' + file.FileName,
        }
        res.render('utility/deleteContent', new DeleteContentModel(model));        
    });
};

exports.postDeleteDocument = function(req, res, next){
    HistoricSite.getAuthSingleSite( req.params.id, 2, res.locals.user, function ( err, site ){
        if( err ) return next( err );
        
        var Caption = '';
        for (var i = 0; i < site.Files.length; i++) {
            if (site.Files[i]._id == req.params.DocumentID) {Caption = site.Files[i].Caption};
            
        };

        DeletedItem.createDeletedItem('Document', Caption, req.params.DocumentID, req.params.id, res.locals.user._id, res.locals.user.screenName, function (err) {
            if( err ) return next( err );
            req.flash('success', 'Document successfully deleted');
            res.redirect( '/sites/edit/' + req.params.id );
        });
    });
};

