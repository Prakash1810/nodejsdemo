const mongoose = require('mongoose');

const deviceSchema = mongoose.Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'Users' },
    device: String,
    os: String,
    verified: Boolean,
    created_by: { type: Schema.Types.ObjectId, ref: 'Users' },
    created_date: { type: Date, default: Date.now },
    modified_date: Date,
    is_deleted: Boolean
});

DeviceMangement = mongoose.model('device', deviceSchema); 
module.exports = DeviceMangement;