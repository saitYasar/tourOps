'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Trash2, Image } from 'lucide-react';
import { toast } from 'sonner';

import { organizationApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LoadingState, EmptyState, ConfirmDialog, ImageCropper, SprinterLoading } from '@/components/shared';

export default function PhotosPage() {
  const { t, locale } = useLanguage();
  const queryClient = useQueryClient();
  const [deletePhotoId, setDeletePhotoId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState('');

  const { data: orgResult } = useQuery({
    queryKey: ['my-organization'],
    queryFn: () => organizationApi.getMyOrganization(),
  });
  const orgStatus = orgResult?.success ? orgResult.data?.status : undefined;

  // Fetch photos - sadece /organizations/my/photos endpoint'i
  const { data: photosResult, isLoading: photosLoading } = useQuery({
    queryKey: ['organization-photos'],
    queryFn: () => organizationApi.getPhotos(),
  });

  const photos = photosResult?.success ? photosResult.data || [] : [];

  // Add photo mutation - POST /organizations/my/photos
  const addPhotoMutation = useMutation({
    mutationFn: (file: File) => organizationApi.addPhoto(file),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(t.common.success);
        queryClient.invalidateQueries({ queryKey: ['organization-photos'] });
      } else {
        toast.error(result.error || t.common.error);
      }
      setUploading(false);
    },
    onError: () => {
      toast.error(t.common.error);
      setUploading(false);
    },
  });

  // Delete photo mutation - DELETE /organizations/my/photos/{photoId}
  const deletePhotoMutation = useMutation({
    mutationFn: (photoId: number) => organizationApi.deletePhoto(photoId),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(t.common.success);
        queryClient.invalidateQueries({ queryKey: ['organization-photos'] });
      } else {
        toast.error(result.error || t.common.error);
      }
      setDeletePhotoId(null);
    },
    onError: () => {
      toast.error(t.common.error);
      setDeletePhotoId(null);
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(t.common.error);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t.common.error);
      return;
    }

    if (photos.length >= 5) {
      toast.error(t.common.error);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropperImageSrc(reader.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const file = new File([croppedBlob], 'cropped-image.jpg', { type: 'image/jpeg' });
    setUploading(true);
    addPhotoMutation.mutate(file);
  };

  const handleDelete = () => {
    if (deletePhotoId) {
      deletePhotoMutation.mutate(deletePhotoId);
    }
  };

  if (photosLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title={t.restaurant.photosTitle} organizationStatus={orgStatus} lang={locale} />
        <div className="flex-1 p-6">
          <LoadingState message={t.common.loading} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={t.restaurant.photosTitle} description={t.restaurant.photosDesc} organizationStatus={orgStatus} lang={locale} />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          {/* Gallery */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5" />
                  {t.tours.gallery}
                </CardTitle>
                <CardDescription>
                  {photos.length}/5
                </CardDescription>
              </div>
              {photos.length < 5 && (
                <div className="relative">
                  <Button disabled={uploading}>
                    {uploading ? (
                      <>
                        <SprinterLoading size="xs" className="mr-2" />
                        {t.common.loading}
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {t.menu.uploadImage}
                      </>
                    )}
                  </Button>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                </div>
              )}
            </CardHeader>
            <CardContent>
              {photos.length === 0 ? (
                <EmptyState
                  icon={Image}
                  title={t.common.noData}
                  description={t.restaurant.addPhotosDesc}
                  actionLabel={t.menu.uploadImage}
                  onAction={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.imageUrl}
                        alt={`Gallery ${photo.id}`}
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => setDeletePhotoId(photo.id)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded">
                        {new Date(photo.createdAt).toLocaleDateString('tr-TR')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image Cropper */}
      <ImageCropper
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        imageSrc={cropperImageSrc}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
        title={t.restaurant.photosTitle}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletePhotoId}
        onOpenChange={(open) => !open && setDeletePhotoId(null)}
        title={t.restaurant.deletePhoto}
        description={t.restaurant.deletePhoto}
        confirmLabel={t.common.delete}
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
