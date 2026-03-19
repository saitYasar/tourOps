'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Building2,
  ArrowLeft,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Pencil,
  User,
  MapPin,
  FolderTree,
  UtensilsCrossed,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';

import { useLanguage } from '@/contexts/LanguageContext';
import {
  adminApi,
  locationApi,
  type AdminQuickCreateOrganizationDto,
  type PaginatedResponse,
  type CategoryDto,
  type LocationDto,
  type ResourceTypeDto,
  type PriceType,
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { EmptyState } from '@/components/shared';
import { useAutoSelect } from '@/hooks/useAutoSelect';

// ===== Types for local state =====
interface LocalTable {
  id: string;
  name: string;
  capacity: number;
}

interface LocalRoom {
  id: string;
  name: string;
  tables: LocalTable[];
  open: boolean;
}

interface LocalFloor {
  id: string;
  name: string;
  rooms: LocalRoom[];
  open: boolean;
}

interface LocalService {
  id: string;
  title: string;
  basePrice: number;
  priceType: PriceType;
  description: string;
}

interface LocalServiceCategory {
  id: string;
  name: string;
  description: string;
  services: LocalService[];
  open: boolean;
}

let _idCounter = 0;
function uid() {
  return `local_${++_idCounter}`;
}

export default function QuickCreateOrganizationPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const a = t.admin as Record<string, string>;

  // ===== Form state =====
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [address, setAddress] = useState('');
  const [countryId, setCountryId] = useState<number | undefined>();
  const [cityId, setCityId] = useState<number | undefined>();
  const [districtId, setDistrictId] = useState<number | undefined>();
  const [phoneCountryCode, setPhoneCountryCode] = useState('90');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [legalName, setLegalName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [taxOffice, setTaxOffice] = useState('');

  // Optional section toggles
  const [showAuthorizedPerson, setShowAuthorizedPerson] = useState(false);
  const [showSeatingLayout, setShowSeatingLayout] = useState(false);
  const [showMenuServices, setShowMenuServices] = useState(false);

  // Authorized person
  const [apFirstName, setApFirstName] = useState('');
  const [apLastName, setApLastName] = useState('');
  const [apEmail, setApEmail] = useState('');
  const [apPhone, setApPhone] = useState('');
  const [apPhoneCountryCode, setApPhoneCountryCode] = useState('90');

  // Seating layout
  const [floors, setFloors] = useState<LocalFloor[]>([]);

  // Menu / Services
  const [serviceCategories, setServiceCategories] = useState<LocalServiceCategory[]>([]);
  const [selectedLocalCat, setSelectedLocalCat] = useState<string | null>(null);

  // Category dialog
  const [isCatDialogOpen, setIsCatDialogOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catFormName, setCatFormName] = useState('');

  // Service dialog
  const [isSvcDialogOpen, setIsSvcDialogOpen] = useState(false);
  const [editingSvcId, setEditingSvcId] = useState<string | null>(null);
  const [svcFormTitle, setSvcFormTitle] = useState('');
  const [svcFormDesc, setSvcFormDesc] = useState('');
  const [svcFormPrice, setSvcFormPrice] = useState(0);
  const [svcFormPriceType, setSvcFormPriceType] = useState<PriceType>('fixed');

  // ===== Data queries =====
  const { data: categoriesResult } = useQuery({
    queryKey: ['admin-org-categories'],
    queryFn: () => adminApi.getOrganizationCategories(),
  });

  const { data: countriesResult } = useQuery({
    queryKey: ['countries'],
    queryFn: () => locationApi.getCountries(),
  });

  const { data: citiesResult } = useQuery({
    queryKey: ['cities', countryId],
    queryFn: () => locationApi.getCities(countryId),
    enabled: !!countryId,
  });

  const { data: districtsResult } = useQuery({
    queryKey: ['districts', cityId],
    queryFn: () => locationApi.getDistricts(cityId),
    enabled: !!cityId,
  });

  const { data: resourceTypesResult } = useQuery({
    queryKey: ['admin-resource-types'],
    queryFn: () => adminApi.getResourceTypes(),
  });

  const categories = categoriesResult?.success
    ? (categoriesResult.data as PaginatedResponse<CategoryDto>)?.data || []
    : [];
  const countries = countriesResult?.success
    ? (countriesResult.data as PaginatedResponse<LocationDto>)?.data || []
    : [];
  const cities = citiesResult?.success
    ? (citiesResult.data as PaginatedResponse<LocationDto>)?.data || []
    : [];
  const districts = districtsResult?.success
    ? (districtsResult.data as PaginatedResponse<LocationDto>)?.data || []
    : [];
  const resourceTypes = resourceTypesResult?.success
    ? (resourceTypesResult.data as PaginatedResponse<ResourceTypeDto>)?.data || []
    : [];

  // Auto-select cascading
  useAutoSelect(
    cities,
    cityId,
    (city: LocationDto) => { setCityId(city.id); setDistrictId(undefined); },
    { enabled: true }
  );

  useAutoSelect(
    districts,
    districtId,
    (district: LocationDto) => setDistrictId(district.id),
    { enabled: true }
  );

  // Resolve resource type IDs
  const floorTypeId = resourceTypes.find((t) => t.code === 'floor')?.id;
  const roomTypeId = resourceTypes.find((t) => t.code === 'room')?.id;
  const tableTypeId = resourceTypes.find((t) => t.code === 'table')?.id;

  // ===== Create mutation =====
  const createMutation = useMutation({
    mutationFn: (data: AdminQuickCreateOrganizationDto) =>
      adminApi.quickCreateOrganization(data),
    onSuccess: (result) => {
      if (result.success && result.data) {
        toast.success(a.quickCreateSuccess);
        const orgId = (result.data as { organization?: { id: number } })?.organization?.id;
        router.push(orgId ? `/admin/restaurants/${orgId}` : '/admin/restaurants');
      } else {
        toast.error(result.error || a.quickCreateError);
      }
    },
    onError: (error) => {
      toast.error((error as Error).message || a.quickCreateError);
    },
  });

  // ===== Submit =====
  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error(`${t.tooltips.fillRequired}: ${a.nameLabel}`);
      return;
    }

    const dto: AdminQuickCreateOrganizationDto = {
      name,
    };

    if (categoryId) dto.categoryId = categoryId;
    if (address) dto.address = address;
    if (countryId) dto.countryId = countryId;
    if (cityId) dto.cityId = cityId;
    if (districtId) dto.districtId = districtId;
    if (phone) {
      dto.phoneCountryCode = Number(phoneCountryCode);
      dto.phone = phone;
    }
    if (email) dto.email = email;
    if (legalName) dto.legalName = legalName;
    if (taxNumber) dto.taxNumber = taxNumber;
    if (taxOffice) dto.taxOffice = taxOffice;

    // Authorized person
    if (apFirstName && apLastName && apEmail) {
      dto.authorizedPerson = {
        firstName: apFirstName,
        lastName: apLastName,
        email: apEmail,
        phone: apPhone,
        phoneCountryCode: apPhoneCountryCode,
      };
    }

    // Resources (seating layout)
    if (floors.length > 0 && floorTypeId && roomTypeId && tableTypeId) {
      dto.resources = floors.map((floor, fi) => ({
        name: floor.name,
        resourceTypeId: floorTypeId,
        order: fi + 1,
        children: floor.rooms.map((room, ri) => ({
          name: room.name,
          resourceTypeId: roomTypeId,
          order: ri + 1,
          children: room.tables.map((table, ti) => ({
            name: table.name,
            resourceTypeId: tableTypeId,
            capacity: table.capacity,
            order: ti + 1,
          })),
        })),
      }));
    }

    // Service categories
    if (serviceCategories.length > 0) {
      dto.serviceCategories = serviceCategories.map((cat, ci) => ({
        name: cat.name,
        description: cat.description || undefined,
        displayOrder: ci + 1,
        services: cat.services.map((svc) => ({
          title: svc.title,
          basePrice: svc.basePrice,
          priceType: svc.priceType,
          description: svc.description || undefined,
        })),
      }));
    }

    createMutation.mutate(dto);
  };

  // ===== Floor helpers =====
  const addFloor = () =>
    setFloors([...floors, { id: uid(), name: '', rooms: [], open: true }]);

  const removeFloor = (id: string) =>
    setFloors(floors.filter((f) => f.id !== id));

  const updateFloor = (id: string, patch: Partial<LocalFloor>) =>
    setFloors(floors.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const addRoom = (floorId: string) =>
    setFloors(
      floors.map((f) =>
        f.id === floorId
          ? { ...f, rooms: [...f.rooms, { id: uid(), name: '', tables: [], open: true }] }
          : f
      )
    );

  const removeRoom = (floorId: string, roomId: string) =>
    setFloors(
      floors.map((f) =>
        f.id === floorId ? { ...f, rooms: f.rooms.filter((r) => r.id !== roomId) } : f
      )
    );

  const updateRoom = (floorId: string, roomId: string, patch: Partial<LocalRoom>) =>
    setFloors(
      floors.map((f) =>
        f.id === floorId
          ? { ...f, rooms: f.rooms.map((r) => (r.id === roomId ? { ...r, ...patch } : r)) }
          : f
      )
    );

  const addTable = (floorId: string, roomId: string) =>
    setFloors(
      floors.map((f) =>
        f.id === floorId
          ? {
              ...f,
              rooms: f.rooms.map((r) =>
                r.id === roomId
                  ? { ...r, tables: [...r.tables, { id: uid(), name: '', capacity: 4 }] }
                  : r
              ),
            }
          : f
      )
    );

  const removeTable = (floorId: string, roomId: string, tableId: string) =>
    setFloors(
      floors.map((f) =>
        f.id === floorId
          ? {
              ...f,
              rooms: f.rooms.map((r) =>
                r.id === roomId ? { ...r, tables: r.tables.filter((t) => t.id !== tableId) } : r
              ),
            }
          : f
      )
    );

  const updateTable = (
    floorId: string,
    roomId: string,
    tableId: string,
    patch: Partial<LocalTable>
  ) =>
    setFloors(
      floors.map((f) =>
        f.id === floorId
          ? {
              ...f,
              rooms: f.rooms.map((r) =>
                r.id === roomId
                  ? {
                      ...r,
                      tables: r.tables.map((t) => (t.id === tableId ? { ...t, ...patch } : t)),
                    }
                  : r
              ),
            }
          : f
      )
    );

  // ===== Service category helpers =====
  const removeServiceCategory = (id: string) => {
    setServiceCategories(serviceCategories.filter((c) => c.id !== id));
    if (selectedLocalCat === id) setSelectedLocalCat(null);
  };

  const removeService = (catId: string, svcId: string) =>
    setServiceCategories(
      serviceCategories.map((c) =>
        c.id === catId ? { ...c, services: c.services.filter((s) => s.id !== svcId) } : c
      )
    );

  const priceTypeOptions: { value: PriceType; label: string }[] = [
    { value: 'fixed', label: a.priceFixed },
    { value: 'per_person', label: a.pricePerPerson },
    { value: 'per_hour', label: a.pricePerHour },
    { value: 'per_day', label: a.pricePerDay },
  ];

  // Category dialog handlers
  const openCreateCatDialog = () => {
    setEditingCatId(null);
    setCatFormName('');
    setIsCatDialogOpen(true);
  };

  const openEditCatDialog = (cat: LocalServiceCategory) => {
    setEditingCatId(cat.id);
    setCatFormName(cat.name);
    setIsCatDialogOpen(true);
  };

  const handleCatSubmit = () => {
    if (!catFormName.trim()) { toast.error(t.common.required); return; }
    if (editingCatId) {
      setServiceCategories(serviceCategories.map((c) =>
        c.id === editingCatId ? { ...c, name: catFormName } : c
      ));
    } else {
      const newCat: LocalServiceCategory = { id: uid(), name: catFormName, description: '', services: [], open: true };
      setServiceCategories([...serviceCategories, newCat]);
      setSelectedLocalCat(newCat.id);
    }
    setIsCatDialogOpen(false);
  };

  // Service dialog handlers
  const openCreateSvcDialog = () => {
    setEditingSvcId(null);
    setSvcFormTitle('');
    setSvcFormDesc('');
    setSvcFormPrice(0);
    setSvcFormPriceType('fixed');
    setIsSvcDialogOpen(true);
  };

  const openEditSvcDialog = (svc: LocalService) => {
    setEditingSvcId(svc.id);
    setSvcFormTitle(svc.title);
    setSvcFormDesc(svc.description);
    setSvcFormPrice(svc.basePrice);
    setSvcFormPriceType(svc.priceType);
    setIsSvcDialogOpen(true);
  };

  const handleSvcSubmit = () => {
    if (!svcFormTitle.trim()) { toast.error(`${a.serviceName} ${t.common.required}`); return; }
    if (!selectedLocalCat) return;
    if (editingSvcId) {
      setServiceCategories(serviceCategories.map((c) =>
        c.id === selectedLocalCat
          ? { ...c, services: c.services.map((s) => s.id === editingSvcId ? { ...s, title: svcFormTitle, description: svcFormDesc, basePrice: svcFormPrice, priceType: svcFormPriceType } : s) }
          : c
      ));
    } else {
      setServiceCategories(serviceCategories.map((c) =>
        c.id === selectedLocalCat
          ? { ...c, services: [...c.services, { id: uid(), title: svcFormTitle, description: svcFormDesc, basePrice: svcFormPrice, priceType: svcFormPriceType }] }
          : c
      ));
    }
    setIsSvcDialogOpen(false);
  };

  const selectedCatData = serviceCategories.find((c) => c.id === selectedLocalCat);
  const selectedCatServices = selectedCatData?.services || [];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/restaurants')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {a.backToList}
        </Button>
        <div className="p-2.5 bg-orange-100 rounded-xl">
          <Building2 className="h-6 w-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{a.quickCreate}</h1>
          <p className="text-slate-500 text-sm">{a.quickCreateDesc}</p>
        </div>
      </div>

      {/* 1. İşletme Bilgileri */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-orange-500" />
            {a.orgDetails}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{a.nameLabel} *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{a.categoryLabel2}</label>
              <Select
                value={categoryId?.toString() || ''}
                onValueChange={(val) => setCategoryId(Number(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={a.selectCategory} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-1 block">{a.addressLabel}</label>
            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{a.countryLabel}</label>
              <Select
                value={countryId?.toString() || ''}
                onValueChange={(val) => {
                  setCountryId(Number(val));
                  setCityId(undefined);
                  setDistrictId(undefined);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={a.selectCountry} />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{a.cityLabel}</label>
              <Select
                value={cityId?.toString() || ''}
                onValueChange={(val) => {
                  setCityId(Number(val));
                  setDistrictId(undefined);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={a.selectCity} />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{a.districtLabel}</label>
              <Select
                value={districtId?.toString() || ''}
                onValueChange={(val) => setDistrictId(Number(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={a.selectDistrict} />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{a.phoneLabel}</label>
              <div className="flex gap-2">
                <Input
                  value={phoneCountryCode}
                  onChange={(e) => setPhoneCountryCode(e.target.value)}
                  className="w-20"
                  placeholder="90"
                />
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{a.emailLabel}</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{a.legalNameLabel}</label>
              <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{a.taxNumberLabel}</label>
              <Input value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{a.taxOfficeLabel}</label>
              <Input value={taxOffice} onChange={(e) => setTaxOffice(e.target.value)} />
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Optional section toggles */}
      <div className="flex flex-wrap gap-2">
        {!showAuthorizedPerson && (
          <Button variant="outline" onClick={() => setShowAuthorizedPerson(true)}>
            <User className="h-4 w-4 mr-2" />
            {a.authorizedPersonInfo}
            <Plus className="h-4 w-4 ml-2" />
          </Button>
        )}
        {!showSeatingLayout && (
          <Button variant="outline" onClick={() => setShowSeatingLayout(true)}>
            <Layers className="h-4 w-4 mr-2" />
            {a.seatingLayout}
            <Plus className="h-4 w-4 ml-2" />
          </Button>
        )}
        {!showMenuServices && (
          <Button variant="outline" onClick={() => setShowMenuServices(true)}>
            <UtensilsCrossed className="h-4 w-4 mr-2" />
            {a.menuAndServices}
            <Plus className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>

      {/* 2. Yetkili Kişi */}
      {showAuthorizedPerson && (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-orange-500" />
              {a.authorizedPersonInfo}
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-500" onClick={() => setShowAuthorizedPerson(false)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{a.firstName}</label>
              <Input value={apFirstName} onChange={(e) => setApFirstName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{a.lastName}</label>
              <Input value={apLastName} onChange={(e) => setApLastName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{a.emailLabel}</label>
              <Input type="email" value={apEmail} onChange={(e) => setApEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{a.phoneLabel}</label>
              <div className="flex gap-2">
                <Input
                  value={apPhoneCountryCode}
                  onChange={(e) => setApPhoneCountryCode(e.target.value)}
                  className="w-20"
                  placeholder="90"
                />
                <Input
                  value={apPhone}
                  onChange={(e) => setApPhone(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* 3. Oturma Düzeni */}
      {showSeatingLayout && (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-orange-500" />
                {a.seatingLayout}
              </CardTitle>
              <CardDescription>{a.seatingLayoutDesc}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-500" onClick={() => setShowSeatingLayout(false)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {floors.map((floor) => (
            <Collapsible
              key={floor.id}
              open={floor.open}
              onOpenChange={(open) => updateFloor(floor.id, { open })}
            >
              <div className="border rounded-lg">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      {floor.open ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                      <Layers className="h-4 w-4 text-orange-500" />
                      <Input
                        value={floor.name}
                        onChange={(e) => updateFloor(floor.id, { name: e.target.value })}
                        placeholder={a.floorName}
                        className="h-8 w-48"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFloor(floor.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-3 pb-3 space-y-2 ml-6">
                    {floor.rooms.map((room) => (
                      <Collapsible
                        key={room.id}
                        open={room.open}
                        onOpenChange={(open) => updateRoom(floor.id, room.id, { open })}
                      >
                        <div className="border rounded-lg bg-slate-50/50">
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-2 cursor-pointer hover:bg-slate-100">
                              <div className="flex items-center gap-2">
                                {room.open ? (
                                  <ChevronDown className="h-3 w-3 text-slate-400" />
                                ) : (
                                  <ChevronRight className="h-3 w-3 text-slate-400" />
                                )}
                                <MapPin className="h-3 w-3 text-blue-500" />
                                <Input
                                  value={room.name}
                                  onChange={(e) =>
                                    updateRoom(floor.id, room.id, { name: e.target.value })
                                  }
                                  placeholder={a.roomName}
                                  className="h-7 w-40 text-sm"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 h-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeRoom(floor.id, room.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="px-2 pb-2 space-y-1 ml-5">
                              {room.tables.map((table) => (
                                <div key={table.id} className="flex items-center gap-2">
                                  <Input
                                    value={table.name}
                                    onChange={(e) =>
                                      updateTable(floor.id, room.id, table.id, {
                                        name: e.target.value,
                                      })
                                    }
                                    placeholder={a.tableName}
                                    className="h-7 w-32 text-sm"
                                  />
                                  <Input
                                    type="number"
                                    value={table.capacity}
                                    onChange={(e) =>
                                      updateTable(floor.id, room.id, table.id, {
                                        capacity: Number(e.target.value) || 0,
                                      })
                                    }
                                    className="h-7 w-20 text-sm"
                                    placeholder={a.capacity}
                                    min={0}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 h-7 px-1"
                                    onClick={() => removeTable(floor.id, room.id, table.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => addTable(floor.id, room.id)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {a.addTable}
                              </Button>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => addRoom(floor.id)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {a.addRoom}
                    </Button>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
          <Button variant="outline" onClick={addFloor}>
            <Plus className="h-4 w-4 mr-1" />
            {a.addFloor}
          </Button>
        </CardContent>
      </Card>
      )}

      {/* 4. Menü / Hizmetler — Two-panel layout like restaurant menu page */}
      {showMenuServices && (
      <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-semibold">{a.menuAndServices}</h2>
          <p className="text-sm text-slate-400 hidden md:block">— {a.menuAndServicesDesc}</p>
        </div>
        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-500" onClick={() => setShowMenuServices(false)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Panel: Category List */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-medium">{t.menu.categories}</CardTitle>
            <Button size="sm" onClick={openCreateCatDialog}>
              <Plus className="h-4 w-4 mr-1" />
              {t.common.create}
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {!serviceCategories.length ? (
              <EmptyState
                icon={FolderTree}
                title={t.menu.noCategories}
                description={t.menu.noCategories}
                actionLabel={t.menu.newCategory}
                onAction={openCreateCatDialog}
              />
            ) : (
              <div className="space-y-0.5">
                {serviceCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      selectedLocalCat === cat.id
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                    onClick={() => setSelectedLocalCat(cat.id)}
                  >
                    <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 bg-slate-100`}>
                      <FolderTree className="h-3 w-3 text-slate-400" />
                    </div>
                    <span className="text-sm font-medium truncate flex-1">{cat.name || a.categoryName}</span>
                    <span className="text-[10px] text-slate-400">{cat.services.length}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Panel: Selected Category Details + Services */}
        <Card className="lg:col-span-2 flex flex-col">
          {!selectedCatData ? (
            <CardContent className="flex-1 flex items-center justify-center py-16">
              <EmptyState
                icon={FolderTree}
                title={t.menu.selectCategory}
                description={t.menu.selectCategory}
              />
            </CardContent>
          ) : (
            <>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-medium">{selectedCatData.name}</CardTitle>
                    <p className="text-xs text-slate-400 mt-1">
                      {selectedCatServices.length} {t.menu.services.toLowerCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="default" size="sm" className="h-8 text-xs" onClick={openCreateSvcDialog}>
                      <Plus className="h-3 w-3 mr-1" />
                      {t.menu.newService}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditCatDialog(selectedCatData)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeServiceCategory(selectedCatData.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                {!selectedCatServices.length ? (
                  <EmptyState
                    icon={FolderTree}
                    title={t.menu.noServices}
                    description={t.menu.noServices}
                    actionLabel={t.menu.newService}
                    onAction={openCreateSvcDialog}
                  />
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {selectedCatServices.map((svc) => (
                      <Card key={svc.id} className="overflow-hidden">
                        <div className="flex p-3 gap-3">
                          <CardContent className="flex-1 p-0 overflow-hidden">
                            <div className="flex items-start justify-between gap-1">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-sm truncate" title={svc.title}>{svc.title}</h4>
                                {svc.description && (
                                  <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{svc.description}</p>
                                )}
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-sm font-semibold text-primary">
                                    {Number(svc.basePrice).toFixed(2)} TL
                                  </span>
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {priceTypeOptions.find((o) => o.value === svc.priceType)?.label || svc.priceType}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditSvcDialog(svc)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeService(selectedCatData.id, svc.id)}>
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* Category Form Dialog */}
      <Dialog open={isCatDialogOpen} onOpenChange={setIsCatDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCatId ? t.menu.editCategory : t.menu.newCategory}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t.menu.categoryName} *</Label>
              <Input
                value={catFormName}
                onChange={(e) => setCatFormName(e.target.value)}
                placeholder={t.menu.categoryName}
                onKeyDown={(e) => e.key === 'Enter' && handleCatSubmit()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCatDialogOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleCatSubmit}>{editingCatId ? t.common.update : t.common.create}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Form Dialog */}
      <Dialog open={isSvcDialogOpen} onOpenChange={setIsSvcDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSvcId ? t.menu.editService : t.menu.newService}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t.menu.serviceTitle} *</Label>
              <Input
                value={svcFormTitle}
                onChange={(e) => setSvcFormTitle(e.target.value)}
                placeholder={t.menu.serviceTitle}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.menu.serviceContentsDescription}</Label>
              <Textarea
                value={svcFormDesc}
                onChange={(e) => setSvcFormDesc(e.target.value)}
                placeholder={t.menu.serviceContentsDescription}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.menu.basePrice} (TL) *</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={svcFormPrice || ''}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setSvcFormPrice(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.menu.priceType} *</Label>
                <Select value={svcFormPriceType} onValueChange={(v) => setSvcFormPriceType(v as PriceType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priceTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSvcDialogOpen(false)}>{t.common.cancel}</Button>
            <Button onClick={handleSvcSubmit}>{editingSvcId ? t.common.update : t.common.create}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <Button
          size="lg"
          className="bg-orange-600 hover:bg-orange-700"
          onClick={handleSubmit}
          disabled={createMutation.isPending}
        >
          <Building2 className="h-5 w-5 mr-2" />
          {createMutation.isPending ? a.creating : a.quickCreate}
        </Button>
      </div>
    </div>
  );
}
