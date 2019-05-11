const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    accesToken: { type: String },
    refreshToken: { type: String },
    isDeleted: { type: Boolean, default: false },
    createOn: { type: Date },
    updateOn: { type: Date }
});

module.exports = mongoose.model('management-token', tokenSchema)
