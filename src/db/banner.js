const mongoose = require('mongoose');
require('mongoose-type-url');
const bannerSchema = mongoose.Schema({
    banner_name: { type: String },
    alt_tags: { type: String, index: true },
    image_url: { type: mongoose.SchemaTypes.Url, index: true },
    order: { type: Number, index: true },
    is_active: { type: Boolean, default: true, index: true },
    is_mobile: { type: Boolean }
}, { timestamps: { createdAt: 'created_date', updatedAt: 'modified_date' } });

let banner = mongoose.model('banner_images', bannerSchema);;
banner.createIndexes()
module.exports = banner;