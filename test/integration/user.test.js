'use strict';

const { expect }    = require('chai');
const UserTemp      = require('../../src/db/user-temp');
const helpers       = require('../../src/helpers/helper.functions');
const request       = require('supertest');
const config        = require('config');
const baseUrl       = config.get('site.url');
const route         = `/api/${config.get('site.version')}/user/login`;

describe('User module intergration testing for POST and GET:- /api/user', () => {
    it( 'Validate email and password is required' , async () => {
        await request(baseUrl)
                .post(route)
                .set('Accept', 'application/json')
                .send({})
                .expect(500)
                .then((res) => {
                    expect(res.body.data.attributes.message).to.equal("Cannot read property 'attributes' of undefined");
                });
    });

    it ('User activation invalid token', async () => {
        let routeActivation = `/api/${config.get('site.version')}/user/activation/dsdsadsadsa`;
        await request(baseUrl)
        .get(routeActivation)
        .set('Accept', 'application/json')
        .expect(500)
        .then((res) => {
            expect(res.body.data.attributes.message).to.equal("Invalid token.");
        });
    });

    it ('User activation',  () => {
        UserTemp.findOne({ email: 'satz@mail.com' })
        .exec(function (err, result) {
                let encryptedHash = helpers.encrypt(
                    JSON.stringify({
                        'id': result.id,
                        'email': result.email
                    })
                );
            let routeActivation = `/api/${config.get('site.version')}/user/activation/${encryptedHash}`;
                request(baseUrl)
                .get(routeActivation)
                .set('Accept', 'application/json')
                .expect(200)
                .then((res) => {
                    expect(res.body.data.attributes.message).to.equal("Congratulation!, Your account has been activated.");
                });
            });
    });

    it('Validate invalid credentials', async () => {
        await request(baseUrl)
                .post(route)
                .set('Accept', 'application/json')
                .send(
                    {
                        "lang": "en",
                        "data": {
                               "attributes": {
                                   "email" : "naveen.s1147@mail.com",	
                                   "password": "Temp!123",
                                   "is_browser": true,
                                   "is_mobile": false,
                                   "os": "Linux",
                                   "os_byte": "x86_64",
                                   "browser": "Chrome",
                                   "browser_version": "71.0.3578.11",
                                   "ip": "35.185.71.25",
                                   "city": "Chennai",
                                   "region": "Tamil Nadu",
                                   "country": "India"
                               }
                           }
                       }
                )
                .expect(400)
                .then((res) => {
                    expect(res.body.data.attributes.message).to.equal("Invalid credentials");
                });
    });
});

describe('User module integration test case for Login', () => {
    it('Validate login credentials', async () => {
        await request(baseUrl)
        .post(route)
        .send(
            {
                "lang": "en",
                "data": {
                       "attributes": {
                           "email" : "naveen.s1147@gmail.com",	
                           "password": "Temp!123",
                           "is_browser": true,
                           "is_mobile": false,
                           "os": "Linux",
                           "os_byte": "x86_64",
                           "browser": "Chrome",
                           "browser_version": "71.0.3578.11",
                           "ip": "35.185.71.25",
                           "city": "Chennai",
                           "region": "Tamil Nadu",
                           "country": "India"
                       }
                   }
            }
        )
        .set('Accept', 'application/json')
        .expect(200)
        .then((res) => {
            //expect(res.body).to.have.property('data.attributes.token');
        });
    });

    // it ('Delete login credentials', async () => {
    //     await request(baseUrl)
    //     .delete(`/api/${config.get('site.version')}/user`)
    //     .send({
    //         email: "satz@mail.com"
    //     })
    //     .set('Accept', 'application/json')
    //     .then((res) => {
    //         console.log(res.body)
    //         expect(res.body).to.have.property('errors', false);
    //         expect(res.body.data.attributes.message).to.equal('account deleted successfully!');
    //     });
    // });
});