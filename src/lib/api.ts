// ============================================
// Real API Client - Backend Integration
// OTP-based authentication only (no passwords)
// ============================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.example.com';

// ============================================
// Types
// ============================================

export interface OrganizationLoginRegisterDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
}

export interface AgencyLoginRegisterDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
}

// Login icin sadece email
export interface LoginEmailDto {
  email: string;
}

export interface OtpVerifyDto {
  email: string;
  otp: string;
}

export interface ApiUserDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isEmailVerified: boolean;
  phoneVerifiedAt: string | null;
  roles: Array<string | { key?: string; name?: string }>;
}

export interface LoginResponseDto {
  accessToken: string;
  refreshToken?: string;
  user: ApiUserDto;
  isNewUser?: boolean;
  agency?: {
    id?: number;
    status: string;
    message: string;
  };
  organization?: {
    id?: number;
    status: string;
    message: string;
  };
}

// API wrapper response
export interface ApiResponse<T> {
  status: string;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

export interface InviteUserDto {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  phoneCountryCode: number;
  roleIds: number[];
  message?: string;
}

// Organization Register DTO
export interface OrganizationRegisterDto {
  name: string;
  categoryId: number;
  address: string;
  countryId: number;
  cityId: number;
  districtId: number;
  phoneCountryCode: number;
  phone: number;
  email: string;
  legalName: string;
  taxNumber: number;
  taxOffice: string;
  description?: string;
  lat?: number;
  lng?: number;
  agencyCommissionRate?: number;
  currency?: 'TRY' | 'EUR' | 'USD';
}

// Organization Registration Response (includes auth tokens)
export interface OrganizationRegisterResponseDto {
  accessToken: string;
  refreshToken: string;
  user: ApiUserDto;
  organization: {
    id: number;
    status: string;
    message: string;
  };
}

// Agency Register DTO
export interface AgencyRegisterDto {
  name: string;
  phoneCountryCode: number;
  phone: number;
  email: string;
  legalName: string;
  taxNumber: number;
  taxOffice: string;
  description?: string;
}

// Agency Registration Response (includes auth tokens)
export interface AgencyRegisterResponseDto {
  accessToken: string;
  refreshToken: string;
  user: ApiUserDto;
  agency: {
    id: number;
    status: string;
    message: string;
  };
}

// Organization Response
export interface OrganizationDto {
  id: number;
  authorizedPersonId?: number;
  name: string;
  categoryId: number;
  address: string;
  countryId: number;
  cityId: number;
  districtId: number;
  phoneCountryCode: number;
  phone: string;
  phoneVerifiedAt?: string | null;
  email: string;
  emailVerifiedAt?: string | null;
  description?: string;
  socialMediaUrls?: {
    instagram?: string | null;
    facebook?: string | null;
    youtube?: string | null;
    pinterest?: string | null;
    twitter?: string | null;
  };
  legalName: string;
  taxNumber: string;
  taxOffice: string;
  lat?: string;
  lng?: string;
  coverImageUrl?: string | null;
  status: string;
  totalReviews?: number;
  averageRating?: string;
  uuid?: string;
  relatedAgencyId?: number | null;
  agencyCommissionRate?: number | null;
  currency?: string | null;
  createdAt: string;
  updatedAt: string;
  category?: CategoryDto;
  country?: LocationDto;
  city?: LocationDto;
  district?: LocationDto;
  resources?: unknown[];
  agencies?: unknown[];
  photos?: PhotoDto[];
  system_commission?: {
    id: number;
    scope: string;
    scopeId?: number | null;
    value: string;
    description?: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
  } | null;
}

// Tour Client DTO (from /agency/tours/:tourId/clients API)
export interface TourClientDto {
  id: number;
  tourId: number;
  clientId: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  pricePaid?: string;
  paidAt?: string | null;
  notes?: string | null;
  client: {
    id: number;
    firstName: string;
    lastName: string;
    username: string | null;
    email: string | null;
    phoneCountryCode: string | null;
    phone: string | null;
    profilePhoto: string | null;
    active?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

// Agency Client DTO (from /agencies/clients API - nested structure)
export interface AgencyClientDto {
  id: number;
  agencyId: number;
  clientId: number;
  clientType: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  client: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
    email: string | null;
    phoneCountryCode: number | null;
    phone: string | null;
    profilePhoto: string | null;
    lastLoginAt: string | null;
  };
}

export interface CreateAgencyClientDto {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  gender?: 'm' | 'f';
}

// Agency Response DTO
export interface AgencyResponseDto {
  id: number;
  authorizedPersonId: number;
  name: string;
  description: string | null;
  phoneCountryCode: number | null;
  phone: number | null;
  phoneVerifiedAt: string | null;
  email: string;
  emailVerifiedAt: string | null;
  legalName: string;
  taxNumber: number;
  taxOffice: string;
  address: string | null;
  status: 'pending' | 'active' | 'suspended';
  uuid: string;
  coverImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Organization Update DTO
export interface OrganizationUpdateDto {
  name?: string;
  description?: string;
  address?: string;
  phoneCountryCode?: number;
  phone?: number;
  countryId?: number;
  cityId?: number;
  districtId?: number;
  lat?: number;
  lng?: number;
  socialMediaUrls?: {
    instagram?: string | null;
    facebook?: string | null;
    youtube?: string | null;
    pinterest?: string | null;
    twitter?: string | null;
  };
  agencyCommissionRate?: number;
  currency?: 'TRY' | 'EUR' | 'USD';
}

// Photo DTO
export interface PhotoDto {
  id: number;
  organizationId?: number;
  agencyId?: number;
  imageKey: string;
  order: number;
  createdAt: string;
  imageUrl: string;
}

// Role DTO
export interface RoleDto {
  id: number;
  name: string;
  description?: string;
}

// Invitation DTO
export interface InvitationDto {
  id: number;
  // New API field names
  inviteeEmail?: string;
  inviteeFirstName?: string;
  inviteeLastName?: string;
  inviteePhone?: string;
  inviteePhoneCountryCode?: number;
  roleIds?: number[];
  // Legacy field names (for backwards compatibility)
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  phoneCountryCode?: number;
  roles?: RoleDto[];
  // Common fields
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  message?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

// Team Member DTO
export interface TeamMemberDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneCountryCode: number;
  avatarUrl?: string;
  roles: RoleDto[];
  status: 'active' | 'inactive';
  joinedAt: string;
  lastActiveAt?: string;
}

// Organization User DTO (from /organizations/my/users API)
export interface OrganizationUserDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneCountryCode: number;
  phone: string;
  status: 'pending' | 'approved' | 'inactive';
  joinedAt: string;
  roles: {
    id: number;
    key: string;
    description: string;
  }[];
}

// ============================================
// Resource (Mekan/Yerleşim) Types
// ============================================

// Kaynak Tipi - Admin tarafından tanımlanır
export interface ResourceTypeDto {
  id: number;
  categoryId: number;           // İşletme kategorisi (1=Restoran)
  code: string;                 // "floor" | "room" | "table" | "seat" | "object"
  name: string;                 // "Kat" | "Oda" | "Masa" | "Sandalye" | "Obje"
  allowsChildren: boolean;      // Alt kaynak eklenebilir mi?
  supportsCoordinates: boolean; // Koordinat desteği (x,y pozisyon)
  defaultCapacity: number;      // Varsayılan kapasite
  order: number;                // Hiyerarşi sırası (1=Kat, 2=Oda, 3=Masa, 4=Sandalye, 5=Obje)
  children?: ResourceTypeDto[]; // İzin verilen alt tipler (API: children array)
  childId?: number;             // (eski) Tek alt tip ID - deprecated, children kullan
  category?: {                  // Join ile gelen kategori bilgisi
    id: number;
    name: string;
    description: string;
    imageKey: string | null;
  };
  createdAt?: string;
  updatedAt?: string;
}

// Koordinat - Oda içi pozisyon (masa, sandalye için)
export interface ResourceCoordinates {
  x: number;    // Yatay pozisyon (0-100 veya piksel)
  y: number;    // Dikey pozisyon (0-100 veya piksel)
  width?: number;   // Genişlik (opsiyonel)
  height?: number;  // Yükseklik (opsiyonel)
  rotation?: number; // Döndürme açısı (0-360)
}

// Kaynak - Tek tablo, parent-child ilişkisi
// Client info attached to a resource (e.g. chair occupant from layout API)
export interface ResourceClientDto {
  id: number;
  firstName: string;
  lastName: string;
  username?: string;
  profilePhoto?: string | null;
  gender?: 'm' | 'f' | null;
}

export interface ResourceDto {
  id: number;
  organizationId: number;
  resourceTypeId: number;
  resourceType?: ResourceTypeDto;  // Join ile gelen tip bilgisi
  parentId: number | null;         // Üst kaynak (null = kök seviye)
  parent?: ResourceDto;            // Join ile gelen üst kaynak
  children?: ResourceDto[];        // Alt kaynaklar
  client?: ResourceClientDto | null; // Sandalyede oturan misafir bilgisi

  name: string;                    // "Kat 1", "Salon A", "Masa 5"
  capacity: number;                // Kapasite (kişi sayısı)
  order: number;                   // Sıralama (Kat için: 1,2,3 = Zemin,1.Kat,2.Kat)

  // Koordinat (oda içi pozisyon için) - "x,y" formatında string
  coordinates?: string;            // "50,50" gibi x,y koordinatları

  // Boyut ve açı (ayrı alanlar olarak backend'den gelir)
  width?: number;                  // Genişlik (piksel)
  height?: number;                 // Yükseklik (piksel)
  rotation?: number;               // Döndürme açısı (derece, 0-360)

  // Servis ayarları
  serviceStartAt?: string;         // "09:00"
  serviceEndAt?: string;           // "23:00"
  serviceDurationMinutes?: number; // Servis süresi (dk)
  approvePreReservationAutomatically: boolean;

  // Görünüm
  color?: string;                  // Renk kodu (#hex)

  // Durum
  active: boolean;
  imageUrl?: string;

  // Meta
  createdAt: string;
  updatedAt: string;

  // UI için computed alanlar
  _depth?: number;                 // Hiyerarşi derinliği
  _path?: string;                  // "Kat 1 > Salon A > Masa 5"
  _childCount?: number;            // Alt kaynak sayısı
}

// Resource oluşturma DTO
export interface CreateResourceDto {
  name: string;
  resourceTypeId: number;
  parentId?: number | null;
  capacity?: number;
  order?: number;
  coordinates?: { x: number; y: number } | string; // "x,y" formatında string veya {x,y} objesi
  width?: number;
  height?: number;
  rotation?: number;
  color?: string;                  // Renk kodu (#hex)
  serviceStartAt?: string;
  serviceEndAt?: string;
  serviceDurationMinutes?: number;
  approvePreReservationAutomatically?: boolean;
}

// Resource güncelleme DTO
export interface UpdateResourceDto {
  name?: string;
  capacity?: number;
  order?: number;
  coordinates?: { x: number; y: number } | string; // "x,y" formatında string veya {x,y} objesi
  width?: number;
  height?: number;
  rotation?: number;
  color?: string;                  // Renk kodu (#hex)
  serviceStartAt?: string;
  serviceEndAt?: string;
  serviceDurationMinutes?: number;
  approvePreReservationAutomatically?: boolean;
  active?: boolean;
}

// Resource taşıma DTO
export interface MoveResourceDto {
  newParentId: number | null;
}

// Category DTO
export interface CategoryDto {
  id: number;
  name: string;
  description?: string;
}

// Location DTO
export interface LocationDto {
  id: number;
  name: string;
}

// Paginated Response
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    totalCount?: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ============================================
// Service Category & Service Types
// ============================================

export type PriceType = 'fixed' | 'per_person' | 'per_hour' | 'per_day';

export interface ServiceCategoryDto {
  id: number;
  organizationId?: number;
  name: string;
  description?: string | null;
  displayOrder: number;
  imageKey?: string | null;
  imageUrl?: string | null;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  child_service_categories?: ServiceCategoryDto[];
}

export interface CreateServiceCategoryDto {
  name: string;
  description?: string;
  displayOrder?: number;
  parentId?: number;
}

export interface UpdateServiceCategoryDto {
  name?: string;
  description?: string;
  displayOrder?: number;
}

export interface ServiceDto {
  id: number;
  organizationId?: number;
  serviceCategoryId: number;
  title: string;
  subTitle?: string | null;
  description?: string | null;
  contentsDescription?: string | null;
  imageKey?: string | null;
  imageUrl?: string | null;
  basePrice: number | string;
  priceType: PriceType;
  currency?: string;
  estimatedDurationMinutes?: number | null;
  dailyStock?: number | null;
  remainingStock?: number | null;
  active: boolean;
  metadata?: unknown;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateServiceDto {
  serviceCategoryId: number;
  title: string;
  basePrice: number;
  priceType: PriceType;
  subTitle?: string;
  description?: string;
  contentsDescription?: string;
  estimatedDurationMinutes?: number;
  dailyStock?: number | null;
}

export interface UpdateServiceDto {
  title?: string;
  subTitle?: string;
  description?: string;
  contentsDescription?: string;
  basePrice?: number;
  priceType?: PriceType;
  estimatedDurationMinutes?: number;
  serviceCategoryId?: number;
  dailyStock?: number | null;
}

// ============================================
// Admin Types
// ============================================

export type CompanyType = 'organization' | 'agency';
export type CompanyStatus = 'pending' | 'active' | 'suspended';

// Company DTO (Organization or Agency from admin endpoint)
export interface CompanyDto {
  id: number;
  name: string;
  email: string;
  phone: string;
  phoneCountryCode: number;
  address: string;
  status: CompanyStatus;
  categoryId?: number;
  category?: CategoryDto;
  legalName?: string;
  taxNumber?: string;
  taxOffice?: string;
  countryId?: number;
  cityId?: number;
  districtId?: number;
  country?: LocationDto;
  city?: LocationDto;
  district?: LocationDto;
  lat?: string;
  lng?: string;
  coverImageKey?: string | null;
  coverImageUrl?: string | null;
  description?: string;
  totalReviews?: number;
  averageRating?: string;
  agencyCommissionRate?: number | null;
  currency?: string | null;
  createdAt: string;
  updatedAt: string;
  // Authorized person info
  authorizedPerson?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    phoneCountryCode: number;
  };
}

// Company list filters
export interface CompanyFilters {
  type: CompanyType;
  status?: CompanyStatus;
  search?: string;
  page?: number;
  limit?: number;
  lang?: 'tr' | 'en' | 'de';
}

// Update company status DTO
export interface UpdateCompanyStatusDto {
  type: CompanyType;
  id: number;
  status: CompanyStatus;
}

// Admin Update Agency DTO
export interface AdminUpdateAgencyDto {
  name?: string;
  description?: string;
  phone?: string;
  email?: string;
  legalName?: string;
  taxNumber?: string;
  taxOffice?: string;
  address?: string;
  status?: CompanyStatus;
}

// Admin Update Organization DTO
export interface AdminUpdateOrganizationDto {
  name?: string;
  categoryId?: number;
  address?: string;
  lat?: string;
  lng?: string;
  countryId?: number;
  cityId?: number;
  districtId?: number;
  phone?: string;
  email?: string;
  description?: string;
  socialMediaUrls?: {
    instagram?: string | null;
    facebook?: string | null;
    youtube?: string | null;
    pinterest?: string | null;
    twitter?: string | null;
  };
  legalName?: string;
  taxNumber?: string;
  taxOffice?: string;
  status?: CompanyStatus;
  agencyCommissionRate?: number;
  currency?: 'TRY' | 'EUR' | 'USD';
}

// Admin Quick Create Organization DTO
export interface AdminQuickCreateOrganizationDto {
  // İşletme bilgileri
  name: string;
  categoryId?: number;
  address?: string;
  countryId?: number;
  cityId?: number;
  districtId?: number;
  phoneCountryCode?: number;
  phone?: string;
  email?: string;
  legalName?: string;
  taxNumber?: string;
  taxOffice?: string;
  description?: string;
  lat?: string;
  lng?: string;
  agencyCommissionRate?: number;
  currency?: 'TRY' | 'EUR' | 'USD';
  // Yetkili kişi bilgileri
  authorizedPerson?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    phoneCountryCode: string;
  };
  // Oturma düzeni (opsiyonel)
  resources?: Array<{
    name: string;
    resourceTypeId: number;
    parentId?: number | null;
    capacity?: number;
    order?: number;
    children?: Array<{
      name: string;
      resourceTypeId: number;
      capacity?: number;
      order?: number;
      children?: Array<{
        name: string;
        resourceTypeId: number;
        capacity?: number;
        order?: number;
      }>;
    }>;
  }>;
  // Menü / Hizmet kategorileri ve hizmetler (opsiyonel)
  serviceCategories?: Array<{
    name: string;
    description?: string;
    displayOrder?: number;
    services?: Array<{
      title: string;
      basePrice: number;
      priceType: PriceType;
      description?: string;
      estimatedDurationMinutes?: number;
    }>;
  }>;
}

// Admin Quick Create Response
export interface AdminQuickCreateOrganizationResponseDto {
  organization: OrganizationDto;
  resources?: ResourceDto[];
  serviceCategories?: ServiceCategoryDto[];
  services?: ServiceDto[];
}

// Admin Login DTO
export interface AdminLoginDto {
  email: string;
}

// Admin Login Verify DTO
export interface AdminLoginVerifyDto {
  email: string;
  otp: string;
}

// ============================================
// Admin - User Types
// ============================================

export type AdminUserRole = 'system_admin' | 'organization_owner' | 'agency_owner' | 'organization_user' | 'agency_user';
export type AdminUserStatus = 'active' | 'inactive' | 'pending';

export interface AdminUserDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  username?: string;
  phoneCountryCode?: number;
  phone?: string;
  role: AdminUserRole | string;
  status: AdminUserStatus | string;
  emailVerifiedAt?: string | null;
  phoneVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminUserDto {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  username?: string;
  phoneCountryCode?: string;
  phone?: string;
  role?: string;
  status?: string;
}

export interface UpdateAdminUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  phoneCountryCode?: string;
  phone?: string;
  role?: string;
  status?: string;
}

// ============================================
// Client (Misafir) Types
// ============================================

export interface ClientProfileDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phoneCountryCode: number | null;
  phone: string | null;
  username: string;
  agencyId: number;
  lastLoginAt: string | null;
  profilePhoto: string | null;
  gender: 'm' | 'f' | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateClientProfileDto {
  firstName?: string;
  lastName?: string;
  phoneCountryCode?: number;
  phone?: number;
  gender?: 'm' | 'f';
  username?: string;
  password?: string;
}

export interface ClientTourDto {
  id: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: string;
  agencyId: number;
  regionId?: number;
  capacity?: number;
  [key: string]: unknown;
}

// ============================================
// Client Panel - New API DTOs
// ============================================

export interface ClientParticipantTourDto {
  participantId: number;
  status: string;
  joinedAt: string;
  tour: {
    id: number;
    agencyId: number;
    uuid: string;
    tourCode: string;
    tourName: string;
    description: string | null;
    startDate: string;
    endDate: string;
    maxParticipants: number;
    minParticipants: number;
    currentParticipants: number;
    status: string;
    photos: PhotoDto[];
    coverImageUrl: string | null;
  };
}

export interface ClientTourDetailDto {
  participantStatus: string;
  tour: {
    id: number;
    agencyId: number;
    uuid: string;
    tourCode: string;
    tourName: string;
    description: string | null;
    startDate: string;
    endDate: string;
    maxParticipants: number;
    minParticipants: number;
    currentParticipants: number;
    status: string;
    agency: {
      id: number;
      name: string;
      description?: string | null;
      coverImageUrl?: string | null;
    };
    photos: PhotoDto[];
    stops: ClientTourStopDto[];
    coverImageUrl: string | null;
  };
}

export interface ClientTourStopDto {
  id: number;
  organizationId: number;
  description: string | null;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
  preReservationStatus: string | null;
  showPriceToCustomer: boolean;
  choiceDeadline?: number | null;
  choiceDeadlineTime?: string | null;
  choicesStatus?: string | null;
  maxSpendLimit?: number | null;
  organization: {
    name: string;
    categoryId: number;
    address: string;
    photos: PhotoDto[];
    category: CategoryDto | null;
    coverImageUrl: string | null;
    averageRating: string | null;
    totalReviews: number;
  };
}

export interface ClientStopMenuCategoryDto {
  id: number;
  name: string;
  displayOrder: number;
  imageUrl: string | null;
  max?: number | null;
  child_service_categories: ClientStopMenuCategoryDto[];
  services: ClientStopMenuServiceDto[];
}

export interface ClientStopMenuServiceDto {
  id: number;
  title: string;
  subTitle: string | null;
  description: string | null;
  contentsDescription: string | null;
  basePrice: string | number;
  priceType: string;
  currency?: string;
  imageUrl: string | null;
  estimatedDurationMinutes?: number | null;
  serviceCategoryId?: number;
  serviceCategoryName?: string;
  dailyStock?: number | null;
  remainingStock?: number | null;
  active?: boolean;
}

// Client choice DTOs
export interface CreateResourceChoiceDto {
  resourceId: number;
}

export interface CreateServiceChoiceDto {
  serviceId: number;
  note?: string;
}

export interface UpdateServiceChoiceDto {
  quantity?: number;
  note?: string;
}

