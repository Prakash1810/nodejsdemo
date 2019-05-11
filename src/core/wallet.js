const controller = require('../core/controller');
const assets = require('../db/assets');
const userAddress = require('../db/user-address');
const withdrawAddress = require('../db/withdrawal-addresses');
const Joi = require('joi');
const coinAddressValidator = require('wallet-address-validator');

class Wallet extends controller {

    getAssets(req, res) {
        let pageNo = parseInt(req.query.page_no)
        let size = parseInt(req.query.size)
        let query = {}

        if (pageNo < 0 || pageNo === 0) {
            return res.status(404).json(this.errorMsgFormat({
                "message": "invalid page number, should start with 1"
            }))
        }

        query.skip = size * (pageNo - 1)
        query.limit = size

        // Find some documents
        assets.countDocuments({
            is_suspend: false
        }, (err, totalCount) => {
            if (err) {
                return res.status(404).json(this.errorMsgFormat({
                    "message": "No data found"
                }, 'assets', 404))
            } else {
                assets.find({
                    is_suspend: false
                }, '_id asset_name asset_code logo_url', query, (err, data) => {
                    if (err || !data.length) {
                        return res.status(404).json(this.errorMsgFormat({
                            "message": "No data found"
                        }, 'assets', 404));
                    } else {
                        var totalPages = Math.ceil(totalCount / size);
                        return res.status(200).json(this.successFormat({
                            "data": data,
                            "pages": totalPages,
                            "totalCount": totalCount
                        }, null, 'assets', 200));
                    }
                });
            }
        });
    }

    async getAssetAddress(req, res) {
        let asset = req.body.data.id;
        if (asset !== undefined && asset !== '' && asset !== null) {
            let getAddress = await userAddress.findOne({
                asset: asset,
                user: req.user.user
            });
            if (!getAddress) {
                return res.status(400).json(this.errorMsgFormat({
                    "message": "No records found."
                }, 'assets', 400));
            } else {
                return res.status(200).json(this.successFormat({
                    'asset_code': getAddress.asset_code,
                    'address': getAddress.address
                }, 200, asset, 'address'));
            }
        } else {
            return res.status(400).json(this.errorMsgFormat({
                "message": "Invalid request"
            }, 'assets', 400));
        }
    }

    postWithdrawAddressValidation(req) {
        let schema = Joi.object().keys({
            asset: Joi.string().required(),
            address: Joi.string().required(),
            label: Joi.string().required(),
            is_whitelist: Joi.boolean().optional()
        });

        return Joi.validate(req, schema, {
            abortEarly: false,
            language: {
                escapeHtml: true
            }
        });
    }

    async coinAddressValidate(address, asset) {
        let getAsset = await assets.findById(asset);
        return coinAddressValidator.validate(address, getAsset.asset_code.toLowerCase());
    }

    async postWithdrawAddress(req, res) {
        let requestData = req.body.data.attributes;

        // check addres is valid or not
        let isValid = await this.coinAddressValidate(requestData.address, requestData.asset);
        if (isValid !== true) {
            return res.status(400).send(this.errorMsgFormat({
                'address': 'Invalid address.'
            }, 'withdrawAddress'));
        }

        // check address already exists
        let checkAddress = await withdrawAddress.findOne({
            'user': req.user.user,
            'address': requestData.address
        });

        if (checkAddress) {
            return res.status(400).send(this.errorMsgFormat({
                'address': 'This address already exits.'
            }, 'withdrawAddress'));
        } else {
            withdrawAddress.create({
                user: req.user.user,
                asset: requestData.asset,
                label: requestData.label,
                address: requestData.address,
                is_whitelist: (requestData.is_whitelist !== undefined) ? requestData.is_whitelist : false
            }, (err, address) => {
                if (err) {
                    return res.status(500).json(this.errorMsgFormat({
                        'message': err.message
                    }, 'withdrawAddress', 500));
                } else {
                    return res.status(200).json(this.successFormat({
                        'message': 'Address added successfully.',
                    }, address._id));
                }
            });
        }
    }

    getWithdrawAddress(req, res) {
        let pageNo = parseInt(req.query.page_no)
        let size = parseInt(req.query.size)
        let query = {}

        let payloads = {
            is_deleted: false,
            user: req.user.user
        };

        if (pageNo < 0 || pageNo === 0) {
            return res.status(404).json(this.errorMsgFormat({
                "message": "invalid page number, should start with 1"
            }))
        }

        query.skip = size * (pageNo - 1)
        query.limit = size

        // Find some documents
        withdrawAddress.countDocuments(payloads, (err, totalCount) => {
            if (err) {
                return res.status(404).json(this.errorMsgFormat({
                    "message": "No data found"
                }, 'address', 404))
            } else {
                withdrawAddress
                    .find(payloads)
                    .select('-_id  address')
                    .skip(query.skip)
                    .limit(query.limit)
                    .populate({
                        path: 'asset',
                        select: 'asset_name asset_code -_id'
                    })
                    .exec()
                    .then((data) => {
                        if (!data.length) {
                            return res.status(404).json(this.errorMsgFormat({
                                "message": "No data found"
                            }, 'withdrawAddress', 404));
                        } else {
                            var totalPages = Math.ceil(totalCount / size);
                            return res.status(200).json(this.successFormat({
                                "data": data,
                                "pages": totalPages,
                                "totalCount": totalCount
                            }, null, 'withdrawAddress', 200));
                        }
                    });
            }
        });
    }
}

module.exports = new Wallet;