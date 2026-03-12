'use client';

import { Mail, AlertCircle, Clock, ChevronDown, ChevronUp, LifeBuoy, Building2, User, Phone, FileText } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function RestaurantSupportPage() {
  const { t } = useLanguage();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const supportEmail = 'destek@tourops.com';

  const faqs = [
    { q: t.support.faq1Q, a: t.support.faq1A },
    { q: t.support.faq2Q, a: t.support.faq2A },
    { q: t.support.faq3Q, a: t.support.faq3A },
  ];

  const requiredInfo = [
    { icon: Building2, text: t.support.companyName },
    { icon: User, text: t.support.contactPerson },
    { icon: Phone, text: t.support.contactPhone },
    { icon: FileText, text: t.support.issueDetail },
  ];

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <Header title={t.support.title} description={t.support.description} />

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Contact Card */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">{t.support.contactUs}</CardTitle>
                <CardDescription className="mt-1">{t.support.contactDesc}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-white border border-blue-100 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{t.support.emailLabel}</p>
                <a
                  href={`mailto:${supportEmail}`}
                  className="text-lg font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {supportEmail}
                </a>
              </div>
              <a
                href={`mailto:${supportEmail}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                {t.support.contactUs}
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Important Note */}
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-xl">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-xl text-amber-800">{t.support.importantNote}</CardTitle>
                <CardDescription className="mt-1 text-amber-700">{t.support.importantNoteDesc}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {requiredInfo.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white border border-amber-100 rounded-lg">
                  <item.icon className="h-5 w-5 text-amber-600 shrink-0" />
                  <span className="text-sm text-gray-700">{item.text}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Response Time */}
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-xl text-green-800">{t.support.responseTime}</CardTitle>
                <CardDescription className="mt-1 text-green-700">{t.support.responseTimeDesc}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <LifeBuoy className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle className="text-xl">{t.support.faqTitle}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={i} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-sm text-gray-800">{faq.q}</span>
                    {openFaq === i ? (
                      <ChevronUp className="h-4 w-4 text-gray-500 shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500 shrink-0 ml-2" />
                    )}
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-4 text-sm text-gray-600 border-t bg-gray-50 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
