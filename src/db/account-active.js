const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    email: { type: String, required: true },
    count: { type: Number, default: 1 },
    create_date: { type: Date }
})

module.exports = mongoose.model('account-active', schema);