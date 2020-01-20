const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    id: { type: Number },
    mtime: { type: Number },
    market: { type: String },
    source: { type: String },
    price: { type: String },
    user: { type: Number, index: true },
    left: { type: String },
    type: { type: Number },
    ctime: { type: Number },
    deal_stock: { type: String },
    side: { type: Number },
    amount: { type: String },
    taker_fee: { type: String },
    maker_fee: { type: String },
    deal_money: { type: String },
    deal_fee: { type: String },

},
    {
        timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' }
    })

let orderCancel = mongoose.model('order-cancel', schema);
orderCancel.createIndexes()
module.exports = orderCancel;