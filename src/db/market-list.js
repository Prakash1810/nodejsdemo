const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'assets', index: true },
    market_name: {
        type: String, required: true, index: true, unique: true
    },
    market_pair: {
        type: String, required: true, index: true
    },
    minimum_price: {
        type: Number, default: 0
    },
    q: { type: Boolean, default: false, index: true },

    q_kline: { type: Boolean, default: true },

    is_active: { type: Boolean, default: true },
    disable_trade: { type: Boolean, default: false },
    stock_prec: { type: Number, default: 0 },
    money_prec: { type: Number, default: 0 },
    min_amount: { type: String, default: "0" },
    fee_discount: { type: Boolean, default: false },
    market_taker_fee: { type: String },
    market_maker_fee: { type: String },
    priority: { type: Number }
})

let marketList = mongoose.model('market-list', schema);
marketList.createIndexes()
module.exports = marketList;