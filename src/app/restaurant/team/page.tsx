'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Mail, Phone, User, Shield, Clock, CheckCircle, XCircle, Ban, Send, Users, MoreVertical, UserMinus, UserX } from 'lucide-react';
import { toast } from 'sonner';

import { organizationApi, invitationApi, type InviteUserDto, type InvitationDto, type TeamMemberDto, type RoleDto } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatPhoneNumber, cleanPhoneNumber } from '@/lib/utils';
import { SprinterLoading, ConfirmDialog } from '@/components/shared';

import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface InviteFormData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  phoneCountryCode: number;
  roleIds: number[];
  message: string;
}

const initialFormData: InviteFormData = {
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  phoneCountryCode: 90,
  roleIds: [],
  message: '',
};

const countryCodes = [
  { code: 90, name: 'TR (+90)', flag: '🇹🇷' },
  { code: 1, name: 'US (+1)', flag: '🇺🇸' },
  { code: 44, name: 'UK (+44)', flag: '🇬🇧' },
  { code: 49, name: 'DE (+49)', flag: '🇩🇪' },
  { code: 33, name: 'FR (+33)', flag: '🇫🇷' },
  { code: 31, name: 'NL (+31)', flag: '🇳🇱' },
  { code: 39, name: 'IT (+39)', flag: '🇮🇹' },
  { code: 34, name: 'ES (+34)', flag: '🇪🇸' },
];

