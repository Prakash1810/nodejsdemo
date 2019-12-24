const mongoose = require('mongoose');

const rewardbalanceSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    reward_asset: { type: String },
    reward: { type: Number, required: true },
    is_deleted:{type:Boolean,default:false}
},
    { timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' } });

module.exports = mongoose.model('reward-balance', rewardbalanceSchema);