const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    info_token: { type: String },
    access_token: { type: String },
    refresh_token: { type: String },
    is_deleted: { type: Boolean, default: false },
    created_date: { type: Date },
    modified_date: { type: Date },
    type_for:{type:String}
});

module.exports = mongoose.model('management-token', tokenSchema)
