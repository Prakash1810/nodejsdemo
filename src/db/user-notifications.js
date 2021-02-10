const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', index: true },
    type: { type: String },
    title: { type: String },
    content: { type: String },
    is_active: { type: Boolean }
}, { timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' } });
let userNotification = mongoose.model('user-notifications', notificationSchema);
userNotification.createIndexes();
module.exports = userNotification;