const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'assets' },
    market_name: {
        type: String, required: true, index: true, unique: true
    },
    market_pair: {
        type: String, required: true
    },
    q: { type: Boolean, default: false },
    
    q_kline: { type: Boolean, default: true },

    is_active:{type:Boolean,default:true},
    disable_trade:{type:Boolean,default:false}

})

module.exports = mongoose.model('market-list', schema);