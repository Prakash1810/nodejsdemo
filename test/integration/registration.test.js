'use strict';

const { expect }    = require('chai');
const request       = require('supertest');
const config        = require('config');
const baseUrl       = config.get('site.url');
const route         = `/api/${config.get('site.version')}/user/registration`;
const UserTemp      = require('../../src/db/user-temp');

describe('Registration module intergration test case:- /api/v1/user/registraton', () => {
    it( 'Check empty parameter in registration end point' , async () => {
        await request(baseUrl)
        .post(route)
        .set('Accept', 'application/json')
        .send({})
        .expect(500)
        .then((res) => {
            expect(res.body.data.attributes.message).to.equal("Cannot read property 'attributes' of undefined");
        });
    });

    it('Validate email format', async () => {
        await request(baseUrl)
        .post(route)
        .set('Accept', 'application/json')
        .send({
            "lang": "en",
            "data": {
                    "attributes": {
                        "email": "naveen.mail.com",
                        "password": "Temp!123",
                        "password_confirmation": "Temp!123",
                        "referral_code" : "BELDEX_001"
                    }
                }
        })
        .expect(400)
        .then((res) => {
            expect(res.body.data.attributes.email).to.equal("Invalid email address.");
        });
    });

    it('Validate password match with regx', async () => {
        await request(baseUrl)
        .post(route)
        .set('Accept', 'application/json')
        .send({
            "lang": "en",
            "data": {
                    "attributes": {
                        "email": "naveen.mail.com",
                        "password": "1234567",
                        "password_confirmation": "Temp!123",
                        "referral_code" : "BELDEX_001"
                    }
                }
        })
        .expect(400)
        .then((res) => {
            expect(res.body.data.attributes.password).to.equal("password must be at least 8 characters with uppercase letters and numbers.");
        });
    });

    it('Validate password & confirm password match', async () => {
        await request(baseUrl)
        .post(route)
        .set('Accept', 'application/json')
        .send({
            "lang": "en",
            "data": {
                    "attributes": {
                        "email": "naveen.mail.com",
                        "password": "12345678",
                        "password_confirmation": "Temp!123",
                        "referral_code" : "BELDEX_001"
                    }
                }
        })
        .expect(400)
        .then((res) => {
            expect(res.body.data.attributes.password_confirmation).to.equal("\"password confirmation\" must match password");
        });
    });

    it('Successfully user registred', async () => {
        await request(baseUrl)
        .post(route)
        .set('Accept', 'application/json')
        .send({
            "lang": "en",
            "data": {
                    "attributes": {
                        "email": "naveen@gmail.com",
                        "password": "Temp!123",
                        "password_confirmation": "Temp!123",
                        "referral_code" : "BELDEX_001"
                    }
                }
        })
        .expect(200)
        .then((res) => {
            expect(res.body.data.id).to.equal(false);
            expect(res.body.data.type).to.equal("users");
            expect(res.body.data.attributes.message).to.equal("We have sent a confirmation email to your registered email address. satz@mail.com. Please follow the instructions in the email to continue.");
        });
    });

    it('should report error when email already exists', () => {
        
        UserTemp.findOne({ email: 'naveen@gmail.com' })
            .exec(function (err, result) {
                request(baseUrl)
                .post(route)
                .set('Accept', 'application/json')
                .expect(400)
                .then((res) => {
                    expect(res.body.data.type).to.equal("users");
                    expect(res.body.data.attributes.email).to.equal("This email address already exits.");
                });
        });

  });

});