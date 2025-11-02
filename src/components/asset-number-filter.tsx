"use client";

import { useState, useEffect } from "react";

interface AssetNumberFilterProps {
  onFilterChange: (filters: {
    startNumber: number;
    endNumber: number;
    categories: string[];
  }) => void;
}

export default function AssetNumberFilter({
  onFilterChange,
}: AssetNumberFilterProps) {
  const [startNumber, setStartNumber] = useState("");
  const [endNumber, setEndNumber] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Kategori yang tersedia berdasarkan data
  const availableCategories = [
    { value: "I", label: "I - Elektronik/IT" },
    { value: "II", label: "II - Furniture" },
    { value: "III", label: "III - Laptop & Komputer" },
    { value: "IV", label: "IV - Kendaraan" },
    { value: "V", label: "V - Machine & Tooling" },
  ];

  useEffect(() => {
    const filters = {
      startNumber: startNumber ? parseInt(startNumber, 10) : 0,
      endNumber: endNumber ? parseInt(endNumber, 10) : 9999,
      categories: selectedCategories,
    };
    onFilterChange(filters);
  }, [startNumber, endNumber, selectedCategories, onFilterChange]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((c) => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  const handleReset = () => {
    setStartNumber("");
    setEndNumber("");
    setSelectedCategories([]);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Filter Nomor Asset
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label
            htmlFor="startNumber"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Nomor Asset Dari
          </label>
          <input
            type="number"
            id="startNumber"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Contoh: 1"
            value={startNumber}
            onChange={(e) => setStartNumber(e.target.value)}
            min="0"
          />
        </div>

        <div>
          <label
            htmlFor="endNumber"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Nomor Asset Sampai
          </label>
          <input
            type="number"
            id="endNumber"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Contoh: 100"
            value={endNumber}
            onChange={(e) => setEndNumber(e.target.value)}
            min="0"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Kategori
        </label>
        <div className="space-y-2">
          {availableCategories.map((category) => (
            <div key={category.value} className="flex items-center">
              <input
                type="checkbox"
                id={`category-${category.value}`}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={selectedCategories.includes(category.value)}
                onChange={() => handleCategoryChange(category.value)}
              />
              <label
                htmlFor={`category-${category.value}`}
                className="ml-2 block text-sm text-gray-700"
              >
                {category.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 mr-2"
          onClick={handleReset}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
