const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    user_id: { type: Number },
    email: { type: String, required: true, index: true },
    hash: { type: String, required: true, index: true },
    type_for: { type: String, required: true, index: true },
    is_active: { type: Boolean, default: false, index: true },
    count: { type: Number, default: 1 },
    created_date: { type: Date },
});

let tokens = mongoose.model('management-hash', tokenSchema)
tokens.createIndexes()
module.exports = tokens;