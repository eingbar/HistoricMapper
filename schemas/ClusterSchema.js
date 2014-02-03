var mongoose = require( 'mongoose' );
var Schema   = mongoose.Schema;

var ClusterSchema = new Schema({
    type            : String,
    zoomLevel		: { type: Number, index: true },
    loc: {
        type: { type: String, default: null },
        coordinates: []
    },
    feature_id		: Schema.Types.ObjectId,
    ImageURL		: String,
    Name			: String,
    Complete		: Boolean,
    count 			: { type: Number, default: 1 },
    convexHull 		: {
        type: { type: String, default: null },
        coordinates: []
    },
    bbox			: [],
    obsolete		: {type: Boolean, default: false}
}, { collection: 'Cluster' });

ClusterSchema.index({ loc : '2dsphere' }, { sparse: true });

var Cluster = mongoose.model( 'Cluster', ClusterSchema );
module.exports = Cluster;