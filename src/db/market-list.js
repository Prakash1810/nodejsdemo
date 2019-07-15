const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    market_name: {
        type: String, required: true, index: true, unique: true }
})

module.exports = mongoose.model('market-list', schema);