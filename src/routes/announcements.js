const express = require('express');
const router = express.Router();
const Controller = require('../core/controller');
const controller = new Controller;
const announcements = require('../core/announcements');

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

module.exports = router;