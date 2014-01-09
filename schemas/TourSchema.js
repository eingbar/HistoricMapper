var mongoose = require( 'mongoose' );
var Schema   = mongoose.Schema;

var TourSchema = new Schema({
    Text            : String, 
    Obsolete        : {type: Boolean, default: false}, //Does not delete item, but will not show up in LookupLists
    RecEnterBy      : Schema.Types.ObjectId,
    RecEnterDate    : { type: Date, default: Date.now },
    RecModBy        : Schema.Types.ObjectId,
    RecModDate      : { type: Date, default: Date.now }
}, { collection: 'Tour' });

var Tour = mongoose.model( 'Tour', TourSchema );
module.exports = Tour;