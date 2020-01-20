const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'users', index: true },
    market: { type: Array, required: true, index: true }
})

let favMarket = mongoose.model('favourite-user-market', schema);
favMarket.createIndexes()
module.exports = favMarket;