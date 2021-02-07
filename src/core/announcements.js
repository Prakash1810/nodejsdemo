const Controller = require('./controller');
const { ancmtCategories, ancmtSubCategories, ancmtTitle, ancmtContent } = require('../db/announcements');
const _ = require('lodash');
const Utils = require('../helpers/utils');
const utils = new Utils();


class announcement extends Controller {

    async getAnnouncement(req, res) {
        try {
            let getSubCntDetails = await ancmtSubCategories.aggregate([
                {
                    $group: {
                        _id: '$category_id',
                        subCategory: { $push: { name: '$name', _id: "$_id", id: "$id" } }
                    },
                },
                {
                    $lookup: {
                        from: 'announcement-categories',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'category'
                    }
                },
                { $unwind: '$category' },
                {
                    $project: {
                        'subCategory': 1, 'category._id': 1, 'category.name': 1, 'category.id': 1
                    }
                }
            ]);
            // let getAllTitle = await ancmtTitle.aggregate([
            //     {
            //         $group: {
            //             _id: '$sub_category_id',
            //             titles: { $push: { title_name: '$name', _id: "$_id" } }
            //         },
            //     }
            // ]);

            // let getAllContent = await ancmtContent.aggregate([
            //     {
            //         $group: {
            //             _id: '$title_id',
            //             content: { $push: { content: '$content', title: '$content_title' } }
            //         },
            //     }, {
            //         $lookup: {
            //             from: 'announcement-titles',
            //             localField: '_id',
            //             foreignField: '_id',
            //             as: 'titleName'
            //         }
            //     },
            //     { $unwind: '$titleName' },
            //     { $project: { 'content': 1, 'titleName._id': 1, 'titleName.name': 1 } }
            // ]);
            // let titleDataFormate = await utils.titleResponseFromat(getAllTitle, getAllContent);
            let response = await utils.subCategoryFormat(getSubCntDetails, res);
            return res.status(200).json(this.successFormat({
                "data": { category: response }
            }));
        } catch (error) {
            return res.status(500).send(this.errorMsgFormat({
                "message": error.message
            }, 'asset', 500));
        }
    }

    async getAnnouncementDetails(req, res) {
        try {
            let categoryDetails = await ancmtCategories.findOne({ id: req.params.category_id, is_active: true });
            if (!categoryDetails) {
                return res.status(400).json(this.errorMsgFormat({
                    "message": "This announcement category not exits."
                }, 'Announcement'));
            }
            let subCategoryDetaile = await ancmtSubCategories.find({ category_id: categoryDetails._id, is_active: true }).select('name id');
            return res.status(200).json(this.successFormat({
                "data": subCategoryDetaile
            }));
        } catch (error) {
            return res.status(500).send(this.errorMsgFormat({
                "message": error.message
            }, 'asset', 500));
        }
    }

    async getAncmtSubCategoryDetails(req, res) {
        try {
            let subCategoryDetails = await ancmtSubCategories.findOne({ id: req.params.sub_category_id, is_active: true });
            if (!subCategoryDetails) {
                return res.status(400).json(this.errorMsgFormat({
                    "message": "This announcement sub-category not exits."
                }, 'Announcement'));
            }
            let titleDetails = await ancmtTitle.find({ sub_category_id: subCategoryDetails._id, is_active: true }).select('name id');
            let i = 0, responseData = [];
            while (i < titleDetails.length) {
                let contentDetails = await ancmtContent.find({ title_id: titleDetails[i]._id, is_active: true, approve: true, draft: false }).select('content_title id');
                responseData.push({
                    title_id: titleDetails[i]._id,
                    name: titleDetails[i].name,
                    id: titleDetails[i].id,
                    announcement_content: contentDetails
                });
                i++;
            }
            return res.status(200).json(this.successFormat({
                "data": responseData
            }));
        } catch (error) {
            return res.status(500).send(this.errorMsgFormat({
                "message": error.message
            }, 'asset', 500));
        }
    }

    async getAncmtTitleDetails(req, res) {
        try {
            let titleDetails = await ancmtTitle.findOne({ id: req.params.title_id, is_active: true });
            if (!titleDetails) {
                return res.status(400).json(this.errorMsgFormat({
                    "message": "This announcement title not exits."
                }, 'Announcement'));
            }
            let contentDetails = await ancmtContent.find({ title_id: titleDetails._id, is_active: true }).select('content_title draft approve id');
            return res.status(200).json(this.successFormat({
                "data": contentDetails
            }));
        } catch (error) {
            return res.status(500).send(this.errorMsgFormat({
                "message": error.message
            }, 'asset', 500));
        }
    }

    async getAncmtContentDetails(req, res) {
        try {
            let contentDetails = await ancmtContent.find({ id: req.params.content_id, is_active: true, approve: true, draft: false }).select('content id');
            if (!contentDetails) {
                return res.status(400).json(this.errorMsgFormat({
                    "message": "This announcement content not exits."
                }, 'Announcement'));
            }
            return res.status(200).json(this.successFormat({
                "data": contentDetails
            }));
        } catch (error) {
            return res.status(500).send(this.errorMsgFormat({
                "message": error.message
            }, 'asset', 500));
        }
    }

}
module.exports = new announcement;