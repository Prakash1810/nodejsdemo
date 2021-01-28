const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    asset_name: { type: String, index: true },
    market_name: { type: String, index: true },
    market_pair: { type: String, index: true },
    last_price: { type: String, index: true },
    q: { type: Boolean, index: true },
    quote_volume: { type: Number, index: true }
})

let marketLastPrice = mongoose.model('market-last-price', schema);
marketLastPrice.createIndexes();
module.exports = marketLastPrice;