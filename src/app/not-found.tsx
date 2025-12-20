import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">404</CardTitle>
          <CardDescription className="text-lg">
            Halaman yang Anda cari tidak ditemukan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-gray-600">
            Maaf, halaman yang Anda cari tidak ada atau telah dipindahkan.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild className="flex-1">
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Beranda
              </Link>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link href="/assets">
                <Search className="w-4 h-4 mr-2" />
                Cari Aset
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}