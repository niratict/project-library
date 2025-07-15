import React, { useState, useRef, useEffect } from "react";

const CustomDropdown = ({
  options = [],
  value = "",
  onChange,
  placeholder = "เลือก...",
  disabled = false,
  required = false,
  className = "",
  optionKey = "value",
  optionLabel = "label",
  searchable = false,
  maxHeight = "200px",
  zIndex = 1000,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = options.filter((option) => {
    if (!searchable || !searchTerm) return true;
    const label = typeof option === "object" ? option[optionLabel] : option;
    return label.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Get selected option display text
  const getSelectedText = () => {
    if (!value) return placeholder;
    const selectedOption = options.find((option) => {
      const optionValue =
        typeof option === "object" ? option[optionKey] : option;
      return optionValue === value;
    });
    if (selectedOption) {
      return typeof selectedOption === "object"
        ? selectedOption[optionLabel]
        : selectedOption;
    }
    return placeholder;
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const handleOptionClick = (option) => {
    const optionValue = typeof option === "object" ? option[optionKey] : option;
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div
      ref={dropdownRef}
      className={`relative ${className}`}
      style={{ zIndex: isOpen ? zIndex : "auto" }}
    >
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`
          w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md 
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${
            disabled
              ? "bg-gray-100 cursor-not-allowed"
              : "hover:border-gray-400 cursor-pointer"
          }
          ${isOpen ? "ring-2 ring-blue-500 border-blue-500" : ""}
        `}
      >
        <div className="flex items-center justify-between">
          <span
            className={`block truncate ${
              !value ? "text-gray-500" : "text-gray-900"
            }`}
          >
            {getSelectedText()}
          </span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50">
          {/* Search Input */}
          {searchable && (
            <div className="p-2 border-b border-gray-200">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="ค้นหา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto" style={{ maxHeight }}>
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-gray-500 text-center">
                {searchable && searchTerm
                  ? "ไม่พบรายการที่ค้นหา"
                  : "ไม่มีรายการ"}
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const optionValue =
                  typeof option === "object" ? option[optionKey] : option;
                const optionText =
                  typeof option === "object" ? option[optionLabel] : option;
                const isSelected = optionValue === value;

                return (
                  <div
                    key={`${optionValue}-${index}`}
                    onClick={() => handleOptionClick(option)}
                    className={`
                      px-3 py-2 cursor-pointer transition-colors duration-150
                      ${
                        isSelected
                          ? "bg-blue-50 text-blue-700"
                          : "hover:bg-gray-100"
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className="block truncate">{optionText}</span>
                      {isSelected && (
                        <svg
                          className="w-4 h-4 text-blue-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
