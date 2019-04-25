'use strict';

const { expect } = require('chai');
const UserTemp = require('../../src/db/user-temp');
const helpers = require('../../src/helpers/helper.functions');
const request = require('supertest');
const config = require('config');
const baseUrl = config.get('site.url');
const users = require('../../src/db/users');
const user = require('../../src/core/user');
const route = `/api/${config.get('site.version')}/user/login`;

describe('User module intergration testing for POST and GET:- /api/user', () => {
    let deleteWhiteList, accessToken, hash, loginData, forgetPassword, dummyResetPassword, patchSettings, resendEmail, disable,g2fsetting, g2fverfiy
    beforeEach(() => {

        accessToken = user.createToken({
            _id: "5cc18077df393c0e4e3a9b0b"

        }, '5cc046055346e30463cf6eaa');
        disable = helpers.requestDataFormat({"code": ""},"");

        patchSettings = helpers.requestDataFormat({
            "anti_spoofing_code": "mathan",
            "anti_spoofing": "true"
        },"");

        deleteWhiteList = helpers.requestDataFormat({
            "browser": "Chrome",
            "browser_version": "71.0.3578.11",
            "os": "Linux"});

        loginData = helpers.requestDataFormat({
            "email": "mathanms@gmail.com",
            "password": "1234567S",
            "is_browser": true,
            "is_mobile": false,
            "os": "Linux",
            "os_byte": "x86_64",
            "browser": "Chrome",
            "browser_version": "71.0.3578.11",
            "ip": "171.78.139.181",
            "city": "Chennai",
            "region": "Tamil Nadu",
            "country": "India"
        });
        
        forgetPassword = helpers.requestDataFormat({ "email": "mathanms@gmail.com",});

        dummyResetPassword = helpers.requestDataFormat({
            "password": "1234567S",
            "password_confirmation": "1234567S"
        },"5cbdc483aac2340334d5aeec")

        resendEmail = helpers.requestDataFormat({ "type": "registration"},"")
        
        g2fsetting = helpers.requestDataFormat({
        "google_auth": "true",
        "g2f_code": "674145",
        "password": "Temp!123"},"");
        
        g2fverfiy = helpers.requestDataFormat({
        "google_secrete_key": "dsa31dsae2132",
        "g2f_code": "1234567S"},"");

    });

    // CHECK USER ACTIVATION INVAILD USER

    it('should check user activation invalid user',(done)=>{
       
            let encryptedHash = helpers.encrypt(
                JSON.stringify({
                    "id": "mm@gmail.com",
                })
            );
                request(baseUrl)
                .get(`/api/${config.get('site.version')}/user/activation/${encryptedHash}`)
                .end((err,res)=>
                {
                    expect(res.status).to.deep.equal(400);
                    expect(res.body.data.attributes.message).to.be.equal('Invalid token. may be token as expired!');
                    done();
                });
    });
    
    // CHECK USER ACTIVATION INVALID TOKEN

    it('should check user activation invalid token',(done)=>{
       
        let encryptedHash = helpers.encrypt(
            JSON.stringify({
                "user_id": "mm@gmail.com",
            })
        );
            request(baseUrl)
            .get(`/api/${config.get('site.version')}/user/activation/${encryptedHash}`)
            .end((err,res)=>
            {
                expect(res.status).to.deep.equal(500);
                expect(res.body.data.attributes.message).to.be.equal('invalid token.');
                done();
            });
});

    // CHECK IF USER LOGIN

    it('should check if user login', (done) => {
        request(baseUrl)
            .post(`/api/${config.get('site.version')}/user/login`)
            .send(loginData)
            .end((err, res) => {
                expect(res.status).to.deep.equal(200);
                expect(res.body.data.attributes).to.have.any.keys('token');
                expect(res.body.data.attributes).to.have.any.keys('refreshToken');
                done();
            })
    })
    // CHECK IF USER LOGIN PASSWORD IS EMPTY

    it('should check if user login password is empty', (done) => {
        loginData.data.attributes.password = '';
        request(baseUrl)
            .post(`/api/${config.get('site.version')}/user/login`)
            .send(loginData)
            .end((err, res) => {

                expect(res.status).to.deep.equal(400);
                expect(res.body.data.attributes.password).to.be.equal('"password" is not allowed to be empty');
                done();

            })
    });
    // CHECK IF USER LOGIN WRONG PASSWORD 

    it('should check if user login wrong password', (done) => {
        loginData.data.attributes.password = '12345';
        request(baseUrl)
            .post(`/api/${config.get('site.version')}/user/login`)
            .send(loginData)
            .end((err, res) => {

                expect(res.status).to.deep.equal(400);
                expect(res.body.data.attributes.message).to.be.equal('Invalid credentials');
                done();

            })
    });
    //CHECK IF USER LOGIN WITHOUT DATA IN DB

    it('should check if user login without data in db', (done) => {
        loginData.data.attributes.email = "mm@gmail.com"
        request(baseUrl)
            .post(`/api/${config.get('site.version')}/user/login`)
            .send(loginData)
            .end((err, res) => {
                expect(res.status).to.deep.equal(400);
                expect(res.body.data.attributes.message).to.be.equal('Invalid credentials');
                done();
            })
    });



    //CHECK USER FORGET PASSWORD

     it('should check if user forget password',(done)=>
     {

        request(baseUrl)
        .post(`/api/${config.get('site.version')}/user/forget-password`)
        .send(forgetPassword)
        .end((err,res)=>
        {

            expect(res.status).to.deep.equal(200);
            expect(res.body.data.attributes.message).to.be.equal('We have sent a reset email to your email address. Please follow the instructions in the email to continue.');
            expect(res.body.data.attributes).to.have.any.keys('hash')
            done();
        })
     });

    //CHECK USER FORGET PASSWORD WITH VALDIATION ERROR 

    it('should check if user forget password with valdiation error', (done) => {
        forgetPassword.data.attributes.email = 'mmm'
        request(baseUrl)
            .post(`/api/${config.get('site.version')}/user/forget-password`)
            .send(forgetPassword)
            .end((err, res) => {

                expect(res.status).to.deep.equal(400);
                done();
            })
    });

    //CHECK USER FORGET PASSWORD WITHOUT DATA IN DB

    it('should check if user forget password without data in db ', (done) => {
        forgetPassword.data.attributes.email = 'mmm@gmail.com'
        request(baseUrl)
            .post(`/api/${config.get('site.version')}/user/forget-password`)
            .send(forgetPassword)
            .end((err, res) => {

                expect(res.status).to.deep.equal(400);
                expect(res.body.data.attributes.message).to.be.equal('Invalid email address.')
                done();

            })
    });

    //CHECK USER RESET PASSWORD WITH HASH

    it('should check if user reset password with hash', (done) => {
        let encryptedHash = helpers.encrypt(
            JSON.stringify({

                'email': loginData.data.attributes.email
            })
        );
        request(baseUrl)
            .get(`/api/${config.get('site.version')}/user/reset-password/${encryptedHash}`)
            .end((err, res) => {
                expect(res.status).to.deep.equal(200);
                done();
            });

    })

    //CHECK USER RESET PASSWORD INCORRECT HASH

    it('should check if user reset password incorrect hash', (done) => {
        let encryptedHash = helpers.encrypt(
            JSON.stringify({

                'id': loginData.data.attributes.email
            })
        );
        request(baseUrl)
            .get(`/api/${config.get('site.version')}/user/reset-password/${encryptedHash}`)
            .end((err, res) => {
                expect(res.status).to.deep.equal(404);
                expect(res.body.data.attributes.message).to.be.equal('invalid token or token is Expired.');
                done();
            });

    })


    //CHECK USER RESET PASSWORD HASH TIME EXPIRY

    it('should check if user reset password time expiry', (done) => {
        let dummyHash = '162860e9f96e9493e6aaaa1102c8352b8b783dd513164fbb7b9b7c165fc41b08a5ac92483ff8ab7a3cc50f247a5f9b4835b61c80e552e657111d38c2bad421e4'
       
        request(baseUrl)
            .get(`/api/${config.get('site.version')}/user/reset-password/${dummyHash}`)
            .end((err, res) => {
                expect(res.status).to.deep.equal(404);
                expect(res.body.data.attributes.message).to.be.equal('invalid token or token is expired.');
                done();
            });

    })

    //CHECK USER RESET PASSWORD DATA NOT FOUND IN DB

    it('should check if user reset password data not found in db', (done) => {
        let encryptedHash = helpers.encrypt(
            JSON.stringify({

                'email': "mm@gmail.com"
            })
        );
       
        request(baseUrl)
            .get(`/api/${config.get('site.version')}/user/reset-password/${encryptedHash}`)
            .end((err, res) => {
                expect(res.status).to.deep.equal(400);
                expect(res.body.data.attributes.message).to.be.equal('Invalid token. may be token as expired!');
                done();
            });

    })

    //CHECK USER REST PASSWORD WITH ATTRIBUTES

    it('should check if user reset password with attributes', (done) => {

        request(baseUrl)
            .post(`/api/${config.get('site.version')}/user/get-user-id`)
            .set('authorization', accessToken)
            .end((err, res) => {
                
              dummyResetPassword.data.id = res.body.data.user;
                request(baseUrl)
                    .patch(`/api/${config.get('site.version')}/user/reset-password/`)
                    .send(dummyResetPassword)
                    .end((error, result) => {
                        expect(result.status).to.deep.equal(202);
                        expect(result.body.data.attributes.message).to.be.equal('Your password updated successfully.');
                        done();
                    })
            });

    })

    //CHECK IF USER RESET PASSWORD INVALID DATA IN DB

    it('should check if user reset password invaild data', (done) => {
        request(baseUrl)
            .patch(`/api/${config.get('site.version')}/user/reset-password/`)
            .send(dummyResetPassword)
            .end((err, res) => {
                expect(res.status).to.deep.equal(404);
                expect(res.body.data.attributes.message).to.be.equal('Invalid user.');
                done();
            });

    })

    //CHECK IF USER RESET PASSWORD VALIDATION ERROR

    it('should check if user reset password validation error', (done) => {
        dummyResetPassword.data.attributes.password = "1234"
        dummyResetPassword.data.attributes.password_confirmation = "1234";
        request(baseUrl)
            .patch(`/api/${config.get('site.version')}/user/reset-password/`)
            .send(dummyResetPassword)
            .end((err, res) => {
                expect(res.status).to.deep.equal(400);
                expect(res.body.data.attributes.password).to.be.equal('password must be at least 8 characters with uppercase letters and numbers.');
                done();
            });

    })
    //CHECK IF USER RESET PASSWORD DOES NOT MATCH PASSWORD

    it('should check if user reset password does not match password', (done) => {
        dummyResetPassword.data.attributes.password = "1234678S"
        dummyResetPassword.data.attributes.password_confirmation = "123456789";
        request(baseUrl)
            .patch(`/api/${config.get('site.version')}/user/reset-password/`)
            .send(dummyResetPassword)
            .end((err, res) => {
                expect(res.status).to.deep.equal(400);
                expect(res.body.data.attributes.password_confirmation).to.be.equal('"password confirmation" must match password');
                done();
            });

    })

    //CHECK IF USER GET ID 
    it('should check if user get id', (done) => {

        request(baseUrl)
            .post(`/api/${config.get('site.version')}/user/get-user-id`)
            .set('authorization', accessToken)
            .end((err, res) => {
                expect(res.status).to.deep.equal(200)
                expect(res.body.message).to.be.equal('Authorization successfully.')
                done();
            });
    });

    //CHECK IF USER GET ID INVALID AUTH
    it('should check if user get id invalid auth', (done) => {

        request(baseUrl)
            .post(`/api/${config.get('site.version')}/user/get-user-id`)
            .set('authorization', '')
            .end((err, res) => {
                expect(res.status).to.deep.equal(401)
                expect(res.body.data.attributes.message).to.be.equal('Invalid authentication')
                done();
            });
    });

    //CHECK IF USER GET ID TOKEN EXPIRY

    it('should check if user get id token expiry', (done) => {
        request(baseUrl)
            .post(`/api/${config.get('site.version')}/user/get-user-id`)
            .set('authorization', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiNWNiZGM0ODNhYWMyMzQwMzM0ZDVhYWVjIiwibG9naW5faWQiOiI1Y2JlZWI2ZmY5MzE2MzAwNjVmYTM2YWYiLCJ1c2VyX2lkIjo5LCJpYXQiOjE1NTYwMTU5ODQsImV4cCI6MTU1NjA1OTE4NCwiYXVkIjoid3d3LnRlc3QuY29tIiwiaXNzIjoidGVzdCIsInN1YiI6IkF1dGhlbnRpY2F0aW9uIn0.tEgaQDAQw2J0ba7phuabHUc1jVPsVwvPrRh3XgH6kxF')
            .end((err, res) => {
                
                expect(res.status).to.deep.equal(401)
                expect(res.body.data.attributes.message).to.be.equal('Invalid Authentication')
                done();
            });
    });

    
    //CHECK IF USER UPDATE PATCH LIST 

     it('should check if user update patch list',(done)=>
     {

         loginData.data.attributes.ip="172.168.1.10"
         request(baseUrl)
         .post(`/api/${config.get('site.version')}/user/login`)
         .send(loginData)
         .end((err,res)=>
         {
             let hash = res.body.data.attributes.hash
            request(baseUrl)
            .patch(`/api/${config.get('site.version')}/user/whitelist-ip/${hash}`)
            .end((err,res)=>
            {
                 expect(res.status).to.deep.equal(202)
                done();
            });
         })
     });

    // CHECK IF USER UPDATE PATCH LIST INVALID HASH

    it('should check if user update patch list invalid hash', (done) => {
        let incorrectHash = user.encryptHash(forgetPassword);
        request(baseUrl)
            .patch(`/api/${config.get('site.version')}/user/whitelist-ip/${incorrectHash}`)
            .end((err, res) => {
                expect(res.status).to.deep.equal(404)
                expect(res.body.data.attributes.message).to.be.equal('invalid token or token is Expired.')
                done();
            });

    });

    // CHECK IF USER UPDATE PATCH LIST HASH TIME EXPIRY

    it('should check if user update patch list hash time expiry', (done) => {
        let incorrectHash = '0eecf300cb27e3f6abb389ef084d75e9b4fbec84df97791b17870889e7448cb81f6076784db41f4d59bab7bcd503260e6232373371676cb44d78b68c22af2aaf75eaae2ee9e81d1a32dc6b1ee6cefddafb27f8e5fb40bd96c2ec7b71161b913bba03f90eceb74d383c209bcbca3ebaa4b3afe47cc8a28f7454c4910697b838e4'

        request(baseUrl)
            .patch(`/api/${config.get('site.version')}/user/whitelist-ip/${incorrectHash}`)
            .end((err, res) => {
                expect(res.status).to.deep.equal(404)
                expect(res.body.data.attributes.message).to.be.equal('invalid token or token is expired.')
                done();
            });

    });

    // CHECK IF USER UPDATE PATCH LIST DATA NOT FOUND IN DB

    it('should check if user update patch list data not found in db', (done) => {
        let incorrectHash = user.encryptHash({ user_id: "mm@gmail.com" })
        request(baseUrl)
            .patch(`/api/${config.get('site.version')}/user/whitelist-ip/${incorrectHash}`)
            .end((err, res) => {
                expect(res.status).to.deep.equal(400)
                expect(res.body.data.attributes.message).to.be.equal('Invalid token. may be token as expired!')
                done();
            });

    });

    //CHECK IF USER UPDATE PATCH SETTING 

    it('should check if user update patch setting', (done) => {

        request(baseUrl)
            .post(`/api/${config.get('site.version')}/user/get-user-id`)
            .set('authorization', accessToken)
            .end((err, res) => {
                patchSettings.data.id = res.body.data.user;
                request(baseUrl)
                    .patch(`/api/${config.get('site.version')}/user/settings`)
                    .send(patchSettings)
                    .set('authorization', accessToken)
                    .end((error, result) => {
                        expect(result.status).to.deep.equal(202);
                        expect(result.body.data.attributes.message).to.be.equal('Your request is updated successfully.');
                        done();
                    })



            });
    });

    //CHECK IF USER UPDATE PATCH SETTING DATA NOT FOUND

    it('should check if user update patch setting data not found', (done) => {

        patchSettings.data.id = "5cbdc483aac2340334d5##ec";
        request(baseUrl)
            .patch(`/api/${config.get('site.version')}/user/settings`)
            .send(patchSettings)
            .set('authorization', accessToken)
            .end((error, result) => {
                expect(result.status).to.deep.equal(404);
                expect(result.body.data.attributes.message).to.be.equal('Cast to ObjectId failed for value "5cbdc483aac2340334d5##ec" at path "_id" for model "Users"');
                done();
            });
    });

    //CHECK IF USER UPDATE PATCH SETTING WITHOUT ID

    it('should check if user update patch setting without id', (done) => {

        delete patchSettings.data.id
        request(baseUrl)
            .patch(`/api/${config.get('site.version')}/user/settings`)
            .send(patchSettings)
            .set('authorization', accessToken)
            .end((error, result) => {
                expect(result.status).to.deep.equal(400);
                expect(result.body.data.attributes.message).to.be.equal('Invalid request.');
                done();
            });
    });

    //CHECK IF USER UPDATE PATCH SETTING WITH ERROR

    it('should check if user update patch setting with error', (done) => {

        request(baseUrl)
            .patch(`/api/${config.get('site.version')}/user/settings`)
            .send(patchSettings)
            .set('authorization', accessToken)
            .end((error, result) => {
                expect(result.status).to.deep.equal(404);
                expect(result.body.data.attributes.message).to.be.equal('Cast to ObjectId failed for value "" at path "_id" for model "Users"');
                done();
            });
    });


    // CHECK IF USER DISABLE ACCOUNT WITHOUT ACTIVE

    it('should check if user disable account without active', (done) => {

        request(baseUrl)
            .post(`/api/${config.get('site.version')}/user/get-user-id`)
            .set('authorization', accessToken)
            .end((err, res) => {
                let encryptedHash = helpers.encrypt(
                    JSON.stringify({
                        "user_id": res.body.data.user,
                    })
                );
                disable.data.id = res.body.data.user;
                disable.data.attributes.code = encryptedHash
                request(baseUrl)
                    .patch(`/api/${config.get('site.version')}/user/disable`)
                    .send(disable)
                    .end((error, result) => {
                        expect(result.status).to.deep.equal(400);
                        expect(result.body.data.attributes.message).to.be.equal('Invalid request..');
                        done();
                    });

            });

    });

    //CHECK IF USER G2F SETTING WITHOUT PASSWORD
    
    it('should check if user g2f setting without password', (done) => {

        request(baseUrl)
            .post(`/api/${config.get('site.version')}/user/get-user-id`)
            .set('authorization', accessToken)
            .end((err, res) => {
                g2fsetting.data.id = res.body.data.user;
                delete g2fsetting.data.attributes.password;
                request(baseUrl)
                    .patch(`/api/${config.get('site.version')}/user/g2f-settings`)
                    .send(g2fsetting)
                    .set('authorization', accessToken)
                    .end((error, result) => {
                        expect(result.status).to.deep.equal(400);
                        expect(result.body.data.attributes.message).to.be.equal('Invalid request');
                        done();
                    });

            });

    });

    //CHECK IF USER G2F SETTING WITHOUT G2FCODE
    
    it('should check if user g2f setting without gsfcode', (done) => {

        request(baseUrl)
            .post(`/api/${config.get('site.version')}/user/get-user-id`)
            .set('authorization', accessToken)
            .end((err, res) => {
                g2fsetting.data.id = res.body.data.user;
                delete g2fsetting.data.attributes.g2f_code
                request(baseUrl)
                    .patch(`/api/${config.get('site.version')}/user/g2f-settings`)
                    .send(g2fsetting)
                    .set('authorization', accessToken)
                    .end((error, result) => {
                        expect(result.status).to.deep.equal(400);
                        expect(result.body.data.attributes.message).to.be.equal('Invalid request');
                        done();
                    });

            });

    });

    //CHECK IF USER G2F SETTING INVALID USER
    
    it('should check if user g2f setting invaild user', (done) => {
        g2fsetting.data.id ='5cbdc483aac2340334d5abec';
        request(baseUrl)
        .patch(`/api/${config.get('site.version')}/user/g2f-settings`)
        .send(g2fsetting)
        .set('authorization', accessToken)
        .end((error, result) => {
            expect(result.status).to.deep.equal(400);
            expect(result.body.data.attributes.message).to.be.equal('Invalid user');
            done();
        });
               
    });

     //CHECK IF USER G2F SETTING INCORRECT PASSWORD
    
     it('should check if user g2f setting incorrect password', (done) => {
        request(baseUrl)
            .post(`/api/${config.get('site.version')}/user/get-user-id`)
            .set('authorization', accessToken)
            .end((err, res) => {
                g2fsetting.data.id = res.body.data.user;
                //g2fsetting.data.attributes.password="123"
                request(baseUrl)
                .patch(`/api/${config.get('site.version')}/user/g2f-settings`)
                .send(g2fsetting)
                .set('authorization', accessToken)
                .end((error, result) => {
                    expect(result.status).to.deep.equal(400);
                    expect(result.body.data.attributes.message).to.be.equal('Incorrect password');
                    done();
                });
            });
        });

    // CHECK IF USER G2F VERIFY WITHOUT G2FCODE 

    it('should check if user g2f verify without g2fcode', (done) => {
        request(baseUrl)
            .post(`/api/${config.get('site.version')}/user/get-user-id`)
            .set('authorization', accessToken)
            .end((err, res) => {
                g2fverfiy.data.id = res.body.data.user;
                delete g2fverfiy.data.attributes.g2f_code
                request(baseUrl)
                .post(`/api/${config.get('site.version')}/user/g2f-verify`)
                .send(g2fverfiy)
                .set('authorization', accessToken)
                .end((error, result) => {
                    expect(result.status).to.deep.equal(400);
                    expect(result.body.data.attributes.message).to.be.equal('Invalid request');
                    done();
                });
            });
        });

 // CHECK IF USER G2F VERIFY INVALID USER 

    it('should check if user g2f verify invalid user', (done) => {
        request(baseUrl)
            .post(`/api/${config.get('site.version')}/user/get-user-id`)
            .set('authorization', accessToken)
            .end((err, res) => {
                g2fverfiy.data.id = "5cbdc483aac2340334d5abec";
                delete g2fverfiy.data.attributes.google_secrete_key
                request(baseUrl)
                .post(`/api/${config.get('site.version')}/user/g2f-verify`)
                .send(g2fverfiy)
                .set('authorization', accessToken)
                .end((error, result) => {
                    expect(result.status).to.deep.equal(400);
                    expect(result.body.data.attributes.message).to.be.equal('Invalid data');
                    done();
                });
            });
        });

    //CHECK IF USER LOGOUT HISTORY

    it('should check if user logout history', (done) => {

        request(baseUrl)
            .post(`/api/${config.get('site.version')}/user/logout`)
            .set('authorization', accessToken)
            .end((err, res) => {
                expect(res.status).to.deep.equal(200);
                done();
            })
    })

    //CHECK IF USER LOGOUT HISTORY WITH ERROR 

    it('should check if user logout history with error', (done) => {
        request(baseUrl)
            .post(`/api/${config.get('site.version')}/user/logout`)
            .set('authorization', accessToken)
            .end((err, res) => {
                expect(res.status).to.deep.equal(404);
                done();
            })
    })

    //CHECK IF USER LOGOUT HISTORY WITHOUT TOKEN

    it('should check if user logout history without token', (done) => {
        request(baseUrl)
            .post(`/api/${config.get('site.version')}/user/logout`)
            .set('authorization', '')
            .end((err, res) => {
                expect(res.status).to.deep.equal(401);
                expect(res.body.data.attributes.message).to.be.equal('Invalid authentication')
                done();
            })
    });

    //CHECK IF REFRESH TOKEN

    it('should check refresh token', () => {
        request(baseUrl)
            .post(`/api/${config.get('site.version')}/user/token`)
            .send()
            .set('authorization', accessToken)
            .end((err, res) => {  
                expect(res.status).to.deep.equal(200);
                expect(res.body.data.attributes).to.have.any.keys('refreshToken');

            })
    });

    //CHECK IF REFRESH TOKEN WITHOUT

    it('should check refresh token without token', () => {

        request(baseUrl)
            .post(`/api/${config.get('site.version')}/user/token`)
            .send()
            .set('authorization', '')
            .end((err, res) => {
                expect(res.status).to.deep.equal(401);

            })
    });

    //CHECK IF USER GET DEVICE HISTORY

    it('should check if user get device history', (done) => {

        request(baseUrl)
            .get(`/api/${config.get('site.version')}/user/device-history`)
            .set('authorization', accessToken)
            .end((err, res) => {
                expect(res.status).to.deep.equal(200)
                done();
            });
    });


    //CHECK IF DELETE WHITELIST

    it('Should check delete whitelist', (done) => {
        request(baseUrl)
            .delete(`/api/${config.get('site.version')}/user/whitelist`)
            .send(deleteWhiteList)
            .set('authorization', accessToken)
            .end((err, res) => {
                expect(res.status).to.deep.equal(200)
                done();
            })
    });

    //CHECK IF DELETE WHITELIST WITH ERROR
    
    it('Should check delete whitelist with error', (done) => {
        request(baseUrl)
            .delete(`/api/${config.get('site.version')}/user/whitelist`)
            .send(deleteWhiteList)
            .set('authorization', accessToken)
            .end((err, res) => {
                expect(res.status).to.deep.equal(404);
                done();
            });
    });

    //CHECK IF DELETE WHITELIST WITHOUT TOKEN

    it('Should check delete whitelist without token', (done) => {
        request(baseUrl)
            .delete(`/api/${config.get('site.version')}/user/whitelist`)
            .send(deleteWhiteList)
            .set('authorization', '')
            .end((err, res) => {
                expect(res.status).to.deep.equal(401);
                expect(res.body.data.attributes.message).to.be.equal("Invalid authentication");
                done();
            })
    });

    // CHECK IF USER GET LOGIN HISTORY 

    it('should check if user get login history', (done) => {

        request(baseUrl)
            .get(`/api/${config.get('site.version')}/user/login-history`)
            .set('authorization', accessToken)
            .end((err, res) => {
                expect(res.status).to.deep.equal(200)
                done();
            });
    });

    
    
    //CHECK IF USER DISABLE ACCOUNT

    it('should check if user disable account', (done) => {

        request(baseUrl)
            .post(`/api/${config.get('site.version')}/user/get-user-id`)
            .set('authorization', accessToken)
            .end((err, res) => {
                let encryptedHash = helpers.encrypt(
                    JSON.stringify({
                        "user_id": res.body.data.user,
                        'is_active': false
                    })
                );
                disable.data.id = res.body.data.user;
                disable.data.attributes.code = encryptedHash
                request(baseUrl)
                    .patch(`/api/${config.get('site.version')}/user/disable`)
                    .send(disable)
                    .end((error, result) => {
                                expect(result.status).to.deep.equal(202);
                        expect(result.body.data.attributes.message).to.be.equal('Your request is updated successfully.');
                        done();
                    });

            });

    });

    //USER DOES NOT ACTIVATE AT LOGIN

    it('should check if user login without activation',(done)=>
    {
        request(baseUrl)
        .post(`/api/${config.get('site.version')}/user/login`)
        .send(loginData)
        .end((err,res)=>
        {

            expect(res.status).to.deep.equal(400);
            expect(res.body.data.attributes.message).to.be.equal('Your account has been disabled.');
            done();
        })
    })

    //CHECK USER REMOVE 

     it('should check if user remove',()=>
     {
         request(baseUrl)
         .delete(`/api/${config.get('site.version')}/user/`)
         .send(loginData)
         .end((err,res)=>
         {
             expect(res.status).to.deep.equal(200);
             expect(res.body.data.attributes.message).to.be.equal('account deleted successfully!');
         })
     })

    //CHECK USER REMOVE WITHOUT DATA IN DB

    it('should check if user remove without data in DB', () => {
        loginData.data.attributes.email = "mm@gmail.com"
        request(baseUrl)
            .delete(`/api/${config.get('site.version')}/user/`)
            .send(loginData)
            .end((err, res) => {
                expect(res.status).to.deep.equal(400);
                expect(res.body.data.attributes.message).to.be.equal('Invalid email address');
            })
    });

});

