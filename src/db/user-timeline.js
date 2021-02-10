const mongoose = require('mongoose');

const timelineSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true, index: true },
    activity: { type: mongoose.Schema.Types.Mixed },
    is_active: { type: Boolean, default: true, index: true }
}, {
    timestamps: { createdAt: 'created_date', updatedAt: 'modified_date_time' }
});

let userTimeline = mongoose.model('user-timelines', timelineSchema);
userTimeline.createIndexes()
module.exports = userTimeline;