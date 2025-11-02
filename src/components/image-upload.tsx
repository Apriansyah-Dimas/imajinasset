"use client";

import React, { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Loader2, Crop } from "lucide-react";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  placeholder?: string;
  className?: string;
  maxSize?: number; // in KB
  acceptedTypes?: string[];
}

export default function ImageUpload({
  value,
  onChange,
  placeholder = "Upload image",
  className = "",
  maxSize = 200, // 200KB default
  acceptedTypes = ["image/jpeg", "image/jpg", "image/png"],
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process image to ensure 1:1 ratio and resize if needed
  const processImage = useCallback(
    (file: File): Promise<File> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Cannot get canvas context"));
          return;
        }

        img.onload = () => {
          // Set canvas to square (1:1 ratio)
          const size = Math.min(img.width, img.height);
          canvas.width = size;
          canvas.height = size;

          // Calculate crop position to center the image
          const x = (img.width - size) / 2;
          const y = (img.height - size) / 2;

          // Draw cropped image
          ctx.drawImage(img, x, y, size, size, 0, 0, size, size);

          // Convert to blob with quality adjustment to meet size limit
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Failed to process image"));
                return;
              }

              // Check if the processed image is still too large
              if (blob.size > maxSize * 1024) {
                // Try with lower quality
                canvas.toBlob(
                  (lowerQualityBlob) => {
                    if (
                      lowerQualityBlob &&
                      lowerQualityBlob.size <= maxSize * 1024
                    ) {
                      const processedFile = new File(
                        [lowerQualityBlob],
                        file.name,
                        {
                          type: lowerQualityBlob.type,
                        }
                      );
                      resolve(processedFile);
                    } else {
                      reject(
                        new Error(
                          `Processed image is still too large. Maximum size is ${maxSize}KB.`
                        )
                      );
                    }
                  },
                  file.type,
                  0.7
                );
              } else {
                const processedFile = new File([blob], file.name, {
                  type: blob.type,
                });
                resolve(processedFile);
              }
            },
            file.type,
            0.9
          );
        };

        img.onerror = () => {
          reject(new Error("Failed to load image"));
        };

        img.src = URL.createObjectURL(file);
      });
    },
    [maxSize]
  );

  const handleUpload = useCallback(
    async (file: File) => {
      // Validate file type
      if (!acceptedTypes.includes(file.type)) {
        alert("Invalid file type. Only JPEG and PNG are allowed.");
        return;
      }

      // Check if file needs processing (not 1:1 ratio or too large)
      const img = new Image();
      const needsProcessing = await new Promise<boolean>((resolve) => {
        img.onload = () => {
          const isSquare = img.width === img.height;
          const isTooLarge = file.size > maxSize * 1024;
          resolve(!isSquare || isTooLarge);
        };
        img.src = URL.createObjectURL(file);
      });

      let processedFile = file;

      if (needsProcessing) {
        setIsProcessing(true);
        try {
          processedFile = await processImage(file);
        } catch (error) {
          alert((error as Error).message);
          setIsProcessing(false);
          return;
        } finally {
          setIsProcessing(false);
        }
      }

      setIsUploading(true);
      setUploadProgress(0);

      try {
        const formData = new FormData();
        formData.append("file", processedFile);

        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });

        return new Promise<void>((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status === 200) {
              try {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                  onChange(response.url);
                  resolve();
                } else {
                  alert(response.error || "Upload failed");
                  reject(new Error(response.error || "Upload failed"));
                }
              } catch (error) {
                alert("Upload failed: Invalid response");
                reject(error);
              }
            } else {
              alert("Upload failed: Server error");
              reject(new Error(`Server error: ${xhr.status}`));
            }
          };

          xhr.onerror = () => {
            alert("Upload failed: Network error");
            reject(new Error("Network error"));
          };

          xhr.open("POST", "/api/upload");
          xhr.send(formData);
        });
      } catch (error) {
        console.error("Upload error:", error);
        alert("Upload failed: " + (error as Error).message);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [onChange, acceptedTypes, maxSize, processImage]
  );

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleRemove = () => {
    onChange("");
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(",")}
        onChange={handleFileInput}
        className="hidden"
      />

      {value ? (
        <div className="relative group">
          <div className="relative overflow-hidden rounded-lg border border-gray-200 w-48 h-48 mx-auto">
            <img
              src={value}
              alt="Uploaded image"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                onClick={handleRemove}
                className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="text-center text-xs text-gray-500 mt-1">
            1:1 ratio • Max {maxSize}KB
          </div>
        </div>
      ) : (
        <div
          onClick={openFileDialog}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${
              dragActive
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100"
            }
          `}
        >
          {isProcessing || isUploading ? (
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <div className="text-sm text-gray-600">
                {isProcessing
                  ? "Processing image..."
                  : `Uploading... ${uploadProgress}%`}
              </div>
              {isUploading && (
                <div className="w-full max-w-xs bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
              {isProcessing && (
                <div className="text-xs text-gray-500 flex items-center">
                  <Crop className="w-3 h-3 mr-1" />
                  Cropping to 1:1 ratio
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <ImageIcon className="w-8 h-8 text-gray-400" />
              <div className="text-sm text-gray-600">{placeholder}</div>
              <div className="text-xs text-gray-500">
                Click to browse or drag and drop
              </div>
              <div className="text-xs text-gray-500">
                Max size: {maxSize}KB • JPEG, PNG • 1:1 ratio
              </div>
              <div className="text-xs text-gray-400 flex items-center">
                <Crop className="w-3 h-3 mr-1" />
                Images will be auto-cropped to square
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
