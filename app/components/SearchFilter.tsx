"use client";
import { useState, useEffect } from "react";

// ประเภทของ Filter Field
interface FilterField {
  key: string;
  label: string;
  type: "text" | "select" | "dateRange" | "date";
  placeholder?: string;
  options?: { value: string; label: string }[];
  gridSpan?: 1 | 2 | 3 | 4;
}

// ประเภทของ Filter Values
interface FilterValues {
  [key: string]: string | { startDate: string; endDate: string };
}

interface SearchFilterProps {
  fields: FilterField[];
  initialValues: FilterValues;
  onFilterChange: (filters: FilterValues) => void;
  resultCount?: number;
  className?: string;
  title?: string;
  compact?: boolean; // โหมดแบบกะทัดรัด
}

export default function SearchFilter({
  fields,
  initialValues,
  onFilterChange,
  resultCount,
  className = "",
  title = "ค้นหาและกรอง",
  compact = false,
}: SearchFilterProps) {
  const [filters, setFilters] = useState<FilterValues>(initialValues);
  const [isExpanded, setIsExpanded] = useState(false);

  // ส่งค่าไปยัง parent component เมื่อ filter เปลี่ยน
  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  // Handle input changes
  const handleInputChange = (
    key: string,
    value: string | { startDate: string; endDate: string }
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Reset filters
  const resetFilters = () => {
    const resetValues: FilterValues = {};
    fields.forEach((field) => {
      if (field.type === "dateRange") {
        resetValues[field.key] = { startDate: "", endDate: "" };
      } else {
        resetValues[field.key] = "";
      }
    });
    setFilters(resetValues);
  };

  // Check if any filter has value
  const hasActiveFilters = () => {
    return Object.values(filters).some((value) => {
      if (typeof value === "string") {
        return value.trim() !== "";
      }
      if (typeof value === "object" && value !== null) {
        return value.startDate !== "" || value.endDate !== "";
      }
      return false;
    });
  };

  // ปรับปรุงการจัด grid layout ให้เหมาะสมกับ desktop
  const getGridCols = () => {
    // เน้น desktop layout ก่อน แล้วค่อย responsive ลง
    return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";
  };

  // สร้าง CSS class สำหรับ input ที่สวยงามและขนาดเหมาะสม
  const inputClassName =
    "w-full h-9 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-gray-300";

  const renderField = (field: FilterField) => {
    const value = filters[field.key];

    switch (field.type) {
      case "text":
        return (
          <input
            type="text"
            placeholder={field.placeholder}
            value={(value as string) || ""}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            className={inputClassName}
          />
        );

      case "select":
        return (
          <select
            value={(value as string) || ""}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            className={`${inputClassName} cursor-pointer`}
          >
            <option value="">ทั้งหมด</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case "date":
        return (
          <input
            type="date"
            value={(value as string) || ""}
            onChange={(e) => handleInputChange(field.key, e.target.value)}
            className={inputClassName}
          />
        );

      case "dateRange":
        const dateValue = (value as { startDate: string; endDate: string }) || {
          startDate: "",
          endDate: "",
        };
        return (
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              placeholder="วันที่เริ่มต้น"
              value={dateValue.startDate}
              onChange={(e) =>
                handleInputChange(field.key, {
                  ...dateValue,
                  startDate: e.target.value,
                })
              }
              className="w-full h-9 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-gray-300"
            />
            <input
              type="date"
              placeholder="วันที่สิ้นสุด"
              value={dateValue.endDate}
              onChange={(e) =>
                handleInputChange(field.key, {
                  ...dateValue,
                  endDate: e.target.value,
                })
              }
              className="w-full h-9 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 hover:border-gray-300"
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (compact) {
    return (
      <div
        className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 ${className}`}
      >
        <div className="flex flex-col sm:flex-row lg:flex-row gap-3 items-end">
          {/* แสดง field แรกเป็นหลัก */}
          {fields.length > 0 && (
            <div className="flex-1 min-w-0 max-w-xs lg:max-w-sm">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                {fields[0].label}
              </label>
              {renderField(fields[0])}
            </div>
          )}

          {/* ปุ่มเพิ่มเติม */}
          <div className="flex gap-2 flex-shrink-0">
            {fields.length > 1 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="px-3 py-2 text-sm text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg hover:border-blue-200 transition-all duration-200 whitespace-nowrap font-medium"
              >
                {isExpanded ? "ซ่อน" : `+${fields.length - 1} ตัวกรอง`}
              </button>
            )}

            {hasActiveFilters() && (
              <button
                onClick={resetFilters}
                className="px-3 py-2 text-sm text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg hover:border-red-300 transition-all duration-200 whitespace-nowrap font-medium"
              >
                ล้าง
              </button>
            )}
          </div>
        </div>

        {/* แสดง fields เพิ่มเติมเมื่อขยาย */}
        {isExpanded && fields.length > 1 && (
          <div className={`grid gap-4 mt-4 ${getGridCols()}`}>
            {fields.slice(1).map((field) => (
              <div key={field.key} className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-700">
                  {field.label}
                </label>
                {renderField(field)}
              </div>
            ))}
          </div>
        )}

        {/* แสดงจำนวนผลลัพธ์ */}
        {resultCount !== undefined && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                ผลลัพธ์:{" "}
                <span className="font-medium text-gray-700">{resultCount}</span>{" "}
                รายการ
              </span>
              {hasActiveFilters() && (
                <span className="flex items-center gap-1.5 text-blue-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  กำลังกรอง
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 lg:p-5 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-sm lg:text-base font-semibold text-gray-900 flex items-center gap-2">
          <svg
            className="w-4 h-4 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {title}
          {hasActiveFilters() && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-blue-600 font-medium">
                กำลังกรอง
              </span>
            </div>
          )}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 text-xs lg:text-sm text-gray-600 hover:text-blue-600 bg-white hover:bg-blue-50 border border-gray-200 rounded-lg hover:border-blue-200 transition-all duration-200 font-medium"
          >
            {isExpanded ? "ซ่อน" : "แสดงตัวกรอง"}
          </button>
          {hasActiveFilters() && (
            <button
              onClick={resetFilters}
              className="px-3 py-1.5 text-xs lg:text-sm text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg hover:border-red-300 transition-all duration-200 font-medium"
            >
              ล้างทั้งหมด
            </button>
          )}
        </div>
      </div>

      {/* Filter Fields */}
      {isExpanded && (
        <div className="p-4 lg:p-5 bg-white">
          <div className={`grid gap-4 lg:gap-5 ${getGridCols()}`}>
            {fields.map((field) => (
              <div
                key={field.key}
                className={`space-y-2 ${
                  field.gridSpan === 2
                    ? "sm:col-span-2"
                    : field.gridSpan === 3
                    ? "sm:col-span-2 lg:col-span-3"
                    : field.gridSpan === 4
                    ? "sm:col-span-2 lg:col-span-3 xl:col-span-4"
                    : ""
                }`}
              >
                <label className="block text-sm font-medium text-gray-700">
                  {field.label}
                </label>
                {renderField(field)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer with Results */}
      {resultCount !== undefined && (
        <div className="px-4 lg:px-5 py-3 bg-gradient-to-r from-gray-50 to-blue-50/30 border-t border-gray-100">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              ผลลัพธ์ที่พบ:{" "}
              <strong className="text-gray-900">{resultCount}</strong> รายการ
            </span>
            {hasActiveFilters() && (
              <span className="flex items-center gap-1.5 text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full font-medium">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                กำลังกรองข้อมูล
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
