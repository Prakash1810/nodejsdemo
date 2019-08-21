const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    market_name: {
        type: String, required: true, index: true, unique: true
    },
    market_pair: {
        type: String, required: true
    },
    q: { type: Boolean, default: false }
})

module.exports = mongoose.model('market-list', schema);