export default function TeamPage() {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<InviteFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof InviteFormData, string>>>({});

  const { data: orgResult } = useQuery({
    queryKey: ['my-organization'],
    queryFn: () => organizationApi.getMyOrganization(),
  });
  const orgStatus = orgResult?.success ? orgResult.data?.status : undefined;

  // Role management dialog state
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMemberDto | null>(null);
  const [removeMemberId, setRemoveMemberId] = useState<number | null>(null);

  // Fetch roles from API
  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['organization-roles'],
    queryFn: () => organizationApi.getRoles(),
  });

  // Fetch sent invitations
  const { data: invitationsData, isLoading: invitationsLoading } = useQuery({
    queryKey: ['my-invitations'],
    queryFn: () => invitationApi.getMyInvitations(1, 50),
  });

  // Fetch team members
  const { data: teamMembersData, isLoading: teamMembersLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: () => organizationApi.getTeamMembers(),
  });

  const availableRoles = rolesData?.success ? rolesData.data?.data || [] : [];
  const invitations = invitationsData?.success ? invitationsData.data?.data || [] : [];
  const teamMembers = teamMembersData?.success ? teamMembersData.data || [] : [];

  // Update selectedMember when teamMembers changes (after role update)
  useEffect(() => {
    if (selectedMember && teamMembers.length > 0) {
      const updated = teamMembers.find((m) => m.id === selectedMember.id);
      if (updated) {
        setSelectedMember(updated);
      }
    }
  }, [teamMembers, selectedMember?.id]);

  const inviteMutation = useMutation({
    mutationFn: (data: InviteUserDto) => organizationApi.inviteUser(data),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(t.team.inviteSent);
        setFormData(initialFormData);
        setErrors({});
        queryClient.invalidateQueries({ queryKey: ['my-invitations'] });
      } else {
        toast.error(result.error || t.team.inviteError);
      }
    },
    onError: () => {
      toast.error(t.team.inviteError);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (invitationId: number) => invitationApi.cancel(invitationId),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(t.team.inviteCancelled);
        queryClient.invalidateQueries({ queryKey: ['my-invitations'] });
      } else {
        toast.error(result.error || t.team.inviteCancelError);
      }
    },
    onError: () => {
      toast.error(t.team.inviteCancelError);
    },
  });

  const removeTeamMemberMutation = useMutation({
    mutationFn: (userId: number) => organizationApi.removeTeamMember(userId),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(t.team.memberRemoved);
        queryClient.invalidateQueries({ queryKey: ['team-members'] });
      } else {
        toast.error(result.error || t.team.memberRemoveError);
      }
    },
    onError: () => {
      toast.error(t.team.memberRemoveError);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: number; status: 'active' | 'inactive' }) =>
      organizationApi.updateTeamMemberStatus(userId, status),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(t.team.statusUpdated);
        queryClient.invalidateQueries({ queryKey: ['team-members'] });
      } else {
        toast.error(result.error || t.team.statusUpdateError);
      }
    },
    onError: () => {
      toast.error(t.team.statusUpdateError);
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: number; roleId: number }) =>
      organizationApi.assignRole(userId, roleId),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(t.team.roleAssigned);
        queryClient.invalidateQueries({ queryKey: ['team-members'] });
      } else {
        toast.error(result.error || t.team.roleAssignError);
      }
    },
    onError: () => {
      toast.error(t.team.roleAssignError);
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: number; roleId: number }) =>
      organizationApi.removeRole(userId, roleId),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(t.team.roleRemoved);
        queryClient.invalidateQueries({ queryKey: ['team-members'] });
      } else {
        toast.error(result.error || t.team.roleRemoveError);
      }
    },
    onError: () => {
      toast.error(t.team.roleRemoveError);
    },
  });

  const handleOpenRoleDialog = (member: TeamMemberDto) => {
    setSelectedMember(member);
    setRoleDialogOpen(true);
  };

  const handleToggleRole = (roleId: number) => {
    if (!selectedMember) return;

    const hasRole = selectedMember.roles.some((r) => r.id === roleId);
    if (hasRole) {
      // Check if it's the last role
      if (selectedMember.roles.length === 1) {
        toast.error(t.team.lastRoleError);
        return;
      }
      removeRoleMutation.mutate({ userId: selectedMember.id, roleId });
    } else {
      assignRoleMutation.mutate({ userId: selectedMember.id, roleId });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof InviteFormData, string>> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = t.team.firstNameRequired;
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = t.team.lastNameRequired;
    }
    if (!formData.email.trim()) {
      newErrors.email = t.team.emailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t.team.emailInvalid;
    }
    if (!formData.phone.trim() || cleanPhoneNumber(formData.phone).length < 10) {
      newErrors.phone = t.team.phoneRequired;
    }
    if (formData.roleIds.length === 0) {
      newErrors.roleIds = t.team.rolesRequired;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const submitData: InviteUserDto = {
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: cleanPhoneNumber(formData.phone),
      phoneCountryCode: formData.phoneCountryCode,
      roleIds: formData.roleIds,
      message: formData.message || undefined,
    };

    inviteMutation.mutate(submitData);
  };

  const toggleRole = (roleId: number) => {
    setFormData((prev) => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId)
        ? prev.roleIds.filter((id) => id !== roleId)
        : [...prev.roleIds, roleId],
    }));
    // Clear role error when user selects a role
    if (errors.roleIds) {
      setErrors((prev) => ({ ...prev, roleIds: undefined }));
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getMemberStatusBadge = (status: TeamMemberDto['status']) => {
    if (status === 'active') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          {t.team.active}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
        {t.team.inactive}
      </span>
    );
  };

  const getStatusBadge = (status: InvitationDto['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <Clock className="h-3 w-3" />
            {t.team.invPending}
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3" />
            {t.team.invAccepted}
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            <XCircle className="h-3 w-3" />
            {t.team.invExpired}
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <Ban className="h-3 w-3" />
            {t.team.invCancelled}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title={t.team.title} description={t.team.description} organizationStatus={orgStatus} lang={locale} />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Team Members Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>{t.team.teamMembers}</CardTitle>
                    <CardDescription>{t.team.teamMembersOrgDesc}</CardDescription>
                  </div>
                </div>
                <span className="text-sm text-slate-500">
                  {teamMembers.filter(m => m.status === 'active').length} {t.team.activeMembersCount}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {teamMembersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <SprinterLoading size="xs" />
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p>{t.team.noMembers}</p>
                  <p className="text-sm mt-1">{t.team.noMembersDesc}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-xs text-slate-500 uppercase">
                        <th className="pb-3 font-medium">{t.team.member}</th>
                        <th className="pb-3 font-medium">{t.team.status}</th>
                        <th className="pb-3 font-medium">{t.team.roles}</th>
                        <th className="pb-3 font-medium">{t.team.joinDate}</th>
                        <th className="pb-3 font-medium text-right">{t.team.action}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {teamMembers.map((member: TeamMemberDto) => (
                        <tr
                          key={member.id}
                          className={`${member.status === 'inactive' ? 'bg-slate-50 opacity-75' : ''}`}
                        >
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-medium text-xs flex-shrink-0">
                                {getInitials(member.firstName, member.lastName)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {member.firstName} {member.lastName}
                                </p>
                                <p className="text-xs text-slate-500 truncate">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3">
                            {getMemberStatusBadge(member.status)}
                          </td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-1">
                              {member.roles.map((role) => (
                                <span
                                  key={role.id}
                                  className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded whitespace-nowrap"
                                >
                                  {role.description || role.name}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3">
                            <span className="text-xs text-slate-500 whitespace-nowrap">
                              {new Date(member.joinedAt).toLocaleDateString('tr-TR')}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            {String(member.id) === user?.id ? (
                              <span className="text-xs text-slate-400 italic">{t.team.you}</span>
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleOpenRoleDialog(member)}
                                  >
                                    <Shield className="h-4 w-4 mr-2" />
                                    {t.team.editRoles}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => toggleStatusMutation.mutate({
                                      userId: member.id,
                                      status: member.status === 'active' ? 'inactive' : 'active'
                                    })}
                                  >
                                    {member.status === 'active' ? (
                                      <>
                                        <UserX className="h-4 w-4 mr-2" />
                                        {t.team.makeInactive}
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        {t.team.makeActive}
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => setRemoveMemberId(member.id)}
                                  >
                                    <UserMinus className="h-4 w-4 mr-2" />
                                    {t.team.removeFromTeam}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bottom Grid: Invitations & Invite Form */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Sent Invitations */}
            <Card className="lg:order-2">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Send className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <CardTitle>{t.team.sentInvitations}</CardTitle>
                  <CardDescription>{t.team.sentInvitationsDesc}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {invitationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <SprinterLoading size="xs" />
                </div>
              ) : invitations.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Mail className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p>{t.team.noInvitations}</p>
                  <p className="text-sm mt-1">{t.team.noInvitationsDesc}</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-auto">
                  {invitations.map((invitation: InvitationDto) => {
                    // Map roleIds to role objects from availableRoles
                    const invitationRoles = invitation.roleIds
                      ? availableRoles.filter(r => invitation.roleIds?.includes(r.id))
                      : invitation.roles || [];

                    return (
                    <div
                      key={invitation.id}
                      className="p-4 border rounded-lg bg-slate-50/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {invitation.inviteeFirstName || invitation.firstName} {invitation.inviteeLastName || invitation.lastName}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{invitation.inviteeEmail || invitation.email}</p>
                          {invitationRoles.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {invitationRoles.map((role) => (
                                <span
                                  key={role.id}
                                  className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded"
                                >
                                  {role.description || role.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(invitation.status)}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span tabIndex={0}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 text-xs"
                                  onClick={() => cancelMutation.mutate(invitation.id)}
                                  disabled={invitation.status !== 'pending' || cancelMutation.isPending}
                                >
                                  {cancelMutation.isPending ? (
                                    <SprinterLoading size="xs" />
                                  ) : (
                                    t.team.cancelInvite
                                  )}
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {(invitation.status !== 'pending' || cancelMutation.isPending) && (
                              <TooltipContent>
                                {invitation.status !== 'pending' ? t.tooltips.invitationNotPending : t.tooltips.formSubmitting}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        {new Date(invitation.createdAt).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invite Form */}
          <Card className="lg:order-1">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UserPlus className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>{t.team.inviteUser}</CardTitle>
                  <CardDescription>{t.team.inviteDescription}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">
                      <User className="h-4 w-4 inline mr-1" />
                      {t.team.firstName} *
                    </Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, firstName: e.target.value }))
                      }
                      placeholder={t.team.firstName}
                      className={errors.firstName ? 'border-red-500' : ''}
                    />
                    {errors.firstName && (
                      <p className="text-xs text-red-500">{errors.firstName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t.team.lastName} *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, lastName: e.target.value }))
                      }
                      placeholder={t.team.lastName}
                      className={errors.lastName ? 'border-red-500' : ''}
                    />
                    {errors.lastName && (
                      <p className="text-xs text-red-500">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">
                    <Mail className="h-4 w-4 inline mr-1" />
                    {t.team.email} *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="ornek@email.com"
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    <Phone className="h-4 w-4 inline mr-1" />
                    {t.team.phone} *
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.phoneCountryCode.toString()}
                      onValueChange={(v) =>
                        setFormData((prev) => ({ ...prev, phoneCountryCode: parseInt(v) }))
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {countryCodes.map((country) => (
                          <SelectItem key={country.code} value={country.code.toString()}>
                            {country.flag} {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, phone: formatPhoneNumber(e.target.value) }))
                      }
                      placeholder="5XX XXX XX XX"
                      className={`flex-1 ${errors.phone ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                </div>

                {/* Roles */}
                <div className="space-y-2">
                  <Label>
                    <Shield className="h-4 w-4 inline mr-1" />
                    {t.team.roles} *
                  </Label>
                  {rolesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <SprinterLoading size="xs" />
                      <span className="ml-2 text-sm text-slate-500">{t.team.rolesLoading}</span>
                    </div>
                  ) : availableRoles.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center">
                      {t.team.noRoles}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {availableRoles.map((role) => (
                        <div
                          key={role.id}
                          onClick={() => toggleRole(role.id)}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            formData.roleIds.includes(role.id)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{role.description || role.name}</p>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                formData.roleIds.includes(role.id)
                                  ? 'border-blue-500 bg-blue-500'
                                  : 'border-slate-300'
                              }`}
                            >
                              {formData.roleIds.includes(role.id) && (
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {errors.roleIds && (
                    <p className="text-xs text-red-500">{errors.roleIds}</p>
                  )}
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message">{t.team.message}</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, message: e.target.value }))
                    }
                    placeholder={t.team.messagePlaceholder}
                    rows={3}
                  />
                </div>

                {/* Submit Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={inviteMutation.isPending}
                      >
                        {inviteMutation.isPending ? (
                          <>
                            <span className="animate-spin mr-2">&#9696;</span>
                            {t.team.sending}
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            {t.team.sendInvite}
                          </>
                        )}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {inviteMutation.isPending && (
                    <TooltipContent>{t.tooltips.formSubmitting}</TooltipContent>
                  )}
                </Tooltip>
              </form>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>

      {/* Role Management Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              {t.team.editRoles}
            </DialogTitle>
            <DialogDescription>
              {selectedMember && (
                <span>
                  <strong>{selectedMember.firstName} {selectedMember.lastName}</strong> {t.team.manageRolesFor}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {rolesLoading ? (
              <div className="flex items-center justify-center py-4">
                <SprinterLoading size="xs" />
                <span className="ml-2 text-sm text-slate-500">{t.team.rolesLoading}</span>
              </div>
            ) : availableRoles.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                {t.team.noRolesAvailable}
              </p>
            ) : (
              availableRoles.map((role) => {
                const hasRole = selectedMember?.roles.some((r) => r.id === role.id);
                const isLastRole = hasRole && selectedMember?.roles.length === 1;
                return (
                  <div
                    key={role.id}
                    onClick={() => !isLastRole && handleToggleRole(role.id)}
                    className={`p-3 border rounded-lg transition-colors ${
                      isLastRole
                        ? 'cursor-not-allowed opacity-50'
                        : 'cursor-pointer hover:border-slate-300'
                    } ${hasRole ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{role.description || role.name}</p>
                        {isLastRole && (
                          <p className="text-xs text-amber-600 mt-1">{t.team.lastRoleError}</p>
                        )}
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          hasRole ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                        }`}
                      >
                        {hasRole && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              {t.common.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!removeMemberId}
        onOpenChange={(open) => !open && setRemoveMemberId(null)}
        title={t.team.removeFromTeam}
        description={t.team.removeFromTeamConfirm}
        confirmLabel={t.common.delete}
        onConfirm={() => {
          if (removeMemberId) removeTeamMemberMutation.mutate(removeMemberId);
          setRemoveMemberId(null);
        }}
        variant="destructive"
      />
    </div>
  );
}
