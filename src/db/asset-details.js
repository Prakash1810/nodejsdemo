const mongoose = require('mongoose');
	
const assetDetailschema = new mongoose.Schema({
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'assets', index: true },
    subtype : { type : String },
    asset_type: { type: String },
    total_supply: { type: String },
    asset_id : { type : Number },
    circulation: { type: String },
    market_cap: { type: String },
    token_type : { type : String },
    premine: { type: String },
    proof_type: { type: String },
    algorithm: { type: String },
    categories: { type: String },
    social_contacts: { type: mongoose.Schema.Types.Mixed },
    website: { type: String },
    sourcecode: { type: String },
    announcement: { type: String },
    whitepaper : { type : String },
    coinmarketcap: { type: String },
    coingecko: { type: String },
    cryptoslate: { type: String },
    seven_day_sparkline: { type: String },
    average_price: { type: String },
    add_nodes: { type: mongoose.Schema.Types.Mixed }

});

let assetDetails = mongoose.model('asset-details', assetDetailschema);
assetDetails.createIndexes()
module.exports = assetDetails;