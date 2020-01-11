const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    email: { type: String, required: true, lowercase: true, index: true },
    count: { type: Number, default: 1, index: true },
    create_date: { type: Date },
    type_for: { type: String, required: true, index: true }
});

let accountActivity = mongoose.model('account-active', schema);
accountActivity.createIndexes()
module.exports = accountActivity;