export interface ClientResourceChoiceItemDto {
  resourceTypeCode: string;   // "floor" | "room" | "table" | "seat"
  resourceTypeName: string;   // "Floor" | "Room" | "Table" | "Chair"
  resourceName: string;       // "1. Kat", "Salon 1", "Masa 1", "Masa 1-3"
}

export interface ClientResourceChoiceDto {
  id: number;
  stopId: number;
  resourceId: number;
  resource?: ResourceDto;
  [key: string]: unknown;
}

export interface ClientServiceChoiceDto {
  id: number;
  stopId: number;
  serviceId: number;
  quantity: number;
  note?: string;
  service?: ClientStopMenuServiceDto;
  [key: string]: unknown;
}

export interface ClientStopChoicesDto {
  resourceChoice?: ClientResourceChoiceItemDto[] | ClientResourceChoiceDto | null;
  serviceChoices?: ClientServiceChoiceDto[];
  [key: string]: unknown;
}

// Agency Stop Choices (all customers' choices for a stop)
export interface AgencyStopChoicesDto {
  clientId: number;
  clientName?: string;
  client?: { id: number; firstName?: string; lastName?: string; email?: string; profilePhoto?: string | null };
  resourceChoice?: ClientResourceChoiceItemDto[] | ClientResourceChoiceDto | null;
  serviceChoices?: ClientServiceChoiceDto[];
  [key: string]: unknown;
}

// Agency Stop Service Summary
export interface AgencyStopServiceSummaryItemDto {
  serviceId?: number;
  serviceName?: string;
  service?: {
    id: number;
    title: string;
    subTitle?: string;
    imageUrl?: string;
    basePrice?: string;
    description?: string;
    currency?: string;
    [key: string]: unknown;
  };
  totalQuantity: number;
  unitPrice: number | string;
  totalPrice: number;
  currency?: string;
  [key: string]: unknown;
}

export interface AgencyStopServiceSummaryDto {
  services: AgencyStopServiceSummaryItemDto[];
  grandTotal: number;
  currency?: string;
  commissionRate?: number;
  commissionAmount?: number;
  [key: string]: unknown;
}

export interface ClientReservationDto {
  id: number;
  tourId: number;
  organizationId: number;
  clientId: number;
  reservationDate: string;
  numberOfParticipants: number;
  specialRequests?: string;
  estimatedCost?: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface CreateReservationDto {
  tourId: number;
  organizationId: number;
  clientId: number;
  reservationDate: string;
  numberOfParticipants: number;
  specialRequests?: string;
  estimatedCost?: number;
  metadata?: Record<string, unknown>;
}

// Service Request Types
export interface ServiceRequestDto {
  id: number;
  tourId: number;
  organizationId: number;
  clientId: number;
  requestType: 'pre_reservation' | 'service_selection';
  requestedDate: string;
  rejectionReason?: string;
  serviceDeliveryDate?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface CreateServiceRequestDto {
  tourId: number;
  organizationId: number;
  clientId: number;
  requestType: 'pre_reservation' | 'service_selection';
  requestedDate: string;
  rejectionReason?: string;
}

// Agency Public Types
export interface AgencyPublicDto {
  id: number;
  authorizedPersonId: number;
  relatedOrganizationId: number | null;
  name: string;
  description: string | null;
  phoneCountryCode: number;
  phone: string;
  phoneVerifiedAt: string | null;
  email: string;
  emailVerifiedAt: string | null;
  legalName: string;
  taxNumber: string;
  taxOffice: string;
  address: string | null;
  status: string;
  coverImageKey: string | null;
  coverImageUrl: string | null;
  uuid: string;
  photos: { id: number; imageUrl: string }[];
  createdAt: string;
  updatedAt: string;
}

// Organization Public Types
export interface OrganizationPublicDto {
  id: number;
  authorizedPersonId: number;
  name: string;
  categoryId: number;
  address: string;
  lat: number | null;
  lng: number | null;
  countryId: number | null;
  cityId: number | null;
  districtId: number | null;
  phoneCountryCode: number;
  phone: number;
  phoneVerifiedAt: string | null;
  email: string;
  emailVerifiedAt: string | null;
  description: string | null;
  socialMediaUrls: Record<string, string | null> | null;
  legalName: string;
  taxNumber: number;
  taxOffice: string;
  status: 'pending' | 'active' | 'suspended';
  totalReviews: number;
  averageRating: number;
  uuid: string;
  currency?: string | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

// Organization Review Types
export interface OrganizationReviewDto {
  id: number;
  organizationId: number;
  clientId: number;
  rating: number;
  comment?: string;
  clientName?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface CreateOrganizationReviewDto {
  clientId: number;
  rating: number;
  comment?: string;
}

// Refresh Token Types
export interface RefreshTokenDto {
  refreshToken: string;
}

export interface RefreshTokenResponseDto {
  accessToken: string;
  refreshToken: string;
}

// ============================================
// Tour Types
// ============================================

export interface ApiTourDto {
  id: number;
  uuid?: string;
  agencyId: number;
  tourCode: string;
  tourName: string;
  description?: string;
  startDate: string;
  endDate: string;
  maxParticipants?: number;
  minParticipants?: number;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  coverImageUrl?: string | null;
  galleryImages?: { id: number; imageUrl: string }[];
  stops?: ApiTourStopDto[];
  agency?: { id: number; name: string; email?: string; phone?: string };
  participants?: {
    id: number;
    clientId: number;
    clientName?: string;
    status?: string;
    notes?: string;
    pricePaid?: string;
    paidAt?: string | null;
    client?: {
      id: number;
      firstName?: string;
      lastName?: string;
      gender?: 'm' | 'f' | string;
      email?: string;
      phone?: number | string;
      phoneCountryCode?: number | string;
      profilePhoto?: string | null;
      active?: boolean;
      username?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTourPayload {
  tourCode: string;
  tourName: string;
  description?: string;
  startDate: string;
  endDate: string;
  maxParticipants?: number;
  minParticipants?: number;
}

export interface UpdateTourPayload {
  tourCode?: string;
  tourName?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  maxParticipants?: number;
  minParticipants?: number;
}

export interface ApiTourStopDto {
  id: number;
  tourId: number;
  organizationId: number;
  organization?: { id: number; name: string; address?: string; categoryId?: number };
  description?: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  showPriceToCustomer?: boolean;
  maxSpendLimit?: number | null;
  choiceDeadline?: number | null;
  choiceDeadlineTime?: string | null;
  preReservationStatus?: 'pending' | 'approved' | 'rejected' | null;
  choicesStatus?: 'in_progress' | 'submitted' | 'approved' | 'rejected' | 'revision_requested' | null;
  selectionLimits?: SelectionLimit[] | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminTourStopFinancialSummary {
  grandTotal: number;
  currency: string;
  commissionRate: number;
  commissionAmount: number;
  systemCommissionRate: number;
  systemCommissionAmount: number;
}

export interface AdminTourStopDto {
  id: number;
  tourId: number;
  organizationId: number;
  description: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  preReservationStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
  showPriceToCustomer: boolean;
  maxSpendLimit: number | null;
  choiceDeadline: number | null;
  choiceDeadlineTime: string | null;
  agencyCommissionRate: number;
  choicesStatus: 'in_progress' | 'submitted' | 'approved' | 'rejected';
  organizationChoicesNote: string | null;
  choicesSubmittedAt: string | null;
  choicesResolvedAt: string | null;
  menuSnapshot: unknown;
  systemCommissionPaid: boolean;
  systemCommissionPaidAt: string | null;
  createdAt: string;
  updatedAt: string;
  organization: {
    id: number;
    uuid: string;
    name: string;
    email: string;
    phone: number;
    phoneCountryCode: number;
    address: string;
    lat: number;
    lng: number;
    legalName: string;
    taxNumber: number;
    taxOffice: string;
    status: string;
    categoryId: number;
    countryId: number;
    cityId: number;
    districtId: number;
    description: string;
    socialMediaUrls: Record<string, string>;
    currency: string;
    agencyCommissionRate: number;
    totalReviews: number;
    averageRating: number;
    coverImageKey: string | null;
    authorizedPersonId: number;
    relatedAgencyId: number | null;
    createdAt: string;
    updatedAt: string;
  };
  tour: {
    id: number;
    uuid: string;
    agencyId: number;
    tourCode: string;
    tourName: string;
    description: string;
    startDate: string;
    endDate: string;
    maxParticipants: number;
    minParticipants: number;
    currentParticipants: number;
    status: string;
    coverImageKey: string | null;
    metadata: unknown;
    createdAt: string;
    updatedAt: string;
    agency: {
      id: number;
      uuid: string;
      name: string;
      email: string;
      phone: number;
      phoneCountryCode: number;
      legalName: string;
      taxNumber: number;
      taxOffice: string;
      address: string;
      status: string;
      description: string;
      coverImageKey: string | null;
      authorizedPersonId: number;
      relatedOrganizationId: number | null;
      createdAt: string;
      updatedAt: string;
    };
  };
  translations: Array<{
    id: number;
    tourStopId: number;
    language: string;
    description: string;
  }>;
  financialSummary: AdminTourStopFinancialSummary;
}

export interface AdminTourStopsFilters {
  page?: number;
  limit?: number;
  lang?: string;
  organizationId?: number;
  agencyId?: number;
  tourId?: number;
  preReservationStatus?: string;
  choicesStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  systemCommissionPaid?: boolean;
}

export interface ChoiceDeadlineRemainingDto {
  tourStopId: number;
  scheduledEndTime: string;
  choiceDeadline?: number;
  deadlineTime?: string;
  choiceDeadlineTime?: string;
  remainingDays: number;
  remainingHours: number;
  remainingMinutes: number;
  isExpired: boolean;
  timeFromDeadlineToEnd?: {
    days: number;
    hours: number;
    minutes: number;
  };
}

export interface SelectionLimit {
  id: number;
  type: 'service' | 'service-category';
  max: number;
}

export interface CreateTourStopPayload {
  tourId: number;
  organizationId: number;
  description?: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  showPriceToCustomer?: boolean;
  maxSpendLimit?: number | null;
  choiceDeadlineTime?: string;
  selectionLimits?: SelectionLimit[];
}

export interface UpdateTourStopPayload {
  organizationId?: number;
  description?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  showPriceToCustomer?: boolean;
  maxSpendLimit?: number | null;
  choiceDeadlineTime?: string;
  selectionLimits?: SelectionLimit[] | null;
}

// ============================================
// Auth Storage Helpers (role-based localStorage keys)
// ============================================

export function getAuthRolePrefix(): string {
  if (typeof window === 'undefined') return 'restaurant';
  const path = window.location.pathname;
  if (path.startsWith('/customer') || path.startsWith('/login/customer')) return 'customer';
  if (path.startsWith('/admin') || path.startsWith('/login/admin')) return 'admin';
  if (path.startsWith('/agency')) return 'agency';
  return 'restaurant';
}

export function getAuthStorageKeys(rolePrefix?: string) {
  const prefix = rolePrefix || getAuthRolePrefix();
  return {
    token: `tourops_${prefix}_access_token`,
    userData: `tourops_${prefix}_user_data`,
  };
}

// ============================================
// Notification Types
// ============================================

export type NotificationTargetType = 'ALL_CLIENTS' | 'ALL_AGENCIES' | 'ALL_ORGANIZATIONS' | 'SPECIFIC_ORGANIZATION' | 'SPECIFIC_AGENCY' | 'SPECIFIC_CLIENT' | 'ORGANIZATION_CATEGORY';

export interface AdminNotificationDto {
  id: number;
  title: string;
  body: string;
  targetType: NotificationTargetType;
  targetId?: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PanelNotificationDto {
  id: number;
  title: string;
  body: string;
  imageUrl?: string;
  isRead: boolean;
  createdAt: string;
}

// ============================================
// System Commission Types
// ============================================

export type CommissionScope = 'global' | 'category' | 'organization';

export interface SystemCommissionDto {
  id: number;
  scope: CommissionScope;
  scopeId?: number;
  value: number;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  organization?: { id: number; name: string } | null;
  category?: { id: number; name: string } | null;
}

export interface CreateSystemCommissionDto {
  scope: string;
  scopeId?: number;
  value: number;
  description?: string;
  active?: boolean;
}

export interface UpdateSystemCommissionDto {
  scope?: string;
  scopeId?: number;
  value?: number;
  description?: string;
  active?: boolean;
}

// ============================================
// Ticket Messaging Types
// ============================================

export type TicketCategory = 'complaint' | 'request' | 'suggestion';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketSenderType = 'client' | 'agency_user' | 'system_admin';

export interface TicketAttachmentDto {
  key: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface TicketMessageDto {
  id: number;
  ticketId: number;
  senderType: TicketSenderType;
  senderId: number;
  content: string;
  attachments: TicketAttachmentDto[] | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface TicketDto {
  id: number;
  tourId: number;
  clientId: number;
  agencyId: number;
  category: TicketCategory;
  status: TicketStatus;
  subject: string;
  createdAt: string;
  updatedAt: string;
  tour?: { id: number; tourName: string; tourCode: string; startDate?: string; endDate?: string };
  client?: { id: number; firstName: string; lastName: string; email?: string };
  agency?: { id: number; name: string };
  messages?: TicketMessageDto[];
  messagesMeta?: { page: number; limit: number; totalCount: number; totalPages: number };
}

export interface TicketListResponseDto {
  data: TicketDto[];
  meta: { page: number; limit: number; totalCount: number; totalPages: number };
}

export interface CreateTicketDto {
  tourId: number;
  category: TicketCategory;
  subject: string;
  content: string;
  attachments?: File[];
}

// ============================================
// API Client
// ============================================

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private onUnauthorizedCallback: (() => void) | null = null;

  constructor(baseUrl: string) {
    // Ensure baseUrl is a valid URL and remove trailing slash
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    if (!this.baseUrl.startsWith('http')) {
      this.baseUrl = `https://${this.baseUrl}`;
    }
  }

  /** Register a callback that will be invoked on 401 Unauthorized responses */
  setOnUnauthorized(callback: (() => void) | null) {
    this.onUnauthorizedCallback = callback;
  }

  // Her zaman localStorage'dan güncel token'ı oku
  private resolveToken(rolePrefix?: string): string | null {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(getAuthStorageKeys(rolePrefix).token);
      if (stored) {
        this.accessToken = stored;
      }
    }
    return this.accessToken;
  }

  setAccessToken(token: string | null, rolePrefix?: string) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      const key = getAuthStorageKeys(rolePrefix).token;
      if (token) {
        localStorage.setItem(key, token);
      } else {
        localStorage.removeItem(key);
      }
    }
  }

  getAccessToken(): string | null {
    return this.resolveToken();
  }

  /** Check if response is 401 Unauthorized — if so, trigger logout */
  private checkUnauthorized(status: number): boolean {
    if (status === 401) {
      if (this.onUnauthorizedCallback) {
        this.onUnauthorizedCallback();
      } else {
        // Fallback: clear tokens and hard redirect
        this.logout();
        if (typeof window !== 'undefined') {
          const prefix = getAuthRolePrefix();
          const loginPaths: Record<string, string> = {
            customer: '/login/customer',
            admin: '/login/admin',
            agency: '/agency/login',
            restaurant: '/login',
          };
          window.location.href = loginPaths[prefix] || '/login';
        }
      }
      return true;
    }
    return false;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    lang: 'tr' | 'en' | 'de' = 'tr',
    skipLang = false
  ): Promise<T> {
    let fullUrl = `${this.baseUrl}${endpoint}`;
    if (!skipLang) {
      fullUrl += `${fullUrl.includes('?') ? '&' : '?'}lang=${lang}`;
    }
    const url = fullUrl;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.resolveToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const jsonResponse = await response.json().catch(() => ({
      message: 'Bir hata oluştu',
      statusCode: response.status,
    }));

    if (!response.ok) {
      if (this.checkUnauthorized(response.status)) {
        throw new Error('Oturum süresi doldu');
      }
      // API error format: { errorMessage: { client: "...", system: "..." } }
      const errorMessage =
        jsonResponse.errorMessage?.client ||
        jsonResponse.errorMessage?.system ||
        jsonResponse.message ||
        'API isteği başarısız';
      throw new Error(errorMessage);
    }

    // API response'u { status, data, ... } formatinda geliyor, data'yi dondur
    if (jsonResponse.data !== undefined) {
      return jsonResponse.data as T;
    }

    return jsonResponse as T;
  }

  // ============================================
  // Auth - Organization (Restaurant) - Login (sadece email)
  // ============================================

  async organizationLogin(email: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>('/auth/organization/login-register', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }, lang);
  }

  // ============================================
  // Auth - Organization (Restaurant) - Register (tum bilgiler)
  // ============================================

  async organizationRegister(data: OrganizationLoginRegisterDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>('/auth/organization/login-register', {
      method: 'POST',
      body: JSON.stringify(data),
    }, lang);
  }

  async organizationVerifyOtp(data: OtpVerifyDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    const response = await this.request<LoginResponseDto>('/auth/organization/login-or-register/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    }, lang);

    // Store token on successful verification
    if (response.accessToken) {
      this.setAccessToken(response.accessToken, 'restaurant');
    }

    return response;
  }

  // ============================================
  // Auth - Agency (Acente) - Login (sadece email)
  // ============================================

  async agencyLogin(email: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>('/auth/agency/login-register', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }, lang);
  }

  // ============================================
  // Auth - Agency (Acente) - Register (tum bilgiler)
  // ============================================

  async agencyRegister(data: AgencyLoginRegisterDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>('/auth/agency/login-register', {
      method: 'POST',
      body: JSON.stringify(data),
    }, lang);
  }

  async agencyVerifyOtp(data: OtpVerifyDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    const response = await this.request<LoginResponseDto>('/auth/agency/login-or-register/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    }, lang);

    // Store token on successful verification
    if (response.accessToken) {
      this.setAccessToken(response.accessToken, 'agency');
    }

    return response;
  }

  // ============================================
  // Auth - Client (Acente Misafiri) - Username/Password Login
  // ============================================

  async clientLoginUsername(username: string, password: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    const response = await this.request<LoginResponseDto>('/auth/client/login-username', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }, lang);

    // Store token on successful login
    if (response.accessToken) {
      this.setAccessToken(response.accessToken, 'customer');
    }

    return response;
  }

  // Client Email Login/Register (OTP-based)
  async clientLoginRegister(email: string, firstName?: string, lastName?: string, agencyUuid?: string, tourUuid?: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    const body: Record<string, string> = { email };
    if (firstName) body.firstName = firstName;
    if (lastName) body.lastName = lastName;
    if (agencyUuid) body.agencyUuid = agencyUuid;
    if (tourUuid) body.tourUuid = tourUuid;

    return this.request<{ message: string }>('/auth/client/login-register', {
      method: 'POST',
      body: JSON.stringify(body),
    }, lang);
  }

  async clientLoginRegisterVerify(email: string, otp: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    const response = await this.request<LoginResponseDto>('/auth/client/login-register/verify', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }, lang);

    if (response.accessToken) {
      this.setAccessToken(response.accessToken, 'customer');
    }

    return response;
  }

  async getClientProfile(lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ClientProfileDto>('/auth/client/profile', {
      method: 'GET',
    }, lang);
  }

  async updateClientProfile(data: UpdateClientProfileDto, profilePhoto?: File, lang: 'tr' | 'en' | 'de' = 'tr') {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });
    if (profilePhoto) {
      formData.append('profilePhoto', profilePhoto);
    }

    const url = `${this.baseUrl}/auth/client/profile?lang=${lang}`;

    const headers: HeadersInit = {};
    const token = this.resolveToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: formData,
    });

    const jsonResponse = await response.json().catch(() => ({
      message: 'Bir hata oluştu',
      statusCode: response.status,
    }));

    if (!response.ok) {
      if (this.checkUnauthorized(response.status)) {
        throw new Error('Oturum süresi doldu');
      }
      const errorMessage =
        jsonResponse.errorMessage?.client ||
        jsonResponse.errorMessage?.system ||
        jsonResponse.message ||
        'API isteği başarısız';
      throw new Error(errorMessage);
    }

    if (jsonResponse.data !== undefined) {
      return jsonResponse.data as ClientProfileDto;
    }
    return jsonResponse as ClientProfileDto;
  }

  // ============================================
  // Client - Tours
  // ============================================

  async getClientTours(agencyId: number, page = 1, limit = 10, lang: 'tr' | 'en' | 'de' = 'tr') {
    // Note: /tours/agency/{agencyId} endpoint doesn't exist in current backend
    // Falling back to /agency/tours which returns agency's tours
    try {
      return await this.request<PaginatedResponse<ClientTourDto>>(`/agency/tours?page=${page}&limit=${limit}`, {
        method: 'GET',
      }, lang);
    } catch {
      // Return empty data if endpoint fails
      return { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } } as PaginatedResponse<ClientTourDto>;
    }
  }

  async getClientTourById(tourId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ClientTourDto>(`/tours/${tourId}`, {
      method: 'GET',
    }, lang);
  }

  // ============================================
  // Client - Reservations
  // ============================================

  async getClientReservations(clientId: string, page = 1, limit = 10) {
    return this.request<PaginatedResponse<ClientReservationDto>>(`/reservations/client/${clientId}?page=${page}&limit=${limit}`, {
      method: 'GET',
    }, 'tr', true);
  }

  async createReservation(data: CreateReservationDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ClientReservationDto>('/reservations', {
      method: 'POST',
      body: JSON.stringify(data),
    }, lang);
  }

