'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, Check, Code2, Globe, Shield, Key, Send, BookOpen, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import { apiClient } from '@/lib/api';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState, ErrorState } from '@/components/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Kopyalandı!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopy}>
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-slate-400" />}
    </Button>
  );
}

function CodeBlock({ children, copyText }: { children: string; copyText?: string }) {
  return (
    <div className="relative group">
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={copyText || children} />
      </div>
      <pre className="bg-slate-950 text-slate-100 rounded-lg p-4 overflow-x-auto text-sm leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export default function ExternalApiPage() {
  const [showUuid, setShowUuid] = useState(false);

  const {
    data: agency,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['my-agency'],
    queryFn: () => apiClient.getMyAgency(),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="External API" description="Dış kaynak entegrasyon API'si" />
        <div className="flex-1 p-6">
          <LoadingState message="Acente bilgileri yükleniyor..." />
        </div>
      </div>
    );
  }

  if (error || !agency) {
    return (
      <div className="flex flex-col h-full">
        <Header title="External API" description="Dış kaynak entegrasyon API'si" />
        <div className="flex-1 p-6">
          <ErrorState message="Acente bilgileri yüklenemedi" onRetry={refetch} />
        </div>
      </div>
    );
  }

  const agencyData = (agency as { data?: typeof agency })?.data ?? agency;
  const uuid = agencyData.uuid;
  const endpointUrl = `${API_BASE_URL}/agencies/${uuid}/external-register`;

  const curlExample = `curl -X POST '${endpointUrl}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "firstName": "Ahmet",
    "lastName": "Yılmaz",
    "email": "ahmet@example.com"
  }'`;

  const jsExample = `const response = await fetch('${endpointUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    firstName: 'Ahmet',
    lastName: 'Yılmaz',
    email: 'ahmet@example.com',
  }),
});

const result = await response.json();
console.log(result);`;

  const htmlFormExample = `<form id="registerForm">
  <input type="text" name="firstName" placeholder="Ad" required />
  <input type="text" name="lastName" placeholder="Soyad" required />
  <input type="email" name="email" placeholder="E-posta" required />
  <button type="submit">Kayıt Ol</button>
</form>

<script>
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);

  const response = await fetch('${endpointUrl}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      email: formData.get('email'),
    }),
  });

  if (response.ok) {
    alert('Kayıt başarılı!');
  } else {
    const error = await response.json();
    alert('Hata: ' + error.message);
  }
});
</script>`;

  return (
    <div className="flex flex-col h-full">
      <Header title="External API" description="Dış kaynak entegrasyon API'si" />

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* UUID Card */}
          <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Key className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-medium text-blue-900">Acente UUID&apos;niz</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                      onClick={() => setShowUuid(!showUuid)}
                    >
                      {showUuid ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                      {showUuid ? 'Gizle' : 'Göster'}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-lg font-mono font-semibold text-blue-700 bg-white/70 px-3 py-1.5 rounded-lg border border-blue-200 break-all select-none">
                      {showUuid ? uuid : '\u2022'.repeat(8) + '-' + '\u2022'.repeat(4) + '-' + '\u2022'.repeat(4) + '-' + '\u2022'.repeat(4) + '-' + '\u2022'.repeat(12)}
                    </code>
                    <CopyButton text={uuid} />
                  </div>
                  <p className="text-sm text-blue-600 mt-2">
                    Bu UUID, acentenize ait benzersiz kimlik numarasıdır. API isteklerinde bu değeri kullanın.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <BookOpen className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <CardTitle>External Müşteri Kayıt API&apos;si</CardTitle>
                  <CardDescription>
                    Kendi web sitenizden veya uygulamanızdan müşteri kaydı oluşturun
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Bu API, kendi web sitenize veya uygulamanıza entegre edebileceğiniz bir müşteri kayıt servisidir.
                Müşterileriniz sizin platformunuz üzerinden kayıt olduğunda, otomatik olarak sistemimize kaydedilir.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <Shield className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-sm text-green-700">Auth gerektirmez</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <Globe className="h-4 w-4 text-purple-600 shrink-0" />
                  <span className="text-sm text-purple-700">CORS destekli</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <Code2 className="h-4 w-4 text-orange-600 shrink-0" />
                  <span className="text-sm text-orange-700">REST JSON API</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Endpoint Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Send className="h-5 w-5 text-slate-600" />
                </div>
                <CardTitle>Endpoint Bilgileri</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Method & URL */}
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">URL</label>
                <div className="mt-1 flex items-center gap-2 bg-slate-50 border rounded-lg p-3">
                  <Badge className="bg-green-600 shrink-0">POST</Badge>
                  <code className="text-sm font-mono text-slate-700 break-all flex-1">{endpointUrl}</code>
                  <CopyButton text={endpointUrl} />
                </div>
              </div>

              {/* Request Body */}
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Request Body</label>
                <div className="mt-1 border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        <th className="text-left px-4 py-2 font-medium text-slate-600">Alan</th>
                        <th className="text-left px-4 py-2 font-medium text-slate-600">Tip</th>
                        <th className="text-left px-4 py-2 font-medium text-slate-600">Zorunlu</th>
                        <th className="text-left px-4 py-2 font-medium text-slate-600">Açıklama</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="px-4 py-2.5"><code className="text-sm bg-slate-100 px-1.5 py-0.5 rounded">firstName</code></td>
                        <td className="px-4 py-2.5 text-slate-600">string</td>
                        <td className="px-4 py-2.5"><Badge variant="destructive" className="text-xs">Evet</Badge></td>
                        <td className="px-4 py-2.5 text-slate-600">Müşteri adı</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-2.5"><code className="text-sm bg-slate-100 px-1.5 py-0.5 rounded">lastName</code></td>
                        <td className="px-4 py-2.5 text-slate-600">string</td>
                        <td className="px-4 py-2.5"><Badge variant="destructive" className="text-xs">Evet</Badge></td>
                        <td className="px-4 py-2.5 text-slate-600">Müşteri soyadı</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5"><code className="text-sm bg-slate-100 px-1.5 py-0.5 rounded">email</code></td>
                        <td className="px-4 py-2.5 text-slate-600">string</td>
                        <td className="px-4 py-2.5"><Badge variant="destructive" className="text-xs">Evet</Badge></td>
                        <td className="px-4 py-2.5 text-slate-600">Müşteri e-posta adresi</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Query Params */}
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Query Parametreleri (Opsiyonel)</label>
                <div className="mt-1 border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b">
                        <th className="text-left px-4 py-2 font-medium text-slate-600">Parametre</th>
                        <th className="text-left px-4 py-2 font-medium text-slate-600">Değerler</th>
                        <th className="text-left px-4 py-2 font-medium text-slate-600">Açıklama</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-4 py-2.5"><code className="text-sm bg-slate-100 px-1.5 py-0.5 rounded">lang</code></td>
                        <td className="px-4 py-2.5 text-slate-600"><code>tr</code> | <code>en</code></td>
                        <td className="px-4 py-2.5 text-slate-600">Hata mesajları için dil (varsayılan: tr)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Responses */}
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Yanıtlar</label>
                <div className="mt-1 space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <Badge className="bg-green-600 shrink-0">201</Badge>
                    <span className="text-sm text-green-700">Müşteri başarıyla kaydedildi</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <Badge className="bg-yellow-600 shrink-0">400</Badge>
                    <span className="text-sm text-yellow-700">Doğrulama hatası veya acente aktif değil</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <Badge className="bg-red-600 shrink-0">404</Badge>
                    <span className="text-sm text-red-700">Acente bulunamadı</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Code Examples */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Code2 className="h-5 w-5 text-slate-600" />
                </div>
                <CardTitle>Kullanım Örnekleri</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* cURL */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">cURL</Badge>
                  <span className="text-sm text-slate-500">Terminal / Backend</span>
                </div>
                <CodeBlock copyText={curlExample}>{curlExample}</CodeBlock>
              </div>

              {/* JavaScript */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">JavaScript</Badge>
                  <span className="text-sm text-slate-500">Frontend / Node.js</span>
                </div>
                <CodeBlock copyText={jsExample}>{jsExample}</CodeBlock>
              </div>

              {/* HTML Form */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">HTML</Badge>
                  <span className="text-sm text-slate-500">Web Sitesi Form Entegrasyonu</span>
                </div>
                <CodeBlock copyText={htmlFormExample}>{htmlFormExample}</CodeBlock>
              </div>
            </CardContent>
          </Card>

          {/* Important Notes */}
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="font-medium text-amber-900">Dikkat Edilmesi Gerekenler</h3>
                  <ul className="text-sm text-amber-800 space-y-1.5 list-disc list-inside">
                    <li>UUID&apos;nizi gizli tutun; yalnızca kendi web sitenizde kullanın.</li>
                    <li>Acenteniz <strong>aktif</strong> durumda değilse API 400 hatası döndürür.</li>
                    <li>Aynı e-posta ile tekrar kayıt denendiğinde mevcut müşteri döndürülür.</li>
                    <li>Tüm alanlar (<code>firstName</code>, <code>lastName</code>, <code>email</code>) zorunludur.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
