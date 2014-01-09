var mongoose = require( 'mongoose' );
var Schema   = mongoose.Schema;

var KeywordSchema = new Schema({
    Text            : String, 
    Obsolete        : {type: Boolean, default: false}, //Does not delete item, but will not show up in LookupLists
    RecEnterBy      : Schema.Types.ObjectId,
    RecEnterDate    : { type: Date, default: Date.now },
    RecModBy        : Schema.Types.ObjectId,
    RecModDate      : { type: Date, default: Date.now }
}, { collection: 'Keyword' });

var Keyword = mongoose.model( 'Keyword', KeywordSchema );
module.exports = Keyword;