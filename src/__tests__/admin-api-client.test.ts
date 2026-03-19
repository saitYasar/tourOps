/**
 * Admin API Client - Unit Testleri
 * fetch mock'lanarak ApiClient ve adminApi wrapper metotları test edilir
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock localStorage for getAuthRolePrefix
Object.defineProperty(window, 'location', {
  value: { pathname: '/admin', href: '' },
  writable: true,
});

// Import after mocking
import { adminApi, apiClient } from '@/lib/api';
import type {
  AdminQuickCreateOrganizationDto,
  CreateServiceCategoryDto,
  UpdateServiceCategoryDto,
  CreateServiceDto,
  UpdateServiceDto,
  CreateResourceDto,
  UpdateResourceDto,
} from '@/lib/api';

// ============================================
// Test Helpers
// ============================================

function mockApiResponse(data: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve({ status: 'success', statusCode: status, data }),
  });
}

function mockApiError(message: string, status = 400) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve({ message, statusCode: status }),
  });
}

beforeEach(() => {
  mockFetch.mockClear();
  // Set admin token
  localStorage.setItem('tourops_admin_access_token', 'test-admin-token-123');
});

afterEach(() => {
  localStorage.clear();
});

// ============================================
// Bölüm 5: Quick Create Organization
// ============================================

describe('Bölüm 5: adminApi.quickCreateOrganization', () => {

  const quickCreatePayload: AdminQuickCreateOrganizationDto = {
    name: 'Test Restoran',
    categoryId: 1,
    address: 'Test Adres',
    countryId: 1,
    cityId: 1,
    districtId: 1,
    phoneCountryCode: 90,
    phone: '5551234567',
    email: 'test@test.com',
    legalName: 'Test Ltd.',
    taxNumber: '1234567890',
    taxOffice: 'Test VD',
    resources: [
      {
        name: 'Zemin Kat',
        resourceTypeId: 1,
        capacity: 50,
        order: 1,
        children: [
          {
            name: 'Salon',
            resourceTypeId: 2,
            capacity: 30,
            order: 1,
          },
        ],
      },
    ],
    serviceCategories: [
      {
        name: 'Ana Yemekler',
        displayOrder: 1,
        services: [
          { title: 'Köfte', basePrice: 200, priceType: 'fixed' },
        ],
      },
    ],
  };

  it('başarılı quick-create isteği gönderilmeli', async () => {
    const mockResponse = {
      organization: { id: 1, name: 'Test Restoran', status: 'active' },
      resources: [{ id: 10, name: 'Zemin Kat' }],
      serviceCategories: [{ id: 20, name: 'Ana Yemekler' }],
      services: [{ id: 30, title: 'Köfte' }],
    };

    mockApiResponse(mockResponse, 201);

    const result = await adminApi.quickCreateOrganization(quickCreatePayload);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.organization.id).toBe(1);
    expect(result.data!.organization.name).toBe('Test Restoran');

    // fetch doğru URL'ye istek gönderildi mi?
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/admin/organizations/quick-create');
    expect(options.method).toBe('POST');

    // Body doğru mu?
    const body = JSON.parse(options.body);
    expect(body.name).toBe('Test Restoran');
    expect(body.resources).toHaveLength(1);
    expect(body.serviceCategories).toHaveLength(1);
  });

  it('hata durumunda success: false dönmeli', async () => {
    mockApiError('Zorunlu alan eksik', 400);

    const result = await adminApi.quickCreateOrganization({
      name: 'Eksik',
    } as AdminQuickCreateOrganizationDto);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('Authorization header göndermeli', async () => {
    mockApiResponse({ organization: { id: 1 } }, 201);

    await adminApi.quickCreateOrganization(quickCreatePayload);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers['Authorization']).toBe('Bearer test-admin-token-123');
  });
});

// ============================================
// Bölüm 5: Update & Delete Organization
// ============================================

describe('Bölüm 5: adminApi.updateOrganization', () => {

  it('işletme güncellemeli', async () => {
    mockApiResponse({ id: 1, name: 'Güncel Ad' });

    const result = await adminApi.updateOrganization(1, { name: 'Güncel Ad' });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/organizations/1');
    expect(options.method).toBe('PUT');
  });
});

describe('Bölüm 5: adminApi.deleteOrganization', () => {

  it('işletme silmeli', async () => {
    mockApiResponse({ message: 'Silindi' });

    const result = await adminApi.deleteOrganization(1);

    expect(result.success).toBe(true);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/organizations/1');
    expect(options.method).toBe('DELETE');
  });
});

// ============================================
// Bölüm 6: Service Categories
// ============================================

describe('Bölüm 6: adminApi - İşletme Hizmet Kategorileri', () => {

  describe('getOrgServiceCategories', () => {
    it('hizmet kategorilerini listelenmeli', async () => {
      const categories = [
        { id: 1, name: 'Ana Yemekler', displayOrder: 1 },
        { id: 2, name: 'İçecekler', displayOrder: 2 },
      ];
      mockApiResponse(categories);

      const result = await adminApi.getOrgServiceCategories(1);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('/admin/organizations/1/service-categories');
    });
  });

  describe('createOrgServiceCategory', () => {
    it('yeni hizmet kategorisi oluşturmalı', async () => {
      const newCategory = { id: 5, name: 'Tatlılar', displayOrder: 3 };
      mockApiResponse(newCategory, 201);

      const data: CreateServiceCategoryDto = {
        name: 'Tatlılar',
        description: 'Tatlı çeşitleri',
        displayOrder: 3,
      };

      const result = await adminApi.createOrgServiceCategory(1, data);

      expect(result.success).toBe(true);
      expect(result.data!.name).toBe('Tatlılar');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/admin/organizations/1/service-categories');
      expect(options.method).toBe('POST');
    });

    it('parentId ile alt kategori oluşturmalı', async () => {
      mockApiResponse({ id: 6, name: 'Alt Kat' }, 201);

      const data: CreateServiceCategoryDto = {
        name: 'Alt Kat',
        parentId: 5,
      };

      await adminApi.createOrgServiceCategory(1, data);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.parentId).toBe(5);
    });
  });

  describe('updateOrgServiceCategory', () => {
    it('hizmet kategorisi güncellemeli', async () => {
      mockApiResponse({ id: 5, name: 'Güncel Tatlılar' });

      const data: UpdateServiceCategoryDto = { name: 'Güncel Tatlılar' };
      const result = await adminApi.updateOrgServiceCategory(1, 5, data);

      expect(result.success).toBe(true);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/admin/organizations/1/service-categories/5');
      expect(options.method).toBe('PUT');
    });
  });

  describe('deleteOrgServiceCategory', () => {
    it('hizmet kategorisi silmeli', async () => {
      mockApiResponse({ message: 'Silindi' });

      const result = await adminApi.deleteOrgServiceCategory(1, 5);

      expect(result.success).toBe(true);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/admin/organizations/1/service-categories/5');
      expect(options.method).toBe('DELETE');
    });
  });
});

// ============================================
// Bölüm 7: Services
// ============================================

describe('Bölüm 7: adminApi - İşletme Hizmetleri', () => {

  describe('getOrgServices', () => {
    it('hizmetleri listelenmeli (paginated)', async () => {
      const services = {
        data: [
          { id: 1, title: 'Köfte', basePrice: 200, priceType: 'fixed' },
          { id: 2, title: 'Kebap', basePrice: 300, priceType: 'fixed' },
        ],
        meta: { total: 2, page: 1, limit: 100, totalPages: 1 },
      };
      mockApiResponse(services);

      const result = await adminApi.getOrgServices(1);

      expect(result.success).toBe(true);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('/admin/organizations/1/services');
      expect(url).toContain('page=1');
      expect(url).toContain('limit=100');
    });

    it('sayfa ve limit parametresi göndermeli', async () => {
      mockApiResponse({ data: [], meta: { total: 0, page: 2, limit: 10, totalPages: 0 } });

      await adminApi.getOrgServices(1, 2, 10);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('page=2');
      expect(url).toContain('limit=10');
    });
  });

  describe('createOrgService', () => {
    it('yeni hizmet oluşturmalı', async () => {
      const newService = { id: 10, title: 'Menemen', basePrice: 120, priceType: 'fixed' };
      mockApiResponse(newService, 201);

      const data: CreateServiceDto = {
        serviceCategoryId: 1,
        title: 'Menemen',
        basePrice: 120,
        priceType: 'fixed',
        description: 'Kaşarlı menemen',
      };

      const result = await adminApi.createOrgService(1, data);

      expect(result.success).toBe(true);
      expect(result.data!.title).toBe('Menemen');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/admin/organizations/1/services');
      expect(options.method).toBe('POST');
    });

    it('farklı priceType değerleri göndermeli', async () => {
      mockApiResponse({ id: 11, title: 'Brunch', basePrice: 500, priceType: 'per_person' }, 201);

      const data: CreateServiceDto = {
        serviceCategoryId: 1,
        title: 'Brunch',
        basePrice: 500,
        priceType: 'per_person',
      };

      await adminApi.createOrgService(1, data);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.priceType).toBe('per_person');
    });
  });

  describe('updateOrgService', () => {
    it('hizmet güncellemeli', async () => {
      mockApiResponse({ id: 10, title: 'Güncel Menemen', basePrice: 150 });

      const data: UpdateServiceDto = { title: 'Güncel Menemen', basePrice: 150 };
      const result = await adminApi.updateOrgService(1, 10, data);

      expect(result.success).toBe(true);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/admin/organizations/1/services/10');
      expect(options.method).toBe('PUT');
    });
  });

  describe('deleteOrgService', () => {
    it('hizmet silmeli', async () => {
      mockApiResponse({ message: 'Silindi' });

      const result = await adminApi.deleteOrgService(1, 10);

      expect(result.success).toBe(true);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/admin/organizations/1/services/10');
      expect(options.method).toBe('DELETE');
    });
  });
});

// ============================================
// Bölüm 8: Resources
// ============================================

describe('Bölüm 8: adminApi - İşletme Kaynakları/Yerleşim', () => {

  describe('getOrgResources', () => {
    it('kaynakları listelenmeli', async () => {
      const resources = [
        { id: 1, name: 'Zemin Kat', resourceTypeId: 1, children: [] },
        { id: 2, name: '1. Kat', resourceTypeId: 1, children: [] },
      ];
      mockApiResponse(resources);

      const result = await adminApi.getOrgResources(1);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('/admin/organizations/1/resources');
    });
  });

  describe('createOrgResource', () => {
    it('yeni kaynak oluşturmalı (kat)', async () => {
      const newResource = { id: 10, name: 'Teras Kat', resourceTypeId: 1, capacity: 40 };
      mockApiResponse(newResource, 201);

      const data: CreateResourceDto = {
        name: 'Teras Kat',
        resourceTypeId: 1,
        capacity: 40,
        order: 3,
      };

      const result = await adminApi.createOrgResource(1, data);

      expect(result.success).toBe(true);
      expect(result.data!.name).toBe('Teras Kat');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/admin/organizations/1/resources');
      expect(options.method).toBe('POST');
    });

    it('parentId ile alt kaynak oluşturmalı', async () => {
      mockApiResponse({ id: 11, name: 'Masa 1', resourceTypeId: 3 }, 201);

      const data: CreateResourceDto = {
        name: 'Masa 1',
        resourceTypeId: 3,
        parentId: 10,
        capacity: 4,
      };

      await adminApi.createOrgResource(1, data);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.parentId).toBe(10);
      expect(body.resourceTypeId).toBe(3);
    });

    it('koordinat ve boyut bilgisi göndermeli', async () => {
      mockApiResponse({ id: 12, name: 'Köşe Masa' }, 201);

      const data: CreateResourceDto = {
        name: 'Köşe Masa',
        resourceTypeId: 3,
        parentId: 10,
        capacity: 6,
        coordinates: { x: 50, y: 30 },
        width: 120,
        height: 80,
        rotation: 45,
        color: '#FF5733',
      };

      await adminApi.createOrgResource(1, data);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.coordinates).toEqual({ x: 50, y: 30 });
      expect(body.width).toBe(120);
      expect(body.rotation).toBe(45);
      expect(body.color).toBe('#FF5733');
    });
  });

  describe('updateOrgResource', () => {
    it('kaynak güncellemeli', async () => {
      mockApiResponse({ id: 10, name: 'Güncel Teras', capacity: 50 });

      const data: UpdateResourceDto = { name: 'Güncel Teras', capacity: 50 };
      const result = await adminApi.updateOrgResource(1, 10, data);

      expect(result.success).toBe(true);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/admin/organizations/1/resources/10');
      expect(options.method).toBe('PUT');
    });

    it('servis saatlerini güncellemeli', async () => {
      mockApiResponse({ id: 10, serviceStartAt: '09:00', serviceEndAt: '23:00' });

      const data: UpdateResourceDto = {
        serviceStartAt: '09:00',
        serviceEndAt: '23:00',
        serviceDurationMinutes: 90,
      };

      await adminApi.updateOrgResource(1, 10, data);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.serviceStartAt).toBe('09:00');
      expect(body.serviceEndAt).toBe('23:00');
      expect(body.serviceDurationMinutes).toBe(90);
    });

    it('aktif/pasif durumu güncellemeli', async () => {
      mockApiResponse({ id: 10, active: false });

      const data: UpdateResourceDto = { active: false };
      await adminApi.updateOrgResource(1, 10, data);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.active).toBe(false);
    });
  });

  describe('deleteOrgResource', () => {
    it('kaynak silmeli', async () => {
      mockApiResponse({ message: 'Silindi' });

      const result = await adminApi.deleteOrgResource(1, 10);

      expect(result.success).toBe(true);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/admin/organizations/1/resources/10');
      expect(options.method).toBe('DELETE');
    });

    it('silme hatasında success: false dönmeli', async () => {
      mockApiError('Kaynak bulunamadı', 404);

      const result = await adminApi.deleteOrgResource(1, 999);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

// ============================================
// Cross-cutting: Hata durumları
// ============================================

describe('Hata Durumları', () => {

  it('401 Unauthorized - token olmadan istek', async () => {
    localStorage.clear(); // Token temizle
    mockApiError('Oturum süresi doldu', 401);

    // onUnauthorized callback'i test et
    const mockCallback = vi.fn();
    apiClient.setOnUnauthorized(mockCallback);

    const result = await adminApi.getOrgServiceCategories(1);
    expect(result.success).toBe(false);

    // Cleanup
    apiClient.setOnUnauthorized(null);
  });

  it('500 Server Error durumu', async () => {
    mockApiError('Internal Server Error', 500);

    const result = await adminApi.getOrgServices(1);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('Network error durumu', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await adminApi.getOrgResources(1);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Network error');
  });
});

// ============================================
// URL ve Endpoint doğruluğu
// ============================================

describe('URL ve Endpoint Doğruluğu', () => {

  it('quick-create doğru URL kullanmalı', async () => {
    mockApiResponse({ organization: { id: 1 } }, 201);

    await adminApi.quickCreateOrganization({
      name: 'Test',
      categoryId: 1,
      address: 'A',
      countryId: 1,
      cityId: 1,
      districtId: 1,
      phoneCountryCode: 90,
      phone: '5551234567',
      email: 'a@a.com',
      legalName: 'T',
      taxNumber: '1',
      taxOffice: 'T',
    });

    expect(mockFetch.mock.calls[0][0]).toContain('/admin/organizations/quick-create');
  });

  it('service-categories doğru URL pattern kullanmalı', async () => {
    mockApiResponse([]);
    await adminApi.getOrgServiceCategories(42);
    expect(mockFetch.mock.calls[0][0]).toContain('/admin/organizations/42/service-categories');
  });

  it('services doğru URL pattern kullanmalı', async () => {
    mockApiResponse({ data: [], meta: {} });
    await adminApi.getOrgServices(42);
    expect(mockFetch.mock.calls[0][0]).toContain('/admin/organizations/42/services');
  });

  it('resources doğru URL pattern kullanmalı', async () => {
    mockApiResponse([]);
    await adminApi.getOrgResources(42);
    expect(mockFetch.mock.calls[0][0]).toContain('/admin/organizations/42/resources');
  });

  it('service-categories update doğru orgId ve categoryId kullanmalı', async () => {
    mockApiResponse({ id: 5 });
    await adminApi.updateOrgServiceCategory(10, 5, { name: 'X' });
    expect(mockFetch.mock.calls[0][0]).toContain('/admin/organizations/10/service-categories/5');
  });

  it('services update doğru orgId ve serviceId kullanmalı', async () => {
    mockApiResponse({ id: 7 });
    await adminApi.updateOrgService(10, 7, { title: 'X' });
    expect(mockFetch.mock.calls[0][0]).toContain('/admin/organizations/10/services/7');
  });

  it('resources update doğru orgId ve resourceId kullanmalı', async () => {
    mockApiResponse({ id: 3 });
    await adminApi.updateOrgResource(10, 3, { name: 'X' });
    expect(mockFetch.mock.calls[0][0]).toContain('/admin/organizations/10/resources/3');
  });

  it('lang parametresi gönderilmeli', async () => {
    mockApiResponse([]);
    await adminApi.getOrgServiceCategories(1, 'en');
    expect(mockFetch.mock.calls[0][0]).toContain('lang=en');
  });

  it('varsayılan lang=tr olmalı', async () => {
    mockApiResponse([]);
    await adminApi.getOrgServiceCategories(1);
    expect(mockFetch.mock.calls[0][0]).toContain('lang=tr');
  });
});
