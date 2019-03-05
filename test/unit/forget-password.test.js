'use strict';

const { expect }    = require('chai');
const password      = require('../../src/core/password');
var isValidRequest  = { 'email' : '' };
var errors          = {};

describe('Forgot password unit test :-', () => {
    it ('should check email is required', (done) => {
        let { error } = password.validate(JSON.stringify({}));
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });
        expect(error.isJoi).to.equal(true);
        expect(errors.email).to.equal("\"email\" is required");
        done()
    });

    it ('should validate email format', (done) => {
        isValidRequest.email = 'satzkk@mail';
        let { error } = password.validate(JSON.stringify(isValidRequest));
        error.details.forEach((detail) => {
            errors[detail.path] = detail.message;
        });
        expect(error.isJoi).to.equal(true);
        expect(errors.email).to.equal('Invalid email address.');
        done()
    });

    it ('should check no validation errors are there', (done) => {
        isValidRequest.email = 'satzkk@gmail.com';
        let { error } = password.validate(JSON.stringify(isValidRequest));
        expect(error).to.equal(null);
        done()
    });

    it ('should return encrypt hash', (done) => {
        let email = 'satzkk@mail.com';
        let hash  = password.encryptHash(email);
        expect(hash).to.not.equal(null);
        done();
    })
});                