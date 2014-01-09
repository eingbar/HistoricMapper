var mongoose = require( 'mongoose' );
var Schema   = mongoose.Schema;

var HistoricDistrictSchema = new Schema({
    Name            : String, 
    loc: {
        'type': { type: String, default: 'Polygon' },
        coordinates: []
    },
    Obsolete        : {type: Boolean, default: false},
    RecEnterBy      : Schema.Types.ObjectId,
    RecEnterDate    : { type: Date, default: Date.now },
    RecModBy        : Schema.Types.ObjectId,
    RecModDate      : { type: Date, default: Date.now }
}, { collection: 'HistoricDistrict' });

HistoricDistrictSchema.index({ loc : '2dsphere' }, { sparse: true });

HistoricDistrictSchema.pre('save', function(next){
    var doc = this;
    if(doc.loc.coordinates.length == 0)
        doc.loc = undefined;
    next();
});

var HistoricDistrict = mongoose.model( 'HistoricDistrict', HistoricDistrictSchema );
module.exports = HistoricDistrict;