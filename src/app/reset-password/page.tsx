import { Suspense } from 'react';
import { ResetPasswordForm } from './ResetPasswordForm';

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#F9F7F1] flex items-center justify-center">
                <div className="animate-pulse text-[#1A3C34] font-serif tracking-widest">Loading...</div>
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    );
}
