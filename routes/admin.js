/*Administrator methods UserLevel = 100*/
var mongoose = require( 'mongoose' );
var User = mongoose.model( 'User' );
var Tour = mongoose.model( 'Tour' );
var Keyword = mongoose.model( 'Keyword' );
var HistoricSite = mongoose.model( 'HistoricSite' );
var DeletedItem = mongoose.model( 'DeletedItem' );
var HistoricDistrict = mongoose.model( 'HistoricDistrict' );
var _ = require('underscore');


/*
Redwood Empire
Victorian
West Coast lumber trade
Carson Mansion
Sequoia Park
Wiyot
Clarke Historical Museum
Gold Rush
Fort Humboldt
William M. Carson
Newsom and Newsom
Old Town area
Oyster farms
Fields Landing
Chinese
Northern Pacific Railroad
Redwood Highway
Earthquake
*/

exports.usersIndex = function(req, res){
	User.find({}, function (err, users) {
		res.render( 'admin/users/index', {title: 'Manage Users', model: users});
	});    
};

exports.getEditUsers = function(req, res){

	User.findOne({_id: req.params.id}, function (err, user) {
		if( err ) return next( err );
		if (!user) {
			res.render('404', { url: req.url, title:'Error 404: File Not Found' });
	        return;
		};
    	res.render( 'admin/users/edit', {title: 'Edit User', model: user});		
	});	
};

exports.postEditUsers = function(req, res, next){	
	try
	{
		User.findOne({_id: req.params.id}, function (err, user) {
			if( err ) return next( err );
			if (!user) {res.render('404', { url: req.url, title:'Error 404: File Not Found' }); return;};

			if (req.body.submitValue == 'SaveUser') {

				var reCheckEmail = false;
				if (req.body.email != user.email) {
					reCheckEmail = true;
			    	user.emailVerified = false
			    };  

				user.firstName = req.body.firstName;
				user.lastName = req.body.lastName;
				user.email = req.body.email;
				user.userLevel = Number(req.body.userLevel);
				user.screenName = req.body.screenName;
				user.userName = req.body.userName;
				user.approved = (req.body.approved === "true");
				user.ModDailyDigest = (req.body.ModDailyDigest === "true");
				if (req.body.allowEmailAgain == 'true') {
					user.emailLocked = false;
					user.emailLockedReason = null;
				};				

				user.save(function (err) {
					if( err ) throw err;
					if (reCheckEmail) {
						var mailer = require('../config/mailer');
						mailer.sendVerificationEmail(user, function (err) {
							if( err ) return next(err);
							req.flash('success', 'User and Email address updated. Verification email has been resent.');
							res.redirect( '/admin/users/' );
						});
					} else {
						req.flash('success', 'User Updated');
						res.redirect( '/admin/users/' );
					};					
				});
			} else if (req.body.submitValue == 'ResetPassword') {
				User.resetPassword(req.params.id, function (err, results) {
					if( err ) return next(err);
					var mailer = require('../config/mailer');
					mailer.sendPasswordResetEmail(user.email, results.resetId, function (err) {
						if( err ) return next(err);
						req.flash('success', 'User Password Reset');
						res.redirect( '/admin/users/' );
					});					
				});
			} else if (req.body.submitValue == 'DeleteUser') {
				user.remove(function (err) {
					req.flash('error', 'User has been deleted');
					res.redirect( '/admin/users/' );
				});				
			};
		});				
	}
	catch(err)
	{
		req.flash('error', err);
		res.render( 'admin/users/edit', {title: 'Edit User', model: req.body});
	}
};

exports.keywordsIndex = function(req, res, next){
	Keyword.find({}).sort('Text').exec(function (err, keywords) {
		if (err) {return next(err)};
		res.render( 'admin/keywords/index', {model: keywords, title: 'Manage Keywords'});
	});    
};

exports.postCreateKeyword = function (req, res, next) {
	if (!req.body.Text) {
		req.flash('error', "New keyword can not be blank.");
		res.redirect( '/admin/keywords/' );
	} else {
		var keyword = new Keyword({Text: req.body.Text, RecEnterBy: res.locals.user._id, RecModBy: res.locals.user._id});
		keyword.save(function (err) {
			if (err) {return next(err)};
			req.flash('success', 'Keyword ' + keyword.Text + ' was created successfully');
		})
		res.redirect( '/admin/keywords/' );
	};	
}

exports.getEditKeywords = function(req, res, next){
	Keyword.findById(req.params.id, function (err, keyword) {
		if (err) {return next(err)};
		if (!keyword) {
			res.render('404', { url: req.url, title:'Error 404: File Not Found' });
	        return;
		};
		HistoricSite.count({"Keywords": keyword.Text}, function (err, count) {
			if (err) {return next(err)};
			res.render( 'admin/keywords/edit', {title: 'Edit Keyword', model: keyword, count: count});
		});		
	});    
};