  async cancelReservation(reservationId: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ClientReservationDto>(`/reservations/${reservationId}/cancel`, {
      method: 'PUT',
    }, lang);
  }

  async getReservationById(reservationId: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ClientReservationDto>(`/reservations/${reservationId}`, {
      method: 'GET',
    }, lang);
  }

  async getUpcomingReservations(page = 1, limit = 10, days?: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (days) params.set('days', String(days));
    return this.request<PaginatedResponse<ClientReservationDto>>(`/reservations/upcoming?${params}`, {
      method: 'GET',
    }, lang);
  }

  // ============================================
  // Client - Service Requests
  // ============================================

  async createServiceRequest(data: CreateServiceRequestDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ServiceRequestDto>('/service-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }, lang);
  }

  async getServiceRequests(page = 1, limit = 10, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<PaginatedResponse<ServiceRequestDto>>(`/service-requests?page=${page}&limit=${limit}`, {
      method: 'GET',
    }, lang);
  }

  async getServiceRequestById(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ServiceRequestDto>(`/service-requests/${id}`, {
      method: 'GET',
    }, lang);
  }

  async getServiceRequestsByClient(clientId: number, page = 1, limit = 10, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<PaginatedResponse<ServiceRequestDto>>(`/service-requests/client/${clientId}?page=${page}&limit=${limit}`, {
      method: 'GET',
    }, lang);
  }

  async getServiceRequestsByStatus(status: string, page = 1, limit = 10, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<PaginatedResponse<ServiceRequestDto>>(`/service-requests/status/${status}?page=${page}&limit=${limit}`, {
      method: 'GET',
    }, lang);
  }

  async getServiceRequestsByTour(tourId: number, page = 1, limit = 10) {
    return this.request<PaginatedResponse<ServiceRequestDto>>(`/service-requests/tour/${tourId}?page=${page}&limit=${limit}`, {
      method: 'GET',
    }, 'tr', true);
  }

  async cancelServiceRequest(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ServiceRequestDto>(`/service-requests/${id}/cancel`, {
      method: 'PUT',
    }, lang);
  }

  async retryServiceRequest(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ServiceRequestDto>(`/service-requests/${id}/retry`, {
      method: 'PUT',
    }, lang);
  }

  // ============================================
  // Agencies - Public
  // ============================================

  async getAgencyPublic(uuid: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<AgencyPublicDto>(`/agencies/public/${uuid}`, {
      method: 'GET',
    }, lang);
  }

  // ============================================
  // Organizations - Public
  // ============================================

  async getOrganizationsPublic(page = 1, limit = 10, name?: string, lang: 'tr' | 'en' | 'de' = 'tr', filters?: { cityId?: number; districtId?: number; categoryId?: number; sortByCommission?: string; agencyId?: number }) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit), status: 'active' });
    if (name) params.set('name', name);
    if (filters?.cityId) params.set('cityId', String(filters.cityId));
    if (filters?.districtId) params.set('districtId', String(filters.districtId));
    if (filters?.categoryId) params.set('categoryId', String(filters.categoryId));
    if (filters?.sortByCommission) params.set('sortByCommission', filters.sortByCommission);
    if (filters?.agencyId) params.set('agencyId', String(filters.agencyId));
    return this.request<PaginatedResponse<OrganizationPublicDto>>(`/organizations?${params}`, {
      method: 'GET',
    }, lang);
  }

  async getOrganizationById(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<OrganizationPublicDto>(`/organizations/${id}`, {
      method: 'GET',
    }, lang);
  }

  async getOrganizationMenu(orgId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ClientStopMenuCategoryDto[]>(`/service-categories/menu?organizationId=${orgId}`, {
      method: 'GET',
    }, lang);
  }

  async getOrganizationsByCategory(categoryId: number, page = 1, limit = 10, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<PaginatedResponse<OrganizationPublicDto>>(`/organizations/category/${categoryId}?page=${page}&limit=${limit}`, {
      method: 'GET',
    }, lang);
  }

  async getOrganizationsByCity(cityId: number, page = 1, limit = 10, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<PaginatedResponse<OrganizationPublicDto>>(`/organizations/city/${cityId}?page=${page}&limit=${limit}`, {
      method: 'GET',
    }, lang);
  }

  // ============================================
  // Organizations - Reviews
  // ============================================

  async createOrganizationReview(organizationId: number, data: CreateOrganizationReviewDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<OrganizationReviewDto>(`/organizations/${organizationId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, lang);
  }

  async getOrganizationReviews(organizationId: number, page = 1, limit = 10, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<PaginatedResponse<OrganizationReviewDto>>(`/organizations/${organizationId}/reviews?page=${page}&limit=${limit}`, {
      method: 'GET',
    }, lang);
  }

  // ============================================
  // Auth - Refresh Token
  // ============================================

  async refreshToken(refreshToken: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<RefreshTokenResponseDto>('/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }, lang);
  }

  // ============================================
  // Auth - Profile
  // ============================================

  async getProfile(lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<LoginResponseDto['user']>('/auth/profile', {
      method: 'GET',
    }, lang);
  }

  // ============================================
  // Auth - Logout
  // ============================================

  logout() {
    this.accessToken = null;
    if (typeof window !== 'undefined') {
      const allPrefixes = ['restaurant', 'agency', 'customer', 'admin'];
      for (const prefix of allPrefixes) {
        const keys = getAuthStorageKeys(prefix);
        localStorage.removeItem(keys.token);
        localStorage.removeItem(keys.userData);
      }
      localStorage.removeItem('tourops_auth_user_id');
    }
  }

  // ============================================
  // Organizations - Invite User
  // ============================================

  async inviteUser(data: InviteUserDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>('/organizations/invite-user', {
      method: 'POST',
      body: JSON.stringify(data),
    }, lang);
  }

  // ============================================
  // Invitations - Accept
  // ============================================

  async acceptInvitation(token: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    console.log('acceptInvitation: Making request...');
    const response = await this.request<LoginResponseDto>(`/invitations/accept/${token}`, {
      method: 'GET',
    }, lang);
    console.log('acceptInvitation: Response received:', response);

    // Store token on successful acceptance
    if (response?.accessToken) {
      console.log('acceptInvitation: Setting access token');
      this.setAccessToken(response.accessToken, 'restaurant');
    } else {
      console.warn('acceptInvitation: No accessToken in response');
    }

    return response;
  }

  // Get my sent invitations
  async getMyInvitations(page = 1, limit = 10) {
    return this.request<PaginatedResponse<InvitationDto>>(`/invitations/my-invitations?page=${page}&limit=${limit}`, {
      method: 'GET',
    }, 'tr', true); // skipLang - this endpoint doesn't accept lang param
  }

  // Cancel invitation
  async cancelInvitation(invitationId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/invitations/${invitationId}/cancel`, {
      method: 'DELETE',
    }, lang);
  }

  // ============================================
  // Organizations - Register (Create)
  // ============================================

  async organizationRegisterBusiness(
    data: OrganizationRegisterDto,
    coverImage?: File,
    galleryImages?: File[],
    lang: 'tr' | 'en' | 'de' = 'tr'
  ) {
    const formData = new FormData();

    // Add all required fields
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    // Add cover image if provided
    if (coverImage) {
      formData.append('coverImage', coverImage);
    }

    // Add gallery images if provided
    if (galleryImages && galleryImages.length > 0) {
      galleryImages.forEach((img) => {
        formData.append('galleryImages', img);
      });
    }

    const url = `${this.baseUrl}/organizations/register?lang=${lang}`;

    const headers: HeadersInit = {};
    const token = this.resolveToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    const jsonResponse = await response.json().catch(() => ({
      message: 'Bir hata oluştu',
      statusCode: response.status,
    }));

    if (!response.ok) {
      if (this.checkUnauthorized(response.status)) {
        throw new Error('Oturum süresi doldu');
      }
      const errorMessage =
        jsonResponse.errorMessage?.client ||
        jsonResponse.errorMessage?.system ||
        jsonResponse.message ||
        'API isteği başarısız';
      throw new Error(errorMessage);
    }

    // Registration returns accessToken - save it
    const responseData = jsonResponse.data as OrganizationRegisterResponseDto;
    if (responseData.accessToken) {
      this.setAccessToken(responseData.accessToken, 'restaurant');
    }

    return responseData;
  }

  // ============================================
  // Agencies - Register (Create)
  // ============================================

  async agencyRegisterBusiness(
    data: AgencyRegisterDto,
    coverImage?: File,
    galleryImages?: File[],
    lang: 'tr' | 'en' | 'de' = 'tr'
  ) {
    const formData = new FormData();

    // Add all required fields
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    // Add cover image if provided
    if (coverImage) {
      formData.append('coverImage', coverImage);
    }

    // Add gallery images if provided
    if (galleryImages && galleryImages.length > 0) {
      galleryImages.forEach((img) => {
        formData.append('galleryImages', img);
      });
    }

    const url = `${this.baseUrl}/agencies/register?lang=${lang}`;

    const headers: HeadersInit = {};
    const token = this.resolveToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    const jsonResponse = await response.json().catch(() => ({
      message: 'Bir hata oluştu',
      statusCode: response.status,
    }));

    if (!response.ok) {
      if (this.checkUnauthorized(response.status)) {
        throw new Error('Oturum süresi doldu');
      }
      const errorMessage =
        jsonResponse.errorMessage?.client ||
        jsonResponse.errorMessage?.system ||
        jsonResponse.message ||
        'API isteği başarısız';
      throw new Error(errorMessage);
    }

    // Registration returns accessToken - save it
    const responseData = jsonResponse.data as AgencyRegisterResponseDto;
    if (responseData.accessToken) {
      this.setAccessToken(responseData.accessToken, 'agency');
    }

    return responseData;
  }

  // ============================================
  // Agencies - Get My Agency
  // ============================================

  async getMyAgency() {
    return this.request<AgencyResponseDto>('/agencies/my', {
      method: 'GET',
    }, 'tr', true); // skipLang - this endpoint doesn't accept lang param
  }

  // ============================================
  // Agencies - Update My Agency
  // ============================================

  async updateMyAgency(
    data: Partial<Pick<AgencyResponseDto, 'name' | 'description' | 'phone' | 'phoneCountryCode' | 'address'>>,
    coverImage?: File,
    lang: 'tr' | 'en' | 'de' = 'tr'
  ) {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    if (coverImage) {
      formData.append('coverImage', coverImage);
    }

    const url = `${this.baseUrl}/agencies/my?lang=${lang}`;

    const headers: HeadersInit = {};
    const token = this.resolveToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: formData,
    });

    const jsonResponse = await response.json().catch(() => ({
      message: 'Bir hata oluştu',
      statusCode: response.status,
    }));

    if (!response.ok) {
      throw new Error(jsonResponse.message || 'Acente güncellenemedi');
    }

    return jsonResponse as AgencyResponseDto;
  }

  // ============================================
  // Agencies - Invite User
  // ============================================

  async inviteAgencyUser(data: InviteUserDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>('/agencies/invite-user', {
      method: 'POST',
      body: JSON.stringify(data),
    }, lang);
  }

  // ============================================
  // Agencies - Roles
  // ============================================

  async getAgencyAvailableRoles(page = 1, limit = 100, lang: 'tr' | 'en' | 'de' = 'tr') {
    const url = `/agencies/roles?page=${page}&limit=${limit}`;
    return this.request<PaginatedResponse<RoleDto>>(url, {
      method: 'GET',
    }, lang);
  }

  // ============================================
  // Agencies - Team/Users Management
  // ============================================

  async getAgencyUsers(page = 1, limit = 100) {
    const url = `/agencies/my/users?page=${page}&limit=${limit}`;
    return this.request<PaginatedResponse<OrganizationUserDto>>(url, {
      method: 'GET',
    }, 'tr', true); // skipLang - this endpoint doesn't accept lang param
  }

  async removeAgencyUser(userId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/agencies/my/users/${userId}`, {
      method: 'DELETE',
    }, lang);
  }

  async activateAgencyUser(userId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/agencies/my/users/${userId}/activate`, {
      method: 'PATCH',
    }, lang);
  }

  async deactivateAgencyUser(userId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/agencies/my/users/${userId}/deactivate`, {
      method: 'PATCH',
    }, lang);
  }

  async assignAgencyRole(userId: number, roleId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/agencies/my/users/${userId}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId }),
    }, lang);
  }

  async removeAgencyRole(userId: number, roleId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/agencies/my/users/${userId}/roles/${roleId}`, {
      method: 'DELETE',
    }, lang);
  }

  // ============================================
  // Agencies - Clients
  // ============================================

  async getAgencyClients(page = 1, limit = 10, search?: string, tourId?: number) {
    let url = `/agencies/clients?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (tourId) url += `&tourId=${tourId}`;
    return this.request<PaginatedResponse<AgencyClientDto>>(url, {
      method: 'GET',
    }, 'tr', true);
  }

  // Note: GET /agencies/clients/{clientId} returns 404 - backend only supports list and delete
  async getAgencyClient(clientId: number) {
    return this.request<AgencyClientDto>(`/agencies/clients/${clientId}`, {
      method: 'GET',
    }, 'tr', true);
  }

  async createAgencyClient(data: CreateAgencyClientDto) {
    return this.request<{ message: string; data: AgencyClientDto }>('/agencies/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'tr', true);
  }

  async batchImportClients(file: File, lang: 'tr' | 'en' | 'de' = 'tr', tourId?: number) {
    const formData = new FormData();
    formData.append('file', file);

    const params = new URLSearchParams({ lang });
    if (tourId) params.set('tourId', String(tourId));
    const url = `${this.baseUrl}/agencies/clients/batch-import?${params.toString()}`;

    const headers: HeadersInit = {};
    const token = this.resolveToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${res.status}`);
    }

    return res.json();
  }

  async changeAgencyClientPassword(clientId: number, newPassword: string) {
    return this.request<{ message: string }>(`/clients/${clientId}/password/agency`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    }, 'tr', true);
  }

  async changeAdminClientPassword(clientId: number, newPassword: string) {
    return this.request<{ message: string }>(`/clients/${clientId}/password/admin`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    }, 'tr', true);
  }

  async deleteAgencyClient(clientId: number) {
    return this.request<{ message: string }>(`/agencies/clients/${clientId}`, {
      method: 'DELETE',
    }, 'tr', true);
  }

  // ============================================
  // Organizations - Get My Organization
  // ============================================

  async getMyOrganization(lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<OrganizationDto>('/organizations/my', {
      method: 'GET',
    }, lang);
  }

  // ============================================
  // Organizations - Update My Organization
  // ============================================

  async updateMyOrganization(
    data: OrganizationUpdateDto,
    coverImage?: File,
    lang: 'tr' | 'en' | 'de' = 'tr'
  ) {
    const formData = new FormData();

    // Strip fields not accepted by PUT /organizations/my
    const { agencyCommissionRate: _ac, ...cleanData } = data;

    Object.entries(cleanData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // socialMediaUrls is an object, need to stringify it
        if (key === 'socialMediaUrls' && typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      }
    });

    if (coverImage) {
      formData.append('coverImage', coverImage);
    }

    const url = `${this.baseUrl}/organizations/my?lang=${lang}`;

    const headers: HeadersInit = {};
    const token = this.resolveToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: formData,
    });

    const jsonResponse = await response.json().catch(() => ({
      message: 'Bir hata oluştu',
      statusCode: response.status,
    }));

    if (!response.ok) {
      if (this.checkUnauthorized(response.status)) {
        throw new Error('Oturum süresi doldu');
      }
      const errorMessage =
        jsonResponse.errorMessage?.client ||
        jsonResponse.errorMessage?.system ||
        jsonResponse.message ||
        'API isteği başarısız';
      throw new Error(errorMessage);
    }

    return jsonResponse.data as OrganizationDto;
  }

  // ============================================
  // Organizations - Photos
  // ============================================

  async getOrganizationPhotos(lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<PhotoDto[]>('/organizations/my/photos', {
      method: 'GET',
    }, lang);
  }

  async addOrganizationPhoto(image: File, lang: 'tr' | 'en' | 'de' = 'tr') {
    const formData = new FormData();
    formData.append('image', image);

    const url = `${this.baseUrl}/organizations/my/photos?lang=${lang}`;

    const headers: HeadersInit = {};
    const token = this.resolveToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    const jsonResponse = await response.json().catch(() => ({
      message: 'Bir hata oluştu',
      statusCode: response.status,
    }));

    if (!response.ok) {
      if (this.checkUnauthorized(response.status)) {
        throw new Error('Oturum süresi doldu');
      }
      const errorMessage =
        jsonResponse.errorMessage?.client ||
        jsonResponse.errorMessage?.system ||
        jsonResponse.message ||
        'API isteği başarısız';
      throw new Error(errorMessage);
    }

    return jsonResponse.data as PhotoDto;
  }

  async deleteOrganizationPhoto(photoId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/organizations/my/photos/${photoId}`, {
      method: 'DELETE',
    }, lang);
  }

  // ============================================
  // Agencies - Photos
  // ============================================

  async getAgencyPhotos(lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<PhotoDto[]>('/agencies/my/photos', {
      method: 'GET',
    }, lang);
  }

  async addAgencyPhoto(image: File, lang: 'tr' | 'en' | 'de' = 'tr') {
    const formData = new FormData();
    formData.append('image', image);

    const url = `${this.baseUrl}/agencies/my/photos?lang=${lang}`;

    const headers: HeadersInit = {};
    const token = this.resolveToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    const jsonResponse = await response.json().catch(() => ({
      message: 'Bir hata oluştu',
      statusCode: response.status,
    }));

    if (!response.ok) {
      if (this.checkUnauthorized(response.status)) {
        throw new Error('Oturum süresi doldu');
      }
      const errorMessage =
        jsonResponse.errorMessage?.client ||
        jsonResponse.errorMessage?.system ||
        jsonResponse.message ||
        'API isteği başarısız';
      throw new Error(errorMessage);
    }

    return jsonResponse.data as PhotoDto;
  }

  async deleteAgencyPhoto(photoId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/agencies/my/photos/${photoId}`, {
      method: 'DELETE',
    }, lang);
  }

  // ============================================
  // Organizations - Roles
  // ============================================

  async getOrganizationRoles(page = 1, limit = 100, lang: 'tr' | 'en' | 'de' = 'tr') {
    const url = `/organizations/roles?page=${page}&limit=${limit}`;
    return this.request<PaginatedResponse<RoleDto>>(url, {
      method: 'GET',
    }, lang);
  }

  // ============================================
  // Organizations - Team/Users Management
  // ============================================

  async getOrganizationUsers(page = 1, limit = 100) {
    const url = `/organizations/my/users?page=${page}&limit=${limit}`;
    return this.request<PaginatedResponse<OrganizationUserDto>>(url, {
      method: 'GET',
    }, 'tr', true); // skipLang - this endpoint doesn't accept lang param
  }

  async removeOrganizationUser(userId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/organizations/my/users/${userId}`, {
      method: 'DELETE',
    }, lang);
  }

  async activateOrganizationUser(userId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/organizations/my/users/${userId}/activate`, {
      method: 'PATCH',
    }, lang);
  }

  async deactivateOrganizationUser(userId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/organizations/my/users/${userId}/deactivate`, {
      method: 'PATCH',
    }, lang);
  }

  async assignRoleToUser(userId: number, roleId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/organizations/my/users/${userId}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId }),
    }, lang);
  }

  async removeRoleFromUser(userId: number, roleId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/organizations/my/users/${userId}/roles/${roleId}`, {
      method: 'DELETE',
    }, lang);
  }

  // ============================================
  // Organizations - Categories
  // ============================================

  async getOrganizationCategories(page = 1, limit = 100, lang: 'tr' | 'en' | 'de' = 'tr') {
    const url = `/organizations/categories?page=${page}&limit=${limit}`;
    return this.request<PaginatedResponse<CategoryDto>>(url, {
      method: 'GET',
    }, lang);
  }

  // ============================================
  // Locations
  // ============================================

  async getCountries(page = 1, limit = 100) {
    const url = `/locations/countries?page=${page}&limit=${limit}`;
    return this.request<PaginatedResponse<LocationDto>>(url, {
      method: 'GET',
    }, 'tr', true); // skipLang = true for locations API
  }

  async getCities(countryId?: number, page = 1, limit = 100) {
    let url = `/locations/cities?page=${page}&limit=${limit}`;
    if (countryId) {
      url += `&countryId=${countryId}`;
    }
    return this.request<PaginatedResponse<LocationDto>>(url, {
      method: 'GET',
    }, 'tr', true); // skipLang = true for locations API
  }

  async getDistricts(cityId?: number, page = 1, limit = 100) {
    let url = `/locations/districts?page=${page}&limit=${limit}`;
    if (cityId) {
      url += `&cityId=${cityId}`;
    }
    return this.request<PaginatedResponse<LocationDto>>(url, {
      method: 'GET',
    }, 'tr', true); // skipLang = true for locations API
  }

  // ============================================
  // Resources
  // ============================================

  async getResourceTypes(categoryId?: number, page = 1, limit = 100) {
    let url = `/resources/types?page=${page}&limit=${limit}`;
    if (categoryId) {
      url += `&categoryId=${categoryId}`;
    }
    return this.request<PaginatedResponse<ResourceTypeDto>>(url, {
      method: 'GET',
    }, 'tr', true);
  }

  async getResourceTypeById(id: number) {
    return this.request<ResourceTypeDto>(`/resources/types/${id}`, {
      method: 'GET',
    }, 'tr', true);
  }

  async getResourceLayout(parentId?: number | null, lang: 'tr' | 'en' | 'de' = 'tr', organizationId?: number) {
    let url = '/resources/layout';
    const params: string[] = [];
    if (parentId !== undefined && parentId !== null) params.push(`parentId=${parentId}`);
    if (organizationId !== undefined) params.push(`organizationId=${organizationId}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    return this.request<ResourceDto[]>(url, {
      method: 'GET',
    }, lang);
  }

  async getResourceById(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ResourceDto>(`/resources/${id}`, {
      method: 'GET',
    }, lang);
  }

  async getResourceChildren(parentId: number, page = 1, limit = 100) {
    return this.request<PaginatedResponse<ResourceDto>>(`/resources/${parentId}/children?page=${page}&limit=${limit}`, {
      method: 'GET',
    }, 'tr', true); // skipLang - this endpoint doesn't accept lang param
  }

  async createResource(data: CreateResourceDto, image?: File) {
    const formData = new FormData();

    // Add all fields
    formData.append('name', data.name);
    formData.append('resourceTypeId', String(data.resourceTypeId));

    if (data.parentId !== undefined && data.parentId !== null) {
      formData.append('parentId', String(data.parentId));
    }
    if (data.capacity !== undefined) {
      formData.append('capacity', String(data.capacity));
    }
    if (data.order !== undefined) {
      formData.append('order', String(data.order));
    }
    if (data.coordinates) {
      // Backend tek bir "coordinates" string bekliyor: "x,y" formatında
      if (typeof data.coordinates === 'string') {
        formData.append('coordinates', data.coordinates);
      } else {
        formData.append('coordinates', `${data.coordinates.x},${data.coordinates.y}`);
      }
    }
    if (data.serviceStartAt) {
      formData.append('serviceStartAt', data.serviceStartAt);
    }
    if (data.serviceEndAt) {
      formData.append('serviceEndAt', data.serviceEndAt);
    }
    if (data.serviceDurationMinutes !== undefined) {
      formData.append('serviceDurationMinutes', String(data.serviceDurationMinutes));
    }
    if (data.width !== undefined) {
      formData.append('width', String(data.width));
    }
    if (data.height !== undefined) {
      formData.append('height', String(data.height));
    }
    if (data.rotation !== undefined) {
      formData.append('rotation', String(data.rotation));
    }
    if (data.color) {
      formData.append('color', data.color);
    }
    if (data.approvePreReservationAutomatically !== undefined) {
      formData.append('approvePreReservationAutomatically', String(data.approvePreReservationAutomatically));
    }
    if (image) {
      formData.append('image', image);
    }

    const url = `${this.baseUrl}/resources`;
    // Note: /resources endpoint doesn't accept lang param

    const headers: HeadersInit = {};
    const token = this.resolveToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    const jsonResponse = await response.json().catch(() => ({
      message: 'Bir hata oluştu',
      statusCode: response.status,
    }));

    if (!response.ok) {
      if (this.checkUnauthorized(response.status)) {
        throw new Error('Oturum süresi doldu');
      }
      const errorMessage =
        jsonResponse.errorMessage?.client ||
        jsonResponse.errorMessage?.system ||
        jsonResponse.message ||
        'API isteği başarısız';
      throw new Error(errorMessage);
    }

    return jsonResponse.data as ResourceDto;
  }

  async updateResource(id: number, data: UpdateResourceDto, image?: File) {
    const formData = new FormData();

    if (data.name !== undefined) formData.append('name', data.name);
    if (data.capacity !== undefined) formData.append('capacity', String(data.capacity));
    if (data.order !== undefined) formData.append('order', String(data.order));
    if (data.coordinates) {
      // Backend tek bir "coordinates" string bekliyor: "x,y" formatında
      if (typeof data.coordinates === 'string') {
        formData.append('coordinates', data.coordinates);
      } else {
        formData.append('coordinates', `${data.coordinates.x},${data.coordinates.y}`);
      }
    }
    if (data.serviceStartAt !== undefined) formData.append('serviceStartAt', data.serviceStartAt);
    if (data.serviceEndAt !== undefined) formData.append('serviceEndAt', data.serviceEndAt);
    if (data.serviceDurationMinutes !== undefined) {
      formData.append('serviceDurationMinutes', String(data.serviceDurationMinutes));
    }
    if (data.width !== undefined) formData.append('width', String(data.width));
    if (data.height !== undefined) formData.append('height', String(data.height));
    if (data.rotation !== undefined) formData.append('rotation', String(data.rotation));
    if (data.color !== undefined) formData.append('color', data.color);
    if (data.approvePreReservationAutomatically !== undefined) {
      formData.append('approvePreReservationAutomatically', String(data.approvePreReservationAutomatically));
    }
    if (data.active !== undefined) formData.append('active', String(data.active));
    if (image) formData.append('image', image);

    const url = `${this.baseUrl}/resources/${id}`;
    // Note: /resources endpoint doesn't accept lang param

    const headers: HeadersInit = {};
    const token = this.resolveToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: formData,
    });

    const jsonResponse = await response.json().catch(() => ({
      message: 'Bir hata oluştu',
      statusCode: response.status,
    }));

    if (!response.ok) {
      if (this.checkUnauthorized(response.status)) {
        throw new Error('Oturum süresi doldu');
      }
      const errorMessage =
        jsonResponse.errorMessage?.client ||
        jsonResponse.errorMessage?.system ||
        jsonResponse.message ||
        'API isteği başarısız';
      throw new Error(errorMessage);
    }

    return jsonResponse.data as ResourceDto;
  }

  async deleteResource(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/resources/${id}`, {
      method: 'DELETE',
    }, lang);
  }

  async bulkDeleteResources(ids: number[], lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ deleted: number[]; errors: { id: number; message: string }[] }>('/resources/bulk', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    }, lang);
  }

  async moveResource(id: number, newParentId: number | null, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ResourceDto>(`/resources/${id}/move`, {
      method: 'PUT',
      body: JSON.stringify({ newParentId }),
    }, lang);
  }

  async activateResource(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ResourceDto>(`/resources/${id}/activate`, {
      method: 'PUT',
    }, lang);
  }

  async deactivateResource(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ResourceDto>(`/resources/${id}/deactivate`, {
      method: 'PUT',
    }, lang);
  }

  // ============================================
  // Service Categories
  // ============================================

  async getServiceCategories(lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ServiceCategoryDto[]>(`/service-categories/tree`, {
      method: 'GET',
    }, lang);
  }

  async getServiceCategoriesMenu(lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ClientStopMenuCategoryDto[]>(`/service-categories/menu`, {
      method: 'GET',
    }, lang);
  }

  async getServiceCategory(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ServiceCategoryDto>(`/service-categories/${id}`, {
      method: 'GET',
    }, lang);
  }

  async createServiceCategory(data: CreateServiceCategoryDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ServiceCategoryDto>('/service-categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }, lang);
  }

  async updateServiceCategory(id: number, data: UpdateServiceCategoryDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ServiceCategoryDto>(`/service-categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, lang);
  }

  async deleteServiceCategory(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/service-categories/${id}`, {
      method: 'DELETE',
    }, lang);
  }

  // ============================================
  // Services
  // ============================================

  async getService(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ServiceDto>(`/services/${id}`, {
      method: 'GET',
    }, lang);
  }

  async createService(data: CreateServiceDto, image?: File) {
    const formData = new FormData();
    formData.append('serviceCategoryId', String(data.serviceCategoryId));
    formData.append('title', data.title);
    formData.append('basePrice', String(data.basePrice));
    formData.append('priceType', data.priceType);
    if (data.subTitle) formData.append('subTitle', data.subTitle);
    if (data.description) formData.append('description', data.description);
    if (data.contentsDescription) formData.append('contentsDescription', data.contentsDescription);
    if (data.estimatedDurationMinutes !== undefined) {
      formData.append('estimatedDurationMinutes', String(data.estimatedDurationMinutes));
    }
    if (data.dailyStock !== undefined) {
      formData.append('dailyStock', data.dailyStock === null ? 'null' : String(data.dailyStock));
    }
    if (image) formData.append('image', image);

    const url = `${this.baseUrl}/services`;
    const headers: HeadersInit = {};
    const token = this.resolveToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(url, { method: 'POST', headers, body: formData });
    const jsonResponse = await response.json().catch(() => ({ message: 'Bir hata oluştu', statusCode: response.status }));
    if (!response.ok) {
      if (this.checkUnauthorized(response.status)) {
        throw new Error('Oturum süresi doldu');
      }
      const errorMessage = jsonResponse.errorMessage?.client || jsonResponse.errorMessage?.system || jsonResponse.message || 'API isteği başarısız';
      throw new Error(errorMessage);
    }
    return (jsonResponse.data !== undefined ? jsonResponse.data : jsonResponse) as ServiceDto;
  }

  async updateService(id: number, data: UpdateServiceDto, image?: File) {
    const formData = new FormData();
    if (data.title !== undefined) formData.append('title', data.title);
    if (data.subTitle !== undefined) formData.append('subTitle', data.subTitle);
    if (data.description !== undefined) formData.append('description', data.description);
    if (data.contentsDescription !== undefined) formData.append('contentsDescription', data.contentsDescription);
    if (data.basePrice !== undefined) formData.append('basePrice', String(data.basePrice));
    if (data.priceType !== undefined) formData.append('priceType', data.priceType);
    if (data.estimatedDurationMinutes !== undefined) {
      formData.append('estimatedDurationMinutes', String(data.estimatedDurationMinutes));
    }
    if (data.serviceCategoryId !== undefined) {
      formData.append('serviceCategoryId', String(data.serviceCategoryId));
    }
    if (data.dailyStock !== undefined) {
      formData.append('dailyStock', data.dailyStock === null ? 'null' : String(data.dailyStock));
    }
    if (image) formData.append('image', image);

    const url = `${this.baseUrl}/services/${id}`;
    const headers: HeadersInit = {};
    const token = this.resolveToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(url, { method: 'PUT', headers, body: formData });
    const jsonResponse = await response.json().catch(() => ({ message: 'Bir hata oluştu', statusCode: response.status }));
    if (!response.ok) {
      if (this.checkUnauthorized(response.status)) {
        throw new Error('Oturum süresi doldu');
      }
      const errorMessage = jsonResponse.errorMessage?.client || jsonResponse.errorMessage?.system || jsonResponse.message || 'API isteği başarısız';
      throw new Error(errorMessage);
    }
    return (jsonResponse.data !== undefined ? jsonResponse.data : jsonResponse) as ServiceDto;
  }

  async deleteService(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/services/${id}`, {
      method: 'DELETE',
    }, lang);
  }

  async getServicesByCategory(categoryId: number, page = 1, limit = 100, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<PaginatedResponse<ServiceDto>>(`/services/category/${categoryId}?page=${page}&limit=${limit}`, {
      method: 'GET',
    }, lang);
  }

  async getServicesByOrganization(orgId: number, page = 1, limit = 100, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<PaginatedResponse<ServiceDto>>(`/services/organization/${orgId}?page=${page}&limit=${limit}`, {
      method: 'GET',
    }, lang);
  }

  async getActiveServicesByOrganization(orgId: number, page = 1, limit = 100, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<PaginatedResponse<ServiceDto>>(`/services/organization/${orgId}/active?page=${page}&limit=${limit}`, {
      method: 'GET',
    }, lang);
  }

  // ============================================
  // Organization Pre-Reservations
  // ============================================

  async getOrgPreReservations(status?: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    let url = `/organization/pre-reservations`;
    if (status) url += `?status=${status}`;
    return this.request<any>(url, { method: 'GET' }, lang);
  }

  async getOrgPreReservationDetail(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<any>(`/organization/pre-reservations/${id}`, { method: 'GET' }, lang);
  }

  async approveOrgPreReservation(id: number, choiceDeadlineTime?: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    const body: Record<string, unknown> = {};
    if (choiceDeadlineTime) {
      body.choiceDeadlineTime = choiceDeadlineTime;
    }
    return this.request<any>(`/organization/pre-reservations/${id}/approve`, {
      method: 'PUT',
      ...(Object.keys(body).length > 0 ? { body: JSON.stringify(body) } : {}),
    }, lang);
  }

  async rejectOrgPreReservation(id: number, rejectionReason: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<any>(`/organization/pre-reservations/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ rejectionReason }),
    }, lang);
  }

  async getOrgChoices(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<AgencyStopChoicesDto[]>(`/organization/pre-reservations/${id}/choices`, {
      method: 'GET',
    }, lang);
  }

  async getOrgServiceSummary(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<AgencyStopServiceSummaryDto>(`/organization/pre-reservations/${id}/service-summary`, {
      method: 'GET',
    }, lang);
  }

  async approveOrgChoices(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<any>(`/organization/pre-reservations/${id}/approve-choices`, {
      method: 'PUT',
    }, lang);
  }

  async rejectOrgChoices(id: number, note: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<any>(`/organization/pre-reservations/${id}/reject-choices`, {
      method: 'PUT',
      body: JSON.stringify({ note }),
    }, lang);
  }

  async requestOrgChoicesRevision(id: number, note: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<any>(`/organization/pre-reservations/${id}/request-choices-revision`, {
      method: 'PUT',
      body: JSON.stringify({ note }),
    }, lang);
  }

  // ============================================
  // Admin - Auth
  // ============================================

  async adminLogin(email: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }, lang);
  }

  async adminVerifyOtp(data: AdminLoginVerifyDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    const response = await this.request<LoginResponseDto>('/auth/admin/login/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    }, lang);

    // Store token on successful verification
    if (response.accessToken) {
      this.setAccessToken(response.accessToken, 'admin');
    }

    return response;
  }

  // ============================================
  // Admin - Companies
  // ============================================

  async getCompanies(filters: CompanyFilters) {
    const params = new URLSearchParams();
    params.set('type', filters.type);
    if (filters.status) params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.lang) params.set('lang', filters.lang);

    return this.request<PaginatedResponse<CompanyDto>>(`/admin/companies?${params.toString()}`, {
      method: 'GET',
    }, filters.lang || 'tr', true); // skipLang since we add it manually
  }

  async getOrganizationsList(filters: { name?: string; status?: CompanyStatus; page?: number; limit?: number; lang?: 'tr' | 'en' | 'de'; sortByCommission?: 'ASC' | 'DESC' }) {
    const params = new URLSearchParams();
    if (filters.name) params.set('name', filters.name);
    if (filters.status) params.set('status', filters.status);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.sortByCommission) params.set('sortByCommission', filters.sortByCommission);

    return this.request<PaginatedResponse<CompanyDto>>(`/organizations?${params.toString()}`, {
      method: 'GET',
    }, filters.lang || 'tr');
  }

  async getAgenciesList(filters: { name?: string; status?: CompanyStatus; page?: number; limit?: number; lang?: 'tr' | 'en' | 'de' }) {
    const params = new URLSearchParams();
    if (filters.name) params.set('name', filters.name);
    if (filters.status) params.set('status', filters.status);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));

    return this.request<PaginatedResponse<CompanyDto>>(`/agencies?${params.toString()}`, {
      method: 'GET',
    }, filters.lang || 'tr');
  }

  async getAgencyById(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<AgencyResponseDto & { coverImageKey?: string | null; coverImageUrl?: string | null }>(`/agencies/${id}`, {}, lang);
  }

  async getOrganizationByIdAdmin(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<OrganizationDto>(`/organizations/${id}`, {}, lang);
  }

  async updateCompanyStatus(data: UpdateCompanyStatusDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>('/admin/companies/status', {
      method: 'PUT',
      body: JSON.stringify(data),
    }, lang);
  }

  async adminUpdateAgency(id: number, data: AdminUpdateAgencyDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<AgencyResponseDto>(`/agencies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, lang);
  }

  async adminUpdateOrganization(id: number, data: AdminUpdateOrganizationDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    const { agencyCommissionRate: _ac, ...rest } = data;
    const payload = {
      ...rest,
      lat: rest.lat != null && rest.lat !== '' ? Number(rest.lat) : undefined,
      lng: rest.lng != null && rest.lng !== '' ? Number(rest.lng) : undefined,
    };
    return this.request<OrganizationDto>(`/admin/organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }, lang);
  }

  async adminDeleteAgency(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/agencies/${id}`, {
      method: 'DELETE',
    }, lang);
  }

  async adminDeleteOrganization(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/admin/organizations/${id}`, {
      method: 'DELETE',
    }, lang);
  }

  // Hızlı işletme oluşturma (oturma düzeni + menü dahil)
  async adminQuickCreateOrganization(data: AdminQuickCreateOrganizationDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<AdminQuickCreateOrganizationResponseDto>('/admin/organizations/quick-create', {
      method: 'POST',
      body: JSON.stringify(data),
    }, lang);
  }

  // ============================================
  // Admin - İşletme Hizmet Kategorileri Yönetimi
  // ============================================

  async getAdminOrgServiceCategories(orgId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ServiceCategoryDto[]>(`/admin/organizations/${orgId}/service-categories`, {
      method: 'GET',
    }, lang);
  }

  async createAdminOrgServiceCategory(orgId: number, data: CreateServiceCategoryDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ServiceCategoryDto>(`/admin/organizations/${orgId}/service-categories`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, lang);
  }

  async updateAdminOrgServiceCategory(orgId: number, categoryId: number, data: UpdateServiceCategoryDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ServiceCategoryDto>(`/admin/organizations/${orgId}/service-categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, lang);
  }

  async deleteAdminOrgServiceCategory(orgId: number, categoryId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/admin/organizations/${orgId}/service-categories/${categoryId}`, {
      method: 'DELETE',
    }, lang);
  }

  // ============================================
  // Admin - İşletme Hizmetleri Yönetimi
  // ============================================

  async getAdminOrgServices(orgId: number, page = 1, limit = 100, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<PaginatedResponse<ServiceDto>>(`/admin/organizations/${orgId}/services?page=${page}&limit=${limit}`, {
      method: 'GET',
    }, lang);
  }

  async getAdminOrgMenu(orgId: number, lang: 'tr' | 'en' | 'de' | 'de' = 'tr') {
    return this.request<ClientStopMenuCategoryDto[]>(`/admin/organizations/${orgId}/service-categories/menu?lang=${lang}`, {
      method: 'GET',
    }, 'tr', true);
  }

  async createAdminOrgService(orgId: number, data: CreateServiceDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ServiceDto>(`/admin/organizations/${orgId}/services`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, lang);
  }

  async createAdminOrgServiceWithImage(orgId: number, data: CreateServiceDto, image?: File) {
    const formData = new FormData();
    formData.append('serviceCategoryId', String(data.serviceCategoryId));
    formData.append('title', data.title);
    formData.append('basePrice', String(data.basePrice));
    formData.append('priceType', data.priceType);
    if (data.subTitle) formData.append('subTitle', data.subTitle);
    if (data.description) formData.append('description', data.description);
    if (data.contentsDescription) formData.append('contentsDescription', data.contentsDescription);
    if (data.estimatedDurationMinutes !== undefined) {
      formData.append('estimatedDurationMinutes', String(data.estimatedDurationMinutes));
    }
    if (data.dailyStock !== undefined) {
      formData.append('dailyStock', data.dailyStock === null ? 'null' : String(data.dailyStock));
    }
    if (image) formData.append('image', image);

    const url = `${this.baseUrl}/admin/organizations/${orgId}/services`;
    const headers: HeadersInit = {};
    const token = this.resolveToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(url, { method: 'POST', headers, body: formData });
    const jsonResponse = await response.json().catch(() => ({ message: 'Bir hata oluştu', statusCode: response.status }));
    if (!response.ok) {
      if (this.checkUnauthorized(response.status)) {
        throw new Error('Oturum süresi doldu');
      }
      const errorMessage = jsonResponse.errorMessage?.client || jsonResponse.errorMessage?.system || jsonResponse.message || 'API isteği başarısız';
      throw new Error(errorMessage);
    }
    return (jsonResponse.data !== undefined ? jsonResponse.data : jsonResponse) as ServiceDto;
  }

  async updateAdminOrgService(orgId: number, serviceId: number, data: UpdateServiceDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ServiceDto>(`/admin/organizations/${orgId}/services/${serviceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, lang);
  }

  async updateAdminOrgServiceWithImage(orgId: number, serviceId: number, data: UpdateServiceDto, image?: File) {
    const formData = new FormData();
    if (data.title !== undefined) formData.append('title', data.title);
    if (data.subTitle !== undefined) formData.append('subTitle', data.subTitle);
    if (data.description !== undefined) formData.append('description', data.description);
    if (data.contentsDescription !== undefined) formData.append('contentsDescription', data.contentsDescription);
    if (data.basePrice !== undefined) formData.append('basePrice', String(data.basePrice));
    if (data.priceType !== undefined) formData.append('priceType', data.priceType);
    if (data.estimatedDurationMinutes !== undefined) {
      formData.append('estimatedDurationMinutes', String(data.estimatedDurationMinutes));
    }
    if (data.serviceCategoryId !== undefined) {
      formData.append('serviceCategoryId', String(data.serviceCategoryId));
    }
    if (data.dailyStock !== undefined) {
      formData.append('dailyStock', data.dailyStock === null ? 'null' : String(data.dailyStock));
    }
    if (image) formData.append('image', image);

    const url = `${this.baseUrl}/admin/organizations/${orgId}/services/${serviceId}`;
    const headers: HeadersInit = {};
    const token = this.resolveToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(url, { method: 'PUT', headers, body: formData });
    const jsonResponse = await response.json().catch(() => ({ message: 'Bir hata oluştu', statusCode: response.status }));
    if (!response.ok) {
      if (this.checkUnauthorized(response.status)) {
        throw new Error('Oturum süresi doldu');
      }
      const errorMessage = jsonResponse.errorMessage?.client || jsonResponse.errorMessage?.system || jsonResponse.message || 'API isteği başarısız';
      throw new Error(errorMessage);
    }
    return (jsonResponse.data !== undefined ? jsonResponse.data : jsonResponse) as ServiceDto;
  }

  async deleteAdminOrgService(orgId: number, serviceId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/admin/organizations/${orgId}/services/${serviceId}`, {
      method: 'DELETE',
    }, lang);
  }

  // ============================================
  // Admin - İşletme Kaynakları/Yerleşim Yönetimi
  // ============================================

  async getAdminOrgResources(orgId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ResourceDto[]>(`/admin/organizations/${orgId}/resources`, {
      method: 'GET',
    }, lang);
  }

  async createAdminOrgResource(orgId: number, data: CreateResourceDto) {
    // Use FormData like the restaurant endpoint to ensure backend accepts all fields
    const formData = new FormData();

    formData.append('name', data.name);
    formData.append('resourceTypeId', String(data.resourceTypeId));

    if (data.parentId !== undefined && data.parentId !== null) {
      formData.append('parentId', String(data.parentId));
    }
    if (data.capacity !== undefined) formData.append('capacity', String(data.capacity));
    if (data.order !== undefined) formData.append('order', String(data.order));
    if (data.coordinates) {
      if (typeof data.coordinates === 'string') {
        formData.append('coordinates', data.coordinates);
      } else {
        formData.append('coordinates', `${data.coordinates.x},${data.coordinates.y}`);
      }
    }
    if (data.serviceStartAt) formData.append('serviceStartAt', data.serviceStartAt);
    if (data.serviceEndAt) formData.append('serviceEndAt', data.serviceEndAt);
    if (data.serviceDurationMinutes !== undefined) formData.append('serviceDurationMinutes', String(data.serviceDurationMinutes));
    if (data.width !== undefined) formData.append('width', String(data.width));
    if (data.height !== undefined) formData.append('height', String(data.height));
    if (data.rotation !== undefined) formData.append('rotation', String(data.rotation));
    if (data.color) formData.append('color', data.color);
    if (data.approvePreReservationAutomatically !== undefined) formData.append('approvePreReservationAutomatically', String(data.approvePreReservationAutomatically));

    const url = `${this.baseUrl}/admin/organizations/${orgId}/resources`;
    const headers: HeadersInit = {};
    const token = this.resolveToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    const jsonResponse = await response.json().catch(() => ({
      message: 'Bir hata oluştu',
      statusCode: response.status,
    }));

    if (!response.ok || jsonResponse.statusCode >= 400) {
      const errorMessage =
        jsonResponse.errorMessage?.client ||
        jsonResponse.errorMessage?.system ||
        jsonResponse.message ||
        'API isteği başarısız';
      throw new Error(errorMessage);
    }

    return jsonResponse.data as ResourceDto;
  }

  async updateAdminOrgResource(orgId: number, resourceId: number, data: UpdateResourceDto) {
    // Use FormData like the restaurant endpoint to ensure backend accepts all fields
    const formData = new FormData();

    if (data.name !== undefined) formData.append('name', data.name);
    if (data.capacity !== undefined) formData.append('capacity', String(data.capacity));
    if (data.order !== undefined) formData.append('order', String(data.order));
    if (data.coordinates) {
      if (typeof data.coordinates === 'string') {
        formData.append('coordinates', data.coordinates);
      } else {
        formData.append('coordinates', `${data.coordinates.x},${data.coordinates.y}`);
      }
    }
    if (data.serviceStartAt !== undefined) formData.append('serviceStartAt', data.serviceStartAt);
    if (data.serviceEndAt !== undefined) formData.append('serviceEndAt', data.serviceEndAt);
    if (data.serviceDurationMinutes !== undefined) formData.append('serviceDurationMinutes', String(data.serviceDurationMinutes));
    if (data.width !== undefined) formData.append('width', String(data.width));
    if (data.height !== undefined) formData.append('height', String(data.height));
    if (data.rotation !== undefined) formData.append('rotation', String(data.rotation));
    if (data.color !== undefined) formData.append('color', data.color);
    if (data.approvePreReservationAutomatically !== undefined) formData.append('approvePreReservationAutomatically', String(data.approvePreReservationAutomatically));
    if (data.active !== undefined) formData.append('active', String(data.active));

    const url = `${this.baseUrl}/admin/organizations/${orgId}/resources/${resourceId}`;
    const headers: HeadersInit = {};
    const token = this.resolveToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: formData,
    });

    const jsonResponse = await response.json().catch(() => ({
      message: 'Bir hata oluştu',
      statusCode: response.status,
    }));

    if (!response.ok || jsonResponse.statusCode >= 400) {
      const errorMessage =
        jsonResponse.errorMessage?.client ||
        jsonResponse.errorMessage?.system ||
        jsonResponse.message ||
        'API isteği başarısız';
      throw new Error(errorMessage);
    }

    return jsonResponse.data as ResourceDto;
  }

  async deleteAdminOrgResource(orgId: number, resourceId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/admin/organizations/${orgId}/resources/${resourceId}`, {
      method: 'DELETE',
    }, lang);
  }

  // ============================================
  // Admin - İşletme Fotoğraf Yönetimi
  // ============================================

  async adminUpdateOrganizationWithFormData(
    id: number,
    data: AdminUpdateOrganizationDto,
    coverImage?: File,
    lang: 'tr' | 'en' | 'de' = 'tr'
  ) {
    const formData = new FormData();
    const { agencyCommissionRate: _ac, ...cleanData } = data;
    const sanitized = {
      ...cleanData,
      lat: cleanData.lat != null && cleanData.lat !== '' ? Number(cleanData.lat) : undefined,
      lng: cleanData.lng != null && cleanData.lng !== '' ? Number(cleanData.lng) : undefined,
    };

    Object.entries(sanitized).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'socialMediaUrls' && typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      }
    });

    if (coverImage) {
      formData.append('coverImage', coverImage);
    }

    const url = `${this.baseUrl}/admin/organizations/${id}?lang=${lang}`;

    const headers: HeadersInit = {};
    const token = this.resolveToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: formData,
    });

    const jsonResponse = await response.json().catch(() => ({
      message: 'Bir hata oluştu',
      statusCode: response.status,
    }));

    if (!response.ok) {
      if (this.checkUnauthorized(response.status)) {
        throw new Error('Oturum süresi doldu');
      }
      const errorMessage =
        jsonResponse.errorMessage?.client ||
        jsonResponse.errorMessage?.system ||
        jsonResponse.message ||
        'API isteği başarısız';
      throw new Error(errorMessage);
    }

    return (jsonResponse.data !== undefined ? jsonResponse.data : jsonResponse) as OrganizationDto;
  }

  async getAdminOrgPhotos(orgId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<PhotoDto[]>(`/admin/organizations/${orgId}/photos`, {
      method: 'GET',
    }, lang);
  }

  async addAdminOrgPhoto(orgId: number, image: File, lang: 'tr' | 'en' | 'de' = 'tr') {
    const formData = new FormData();
    formData.append('image', image);

    const url = `${this.baseUrl}/admin/organizations/${orgId}/photos?lang=${lang}`;

    const headers: HeadersInit = {};
    const token = this.resolveToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    const jsonResponse = await response.json().catch(() => ({
      message: 'Bir hata oluştu',
      statusCode: response.status,
    }));

    if (!response.ok) {
      if (this.checkUnauthorized(response.status)) {
        throw new Error('Oturum süresi doldu');
      }
      const errorMessage =
        jsonResponse.errorMessage?.client ||
        jsonResponse.errorMessage?.system ||
        jsonResponse.message ||
        'API isteği başarısız';
      throw new Error(errorMessage);
    }

    return (jsonResponse.data !== undefined ? jsonResponse.data : jsonResponse) as PhotoDto;
  }

  async deleteAdminOrgPhoto(orgId: number, photoId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/admin/organizations/${orgId}/photos/${photoId}`, {
      method: 'DELETE',
    }, lang);
  }

  // ============================================
  // Admin - Organization Roles
  // ============================================

  async getAdminOrganizationRoles(page = 1, limit = 100, categoryId?: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    let url = `/admin/organization-roles?page=${page}&limit=${limit}`;
    if (categoryId) url += `&categoryId=${categoryId}`;
    return this.request<PaginatedResponse<RoleDto>>(url, {
      method: 'GET',
    }, lang);
  }

  async createAdminOrganizationRole(data: { key: string; description?: string; categoryId?: number }, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<RoleDto>('/admin/organization-roles', {
      method: 'POST',
      body: JSON.stringify(data),
    }, lang);
  }

  async updateAdminOrganizationRole(id: number, data: { key?: string; description?: string }, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<RoleDto>(`/admin/organization-roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, lang);
  }

  async deleteAdminOrganizationRole(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/admin/organization-roles/${id}`, {
      method: 'DELETE',
    }, lang);
  }

  // ============================================
  // Admin - Agency Roles
  // ============================================

  async getAdminAgencyRoles(page = 1, limit = 100, lang: 'tr' | 'en' | 'de' = 'tr') {
    const url = `/admin/agency-roles?page=${page}&limit=${limit}`;
    return this.request<PaginatedResponse<RoleDto>>(url, {
      method: 'GET',
    }, lang);
  }

  async createAdminAgencyRole(data: { key: string; description?: string }, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<RoleDto>('/admin/agency-roles', {
      method: 'POST',
      body: JSON.stringify(data),
    }, lang);
  }

  async updateAdminAgencyRole(id: number, data: { key?: string; description?: string }, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<RoleDto>(`/admin/agency-roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, lang);
  }

  async deleteAdminAgencyRole(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/admin/agency-roles/${id}`, {
      method: 'DELETE',
    }, lang);
  }

  // ============================================
  // Admin - Organization Categories
  // ============================================

  async getAdminOrganizationCategories(page = 1, limit = 100) {
    const url = `/admin/organization-categories?page=${page}&limit=${limit}`;
    return this.request<PaginatedResponse<CategoryDto>>(url, {
      method: 'GET',
    }, 'tr', true);
  }

  async createAdminOrganizationCategory(data: { name: string; description?: string }, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<CategoryDto>('/admin/organization-categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }, lang);
  }

  async updateAdminOrganizationCategory(id: number, data: { name?: string; description?: string }, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<CategoryDto>(`/admin/organization-categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, lang);
  }

  async deleteAdminOrganizationCategory(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/admin/organization-categories/${id}`, {
      method: 'DELETE',
    }, lang);
  }

  // ============================================
  // Admin - Resource Types
  // ============================================

  async getAdminResourceTypes(page = 1, limit = 100, categoryId?: number) {
    let url = `/admin/resource-types?page=${page}&limit=${limit}`;
    if (categoryId) url += `&categoryId=${categoryId}`;
    return this.request<PaginatedResponse<ResourceTypeDto>>(url, {
      method: 'GET',
    }, 'tr', true);
  }

  async createAdminResourceType(data: {
    categoryId: number;
    code: string;
    name: string;
    allowsChildren?: boolean;
    supportsCoordinates?: boolean;
    defaultCapacity?: number;
    order?: number;
    childId?: number;
  }) {
    return this.request<ResourceTypeDto>('/admin/resource-types', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'tr', true);
  }

  async updateAdminResourceType(id: number, data: {
    code?: string;
    name?: string;
    allowsChildren?: boolean;
    supportsCoordinates?: boolean;
    defaultCapacity?: number;
    order?: number;
    childId?: number;
  }) {
    return this.request<ResourceTypeDto>(`/admin/resource-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'tr', true);
  }

  async deleteAdminResourceType(id: number) {
    return this.request<{ message: string }>(`/admin/resource-types/${id}`, {
      method: 'DELETE',
    }, 'tr', true);
  }

  // ============================================
  // Admin - Users
  // ============================================

  async getUsers(page = 1, limit = 100, filters?: { role?: string; status?: string; search?: string }, lang: 'tr' | 'en' | 'de' = 'tr') {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (filters?.role) params.set('role', filters.role);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);
    return this.request<PaginatedResponse<AdminUserDto>>(`/admin/users?${params.toString()}`, {
      method: 'GET',
    }, lang, true);
  }

  async getUserById(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<AdminUserDto>(`/admin/users/${id}`, {
      method: 'GET',
    }, lang);
  }

  async createUser(data: CreateAdminUserDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<AdminUserDto>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }, lang);
  }

  async updateUser(id: number, data: UpdateAdminUserDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<AdminUserDto>(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, lang);
  }

  async deleteUser(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/users/${id}`, {
      method: 'DELETE',
    }, lang);
  }

  // ============================================
  // Admin - Tours
  // ============================================

  async getAdminTours(filters: {
    page?: number;
    limit?: number;
    lang?: 'tr' | 'en' | 'de';
    status?: string;
    search?: string;
    agencyId?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    timeStatus?: string;
  } = {}) {
    const params = new URLSearchParams();
    params.set('page', String(filters.page || 1));
    params.set('limit', String(filters.limit || 10));
    if (filters.status) params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);
    if (filters.agencyId) params.set('agencyId', String(filters.agencyId));
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
    if (filters.timeStatus) params.set('timeStatus', filters.timeStatus);
    return this.request<PaginatedResponse<ApiTourDto>>(`/admin/tours?${params.toString()}`, {}, filters.lang || 'tr');
  }

  async createAdminTour(
    data: CreateTourPayload & { agencyId: number },
    coverImage?: File,
    galleryImages?: File[],
    lang: 'tr' | 'en' | 'de' = 'tr'
  ) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });
    if (coverImage) {
      formData.append('coverImage', coverImage);
    }
    if (galleryImages && galleryImages.length > 0) {
      galleryImages.forEach((img) => {
        formData.append('galleryImages', img);
      });
    }

    const url = `${this.baseUrl}/admin/tours?lang=${lang}`;
    const headers: HeadersInit = {};
    const token = this.resolveToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    const jsonResponse = await response.json().catch(() => ({
      message: 'Bir hata oluştu',
      statusCode: response.status,
    }));

    if (!response.ok) {
      if (this.checkUnauthorized(response.status)) {
        throw new Error('Oturum süresi doldu');
      }
      const errorMessage =
        jsonResponse.errorMessage?.client ||
        jsonResponse.errorMessage?.system ||
        jsonResponse.message ||
        'API isteği başarısız';
      throw new Error(errorMessage);
    }

    return jsonResponse.data as ApiTourDto;
  }

  async getAdminTourById(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ApiTourDto>(`/admin/tours/${id}`, {}, lang);
  }

  async getAdminTourClients(tourId: number, lang: 'tr' | 'en' | 'de' = 'tr', limit = 100) {
    const response = await this.request<{ data: TourClientDto[]; meta: unknown }>(`/admin/tours/${tourId}/participants?limit=${limit}`, {}, lang, true);
    return Array.isArray(response) ? response : (response.data || []);
  }

  async adminBatchImportClients(tourId: number, file: File, lang: 'tr' | 'en' | 'de' = 'tr') {
    const formData = new FormData();
    formData.append('file', file);

    const params = new URLSearchParams();
    if (lang) params.set('lang', lang);
    const qs = params.toString();
    const url = `${this.baseUrl}/admin/tours/${tourId}/batch-import${qs ? `?${qs}` : ''}`;

    const headers: HeadersInit = {};
    const token = this.resolveToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${res.status}`);
    }

    return res.json();
  }

  async getAdminStopChoices(stopId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<AgencyStopChoicesDto[]>(`/admin/tour-stops/${stopId}/choices`, {
      method: 'GET',
    }, lang);
  }

  async getAdminStopServiceSummary(stopId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<AgencyStopServiceSummaryDto>(`/admin/tour-stops/${stopId}/service-summary`, {
      method: 'GET',
    }, lang);
  }

  async getAdminTourStops(filters: AdminTourStopsFilters = {}) {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.organizationId) params.set('organizationId', String(filters.organizationId));
    if (filters.agencyId) params.set('agencyId', String(filters.agencyId));
    if (filters.tourId) params.set('tourId', String(filters.tourId));
    if (filters.preReservationStatus) params.set('preReservationStatus', filters.preReservationStatus);
    if (filters.choicesStatus) params.set('choicesStatus', filters.choicesStatus);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.systemCommissionPaid !== undefined) params.set('systemCommissionPaid', String(filters.systemCommissionPaid));
    return this.request<PaginatedResponse<AdminTourStopDto>>(`/admin/tour-stops?${params.toString()}`, {}, filters.lang as 'tr' | 'en' | 'de' || 'tr');
  }

  async updateAdminTourStopSystemCommissionPaid(id: number, systemCommissionPaid: boolean, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<AdminTourStopDto>(`/admin/tour-stops/${id}/system-commission-paid`, {
      method: 'PUT',
      body: JSON.stringify({ systemCommissionPaid }),
    }, lang);
  }

  async updateAdminTourStop(id: number, data: UpdateTourStopPayload, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ApiTourStopDto>(`/admin/tour-stops/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }, lang);
  }

  async createAdminTourStop(data: CreateTourStopPayload, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ApiTourStopDto>('/admin/tour-stops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }, lang);
  }

  async approveAdminTourStop(stopId: number, choiceDeadlineTime?: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    const body: Record<string, unknown> = {};
    if (choiceDeadlineTime) {
      body.choiceDeadlineTime = choiceDeadlineTime;
    }
    return this.request<{ message: string }>(`/admin/tour-stops/${stopId}/approve`, {
      method: 'PUT',
      ...(Object.keys(body).length > 0 ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    }, lang);
  }

  async rejectAdminTourStop(stopId: number, reason: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/admin/tour-stops/${stopId}/reject`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    }, lang);
  }

  async submitAndApproveChoices(stopId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/admin/tour-stops/${stopId}/submit-and-approve-choices`, {
      method: 'PUT',
    }, lang);
  }

  async revokeChoicesApproval(stopId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/admin/tour-stops/${stopId}/revoke-choices-approval`, {
      method: 'PUT',
    }, lang);
  }

  async updateSystemCommissionPaid(stopId: number, systemCommissionPaid: boolean) {
    return this.request<{ message: string }>(`/admin/tour-stops/${stopId}/system-commission-paid`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemCommissionPaid }),
    });
  }

  async getAdminClientChoices(stopId: number, clientId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ClientStopChoicesDto>(`/admin/tour-stops/${stopId}/clients/${clientId}/choices`, {
      method: 'GET',
    }, lang);
  }

  async createAdminServiceChoice(stopId: number, clientId: number, data: CreateServiceChoiceDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ClientServiceChoiceDto>(`/admin/tour-stops/${stopId}/clients/${clientId}/service-choice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }, lang);
  }

  async updateAdminServiceChoice(serviceChoiceId: number, data: UpdateServiceChoiceDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ClientServiceChoiceDto>(`/admin/tour-stops/service-choices/${serviceChoiceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }, lang);
  }

  // ============================================
  // Tour Stop - Public
  // ============================================

  async getChoiceDeadlineRemaining(tourStopId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ChoiceDeadlineRemainingDto>(`/tour-stops/${tourStopId}/choice-deadline-remaining`, { method: 'GET' }, lang);
  }

  // ============================================
  // Agency Tours
  // ============================================

  async getAgencyTours(page = 1, limit = 10, lang: 'tr' | 'en' | 'de' = 'tr', name?: string) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (name) params.set('name', name);
    return this.request<PaginatedResponse<ApiTourDto>>(`/agency/tours?${params.toString()}`, {}, lang);
  }

  async getAgencyTourById(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ApiTourDto>(`/agency/tours/${id}`, {}, lang);
  }

  async createAgencyTour(
    data: CreateTourPayload,
    coverImage?: File,
    galleryImages?: File[],
    lang: 'tr' | 'en' | 'de' = 'tr'
  ) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });
    if (coverImage) {
      formData.append('coverImage', coverImage);
    }
    if (galleryImages && galleryImages.length > 0) {
      galleryImages.forEach((img) => {
        formData.append('galleryImages', img);
      });
    }

    const url = `${this.baseUrl}/agency/tours?lang=${lang}`;
    const headers: HeadersInit = {};
    const token = this.resolveToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    const jsonResponse = await response.json().catch(() => ({
      message: 'Bir hata oluştu',
      statusCode: response.status,
    }));

    if (!response.ok) {
      if (this.checkUnauthorized(response.status)) {
        throw new Error('Oturum süresi doldu');
      }
      const errorMessage =
        jsonResponse.errorMessage?.client ||
        jsonResponse.errorMessage?.system ||
        jsonResponse.message ||
        'API isteği başarısız';
      throw new Error(errorMessage);
    }

    return jsonResponse.data as ApiTourDto;
  }

  async updateAgencyTour(
    id: number,
    data: UpdateTourPayload,
    coverImage?: File,
    galleryImages?: File[],
    lang: 'tr' | 'en' | 'de' = 'tr'
  ) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });
    if (coverImage) {
      formData.append('coverImage', coverImage);
    }
    if (galleryImages && galleryImages.length > 0) {
      galleryImages.forEach((img) => {
        formData.append('galleryImages', img);
      });
    }

    const url = `${this.baseUrl}/agency/tours/${id}?lang=${lang}`;
    const headers: HeadersInit = {};
    const token = this.resolveToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: formData,
    });

    const jsonResponse = await response.json().catch(() => ({
      message: 'Bir hata oluştu',
      statusCode: response.status,
    }));

    if (!response.ok) {
      if (this.checkUnauthorized(response.status)) {
        throw new Error('Oturum süresi doldu');
      }
      const errorMessage =
        jsonResponse.errorMessage?.client ||
        jsonResponse.errorMessage?.system ||
        jsonResponse.message ||
        'API isteği başarısız';
      throw new Error(errorMessage);
    }

    return jsonResponse.data as ApiTourDto;
  }

  async deleteAgencyTour(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/agency/tours/${id}`, {
      method: 'DELETE',
    }, lang);
  }

  async publishTour(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ApiTourDto>(`/agency/tours/${id}/publish`, {
      method: 'PUT',
    }, lang);
  }

  async cancelTour(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ApiTourDto>(`/agency/tours/${id}/cancel`, {
      method: 'PUT',
    }, lang);
  }

  async completeTour(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ApiTourDto>(`/agency/tours/${id}/complete`, {
      method: 'PUT',
    }, lang);
  }

  async addTourPhoto(tourId: number, image: File, lang: 'tr' | 'en' | 'de' = 'tr') {
    const formData = new FormData();
    formData.append('galleryImages', image);

    const url = `${this.baseUrl}/agency/tours/${tourId}?lang=${lang}`;

    const headers: HeadersInit = {};
    const token = this.resolveToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      method: 'PUT',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${res.status}`);
    }

    return res.json();
  }

  async deleteTourPhoto(tourId: number, photoId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/agency/tours/${tourId}/photos/${photoId}`, {
      method: 'DELETE',
    }, lang);
  }

  // ============================================
  // Tour Participants
  // ============================================

  async getTourClients(tourId: number, limit = 100) {
    const response = await this.request<{ data: TourClientDto[]; meta: unknown }>(`/agency/tours/${tourId}/participants?limit=${limit}`, {}, 'tr', true);
    return Array.isArray(response) ? response : (response.data || []);
  }

  async addTourParticipant(tourId: number, clientId: number, notes?: string) {
    return this.request<TourClientDto>(`/agency/tours/${tourId}/participants`, {
      method: 'POST',
      body: JSON.stringify({ clientId, ...(notes ? { notes } : {}) }),
    }, 'tr', true);
  }

  async updateTourClientStatus(tourId: number, clientId: number, status: string) {
    return this.request<TourClientDto>(`/agency/tours/${tourId}/participants/${clientId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }, 'tr', true);
  }

  // ============================================
  // Tour Stops
  // ============================================

  async getTourStops(tourId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ApiTourStopDto[]>(`/tour-stops/tour/${tourId}`, {}, lang);
  }

  async createTourStop(data: CreateTourStopPayload, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ApiTourStopDto>('/tour-stops', {
      method: 'POST',
      body: JSON.stringify(data),
    }, lang);
  }

  async updateTourStop(id: number, data: UpdateTourStopPayload, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ApiTourStopDto>(`/tour-stops/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, lang);
  }

  async deleteTourStop(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/tour-stops/${id}`, {
      method: 'DELETE',
    }, lang);
  }

  async submitTourStopChoices(stopId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/tour-stops/${stopId}/submit-choices`, {
      method: 'PUT',
    }, lang);
  }

  // ============================================
  // Client Panel - New Endpoints
  // ============================================

  async getMyToursCount() {
    return this.request<{ totalCount: number }>(`/client/tours/participations/count`, {
      method: 'GET',
    });
  }

  async getMyTours(page = 1, limit = 50, lang: 'tr' | 'en' | 'de' = 'tr', timeStatus?: string) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (timeStatus) params.set('timeStatus', timeStatus);
    return this.request<PaginatedResponse<ClientParticipantTourDto>>(`/client/tours?${params}`, {
      method: 'GET',
    }, lang);
  }

  async getMyTourDetail(tourId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ClientTourDetailDto>(`/client/tours/${tourId}`, {
      method: 'GET',
    }, lang);
  }

  async getStopMenu(stopId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ClientStopMenuCategoryDto[]>(`/client/tours/stops/${stopId}/menu`, {
      method: 'GET',
    }, lang);
  }

  async getStopLayout(stopId: number, parentId?: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    const params = parentId !== undefined ? `?parentId=${parentId}` : '';
    return this.request<ResourceDto[]>(`/client/tours/stops/${stopId}/layout${params}`, {
      method: 'GET',
    }, lang);
  }

  // Resource choice (table/seat selection)
  async createResourceChoice(stopId: number, data: CreateResourceChoiceDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ClientResourceChoiceDto>(`/client/tours/stops/${stopId}/resource-choice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }, lang);
  }

  async updateResourceChoice(stopId: number, data: CreateResourceChoiceDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ClientResourceChoiceDto>(`/client/tours/stops/${stopId}/resource-choice`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }, lang);
  }

  // Service choice (menu selection)
  async createServiceChoice(stopId: number, data: CreateServiceChoiceDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ClientServiceChoiceDto>(`/client/tours/stops/${stopId}/service-choice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }, lang);
  }

  async updateServiceChoice(serviceChoiceId: number, data: UpdateServiceChoiceDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ClientServiceChoiceDto>(`/client/tours/service-choices/${serviceChoiceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }, lang);
  }

  // Get all choices for a stop
  async getStopChoices(stopId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ClientStopChoicesDto>(`/client/tours/stops/${stopId}/choices`, {
      method: 'GET',
    }, lang);
  }

  // ============================================
  // Agency - Tour Stop Choices & Summary
  // ============================================

  async getAgencyStopChoices(stopId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<AgencyStopChoicesDto[]>(`/agency/tours/stops/${stopId}/choices`, {
      method: 'GET',
    }, lang);
  }

  async getAgencyStopServiceSummary(stopId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<AgencyStopServiceSummaryDto>(`/agency/tours/stops/${stopId}/service-summary`, {
      method: 'GET',
    }, lang);
  }

  async getAgencyClientChoices(stopId: number, clientId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ClientStopChoicesDto>(`/tour-stops/${stopId}/clients/${clientId}/choices`, {
      method: 'GET',
    }, lang);
  }

  async createAgencyServiceChoice(stopId: number, clientId: number, data: CreateServiceChoiceDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ClientServiceChoiceDto>(`/tour-stops/${stopId}/clients/${clientId}/service-choice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }, lang);
  }

  async updateAgencyServiceChoice(serviceChoiceId: number, data: UpdateServiceChoiceDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<ClientServiceChoiceDto>(`/tour-stops/service-choices/${serviceChoiceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }, lang);
  }

  // ============================================
  // Admin - Notifications (lang parametresi yok)
  // ============================================

  async createNotification(formData: FormData) {
    const url = `${this.baseUrl}/admin/notifications`;
    const headers: HeadersInit = {};
    const token = this.resolveToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(url, { method: 'POST', headers, body: formData });
    const jsonResponse = await response.json().catch(() => ({ message: 'Bir hata oluştu', statusCode: response.status }));
    if (!response.ok) {
      if (this.checkUnauthorized(response.status)) throw new Error('Oturum süresi doldu');
      const errorMessage = jsonResponse.errorMessage?.client || jsonResponse.errorMessage?.system || jsonResponse.message || 'API isteği başarısız';
      throw new Error(errorMessage);
    }
    return jsonResponse.data !== undefined ? jsonResponse.data as AdminNotificationDto : jsonResponse as AdminNotificationDto;
  }

  async listNotifications(page = 1, limit = 10, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ data: AdminNotificationDto[]; meta: { total: number; totalCount?: number; page: number; limit: number } }>(`/admin/notifications?page=${page}&limit=${limit}`, { method: 'GET' }, lang);
  }

  async updateNotification(id: number, formData: FormData) {
    const url = `${this.baseUrl}/admin/notifications/${id}`;
    const headers: HeadersInit = {};
    const token = this.resolveToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(url, { method: 'PUT', headers, body: formData });
    const jsonResponse = await response.json().catch(() => ({ message: 'Bir hata oluştu', statusCode: response.status }));
    if (!response.ok) {
      if (this.checkUnauthorized(response.status)) throw new Error('Oturum süresi doldu');
      const errorMessage = jsonResponse.errorMessage?.client || jsonResponse.errorMessage?.system || jsonResponse.message || 'API isteği başarısız';
      throw new Error(errorMessage);
    }
    return jsonResponse.data !== undefined ? jsonResponse.data as AdminNotificationDto : jsonResponse as AdminNotificationDto;
  }

  async deleteNotification(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/admin/notifications/${id}`, { method: 'DELETE' }, lang);
  }

  // ============================================
  // Panel Notifications - Agency
  // ============================================

  async getAgencyNotifications(page = 1, limit = 10, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ data: PanelNotificationDto[]; meta: { total: number; totalCount?: number; page: number; limit: number } }>(`/agencies/my/notifications?page=${page}&limit=${limit}`, { method: 'GET' }, lang);
  }

  async markAgencyNotificationRead(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<PanelNotificationDto>(`/agencies/my/notifications/${id}/read`, { method: 'PATCH' }, lang);
  }

  async getAgencyUnreadCount(lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ unreadCount: number }>('/agencies/my/notifications/unread-count', { method: 'GET' }, lang);
  }

  // ============================================
  // Panel Notifications - Organization
  // ============================================

  async getOrganizationNotifications(page = 1, limit = 10, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ data: PanelNotificationDto[]; meta: { total: number; totalCount?: number; page: number; limit: number } }>(`/organizations/my/notifications?page=${page}&limit=${limit}`, { method: 'GET' }, lang);
  }

  async markOrganizationNotificationRead(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<PanelNotificationDto>(`/organizations/my/notifications/${id}/read`, { method: 'PATCH' }, lang);
  }

  async getOrganizationUnreadCount(lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ unreadCount: number }>('/organizations/my/notifications/unread-count', { method: 'GET' }, lang);
  }

  // ============================================
  // Panel Notifications - Client
  // ============================================

  async getClientNotifications(page = 1, limit = 10, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ data: PanelNotificationDto[]; meta: { total: number; totalCount?: number; page: number; limit: number } }>(`/client/notifications?page=${page}&limit=${limit}`, { method: 'GET' }, lang);
  }

  async markClientNotificationRead(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<PanelNotificationDto>(`/client/notifications/${id}/read`, { method: 'PATCH' }, lang);
  }

  async getClientUnreadCount(lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ unreadCount: number }>('/client/notifications/unread-count', { method: 'GET' }, lang);
  }

  // ============================================
  // Admin - System Commissions (lang parametresi yok)
  // ============================================

  async listSystemCommissions(filters: {
    page?: number;
    limit?: number;
    lang?: 'tr' | 'en' | 'de';
    scope?: string;
    scopeId?: number;
    active?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  } = {}) {
    const params = new URLSearchParams();
    params.set('page', String(filters.page || 1));
    params.set('limit', String(filters.limit || 10));
    if (filters.scope) params.set('scope', filters.scope);
    if (filters.scopeId) params.set('scopeId', String(filters.scopeId));
    if (filters.active !== undefined) params.set('active', String(filters.active));
    if (filters.search) params.set('search', filters.search);
    if (filters.sortBy) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
    return this.request<{ data: SystemCommissionDto[]; meta: { total: number; totalCount?: number; page: number; limit: number } }>(`/admin/system-commissions?${params.toString()}`, { method: 'GET' }, filters.lang || 'tr', true);
  }

  async getSystemCommission(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<SystemCommissionDto>(`/admin/system-commissions/${id}`, { method: 'GET' }, lang, true);
  }

  async createSystemCommission(data: CreateSystemCommissionDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<SystemCommissionDto>('/admin/system-commissions', {
      method: 'POST',
      body: JSON.stringify(data),
    }, lang, true);
  }

  async updateSystemCommission(id: number, data: UpdateSystemCommissionDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<SystemCommissionDto>(`/admin/system-commissions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, lang, true);
  }

  async deleteSystemCommission(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ message: string }>(`/admin/system-commissions/${id}`, { method: 'DELETE' }, lang, true);
  }

  // ============================================
  // Ticket Messaging - Client Endpoints
  // ============================================

  private async requestFormData<T>(endpoint: string, formData: FormData, method: 'POST' | 'PUT' | 'PATCH' = 'POST', lang: 'tr' | 'en' | 'de' = 'tr'): Promise<T> {
    const url = `${this.baseUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}lang=${lang}`;
    const headers: HeadersInit = {};
    const token = this.resolveToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(url, { method, headers, body: formData });
    const jsonResponse = await response.json().catch(() => ({ message: 'Bir hata oluştu', statusCode: response.status }));
    if (!response.ok) {
      if (this.checkUnauthorized(response.status)) throw new Error('Oturum süresi doldu');
      const errorMessage = jsonResponse.errorMessage?.client || jsonResponse.errorMessage?.system || jsonResponse.message || 'API isteği başarısız';
      throw new Error(errorMessage);
    }
    return jsonResponse.data !== undefined ? jsonResponse.data as T : jsonResponse as T;
  }

  async clientCreateTicket(data: CreateTicketDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    const formData = new FormData();
    formData.append('tourId', String(data.tourId));
    formData.append('category', data.category);
    formData.append('subject', data.subject);
    formData.append('content', data.content);
    if (data.attachments) {
      data.attachments.forEach(file => formData.append('attachments', file));
    }
    return this.requestFormData<TicketDto>('/client/tickets', formData, 'POST', lang);
  }

  async clientGetTickets(params: { page?: number; limit?: number; tourId?: number; status?: TicketStatus; category?: TicketCategory } = {}, lang: 'tr' | 'en' | 'de' = 'tr') {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.tourId) query.append('tourId', String(params.tourId));
    if (params.status) query.append('status', params.status);
    if (params.category) query.append('category', params.category);
    const qs = query.toString();
    return this.request<TicketListResponseDto>(`/client/tickets${qs ? `?${qs}` : ''}`, { method: 'GET' }, lang, !!qs);
  }

  async clientGetTicketById(id: number, messagePage = 1, messageLimit = 50, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<TicketDto>(`/client/tickets/${id}?messagePage=${messagePage}&messageLimit=${messageLimit}`, { method: 'GET' }, lang);
  }

  async clientSendMessage(ticketId: number, content: string, attachments?: File[], lang: 'tr' | 'en' | 'de' = 'tr') {
    const formData = new FormData();
    formData.append('content', content);
    if (attachments) {
      attachments.forEach(file => formData.append('attachments', file));
    }
    return this.requestFormData<TicketMessageDto>(`/client/tickets/${ticketId}/messages`, formData, 'POST', lang);
  }

  async clientMarkMessagesRead(ticketId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ updated: number }>(`/client/tickets/${ticketId}/messages/read`, { method: 'PATCH' }, lang);
  }

  // ============================================
  // Ticket Messaging - Agency Endpoints
  // ============================================

  async agencyGetTickets(params: { page?: number; limit?: number; tourId?: number; clientId?: number; status?: TicketStatus; category?: TicketCategory } = {}, lang: 'tr' | 'en' | 'de' = 'tr') {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.tourId) query.append('tourId', String(params.tourId));
    if (params.clientId) query.append('clientId', String(params.clientId));
    if (params.status) query.append('status', params.status);
    if (params.category) query.append('category', params.category);
    const qs = query.toString();
    return this.request<TicketListResponseDto>(`/agency/tickets${qs ? `?${qs}` : ''}`, { method: 'GET' }, lang, !!qs);
  }

  async agencyGetTicketById(id: number, messagePage = 1, messageLimit = 50, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<TicketDto>(`/agency/tickets/${id}?messagePage=${messagePage}&messageLimit=${messageLimit}`, { method: 'GET' }, lang);
  }

  async agencyUpdateTicketStatus(id: number, status: TicketStatus, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<TicketDto>(`/agency/tickets/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }, lang);
  }

  async agencySendMessage(ticketId: number, content: string, attachments?: File[], lang: 'tr' | 'en' | 'de' = 'tr') {
    const formData = new FormData();
    formData.append('content', content);
    if (attachments) {
      attachments.forEach(file => formData.append('attachments', file));
    }
    return this.requestFormData<TicketMessageDto>(`/agency/tickets/${ticketId}/messages`, formData, 'POST', lang);
  }

  async agencyMarkMessagesRead(ticketId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<{ updated: number }>(`/agency/tickets/${ticketId}/messages/read`, { method: 'PATCH' }, lang);
  }

  // ============================================
  // Ticket Messaging - Admin Endpoints
  // ============================================

  async adminGetTickets(params: { page?: number; limit?: number; agencyId?: number; tourId?: number; clientId?: number; status?: TicketStatus; category?: TicketCategory } = {}, lang: 'tr' | 'en' | 'de' = 'tr') {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.agencyId) query.append('agencyId', String(params.agencyId));
    if (params.tourId) query.append('tourId', String(params.tourId));
    if (params.clientId) query.append('clientId', String(params.clientId));
    if (params.status) query.append('status', params.status);
    if (params.category) query.append('category', params.category);
    const qs = query.toString();
    return this.request<TicketListResponseDto>(`/admin/tickets${qs ? `?${qs}` : ''}`, { method: 'GET' }, lang, !!qs);
  }

  async adminGetTicketById(id: number, messagePage = 1, messageLimit = 50, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<TicketDto>(`/admin/tickets/${id}?messagePage=${messagePage}&messageLimit=${messageLimit}`, { method: 'GET' }, lang);
  }

  async adminUpdateTicketStatus(id: number, status: TicketStatus, lang: 'tr' | 'en' | 'de' = 'tr') {
    return this.request<TicketDto>(`/admin/tickets/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }, lang);
  }

  async adminSendMessage(ticketId: number, content: string, attachments?: File[], lang: 'tr' | 'en' | 'de' = 'tr') {
    const formData = new FormData();
    formData.append('content', content);
    if (attachments) {
      attachments.forEach(file => formData.append('attachments', file));
    }
    return this.requestFormData<TicketMessageDto>(`/admin/tickets/${ticketId}/messages`, formData, 'POST', lang);
  }
}

// Singleton instance
export const apiClient = new ApiClient(API_BASE_URL);

// ============================================
// Auth API Functions
// ============================================

export const realAuthApi = {
  // ============================================
  // Organization (Restaurant)
  // ============================================

  // Login - sadece email ile OTP gonder
  async organizationLoginSendOtp(email: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      await apiClient.organizationLogin(email, lang);
      return { success: true, message: 'OTP gönderildi' };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Register - tum bilgilerle OTP gonder
  async organizationSendOtp(data: OrganizationLoginRegisterDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      await apiClient.organizationRegister(data, lang);
      return { success: true, message: 'OTP gönderildi' };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // OTP dogrula
  async organizationVerify(email: string, otp: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.organizationVerifyOtp({ email, otp }, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // ============================================
  // Agency (Acente)
  // ============================================

  // Login - sadece email ile OTP gonder
  async agencyLoginSendOtp(email: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      await apiClient.agencyLogin(email, lang);
      return { success: true, message: 'OTP gönderildi' };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Register - tum bilgilerle OTP gonder
  async agencySendOtp(data: AgencyLoginRegisterDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      await apiClient.agencyRegister(data, lang);
      return { success: true, message: 'OTP gönderildi' };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // OTP dogrula
  async agencyVerify(email: string, otp: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.agencyVerifyOtp({ email, otp }, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // ============================================
  // Client (Acente Misafiri) - Username/Password Login
  // ============================================

  async clientLogin(username: string, password: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.clientLoginUsername(username, password, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async clientLoginRegister(email: string, firstName?: string, lastName?: string, agencyUuid?: string, tourUuid?: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.clientLoginRegister(email, firstName, lastName, agencyUuid, tourUuid, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async clientLoginRegisterVerify(email: string, otp: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.clientLoginRegisterVerify(email, otp, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getClientProfile(lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.getClientProfile(lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async updateClientProfile(data: UpdateClientProfileDto, profilePhoto?: File, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.updateClientProfile(data, profilePhoto, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getClientTours(agencyId: number, page = 1, limit = 10, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.getClientTours(agencyId, page, limit, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getMyTours(page = 1, limit = 50, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.getMyTours(page, limit, lang);
      return response;
    } catch (error) {
      return { data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } } as PaginatedResponse<ClientParticipantTourDto>;
    }
  },

  async getMyTourDetail(tourId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.getMyTourDetail(tourId, lang);
      return response;
    } catch (error) {
      throw error;
    }
  },

  async getStopMenu(stopId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.getStopMenu(stopId, lang);
      return response;
    } catch (error) {
      throw error;
    }
  },

  async getClientReservations(clientId: string, page = 1, limit = 10) {
    try {
      const response = await apiClient.getClientReservations(clientId, page, limit);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async cancelReservation(reservationId: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.cancelReservation(reservationId, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getReservationById(reservationId: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.getReservationById(reservationId, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getUpcomingReservations(page = 1, limit = 10, days?: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.getUpcomingReservations(page, limit, days, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // ============================================
  // Client - Service Requests
  // ============================================

  async createServiceRequest(data: CreateServiceRequestDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.createServiceRequest(data, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getServiceRequestsByClient(clientId: number, page = 1, limit = 10, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.getServiceRequestsByClient(clientId, page, limit, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getServiceRequestById(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.getServiceRequestById(id, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async cancelServiceRequest(id: number) {
    try {
      const response = await apiClient.cancelServiceRequest(id);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async retryServiceRequest(id: number) {
    try {
      const response = await apiClient.retryServiceRequest(id);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // ============================================
  // Organizations - Public
  // ============================================

  async getOrganizationsPublic(page = 1, limit = 10, name?: string, lang: 'tr' | 'en' | 'de' = 'tr', filters?: { cityId?: number; districtId?: number; categoryId?: number }) {
    try {
      const response = await apiClient.getOrganizationsPublic(page, limit, name, lang, filters);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getOrganizationPublicById(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.getOrganizationById(id, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // ============================================
  // Organizations - Reviews
  // ============================================

  async createOrganizationReview(organizationId: number, data: CreateOrganizationReviewDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.createOrganizationReview(organizationId, data, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getOrganizationReviews(organizationId: number, page = 1, limit = 10, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.getOrganizationReviews(organizationId, page, limit, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // ============================================
  // Auth - Refresh Token
  // ============================================

  async refreshAccessToken(refreshToken: string) {
    try {
      const response = await apiClient.refreshToken(refreshToken);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // ============================================
  // Common
  // ============================================

  // Get Profile
  async getProfile() {
    try {
      const profile = await apiClient.getProfile();
      return { success: true, data: profile };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Logout
  logout() {
    apiClient.logout();
  },

  // Check if authenticated
  isAuthenticated() {
    return !!apiClient.getAccessToken();
  },

  // Register callback for 401 Unauthorized responses
  setOnUnauthorized(callback: (() => void) | null) {
    apiClient.setOnUnauthorized(callback);
  },

  // ============================================
  // Organization - Invite User
  // ============================================

  async inviteUser(data: InviteUserDto) {
    try {
      const response = await apiClient.inviteUser(data);
      return { success: true, message: response.message };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
};

// ============================================
// Invitation API Functions
// ============================================

export const invitationApi = {
  // Accept invitation and get access token
  async accept(token: string) {
    try {
      const response = await apiClient.acceptInvitation(token);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Get my sent invitations
  async getMyInvitations(page = 1, limit = 10) {
    try {
      const response = await apiClient.getMyInvitations(page, limit);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Cancel invitation
  async cancel(invitationId: number) {
    try {
      const response = await apiClient.cancelInvitation(invitationId);
      return { success: true, message: response.message };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
};

// ============================================
// Organization API Functions
// ============================================

export const organizationApi = {
  // Register new organization (create business)
  async register(
    data: OrganizationRegisterDto,
    coverImage?: File,
    galleryImages?: File[]
  ) {
    try {
      const response = await apiClient.organizationRegisterBusiness(data, coverImage, galleryImages);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Get my organization
  async getMyOrganization() {
    try {
      const response = await apiClient.getMyOrganization();
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Update my organization
  async updateMyOrganization(data: OrganizationUpdateDto, coverImage?: File) {
    try {
      const response = await apiClient.updateMyOrganization(data, coverImage);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Get organization photos
  async getPhotos() {
    try {
      const response = await apiClient.getOrganizationPhotos();
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Add organization photo
  async addPhoto(image: File) {
    try {
      const response = await apiClient.addOrganizationPhoto(image);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Delete organization photo
  async deletePhoto(photoId: number) {
    try {
      await apiClient.deleteOrganizationPhoto(photoId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Get available roles
  async getRoles() {
    try {
      const response = await apiClient.getOrganizationRoles();
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Get categories
  async getCategories() {
    try {
      const response = await apiClient.getOrganizationCategories();
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Invite user
  async inviteUser(data: InviteUserDto) {
    try {
      const response = await apiClient.inviteUser(data);
      return { success: true, message: response.message };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Get team members (Real API)
  // Endpoint: GET /organizations/my/users
  async getTeamMembers(page = 1, limit = 100): Promise<{ success: boolean; data?: TeamMemberDto[]; error?: string }> {
    try {
      const response = await apiClient.getOrganizationUsers(page, limit);
      // Transform OrganizationUserDto to TeamMemberDto
      const teamMembers: TeamMemberDto[] = response.data.map((orgUser) => ({
        id: orgUser.id,
        firstName: orgUser.firstName,
        lastName: orgUser.lastName,
        email: orgUser.email,
        phone: orgUser.phone,
        phoneCountryCode: orgUser.phoneCountryCode,
        roles: orgUser.roles.map((r) => ({ id: r.id, name: r.key, description: r.description })),
        status: orgUser.status === 'approved' ? 'active' : 'inactive',
        joinedAt: orgUser.joinedAt,
      }));
      return { success: true, data: teamMembers };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Remove team member (Real API)
  // Endpoint: DELETE /organizations/my/users/:userId
  async removeTeamMember(userId: number): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.removeOrganizationUser(userId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Update team member status (Real API)
  // Endpoint: PATCH /organizations/my/users/:userId/activate or /deactivate
  async updateTeamMemberStatus(userId: number, status: 'active' | 'inactive'): Promise<{ success: boolean; error?: string }> {
    try {
      if (status === 'active') {
        await apiClient.activateOrganizationUser(userId);
      } else {
        await apiClient.deactivateOrganizationUser(userId);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Assign role to user (Real API)
  // Endpoint: POST /organizations/my/users/:userId/roles
  async assignRole(userId: number, roleId: number): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.assignRoleToUser(userId, roleId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Remove role from user (Real API)
  // Endpoint: DELETE /organizations/my/users/:userId/roles/:roleId
  async removeRole(userId: number, roleId: number): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.removeRoleFromUser(userId, roleId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
};

// ============================================
// Agency API Functions (Real API)
// ============================================

export const agencyApi = {
  // Register new agency (create business)
  async register(
    data: AgencyRegisterDto,
    coverImage?: File,
    galleryImages?: File[]
  ) {
    try {
      const response = await apiClient.agencyRegisterBusiness(data, coverImage, galleryImages);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Get my agency
  async getMyAgency() {
    try {
      const response = await apiClient.getMyAgency();
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Update my agency
  async updateMyAgency(
    data: Partial<Pick<AgencyResponseDto, 'name' | 'description' | 'phone' | 'phoneCountryCode' | 'address'>>,
    coverImage?: File
  ) {
    try {
      const response = await apiClient.updateMyAgency(data, coverImage);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Get available roles
  async getRoles() {
    try {
      const response = await apiClient.getAgencyAvailableRoles();
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Invite user
  async inviteUser(data: InviteUserDto) {
    try {
      const response = await apiClient.inviteAgencyUser(data);
      return { success: true, message: response.message };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Get team members
  async getTeamMembers(page = 1, limit = 100): Promise<{ success: boolean; data?: TeamMemberDto[]; error?: string }> {
    try {
      const response = await apiClient.getAgencyUsers(page, limit);
      const teamMembers: TeamMemberDto[] = response.data.map((user) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        phoneCountryCode: user.phoneCountryCode,
        roles: user.roles.map((r) => ({ id: r.id, name: r.key, description: r.description })),
        status: user.status === 'approved' ? 'active' : 'inactive',
        joinedAt: user.joinedAt,
      }));
      return { success: true, data: teamMembers };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Remove team member
  async removeTeamMember(userId: number): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.removeAgencyUser(userId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Update team member status
  async updateTeamMemberStatus(userId: number, status: 'active' | 'inactive'): Promise<{ success: boolean; error?: string }> {
    try {
      if (status === 'active') {
        await apiClient.activateAgencyUser(userId);
      } else {
        await apiClient.deactivateAgencyUser(userId);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Assign role to user
  async assignRole(userId: number, roleId: number): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.assignAgencyRole(userId, roleId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Remove role from user
  async removeRole(userId: number, roleId: number): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.removeAgencyRole(userId, roleId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Get clients
  async getClients(page = 1, limit = 10, search?: string, tourId?: number) {
    try {
      const response = await apiClient.getAgencyClients(page, limit, search, tourId);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Create client
  async createClient(data: CreateAgencyClientDto) {
    try {
      const response = await apiClient.createAgencyClient(data);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Batch import clients from Excel
  async batchImportClients(file: File, lang: 'tr' | 'en' | 'de' = 'tr', tourId?: number): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await apiClient.batchImportClients(file, lang, tourId);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Change client password
  async changeClientPassword(clientId: number, newPassword: string) {
    try {
      await apiClient.changeAgencyClientPassword(clientId, newPassword);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Delete client
  async deleteClient(clientId: number) {
    try {
      await apiClient.deleteAgencyClient(clientId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Get agency photos
  async getPhotos() {
    try {
      const response = await apiClient.getAgencyPhotos();
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Add agency photo
  async addPhoto(image: File) {
    try {
      const response = await apiClient.addAgencyPhoto(image);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Delete agency photo
  async deletePhoto(photoId: number) {
    try {
      await apiClient.deleteAgencyPhoto(photoId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getClientChoices(stopId: number, clientId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.getAgencyClientChoices(stopId, clientId, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async createServiceChoiceForClient(stopId: number, clientId: number, data: CreateServiceChoiceDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.createAgencyServiceChoice(stopId, clientId, data, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async updateServiceChoiceForClient(serviceChoiceId: number, data: UpdateServiceChoiceDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.updateAgencyServiceChoice(serviceChoiceId, data, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
};

// ============================================
// Resource API Functions (Real API)
// ============================================

export const resourceApi = {
  // Kaynak tiplerini listele
  async getTypes(categoryId?: number): Promise<{ success: boolean; data?: ResourceTypeDto[]; error?: string }> {
    try {
      let url = '/resources/types?page=1&limit=100';
      if (categoryId) {
        url += `&categoryId=${categoryId}`;
      }
      const response = await apiClient.getResourceTypes(categoryId);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Tek bir kaynak tipini getir
  async getTypeById(id: number): Promise<{ success: boolean; data?: ResourceTypeDto; error?: string }> {
    try {
      const response = await apiClient.getResourceTypeById(id);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Yerleşim düzenini getir (tree yapısı)
  async getLayout(parentId?: number | null, organizationId?: number): Promise<{ success: boolean; data?: ResourceDto[]; error?: string }> {
    try {
      const response = await apiClient.getResourceLayout(parentId, 'tr', organizationId);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Kaynak detayı
  async getById(id: number): Promise<{ success: boolean; data?: ResourceDto; error?: string }> {
    try {
      const response = await apiClient.getResourceById(id);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Alt kaynakları getir
  async getChildren(parentId: number, page = 1, limit = 100): Promise<{ success: boolean; data?: ResourceDto[]; error?: string }> {
    try {
      const response = await apiClient.getResourceChildren(parentId, page, limit);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Yeni kaynak oluştur
  async create(data: CreateResourceDto, image?: File): Promise<{ success: boolean; data?: ResourceDto; error?: string }> {
    try {
      const response = await apiClient.createResource(data, image);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Kaynak güncelle
  async update(id: number, data: UpdateResourceDto, image?: File): Promise<{ success: boolean; data?: ResourceDto; error?: string }> {
    try {
      const response = await apiClient.updateResource(id, data, image);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Kaynak sil
  async delete(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.deleteResource(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async bulkDelete(ids: number[]): Promise<{ success: boolean; data?: { deleted: number[]; errors: { id: number; message: string }[] }; error?: string }> {
    try {
      const result = await apiClient.bulkDeleteResources(ids);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Kaynak taşı
  async move(id: number, newParentId: number | null): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.moveResource(id, newParentId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Aktif et
  async activate(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.activateResource(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Pasif et
  async deactivate(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.deactivateResource(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
};

// ============================================
// Location API Functions
// ============================================

export const locationApi = {
  // Get countries
  async getCountries() {
    try {
      const response = await apiClient.getCountries();
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Get cities (optionally filtered by country)
  async getCities(countryId?: number) {
    try {
      const response = await apiClient.getCities(countryId);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Get districts (optionally filtered by city)
  async getDistricts(cityId?: number) {
    try {
      const response = await apiClient.getDistricts(cityId);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
};

// ============================================
// Admin API Functions
// ============================================

export const adminApi = {
  // ============================================
  // Auth
  // ============================================

  // Admin login - send OTP
  async login(email: string) {
    try {
      await apiClient.adminLogin(email);
      return { success: true, message: 'OTP gönderildi' };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Admin verify OTP
  async verifyOtp(email: string, otp: string) {
    try {
      const response = await apiClient.adminVerifyOtp({ email, otp });
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Change client password (admin)
  async changeClientPassword(clientId: number, newPassword: string) {
    try {
      await apiClient.changeAdminClientPassword(clientId, newPassword);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // ============================================
  // Companies (Organizations & Agencies)
  // ============================================

  // List companies with filters (resolves coverImageUrl from detail endpoints)
  async getCompanies(filters: CompanyFilters) {
    try {
      const response = await apiClient.getCompanies(filters);

      // Resolve coverImageUrl for all companies without coverImageUrl
      // Note: /admin/companies endpoint may return stale coverImageKey (null even when image exists)
      // so we fetch detail for ALL companies to get the correct coverImageUrl
      const companies = response.data || [];
      const needsResolve = companies.filter(c => !c.coverImageUrl);

      if (needsResolve.length > 0) {
        const results = await Promise.allSettled(
          needsResolve.map(c => {
            if (filters.type === 'agency') {
              return apiClient.getAgencyById(c.id);
            } else {
              return apiClient.getOrganizationByIdAdmin(c.id);
            }
          })
        );

        results.forEach((result, idx) => {
          if (result.status === 'fulfilled' && result.value) {
            const detail = result.value as { coverImageUrl?: string | null; coverImageKey?: string | null };
            if (detail.coverImageUrl) {
              needsResolve[idx].coverImageUrl = detail.coverImageUrl;
            }
            if (detail.coverImageKey) {
              needsResolve[idx].coverImageKey = detail.coverImageKey;
            }
          }
        });
      }

      // Normalize meta: API returns totalCount, frontend expects total
      if (response.meta && !response.meta.total && response.meta.totalCount) {
        response.meta.total = response.meta.totalCount;
      }

      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // List organizations via GET /organizations (supports name search)
  async getOrganizationsList(filters: { name?: string; status?: CompanyStatus; page?: number; limit?: number; lang?: 'tr' | 'en' | 'de'; sortByCommission?: 'ASC' | 'DESC' }) {
    try {
      const response = await apiClient.getOrganizationsList(filters);

      // Normalize meta
      if (response.meta && !response.meta.total && response.meta.totalCount) {
        response.meta.total = response.meta.totalCount;
      }

      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // List agencies via GET /agencies (supports name search + status filter)
  async getAgenciesList(filters: { name?: string; status?: CompanyStatus; page?: number; limit?: number; lang?: 'tr' | 'en' | 'de' }) {
    try {
      const response = await apiClient.getAgenciesList(filters);

      // Normalize meta
      if (response.meta && !response.meta.total && response.meta.totalCount) {
        response.meta.total = response.meta.totalCount;
      }

      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Update company status
  async updateCompanyStatus(data: UpdateCompanyStatusDto) {
    try {
      const response = await apiClient.updateCompanyStatus(data);
      return { success: true, message: response.message };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // ============================================
  // Agency & Organization Detail
  // ============================================

  async getAgencyById(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.getAgencyById(id, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getOrganizationById(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.getOrganizationByIdAdmin(id, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async updateAgency(id: number, data: AdminUpdateAgencyDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.adminUpdateAgency(id, data, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async updateOrganization(id: number, data: AdminUpdateOrganizationDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.adminUpdateOrganization(id, data, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async updateOrganizationWithCover(id: number, data: AdminUpdateOrganizationDto, coverImage?: File, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.adminUpdateOrganizationWithFormData(id, data, coverImage, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getOrgPhotos(orgId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.getAdminOrgPhotos(orgId, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async addOrgPhoto(orgId: number, image: File, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.addAdminOrgPhoto(orgId, image, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async deleteOrgPhoto(orgId: number, photoId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      await apiClient.deleteAdminOrgPhoto(orgId, photoId, lang);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async deleteAgency(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.adminDeleteAgency(id, lang);
      return { success: true, message: response.message };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async deleteOrganization(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.adminDeleteOrganization(id, lang);
      return { success: true, message: response.message };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Hızlı işletme oluşturma
  async quickCreateOrganization(data: AdminQuickCreateOrganizationDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.adminQuickCreateOrganization(data, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // ============================================
  // İşletme Hizmet Kategorileri (Admin)
  // ============================================

  async getOrgServiceCategories(orgId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.getAdminOrgServiceCategories(orgId, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async createOrgServiceCategory(orgId: number, data: CreateServiceCategoryDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.createAdminOrgServiceCategory(orgId, data, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async updateOrgServiceCategory(orgId: number, categoryId: number, data: UpdateServiceCategoryDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.updateAdminOrgServiceCategory(orgId, categoryId, data, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async deleteOrgServiceCategory(orgId: number, categoryId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      await apiClient.deleteAdminOrgServiceCategory(orgId, categoryId, lang);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // ============================================
  // İşletme Hizmetleri (Admin)
  // ============================================

  async getOrgMenu(orgId: number, lang: 'tr' | 'en' | 'de' | 'de' = 'tr') {
    try {
      const response = await apiClient.getAdminOrgMenu(orgId, lang);
      const data = Array.isArray(response) ? response : (response as unknown as { data: ClientStopMenuCategoryDto[] }).data ?? [];
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getOrgServices(orgId: number, page = 1, limit = 100, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.getAdminOrgServices(orgId, page, limit, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async createOrgService(orgId: number, data: CreateServiceDto, image?: File) {
    try {
      const response = image
        ? await apiClient.createAdminOrgServiceWithImage(orgId, data, image)
        : await apiClient.createAdminOrgService(orgId, data);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async updateOrgService(orgId: number, serviceId: number, data: UpdateServiceDto, image?: File) {
    try {
      const response = image
        ? await apiClient.updateAdminOrgServiceWithImage(orgId, serviceId, data, image)
        : await apiClient.updateAdminOrgService(orgId, serviceId, data);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async deleteOrgService(orgId: number, serviceId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      await apiClient.deleteAdminOrgService(orgId, serviceId, lang);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // ============================================
  // İşletme Kaynakları/Yerleşim (Admin)
  // ============================================

  async getOrgResources(orgId: number) {
    try {
      const response = await apiClient.getAdminOrgResources(orgId);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async createOrgResource(orgId: number, data: CreateResourceDto) {
    try {
      const response = await apiClient.createAdminOrgResource(orgId, data);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async updateOrgResource(orgId: number, resourceId: number, data: UpdateResourceDto) {
    try {
      const response = await apiClient.updateAdminOrgResource(orgId, resourceId, data);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async deleteOrgResource(orgId: number, resourceId: number) {
    try {
      await apiClient.deleteAdminOrgResource(orgId, resourceId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async bulkDeleteOrgResources(ids: number[]): Promise<{ success: boolean; data?: { deleted: number[]; errors: { id: number; message: string }[] }; error?: string }> {
    try {
      const result = await apiClient.bulkDeleteResources(ids);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // ============================================
  // Organization Roles
  // ============================================

  async getOrganizationRoles(page = 1, limit = 100, categoryId?: number) {
    try {
      const response = await apiClient.getAdminOrganizationRoles(page, limit, categoryId);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async createOrganizationRole(data: { key: string; description?: string; categoryId?: number }) {
    try {
      const response = await apiClient.createAdminOrganizationRole(data);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async updateOrganizationRole(id: number, data: { key?: string; description?: string }) {
    try {
      const response = await apiClient.updateAdminOrganizationRole(id, data);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async deleteOrganizationRole(id: number) {
    try {
      await apiClient.deleteAdminOrganizationRole(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // ============================================
  // Agency Roles
  // ============================================

  async getAgencyRoles(page = 1, limit = 100) {
    try {
      const response = await apiClient.getAdminAgencyRoles(page, limit);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async createAgencyRole(data: { key: string; description?: string }) {
    try {
      const response = await apiClient.createAdminAgencyRole(data);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async updateAgencyRole(id: number, data: { key?: string; description?: string }) {
    try {
      const response = await apiClient.updateAdminAgencyRole(id, data);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async deleteAgencyRole(id: number) {
    try {
      await apiClient.deleteAdminAgencyRole(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // ============================================
  // Organization Categories
  // ============================================

  async getOrganizationCategories(page = 1, limit = 100) {
    try {
      const response = await apiClient.getAdminOrganizationCategories(page, limit);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async createOrganizationCategory(data: { name: string; description?: string }) {
    try {
      const response = await apiClient.createAdminOrganizationCategory(data);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async updateOrganizationCategory(id: number, data: { name?: string; description?: string }) {
    try {
      const response = await apiClient.updateAdminOrganizationCategory(id, data);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async deleteOrganizationCategory(id: number) {
    try {
      await apiClient.deleteAdminOrganizationCategory(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // ============================================
  // Resource Types
  // ============================================

  async getResourceTypes(page = 1, limit = 100, categoryId?: number) {
    try {
      const response = await apiClient.getAdminResourceTypes(page, limit, categoryId);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async createResourceType(data: {
    categoryId: number;
    code: string;
    name: string;
    allowsChildren?: boolean;
    supportsCoordinates?: boolean;
    defaultCapacity?: number;
    order?: number;
    childId?: number;
  }) {
    try {
      const response = await apiClient.createAdminResourceType(data);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async updateResourceType(id: number, data: {
    code?: string;
    name?: string;
    allowsChildren?: boolean;
    supportsCoordinates?: boolean;
    defaultCapacity?: number;
    order?: number;
    childId?: number;
  }) {
    try {
      const response = await apiClient.updateAdminResourceType(id, data);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async deleteResourceType(id: number) {
    try {
      await apiClient.deleteAdminResourceType(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // ============================================
  // Users
  // ============================================

  async getUsers(page = 1, limit = 100, filters?: { role?: string; status?: string; search?: string }) {
    try {
      const response = await apiClient.getUsers(page, limit, filters);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getUserById(id: number) {
    try {
      const response = await apiClient.getUserById(id);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async createUser(data: CreateAdminUserDto) {
    try {
      const response = await apiClient.createUser(data);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async updateUser(id: number, data: UpdateAdminUserDto) {
    try {
      const response = await apiClient.updateUser(id, data);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async deleteUser(id: number) {
    try {
      await apiClient.deleteUser(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // ============================================
  // Tours
  // ============================================

  async createTour(
    data: CreateTourPayload & { agencyId: number },
    coverImage?: File,
    galleryImages?: File[],
    lang: 'tr' | 'en' | 'de' = 'tr'
  ): Promise<{ success: boolean; data?: ApiTourDto; error?: string }> {
    try {
      const response = await apiClient.createAdminTour(data, coverImage, galleryImages, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getTours(filters: {
    page?: number;
    limit?: number;
    lang?: 'tr' | 'en' | 'de';
    status?: string;
    search?: string;
    agencyId?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    timeStatus?: string;
  } = {}) {
    try {
      const response = await apiClient.getAdminTours(filters);
      // Normalize: backend may return tourPhotos/photos instead of galleryImages
      const data = (response.data || []).map((tour: any) => {
        if (!tour.galleryImages) {
          const src = tour.tourPhotos || tour.photos;
          if (src) {
            tour.galleryImages = src.map((p: any) => ({
              id: p.id,
              imageUrl: p.imageUrl || p.url || p.photoUrl,
            }));
          }
        }
        return tour;
      });
      return { success: true, data, meta: response.meta };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getTourStops(filters: AdminTourStopsFilters = {}) {
    try {
      const response = await apiClient.getAdminTourStops(filters);
      return { success: true, data: response.data || [], meta: response.meta };
    } catch (error) {
      return { success: false, error: (error as Error).message, data: [], meta: { page: 1, limit: 10, totalCount: 0, totalPages: 0 } };
    }
  },

  async updateTourStopSystemCommissionPaid(id: number, systemCommissionPaid: boolean, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.updateAdminTourStopSystemCommissionPaid(id, systemCommissionPaid, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getTourById(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.getAdminTourById(id, lang) as any;
      // Normalize: backend may return tourPhotos/photos instead of galleryImages
      if (!response.galleryImages) {
        const src = response.tourPhotos || response.photos;
        if (src) {
          response.galleryImages = src.map((p: any) => ({
            id: p.id,
            imageUrl: p.imageUrl || p.url || p.photoUrl,
          }));
        }
      }
      // Normalize participants: backend may nest client data under 'user' instead of 'client'
      if (response.participants?.length) {
        response.participants = response.participants.map((p: any) => {
          if (!p.client && p.user) {
            return { ...p, client: p.user };
          }
          return p;
        });
      }
      // Enrich participants: fetch missing client details
      if (response.participants?.length) {
        const missing = response.participants.filter((p: any) => !p.client && p.clientId);
        if (missing.length > 0) {
          // Try fetching full tour clients list (has nested client objects)
          let clientMap: Record<number, any> = {};
          const extractClients = (tourClients: any[]) => {
            tourClients.forEach((tc: any) => {
              if (tc.client) {
                clientMap[tc.clientId] = {
                  id: tc.client.id,
                  firstName: tc.client.firstName,
                  lastName: tc.client.lastName,
                  email: tc.client.email,
                  phone: tc.client.phone,
                  username: tc.client.username,
                };
              }
            });
          };
          // Try admin endpoint, then agency endpoint, then individual user fallback
          try {
            const res = await apiClient.getAdminTourClients(id, lang);
            const data = Array.isArray(res) ? res : (res as any).data ?? [];
            extractClients(data);
          } catch {
            try {
              const tourClients = await apiClient.getTourClients(id);
              if (Array.isArray(tourClients)) extractClients(tourClients);
            } catch {
              // Last fallback: fetch individual users via admin endpoint
              const results = await Promise.allSettled(
                missing.map((p: any) => apiClient.getUserById(p.clientId, lang))
              );
              results.forEach((r, i) => {
                if (r.status === 'fulfilled' && r.value) {
                  const u = r.value;
                  clientMap[missing[i].clientId] = {
                    id: u.id,
                    firstName: u.firstName,
                    lastName: u.lastName,
                    email: u.email,
                    phone: u.phone,
                    username: u.username,
                  };
                }
              });
            }
          }
          response.participants = response.participants.map((p: any) => {
            if (!p.client && clientMap[p.clientId]) {
              return { ...p, client: clientMap[p.clientId] };
            }
            return p;
          });
        }
      }
      return { success: true, data: response as ApiTourDto };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async batchImportTourClients(tourId: number, file: File, lang: 'tr' | 'en' | 'de' = 'tr'): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await apiClient.adminBatchImportClients(tourId, file, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getStopChoices(stopId: number, lang: 'tr' | 'en' | 'de' = 'tr'): Promise<{ success: boolean; data?: AgencyStopChoicesDto[]; error?: string }> {
    try {
      const response = await apiClient.getAdminStopChoices(stopId, lang);
      const data = Array.isArray(response) ? response : (response as any).data ?? [];
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getStopServiceSummary(stopId: number, lang: 'tr' | 'en' | 'de' = 'tr'): Promise<{ success: boolean; data?: AgencyStopServiceSummaryDto; error?: string }> {
    try {
      const response = await apiClient.getAdminStopServiceSummary(stopId, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async createTourStop(data: CreateTourStopPayload, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.createAdminTourStop(data, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async updateTourStop(id: number, data: UpdateTourStopPayload, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.updateAdminTourStop(id, data, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async deleteTourStop(id: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      await apiClient.deleteTourStop(id, lang);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async approveTourStop(stopId: number, choiceDeadlineTime?: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.approveAdminTourStop(stopId, choiceDeadlineTime, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async rejectTourStop(stopId: number, reason: string, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.rejectAdminTourStop(stopId, reason, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async submitAndApproveChoices(stopId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.submitAndApproveChoices(stopId, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async revokeChoicesApproval(stopId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.revokeChoicesApproval(stopId, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getClientChoices(stopId: number, clientId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.getAdminClientChoices(stopId, clientId, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async createServiceChoiceForClient(stopId: number, clientId: number, data: CreateServiceChoiceDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.createAdminServiceChoice(stopId, clientId, data, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async updateServiceChoiceForClient(serviceChoiceId: number, data: UpdateServiceChoiceDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.updateAdminServiceChoice(serviceChoiceId, data, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // ============================================
  // Notifications
  // ============================================

  async createNotification(formData: FormData) {
    try {
      const response = await apiClient.createNotification(formData);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async listNotifications(page = 1, limit = 10) {
    try {
      const response = await apiClient.listNotifications(page, limit);
      if (response.meta && !response.meta.total && response.meta.totalCount) {
        response.meta.total = response.meta.totalCount;
      }
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async updateNotification(id: number, formData: FormData) {
    try {
      const response = await apiClient.updateNotification(id, formData);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async deleteNotification(id: number) {
    try {
      await apiClient.deleteNotification(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // ============================================
  // System Commissions
  // ============================================

  async listSystemCommissions(filters: {
    page?: number;
    limit?: number;
    scope?: string;
    scopeId?: number;
    active?: boolean;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  } = {}) {
    try {
      const response = await apiClient.listSystemCommissions(filters);
      if (response.meta && !response.meta.total && response.meta.totalCount) {
        response.meta.total = response.meta.totalCount;
      }
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getSystemCommission(id: number) {
    try {
      const response = await apiClient.getSystemCommission(id);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async createSystemCommission(data: CreateSystemCommissionDto) {
    try {
      const response = await apiClient.createSystemCommission(data);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async updateSystemCommission(id: number, data: UpdateSystemCommissionDto) {
    try {
      const response = await apiClient.updateSystemCommission(id, data);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async deleteSystemCommission(id: number) {
    try {
      await apiClient.deleteSystemCommission(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
};

// ============================================
// Service Category API Functions (Real API)
// ============================================

export const serviceCategoryApi = {
  async getAll(lang: 'tr' | 'en' | 'de' = 'tr'): Promise<{ success: boolean; data?: ServiceCategoryDto[]; error?: string }> {
    try {
      const response = await apiClient.getServiceCategories(lang);
      const data = Array.isArray(response) ? response : (response as any).data ?? [];
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getMenu(lang: 'tr' | 'en' | 'de' | 'de' = 'tr'): Promise<{ success: boolean; data?: ClientStopMenuCategoryDto[]; error?: string }> {
    try {
      const response = await apiClient.getServiceCategoriesMenu(lang as 'tr' | 'en' | 'de');
      const data = Array.isArray(response) ? response : (response as any).data ?? [];
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getById(id: number): Promise<{ success: boolean; data?: ServiceCategoryDto; error?: string }> {
    try {
      const response = await apiClient.getServiceCategory(id);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async create(data: CreateServiceCategoryDto): Promise<{ success: boolean; data?: ServiceCategoryDto; error?: string }> {
    try {
      const response = await apiClient.createServiceCategory(data);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async update(id: number, data: UpdateServiceCategoryDto): Promise<{ success: boolean; data?: ServiceCategoryDto; error?: string }> {
    try {
      const response = await apiClient.updateServiceCategory(id, data);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async delete(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.deleteServiceCategory(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
};

// ============================================
// Service API Functions (Real API)
// ============================================

export const serviceApi = {
  async getById(id: number): Promise<{ success: boolean; data?: ServiceDto; error?: string }> {
    try {
      const response = await apiClient.getService(id);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async create(data: CreateServiceDto, image?: File): Promise<{ success: boolean; data?: ServiceDto; error?: string }> {
    try {
      const response = await apiClient.createService(data, image);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async update(id: number, data: UpdateServiceDto, image?: File): Promise<{ success: boolean; data?: ServiceDto; error?: string }> {
    try {
      const response = await apiClient.updateService(id, data, image);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async delete(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.deleteService(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getByCategory(categoryId: number, page = 1, limit = 100, lang: 'tr' | 'en' | 'de' = 'tr'): Promise<{ success: boolean; data?: ServiceDto[]; error?: string }> {
    try {
      const response = await apiClient.getServicesByCategory(categoryId, page, limit, lang);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getByOrganization(orgId: number, page = 1, limit = 100): Promise<{ success: boolean; data?: ServiceDto[]; error?: string }> {
    try {
      const response = await apiClient.getServicesByOrganization(orgId, page, limit);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getActiveByOrganization(orgId: number, page = 1, limit = 100): Promise<{ success: boolean; data?: ServiceDto[]; error?: string }> {
    try {
      const response = await apiClient.getActiveServicesByOrganization(orgId, page, limit);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
};

// ============================================
// Tour API Functions (Real API)
// ============================================

export const tourApi = {
  async list(page = 1, limit = 10, lang: 'tr' | 'en' | 'de' = 'tr', name?: string): Promise<{ success: boolean; data?: ApiTourDto[]; meta?: { total: number; page: number; limit: number; totalPages: number }; error?: string }> {
    try {
      const response = await apiClient.getAgencyTours(page, limit, lang, name);
      // Normalize: backend may return tourPhotos/photos instead of galleryImages
      const data = (response.data || []).map((tour: any) => {
        if (!tour.galleryImages) {
          const src = tour.tourPhotos || tour.photos;
          if (src) {
            tour.galleryImages = src.map((p: any) => ({
              id: p.id,
              imageUrl: p.imageUrl || p.url || p.photoUrl,
            }));
          }
        }
        return tour;
      });
      return { success: true, data, meta: response.meta };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getById(id: number, lang: 'tr' | 'en' | 'de' = 'tr'): Promise<{ success: boolean; data?: ApiTourDto; error?: string }> {
    try {
      const response = await apiClient.getAgencyTourById(id, lang) as any;
      // Normalize: backend may return tourPhotos/photos instead of galleryImages
      if (!response.galleryImages) {
        const src = response.tourPhotos || response.photos;
        if (src) {
          response.galleryImages = src.map((p: any) => ({
            id: p.id,
            imageUrl: p.imageUrl || p.url || p.photoUrl,
          }));
        }
      }
      return { success: true, data: response as ApiTourDto };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async create(data: CreateTourPayload, coverImage?: File, galleryImages?: File[], lang: 'tr' | 'en' | 'de' = 'tr'): Promise<{ success: boolean; data?: ApiTourDto; error?: string }> {
    try {
      const response = await apiClient.createAgencyTour(data, coverImage, galleryImages, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async update(id: number, data: UpdateTourPayload, coverImage?: File, galleryImages?: File[], lang: 'tr' | 'en' | 'de' = 'tr'): Promise<{ success: boolean; data?: ApiTourDto; error?: string }> {
    try {
      const response = await apiClient.updateAgencyTour(id, data, coverImage, galleryImages, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async delete(id: number): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.deleteAgencyTour(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async publish(id: number): Promise<{ success: boolean; data?: ApiTourDto; error?: string }> {
    try {
      const response = await apiClient.publishTour(id);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async cancel(id: number): Promise<{ success: boolean; data?: ApiTourDto; error?: string }> {
    try {
      const response = await apiClient.cancelTour(id);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async complete(id: number): Promise<{ success: boolean; data?: ApiTourDto; error?: string }> {
    try {
      const response = await apiClient.completeTour(id);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async addPhoto(tourId: number, image: File): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await apiClient.addTourPhoto(tourId, image);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async deletePhoto(tourId: number, photoId: number): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.deleteTourPhoto(tourId, photoId);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getClients(tourId: number): Promise<{ success: boolean; data?: TourClientDto[]; error?: string }> {
    try {
      const response = await apiClient.getTourClients(tourId);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async addParticipant(tourId: number, clientId: number, notes?: string): Promise<{ success: boolean; data?: TourClientDto; error?: string }> {
    try {
      const response = await apiClient.addTourParticipant(tourId, clientId, notes);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async updateClientStatus(tourId: number, clientId: number, status: string): Promise<{ success: boolean; data?: TourClientDto; error?: string }> {
    try {
      const response = await apiClient.updateTourClientStatus(tourId, clientId, status);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
};

// ============================================
// Tour Stop API Functions (Real API)
// ============================================

export const tourStopApi = {
  async list(tourId: number, lang: 'tr' | 'en' | 'de' = 'tr'): Promise<{ success: boolean; data?: ApiTourStopDto[]; error?: string }> {
    try {
      const response = await apiClient.getTourStops(tourId, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async create(data: CreateTourStopPayload, lang: 'tr' | 'en' | 'de' = 'tr'): Promise<{ success: boolean; data?: ApiTourStopDto; error?: string }> {
    try {
      const response = await apiClient.createTourStop(data, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async update(id: number, data: UpdateTourStopPayload, lang: 'tr' | 'en' | 'de' = 'tr'): Promise<{ success: boolean; data?: ApiTourStopDto; error?: string }> {
    try {
      const response = await apiClient.updateTourStop(id, data, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async delete(id: number, lang: 'tr' | 'en' | 'de' = 'tr'): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.deleteTourStop(id, lang);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async submitChoices(stopId: number, lang: 'tr' | 'en' | 'de' = 'tr'): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.submitTourStopChoices(stopId, lang);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

};

// ============================================
// VKN (Vergi Kimlik Numarası) Doğrulama
// ============================================

export interface VknVerifyResult {
  valid: boolean;
  companyName?: string;
  error?: string;
}

// ============================================
// Organization Pre-Reservation API Functions (Real API)
// ============================================

export interface PreReservationDto {
  id: number;
  tourId: number;
  organizationId: number;
  tourStopId?: number | null;
  status: 'pending' | 'approved' | 'rejected';
  choicesStatus?: 'in_progress' | 'submitted' | 'approved' | 'rejected' | 'revision_requested' | null;
  headcount?: number;
  note?: string;
  rejectionReason?: string;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  choiceDeadline?: number | null;
  choiceDeadlineTime?: string | null;
  agencyCommissionRate?: number | null;
  createdAt: string;
  updatedAt: string;
  tour?: {
    id: number;
    tourName?: string;
    tourCode?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    maxParticipants?: number;
    minParticipants?: number;
    currentParticipants?: number;
    agency?: { id: number; name: string };
  };
  organization?: {
    id: number;
    name: string;
    agencyCommissionRate?: number | null;
  };
}

export const preReservationOrgApi = {
  async getAll(status?: string, lang: 'tr' | 'en' | 'de' = 'tr'): Promise<{ success: boolean; data?: PreReservationDto[]; error?: string }> {
    try {
      const response = await apiClient.getOrgPreReservations(status, lang);
      const raw = Array.isArray(response) ? response : (response as any).data ?? [];
      // Normalize: backend may return preReservationStatus instead of status
      const data = raw.map((item: any) => ({
        ...item,
        status: item.status || item.preReservationStatus || 'pending',
        tourStopId: item.tourStopId ?? item.tour_stop_id ?? item.tourStop?.id ?? null,
      }));
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async approve(id: number, choiceDeadlineTime?: string, lang: 'tr' | 'en' | 'de' = 'tr'): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.approveOrgPreReservation(id, choiceDeadlineTime, lang);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async reject(id: number, rejectionReason: string, lang: 'tr' | 'en' | 'de' = 'tr'): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.rejectOrgPreReservation(id, rejectionReason, lang);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getChoices(id: number, lang: 'tr' | 'en' | 'de' = 'tr'): Promise<{ success: boolean; data?: AgencyStopChoicesDto[]; error?: string }> {
    try {
      const response = await apiClient.getOrgChoices(id, lang);
      const data = Array.isArray(response) ? response : (response as any).data ?? [];
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async getServiceSummary(id: number, lang: 'tr' | 'en' | 'de' = 'tr'): Promise<{ success: boolean; data?: AgencyStopServiceSummaryDto; error?: string }> {
    try {
      const response = await apiClient.getOrgServiceSummary(id, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async approveChoices(id: number, lang: 'tr' | 'en' | 'de' = 'tr'): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.approveOrgChoices(id, lang);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async rejectChoices(id: number, note: string, lang: 'tr' | 'en' | 'de' = 'tr'): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.rejectOrgChoices(id, note, lang);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async requestChoicesRevision(id: number, note: string, lang: 'tr' | 'en' | 'de' = 'tr'): Promise<{ success: boolean; error?: string }> {
    try {
      await apiClient.requestOrgChoicesRevision(id, note, lang);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
};

// ============================================
// Ticket Messaging API (wrapper functions)
// ============================================

export const ticketApi = {
  // --- Client ---
  async clientCreate(data: CreateTicketDto, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.clientCreateTicket(data, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async clientGetList(params: { page?: number; limit?: number; tourId?: number; status?: TicketStatus; category?: TicketCategory } = {}, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.clientGetTickets(params, lang);
      return { success: true, data: (response as any).data ?? response, meta: (response as any).meta };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async clientGetById(id: number, messagePage = 1, messageLimit = 50, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.clientGetTicketById(id, messagePage, messageLimit, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async clientSendMessage(ticketId: number, content: string, attachments?: File[], lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.clientSendMessage(ticketId, content, attachments, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async clientMarkRead(ticketId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.clientMarkMessagesRead(ticketId, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // --- Agency ---
  async agencyGetList(params: { page?: number; limit?: number; tourId?: number; clientId?: number; status?: TicketStatus; category?: TicketCategory } = {}, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.agencyGetTickets(params, lang);
      return { success: true, data: (response as any).data ?? response, meta: (response as any).meta };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async agencyGetById(id: number, messagePage = 1, messageLimit = 50, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.agencyGetTicketById(id, messagePage, messageLimit, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async agencyUpdateStatus(id: number, status: TicketStatus, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.agencyUpdateTicketStatus(id, status, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async agencySendMessage(ticketId: number, content: string, attachments?: File[], lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.agencySendMessage(ticketId, content, attachments, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async agencyMarkRead(ticketId: number, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.agencyMarkMessagesRead(ticketId, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // --- Admin ---
  async adminGetList(params: { page?: number; limit?: number; agencyId?: number; tourId?: number; clientId?: number; status?: TicketStatus; category?: TicketCategory } = {}, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.adminGetTickets(params, lang);
      return { success: true, data: (response as any).data ?? response, meta: (response as any).meta };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async adminGetById(id: number, messagePage = 1, messageLimit = 50, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.adminGetTicketById(id, messagePage, messageLimit, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async adminUpdateStatus(id: number, status: TicketStatus, lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.adminUpdateTicketStatus(id, status, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  async adminSendMessage(ticketId: number, content: string, attachments?: File[], lang: 'tr' | 'en' | 'de' = 'tr') {
    try {
      const response = await apiClient.adminSendMessage(ticketId, content, attachments, lang);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
};

export async function verifyVKN(taxNumber: string): Promise<VknVerifyResult> {
  try {
    const res = await fetch('/api/verify-vkn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taxNumber }),
    });

    const data: VknVerifyResult = await res.json();
    return data;
  } catch {
    return { valid: false, error: 'Bağlantı hatası, lütfen tekrar deneyin' };
  }
}
