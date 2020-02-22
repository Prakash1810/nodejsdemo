const mongoose = require('mongoose');

const tradeVolumeSchema = mongoose.Schema({
    user_id: { type : Number, required : true },
    btc_volume: { type : Number, required : true },
    usdt_volume: { type : Number},
    current_value : { type : Number, required : true },
    from_date : { type : String },
    to_date : { type : String },
}, {
    timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' }
})
module.exports = mongoose.model('user-trade-volumes', tradeVolumeSchema);