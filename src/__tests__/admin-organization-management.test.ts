/**
 * Admin İşletme Yönetimi - Kapsamlı Test Dosyası
 *
 * Bölüm 5: POST /admin/organizations/quick-create, PUT/DELETE /admin/organizations/{id}
 * Bölüm 6: GET/POST/PUT/DELETE /admin/organizations/{id}/service-categories
 * Bölüm 7: GET/POST/PUT/DELETE /admin/organizations/{id}/services
 * Bölüm 8: GET/POST/PUT/DELETE /admin/organizations/{id}/resources
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';

// ============================================
// Test Configuration
// ============================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.example.com';
const ADMIN_EMAIL = 'admin@tourops.com';
const OTP_CODE = '135790';

let adminToken: string;
let createdOrgId: number;
let createdServiceCategoryId: number;
let createdServiceId: number;
let createdResourceId: number;
let createdFloorResourceId: number;

// Helper: API isteği gönder
async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<{ status: number; data: T; raw: unknown }> {
  const url = `${API_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}lang=tr`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const json = await response.json().catch(() => ({
    message: 'JSON parse error',
    statusCode: response.status,
  }));

  return {
    status: response.status,
    data: json.data !== undefined ? json.data : json,
    raw: json,
  };
}

// ============================================
// Admin Auth - OTP ile giriş
// ============================================

describe('Admin Auth - Giriş', () => {
  it('Admin login OTP göndermeli', async () => {
    const res = await apiRequest('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email: ADMIN_EMAIL }),
    });

    // OTP gönderildi (200 veya 201)
    expect([200, 201]).toContain(res.status);
  });

  it('Admin OTP doğrulama (135790) ile token almalı', async () => {
    const res = await apiRequest<{ accessToken: string; user: unknown }>('/auth/admin/login/verify', {
      method: 'POST',
      body: JSON.stringify({ email: ADMIN_EMAIL, otp: OTP_CODE }),
    });

    expect([200, 201]).toContain(res.status);
    expect(res.data.accessToken).toBeDefined();
    expect(typeof res.data.accessToken).toBe('string');
    expect(res.data.accessToken.length).toBeGreaterThan(10);

    adminToken = res.data.accessToken;
  });

  it('Yanlış OTP ile giriş başarısız olmalı', async () => {
    const res = await apiRequest('/auth/admin/login/verify', {
      method: 'POST',
      body: JSON.stringify({ email: ADMIN_EMAIL, otp: '000000' }),
    });

    expect([400, 401, 403]).toContain(res.status);
  });
});

// ============================================
// Bölüm 5: Admin - İşletme Yönetimi
// ============================================

describe('Bölüm 5: Admin - İşletme Yönetimi', () => {

  // -------- Quick Create --------
  describe('POST /admin/organizations/quick-create', () => {

    it('Token olmadan 401 dönmeli', async () => {
      const res = await apiRequest('/admin/organizations/quick-create', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
      });

      expect(res.status).toBe(401);
    });

    it('Eksik zorunlu alanlarla 400 dönmeli', async () => {
      const res = await apiRequest('/admin/organizations/quick-create', {
        method: 'POST',
        body: JSON.stringify({ name: 'Sadece İsim' }),
      }, adminToken);

      expect([400, 422]).toContain(res.status);
    });

    it('Hızlı işletme oluşturmalı (oturma düzeni + menü dahil)', async () => {
      const payload = {
        // İşletme bilgileri
        name: 'Test Restoran Admin',
        categoryId: 1,
        address: 'Test Mahallesi, Test Sokak No:1',
        countryId: 1,
        cityId: 1,
        districtId: 1,
        phoneCountryCode: 90,
        phone: '5551234567',
        email: `testrestoran_${Date.now()}@test.com`,
        legalName: 'Test Restoran Ltd. Şti.',
        taxNumber: '1234567890',
        taxOffice: 'Test Vergi Dairesi',
        description: 'Admin tarafından hızlı oluşturulan test işletme',
        agencyCommissionRate: 10,
        // Yetkili kişi
        authorizedPerson: {
          firstName: 'Test',
          lastName: 'Yetkili',
          email: `yetkili_${Date.now()}@test.com`,
          phone: '5559876543',
          phoneCountryCode: '90',
        },
        // Oturma düzeni
        resources: [
          {
            name: 'Zemin Kat',
            resourceTypeId: 1, // floor
            capacity: 100,
            order: 1,
            children: [
              {
                name: 'Ana Salon',
                resourceTypeId: 2, // room
                capacity: 50,
                order: 1,
                children: [
                  { name: 'Masa 1', resourceTypeId: 3, capacity: 4, order: 1 },
                  { name: 'Masa 2', resourceTypeId: 3, capacity: 4, order: 2 },
                  { name: 'Masa 3', resourceTypeId: 3, capacity: 6, order: 3 },
                ],
              },
              {
                name: 'Teras',
                resourceTypeId: 2,
                capacity: 30,
                order: 2,
                children: [
                  { name: 'Masa T1', resourceTypeId: 3, capacity: 2, order: 1 },
                  { name: 'Masa T2', resourceTypeId: 3, capacity: 4, order: 2 },
                ],
              },
            ],
          },
        ],
        // Menü / Hizmet kategorileri
        serviceCategories: [
          {
            name: 'Ana Yemekler',
            description: 'Sıcak ana yemekler',
            displayOrder: 1,
            services: [
              { title: 'Izgara Köfte', basePrice: 250, priceType: 'fixed' as const, description: 'Kaşarlı köfte porsiyon' },
              { title: 'Adana Kebap', basePrice: 300, priceType: 'fixed' as const, description: 'Acılı Adana kebap' },
              { title: 'Kuzu Tandır', basePrice: 400, priceType: 'per_person' as const, description: 'Fırında kuzu tandır' },
            ],
          },
          {
            name: 'İçecekler',
            description: 'Soğuk ve sıcak içecekler',
            displayOrder: 2,
            services: [
              { title: 'Ayran', basePrice: 30, priceType: 'fixed' as const },
              { title: 'Çay', basePrice: 20, priceType: 'fixed' as const },
              { title: 'Türk Kahvesi', basePrice: 50, priceType: 'fixed' as const },
            ],
          },
          {
            name: 'Tatlılar',
            description: 'Taze tatlılar',
            displayOrder: 3,
            services: [
              { title: 'Künefe', basePrice: 180, priceType: 'fixed' as const },
              { title: 'Baklava', basePrice: 200, priceType: 'fixed' as const },
            ],
          },
        ],
      };

      const res = await apiRequest<{
        organization: { id: number; name: string; status: string };
        resources?: unknown[];
        serviceCategories?: unknown[];
        services?: unknown[];
      }>('/admin/organizations/quick-create', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, adminToken);

      expect([200, 201]).toContain(res.status);
      expect(res.data.organization).toBeDefined();
      expect(res.data.organization.id).toBeDefined();
      expect(typeof res.data.organization.id).toBe('number');
      expect(res.data.organization.name).toBe('Test Restoran Admin');

      createdOrgId = res.data.organization.id;
      console.log('Oluşturulan İşletme ID:', createdOrgId);
    });

    it('Sadece işletme bilgileriyle de oluşturabilmeli (oturma düzeni ve menü olmadan)', async () => {
      const payload = {
        name: 'Minimal Test Restoran',
        categoryId: 1,
        address: 'Minimal Adres',
        countryId: 1,
        cityId: 1,
        districtId: 1,
        phoneCountryCode: 90,
        phone: '5550001111',
        email: `minimal_${Date.now()}@test.com`,
        legalName: 'Minimal Ltd.',
        taxNumber: '0987654321',
        taxOffice: 'Minimal Vergi Dairesi',
      };

      const res = await apiRequest<{
        organization: { id: number; name: string };
      }>('/admin/organizations/quick-create', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, adminToken);

      expect([200, 201]).toContain(res.status);
      expect(res.data.organization).toBeDefined();
      expect(res.data.organization.name).toBe('Minimal Test Restoran');

      // Temizle
      const deleteRes = await apiRequest(`/organizations/${res.data.organization.id}`, {
        method: 'DELETE',
      }, adminToken);
      expect([200, 204]).toContain(deleteRes.status);
    });
  });

  // -------- Update Organization --------
  describe('PUT /admin/organizations/{id}', () => {

    it('Token olmadan 401 dönmeli', async () => {
      const res = await apiRequest(`/organizations/${createdOrgId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' }),
      });
      expect(res.status).toBe(401);
    });

    it('Var olmayan ID ile 404 dönmeli', async () => {
      const res = await apiRequest('/organizations/999999', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Ghost' }),
      }, adminToken);
      expect([404, 400]).toContain(res.status);
    });

    it('İşletme adını güncellemeli', async () => {
      const res = await apiRequest<{ id: number; name: string }>(`/organizations/${createdOrgId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: 'Güncellenmiş Restoran' }),
      }, adminToken);

      expect([200, 201]).toContain(res.status);
      expect(res.data.name).toBe('Güncellenmiş Restoran');
    });

    it('Birden fazla alanı aynı anda güncellemeli', async () => {
      const res = await apiRequest<{ id: number; name: string; description: string }>(`/organizations/${createdOrgId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Test Restoran Admin',
          description: 'Güncellenmiş açıklama',
          agencyCommissionRate: 15,
        }),
      }, adminToken);

      expect([200, 201]).toContain(res.status);
      expect(res.data.name).toBe('Test Restoran Admin');
    });
  });
});

// ============================================
// Bölüm 6: Admin - İşletme Hizmet Kategorileri Yönetimi
// ============================================

describe('Bölüm 6: Admin - İşletme Hizmet Kategorileri', () => {

  describe('GET /admin/organizations/{id}/service-categories', () => {

    it('Token olmadan 401 dönmeli', async () => {
      const res = await apiRequest(`/admin/organizations/${createdOrgId}/service-categories`);
      expect(res.status).toBe(401);
    });

    it('İşletmenin hizmet kategorilerini listelenmeli', async () => {
      const res = await apiRequest<unknown[]>(`/admin/organizations/${createdOrgId}/service-categories`, {
        method: 'GET',
      }, adminToken);

      expect([200]).toContain(res.status);
      expect(Array.isArray(res.data)).toBe(true);
    });

    it('Var olmayan işletme için 404 dönmeli', async () => {
      const res = await apiRequest('/admin/organizations/999999/service-categories', {
        method: 'GET',
      }, adminToken);
      expect([404, 400]).toContain(res.status);
    });
  });

  describe('POST /admin/organizations/{id}/service-categories', () => {

    it('Token olmadan 401 dönmeli', async () => {
      const res = await apiRequest(`/admin/organizations/${createdOrgId}/service-categories`, {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
      });
      expect(res.status).toBe(401);
    });

    it('Hizmet kategorisi oluşturmalı', async () => {
      const res = await apiRequest<{ id: number; name: string }>(`/admin/organizations/${createdOrgId}/service-categories`, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Kahvaltı Menüsü',
          description: 'Sabah kahvaltı çeşitleri',
          displayOrder: 10,
        }),
      }, adminToken);

      expect([200, 201]).toContain(res.status);
      expect(res.data.id).toBeDefined();
      expect(res.data.name).toBe('Kahvaltı Menüsü');

      createdServiceCategoryId = res.data.id;
      console.log('Oluşturulan Hizmet Kategori ID:', createdServiceCategoryId);
    });

    it('İsim olmadan 400 dönmeli', async () => {
      const res = await apiRequest(`/admin/organizations/${createdOrgId}/service-categories`, {
        method: 'POST',
        body: JSON.stringify({ description: 'İsimsiz kategori' }),
      }, adminToken);

      expect([400, 422]).toContain(res.status);
    });

    it('Alt kategori oluşturmalı (parentId ile)', async () => {
      const res = await apiRequest<{ id: number; name: string }>(`/admin/organizations/${createdOrgId}/service-categories`, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Serpme Kahvaltı',
          description: 'Serpme kahvaltı çeşitleri',
          displayOrder: 1,
          parentId: createdServiceCategoryId,
        }),
      }, adminToken);

      expect([200, 201]).toContain(res.status);
      expect(res.data.id).toBeDefined();
    });
  });

  describe('PUT /admin/organizations/{id}/service-categories/{categoryId}', () => {

    it('Token olmadan 401 dönmeli', async () => {
      const res = await apiRequest(`/admin/organizations/${createdOrgId}/service-categories/${createdServiceCategoryId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' }),
      });
      expect(res.status).toBe(401);
    });

    it('Hizmet kategorisi güncellemeli', async () => {
      const res = await apiRequest<{ id: number; name: string }>(`/admin/organizations/${createdOrgId}/service-categories/${createdServiceCategoryId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Güncellenen Kahvaltı Menüsü',
          description: 'Güncellenmiş açıklama',
        }),
      }, adminToken);

      expect([200, 201]).toContain(res.status);
      expect(res.data.name).toBe('Güncellenen Kahvaltı Menüsü');
    });

    it('Var olmayan kategori için 404 dönmeli', async () => {
      const res = await apiRequest(`/admin/organizations/${createdOrgId}/service-categories/999999`, {
        method: 'PUT',
        body: JSON.stringify({ name: 'Ghost' }),
      }, adminToken);
      expect([404, 400]).toContain(res.status);
    });
  });

  describe('DELETE /admin/organizations/{id}/service-categories/{categoryId}', () => {

    it('Token olmadan 401 dönmeli', async () => {
      const res = await apiRequest(`/admin/organizations/${createdOrgId}/service-categories/${createdServiceCategoryId}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(401);
    });

    // DELETE testi en son yapılacak (cleanup'ta)
  });
});

// ============================================
// Bölüm 7: Admin - İşletme Hizmetleri Yönetimi
// ============================================

describe('Bölüm 7: Admin - İşletme Hizmetleri', () => {

  describe('GET /admin/organizations/{id}/services', () => {

    it('Token olmadan 401 dönmeli', async () => {
      const res = await apiRequest(`/admin/organizations/${createdOrgId}/services`);
      expect(res.status).toBe(401);
    });

    it('İşletmenin hizmetlerini listelenmeli', async () => {
      const res = await apiRequest<{ data?: unknown[]; meta?: unknown } | unknown[]>(`/admin/organizations/${createdOrgId}/services`, {
        method: 'GET',
      }, adminToken);

      expect([200]).toContain(res.status);
      // Paginated veya array olabilir
      const items = Array.isArray(res.data) ? res.data : (res.data as { data?: unknown[] })?.data;
      expect(items).toBeDefined();
    });
  });

  describe('POST /admin/organizations/{id}/services', () => {

    it('Token olmadan 401 dönmeli', async () => {
      const res = await apiRequest(`/admin/organizations/${createdOrgId}/services`, {
        method: 'POST',
        body: JSON.stringify({ title: 'Test' }),
      });
      expect(res.status).toBe(401);
    });

    it('Hizmet/menü öğesi oluşturmalı', async () => {
      const res = await apiRequest<{ id: number; title: string; basePrice: number }>(`/admin/organizations/${createdOrgId}/services`, {
        method: 'POST',
        body: JSON.stringify({
          serviceCategoryId: createdServiceCategoryId,
          title: 'Menemen',
          basePrice: 120,
          priceType: 'fixed',
          description: 'Kaşarlı menemen',
          estimatedDurationMinutes: 15,
        }),
      }, adminToken);

      expect([200, 201]).toContain(res.status);
      expect(res.data.id).toBeDefined();
      expect(res.data.title).toBe('Menemen');

      createdServiceId = res.data.id;
      console.log('Oluşturulan Hizmet ID:', createdServiceId);
    });

    it('Başlık olmadan 400 dönmeli', async () => {
      const res = await apiRequest(`/admin/organizations/${createdOrgId}/services`, {
        method: 'POST',
        body: JSON.stringify({
          serviceCategoryId: createdServiceCategoryId,
          basePrice: 100,
          priceType: 'fixed',
        }),
      }, adminToken);

      expect([400, 422]).toContain(res.status);
    });

    it('Farklı fiyat tipleriyle oluşturmalı (per_person)', async () => {
      const res = await apiRequest<{ id: number; priceType: string }>(`/admin/organizations/${createdOrgId}/services`, {
        method: 'POST',
        body: JSON.stringify({
          serviceCategoryId: createdServiceCategoryId,
          title: 'Kişi Başı Kahvaltı',
          basePrice: 350,
          priceType: 'per_person',
          description: 'Açık büfe kahvaltı kişi başı',
        }),
      }, adminToken);

      expect([200, 201]).toContain(res.status);
      expect(res.data.priceType).toBe('per_person');
    });
  });

  describe('PUT /admin/organizations/{id}/services/{serviceId}', () => {

    it('Token olmadan 401 dönmeli', async () => {
      const res = await apiRequest(`/admin/organizations/${createdOrgId}/services/${createdServiceId}`, {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated' }),
      });
      expect(res.status).toBe(401);
    });

    it('Hizmet güncellemeli', async () => {
      const res = await apiRequest<{ id: number; title: string; basePrice: number }>(`/admin/organizations/${createdOrgId}/services/${createdServiceId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: 'Kaşarlı Menemen',
          basePrice: 150,
        }),
      }, adminToken);

      expect([200, 201]).toContain(res.status);
      expect(res.data.title).toBe('Kaşarlı Menemen');
      expect(Number(res.data.basePrice)).toBe(150);
    });

    it('Var olmayan hizmet için 404 dönmeli', async () => {
      const res = await apiRequest(`/admin/organizations/${createdOrgId}/services/999999`, {
        method: 'PUT',
        body: JSON.stringify({ title: 'Ghost' }),
      }, adminToken);
      expect([404, 400]).toContain(res.status);
    });
  });

  describe('DELETE /admin/organizations/{id}/services/{serviceId}', () => {

    it('Token olmadan 401 dönmeli', async () => {
      const res = await apiRequest(`/admin/organizations/${createdOrgId}/services/${createdServiceId}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(401);
    });

    // DELETE testi en son yapılacak (cleanup'ta)
  });
});

// ============================================
// Bölüm 8: Admin - İşletme Kaynakları/Yerleşim Yönetimi
// ============================================

describe('Bölüm 8: Admin - İşletme Kaynakları/Yerleşim', () => {

  describe('GET /admin/organizations/{id}/resources', () => {

    it('Token olmadan 401 dönmeli', async () => {
      const res = await apiRequest(`/admin/organizations/${createdOrgId}/resources`);
      expect(res.status).toBe(401);
    });

    it('İşletmenin kaynak yapısını listelenmeli', async () => {
      const res = await apiRequest<unknown[]>(`/admin/organizations/${createdOrgId}/resources`, {
        method: 'GET',
      }, adminToken);

      expect([200]).toContain(res.status);
      // Array veya paginated olabilir
      const data = Array.isArray(res.data) ? res.data : (res.data as unknown as { data?: unknown[] })?.data;
      expect(data).toBeDefined();
    });
  });

  describe('POST /admin/organizations/{id}/resources', () => {

    it('Token olmadan 401 dönmeli', async () => {
      const res = await apiRequest(`/admin/organizations/${createdOrgId}/resources`, {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
      });
      expect(res.status).toBe(401);
    });

    it('Kat kaynağı oluşturmalı', async () => {
      const res = await apiRequest<{ id: number; name: string }>(`/admin/organizations/${createdOrgId}/resources`, {
        method: 'POST',
        body: JSON.stringify({
          name: '1. Kat',
          resourceTypeId: 1, // floor
          capacity: 80,
          order: 2,
        }),
      }, adminToken);

      expect([200, 201]).toContain(res.status);
      expect(res.data.id).toBeDefined();
      expect(res.data.name).toBe('1. Kat');

      createdFloorResourceId = res.data.id;
      console.log('Oluşturulan Kat Kaynak ID:', createdFloorResourceId);
    });

    it('Alt kaynak (oda) oluşturmalı', async () => {
      const res = await apiRequest<{ id: number; name: string }>(`/admin/organizations/${createdOrgId}/resources`, {
        method: 'POST',
        body: JSON.stringify({
          name: 'VIP Salon',
          resourceTypeId: 2, // room
          parentId: createdFloorResourceId,
          capacity: 20,
          order: 1,
        }),
      }, adminToken);

      expect([200, 201]).toContain(res.status);
      expect(res.data.id).toBeDefined();
      expect(res.data.name).toBe('VIP Salon');

      // Masa eklemek için oda ID'sini kullan
      const roomId = res.data.id;

      // Masa oluştur
      const tableRes = await apiRequest<{ id: number; name: string }>(`/admin/organizations/${createdOrgId}/resources`, {
        method: 'POST',
        body: JSON.stringify({
          name: 'VIP Masa 1',
          resourceTypeId: 3, // table
          parentId: roomId,
          capacity: 8,
          order: 1,
        }),
      }, adminToken);

      expect([200, 201]).toContain(tableRes.status);
      createdResourceId = tableRes.data.id;
      console.log('Oluşturulan Masa Kaynak ID:', createdResourceId);
    });

    it('İsim olmadan 400 dönmeli', async () => {
      const res = await apiRequest(`/admin/organizations/${createdOrgId}/resources`, {
        method: 'POST',
        body: JSON.stringify({
          resourceTypeId: 1,
          capacity: 10,
        }),
      }, adminToken);

      expect([400, 422]).toContain(res.status);
    });
  });

  describe('PUT /admin/organizations/{id}/resources/{resourceId}', () => {

    it('Token olmadan 401 dönmeli', async () => {
      const res = await apiRequest(`/admin/organizations/${createdOrgId}/resources/${createdResourceId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' }),
      });
      expect(res.status).toBe(401);
    });

    it('Kaynak güncellemeli', async () => {
      const res = await apiRequest<{ id: number; name: string; capacity: number }>(`/admin/organizations/${createdOrgId}/resources/${createdResourceId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: 'VIP Masa 1 (Güncellenmiş)',
          capacity: 10,
        }),
      }, adminToken);

      expect([200, 201]).toContain(res.status);
      expect(res.data.name).toBe('VIP Masa 1 (Güncellenmiş)');
    });

    it('Servis saatlerini güncellemeli', async () => {
      const res = await apiRequest<{ id: number; serviceStartAt?: string; serviceEndAt?: string }>(`/admin/organizations/${createdOrgId}/resources/${createdFloorResourceId}`, {
        method: 'PUT',
        body: JSON.stringify({
          serviceStartAt: '08:00',
          serviceEndAt: '22:00',
          serviceDurationMinutes: 120,
        }),
      }, adminToken);

      expect([200, 201]).toContain(res.status);
    });

    it('Var olmayan kaynak için 404 dönmeli', async () => {
      const res = await apiRequest(`/admin/organizations/${createdOrgId}/resources/999999`, {
        method: 'PUT',
        body: JSON.stringify({ name: 'Ghost' }),
      }, adminToken);
      expect([404, 400]).toContain(res.status);
    });
  });

  describe('DELETE /admin/organizations/{id}/resources/{resourceId}', () => {

    it('Token olmadan 401 dönmeli', async () => {
      const res = await apiRequest(`/admin/organizations/${createdOrgId}/resources/${createdResourceId}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(401);
    });

    // DELETE testi cleanup bölümünde
  });
});

// ============================================
// Cleanup - Oluşturulan verileri temizle
// ============================================

describe('Cleanup - Oluşturulan verileri temizle', () => {

  it('Hizmet silmeli', async () => {
    if (!createdServiceId) return;

    const res = await apiRequest(`/admin/organizations/${createdOrgId}/services/${createdServiceId}`, {
      method: 'DELETE',
    }, adminToken);

    expect([200, 204]).toContain(res.status);
  });

  it('Hizmet kategorisi silmeli', async () => {
    if (!createdServiceCategoryId) return;

    const res = await apiRequest(`/admin/organizations/${createdOrgId}/service-categories/${createdServiceCategoryId}`, {
      method: 'DELETE',
    }, adminToken);

    expect([200, 204]).toContain(res.status);
  });

  it('Kaynak (masa) silmeli', async () => {
    if (!createdResourceId) return;

    const res = await apiRequest(`/admin/organizations/${createdOrgId}/resources/${createdResourceId}`, {
      method: 'DELETE',
    }, adminToken);

    expect([200, 204]).toContain(res.status);
  });

  it('Kaynak (kat) silmeli', async () => {
    if (!createdFloorResourceId) return;

    const res = await apiRequest(`/admin/organizations/${createdOrgId}/resources/${createdFloorResourceId}`, {
      method: 'DELETE',
    }, adminToken);

    expect([200, 204]).toContain(res.status);
  });

  it('İşletme silmeli (DELETE /admin/organizations/{id})', async () => {
    if (!createdOrgId) return;

    const res = await apiRequest(`/organizations/${createdOrgId}`, {
      method: 'DELETE',
    }, adminToken);

    expect([200, 204]).toContain(res.status);
  });

  it('Silinen işletme artık bulunamıyor olmalı', async () => {
    if (!createdOrgId) return;

    const res = await apiRequest(`/organizations/${createdOrgId}`, {
      method: 'GET',
    }, adminToken);

    expect([404, 400]).toContain(res.status);
  });
});
