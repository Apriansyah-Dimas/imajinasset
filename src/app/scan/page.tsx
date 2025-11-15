// Scan page has been temporarily removed
// Coming soon: Enhanced scanning functionality

"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Rocket, Clock, Camera, QrCode, Wrench, ArrowLeft } from "lucide-react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";

function ScanPageContent() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl min-h-screen">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Link href="/">
          <Button variant="outline" size="sm" className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Asset Scanner</h1>
          <p className="text-sm text-muted-foreground">
            QR Code and Barcode Scanning
          </p>
        </div>
      </div>

      {/* Coming Soon Card */}
      <Card className="mb-8">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <Rocket className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Coming Soon
          </CardTitle>
          <CardDescription className="text-lg">
            Enhanced Asset Scanning Feature
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="border-blue-200 bg-blue-50">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              We're currently working on a completely redesigned scanning
              experience with improved performance, better UI, and enhanced
              features.
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-dashed border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <QrCode className="h-5 w-5 text-blue-600" />
                  New Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    Enhanced QR code recognition
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    Real-time scanning feedback
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    Offline scanning capability
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    Batch scanning mode
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    Improved mobile experience
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-dashed border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wrench className="h-5 w-5 text-purple-600" />
                  Technical Improvements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    Faster processing speed
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    Better error handling
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    Enhanced security
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    Improved accessibility
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    Cross-platform compatibility
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              The scanning feature is temporarily unavailable while we implement
              these exciting improvements. Thank you for your patience!
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/so-asset">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  View Stock Opname Sessions
                </Button>
              </Link>

              <Link href="/assets">
                <Button variant="outline">Browse Assets</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-orange-500" />
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-gray-50 rounded-lg">
              <Camera className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <h3 className="font-semibold text-gray-600">Camera Scanner</h3>
              <p className="text-sm text-gray-500">Under Development</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <QrCode className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <h3 className="font-semibold text-gray-600">QR Code Reader</h3>
              <p className="text-sm text-gray-500">Under Development</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <Wrench className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <h3 className="font-semibold text-gray-600">Manual Entry</h3>
              <p className="text-sm text-gray-500">Under Development</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ScanPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN", "SO_ASSET_USER"]}>
      <ScanPageContent />
    </ProtectedRoute>
  );
}
