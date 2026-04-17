import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('API Smoke (e2e)', () => {
  let app: INestApplication<App>;
  let accessToken = '';
  let orgId = '';
  let createdCategoryId = 0;
  let createdSubCategoryId = 0;
  let createdMenuId = 0;
  let createdOrganizationId = '';

  const uniqueTag = Date.now();
  const registrationEmail = `smoke+${uniqueTag}@mailinator.com`;
  const registrationPassword = 'Password@123';

  jest.setTimeout(120_000);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('should keep all core APIs working', async () => {
    // Root endpoint
    await request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect('Hello World!');

    // Public registration metadata endpoints
    await request(app.getHttpServer())
      .get('/api/register/business-types')
      .expect(200)
      .expect((response) => {
        expect(Array.isArray(response.body)).toBe(true);
      });

    const registrationCategoriesResponse = await request(app.getHttpServer())
      .get('/api/register/categories')
      .expect(200);
    expect(registrationCategoriesResponse.body).toEqual([
      { id: 1, name: 'Agriculture' },
      { id: 2, name: 'Ecommerce' },
      { id: 3, name: 'Services' },
    ]);

    const registrationSubCategoriesResponse = await request(app.getHttpServer())
      .get('/api/register/sub-categories?categoryId=1')
      .expect(200);
    expect(Array.isArray(registrationSubCategoriesResponse.body)).toBe(true);
    expect(registrationSubCategoriesResponse.body.length).toBeGreaterThan(0);
    const registrationSubCategoryId = registrationSubCategoriesResponse.body[0].id;

    // Register + login
    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        organizationName: `Smoke Org ${uniqueTag}`,
        email: registrationEmail,
        phone: '+91-9999999999',
        address: 'Bhubaneswar',
        businessTypeId: 1,
        categoryId: 1,
        subcategoryId: registrationSubCategoryId,
        password: registrationPassword,
      })
      .expect(201);

    expect(registerResponse.body).toHaveProperty('accessToken');
    expect(registerResponse.body).toHaveProperty('organizationId');
    accessToken = registerResponse.body.accessToken;
    orgId = registerResponse.body.organizationId;

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: registrationEmail,
        password: registrationPassword,
      })
      .expect(201);
    expect(loginResponse.body).toHaveProperty('accessToken');

    // Master read endpoints should work with or without token
    await request(app.getHttpServer()).get('/api/master/menus').expect(200);
    await request(app.getHttpServer())
      .get('/api/master/dashboard/subcategories')
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/master/dashboard/subcategories?categoryId=1')
      .expect(200);

    // Protected endpoints should reject missing token
    await request(app.getHttpServer())
      .post('/api/master/menus')
      .send({ menuName: 'Unauthorized menu' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/master/dashboard/subcategories')
      .send({ name: 'Unauthorized subcat', categoryId: 1 })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/master/category')
      .send({ name: 'Unauthorized category' })
      .expect(401);

    // Categories CRUD with auth
    const createCategoryResponse = await request(app.getHttpServer())
      .post('/api/master/category')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `Smoke Category ${uniqueTag}` })
      .expect(201);
    createdCategoryId = createCategoryResponse.body.id;

    await request(app.getHttpServer())
      .get('/api/master/category')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/master/category/${createdCategoryId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/master/category/${createdCategoryId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ description: 'Updated from e2e smoke' })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/master/category/${createdCategoryId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // Dashboard subcategories CRUD with auth
    const createSubCategoryResponse = await request(app.getHttpServer())
      .post('/api/master/dashboard/subcategories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Smoke SubCategory ${uniqueTag}`,
        categoryId: createdCategoryId,
      })
      .expect(201);
    createdSubCategoryId = createSubCategoryResponse.body.id;

    await request(app.getHttpServer())
      .get(`/api/master/dashboard/subcategories/${createdSubCategoryId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .put(`/api/master/dashboard/subcategories/${createdSubCategoryId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: `Smoke SubCategory Updated ${uniqueTag}` })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/master/dashboard/subcategories/${createdSubCategoryId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // Menus CRUD with auth
    const createMenuResponse = await request(app.getHttpServer())
      .post('/api/master/menus')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ menuName: `Smoke Menu ${uniqueTag}`, path: '/smoke', displayOrder: 1 })
      .expect(201);
    createdMenuId = createMenuResponse.body.id;

    await request(app.getHttpServer())
      .get(`/api/master/menus/${createdMenuId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .put(`/api/master/menus/${createdMenuId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ menuName: `Smoke Menu Updated ${uniqueTag}` })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/master/menus/${createdMenuId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // Organizations CRUD
    const createOrganizationResponse = await request(app.getHttpServer())
      .post('/api/organizations')
      .send({
        organizationName: `Independent Org ${uniqueTag}`,
        email: `org+${uniqueTag}@mailinator.com`,
        phone: '+91-8888888888',
        address: 'Cuttack',
      })
      .expect(201);
    createdOrganizationId = createOrganizationResponse.body.id;

    await request(app.getHttpServer()).get('/api/organizations').expect(200);
    await request(app.getHttpServer())
      .get(`/api/organizations/${createdOrganizationId}`)
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/organizations/${createdOrganizationId}`)
      .send({ address: 'Puri' })
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/api/organizations/${createdOrganizationId}`)
      .expect(200);

    // Scaffold modules should respond on mapped routes
    await request(app.getHttpServer())
      .post('/api/payments')
      .send({})
      .expect(201);
    await request(app.getHttpServer()).get('/api/payments').expect(200);
    await request(app.getHttpServer()).get('/api/payments/1').expect(200);
    await request(app.getHttpServer())
      .patch('/api/payments/1')
      .send({})
      .expect(200);
    await request(app.getHttpServer()).delete('/api/payments/1').expect(200);

    await request(app.getHttpServer()).post('/api/orders').send({}).expect(201);
    await request(app.getHttpServer()).get('/api/orders').expect(200);
    await request(app.getHttpServer()).get('/api/orders/1').expect(200);
    await request(app.getHttpServer()).patch('/api/orders/1').send({}).expect(200);
    await request(app.getHttpServer()).delete('/api/orders/1').expect(200);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });
});