exports.postEditKeywords = function(req, res, next){	
	try
	{
		if (req.body.submitValue == 'SaveKeyword') {
			if (!req.body.Text) {
				req.flash('error', "Keyword can not be blank.");
				res.redirect( '/admin/keywords/edit/' + req.params.id );
				return;
			}
			Keyword.update({"_id": req.params.id}, {"$set": {"Text": req.body.Text, "Obsolete": (req.body.Obsolete=='true'), RecModBy: res.locals.user._id, RecModDate: Date.now()}}, {multi: false}, function (err, numberAffected, raw) {
				if (err) {return next(err)};
				if (req.body.Text != req.body.OrigText) {
					HistoricSite.update({"Keywords": req.body.OrigText}, {"$set": {"Keywords.$": req.body.Text}}, {multi: true}, function (err, numberAffected, raw) {
						if (err) {return next(err)};
						if (numberAffected > 0) {
							var placesText = (numberAffected == 1 ? "place":"places")
							req.flash('success', 'Keyword ' + req.body.Text + ' was updated successfully along with ' + numberAffected + ' ' + placesText);	
						} else {
							req.flash('success', 'Keyword ' + req.body.Text + ' was updated successfully');
						};
						res.redirect( '/admin/keywords/' );
					});
				} else {
					req.flash('success', 'Keyword ' + req.body.Text + ' was updated successfully');
					res.redirect( '/admin/keywords/' );
				};
			});
		} else if (req.body.submitValue == 'DeleteKeyword') {
			Keyword.remove({"_id": req.params.id}, function (err) {
				if (err) {return next(err)};
				HistoricSite.update({"Keywords": req.body.OrigText}, { "$pull": { "Keywords": req.body.OrigText } }, {multi: true}, function (err, numberAffected, raw) {
					if (err) {return next(err)};
					if (numberAffected > 0) {
						var placesText = (numberAffected == 1 ? "place":"places")
						req.flash('success', 'Keyword ' + req.body.Text + ' was deleted successfully and removed from ' + numberAffected + ' ' + placesText);	
					} else {
						req.flash('success', 'Keyword ' + req.body.Text + ' was deleted successfully');
					};
					res.redirect( '/admin/keywords/' );
				})
			});
		};
	}
	catch(err)
	{
		req.flash('error', err.message);
		res.render( 'admin/keywords/edit', {title: 'Edit Keyword', model: req.body});
	}
};

exports.toursIndex = function(req, res, next){
	Tour.find({}).sort('Text').exec(function (err, tours) {
		if (err) {return next(err)};
		res.render( 'admin/tours/index', {model: tours, title: 'Manage Tours'});
	});    
};

exports.postCreateTour = function (req, res, next) {
	if (!req.body.Text) {
		req.flash('error', "New tour can not be blank.");
		res.redirect( '/admin/tours/' );
	} else {
		var tour = new Tour({Text: req.body.Text, RecEnterBy: res.locals.user._id, RecModBy: res.locals.user._id});
		tour.save(function (err) {
			if (err) {return next(err)};
			req.flash('success', 'Tour ' + tour.Text + ' was created successfully');
		})
		res.redirect( '/admin/tours/' );
	};	
}

exports.getEditTours = function(req, res, next){
	Tour.findById(req.params.id, function (err, tour) {
		if (err) {return next(err)};
		if (!tour) {
			res.render('404', { url: req.url, title:'Error 404: File Not Found' });
	        return;
		};
		HistoricSite.count({"Tours": tour.Text}, function (err, count) {
			if (err) {return next(err)};
			res.render( 'admin/tours/edit', {title: 'Edit Tour', model: tour, count: count});
		});		
	});    
};

