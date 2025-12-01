'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center">
          <ShieldX className="h-16 w-16 text-red-500" />
        </div>

        <h1 className="mt-6 text-3xl font-bold text-gray-900">
          Access Denied
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          You don't have permission to access this page.
        </p>

        <p className="mt-2 text-xs text-gray-500">
          Please contact your administrator if you think this is a mistake.
        </p>

        <div className="mt-8 space-y-4">
          <Link
            href="/dashboard/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>

          <div>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </button>
          </div>
        </div>

        <div className="mt-8 text-xs text-gray-400">
          <p>If you need elevated access, please contact your system administrator.</p>
        </div>
      </div>
    </div>
  );
}
