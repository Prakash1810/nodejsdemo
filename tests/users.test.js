const request = require('supertest');
const app     = require('../app');

let route = '/api/user/login';

describe('POST /api/user login API', () => {
    it( 'Validate email and password is required' , () => {
        return request(app)
                .post(route)
                .set('Accept', 'application/json')
                .send({})
                .expect(400)
                .then((res) => {
                    expect(res.body).toMatchObject({
                        data: {
                            attributes: {
                                email: "\"email\" is required",
                                password: "\"password\" is required"
                            }
                        }
                    });
                });
    })

    it('Validate invalid credentials', () => {
        return request(app)
                .post(route)
                .set('Accept', 'application/json')
                .send({
                    email: "satz@mail.com",
                    password: "1234567S"
                })
                .expect(400)
                .then((res) => {
                    expect(res.body).toMatchObject({
                        data: {
                            attributes: {
                                message: "Invalid credentials"
                            }
                        }
                    });
                });
    });

    it('Validate login credentials', () => {
        return request(app)
                .post(route)
                .set('Accept', 'application/json')
                .send({
                    email: "satz3@mail.com",
                    password: "1234567S"
                })
                .expect(200)
                .then((res) => {
                    expect(res.body).toHaveProperty('id', 'attributes.token', 'attributes.created_at');
                });
    });
});