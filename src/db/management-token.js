const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', index: true },
    info_token: { type: String, index: true },
    access_token: { type: String, index: true },
    refresh_token: { type: String, index: true },
    is_deleted: { type: Boolean, default: false },
    created_date: { type: Date },
    modified_date: { type: Date },
    type_for: { type: String, index: true }
});

let managementToken = mongoose.model('management-token', tokenSchema)
managementToken.createIndexes()
module.exports = managementToken;