exports.postEditTours = function(req, res, next){	
	try
	{
		if (req.body.submitValue == 'SaveTour') {
			if (!req.body.Text) {
				req.flash('error', "Tour can not be blank.");
				res.redirect( '/admin/tours/edit/' + req.params.id );
				return;
			}
			Tour.update({"_id": req.params.id}, {"$set": {"Text": req.body.Text, "Obsolete": (req.body.Obsolete=='true'), RecModBy: res.locals.user._id, RecModDate: Date.now()}}, {multi: false}, function (err, numberAffected, raw) {
				if (err) {return next(err)};
				if (req.body.Text != req.body.OrigText) {
					HistoricSite.update({"Tours": req.body.OrigText}, {"$set": {"Tours.$": req.body.Text}}, {multi: true}, function (err, numberAffected, raw) {
						if (err) {return next(err)};
						if (numberAffected > 0) {
							var placesText = (numberAffected == 1 ? "place":"places")
							req.flash('success', 'Tour ' + req.body.Text + ' was updated successfully along with ' + numberAffected + ' ' + placesText);	
						} else {
							req.flash('success', 'Tour ' + req.body.Text + ' was updated successfully');
						};
						res.redirect( '/admin/tours/' );
					});
				} else {
					req.flash('success', 'Tour ' + req.body.Text + ' was updated successfully');
					res.redirect( '/admin/tours/' );
				};
			});
		} else if (req.body.submitValue == 'DeleteTour') {
			Tour.remove({"_id": req.params.id}, function (err) {
				if (err) {return next(err)};
				HistoricSite.update({"Tours": req.body.OrigText}, { "$pull": { "Tours": req.body.OrigText } }, {multi: true}, function (err, numberAffected, raw) {
					if (err) {return next(err)};
					if (numberAffected > 0) {
						var placesText = (numberAffected == 1 ? "place":"places")
						req.flash('success', 'Tour ' + req.body.Text + ' was deleted successfully and removed from ' + numberAffected + ' ' + placesText);	
					} else {
						req.flash('success', 'Tour ' + req.body.Text + ' was deleted successfully');
					};
					res.redirect( '/admin/tours/' );
				})
			});
		};
	}
	catch(err)
	{
		req.flash('error', err.message);
		res.render( 'admin/tours/edit', {title: 'Edit Tour', model: req.body});
	}
};

exports.reviewReports = function(req, res){
    res.render( 'admin/reviewReports');
};

function getItemByID (array, _id) {
	for (var i = 0; i < array.length; i++) {
		var item = array[i];
		if (item._id == _id) {return item};
	};
}

exports.getDistrictIndex = function (req, res, next) {
	HistoricDistrict.find({}, function (err, districts) {
		if (err) {return next(err)};
		res.render( 'admin/districts/index', {title: 'Manage Historic Districts', model: districts});
	});
}

exports.getDistrictCreate = function (req, res, next) {	
	res.render( 'admin/districts/create', {title: 'Create Historic District'});
}

exports.postDistrictCreate = function (req, res, next) {
	try {
        var loc = JSON.parse(req.body.loc);
        req.body.loc = loc;
    } catch (e) {
        var loc = {coordinates:[], type:''};
    }
	var district = new HistoricDistrict(_.extend({}, req.body));
	district.save(function (err) {
		if (err) {return next(err)};
		req.flash('success', 'District "' + req.body.Name + '"" was created successfully');
		res.redirect( '/admin/districts/' );
	});
}

exports.getDistrictEdit = function (req, res, next) {
	HistoricDistrict.findById(req.params.id, function (err, district) {
		if (err) {return next(err)};
		res.render( 'admin/districts/edit', {title: 'Edit Historic District', model: district});
	});
}

exports.postDistrictEdit = function (req, res, next) {
	try {
        var loc = JSON.parse(req.body.loc);
        req.body.loc = loc;
    } catch (e) {
        var loc = {coordinates:[], type:''};
    }
    HistoricDistrict.findById(req.params.id, function (err, district) {
    	if (err) {return next(err)};
    	if (!district) {res.render('404', { url: req.url, title:'Error 404: File Not Found' }); return;};
    	if (req.body.submitValue == "SaveDistrict") {
    		district = _.extend(district, req.body);
	    	district.loc = loc;
			district.save(function (err) {
				if (err) {return next(err)};
				req.flash('success', 'District "' + req.body.Name + '" was saved successfully');
				res.redirect( '/admin/districts/' );
			});
    	} else if (req.body.submitValue == "DeleteDistrict") {
    		HistoricDistrict.remove({_id: req.params.id}, function (err) {
    			if (err) {return next(err)};
    			req.flash('success', 'District "' + req.body.Name + '" was deleted successfully');
				res.redirect( '/admin/districts/' );
    		});
    	};    	
    });
}

exports.getDeletedItems = function (req, res, next) {
	DeletedItem.find({Status: 'Pending', Obsolete: false}, function (err, items) {
		if (err) {return next(err)};
		res.render( 'admin/deletedItems/index', {title: 'Manage Deleted Items', model: items});
	});
}

exports.undoDeletedItem = function (req, res, next) {
	DeletedItem.unDoDeletedItem(req.params.id, res.locals.user._id, function (err) {
		if (err) {
			req.flash('error', err);
			res.redirect( '/admin/deleteditems/' );
			return;
		};
		req.flash('success', 'Item delete undone successfully');
		res.redirect( '/admin/deleteditems/' );
	});
}

exports.processFullDeleteItem = function (req, res, next) {
	DeletedItem.processFullDelete(req.params.id, function (err, item) {
		if (err) {
			req.flash('error', JSON.stringify(err));
			res.redirect( '/admin/deleteditems/' );
			return;
		};
		req.flash('success', item.Type + ' deleted successfully');
		res.redirect( '/admin/deleteditems/' );
	});
}