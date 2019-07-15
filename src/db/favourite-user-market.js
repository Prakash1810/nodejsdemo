const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    market: { type: Array, required: true }
})

module.exports = mongoose.model('favourite-user-market', schema);