const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    user_id: { type: Number},
    email: { type: String, required: true },
    hash: { type: String, required: true },
    type_for: { type: String, required: true },
    is_active: { type: Boolean, default: false },
    created_date: { type: Date },
});

module.exports = mongoose.model('management-hash', tokenSchema)
