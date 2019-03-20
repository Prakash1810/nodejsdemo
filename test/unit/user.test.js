'use strict';

const { expect }    = require('chai');
const moment        = require('moment');
const user          = require('../../src/core/user');
var isValidRequest  = { 
                        'email' : 'satz@mail.com',
                        'password'  : '1234567S',
                        'is_browser'    : true,
                        'is_mobile' : false,
                        'ip'    : '171.78.139.171',
                        'country'   : 'India'
                    };

describe('User login module unit test case :-', () => {
    it ('should check all the fields are required', () => {
        var errors    = {};
        let { error } = user.validate({});
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });
        expect(error.isJoi).to.equal(true);
        expect(error.name).to.equal('ValidationError');
        expect(errors.email).to.equal("\"email\" is required");
        expect(errors.password).to.equal("\"password\" is required");
        expect(errors.is_browser).to.equal("\"is_browser\" is required");
        expect(errors.is_mobile).to.equal("\"is_mobile\" is required");
        expect(errors.ip).to.equal("\"ip\" is required");
        expect(errors.country).to.equal("\"country\" is required");
    });

    it ('should be validate email format', () => {
        var errors    = {};
        isValidRequest.password = '123456';
        isValidRequest.email = 'satz@gmail';
        let { error } = user.validate(JSON.stringify(isValidRequest));
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });
        expect(error.isJoi).to.equal(true);
        expect(error.name).to.equal('ValidationError');
        expect(errors.email).to.equal("Invalid email address.");
    });

    it ('should check all the fields are entered', () => {
        isValidRequest.password     = '1234567S';
        isValidRequest.email        = 'satz@gmail.com';
        let { error } = user.validate(JSON.stringify(isValidRequest));
        expect(error).to.equal(null);
    });

    it ('should check whitelist ip requested encrypted hash', (done) => {
        let encryptHash = user.encryptHash({ "user_id": "5c879462ba7d780086704fdc", "device_id": "5c89f7e5868f251959a2a7c8", "verified": true });
        expect(encryptHash).to.be.a('string');
        done()
    });

    it ('should check token is invalid', (done) => {
        let time = moment().subtract(8199, 'seconds').format('YYYY-MM-DD HH:mm:ss');
        let checkExired = user.checkTimeExpired(moment(time).format('YYYY-MM-DD HH:mm:ss'));
        expect(checkExired).to.equal(false);
        done()   
    });
});

describe('User Settings module unit test case :-', () => {
    it ('Should be validate settings required fields', (done) => {
        var errors    = {};
        let { error } = user.settingsValidate({});
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });
        expect(error.isJoi).to.equal(true);
        expect(error.name).to.equal('ValidationError');
        expect(errors.id).to.equal("\"id\" is required");
        done();
    });

    it ('Should be validate settings valid input fields', (done) => {
        let { error } = user.settingsValidate({ "id": "dsad3224sd23saa321", "google_auth": true });
        expect(error).to.equal(null);
        done();
    });
    
    it ('Should be validate settings invalid input fields', (done) => {
        var errors    = {};
        let { error } = user.settingsValidate({ "test": "test" });
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });
        expect(error.isJoi).to.equal(true);
        expect(error.name).to.equal('ValidationError');
        expect(errors.id).to.equal("\"id\" is required");
        expect(errors.test).to.equal("\"test\" is not allowed");
        done();
    });

    it ('Should be validate settings google_auth must be boolean value ', (done) => {
        var errors    = {};
        let { error } = user.settingsValidate({ "id": "sd1233t3213213est", "google_auth": "test" });
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });
        expect(error.isJoi).to.equal(true);
        expect(error.name).to.equal('ValidationError');
        expect(errors.google_auth).to.equal("\"google_auth\" must be a boolean");
        done();
    });
});