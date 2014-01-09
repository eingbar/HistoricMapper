//https://github.com/mattpat/node-schedule

var schedule = require('node-schedule');

var rule = new schedule.RecurrenceRule();

//rule.second = [0, 30];
rule.minute = 0; //run at top of every Hour


var j = schedule.scheduleJob(rule, function(){
	try{
		var mongoose = require( 'mongoose' );
		var DeletedItem = mongoose.model( 'DeletedItem' );

		var deletedItemQuery = {KeepUntil: {"$lt":new Date()}, Status: "Pending", Obsolete: false};
		DeletedItem.find(deletedItemQuery, function (err, items) {
			if (err) {throw new Error(err)};
			for (var i = 0; i < items.length; i++) {
				var item = items[i];				
				DeletedItem.processFullDelete(item._id, function (err, item) {
					try{
						if (err) {throw new Error(err)};
						console.log(item.Type + ' deleted');
					}
					catch(err){
						console.log(err);
					} 
				});				
			};
		});
	}
	catch(err){
		console.log(err);
	}    
});