const express = require('express');
const router = express.Router();
const Controller = require('../core/controller');
const controller = new Controller;
const announcements = require('../core/announcements');
const { notification } = require('../validation/announcements');
const auth = require('../middlewares/authentication');
const info = require('../middlewares/info');

router.get('/', async (req, res) => {
    try {
        await announcements.getAnnouncement(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorFormat({
            "message:": err.message
        }, 500));
    }
});

router.get('/:category_id', async (req, res) => {
    try {
        await announcements.getAnnouncementDetails(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorFormat({
            "message:": err.message
        }, 500));
    }
});

router.get('/subcategory/:sub_category_id', async (req, res) => {
    try {
        await announcements.getAncmtSubCategoryDetails(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorFormat({
            "message:": err.message
        }, 500));
    }
});

router.get('/title/:title_id', async (req, res) => {
    try {
        await announcements.getAncmtTitleDetails(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorFormat({
            "message:": err.message
        }, 500));
    }
});

router.get('/content/:content_id', async (req, res) => {
    try {
        await announcements.getAncmtContentDetails(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorFormat({
            "message:": err.message
        }, 500));
    }
});

router.patch('/notification', auth, info, async (req, res) => {
    try {
        let { error } = await notification(req.body.data.attributes);
        if (error) {
            return res.status(400).send(controller.errorFormat(error, 400));
        }
        await announcements.notification(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorFormat({
            "message:": err.message
        }, 500));
    }
});

router.get('/notification/all', auth, info, async (req, res) => {
    try {
        await announcements.getNotificationList(req, res);
    } catch (err) {
        return res.status(500).send(controller.errorFormat({
            "message:": err.message
        }, 500));
    }
});

module.exports = router;