import { Navbar } from '@/components/marketing/navbar';
import { Footer } from '@/components/marketing/footer';
import { MerchantApplyForm } from '@/components/merchant/merchant-apply-form';

export default function MerchantApplyPage() {
  return (
    <div className="min-h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="mx-auto max-w-2xl flex-1 px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">香港公司商家入駐申請</h1>
        <p className="mt-2 text-sm text-gray-500">
          適用於在香港註冊的公司。請準備商業登記證（BR）及公司註冊證明書（CI），提交後平台將於
          1–3 個工作天內完成審核。
        </p>
        <MerchantApplyForm />
      </main>
      <Footer />
    </div>
  );
}
