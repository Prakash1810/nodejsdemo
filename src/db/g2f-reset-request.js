const mongoose = require('mongoose');
const resetRequestSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', index: true },
    status : { type : String, required : true },
    comment : { type : String }
}, {
    timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' }
});

let resetRequest = mongoose.model('g2f-reset-request', resetRequestSchema);
resetRequest.createIndexes();
module.exports = resetRequest;