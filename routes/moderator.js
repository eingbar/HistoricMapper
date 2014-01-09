/*This is where all the moderator methods will exist User level = 50*/
var mongoose = require( 'mongoose' );
var ReviewApproval = mongoose.model( 'ReviewApproval' );

exports.reviewPending = function(req, res, next){
	ReviewApproval.find({Status: "Pending", "Admin": false}, function (err, pendingApprovals) {
		if (err) {return next(err);};
		res.render( 'moderator/reviewPending', { title:'Review Pending Approvals', model: pendingApprovals });
	})    
};

exports.getApproveContent = function (req, res, next) {

	if (req.params.type == "Image" || req.params.type == "Document" || req.params.type == "Comment") {
		ReviewApproval.finishApproval("Published", req.params.type, req.params.contentID, req.params.siteID, res.locals.user._id, function (err) {
		    if( err ) return next( err );
		    req.flash('success', 'Content approved successfully');
		    res.redirect(req.headers.referer);
		    // res.redirect( '/sites/edit/' + req.params.siteID );
		});	
	} else if (req.params.type == "Suggestion") {		
		ReviewApproval.finishApproval("Approved", req.params.type, req.params.contentID, req.params.siteID, res.locals.user._id, function (err) {
		    if( err ) return next( err );
		    req.flash('success', 'Suggestion marked as approved');
		    res.redirect( '/moderator/review' );
		});
	} else {
		return next({status: 404, description: "Type not found"});
	};

}
exports.getRejectContent = function (req, res, next) {

	if (req.params.type == "Image" || req.params.type == "Document" || req.params.type == "Comment") {
		ReviewApproval.finishApproval("Rejected", req.params.type, req.params.contentID, req.params.siteID, res.locals.user._id, function (err) {
		    if( err ) return next( err );
		    req.flash('success', 'Content rejected successfully');
		    res.redirect(req.headers.referer);
		    //res.redirect( '/sites/edit/' + req.params.siteID );
		});	
	} else if (req.params.type == "Suggestion") {
		ReviewApproval.finishApproval("Rejected", req.params.type, req.params.contentID, req.params.siteID, res.locals.user._id, function (err) {
		    if( err ) return next( err );
		    req.flash('success', 'Suggestion marked as Rejected');
		    res.redirect( '/moderator/review' );
		});
	} else {
		return next({status: 404, description: "Type not found"});
	};
}

exports.getDeleteContent = function (req, res, next) {
	if (req.params.type == "Comment") {
		
	} else {
		return next({status: 404, description: "Type not found"});
	};
}